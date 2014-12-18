//###########################################################################
//#         Author: Joe Dunne                                             #
//#         Date 1/27/05                                                  #
//#         PORT DEFINITIONS header file                                  #
//#         File Name: c_portdef.h                                        #
//#                                                                       #
//#         Updated 1/27/05 by JD                                         #
//############################################################################

#define INPUT                       1
#define OUTPUT                      0

//PORTA Definitions
#define BTN_S3_BIT                      0
#define BTN_S3_PIN                      PORTAbits.RA0   //Pin 2
#define BTN_S3_LAT_BIT                  LATAbits.LATA0
#define BTN_S3_LAT                      LATA
#define BTN_S3_TRIS_BIT                 TRISAbits.TRISA0
#define BTN_S3_PORT                     PORTA
#define TRISAPIN0                       (OUTPUT<<0)
#define LATAPIN0                        (false<<0)

#define SHIFTREG_SRCK_BIT               1
#define SHIFTREG_SRCK_PIN               PORTAbits.RA1   //Pin 3
#define SHIFTREG_SRCK_LAT_BIT           LATAbits.LATA1
#define SHIFTREG_SRCK_LAT               LATA
#define SHIFTREG_SRCK_TRIS_BIT          TRISAbits.TRISA1
#define SHIFTREG_SRCK_PORT              PORTA
#define TRISAPIN1                       (OUTPUT<<1)
#define LATAPIN1                        (false<<1)

#define SHIFTREG_RCK_BIT                2
#define SHIFTREG_RCK_PIN                PORTAbits.RA2   //Pin 4
#define SHIFTREG_RCK_LAT_BIT            LATAbits.LATA2
#define SHIFTREG_RCK_LAT                LATA
#define SHIFTREG_RCK_TRIS_BIT           TRISAbits.TRISA2
#define SHIFTREG_RCK_PORT               PORTA
#define TRISAPIN2                       (OUTPUT<<2)
#define LATAPIN2                        (false<<2)

#define SHIFTREG_SER_IN_BIT             3
#define SHIFTREG_SER_IN_PIN             PORTAbits.RA3   //Pin 5
#define SHIFTREG_SER_IN_LAT_BIT         LATAbits.LATA3
#define SHIFTREG_SER_IN_LAT             LATA
#define SHIFTREG_SER_IN_TRIS_BIT        TRISAbits.TRISA3
#define SHIFTREG_SER_IN_PORT            PORTA
#define TRISAPIN3                       (OUTPUT<<3)
#define LATAPIN3                        (false<<3)

#define BTN_S0_BIT                      4
#define BTN_S0_PIN                      PORTAbits.RA4   //Pin 6
#define BTN_S0_LAT_BIT                  LATAbits.LATA4
#define BTN_S0_LAT                      LATA
#define BTN_S0_TRIS_BIT                 TRISAbits.TRISA4
#define BTN_S0_PORT                     PORTA
#define TRISAPIN4                       (OUTPUT<<4)
#define LATAPIN4                        (false<<4)

#define BTN_S1_BIT                      5
#define BTN_S1_PIN                      PORTAbits.RA5   //Pin 7
#define BTN_S1_LAT_BIT                  LATAbits.LATA5
#define BTN_S1_LAT                      LATA
#define BTN_S1_TRIS_BIT                 TRISAbits.TRISA5
#define BTN_S1_PORT                     PORTA
#define TRISAPIN5                       (OUTPUT<<5)
#define LATAPIN5                        (false<<5)

#define INIT_TRISA      (TRISAPIN0+TRISAPIN1+TRISAPIN2+TRISAPIN3+TRISAPIN4+TRISAPIN5)
#define INIT_LATA       (LATAPIN0+LATAPIN1+LATAPIN2+LATAPIN3+LATAPIN4+LATAPIN5)
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//PORTB Definitions
#define LCD_TX_BIT                      0
#define LCD_TX_PIN                      PORTBbits.RB0   //Pin 33
#define LCD_TX_LAT_BIT                  LATBbits.LATB0
#define LCD_TX_LAT                      LATB
#define LCD_TX_TRIS_BIT                 TRISBbits.TRISB0
#define LCD_TX_PORT                     PORTB
#define TRISBPIN0                       (OUTPUT<<0)
#define LATBPIN0                        (false<<0)

#define DISP_COM4_BIT                   1
#define DISP_COM4_PIN                   PORTBbits.RB1   //Pin 34
#define DISP_COM4_LAT_BIT               LATBbits.LATB1
#define DISP_COM4_LAT                   LATB
#define DISP_COM4_TRIS_BIT              TRISBbits.TRISB1
#define DISP_COM4_PORT                  PORTB
#define TRISBPIN1                       (OUTPUT<<1)
#define LATBPIN1                        (false<<1)

#define DISP_COM3_BIT                   2
#define DISP_COM3_PIN                   PORTBbits.RB2   //Pin 35
#define DISP_COM3_LAT_BIT               LATBbits.LATB2
#define DISP_COM3_LAT                   LATB
#define DISP_COM3_TRIS_BIT              TRISBbits.TRISB2
#define DISP_COM3_PORT                  PORTB
#define TRISBPIN2                       (OUTPUT<<2)
#define LATBPIN2                        (false<<2)

#define DISP_COM2_BIT                   3
#define DISP_COM2_PIN                   PORTBbits.RB3   //Pin 36
#define DISP_COM2_LAT_BIT               LATBbits.LATB3
#define DISP_COM2_LAT                   LATB
#define DISP_COM2_TRIS_BIT              TRISBbits.TRISB3
#define DISP_COM2_PORT                  PORTB
#define TRISBPIN3                       (OUTPUT<<3)
#define LATBPIN3                        (false<<3)

#define BTN_PRESET_1_BIT                4
#define BTN_PRESET_1_PIN                PORTBbits.RB4   //Pin 37
#define BTN_PRESET_1_LAT_BIT            LATBbits.LATB4
#define BTN_PRESET_1_LAT                LATB
#define BTN_PRESET_1_TRIS_BIT           TRISBbits.TRISB0
#define BTN_PRESET_1_PORT               PORTB
#define TRISBPIN4                       (INPUT<<4)
#define LATBPIN4                        (false<<4)

#define DISP_COM0_BIT                   5
#define DISP_COM0_PIN                   PORTBbits.RB5   //Pin 38
#define DISP_COM0_LAT_BIT               LATBbits.LATB5
#define DISP_COM0_LAT                   LATB
#define DISP_COM0_TRIS_BIT              TRISBbits.TRISB5
#define DISP_COM0_PORT                  PORTB
#define TRISBPIN5                       (OUTPUT<<5)
#define LATBPIN5                        (false<<5)

#define UNUSED1_OFF_BIT                 6
#define UNUSED1_PIN                     PORTBbits.RB6   //Pin 39
#define UNUSED1_LAT_BIT                 LATBbits.LATB6
#define UNUSED1_LAT                     LATB
#define UNUSED1_TRIS_BIT                TRISBbits.TRISB6
#define UNUSED1_PORT                    PORTB
#define TRISBPIN6                       (OUTPUT<<6)
#define LATBPIN6                        (false<<6)

#define UNUSED2_BIT                     7
#define UNUSED2_PIN                     PORTBbits.RB7   //Pin 40
#define UNUSED2_LAT_BIT                 LATBbits.LATB7
#define UNUSED2_LAT                     LATB
#define UNUSED2_TRIS_BIT                TRISBbits.TRISB7
#define UNUSED2_PORT                    PORTB
#define TRISBPIN7                       (OUTPUT<<7)
#define LATBPIN7                        (false<<7)

#define INIT_TRISB  (TRISBPIN0+TRISBPIN1+TRISBPIN2+TRISBPIN3+TRISBPIN4+TRISBPIN5+TRISBPIN6+TRISBPIN7)
#define INIT_LATB   (LATBPIN0+LATBPIN1+LATBPIN2+LATBPIN3+LATBPIN4+LATBPIN5+LATBPIN6+LATBPIN7)
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//PORTC Definitions

//VUSB
#define TRISCPIN3                       (INPUT<<3)  //input only
#define LATCPIN3                        (false<<3)

#define USBDM_BIT                       4
#define USBDM_PIN                       PORTCbits.RC4   //Pin 23
#define USBDM_LAT_BIT                   LATCbits.LATC4
#define USBDM_LAT                       LATC
#define USBDM_TRIS_BIT                  TRISCbits.TRISC4
#define USBDM_PORT                      PORTC
#define TRISCPIN4                       (INPUT<<4)      //input only
#define LATCPIN4                        (false<<4)

#define USBDP_BIT                       5
#define USBDP_PIN                       PORTCbits.RC5   //Pin 24
#define USBDP_LAT_BIT                   LATCbits.LATC5
#define USBDP_LAT                       LATC
#define USBDP_TRIS_BIT                  TRISCbits.TRISC5
#define USBDP_PORT                      PORTC
#define TRISCPIN5                       (INPUT<<5)  //input only
#define LATCPIN5                        (false<<5)

#define TX_BIT                          6
#define TX_PIN                          PORTCbits.RC6   //Pin 25
#define TX_LAT_BIT                      LATCbits.LATC6
#define TX_LAT                          LATC
#define TX_TRIS_BIT                     TRISCbits.TRISC6
#define TX_PORT                         PORTC
#define TRISCPIN6                       (INPUT<<6)
#define LATCPIN6                        (false<<6)

#define RX_BIT                          7
#define RX_PIN                          PORTCbits.RC7   //Pin 26
#define RX_LAT_BIT                      LATCbits.LATC7
#define RX_LAT                          LATC
#define RX_TRIS_BIT                     TRISCbits.TRISC7
#define RX_PORT                         PORTC
#define TRISCPIN7                       (INPUT<<7)
#define LATCPIN7                        (false<<7)

#define INIT_TRISC  (TRISCPIN3+TRISCPIN4+TRISCPIN5+TRISCPIN6+TRISCPIN7)
#define INIT_LATC   (LATCPIN3+LATCPIN4+LATCPIN5+LATCPIN6+LATCPIN7)
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//PORTD Definitions
#define UNUSED_5_BIT                    0
#define UNUSED_5_PIN                    PORTDbits.RD0   //Pin 19
#define UNUSED_5_LAT_BIT                LATDbits.LATD0
#define UNUSED_5_LAT                    LATD
#define UNUSED_5_TRIS_BIT               TRISDbits.TRISD0
#define UNUSED_5_PORT                   PORTD
#define TRISDPIN0                       (OUTPUT<<0)
#define LATDPIN0                        (false<<0)

#define UNUSED_6_BIT                    1
#define UNUSED_6_PIN                    PORTDbits.RD1   //Pin 20
#define UNUSED_6_LAT_BIT                LATDbits.LATD1
#define UNUSED_6_LAT                    LATD
#define UNUSED_6_TRIS_BIT               TRISDbits.TRISD1
#define UNUSED_6_PORT                   PORTD
#define TRISDPIN1                       (OUTPUT<<1)
#define LATDPIN1                        (false<<1)

#define DISP_SEG7_BIT                   2
#define DISP_SEG7_PIN                   PORTDbits.RD2   //Pin 21
#define DISP_SEG7_LAT_BIT               LATDbits.LATD2
#define DISP_SEG7_LAT                   LATD
#define DISP_SEG7_TRIS_BIT              TRISDbits.TRISD2
#define DISP_SEG7_PORT                  PORTD
#define TRISDPIN2                       (OUTPUT<<2)
#define LATDPIN2                        (false<<2)

#define DISP_SEG6_BIT                   3
#define DISP_SEG6_PIN                   PORTDbits.RD3   //Pin 22
#define DISP_SEG6_LAT_BIT               LATDbits.LATD3
#define DISP_SEG6_LAT                   LATD
#define DISP_SEG6_TRIS_BIT              TRISDbits.TRISD3
#define DISP_SEG6_PORT                  PORTD
#define TRISDPIN3                       (OUTPUT<<3)
#define LATDPIN3                        (false<<3)

#define DISP_SEG4_BIT                   4
#define DISP_SEG4_PIN                   PORTDbits.RD4   //Pin 27
#define DISP_SEG4_LAT_BIT               LATDbits.LATD4
#define DISP_SEG4_LAT                   LATD
#define DISP_SEG4_TRIS_BIT              TRISDbits.TRISD4
#define DISP_SEG4_PORT                  PORTD
#define TRISDPIN4                       (OUTPUT<<4)
#define LATDPIN4                        (false<<4)

#define DISP_SEG3_BIT                   5
#define DISP_SEG3_PIN                   PORTDbits.RD5   //Pin 28
#define DISP_SEG3_LAT_BIT               LATDbits.LATD5
#define DISP_SEG3_LAT                   LATD
#define DISP_SEG3_TRIS_BIT              TRISDbits.TRISD5
#define DISP_SEG3_PORT                  PORTD
#define TRISDPIN5                       (OUTPUT<<5)
#define LATDPIN5                        (false<<5)

#define DISP_SEG2_BIT                   6
#define DISP_SEG2_PIN                   PORTDbits.RD6   //Pin 29
#define DISP_SEG2_LAT_BIT               LATDbits.LATD6
#define DISP_SEG2_LAT                   LATD
#define DISP_SEG2_TRIS_BIT              TRISDbits.TRISD6
#define DISP_SEG2_PORT                  PORTD
#define TRISDPIN6                       (OUTPUT<<6)
#define LATDPIN6                        (false<<6)

#define SWUART_TX_BIT                   7
#define SWUART_TX_PIN                   PORTDbits.RD7   //Pin 30
#define SWUART_TX_LAT_BIT               LATDbits.LATD7
#define SWUART_TX_LAT                   LATD
#define SWUART_TX_TRIS_BIT              TRISDbits.TRISD7
#define SWUART_TX_PORT                  PORTD
#define TRISDPIN7                       (OUTPUT<<7)
#define LATDPIN7                        (false<<7)

#define INIT_TRISD  (TRISDPIN0+TRISDPIN1+TRISDPIN2+TRISDPIN3+TRISDPIN4+TRISDPIN5+TRISDPIN6+TRISDPIN7)
#define INIT_LATD   (LATDPIN0+LATDPIN1+LATDPIN2+LATDPIN3+LATDPIN4+LATDPIN5+LATDPIN6+LATDPIN7)
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//PORTE Definitions
#define BTN_S2_BIT                      0
#define BTN_S2_PIN                      PORTEbits.RE0   //Pin 8
#define BTN_S2_LAT_BIT                  LATEbits.LATE0
#define BTN_S2_LAT                      LATE
#define BTN_S2_TRIS_BIT                 TRISEbits.TRISE0
#define BTN_S2_PORT                     PORTE
#define TRISEPIN0                       (OUTPUT<<0)
#define LATEPIN0                        (false<<0)

#define BTN_IN_BIT                      1
#define BTN_IN_PIN                      PORTEbits.RE1   //Pin 9
#define BTN_IN_LAT_BIT                  LATEbits.LATE1
#define BTN_IN_LAT                      LATE
#define BTN_IN_TRIS_BIT                 TRISEbits.TRISE1
#define BTN_IN_PORT                     PORTE
#define TRISEPIN1                       (INPUT<<1)
#define LATEPIN1                        (false<<1)

#define UNUSED_7_BIT                    2
#define UNUSED_7_PIN                    PORTEbits.RE2   //Pin 10
#define UNUSED_7_LAT_BIT                LATEbits.LATE2
#define UNUSED_7_LAT                    LATE
#define UNUSED_7_TRIS_BIT               TRISEbits.TRISE2
#define UNUSED_7_PORT                   PORTE
#define TRISEPIN2                       (OUTPUT<<2)
#define LATEPIN2                        (false<<2)

#define INIT_TRISE  (TRISEPIN0+TRISEPIN1+TRISEPIN2)
#define INIT_LATE   (LATEPIN0+LATEPIN1+LATEPIN2)

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++



//-----------------------------------------------------------------------------
//Update history:
