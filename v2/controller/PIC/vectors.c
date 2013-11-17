//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 4/06/07					      						  #
//;#			vectors											  			  #
//;#			File Name: vectors.c   										  #
//;#																		  #
//;############################################################################


#include "c_system.h"

void main(void);

#pragma code RealInitVector = 0x00
void
RealInitVector (void)
{
  _asm
	goto 0x0A00 //jump to interrupt routine
  _endasm
}

#pragma code RealInterruptVectorHigh = 0x08
void
RealInterruptVectorHigh (void)
{
  _asm
	goto InterruptHandlerHigh //jump to interrupt routine
  _endasm
}

