//*;###########################################################################
//;#            Author: Joe Dunne                                             #
//;#            Date 4/06/07                                                  #
//;#            Main arbitrator                                               #
//;#            File Name: main.c                                             #
//;#                                                                          #
//;############################################################################


#include "c_system.h"

void init(void) {
#asm
    clrf    FSR0H
    clrf    FSR0L

RAMCLEAR1:
    CLRWDT
    clrf    POSTINC0
    btfss   FSR0H, 3
    bra RAMCLEAR1
#endasm

    LATA = INIT_LATA;
    LATB = INIT_LATB;
    LATC = INIT_LATC;
    LATD = INIT_LATD;
    LATE = INIT_LATE;

    TRISA = INIT_TRISA;
    TRISB = INIT_TRISB;
    TRISC = INIT_TRISC;
    TRISD = INIT_TRISD;
    TRISE = INIT_TRISE;

//Initialize the USART control registers
    TXSTA = INIT_TXSTA;
    RCSTA = INIT_RCSTA;
//  BAUDCONbits.BRG16 = true;
    SPBRG = INIT_SPBRG;
    SPBRGH = INIT_SPBRGH;

//These constants setup the application's MCU Analog-to-Digital Converter module.
    ADCON0  = INIT_ADCON0;
    ADCON1  = INIT_ADCON1;
    ADCON2  = INIT_ADCON2;

//set up timer0 to interrupt at some interval..
    INTCON = INIT_INTCON;
    INTCON2 = INIT_INTCON2;
    RCONbits.IPEN = 1;            //enable priority levels

    TMR0H = 0;                    //clear timer
    TMR0L = 0;                    //clear timer
    T0CON = INIT_T0CON;           //set up timer0

    TMR1H = 0;                    //clear timer
    TMR1L = 0;                    //clear timer
    T1CON = INIT_T1CON;           //set up timer1

    TMR2 = 0;
    PR2 = INIT_PR2;
    T2CON = INIT_T2CON;             //enable the timer and set up the scalars

    PIE1 = INIT_PIE1;
    INTCONbits.GIEH = 1;          //enable interrupts
}
