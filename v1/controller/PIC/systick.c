//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 6/01/07					      						  #
//;#			System time routine								  			  #
//;#			File Name: systick.c   										  #
//;#																		  #
//;############################################################################


#include "c_system.h"
#include "typedefs.h"
#include "hardware.h"

//1mS time keeping routine:
void	SystemTimeRoutine(void) {

//1mS routines:
//	Handle7segs = true;

	SystickCntr2++;
	if (SystickCntr2 == SYSTEM_TIME_10MS) {
		SystickCntr2 = 0;

//10mS routines:
		ExpPedalSvc = true;
		HandleController = true;
		HandleLeds = true;
		ControllerTiming = true;

		SystickCntr4++;
		if (SystickCntr4 == SYSTEM_TIME_40MS) {
			SystickCntr4 = 0;
//40mS routines:
			CheckButtons = true;
		}		

		SystickCntr5++;
		if (SystickCntr5 == 2) {
			SystickCntr5 = 0;
//20mS routines:
		}		

		SystickCntr3++;
		if (SystickCntr3 == SYSTEM_TIME_1S) {
			SystickCntr3 = 0;
//1S routines:
			if (Scroll7Segs) Scroll7SegDisp();
		}
	}
}