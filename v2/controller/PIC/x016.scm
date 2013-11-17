PROCESSOR: 18F4550
PATH: D:\work\midicontroller
PROJECT: MidiController
MPLAB IDE: 7.52
Compiler: C18 v3.10

;--------------------------------------------------------------------------------
x016	6/05/07 JD

Cleaned house a bit..


;--------------------------------------------------------------------------------
x015	6/05/07 JD

No changes yet..

On a speed test I was able to get a transfer rate of approximately 10667 bytes 
per second from device to host using control transfer on report ID 44.  

Note that this is just consecutive reads without changing address or anything.

It seems I may be mistaken about using the input and output interrupt transfers.

;--------------------------------------------------------------------------------
x014	6/04/07 JD

Fixed WriteProgMem.  It can now be done via USB.

;--------------------------------------------------------------------------------
x013	6/02/07 JD

Fixed up the ProcessGenericTransfers..

;--------------------------------------------------------------------------------
x012	6/01/07 JD

I screwed x11 up.  I have no idea whats going on anymore.

;--------------------------------------------------------------------------------
x011a	6/01/07 JD

Changed this to utilize report ID 44 for Input/output transfers via interrupt
transfer.  I am able to exchange input and output reports using usbhidio2.

;--------------------------------------------------------------------------------
x011	6/01/07 JD

This uses HID.
This firmware is set up to use input and output communications via interrupt
transfer.  The data is set up in 64 byte buffers.  Note that the fastest this
can transfer data is 64KBytes per sec.  This uses report ID 44 to transfer
the data.

I've added report ID functionality via report ID 44 for control transfers as
well now.  The speed is fairly quick.. I used hidsuite which is a bit slow
it itself and measured a data rate of 4652 bytes per second.

;--------------------------------------------------------------------------------
x007	4/14/07 JD

Cleaned up a bit more and implemented 2 functions:
READ_BLOCK_FROM_ROM
and
WRITE_BLOCK_INTO_ROM

Before calling either function, TBLPTR must be set to the address of the ROM
block to work on.  Also, FSR0 must be set to the address of the RAM buffer
to write to.  Note that both functions access 64 bytes of ROM.  It will take
approximately 8mS to write 64 bytes, so the processor will stall for that
amount of time before resuming normal operation.  It is recommended to only do 
one write every 10mS or so to prevent the USB connection from hanging.

;--------------------------------------------------------------------------------
x006	4/14/07 JD

Set up the timer to interrupt at a regular interval.. Not sure what its set to.
Cleaned everything up and put Jim's code in.

;--------------------------------------------------------------------------------
x005	4/14/07 JD

First version to actually send midi data out.

;--------------------------------------------------------------------------------
x004	4/14/07 JD

Set up the workspace.. USB functions I believe....

;--------------------------------------------------------------------------------
x001-3	4/14/07 JD

No idea what I did..

