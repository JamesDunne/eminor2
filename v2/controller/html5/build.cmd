@echo off

rem Removed '$Browser' from default DEFAULT_LIBRARY_FUNCS_TO_INCLUDE in src/settings.js to reduce size by ~100KB.
echo Building eminorv2.js
call emcc -DHWFEAT_LABEL_UPDATES -DHW_VERSION=4 hardware.c ../common/controller-axe.c -o eminorv2.gen.js -s EXPORT_NAME="'eminorv2'" -s EXPORTED_FUNCTIONS="['_controller_init','_controller_10msec_timer','_controller_handle']" -s DEFAULT_LIBRARY_FUNCS_TO_INCLUDE="['memcpy','memset','malloc','free','strlen','$Browser']" -s LINKABLE="1"

echo Compiling all javascript into all.min.js
java -jar compiler.jar --jscomp_off suspiciousCode --jscomp_off uselessCode --language_in ECMASCRIPT5 --js es5.js web.js typedarray.js storage.js console.js rainbow.js c.js generic.js eminorv2.gen.js driver.js --js_output_file www\all.min.js

echo Complete!
