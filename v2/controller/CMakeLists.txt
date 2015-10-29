cmake_minimum_required(VERSION 3.3)
project(controller)

add_definitions(-DHW_VERSION=1)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c99")

set(SOURCE_FILES
    common/controller-one.c
    common/controller-two.c
    common/hardware.h
    common/types.h
    Win32/eminorv2.c
    Win32/font-5x8.h)

add_executable(controller ${SOURCE_FILES})