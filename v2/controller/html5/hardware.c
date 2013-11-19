#include "../common/types.h"

/*
    Defined hardware I/O functions that the controller software
    needs to interface with.  This includes MIDI I/O, 4-digit LED
    display, foot-switch momentary toggle switch indicators, and
    LED "active" indicators above foot-switches.

    NOTE: it is expected that 'types.h' is #included before this file
*/

/* --------------- Momentary toggle foot-switches: */

/* Poll 16 foot-switch toggles simultaneously. */
extern u16 fsw_poll(void);

/* Explicitly set the state of all 16 LEDs */
extern void led_set(u8 topMask, u8 botMask);

/* --------------- MIDI I/O functions: */

/* Send a single MIDI byte. */
extern void midi_send_byte(u8 data);

/* Send formatted MIDI commands.

    0 <= cmd <= F       - MIDI command
    0 <= channel <= F   - MIDI channel to send command to
    00 <= data1 <= FF   - first data byte of MIDI command
    00 <= data2 <= FF   - second (optional) data byte of MIDI command
*/
extern void midi_send_cmd1(u8 cmd, u8 channel, u8 data1);
extern void midi_send_cmd2(u8 cmd, u8 channel, u8 data1, u8 data2);

/* --------------- Controller logic interface functions: */

//export void controller_init(void);
//export void controller_10msec_timer(void);
//export void controller_handle(void);
