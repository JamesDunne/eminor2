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
|   DIRTY  DELAY  PITCH  CHORUS VOL--  VOL++  PR_PRV PR_NXT  |
|                                             PR_ONE         |
|                                                            |
|     *      *      *      *      *      *      *      *     |
|   AMP1   AMP2    X/Y                  TAP   SC_PRV SC_NXT  |
|  RESET1 RESET2                       STORE  SC_ONE         |
|------------------------------------------------------------|

	Top row of buttons controls selected amp settings

    Press AMP1   to select AMP1 for modification on top row
    Press AMP2   to select AMP2 for modification on top row
    Hold  RESET1 to reset AMP1 to basic dirty tone and select AMP1
    Hold  RESET2 to reset AMP2 to basic dirty tone and select AMP2
    Press X/Y    to switch AMP1&2 between X and Y settings; causes audio gap

    Press DIRTY  to change from clean to dirty (LED off is clean, on is dirty); gapless audio using scene controllers to modify amp gain
    Press DELAY  to toggle delay effect
    Press PITCH  to toggle pitch effect
    Press CHORUS to toggle chorus effect
	Press VOL--  to decrease amp volume
	Press VOL++  to increase amp volume

	Press TAP    to send tap tempo
	Hold  STORE  to store current scene settings

	Press SC_PRV to move to previous scene
	Press SC_NXT to move to next scene

	Press PR_PRV to move to previous setlist song / program #
	Press PR_NXT to move to next setlist song / program #

	Use scene controllers to transition from clean to dirty on both AMP1 and AMP2, controlled separately

    Press MODE   to switch between set-list order and program # order

    GATE1 -- PITCH1 -- CHORUS1 -- AMP1 -- COMP1 -- PHASER1 -- DELAY1 -\               
                                                                       \- VOL1 --- CAB
                                                                       /- VOL2 -/     
    GATE2 -- PITCH2 -- CHORUS2 -- AMP2 -- COMP2 -- PHASER2 -- DELAY2 -/               
*/

struct amp {
    u8 dirty : 1;   // clean or dirty tone
    u8 delay : 1;   // delay on or off
    u8 pitch : 1;   // pitch on or off
    u8 chorus : 1;  // chorus on or off
    u8 xy : 1;      // X or Y amp (applies to both amps due to scene design)
    s8 volume : 3;  // volume = signed [-4, 3]
};

// amp state is 1 byte:
COMPILE_ASSERT(sizeof(struct amp) == 1);

// Program data structure loaded from / written to flash memory:
struct program {
    // Name of the program in ASCII, max 20 chars, NUL terminator is optional at 20 char limit; NUL padding is preferred:
    u8 name[20];

    // Number of scenes defined:
    u8 scene_count;
    u8 _unused;

    // Scene descriptors (2 bytes each):
    struct scene_descriptor {
        // Amp definitions:
        struct amp amp[2];
        // Index into name table:
        u8 name_index;
    } scene[14];
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

#ifdef FEAT_LCD
// Pointers to LCD character rows:
u8 *lcd_rows[LCD_ROWS];
#endif

enum {
    MODE_LIVE = 0,
    MODE_SCENE_DESIGN,
    MODE_count
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
    // Common X/Y mode for amps:
    u8 xy;
};

// Current and last state:
struct state curr, last;

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
    // Bottom row:
    labels = label_row_get(0);
    labels[0] = "DRV1";
    labels[1] = "DRV2";
    labels[2] = "X/Y";
    labels[3] = "FX";
    labels[4] = "TAP";
    labels[5] = "SAVE";
    labels[6] = "PREV SCENE";
    labels[7] = "NEXT SCENE";
    label_row_update(0);

    // Top row:
    labels = label_row_get(1);
    labels[0] = "BOOST1";
    labels[1] = "BOOST2";
    labels[2] = "";
    labels[3] = "";
    labels[4] = "";
    labels[5] = "";
    labels[6] = "PREV SONG";
    labels[7] = "NEXT SONG";
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
}

// called every 10ms
void controller_10msec_timer(void) {

}

static void calc_leds(void) {
    curr.mode_leds[curr.mode].bot.bits._1 = curr.amp[0].dirty;
    curr.mode_leds[curr.mode].bot.bits._2 = curr.amp[1].dirty;
    curr.mode_leds[curr.mode].bot.bits._3 = curr.xy;

    curr.mode_leds[curr.mode].top.bits._1 = curr.amp[0].boost;
    curr.mode_leds[curr.mode].top.bits._2 = curr.amp[1].boost;

    send_leds();
}

static u8 calc_scene(struct amp amp[], u8 xy) {
    return (amp[0].dirty | (amp[1].dirty << 1)) | ((xy & 1) << 2);
}

static u8 calc_boost_level(u8 boost) {
    return (127 - 64) + ((boost & 1) << 6);
}

// calculate the difference from last MIDI state to current MIDI state and send the difference as MIDI commands:
static void calc_midi(void) {
    // Axe-FX scene # is just a bitwise OR of (amp[0].dirty) and (amp[1].dirty << 1):
    u8 curr_scene = calc_scene(curr.amp, curr.xy);
    u8 last_scene = calc_scene(last.amp, last.xy);

    if (curr_scene != last_scene) {
        midi_set_axe_cc(axe_cc_scene, curr_scene);
    }
    if (curr.amp[0].boost != last.amp[0].boost) {
        midi_set_axe_cc(16, calc_boost_level(curr.amp[0].boost & 1));
    }
    if (curr.amp[1].boost != last.amp[1].boost) {
        midi_set_axe_cc(17, calc_boost_level(curr.amp[1].boost & 1));
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
    if (is_bot_button_pressed(M_3)) {
        curr.xy ^= 1;
    }

    // Handle boost switches:
    if (is_top_button_pressed(M_1)) {
        curr.amp[0].boost ^= 1;
    }
    if (is_top_button_pressed(M_2)) {
        curr.amp[1].boost ^= 1;
    }

    calc_midi();
    calc_leds();

    // Record the previous state:
    last = curr;
}

#else

static void nothing(void) {}

#endif
