#!/bin/sh
# http://www.welzels.de/blog/en/arm-cross-compiling-with-mac-os-x/
/usr/local/linaro/arm-linux-gnueabihf-raspbian/bin/arm-linux-gnueabihf-gcc -g -DHW_VERSION=4 -I../common main.c ../common/controller-axe.c
