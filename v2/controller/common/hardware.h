/*
    Defined hardware I/O functions that the controller software needs to interface with.
    This includes MIDI I/O, foot-switch momentary toggle switches, and LED indicators
    above foot-switches.

    NOTE: it is expected that 'types.h' is #included before this file
*/

//Size of writable flash segment:
#define WRITABLE_SEG_ADDR       0x5000      //Also update this in the lkr file if it needs to change!!
#define WRITABLE_SEG_LEN        0x8000-WRITABLE_SEG_ADDR

// Features enabled/disable:

// Enable LCD display:
#define FEAT_LCD

// Define a DEBUG_LOG0 macro:
#ifdef __18CXX
#define DEBUG_LOG0(fmt)
#define DEBUG_LOG1(fmt,a1)
#define DEBUG_LOG2(fmt,a1,a2)
#define DEBUG_LOG3(fmt,a1,a2,a3)
#else
extern void debug_log(const char *fmt, ...);
#define DEBUG_LOG0(fmt) debug_log(fmt)
#define DEBUG_LOG1(fmt,a1) debug_log(fmt,a1)
#define DEBUG_LOG2(fmt,a1,a2) debug_log(fmt,a1,a2)
#define DEBUG_LOG3(fmt,a1,a2,a3) debug_log(fmt,a1,a2,a3)
#endif

// --------------- Momentary toggle foot-switches and LEDs:

#define M_1 0x01U
#define M_2 0x02U
#define M_3 0x04U
#define M_4 0x08U
#define M_5 0x10U
#define M_6 0x20U
#define M_7 0x40U
#define M_8 0x80U

// Foot switch and LED on/off states are represented with u16 bit-fields;
// the bottom row takes up LSBs (bits 0-7) and top row takes up MSBs (bits 8-15).

// Poll 16 foot-switch states:
extern u16 fsw_poll(void);

// Explicitly set the state of all 16 LEDs:
extern void led_set(param u16 leds);

#ifdef FEAT_LCD

// Example LCD display: http://www.newhavendisplay.com/nhd0420d3znswbbwv3-p-5745.html 4x20 characters
#define LCD_COLS    20
#define LCD_ROWS    4

// Get pointer to a specific LCD row:
// A terminating NUL character will clear the rest of the row with empty space.
extern near char *lcd_row_get(param u8 row);

// Update all LCD display rows as updated:
extern void lcd_updated_all(void);

#endif

// --------------- MIDI I/O functions:

/* Send multi-byte MIDI commands
     0 <= cmd     <=  F   - MIDI command
     0 <= channel <=  F   - MIDI channel to send command to
    00 <= data1   <= FF   - first data byte of MIDI command
    00 <= data2   <= FF   - second (optional) data byte of MIDI command
*/
#define midi_send_cmd1(cmd, channel, data1) midi_send_cmd1_impl((((u8)cmd & (u8)0xF) << (u8)4) | ((u8)channel & (u8)0xF), (u8)data1)
extern void midi_send_cmd1_impl(param u8 cmd_byte, param u8 data1);
#define midi_send_cmd2(cmd, channel, data1, data2) midi_send_cmd2_impl((((u8)cmd & (u8)0xF) << (u8)4) | ((u8)channel & (u8)0xF), (u8)data1, (u8)data2)
extern void midi_send_cmd2_impl(param u8 cmd_byte, param u8 data1, param u8 data2);

// Send a buffer of SysEx data; buffer must start with F0 and end with F7:
extern void midi_send_sysex_buffer(param u8 length, param const u8 *buf);

// --------------- Flash memory functions:

// Flash addresses are 0-based where 0 is the first available byte of
// non-program flash memory.

// Stores `count` bytes from `data` into flash memory at address `addr`:
extern void flash_store(param u16 addr, param u16 count, param u8 *data);

// Get a pointer to flash memory at address:
extern rom near const u8 *flash_addr(param u16 addr);

// --------------- Controller logic interface functions:

/* export */ extern void controller_init(void);
/* export */ extern void controller_10msec_timer(void);
/* export */ extern void controller_handle(void);

#ifdef HWFEAT_LABEL_UPDATES

// --------------- Change button labels (for Win32 / HTML5 interfaces only):

/* export */ extern near char **label_row_get(param u8 row);
/* export */ extern void label_row_update(param u8 row);

#endif

// --------------- Timing interface:

// Time is tracked using multiple markers as the difference in milliseconds since last call per marker

enum time_marker {
    TIME_MARKER_0,
    TIME_MARKER_1,
    TIME_MARKER_COUNT
};

// Get the amount of time elapsed (in milliseconds) since last call to `time_delta_and_mark(mark_index)` and mark new time at now:
// clamped to 0xFFFF and does not overflow
// default to 0xFFFF if `time_delta_and_mark(mark_index)` not yet called for `mark_index`
extern u16 time_delta_and_mark(param u8 mark_index);

// Get the amount of time elapsed (in milliseconds) since last call to `time_delta_and_mark(mark_index)` without marking new time:
// clamped to 0xFFFF and does not overflow
// default to 0xFFFF if `time_delta_and_mark(mark_index)` not yet called
extern u16 time_delta(param u8 mark_index);

// Determine if the interval has elapsed, return 1 if so, return 0 if not:
extern u16 time_interval(param u8 mark_index, param u16 msec);

// Copy time marker from mark_index_src to mark_index_dst:
extern void time_marker_dup(param u8 mark_index_dst, param u8 mark_index_src);
