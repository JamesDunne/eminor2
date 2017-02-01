#include <stdio.h>
#include <stdarg.h>
#include <string.h>
#include <unistd.h>         //Used for UART
#include <fcntl.h>          //Used for UART
#include <termios.h>        //Used for UART

#ifdef __linux
#include <stdlib.h>
#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <sys/types.h>
#include <sys/stat.h>
#endif

#include "types.h"
#include "hardware.h"

int i2c_fd = -1;
const char *i2c_fname = "/dev/i2c-1";

#ifdef __linux

// http://www.robot-electronics.co.uk/files/rpi_lcd05.c
int i2c_init() {
    if ((i2c_fd = open(i2c_fname, O_RDWR)) < 0) {
        char err[100];
        sprintf(err, "open('%s')", i2c_fname);
        perror(err);
        return -1;
    }
    // TODO: figure out how to communicate with the SX1509.

    return 0;
}

void i2c_write_u8(u8 addr, u8 reg, u8 data) {
    u8 outbuf[2], inbuf[2];
    if (ioctl(i2c_fd, I2C_SLAVE, addr) < 0) {
        perror("ioctl I2C_SLAVE for LEDs");
        return -1;
    }

    outbuf[0] = reg;
    outbuf[1] = data;
    if (write(i2c_fd, outbuf, 2) != 2) {
        perror("i2c write");
        exit(-1);
    }
}

u8 i2c_read_u8(u8 addr, u8 reg) {
    return 0;
}

#endif

