#include <stdio.h>
#include <stdarg.h>
#include <string.h>
#include <unistd.h>         //Used for UART
#include <fcntl.h>          //Used for UART
#include <termios.h>        //Used for UART
#include <time.h>

#ifdef __linux
#include <stdlib.h>
#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <sys/types.h>
#include <sys/stat.h>
#endif

#include "types.h"
#include "hardware.h"
#include "i2c.h"
#include "midi.h"
#include "fsw.h"

// Hardware interface from controller:
void debug_log(const char *fmt, ...) {
    va_list ap;
    printf("DEBUG: ");
    va_start(ap, fmt);
    vprintf(fmt, ap);
    va_end(ap);
    printf("\n");
}

// Explicitly set the state of all 16 LEDs:
void led_set(u16 leds) {
}

#ifdef HWFEAT_LABEL_UPDATES

// --------------- Change button labels (for Win32 / HTML5 interfaces only):

/* export */ char **label_row_get(u8 row);
/* export */ void label_row_update(u8 row);

#endif

// Main function:
int main(void) {
    struct timespec t;
    t.tv_sec  = 0;
    t.tv_nsec = 10000000L;  // 10 ms

    if (midi_init()) {
        return 1;
    }

    if (i2c_init()) {
        return 2;
    }

    // Init SX1509 for reading buttons (fsw):
    fsw_init();

    // Initialize controller:
    controller_init();

    while (1) {
        // Sleep for 10ms:
        while (nanosleep(&t, &t));

        // Run timer handler:
        controller_10msec_timer();

        // Run controller code:
        controller_handle();
    }
}
