/*
    Defined hardware I/O functions that the controller software needs to interface with.
    This includes MIDI I/O, foot-switch momentary toggle switches, and LED indicators
    above foot-switches.

    NOTE: it is expected that 'types.h' is #included before this file
*/

#define M_1 0x01U
#define M_2 0x02U
#define M_3 0x04U
#define M_4 0x08U
#define M_5 0x10U
#define M_6 0x20U
#define M_7 0x40U
#define M_8 0x80U

// For foot switches and LEDs, the bottom row takes up LSB and top row takes up MSB of a u16.

// Poll 16 foot-switch states:
extern u16 fsw_poll(void);

// Explicitly set the state of all 16 LEDs:
extern void led_set(u16 leds);

// --------------- MIDI I/O functions:

// Send a single MIDI byte:
extern void midi_send_byte(u8 data);

/* Send multi-byte MIDI commands
     0 <= cmd     <=  F   - MIDI command
     0 <= channel <=  F   - MIDI channel to send command to
    00 <= data1   <= FF   - first data byte of MIDI command
    00 <= data2   <= FF   - second (optional) data byte of MIDI command
*/
extern void midi_send_cmd1(u8 cmd, u8 channel, u8 data1);
extern void midi_send_cmd2(u8 cmd, u8 channel, u8 data1, u8 data2);

// --------------- Flash memory functions:

// Load `count` bytes from flash memory at address `addr` (0-based where 0 is first available byte of available flash memory) into `data`:
extern void flash_load(u16 addr, u16 count, u8 *data);

// Stores `count` bytes from `data` into flash memory at address `addr` (0-based where 0 is first available byte of available flash memory):
extern void flash_store(u16 addr, u16 count, u8 *data);

// --------------- Controller logic interface functions:

/* export */ void controller_init(void);
/* export */ void controller_10msec_timer(void);
/* export */ void controller_handle(void);
