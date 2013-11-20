/*
    Programmable e-minor MIDI foot controller v2.

    Currently designed to work with:
        RJM Mini Amp Gizmo controlling a 3-channel Mark V amplifier
        t.c. electronic g-major effects unit.

    Assumptions:
        g-major listens on MIDI channel 1
        g-major listens for program change messages
        RJM listens on MIDI channel 2
        RJM listens for program change messages with program #s 1-6

    Footswitch layout:
          *      *      *      *      *      *      *
         CMP    FLT    PIT    CHO    DLY    RVB    MUTE    PREV

          *      *      *      *      *      *
          1      1S     2      2S     3      3S    TAP     NEXT

    Written by James S. Dunne
    2013-11-17
*/

#include "../common/types.h"
#include "../common/hardware.h"

// Useful macros:
#define tglbit(VAR,Place) VAR ^= (1 << Place)

#if DEBUG
#define assert(e) if (!(e)) return;
#else
#define assert(e)
#endif

// Hard-coded MIDI channel #s:
#define	gmaj_midi_channel	0
#define	rjm_midi_channel	1

// G-major CC messages:
#define gmaj_cc_taptempo    80
#define gmaj_cc_mute        81

#define gmaj_cc_compressor  84
#define gmaj_cc_filter      85
#define gmaj_cc_pitch       86
#define gmaj_cc_chorus      87
#define gmaj_cc_delay       88
#define gmaj_cc_reverb      89

#define gmaj_cc_noisegate   90
#define gmaj_cc_eq          91

// Top row of controller buttons activate these CCs:
static u8 gmaj_cc_lookup[6] = {
    gmaj_cc_compressor,
    gmaj_cc_filter,
    gmaj_cc_pitch,
    gmaj_cc_chorus,
    gmaj_cc_delay,
    gmaj_cc_reverb
};

// Current and previous button state:
io16 fsw, fsw_last;
// Current LED state:
io16 leds;

// Toggle value for tap tempo:
u8 toggle_tap;

// Current g-major program #:
u8 gmajp;

// Determine if a footswitch was pressed
static u8 is_top_button_pressed(u8 mask) {
    return ((fsw.top.byte & mask) == mask) && ((fsw_last.top.byte & mask) == 0);
}

static u8 is_bot_button_pressed(u8 mask) {
    return ((fsw.bot.byte & mask) == mask) && ((fsw_last.bot.byte & mask) == 0);
}

static void send_leds() {
    u16 tmp = (u16)leds.bot.byte | ((u16)leds.top.byte << 8);
    led_set(tmp);
}

// Set RJM program to p (0-5)
static void rjm_program(u8 p) {
    assert(p < 6);

    // Send the MIDI PROGRAM CHANGE message to RJM Mini Amp Gizmo:
    // NOTE(jsd): add 4 for personal raisins; first 4 programs are reserved for existing v1 controller.
    midi_send_cmd1(0xC, rjm_midi_channel, p + 4);

    // Disable all top LEDs, preserve LEDs 7 and 8:
    leds.top.byte &= (M_7 | M_8);
    // Set only current program LED on, preserve LEDs 7 and 8:
    leds.bot.byte = (1 << p) | (leds.bot.byte & (M_7 | M_8));

    send_leds();
}

// Set g-major program to p (0-127)
static void gmaj_program(u8 p) {
    // Send the MIDI PROGRAM CHANGE message to t.c. electronic g-major effects unit:
    midi_send_cmd1(0xC, gmaj_midi_channel, p);

    // Disable all top LEDs, preserve LEDs 7 and 8:
    leds.top.byte &= (M_7 | M_8);
    // TODO: load program/channel state

    send_leds();
}

// Set g-major CC value
static void gmaj_cc_set(u8 cc, u8 val) {
    midi_send_cmd2(0xB, gmaj_midi_channel, cc, val);
}

// Reset g-major mute to off if on
static void reset_tuner_mute(void) {
    // Turn off mute if enabled:
    if (leds.top.bits._7) {
        leds.top.bits._7 = 0;
        gmaj_cc_set(gmaj_cc_mute, 0x00);
        send_leds();
    }
}

// Toggle a g-major CC effect
static void gmaj_toggle_cc(u8 idx) {
    u8 togglevalue = 0x00;
    u8 idxMask = (1 << idx);

    // Make sure we don't go out of range:
    assert(idx < 6);

    // Toggle on/off the selected continuous controller:
    leds.top.byte ^= idxMask;
    send_leds();

    // Determine the MIDI value to use depending on the newly toggled state:
    if (leds.top.byte & idxMask) togglevalue = 0x7F;

    // Send MIDI command:
    gmaj_cc_set(gmaj_cc_lookup[idx], togglevalue);
}


// ------------------------- Actual controller logic -------------------------

// set the controller to an initial state
void controller_init(void) {
    leds.top.byte = 0;
    leds.bot.byte = 0;
    // `gmaj_program` and `rjm_program` will both call led_set() to set LED state.

    gmajp = 0;
    gmaj_program(gmajp);
    rjm_program(0);
}

// called every 10ms
void controller_10msec_timer(void) {
    // No timers in use by this code.
}

// main control loop
void controller_handle(void) {
    // poll foot-switch depression status:
    u16 tmp = fsw_poll();
    fsw.bot.byte = tmp & 0xFF;
    fsw.top.byte = (tmp >> 8) & 0xFF;

    // handle top 6 FX block buttons:
    if (is_top_button_pressed(M_1)) {
        gmaj_toggle_cc(0);
    }
    if (is_top_button_pressed(M_2)) {
        gmaj_toggle_cc(1);
    }
    if (is_top_button_pressed(M_3)) {
        gmaj_toggle_cc(2);
    }
    if (is_top_button_pressed(M_4)) {
        gmaj_toggle_cc(3);
    }
    if (is_top_button_pressed(M_5)) {
        gmaj_toggle_cc(4);
    }
    if (is_top_button_pressed(M_6)) {
        gmaj_toggle_cc(5);
    }

    // handle bottom 6 amp selector buttons:
    if (is_bot_button_pressed(M_1)) {
        rjm_program(0);
        gmaj_program(gmajp);
        reset_tuner_mute();
    }
    if (is_bot_button_pressed(M_2)) {
        rjm_program(1);
        gmaj_program(gmajp);
        reset_tuner_mute();
    }
    if (is_bot_button_pressed(M_3)) {
        rjm_program(2);
        gmaj_program(gmajp);
        reset_tuner_mute();
    }
    if (is_bot_button_pressed(M_4)) {
        rjm_program(3);
        gmaj_program(gmajp);
        reset_tuner_mute();
    }
    if (is_bot_button_pressed(M_5)) {
        rjm_program(4);
        gmaj_program(gmajp);
        reset_tuner_mute();
    }
    if (is_bot_button_pressed(M_6)) {
        rjm_program(5);
        gmaj_program(gmajp);
        reset_tuner_mute();
    }

    // handle remaining 4 functions:

    if (is_top_button_pressed(M_7)) {
        // mute:
        leds.top.byte ^= M_7;
        gmaj_cc_set(gmaj_cc_mute, (leds.top.bits._7) ? 0x7F : 0x00);
        send_leds();
    }
    if (is_bot_button_pressed(M_7)) {
        // tap tempo function (does not use LED):
        toggle_tap = ~toggle_tap & 0x7F;
        gmaj_cc_set(gmaj_cc_taptempo, toggle_tap);
    }
    // Turn on the TAP LED while the TAP button is held:
    leds.bot.bits._7 = fsw.bot.bits._7;

    if (is_top_button_pressed(M_8)) {
        // prev g-major program:
        if (gmajp != 0) gmajp--;
        gmaj_program(gmajp);
    }
    // Turn on the PREV LED while the PREV button is held:
    leds.top.bits._8 = fsw.top.bits._8;
    if (is_bot_button_pressed(M_8)) {
        // next g-major program:
        if (gmajp != 127) gmajp++;
        gmaj_program(gmajp);
    }
    // Turn on the NEXT LED while the NEXT button is held:
    leds.bot.bits._8 = fsw.bot.bits._8;

    send_leds();

    // Record the previous switch state:
    fsw_last = fsw;
}
