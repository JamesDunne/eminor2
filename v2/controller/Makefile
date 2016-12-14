#--mplab-comp 
sdcc_opts = -DHW_VERSION=4 -Icommon -IPIC "-IC:\Program Files\SDCC\include" "-IC:\Program Files\SDCC\include\pic16" "-IC:\Program Files\SDCC\non-free\include\pic16" --use-non-free -mpic16 -p18f4550 --opt-code-size --obanksel=2 --pno-banksel --optimize-cmp --optimize-df

srcs = PIC/main.c PIC/comm_lcd.c PIC/init.c PIC/intslct.c PIC/ram_def.c PIC/systick.c PIC/UserAppCode.c PIC/writeprogmem.c PIC/comm_midi.c PIC/hwcalls.c common/controller-axe.c
objs = $(patsubst %.c,build/%.o,$(srcs))

build/controller.hex: $(objs) depend
	sdcc $(sdcc_opts) --no-crt -Wl-S2 -Wl-c -Wl-m -o build/controller.hex $(objs)
	#mplink PIC/18f4550.lkr $(objs) p18f4550.lib -p18f4550 -lC:\mplabc18\v3.46\lib -mcontroller.map -ocontroller.hex

build/%.o: %.c
	mkdir -p build/$(dir $<)
	sdcc $(sdcc_opts) -c $< -o build/$(<:.c=.o)

clean:
	rm -f $(objs)

depend: Makefile.dep

Makefile.dep: $(srcs)
	rm -f Makefile.dep
	for i in $(srcs); do \
	  sdcc -M $(sdcc_opts) $$i >$${i}.dep; \
	  cat $${i}.dep >>Makefile.dep; \
	  rm $${i}.dep; \
	done

include Makefile.dep
