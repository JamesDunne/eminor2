//#######################################################################
/**
* @file UserAppCode.c
* This is just a dummy file that only exists in the bootloader project.
* This file is a placeholder for the user app.
*
* @author Joe Dunne
* @date 12/9/13
* @brief User app placeholder
*/
//#######################################################################




/** I N C L U D E S **********************************************************/
//#include <p18cxxx.h>
#include "typedefs.h"
#include "boot.h"


//Initialize with a valid application signature already loaded to allow the code to run at startup rather than jumping to bootload mode.
#ifdef __MCC18
#pragma romdata app_signature=APP_SIGNATURE_ADDRESS
rom 
#endif
#ifdef __SDCC
__code __at (APP_SIGNATURE_ADDRESS)
#endif
const unsigned short app_sig = {APP_SIGNATURE_VALUE};

#ifdef __MCC18
#pragma romdata app_version=APP_VERSION_ADDRESS
rom 
#endif
#ifdef __SDCC
__code __at (APP_VERSION_ADDRESS)
#endif
const unsigned short app_ver = {APP_VERSION};
