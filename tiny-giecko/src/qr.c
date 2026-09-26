#include "qr.h"

#include <string.h>

static const int GG_RS_M[10][6] = {
    {1, 26, 16, 0, 0, 0},
    {1, 44, 28, 0, 0, 0},
    {1, 70, 44, 0, 0, 0},
    {2, 50, 32, 0, 0, 0},
    {2, 67, 43, 0, 0, 0},
    {4, 43, 27, 0, 0, 0},
    {4, 49, 31, 0, 0, 0},
    {2, 60, 38, 2, 61, 39},
    {3, 58, 36, 2, 59, 37},
    {4, 69, 43, 1, 70, 44}
};

static const int GG_ALIGN[10][5] = {
    {0, 0, 0, 0, 0},
    {6, 18, 0, 0, 0},
    {6, 22, 0, 0, 0},
    {6, 26, 0, 0, 0},
    {6, 30, 0, 0, 0},
    {6, 34, 0, 0, 0},
    {6, 22, 38, 0, 0},
    {6, 24, 42, 0, 0},
    {6, 26, 46, 0, 0},
    {6, 28, 50, 0, 0}
};

static unsigned char gg_gf_exp[512];
static unsigned char gg_gf_log[256];
static int gg_gf_ready = 0;

static void gg_gf_init(void)
{
    int i = 1, j;
    for (j = 0; j < 255; j++) {
        gg_gf_exp[j] = (unsigned char)i;
        gg_gf_log[i] = (unsigned char)j;
        i <<= 1;
        if (i & 0x100)
            i ^= 0x11D;
    }
    for (; j < 512; j++)
        gg_gf_exp[j] = gg_gf_exp[j - 255];
    gg_gf_ready = 1;
}

static unsigned gg_gf_mul(unsigned a, unsigned b)
{
    if (a == 0 || b == 0)
        return 0;
    return gg_gf_exp[gg_gf_log[a] + gg_gf_log[b]];
}

static int gg_capacity(int version)
{
    static const int cap[10] = {14, 26, 42, 62, 84, 106, 122, 152, 180, 213};
    return cap[version - 1];
}

static int gg_data_cw(int version)
{
    static const int dc[10] = {16, 28, 44, 64, 86, 108, 124, 154, 182, 216};
    return dc[version - 1];
}

static int gg_total_cw(int version)
{
    static const int tc[10] = {26, 44, 70, 100, 134, 172, 196, 242, 292, 346};
    return tc[version - 1];
}

static int gg_get_bit(int x, int i)
{
    return (x >> i) & 1;
}

static void gg_set(unsigned char *m, int size, int row, int col, int v, unsigned char *fn)
{
    m[row * size + col] = (unsigned char)(v ? 1 : 0);
    if (fn)
        fn[row * size + col] = 1;
}

static void gg_draw_finder(unsigned char *m, int size, int row, int col, unsigned char *fn)
{
    int dr, dc;
    for (dr = -4; dr <= 4; dr++) {
        for (dc = -4; dc <= 4; dc++) {
            int r = row + dr, c = col + dc;
            int da = dr < 0 ? -dr : dr;
            int db = dc < 0 ? -dc : dc;
            int d = da > db ? da : db;
            if (r < 0 || r >= size || c < 0 || c >= size)
                continue;
            gg_set(m, size, r, c, d <= 1 || d == 3, fn);
        }
    }
}

static void gg_draw_alignment(unsigned char *m, int size, int row, int col, unsigned char *fn)
{
    int dr, dc;
    for (dr = -2; dr <= 2; dr++) {
        for (dc = -2; dc <= 2; dc++) {
            int da = dr < 0 ? -dr : dr;
            int db = dc < 0 ? -dc : dc;
            int d = da > db ? da : db;
            gg_set(m, size, row + dr, col + dc, d != 1, fn);
        }
    }
}

static void gg_draw_version(unsigned char *m, int size, int version, unsigned char *fn)
{
    int rem = version, i;
    if (version < 7)
        return;
    for (i = 0; i < 12; i++)
        rem = (rem << 1) ^ ((rem >> 11) * 0x1F25);
    {
        int bits = version << 12 | rem;
        for (i = 0; i < 18; i++) {
            int bit = gg_get_bit(bits, i);
            int a = size - 11 + i % 3;
            int b = i / 3;
            gg_set(m, size, b, a, bit, fn);
            gg_set(m, size, a, b, bit, fn);
        }
    }
}

static void gg_draw_format(unsigned char *m, int size, int mask, unsigned char *fn)
{
    int data = 0 << 3 | mask;
    int rem = data, bits, i;
    for (i = 0; i < 10; i++)
        rem = (rem << 1) ^ ((rem >> 9) * 0x537);
    bits = (data << 10 | rem) ^ 0x5412;
    for (i = 0; i < 6; i++)
        gg_set(m, size, i, 8, gg_get_bit(bits, i), fn);
    gg_set(m, size, 7, 8, gg_get_bit(bits, 6), fn);
    gg_set(m, size, 8, 8, gg_get_bit(bits, 7), fn);
    gg_set(m, size, 8, 7, gg_get_bit(bits, 8), fn);
    for (i = 9; i < 15; i++)
        gg_set(m, size, 8, 14 - i, gg_get_bit(bits, i), fn);
    for (i = 0; i < 8; i++)
        gg_set(m, size, 8, size - 1 - i, gg_get_bit(bits, i), fn);
    for (i = 8; i < 15; i++)
        gg_set(m, size, size - 15 + i, 8, gg_get_bit(bits, i), fn);
    gg_set(m, size, size - 8, 8, 1, fn);
}

static int gg_mask_bit(int mask, int row, int col)
{
    switch (mask) {
    case 0:
        return (row + col) % 2 == 0;
    case 1:
        return row % 2 == 0;
    case 2:
        return col % 3 == 0;
    case 3:
        return (row + col) % 3 == 0;
    case 4:
        return (row / 2 + col / 3) % 2 == 0;
    case 5:
        return (row * col) % 2 + (row * col) % 3 == 0;
    case 6:
        return ((row * col) % 2 + (row * col) % 3) % 2 == 0;
    default:
        return ((row + col) % 2 + (row * col) % 3) % 2 == 0;
    }
}

static void gg_rs_gen(int degree, unsigned char *gen)
{
    unsigned char b[40];
    int len = 1, i, k;
    memset(gen, 0, (size_t)(degree + 1));
    gen[0] = 1;
    for (k = 0; k < degree; k++) {
        unsigned root = gg_gf_exp[k];
        memset(b, 0, sizeof(b));
        for (i = 0; i < len; i++) {
            b[i] ^= gen[i];
            b[i + 1] ^= (unsigned char)gg_gf_mul(gen[i], root);
        }
        len++;
        memcpy(gen, b, (size_t)len);
    }
}

static void gg_rs_remainder(const unsigned char *data, int data_len, int degree, unsigned char *rem)
{
    unsigned char work[300];
    unsigned char gen[40];
    int wlen, i;
    gg_rs_gen(degree, gen);
    memcpy(work, data, (size_t)data_len);
    memset(work + data_len, 0, (size_t)degree);
    wlen = data_len + degree;
    while (wlen >= degree + 1) {
        unsigned char lead = work[0];
        if (lead != 0) {
            for (i = 0; i <= degree; i++)
                work[i] ^= (unsigned char)gg_gf_mul(gen[i], lead);
        }
        memmove(work, work + 1, (size_t)(wlen - 1));
        wlen--;
    }
    memset(rem, 0, (size_t)degree);
    memcpy(rem + (degree - wlen), work, (size_t)wlen);
}

static void gg_build_codewords(const char *text, int len, int version, unsigned char *out)
{
    int data_cw = gg_data_cw(version);
    int total_cw = gg_total_cw(version);
    int count_bits = version <= 9 ? 8 : 16;
    unsigned char bits[2600];
    int nbits = 0;
    int i, j;
    unsigned char cw[300];
    unsigned char blocks_data[8][120];
    unsigned char blocks_ec[8][80];
    int nb1 = GG_RS_M[version - 1][0];
    int d1 = GG_RS_M[version - 1][2];
    int nb2 = GG_RS_M[version - 1][3];
    int d2 = GG_RS_M[version - 1][5];
    int ec_len = GG_RS_M[version - 1][1] - d1;
    int nblocks = nb1 + nb2;
    int pos = 0;
    int off = 0;
    int maxd;

    memset(bits, 0, sizeof(bits));
    memset(cw, 0, sizeof(cw));
    memset(blocks_data, 0, sizeof(blocks_data));
    memset(blocks_ec, 0, sizeof(blocks_ec));

#define GG_PUSH(v, n)                                                   \
    do {                                                                \
        int q_;                                                         \
        for (q_ = (n)-1; q_ >= 0; q_--)                                 \
            bits[nbits++] = (unsigned char)(((v) >> q_) & 1);           \
    } while (0)

    GG_PUSH(4, 4);
    GG_PUSH(len, count_bits);
    for (i = 0; i < len; i++)
        GG_PUSH((unsigned char)text[i], 8);
    GG_PUSH(0, 4);
    while (nbits % 8 != 0)
        GG_PUSH(0, 1);

#undef GG_PUSH

    for (i = 0; i < nbits / 8; i++) {
        int v = 0;
        for (j = 0; j < 8; j++)
            v = (v << 1) | bits[i * 8 + j];
        cw[i] = (unsigned char)v;
    }
    {
        int pad = 0;
        for (i = nbits / 8; i < data_cw; i++)
            cw[i] = (pad++ % 2 == 0) ? 0xEC : 0x11;
    }

    for (i = 0; i < nblocks; i++) {
        int dlen = i < nb1 ? d1 : d2;
        for (j = 0; j < dlen; j++)
            blocks_data[i][j] = cw[off + j];
        off += dlen;
    }
    for (i = 0; i < nblocks; i++) {
        int dlen = i < nb1 ? d1 : d2;
        gg_rs_remainder(blocks_data[i], dlen, ec_len, blocks_ec[i]);
    }

    maxd = d1 > d2 ? d1 : d2;
    for (i = 0; i < maxd; i++) {
        for (j = 0; j < nblocks; j++) {
            int dlen = j < nb1 ? d1 : d2;
            if (i < dlen)
                out[pos++] = blocks_data[j][i];
        }
    }
    for (i = 0; i < ec_len; i++) {
        for (j = 0; j < nblocks; j++)
            out[pos++] = blocks_ec[j][i];
    }
    while (pos < total_cw)
        out[pos++] = 0;
}

static void gg_place_data(unsigned char *m, int size, const unsigned char *cw, int ncw, unsigned char *fn)
{
    int inc = -1;
    int row = size - 1;
    int bit_index = 7;
    int byte_index = 0;
    int col;
    for (col = size - 1; col > 0; col -= 2) {
        int c0 = col;
        int c;
        if (c0 <= 6)
            c0 -= 1;
        for (;;) {
            for (c = c0; c >= c0 - 1; c--) {
                if (!fn[row * size + c]) {
                    int dark = 0;
                    if (byte_index < ncw)
                        dark = (cw[byte_index] >> bit_index) & 1;
                    m[row * size + c] = (unsigned char)dark;
                    bit_index--;
                    if (bit_index == -1) {
                        byte_index++;
                        bit_index = 7;
                    }
                }
            }
            row += inc;
            if (row < 0 || row >= size) {
                row -= inc;
                inc = -inc;
                break;
            }
        }
    }
}

static void gg_apply_mask(unsigned char *m, int size, int mask, const unsigned char *fn)
{
    int row, col;
    for (row = 0; row < size; row++) {
        for (col = 0; col < size; col++) {
            if (!fn[row * size + col] && gg_mask_bit(mask, row, col))
                m[row * size + col] ^= 1;
        }
    }
}

static long gg_penalty(const unsigned char *m, int size)
{
    long pen = 0;
    int row, col, i;
    int total = size * size;
    int dark = 0;
    for (row = 0; row < size; row++) {
        for (col = 0; col < size; col++)
            dark += m[row * size + col];
    }
    for (row = 0; row < size; row++) {
        int run = 1;
        for (col = 1; col <= size; col++) {
            if (col < size && m[row * size + col] == m[row * size + col - 1]) {
                run++;
            } else {
                if (run >= 5)
                    pen += 3 + (run - 5);
                run = 1;
            }
        }
    }
    for (col = 0; col < size; col++) {
        int run = 1;
        for (row = 1; row <= size; row++) {
            if (row < size && m[row * size + col] == m[(row - 1) * size + col]) {
                run++;
            } else {
                if (run >= 5)
                    pen += 3 + (run - 5);
                run = 1;
            }
        }
    }
    for (row = 0; row + 1 < size; row++) {
        for (col = 0; col + 1 < size; col++) {
            int c = m[row * size + col];
            if (c == m[row * size + col + 1] && c == m[(row + 1) * size + col] && c == m[(row + 1) * size + col + 1])
                pen += 3;
        }
    }
    for (row = 0; row < size; row++) {
        for (col = 0; col + 6 < size; col++) {
            int ok = 1;
            for (i = 0; i < 7; i++) {
                int v = m[row * size + col + i];
                if ((i == 1 || i == 3 || i == 5) ? v != 0 : v == 0) {
                    ok = 0;
                    break;
                }
            }
            if (ok) {
                int before = 1, after = 1;
                for (i = 1; i <= 4; i++) {
                    if (col - i >= 0 && m[row * size + col - i])
                        before = 0;
                    if (col + 6 + i < size && m[row * size + col + 6 + i])
                        after = 0;
                }
                if (before || after)
                    pen += 40;
            }
        }
    }
    for (col = 0; col < size; col++) {
        for (row = 0; row + 6 < size; row++) {
            int ok = 1;
            int i;
            for (i = 0; i < 7; i++) {
                int v = m[(row + i) * size + col];
                if ((i == 1 || i == 3 || i == 5) ? v != 0 : v == 0) {
                    ok = 0;
                    break;
                }
            }
            if (ok) {
                int before = 1, after = 1;
                for (i = 1; i <= 4; i++) {
                    if (row - i >= 0 && m[(row - i) * size + col])
                        before = 0;
                    if (row + 6 + i < size && m[(row + 6 + i) * size + col])
                        after = 0;
                }
                if (before || after)
                    pen += 40;
            }
        }
    }
    {
        long percent = (dark * 200L + total) / (2 * total);
        long k = percent > 50 ? percent - 50 : 50 - percent;
        pen += 10 * (k / 5);
    }
    return pen;
}

int gg_qr_generate(const char *text, int len, unsigned char *modules, int *size, int version, int mask)
{
    int i;
    unsigned char cw[600];
    int sz;
    unsigned char m[GG_QR_MAX_SIZE * GG_QR_MAX_SIZE];
    unsigned char fn[GG_QR_MAX_SIZE * GG_QR_MAX_SIZE];
    unsigned char t[GG_QR_MAX_SIZE * GG_QR_MAX_SIZE];
    int nalign = 0, j;
    if (!gg_gf_ready)
        gg_gf_init();
    if (len < 0)
        len = (int)strlen(text);
    if (version < 1 || version > 10) {
        version = 1;
        while (version <= 10 && gg_capacity(version) < len)
            version++;
        if (version > 10)
            return -1;
    }
    if (len > gg_capacity(version))
        return -1;
    gg_build_codewords(text, len, version, cw);
    sz = 17 + 4 * version;
    *size = sz;
    memset(m, 0, sizeof(m));
    memset(fn, 0, sizeof(fn));
    gg_draw_finder(m, sz, 3, 3, fn);
    gg_draw_finder(m, sz, 3, sz - 4, fn);
    gg_draw_finder(m, sz, sz - 4, 3, fn);
    for (i = 8; i < sz - 8; i++) {
        unsigned char v = (unsigned char)((i + 1) % 2);
        gg_set(m, sz, 6, i, v, fn);
        gg_set(m, sz, i, 6, v, fn);
    }
    if (version >= 2) {
        while (GG_ALIGN[version - 1][nalign])
            nalign++;
        for (i = 0; i < nalign; i++) {
            for (j = 0; j < nalign; j++) {
                int cr = GG_ALIGN[version - 1][i];
                int cc = GG_ALIGN[version - 1][j];
                if ((i == 0 && j == 0) || (i == 0 && j == nalign - 1) || (i == nalign - 1 && j == 0))
                    continue;
                gg_draw_alignment(m, sz, cr, cc, fn);
            }
        }
    }
    gg_draw_version(m, sz, version, fn);
    gg_draw_format(m, sz, 0, fn);
    gg_place_data(m, sz, cw, gg_total_cw(version), fn);
    if (mask < 0) {
        long best_pen = -1;
        int best_mask = 0;
        for (i = 0; i < 8; i++) {
            long pen;
            memcpy(t, m, sizeof(m));
            gg_apply_mask(t, sz, i, fn);
            gg_draw_format(t, sz, i, fn);
            pen = gg_penalty(t, sz);
            if (best_pen < 0 || pen < best_pen) {
                best_pen = pen;
                best_mask = i;
            }
        }
        mask = best_mask;
    }
    gg_apply_mask(m, sz, mask, fn);
    gg_draw_format(m, sz, mask, fn);
    memcpy(modules, m, (size_t)(sz * sz));
    return mask;
}

int gg_qr_render(const unsigned char *modules, int size, int quiet, char *out, size_t outsz)
{
    size_t pos = 0;
    int r, c;
    for (r = -quiet; r < size + quiet; r += 2) {
        for (c = -quiet; c < size + quiet; c++) {
            int top = 0, bot = 0;
            if (pos + 4 > outsz)
                return -1;
            if (r >= 0 && r < size && c >= 0 && c < size)
                top = modules[r * size + c];
            if (r + 1 >= 0 && r + 1 < size && c >= 0 && c < size)
                bot = modules[(r + 1) * size + c];
            if (top && bot) {
                out[pos++] = (char)0xE2;
                out[pos++] = (char)0x96;
                out[pos++] = (char)0x88;
            } else if (top) {
                out[pos++] = (char)0xE2;
                out[pos++] = (char)0x96;
                out[pos++] = (char)0x80;
            } else if (bot) {
                out[pos++] = (char)0xE2;
                out[pos++] = (char)0x96;
                out[pos++] = (char)0x84;
            } else {
                out[pos++] = ' ';
            }
        }
        if (pos + 2 > outsz)
            return -1;
        out[pos++] = '\n';
    }
    out[pos] = 0;
    return (int)pos;
}
