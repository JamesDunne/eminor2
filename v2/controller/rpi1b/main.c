#include <stdio.h>
#include <stdarg.h>
#include <string.h>
#include <unistd.h>         //Used for UART
#include <fcntl.h>          //Used for UART
#include <termios.h>        //Used for UART

#include "types.h"
#include "hardware.h"

//-------------------------
//----- SETUP USART 0 -----
//-------------------------
//At bootup, pins 8 and 10 are already set to UART0_TXD, UART0_RXD (ie the alt0 function) respectively
int uart0_filestream = -1;

int midi_init(void) {
    //OPEN THE UART
    //The flags (defined in fcntl.h):
    //  Access modes (use 1 of these):
    //      O_RDONLY - Open for reading only.
    //      O_RDWR - Open for reading and writing.
    //      O_WRONLY - Open for writing only.
    //
    //  O_NDELAY / O_NONBLOCK (same function) - Enables nonblocking mode. When set read requests on the file can return immediately with a failure status
    //                                          if there is no input immediately available (instead of blocking). Likewise, write requests can also return
    //                                          immediately with a failure status if the output can't be written immediately.
    //
    //  O_NOCTTY - When set and path identifies a terminal device, open() shall not cause the terminal device to become the controlling terminal for the process.
    //Open in non blocking read/write mode
    uart0_filestream = open("/dev/ttyAMA0", O_WRONLY | O_NOCTTY | O_NDELAY);
    if (uart0_filestream == -1)
    {
        //ERROR - CAN'T OPEN SERIAL PORT
        perror("open(\"/dev/ttyAMA0\")");
        return -1;
    }

    //CONFIGURE THE UART
    //The flags (defined in /usr/include/termios.h - see http://pubs.opengroup.org/onlinepubs/007908799/xsh/termios.h.html):
    //  Baud rate:- B1200, B2400, B4800, B9600, B19200, B38400, B57600, B115200, B230400, B460800, B500000, B576000, B921600, B1000000, B1152000, B1500000, B2000000, B2500000, B3000000, B3500000, B4000000
    //  CSIZE:- CS5, CS6, CS7, CS8
    //  CLOCAL - Ignore modem status lines
    //  CREAD - Enable receiver
    //  IGNPAR = Ignore characters with parity errors
    //  ICRNL - Map CR to NL on input (Use for ASCII comms where you want to auto correct end of line characters - don't use for bianry comms!)
    //  PARENB - Parity enable
    //  PARODD - Odd parity (else even)
    struct termios options;
    tcgetattr(uart0_filestream, &options);
    options.c_cflag = B38400 | CS8 | CLOCAL;     //<Set baud rate
    options.c_iflag = IGNPAR;
    options.c_oflag = 0;
    options.c_lflag = 0;
    tcflush(uart0_filestream, TCIFLUSH);
    tcsetattr(uart0_filestream, TCSANOW, &options);
    return 0;
}

// Hardware interface from controller:
void debug_log(const char *fmt, ...) {
    va_list ap;
    printf("DEBUG: ");
    va_start(ap, fmt);
    vprintf(fmt, ap);
    va_end(ap);
    printf("\n");
}

// Poll 16 foot-switch states:
u16 fsw_poll(void) {
    return (u16)0;
}

// Explicitly set the state of all 16 LEDs:
void led_set(u16 leds) {
}

#ifdef FEAT_LCD

char lcd_ascii[LCD_ROWS][LCD_COLS];

// Get pointer to a specific LCD row:
// A terminating NUL character will clear the rest of the row with empty space.
char *lcd_row_get(u8 row) {
    return lcd_ascii[row];
}

// Update all LCD display rows as updated:
void lcd_updated_all(void) {
}

#endif

void midi_send_cmd1_impl(u8 cmd_byte, u8 data1) {
    int count;
    u8 buf[2];
    buf[0] = cmd_byte;
    buf[1] = data1;
    count = write(uart0_filestream, buf, 2);
    if (count < 0) {
        perror("Error sending MIDI bytes");
        return;
    }
    printf("MIDI: %02X %02X\n", cmd_byte, data1);
}

void midi_send_cmd2_impl(u8 cmd_byte, u8 data1, u8 data2) {
    int count;
    u8 buf[3];
    buf[0] = cmd_byte;
    buf[1] = data1;
    buf[2] = data2;
    count = write(uart0_filestream, buf, 3);
    if (count < 0) {
        perror("Error sending MIDI bytes");
        return;
    }
    printf("MIDI: %02X %02X %02X\n", cmd_byte, data1, data2);
}

// Send a single byte for SysEx:
void midi_send_sysex(u8 byte) {
    int count;
    u8 buf[1];
    buf[0] = byte;
    count = write(uart0_filestream, buf, 1);
    if (count < 0) {
        perror("Error sending MIDI bytes");
        return;
    }
    // TODO: buffer this until 0xF7.
    printf("MIDI: %02X\n", byte);
}

// --------------- Flash memory functions:

#if HW_VERSION == 4
u8 flash_bank[3][4096] = {
    {
#include "../PIC/flash_v4_bank0.h"
    },
    {
#include "../PIC/flash_v4_bank1.h"
    },
    {
#include "../PIC/flash_v4_bank2.h"
    }
};
#endif

// Flash addresses are 0-based where 0 is the first available byte of
// non-program flash memory.

// Load `count` bytes from flash memory at address `addr` into `data`:
void flash_load(u16 addr, u16 count, u8 *data) {
    int bank = addr >> 12;
    int offs = addr & 0x0FFF;

    memcpy((void *)data, (const void *)&flash_bank[bank][offs], (size_t)count);
}

// Stores `count` bytes from `data` into flash memory at address `addr`:
void flash_store(u16 addr, u16 count, u8 *data) {
}

// Get a pointer to flash memory at address:
rom const u8 *flash_addr(u16 addr) {
    int bank = addr >> 12;
    int offs = addr & 0x0FFF;

    return (u8 *)flash_bank[bank] + offs;
}

#ifdef HWFEAT_LABEL_UPDATES

// --------------- Change button labels (for Win32 / HTML5 interfaces only):

/* export */ char **label_row_get(u8 row);
/* export */ void label_row_update(u8 row);

#endif

// Main function:
int main(void) {
    struct timespec t;
    t.tv_sec  = 0;
    t.tv_nsec = 10000000L;  // 10 ms

    if (midi_init()) {
        return 1;
    }

    // Initialize controller:
    controller_init();

    while (1) {
        // Run controller code:
        controller_handle();

        // Run timer handler:
        controller_10msec_timer();

        // Sleep for 10ms:
        while (nanosleep(&t, &t));
    }

    close(uart0_filestream);
}
