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
void	SendDataToShiftReg16(unsigned char data1, unsigned char data2);
void	SetDipAddress(unsigned char Address);
void	EraseProgMem(void);
void	WriteProgMem(unsigned char index);

//routine prototypes:
void	InterruptHandlerHigh();
void	SystemTimeRoutine(void);
void	init(void);

void	UpdateLeds(void);
void	ReadButtons(void);

void	midi_clear_buffer(void);
void	midi_enq(unsigned char Input);
void	midi_tx(void);

void	lcd_clear_buffer(void);
void	lcd_enq(unsigned char Input);
//void	lcd_tx(void);

extern rom unsigned char ROM_SAVEDATA[WRITABLE_SEG_LEN];
//-----------------------------------------------------------------------------
