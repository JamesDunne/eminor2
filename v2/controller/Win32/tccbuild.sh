#!/bin/sh
tcc -DUNICODE -D_UNICODE -DWINVER=0x0602 eminorv2.c ../common/controller-simple.c -lkernel32 -luser32 -lgdi32 -lwinmm -o eminorv2.exe
