//#######################################################################
/**  
* @file _tools.h
* This contains the C language tools used in the project.
*
* @author Joe Dunne
* @date 6/02/05
* @brief Tools file
*/
//          *See Updates section at bottom of file*
//#######################################################################

#define ENABLE_ALL_INTERRUPTS()     \
    INTCONbits.GIEH = true;         \
    INTCONbits.GIEL = true;

#define DISABLE_ALL_INTERRUPTS()    \
    INTCONbits.GIEH = false;        \
    INTCONbits.GIEL = false;

#define false 0
#define true 1

// Set high bit #"Place" located in a register called "VAR"  // Place : 0 -> 7
#define setbit(VAR,Place) VAR |= 1 << Place

// Set low bit #"Place" located in a register called "VAR"  // Place : 0 -> 7
#define clrbit(VAR,Place) VAR &= (1 << Place)^255
#define chkbit(VAR,Place) (VAR & (1 << Place))
#define tglbit(VAR,Place) VAR ^= 1 << Place

#define jumpto(LOCATION) _asm goto  LOCATION    _endasm

#define nop(x)      _asm NOP    _endasm

#define CLRWDT(x)   _asm CLRWDT _endasm

//---------------------------------------------------------------------------
//Define flags here

//Define flags here
typedef union {
    unsigned char byte;
    struct{
        unsigned bit0:1;
        unsigned bit1:1;
        unsigned bit2:1;
        unsigned bit3:1;
        unsigned bit4:1;
        unsigned bit5:1;
        unsigned bit6:1;
        unsigned bit7:1;
    };
} BitField;

typedef union                                           
// TwoBytes definition : TwoBytes refers to an union that can be 
// - either an unsigned short
// - or a structure made of 2 variables, each one being 1 byte long
{
    unsigned short s_form;          // Short access : var.s_form
    struct {unsigned char low, high;} b_form;   // Byte access : var.b_form.high/low
    struct {BitField byte0, byte1;} b_formBits; // byte access : byte0 = lsbyte
} TwoBytes;

typedef union
{
    unsigned short long w;                                      // Short access : var.w
    unsigned short long ls_form;                                // Short access : var.ls_form
    struct {unsigned char low, high, upper;}b_form;             // byte access : byte0 = lsbyte
    struct {unsigned char B0, B1, B2;}byte;                     // byte access : byte0 = lsbyte
    struct {unsigned short word0; unsigned char byte2;}low_word;    // ??
    struct {unsigned char byte0; unsigned short word1;}high_word;   // ??
} ThreeBytes;

typedef union                                           
// FourBytes definition : FourBytes refers to an union that can be 
// - either an unsigned long
// - or a structure made of 2 variables, each one being 2 bytes long
// - or a structure made of 4 variables, each one being 1 byte long
{
    unsigned long l_form;                   // long access : var.l_form
    struct {unsigned short low, high;} s_form;          // short access : var.s_form.high/low
    struct {unsigned char byte0; unsigned short mid; unsigned char byte3; } sm_form;        // short access of middle 16 bit value
    struct {unsigned char byte0, byte1, byte2, byte3;} b_form;  // byte access : byte0 = lsbyte
    struct {BitField byte0, byte1, byte2, byte3;} b_formBits;   // byte access : byte0 = lsbyte
} FourBytes;

//-----------------------------------------------------------------------
//Updated 6/02/05 JD 691206 x012 Created this file.
