
/** I N C L U D E S **********************************************************/
#include "p18f4550.h"
#include "c_system.h"
#include "typedefs.h"
#include "usb.h"

void PROCESS_COMM_REQUEST(void);
//void RemCapCalculation(void);

void HIDSetReportHandler(void) {
	USBQuery = true;
	PROCESS_COMM_REQUEST();
	USBQuery = false;	
}
//-----------------------------------------------------------------------
void HIDGetReportHandler(void) {
//load up CtrlTrfData with data.
	USBQuery = true;
	PROCESS_COMM_REQUEST();
	ctrl_trf_session_owner = MUID_HID;
	pSrc.bRam = (byte*)&CtrlTrfData;
	usb_stat.ctrl_trf_mem = _RAM;       // Set memory type
	USBQuery = false;
}

/*

typedef union DATA_PACKET
{
    byte _byte[HID_INT_OUT_EP_SIZE];  //For byte access
    word _word[HID_INT_OUT_EP_SIZE/2];//For word access(USBGEN_EP_SIZE msut be even)
    struct
    {
        enum
        {
            READ_VERSION    = 0x00,
//            READ_FLASH      = 0x01,
//            WRITE_FLASH     = 0x02,
//            ERASE_FLASH     = 0x03,
//            READ_EEDATA     = 0x04,
//            WRITE_EEDATA    = 0x05,
//            READ_CONFIG     = 0x06,
//            WRITE_CONFIG    = 0x07,
            ID_BOARD        = 0x31,
            UPDATE_LED      = 0x32,
            SET_TEMP_REAL   = 0x33,
            RD_TEMP         = 0x34,
            SET_TEMP_LOGGING= 0x35,
            RD_TEMP_LOGGING = 0x36,
            RD_POT          = 0x37,
            RESET           = 0xFF
        }CMD;
        byte len;
    };
    struct
    {
        unsigned :8;
        byte ID;
    };
    struct
    {
        unsigned :8;
        byte led_num;
        byte led_status;
    };
    struct
    {
        unsigned :8;
        word word_data;
    };
} DATA_PACKET;

DATA_PACKET dataPacket;

void ServiceRequests(void)
{    byte index, counter;
    
    if(HIDRxReport((byte*)&dataPacket,sizeof(dataPacket)))
    {
        counter = 0;
        switch(dataPacket.CMD)
        {
            case READ_VERSION:
                //dataPacket._byte[1] is len
                dataPacket._byte[2] = 0x01;
                dataPacket._byte[3] = 0x02;
                counter=0x04;
                break;

            default:
                //dataPacket._byte[1] is len
                dataPacket._byte[2] = 0x01;
                dataPacket._byte[3] = 0x02;
                counter=64;
                break;

                break;
        }//end switch()
        if(counter != 0)
        {
            if(!mHIDTxIsBusy())
                HIDTxReport((byte*)&dataPacket,counter);
        }//end if
    }//end if

}//end ServiceRequests
*/

unsigned char PresentCmd;

//This handles data over report ID 44
//Device to host must always follow a host to device
//Report ID 44:
//Byte1 = PresentCmd (command to process)
//Byte2 = Ack/Reject (1 = ack, 0=Reject)	(Byte is Ingored for writes, always set to 1)
//Byte3-63 = Freeform
unsigned char	ProcessGenericTransferRead(void) {
	unsigned char index, cmdrecognized;
	unsigned short TempAddress;
	
	cmdrecognized = true;
	
	TXENQ(PresentCmd);
	
	switch (PresentCmd) {
		case	READ_32:		//use address set previously to send out new data
			TXENQ(1);		//Accepted
			TXENQ(ROMCommAddr.b_form.low);
			TXENQ(ROMCommAddr.b_form.high);
			TempAddress = ROMCommAddr.s_form + (unsigned short)WRITABLE_SEG_ADDR;
			for (index=0;index<32;index++) {
				TXENQ(*(rom unsigned char *)(TempAddress+index));
			}
			break;
		case	WRITE_32:		//A read of a Write_32 command reads back the data written
			TXENQ(1);		//Accepted
			TXENQ(ROMCommAddr.b_form.low);
			TXENQ(ROMCommAddr.b_form.high);
			TempAddress = ROMCommAddr.s_form + (unsigned short)WRITABLE_SEG_ADDR;
			for (index=0;index<32;index++) {
				TXENQ(*(rom unsigned char *)(TempAddress+index));
			}
			break;

		case	ERASE_64:		//A read of an ERASE_64 command returns all 0's
			TXENQ(1);		//Accepted
			TXENQ(ROMCommAddr.b_form.low);
			TXENQ(ROMCommAddr.b_form.high);
			break;
			
		default:
			TXENQ(0);		//Rejected
			for (index=0;index<62;index++) {
				TXENQ(0xFF);
			}
			break;
	}

	//fill out the rest of the buffer with 0's
	for (;USBDataPointer<64;USBDataPointer++) {
		TXENQ(0);
	}
	
	return cmdrecognized;
}


//This handles data over report ID 44.	

//Report ID 44:
//Byte1 = PresentCmd (command to process)
//Byte2 = Ack/Reject (1 = ack, 0=Reject)	(Byte is Ingored for writes, always set to 1)
//Byte3-63 = Freeform
unsigned char	ProcessGenericTransferWrite(void) {
	unsigned char index, cmdrecognized;
	unsigned short Address;
	
	cmdrecognized = true;
	PresentCmd = USBEP0DataInBuffer[1];
	switch (USBEP0DataInBuffer[1]) {
		case	ERASE_64:
			//USBEP0DataInBuffer[2] is ignored
			ROMCommAddr.b_form.low = USBEP0DataInBuffer[3];
			ROMCommAddr.b_form.high = USBEP0DataInBuffer[4];
			ProgMemAddr.s_form = ROMCommAddr.s_form + (unsigned short)WRITABLE_SEG_ADDR;
			EraseProgMem();	//uses global ProgMemAddr
			break;
		case	WRITE_32:
			//USBEP0DataInBuffer[2] is ignored
			ROMCommAddr.b_form.low = USBEP0DataInBuffer[3];
			ROMCommAddr.b_form.high = USBEP0DataInBuffer[4];
			ProgMemAddr.s_form = ROMCommAddr.s_form + (unsigned short)WRITABLE_SEG_ADDR;

			for (index=0;index<32;index++)
				ProgmemBuffer[index] = USBEP0DataInBuffer[index+5];

			WriteProgMem(0);	//uses global ProgMemAddr and ProgmemBuffer[]
			break;
		case	READ_32:
			//USBEP0DataInBuffer[2] is ignored
			ROMCommAddr.b_form.low = USBEP0DataInBuffer[3];
			ROMCommAddr.b_form.high = USBEP0DataInBuffer[4];
			break;
		default:
			//cmdrecognized = false;
			break;
	}
	return cmdrecognized;
}
