#include <stdio.h>
#include "types.h"
#include "i2c.h"

typedef u8 byte;
#include "sx1509_registers.h"

u16 sx1509_read_data(u8 slave_addr) {
    u8 buf[2];
    if (i2c_read(slave_addr, REG_DATA_A, &buf[0]) != 0) {
        return 0;
    }
    if (i2c_read(slave_addr, REG_DATA_B, &buf[1]) != 0) {
        return 0;
    }
    return ~(u16)( ((u16)buf[1] << 8) | (u16)buf[0] );
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

    printf("i2c_init()\n");
    i2c_init();

    printf("sx1509_setup()\n");

#if 0
    // Enable all inputs:
    if (i2c_write(slave_addr, REG_INPUT_DISABLE_A, 0x00) != 0) goto fail;
    if (i2c_write(slave_addr, REG_INPUT_DISABLE_B, 0x00) != 0) goto fail;

    // Pull-up resistor on button pins:
    if (i2c_write(slave_addr, REG_PULL_UP_A,   0xFF) != 0) goto fail;
    if (i2c_write(slave_addr, REG_PULL_UP_B,   0xFF) != 0) goto fail;
    if (i2c_write(slave_addr, REG_PULL_DOWN_A, 0x00) != 0) goto fail;
    if (i2c_write(slave_addr, REG_PULL_DOWN_B, 0x00) != 0) goto fail;

    printf("loop\n");
    while (1) {
        u16 buttons = sx1509_read_data(slave_addr);
        printf(
            ""BYTE_TO_BINARY_PATTERN" "BYTE_TO_BINARY_PATTERN"\n",
            BYTE_TO_BINARY(buttons>>8),
            BYTE_TO_BINARY(buttons)
        );
        usleep(100L * 1000L);
    }
#else
    // Set only pin 15 as output for LED.
    if (i2c_write(slave_addr, REG_INPUT_DISABLE_A, 0x00) != 0) goto fail;
    if (i2c_write(slave_addr, REG_INPUT_DISABLE_B, 0x80) != 0) goto fail;
    if (i2c_write(slave_addr, REG_DIR_A,       0xFF) != 0) goto fail;
    if (i2c_write(slave_addr, REG_DIR_B,       0x7F) != 0) goto fail;

    // Pull-up resistor on button pins:
    if (i2c_write(slave_addr, REG_PULL_UP_A,   0xFF) != 0) goto fail;
    if (i2c_write(slave_addr, REG_PULL_UP_B,   0x7F) != 0) goto fail;
    if (i2c_write(slave_addr, REG_PULL_DOWN_A, 0x00) != 0) goto fail;
    if (i2c_write(slave_addr, REG_PULL_DOWN_B, 0x00) != 0) goto fail;

    while (1) {
        u8 btn = 0;
        // Read input pin5 and transfer its state to output pin15:
        i2c_read(slave_addr, REG_DATA_A, &btn);
        btn = ~btn;
        i2c_write(slave_addr, REG_DATA_B, (btn & 0x20) << 2);
        usleep(10L * 1000L);
    }
#endif

fail:
    i2c_close();
}
