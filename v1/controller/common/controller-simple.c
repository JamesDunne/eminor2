/*
    Programmable e-minor MIDI foot controller v2.

    Currently designed to work with:
    RJM Mini Amp Gizmo controlling a 3-channel Mark V amplifier
    t.c. electronic g-major effects unit.

    Assumptions:
    g-major listens on MIDI channel 1
    g-major listens for program change messages and CC messages
    RJM listens on MIDI channel 2
    RJM listens for program change messages with program #s 1-6

    Possible hardware layout diagram:

    (o)     = SPST rugged foot-switch
    (*)     = Single on/off LED
    [ ... ] = LED 7-segment (or more) display
    {\}		= slider switch

    PWR  MIDI OUT EXPR IN (opt)
    |      ||      ||
    /--------------------\
    |                    |
    | [8 8 8 8] {\}  [8] |
    |                    |
    | (*)  (*)  (*)  (*) |
    | (o)  (o)  (o)  (o) |
    | DLY  CHO  FLT  PIT |
    |                    |
    | (o)  (o)  (o)  (o) |
    |  1    2    3    4  |
    |                    |
    \--------------------/

    Written by James S. Dunne
    Original: 2007-04-05
    Updated:  2013-11-22
    */

#include "../common/types.h"
#include "../common/hardware.h"

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

// FX button labels:
#define fxb_compressor  0
#define fxb_filter      1
#define fxb_pitch       2
#define fxb_chorus      3
#define fxb_delay       4
#define fxb_reverb      5
#define fxb_noisegate   6
#define fxb_eq          7

// FX button enable bitmasks:
#define fxm_compressor  0x01
#define fxm_filter      0x02
#define fxm_pitch       0x04
#define fxm_chorus      0x08
#define fxm_delay       0x10
#define fxm_reverb      0x20
#define fxm_noisegate   0x40
#define fxm_eq          0x80

u32	sw_curr, sw_last;

u8	rjm_channel;

/* initial continuous controller toggle bits per preset: */
u8 chan_effects[4];
u8 rjm_channel;

/* continuous controller values: */
u8 control_press_values[4];

/* timers for preset button hold time */
u8 timer_control4, timer_control4_enable;

/* constant continuous controller numbers: */
u8 control_value_tap_tempo, control_value_tuner_mute;

/* current control on/off toggle bits */
u8 preset_controltoggle;

/* is tuner mute on or off? */
u8 flag_tuner_mute;
u8 control_tuner_toggle;
u32 control4_button_mask;

/* convert integer to ASCII in fixed number of chars, right-aligned */
void itoa_fixed(u8 n, char s[LEDS_MAX_ALPHAS]) {
    u8 i = LEDS_MAX_ALPHAS - 1;

    do {
        s[i--] = (n % 10) + '0';
    } while ((n /= 10) > 0);

    /* pad the left chars with spaces: */
    for (; i > 0; --i) s[i] = ' ';
    s[i] = ' ';
}

/* display a program value in decimal with a leading 'P': */
void show_program(u8 value) {
    char	a[LEDS_MAX_ALPHAS];
    a[0] = 'P';
    a[1] = 'r';
    a[2] = 'o';
    a[3] = 'g';
    leds_show_4alphas(a);
    leds_show_1digit(value + 1);
}

/* determine if a footswitch was pressed: */
u8 button_pressed(u32 mask) {
    return ((sw_curr & mask) == mask) && ((sw_last & mask) == 0);
}

/* determine if still holding footswitch: */
u8 button_held(u32 mask) {
    return (sw_curr & mask) == mask;
}

/* determine if a footswitch was released: */
u8 button_released(u32 mask) {
    return ((sw_last & mask) == mask) && ((sw_curr & mask) == 0);
}

// Set g-major CC value
static void gmaj_cc_set(u8 cc, u8 val) {
    midi_send_cmd2(0xB, gmaj_midi_channel, cc, val);
}

void set_toggle_leds(void) {
    u8 fx = chan_effects[rjm_channel];
    if (fx & fxm_delay) fsw_led_enable(0); else fsw_led_disable(0);
    if (fx & fxm_chorus) fsw_led_enable(1); else fsw_led_disable(1);
    if (fx & fxm_filter) fsw_led_enable(2); else fsw_led_disable(2);
    if (fx & fxm_pitch) fsw_led_enable(3); else fsw_led_disable(3);
}

static void update_effects_MIDI_state(void) {
    u8 fx = chan_effects[rjm_channel];

    // Assume g-major effects are in a random state so switch each on/off according to desired state:
    gmaj_cc_set(gmaj_cc_noisegate, (fx & fxm_noisegate) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_delay, (fx & fxm_delay) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_pitch, (fx & fxm_pitch) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_filter, (fx & fxm_filter) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_chorus, (fx & fxm_chorus) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_compressor, (fx & fxm_compressor) ? 0x7F : 0x00);
}

void set_rjm_channel(u8 idx) {
    u8 pgm;

    if (idx == 0) pgm = 4;
    else if (idx == 1) pgm = 6;
    else if (idx == 2) pgm = 8;
    else if (idx == 3) pgm = 9;
    else return;

    rjm_channel = idx;

    /* Send the MIDI PROGRAM CHANGE message to the RJM to switch amp channel: */
    midi_send_cmd1(0xC, rjm_midi_channel, pgm);

    // Send MIDI effects enable commands and set effects LEDs:
    update_effects_MIDI_state();

    /* Display the program value on the 4-digit display */
    show_program(idx);

    set_toggle_leds();
}

void control_toggleidx(u8 idx) {
    u8 togglevalue = 0x00;
    u8 idx_mask;

    if (idx == 0) idx_mask = fxm_delay;
    else if (idx == 1) idx_mask = fxm_chorus;
    else if (idx == 2) idx_mask = fxm_filter;
    else if (idx == 3) idx_mask = fxm_pitch;
    else return;

    // Toggle on/off the selected continuous controller:
    chan_effects[rjm_channel] ^= idx_mask;

    // Determine the MIDI value to use depending on the newly toggled state:
    if (chan_effects[rjm_channel] & idx_mask) togglevalue = 0x7F;
    gmaj_cc_set(control_press_values[idx], togglevalue);

    set_toggle_leds();
}

void control_on(u8 cc) {
    gmaj_cc_set(cc, 0x7F);
}

void control_tgl(u8 cc, u8* old) {
    if (*old != 0) *old = 0; else *old = 0x7F;
    gmaj_cc_set(cc, *old);
}

void control_off(u8 cc) {
    gmaj_cc_set(cc, 0x00);
}

void enable_tuner_mute(void) {
    char	a[LEDS_MAX_ALPHAS];
    a[0] = 't';
    a[1] = 'u';
    a[2] = 'n';
    a[3] = 'E';

    leds_show_4alphas(a);
    control_on(gmaj_cc_mute);
    flag_tuner_mute = 1;
}

void reset_tuner_mute(u32 mask) {
    control4_button_mask = mask;
    timer_control4 = 75;
    timer_control4_enable = 1;

    if (flag_tuner_mute == 0) return;

    flag_tuner_mute = 0;
    control_off(gmaj_cc_mute);
    show_program(rjm_channel);
}

/* ------------------------- Actual controller logic ------------------------- */

/* set the controller to an initial state */
void controller_init(void) {
    /* controller numbers for Bn commands that will be toggled on|off with 0|127 data */
    control_press_values[0] = gmaj_cc_delay;
    control_press_values[1] = gmaj_cc_chorus;
    control_press_values[2] = gmaj_cc_filter;
    control_press_values[3] = gmaj_cc_pitch;

    /* default bitfield states for preset programs: */
    chan_effects[0] = fxm_compressor;
    chan_effects[1] = fxm_noisegate;
    chan_effects[2] = fxm_noisegate;
    chan_effects[3] = fxm_noisegate | fxm_delay;

    timer_control4 = 0;
    timer_control4_enable = 0;
    control_tuner_toggle = 0;
    flag_tuner_mute = 0;
    control4_button_mask = FSM_PRESET_1;

    set_rjm_channel(0);
}

/* called every 10ms */
void controller_10msec_timer(void) {
    /* decrement the control4 timer if it's active */
    if (timer_control4 > 0) --timer_control4;
}

/* main control loop */
void controller_handle(void) {
    /* poll foot-switch depression status: */
    sw_curr = fsw_poll();

    /* one of BOTTOM preset 1-4 pressed: */
    if (button_pressed(FSM_PRESET_1)) {
        if (rjm_channel != 0) {
            set_rjm_channel(0);
        } else {
            // tap tempo function if preset is already active:
            control_tgl(gmaj_cc_taptempo, &control_tuner_toggle);
        }
        reset_tuner_mute(FSM_PRESET_1);
    }
    if (button_pressed(FSM_PRESET_2)) {
        if (rjm_channel != 1) {
            set_rjm_channel(1);
        } else {
            // tap tempo function if preset is already active:
            control_tgl(gmaj_cc_taptempo, &control_tuner_toggle);
        }
        reset_tuner_mute(FSM_PRESET_2);
    }
    if (button_pressed(FSM_PRESET_3)) {
        if (rjm_channel != 2) {
            set_rjm_channel(2);
        } else {
            // tap tempo function if preset is already active:
            control_tgl(gmaj_cc_taptempo, &control_tuner_toggle);
        }
        reset_tuner_mute(FSM_PRESET_3);
    }
    if (button_pressed(FSM_PRESET_4)) {
        if (rjm_channel != 3) {
            set_rjm_channel(3);
        } else {
            // tap tempo function if preset is already active:
            control_tgl(gmaj_cc_taptempo, &control_tuner_toggle);
        }
        reset_tuner_mute(FSM_PRESET_4);
    }

    /* check if the last tuner-mute button was held long enough */
    if ((timer_control4_enable != 0) && button_held(control4_button_mask) && (timer_control4 == 0)) {
        enable_tuner_mute();
        timer_control4 = 0;
        timer_control4_enable = 0;
    }
    /* break the tuner mute timer if the button was released early */
    if ((timer_control4_enable != 0) && !button_held(control4_button_mask)) {
        timer_control4 = 0;
        timer_control4_enable = 0;
    }

    /* one of TOP control 1-4 pressed: */
    if (button_pressed(FSM_CONTROL_1)) {
        control_toggleidx(0);
    }
    if (button_pressed(FSM_CONTROL_2)) {
        control_toggleidx(1);
    }
    if (button_pressed(FSM_CONTROL_3)) {
        control_toggleidx(2);
    }
    if (button_pressed(FSM_CONTROL_4)) {
        control_toggleidx(3);
    }

    sw_last = sw_curr;
}
