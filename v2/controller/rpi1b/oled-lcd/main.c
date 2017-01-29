#include <stdio.h>
#include <stdlib.h>
#include <linux/i2c-dev.h>
#include <fcntl.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>

int fd;

int cmd(unsigned char c) {
    unsigned char buf[2];
    buf[0] = 0x00;
    buf[1] = c;
    return write(fd, buf, 2);
}

int main(int argc, char **argv) {
    int i, j;
    const char *fname = "/dev/i2c-1";
    const int address = 0x3c;
    unsigned char buf[1025];

    if ((fd = open(fname, O_RDWR)) < 0) {
        perror("open('/dev/i2c-1')");
        return -1;
    }

    if (ioctl(fd, I2C_SLAVE, address) < 0) {
        perror("ioctl()");
        return -1;
    }

    cmd(0xae);
    cmd(0xd5);
    cmd(0x80);
    cmd(0xa8);
    cmd(0x3f);
    cmd(0xd3);
    cmd(0x00);
    cmd(0x40);
    cmd(0x8d);
    cmd(0x14);
    cmd(0x20);  // memory mode
    cmd(0x00);  // 0x00 = horizontal, 0x01 = vertical, 0x02 = paged
    cmd(0xa1);  // set segment remap
    cmd(0xc8);  // see table 10-3 (0xc8)
    cmd(0xda);  // set COM pins hw config
    cmd(0x02);  // was 0x12
    cmd(0x81);
    cmd(0xcf);
    cmd(0xd9);
    cmd(0xf1);
    cmd(0xdb);
    cmd(0x40);
    cmd(0xa4);
    cmd(0xa6);
    cmd(0xaf);

    buf[0] = 0x40;
    for (j = 0; j < 16*16; j++) {
        cmd(0x40);
        cmd(0xd3);
        cmd(0x00);
        for (i = 1; i <= 1024; i++) {
            buf[i] = 0xff ^ (i&0xff) ^ (j&0xff);
        }
        if (write(fd, buf, 1025) != 1025) {
            perror("write");
            return -1;
        }
    }

    close(fd);

    return 0;
}
