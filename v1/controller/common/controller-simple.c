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
    {\}     = slider switch

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

    Alternate switch mode:

    [ COMP] [ MUTE] [STORE] [ EXIT]
    [  -5 ] [  -1 ] [  +1 ] [  +5 ]

    Written by James S. Dunne
    Original: 2007-04-05
    Updated:  2013-11-22
    */

#include "../common/types.h"
#include "../common/hardware.h"

#define step_program_inc_dec 5

// Hard-coded MIDI channel #s:
#define gmaj_midi_channel   0
#define rjm_midi_channel    1

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

/* initial continuous controller toggle bits per preset: */
u8 chan_effects[4] = {
    fxm_compressor,
    fxm_noisegate,
    fxm_noisegate,
    fxm_noisegate | fxm_delay
};

/* continuous controller values: */
u8 control_press_values[6] = {
    // Top-row 4 controls:
    gmaj_cc_delay,
    gmaj_cc_chorus,
    gmaj_cc_filter,
    gmaj_cc_pitch,
    // Top-row 2 controls in alternate mode:
    gmaj_cc_compressor,
    gmaj_cc_reverb
};

u32 sw_curr, sw_last;

u8 rjm_channel = 0;
u8 gmaj_program = 0;

// current switch mode; holding any preset button for 500ms enables alternate mode.
u8 switch_mode = 0;

/* timers for preset button hold time */
u8 timer_control4 = 0, timer_control4_enable = 0;
u8 timer_alt = 0;

/* is tuner mute on or off? */
u8 mute_toggle = 0;
u8 tap_toggle = 0;
u32 control4_button_mask = 0;

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

/* update 7-segment displays */
void show_program(void) {
    char s[LEDS_MAX_ALPHAS];
    u8 i = LEDS_MAX_ALPHAS - 1;

    // Show g-major program number in 4-char display, right-aligned space padded:
    u8 n = gmaj_program + 1;

    do {
        s[i--] = (n % 10) + '0';
    } while ((n /= 10) > 0);

    /* pad the left chars with spaces: */
    for (; i > 0; --i) s[i] = ' ';
    s[i] = ' ';

    if (switch_mode != 0) {
        // Alternate switch mode.

        // Show 'E' in first position:
        s[0] = 'E';
    }

    // Update 4-char display:
    leds_show_4alphas(s);

    // Show the channel # in the single-digit display:
    leds_show_1digit(rjm_channel + 1);
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
    if (switch_mode == 0) {
        if (fx & fxm_delay) fsw_led_enable(0); else fsw_led_disable(0);
        if (fx & fxm_chorus) fsw_led_enable(1); else fsw_led_disable(1);
        if (fx & fxm_filter) fsw_led_enable(2); else fsw_led_disable(2);
        if (fx & fxm_pitch) fsw_led_enable(3); else fsw_led_disable(3);
    } else {
        // Alternate switch mode:
        if (fx & fxm_compressor) fsw_led_enable(0); else fsw_led_disable(0);
        if (mute_toggle) fsw_led_enable(1); else fsw_led_disable(1);
        // 3rd LED on if STORE held:
        if (sw_curr & FSM_CONTROL_3) fsw_led_enable(2); else fsw_led_disable(2);
        // 4th LED always off:
        fsw_led_disable(3);
    }
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
    //gmaj_cc_set(gmaj_cc_reverb, (fx & fxm_reverb) ? 0x7F : 0x00);
}

void set_rjm_channel(u8 idx) {
    u8 pgm;

    if (idx == 0) pgm = 4;
    else if (idx == 1) pgm = 6;
    else if (idx == 2) pgm = 8;
    else if (idx == 3) pgm = 9;
    else return;

    rjm_channel = idx;

    // Disable mute if enabled:
    if (mute_toggle)
    {
        mute_toggle = 0x00;
        gmaj_cc_set(gmaj_cc_mute, mute_toggle);
    }

    /* Send the MIDI PROGRAM CHANGE message to the RJM to switch amp channel: */
    midi_send_cmd1(0xC, rjm_midi_channel, pgm);

    // Send MIDI effects enable commands and set effects LEDs:
    update_effects_MIDI_state();

    // Update 7-segment displays:
    show_program();

    set_toggle_leds();
}

void set_gmaj_program(void) {
    // Change g-major program:
    midi_send_cmd1(0xC, gmaj_midi_channel, gmaj_program);

    // TODO: load new channel states from flash!

    // Update MIDI effects state:
    update_effects_MIDI_state();

    // Update 7-segment display:
    show_program();
}

void control_toggleidx(u8 idx) {
    u8 togglevalue = 0x00;
    u8 idx_mask;

    if (idx == 0) idx_mask = fxm_delay;
    else if (idx == 1) idx_mask = fxm_chorus;
    else if (idx == 2) idx_mask = fxm_filter;
    else if (idx == 3) idx_mask = fxm_pitch;
    else if (idx == 4) idx_mask = fxm_compressor;
    else if (idx == 5) idx_mask = fxm_reverb;
    else return;

    // Toggle on/off the selected continuous controller:
    chan_effects[rjm_channel] ^= idx_mask;

    // Determine the MIDI value to use depending on the newly toggled state:
    if (chan_effects[rjm_channel] & idx_mask) togglevalue = 0x7F;
    gmaj_cc_set(control_press_values[idx], togglevalue);

    set_toggle_leds();
}

void gmaj_cc_toggle(u8 cc, u8* old) {
    if (*old != 0) *old = 0; else *old = 0x7F;
    gmaj_cc_set(cc, *old);
}

void reset_timer4(u32 mask) {
    control4_button_mask = mask;
    timer_control4 = 60;
    timer_control4_enable = 1;
}

/* ------------------------- Actual controller logic ------------------------- */

/* set the controller to an initial state */
void controller_init(void) {
    /* default bitfield states for preset programs: */
    chan_effects[0] = fxm_compressor;
    chan_effects[1] = fxm_noisegate;
    chan_effects[2] = fxm_noisegate;
    chan_effects[3] = fxm_noisegate | fxm_delay;

    switch_mode = 0;

    timer_control4 = 0;
    timer_control4_enable = 0;
    tap_toggle = 0;
    mute_toggle = 0;
    control4_button_mask = FSM_PRESET_1;

    set_rjm_channel(0);
}

/* called every 10ms */
void controller_10msec_timer(void) {
    /* decrement the control4 timer if it's active */
    if (timer_control4 > 0) --timer_control4;

    if (switch_mode != 0) {
        // Flash 4th LED while in alternate mode.
        if ((timer_alt++ & 15) <= 7) {
            fsw_led_enable(3);
        } else {
            fsw_led_disable(3);
        }
        if (timer_alt >= 16) timer_alt = 0;
    }
}

/* main control loop */
void controller_handle(void) {
    /* poll foot-switch depression status: */
    sw_curr = fsw_poll();

    if (switch_mode == 0) {
        /* one of BOTTOM preset 1-4 pressed: */
        if (button_pressed(FSM_PRESET_1)) {
            if (rjm_channel != 0) {
                set_rjm_channel(0);
            } else {
                // tap tempo function if preset is already active:
                gmaj_cc_toggle(gmaj_cc_taptempo, &tap_toggle);
            }
            reset_timer4(FSM_PRESET_1);
        }
        if (button_pressed(FSM_PRESET_2)) {
            if (rjm_channel != 1) {
                set_rjm_channel(1);
            } else {
                // tap tempo function if preset is already active:
                gmaj_cc_toggle(gmaj_cc_taptempo, &tap_toggle);
            }
            reset_timer4(FSM_PRESET_2);
        }
        if (button_pressed(FSM_PRESET_3)) {
            if (rjm_channel != 2) {
                set_rjm_channel(2);
            } else {
                // tap tempo function if preset is already active:
                gmaj_cc_toggle(gmaj_cc_taptempo, &tap_toggle);
            }
            reset_timer4(FSM_PRESET_3);
        }
        if (button_pressed(FSM_PRESET_4)) {
            if (rjm_channel != 3) {
                set_rjm_channel(3);
            } else {
                // tap tempo function if preset is already active:
                gmaj_cc_toggle(gmaj_cc_taptempo, &tap_toggle);
            }
            reset_timer4(FSM_PRESET_4);
        }

        /* break the timer if the button was released early */
        if ((timer_control4_enable != 0) && !button_held(control4_button_mask)) {
            timer_control4 = 0;
            timer_control4_enable = 0;
        }
        /* check if the last preset button was held long enough */
        if ((timer_control4_enable != 0) && button_held(control4_button_mask) && (timer_control4 == 0)) {
            // Enable alternate switch mode:
            switch_mode = 1;
            set_toggle_leds();
            show_program();

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
    } else {
        // Alternate switch mode to easily repurpose foot switches:
        //
        //   [ COMP] [ MUTE] [STORE] [ EXIT]
        //   [ -10 ] [  -1 ] [  +1 ] [ +10 ]
        //
        if (button_pressed(FSM_CONTROL_1)) {
            control_toggleidx(4);
        }
        if (button_pressed(FSM_CONTROL_2)) {
            gmaj_cc_toggle(gmaj_cc_mute, &mute_toggle);
            set_toggle_leds();
        }

        if (button_pressed(FSM_CONTROL_3)) {
            // TODO: store channel states to flash!
            set_toggle_leds();
        } else if (button_released(FSM_CONTROL_3)) {
            set_toggle_leds();
        }

        if (button_pressed(FSM_CONTROL_4)) {
            switch_mode = 0;
            set_toggle_leds();
            show_program();
        }

        // change g-major program:
        if (button_pressed(FSM_PRESET_1)) {
            if (gmaj_program < step_program_inc_dec) gmaj_program = 0;
            else gmaj_program -= step_program_inc_dec;

            set_gmaj_program();
        }
        if (button_pressed(FSM_PRESET_2)) {
            if (gmaj_program < 1) gmaj_program = 0;
            else gmaj_program--;

            set_gmaj_program();
        }

        if (button_pressed(FSM_PRESET_3)) {
            if (gmaj_program > 127 - 1) gmaj_program = 127;
            else gmaj_program++;

            set_gmaj_program();
        }
        if (button_pressed(FSM_PRESET_4)) {
            if (gmaj_program > 127 - step_program_inc_dec) gmaj_program = 127;
            else gmaj_program += step_program_inc_dec;

            set_gmaj_program();
        }
    }

    sw_last = sw_curr;
}
