//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 4/06/07					      						  #
//;#			Main arbitrator									  			  #
//;#			File Name: hwcalls.c   										  #
//;#																		  #
//;############################################################################


#include "c_system.h"
#include "typedefs.h"
#include "hardware.h"

unsigned char	ADC_CONVERSION(unsigned char Channel) {
	unsigned char tempcntr;
	ADCON0 = Channel;

//Wait for the converter's holding capacitor to charge up.
ADC_CHARGING_DELAY_LOOP:
	for(tempcntr = 10;tempcntr!=0;tempcntr--);

//Start the conversion
	ADCON0bits.GO = true;

//Wait for the conversion to complete, then exit
ADC_CONVERSION_DELAY:
	for(;ADCON0bits.GO;);
	
	return ADRESH;
}

/* Send a single MIDI byte. */
void midi_send_byte(u8 data) {
	MIDI_ENQUEUE(data);
}

//******************************************************************************
//JDunne 5/27/07 - Converted routine from assembly to C.  (used to be called SEND_TO_LATCHES)
//------------------------------------------------------------------------------
void	SendDataToShiftReg8(unsigned char dataToSend) {
	unsigned char DataCounter;
//SEND_SPEC_TO_LATCHES
	DataCounter = 8;								//Load number of bits to be transfered

//	bcf	SRCK_LAT_BIT						//Control clock signal, also prevent IIC start
	SHIFTREG_RCK_LAT_BIT = true;			//Flush out garbage
	SHIFTREG_RCK_LAT_BIT = false;

//STL_TRANSMIT_BIT
	do {
		SHIFTREG_SRCK_LAT_BIT = false;				//Clear strobe pin
		if (!chkbit(dataToSend, 7)) {		//MSB high?
			SHIFTREG_SER_IN_LAT_BIT = false;		//No, set data signal low
		}
		else {								//MSB low?
			SHIFTREG_SER_IN_LAT_BIT = true;		//No, release data signal
		}
		dataToSend <<=1;					//Shift next bit to MSB position
		SHIFTREG_SRCK_LAT_BIT = true;

//STL_RESET_CLOCK_LEVEL
	} while (--DataCounter!=0);				//All 8 bits transfered? No, go transfer next bit

//STL_STROBE
	SHIFTREG_RCK_LAT_BIT = true;			//Strobe the data

//STL_STROBE_DELAY
	for (DataCounter = LATCH_STROBE_DELAY; DataCounter !=0;DataCounter--);		//Pause for data transfer from external latch_1's input to its output

	SHIFTREG_RCK_LAT_BIT = false;
	SHIFTREG_SER_IN_LAT_BIT = true;				//Release data signal
	SHIFTREG_SRCK_LAT_BIT = true;			//Release serial clk
}

// Send MSBs first from hi to lo.
void	SendDataToShiftReg16(unsigned char lo, unsigned char hi) {
	unsigned char DataCounter;
//SEND_SPEC_TO_LATCHES
	DataCounter = 8;								//Load number of bits to be transfered

//	bcf	SRCK_LAT_BIT						//Control clock signal, also prevent IIC start
	SHIFTREG_RCK_LAT_BIT = true;			//Flush out garbage
	SHIFTREG_RCK_LAT_BIT = false;

//STL_TRANSMIT_BIT
	do {
		SHIFTREG_SRCK_LAT_BIT = false;				//Clear strobe pin
		if (!chkbit(hi, 7)) {		//MSB high?
			SHIFTREG_SER_IN_LAT_BIT = false;		//No, set data signal low
		}
		else {								//MSB low?
			SHIFTREG_SER_IN_LAT_BIT = true;		//No, release data signal
		}
		hi <<= 1;					//Shift next bit to MSB position
		SHIFTREG_SRCK_LAT_BIT = true;

//STL_RESET_CLOCK_LEVEL
	} while (--DataCounter!=0);				//All 8 bits transfered? No, go transfer next bit

	DataCounter = 8;								//Load number of bits to be transfered
//STL_TRANSMIT_BIT
	do {
		SHIFTREG_SRCK_LAT_BIT = false;				//Clear strobe pin
		if (!chkbit(lo, 7)) {		//MSB high?
			SHIFTREG_SER_IN_LAT_BIT = false;		//No, set data signal low
		}
		else {								//MSB low?
			SHIFTREG_SER_IN_LAT_BIT = true;		//No, release data signal
		}
		lo <<= 1;					//Shift next bit to MSB position
		SHIFTREG_SRCK_LAT_BIT = true;

//STL_RESET_CLOCK_LEVEL
	} while (--DataCounter!=0);				//All 8 bits transfered? No, go transfer next bit

//STL_STROBE
	SHIFTREG_RCK_LAT_BIT = true;			//Strobe the data

//STL_STROBE_DELAY
	for (DataCounter = LATCH_STROBE_DELAY; DataCounter !=0;DataCounter--);		//Pause for data transfer from external latch_1's input to its output

	SHIFTREG_RCK_LAT_BIT = false;
	SHIFTREG_SER_IN_LAT_BIT = true;				//Release data signal
	SHIFTREG_SRCK_LAT_BIT = true;			//Release serial clk
}
//------------------------------------------------------------------------------

//returns data into ButtonState.
void	ReadButtons(void) {
	unsigned char BtnAddress, bitloc, i;
	BitField TempButtons;

	bitloc = 1;

    // read top buttons:
	TempButtons.byte = 0;
	for (BtnAddress = 0; BtnAddress < 8; BtnAddress++) {
		SetDipAddress(BtnAddress);

		for (i = BTN_SAMPLE_DELAY;i!=0;i--);		//delay for a sampling delay

		if (BTN_IN_PIN) TempButtons.byte |= bitloc;		//Or in the current bit if it is set.
		bitloc <<= 1;										//shift the bit over to the next
	}
	ButtonStateTop = TempButtons.byte;
	// all buttons are backwards logic, so simply invert the state of ButtonState.
	ButtonStateTop = ~ButtonStateTop;

    // read bottom buttons:
	TempButtons.byte = 0;
	for (BtnAddress = 8; BtnAddress < 16; BtnAddress++) {
		SetDipAddress(BtnAddress);

		for (i = BTN_SAMPLE_DELAY;i!=0;i--);		//delay for a sampling delay

		if (BTN_IN_PIN) TempButtons.byte |= bitloc;		//Or in the current bit if it is set.
		bitloc <<= 1;										//shift the bit over to the next
	}
	ButtonStateBot = TempButtons.byte;
	// all buttons are backwards logic, so simply invert the state of ButtonState.
	ButtonStateBot = ~ButtonStateBot;

    //diag break when a button is detected as pushed.
//	if (ButtonStateBot || ButtonStateTop) {
//		nop();
//	}
}

void	SetDipAddress(unsigned char Address) {
	BTN_S0_LAT_BIT = false;
	BTN_S1_LAT_BIT = false;
	BTN_S2_LAT_BIT = false;
    BTN_S3_LAT_BIT = false;
	if (chkbit(Address,0)) BTN_S0_LAT_BIT = true;
	if (chkbit(Address,1)) BTN_S1_LAT_BIT = true;
	if (chkbit(Address,2)) BTN_S2_LAT_BIT = true;
    if (chkbit(Address,3)) BTN_S3_LAT_BIT = true;
}

/* --------------- LED read-out display functions: */
u16 fsw_poll() {
	TwoBytes TempButtons;

	TempButtons.s_form = 0;
	TempButtons.b_form.high = ButtonStateBot & (unsigned char)0xF0;
	TempButtons.b_form.low  = ButtonStateTop & (unsigned char)0x0F;

	return TempButtons.s_form;
}

static u8 reverse_bits(u8 v) {
    // see http://graphics.stanford.edu/~seander/bithacks.html#ReverseParallel
    v = ((v >> 1) & 0x55) | ((v & 0x55) << 1);
    v = ((v >> 2) & 0x33) | ((v & 0x33) << 2);
    v = ((v >> 4) & 0x0F) | ((v & 0x0F) << 4);
    return v;
}

void	UpdateLeds(void) {
    u8 top, bot;

    // LEDs are wired in reverse:
    top = reverse_bits(LedStatesTop);
    bot = reverse_bits(LedStatesBot);

	SendDataToShiftReg16(LedStatesBot, LedStatesTop);
}

/* Set currently active program foot-switch's LED indicator and disable all others */
void led_set(u8 top, u8 bot){
    LedStatesTop = top;
    LedStatesBot = bot;
}

/* --------------- MIDI I/O functions: */

/* Send formatted MIDI commands.

	0 <= cmd <= F       - MIDI command
	0 <= channel <= F   - MIDI channel to send command to
	00 <= data1 <= 7F   - data byte of MIDI command
*/
void midi_send_cmd1(u8 cmd, u8 channel, u8 data1) {
	/* send the MIDI command to the opened MIDI Mapper device: */
//	midiOutShortMsg(outHandle, ((cmd & 0xF) << 4) | (channel & 0xF) | ((u32)data1 << 8));

	MIDI_ENQUEUE(((cmd & 0xF) << 4) | (channel & 0xF));
	MIDI_ENQUEUE(data1 & 0x7F);
}

/* Send formatted MIDI commands.

	0 <= cmd <= F       - MIDI command
	0 <= channel <= F   - MIDI channel to send command to
	00 <= data1 <= 7F   - first data byte of MIDI command
	00 <= data2 <= 7F   - second (optional) data byte of MIDI command
*/
void midi_send_cmd2(u8 cmd, u8 channel, u8 data1, u8 data2) {
	/* send the MIDI command to the opened MIDI Mapper device: */
//	midiOutShortMsg(outHandle, ((cmd & 0xF) << 4) | (channel & 0xF) | ((u32)data1 << 8) | ((u32)data2 << 16));

	MIDI_ENQUEUE(((cmd & 0xF) << 4) | (channel & 0xF));
	MIDI_ENQUEUE(data1 & 0x7F);
	MIDI_ENQUEUE(data2 & 0x7F);
}
