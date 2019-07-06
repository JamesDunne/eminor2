#include "util.h"
#include "hardware.h"

//rom const char hex[16] = { '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F' };

char h1toa(u8 n) {
    u8 x = n & 0x0F;
    if (x < 10) {
        return '0' + x;
    }
    return 'a' + (x - 10);
}

void hextoa(near char *dst, u8 col, u8 n) {
    u8 x = n & 0x0F;
    dst += col;
    *dst-- = h1toa(n & 0x0F);
    *dst = h1toa((n >> 4) & 0x0F);
}

// TODO: remove division operator to cut code size down drastically!
#if 1
s8 ritoa(near char *dst, s8 col, u8 n) {
    do {
        dst[col--] = (n % (char)10) + (char)'0';
    } while ((n /= (u8)10) > (u8)0);
    return col;
}
#else
s8 ritoa(near char *dst, s8 col, u8 n) {
    u8 ax, bx, cx, dx;
    u8 pow10[] = {0x64, 0x0A, 0x00};
    u8 digits[3] = { 0, 0, 0 };
    near u8 *dig = digits;

    ax = n;
    bx = 0;
    while (cx = pow10[bx]) {
        dx = 0;
        while (ax > cx) {
            ax -= cx;
            dx++;
        }
        dx += '0';
        *dig++ = dx;
        bx++;
    }
    ax += '0';
    *dig = ax;

    // right-align values:
    while (dig > digits) {
        dst[col--] = *dig--;
    }
}
#endif

// BCD is 2.1 format with MSB indicating sign (5 chars total) i.e. "-99.9" or " -inf"
void bcdtoa(near char *dst, u8 col, u16 bcd) {
    u8 sign = (u8)((bcd & 0x8000) != 0);
    u8 pos = (bcd > 0x0000) && (bcd < 0x8000);
    dst += col;
    if ((bcd & 0x7FFF) == 0x7FFF) {
        *dst-- = 'f';
        *dst-- = 'n';
        *dst-- = 'i';
    } else {
        *dst-- = (char) '0' + (char)(bcd & 0x0F);
        *dst-- = '.';
        bcd >>= 4;
        *dst-- = (char) '0' + (char)(bcd & 0x0F);
        bcd >>= 4;
        if ((bcd & 0x0F) > 0) {
            *dst-- = (char) '0' + (char)(bcd & 0x0F);
        }
    }
    if (sign) {
        *dst = '-';
    } else if (pos) {
        *dst = '+';
    }
}

// For DEBUG_LOG usage:
#ifndef __18CXX
char bcd_tmp[6];
char *bcd(u16 n) {
    bcd_tmp[5] = 0;
    bcd_tmp[4] = ' ';
    bcd_tmp[3] = ' ';
    bcd_tmp[2] = ' ';
    bcd_tmp[1] = ' ';
    bcd_tmp[0] = ' ';
    bcdtoa(bcd_tmp, 4, n);
    return bcd_tmp;
}
#endif

// Copies a fixed-length string optionally NUL-terminated to the LCD display row:
void copy_str_lcd(near char *dst, rom near const u8 *src) {
    u8 i;
    for (i = 0; src[i] != 0 && i < LCD_COLS; ++i) {
        dst[i] = src[i];
    }
    for (; i < LCD_COLS; i++) {
        dst[i] = ' ';
    }
}

// Comment-out unused functions so they don't take up code space on PIC.
#if 0
s8 litoa(char *dst, s8 col, u8 n) {
    // Write the integer to temporary storage:
    char tmp[3];
    s8 c = 0;
    do {
        tmp[c++] = (n % (char)10) + (char)'0';
    } while ((n /= (u8)10) > (u8)0);
    // Write the left-aligned integer to the destination:
    for (c--; c >= 0; c--, col++) {
        dst[col] = tmp[c];
    }
    return col;
}

void print_half(char *dst, u8 col, s8 volhalfdb) {
    s8 i;
    if (volhalfdb < 0) {
        i = ritoa(dst, col, (u8)(-volhalfdb) >> 1);
        dst[i] = '-';
    } else {
        ritoa(dst, col, (u8)volhalfdb >> 1);
    }
    dst[col + 1] = '.';
    if (((u8)volhalfdb & 1) != 0) {
        dst[col + 2] = '5';
    } else {
        dst[col + 2] = '0';
    }
}
#endif

rom near const char *fx_name(u8 fx_midi_cc) {
    if (fx_midi_cc < 41) {
        return "    ";
    } else if (fx_midi_cc > 98) {
        return "    ";
    }
    return v5_fx_names[fx_midi_cc - 41];
}
