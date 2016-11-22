/*
    Programmable e-minor MIDI foot controller v2.

    Currently designed to work with:
        Axe-FX II (MIDI channel 3)

    Written by
    James S. Dunne
    https://github.com/JamesDunne/
    2016-10-01

LIVE:
|------------------------------------------------------------|
|     *      *      *      *      *      *      *      *     |
|   DIRTY   X/Y   DELAY  PITCH  CHORUS FILTER PR_PRV PR_NXT  |
|                                             PR_ONE         |
|                                                            |
|     *      *      *      *      *      *      *      *     |
|   AMP1   AMP2   VOL=0  VOL--  VOL++   TAP   SC_PRV SC_NXT  |
|  RESET1 RESET2                       STORE  SC_ONE         |
|------------------------------------------------------------|

Top row of buttons controls selected amp settings

Press AMP1   to select AMP1 for modification on top row
Press AMP2   to select AMP2 for modification on top row
Hold  RESET1 to reset AMP1 to basic dirty tone and select AMP1
Hold  RESET2 to reset AMP2 to basic dirty tone and select AMP2

Press DIRTY  to change from clean to dirty (LED off is clean, on is dirty); gapless audio using scene controllers to modify amp gain
Press X/Y    to switch AMP1&2 between X and Y settings; causes audio gap
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

#if HW_VERSION == 4

#include "../common/types.h"
#include "../common/hardware.h"

struct amp {
    u8 dirty  : 1;  // clean or dirty tone
    u8 xy     : 1;  // X or Y amp (applies to both amps due to scene design)
    u8 delay  : 1;  // delay on or off
    u8 pitch  : 1;  // pitch on or off
    u8 chorus : 1;  // chorus on or off
    u8 filter : 1;  // filter on or off
    u8 _7 : 1;
    u8 _8 : 1;

    u8 volume;      // volume (7-bit)
};

// amp state is 2 bytes:
COMPILE_ASSERT(sizeof(struct amp) == 2);

// Program v4 (next gen) data structure loaded from / written to flash memory:
struct program {
    // Index into the name table for the name of the program (song):
    u8 name_index;

    // Number of scenes defined:
    u8 scene_count;
    u8 _unused1;    // perhaps AXE-FX program # for different songs?
    u8 _unused2;

    // Scene descriptors (5 bytes each):
    struct scene_descriptor {
        // Index into the name table for the name of the scene:
        u8 name_index;
        // 2 amps:
        struct amp amp[2];
    } scene[12];
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
//  yyyyyyym mmmddddd;
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

// Axe-FX II CC messages:
#define axe_cc_taptempo     14
#define axe_cc_tuner        15

#define axe_cc_external1    16
#define axe_cc_external2    17

#define axe_cc_scene        34

#define axe_cc_byp_amp1     37
#define axe_cc_byp_amp2     38
#define axe_cc_byp_chorus1  41
#define axe_cc_byp_chorus2  42
#define axe_cc_byp_delay1   47
#define axe_cc_byp_delay2   48
#define axe_cc_byp_pitch1   77
#define axe_cc_byp_pitch2   78

#define axe_cc_xy_amp1     100
#define axe_cc_xy_amp2     101
#define axe_cc_xy_chorus1  104
#define axe_cc_xy_chorus2  105
#define axe_cc_xy_delay1   106
#define axe_cc_xy_delay2   107
#define axe_cc_xy_pitch1   114
#define axe_cc_xy_pitch2   115

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

    // Setlist index:
    u8 sl_idx;
    // Current program:
    u8 pr_idx;
    // Current scene:
    u8 sc_idx;
    // Loaded program:
    struct program pr;

    // Selected amp (0 or 1):
    u8 selected_amp;
    // Amp definitions:
    struct amp amp[2];
};

// Current and last state:
struct state curr, last;

// Volume-ramp table (from PIC/v4_lookup.h):
u8 *volume_ramp = 0;

#define name_table_offs ((u16)(128 * sizeof(struct program)) + sizeof(struct set_list))

// Get the name text for the given name_index from flash memory:
static u8 *name_get(u8 name_index) {
    return flash_addr(name_table_offs + (name_index * 20));
}

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

static void copy_str_lcd(u8 *src, u8 *dst) {
    u8 i;
    for (i = 0; src[i] != 0 && i < LCD_COLS; ++i) {
        dst[i] = src[i];
    }
    for (; i < LCD_COLS; i++) {
        dst[i] = ' ';
    }
}

static void send_leds(void) {
	// Update LEDs:
    curr.leds = (u16)curr.mode_leds[curr.mode].bot.byte | ((u16)curr.mode_leds[curr.mode].top.byte << 8);
	if (curr.leds != last.leds) {
		led_set(curr.leds);
		last.leds = curr.leds;
	}
}

// ------------------------- Actual controller logic -------------------------

static void update_lcd(void);

static u8 calc_scene(struct amp amp[]) {
    // Not a typo: X/Y is only controlled from amp[0].
    return (amp[0].dirty | (amp[1].dirty << 1)) | ((amp[0].xy & 1) << 2);
}

static u8 calc_mixer_level(u8 volume) {
    return volume_ramp[volume & 0x7F];
}

static u8 calc_cc_toggle(u8 enable) {
    // TODO: replace me with branchless bit twiddling.
    return enable == 0 ? 0 : 0x7F;
}

// calculate the difference from last MIDI state to current MIDI state and send the difference as MIDI commands:
static void calc_midi(void) {
    u8 diff = 0;

    // Calculate scene numbers:
    u8 curr_scene = calc_scene(curr.amp);
    u8 last_scene = calc_scene(last.amp);

    // Change scene if applicable:
    if (curr_scene != last_scene) {
        midi_set_axe_cc(axe_cc_scene, curr_scene);
        // Treat all last FX as off after a scene change:
        last.amp[0].delay  = 0;
        last.amp[0].pitch  = 0;
        last.amp[0].chorus = 0;
        last.amp[0].filter = 0;
        last.amp[0].volume = 0;
        last.amp[1].delay  = 0;
        last.amp[1].pitch  = 0;
        last.amp[1].chorus = 0;
        last.amp[1].filter = 0;
        last.amp[1].volume = 0;
        diff = 1;
    }
    // Update volumes:
    if (curr.amp[0].volume != last.amp[0].volume) {
        midi_set_axe_cc(axe_cc_external1, calc_mixer_level(curr.amp[0].volume));
        diff = 1;
    }
    if (curr.amp[1].volume != last.amp[1].volume) {
        midi_set_axe_cc(axe_cc_external2, calc_mixer_level(curr.amp[1].volume));
        diff = 1;
    }
    // Enable FX:
    if (curr.amp[0].delay != last.amp[0].delay) {
        midi_set_axe_cc(axe_cc_byp_delay1, calc_cc_toggle(curr.amp[0].delay));
        diff = 1;
    }
    if (curr.amp[1].delay != last.amp[1].delay) {
        midi_set_axe_cc(axe_cc_byp_delay2, calc_cc_toggle(curr.amp[1].delay));
        diff = 1;
    }

    if (curr.amp[0].pitch != last.amp[0].pitch) {
        midi_set_axe_cc(axe_cc_byp_pitch1, calc_cc_toggle(curr.amp[0].pitch));
        diff = 1;
    }
    if (curr.amp[1].pitch != last.amp[1].pitch) {
        midi_set_axe_cc(axe_cc_byp_pitch2, calc_cc_toggle(curr.amp[1].pitch));
        diff = 1;
    }

    if (curr.amp[0].chorus != last.amp[0].chorus) {
        midi_set_axe_cc(axe_cc_byp_chorus1, calc_cc_toggle(curr.amp[0].chorus));
        diff = 1;
    }
    if (curr.amp[1].chorus != last.amp[1].chorus) {
        midi_set_axe_cc(axe_cc_byp_chorus2, calc_cc_toggle(curr.amp[1].chorus));
        diff = 1;
    }

    if (curr.amp[0].filter != last.amp[0].filter) {
        // TODO: need a CC
        //midi_set_axe_cc(axe_cc_byp_chorus1, calc_cc_toggle(curr.amp[0].filter));
        diff = 1;
    }
    if (curr.amp[1].filter != last.amp[1].filter) {
        // TODO: need a CC
        //midi_set_axe_cc(axe_cc_byp_chorus2, calc_cc_toggle(curr.amp[1].filter));
        diff = 1;
    }

    if (curr.pr_idx != last.pr_idx) {
        diff = 1;
    } else if (curr.sc_idx != last.sc_idx) {
        diff = 1;
    }

    // Update LCD if the state changed:
    if (diff) {
        update_lcd();
    }
}

void print_half(s8 volhalfdb, u8 col) {
    s8 i;
    if (volhalfdb < 0) {
        i = ritoa(lcd_rows[0], (u8)(-volhalfdb) >> 1, col);
        lcd_rows[0][i] = '-';
    } else {
        ritoa(lcd_rows[0], (u8)volhalfdb >> 1, col);
    }
    lcd_rows[0][col+1] = '.';
    if (((u8)volhalfdb & 1) != 0) {
        lcd_rows[0][col+2] = '5';
    } else {
        lcd_rows[0][col+2] = '0';
    }
}

// Update LCD display:
static void update_lcd(void) {
#ifdef HWFEAT_LABEL_UPDATES
    u8 **labels;
#endif
#ifdef FEAT_LCD
    s8 i;
    u8 *pr_name;
    u8 *sc_name;
#endif
#ifdef HWFEAT_LABEL_UPDATES
    // Bottom row:
    labels = label_row_get(0);
    labels[0] = "AMP1";
    labels[1] = "AMP2";
    labels[2] = "VOL=0";
    labels[3] = "VOL--";
    labels[4] = "VOL++";
    labels[5] = "TAP/STORE";
    labels[6] = "PREV SCENE";
    labels[7] = "NEXT SCENE";
    label_row_update(0);

    // Top row:
    labels = label_row_get(1);
    labels[0] = "DIRTY";
    labels[1] = "X/Y";
    labels[2] = "DELAY";
    labels[3] = "PITCH";
    labels[4] = "CHORUS";
    labels[5] = "FILTER";
    labels[6] = "PREV SONG";
    labels[7] = "NEXT SONG";
    label_row_update(1);
#endif
#ifdef FEAT_LCD
    for (i = 0; i < LCD_COLS; ++i) {
        lcd_rows[0][i] = "MG  0.0dB  JD  0.0dB"[i];
        lcd_rows[1][i] = "                    "[i];
        lcd_rows[2][i] = "                    "[i];
        lcd_rows[3][i] = "                    "[i];
    }

    // Print volume levels:
    s8 volhalfdb = (s8)curr.amp[0].volume - (s8)(127 - 12);
    print_half(volhalfdb, 4);
    volhalfdb = (s8)curr.amp[1].volume - (s8)(127 - 12);
    print_half(volhalfdb, 15);

    pr_name = name_get(curr.pr.name_index);
    sc_name = name_get(curr.pr.scene[curr.sc_idx].name_index);
    copy_str_lcd(pr_name, lcd_rows[2]);
    copy_str_lcd(sc_name, lcd_rows[3]);

    ritoa(lcd_rows[3], curr.sc_idx+(u8)1, 19);

    lcd_updated_all();
#endif
}

/*
LIVE:
|------------------------------------------------------------|
|     *      *      *      *      *      *      *      *     |
|   DIRTY   X/Y   DELAY  PITCH  CHORUS FILTER PR_PRV PR_NXT  |
|                                             PR_ONE         |
|                                                            |
|     *      *      *      *      *      *      *      *     |
|   AMP1   AMP2   VOL=0  VOL--  VOL++   TAP   SC_PRV SC_NXT  |
|  RESET1 RESET2                       STORE  SC_ONE         |
|------------------------------------------------------------|
*/

static void calc_leds(void) {
    curr.mode_leds[curr.mode].top.bits._1 = curr.amp[curr.selected_amp].dirty;
    curr.mode_leds[curr.mode].top.bits._2 = curr.amp[curr.selected_amp].xy;
    curr.mode_leds[curr.mode].top.bits._3 = curr.amp[curr.selected_amp].delay;
    curr.mode_leds[curr.mode].top.bits._4 = curr.amp[curr.selected_amp].pitch;
    curr.mode_leds[curr.mode].top.bits._5 = curr.amp[curr.selected_amp].chorus;
    curr.mode_leds[curr.mode].top.bits._6 = curr.amp[curr.selected_amp].filter;
    curr.mode_leds[curr.mode].top.bits._7 = curr.fsw.top.bits._7;
    curr.mode_leds[curr.mode].top.bits._8 = curr.fsw.top.bits._8;

    curr.mode_leds[curr.mode].bot.bits._1 = ~curr.selected_amp;
    curr.mode_leds[curr.mode].bot.bits._2 = curr.selected_amp;
    curr.mode_leds[curr.mode].bot.bits._3 = curr.fsw.bot.bits._3;
    curr.mode_leds[curr.mode].bot.bits._4 = curr.fsw.bot.bits._4;
    curr.mode_leds[curr.mode].bot.bits._5 = curr.fsw.bot.bits._5;
    curr.mode_leds[curr.mode].bot.bits._6 = curr.fsw.bot.bits._6;
    curr.mode_leds[curr.mode].bot.bits._7 = curr.fsw.bot.bits._7;
    curr.mode_leds[curr.mode].bot.bits._8 = curr.fsw.bot.bits._8;

    send_leds();
}

// set the controller to an initial state
void controller_init(void) {
    u8 i;

    last.mode = MODE_LIVE;
    curr.mode = MODE_LIVE;
    for (i = 0; i < MODE_count; i++) {
        curr.mode_leds[i].top.byte = 0;
        curr.mode_leds[i].bot.byte = 0;
    }

    last.leds = 0xFFFFU;
    curr.leds = 0x0000U;

    // Load first program:
    curr.sl_idx = 0;
    curr.sc_idx = 0;
    curr.pr_idx = 0;
    flash_load((u16)(curr.pr_idx * sizeof(struct program)), sizeof(struct program), (u8 *)&curr.pr);

    // Copy current scene settings into state:
    curr.amp[0] = curr.pr.scene[curr.sc_idx].amp[0];
    curr.amp[1] = curr.pr.scene[curr.sc_idx].amp[1];

    // Select JD amp by default:
    curr.selected_amp = 1;

    // Get volume-ramp lookup table:
    volume_ramp = lookup_table(0);

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

struct timers {
    u8 bot_4;
    u8 bot_5;
} timers;

// called every 10ms
void controller_10msec_timer(void) {
    if (is_bot_button_held(M_4)) {
        if ((timers.bot_4 & 0xC0) != 0) {
            timers.bot_4 = (timers.bot_4 & 0xC0) | ((timers.bot_4 & 0x3F) + 1) & 0x3F;
        }
        if (((timers.bot_4 & 0x80) != 0) && ((timers.bot_4 & 0x3F) >= 0x20)) {
            timers.bot_4 |= 0x40;
        }
        if (((timers.bot_4 & 0x40) != 0) && ((timers.bot_4 & 0x07) == 0)) {
            if (curr.amp[curr.selected_amp].volume > 0) {
                curr.amp[curr.selected_amp].volume--;
            }
        }
    }

    if (is_bot_button_held(M_5)) {
        if ((timers.bot_5 & 0xC0) != 0) {
            timers.bot_5 = (timers.bot_5 & 0xC0) | ((timers.bot_5 & 0x3F) + 1) & 0x3F;
        }
        if (((timers.bot_5 & 0x80) != 0) && ((timers.bot_5 & 0x3F) >= 0x20)) {
            timers.bot_5 |= 0x40;
        }
        if (((timers.bot_5 & 0x40) != 0) && ((timers.bot_5 & 0x07) == 0)) {
            if (curr.amp[curr.selected_amp].volume < 127) {
                curr.amp[curr.selected_amp].volume++;
            }
        }
    }
}

// main control loop
void controller_handle(void) {
    // poll foot-switch depression status:
    u16 tmp = fsw_poll();
    curr.fsw.bot.byte = (u8)(tmp & 0xFF);
    curr.fsw.top.byte = (u8)((tmp >> 8) & 0xFF);

    // Handle bottom control switches:
    if (is_bot_button_pressed(M_1)) {
        curr.selected_amp = 0;
    }
    if (is_bot_button_pressed(M_2)) {
        curr.selected_amp = 1;
    }
    // VOL=0
    if (is_bot_button_pressed(M_3)) {
        curr.amp[curr.selected_amp].volume = 127 - 12;
    }
    // VOL--
    if (is_bot_button_pressed(M_4)) {
        timers.bot_4 = 0x80;
        if (curr.amp[curr.selected_amp].volume > 0) {
            curr.amp[curr.selected_amp].volume--;
        }
    } else if (is_bot_button_released(M_4)) {
        timers.bot_4 &= ~0xC0;
    }
    // VOL++
    if (is_bot_button_pressed(M_5)) {
        timers.bot_5 = 0x80;
        if (curr.amp[curr.selected_amp].volume < 127) {
            curr.amp[curr.selected_amp].volume++;
        }
    } else if (is_bot_button_released(M_5)) {
        timers.bot_5 &= ~0xC0;
    }
    // PREV/NEXT SCENE:
    if (is_bot_button_pressed(M_7)) {
        if (curr.sc_idx > 0) {
            curr.sc_idx--;
        }
    }
    if (is_bot_button_pressed(M_8)) {
        if (curr.sc_idx < curr.pr.scene_count - 1) {
            curr.sc_idx++;
        }
    }

    // Handle top amp effects:
    if (is_top_button_pressed(M_1)) {
        curr.amp[curr.selected_amp].dirty ^= 1;
    }
    if (is_top_button_pressed(M_2)) {
        curr.amp[curr.selected_amp].xy ^= 1;
    }
    if (is_top_button_pressed(M_3)) {
        curr.amp[curr.selected_amp].delay ^= 1;
    }
    if (is_top_button_pressed(M_4)) {
        curr.amp[curr.selected_amp].pitch ^= 1;
    }
    if (is_top_button_pressed(M_5)) {
        curr.amp[curr.selected_amp].chorus ^= 1;
    }
    if (is_top_button_pressed(M_6)) {
        curr.amp[curr.selected_amp].filter ^= 1;
    }

    // PREV/NEXT SONG:
    if (is_top_button_pressed(M_7)) {
        if (curr.pr_idx > 0) {
            curr.pr_idx--;
        }
    }
    if (is_top_button_pressed(M_8)) {
        if (curr.pr_idx < 44) {
            curr.pr_idx++;
        }
    }

    // Update state:
    if (curr.pr_idx != last.pr_idx) {
        // Load program:
        flash_load((u16)(curr.pr_idx * sizeof(struct program)), sizeof(struct program), (u8 *)&curr.pr);
        curr.sc_idx = 0;

        // Copy current scene settings into state:
        curr.amp[0] = curr.pr.scene[curr.sc_idx].amp[0];
        curr.amp[1] = curr.pr.scene[curr.sc_idx].amp[1];
    } else if (curr.sc_idx != last.sc_idx) {
        // Copy current scene settings into state:
        curr.amp[0] = curr.pr.scene[curr.sc_idx].amp[0];
        curr.amp[1] = curr.pr.scene[curr.sc_idx].amp[1];
    }

    calc_midi();
    calc_leds();

    // Record the previous state:
    last = curr;
}

#else

static void nothing(void) {}

#endif
