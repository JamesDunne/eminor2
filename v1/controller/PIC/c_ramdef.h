//This header file contains the global ram definitions for the project


//----------------------------Access bank variables----------------------------------------

near extern BitField CommFlags1;
#define	ProcessCommRequest		CommFlags1.bit0
#define	TildeFlg				CommFlags1.bit1
#define	SendingOutString		CommFlags1.bit2
#define	StringInEEPROM			CommFlags1.bit3
#define	USBQuery				CommFlags1.bit4
#define	ServiceEP1Data			CommFlags1.bit5
#define	ProdTestCmdsAllowed		CommFlags1.bit6
#define	StringInRAM				CommFlags1.bit7

near extern BitField ArbFlags1;
#define Systick				ArbFlags1.bit0
//#define	ExpPedalSvc			ArbFlags1.bit1
#define	ButtonsSvc			ArbFlags1.bit2
#define	Write0Pending		ArbFlags1.bit3
#define	Write32Pending		ArbFlags1.bit4
#define	HandleLeds			ArbFlags1.bit5
#define	Handle7segs			ArbFlags1.bit6
#define	HandleController	ArbFlags1.bit7

near extern BitField ArbFlags2;
#define	CheckButtons		ArbFlags2.bit0
#define	ControllerTiming	ArbFlags2.bit1

near extern BitField MiscFlags1;
#define	ModeSwitchState		MiscFlags1.bit0
#define	Scroll7Segs			MiscFlags1.bit1


//----------------------------Main variables----------------------------------------

extern BitField DispSegData[5];		//0 = a, 1 = b, etc.. 
extern TwoBytes	ProgMemAddr;
extern unsigned char ProgmemBuffer[64];

extern TwoBytes NVRCommAddr;
extern TwoBytes RAMCommAddr;
extern TwoBytes ROMCommAddr;

extern unsigned char DispNumOfCommons;
extern unsigned char LedStates;			//footswitch leds
extern unsigned char ButtonState;
extern unsigned char ExpPedalInst;
extern unsigned char SystickCntr;
extern unsigned char SystickCntr2;
extern unsigned char SystickCntr3;
extern unsigned char SystickCntr4;
extern unsigned char SystickCntr5;

extern unsigned char ComPointer;

//extern unsigned char ScrollingDisplayData[64];
//extern unsigned char ScrollingDisplayLength;
//extern unsigned char ScrollingDisplayIndex;

extern TwoBytes ExpPedalAvg;

extern unsigned char TxBuffer[MAX_TX_LENGTH];
extern unsigned char TxBufPtr;
extern unsigned char TxBufOutPtr;

//---------------------USB stuff---------------------------------
extern unsigned char USBDataPointer;
extern unsigned char USBEP0DataInBuffer[64];
extern unsigned char ResponseType;

//extern unsigned char midiInData[23];
//extern unsigned char midiInBufPtr;
