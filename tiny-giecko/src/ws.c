#include "ws.h"
#include "tls.h"
#include "sha1.h"
#include "b64.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

static int gg_ws_read_full(gg_ws *w, void *buf, size_t n)
{
    return gg_conn_read(&w->c, buf, n);
}

static void gg_ws_set_err(gg_ws *w, const char *msg)
{
    size_t i;
    for (i = 0; i < sizeof(w->err) - 1 && msg[i]; i++)
        w->err[i] = msg[i];
    w->err[i] = 0;
}

int gg_ws_connect(gg_ws *w, const char *host, const char *port, const char *path, int use_tls, int timeout_secs)
{
    unsigned char nonce[16];
    char nonce_b64[32];
    char key_hdr[80];
    char req[1024];
    char resp[2048];
    size_t resp_len = 0;
    int i;
    memset(w, 0, sizeof(*w));
    w->c.fd = -1;
    w->c.tls = NULL;
    srand((unsigned)time(NULL) ^ (unsigned)(size_t)w);
    for (i = 0; i < 16; i++)
        nonce[i] = (unsigned char)(rand() & 0xFF);
    gg_b64_encode(nonce, sizeof(nonce), nonce_b64);
    w->c.fd = gg_tcp_connect(host, port, timeout_secs);
    if (w->c.fd < 0) {
        gg_ws_set_err(w, "tcp connect failed");
        return -1;
    }
    if (use_tls && gg_tls_attach(&w->c, host) != 0) {
        gg_ws_set_err(w, w->c.err[0] ? w->c.err : "tls handshake failed");
        gg_conn_close(&w->c);
        return -1;
    }
    if (snprintf(key_hdr, sizeof(key_hdr), "Sec-WebSocket-Key: %s", nonce_b64) < 0)
        return -1;
    if (snprintf(req, sizeof(req),
                 "GET %s HTTP/1.1\r\n"
                 "Host: %s:%s\r\n"
                 "Upgrade: websocket\r\n"
                 "Connection: Upgrade\r\n"
                 "%s\r\n"
                 "Sec-WebSocket-Version: 13\r\n\r\n",
                 path, host, port, key_hdr) < 0)
        return -1;
    if (gg_conn_write(&w->c, req, strlen(req)) != 0) {
        gg_ws_set_err(w, "send handshake failed");
        gg_conn_close(&w->c);
        return -1;
    }
    while (resp_len < sizeof(resp) - 1) {
        char *end;
        unsigned char b;
        if (gg_ws_read_full(w, &b, 1) != 0) {
            gg_ws_set_err(w, "read handshake failed");
            gg_conn_close(&w->c);
            return -1;
        }
        resp[resp_len++] = (char)b;
        resp[resp_len] = 0;
        end = strstr(resp, "\r\n\r\n");
        if (end)
            break;
    }
    if (strncmp(resp, "HTTP/1.1 101", 12) != 0 && strncmp(resp, "HTTP/1.0 101", 12) != 0) {
        char status[64];
        size_t k;
        for (k = 0; k < sizeof(status) - 1 && resp[k] && resp[k] != '\r' && resp[k] != '\n'; k++)
            status[k] = resp[k];
        status[k] = 0;
        gg_ws_set_err(w, status[0] ? status : "bad handshake");
        gg_conn_close(&w->c);
        return -1;
    }
    {
        char expect[64];
        char accept_input[128];
        unsigned char digest[20];
        char *got;
        snprintf(accept_input, sizeof(accept_input), "%s258EAFA5-E914-47DA-95CA-C5AB0DC85B11", nonce_b64);
        gg_sha1((const unsigned char *)accept_input, strlen(accept_input), digest);
        gg_b64_encode(digest, 20, expect);
        got = strstr(resp, "Sec-WebSocket-Accept:");
        if (got) {
            char val[64];
            size_t k = 0;
            got += 21;
            while (*got == ' ')
                got++;
            while (got[k] && got[k] != '\r' && k < sizeof(val) - 1) {
                val[k] = got[k];
                k++;
            }
            val[k] = 0;
            if (strcmp(val, expect) != 0) {
                gg_ws_set_err(w, "websocket accept mismatch");
                gg_conn_close(&w->c);
                return -1;
            }
        } else {
            gg_ws_set_err(w, "no websocket accept header");
            gg_conn_close(&w->c);
            return -1;
        }
    }
    return 0;
}

static int gg_ws_frame_begin(gg_ws *w)
{
    unsigned char hdr[2];
    unsigned char ext[8];
    unsigned long long len;
    int opcode;
    for (;;) {
        if (gg_ws_read_full(w, hdr, 2) != 0) {
            gg_ws_set_err(w, "frame header read failed");
            return -1;
        }
        opcode = hdr[0] & 0x0F;
        len = hdr[1] & 0x7F;
        if (len == 126) {
            if (gg_ws_read_full(w, ext, 2) != 0)
                return -1;
            len = ((unsigned long long)ext[0] << 8) | ext[1];
        } else if (len == 127) {
            int i;
            if (gg_ws_read_full(w, ext, 8) != 0)
                return -1;
            len = 0;
            for (i = 0; i < 8; i++)
                len = (len << 8) | ext[i];
        }
        if (hdr[1] & 0x80) {
            if (gg_ws_read_full(w, w->mask, 4) != 0)
                return -1;
            w->masked = 1;
            w->mpos = 0;
        } else {
            w->masked = 0;
        }
        if (opcode == 8) {
            gg_ws_set_err(w, "server closed the websocket");
            return -1;
        }
        if (opcode == 9) {
            unsigned char ping[125];
            size_t pl = (size_t)len;
            if (pl > sizeof(ping))
                pl = sizeof(ping);
            if (len && gg_ws_read_full(w, ping, pl) != 0)
                return -1;
            {
                unsigned char pong[131];
                size_t i;
                pong[0] = 0x8A;
                pong[1] = (unsigned char)(0x80 | pl);
                for (i = 0; i < 4; i++)
                    pong[2 + i] = 0;
                for (i = 0; i < pl; i++)
                    pong[6 + i] = ping[i] ^ 0;
                gg_conn_write(&w->c, pong, 6 + pl);
            }
            continue;
        }
        if (opcode == 10)
            continue;
        w->remaining = len;
        return 0;
    }
}

int gg_ws_read_exact(gg_ws *w, void *buf, size_t n)
{
    unsigned char *p = (unsigned char *)buf;
    size_t done = 0;
    while (done < n) {
        size_t k;
        if (w->remaining == 0) {
            if (gg_ws_frame_begin(w) != 0)
                return -1;
            if (w->remaining == 0)
                continue;
        }
        k = n - done;
        if ((unsigned long long)k > w->remaining)
            k = (size_t)w->remaining;
        if (gg_ws_read_full(w, p + done, k) != 0) {
            gg_ws_set_err(w, "payload read failed");
            return -1;
        }
        if (w->masked) {
            size_t i;
            for (i = 0; i < k; i++)
                p[done + i] ^= w->mask[(w->mpos + i) & 3];
            w->mpos = (unsigned)((w->mpos + k) & 3);
        }
        w->remaining -= k;
        done += k;
    }
    return 0;
}

int gg_ws_send_binary(gg_ws *w, const void *buf, size_t n)
{
    unsigned char hdr[14];
    size_t hl = 0;
    unsigned char mask[4];
    unsigned char *out;
    size_t i;
    hdr[hl++] = 0x82;
    if (n < 126) {
        hdr[hl++] = (unsigned char)(0x80 | n);
    } else if (n < 65536) {
        hdr[hl++] = (unsigned char)(0x80 | 126);
        hdr[hl++] = (unsigned char)(n >> 8);
        hdr[hl++] = (unsigned char)(n & 0xFF);
    } else {
        int j;
        hdr[hl++] = (unsigned char)(0x80 | 127);
        for (j = 7; j >= 0; j--)
            hdr[hl++] = (unsigned char)(((unsigned long long)n >> (8 * j)) & 0xFF);
    }
    for (i = 0; i < 4; i++) {
        mask[i] = (unsigned char)(rand() & 0xFF);
        hdr[hl++] = mask[i];
    }
    out = (unsigned char *)malloc(hl + n);
    if (!out)
        return -1;
    memcpy(out, hdr, hl);
    for (i = 0; i < n; i++)
        out[hl + i] = ((const unsigned char *)buf)[i] ^ mask[i & 3];
    {
        int rc = gg_conn_write(&w->c, out, hl + n);
        free(out);
        return rc;
    }
}

void gg_ws_close(gg_ws *w)
{
    if (w->c.fd >= 0) {
        unsigned char closemsg[2];
        closemsg[0] = 0x88;
        closemsg[1] = 0x80;
        gg_conn_write(&w->c, closemsg, 2);
    }
    gg_conn_close(&w->c);
}
