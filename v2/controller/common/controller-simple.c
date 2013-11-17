/*

	A programmable MIDI foot controller.

	Written by James S. Dunne
	04/05/2007

	Possible hardware layout diagram:

	(o)     = SPST rugged foot-switch
	(*)     = Single on/off LED
	[ ... ] = LED 7-segment (or more) display
	{\}		= slider switch

 PWR  MIDI OUT EXPR IN (opt)
  |      ||      ||
/--------------------\
|                    |
| [8 8 8 8] {\}  [8] |
|                    |
| (*)  (*)  (*)  (*) |
| (o)  (o)  (o)  (o) |
|  1    2    3    4  |
|                    |
| (o)  (o)  (o)  (o) |
| DEC  INC  ENTR NEXT|
|                    |
\--------------------/

*/

#include "../common/types.h"
#include "../common/hardware.h"

// Set high bit #"Place" located in a register called "VAR"  // Place : 0 -> 7
#define setbit(VAR,Place) VAR |= 1 << Place

// Set low bit #"Place" located in a register called "VAR"  // Place : 0 -> 7
#define clrbit(VAR,Place) VAR &= (1 << Place)^255
#define chkbit(VAR,Place) (VAR & 1 << Place)
#define tglbit(VAR,Place) VAR ^= 1 << Place

#define	midi_channel	0

u32	sw_curr, sw_last;

/* convert integer to ASCII in fixed number of chars, right-aligned */
void itoa_fixed(u8 n, char s[LEDS_MAX_ALPHAS]) {
	u8 i = LEDS_MAX_ALPHAS - 1;

	do {
		s[i--] = (n%10) + '0';
	} while ((n /= 10) > 0);

	/* pad the left chars with spaces: */
	for (;i > 0;--i) s[i] = ' ';
	s[i] = ' ';
}

/* display a program value in decimal with a leading 'P': */
void show_program(u8 value) {
	char	a[LEDS_MAX_ALPHAS];
	a[0] = 'P';
	a[1] = 'r';
	a[2] = 'o';
	a[3] = 'g';
	leds_show_4alphas(a);
	leds_show_1digit(value + 1);
}

/* determine if a footswitch was pressed: */
u8 button_pressed(u32 mask) {
	return ((sw_curr & mask) == mask) && ((sw_last & mask) == 0);
}

/* determine if still holding footswitch: */
u8 button_held(u32 mask) {
	return (sw_curr & mask) == mask;
}

/* determine if a footswitch was released: */
u8 button_released(u32 mask) {
	return ((sw_last & mask) == mask) && ((sw_curr & mask) == 0);
}

u8	active_preset;

/* concert/practice main mode switch */
enum mainmode mode;

/* initial continuous controller toggle bits per preset: */
u8 preset_controltoggle_init[4];

/* continuous controller values: */
u8 control_press_values[4];

/* timers for preset button hold time */
u8 timer_control4, timer_control4_enable;

/* constant continuous controller numbers: */
u8 control_value_tap_tempo, control_value_tuner_mute;

/* current control on/off toggle bits */
u8 preset_controltoggle;

/* is tuner mute on or off? */
u8 flag_tuner_mute;
u8 control_tuner_toggle;
u32 control4_button_mask;

void set_toggle_leds(void) {
	if (chkbit(preset_controltoggle,0)) fsw_led_enable(0); else fsw_led_disable(0);
	if (chkbit(preset_controltoggle,1)) fsw_led_enable(1); else fsw_led_disable(1);
	if (chkbit(preset_controltoggle,2)) fsw_led_enable(2); else fsw_led_disable(2);
	if (chkbit(preset_controltoggle,3)) fsw_led_enable(3); else fsw_led_disable(3);
}

void activate_preset(u8 idx) {
	if (idx > 3) return;

	/* Send the MIDI PROGRAM CHANGE message: */
	midi_send_cmd1(0xC, midi_channel, idx);
	/* Display the program value on the 4-digit display */
	show_program(idx);

	/* Revert the continuous controller toggle state to initial for this preset: */
	preset_controltoggle = preset_controltoggle_init[idx];
	set_toggle_leds();

	/* Record the current preset number: */
	active_preset = idx;
}

void control_toggleidx(u8 idx) {
	u8 togglevalue = 0x00;

	/* Toggle on/off the selected continuous controller: */
	tglbit(preset_controltoggle, idx);
	set_toggle_leds();

	/* Determine the MIDI value to use depending on the newly toggled state: */
	if (chkbit(preset_controltoggle,idx)) togglevalue = 0x7F;
	midi_send_cmd2(0xB, midi_channel, control_press_values[idx], togglevalue);
}

void control_on(u8 cc) {
	midi_send_cmd2(0xB, midi_channel, cc, 0x7F);
}

void control_tgl(u8 cc, u8* old) {
	if (*old != 0) *old = 0; else *old = 0x7F;
	midi_send_cmd2(0xB, midi_channel, cc, *old);
}

void control_off(u8 cc) {
	midi_send_cmd2(0xB, midi_channel, cc, 0x00);
}

void enable_tuner_mute(void) {
	char	a[LEDS_MAX_ALPHAS];
	a[0] = 't';
	a[1] = 'u';
	a[2] = 'n';
	a[3] = 'E';

	leds_show_4alphas(a);
	control_on(control_value_tuner_mute);
	flag_tuner_mute = 1;
}

void reset_tuner_mute(u32 mask) {
	control4_button_mask = mask;
	timer_control4 = 75;
	timer_control4_enable = 1;

	if (flag_tuner_mute == 0) return;

	flag_tuner_mute = 0;
	control_off(control_value_tuner_mute);
	show_program(active_preset);
}

/* ------------------------- Actual controller logic ------------------------- */

/* set the controller to an initial state */
void controller_init(void) {
	/* controller numbers for Bn commands that will be toggled on|off with 0|127 data */
	/*
		84 - compressor
		85 - filter
		86 - pitch
		87 - chorus
		88 - delay
		89 - reverb
		90 - noise gate
		91 - EQ
	*/
	control_press_values[0] = 88;	// 1 - delay
	control_press_values[1] = 87;	// 2 - chorus
	control_press_values[2] = 85;	// 4 - filter
	control_press_values[3] = 86;	// 8 - pitch

	control_value_tap_tempo = 80;	// tap tempo
	control_value_tuner_mute = 81;	// tuner mute on/off

	/* default bitfield states for preset programs: */
	preset_controltoggle_init[0] = 0;			// clean sparkle w/ compressor, reverb
	preset_controltoggle_init[1] = 0;			// single-coil rock w/ compressor, reverb, NG
	preset_controltoggle_init[2] = 0;			// modern rhythm crunch dry, NG
	preset_controltoggle_init[3] = 1;			// lead w/ delay, reverb, NG

	timer_control4 = 0;
	timer_control4_enable = 0;
	control_tuner_toggle = 0;
	flag_tuner_mute = 0;
	control4_button_mask = FSM_PRESET_1;

	activate_preset(0);
}

/* called every 10ms */
void controller_10msec_timer(void) {
	/* decrement the control4 timer if it's active */
	if (timer_control4 > 0) --timer_control4;
}

/* main control loop */
void controller_handle(void) {
	/* poll foot-switch depression status: */
	sw_curr = fsw_poll();

	/* determine mode */
	if (slider_poll() == 0) {
		if (mode != MODE_PRACTICE) {
			/* switched to PRACTICE mode */
			mode = MODE_PRACTICE;
		}
	} else {
		if (mode != MODE_CONCERT) {
			/* switched to CONCERT mode */
			mode = MODE_CONCERT;
		}
	}

	if (mode == MODE_PRACTICE) goto practicemode;
	if (mode == MODE_CONCERT) goto concertmode;

cleanup:
	sw_last = sw_curr;
	return;

practicemode:
	goto concertmode;
	goto cleanup;

concertmode:
	/* one of preset 1-4 pressed: */
	if (button_pressed(FSM_PRESET_1)) {
		if (active_preset != 0) {
			activate_preset(0);
		} else {
			// tap tempo function if preset is already active:
			control_tgl(control_value_tap_tempo, &control_tuner_toggle);
		}
		reset_tuner_mute(FSM_PRESET_1);
	}
	if (button_pressed(FSM_PRESET_2)) {
		if (active_preset != 1) {
			activate_preset(1);
		} else {
			// tap tempo function if preset is already active:
			control_tgl(control_value_tap_tempo, &control_tuner_toggle);
		}
		reset_tuner_mute(FSM_PRESET_2);
	}
	if (button_pressed(FSM_PRESET_3)) {
		if (active_preset != 2) {
			activate_preset(2);
		} else {
			// tap tempo function if preset is already active:
			control_tgl(control_value_tap_tempo, &control_tuner_toggle);
		}
		reset_tuner_mute(FSM_PRESET_3);
	}
	if (button_pressed(FSM_PRESET_4)) {
		if (active_preset != 3) {
			activate_preset(3);
		} else {
			// tap tempo function if preset is already active:
			control_tgl(control_value_tap_tempo, &control_tuner_toggle);
		}
		reset_tuner_mute(FSM_PRESET_4);
	}

	/* check if the last tuner-mute button was held long enough */
	if ((timer_control4_enable != 0) && button_held(control4_button_mask) && (timer_control4 == 0)) {
		enable_tuner_mute();
		timer_control4 = 0;
		timer_control4_enable = 0;
	}
	/* break the tuner mute timer if the button was released early */
	if ((timer_control4_enable != 0) && !button_held(control4_button_mask)) {
		timer_control4 = 0;
		timer_control4_enable = 0;
	}

	/* one of control 1-4 pressed: */
	if (button_pressed(FSM_CONTROL_1)) {
		control_toggleidx(0);
	}
	if (button_pressed(FSM_CONTROL_2)) {
		control_toggleidx(1);
	}
	if (button_pressed(FSM_CONTROL_3)) {
		control_toggleidx(2);
	}
	if (button_pressed(FSM_CONTROL_4)) {
		control_toggleidx(3);
	}

	goto cleanup;
}
