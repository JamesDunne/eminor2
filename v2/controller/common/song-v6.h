
#define fx_count    5

#define fxm_1       (u8)0x01
#define fxm_2       (u8)0x02
#define fxm_3       (u8)0x04
#define fxm_4       (u8)0x08
#define fxm_5       (u8)0x10
////////////////////////0x20
#define fxm_acoustc (u8)0x40
#define fxm_dirty   (u8)0x80

// For the Axe-FX Vol block, Log 20A means that the resistance is 20% at the halfway point in the travel.
// If you put the knob at noon, the volume would be 20% of maximum (about -14 dB).
// So, 0 = -INFdB, 63 = -14dB and 127 = 0dB
// We adjust the scale by +6dB to define 0dB at 98 and +6dB at 127
#define volume_0dB 98
#define volume_6dB 127

#define gate_default 71

struct amp_defaults {
    u8 dirty_gain;
    u8 clean_gain;
    u8 gate;
};

struct axe_midi_program {
    struct amp_descriptor {
        // MIDI CC controller numbers for each FX:
        u8                  fx_midi_cc[fx_count];
        // Default settings:
        struct amp_defaults amp_defaults;
    } amps[2];
};

struct amp {
    u8 gain;    // amp gain (7-bit), if 0 then the default gain is used
    u8 gate;    // gate threshold (7-bit) represented where 0 = -76.0dB, 127 = -12.0dB, default should be 71 = -40.0dB aka 0x47
    u8 fx;      // bitfield for FX enable/disable, including clean/dirty/acoustic switch
    u8 volume;  // volume (7-bit) represented where 0 = -inf, 98 = 0dB, 127 = +6dB
};

struct scene_descriptor {
    struct amp amp[2];
};

// scene descriptor is 8 bytes:
COMPILE_ASSERT(sizeof(struct scene_descriptor) == 8);

#define scene_count_max 12

#define padding_bytes (128 - (23 + sizeof(struct amp_defaults) * 2 + 1 + sizeof(struct scene_descriptor) * scene_count_max))

// Song v6 data structure loaded from / written to flash memory:
struct song {
    // Name of the song:
    u8 name[20];

    // AXE-FX MIDI program number (0 based);
    u8 axe_midi_program;
    // TD-50 MIDI program number (0 based);
    u8 td50_midi_program;

    // Tempo in bpm (from 0 to 255):
    u8 tempo;

    // 23 bytes taken up to this point.
    /////////////////////////////////////////////////////////////////////////////////////////

    // Default settings for each amp, overrides defaults from axe_midi_program:
    struct amp_defaults amp_defaults[2];

    u8 scene_count;

    struct scene_descriptor scene[scene_count_max];

    // Padding to fill up to 128 byte size:
    u8 _padding[padding_bytes];
};

// NOTE(jsd): Struct size must be a divisor of 64 to avoid crossing 64-byte boundaries in flash!
// Struct sizes of 1, 2, 4, 8, 16, and 32 qualify.
COMPILE_ASSERT(sizeof(struct song) == 128);

// Set list entry
struct set_entry {
    u8 song;
};

#define max_set_length 125

// Set lists
struct set_list {
    u8 count;                       // number of songs in set list
    // u8 d0, d1;                      // date of show (see DATES below)
    struct set_entry entries[max_set_length];
};

COMPILE_ASSERT(sizeof(struct set_list) == 126);

// DATES since 2014 are stored in 16 bits in the following form: (LSB on right)
//  yyyyyyym mmmddddd;
//  |||||||| ||||||||
//  |||||||| |||\++++ day of month [0..30]
//  |||||||\-+++----- month [0..11]
//  \++++++---------- year since 2014 [0..127]
