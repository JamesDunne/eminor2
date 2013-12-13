//This header file contains the global ram definitions for the project


//----------------------------Access bank variables----------------------------------------

near extern BitField CommFlags1;
#define ProcessCommRequest      CommFlags1.bit0
#define TildeFlg                CommFlags1.bit1
#define SendingOutString        CommFlags1.bit2
#define StringInEEPROM          CommFlags1.bit3
#define USBQuery                CommFlags1.bit4
#define ServiceEP1Data          CommFlags1.bit5
#define ProdTestCmdsAllowed     CommFlags1.bit6
#define StringInRAM             CommFlags1.bit7

near extern BitField ArbFlags1;
#define Systick             ArbFlags1.bit0
#define Unused1Svc          ArbFlags1.bit1
#define ButtonsSvc          ArbFlags1.bit2
#define Write0Pending       ArbFlags1.bit3
#define Write32Pending      ArbFlags1.bit4
#define HandleLeds          ArbFlags1.bit5
#define HandleLCD           ArbFlags1.bit6
#define HandleController    ArbFlags1.bit7

near extern BitField ArbFlags2;
#define CheckButtons        ArbFlags2.bit0
#define ControllerTiming    ArbFlags2.bit1

//----------------------------Main variables----------------------------------------

extern TwoBytes ProgMemAddr;
extern unsigned char ProgmemBuffer[64];

extern TwoBytes NVRCommAddr;
extern TwoBytes RAMCommAddr;
extern TwoBytes ROMCommAddr;

extern unsigned char LedStatesTop;
extern unsigned char LedStatesBot;
extern unsigned char ButtonStateTop;
extern unsigned char ButtonStateBot;
extern unsigned char SystickCntr;
extern unsigned char SystickCntr2;
extern unsigned char SystickCntr3;
extern unsigned char SystickCntr4;
extern unsigned char SystickCntr5;

extern unsigned char MIDITxBuffer[MAX_MIDI_TX_LENGTH];
extern unsigned char MIDITxBufPtr;
extern unsigned char MIDITxBufOutPtr;

extern unsigned char swuart_tx_buffer[MAX_LCD_TX_LENGTH];
extern unsigned char swuart_tx_bufptr;
extern unsigned char swuart_tx_bufoutptr;

extern unsigned char swuart_txbyte;
extern unsigned char swuart_txmask;
extern unsigned char swuart_mode;

extern TwoBytes tTimer1Value;
