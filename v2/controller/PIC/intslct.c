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

#ifdef __MCC18
#pragma code InterruptVectorHigh = 0x1008
void InterruptVectorHigh (void)
{
  _asm
    goto InterruptHandlerHigh //jump to interrupt routine
  _endasm
}
#endif

//----------------------------------------------------------------------------
// High priority interrupt routine

#ifdef __MCC18
#pragma code
#pragma interrupt InterruptHandlerHigh
#endif
void InterruptHandlerHigh (void)
#ifdef __SDCC
__interrupt 1
#endif
{
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

#ifdef __MCC18
#pragma code
#endif

//----------------------------------------------------------------------------
