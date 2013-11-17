/*
    Defined hardware I/O functions that the controller software
    needs to interface with.  This includes MIDI I/O, 4-digit LED
    display, foot-switch momentary toggle switch indicators, and
    LED "active" indicators above foot-switches.

    NOTE: it is expected that 'types.h' is #included before this file
*/

/* --------------- Momentary toggle foot-switches: */

#define FSB_TOP_1 0
#define FSB_TOP_2 1
#define FSB_TOP_3 2
#define FSB_TOP_4 3
#define FSB_TOP_5 4
#define FSB_TOP_6 5
#define FSB_TOP_7 6
#define FSB_TOP_8 7

#define FSB_BOT_1 8
#define FSB_BOT_2 9
#define FSB_BOT_3 10
#define FSB_BOT_4 11
#define FSB_BOT_5 12
#define FSB_BOT_6 13
#define FSB_BOT_7 14
#define FSB_BOT_8 15

#define FSM_TOP_1 0x0001U
#define FSM_TOP_2 0x0002U
#define FSM_TOP_3 0x0004U
#define FSM_TOP_4 0x0008U
#define FSM_TOP_5 0x0010U
#define FSM_TOP_6 0x0020U
#define FSM_TOP_7 0x0040U
#define FSM_TOP_8 0x0080U

#define FSM_BOT_1 0x0100U
#define FSM_BOT_2 0x0200U
#define FSM_BOT_3 0x0400U
#define FSM_BOT_4 0x0800U
#define FSM_BOT_5 0x1000U
#define FSM_BOT_6 0x2000U
#define FSM_BOT_7 0x4000U
#define FSM_BOT_8 0x8000U

#define LEDM_1 0x0001U
#define LEDM_2 0x0002U
#define LEDM_3 0x0004U
#define LEDM_4 0x0008U
#define LEDM_5 0x0010U
#define LEDM_6 0x0020U
#define LEDM_7 0x0040U
#define LEDM_8 0x0080U

/* Poll 16 foot-switch toggles simultaneously. */
u16 fsw_poll(void);

/* Explicitly set the state of all 16 LEDs */
void led_set(u8 topMask, u8 botMask);

/* --------------- MIDI I/O functions: */

/* Send a single MIDI byte. */
void midi_send_byte(u8 data);

/* Send formatted MIDI commands.

    0 <= cmd <= F       - MIDI command
    0 <= channel <= F   - MIDI channel to send command to
    00 <= data1 <= FF   - first data byte of MIDI command
    00 <= data2 <= FF   - second (optional) data byte of MIDI command
*/
void midi_send_cmd1(u8 cmd, u8 channel, u8 data1);
void midi_send_cmd2(u8 cmd, u8 channel, u8 data1, u8 data2);

/* --------------- Controller logic interface functions: */

void controller_init(void);
void controller_10msec_timer(void);
void controller_handle(void);
