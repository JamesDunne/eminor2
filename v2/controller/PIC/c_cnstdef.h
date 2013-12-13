//*;###########################################################################
//;#            Author: Ali Rizavi                                            #
//;#            Date 10/07/04                                                 #
//;#            MASTER SWITCH GENERATION 1.x                                  #
//;#            Init funtion header File                                      #
//;#            File Name: init.h                                             #
//;#                                                                          #
//;#            Updated 10/07/04 by AR                                        #
//;############################################################################

//-----------------------------------------------------------------------------
//Define constants here

//UART converter initialization constants:
#define INIT_TXSTA  0xA6    //master,8bit,async,1 stop bit,tx enable,high speed
#define INIT_RCSTA  0x90    //enabled,8bit, continuous
#define INIT_SPBRG  63      //31250 baud
#define INIT_SPBRGH 0x00

//A/D converter initialization constants:
#define INIT_ADCON0 0b01000000      //AN0, off
#define INIT_ADCON1 0b00001110      //1 analog channels
#define INIT_ADCON2 0b00000110      //Left justified, 0 TAD(manual), FOSC/32

//system timing:
#define SYSTEM_TIME_1MS         4       //in 250uS counts
#define SYSTEM_TIME_10MS        10      //in 1mS counts
#define SYSTEM_TIME_40MS        4       //in 10mS counts
#define SYSTEM_TIME_100MS       10      //in 10mS counts
#define SYSTEM_TIME_1S          100     //in 10mS counts

//interrupts:
#define INIT_INTCON         0b00100000  //interrupt on TMR0 overflow enabled
#define INIT_INTCON2        0b10000000  //PORTB pullups disabled

//timing constants:
#define INIT_T0CON          0b01000010  //timer0 disabled; 1:8 prescalar; 16-bit counter

#define	INIT_T1CON          0b00000000  //timer1 disabled; 1:1 prescalar,  8-bit R/W

#define INIT_T2CON          0x0D        //timer2 on, 1:4 prescale, 1:2 postscale

#define INIT_PR2            0xF9        //250uS interrupt
#define INIT_PIE1           0b00000011  //enable pr2 to tmr2 match interrupt, TMR1IE on

// 32 MHz clock cycle.
#define TMR1_BAUD9600_PERIOD    	834 // N counts * X ns = 104.167 us (9600 baud)
#define TMR1_ISR_LATENCY			176	// latency to next ISR

#define TMR1_START_LATENCY      0		// Subtract ISR code latency (see assembly listing of ISR code and calculate cycles)
#define TMR1_RELOAD_LATENCY     0

#define LATCH_STROBE_DELAY      16  //4uS minimum (time for shift register bits)
#define BTN_SAMPLE_DELAY        5   //probably unnecessary (sampling time for buttons)

//UART comm buffer lengths:
#define MAX_MIDI_TX_LENGTH      32
#define MAX_LCD_TX_LENGTH       42

// SWUART modes:
#define SWUARTMODE_TX_IDLE      0
#define SWUARTMODE_TX_START_BIT 1
#define SWUARTMODE_TX_BYTE      2

//Size of writable flash segment:
#define WRITABLE_SEG_ADDR       0x4900      //Also update this in the lkr file if it needs to change!!
#define WRITABLE_SEG_LEN        0x5FFF-WRITABLE_SEG_ADDR
