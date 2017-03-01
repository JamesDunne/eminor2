//*;###########################################################################
//;#            Author: Joe Dunne                                             #
//;#            Date 5/28/07                                                  #
//;#            Midi Comm routine                                             #
//;#            File Name: midicomm.c                                         #
//;#                                                                          #
//;############################################################################

#include "c_system.h"

#ifndef MIDI_BLOCKING
unsigned char MIDITxBuffer[MAX_MIDI_TX_LENGTH];
unsigned char MIDITxBufPtr;
unsigned char MIDITxBufOutPtr;

void midi_tx() {
    // If no character is received, check if any data is pending transmission
    if (MIDITxBufOutPtr == MIDITxBufPtr) {
        midi_clear_buffer();        //no data to send, so reset transmit buffer.
        return;                     //and exit
    }

    // USART is still transmitting data
    if (PIR1bits.TXIF == 0) {
        return;
    }

    // Send out the byte:
    TXREG = MIDITxBuffer[MIDITxBufOutPtr];
    // Increment transmit out pointer:
    MIDITxBufOutPtr++;

    return;
}

//-----------------------------------------------------------------------
// This routine will store a character into the MIDITxBuffer.
void midi_enq(unsigned char Input) {
    if (MIDITxBufPtr >= MAX_MIDI_TX_LENGTH) {
        return;     //Exit if buffer full.
    }
    MIDITxBuffer[MIDITxBufPtr] = Input; //Store value in buffer.
    MIDITxBufPtr++;                 //Update input ptr.
    midi_tx();
}

//-----------------------------------------------------------------------
// Reset TX Buffer.
void midi_clear_buffer(void) {
    MIDITxBufPtr = 0;       //Point to buffer start.
    MIDITxBufOutPtr = 0;        //Point to buffer start.
}
#endif
