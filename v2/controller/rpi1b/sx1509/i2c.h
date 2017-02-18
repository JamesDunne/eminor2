#include "types.h"

int i2c_init();
void i2c_close();

int i2c_write(u8 slave_addr, u8 reg, u8 data);
int i2c_read(u8 slave_addr, u8 reg, u8 *result);
