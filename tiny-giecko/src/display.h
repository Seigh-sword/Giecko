#ifndef GG_DISPLAY_H
#define GG_DISPLAY_H

#include <stddef.h>

int gg_display_init(unsigned w, unsigned h, unsigned bpp);
int gg_display_rect(unsigned x, unsigned y, unsigned w, unsigned h, const unsigned char *data, unsigned bpp);
const unsigned char *gg_display_fb(void);
unsigned gg_display_w(void);
unsigned gg_display_h(void);
unsigned gg_display_bpp(void);
void gg_display_fini(void);

#endif
