#!/bin/bash

# http://www.welzels.de/blog/en/arm-cross-compiling-with-mac-os-x/
#CC=/usr/local/linaro/arm-linux-gnueabihf-raspbian/bin/arm-linux-gnueabihf-gcc
CC=gcc

SRCS=(*.c)

$CC -g -DHW_VERSION=4 -I../common "${SRCS[@]}"
