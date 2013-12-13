
// NOTE(jsd): This replaces config.asm section which is apparently commented out and/or not working as intended.

//#pragma config PLLDIV = 5, CPUDIV = OSC1_PLL2, USBDIV = 2       //For 20MHz crystal
//#pragma config PLLDIV = 2, CPUDIV = OSC1_PLL2, USBDIV = 2       //For 8MHz crystal
#pragma config PLLDIV = 2, CPUDIV = OSC2_PLL3, USBDIV = 2       //For 8MHz crystal

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
#include "types.h"
#include "hardware.h"

void SEND_BIT(unsigned char b) {
	// Send bit:
	if (b) SWUART_TX_LAT_BIT = 1;
	else SWUART_TX_LAT_BIT = 0;

	// Wait for timer overflow:
	while (PIR1bits.TMR1IF == 0);
	// Clear timer overflow:
	PIR1bits.TMR1IF = 0;

	// Reset timer:
	T1CONbits.TMR1ON = 0;
	TMR1L = ((unsigned short)0xFFFF - (unsigned short)TMR1_BAUD9600_PERIOD) & 0xFF;
	TMR1H = (((unsigned short)0xFFFF - (unsigned short)TMR1_BAUD9600_PERIOD) >> 8) & 0xFF;
	T1CONbits.TMR1ON = 1;
}

#pragma code main_code

void main() {
	u8 i;
	u8 tmp;

    CLRWDT();
    init();
    CLRWDT();

	// disable timer1 interrupt:
	DISABLE_ALL_INTERRUPTS();
	PIE1bits.TMR1IE = 0;

#define SEND_BYTE(b) \
	SEND_BIT(0); \
	SEND_BIT((b & 1)); \
	SEND_BIT((b & 2)); \
	SEND_BIT((b & 4)); \
	SEND_BIT((b & 8)); \
	SEND_BIT((b & 16)); \
	SEND_BIT((b & 32)); \
	SEND_BIT((b & 64)); \
	SEND_BIT((b & 128)); \
	SEND_BIT(1);

	// Wait ~100ms for the LCD to boot up:
	SWUART_TX_LAT_BIT = 1;
	for (i=0; i<80; ++i) {
		// ~10ms timer:
		T1CONbits.TMR1ON = 0;
		PIR1bits.TMR1IF = 0;
		TMR1L = 0x00;
		TMR1H = 0x00;
		T1CONbits.TMR1ON = 1;
		while (PIR1bits.TMR1IF == 0);
		PIR1bits.TMR1IF = 0;
	}

	// Set up timer1 to wait for next baud:
	T1CONbits.TMR1ON = 0;
	TMR1L = ((unsigned short)0xFFFF - (unsigned short)TMR1_BAUD9600_PERIOD) & 0xFF;
	TMR1H = (((unsigned short)0xFFFF - (unsigned short)TMR1_BAUD9600_PERIOD) >> 8) & 0xFF;
	T1CONbits.TMR1ON = 1;

	// DISPLAY BAUD rate:
	SEND_BYTE(0xFE);
	SEND_BYTE(0x71);

	// SET BAUD rate:
	//SEND_BYTE(0xFE);
	//SEND_BYTE(0x61);
	//SEND_BYTE(0x04);	// 9600 baud

	// CLS:
	//SEND_BYTE(0xFE);
	//SEND_BYTE(0x51);

#if 0
	SEND_BYTE(0xAA);
	SEND_BYTE(0xAA);
	SEND_BYTE(0xAA);
	SEND_BYTE(0xAA);
	SEND_BYTE(0xAA);

	SEND_BYTE(0xAA);
	SEND_BYTE(0xAA);
	SEND_BYTE(0xAA);
	SEND_BYTE(0xAA);
	SEND_BYTE(0xAA);

	SEND_BYTE(0x20);
	SEND_BYTE(0x20);
	SEND_BYTE(0x20);
	SEND_BYTE(0x20);
	SEND_BYTE(0x20);

	SEND_BYTE(0x41);
	SEND_BYTE(0x42);
	SEND_BYTE(0x43);
#endif

	// CLS:
	SEND_BYTE(0xFE);
	SEND_BYTE(0x51);

	tmp = 0x41;
    for(;;) {
   		CLRWDT();

		SEND_BYTE(tmp);
		tmp++;
		if (tmp > 0x7F) {
			tmp = 0x41;

			// CLS:
			//SEND_BYTE(0xFE);
			//SEND_BYTE(0x51);

			// HOME CURSOR:
			SEND_BYTE(0xFE);
			SEND_BYTE(0x46);
		}
	}
}

#if 0

void main_lcd_isr_test() {
	u8 tmp;
	u8 cnt;

    CLRWDT();
    init();
    CLRWDT();

	// Wait a bit for the LCD to boot up:
	T1CONbits.TMR1ON = 0;
	PIR1bits.TMR1IF = 0;
	TMR1L = 0x00;
	TMR1H = 0x00;
	T1CONbits.TMR1ON = 1;
	while (PIR1bits.TMR1IF == 0);

	// DISPLAY BAUD rate:
	lcd_enqueue(0xFE);
	lcd_enqueue(0x71);
	lcd_enqueue(0x00);

	// SET BAUD rate:
	//SEND_BYTE(0xFE);
	//SEND_BYTE(0x61);
	//SEND_BYTE(0x04);	// 9600 baud

	// Start up the SWUART:
	swuart_tx_start();
   	ENABLE_ALL_INTERRUPTS();

    for(;;) {
   		CLRWDT();
	}
}

void SEND_BIT(unsigned char b) {
	u8 cnt = 0;

	if (b) SWUART_TX_LAT_BIT = true;
	else SWUART_TX_LAT_BIT = false;

	for (; cnt < 13; cnt++) {}
}

void main_lcd1152k() {
	u8 tmp;
	u8 cnt;

    CLRWDT();
    init();
    CLRWDT();

#define SEND_BYTE(b) \
	SEND_BIT(0); \
	SEND_BIT((b & 1)); \
	SEND_BIT((b & 2)); \
	SEND_BIT((b & 4)); \
	SEND_BIT((b & 8)); \
	SEND_BIT((b & 16)); \
	SEND_BIT((b & 32)); \
	SEND_BIT((b & 64)); \
	SEND_BIT((b & 128)); \
	SEND_BIT(1); \
	SEND_BIT(1); \
	SEND_BIT(1); \
	SEND_BIT(1); \
	SEND_BIT(1); \
	SEND_BIT(1); \
	SEND_BIT(1); \
	SEND_BIT(1);

	// Clear the line:
	SEND_BIT(1);
	SEND_BIT(1);
	SEND_BIT(1);
	SEND_BIT(1);
	SEND_BIT(1);
	SEND_BIT(1);
	SEND_BIT(1);
	SEND_BIT(1);
	SEND_BIT(1);

	// DISPLAY BAUD rate:
	SEND_BYTE(0xFE);
	SEND_BYTE(0x71);
	SEND_BYTE(0x00);

	// SET BAUD rate:
	//SEND_BYTE(0xFE);
	//SEND_BYTE(0x61);
	//SEND_BYTE(0x04);	// 9600 baud

	tmp = 0x41;
    for(;;) {
    	//CLRWDT();
    	//ENABLE_ALL_INTERRUPTS();

		//SEND_BYTE(tmp);
		tmp++;
		if (tmp > 0x7F) tmp = 0x41;
	}
}

void main_test1() {
    u8 tmp = 0, tmp2 = 0, tmp3 = 0;

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
            midi_enq(0xC0);
            midi_enq(tmp);
            tmp = ((tmp + 1) & 0x7F);
        }

        // Transmit next MIDI byte:
        midi_tx();
    }
}

void main_test2() {
    u8 tmp = 0, tmp2 = 0, tmp3 = 0;

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
        }

        // Transmit next MIDI byte:
        midi_tx();

        // Enable SWUART to TX LCD bytes if idle:
        if ((swuart_mode == SWUARTMODE_TX_IDLE) && (swuart_tx_bufptr > 0)) {
            swuart_tx_start();
        }
    }
}

void real_main() {
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
}

#endif
