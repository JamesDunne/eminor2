sdcc_opts = -DHW_VERSION=4 -Icommon -IPIC --use-non-free -mpic16 -p18f4550 --opt-code-size --obanksel=2 --pno-banksel --optimize-cmp --optimize-df

srcs = PIC/main.c common/controller-axe.c PIC/hwcalls.c PIC/comm_midi.c PIC/comm_lcd.c PIC/init.c PIC/intslct.c PIC/ram_def.c PIC/startup.c PIC/systick.c PIC/UserAppCode.c PIC/writeprogmem.c
objs = $(patsubst %.c,%.o,$(srcs))

controller.hex: $(objs) depend
	#gplink -m -s PIC/18f4550.lkr -o controller.hex $(objs) libsdcc.lib
	gplink -m -s PIC/18f4550.lkr -o controller.hex $(objs)

%.o: %.c
	sdcc $(sdcc_opts) -c $<

depend: Makefile.dep

Makefile.dep: $(srcs)
	rm -f Makefile.dep
	for i in $(srcs); do \
	  sdcc -M $(sdcc_opts) $$i >$${i}.dep; \
	  cat $${i}.dep >>Makefile.dep; \
	  rm $${i}.dep; \
	done

include Makefile.dep
