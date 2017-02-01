#include <stdio.h>
#include <stdarg.h>
#include <string.h>

#include "types.h"
#include "hardware.h"

#ifdef FEAT_LCD

char lcd_ascii[LCD_ROWS][LCD_COLS];

// Get pointer to a specific LCD row:
// A terminating NUL character will clear the rest of the row with empty space.
char *lcd_row_get(u8 row) {
    return lcd_ascii[row];
}

// Update all LCD display rows as updated:
void lcd_updated_all(void) {
    // TODO: Use SPI bus to communicate with LCD.
}

#endif
