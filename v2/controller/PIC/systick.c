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

//1mS time keeping routine:
void    SystemTimeRoutine(void) {
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