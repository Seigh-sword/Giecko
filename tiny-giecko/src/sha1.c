#include "sha1.h"

#include <stdint.h>
#include <string.h>

static uint32_t gg_rotl(uint32_t v, int n)
{
    return (v << n) | (v >> (32 - n));
}

static void gg_sha1_block(const unsigned char *blk, uint32_t *h)
{
    uint32_t w[80];
    uint32_t a, b, c, d, e;
    int i;
    for (i = 0; i < 16; i++)
        w[i] = ((uint32_t)blk[i * 4] << 24) | ((uint32_t)blk[i * 4 + 1] << 16) | ((uint32_t)blk[i * 4 + 2] << 8) | (uint32_t)blk[i * 4 + 3];
    for (i = 16; i < 80; i++)
        w[i] = gg_rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    a = h[0];
    b = h[1];
    c = h[2];
    d = h[3];
    e = h[4];
    for (i = 0; i < 80; i++) {
        uint32_t f, k, t;
        if (i < 20) {
            f = (b & c) | ((~b) & d);
            k = 0x5A827999u;
        } else if (i < 40) {
            f = b ^ c ^ d;
            k = 0x6ED9EBA1u;
        } else if (i < 60) {
            f = (b & c) | (b & d) | (c & d);
            k = 0x8F1BBCDCu;
        } else {
            f = b ^ c ^ d;
            k = 0xCA62C1D6u;
        }
        t = gg_rotl(a, 5) + f + e + k + w[i];
        e = d;
        d = c;
        c = gg_rotl(b, 30);
        b = a;
        a = t;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
}

void gg_sha1(const unsigned char *data, size_t len, unsigned char out[20])
{
    uint32_t h[5];
    size_t nblocks = len / 64;
    size_t tail = len % 64;
    unsigned char buf[128];
    size_t padlen;
    uint64_t bits = (uint64_t)len * 8u;
    size_t i;
    int j;
    h[0] = 0x67452301u;
    h[1] = 0xEFCDAB89u;
    h[2] = 0x98BADCFEu;
    h[3] = 0x10325476u;
    h[4] = 0xC3D2E1F0u;
    for (i = 0; i < nblocks; i++)
        gg_sha1_block(data + i * 64, h);
    memset(buf, 0, sizeof(buf));
    if (tail)
        memcpy(buf, data + nblocks * 64, tail);
    buf[tail] = 0x80;
    padlen = (tail <= 55) ? 64 : 128;
    for (j = 0; j < 8; j++)
        buf[padlen - 1 - j] = (unsigned char)((bits >> (8 * j)) & 0xFF);
    for (i = 0; i < padlen / 64; i++)
        gg_sha1_block(buf + i * 64, h);
    for (j = 0; j < 5; j++) {
        out[j * 4] = (unsigned char)((h[j] >> 24) & 0xFF);
        out[j * 4 + 1] = (unsigned char)((h[j] >> 16) & 0xFF);
        out[j * 4 + 2] = (unsigned char)((h[j] >> 8) & 0xFF);
        out[j * 4 + 3] = (unsigned char)(h[j] & 0xFF);
    }
}
