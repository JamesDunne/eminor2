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
#define setbit(VAR,Place) VAR |= (1 << Place)
#define clrbit(VAR,Place) VAR &= ~(1 << Place)

#define chkbit(VAR,Place) (VAR & (1 << Place))
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
u16	sw_curr, sw_last;

// current control on/off toggle bits
u8 leds_top, leds_bot;

u8 toggle_tap;

// Current g-major program #:
u8 gmajp;

// determine if a footswitch was pressed:
static u8 button_pressed(u16 mask) {
    return ((sw_curr & mask) == mask) && ((sw_last & mask) == 0);
}

// Set RJM program to p (0-5)
static void rjm_program(u8 p) {
    assert(p < 6);

    // Send the MIDI PROGRAM CHANGE message to RJM Mini Amp Gizmo:
    // NOTE(jsd): add 4 for personal raisins; first 4 programs are reserved for existing v1 controller.
    midi_send_cmd1(0xC, rjm_midi_channel, p + 4);

    // Disable all top LEDs, preserve LEDs 7 and 8:
    leds_top &= (LEDM_7 | LEDM_8);
    // Set only current program LED on, preserve LEDs 7 and 8:
    leds_bot = (1 << p) | (leds_bot & (LEDM_7 | LEDM_8));

    led_set(leds_top, leds_bot);
}


// Set g-major program to p (0-127):
static void gmaj_program(u8 p) {
    // Send the MIDI PROGRAM CHANGE message to t.c. electronic g-major effects unit:
    midi_send_cmd1(0xC, gmaj_midi_channel, p);

    // Disable all top LEDs, preserve LEDs 7 and 8:
    leds_top &= (LEDM_7 | LEDM_8);

    led_set(leds_top, leds_bot);
}

static void gmaj_cc_set(u8 cc, u8 val) {
    midi_send_cmd2(0xB, gmaj_midi_channel, cc, val);
}

static void gmaj_cc_on(u8 cc) {
    gmaj_cc_set(cc, 0x7F);
}

static void gmaj_cc_off(u8 cc) {
    gmaj_cc_set(cc, 0x00);
}

static void reset_tuner_mute(void) {
    // Turn off mute if enabled:
    if (leds_top & LEDM_7) {
        leds_top &= ~LEDM_7;
        gmaj_cc_off(gmaj_cc_mute);
        led_set(leds_top, leds_bot);
    }
}

static void gmaj_toggle_cc(u8 idx) {
    u8 togglevalue = 0x00;

    assert(idx < 6);

    // Toggle on/off the selected continuous controller:
    tglbit(leds_top, idx);
    led_set(leds_top, leds_bot);

    // Determine the MIDI value to use depending on the newly toggled state:
    if (chkbit(leds_top, idx)) togglevalue = 0x7F;

    // Send MIDI command:
    gmaj_cc_set(gmaj_cc_lookup[idx], togglevalue);
}


// ------------------------- Actual controller logic -------------------------

// set the controller to an initial state
void controller_init(void) {
    leds_top = 0;
    leds_bot = 0;
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
    sw_curr = fsw_poll();

    // handle top 6 FX block buttons:
    if (button_pressed(FSM_TOP_1)) {
        gmaj_toggle_cc(0);
    }
    if (button_pressed(FSM_TOP_2)) {
        gmaj_toggle_cc(1);
    }
    if (button_pressed(FSM_TOP_3)) {
        gmaj_toggle_cc(2);
    }
    if (button_pressed(FSM_TOP_4)) {
        gmaj_toggle_cc(3);
    }
    if (button_pressed(FSM_TOP_5)) {
        gmaj_toggle_cc(4);
    }
    if (button_pressed(FSM_TOP_6)) {
        gmaj_toggle_cc(5);
    }

    // handle bottom 6 amp selector buttons:
    if (button_pressed(FSM_BOT_1)) {
        rjm_program(0);
        gmaj_program(gmajp);
        reset_tuner_mute();
    }
    if (button_pressed(FSM_BOT_2)) {
        rjm_program(1);
        gmaj_program(gmajp);
        reset_tuner_mute();
    }
    if (button_pressed(FSM_BOT_3)) {
        rjm_program(2);
        gmaj_program(gmajp);
        reset_tuner_mute();
    }
    if (button_pressed(FSM_BOT_4)) {
        rjm_program(3);
        gmaj_program(gmajp);
        reset_tuner_mute();
    }
    if (button_pressed(FSM_BOT_5)) {
        rjm_program(4);
        gmaj_program(gmajp);
        reset_tuner_mute();
    }
    if (button_pressed(FSM_BOT_6)) {
        rjm_program(5);
        gmaj_program(gmajp);
        reset_tuner_mute();
    }

    // handle remaining 4 functions:

    if (button_pressed(FSM_TOP_7)) {
        // mute:
        leds_top ^= LEDM_7;
        gmaj_cc_set(gmaj_cc_mute, (leds_top & LEDM_7) ? 0x7F : 0x00);
        led_set(leds_top, leds_bot);
    }
    if (button_pressed(FSM_BOT_7)) {
        // tap tempo function (does not use LED):
        toggle_tap = ~toggle_tap & 0x7F;
        gmaj_cc_set(gmaj_cc_taptempo, toggle_tap);
    }

    if (button_pressed(FSM_TOP_8)) {
        // prev g-major program:
        if (gmajp != 0) gmajp--;
        gmaj_program(gmajp);
    }
    if (button_pressed(FSM_BOT_8)) {
        // next g-major program:
        if (gmajp != 127) gmajp++;
        gmaj_program(gmajp);
    }

    // Record the previous switch state:
    sw_last = sw_curr;
}
