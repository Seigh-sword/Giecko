#ifndef GG_SHA1_H
#define GG_SHA1_H

#include <stddef.h>

void gg_sha1(const unsigned char *data, size_t len, unsigned char out[20]);

#endif
