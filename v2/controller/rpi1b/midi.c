#include <stdio.h>
#include <stdarg.h>
#include <string.h>

#include <errno.h>
#include <fcntl.h> 
#include <termios.h>
#include <unistd.h>

#include "types.h"
#include "hardware.h"

//-------------------------
//----- SETUP USART 0 -----
//-------------------------
int uart0_fd = -1;
const char *midi_fname = "/dev/ttyAMA0";

int set_interface_attribs(int fd, int speed, int parity) {
    struct termios tty;
    memset(&tty, 0, sizeof tty);
    if (tcgetattr(fd, &tty) != 0) {
        perror("tcgetattr");
        return -1;
    }

    cfsetospeed(&tty, speed);
    cfsetispeed(&tty, speed);

    tty.c_cflag = (tty.c_cflag & ~CSIZE) | CS8;     // 8-bit chars
    // disable IGNBRK for mismatched speed tests; otherwise receive break
    // as \000 chars
    tty.c_iflag &= ~IGNBRK;         // disable break processing
    tty.c_lflag = 0;                // no signaling chars, no echo,
                                    // no canonical processing
    tty.c_oflag = 0;                // no remapping, no delays
    tty.c_cc[VMIN]  = 0;            // read doesn't block
    tty.c_cc[VTIME] = 5;            // 0.5 seconds read timeout

    tty.c_iflag &= ~(IXON | IXOFF | IXANY); // shut off xon/xoff ctrl

    tty.c_cflag |= (CLOCAL | CREAD);// ignore modem controls,
                                    // enable reading
    tty.c_cflag &= ~(PARENB | PARODD);      // shut off parity
    tty.c_cflag |= parity;
    tty.c_cflag &= ~CSTOPB;
    tty.c_cflag &= ~CRTSCTS;

    if (tcsetattr(fd, TCSANOW, &tty) != 0) {
        perror("tcsetattr");
        return -1;
    }
    return 0;
}

int set_blocking(int fd, int should_block) {
    struct termios tty;
    memset(&tty, 0, sizeof tty);
    if (tcgetattr(fd, &tty) != 0) {
        perror("tcgetattr");
        return -1;
    }

    tty.c_cc[VMIN]  = should_block ? 1 : 0;
    tty.c_cc[VTIME] = 5;            // 0.5 seconds read timeout

    if (tcsetattr(fd, TCSANOW, &tty) != 0) {
        perror("tcsetattr");
        return -1;
    }
    return 0;
}

int midi_init(void) {
    uart0_fd = open(midi_fname, O_RDWR | O_NOCTTY | O_SYNC);
    if (uart0_fd == -1) {
        char err[100];
        sprintf(err, "open('%s')", midi_fname);
        perror(err);
        return -1;
    }

	// set speed to 38,400 bps, 8n1 (no parity)
	set_interface_attribs(uart0_fd, B38400, 0);
	// set no blocking
	set_blocking(uart0_fd, 0);

    return uart0_fd;
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
