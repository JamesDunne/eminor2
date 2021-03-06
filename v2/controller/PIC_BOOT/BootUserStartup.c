//#######################################################################
/**
* @file BootUserStartup.c
* This is the startup code that calls either the user or bootloader application
* depending if app code is viable.
*
* @author Joe Dunne
* @date 12/9/13
* @brief Bootloader User Startup
*/
//#######################################################################




/** I N C L U D E S **********************************************************/
#include <p18cxxx.h>
#include "typedefs.h"
#include "usb.h"
//#include "io_cfg.h"
//#include "BootPIC18NonJ.h"
#include "boot.h"


/** Prototypes **********************************************************/
void UninitializedMain(void);
void BootMain(void);


//Never comment this out.  If you do, you won't be able to recover if the user
//unplugs the USB cable (or power is lost) during an erase/program sequence,
//unless you rely on the I/O pin check entry method.  The only reason ever to
//comment this out, is if you are trying to use this bootloader firmware with
//an old bootloader PC application that does not have knowledge of the v1.01
//and newer command set (with QUERY_EXTENDED_INFO and SIGN_FLASH commands).
//However, a better solution in such a case, is to upgrade to use a newer PC
//application to do the bootloading.
#define ENABLE_FLASH_SIGNATURE_VERIFICATION


/****** Program memory vectors, constants, and application remapping*********************/
//Be careful if modifying the below code.  The below code is absolute address sensitive.
#pragma code true_entry_scn=0x000000		//Reset vector is at 0x00.  Device begins executing code from 0x00 after a reset or POR event
void true_entry (void)
{
    _asm goto UninitializedMain _endasm
}

//The hardware high priority interrupt vector.  This bootloader firmware does
//not use interrupts at all.  If an interrupt occurs, it is due to application
//mode operation.  Therefore, if an interrupt occurs, we should just jump to
//the remapped address (that resides inside hte application image firmware space).
#pragma code high_vector=0x08
void interrupt_at_high_vector(void)
{
    _asm goto REMAPPED_APPLICATION_HIGH_ISR_VECTOR _endasm
}

//The hardware high priority interrupt vector
#pragma code low_vector=0x18
void interrupt_at_low_vector(void)
{
    //Do not change the code in this function.  Doing so will shift the
    //addresses of things around, which will prevent proper operation.
    _asm goto REMAPPED_APPLICATION_LOW_ISR_VECTOR _endasm    //This goto is located at 0x0018.  This "goto" instruction takes 4 bytes of prog memory.
    _asm goto BOOT_MAIN _endasm  //This goto is located at address 0x001C.  This is the absolute
                                //entry vector value for jumping from the app into the bootloader
                                //mode via software.  This goto is normally unreachable,
                                //unless the application firmware executes an
                                //intentional _asm goto 0x001C _endasm ("#asm goto 0x001C #endasm" if using XC8 compiler).
}




/** D E C L A R A T I O N S **************************************************/
#pragma code	BOOTSTARTUP
/******************************************************************************
 * Function:        void UninitializedMain(void)
 *
 * PreCondition:    None
 *
 * Input:           None
 *
 * Output:          None
 *
 * Side Effects:    None
 *
 * Overview:        This is the first code that executes during boot up of
 *                  the microcontroller.  This code checks to see if execution
 *                  should stay in the "bootloader" mode, or if it should jump
 *                  into the "application" (non-bootloder) execution mode.
 *                  No other unrelated code should be added to this function.
 *
 * Note:            THIS FUNCTION EXECUTES PRIOR TO INITIALIZATION OF THE C
 *                  STACK.  NO C INITIALIZATION OF STATIC VARIABLES OR RESOURCES
 *                  WILL OCCUR, PRIOR TO EXECUTING THIS FUNCTION.  THEREFORE,
 *                  THE CODE IN THIS FUNCTION MUST NOT CALL OTHER FUNCTIONS OR
 *                  PERFORM ANY OPERATIONS THAT WILL REQUIRE C INITIALIZED
 *                  BEHAVIOR.
 *****************************************************************************/
void UninitializedMain(void)
{
    //Assuming the I/O pin check entry method is enabled, check the I/O pin value
    //to see if we should stay in bootloader mode, or jump to normal applicaiton
    //execution mode.


	//TODO: Modify code here to check for I/O pin to allow entry into bootload mode!!


	//Need to make sure the I/O pin is configured for digital mode so we
	//can sense the digital level on the input pin.
	TRISBbits.TRISB0 = TRUE;

	//Check Bootload Mode Entry Condition from the I/O pin (ex: place a
	//pushbutton and pull up resistor on the pin)
	if(PORTBbits.RB0 == FALSE)
	{
		//If we get to here, the user is not pressing the pushbutton.  We
		//should default to jumping into application run mode in this case.
		//Restore default "reset" value of registers we may have modified temporarily.
		//mDeInitSwitch2();

		//Before going to application image however, make sure the image
		//is properly signed and is intact.
		goto DoFlashSignatureCheck;
	}
	else
	{
		//User is pressing the pushbutton.  We should stay in bootloader mode
		_asm goto BOOT_MAIN _endasm
	}

DoFlashSignatureCheck:
    //Check if the application region flash signature is valid
    #ifdef ENABLE_FLASH_SIGNATURE_VERIFICATION
        if(*(rom unsigned int*)APP_SIGNATURE_ADDRESS == APP_SIGNATURE_VALUE)
        {
            //The flash signature was valid, implying the previous
            //erase/program/verify operation was a success.

            //Go ahead and jump out of bootloader mode into the application run mode
    		_asm goto REMAPPED_APPLICATION_RESET_VECTOR _endasm
        }
        //else the application image is missing or corrupt.  In this case, we
        //need to stay in the bootloader mode, so the user has the ability to
        //try (again) to re-program a valid application image into the device.

    	//We should stay in bootloader mode
        _asm goto BOOT_MAIN _endasm
    #else

        //Ideally we shouldn't get here.  It is not recommended for the user to
        //disable both the I/O pin check and flash signature checking
        //simultaneously.  Doing so would make the application non-recoverable
        //in the event of a failed bootload attempt (ex: due to power loss).
        _asm goto REMAPPED_APPLICATION_RESET_VECTOR _endasm

    #endif
}//end UninitializedMain
