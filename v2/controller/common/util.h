
#include "types.h"

extern char h1toa(u8 n);
extern void hextoa(char *dst, u8 col, u8 n);

extern s8 ritoa(char *dst, s8 col, u8 n);

// BCD is 2.1 format with MSB indicating sign (5 chars total) i.e. "-99.9" or " -inf"
extern void bcdtoa(char *dst, u8 col, u16 bcd);

// For DEBUG_LOG usage:
#ifndef __MCC18
extern char bcd_tmp[6];
char *bcd(u16 n);
#endif

// Copies a fixed-length string optionally NUL-terminated to the LCD display row:
extern void copy_str_lcd(const char *src, char *dst);

extern rom const char v5_fx_names[58][4];
extern rom const char *fx_name(u8 fx_midi_cc);
