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

/*
///Average = ((Inst-Avg)/(2^Tau))+Avg
TwoBytes Filtered2SampleAvg(TwoBytes Avg, unsigned char Inst, unsigned char Tau) {
	unsigned char positive;
	TwoBytes diff;

	diff.s_form = 0;
	if (Inst >= Avg.b_form.high) {
		diff.b_form.high = Inst - Avg.b_form.high;
		setbit(positive,0);
	}
	else {
		diff.b_form.high = Avg.b_form.high - Inst;
		clrbit(positive,0);
	}

	diff.s_form >>= Tau;

	if (chkbit(positive,0)) {
		Avg.s_form += diff.s_form;
	}
	else {
		Avg.s_form -= diff.s_form;
	}
	return Avg;
}
*/

void	SetDipAddress(unsigned char Address) {
	BTN_S0_LAT_BIT = false;
	BTN_S1_LAT_BIT = false;
	BTN_S2_LAT_BIT = false;
	if (chkbit(Address,0)) BTN_S0_LAT_BIT = true;
	if (chkbit(Address,1)) BTN_S1_LAT_BIT = true;
	if (chkbit(Address,2)) BTN_S2_LAT_BIT = true;
}

/* --------------- LED read-out display functions: */
u32 fsw_poll(){
	FourBytes TempButtons;

	TempButtons.l_form = 0;
	TempButtons.b_form.byte3 = ButtonState&(unsigned char)0xF0;
	TempButtons.b_form.byte0 = ButtonState&(unsigned char)0x0F;

	return TempButtons.l_form;
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

// --------------- Data persistence functions:

#if 0
// Gets number of stored banks
u16 banks_count(){
	u16	count;

	/* read the bank count: */
	count = *((rom u16 *)&(ROM_SAVEDATA[ROM_BANK_COUNT]));

	return count;	
}

#define	bank_record_size		16

/* Loads a bank into the specified arrays: */
void bank_load(u16 bank_index, char name[BANK_NAME_MAXLENGTH], u8 bank[BANK_PRESET_COUNT], u8 bankcontroller[BANK_PRESET_COUNT], u8 bankmap[BANK_MAP_COUNT], u8 *bankmap_count){
	u16	count;
	u16	addr;

	/* read the bank count: */
	count = *((rom u16 *)&(ROM_SAVEDATA[0]));
	if (bank_index >= count) {
		return;
	}

	/* load the bit-compressed data */
	addr = 64 + (bank_index * bank_record_size);

	name[0] = ROM_SAVEDATA[addr+0] & 0x7F;
	name[1] = ROM_SAVEDATA[addr+1] & 0x7F;
	name[2] = ROM_SAVEDATA[addr+2] & 0x7F;
	name[3] = ROM_SAVEDATA[addr+3] & 0x7F;

	bank[0] = ROM_SAVEDATA[addr+4] & 0x7F;
	bank[1] = ROM_SAVEDATA[addr+5] & 0x7F;
	bank[2] = ROM_SAVEDATA[addr+6] & 0x7F;
	bank[3] = ROM_SAVEDATA[addr+7] & 0x7F;

	bankcontroller[0] = ROM_SAVEDATA[addr+ 8] & 0x7F;
	bankcontroller[1] = ROM_SAVEDATA[addr+ 9] & 0x7F;
	bankcontroller[2] = ROM_SAVEDATA[addr+10] & 0x7F;
	bankcontroller[3] = ROM_SAVEDATA[addr+11] & 0x7F;

	/* count is stored 0-7, but means 1-8 so add 1 */
	*bankmap_count = (ROM_SAVEDATA[addr+12] & 0x07) + 1;
	/* load 8x 2-bit (0-3) values from the next few bytes for the sequence: */
	bankmap[0] = ((ROM_SAVEDATA[addr+13] & 0xC0) >> 6);
	bankmap[1] = ((ROM_SAVEDATA[addr+13] & 0x30) >> 4);
	bankmap[2] = ((ROM_SAVEDATA[addr+13] & 0x0C) >> 2);
	bankmap[3] = ((ROM_SAVEDATA[addr+13] & 0x03));
	bankmap[4] = ((ROM_SAVEDATA[addr+14] & 0xC0) >> 6);
	bankmap[5] = ((ROM_SAVEDATA[addr+14] & 0x30) >> 4);
	bankmap[6] = ((ROM_SAVEDATA[addr+14] & 0x0C) >> 2);
	bankmap[7] = ((ROM_SAVEDATA[addr+14] & 0x03));

	/* 8 free bits left before next 16-byte boundary */
}

/* Stores the programs back to the bank: */
void bank_store(u16 bank_index, u8 bank[BANK_PRESET_COUNT], u8 bankcontroller[BANK_PRESET_COUNT], u8 bankmap[BANK_MAP_COUNT], u8 bankmap_count){
	u8 chunk[64];
	u16	addr, addrhi, addrlo;

	addr = 64 + (bank_index * bank_record_size);
	addrhi = addr & ~63;
	addrlo = addr & 63;

	/* load the 64-byte aligned chunk: */
	read_rom_to_pmbuffer(addrhi);

	/* overwrite the bank program section for the bank record: */
	ProgmemBuffer[addrlo+4] = bank[0];
	ProgmemBuffer[addrlo+5] = bank[1];
	ProgmemBuffer[addrlo+6] = bank[2];
	ProgmemBuffer[addrlo+7] = bank[3];

	ProgmemBuffer[addrlo+ 8] = bankcontroller[0] & 0x7F;
	ProgmemBuffer[addrlo+ 9] = bankcontroller[1] & 0x7F;
	ProgmemBuffer[addrlo+10] = bankcontroller[2] & 0x7F;
	ProgmemBuffer[addrlo+11] = bankcontroller[3] & 0x7F;

	/* count is stored 0-7, but means 1-8 so subtract 1 */
	ProgmemBuffer[addrlo+12] = (bankmap_count - 1) & 0x07;
	/* store 8x 2-bit (0-3) values to the next few bytes for the sequence: */
	ProgmemBuffer[addrlo+13] = ((bankmap[0] & 0x03) << 6) |
					   ((bankmap[1] & 0x03) << 4) |
					   ((bankmap[2] & 0x03) << 2) |
					    (bankmap[3] & 0x03);
	ProgmemBuffer[addrlo+14] = ((bankmap[4] & 0x03) << 6) |
					   ((bankmap[5] & 0x03) << 4) |
					   ((bankmap[6] & 0x03) << 2) |
					    (bankmap[7] & 0x03);

	//write_eeprom(chunk, (64 + (bank_index * bank_record_size)) & ~63);
	
	ProgMemAddr.s_form = ((64 + (bank_index * bank_record_size)) & ~63) + WRITABLE_SEG_ADDR;	//+512 for debugging..
	EraseProgMem();

	Write0Pending = true;	//arb will catch this and handle it later..
	Write32Pending = true;	//arb will catch this and handle it later..
}

void read_rom_to_pmbuffer(unsigned short Address) {
	unsigned char index;
	
	for (index = 0;index<64;index++) {
		ProgmemBuffer[index] = ROM_SAVEDATA[Address++];	//read rom data into ram
	}
}


/* Load bank name for browsing through banks: */
void bank_loadname(u16 bank_index, char name[BANK_NAME_MAXLENGTH]){
	u16	count;
	u16	addr;

	/* read the bank count: */
	count = *((u16 *)&(ROM_SAVEDATA[0]));
	if (bank_index >= count) {
		return;
	}

	/* load the bit-compressed data */
	addr = 64 + (bank_index * bank_record_size);

	name[0] = ROM_SAVEDATA[addr+0] & 0x7F;
	name[1] = ROM_SAVEDATA[addr+1] & 0x7F;
	name[2] = ROM_SAVEDATA[addr+2] & 0x7F;
	name[3] = ROM_SAVEDATA[addr+3] & 0x7F;	
}

/* Get the alphabetically sorted bank index */
u16 bank_getsortedindex(u16 sort_index){
	u16	count;
	u16	addr;

	/* read the bank count: */
	count = *((rom u16 *)&(ROM_SAVEDATA[0]));
	if (sort_index >= count) {
		return	false;				//MODIFIED!!
	}

	/* read the bank index given the sort index location: */
	addr = 64 + (count * bank_record_size) + (sort_index * sizeof(u16));
	return *((rom u16 *)&(ROM_SAVEDATA[addr]));
}

#endif

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
