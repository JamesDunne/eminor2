//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 4/06/07					      						  #
//;#			EEProm access functions							  			  #
//;#			File Name: eeprom.c   										  #
//;#																		  #
//;############################################################################

#include "c_system.h"

unsigned char EERead(unsigned char addr) {
	EEADR=(unsigned char)addr;	// Address to read
	EECON1bits.EEPGD=0;			// Point to Data Memory
	EECON1bits.CFGS=0;			// Access EEPROM
	EECON1bits.RD=1;			// EE Read
	return EEDATA;				// W = EEDATA
}

//blocking write that takes approximately 4mS ?? 
void EEWrite(unsigned char addr,unsigned char data) {
	EEADR = (unsigned char)addr;
	EEDATA=data;
	
	EECON1bits.EEPGD=0;			// Point to Data Memory
	EECON1bits.CFGS=0;			// Access EEPROM
	EECON1bits.WREN=1;
 
	INTCONbits.GIE = 0;			// Disable global interrupts
	EECON2=0x55;				// Required
	EECON2=0xAA;				// Required
	EECON1bits.WR=1;			// Enable writes
	do {
		ClrWdt();
	} while(EECON1bits.WR);		// block until write complete
 
	INTCONbits.GIE = 1;			// Enable global interrupts
	EECON1bits.WREN=0;			// Disable writes
}