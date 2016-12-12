sdcc_opts = -DHW_VERSION=4 --use-non-free -mpic16 -p18f4550 --opt-code-size --obanksel=2 --pno-banksel --optimize-cmp --optimize-df

controller-axe.o: common/controller-axe.c common/hardware.h PIC/flash_v4_bank0.h PIC/flash_v4_bank1.h PIC/flash_v4_bank2.h PIC/v4_lookup.h Makefile
	sdcc $(sdcc_opts) -c common/controller-axe.c
