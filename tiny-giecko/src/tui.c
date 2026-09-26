#include "tui.h"
#include "keysym.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#include <conio.h>
#include <windows.h>
#else
#include <fcntl.h>
#include <termios.h>
#include <unistd.h>
#include <sys/ioctl.h>
#include <sys/select.h>
#endif

#define GG_TUI_MAXKEY 64

static int gg_tui_on = 0;
static unsigned char gg_keybuf[GG_TUI_MAXKEY];
static int gg_keylen = 0;
static unsigned int gg_keysym;
static unsigned int gg_btns;
static unsigned int gg_px;
static unsigned int gg_py;
static int gg_wheel;

#ifdef _WIN32
static DWORD gg_old_mode = 0;
#else
static struct termios gg_old_term;
static int gg_old_fl;
#endif

static unsigned char *gg_last;
static unsigned gg_last_cells;

int gg_tui_init(void)
{
    if (gg_tui_on)
        return 0;
    gg_last = NULL;
    gg_last_cells = 0;
    gg_keylen = 0;
#ifdef _WIN32
    {
        HANDLE h = GetStdHandle(STD_INPUT_HANDLE);
        if (!GetConsoleMode(h, &gg_old_mode))
            return -1;
        if (!SetConsoleMode(h, gg_old_mode & ~(DWORD)(ENABLE_ECHO_INPUT | ENABLE_LINE_INPUT | ENABLE_PROCESSED_INPUT)))
            return -1;
    }
#else
    if (!isatty(0) || !isatty(1))
        return -1;
    if (tcgetattr(0, &gg_old_term) != 0)
        return -1;
    {
        struct termios t = gg_old_term;
        t.c_lflag &= (tcflag_t)(~(ECHO | ICANON | ISIG | IEXTEN));
        t.c_iflag &= (tcflag_t)(~(BRKINT | ICRNL | INPCK | ISTRIP | IXON));
        t.c_cc[VMIN] = 1;
        t.c_cc[VTIME] = 0;
        if (tcsetattr(0, TCSANOW, &t) != 0)
            return -1;
    }
    gg_old_fl = fcntl(0, F_GETFL);
    fcntl(0, F_SETFL, gg_old_fl | O_NONBLOCK);
#endif
    fputs("\033[?1049h\033[?25l\033[?1002h\033[?1006h", stdout);
    fflush(stdout);
    gg_tui_on = 1;
    return 0;
}

void gg_tui_fini(void)
{
    if (!gg_tui_on)
        return;
    fputs("\033[0m\033[?1006l\033[?1002l\033[?25h\033[?1049l", stdout);
    fflush(stdout);
#ifdef _WIN32
    SetConsoleMode(GetStdHandle(STD_INPUT_HANDLE), gg_old_mode);
#else
    fcntl(0, F_SETFL, gg_old_fl);
    tcsetattr(0, TCSANOW, &gg_old_term);
#endif
    free(gg_last);
    gg_last = NULL;
    gg_last_cells = 0;
    gg_tui_on = 0;
}

void gg_tui_size(int *cols, int *rows)
{
    *cols = 80;
    *rows = 24;
#ifdef _WIN32
    {
        CONSOLE_SCREEN_BUFFER_INFO ci;
        if (GetConsoleScreenBufferInfo(GetStdHandle(STD_OUTPUT_HANDLE), &ci) && ci.dwSize.X > 4 && ci.dwSize.Y > 4) {
            *cols = (int)ci.dwSize.X;
            *rows = (int)ci.dwSize.Y;
        }
    }
#else
    {
        struct winsize ws;
        if (ioctl(1, TIOCGWINSZ, &ws) == 0 && ws.ws_col > 0 && ws.ws_row > 0) {
            *cols = (int)ws.ws_col;
            *rows = (int)ws.ws_row;
        }
    }
#endif
    if (*cols < 20)
        *cols = 20;
    if (*rows < 6)
        *rows = 6;
}

static int gg_tui_read_more(void)
{
    unsigned char tmp[256];
#ifdef _WIN32
    int got = 0;
    while (_kbhit() && got < (int)sizeof(tmp)) {
        int ch = _getch();
        if (ch == 0 || ch == 224) {
            int ext = _getch();
            tmp[got++] = 0x1B;
            if (got < (int)sizeof(tmp))
                tmp[got++] = '[';
            if (got < (int)sizeof(tmp))
                tmp[got++] = (unsigned char)ext;
        } else {
            tmp[got++] = (unsigned char)ch;
        }
    }
    if (got > 0) {
        int i;
        for (i = 0; i < got && gg_keylen < GG_TUI_MAXKEY; i++)
            gg_keybuf[gg_keylen++] = tmp[i];
        return 1;
    }
    return 0;
#else
    ssize_t n = read(0, tmp, sizeof(tmp));
    if (n > 0) {
        int i;
        for (i = 0; i < n && gg_keylen < GG_TUI_MAXKEY; i++)
            gg_keybuf[gg_keylen++] = tmp[i];
        return 1;
    }
    return 0;
#endif
}

static int gg_parse_sgr(const unsigned char *b, int len, int *used)
{
    int i, f1 = -1, f2 = -1, f3 = -1, cur = 0;
    int final = 0;
    int code;
    int press;
    *used = 0;
    if (len < 6 || b[0] != 0x1B || b[1] != '[' || b[2] != '<')
        return 0;
    for (i = 3; i < len; i++) {
        if (b[i] >= '0' && b[i] <= '9') {
            cur = cur * 10 + (b[i] - '0');
        } else if (b[i] == ';') {
            if (f1 < 0)
                f1 = cur;
            else if (f2 < 0)
                f2 = cur;
            else if (f3 < 0)
                f3 = cur;
            cur = 0;
        } else if (b[i] == 'M' || b[i] == 'm') {
            final = b[i];
            if (f3 < 0)
                f3 = cur;
            break;
        } else {
            return 0;
        }
    }
    if (!final || f1 < 0 || f2 < 0 || f3 < 0)
        return 0;
    *used = i + 1;
    press = final == 'M';
    code = f1;
    if (code >= 64) {
        gg_wheel = (code & 1) ? -1 : 1;
        gg_btns = 0;
    } else if (code >= 32) {
        gg_btns = (unsigned int)(code & 3);
    } else {
        int b = code & 3;
        unsigned int bit = b == 0 ? 1u : (b == 1 ? 2u : (b == 2 ? 4u : 0u));
        if (press)
            gg_btns |= bit;
        else
            gg_btns &= ~bit;
    }
    gg_px = (unsigned int)(f2 - 1);
    gg_py = (unsigned int)(f3 - 1);
    return 1;
}

static void gg_drop(int n)
{
    if (n > gg_keylen)
        n = gg_keylen;
    memmove(gg_keybuf, gg_keybuf + n, (size_t)(gg_keylen - n));
    gg_keylen -= n;
}

int gg_tui_poll(int *key_or_pointer)
{
    *key_or_pointer = 0;
    gg_wheel = 0;
    gg_tui_read_more();
    if (gg_keylen == 0)
        return 0;
    if (gg_keylen >= 3 && gg_keybuf[0] == 0x1B && gg_keybuf[1] == '[' && gg_keybuf[2] == '<') {
        int used;
        if (gg_parse_sgr(gg_keybuf, gg_keylen, &used)) {
            gg_drop(used);
            *key_or_pointer = 2;
            return 1;
        }
        if (!gg_tui_read_more())
            gg_keylen = 0;
        return 0;
    }
    if (gg_keybuf[0] == 0x1B && gg_keylen >= 2 && (gg_keybuf[1] == '[' || gg_keybuf[1] == 'O')) {
        int used;
        unsigned int sym = gg_keysym_translate(gg_keybuf, gg_keylen, &used);
        if (sym) {
            gg_drop(used);
            gg_keysym = sym;
            *key_or_pointer = 1;
            return 1;
        }
        if (!gg_tui_read_more())
            gg_keylen = 0;
        return 0;
    }
    if (gg_keybuf[0] == 0x1B && gg_keylen == 1) {
        if (!gg_tui_read_more()) {
            gg_keylen = 0;
            gg_keysym = 0xFF1B;
            *key_or_pointer = 1;
            return 1;
        }
        return 0;
    }
    {
        int used;
        unsigned int sym = gg_keysym_translate(gg_keybuf, gg_keylen, &used);
        if (sym && used > 0) {
            gg_drop(used);
            gg_keysym = sym;
            *key_or_pointer = 1;
            return 1;
        }
    }
    gg_keylen = 0;
    return 0;
}

unsigned int gg_tui_keysym(void)
{
    return gg_keysym;
}

unsigned int gg_tui_buttons(void)
{
    return gg_btns;
}

unsigned int gg_tui_pointer_x(void)
{
    return gg_px;
}

unsigned int gg_tui_pointer_y(void)
{
    return gg_py;
}

int gg_tui_pointer_wheel(void)
{
    return gg_wheel;
}

static unsigned gg_pixel(const unsigned char *fb, unsigned fw, unsigned fh, unsigned bpp, unsigned x, unsigned y, int ch)
{
    unsigned r = 0, g = 0, b = 0;
    const unsigned char *p;
    if (x >= fw || y >= fh)
        return 0;
    p = fb + ((size_t)y * fw + x) * (bpp / 8);
    if (bpp == 32) {
        r = p[0];
        g = p[1];
        b = p[2];
    } else if (bpp == 24) {
        r = p[0];
        g = p[1];
        b = p[2];
    } else if (bpp == 16) {
        unsigned v = ((unsigned)p[0] << 8) | p[1];
        r = (v >> 11 & 0x1F) * 255 / 31;
        g = (v >> 5 & 0x3F) * 255 / 63;
        b = (v & 0x1F) * 255 / 31;
    } else {
        r = g = b = p[0];
    }
    if (ch == 0)
        return r;
    if (ch == 1)
        return g;
    return b;
}

void gg_tui_draw(const unsigned char *fb, unsigned fw, unsigned fh, unsigned bpp)
{
    int cols, rows;
    int cx, cy;
    unsigned canvas_w, canvas_h;
    unsigned char *cur;
    char out[8192];
    size_t pos = 0;
    unsigned cells;
    if (!gg_tui_on || !fb || fw == 0 || fh == 0)
        return;
    gg_tui_size(&cols, &rows);
    canvas_w = (unsigned)cols;
    canvas_h = (unsigned)(rows - 1) * 2;
    cells = canvas_w * (canvas_h / 2);
    cur = (unsigned char *)malloc(cells * 6);
    if (!cur)
        return;
    for (cy = 0; cy < (int)(canvas_h / 2); cy++) {
        for (cx = 0; cx < (int)canvas_w; cx++) {
            unsigned long sr = 0, sg = 0, sb = 0, cnt = 0;
            unsigned x0 = (unsigned)cx * fw / canvas_w;
            unsigned x1 = ((unsigned)cx + 1) * fw / canvas_w;
            unsigned y0 = (unsigned)(cy * 2) * fh / canvas_h;
            unsigned y1 = ((unsigned)(cy * 2) + 1) * fh / canvas_h + 1;
            unsigned y2 = (unsigned)(cy * 2 + 1) * fh / canvas_h;
            unsigned y3 = (unsigned)(cy * 2 + 2) * fh / canvas_h + 1;
            unsigned x, y;
            unsigned char *c = cur + ((size_t)cy * canvas_w + cx) * 6;
            unsigned char *ct = c;
            unsigned char *cb = c + 3;
            for (y = y0; y < y1 && y < fh; y++) {
                for (x = x0; x < x1 && x < fw; x++) {
                    sr += gg_pixel(fb, fw, fh, bpp, x, y, 0);
                    sg += gg_pixel(fb, fw, fh, bpp, x, y, 1);
                    sb += gg_pixel(fb, fw, fh, bpp, x, y, 2);
                    cnt++;
                }
            }
            if (cnt) {
                ct[0] = (unsigned char)(sr / cnt);
                ct[1] = (unsigned char)(sg / cnt);
                ct[2] = (unsigned char)(sb / cnt);
            } else {
                ct[0] = ct[1] = ct[2] = 0;
            }
            sr = sg = sb = cnt = 0;
            for (y = y2; y < y3 && y < fh; y++) {
                for (x = x0; x < x1 && x < fw; x++) {
                    sr += gg_pixel(fb, fw, fh, bpp, x, y, 0);
                    sg += gg_pixel(fb, fw, fh, bpp, x, y, 1);
                    sb += gg_pixel(fb, fw, fh, bpp, x, y, 2);
                    cnt++;
                }
            }
            if (cnt) {
                cb[0] = (unsigned char)(sr / cnt);
                cb[1] = (unsigned char)(sg / cnt);
                cb[2] = (unsigned char)(sb / cnt);
            } else {
                cb[0] = cb[1] = cb[2] = 0;
            }
        }
    }
    if (gg_last_cells != cells) {
        free(gg_last);
        gg_last = (unsigned char *)malloc(cells * 6);
        if (gg_last)
            memset(gg_last, 0xFF, cells * 6);
        gg_last_cells = gg_last ? cells : 0;
    }
    for (cy = 0; cy < (int)(canvas_h / 2); cy++) {
        for (cx = 0; cx < (int)canvas_w; cx++) {
            const unsigned char *c = cur + ((size_t)cy * canvas_w + cx) * 6;
            const unsigned char *l = gg_last ? gg_last + ((size_t)cy * canvas_w + cx) * 6 : NULL;
            if (l && memcmp(l, c, 6) == 0)
                continue;
            pos += (size_t)snprintf(out + pos, sizeof(out) - pos, "\033[%d;%dH\033[38;2;%d;%d;%d;48;2;%d;%d;%dm",
                                    cy + 1, cx + 1, c[0], c[1], c[2], c[3], c[4], c[5]);
            out[pos++] = (char)0xE2;
            out[pos++] = (char)0x96;
            out[pos++] = (char)0x80;
            if (pos > sizeof(out) - 128) {
                fwrite(out, 1, pos, stdout);
                pos = 0;
            }
        }
    }
    if (pos)
        fwrite(out, 1, pos, stdout);
    if (gg_last && gg_last_cells == cells)
        memcpy(gg_last, cur, cells * 6);
    free(cur);
}

void gg_tui_status(const char *text)
{
    int cols, rows;
    if (!gg_tui_on)
        return;
    gg_tui_size(&cols, &rows);
    printf("\033[%d;1H\033[0;44;97m%-*s\033[0m", rows, cols, text ? text : "");
    fflush(stdout);
}
