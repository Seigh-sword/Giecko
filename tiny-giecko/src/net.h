#ifndef GG_NET_H
#define GG_NET_H

#include <stddef.h>

typedef struct gg_conn {
    int fd;
    void *tls;
    char err[192];
} gg_conn;

int gg_net_init(void);
void gg_net_fini(void);
int gg_tcp_connect(const char *host, const char *port, int timeout_secs);
void gg_conn_set_err(gg_conn *c, const char *msg);
int gg_conn_read(gg_conn *c, void *buf, size_t n);
int gg_conn_write(gg_conn *c, const void *buf, size_t n);
void gg_conn_close(gg_conn *c);

#endif
