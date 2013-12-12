//*;###########################################################################
//;#            Author: Joe Dunne                                             #
//;#            Date 5/28/07                                                  #
//;#            Midi Comm routine                                             #
//;#            File Name: midicomm.c                                         #
//;#                                                                          #
//;############################################################################

#include "c_system.h"

void midi_tx() {
    // Check if we received a byte:
    if (PIR1bits.RCIF) return;

    // If no character is received, check if any data is pending transmission
    if (MIDITxBufOutPtr == MIDITxBufPtr) {
        midi_clear_buffer();        //no data to send, so reset transmit buffer.
        return;                     //and exit
    }

    if (!PIR1bits.TXIF) return;         //USART is still transmitting data

    TXREG = MIDITxBuffer[MIDITxBufOutPtr];          //send out the byte
    MIDITxBufOutPtr++;                          //increment transmit out pointer.

    return;
}

//-----------------------------------------------------------------------
// This routine will store a character into the MIDITxBuffer.
void midi_enq(unsigned char Input) {
    if (MIDITxBufPtr >= MAX_MIDI_TX_LENGTH) return;     //Exit if buffer full.
    MIDITxBuffer[MIDITxBufPtr] = Input; //Store value in buffer.
    MIDITxBufPtr++;                 //Update input ptr.
}

//-----------------------------------------------------------------------
// Reset TX Buffer.
void midi_clear_buffer(void) {
    MIDITxBufPtr = 0;       //Point to buffer start.
    MIDITxBufOutPtr = 0;        //Point to buffer start.
}
