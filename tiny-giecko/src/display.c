#include "display.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static unsigned char *gg_fb;
static unsigned gg_fb_w;
static unsigned gg_fb_h;
static unsigned gg_fb_bpp;
static unsigned long long gg_disp_rects;

int gg_display_init(unsigned w, unsigned h, unsigned bpp)
{
    free(gg_fb);
    gg_fb = NULL;
    gg_fb_w = 0;
    gg_fb_h = 0;
    gg_fb_bpp = 0;
    gg_disp_rects = 0;
    if (w == 0 || h == 0 || (bpp != 8 && bpp != 16 && bpp != 24 && bpp != 32))
        return -1;
    gg_fb = (unsigned char *)calloc((size_t)w * h, bpp / 8);
    if (!gg_fb)
        return -1;
    gg_fb_w = w;
    gg_fb_h = h;
    gg_fb_bpp = bpp;
    return 0;
}

int gg_display_rect(unsigned x, unsigned y, unsigned w, unsigned h, const unsigned char *data, unsigned bpp)
{
    unsigned row;
    if (!gg_fb || bpp != gg_fb_bpp || !data)
        return -1;
    for (row = 0; row < h; row++) {
        unsigned dy = y + row;
        if (dy >= gg_fb_h || x >= gg_fb_w)
            continue;
        {
            unsigned cw = w;
            if (x + cw > gg_fb_w)
                cw = gg_fb_w - x;
            memcpy(gg_fb + ((size_t)dy * gg_fb_w + x) * (bpp / 8),
                   data + (size_t)row * w * (bpp / 8),
                   (size_t)cw * (bpp / 8));
        }
    }
    gg_disp_rects++;
    return 0;
}

const unsigned char *gg_display_fb(void)
{
    return gg_fb;
}

unsigned gg_display_w(void)
{
    return gg_fb_w;
}

unsigned gg_display_h(void)
{
    return gg_fb_h;
}

unsigned gg_display_bpp(void)
{
    return gg_fb_bpp;
}

void gg_display_fini(void)
{
    if (gg_disp_rects)
        fprintf(stderr, "display: %llu rectangles\n", gg_disp_rects);
    free(gg_fb);
    gg_fb = NULL;
    gg_fb_w = 0;
    gg_fb_h = 0;
    gg_fb_bpp = 0;
}
