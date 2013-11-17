//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 4/06/07					      						  #
//;#			EXPPedal							  			  			  #
//;#			File Name: eeprom.c   										  #
//;#																		  #
//;############################################################################

#include "c_system.h"

void ExpPedalRead(void) {
	unsigned char TempADC;
	ExpPedalSvc = false;
	TempADC = EXPP_PEDAL_LINEAR_CONV_TABLE[ADC_CONVERSION(EXP_PEDAL_CHANNEL)];
	
	//Don't update the pedal data if the pedal is disconnected
	if (TempADC != 0xFF) ExpPedalInst = TempADC;
	
}