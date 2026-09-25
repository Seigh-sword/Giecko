#include "display.h"

#include <stdio.h>

#ifdef __linux__
#include <fcntl.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <unistd.h>
#include <linux/fb.h>
#endif

static int gg_disp_mode = 0;
static unsigned long long gg_disp_rects = 0;

#ifdef __linux__
static int gg_fb_fd = -1;
static unsigned char *gg_fb_mem = NULL;
static size_t gg_fb_len = 0;
static unsigned gg_fb_w = 0;
static unsigned gg_fb_h = 0;
static unsigned gg_fb_bpp = 0;
static unsigned gg_fb_stride = 0;
#endif

void gg_display_init(int mode)
{
    gg_disp_mode = mode;
#ifdef __linux__
    if (mode == 1) {
        struct fb_var_screeninfo vinfo;
        struct fb_fix_screeninfo finfo;
        gg_fb_fd = open("/dev/fb0", O_RDWR);
        if (gg_fb_fd < 0) {
            fprintf(stderr, "fbdev: cannot open /dev/fb0, falling back to headless\n");
            gg_disp_mode = 0;
            return;
        }
        if (ioctl(gg_fb_fd, FBIOGET_VSCREENINFO, &vinfo) < 0 || ioctl(gg_fb_fd, FBIOGET_FSCREENINFO, &finfo) < 0) {
            fprintf(stderr, "fbdev: cannot query /dev/fb0, falling back to headless\n");
            close(gg_fb_fd);
            gg_fb_fd = -1;
            gg_disp_mode = 0;
            return;
        }
        gg_fb_w = vinfo.xres;
        gg_fb_h = vinfo.yres;
        gg_fb_bpp = vinfo.bits_per_pixel;
        gg_fb_stride = finfo.line_length;
        gg_fb_len = (size_t)finfo.smem_len;
        gg_fb_mem = (unsigned char *)mmap(NULL, gg_fb_len, PROT_READ | PROT_WRITE, MAP_SHARED, gg_fb_fd, 0);
        if (gg_fb_mem == MAP_FAILED) {
            fprintf(stderr, "fbdev: mmap failed, falling back to headless\n");
            gg_fb_mem = NULL;
            close(gg_fb_fd);
            gg_fb_fd = -1;
            gg_disp_mode = 0;
        }
    }
#endif
}

int gg_display_rect(unsigned x, unsigned y, unsigned w, unsigned h, const unsigned char *data, unsigned bpp)
{
#ifdef __linux__
    if (gg_disp_mode == 1 && gg_fb_mem && gg_fb_bpp == 32 && bpp == 32) {
        unsigned row;
        for (row = 0; row < h; row++) {
            unsigned dy = y + row;
            if (dy >= gg_fb_h || x >= gg_fb_w)
                continue;
            {
                unsigned cw = w;
                if (x + cw > gg_fb_w)
                    cw = gg_fb_w - x;
                memcpy(gg_fb_mem + (size_t)dy * gg_fb_stride + (size_t)x * 4, data + (size_t)row * w * 4, (size_t)cw * 4);
            }
        }
    }
#else
    (void)x;
    (void)y;
    (void)w;
    (void)h;
    (void)data;
    (void)bpp;
#endif
    return 0;
}

void gg_display_note_rect(unsigned x, unsigned y, unsigned w, unsigned h)
{
    (void)x;
    (void)y;
    (void)w;
    (void)h;
    gg_disp_rects++;
}

void gg_display_fini(void)
{
#ifdef __linux__
    if (gg_fb_mem) {
        munmap(gg_fb_mem, gg_fb_len);
        gg_fb_mem = NULL;
    }
    if (gg_fb_fd >= 0) {
        close(gg_fb_fd);
        gg_fb_fd = -1;
    }
#endif
    if (gg_disp_rects)
        fprintf(stderr, "display: %llu rectangles\n", gg_disp_rects);
}
