package main

import "C"

//export fsw_poll
func fsw_poll() uint16 {
	return 0
}

//export led_set
func led_set(leds uint16) {
}

//export lcd_update_row
func lcd_update_row(row byte, text *C.char) {
}

//export flash_load
func flash_load(addr, count uint16, data *byte) {
}

//export flash_store
func flash_store(addr, count uint16, data *byte) {
}

// Send a single MIDI byte:
//extern void midi_send_byte(u8 data);

//export midi_send_cmd1
func midi_send_cmd1(cmd, channel, data1 byte) {
}

//export midi_send_cmd2
func midi_send_cmd2(cmd, channel, data1, data2 byte) {
}
