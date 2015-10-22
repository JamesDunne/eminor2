//*;###########################################################################
//;#            Author: Joe Dunne                                             #
//;#            Date 10/07/04                                                 #
//;#            MASTER SWITCH GENERATION 1.x                                  #
//;#            System header File                                            #
//;#            File Name: c_system.h                                         #
//;#                                                                          #
//;############################################################################
#include "_tools.h"
#include "p18f4550.h"
#include "c_cnstdef.h"
#include "c_ramdef.h"
#include "c_portdef.h"

//-----------------------------------------------------------------------------
//macros:
#define ENABLE_ALL_INTERRUPTS()     \
    INTCONbits.GIEH = true;         \
    INTCONbits.GIEL = true;

#define DISABLE_ALL_INTERRUPTS()    \
    INTCONbits.GIEH = false;        \
    INTCONbits.GIEL = false;

//-----------------------------------------------------------------------------
//generic function prototypes:
void    CLEAR_RAM(void);        //asm function.
void    SendDataToShiftReg16(unsigned char data1, unsigned char data2);
void    SetDipAddress(unsigned char Address);
void    EraseProgMem(void);
void    WriteProgMem(unsigned char index);

//routine prototypes:
void    InterruptHandlerHigh();
void    SystemTimeRoutine(void);
void    init(void);

void    UpdateLeds(void);
void    ReadButtons(void);

void    midi_clear_buffer(void);
void    midi_enq(unsigned char Input);
void    midi_tx(void);

void    lcd_init(void);
void    lcd_clear_buffer(void);
void    lcd_enqueue(unsigned char Input);
void    lcd_update_screen(void);

void    swuart_tx_start(void);
void    swuart_tx_interrupt(void);

extern rom unsigned char ROM_SAVEDATA[3][4096];
//-----------------------------------------------------------------------------

// NOTE(jsd): These macros are just plain broken on the MPLAB SIM; unknown on PIC18.

#define startTimer1(period)    {   \
    T1CONbits.TMR1ON = 0;   \
    PIR1bits.TMR1IF = 0;    \
    tTimer1Value.s_form = 0xFFFF - ((period) - TMR1_START_LATENCY);    \
    TMR1L = tTimer1Value.b_form.low;    \
    TMR1H = tTimer1Value.b_form.high;   \
    T1CONbits.TMR1ON = 1;    \
}

#define reloadTimer1(period)    {   \
    T1CONbits.TMR1ON = 0;   \
    PIR1bits.TMR1IF = 0;    \
    tTimer1Value.b_form.low = TMR1L;    \
    tTimer1Value.b_form.high = TMR1H;   \
    tTimer1Value.s_form -= (period) - TMR1_RELOAD_LATENCY;    \
    TMR1L = tTimer1Value.b_form.low;    \
    TMR1H = tTimer1Value.b_form.high;   \
    T1CONbits.TMR1ON = 1;    \
}

#define stopTimer1()    {   \
    T1CONbits.TMR1ON = 0;   \
    PIR1bits.TMR1IF = 0;    \
    TMR1L = 0;    \
    TMR1H = 0;   \
}
