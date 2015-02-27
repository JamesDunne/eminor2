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

    Footswitch layout:
     *      *      *      *      *      *      *       *
    CMP    FLT    PIT    CHO    DLY    RVB    PROG    PREV
                                              MUTE

     *      *      *      *      *      *      *       *
     1      1S     2      2S     3      3S    TAP     NEXT
                                             STORE
------------------------------------------------------------
     *      *      *      *      *      *      *       *
    CMP    FLT    PIT    CHO    DLY    RVB    PREV    NEXT


     *      *      *      *      *      *      *       *
     1      1S     2      2S     3      3S    TAP    CANCEL
    MUTE                                     STORE        

    Written by
    James S. Dunne
    https://github.com/JamesDunne/
    2013-11-17
    */

// TODO: only change MIDI state when needed on channel-switch activation.
// Since effects state is persisted per channel, it is redundant to always
// update MIDI state on repeated activations.

#include <assert.h>
#include "../common/types.h"
#include "../common/hardware.h"

// Useful macros:
#define tglbit(VAR,Place) VAR ^= (1 << Place)

// Hard-coded MIDI channel #s:
#define	gmaj_midi_channel   0
#define	rjm_midi_channel    1

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
u8 gmaj_cc_lookup[8];

// Programming mode if non-zero:
u8 programming_mode;

// Setlist or program mode:
u8 setlist_mode;

// Current and previous button state:
io16 fsw, fsw_last;
// Current LED state per `programming_mode`:
io16 leds[2];

u16 curr_leds, last_leds;

// Toggle value for tap tempo:
u8 toggle_tap;

// Current g-major program # (0-127):
u8 gmaj_program;
// Next g-major program to update to:
u8 next_gmaj_program;

u8 rjm_channel;

// Current program data:
struct program pr;
// Decoded RJM channels:
u8 pr_rjm[6];

// Current set list:
struct set_list sl;
// Current set list index:
u8 sli, last_sli;
// Current program within current set list:
u8 slp, last_slp;

u8 mode_1_alt;
u8 mode_1_select;

#ifdef FEAT_LCD
char *lcd_rows[LCD_ROWS];
#endif

static s8 ritoa(u8 *s, u8 n, s8 i) {
    do {
        s[i--] = (n % 10) + '0';
    } while ((n /= 10) > 0);
    return i;
}

static s8 litoa(u8 *s, u8 n, s8 i) {
    // Write the integer to temporary storage:
    u8 tmp[3];
    s8 c = 0;
    do {
        tmp[c++] = (n % 10) + '0';
    } while ((n /= 10) > 0);
    // Write the left-aligned integer to the destination:
    for (c--; c >= 0; c--, i++) {
        s[i] = tmp[c];
    }
    return i;
}

// Loads ROM describing the initial on/off state of effects
void load_program_state(void) {
#if NOFLASH
    // defaults: all SOLO channels get delay enabled
    pr.fx[0] = 0;
    pr.fx[1] = fxm_delay;
    pr.fx[2] = 0;
    pr.fx[3] = fxm_delay;
    pr.fx[4] = 0;
    pr.fx[5] = fxm_delay;
#else
    u8 i;

    // Load effects on/off state data from persistent storage:
    flash_load((u16)gmaj_program * sizeof(struct program), sizeof(struct program), (u8 *)&pr);

    if (pr.name[0] == 0) {
        // Empty program name? That signifies a zeroed-out program. Let's set up some reasonable defaults:

        // Program name is the program number in decimal:
        //ritoa(pr.name, gmaj_program + sl.song_offset + 1, 3);
        pr.name[0] = ' ';
        pr.name[1] = ' ';
        pr.name[2] = ' ';
        ritoa(pr.name, gmaj_program + 1, 3);
        pr.name[4] = 0;

        pr.gmaj_program = gmaj_program + 1;

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

    for (i = 0; i < 6; ++i) {
        // Get the RJM channel descriptor:
        u8 descidx = i >> 1;
        u8 rshr = (i & 1) << 2;
        u8 rdesc = (pr.rjm_desc[descidx] >> rshr) & 0x0F;

        // RJM channels start at 4 and alternate solo mode off/on and then increment channel #s:
        u8 mkv_chan = (rdesc & rjm_channel_mask);
        u8 mkv_solo_bit = ((rdesc & rjm_solo_mask) >> rjm_solo_shr_to_1bit);
        u8 new_rjm_actual = ((mkv_chan << 1) | mkv_solo_bit);

        pr_rjm[i] = new_rjm_actual;
    }

    // Find the initial channel:
    rjm_channel = pr.rjm_initial;
#endif
}

static void store_program_state(void) {
    // Store effects on/off state of current program:
    pr.rjm_initial = rjm_channel;

    // Store program state:
    flash_store((u16)gmaj_program * sizeof(struct program), sizeof(struct program), (u8 *)&pr);
}

static void send_leds(void) {
    // Update LEDs:
    curr_leds = (u16)leds[programming_mode].bot.byte | ((u16)leds[programming_mode].top.byte << 8);
    if (curr_leds != last_leds) {
        led_set(curr_leds);
        last_leds = curr_leds;
    }
}

// Update LCD display:
static void update_lcd(void) {
#ifdef FEAT_LCD
    s8 i;

    if (programming_mode) {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[0][i] = " -- Programming --  "[i];
        }
    } else {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[0][i] = "                    "[i];
        }
    }

    if (setlist_mode == 0) {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[1][i] = "Program mode        "[i];
        }
    } else {
        // Show setlist data:
        u8 yyyy = sl.d1 >> 1;
        u8 mm = ((sl.d1 & 1) << 4) | (sl.d0 >> 5);
        u8 dd = (sl.d0 & 31);
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[1][i] = " 0) 2014-01-01   # 0"[i];
        }
        litoa(lcd_rows[1], sli + 1, 1);

        ritoa(lcd_rows[1], yyyy + 14, 7);
        ritoa(lcd_rows[1], mm + 1, 10);
        ritoa(lcd_rows[1], dd + 1, 13);

        ritoa(lcd_rows[1], slp + 1, 19);
    }

    // Show g-major program number, right-aligned space padded:
    i = ritoa(lcd_rows[2], gmaj_program + 1, LCD_COLS - 1);
    for (; i > LCD_COLS - 4; --i) lcd_rows[2][i] = ' ';

    // Show program name:
    for (i = 0; i < LCD_COLS; i++) {
        lcd_rows[3][i] = pr.name[i];
        if (pr.name[i] == 0) break;
    }
    for (; i < LCD_COLS; i++)
        lcd_rows[3][i] = ' ';

    lcd_updated_all();
#endif
}

// Set g-major CC value
static void gmaj_cc_set(u8 cc, u8 val) {
    midi_send_cmd2(0xB, gmaj_midi_channel, cc, val);
}

// Reset g-major mute to off if on
static void reset_tuner_mute(void) {
    // Turn off mute if enabled:
    if (leds[0].top.bits._7) {
        leds[0].top.bits._7 = 0;
        gmaj_cc_set(gmaj_cc_mute, 0x00);
        send_leds();
    }
}

// Toggle a g-major CC effect
static void gmaj_toggle_cc(u8 idx) {
    u8 togglevalue = 0x00;
    u8 idxMask;

    // Make sure we don't go out of range:
    assert(idx < 6);

    idxMask = (1 << idx);

    // Toggle on/off the selected continuous controller:
    pr.fx[rjm_channel] ^= idxMask;

    // Determine the MIDI value to use depending on the newly toggled state:
    if (pr.fx[rjm_channel] & idxMask) togglevalue = 0x7F;

    // Send MIDI command:
    gmaj_cc_set(gmaj_cc_lookup[idx], togglevalue);

    // Update LEDs:
    leds[0].top.byte = (pr.fx[rjm_channel] & ~(M_7 | M_8)) | (leds[0].top.byte & (M_7 | M_8));
    send_leds();
}

static void update_effects_MIDI_state(void) {
#if FX_ASSUME_OFF
    b8 n;
    n.byte = pr.fx[rjm_channel];

    // Assume all effects are off by default because g-major program change has just occurred.

    // Reset top LEDs to new state, preserve LEDs 7 and 8:
    leds[0].top.byte = (n.byte & ~(M_7 | M_8)) | (leds[0].top.byte & (M_7 | M_8));

    if (n.bits._7) {
        // turn on noise gate:
        gmaj_cc_set(gmaj_cc_lookup[6], 0x7F);
    }
    if (n.bits._5) {
        // turn on delay:
        gmaj_cc_set(gmaj_cc_lookup[4], 0x7F);
    }
    if (n.bits._6) {
        // turn on reverb:
        gmaj_cc_set(gmaj_cc_lookup[5], 0x7F);
    }
    if (n.bits._3) {
        // turn on pitch:
        gmaj_cc_set(gmaj_cc_lookup[2], 0x7F);
    }
    if (n.bits._2) {
        // turn on filter:
        gmaj_cc_set(gmaj_cc_lookup[1], 0x7F);
    }
    if (n.bits._4) {
        // turn on chorus:
        gmaj_cc_set(gmaj_cc_lookup[3], 0x7F);
    }
    if (n.bits._1) {
        // turn on compressor:
        gmaj_cc_set(gmaj_cc_lookup[0], 0x7F);
    }
    if (n.bits._8) {
        // turn on eq:
        gmaj_cc_set(gmaj_cc_lookup[7], 0x7F);
    }
#else
    u8 fx = pr.fx[rjm_channel];

    // Reset top LEDs to new state, preserve LEDs 7 and 8:
    leds[0].top.byte = (fx & ~(M_7 | M_8)) | (leds[0].top.byte & (M_7 | M_8));

    // Assume g-major effects are in a random state so switch each on/off according to desired state:
    gmaj_cc_set(gmaj_cc_noisegate, (fx & fxm_noisegate) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_delay, (fx & fxm_delay) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_pitch, (fx & fxm_pitch) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_filter, (fx & fxm_filter) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_chorus, (fx & fxm_chorus) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_compressor, (fx & fxm_compressor) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_reverb, (fx & fxm_reverb) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_eq, (fx & fxm_eq) ? 0x7F : 0x00);
#endif
}

static void rjm_activate(void) {
    // Send the MIDI PROGRAM CHANGE message to RJM Mini Amp Gizmo:
    midi_send_cmd1(0xC, rjm_midi_channel, pr_rjm[rjm_channel] + 4);

    // Send MIDI effects enable commands and set effects LEDs:
    update_effects_MIDI_state();

    // Set only current program LED on bottom, preserve LEDs 7 and 8:
    leds[0].bot.byte = (1 << rjm_channel) | (leds[0].bot.byte & (M_7 | M_8));

    send_leds();
}

// Set RJM program to p (0-5)
static void set_rjm_channel(u8 p) {
    assert(p < 6);

    rjm_channel = p;

    rjm_activate();
}

// Set g-major program:
static void set_gmaj_program(void) {
    // Load program from setlist:
    if (setlist_mode == 1) {
        next_gmaj_program = sl.entries[slp].program;
    }

    // Send the MIDI PROGRAM CHANGE message to t.c. electronic g-major effects unit:
    midi_send_cmd1(0xC, gmaj_midi_channel, next_gmaj_program);

    // Update internal state:
    gmaj_program = next_gmaj_program;

    // Load new effect states:
    load_program_state();

    rjm_activate();

    update_lcd();
}

static void switch_mode(u8 new_mode) {
    u8 i;

    setlist_mode = new_mode;
    if (setlist_mode == 1) {
        // Set mode:
        flash_load((u16)(128 * 0x20) + (u16)sli * sizeof(struct set_list), sizeof(struct set_list), (u8 *)&sl);
        slp = 0;
        set_gmaj_program();

        // No songs in set if `sl.count == 0`.
    }

    update_lcd();
}

static void switch_programming_mode(u8 new_mode) {
    leds[1].top.byte = 0;
    leds[1].bot.byte = 0;

    programming_mode = new_mode;
    update_lcd();
}

static void switch_mode_1_alt(u8 new_mode) {
    if (new_mode == 0) {
        leds[1].top.byte = 0;
        leds[1].bot.byte = 0;
    } else if (new_mode == 1) {
        // Show the selected preset on the bottom:
        leds[1].bot.byte = 1 << mode_1_select;
        // Show the current mapping on the top:
        leds[1].top.byte = 1 << pr_rjm[mode_1_select];
    }
    mode_1_alt = new_mode;
}

static void remap_preset(u8 preset, u8 new_rjm_channel) {
    // Get the RJM channel descriptor:
    u8 descidx = preset >> 1;
    u8 lshr = (preset & 1) << 2;
    u8 mask = 0xF0 >> lshr;

    u8 new_desc = ((new_rjm_channel >> 1) & rjm_channel_mask)
        | ((new_rjm_channel & 1) << rjm_solo_shr_to_1bit);
    // NOTE: we ignore EQ bit here; it's not really used anyway.

    // Update the RJM descriptor while preserving the other half:
    pr.rjm_desc[descidx] = (pr.rjm_desc[descidx] & mask)
        | (new_desc << lshr);

    pr_rjm[preset] = new_rjm_channel;
}

// Determine if a footswitch was pressed
static u8 is_top_button_pressed(u8 mask) {
    return ((fsw.top.byte & mask) == mask) && ((fsw_last.top.byte & mask) == 0);
}

static u8 is_bot_button_pressed(u8 mask) {
    return ((fsw.bot.byte & mask) == mask) && ((fsw_last.bot.byte & mask) == 0);
}

static u8 is_top_button_released(u8 mask) {
    return ((fsw_last.top.byte & mask) == mask) && ((fsw.top.byte & mask) == 0);
}

static u8 is_bot_button_released(u8 mask) {
    return ((fsw_last.bot.byte & mask) == mask) && ((fsw.bot.byte & mask) == 0);
}

// ------------------------- Actual controller logic -------------------------

u8 timeout_flash;

u8 timer_tapstore;
u8 timer_fx_held;
u8 timer_sw_held;
u8 timer_prog_held;
u8 timer_np_held, timer_np_advanced;

#define timer_tapstore_timeout  75
#define timer_fx_timeout        30
#define timer_sw_timeout        75
#define timer_prog_timeout      75

// set the controller to an initial state
void controller_init(void) {
    u8 i;

    setlist_mode = 1;
    programming_mode = 0;
    leds[0].top.byte = 0;
    leds[0].bot.byte = 0;
    leds[1].top.byte = 0;
    leds[1].bot.byte = 0;

    last_sli = 255;
    last_slp = 255;
    sli = 0;
    slp = 0;

    curr_leds = 0x0000U;
    last_leds = 0xFFFFU;

    timer_tapstore = 0;
    timer_fx_held = 0;
    timer_sw_held = 0;
    timer_np_held = 0;
    timer_np_advanced = 0;
    timer_prog_held = 0;

    timeout_flash = 0;

    rjm_channel = 0;
    gmaj_program = 0;
    next_gmaj_program = 0;
    
    gmaj_cc_lookup[0] = gmaj_cc_compressor;
    gmaj_cc_lookup[1] = gmaj_cc_filter;
    gmaj_cc_lookup[2] = gmaj_cc_pitch;
    gmaj_cc_lookup[3] = gmaj_cc_chorus;
    gmaj_cc_lookup[4] = gmaj_cc_delay;
    gmaj_cc_lookup[5] = gmaj_cc_reverb;
    gmaj_cc_lookup[6] = gmaj_cc_noisegate;
    gmaj_cc_lookup[7] = gmaj_cc_eq;

    // This should be overwritten instantly by load_program_state()
    pr.fx[0] = 0;
    pr.fx[1] = fxm_delay;
    pr.fx[2] = 0;
    pr.fx[3] = fxm_delay;
    pr.fx[4] = 0;
    pr.fx[5] = fxm_delay;

#ifdef FEAT_LCD
    for (i = 0; i < LCD_ROWS; ++i)
        lcd_rows[i] = lcd_row_get(i);

    for (i = 0; i < LCD_COLS; ++i) {
        lcd_rows[0][i] = "                    "[i];
        lcd_rows[1][i] = "                    "[i];
        lcd_rows[2][i] = "Program:            "[i];
        lcd_rows[3][i] = "                    "[i];
    }

    update_lcd();
#endif

    switch_mode(1);

    // Initialize program:
    set_gmaj_program();
}

// called every 10ms
void controller_10msec_timer(void) {
    // Increment timers:
    if (fsw.bot.bits._7 && (timer_tapstore > 0)) timer_tapstore++;
    if (timer_fx_held > 0) {
        timer_fx_held++;
        if (timer_fx_held >= timer_fx_timeout + 15)
            timer_fx_held = timer_fx_timeout;
    }

    if (timer_sw_held > 0) {
        timer_sw_held++;
        if (timer_sw_held >= timer_sw_timeout + 15)
            timer_sw_held = timer_sw_timeout;
    }

    if (timer_prog_held > 0) {
        timer_prog_held++;
        if (timer_prog_held >= timer_prog_timeout + 15)
            timer_prog_held = timer_prog_timeout;
    }

    if (timer_np_held > 0) {
        timer_np_held++;
        // Loop timer to allow infinite hold time:
        if (timer_np_held >= 50) {
            timer_np_advanced = 1;
            timer_np_held = 35;
        }
    }

    // Flash held LEDs:
    if (timer_sw_held >= timer_sw_timeout) {
        // Flash top LEDs on/off:
        if ((timer_sw_held & 15) >= 7) {
            if (fsw.bot.bits._1) leds[0].bot.bits._1 = 1;
            if (fsw.bot.bits._2) leds[0].bot.bits._2 = 1;
        } else {
            if (fsw.bot.bits._1) leds[0].bot.bits._1 = 0;
            if (fsw.bot.bits._2) leds[0].bot.bits._2 = 0;
        }
        send_leds();
    }

    if (timer_fx_held >= timer_fx_timeout) {
        // Flash top LEDs on/off:
        if ((timer_fx_held & 15) >= 7) {
            leds[0].top.byte = ((pr.fx[rjm_channel] & ~fsw.top.byte) & ~(M_7 | M_8)) | (leds[0].top.byte & (M_7 | M_8));
        } else {
            leds[0].top.byte = ((pr.fx[rjm_channel] | fsw.top.byte) & ~(M_7 | M_8)) | (leds[0].top.byte & (M_7 | M_8));
        }
        send_leds();
    }

    if (timeout_flash) {
        if (!--timeout_flash) {
            // Reset LED state:
            leds[0].top.byte = (pr.fx[rjm_channel] & ~(M_7 | M_8)) | (leds[0].top.byte & (M_7 | M_8));
            send_leds();
        } else {
            // Flash top LEDs on/off:
            if ((timeout_flash & 15) >= 7) {
                leds[0].top.byte = (M_1 | M_2 | M_3 | M_4 | M_5 | M_6) | (leds[0].top.byte & (M_7 | M_8));
            } else {
                leds[0].top.byte = (leds[0].top.byte & (M_7 | M_8));
            }
            send_leds();
        }
    }
}

void prog_next(void) {
    if (next_gmaj_program != 127) next_gmaj_program++;
    set_gmaj_program();
}

void prog_prev(void) {
    if (next_gmaj_program != 0) next_gmaj_program--;
    set_gmaj_program();
}

void song_next(void) {
    if (sl.count == 0) return;
    if (slp < sl.count - 1) slp++;
    set_gmaj_program();
}

void song_prev(void) {
    if (slp != 0) slp--;
    set_gmaj_program();
}

void handle_mode_0(void) {
    // handle top 6 FX block buttons:
    if (is_top_button_pressed(M_1)) {
        gmaj_toggle_cc(0);
        timer_fx_held = 1;
    } else if (is_top_button_released(M_1) && (timer_fx_held > timer_fx_timeout)) {
        timer_fx_held = 0;
        gmaj_toggle_cc(0);
    }
    if (is_top_button_pressed(M_2)) {
        gmaj_toggle_cc(1);
        timer_fx_held = 1;
    } else if (is_top_button_released(M_2) && (timer_fx_held > timer_fx_timeout)) {
        timer_fx_held = 0;
        gmaj_toggle_cc(1);
    }
    if (is_top_button_pressed(M_3)) {
        gmaj_toggle_cc(2);
        timer_fx_held = 1;
    } else if (is_top_button_released(M_3) && (timer_fx_held > timer_fx_timeout)) {
        timer_fx_held = 0;
        gmaj_toggle_cc(2);
    }
    if (is_top_button_pressed(M_4)) {
        gmaj_toggle_cc(3);
        timer_fx_held = 1;
    } else if (is_top_button_released(M_4) && (timer_fx_held > timer_fx_timeout)) {
        timer_fx_held = 0;
        gmaj_toggle_cc(3);
    }
    if (is_top_button_pressed(M_5)) {
        gmaj_toggle_cc(4);
        timer_fx_held = 1;
    } else if (is_top_button_released(M_5) && (timer_fx_held > timer_fx_timeout)) {
        timer_fx_held = 0;
        gmaj_toggle_cc(4);
    }
    if (is_top_button_pressed(M_6)) {
        gmaj_toggle_cc(5);
        timer_fx_held = 1;
    } else if (is_top_button_released(M_6) && (timer_fx_held > timer_fx_timeout)) {
        timer_fx_held = 0;
        gmaj_toggle_cc(5);
    }

    // handle bottom 6 amp selector buttons:
    if (is_bot_button_pressed(M_1)) {
        set_rjm_channel(0);
        reset_tuner_mute();
    }
    if (is_bot_button_pressed(M_2)) {
        set_rjm_channel(1);
        reset_tuner_mute();
    }
    if (is_bot_button_pressed(M_3)) {
        set_rjm_channel(2);
        reset_tuner_mute();
    }
    if (is_bot_button_pressed(M_4)) {
        set_rjm_channel(3);
        reset_tuner_mute();
    }
    if (is_bot_button_pressed(M_5)) {
        set_rjm_channel(4);
        reset_tuner_mute();
    }
    if (is_bot_button_pressed(M_6)) {
        set_rjm_channel(5);
        reset_tuner_mute();
    }

    // handle remaining 4 functions:

    if (is_top_button_pressed(M_7)) {
        // programming or mute:
        timer_prog_held = 1;
    } else if (fsw.top.bits._7) {
        if (timer_prog_held >= timer_prog_timeout) {
            // programming mode:
            timer_prog_held = 0;
            switch_programming_mode(1);
        }
    } else if (is_top_button_released(M_7)) {
        if (timer_prog_held != 0) {
            // mute:
            leds[0].top.byte ^= M_7;
            gmaj_cc_set(gmaj_cc_mute, (leds[0].top.bits._7) ? 0x7F : 0x00);
        }
    }

    // TAP/STORE released after timeout?
    if ((timer_tapstore >= timer_tapstore_timeout) && fsw.bot.bits._7) {
        // STORE:
        store_program_state();
        // flash LEDs for 800ms:
        timeout_flash = 80;
        // disable STORE timer:
        timer_tapstore = 0;
    }
    if (is_bot_button_pressed(M_7)) {
        // tap tempo function:
        toggle_tap = ~toggle_tap & 0x7F;
        gmaj_cc_set(gmaj_cc_taptempo, toggle_tap);
        // start timer for STORE:
        timer_tapstore = 1;
    }

    // Turn on the TAP LED while the TAP button is held:
    leds[0].bot.bits._7 = fsw.bot.bits._7;

    if (setlist_mode == 0) {
        // Program mode:

        // NEXT
        if (is_bot_button_pressed(M_8)) {
            timer_np_held = 1;
            prog_next();
        } else if (is_bot_button_released(M_8)) {
            timer_np_held = 0;
        } else if ((fsw.bot.byte & M_8) == M_8) {
            if (timer_np_advanced) {
                timer_np_advanced = 0;
                prog_next();
            }
        }

        // PREV
        if (is_top_button_pressed(M_8)) {
            timer_np_held = 1;
            prog_prev();
        } else if (is_top_button_released(M_8)) {
            timer_np_held = 0;
        } else if ((fsw.top.byte & M_8) == M_8) {
            if (timer_np_advanced) {
                timer_np_advanced = 0;
                prog_prev();
            }
        }
    } else {
        // Setlist mode:

        // NEXT
        if (is_bot_button_pressed(M_8)) {
            timer_np_held = 1;
            song_next();
        } else if (is_bot_button_released(M_8)) {
            timer_np_held = 0;
        } else if ((fsw.bot.byte & M_8) == M_8) {
            if (timer_np_advanced) {
                timer_np_advanced = 0;
                song_next();
            }
        }

        // PREV
        if (is_top_button_pressed(M_8)) {
            timer_np_held = 1;
            song_prev();
        } else if (is_top_button_released(M_8)) {
            timer_np_held = 0;
        } else if ((fsw.top.byte & M_8) == M_8) {
            if (timer_np_advanced) {
                timer_np_advanced = 0;
                song_prev();
            }
        }
    }

    // NEXT/PREV LEDs:
    leds[0].top.bits._8 = fsw.top.bits._8;
    leds[0].bot.bits._8 = fsw.bot.bits._8;

    send_leds();
}

void handle_mode_1(void) {
    // Select channel to reprogram first, then select channel to map it to.
    if (mode_1_alt == 0) {
        // Select channel to reprogram:
        if (is_bot_button_pressed(M_1)) {
            mode_1_select = 0;
            switch_mode_1_alt(1);
        }
        if (is_bot_button_pressed(M_2)) {
            mode_1_select = 1;
            switch_mode_1_alt(1);
        }
        if (is_bot_button_pressed(M_3)) {
            mode_1_select = 2;
            switch_mode_1_alt(1);
        }
        if (is_bot_button_pressed(M_4)) {
            mode_1_select = 3;
            switch_mode_1_alt(1);
        }
        if (is_bot_button_pressed(M_5)) {
            mode_1_select = 4;
            switch_mode_1_alt(1);
        }
        if (is_bot_button_pressed(M_6)) {
            mode_1_select = 5;
            switch_mode_1_alt(1);
        }


        // Switch setlist/program modes:
        if (is_top_button_pressed(M_1)) {
            // Switch to setlist mode:
            switch_mode(1);
        }
        if (is_top_button_pressed(M_2)) {
            // Switch to program mode:
            switch_mode(0);
        }
        if (is_top_button_pressed(M_3)) {
        }
        if (is_top_button_pressed(M_4)) {
        }
        if (is_top_button_pressed(M_5)) {
        }
        if (is_top_button_pressed(M_6)) {
        }
        // Exit programming when PROG button is pressed:
        if (is_top_button_pressed(M_7)) {
            switch_programming_mode(0);
        }

        if (is_bot_button_pressed(M_8)) {
            // Next setlist:
            if (sli < 31) {
                sli++;
                switch_mode(setlist_mode);
            }
        }
        if (is_top_button_pressed(M_8)) {
            // Prev setlist:
            if (sli > 0) {
                sli--;
                switch_mode(setlist_mode);
            }
        }
    } else {
        // Choose which amp channel to reprogram as:
        if (is_bot_button_pressed(M_1)) {
            remap_preset(mode_1_select, 0);
            switch_mode_1_alt(0);
        }
        if (is_bot_button_pressed(M_2)) {
            remap_preset(mode_1_select, 1);
            switch_mode_1_alt(0);
        }
        if (is_bot_button_pressed(M_3)) {
            remap_preset(mode_1_select, 2);
            switch_mode_1_alt(0);
        }
        if (is_bot_button_pressed(M_4)) {
            remap_preset(mode_1_select, 3);
            switch_mode_1_alt(0);
        }
        if (is_bot_button_pressed(M_5)) {
            remap_preset(mode_1_select, 4);
            switch_mode_1_alt(0);
        }
        if (is_bot_button_pressed(M_6)) {
            remap_preset(mode_1_select, 5);
            switch_mode_1_alt(0);
        }

        // Exit reprogram mode to cancel:
        if (is_top_button_pressed(M_7)) {
            switch_mode_1_alt(0);
        }
    }

    send_leds();
}

// main control loop
void controller_handle(void) {
    // poll foot-switch depression status:
    u16 tmp = fsw_poll();
    fsw.bot.byte = tmp & 0xFF;
    fsw.top.byte = (tmp >> 8) & 0xFF;

    if (programming_mode == 0) {
        handle_mode_0();
    } else if (programming_mode == 1) {
        handle_mode_1();
    }

    // Record the previous switch state:
    fsw_last = fsw;
}
