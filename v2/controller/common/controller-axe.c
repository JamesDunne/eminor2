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
|   DIRTY   X/Y   PITCH  CHORUS DELAY  FILTER PR_PRV PR_NXT  |
|                                             PR_ONE         |
|                                                            |
|     *      *      *      *      *      *      *      *     |
|   BOTH   MG/JD  VOL=0  VOL--  VOL++   TAP   SC_PRV SC_NXT  |
|          RESET  VOL=6                 MODE  SC_DEL SC_INS  |
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
Hold  MODE   to switch between setlist and program mode

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

#define fxm_dirty  (u8)0x01
#define fxm_xy     (u8)0x02
#define fxm_pitch  (u8)0x04
#define fxm_chorus (u8)0x08
#define fxm_delay  (u8)0x10
#define fxm_filter (u8)0x20

#define fxb_dirty  (u8)0
#define fxb_xy     (u8)1
#define fxb_pitch  (u8)2
#define fxb_chorus (u8)3
#define fxb_delay  (u8)4
#define fxb_filter (u8)5

#define read_bit(name,e)   ((e & fxm_##name) >> fxb_##name)
#define toggle_bit(name,e) e = e ^ fxm_##name

struct amp {
    u8 fx;
    u8 volume;  // volume (7-bit) represented as half-dB where 0dB = 127-12, +6dB = 127.
};

#define volume_0dB (127 - 12)
#define volume_6dB (127)

// amp state is 2 bytes:
COMPILE_ASSERT(sizeof(struct amp) == 2);

#define scene_count_max 10

// Program v4 (next gen) data structure loaded from / written to flash memory:
struct program {
    // Index into the name table for the name of the program (song):
    u16 name_index;

    // Number of scenes defined:
    u8 scene_count;
    u8 _unused1;    // perhaps AXE-FX program # for different songs?

    // Scene descriptors (5 bytes each):
    struct scene_descriptor {
        // Index into the name table for the name of the scene:
        u16 name_index;
        // 2 amps:
        struct amp amp[2];
    } scene[scene_count_max];
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

// Hard-coded MIDI channel #s:
#define gmaj_midi_channel	 0
#define rjm_midi_channel	 1
#define axe_midi_channel	 2
#define triaxis_midi_channel 3

// Axe-FX II CC messages:
#define axe_cc_taptempo     14
#define axe_cc_tuner        15

// Output mixer gain:
#define axe_cc_external1    16
#define axe_cc_external2    17
// Amp gain:
#define axe_cc_external3    18
#define axe_cc_external4    19

#define axe_cc_scene        34

#define axe_cc_byp_amp1         37
#define axe_cc_byp_amp2         38
#define axe_cc_byp_chorus1      41
#define axe_cc_byp_chorus2      42
#define axe_cc_byp_compressor1  43
#define axe_cc_byp_compressor2  44
#define axe_cc_byp_delay1       47
#define axe_cc_byp_delay2       48
#define axe_cc_byp_gate1        60
#define axe_cc_byp_gate2        61
#define axe_cc_byp_phaser1      75
#define axe_cc_byp_phaser2      76
#define axe_cc_byp_pitch1       77
#define axe_cc_byp_pitch2       78

#define axe_cc_xy_amp1     100
#define axe_cc_xy_amp2     101
#define axe_cc_xy_chorus1  104
#define axe_cc_xy_chorus2  105
#define axe_cc_xy_delay1   106
#define axe_cc_xy_delay2   107
#define axe_cc_xy_pitch1   114
#define axe_cc_xy_pitch2   115

#ifdef FEAT_LCD
// Pointers to LCD character rows:
char *lcd_rows[LCD_ROWS];
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

    // Tap tempo CC value (toggles between 0x00 and 0x7F):
    u8 tap;

    // 0 for program mode, 1 for setlist mode:
    u8 setlist_mode;
    // Current setlist entry:
    u8 sl_idx;
    // Current program:
    u8 pr_idx;
    // Current scene:
    u8 sc_idx;

    // Selected amp (0 or 1):
    u8 selected_amp;
    // Selected both amps (0 or 1):
    u8 selected_both;
    // Amp definitions:
    struct amp amp[2];
};

// Current and last state:
struct state curr, last;

// Volume-ramp table (from PIC/v4_lookup.h):
rom const u8 *volume_ramp = 0;

// Max program #:
u8 sl_max;
// Loaded setlist:
struct set_list sl;
// Loaded program:
struct program pr;

#define name_table_offs ((u16)(128 * sizeof(struct program)) + sizeof(struct set_list))

// Get the name text for the given name_index from flash memory:
static rom const char *name_get(u16 name_index) {
    if (name_index == (u16)0) {
        return "";
    }
    return (rom const char *)flash_addr(name_table_offs + ((name_index - 1) * 20));
}

// Set Axe-FX CC value
#define midi_set_axe_cc(cc, val) midi_send_cmd2(0xB, axe_midi_channel, cc, val)

// Top switch press cannot be an accident:
#define is_top_button_pressed(mask) \
    ((last.fsw.bot.byte == 0) && (curr.fsw.bot.byte == 0) && (last.fsw.top.byte == 0) && (curr.fsw.top.byte == mask))

// Always switch programs regardless of whether a top switch was accidentally depressed:
#define is_bot_button_pressed(mask) \
    ((last.fsw.bot.byte == 0) && (curr.fsw.bot.byte == mask))

#define is_top_button_released(mask) \
    (((last.fsw.top.byte & mask) == mask) && ((curr.fsw.top.byte & mask) == 0))

#define is_bot_button_released(mask) \
    (((last.fsw.bot.byte & mask) == mask) && ((curr.fsw.bot.byte & mask) == 0))

#define is_top_button_held(mask) \
    ((curr.fsw.bot.byte == 0) && (curr.fsw.top.byte == mask))

#define is_bot_button_held(mask) \
    ((curr.fsw.top.byte == 0) && (curr.fsw.bot.byte == mask))

static s8 ritoa(char *dst, s8 col, u8 n) {
	do {
		dst[col--] = (n % (char)10) + (char)'0';
	} while ((n /= (u8)10) > (u8)0);
	return col;
}

static s8 litoa(char *dst, s8 col, u8 n) {
	// Write the integer to temporary storage:
	char tmp[3];
	s8 c = 0;
	do {
		tmp[c++] = (n % (char)10) + (char)'0';
	} while ((n /= (u8)10) > (u8)0);
	// Write the left-aligned integer to the destination:
	for (c--; c >= 0; c--, col++) {
		dst[col] = tmp[c];
	}
	return col;
}

static void copy_str_lcd(rom const char *src, char *dst) {
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

static void curr_amp_vol_decrease(void);

static void curr_amp_vol_increase(void);

static void prev_scene(void);

static void next_scene(void);

static void scene_delete(void);

static void scene_insert(void);

static void prev_song(void);

static void next_song(void);

static void curr_amp_reset(void);

static void toggle_setlist_mode(void);

static void curr_amp_vol_toggle(void);

static void scene_default(void);

#define calc_mixer_level(volume) \
    volume_ramp[volume & 0x7F]

// TODO: replace me with branchless bit twiddling.
#define calc_cc_toggle(enable) \
    (enable == 0 ? (u8)0 : (u8)0x7F)

// calculate the difference from last MIDI state to current MIDI state and send the difference as MIDI commands:
static void calc_midi(void) {
    u8 diff = 0;
    u8 dirty;
    u8 xy;

    // Send gain controller changes:
    dirty = read_bit(dirty, curr.amp[0].fx);
    if (dirty != read_bit(dirty, last.amp[0].fx)) {
        DEBUG_LOG1("MIDI set AMP1 %s", dirty == 0 ? "clean" : "dirty");
        midi_set_axe_cc(axe_cc_external3, calc_cc_toggle(dirty));
        midi_set_axe_cc(axe_cc_byp_gate1, calc_cc_toggle(dirty));
        midi_set_axe_cc(axe_cc_byp_compressor1, calc_cc_toggle(!dirty));
    }
    dirty = read_bit(dirty, curr.amp[1].fx);
    if (dirty != read_bit(dirty, last.amp[1].fx)) {
        DEBUG_LOG1("MIDI set AMP2 %s", dirty == 0 ? "clean" : "dirty");
        midi_set_axe_cc(axe_cc_external4, calc_cc_toggle(dirty));
        midi_set_axe_cc(axe_cc_byp_gate2, calc_cc_toggle(dirty));
        midi_set_axe_cc(axe_cc_byp_compressor2, calc_cc_toggle(!dirty));
    }

    // Send X/Y changes:
    // X = 127, Y = 0
    xy = read_bit(xy, curr.amp[0].fx);
    if (xy != read_bit(xy, last.amp[0].fx)) {
        DEBUG_LOG1("MIDI set AMP1 %s", xy == 0 ? "X" : "Y");
        midi_set_axe_cc(axe_cc_xy_amp1, calc_cc_toggle(!xy));
    }
    xy = read_bit(xy, curr.amp[1].fx);
    if (xy != read_bit(xy, last.amp[1].fx)) {
        DEBUG_LOG1("MIDI set AMP2 %s", xy == 0 ? "X" : "Y");
        midi_set_axe_cc(axe_cc_xy_amp2, calc_cc_toggle(!xy));
    }

    // Update volumes:
    if (curr.amp[0].volume != last.amp[0].volume) {
        s8 vol = (curr.amp[0].volume - (s8)volume_0dB);
        DEBUG_LOG3("MIDI set AMP1 volume = %c%d.%s", (vol < 0 ? '-' : ' '), (vol < 0 ? -vol : vol) / 2, ((u8)vol & (u8)1) == 0 ? "0" : "5");
        midi_set_axe_cc(axe_cc_external1, calc_mixer_level(curr.amp[0].volume));
        diff = 1;
    }
    if (curr.amp[1].volume != last.amp[1].volume) {
        s8 vol = (curr.amp[1].volume - (s8)volume_0dB);
        DEBUG_LOG3("MIDI set AMP2 volume = %c%d.%s", (vol < 0 ? '-' : ' '), (vol < 0 ? -vol : vol) / 2, ((u8)vol & (u8)1) == 0 ? "0" : "5");
        midi_set_axe_cc(axe_cc_external2, calc_mixer_level(curr.amp[1].volume));
        diff = 1;
    }

    // Enable FX:
    if (read_bit(delay, curr.amp[0].fx) != read_bit(delay, last.amp[0].fx)) {
        midi_set_axe_cc(axe_cc_byp_delay1, calc_cc_toggle(read_bit(delay, curr.amp[0].fx)));
    }
    if (read_bit(delay, curr.amp[1].fx) != read_bit(delay, last.amp[1].fx)) {
        midi_set_axe_cc(axe_cc_byp_delay2, calc_cc_toggle(read_bit(delay, curr.amp[1].fx)));
    }

    if (read_bit(pitch, curr.amp[0].fx) != read_bit(pitch, last.amp[0].fx)) {
        midi_set_axe_cc(axe_cc_byp_pitch1, calc_cc_toggle(read_bit(pitch, curr.amp[0].fx)));
    }
    if (read_bit(pitch, curr.amp[1].fx) != read_bit(pitch, last.amp[1].fx)) {
        midi_set_axe_cc(axe_cc_byp_pitch2, calc_cc_toggle(read_bit(pitch, curr.amp[1].fx)));
    }

    if (read_bit(chorus, curr.amp[0].fx) != read_bit(chorus, last.amp[0].fx)) {
        midi_set_axe_cc(axe_cc_byp_chorus1, calc_cc_toggle(read_bit(chorus, curr.amp[0].fx)));
    }
    if (read_bit(chorus, curr.amp[1].fx) != read_bit(chorus, last.amp[1].fx)) {
        midi_set_axe_cc(axe_cc_byp_chorus2, calc_cc_toggle(read_bit(chorus, curr.amp[1].fx)));
    }

    if (read_bit(filter, curr.amp[0].fx) != read_bit(filter, last.amp[0].fx)) {
        midi_set_axe_cc(axe_cc_byp_phaser1, calc_cc_toggle(read_bit(filter, curr.amp[0].fx)));
    }
    if (read_bit(filter, curr.amp[1].fx) != read_bit(filter, last.amp[1].fx)) {
        midi_set_axe_cc(axe_cc_byp_phaser2, calc_cc_toggle(read_bit(filter, curr.amp[1].fx)));
    }

    if (curr.amp[0].fx != last.amp[0].fx) {
        diff = 1;
    }
    if (curr.amp[1].fx != last.amp[1].fx) {
        diff = 1;
    }

    if (curr.pr_idx != last.pr_idx) {
        diff = 1;
    } else if (curr.sc_idx != last.sc_idx) {
        diff = 1;
    }

    if (curr.selected_amp != last.selected_amp) {
        diff = 1;
    }
    if (curr.selected_both != last.selected_both) {
        diff = 1;
    }

    // Update LCD if the state changed:
    if (diff) {
        update_lcd();
    }
}

static void print_half(char *dst, u8 col, s8 volhalfdb) {
    s8 i;
    if (volhalfdb < 0) {
        i = ritoa(dst, col, (u8) (-volhalfdb) >> 1);
        dst[i] = '-';
    } else {
        ritoa(dst, col, (u8) volhalfdb >> 1);
    }
    dst[col + 1] = '.';
    if (((u8)volhalfdb & 1) != 0) {
        dst[col + 2] = '5';
    } else {
        dst[col + 2] = '0';
    }
}

// Update LCD display:
static void update_lcd(void) {
#ifdef HWFEAT_LABEL_UPDATES
    char **labels;
#endif
#ifdef FEAT_LCD
    s8 i;
    rom const char *pr_name;
    rom const char *sc_name;
    s8 volhalfdb;
#endif
    DEBUG_LOG0("update LCD");
#ifdef HWFEAT_LABEL_UPDATES
    // Bottom row:
    labels = label_row_get(0);
    labels[0] = "BOTH";
    labels[1] = "MG/JD";
    labels[2] = "VOL=0";
    labels[3] = "VOL--";
    labels[4] = "VOL++";
    labels[5] = "TAP";
    labels[6] = "PREV SCENE";
    labels[7] = "NEXT SCENE";
    label_row_update(0);

    // Top row:
    labels = label_row_get(1);
    labels[0] = "DIRTY";
    labels[1] = "X/Y";
    labels[2] = "PITCH";
    labels[3] = "CHORUS";
    labels[4] = "DELAY";
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

    lcd_rows[0][2] = (curr.selected_amp == 0) ? (char)'*' : (char)' ';
    lcd_rows[0][13] = (curr.selected_amp == 1) ? (char)'*' : (char)' ';

    // Print volume levels:
    volhalfdb = (s8)curr.amp[0].volume - (s8)volume_0dB;
    print_half(lcd_rows[0], 4, volhalfdb);
    volhalfdb = (s8)curr.amp[1].volume - (s8)volume_0dB;
    print_half(lcd_rows[0], 15, volhalfdb);

    // Print setlist date:

    if (curr.setlist_mode == 0) {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[1][i] = "Program         #   "[i];
        }
        ritoa(lcd_rows[1], 19, curr.pr_idx + 1);
    } else {
        // Show setlist data:
        u8 yyyy = sl.d1 >> 1;
        u8 mm = ((sl.d1 & (u8)1) << 3) | (sl.d0 >> 5);
        u8 dd = (sl.d0 & (u8)31);
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[1][i] = "2014-01-01       # 0"[i];
        }
        ritoa(lcd_rows[1], 3, yyyy + (u8)14);
        ritoa(lcd_rows[1], 6, mm + (u8)1);
        ritoa(lcd_rows[1], 9, dd + (u8)1);

        ritoa(lcd_rows[1], 19, curr.sl_idx + (u8)1);
    }


    pr_name = name_get(pr.name_index);
    sc_name = name_get(pr.scene[curr.sc_idx].name_index);
    copy_str_lcd(pr_name, lcd_rows[2]);
    copy_str_lcd(sc_name, lcd_rows[3]);

    ritoa(lcd_rows[3], 19, curr.sc_idx + (u8) 1);

    lcd_updated_all();
#endif
}

/*
LIVE:
|------------------------------------------------------------|
|     *      *      *      *      *      *      *      *     |
|   DIRTY   X/Y   PITCH  CHORUS DELAY  FILTER PR_PRV PR_NXT  |
|                                                            |
|                                                            |
|     *      *      *      *      *      *      *      *     |
|   BOTH   MG/JD  VOL=0  VOL--  VOL++   TAP   SC_PRV SC_NXT  |
|          RESET  VOL=6                 MODE  SC_DEL SC_INS  |
|------------------------------------------------------------|
*/

static void calc_leds(void) {
    if (curr.selected_both) {
        curr.mode_leds[curr.mode].top.bits._1 = read_bit(dirty,  curr.amp[0].fx) | read_bit(dirty,  curr.amp[1].fx);
        curr.mode_leds[curr.mode].top.bits._2 = read_bit(xy,     curr.amp[0].fx) | read_bit(xy,     curr.amp[1].fx);
        curr.mode_leds[curr.mode].top.bits._3 = read_bit(pitch,  curr.amp[0].fx) | read_bit(pitch,  curr.amp[1].fx);
        curr.mode_leds[curr.mode].top.bits._4 = read_bit(chorus, curr.amp[0].fx) | read_bit(chorus, curr.amp[1].fx);
        curr.mode_leds[curr.mode].top.bits._5 = read_bit(delay,  curr.amp[0].fx) | read_bit(delay,  curr.amp[1].fx);
        curr.mode_leds[curr.mode].top.bits._6 = read_bit(filter, curr.amp[0].fx) | read_bit(filter, curr.amp[1].fx);
    } else {
        curr.mode_leds[curr.mode].top.bits._1 = read_bit(dirty,  curr.amp[curr.selected_amp].fx);
        curr.mode_leds[curr.mode].top.bits._2 = read_bit(xy,     curr.amp[curr.selected_amp].fx);
        curr.mode_leds[curr.mode].top.bits._3 = read_bit(pitch,  curr.amp[curr.selected_amp].fx);
        curr.mode_leds[curr.mode].top.bits._4 = read_bit(chorus, curr.amp[curr.selected_amp].fx);
        curr.mode_leds[curr.mode].top.bits._5 = read_bit(delay,  curr.amp[curr.selected_amp].fx);
        curr.mode_leds[curr.mode].top.bits._6 = read_bit(filter, curr.amp[curr.selected_amp].fx);
    }
    curr.mode_leds[curr.mode].top.bits._7 = curr.fsw.top.bits._7;
    curr.mode_leds[curr.mode].top.bits._8 = curr.fsw.top.bits._8;

    curr.mode_leds[curr.mode].bot.bits._1 = curr.selected_both;
    curr.mode_leds[curr.mode].bot.bits._2 = curr.selected_amp;
    curr.mode_leds[curr.mode].bot.bits._3 = curr.fsw.bot.bits._3 | (curr.amp[curr.selected_amp].volume != volume_0dB);
    curr.mode_leds[curr.mode].bot.bits._4 = curr.fsw.bot.bits._4 | (curr.amp[curr.selected_amp].volume > volume_0dB);
    curr.mode_leds[curr.mode].bot.bits._5 = curr.fsw.bot.bits._5 | (curr.amp[curr.selected_amp].volume < volume_0dB);
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

    last.setlist_mode = 0;
    curr.setlist_mode = 1;

    // Load setlist:
    flash_load((u16)(128 * sizeof(struct program)), sizeof(struct set_list), (u8 *)&sl);
    sl_max = sl.count - (u8)1;

    // Load first program in setlist:
    curr.sl_idx = 0;
    curr.pr_idx = 0;
    curr.sc_idx = 0;
    flash_load((u16)(sl.entries[curr.sl_idx].program * sizeof(struct program)), sizeof(struct program), (u8 *)&pr);

    // Copy current scene settings into state:
    curr.amp[0] = pr.scene[curr.sc_idx].amp[0];
    curr.amp[1] = pr.scene[curr.sc_idx].amp[1];

    // Invert last settings to force initial switch:
    last.amp[0].fx = ~curr.amp[0].fx;
    last.amp[1].fx = ~curr.amp[1].fx;
    last.amp[0].volume = ~curr.amp[0].volume;
    last.amp[1].volume = ~curr.amp[1].volume;

    // Select only JD amp by default:
    curr.selected_amp = 1;
    curr.selected_both = 0;

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
    // Repeating timers:
    u8 bot_4;
    u8 bot_5;
    u8 bot_7;
    u8 bot_8;
    u8 top_7;
    u8 top_8;
    // Once-only timers:
    u8 bot_1;
    u8 bot_2;
    u8 bot_6;
} timers;

u8 val;

// called every 10ms
void controller_10msec_timer(void) {
#define one_shot(row,n,max,op_func) \
    if (is_##row##_button_held(M_##n) && ((timers.row##_##n & (u8)0x80) != 0)) { \
        /* Increment and cap timer to 0x7F: */ \
        if ((timers.row##_##n & (u8)0x7F) < (u8)max) { \
            timers.row##_##n = (timers.row##_##n & (u8)0x80) | ((timers.row##_##n & (u8)0x7F) + (u8)1); \
            if ((timers.row##_##n & (u8)0x7F) == (u8)max) { \
                timers.row##_##n = (u8)0x00; \
                op_func(); \
            } \
        } \
    }

#define repeater(row,n,min,mask,op_func) \
    if (is_##row##_button_held(M_##n)) { \
        if ((timers.row##_##n & (u8)0xC0) != (u8)0) { \
            timers.row##_##n = (timers.row##_##n & (u8)0xC0) | (((timers.row##_##n & (u8)0x3F) + (u8)1) & (u8)0x3F); \
        } \
        if (((timers.row##_##n & (u8)0x80) != (u8)0) && ((timers.row##_##n & (u8)0x3F) >= (u8)min)) { \
            timers.row##_##n |= (u8)0x40; \
        } \
        if (((timers.row##_##n & (u8)0x40) != (u8)0) && ((timers.row##_##n & (u8)mask) == (u8)0)) { \
            op_func(); \
        } \
    }

    one_shot(bot,2,0x7F,curr_amp_reset)

    repeater(bot,4,0x20,0x07,curr_amp_vol_decrease)
    repeater(bot,5,0x20,0x07,curr_amp_vol_increase)

    one_shot(bot,6,0x7F,toggle_setlist_mode)

    one_shot(bot,7,0x7F,scene_delete)
    one_shot(bot,8,0x7F,scene_insert)

    repeater(top,7,0x20,0x07,prev_song)
    repeater(top,8,0x20,0x07,next_song)

#undef repeater
#undef one_shot

#if 0
    // TESTING; change gain of both amps with a triangle oscillator:
    midi_set_axe_cc(axe_cc_external3, (val & (u8)0x7F));
    midi_set_axe_cc(axe_cc_external4, (val & (u8)0x7F));
    if ((val & (u8)0x80) == (u8)0x80) {
        val--;
        if ((val & (u8)0x7F) == (u8)0) {
            val &= ~(u8)0x80;
        }
    } else {
        val++;
        if ((val & (u8)0x7F) == (u8)127) {
            val |= (u8)0x80;
        }
    }
#endif
}

// main control loop
void controller_handle(void) {
    // poll foot-switch depression status:
    u16 tmp = fsw_poll();
    curr.fsw.bot.byte = (u8)(tmp & (u8)0xFF);
    curr.fsw.top.byte = (u8)((tmp >> (u8)8) & (u8)0xFF);

    // Handle bottom control switches:
    // AMP (1 and 2)
    if (is_bot_button_pressed(M_1)) {
        curr.selected_both ^= 1;
        timers.bot_1 = (u8)0x80;
    } else if (is_bot_button_released(M_1)) {
        timers.bot_1 = (u8)0;
    }

    // AMP (1 or 2)
    if (is_bot_button_pressed(M_2)) {
        timers.bot_2 = (u8)0x80;
    } else if (is_bot_button_released(M_2)) {
        if ((timers.bot_2 & (u8)0x80) != (u8)0) {
            curr.selected_amp ^= 1;
            //curr.selected_both = 0;
        }
        timers.bot_2 = (u8)0;
    }

    // VOL=0 or +6
    if (is_bot_button_pressed(M_3)) {
        curr_amp_vol_toggle();
    }

    // VOL--
    if (is_bot_button_pressed(M_4)) {
        timers.bot_4 = (u8)0x80;
        curr_amp_vol_decrease();
    } else if (is_bot_button_released(M_4)) {
        timers.bot_4 &= ~(u8)0xC0;
    }

    // VOL++
    if (is_bot_button_pressed(M_5)) {
        timers.bot_5 = (u8)0x80;
        curr_amp_vol_increase();
    } else if (is_bot_button_released(M_5)) {
        timers.bot_5 &= ~(u8)0xC0;
    }

    // TAP:
    if (is_bot_button_pressed(M_6)) {
        // Toggle TAP CC value between 0x00 and 0x7F:
        timers.bot_6 = (u8)0x80;
        curr.tap ^= (u8)0x7F;
        midi_set_axe_cc(axe_cc_taptempo, curr.tap);
    } else if (is_bot_button_pressed(M_6)) {
        timers.bot_6 = (u8)0x00;
    }

    // PREV/NEXT SCENE:
    if (is_bot_button_pressed(M_7)) {
        timers.bot_7 = (u8)0x80;
    } else if (is_bot_button_released(M_7)) {
        if ((timers.bot_7 & (u8)0x80) != (u8)0) {
            prev_scene();
        }
        timers.bot_7 = (u8)0x00;
    }
    if (is_bot_button_pressed(M_8)) {
        timers.bot_8 = (u8)0x80;
    } else if (is_bot_button_released(M_8)) {
        if ((timers.bot_8 & (u8)0x80) != (u8)0) {
            next_scene();
        }
        timers.bot_8 = (u8)0x00;
    }

    // Handle top amp effects:
#define toggle_fx(name) \
        if (curr.selected_both) { \
            u8 fx = (curr.amp[0].fx | curr.amp[1].fx) & fxm_##name ^ fxm_##name; \
            curr.amp[0].fx = (curr.amp[0].fx & ~fxm_##name) | fx; \
            curr.amp[1].fx = (curr.amp[1].fx & ~fxm_##name) | fx; \
        } else { \
            toggle_bit(name, curr.amp[curr.selected_amp].fx); \
        }

    if (is_top_button_pressed(M_1)) {
        toggle_fx(dirty)
    }
    if (is_top_button_pressed(M_2)) {
        toggle_fx(xy)
    }
    if (is_top_button_pressed(M_3)) {
        toggle_fx(pitch)
    }
    if (is_top_button_pressed(M_4)) {
        toggle_fx(chorus)
    }
    if (is_top_button_pressed(M_5)) {
        toggle_fx(delay)
    }
    if (is_top_button_pressed(M_6)) {
        toggle_fx(filter)
    }

    // PREV/NEXT SONG:
    if (is_top_button_pressed(M_7)) {
        prev_song();
        timers.top_7 = (u8)0x80;
    } else if (is_top_button_released(M_7)) {
        timers.top_7 = (u8)0x00;
    }
    if (is_top_button_pressed(M_8)) {
        next_song();
        timers.top_8 = (u8)0x80;
    } else if (is_top_button_released(M_8)) {
        timers.top_8 = (u8)0x00;
    }

    // Update state:
    if ((curr.setlist_mode != last.setlist_mode) || (curr.sl_idx != last.sl_idx) || (curr.pr_idx != last.pr_idx)) {
        // Load program:
        u8 pr_num;

        DEBUG_LOG0("load program");

        if (curr.setlist_mode == 1) {
            pr_num = sl.entries[curr.sl_idx].program;
        } else {
            pr_num = curr.pr_idx;
        }
        flash_load((u16) (pr_num * sizeof(struct program)), sizeof(struct program), (u8 *) &pr);

        // Establish a sane default for an undefined program:
        curr.sc_idx = 0;
        if (pr.name_index == (u16)0) {
            pr.scene_count = 1;
            scene_default();
        }

        // Trigger a scene reload:
        last.sc_idx = ~curr.sc_idx;
    }

    if (curr.sc_idx != last.sc_idx) {
        DEBUG_LOG0("load scene");

        // Store last state into program for recall:
        pr.scene[last.sc_idx].amp[0] = curr.amp[0];
        pr.scene[last.sc_idx].amp[1] = curr.amp[1];

        // Check if non-first scene is undefined:
        if ((curr.sc_idx > 0) && (pr.scene[curr.sc_idx].name_index == (u16)0)) {
            // Copy last scene:
            pr.scene[curr.sc_idx] = pr.scene[curr.sc_idx - (u8)1];
            pr.scene[curr.sc_idx].name_index = (u16)0;
            //scene_default();
        }

        // Copy new scene settings into current state:
        curr.amp[0] = pr.scene[curr.sc_idx].amp[0];
        curr.amp[1] = pr.scene[curr.sc_idx].amp[1];
    }

    calc_midi();
    calc_leds();

    // Record the previous state:
    last = curr;
}

void scene_default(void) {
    DEBUG_LOG0("default scene");
    pr.scene[curr.sc_idx].name_index = 0;
    pr.scene[curr.sc_idx].amp[0].fx = fxm_dirty;
    pr.scene[curr.sc_idx].amp[0].volume = volume_0dB;
    pr.scene[curr.sc_idx].amp[1].fx = fxm_dirty;
    pr.scene[curr.sc_idx].amp[1].volume = volume_0dB;
}

static void toggle_setlist_mode() {
    DEBUG_LOG0("change setlist mode");
    curr.setlist_mode ^= (u8)1;
    if (curr.setlist_mode == 1) {
        // Remap sl_idx by looking up program in setlist otherwise default to first setlist entry:
        u8 i;
        sl_max = sl.count - (u8)1;
        curr.sl_idx = 0;
        for (i = 0; i < sl.count; i++) {
            if (sl.entries[i].program == curr.pr_idx) {
                curr.sl_idx = i;
                break;
            }
        }
    } else {
        // Lookup program number from setlist:
        sl_max = 127;
        curr.pr_idx = sl.entries[curr.sl_idx].program;
    }
}

static void curr_amp_reset() {
    if (curr.selected_both) {
        DEBUG_LOG0("reset amps");
        last.amp[0].fx = ~curr.amp[0].fx;
        last.amp[0].volume = ~curr.amp[0].volume;
        last.amp[1].fx = ~curr.amp[1].fx;
        last.amp[1].volume = ~curr.amp[1].volume;
    } else {
        DEBUG_LOG1("reset amp%c", curr.selected_amp + '1');
        last.amp[curr.selected_amp].fx = ~curr.amp[curr.selected_amp].fx;
        last.amp[curr.selected_amp].volume = ~curr.amp[curr.selected_amp].volume;
    }
}

static void next_song() {
    if (curr.setlist_mode == 0) {
        if (curr.pr_idx < 127) {
            DEBUG_LOG0("next program");
            curr.pr_idx++;
        }
    } else {
        if (curr.sl_idx < sl_max) {
            DEBUG_LOG0("next song");
            curr.sl_idx++;
        }
    }
}

static void prev_song() {
    if (curr.setlist_mode == 0) {
        if (curr.pr_idx > 0) {
            DEBUG_LOG0("prev program");
            curr.pr_idx--;
        }
    } else {
        if (curr.sl_idx > 0) {
            DEBUG_LOG0("prev song");
            curr.sl_idx--;
        }
    }
}

static void next_scene() {
    // Purposely allowing moving past last-defined scene so scene_insert will work as append.
    if (curr.sc_idx < pr.scene_count) {
        DEBUG_LOG0("next scene");
        curr.sc_idx++;
    }
}

static void prev_scene() {
    if (curr.sc_idx > 0) {
        DEBUG_LOG0("prev scene");
        curr.sc_idx--;
    }
}

static void scene_delete(void) {
    u8 i;

    if ((pr.scene_count <= 1) || (curr.sc_idx >= pr.scene_count)) {
        return;
    }

    // Copy all scenes behind 1:
    for (i = curr.sc_idx; i < pr.scene_count; i++) {
        pr.scene[i] = pr.scene[i+1];
    }

    pr.scene_count--;
    if (curr.sc_idx >= pr.scene_count) {
        curr.sc_idx = pr.scene_count - (u8)1;
    }

    // Force a reload of current scene:
    last.sc_idx = ~curr.sc_idx;
}

static void scene_insert(void) {
    u8 i;
    if (pr.scene_count >= scene_count_max) {
        return;
    }

    // Copy all scenes ahead 1:
    for (i = pr.scene_count; i > curr.sc_idx; i--) {
        pr.scene[i] = pr.scene[i-1];
    }

    pr.scene_count++;

    // Reset current scene to default:
    scene_default();

    // Force a reload of current scene:
    last.sc_idx = ~curr.sc_idx;
}

static void curr_amp_vol_toggle() {
    // Toggle between 0dB and +6dB:
    if (curr.amp[curr.selected_amp].volume == volume_0dB) {
        curr.amp[curr.selected_amp].volume = volume_6dB;
    } else {
        curr.amp[curr.selected_amp].volume = volume_0dB;
    }
}

static void curr_amp_vol_increase() {
    if (curr.amp[curr.selected_amp].volume < (u8)127) {
        curr.amp[curr.selected_amp].volume++;
    }
}

static void curr_amp_vol_decrease() {
    if (curr.amp[curr.selected_amp].volume > (u8)0) {
        curr.amp[curr.selected_amp].volume--;
    }
}

#else

typedef int nothing4;

#endif
