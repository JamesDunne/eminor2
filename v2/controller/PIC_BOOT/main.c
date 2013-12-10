/*********************************************************************
 *
 *   Microchip USB HID Bootloader for PIC18 (Non-J Family) USB Microcontrollers
 *
 *********************************************************************
 * FileName:        main.c
 * Dependencies:    See INCLUDES section below
 * Processor:       PIC18
 * Compiler:        C18 3.45+
 * Company:         Microchip Technology, Inc.
 *
 * Software License Agreement
 *
 * The software supplied herewith by Microchip Technology Incorporated
 * (the "Company") for its PIC(R) Microcontroller is intended and
 * supplied to you, the Company's customer, for use solely and
 * exclusively on Microchip PICmicro Microcontroller products. The
 * software is owned by the Company and/or its supplier, and is
 * protected under applicable copyright laws. All rights are reserved.
 * Any use in violation of the foregoing restrictions may subject the
 * user to criminal sanctions under applicable laws, as well as to
 * civil liability for the breach of the terms and conditions of this
 * license.
 *
 * THIS SOFTWARE IS PROVIDED IN AN "AS IS"” CONDITION. NO WARRANTIES,
 * WHETHER EXPRESS, IMPLIED OR STATUTORY, INCLUDING, BUT NOT LIMITED
 * TO, IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE APPLY TO THIS SOFTWARE. THE COMPANY SHALL NOT,
 * IN ANY CIRCUMSTANCES, BE LIABLE FOR SPECIAL, INCIDENTAL OR
 * CONSEQUENTIAL DAMAGES, FOR ANY REASON WHATSOEVER.
 *
 * File Version  Date		Comment
 *~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * 1.0           06/19/2008 Original Version.  Adapted from
 *                          MCHPFSUSB v2.1 HID Bootloader
 *                          for PIC18F87J50 Family devices.
 * 2.9f          06/26/2012 Added PIC18F45K50 Family support.
 * 2.9j          06/10/2013 Added software entry point into bootloader
 *                          at 0x001C.  Some other enhancements.
 *                          Changed LED blink pattern to use only 1 LED and
 *                          consume less code space.  Added #define option to
 *                          disable LED blinking and I/O pushbutton entry
 *                          altogether.  See usbcfg.h settings.
 ********************************************************************/

/*********************************************************************
IMPORTANT NOTES: This code can be readily adapted for use with the 
both the F and LF versions of the following devices:

PIC18F4553/4458/2553/2458
PIC18F4550/4455/2550/2455
PIC18F4450/2450
PIC18F14K50/13K50
PIC18F45K50/25K50/24K50

However, the default device that is currently selected in the project
may not be the device you are interested.  To change the device:

Replace the linker script with an appropriate version, and
click "Configure --> Select Device" and select the proper
microcontroller.  Also double check to verify that the io_cfg.h and
usbcfg.h are properly configured to match your desired application
platform.

Verify that the configuration bits are set correctly for the intended
target application, and fix any build errors that result from either
the #error directives, or due to I/O pin count mismatch issues (such
as when using a 28-pin device, but without making sufficient changes
to the io_cfg.h file)

This project needs to be built with the C18 compiler optimizations
enabled, and using the Default storage class "Static" or the total
code size will be too large to fit within the program memory
range 0x000-0xFFF.  The default linker script included
in the project has this range reserved for the use by the bootloader,
but marks the rest of program memory as "PROTECTED".  If you try to
build this project with the compiler optimizations turned off, or
you try to modify some of this code, but add too much code to fit
within the 0x000-0xFFF region, a linker error like that below may occur:

Error - section '.code' can not fit the section. Section '.code' length=0x00000020
To fix this error, either optimize the program to fit within 0x000-0xFFF
(such as by turning on all compiler optimizations, and making sure the
"default storage class" is set to "Static"), or modify the linker
and vector remapping (as well as the application projects) to allow this
bootloader to use more program memory.



----------------------Bootloader Entry------------------------------------------
Entry into this bootloader firmware can be done by either of two possible
ways:

1.  I/O pin check at power up/after any reset.  and/or:
2.  Software entry via absolute jump to address 0x001C.

The I/O pin check method is the most rugged, since it does not require the 
application firmware image to be intact (at all) to get into the bootloader
mode.  However, software entry is also possible and may be more convenient
in applications that do not have user exposed pushbuttons available.

When the "application" image is executing, it may optionally jump into
bootloader mode, by executing a _asm goto 0x001C _endasm instruction.  
Before doing so however, the firwmare should configure the current
clock settings to be compatible with USB module operation, in they
are not already.  Once the goto 0x001C has been executed the USB device 
will detach from the USB bus (if it was previously attached), and will 
re-enumerate as a HID class device with a new VID/PID (adjustable via 
usb_dsc.c settings), which can communicate with the associated
USB host software that loads and programs the new .hex file.


--------------------------------------------------------------------------------
Anytime that an application implements flash self erase/write capability, 
special care should be taken to make sure that the microcontroller is operated 
within all datasheet ratings, especially those associated with voltage versus 
frequency.

Operating the device at too high of a frequency (for a given voltage, ex: by
operating at 48MHz at 2.1V, while the device datasheet indicates some higher
value such as 2.35V+ is requred) can cause unexpected code operation.  This
could potentially allow inadvertent execution of bootloader or other self
erase/write routines, causing corruption of the flash memory of the application.

To avoid this, all applications that implement self erase/write capability 
should make sure to prevent execution during overclocked/undervolted conditions.

For this reason, enabling and using the microcontroller hardware Brown-out-Reset 
feature is particularly recommended for applications using a bootloader.  If 
BOR is not used, or the trip threshold is too low for the intended application 
frequency, it is suggested to add extra code in the application to detect low 
voltage conditions, and to intentionally clock switch to a lower frequency 
(or put the device to sleep) during the low voltage condition.  Hardware
modules such as the ADC, comparators, or the HLVD (high/low voltage detect)
can often be used for this purpose.


--------------------------------------------------------------------------------
This bootloader supports reprogramming of the microcontroller configuration bits,
however, it is strongly recommended never to do so, unless absolutely necessary.
Reprogramming the config bits is potentially risky, since it requires that the
new configuration bits be 100% compatible with USB operation (ex: oscillator
settings, etc.).  If a .hex file with incorrect config bits is programmed
into this device, it can render the bootloader inoperable.  Additionally,
unexpected power failure or device detachment during the reprogramming of the
config bits could result in unknown values getting stored in the config bits,
which could "brick" the application.

Normally, the application firmware project and this bootloader project should
be configured to use/set the exact same configuration bit values.  Only one set
of configuration bits actually exists in the microcontroller, and these values
must be shared between the bootloader and application firmware.
*******************************************************************************/







/** I N C L U D E S **********************************************************/
#include <p18cxxx.h>
#include "typedefs.h"                   
#include "usb.h"                         
#include "io_cfg.h"                     
#include "BootPIC18NonJ.h"

/** C O N F I G U R A T I O N ************************************************/
// Note: For a complete list of the available config pragmas and their values, 
// see the compiler documentation, and/or click "Help --> Topics..." and then 
// select "PIC18 Config Settings" in the Language Tools section.

#if defined(PIC18F4550_PICDEM_FS_USB)		// Configuration bits for PICDEM FS USB Demo Board
 	#if defined(__18F4550) || defined(__18F4553)
        #pragma config PLLDIV   = 5         // (20 MHz crystal on PICDEM FS USB board)
        #pragma config CPUDIV   = OSC1_PLL2	
        #pragma config USBDIV   = 2         // Clock source from 96MHz PLL/2
        #pragma config FOSC     = HSPLL_HS
        #pragma config FCMEN    = OFF
        #pragma config IESO     = OFF
        #pragma config PWRT     = OFF
        #pragma config BOR      = ON
        #pragma config BORV     = 3
        #pragma config VREGEN   = ON		//USB Voltage Regulator
        #pragma config WDT      = OFF
        #pragma config WDTPS    = 32768
        #pragma config MCLRE    = ON
        #pragma config LPT1OSC  = OFF
        #pragma config PBADEN   = OFF		//NOTE: modifying this value here won't have an effect
        									//on the application.  See the top of the main() function.
        									//By default the RB4 I/O pin is used to detect if the
        									//firmware should enter the bootloader or the main application
        									//firmware after a reset.  In order to do this, it needs to
        									//configure RB4 as a digital input, thereby changing it from
        									//the reset value according to this configuration bit.
//      #pragma config CCP2MX   = ON
        #pragma config STVREN   = ON
        #pragma config LVP      = OFF
//      #pragma config ICPRT    = OFF       // Dedicated In-Circuit Debug/Programming
        #pragma config XINST    = OFF       // Extended Instruction Set
        #pragma config CP0      = OFF
        #pragma config CP1      = OFF
//      #pragma config CP2      = OFF
//      #pragma config CP3      = OFF
        #pragma config CPB      = OFF
//      #pragma config CPD      = OFF
        #pragma config WRT0     = OFF
        #pragma config WRT1     = OFF
//      #pragma config WRT2     = OFF
//      #pragma config WRT3     = OFF
        #pragma config WRTB     = OFF       // Boot Block Write Protection
        #pragma config WRTC     = OFF
//      #pragma config WRTD     = OFF
        #pragma config EBTR0    = OFF
        #pragma config EBTR1    = OFF
//      #pragma config EBTR2    = OFF
//      #pragma config EBTR3    = OFF
        #pragma config EBTRB    = OFF
	#endif	//18F4550 and 18F4553


#elif defined(PIC18F4550_PICDEM_FS_USB_K50)
        #pragma config PLLSEL   = PLL3X     // 3X PLL multiplier selected
        #pragma config CFGPLLEN = OFF       // PLL turned on during execution
        #pragma config CPUDIV   = NOCLKDIV  // 1:1 mode (for 48MHz CPU)
        #pragma config LS48MHZ  = SYS48X8   // Clock div / 8 in Low Speed USB mode
        #pragma config FOSC     = INTOSCIO  // HFINTOSC selected at powerup, no clock out
        #pragma config PCLKEN   = OFF       // Primary oscillator driver
        #pragma config FCMEN    = OFF       // Fail safe clock monitor
        #pragma config IESO     = OFF       // Internal/external switchover (two speed startup)
        #pragma config nPWRTEN  = OFF       // Power up timer
        #pragma config BOREN    = SBORDIS   // BOR enabled
        #pragma config nLPBOR   = ON        // Low Power BOR
        #pragma config WDTEN    = SWON      // Watchdog Timer controlled by SWDTEN
        #pragma config WDTPS    = 32768     // WDT postscalar
        #pragma config PBADEN   = OFF       // Port B Digital/Analog Powerup Behavior
        #pragma config SDOMX    = RC7       // SDO function location
        #pragma config LVP      = OFF       // Low voltage programming
        #pragma config MCLRE    = ON        // MCLR function enabled (RE3 disabled)
        #pragma config STVREN   = ON        // Stack overflow reset
        //#pragma config ICPRT  = OFF       // Dedicated ICPORT program/debug pins enable
        #pragma config XINST    = OFF       // Extended instruction set

//If using the YOUR_BOARD hardware platform (see usbcfg.h), uncomment below and add pragmas
//#elif defined(YOUR_BOARD)
		//Add the configuration pragmas here for your hardware platform
		//#pragma config ... 		= ...
#elif defined(LOW_PIN_COUNT_USB_DEVELOPMENT_KIT)
        #if !defined(__18F14K50) && !defined(__18F13K50) && !defined(__18LF14K50) && !defined(__18LF13K50)
            #error Wrong processor selected for the selected demo board.
        #endif
        #pragma config CPUDIV = NOCLKDIV
        #pragma config USBDIV = OFF
        #pragma config FOSC   = HS
        #pragma config PLLEN  = ON
        #pragma config FCMEN  = OFF
        #pragma config IESO   = OFF
        #pragma config PWRTEN = OFF
        #pragma config BOREN  = ON
        #pragma config BORV   = 30
        #pragma config WDTEN  = OFF
        #pragma config WDTPS  = 32768
        #pragma config MCLRE  = OFF
        #pragma config HFOFST = OFF
        #pragma config STVREN = ON
        #pragma config LVP    = OFF
        #pragma config XINST  = OFF
        #pragma config BBSIZ  = OFF
        #pragma config CP0    = OFF
        #pragma config CP1    = OFF
        #pragma config CPB    = OFF
        #pragma config WRT0   = OFF
        #pragma config WRT1   = OFF
        #pragma config WRTB   = OFF
        #pragma config WRTC   = OFF
        #pragma config EBTR0  = OFF
        #pragma config EBTR1  = OFF
        #pragma config EBTRB  = OFF      
#else
	#error Not a supported board (yet), make sure the proper board is selected in usbcfg.h, and if so, set configuration bits in __FILE__, line __LINE__
#endif

/** V A R I A B L E S ********************************************************/
//NOTE: You must not use initalized variables in this bootloader project.  This
//firmware project does not rely on the standard C initializer, which is 
//responsible for setting up initialized variables in RAM.  Therefore, all
//variables will be non-initialized/random at start up.
#pragma udata
unsigned int uint_delay_counter;


/** P R I V A T E  P R O T O T Y P E S ***************************************/
static void InitializeSystem(void);
//void USBTasks(void);
#define USBTasks()  {USBCheckBusStatus(); USBDriverService();}
void ClearWatchdog(void);
void DisableUSBandExecuteLongDelay(void);
void LowVoltageCheck(void);

#ifdef ENABLE_USB_LED_BLINK_STATUS
    void BlinkUSBStatus(void);
#else
    #define BlinkUSBStatus()
#endif



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
 * Overview:        This is the main function for this bootloader mode firmware.
 *                  if execution gets to this function, it is assumed that we
 *                  want to stay in bootloader mode for now.
 *
 * Note:            If adding code to this function, make sure to add it only
 *                  after the C initializer like code at the top of this function.
 *****************************************************************************/
void BootMain(void)
{
	//NOTE: The c018.o file is not included in the linker script for this project.
	//The C initialization code in the c018.c (comes with C18 compiler in the src directory)
	//file is instead modified and included here manually.  This is done so as to provide
	//a more convenient entry method into the bootloader firmware.  Ordinarily the _entry_scn
	//program code section starts at 0x00 and is created by the code of c018.o.  However,
	//the linker will not work if there is more than one section of code trying to occupy 0x00.
	//Therefore, must not use the c018.o code, must instead manually include the useful code
	//here instead.

    //Make sure interrupts are disabled for this code (could still be on,
    //if the application firmware jumped into the bootloader via software methods)
    INTCON = 0x00;  

    // Initialize the C stack pointer, and other compiler managed items as normally done in the c018.c file.
	_asm
    lfsr 1, _stack
    lfsr 2, _stack
    clrf TBLPTRU, 0 
	_endasm

    //Clear the stack pointer, in case the user application jumped into 
    //bootloader mode with excessive junk on the call stack
    STKPTR = 0x00;  

	// End of the important parts of the C initializer.  This bootloader firmware does not use
	// any C initialized user variables (idata memory sections).  Therefore, the above is all
	// the initialization that is required.


    //Check if the USB module is already enabled.  If so, disable it and wait 
    //~100ms+ (>1 second recommended if CDC application firmware on XP), to 
    //ensure that the host has a chance to see and process the USB device detach 
    //event.
    if(UCONbits.USBEN == 1)
    {
        //USB module was already on.  This is likely because the user applicaiton
        //firmware jumped into this bootloader firmware using the absolute
        //software entry method, without first turning off the USB module
        DisableUSBandExecuteLongDelay(); 
    }    


    //Call other initialization code and (re)enable the USB module
    InitializeSystem();		//Some USB, I/O pins, and other initialization
    
    //Execute main loop
    while(1)
    {
		ClrWdt();
		
		//Need to call USBTasks() periodically.  This function takes care of 
		//processing non-USB application related USB packets (ex: "Chapter 9" 
		//packets associated with USB enumeration)
		USBTasks();             	    

		BlinkUSBStatus();   //When enabled, blinks LEDs on the board, based on USB bus state
		
		LowVoltageCheck();  //Regularly monitor voltage to make sure it is sufficient
		                    //for safe operation at full frequency and for erase/write
		                    //operations.		
		
		//Checks for and processes application related USB packets (assuming the
		//USB bus is in the CONFIGURED_STATE, which is the only state where
		//the host is allowed to send application related USB packets to the device.
	    if((usb_device_state == CONFIGURED_STATE) && (UCONbits.SUSPND != 1))
	    {
 	       ProcessIO();   // This is where all the actual bootloader related data transfer/self programming takes place
 	    }				  // see ProcessIO() function in the BootPIC[xxxx].c file.
    }//end while    
}    


/******************************************************************************
 * Function:        static void InitializeSystem(void)
 *
 * PreCondition:    None
 *
 * Input:           None
 *
 * Output:          None
 *
 * Side Effects:    None
 *
 * Overview:        InitializeSystem is a centralize initialization routine.
 *                  All required USB initialization routines are called from
 *                  here.
 *
 *                  User application initialization routine should also be
 *                  called from here.                  
 *
 * Note:            None
 *****************************************************************************/
static void InitializeSystem(void)
{
//	The USB specifications require that USB peripheral devices must never source
//	current onto the Vbus pin.  Additionally, USB peripherals should not source
//	current on D+ or D- when the host/hub is not actively powering the Vbus line.
//	When designing a self powered (as opposed to bus powered) USB peripheral
//	device, the firmware should make sure not to turn on the USB module and D+
//	or D- pull up resistor unless Vbus is actively powered.  Therefore, the
//	firmware needs some means to detect when Vbus is being powered by the host.
//	A 5V tolerant I/O pin can be connected to Vbus (through a resistor), and
// 	can be used to detect when Vbus is high (host actively powering), or low
//	(host is shut down or otherwise not supplying power).  The USB firmware
// 	can then periodically poll this I/O pin to know when it is okay to turn on
//	the USB module/D+/D- pull up resistor.  When designing a purely bus powered
//	peripheral device, it is not possible to source current on D+ or D- when the
//	host is not actively providing power on Vbus. Therefore, implementing this
//	bus sense feature is optional.  This firmware can be made to use this bus
//	sense feature by making sure "USE_USB_BUS_SENSE_IO" has been defined in the
//	usbcfg.h file.    
    #if defined(USE_USB_BUS_SENSE_IO)
        tris_usb_bus_sense = INPUT_PIN; // See io_cfg.h
    #endif

//	If the host PC sends a GetStatus (device) request, the firmware must respond
//	and let the host know if the USB peripheral device is currently bus powered
//	or self powered.  See chapter 9 in the official USB specifications for details
//	regarding this request.  If the peripheral device is capable of being both
//	self and bus powered, it should not return a hard coded value for this request.
//	Instead, firmware should check if it is currently self or bus powered, and
//	respond accordingly.  If the hardware has been configured like demonstrated
//	on the PICDEM FS USB Demo Board, an I/O pin can be polled to determine the
//	currently selected power source.  On the PICDEM FS USB Demo Board, "RA2" 
//	is used for	this purpose.  If using this feature, make sure "USE_SELF_POWER_SENSE_IO"
//	has been defined in usbcfg.h, and that an appropriate I/O pin has been mapped
//	to it in io_cfg.h.    
    #if defined(USE_SELF_POWER_SENSE_IO)
        tris_self_power = INPUT_PIN;
    #endif
    
    //Initialize oscillator settings compatible with USB operation.  Note,
    //these may be application specific!
    #if defined(PIC18F4550_PICDEM_FS_USB_K50)
        OSCTUNE = 0x80; //3X PLL ratio mode selected
        OSCCON = 0x70;  //Switch to 16MHz HFINTOSC
        OSCCON2 = 0x10; //Enable PLL, SOSC, PRI OSC drivers turned off
        while(OSCCON2bits.PLLRDY != 1);   //Wait for PLL lock
        ACTCON = 0x90;  //Enable active clock tuning for USB operation
        //*((unsigned char*)0xFB5) = 0x90;  //Enable active clock tuning for USB operation
    #endif
    
    
    mInitializeUSBDriver();         // See usbdrv.h
    
    UserInit();                     // See user.c & .h

    mInitAllLEDs();			//Init them off.

}//end InitializeSystem


//Check to make sure the VDD is sufficient for safe bootloader operation.
//If the voltage is insufficient, code should be added to the below
//function that clock switches to a low frequency internal oscillator and
//puts the device to sleep, so as to avoid accidental operation under
//"overclocked" (for a given voltage) conditions.  If BOR is enabled and is
//set at a high enough level to trip before reaching a level insufficient for
//maximum frequency operation, it may not be necessary to add additional checks
//and the below warning can simply be commented out.
void LowVoltageCheck(void)
{
	//12/9/2013 JDunne - BAH.. who needs LVD checks.... live dangerously..  (Seriously though, fix this for production)
    //#warning "Recommended to implement code here to check VDD.  Voltage detection can be done using ADC, HVLD, comparators, or other means."
}    

    


/******************************************************************************
 * Function:        void BlinkUSBStatus(void)
 *
 * PreCondition:    None
 *
 * Input:           None
 *
 * Output:          None
 *
 * Side Effects:    None
 *
 * Overview:        BlinkUSBStatus turns on and off LEDs corresponding to
 *                  the USB device state.
 *
 * Note:            mLED macros can be found in io_cfg.h
 *                  usb_device_state is declared in usbmmap.c and is modified
 *                  in usbdrv.c, usbctrltrf.c, and usb9.c
 *****************************************************************************/
#ifdef ENABLE_USB_LED_BLINK_STATUS
void BlinkUSBStatus(void)
{
    static unsigned int led_count = 0;

    led_count--;
    if(led_count == 0)
    {
        led_count = 19968U;  //Chosen instead of 20000, so that LSB is = 0x00 (more efficient to initialize)
        if(usb_device_state < CONFIGURED_STATE)
        {
            mLED_1_On();
        } 
        else
        {
            mLED_1_Toggle();
        }    
    }    
}//end BlinkUSBStatus
#endif //#ifdef ENABLE_USB_LED_BLINK_STATUS


/** EOF main.c ***************************************************************/
