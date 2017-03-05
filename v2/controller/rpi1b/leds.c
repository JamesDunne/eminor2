
#include "types.h"
#include "hardware.h"

#include "i2c.h"
typedef u8 byte;
#include "sx1509_registers.h"

// Initialize SX1509 for LEDs by configuring all pins as outputs:
int led_init(void) {
    // Set all pins as outputs for LEDs:
    if (i2c_write(i2c_sx1509_led_addr, REG_DIR_A,           0x00) != 0) goto fail;
    if (i2c_write(i2c_sx1509_led_addr, REG_DIR_B,           0x00) != 0) goto fail;
    if (i2c_write(i2c_sx1509_led_addr, REG_INPUT_DISABLE_A, 0xFF) != 0) goto fail;
    if (i2c_write(i2c_sx1509_led_addr, REG_INPUT_DISABLE_B, 0xFF) != 0) goto fail;

    // No pull-up or pull-down resistors on LED pins:
    if (i2c_write(i2c_sx1509_led_addr, REG_PULL_UP_A,   0x00) != 0) goto fail;
    if (i2c_write(i2c_sx1509_led_addr, REG_PULL_UP_B,   0x00) != 0) goto fail;
    if (i2c_write(i2c_sx1509_led_addr, REG_PULL_DOWN_A, 0x00) != 0) goto fail;
    if (i2c_write(i2c_sx1509_led_addr, REG_PULL_DOWN_B, 0x00) != 0) goto fail;

    return 0;

fail:
	return -1;
}

// Set 16 LED states:
void led_set(u16 leds) {
    u8 buf[2];
    buf[0] = leds & (u8)0xFF;
    buf[1] = (u8)(leds >> (u8)8) & (u8)0xFF;
    // Read both data registers to get entire 16 bits of input state:
    if (i2c_write(i2c_sx1509_led_addr, REG_DATA_A, buf[0]) != 0) return;
    if (i2c_write(i2c_sx1509_led_addr, REG_DATA_B, buf[1]) != 0) return;
    return;
}
