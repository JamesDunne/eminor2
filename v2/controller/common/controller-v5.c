/*
    Programmable e-minor MIDI foot controller v2.

    Currently designed to work with:
        Axe-FX II (MIDI channel 3)

    Written by
    James S. Dunne
    https://github.com/JamesDunne/
    2017-09-21

    Axe-FX:
    + Split stereo cab block into two mono blocks; CAB1 pan L, CAB2 pan R
    + Try to remove pre-cab PEQ; merge curve with post-cab PEQ
    + Post-cab PEQ handles stereo out of CABs
    + Amp X/Y for dirty/clean (disable for acoustic)
    + Cab X/Y for electric/acoustic

    Controller:
    Amp control row:
    * 1 clean/dirty toggle, hold for acoustic (switches XY for amp and cab, maybe PEQ)
    * 2 volume dec, hold for 0dB
    * 3 volume inc, hold for +6dB
    * 4 gain dec, hold for song default
    * 5 gain inc
    * 6 switch to fx controls for row
    * 7,8 unchanged = prev/next song or scene
    FX row
    * 1 pitch
    * 2 custom, store MIDI CC
    * 3 custom, store MIDI CC
    * 4 chorus
    * 5 delay
    * 6 switch to amp controls for row

TODO: adjust MIDI program # per song
TODO: adjust tempo per song

AMP controls:
|------------------------------------------------------------|
|     *      *      *      *      *      *      *      *     |          /--------------------\
|  CLN|DRV GAIN-- GAIN++ VOL--  VOL++   FX    PR_PRV PR_NXT  |          |Beautiful_Disaster_*|
|  ACOUSTC                             RESET                 |          |Sng 62/62  Scn  1/10|
|                                                            |    LCD:  |C g=58 v=-99.9 P12CD|
|     *      *      *      *      *      *      *      *     |          |D g=5E v=  0.0 -1---|
|  CLN|DRV GAIN-- GAIN++ VOL--  VOL++   FX    SC_PRV SC_NXT  |          \--------------------/
|  ACOUSTC                             RESET   MODE  SC_ONE  |
|------------------------------------------------------------|

Press CLN|DRV to toggle clean vs overdrive mode (clean:    AMP -> Y, CAB -> X, gain -> 0x5E; dirty: AMP -> X, CAB -> X, gain -> n)
Hold  ACOUSTC to switch to acoustic emulation   (acoustic: AMP -> bypass, CAB -> Y, gain -> 0x5E)

Hold  VOL--   to decrease volume slowly
Hold  VOL++   to increase volume slowly

Hold  GAIN--  to decrease gain slowly
Hold  GAIN++  to increase gain slowly

Press FX      to switch row to FX mode

Hold  RESET   to resend MIDI state for amp

Press PR_PRV  to select previous song or program depending on MODE
Press PR_NXT  to select next song or program depending on MODE

Press MODE    to switch between set-list order and program # order

Press SC_NXT  to advance to next scene, move to next song scene 1 if at end
Hold  SC_ONE  to reset scene to 1 on current song

FX controls:
|------------------------------------------------------------|    
|     *      *      *      *      *      *      *      *     |          /--------------------\
|    FX1    FX2    FX3   CHORUS DELAY   AMP   PR_PRV PR_NXT  |          |What_I_Got_________*|
|   SELECT SELECT SELECT                                     |          |Sng 62/62  Scn  2/ 3|
|                                                            |    LCD:  |PIT1ROT1FIL1CHO1DLY1|
|     *      *      *      *      *      *      *      *     |          |A g=5E v=  6.0 ---CD|
|  CLN|DRV GAIN-- GAIN++ VOL--  VOL++   FX     MODE  SC_NXT  |          \--------------------/
|  ACOUSTC                             RESET         SC_ONE  |
|------------------------------------------------------------|

Press AMP to switch row to AMP mode

*/

#if HW_VERSION == 5

#include "util.h"

#include "program-v5.h"
#include "hardware.h"

// Hard-coded MIDI channel #s:
#define gmaj_midi_channel    0
#define rjm_midi_channel     1
#define axe_midi_channel     2
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
char *lcd_rows[LCD_ROWS];
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
// Tap tempo CC value (toggles between 0x00 and 0x7F):
u8 tap;

// Current mode:
u8 mode;
// LED state per mode:
io16 mode_leds[MODE_count];

// Max program #:
u8 sl_max;
// Pointer to unmodified program:
rom struct program *origpr;

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
    // Current MIDI program #:
    u8 midi_program;
    // Current tempo (bpm):
    u8 tempo;

    // Amp definitions:
    struct amp amp[2];

    // Each row's current state:
    struct {
        enum rowstate_mode  mode;
        u8                  fx;
    } rowstate[2];

    // Whether current program is modified in any way:
    u8 modified;
};

// Current and last state:
struct state curr, last;
struct {
    u8 amp_byp, amp_xy, cab_xy, gain, clean_gain, gate;
} last_amp[2];
#pragma udata

// Loaded setlist:
#pragma udata program
struct set_list sl;
// Loaded program:
struct program pr;
#pragma udata

// BCD-encoded dB value table (from PIC/v4_lookup.h):
#pragma udata bcd
extern rom const u16 dB_bcd_lookup[128];
#pragma udata

// Set Axe-FX CC value
#define midi_axe_cc(cc, val) midi_send_cmd2(0xB, axe_midi_channel, cc, val)
#define midi_axe_pc(program) midi_send_cmd1(0xC, axe_midi_channel, program)
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

static void toggle_setlist_mode(void);

//static void tap_tempo(void);

static void scene_default(void);

static void reset_scene(void);

// (enable == 0 ? (u8)0 : (u8)0x7F)
#define calc_cc_toggle(enable) \
    ((u8) -((s8)(enable)) >> (u8)1)

#define or_default(a, b) (a == 0 ? b : a)

// MIDI is sent at a fixed 3,125 bytes/sec transfer rate; 56 bytes takes 175ms to complete.
// calculate the difference from last MIDI state to current MIDI state and send the difference as MIDI commands:
static void calc_midi(void) {
    u8 diff = 0;
    u8 dirty, last_dirty;
    u8 acoustc, last_acoustc;
    u8 test_fx = 1;
    u8 i, a;

    // Send MIDI program change:
    if (curr.midi_program != last.midi_program) {
        DEBUG_LOG1("MIDI change program %d", curr.midi_program);
        midi_axe_pc(curr.midi_program);
        // All bets are off as to what state when changing program:
        midi_invalidate();
    }

    if (curr.setlist_mode != last.setlist_mode) {
        diff = 1;
    }

    // Send controller changes per amp:
    for (a = 0; a < 2; a++) {
        dirty = curr.amp[a].fx & fxm_dirty;
        acoustc = curr.amp[a].fx & fxm_acoustc;
        last_dirty = last.amp[a].fx & fxm_dirty;
        last_acoustc = last.amp[a].fx & fxm_acoustc;

        if (acoustc != 0) {
            // acoustic:
            if (last_amp[a].amp_byp != 0x00) {
                last_amp[a].amp_byp = 0x00;
                DEBUG_LOG1("AMP%d off", a + 1);
                midi_axe_cc(axe_cc_byp_amp1 + a, last_amp[a].amp_byp);
                diff = 1;
            }
            if (last_amp[a].cab_xy != 0x00) {
                last_amp[a].cab_xy = 0x00;
                DEBUG_LOG1("CAB%d Y", a + 1);
                midi_axe_cc(axe_cc_xy_cab1 + a, last_amp[a].cab_xy);
                diff = 1;
            }
            if (last_amp[a].gain != last_amp[a].clean_gain) {
                last_amp[a].gain = last_amp[a].clean_gain;
                DEBUG_LOG2("Gain%d 0x%02x", a + 1, last_amp[a].gain);
                midi_axe_cc(axe_cc_external3 + a, last_amp[a].gain);
                diff = 1;
            }
            if (last_amp[a].gate != 0x00) {
                last_amp[a].gate = 0x00;
                DEBUG_LOG1("Gate%d off", a + 1);
                midi_axe_cc(axe_cc_byp_gate1 + a, last_amp[a].gate);
                diff = 1;
            }
        } else if (dirty != 0) {
            // dirty:
            u8 gain = or_default(curr.amp[a].gain, pr.default_gain[a]);
            if (last_amp[a].amp_byp != 0x7F) {
                last_amp[a].amp_byp = 0x7F;
                DEBUG_LOG1("AMP%d on", a + 1);
                midi_axe_cc(axe_cc_byp_amp1 + a, last_amp[a].amp_byp);
                diff = 1;
            }
            if (last_amp[a].amp_xy != 0x7F) {
                last_amp[a].amp_xy = 0x7F;
                DEBUG_LOG1("AMP%d X", a + 1);
                midi_axe_cc(axe_cc_xy_amp1 + a, last_amp[a].amp_xy);
                diff = 1;
            }
            if (last_amp[a].cab_xy != 0x7F) {
                last_amp[a].cab_xy = 0x7F;
                DEBUG_LOG1("CAB%d X", a + 1);
                midi_axe_cc(axe_cc_xy_cab1 + a, last_amp[a].cab_xy);
                diff = 1;
            }
            if (last_amp[a].gain != gain) {
                last_amp[a].gain = gain;
                DEBUG_LOG2("Gain%d 0x%02x", a + 1, last_amp[a].gain);
                midi_axe_cc(axe_cc_external3 + a, last_amp[a].gain);
                diff = 1;
            }
            if (last_amp[a].gate != 0x7F) {
                last_amp[a].gate = 0x7F;
                DEBUG_LOG1("Gate%d on", a + 1);
                midi_axe_cc(axe_cc_byp_gate1 + a, last_amp[a].gate);
                diff = 1;
            }
        } else {
            // clean:
            if (last_amp[a].amp_byp != 0x7F) {
                last_amp[a].amp_byp = 0x7F;
                DEBUG_LOG1("AMP%d on", a + 1);
                midi_axe_cc(axe_cc_byp_amp1 + a, last_amp[a].amp_byp);
                diff = 1;
            }
            if (last_amp[a].amp_xy != 0x00) {
                last_amp[a].amp_xy = 0x00;
                DEBUG_LOG1("AMP%d Y", a + 1);
                midi_axe_cc(axe_cc_xy_amp1 + a, last_amp[a].amp_xy);
                diff = 1;
            }
            if (last_amp[a].cab_xy != 0x7F) {
                last_amp[a].cab_xy = 0x7F;
                DEBUG_LOG1("CAB%d X", a + 1);
                midi_axe_cc(axe_cc_xy_cab1 + a, last_amp[a].cab_xy);
                diff = 1;
            }
            if (last_amp[a].gain != last_amp[a].clean_gain) {
                last_amp[a].gain = last_amp[a].clean_gain;
                DEBUG_LOG2("Gain%d 0x%02x", a + 1, last_amp[a].gain);
                midi_axe_cc(axe_cc_external3 + a, last_amp[a].gain);
                diff = 1;
            }
            if (last_amp[a].gate != 0x00) {
                last_amp[a].gate = 0x00;
                DEBUG_LOG1("Gate%d off", a + 1);
                midi_axe_cc(axe_cc_byp_gate1 + a, last_amp[a].gate);
                diff = 1;
            }
        }

        if ((last_acoustc | last_dirty) != (acoustc | dirty)) {
            // Always compressor on:
            DEBUG_LOG1("Comp%d on", a + 1);
            midi_axe_cc(axe_cc_byp_compressor1 + a, 0x7F);
        }

        // Update volumes:
        if (curr.amp[a].volume != last.amp[a].volume) {
            DEBUG_LOG2("MIDI set AMP%d volume = %s", a + 1, bcd(dB_bcd_lookup[curr.amp[a].volume]));
            midi_axe_cc(axe_cc_external1 + a, (curr.amp[a].volume));
            diff = 1;
        }
    }

    // Send FX state:
    for (i = 0; i < 5; i++, test_fx <<= 1) {
        if ((curr.amp[0].fx & test_fx) != (last.amp[0].fx & test_fx)) {
            DEBUG_LOG2("MIDI set AMP1 %.4s %s", fx_name(pr.fx_midi_cc[0][i]), (curr.amp[0].fx & test_fx) == 0 ? "off" : "on");
            midi_axe_cc(pr.fx_midi_cc[0][i], calc_cc_toggle(curr.amp[0].fx & test_fx));
            diff = 1;
        }
        if ((curr.amp[1].fx & test_fx) != (last.amp[1].fx & test_fx)) {
            DEBUG_LOG2("MIDI set AMP2 %.4s %s", fx_name(pr.fx_midi_cc[1][i]), (curr.amp[1].fx & test_fx) == 0 ? "off" : "on");
            midi_axe_cc(pr.fx_midi_cc[1][i], calc_cc_toggle(curr.amp[1].fx & test_fx));
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

    if (curr.amp[0].fx != last.amp[0].fx) {
        diff = 1;
    }
    if (curr.amp[1].fx != last.amp[1].fx) {
        diff = 1;
    }

    if (curr.sl_idx != last.sl_idx) {
        diff = 1;
    } else if (curr.pr_idx != last.pr_idx) {
        diff = 1;
    } else if (curr.sc_idx != last.sc_idx) {
        diff = 1;
    }

    if (curr.rowstate[0].mode != last.rowstate[0].mode) {
        diff = 1;
    }
    if (curr.rowstate[1].mode != last.rowstate[1].mode) {
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

#ifdef HWFEAT_LABEL_UPDATES
char tmplabel[5][5];
#endif

// Update LCD display:
static void update_lcd(void) {
#ifdef HWFEAT_LABEL_UPDATES
    const char **labels;
    u8 n;
#endif
#ifdef FEAT_LCD
    s8 i;
    u8 test_fx;
    char *d;
#endif
    DEBUG_LOG0("update LCD");
#ifdef HWFEAT_LABEL_UPDATES
    // Top row:
    labels = label_row_get(1);
    switch (curr.rowstate[0].mode) {
        case ROWMODE_AMP:
            labels[0] = "CLN/DRV|AC";
            labels[1] = "GAIN--";
            labels[2] = "GAIN++";
            labels[3] = "VOL--";
            labels[4] = "VOL++";
            labels[5] = "FX|RESET";
            break;
        case ROWMODE_FX:
            labels[0] = fx_name(pr.fx_midi_cc[0][0]);
            labels[1] = fx_name(pr.fx_midi_cc[0][1]);
            labels[2] = fx_name(pr.fx_midi_cc[0][2]);
            labels[3] = fx_name(pr.fx_midi_cc[0][3]);
            labels[4] = fx_name(pr.fx_midi_cc[0][4]);
            for (n = 0; n < 5; n++) {
                tmplabel[n][0] = labels[n][0];
                tmplabel[n][1] = labels[n][1];
                tmplabel[n][2] = labels[n][2];
                tmplabel[n][3] = labels[n][3];
                tmplabel[n][4] = 0;
                labels[n] = tmplabel[n];
            }
            labels[5] = "FX|RESET";
            break;
    }
    labels[6] = "SONG--";
    labels[7] = "SONG++";
    label_row_update(1);

    // Bottom row:
    labels = label_row_get(0);
    switch (curr.rowstate[1].mode) {
        case ROWMODE_AMP:
            labels[0] = "CLN/DRV|AC";
            labels[1] = "GAIN--";
            labels[2] = "GAIN++";
            labels[3] = "VOL--";
            labels[4] = "VOL++";
            labels[5] = "FX|RESET";
            break;
        case ROWMODE_FX:
            labels[0] = fx_name(pr.fx_midi_cc[1][0]);
            labels[1] = fx_name(pr.fx_midi_cc[1][1]);
            labels[2] = fx_name(pr.fx_midi_cc[1][2]);
            labels[3] = fx_name(pr.fx_midi_cc[1][3]);
            labels[4] = fx_name(pr.fx_midi_cc[1][4]);
            for (n = 0; n < 5; n++) {
                tmplabel[n][0] = labels[n][0];
                tmplabel[n][1] = labels[n][1];
                tmplabel[n][2] = labels[n][2];
                tmplabel[n][3] = labels[n][3];
                tmplabel[n][4] = 0;
                labels[n] = tmplabel[n];
            }
            labels[5] = "FX|RESET";
            break;
    }
    labels[6] = "TAP|MODE";
    labels[7] = "SCENE++|1";
    label_row_update(0);
#endif
#ifdef FEAT_LCD
    for (i = 0; i < LCD_COLS; ++i) {
        lcd_rows[row_song][i] = "                    "[i];
        lcd_rows[row_stat][i] = "                    "[i];
    }

    // Print setlist date:
    if (curr.setlist_mode == 0) {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[row_stat][i] = "Prg  0/128 Scn  0/ 0"[i];
        }

        // Show program number:
        ritoa(lcd_rows[row_stat], 5, curr.pr_idx + (u8)1);
    } else {
        for (i = 0; i < LCD_COLS; i++) {
            lcd_rows[row_stat][i] = "Sng  0/ 0  Scn  0/ 0"[i];
        }

        // Show setlist song index:
        ritoa(lcd_rows[row_stat], 5, curr.sl_idx + (u8)1);
        // Show setlist song count:
        ritoa(lcd_rows[row_stat], 8, sl_max + (u8)1);
    }
    // Scene number:
    ritoa(lcd_rows[row_stat], 16, curr.sc_idx + (u8)1);
    // Scene count:
    ritoa(lcd_rows[row_stat], 19, pr.scene_count);

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
    // Set modified bit:
    if (curr.modified) {
        lcd_rows[row_song][19] = '*';
    }

    // AMP1:
    switch (curr.rowstate[0].mode) {
        case ROWMODE_AMP:
            for (i = 0; i < LCD_COLS; i++) {
                lcd_rows[row_amp1][i] = "1C g 0  v  0.0 -----"[i];
            }

            if ((curr.amp[0].fx & fxm_acoustc) != 0) {
                // A for acoustic
                lcd_rows[row_amp1][1] = 'A';
            } else {
                // C/D for clean/dirty
                lcd_rows[row_amp1][1] = 'C' + ((curr.amp[0].fx & fxm_dirty) != 0);
            }
            hextoa(lcd_rows[row_amp1], 5, last_amp[0].gain);
            bcdtoa(lcd_rows[row_amp1], 13, dB_bcd_lookup[curr.amp[0].volume]);

            test_fx = 1;
            d = &lcd_rows[row_amp1][15];
            for (i = 0; i < 5; i++, test_fx <<= 1) {
                rom const char *name = fx_name(pr.fx_midi_cc[0][i]);
                const u8 lowercase_enable_mask = (~(curr.amp[0].fx & test_fx) << (5 - i));
                u8 is_alpha_mask, c;

                c = *name;
                is_alpha_mask = (c & 0x40) >> 1;
                *d++ = (c & ~is_alpha_mask) | (is_alpha_mask & lowercase_enable_mask);
            }
            break;
        case ROWMODE_FX:
            for (i = 0; i < LCD_COLS; i++) {
                lcd_rows[row_amp1][i] = "                    "[i];
            }
            test_fx = 1;
            d = &lcd_rows[row_amp1][0];
            for (i = 0; i < 5; i++, test_fx <<= 1) {
                rom const char *name = fx_name(pr.fx_midi_cc[0][i]);
                u8 is_alpha_mask, c, j;

                // Select 0x20 or 0x00 depending on if FX disabled or enabled, respectively:
                const u8 lowercase_enable_mask = (~(curr.amp[0].fx & test_fx) << (5 - i));

                // Uppercase enabled fx names; lowercase disabled.
                // 0x40 is used as an alpha test; this will fail for "@[\]^_`{|}~" but none of these are present in FX names.
                // 0x40 (or 0) is shifted right 1 bit to turn it into a mask for 0x20 to act as lowercase/uppercase switch.
                for (j = 0; j < 4; j++) {
                    c = *name++;
                    is_alpha_mask = (c & 0x40) >> 1;
                    *d++ = (c & ~is_alpha_mask) | (is_alpha_mask & lowercase_enable_mask);
                }
            }
            break;
    }

    // AMP2:
    switch (curr.rowstate[1].mode) {
        case ROWMODE_AMP:
            for (i = 0; i < LCD_COLS; i++) {
                lcd_rows[row_amp2][i] = "2C g 0  v  0.0 -----"[i];
            }

            if ((curr.amp[1].fx & fxm_acoustc) != 0) {
                // A for acoustic
                lcd_rows[row_amp2][1] = 'A';
            } else {
                // C/D for clean/dirty
                lcd_rows[row_amp2][1] = 'C' + ((curr.amp[1].fx & fxm_dirty) != 0);
            }
            hextoa(lcd_rows[row_amp2], 5, last_amp[1].gain);
            bcdtoa(lcd_rows[row_amp2], 13, dB_bcd_lookup[curr.amp[1].volume]);

            test_fx = 1;
            d = &lcd_rows[row_amp2][15];
            for (i = 0; i < 5; i++, test_fx <<= 1) {
                rom const char *name = fx_name(pr.fx_midi_cc[1][i]);
                const u8 lowercase_enable_mask = (~(curr.amp[1].fx & test_fx) << (5 - i));
                u8 is_alpha_mask, c;

                c = *name;
                is_alpha_mask = (c & 0x40) >> 1;
                *d++ = (c & ~is_alpha_mask) | (is_alpha_mask & lowercase_enable_mask);
            }
            break;
        case ROWMODE_FX:
            for (i = 0; i < LCD_COLS; i++) {
                lcd_rows[row_amp2][i] = "                    "[i];
            }
            test_fx = 1;
            d = &lcd_rows[row_amp2][0];
            for (i = 0; i < 5; i++, test_fx <<= 1) {
                rom const char *name = fx_name(pr.fx_midi_cc[1][i]);
                u8 is_alpha_mask, c, j;

                // Select 0x20 or 0x00 depending on if FX disabled or enabled, respectively:
                const u8 lowercase_enable_mask = (~(curr.amp[1].fx & test_fx) << (5 - i));

                // Uppercase enabled fx names; lowercase disabled.
                // 0x40 is used as an alpha test; this will fail for "@[\]^_`{|}~" but none of these are present in FX names.
                // 0x40 (or 0) is shifted right 1 bit to turn it into a mask for 0x20 to act as lowercase/uppercase switch.
                for (j = 0; j < 4; j++) {
                    c = *name++;
                    is_alpha_mask = (c & 0x40) >> 1;
                    *d++ = (c & ~is_alpha_mask) | (is_alpha_mask & lowercase_enable_mask);
                }
            }
            break;
    }
    
    lcd_updated_all();
#endif
}

static void calc_leds(void) {
    curr.leds.top.byte = (curr.fsw.top.byte & (u8)(0x20 | 0x40 | 0x80));
    switch (curr.rowstate[0].mode) {
        case ROWMODE_AMP:
            curr.leds.top.byte |= ((curr.amp[0].fx & fxm_dirty) >> 7)
                | (curr.fsw.top.byte & (u8)(0x02 | 0x04 | 0x08 | 0x10));
            break;
        case ROWMODE_FX:
            curr.leds.top.byte = (curr.amp[0].fx & (fxm_1 | fxm_2 | fxm_3 | fxm_4 | fxm_5))
                | 0x20 | (curr.fsw.top.byte & (u8)(0x40 | 0x80));
            break;
    }

    curr.leds.bot.byte = (curr.fsw.bot.byte & (u8)(0x20 | 0x40 | 0x80));
    switch (curr.rowstate[1].mode) {
        case ROWMODE_AMP:
            curr.leds.bot.byte |= ((curr.amp[1].fx & fxm_dirty) >> 7)
                | (curr.fsw.bot.byte & (u8)(0x02 | 0x04 | 0x08 | 0x10));
            break;
    case ROWMODE_FX:
            curr.leds.bot.byte = (curr.amp[1].fx & (fxm_1 | fxm_2 | fxm_3 | fxm_4 | fxm_5))
                | 0x20 | (curr.fsw.bot.byte & (u8)(0x40 | 0x80));
            break;
    }

    send_leds();
}

static void calc_gain_modified(void) {
    curr.modified = (curr.modified & ~(u8) 0x11) |
                    ((u8) (curr.amp[0].gain != origpr->scene[curr.sc_idx].amp[0].gain) << (u8) 0) |
                    ((u8) (curr.amp[1].gain != origpr->scene[curr.sc_idx].amp[1].gain) << (u8) 4);
    // DEBUG_LOG1("calc_gain_modified():   0x%02X", curr.modified);
}

static void calc_fx_modified(void) {
    curr.modified = (curr.modified & ~(u8) 0x22) |
                    ((u8) (curr.amp[0].fx != origpr->scene[curr.sc_idx].amp[0].fx) << (u8) 1) |
                    ((u8) (curr.amp[1].fx != origpr->scene[curr.sc_idx].amp[1].fx) << (u8) 5);
    // DEBUG_LOG1("calc_fx_modified():     0x%02X", curr.modified);
}

static void calc_volume_modified(void) {
    curr.modified = (curr.modified & ~(u8) 0x44) |
                    ((u8) (curr.amp[0].volume != origpr->scene[curr.sc_idx].amp[0].volume) << (u8) 2) |
                    ((u8) (curr.amp[1].volume != origpr->scene[curr.sc_idx].amp[1].volume) << (u8) 6);
    // DEBUG_LOG1("calc_volume_modified(): 0x%02X", curr.modified);
}

rom struct program *program_addr(u8 pr) {
    u16 addr = (u16)sizeof(struct set_list) + (u16)(pr * sizeof(struct program));

    return (rom struct program *)flash_addr(addr);
}

void load_program(void) {
    // Load program:
    u16 addr;
    u8 pr_num;

    if (curr.setlist_mode == 1) {
        pr_num = sl.entries[curr.sl_idx].program;
    } else {
        pr_num = curr.pr_idx;
    }

    DEBUG_LOG1("load program %d", pr_num + 1);

    addr = (u16)sizeof(struct set_list) + (u16)(pr_num * sizeof(struct program));
    flash_load(addr, sizeof(struct program), (u8 *) &pr);

    origpr = (rom struct program *)flash_addr(addr);
    curr.modified = 0;
    curr.midi_program = pr.midi_program;
    curr.tempo = pr.tempo;

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

void load_scene(void) {
    DEBUG_LOG1("load scene %d", curr.sc_idx + 1);

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

void scene_default(void) {
    rom struct program *default_pr = program_addr(0);
    u8 a, i;

    DEBUG_LOG1("default scene %d", curr.sc_idx + 1);

    // Set defaults per amp:
    for (a = 0; a < 2; a++) {
        pr.default_gain[a] = 0x5E;
        for (i = 0; i < 5; i++) {
            pr.fx_midi_cc[a][i] = default_pr->fx_midi_cc[a][i];
        }
    }
    pr.scene_count = 1;
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

#if 0
static void tap_tempo() {
    tap ^= (u8)0x7F;
    midi_axe_cc(axe_cc_taptempo, tap);
}
#endif

static void midi_invalidate() {
    // Invalidate all current MIDI state so it gets re-sent at end of loop:
    DEBUG_LOG0("invalidate MIDI state");
    last.midi_program = ~curr.midi_program;
    last.tempo = ~curr.tempo;
    last.amp[0].gain = ~curr.amp[0].gain;
    last.amp[0].fx = ~curr.amp[0].fx;
    last.amp[0].volume = ~curr.amp[0].volume;
    last.amp[1].gain = ~curr.amp[1].gain;
    last.amp[1].fx = ~curr.amp[1].fx;
    last.amp[1].volume = ~curr.amp[1].volume;
    // Initialize to something neither 0x00 or 0x7F so it gets reset:
    last_amp[0].amp_xy = 0x40;
    last_amp[0].cab_xy = 0x40;
    last_amp[0].gain = ~curr.amp[0].gain;
    last_amp[0].gate = 0x40;
    last_amp[1].amp_xy = 0x40;
    last_amp[1].cab_xy = 0x40;
    last_amp[1].gain = ~curr.amp[1].gain;
    last_amp[1].gate = 0x40;
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

static void reset_scene() {
    DEBUG_LOG0("reset scene");
    curr.sc_idx = 0;
}

static void prev_scene() {
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

    tap = 0;

    mode = MODE_LIVE;
    for (i = 0; i < MODE_count; i++) {
        mode_leds[i].top.byte = 0;
        mode_leds[i].bot.byte = 0;
    }

    last.leds.bot.byte = 0xFF;
    last.leds.top.byte = 0xFF;
    curr.leds.bot.byte = 0x00;
    curr.leds.top.byte = 0x00;

    last.setlist_mode = 1;
    curr.setlist_mode = 1;

    // Load setlist:
    flash_load((u16)0, sizeof(struct set_list), (u8 *)&sl);
    sl_max = sl.count - (u8)1;

    for (i = 0; i < 2; i++) {
        curr.amp[i].gain = 0;
        last.amp[i].gain = ~(u8)0;
        last_amp[i].clean_gain = 0x12;
    }

    // Load first program in setlist:
    curr.sl_idx = 0;
    curr.pr_idx = 0;
    last.sl_idx = 0;
    last.pr_idx = 0;
    last.midi_program = 0x7F;
    last.tempo = 0;
    load_program();
    load_scene();
    last.sc_idx = curr.sc_idx;

    for (i = 0; i < 2; i++) {
        curr.rowstate[i].mode = ROWMODE_AMP;
        curr.rowstate[i].fx = 0;
        last.rowstate[i].mode = ~ROWMODE_AMP;
        last.rowstate[i].fx = ~0;

        // Copy current scene settings into state:
        curr.amp[i] = pr.scene[curr.sc_idx].amp[i];

        // Invert last settings to force initial switch:
        last.amp[i].fx = ~curr.amp[i].fx;
        last.amp[i].volume = ~curr.amp[i].volume;
    }

    // Force MIDI changes on init:
    midi_invalidate();

#ifdef FEAT_LCD
    for (i = 0; i < LCD_ROWS; ++i)
        lcd_rows[i] = lcd_row_get(i);

    for (i = 0; i < LCD_COLS; ++i) {
        lcd_rows[row_amp1][i] = "                    "[i];
        lcd_rows[row_amp2][i] = "                    "[i];
        lcd_rows[row_stat][i] = "                    "[i];
        lcd_rows[row_song][i] = "                    "[i];
    }
#endif
}

#pragma udata timers
struct timers {
    u8 top_1;
    u8 top_2;
    u8 top_3;
    u8 top_4;
    u8 top_5;
    u8 top_6;
    u8 top_7;
    u8 top_8;
    u8 bot_1;
    u8 bot_2;
    u8 bot_3;
    u8 bot_4;
    u8 bot_5;
    u8 bot_6;
    u8 bot_7;
    u8 bot_8;
    u8 retrigger;
} timers;
#pragma udata

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

#define vol_dec(ampno) { \
        u8 volume = (curr.amp[ampno].volume); \
        if (volume > (u8)0) { \
            volume--; \
            curr.amp[ampno].volume = volume; \
            calc_volume_modified(); \
        } \
    }

#define vol_inc(ampno) { \
        u8 volume = (curr.amp[ampno].volume); \
        if (volume < (u8)127) { \
            volume++; \
            curr.amp[ampno].volume = volume; \
            calc_volume_modified(); \
        } \
    }

#define gain_dec(ampno) { \
        u8 *gain; \
        if ((curr.amp[ampno].fx & (fxm_dirty | fxm_acoustc)) == fxm_dirty) { \
            if (curr.amp[ampno].gain != 0) { \
                gain = &curr.amp[ampno].gain; \
            } else { \
                gain = &pr.default_gain[ampno]; \
            } \
        } else { \
            gain = &last_amp[ampno].clean_gain; \
        } \
        if ((*gain) > (u8)1) { \
            (*gain)--; \
            calc_gain_modified(); \
        } \
    }

#define gain_inc(ampno) { \
        u8 *gain; \
        if ((curr.amp[ampno].fx & (fxm_dirty | fxm_acoustc)) == fxm_dirty) { \
            if (curr.amp[ampno].gain != 0) { \
                gain = &curr.amp[ampno].gain; \
            } else { \
                gain = &pr.default_gain[ampno]; \
            } \
        } else { \
            gain = &last_amp[ampno].clean_gain; \
        } \
        if ((*gain) < (u8)127) { \
            (*gain)++; \
            calc_gain_modified(); \
        } \
    }

    switch (curr.rowstate[0].mode) {
        case ROWMODE_AMP:
            one_shot(top,1,0x1F,curr.amp[0].fx ^= fxm_acoustc; calc_fx_modified())
            repeater(top,2,0x18,0x03,gain_dec(0))
            repeater(top,3,0x18,0x03,gain_inc(0))
            repeater(top,4,0x18,0x03,vol_dec(0))
            repeater(top,5,0x18,0x03,vol_inc(0))
            one_shot(top,6,0x1F,midi_invalidate())
            break;
    }

    switch (curr.rowstate[1].mode) {
        case ROWMODE_AMP:
            one_shot(bot,1,0x1F,curr.amp[1].fx ^= fxm_acoustc; calc_fx_modified())
            repeater(bot,2,0x18,0x03,gain_dec(1))
            repeater(bot,3,0x18,0x03,gain_inc(1))
            repeater(bot,4,0x18,0x03,vol_dec(1))
            repeater(bot,5,0x18,0x03,vol_inc(1))
            one_shot(bot,6,0x1F,midi_invalidate())
            break;
    }

    one_shot(bot,7,0x3F,toggle_setlist_mode())
    one_shot(bot,8,0x3F,reset_scene())

    repeater(top,7,0x20,0x07,prev_song())
    repeater(top,8,0x20,0x07,next_song())

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
    // curr.fsw.word = fsw_poll();
    u16 tmp = fsw_poll();
    curr.fsw.bot.byte = (u8)(tmp & (u8)0xFF);
    curr.fsw.top.byte = (u8)((tmp >> (u8)8) & (u8)0xFF);

#define btn_pressed(row, n, on_press) \
    if (is_##row##_button_pressed(M_##n)) { \
        timers.row##_##n = (u8)0x80; \
        on_press; \
    } else if (is_##row##_button_released(M_##n)) { \
        timers.row##_##n = (u8)0x00; \
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

#define toggle_dirty(fx) \
    ((fx & fxm_acoustc) == fxm_acoustc) ? (fx & ~fxm_acoustc) : (fx ^ fxm_dirty)

    switch (curr.rowstate[0].mode) {
        case ROWMODE_AMP:
            btn_released_oneshot(top, 1, curr.amp[0].fx = toggle_dirty(curr.amp[0].fx); calc_fx_modified())
            btn_released_repeater(top, 2, gain_dec(0))
            btn_released_repeater(top, 3, gain_inc(0))
            btn_released_repeater(top, 4, vol_dec(0))
            btn_released_repeater(top, 5, vol_inc(0))
            btn_released_oneshot(top, 6, curr.rowstate[0].mode = ROWMODE_FX)
            break;
        case ROWMODE_FX:
            btn_pressed(top, 1, curr.amp[0].fx ^= fxm_1; calc_fx_modified())
            btn_pressed(top, 2, curr.amp[0].fx ^= fxm_2; calc_fx_modified())
            btn_pressed(top, 3, curr.amp[0].fx ^= fxm_3; calc_fx_modified())
            btn_pressed(top, 4, curr.amp[0].fx ^= fxm_4; calc_fx_modified())
            btn_pressed(top, 5, curr.amp[0].fx ^= fxm_5; calc_fx_modified())
            btn_released_oneshot(top, 6, curr.rowstate[0].mode = ROWMODE_AMP)
            break;
    }

    switch (curr.rowstate[1].mode) {
        case ROWMODE_AMP:
            btn_released_oneshot(bot, 1, curr.amp[1].fx = toggle_dirty(curr.amp[1].fx); calc_fx_modified())
            btn_released_repeater(bot, 2, gain_dec(1))
            btn_released_repeater(bot, 3, gain_inc(1))
            btn_released_repeater(bot, 4, vol_dec(1))
            btn_released_repeater(bot, 5, vol_inc(1))
            btn_released_repeater(bot, 6, curr.rowstate[1].mode = ROWMODE_FX)
            break;
        case ROWMODE_FX:
            btn_pressed(bot, 1, curr.amp[1].fx ^= fxm_1; calc_fx_modified())
            btn_pressed(bot, 2, curr.amp[1].fx ^= fxm_2; calc_fx_modified())
            btn_pressed(bot, 3, curr.amp[1].fx ^= fxm_3; calc_fx_modified())
            btn_pressed(bot, 4, curr.amp[1].fx ^= fxm_4; calc_fx_modified())
            btn_pressed(bot, 5, curr.amp[1].fx ^= fxm_5; calc_fx_modified())
            btn_released_oneshot(bot, 6, curr.rowstate[1].mode = ROWMODE_AMP)
            break;
    }

    // // TAP:
    // if (is_bot_button_pressed(M_7)) {
    //     // Toggle TAP CC value between 0x00 and 0x7F:
    //     timers.bot_6 = (u8)0x80;
    //     tap ^= (u8)0x7F;
    //     midi_axe_cc(axe_cc_taptempo, tap);
    // } else if (is_bot_button_pressed(M_6)) {
    //     timers.bot_6 = (u8)0x00;
    // }

#define on_retrigger(action) \
    if (timers.retrigger == 0) { \
        action; \
        timers.retrigger = 1; \
    }

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
        pr.scene[last.sc_idx].amp[0] = curr.amp[0];
        pr.scene[last.sc_idx].amp[1] = curr.amp[1];

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
