
#include "types.h"
#include "hardware.h"

#include "i2c.h"
typedef u8 byte;
#include "sx1509_registers.h"

int fsw_init(void) {
    // Enable all inputs:
    if (i2c_write(i2c_sx1509_btn_addr, REG_INPUT_DISABLE_A, 0x00) != 0) goto fail;
    if (i2c_write(i2c_sx1509_btn_addr, REG_INPUT_DISABLE_B, 0x00) != 0) goto fail;

    // Pull-up resistor on button pins:
    if (i2c_write(i2c_sx1509_btn_addr, REG_PULL_UP_A,   0xFF) != 0) goto fail;
    if (i2c_write(i2c_sx1509_btn_addr, REG_PULL_UP_B,   0xFF) != 0) goto fail;
    if (i2c_write(i2c_sx1509_btn_addr, REG_PULL_DOWN_A, 0x00) != 0) goto fail;
    if (i2c_write(i2c_sx1509_btn_addr, REG_PULL_DOWN_B, 0x00) != 0) goto fail;

    return 0;

fail:
	return -1;
}

// Poll 16 foot-switch states:
u16 fsw_poll(void) {
    u8 buf[2];
    if (i2c_read(i2c_sx1509_btn_addr, REG_DATA_A, &buf[0]) != 0) return 0;
    if (i2c_read(i2c_sx1509_btn_addr, REG_DATA_B, &buf[1]) != 0) return 0;
    return ~(u16)( ((u16)buf[1] << 8) | (u16)buf[0] );
}
