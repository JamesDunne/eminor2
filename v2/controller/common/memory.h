
// JSD's custom persistent data structures per program.

/*
LIVE:
|-----------------------------------------------------------|
|    *      *      *      *      *      *      *      *     |
|   B-1    B-2    B-3    B-4   B-MUTE A-MUTE  PREV   NEXT   |
|                                                           |
|                                                           |
|    *      *      *      *      *      *      *      *     |
|   A-1    A-2    A-3    A-4    A-5    A-6    A-7    A-8    |
|                                                           |
|-----------------------------------------------------------|

      MODE = enter MODE change
      B-1 to B-4 = press to send B scene change #1-4
      A-1 to A-8 = press to switch to scene; repeat to send TAP TEMPO
      Hold down A-1 to A-8 to enter SCENE DESIGNER

SCENE DESIGNER:
|-----------------------------------------------------------|
|    *      *      *      *      *      *      *      *     |
|   CMP    FLT    PIT    CHO    DLY    RVB    GATE   EQ     |
|                                                           |
|                                                           |
|    *      *      *      *      *      *      *      *     |
|   CH1    CH2    CH3   VOL--  VOL++  VOL=+6  SAVE   EXIT   |
|                                                           |
|-----------------------------------------------------------|
*/

// Program data structure loaded from / written to flash memory:
struct program {
    // Name of the program in ASCII, max 20 chars, NUL terminator is optional at 20 char limit; NUL padding is preferred:
    u8 name[20];

    // Scene descriptors:
    struct scene_descriptor {
        // Ivvv vvCC
        // |||| ||||
        // |||| ||\--- (unsigned 0-3 = RJM channel)
        // |\--------- (  signed -16..+15, offset -9 = -25..+6)
        // \---------- Is Initial Scene
        u8 part1;

        // M000 00CC
        // |      ||
        // |      \--- (unsigned 0-3 = Axe-FX scene)
        // |
        // \---------- Is Muted
        // TODO: volume ramp from previous!
        u8 part2;
    } scene[8];

    // G-major effects enabled per scene (see fxm_*):
    u8 fx[8];

    u8 _unused[20];
};

// NOTE(jsd): Struct size must be a divisor of 64 to avoid crossing 64-byte boundaries in flash!
// Struct sizes of 1, 2, 4, 8, 16, and 32 qualify.
COMPILE_ASSERT(sizeof(struct program) == 64);

// Mark V channel 1
#define rjm_channel_1   0x00
// Mark V channel 2
#define rjm_channel_2   0x01
// Mark V channel 3
#define rjm_channel_3   0x02

#define rjm_channel_mask        0x03

#define scene_level_mask (31 << 2)
#define scene_level_shr  2

// 5-bit signed values
#define scene_level_offset  9
#define scene_level_0    ((( 0 + scene_level_offset) & 31) << 2)
#define scene_level_pos4 (((+5 + scene_level_offset) & 31) << 2)
#define scene_level_neg3 (((-3 + scene_level_offset) & 31) << 2)

#define scene_initial    0x80

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
