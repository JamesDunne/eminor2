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

// -----------------------------------------------

/* Send a single MIDI byte. */
void midi_send_byte(u8 data) {
	MIDI_ENQUEUE(data);
}

// Send MSBs first from hi to lo.
void	SendDataToShiftReg16(unsigned char lo, unsigned char hi) {
	unsigned char DataCounter;

    DataCounter = 8;								//Load number of bits to be transfered

//	bcf	SRCK_LAT_BIT						//Control clock signal, also prevent IIC start
	SHIFTREG_RCK_LAT_BIT = true;			//Flush out garbage
	SHIFTREG_RCK_LAT_BIT = false;

	do {
		SHIFTREG_SRCK_LAT_BIT = false;				//Clear strobe pin
		if (!chkbit(hi, 7)) {		//MSB high?
			SHIFTREG_SER_IN_LAT_BIT = false;		//No, set data signal low
		} else {								//MSB low?
			SHIFTREG_SER_IN_LAT_BIT = true;		//No, release data signal
		}
		hi <<= 1;					//Shift next bit to MSB position
		SHIFTREG_SRCK_LAT_BIT = true;
	} while (--DataCounter!=0);				//All 8 bits transfered? No, go transfer next bit

	DataCounter = 8;								//Load number of bits to be transfered
	do {
		SHIFTREG_SRCK_LAT_BIT = false;				//Clear strobe pin
		if (!chkbit(lo, 7)) {		//MSB high?
			SHIFTREG_SER_IN_LAT_BIT = false;		//No, set data signal low
		} else {								//MSB low?
			SHIFTREG_SER_IN_LAT_BIT = true;		//No, release data signal
		}
		lo <<= 1;					//Shift next bit to MSB position
		SHIFTREG_SRCK_LAT_BIT = true;
	} while (--DataCounter!=0);				//All 8 bits transfered? No, go transfer next bit

	SHIFTREG_RCK_LAT_BIT = true;			//Strobe the data

	for (DataCounter = LATCH_STROBE_DELAY; DataCounter !=0;DataCounter--);		//Pause for data transfer from external latch_1's input to its output

	SHIFTREG_RCK_LAT_BIT = false;
	SHIFTREG_SER_IN_LAT_BIT = true;				//Release data signal
	SHIFTREG_SRCK_LAT_BIT = true;			//Release serial clk
}
//------------------------------------------------------------------------------

//returns data into ButtonStateTop and ButtonStateBot.
void	ReadButtons(void) {
	unsigned char BtnAddress, bitloc, i;
	BitField TempButtons;

    // read bottom buttons:
	TempButtons.byte = 0;
	bitloc = 1;
	for (BtnAddress = 0; BtnAddress < 8; BtnAddress++) {
		SetDipAddress(BtnAddress);

		for (i = BTN_SAMPLE_DELAY;i!=0;i--);		//delay for a sampling delay

		if (BTN_IN_PIN) TempButtons.byte |= bitloc;		//Or in the current bit if it is set.
		bitloc <<= 1;										//shift the bit over to the next
	}
	ButtonStateBot = TempButtons.byte;

    // read top buttons:
	TempButtons.byte = 0;
	bitloc = 1;
	for (BtnAddress = 8; BtnAddress < 16; BtnAddress++) {
		SetDipAddress(BtnAddress);

		for (i = BTN_SAMPLE_DELAY;i!=0;i--);		//delay for a sampling delay

		if (BTN_IN_PIN) TempButtons.byte |= bitloc;		//Or in the current bit if it is set.
		bitloc <<= 1;										//shift the bit over to the next
	}
	ButtonStateTop = TempButtons.byte;

    // all buttons are backwards logic, so simply invert the state of ButtonState.
	ButtonStateTop = ~ButtonStateTop;
	ButtonStateBot = ~ButtonStateBot;
}

void SetDipAddress(unsigned char Address) {
    // NOTE(jsd): BTN_S3 flipped is correct logic.
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
	u16 fsw;

    fsw = ButtonStateBot | (ButtonStateTop << 8);

	return fsw;
}

void UpdateLeds(void) {
    u8 top, bot;

    // LEDs are wired in reverse:
    top = LedStatesTop;
    bot = LedStatesBot;

	SendDataToShiftReg16(LedStatesBot, LedStatesTop);
}

/* Set currently active program foot-switch's LED indicator and disable all others */
void led_set(u16 leds){
    LedStatesTop = (leds >> 8) & 0xFF;
    LedStatesBot = leds & 0xFF;
}

void lcd_update_row(u8 row, char text[LCD_COLS]) {
    // TODO.
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
