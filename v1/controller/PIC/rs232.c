//###############################################################################
//#										       						       		#
//#			Author: Joe Dunne											 		#
//#			RS232 Communication ROUTINE											#
//#			File Name: RXCOMM.ASM												#
//#																				#
//#			Updated 2/02/05 by JD												#
//#									      	       	       	       	       		#
//###############################################################################

#include	"c_system.h"
#include "typedefs.h"
#include "usb.h"


#define	FW_REV						0x10

#define	UPS_TYPE					(2|FW_REV)
#define	PRODUCTION_TEST_PROTOCOL	0x0003

extern rom struct{byte bLength;byte bDscType;word string[];}SerialNum;
extern rom struct{byte bLength;byte bDscType;word string[24];}MfrString;

void	RemCapCalculation(void);
void	EE_READ(void);
void	D_DIV(void);
void	SQRT_16BIT(void);		//result is stored in RES0.
void	HIDGetReportHandler(void);
unsigned char	READ_SYSTEM_NVR(void);
void	EE_PAGE_WRITE(void);
void	BOOT_LOAD_MODE(void);



//--------------------------------------------------------------
//						Handle received query
//--------------------------------------------------------------
void	PROCESS_COMM_REQUEST(void) {
	unsigned char *RcvPtr;
	unsigned char tempvar1, tempvar0;
	far unsigned char *Data;
	BitField ByteToSend;
	TwoBytes tempreg, tempnum0, value;
	FourBytes longreg;

	ResponseType = INVALID_REQUEST;		//no response

	//USB query
	USBDataPointer = 1;		//the 0th byte is the reportid
	RcvPtr = (unsigned char *)&USBEP0DataInBuffer[1];

//Polling command:
	if (SetupPkt.bRequest == GET_REPORT) {
		switch (SetupPkt._byte[2]) {
			
		case 175:		//voltage data
			ResponseType = DATA_RETURNED;
			TXENQ(0);
			TXENQ(0);
			TXENQ(0);
			TXENQ(0);
			break;

		case 44:		//generic data transfer device to host
			if (ProcessGenericTransferRead()) ResponseType = DATA_RETURNED;
			else ResponseType = INVALID_REQUEST;
			break;	
			
//production test commands:			
		case 150:		//NVR Read
			ResponseType = DATA_RETURNED;
			if (1 && !PIE2bits.EEIE) { 
//				EEAddress = NVRCommAddr.b_form.low;
//				DISABLE_ALL_INTERRUPTS();
//				Temp6 = READ_SYSTEM_NVR();		//returns data through wreg
//				ENABLE_ALL_INTERRUPTS();
//				TXENQ(Temp6);
			}
			else {
				ResponseType = COMMAND_REJECTED;
				TXENQ(INVALID_REQUEST);
			}
			break;
			
		case 151:		//NVR Address
			ResponseType = DATA_RETURNED;
			TXENQ(NVRCommAddr.b_form.low);		//low byte
			TXENQ(NVRCommAddr.b_form.high);		//high byte
			break;
		case 152:		//RAM Read
			ResponseType = DATA_RETURNED;
			Data = (far unsigned char *)RAMCommAddr.s_form;
			TXENQ(*Data);
			break;
	
		case 153:		//RAM Address
			ResponseType = DATA_RETURNED;
			TXENQ(RAMCommAddr.b_form.low);		//low byte
			TXENQ(RAMCommAddr.b_form.high);		//high byte

			break;
	
		case 155:		//production test protocol
			ResponseType = DATA_RETURNED;
			TXENQ(PRODUCTION_TEST_PROTOCOL&255);
			TXENQ(PRODUCTION_TEST_PROTOCOL>>8);
			break;
		case 194:		//Get firmware partnumber
			ResponseType = DATA_RETURNED;
			TXENQ(0x0A);
			TXENQ(0x14);
			TXENQ(0x23);
			TXENQ(0x69);
			break;
	
		case 180:		//NVR Page Read
			ResponseType = DATA_RETURNED;
			if (1 && !PIE2bits.EEIE) {
				DISABLE_ALL_INTERRUPTS();
//				EEAddress = NVRCommAddr.b_form.low;
//				Temp6 = READ_SYSTEM_NVR();
//				TXENQ(Temp6);
//				EEAddress++;
//				Temp6 = READ_SYSTEM_NVR();
//				TXENQ(Temp6);
//				EEAddress++;
//				Temp6 = READ_SYSTEM_NVR();
//				TXENQ(Temp6);
//				EEAddress++;
//				Temp6 = READ_SYSTEM_NVR();
//				TXENQ(Temp6);
//				ENABLE_ALL_INTERRUPTS();
				break;
			}
			else {
				ResponseType = COMMAND_REJECTED;
				TXENQ(INVALID_REQUEST);
				TXENQ(INVALID_REQUEST);
				TXENQ(INVALID_REQUEST);
				TXENQ(INVALID_REQUEST);
				break;
			}				
		default:
			break;
		}
	}

//Set command:
	if (SetupPkt.bRequest == SET_REPORT) {
		switch (SetupPkt._byte[2]) {

		case 44:		//generic data transfer host to device
			if (ProcessGenericTransferWrite()) ResponseType = COMMAND_ACCEPTED;
			else ResponseType = COMMAND_REJECTED;
			break;

//Production test commands
		case 150:		//NVR Write
			ResponseType = COMMAND_ACCEPTED;
			if (1 && !PIE2bits.EEIE) { 
//				DISABLE_ALL_INTERRUPTS();
//				EECounterB = 1;						//Number of bytes to write.
//				EEAddress = NVRCommAddr.b_form.low;	//EEPROM register starting address byte.
//				EEData = RcvPtr[0];					//First byte of data to write.
//diag disable ee_page_write
//				EE_PAGE_WRITE();
//				ENABLE_ALL_INTERRUPTS();
			}
			else ResponseType = COMMAND_REJECTED;
			break;
			
		case 151:		//NVR Address
			ResponseType = COMMAND_ACCEPTED;
			if (1) { 
				NVRCommAddr.b_form.low = RcvPtr[0];		//low byte
				NVRCommAddr.b_form.high = RcvPtr[1];	//high byte
			}
			else ResponseType = COMMAND_REJECTED;
			break;
		case 152:		//RAM Write
			ResponseType = COMMAND_ACCEPTED;
			*(far unsigned char *)RAMCommAddr.s_form = RcvPtr[0];
			break;
	
		case 153:		//RAM Address
			ResponseType = COMMAND_ACCEPTED;
			RAMCommAddr.b_form.low = RcvPtr[0];		//low byte
			RAMCommAddr.b_form.high = RcvPtr[1];	//high byte
			break;
		case 154:		//Password write (starting with low byte)
			ResponseType = COMMAND_ACCEPTED;
			break;
		case 180:		//NVR Page Write
			ResponseType = COMMAND_ACCEPTED;
//diag.. disable ee_page_write
			break;
		default:
			break;
		}
	}

	if (ResponseType == INVALID_REQUEST) return;
//no response or ack?
	if (SetupPkt.bRequest == SET_REPORT) return;		//no response to set_report
	
//USB query setup data:
	CtrlTrfData._byte[0] = SetupPkt._byte[2];
	wCount._word = USBDataPointer;		//Calculate number of bytes to send
	return;
}

//-----------------------------------------------------------------------
//This routine will store a character into the TxBuffer.
void	TXENQ(unsigned char Input) {
	//USB Query
	if (USBDataPointer >= 64) return;		//Exit if buffer full.
	CtrlTrfData._byte[USBDataPointer] = Input;
	USBDataPointer++;
}
//-----------------------------------------------------------------------
