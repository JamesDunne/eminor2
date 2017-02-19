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
	int j, i;

	// TODO: Use SPI bus to communicate with LCD.

	printf("\n/----------------------\\\n");
	for (j = 0; j < LCD_ROWS; j++) {
		printf("| ");
		for (i = 0; i < LCD_COLS; i++) {
			char c = lcd_ascii[j][i];
			if (c < 32) c = 32;
			printf("%c", c);
		}
		printf(" |\n");
	}
	printf("\\----------------------/\n");
}

#endif
