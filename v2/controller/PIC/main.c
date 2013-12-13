//*;###########################################################################
//;#            Author: Joe Dunne                                             #
//;#            Date 4/06/07                                                  #
//;#            Main arbitrator                                               #
//;#            File Name: main.c                                             #
//;#                                                                          #
//;############################################################################

// NOTE(jsd): This replaces config.asm section which is apparently commented out and/or not working as intended.

//#pragma config PLLDIV = 5, CPUDIV = OSC1_PLL2, USBDIV = 2       //For 20MHz crystal
#pragma config PLLDIV = 2, CPUDIV = OSC2_PLL3, USBDIV = 2       //For 8MHz crystal

#pragma config FOSC = HSPLL_HS, FCMEN = OFF, IESO = OFF
#pragma config VREGEN = ON, PWRT=ON, BOR=ON, BORV=0
#pragma config WDT = ON, WDTPS = 32768                          //IMPORTANT!!  Long watchdog timeout is REQUIRED for this bootloader!!
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
#include "types.h"
#include "hardware.h"

#pragma code main_code

void main() {
    u8 tmp = 0, tmp2 = 0, tmp3 = 0;

#if 1
    CLRWDT();
    init();
    CLRWDT();

    for(;;) {
        CLRWDT();
        ENABLE_ALL_INTERRUPTS();

        if (Systick) {
            Systick = false;
            SystemTimeRoutine();        //1mS system time routine
            continue;
        }

        if (ControllerTiming) {
            u8 btn = ButtonStateBot;

            // This section runs every 10ms:
            ControllerTiming = false;

#if 0
            // Alternate LEDs every 500ms:
            tmp2++;
            if (tmp2 >= 32) {
                tmp2 = 0;
            } else if (tmp2 >= 16) {
                SendDataToShiftReg16(0xAA, 0xAA);
            } else if (tmp2 >= 0) {
                SendDataToShiftReg16(0x55, 0x55);
            }

            // Send a new program change message:
            //midi_enq(0xC0);
            //midi_enq(tmp);
            //tmp = ((tmp + 1) & 0x7F);
#else
            // Read foot switches:
            ReadButtons();

            // Send a MIDI program change message for each foot switch pressed:
            tmp2 = 1;
            for (tmp = 0; tmp < 8; tmp++, tmp2 <<= 1) {
                if ((btn & tmp2 == tmp2) && (tmp3 & tmp2 == 0)) {
                    midi_enq(0xC0);
                    midi_enq(tmp);
                }
            }
            tmp3 = btn;

            // Copy foot switch states to LED states for debugging:
            LedStatesTop = ~btn;
            LedStatesBot = btn;

            // Update LEDs:
            UpdateLeds();

            // Update LCD when we have buffer space to do so:
            if (swuart_tx_bufptr == 0) {
                lcd_enqueue(0xFE);
                lcd_enqueue(0x45);
                lcd_enqueue(0x00);

                for (tmp = 0; tmp < 20; tmp++) {
                    lcd_enqueue("01234567890123456789"[tmp]);
                }
            }
#endif
        }

        // Transmit next MIDI byte:
        midi_tx();

        // Enable SWUART to TX LCD bytes if idle:
        if ((swuart_mode == SWUARTMODE_TX_IDLE) && (swuart_tx_bufptr > 0)) {
            swuart_tx_start();
        }
    }
#else
    CLRWDT();
    init();
    CLRWDT();
    controller_init();
    CLRWDT();

    for(;;) {
        CLRWDT();
        ENABLE_ALL_INTERRUPTS();

        if (Write0Pending) {
            Write0Pending = false;
            WriteProgMem(0);            //write first set of 32 bytes.
            continue;                   //continue so we can process pending USB routines
        }

        if (Write32Pending) {
            Write32Pending = false;
            WriteProgMem(32);           //write second set of 32 bytes.
            continue;                   //continue so we can process pending USB routines
        }

        if (Systick) {
            Systick = false;
            SystemTimeRoutine();        //1mS system time routine
            continue;
        }

        if (CheckButtons) {
            CheckButtons = false;
            ReadButtons();              //read buttons off the multiplexor
            continue;
        }

        if (HandleLeds) {
            HandleLeds = false;
            UpdateLeds();               //handle leds
        }

        if (HandleController) {
            HandleController = false;
            controller_handle();        //handle UI and other midi commands
        }

        if (ControllerTiming) {
            ControllerTiming = false;
            controller_10msec_timer();  //controller timing functions
        }

        midi_tx();      //handles sending/receiving midi data
    }
#endif
}
