//#######################################################################
/**
* @file intslct.c
* interrupt handler
*
* @author Joe Dunne
* @date 2/02/05
* @brief RS232/USB communication routine
*/
//          *See Updates section at bottom of file*
//#######################################################################

#include "c_system.h"

#pragma code InterruptVectorHigh = 0x1008
void InterruptVectorHigh (void)
{
  _asm
    goto InterruptHandlerHigh //jump to interrupt routine
  _endasm
}

//----------------------------------------------------------------------------
// High priority interrupt routine

#pragma code

#pragma interrupt InterruptHandlerHigh
void InterruptHandlerHigh (void) {
    if (PIR1bits.TMR1IF) {
        // Call to SWUART for timer1:
        swuart_tx_interrupt();
    }

    if (PIR1bits.TMR2IF) {
        PIR1bits.TMR2IF = 0;            //clear interrupt flag

        // Every 250uS routine:
        SystickCntr++;
        if (SystickCntr == SYSTEM_TIME_1MS) {
            SystickCntr = 0;

            // Every 1mS routine:
            Systick = true;
            //Process7Segs();
        }
    }
}

#pragma code

//----------------------------------------------------------------------------
