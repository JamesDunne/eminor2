;###########################################################################
;#			Author: Joe Dunne											  #
;#			Date 4/06/07					      						  #
;#			This file handles writing to the FLASH  (ROM).				  #
;#			File Name: writeprogmem.asm   										  #
;#														 				  #
;############################################################################

	INCLUDE "p18F4455.inc"
	LIST R=DEC

	extern	WpmCounter, WpmCounter1
	global	READ_BLOCK_FROM_ROM, WRITE_BLOCK_INTO_ROM

	code

;void	Read64BytesFromRom(

;;READ_BLOCK_FROM_ROM
;Before calling, set FSR0 = address of RAM buffer
;Also, set TLPTR = address of ROM to read into RAM.
READ_BLOCK_FROM_ROM
	movlb	high(WpmCounter)	;set appropriate bank.

	MOVLW	64			; number of bytes in erase block
	MOVWF	WpmCounter
;	MOVLW BUFFER_ADDR_HIGH 		; point to buffer
;	MOVWF FSR0H
;	MOVLW BUFFER_ADDR_LOW
;	MOVWF FSR0L
;	MOVLW CODE_ADDR_UPPER		; Load TBLPTR with the base
;	MOVWF TBLPTRU			; address of the memory block
;	MOVLW CODE_ADDR_HIGH
;	MOVWF TBLPTRH
;	MOVLW CODE_ADDR_LOW
;	MOVWF TBLPTRL
READ_BLOCK
	TBLRD*+				; read into TABLAT, and inc
	MOVF	TABLAT, W		; get data
	MOVWF	POSTINC0		; store data
	DECFSZ	WpmCounter			; done?
	BRA	READ_BLOCK		; repeat
	return


;;WRITE_BLOCK_INTO_ROM
;Before calling, set FSR0 = address of RAM buffer
;Also, set TBLPTR = address of ROM to write to  (must be on 64 byte boundary).
WRITE_BLOCK_INTO_ROM
	movlb	high(WpmCounter)	;set appropriate bank.

;	MOVLW CODE_ADDR_UPPER 	
;	MOVWF TBLPTRU
;	MOVLW CODE_ADDR_HIGH
;	MOVWF TBLPTRH
;	MOVLW CODE_ADDR_LOW
;	MOVWF TBLPTRL
	BSF	EECON1, EEPGD		; point to Flash program memory
	BCF	EECON1, CFGS		; access Flash program memory
	BSF	EECON1, WREN		; enable write to memory
	BSF	EECON1, FREE		; enable Row Erase operation
	BCF	INTCON, GIE 		; disable interrupts

;perform erase opration:
	MOVLW	55h
	MOVWF	EECON2			; write 55h
	MOVLW	0AAh
	MOVWF	EECON2			; write 0AAh
	BSF	EECON1, WR		; start erase (CPU stall)

	BSF	INTCON, GIE 		; re-enable interrupts
	TBLRD*- 			; dummy read decrement
;	MOVLW	BUFFER_ADDR_HIGH	; point to buffer
;	MOVWF	FSR0H
;	MOVLW	BUFFER_ADDR_LOW
;	MOVWF	FSR0L
	MOVLW	2
	MOVWF	WpmCounter1
WRITE_BUFFER_BACK
	MOVLW	32	 		; number of bytes in holding register
	MOVWF	WpmCounter
WRITE_BYTE_TO_HREGS
	MOVF	POSTINC0, W 		; get low byte of buffer data
	MOVWF	TABLAT 			; present data to table latch
	TBLWT+* 			; write data, perform a short write
					; to internal TBLWT holding register.
	DECFSZ	WpmCounter 		; loop until buffers are full
	BRA	WRITE_BYTE_TO_HREGS

PROGRAM_MEMORY
	BSF	EECON1, EEPGD		; point to Flash program memory
	BCF	EECON1, CFGS		; access Flash program memory
	BSF	EECON1, WREN		; enable write to memory
	BCF	INTCON, GIE		; disable interrupts

;Write to program memmory:
	MOVLW	55h
	MOVWF	EECON2			; write 55h
	MOVLW	0AAh
	MOVWF	EECON2			; write 0AAh
	BSF	EECON1, WR		; start program (CPU stall)

	DECFSZ	WpmCounter1
	BRA	WRITE_BUFFER_BACK
	BSF	INTCON, GIE		; re-enable interrupts
	BCF	EECON1, WREN		; disable write to memory
	return

	END
