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
int uart0_fd = -1;
const char *midi_fname = "/dev/ttyAMA0";

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
    uart0_fd = open(midi_fname, O_WRONLY | O_NOCTTY | O_NDELAY);
    if (uart0_fd == -1) {
        char err[100];
        sprintf(err, "open('%s')", midi_fname);
        perror(err);
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
    tcgetattr(uart0_fd, &options);
    options.c_cflag = B38400 | CS8 | CLOCAL;     //<Set baud rate
    options.c_iflag = IGNPAR;
    options.c_oflag = 0;
    options.c_lflag = 0;
    tcflush(uart0_fd, TCIFLUSH);
    tcsetattr(uart0_fd, TCSANOW, &options);
    return 0;
}

void midi_send_cmd1_impl(u8 cmd_byte, u8 data1) {
    int count;
    u8 buf[2];
    buf[0] = cmd_byte;
    buf[1] = data1;
    count = write(uart0_fd, buf, 2);
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
    count = write(uart0_fd, buf, 3);
    if (count < 0) {
        perror("Error sending MIDI bytes");
        return;
    }
    printf("MIDI: %02X %02X %02X\n", cmd_byte, data1, data2);
}

// TODO: buffer up sysex commands and send all bytes from F0 .. F7 at once in a write().
// Send a single byte for SysEx:
void midi_send_sysex(u8 byte) {
    int count;
    u8 buf[1];
    buf[0] = byte;
    count = write(uart0_fd, buf, 1);
    if (count < 0) {
        perror("Error sending MIDI bytes");
        return;
    }
    // TODO: buffer this until 0xF7.
    printf("MIDI: %02X\n", byte);
}
