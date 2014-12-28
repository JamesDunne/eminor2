package main

import "C"
import "log"
import "unsafe"

//export fsw_poll
func fsw_poll() uint16 {
	return 0
}

//export led_set
func led_set(leds uint16) {
}

//export lcd_update_row
func lcd_update_row(row byte, text *C.char) {
	var i uintptr
	row_text := make([]byte, 20, 20)
	for i = 0; i < 20; i++ {
		row_text[i] = byte(*(*C.char)(unsafe.Pointer(uintptr(unsafe.Pointer(text)) + i)))
	}
	log.Printf("%2d: %s\n", row, row_text)
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
	log.Printf("%02X %02X\n", (cmd<<4)|channel, data1)
}

//export midi_send_cmd2
func midi_send_cmd2(cmd, channel, data1, data2 byte) {
	log.Printf("%02X %02X %02X\n", (cmd<<4)|channel, data1, data2)
}
