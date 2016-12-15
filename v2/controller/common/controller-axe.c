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
|   BOTH   MG/JD GAIN/VOL DEC    INC    TAP   SC_PRV SC_NXT  |
|          RESET                        MODE          SAVE   |
|------------------------------------------------------------|

Top row of buttons controls selected amp settings

Press BOTH   to select AMP1+2 for modification on top row
Press MG/JD  to select AMP1 or AMP2 for modification on top row

Press DIRTY  to change from clean to dirty (LED off is clean, on is dirty); gapless audio using scene controllers to modify amp gain
Press X/Y    to switch AMP1&2 between X and Y settings; causes audio gap
Press DELAY  to toggle delay effect
Press PITCH  to toggle pitch effect
Press CHORUS to toggle chorus effect
Press DEC    to decrease amp volume, hold DIRTY to affect amp gain
Press INC    to increase amp volume, hold DIRTY to affect amp gain

Press TAP    to send tap tempo
Hold  MODE   to switch between setlist and program mode

Press SC_PRV to move to previous scene
Press SC_NXT to move to next scene

Press PR_PRV to move to previous setlist song / program #
Press PR_NXT to move to next setlist song / program #

Use scene controllers to transition from clean to dirty on both AMP1 and AMP2, controlled separately

Press MODE   to switch between set-list order and program # order
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
#define fxm_rotary (u8)0x40

#define fxb_dirty  (u8)0
#define fxb_xy     (u8)1
#define fxb_pitch  (u8)2
#define fxb_chorus (u8)3
#define fxb_delay  (u8)4
#define fxb_filter (u8)5
#define fxb_rotary (u8)6

#define read_bit(name,e)   ((e & fxm_##name) >> fxb_##name)
#define toggle_bit(name,e) e = e ^ fxm_##name

#define default_gain ((u8)0x40)
#define or_default(gain) (gain == 0 ? default_gain : gain)

// For the Axe-FX Vol block, Log 20A means that the resistance is 20% at the halfway point in the travel.
// If you put the knob at noon, the volume would be 20% of maximum (about -14 dB).
// So, 0 = -INFdB, 63 = -14dB and 127 = 0dB
// We adjust the scale by +6dB to define 0dB at 98 and +6dB at 127
#define volume_0dB 98
#define volume_6dB 127

#define scene_count_max 10

struct amp {
    u8 gain;    // amp gain (7-bit), if 0 then the default gain is used
    u8 fx;      // bitfield for FX enable/disable, including clean/dirty switch.
    u8 volume;  // volume (7-bit) represented as quarter-dB where 127 = +6dB, 0dB = 67
};

// Program v4 (next gen) data structure loaded from / written to flash memory:
struct program {
    // Index into the name table for the name of the program (song):
    u16 name_index;

    // AXE-FX program # to switch to (7 bit)
    u8 midi_program;

    u8 scene_count;

    // Scene descriptors (5 bytes each):
    struct scene_descriptor {
        // 2 amps:
        struct amp amp[2];
    } scene[scene_count_max];
};

// amp state is 3 bytes:
COMPILE_ASSERT(sizeof(struct amp) == 3);

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
#define axe_cc_byp_rotary1      86
#define axe_cc_byp_rotary2      87

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
#define row_amp1 2
#define row_amp2 3
#define row_status 0
#define row_song 1
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

    // Whether INC/DEC affects gain (0) or volume (1):
    u8 gain_mode;
    // Whether current program is modified in any way:
    u8 modified;
};

// Current and last state:
struct state curr, last;

// BCD-encoded dB value table (from PIC/v4_lookup.h):
rom const u16 dB_bcd_lookup[128] = {
#include "../PIC/v4_lookup.h"
};

// Max program #:
u8 sl_max;
// Loaded setlist:
struct set_list sl;
// Loaded program:
struct program pr, origpr;

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
    ((last.fsw.top.byte == 0) && (curr.fsw.top.byte == mask))

// Always switch programs regardless of whether a top switch was accidentally depressed:
#define is_bot_button_pressed(mask) \
    ((last.fsw.bot.byte == 0) && (curr.fsw.bot.byte == mask))

#define is_top_button_released(mask) \
    (((last.fsw.top.byte & mask) == mask) && ((curr.fsw.top.byte & mask) == 0))

#define is_bot_button_released(mask) \
    (((last.fsw.bot.byte & mask) == mask) && ((curr.fsw.bot.byte & mask) == 0))

#define is_top_button_held(mask) \
    (curr.fsw.top.byte == mask)

#define is_bot_button_held(mask) \
    (curr.fsw.bot.byte == mask)

rom char hex[16] = {'0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'};

static void hextoa(char *dst, u8 col, u8 n) {
    dst += col;
    *dst-- = hex[n & 0x0F];
    *dst = hex[(n >> 4) & 0x0F];
}

static s8 ritoa(char *dst, s8 col, u8 n) {
	do {
		dst[col--] = (n % (char)10) + (char)'0';
	} while ((n /= (u8)10) > (u8)0);
	return col;
}

// BCD is 2.1 format with MSB indicating sign
static void bcdtoa(char *dst, u8 col, u16 bcd) {
    u8 sign;
    dst += col;
    sign = (u8) ((bcd & 0x8000) != 0);
    if ((bcd & 0x7FFF) == 0x7FFF) {
        *dst-- = 'f';
        *dst-- = 'n';
        *dst-- = 'i';
    } else {
        *dst-- = (char) '0' + (char) (bcd & 0x0F);
        *dst-- = '.';
        bcd >>= 4;
        *dst-- = (char) '0' + (char) (bcd & 0x0F);
        bcd >>= 4;
        if ((bcd & 0x0F) > 0) {
            *dst-- = (char) '0' + (char) (bcd & 0x0F);
        }
    }
    if (sign) {
        *dst = '-';
    }
}

#ifndef __MCC18
char bcd_tmp[6];
static char *bcd(u16 n) {
    bcd_tmp[5] = 0;
    bcd_tmp[4] = ' ';
    bcd_tmp[3] = ' ';
    bcd_tmp[2] = ' ';
    bcd_tmp[1] = ' ';
    bcd_tmp[0] = ' ';
    bcdtoa(bcd_tmp, 4, n);
    return bcd_tmp;
}
#endif

// Copies a fixed-length string optionally NUL-terminated to the LCD display row:
static void copy_str_lcd(rom const char *src, char *dst) {
    u8 i;
    for (i = 0; src[i] != 0 && i < LCD_COLS; ++i) {
        dst[i] = src[i];
    }
    for (; i < LCD_COLS; i++) {
        dst[i] = ' ';
    }
}

// Comment-out unused functions so they don't take up code space on PIC.
#if 0
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
#endif

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

static void curr_amp_dec(void);

static void curr_amp_inc(void);

static void curr_amp_toggle(void);

static void curr_amp_vol_decrease(void);

static void curr_amp_vol_increase(void);

static void curr_amp_vol_toggle(void);

static void curr_amp_gain_decrease(void);

static void curr_amp_gain_increase(void);

static void curr_amp_gain_toggle(void);

static void prev_scene(void);

static void next_scene(void);

static void prev_song(void);

static void next_song(void);

static void curr_amp_reset(void);

static void toggle_setlist_mode(void);

static void scene_default(void);

static void program_save(void);

// (enable == 0 ? (u8)0 : (u8)0x7F)
#define calc_cc_toggle(enable) \
    ((u8)-((s8)enable) >> (u8)1)

// calculate the difference from last MIDI state to current MIDI state and send the difference as MIDI commands:
static void calc_midi(void) {
    u8 diff = 0;
    u8 gain, last_gain;
    u8 dirty, last_dirty;
    u8 gate, last_gate;
    u8 xy;
    u8 send_gain;
    u8 dirty_changed;
    u8 gain_changed;

    // Send gain controller changes:
    dirty = read_bit(dirty, curr.amp[0].fx);
    last_dirty = read_bit(dirty, last.amp[0].fx);
    dirty_changed = (u8)(dirty != last_dirty);

    gain = or_default(curr.amp[0].gain);
    last_gain = or_default(last.amp[0].gain);
    gain_changed = (u8)(gain != last_gain);

    gate = (u8)(dirty && (gain >= 0x10));
    last_gate = (u8)(last_dirty && (last_gain >= 0x10));

    diff |= gain_changed;

    send_gain = (u8)((dirty && gain_changed) || dirty_changed);
    if (send_gain) {
        DEBUG_LOG2("MIDI set AMP1 %s, gain=0x%02x", dirty == 0 ? "clean" : "dirty", gain);
        midi_set_axe_cc(axe_cc_external3, (dirty == 0) ? (u8)0x00 : gain);
        if (gate != last_gate) {
            midi_set_axe_cc(axe_cc_byp_gate1, calc_cc_toggle(gate));
            midi_set_axe_cc(axe_cc_byp_compressor1, calc_cc_toggle(!gate));
        }
        diff = 1;
    }

    dirty = read_bit(dirty, curr.amp[1].fx);
    last_dirty = read_bit(dirty, last.amp[1].fx);
    dirty_changed = (u8)(dirty != last_dirty);

    gain = or_default(curr.amp[1].gain);
    last_gain = or_default(last.amp[1].gain);
    gain_changed = (u8)(gain != last_gain);

    gate = (u8)(dirty && (gain >= 0x10));
    last_gate = (u8)(last_dirty && (last_gain >= 0x10));

    diff |= gain_changed;
    send_gain = (u8)((dirty && gain_changed) || dirty_changed);
    if (send_gain) {
        DEBUG_LOG2("MIDI set AMP2 %s, gain=0x%02x", dirty == 0 ? "clean" : "dirty", gain);
        midi_set_axe_cc(axe_cc_external4, (dirty == 0) ? (u8)0x00 : gain);
        if (gate != last_gate) {
            midi_set_axe_cc(axe_cc_byp_gate2, calc_cc_toggle(gate));
            midi_set_axe_cc(axe_cc_byp_compressor2, calc_cc_toggle(!gate));
        }
        diff = 1;
    }

    // Send X/Y changes:
    // X = 127, Y = 0
    xy = read_bit(xy, curr.amp[0].fx);
    if (xy != read_bit(xy, last.amp[0].fx)) {
        DEBUG_LOG1("MIDI set AMP1 %s", xy == 0 ? "X" : "Y");
        midi_set_axe_cc(axe_cc_xy_amp1, calc_cc_toggle(!xy));
        diff = 1;
    }
    xy = read_bit(xy, curr.amp[1].fx);
    if (xy != read_bit(xy, last.amp[1].fx)) {
        DEBUG_LOG1("MIDI set AMP2 %s", xy == 0 ? "X" : "Y");
        midi_set_axe_cc(axe_cc_xy_amp2, calc_cc_toggle(!xy));
        diff = 1;
    }

    // Update volumes:
    if (curr.amp[0].volume != last.amp[0].volume) {
        DEBUG_LOG1("MIDI set AMP1 volume = %s", bcd(dB_bcd_lookup[curr.amp[0].volume]));
        midi_set_axe_cc(axe_cc_external1, (curr.amp[0].volume));
        diff = 1;
    }
    if (curr.amp[1].volume != last.amp[1].volume) {
        DEBUG_LOG1("MIDI set AMP2 volume = %s", bcd(dB_bcd_lookup[curr.amp[1].volume]));
        midi_set_axe_cc(axe_cc_external2, (curr.amp[1].volume));
        diff = 1;
    }

    // Enable FX:
    if (read_bit(delay, curr.amp[0].fx) != read_bit(delay, last.amp[0].fx)) {
        DEBUG_LOG1("MIDI set AMP1 delay %s", read_bit(delay, curr.amp[0].fx) == 0 ? "off" : "on");
        midi_set_axe_cc(axe_cc_byp_delay1, calc_cc_toggle(read_bit(delay, curr.amp[0].fx)));
    }
    if (read_bit(delay, curr.amp[1].fx) != read_bit(delay, last.amp[1].fx)) {
        DEBUG_LOG1("MIDI set AMP2 delay %s", read_bit(delay, curr.amp[1].fx) == 0 ? "off" : "on");
        midi_set_axe_cc(axe_cc_byp_delay2, calc_cc_toggle(read_bit(delay, curr.amp[1].fx)));
    }

    if (read_bit(rotary, curr.amp[0].fx) != read_bit(rotary, last.amp[0].fx)) {
        DEBUG_LOG1("MIDI set AMP1 rotary %s", read_bit(rotary, curr.amp[0].fx) == 0 ? "off" : "on");
        midi_set_axe_cc(axe_cc_byp_rotary1, calc_cc_toggle(read_bit(rotary, curr.amp[0].fx)));
    }
    if (read_bit(rotary, curr.amp[1].fx) != read_bit(rotary, last.amp[1].fx)) {
        DEBUG_LOG1("MIDI set AMP2 rotary %s", read_bit(rotary, curr.amp[1].fx) == 0 ? "off" : "on");
        midi_set_axe_cc(axe_cc_byp_rotary2, calc_cc_toggle(read_bit(rotary, curr.amp[1].fx)));
    }

    if (read_bit(pitch, curr.amp[0].fx) != read_bit(pitch, last.amp[0].fx)) {
        DEBUG_LOG1("MIDI set AMP1 pitch %s", read_bit(pitch, curr.amp[0].fx) == 0 ? "off" : "on");
        midi_set_axe_cc(axe_cc_byp_pitch1, calc_cc_toggle(read_bit(pitch, curr.amp[0].fx)));
    }
    if (read_bit(pitch, curr.amp[1].fx) != read_bit(pitch, last.amp[1].fx)) {
        DEBUG_LOG1("MIDI set AMP2 pitch %s", read_bit(pitch, curr.amp[1].fx) == 0 ? "off" : "on");
        midi_set_axe_cc(axe_cc_byp_pitch2, calc_cc_toggle(read_bit(pitch, curr.amp[1].fx)));
    }

    if (read_bit(chorus, curr.amp[0].fx) != read_bit(chorus, last.amp[0].fx)) {
        DEBUG_LOG1("MIDI set AMP1 chorus %s", read_bit(chorus, curr.amp[1].fx) == 0 ? "off" : "on");
        midi_set_axe_cc(axe_cc_byp_chorus1, calc_cc_toggle(read_bit(chorus, curr.amp[0].fx)));
    }
    if (read_bit(chorus, curr.amp[1].fx) != read_bit(chorus, last.amp[1].fx)) {
        DEBUG_LOG1("MIDI set AMP2 chorus %s", read_bit(chorus, curr.amp[1].fx) == 0 ? "off" : "on");
        midi_set_axe_cc(axe_cc_byp_chorus2, calc_cc_toggle(read_bit(chorus, curr.amp[1].fx)));
    }

    if (read_bit(filter, curr.amp[0].fx) != read_bit(filter, last.amp[0].fx)) {
        DEBUG_LOG1("MIDI set AMP1 filter %s", read_bit(filter, curr.amp[1].fx) == 0 ? "off" : "on");
        midi_set_axe_cc(axe_cc_byp_phaser1, calc_cc_toggle(read_bit(filter, curr.amp[0].fx)));
    }
    if (read_bit(filter, curr.amp[1].fx) != read_bit(filter, last.amp[1].fx)) {
        DEBUG_LOG1("MIDI set AMP2 filter %s", read_bit(filter, curr.amp[1].fx) == 0 ? "off" : "on");
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
    if (curr.modified != last.modified) {
        diff = 1;
    }

    // Update LCD if the state changed:
    if (diff) {
        update_lcd();
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
#endif
    DEBUG_LOG0("update LCD");
#ifdef HWFEAT_LABEL_UPDATES
    // Bottom row:
    labels = label_row_get(0);
    labels[0] = "BOTH";
    labels[1] = "MG/JD";
    labels[2] = "GAIN/VOL";
    labels[3] = "DEC";
    labels[4] = "INC";
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
        lcd_rows[row_status][i] = "                    "[i];
        lcd_rows[row_song][i] = "                    "[i];
        lcd_rows[row_amp1][i] = "MG*   0.0  JD*   0.0"[i];
        lcd_rows[row_amp2][i] = "GXPCDF 7F  GXPCDF 7F"[i];
    }

    // Print setlist date:
    if (curr.setlist_mode == 0) {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[row_status][i] = "Program    # 0 sc  0"[i];
        }
        ritoa(lcd_rows[row_status], 13, curr.pr_idx + (u8)1);
    } else {
        // Show setlist data:
        u8 yyyy = sl.d1 >> 1;
        u8 mm = ((sl.d1 & (u8)1) << 3) | (sl.d0 >> 5);
        u8 dd = (sl.d0 & (u8)31);
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[row_status][i] = "2014-01-01 # 0 sc  0"[i];
        }
        ritoa(lcd_rows[row_status], 3, yyyy + (u8)14);
        ritoa(lcd_rows[row_status], 6, mm + (u8)1);
        ritoa(lcd_rows[row_status], 9, dd + (u8)1);
        ritoa(lcd_rows[row_status], 13, curr.sl_idx + (u8)1);
    }
    ritoa(lcd_rows[row_status], 19, curr.sc_idx + (u8)1);

    // Song name:
    pr_name = name_get(pr.name_index);
    copy_str_lcd(pr_name, lcd_rows[row_song]);
    // Set modified bit:
    if (curr.modified) {
        lcd_rows[row_song][19] = '*';
    }

    // Amp row 1:
    lcd_rows[row_amp1][ 2] = (curr.selected_amp == 0) ? (char)'*' : (char)' ';
    lcd_rows[row_amp1][13] = (curr.selected_amp == 1) ? (char)'*' : (char)' ';

    // Print volume levels:
    bcdtoa(lcd_rows[row_amp1],  8, dB_bcd_lookup[curr.amp[0].volume]);
    bcdtoa(lcd_rows[row_amp1], 19, dB_bcd_lookup[curr.amp[1].volume]);

    // Amp row 2:
    lcd_rows[row_amp2][ 0] = (char)'G' | (char)(!read_bit(dirty, curr.amp[0].fx) << 5);
    lcd_rows[row_amp2][ 1] = (char)'X' | (char)(read_bit(xy, curr.amp[0].fx));
    lcd_rows[row_amp2][ 2] = (char)'P' | (char)(!read_bit(pitch, curr.amp[0].fx) << 5);
    lcd_rows[row_amp2][ 3] = (char)'C' | (char)(!read_bit(chorus, curr.amp[0].fx) << 5);
    lcd_rows[row_amp2][ 4] = (char)'D' | (char)(!read_bit(delay, curr.amp[0].fx) << 5);
    lcd_rows[row_amp2][ 5] = (char)'F' | (char)(!read_bit(filter, curr.amp[0].fx) << 5);
    hextoa(lcd_rows[row_amp2], 8, or_default(curr.amp[0].gain));

    lcd_rows[row_amp2][11] = (char)'G' | (char)(!read_bit(dirty, curr.amp[1].fx) << 5);
    lcd_rows[row_amp2][12] = (char)'X' | (char)(read_bit(xy, curr.amp[1].fx));
    lcd_rows[row_amp2][13] = (char)'P' | (char)(!read_bit(pitch, curr.amp[1].fx) << 5);
    lcd_rows[row_amp2][14] = (char)'C' | (char)(!read_bit(chorus, curr.amp[1].fx) << 5);
    lcd_rows[row_amp2][15] = (char)'D' | (char)(!read_bit(delay, curr.amp[1].fx) << 5);
    lcd_rows[row_amp2][16] = (char)'F' | (char)(!read_bit(filter, curr.amp[1].fx) << 5);
    hextoa(lcd_rows[row_amp2], 19, or_default(curr.amp[1].gain));

    lcd_updated_all();
#endif
}

/*
LIVE:
|------------------------------------------------------------|
|     *      *      *      *      *      *      *      *     |
|   DIRTY   X/Y   PITCH  CHORUS DELAY  FILTER PR_PRV PR_NXT  |
|                                             PR_ONE         |
|                                                            |
|     *      *      *      *      *      *      *      *     |
|   BOTH   MG/JD GAIN/VOL DEC    INC    TAP   SC_PRV SC_NXT  |
|          RESET                        MODE          SAVE   |
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
    curr.mode_leds[curr.mode].bot.bits._3 = curr.gain_mode;
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

    last.setlist_mode = 0;
    curr.setlist_mode = 1;

    curr.amp[0].gain = 0;
    curr.amp[1].gain = 0;
    last.amp[0].gain = ~curr.amp[0].gain;
    last.amp[1].gain = ~curr.amp[1].gain;

    // Load setlist:
    flash_load((u16)(128 * sizeof(struct program)), sizeof(struct set_list), (u8 *)&sl);
    sl_max = sl.count - (u8)1;

    // Load first program in setlist:
    curr.sl_idx = 0;
    curr.pr_idx = 0;
    curr.sc_idx = 0;
    flash_load((u16)(sl.entries[curr.sl_idx].program * sizeof(struct program)), sizeof(struct program), (u8 *)&pr);
    origpr = pr;
    curr.modified = 0;

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

#ifdef FEAT_LCD
    for (i = 0; i < LCD_ROWS; ++i)
        lcd_rows[i] = lcd_row_get(i);

    for (i = 0; i < LCD_COLS; ++i) {
        lcd_rows[row_amp1][i] = "                    "[i];
        lcd_rows[row_amp2][i] = "                    "[i];
        lcd_rows[row_status][i] = "                    "[i];
        lcd_rows[row_song][i] = "                    "[i];
    }

    update_lcd();
#endif
}

struct timers {
    // Repeating timers:
    u8 bot_4;
    u8 bot_5;
    u8 bot_8;
    u8 top_7;
    u8 top_8;
    // Once-only timers:
    u8 bot_2;
    u8 bot_3;
    u8 bot_6;
} timers;

#if 0
u8 val;
#endif

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

    one_shot(bot,2,0x1F,curr_amp_reset)
    one_shot(bot,3,0x1F,curr_amp_toggle)

    repeater(bot,4,0x20,0x01,curr_amp_dec)
    repeater(bot,5,0x20,0x01,curr_amp_inc)

    one_shot(bot,6,0x3F,toggle_setlist_mode)

    one_shot(bot,8,0x3F,program_save)

    repeater(top,7,0x20,0x03,prev_song)
    repeater(top,8,0x20,0x03,next_song)

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

static void calc_gain_modified(void) {
    curr.modified = (curr.modified & ~(u8) 0x11) |
        ((u8) (curr.amp[0].gain != origpr.scene[curr.sc_idx].amp[0].gain) << (u8) 0) |
        ((u8) (curr.amp[1].gain != origpr.scene[curr.sc_idx].amp[1].gain) << (u8) 4);
}

static void calc_fx_modified(void) {
    curr.modified = (curr.modified & ~(u8) 0x22) |
        ((u8) (curr.amp[0].fx != origpr.scene[curr.sc_idx].amp[0].fx) << (u8) 1) |
        ((u8) (curr.amp[1].fx != origpr.scene[curr.sc_idx].amp[1].fx) << (u8) 5);
}

static void calc_volume_modified(void) {
    curr.modified = (curr.modified & ~(u8) 0x44) |
        ((u8) (curr.amp[0].volume != origpr.scene[curr.sc_idx].amp[0].volume) << (u8) 2) |
        ((u8) (curr.amp[1].volume != origpr.scene[curr.sc_idx].amp[1].volume) << (u8) 6);
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

    // GAIN/VOL
    if (is_bot_button_pressed(M_3)) {
        timers.bot_3 = (u8)0x80;
    } else if (is_bot_button_released(M_3)) {
        if ((timers.bot_3 & (u8)0x80) != (u8)0) {
            curr.gain_mode ^= (u8)1;
        }
        timers.bot_3 = (u8)0;
    }

    // DEC
    if (is_bot_button_pressed(M_4)) {
        timers.bot_4 = (u8)0x80;
        curr_amp_dec();
    } else if (is_bot_button_released(M_4)) {
        timers.bot_4 &= ~(u8)0xC0;
    }

    // INC
    if (is_bot_button_pressed(M_5)) {
        timers.bot_5 = (u8)0x80;
        curr_amp_inc();
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
        prev_scene();
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
            calc_fx_modified(); \
        } else { \
            toggle_bit(name, curr.amp[curr.selected_amp].fx); \
            calc_fx_modified(); \
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

        if (curr.setlist_mode == 1) {
            pr_num = sl.entries[curr.sl_idx].program;
        } else {
            pr_num = curr.pr_idx;
        }

        DEBUG_LOG1("load program %d", pr_num + 1);

        flash_load((u16) (pr_num * sizeof(struct program)), sizeof(struct program), (u8 *) &pr);
        origpr = pr;
        curr.modified = 0;

        // Establish a sane default for an undefined program:
        curr.sc_idx = 0;
        if (pr.name_index == (u16)0) {
            scene_default();
        }

        // Trigger a scene reload:
        last.sc_idx = ~curr.sc_idx;
    }

    if (curr.sc_idx != last.sc_idx) {
        DEBUG_LOG1("load scene %d", curr.sc_idx + 1);

        // Store last state into program for recall:
        pr.scene[last.sc_idx].amp[0] = curr.amp[0];
        pr.scene[last.sc_idx].amp[1] = curr.amp[1];

        // Detect if scene is uninitialized:
        if ((pr.scene[curr.sc_idx].amp[0].gain == 0) && (pr.scene[curr.sc_idx].amp[0].volume == 0) &&
            (pr.scene[curr.sc_idx].amp[1].gain == 0) && (pr.scene[curr.sc_idx].amp[1].volume == 0)) {
            // Reset to default scene state:
            //scene_default();
            pr.scene[curr.sc_idx] = pr.scene[curr.sc_idx-1];
        }

        // Copy new scene settings into current state:
        curr.amp[0] = pr.scene[curr.sc_idx].amp[0];
        curr.amp[1] = pr.scene[curr.sc_idx].amp[1];

        // Recalculate modified status for this scene:
        curr.modified = 0;
        calc_volume_modified();
        calc_fx_modified();
        calc_gain_modified();
    }

    calc_midi();
    calc_leds();

    // Record the previous state:
    last = curr;
}

void scene_default(void) {
    DEBUG_LOG1("default scene %d", curr.sc_idx + 1);
    pr.scene[curr.sc_idx].amp[0].gain = 0;
    pr.scene[curr.sc_idx].amp[0].fx = fxm_dirty;
    pr.scene[curr.sc_idx].amp[0].volume = volume_0dB;
    pr.scene[curr.sc_idx].amp[1].gain = 0;
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
    if (curr.sc_idx < scene_count_max - 1) {
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

#define min(a,b) (a < b ? a : b)
#define max(a,b) (a > b ? a : b)

static void curr_amp_vol_toggle() {
    // Toggle between 0dB and +6dB:
    if (curr.selected_both) {
        u8 volume = max((curr.amp[0].volume), (curr.amp[1].volume));
        if (volume == volume_0dB) {
            curr.amp[0].volume = volume_6dB;
            curr.amp[1].volume = volume_6dB;
        } else {
            curr.amp[0].volume = volume_0dB;
            curr.amp[1].volume = volume_0dB;
        }
    } else {
        if (curr.amp[curr.selected_amp].volume == volume_0dB) {
            curr.amp[curr.selected_amp].volume = volume_6dB;
        } else {
            curr.amp[curr.selected_amp].volume = volume_0dB;
        }
    }
    calc_volume_modified();
}

static void curr_amp_vol_increase() {
    if (curr.selected_both) {
        u8 volume = max((curr.amp[0].volume), (curr.amp[1].volume));
        if (volume < (u8)127) {
            volume++;
            curr.amp[0].volume = volume;
            curr.amp[1].volume = volume;
            calc_volume_modified();
        }
    } else {
        u8 volume = (curr.amp[curr.selected_amp].volume);
        if (volume < (u8)127) {
            volume++;
            curr.amp[curr.selected_amp].volume = volume;
            calc_volume_modified();
        }
    }
}

static void curr_amp_vol_decrease() {
    if (curr.selected_both) {
        u8 volume = min((curr.amp[0].volume), (curr.amp[1].volume));
        if (volume > (u8)0) {
            volume--;
            curr.amp[0].volume = volume;
            curr.amp[1].volume = volume;
            calc_volume_modified();
        }
    } else {
        u8 volume = (curr.amp[curr.selected_amp].volume);
        if (volume > (u8)0) {
            volume--;
            curr.amp[curr.selected_amp].volume = volume;
            calc_volume_modified();
        }
    }
}

static void curr_amp_gain_toggle() {
    // Reset gain to default_gain:
    if (curr.selected_both) {
        curr.amp[0].gain = 0;
        curr.amp[1].gain = 0;
    } else {
        curr.amp[curr.selected_amp].gain = 0;
    }
    calc_gain_modified();
}

static void curr_amp_gain_increase() {
    if (curr.selected_both) {
        u8 gain = max(or_default(curr.amp[0].gain), or_default(curr.amp[1].gain));
        if (gain < (u8)127) {
            gain++;
            curr.amp[0].gain = gain;
            curr.amp[1].gain = gain;
            calc_gain_modified();
        }
    } else {
        u8 gain = or_default(curr.amp[curr.selected_amp].gain);
        if (gain < (u8)127) {
            gain++;
            curr.amp[curr.selected_amp].gain = gain;
            calc_gain_modified();
        }
    }
}

static void curr_amp_gain_decrease() {
    if (curr.selected_both) {
        u8 gain = min(or_default(curr.amp[0].gain), or_default(curr.amp[1].gain));
        if (gain > (u8)1) {
            gain--;
            curr.amp[0].gain = gain;
            curr.amp[1].gain = gain;
            calc_gain_modified();
        }
    } else {
        u8 gain = or_default(curr.amp[curr.selected_amp].gain);
        if (gain > (u8)1) {
            gain--;
            curr.amp[curr.selected_amp].gain = gain;
            calc_gain_modified();
        }
    }
}

static void curr_amp_inc() {
    if (curr.gain_mode == (u8)0) {
        curr_amp_gain_increase();
    } else {
        curr_amp_vol_increase();
    }
}

static void curr_amp_dec() {
    if (curr.gain_mode == (u8)0) {
        curr_amp_gain_decrease();
    } else {
        curr_amp_vol_decrease();
    }
}

static void curr_amp_toggle() {
    if (curr.gain_mode == (u8)0) {
        curr_amp_gain_toggle();
    } else {
        curr_amp_vol_toggle();
    }
}

static void program_save() {
    // Load program:
    u8 pr_num;
    u16 addr;

    if (curr.setlist_mode == 1) {
        pr_num = sl.entries[curr.sl_idx].program;
    } else {
        pr_num = curr.pr_idx;
    }

    // Update current scene in program from current state:
    pr.scene[curr.sc_idx].amp[0] = curr.amp[0];
    pr.scene[curr.sc_idx].amp[1] = curr.amp[1];

    // Save current program back to flash:
    addr = (u16)(pr_num * sizeof(struct program));
    DEBUG_LOG2("save program %d at addr 0x%04x", pr_num+1, addr);
    flash_store(addr, sizeof(struct program), (u8 *)&pr);

    curr.modified = 0;
}

#else

typedef int nothing4;

#endif
