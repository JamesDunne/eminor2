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
    //swuart_tx_buffer[0] = v;
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
    startTimer1(TMR1_BAUD9600_PERIOD);
}

// ISR for SWUART:
void swuart_tx_interrupt(void) {
    switch (swuart_mode) {
        case SWUARTMODE_TX_IDLE:
            // IDLE mode; do nothing.
            break;
        case SWUARTMODE_TX_START_BIT:
            swuart_mode++;  // = SWUARTMODE_TX_BYTE;
            swuart_txmask = 0x01;
            // Transmit start bit:
            SWUART_TX_LAT_BIT = false;
            break;
        case SWUARTMODE_TX_BYTE:
            if (swuart_txmask == 0) {
                // Last bit has been transmitted; transmit stop bit:
                SWUART_TX_LAT_BIT = true;
                swuart_mode++;  // = SWUARTMODE_TX_STOP_BIT;
                break;
            }

            // Shift bit to transmit into carry flag:
            if (chkbit(swuart_txbyte, 0)) {
                SWUART_TX_LAT_BIT = true;
            } else {
                SWUART_TX_LAT_BIT = false;
            }

            swuart_txbyte >>= 1;
            swuart_txmask <<= 1;
            break;
        case SWUARTMODE_TX_STOP_BIT:
            // Stop bit transmission complete.

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
}
