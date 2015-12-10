#!/bin/bash
gcc -std=c99 -DHW_VERSION=$HW_VERSION -DHWFEAT_LABEL_UPDATES -DUNICODE -D_UNICODE -D_WIN32_WINNT=0x0601 eminorv2.c ../common/controller-one.c ../common/controller-two.c -Wl,--subsystem,windows -lkernel32 -luser32 -lgdi32 -lwinmm -o eminorv2.exe
