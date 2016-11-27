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

/* Send a single MIDI byte. */
void midi_send_byte(u8 data) {
    midi_enq(data);
}

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
    ButtonStateBot = 0;
    ButtonStateTop = 0;

    if (!TempButtons0.bit0) setbit(ButtonStateBot, 2);
    if (!TempButtons0.bit1) setbit(ButtonStateBot, 1);
    if (!TempButtons0.bit2) setbit(ButtonStateBot, 0);
    if (!TempButtons0.bit3) setbit(ButtonStateBot, 3);
    if (!TempButtons0.bit4) setbit(ButtonStateBot, 7);
    if (!TempButtons0.bit5) setbit(ButtonStateBot, 4);
    if (!TempButtons0.bit6) setbit(ButtonStateBot, 6);
    if (!TempButtons0.bit7) setbit(ButtonStateBot, 5);

    if (!TempButtons1.bit0) setbit(ButtonStateTop, 2);
    if (!TempButtons1.bit1) setbit(ButtonStateTop, 1);
    if (!TempButtons1.bit2) setbit(ButtonStateTop, 0);
    if (!TempButtons1.bit3) setbit(ButtonStateTop, 3);
    if (!TempButtons1.bit4) setbit(ButtonStateTop, 7);
    if (!TempButtons1.bit5) setbit(ButtonStateTop, 4);
    if (!TempButtons1.bit6) setbit(ButtonStateTop, 6);
    if (!TempButtons1.bit7) setbit(ButtonStateTop, 5);
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

/* --------------- LED read-out display functions: */
u16 fsw_poll() {
    u16 fsw;

    fsw = ButtonStateBot | ((u16)ButtonStateTop << 8);

    return fsw;
}

void UpdateLeds(void) {
    u8 top;
    u8 bot;
    
    top = 0;
    if (chkbit(LedStatesTop, 0)) setbit(top, 7);
    if (chkbit(LedStatesTop, 1)) setbit(top, 6);
    if (chkbit(LedStatesTop, 2)) setbit(top, 5);
    if (chkbit(LedStatesTop, 3)) setbit(top, 4);
    if (chkbit(LedStatesTop, 4)) setbit(top, 3);
    if (chkbit(LedStatesTop, 5)) setbit(top, 2);
    if (chkbit(LedStatesTop, 6)) setbit(top, 1);
    if (chkbit(LedStatesTop, 7)) setbit(top, 0);

    bot = 0;
    if (chkbit(LedStatesBot, 0)) setbit(bot, 7);
    if (chkbit(LedStatesBot, 1)) setbit(bot, 6);
    if (chkbit(LedStatesBot, 2)) setbit(bot, 5);
    if (chkbit(LedStatesBot, 3)) setbit(bot, 4);
    if (chkbit(LedStatesBot, 4)) setbit(bot, 3);
    if (chkbit(LedStatesBot, 5)) setbit(bot, 2);
    if (chkbit(LedStatesBot, 6)) setbit(bot, 1);
    if (chkbit(LedStatesBot, 7)) setbit(bot, 0);


    SendDataToShiftReg16(bot, top);
}

/* Set currently active program foot-switch's LED indicator and disable all others */
void led_set(u16 leds){
    LedStatesTop = (leds >> 8) & 0xFF;
    LedStatesBot = leds & 0xFF;
}

u8 *lcd_row_get(u8 row) {
    assert(row < 4);
    return LCDRamMap[row];
}

void lcd_row_updated(u8 row) {
    LCDUpdate = true;
    LCDUpdateStage = 0;      //start at the beginning if the screen needs to be redrawn
}

// Marks entire LCD screen as ready to be sent:
void lcd_updated_all(void) {
    LCDUpdate = true;
    LCDUpdateStage = 0;      //start at the beginning if the screen needs to be redrawn
}    

/* --------------- MIDI I/O functions: */

/* Send formatted MIDI commands.

     0 <= cmd <= F      - MIDI command
     0 <= channel <= F  - MIDI channel to send command to
    00 <= data1 <= 7F   - data byte of MIDI command
*/
void midi_send_cmd1(u8 cmd, u8 channel, u8 data1) {
    midi_enq(((cmd & 0xF) << 4) | (channel & 0xF));
    midi_enq(data1);
}

/* Send formatted MIDI commands.

     0 <= cmd <= F      - MIDI command
     0 <= channel <= F  - MIDI channel to send command to
    00 <= data1 <= 7F   - first data byte of MIDI command
    00 <= data2 <= 7F   - second (optional) data byte of MIDI command
*/
void midi_send_cmd2(u8 cmd, u8 channel, u8 data1, u8 data2) {
    midi_enq(((cmd & 0xF) << 4) | (channel & 0xF));
    midi_enq(data1);
    midi_enq(data2);
}

// ---------------- FLASH interface:

// FLASH memory is read freely as a normal memory access.
// FLASH memory is written to by erasing 64 bytes at a time on aligned addresses and then writing 32 bytes at a time.

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

rom const u8 *flash_addr(u16 addr) {
    u8 bank;

    bank = (u8)(addr >> 12);
    addr &= 0x0FFF;
    return (rom u8 *)&ROM_SAVEDATA[bank][addr];
}
