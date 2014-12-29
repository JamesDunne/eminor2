//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 4/06/07					      						  #
//;#			Main arbitrator									  			  #
//;#			File Name: hwcalls.c   										  #
//;#																		  #
//;############################################################################

#include "assert.h"
#include "c_system.h"
#include "typedefs.h"
#include "hardware.h"

/* Send a single MIDI byte. */
void midi_send_byte(u8 data) {
	MIDI_ENQUEUE(data);
}

//******************************************************************************
//JDunne 5/27/07 - Converted routine from assembly to C.  (used to be called SEND_TO_LATCHES)
//------------------------------------------------------------------------------
void	SendDataToShiftReg(unsigned char dataToSend) {
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
//------------------------------------------------------------------------------

//returns data into ButtonState.
void	ReadButtons(void) {
	unsigned char BtnAddress, bitloc, i;
	BitField TempButtons;

//the following only reads 7 buttons from the multiplexor, and the 8th from the pin directly.
//the 7th bit of the multiplexor is the modeswitch which is read below.
	bitloc = 1;
	TempButtons.byte = 0;
	for (BtnAddress = 0;BtnAddress<=6;BtnAddress++) {
		SetDipAddress(BtnAddress);

		for (i = BTN_SAMPLE_DELAY;i!=0;i--);		//delay for a sampling delay

		if (BTN_IN_PIN) TempButtons.byte |= bitloc;		//Or in the current bit if it is set.
		bitloc <<= 1;										//shift the bit over to the next
	}

	ButtonState = TempButtons.byte;
	ButtonState <<=1;			//shift everything over one because the 0th bit is supposed
								//to be PRESET_1, which is on another pin.

	ButtonState |= 0xFFFFFF00;
	if (BTN_PRESET_1_PIN) setbit(ButtonState,0);

	//all buttons are backwards logic, so simply invert the state of ButtonState.
	ButtonState = ~ButtonState;

	//read the 7th bit of the shift register.  (Which is the slider mode switch)
	BtnAddress = 0x07;
	SetDipAddress(BtnAddress);
	ModeSwitchState = true;
	if (!BTN_IN_PIN) ModeSwitchState = false;

	//diag break when a button is detected as pushed.
//	if (ButtonState) {
//		nop();
//	}


}

void	SetDipAddress(unsigned char Address) {
	BTN_S0_LAT_BIT = false;
	BTN_S1_LAT_BIT = false;
	BTN_S2_LAT_BIT = false;
	if (chkbit(Address,0)) BTN_S0_LAT_BIT = true;
	if (chkbit(Address,1)) BTN_S1_LAT_BIT = true;
	if (chkbit(Address,2)) BTN_S2_LAT_BIT = true;
}

/* --------------- LED read-out display functions: */
u8 fsw_poll(){
    return ButtonState;
}

void	UpdateLeds(void) {
	SendDataToShiftReg(LedStates);
}

/* Set currently active program foot-switch's LED indicator and disable all others */
void fsw_led_set_active(int idx){
	LedStates = 0;
	setbit(LedStates,idx);
}

/* Explicitly enable a single LED without affecting the others */
void fsw_led_enable(int idx){
	setbit(LedStates,idx);
}

/* Explicitly disable a single LED without affecting the others */
void fsw_led_disable(int idx){
	clrbit(LedStates,idx);
}

/* Poll the slider switch to see which mode we're in: */
u8 slider_poll(){
	return	ModeSwitchState;
}

// Poll the expression pedal's data (0-127):
u8 expr_poll(){
	return ExpPedalInst;
}

// ---------------- FLASH interface:

// FLASH memory is read freely as a normal memory access.
// FLASH memory is written to by erasing 64 bytes at a time on aligned addresses and then writing 32 bytes at a time.

void flash_load(u16 addr, u16 count, u8 *data) {
    u8 i;
    u16 saddr;

    // Check sanity of read to make sure it fits within one 64-byte chunk of flash and does not cross boundaries:
    assert(((addr) & ~63) == (((addr + count - 1)) & ~63));
    // Make sure read is in flash memory range:
    assert(addr + count < WRITABLE_SEG_LEN);

    // Copy data from ROM to destination:
    for (i = 0, saddr = addr; i < count; i++, saddr++)
        data[i] = ROM_SAVEDATA[saddr];
}

void flash_store(u16 addr, u16 count, u8 *data) {
    u8 i;
    u16 saddr, daddr;

    // Check sanity of write to make sure it fits within one 64-byte chunk of flash and does not cross boundaries:
    assert(((addr) & ~63) == (((addr + count - 1)) & ~63));
    // Make sure write is in flash memory range:
    assert(addr + count < WRITABLE_SEG_LEN);

    // Copy 64 byte aligned chunk of ROM into RAM so it can be put back in after ERASE completes.
    saddr = addr & ~63;
    for (i = 0; i < 64; i++, saddr++) {
        ProgmemBuffer[i] = ROM_SAVEDATA[saddr];
    }

    // Copy new data into RAM buffer, assuming we don't cross a 64-byte chunk boundary:
    saddr = addr & ~63;
    daddr = addr - saddr;
    for (i = 0; i < count; i++, daddr++)
        ProgmemBuffer[daddr] = data[i];

    // Start the ERASE operation:
    // +512 for debugging..
    ProgMemAddr.s_form = (addr & ~63) + WRITABLE_SEG_ADDR;
    EraseProgMem();

    // arb will catch this and handle it later...
    Write0Pending = true;
    Write32Pending = true;
}

/* --------------- MIDI I/O functions: */

/* Send formatted MIDI commands.

	0 <= cmd <= F       - MIDI command
	0 <= channel <= F   - MIDI channel to send command to
	00 <= data1 <= 7F   - data byte of MIDI command
*/
void midi_send_cmd1(u8 cmd, u8 channel, u8 data1) {
	MIDI_ENQUEUE(((cmd & 0xF) << 4) | (channel & 0xF));
	MIDI_ENQUEUE(data1);
}

/* Send formatted MIDI commands.

	0 <= cmd <= F       - MIDI command
	0 <= channel <= F   - MIDI channel to send command to
	00 <= data1 <= 7F   - first data byte of MIDI command
	00 <= data2 <= 7F   - second (optional) data byte of MIDI command
*/
void midi_send_cmd2(u8 cmd, u8 channel, u8 data1, u8 data2) {
	MIDI_ENQUEUE(((cmd & 0xF) << 4) | (channel & 0xF));
	MIDI_ENQUEUE(data1);
	MIDI_ENQUEUE(data2);
}
