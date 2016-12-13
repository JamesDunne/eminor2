/* $Id: c018.c,v 1.2.14.1 2006/01/24 14:50:12 rhinec Exp $ */

#include "boot.h"
#include "p18f4550.h"

/* Copyright (c)1999 Microchip Technology */

/* MPLAB-C18 startup code */

/* external reference to the user's main routine */
extern void main (void);
/* prototype for the startup function */
void _entry (void);
void startup (void);
//extern near char __FPFLAGS;
#define RND 6

#ifdef __MCC18
#pragma code _entry_scn=REMAPPED_APPLICATION_RESET_VECTOR
#endif
#ifdef __SDCC
#pragma code _entry 0x0
#endif
void _entry (void)
{
  __asm
    goto _startup
  __endasm;
}

#ifdef __MCC18
#pragma code _startup_scn
#endif
#ifdef __SDCC
#pragma code startup 0x1000
#endif
void startup (void)
{
  __asm
    // Initialize the stack pointer
    //lfsr 1, _stack
    //lfsr 2, _stack

    clrf    H'0FF8', 0 // 1st silicon doesn't do this on POR

    //bcf __FPFLAGS,RND,0 // Initalize rounding flag for floating point libs

    clrf    H'0FEA', 0    //the 0 indicates its in access ram
    clrf    H'0FE9', 0

RAMCLEAR:
    CLRWDT
    clrf    H'0FEE', 0
    btfss   H'0FEA', 3, 0
    goto    RAMCLEAR

  __endasm;
loop:

  // Call the user's main routine
  main ();

  goto loop;
}                               /* end _startup() */
