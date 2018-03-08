all: eminorv2.gen.js www/all.min.js www/all.js

debug: eminorv2.gen.js www/all.js

eminorv2.gen.js: hardware.c ../common/controller-v5.c ../common/controller-v5-rom1.c ../common/util.c ../common/util.h ../common/types.h ../common/hardware.h ../common/v5_fx_names.h Makefile
	emcc -DHWFEAT_LABEL_UPDATES -DHW_VERSION=5 hardware.c ../common/controller-v5.c ../common/controller-v5-rom1.c ../common/util.c -o eminorv2.gen.js -s EXPORT_NAME="'eminorv2'" -s EXPORTED_FUNCTIONS="['_controller_init','_controller_10msec_timer','_controller_handle']" -s DEFAULT_LIBRARY_FUNCS_TO_INCLUDE="['memcpy','memset','malloc','free','strlen','$Browser']" -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["UTF8ToString","getValue"]'  -s LINKABLE="1"

www/all.min.js: es5.js web.js typedarray.js storage.js console.js rainbow.js c.js generic.js eminorv2.gen.js driver.js Makefile
	java -jar compiler.jar --jscomp_off suspiciousCode --jscomp_off uselessCode --language_in ECMASCRIPT5 --js es5.js web.js typedarray.js storage.js console.js rainbow.js c.js generic.js eminorv2.gen.js driver.js --js_output_file www/all.min.js

www/all.js: es5.js web.js typedarray.js storage.js console.js rainbow.js c.js generic.js eminorv2.gen.js driver.js Makefile
	cat es5.js web.js typedarray.js storage.js console.js rainbow.js c.js generic.js eminorv2.gen.js driver.js > www/all.js

reload: debug
	# echo 'tell application "Google Chrome" to reload active tab of window 1' | osascript
