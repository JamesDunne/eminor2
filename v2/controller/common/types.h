// common typedefs used throughout the code:
typedef unsigned char   u8;
typedef signed char     s8;
typedef unsigned short  u16;
typedef signed short    s16;

typedef union {
    u8 byte;
    struct {
        unsigned _1 : 1;
        unsigned _2 : 1;
        unsigned _3 : 1;
        unsigned _4 : 1;
        unsigned _5 : 1;
        unsigned _6 : 1;
        unsigned _7 : 1;
        unsigned _8 : 1;
    } bits;
} b8;

typedef union {
    struct {
        b8  bot;
        b8  top;
    };
    u16 word;
} io16;
