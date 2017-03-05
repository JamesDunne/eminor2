#include <stdio.h>
#include "types.h"
#include "i2c.h"

typedef u8 byte;
#include "sx1509_registers.h"

u16 sx1509_read_data(u8 slave_addr_leds) {
    u8 buf[2];
    if (i2c_read(slave_addr_leds, REG_DATA_A, &buf[0]) != 0) {
        return 0;
    }
    if (i2c_read(slave_addr_leds, REG_DATA_B, &buf[1]) != 0) {
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
    const u8 slave_addr_btns = 0x3E;
    const u8 slave_addr_leds = 0x70;

    printf("i2c_init()\n");
    i2c_init();

    printf("sx1509_setup(0x%02X)\n", slave_addr_btns);

    // Enable all inputs:
    if (i2c_write(slave_addr_btns, REG_DIR_A,           0xFF) != 0) goto fail;
    if (i2c_write(slave_addr_btns, REG_DIR_B,           0xFF) != 0) goto fail;
    if (i2c_write(slave_addr_btns, REG_INPUT_DISABLE_A, 0x00) != 0) goto fail;
    if (i2c_write(slave_addr_btns, REG_INPUT_DISABLE_B, 0x00) != 0) goto fail;

    // Pull-up resistor on button pins:
    if (i2c_write(slave_addr_btns, REG_PULL_UP_A,   0xFF) != 0) goto fail;
    if (i2c_write(slave_addr_btns, REG_PULL_UP_B,   0xFF) != 0) goto fail;
    if (i2c_write(slave_addr_btns, REG_PULL_DOWN_A, 0x00) != 0) goto fail;
    if (i2c_write(slave_addr_btns, REG_PULL_DOWN_B, 0x00) != 0) goto fail;

    printf("sx1509_setup(0x%02X)\n", slave_addr_leds);

    // Set all pins as outputs for LEDs:
    if (i2c_write(slave_addr_leds, REG_DIR_A,           0x00) != 0) goto fail;
    if (i2c_write(slave_addr_leds, REG_DIR_B,           0x00) != 0) goto fail;
    if (i2c_write(slave_addr_leds, REG_INPUT_DISABLE_A, 0xFF) != 0) goto fail;
    if (i2c_write(slave_addr_leds, REG_INPUT_DISABLE_B, 0xFF) != 0) goto fail;

    // No pull-up or pull-down resistors on LED pins:
    if (i2c_write(slave_addr_leds, REG_PULL_UP_A,   0x00) != 0) goto fail;
    if (i2c_write(slave_addr_leds, REG_PULL_UP_B,   0x00) != 0) goto fail;
    if (i2c_write(slave_addr_leds, REG_PULL_DOWN_A, 0x00) != 0) goto fail;
    if (i2c_write(slave_addr_leds, REG_PULL_DOWN_B, 0x00) != 0) goto fail;

    while (1) {
        u8 btnA = 0, btnB = 0;
        // Read btn input pins:
        i2c_read(slave_addr_btns, REG_DATA_A, &btnA);
        i2c_read(slave_addr_btns, REG_DATA_B, &btnB);
        // Buttons are active-low so invert all bits:
        btnA = ~btnA;
        btnB = ~btnB;
        // Write button state to LEDs:
        i2c_write(slave_addr_leds, REG_DATA_A, btnA);
        i2c_write(slave_addr_leds, REG_DATA_B, btnB);
        usleep(10L * 1000L);
    }

fail:
    i2c_close();
}
