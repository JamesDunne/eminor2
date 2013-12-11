//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 10/07/04					      						  #
//;#			MASTER SWITCH GENERATION 1.x								  #
//;#			System header File											  #
//;#			File Name: c_system.h										  #
//;#																		  #
//;############################################################################
#include "_tools.h"
#include "p18f4550.h"
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
void	RESET_MIDI_TX_BUFFER(void);
void	SendDataToShiftReg8(unsigned char data1);
void	SendDataToShiftReg16(unsigned char data1, unsigned char data2);
void	SetDipAddress(unsigned char Address);
void	MIDI_ENQUEUE(unsigned char Input);
void	EraseProgMem(void);
void	WriteProgMem(unsigned char index);

//routine prototypes:
void	SystemTimeRoutine(void);
void	UpdateLeds(void);
void	MIDI_COMM_ROUTINE(void);
void	ReadButtons(void);
void	init(void);
void	PROCESS_COMM_REQUEST(void);
void	InterruptHandlerHigh ();

extern rom unsigned char ROM_SAVEDATA[WRITABLE_SEG_LEN];
//-----------------------------------------------------------------------------
