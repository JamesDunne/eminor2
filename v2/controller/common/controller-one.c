/*
    Programmable e-minor MIDI foot controller v2.

    Currently designed to work with:
    Primary guitar amp:
        3-channel Mark V amplifier controller via
            RJM Mini Amp Gizmo (MIDI)
        t.c. electronic g-major effects unit (MIDI)
    Secondary guitar amp:
        Axe-FX II (MIDI)
            scene changes 1-4 to control amp changes across two amp blocks with X/Y switching

    Assumptions:
    g-major listens on MIDI channel 1
    g-major listens for program change messages and CC messages
    RJM listens on MIDI channel 2
    RJM listens for program change messages with program #s 1-6

    Footswitch layout:

    *      *      *      *      *      *      *       *
    CMP    FLT    PIT    CHO    DLY    RVB    PREV    NEXT


    *      *      *      *      *      *      *       *
    1      1S     2      2S     3      3S    TAP    CANCEL
    MUTE                                     STORE    PROG

    Written by
    James S. Dunne
    https://github.com/JamesDunne/
    2015-08-15
*/

#ifdef HW_V1

#include <assert.h>
#include "../common/types.h"
#include "../common/hardware.h"

// JSD's custom persistent data structures per program:

// Program data structure loaded from / written to flash memory:
struct program {
    // Name of the program in ASCII, max 20 chars, NUL terminator is optional at 20 char limit; NUL padding is preferred:
    u8 name[20];

    // Scene descriptors:
    u8 scene_desc[6];
    // G-major effects enabled per scene (see fxm_*):
    u8 fx[6];
};

// Mark V channel 1
#define rjm_channel_1   0x00
// Mark V channel 2
#define rjm_channel_2   0x01
// Mark V channel 3
#define rjm_channel_3   0x02

#define rjm_channel_mask        0x03

// Scene level as 2-bit signed integer
#define scene_level_mask (31 << 2)
#define scene_level_shr  2

// 5-bit signed values
#define scene_level_offset  9
#define scene_level_0    ((( 0 + scene_level_offset) & 31) << 2)
#define scene_level_pos4 (((+5 + scene_level_offset) & 31) << 2)
#define scene_level_neg3 (((-3 + scene_level_offset) & 31) << 2)

#define scene_initial    0x80

// NOTE(jsd): Struct size must be a divisor of 64 to avoid crossing 64-byte boundaries in flash!
// Struct sizes of 1, 2, 4, 8, 16, and 32 qualify.
COMPILE_ASSERT(sizeof(struct program) == 32);

// Set list entry
struct set_entry {
    u8 program;
};

// Set lists
struct set_list {
    u8 count;                       // number of songs in set list
    u8 d0, d1;                      // date of show (see DATES below)
    struct set_entry entries[61];
};

// DATES since 2014 are stored in 16 bits in the following form: (LSB on right)
//  yyyyyyym mmmddddd
//  |||||||| ||||||||
//  |||||||| |||\++++ day of month [0..30]
//  |||||||\-+++----- month [0..11]
//  \++++++---------- year since 2014 [0..127]

// NOTE(jsd): Struct size must be a divisor of 64 to avoid crossing 64-byte boundaries in flash!
// Struct sizes of 1, 2, 4, 8, 16, and 32 qualify.
COMPILE_ASSERT(sizeof(struct set_list) == 64);

// Useful macros:
#define tglbit(VAR,Place) VAR ^= (1 << Place)

// Hard-coded MIDI channel #s:
#define gmaj_midi_channel   0
#define rjm_midi_channel    1
#define torp_midi_channel   2

// G-major CC messages:
#define gmaj_cc_taptempo        80
#define gmaj_cc_mute            81

#define gmaj_cc_compressor      84
#define gmaj_cc_filter          85
#define gmaj_cc_pitch           86
#define gmaj_cc_chorus          87
#define gmaj_cc_delay           88
#define gmaj_cc_reverb          89
#define gmaj_cc_noisegate       90
#define gmaj_cc_eq              91
#define gmaj_cc_global_in_level 92

#define is_pressed(rowname, mask) is_##rowname##_button_pressed(mask)
#define is_held(rowname, mask) is_##rowname##_button_held(mask)
#define is_released(rowname, mask) is_##rowname##_button_released(mask)

// Define our buttons by name:
#define is_pressed_mute()       is_pressed(bot, M_7)
#define is_held_mute()          is_held(bot, M_7)
#define is_released_mute()      is_released(bot, M_7)

#define is_pressed_tap()        is_pressed(bot, M_7)
#define is_held_tap()           is_held(bot, M_7)
#define is_released_tap()       is_released(bot, M_7)

#define is_pressed_store()      is_pressed(bot, M_7)
#define is_held_store()         is_held(bot, M_7)
#define is_released_store()     is_released(bot, M_7)

#define is_pressed_cancel()     is_pressed(bot, M_8)
#define is_held_cancel()        is_held(bot, M_8)
#define is_released_cancel()    is_released(bot, M_8)

#define is_pressed_prev()       is_pressed(top, M_7)
#define is_held_prev()          is_held(top, M_7)
#define is_released_prev()      is_released(top, M_7)

#define is_pressed_next()       is_pressed(top, M_8)
#define is_held_next()          is_held(top, M_8)
#define is_released_next()      is_released(top, M_8)

// Top row of controller buttons activate these CCs:
u8 gmaj_cc_lookup[8];

enum {
    MODE_LIVE = 0,
    MODE_PROGRAMMING,
    MODE_SCENE_DESIGN,
    MODE_SETLIST_REORDER,
    MODE_count
};

// Controller UX modes (high level):
u8 mode, mode_last;

// Setlist or program mode:
u8 setlist_mode;

// Current and previous button state:
io16 fsw, fsw_last;
// Current LED state per `mode`:
io16 leds[MODE_count];

u16 curr_leds, last_leds;

// Toggle value for tap tempo:
u8 toggle_tap;
u8 is_muted;

// Current g-major program # (0-127):
u8 gmaj_program;
// Next g-major program to update to:
u8 next_gmaj_program;

u8 scene, live_scene;

// Current program data:
struct program pr;
// Decoded RJM channels (0-based channel number, alternating SOLO modes):
u8 pr_rjm[6], live_pr_rjm[6];
s8 pr_out_level[6], live_pr_out_level[6];

// Current set list:
struct set_list sl;
// Current index in list of setlists (which setlist):
u8 sli, last_sli;
// Current song index within current setlist:
u8 slp, last_slp;

u8 swap_slp;

#ifdef FEAT_LCD
u8 *lcd_rows[LCD_ROWS];
#endif

// Countdown timer for flashing LEDs:
u8 timeout_flash;

#define declare_timer(name) u8 timer_held_##name
#define declare_timer_looper(name) u8 timer_held_##name, timer_looped_##name

#define is_timer_elapsed(name) (timer_held_##name >= (timer_timeout_##name + 1))

#define init_timer(name) timer_held_##name = 0
#define init_timer_looper(name) timer_held_##name = 0, timer_looped_##name = 0

declare_timer(tapstore);
#define timer_timeout_tapstore  75

declare_timer(fx);
#define timer_timeout_fx        30

declare_timer(sw);
#define timer_timeout_sw        75

declare_timer(mute);
#define timer_timeout_mute      75

declare_timer(prog);
#define timer_timeout_prog      75

declare_timer(flash);

declare_timer(design);
#define timer_timeout_design    75

// next/prev loops and sets timer_looped_nextprev = 1 on each loop around.
declare_timer_looper(nextprev);
#define timer_timeout_nextprev  45
#define timer_loop_nextprev     10

static void set_rjm_leds(void);
static void clear_rjm_leds(void);
static s8 ritoa(u8 *s, u8 n, s8 i);
static void send_leds(void);
static void update_lcd(void);

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

static u8 is_top_button_held(u8 mask) {
    return ((fsw.top.byte & mask) != 0);
}

static u8 is_bot_button_held(u8 mask) {
    return ((fsw.bot.byte & mask) != 0);
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
    flash_load((u16)next_gmaj_program * sizeof(struct program), sizeof(struct program), (u8 *)&pr);

    if (pr.name[0] == 0) {
        // Empty program name? That signifies a zeroed-out program. Let's set up some reasonable defaults:

        // Program name is the program number in decimal:
        //ritoa(pr.name, next_gmaj_program + sl.song_offset + 1, 3);
        pr.name[0] = ' ';
        pr.name[1] = ' ';
        pr.name[2] = ' ';
        ritoa(pr.name, next_gmaj_program + 1, 3);
        pr.name[4] = 0;

        pr.scene_desc[0] = rjm_channel_1 | scene_level_0;
        pr.scene_desc[1] = rjm_channel_1 | scene_level_pos4;
        pr.scene_desc[2] = rjm_channel_2 | scene_level_0;
        pr.scene_desc[3] = rjm_channel_2 | scene_level_pos4;
        pr.scene_desc[4] = rjm_channel_3 | scene_level_0 | scene_initial;
        pr.scene_desc[5] = rjm_channel_3 | scene_level_pos4;

        pr.fx[0] = (fxm_compressor);
        pr.fx[1] = (fxm_compressor);
        pr.fx[2] = (fxm_noisegate);
        pr.fx[3] = (fxm_noisegate);
        pr.fx[4] = (fxm_noisegate);
        pr.fx[5] = (fxm_noisegate | fxm_delay);
    }

    // Default to main unboosted rhythm channel:
    scene = 4;

    // Decode the scene descriptors:
    for (i = 0; i < 6; ++i) {
        // Get the descriptor:
        u8 rdesc = pr.scene_desc[i];

        // RJM channels start at 1 and alternate solo mode off/on and then increment channel #s:
        u8 mkv_chan = (rdesc & rjm_channel_mask);
        // NOTE(jsd): Mark V solo mode is unused now that we can set Global In Level on g-major.
        u8 new_rjm_actual = mkv_chan;

        // Decode the 5-bit signed integer with offset.
        s8 out_level = (rdesc & scene_level_mask) >> scene_level_shr;
		if (out_level > 15)
            out_level = (s8)((u8)out_level | 0xE0);

        // Adjust by scene_level_offset to find correct range.
        out_level += -scene_level_offset;

        // Find the initial channel:
        if ((rdesc & scene_initial) == scene_initial)
            scene = i;

        pr_rjm[i] = new_rjm_actual;
		pr_out_level[i] = out_level;
    }
#endif
}

static void store_program_state(void) {
    // Store effects on/off state of current program:
    u8 i;

    // Set initial channel:
    for (i = 0; i < 6; i++) {
        pr.fx[i] &= 0x7F;
    }
    pr.fx[scene] |= 0x80;

    // Store program state:
    flash_store((u16)gmaj_program * sizeof(struct program), sizeof(struct program), (u8 *)&pr);
}

// Set g-major CC value
static void gmaj_cc_set(u8 cc, u8 val) {
    midi_send_cmd2(0xB, gmaj_midi_channel, cc, val);
}

static void enable_mute(void) {
    is_muted = 1;
    gmaj_cc_set(gmaj_cc_mute, 0x7F);
    update_lcd();
}

static void disable_mute(void) {
    is_muted = 0;
    gmaj_cc_set(gmaj_cc_mute, 0x00);
    update_lcd();
}

// Reset g-major mute to off if on
static void reset_tuner_mute(void) {
    // Turn off mute if enabled:
    if (is_muted) {
        disable_mute();
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
    pr.fx[scene] ^= idxMask;

    // Determine the MIDI value to use depending on the newly toggled state:
    if (pr.fx[scene] & idxMask) togglevalue = 0x7F;

    // Send MIDI command:
    gmaj_cc_set(gmaj_cc_lookup[idx], togglevalue);

    update_lcd();
}

static void update_effects_MIDI_state(void) {
#if FX_ASSUME_OFF
    b8 n;
    n.byte = pr.fx[scene];

    // Assume all effects are off by default because g-major program change has just occurred.

    // Reset top LEDs to new state, preserve LEDs 7 and 8:
    leds[MODE_LIVE].top.byte = (n.byte & ~(M_7 | M_8)) | (leds[MODE_LIVE].top.byte & (M_7 | M_8));

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
    u8 fx = pr.fx[scene];

    // Reset top LEDs to new state, preserve LEDs 7 and 8:
    leds[MODE_LIVE].top.byte = (fx & ~(M_7 | M_8)) | (leds[MODE_LIVE].top.byte & (M_7 | M_8));

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

static void scene_activate(void) {
    u8 i;
    u8 max_level;

    // Switch g-major program if needed:
    if (next_gmaj_program != gmaj_program) {
        timer_held_flash = 0;

        // Send the MIDI PROGRAM CHANGE message to t.c. electronic g-major effects unit:
        midi_send_cmd1(0xC, gmaj_midi_channel, next_gmaj_program);

        // Update internal state:
        gmaj_program = next_gmaj_program;
    }

    live_scene = scene;
    for (i = 0; i < 6; i++) {
        live_pr_rjm[i] = pr_rjm[i];
        live_pr_out_level[i] = pr_out_level[i];
    }

    // Send the MIDI PROGRAM CHANGE message to RJM Mini Amp Gizmo:
    midi_send_cmd1(0xC, rjm_midi_channel, (pr_rjm[scene] << 1));

    // Max boost is +6dB
    // Send the out level to the G-Major as Global-In Level:
    max_level = pr_out_level[scene] + 121;
    if (max_level > 127) max_level = 127;
    if (max_level < 0) max_level = 0;
    midi_send_cmd2(0xB, gmaj_midi_channel, gmaj_cc_global_in_level, max_level);

    // Send MIDI effects enable commands and set effects LEDs:
    update_effects_MIDI_state();

    update_lcd();
}

// Set RJM program to p (0-5)
static void set_rjm_channel(u8 p) {
    assert(p < 6);

    // Keep track of the last-activated setlist program:
    last_slp = slp;

    scene = p;

    // Switch RJM channel and set up effects on/off:
    scene_activate();
}

// Set g-major program:
static void set_gmaj_program_only(void) {
    // Load program from setlist:
    if (setlist_mode == 1) {
        next_gmaj_program = sl.entries[slp].program;
    }

    if (next_gmaj_program != gmaj_program) {
        // Only start flashing timer; otherwise leave current timer loop alone:
        if (timer_held_flash == 0) {
            timer_held_flash = 1;
        }
    } else {
        timer_held_flash = 0;
    }

    // Load new effect states but don't switch MIDI yet:
    load_program_state();
}

static void set_gmaj_program(void) {
    set_gmaj_program_only();

    // Set only current program LED on bottom, preserve LEDs 7 and 8:
    if (timer_held_flash == 0) {
        set_rjm_leds();
    }

    // Update LCD:
    update_lcd();
}

static void switch_setlist_mode(u8 new_mode) {
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

static void switch_mode(u8 new_mode) {
    mode_last = mode;
    mode = new_mode;
    update_lcd();
}

static void scene_update(u8 preset, u8 new_rjm_channel, s8 out_level) {
    u8 desc = pr.scene_desc[preset];

    desc &= ~rjm_channel_mask;
    desc |= new_rjm_channel & rjm_channel_mask;

    // Calculate 5-bit level:
    if (out_level < -25) out_level = -25;
    else if (out_level > 6) out_level = 6;

    // Set the bits in the descriptor:
    desc &= ~scene_level_mask;
    desc |= (u8)((out_level + scene_level_offset) & 31) << scene_level_shr;

    // Update program data to be written back to flash:
    pr.scene_desc[preset] = desc;

    // Update calculated data:
    pr_rjm[preset] = new_rjm_channel;
    pr_out_level[preset] = out_level;

    live_pr_rjm[preset] = pr_rjm[preset];
    live_pr_out_level[preset] = pr_out_level[preset];

    scene_activate();
}

// ------------------------- Actual controller logic -------------------------

// set the controller to an initial state
void controller_init(void) {
    u8 i;
    u8 **labels;

    setlist_mode = 1;
    mode = MODE_LIVE;
    mode_last = MODE_LIVE;
    for (i = 0; i < MODE_count; i++) {
        leds[i].top.byte = 0;
        leds[i].bot.byte = 0;
    }

    last_sli = 0;
    last_slp = 0;
    sli = 0;
    slp = 0;

    curr_leds = 0x0000U;
    last_leds = 0xFFFFU;

    init_timer(tapstore);
    init_timer(fx);
    init_timer(sw);
    init_timer(mute);
    init_timer(prog);
    init_timer(flash);
    init_timer_looper(nextprev);

    timeout_flash = 0;

    is_muted = 0;
    toggle_tap = 0;

    scene = 0;
    gmaj_program = 255;
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

#ifdef HWFEAT_LABEL_UPDATES
    labels = label_row_get(0);
    labels[0] = "SC1";
    labels[1] = "SC2";
    labels[2] = "SC3";
    labels[3] = "SC4";
    labels[4] = "SC5";
    labels[5] = "SC6";
    labels[6] = "TAP";
    labels[7] = "CANCEL";
    label_row_update(0);

    labels = label_row_get(1);
    labels[0] = "COMP";
    labels[1] = "FILTER";
    labels[2] = "PITCH";
    labels[3] = "CHORUS";
    labels[4] = "DELAY";
    labels[5] = "REVERB";
    labels[6] = "PREV";
    labels[7] = "NEXT";
    label_row_update(1);
#endif

    switch_setlist_mode(1);

    // Initialize program:
    set_gmaj_program();
    scene_activate();
}

// called every 10ms
void controller_10msec_timer(void) {
    // Increment timers:
#define inc_timer(name) \
    if (timer_held_##name > 0) { \
    timer_held_##name++; \
    if (timer_held_##name >= 240) \
    timer_held_##name = 128; \
    }
#define inc_timer_loop(name) \
    if (timer_held_##name > 0) { \
    timer_held_##name++; \
    if (timer_held_##name >= (timer_timeout_##name + timer_loop_##name)) { \
    timer_held_##name = timer_timeout_##name; \
    timer_looped_##name = 1; \
    } \
    }

    inc_timer(fx)
    inc_timer(sw)
    inc_timer(tapstore)
    inc_timer(mute)
    inc_timer(prog)
    inc_timer_loop(nextprev)

    inc_timer(flash)
    inc_timer(design)

    if (timeout_flash) {
        --timeout_flash;
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

static void send_leds(void) {
    // Update LEDs:
    curr_leds = (u16)leds[mode].bot.byte | ((u16)leds[mode].top.byte << 8);
    if (curr_leds != last_leds) {
        led_set(curr_leds);
        last_leds = curr_leds;
    }
}

static void set_rjm_leds(void) {
    // Set only current program LED on bottom, preserve LEDs 7 and 8:
    leds[MODE_LIVE].bot.byte = (1 << scene) | (leds[MODE_LIVE].bot.byte & (M_7 | M_8));
}

static void clear_rjm_leds(void) {
    // Preserve only LEDs 7 and 8 (clear LEDS 1-6):
    leds[MODE_LIVE].bot.byte &= (M_7 | M_8);
}

// Update LCD display:
static void update_lcd(void) {
#ifdef FEAT_LCD
    s8 i;
    u8 b = 1;
    u8 fx = pr.fx[scene] & ~(M_7 | M_8);

    if (mode == MODE_LIVE) {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[3][i] = " cm fl pt ch dl rv  "[i];
        }
        for (i = 0; i < 6; i++, b <<= 1) {
            if ((fx & b) == b) {
                // Upper-case enabled FX labels:
                lcd_rows[3][i * 3 + 1] &= ~0x20;
                lcd_rows[3][i * 3 + 2] &= ~0x20;
            }
        }
    } else if (mode == MODE_PROGRAMMING) {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[3][i] = " MD SD -- -- RM SW  "[i];
        }
    } else if (mode == MODE_SCENE_DESIGN) {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[3][i] = "    scene design    "[i];
        }
    } else if (mode == MODE_SETLIST_REORDER) {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[3][i] = " -- -- -- -- -- --  "[i];
        }
    }

    if (setlist_mode == 0) {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[1][i] = "Program         #   "[i];
        }
        ritoa(lcd_rows[1], next_gmaj_program + 1, 19);
    } else {
        // Show setlist data:
        u8 yyyy = sl.d1 >> 1;
        u8 mm = ((sl.d1 & 1) << 4) | (sl.d0 >> 5);
        u8 dd = (sl.d0 & 31);
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[1][i] = "2014-01-01       # 0"[i];
        }
        ritoa(lcd_rows[1], yyyy + 14, 3);
        ritoa(lcd_rows[1], mm + 1, 6);
        ritoa(lcd_rows[1], dd + 1, 9);

        ritoa(lcd_rows[1], slp + 1, 19);
    }

    // Show program name and clear row 0:
    for (i = 0; i < LCD_COLS; i++) {
        lcd_rows[0][i] = ' ';
        lcd_rows[2][i] = pr.name[i];
        if (pr.name[i] == 0) break;
    }
    for (; i < LCD_COLS; i++) {
        lcd_rows[0][i] = ' ';
        lcd_rows[2][i] = ' ';
    }

    // "MUTE  CH1  +00  ****"

    if (is_muted) {
        // Muted:
        for (i = 0; i < 4; i++) {
            lcd_rows[0][i] = "MUTE"[i];
        }
    }

    {
        u8 ch;
        s8 out_level;
        u8 pos_level;

        if (mode == MODE_SCENE_DESIGN) {
            ch = pr_rjm[scene];
            out_level = pr_out_level[scene];
            pos_level = +out_level;
        } else {
            ch = live_pr_rjm[live_scene];
            out_level = live_pr_out_level[live_scene];
            pos_level = +out_level;
        }

        // Mark V channel name of live setting:
        lcd_rows[0][6 + 0] = 'C';
        lcd_rows[0][6 + 1] = 'H';
        lcd_rows[0][6 + 2] = '1' + ch;

        // g-major Global In Level:
        if (out_level == 0)
            lcd_rows[0][11] = ' ';
        else if (out_level > 0)
            lcd_rows[0][11] = '+';
        else {
            lcd_rows[0][11] = '-';
            pos_level = -out_level;
        }

        litoa(lcd_rows[0], pos_level, 12);
    }

    if (next_gmaj_program != gmaj_program) {
        // Pending program change:
        for (i = 16; i < 20; i++) {
            lcd_rows[0][i] = '*';
        }
    }

    lcd_updated_all();
#endif
}

static void calc_leds(void) {
    if (mode == MODE_LIVE) {
        // NEXT/PREV LEDs:
        leds[MODE_LIVE].top.bits._8 = fsw.top.bits._8;
        leds[MODE_LIVE].top.bits._7 = fsw.top.bits._7;

        // Turn on the TAP LED while the TAP button is held:
        leds[MODE_LIVE].bot.bits._7 = fsw.bot.bits._7;

        // Flash pending channel LED:
        if (next_gmaj_program != gmaj_program) {
            if ((timer_held_flash & 15) >= 8) {
                set_rjm_leds();
            } else {
                clear_rjm_leds();
            }
        } else {
            // Set only current program LED on bottom, preserve LEDs 7 and 8:
            set_rjm_leds();
        }

        // Set top LEDs to new FX state, preserve LEDs 7 and 8:
        leds[MODE_LIVE].top.byte = (pr.fx[scene] & ~(M_7 | M_8)) | (leds[MODE_LIVE].top.byte & (M_7 | M_8));

        if (is_timer_elapsed(fx)) {
            // Flash top LEDs on/off:
            if ((timer_held_fx & 15) >= 8) {
                leds[MODE_LIVE].top.byte = ((pr.fx[scene] & ~fsw.top.byte) & ~(M_7 | M_8)) | (leds[MODE_LIVE].top.byte & (M_7 | M_8));
            } else {
                leds[MODE_LIVE].top.byte = ((pr.fx[scene] | fsw.top.byte) & ~(M_7 | M_8)) | (leds[MODE_LIVE].top.byte & (M_7 | M_8));
            }
        }
    } else if (mode == MODE_PROGRAMMING) {
        // LEDs == FSWs:
        leds[MODE_PROGRAMMING].top.byte = fsw.top.byte;

        // Set only current program LED on bottom, preserve LEDs 7 and 8:
        leds[MODE_PROGRAMMING].bot.byte = (1 << scene) | (fsw.bot.byte & (M_7 | M_8));
    } else if (mode == MODE_SCENE_DESIGN) {
        // LEDs == FSWs:
        leds[MODE_SCENE_DESIGN].top.byte = (1 << ((pr_rjm[scene] << 1) | (pr_out_level[scene] <= 0 ? 0 : 1))) | (fsw.top.byte & (M_7 | M_8));
        leds[MODE_SCENE_DESIGN].bot.byte = (1 << scene) | (fsw.bot.byte & (M_7 | M_8));
    } else if (mode == MODE_SETLIST_REORDER) {
        // LEDs == FSWs:
        leds[MODE_SETLIST_REORDER].top.byte = fsw.top.byte;
        leds[MODE_SETLIST_REORDER].bot.byte = fsw.bot.byte;
    }

    if (timeout_flash) {
        // Flash top LEDs on/off to indicate store complete:
        if ((timeout_flash & 15) >= 8) {
            leds[mode].bot.bits._7 = 1;
        } else {
            leds[mode].bot.bits._7 = 0;
        }
    }

    send_leds();
}

void handle_mode_LIVE(void) {
    // handle top 6 FX block buttons:
    if (is_top_button_pressed(M_1)) {
        gmaj_toggle_cc(0);
        timer_held_fx = 1;
    } else if (is_top_button_released(M_1) && is_timer_elapsed(fx)) {
        timer_held_fx = 0;
        gmaj_toggle_cc(0);
    }
    if (is_top_button_pressed(M_2)) {
        gmaj_toggle_cc(1);
        timer_held_fx = 1;
    } else if (is_top_button_released(M_2) && is_timer_elapsed(fx)) {
        timer_held_fx = 0;
        gmaj_toggle_cc(1);
    }
    if (is_top_button_pressed(M_3)) {
        gmaj_toggle_cc(2);
        timer_held_fx = 1;
    } else if (is_top_button_released(M_3) && is_timer_elapsed(fx)) {
        timer_held_fx = 0;
        gmaj_toggle_cc(2);
    }
    if (is_top_button_pressed(M_4)) {
        gmaj_toggle_cc(3);
        timer_held_fx = 1;
    } else if (is_top_button_released(M_4) && is_timer_elapsed(fx)) {
        timer_held_fx = 0;
        gmaj_toggle_cc(3);
    }
    if (is_top_button_pressed(M_5)) {
        gmaj_toggle_cc(4);
        timer_held_fx = 1;
    } else if (is_top_button_released(M_5) && is_timer_elapsed(fx)) {
        timer_held_fx = 0;
        gmaj_toggle_cc(4);
    }
    if (is_top_button_pressed(M_6)) {
        gmaj_toggle_cc(5);
        timer_held_fx = 1;
    } else if (is_top_button_released(M_6) && is_timer_elapsed(fx)) {
        timer_held_fx = 0;
        gmaj_toggle_cc(5);
    }

    // handle bottom 6 amp selector buttons:

    // hold down button to enter scene design mode to adjust output volume and channels.

    if (is_bot_button_pressed(M_1)) {
        set_rjm_channel(0);
        reset_tuner_mute();
        timer_held_design = 1;
    } else if (is_bot_button_held(M_1) && is_timer_elapsed(design)) {
        switch_mode(MODE_SCENE_DESIGN);
        timer_held_design = 0;
    }

    if (is_bot_button_pressed(M_2)) {
        set_rjm_channel(1);
        reset_tuner_mute();
        timer_held_design = 1;
    } else if (is_bot_button_held(M_2) && is_timer_elapsed(design)) {
        switch_mode(MODE_SCENE_DESIGN);
        timer_held_design = 0;
    }

    if (is_bot_button_pressed(M_3)) {
        set_rjm_channel(2);
        reset_tuner_mute();
        timer_held_design = 1;
    } else if (is_bot_button_held(M_3) && is_timer_elapsed(design)) {
        switch_mode(MODE_SCENE_DESIGN);
        timer_held_design = 0;
    }
    if (is_bot_button_pressed(M_4)) {
        set_rjm_channel(3);
        reset_tuner_mute();
        timer_held_design = 1;
    } else if (is_bot_button_held(M_4) && is_timer_elapsed(design)) {
        switch_mode(MODE_SCENE_DESIGN);
        timer_held_design = 0;
    }
    if (is_bot_button_pressed(M_5)) {
        set_rjm_channel(4);
        reset_tuner_mute();
        timer_held_design = 1;
    } else if (is_bot_button_held(M_5) && is_timer_elapsed(design)) {
        switch_mode(MODE_SCENE_DESIGN);
        timer_held_design = 0;
    }
    if (is_bot_button_pressed(M_6)) {
        set_rjm_channel(5);
        reset_tuner_mute();
        timer_held_design = 1;
    } else if (is_bot_button_held(M_6) && is_timer_elapsed(design)) {
        switch_mode(MODE_SCENE_DESIGN);
        timer_held_design = 0;
    }

    // handle remaining 4 functions:

    if (is_pressed_mute()) {
        timer_held_mute = 1;
    } else if (is_held_mute() && is_timer_elapsed(mute)) {
        // Send mute:
        enable_mute();
        timer_held_mute = 0;
    } else if (is_released_mute()) {
        timer_held_mute = 0;
    }

    if (is_pressed_tap()) {
        // tap tempo function:
        toggle_tap = ~toggle_tap & 0x7F;
        gmaj_cc_set(gmaj_cc_taptempo, toggle_tap);
    }

    // CANCEL held to engage PROG:
    if (is_pressed_cancel()) {
        // Cancel pending program change:
        if (next_gmaj_program != gmaj_program) {
            next_gmaj_program = gmaj_program;
            slp = last_slp;
            set_gmaj_program_only();

            // Revert to current live RJM channel:
            scene = live_scene;

            // Update LCD:
            update_lcd();
        } else {
            // If no pending program change, just unmute:
            reset_tuner_mute();
        }

        // Start a timer to check if changing to programming mode:
        timer_held_prog = 1;
    } else if (is_held_cancel() && is_timer_elapsed(prog)) {
        // programming mode:
        timer_held_prog = 0;
        switch_mode(MODE_PROGRAMMING);
    } else if (is_released_cancel()) {
        timer_held_prog = 0;
    }

    if (setlist_mode == 0) {
        // Program mode:

        // NEXT
        if (is_pressed_next()) {
            timer_held_nextprev = 1;
            prog_next();
        } else if (is_released_next()) {
            timer_held_nextprev = 0;
        } else if (is_held_next()) {
            if (timer_looped_nextprev) {
                timer_looped_nextprev = 0;
                prog_next();
            }
        }

        // PREV
        if (is_pressed_prev()) {
            timer_held_nextprev = 1;
            prog_prev();
        } else if (is_released_prev()) {
            timer_held_nextprev = 0;
        } else if (is_held_prev()) {
            if (timer_looped_nextprev) {
                timer_looped_nextprev = 0;
                prog_prev();
            }
        }
    } else {
        // Setlist mode:

        // NEXT
        if (is_pressed_next()) {
            timer_held_nextprev = 1;
            song_next();
        } else if (is_released_next()) {
            timer_held_nextprev = 0;
        } else if (is_held_next()) {
            if (timer_looped_nextprev) {
                timer_looped_nextprev = 0;
                song_next();
            }
        }

        // PREV
        if (is_pressed_prev()) {
            timer_held_nextprev = 1;
            song_prev();
        } else if (is_released_prev()) {
            timer_held_nextprev = 0;
        } else if (is_held_prev()) {
            if (timer_looped_nextprev) {
                timer_looped_nextprev = 0;
                song_prev();
            }
        }
    }
}

// Utility function to cut current setlist entry out:
static void cut_setlist_entry(void) {
    u8 i;

    if (slp >= sl.count) return;
    if (sl.count <= 0) return;

    for (i = slp+1; i < sl.count; i++) {
        sl.entries[i-1] = sl.entries[i];
    }
    sl.count--;
}

// Mode 1 is activated by holding down PROG while in mode 0.
void handle_mode_PROGRAMMING(void) {
    // Exit programming when CANCEL button is pressed:
    if (is_pressed_cancel()) {
        switch_mode(MODE_LIVE);
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

    // Switch setlist/program modes:
    if (is_top_button_pressed(M_1)) {
        // Toggle setlist/program mode:
        switch_setlist_mode((setlist_mode ^ 1));
    }
    if (is_top_button_pressed(M_2)) {
        // Enter scene design mode:
        switch_mode(MODE_SCENE_DESIGN);
    }
    if (is_top_button_pressed(M_3)) {
    }
    if (is_top_button_pressed(M_4)) {
    }
    if (is_top_button_pressed(M_5)) {
        // Cut current setlist entry and shift all items back:
        if (setlist_mode == 1) {
            // TODO: confirm cut.
            cut_setlist_entry();
            set_gmaj_program();
        }
    }
    if (is_top_button_pressed(M_6)) {
        if (setlist_mode == 1) {
            // Swap current setlist entry with selected one:
            swap_slp = slp;
            switch_mode(MODE_SETLIST_REORDER);
            update_lcd();
        }
    }

    // STORE released after timeout?
    if (is_pressed_store()) {
        // start timer for STORE:
        timer_held_tapstore = 1;
    } else if (is_held_store() && is_timer_elapsed(tapstore)) {
        // STORE:
        store_program_state();
        // flash LEDs for 800ms:
        timeout_flash = 80;
        // disable STORE timer:
        timer_held_tapstore = 0;
    } else if (is_released_store()) {
        timer_held_tapstore = 0;
    }

    // NEXT/PREV change setlists:
    if (setlist_mode == 0) {
        // Program mode:

        // NEXT
        if (is_pressed_next()) {
            timer_held_nextprev = 1;
            prog_next();
        } else if (is_released_next()) {
            timer_held_nextprev = 0;
        } else if (is_held_next()) {
            if (timer_looped_nextprev) {
                timer_looped_nextprev = 0;
                prog_next();
            }
        }

        // PREV
        if (is_pressed_prev()) {
            timer_held_nextprev = 1;
            prog_prev();
        } else if (is_released_prev()) {
            timer_held_nextprev = 0;
        } else if (is_held_prev()) {
            if (timer_looped_nextprev) {
                timer_looped_nextprev = 0;
                prog_prev();
            }
        }
    } else {
        // Setlist mode:

        if (is_pressed_next()) {
            // Next setlist:
            if (sli < 31) {
                sli++;
                switch_setlist_mode(setlist_mode);
            }
        }

        if (is_pressed_prev()) {
            // Prev setlist:
            if (sli > 0) {
                sli--;
                switch_setlist_mode(setlist_mode);
            }
        }
    }
}

void handle_mode_SCENE_DESIGN(void) {
    // Exit scene design when CANCEL button is pressed:
    if (is_pressed_cancel()) {
        switch_mode(mode_last);
    }

    // Select channel to reprogram:
    if (is_bot_button_pressed(M_1)) {
        scene = 0;
        scene_activate();
    }
    if (is_bot_button_pressed(M_2)) {
        scene = 1;
        scene_activate();
    }
    if (is_bot_button_pressed(M_3)) {
        scene = 2;
        scene_activate();
    }
    if (is_bot_button_pressed(M_4)) {
        scene = 3;
        scene_activate();
    }
    if (is_bot_button_pressed(M_5)) {
        scene = 4;
        scene_activate();
    }
    if (is_bot_button_pressed(M_6)) {
        scene = 5;
        scene_activate();
    }

    // Choose which amp channel to reprogram as:
    if (is_top_button_pressed(M_1)) {
        scene_update(scene, 0, 0);
    }
    if (is_top_button_pressed(M_2)) {
        scene_update(scene, 0, +5);
    }
    if (is_top_button_pressed(M_3)) {
        scene_update(scene, 1, 0);
    }
    if (is_top_button_pressed(M_4)) {
        scene_update(scene, 1, +5);
    }
    if (is_top_button_pressed(M_5)) {
        scene_update(scene, 2, 0);
    }
    if (is_top_button_pressed(M_6)) {
        scene_update(scene, 2, +5);
    }

    // STORE released after timeout?
    if (is_pressed_store()) {
        // start timer for STORE:
        timer_held_tapstore = 1;
    } else if (is_held_store() && is_timer_elapsed(tapstore)) {
        // STORE:
        store_program_state();
        // flash LEDs for 800ms:
        timeout_flash = 80;
        // disable STORE timer:
        timer_held_tapstore = 0;
    } else if (is_released_store()) {
        timer_held_tapstore = 0;
    }

    // NEXT/PREV inc/dec Out Level:
    if (is_pressed_next()) {
        scene_update(scene, pr_rjm[scene], pr_out_level[scene] + 1);
    }
    if (is_pressed_prev()) {
        scene_update(scene, pr_rjm[scene], pr_out_level[scene] - 1);
    }
}

void handle_mode_SETLIST_REORDER(void) {
    u8 tmp;

    // CANCEL exits without swapping:
    if (is_pressed_cancel()) {
        switch_mode(MODE_PROGRAMMING);
    }

    // Select setlist entry to swap with:

    // NEXT
    if (is_pressed_next()) {
        timer_held_nextprev = 1;
        song_next();
    } else if (is_released_next()) {
        timer_held_nextprev = 0;
    } else if (is_held_next()) {
        if (timer_looped_nextprev) {
            timer_looped_nextprev = 0;
            song_next();
        }
    }

    // PREV
    if (is_pressed_prev()) {
        timer_held_nextprev = 1;
        song_prev();
    } else if (is_released_prev()) {
        timer_held_nextprev = 0;
    } else if (is_held_prev()) {
        if (timer_looped_nextprev) {
            timer_looped_nextprev = 0;
            song_prev();
        }
    }

    // STORE to swap:
    if (is_pressed_store()) {
        // Swap setlist entries:
        tmp = sl.entries[slp].program;
        sl.entries[slp].program = sl.entries[swap_slp].program;
        sl.entries[swap_slp].program = tmp;
        // Switch back to original setlist index:
        slp = swap_slp;
        // Go back to programming mode:
        switch_mode(MODE_PROGRAMMING);
    }
}

// main control loop
void controller_handle(void) {
    // poll foot-switch depression status:
    u16 tmp = fsw_poll();
    fsw.bot.byte = tmp & 0xFF;
    fsw.top.byte = (tmp >> 8) & 0xFF;

    if (mode == MODE_LIVE) {
        handle_mode_LIVE();
    } else if (mode == MODE_PROGRAMMING) {
        handle_mode_PROGRAMMING();
    } else if (mode == MODE_SCENE_DESIGN) {
        handle_mode_SCENE_DESIGN();
    } else if (mode == MODE_SETLIST_REORDER) {
        handle_mode_SETLIST_REORDER();
    }

    // Calculate LEDs state and send it:
    calc_leds();

    // Record the previous switch state:
    fsw_last = fsw;
}
#else

static void nothing(void) {
}

#endif
