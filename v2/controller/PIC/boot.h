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
#define REMAPPED_APPLICATION_RESET_VECTOR       0x1000
#define REMAPPED_APPLICATION_HIGH_ISR_VECTOR    0x1008
#define REMAPPED_APPLICATION_LOW_ISR_VECTOR     0x1018
#define BOOTLOADER_ABSOLUTE_ENTRY_ADDRESS       0x001C  //Execute a "_asm goto 0x001C _endasm" instruction, if you want to enter the bootloader mode from the application via software

#define APP_SIGNATURE_ADDRESS            0x1006  //0x1806 and 0x1807 contains the "signature" WORD, indicating successful erase/program/verify operation
#define APP_SIGNATURE_VALUE              0x600D  //leet "GOOD", implying that the erase/program was a success and the bootloader intentionally programmed the APP_SIGNATURE_ADDRESS with this value
#define APP_VERSION_ADDRESS              0x1016  //0x1016 and 0x1017 should contain the application image firmware version number
#define APP_VERSION                     0x0100  //Put user application version number here.

#define BOOT_MAIN                       0xC0    //Entry into bootload mode after hardware specific code.
