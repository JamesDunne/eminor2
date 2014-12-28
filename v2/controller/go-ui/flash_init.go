package main

/*
#define FLASH_LENGTH (32 * 128 + 32 * 32)
const int flash_length = FLASH_LENGTH;
const unsigned char flash_memory[FLASH_LENGTH] = {
#include "../PIC/flash_rom_init.h"
};
#undef FLASH_LENGTH
*/
import "C"

var flash_memory = C.flash_memory
