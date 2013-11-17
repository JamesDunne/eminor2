//*;###########################################################################
//;#			Author: Ali Rizavi											  #
//;#			Date 10/07/04					      						  #
//;#			MASTER SWITCH GENERATION 1.x								  #
//;#			Init funtion header File									  #
//;#			File Name: init.h											  #
//;#																		  #
//;#			Updated 10/07/04 by AR										  #
//;############################################################################

//-----------------------------------------------------------------------------
//Define constants here

//If this is defined, the UART is set up for RS232, 
//else its MIDI
//#define	UARTISRS232

//UART converter initialization constants:
#ifdef UARTISRS232
#define	INIT_TXSTA 0xA6		//master,8bit,async,high speed
#define	INIT_RCSTA 0x90		//enabled,8bit, continuous
#define	INIT_SPBRG 16		//115200 baud
#define	INIT_SPBRGH 0x01
#else
//#define	INIT_TXSTA 0xE6		//master,8bit,async, BRGH=1
//#define	INIT_RCSTA 0x90		//enabled,8bit, continuous
//#define	INIT_SPBRG	63		//31250 baud
//#define	INIT_SPBRGH 0x00

#define	INIT_TXSTA 0xA6		//master,8bit,async,1 stop bit,tx enable,high speed
#define	INIT_RCSTA 0x90		//enabled,8bit, continuous
#define	INIT_SPBRG	63		//31250 baud
#define	INIT_SPBRGH 0x00

#endif

//A/D converter initialization constants:
#define	INIT_ADCON0	0b01000000;		//AN0, off
#define	INIT_ADCON1	0b00001110;		//1 analog channels
#define	INIT_ADCON2	0b00000110;		//Left justified, 0 TAD(manual), FOSC/32

//system timing:
#define	SYSTEM_TIME_1MS			4		//in 250uS counts
#define	SYSTEM_TIME_10MS		10		//in 1mS counts
#define	SYSTEM_TIME_40MS		4		//in 10mS counts
#define	SYSTEM_TIME_100MS		10		//in 10mS counts
#define	SYSTEM_TIME_1S			100		//in 10mS counts

//interrupts:
#define	INIT_INTCON			0x00	//disable global and enable TMR0 interrupt
#define	INIT_INTCON2		0x80	//PORTB pullups disabled
//timing constants:
#define	INIT_T0CON			0x00	//timer0 disabled

#define	INIT_T2CON			0x0D		//on, 1:4 prescale, 1:2 postscale
#define	INIT_PR2			0xF9		//250uS interrupt
#define	INIT_PIE1			0x02		//enable pr2 to tmr2 match interrupt

#define	DISP_NUMBER_OF_COMMONS	5	//5 is default, increase to reduce brightness

#define	LATCH_STROBE_DELAY		16	//4uS minimum (time for shift register bits)
#define	BTN_SAMPLE_DELAY		5	//probably unnecessary (sampling time for buttons)

//midi comm buffer length:
#define	MAX_TX_LENGTH			8	//probably more than necessary


//Size of writable flash segment:
#define	WRITABLE_SEG_ADDR		0x4900		//Also update this in the lkr file if it needs to change!!
#define	WRITABLE_SEG_LEN		0x5FFF-WRITABLE_SEG_ADDR

//-----------------------------------------------------------------------------
//Communication constants

#define	COMMAND_REJECTED	0x01		//UPS->Computer
#define	COMMAND_ACCEPTED	0x02		//UPS->Computer
#define	POLLING_COMMAND		0x03		//Computer->UPS
#define	SET_COMMAND			0x04		//Computer->UPS
#define	DATA_RETURNED		0x05		//UPS->Computer
#define	INVALID_REQUEST		0xff

//Report ID 44 commands:
#define	ERASE_64			0x30
#define	WRITE_32			0x31
#define	READ_32				0x32

//-----------------------------------------------------------------------------
//ROM DATA MAP
#define	ROM_BANK_COUNT			0

//-----------------------------------------------------------------------------
//Update history:
