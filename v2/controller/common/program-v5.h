
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

#define scene_count_max 11

struct amp {
    u8 gain;    // amp gain (7-bit), if 0 then the default gain is used
    u8 fx;      // bitfield for FX enable/disable, including clean/dirty/acoustic switch
    u8 volume;  // volume (7-bit) represented where 0 = -inf, 98 = 0dB, 127 = +6dB
    u8 gate;    // gate threshold (7-bit) represented where 0 = -76.0dB, 127 = -12.0dB, default should be 71 = -40.0dB aka 0x47
};

// amp state is 4 bytes:
COMPILE_ASSERT(sizeof(struct amp) == 4);

// Program v5 data structure loaded from / written to flash memory:
struct program {
    // Name of the song:
    u8 name[20];

    // AXE-FX program # to switch to (7 bit)
    u8 midi_program;

    // Tempo in bpm:
    u8 tempo;

    // Default gain setting for each amp:
    u8 default_gain[2];

    // MIDI CC numbers for FX enable/disable for each amp:
    // TODO: this will be redundant per MIDI program. Better to move this out to a per-program storage instead of per-song.
    u8 fx_midi_cc[2][5];

    // 34 bytes consumed up to this point. 128 - 34 = 94 bytes to spend on scene descriptors.
    u8 _padding[5];

    u8 scene_count;

    // Scene descriptors (8 bytes each):
    struct scene_descriptor {
        // 2 amps (4 bytes each):
        struct amp amp[2];
    } scene[scene_count_max];
};

// NOTE(jsd): Struct size must be a divisor of 64 to avoid crossing 64-byte boundaries in flash!
// Struct sizes of 1, 2, 4, 8, 16, and 32 qualify.
COMPILE_ASSERT(sizeof(struct program) == 128);

// Set list entry
struct set_entry {
    u8 program;
};

#define max_set_length 127

// Set lists
struct set_list {
    u8 count;                       // number of songs in set list
    // u8 d0, d1;                      // date of show (see DATES below)
    struct set_entry entries[max_set_length];
};

// DATES since 2014 are stored in 16 bits in the following form: (LSB on right)
//  yyyyyyym mmmddddd;
//  |||||||| ||||||||
//  |||||||| |||\++++ day of month [0..30]
//  |||||||\-+++----- month [0..11]
//  \++++++---------- year since 2014 [0..127]

COMPILE_ASSERT(sizeof(struct set_list) == 128);
