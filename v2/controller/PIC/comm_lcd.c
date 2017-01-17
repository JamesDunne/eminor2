//;############################################################################
//;#            Author: James Dunne                                           #
//;#            Date 2013-12-12                                               #
//;#            RS232 Comm routine for LCD                                    #
//;############################################################################

#include "c_system.h"
#include "typedefs.h"
#include "hardware.h"

// LCD communication is done with a bit-banged RS232 impl using timer interrupts
// with RD7 as the TX pin. No RX is necessary.

unsigned char swuart_tx_buffer[MAX_LCD_TX_LENGTH];
unsigned char swuart_tx_bufptr;
unsigned char swuart_tx_bufoutptr;

unsigned char swuart_txbyte;
unsigned char swuart_txmask;
unsigned char swuart_mode;
unsigned char swuart_started;

unsigned char LCDUpdateStage;

// TODO: inline LCDRamMap rows of chars with commands to erase screen and change cursor position so it can be
// sent as one blob without queueing individual characters and doubling memory requirements.
char LCDRamMap[4][20];

// Wait for the LCD to initialize.
void lcd_init(void) {
    unsigned char i;

    // Disable timer interrupt:
    DISABLE_ALL_INTERRUPTS();
    PIE1bits.TMR1IE = 0;

    // Wait ~100ms for the LCD to boot up:
    SWUART_TX_LAT_BIT = 1;
    for (i=0; i<80; ++i) {
        // ~10ms timer:
        T1CONbits.TMR1ON = 0;
        PIR1bits.TMR1IF = 0;
        TMR1L = 0x00;
        TMR1H = 0x00;
        T1CONbits.TMR1ON = 1;
        while (PIR1bits.TMR1IF == 0);
        PIR1bits.TMR1IF = 0;
    }

    PIE1bits.TMR1IE = 1;

    // Start up the SWUART timer interrupt:
    ENABLE_ALL_INTERRUPTS();
}

void lcd_update_screen(void) {
    u8 i, row;

    // Since we have a small buffer, let's not overload it:
    if (swuart_tx_bufoutptr > 0) {
        return;
    }

    row = LCDUpdateStage;

    // Position cursor on start of row, col 1:
    lcd_enqueue(0xFE);
    lcd_enqueue(0x45);
    switch (row) {
        case 0: lcd_enqueue(0x00); break;
        case 1: lcd_enqueue(0x40); break;
        case 2: lcd_enqueue(0x14); break;
        case 3: lcd_enqueue(0x54); break;
    }

    // Queue up the row of chars:
    for (i = 0; i < LCD_COLS; ++i) {
        lcd_enqueue(LCDRamMap[row][i]);
    }

    LCDUpdateStage++;
    if (LCDUpdateStage >= LCD_ROWS) {
        LCDUpdateStage = 0;
        LCDUpdate = false;
    }
}

void lcd_enqueue(unsigned char v) {
    if (swuart_tx_bufptr >= MAX_LCD_TX_LENGTH) {
        return;
    }
    swuart_tx_buffer[swuart_tx_bufptr] = v;
    swuart_tx_bufptr++;

    if (swuart_started) {
        return;
    }
    swuart_tx_start();
}

// -------------------------------- Software UART (SWUART) implementation:

void swuart_tx_start(void) {
    // TODO(jsd): Need critical section here? disable interrupts?

    // Set SWUART to TX mode:
    swuart_mode = SWUARTMODE_TX_START_BIT;
    swuart_started = 1;

    // Enable SWUART timer (timer 1):
    T1CONbits.TMR1ON = 0;
    TMR1L = ((unsigned short)0xFFFF - ((unsigned short)TMR1_BAUD9600_PERIOD) - (unsigned short)2) & 0xFF;   // 0x80
    TMR1H = (((unsigned short)0xFFFF - ((unsigned short)TMR1_BAUD9600_PERIOD) - (unsigned short)2) >> 8) & 0xFF;    // 0xFE
    T1CONbits.TMR1ON = 1;
}

// ISR for SWUART:
void swuart_tx_interrupt(void) {
    // Reset timer:
    PIR1bits.TMR1IF = 0;
    T1CONbits.TMR1ON = 0;
    TMR1L = ((unsigned short)0xFFFF - ((unsigned short)TMR1_BAUD9600_PERIOD - (unsigned short)TMR1_ISR_LATENCY)) & 0xFF;    // 0x80
    TMR1H = (((unsigned short)0xFFFF - ((unsigned short)TMR1_BAUD9600_PERIOD - (unsigned short)TMR1_ISR_LATENCY)) >> 8) & 0xFF; // 0xFE
    T1CONbits.TMR1ON = 1;

    switch (swuart_mode) {
        case SWUARTMODE_TX_IDLE:
            // IDLE mode; do nothing.
            break;
        case SWUARTMODE_TX_START_BIT:
            swuart_mode = SWUARTMODE_TX_BYTE;
            swuart_txmask = 0x01;
            swuart_txbyte = swuart_tx_buffer[swuart_tx_bufoutptr];

            // Transmit start bit:
            SWUART_TX_LAT_BIT = 0;
            break;
        case SWUARTMODE_TX_BYTE:
            if (swuart_txmask == 0) {
                // Last bit has been transmitted; transmit stop bit:
                SWUART_TX_LAT_BIT = 1;

                ++swuart_tx_bufoutptr;
                if (swuart_tx_bufoutptr >= swuart_tx_bufptr) {
                    // Ran out of bytes to transmit:
                    swuart_mode = SWUARTMODE_TX_IDLE;
                    swuart_started = 0;
                    // Reset TX buffer:
                    swuart_tx_bufoutptr = 0;
                    swuart_tx_bufptr = 0;

                    // Shut down timer for idle mode:
                    stopTimer1();
                    break;
                }

                // Queue up next byte and send start bit:
                swuart_txbyte = swuart_tx_buffer[swuart_tx_bufoutptr];
                swuart_mode = SWUARTMODE_TX_START_BIT;
                break;
            }

            // Shift bit to transmit into carry flag:
            if (swuart_txbyte & 1) {
                SWUART_TX_LAT_BIT = 1;
            } else {
                SWUART_TX_LAT_BIT = 0;
            }

            swuart_txbyte >>= 1;
            swuart_txmask <<= 1;
            break;
    }
}
