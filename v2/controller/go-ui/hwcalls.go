package main

import "C"
import "log"
import "unsafe"

var lcd [][]byte

func hw_init() {
	lcd = make([][]byte, 4, 4)
	for i := 0; i < 4; i++ {
		lcd[i] = make([]byte, 0, 20)
	}
}

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
	lcd[row] = lcd[row][0:0]
	for i = 0; i < 20; i++ {
		var c = byte(*(*C.char)(unsafe.Pointer(uintptr(unsafe.Pointer(text)) + i)))
		lcd[row] = append(lcd[row], c)
		if c == 0 {
			lcd[row] = lcd[row][0:i]
			break
		}
	}

	//log.Printf("\n%s\n%s\n%s\n%s\n", lcd[0], lcd[1], lcd[2], lcd[3])
}

//export flash_load
func flash_load(addr, count uint16, data *byte) {
	log.Printf("flash load @ %04x", addr)
	var i int
	for i = 0; i < int(count); i++ {
		var c = (C.char)(flash_memory[int(addr)+i])
		*(*C.char)(unsafe.Pointer(uintptr(unsafe.Pointer(data)) + uintptr(i))) = c
	}
}

//export flash_store
func flash_store(addr, count uint16, data *byte) {
	log.Println("flash store @ %04x", addr)
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
