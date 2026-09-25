#include "des.h"

static const int GG_IP[64] = {
    58, 50, 42, 34, 26, 18, 10, 2,
    60, 52, 44, 36, 28, 20, 12, 4,
    62, 54, 46, 38, 30, 22, 14, 6,
    64, 56, 48, 40, 32, 24, 16, 8,
    57, 49, 41, 33, 25, 17, 9, 1,
    59, 51, 43, 35, 27, 19, 11, 3,
    61, 53, 45, 37, 29, 21, 13, 5,
    63, 55, 47, 39, 31, 23, 15, 7};

static const int GG_FP[64] = {
    40, 8, 48, 16, 56, 24, 64, 32,
    39, 7, 47, 15, 55, 23, 63, 31,
    38, 6, 46, 14, 54, 22, 62, 30,
    37, 5, 45, 13, 53, 21, 61, 29,
    36, 4, 44, 12, 52, 20, 60, 28,
    35, 3, 43, 11, 51, 19, 59, 27,
    34, 2, 42, 10, 50, 18, 58, 26,
    33, 1, 41, 9, 49, 17, 57, 25};

static const int GG_E[48] = {
    32, 1, 2, 3, 4, 5,
    4, 5, 6, 7, 8, 9,
    8, 9, 10, 11, 12, 13,
    12, 13, 14, 15, 16, 17,
    16, 17, 18, 19, 20, 21,
    20, 21, 22, 23, 24, 25,
    24, 25, 26, 27, 28, 29,
    28, 29, 30, 31, 32, 1};

static const int GG_PC1[56] = {
    57, 49, 41, 33, 25, 17, 9,
    1, 58, 50, 42, 34, 26, 18,
    10, 2, 59, 51, 43, 35, 27,
    19, 11, 3, 60, 52, 44, 36,
    63, 55, 47, 39, 31, 23, 15,
    7, 62, 54, 46, 38, 30, 22,
    14, 6, 61, 53, 45, 37, 29,
    21, 13, 5, 28, 20, 12, 4};

static const int GG_PC2[48] = {
    14, 17, 11, 24, 1, 5,
    3, 28, 15, 6, 21, 10,
    23, 19, 12, 4, 26, 8,
    16, 7, 27, 20, 13, 2,
    41, 52, 31, 37, 47, 55,
    30, 40, 51, 45, 33, 48,
    44, 49, 39, 56, 34, 53,
    46, 42, 50, 36, 29, 32};

static const int GG_SHIFTS[16] = {1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1};

static const int GG_SBOX[8][64] = {
    {14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7,
     0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8,
     4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0,
     15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13},
    {15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10,
     3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5,
     0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15,
     13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9},
    {10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8,
     13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1,
     13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7,
     1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12},
    {7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15,
     13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9,
     10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4,
     3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14},
    {2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9,
     14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6,
     4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14,
     11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3},
    {12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11,
     10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8,
     9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6,
     4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13},
    {4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1,
     13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6,
     1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2,
     6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12},
    {13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7,
     1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2,
     7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8,
     2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11}};

static const int GG_P[32] = {
    16, 7, 20, 21,
    29, 12, 28, 17,
    1, 15, 23, 26,
    5, 18, 31, 10,
    2, 8, 24, 14,
    32, 27, 3, 9,
    19, 13, 30, 6,
    22, 11, 4, 25};

static int gg_bit(unsigned long long v, int width, int n)
{
    return (int)((v >> (width - n)) & 1ULL);
}

void gg_des_keysched(unsigned long long key, unsigned long long sub[16])
{
    unsigned long long cd = 0;
    unsigned int c, d;
    int i, j;
    for (i = 0; i < 56; i++)
        cd = (cd << 1) | (unsigned long long)gg_bit(key, 64, GG_PC1[i]);
    c = (unsigned int)(cd >> 28);
    d = (unsigned int)(cd & 0x0FFFFFFFu);
    for (i = 0; i < 16; i++) {
        int s = GG_SHIFTS[i];
        unsigned long long k = 0;
        unsigned long long cd2;
        c = ((c << s) | (c >> (28 - s))) & 0x0FFFFFFFu;
        d = ((d << s) | (d >> (28 - s))) & 0x0FFFFFFFu;
        cd2 = ((unsigned long long)c << 28) | d;
        for (j = 0; j < 48; j++)
            k = (k << 1) | (unsigned long long)gg_bit(cd2, 56, GG_PC2[j]);
        sub[i] = k;
    }
}

static unsigned int gg_f(unsigned int r, unsigned long long k)
{
    unsigned long long e = 0;
    unsigned long long s = 0;
    unsigned long long p = 0;
    int i, j;
    for (i = 0; i < 48; i++)
        e = (e << 1) | (unsigned long long)gg_bit(r, 32, GG_E[i]);
    e ^= k;
    for (i = 0; i < 8; i++) {
        int b[6];
        int row, col, v;
        for (j = 0; j < 6; j++)
            b[j] = gg_bit(e, 48, i * 6 + j + 1);
        row = b[0] * 2 + b[5];
        col = b[1] * 8 + b[2] * 4 + b[3] * 2 + b[4];
        v = GG_SBOX[i][row * 16 + col];
        s = (s << 4) | (unsigned long long)v;
    }
    for (i = 0; i < 32; i++)
        p = (p << 1) | (unsigned long long)gg_bit(s, 32, GG_P[i]);
    return (unsigned int)p;
}

unsigned long long gg_des_block(unsigned long long block, const unsigned long long sub[16])
{
    unsigned long long ip = 0;
    unsigned long long pre;
    unsigned int l, r;
    int i;
    for (i = 0; i < 64; i++)
        ip = (ip << 1) | (unsigned long long)gg_bit(block, 64, GG_IP[i]);
    l = (unsigned int)(ip >> 32);
    r = (unsigned int)(ip & 0xFFFFFFFFu);
    for (i = 0; i < 16; i++) {
        unsigned int t = r;
        r = l ^ gg_f(r, sub[i]);
        l = t;
    }
    pre = ((unsigned long long)r << 32) | l;
    {
        unsigned long long out = 0;
        for (i = 0; i < 64; i++)
            out = (out << 1) | (unsigned long long)gg_bit(pre, 64, GG_FP[i]);
        return out;
    }
}

void gg_des_ecb_encrypt(const unsigned char *in, unsigned char *out, size_t n, unsigned long long key)
{
    unsigned long long sub[16];
    size_t i;
    gg_des_keysched(key, sub);
    for (i = 0; i + 8 <= n; i += 8) {
        unsigned long long b = 0;
        int j;
        unsigned long long e;
        for (j = 0; j < 8; j++)
            b = (b << 8) | in[i + j];
        e = gg_des_block(b, sub);
        for (j = 0; j < 8; j++)
            out[i + j] = (unsigned char)((e >> (56 - 8 * j)) & 0xFF);
    }
}

void gg_vnc_key(const char *pw, unsigned char out[8])
{
    unsigned char raw[8] = {0, 0, 0, 0, 0, 0, 0, 0};
    int i, j;
    for (i = 0; i < 8 && pw[i]; i++)
        raw[i] = (unsigned char)pw[i];
    for (i = 0; i < 8; i++) {
        unsigned char v = raw[i];
        unsigned char r = 0;
        for (j = 0; j < 8; j++) {
            r = (unsigned char)((r << 1) | (v & 1));
            v >>= 1;
        }
        out[i] = r;
    }
}
