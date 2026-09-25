#define _POSIX_C_SOURCE 200112L

#include "net.h"
#include "tls.h"

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#define GG_CLOSE closesocket
#define GG_BAD INVALID_SOCKET
#else
#include <sys/socket.h>
#include <sys/types.h>
#include <sys/select.h>
#include <netdb.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <string.h>
#define GG_CLOSE close
#define GG_BAD (-1)
#endif

int gg_net_init(void)
{
#ifdef _WIN32
    WSADATA d;
    return WSAStartup(MAKEWORD(2, 2), &d) == 0 ? 0 : -1;
#else
    return 0;
#endif
}

void gg_net_fini(void)
{
#ifdef _WIN32
    WSACleanup();
#endif
}

static int gg_set_blocking(int fd, int blocking)
{
#ifdef _WIN32
    u_long m = blocking ? 0 : 1;
    return ioctlsocket(fd, FIONBIO, &m) == 0 ? 0 : -1;
#else
    int fl = fcntl(fd, F_GETFL, 0);
    if (fl < 0)
        return -1;
    return fcntl(fd, F_SETFL, blocking ? (fl & ~O_NONBLOCK) : (fl | O_NONBLOCK)) < 0 ? -1 : 0;
#endif
}

int gg_tcp_connect(const char *host, const char *port, int timeout_secs)
{
    struct addrinfo hints;
    struct addrinfo *res = NULL;
    struct addrinfo *p;
    int fd = GG_BAD;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;
    if (getaddrinfo(host, port, &hints, &res) != 0)
        return GG_BAD;
    for (p = res; p; p = p->ai_next) {
#ifdef _WIN32
        fd = (int)socket(p->ai_family, p->ai_socktype, p->ai_protocol);
#else
        fd = socket(p->ai_family, p->ai_socktype, p->ai_protocol);
#endif
        if (fd == GG_BAD)
            continue;
        gg_set_blocking(fd, 0);
        if (connect(fd, p->ai_addr, p->ai_addrlen) == 0) {
            gg_set_blocking(fd, 1);
            break;
        }
#ifdef _WIN32
        if (WSAGetLastError() != WSAEWOULDBLOCK) {
#else
        if (errno != EINPROGRESS) {
#endif
            GG_CLOSE(fd);
            fd = GG_BAD;
            continue;
        }
        {
            fd_set wfds;
            struct timeval tv;
            int sel;
            FD_ZERO(&wfds);
            FD_SET(fd, &wfds);
            tv.tv_sec = timeout_secs;
            tv.tv_usec = 0;
#ifdef _WIN32
            sel = select((int)fd + 1, NULL, &wfds, NULL, &tv);
#else
            sel = select(fd + 1, NULL, &wfds, NULL, &tv);
#endif
            if (sel <= 0) {
                GG_CLOSE(fd);
                fd = GG_BAD;
                continue;
            }
            gg_set_blocking(fd, 1);
            {
                int soerr = 0;
                socklen_t sl = sizeof(soerr);
                if (getsockopt(fd, SOL_SOCKET, SO_ERROR, (char *)&soerr, &sl) != 0 || soerr != 0) {
                    GG_CLOSE(fd);
                    fd = GG_BAD;
                    continue;
                }
            }
#ifdef _WIN32
            {
                DWORD ms = 15000;
                setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, (const char *)&ms, sizeof(ms));
                setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, (const char *)&ms, sizeof(ms));
            }
#else
            {
                struct timeval tv;
                tv.tv_sec = 15;
                tv.tv_usec = 0;
                setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, (const char *)&tv, sizeof(tv));
                setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, (const char *)&tv, sizeof(tv));
            }
#endif
            break;
        }
    }
    freeaddrinfo(res);
    return fd;
}

void gg_conn_set_err(gg_conn *c, const char *msg)
{
    size_t i;
    for (i = 0; i < sizeof(c->err) - 1 && msg[i]; i++)
        c->err[i] = msg[i];
    c->err[i] = 0;
}

static int gg_recv_all(int fd, void *buf, size_t n)
{
    unsigned char *p = (unsigned char *)buf;
    size_t got = 0;
    while (got < n) {
        int k = recv(fd, (char *)p + got, (int)(n - got), 0);
        if (k <= 0)
            return -1;
        got += (size_t)k;
    }
    return 0;
}

static int gg_send_all(int fd, const void *buf, size_t n)
{
    const unsigned char *p = (const unsigned char *)buf;
    size_t sent = 0;
    while (sent < n) {
        int k = send(fd, (const char *)p + sent, (int)(n - sent), 0);
        if (k <= 0)
            return -1;
        sent += (size_t)k;
    }
    return 0;
}

int gg_conn_read(gg_conn *c, void *buf, size_t n)
{
    if (c->tls)
        return gg_tls_read(c, buf, n);
    return gg_recv_all(c->fd, buf, n);
}

int gg_conn_write(gg_conn *c, const void *buf, size_t n)
{
    if (c->tls)
        return gg_tls_write(c, buf, n);
    return gg_send_all(c->fd, buf, n);
}

void gg_conn_close(gg_conn *c)
{
    if (c->tls)
        gg_tls_detach(c);
    if (c->fd != GG_BAD) {
        GG_CLOSE(c->fd);
        c->fd = GG_BAD;
    }
}
