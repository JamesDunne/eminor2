#!/bin/bash

# http://www.welzels.de/blog/en/arm-cross-compiling-with-mac-os-x/
CC=/usr/local/linaro/arm-linux-gnueabihf-raspbian/bin/arm-linux-gnueabihf-gcc

SRCS=(main.c midi.c flash.c lcd.c leds.c buttons.c sx1509.c ../common/controller-axe.c)

$CC -g -DHW_VERSION=4 -I../common "${SRCS[@]}"
