
                                 Windows GUI test harness for
                           MIDI-based Program-changing Foot Controller

Software designed by
James S. Dunne
Hardware designed by
Joseph R. Dunne
04/15/2007

This package is a Win32 GUI software test harness for the logical controller software that will be used in the actual hardware unit.  Hardware inputs/outputs are abstracted from the controller code and made available in the GUI by more readily accessible means.

For instance, hardware foot-switches are represented by keyboard keys - and act very much in the same fashion.  MIDI output is both written to the Windows MIDI Mapper (if available) and raw data to the console.  Single LEDs are represented by green/red colored circles indicating on/off, respectively.
