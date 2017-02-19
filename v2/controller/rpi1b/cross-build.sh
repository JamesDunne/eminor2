#!/bin/bash

# http://www.welzels.de/blog/en/arm-cross-compiling-with-mac-os-x/
CC=/usr/local/linaro/arm-linux-gnueabihf-raspbian/bin/arm-linux-gnueabihf-gcc

SRCS=(main.c ../common/controller-axe.c flash.c i2c.c fsw.c lcd.c leds.c midi.c)

$CC -g -o rpi1b -DHW_VERSION=4 -I../common "${SRCS[@]}"
