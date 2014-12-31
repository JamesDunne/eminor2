package simulation

import "C"
import "fmt"
import "unsafe"

var lcd [][]byte
var lcd_rows [4][20]byte

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

//export lcd_row_updated
func lcd_row_updated(row byte) {
	fmt.Printf("LCD:\n[%s]\n[%s]\n[%s]\n[%s]\n\n", lcd_rows[0], lcd_rows[1], lcd_rows[2], lcd_rows[3])
}

//export lcd_row_get
func lcd_row_get(row byte) *C.char {
	return (*C.char)(unsafe.Pointer(&lcd_rows[row][0]))
}

//export flash_load
func flash_load(addr, count uint16, data *byte) {
	fmt.Printf("flash load @ %04x\n", addr)
	var i int
	for i = 0; i < int(count); i++ {
		var c = (C.char)(flash_memory[int(addr)+i])
		*(*C.char)(unsafe.Pointer(uintptr(unsafe.Pointer(data)) + uintptr(i))) = c
	}
}

//export flash_store
func flash_store(addr, count uint16, data *byte) {
	fmt.Println("flash store @ %04x\n", addr)
}

// Send a single MIDI byte:
//extern void midi_send_byte(u8 data);

//export midi_send_cmd1
func midi_send_cmd1(cmd, channel, data1 byte) {
	fmt.Printf("%02X %02X\n", (cmd<<4)|channel, data1)
}

//export midi_send_cmd2
func midi_send_cmd2(cmd, channel, data1, data2 byte) {
	fmt.Printf("%02X %02X %02X\n", (cmd<<4)|channel, data1, data2)
}
