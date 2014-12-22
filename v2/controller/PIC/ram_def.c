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
#pragma romdata ROMSAVEDATA=WRITABLE_SEG_ADDR       //Update lkr file if this is to change!!
rom unsigned char ROM_SAVEDATA[WRITABLE_SEG_LEN] = {
#include "flash_rom_init.h"
};

unsigned char LCDRamMap[4][20];

