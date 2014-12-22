//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 4/06/07					      						  #
//;#			Main arbitrator									  			  #
//;#			File Name: main.c   										  #
//;#																		  #
//;############################################################################


#include "c_system.h"
#include "typedefs.h"
#include "hardware.h"

#pragma code	main_code=0xA2A

void main() {
	unsigned char chars[5], index;

	CLRWDT();
	init();
	CLRWDT();
	//testcrap();
	ReadButtons();
	controller_init();
	CLRWDT();

	for(;;) {
		CLRWDT();
		ENABLE_ALL_INTERRUPTS();

		if (Write0Pending) {
			Write0Pending = false;
			WriteProgMem(0);			//write first set of 32 bytes.
			continue;					//continue so we can process pending USB routines
		}

		if (Write32Pending) {
			Write32Pending = false;
			WriteProgMem(32);			//write second set of 32 bytes.
			continue;					//continue so we can process pending USB routines
		}

		if (Systick) {
			Systick = false;
			SystemTimeRoutine();		//1mS system time routine
			continue;
		}

		if (CheckButtons) {
			CheckButtons = false;
			ReadButtons();				//read buttons off the multiplexor
			continue;
		}

//		if (Handle7segs) {
//			Handle7segs = false;
//			Process7Segs();				//handle 7 segment display data
//		}

		if (HandleLeds) {
			HandleLeds = false;
			UpdateLeds();				//handle leds
		}

		if (HandleController) {
			HandleController = false;
			controller_handle();		//handle UI and other midi commands
		}

		if (ControllerTiming) {
			ControllerTiming = false;
			controller_10msec_timer();	//controller timing functions
		}

		MIDI_COMM_ROUTINE();		//handles sending/receiving midi data
	}
}
