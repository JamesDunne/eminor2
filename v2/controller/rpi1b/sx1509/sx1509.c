#include <stdio.h>
#include "types.h"
#include "i2c.h"

typedef u8 byte;
#include "sx1509_registers.h"

u16 sx1509_read(u8 slave_addr) {
    u8 buf[2];
    if (i2c_read(slave_addr, REG_DATA_A, 1, &buf[0]) != 0) {
        return 0;
    }
    if (i2c_read(slave_addr, REG_DATA_B, 1, &buf[1]) != 0) {
        return 0;
    }
    return ((u16)buf[1] << 8) | (u16)buf[0];
}

int main() {
    i2c_init();

    while (1) {
        u16 buttons = sx1509_read(0x3E);
        printf("%04X\n", buttons);
        usleep(50L * 1000L);
    }

    i2c_close();
}
