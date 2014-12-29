/*
    Programmable e-minor MIDI foot controller v1.

    Currently designed to work with:
    Fractal Audio Axe-FX ][

    Assumptions:
    Axe-FX listens on MIDI channel 1.
    Four presets exist on MIDI programs 1-4, selectable with top 4 buttons.
    Each preset has 4 scenes, selectable with bottom 4 buttons.

    Possible hardware layout diagram:

    (o)     = SPST rugged foot-switch
    (*)     = Single on/off LED
    [ ... ] = LED 7-segment (or more) display
    {\}     = slider switch

    PWR  MIDI OUT EXPR IN (opt)
    |      ||      ||
    /--------------------\
    |                    |
    | {\}    [8 8 8 8 8] |
    |                    |
    | (*)  (*)  (*)  (*) |
    | (o)  (o)  (o)  (o) |
    | P1   P2   P3   P4  |
    |                    |
    | (o)  (o)  (o)  (o) |
    | S1   S2   S3   S4  |
    |                    |
    \--------------------/

    Written by James S. Dunne
    Updated:  2014-12-29
    */

#include "../common/types.h"
#include "../common/hardware.h"

// Hard-coded MIDI channel #s:
#define axe_midi_channel    0

#define axe_cc_scene        34

u8 sw_curr, sw_last;

u8 axe_program;
u8 axe_scene;

// right-aligns an integer in base 10 at s[i] and pads spaces down to s[0]
// NOTE(jsd): Using modulus operator invokes a call to a CLIB.LIB function to perform. Yuck.
static void ralign_itoa10(u8 n, char *s) {
    //assert(s != 0);
    //assert(i >= 0);
    s8 i = 3;

    do {
        s[i] = (n % 10) + '0';
        if ((n /= 10) <= 0) break;
        --i;
    } while (i >= 0);

    // pad the left chars with spaces:
    for (--i; i >= 0; --i) s[i] = ' ';
}

// update 7-segment displays
static void update_7seg(void) {
    char s[LEDS_MAX_ALPHAS];

    ralign_itoa10(axe_program + 1, s);

    // 1digit is left-most 7-segment LED:
    leds_show_1digit(axe_scene + 1);
    // 4digits is right-most 4x 7-segment LEDs:
    leds_show_4alphas(s);
}

// determine if a footswitch was pressed
static u8 button_pressed(u8 mask) {
    return ((sw_curr & mask) == mask) && ((sw_last & mask) == 0);
}

// determine if still holding footswitch
static u8 button_held(u8 mask) {
    return (sw_curr & mask) == mask;
}

// determine if a footswitch was released
static u8 button_released(u8 mask) {
    return ((sw_last & mask) == mask) && ((sw_curr & mask) == 0);
}

// Set Axe-FX CC value:
static void axe_midi_cc_set(u8 cc, u8 val) {
    midi_send_cmd2(0xB, axe_midi_channel, cc, val);
}

// Change Axe-FX program:
static void axe_set_program(u8 program) {
    axe_program = program + 10;

    midi_send_cmd1(0xC, axe_midi_channel, axe_program);
    update_7seg();
}

static void axe_reset_scene(void) {
    axe_midi_cc_set(axe_cc_scene, axe_scene);

    if (axe_scene == 0) {
        fsw_led_enable(0);
        fsw_led_disable(1);
        fsw_led_disable(2);
        fsw_led_disable(3);
    }
    if (axe_scene == 1) {
        fsw_led_enable(1);
        fsw_led_disable(0);
        fsw_led_disable(2);
        fsw_led_disable(3);
    }
    if (axe_scene == 2) {
        fsw_led_enable(2);
        fsw_led_disable(0);
        fsw_led_disable(1);
        fsw_led_disable(3);
    }
    if (axe_scene == 3) {
        fsw_led_enable(3);
        fsw_led_disable(0);
        fsw_led_disable(1);
        fsw_led_disable(2);
    }
    update_7seg();
}

static void axe_set_scene(u8 scene) {
    axe_scene = scene;
    axe_reset_scene();
}

// ------------------------- Actual controller logic -------------------------

// set the controller to an initial state
void controller_init(void) {
    sw_last = 0xFF;

    axe_set_program(0);
    axe_set_scene(0);
}

// called every 10ms
void controller_10msec_timer(void) {
}

// main control loop
void controller_handle(void) {
    // poll foot-switch depression status:
    sw_curr = fsw_poll();

    // one of BOTTOM preset 1-4 pressed:
    if (button_pressed(FSM_PRESET_1)) {
        axe_set_scene(0);
    }
    if (button_pressed(FSM_PRESET_2)) {
        axe_set_scene(1);
    }
    if (button_pressed(FSM_PRESET_3)) {
        axe_set_scene(2);
    }
    if (button_pressed(FSM_PRESET_4)) {
        axe_set_scene(3);
    }

    // one of TOP control 1-4 pressed:
    if (button_pressed(FSM_CONTROL_1)) {
        axe_set_program(0);
        axe_reset_scene();
    }
    if (button_pressed(FSM_CONTROL_2)) {
        axe_set_program(1);
        axe_reset_scene();
    }
    if (button_pressed(FSM_CONTROL_3)) {
        axe_set_program(2);
        axe_reset_scene();
    }
    if (button_pressed(FSM_CONTROL_4)) {
        axe_set_program(3);
        axe_reset_scene();
    }

    sw_last = sw_curr;
}
