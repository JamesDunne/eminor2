//*;###########################################################################
//;#            Author: Joe Dunne                                             #
//;#            Date 6/04/07                                                  #
//;#            Write ProgMem access                                          #
//;#            File Name: writeprogmem.c                                     #
//;#                                                                          #
//;############################################################################


#include "c_system.h"

void StartWrite(void)
{
    /*
     * A write command can be prematurely terminated by MCLR or WDT reset
     */
    EECON2 = 0x55;
    EECON2 = 0xAA;
    EECON1bits.WR = 1;      //processor stall for approx 2mS..
}

//uses TwoBytes ProgMemAddr;
//also uses ProgmemBuffer[64]
//NOTE: index should be either 0 or 32.  (0 for the first 32 bytes, 32 for the second)
void WriteProgMem(unsigned char index) //TESTED: Passed
{
#ifndef __SDCC
    unsigned char counter;

    /*
     * The write holding register for the 18F4550 family is
     * actually 32-byte. The code below only tries to write
     * 16-byte because the GUI program only sends out 16-byte
     * at a time.
     * This limitation will be fixed in the future version.
     */
    ProgMemAddr.b_form.low &= 0b11100000;  //Force 32-byte boundary
    EECON1 = 0b10000100;        //Setup writes: EEPGD=1,WREN=1

    //LEN = # of byte to write

    for (counter = index; counter < index+32; counter++) {
        *(rom char *)(ProgMemAddr.s_form+counter) = ProgmemBuffer[counter];
        if ((counter & 0b00011111) == 0b00011111) {
            StartWrite();
        }
    }
#endif
}

//uses TwoBytes ProgMemAddr;
void EraseProgMem(void) //TESTED: Passed
{
#ifndef __SDCC
    //The most significant 16 bits of the address pointer points to the block
    //being erased. Bits5:0 are ignored. (In hardware).

    //LEN = # of 64-byte block to erase
    EECON1 = 0b10010100;     //Setup writes: EEPGD=1,FREE=1,WREN=1

    *(rom far char *)ProgMemAddr.s_form;  //Load TBLPTR
    StartWrite();

    TBLPTRU = 0;            // forces upper byte back to 0x00
                            // optional fix is to set large code model
                            // (for USER ID 0x20 0x00 0x00)
#endif
}

#if 0
unsigned char ReadEE(unsigned char Addr) //TESTED: Passed
{
    EECON1 = 0x00;
    EEADR = Addr;
    //EEADRH = 0;
    EECON1bits.RD = 1;
    return (EEDATA);
}

unsigned char WriteEE(unsigned char Addr, unsigned char data) //TESTED: Passed
{
    if (EECON1bits.WR) return false;
    EEADR = Addr;
    //EEADRH = 0;
    EEDATA = data;
    EECON1 = 0b00000100;    //Setup writes: EEPGD=0,WREN=1
    StartWrite();
    
    return (true);
//  while(EECON1_WR);       //Wait till WR bit is clear
}

//WriteConfig is different from WriteProgMem b/c it can write a byte
void WriteConfig(void) //TESTED: Passed
{
    EECON1 = 0b11000100;        //Setup writes: EEPGD=1,CFGS=1,WREN=1
    for (counter = 0; counter < dataPacket.len; counter++)
    {
        *((dataPacket.ADR.pAdr)+counter) = \
        dataPacket.data[counter];
        StartWrite();
    }//end for
    
    TBLPTRU = 0x00;         // forces upper byte back to 0x00
                            // optional fix is to set large code model
}//end WriteConfig
#endif
