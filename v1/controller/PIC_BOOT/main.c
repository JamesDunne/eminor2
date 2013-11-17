/*********************************************************************
 *
 *                Microchip USB Bootloader Version 1.0
 *
 *********************************************************************
 * FileName:        main.c
 * Dependencies:    See INCLUDES section below
 * Processor:       PIC18
 * Compiler:        C18 2.30.01+
 * Company:         Microchip Technology, Inc.
 *
 * Software License Agreement
 *
 * The software supplied herewith by Microchip Technology Incorporated
 * (the “Company”) for its PICmicro® Microcontroller is intended and
 * supplied to you, the Company’s customer, for use solely and
 * exclusively on Microchip PICmicro Microcontroller products. The
 * software is owned by the Company and/or its supplier, and is
 * protected under applicable copyright laws. All rights are reserved.
 * Any use in violation of the foregoing restrictions may subject the
 * user to criminal sanctions under applicable laws, as well as to
 * civil liability for the breach of the terms and conditions of this
 * license.
 *
 * THIS SOFTWARE IS PROVIDED IN AN “AS IS” CONDITION. NO WARRANTIES,
 * WHETHER EXPRESS, IMPLIED OR STATUTORY, INCLUDING, BUT NOT LIMITED
 * TO, IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE APPLY TO THIS SOFTWARE. THE COMPANY SHALL NOT,
 * IN ANY CIRCUMSTANCES, BE LIABLE FOR SPECIAL, INCIDENTAL OR
 * CONSEQUENTIAL DAMAGES, FOR ANY REASON WHATSOEVER.
 *
 * Author               Date        Comment
 *~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * Rawin Rojvanit       11/19/04     Original.
 ********************************************************************/

/** I N C L U D E S **********************************************************/
#include "c_micrdef.h"
#include "typedefs.h"                        // Required
#include "usb.h"                         // Required
#include "io_cfg.h"                                 // Required

#include "usb_compile_time_validation.h" // Optional

#define	REMAPPED_RESET_VECTOR		0xA00


/** CONFIGURATION BITS ********************************************************/
/*
#pragma config PLLDIV = 2,		CPUDIV = OSC4_PLL6,		USBDIV = 2
#pragma config FOSC = HSPLL_HS,	FCMEM = OFF,			IESO = OFF
#pragma config PWRT = ON,		BOR = ON, 				BORV = 2,		VREGEN = ON
#pragma config WDT = OFF	//,		WDTPS = 128
#pragma config MCLRE = ON,		LPT1OSC = OFF,			PBADEN = OFF,	CCP2MX = ON
#pragma config STVREN = ON,		LVP = OFF,				ICPRT = OFF,	XINST = OFF,	DEBUG = OFF
#pragma config CP0 = OFF,		CP1 = OFF,				CP2 = OFF
#pragma config CPB = OFF,		CPD = OFF
#pragma config WRT0 = OFF,		WRT1 = OFF,				WRT2 = OFF
#pragma config WRTC = OFF,		WRTB = OFF,				WRTD = OFF
#pragma config EBTR0 = OFF,		EBTR1 = OFF,			EBTR2 = OFF
#pragma config EBTRB = OFF
*/
/** V A R I A B L E S ********************************************************/
#pragma udata

/** P R I V A T E  P R O T O T Y P E S ***************************************/
void BOOT_LOAD_MODE (void);

/** V E C T O R  R E M A P P I N G *******************************************/

#pragma code _HIGH_INTERRUPT_VECTOR = 0x000008
void _high_ISR (void)
{
    _asm goto RM_HIGH_INTERRUPT_VECTOR  _endasm
}

#pragma code _LOW_INTERRUPT_VECTOR = 0x000018
void _low_ISR (void)
{
    _asm goto RM_LOW_INTERRUPT_VECTOR  _endasm
}

#pragma code	USBBOOT

/** D E C L A R A T I O N S **************************************************/
#pragma code	USBBOOT
/******************************************************************************
 * Function:        void main(void)
 *
 * PreCondition:    None
 *
 * Input:           None
 *
 * Output:          None
 *
 * Side Effects:    None
 *
 * Overview:        Main program entry point.
 *
 * Note:            None
 *****************************************************************************/
extern	void StartOfLine(void);

void main(void)
{
//    byte temp;
	unsigned char Temp0;
//    temp = ADCON1;
//    ADCON1 |= 0x0F;

 	DDRCbits.RC6=0;				// Setup tx pin
//	DDRC.RC7=1;					// Setup rx pin
	RCSTA=0x90;	//b'10010000';	// Setup rx and tx
	TXSTA=0x46;	//b'00100110';		
	RCSTAbits.CREN=1;			// Start receiving
	WREG=RCREG;					// Empty the buffer
	WREG=RCREG;

    //TRISBbits.TRISB4 = 1;     // Reset value is already '1'


    
//Check Bootload Mode Entry Condition
    if(PORTBbits.RB4 == 1)      // If not pressed, User Mode
    {
        _asm goto REMAPPED_RESET_VECTOR _endasm
    }

	BOOT_LOAD_MODE();
_asm goto REMAPPED_RESET_VECTOR _endasm
}//end main

void BOOT_LOAD_MODE (void) {
    //Bootload Mode
    //mInitAllLEDs();
    mInitializeUSBDriver();     // See usbdrv.h
    USBCheckBusStatus();        // Modified to always enable USB module
    while(1){
		_asm clrwdt _endasm

	    TRISBbits.TRISB5 = 0;     //make that pin an output
		LATBbits.LATB5 = !LATBbits.LATB5;

        USBDriverService();     // See usbdrv.c
        BootService();          // See boot.c
   	}//end while
}//end function

#pragma code user = RM_RESET_VECTOR
/** EOF main.c ***************************************************************/
