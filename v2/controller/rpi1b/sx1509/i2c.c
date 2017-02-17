#include <stdio.h>
#include <fcntl.h>

#include <linux/i2c-dev.h>

#include "types.h"

const char *i2c_fname = "/dev/i2c-1";

// Returns a new file descriptor for communicating with the given I2C slave address:
int i2c_init(u8 slave_addr) {
    int fd;

    if ((fd = open(i2c_fname, O_RDWR)) < 0) {
        char err[100];
        sprintf(err, "open('%s')", i2c_fname);
        perror(err);
        return -1;
    }

    if (ioctl(fd, I2C_SLAVE, slave_addr) < 0) {
        perror("ioctl I2C_SLAVE");
        return -1;
    }

    return fd;
}

int i2c_write(int fd, u8 reg, size_t data_size, u8 *data) {
    int retval;
    u8 outbuf[1];

    outbuf[0] = reg;
    if ((retval = write(fd, outbuf, 1)) != 1) {
        return retval;
    }

    if ((retval = write(fd, data, data_size)) != data_size) {
        return retval;
    }

    return 0;
}

int i2c_read(int fd, u8 reg, size_t result_size, u8 *result) {
    int retval;
    u8 outbuf[1];

    outbuf[0] = reg;
    if ((retval = write(fd, outbuf, 1)) != 2) {
        return retval;
    }

    if ((retval = read(fd, result, result_size)) != 1) {
        return retval;
    }

    return 0;
}
