/*********************************************************************
 *
 *                Microchip USB C18 Firmware Version 1.0
 *
 *********************************************************************
 * FileName:        usbdsc.c
 * Dependencies:    See INCLUDES section below
 * Processor:       PIC18
 * Compiler:        C18 2.30.01+
 * Company:         Microchip Technology, Inc.
 *
 * Software License Agreement
 *
 * The software supplied herewith by Microchip Technology Incorporated
 * (the “Company”) for its PICmicro® Microcontroller is intended and
 * supplied to you, the Company’s customer, for use solely and
 * exclusively on Microchip PICmicro Microcontroller products. The
 * software is owned by the Company and/or its supplier, and is
 * protected under applicable copyright laws. All rights are reserved.
 * Any use in violation of the foregoing restrictions may subject the
 * user to criminal sanctions under applicable laws, as well as to
 * civil liability for the breach of the terms and conditions of this
 * license.
 *
 * THIS SOFTWARE IS PROVIDED IN AN “AS IS” CONDITION. NO WARRANTIES,
 * WHETHER EXPRESS, IMPLIED OR STATUTORY, INCLUDING, BUT NOT LIMITED
 * TO, IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE APPLY TO THIS SOFTWARE. THE COMPANY SHALL NOT,
 * IN ANY CIRCUMSTANCES, BE LIABLE FOR SPECIAL, INCIDENTAL OR
 * CONSEQUENTIAL DAMAGES, FOR ANY REASON WHATSOEVER.
 *
 ********************************************************************/

/*********************************************************************
 * -usbdsc.c-
 * This file contains the USB descriptor information. It is used
 * in conjunction with the usbdsc.h file. When a descriptor is added
 * or removed from the main configuration descriptor, i.e. CFG01,
 * the user must also change the descriptor structure defined in
 * the usbdsc.h file. The structure is used to calculate the 
 * descriptor size, i.e. sizeof(CFG01).
 * 
 * A typical configuration descriptor consists of:
 * At least one configuration descriptor (USB_CFG_DSC)
 * One or more interface descriptors (USB_INTF_DSC)
 * One or more endpoint descriptors (USB_EP_DSC)
 *
 * Naming Convention:
 * To resolve ambiguity, the naming convention are as followed:
 * - USB_CFG_DSC type should be named cdxx, where xx is the
 *   configuration number. This number should match the actual
 *   index value of this configuration.
 * - USB_INTF_DSC type should be named i<yy>a<zz>, where yy is the
 *   interface number and zz is the alternate interface number.
 * - USB_EP_DSC type should be named ep<##><d>_i<yy>a<zz>, where
 *   ## is the endpoint number and d is the direction of transfer.
 *   The interface name should also be listed as a suffix to identify
 *   which interface does the endpoint belong to.
 *
 * Example:
 * If a device has one configuration, two interfaces; interface 0
 * has two endpoints (in and out), and interface 1 has one endpoint(in).
 * Then the CFG01 structure in the usbdsc.h should be:
 *
 * #define CFG01 rom struct                            \
 * {   USB_CFG_DSC             cd01;                   \
 *     USB_INTF_DSC            i00a00;                 \
 *     USB_EP_DSC              ep01o_i00a00;           \
 *     USB_EP_DSC              ep01i_i00a00;           \
 *     USB_INTF_DSC            i01a00;                 \
 *     USB_EP_DSC              ep02i_i01a00;           \
 * } cfg01
 * 
 * Note the hierarchy of the descriptors above, it follows the USB
 * specification requirement. All endpoints belonging to an interface
 * should be listed immediately after that interface.
 *
 * -------------------------------------------------------------------
 * Filling in the descriptor values in the usbdsc.c file:
 * -------------------------------------------------------------------
 * Most items should be self-explanatory, however, a few will be
 * explained for clarification.
 *
 * [Configuration Descriptor(USB_CFG_DSC)]
 * The configuration attribute must always have the _DEFAULT
 * definition at the minimum. Additional options can be ORed
 * to the _DEFAULT attribute. Available options are _SELF and _RWU.
 * These definitions are defined in the usbdefs_std_dsc.h file. The
 * _SELF tells the USB host that this device is self-powered. The
 * _RWU tells the USB host that this device supports Remote Wakeup.
 *
 * [Endpoint Descriptor(USB_EP_DSC)]
 * Assume the following example:
 * sizeof(USB_EP_DSC),DSC_EP,_EP01_OUT,_BULK,64,0x00
 *
 * The first two parameters are self-explanatory. They specify the
 * length of this endpoint descriptor (7) and the descriptor type.
 * The next parameter identifies the endpoint, the definitions are
 * defined in usbdefs_std_dsc.h and has the following naming
 * convention:
 * _EP<##>_<dir>
 * where ## is the endpoint number and dir is the direction of
 * transfer. The dir has the value of either 'OUT' or 'IN'.
 * The next parameter identifies the type of the endpoint. Available
 * options are _BULK, _INT, _ISO, and _CTRL. The _CTRL is not
 * typically used because the default control transfer endpoint is
 * not defined in the USB descriptors. When _ISO option is used,
 * addition options can be ORed to _ISO. Example:
 * _ISO|_AD|_FE
 * This describes the endpoint as an isochronous pipe with adaptive
 * and feedback attributes. See usbdefs_std_dsc.h and the USB
 * specification for details. The next parameter defines the size of
 * the endpoint. The last parameter in the polling interval.
 *
 * -------------------------------------------------------------------
 * Adding a USB String
 * -------------------------------------------------------------------
 * A string descriptor array should have the following format:
 *
 * rom struct{byte bLength;byte bDscType;word string[size];}sdxxx={
 * sizeof(sdxxx),DSC_STR,<text>};
 *
 * The above structure provides a means for the C compiler to
 * calculate the length of string descriptor sdxxx, where xxx is the
 * index number. The first two bytes of the descriptor are descriptor
 * length and type. The rest <text> are string texts which must be
 * in the unicode format. The unicode format is achieved by declaring
 * each character as a word type. The whole text string is declared
 * as a word array with the number of characters equals to <size>.
 * <size> has to be manually counted and entered into the array
 * declaration. Let's study this through an example:
 * if the string is "USB" , then the string descriptor should be:
 * (Using index 02)
 * rom struct{byte bLength;byte bDscType;word string[3];}sd002={
 * sizeof(sd002),DSC_STR,'U','S','B'};
 *
 * A USB project may have multiple strings and the firmware supports
 * the management of multiple strings through a look-up table.
 * The look-up table is defined as:
 * rom const unsigned char *rom USB_SD_Ptr[]={&sd000,&sd001,&sd002};
 *
 * The above declaration has 3 strings, sd000, sd001, and sd002.
 * Strings can be removed or added. sd000 is a specialized string
 * descriptor. It defines the language code, usually this is
 * US English (0x0409). The index of the string must match the index
 * position of the USB_SD_Ptr array, &sd000 must be in position
 * USB_SD_Ptr[0], &sd001 must be in position USB_SD_Ptr[1] and so on.
 * The look-up table USB_SD_Ptr is used by the get string handler
 * function in usb9.c.
 *
 * -------------------------------------------------------------------
 *
 * The look-up table scheme also applies to the configuration
 * descriptor. A USB device may have multiple configuration
 * descriptors, i.e. CFG01, CFG02, etc. To add a configuration
 * descriptor, user must implement a structure similar to CFG01.
 * The next step is to add the configuration descriptor name, i.e.
 * cfg01, cfg02,.., to the look-up table USB_CD_Ptr. USB_CD_Ptr[0]
 * is a dummy place holder since configuration 0 is the un-configured
 * state according to the definition in the USB specification.
 *
 ********************************************************************/
 
/*********************************************************************
 * Descriptor specific type definitions are defined in:
 * system\usb\usbdefs\usbdefs_std_dsc.h
 *
 * Configuration information is defined in:
 * autofiles\usbcfg.h
 ********************************************************************/
 
#define POLLING_INTERVAL	40

/** I N C L U D E S *************************************************/
#include "typedefs.h"
#include "usb.h"

/** C O N S T A N T S ************************************************/
#pragma romdata

/* Device Descriptor */
rom USB_DEV_DSC device_dsc=
{    
    0x12,     	// bLength
    0x01,     	// bDescriptorType
    0x0110,    	// bcdUSB (spec release #)     
    0x00,     	// bDeviceClass
    0x00,     	// bDeviceSubClass
    0x00,     	// bDeviceProtocol
    EP0_BUFF_SIZE,     	// bMaxPacketSize0
    0x09AE,     // idVendor
    0x4430,		// idProduct
    0x0010,    	// bcdDevice : Project version = 0.10
    INDEX_MANUFACTURER,	// Index of string Descriptor describing manufacturer     
    INDEX_NAME,			// Index of string Descriptor describing product
    INDEX_SERIALNUM,	// Index of string Descriptor describing the device's serial number
    0x01				// bNumConfigurations : renaud 1 configuration
};

/* Configuration 1 Descriptor */
CFG01={
	0x09,		// bLength: Configuration Descriptor size
	0x02,		// bDescriptorType: Configuration
	P1_CONFDESC_LEN,	//(word) Length of configuration descriptor. **Renaud : To update
	0x01,		// bNumInterfaces: 1 interface.
	0x01,		// bConfigurationValue: Configuration value = 1
	0,			// iConfiguration: Index of string descriptor describing the configuration (None)
//	0x80,		// bmAttributes: Bus powered and NO Remote wakeup
	0xA0,		// bmAttributes: Bus powered and Remote wakeup ** Renaud : changed from 0xE0
//	0xC0,		// bmAttributes: Self powered and NO Remote wakeup
//	0xE0,		// bmAttributes: Self powered and Remote wakeup
	0x32,		// MaxPower 50 mA : ** Renaud : MaxPowerself-powered draws 0 mA from the bus. 
//	0x00,		// 0 mA power consumption.

// Interface descriptor (Interface 0 = DemoKit)
	0x09,		// bLength: Interface Descriptor size
	0x04,		// bDescriptorType: Interface descriptor type  ** Renaud : to check
	0x00,		// bInterfaceNumber: Interface Number = 0
	0x00,		// bAlternateSetting: No Alternate setting
	0x01,		// bNumEndpoints: 
	0x03,		// bInterfaceClass: HID
	0x00,		// bInterfaceSubClass:
	0x00,		// bInterfaceProtocol: ** Renaud : changed from 2 (protocol - mouse in tripplite descriptor) to 0 : no protocol 
	0x00,		// iInterface: Index of string descriptor (No string value)

// HID descriptor (Demokit)
	0x09,		// bLength: HID Descriptor size
	0x21,		// bDescriptorType: HID
	0x0110,		// (word) bcdHID: HID Class Spec release number (1.10) ** Renaud : I let rev 1.10, but Tripplite has HID class release number (1.00)
	0x00,		// bCountryCode: Hardware target country US ** Renaud changed from 0x21 (US) to 0x00 (none specified)
	0x01,		// bNumDescriptors: Number of HID class descriptors to follow 
	0x22,		// bDescriptorType: Report
	HID_RPT_UPS_SIZE,	// (word) Length of report descriptor interface 0 (2 bytes) ** Renaud : To update

// Endpoint 1 descriptor (Demokit)
	0x07,		// bLength: Endpoint Descriptor size
	0x05,		// bDescriptorType: Endpoint descriptor type   ** Renaud : To check
	0x81,		// bEndpointAddress: Endpoint  1 IN
	0x03,		// bmAttributes: Interrupt endpoint
	0x0008,		// wMaxPacketSize(LSB): 
	POLLING_INTERVAL       // bInterval: Polling Interval (40 ms = 0x28)

//    sizeof(USB_EP_DSC),DSC_EP,_EP01_IN,_INT,HID_INT_IN_EP_SIZE,POLLING_INTERVAL
};

//    sizeof(USB_EP_DSC),DSC_EP,_EP01_OUT,_INT,HID_INT_OUT_EP_SIZE,POLLING_INTERVAL,


//2/8/05 JD language selection I think..
rom struct{byte bLength;byte bDscType;word string[1];}sd000={
sizeof(sd000),DSC_STR,0x0409};

//Manufacturer string
rom struct{byte bLength;byte bDscType;word string[11];}MfrString={
sizeof(MfrString),DSC_STR,
'J','o','e'};

//Product String
rom struct{byte bLength;byte bDscType;word string[21];}PrdString={
sizeof(PrdString),DSC_STR,
'M','I','D','I',' ','D','e','v','i','c','e',' '};

//Serial Number
rom struct{byte bLength;byte bDscType;word string[16];}SerialNum={
sizeof(SerialNum),DSC_STR,
'6','9','1','2','0','6','0','B',' '};


//the reason for this structure is so that sizeof() returns a value.
rom struct{byte report[HID_RPT_UPS_SIZE];}hid_rpt_UPS={
//Production test information
    0x06, 0xff, 0xff,              //     USAGE_PAGE (Vendor Defined Page 0xffff)
	0x09,  0x01,               		// USAGE (Vendor Usage 1)
	0xa1,  0x01,              	  // COLLECTION (Application)
    0x75, 0x08,                    //       REPORT_SIZE (8)
    0x95, 0x01,                    //       REPORT_COUNT (1)
    0x26, 0xff, 0x00,              //       LOGICAL_MAXIMUM (255)
    0x15, 0x00,                    //       LOGICAL_MINIMUM (0)

//NVR Operations
    0x85, 0x96,                    //       REPORT_ID (150)
    0x09, 0xC0,                    //       USAGE (***NVR Read/Write Data)
    0xb1, 0x02,                    //       FEATURE (Data,Var,Abs)

    0x75, 0x20,                    //       REPORT_SIZE (32)
    0x85, 0xB4,                    //       REPORT_ID (180)
    0x09, 0xD2,                    //       USAGE (***NVR Page Read/Write Data)
    0xb1, 0x02,                    //       FEATURE (Data,Var,Abs)

    0x75, 0x10,                    //       REPORT_SIZE (16)
    0x85, 0x97,                    //       REPORT_ID (151)
    0x09, 0xC1,                    //       USAGE (***NVR Address 16bit)
    0xb1, 0x02,                    //       FEATURE (Data,Var,Abs)
    0x75, 0x08,                    //       REPORT_SIZE (8)

//RAM Operations
    0x85, 0x98,                    //       REPORT_ID (152)
    0x09, 0xC2,                    //       USAGE (***RAM Read/Write Data)
    0xb1, 0x02,                    //       FEATURE (Data,Var,Abs)

    0x75, 0x10,                    //       REPORT_SIZE (16)
    0x85, 0x99,                    //       REPORT_ID (153)
    0x09, 0xC3,                    //       USAGE (***RAM Address 16bit)
    0xb1, 0x02,                    //       FEATURE (Data,Var,Abs)

//ROM Operations
    0x85, 0x9C,                    //       REPORT_ID (156)
    0x09, 0xD4,                    //       USAGE (***ROM Read/Write Data)
    0xb1, 0x02,                    //       FEATURE (Data,Var,Abs)

    0x75, 0x10,                    //       REPORT_SIZE (16)
    0x85, 0x9D,                    //       REPORT_ID (157)
    0x09, 0xD5,                    //       USAGE (***ROM Address 16bit)
    0xb1, 0x02,                    //       FEATURE (Data,Var,Abs)

//Production test protocol #
    0x85, 0x9B,                    //       REPORT_ID (155)
    0x09, 0xC5,                    //       USAGE (***Production Test Protocol #)
    0xb1, 0x02,                    //       FEATURE (Data,Var,Abs)

    0x75, 0x20,                    //       REPORT_SIZE (32)

    0x85, 0xAF,                    //       REPORT_ID (175)
    0x09, 0xE9,                    //       USAGE (***Voltage Data)
    0xb1, 0x02,                    //       FEATURE (Data,Var,Abs)

    0x85, 0xAF,                    //       REPORT_ID (175)
    0x09, 0xE9,                    //       USAGE (***Voltage Data)
	0x81, 0xa2,					   //	 	INPUT (Data,Var,Abs, Vol, NPrf)   

    0x76, 0x00, 0x02,              //       REPORT_SIZE (512)

    0x85, 0xB0,                    //       REPORT_ID (176)
    0x09, 0xEA,                    //       USAGE (***Voltage Data Bulk)
    0xb1, 0x02,                    //       FEATURE (Data,Var,Abs)

//Firmware Partnumber
	0x75, 0x20,						//	   REPORT_SIZE (32)
	0x85, 0xC2,						//	   REPORT_ID (194)
	0x09, 0xD6,						//	   USAGE (***Firmware Partnumber 32bit)
	0xb1, 0x02,						//	   FEATURE (Data,Var,Abs)

//Production test password = 866E1942
    0x85, 0x9A,                    //       REPORT_ID (154)
    0x09, 0xC4,                    //       USAGE (***Production test Password - 32bit)
    0xb1, 0x02,                    //       FEATURE (Data,Var,Abs)
    
    
//The input report		
    0x75, 0x08,                    //       REPORT_SIZE (8)
    0x95, 63,                    //       REPORT_COUNT (63)

	0x85, 44,					// REPORT_ID 44
	0x09, 0x04,					// usage - vendor defined
//	0x81, 0x02,					// Input (Data, Variable, Absolute)
	0x09, 0x04,					// usage - vendor defined
    0xb1, 0x02,                 //       FEATURE (Data,Var,Abs)
		
//The output report		
//	0x09, 0x06,					// usage - vendor defined
//	0x91, 0x02,					// Output (Data, Variable, Absolute)
    
    0xc0                          //     END_COLLECTION
};
//** Renaud : end_ReportDescriptor
	
rom const unsigned char *rom USB_CD_Ptr[]={&cfg01,&cfg01};
rom const unsigned char *rom USB_SD_Ptr[]={&sd000,&MfrString,&PrdString,&SerialNum};

rom pFunc ClassReqHandler[1]=
{
    &USBCheckHIDRequest
};

#pragma code

/** EOF usbdsc.c ****************************************************/
