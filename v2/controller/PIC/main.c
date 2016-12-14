
// NOTE(jsd): This replaces config.asm section which is apparently commented out and/or not working as intended.

//#pragma config PLLDIV = 5, CPUDIV = OSC1_PLL2, USBDIV = 2       //For 20MHz crystal
//#pragma config PLLDIV = 2, CPUDIV = OSC1_PLL2, USBDIV = 2       //For 8MHz crystal
#pragma config PLLDIV = 2, CPUDIV = OSC2_PLL3, USBDIV = 2       //For 8MHz crystal
// yields 32MHz clock (96MHz PLL / 3 = 32)

#pragma config FOSC = HSPLL_HS, FCMEN = OFF, IESO = OFF
#pragma config VREGEN = ON, PWRT=ON, BOR=ON, BORV=0
//#pragma config WDT = ON, WDTPS = 32768                          //IMPORTANT!!  Long watchdog timeout is REQUIRED for this bootloader!!
#pragma config CCP2MX=ON, PBADEN=OFF, LPT1OSC=OFF, MCLRE=ON
#pragma config STVREN=ON, LVP=OFF, ICPRT=OFF, XINST=OFF
#pragma config CP0=OFF, CP1=OFF, CP2=OFF
#pragma config CPB=OFF, CPD=OFF
#pragma config WRT0=OFF, WRT1=OFF, WRT2=OFF
#pragma config WRTC=OFF, WRTB=OFF, WRTD=OFF
#pragma config EBTR0=OFF, EBTR1=OFF, EBTR2=OFF
#pragma config EBTRB=OFF

#pragma config DEBUG = OFF

#include "c_system.h"
#include "hardware.h"

#ifdef __MCC18
#pragma code main_code
#endif
void user_main(void) {
    CLRWDT();
    init();
    CLRWDT();

    // Wait for the LCD to initialize:
    lcd_init();
    CLRWDT();

    // Clear LCD screen:
    lcd_enqueue(0xFE);
    lcd_enqueue(0x51);

    // Set contrast:
    lcd_enqueue(0xFE);
    lcd_enqueue(0x52);
    lcd_enqueue(20);

    // Initialize controller logic:
    ReadButtons();
    controller_init();

    // Main event loop:
    for(;;) {
        CLRWDT();
        ENABLE_ALL_INTERRUPTS();

        if (Write0Pending) {
            Write0Pending = false;
            WriteProgMem(0);            //write first set of 32 bytes.
        }

        if (Write32Pending) {
            Write32Pending = false;
            WriteProgMem(32);           //write second set of 32 bytes.
        }

        if (Systick) {
            Systick = false;
            SystemTimeRoutine();        //1mS system time routine
        }

        if (CheckButtons) {
            CheckButtons = false;
            ReadButtons();              //read buttons off the multiplexor
        }

        if (HandleLeds) {
            HandleLeds = false;
            UpdateLeds();               //handle leds
        }

        if (ControllerTiming) {
            ControllerTiming = false;
            controller_10msec_timer();  //controller timing functions
        }

        if (HandleController) {
            HandleController = false;
            controller_handle();        //handle UI and other midi commands
        }

        if (LCDUpdateRequest && !LCDUpdate) {
            LCDUpdate = true;
            LCDUpdateRequest = false;
        }
        if (LCDUpdate && (swuart_mode == SWUARTMODE_TX_IDLE)) {
            lcd_update_screen();
        }

        midi_tx();      //handles sending/receiving midi data
    }
}
