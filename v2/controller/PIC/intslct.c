//#######################################################################
/**
* @file intslct.c
* interrupt handler
*
* @author Joe Dunne
* @date 2/02/05
* @brief RS232/USB communication routine
*/
//			*See Updates section at bottom of file*
//#######################################################################

#include "c_system.h"

#pragma code InterruptVectorHigh = 0xA08
void
InterruptVectorHigh (void)
{
  _asm
	goto InterruptHandlerHigh //jump to interrupt routine
  _endasm
}


//----------------------------------------------------------------------------
// High priority interrupt routine

#pragma code

#pragma interrupt InterruptHandlerHigh
void	InterruptHandlerHigh ()
{
/*
	if (INTCONbits.TMR0IF)
	{                                   //check for TMR0 overflow
		INTCONbits.TMR0IF = 0;            //clear interrupt flag
		Systick = true;
	}
*/
	if (PIR1bits.TMR2IF){
		PIR1bits.TMR2IF = 0;            //clear interrupt flag

//Every 250uS routine:
		SystickCntr++;
		if (SystickCntr == SYSTEM_TIME_1MS) {
			SystickCntr = 0;
//Every 1mS routine:
			Systick = true;
			Process7Segs();
		}
	}
}
#pragma code
//----------------------------------------------------------------------------
