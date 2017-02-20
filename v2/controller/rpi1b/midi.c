#include <stdio.h>
#include <stdarg.h>
#include <string.h>

#include <errno.h>
#include <fcntl.h>
#include <asm/termios.h>
#include <unistd.h>

#include "types.h"
#include "hardware.h"

//-------------------------
//----- SETUP USART 0 -----
//-------------------------
int uart0_fd = -1;
const char *midi_fname = "/dev/ttyAMA0";

int midi_init(void) {
    struct termios2 tio;

    uart0_fd = open(midi_fname, O_RDWR | O_NOCTTY | O_NONBLOCK);
    if (uart0_fd == -1) {
        char err[100];
        sprintf(err, "open('%s')", midi_fname);
        perror(err);
        return -1;
    }

    // Set baud rate to 31250 for MIDI:
    ioctl(uart0_fd, TCGETS2, &tio);

    tio.c_cflag &= ~CBAUD;
    tio.c_cflag |= BOTHER;
    tio.c_ispeed = 31250;
    tio.c_ospeed = 31250;
    ioctl(uart0_fd, TCSETS2, &tio);

    return uart0_fd;
}

void midi_send_cmd1_impl(u8 cmd_byte, u8 data1) {
    int count;
    u8 buf[2];
    buf[0] = cmd_byte;
    buf[1] = data1;
    count = write(uart0_fd, buf, 2);
    if (count != 2) {
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
    if (count != 3) {
        perror("Error sending MIDI bytes");
        return;
    }
    printf("MIDI: %02X %02X %02X\n", cmd_byte, data1, data2);
}

u8 sysex[256];
size_t sysex_p = 0;

void midi_send_sysex(u8 byte) {
    //printf("MIDI: %02X\n", byte);

    if (sysex_p >= 256) {
        fprintf(stderr, "MIDI SysEx data too large (>= 256 bytes)\n");
        return;
    }

    // Buffer data:
    sysex[sysex_p++] = byte;

    if (byte == 0xF7) {
        size_t i;
        size_t write_count = sysex_p;
        sysex_p = 0;

        printf("MIDI SysEx:");
        for (i = 0; i < write_count; i++) {
            printf(" %02X", sysex[i]);
        }
        printf("\n");

        ssize_t count = write(uart0_fd, sysex, write_count);
        if (count < 0) {
            perror("write in midi_send_sysex");
            return;
        }
        if (count != write_count) {
            fprintf(stderr, "midi_send_sysex write didnt write enough bytes\n");
            return;
        }
    }
}
