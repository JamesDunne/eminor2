#include "types.h"

// SX1509 breakout board exposes ADD1 and ADD0 jumpers for configuring I2C address.
// https://learn.sparkfun.com/tutorials/sx1509-io-expander-breakout-hookup-guide#sx1509-breakout-board-overview
// ADD1 = 0, ADD0 = 0
#define i2c_sx1509_btn_addr 0x3E
// ADD1 = 1, ADD0 = 0
#define i2c_sx1509_led_addr 0x70

int i2c_init(void);
void i2c_close(void);

int i2c_write(u8 slave_addr, u8 reg, u8 data);
int i2c_read(u8 slave_addr, u8 reg, u8 *result);
