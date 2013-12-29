/*
    Programmable e-minor MIDI foot controller v1.

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

// NOTE(jsd): Must be 8 to work with flash chunk boundaries
u8 chan_effects[8];

u8 control_press_values[6];

u32 sw_curr, sw_last;

u8 rjm_channel = 0;
u8 gmaj_program = 0;

u8 new_rjm_channel = 0;
u8 new_gmaj_program = 0;

// current switch mode; holding any preset button for 500ms enables alternate mode.
u8 switch_mode = 0;

// timers for preset button hold time
u8 timer_control4 = 0, timer_control4_enable = 0;
u8 timer_alt = 0;
u8 stored = 0;

// is tuner mute on or off?
u8 mute_toggle = 0;
u8 tap_toggle = 0;
u32 control4_button_mask = 0;

// update 7-segment displays
static void show_program(void) {
    char s[LEDS_MAX_ALPHAS];
    u8 i = LEDS_MAX_ALPHAS - 1;

    // Show g-major program number in 4-char display, right-aligned space padded:
    u8 n = new_gmaj_program + 1;

    do {
        s[i--] = (n % 10) + '0';
    } while ((n /= 10) > 0);

    // pad the left chars with spaces:
    for (; i > 0; --i) s[i] = ' ';
    s[i] = ' ';

    if (switch_mode != 0) {
        // Alternate switch mode.

        // Show 'E' in first position:
        s[0] = 'A';
    }

    // Update 4-char display:
    leds_show_4alphas(s);

    // Show the channel # in the single-digit display:
    leds_show_1digit(new_rjm_channel + 1);
}

// determine if a footswitch was pressed
static u8 button_pressed(u32 mask) {
    return ((sw_curr & mask) == mask) && ((sw_last & mask) == 0);
}

// determine if still holding footswitch
static u8 button_held(u32 mask) {
    return (sw_curr & mask) == mask;
}

// determine if a footswitch was released
static u8 button_released(u32 mask) {
    return ((sw_last & mask) == mask) && ((sw_curr & mask) == 0);
}

// Set g-major CC value
static void gmaj_cc_set(u8 cc, u8 val) {
    midi_send_cmd2(0xB, gmaj_midi_channel, cc, val);
}

static void set_toggle_leds(void) {
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

// Disable mute if enabled
static void disable_mute() {
    if (mute_toggle)
    {
        mute_toggle = 0x00;
        gmaj_cc_set(gmaj_cc_mute, mute_toggle);
    }
}

static void set_rjm_channel(u8 idx) {
    u8 pgm;

    if (idx == 0) pgm = 4;
    else if (idx == 1) pgm = 6;
    else if (idx == 2) pgm = 8;
    else if (idx == 3) pgm = 9;
    else return;

    new_rjm_channel = idx;
}

// activate sends MIDI messages to update external devices to current state
static void activate(void) {
    // Update g-major if we need to:
    if (new_gmaj_program != gmaj_program) {
        // Force both the g-major and RJM to update:
        gmaj_program = new_gmaj_program;

        // Send the MIDI PROGRAM CHANGE messages:
        if (new_rjm_channel != rjm_channel) {
            rjm_channel = new_rjm_channel;
            midi_send_cmd1(0xC, rjm_midi_channel, rjm_channel);
        }
        midi_send_cmd1(0xC, gmaj_midi_channel, gmaj_program);

        // Disable mute if enabled:
        disable_mute();

        // Send MIDI effects enable commands and set effects LEDs:
        update_effects_MIDI_state();

        // Update 7-segment displays:
        show_program();

        set_toggle_leds();

        return;
    }

    // Update RJM if we need to:
    if (new_rjm_channel != rjm_channel) {
        rjm_channel = new_rjm_channel;

        // Send the MIDI PROGRAM CHANGE message to the RJM to switch amp channel:
        midi_send_cmd1(0xC, rjm_midi_channel, rjm_channel);

        // Disable mute if enabled:
        disable_mute();

        // Send MIDI effects enable commands and set effects LEDs:
        update_effects_MIDI_state();

        // Update 7-segment displays:
        show_program();

        set_toggle_leds();
    }
}

// prepares the next g-major program to load
static void prepare_gmaj_program(void) {
    u8 tmp[8];

    // Load channel states from flash memory:
    // NOTE(jsd): Use multiple of 8 to avoid crossing 64-byte boundaries in flash!
    flash_load((u16)new_gmaj_program * 8, 8, tmp);

    // NOTE(jsd): Since user has no way to turn on/off these settings yet, we force them here.
    // All overdrive channels get noise gate on and clean channels don't:
    tmp[0] &= ~fxm_noisegate;
    tmp[1] &= ~fxm_noisegate;
    tmp[2] |= fxm_noisegate;
    tmp[3] |= fxm_noisegate;
    tmp[4] |= fxm_noisegate;
    tmp[5] |= fxm_noisegate;

    // Remap from v2 memory layout to our v1 layout:
    chan_effects[0] = tmp[0];
    chan_effects[1] = tmp[2];
    chan_effects[2] = tmp[4];
    chan_effects[3] = tmp[5];

    // Map starting v2 channel to v1:
    if (tmp[6] == 0) new_rjm_channel = 0;
    else if (tmp[6] == 1) new_rjm_channel = 0;
    else if (tmp[6] == 2) new_rjm_channel = 1;
    else if (tmp[6] == 3) new_rjm_channel = 1;
    else if (tmp[6] == 4) new_rjm_channel = 2;
    else if (tmp[6] == 5) new_rjm_channel = 3;

    // Update 7-segment display:
    show_program();
}

static void control_toggleidx(u8 idx) {
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

static void gmaj_cc_toggle(u8 cc, u8* old) {
    if (*old != 0) *old = 0; else *old = 0x7F;
    gmaj_cc_set(cc, *old);
}

static void reset_timer4(u32 mask) {
    control4_button_mask = mask;
    timer_control4 = 60;
    timer_control4_enable = 1;
}

// ------------------------- Actual controller logic -------------------------

// set the controller to an initial state
void controller_init(void) {
    // default bitfield states for preset programs:
    chan_effects[0] = fxm_compressor;
    chan_effects[1] = fxm_noisegate;
    chan_effects[2] = fxm_noisegate;
    chan_effects[3] = fxm_noisegate | fxm_delay;

    // continuous controller values:
    // Top-row 4 controls:
    control_press_values[0] = gmaj_cc_delay;
    control_press_values[1] = gmaj_cc_chorus;
    control_press_values[2] = gmaj_cc_filter;
    control_press_values[3] = gmaj_cc_pitch;
    // Top-row 2 controls in alternate mode:
    control_press_values[4] = gmaj_cc_compressor;
    //control_press_values[5] = gmaj_cc_reverb;

    switch_mode = 0;

    timer_control4 = 0;
    timer_control4_enable = 0;
    tap_toggle = 0;
    mute_toggle = 0;
    control4_button_mask = FSM_PRESET_1;

    // Initialize g-major program to 0:
    gmaj_program = 0;
    prepare_gmaj_program();
    activate();
}

// called every 10ms
void controller_10msec_timer(void) {
    // decrement the control4 timer if it's active
    if (timer_control4 > 0) --timer_control4;

    if (switch_mode != 0) {
        // Blink 3rd and 4th LEDs while in alternate mode.
        if ((timer_alt++ & 31) <= 15) {
            fsw_led_disable(2);
            fsw_led_enable(3);
        } else {
            fsw_led_enable(2);
            fsw_led_disable(3);
        }
        if (timer_alt >= 32) timer_alt = 0;
    } else if (stored) {
        // Blink all top LEDs for a little bit if we just stored state:
        if ((timer_alt++ & 31) <= 15) {
            fsw_led_enable(0);
            fsw_led_enable(1);
            fsw_led_enable(2);
            fsw_led_enable(3);
        } else {
            fsw_led_disable(0);
            fsw_led_disable(1);
            fsw_led_disable(2);
            fsw_led_disable(3);
        }
        if (timer_alt >= 80) {
            timer_alt = 0;
            stored = 0;
            // Update to original LED state:
            set_toggle_leds();
        }
    }
}

// main control loop
void controller_handle(void) {
    // poll foot-switch depression status:
    sw_curr = fsw_poll();

    if (switch_mode == 0) {
        // one of BOTTOM preset 1-4 pressed:
        if (button_pressed(FSM_PRESET_1)) {
            if (rjm_channel != 0) {
                set_rjm_channel(0);
            } else if (gmaj_program == new_gmaj_program) {
                // tap tempo function if preset is already active:
                gmaj_cc_toggle(gmaj_cc_taptempo, &tap_toggle);
                disable_mute();
            }
            activate();
            reset_timer4(FSM_PRESET_1);
        }
        if (button_pressed(FSM_PRESET_2)) {
            if (rjm_channel != 1) {
                set_rjm_channel(1);
            } else if (gmaj_program == new_gmaj_program) {
                // tap tempo function if preset is already active:
                gmaj_cc_toggle(gmaj_cc_taptempo, &tap_toggle);
                disable_mute();
            }
            activate();
            reset_timer4(FSM_PRESET_2);
        }
        if (button_pressed(FSM_PRESET_3)) {
            if (rjm_channel != 2) {
                set_rjm_channel(2);
            } else if (gmaj_program == new_gmaj_program) {
                // tap tempo function if preset is already active:
                gmaj_cc_toggle(gmaj_cc_taptempo, &tap_toggle);
                disable_mute();
            }
            activate();
            reset_timer4(FSM_PRESET_3);
        }
        if (button_pressed(FSM_PRESET_4)) {
            if (rjm_channel != 3) {
                set_rjm_channel(3);
            } else if (gmaj_program == new_gmaj_program) {
                // tap tempo function if preset is already active:
                gmaj_cc_toggle(gmaj_cc_taptempo, &tap_toggle);
                disable_mute();
            }
            activate();
            reset_timer4(FSM_PRESET_4);
        }

        // break the timer if the button was released early
        if ((timer_control4_enable != 0) && !button_held(control4_button_mask)) {
            timer_control4 = 0;
            timer_control4_enable = 0;
        }
        // check if the last preset button was held long enough
        if ((timer_control4_enable != 0) && button_held(control4_button_mask) && (timer_control4 == 0)) {
            // Enable alternate switch mode:
            switch_mode = 1;
            set_toggle_leds();
            show_program();

            timer_control4 = 0;
            timer_control4_enable = 0;
        }

        // one of TOP control 1-4 pressed:
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
        //
        //   [  -5 ] [  -1 ] [  +1 ] [  +5 ]
        //
        if (button_pressed(FSM_CONTROL_1)) {
            control_toggleidx(4);
        }
        if (button_pressed(FSM_CONTROL_2)) {
            gmaj_cc_toggle(gmaj_cc_mute, &mute_toggle);
            set_toggle_leds();
        }

        if (button_pressed(FSM_CONTROL_3)) {
            // Map v1 memory layout to v2 memory layout:
            u8 tmp[8];
            tmp[0] = chan_effects[0];
            tmp[1] = chan_effects[0];
            tmp[2] = chan_effects[1];
            tmp[3] = chan_effects[1];
            tmp[4] = chan_effects[2];
            tmp[5] = chan_effects[3];
            // Store the initial channel: (map channel # from v1 to v2):
            if (rjm_channel == 0) tmp[6] = 0;
            else if (rjm_channel == 1) tmp[6] = 2;
            else if (rjm_channel == 2) tmp[6] = 4;
            else if (rjm_channel == 3) tmp[6] = 5;
            // Unused:
            tmp[7] = 0;

            // Store effects on/off state of current program:
            // NOTE(jsd): Use multiple of 8 to avoid crossing 64-byte boundaries in flash!
            flash_store((u16)gmaj_program * 8, 8, tmp);

            set_toggle_leds();

            // Inidicate that we stored successfully and flash LEDs:
            stored = 1;
            timer_alt = 0;

            // Exit alternate switch mode:
            switch_mode = 0;
            set_toggle_leds();
            show_program();
        } else if (button_released(FSM_CONTROL_3)) {
            set_toggle_leds();
        }

        if (button_pressed(FSM_CONTROL_4)) {
            // Exit alternate switch mode:
            switch_mode = 0;
            set_toggle_leds();
            show_program();
        }

        // change g-major program:
        if (button_pressed(FSM_PRESET_1)) {
            if (new_gmaj_program < step_program_inc_dec) new_gmaj_program = 0;
            else new_gmaj_program -= step_program_inc_dec;

            prepare_gmaj_program();
        }
        if (button_pressed(FSM_PRESET_2)) {
            if (new_gmaj_program < 1) new_gmaj_program = 0;
            else new_gmaj_program--;

            prepare_gmaj_program();
        }

        if (button_pressed(FSM_PRESET_3)) {
            if (new_gmaj_program > 127 - 1) new_gmaj_program = 127;
            else new_gmaj_program++;

            prepare_gmaj_program();
        }
        if (button_pressed(FSM_PRESET_4)) {
            if (new_gmaj_program > 127 - step_program_inc_dec) new_gmaj_program = 127;
            else new_gmaj_program += step_program_inc_dec;

            prepare_gmaj_program();
        }
    }

    sw_last = sw_curr;
}
