all: eminorv2.gen.js www/all.min.js

debug: eminorv2.gen.js www/all.js

eminorv2.gen.js: hardware.c ../common/controller-simple.c
	emcc hardware.c ../common/controller-simple.c -o eminorv2.gen.js -s TOTAL_STACK="192" -s TOTAL_MEMORY="2048" -s FAST_MEMORY="2048" -s EXPORT_NAME="'eminorv2'" -s EXPORTED_FUNCTIONS="['_controller_init','_controller_10msec_timer','_controller_handle']" -s DEFAULT_LIBRARY_FUNCS_TO_INCLUDE="['memcpy','memset','malloc','free','strlen','$Browser']" -s LINKABLE="1"

www/all.min.js: es5.js web.js typedarray.js storage.js console.js rainbow.js c.js generic.js eminorv2.gen.js driver.js
	java -jar compiler.jar --jscomp_off suspiciousCode --jscomp_off uselessCode --language_in ECMASCRIPT5 --js es5.js web.js typedarray.js storage.js console.js rainbow.js c.js generic.js eminorv2.gen.js driver.js --js_output_file www/all.min.js

www/all.js: es5.js web.js typedarray.js storage.js console.js rainbow.js c.js generic.js eminorv2.gen.js driver.js
	cat es5.js web.js typedarray.js storage.js console.js rainbow.js c.js generic.js eminorv2.gen.js driver.js > www/all.js
