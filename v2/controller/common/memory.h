
// JSD's custom persistent data structures per program:

// Program data structure loaded from / written to flash memory:
struct program {
    // Name of the program in ASCII, max 20 chars, NUL terminator is optional at 20 char limit; NUL padding is preferred:
    u8 name[20];

    // Scene descriptors:
    u8 scene_desc[6];
    // G-major effects enabled per scene (see fxm_*):
    u8 fx[6];
};

// NOTE(jsd): Struct size must be a divisor of 64 to avoid crossing 64-byte boundaries in flash!
// Struct sizes of 1, 2, 4, 8, 16, and 32 qualify.
COMPILE_ASSERT(sizeof(struct program) == 32);

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

// An RJM channel descriptor:
//
// 8 bits describes two RJM channels:
//
// bits:
// 7654 3210
// BBCC BBCC
// |||| ||||
// |||| ||\+- Channel (0-2, 3 ignored)
// |||| ||
// |||| \+--- Boost   -6dB, -3dB, 0dB, +3dB (signed 2-bit)
// ||||
// ||\+------ Channel (0-2, 3 ignored)
// ||
// \+-------- Boost   -6dB, -3dB, 0dB, +3dB (signed 2-bit)
//


// Mark V channel 1
#define rjm_channel_1   0x00
// Mark V channel 2
#define rjm_channel_2   0x01
// Mark V channel 3
#define rjm_channel_3   0x02

#define rjm_channel_mask        0x03

// Scene level as 2-bit signed integer
#define scene_level_mask (31 << 2)
#define scene_level_shr  2

// 5-bit signed values
#define scene_level_offset  9
#define scene_level_0    ((( 0 + scene_level_offset) & 31) << 2)
#define scene_level_pos4 (((+5 + scene_level_offset) & 31) << 2)
#define scene_level_neg3 (((-3 + scene_level_offset) & 31) << 2)

#define scene_initial    0x80
