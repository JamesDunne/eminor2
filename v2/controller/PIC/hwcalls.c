//*;###########################################################################
//;#            Author: Joe Dunne                                             #
//;#            Date 4/06/07                                                  #
//;#            Main arbitrator                                               #
//;#            File Name: hwcalls.c                                          #
//;#                                                                          #
//;############################################################################

#include "assert.h"
#include "c_system.h"
#include "typedefs.h"
#include "hardware.h"

// -----------------------------------------------

// Send MSBs first from hi to lo.
void SendDataToShiftReg16(unsigned char lo, unsigned char hi) {
    unsigned char DataCounter;

    DataCounter = 8;                                //Load number of bits to be transfered

//  bcf SRCK_LAT_BIT                        //Control clock signal, also prevent IIC start
    SHIFTREG_RCK_LAT_BIT = true;            //Flush out garbage
    SHIFTREG_RCK_LAT_BIT = false;

    do {
        SHIFTREG_SRCK_LAT_BIT = false;              //Clear strobe pin
        if (!chkbit(hi, 7)) {       //MSB high?
            SHIFTREG_SER_IN_LAT_BIT = false;        //No, set data signal low
        } else {                                //MSB low?
            SHIFTREG_SER_IN_LAT_BIT = true;     //No, release data signal
        }
        hi <<= 1;                   //Shift next bit to MSB position
        SHIFTREG_SRCK_LAT_BIT = true;
    } while (--DataCounter!=0);             //All 8 bits transfered? No, go transfer next bit

    DataCounter = 8;                                //Load number of bits to be transfered
    do {
        SHIFTREG_SRCK_LAT_BIT = false;              //Clear strobe pin
        if (!chkbit(lo, 7)) {       //MSB high?
            SHIFTREG_SER_IN_LAT_BIT = false;        //No, set data signal low
        } else {                                //MSB low?
            SHIFTREG_SER_IN_LAT_BIT = true;     //No, release data signal
        }
        lo <<= 1;                   //Shift next bit to MSB position
        SHIFTREG_SRCK_LAT_BIT = true;
    } while (--DataCounter!=0);             //All 8 bits transfered? No, go transfer next bit

    SHIFTREG_RCK_LAT_BIT = true;            //Strobe the data

    for (DataCounter = LATCH_STROBE_DELAY; DataCounter !=0;DataCounter--);      //Pause for data transfer from external latch_1's input to its output

    SHIFTREG_RCK_LAT_BIT = false;
    SHIFTREG_SER_IN_LAT_BIT = true;             //Release data signal
    SHIFTREG_SRCK_LAT_BIT = true;           //Release serial clk
}

//------------------------------------------------------------------------------

// Footswitch debouncing; call once every msec
rom const u8 debounce_max[16] = {
    // bottom:
    125, 125, 125, 125, 125, 125, 125, 250,
    // top
    125, 125, 125, 125, 125, 125, 125, 125
};
u8 debounce[16] = {0};
u16 fsw_debounced = 0;

void fsw_debounce(void) {
    u8 i;
    u16 test;
    u16 fsw, deb;

    fsw = ButtonStateBot | ((u16)ButtonStateTop << 8);
    deb = 0;

    // debounce buttons:
    for (i=0,test=1;i<16;i++,test<<=1) {
        if (debounce[i] == 0) {
            if (fsw & test) {
                // button pressed:
                debounce[i] = 1;
                deb |= test;
            }
        } else {
            // keep button down for at least 125msec:
            if (debounce[i] < debounce_max[i]) {
                debounce[i]++;
                deb |= test;
            } else {
                // use live state:
                if (fsw & test) {
                    deb |= test;
                } else {
                    debounce[i] = 0;
                }
            }
        }
    }

    fsw_debounced = deb;
}

//returns data into ButtonStateTop and ButtonStateBot.
void ReadButtons(void) {
    unsigned char BtnAddress, bitloc, i;
    BitField TempButtons0;
    BitField TempButtons1;

    // read bottom buttons:
    TempButtons0.byte = 0;
    bitloc = 1;
    for (BtnAddress = 0; BtnAddress < 8; BtnAddress++) {
        SetDipAddress(BtnAddress);

        for (i = BTN_SAMPLE_DELAY;i!=0;i--);        //delay for a sampling delay

        if (BTN_IN_PIN) TempButtons0.byte |= bitloc;     //Or in the current bit if it is set.
        bitloc <<= 1;                                       //shift the bit over to the next
    }
    //ButtonStateBot = TempButtons0.byte;

    // read top buttons:
    TempButtons1.byte = 0;
    bitloc = 1;
    for (BtnAddress = 8; BtnAddress < 16; BtnAddress++) {
        SetDipAddress(BtnAddress);

        for (i = BTN_SAMPLE_DELAY;i!=0;i--);        //delay for a sampling delay

        if (BTN_IN_PIN) TempButtons1.byte |= bitloc;     //Or in the current bit if it is set.
        bitloc <<= 1;                                       //shift the bit over to the next
    }
    //ButtonStateTop = TempButtons1.byte;

    //remap buttons:
    TempButtons0.byte = ~TempButtons0.byte;
    ButtonStateBot =
        ((TempButtons0.byte & (u8)(1 << 0)) << 2)
      | ((TempButtons0.byte & (u8)(1 << 1)))
      | ((TempButtons0.byte & (u8)(1 << 2)) >> 2)
      | ((TempButtons0.byte & (u8)(1 << 3)))
      | ((TempButtons0.byte & (u8)(1 << 4)) << 3)
      | ((TempButtons0.byte & (u8)(1 << 5)) >> 1)
      | ((TempButtons0.byte & (u8)(1 << 6)))
      | ((TempButtons0.byte & (u8)(1 << 7)) >> 2);

    TempButtons1.byte = ~TempButtons1.byte;
    ButtonStateTop =
        ((TempButtons1.byte & (u8)(1 << 0)) << 2)
      | ((TempButtons1.byte & (u8)(1 << 1)))
      | ((TempButtons1.byte & (u8)(1 << 2)) >> 2)
      | ((TempButtons1.byte & (u8)(1 << 3)))
      | ((TempButtons1.byte & (u8)(1 << 4)) << 3)
      | ((TempButtons1.byte & (u8)(1 << 5)) >> 1)
      | ((TempButtons1.byte & (u8)(1 << 6)))
      | ((TempButtons1.byte & (u8)(1 << 7)) >> 2);

    // debounce buttons every msec:
    fsw_debounce();
}

void SetDipAddress(unsigned char Address) {
    BTN_S0_LAT_BIT = false;
    BTN_S1_LAT_BIT = false;
    BTN_S2_LAT_BIT = false;
    BTN_S3_LAT_BIT = false;
    if (chkbit(Address,0)) BTN_S0_LAT_BIT = true;
    if (chkbit(Address,1)) BTN_S1_LAT_BIT = true;
    if (chkbit(Address,2)) BTN_S2_LAT_BIT = true;
    if (chkbit(Address,3)) BTN_S3_LAT_BIT = true;
}

u16 fsw_poll() {
    return fsw_debounced;
}

/* --------------- LED read-out display functions: */

void UpdateLeds(void) {
    u8 top;
    u8 bot;

    // Reverse bit order:
    top = LedStatesTop;
    top = ((top & (u8)0xF0) >> (u8)4) | ((top & (u8)0x0F) << (u8)4);
    top = ((top & (u8)0xCC) >> (u8)2) | ((top & (u8)0x33) << (u8)2);
    top = ((top & (u8)0xAA) >> (u8)1) | ((top & (u8)0x55) << (u8)1);

    // Reverse bit order:
    bot = LedStatesBot;
    bot = ((bot & (u8)0xF0) >> (u8)4) | ((bot & (u8)0x0F) << (u8)4);
    bot = ((bot & (u8)0xCC) >> (u8)2) | ((bot & (u8)0x33) << (u8)2);
    bot = ((bot & (u8)0xAA) >> (u8)1) | ((bot & (u8)0x55) << (u8)1);

    SendDataToShiftReg16(bot, top);
}

/* Set currently active program foot-switch's LED indicator and disable all others */
void led_set(param u16 leds){
    LedStatesTop = (leds >> 8) & 0xFF;
    LedStatesBot = leds & 0xFF;
}

near char *lcd_row_get(param u8 row) {
    assert(row < 4);
    return LCDRamMap[row];
}

// Marks entire LCD screen as ready to be sent:
void lcd_updated_all(void) {
    LCDUpdateRequest = true;
}

/* --------------- MIDI I/O functions: */

#ifdef MIDI_BLOCKING
#ifdef MIDI_INLINE
// Non-buffered (immediate, blocking) MIDI transmission functions:
#define midi_enq(byte) { \
	nop(); \
	nop(); \
	while (PIR1bits.TXIF == 0) {} \
	nop(); \
	nop(); \
	TXREG = byte; \
	nop(); \
	nop(); \
}
#else
// Non-buffered (immediate, blocking) MIDI transmission functions:
static void midi_enq(param u8 byte) {
	//nop();
	//nop();
	while (PIR1bits.TXIF == 0) {}
	//nop();
	//nop();
	TXREG = byte;
	//nop();
	//nop();
}
#endif
#endif

void midi_send_sysex_buffer(param u8 length, param const u8 *buf) {
    u8 i;
    for (i=0;i<length;++i) {
	    midi_enq(buf[i]);
	}
}

/* Send formatted MIDI commands.
    00 <= cmd <= FF     - MIDI command
    00 <= data1 <= 7F   - data byte of MIDI command
*/
void midi_send_cmd1_impl(param u8 cmd_byte, param u8 data1) {
    midi_enq(cmd_byte);
    midi_enq(data1);
}

/* Send formatted MIDI commands.
    00 <= cmd <= FF     - MIDI command
    00 <= data1 <= 7F   - first data byte of MIDI command
    00 <= data2 <= 7F   - second (optional) data byte of MIDI command
*/
void midi_send_cmd2_impl(param u8 cmd_byte, param u8 data1, param u8 data2) {
    midi_enq(cmd_byte);
    midi_enq(data1);
    midi_enq(data2);
}

// ---------------- FLASH interface:

// FLASH memory is read freely as a normal memory access.
// FLASH memory is written to by erasing 64 bytes at a time on aligned addresses and then writing 32 bytes at a time.

#if 0
void flash_load(u16 addr, u16 count, u8 *data) {
    u8 i;
    u8 bank;
    u16 saddr;

    // Check sanity of read to make sure it fits within one 64-byte chunk of flash and does not cross boundaries:
    assert(((addr) & ~63) == (((addr + count - 1)) & ~63));
    // Make sure read is in flash memory range:
    assert(addr + count < WRITABLE_SEG_LEN);

    bank = (u8)(addr >> 12);
    addr &= 0x0FFF;

    // Copy data from ROM to destination:
    for (i = 0, saddr = addr; i < count; i++, saddr++)
        data[i] = ROM_SAVEDATA[bank][saddr];
}
#endif

#if ENABLE_WRITE
void flash_store(u16 addr, u16 count, u8 *data) {
    u8 i;
    u8 bank;
    u16 bankedaddr, saddr, daddr;

    // Check sanity of write to make sure it fits within one 64-byte chunk of flash and does not cross boundaries:
    assert(((addr) & ~63) == (((addr + count - 1)) & ~63));
    // Make sure write is in flash memory range:
    assert(addr + count < WRITABLE_SEG_LEN);

    bank = (u8)(addr >> 12);
    bankedaddr = addr & 0x0FFF;

    // Copy 64 byte aligned chunk of ROM into RAM so it can be put back in after ERASE completes.
    saddr = bankedaddr & ~63;
    for (i = 0; i < 64; i++, saddr++) {
        ProgmemBuffer[i] = ROM_SAVEDATA[bank][saddr];
    }

    // Copy new data into RAM buffer, assuming we don't cross a 64-byte chunk boundary:
    saddr = addr & ~63;
    daddr = addr - saddr;
    for (i = 0; i < count; i++, daddr++)
        ProgmemBuffer[daddr] = data[i];

    // Start the ERASE operation:
    ProgMemAddr.s_form = (addr & ~63) + WRITABLE_SEG_ADDR;
    EraseProgMem();

    // arb will catch this and handle it later...
    Write0Pending = true;
    Write32Pending = true;
}
#endif

rom near const u8 *flash_addr(param u16 addr) {
    u8 bank;

    bank = (u8)(addr >> 12);
    addr &= 0x0FFF;
    return (rom const u8 *)&ROM_SAVEDATA[bank][addr];
}


// --------------- Timing interface:

u16 timer[TIME_MARKER_COUNT];

// Get the amount of time elapsed (in milliseconds) since last call to `time_delta_and_mark(mark_index)` and mark new time at now:
// clamped to 0xFFFF and does not overflow
// default to 0xFFFF if `time_delta_and_mark(mark_index)` not yet called for `mark_index`
u16 time_delta_and_mark(param u8 mark_index) {
    u16 delta = timer[mark_index];
    timer[mark_index] = 0u;
    return delta;
}

// Get the amount of time elapsed (in milliseconds) since last call to `time_delta_and_mark(mark_index)` without marking new time:
// clamped to 0xFFFF and does not overflow
// default to 0xFFFF if `time_delta_and_mark(mark_index)` not yet called
u16 time_delta(param u8 mark_index) {
    return timer[mark_index];
}

// Determine if the interval has elapsed:
u16 time_interval(param u8 mark_index, param u16 msec) {
    u16 delta = timer[mark_index];
    if (delta >= msec) {
        timer[mark_index] -= msec;
    }
    return delta;
}

// Copy time marker from mark_index_src to mark_index_dst:
void time_marker_dup(param u8 mark_index_dst, param u8 mark_index_src) {
    timer[mark_index_dst] = timer[mark_index_src];
}
