#include <stdio.h>
#include "types.h"
#include "i2c.h"

typedef u8 byte;
#include "sx1509_registers.h"

int sx1509_set_register(u8 slave_addr, u8 reg, u8 value) {
    return i2c_write(slave_addr, reg, value);
}

u16 sx1509_read_data(u8 slave_addr) {
    u8 buf[2];
    if (i2c_read(slave_addr, REG_DATA_A, &buf[0]) != 0) {
        return 0;
    }
    if (i2c_read(slave_addr, REG_DATA_B, &buf[1]) != 0) {
        return 0;
    }
    return ((u16)buf[1] << 8) | (u16)buf[0];
}

#define BYTE_TO_BINARY_PATTERN "%c%c%c%c%c%c%c%c"
#define BYTE_TO_BINARY(byte)  \
  (byte & 0x80 ? '1' : '0'), \
  (byte & 0x40 ? '1' : '0'), \
  (byte & 0x20 ? '1' : '0'), \
  (byte & 0x10 ? '1' : '0'), \
  (byte & 0x08 ? '1' : '0'), \
  (byte & 0x04 ? '1' : '0'), \
  (byte & 0x02 ? '1' : '0'), \
  (byte & 0x01 ? '1' : '0')

int main() {
    const u8 slave_addr = 0x3E;

    i2c_init();

    // Enable all inputs:
    if (sx1509_set_register(slave_addr, REG_INPUT_DISABLE_A, 0x00) != 0) goto fail;
    if (sx1509_set_register(slave_addr, REG_INPUT_DISABLE_B, 0x00) != 0) goto fail;

    // Pull-up resistor on button pins:
    if (sx1509_set_register(slave_addr, REG_PULL_UP_A, 0xFF) != 0) goto fail;
    if (sx1509_set_register(slave_addr, REG_PULL_UP_B, 0xFF) != 0) goto fail;
    if (sx1509_set_register(slave_addr, REG_PULL_DOWN_A, 0x00) != 0) goto fail;
    if (sx1509_set_register(slave_addr, REG_PULL_DOWN_B, 0x00) != 0) goto fail;

    while (1) {
        u16 buttons = sx1509_read_data(slave_addr);
        printf(
            "%04X "BYTE_TO_BINARY_PATTERN""BYTE_TO_BINARY_PATTERN"\n",
            buttons,
            BYTE_TO_BINARY(buttons>>8),
            BYTE_TO_BINARY(buttons)
        );
        usleep(50L * 1000L);
    }

fail:
    i2c_close();
}
