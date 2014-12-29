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
    | {\}    [8 8 8 8 8] |
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

    [ COMP ] [ MUTE ] [STORE ] [ EXIT ]
    [  -5  ] [  -1  ] [  +1  ] [  +5  ]

    Written by James S. Dunne
    Original: 2007-04-05
    Updated:  2014-04-14
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

u8 control_press_values[6];

u8 sw_curr, sw_last;

// Initial bad values to force setting on init:
u8 rjm_channel = 255;
u8 emin_program = 255;

u8 gmaj_program = 255;
u8 old_rjm_actual = 255;
u8 old_gmaj_program = 255;

// Initial desired values:
u8 new_rjm_channel = 0;
u8 new_emin_program = 0;

// current switch mode; holding any preset button for 500ms enables alternate mode.
u8 switch_mode = 0;

// Setlist mode or song mode
u8 slider = 0, old_slider = 255;
u8 setlist_mode = 0, old_setlist_mode = 255;

// Current program data:
struct program pr;
// Current setlist data:
struct set_list sl;

// timers for preset button hold time
u8 timer_control4 = 0, timer_control4_enable = 0;
u8 timer_alt = 0;
u8 stored = 0;

// is tuner mute on or off?
u8 mute_toggle = 0;
u8 tap_toggle = 0;
u8 control4_button_mask = 0;

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
static void show_program(void) {
    char s[LEDS_MAX_ALPHAS];

    if (setlist_mode == 0) {
        ralign_itoa10(new_emin_program + 1, s);
    } else {
        ralign_itoa10(new_emin_program + sl.song_offset + 1, s);
    }

    if (switch_mode != 0) {
        // Alternate switch mode.

        // Show 'A' in first position:
        s[0] = 'A';
    }

    // Update 4-char display:
    leds_show_4alphas(s);

    // Show the channel # in the single-digit display:
    switch (new_rjm_channel) {
        case 0: leds_show_1digit(1); break;
        case 2: leds_show_1digit(2); break;
        case 4: leds_show_1digit(3); break;
        case 5: leds_show_1digit(4); break;
        default: break;
    }
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

// Set g-major CC value
static void gmaj_cc_set(u8 cc, u8 val) {
    midi_send_cmd2(0xB, gmaj_midi_channel, cc, val);
}

static void set_toggle_leds(void) {
    u8 fx = pr.fx[rjm_channel];
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
    u8 fx = pr.fx[rjm_channel];

    // Assume g-major effects are in a random state so switch each on/off according to desired state:
    gmaj_cc_set(gmaj_cc_noisegate, (fx & fxm_noisegate) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_delay, (fx & fxm_delay) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_pitch, (fx & fxm_pitch) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_filter, (fx & fxm_filter) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_chorus, (fx & fxm_chorus) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_compressor, (fx & fxm_compressor) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_reverb, (fx & fxm_reverb) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_eq, (fx & fxm_eq) ? 0x7F : 0x00);
}

// Disable mute if enabled
static void disable_mute(void) {
    if (mute_toggle)
    {
        mute_toggle = 0x00;
        gmaj_cc_set(gmaj_cc_mute, mute_toggle);
    }
}

static void set_rjm_channel(u8 idx) {
    new_rjm_channel = idx;
}

// activate sends MIDI messages to update external devices to current state
static void activate(void) {
    //if (new_rjm_channel > 5) return;

    // Get the RJM channel descriptor:
    u8 descidx = new_rjm_channel >> 1;
    u8 rshr = (rjm_shr_to_4bits * (new_rjm_channel & 1));
    u8 rdesc = (pr.rjm_desc[descidx] >> rshr) & 0x0F;

    // RJM channels start at 4 and alternate solo mode off/on and then increment channel #s:
    u8 mkv_chan = (rdesc & rjm_channel_mask);
    u8 mkv_solo_bit = ((rdesc & rjm_solo_mask) >> rjm_solo_shr_to_1bit);
    u8 new_rjm_actual = 4 + ((mkv_chan << 1) | mkv_solo_bit);

    u8 new_gmaj_program = pr.gmaj_program - 1;

    if (new_rjm_channel != rjm_channel)
        rjm_channel = new_rjm_channel;

    // Update 7-segment displays:
    show_program();
    set_toggle_leds();

    // Update RJM if we need to:
    if (new_rjm_actual != old_rjm_actual) {
        old_rjm_actual = new_rjm_actual;
        midi_send_cmd1(0xC, rjm_midi_channel, new_rjm_actual);
    }

    // Update g-major if we need to:
    if (new_gmaj_program != gmaj_program) {
        // Force both the g-major and RJM to update:
        gmaj_program = new_gmaj_program;
        midi_send_cmd1(0xC, gmaj_midi_channel, gmaj_program);
    }

    emin_program = new_emin_program;

    // Disable mute if enabled:
    disable_mute();

    // Send MIDI effects enable commands and set effects LEDs:
    update_effects_MIDI_state();
}

static void store_program_state(void) {
    // Store effects on/off state of current program:
    u8 i;

    pr.rjm_initial = new_rjm_channel;

    // Store program state:
    if (setlist_mode == 0) {
        // Raw program mode:
        flash_store((u16)emin_program * sizeof(struct program), sizeof(struct program), (u8 *)&pr);
    } else {
        // Setlist mode:
        u8 program = sl.entries[emin_program].program;
        if (program != 0xFF) {
            flash_store((u16)program * sizeof(struct program), sizeof(struct program), (u8 *)&pr);
        }
    }
}

// prepares the next g-major program to load
static void prepare_emin_program(void) {
    u8 i;

    // Load effects on/off state data from persistent storage:
    if (setlist_mode == 0) {
        // Raw program selection:
        flash_load((u16)new_emin_program * sizeof(struct program), sizeof(struct program), (u8 *)&pr);
    } else {
        // Setlist selection:
        u8 program;
        if (new_emin_program >= sl.count)
            new_emin_program = sl.count - 1;
        program = sl.entries[new_emin_program].program;
        flash_load((u16)program * sizeof(struct program), sizeof(struct program), (u8 *)&pr);
    }

    if (pr.name[0] == 0) {
        // Empty program name? That signifies a zeroed-out program. Let's set up some reasonable defaults:

        // Program name is the program number in decimal:
        ralign_itoa10(new_emin_program + sl.song_offset + 1, pr.name);
        pr.name[4] = 0;

        pr.gmaj_program = new_emin_program + 1;

        pr.rjm_initial = 4;
        pr.rjm_desc[0] = (rjm_channel_1)
            | (rjm_channel_1 | rjm_solo_mask) << 4;
        pr.rjm_desc[1] = (rjm_channel_2)
            | (rjm_channel_2 | rjm_solo_mask) << 4;
        pr.rjm_desc[2] = (rjm_channel_3)
            | (rjm_channel_3 | rjm_solo_mask) << 4;

        pr.fx[0] = (fxm_compressor);
        pr.fx[1] = (fxm_compressor);
        pr.fx[2] = (fxm_noisegate);
        pr.fx[3] = (fxm_noisegate);
        pr.fx[4] = (fxm_noisegate);
        pr.fx[5] = (fxm_noisegate | fxm_delay);
    }

    // Find the initial channel:
    new_rjm_channel = pr.rjm_initial;

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
    pr.fx[rjm_channel] ^= idx_mask;

    // Determine the MIDI value to use depending on the newly toggled state:
    if (pr.fx[rjm_channel] & idx_mask) togglevalue = 0x7F;
    gmaj_cc_set(control_press_values[idx], togglevalue);

    set_toggle_leds();
}

static void gmaj_cc_toggle(u8 cc, u8* old) {
    if (*old != 0) *old = 0; else *old = 0x7F;
    gmaj_cc_set(cc, *old);
}

static void reset_timer4(u8 mask) {
    control4_button_mask = mask;
    timer_control4 = 60;
    timer_control4_enable = 1;
}

void activate_mode(void) {
    if (setlist_mode == 0) {
        // Raw program mode:

        if (old_setlist_mode == 1) {
            // Switch from setlist program to emin_program:
            new_emin_program = sl.entries[new_emin_program].program;
            prepare_emin_program();
            activate();
        }

        return;
    } else {
        // Setlist mode:

        // Load selected setlist:
        const u8 setlist_index = 0;     // TODO: make user-selectable.
        flash_load((u16)(128 * 0x20) + (u16)setlist_index * sizeof(struct set_list), sizeof(struct set_list), (u8 *)&sl);
        if (sl.count == 0) {
            // No songs in set; switch back to program mode:
            setlist_mode = 0;
            return;
        }

        if (old_setlist_mode == 0) {
            // Switch from emin_program to setlist program:
            u8 i;
            for (i = 0; i < sl.count; i++) {
                if (sl.entries[i].program == new_emin_program) {
                    new_emin_program = i;
                    break;
                }
            }
            prepare_emin_program();
            activate();
        }

        return;
    }
}

// ------------------------- Actual controller logic -------------------------

// set the controller to an initial state
void controller_init(void) {
    // Initial bad values to force setting on init:
    rjm_channel = 255;
    emin_program = 255;
    
    gmaj_program = 255;
    old_rjm_actual = 255;
    old_gmaj_program = 255;
    
    new_rjm_channel = 0;
    new_emin_program = 0;

    switch_mode = 0;
    
    // Setlist mode or song mode
    slider = 0;
    old_slider = 255;
    setlist_mode = 1;
    old_setlist_mode = 255;

    // This should be overwritten instantly by prepare_emin_program()
    pr.fx[0] = 0;
    pr.fx[1] = fxm_delay;
    pr.fx[2] = 0;
    pr.fx[3] = fxm_delay;
    pr.fx[4] = 0;
    pr.fx[5] = fxm_delay;

    sl.count = 0;
    sl.song_offset = 0;

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

    // Poll the setlist/program slider switch:
    slider = slider_poll();
    old_slider = slider;
    setlist_mode = slider;

    activate_mode();
    old_setlist_mode = setlist_mode;

    // Initialize e-minor program to 0:
    new_emin_program = 0;
    prepare_emin_program();
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
    // Poll the setlist/program slider switch:
    slider = slider_poll();
    if (slider != old_slider) {
        setlist_mode = slider;

        // activate_mode() can change setlist_mode if invalid data detected:
        activate_mode();
        old_setlist_mode = setlist_mode;

        old_slider = slider;
    }

    // poll foot-switch depression status:
    sw_curr = fsw_poll();

    if (switch_mode == 0) {
        // one of BOTTOM preset 1-4 pressed:
        if (button_pressed(FSM_PRESET_1)) {
            if (rjm_channel != 0) {
                set_rjm_channel(0);
            } else if (emin_program == new_emin_program) {
                // tap tempo function if preset is already active:
                gmaj_cc_toggle(gmaj_cc_taptempo, &tap_toggle);
                disable_mute();
            }
            activate();
            reset_timer4(FSM_PRESET_1);
        }
        if (button_pressed(FSM_PRESET_2)) {
            if (rjm_channel != 2) {
                set_rjm_channel(2);
            } else if (emin_program == new_emin_program) {
                // tap tempo function if preset is already active:
                gmaj_cc_toggle(gmaj_cc_taptempo, &tap_toggle);
                disable_mute();
            }
            activate();
            reset_timer4(FSM_PRESET_2);
        }
        if (button_pressed(FSM_PRESET_3)) {
            if (rjm_channel != 4) {
                set_rjm_channel(4);
            } else if (emin_program == new_emin_program) {
                // tap tempo function if preset is already active:
                gmaj_cc_toggle(gmaj_cc_taptempo, &tap_toggle);
                disable_mute();
            }
            activate();
            reset_timer4(FSM_PRESET_3);
        }
        if (button_pressed(FSM_PRESET_4)) {
            if (rjm_channel != 5) {
                set_rjm_channel(5);
            } else if (emin_program == new_emin_program) {
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
            store_program_state();

            // Inidicate that we stored successfully and flash LEDs:
            stored = 1;
            timer_alt = 0;

            // Exit alternate switch mode:
            switch_mode = 0;

            // Activate the selected program and settings:
            activate();
        } else if (button_released(FSM_CONTROL_3)) {
            set_toggle_leds();
        }

        if (button_pressed(FSM_CONTROL_4)) {
            // Exit alternate switch mode:
            switch_mode = 0;

            // Activate the selected program and settings:
            activate();
        }

        // prepare next g-major program:
        if (button_pressed(FSM_PRESET_1)) {
            if (new_emin_program < step_program_inc_dec) new_emin_program = 0;
            else new_emin_program -= step_program_inc_dec;

            prepare_emin_program();
        }
        if (button_pressed(FSM_PRESET_2)) {
            if (new_emin_program < 1) new_emin_program = 0;
            else new_emin_program--;

            prepare_emin_program();
        }

        if (button_pressed(FSM_PRESET_3)) {
            if (new_emin_program > 127 - 1) new_emin_program = 127;
            else new_emin_program++;

            prepare_emin_program();
        }
        if (button_pressed(FSM_PRESET_4)) {
            if (new_emin_program > 127 - step_program_inc_dec) new_emin_program = 127;
            else new_emin_program += step_program_inc_dec;

            prepare_emin_program();
        }
    }

    sw_last = sw_curr;
}
