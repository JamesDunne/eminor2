#include <stdio.h>
#include <stdarg.h>
#include <string.h>

#include "types.h"
#include "hardware.h"

// --------------- Flash memory functions:

#if HW_VERSION == 4
u8 flash_bank[3][4096] = {
    {
#include "../PIC/flash_v4_bank0.h"
    },
    {
#include "../PIC/flash_v4_bank1.h"
    },
    {
#include "../PIC/flash_v4_bank2.h"
    }
};
#endif

// Flash addresses are 0-based where 0 is the first available byte of
// non-program flash memory.

// Load `count` bytes from flash memory at address `addr` into `data`:
void flash_load(u16 addr, u16 count, u8 *data) {
    int bank = addr >> 12;
    int offs = addr & 0x0FFF;
    
    memcpy((void *)data, (const void *)&flash_bank[bank][offs], (size_t)count);
}

// Stores `count` bytes from `data` into flash memory at address `addr`:
void flash_store(u16 addr, u16 count, u8 *data) {
}

// Get a pointer to flash memory at address:
rom const u8 *flash_addr(u16 addr) {
    int bank = addr >> 12;
    int offs = addr & 0x0FFF;
    
    return (u8 *)flash_bank[bank] + offs;
}
