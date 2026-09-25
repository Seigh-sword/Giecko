#ifndef GG_DISPLAY_H
#define GG_DISPLAY_H

#include <stddef.h>

void gg_display_init(int mode);
int gg_display_rect(unsigned x, unsigned y, unsigned w, unsigned h, const unsigned char *data, unsigned bpp);
void gg_display_fini(void);
void gg_display_note_rect(unsigned x, unsigned y, unsigned w, unsigned h);

#endif
