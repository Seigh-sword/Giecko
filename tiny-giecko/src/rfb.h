#ifndef GG_RFB_H
#define GG_RFB_H

#include <stddef.h>
#include "ws.h"

typedef struct gg_rfb {
    gg_ws *ws;
    gg_conn *conn;
    char version[13];
    unsigned width;
    unsigned height;
    unsigned bpp;
    unsigned depth;
    char name[256];
    int auth_type;
    char err[192];
} gg_rfb;

int gg_rfb_connect_auth(gg_rfb *r, const char *password);
int gg_rfb_run(gg_rfb *r, int seconds, unsigned long long *updates, unsigned long long *pixels);
int gg_rfb_run_tui(gg_rfb *r, unsigned long long *updates, unsigned long long *pixels);
int gg_rfb_fd(gg_rfb *r);
int gg_rfb_key_event(gg_rfb *r, unsigned int keysym, int down);
int gg_rfb_pointer_event(gg_rfb *r, unsigned buttons, unsigned x, unsigned y);
int gg_rfb_request_update(gg_rfb *r, int incremental);

#endif
