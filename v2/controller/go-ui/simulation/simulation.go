package simulation

//#include "../../common/controller-simple.c"
import "C"

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
