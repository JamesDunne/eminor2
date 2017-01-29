#!/bin/bash
export PATH=/usr/sbin:$PATH
i2cset -y 1 0x3c 0x00 0xaf # display on
