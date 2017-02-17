#include "types.h"

int i2c_init();
void i2c_close();

int i2c_write(u8 slave_addr, u8 reg, u16 data_size, u8 *data);
int i2c_read(u8 slave_addr, u8 reg, u16 result_size, u8 *result);
