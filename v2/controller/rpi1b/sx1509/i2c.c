#include <stdio.h>
#include <string.h>
#include <fcntl.h>

#include <linux/i2c-dev.h>
#include <linux/i2c.h>


#include "types.h"

int i2c_fd = -1;
const char *i2c_fname = "/dev/i2c-1";

// Returns a new file descriptor for communicating with the I2C bus:
int i2c_init() {
    if ((i2c_fd = open(i2c_fname, O_RDWR)) < 0) {
        char err[100];
        sprintf(err, "open('%s')", i2c_fname);
        perror(err);
        return -1;
    }

    return i2c_fd;
}

void i2c_close() {
    close(i2c_fd);
}

int i2c_write(u8 slave_addr, u8 reg, u16 data_size, u8 *data) {
    int retval;
    u8 outbuf[1];
    struct i2c_msg msgs[1];
    struct i2c_rdwr_ioctl_data msgset[1];

    msgs[0].addr = slave_addr;
    msgs[0].flags = 0;
    msgs[0].len = 1 + data_size;
    msgs[0].buf = outbuf;

    msgset[0].msgs = msgs;
    msgset[0].nmsgs = 1;

    outbuf[0] = reg;
    memcpy(outbuf+1, data, data_size);

    if (ioctl(i2c_fd, I2C_RDWR, &msgset) < 0) {
        perror("ioctl(I2C_RDWR)");
        return -1;
    }

    return 0;
}

int i2c_read(u8 slave_addr, u8 reg, u16 result_size, u8 *result) {
    int retval;
    u8 outbuf[1], inbuf[1];
    struct i2c_msg msgs[2];
    struct i2c_rdwr_ioctl_data msgset[1];

    msgs[0].addr = slave_addr;
    msgs[0].flags = 0;
    msgs[0].len = 1;
    msgs[0].buf = outbuf;

    msgs[1].addr = slave_addr;
    msgs[1].flags = I2C_M_RD;
    msgs[1].len = 1;
    msgs[1].buf = inbuf;

    msgset[0].msgs = msgs;
    msgset[0].nmsgs = 2;

    outbuf[0] = reg;

    inbuf[0] = 0;

    *result = 0;
    if (ioctl(i2c_fd, I2C_RDWR, &msgset) < 0) {
        perror("ioctl(I2C_RDWR)");
        return -1;
    }

    *result = inbuf[0];
    return 0;
}
