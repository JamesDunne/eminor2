#!/bin/bash
echo Building eminorv2.js...
emcc.bat -DHW_VERSION=1 hardware.c ../common/controller-one.c ../common/controller-two.c -o eminorv2.gen.js -s TOTAL_STACK="192" -s TOTAL_MEMORY="2048" -s EXPORTED_FUNCTIONS="['_controller_init','_controller_10msec_timer','_controller_handle']" -s DEFAULT_LIBRARY_FUNCS_TO_INCLUDE="['memcpy','memset','malloc','free','strlen','$Browser']" -s LINKABLE="1"

echo Compiling all javascript into all.min.js
java -jar compiler.jar --jscomp_off suspiciousCode --jscomp_off uselessCode --language_in ECMASCRIPT5 --js es5.js web.js typedarray.js storage.js console.js rainbow.js c.js generic.js eminorv2.gen.js driver.js --js_output_file www/all.min.js
#mv eminorv2.js.mem ..

echo Complete!
