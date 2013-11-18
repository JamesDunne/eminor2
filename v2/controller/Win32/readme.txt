
                                 Windows GUI test harness for
                           MIDI-based Program-changing Foot Controller

Software designed by
James S. Dunne
Hardware designed by
Joseph R. Dunne
2013-11-17

This package is a Win32 GUI software test harness for the logical controller software that will be used in the actual hardware unit.  Hardware inputs/outputs are abstracted from the controller code and made available in the GUI by more readily accessible means.

For instance, hardware foot-switches are represented by keyboard keys - and act very much in the same fashion.  MIDI output is both written to the first available MIDI device (if available) and raw data to the console.  Single LEDs are represented by bright/dark green colored circles indicating on/off, respectively.

The current iteration of the controller logic is set up to talk to two MIDI devices on two separate MIDI channels:

	t.c. electronic (or equivalent) guitar effects rack unit listens on channel 1
	RJM Mini Amp Gizmo (or MIDI-enabled guitar amplifier) listens on channel 2

Requirements:
	Visual Studio 2013 runtime redistributable (MSVCR120.dll) from http://www.microsoft.com/en-us/download/details.aspx?id=40784
