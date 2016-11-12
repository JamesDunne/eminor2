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

// Axe-FX CC messages:
#define axe_cc_taptempo         14
#define axe_cc_tuner            15

#define axe_cc_scene            34

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

enum {
    MODE_LIVE = 0,
    MODE_SCENE_DESIGN,
    MODE_count
};

struct amp {
    u8 dirty;   // clean or dirty tone
    u8 xy;      // X or Y settings
};

struct state {
    // Footswitch state:
    io16 fsw;
    // Actual LED state:
    u16 leds;

    // Current mode:
    u8 mode;
    // LED state per mode:
    io16 mode_leds[MODE_count];

    // Per-amp settings:
    struct amp amp[2];
};

// Current and last state:
struct state curr, last;

#ifdef FEAT_LCD
// Pointers to LCD character rows:
u8 *lcd_rows[LCD_ROWS];
#endif

static void update_lcd(void);

// Set Axe-FX CC value
static void midi_set_axe_cc(u8 cc, u8 val) {
    midi_send_cmd2(0xB, axe_midi_channel, cc, val);
}

static u8 is_top_button_pressed(u8 mask) {
	// Top switch press cannot be an accident:
    return (last.fsw.bot.byte == 0) && (curr.fsw.bot.byte == 0) && (last.fsw.top.byte == 0) && (curr.fsw.top.byte == mask);
}

static u8 is_bot_button_pressed(u8 mask) {
	// Always switch programs regardless of whether a top switch was accidentally depressed:
    return (last.fsw.bot.byte == 0) && (curr.fsw.bot.byte == mask);
}

static u8 is_top_button_released(u8 mask) {
    return ((last.fsw.top.byte & mask) == mask) && ((curr.fsw.top.byte & mask) == 0);
}

static u8 is_bot_button_released(u8 mask) {
    return ((last.fsw.bot.byte & mask) == mask) && ((curr.fsw.bot.byte & mask) == 0);
}

static u8 is_top_button_held(u8 mask) {
    return (curr.fsw.bot.byte == 0) && (curr.fsw.top.byte == mask);
}

static u8 is_bot_button_held(u8 mask) {
    return (curr.fsw.top.byte == 0) && (curr.fsw.bot.byte == mask);
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
    curr.leds = (u16)curr.mode_leds[curr.mode].bot.byte | ((u16)curr.mode_leds[curr.mode].top.byte << 8);
	if (curr.leds != last.leds) {
		led_set(curr.leds);
		last.leds = curr.leds;
	}
}

// Update LCD display:
static void update_lcd(void) {
#ifdef HWFEAT_LABEL_UPDATES
	u8 **labels;
#endif
#ifdef FEAT_LCD
    s8 i;
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
#ifdef FEAT_LCD
	lcd_updated_all();
#endif
}

// ------------------------- Actual controller logic -------------------------

// set the controller to an initial state
void controller_init(void) {
    u8 i;
    u8 **labels;

    last.mode = MODE_LIVE;
    curr.mode = MODE_LIVE;
    for (i = 0; i < MODE_count; i++) {
        curr.mode_leds[i].top.byte = 0;
        curr.mode_leds[i].bot.byte = 0;
    }

    last.leds = 0xFFFFU;
    curr.leds = 0x0000U;

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

static u8 calc_scene(struct amp amp[]) {
    return amp[0].dirty | (amp[1].dirty << 1);
}

static void calc_leds(void) {
    curr.mode_leds[curr.mode].bot.bits._1 = curr.amp[0].dirty;
    curr.mode_leds[curr.mode].bot.bits._2 = curr.amp[1].dirty;

    send_leds();
}

// calculate the difference from last MIDI state to current MIDI state and send the difference as MIDI commands:
static void calc_midi(void) {
    // Axe-FX scene # is just a bitwise OR of (amp[0].dirty) and (amp[1].dirty << 1):
    u8 curr_scene = calc_scene(curr.amp);
    u8 last_scene = calc_scene(last.amp);

    if (curr_scene != last_scene) {
        midi_set_axe_cc(axe_cc_scene, curr_scene);
    }
}

// main control loop
void controller_handle(void) {
    // poll foot-switch depression status:
    u16 tmp = fsw_poll();
    curr.fsw.bot.byte = (u8)(tmp & 0xFF);
    curr.fsw.top.byte = (u8)((tmp >> 8) & 0xFF);

    // Handle clean/dirty switches:
    if (is_bot_button_pressed(M_1)) {
        curr.amp[0].dirty ^= 1;
    }
    if (is_bot_button_pressed(M_2)) {
        curr.amp[1].dirty ^= 1;
    }

    calc_midi();
    calc_leds();

    // Record the previous state:
    last = curr;
}

#else

static void nothing(void) {}

#endif
