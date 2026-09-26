#ifndef GG_KEYSYM_H
#define GG_KEYSYM_H

unsigned int gg_keysym_translate(const unsigned char *buf, int len, int *consumed);
int gg_input_quit(unsigned int keysym);

#endif
