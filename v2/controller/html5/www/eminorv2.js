var b=!0,h=null,i=!1,j;j||(j=eval("(function() { try { return eminorv2 || {} } catch(e) { return {} } })()"));var k={},l;for(l in j)j.hasOwnProperty(l)&&(k[l]=j[l]);var aa="object"===typeof process&&"function"===typeof require,m="object"===typeof window,q="function"===typeof importScripts,ba=!m&&!aa&&!q;
if(aa){j.print=function(a){process.stdout.write(a+"\n")};j.printErr=function(a){process.stderr.write(a+"\n")};var ca=require("fs"),da=require("path");j.read=function(a,c){var a=da.normalize(a),d=ca.readFileSync(a);!d&&a!=da.resolve(a)&&(a=path.join(__dirname,"..","src",a),d=ca.readFileSync(a));d&&!c&&(d=d.toString());return d};j.readBinary=function(a){return j.read(a,b)};j.load=function(a){ea(read(a))};j.arguments=process.argv.slice(2);module.m=j}else if(ba)j.print=print,"undefined"!=typeof printErr&&
(j.printErr=printErr),j.read="undefined"!=typeof read?read:function(){throw"no read() available (jsc?)";},j.readBinary=function(a){return read(a,"binary")},"undefined"!=typeof scriptArgs?j.arguments=scriptArgs:"undefined"!=typeof arguments&&(j.arguments=arguments),this.eminorv2=j;else if(m||q)j.read=function(a){var c=new XMLHttpRequest;c.open("GET",a,i);c.send(h);return c.responseText},"undefined"!=typeof arguments&&(j.arguments=arguments),m?(j.print=function(a){console.log(a)},j.printErr=function(a){console.log(a)},
this.eminorv2=j):q&&(j.print=function(){},j.load=importScripts);else throw"Unknown runtime environment. Where are we?";function ea(a){eval.call(h,a)}"undefined"==!j.load&&j.read&&(j.load=function(a){ea(j.read(a))});j.print||(j.print=function(){});j.printErr||(j.printErr=j.print);j.arguments||(j.arguments=[]);j.print=j.print;j.a=j.printErr;j.preRun=[];j.postRun=[];for(l in k)k.hasOwnProperty(l)&&(j[l]=k[l]);function r(){return s}function fa(a){s=a}
function ga(a,c,d){d&&d.length?(d.splice||(d=Array.prototype.slice.call(d)),d.splice(0,0,c),j["dynCall_"+a].apply(h,d)):j["dynCall_"+a].call(h,c)}
function ha(){var a=[],c=0;this.d=function(d){d&=255;if(0==a.length){if(0==(d&128))return String.fromCharCode(d);a.push(d);c=192==(d&224)?1:224==(d&240)?2:3;return""}if(c&&(a.push(d),c--,0<c))return"";var d=a[0],e=a[1],f=a[2],g=a[3];2==a.length?d=String.fromCharCode((d&31)<<6|e&63):3==a.length?d=String.fromCharCode((d&15)<<12|(e&63)<<6|f&63):(d=(d&7)<<18|(e&63)<<12|(f&63)<<6|g&63,d=String.fromCharCode(Math.floor((d-65536)/1024)+55296,(d-65536)%1024+56320));a.length=0;return d};this.e=function(a){for(var a=
unescape(encodeURIComponent(a)),c=[],f=0;f<a.length;f++)c.push(a.charCodeAt(f));return c}}function t(a){var c=s;s=s+a|0;s=s+7>>3<<3;return c}function ia(a){var c=u;u=u+a|0;u=u+7>>3<<3;return c}function ja(a){var c=v;v=v+a|0;v=v+7>>3<<3;v>=w&&x("Cannot enlarge memory arrays in asm.js. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value, or (2) set Module.TOTAL_MEMORY before the program runs.");return c}function y(a,c){return Math.ceil(a/(c?c:8))*(c?c:8)}
var ka=4,ma={},z=i,A;function B(a,c){a||x("Assertion failed: "+c)}j.ccall=function(a,c,d,e){return na(oa(a),c,d,e)};function oa(a){try{var c=j["_"+a];c||(c=eval("_"+a))}catch(d){}B(c,"Cannot call unknown function "+a+" (perhaps LLVM optimizations or closure removed it?)");return c}
function na(a,c,d,e){function f(a,c){if("string"==c){if(a===h||void 0===a||0===a)return 0;g||(g=r());var d=t(a.length+1);pa(a,d);return d}return"array"==c?(g||(g=r()),d=t(a.length),qa(a,d),d):a}var g=0,p=0,e=e?e.map(function(a){return f(a,d[p++])}):[];a=a.apply(h,e);"string"==c?c=ra(a):(B("array"!=c),c=a);g&&fa(g);return c}j.cwrap=function(a,c,d){var e=oa(a);return function(){return na(e,c,d,Array.prototype.slice.call(arguments))}};
function sa(a,c,d){d=d||"i8";"*"===d.charAt(d.length-1)&&(d="i32");switch(d){case "i1":C[a]=c;break;case "i8":C[a]=c;break;case "i16":D[a>>1]=c;break;case "i32":E[a>>2]=c;break;case "i64":A=[c>>>0,(tempDouble=c,1<=+Math.abs(tempDouble)?0<tempDouble?(Math.min(+Math.floor(tempDouble/4294967296),4294967295)|0)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)];E[a>>2]=A[0];E[a+4>>2]=A[1];break;case "float":G[a>>2]=c;break;case "double":H[a>>3]=c;break;default:x("invalid type for setValue: "+
d)}}j.setValue=sa;j.getValue=function(a,c){c=c||"i8";"*"===c.charAt(c.length-1)&&(c="i32");switch(c){case "i1":return C[a];case "i8":return C[a];case "i16":return D[a>>1];case "i32":return E[a>>2];case "i64":return E[a>>2];case "float":return G[a>>2];case "double":return H[a>>3];default:x("invalid type for setValue: "+c)}return h};var I=2,J=4;j.ALLOC_NORMAL=0;j.ALLOC_STACK=1;j.ALLOC_STATIC=I;j.ALLOC_DYNAMIC=3;j.ALLOC_NONE=J;
function K(a,c,d,e){var f,g;"number"===typeof a?(f=b,g=a):(f=i,g=a.length);var p="string"===typeof c?c:h,d=d==J?e:[ta,t,ia,ja][void 0===d?I:d](Math.max(g,p?1:c.length));if(f){e=d;B(0==(d&3));for(a=d+(g&-4);e<a;e+=4)E[e>>2]=0;for(a=d+g;e<a;)C[e++|0]=0;return d}if("i8"===p)return a.subarray||a.slice?L.set(a,d):L.set(new Uint8Array(a),d),d;for(var e=0,n,la;e<g;){var F=a[e];"function"===typeof F&&(F=ma.n(F));f=p||c[e];0===f?e++:("i64"==f&&(f="i32"),sa(d+e,F,f),la!==f&&(1==ka?n=1:(n={"%i1":1,"%i8":1,"%i16":2,
"%i32":4,"%i64":8,"%float":4,"%double":8}["%"+f],n||("*"==f.charAt(f.length-1)?n=ka:"i"==f[0]&&(n=parseInt(f.substr(1)),B(0==n%8),n/=8))),la=f),e+=n)}return d}j.allocate=K;function ra(a,c){for(var d=i,e,f=0;;){e=L[a+f|0];if(128<=e)d=b;else if(0==e&&!c)break;f++;if(c&&f==c)break}c||(c=f);var g="";if(!d){for(;0<c;)e=String.fromCharCode.apply(String,L.subarray(a,a+Math.min(c,1024))),g=g?g+e:e,a+=1024,c-=1024;return g}d=new ha;for(f=0;f<c;f++)e=L[a+f|0],g+=d.d(e);return g}j.Pointer_stringify=ra;
var C,L,D,ua,E,va,G,H,wa=0,u=0,xa=0,s=0,M=0,ya=0,v=0,w=j.TOTAL_MEMORY||2048;B(!!Int32Array&&!!Float64Array&&!!(new Int32Array(1)).subarray&&!!(new Int32Array(1)).set,"Cannot fallback to non-typed array case: Code is too specialized");var N=new ArrayBuffer(w);C=new Int8Array(N);D=new Int16Array(N);E=new Int32Array(N);L=new Uint8Array(N);ua=new Uint16Array(N);va=new Uint32Array(N);G=new Float32Array(N);H=new Float64Array(N);E[0]=255;B(255===L[0]&&0===L[3],"Typed arrays 2 must be run on a little-endian system");
j.HEAP=void 0;j.HEAP8=C;j.HEAP16=D;j.HEAP32=E;j.HEAPU8=L;j.HEAPU16=ua;j.HEAPU32=va;j.HEAPF32=G;j.HEAPF64=H;function O(a){for(;0<a.length;){var c=a.shift();if("function"==typeof c)c();else{var d=c.c;"number"===typeof d?void 0===c.b?ga("v",d):ga("vi",d,[c.b]):d(void 0===c.b?h:c.b)}}}var P=[],Q=[],za=[],Aa=[],Ba=[],R=i;function Ca(a){P.unshift(a)}j.addOnPreRun=j.j=Ca;j.addOnInit=j.g=function(a){Q.unshift(a)};j.addOnPreMain=j.i=function(a){za.unshift(a)};j.addOnExit=j.f=function(a){Aa.unshift(a)};
function Da(a){Ba.unshift(a)}j.addOnPostRun=j.h=Da;function S(a,c,d){a=(new ha).e(a);d&&(a.length=d);c||a.push(0);return a}j.intArrayFromString=S;j.intArrayToString=function(a){for(var c=[],d=0;d<a.length;d++){var e=a[d];255<e&&(e&=255);c.push(String.fromCharCode(e))}return c.join("")};function pa(a,c,d){a=S(a,d);for(d=0;d<a.length;)C[c+d|0]=a[d],d+=1}j.writeStringToMemory=pa;function qa(a,c){for(var d=0;d<a.length;d++)C[c+d|0]=a[d]}j.writeArrayToMemory=qa;
Math.imul||(Math.imul=function(a,c){var d=a&65535,e=c&65535;return d*e+((a>>>16)*e+d*(c>>>16)<<16)|0});Math.o=Math.imul;var T=0,U={},Ea=i,V=h;j.addRunDependency=function(a){T++;j.monitorRunDependencies&&j.monitorRunDependencies(T);a?(B(!U[a]),U[a]=1):j.a("warning: run dependency added without ID")};
j.removeRunDependency=function(a){T--;j.monitorRunDependencies&&j.monitorRunDependencies(T);a?(B(U[a]),delete U[a]):j.a("warning: run dependency removed without ID");0==T&&(V!==h&&(clearInterval(V),V=h),!Ea&&W&&X())};j.preloadedImages={};j.preloadedAudios={};wa=8;u=wa+56;Q.push({c:function(){Fa()}});K([84,85,86,87,88,89,0,0],"i8",J,8);var Ga=y(K(12,"i8",I),8);B(0==Ga%8);j._memcpy=Ha;j._memset=Ia;function ta(a){return ja(a+8)+8&4294967288}j._strlen=Ja;xa=s=y(u);M=xa+192;ya=v=y(M);B(ya<w);var Ka=Math.min;
var Y=(function(global,env,buffer) {
// EMSCRIPTEN_START_ASM
"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.STACKTOP|0;var j=env.STACK_MAX|0;var k=env.tempDoublePtr|0;var l=env.ABORT|0;var m=+env.NaN;var n=+env.Infinity;var o=0;var p=0;var q=0;var r=0;var s=0,t=0,u=0,v=0,w=0.0,x=0,y=0,z=0,A=0.0;var B=0;var C=0;var D=0;var E=0;var F=0;var G=0;var H=0;var I=0;var J=0;var K=0;var L=global.Math.floor;var M=global.Math.abs;var N=global.Math.sqrt;var O=global.Math.pow;var P=global.Math.cos;var Q=global.Math.sin;var R=global.Math.tan;var S=global.Math.acos;var T=global.Math.asin;var U=global.Math.atan;var V=global.Math.atan2;var W=global.Math.exp;var X=global.Math.log;var Y=global.Math.ceil;var Z=global.Math.imul;var _=env.abort;var $=env.assert;var aa=env.asmPrintInt;var ab=env.asmPrintFloat;var ac=env.min;var ad=env.invoke_ii;var ae=env.invoke_v;var af=env.invoke_iii;var ag=env.invoke_vi;var ah=env._malloc;var ai=env._free;
// EMSCRIPTEN_START_FUNCS
function an(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+7>>3<<3;return b|0}function ao(){return i|0}function ap(a){a=a|0;i=a}function aq(a,b){a=a|0;b=b|0;if((o|0)==0){o=a;p=b}}function ar(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0]}function as(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0];a[k+4|0]=a[b+4|0];a[k+5|0]=a[b+5|0];a[k+6|0]=a[b+6|0];a[k+7|0]=a[b+7|0]}function at(a){a=a|0;B=a}function au(a){a=a|0;C=a}function av(a){a=a|0;D=a}function aw(a){a=a|0;E=a}function ax(a){a=a|0;F=a}function ay(a){a=a|0;G=a}function az(a){a=a|0;H=a}function aA(a){a=a|0;I=a}function aB(a){a=a|0;J=a}function aC(a){a=a|0;K=a}function aD(){}function aE(){return}function aF(a){a=a|0;var c=0;if((b[16]&a)<<16>>16!=a<<16>>16){c=0;return c|0}c=(b[12]&a)<<16>>16==0|0;return c|0}function aG(){a[40]=0;a[48]=0;a[56]=0;aH(0);aI(0);return}function aH(b){b=b|0;_midi_send_cmd1(12,0,b);b=a[40]&-64;a[40]=b;_led_set(b,a[48]|0);return}function aI(b){b=b|0;var c=0;_midi_send_cmd1(12,1,b+4&255);a[40]=a[40]&-64;c=(a[48]&192|1<<(b&255))&255;a[48]=c;_led_set(a[40]|0,c);return}function aJ(){var c=0,d=0;b[16]=_fsw_poll()|0;if((aF(1)|0)<<24>>24!=0){aK(0)}if((aF(2)|0)<<24>>24!=0){aK(1)}if((aF(4)|0)<<24>>24!=0){aK(2)}if((aF(8)|0)<<24>>24!=0){aK(3)}if((aF(16)|0)<<24>>24!=0){aK(4)}if((aF(32)|0)<<24>>24!=0){aK(5)}if((aF(256)|0)<<24>>24!=0){aI(0);aH(a[56]|0);aL()}if((aF(512)|0)<<24>>24!=0){aI(1);aH(a[56]|0);aL()}if((aF(1024)|0)<<24>>24!=0){aI(2);aH(a[56]|0);aL()}if((aF(2048)|0)<<24>>24!=0){aI(3);aH(a[56]|0);aL()}if((aF(4096)|0)<<24>>24!=0){aI(4);aH(a[56]|0);aL()}if((aF(8192)|0)<<24>>24!=0){aI(5);aH(a[56]|0);aL()}if((aF(64)|0)<<24>>24!=0){c=a[40]^64;a[40]=c;aM(81,(c&64)!=0?127:0);_led_set(a[40]|0,a[48]|0)}if((aF(16384)|0)<<24>>24!=0){c=a[16]&127^127;a[16]=c;aM(80,c)}if((aF(128)|0)<<24>>24!=0){c=a[56]|0;if(c<<24>>24!=0){a[56]=c-1&255}aH(a[56]|0)}if((aF(-32768)|0)<<24>>24==0){d=b[16]|0;b[12]=d;return}c=a[56]|0;if(c<<24>>24!=127){a[56]=c+1&255}aH(a[56]|0);d=b[16]|0;b[12]=d;return}function aK(b){b=b|0;var c=0,e=0;c=b&255;b=1<<c;e=((d[40]|0)^b)&255;a[40]=e;_led_set(e,a[48]|0);aM(a[8+c|0]|0,(b&(d[40]|0)|0)==0?0:127);return}function aL(){var b=0;b=a[40]|0;if((b&64)==0){return}a[40]=b&-65;aM(81,0);_led_set(a[40]|0,a[48]|0);return}function aM(a,b){a=a|0;b=b|0;_midi_send_cmd2(11,0,a,b);return}function aN(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;f=b|0;if((b&3)==(d&3)){while(b&3){if((e|0)==0)return f|0;a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function aO(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=b+e|0;if((e|0)>=20){d=d&255;e=b&3;g=d|d<<8|d<<16|d<<24;h=f&~3;if(e){e=b+4-e|0;while((b|0)<(e|0)){a[b]=d;b=b+1|0}}while((b|0)<(h|0)){c[b>>2]=g;b=b+4|0}}while((b|0)<(f|0)){a[b]=d;b=b+1|0}}function aP(b){b=b|0;var c=0;c=b;while(a[c]|0){c=c+1|0}return c-b|0}function aQ(a,b){a=a|0;b=b|0;return aj[a&1](b|0)|0}function aR(a){a=a|0;ak[a&1]()}function aS(a,b,c){a=a|0;b=b|0;c=c|0;return al[a&1](b|0,c|0)|0}function aT(a,b){a=a|0;b=b|0;am[a&1](b|0)}function aU(a){a=a|0;_(0);return 0}function aV(){_(1)}function aW(a,b){a=a|0;b=b|0;_(2);return 0}function aX(a){a=a|0;_(3)}
// EMSCRIPTEN_END_FUNCS
var aj=[aU,aU];var ak=[aV,aV];var al=[aW,aW];var am=[aX,aX];return{_strlen:aP,_controller_handle:aJ,_controller_init:aG,_memset:aO,_memcpy:aN,_controller_10msec_timer:aE,runPostSets:aD,stackAlloc:an,stackSave:ao,stackRestore:ap,setThrew:aq,setTempRet0:at,setTempRet1:au,setTempRet2:av,setTempRet3:aw,setTempRet4:ax,setTempRet5:ay,setTempRet6:az,setTempRet7:aA,setTempRet8:aB,setTempRet9:aC,dynCall_ii:aQ,dynCall_v:aR,dynCall_iii:aS,dynCall_vi:aT}
// EMSCRIPTEN_END_ASM
})({Math:Math,Int8Array:Int8Array,Int16Array:Int16Array,Int32Array:Int32Array,Uint8Array:Uint8Array,Uint16Array:Uint16Array,Uint32Array:Uint32Array,Float32Array:Float32Array,Float64Array:Float64Array},{abort:x,assert:B,asmPrintInt:function(a,c){j.print("int "+a+","+c)},asmPrintFloat:function(a,c){j.print("float "+a+","+c)},min:Ka,invoke_ii:function(a,c){try{return j.dynCall_ii(a,c)}catch(d){if("number"!==typeof d&&"longjmp"!==d)throw d;Y.setThrew(1,0)}},invoke_v:function(a){try{j.dynCall_v(a)}catch(c){if("number"!==
typeof c&&"longjmp"!==c)throw c;Y.setThrew(1,0)}},invoke_iii:function(a,c,d){try{return j.dynCall_iii(a,c,d)}catch(e){if("number"!==typeof e&&"longjmp"!==e)throw e;Y.setThrew(1,0)}},invoke_vi:function(a,c){try{j.dynCall_vi(a,c)}catch(d){if("number"!==typeof d&&"longjmp"!==d)throw d;Y.setThrew(1,0)}},_malloc:ta,_free:function(){},STACKTOP:s,STACK_MAX:M,tempDoublePtr:Ga,ABORT:z,NaN:NaN,Infinity:Infinity},N),Ja=j._strlen=Y._strlen;j._controller_handle=Y._controller_handle;j._controller_init=Y._controller_init;
var Ia=j._memset=Y._memset,Ha=j._memcpy=Y._memcpy;j._controller_10msec_timer=Y._controller_10msec_timer;var Fa=j.runPostSets=Y.runPostSets;j.dynCall_ii=Y.dynCall_ii;j.dynCall_v=Y.dynCall_v;j.dynCall_iii=Y.dynCall_iii;j.dynCall_vi=Y.dynCall_vi;t=function(a){return Y.stackAlloc(a)};r=function(){return Y.stackSave()};fa=function(a){Y.stackRestore(a)};function Z(a){this.name="ExitStatus";this.message="Program terminated with exit("+a+")";this.status=a}Z.prototype=Error();var La,$=h;
j.callMain=j.k=function(a){function c(){for(var a=0;3>a;a++)e.push(0)}B(0==T,"cannot call main when async dependencies remain! (listen on __ATMAIN__)");B(0==P.length,"cannot call main when preRun functions remain to be called");a=a||[];m&&$!==h&&j.a("preload time: "+(Date.now()-$)+" ms");R||(R=b,O(Q));var d=a.length+1,e=[K(S("/bin/this.program"),"i8",0)];c();for(var f=0;f<d-1;f+=1)e.push(K(S(a[f]),"i8",0)),c();e.push(0);e=K(e,"i32",0);La=s;try{var g=j._main(d,e,0);j.noExitRuntime||Ma(g)}catch(p){if(!(p instanceof
Z))if("SimulateInfiniteLoop"==p)j.noExitRuntime=b;else throw p;}};
function X(a){function c(){R||(R=b,O(Q));O(za);Ea=b;j._main&&W&&j.callMain(a);if(j.postRun)for("function"==typeof j.postRun&&(j.postRun=[j.postRun]);j.postRun.length;)Da(j.postRun.shift());O(Ba)}a=a||j.arguments;$===h&&($=Date.now());if(0<T)j.a("run() called, but dependencies remain, so not running");else{if(j.preRun)for("function"==typeof j.preRun&&(j.preRun=[j.preRun]);j.preRun.length;)Ca(j.preRun.shift());O(P);0<T||(j.setStatus?(j.setStatus("Running..."),setTimeout(function(){setTimeout(function(){j.setStatus("")},
1);z||c()},1)):c())}}j.run=j.p=X;function Ma(a){z=b;s=La;O(Aa);throw new Z(a);}j.exit=j.l=Ma;function x(a){a&&(j.print(a),j.a(a));z=b;throw"abort() at "+Error().stack;}j.abort=j.abort=x;if(j.preInit)for("function"==typeof j.preInit&&(j.preInit=[j.preInit]);0<j.preInit.length;)j.preInit.pop()();var W=b;j.noInitialRun&&(W=i);X();