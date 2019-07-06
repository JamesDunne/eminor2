
#include "types.h"

extern char h1toa(u8 n);
extern void hextoa(near char *dst, u8 col, u8 n);

extern s8 ritoa(near char *dst, s8 col, u8 n);

// BCD is 2.1 format with MSB indicating sign (5 chars total) i.e. "-99.9" or " -inf"
extern void bcdtoa(near char *dst, u8 col, u16 bcd);

// For DEBUG_LOG usage:
#ifndef __18CXX
extern char bcd_tmp[6];
char *bcd(u16 n);
#endif

// Copies a fixed-length string optionally NUL-terminated to the LCD display row:
extern void copy_str_lcd(near char *dst, rom near const u8 *src);

extern rom near const char v5_fx_names[58][4];
extern rom near const char *fx_name(u8 fx_midi_cc);
