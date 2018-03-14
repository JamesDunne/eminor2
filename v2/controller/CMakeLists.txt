cmake_minimum_required(VERSION 3.9)
project(controller)

set(CMAKE_CXX_STANDARD 11)
add_definitions(-DHW_VERSION=5)

add_executable(controller
        common/controller-v5-rom1.c
        common/controller-v5.c
        common/hardware.h
        common/program-v5.h
        common/types.h
        common/util.c
        common/util.h
        common/v5_fx_names.h
        PIC/flash_v5_bank0.h
        PIC/flash_v5_bank1.h
        PIC/flash_v5_bank2.h)
