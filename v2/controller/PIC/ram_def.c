//This file contains the global ram definitions for the project
#include    "c_system.h"
#include    "util.h"
#include    "flash.h"

//----------------------------Access bank variables----------------------------------------

#pragma udata access accessram
near BitField CommFlags1;
near BitField ArbFlags1;
near BitField ArbFlags2;
near BitField MiscFlags1;

//----------------------------Main variables----------------------------------------
#pragma udata gpr1
TwoBytes ProgMemAddr;
unsigned char ProgmemBuffer[64];

unsigned char LedStatesTop;
unsigned char LedStatesBot;
unsigned char ButtonStateTop;
unsigned char ButtonStateBot;
unsigned char SystickCntr;
unsigned char SystickCntr2;
unsigned char SystickCntr3;

TwoBytes tTimer1Value;

// User-writable flash memory:
#pragma romdata ROM_SAVEDATA=WRITABLE_SEG_ADDR
#if HW_VERSION == 6
rom unsigned char ROM_SAVEDATA[(WRITABLE_SEG_LEN)/128][128] = {
#include "flash_v6.h"
};
#else
#error HW_ VERSION must be set
#endif
