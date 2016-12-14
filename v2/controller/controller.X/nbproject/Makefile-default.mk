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
FINAL_IMAGE=dist/${CND_CONF}/${IMAGE_TYPE}/controller.X.${IMAGE_TYPE}.${OUTPUT_SUFFIX}
else
IMAGE_TYPE=production
OUTPUT_SUFFIX=hex
DEBUGGABLE_SUFFIX=cof
FINAL_IMAGE=dist/${CND_CONF}/${IMAGE_TYPE}/controller.X.${IMAGE_TYPE}.${OUTPUT_SUFFIX}
endif

ifeq ($(COMPARE_BUILD), true)
COMPARISON_BUILD=
else
COMPARISON_BUILD=
endif

# Object Directory
OBJECTDIR=build/${CND_CONF}/${IMAGE_TYPE}

# Distribution Directory
DISTDIR=dist/${CND_CONF}/${IMAGE_TYPE}

# Source Files Quoted if spaced
SOURCEFILES_QUOTED_IF_SPACED=../PIC/BootUserStartup.c ../PIC/UserAppCode.c ../PIC/bootcode.c ../PIC/comm_lcd.c ../PIC/comm_midi.c ../PIC/hwcalls.c ../PIC/init.c ../PIC/intslct.c ../PIC/main.c ../PIC/ram_def.c ../PIC/systick.c ../PIC/writeprogmem.c ../common/controller-axe.c

# Object Files Quoted if spaced
OBJECTFILES_QUOTED_IF_SPACED=${OBJECTDIR}/_ext/1360902299/BootUserStartup.o ${OBJECTDIR}/_ext/1360902299/UserAppCode.o ${OBJECTDIR}/_ext/1360902299/bootcode.o ${OBJECTDIR}/_ext/1360902299/comm_lcd.o ${OBJECTDIR}/_ext/1360902299/comm_midi.o ${OBJECTDIR}/_ext/1360902299/hwcalls.o ${OBJECTDIR}/_ext/1360902299/init.o ${OBJECTDIR}/_ext/1360902299/intslct.o ${OBJECTDIR}/_ext/1360902299/main.o ${OBJECTDIR}/_ext/1360902299/ram_def.o ${OBJECTDIR}/_ext/1360902299/systick.o ${OBJECTDIR}/_ext/1360902299/writeprogmem.o ${OBJECTDIR}/_ext/1270477542/controller-axe.o
POSSIBLE_DEPFILES=${OBJECTDIR}/_ext/1360902299/BootUserStartup.o.d ${OBJECTDIR}/_ext/1360902299/UserAppCode.o.d ${OBJECTDIR}/_ext/1360902299/bootcode.o.d ${OBJECTDIR}/_ext/1360902299/comm_lcd.o.d ${OBJECTDIR}/_ext/1360902299/comm_midi.o.d ${OBJECTDIR}/_ext/1360902299/hwcalls.o.d ${OBJECTDIR}/_ext/1360902299/init.o.d ${OBJECTDIR}/_ext/1360902299/intslct.o.d ${OBJECTDIR}/_ext/1360902299/main.o.d ${OBJECTDIR}/_ext/1360902299/ram_def.o.d ${OBJECTDIR}/_ext/1360902299/systick.o.d ${OBJECTDIR}/_ext/1360902299/writeprogmem.o.d ${OBJECTDIR}/_ext/1270477542/controller-axe.o.d

# Object Files
OBJECTFILES=${OBJECTDIR}/_ext/1360902299/BootUserStartup.o ${OBJECTDIR}/_ext/1360902299/UserAppCode.o ${OBJECTDIR}/_ext/1360902299/bootcode.o ${OBJECTDIR}/_ext/1360902299/comm_lcd.o ${OBJECTDIR}/_ext/1360902299/comm_midi.o ${OBJECTDIR}/_ext/1360902299/hwcalls.o ${OBJECTDIR}/_ext/1360902299/init.o ${OBJECTDIR}/_ext/1360902299/intslct.o ${OBJECTDIR}/_ext/1360902299/main.o ${OBJECTDIR}/_ext/1360902299/ram_def.o ${OBJECTDIR}/_ext/1360902299/systick.o ${OBJECTDIR}/_ext/1360902299/writeprogmem.o ${OBJECTDIR}/_ext/1270477542/controller-axe.o

# Source Files
SOURCEFILES=../PIC/BootUserStartup.c ../PIC/UserAppCode.c ../PIC/bootcode.c ../PIC/comm_lcd.c ../PIC/comm_midi.c ../PIC/hwcalls.c ../PIC/init.c ../PIC/intslct.c ../PIC/main.c ../PIC/ram_def.c ../PIC/systick.c ../PIC/writeprogmem.c ../common/controller-axe.c


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
ifneq ($(INFORMATION_MESSAGE), )
	@echo $(INFORMATION_MESSAGE)
endif
	${MAKE}  -f nbproject/Makefile-default.mk dist/${CND_CONF}/${IMAGE_TYPE}/controller.X.${IMAGE_TYPE}.${OUTPUT_SUFFIX}

# ------------------------------------------------------------------------------------
# Rules for buildStep: compile
ifeq ($(TYPE_IMAGE), DEBUG_RUN)
${OBJECTDIR}/_ext/1360902299/BootUserStartup.o: ../PIC/BootUserStartup.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/BootUserStartup.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/BootUserStartup.c  -o${OBJECTDIR}/_ext/1360902299/BootUserStartup.o
	
${OBJECTDIR}/_ext/1360902299/UserAppCode.o: ../PIC/UserAppCode.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/UserAppCode.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/UserAppCode.c  -o${OBJECTDIR}/_ext/1360902299/UserAppCode.o
	
${OBJECTDIR}/_ext/1360902299/bootcode.o: ../PIC/bootcode.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/bootcode.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/bootcode.c  -o${OBJECTDIR}/_ext/1360902299/bootcode.o
	
${OBJECTDIR}/_ext/1360902299/comm_lcd.o: ../PIC/comm_lcd.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/comm_lcd.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/comm_lcd.c  -o${OBJECTDIR}/_ext/1360902299/comm_lcd.o
	
${OBJECTDIR}/_ext/1360902299/comm_midi.o: ../PIC/comm_midi.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/comm_midi.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/comm_midi.c  -o${OBJECTDIR}/_ext/1360902299/comm_midi.o
	
${OBJECTDIR}/_ext/1360902299/hwcalls.o: ../PIC/hwcalls.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/hwcalls.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/hwcalls.c  -o${OBJECTDIR}/_ext/1360902299/hwcalls.o
	
${OBJECTDIR}/_ext/1360902299/init.o: ../PIC/init.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/init.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/init.c  -o${OBJECTDIR}/_ext/1360902299/init.o
	
${OBJECTDIR}/_ext/1360902299/intslct.o: ../PIC/intslct.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/intslct.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/intslct.c  -o${OBJECTDIR}/_ext/1360902299/intslct.o
	
${OBJECTDIR}/_ext/1360902299/main.o: ../PIC/main.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/main.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/main.c  -o${OBJECTDIR}/_ext/1360902299/main.o
	
${OBJECTDIR}/_ext/1360902299/ram_def.o: ../PIC/ram_def.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/ram_def.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/ram_def.c  -o${OBJECTDIR}/_ext/1360902299/ram_def.o
	
${OBJECTDIR}/_ext/1360902299/systick.o: ../PIC/systick.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/systick.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/systick.c  -o${OBJECTDIR}/_ext/1360902299/systick.o
	
${OBJECTDIR}/_ext/1360902299/writeprogmem.o: ../PIC/writeprogmem.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/writeprogmem.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/writeprogmem.c  -o${OBJECTDIR}/_ext/1360902299/writeprogmem.o
	
${OBJECTDIR}/_ext/1270477542/controller-axe.o: ../common/controller-axe.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1270477542 
	${RM} ${OBJECTDIR}/_ext/1270477542/controller-axe.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../common/controller-axe.c  -o${OBJECTDIR}/_ext/1270477542/controller-axe.o
	
else
${OBJECTDIR}/_ext/1360902299/BootUserStartup.o: ../PIC/BootUserStartup.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/BootUserStartup.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/BootUserStartup.c  -o${OBJECTDIR}/_ext/1360902299/BootUserStartup.o
	
${OBJECTDIR}/_ext/1360902299/UserAppCode.o: ../PIC/UserAppCode.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/UserAppCode.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/UserAppCode.c  -o${OBJECTDIR}/_ext/1360902299/UserAppCode.o
	
${OBJECTDIR}/_ext/1360902299/bootcode.o: ../PIC/bootcode.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/bootcode.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/bootcode.c  -o${OBJECTDIR}/_ext/1360902299/bootcode.o
	
${OBJECTDIR}/_ext/1360902299/comm_lcd.o: ../PIC/comm_lcd.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/comm_lcd.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/comm_lcd.c  -o${OBJECTDIR}/_ext/1360902299/comm_lcd.o
	
${OBJECTDIR}/_ext/1360902299/comm_midi.o: ../PIC/comm_midi.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/comm_midi.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/comm_midi.c  -o${OBJECTDIR}/_ext/1360902299/comm_midi.o
	
${OBJECTDIR}/_ext/1360902299/hwcalls.o: ../PIC/hwcalls.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/hwcalls.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/hwcalls.c  -o${OBJECTDIR}/_ext/1360902299/hwcalls.o
	
${OBJECTDIR}/_ext/1360902299/init.o: ../PIC/init.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/init.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/init.c  -o${OBJECTDIR}/_ext/1360902299/init.o
	
${OBJECTDIR}/_ext/1360902299/intslct.o: ../PIC/intslct.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/intslct.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/intslct.c  -o${OBJECTDIR}/_ext/1360902299/intslct.o
	
${OBJECTDIR}/_ext/1360902299/main.o: ../PIC/main.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/main.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/main.c  -o${OBJECTDIR}/_ext/1360902299/main.o
	
${OBJECTDIR}/_ext/1360902299/ram_def.o: ../PIC/ram_def.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/ram_def.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/ram_def.c  -o${OBJECTDIR}/_ext/1360902299/ram_def.o
	
${OBJECTDIR}/_ext/1360902299/systick.o: ../PIC/systick.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/systick.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/systick.c  -o${OBJECTDIR}/_ext/1360902299/systick.o
	
${OBJECTDIR}/_ext/1360902299/writeprogmem.o: ../PIC/writeprogmem.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1360902299 
	${RM} ${OBJECTDIR}/_ext/1360902299/writeprogmem.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../PIC/writeprogmem.c  -o${OBJECTDIR}/_ext/1360902299/writeprogmem.o
	
${OBJECTDIR}/_ext/1270477542/controller-axe.o: ../common/controller-axe.c  nbproject/Makefile-${CND_CONF}.mk
	${MKDIR} ${OBJECTDIR}/_ext/1270477542 
	${RM} ${OBJECTDIR}/_ext/1270477542/controller-axe.o 
	${MP_CC} --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -c -mpic16 -p18f4550 ../common/controller-axe.c  -o${OBJECTDIR}/_ext/1270477542/controller-axe.o
	
endif

# ------------------------------------------------------------------------------------
# Rules for buildStep: link
ifeq ($(TYPE_IMAGE), DEBUG_RUN)
dist/${CND_CONF}/${IMAGE_TYPE}/controller.X.${IMAGE_TYPE}.${OUTPUT_SUFFIX}: ${OBJECTFILES}  nbproject/Makefile-${CND_CONF}.mk    ../PIC/18f4550.lkr
	${MKDIR} dist/${CND_CONF}/${IMAGE_TYPE} 
	${MP_CC} -Wl-c -Wl-m --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -mpic16 -p18f4550 ${OBJECTFILES} -odist/${CND_CONF}/${IMAGE_TYPE}/controller.X.${IMAGE_TYPE}.${OUTPUT_SUFFIX} 
else
dist/${CND_CONF}/${IMAGE_TYPE}/controller.X.${IMAGE_TYPE}.${OUTPUT_SUFFIX}: ${OBJECTFILES}  nbproject/Makefile-${CND_CONF}.mk   ../PIC/18f4550.lkr
	${MKDIR} dist/${CND_CONF}/${IMAGE_TYPE} 
	${MP_CC} -Wl-c -Wl-m --use-non-free -DHW_VERSION=4 -I"../PIC" -I"../common" --peep-asm --peep-return --opt-code-size --allow-unsafe-read --pno-banksel --extended --optimize-cmp --optimize-df --no-crt -Wl-S2 -mpic16 -p18f4550 ${OBJECTFILES} -odist/${CND_CONF}/${IMAGE_TYPE}/controller.X.${IMAGE_TYPE}.${OUTPUT_SUFFIX} 
	@echo Normalizing hex file
	@"C:/Program Files (x86)/Microchip/MPLABX/v3.45/mplab_ide/platform/../mplab_ide/modules/../../bin/hexmate" --edf="C:/Program Files (x86)/Microchip/MPLABX/v3.45/mplab_ide/platform/../mplab_ide/modules/../../dat/en_msgs.txt" dist/${CND_CONF}/${IMAGE_TYPE}/controller.X.${IMAGE_TYPE}.hex -odist/${CND_CONF}/${IMAGE_TYPE}/controller.X.${IMAGE_TYPE}.hex

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
