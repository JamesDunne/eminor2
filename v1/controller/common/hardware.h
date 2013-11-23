/*
    Defined hardware I/O functions that the controller software
    needs to interface with.  This includes MIDI I/O, 4-digit LED
    display, foot-switch momentary toggle switch indicators, and
    LED "active" indicators above foot-switches.

    NOTE: it is expected that 'types.h' is #included before this file
*/

#define LEDS_MAX_ALPHAS 4

// --------------- LED read-out display functions:

// show 4 alphas on the 4-digit display
extern void leds_show_4alphas(char text[LEDS_MAX_ALPHAS]);

// show single digit on the single digit display
extern void leds_show_1digit(u8 value);

#define FSB_PRESET_1 28
#define FSB_PRESET_2 31
#define FSB_PRESET_3 30
#define FSB_PRESET_4 29

#define FSB_CONTROL_1 0
#define FSB_CONTROL_2 1
#define FSB_CONTROL_3 2
#define FSB_CONTROL_4 3

// --------------- Momentary toggle foot-switches:
#define FSM_PRESET_1	0x10000000
#define FSM_PRESET_2	0x80000000
#define FSM_PRESET_3	0x40000000
#define FSM_PRESET_4	0x20000000

#define FSM_CONTROL_1	0x00000001
#define FSM_CONTROL_2	0x00000002
#define FSM_CONTROL_3	0x00000004
#define FSM_CONTROL_4	0x00000008

// FX button enable bitmasks:
#define fxm_compressor  0x01
#define fxm_filter      0x02
#define fxm_pitch       0x04
#define fxm_chorus      0x08
#define fxm_delay       0x10
#define fxm_reverb      0x20
#define fxm_noisegate   0x40
#define fxm_eq          0x80

// FX button labels:
#define fxb_compressor  0
#define fxb_filter      1
#define fxb_pitch       2
#define fxb_chorus      3
#define fxb_delay       4
#define fxb_reverb      5
#define fxb_noisegate   6
#define fxb_eq          7

// Poll up to 28 foot-switch toggles simultaneously.  PREV NEXT DEC  INC map to 28-31 bit positions.
extern u32 fsw_poll(void);

// Set currently active program foot-switch's LED indicator and disable all others
extern void fsw_led_set_active(int idx);

// Explicitly enable a single LED without affecting the others
extern void fsw_led_enable(int idx);

// Explicitly disable a single LED without affecting the others
extern void fsw_led_disable(int idx);

// --------------- External inputs:

// Poll the slider switch to see which mode we're in:
extern u8 slider_poll(void);

// Poll the expression pedal's data (0-127):
extern u8 expr_poll(void);

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
