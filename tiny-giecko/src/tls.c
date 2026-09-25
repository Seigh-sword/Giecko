#include "tls.h"

#ifdef GG_TLS

#include <openssl/ssl.h>
#include <openssl/err.h>

int gg_tls_attach(gg_conn *c, const char *host)
{
    SSL_CTX *ctx;
    SSL *ssl;
    SSL_library_init();
    SSL_load_error_strings();
    ctx = SSL_CTX_new(TLS_client_method());
    if (!ctx) {
        gg_conn_set_err(c, "tls: ctx failed");
        return -1;
    }
    SSL_CTX_set_verify(ctx, SSL_VERIFY_NONE, NULL);
    ssl = SSL_new(ctx);
    if (!ssl) {
        SSL_CTX_free(ctx);
        gg_conn_set_err(c, "tls: ssl new failed");
        return -1;
    }
    SSL_set_fd(ssl, c->fd);
    SSL_set_tlsext_host_name(ssl, host);
    if (SSL_connect(ssl) != 1) {
        unsigned long e = ERR_get_error();
        char buf[160];
        ERR_error_string_n(e, buf, sizeof(buf));
        gg_conn_set_err(c, buf);
        SSL_free(ssl);
        SSL_CTX_free(ctx);
        return -1;
    }
    c->tls = ssl;
    return 0;
}

int gg_tls_read(gg_conn *c, void *buf, size_t n)
{
    unsigned char *p = (unsigned char *)buf;
    size_t got = 0;
    SSL *ssl = (SSL *)c->tls;
    while (got < n) {
        int k = SSL_read(ssl, p + got, (int)(n - got));
        if (k <= 0) {
            gg_conn_set_err(c, "tls: read failed");
            return -1;
        }
        got += (size_t)k;
    }
    return 0;
}

int gg_tls_write(gg_conn *c, const void *buf, size_t n)
{
    const unsigned char *p = (const unsigned char *)buf;
    size_t sent = 0;
    SSL *ssl = (SSL *)c->tls;
    while (sent < n) {
        int k = SSL_write(ssl, p + sent, (int)(n - sent));
        if (k <= 0) {
            gg_conn_set_err(c, "tls: write failed");
            return -1;
        }
        sent += (size_t)k;
    }
    return 0;
}

void gg_tls_detach(gg_conn *c)
{
    SSL *ssl = (SSL *)c->tls;
    if (!ssl)
        return;
    SSL_shutdown(ssl);
    SSL_free(ssl);
    c->tls = NULL;
}

#else

int gg_tls_attach(gg_conn *c, const char *host)
{
    (void)host;
    gg_conn_set_err(c, "tls not compiled in: rebuild with make tls (openssl)");
    return -1;
}

int gg_tls_read(gg_conn *c, void *buf, size_t n)
{
    (void)buf;
    (void)n;
    gg_conn_set_err(c, "tls not compiled in");
    return -1;
}

int gg_tls_write(gg_conn *c, const void *buf, size_t n)
{
    (void)buf;
    (void)n;
    gg_conn_set_err(c, "tls not compiled in");
    return -1;
}

void gg_tls_detach(gg_conn *c)
{
    (void)c;
}

#endif
