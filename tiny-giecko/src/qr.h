#ifndef GG_QR_H
#define GG_QR_H

#include <stddef.h>

#define GG_QR_MAX_SIZE 57
#define GG_QR_MAX_TEXT 213

int gg_qr_generate(const char *text, int len, unsigned char *modules, int *size, int version, int mask);
int gg_qr_render(const unsigned char *modules, int size, int quiet, char *out, size_t outsz);

#endif
