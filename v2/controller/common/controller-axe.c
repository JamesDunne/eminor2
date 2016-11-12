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
|   BOOST1 BOOST2                       MODE  PR_PRV PR_NXT  |
|                                                            |
|                                                            |
|     *      *      *      *      *      *      *      *     |
|   GAIN1  GAIN2          FX            TAP   SC_PRV SC_NXT  |
|                                      STORE                 |
|------------------------------------------------------------|

	Top row of buttons controls amp 1 settings
	Bottom row of buttons controls amp 2 settings

	Press DRV    to change from clean to dirty (LED off is clean, on is dirty); gapless audio using scene controllers to modify amp gain
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
|-------------------------------------------------------------------|
|     *       *       *       *       *       *       *       *     |
|   GATE1   PITCH1 CHORUS1  COMP1   PHSER1  DELAY1                  |
|                                                                   |
|                                                                   |
|     *       *       *       *       *       *       *       *     |
|   GATE2   PITCH2 CHORUS2  COMP2   PHSER2  DELAY2  EXIT    ENTER   |
|                                                                   |
|-------------------------------------------------------------------|

    GATE1 -- PITCH1 -- CHORUS1 -- AMP1 -- COMP1 -- PHASER1 -- DELAY1 -\               
                                                                       \- VOL1 --- CAB
                                                                       /- VOL2 -/     
    GATE2 -- PITCH2 -- CHORUS2 -- AMP2 -- COMP2 -- PHASER2 -- DELAY2 -/               
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
	}
	else if (mode == MODE_SCENE_DESIGN) {
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

	lcd_updated_all();
#endif
}

static void calc_leds(void) {
	send_leds();
}

// Set g-major CC value
static void axe_cc_set(u8 cc, u8 val) {
    midi_send_cmd2(0xB, axe_midi_channel, cc, val);
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

    curr_leds = 0x0000U;
    last_leds = 0xFFFFU;

#ifdef FEAT_LCD
    for (i = 0; i < LCD_ROWS; ++i)
        lcd_rows[i] = lcd_row_get(i);

    for (i = 0; i < LCD_COLS; ++i) {
        lcd_rows[0][i] = "                    "[i];
        lcd_rows[1][i] = "                    "[i];
        lcd_rows[2][i] = "                    "[i];
        lcd_rows[3][i] = "                    "[i];
    }

    update_lcd();
#endif

#ifdef HWFEAT_LABEL_UPDATES
    labels = label_row_get(0);
    labels[0] = "BOT1";
    labels[1] = "BOT2";
    labels[2] = "BOT3";
    labels[3] = "BOT4";
    labels[4] = "BOT5";
    labels[5] = "BOT6";
    labels[6] = "BOT7";
    labels[7] = "BOT8";
    label_row_update(0);

    labels = label_row_get(1);
    labels[0] = "TOP1";
    labels[1] = "TOP2";
    labels[2] = "TOP3";
    labels[3] = "TOP4";
    labels[4] = "TOP5";
    labels[5] = "TOP6";
    labels[6] = "TOP7";
    labels[7] = "TOP8";
    label_row_update(1);
#endif
}

// called every 10ms
void controller_10msec_timer(void) {

}

// main control loop
void controller_handle(void) {
    // poll foot-switch depression status:
    u16 tmp = fsw_poll();
    fsw.bot.byte = (u8)(tmp & 0xFF);
    fsw.top.byte = (u8)((tmp >> 8) & 0xFF);

	send_leds();

    // Record the previous switch state:
    fsw_last = fsw;
}

#else

static void nothing(void) {}

#endif
