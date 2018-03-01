/*
    Programmable e-minor MIDI foot controller v1.

    Currently designed to work with:
    t.c. electronic g-major effects unit.

    Assumptions:
    g-major listens on MIDI channel 1
    g-major listens for program change messages and CC messages

    Possible hardware layout diagram:

    (o)     = SPST rugged foot-switch
    (*)     = Single on/off LED
    [ ... ] = LED 7-segment (or more) display
    {\}     = slider switch

    PWR  MIDI OUT EXPR IN (opt)
    |      ||      ||
    /--------------------\
    |                    |
    |        [0 8 8 8 8] |
    |                    |
    | (*)  (*)  (*)  (*) |
    | (o)  (o)  (o)  (o) |
    | TAP   -   PREV NEXT|
    |                    |
    | (o)  (o)  (o)  (o) |
    | EQ  PITCH DLY  VERB|
    |                    |
    \--------------------/

    Written by James S. Dunne
    Updated:  2018-02-28
*/

#include "../common/types.h"
#include "../common/hardware.h"

// Hard-coded MIDI channel #s:
#define gmaj_midi_channel   0

// G-major CC messages:
#define gmaj_cc_taptempo    80
#define gmaj_cc_mute        81

//#define gmaj_cc_compressor  84
//#define gmaj_cc_filter      85
#define gmaj_cc_pitch       86
//#define gmaj_cc_chorus      87
#define gmaj_cc_delay       88
#define gmaj_cc_reverb      89
//#define gmaj_cc_noisegate   90
#define gmaj_cc_eq          91

u8 sw_curr, sw_last;
u8 slider_curr, slider_last;

u8 gmaj_program;
u8 blockBitmap;
u8 tap;

#define block_0_cc gmaj_cc_eq
#define block_1_cc gmaj_cc_pitch
#define block_2_cc gmaj_cc_delay
#define block_3_cc gmaj_cc_reverb

// right-aligns an integer in base 10 at s[i] and pads spaces down to s[0]
// NOTE(jsd): Using modulus operator invokes a call to a CLIB.LIB function to perform. Yuck.
static void ralign_itoa10(u8 n, char *s) {
    //assert(s != 0);
    //assert(i >= 0);
    s8 i = 3;

    do {
        s[i] = (n % 10) + '0';
        if ((n /= 10) <= 0) break;
        --i;
    } while (i >= 0);

    // pad the left chars with spaces:
    for (--i; i >= 0; --i) s[i] = ' ';
}

// update 7-segment displays
static void update_7seg(void) {
    char s[LEDS_MAX_ALPHAS];

    ralign_itoa10(gmaj_program + 1, s);

    // 1digit is left-most 7-segment LED:
    leds_show_1digit(0);
    // 4digits is right-most 4x 7-segment LEDs:
    leds_show_4alphas(s);
}

// determine if a footswitch was pressed
static u8 button_pressed(u8 mask) {
    return ((sw_curr & mask) == mask) && ((sw_last & mask) == 0);
}

// determine if still holding footswitch
static u8 button_held(u8 mask) {
    return (sw_curr & mask) == mask;
}

// determine if a footswitch was released
static u8 button_released(u8 mask) {
    return ((sw_last & mask) == mask) && ((sw_curr & mask) == 0);
}

static void update_outputs(void) {
#define set_led(n) \
    if ((blockBitmap & (1 << n)) == (1 << n)) \
    fsw_led_enable(n); \
    else \
    fsw_led_disable(n)

    set_led(0);
    set_led(1);
    set_led(2);
    set_led(3);
    update_7seg();
}

#define gmaj_midi_block(n) \
    gmaj_midi_cc_set(block_##n##_cc, ((blockBitmap & (1 << n)) == (1 << n)) ? 0x7F : 0x00)

#define gmaj_toggle_block(n) { \
    blockBitmap ^= (1 << n); \
    gmaj_midi_block(n); \
    update_outputs(); \
}

// Set g-major CC value:
static void gmaj_midi_cc_set(u8 cc, u8 val) {
    midi_send_cmd2(0xB, gmaj_midi_channel, cc, val);
}

// Change g-major program:
static void gmaj_midi_program(u8 program) {
    midi_send_cmd1(0xC, gmaj_midi_channel, program);
    // Disable all effect blocks:
    blockBitmap = 0;
    // Send MIDI state of each effect block:
    gmaj_midi_block(0);
    gmaj_midi_block(1);
    gmaj_midi_block(2);
    gmaj_midi_block(3);
}

static void gmaj_inc_program(void) {
    if (gmaj_program == 127) return;
    gmaj_program++;
    gmaj_midi_program(gmaj_program);
    update_outputs();
}

static void gmaj_dec_program(void) {
    if (gmaj_program == 0) return;
    gmaj_program--;
    gmaj_midi_program(gmaj_program);
    update_outputs();
}

// ------------------------- Actual controller logic -------------------------

// set the controller to an initial state
void controller_init(void) {
    sw_last = 0xFF;
    slider_last = 0xFF;
    slider_curr = 0;

    tap = 0;
    blockBitmap = 0;
    gmaj_program = 0;
    gmaj_midi_program(0);
    update_outputs();
}

// called every 10ms
void controller_10msec_timer(void) {
}

// main control loop
void controller_handle(void) {
    // poll foot-switch depression status:
    sw_curr = fsw_poll();
    slider_curr = slider_poll();

    // one of BOTTOM 1-4 pressed:
    if (button_pressed(FSM_PRESET_1)) {
        gmaj_toggle_block(0);
    }
    if (button_pressed(FSM_PRESET_2)) {
        gmaj_toggle_block(1);
    }
    if (button_pressed(FSM_PRESET_3)) {
        gmaj_toggle_block(2);
    }
    if (button_pressed(FSM_PRESET_4)) {
        gmaj_toggle_block(3);
    }

    if (slider_curr == 1) {
        // one of TOP 1-4 pressed:
        if (button_pressed(FSM_CONTROL_1)) {
            tap ^= 0x7F;
            gmaj_midi_cc_set(gmaj_cc_taptempo, tap);
        }
        if (button_pressed(FSM_CONTROL_2)) {
        }
        if (button_pressed(FSM_CONTROL_3)) {
            gmaj_dec_program();
        }
        if (button_pressed(FSM_CONTROL_4)) {
            gmaj_inc_program();
        }
    }

    sw_last = sw_curr;
}
