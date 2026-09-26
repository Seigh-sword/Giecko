#include "rfb.h"
#include "des.h"
#include "display.h"
#include "tui.h"
#include "keysym.h"

#ifdef _WIN32
#include <winsock2.h>
#else
#include <sys/select.h>
#include <unistd.h>
#endif
#include <errno.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

static int gg_rfb_read(gg_rfb *r, void *buf, size_t n)
{
    if (r->ws)
        return gg_ws_read_exact(r->ws, buf, n);
    return gg_conn_read(r->conn, buf, n);
}

static int gg_rfb_write(gg_rfb *r, const void *buf, size_t n)
{
    if (r->ws)
        return gg_ws_send_binary(r->ws, buf, n);
    return gg_conn_write(r->conn, buf, n);
}

static void gg_rfb_set_err(gg_rfb *r, const char *msg)
{
    size_t i;
    for (i = 0; i < sizeof(r->err) - 1 && msg[i]; i++)
        r->err[i] = msg[i];
    r->err[i] = 0;
}

static int gg_be32(const unsigned char *p)
{
    return ((int)p[0] << 24) | ((int)p[1] << 16) | ((int)p[2] << 8) | (int)p[3];
}

static unsigned gg_be16(const unsigned char *p)
{
    return ((unsigned)p[0] << 8) | p[1];
}

static unsigned long long gg_load64(const unsigned char *k)
{
    int i;
    unsigned long long v = 0;
    for (i = 0; i < 8; i++)
        v = (v << 8) | k[i];
    return v;
}

int gg_rfb_connect_auth(gg_rfb *r, const char *password)
{
    unsigned char buf[256];
    unsigned char types[32];
    int ntypes = 0;
    int chosen = 0;
    int i;
    int minor;
    if (gg_rfb_read(r, buf, 12) != 0) {
        gg_rfb_set_err(r, "no RFB version from server");
        return -1;
    }
    memcpy(r->version, buf, 12);
    r->version[12] = 0;
    if (strncmp((const char *)buf, "RFB ", 4) != 0) {
        gg_rfb_set_err(r, "not an RFB server");
        return -1;
    }
    minor = ((int)buf[8] - '0') * 100 + ((int)buf[9] - '0') * 10 + ((int)buf[10] - '0');
    if (gg_rfb_write(r, buf, 12) != 0) {
        gg_rfb_set_err(r, "version write failed");
        return -1;
    }
    if (minor < 7) {
        unsigned char t4[4];
        if (gg_rfb_read(r, t4, 4) != 0) {
            gg_rfb_set_err(r, "security read failed");
            return -1;
        }
        types[0] = (unsigned char)gg_be32(t4);
        ntypes = 1;
    } else {
        unsigned char cnt[1];
        if (gg_rfb_read(r, cnt, 1) != 0) {
            gg_rfb_set_err(r, "security types read failed");
            return -1;
        }
        ntypes = cnt[0];
        if (ntypes == 0) {
            unsigned char reason_len[4];
            int rl;
            if (gg_rfb_read(r, reason_len, 4) == 0) {
                rl = gg_be32(reason_len);
                if (rl > 0 && rl < 200 && gg_rfb_read(r, buf, (size_t)rl) == 0) {
                    buf[rl] = 0;
                    gg_rfb_set_err(r, (const char *)buf);
                    return -1;
                }
            }
            gg_rfb_set_err(r, "server sent no security types");
            return -1;
        }
        if (ntypes > 32)
            ntypes = 32;
        if (gg_rfb_read(r, types, (size_t)ntypes) != 0) {
            gg_rfb_set_err(r, "security types read failed");
            return -1;
        }
    }
    for (i = 0; i < ntypes; i++) {
        if (types[i] == 2)
            break;
    }
    if (i < ntypes) {
        unsigned char sel = 2;
        unsigned char challenge[16];
        unsigned char response[16];
        unsigned char key[8];
        unsigned char res[4];
        chosen = 2;
        if (gg_rfb_write(r, &sel, 1) != 0) {
            gg_rfb_set_err(r, "security choice write failed");
            return -1;
        }
        if (gg_rfb_read(r, challenge, 16) != 0) {
            gg_rfb_set_err(r, "challenge read failed");
            return -1;
        }
        gg_vnc_key(password ? password : "", key);
        gg_des_ecb_encrypt(challenge, response, 16, gg_load64(key));
        if (gg_rfb_write(r, response, 16) != 0) {
            gg_rfb_set_err(r, "response write failed");
            return -1;
        }
        if (gg_rfb_read(r, res, 4) != 0) {
            gg_rfb_set_err(r, "security result read failed");
            return -1;
        }
        if (gg_be32(res) != 0) {
            if (minor >= 8) {
                int rl = gg_be32(res);
                if (rl > 0 && rl < 190 && gg_rfb_read(r, buf, (size_t)rl) == 0) {
                    buf[rl] = 0;
                    gg_rfb_set_err(r, (const char *)buf);
                    return 1;
                }
            }
            gg_rfb_set_err(r, "authentication failed");
            return 1;
        }
    } else {
        for (i = 0; i < ntypes; i++) {
            if (types[i] == 1)
                break;
        }
        if (i < ntypes) {
            unsigned char sel = 1;
            chosen = 1;
            if (gg_rfb_write(r, &sel, 1) != 0) {
                gg_rfb_set_err(r, "security choice write failed");
                return -1;
            }
            if (minor >= 8) {
                unsigned char res[4];
                if (gg_rfb_read(r, res, 4) != 0) {
                    gg_rfb_set_err(r, "security result read failed");
                    return -1;
                }
                if (gg_be32(res) != 0) {
                    gg_rfb_set_err(r, "authentication failed");
                    return 1;
                }
            }
        } else {
            char offered[96];
            int o = 0;
            for (i = 0; i < ntypes && o < 80; i++)
                o += snprintf(offered + o, sizeof(offered) - (size_t)o, "%s%d", i ? "," : "", types[i]);
            gg_rfb_set_err(r, offered[0] ? offered : "no usable security type");
            return -1;
        }
    }
    r->auth_type = chosen;
    {
        unsigned char si[24];
        unsigned int namelen;
        if (gg_rfb_read(r, si, 24) != 0) {
            gg_rfb_set_err(r, "server init read failed");
            return -1;
        }
        r->width = gg_be16(si);
        r->height = gg_be16(si + 2);
        r->bpp = si[4];
        r->depth = si[6];
        namelen = (unsigned)gg_be32(si + 20);
        if (namelen > 200)
            namelen = 200;
        if (namelen && gg_rfb_read(r, r->name, namelen) != 0) {
            gg_rfb_set_err(r, "server name read failed");
            return -1;
        }
        r->name[namelen] = 0;
    }
    return 0;
}

int gg_rfb_fd(gg_rfb *r)
{
    return r->ws ? r->ws->c.fd : r->conn->fd;
}

int gg_rfb_key_event(gg_rfb *r, unsigned int keysym, int down)
{
    unsigned char msg[8];
    msg[0] = 4;
    msg[1] = (unsigned char)(down ? 1 : 0);
    msg[2] = 0;
    msg[3] = 0;
    msg[4] = (unsigned char)(keysym >> 24);
    msg[5] = (unsigned char)(keysym >> 16);
    msg[6] = (unsigned char)(keysym >> 8);
    msg[7] = (unsigned char)keysym;
    return gg_rfb_write(r, msg, 8);
}

int gg_rfb_pointer_event(gg_rfb *r, unsigned buttons, unsigned x, unsigned y)
{
    unsigned char msg[6];
    msg[0] = 5;
    msg[1] = (unsigned char)(buttons & 0xFF);
    msg[2] = (unsigned char)(x >> 8);
    msg[3] = (unsigned char)(x & 0xFF);
    msg[4] = (unsigned char)(y >> 8);
    msg[5] = (unsigned char)(y & 0xFF);
    return gg_rfb_write(r, msg, 6);
}

int gg_rfb_request_update(gg_rfb *r, int incremental)
{
    unsigned char req[10];
    req[0] = 3;
    req[1] = (unsigned char)(incremental ? 1 : 0);
    req[2] = 0;
    req[3] = 0;
    req[4] = 0;
    req[5] = 0;
    req[6] = (unsigned char)(r->width >> 8);
    req[7] = (unsigned char)(r->width & 0xFF);
    req[8] = (unsigned char)(r->height >> 8);
    req[9] = (unsigned char)(r->height & 0xFF);
    return gg_rfb_write(r, req, 10);
}

static int gg_rfb_set_encodings_raw(gg_rfb *r)
{
    unsigned char enc_req[] = {2, 0, 0, 1, 0, 0, 0, 0};
    return gg_rfb_write(r, enc_req, sizeof(enc_req));
}

static int gg_rfb_wait(gg_rfb *r, int ms)
{
    fd_set rfds;
    struct timeval tv;
    int fd = gg_rfb_fd(r);
    FD_ZERO(&rfds);
#ifdef _WIN32
    FD_SET((SOCKET)fd, &rfds);
#else
    FD_SET(fd, &rfds);
#endif
    tv.tv_sec = ms / 1000;
    tv.tv_usec = (ms % 1000) * 1000;
    return select(fd + 1, &rfds, NULL, NULL, &tv);
}

int gg_rfb_run(gg_rfb *r, int seconds, unsigned long long *updates, unsigned long long *pixels)
{
    unsigned char msg[16];
    time_t deadline = time(NULL) + seconds;
    unsigned long long ups = 0;
    unsigned long long px = 0;
    unsigned char incr[] = {3, 1, 0, 0, 0, 0, 0, (unsigned char)(r->width >> 8), (unsigned char)(r->width & 0xFF), (unsigned char)(r->height >> 8), (unsigned char)(r->height & 0xFF)};
    unsigned long long bypp = (r->bpp + 7) / 8;
    if (gg_rfb_set_encodings_raw(r) != 0) {
        gg_rfb_set_err(r, "set encodings failed");
        return -1;
    }
    if (gg_rfb_request_update(r, 0) != 0) {
        gg_rfb_set_err(r, "framebuffer request failed");
        return -1;
    }
    for (;;) {
        unsigned char type;
        int ms_left;
        if (time(NULL) >= deadline)
            break;
        ms_left = (int)(deadline - time(NULL)) * 1000;
        if (ms_left > 250)
            ms_left = 250;
        if (gg_rfb_wait(r, ms_left) != 1) {
            if (time(NULL) >= deadline)
                break;
            continue;
        }
        if (gg_rfb_read(r, &type, 1) != 0) {
            gg_rfb_set_err(r, "server message read failed");
            return -1;
        }
        if (type == 0) {
            unsigned char hdr[3];
            unsigned nrects;
            unsigned i;
            if (gg_rfb_read(r, hdr, 3) != 0) {
                gg_rfb_set_err(r, "update header read failed");
                return -1;
            }
            nrects = gg_be16(hdr + 1);
            for (i = 0; i < nrects; i++) {
                unsigned char rhdr[12];
                unsigned rx, ry, rw, rhgt;
                int enc;
                if (gg_rfb_read(r, rhdr, 12) != 0) {
                    gg_rfb_set_err(r, "rect header read failed");
                    return -1;
                }
                rx = gg_be16(rhdr);
                ry = gg_be16(rhdr + 2);
                rw = gg_be16(rhdr + 4);
                rhgt = gg_be16(rhdr + 6);
                enc = gg_be32(rhdr + 8);
                if (enc == 0) {
                    unsigned long long nbytes = (unsigned long long)rw * rhgt * bypp;
                    if (nbytes) {
                        unsigned char *data = (unsigned char *)malloc((size_t)nbytes);
                        unsigned long long got = 0;
                        if (!data) {
                            gg_rfb_set_err(r, "out of memory for rect");
                            return -1;
                        }
                        while (got < nbytes) {
                            size_t k = (nbytes - got > 65536) ? 65536 : (size_t)(nbytes - got);
                            if (gg_rfb_read(r, data + got, k) != 0) {
                                free(data);
                                gg_rfb_set_err(r, "rect data read failed");
                                return -1;
                            }
                            got += k;
                        }
                        gg_display_rect(rx, ry, rw, rhgt, data, r->bpp);
                        px += (unsigned long long)rw * rhgt;
                        free(data);
                    } else {
                        unsigned char skip[4096];
                        unsigned long long left = nbytes;
                        while (left > 0) {
                            size_t k = left > sizeof(skip) ? sizeof(skip) : (size_t)left;
                            if (gg_rfb_read(r, skip, k) != 0) {
                                gg_rfb_set_err(r, "rect data read failed");
                                return -1;
                            }
                            left -= k;
                        }
                        px += (unsigned long long)rw * rhgt;
                    }
                } else {
                    unsigned long long nbytes = (unsigned long long)rw * rhgt * bypp;
                    unsigned char skip[4096];
                    unsigned long long left = nbytes;
                    while (left > 0) {
                        size_t k = left > sizeof(skip) ? sizeof(skip) : (size_t)left;
                        if (gg_rfb_read(r, skip, k) != 0) {
                            gg_rfb_set_err(r, "rect data read failed");
                            return -1;
                        }
                        left -= k;
                    }
                }
            }
            ups++;
            if (gg_rfb_write(r, incr, sizeof(incr)) != 0) {
                gg_rfb_set_err(r, "incremental request failed");
                return -1;
            }
        } else if (type == 1) {
            if (gg_rfb_read(r, msg, 3) != 0) {
                gg_rfb_set_err(r, "colour map read failed");
                return -1;
            }
        } else if (type == 2) {
        } else if (type == 3) {
            unsigned char ct[7];
            int tl;
            if (gg_rfb_read(r, ct, 7) != 0) {
                gg_rfb_set_err(r, "cut text read failed");
                return -1;
            }
            tl = gg_be32(ct + 3);
            if (tl < 0)
                tl = 0;
            while (tl > 0) {
                unsigned char skip[256];
                size_t k = tl > 256 ? 256 : (size_t)tl;
                if (gg_rfb_read(r, skip, k) != 0)
                    return -1;
                tl -= (int)k;
            }
        } else {
            gg_rfb_set_err(r, "unknown server message");
            return -1;
        }
    }
    *updates = ups;
    *pixels = px;
    return 0;
}


int gg_rfb_run_tui(gg_rfb *r, unsigned long long *updates, unsigned long long *pixels)
{
    unsigned char msg[16];
    unsigned long long ups = 0;
    unsigned long long px = 0;
    unsigned long long bypp = (r->bpp + 7) / 8;
    int fd = gg_rfb_fd(r);
    int cols, rows;
    unsigned canvas_w, canvas_h;
    time_t last_status = 0;
    int pending = 0;
    if (gg_tui_init() != 0) {
        gg_rfb_set_err(r, "terminal is not interactive");
        return -1;
    }
    if (gg_rfb_set_encodings_raw(r) != 0) {
        gg_rfb_set_err(r, "set encodings failed");
        gg_tui_fini();
        return -1;
    }
    if (gg_rfb_request_update(r, 0) != 0) {
        gg_rfb_set_err(r, "framebuffer request failed");
        gg_tui_fini();
        return -1;
    }
    for (;;) {
        fd_set rfds;
        struct timeval tv;
        int rv;
        int ev;
        FD_ZERO(&rfds);
#ifdef _WIN32
        FD_SET((SOCKET)fd, &rfds);
#else
        FD_SET(fd, &rfds);
        FD_SET(0, &rfds);
#endif
        tv.tv_sec = 0;
        tv.tv_usec = 100000;
        rv = select(fd + 1, &rfds, NULL, NULL, &tv);
        if (rv < 0) {
#ifdef _WIN32
            if (WSAGetLastError() == WSAEINTR)
                continue;
#else
            if (errno == EINTR)
                continue;
#endif
            gg_rfb_set_err(r, "select failed");
            break;
        }
#ifndef _WIN32
        if (FD_ISSET(0, &rfds)) {
            ev = 0;
            while (gg_tui_poll(&ev)) {
                if (ev == 1) {
                    unsigned int sym = gg_tui_keysym();
                    if (gg_input_quit(sym)) {
                        *updates = ups;
                        *pixels = px;
                        gg_tui_fini();
                        return 0;
                    }
                    if (gg_rfb_key_event(r, sym, 1) != 0 || gg_rfb_key_event(r, sym, 0) != 0) {
                        gg_rfb_set_err(r, "key event failed");
                        gg_tui_fini();
                        return -1;
                    }
                } else if (ev == 2) {
                    unsigned int bx = 0, by = 0, btn = gg_tui_buttons();
                    int wheel = gg_tui_pointer_wheel();
                    gg_tui_size(&cols, &rows);
                    canvas_w = (unsigned)cols;
                    canvas_h = (unsigned)(rows - 1) * 2;
                    bx = (unsigned)((unsigned long long)gg_tui_pointer_x() * r->width / (canvas_w ? canvas_w : 1));
                    by = (unsigned)((unsigned long long)gg_tui_pointer_y() * r->height / (canvas_h ? canvas_h : 1));
                    if (bx >= r->width)
                        bx = r->width ? r->width - 1 : 0;
                    if (by >= r->height)
                        by = r->height ? r->height - 1 : 0;
                    if (wheel > 0 || wheel < 0) {
                        unsigned int wb = wheel > 0 ? 8u : 16u;
                        if (gg_rfb_pointer_event(r, btn | wb, bx, by) != 0 ||
                            gg_rfb_pointer_event(r, btn, bx, by) != 0) {
                            gg_rfb_set_err(r, "pointer event failed");
                            gg_tui_fini();
                            return -1;
                        }
                    } else {
                        if (gg_rfb_pointer_event(r, btn, bx, by) != 0) {
                            gg_rfb_set_err(r, "pointer event failed");
                            gg_tui_fini();
                            return -1;
                        }
                    }
                }
            }
        }
#else
        {
            ev = 0;
            while (gg_tui_poll(&ev)) {
                if (ev == 1) {
                    unsigned int sym = gg_tui_keysym();
                    if (gg_input_quit(sym)) {
                        *updates = ups;
                        *pixels = px;
                        gg_tui_fini();
                        return 0;
                    }
                    if (gg_rfb_key_event(r, sym, 1) != 0 || gg_rfb_key_event(r, sym, 0) != 0) {
                        gg_rfb_set_err(r, "key event failed");
                        gg_tui_fini();
                        return -1;
                    }
                }
            }
        }
#endif
        if (rv > 0 && !pending) {
        }
        if (rv > 0
#ifdef _WIN32
            && FD_ISSET((SOCKET)fd, &rfds)
#else
            && FD_ISSET(fd, &rfds)
#endif
        ) {
            unsigned char type;
            if (gg_rfb_read(r, &type, 1) != 0) {
                gg_rfb_set_err(r, "server message read failed");
                break;
            }
            if (type == 0) {
                unsigned char hdr[3];
                unsigned nrects;
                unsigned i;
                if (gg_rfb_read(r, hdr, 3) != 0) {
                    gg_rfb_set_err(r, "update header read failed");
                    break;
                }
                nrects = gg_be16(hdr + 1);
                for (i = 0; i < nrects; i++) {
                    unsigned char rhdr[12];
                    unsigned rx, ry, rw, rhgt;
                    int enc;
                    if (gg_rfb_read(r, rhdr, 12) != 0) {
                        gg_rfb_set_err(r, "rect header read failed");
                        break;
                    }
                    rx = gg_be16(rhdr);
                    ry = gg_be16(rhdr + 2);
                    rw = gg_be16(rhdr + 4);
                    rhgt = gg_be16(rhdr + 6);
                    enc = gg_be32(rhdr + 8);
                    if (enc == 0) {
                        unsigned long long nbytes = (unsigned long long)rw * rhgt * bypp;
                        if (nbytes) {
                            unsigned char *data = (unsigned char *)malloc((size_t)nbytes);
                            unsigned long long got = 0;
                            if (!data) {
                                gg_rfb_set_err(r, "out of memory for rect");
                                break;
                            }
                            while (got < nbytes) {
                                size_t k = (nbytes - got > 65536) ? 65536 : (size_t)(nbytes - got);
                                if (gg_rfb_read(r, data + got, k) != 0) {
                                    free(data);
                                    gg_rfb_set_err(r, "rect data read failed");
                                    break;
                                }
                                got += k;
                            }
                            if (got == nbytes)
                                gg_display_rect(rx, ry, rw, rhgt, data, r->bpp);
                            px += (unsigned long long)rw * rhgt;
                            free(data);
                        }
                    } else {
                        unsigned long long nbytes = (unsigned long long)rw * rhgt * bypp;
                        unsigned char skip[4096];
                        unsigned long long left = nbytes;
                        while (left > 0) {
                            size_t k = left > sizeof(skip) ? sizeof(skip) : (size_t)left;
                            if (gg_rfb_read(r, skip, k) != 0) {
                                gg_rfb_set_err(r, "rect data read failed");
                                break;
                            }
                            left -= k;
                        }
                    }
                }
                ups++;
                if (gg_rfb_request_update(r, 1) != 0) {
                    gg_rfb_set_err(r, "incremental request failed");
                    break;
                }
                {
                    const unsigned char *fb = gg_display_fb();
                    char st[256];
                    snprintf(st, sizeof(st), " GIECKO %ux%u  %llu updates  Ctrl-Q quits", r->width, r->height, ups);
                    gg_tui_draw(fb, gg_display_w(), gg_display_h(), gg_display_bpp());
                    gg_tui_status(st);
                }
            } else if (type == 1) {
                if (gg_rfb_read(r, msg, 3) != 0) {
                    gg_rfb_set_err(r, "colour map read failed");
                    break;
                }
            } else if (type == 2) {
            } else if (type == 3) {
                unsigned char ct[7];
                int tl;
                if (gg_rfb_read(r, ct, 7) != 0) {
                    gg_rfb_set_err(r, "cut text read failed");
                    break;
                }
                tl = gg_be32(ct + 3);
                if (tl < 0)
                    tl = 0;
                while (tl > 0) {
                    unsigned char skip[256];
                    size_t k = tl > 256 ? 256 : (size_t)tl;
                    if (gg_rfb_read(r, skip, k) != 0)
                        break;
                    tl -= (int)k;
                }
            } else {
                gg_rfb_set_err(r, "unknown server message");
                break;
            }
        }
        if (time(NULL) != last_status) {
            last_status = time(NULL);
        }
        (void)pending;
        (void)cols;
        (void)rows;
        (void)canvas_w;
        (void)canvas_h;
    }
    *updates = ups;
    *pixels = px;
    gg_tui_fini();
    return r->err[0] ? -1 : 0;
}
