#ifndef GG_TUI_H
#define GG_TUI_H

#include <stddef.h>

int gg_tui_init(void);
void gg_tui_fini(void);
void gg_tui_size(int *cols, int *rows);
int gg_tui_poll(int *key_or_pointer);
unsigned int gg_tui_keysym(void);
unsigned int gg_tui_buttons(void);
unsigned int gg_tui_pointer_x(void);
unsigned int gg_tui_pointer_y(void);
int gg_tui_pointer_wheel(void);
void gg_tui_draw(const unsigned char *fb, unsigned fw, unsigned fh, unsigned bpp);
void gg_tui_status(const char *text);

#endif
