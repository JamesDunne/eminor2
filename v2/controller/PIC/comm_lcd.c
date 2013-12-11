//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 5/28/07					      						  #
//;#			Midi Comm routine								  			  #
//;#			File Name: midicomm.c  										  #
//;#																		  #
//;############################################################################

#include "c_system.h"

// TODO: bit-banged RS232 impl on RD7 pin using interrupts.

void lcd_enq(unsigned char v) {
	if (LCDTxBufPtr >= MAX_LCD_TX_LENGTH) return;
	LCDTxBuffer[LCDTxBufPtr] = v;
	LCDTxBufPtr++;
}

void lcd_clear_buffer(void) {
	LCDTxBufPtr = 0;
	LCDTxBufOutPtr = 0;
}
