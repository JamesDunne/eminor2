#include <string.h>
#include <stdio.h>
#include <stdarg.h>

#include "../common/types.h"
#include "../common/hardware.h"

#define FLASH_LENGTH (64 * 128 + 64 * 32)
const int flash_length = FLASH_LENGTH;
const unsigned char flash_memory[FLASH_LENGTH] = {
#include "../PIC/flash_v4_bank0.h"
,
#include "../PIC/flash_v4_bank1.h"
,
#include "../PIC/flash_v4_bank2.h"
};
#undef FLASH_LENGTH

const unsigned char lookup[128] = {
#include "../PIC/v4_lookup.h"
};

// Load `count` bytes from flash memory at address `addr` into `data`:
void flash_load(u16 addr, u16 count, u8 *data)
{
	memcpy((void *)data, (void *)&flash_memory[addr], count);
}

// Stores `count` bytes from `data` into flash memory at address `addr`:
void flash_store(u16 addr, u16 count, u8 *data)
{
	memcpy((void *)&flash_memory[addr], (void *)data, count);
}

rom const u8 *flash_addr(u16 addr) {
	return &flash_memory[addr];
}

// Get a pointer to a lookup table:
rom const u8 *lookup_table(u8 table) {
	return lookup;
}

void debug_log(const char *fmt, ...) {
    va_list ap;
    printf("DEBUG: ");
    va_start(ap, fmt);
    vprintf(fmt, ap);
    va_end(ap);
    printf("\n");
}