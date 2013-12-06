//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 4/06/07					      						  #
//;#			Main arbitrator									  			  #
//;#			File Name: main.c   										  #
//;#																		  #
//;############################################################################


#include "c_system.h"
#include "usb.h"
#include "hardware.h"

void	ServiceUSB(void);

//#define	RX_TRIS_BIT		TRISCbits.TRISC7		// Receive direction bit
//#define	TX_TRIS_BIT		TRISCbits.TRISC6		// Transmit direction bit

#pragma code	main_code=0xA2A

/*
rom unsigned char 	DataStart[64] = "    princess consuela banana hannoc  ";
*/

void testcrap(void) {
/*
    //Test to turn on every other LED
	SendDataToShiftReg(0xAA);
*/
}

void main() {
	unsigned char chars[5], index;
    u8 tmp = 0;

#if 1
	CLRWDT();
	init();
	CLRWDT();

    MIDI_ENQUEUE(0xC0);
    MIDI_ENQUEUE(0x01);

    for(;;) {
		CLRWDT();
		ENABLE_ALL_INTERRUPTS();

        MIDI_ENQUEUE(0xC0);
        MIDI_ENQUEUE(tmp);
        tmp = ((tmp + 1) & 0x7F);

        MIDI_COMM_ROUTINE();
    }
#else
	CLRWDT();
	init();
	CLRWDT();
	//testcrap();
	controller_init();
	CLRWDT();

	for(;;) {
		CLRWDT();
		ENABLE_ALL_INTERRUPTS();

		ServiceUSB();				//this must be at the top to ensure timely handling of usb events

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
#endif
}

void	ServiceUSB(void) {
	USBCheckBusStatus();                    // Must use polling method
    if(UCFGbits.UTEYE!=1) {
        USBDriverService();                 // Interrupt or polling method
	}
}
