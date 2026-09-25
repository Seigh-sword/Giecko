#include "b64.h"

static const char GG_AL[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

void gg_b64_encode(const unsigned char *in, size_t n, char *out)
{
    size_t i;
    size_t o = 0;
    for (i = 0; i + 3 <= n; i += 3) {
        unsigned v = ((unsigned)in[i] << 16) | ((unsigned)in[i + 1] << 8) | (unsigned)in[i + 2];
        out[o++] = GG_AL[(v >> 18) & 63];
        out[o++] = GG_AL[(v >> 12) & 63];
        out[o++] = GG_AL[(v >> 6) & 63];
        out[o++] = GG_AL[v & 63];
    }
    if (n - i == 1) {
        unsigned v = (unsigned)in[i] << 16;
        out[o++] = GG_AL[(v >> 18) & 63];
        out[o++] = GG_AL[(v >> 12) & 63];
        out[o++] = '=';
        out[o++] = '=';
    } else if (n - i == 2) {
        unsigned v = ((unsigned)in[i] << 16) | ((unsigned)in[i + 1] << 8);
        out[o++] = GG_AL[(v >> 18) & 63];
        out[o++] = GG_AL[(v >> 12) & 63];
        out[o++] = GG_AL[(v >> 6) & 63];
        out[o++] = '=';
    }
    out[o] = 0;
}
