//#include "types.h"

// SX1509 breakout board exposes ADD1 and ADD0 jumpers for configuring I2C address.
// https://learn.sparkfun.com/tutorials/sx1509-io-expander-breakout-hookup-guide#sx1509-breakout-board-overview
const u8 i2c_sx1509_led_addr = 0x3E;  // ADD1 = 0, ADD0 = 0
const u8 i2c_sx1509_btn_addr = 0x70;  // ADD1 = 1, ADD0 = 0

int i2c_init(void);

void i2c_write_u8(u8 addr, u8 reg, u8 data);

u8 i2c_read_u8(u8 addr, u8 reg);
