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

unsigned char LCDTxBuffer[MAX_LCD_TX_LENGTH];
unsigned char LCDTxBufPtr;
unsigned char LCDTxBufOutPtr;

// User-writable flash memory:
#pragma romdata ROMSAVEDATA=WRITABLE_SEG_ADDR       //Update lkr file if this is to change!!
rom unsigned char ROM_SAVEDATA[WRITABLE_SEG_LEN];
