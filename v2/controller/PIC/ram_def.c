//This file contains the global ram definitions for the project
#include    "c_system.h"

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
#pragma romdata ROMSAVEDATA=WRITABLE_SEG_ADDR       //Update lkr file if this is to change!!
#if HW_VERSION == 1
rom unsigned char ROM_SAVEDATA[3][4096] = {
    {
#include "flash_v1_bank0.h"
    },
    {
#include "flash_v1_bank1.h"
    },
    {
        0
    }
};
#elif HW_VERSION == 2
rom unsigned char ROM_SAVEDATA[3][4096] = {
    {
#include "flash_v2_bank0.h"
    },
    {
#include "flash_v2_bank1.h"
    },
    {
#include "flash_v2_bank2.h"
    }
};
#elif HW_VERSION == 3
rom unsigned char ROM_SAVEDATA[3][4096] = {
    {
#include "flash_v3_bank0.h"
    },
    {
#include "flash_v3_bank1.h"
    },
    {
#include "flash_v3_bank2.h"
    }
};
#elif HW_VERSION == 4
rom unsigned char ROM_SAVEDATA[3][4096] = {
    {
#include "flash_v4_bank0.h"
    },
    {
#include "flash_v4_bank1.h"
    },
    {
#include "flash_v4_bank2.h"
    }
};
#else
#error HW_ VERSION must be "1", "2", "3", or "4"
#endif
