//*;###########################################################################
//;#			Author: Joe Dunne											  #
//;#			Date 4/06/07					      						  #
//;#			Main arbitrator									  			  #
//;#			File Name: main.c   										  #
//;#																		  #
//;############################################################################


#include "c_system.h"
#include "usb.h"
#include "hardware.h"

void	Process7Segs(void) {
//	static unsigned char ComPointer;

    // power switch LED?
    DispSegData[0].bit7 = true;

	AllDigitsOff();
	switch (ComPointer) {
		case 0:
			DISP_COM0_LAT_BIT = false;
			HandleDigit(ComPointer);
			break;
		case 1:
			DISP_COM1_LAT_BIT = false;
			HandleDigit(ComPointer);
			break;
		case 2:
			DISP_COM2_LAT_BIT = false;
			HandleDigit(ComPointer);
			break;
		case 3:
			DISP_COM3_LAT_BIT = false;
			HandleDigit(ComPointer);
			break;
		case 4:
			DISP_COM4_LAT_BIT = false;
			HandleDigit(ComPointer);
			break;
		default:
			//do nothing
			break;
	}
	if (++ComPointer >= DispNumOfCommons) ComPointer = 0;
}

void	AllDigitsOff(void) {
	DISP_SEG0_LAT_BIT = false;
	DISP_SEG1_LAT_BIT = false;
	DISP_SEG2_LAT_BIT = false;
	DISP_SEG3_LAT_BIT = false;
	DISP_SEG4_LAT_BIT = false;
	DISP_SEG5_LAT_BIT = false;
	DISP_SEG6_LAT_BIT = false;
	DISP_SEG7_LAT_BIT = false;

	DISP_COM0_LAT_BIT = true;
	DISP_COM1_LAT_BIT = true;
	DISP_COM2_LAT_BIT = true;
	DISP_COM3_LAT_BIT = true;
	DISP_COM4_LAT_BIT = true;
}

void	HandleDigit(unsigned char ComPointer) {
	BitField x;

	x.byte = DispSegData[ComPointer].byte;
	if (x.bit0) DISP_SEG0_LAT_BIT = true;
	if (x.bit1) DISP_SEG1_LAT_BIT = true;
	if (x.bit2) DISP_SEG2_LAT_BIT = true;
	if (x.bit3) DISP_SEG3_LAT_BIT = true;
	if (x.bit4) DISP_SEG4_LAT_BIT = true;
	if (x.bit5) DISP_SEG5_LAT_BIT = true;
	if (x.bit6) DISP_SEG6_LAT_BIT = true;
	if (x.bit7) DISP_SEG7_LAT_BIT = true;
}

void	SetDispAscii(unsigned char chars[]) {
	unsigned char x,i;

	DISABLE_ALL_INTERRUPTS();
	for (i = 0;i<5;i++) {
		x = chars[i];
		DispSegData[i].byte = AsciiTo7Seg(x);
	}
	ENABLE_ALL_INTERRUPTS();
}

/* show 4 alphas on the 4-digit display */
void leds_show_4alphas(char text[LEDS_MAX_ALPHAS]){
	unsigned char x,i;

	DISABLE_ALL_INTERRUPTS();
	for (i = 0;i<4;i++) {
		x = text[i];
		DispSegData[3-i].byte = AsciiTo7Seg(x);
	}
	ENABLE_ALL_INTERRUPTS();
}

/* show single digit on the single digit display */
void leds_show_1digit(u8 value){
	DISABLE_ALL_INTERRUPTS();
	DispSegData[4].byte = AsciiTo7Seg(value+'0');
	ENABLE_ALL_INTERRUPTS();
}

unsigned char AsciiTo7Seg(unsigned char chr) {
	
	if (chr >= 'A') {
		if (chr >= 'a') chr -= 'a';	//lower case
		else chr-='A';			//capital
		chr=LettersSegTable[chr];
	}
	else if (chr >= '0') {
		chr -= '0';	//numbers
		chr=NumbersSegTable[chr];
	}
	else if (chr == ' ') chr = 0;		//space characters
	else if (chr == '-') chr = (1<<6);		//space characters
	else chr = 0;				//all other characters are spaces
	return chr;
}

void	Scroll7SegDisp(void) {
	unsigned char chars[5], i;

	for (i=0;i<5;i++) chars[i] = ScrollingDisplayData[ScrollingDisplayIndex+i];
	SetDispAscii(chars);
	ScrollingDisplayIndex--;
	if (ScrollingDisplayIndex == 0) ScrollingDisplayIndex = ScrollingDisplayLength;
}

rom unsigned char NumbersSegTable[10] = {
	(1<<0)|(1<<5)|(1<<1)|(1<<4)|(1<<2)|(1<<3),			//0
	(1<<1)|(1<<2),										//1
	(1<<0)|(1<<1)|(1<<6)|(1<<4)|(1<<3),					//2
	(1<<0)|(1<<1)|(1<<6)|(1<<2)|(1<<3),					//3
	(1<<5)|(1<<1)|(1<<6)|(1<<2),						//4
	(1<<0)|(1<<5)|(1<<6)|(1<<2)|(1<<3),					//5
	(1<<0)|(1<<5)|(1<<6)|(1<<4)|(1<<2)|(1<<3),			//6
	(1<<0)|(1<<1)|(1<<2),								//7
	(1<<0)|(1<<1)|(1<<2)|(1<<3)|(1<<4)|(1<<5)|(1<<6),	//8
	(1<<0)|(1<<5)|(1<<1)|(1<<6)|(1<<2)					//9
};

rom unsigned char LettersSegTable[26] = {
	(1<<0)|(1<<1)|(1<<2)|(1<<4)|(1<<5)|(1<<6),	//A
	(1<<4)|(1<<6)|(1<<5)|(1<<2)|(1<<3),			//b
	(1<<6)|(1<<4)|(1<<3),						//c
	(1<<6)|(1<<4)|(1<<3)|(1<<2)|(1<<1),			//d
	(1<<0)|(1<<5)|(1<<6)|(1<<4)|(1<<3),			//E
	(1<<0)|(1<<5)|(1<<6)|(1<<4),				//F
	(1<<0)|(1<<5)|(1<<1)|(1<<6)|(1<<2)|(1<<3),	//g
	(1<<5)|(1<<6)|(1<<2)|(1<<4),				//h
	(1<<1)|(1<<2),								//I
	(1<<1)|(1<<2)|(1<<3)|(1<<4),				//J
	0,											//K
	(1<<5)|(1<<4)|(1<<3),						//L
	0,											//m
	(1<<4)|(1<<6)|(1<<2),						//n
	(1<<6)|(1<<4)|(1<<2)|(1<<3),				//o
	(1<<0)|(1<<5)|(1<<1)|(1<<6)|(1<<4),			//P
	(1<<0)|(1<<5)|(1<<1)|(1<<6)|(1<<2)|(1<<7),			//q
	(1<<4)|(1<<6),								//r
	(1<<3)|(1<<2)|(1<<6)|(1<<5)|(1<<0),			//S
	(1<<0)|(1<<1)|(1<<2),						//T
	(1<<4)|(1<<3)|(1<<2),						//u
	(1<<4)|(1<<3)|(1<<2),						//v
	0,											//w
	(1<<5)|(1<<6)|(1<<2)|(1<<4)|(1<<1),			//x
	(1<<5)|(1<<1)|(1<<6)|(1<<2)|(1<<3),			//y
	(1<<0)|(1<<1)|(1<<6)|(1<<4)|(1<<3)			//z
};
