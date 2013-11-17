//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 5/28/07					      						  #
//;#			Midi Comm routine								  			  #
//;#			File Name: midicomm.c  										  #
//;#																		  #
//;############################################################################

#include "c_system.h"

void	MIDI_COMM_ROUTINE() {
	unsigned char tReceivedChar, tempvar1, tempvar0;
	unsigned short RAMPtr;

//Check if we received a byte:	
	if (!PIR1bits.RCIF) {

		//If no character is received, check if any data is pending transmission
		if (TxBufOutPtr == TxBufPtr) {
			RESET_MIDI_TX_BUFFER();		//no data to send, so reset transmit buffer.
			return;						//and exit
		}

//--------------------------------------------------------------
//						Handle transmitting data
//--------------------------------------------------------------

		if (!PIR1bits.TXIF) return;			//USART is still transmitting data

		TXREG = TxBuffer[TxBufOutPtr];			//send out the byte
		TxBufOutPtr++;							//increment transmit out pointer.

		return;						//exit
	}

	tglbit(LedStates,2);

//handle the received character:
	if (RCSTAbits.OERR || RCSTAbits.FERR) {		//Overrun or framing error?
		RCSTAbits.CREN = false;
		tempvar1 = RCREG;
		tempvar1 = RCREG;
		RCSTAbits.CREN = true;
		TildeFlg = false;
		return;
	}
//--------------------------------------------------------------
//						Handle receiving queries
//--------------------------------------------------------------

#if 0
	tReceivedChar = RCREG;		//read received byte

	tglbit(LedStates,3);

	// Put tReceivedChar in a buffer and do something with it...
	if (midiInBufPtr >= 23) return;		//Exit if buffer full.
	midiInData[midiInBufPtr] = tReceivedChar;
	midiInBufPtr++;
#endif

	return;
}


//-----------------------------------------------------------------------
//This routine will store a character into the TxBuffer.
void	MIDI_ENQUEUE(unsigned char Input) {
	//RS232 Query
	if (TxBufPtr >= MAX_TX_LENGTH) return;		//Exit if buffer full.
	TxBuffer[TxBufPtr] = Input;	//Store value in buffer.
	TxBufPtr++;					//Update input ptr.
}

//-----------------------------------------------------------------------
//Reset TX Buffer.
void	RESET_MIDI_TX_BUFFER(void) {
	TxBufPtr = 0;		//Point to buffer start.
	TxBufOutPtr = 0;		//Point to buffer start.
}
