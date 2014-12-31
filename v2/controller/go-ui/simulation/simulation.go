package simulation

//#include "../../common/controller-simple.c"
import "C"

// Publicly exposed interface to UI

func Init() {
	hw_init()
	C.controller_init()
}

func Timer_10msec() {
	C.controller_10msec_timer()
}

func Handle() {
	C.controller_handle()
}

func UpdateFootswitch(fsw uint16) {
	_fsw = fsw
}

func GetLCDRow(row int) []byte {
	return lcd_rows[row][:]
}

func GetLEDs() uint16 {
	return _leds
}
