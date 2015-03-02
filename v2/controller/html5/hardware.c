#include "../common/types.h"
#include "../common/hardware.h"

#define FLASH_LENGTH (sizeof(struct program) * 128 + sizeof(struct set_list) * 32)
const int flash_length = FLASH_LENGTH;
const unsigned char flash_memory[FLASH_LENGTH] = {
#include "../PIC/flash_rom_init.h"
};
#undef FLASH_LENGTH

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
