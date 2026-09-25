#ifndef GG_DES_H
#define GG_DES_H

#include <stddef.h>

void gg_des_keysched(unsigned long long key, unsigned long long sub[16]);
unsigned long long gg_des_block(unsigned long long block, const unsigned long long sub[16]);
void gg_des_ecb_encrypt(const unsigned char *in, unsigned char *out, size_t n, unsigned long long key);
void gg_vnc_key(const char *pw, unsigned char out[8]);

#endif
