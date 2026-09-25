#ifndef GG_WS_H
#define GG_WS_H

#include <stddef.h>
#include "net.h"

typedef struct gg_ws {
    gg_conn c;
    unsigned long long remaining;
    unsigned char mask[4];
    unsigned mpos;
    int masked;
    char err[192];
} gg_ws;

int gg_ws_connect(gg_ws *w, const char *host, const char *port, const char *path, int use_tls, int timeout_secs);
int gg_ws_read_exact(gg_ws *w, void *buf, size_t n);
int gg_ws_send_binary(gg_ws *w, const void *buf, size_t n);
void gg_ws_close(gg_ws *w);

#endif
