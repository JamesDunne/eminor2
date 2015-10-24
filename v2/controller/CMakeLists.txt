cmake_minimum_required(VERSION 3.3)
project(controller)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11")

set(SOURCE_FILES
    common/controller-two.c
    common/hardware.h
    common/types.h
    Win32/eminorv2.c
    Win32/font-5x8.h)

add_executable(controller ${SOURCE_FILES})