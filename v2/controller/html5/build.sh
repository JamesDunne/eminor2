#!/bin/bash
# Removed '$Browser' from default DEFAULT_LIBRARY_FUNCS_TO_INCLUDE in src/settings.js to reduce size by ~100KB.
echo Building eminorv2.js
emcc hardware.c ../common/controller-simple.c -o eminorv2.gen.js -s TOTAL_STACK="192" -s TOTAL_MEMORY="2048" -s FAST_MEMORY="2048" -s EXPORT_NAME="'eminorv2'" -s EXPORTED_FUNCTIONS="['_controller_init','_controller_10msec_timer','_controller_handle']" -s DEFAULT_LIBRARY_FUNCS_TO_INCLUDE="['memcpy','memset','malloc','free','strlen','$Browser']" -s LINKABLE="1" -s ASSERTIONS="1" --closure 1

echo Compiling all javascript into all.min.js
java -jar compiler.jar --jscomp_off suspiciousCode --jscomp_off uselessCode --language_in ECMASCRIPT5 --js es5.js web.js typedarray.js storage.js console.js rainbow.js c.js generic.js eminorv2.gen.js driver.js --js_output_file www/all.min.js
#mv eminorv2.js.mem ..

echo Complete!
