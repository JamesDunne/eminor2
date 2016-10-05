/*
    Programmable e-minor MIDI foot controller v2.

    Currently designed to work with:
        Axe-FX II (MIDI channel 3)

    Written by
    James S. Dunne
    https://github.com/JamesDunne/
    2016-10-01
*/

#if HW_VERSION == 4

#include <assert.h>
#include <stdio.h>
#include "../common/types.h"
#include "../common/hardware.h"

/*
LIVE:
|------------------------------------------------------------|
|     *      *      *      *      *      *      *      *     |
|   DRV1    XY1   VOL--  VOL++   FX1    MODE  PR_PRV PR_NXT  |
|                                                            |
|                                                            |
|     *      *      *      *      *      *      *      *     |
|   DRV2    XY2   VOL--  VOL++   FX2    TAP   SC_PRV SC_NXT  |
|                                      STORE                 |
|------------------------------------------------------------|

	Top row of buttons controls amp 1 settings
	Bottom row of buttons controls amp 2 settings

	Press DRV    to change from clean to dirty (LED off is clean, on is dirty); gapless audio using scene controllers to modify amp parameters
	Press XY     to switch AMP1/2 between X and Y settings (e.g. X = Mark V ch 2, Y = Mark V ch 3); causes audio gap
	Press VOL--  to decrease amp volume by 1dB
	Press VOL++  to increase amp volume by 1dB
	Press FX     to alter effects for amp 1/2

	Press TAP    to send tap tempo
	Hold  STORE  to store current scene settings

	Press SC_PRV to move to previous scene
	Press SC_NXT to move to next scene

	Press PR_PRV to move to previous setlist song / program #
	Press PR_NXT to move to next setlist song / program #

	Use scene controllers to transition from clean to dirty on both AMP1 and AMP2, controlled separately

    Press MODE   to switch between set-list order and program # order

FX EDITOR:
|------------------------------------------------------------|
|     *      *      *      *      *      *      *      *     |
|   GATE1  PITCH1 COMP1 CHORUS1 PHSER1 DELAY1                |
|                                                            |
|                                                            |
|     *      *      *      *      *      *      *      *     |
|   GATE2  PITCH2 COMP2 CHORUS2 PHSER2 DELAY2 EXIT   ENTER   |
|                                                            |
|------------------------------------------------------------|

    GATE1 -- PITCH1 -- AMP1 -- COMP1 -- CHORUS1 -- PHASER1 -- DELAY1 -\               
                                                                       \- VOL1 --- CAB
                                                                       /- VOL2 -/     
    GATE2 -- PITCH2 -- AMP2 -- COMP2 -- CHORUS2 -- PHASER2 -- DELAY2 -/               

*/

#define scene_descriptor_count 8

struct sequence {
	// Number of entries in the sequence
	u8 count;

	u8 scenes[19];
};

// Program data structure loaded from / written to flash memory:
struct program {
    // Name of the program in ASCII, max 20 chars, NUL terminator is optional at 20 char limit; NUL padding is preferred:
    u8 name[20];

    // Scene descriptors:
    struct scene_descriptor {
        // Ivvv vvCC
        // |||| ||||
        // |||| ||\--- (unsigned 0-3 = RJM channel)
        // |\--------- (  signed -16..+15, offset -9 = -25..+6)
        // \---------- Is Initial Scene
        u8 part1;

        // M000 00CC
        // |      ||
        // |      \--- (unsigned 0-3 = Axe-FX scene)
        // |
        // \---------- Is Muted
        // TODO: volume ramp from previous!
        u8 part2;
    } scene[8];

    // G-major effects enabled per scene (see fxm_*):
    u8 fx[8];

	// Sequence of pre-programmed scene changes:
	struct sequence sequence;
};

// NOTE(jsd): Struct size must be a divisor of 64 to avoid crossing 64-byte boundaries in flash!
// Struct sizes of 1, 2, 4, 8, 16, and 32 qualify.
COMPILE_ASSERT(sizeof(struct program) == 64);

// Mark V channel 1
#define rjm_channel_1       0x00
// Mark V channel 2
#define rjm_channel_2       0x01
// Mark V channel 3
#define rjm_channel_3       0x02

#define rjm_channel_mask    0x03

#define scene_level_mask (31 << 2)
#define scene_level_shr  2

// 5-bit signed values
#define scene_level_offset  9
#define scene_level_0       ((( 0 + scene_level_offset) & 31) << 2)
#define scene_level_pos6    (((+6 + scene_level_offset) & 31) << 2)

#define scene_initial       0x80

#define axe_scene_1         0x00
#define axe_scene_2         0x01
#define axe_scene_3         0x02
#define axe_scene_4         0x02

#define axe_scene_mask      0x03

#define axe_scene_muted     0x80

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
#define gmaj_midi_channel	 0
#define rjm_midi_channel	 1
#define axe_midi_channel	 2
#define triaxis_midi_channel 3

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

// Axe-FX CC messages:
#define axe_cc_taptempo         14
#define axe_cc_tuner            15

#define axe_cc_scene            34

// Add +1 (dB?) to gmajor in level to adjust for delay effect volume loss:
#define delay_level_adjust      1

#define is_pressed(rowname, mask) is_##rowname##_button_pressed(mask)
#define is_held(rowname, mask) is_##rowname##_button_held(mask)
#define is_released(rowname, mask) is_##rowname##_button_released(mask)

// Define our buttons by name:
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
    MODE_SCENE_DESIGN,
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
u8 is_gmaj_muted; // 0 or 1

// Current g-major program # (0-127):
u8 gmaj_program;
// Next g-major program to update to:
u8 next_gmaj_program;

u8 scene, live_scene;
u8 last_rjm_channel;
u8 last_gmaj_in_level;
u8 last_fx;
u8 last_bot_button_mask;
u8 last_axe_muted;

// Current program data:
struct program pr;
// Decoded RJM channels (0-based channel number, alternating SOLO modes):
u8 pr_rjm[scene_descriptor_count], live_pr_rjm[scene_descriptor_count];
s8 pr_out_level[scene_descriptor_count], live_pr_out_level[scene_descriptor_count];
u8 pr_axe_scene[scene_descriptor_count];
u8 pr_axe_muted[scene_descriptor_count];

u8 axe_scene, last_axe_scene;   // 0 - 3

u8 curr_seq;

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

#define declare_timer(name)         u8 timer_held_##name, timer_satisfied_##name
#define declare_timer_looper(name)  u8 timer_held_##name, timer_satisfied_##name, timer_looped_##name

#define start_timer(name)           timer_satisfied_##name = 0; timer_held_##name = 1
#define reset_timer(name)           timer_satisfied_##name = 0; timer_held_##name = 0
#define set_timer_satisfied(name)   timer_satisfied_##name = 1

#define is_timer_satisfied(name)    (timer_satisfied_##name == 1)
#define is_timer_elapsed(name)      (!is_timer_satisfied(name) && ((timer_held_##name & 127) >= (timer_timeout_##name + 1)))

#define init_timer(name)            timer_held_##name = 0
#define init_timer_looper(name)     timer_held_##name = 0, timer_looped_##name = 0

declare_timer(tapstore);
#define timer_timeout_tapstore  75

declare_timer(fx);
#define timer_timeout_fx        30

declare_timer(sw);
#define timer_timeout_sw        75

declare_timer(mute);
#define timer_timeout_mute      75

declare_timer(prog);
#define timer_timeout_prog      150

declare_timer(flash);

declare_timer(design);
#define timer_timeout_design    75

// next/prev loops and sets timer_looped_nextprev = 1 on each loop around.
declare_timer_looper(nextprev);
#define timer_timeout_nextprev  45
#define timer_loop_nextprev     10

static s8 ritoa(u8 *s, u8 n, s8 i);
static void send_leds(void);
static void update_lcd(void);

static u8 is_top_button_pressed(u8 mask) {
	// Top switch press cannot be an accident:
    return (fsw_last.bot.byte == 0) && (fsw.bot.byte == 0) && (fsw_last.top.byte == 0) && (fsw.top.byte == mask);
}

static u8 is_bot_button_pressed(u8 mask) {
	// Always switch programs regardless of whether a top switch was accidentally depressed:
    return (fsw_last.bot.byte == 0) && (fsw.bot.byte == mask);
}

static u8 is_top_button_released(u8 mask) {
    return ((fsw_last.top.byte & mask) == mask) && ((fsw.top.byte & mask) == 0);
}

static u8 is_bot_button_released(u8 mask) {
    return ((fsw_last.bot.byte & mask) == mask) && ((fsw.bot.byte & mask) == 0);
}

static u8 is_top_button_held(u8 mask) {
    return (fsw.bot.byte == 0) && (fsw.top.byte == mask);
}

static u8 is_bot_button_held(u8 mask) {
    return (fsw.top.byte == 0) && (fsw.bot.byte == mask);
}

// Loads ROM describing the initial on/off state of effects
void load_program_state(void) {
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

        pr.scene[0].part1 = rjm_channel_1 | scene_level_0;
        pr.scene[1].part1 = rjm_channel_1 | scene_level_0;
        pr.scene[2].part1 = rjm_channel_1 | scene_level_pos6;
        pr.scene[3].part1 = rjm_channel_2 | scene_level_0;
        pr.scene[4].part1 = rjm_channel_2 | scene_level_pos6;
        pr.scene[5].part1 = rjm_channel_3 | scene_level_0;
        pr.scene[6].part1 = rjm_channel_3 | scene_level_0;
        pr.scene[7].part1 = rjm_channel_3 | scene_level_pos6;

        pr.scene[0].part2 = axe_scene_1;
        pr.scene[1].part2 = axe_scene_1;
        pr.scene[2].part2 = axe_scene_1;
        pr.scene[3].part2 = axe_scene_2;
        pr.scene[4].part2 = axe_scene_2;
        pr.scene[5].part2 = axe_scene_3;
        pr.scene[6].part2 = axe_scene_3;
        pr.scene[7].part2 = axe_scene_4;

        pr.fx[0] = (fxm_compressor);
        pr.fx[1] = (fxm_compressor);
        pr.fx[2] = (fxm_compressor);
        pr.fx[3] = (fxm_noisegate);
        pr.fx[4] = (fxm_noisegate);
        pr.fx[5] = (fxm_noisegate);
        pr.fx[6] = (fxm_noisegate);
        pr.fx[7] = (fxm_noisegate | fxm_delay);
    }

    // Default to main unboosted rhythm channel:
    scene = 5;

    // Decode the scene descriptors:
    for (i = 0; i < scene_descriptor_count; ++i) {
        // Get the descriptor:
        u8 rdesc = pr.scene[i].part1;

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

        pr_rjm[i] = new_rjm_actual;
        pr_axe_scene[i] = pr.scene[i].part2 & axe_scene_mask;
        pr_axe_muted[i] = ((pr.scene[i].part2 & axe_scene_muted) == axe_scene_muted) ? 1 : 0;
        pr_out_level[i] = out_level;
    }

	if (pr.sequence.count > 0) {
		scene = pr.sequence.scenes[0];
		curr_seq = 1;
		if (pr.sequence.count > 1) {
			start_timer(prog);
		} else {
			reset_timer(prog);
		}
	} else {
		curr_seq = 0;
		reset_timer(prog);
	}
}

static void store_program_state(void) {
    // Store effects on/off state of current program:
    u8 i;

    // Set initial channel:
    for (i = 0; i < scene_descriptor_count; i++) {
        pr.scene[i].part1 &= 0x7F;
    }
    pr.scene[scene].part1 |= 0x80;

    // Store program state:
    flash_store((u16)gmaj_program * sizeof(struct program), sizeof(struct program), (u8 *)&pr);
}

// Set g-major CC value
static void gmaj_cc_set(u8 cc, u8 val) {
    midi_send_cmd2(0xB, gmaj_midi_channel, cc, val);
}

static void axe_cc_set(u8 cc, u8 val) {
    midi_send_cmd2(0xB, axe_midi_channel, cc, val);
}

static void gmaj_enable_mute(void) {
    is_gmaj_muted = 1;
    gmaj_cc_set(gmaj_cc_mute, 0x7F);
    update_lcd();
}

static void gmaj_disable_mute(void) {
    is_gmaj_muted = 0;
    gmaj_cc_set(gmaj_cc_mute, 0x00);
    update_lcd();
}

static void gmaj_toggle_mute(void) {
    is_gmaj_muted ^= (u8)1;
    gmaj_cc_set(gmaj_cc_mute, is_gmaj_muted ? (u8)0x7F : (u8)0x00);
    update_lcd();
}

static void scene_update_current(void);

static void scene_activate(void);

static void axe_enable_mute(void) {
    pr_axe_muted[scene] = 1;
    scene_activate();
}

static void axe_disable_mute(void) {
    pr_axe_muted[scene] = 0;
    scene_activate();
}

static void axe_toggle_mute(void) {
    pr_axe_muted[scene] ^= (u8)1;
    scene_activate();
}

// Reset g-major mute to off if on
static void reset_tuner_mute(void) {
    // Turn off mute if enabled:
    if (is_gmaj_muted) {
        gmaj_disable_mute();
    }
}

static void scene_activate_level(void);

// Toggle a g-major CC effect
static void gmaj_cc_toggle(u8 idx) {
    u8 togglevalue = 0x00;
    u8 idxMask;

    // Make sure we don't go out of range:
    assert(idx < 8);

    idxMask = ((u8)1 << idx);

    // Toggle on/off the selected continuous controller:
    pr.fx[scene] ^= idxMask;

    // Determine the MIDI value to use depending on the newly toggled state:
    if (pr.fx[scene] & idxMask) togglevalue = 0x7F;

    // Send MIDI command:
    gmaj_cc_set(gmaj_cc_lookup[idx], togglevalue);

    scene_activate_level();

    update_lcd();
}

static void update_effects_MIDI_state(void) {
    u8 fx = pr.fx[scene];

    if (fx == last_fx) return;

    // Assume g-major effects are in a random state so switch each on/off according to desired state:
    gmaj_cc_set(gmaj_cc_noisegate, (fx & fxm_noisegate) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_delay, (fx & fxm_delay) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_pitch, (fx & fxm_pitch) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_filter, (fx & fxm_filter) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_chorus, (fx & fxm_chorus) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_compressor, (fx & fxm_compressor) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_reverb, (fx & fxm_reverb) ? 0x7F : 0x00);
    gmaj_cc_set(gmaj_cc_eq, (fx & fxm_eq) ? 0x7F : 0x00);

    last_fx = fx;
}

static void scene_update(u8 preset, u8 new_rjm_channel, s8 out_level) {
    u8 desc = pr.scene[preset].part1;

    desc &= ~rjm_channel_mask;
    desc |= new_rjm_channel & rjm_channel_mask;

    // Calculate 5-bit level:
    if (out_level < -25) out_level = -25;
    else if (out_level > 6) out_level = 6;

    // Set the bits in the descriptor:
    desc &= ~scene_level_mask;
    desc |= (u8)((out_level + scene_level_offset) & 31) << scene_level_shr;

    // Update program data to be written back to flash:
    pr.scene[preset].part1 = desc;
    // TOOD: volume ramp feature!
    pr.scene[preset].part2 = (pr_axe_scene[preset] & (u8)axe_scene_mask) | (pr_axe_muted[preset] << 7);

    // Update calculated data:
    pr_rjm[preset] = new_rjm_channel;
    pr_out_level[preset] = out_level;

    live_pr_rjm[preset] = pr_rjm[preset];
    live_pr_out_level[preset] = pr_out_level[preset];

    scene_activate_level();
    update_lcd();
}

static void scene_update_current() {
    scene_update(scene, pr_rjm[scene], pr_out_level[scene]);
}

static s8 fx_adjusted_out_level(u8 fx, s8 level) {
    // Add volume to compensate for volume loss of delay effect:
    if ((fx & fxm_delay) == fxm_delay) {
        return level + delay_level_adjust;
    }
    // Max of +6 (dB?):
    if (level > 6) level = 6;
    return level;
}

static void scene_activate_level(void) {
    u8 gmaj_in_level;

    // Max boost is +6dB
    // Send the out level to the G-Major as Global-In Level:
    gmaj_in_level = fx_adjusted_out_level(pr.fx[scene], pr_out_level[scene]) + (u8)121;
    if (gmaj_in_level > 127) gmaj_in_level = 127;
    if (gmaj_in_level < 0) gmaj_in_level = 0;

    if (gmaj_in_level != last_gmaj_in_level) {
        midi_send_cmd2(0xB, gmaj_midi_channel, gmaj_cc_global_in_level, gmaj_in_level);
        last_gmaj_in_level = gmaj_in_level;
    }
}

static void scene_activate(void) {
    u8 i;

    // Switch g-major program if needed:
    if (next_gmaj_program != gmaj_program) {
        reset_timer(flash);

        // Send the MIDI PROGRAM CHANGE message to t.c. electronic g-major effects unit:
        midi_send_cmd1(0xC, gmaj_midi_channel, next_gmaj_program);

        // Update internal state:
        gmaj_program = next_gmaj_program;
    }

    //if (pr_rjm[scene] != last_rjm_channel) {
        // Send the MIDI PROGRAM CHANGE message to RJM Mini Amp Gizmo:
        midi_send_cmd1(0xC, rjm_midi_channel, (pr_rjm[scene] << 1));
        last_rjm_channel = pr_rjm[scene];
    //}

    scene_activate_level();

    // Send Axe-FX scene change:
    axe_scene = pr_axe_scene[scene];
    //if (axe_scene != last_axe_scene) {
		// Send Axe-FX scene change:
        axe_cc_set(axe_cc_scene, axe_scene);
		// Also send program change to TriAxis preamp:
		midi_send_cmd1(0xC, triaxis_midi_channel, axe_scene);
		last_axe_scene = axe_scene;
    //}

    // Send Axe-FX mute change:
    //if (pr_axe_muted[scene] != last_axe_muted) {
        axe_cc_set(axe_cc_tuner, pr_axe_muted[scene] ? (u8)0x7F : (u8)0x00);
        last_axe_muted = pr_axe_muted[scene];
    //}

    live_scene = scene;
    for (i = 0; i < scene_descriptor_count; i++) {
        live_pr_rjm[i] = pr_rjm[i];
        live_pr_out_level[i] = pr_out_level[i];
    }

    scene_update_current();

    // Send MIDI effects enable commands and set effects LEDs:
    update_effects_MIDI_state();

    update_lcd();
}

// Set RJM program to p (0-5)
static void set_rjm_channel(u8 p) {
    assert(p < scene_descriptor_count);

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
            start_timer(flash);
        }
    } else {
        reset_timer(flash);
    }

    // Load new effect states but don't switch MIDI yet:
    load_program_state();
}

static void set_gmaj_program(void) {
    set_gmaj_program_only();

    // Update LCD:
    update_lcd();
}

static void switch_setlist_mode(u8 new_mode) {
    u8 i;

    setlist_mode = new_mode;
    if (setlist_mode == 1) {
        // Set mode:
        flash_load((u16)(128 * sizeof(struct program)) + (u16)sli * sizeof(struct set_list), sizeof(struct set_list), (u8 *)&sl);
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

    is_gmaj_muted = 0;
    toggle_tap = 0;

    scene = 0;
    axe_scene = 2;
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
    labels[6] = "SC7";
    labels[7] = "SC8";
    label_row_update(0);

    labels = label_row_get(1);
    labels[0] = "AX1";
    labels[1] = "AX2";
    labels[2] = "AX3";
    labels[3] = "AX4";
    labels[4] = "AX-MUTE";
    labels[5] = "MK-MUTE";
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
    if ((timer_held_##name > 0) && !is_timer_satisfied(name)) { \
		if (timer_held_##name == 255) \
			timer_held_##name = 128; \
		else \
			timer_held_##name++; \
    }
#define inc_timer_loop(name) \
    if ((timer_held_##name > 0) && !is_timer_satisfied(name)) { \
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

// Update LCD display:
static void update_lcd(void) {
#ifdef HWFEAT_LABEL_UPDATES
    u8 **labels;
#endif
#ifdef FEAT_LCD
    s8 i;
    u8 b = 1;
    u8 fx = pr.fx[scene];
    u8 show_row3_fx = 0;

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

    if (mode == MODE_LIVE) {
        show_row3_fx = 1;
#if HWFEAT_LABEL_UPDATES
        labels = label_row_get(0);
        labels[0] = "SC1";
        labels[1] = "SC2";
        labels[2] = "SC3";
        labels[3] = "SC4";
        labels[4] = "SC5";
        labels[5] = "SC6";
        labels[6] = "SC7";
        labels[7] = "SC8";
        label_row_update(0);

        labels = label_row_get(1);
        labels[0] = "AX1";
        labels[1] = "AX2";
        labels[2] = "AX3";
        labels[3] = "AX4";
        labels[4] = "AX-MUTE";
        labels[5] = "MK-MUTE";
        labels[6] = "PREV";
        labels[7] = "NEXT";
        label_row_update(1);
#endif
    } else if (mode == MODE_SCENE_DESIGN) {
        // Show selected scene on LCD since we don't have an LED for it:
        lcd_rows[0][17] = 'S';
        lcd_rows[0][18] = 'C';
        lcd_rows[0][19] = '1' + scene;

        show_row3_fx = 1;
#if HWFEAT_LABEL_UPDATES
        labels = label_row_get(0);
        labels[0] = "CH1";
        labels[1] = "CH2";
        labels[2] = "CH3";
        labels[3] = "VOL--";
        labels[4] = "VOL++";
        labels[5] = "VOL=6";
        labels[6] = "SAVE";
        labels[7] = "EXIT";
        label_row_update(0);

        labels = label_row_get(1);
        labels[0] = "COMP";
        labels[1] = "FILTER";
        labels[2] = "PITCH";
        labels[3] = "CHORUS";
        labels[4] = "DELAY";
        labels[5] = "REVERB";
        labels[6] = "GATE";
        labels[7] = "EQ";
        label_row_update(1);
#endif
    }

    if (setlist_mode == 0) {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[1][i] = "Program         #   "[i];
        }
        ritoa(lcd_rows[1], next_gmaj_program + 1, 19);
    } else {
        // Show setlist data:
        u8 yyyy = sl.d1 >> 1;
        u8 mm = ((sl.d1 & 1) << 3) | (sl.d0 >> 5);
        u8 dd = (sl.d0 & 31);
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[1][i] = "2014-01-01       # 0"[i];
        }
        ritoa(lcd_rows[1], yyyy + 14, 3);
        ritoa(lcd_rows[1], mm + 1, 6);
        ritoa(lcd_rows[1], dd + 1, 9);

        ritoa(lcd_rows[1], slp + 1, 19);
    }

    if (show_row3_fx) {
        b = 1;
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[3][i] = "  c-f-p-o-d-v-g-q-  "[i];
        }
        // Upper-case enabled FX labels:
        for (i = 0; i < 8; i++, b <<= 1) {
            if ((fx & b) == b) {
                lcd_rows[3][i * 2 + 2] &= ~0x20;
            }
        }
    }

    // "A-CH1 B-3  +00  ****"
    // "MK-C1+00 AX-S3   SC1"
    {
        u8 gmaj_ch, axe_ch;
        s8 out_level;
        u8 pos_level;

        if (mode == MODE_SCENE_DESIGN) {
            gmaj_ch = pr_rjm[scene];
            axe_ch = pr_axe_scene[scene];
            out_level = fx_adjusted_out_level(pr.fx[scene], pr_out_level[scene]);
            pos_level = +out_level;
        } else {
            gmaj_ch = live_pr_rjm[live_scene];
            axe_ch = pr_axe_scene[live_scene];
            out_level = fx_adjusted_out_level(pr.fx[live_scene], live_pr_out_level[live_scene]);
            pos_level = +out_level;
        }

        // Mark V channel name of live setting:
        lcd_rows[0][0 + 0] = 'M';
        lcd_rows[0][0 + 1] = 'K';
        lcd_rows[0][0 + 2] = '-';
        lcd_rows[0][0 + 3] = 'C';
        lcd_rows[0][0 + 4] = '1' + gmaj_ch;

        // g-major Global In Level:
        if (out_level == 0)
            lcd_rows[0][6] = ' ';
        else if (out_level > 0)
            lcd_rows[0][6] = '+';
        else {
            lcd_rows[0][6] = '-';
            pos_level = -out_level;
        }

        litoa(lcd_rows[0], pos_level, 7);

        lcd_rows[0][10 + 0] = 'A';
        lcd_rows[0][10 + 1] = 'X';
        lcd_rows[0][10 + 2] = '-';
        lcd_rows[0][10 + 3] = 'S';
        lcd_rows[0][10 + 4] = '1' + axe_ch;

        if (next_gmaj_program != gmaj_program) {
            // Pending program change:
            for (i = 16; i < 20; i++) {
                lcd_rows[0][i] = '*';
            }
        }
    }

    lcd_updated_all();
#endif
}

static void calc_leds(void) {
    if (mode == MODE_LIVE) {
        leds[MODE_LIVE].top.byte = (1 << axe_scene) | (pr_axe_muted[scene] << 4) | (is_gmaj_muted << 5) | (fsw.top.byte & (M_7 | M_8));

        // Flash pending scene LED:
		if (next_gmaj_program != gmaj_program) {
			if ((timer_held_flash & 15) >= 8) {
				// Set only current program LED on bottom:
				leds[MODE_LIVE].bot.byte = (1 << scene);
			}
			else {
				// Preserve only LEDs 7 and 8 (clear LEDS 1-6):
				leds[MODE_LIVE].bot.byte = 0;
			}
		} else if ((timer_held_prog & 63) >= 56) {
			// Flash next scene to switch to in order to follow sequence:
			leds[MODE_LIVE].bot.byte = (1 << scene);
			leds[MODE_LIVE].bot.byte |= (1 << pr.sequence.scenes[curr_seq]);
        } else {
            // Set only current program LED on bottom, preserve LEDs 7 and 8:
            leds[MODE_LIVE].bot.byte = (1 << scene);
        }
    } else if (mode == MODE_SCENE_DESIGN) {
        // Reset top LEDs to new state:
        leds[MODE_SCENE_DESIGN].top.byte = pr.fx[scene];
        // Show amp channel on left 3 LEDs, and show depressed status on remaining LEDs:
        leds[MODE_SCENE_DESIGN].bot.byte = (1 << pr_rjm[scene]) | (fsw.bot.byte & (M_4 | M_5 | M_6 | M_7 | M_8));

        if (is_timer_elapsed(fx)) {
            // Flash top LEDs on/off:
            if ((timer_held_fx & 15) >= 8) {
                leds[MODE_SCENE_DESIGN].top.byte = (pr.fx[scene] & ~fsw.top.byte);
            } else {
                leds[MODE_SCENE_DESIGN].top.byte = (pr.fx[scene] | fsw.top.byte);
            }
        }
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

#define button_timer_logic(top_or_bot, btn_mask, timername, notimer, yestimer) \
    if (is_##top_or_bot##_button_pressed(btn_mask)) { \
        start_timer(timername); \
    } else if (is_##top_or_bot##_button_held(btn_mask) && is_timer_elapsed(timername)) { \
        set_timer_satisfied(timername); \
        yestimer; \
    } else if (is_##top_or_bot##_button_released(btn_mask) && !is_timer_elapsed(timername) && !is_timer_satisfied(timername)) { \
        reset_timer(timername); \
        notimer; \
    }

static void fx_button_logic(u8 btn_mask, u8 fx_idx) {
    if (is_top_button_pressed(btn_mask)) {
        gmaj_cc_toggle(fx_idx);
        start_timer(fx);
    } else if (is_top_button_released(btn_mask) && is_timer_elapsed(fx)) {
        reset_timer(fx);
        gmaj_cc_toggle(fx_idx);
    }
}

void handle_mode_SCENE_DESIGN(void) {
    // handle top 8 FX block buttons:
    fx_button_logic(M_1, 0);
    fx_button_logic(M_2, 1);
    fx_button_logic(M_3, 2);
    fx_button_logic(M_4, 3);
    fx_button_logic(M_5, 4);
    fx_button_logic(M_6, 5);
    fx_button_logic(M_7, 6);
    fx_button_logic(M_8, 7);

    // Update amp channel:
    if (is_bot_button_pressed(M_1)) {
        scene_update(scene, 0, pr_out_level[scene]);
        scene_activate();
    }
    if (is_bot_button_pressed(M_2)) {
        scene_update(scene, 1, pr_out_level[scene]);
        scene_activate();
    }
    if (is_bot_button_pressed(M_3)) {
        scene_update(scene, 2, pr_out_level[scene]);
        scene_activate();
    }
    if (is_bot_button_pressed(M_4)) {
        scene_update(scene, pr_rjm[scene], pr_out_level[scene] - (s8)1);
        scene_activate();
    }
    if (is_bot_button_pressed(M_5)) {
        scene_update(scene, pr_rjm[scene], pr_out_level[scene] + (s8)1);
        scene_activate();
    }
    if (is_bot_button_pressed(M_6)) {
        // Toggle between +3 and 0:
        if (pr_out_level[scene] != 6) {
            scene_update(scene, pr_rjm[scene], 3);
        } else {
            scene_update(scene, pr_rjm[scene], 0);
        }
        scene_activate();
    }

    // SAVE pressed:
    if (is_bot_button_pressed(M_7)) {
        // STORE:
        store_program_state();
        // flash LEDs for 800ms:
        timeout_flash = 80;
        // Back to previous mode:
        switch_mode(mode_last);
    }
    // EXIT pressed:
    if (is_bot_button_pressed(M_8)) {
        // Back to previous mode:
        switch_mode(mode_last);
    }
}

static void rjm_scene_change_button_logic(u8 btn_mask, u8 new_scene) {
    // hold down button to enter scene design mode to adjust FX, output volume, and channels.
    // press button again to send TAP TEMPO
    if (is_bot_button_pressed(btn_mask)) {
        set_rjm_channel(new_scene);
        reset_tuner_mute();

		// Advance sequence counter:
		if (curr_seq < pr.sequence.count) {
			if (pr.sequence.scenes[curr_seq] == new_scene) {
				curr_seq++;
				if (curr_seq < pr.sequence.count) {
					start_timer(prog);
				} else {
					reset_timer(prog);
				}
			}
		}

        if (last_bot_button_mask == btn_mask) {
            // tap tempo function:
            toggle_tap = ~toggle_tap & (u8)0x7F;
            gmaj_cc_set(gmaj_cc_taptempo, toggle_tap);
            axe_cc_set(axe_cc_taptempo, toggle_tap);
        }

        last_bot_button_mask = btn_mask;

        start_timer(design);
    } else if (is_bot_button_held(btn_mask) && is_timer_elapsed(design)) {
        switch_mode(MODE_SCENE_DESIGN);
        reset_timer(design);
    } else if (is_bot_button_released(btn_mask)) {
        reset_timer(design);
    }
}

static void axe_scene_change_button_logic(u8 btn_mask, u8 new_scene) {
    if (is_top_button_pressed(btn_mask)) {
        pr_axe_scene[scene] = new_scene;
        scene_activate();
    }
}

void handle_mode_LIVE(void) {
    // handle bottom 8 scene change buttons:
    rjm_scene_change_button_logic(M_1, 0);
    rjm_scene_change_button_logic(M_2, 1);
    rjm_scene_change_button_logic(M_3, 2);
    rjm_scene_change_button_logic(M_4, 3);
    rjm_scene_change_button_logic(M_5, 4);
    rjm_scene_change_button_logic(M_6, 5);
    rjm_scene_change_button_logic(M_7, 6);
    rjm_scene_change_button_logic(M_8, 7);

    // Axe-FX scene changes:
    axe_scene_change_button_logic(M_1, 0);
    axe_scene_change_button_logic(M_2, 1);
    axe_scene_change_button_logic(M_3, 2);
    axe_scene_change_button_logic(M_4, 3);

    // handle remaining 4 functions:
    button_timer_logic(top, M_5, fx, {
        axe_toggle_mute();
        scene_update_current();
    }, {
        // Toggle setlist mode:
        switch_setlist_mode((setlist_mode ^ 1));
    })
    button_timer_logic(top, M_6, fx, {
        gmaj_toggle_mute();
    }, {
        // STORE:
        store_program_state();
        // flash LEDs for 800ms:
        timeout_flash = 80;
    })

    if (setlist_mode == 0) {
        // Program mode:

        // NEXT
        if (is_pressed_next()) {
            start_timer(nextprev);
            prog_next();
        } else if (is_released_next()) {
            reset_timer(nextprev);
        } else if (is_held_next()) {
            if (timer_looped_nextprev) {
                timer_looped_nextprev = 0;
                prog_next();
            }
        }

        // PREV
        if (is_pressed_prev()) {
            start_timer(nextprev);
            prog_prev();
        } else if (is_released_prev()) {
            reset_timer(nextprev);
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
            start_timer(nextprev);
            song_next();
        } else if (is_released_next()) {
            reset_timer(nextprev);
        } else if (is_held_next()) {
            if (timer_looped_nextprev) {
                timer_looped_nextprev = 0;
                song_next();
            }
        }

        // PREV
        if (is_pressed_prev()) {
            start_timer(nextprev);
            song_prev();
        } else if (is_released_prev()) {
            reset_timer(nextprev);
        } else if (is_held_prev()) {
            if (timer_looped_nextprev) {
                timer_looped_nextprev = 0;
                song_prev();
            }
        }
    }
}

// main control loop
void controller_handle(void) {
    // poll foot-switch depression status:
    u16 tmp = fsw_poll();
    fsw.bot.byte = (u8)(tmp & 0xFF);
    fsw.top.byte = (u8)((tmp >> 8) & 0xFF);

    if (mode == MODE_LIVE) {
        handle_mode_LIVE();
    } else if (mode == MODE_SCENE_DESIGN) {
        handle_mode_SCENE_DESIGN();
    }

    // Calculate LEDs state and send it:
    calc_leds();

    // Record the previous switch state:
    fsw_last = fsw;
}

#else

static void nothing(void) {}

#endif
