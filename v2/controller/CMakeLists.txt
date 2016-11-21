cmake_minimum_required(VERSION 3.6)
project(controller)

set(CMAKE_C_FLAGS  "${CMAKE_C_FLAGS} -std=c99 -D HW_VERSION=4 -D HWFEAT_LABEL_UPDATES -D WIN32 -D _CONSOLE -D UNICODE -D _UNICODE")

set(SOURCE_FILES
    common/controller-axe.c
    common/hardware.h
    common/types.h
    PIC/flash_v3_bank0.h
    PIC/flash_v3_bank1.h
    PIC/flash_v3_bank2.h
    Win32/eminorv2.c
    Win32/font-5x8.h)

add_executable(controller ${SOURCE_FILES})
target_link_libraries(controller kernel32 gdi32 user32 winmm)
