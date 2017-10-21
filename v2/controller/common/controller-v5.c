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
|  CLN|DRV GAIN-- GAIN++ VOL--  VOL++   FX     MODE  SC_NXT  |          \--------------------/
|  ACOUSTC                             RESET   SAVE  SC_ONE  |
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
Hold  SAVE    to save program

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
|  ACOUSTC                             RESET   SAVE  SC_ONE  |
|------------------------------------------------------------|

Press AMP to switch row to AMP mode

Hold SELECT button to select effect MIDI CC for FX1, FX2, or FX3

SELECT controls (top):
|------------------------------------------------------------|
|     *      *      *      *      *      *      *      *     |          /--------------------\
|    F=0    F--    F++    OK    CANCEL  AMP   PR_PRV PR_NXT  |          |What_I_Got_________*|
|                                                            |          |Sng 62/62  Scn  2/ 3|
|                                                            |    LCD:  | F=0 F-- F++ OK  CNC|
|     *      *      *      *      *      *      *      *     |          |FX1: Filter         |
|  CLN|DRV GAIN-- GAIN++ VOL--  VOL++   FX     MODE  SC_NXT  |          \--------------------/
|  ACOUSTC                             RESET   SAVE  SC_ONE  |
|------------------------------------------------------------|

Press F=0    to reset back to top of FX list
Press F--    to select previous FX (loop to end)
Press F++    to select next FX (loop to start)
Press OK     to apply current FX selection (also disables previous FX if enabled)
Press CANCEL to cancel and revert to existing FX
Press AMP    to cancel and revert to existing FX and then switch to AMP mode for the row

*/

#if HW_VERSION == 5

#include "types.h"

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

// Structure to represent state that should be compared from current to last to detect changes in program.
struct state {
    // Footswitch state:
    io16 fsw;
    // Actual LED state:
    u16 leds;

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

// Tap tempo CC value (toggles between 0x00 and 0x7F):
u8 tap;

// Current mode:
u8 mode;
// LED state per mode:
io16 mode_leds[MODE_count];

// Whether INC/DEC affects gain (0) or volume (1):
u8 gain_mode;

enum rowstate_mode {
    ROWMODE_AMP,
    ROWMODE_FX,
    ROWMODE_SELECTFX
};

// BCD-encoded dB value table (from PIC/v4_lookup.h):
rom const u16 dB_bcd_lookup[128] = {
#include "../PIC/v4_lookup.h"
};

// Max program #:
u8 sl_max;
// Loaded setlist:
struct set_list sl;
// Loaded program:
struct program pr;
// Pointer to unmodified program:
rom struct program *origpr;

#include "v5_fx_names.h"

static rom const char *fx_name(u8 fx_midi_cc) {
    if (fx_midi_cc < 41) {
        return "";
    } else if (fx_midi_cc > 41 + (sizeof(v5_fx_names) / 4)) {
        return "";
    }
    return v5_fx_names[fx_midi_cc - 41];
}

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

// Top switch press cannot be an accident:
#define is_top_button_pressed(mask) \
    (((last.fsw.top.byte & mask) == 0) && ((curr.fsw.top.byte & mask) == mask))

// Always switch programs regardless of whether a top switch was accidentally depressed:
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

// BCD is 2.1 format with MSB indicating sign (5 chars total) i.e. "-99.9" or " -inf"
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
    curr.leds = (u16)mode_leds[mode].bot.byte | ((u16)mode_leds[mode].top.byte << 8);
    if (curr.leds != last.leds) {
        led_set(curr.leds);
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

static void scene_default(void);

static void program_save(void);

// (enable == 0 ? (u8)0 : (u8)0x7F)
#define calc_cc_toggle(enable) \
    ((u8) -((s8)(enable)) >> (u8)1)

#define or_default(a, b) (a == 0 ? b : a)

// MIDI is sent at a fixed 3,125 bytes/sec transfer rate; 56 bytes takes 175ms to complete.
// calculate the difference from last MIDI state to current MIDI state and send the difference as MIDI commands:
static void calc_midi(void) {
    u8 diff = 0;
    u8 acoustc, last_acoustc, acoustc_changed;
    u8 send_gain;
    u8 dirty_changed;
    u8 gain_changed;
    u8 test_fx = 1;
    u8 i;

    // Send MIDI program change:
    if (curr.midi_program != last.midi_program) {
        DEBUG_LOG1("MIDI change program %d", curr.midi_program);
        midi_axe_pc(curr.midi_program + 10);
    }

    if (curr.setlist_mode != last.setlist_mode) {
        diff = 1;
    }

    // Send gain controller changes:
    acoustc = curr.amp[0].fx & fxm_acoustc;
    last_acoustc = last.amp[0].fx & fxm_acoustc;
    acoustc_changed = last_acoustc != acoustc;

    if (acoustc_changed) {
        if (acoustc != 0) {
            // Changed to acoustic sound:
            DEBUG_LOG0("MIDI set AMP1 acoustic on");
            // X is 0x7F, Y is 0x00
            // AMP1 -> Y, CAB1 -> Y, GATE -> off, COMPRESSOR -> on, GAIN -> 0x5E
            DEBUG_LOG0("AMP1 Y");
            midi_axe_cc(axe_cc_xy_amp1, 0x00);
            DEBUG_LOG0("CAB1 Y");
            midi_axe_cc(axe_cc_xy_cab1, 0x00);
            DEBUG_LOG0("Gain1 0x5E");
            midi_axe_cc(axe_cc_external3, 0x5E);
            DEBUG_LOG0("Gate1 off");
            midi_axe_cc(axe_cc_byp_gate1, 0x00);
            DEBUG_LOG0("Comp1 on");
            midi_axe_cc(axe_cc_byp_compressor1, 0x7F);
        } else {
            // Changed to electric sound:
            DEBUG_LOG0("MIDI set AMP1 acoustic off");
            // X is 0x7F, Y is 0x00
            DEBUG_LOG0("AMP1 X");
            midi_axe_cc(axe_cc_xy_amp1, 0x7F);
            DEBUG_LOG0("CAB1 X");
            midi_axe_cc(axe_cc_xy_cab1, 0x7F);
        }
        diff = 1;
    }

    if (acoustc == 0) {
        u8 dirty, last_dirty;
        u8 gain, last_gain;
        u8 gate, last_gate;

        dirty = curr.amp[0].fx & fxm_dirty;
        last_dirty = last.amp[0].fx & fxm_dirty;
        dirty_changed = (u8)(dirty != last_dirty);

        gain = or_default(curr.amp[0].gain, pr.default_gain[0]);
        last_gain = or_default(last.amp[0].gain, pr.default_gain[0]);
        gain_changed = (u8)(gain != last_gain);

        gate = (u8)(dirty && (gain >= 0x01));
        last_gate = (u8)(last_dirty && (last_gain >= 0x01));

        diff |= gain_changed;

        send_gain = (u8)((dirty && gain_changed) || dirty_changed || acoustc_changed);
        if (send_gain) {
            DEBUG_LOG2("MIDI set AMP1 %s, gain=0x%02x", dirty == 0 ? "clean" : "dirty", gain);
            midi_axe_cc(axe_cc_external3, (dirty == 0) ? (u8)0x00 : gain);
            if (gate != last_gate) {
                DEBUG_LOG1("Gate1 %s", calc_cc_toggle(gate) == 0 ? "off" : "on");
                midi_axe_cc(axe_cc_byp_gate1, calc_cc_toggle(gate));
                DEBUG_LOG0("Comp1 on");
                midi_axe_cc(axe_cc_byp_compressor1, 0x7F);
            }
            diff = 1;
        }
    }

    // Send gain controller changes:
    acoustc = curr.amp[1].fx & fxm_acoustc;
    last_acoustc = last.amp[1].fx & fxm_acoustc;
    acoustc_changed = last_acoustc != acoustc;

    if (acoustc_changed) {
        if (acoustc != 0) {
            // Changed to acoustic sound:
            DEBUG_LOG0("MIDI set AMP2 acoustic on");
            // X is 0x7F, Y is 0x00
            // AMP1 -> Y, CAB1 -> Y, GATE -> off, COMPRESSOR -> on, GAIN -> 0x5E
            DEBUG_LOG0("AMP1 Y");
            midi_axe_cc(axe_cc_xy_amp2, 0x00);
            DEBUG_LOG0("CAB1 Y");
            midi_axe_cc(axe_cc_xy_cab2, 0x00);
            DEBUG_LOG0("Gain2 0x5E");
            midi_axe_cc(axe_cc_external4, 0x5E);
            DEBUG_LOG0("Gate2 off");
            midi_axe_cc(axe_cc_byp_gate2, 0x00);
            DEBUG_LOG0("Comp2 on");
            midi_axe_cc(axe_cc_byp_compressor2, 0x7F);
        } else {
            // Changed to electric sound:
            DEBUG_LOG0("MIDI set AMP2 acoustic off");
            // X is 0x7F, Y is 0x00
            DEBUG_LOG0("AMP2 X");
            midi_axe_cc(axe_cc_xy_amp2, 0x7F);
            DEBUG_LOG0("CAB2 X");
            midi_axe_cc(axe_cc_xy_cab2, 0x7F);
        }
    }

    if (acoustc == 0) {
        u8 dirty, last_dirty;
        u8 gain, last_gain;
        u8 gate, last_gate;

        dirty = curr.amp[1].fx & (fxm_dirty | fxm_acoustc);
        last_dirty = last.amp[1].fx & (fxm_dirty | fxm_acoustc);
        dirty_changed = (u8)(dirty != last_dirty);

        gain = or_default(curr.amp[1].gain, pr.default_gain[1]);
        last_gain = or_default(last.amp[1].gain, pr.default_gain[1]);
        gain_changed = (u8)(gain != last_gain);

        gate = (u8)(dirty && (gain >= 0x01));
        last_gate = (u8)(last_dirty && (last_gain >= 0x01));

        diff |= gain_changed;
        send_gain = (u8)((dirty && gain_changed) || dirty_changed || acoustc_changed);
        if (send_gain) {
            DEBUG_LOG2("MIDI set AMP2 %s, gain=0x%02x", dirty == 0 ? "clean" : "dirty", gain);
            midi_axe_cc(axe_cc_external4, (dirty == 0) ? (u8)0x00 : gain);
            if (gate != last_gate) {
                DEBUG_LOG1("Gate2 on", calc_cc_toggle(gate) == 0 ? "off" : "on");
                midi_axe_cc(axe_cc_byp_gate2, calc_cc_toggle(gate));
                DEBUG_LOG0("Comp2 on");
                midi_axe_cc(axe_cc_byp_compressor2, 0x7F);
            }
            diff = 1;
        }
    }

    // Update volumes:
    if (curr.amp[0].volume != last.amp[0].volume) {
        DEBUG_LOG1("MIDI set AMP1 volume = %s", bcd(dB_bcd_lookup[curr.amp[0].volume]));
        midi_axe_cc(axe_cc_external1, (curr.amp[0].volume));
        diff = 1;
    }
    if (curr.amp[1].volume != last.amp[1].volume) {
        DEBUG_LOG1("MIDI set AMP2 volume = %s", bcd(dB_bcd_lookup[curr.amp[1].volume]));
        midi_axe_cc(axe_cc_external2, (curr.amp[1].volume));
        diff = 1;
    }

    // Send FX state:
    for (i = 0; i < 5; i++, test_fx <<= 1) {
        if ((curr.amp[0].fx & test_fx) != (last.amp[0].fx & test_fx)) {
            DEBUG_LOG2("MIDI set AMP1 %.4s %s", fx_name(pr.fx_midi_cc[0][i]), (curr.amp[0].fx & test_fx) == 0 ? "off" : "on");
            midi_axe_cc(pr.fx_midi_cc[0][i], calc_cc_toggle(curr.amp[0].fx & test_fx));
        }
        if ((curr.amp[1].fx & test_fx) != (last.amp[1].fx & test_fx)) {
            DEBUG_LOG2("MIDI set AMP2 %.4s %s", fx_name(pr.fx_midi_cc[1][i]), (curr.amp[1].fx & test_fx) == 0 ? "off" : "on");
            midi_axe_cc(pr.fx_midi_cc[1][i], calc_cc_toggle(curr.amp[1].fx & test_fx));
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
    char **labels;
    u8 n;
#endif
#ifdef FEAT_LCD
    s8 i;
    rom const char *pr_name;
    u8 test_fx;
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
    labels[6] = "PREV SONG";
    labels[7] = "NEXT SONG";
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
    labels[6] = "MODE|SAVE";
    labels[7] = "NEXT SCENE";
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
        pr_name = pr.name;
        copy_str_lcd(pr_name, lcd_rows[row_song]);
    }
    // Set modified bit:
    if (curr.modified) {
        lcd_rows[row_song][19] = '*';
    }

    // AMP1:
    switch (curr.rowstate[0].mode) {
        case ROWMODE_AMP:
            for (i = 0; i < LCD_COLS; i++) {
                lcd_rows[row_amp1][i] = "C g= 0 v=  0.0 -----"[i];
            }

            if ((curr.amp[0].fx & fxm_acoustc) != 0) {
                // A for acoustic
                lcd_rows[row_amp1][0] = 'A';
            } else {
                // C/D for clean/dirty
                lcd_rows[row_amp1][0] = 'C' + ((curr.amp[0].fx & fxm_dirty) != 0);
            }
            hextoa(lcd_rows[row_amp1], 5, or_default(curr.amp[0].gain, pr.default_gain[0]));
            bcdtoa(lcd_rows[row_amp1], 13, dB_bcd_lookup[curr.amp[0].volume]);

            test_fx = 1;
            for (i = 0; i < 5; i++, test_fx <<= 1) {
                lcd_rows[row_amp1][15 + i] = (curr.amp[0].fx & test_fx) ? '1' + i : '-';
            }
            break;
        case ROWMODE_FX:
            for (i = 0; i < LCD_COLS; i++) {
                lcd_rows[row_amp1][i] = "                    "[i];
            }
            for (i = 0; i < 5; i++) {
                rom const char *name = fx_name(pr.fx_midi_cc[0][i]);
                lcd_rows[row_amp1][i*4+0] = name[0];
                lcd_rows[row_amp1][i*4+1] = name[1];
                lcd_rows[row_amp1][i*4+2] = name[2];
                lcd_rows[row_amp1][i*4+3] = name[3];
            }
            break;
    }

    // AMP2:
    switch (curr.rowstate[1].mode) {
        case ROWMODE_AMP:
            for (i = 0; i < LCD_COLS; i++) {
                lcd_rows[row_amp2][i] = "C g= 0 v=  0.0 -----"[i];
            }

            if ((curr.amp[1].fx & fxm_acoustc) != 0) {
                // A for acoustic
                lcd_rows[row_amp2][0] = 'A';
            } else {
                // C/D for clean/dirty
                lcd_rows[row_amp2][0] = 'C' + ((curr.amp[1].fx & fxm_dirty) != 0);
            }
            hextoa(lcd_rows[row_amp2], 5, or_default(curr.amp[1].gain, pr.default_gain[1]));
            bcdtoa(lcd_rows[row_amp2], 13, dB_bcd_lookup[curr.amp[1].volume]);

            test_fx = 1;
            for (i = 0; i < 5; i++, test_fx <<= 1) {
                lcd_rows[row_amp2][15 + i] = (curr.amp[1].fx & test_fx) ? '1' + i : '-';
            }
            break;
        case ROWMODE_FX:
            for (i = 0; i < LCD_COLS; i++) {
                lcd_rows[row_amp2][i] = "                    "[i];
            }
            for (i = 0; i < 5; i++) {
                rom const char *name = fx_name(pr.fx_midi_cc[1][i]);
                lcd_rows[row_amp2][i * 4 + 0] = name[0];
                lcd_rows[row_amp2][i * 4 + 1] = name[1];
                lcd_rows[row_amp2][i * 4 + 2] = name[2];
                lcd_rows[row_amp2][i * 4 + 3] = name[3];
            }
            break;
    }
    
    lcd_updated_all();
#endif
}

static void calc_leds(void) {
    mode_leds[mode].top.byte = (curr.fsw.top.byte & (u8)(0x20 | 0x40 | 0x80));
    switch (curr.rowstate[0].mode) {
        case ROWMODE_AMP:
            mode_leds[mode].top.byte |= ((curr.amp[0].fx & fxm_dirty) >> 7)
                | (curr.fsw.top.byte & (u8)(0x02 | 0x04 | 0x08 | 0x10));
            break;
        case ROWMODE_FX:
            mode_leds[mode].top.byte = (curr.amp[0].fx & (fxm_1 | fxm_2 | fxm_3 | fxm_4 | fxm_5))
                | 0x20 | (curr.fsw.top.byte & (u8)(0x40 | 0x80));
            break;
    }

    mode_leds[mode].bot.byte = (curr.fsw.bot.byte & (u8)(0x20 | 0x40 | 0x80));
    switch (curr.rowstate[1].mode) {
        case ROWMODE_AMP:
            mode_leds[mode].bot.byte |= ((curr.amp[1].fx & fxm_dirty) >> 7)
                | (curr.fsw.bot.byte & (u8)(0x02 | 0x04 | 0x08 | 0x10));
            break;
    case ROWMODE_FX:
            mode_leds[mode].bot.byte = (curr.amp[1].fx & (fxm_1 | fxm_2 | fxm_3 | fxm_4 | fxm_5))
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
    addr = (u16)sizeof(struct set_list) + (u16)(pr_num * sizeof(struct program));
    DEBUG_LOG2("save program %d at addr 0x%04x", pr_num + 1, addr);
    flash_store(addr, sizeof(struct program), (u8 *)&pr);

    curr.modified = 0;
}

// set the controller to an initial state
void controller_init(void) {
    u8 i;

    mode = MODE_LIVE;
    for (i = 0; i < MODE_count; i++) {
        mode_leds[i].top.byte = 0;
        mode_leds[i].bot.byte = 0;
    }

    last.leds = 0xFFFFU;
    curr.leds = 0x0000U;

    last.setlist_mode = 1;
    curr.setlist_mode = 1;

    curr.amp[0].gain = 0;
    curr.amp[1].gain = 0;
    last.amp[0].gain = ~(u8)0;
    last.amp[1].gain = ~(u8)0;

    // Load setlist:
    flash_load((u16)0, sizeof(struct set_list), (u8 *)&sl);
    sl_max = sl.count - (u8)1;

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

    curr.rowstate[0].mode = ROWMODE_AMP;
    curr.rowstate[0].fx = 0;
    curr.rowstate[1].mode = ROWMODE_AMP;
    curr.rowstate[1].fx = 0;
    last.rowstate[0].mode = ~ROWMODE_AMP;
    last.rowstate[0].fx = ~0;
    last.rowstate[1].mode = ~ROWMODE_AMP;
    last.rowstate[1].fx = ~0;

    // Copy current scene settings into state:
    curr.amp[0] = pr.scene[curr.sc_idx].amp[0];
    curr.amp[1] = pr.scene[curr.sc_idx].amp[1];

    // Invert last settings to force initial switch:
    last.amp[0].fx = ~curr.amp[0].fx;
    last.amp[1].fx = ~curr.amp[1].fx;
    last.amp[0].volume = ~curr.amp[0].volume;
    last.amp[1].volume = ~curr.amp[1].volume;

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
} timers;

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
        u8 gain = or_default(curr.amp[ampno].gain, pr.default_gain[ampno]); \
        if (gain > (u8)1) { \
            gain--; \
            curr.amp[ampno].gain = gain; \
            calc_gain_modified(); \
        } \
    }

#define gain_inc(ampno) { \
        u8 gain = or_default(curr.amp[ampno].gain, pr.default_gain[ampno]); \
        if (gain < (u8)127) { \
            gain++; \
            curr.amp[ampno].gain = gain; \
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

    one_shot(bot,7,0x3F,program_save())
    one_shot(bot,8,0x3F,reset_scene())

    repeater(top,7,0x20,0x03,prev_song())
    repeater(top,8,0x20,0x03,next_song())

#undef repeater
#undef one_shot
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
        case ROWMODE_SELECTFX:
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
        case ROWMODE_SELECTFX:
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

    btn_released_oneshot(bot,7,toggle_setlist_mode())

    // NEXT SCENE:
    btn_pressed_oneshot(bot,8,next_scene())

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
