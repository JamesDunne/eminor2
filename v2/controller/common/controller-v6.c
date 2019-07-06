/*
    Programmable e-minor MIDI foot controller hardware v2, software v6.

    Currently designed to work with:
        Axe-FX II (MIDI channel 3)
        Roland TD-50 drum module (MIDI channel 10)

    Written by
    James S. Dunne
    https://github.com/JamesDunne/
    2019-07-02

    Axe-FX:
    + Split stereo cab block into two mono blocks; CAB1 pan L, CAB2 pan R
    + Amp X/Y for dirty/clean (disable for acoustic)
    + Cab X/Y for electric/acoustic

LCD designs:
    /--------------------\
    |Sandman             | Song
    |X  1 K 51 I12/38 c/c| Program
    |C 1a     -50.4 P12CD| MG AMP
    |D 5e -40   0.0 -1---| JD AMP
    \--------------------/

    /--------------------\
    |What I Got          | Song
    |X  2 K 52 S31/96 c/c| Program
    |A          0.0 P12CD| MG AMP
    |A          0.0 -1---| JD AMP
    \--------------------/

    EDIT FX mode:
    /--------------------\
    |What_I_Got_________*|
    |Sng 62/62  Scn  2/ 3|
    |C 1a     -50.4 P12CD| MG AMP
    |pit2rot2fil2cho2dly2| JD FX
    \--------------------/

    Song row columns
    [ 0] 20 char = Song name

    Program row columns:
    [ 0]  1 char = 'X' to indicate aXe-fx MIDI program number
    [ 1]  3 char = AXE-FX MIDI program number in decimal
    [ 4]  1 char = space
    [ 5]  1 char = 'K' to indicate drum Kit for TD-50 MIDI program number
    [ 6]  3 char = TD-50 MIDI program number in decimal
    [ 9]  1 char = space
    [10]  1 char = 'I' for index in setlist mode or 'S' for song in rehearsal mode
    [11]  2 char = setlist index or song number, 1-based, decimal
    [13]  1 char = '/'
    [14]  2 char = max setlist index or max song number, 1-based, decimal
    [16]  1 char = space
    [17]  1 char = scene index, hexadecimal, lowercase, 1-based
    [18]  1 char = '/'
    [19]  1 char = max scene index, hexadecimal, lowercase, 1-based

    AMP row columns:
    [ 0]  1 char = [C]lean | [D]irty | [A]coustic channel
    [ 1]  1 char = space
    [ 2]  2 char = gain in lowercase hex for clean|dirty channels: "1a" or empty "  " for acoustic
    [ 4]  1 char = space
    [ 5]  3 char = gate threshold in dB for dirty channel: "-40" or empty "   " for clean|acoustic
    [ 8]  1 char = space
    [ 9]  5 char = volume in dB: " -inf", "-50.4", "  0.0", " +6.0"
    [14]  1 char = space
    [15]  5 char = FX enable/disable

Desired functions:
MIDI    : switch screen to edit AXE-FX and TD-50 MIDI program numbers
RESET   : clear last-sent MIDI state per CC and re-send
MODE    : toggle between setlist and rehearsal mode
TAP     : tap tempo

SCEN++  : next scene, next song if last scene
SCEN--  : prev scene, prev song if before 1
SCEN=1  : goto scene 1
SONG++  : next song
SONG--  : prev song

GAIN--  : decrease gain
GAIN++  : increase gain
VOLU--  : decrease volume
VOLU++  : increase volume
GATE--  : decrease gate threshold
GATE++  : increase gate threshold

CHANNEL : CLEAN | DIRTY
ACOUS   :    on | off
EDIT    :    FX | AMP
AMP     :    JD | MG

TODO: reduce from 5 FX to 4 FX
TODO: add JD|MG button on FX screen
TODO: on FX screen edit whether using song-default or per-scene gain
TODO: on FX screen edit whether using song-default or per-scene gate
TODO: scene++ moves to next song
TODO: after song++ or song-- require scene++ button to activate scene 1
TODO: show tempo via blinking LED
TODO: edit tempo via buttons
TODO: record tempo from taps

    EDIT AMP
    |------------------------------------------------------------|
    |     *      *      *      *      *      *      *      *     |
    |   ACOUS  GAIN-- GATE-- VOLU-- AMP|FX  MIDI SONG-- SONG++   |
    |                                       MODE                 |
    |                                                            |
    |     *      *      *      *      *      *      *      *     |
    |  CHANNEL GAIN++ GATE++ VOLU++ JD|MG   TAP  SCEN-- SCEN++   |
    |                                      RESET SCEN=1          |
    |------------------------------------------------------------|

    EDIT FX
    |------------------------------------------------------------|
    |     *      *      *      *      *      *      *      *     |
    |                               AMP|FX  MIDI PR_PRV PR_NXT   |
    |                                       MODE                 |
    |                                                            |
    |     *      *      *      *      *      *      *      *     |
    |    FX1    FX2    FX3    FX4   JD|MG   TAP  SC_PRV SC_NXT   |
    |                                      RESET SC_ONE          |
    |------------------------------------------------------------|

    EDIT MIDI
    |------------------------------------------------------------|
    |     *      *      *      *      *      *      *      *     |
    |                  X--    K--   AMP|FX  MIDI PR_PRV PR_NXT   |
    |                                       MODE                 |
    |                                                            |
    |     *      *      *      *      *      *      *      *     |
    |                  X++    K++           TAP  SC_PRV SC_NXT   |
    |                                      RESET SC_ONE          |
    |------------------------------------------------------------|

*/


#if HW_VERSION == 6

#include "util.h"

#include "song-v6.h"

// Hard-coded MIDI channel #s (0 based):
#define axe_midi_channel     2
#define td50_midi_channel    9

// Axe-FX II CC messages:
#define axe_cc_taptempo     14
#define axe_cc_tuner        15

// Pre-delay volume:
#define axe_cc_external1    16
#define axe_cc_external2    17
// Amp gain:
#define axe_cc_external3    18
#define axe_cc_external4    19
// Gate threshold:
#define axe_cc_external5    20
#define axe_cc_external6    21

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
#define axe_cc_xy_cab1     102
#define axe_cc_xy_cab2     103
#define axe_cc_xy_chorus1  104
#define axe_cc_xy_chorus2  105
#define axe_cc_xy_delay1   106
#define axe_cc_xy_delay2   107
#define axe_cc_xy_pitch1   114
#define axe_cc_xy_pitch2   115

#ifdef FEAT_LCD
// Pointers to LCD character rows:
near char *lcd_rows[LCD_ROWS];
#define row_song 0
#define row_stat 1
#define row_amp1 2
#define row_amp2 3
#endif

enum {
    MODE_LIVE = 0,
    MODE_count
};

enum rowstate_mode {
    ROWMODE_AMP,
    ROWMODE_FX
};

#pragma udata state
// Structured read-only view of writable ROM section that contains all our data:
rom near struct romdata *romdata;

rom near struct axe_midi_program *axe_midi;

#define fx_midi_cc(a) (axe_midi->amps[a].fx_midi_cc)

// Lookup keys for storing last sent CC values per amp; avoids resorting to a sparse array `u8 last_cc[0x7F]`:
// AMP2 keys start at CC__MAX.
enum cc_key {
    CC_FX1 = 0,
    CC_FX2,
    CC_FX3,
    CC_FX4,
    CC_FX5,
    CC_VOLUME,
    CC_GAIN,
    CC_GATE,
    CC_GATE_BYP,
    CC_AMP_BYP,
    CC_AMP_XY,
    CC_CAB_XY,
    CC_AMP2
};

// Lookup table for CC controller numbers by key:
u8 cc_lookup[CC_AMP2 * 2];

// Last-sent CC value by key:
u8 cc_sent[CC_AMP2 * 2];

// Last-sent tap tempo CC value (toggles between 0x00 and 0x7F):
u8 tap;

// Current screen:
enum screen {
    SCREEN_AMP,
    SCREEN_FX,
    SCREEN_MIDI
};

enum selected_amp {
    MG,
    JD
};

// Max program #:
u8 sl_max;

// Structure to represent state that should be compared from current to last to detect changes in program.
struct state {
    // Footswitch state:
    io16 fsw;
    // Actual LED state:
    io16 leds;

    // 0 for program mode, 1 for setlist mode:
    u8 setlist_mode;
    // Current setlist entry:
    u8 sl_idx;
    // Current program:
    u8 pr_idx;
    // Current scene:
    u8 sc_idx;

    enum selected_amp selected_amp;
    enum screen screen;

    // Current MIDI program #:
    u8 axe_midi_program;
    u8 td50_midi_program;

    // Current tempo (bpm):
    u8 tempo;
} curr, last;

// Current amp state:
struct amp amp[2];

struct {
    u8 gain;
    u8 gate;
    u8 volume;
} amp_live[2];
#pragma udata

#pragma udata program
// Loaded program:
struct song pr;
#pragma udata

// BCD-encoded dB value table (from PIC/v4_lookup.h):
#pragma udata bcd
extern rom const u16 dB_bcd_lookup[128];
#pragma udata

// Set Axe-FX CC value
#define midi_axe_sysex_start(fn) { \
  midi_send_sysex(0xF0); \
  midi_send_sysex(0x00); \
  midi_send_sysex(0x01); \
  midi_send_sysex(0x74); \
  midi_send_sysex(0x03); \
  midi_send_sysex(fn); \
}
#define midi_axe_sysex_end(chksum) { \
  midi_send_sysex(chksum); \
  midi_send_sysex(0xF7); \
}

#define is_top_button_pressed(mask) \
    (((last.fsw.top.byte & mask) == 0) && ((curr.fsw.top.byte & mask) == mask))

#define is_bot_button_pressed(mask) \
    (((last.fsw.bot.byte & mask) == 0) && ((curr.fsw.bot.byte & mask) == mask))

#define is_top_button_released(mask) \
    (((last.fsw.top.byte & mask) == mask) && ((curr.fsw.top.byte & mask) == 0))

#define is_bot_button_released(mask) \
    (((last.fsw.bot.byte & mask) == mask) && ((curr.fsw.bot.byte & mask) == 0))

#define is_top_button_held(mask) \
    ((curr.fsw.top.byte & mask) == mask)

#define is_bot_button_held(mask) \
    ((curr.fsw.bot.byte & mask) == mask)

static void send_leds(void) {
    // Update LEDs:
    u16 curr_leds = (u16)curr.leds.bot.byte | ((u16)curr.leds.top.byte << 8);
    u16 last_leds = (u16)last.leds.bot.byte | ((u16)last.leds.top.byte << 8);
    if (curr_leds != last_leds) {
        led_set(curr_leds);
    }
}

// ------------------------- Actual controller logic -------------------------

static void update_lcd(void);

static void prev_scene(void);

static void next_scene(void);

static void prev_song(void);

static void next_song(void);

static void midi_invalidate(void);

static void midi_reset_cc(void);

static void load_axe_midi(void);

static void toggle_setlist_mode(void);

static void scene_default(void);

static void reset_scene(void);

// (enable == 0 ? (u8)0 : (u8)0x7F)
#define calc_cc_toggle(enable) \
    ((u8) -((s8)(enable)) >> (u8)1)

#define or_default(a, b) (a == 0 ? b : a)

static u8 midi_axe_cc(enum cc_key key, u8 a, u8 value) {
    enum cc_key amp_key = key + (a * CC_AMP2);
    u8 last_value = cc_sent[amp_key];
    if (value != last_value) {
        midi_send_cmd2(0xB, axe_midi_channel, cc_lookup[amp_key], value);
        cc_sent[amp_key] = value;
        return 1;
    }
    return 0;
}

// MIDI is sent at a fixed 3,125 bytes/sec transfer rate; 56 bytes takes 175ms to complete.
// calculate the difference from last MIDI state to current MIDI state and send the difference as MIDI commands:
static void calc_midi(void) {
    u8 diff = 0;
    u8 test_fx = 1;
    u8 i, a;

    // Send MIDI program change:
    if (curr.axe_midi_program != last.axe_midi_program) {
        DEBUG_LOG1("AXE-FX MIDI change program %d", curr.axe_midi_program);
        midi_send_cmd1(0xC, axe_midi_channel, curr.axe_midi_program);
        // All bets are off as to what state was last sent when changing programs:
        midi_reset_cc();
        load_axe_midi();
        diff = 1;
    }

    if (curr.td50_midi_program != last.td50_midi_program) {
        DEBUG_LOG1("TD-50  MIDI change program %d", curr.td50_midi_program);
        midi_send_cmd1(0xC, td50_midi_channel, curr.td50_midi_program);
        diff = 1;
    }

    if (curr.setlist_mode != last.setlist_mode) {
        diff = 1;
    }

    // Send controller changes per amp:
    for (a = 0; a < 2; a++) {
        if ((amp[a].fx & fxm_acoustc) != 0) {
            // acoustic:
            amp_live[a].gain = or_default(pr.amp_defaults.clean_gain, axe_midi->amp_defaults.clean_gain);

            if (midi_axe_cc(CC_AMP_BYP, a, 0x00)) {
                DEBUG_LOG1("AMP%d off", a + 1);
                diff = 1;
            }
            if (midi_axe_cc(CC_CAB_XY, a, 0x00)) {
                DEBUG_LOG1("CAB%d Y", a + 1);
                diff = 1;
            }
            if (midi_axe_cc(CC_GATE_BYP, a, 0x00)) {
                DEBUG_LOG1("GATE%d off", a + 1);
                diff = 1;
            }
        } else if ((amp[a].fx & fxm_dirty) != 0) {
            // dirty:
            amp_live[a].gain = or_default(amp[a].gain, or_default(pr.amp_defaults.dirty_gain, axe_midi->amp_defaults.dirty_gain));
            amp_live[a].gate = or_default(amp[a].gate, or_default(pr.amp_defaults.gate, axe_midi->amp_defaults.gate));

            if (midi_axe_cc(CC_AMP_BYP, a, 0x7F)) {
                DEBUG_LOG1("AMP%d on", a + 1);
                diff = 1;
            }
            if (midi_axe_cc(CC_AMP_XY, a, 0x7F)) {
                DEBUG_LOG1("AMP%d X", a + 1);
                diff = 1;
            }
            if (midi_axe_cc(CC_CAB_XY, a, 0x7F)) {
                DEBUG_LOG1("CAB%d X", a + 1);
                diff = 1;
            }
            if (midi_axe_cc(CC_GATE_BYP, a, 0x7F)) {
                DEBUG_LOG1("GATE%d on", a + 1);
                diff = 1;
            }
        } else {
            // clean:
            amp_live[a].gain = or_default(pr.amp_defaults.clean_gain, axe_midi->amp_defaults.clean_gain);

            if (midi_axe_cc(CC_AMP_BYP, a, 0x7F)) {
                DEBUG_LOG1("AMP%d on", a + 1);
                diff = 1;
            }
            if (midi_axe_cc(CC_AMP_XY, a, 0x00)) {
                DEBUG_LOG1("AMP%d Y", a + 1);
                diff = 1;
            }
            if (midi_axe_cc(CC_CAB_XY, a, 0x7F)) {
                DEBUG_LOG1("CAB%d X", a + 1);
                diff = 1;
            }
            if (midi_axe_cc(CC_GATE_BYP, a, 0x00)) {
                DEBUG_LOG1("GATE%d off", a + 1);
                diff = 1;
            }
        }

        if (midi_axe_cc(CC_GAIN, a, amp_live[a].gain)) {
            DEBUG_LOG2("Gain%d 0x%02x", a + 1, amp_live[a].gain);
            diff = 1;
        }
        if (midi_axe_cc(CC_GATE, a, amp_live[a].gate)) {
            DEBUG_LOG2("Gate%d %d", a + 1, amp_live[a].gate);
            diff = 1;
        }

        // Update volumes:
        if (midi_axe_cc(CC_VOLUME, a, amp[a].volume)) {
            DEBUG_LOG2("AMP%d volume = %s", a + 1, bcd(dB_bcd_lookup[amp[a].volume]));
            diff = 1;
        }
    }

    // Send FX state:
    for (i = 0; i < fx_count; i++, test_fx <<= 1) {
        if (midi_axe_cc(CC_FX1 + i, 0, calc_cc_toggle(amp[0].fx & test_fx))) {
            DEBUG_LOG2("AMP1 %.4s %s", fx_name(fx_midi_cc(0)[i]), (amp[0].fx & test_fx) == 0 ? "off" : "on");
            diff = 1;
        }
        if (midi_axe_cc(CC_FX1 + i, 1, calc_cc_toggle(amp[1].fx & test_fx))) {
            DEBUG_LOG2("AMP2 %.4s %s", fx_name(fx_midi_cc(1)[i]), (amp[1].fx & test_fx) == 0 ? "off" : "on");
            diff = 1;
        }
    }

    // Send MIDI tempo change:
    if ((curr.tempo != last.tempo) && (curr.tempo >= 30)) {
        // http://forum.fractalaudio.com/threads/is-it-possible-to-set-tempo-on-the-axe-fx-ii-via-sysex.101437/
        // Example SysEx runs for tempo change on Axe-FX II:
        // F0 00 01 74 03 02 0D 01 20 00 1E 00 00 01 37 F7   =  30 BPM
        // F0 00 01 74 03 02 0D 01 20 00 78 00 00 01 51 F7   = 120 BPM
        // F0 00 01 74 03 02 0D 01 20 00 0C 01 00 01 24 F7   = 140 BPM

        // Precompute a checksum that excludes only the 2 tempo bytes:
        u8 cs = 0xF0 ^ 0x00 ^ 0x01 ^ 0x74 ^ 0x03 ^ 0x02 ^ 0x0D ^ 0x01 ^ 0x20 ^ 0x00 ^ 0x00 ^ 0x01;
        u8 d;

        DEBUG_LOG1("MIDI set tempo = %d bpm", curr.tempo);
        // Start the sysex command targeted at the Axe-FX II to initiate tempo change:
        midi_axe_sysex_start(0x02);
        midi_send_sysex(0x0D);
        midi_send_sysex(0x01);
        midi_send_sysex(0x20);
        midi_send_sysex(0x00);
        // Tempo value split in 2x 7-bit values:
        d = (curr.tempo & (u8)0x7F);
        cs ^= d;
        midi_send_sysex(d);
        d = (curr.tempo >> (u8)7);
        cs ^= d;
        midi_send_sysex(d);
        //  Finish the tempo command and send the sysex checksum and terminator:
        midi_send_sysex(0x00);
        midi_send_sysex(0x01);
        midi_axe_sysex_end(cs & (u8) 0x7F);
    }

    if (curr.sl_idx != last.sl_idx) {
        diff = 1;
    } else if (curr.pr_idx != last.pr_idx) {
        diff = 1;
    } else if (curr.sc_idx != last.sc_idx) {
        diff = 1;
    }

    if (curr.screen != last.screen) {
        diff = 1;
    }
    if (curr.selected_amp != last.selected_amp) {
        diff = 1;
    }

    // Update LCD if the state changed:
    if (diff) {
        update_lcd();
    }
}

static void lcd_amp_row(u8 a) {
    u8 i;
    near char *d;
    u8 test_fx;
    u8 row = row_amp1 + a;

    for (i = 0; i < LCD_COLS; i++) {
        lcd_rows[row][i] = "C 1a       0.0 -----"[i];
    }

    if ((amp[a].fx & fxm_acoustc) != 0) {
        // A for acoustic
        lcd_rows[row][0] = 'A';
    } else {
        // C/D for clean/dirty
        lcd_rows[row][0] = 'C' + ((amp[a].fx & fxm_dirty) != 0);
    }
    hextoa(lcd_rows[row], 3, amp_live[a].gain);
    bcdtoa(lcd_rows[row], 13, dB_bcd_lookup[amp[a].volume]);

    // Only display gate threshold if on dirty channel:
    if ((amp[a].fx & (fxm_dirty|fxm_acoustc)) == fxm_dirty) {
        // Convert gate MIDI back to dB:
        s8 gate = -((s8)(amp_live[a].gate >> (u8)1) - (s8)76);
        s8 col = ritoa(lcd_rows[row], 7, gate);
        lcd_rows[row][col] = '-';
    }

    test_fx = 1;
    d = &lcd_rows[row][15];
    for (i = 0; i < fx_count; i++, test_fx <<= 1) {
        rom near const char *name = fx_name(fx_midi_cc(a)[i]);
        const u8 lowercase_enable_mask = (~(amp[a].fx & test_fx) << (5 - i));
        u8 is_alpha_mask, c;

        c = *name;
        is_alpha_mask = (c & 0x40) >> 1;
        *d++ = (c & ~is_alpha_mask) | (is_alpha_mask & lowercase_enable_mask);
    }
}

static void lcd_fx_row(u8 a) {
    u8 i;
    near char *d;
    u8 test_fx;
    u8 row = row_amp1 + a;

    for (i = 0; i < LCD_COLS; i++) {
        lcd_rows[row][i] = "                    "[i];
    }

    test_fx = 1;
    d = &lcd_rows[row][0];
    for (i = 0; i < fx_count; i++, test_fx <<= 1) {
        rom near const char *name = fx_name(fx_midi_cc(a)[i]);
        u8 is_alpha_mask, c, j;

        // Select 0x20 or 0x00 depending on if FX disabled or enabled, respectively:
        const u8 lowercase_enable_mask = (~(amp[a].fx & test_fx) << (5 - i));

        // Uppercase enabled fx names; lowercase disabled.
        // 0x40 is used as an alpha test; this will fail for "@[\]^_`{|}~" but none of these are present in FX names.
        // 0x40 (or 0) is shifted right 1 bit to turn it into a mask for 0x20 to act as lowercase/uppercase switch.
        for (j = 0; j < 4; j++) {
            c = *name++;
            is_alpha_mask = (c & 0x40) >> 1;
            *d++ = (c & ~is_alpha_mask) | (is_alpha_mask & lowercase_enable_mask);
        }
    }
}

#ifdef HWFEAT_LABEL_UPDATES
char tmplabel[fx_count][5];
#endif

// Update LCD display:
static void update_lcd(void) {
#ifdef HWFEAT_LABEL_UPDATES
    const char **labels_top, **labels_bot;
    u8 n;
#endif
#ifdef FEAT_LCD
    s8 i;
#endif
    DEBUG_LOG0("update LCD");
#ifdef HWFEAT_LABEL_UPDATES
    labels_bot = label_row_get(0);
    labels_top = label_row_get(1);
    switch (curr.screen) {
        case SCREEN_AMP:
            labels_top[0] = "ACOU";
            labels_bot[0] = "CHANNEL";
            labels_top[1] = "GAIN--";
            labels_bot[1] = "GAIN++";
            labels_top[2] = "GATE--";
            labels_bot[2] = "GATE++";
            labels_top[3] = "VOLU--";
            labels_bot[3] = "VOLU++";
            labels_top[4] = "AMP|FX";
            labels_bot[4] = "JD|MG";
            break;
        case SCREEN_FX:
            labels_top[0] = "";
            labels_top[1] = "";
            labels_top[2] = "";
            labels_top[3] = "";
            labels_top[4] = "AMP|FX";
            labels_bot[4] = "JD|MG";
            labels_bot[0] = fx_name(fx_midi_cc(curr.selected_amp)[0]);
            labels_bot[1] = fx_name(fx_midi_cc(curr.selected_amp)[1]);
            labels_bot[2] = fx_name(fx_midi_cc(curr.selected_amp)[2]);
            labels_bot[3] = fx_name(fx_midi_cc(curr.selected_amp)[3]);
            for (n = 0; n < fx_count; n++) {
                tmplabel[n][0] = labels_bot[n][0];
                tmplabel[n][1] = labels_bot[n][1];
                tmplabel[n][2] = labels_bot[n][2];
                tmplabel[n][3] = labels_bot[n][3];
                tmplabel[n][4] = 0;
                labels_bot[n] = tmplabel[n];
            }
            break;
        case SCREEN_MIDI:
            labels_top[0] = "";
            labels_bot[0] = "";
            labels_top[1] = "";
            labels_bot[1] = "";
            labels_top[2] = "X--";
            labels_bot[2] = "X++";
            labels_top[3] = "K--";
            labels_bot[3] = "K++";
            labels_top[4] = "AMP|FX";
            labels_bot[4] = "";
            break;
    }
    labels_top[5] = "MIDI(MODE)";
    labels_bot[5] = "TAP(RESET)";
    labels_top[6] = "SONG--";
    labels_bot[6] = "SCENE--(ONE)";
    labels_top[7] = "SONG++";
    labels_bot[7] = "SCENE++";
    label_row_update(0);
    label_row_update(1);
#endif
#ifdef FEAT_LCD
    for (i = 0; i < LCD_COLS; ++i) {
        lcd_rows[row_song][i] = "                    "[i];
    }

    // Print setlist date:
    if (curr.setlist_mode == 0) {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[row_stat][i] = "X  0 K  0 S 1/96 0/0"[i];
        }

        // Show program number:
        ritoa(lcd_rows[row_stat], 12, curr.pr_idx + (u8)1);
    } else {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[row_stat][i] = "X  0 K  0 I 1/ 1 0/0"[i];
        }

        // Show setlist song index:
        ritoa(lcd_rows[row_stat], 12, curr.sl_idx + (u8)1);
        // Show setlist song count:
        ritoa(lcd_rows[row_stat], 15, sl_max + (u8)1);
    }
    // AXE-FX MIDI:
    ritoa(lcd_rows[row_stat],  3, curr.axe_midi_program + (u8)1);
    // TD-50 MIDI:
    ritoa(lcd_rows[row_stat],  8, curr.td50_midi_program + (u8)1);
    // Scene number:
    lcd_rows[row_stat][17] = h1toa(curr.sc_idx + (u8)1);
    // Scene count:
    lcd_rows[row_stat][19] = h1toa(pr.scene_count);

    // Song name:
    if (pr.name[0] == 0) {
        // Show unnamed song index:
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[row_song][i] = "__unnamed song #    "[i];
        }
        ritoa(lcd_rows[row_song], 18, curr.pr_idx + (u8)1);
    } else {
        copy_str_lcd(pr.name, lcd_rows[row_song]);
    }

    // AMP rows:
    switch (curr.screen) {
        case SCREEN_AMP:
            lcd_amp_row(0);
            lcd_amp_row(1);
            // According to http://www.newhavendisplay.com/specs/NHD-0420D3Z-NSW-BBW-V3.pdf char 127 is a left-arrow indicator:
            lcd_rows[row_amp1 + curr.selected_amp][14] = 127;
            lcd_rows[row_amp1 + 1 - curr.selected_amp][14] = 32;
            break;
        case SCREEN_FX:
            lcd_amp_row(1 - curr.selected_amp);
            lcd_fx_row(curr.selected_amp);
            break;
        case SCREEN_MIDI:
            // TODO
            break;
    }

    lcd_updated_all();
#endif
}

static void calc_leds(void) {
    switch (curr.screen) {
        case SCREEN_AMP:
            curr.leds.top.byte =
                // mask out special LEDs from footswitch state:
                (curr.fsw.top.byte & ((u8)~(M_1 | M_5 | M_6)))
                | ((amp[curr.selected_amp].fx & fxm_acoustc) >> 6)
                | ((curr.screen == SCREEN_FX) << 4)
                | ((curr.screen == SCREEN_MIDI) << 5);
            // TODO: make TAP LED blink in tempo?
            curr.leds.bot.byte =
                // mask out special LEDs from footswitch state:
                (curr.fsw.bot.byte & ((u8)~(M_1 | M_5)))
                | ((amp[curr.selected_amp].fx & fxm_dirty) >> 7)
                | ((JD - curr.selected_amp) << 4);
            break;
        case SCREEN_FX:
            curr.leds.top.byte =
                // mask out special LEDs from footswitch state:
                (curr.fsw.top.byte & ((u8)~(M_5 | M_6)))
                | ((curr.screen == SCREEN_FX) << 4)
                | ((curr.screen == SCREEN_MIDI) << 5);
            curr.leds.bot.byte = (curr.fsw.bot.byte & (u8)(0x20 | 0x40 | 0x80))
                | (amp[curr.selected_amp].fx & (fxm_1 | fxm_2 | fxm_3 | fxm_4))
                | ((JD - curr.selected_amp) << 4);
            break;
        case SCREEN_MIDI:
            curr.leds.top.byte =
                // mask out special LEDs from footswitch state:
                (curr.fsw.top.byte & ((u8)~(M_5 | M_6)))
                | ((curr.screen == SCREEN_FX) << 4)
                | ((curr.screen == SCREEN_MIDI) << 5);
            // TODO: make TAP LED blink in tempo?
            curr.leds.bot.byte = curr.fsw.bot.byte;
            break;
    }

    send_leds();
}

static void load_axe_midi(void) {
    u8 a, i;

    axe_midi = &romdata->axe_midi_programs[curr.axe_midi_program];

    // Copy in AXE-FX MIDI program information to CC lookup table:
    for (a = 0; a < 2; a++) {
        for (i = 0; i < fx_count; i++) {
            cc_lookup[(CC_AMP2 * a) + CC_FX1 + i] = axe_midi->amps[a].fx_midi_cc[i];
        }
    }
}

static void load_program(void) {
    // Load program:
    u8 pr_num;

    if (curr.setlist_mode == 1) {
        pr_num = romdata->set_list.entries[curr.sl_idx].song;
    } else {
        pr_num = curr.pr_idx;
    }

    DEBUG_LOG1("load program %d", pr_num + 1);
    pr = romdata->songs[pr_num];

    curr.axe_midi_program = pr.axe_midi_program;
    curr.td50_midi_program = pr.td50_midi_program;
    curr.tempo = pr.tempo;

    load_axe_midi();

    // Establish a sane default for an undefined program:
    curr.sc_idx = 0;
    // TODO: better define how an undefined program is detected.
    // For now the heuristic is if an amp's volume is non-zero. A properly initialized amp will likely
    // have a value near `volume_0dB` (98).
    if (pr.scene[0].amp[1].volume == 0) {
        scene_default();
    }

    // Trigger a scene reload:
    //last.sc_idx = ~curr.sc_idx;
}

static void load_scene(void) {
    DEBUG_LOG1("load scene %d", curr.sc_idx + 1);

    // Detect if scene is uninitialized:
    if ((pr.scene[curr.sc_idx].amp[0].gain == 0) && (pr.scene[curr.sc_idx].amp[0].volume == 0) &&
        (pr.scene[curr.sc_idx].amp[1].gain == 0) && (pr.scene[curr.sc_idx].amp[1].volume == 0)) {
        pr.scene[curr.sc_idx] = pr.scene[curr.sc_idx-1];
    }

    // Copy new scene settings into current state:
    amp[0] = pr.scene[curr.sc_idx].amp[0];
    amp[1] = pr.scene[curr.sc_idx].amp[1];
}

static void scene_default(void) {
    DEBUG_LOG1("default scene %d", curr.sc_idx + 1);

    // Set defaults for both amps:
    pr.amp_defaults.dirty_gain = 0x5E;
    pr.amp_defaults.clean_gain = 0x1A;
    pr.amp_defaults.gate = gate_default;

    pr.scene_count = 1;

    pr.scene[curr.sc_idx].amp[0].gain = 0;
    pr.scene[curr.sc_idx].amp[0].gate = 0;
    pr.scene[curr.sc_idx].amp[0].fx = fxm_dirty;
    pr.scene[curr.sc_idx].amp[0].volume = volume_0dB;

    pr.scene[curr.sc_idx].amp[1].gain = 0;
    pr.scene[curr.sc_idx].amp[1].gate = 0;
    pr.scene[curr.sc_idx].amp[1].fx = fxm_dirty;
    pr.scene[curr.sc_idx].amp[1].volume = volume_0dB;
}

static void toggle_setlist_mode(void) {
    DEBUG_LOG0("change setlist mode");
    curr.setlist_mode ^= (u8)1;
    if (curr.setlist_mode == 1) {
        // Remap sl_idx by looking up program in setlist otherwise default to first setlist entry:
        u8 i;
        sl_max = romdata->set_list.count - (u8)1;
        curr.sl_idx = 0;
        for (i = 0; i < romdata->set_list.count; i++) {
            if (romdata->set_list.entries[i].song == curr.pr_idx) {
                curr.sl_idx = i;
                break;
            }
        }
    } else {
        // Lookup program number from setlist:
        sl_max = 127;
        curr.pr_idx = romdata->set_list.entries[curr.sl_idx].song;
    }
}

static void midi_reset_cc(void) {
    u8 i;

    DEBUG_LOG0("reset MIDI CC state");

    // Forget last-sent CC state:
    for (i = 0; i < CC_AMP2; i++) {
        // Since MIDI values are 7-bit, 0xff here is a value that will never be legitimately sent:
        cc_sent[i] = 0xff;
        cc_sent[CC_AMP2 + i] = 0xff;
    }
}

static void midi_invalidate(void) {
    // Invalidate all current MIDI state so it gets re-sent at end of loop:
    DEBUG_LOG0("invalidate MIDI state");

    last.axe_midi_program = ~curr.axe_midi_program;
    last.td50_midi_program = ~curr.td50_midi_program;
    last.tempo = ~curr.tempo;

    midi_reset_cc();
}

static void next_song(void) {
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

static void prev_song(void) {
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

static void next_scene(void) {
    if (curr.sc_idx < scene_count_max - 1) {
        DEBUG_LOG0("next scene");
        curr.sc_idx++;
    }
}

static void reset_scene(void) {
    DEBUG_LOG0("reset scene");
    curr.sc_idx = 0;
}

static void prev_scene(void) {
    if (curr.sc_idx > 0) {
        DEBUG_LOG0("prev scene");
        curr.sc_idx--;
    }
}

#define min(a,b) (a < b ? a : b)
#define max(a,b) (a > b ? a : b)

// set the controller to an initial state
void controller_init(void) {
    u8 i;

    // Initialize romdata pointer:
    romdata = (rom near struct romdata *)flash_addr(0);

    for (i = 0; i < 2; i++) {
        cc_lookup[CC_AMP2 * i + CC_FX1] = 0xFF;
        cc_lookup[CC_AMP2 * i + CC_FX2] = 0xFF;
        cc_lookup[CC_AMP2 * i + CC_FX3] = 0xFF;
        cc_lookup[CC_AMP2 * i + CC_FX4] = 0xFF;
        cc_lookup[CC_AMP2 * i + CC_FX5] = 0xFF;

        cc_lookup[CC_AMP2 * i + CC_VOLUME] = axe_cc_external1 + i;
        cc_lookup[CC_AMP2 * i + CC_GAIN] = axe_cc_external3 + i;
        cc_lookup[CC_AMP2 * i + CC_GATE] = axe_cc_external5 + i;
        cc_lookup[CC_AMP2 * i + CC_GATE_BYP] = axe_cc_byp_gate1 + i;
        cc_lookup[CC_AMP2 * i + CC_AMP_BYP] = axe_cc_byp_amp1 + i;
        cc_lookup[CC_AMP2 * i + CC_AMP_XY] = axe_cc_xy_amp1 + i;
        cc_lookup[CC_AMP2 * i + CC_CAB_XY] = axe_cc_xy_cab1 + i;
    }

    tap = 0;

    curr.screen = SCREEN_AMP;
    curr.selected_amp = JD;
    last.screen = SCREEN_FX;
    last.selected_amp = MG;

    last.leds.bot.byte = 0xFF;
    last.leds.top.byte = 0xFF;
    curr.leds.bot.byte = 0x00;
    curr.leds.top.byte = 0x00;

    last.setlist_mode = 1;
    curr.setlist_mode = 1;

    sl_max = romdata->set_list.count - (u8)1;

    for (i = 0; i < 2; i++) {
        amp[i].gain = 0;
        amp[i].gate = 0;
    }

    // Load first program in setlist:
    curr.sl_idx = 0;
    curr.pr_idx = 0;
    last.sl_idx = 0;
    last.pr_idx = 0;
    last.axe_midi_program = 0x7F;
    last.tempo = 0;
    load_program();
    load_scene();
    last.sc_idx = curr.sc_idx;

    for (i = 0; i < 2; i++) {
        // Copy current scene settings into state:
        amp[i] = pr.scene[curr.sc_idx].amp[i];
    }

    // Force MIDI changes on init:
    midi_invalidate();

#ifdef FEAT_LCD
    for (i = 0; i < LCD_ROWS; ++i)
        lcd_rows[i] = lcd_row_get(i);
#if 0
    for (i = 0; i < LCD_COLS; ++i) {
        lcd_rows[row_amp1][i] = "                    "[i];
        lcd_rows[row_amp2][i] = "                    "[i];
        lcd_rows[row_stat][i] = "                    "[i];
        lcd_rows[row_song][i] = "                    "[i];
    }
#endif
#endif
}

#pragma udata timers
struct timers {
    //u8 top_1;
    u8 top_2;
    u8 top_3;
    u8 top_4;
    //u8 top_5;
    u8 top_6;
    u8 top_7;
    u8 top_8;
    //u8 bot_1;
    u8 bot_2;
    u8 bot_3;
    u8 bot_4;
    //u8 bot_5;
    u8 bot_6;
    u8 bot_7;
    u8 bot_8;
    u8 retrigger;
} timers;
#pragma udata

static void vol_dec(u8 ampno) {
    u8 volume = (amp[ampno].volume);
    if (volume > (u8)0) {
        volume--;
        amp[ampno].volume = volume;
    }
}

static void vol_inc(u8 ampno) {
    u8 volume = (amp[ampno].volume);
    if (volume < (u8)127) {
        volume++;
        amp[ampno].volume = volume;
    }
}

static void gain_dec(u8 ampno) {
    u8 *gain;
    if ((amp[ampno].fx & (fxm_dirty | fxm_acoustc)) == fxm_dirty) {
        if (amp[ampno].gain != 0) {
            gain = &amp[ampno].gain;
        } else {
            gain = &pr.amp_defaults.dirty_gain;
            if (*gain == 0) { *gain = axe_midi->amp_defaults.dirty_gain; }
        }
    } else {
        gain = &pr.amp_defaults.clean_gain;
        if (*gain == 0) { *gain = axe_midi->amp_defaults.clean_gain; }
    }
    if ((*gain) > (u8)1) {
        (*gain)--;
    }
}

static void gain_inc(u8 ampno) {
    u8 *gain;
    if ((amp[ampno].fx & (fxm_dirty | fxm_acoustc)) == fxm_dirty) {
        if (amp[ampno].gain != 0) {
            gain = &amp[ampno].gain;
        } else {
            gain = &pr.amp_defaults.dirty_gain;
            if (*gain == 0) { *gain = axe_midi->amp_defaults.dirty_gain; }
        }
    } else {
        gain = &pr.amp_defaults.clean_gain;
        if (*gain == 0) { *gain = axe_midi->amp_defaults.clean_gain; }
    }
    if ((*gain) < (u8)127) {
        (*gain)++;
    }
}

static void gate_dec(u8 ampno) {
    u8 *gate;
    if (amp[ampno].gate != 0) {
        gate = &amp[ampno].gate;
    } else {
        gate = &pr.amp_defaults.gate;
        if (*gate == 0) { *gate = axe_midi->amp_defaults.gate; }
    }
    if ((*gate) > (u8)1) {
        (*gate)--;
    }
}

static void gate_inc(u8 ampno) {
    u8 *gate;
    if (amp[ampno].gate != 0) {
        gate = &amp[ampno].gate;
    } else {
        gate = &pr.amp_defaults.gate;
        if (*gate == 0) { *gate = axe_midi->amp_defaults.gate; }
    }
    if ((*gate) < (u8)127) {
        (*gate)++;
    }
}

static void bounded_dec(u8 *value, u8 min) {
    if ((*value) > min) {
        (*value)--;
    }
}

static void bounded_inc(u8 *value, u8 max) {
    if ((*value) < max) {
        (*value)++;
    }
}

// called every 10ms
void controller_10msec_timer(void) {
#define one_shot(row,n,max,op_func) \
    if (is_##row##_button_held(M_##n) && ((timers.row##_##n & (u8)0x80) != 0)) { \
        /* Increment and cap timer to 0x7F: */ \
        if ((timers.row##_##n & (u8)0x7F) < (u8)max) { \
            timers.row##_##n = (timers.row##_##n & (u8)0x80) | ((timers.row##_##n & (u8)0x7F) + (u8)1); \
            if ((timers.row##_##n & (u8)0x7F) == (u8)max) { \
                timers.row##_##n = (u8)0x00; \
                op_func; \
            } \
        } \
    }

#define repeater(row,n,min,mask,op_func) \
    if (is_##row##_button_held(M_##n)) { \
        if (((timers.row##_##n & (u8)0x80) != (u8)0) && ((timers.row##_##n & (u8)0x3F) >= (u8)min)) { \
            timers.row##_##n |= (u8)0x40; \
        } \
        if (((timers.row##_##n & (u8)0x40) != (u8)0) && ((timers.row##_##n & (u8)mask) == (u8)0)) { \
            op_func; \
        } \
        if ((timers.row##_##n & (u8)0xC0) != (u8)0) { \
            timers.row##_##n = (timers.row##_##n & (u8)0xC0) | (((timers.row##_##n & (u8)0x3F) + (u8)1) & (u8)0x3F); \
        } \
    }

    // on timer:
    switch (curr.screen) {
        case SCREEN_AMP:
            repeater(top,2,0x18,0x03,gain_dec(curr.selected_amp))
            repeater(bot,2,0x18,0x03,gain_inc(curr.selected_amp))
            repeater(top,3,0x18,0x03,gate_dec(curr.selected_amp))
            repeater(bot,3,0x18,0x03,gate_inc(curr.selected_amp))
            repeater(top,4,0x18,0x03,vol_dec(curr.selected_amp))
            repeater(bot,4,0x18,0x03,vol_inc(curr.selected_amp))
            break;
        case SCREEN_FX:
            break;
        case SCREEN_MIDI:
            repeater(top,3,0x18,0x03,bounded_dec(&curr.axe_midi_program, 0))
            repeater(bot,3,0x18,0x03,bounded_inc(&curr.axe_midi_program, max_axe_midi_program_count-1))
            repeater(top,4,0x18,0x03,bounded_dec(&curr.td50_midi_program, 0))
            repeater(bot,4,0x18,0x03,bounded_inc(&curr.td50_midi_program, 127))
            break;
    }

    one_shot(top,6,0x3F,toggle_setlist_mode())
    one_shot(bot,6,0x1F,midi_invalidate())
    repeater(top,7,0x20,0x07,prev_song())
    repeater(top,8,0x20,0x07,next_song())

    one_shot(bot,7,0x3F,reset_scene())

#undef repeater
#undef one_shot

    if (timers.retrigger != 0) {
        if (timers.retrigger < 0x1F) {
            timers.retrigger++;
        } else {
            timers.retrigger = 0;
        }
    }
}

// main control loop
void controller_handle(void) {
    // poll foot-switch depression status:
    u16 tmp = fsw_poll();
    curr.fsw.bot.byte = (u8)(tmp & (u8)0xFF);
    curr.fsw.top.byte = (u8)((tmp >> (u8)8) & (u8)0xFF);

#define btn_pressed(row, n, on_press) \
    if (is_##row##_button_pressed(M_##n)) { \
        on_press; \
    }

#define btn_released_repeater(row, n, on_release) \
        if (is_##row##_button_pressed(M_##n)) { \
            timers.row##_##n = (u8)0x80; \
        } else if (is_##row##_button_released(M_##n)) { \
            if ((timers.row##_##n & (u8)0x40) == 0) { \
                on_release; \
            } \
            timers.row##_##n = (u8)0x00; \
        }

#define btn_released_oneshot(row, n, on_release) \
        if (is_##row##_button_pressed(M_##n)) { \
            timers.row##_##n = (u8)0x80; \
        } else if (is_##row##_button_released(M_##n)) { \
            if ((timers.row##_##n & (u8)0x80) != 0) { \
                on_release; \
            } \
            timers.row##_##n = (u8)0x00; \
        }

#define btn_pressed_oneshot(row, n, on_pressed) \
        if (is_##row##_button_pressed(M_##n)) { \
            timers.row##_##n = (u8)0x80; \
            on_pressed; \
        } else if (is_##row##_button_released(M_##n)) { \
            timers.row##_##n = (u8)0x00; \
        }


    switch (curr.screen) {
        case SCREEN_AMP:
            btn_pressed(top, 1, amp[curr.selected_amp].fx ^= fxm_acoustc)
            btn_pressed(bot, 1, amp[curr.selected_amp].fx ^= fxm_dirty)
            btn_released_repeater(top, 2, gain_dec(curr.selected_amp))
            btn_released_repeater(bot, 2, gain_inc(curr.selected_amp))
            btn_released_repeater(top, 3, gate_dec(curr.selected_amp))
            btn_released_repeater(bot, 3, gate_inc(curr.selected_amp))
            btn_released_repeater(top, 4, vol_dec(curr.selected_amp))
            btn_released_repeater(bot, 4, vol_inc(curr.selected_amp))
            btn_pressed(top, 5, curr.screen = (curr.screen & 1) ^ 1)
            btn_pressed(bot, 5, curr.selected_amp ^= JD)
            break;
        case SCREEN_FX:
            btn_pressed(bot, 1, amp[curr.selected_amp].fx ^= fxm_1)
            btn_pressed(bot, 2, amp[curr.selected_amp].fx ^= fxm_2)
            btn_pressed(bot, 3, amp[curr.selected_amp].fx ^= fxm_3)
            btn_pressed(bot, 4, amp[curr.selected_amp].fx ^= fxm_4)
            btn_pressed(top, 5, curr.screen = (curr.screen & 1) ^ 1)
            btn_pressed(bot, 5, curr.selected_amp ^= JD)
            break;
        case SCREEN_MIDI:
            btn_released_repeater(top, 3, bounded_dec(&curr.axe_midi_program, 0))
            btn_released_repeater(bot, 3, bounded_inc(&curr.axe_midi_program, max_axe_midi_program_count-1))
            btn_released_repeater(top, 4, bounded_dec(&curr.td50_midi_program, 0))
            btn_released_repeater(bot, 4, bounded_inc(&curr.td50_midi_program, 127))
            btn_pressed(top, 5, curr.screen = (curr.screen & 1) ^ 1)
            break;
    }

    btn_released_oneshot(top, 6, curr.screen = (curr.screen & 2) ^ 2)

    // TAP:
    if (is_bot_button_pressed(M_6)) {
        timers.bot_6 = (u8)0x80;

        // Toggle TAP CC value between 0x00 and 0x7F:
        tap ^= (u8)0x7F;
        midi_send_cmd2(0xB, axe_midi_channel, axe_cc_taptempo, tap);
    } else if (is_bot_button_pressed(M_6)) {
        timers.bot_6 = (u8)0x00;
    }

#define on_retrigger(action) \
    if (timers.retrigger == 0) { \
        action; \
        timers.retrigger = 1; \
    }

    // PREV SCENE:
    btn_pressed_oneshot(bot,7,on_retrigger(prev_scene()))

    // NEXT SCENE:
    btn_pressed_oneshot(bot,8,on_retrigger(next_scene()))


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
        load_program();
        load_scene();
    } else if (curr.sc_idx != last.sc_idx) {
        // Store last state into program for recall:
        pr.scene[last.sc_idx].amp[0] = amp[0];
        pr.scene[last.sc_idx].amp[1] = amp[1];

        load_scene();
    }

    calc_midi();
    calc_leds();

    // Record the previous state:
    last = curr;
}

#else

typedef int nothing5;

#endif
