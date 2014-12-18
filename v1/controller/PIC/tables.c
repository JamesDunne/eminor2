//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 5/28/07					      						  #
//;#			Tables in the code								  			  #
//;#			File Name: tables.c   										  #
//;#																		  #
//;############################################################################


#include "c_system.h"
#include "usb.h"
#include "hardware.h"

#pragma romdata

#pragma romdata ROMSAVEDATA=WRITABLE_SEG_ADDR		//Update lkr file if this is to change!!
rom unsigned char ROM_SAVEDATA[WRITABLE_SEG_LEN] = {
#include "flash_rom_init.h"
};

#pragma code
