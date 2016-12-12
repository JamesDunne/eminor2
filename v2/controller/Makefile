sdcc_opts = -DHW_VERSION=4 -Icommon -IPIC --use-non-free -mpic16 -p18f4550 --opt-code-size --obanksel=2 --pno-banksel --optimize-cmp --optimize-df
deps = common/hardware.h PIC/flash_v4_bank0.h PIC/flash_v4_bank1.h PIC/flash_v4_bank2.h PIC/v4_lookup.h Makefile
objs = main.o hwcalls.o controller-axe.o

controller.hex: $(objs)
	#gplink -m -s PIC/18f4550.lkr -o controller.hex $(objs) libsdcc.lib
	gplink -m -s PIC/18f4550.lkr -o controller.hex $(objs)

main.o: PIC/main.c $(deps)
	sdcc $(sdcc_opts) -c PIC/main.c

controller-axe.o: common/controller-axe.c $(deps)
	sdcc $(sdcc_opts) -c common/controller-axe.c

hwcalls.o: PIC/hwcalls.c $(deps)
	sdcc $(sdcc_opts) -c PIC/hwcalls.c
