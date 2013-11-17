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
//Test to display 'crap' on the LCD display
	chars[0] = 'o';
	chars[1] = 'l';
	chars[2] = 'l';
	chars[3] = 'e';
	chars[4] = 'h';
	SetDispAscii(chars);

//Test to turn on every other LED
	SendDataToShiftReg(0xAA);
*/

/*
//Test to scroll text on the display
	ScrollingDisplayLength = 37;
	ScrollingDisplayIndex = ScrollingDisplayLength;
	for (index=0;index<64;index++) ScrollingDisplayData[ScrollingDisplayLength-index] = DataStart[index];
	Scroll7Segs = true;
*/

/*
//Test to write data to the program memory
	ProgMemAddr.s_form = 0x4000;
	
	USBEP0DataInBuffer[4] = 0xAA;
	USBEP0DataInBuffer[5] = 0x65;
	USBEP0DataInBuffer[6] = 0x75;
	USBEP0DataInBuffer[7] = 0x85;
	USBEP0DataInBuffer[8] = 0x95;
	
	for (index=0;index<32;index++)
	ProgmemBuffer[index] = USBEP0DataInBuffer[index+4];
	
	EraseProgMem();	//uses global ProgMemAddr
	
	WriteProgMem();	//uses global ProgMemAddr and ProgmemBuffer[]
*/
}

void main() {
	unsigned char chars[5], index;

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

		if (ExpPedalSvc) {
			ExpPedalRead();				//read ADC data from the expression pedal input
			continue;
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

void	ServiceUSB(void) {
	USBCheckBusStatus();                    // Must use polling method
    if(UCFGbits.UTEYE!=1) {
        USBDriverService();                 // Interrupt or polling method
	}
}
