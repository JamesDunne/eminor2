#
# Generated Makefile - do not edit!
#
# Edit the Makefile in the project folder instead (../Makefile). Each target
# has a -pre and a -post target defined where you can add customized code.
#
# This makefile implements configuration specific macros and targets.


# Include project Makefile
ifeq "${IGNORE_LOCAL}" "TRUE"
# do not include local makefile. User is passing all local related variables already
else
include Makefile
# Include makefile containing local settings
ifeq "$(wildcard nbproject/Makefile-local-default.mk)" "nbproject/Makefile-local-default.mk"
include nbproject/Makefile-local-default.mk
endif
endif

# Environment
MKDIR=gnumkdir -p
RM=rm -f 
MV=mv 
CP=cp 

# Macros
CND_CONF=default
ifeq ($(TYPE_IMAGE), DEBUG_RUN)
IMAGE_TYPE=debug
OUTPUT_SUFFIX=cof
DEBUGGABLE_SUFFIX=cof
FINAL_IMAGE=dist/${CND_CONF}/${IMAGE_TYPE}/PIC.${IMAGE_TYPE}.${OUTPUT_SUFFIX}
else
IMAGE_TYPE=production
OUTPUT_SUFFIX=hex
DEBUGGABLE_SUFFIX=cof
FINAL_IMAGE=dist/${CND_CONF}/${IMAGE_TYPE}/PIC.${IMAGE_TYPE}.${OUTPUT_SUFFIX}
endif

# Object Directory
OBJECTDIR=build/${CND_CONF}/${IMAGE_TYPE}

# Distribution Directory
DISTDIR=dist/${CND_CONF}/${IMAGE_TYPE}

# Source Files Quoted if spaced
SOURCEFILES_QUOTED_IF_SPACED=main.c startup.c usb.c usbapplet.c usbdescript.c rs232.c hid.c ram_def.c config.asm intslct.c init.c hwcalls.c vectors.c eeprom.c writeprogmem.c systick.c MidiComm.c ../common/controller-simple.c

# Object Files Quoted if spaced
OBJECTFILES_QUOTED_IF_SPACED=${OBJECTDIR}/main.o ${OBJECTDIR}/startup.o ${OBJECTDIR}/usb.o ${OBJECTDIR}/usbapplet.o ${OBJECTDIR}/usbdescript.o ${OBJECTDIR}/rs232.o ${OBJECTDIR}/hid.o ${OBJECTDIR}/ram_def.o ${OBJECTDIR}/config.o ${OBJECTDIR}/intslct.o ${OBJECTDIR}/init.o ${OBJECTDIR}/hwcalls.o ${OBJECTDIR}/vectors.o ${OBJECTDIR}/eeprom.o ${OBJECTDIR}/writeprogmem.o ${OBJECTDIR}/systick.o ${OBJECTDIR}/MidiComm.o ${OBJECTDIR}/_ext/1270477542/controller-simple.o
POSSIBLE_DEPFILES=${OBJECTDIR}/main.o.d ${OBJECTDIR}/startup.o.d ${OBJECTDIR}/usb.o.d ${OBJECTDIR}/usbapplet.o.d ${OBJECTDIR}/usbdescript.o.d ${OBJECTDIR}/rs232.o.d ${OBJECTDIR}/hid.o.d ${OBJECTDIR}/ram_def.o.d ${OBJECTDIR}/config.o.d ${OBJECTDIR}/intslct.o.d ${OBJECTDIR}/init.o.d ${OBJECTDIR}/hwcalls.o.d ${OBJECTDIR}/vectors.o.d ${OBJECTDIR}/eeprom.o.d ${OBJECTDIR}/writeprogmem.o.d ${OBJECTDIR}/systick.o.d ${OBJECTDIR}/MidiComm.o.d ${OBJECTDIR}/_ext/1270477542/controller-simple.o.d

# Object Files
OBJECTFILES=${OBJECTDIR}/main.o ${OBJECTDIR}/startup.o ${OBJECTDIR}/usb.o ${OBJECTDIR}/usbapplet.o ${OBJECTDIR}/usbdescript.o ${OBJECTDIR}/rs232.o ${OBJECTDIR}/hid.o ${OBJECTDIR}/ram_def.o ${OBJECTDIR}/config.o ${OBJECTDIR}/intslct.o ${OBJECTDIR}/init.o ${OBJECTDIR}/hwcalls.o ${OBJECTDIR}/vectors.o ${OBJECTDIR}/eeprom.o ${OBJECTDIR}/writeprogmem.o ${OBJECTDIR}/systick.o ${OBJECTDIR}/MidiComm.o ${OBJECTDIR}/_ext/1270477542/controller-simple.o

# Source Files
SOURCEFILES=main.c startup.c usb.c usbapplet.c usbdescript.c rs232.c hid.c ram_def.c config.asm intslct.c init.c hwcalls.c vectors.c eeprom.c writeprogmem.c systick.c MidiComm.c ../common/controller-simple.c


CFLAGS=
ASFLAGS=
LDLIBSOPTIONS=

############# Tool locations ##########################################
# If you copy a project from one host to another, the path where the  #
# compiler is installed may be different.                             #
# If you open this project with MPLAB X in the new host, this         #
# makefile will be regenerated and the paths will be corrected.       #
#######################################################################
# fixDeps replaces a bunch of sed/cat/printf statements that slow down the build
FIXDEPS=fixDeps

.build-conf:  ${BUILD_SUBPROJECTS}
	${MAKE} ${MAKE_OPTIONS} -f nbproject/Makefile-default.mk dist/${CND_CONF}/${IMAGE_TYPE}/PIC.${IMAGE_TYPE}.${OUTPUT_SUFFIX}

MP_PROCESSOR_OPTION=18F4455
MP_PROCESSOR_OPTION_LD=18f4455
MP_LINKER_DEBUG_OPTION=
# ------------------------------------------------------------------------------------
# Rules for buildStep: assemble
ifeq ($(TYPE_IMAGE), DEBUG_RUN)
${OBJECTDIR}/config.o: config.asm  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/config.o.d 
	@${RM} ${OBJECTDIR}/config.o 
	@${FIXDEPS} dummy.d -e "${OBJECTDIR}/config.err" $(SILENT) -c ${MP_AS} $(MP_EXTRA_AS_PRE) -d__DEBUG  -q -p$(MP_PROCESSOR_OPTION)  -l\"${OBJECTDIR}/config.lst\" -e\"${OBJECTDIR}/config.err\" $(ASM_OPTIONS)  -o\"${OBJECTDIR}/config.o\" config.asm 
	@${DEP_GEN} -d ${OBJECTDIR}/config.o 
	@${FIXDEPS} "${OBJECTDIR}/config.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
else
${OBJECTDIR}/config.o: config.asm  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/config.o.d 
	@${RM} ${OBJECTDIR}/config.o 
	@${FIXDEPS} dummy.d -e "${OBJECTDIR}/config.err" $(SILENT) -c ${MP_AS} $(MP_EXTRA_AS_PRE) -q -p$(MP_PROCESSOR_OPTION)  -l\"${OBJECTDIR}/config.lst\" -e\"${OBJECTDIR}/config.err\" $(ASM_OPTIONS)  -o\"${OBJECTDIR}/config.o\" config.asm 
	@${DEP_GEN} -d ${OBJECTDIR}/config.o 
	@${FIXDEPS} "${OBJECTDIR}/config.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
endif

# ------------------------------------------------------------------------------------
# Rules for buildStep: compile
ifeq ($(TYPE_IMAGE), DEBUG_RUN)
${OBJECTDIR}/main.o: main.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/main.o.d 
	@${RM} ${OBJECTDIR}/main.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/main.o   main.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/main.o 
	@${FIXDEPS} "${OBJECTDIR}/main.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/startup.o: startup.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/startup.o.d 
	@${RM} ${OBJECTDIR}/startup.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/startup.o   startup.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/startup.o 
	@${FIXDEPS} "${OBJECTDIR}/startup.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usb.o: usb.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usb.o.d 
	@${RM} ${OBJECTDIR}/usb.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usb.o   usb.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/usb.o 
	@${FIXDEPS} "${OBJECTDIR}/usb.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usbapplet.o: usbapplet.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usbapplet.o.d 
	@${RM} ${OBJECTDIR}/usbapplet.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usbapplet.o   usbapplet.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/usbapplet.o 
	@${FIXDEPS} "${OBJECTDIR}/usbapplet.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usbdescript.o: usbdescript.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usbdescript.o.d 
	@${RM} ${OBJECTDIR}/usbdescript.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usbdescript.o   usbdescript.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/usbdescript.o 
	@${FIXDEPS} "${OBJECTDIR}/usbdescript.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/rs232.o: rs232.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/rs232.o.d 
	@${RM} ${OBJECTDIR}/rs232.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/rs232.o   rs232.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/rs232.o 
	@${FIXDEPS} "${OBJECTDIR}/rs232.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/hid.o: hid.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/hid.o.d 
	@${RM} ${OBJECTDIR}/hid.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/hid.o   hid.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/hid.o 
	@${FIXDEPS} "${OBJECTDIR}/hid.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/ram_def.o: ram_def.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/ram_def.o.d 
	@${RM} ${OBJECTDIR}/ram_def.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/ram_def.o   ram_def.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/ram_def.o 
	@${FIXDEPS} "${OBJECTDIR}/ram_def.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/intslct.o: intslct.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/intslct.o.d 
	@${RM} ${OBJECTDIR}/intslct.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/intslct.o   intslct.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/intslct.o 
	@${FIXDEPS} "${OBJECTDIR}/intslct.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/init.o: init.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/init.o.d 
	@${RM} ${OBJECTDIR}/init.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/init.o   init.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/init.o 
	@${FIXDEPS} "${OBJECTDIR}/init.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/hwcalls.o: hwcalls.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/hwcalls.o.d 
	@${RM} ${OBJECTDIR}/hwcalls.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/hwcalls.o   hwcalls.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/hwcalls.o 
	@${FIXDEPS} "${OBJECTDIR}/hwcalls.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/vectors.o: vectors.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/vectors.o.d 
	@${RM} ${OBJECTDIR}/vectors.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/vectors.o   vectors.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/vectors.o 
	@${FIXDEPS} "${OBJECTDIR}/vectors.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/eeprom.o: eeprom.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/eeprom.o.d 
	@${RM} ${OBJECTDIR}/eeprom.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/eeprom.o   eeprom.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/eeprom.o 
	@${FIXDEPS} "${OBJECTDIR}/eeprom.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/writeprogmem.o: writeprogmem.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/writeprogmem.o.d 
	@${RM} ${OBJECTDIR}/writeprogmem.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/writeprogmem.o   writeprogmem.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/writeprogmem.o 
	@${FIXDEPS} "${OBJECTDIR}/writeprogmem.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/systick.o: systick.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/systick.o.d 
	@${RM} ${OBJECTDIR}/systick.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/systick.o   systick.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/systick.o 
	@${FIXDEPS} "${OBJECTDIR}/systick.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/MidiComm.o: MidiComm.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/MidiComm.o.d 
	@${RM} ${OBJECTDIR}/MidiComm.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/MidiComm.o   MidiComm.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/MidiComm.o 
	@${FIXDEPS} "${OBJECTDIR}/MidiComm.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/_ext/1270477542/controller-simple.o: ../common/controller-simple.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR}/_ext/1270477542 
	@${RM} ${OBJECTDIR}/_ext/1270477542/controller-simple.o.d 
	@${RM} ${OBJECTDIR}/_ext/1270477542/controller-simple.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG  -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/_ext/1270477542/controller-simple.o   ../common/controller-simple.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/_ext/1270477542/controller-simple.o 
	@${FIXDEPS} "${OBJECTDIR}/_ext/1270477542/controller-simple.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
else
${OBJECTDIR}/main.o: main.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/main.o.d 
	@${RM} ${OBJECTDIR}/main.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/main.o   main.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/main.o 
	@${FIXDEPS} "${OBJECTDIR}/main.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/startup.o: startup.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/startup.o.d 
	@${RM} ${OBJECTDIR}/startup.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/startup.o   startup.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/startup.o 
	@${FIXDEPS} "${OBJECTDIR}/startup.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usb.o: usb.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usb.o.d 
	@${RM} ${OBJECTDIR}/usb.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usb.o   usb.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/usb.o 
	@${FIXDEPS} "${OBJECTDIR}/usb.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usbapplet.o: usbapplet.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usbapplet.o.d 
	@${RM} ${OBJECTDIR}/usbapplet.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usbapplet.o   usbapplet.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/usbapplet.o 
	@${FIXDEPS} "${OBJECTDIR}/usbapplet.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usbdescript.o: usbdescript.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usbdescript.o.d 
	@${RM} ${OBJECTDIR}/usbdescript.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usbdescript.o   usbdescript.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/usbdescript.o 
	@${FIXDEPS} "${OBJECTDIR}/usbdescript.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/rs232.o: rs232.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/rs232.o.d 
	@${RM} ${OBJECTDIR}/rs232.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/rs232.o   rs232.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/rs232.o 
	@${FIXDEPS} "${OBJECTDIR}/rs232.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/hid.o: hid.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/hid.o.d 
	@${RM} ${OBJECTDIR}/hid.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/hid.o   hid.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/hid.o 
	@${FIXDEPS} "${OBJECTDIR}/hid.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/ram_def.o: ram_def.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/ram_def.o.d 
	@${RM} ${OBJECTDIR}/ram_def.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/ram_def.o   ram_def.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/ram_def.o 
	@${FIXDEPS} "${OBJECTDIR}/ram_def.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/intslct.o: intslct.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/intslct.o.d 
	@${RM} ${OBJECTDIR}/intslct.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/intslct.o   intslct.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/intslct.o 
	@${FIXDEPS} "${OBJECTDIR}/intslct.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/init.o: init.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/init.o.d 
	@${RM} ${OBJECTDIR}/init.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/init.o   init.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/init.o 
	@${FIXDEPS} "${OBJECTDIR}/init.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/hwcalls.o: hwcalls.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/hwcalls.o.d 
	@${RM} ${OBJECTDIR}/hwcalls.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/hwcalls.o   hwcalls.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/hwcalls.o 
	@${FIXDEPS} "${OBJECTDIR}/hwcalls.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/vectors.o: vectors.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/vectors.o.d 
	@${RM} ${OBJECTDIR}/vectors.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/vectors.o   vectors.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/vectors.o 
	@${FIXDEPS} "${OBJECTDIR}/vectors.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/eeprom.o: eeprom.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/eeprom.o.d 
	@${RM} ${OBJECTDIR}/eeprom.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/eeprom.o   eeprom.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/eeprom.o 
	@${FIXDEPS} "${OBJECTDIR}/eeprom.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/writeprogmem.o: writeprogmem.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/writeprogmem.o.d 
	@${RM} ${OBJECTDIR}/writeprogmem.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/writeprogmem.o   writeprogmem.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/writeprogmem.o 
	@${FIXDEPS} "${OBJECTDIR}/writeprogmem.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/systick.o: systick.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/systick.o.d 
	@${RM} ${OBJECTDIR}/systick.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/systick.o   systick.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/systick.o 
	@${FIXDEPS} "${OBJECTDIR}/systick.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/MidiComm.o: MidiComm.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/MidiComm.o.d 
	@${RM} ${OBJECTDIR}/MidiComm.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/MidiComm.o   MidiComm.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/MidiComm.o 
	@${FIXDEPS} "${OBJECTDIR}/MidiComm.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/_ext/1270477542/controller-simple.o: ../common/controller-simple.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR}/_ext/1270477542 
	@${RM} ${OBJECTDIR}/_ext/1270477542/controller-simple.o.d 
	@${RM} ${OBJECTDIR}/_ext/1270477542/controller-simple.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -I"../common" -I"../../../../../mplabc18/v3.46/h" -I"." -ms -oa- -nw 2060 -nw 2056 -nw 2055  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/_ext/1270477542/controller-simple.o   ../common/controller-simple.c  -nw 2060 -nw 2056 -nw 2055
	@${DEP_GEN} -d ${OBJECTDIR}/_ext/1270477542/controller-simple.o 
	@${FIXDEPS} "${OBJECTDIR}/_ext/1270477542/controller-simple.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
endif

# ------------------------------------------------------------------------------------
# Rules for buildStep: link
ifeq ($(TYPE_IMAGE), DEBUG_RUN)
dist/${CND_CONF}/${IMAGE_TYPE}/PIC.${IMAGE_TYPE}.${OUTPUT_SUFFIX}: ${OBJECTFILES}  nbproject/Makefile-${CND_CONF}.mk    18f4455.lkr
	@${MKDIR} dist/${CND_CONF}/${IMAGE_TYPE} 
	${MP_LD} $(MP_EXTRA_LD_PRE) "18f4455.lkr"  -p$(MP_PROCESSOR_OPTION_LD)  -w -x -u_DEBUG -m"$(BINDIR_)$(TARGETBASE).map" -w -l"../../../../../mplabc18/v3.46/lib" -l"."  -z__MPLAB_BUILD=1  -u_CRUNTIME -z__MPLAB_DEBUG=1 $(MP_LINKER_DEBUG_OPTION) -l ${MP_CC_DIR}\\..\\lib  -o dist/${CND_CONF}/${IMAGE_TYPE}/PIC.${IMAGE_TYPE}.${OUTPUT_SUFFIX}  ${OBJECTFILES_QUOTED_IF_SPACED}   
else
dist/${CND_CONF}/${IMAGE_TYPE}/PIC.${IMAGE_TYPE}.${OUTPUT_SUFFIX}: ${OBJECTFILES}  nbproject/Makefile-${CND_CONF}.mk   18f4455.lkr
	@${MKDIR} dist/${CND_CONF}/${IMAGE_TYPE} 
	${MP_LD} $(MP_EXTRA_LD_PRE) "18f4455.lkr"  -p$(MP_PROCESSOR_OPTION_LD)  -w  -m"$(BINDIR_)$(TARGETBASE).map" -w -l"../../../../../mplabc18/v3.46/lib" -l"."  -z__MPLAB_BUILD=1  -u_CRUNTIME -l ${MP_CC_DIR}\\..\\lib  -o dist/${CND_CONF}/${IMAGE_TYPE}/PIC.${IMAGE_TYPE}.${DEBUGGABLE_SUFFIX}  ${OBJECTFILES_QUOTED_IF_SPACED}   
endif


# Subprojects
.build-subprojects:


# Subprojects
.clean-subprojects:

# Clean Targets
.clean-conf: ${CLEAN_SUBPROJECTS}
	${RM} -r build/default
	${RM} -r dist/default

# Enable dependency checking
.dep.inc: .depcheck-impl

DEPFILES=$(shell mplabwildcard ${POSSIBLE_DEPFILES})
ifneq (${DEPFILES},)
include ${DEPFILES}
endif
