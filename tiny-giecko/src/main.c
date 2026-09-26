#include "des.h"
#include "sha1.h"
#include "b64.h"
#include "net.h"
#include "ws.h"
#include "rfb.h"
#include "display.h"
#include "qr.h"
#include "tui.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int gg_hex64(const char *s, unsigned long long *out)
{
    unsigned long long v = 0;
    int i;
    if (!s)
        return -1;
    for (i = 0; s[i]; i++) {
        int d;
        char c = s[i];
        if (c >= '0' && c <= '9')
            d = c - '0';
        else if (c >= 'a' && c <= 'f')
            d = c - 'a' + 10;
        else if (c >= 'A' && c <= 'F')
            d = c - 'A' + 10;
        else
            return -1;
        v = (v << 4) | (unsigned long long)d;
    }
    if (i != 16)
        return -1;
    *out = v;
    return 0;
}

static void gg_hex_str(unsigned long long v, char out[17])
{
    int i;
    for (i = 0; i < 16; i++)
        out[i] = "0123456789abcdef"[(v >> (60 - 4 * i)) & 0xF];
    out[16] = 0;
}

static int gg_qr_selftest(void);

static int gg_selftest(void)
{
    int fails = 0;
    unsigned long long key, plain, cipher, sub[16], got;
    unsigned char k8[8], digest[20];
    char b64out[32];
    char hex[17];
    unsigned char block[8], out8[8];
    char pw[] = "test-gie";
    int i;

    gg_hex64("133457799bbcdff1", &key);
    gg_hex64("0123456789abcdef", &plain);
    gg_des_keysched(key, sub);
    cipher = gg_des_block(plain, sub);
    gg_hex64("85e813540f0ab405", &got);
    if (cipher != got) {
        gg_hex_str(cipher, hex);
        printf("FAIL des vector 1: got %s want 85e813540f0ab405\n", hex);
        fails++;
    } else {
        printf("PASS des vector 1\n");
    }

    gg_hex64("0123456789abcdef", &key);
    gg_hex64("4e6f772069732074", &plain);
    gg_des_keysched(key, sub);
    cipher = gg_des_block(plain, sub);
    gg_hex64("3fa40e8a984d4815", &got);
    if (cipher != got) {
        gg_hex_str(cipher, hex);
        printf("FAIL des vector 2: got %s want 3fa40e8a984d4815\n", hex);
        fails++;
    } else {
        printf("PASS des vector 2\n");
    }

    gg_vnc_key(pw, k8);
    {
        unsigned long long kv = 0;
        for (i = 0; i < 8; i++)
            kv = (kv << 8) | k8[i];
        gg_hex64("2ea6ce2eb4e696a6", &got);
        if (kv != got) {
            gg_hex_str(kv, hex);
            printf("FAIL vnc key: got %s want 2ea6ce2eb4e696a6\n", hex);
            fails++;
        } else {
            printf("PASS vnc key\n");
        }
    }

    for (i = 0; i < 8; i++)
        block[i] = (unsigned char)((plain >> (56 - 8 * i)) & 0xFF);
    gg_des_ecb_encrypt(block, out8, 8, key);
    {
        unsigned long long ev = 0;
        int j;
        for (j = 0; j < 8; j++)
            ev = (ev << 8) | out8[j];
        gg_hex64("3fa40e8a984d4815", &got);
        if (ev != got) {
            gg_hex_str(ev, hex);
            printf("FAIL des ecb: got %s want 3fa40e8a984d4815\n", hex);
            fails++;
        } else {
            printf("PASS des ecb\n");
        }
    }

    gg_sha1((const unsigned char *)"abc", 3, digest);
    {
        char want[] = "a9993e364706816aba3e25717850c26c9cd0d89d";
        char got_hex[41];
        int j;
        for (j = 0; j < 20; j++)
            sprintf(got_hex + j * 2, "%02x", digest[j]);
        got_hex[40] = 0;
        if (strcmp(got_hex, want) != 0) {
            printf("FAIL sha1: got %s\n", got_hex);
            fails++;
        } else {
            printf("PASS sha1\n");
        }
    }

    gg_b64_encode((const unsigned char *)"Giecko", 6, b64out);
    if (strcmp((char *)b64out, "R2llY2tv") != 0) {
        printf("FAIL b64: got %s\n", (char *)b64out);
        fails++;
    } else {
        printf("PASS b64\n");
    }

    fails += gg_qr_selftest();
    printf("%s\n", fails ? "SELFTEST FAILED" : "SELFTEST PASSED");
    return fails ? 1 : 0;
}


static const char *GG_QR_VEC1 =
    "111111100100001111111100000101001101000001101110101010101011101101110101010101011101101110100011101011101100000100010101000001111111101010101111111000000001101100000000100000101000111001110010110000000101010000001100110001010011110000001001100000011111000111111100001001001000000001001111001100111111100100101101110100000100011110101100101110100000100010010101110100010100010100101110100100001010011100000100100000111100111111101001010110010";

static int gg_qr_selftest(void)
{
    unsigned char m[GG_QR_MAX_SIZE * GG_QR_MAX_SIZE];
    int size = 0;
    int rc;
    int i;
    rc = gg_qr_generate("Giecko", 6, m, &size, 1, 5);
    if (rc != 5 || size != 21) {
        printf("FAIL qr generate: rc=%d size=%d\n", rc, size);
        return 1;
    }
    for (i = 0; i < 21 * 21; i++) {
        int want = GG_QR_VEC1[i] == '1';
        if (m[i] != (unsigned char)want) {
            printf("FAIL qr vector at %d\n", i);
            return 1;
        }
    }
    if (gg_qr_generate("x", 1, m, &size, 10, 5) >= 0) {
        static const int caps[10] = {14, 26, 42, 62, 84, 106, 122, 152, 180, 213};
        char big[256];
        int v;
        for (v = 1; v <= 10; v++) {
            int i;
            for (i = 0; i < caps[v - 1]; i++)
                big[i] = (char)('a' + (i % 26));
            if (gg_qr_generate(big, caps[v - 1], m, &size, v, 0) < 0 || size != 17 + v * 4) {
                printf("FAIL qr capacity v%d exact\n", v);
                return 1;
            }
            if (gg_qr_generate(big, caps[v - 1] + 1, m, &size, v, 0) >= 0) {
                printf("FAIL qr capacity v%d overflow\n", v);
                return 1;
            }
        }
    } else {
        printf("FAIL qr capacity probe\n");
        return 1;
    }
    printf("PASS qr capacity v1-v10\n");
    return 0;
}

static void gg_usage(void)
{
    fprintf(stderr,
            "tiny-giecko: native client for giecko sessions\n"
            "usage: tiny-giecko <url> [--password PW] [--seconds N] [--tui]\n"
            "       tiny-giecko --qr TEXT\n"
            "       tiny-giecko --selftest\n"
            "url: vnc://host[:port] | ws://host[:port]/path | wss://host[:port]/path\n"
            "--tui opens the interactive terminal view with keyboard and mouse input\n"
            "example: tiny-giecko wss://abc.trycloudflare.com/websockify --password 1234 --tui\n");
}

int main(int argc, char **argv)
{
    const char *url = NULL;
    const char *password = "";
    int seconds = 5;
    int tui = 0;
    const char *qrtext = NULL;
    int i;
    char scheme[8];
    const char *rest;
    char host[256];
    char port[8];
    char path[256];
    size_t hl;
    int use_tls = 0;
    int rc;
    gg_ws w;
    gg_conn conn;
    gg_rfb rfb;
    unsigned long long updates = 0;
    unsigned long long pixels = 0;

    for (i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--selftest") == 0)
            return gg_selftest();
        if (strcmp(argv[i], "--qr") == 0 && i + 1 < argc) {
            qrtext = argv[++i];
            continue;
        }
        if (strcmp(argv[i], "--tui") == 0) {
            tui = 1;
            continue;
        }
        if (strcmp(argv[i], "--help") == 0 || strcmp(argv[i], "-h") == 0) {
            gg_usage();
            return 0;
        }
        if (strcmp(argv[i], "--password") == 0 && i + 1 < argc) {
            password = argv[++i];
            continue;
        }
        if (strcmp(argv[i], "--seconds") == 0 && i + 1 < argc) {
            seconds = atoi(argv[++i]);
            continue;
        }
        if (argv[i][0] == '-' && argv[i][1]) {
            gg_usage();
            return 3;
        }
        url = argv[i];
    }
    if (qrtext) {
        unsigned char m[GG_QR_MAX_SIZE * GG_QR_MAX_SIZE];
        int size = 0;
        char out[16384];
        if (gg_qr_generate(qrtext, -1, m, &size, 0, -1) < 0) {
            fprintf(stderr, "qr: text too long\n");
            return 3;
        }
        gg_qr_render(m, size, 2, out, sizeof(out));
        fputs(out, stdout);
        return 0;
    }
    if (!url) {
        gg_usage();
        return 3;
    }
    rest = strstr(url, "://");
    if (!rest || (size_t)(rest - url) >= sizeof(scheme)) {
        gg_usage();
        return 3;
    }
    hl = (size_t)(rest - url);
    memcpy(scheme, url, hl);
    scheme[hl] = 0;
    rest += 3;
    if (strcmp(scheme, "vnc") == 0) {
        snprintf(port, sizeof(port), "5900");
    } else if (strcmp(scheme, "ws") == 0) {
        snprintf(port, sizeof(port), "80");
    } else if (strcmp(scheme, "wss") == 0) {
        snprintf(port, sizeof(port), "443");
        use_tls = 1;
    } else {
        gg_usage();
        return 3;
    }
    {
        const char *p = rest;
        const char *slash = strchr(rest, '/');
        const char *colon = strchr(rest, ':');
        size_t n;
        const char *hostend = slash ? slash : (rest + strlen(rest));
        if (colon && colon < hostend)
            hostend = colon;
        n = (size_t)(hostend - rest);
        if (n == 0 || n >= sizeof(host)) {
            gg_usage();
            return 3;
        }
        memcpy(host, rest, n);
        host[n] = 0;
        p = hostend;
        if (*p == ':') {
            const char *q = strchr(p, '/');
            size_t pl = q ? (size_t)(q - p - 1) : strlen(p + 1);
            if (pl == 0 || pl >= sizeof(port)) {
                gg_usage();
                return 3;
            }
            memcpy(port, p + 1, pl);
            port[pl] = 0;
            p += pl + 1;
        }
        if (strcmp(scheme, "vnc") != 0) {
            if (*p == '/')
                snprintf(path, sizeof(path), "%s", p);
            else
                snprintf(path, sizeof(path), "/");
        } else {
            path[0] = 0;
        }
    }
    if (seconds <= 0)
        seconds = 1;
    if (gg_net_init() != 0) {
        fprintf(stderr, "network init failed\n");
        return 2;
    }
    memset(&rfb, 0, sizeof(rfb));
    if (strcmp(scheme, "vnc") == 0) {
        memset(&conn, 0, sizeof(conn));
        conn.fd = gg_tcp_connect(host, port, 20);
        if (conn.fd < 0) {
            fprintf(stderr, "connect %s:%s failed\n", host, port);
            return 2;
        }
        rfb.conn = &conn;
        rfb.ws = NULL;
    } else {
        rc = gg_ws_connect(&w, host, port, path, use_tls, 20);
        if (rc != 0) {
            fprintf(stderr, "websocket: %s\n", w.err[0] ? w.err : "connect failed");
            return 2;
        }
        rfb.ws = &w;
    }
    rc = gg_rfb_connect_auth(&rfb, password);
    if (rc != 0) {
        fprintf(stderr, "rfb: %s\n", rfb.err[0] ? rfb.err : "handshake failed");
        if (rfb.ws)
            gg_ws_close(&w);
        else
            gg_conn_close(&conn);
        return rc == 1 ? 1 : 2;
    }
    printf("connected: %s %ux%u \"%s\" auth=%s\n", rfb.version, rfb.width, rfb.height, rfb.name, rfb.auth_type == 2 ? "vnc" : "none");
    {
        unsigned char qm[GG_QR_MAX_SIZE * GG_QR_MAX_SIZE];
        int qsize = 0;
        char qout[16384];
        printf("============================================================\n");
        printf("   GIECKO SESSION CONNECTED\n");
        printf("============================================================\n");
        printf("   url:      %s\n", url);
        printf("   size:     %ux%u  auth: %s\n", rfb.width, rfb.height, rfb.auth_type == 2 ? "vnc password" : "open");
        if (tui)
            printf("   view:     live in this terminal, Ctrl-Q quits\n");
        else
            printf("   view:     headless check for %d seconds\n", seconds);
        printf("============================================================\n");
        if (gg_qr_generate(url, -1, qm, &qsize, 0, -1) >= 0) {
            printf("   scan to open on a phone:\n");
            gg_qr_render(qm, qsize, 2, qout, sizeof(qout));
            fputs(qout, stdout);
        }
        printf("============================================================\n");
        fflush(stdout);
    }
    if (gg_display_init(rfb.width, rfb.height, rfb.bpp) != 0) {
        fprintf(stderr, "display init failed for %ux%u\n", rfb.width, rfb.height);
        return 2;
    }
    if (tui) {
        rc = gg_rfb_run_tui(&rfb, &updates, &pixels);
    } else {
        rc = gg_rfb_run(&rfb, seconds, &updates, &pixels);
    }
    gg_display_fini();
    if (rc != 0) {
        fprintf(stderr, "session: %s\n", rfb.err[0] ? rfb.err : "failed");
        if (rfb.ws)
            gg_ws_close(&w);
        else
            gg_conn_close(&conn);
        return 2;
    }
    printf("session ok: %llu updates, %llu pixels seen\n", updates, pixels);
    if (rfb.ws)
        gg_ws_close(&w);
    else
        gg_conn_close(&conn);
    gg_net_fini();
    return 0;
}
