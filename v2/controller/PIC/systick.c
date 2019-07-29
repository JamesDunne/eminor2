//*;###########################################################################
//;#            Author: Joe Dunne                                             #
//;#            Date 6/01/07                                                  #
//;#            System time routine                                           #
//;#            File Name: systick.c                                          #
//;#                                                                          #
//;############################################################################


#include "c_system.h"
#include "typedefs.h"
#include "hardware.h"

extern u16 timer[TIME_MARKER_COUNT];

void systick_init(void) {
    timer[0] = 0xFFFFu;
    timer[1] = 0xFFFFu;
}

//1mS time keeping routine:
void SystemTimeRoutine(void) {
    // Timers:
    if (timer[0] != 0xFFFF) {
        timer[0]++;
    }
    if (timer[1] != 0xFFFF) {
        timer[1]++;
    }

    SystickCntr2++;
    if (SystickCntr2 == SYSTEM_TIME_10MS) {
        SystickCntr2 = 0;

        // 10mS routines:
        HandleController = true;
        HandleLeds = true;
        ControllerTiming = true;

        SystickCntr3++;
        if (SystickCntr3 == SYSTEM_TIME_40MS) {
            SystickCntr3 = 0;
            // 40mS routines:
            CheckButtons = true;
        }
    }
}