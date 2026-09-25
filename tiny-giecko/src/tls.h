#ifndef GG_TLS_H
#define GG_TLS_H

#include <stddef.h>
#include "net.h"

int gg_tls_attach(gg_conn *c, const char *host);
int gg_tls_read(gg_conn *c, void *buf, size_t n);
int gg_tls_write(gg_conn *c, const void *buf, size_t n);
void gg_tls_detach(gg_conn *c);

#endif
