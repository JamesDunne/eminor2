;###########################################################################
;#			Author: Joe Dunne				  #
;#			Date 4/06/07					  #
;#			Main arbitrator					  #
;#			File Name: config.asm  				  #
;#									  #
;############################################################################

	ERRORLEVEL -208, -216

	LIST R=DEC

	INCLUDE "a_MICRDEF.INC"


;This section contains configuration bits for the processor
;Don't change this unless you know what you're doing.
;300000
;	CONFIG USBDIV=2, CPUDIV=OSC2_PLL3, PLLDIV=2
;300001
;	CONFIG FOSC=HSPLL_HS, FCMEM=OFF, IESO=OFF
;300002
;	CONFIG VREGEN=ON, PWRT=ON, BOR=ON, BORV=0		;0 = 4.5V..
;300003
;	CONFIG WDT=OFF, WDTPS=128
;300005
;	CONFIG CCP2MX=ON, PBADEN=OFF, LPT1OSC=OFF, MCLRE=ON
;300006
;	CONFIG STVREN=ON, LVP=OFF, ICPRT=OFF, XINST=OFF, DEBUG=ON
;300008
;	CONFIG CP0=OFF, CP1=OFF, CP2=OFF
;300009
;	CONFIG CPB=OFF, CPD=OFF
;30000A
;	CONFIG WRT0=OFF, WRT1=OFF, WRT2=OFF
;30000B
;	CONFIG WRTC=OFF, WRTB=OFF, WRTD=OFF
;30000C
;	CONFIG EBTR0=OFF, EBTR1=OFF, EBTR2=OFF
;30000D
;	CONFIG EBTRB=OFF

	global	CLEAR_RAM

	code

;clear general purpose registers 0x000 through 0x7FF.
CLEAR_RAM
	clrf	FSR0H
	clrf	FSR0L

RAMCLEAR1
	CLRWDT
	clrf	POSTINC0
	btfss	FSR0H, 3
	bra	RAMCLEAR1
	return

	END
