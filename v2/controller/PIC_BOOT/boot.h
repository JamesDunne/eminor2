//#######################################################################
/**
* @file boot.h
* This is a header file which is shared between the bootloader app and user startup
*
* @author Joe Dunne
* @date 12/9/13
* @brief Bootloader User Startup
*/
//#######################################################################



//Constants
#define REMAPPED_APPLICATION_RESET_VECTOR       0x1800
#define REMAPPED_APPLICATION_HIGH_ISR_VECTOR    0x1808
#define REMAPPED_APPLICATION_LOW_ISR_VECTOR     0x1818
#define BOOTLOADER_ABSOLUTE_ENTRY_ADDRESS       0x001C  //Execute a "_asm goto 0x001C _endasm" instruction, if you want to enter the bootloader mode from the application via software

