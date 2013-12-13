//;############################################################################
//;#            Author: James Dunne                                           #
//;#            Date 2013-12-12                                               #
//;#            RS232 Comm routine for LCD                                    #
//;############################################################################

#include "c_system.h"

// LCD communication is done with a bit-banged RS232 impl using timer interrupts
// with RD7 as the TX pin. No RX is necessary.

void lcd_enqueue(unsigned char v) {
    if (swuart_tx_bufptr >= MAX_LCD_TX_LENGTH) return;
    swuart_tx_buffer[swuart_tx_bufptr] = v;
    swuart_tx_bufptr++;
}

// -------------------------------- Software UART (SWUART) implementation:

void swuart_tx_start(void) {
    // TODO(jsd): Need critical section here? disable interrupts?

    if (swuart_mode != SWUARTMODE_TX_IDLE) return;
    if (swuart_tx_bufptr == swuart_tx_bufoutptr) return;

    // Set SWUART to TX mode:
    swuart_mode = SWUARTMODE_TX_START_BIT;
    swuart_txbyte = swuart_tx_buffer[swuart_tx_bufoutptr];

    // Enable SWUART timer (timer 1):
	T1CONbits.TMR1ON = 0;
	TMR1L = ((unsigned short)0xFFFF - ((unsigned short)TMR1_BAUD9600_PERIOD) - (unsigned short)2) & 0xFF;	// 0x80
	TMR1H = (((unsigned short)0xFFFF - ((unsigned short)TMR1_BAUD9600_PERIOD) - (unsigned short)2) >> 8) & 0xFF;	// 0xFE
	T1CONbits.TMR1ON = 1;
}

// ISR for SWUART:
void swuart_tx_interrupt(void) {
	// Reset timer:
	PIR1bits.TMR1IF = 0;
	T1CONbits.TMR1ON = 0;
	TMR1L = ((unsigned short)0xFFFF - ((unsigned short)TMR1_BAUD9600_PERIOD - (unsigned short)TMR1_ISR_LATENCY)) & 0xFF;	// 0x80
	TMR1H = (((unsigned short)0xFFFF - ((unsigned short)TMR1_BAUD9600_PERIOD - (unsigned short)TMR1_ISR_LATENCY)) >> 8) & 0xFF;	// 0xFE
	T1CONbits.TMR1ON = 1;

    switch (swuart_mode) {
        case SWUARTMODE_TX_IDLE:
            // IDLE mode; do nothing.
            break;
        case SWUARTMODE_TX_START_BIT:
            swuart_mode++;  // = SWUARTMODE_TX_BYTE;
            swuart_txmask = 0x01;
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
