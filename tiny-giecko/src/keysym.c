#include "keysym.h"

#include <string.h>

typedef struct {
    const char *seq;
    unsigned int sym;
} gg_special;

static const gg_special GG_SPECIALS[] = {
    {"[A", 0xFF52},
    {"[B", 0xFF54},
    {"[C", 0xFF53},
    {"[D", 0xFF51},
    {"[H", 0xFF50},
    {"[F", 0xFF57},
    {"[1~", 0xFF50},
    {"[4~", 0xFF57},
    {"[2~", 0xFF63},
    {"[3~", 0xFFFF},
    {"[5~", 0xFF55},
    {"[6~", 0xFF56},
    {"[7~", 0xFF50},
    {"[8~", 0xFF57},
    {"[11~", 0xFFBE},
    {"[12~", 0xFFBF},
    {"[13~", 0xFFC0},
    {"[14~", 0xFFC1},
    {"[15~", 0xFFC2},
    {"[17~", 0xFFC3},
    {"[18~", 0xFFC4},
    {"[19~", 0xFFC5},
    {"[20~", 0xFFC6},
    {"[21~", 0xFFC7},
    {"[23~", 0xFFC8},
    {"[24~", 0xFFC9},
    {"OP", 0xFFBE},
    {"OQ", 0xFFBF},
    {"OR", 0xFFC0},
    {"OS", 0xFFC1},
    {"[Z", 0xFF09}
};

static int gg_starts(const char *s, const unsigned char *buf, int len)
{
    int i = 0;
    while (s[i]) {
        if (i >= len || buf[i] != (unsigned char)s[i])
            return 0;
        i++;
    }
    return 1;
}

unsigned int gg_keysym_translate(const unsigned char *buf, int len, int *consumed)
{
    int i;
    *consumed = 1;
    if (len <= 0)
        return 0;
    if (buf[0] == 0x1B) {
        for (i = 0; i < (int)(sizeof(GG_SPECIALS) / sizeof(GG_SPECIALS[0])); i++) {
            const char *s = GG_SPECIALS[i].seq;
            int n = (int)strlen(s);
            if (len >= 1 + n && gg_starts(s, buf + 1, len - 1)) {
                *consumed = 1 + n;
                return GG_SPECIALS[i].sym;
            }
        }
        if (len >= 2 && (buf[1] == 0x1B || buf[1] == '[' || buf[1] == 'O'))
            return 0;
        *consumed = 1;
        return 0xFF1B;
    }
    if (buf[0] == 0x0D || buf[0] == 0x0A)
        return 0xFF0D;
    if (buf[0] == 0x08 || buf[0] == 0x7F)
        return 0xFF08;
    if (buf[0] == 0x09)
        return 0xFF09;
    if (buf[0] < 0x20) {
        if (buf[0] == 0x00)
            return 0xFF00;
        return (unsigned int)buf[0];
    }
    if (buf[0] < 0x80)
        return (unsigned int)buf[0];
    {
        unsigned int cp = 0;
        int n = 0;
        int j;
        if ((buf[0] & 0xE0) == 0xC0) {
            n = 2;
            cp = buf[0] & 0x1F;
        } else if ((buf[0] & 0xF0) == 0xE0) {
            n = 3;
            cp = buf[0] & 0x0F;
        } else if ((buf[0] & 0xF8) == 0xF0) {
            n = 4;
            cp = buf[0] & 0x07;
        } else {
            return 0;
        }
        if (len < n)
            return 0;
        for (j = 1; j < n; j++) {
            if ((buf[j] & 0xC0) != 0x80)
                return 0;
            cp = (cp << 6) | (unsigned int)(buf[j] & 0x3F);
        }
        *consumed = n;
        if (cp < 0x100)
            return cp;
        return 0x01000000u + cp;
    }
}

int gg_input_quit(unsigned int keysym)
{
    return keysym == 0x11;
}
