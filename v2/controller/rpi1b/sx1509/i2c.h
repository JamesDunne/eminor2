#include "types.h"

int i2c_init(u8 slave_addr);
int i2c_write(int fd, u8 reg, size_t data_size, u8 *data);
int i2c_read(int fd, u8 reg, size_t result_size, u8 *result);
