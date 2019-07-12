#!/bin/bash
clang test-util.c util.c controller-v5-rom1.c && ./a.out 0 && ./a.out 1 && ./a.out 10 && ./a.out 99 && ./a.out 127 && ./a.out 254
