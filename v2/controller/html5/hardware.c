#include <string.h>
#include <stdio.h>
#include <stdarg.h>

#include "../common/types.h"
#include "../common/hardware.h"
#include "../common/flash.h"

const int flash_length = WRITABLE_SEG_LEN;
#if HW_VERSION==6
const unsigned char flash_memory[(WRITABLE_SEG_LEN)/128][128] = {
#include "../PIC/flash_v6.h"
};
#endif

const unsigned short lookup[128] = {
#include "../PIC/v4_lookup.h"
};

// Load `count` bytes from flash memory at address `addr` into `data`:
void flash_load(u16 addr, u16 count, u8 *data)
{
	memcpy((void *)data, (void *)&((const u8 *)flash_memory)[addr], count);
}

// Stores `count` bytes from `data` into flash memory at address `addr`:
void flash_store(u16 addr, u16 count, u8 *data)
{
	memcpy((void *)&((const u8 *)flash_memory)[addr], (void *)data, count);
}

rom const u8 *flash_addr(u16 addr) {
	return &((const u8 *)flash_memory)[addr];
}

// Get a pointer to a lookup table:
rom const u16 *get_dB_bcd_lookup() {
	return lookup;
}

extern void midi_log_cwrap(const char *text);

void debug_log(const char *fmt, ...) {
    char target[128];
    va_list ap;

    va_start(ap, fmt);
    vsprintf(target, fmt, ap);
    va_end(ap);

    // Send it to MIDI log:
    midi_log_cwrap(target);
}
