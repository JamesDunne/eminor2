//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 10/07/04					      						  #
//;#			MASTER SWITCH GENERATION 1.x								  #
//;#			System header File											  #
//;#			File Name: c_system.h										  #
//;#																		  #
//;############################################################################
#include "_tools.h"
#include "p18f4455.h"
#include "c_cnstdef.h"
#include "c_ramdef.h"
#include "c_portdef.h"

//-----------------------------------------------------------------------------
//macros:
#define	ENABLE_ALL_INTERRUPTS()		\
	INTCONbits.GIEH = true;			\
	INTCONbits.GIEL = true;

#define	DISABLE_ALL_INTERRUPTS()	\
	INTCONbits.GIEH = false;		\
	INTCONbits.GIEL = false;

//-----------------------------------------------------------------------------
//generic function prototypes:
void	CLEAR_RAM(void);		//asm function.
void	TXENQ(unsigned char Input);
void	RESET_MIDI_TX_BUFFER(void);
void	HandleDigit(unsigned char ComPointer);
void	AllDigitsOff(void);
unsigned char AsciiTo7Seg(unsigned char chr);
void	SendDataToShiftReg(unsigned char dataToSend);
void	SetDipAddress(unsigned char Address);
unsigned char	ADC_CONVERSION(unsigned char Channel);
void	SetDispAscii(unsigned char chars[]);void	MIDI_ENQUEUE(unsigned char Input);
void	EraseProgMem(void);
void	WriteProgMem(unsigned char index);
void	read_rom_to_pmbuffer(unsigned short Address);
unsigned char	ProcessGenericTransferRead(void);
unsigned char	ProcessGenericTransferWrite(void);

//routine prototypes:
void	ExpPedalRead(void);
void	SystemTimeRoutine(void);
void	Process7Segs(void);
void	UpdateLeds(void);
void	MIDI_COMM_ROUTINE(void);
void	ReadButtons(void);
void	init(void);
void	RS232_ROUTINE(void);
void	PROCESS_COMM_REQUEST(void);
void	InterruptHandlerHigh ();
void	Scroll7SegDisp(void);

extern rom unsigned char NumbersSegTable[10];
extern rom unsigned char LettersSegTable[26];
extern rom unsigned char ROM_SAVEDATA[WRITABLE_SEG_LEN];
extern rom unsigned char EXPP_PEDAL_LINEAR_CONV_TABLE[256];
//-----------------------------------------------------------------------------
//Update history:
