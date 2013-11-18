//This file contains the global ram definitions for the project
#include	"c_system.h"

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

unsigned char DispNumOfCommons;
unsigned char LedStatesTop;
unsigned char LedStatesBot;
unsigned char ButtonStateTop;
unsigned char ButtonStateBot;
unsigned char SystickCntr;
unsigned char SystickCntr2;
unsigned char SystickCntr3;
unsigned char SystickCntr4;
unsigned char SystickCntr5;

unsigned char ComPointer;

unsigned char TxBuffer[MAX_TX_LENGTH];
unsigned char TxBufPtr;
unsigned char TxBufOutPtr;

//----------------------------USB stuff----------------------------------
unsigned char USBDataPointer;
unsigned char USBEP0DataInBuffer[64];
unsigned char ResponseType;

unsigned char midiInData[23];
unsigned char midiInBufPtr;
