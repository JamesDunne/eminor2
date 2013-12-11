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
ifeq "$(wildcard nbproject/Makefile-local-PIC18F4550.mk)" "nbproject/Makefile-local-PIC18F4550.mk"
include nbproject/Makefile-local-PIC18F4550.mk
endif
endif

# Environment
MKDIR=gnumkdir -p
RM=rm -f 
MV=mv 
CP=cp 

# Macros
CND_CONF=PIC18F4550
ifeq ($(TYPE_IMAGE), DEBUG_RUN)
IMAGE_TYPE=debug
OUTPUT_SUFFIX=cof
DEBUGGABLE_SUFFIX=cof
FINAL_IMAGE=dist/${CND_CONF}/${IMAGE_TYPE}/PIC_BOOT.${IMAGE_TYPE}.${OUTPUT_SUFFIX}
else
IMAGE_TYPE=production
OUTPUT_SUFFIX=hex
DEBUGGABLE_SUFFIX=cof
FINAL_IMAGE=dist/${CND_CONF}/${IMAGE_TYPE}/PIC_BOOT.${IMAGE_TYPE}.${OUTPUT_SUFFIX}
endif

# Object Directory
OBJECTDIR=build/${CND_CONF}/${IMAGE_TYPE}

# Distribution Directory
DISTDIR=dist/${CND_CONF}/${IMAGE_TYPE}

# Source Files Quoted if spaced
SOURCEFILES_QUOTED_IF_SPACED=hid.c main.c usb9.c usbctrltrf.c usbdrv.c usbdsc.c usbmmap.c BootPIC18NonJ.c BootUserStartup.c UserAppCode.c

# Object Files Quoted if spaced
OBJECTFILES_QUOTED_IF_SPACED=${OBJECTDIR}/hid.o ${OBJECTDIR}/main.o ${OBJECTDIR}/usb9.o ${OBJECTDIR}/usbctrltrf.o ${OBJECTDIR}/usbdrv.o ${OBJECTDIR}/usbdsc.o ${OBJECTDIR}/usbmmap.o ${OBJECTDIR}/BootPIC18NonJ.o ${OBJECTDIR}/BootUserStartup.o ${OBJECTDIR}/UserAppCode.o
POSSIBLE_DEPFILES=${OBJECTDIR}/hid.o.d ${OBJECTDIR}/main.o.d ${OBJECTDIR}/usb9.o.d ${OBJECTDIR}/usbctrltrf.o.d ${OBJECTDIR}/usbdrv.o.d ${OBJECTDIR}/usbdsc.o.d ${OBJECTDIR}/usbmmap.o.d ${OBJECTDIR}/BootPIC18NonJ.o.d ${OBJECTDIR}/BootUserStartup.o.d ${OBJECTDIR}/UserAppCode.o.d

# Object Files
OBJECTFILES=${OBJECTDIR}/hid.o ${OBJECTDIR}/main.o ${OBJECTDIR}/usb9.o ${OBJECTDIR}/usbctrltrf.o ${OBJECTDIR}/usbdrv.o ${OBJECTDIR}/usbdsc.o ${OBJECTDIR}/usbmmap.o ${OBJECTDIR}/BootPIC18NonJ.o ${OBJECTDIR}/BootUserStartup.o ${OBJECTDIR}/UserAppCode.o

# Source Files
SOURCEFILES=hid.c main.c usb9.c usbctrltrf.c usbdrv.c usbdsc.c usbmmap.c BootPIC18NonJ.c BootUserStartup.c UserAppCode.c


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
	${MAKE} ${MAKE_OPTIONS} -f nbproject/Makefile-PIC18F4550.mk dist/${CND_CONF}/${IMAGE_TYPE}/PIC_BOOT.${IMAGE_TYPE}.${OUTPUT_SUFFIX}

MP_PROCESSOR_OPTION=18F4550
MP_PROCESSOR_OPTION_LD=18f4550
MP_LINKER_DEBUG_OPTION= -u_DEBUGCODESTART=0x7dc0 -u_DEBUGCODELEN=0x240 -u_DEBUGDATASTART=0x3f4 -u_DEBUGDATALEN=0xb
# ------------------------------------------------------------------------------------
# Rules for buildStep: assemble
ifeq ($(TYPE_IMAGE), DEBUG_RUN)
else
endif

# ------------------------------------------------------------------------------------
# Rules for buildStep: compile
ifeq ($(TYPE_IMAGE), DEBUG_RUN)
${OBJECTDIR}/hid.o: hid.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/hid.o.d 
	@${RM} ${OBJECTDIR}/hid.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG -D__MPLAB_DEBUGGER_PK3=1 -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/hid.o   hid.c 
	@${DEP_GEN} -d ${OBJECTDIR}/hid.o 
	@${FIXDEPS} "${OBJECTDIR}/hid.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/main.o: main.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/main.o.d 
	@${RM} ${OBJECTDIR}/main.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG -D__MPLAB_DEBUGGER_PK3=1 -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/main.o   main.c 
	@${DEP_GEN} -d ${OBJECTDIR}/main.o 
	@${FIXDEPS} "${OBJECTDIR}/main.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usb9.o: usb9.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usb9.o.d 
	@${RM} ${OBJECTDIR}/usb9.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG -D__MPLAB_DEBUGGER_PK3=1 -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usb9.o   usb9.c 
	@${DEP_GEN} -d ${OBJECTDIR}/usb9.o 
	@${FIXDEPS} "${OBJECTDIR}/usb9.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usbctrltrf.o: usbctrltrf.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usbctrltrf.o.d 
	@${RM} ${OBJECTDIR}/usbctrltrf.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG -D__MPLAB_DEBUGGER_PK3=1 -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usbctrltrf.o   usbctrltrf.c 
	@${DEP_GEN} -d ${OBJECTDIR}/usbctrltrf.o 
	@${FIXDEPS} "${OBJECTDIR}/usbctrltrf.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usbdrv.o: usbdrv.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usbdrv.o.d 
	@${RM} ${OBJECTDIR}/usbdrv.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG -D__MPLAB_DEBUGGER_PK3=1 -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usbdrv.o   usbdrv.c 
	@${DEP_GEN} -d ${OBJECTDIR}/usbdrv.o 
	@${FIXDEPS} "${OBJECTDIR}/usbdrv.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usbdsc.o: usbdsc.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usbdsc.o.d 
	@${RM} ${OBJECTDIR}/usbdsc.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG -D__MPLAB_DEBUGGER_PK3=1 -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usbdsc.o   usbdsc.c 
	@${DEP_GEN} -d ${OBJECTDIR}/usbdsc.o 
	@${FIXDEPS} "${OBJECTDIR}/usbdsc.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usbmmap.o: usbmmap.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usbmmap.o.d 
	@${RM} ${OBJECTDIR}/usbmmap.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG -D__MPLAB_DEBUGGER_PK3=1 -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usbmmap.o   usbmmap.c 
	@${DEP_GEN} -d ${OBJECTDIR}/usbmmap.o 
	@${FIXDEPS} "${OBJECTDIR}/usbmmap.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/BootPIC18NonJ.o: BootPIC18NonJ.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/BootPIC18NonJ.o.d 
	@${RM} ${OBJECTDIR}/BootPIC18NonJ.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG -D__MPLAB_DEBUGGER_PK3=1 -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/BootPIC18NonJ.o   BootPIC18NonJ.c 
	@${DEP_GEN} -d ${OBJECTDIR}/BootPIC18NonJ.o 
	@${FIXDEPS} "${OBJECTDIR}/BootPIC18NonJ.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/BootUserStartup.o: BootUserStartup.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/BootUserStartup.o.d 
	@${RM} ${OBJECTDIR}/BootUserStartup.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG -D__MPLAB_DEBUGGER_PK3=1 -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/BootUserStartup.o   BootUserStartup.c 
	@${DEP_GEN} -d ${OBJECTDIR}/BootUserStartup.o 
	@${FIXDEPS} "${OBJECTDIR}/BootUserStartup.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/UserAppCode.o: UserAppCode.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/UserAppCode.o.d 
	@${RM} ${OBJECTDIR}/UserAppCode.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -D__DEBUG -D__MPLAB_DEBUGGER_PK3=1 -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/UserAppCode.o   UserAppCode.c 
	@${DEP_GEN} -d ${OBJECTDIR}/UserAppCode.o 
	@${FIXDEPS} "${OBJECTDIR}/UserAppCode.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
else
${OBJECTDIR}/hid.o: hid.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/hid.o.d 
	@${RM} ${OBJECTDIR}/hid.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/hid.o   hid.c 
	@${DEP_GEN} -d ${OBJECTDIR}/hid.o 
	@${FIXDEPS} "${OBJECTDIR}/hid.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/main.o: main.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/main.o.d 
	@${RM} ${OBJECTDIR}/main.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/main.o   main.c 
	@${DEP_GEN} -d ${OBJECTDIR}/main.o 
	@${FIXDEPS} "${OBJECTDIR}/main.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usb9.o: usb9.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usb9.o.d 
	@${RM} ${OBJECTDIR}/usb9.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usb9.o   usb9.c 
	@${DEP_GEN} -d ${OBJECTDIR}/usb9.o 
	@${FIXDEPS} "${OBJECTDIR}/usb9.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usbctrltrf.o: usbctrltrf.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usbctrltrf.o.d 
	@${RM} ${OBJECTDIR}/usbctrltrf.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usbctrltrf.o   usbctrltrf.c 
	@${DEP_GEN} -d ${OBJECTDIR}/usbctrltrf.o 
	@${FIXDEPS} "${OBJECTDIR}/usbctrltrf.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usbdrv.o: usbdrv.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usbdrv.o.d 
	@${RM} ${OBJECTDIR}/usbdrv.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usbdrv.o   usbdrv.c 
	@${DEP_GEN} -d ${OBJECTDIR}/usbdrv.o 
	@${FIXDEPS} "${OBJECTDIR}/usbdrv.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usbdsc.o: usbdsc.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usbdsc.o.d 
	@${RM} ${OBJECTDIR}/usbdsc.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usbdsc.o   usbdsc.c 
	@${DEP_GEN} -d ${OBJECTDIR}/usbdsc.o 
	@${FIXDEPS} "${OBJECTDIR}/usbdsc.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/usbmmap.o: usbmmap.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/usbmmap.o.d 
	@${RM} ${OBJECTDIR}/usbmmap.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/usbmmap.o   usbmmap.c 
	@${DEP_GEN} -d ${OBJECTDIR}/usbmmap.o 
	@${FIXDEPS} "${OBJECTDIR}/usbmmap.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/BootPIC18NonJ.o: BootPIC18NonJ.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/BootPIC18NonJ.o.d 
	@${RM} ${OBJECTDIR}/BootPIC18NonJ.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/BootPIC18NonJ.o   BootPIC18NonJ.c 
	@${DEP_GEN} -d ${OBJECTDIR}/BootPIC18NonJ.o 
	@${FIXDEPS} "${OBJECTDIR}/BootPIC18NonJ.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/BootUserStartup.o: BootUserStartup.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/BootUserStartup.o.d 
	@${RM} ${OBJECTDIR}/BootUserStartup.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/BootUserStartup.o   BootUserStartup.c 
	@${DEP_GEN} -d ${OBJECTDIR}/BootUserStartup.o 
	@${FIXDEPS} "${OBJECTDIR}/BootUserStartup.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
${OBJECTDIR}/UserAppCode.o: UserAppCode.c  nbproject/Makefile-${CND_CONF}.mk
	@${MKDIR} ${OBJECTDIR} 
	@${RM} ${OBJECTDIR}/UserAppCode.o.d 
	@${RM} ${OBJECTDIR}/UserAppCode.o 
	${MP_CC} $(MP_EXTRA_CC_PRE) -p$(MP_PROCESSOR_OPTION) -scs -I"MCC18/h" -I".." -ms -oa-  -I ${MP_CC_DIR}\\..\\h  -fo ${OBJECTDIR}/UserAppCode.o   UserAppCode.c 
	@${DEP_GEN} -d ${OBJECTDIR}/UserAppCode.o 
	@${FIXDEPS} "${OBJECTDIR}/UserAppCode.o.d" $(SILENT) -rsi ${MP_CC_DIR}../ -c18 
	
endif

# ------------------------------------------------------------------------------------
# Rules for buildStep: link
ifeq ($(TYPE_IMAGE), DEBUG_RUN)
dist/${CND_CONF}/${IMAGE_TYPE}/PIC_BOOT.${IMAGE_TYPE}.${OUTPUT_SUFFIX}: ${OBJECTFILES}  nbproject/Makefile-${CND_CONF}.mk    BootModified.18f4550_g.lkr
	@${MKDIR} dist/${CND_CONF}/${IMAGE_TYPE} 
	${MP_LD} $(MP_EXTRA_LD_PRE) "BootModified.18f4550_g.lkr"  -p$(MP_PROCESSOR_OPTION_LD)  -w -x -u_DEBUG -m"$(BINDIR_)$(TARGETBASE).map" -w -l"MCC18/lib"  -z__MPLAB_BUILD=1  -u_CRUNTIME -z__MPLAB_DEBUG=1 -z__MPLAB_DEBUGGER_PK3=1 $(MP_LINKER_DEBUG_OPTION) -l ${MP_CC_DIR}\\..\\lib  -o dist/${CND_CONF}/${IMAGE_TYPE}/PIC_BOOT.${IMAGE_TYPE}.${OUTPUT_SUFFIX}  ${OBJECTFILES_QUOTED_IF_SPACED}   
else
dist/${CND_CONF}/${IMAGE_TYPE}/PIC_BOOT.${IMAGE_TYPE}.${OUTPUT_SUFFIX}: ${OBJECTFILES}  nbproject/Makefile-${CND_CONF}.mk   BootModified.18f4550_g.lkr
	@${MKDIR} dist/${CND_CONF}/${IMAGE_TYPE} 
	${MP_LD} $(MP_EXTRA_LD_PRE) "BootModified.18f4550_g.lkr"  -p$(MP_PROCESSOR_OPTION_LD)  -w  -m"$(BINDIR_)$(TARGETBASE).map" -w -l"MCC18/lib"  -z__MPLAB_BUILD=1  -u_CRUNTIME -l ${MP_CC_DIR}\\..\\lib  -o dist/${CND_CONF}/${IMAGE_TYPE}/PIC_BOOT.${IMAGE_TYPE}.${DEBUGGABLE_SUFFIX}  ${OBJECTFILES_QUOTED_IF_SPACED}   
endif


# Subprojects
.build-subprojects:


# Subprojects
.clean-subprojects:

# Clean Targets
.clean-conf: ${CLEAN_SUBPROJECTS}
	${RM} -r build/PIC18F4550
	${RM} -r dist/PIC18F4550

# Enable dependency checking
.dep.inc: .depcheck-impl

DEPFILES=$(shell mplabwildcard ${POSSIBLE_DEPFILES})
ifneq (${DEPFILES},)
include ${DEPFILES}
endif
