//This file contains the global ram definitions for the project
#include    "c_system.h"

//----------------------------Access bank variables----------------------------------------

//#pragma udata access accessram
near BitField CommFlags1 @0;
near BitField ArbFlags1  @1;
near BitField ArbFlags2  @2;
near BitField MiscFlags1 @3;

//----------------------------Main variables----------------------------------------
//#pragma udata gpr1
TwoBytes ProgMemAddr @ 0x100;
unsigned char ProgmemBuffer[64];

TwoBytes NVRCommAddr;
TwoBytes RAMCommAddr;
TwoBytes ROMCommAddr;

unsigned char LedStatesTop;
unsigned char LedStatesBot;
unsigned char ButtonStateTop;
unsigned char ButtonStateBot;
unsigned char SystickCntr;
unsigned char SystickCntr2;
unsigned char SystickCntr3;
unsigned char SystickCntr4;
unsigned char SystickCntr5;

unsigned char MIDITxBuffer[MAX_MIDI_TX_LENGTH];
unsigned char MIDITxBufPtr;
unsigned char MIDITxBufOutPtr;

unsigned char swuart_tx_buffer[MAX_LCD_TX_LENGTH];
unsigned char swuart_tx_bufptr;
unsigned char swuart_tx_bufoutptr;

unsigned char swuart_txbyte;
unsigned char swuart_txmask;
unsigned char swuart_mode;
unsigned char swuart_started;

TwoBytes tTimer1Value;

unsigned char LCDUpdateStage;

// User-writable flash memory:
//#pragma romdata ROMSAVEDATA=WRITABLE_SEG_ADDR       //Update lkr file if this is to change!!
#if HW_VERSION == 1
const unsigned char ROM_SAVEDATA[3][4096] @ WRITABLE_SEG_ADDR = {
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
const unsigned char ROM_SAVEDATA[3][4096] @ WRITABLE_SEG_ADDR = {
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

char LCDRamMap[4][20];
