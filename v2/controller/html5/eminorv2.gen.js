// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof eminorv2 !== 'undefined' ? eminorv2 : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (process['argv'].length > 1) {
    Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
  } else {
    Module['thisProgram'] = 'unknown-program';
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  this['eminorv2'] = Module;

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WEB) {
    window['eminorv2'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      assert(args.length == sig.length-1);
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      assert(sig.length == 1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    var source = Pointer_stringify(code);
    if (source[0] === '"') {
      // tolerate EM_ASM("..code..") even though EM_ASM(..code..) is correct
      if (source.indexOf('"', 1) === source.length-1) {
        source = source.substr(1, source.length-2);
      } else {
        // something invalid happened, e.g. EM_ASM("..code($0)..", input)
        abort('invalid EM_ASM input |' + source + '|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)');
      }
    }
    try {
      // Module is the only 'upvar', which we provide directly. We also provide FS for legacy support.
      var evalled = eval('(function(Module, FS) { return function(' + args.join(',') + '){ ' + source + ' } })')(Module, typeof FS !== 'undefined' ? FS : null);
    } catch(e) {
      Module.printErr('error in executing inline EM_ASM code: ' + e + ' on: \n\n' + source + '\n\nwith args |' + args + '| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)');
      throw e;
    }
    return Runtime.asmConstCache[code] = evalled;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;

      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }

      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }

      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          (((codePoint - 0x10000) / 0x400)|0) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function processJSString(string) {
      /* TODO: use TextEncoder when present,
        var encoder = new TextEncoder();
        encoder['encoding'] = "utf-8";
        var utf8Array = encoder['encode'](aMsg.data);
      */
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;









//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) Runtime.stackRestore(stack);
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["cwrap"] = cwrap;
Module["ccall"] = ccall;


function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }

  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;


function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0;
}
Module['stringToUTF16'] = stringToUTF16;


function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;


function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit;
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0;
}
Module['stringToUTF32'] = stringToUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module['stackTrace'] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 192;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 2048;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2048;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))>>0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[(((buffer)+(i))>>0)]=str.charCodeAt(i);
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))>>0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;

// === Body ===





STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 6592;
  /* global initializers */ __ATINIT__.push();
  

/* memory initializer */ allocate([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,0,0,0,0,80,114,111,103,114,97,109,58,32,32,32,32,32,32,32,32,32,32,32,32,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,112,32,60,32,54,0,0,0,46,46,47,99,111,109,109,111,110,47,99,111,110,116,114,111,108,108,101,114,45,115,105,109,112,108,101,46,99,0,0,0,115,101,116,95,114,106,109,95,99,104,97,110,110,101,108,0,105,100,120,32,60,32,54,0,103,109,97,106,95,116,111,103,103,108,101,95,99,99,0,0,32,45,45,32,80,114,111,103,114,97,109,109,105,110,103,32,45,45,32,32,0,0,0,0,80,69,78,68,73,78,71,32,32,32,32,32,32,32,32,32,32,32,32,32,0,0,0,0,80,114,111,103,114,97,109,32,109,111,100,101,32,32,32,32,32,32,32,32,0,0,0,0,32,48,41,32,50,48,49,52,45,48,49,45,48,49,32,32,32,35,32,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,109,97,120,32,115,121,115,116,101,109,32,98,121,116,101,115,32,61,32,37,49,48,108,117,10,0,0,0,0,0,0,0,115,121,115,116,101,109,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0,0,0,0,0,0,0,105,110,32,117,115,101,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,1,2,3,4,5,6,7,8,9,255,255,255,255,255,255,255,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,255,255,255,255,255,255,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,0,0,0,0,1,2,4,7,3,6,5,0,0,0,0,0,0,0,0,105,110,102,105,110,105,116,121,0,0,0,0,0,0,0,0,110,97,110,0,0,0,0,0,95,112,137,0,255,9,47,15,10,0,0,0,100,0,0,0,232,3,0,0,16,39,0,0,160,134,1,0,64,66,15,0,128,150,152,0,0,225,245,5,93,61,127,102,158,160,230,63,0,0,0,0,0,136,57,61,68,23,117,250,82,176,230,63,0,0,0,0,0,0,216,60,254,217,11,117,18,192,230,63,0,0,0,0,0,120,40,189,191,118,212,221,220,207,230,63,0,0,0,0,0,192,30,61,41,26,101,60,178,223,230,63,0,0,0,0,0,0,216,188,227,58,89,152,146,239,230,63,0,0,0,0,0,0,188,188,134,147,81,249,125,255,230,63,0,0,0,0,0,216,47,189,163,45,244,102,116,15,231,63,0,0,0,0,0,136,44,189,195,95,236,232,117,31,231,63,0,0,0,0,0,192,19,61,5,207,234,134,130,47,231,63,0,0,0,0,0,48,56,189,82,129,165,72,154,63,231,63,0,0,0,0,0,192,0,189,252,204,215,53,189,79,231,63,0,0,0,0,0,136,47,61,241,103,66,86,235,95,231,63,0,0,0,0,0,224,3,61,72,109,171,177,36,112,231,63,0,0,0,0,0,208,39,189,56,93,222,79,105,128,231,63,0,0,0,0,0,0,221,188,0,29,172,56,185,144,231,63,0,0,0,0,0,0,227,60,120,1,235,115,20,161,231,63,0,0,0,0,0,0,237,188,96,208,118,9,123,177,231,63,0,0,0,0,0,64,32,61,51,193,48,1,237,193,231,63,0,0,0,0,0,0,160,60,54,134,255,98,106,210,231,63,0,0,0,0,0,144,38,189,59,78,207,54,243,226,231,63,0,0,0,0,0,224,2,189,232,195,145,132,135,243,231,63,0,0,0,0,0,88,36,189,78,27,62,84,39,4,232,63,0,0,0,0,0,0,51,61,26,7,209,173,210,20,232,63,0,0,0,0,0,0,15,61,126,205,76,153,137,37,232,63,0,0,0,0,0,192,33,189,208,66,185,30,76,54,232,63,0,0,0,0,0,208,41,61,181,202,35,70,26,71,232,63,0,0,0,0,0,16,71,61,188,91,159,23,244,87,232,63,0,0,0,0,0,96,34,61,175,145,68,155,217,104,232,63,0,0,0,0,0,196,50,189,149,163,49,217,202,121,232,63,0,0,0,0,0,0,35,189,184,101,138,217,199,138,232,63,0,0,0,0,0,128,42,189,0,88,120,164,208,155,232,63,0,0,0,0,0,0,237,188,35,162,42,66,229,172,232,63,0,0,0,0,0,40,51,61,250,25,214,186,5,190,232,63,0,0,0,0,0,180,66,61,131,67,181,22,50,207,232,63,0,0,0,0,0,208,46,189,76,102,8,94,106,224,232,63,0,0,0,0,0,80,32,189,7,120,21,153,174,241,232,63,0,0,0,0,0,40,40,61,14,44,40,208,254,2,233,63,0,0,0,0,0,176,28,189,150,255,145,11,91,20,233,63,0,0,0,0,0,224,5,189,249,47,170,83,195,37,233,63,0,0,0,0,0,64,245,60,74,198,205,176,55,55,233,63,0,0,0,0,0,32,23,61,174,152,95,43,184,72,233,63,0,0,0,0,0,0,9,189,203,82,200,203,68,90,233,63,0,0,0,0,0,104,37,61,33,111,118,154,221,107,233,63,0,0,0,0,0,208,54,189,42,78,222,159,130,125,233,63,0,0,0,0,0,0,1,189,163,35,122,228,51,143,233,63,0,0,0,0,0,0,45,61,4,6,202,112,241,160,233,63,0,0,0,0,0,164,56,189,137,255,83,77,187,178,233,63,0,0,0,0,0,92,53,61,91,241,163,130,145,196,233,63,0,0,0,0,0,184,38,61,197,184,75,25,116,214,233,63,0,0,0,0,0,0,236,188,142,35,227,25,99,232,233,63,0,0,0,0,0,208,23,61,2,243,7,141,94,250,233,63,0,0,0,0,0,64,22,61,77,229,93,123,102,12,234,63,0,0,0,0,0,0,245,188,246,184,142,237,122,30,234,63,0,0,0,0,0,224,9,61,39,46,74,236,155,48,234,63,0,0,0,0,0,216,42,61,93,10,70,128,201,66,234,63,0,0,0,0,0,240,26,189,155,37,62,178,3,85,234,63,0,0,0,0,0,96,11,61,19,98,244,138,74,103,234,63,0,0,0,0,0,136,56,61,167,179,48,19,158,121,234,63,0,0,0,0,0,32,17,61,141,46,193,83,254,139,234,63,0,0,0,0,0,192,6,61,210,252,121,85,107,158,234,63,0,0,0,0,0,184,41,189,184,111,53,33,229,176,234,63,0,0,0,0,0,112,43,61,129,243,211,191,107,195,234,63,0,0,0,0,0,0,217,60,128,39,60,58,255,213,234,63,0,0,0,0,0,0,228,60,163,210,90,153,159,232,234,63,0,0,0,0,0,144,44,189,103,243,34,230,76,251,234,63,0,0,0,0,0,80,22,61,144,183,141,41,7,14,235,63,0,0,0,0,0,212,47,61,169,137,154,108,206,32,235,63,0,0,0,0,0,112,18,61,75,26,79,184,162,51,235,63,0,0,0,0,0,71,77,61,231,71,183,21,132,70,235,63,0,0,0,0,0,56,56,189,58,89,229,141,114,89,235,63,0,0,0,0,0,0,152,60,106,197,241,41,110,108,235,63,0,0,0,0,0,208,10,61,80,94,251,242,118,127,235,63,0,0,0,0,0,128,222,60,178,73,39,242,140,146,235,63,0,0,0,0,0,192,4,189,3,6,161,48,176,165,235,63,0,0,0,0,0,112,13,189,102,111,154,183,224,184,235,63,0,0,0,0,0,144,13,61,255,193,75,144,30,204,235,63,0,0,0,0,0,160,2,61,111,161,243,195,105,223,235,63,0,0,0,0,0,120,31,189,184,29,215,91,194,242,235,63,0,0,0,0,0,160,16,189,233,178,65,97,40,6,236,63,0,0,0,0,0,64,17,189,224,82,133,221,155,25,236,63,0,0,0,0,0,224,11,61,238,100,250,217,28,45,236,63,0,0,0,0,0,64,9,189,47,208,255,95,171,64,236,63,0,0,0,0,0,208,14,189,21,253,250,120,71,84,236,63,0,0,0,0,0,102,57,61,203,208,87,46,241,103,236,63,0,0,0,0,0,16,26,189,182,193,136,137,168,123,236,63,0,0,0,0,128,69,88,189,51,231,6,148,109,143,236,63,0,0,0,0,0,72,26,189,223,196,81,87,64,163,236,63,0,0,0,0,0,0,203,60,148,144,239,220,32,183,236,63,0,0,0,0,0,64,1,61,137,22,109,46,15,203,236,63,0,0,0,0,0,32,240,60,18,196,93,85,11,223,236,63,0,0,0,0,0,96,243,60,59,171,91,91,21,243,236,63,0,0,0,0,0,144,6,189,188,137,7,74,45,7,237,63,0,0,0,0,0,160,9,61,250,200,8,43,83,27,237,63,0,0,0,0,0,224,21,189,133,138,13,8,135,47,237,63,0,0,0,0,0,40,29,61,3,162,202,234,200,67,237,63,0,0,0,0,0,160,1,61,145,164,251,220,24,88,237,63,0,0,0,0,0,0,223,60,161,230,98,232,118,108,237,63,0,0,0,0,0,160,3,189,78,131,201,22,227,128,237,63,0,0,0,0,0,216,12,189,144,96,255,113,93,149,237,63,0,0,0,0,0,192,244,60,174,50,219,3,230,169,237,63,0,0,0,0,0,144,255,60,37,131,58,214,124,190,237,63,0,0,0,0,0,128,233,60,69,180,1,243,33,211,237,63,0,0,0,0,0,32,245,188,191,5,28,100,213,231,237,63,0,0,0,0,0,112,29,189,236,154,123,51,151,252,237,63,0,0,0,0,0,20,22,189,94,125,25,107,103,17,238,63,0,0,0,0,0,72,11,61,231,163,245,20,70,38,238,63,0,0,0,0,0,206,64,61,92,238,22,59,51,59,238,63,0,0,0,0,0,104,12,61,180,63,139,231,46,80,238,63,0,0,0,0,0,48,9,189,104,109,103,36,57,101,238,63,0,0,0,0,0,0,229,188,68,76,199,251,81,122,238,63,0,0,0,0,0,248,7,189,38,183,205,119,121,143,238,63,0,0,0,0,0,112,243,188,232,144,164,162,175,164,238,63,0,0,0,0,0,208,229,60,228,202,124,134,244,185,238,63,0,0,0,0,0,26,22,61,13,104,142,45,72,207,238,63,0,0,0,0,0,80,245,60,20,133,24,162,170,228,238,63,0,0,0,0,0,64,198,60,19,90,97,238,27,250,238,63,0,0,0,0,0,128,238,188,6,65,182,28,156,15,239,63,0,0,0,0,0,136,250,188,99,185,107,55,43,37,239,63,0,0,0,0,0,144,44,189,117,114,221,72,201,58,239,63,0,0,0,0,0,0,170,60,36,69,110,91,118,80,239,63,0,0,0,0,0,240,244,188,253,68,136,121,50,102,239,63,0,0,0,0,0,128,202,60,56,190,156,173,253,123,239,63,0,0,0,0,0,188,250,60,130,60,36,2,216,145,239,63,0,0,0,0,0,96,212,188,142,144,158,129,193,167,239,63,0,0,0,0,0,12,11,189,17,213,146,54,186,189,239,63,0,0,0,0,0,224,192,188,148,113,143,43,194,211,239,63,0,0,0,0,128,222,16,189,238,35,42,107,217,233,239,63,0,0,0,0,0,67,238,60,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,190,188,90,250,26,11,240,63,0,0,0,0,0,64,179,188,3,51,251,169,61,22,240,63,0,0,0,0,0,23,18,189,130,2,59,20,104,33,240,63,0,0,0,0,0,64,186,60,108,128,119,62,154,44,240,63,0,0,0,0,0,152,239,60,202,187,17,46,212,55,240,63,0,0,0,0,0,64,199,188,137,127,110,232,21,67,240,63,0,0,0,0,0,48,216,60,103,84,246,114,95,78,240,63,0,0,0,0,0,63,26,189,90,133,21,211,176,89,240,63,0,0,0,0,0,132,2,189,149,31,60,14,10,101,240,63,0,0,0,0,0,96,241,60,26,247,221,41,107,112,240,63,0,0,0,0,0,36,21,61,45,168,114,43,212,123,240,63,0,0,0,0,0,160,233,188,208,155,117,24,69,135,240,63,0,0,0,0,0,64,230,60,200,7,102,246,189,146,240,63,0,0,0,0,0,120,0,189,131,243,198,202,62,158,240,63,0,0,0,0,0,0,152,188,48,57,31,155,199,169,240,63,0,0,0,0,0,160,255,60,252,136,249,108,88,181,240,63,0,0,0,0,0,200,250,188,138,108,228,69,241,192,240,63,0,0,0,0,0,192,217,60,22,72,114,43,146,204,240,63,0,0,0,0,0,32,5,61,216,93,57,35,59,216,240,63,0,0,0,0,0,208,250,188,243,209,211,50,236,227,240,63,0,0,0,0,0,172,27,61,166,169,223,95,165,239,240,63,0,0,0,0,0,232,4,189,240,210,254,175,102,251,240,63,0,0,0,0,0,48,13,189,75,35,215,40,48,7,241,63,0,0,0,0,0,80,241,60,91,91,18,208,1,19,241,63,0,0,0,0,0,0,236,60,249,42,94,171,219,30,241,63,0,0,0,0,0,188,22,61,213,49,108,192,189,42,241,63,0,0,0,0,0,64,232,60,125,4,242,20,168,54,241,63,0,0,0,0,0,208,14,189,233,45,169,174,154,66,241,63,0,0,0,0,0,224,232,60,56,49,79,147,149,78,241,63,0,0,0,0,0,64,235,60,113,142,165,200,152,90,241,63,0,0,0,0,0,48,5,61,223,195,113,84,164,102,241,63,0,0,0,0,0,56,3,61,17,82,125,60,184,114,241,63,0,0,0,0,0,212,40,61,159,187,149,134,212,126,241,63,0,0,0,0,0,208,5,189,147,141,140,56,249,138,241,63,0,0,0,0,0,136,28,189,102,93,55,88,38,151,241,63,0,0,0,0,0,240,17,61,167,203,111,235,91,163,241,63,0,0,0,0,0,72,16,61,227,135,19,248,153,175,241,63,0,0,0,0,0,57,71,189,84,93,4,132,224,187,241,63,0,0,0,0,0,228,36,61,67,28,40,149,47,200,241,63,0,0,0,0,0,32,10,189,178,185,104,49,135,212,241,63,0,0,0,0,0,128,227,60,49,64,180,94,231,224,241,63,0,0,0,0,0,192,234,60,56,217,252,34,80,237,241,63,0,0,0,0,0,144,1,61,247,205,56,132,193,249,241,63,0,0,0,0,0,120,27,189,143,141,98,136,59,6,242,63,0,0,0,0,0,148,45,61,30,168,120,53,190,18,242,63,0,0,0,0,0,0,216,60,65,221,125,145,73,31,242,63,0,0,0,0,0,52,43,61,35,19,121,162,221,43,242,63,0,0,0,0,0,248,25,61,231,97,117,110,122,56,242,63,0,0,0,0,0,200,25,189,39,20,130,251,31,69,242,63,0,0,0,0,0,48,2,61,2,166,178,79,206,81,242,63,0,0,0,0,0,72,19,189,176,206,30,113,133,94,242,63,0,0,0,0,0,112,18,61,22,125,226,101,69,107,242,63,0,0,0,0,0,208,17,61,15,224,29,52,14,120,242,63,0,0,0,0,0,238,49,61,62,99,245,225,223,132,242,63,0,0,0,0,0,192,20,189,48,187,145,117,186,145,242,63,0,0,0,0,0,216,19,189,9,223,31,245,157,158,242,63,0,0,0,0,0,176,8,61,155,14,209,102,138,171,242,63,0,0,0,0,0,124,34,189,58,218,218,208,127,184,242,63,0,0,0,0,0,52,42,61,249,26,119,57,126,197,242,63,0,0,0,0,0,128,16,189,217,2,228,166,133,210,242,63,0,0,0,0,0,208,14,189,121,21,100,31,150,223,242,63,0,0,0,0,0,32,244,188,207,46,62,169,175,236,242,63,0,0,0,0,0,152,36,189,34,136,189,74,210,249,242,63,0,0,0,0,0,48,22,189,37,182,49,10,254,6,243,63,0,0,0,0,0,54,50,189,11,165,238,237,50,20,243,63,0,0,0,0,128,223,112,189,184,215,76,252,112,33,243,63,0,0,0,0,0,72,34,189,162,233,168,59,184,46,243,63,0,0,0,0,0,152,37,189,102,23,100,178,8,60,243,63,0,0,0,0,0,208,30,61,39,250,227,102,98,73,243,63,0,0,0,0,0,0,220,188,15,159,146,95,197,86,243,63,0,0,0,0,0,216,48,189,185,136,222,162,49,100,243,63,0,0,0,0,0,200,34,61,57,170,58,55,167,113,243,63,0,0,0,0,0,96,32,61,254,116,30,35,38,127,243,63,0,0,0,0,0,96,22,189,56,216,5,109,174,140,243,63,0,0,0,0,0,224,10,189,195,62,113,27,64,154,243,63,0,0,0,0,0,114,68,189,32,160,229,52,219,167,243,63,0,0,0,0,0,32,8,61,149,110,236,191,127,181,243,63,0,0,0,0,0,128,62,61,242,168,19,195,45,195,243,63,0,0,0,0,0,128,239,60,34,225,237,68,229,208,243,63,0,0,0,0,0,160,23,189,187,52,18,76,166,222,243,63,0,0,0,0,0,48,38,61,204,78,28,223,112,236,243,63,0,0,0,0,0,166,72,189,140,126,172,4,69,250,243,63,0,0,0,0,0,220,60,189,187,160,103,195,34,8,244,63,0,0,0,0,0,184,37,61,149,46,247,33,10,22,244,63,0,0,0,0,0,192,30,61,70,70,9,39,251,35,244,63,0,0,0,0,0,96,19,189,32,169,80,217,245,49,244,63,0,0,0,0,0,152,35,61,235,185,132,63,250,63,244,63,0,0,0,0,0,0,250,60,25,137,97,96,8,78,244,63,0,0,0,0,0,192,246,188,1,210,167,66,32,92,244,63,0,0,0,0,0,192,11,189,22,0,29,237,65,106,244,63,0,0,0,0,0,128,18,189,38,51,139,102,109,120,244,63,0,0,0,0,0,224,48,61,0,60,193,181,162,134,244,63,0,0,0,0,0,64,45,189,4,175,146,225,225,148,244,63,0,0,0,0,0,32,12,61,114,211,215,240,42,163,244,63,0,0,0,0,0,80,30,189,1,184,109,234,125,177,244,63,0,0,0,0,0,128,7,61,225,41,54,213,218,191,244,63,0,0,0,0,0,128,19,189,50,193,23,184,65,206,244,63,0,0,0,0,0,128,0,61,219,221,253,153,178,220,244,63,0,0,0,0,0,112,44,61,150,171,216,129,45,235,244,63,0,0,0,0,0,224,28,189,2,45,157,118,178,249,244,63,0,0,0,0,0,32,25,61,193,49,69,127,65,8,245,63,0,0,0,0,0,192,8,189,42,102,207,162,218,22,245,63,0,0,0,0,0,0,250,188,234,81,63,232,125,37,245,63,0,0,0,0,0,8,74,61,218,78,157,86,43,52,245,63,0,0,0,0,0,216,38,189,26,172,246,244,226,66,245,63,0,0,0,0,0,68,50,189,219,148,93,202,164,81,245,63,0,0,0,0,0,60,72,61,107,17,233,221,112,96,245,63,0,0,0,0,0,176,36,61,222,41,181,54,71,111,245,63,0,0,0,0,0,90,65,61,14,196,226,219,39,126,245,63,0,0,0,0,0,224,41,189,111,199,151,212,18,141,245,63,0,0,0,0,0,8,35,189,76,11,255,39,8,156,245,63,0,0,0,0,0,236,77,61,39,84,72,221,7,171,245,63,0,0,0,0,0,0,196,188,244,122,168,251,17,186,245,63,0,0,0,0,0,8,48,61,11,70,89,138,38,201,245,63,0,0,0,0,0,200,38,189,63,142,153,144,69,216,245,63,0,0,0,0,0,154,70,61,225,32,173,21,111,231,245,63,0,0,0,0,0,64,27,189,202,235,220,32,163,246,245,63,0,0,0,0,0,112,23,61,184,220,118,185,225,5,246,63,0,0,0,0,0,248,38,61,21,247,205,230,42,21,246,63,0,0,0,0,0,0,1,61,49,85,58,176,126,36,246,63,0,0,0,0,0,208,21,189,181,41,25,29,221,51,246,63,0,0,0,0,0,208,18,189,19,195,204,52,70,67,246,63,0,0,0,0,0,128,234,188,250,142,188,254,185,82,246,63,0,0,0,0,0,96,40,189,151,51,85,130,56,98,246,63,0,0,0,0,0,254,113,61,142,50,8,199,193,113,246,63,0,0,0,0,0,32,55,189,126,169,76,212,85,129,246,63,0,0,0,0,0,128,230,60,113,148,158,177,244,144,246,63,0,0,0,0,0,120,41,189,205,59,127,102,158,160,230,63,135,1,235,115,20,161,231,63,219,160,42,66,229,172,232,63,144,240,163,130,145,196,233,63,173,211,90,153,159,232,234,63,156,82,133,221,155,25,236,63,135,164,251,220,24,88,237,63,218,144,164,162,175,164,238,63,0,0,0,0,0,0,240,63,15,137,249,108,88,181,240,63,123,81,125,60,184,114,241,63,56,98,117,110,122,56,242,63,21,183,49,10,254,6,243,63,34,52,18,76,166,222,243,63,39,42,54,213,218,191,244,63,41,84,72,221,7,171,245,63,0,0,0,0,0,0,109,230,236,222,5,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,0,0,0,0,148,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,45,244,81,88,207,140,177,192,70,246,181,203,41,49,3,199,4,91,112,48,180,93,253,32,120,127,139,154,216,89,41,80,104,72,137,171,167,86,3,108,255,183,205,136,63,212,119,180,43,165,163,112,241,186,228,168,252,65,131,253,217,111,225,138,122,47,45,116,150,7,31,13,9,94,3,118,44,112,247,64,165,44,167,111,87,65,168,170,116,223,160,88,100,3,74,199,196,60,83,174,175,95,24,4,21,177,227,109,40,134,171,12,164,191,67,240,233,80,129,57,87,22,82,55,0,0,0,0,0,0,0,0,17,0,10,0,17,17,17,0,0,0,0,5,0,0,0,0,0,0,9,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,15,10,17,17,17,3,10,7,0,1,19,9,11,11,0,0,9,6,11,0,0,11,0,6,17,0,0,0,17,17,17,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,10,10,17,17,17,0,10,0,0,2,0,9,11,0,0,0,9,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,4,13,0,0,0,0,9,14,0,0,0,0,0,14,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,0,0,0,0,0,0,0,0,0,0,0,15,0,0,0,0,15,0,0,0,0,9,16,0,0,0,0,0,16,0,0,16,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,10,0,0,0,0,9,11,0,0,0,0,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,45,43,32,32,32,48,88,48,120,0,0,0,0,0,0,0,40,110,117,108,108,41,0,0,45,48,88,43,48,88,32,48,88,45,48,120,43,48,120,32,48,120,0,0,0,0,0,0,105,110,102,0,0,0,0,0,73,78,70,0,0,0,0,0,110,97,110,0,0,0,0,0,78,65,78,0,0,0,0,0,48,49,50,51,52,53,54,55,56,57,65,66,67,68,69,70,46,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);




var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}


  function _() {
  Module['printErr']('missing function: '); abort(-1);
  }

  var _cosf=Math_cos;

   
  Module["_i64Subtract"] = _i64Subtract;

  var _DtoILow=true;

  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  function _flash_load() {
  Module['printErr']('missing function: flash_load'); abort(-1);
  }

  function _remquof() {
  Module['printErr']('missing function: remquof'); abort(-1);
  }

   
  Module["_memset"] = _memset;

  var _BDtoILow=true;

  var _FtoIHigh=true;

  
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};function _strerror_r(errnum, strerrbuf, buflen) {
      if (errnum in ERRNO_MESSAGES) {
        if (ERRNO_MESSAGES[errnum].length > buflen - 1) {
          return ___setErrNo(ERRNO_CODES.ERANGE);
        } else {
          var msg = ERRNO_MESSAGES[errnum];
          writeAsciiToMemory(msg, strerrbuf);
          return 0;
        }
      } else {
        return ___setErrNo(ERRNO_CODES.EINVAL);
      }
    }function _strerror(errnum) {
      if (!_strerror.buffer) _strerror.buffer = _malloc(256);
      _strerror_r(errnum, _strerror.buffer, 256);
      return _strerror.buffer;
    }

  var _logf=Math_log;

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _abort() {
      Module['abort']();
    }

  
  
  
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function (stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          }
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.buffer.byteLength which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
  
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }
  
        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
  
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) { // Can we just reuse the buffer we are given?
              assert(position === 0, 'canOwn must imply no weird position inside the file');
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          fileStore.createIndex('timestamp', 'timestamp', { unique: false });
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function() { callback(this.error); };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function() { done(this.error); };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          if (length === 0) return 0; // node errors on 0 length reads
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
  
      /*
      // Disabled, see https://github.com/kripken/emscripten/issues/2770
      stream = FS.getStreamFromPtr(stream);
      if (stream.stream_ops.flush) {
        stream.stream_ops.flush(stream);
      }
      */
    }var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); }
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); }
            }
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },getStreamFromPtr:function (ptr) {
        return FS.streams[ptr - 1];
      },getPtrForStream:function (stream) {
        return stream ? stream.fd + 1 : 0;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto').randomBytes(1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=FS.getPtrForStream(stdin);
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=FS.getPtrForStream(stdout);
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=FS.getPtrForStream(stderr);
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
          if (this.stack) this.stack = demangleAll(this.stack);
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperty(node, "usedBytes", {
            get: function() { return this.contents.length; }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};
  
  
  
  
  function _mkport() { throw 'TODO' }var SOCKFS={mount:function (mount) {
        // If Module['websocket'] has already been defined (e.g. for configuring
        // the subprotocol/url) use that, if not initialise it to a new object.
        Module['websocket'] = (Module['websocket'] && 
                               ('object' === typeof Module['websocket'])) ? Module['websocket'] : {};
  
        // Add the Event registration mechanism to the exported websocket configuration
        // object so we can register network callbacks from native JavaScript too.
        // For more documentation see system/include/emscripten/emscripten.h
        Module['websocket']._callbacks = {};
        Module['websocket']['on'] = function(event, callback) {
  	    if ('function' === typeof callback) {
  		  this._callbacks[event] = callback;
          }
  	    return this;
        };
  
        Module['websocket'].emit = function(event, param) {
  	    if ('function' === typeof this._callbacks[event]) {
  		  this._callbacks[event].call(this, param);
          }
        };
  
        // If debug is enabled register simple default logging callbacks for each Event.
  
        return FS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createSocket:function (family, type, protocol) {
        var streaming = type == 1;
        if (protocol) {
          assert(streaming == (protocol == 6)); // if SOCK_STREAM, must be tcp
        }
  
        // create our internal socket structure
        var sock = {
          family: family,
          type: type,
          protocol: protocol,
          server: null,
          error: null, // Used in getsockopt for SOL_SOCKET/SO_ERROR test
          peers: {},
          pending: [],
          recv_queue: [],
          sock_ops: SOCKFS.websocket_sock_ops
        };
  
        // create the filesystem node to store the socket structure
        var name = SOCKFS.nextname();
        var node = FS.createNode(SOCKFS.root, name, 49152, 0);
        node.sock = sock;
  
        // and the wrapping stream that enables library functions such
        // as read and write to indirectly interact with the socket
        var stream = FS.createStream({
          path: name,
          node: node,
          flags: FS.modeStringToFlags('r+'),
          seekable: false,
          stream_ops: SOCKFS.stream_ops
        });
  
        // map the new stream to the socket structure (sockets have a 1:1
        // relationship with a stream)
        sock.stream = stream;
  
        return sock;
      },getSocket:function (fd) {
        var stream = FS.getStream(fd);
        if (!stream || !FS.isSocket(stream.node.mode)) {
          return null;
        }
        return stream.node.sock;
      },stream_ops:{poll:function (stream) {
          var sock = stream.node.sock;
          return sock.sock_ops.poll(sock);
        },ioctl:function (stream, request, varargs) {
          var sock = stream.node.sock;
          return sock.sock_ops.ioctl(sock, request, varargs);
        },read:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          var msg = sock.sock_ops.recvmsg(sock, length);
          if (!msg) {
            // socket is closed
            return 0;
          }
          buffer.set(msg.buffer, offset);
          return msg.buffer.length;
        },write:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          return sock.sock_ops.sendmsg(sock, buffer, offset, length);
        },close:function (stream) {
          var sock = stream.node.sock;
          sock.sock_ops.close(sock);
        }},nextname:function () {
        if (!SOCKFS.nextname.current) {
          SOCKFS.nextname.current = 0;
        }
        return 'socket[' + (SOCKFS.nextname.current++) + ']';
      },websocket_sock_ops:{createPeer:function (sock, addr, port) {
          var ws;
  
          if (typeof addr === 'object') {
            ws = addr;
            addr = null;
            port = null;
          }
  
          if (ws) {
            // for sockets that've already connected (e.g. we're the server)
            // we can inspect the _socket property for the address
            if (ws._socket) {
              addr = ws._socket.remoteAddress;
              port = ws._socket.remotePort;
            }
            // if we're just now initializing a connection to the remote,
            // inspect the url property
            else {
              var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
              if (!result) {
                throw new Error('WebSocket URL must be in the format ws(s)://address:port');
              }
              addr = result[1];
              port = parseInt(result[2], 10);
            }
          } else {
            // create the actual websocket object and connect
            try {
              // runtimeConfig gets set to true if WebSocket runtime configuration is available.
              var runtimeConfig = (Module['websocket'] && ('object' === typeof Module['websocket']));
  
              // The default value is 'ws://' the replace is needed because the compiler replaces '//' comments with '#'
              // comments without checking context, so we'd end up with ws:#, the replace swaps the '#' for '//' again.
              var url = 'ws:#'.replace('#', '//');
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['url']) {
                  url = Module['websocket']['url']; // Fetch runtime WebSocket URL config.
                }
              }
  
              if (url === 'ws://' || url === 'wss://') { // Is the supplied URL config just a prefix, if so complete it.
                var parts = addr.split('/');
                url = url + parts[0] + ":" + port + "/" + parts.slice(1).join('/');
              }
  
              // Make the WebSocket subprotocol (Sec-WebSocket-Protocol) default to binary if no configuration is set.
              var subProtocols = 'binary'; // The default value is 'binary'
  
              if (runtimeConfig) {
                if ('string' === typeof Module['websocket']['subprotocol']) {
                  subProtocols = Module['websocket']['subprotocol']; // Fetch runtime WebSocket subprotocol config.
                }
              }
  
              // The regex trims the string (removes spaces at the beginning and end, then splits the string by
              // <any space>,<any space> into an Array. Whitespace removal is important for Websockify and ws.
              subProtocols = subProtocols.replace(/^ +| +$/g,"").split(/ *, */);
  
              // The node ws library API for specifying optional subprotocol is slightly different than the browser's.
              var opts = ENVIRONMENT_IS_NODE ? {'protocol': subProtocols.toString()} : subProtocols;
  
              // If node we use the ws library.
              var WebSocket = ENVIRONMENT_IS_NODE ? require('ws') : window['WebSocket'];
              ws = new WebSocket(url, opts);
              ws.binaryType = 'arraybuffer';
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
            }
          }
  
  
          var peer = {
            addr: addr,
            port: port,
            socket: ws,
            dgram_send_queue: []
          };
  
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
  
          // if this is a bound dgram socket, send the port number first to allow
          // us to override the ephemeral port reported to us by remotePort on the
          // remote end.
          if (sock.type === 2 && typeof sock.sport !== 'undefined') {
            peer.dgram_send_queue.push(new Uint8Array([
                255, 255, 255, 255,
                'p'.charCodeAt(0), 'o'.charCodeAt(0), 'r'.charCodeAt(0), 't'.charCodeAt(0),
                ((sock.sport & 0xff00) >> 8) , (sock.sport & 0xff)
            ]));
          }
  
          return peer;
        },getPeer:function (sock, addr, port) {
          return sock.peers[addr + ':' + port];
        },addPeer:function (sock, peer) {
          sock.peers[peer.addr + ':' + peer.port] = peer;
        },removePeer:function (sock, peer) {
          delete sock.peers[peer.addr + ':' + peer.port];
        },handlePeerEvents:function (sock, peer) {
          var first = true;
  
          var handleOpen = function () {
  
            Module['websocket'].emit('open', sock.stream.fd);
  
            try {
              var queued = peer.dgram_send_queue.shift();
              while (queued) {
                peer.socket.send(queued);
                queued = peer.dgram_send_queue.shift();
              }
            } catch (e) {
              // not much we can do here in the way of proper error handling as we've already
              // lied and said this data was sent. shut it down.
              peer.socket.close();
            }
          };
  
          function handleMessage(data) {
            assert(typeof data !== 'string' && data.byteLength !== undefined);  // must receive an ArrayBuffer
            data = new Uint8Array(data);  // make a typed array view on the array buffer
  
  
            // if this is the port message, override the peer's port with it
            var wasfirst = first;
            first = false;
            if (wasfirst &&
                data.length === 10 &&
                data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 &&
                data[4] === 'p'.charCodeAt(0) && data[5] === 'o'.charCodeAt(0) && data[6] === 'r'.charCodeAt(0) && data[7] === 't'.charCodeAt(0)) {
              // update the peer's port and it's key in the peer map
              var newport = ((data[8] << 8) | data[9]);
              SOCKFS.websocket_sock_ops.removePeer(sock, peer);
              peer.port = newport;
              SOCKFS.websocket_sock_ops.addPeer(sock, peer);
              return;
            }
  
            sock.recv_queue.push({ addr: peer.addr, port: peer.port, data: data });
            Module['websocket'].emit('message', sock.stream.fd);
          };
  
          if (ENVIRONMENT_IS_NODE) {
            peer.socket.on('open', handleOpen);
            peer.socket.on('message', function(data, flags) {
              if (!flags.binary) {
                return;
              }
              handleMessage((new Uint8Array(data)).buffer);  // copy from node Buffer -> ArrayBuffer
            });
            peer.socket.on('close', function() {
              Module['websocket'].emit('close', sock.stream.fd);
            });
            peer.socket.on('error', function(error) {
              // Although the ws library may pass errors that may be more descriptive than
              // ECONNREFUSED they are not necessarily the expected error code e.g. 
              // ENOTFOUND on getaddrinfo seems to be node.js specific, so using ECONNREFUSED
              // is still probably the most useful thing to do.
              sock.error = ERRNO_CODES.ECONNREFUSED; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
              Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'ECONNREFUSED: Connection refused']);
              // don't throw
            });
          } else {
            peer.socket.onopen = handleOpen;
            peer.socket.onclose = function() {
              Module['websocket'].emit('close', sock.stream.fd);
            };
            peer.socket.onmessage = function peer_socket_onmessage(event) {
              handleMessage(event.data);
            };
            peer.socket.onerror = function(error) {
              // The WebSocket spec only allows a 'simple event' to be thrown on error,
              // so we only really know as much as ECONNREFUSED.
              sock.error = ERRNO_CODES.ECONNREFUSED; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
              Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'ECONNREFUSED: Connection refused']);
            };
          }
        },poll:function (sock) {
          if (sock.type === 1 && sock.server) {
            // listen sockets should only say they're available for reading
            // if there are pending clients.
            return sock.pending.length ? (64 | 1) : 0;
          }
  
          var mask = 0;
          var dest = sock.type === 1 ?  // we only care about the socket state for connection-based sockets
            SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) :
            null;
  
          if (sock.recv_queue.length ||
              !dest ||  // connection-less sockets are always ready to read
              (dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {  // let recv return 0 once closed
            mask |= (64 | 1);
          }
  
          if (!dest ||  // connection-less sockets are always ready to write
              (dest && dest.socket.readyState === dest.socket.OPEN)) {
            mask |= 4;
          }
  
          if ((dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {
            mask |= 16;
          }
  
          return mask;
        },ioctl:function (sock, request, arg) {
          switch (request) {
            case 21531:
              var bytes = 0;
              if (sock.recv_queue.length) {
                bytes = sock.recv_queue[0].data.length;
              }
              HEAP32[((arg)>>2)]=bytes;
              return 0;
            default:
              return ERRNO_CODES.EINVAL;
          }
        },close:function (sock) {
          // if we've spawned a listen server, close it
          if (sock.server) {
            try {
              sock.server.close();
            } catch (e) {
            }
            sock.server = null;
          }
          // close any peer connections
          var peers = Object.keys(sock.peers);
          for (var i = 0; i < peers.length; i++) {
            var peer = sock.peers[peers[i]];
            try {
              peer.socket.close();
            } catch (e) {
            }
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          }
          return 0;
        },bind:function (sock, addr, port) {
          if (typeof sock.saddr !== 'undefined' || typeof sock.sport !== 'undefined') {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already bound
          }
          sock.saddr = addr;
          sock.sport = port || _mkport();
          // in order to emulate dgram sockets, we need to launch a listen server when
          // binding on a connection-less socket
          // note: this is only required on the server side
          if (sock.type === 2) {
            // close the existing server if it exists
            if (sock.server) {
              sock.server.close();
              sock.server = null;
            }
            // swallow error operation not supported error that occurs when binding in the
            // browser where this isn't supported
            try {
              sock.sock_ops.listen(sock, 0);
            } catch (e) {
              if (!(e instanceof FS.ErrnoError)) throw e;
              if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
            }
          }
        },connect:function (sock, addr, port) {
          if (sock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
  
          // TODO autobind
          // if (!sock.addr && sock.type == 2) {
          // }
  
          // early out if we're already connected / in the middle of connecting
          if (typeof sock.daddr !== 'undefined' && typeof sock.dport !== 'undefined') {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (dest) {
              if (dest.socket.readyState === dest.socket.CONNECTING) {
                throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
              } else {
                throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
              }
            }
          }
  
          // add the socket to our peer list and set our
          // destination address / port to match
          var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          sock.daddr = peer.addr;
          sock.dport = peer.port;
  
          // always "fail" in non-blocking mode
          throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
        },listen:function (sock, backlog) {
          if (!ENVIRONMENT_IS_NODE) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
          if (sock.server) {
             throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already listening
          }
          var WebSocketServer = require('ws').Server;
          var host = sock.saddr;
          sock.server = new WebSocketServer({
            host: host,
            port: sock.sport
            // TODO support backlog
          });
          Module['websocket'].emit('listen', sock.stream.fd); // Send Event with listen fd.
  
          sock.server.on('connection', function(ws) {
            if (sock.type === 1) {
              var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
  
              // create a peer on the new socket
              var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
              newsock.daddr = peer.addr;
              newsock.dport = peer.port;
  
              // push to queue for accept to pick up
              sock.pending.push(newsock);
              Module['websocket'].emit('connection', newsock.stream.fd);
            } else {
              // create a peer on the listen socket so calling sendto
              // with the listen socket and an address will resolve
              // to the correct client
              SOCKFS.websocket_sock_ops.createPeer(sock, ws);
              Module['websocket'].emit('connection', sock.stream.fd);
            }
          });
          sock.server.on('closed', function() {
            Module['websocket'].emit('close', sock.stream.fd);
            sock.server = null;
          });
          sock.server.on('error', function(error) {
            // Although the ws library may pass errors that may be more descriptive than
            // ECONNREFUSED they are not necessarily the expected error code e.g. 
            // ENOTFOUND on getaddrinfo seems to be node.js specific, so using EHOSTUNREACH
            // is still probably the most useful thing to do. This error shouldn't
            // occur in a well written app as errors should get trapped in the compiled
            // app's own getaddrinfo call.
            sock.error = ERRNO_CODES.EHOSTUNREACH; // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
            Module['websocket'].emit('error', [sock.stream.fd, sock.error, 'EHOSTUNREACH: Host is unreachable']);
            // don't throw
          });
        },accept:function (listensock) {
          if (!listensock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          var newsock = listensock.pending.shift();
          newsock.stream.flags = listensock.stream.flags;
          return newsock;
        },getname:function (sock, peer) {
          var addr, port;
          if (peer) {
            if (sock.daddr === undefined || sock.dport === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            }
            addr = sock.daddr;
            port = sock.dport;
          } else {
            // TODO saddr and sport will be set for bind()'d UDP sockets, but what
            // should we be returning for TCP sockets that've been connect()'d?
            addr = sock.saddr || 0;
            port = sock.sport || 0;
          }
          return { addr: addr, port: port };
        },sendmsg:function (sock, buffer, offset, length, addr, port) {
          if (sock.type === 2) {
            // connection-less sockets will honor the message address,
            // and otherwise fall back to the bound destination address
            if (addr === undefined || port === undefined) {
              addr = sock.daddr;
              port = sock.dport;
            }
            // if there was no address to fall back to, error out
            if (addr === undefined || port === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
            }
          } else {
            // connection-based sockets will only use the bound
            addr = sock.daddr;
            port = sock.dport;
          }
  
          // find the peer for the destination address
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
  
          // early out if not connected with a connection-based socket
          if (sock.type === 1) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            } else if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // create a copy of the incoming data to send, as the WebSocket API
          // doesn't work entirely with an ArrayBufferView, it'll just send
          // the entire underlying buffer
          var data;
          if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
            data = buffer.slice(offset, offset + length);
          } else {  // ArrayBufferView
            data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
          }
  
          // if we're emulating a connection-less dgram socket and don't have
          // a cached connection, queue the buffer to send upon connect and
          // lie, saying the data was sent now.
          if (sock.type === 2) {
            if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
              // if we're not connected, open a new connection
              if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
              }
              dest.dgram_send_queue.push(data);
              return length;
            }
          }
  
          try {
            // send the actual data
            dest.socket.send(data);
            return length;
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
        },recvmsg:function (sock, length) {
          // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
          if (sock.type === 1 && sock.server) {
            // tcp servers should not be recv()'ing on the listen socket
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
          }
  
          var queued = sock.recv_queue.shift();
          if (!queued) {
            if (sock.type === 1) {
              var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
  
              if (!dest) {
                // if we have a destination address but are not connected, error out
                throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
              }
              else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                // return null if the socket has closed
                return null;
              }
              else {
                // else, our socket is in a valid state but truly has nothing available
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
          // requeued TCP data it'll be an ArrayBufferView
          var queuedLength = queued.data.byteLength || queued.data.length;
          var queuedOffset = queued.data.byteOffset || 0;
          var queuedBuffer = queued.data.buffer || queued.data;
          var bytesRead = Math.min(length, queuedLength);
          var res = {
            buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
            addr: queued.addr,
            port: queued.port
          };
  
  
          // push back any unread data for TCP connections
          if (sock.type === 1 && bytesRead < queuedLength) {
            var bytesRemaining = queuedLength - bytesRead;
            queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
            sock.recv_queue.unshift(queued);
          }
  
          return res;
        }}};function _send(fd, buf, len, flags) {
      var sock = SOCKFS.getSocket(fd);
      if (!sock) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      // TODO honor flags
      return _write(fd, buf, len);
    }
  
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
  
  
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }
  
  function _fileno(stream) {
      // int fileno(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fileno.html
      stream = FS.getStreamFromPtr(stream);
      if (!stream) return -1;
      return stream.fd;
    }function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var fd = _fileno(stream);
      var bytesWritten = _write(fd, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        var streamObj = FS.getStreamFromPtr(stream);
        if (streamObj) streamObj.error = true;
        return 0;
      } else {
        return (bytesWritten / size)|0;
      }
    }
  
  
   
  Module["_strlen"] = _strlen;
  
  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = (HEAP32[((tempDoublePtr)>>2)]=HEAP32[(((varargs)+(argIndex))>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((varargs)+((argIndex)+(4)))>>2)],(+(HEAPF64[(tempDoublePtr)>>3])));
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+4))>>2)]];
  
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Runtime.getNativeFieldSize(type);
        return ret;
      }
  
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[((textIndex)>>0)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)>>0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          var flagPadSign = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              case 32:
                flagPadSign = true;
                break;
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
          }
  
          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)>>0)];
            }
          }
  
          // Handle precision.
          var precisionSet = false, precision = -1;
          if (next == 46) {
            precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)>>0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)>>0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)>>0)];
          }
          if (precision < 0) {
            precision = 6; // Standard default.
            precisionSet = false;
          }
  
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)>>0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)>>0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)>>0)];
  
          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              var currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = (flagAlternative && currArg != 0) ? '0x' : '';
                if (argSize == 8 && i64Math) {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }
  
              // Add sign if needed
              if (currArg >= 0) {
                if (flagAlwaysSigned) {
                  prefix = '+' + prefix;
                } else if (flagPadSign) {
                  prefix = ' ' + prefix;
                }
              }
  
              // Move sign to prefix so we zero-pad after the sign
              if (argText.charAt(0) == '-') {
                prefix = '-' + prefix;
                argText = argText.substr(1);
              }
  
              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }
  
              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              var currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);
  
                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }
  
                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }
  
                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
  
                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();
  
                // Add sign.
                if (currArg >= 0) {
                  if (flagAlwaysSigned) {
                    argText = '+' + argText;
                  } else if (flagPadSign) {
                    argText = ' ' + argText;
                  }
                }
              }
  
              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }
  
              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();
  
              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*');
              var argLength = arg ? _strlen(arg) : '(null)'.length;
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              if (arg) {
                for (var i = 0; i < argLength; i++) {
                  ret.push(HEAPU8[((arg++)>>0)]);
                }
              } else {
                ret = ret.concat(intArrayFromString('(null)'.substr(0, argLength), true));
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length;
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[((i)>>0)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }function _fprintf(stream, format, varargs) {
      // int fprintf(FILE *restrict stream, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var stack = Runtime.stackSave();
      var ret = _fwrite(allocate(result, 'i8', ALLOC_STACK), 1, result.length, stream);
      Runtime.stackRestore(stack);
      return ret;
    }

  function _led_set() {
  Module['printErr']('missing function: led_set'); abort(-1);
  }

  function ___assert_fail(condition, filename, line, func) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
    }


  var _sqrtf=Math_sqrt;

  function ___unlock() {}

  function _flash_store() {
  Module['printErr']('missing function: flash_store'); abort(-1);
  }

   
  Module["_i64Add"] = _i64Add;

  var _fabs=Math_abs;

  function _ilogb() {
  Module['printErr']('missing function: ilogb'); abort(-1);
  }

  var _sqrt=Math_sqrt;

  function ___lock() {}

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  var _sin=Math_sin;

  function _nextafter() {
  Module['printErr']('missing function: nextafter'); abort(-1);
  }

  function _remquo() {
  Module['printErr']('missing function: remquo'); abort(-1);
  }

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

  var _cosl=Math_cos;

  function _fsw_poll() {
  Module['printErr']('missing function: fsw_poll'); abort(-1);
  }

  function _fesetround() {
  Module['printErr']('missing function: fesetround'); abort(-1);
  }

  var _BDtoIHigh=true;

  function _llvm_fma_f64() {
  Module['printErr']('missing function: llvm_fma_f64'); abort(-1);
  }

  var _sinl=Math_sin;

  var _sinf=Math_sin;

  function _lcd_updated_all() {
  Module['printErr']('missing function: lcd_updated_all'); abort(-1);
  }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  var _log=Math_log;

  var _DtoIHigh=true;

  var _cos=Math_cos;

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }

  function ___errno_location() {
      return ___errno_state;
    }

  var _BItoD=true;

  function _lcd_row_get() {
  Module['printErr']('missing function: lcd_row_get'); abort(-1);
  }

  var _exp=Math_exp;

  var _FtoILow=true;

  function _midi_send_cmd1() {
  Module['printErr']('missing function: midi_send_cmd1'); abort(-1);
  }

  var _expf=Math_exp;

  function _midi_send_cmd2() {
  Module['printErr']('missing function: midi_send_cmd2'); abort(-1);
  }

___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
__ATINIT__.push({ func: function() { SOCKFS.root = FS.mount(SOCKFS, {}, null); } });
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var ctlz_i8 = allocate([8,7,6,6,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_DYNAMIC);
 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array };
Module.asmLibraryArg = { "abort": abort, "assert": assert, "min": Math_min, "nullFunc_iiii": nullFunc_iiii, "invoke_iiii": invoke_iiii, "_fabs": _fabs, "_lcd_row_get": _lcd_row_get, "_midi_send_cmd1": _midi_send_cmd1, "_sin": _sin, "_exp": _exp, "_cosf": _cosf, "_send": _send, "_sqrtf": _sqrtf, "_cosl": _cosl, "_abort": _abort, "_remquof": _remquof, "___setErrNo": ___setErrNo, "___assert_fail": ___assert_fail, "_write": _write, "_fflush": _fflush, "_pwrite": _pwrite, "_strerror_r": _strerror_r, "_fprintf": _fprintf, "__reallyNegative": __reallyNegative, "_sbrk": _sbrk, "_cos": _cos, "_nextafter": _nextafter, "_remquo": _remquo, "_sinf": _sinf, "_fileno": _fileno, "_sysconf": _sysconf, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_lcd_updated_all": _lcd_updated_all, "_led_set": _led_set, "_llvm_fma_f64": _llvm_fma_f64, "_log": _log, "___unlock": ___unlock, "_fsw_poll": _fsw_poll, "_": _, "___errno_location": ___errno_location, "_expf": _expf, "_midi_send_cmd2": _midi_send_cmd2, "_flash_store": _flash_store, "_fesetround": _fesetround, "_logf": _logf, "_sinl": _sinl, "___lock": ___lock, "_flash_load": _flash_load, "_fwrite": _fwrite, "_time": _time, "_mkport": _mkport, "_strerror": _strerror, "__formatString": __formatString, "_sqrt": _sqrt, "_ilogb": _ilogb, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8, "ctlz_i8": ctlz_i8, "NaN": NaN, "Infinity": Infinity, "_stderr": _stderr };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'almost asm';
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;
  var ctlz_i8=env.ctlz_i8|0;
  var _stderr=env._stderr|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = +env.NaN, inf = +env.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var abort=env.abort;
  var assert=env.assert;
  var Math_min=env.min;
  var nullFunc_iiii=env.nullFunc_iiii;
  var invoke_iiii=env.invoke_iiii;
  var _fabs=env._fabs;
  var _lcd_row_get=env._lcd_row_get;
  var _midi_send_cmd1=env._midi_send_cmd1;
  var _sin=env._sin;
  var _exp=env._exp;
  var _cosf=env._cosf;
  var _send=env._send;
  var _sqrtf=env._sqrtf;
  var _cosl=env._cosl;
  var _abort=env._abort;
  var _remquof=env._remquof;
  var ___setErrNo=env.___setErrNo;
  var ___assert_fail=env.___assert_fail;
  var _write=env._write;
  var _fflush=env._fflush;
  var _pwrite=env._pwrite;
  var _strerror_r=env._strerror_r;
  var _fprintf=env._fprintf;
  var __reallyNegative=env.__reallyNegative;
  var _sbrk=env._sbrk;
  var _cos=env._cos;
  var _nextafter=env._nextafter;
  var _remquo=env._remquo;
  var _sinf=env._sinf;
  var _fileno=env._fileno;
  var _sysconf=env._sysconf;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _lcd_updated_all=env._lcd_updated_all;
  var _led_set=env._led_set;
  var _llvm_fma_f64=env._llvm_fma_f64;
  var _log=env._log;
  var ___unlock=env.___unlock;
  var _fsw_poll=env._fsw_poll;
  var _=env._;
  var ___errno_location=env.___errno_location;
  var _expf=env._expf;
  var _midi_send_cmd2=env._midi_send_cmd2;
  var _flash_store=env._flash_store;
  var _fesetround=env._fesetround;
  var _logf=env._logf;
  var _sinl=env._sinl;
  var ___lock=env.___lock;
  var _flash_load=env._flash_load;
  var _fwrite=env._fwrite;
  var _time=env._time;
  var _mkport=env._mkport;
  var _strerror=env._strerror;
  var __formatString=env.__formatString;
  var _sqrt=env._sqrt;
  var _ilogb=env._ilogb;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
STACKTOP = (STACKTOP + 15)&-16;
if ((STACKTOP|0) >= (STACK_MAX|0)) abort();

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}
function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _load_program_state() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $7 = 0, $8 = 0;
 var $9 = 0, $descidx = 0, $i = 0, $mkv_chan = 0, $mkv_solo_bit = 0, $new_rjm_actual = 0, $rdesc = 0, $rshr = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = HEAP8[8>>0]|0;
 $1 = $0&255;
 $2 = $1&65535;
 $3 = $2<<5;
 $4 = $3&65535;
 _flash_load(($4|0),32,(16|0));
 $5 = HEAP8[16>>0]|0;
 $6 = $5&255;
 $7 = ($6|0)==(0);
 if ($7) {
  HEAP8[16>>0] = 32;
  HEAP8[((16 + 1|0))>>0] = 32;
  HEAP8[((16 + 2|0))>>0] = 32;
  $8 = HEAP8[8>>0]|0;
  $9 = $8&255;
  $10 = (($9) + 1)|0;
  $11 = $10&255;
  (_ritoa(16,$11,3)|0);
  HEAP8[((16 + 4|0))>>0] = 0;
  $12 = HEAP8[8>>0]|0;
  $13 = $12&255;
  $14 = (($13) + 1)|0;
  $15 = $14&255;
  HEAP8[((16 + 24|0))>>0] = $15;
  HEAP8[((16 + 20|0))>>0] = 4;
  HEAP8[((16 + 21|0))>>0] = 64;
  HEAP8[((16 + 22|0))>>0] = 81;
  HEAP8[((16 + 23|0))>>0] = 98;
  HEAP8[((16 + 25|0))>>0] = 1;
  HEAP8[((16 + 26|0))>>0] = 1;
  HEAP8[((16 + 27|0))>>0] = 64;
  HEAP8[((16 + 28|0))>>0] = 64;
  HEAP8[((16 + 29|0))>>0] = 64;
  HEAP8[((16 + 30|0))>>0] = 80;
 }
 $i = 0;
 while(1) {
  $16 = $i;
  $17 = $16&255;
  $18 = ($17|0)<(6);
  if (!($18)) {
   break;
  }
  $19 = $i;
  $20 = $19&255;
  $21 = $20 >> 1;
  $22 = $21&255;
  $descidx = $22;
  $23 = $i;
  $24 = $23&255;
  $25 = $24 & 1;
  $26 = $25 << 2;
  $27 = $26&255;
  $rshr = $27;
  $28 = $descidx;
  $29 = $28&255;
  $30 = (((16 + 21|0)) + ($29)|0);
  $31 = HEAP8[$30>>0]|0;
  $32 = $31&255;
  $33 = $rshr;
  $34 = $33&255;
  $35 = $32 >> $34;
  $36 = $35 & 15;
  $37 = $36&255;
  $rdesc = $37;
  $38 = $rdesc;
  $39 = $38&255;
  $40 = $39 & 3;
  $41 = $40&255;
  $mkv_chan = $41;
  $42 = $rdesc;
  $43 = $42&255;
  $44 = $43 & 4;
  $45 = $44 >> 2;
  $46 = $45&255;
  $mkv_solo_bit = $46;
  $47 = $mkv_chan;
  $48 = $47&255;
  $49 = $48 << 1;
  $50 = $mkv_solo_bit;
  $51 = $50&255;
  $52 = $49 | $51;
  $53 = $52&255;
  $new_rjm_actual = $53;
  $54 = $new_rjm_actual;
  $55 = $i;
  $56 = $55&255;
  $57 = (48 + ($56)|0);
  HEAP8[$57>>0] = $54;
  $58 = $i;
  $59 = (($58) + 1)<<24>>24;
  $i = $59;
 }
 $60 = HEAP8[((16 + 20|0))>>0]|0;
 HEAP8[56>>0] = $60;
 STACKTOP = sp;return;
}
function _controller_init() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[64>>0] = 1;
 HEAP8[72>>0] = 0;
 HEAP8[((80 + 4|0))>>0] = 0;
 HEAP8[80>>0] = 0;
 HEAP8[((80 + 12|0))>>0] = 0;
 HEAP8[((80 + 8|0))>>0] = 0;
 HEAP8[96>>0] = 0;
 HEAP8[104>>0] = 0;
 HEAP8[112>>0] = 0;
 HEAP8[120>>0] = 0;
 HEAP16[128>>1] = 0;
 HEAP16[136>>1] = -1;
 HEAP8[144>>0] = 0;
 HEAP8[152>>0] = 0;
 HEAP8[160>>0] = 0;
 HEAP8[168>>0] = 0;
 HEAP8[176>>0] = 0;
 HEAP8[184>>0] = 0;
 HEAP8[192>>0] = 0;
 HEAP8[200>>0] = 0;
 HEAP8[208>>0] = 0;
 HEAP8[216>>0] = 0;
 HEAP8[224>>0] = 0;
 HEAP8[56>>0] = 0;
 HEAP8[232>>0] = -1;
 HEAP8[8>>0] = 0;
 HEAP8[240>>0] = 84;
 HEAP8[((240 + 1|0))>>0] = 85;
 HEAP8[((240 + 2|0))>>0] = 86;
 HEAP8[((240 + 3|0))>>0] = 87;
 HEAP8[((240 + 4|0))>>0] = 88;
 HEAP8[((240 + 5|0))>>0] = 89;
 HEAP8[((240 + 6|0))>>0] = 90;
 HEAP8[((240 + 7|0))>>0] = 91;
 HEAP8[((16 + 25|0))>>0] = 0;
 HEAP8[((16 + 26|0))>>0] = 16;
 HEAP8[((16 + 27|0))>>0] = 0;
 HEAP8[((16 + 28|0))>>0] = 16;
 HEAP8[((16 + 29|0))>>0] = 0;
 HEAP8[((16 + 30|0))>>0] = 16;
 $i = 0;
 while(1) {
  $0 = $i;
  $1 = $0&255;
  $2 = ($1|0)<(4);
  if (!($2)) {
   break;
  }
  $3 = $i;
  $4 = (_lcd_row_get(($3|0))|0);
  $5 = $i;
  $6 = $5&255;
  $7 = (248 + ($6<<2)|0);
  HEAP32[$7>>2] = $4;
  $8 = $i;
  $9 = (($8) + 1)<<24>>24;
  $i = $9;
 }
 $i = 0;
 while(1) {
  $10 = $i;
  $11 = $10&255;
  $12 = ($11|0)<(20);
  if (!($12)) {
   break;
  }
  $13 = $i;
  $14 = $13&255;
  $15 = (264 + ($14)|0);
  $16 = HEAP8[$15>>0]|0;
  $17 = $i;
  $18 = $17&255;
  $19 = HEAP32[248>>2]|0;
  $20 = (($19) + ($18)|0);
  HEAP8[$20>>0] = $16;
  $21 = $i;
  $22 = $21&255;
  $23 = (264 + ($22)|0);
  $24 = HEAP8[$23>>0]|0;
  $25 = $i;
  $26 = $25&255;
  $27 = HEAP32[((248 + 4|0))>>2]|0;
  $28 = (($27) + ($26)|0);
  HEAP8[$28>>0] = $24;
  $29 = $i;
  $30 = $29&255;
  $31 = (288 + ($30)|0);
  $32 = HEAP8[$31>>0]|0;
  $33 = $i;
  $34 = $33&255;
  $35 = HEAP32[((248 + 8|0))>>2]|0;
  $36 = (($35) + ($34)|0);
  HEAP8[$36>>0] = $32;
  $37 = $i;
  $38 = $37&255;
  $39 = (264 + ($38)|0);
  $40 = HEAP8[$39>>0]|0;
  $41 = $i;
  $42 = $41&255;
  $43 = HEAP32[((248 + 12|0))>>2]|0;
  $44 = (($43) + ($42)|0);
  HEAP8[$44>>0] = $40;
  $45 = $i;
  $46 = (($45) + 1)<<24>>24;
  $i = $46;
 }
 _update_lcd();
 _switch_mode(1);
 _set_gmaj_program();
 _rjm_activate();
 STACKTOP = sp;return;
}
function _controller_10msec_timer() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0;
 var $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0;
 var $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0;
 var $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0;
 var $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[152>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)>(0);
 if ($2) {
  $3 = HEAP8[152>>0]|0;
  $4 = (($3) + 1)<<24>>24;
  HEAP8[152>>0] = $4;
  $5 = HEAP8[152>>0]|0;
  $6 = $5&255;
  $7 = ($6|0)>=(240);
  if ($7) {
   HEAP8[152>>0] = -128;
  }
 }
 $8 = HEAP8[160>>0]|0;
 $9 = $8&255;
 $10 = ($9|0)>(0);
 if ($10) {
  $11 = HEAP8[160>>0]|0;
  $12 = (($11) + 1)<<24>>24;
  HEAP8[160>>0] = $12;
  $13 = HEAP8[160>>0]|0;
  $14 = $13&255;
  $15 = ($14|0)>=(240);
  if ($15) {
   HEAP8[160>>0] = -128;
  }
 }
 $16 = HEAP8[144>>0]|0;
 $17 = $16&255;
 $18 = ($17|0)>(0);
 if ($18) {
  $19 = HEAP8[144>>0]|0;
  $20 = (($19) + 1)<<24>>24;
  HEAP8[144>>0] = $20;
  $21 = HEAP8[144>>0]|0;
  $22 = $21&255;
  $23 = ($22|0)>=(240);
  if ($23) {
   HEAP8[144>>0] = -128;
  }
 }
 $24 = HEAP8[168>>0]|0;
 $25 = $24&255;
 $26 = ($25|0)>(0);
 if ($26) {
  $27 = HEAP8[168>>0]|0;
  $28 = (($27) + 1)<<24>>24;
  HEAP8[168>>0] = $28;
  $29 = HEAP8[168>>0]|0;
  $30 = $29&255;
  $31 = ($30|0)>=(240);
  if ($31) {
   HEAP8[168>>0] = -128;
  }
 }
 $32 = HEAP8[176>>0]|0;
 $33 = $32&255;
 $34 = ($33|0)>(0);
 if ($34) {
  $35 = HEAP8[176>>0]|0;
  $36 = (($35) + 1)<<24>>24;
  HEAP8[176>>0] = $36;
  $37 = HEAP8[176>>0]|0;
  $38 = $37&255;
  $39 = ($38|0)>=(240);
  if ($39) {
   HEAP8[176>>0] = -128;
  }
 }
 $40 = HEAP8[192>>0]|0;
 $41 = $40&255;
 $42 = ($41|0)>(0);
 if ($42) {
  $43 = HEAP8[192>>0]|0;
  $44 = (($43) + 1)<<24>>24;
  HEAP8[192>>0] = $44;
  $45 = HEAP8[192>>0]|0;
  $46 = $45&255;
  $47 = ($46|0)>=(55);
  if ($47) {
   HEAP8[192>>0] = 45;
   HEAP8[200>>0] = 1;
  }
 }
 $48 = HEAP8[184>>0]|0;
 $49 = $48&255;
 $50 = ($49|0)>(0);
 if ($50) {
  $51 = HEAP8[184>>0]|0;
  $52 = (($51) + 1)<<24>>24;
  HEAP8[184>>0] = $52;
  $53 = HEAP8[184>>0]|0;
  $54 = $53&255;
  $55 = ($54|0)>=(240);
  if ($55) {
   HEAP8[184>>0] = -128;
  }
 }
 $56 = HEAP8[8>>0]|0;
 $57 = $56&255;
 $58 = HEAP8[232>>0]|0;
 $59 = $58&255;
 $60 = ($57|0)!=($59|0);
 if ($60) {
  $61 = HEAP8[184>>0]|0;
  $62 = $61&255;
  $63 = $62 & 15;
  $64 = ($63|0)>=(7);
  if ($64) {
   _set_rjm_leds();
  } else {
   _clear_rjm_leds();
  }
 }
 $65 = HEAP8[160>>0]|0;
 $66 = $65&255;
 $67 = ($66|0)>=(76);
 if ($67) {
  $68 = HEAP8[160>>0]|0;
  $69 = $68&255;
  $70 = $69 & 15;
  $71 = ($70|0)>=(7);
  if ($71) {
   $72 = HEAP8[312>>0]|0;
   $73 = $72 & 1;
   $74 = $73&255;
   $75 = ($74|0)!=(0);
   if ($75) {
    $76 = HEAP8[80>>0]|0;
    $77 = $76 & -2;
    $78 = $77 | 1;
    HEAP8[80>>0] = $78;
   }
   $79 = HEAP8[312>>0]|0;
   $80 = ($79&255) >>> 1;
   $81 = $80 & 1;
   $82 = $81&255;
   $83 = ($82|0)!=(0);
   if ($83) {
    $84 = HEAP8[80>>0]|0;
    $85 = $84 & -3;
    $86 = $85 | 2;
    HEAP8[80>>0] = $86;
   }
  } else {
   $87 = HEAP8[312>>0]|0;
   $88 = $87 & 1;
   $89 = $88&255;
   $90 = ($89|0)!=(0);
   if ($90) {
    $91 = HEAP8[80>>0]|0;
    $92 = $91 & -2;
    HEAP8[80>>0] = $92;
   }
   $93 = HEAP8[312>>0]|0;
   $94 = ($93&255) >>> 1;
   $95 = $94 & 1;
   $96 = $95&255;
   $97 = ($96|0)!=(0);
   if ($97) {
    $98 = HEAP8[80>>0]|0;
    $99 = $98 & -3;
    HEAP8[80>>0] = $99;
   }
  }
  _send_leds();
 }
 $100 = HEAP8[152>>0]|0;
 $101 = $100&255;
 $102 = ($101|0)>=(31);
 if ($102) {
  $103 = HEAP8[152>>0]|0;
  $104 = $103&255;
  $105 = $104 & 15;
  $106 = ($105|0)>=(7);
  if ($106) {
   $107 = HEAP8[56>>0]|0;
   $108 = $107&255;
   $109 = (((16 + 25|0)) + ($108)|0);
   $110 = HEAP8[$109>>0]|0;
   $111 = $110&255;
   $112 = HEAP8[((312 + 4|0))>>0]|0;
   $113 = $112&255;
   $114 = $113 ^ -1;
   $115 = $111 & $114;
   $116 = $115 & -193;
   $117 = HEAP8[((80 + 4|0))>>0]|0;
   $118 = $117&255;
   $119 = $118 & 192;
   $120 = $116 | $119;
   $121 = $120&255;
   HEAP8[((80 + 4|0))>>0] = $121;
  } else {
   $122 = HEAP8[56>>0]|0;
   $123 = $122&255;
   $124 = (((16 + 25|0)) + ($123)|0);
   $125 = HEAP8[$124>>0]|0;
   $126 = $125&255;
   $127 = HEAP8[((312 + 4|0))>>0]|0;
   $128 = $127&255;
   $129 = $126 | $128;
   $130 = $129 & -193;
   $131 = HEAP8[((80 + 4|0))>>0]|0;
   $132 = $131&255;
   $133 = $132 & 192;
   $134 = $130 | $133;
   $135 = $134&255;
   HEAP8[((80 + 4|0))>>0] = $135;
  }
  _send_leds();
 }
 $136 = HEAP8[208>>0]|0;
 $137 = ($136<<24>>24)!=(0);
 if (!($137)) {
  STACKTOP = sp;return;
 }
 $138 = HEAP8[208>>0]|0;
 $139 = (($138) + -1)<<24>>24;
 HEAP8[208>>0] = $139;
 $140 = ($139<<24>>24)!=(0);
 if ($140) {
  $152 = HEAP8[208>>0]|0;
  $153 = $152&255;
  $154 = $153 & 15;
  $155 = ($154|0)>=(7);
  if ($155) {
   $156 = HEAP8[((80 + 4|0))>>0]|0;
   $157 = $156&255;
   $158 = $157 & 192;
   $159 = 63 | $158;
   $160 = $159&255;
   HEAP8[((80 + 4|0))>>0] = $160;
  } else {
   $161 = HEAP8[((80 + 4|0))>>0]|0;
   $162 = $161&255;
   $163 = $162 & 192;
   $164 = $163&255;
   HEAP8[((80 + 4|0))>>0] = $164;
  }
  _send_leds();
 } else {
  $141 = HEAP8[56>>0]|0;
  $142 = $141&255;
  $143 = (((16 + 25|0)) + ($142)|0);
  $144 = HEAP8[$143>>0]|0;
  $145 = $144&255;
  $146 = $145 & -193;
  $147 = HEAP8[((80 + 4|0))>>0]|0;
  $148 = $147&255;
  $149 = $148 & 192;
  $150 = $146 | $149;
  $151 = $150&255;
  HEAP8[((80 + 4|0))>>0] = $151;
  _send_leds();
 }
 STACKTOP = sp;return;
}
function _prog_next() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[8>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)!=(127);
 if ($2) {
  $3 = HEAP8[8>>0]|0;
  $4 = (($3) + 1)<<24>>24;
  HEAP8[8>>0] = $4;
 }
 _set_gmaj_program();
 STACKTOP = sp;return;
}
function _prog_prev() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[8>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)!=(0);
 if ($2) {
  $3 = HEAP8[8>>0]|0;
  $4 = (($3) + -1)<<24>>24;
  HEAP8[8>>0] = $4;
 }
 _set_gmaj_program();
 STACKTOP = sp;return;
}
function _song_next() {
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[320>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)==(0);
 if ($2) {
  STACKTOP = sp;return;
 }
 $3 = HEAP8[120>>0]|0;
 $4 = $3&255;
 $5 = HEAP8[320>>0]|0;
 $6 = $5&255;
 $7 = (($6) - 1)|0;
 $8 = ($4|0)<($7|0);
 if ($8) {
  $9 = HEAP8[120>>0]|0;
  $10 = (($9) + 1)<<24>>24;
  HEAP8[120>>0] = $10;
 }
 _set_gmaj_program();
 STACKTOP = sp;return;
}
function _song_prev() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[120>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)!=(0);
 if ($2) {
  $3 = HEAP8[120>>0]|0;
  $4 = (($3) + -1)<<24>>24;
  HEAP8[120>>0] = $4;
 }
 _set_gmaj_program();
 STACKTOP = sp;return;
}
function _handle_mode_0() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0;
 var $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0;
 var $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0;
 var $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0;
 var $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0;
 var $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_is_top_button_pressed(1)|0);
 $1 = ($0<<24>>24)!=(0);
 if ($1) {
  _gmaj_toggle_cc(0);
  HEAP8[152>>0] = 1;
 } else {
  $2 = (_is_top_button_released(1)|0);
  $3 = $2&255;
  $4 = ($3|0)!=(0);
  if ($4) {
   $5 = HEAP8[152>>0]|0;
   $6 = $5&255;
   $7 = ($6|0)>=(31);
   if ($7) {
    HEAP8[152>>0] = 0;
    _gmaj_toggle_cc(0);
   }
  }
 }
 $8 = (_is_top_button_pressed(2)|0);
 $9 = ($8<<24>>24)!=(0);
 if ($9) {
  _gmaj_toggle_cc(1);
  HEAP8[152>>0] = 1;
 } else {
  $10 = (_is_top_button_released(2)|0);
  $11 = $10&255;
  $12 = ($11|0)!=(0);
  if ($12) {
   $13 = HEAP8[152>>0]|0;
   $14 = $13&255;
   $15 = ($14|0)>=(31);
   if ($15) {
    HEAP8[152>>0] = 0;
    _gmaj_toggle_cc(1);
   }
  }
 }
 $16 = (_is_top_button_pressed(4)|0);
 $17 = ($16<<24>>24)!=(0);
 if ($17) {
  _gmaj_toggle_cc(2);
  HEAP8[152>>0] = 1;
 } else {
  $18 = (_is_top_button_released(4)|0);
  $19 = $18&255;
  $20 = ($19|0)!=(0);
  if ($20) {
   $21 = HEAP8[152>>0]|0;
   $22 = $21&255;
   $23 = ($22|0)>=(31);
   if ($23) {
    HEAP8[152>>0] = 0;
    _gmaj_toggle_cc(2);
   }
  }
 }
 $24 = (_is_top_button_pressed(8)|0);
 $25 = ($24<<24>>24)!=(0);
 if ($25) {
  _gmaj_toggle_cc(3);
  HEAP8[152>>0] = 1;
 } else {
  $26 = (_is_top_button_released(8)|0);
  $27 = $26&255;
  $28 = ($27|0)!=(0);
  if ($28) {
   $29 = HEAP8[152>>0]|0;
   $30 = $29&255;
   $31 = ($30|0)>=(31);
   if ($31) {
    HEAP8[152>>0] = 0;
    _gmaj_toggle_cc(3);
   }
  }
 }
 $32 = (_is_top_button_pressed(16)|0);
 $33 = ($32<<24>>24)!=(0);
 if ($33) {
  _gmaj_toggle_cc(4);
  HEAP8[152>>0] = 1;
 } else {
  $34 = (_is_top_button_released(16)|0);
  $35 = $34&255;
  $36 = ($35|0)!=(0);
  if ($36) {
   $37 = HEAP8[152>>0]|0;
   $38 = $37&255;
   $39 = ($38|0)>=(31);
   if ($39) {
    HEAP8[152>>0] = 0;
    _gmaj_toggle_cc(4);
   }
  }
 }
 $40 = (_is_top_button_pressed(32)|0);
 $41 = ($40<<24>>24)!=(0);
 if ($41) {
  _gmaj_toggle_cc(5);
  HEAP8[152>>0] = 1;
 } else {
  $42 = (_is_top_button_released(32)|0);
  $43 = $42&255;
  $44 = ($43|0)!=(0);
  if ($44) {
   $45 = HEAP8[152>>0]|0;
   $46 = $45&255;
   $47 = ($46|0)>=(31);
   if ($47) {
    HEAP8[152>>0] = 0;
    _gmaj_toggle_cc(5);
   }
  }
 }
 $48 = (_is_bot_button_pressed(1)|0);
 $49 = ($48<<24>>24)!=(0);
 if ($49) {
  _set_rjm_channel(0);
  _reset_tuner_mute();
 }
 $50 = (_is_bot_button_pressed(1)|0);
 $51 = ($50<<24>>24)!=(0);
 if ($51) {
  HEAP8[168>>0] = 1;
 } else {
  $52 = (_is_bot_button_held(1)|0);
  $53 = $52&255;
  $54 = ($53|0)!=(0);
  if ($54) {
   $55 = HEAP8[168>>0]|0;
   $56 = $55&255;
   $57 = ($56|0)>=(76);
   if ($57) {
    _enable_mute();
    HEAP8[168>>0] = 0;
   } else {
    label = 44;
   }
  } else {
   label = 44;
  }
  if ((label|0) == 44) {
   $58 = (_is_bot_button_released(1)|0);
   $59 = ($58<<24>>24)!=(0);
   if ($59) {
    HEAP8[168>>0] = 0;
   }
  }
 }
 $60 = (_is_bot_button_pressed(2)|0);
 $61 = ($60<<24>>24)!=(0);
 if ($61) {
  _set_rjm_channel(1);
  _reset_tuner_mute();
 }
 $62 = (_is_bot_button_pressed(4)|0);
 $63 = ($62<<24>>24)!=(0);
 if ($63) {
  _set_rjm_channel(2);
  _reset_tuner_mute();
 }
 $64 = (_is_bot_button_pressed(8)|0);
 $65 = ($64<<24>>24)!=(0);
 if ($65) {
  _set_rjm_channel(3);
  _reset_tuner_mute();
 }
 $66 = (_is_bot_button_pressed(16)|0);
 $67 = ($66<<24>>24)!=(0);
 if ($67) {
  _set_rjm_channel(4);
  _reset_tuner_mute();
 }
 $68 = (_is_bot_button_pressed(32)|0);
 $69 = ($68<<24>>24)!=(0);
 if ($69) {
  _set_rjm_channel(5);
  _reset_tuner_mute();
 }
 $70 = (_is_bot_button_pressed(64)|0);
 $71 = ($70<<24>>24)!=(0);
 if ($71) {
  $72 = HEAP8[224>>0]|0;
  $73 = $72&255;
  $74 = $73 ^ -1;
  $75 = $74 & 127;
  $76 = $75&255;
  HEAP8[224>>0] = $76;
  $77 = HEAP8[224>>0]|0;
  _gmaj_cc_set(80,$77);
  HEAP8[144>>0] = 1;
 } else {
  $78 = (_is_bot_button_held(64)|0);
  $79 = $78&255;
  $80 = ($79|0)!=(0);
  if ($80) {
   $81 = HEAP8[144>>0]|0;
   $82 = $81&255;
   $83 = ($82|0)>=(76);
   if ($83) {
    _store_program_state();
    HEAP8[208>>0] = 80;
    HEAP8[144>>0] = 0;
   } else {
    label = 63;
   }
  } else {
   label = 63;
  }
  if ((label|0) == 63) {
   $84 = (_is_bot_button_released(64)|0);
   $85 = ($84<<24>>24)!=(0);
   if ($85) {
    HEAP8[144>>0] = 0;
   }
  }
 }
 $86 = (_is_bot_button_pressed(-128)|0);
 $87 = ($86<<24>>24)!=(0);
 if ($87) {
  $88 = HEAP8[8>>0]|0;
  $89 = $88&255;
  $90 = HEAP8[232>>0]|0;
  $91 = $90&255;
  $92 = ($89|0)!=($91|0);
  if ($92) {
   $93 = HEAP8[232>>0]|0;
   HEAP8[8>>0] = $93;
   $94 = HEAP8[104>>0]|0;
   HEAP8[120>>0] = $94;
   _set_gmaj_program();
  } else {
   _reset_tuner_mute();
  }
  HEAP8[176>>0] = 1;
 } else {
  $95 = (_is_bot_button_held(-128)|0);
  $96 = $95&255;
  $97 = ($96|0)!=(0);
  if ($97) {
   $98 = HEAP8[176>>0]|0;
   $99 = $98&255;
   $100 = ($99|0)>=(76);
   if ($100) {
    HEAP8[176>>0] = 0;
    _switch_programming_mode(1);
   } else {
    label = 75;
   }
  } else {
   label = 75;
  }
  if ((label|0) == 75) {
   $101 = (_is_bot_button_released(-128)|0);
   $102 = ($101<<24>>24)!=(0);
   if ($102) {
    HEAP8[176>>0] = 0;
   }
  }
 }
 $103 = HEAP8[312>>0]|0;
 $104 = ($103&255) >>> 6;
 $105 = $104 & 1;
 $106 = $105&255;
 $107 = $106&255;
 $108 = HEAP8[80>>0]|0;
 $109 = $107 & 1;
 $110 = ($109 << 6)&255;
 $111 = $108 & -65;
 $112 = $111 | $110;
 HEAP8[80>>0] = $112;
 $113 = HEAP8[64>>0]|0;
 $114 = $113&255;
 $115 = ($114|0)==(0);
 if ($115) {
  $116 = (_is_top_button_pressed(-128)|0);
  $117 = ($116<<24>>24)!=(0);
  if ($117) {
   HEAP8[192>>0] = 1;
   _prog_next();
  } else {
   $118 = (_is_top_button_released(-128)|0);
   $119 = ($118<<24>>24)!=(0);
   if ($119) {
    HEAP8[192>>0] = 0;
   } else {
    $120 = (_is_top_button_held(-128)|0);
    $121 = ($120<<24>>24)!=(0);
    if ($121) {
     $122 = HEAP8[200>>0]|0;
     $123 = ($122<<24>>24)!=(0);
     if ($123) {
      HEAP8[200>>0] = 0;
      _prog_next();
     }
    }
   }
  }
  $124 = (_is_top_button_pressed(64)|0);
  $125 = ($124<<24>>24)!=(0);
  if ($125) {
   HEAP8[192>>0] = 1;
   _prog_prev();
  } else {
   $126 = (_is_top_button_released(64)|0);
   $127 = ($126<<24>>24)!=(0);
   if ($127) {
    HEAP8[192>>0] = 0;
   } else {
    $128 = (_is_top_button_held(64)|0);
    $129 = ($128<<24>>24)!=(0);
    if ($129) {
     $130 = HEAP8[200>>0]|0;
     $131 = ($130<<24>>24)!=(0);
     if ($131) {
      HEAP8[200>>0] = 0;
      _prog_prev();
     }
    }
   }
  }
  $148 = HEAP8[((312 + 4|0))>>0]|0;
  $149 = ($148&255) >>> 7;
  $150 = $149&255;
  $151 = $150&255;
  $152 = HEAP8[((80 + 4|0))>>0]|0;
  $153 = $151 & 1;
  $154 = ($153 << 7)&255;
  $155 = $152 & 127;
  $156 = $155 | $154;
  HEAP8[((80 + 4|0))>>0] = $156;
  $157 = HEAP8[((312 + 4|0))>>0]|0;
  $158 = ($157&255) >>> 6;
  $159 = $158 & 1;
  $160 = $159&255;
  $161 = $160&255;
  $162 = HEAP8[((80 + 4|0))>>0]|0;
  $163 = $161 & 1;
  $164 = ($163 << 6)&255;
  $165 = $162 & -65;
  $166 = $165 | $164;
  HEAP8[((80 + 4|0))>>0] = $166;
  _send_leds();
  STACKTOP = sp;return;
 } else {
  $132 = (_is_top_button_pressed(-128)|0);
  $133 = ($132<<24>>24)!=(0);
  if ($133) {
   HEAP8[192>>0] = 1;
   _song_next();
  } else {
   $134 = (_is_top_button_released(-128)|0);
   $135 = ($134<<24>>24)!=(0);
   if ($135) {
    HEAP8[192>>0] = 0;
   } else {
    $136 = (_is_top_button_held(-128)|0);
    $137 = ($136<<24>>24)!=(0);
    if ($137) {
     $138 = HEAP8[200>>0]|0;
     $139 = ($138<<24>>24)!=(0);
     if ($139) {
      HEAP8[200>>0] = 0;
      _song_next();
     }
    }
   }
  }
  $140 = (_is_top_button_pressed(64)|0);
  $141 = ($140<<24>>24)!=(0);
  if ($141) {
   HEAP8[192>>0] = 1;
   _song_prev();
  } else {
   $142 = (_is_top_button_released(64)|0);
   $143 = ($142<<24>>24)!=(0);
   if ($143) {
    HEAP8[192>>0] = 0;
   } else {
    $144 = (_is_top_button_held(64)|0);
    $145 = ($144<<24>>24)!=(0);
    if ($145) {
     $146 = HEAP8[200>>0]|0;
     $147 = ($146<<24>>24)!=(0);
     if ($147) {
      HEAP8[200>>0] = 0;
      _song_prev();
     }
    }
   }
  }
  $148 = HEAP8[((312 + 4|0))>>0]|0;
  $149 = ($148&255) >>> 7;
  $150 = $149&255;
  $151 = $150&255;
  $152 = HEAP8[((80 + 4|0))>>0]|0;
  $153 = $151 & 1;
  $154 = ($153 << 7)&255;
  $155 = $152 & 127;
  $156 = $155 | $154;
  HEAP8[((80 + 4|0))>>0] = $156;
  $157 = HEAP8[((312 + 4|0))>>0]|0;
  $158 = ($157&255) >>> 6;
  $159 = $158 & 1;
  $160 = $159&255;
  $161 = $160&255;
  $162 = HEAP8[((80 + 4|0))>>0]|0;
  $163 = $161 & 1;
  $164 = ($163 << 6)&255;
  $165 = $162 & -65;
  $166 = $165 | $164;
  HEAP8[((80 + 4|0))>>0] = $166;
  _send_leds();
  STACKTOP = sp;return;
 }
}
function _handle_mode_1() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[352>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)==(0);
 if (!($2)) {
  $45 = (_is_bot_button_pressed(1)|0);
  $46 = ($45<<24>>24)!=(0);
  if ($46) {
   $47 = HEAP8[360>>0]|0;
   _remap_preset($47,0);
   _switch_mode_1_alt(0);
  }
  $48 = (_is_bot_button_pressed(2)|0);
  $49 = ($48<<24>>24)!=(0);
  if ($49) {
   $50 = HEAP8[360>>0]|0;
   _remap_preset($50,1);
   _switch_mode_1_alt(0);
  }
  $51 = (_is_bot_button_pressed(4)|0);
  $52 = ($51<<24>>24)!=(0);
  if ($52) {
   $53 = HEAP8[360>>0]|0;
   _remap_preset($53,2);
   _switch_mode_1_alt(0);
  }
  $54 = (_is_bot_button_pressed(8)|0);
  $55 = ($54<<24>>24)!=(0);
  if ($55) {
   $56 = HEAP8[360>>0]|0;
   _remap_preset($56,3);
   _switch_mode_1_alt(0);
  }
  $57 = (_is_bot_button_pressed(16)|0);
  $58 = ($57<<24>>24)!=(0);
  if ($58) {
   $59 = HEAP8[360>>0]|0;
   _remap_preset($59,4);
   _switch_mode_1_alt(0);
  }
  $60 = (_is_bot_button_pressed(32)|0);
  $61 = ($60<<24>>24)!=(0);
  if ($61) {
   $62 = HEAP8[360>>0]|0;
   _remap_preset($62,5);
   _switch_mode_1_alt(0);
  }
  $63 = (_is_bot_button_pressed(-128)|0);
  $64 = ($63<<24>>24)!=(0);
  if ($64) {
   _switch_mode_1_alt(0);
  }
  _send_leds();
  STACKTOP = sp;return;
 }
 $3 = (_is_bot_button_pressed(1)|0);
 $4 = ($3<<24>>24)!=(0);
 if ($4) {
  HEAP8[360>>0] = 0;
  _switch_mode_1_alt(1);
 }
 $5 = (_is_bot_button_pressed(2)|0);
 $6 = ($5<<24>>24)!=(0);
 if ($6) {
  HEAP8[360>>0] = 1;
  _switch_mode_1_alt(1);
 }
 $7 = (_is_bot_button_pressed(4)|0);
 $8 = ($7<<24>>24)!=(0);
 if ($8) {
  HEAP8[360>>0] = 2;
  _switch_mode_1_alt(1);
 }
 $9 = (_is_bot_button_pressed(8)|0);
 $10 = ($9<<24>>24)!=(0);
 if ($10) {
  HEAP8[360>>0] = 3;
  _switch_mode_1_alt(1);
 }
 $11 = (_is_bot_button_pressed(16)|0);
 $12 = ($11<<24>>24)!=(0);
 if ($12) {
  HEAP8[360>>0] = 4;
  _switch_mode_1_alt(1);
 }
 $13 = (_is_bot_button_pressed(32)|0);
 $14 = ($13<<24>>24)!=(0);
 if ($14) {
  HEAP8[360>>0] = 5;
  _switch_mode_1_alt(1);
 }
 $15 = (_is_top_button_pressed(1)|0);
 $16 = ($15<<24>>24)!=(0);
 if ($16) {
  _switch_mode(1);
 }
 $17 = (_is_top_button_pressed(2)|0);
 $18 = ($17<<24>>24)!=(0);
 if ($18) {
  _switch_mode(0);
 }
 $19 = (_is_top_button_pressed(4)|0);
 $20 = ($19<<24>>24)!=(0);
 if ($20) {
 }
 $21 = (_is_top_button_pressed(8)|0);
 $22 = ($21<<24>>24)!=(0);
 if ($22) {
 }
 $23 = (_is_top_button_pressed(16)|0);
 $24 = ($23<<24>>24)!=(0);
 if ($24) {
 }
 $25 = (_is_top_button_pressed(32)|0);
 $26 = ($25<<24>>24)!=(0);
 if ($26) {
 }
 $27 = (_is_bot_button_pressed(-128)|0);
 $28 = ($27<<24>>24)!=(0);
 if ($28) {
  _switch_programming_mode(0);
 }
 $29 = (_is_top_button_pressed(-128)|0);
 $30 = ($29<<24>>24)!=(0);
 if ($30) {
  $31 = HEAP8[112>>0]|0;
  $32 = $31&255;
  $33 = ($32|0)<(31);
  if ($33) {
   $34 = HEAP8[112>>0]|0;
   $35 = (($34) + 1)<<24>>24;
   HEAP8[112>>0] = $35;
   $36 = HEAP8[64>>0]|0;
   _switch_mode($36);
  }
 }
 $37 = (_is_top_button_pressed(64)|0);
 $38 = ($37<<24>>24)!=(0);
 if ($38) {
  $39 = HEAP8[112>>0]|0;
  $40 = $39&255;
  $41 = ($40|0)>(0);
  if ($41) {
   $42 = HEAP8[112>>0]|0;
   $43 = (($42) + -1)<<24>>24;
   HEAP8[112>>0] = $43;
   $44 = HEAP8[64>>0]|0;
   _switch_mode($44);
  }
 }
 _send_leds();
 STACKTOP = sp;return;
}
function _controller_handle() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $tmp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (_fsw_poll()|0);
 $tmp = $0;
 $1 = $tmp;
 $2 = $1&65535;
 $3 = $2 & 255;
 $4 = $3&255;
 HEAP8[312>>0] = $4;
 $5 = $tmp;
 $6 = $5&65535;
 $7 = $6 >> 8;
 $8 = $7 & 255;
 $9 = $8&255;
 HEAP8[((312 + 4|0))>>0] = $9;
 $10 = HEAP8[72>>0]|0;
 $11 = $10&255;
 $12 = ($11|0)==(0);
 if ($12) {
  _handle_mode_0();
 } else {
  $13 = HEAP8[72>>0]|0;
  $14 = $13&255;
  $15 = ($14|0)==(1);
  if ($15) {
   _handle_mode_1();
  }
 }
 ;HEAP32[368+0>>2]=HEAP32[312+0>>2]|0;HEAP32[368+4>>2]=HEAP32[312+4>>2]|0;
 STACKTOP = sp;return;
}
function _ritoa($s,$n,$i) {
 $s = $s|0;
 $n = $n|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $s;
 $1 = $n;
 $2 = $i;
 while(1) {
  $3 = $1;
  $4 = $3&255;
  $5 = (($4|0) % 10)&-1;
  $6 = (($5) + 48)|0;
  $7 = $6&255;
  $8 = $2;
  $9 = (($8) + -1)<<24>>24;
  $2 = $9;
  $10 = $8 << 24 >> 24;
  $11 = $0;
  $12 = (($11) + ($10)|0);
  HEAP8[$12>>0] = $7;
  $13 = $1;
  $14 = $13&255;
  $15 = (($14|0) / 10)&-1;
  $16 = $15&255;
  $1 = $16;
  $17 = $16&255;
  $18 = ($17|0)>(0);
  if (!($18)) {
   break;
  }
 }
 $19 = $2;
 STACKTOP = sp;return ($19|0);
}
function _update_lcd() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0;
 var $dd = 0, $i = 0, $mm = 0, $yyyy = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = HEAP8[72>>0]|0;
 $1 = ($0<<24>>24)!=(0);
 if ($1) {
  $i = 0;
  while(1) {
   $2 = $i;
   $3 = $2 << 24 >> 24;
   $4 = ($3|0)<(20);
   if (!($4)) {
    break;
   }
   $5 = $i;
   $6 = $5 << 24 >> 24;
   $7 = (456 + ($6)|0);
   $8 = HEAP8[$7>>0]|0;
   $9 = $i;
   $10 = $9 << 24 >> 24;
   $11 = HEAP32[248>>2]|0;
   $12 = (($11) + ($10)|0);
   HEAP8[$12>>0] = $8;
   $13 = $i;
   $14 = (($13) + 1)<<24>>24;
   $i = $14;
  }
 } else {
  $15 = HEAP8[8>>0]|0;
  $16 = $15&255;
  $17 = HEAP8[232>>0]|0;
  $18 = $17&255;
  $19 = ($16|0)!=($18|0);
  if ($19) {
   $i = 0;
   while(1) {
    $20 = $i;
    $21 = $20 << 24 >> 24;
    $22 = ($21|0)<(20);
    if (!($22)) {
     break;
    }
    $23 = $i;
    $24 = $23 << 24 >> 24;
    $25 = (480 + ($24)|0);
    $26 = HEAP8[$25>>0]|0;
    $27 = $i;
    $28 = $27 << 24 >> 24;
    $29 = HEAP32[248>>2]|0;
    $30 = (($29) + ($28)|0);
    HEAP8[$30>>0] = $26;
    $31 = $i;
    $32 = (($31) + 1)<<24>>24;
    $i = $32;
   }
  } else {
   $i = 0;
   while(1) {
    $33 = $i;
    $34 = $33 << 24 >> 24;
    $35 = ($34|0)<(20);
    if (!($35)) {
     break;
    }
    $36 = $i;
    $37 = $36 << 24 >> 24;
    $38 = (264 + ($37)|0);
    $39 = HEAP8[$38>>0]|0;
    $40 = $i;
    $41 = $40 << 24 >> 24;
    $42 = HEAP32[248>>2]|0;
    $43 = (($42) + ($41)|0);
    HEAP8[$43>>0] = $39;
    $44 = $i;
    $45 = (($44) + 1)<<24>>24;
    $i = $45;
   }
  }
 }
 $46 = HEAP8[64>>0]|0;
 $47 = $46&255;
 $48 = ($47|0)==(0);
 if ($48) {
  $i = 0;
  while(1) {
   $49 = $i;
   $50 = $49 << 24 >> 24;
   $51 = ($50|0)<(20);
   if (!($51)) {
    break;
   }
   $52 = $i;
   $53 = $52 << 24 >> 24;
   $54 = (504 + ($53)|0);
   $55 = HEAP8[$54>>0]|0;
   $56 = $i;
   $57 = $56 << 24 >> 24;
   $58 = HEAP32[((248 + 4|0))>>2]|0;
   $59 = (($58) + ($57)|0);
   HEAP8[$59>>0] = $55;
   $60 = $i;
   $61 = (($60) + 1)<<24>>24;
   $i = $61;
  }
 } else {
  $62 = HEAP8[((320 + 2|0))>>0]|0;
  $63 = $62&255;
  $64 = $63 >> 1;
  $65 = $64&255;
  $yyyy = $65;
  $66 = HEAP8[((320 + 2|0))>>0]|0;
  $67 = $66&255;
  $68 = $67 & 1;
  $69 = $68 << 4;
  $70 = HEAP8[((320 + 1|0))>>0]|0;
  $71 = $70&255;
  $72 = $71 >> 5;
  $73 = $69 | $72;
  $74 = $73&255;
  $mm = $74;
  $75 = HEAP8[((320 + 1|0))>>0]|0;
  $76 = $75&255;
  $77 = $76 & 31;
  $78 = $77&255;
  $dd = $78;
  $i = 0;
  while(1) {
   $79 = $i;
   $80 = $79 << 24 >> 24;
   $81 = ($80|0)<(20);
   if (!($81)) {
    break;
   }
   $82 = $i;
   $83 = $82 << 24 >> 24;
   $84 = (528 + ($83)|0);
   $85 = HEAP8[$84>>0]|0;
   $86 = $i;
   $87 = $86 << 24 >> 24;
   $88 = HEAP32[((248 + 4|0))>>2]|0;
   $89 = (($88) + ($87)|0);
   HEAP8[$89>>0] = $85;
   $90 = $i;
   $91 = (($90) + 1)<<24>>24;
   $i = $91;
  }
  $92 = HEAP32[((248 + 4|0))>>2]|0;
  $93 = HEAP8[112>>0]|0;
  $94 = $93&255;
  $95 = (($94) + 1)|0;
  $96 = $95&255;
  (_litoa($92,$96,1)|0);
  $97 = HEAP32[((248 + 4|0))>>2]|0;
  $98 = $yyyy;
  $99 = $98&255;
  $100 = (($99) + 14)|0;
  $101 = $100&255;
  (_ritoa($97,$101,7)|0);
  $102 = HEAP32[((248 + 4|0))>>2]|0;
  $103 = $mm;
  $104 = $103&255;
  $105 = (($104) + 1)|0;
  $106 = $105&255;
  (_ritoa($102,$106,10)|0);
  $107 = HEAP32[((248 + 4|0))>>2]|0;
  $108 = $dd;
  $109 = $108&255;
  $110 = (($109) + 1)|0;
  $111 = $110&255;
  (_ritoa($107,$111,13)|0);
  $112 = HEAP32[((248 + 4|0))>>2]|0;
  $113 = HEAP8[120>>0]|0;
  $114 = $113&255;
  $115 = (($114) + 1)|0;
  $116 = $115&255;
  (_ritoa($112,$116,19)|0);
 }
 $117 = HEAP32[((248 + 8|0))>>2]|0;
 $118 = HEAP8[8>>0]|0;
 $119 = $118&255;
 $120 = (($119) + 1)|0;
 $121 = $120&255;
 $122 = (_ritoa($117,$121,19)|0);
 $i = $122;
 while(1) {
  $123 = $i;
  $124 = $123 << 24 >> 24;
  $125 = ($124|0)>(16);
  if (!($125)) {
   break;
  }
  $126 = $i;
  $127 = $126 << 24 >> 24;
  $128 = HEAP32[((248 + 8|0))>>2]|0;
  $129 = (($128) + ($127)|0);
  HEAP8[$129>>0] = 32;
  $130 = $i;
  $131 = (($130) + -1)<<24>>24;
  $i = $131;
 }
 $i = 0;
 while(1) {
  $132 = $i;
  $133 = $132 << 24 >> 24;
  $134 = ($133|0)<(20);
  if (!($134)) {
   break;
  }
  $135 = $i;
  $136 = $135 << 24 >> 24;
  $137 = (16 + ($136)|0);
  $138 = HEAP8[$137>>0]|0;
  $139 = $i;
  $140 = $139 << 24 >> 24;
  $141 = HEAP32[((248 + 12|0))>>2]|0;
  $142 = (($141) + ($140)|0);
  HEAP8[$142>>0] = $138;
  $143 = $i;
  $144 = $143 << 24 >> 24;
  $145 = (16 + ($144)|0);
  $146 = HEAP8[$145>>0]|0;
  $147 = $146&255;
  $148 = ($147|0)==(0);
  if ($148) {
   label = 37;
   break;
  }
  $149 = $i;
  $150 = (($149) + 1)<<24>>24;
  $i = $150;
 }
 if ((label|0) == 37) {
 }
 while(1) {
  $151 = $i;
  $152 = $151 << 24 >> 24;
  $153 = ($152|0)<(20);
  if (!($153)) {
   break;
  }
  $154 = $i;
  $155 = $154 << 24 >> 24;
  $156 = HEAP32[((248 + 12|0))>>2]|0;
  $157 = (($156) + ($155)|0);
  HEAP8[$157>>0] = 32;
  $158 = $i;
  $159 = (($158) + 1)<<24>>24;
  $i = $159;
 }
 _lcd_updated_all();
 STACKTOP = sp;return;
}
function _switch_mode($new_mode) {
 $new_mode = $new_mode|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $new_mode;
 $1 = $0;
 HEAP8[64>>0] = $1;
 $2 = HEAP8[64>>0]|0;
 $3 = $2&255;
 $4 = ($3|0)==(1);
 if (!($4)) {
  _update_lcd();
  STACKTOP = sp;return;
 }
 $5 = HEAP8[112>>0]|0;
 $6 = $5&255;
 $7 = $6&65535;
 $8 = $7<<5;
 $9 = (4096 + ($8))|0;
 $10 = $9&65535;
 _flash_load(($10|0),32,(320|0));
 HEAP8[120>>0] = 0;
 _set_gmaj_program();
 _update_lcd();
 STACKTOP = sp;return;
}
function _set_gmaj_program() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[64>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)==(1);
 if ($2) {
  $3 = HEAP8[120>>0]|0;
  $4 = $3&255;
  $5 = (((320 + 3|0)) + ($4)|0);
  $6 = HEAP8[$5>>0]|0;
  HEAP8[8>>0] = $6;
 }
 $7 = HEAP8[8>>0]|0;
 $8 = $7&255;
 $9 = HEAP8[232>>0]|0;
 $10 = $9&255;
 $11 = ($8|0)!=($10|0);
 if ($11) {
  HEAP8[184>>0] = 1;
 } else {
  HEAP8[184>>0] = 0;
 }
 _load_program_state();
 $12 = HEAP8[56>>0]|0;
 $13 = $12&255;
 $14 = 1 << $13;
 $15 = HEAP8[80>>0]|0;
 $16 = $15&255;
 $17 = $16 & 192;
 $18 = $14 | $17;
 $19 = $18&255;
 HEAP8[80>>0] = $19;
 _send_leds();
 _update_lcd();
 STACKTOP = sp;return;
}
function _rjm_activate() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[8>>0]|0;
 $1 = $0&255;
 $2 = HEAP8[232>>0]|0;
 $3 = $2&255;
 $4 = ($1|0)!=($3|0);
 if ($4) {
  HEAP8[184>>0] = 0;
  $5 = HEAP8[8>>0]|0;
  _midi_send_cmd1(12,0,($5|0));
  $6 = HEAP8[8>>0]|0;
  HEAP8[232>>0] = $6;
  _update_lcd();
 }
 $7 = HEAP8[56>>0]|0;
 $8 = $7&255;
 $9 = (48 + ($8)|0);
 $10 = HEAP8[$9>>0]|0;
 $11 = $10&255;
 $12 = (($11) + 4)|0;
 $13 = $12&255;
 _midi_send_cmd1(12,1,($13|0));
 _update_effects_MIDI_state();
 _set_rjm_leds();
 _send_leds();
 STACKTOP = sp;return;
}
function _set_rjm_leds() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[56>>0]|0;
 $1 = $0&255;
 $2 = 1 << $1;
 $3 = HEAP8[80>>0]|0;
 $4 = $3&255;
 $5 = $4 & 192;
 $6 = $2 | $5;
 $7 = $6&255;
 HEAP8[80>>0] = $7;
 STACKTOP = sp;return;
}
function _clear_rjm_leds() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[80>>0]|0;
 $1 = $0&255;
 $2 = $1 & 192;
 $3 = $2&255;
 HEAP8[80>>0] = $3;
 STACKTOP = sp;return;
}
function _send_leds() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[72>>0]|0;
 $1 = $0&255;
 $2 = (80 + ($1<<3)|0);
 $3 = HEAP8[$2>>0]|0;
 $4 = $3&255;
 $5 = $4&65535;
 $6 = HEAP8[72>>0]|0;
 $7 = $6&255;
 $8 = (80 + ($7<<3)|0);
 $9 = (($8) + 4|0);
 $10 = HEAP8[$9>>0]|0;
 $11 = $10&255;
 $12 = $11&65535;
 $13 = $12 << 8;
 $14 = $5 | $13;
 $15 = $14&65535;
 HEAP16[128>>1] = $15;
 $16 = HEAP16[128>>1]|0;
 $17 = $16&65535;
 $18 = HEAP16[136>>1]|0;
 $19 = $18&65535;
 $20 = ($17|0)!=($19|0);
 if (!($20)) {
  STACKTOP = sp;return;
 }
 $21 = HEAP16[128>>1]|0;
 _led_set(($21|0));
 $22 = HEAP16[128>>1]|0;
 HEAP16[136>>1] = $22;
 STACKTOP = sp;return;
}
function _is_top_button_pressed($mask) {
 $mask = $mask|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mask;
 $1 = HEAP8[((312 + 4|0))>>0]|0;
 $2 = $1&255;
 $3 = $0;
 $4 = $3&255;
 $5 = $2 & $4;
 $6 = $0;
 $7 = $6&255;
 $8 = ($5|0)==($7|0);
 if (!($8)) {
  $16 = 0;
  $15 = $16&1;
  $17 = $15&255;
  STACKTOP = sp;return ($17|0);
 }
 $9 = HEAP8[((368 + 4|0))>>0]|0;
 $10 = $9&255;
 $11 = $0;
 $12 = $11&255;
 $13 = $10 & $12;
 $14 = ($13|0)==(0);
 $16 = $14;
 $15 = $16&1;
 $17 = $15&255;
 STACKTOP = sp;return ($17|0);
}
function _gmaj_toggle_cc($idx) {
 $idx = $idx|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $idxMask = 0, $togglevalue = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $idx;
 $togglevalue = 0;
 $1 = $0;
 $2 = $1&255;
 $3 = ($2|0)<(6);
 if (!($3)) {
  ___assert_fail((432|0),(384|0),391,(440|0));
  // unreachable;
 }
 $4 = $0;
 $5 = $4&255;
 $6 = 1 << $5;
 $7 = $6&255;
 $idxMask = $7;
 $8 = $idxMask;
 $9 = $8&255;
 $10 = HEAP8[56>>0]|0;
 $11 = $10&255;
 $12 = (((16 + 25|0)) + ($11)|0);
 $13 = HEAP8[$12>>0]|0;
 $14 = $13&255;
 $15 = $14 ^ $9;
 $16 = $15&255;
 HEAP8[$12>>0] = $16;
 $17 = HEAP8[56>>0]|0;
 $18 = $17&255;
 $19 = (((16 + 25|0)) + ($18)|0);
 $20 = HEAP8[$19>>0]|0;
 $21 = $20&255;
 $22 = $idxMask;
 $23 = $22&255;
 $24 = $21 & $23;
 $25 = ($24|0)!=(0);
 if ($25) {
  $togglevalue = 127;
 }
 $26 = $0;
 $27 = $26&255;
 $28 = (240 + ($27)|0);
 $29 = HEAP8[$28>>0]|0;
 $30 = $togglevalue;
 _gmaj_cc_set($29,$30);
 $31 = HEAP8[56>>0]|0;
 $32 = $31&255;
 $33 = (((16 + 25|0)) + ($32)|0);
 $34 = HEAP8[$33>>0]|0;
 $35 = $34&255;
 $36 = $35 & -193;
 $37 = HEAP8[((80 + 4|0))>>0]|0;
 $38 = $37&255;
 $39 = $38 & 192;
 $40 = $36 | $39;
 $41 = $40&255;
 HEAP8[((80 + 4|0))>>0] = $41;
 _send_leds();
 STACKTOP = sp;return;
}
function _is_top_button_released($mask) {
 $mask = $mask|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mask;
 $1 = HEAP8[((368 + 4|0))>>0]|0;
 $2 = $1&255;
 $3 = $0;
 $4 = $3&255;
 $5 = $2 & $4;
 $6 = $0;
 $7 = $6&255;
 $8 = ($5|0)==($7|0);
 if (!($8)) {
  $16 = 0;
  $15 = $16&1;
  $17 = $15&255;
  STACKTOP = sp;return ($17|0);
 }
 $9 = HEAP8[((312 + 4|0))>>0]|0;
 $10 = $9&255;
 $11 = $0;
 $12 = $11&255;
 $13 = $10 & $12;
 $14 = ($13|0)==(0);
 $16 = $14;
 $15 = $16&1;
 $17 = $15&255;
 STACKTOP = sp;return ($17|0);
}
function _is_bot_button_pressed($mask) {
 $mask = $mask|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mask;
 $1 = HEAP8[312>>0]|0;
 $2 = $1&255;
 $3 = $0;
 $4 = $3&255;
 $5 = $2 & $4;
 $6 = $0;
 $7 = $6&255;
 $8 = ($5|0)==($7|0);
 if ($8) {
  $9 = HEAP8[368>>0]|0;
  $10 = $9&255;
  $11 = $0;
  $12 = $11&255;
  $13 = $10 & $12;
  $14 = ($13|0)==(0);
  $16 = $14;
 } else {
  $16 = 0;
 }
 $15 = $16&1;
 $17 = $15&255;
 STACKTOP = sp;return ($17|0);
}
function _set_rjm_channel($p) {
 $p = $p|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $p;
 $1 = $0;
 $2 = $1&255;
 $3 = ($2|0)<(6);
 if ($3) {
  $4 = HEAP8[120>>0]|0;
  HEAP8[104>>0] = $4;
  $5 = $0;
  HEAP8[56>>0] = $5;
  _rjm_activate();
  STACKTOP = sp;return;
 } else {
  ___assert_fail((376|0),(384|0),497,(416|0));
  // unreachable;
 }
}
function _reset_tuner_mute() {
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[216>>0]|0;
 $1 = ($0<<24>>24)!=(0);
 if ($1) {
  _disable_mute();
 }
 STACKTOP = sp;return;
}
function _is_bot_button_held($mask) {
 $mask = $mask|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mask;
 $1 = HEAP8[312>>0]|0;
 $2 = $1&255;
 $3 = $0;
 $4 = $3&255;
 $5 = $2 & $4;
 $6 = ($5|0)!=(0);
 $7 = $6&1;
 $8 = $7&255;
 STACKTOP = sp;return ($8|0);
}
function _enable_mute() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 HEAP8[216>>0] = 1;
 _gmaj_cc_set(81,127);
 _clear_rjm_leds();
 _send_leds();
 STACKTOP = sp;return;
}
function _is_bot_button_released($mask) {
 $mask = $mask|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mask;
 $1 = HEAP8[368>>0]|0;
 $2 = $1&255;
 $3 = $0;
 $4 = $3&255;
 $5 = $2 & $4;
 $6 = $0;
 $7 = $6&255;
 $8 = ($5|0)==($7|0);
 if ($8) {
  $9 = HEAP8[312>>0]|0;
  $10 = $9&255;
  $11 = $0;
  $12 = $11&255;
  $13 = $10 & $12;
  $14 = ($13|0)==(0);
  $16 = $14;
 } else {
  $16 = 0;
 }
 $15 = $16&1;
 $17 = $15&255;
 STACKTOP = sp;return ($17|0);
}
function _gmaj_cc_set($cc,$val) {
 $cc = $cc|0;
 $val = $val|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $cc;
 $1 = $val;
 $2 = $0;
 $3 = $1;
 _midi_send_cmd2(11,0,($2|0),($3|0));
 STACKTOP = sp;return;
}
function _store_program_state() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[56>>0]|0;
 HEAP8[((16 + 20|0))>>0] = $0;
 $1 = HEAP8[232>>0]|0;
 $2 = $1&255;
 $3 = $2&65535;
 $4 = $3<<5;
 $5 = $4&65535;
 _flash_store(($5|0),32,(16|0));
 STACKTOP = sp;return;
}
function _switch_programming_mode($new_mode) {
 $new_mode = $new_mode|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $new_mode;
 HEAP8[((80 + 12|0))>>0] = 0;
 HEAP8[((80 + 8|0))>>0] = 0;
 $1 = $0;
 HEAP8[72>>0] = $1;
 _update_lcd();
 STACKTOP = sp;return;
}
function _is_top_button_held($mask) {
 $mask = $mask|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mask;
 $1 = HEAP8[((312 + 4|0))>>0]|0;
 $2 = $1&255;
 $3 = $0;
 $4 = $3&255;
 $5 = $2 & $4;
 $6 = ($5|0)!=(0);
 $7 = $6&1;
 $8 = $7&255;
 STACKTOP = sp;return ($8|0);
}
function _switch_mode_1_alt($new_mode) {
 $new_mode = $new_mode|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $new_mode;
 $1 = $0;
 $2 = $1&255;
 $3 = ($2|0)==(0);
 if ($3) {
  HEAP8[((80 + 12|0))>>0] = 0;
  HEAP8[((80 + 8|0))>>0] = 0;
  $18 = $0;
  HEAP8[352>>0] = $18;
  STACKTOP = sp;return;
 }
 $4 = $0;
 $5 = $4&255;
 $6 = ($5|0)==(1);
 if ($6) {
  $7 = HEAP8[360>>0]|0;
  $8 = $7&255;
  $9 = 1 << $8;
  $10 = $9&255;
  HEAP8[((80 + 8|0))>>0] = $10;
  $11 = HEAP8[360>>0]|0;
  $12 = $11&255;
  $13 = (48 + ($12)|0);
  $14 = HEAP8[$13>>0]|0;
  $15 = $14&255;
  $16 = 1 << $15;
  $17 = $16&255;
  HEAP8[((80 + 12|0))>>0] = $17;
 }
 $18 = $0;
 HEAP8[352>>0] = $18;
 STACKTOP = sp;return;
}
function _remap_preset($preset,$new_rjm_channel) {
 $preset = $preset|0;
 $new_rjm_channel = $new_rjm_channel|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $descidx = 0, $lshr = 0, $mask = 0, $new_desc = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $preset;
 $1 = $new_rjm_channel;
 $2 = $0;
 $3 = $2&255;
 $4 = $3 >> 1;
 $5 = $4&255;
 $descidx = $5;
 $6 = $0;
 $7 = $6&255;
 $8 = $7 & 1;
 $9 = $8 << 2;
 $10 = $9&255;
 $lshr = $10;
 $11 = $lshr;
 $12 = $11&255;
 $13 = 240 >> $12;
 $14 = $13&255;
 $mask = $14;
 $15 = $1;
 $16 = $15&255;
 $17 = $16 >> 1;
 $18 = $17 & 3;
 $19 = $1;
 $20 = $19&255;
 $21 = $20 & 1;
 $22 = $21 << 2;
 $23 = $18 | $22;
 $24 = $23&255;
 $new_desc = $24;
 $25 = $descidx;
 $26 = $25&255;
 $27 = (((16 + 21|0)) + ($26)|0);
 $28 = HEAP8[$27>>0]|0;
 $29 = $28&255;
 $30 = $mask;
 $31 = $30&255;
 $32 = $29 & $31;
 $33 = $new_desc;
 $34 = $33&255;
 $35 = $lshr;
 $36 = $35&255;
 $37 = $34 << $36;
 $38 = $32 | $37;
 $39 = $38&255;
 $40 = $descidx;
 $41 = $40&255;
 $42 = (((16 + 21|0)) + ($41)|0);
 HEAP8[$42>>0] = $39;
 $43 = $1;
 $44 = $0;
 $45 = $44&255;
 $46 = (48 + ($45)|0);
 HEAP8[$46>>0] = $43;
 STACKTOP = sp;return;
}
function _litoa($s,$n,$i) {
 $s = $s|0;
 $n = $n|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $c = 0, $tmp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $tmp = sp + 5|0;
 $0 = $s;
 $1 = $n;
 $2 = $i;
 $c = 0;
 while(1) {
  $3 = $1;
  $4 = $3&255;
  $5 = (($4|0) % 10)&-1;
  $6 = (($5) + 48)|0;
  $7 = $6&255;
  $8 = $c;
  $9 = (($8) + 1)<<24>>24;
  $c = $9;
  $10 = $8 << 24 >> 24;
  $11 = (($tmp) + ($10)|0);
  HEAP8[$11>>0] = $7;
  $12 = $1;
  $13 = $12&255;
  $14 = (($13|0) / 10)&-1;
  $15 = $14&255;
  $1 = $15;
  $16 = $15&255;
  $17 = ($16|0)>(0);
  if (!($17)) {
   break;
  }
 }
 $18 = $c;
 $19 = (($18) + -1)<<24>>24;
 $c = $19;
 while(1) {
  $20 = $c;
  $21 = $20 << 24 >> 24;
  $22 = ($21|0)>=(0);
  if (!($22)) {
   break;
  }
  $23 = $c;
  $24 = $23 << 24 >> 24;
  $25 = (($tmp) + ($24)|0);
  $26 = HEAP8[$25>>0]|0;
  $27 = $2;
  $28 = $27 << 24 >> 24;
  $29 = $0;
  $30 = (($29) + ($28)|0);
  HEAP8[$30>>0] = $26;
  $31 = $c;
  $32 = (($31) + -1)<<24>>24;
  $c = $32;
  $33 = $2;
  $34 = (($33) + 1)<<24>>24;
  $2 = $34;
 }
 $35 = $2;
 STACKTOP = sp;return ($35|0);
}
function _update_effects_MIDI_state() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $fx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = HEAP8[56>>0]|0;
 $1 = $0&255;
 $2 = (((16 + 25|0)) + ($1)|0);
 $3 = HEAP8[$2>>0]|0;
 $fx = $3;
 $4 = $fx;
 $5 = $4&255;
 $6 = $5 & -193;
 $7 = HEAP8[((80 + 4|0))>>0]|0;
 $8 = $7&255;
 $9 = $8 & 192;
 $10 = $6 | $9;
 $11 = $10&255;
 HEAP8[((80 + 4|0))>>0] = $11;
 $12 = $fx;
 $13 = $12&255;
 $14 = $13 & 64;
 $15 = ($14|0)!=(0);
 $16 = $15 ? 127 : 0;
 $17 = $16&255;
 _gmaj_cc_set(90,$17);
 $18 = $fx;
 $19 = $18&255;
 $20 = $19 & 16;
 $21 = ($20|0)!=(0);
 $22 = $21 ? 127 : 0;
 $23 = $22&255;
 _gmaj_cc_set(88,$23);
 $24 = $fx;
 $25 = $24&255;
 $26 = $25 & 4;
 $27 = ($26|0)!=(0);
 $28 = $27 ? 127 : 0;
 $29 = $28&255;
 _gmaj_cc_set(86,$29);
 $30 = $fx;
 $31 = $30&255;
 $32 = $31 & 2;
 $33 = ($32|0)!=(0);
 $34 = $33 ? 127 : 0;
 $35 = $34&255;
 _gmaj_cc_set(85,$35);
 $36 = $fx;
 $37 = $36&255;
 $38 = $37 & 8;
 $39 = ($38|0)!=(0);
 $40 = $39 ? 127 : 0;
 $41 = $40&255;
 _gmaj_cc_set(87,$41);
 $42 = $fx;
 $43 = $42&255;
 $44 = $43 & 1;
 $45 = ($44|0)!=(0);
 $46 = $45 ? 127 : 0;
 $47 = $46&255;
 _gmaj_cc_set(84,$47);
 $48 = $fx;
 $49 = $48&255;
 $50 = $49 & 32;
 $51 = ($50|0)!=(0);
 $52 = $51 ? 127 : 0;
 $53 = $52&255;
 _gmaj_cc_set(89,$53);
 $54 = $fx;
 $55 = $54&255;
 $56 = $55 & 128;
 $57 = ($56|0)!=(0);
 $58 = $57 ? 127 : 0;
 $59 = $58&255;
 _gmaj_cc_set(91,$59);
 STACKTOP = sp;return;
}
function _disable_mute() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 HEAP8[216>>0] = 0;
 _gmaj_cc_set(81,0);
 _set_rjm_leds();
 _send_leds();
 STACKTOP = sp;return;
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i23$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i24$iZ2D = 0, $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi59$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre58$i$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i12$i = 0, $$sum$i13$i = 0;
 var $$sum$i16$i = 0, $$sum$i19$i = 0, $$sum$i2338 = 0, $$sum$i32 = 0, $$sum$i39 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i14$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum10$pre$i$i = 0, $$sum102$i = 0, $$sum103$i = 0, $$sum104$i = 0, $$sum105$i = 0, $$sum106$i = 0;
 var $$sum107$i = 0, $$sum108$i = 0, $$sum109$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum11$i22$i = 0, $$sum110$i = 0, $$sum111$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum14$pre$i = 0, $$sum15$i = 0;
 var $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0, $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i15$i = 0, $$sum2$i17$i = 0, $$sum2$i21$i = 0, $$sum2$pre$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0;
 var $$sum25$i$i = 0, $$sum26$pre$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i$i = 0, $$sum3$i27 = 0, $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0;
 var $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0, $$sum8$pre = 0, $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0;
 var $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0;
 var $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0;
 var $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0;
 var $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $108 = 0;
 var $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0;
 var $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0;
 var $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0;
 var $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0;
 var $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0;
 var $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0;
 var $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0;
 var $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0;
 var $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0;
 var $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0;
 var $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0;
 var $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0;
 var $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0;
 var $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0;
 var $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0;
 var $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0;
 var $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0;
 var $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0;
 var $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0;
 var $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0;
 var $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0;
 var $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0;
 var $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0;
 var $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0;
 var $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0;
 var $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0;
 var $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0;
 var $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0;
 var $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0;
 var $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0;
 var $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0;
 var $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0;
 var $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0;
 var $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0;
 var $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0;
 var $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0;
 var $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0;
 var $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0;
 var $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0;
 var $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0;
 var $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0;
 var $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0;
 var $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0;
 var $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0;
 var $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0;
 var $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0;
 var $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0;
 var $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0;
 var $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0;
 var $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0, $I1$0$c$i$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$027$i = 0, $K2$015$i$i = 0, $K8$053$i$i = 0;
 var $R$0$i = 0, $R$0$i$i = 0, $R$0$i18 = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i17 = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i26$i = 0, $T$014$i$i = 0, $T$026$i = 0, $T$052$i$i = 0, $br$0$i = 0, $br$030$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0;
 var $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i$i = 0, $or$cond$i27$i = 0, $or$cond$i29 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond24$i = 0, $or$cond3$i = 0, $or$cond4$i = 0, $or$cond47$i = 0, $or$cond5$i = 0, $or$cond6$i = 0, $or$cond8$i = 0;
 var $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i15 = 0, $rsize$1$i = 0, $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$073$i = 0, $sp$166$i = 0, $ssize$0$i = 0, $ssize$1$i = 0, $ssize$129$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0;
 var $t$1$i = 0, $t$2$ph$i = 0, $t$2$v$3$i = 0, $t$230$i = 0, $tbase$245$i = 0, $tsize$03141$i = 0, $tsize$1$i = 0, $tsize$244$i = 0, $v$0$i = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$332$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   if ($1) {
    $5 = 16;
   } else {
    $2 = (($bytes) + 11)|0;
    $3 = $2 & -8;
    $5 = $3;
   }
   $4 = $5 >>> 3;
   $6 = HEAP32[552>>2]|0;
   $7 = $6 >>> $4;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($4))|0;
    $13 = $12 << 1;
    $14 = ((552 + ($13<<2)|0) + 40|0);
    $$sum10 = (($13) + 2)|0;
    $15 = ((552 + ($$sum10<<2)|0) + 40|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = (($16) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[552>>2] = $22;
     } else {
      $23 = HEAP32[((552 + 16|0))>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = (($18) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = (($16) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    STACKTOP = sp;return ($mem$0|0);
   }
   $34 = HEAP32[((552 + 8|0))>>2]|0;
   $35 = ($5>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $4;
     $38 = 2 << $4;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = ((552 + ($65<<2)|0) + 40|0);
     $$sum4 = (($65) + 2)|0;
     $67 = ((552 + ($$sum4<<2)|0) + 40|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = (($68) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[552>>2] = $74;
       $89 = $34;
      } else {
       $75 = HEAP32[((552 + 16|0))>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = (($70) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[((552 + 8|0))>>2]|0;
        $89 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($5))|0;
     $82 = $5 | 3;
     $83 = (($68) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($5)|0);
     $85 = $81 | 1;
     $$sum56 = $5 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $88 = ($89|0)==(0);
     if (!($88)) {
      $90 = HEAP32[((552 + 20|0))>>2]|0;
      $91 = $89 >>> 3;
      $92 = $91 << 1;
      $93 = ((552 + ($92<<2)|0) + 40|0);
      $94 = HEAP32[552>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[552>>2] = $98;
       $$sum8$pre = (($92) + 2)|0;
       $$pre105 = ((552 + ($$sum8$pre<<2)|0) + 40|0);
       $$pre$phiZ2D = $$pre105;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = ((552 + ($$sum9<<2)|0) + 40|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[((552 + 16|0))>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = (($F4$0) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = (($90) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = (($90) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[((552 + 8|0))>>2] = $81;
     HEAP32[((552 + 20|0))>>2] = $84;
     $mem$0 = $69;
     STACKTOP = sp;return ($mem$0|0);
    }
    $106 = HEAP32[((552 + 4|0))>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $5;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = ((552 + ($130<<2)|0) + 304|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = (($132) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($5))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = (($t$0$i) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = (($t$0$i) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = (($144) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($5))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[((552 + 16|0))>>2]|0;
     $150 = ($v$0$i>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i) + ($5)|0);
     $152 = ($v$0$i>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = (($v$0$i) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = (($v$0$i) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i|0);
     do {
      if ($157) {
       $167 = (($v$0$i) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = (($v$0$i) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;$RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;$RP$0$i = $167;
       }
       while(1) {
        $173 = (($R$0$i) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = (($R$0$i) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i>>2] = 0;
        $R$1$i = $R$0$i;
        break;
       }
      } else {
       $158 = (($v$0$i) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = (($159) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = (($156) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = (($v$0$i) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ((552 + ($182<<2)|0) + 304|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[((552 + 4|0))>>2]|0;
         $189 = $188 & $187;
         HEAP32[((552 + 4|0))>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[((552 + 16|0))>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = (($154) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = (($154) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[((552 + 16|0))>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = (($R$1$i) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = (($v$0$i) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = (($R$1$i) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = (($201) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = (($v$0$i) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[((552 + 16|0))>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = (($R$1$i) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = (($207) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i) + ($5))|0;
      $215 = $214 | 3;
      $216 = (($v$0$i) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $5 | 3;
      $221 = (($v$0$i) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i | 1;
      $$sum$i39 = $5 | 4;
      $223 = (($v$0$i) + ($$sum$i39)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i) + ($5))|0;
      $224 = (($v$0$i) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i;
      $225 = HEAP32[((552 + 8|0))>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[((552 + 20|0))>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = ((552 + ($229<<2)|0) + 40|0);
       $231 = HEAP32[552>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[552>>2] = $235;
        $$sum2$pre$i = (($229) + 2)|0;
        $$pre$i = ((552 + ($$sum2$pre$i<<2)|0) + 40|0);
        $$pre$phi$iZ2D = $$pre$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = ((552 + ($$sum3$i<<2)|0) + 40|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[((552 + 16|0))>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = (($F1$0$i) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = (($227) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = (($227) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[((552 + 8|0))>>2] = $rsize$0$i;
      HEAP32[((552 + 20|0))>>2] = $151;
     }
     $243 = (($v$0$i) + 8|0);
     $mem$0 = $243;
     STACKTOP = sp;return ($mem$0|0);
    }
   } else {
    $nb$0 = $5;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[((552 + 4|0))>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = (($250) + 1048320)|0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = (($256) + 520192)|0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = (($261) + 245760)|0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = (14 - ($265))|0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = (($266) + ($268))|0;
       $270 = $269 << 1;
       $271 = (($269) + 7)|0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = ((552 + ($idx$0$i<<2)|0) + 304|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L126: do {
      if ($277) {
       $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
      } else {
       $278 = ($idx$0$i|0)==(31);
       if ($278) {
        $282 = 0;
       } else {
        $279 = $idx$0$i >>> 1;
        $280 = (25 - ($279))|0;
        $282 = $280;
       }
       $281 = $246 << $282;
       $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $281;$t$0$i14 = $276;$v$0$i16 = 0;
       while(1) {
        $283 = (($t$0$i14) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($rsize$0$i15>>>0);
        if ($287) {
         $288 = ($285|0)==($246|0);
         if ($288) {
          $rsize$2$i = $286;$t$1$i = $t$0$i14;$v$2$i = $t$0$i14;
          break L126;
         } else {
          $rsize$1$i = $286;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $289 = (($t$0$i14) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $sizebits$0$i >>> 31;
        $292 = ((($t$0$i14) + ($291<<2)|0) + 16|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     $298 = ($t$1$i|0)==(0|0);
     $299 = ($v$2$i|0)==(0|0);
     $or$cond$i = $298 & $299;
     if ($or$cond$i) {
      $300 = 2 << $idx$0$i;
      $301 = (0 - ($300))|0;
      $302 = $300 | $301;
      $303 = $247 & $302;
      $304 = ($303|0)==(0);
      if ($304) {
       $nb$0 = $246;
       break;
      }
      $305 = (0 - ($303))|0;
      $306 = $303 & $305;
      $307 = (($306) + -1)|0;
      $308 = $307 >>> 12;
      $309 = $308 & 16;
      $310 = $307 >>> $309;
      $311 = $310 >>> 5;
      $312 = $311 & 8;
      $313 = $312 | $309;
      $314 = $310 >>> $312;
      $315 = $314 >>> 2;
      $316 = $315 & 4;
      $317 = $313 | $316;
      $318 = $314 >>> $316;
      $319 = $318 >>> 1;
      $320 = $319 & 2;
      $321 = $317 | $320;
      $322 = $318 >>> $320;
      $323 = $322 >>> 1;
      $324 = $323 & 1;
      $325 = $321 | $324;
      $326 = $322 >>> $324;
      $327 = (($325) + ($326))|0;
      $328 = ((552 + ($327<<2)|0) + 304|0);
      $329 = HEAP32[$328>>2]|0;
      $t$2$ph$i = $329;
     } else {
      $t$2$ph$i = $t$1$i;
     }
     $330 = ($t$2$ph$i|0)==(0|0);
     if ($330) {
      $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$2$i;
     } else {
      $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$2$i;
      while(1) {
       $331 = (($t$230$i) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = (($t$230$i) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if (!($338)) {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $337;$v$332$i = $t$2$v$3$i;
        continue;
       }
       $339 = (($t$230$i) + 20|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $340;$v$332$i = $t$2$v$3$i;
       }
      }
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[((552 + 8|0))>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[((552 + 16|0))>>2]|0;
       $347 = ($v$3$lcssa$i>>>0)<($346>>>0);
       if ($347) {
        _abort();
        // unreachable;
       }
       $348 = (($v$3$lcssa$i) + ($246)|0);
       $349 = ($v$3$lcssa$i>>>0)<($348>>>0);
       if (!($349)) {
        _abort();
        // unreachable;
       }
       $350 = (($v$3$lcssa$i) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = (($v$3$lcssa$i) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = (($v$3$lcssa$i) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = (($v$3$lcssa$i) + 16|0);
          $368 = HEAP32[$367>>2]|0;
          $369 = ($368|0)==(0|0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $368;$RP$0$i17 = $367;
          }
         } else {
          $R$0$i18 = $365;$RP$0$i17 = $364;
         }
         while(1) {
          $370 = (($R$0$i18) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if (!($372)) {
           $R$0$i18 = $371;$RP$0$i17 = $370;
           continue;
          }
          $373 = (($R$0$i18) + 16|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if ($375) {
           break;
          } else {
           $R$0$i18 = $374;$RP$0$i17 = $373;
          }
         }
         $376 = ($RP$0$i17>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17>>2] = 0;
          $R$1$i20 = $R$0$i18;
          break;
         }
        } else {
         $355 = (($v$3$lcssa$i) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = (($356) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = (($353) + 8|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$3$lcssa$i|0);
         if ($363) {
          HEAP32[$358>>2] = $353;
          HEAP32[$361>>2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $377 = ($351|0)==(0|0);
       do {
        if (!($377)) {
         $378 = (($v$3$lcssa$i) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = ((552 + ($379<<2)|0) + 304|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[((552 + 4|0))>>2]|0;
           $386 = $385 & $384;
           HEAP32[((552 + 4|0))>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[((552 + 16|0))>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = (($351) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = (($351) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[((552 + 16|0))>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = (($R$1$i20) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = (($v$3$lcssa$i) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = (($R$1$i20) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = (($398) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = (($v$3$lcssa$i) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[((552 + 16|0))>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = (($R$1$i20) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = (($404) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L204: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2338 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2338)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = ((552 + ($424<<2)|0) + 40|0);
          $426 = HEAP32[552>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          do {
           if ($429) {
            $430 = $426 | $427;
            HEAP32[552>>2] = $430;
            $$sum14$pre$i = (($424) + 2)|0;
            $$pre$i25 = ((552 + ($$sum14$pre$i<<2)|0) + 40|0);
            $$pre$phi$i26Z2D = $$pre$i25;$F5$0$i = $425;
           } else {
            $$sum17$i = (($424) + 2)|0;
            $431 = ((552 + ($$sum17$i<<2)|0) + 40|0);
            $432 = HEAP32[$431>>2]|0;
            $433 = HEAP32[((552 + 16|0))>>2]|0;
            $434 = ($432>>>0)<($433>>>0);
            if (!($434)) {
             $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
             break;
            }
            _abort();
            // unreachable;
           }
          } while(0);
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = (($F5$0$i) + 12|0);
          HEAP32[$435>>2] = $348;
          $$sum15$i = (($246) + 8)|0;
          $436 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$436>>2] = $F5$0$i;
          $$sum16$i = (($246) + 12)|0;
          $437 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$437>>2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438|0)==(0);
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = (($438) + 1048320)|0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = (($444) + 520192)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = (($449) + 245760)|0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = (14 - ($453))|0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = (($454) + ($456))|0;
           $458 = $457 << 1;
           $459 = (($457) + 7)|0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = ((552 + ($I7$0$i<<2)|0) + 304|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[((552 + 4|0))>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[((552 + 4|0))>>2] = $471;
          HEAP32[$463>>2] = $348;
          $$sum5$i = (($246) + 24)|0;
          $472 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$472>>2] = $463;
          $$sum6$i = (($246) + 12)|0;
          $473 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$473>>2] = $348;
          $$sum7$i = (($246) + 8)|0;
          $474 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$474>>2] = $348;
          break;
         }
         $475 = HEAP32[$463>>2]|0;
         $476 = ($I7$0$i|0)==(31);
         if ($476) {
          $484 = 0;
         } else {
          $477 = $I7$0$i >>> 1;
          $478 = (25 - ($477))|0;
          $484 = $478;
         }
         $479 = (($475) + 4|0);
         $480 = HEAP32[$479>>2]|0;
         $481 = $480 & -8;
         $482 = ($481|0)==($rsize$3$lcssa$i|0);
         L225: do {
          if ($482) {
           $T$0$lcssa$i = $475;
          } else {
           $483 = $rsize$3$lcssa$i << $484;
           $K12$027$i = $483;$T$026$i = $475;
           while(1) {
            $491 = $K12$027$i >>> 31;
            $492 = ((($T$026$i) + ($491<<2)|0) + 16|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             break;
            }
            $485 = $K12$027$i << 1;
            $486 = (($487) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L225;
            } else {
             $K12$027$i = $485;$T$026$i = $487;
            }
           }
           $494 = HEAP32[((552 + 16|0))>>2]|0;
           $495 = ($492>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$492>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$026$i;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L204;
           }
          }
         } while(0);
         $499 = (($T$0$lcssa$i) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[((552 + 16|0))>>2]|0;
         $502 = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = ($500>>>0)>=($501>>>0);
         $or$cond24$i = $502 & $503;
         if ($or$cond24$i) {
          $504 = (($500) + 12|0);
          HEAP32[$504>>2] = $348;
          HEAP32[$499>>2] = $348;
          $$sum8$i = (($246) + 8)|0;
          $505 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$505>>2] = $500;
          $$sum9$i = (($246) + 12)|0;
          $506 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$506>>2] = $T$0$lcssa$i;
          $$sum10$i = (($246) + 24)|0;
          $507 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$507>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $508 = (($v$3$lcssa$i) + 8|0);
       $mem$0 = $508;
       STACKTOP = sp;return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[((552 + 8|0))>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[((552 + 20|0))>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[((552 + 20|0))>>2] = $514;
   HEAP32[((552 + 8|0))>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = (($512) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[((552 + 8|0))>>2] = 0;
   HEAP32[((552 + 20|0))>>2] = 0;
   $520 = $509 | 3;
   $521 = (($512) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = (($512) + 8|0);
  $mem$0 = $525;
  STACKTOP = sp;return ($mem$0|0);
 }
 $526 = HEAP32[((552 + 12|0))>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[((552 + 12|0))>>2] = $528;
  $529 = HEAP32[((552 + 24|0))>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[((552 + 24|0))>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = (($529) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = (($529) + 8|0);
  $mem$0 = $535;
  STACKTOP = sp;return ($mem$0|0);
 }
 $536 = HEAP32[1024>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[((1024 + 8|0))>>2] = $538;
    HEAP32[((1024 + 4|0))>>2] = $538;
    HEAP32[((1024 + 12|0))>>2] = -1;
    HEAP32[((1024 + 16|0))>>2] = -1;
    HEAP32[((1024 + 20|0))>>2] = 0;
    HEAP32[((552 + 444|0))>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[1024>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[((1024 + 8|0))>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  STACKTOP = sp;return ($mem$0|0);
 }
 $552 = HEAP32[((552 + 440|0))>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[((552 + 432|0))>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $558 = HEAP32[((552 + 444|0))>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L266: do {
  if ($560) {
   $561 = HEAP32[((552 + 24|0))>>2]|0;
   $562 = ($561|0)==(0|0);
   L268: do {
    if ($562) {
     label = 181;
    } else {
     $sp$0$i$i = ((552 + 448|0));
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = (($sp$0$i$i) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        break;
       }
      }
      $569 = (($sp$0$i$i) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 181;
       break L268;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $572 = ($sp$0$i$i|0)==(0|0);
     if ($572) {
      label = 181;
     } else {
      $595 = HEAP32[((552 + 12|0))>>2]|0;
      $596 = (($548) - ($595))|0;
      $597 = $596 & $549;
      $598 = ($597>>>0)<(2147483647);
      if ($598) {
       $599 = (_sbrk(($597|0))|0);
       $600 = HEAP32[$sp$0$i$i>>2]|0;
       $601 = HEAP32[$565>>2]|0;
       $602 = (($600) + ($601)|0);
       $603 = ($599|0)==($602|0);
       if ($603) {
        $br$0$i = $599;$ssize$1$i = $597;
        label = 190;
       } else {
        $br$030$i = $599;$ssize$129$i = $597;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 181) {
     $573 = (_sbrk(0)|0);
     $574 = ($573|0)==((-1)|0);
     if ($574) {
      $tsize$03141$i = 0;
     } else {
      $575 = $573;
      $576 = HEAP32[((1024 + 4|0))>>2]|0;
      $577 = (($576) + -1)|0;
      $578 = $577 & $575;
      $579 = ($578|0)==(0);
      if ($579) {
       $ssize$0$i = $550;
      } else {
       $580 = (($577) + ($575))|0;
       $581 = (0 - ($576))|0;
       $582 = $580 & $581;
       $583 = (($550) - ($575))|0;
       $584 = (($583) + ($582))|0;
       $ssize$0$i = $584;
      }
      $585 = HEAP32[((552 + 432|0))>>2]|0;
      $586 = (($585) + ($ssize$0$i))|0;
      $587 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $588 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i29 = $587 & $588;
      if ($or$cond$i29) {
       $589 = HEAP32[((552 + 440|0))>>2]|0;
       $590 = ($589|0)==(0);
       if (!($590)) {
        $591 = ($586>>>0)<=($585>>>0);
        $592 = ($586>>>0)>($589>>>0);
        $or$cond2$i = $591 | $592;
        if ($or$cond2$i) {
         $tsize$03141$i = 0;
         break;
        }
       }
       $593 = (_sbrk(($ssize$0$i|0))|0);
       $594 = ($593|0)==($573|0);
       if ($594) {
        $br$0$i = $573;$ssize$1$i = $ssize$0$i;
        label = 190;
       } else {
        $br$030$i = $593;$ssize$129$i = $ssize$0$i;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   L288: do {
    if ((label|0) == 190) {
     $604 = ($br$0$i|0)==((-1)|0);
     if ($604) {
      $tsize$03141$i = $ssize$1$i;
     } else {
      $tbase$245$i = $br$0$i;$tsize$244$i = $ssize$1$i;
      label = 201;
      break L266;
     }
    }
    else if ((label|0) == 191) {
     $605 = (0 - ($ssize$129$i))|0;
     $606 = ($br$030$i|0)!=((-1)|0);
     $607 = ($ssize$129$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $607;
     $608 = ($545>>>0)>($ssize$129$i>>>0);
     $or$cond4$i = $or$cond5$i & $608;
     do {
      if ($or$cond4$i) {
       $609 = HEAP32[((1024 + 8|0))>>2]|0;
       $610 = (($547) - ($ssize$129$i))|0;
       $611 = (($610) + ($609))|0;
       $612 = (0 - ($609))|0;
       $613 = $611 & $612;
       $614 = ($613>>>0)<(2147483647);
       if ($614) {
        $615 = (_sbrk(($613|0))|0);
        $616 = ($615|0)==((-1)|0);
        if ($616) {
         (_sbrk(($605|0))|0);
         $tsize$03141$i = 0;
         break L288;
        } else {
         $617 = (($613) + ($ssize$129$i))|0;
         $ssize$2$i = $617;
         break;
        }
       } else {
        $ssize$2$i = $ssize$129$i;
       }
      } else {
       $ssize$2$i = $ssize$129$i;
      }
     } while(0);
     $618 = ($br$030$i|0)==((-1)|0);
     if ($618) {
      $tsize$03141$i = 0;
     } else {
      $tbase$245$i = $br$030$i;$tsize$244$i = $ssize$2$i;
      label = 201;
      break L266;
     }
    }
   } while(0);
   $619 = HEAP32[((552 + 444|0))>>2]|0;
   $620 = $619 | 4;
   HEAP32[((552 + 444|0))>>2] = $620;
   $tsize$1$i = $tsize$03141$i;
   label = 198;
  } else {
   $tsize$1$i = 0;
   label = 198;
  }
 } while(0);
 if ((label|0) == 198) {
  $621 = ($550>>>0)<(2147483647);
  if ($621) {
   $622 = (_sbrk(($550|0))|0);
   $623 = (_sbrk(0)|0);
   $624 = ($622|0)!=((-1)|0);
   $625 = ($623|0)!=((-1)|0);
   $or$cond3$i = $624 & $625;
   $626 = ($622>>>0)<($623>>>0);
   $or$cond6$i = $or$cond3$i & $626;
   if ($or$cond6$i) {
    $627 = $623;
    $628 = $622;
    $629 = (($627) - ($628))|0;
    $630 = (($nb$0) + 40)|0;
    $631 = ($629>>>0)>($630>>>0);
    $$tsize$1$i = $631 ? $629 : $tsize$1$i;
    if ($631) {
     $tbase$245$i = $622;$tsize$244$i = $$tsize$1$i;
     label = 201;
    }
   }
  }
 }
 if ((label|0) == 201) {
  $632 = HEAP32[((552 + 432|0))>>2]|0;
  $633 = (($632) + ($tsize$244$i))|0;
  HEAP32[((552 + 432|0))>>2] = $633;
  $634 = HEAP32[((552 + 436|0))>>2]|0;
  $635 = ($633>>>0)>($634>>>0);
  if ($635) {
   HEAP32[((552 + 436|0))>>2] = $633;
  }
  $636 = HEAP32[((552 + 24|0))>>2]|0;
  $637 = ($636|0)==(0|0);
  L308: do {
   if ($637) {
    $638 = HEAP32[((552 + 16|0))>>2]|0;
    $639 = ($638|0)==(0|0);
    $640 = ($tbase$245$i>>>0)<($638>>>0);
    $or$cond8$i = $639 | $640;
    if ($or$cond8$i) {
     HEAP32[((552 + 16|0))>>2] = $tbase$245$i;
    }
    HEAP32[((552 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((552 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((552 + 460|0))>>2] = 0;
    $641 = HEAP32[1024>>2]|0;
    HEAP32[((552 + 36|0))>>2] = $641;
    HEAP32[((552 + 32|0))>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $642 = $i$02$i$i << 1;
     $643 = ((552 + ($642<<2)|0) + 40|0);
     $$sum$i$i = (($642) + 3)|0;
     $644 = ((552 + ($$sum$i$i<<2)|0) + 40|0);
     HEAP32[$644>>2] = $643;
     $$sum1$i$i = (($642) + 2)|0;
     $645 = ((552 + ($$sum1$i$i<<2)|0) + 40|0);
     HEAP32[$645>>2] = $643;
     $646 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($646|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $646;
     }
    }
    $647 = (($tsize$244$i) + -40)|0;
    $648 = (($tbase$245$i) + 8|0);
    $649 = $648;
    $650 = $649 & 7;
    $651 = ($650|0)==(0);
    if ($651) {
     $655 = 0;
    } else {
     $652 = (0 - ($649))|0;
     $653 = $652 & 7;
     $655 = $653;
    }
    $654 = (($tbase$245$i) + ($655)|0);
    $656 = (($647) - ($655))|0;
    HEAP32[((552 + 24|0))>>2] = $654;
    HEAP32[((552 + 12|0))>>2] = $656;
    $657 = $656 | 1;
    $$sum$i12$i = (($655) + 4)|0;
    $658 = (($tbase$245$i) + ($$sum$i12$i)|0);
    HEAP32[$658>>2] = $657;
    $$sum2$i$i = (($tsize$244$i) + -36)|0;
    $659 = (($tbase$245$i) + ($$sum2$i$i)|0);
    HEAP32[$659>>2] = 40;
    $660 = HEAP32[((1024 + 16|0))>>2]|0;
    HEAP32[((552 + 28|0))>>2] = $660;
   } else {
    $sp$073$i = ((552 + 448|0));
    while(1) {
     $661 = HEAP32[$sp$073$i>>2]|0;
     $662 = (($sp$073$i) + 4|0);
     $663 = HEAP32[$662>>2]|0;
     $664 = (($661) + ($663)|0);
     $665 = ($tbase$245$i|0)==($664|0);
     if ($665) {
      label = 213;
      break;
     }
     $666 = (($sp$073$i) + 8|0);
     $667 = HEAP32[$666>>2]|0;
     $668 = ($667|0)==(0|0);
     if ($668) {
      break;
     } else {
      $sp$073$i = $667;
     }
    }
    if ((label|0) == 213) {
     $669 = (($sp$073$i) + 12|0);
     $670 = HEAP32[$669>>2]|0;
     $671 = $670 & 8;
     $672 = ($671|0)==(0);
     if ($672) {
      $673 = ($636>>>0)>=($661>>>0);
      $674 = ($636>>>0)<($tbase$245$i>>>0);
      $or$cond47$i = $673 & $674;
      if ($or$cond47$i) {
       $675 = (($663) + ($tsize$244$i))|0;
       HEAP32[$662>>2] = $675;
       $676 = HEAP32[((552 + 12|0))>>2]|0;
       $677 = (($676) + ($tsize$244$i))|0;
       $678 = (($636) + 8|0);
       $679 = $678;
       $680 = $679 & 7;
       $681 = ($680|0)==(0);
       if ($681) {
        $685 = 0;
       } else {
        $682 = (0 - ($679))|0;
        $683 = $682 & 7;
        $685 = $683;
       }
       $684 = (($636) + ($685)|0);
       $686 = (($677) - ($685))|0;
       HEAP32[((552 + 24|0))>>2] = $684;
       HEAP32[((552 + 12|0))>>2] = $686;
       $687 = $686 | 1;
       $$sum$i16$i = (($685) + 4)|0;
       $688 = (($636) + ($$sum$i16$i)|0);
       HEAP32[$688>>2] = $687;
       $$sum2$i17$i = (($677) + 4)|0;
       $689 = (($636) + ($$sum2$i17$i)|0);
       HEAP32[$689>>2] = 40;
       $690 = HEAP32[((1024 + 16|0))>>2]|0;
       HEAP32[((552 + 28|0))>>2] = $690;
       break;
      }
     }
    }
    $691 = HEAP32[((552 + 16|0))>>2]|0;
    $692 = ($tbase$245$i>>>0)<($691>>>0);
    if ($692) {
     HEAP32[((552 + 16|0))>>2] = $tbase$245$i;
     $756 = $tbase$245$i;
    } else {
     $756 = $691;
    }
    $693 = (($tbase$245$i) + ($tsize$244$i)|0);
    $sp$166$i = ((552 + 448|0));
    while(1) {
     $694 = HEAP32[$sp$166$i>>2]|0;
     $695 = ($694|0)==($693|0);
     if ($695) {
      label = 223;
      break;
     }
     $696 = (($sp$166$i) + 8|0);
     $697 = HEAP32[$696>>2]|0;
     $698 = ($697|0)==(0|0);
     if ($698) {
      break;
     } else {
      $sp$166$i = $697;
     }
    }
    if ((label|0) == 223) {
     $699 = (($sp$166$i) + 12|0);
     $700 = HEAP32[$699>>2]|0;
     $701 = $700 & 8;
     $702 = ($701|0)==(0);
     if ($702) {
      HEAP32[$sp$166$i>>2] = $tbase$245$i;
      $703 = (($sp$166$i) + 4|0);
      $704 = HEAP32[$703>>2]|0;
      $705 = (($704) + ($tsize$244$i))|0;
      HEAP32[$703>>2] = $705;
      $706 = (($tbase$245$i) + 8|0);
      $707 = $706;
      $708 = $707 & 7;
      $709 = ($708|0)==(0);
      if ($709) {
       $713 = 0;
      } else {
       $710 = (0 - ($707))|0;
       $711 = $710 & 7;
       $713 = $711;
      }
      $712 = (($tbase$245$i) + ($713)|0);
      $$sum102$i = (($tsize$244$i) + 8)|0;
      $714 = (($tbase$245$i) + ($$sum102$i)|0);
      $715 = $714;
      $716 = $715 & 7;
      $717 = ($716|0)==(0);
      if ($717) {
       $720 = 0;
      } else {
       $718 = (0 - ($715))|0;
       $719 = $718 & 7;
       $720 = $719;
      }
      $$sum103$i = (($720) + ($tsize$244$i))|0;
      $721 = (($tbase$245$i) + ($$sum103$i)|0);
      $722 = $721;
      $723 = $712;
      $724 = (($722) - ($723))|0;
      $$sum$i19$i = (($713) + ($nb$0))|0;
      $725 = (($tbase$245$i) + ($$sum$i19$i)|0);
      $726 = (($724) - ($nb$0))|0;
      $727 = $nb$0 | 3;
      $$sum1$i20$i = (($713) + 4)|0;
      $728 = (($tbase$245$i) + ($$sum1$i20$i)|0);
      HEAP32[$728>>2] = $727;
      $729 = ($721|0)==($636|0);
      L345: do {
       if ($729) {
        $730 = HEAP32[((552 + 12|0))>>2]|0;
        $731 = (($730) + ($726))|0;
        HEAP32[((552 + 12|0))>>2] = $731;
        HEAP32[((552 + 24|0))>>2] = $725;
        $732 = $731 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $733 = (($tbase$245$i) + ($$sum42$i$i)|0);
        HEAP32[$733>>2] = $732;
       } else {
        $734 = HEAP32[((552 + 20|0))>>2]|0;
        $735 = ($721|0)==($734|0);
        if ($735) {
         $736 = HEAP32[((552 + 8|0))>>2]|0;
         $737 = (($736) + ($726))|0;
         HEAP32[((552 + 8|0))>>2] = $737;
         HEAP32[((552 + 20|0))>>2] = $725;
         $738 = $737 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $739 = (($tbase$245$i) + ($$sum40$i$i)|0);
         HEAP32[$739>>2] = $738;
         $$sum41$i$i = (($737) + ($$sum$i19$i))|0;
         $740 = (($tbase$245$i) + ($$sum41$i$i)|0);
         HEAP32[$740>>2] = $737;
         break;
        }
        $$sum2$i21$i = (($tsize$244$i) + 4)|0;
        $$sum104$i = (($$sum2$i21$i) + ($720))|0;
        $741 = (($tbase$245$i) + ($$sum104$i)|0);
        $742 = HEAP32[$741>>2]|0;
        $743 = $742 & 3;
        $744 = ($743|0)==(1);
        if ($744) {
         $745 = $742 & -8;
         $746 = $742 >>> 3;
         $747 = ($742>>>0)<(256);
         L353: do {
          if ($747) {
           $$sum3738$i$i = $720 | 8;
           $$sum114$i = (($$sum3738$i$i) + ($tsize$244$i))|0;
           $748 = (($tbase$245$i) + ($$sum114$i)|0);
           $749 = HEAP32[$748>>2]|0;
           $$sum39$i$i = (($tsize$244$i) + 12)|0;
           $$sum115$i = (($$sum39$i$i) + ($720))|0;
           $750 = (($tbase$245$i) + ($$sum115$i)|0);
           $751 = HEAP32[$750>>2]|0;
           $752 = $746 << 1;
           $753 = ((552 + ($752<<2)|0) + 40|0);
           $754 = ($749|0)==($753|0);
           do {
            if (!($754)) {
             $755 = ($749>>>0)<($756>>>0);
             if ($755) {
              _abort();
              // unreachable;
             }
             $757 = (($749) + 12|0);
             $758 = HEAP32[$757>>2]|0;
             $759 = ($758|0)==($721|0);
             if ($759) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $760 = ($751|0)==($749|0);
           if ($760) {
            $761 = 1 << $746;
            $762 = $761 ^ -1;
            $763 = HEAP32[552>>2]|0;
            $764 = $763 & $762;
            HEAP32[552>>2] = $764;
            break;
           }
           $765 = ($751|0)==($753|0);
           do {
            if ($765) {
             $$pre58$i$i = (($751) + 8|0);
             $$pre$phi59$i$iZ2D = $$pre58$i$i;
            } else {
             $766 = ($751>>>0)<($756>>>0);
             if ($766) {
              _abort();
              // unreachable;
             }
             $767 = (($751) + 8|0);
             $768 = HEAP32[$767>>2]|0;
             $769 = ($768|0)==($721|0);
             if ($769) {
              $$pre$phi59$i$iZ2D = $767;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $770 = (($749) + 12|0);
           HEAP32[$770>>2] = $751;
           HEAP32[$$pre$phi59$i$iZ2D>>2] = $749;
          } else {
           $$sum34$i$i = $720 | 24;
           $$sum105$i = (($$sum34$i$i) + ($tsize$244$i))|0;
           $771 = (($tbase$245$i) + ($$sum105$i)|0);
           $772 = HEAP32[$771>>2]|0;
           $$sum5$i$i = (($tsize$244$i) + 12)|0;
           $$sum106$i = (($$sum5$i$i) + ($720))|0;
           $773 = (($tbase$245$i) + ($$sum106$i)|0);
           $774 = HEAP32[$773>>2]|0;
           $775 = ($774|0)==($721|0);
           do {
            if ($775) {
             $$sum67$i$i = $720 | 16;
             $$sum112$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $785 = (($tbase$245$i) + ($$sum112$i)|0);
             $786 = HEAP32[$785>>2]|0;
             $787 = ($786|0)==(0|0);
             if ($787) {
              $$sum113$i = (($$sum67$i$i) + ($tsize$244$i))|0;
              $788 = (($tbase$245$i) + ($$sum113$i)|0);
              $789 = HEAP32[$788>>2]|0;
              $790 = ($789|0)==(0|0);
              if ($790) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $789;$RP$0$i$i = $788;
              }
             } else {
              $R$0$i$i = $786;$RP$0$i$i = $785;
             }
             while(1) {
              $791 = (($R$0$i$i) + 20|0);
              $792 = HEAP32[$791>>2]|0;
              $793 = ($792|0)==(0|0);
              if (!($793)) {
               $R$0$i$i = $792;$RP$0$i$i = $791;
               continue;
              }
              $794 = (($R$0$i$i) + 16|0);
              $795 = HEAP32[$794>>2]|0;
              $796 = ($795|0)==(0|0);
              if ($796) {
               break;
              } else {
               $R$0$i$i = $795;$RP$0$i$i = $794;
              }
             }
             $797 = ($RP$0$i$i>>>0)<($756>>>0);
             if ($797) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i>>2] = 0;
              $R$1$i$i = $R$0$i$i;
              break;
             }
            } else {
             $$sum3536$i$i = $720 | 8;
             $$sum107$i = (($$sum3536$i$i) + ($tsize$244$i))|0;
             $776 = (($tbase$245$i) + ($$sum107$i)|0);
             $777 = HEAP32[$776>>2]|0;
             $778 = ($777>>>0)<($756>>>0);
             if ($778) {
              _abort();
              // unreachable;
             }
             $779 = (($777) + 12|0);
             $780 = HEAP32[$779>>2]|0;
             $781 = ($780|0)==($721|0);
             if (!($781)) {
              _abort();
              // unreachable;
             }
             $782 = (($774) + 8|0);
             $783 = HEAP32[$782>>2]|0;
             $784 = ($783|0)==($721|0);
             if ($784) {
              HEAP32[$779>>2] = $774;
              HEAP32[$782>>2] = $777;
              $R$1$i$i = $774;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $798 = ($772|0)==(0|0);
           if ($798) {
            break;
           }
           $$sum30$i$i = (($tsize$244$i) + 28)|0;
           $$sum108$i = (($$sum30$i$i) + ($720))|0;
           $799 = (($tbase$245$i) + ($$sum108$i)|0);
           $800 = HEAP32[$799>>2]|0;
           $801 = ((552 + ($800<<2)|0) + 304|0);
           $802 = HEAP32[$801>>2]|0;
           $803 = ($721|0)==($802|0);
           do {
            if ($803) {
             HEAP32[$801>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $804 = 1 << $800;
             $805 = $804 ^ -1;
             $806 = HEAP32[((552 + 4|0))>>2]|0;
             $807 = $806 & $805;
             HEAP32[((552 + 4|0))>>2] = $807;
             break L353;
            } else {
             $808 = HEAP32[((552 + 16|0))>>2]|0;
             $809 = ($772>>>0)<($808>>>0);
             if ($809) {
              _abort();
              // unreachable;
             }
             $810 = (($772) + 16|0);
             $811 = HEAP32[$810>>2]|0;
             $812 = ($811|0)==($721|0);
             if ($812) {
              HEAP32[$810>>2] = $R$1$i$i;
             } else {
              $813 = (($772) + 20|0);
              HEAP32[$813>>2] = $R$1$i$i;
             }
             $814 = ($R$1$i$i|0)==(0|0);
             if ($814) {
              break L353;
             }
            }
           } while(0);
           $815 = HEAP32[((552 + 16|0))>>2]|0;
           $816 = ($R$1$i$i>>>0)<($815>>>0);
           if ($816) {
            _abort();
            // unreachable;
           }
           $817 = (($R$1$i$i) + 24|0);
           HEAP32[$817>>2] = $772;
           $$sum3132$i$i = $720 | 16;
           $$sum109$i = (($$sum3132$i$i) + ($tsize$244$i))|0;
           $818 = (($tbase$245$i) + ($$sum109$i)|0);
           $819 = HEAP32[$818>>2]|0;
           $820 = ($819|0)==(0|0);
           do {
            if (!($820)) {
             $821 = ($819>>>0)<($815>>>0);
             if ($821) {
              _abort();
              // unreachable;
             } else {
              $822 = (($R$1$i$i) + 16|0);
              HEAP32[$822>>2] = $819;
              $823 = (($819) + 24|0);
              HEAP32[$823>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum110$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $824 = (($tbase$245$i) + ($$sum110$i)|0);
           $825 = HEAP32[$824>>2]|0;
           $826 = ($825|0)==(0|0);
           if ($826) {
            break;
           }
           $827 = HEAP32[((552 + 16|0))>>2]|0;
           $828 = ($825>>>0)<($827>>>0);
           if ($828) {
            _abort();
            // unreachable;
           } else {
            $829 = (($R$1$i$i) + 20|0);
            HEAP32[$829>>2] = $825;
            $830 = (($825) + 24|0);
            HEAP32[$830>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $745 | $720;
         $$sum111$i = (($$sum9$i$i) + ($tsize$244$i))|0;
         $831 = (($tbase$245$i) + ($$sum111$i)|0);
         $832 = (($745) + ($726))|0;
         $oldfirst$0$i$i = $831;$qsize$0$i$i = $832;
        } else {
         $oldfirst$0$i$i = $721;$qsize$0$i$i = $726;
        }
        $833 = (($oldfirst$0$i$i) + 4|0);
        $834 = HEAP32[$833>>2]|0;
        $835 = $834 & -2;
        HEAP32[$833>>2] = $835;
        $836 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $837 = (($tbase$245$i) + ($$sum10$i$i)|0);
        HEAP32[$837>>2] = $836;
        $$sum11$i22$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $838 = (($tbase$245$i) + ($$sum11$i22$i)|0);
        HEAP32[$838>>2] = $qsize$0$i$i;
        $839 = $qsize$0$i$i >>> 3;
        $840 = ($qsize$0$i$i>>>0)<(256);
        if ($840) {
         $841 = $839 << 1;
         $842 = ((552 + ($841<<2)|0) + 40|0);
         $843 = HEAP32[552>>2]|0;
         $844 = 1 << $839;
         $845 = $843 & $844;
         $846 = ($845|0)==(0);
         do {
          if ($846) {
           $847 = $843 | $844;
           HEAP32[552>>2] = $847;
           $$sum26$pre$i$i = (($841) + 2)|0;
           $$pre$i23$i = ((552 + ($$sum26$pre$i$i<<2)|0) + 40|0);
           $$pre$phi$i24$iZ2D = $$pre$i23$i;$F4$0$i$i = $842;
          } else {
           $$sum29$i$i = (($841) + 2)|0;
           $848 = ((552 + ($$sum29$i$i<<2)|0) + 40|0);
           $849 = HEAP32[$848>>2]|0;
           $850 = HEAP32[((552 + 16|0))>>2]|0;
           $851 = ($849>>>0)<($850>>>0);
           if (!($851)) {
            $$pre$phi$i24$iZ2D = $848;$F4$0$i$i = $849;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i24$iZ2D>>2] = $725;
         $852 = (($F4$0$i$i) + 12|0);
         HEAP32[$852>>2] = $725;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $853 = (($tbase$245$i) + ($$sum27$i$i)|0);
         HEAP32[$853>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $854 = (($tbase$245$i) + ($$sum28$i$i)|0);
         HEAP32[$854>>2] = $842;
         break;
        }
        $855 = $qsize$0$i$i >>> 8;
        $856 = ($855|0)==(0);
        do {
         if ($856) {
          $I7$0$i$i = 0;
         } else {
          $857 = ($qsize$0$i$i>>>0)>(16777215);
          if ($857) {
           $I7$0$i$i = 31;
           break;
          }
          $858 = (($855) + 1048320)|0;
          $859 = $858 >>> 16;
          $860 = $859 & 8;
          $861 = $855 << $860;
          $862 = (($861) + 520192)|0;
          $863 = $862 >>> 16;
          $864 = $863 & 4;
          $865 = $864 | $860;
          $866 = $861 << $864;
          $867 = (($866) + 245760)|0;
          $868 = $867 >>> 16;
          $869 = $868 & 2;
          $870 = $865 | $869;
          $871 = (14 - ($870))|0;
          $872 = $866 << $869;
          $873 = $872 >>> 15;
          $874 = (($871) + ($873))|0;
          $875 = $874 << 1;
          $876 = (($874) + 7)|0;
          $877 = $qsize$0$i$i >>> $876;
          $878 = $877 & 1;
          $879 = $878 | $875;
          $I7$0$i$i = $879;
         }
        } while(0);
        $880 = ((552 + ($I7$0$i$i<<2)|0) + 304|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $881 = (($tbase$245$i) + ($$sum12$i$i)|0);
        HEAP32[$881>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $882 = (($tbase$245$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $883 = (($tbase$245$i) + ($$sum14$i$i)|0);
        HEAP32[$883>>2] = 0;
        HEAP32[$882>>2] = 0;
        $884 = HEAP32[((552 + 4|0))>>2]|0;
        $885 = 1 << $I7$0$i$i;
        $886 = $884 & $885;
        $887 = ($886|0)==(0);
        if ($887) {
         $888 = $884 | $885;
         HEAP32[((552 + 4|0))>>2] = $888;
         HEAP32[$880>>2] = $725;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $889 = (($tbase$245$i) + ($$sum15$i$i)|0);
         HEAP32[$889>>2] = $880;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $890 = (($tbase$245$i) + ($$sum16$i$i)|0);
         HEAP32[$890>>2] = $725;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $891 = (($tbase$245$i) + ($$sum17$i$i)|0);
         HEAP32[$891>>2] = $725;
         break;
        }
        $892 = HEAP32[$880>>2]|0;
        $893 = ($I7$0$i$i|0)==(31);
        if ($893) {
         $901 = 0;
        } else {
         $894 = $I7$0$i$i >>> 1;
         $895 = (25 - ($894))|0;
         $901 = $895;
        }
        $896 = (($892) + 4|0);
        $897 = HEAP32[$896>>2]|0;
        $898 = $897 & -8;
        $899 = ($898|0)==($qsize$0$i$i|0);
        L442: do {
         if ($899) {
          $T$0$lcssa$i26$i = $892;
         } else {
          $900 = $qsize$0$i$i << $901;
          $K8$053$i$i = $900;$T$052$i$i = $892;
          while(1) {
           $908 = $K8$053$i$i >>> 31;
           $909 = ((($T$052$i$i) + ($908<<2)|0) + 16|0);
           $904 = HEAP32[$909>>2]|0;
           $910 = ($904|0)==(0|0);
           if ($910) {
            break;
           }
           $902 = $K8$053$i$i << 1;
           $903 = (($904) + 4|0);
           $905 = HEAP32[$903>>2]|0;
           $906 = $905 & -8;
           $907 = ($906|0)==($qsize$0$i$i|0);
           if ($907) {
            $T$0$lcssa$i26$i = $904;
            break L442;
           } else {
            $K8$053$i$i = $902;$T$052$i$i = $904;
           }
          }
          $911 = HEAP32[((552 + 16|0))>>2]|0;
          $912 = ($909>>>0)<($911>>>0);
          if ($912) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$909>>2] = $725;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $913 = (($tbase$245$i) + ($$sum23$i$i)|0);
           HEAP32[$913>>2] = $T$052$i$i;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $914 = (($tbase$245$i) + ($$sum24$i$i)|0);
           HEAP32[$914>>2] = $725;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $915 = (($tbase$245$i) + ($$sum25$i$i)|0);
           HEAP32[$915>>2] = $725;
           break L345;
          }
         }
        } while(0);
        $916 = (($T$0$lcssa$i26$i) + 8|0);
        $917 = HEAP32[$916>>2]|0;
        $918 = HEAP32[((552 + 16|0))>>2]|0;
        $919 = ($T$0$lcssa$i26$i>>>0)>=($918>>>0);
        $920 = ($917>>>0)>=($918>>>0);
        $or$cond$i27$i = $919 & $920;
        if ($or$cond$i27$i) {
         $921 = (($917) + 12|0);
         HEAP32[$921>>2] = $725;
         HEAP32[$916>>2] = $725;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $922 = (($tbase$245$i) + ($$sum20$i$i)|0);
         HEAP32[$922>>2] = $917;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $923 = (($tbase$245$i) + ($$sum21$i$i)|0);
         HEAP32[$923>>2] = $T$0$lcssa$i26$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $924 = (($tbase$245$i) + ($$sum22$i$i)|0);
         HEAP32[$924>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $713 | 8;
      $925 = (($tbase$245$i) + ($$sum1819$i$i)|0);
      $mem$0 = $925;
      STACKTOP = sp;return ($mem$0|0);
     }
    }
    $sp$0$i$i$i = ((552 + 448|0));
    while(1) {
     $926 = HEAP32[$sp$0$i$i$i>>2]|0;
     $927 = ($926>>>0)>($636>>>0);
     if (!($927)) {
      $928 = (($sp$0$i$i$i) + 4|0);
      $929 = HEAP32[$928>>2]|0;
      $930 = (($926) + ($929)|0);
      $931 = ($930>>>0)>($636>>>0);
      if ($931) {
       break;
      }
     }
     $932 = (($sp$0$i$i$i) + 8|0);
     $933 = HEAP32[$932>>2]|0;
     $sp$0$i$i$i = $933;
    }
    $$sum$i13$i = (($929) + -47)|0;
    $$sum1$i14$i = (($929) + -39)|0;
    $934 = (($926) + ($$sum1$i14$i)|0);
    $935 = $934;
    $936 = $935 & 7;
    $937 = ($936|0)==(0);
    if ($937) {
     $940 = 0;
    } else {
     $938 = (0 - ($935))|0;
     $939 = $938 & 7;
     $940 = $939;
    }
    $$sum2$i15$i = (($$sum$i13$i) + ($940))|0;
    $941 = (($926) + ($$sum2$i15$i)|0);
    $942 = (($636) + 16|0);
    $943 = ($941>>>0)<($942>>>0);
    $944 = $943 ? $636 : $941;
    $945 = (($944) + 8|0);
    $946 = (($tsize$244$i) + -40)|0;
    $947 = (($tbase$245$i) + 8|0);
    $948 = $947;
    $949 = $948 & 7;
    $950 = ($949|0)==(0);
    if ($950) {
     $954 = 0;
    } else {
     $951 = (0 - ($948))|0;
     $952 = $951 & 7;
     $954 = $952;
    }
    $953 = (($tbase$245$i) + ($954)|0);
    $955 = (($946) - ($954))|0;
    HEAP32[((552 + 24|0))>>2] = $953;
    HEAP32[((552 + 12|0))>>2] = $955;
    $956 = $955 | 1;
    $$sum$i$i$i = (($954) + 4)|0;
    $957 = (($tbase$245$i) + ($$sum$i$i$i)|0);
    HEAP32[$957>>2] = $956;
    $$sum2$i$i$i = (($tsize$244$i) + -36)|0;
    $958 = (($tbase$245$i) + ($$sum2$i$i$i)|0);
    HEAP32[$958>>2] = 40;
    $959 = HEAP32[((1024 + 16|0))>>2]|0;
    HEAP32[((552 + 28|0))>>2] = $959;
    $960 = (($944) + 4|0);
    HEAP32[$960>>2] = 27;
    ;HEAP32[$945+0>>2]=HEAP32[((552 + 448|0))+0>>2]|0;HEAP32[$945+4>>2]=HEAP32[((552 + 448|0))+4>>2]|0;HEAP32[$945+8>>2]=HEAP32[((552 + 448|0))+8>>2]|0;HEAP32[$945+12>>2]=HEAP32[((552 + 448|0))+12>>2]|0;
    HEAP32[((552 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((552 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((552 + 460|0))>>2] = 0;
    HEAP32[((552 + 456|0))>>2] = $945;
    $961 = (($944) + 28|0);
    HEAP32[$961>>2] = 7;
    $962 = (($944) + 32|0);
    $963 = ($962>>>0)<($930>>>0);
    if ($963) {
     $965 = $961;
     while(1) {
      $964 = (($965) + 4|0);
      HEAP32[$964>>2] = 7;
      $966 = (($965) + 8|0);
      $967 = ($966>>>0)<($930>>>0);
      if ($967) {
       $965 = $964;
      } else {
       break;
      }
     }
    }
    $968 = ($944|0)==($636|0);
    if (!($968)) {
     $969 = $944;
     $970 = $636;
     $971 = (($969) - ($970))|0;
     $972 = (($636) + ($971)|0);
     $$sum3$i$i = (($971) + 4)|0;
     $973 = (($636) + ($$sum3$i$i)|0);
     $974 = HEAP32[$973>>2]|0;
     $975 = $974 & -2;
     HEAP32[$973>>2] = $975;
     $976 = $971 | 1;
     $977 = (($636) + 4|0);
     HEAP32[$977>>2] = $976;
     HEAP32[$972>>2] = $971;
     $978 = $971 >>> 3;
     $979 = ($971>>>0)<(256);
     if ($979) {
      $980 = $978 << 1;
      $981 = ((552 + ($980<<2)|0) + 40|0);
      $982 = HEAP32[552>>2]|0;
      $983 = 1 << $978;
      $984 = $982 & $983;
      $985 = ($984|0)==(0);
      do {
       if ($985) {
        $986 = $982 | $983;
        HEAP32[552>>2] = $986;
        $$sum10$pre$i$i = (($980) + 2)|0;
        $$pre$i$i = ((552 + ($$sum10$pre$i$i<<2)|0) + 40|0);
        $$pre$phi$i$iZ2D = $$pre$i$i;$F$0$i$i = $981;
       } else {
        $$sum11$i$i = (($980) + 2)|0;
        $987 = ((552 + ($$sum11$i$i<<2)|0) + 40|0);
        $988 = HEAP32[$987>>2]|0;
        $989 = HEAP32[((552 + 16|0))>>2]|0;
        $990 = ($988>>>0)<($989>>>0);
        if (!($990)) {
         $$pre$phi$i$iZ2D = $987;$F$0$i$i = $988;
         break;
        }
        _abort();
        // unreachable;
       }
      } while(0);
      HEAP32[$$pre$phi$i$iZ2D>>2] = $636;
      $991 = (($F$0$i$i) + 12|0);
      HEAP32[$991>>2] = $636;
      $992 = (($636) + 8|0);
      HEAP32[$992>>2] = $F$0$i$i;
      $993 = (($636) + 12|0);
      HEAP32[$993>>2] = $981;
      break;
     }
     $994 = $971 >>> 8;
     $995 = ($994|0)==(0);
     if ($995) {
      $I1$0$i$i = 0;
     } else {
      $996 = ($971>>>0)>(16777215);
      if ($996) {
       $I1$0$i$i = 31;
      } else {
       $997 = (($994) + 1048320)|0;
       $998 = $997 >>> 16;
       $999 = $998 & 8;
       $1000 = $994 << $999;
       $1001 = (($1000) + 520192)|0;
       $1002 = $1001 >>> 16;
       $1003 = $1002 & 4;
       $1004 = $1003 | $999;
       $1005 = $1000 << $1003;
       $1006 = (($1005) + 245760)|0;
       $1007 = $1006 >>> 16;
       $1008 = $1007 & 2;
       $1009 = $1004 | $1008;
       $1010 = (14 - ($1009))|0;
       $1011 = $1005 << $1008;
       $1012 = $1011 >>> 15;
       $1013 = (($1010) + ($1012))|0;
       $1014 = $1013 << 1;
       $1015 = (($1013) + 7)|0;
       $1016 = $971 >>> $1015;
       $1017 = $1016 & 1;
       $1018 = $1017 | $1014;
       $I1$0$i$i = $1018;
      }
     }
     $1019 = ((552 + ($I1$0$i$i<<2)|0) + 304|0);
     $1020 = (($636) + 28|0);
     $I1$0$c$i$i = $I1$0$i$i;
     HEAP32[$1020>>2] = $I1$0$c$i$i;
     $1021 = (($636) + 20|0);
     HEAP32[$1021>>2] = 0;
     $1022 = (($636) + 16|0);
     HEAP32[$1022>>2] = 0;
     $1023 = HEAP32[((552 + 4|0))>>2]|0;
     $1024 = 1 << $I1$0$i$i;
     $1025 = $1023 & $1024;
     $1026 = ($1025|0)==(0);
     if ($1026) {
      $1027 = $1023 | $1024;
      HEAP32[((552 + 4|0))>>2] = $1027;
      HEAP32[$1019>>2] = $636;
      $1028 = (($636) + 24|0);
      HEAP32[$1028>>2] = $1019;
      $1029 = (($636) + 12|0);
      HEAP32[$1029>>2] = $636;
      $1030 = (($636) + 8|0);
      HEAP32[$1030>>2] = $636;
      break;
     }
     $1031 = HEAP32[$1019>>2]|0;
     $1032 = ($I1$0$i$i|0)==(31);
     if ($1032) {
      $1040 = 0;
     } else {
      $1033 = $I1$0$i$i >>> 1;
      $1034 = (25 - ($1033))|0;
      $1040 = $1034;
     }
     $1035 = (($1031) + 4|0);
     $1036 = HEAP32[$1035>>2]|0;
     $1037 = $1036 & -8;
     $1038 = ($1037|0)==($971|0);
     L493: do {
      if ($1038) {
       $T$0$lcssa$i$i = $1031;
      } else {
       $1039 = $971 << $1040;
       $K2$015$i$i = $1039;$T$014$i$i = $1031;
       while(1) {
        $1047 = $K2$015$i$i >>> 31;
        $1048 = ((($T$014$i$i) + ($1047<<2)|0) + 16|0);
        $1043 = HEAP32[$1048>>2]|0;
        $1049 = ($1043|0)==(0|0);
        if ($1049) {
         break;
        }
        $1041 = $K2$015$i$i << 1;
        $1042 = (($1043) + 4|0);
        $1044 = HEAP32[$1042>>2]|0;
        $1045 = $1044 & -8;
        $1046 = ($1045|0)==($971|0);
        if ($1046) {
         $T$0$lcssa$i$i = $1043;
         break L493;
        } else {
         $K2$015$i$i = $1041;$T$014$i$i = $1043;
        }
       }
       $1050 = HEAP32[((552 + 16|0))>>2]|0;
       $1051 = ($1048>>>0)<($1050>>>0);
       if ($1051) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$1048>>2] = $636;
        $1052 = (($636) + 24|0);
        HEAP32[$1052>>2] = $T$014$i$i;
        $1053 = (($636) + 12|0);
        HEAP32[$1053>>2] = $636;
        $1054 = (($636) + 8|0);
        HEAP32[$1054>>2] = $636;
        break L308;
       }
      }
     } while(0);
     $1055 = (($T$0$lcssa$i$i) + 8|0);
     $1056 = HEAP32[$1055>>2]|0;
     $1057 = HEAP32[((552 + 16|0))>>2]|0;
     $1058 = ($T$0$lcssa$i$i>>>0)>=($1057>>>0);
     $1059 = ($1056>>>0)>=($1057>>>0);
     $or$cond$i$i = $1058 & $1059;
     if ($or$cond$i$i) {
      $1060 = (($1056) + 12|0);
      HEAP32[$1060>>2] = $636;
      HEAP32[$1055>>2] = $636;
      $1061 = (($636) + 8|0);
      HEAP32[$1061>>2] = $1056;
      $1062 = (($636) + 12|0);
      HEAP32[$1062>>2] = $T$0$lcssa$i$i;
      $1063 = (($636) + 24|0);
      HEAP32[$1063>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1064 = HEAP32[((552 + 12|0))>>2]|0;
  $1065 = ($1064>>>0)>($nb$0>>>0);
  if ($1065) {
   $1066 = (($1064) - ($nb$0))|0;
   HEAP32[((552 + 12|0))>>2] = $1066;
   $1067 = HEAP32[((552 + 24|0))>>2]|0;
   $1068 = (($1067) + ($nb$0)|0);
   HEAP32[((552 + 24|0))>>2] = $1068;
   $1069 = $1066 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1070 = (($1067) + ($$sum$i32)|0);
   HEAP32[$1070>>2] = $1069;
   $1071 = $nb$0 | 3;
   $1072 = (($1067) + 4|0);
   HEAP32[$1072>>2] = $1071;
   $1073 = (($1067) + 8|0);
   $mem$0 = $1073;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $1074 = (___errno_location()|0);
 HEAP32[$1074>>2] = 12;
 $mem$0 = 0;
 STACKTOP = sp;return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$pre = 0, $$pre$phi66Z2D = 0, $$pre$phi68Z2D = 0, $$pre$phiZ2D = 0, $$pre65 = 0, $$pre67 = 0, $$sum = 0, $$sum16$pre = 0, $$sum17 = 0, $$sum18 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum2324 = 0, $$sum25 = 0, $$sum26 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0;
 var $$sum31 = 0, $$sum32 = 0, $$sum33 = 0, $$sum34 = 0, $$sum35 = 0, $$sum36 = 0, $$sum37 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0;
 var $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0;
 var $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0;
 var $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0;
 var $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0;
 var $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0;
 var $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0;
 var $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0;
 var $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0;
 var $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0;
 var $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0;
 var $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0;
 var $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0;
 var $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0;
 var $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0;
 var $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $I18$0$c = 0, $K19$058 = 0, $R$0 = 0, $R$1 = 0, $R7$0 = 0;
 var $R7$1 = 0, $RP$0 = 0, $RP9$0 = 0, $T$0$lcssa = 0, $T$057 = 0, $cond = 0, $cond54 = 0, $or$cond = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  STACKTOP = sp;return;
 }
 $1 = (($mem) + -8|0);
 $2 = HEAP32[((552 + 16|0))>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = (($mem) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    STACKTOP = sp;return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[((552 + 20|0))>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $103 = (($mem) + ($$sum3)|0);
    $104 = HEAP32[$103>>2]|0;
    $105 = $104 & 3;
    $106 = ($105|0)==(3);
    if (!($106)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[((552 + 8|0))>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum26 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum26)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    STACKTOP = sp;return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum36 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum36)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum37 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum37)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = ((552 + ($25<<2)|0) + 40|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = (($22) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[552>>2]|0;
     $36 = $35 & $34;
     HEAP32[552>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre67 = (($24) + 8|0);
     $$pre$phi68Z2D = $$pre67;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = (($24) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi68Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = (($22) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi68Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum28 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum28)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum29 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum29)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum31 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum31)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum30 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum30)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;$RP$0 = $60;
      }
     } else {
      $R$0 = $58;$RP$0 = $57;
     }
     while(1) {
      $63 = (($R$0) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = (($R$0) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0>>2] = 0;
      $R$1 = $R$0;
      break;
     }
    } else {
     $$sum35 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum35)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = (($49) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = (($46) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum32 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum32)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = ((552 + ($72<<2)|0) + 304|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[((552 + 4|0))>>2]|0;
      $79 = $78 & $77;
      HEAP32[((552 + 4|0))>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[((552 + 16|0))>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = (($44) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = (($44) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[((552 + 16|0))>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = (($R$1) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum33 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum33)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = (($R$1) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = (($91) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum34 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum34)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[((552 + 16|0))>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = (($R$1) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = (($97) + 24|0);
      HEAP32[$102>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $110 = ($p$0>>>0)<($9>>>0);
 if (!($110)) {
  _abort();
  // unreachable;
 }
 $$sum25 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum25)|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $112 & 1;
 $114 = ($113|0)==(0);
 if ($114) {
  _abort();
  // unreachable;
 }
 $115 = $112 & 2;
 $116 = ($115|0)==(0);
 if ($116) {
  $117 = HEAP32[((552 + 24|0))>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[((552 + 12|0))>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[((552 + 12|0))>>2] = $120;
   HEAP32[((552 + 24|0))>>2] = $p$0;
   $121 = $120 | 1;
   $122 = (($p$0) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[((552 + 20|0))>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    STACKTOP = sp;return;
   }
   HEAP32[((552 + 20|0))>>2] = 0;
   HEAP32[((552 + 8|0))>>2] = 0;
   STACKTOP = sp;return;
  }
  $125 = HEAP32[((552 + 20|0))>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[((552 + 8|0))>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[((552 + 8|0))>>2] = $128;
   HEAP32[((552 + 20|0))>>2] = $p$0;
   $129 = $128 | 1;
   $130 = (($p$0) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   STACKTOP = sp;return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum2324 = $8 | 4;
    $138 = (($mem) + ($$sum2324)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = ((552 + ($140<<2)|0) + 40|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[((552 + 16|0))>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = (($137) + 12|0);
     $146 = HEAP32[$145>>2]|0;
     $147 = ($146|0)==($9|0);
     if (!($147)) {
      _abort();
      // unreachable;
     }
    }
    $148 = ($139|0)==($137|0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[552>>2]|0;
     $152 = $151 & $150;
     HEAP32[552>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre65 = (($139) + 8|0);
     $$pre$phi66Z2D = $$pre65;
    } else {
     $154 = HEAP32[((552 + 16|0))>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = (($139) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi66Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = (($137) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi66Z2D>>2] = $137;
   } else {
    $$sum5 = (($8) + 16)|0;
    $160 = (($mem) + ($$sum5)|0);
    $161 = HEAP32[$160>>2]|0;
    $$sum67 = $8 | 4;
    $162 = (($mem) + ($$sum67)|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)==($9|0);
    do {
     if ($164) {
      $$sum9 = (($8) + 12)|0;
      $175 = (($mem) + ($$sum9)|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==(0|0);
      if ($177) {
       $$sum8 = (($8) + 8)|0;
       $178 = (($mem) + ($$sum8)|0);
       $179 = HEAP32[$178>>2]|0;
       $180 = ($179|0)==(0|0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $179;$RP9$0 = $178;
       }
      } else {
       $R7$0 = $176;$RP9$0 = $175;
      }
      while(1) {
       $181 = (($R7$0) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if (!($183)) {
        $R7$0 = $182;$RP9$0 = $181;
        continue;
       }
       $184 = (($R7$0) + 16|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if ($186) {
        break;
       } else {
        $R7$0 = $185;$RP9$0 = $184;
       }
      }
      $187 = HEAP32[((552 + 16|0))>>2]|0;
      $188 = ($RP9$0>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0>>2] = 0;
       $R7$1 = $R7$0;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[((552 + 16|0))>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = (($166) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = (($163) + 8|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($9|0);
      if ($174) {
       HEAP32[$169>>2] = $163;
       HEAP32[$172>>2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $189 = ($161|0)==(0|0);
    if (!($189)) {
     $$sum18 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum18)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = ((552 + ($191<<2)|0) + 304|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond54 = ($R7$1|0)==(0|0);
      if ($cond54) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[((552 + 4|0))>>2]|0;
       $198 = $197 & $196;
       HEAP32[((552 + 4|0))>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[((552 + 16|0))>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = (($161) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = (($161) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[((552 + 16|0))>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = (($R7$1) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum19 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum19)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = (($R7$1) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = (($210) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum20 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum20)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[((552 + 16|0))>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = (($R7$1) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = (($216) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = (($p$0) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[((552 + 20|0))>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[((552 + 8|0))>>2] = $133;
   STACKTOP = sp;return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = (($p$0) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = ((552 + ($233<<2)|0) + 40|0);
  $235 = HEAP32[552>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[552>>2] = $239;
   $$sum16$pre = (($233) + 2)|0;
   $$pre = ((552 + ($$sum16$pre<<2)|0) + 40|0);
   $$pre$phiZ2D = $$pre;$F16$0 = $234;
  } else {
   $$sum17 = (($233) + 2)|0;
   $240 = ((552 + ($$sum17<<2)|0) + 40|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[((552 + 16|0))>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = (($F16$0) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = (($p$0) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = (($p$0) + 12|0);
  HEAP32[$246>>2] = $234;
  STACKTOP = sp;return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247|0)==(0);
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = ($psize$1>>>0)>(16777215);
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = (($247) + 1048320)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = (($253) + 520192)|0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = (($258) + 245760)|0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = (14 - ($262))|0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = (($263) + ($265))|0;
   $267 = $266 << 1;
   $268 = (($266) + 7)|0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = ((552 + ($I18$0<<2)|0) + 304|0);
 $273 = (($p$0) + 28|0);
 $I18$0$c = $I18$0;
 HEAP32[$273>>2] = $I18$0$c;
 $274 = (($p$0) + 20|0);
 HEAP32[$274>>2] = 0;
 $275 = (($p$0) + 16|0);
 HEAP32[$275>>2] = 0;
 $276 = HEAP32[((552 + 4|0))>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L199: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[((552 + 4|0))>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = (($p$0) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = (($p$0) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = (($p$0) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ($I18$0|0)==(31);
   if ($285) {
    $293 = 0;
   } else {
    $286 = $I18$0 >>> 1;
    $287 = (25 - ($286))|0;
    $293 = $287;
   }
   $288 = (($284) + 4|0);
   $289 = HEAP32[$288>>2]|0;
   $290 = $289 & -8;
   $291 = ($290|0)==($psize$1|0);
   L205: do {
    if ($291) {
     $T$0$lcssa = $284;
    } else {
     $292 = $psize$1 << $293;
     $K19$058 = $292;$T$057 = $284;
     while(1) {
      $300 = $K19$058 >>> 31;
      $301 = ((($T$057) + ($300<<2)|0) + 16|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       break;
      }
      $294 = $K19$058 << 1;
      $295 = (($296) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $T$0$lcssa = $296;
       break L205;
      } else {
       $K19$058 = $294;$T$057 = $296;
      }
     }
     $303 = HEAP32[((552 + 16|0))>>2]|0;
     $304 = ($301>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$301>>2] = $p$0;
      $305 = (($p$0) + 24|0);
      HEAP32[$305>>2] = $T$057;
      $306 = (($p$0) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = (($p$0) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $308 = (($T$0$lcssa) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[((552 + 16|0))>>2]|0;
   $311 = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = ($309>>>0)>=($310>>>0);
   $or$cond = $311 & $312;
   if ($or$cond) {
    $313 = (($309) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = (($p$0) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = (($p$0) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = (($p$0) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[((552 + 32|0))>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[((552 + 32|0))>>2] = $318;
 $319 = ($318|0)==(0);
 if ($319) {
  $sp$0$in$i = ((552 + 456|0));
 } else {
  STACKTOP = sp;return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = (($sp$0$i) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[((552 + 32|0))>>2] = -1;
 STACKTOP = sp;return;
}
function _calloc($n_elements,$elem_size) {
 $n_elements = $n_elements|0;
 $elem_size = $elem_size|0;
 var $$ = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $req$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n_elements|0)==(0);
 if ($0) {
  $req$0 = 0;
 } else {
  $1 = Math_imul($elem_size, $n_elements)|0;
  $2 = $elem_size | $n_elements;
  $3 = ($2>>>0)>(65535);
  if ($3) {
   $4 = (($1>>>0) / ($n_elements>>>0))&-1;
   $5 = ($4|0)==($elem_size|0);
   $$ = $5 ? $1 : -1;
   $req$0 = $$;
  } else {
   $req$0 = $1;
  }
 }
 $6 = (_malloc($req$0)|0);
 $7 = ($6|0)==(0|0);
 if ($7) {
  STACKTOP = sp;return ($6|0);
 }
 $8 = (($6) + -4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = $9 & 3;
 $11 = ($10|0)==(0);
 if ($11) {
  STACKTOP = sp;return ($6|0);
 }
 _memset(($6|0),0,($req$0|0))|0;
 STACKTOP = sp;return ($6|0);
}
function _realloc($oldmem,$bytes) {
 $oldmem = $oldmem|0;
 $bytes = $bytes|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $mem$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($oldmem|0)==(0|0);
 do {
  if ($0) {
   $1 = (_malloc($bytes)|0);
   $mem$0 = $1;
  } else {
   $2 = ($bytes>>>0)>(4294967231);
   if ($2) {
    $3 = (___errno_location()|0);
    HEAP32[$3>>2] = 12;
    $mem$0 = 0;
    break;
   }
   $4 = ($bytes>>>0)<(11);
   if ($4) {
    $8 = 16;
   } else {
    $5 = (($bytes) + 11)|0;
    $6 = $5 & -8;
    $8 = $6;
   }
   $7 = (($oldmem) + -8|0);
   $9 = (_try_realloc_chunk($7,$8)|0);
   $10 = ($9|0)==(0|0);
   if (!($10)) {
    $11 = (($9) + 8|0);
    $mem$0 = $11;
    break;
   }
   $12 = (_malloc($bytes)|0);
   $13 = ($12|0)==(0|0);
   if ($13) {
    $mem$0 = 0;
   } else {
    $14 = (($oldmem) + -4|0);
    $15 = HEAP32[$14>>2]|0;
    $16 = $15 & -8;
    $17 = $15 & 3;
    $18 = ($17|0)==(0);
    $19 = $18 ? 8 : 4;
    $20 = (($16) - ($19))|0;
    $21 = ($20>>>0)<($bytes>>>0);
    $22 = $21 ? $20 : $bytes;
    _memcpy(($12|0),($oldmem|0),($22|0))|0;
    _free($oldmem);
    $mem$0 = $12;
   }
  }
 } while(0);
 STACKTOP = sp;return ($mem$0|0);
}
function _realloc_in_place($oldmem,$bytes) {
 $oldmem = $oldmem|0;
 $bytes = $bytes|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $oldmem$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($oldmem|0)==(0|0);
 if ($0) {
  STACKTOP = sp;return (0|0);
 }
 $1 = ($bytes>>>0)>(4294967231);
 if ($1) {
  $2 = (___errno_location()|0);
  HEAP32[$2>>2] = 12;
  STACKTOP = sp;return (0|0);
 }
 $3 = ($bytes>>>0)<(11);
 if ($3) {
  $7 = 16;
 } else {
  $4 = (($bytes) + 11)|0;
  $5 = $4 & -8;
  $7 = $5;
 }
 $6 = (($oldmem) + -8|0);
 $8 = (_try_realloc_chunk($6,$7)|0);
 $9 = ($8|0)==($6|0);
 $oldmem$ = $9 ? $oldmem : 0;
 STACKTOP = sp;return ($oldmem$|0);
}
function _memalign($alignment,$bytes) {
 $alignment = $alignment|0;
 $bytes = $bytes|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($alignment>>>0)<(9);
 if ($0) {
  $1 = (_malloc($bytes)|0);
  $$0 = $1;
 } else {
  $2 = (_internal_memalign($alignment,$bytes)|0);
  $$0 = $2;
 }
 STACKTOP = sp;return ($$0|0);
}
function _posix_memalign($pp,$alignment,$bytes) {
 $pp = $pp|0;
 $alignment = $alignment|0;
 $bytes = $bytes|0;
 var $$0 = 0, $$alignment = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $mem$0 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($alignment|0)==(8);
 if ($0) {
  $1 = (_malloc($bytes)|0);
  $mem$0 = $1;
  label = 7;
 } else {
  $2 = $alignment >>> 2;
  $3 = $alignment & 3;
  $4 = ($3|0)!=(0);
  $5 = ($2|0)==(0);
  $or$cond = $4 | $5;
  if ($or$cond) {
   $$0 = 22;
  } else {
   $6 = (($2) + 1073741823)|0;
   $7 = $6 & $2;
   $8 = ($7|0)==(0);
   if ($8) {
    $9 = (-64 - ($alignment))|0;
    $10 = ($9>>>0)<($bytes>>>0);
    if ($10) {
     $$0 = 12;
    } else {
     $11 = ($alignment>>>0)<(16);
     $$alignment = $11 ? 16 : $alignment;
     $12 = (_internal_memalign($$alignment,$bytes)|0);
     $mem$0 = $12;
     label = 7;
    }
   } else {
    $$0 = 22;
   }
  }
 }
 if ((label|0) == 7) {
  $13 = ($mem$0|0)==(0|0);
  if ($13) {
   $$0 = 12;
  } else {
   HEAP32[$pp>>2] = $mem$0;
   $$0 = 0;
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function _valloc($bytes) {
 $bytes = $bytes|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1024>>2]|0;
 $1 = ($0|0)==(0);
 if (!($1)) {
  $9 = HEAP32[((1024 + 4|0))>>2]|0;
  $10 = (_memalign($9,$bytes)|0);
  STACKTOP = sp;return ($10|0);
 }
 $2 = (_sysconf(30)|0);
 $3 = (($2) + -1)|0;
 $4 = $3 & $2;
 $5 = ($4|0)==(0);
 if (!($5)) {
  _abort();
  // unreachable;
 }
 HEAP32[((1024 + 8|0))>>2] = $2;
 HEAP32[((1024 + 4|0))>>2] = $2;
 HEAP32[((1024 + 12|0))>>2] = -1;
 HEAP32[((1024 + 16|0))>>2] = -1;
 HEAP32[((1024 + 20|0))>>2] = 0;
 HEAP32[((552 + 444|0))>>2] = 0;
 $6 = (_time((0|0))|0);
 $7 = $6 & -16;
 $8 = $7 ^ 1431655768;
 HEAP32[1024>>2] = $8;
 $9 = HEAP32[((1024 + 4|0))>>2]|0;
 $10 = (_memalign($9,$bytes)|0);
 STACKTOP = sp;return ($10|0);
}
function _pvalloc($bytes) {
 $bytes = $bytes|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1024>>2]|0;
 $1 = ($0|0)==(0);
 do {
  if ($1) {
   $2 = (_sysconf(30)|0);
   $3 = (($2) + -1)|0;
   $4 = $3 & $2;
   $5 = ($4|0)==(0);
   if ($5) {
    HEAP32[((1024 + 8|0))>>2] = $2;
    HEAP32[((1024 + 4|0))>>2] = $2;
    HEAP32[((1024 + 12|0))>>2] = -1;
    HEAP32[((1024 + 16|0))>>2] = -1;
    HEAP32[((1024 + 20|0))>>2] = 0;
    HEAP32[((552 + 444|0))>>2] = 0;
    $6 = (_time((0|0))|0);
    $7 = $6 & -16;
    $8 = $7 ^ 1431655768;
    HEAP32[1024>>2] = $8;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $9 = HEAP32[((1024 + 4|0))>>2]|0;
 $10 = (($bytes) + -1)|0;
 $11 = (($10) + ($9))|0;
 $12 = (0 - ($9))|0;
 $13 = $11 & $12;
 $14 = (_memalign($9,$13)|0);
 STACKTOP = sp;return ($14|0);
}
function _independent_calloc($n_elements,$elem_size,$chunks) {
 $n_elements = $n_elements|0;
 $elem_size = $elem_size|0;
 $chunks = $chunks|0;
 var $0 = 0, $sz = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $sz = sp;
 HEAP32[$sz>>2] = $elem_size;
 $0 = (_ialloc($n_elements,$sz,3,$chunks)|0);
 STACKTOP = sp;return ($0|0);
}
function _independent_comalloc($n_elements,$sizes,$chunks) {
 $n_elements = $n_elements|0;
 $sizes = $sizes|0;
 $chunks = $chunks|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_ialloc($n_elements,$sizes,0,$chunks)|0);
 STACKTOP = sp;return ($0|0);
}
function _bulk_free($array,$nelem) {
 $array = $array|0;
 $nelem = $nelem|0;
 var $$pre$i = 0, $$pre$phi$iZ2D = 0, $$sum$i = 0, $$sum1$i = 0, $$sum23$i = 0, $$sum5$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $a$06$i = 0, $or$cond$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($array) + ($nelem<<2)|0);
 $1 = ($nelem|0)==(0);
 if ($1) {
  STACKTOP = sp;return 0;
 } else {
  $a$06$i = $array;
 }
 L3: while(1) {
  $2 = HEAP32[$a$06$i>>2]|0;
  $3 = ($2|0)==(0|0);
  do {
   if ($3) {
    $$pre$i = (($a$06$i) + 4|0);
    $$pre$phi$iZ2D = $$pre$i;
   } else {
    $4 = (($2) + -8|0);
    $5 = (($2) + -4|0);
    $6 = HEAP32[$5>>2]|0;
    $7 = $6 & -8;
    HEAP32[$a$06$i>>2] = 0;
    $8 = HEAP32[((552 + 16|0))>>2]|0;
    $9 = ($4>>>0)<($8>>>0);
    $10 = $6 & 3;
    $11 = ($10|0)==(1);
    $or$cond$i = $9 | $11;
    if ($or$cond$i) {
     label = 9;
     break L3;
    }
    $12 = (($a$06$i) + 4|0);
    $13 = (($6) + -8)|0;
    $$sum$i = $13 & -8;
    $14 = ($12|0)==($0|0);
    if (!($14)) {
     $15 = HEAP32[$12>>2]|0;
     $$sum1$i = (($$sum$i) + 8)|0;
     $16 = (($2) + ($$sum1$i)|0);
     $17 = ($15|0)==($16|0);
     if ($17) {
      $$sum23$i = $$sum$i | 4;
      $18 = (($2) + ($$sum23$i)|0);
      $19 = HEAP32[$18>>2]|0;
      $20 = $19 & -8;
      $21 = (($20) + ($7))|0;
      $22 = $6 & 1;
      $23 = $22 | $21;
      $24 = $23 | 2;
      HEAP32[$5>>2] = $24;
      $$sum5$i = (($21) + -4)|0;
      $25 = (($2) + ($$sum5$i)|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = $26 | 1;
      HEAP32[$25>>2] = $27;
      HEAP32[$12>>2] = $2;
      $$pre$phi$iZ2D = $12;
      break;
     }
    }
    _dispose_chunk($4,$7);
    $$pre$phi$iZ2D = $12;
   }
  } while(0);
  $28 = ($$pre$phi$iZ2D|0)==($0|0);
  if ($28) {
   label = 11;
   break;
  } else {
   $a$06$i = $$pre$phi$iZ2D;
  }
 }
 if ((label|0) == 9) {
  _abort();
  // unreachable;
 }
 else if ((label|0) == 11) {
  STACKTOP = sp;return 0;
 }
 return (0)|0;
}
function _malloc_trim($pad) {
 $pad = $pad|0;
 var $$$i = 0, $$sum$i$i = 0, $$sum2$i$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $8 = 0, $9 = 0, $or$cond$i = 0, $released$2$i = 0, $sp$0$i$i = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1024>>2]|0;
 $1 = ($0|0)==(0);
 do {
  if ($1) {
   $2 = (_sysconf(30)|0);
   $3 = (($2) + -1)|0;
   $4 = $3 & $2;
   $5 = ($4|0)==(0);
   if ($5) {
    HEAP32[((1024 + 8|0))>>2] = $2;
    HEAP32[((1024 + 4|0))>>2] = $2;
    HEAP32[((1024 + 12|0))>>2] = -1;
    HEAP32[((1024 + 16|0))>>2] = -1;
    HEAP32[((1024 + 20|0))>>2] = 0;
    HEAP32[((552 + 444|0))>>2] = 0;
    $6 = (_time((0|0))|0);
    $7 = $6 & -16;
    $8 = $7 ^ 1431655768;
    HEAP32[1024>>2] = $8;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $9 = ($pad>>>0)<(4294967232);
 if (!($9)) {
  $released$2$i = 0;
  STACKTOP = sp;return ($released$2$i|0);
 }
 $10 = HEAP32[((552 + 24|0))>>2]|0;
 $11 = ($10|0)==(0|0);
 if ($11) {
  $released$2$i = 0;
  STACKTOP = sp;return ($released$2$i|0);
 }
 $12 = (($pad) + 40)|0;
 $13 = HEAP32[((552 + 12|0))>>2]|0;
 $14 = ($13>>>0)>($12>>>0);
 if ($14) {
  $15 = HEAP32[((1024 + 8|0))>>2]|0;
  $16 = (-41 - ($pad))|0;
  $17 = (($16) + ($13))|0;
  $18 = (($17) + ($15))|0;
  $19 = (($18>>>0) / ($15>>>0))&-1;
  $sp$0$i$i = ((552 + 448|0));
  while(1) {
   $20 = HEAP32[$sp$0$i$i>>2]|0;
   $21 = ($20>>>0)>($10>>>0);
   if (!($21)) {
    $22 = (($sp$0$i$i) + 4|0);
    $23 = HEAP32[$22>>2]|0;
    $24 = (($20) + ($23)|0);
    $25 = ($24>>>0)>($10>>>0);
    if ($25) {
     break;
    }
   }
   $26 = (($sp$0$i$i) + 8|0);
   $27 = HEAP32[$26>>2]|0;
   $sp$0$i$i = $27;
  }
  $28 = (($19) + -1)|0;
  $29 = Math_imul($28, $15)|0;
  $30 = (($sp$0$i$i) + 12|0);
  $31 = HEAP32[$30>>2]|0;
  $32 = $31 & 8;
  $33 = ($32|0)==(0);
  if ($33) {
   $34 = (_sbrk(0)|0);
   $35 = HEAP32[$sp$0$i$i>>2]|0;
   $36 = HEAP32[$22>>2]|0;
   $37 = (($35) + ($36)|0);
   $38 = ($34|0)==($37|0);
   if ($38) {
    $39 = (-2147483648 - ($15))|0;
    $40 = ($29>>>0)>(2147483646);
    $$$i = $40 ? $39 : $29;
    $41 = (0 - ($$$i))|0;
    $42 = (_sbrk(($41|0))|0);
    $43 = (_sbrk(0)|0);
    $44 = ($42|0)!=((-1)|0);
    $45 = ($43>>>0)<($34>>>0);
    $or$cond$i = $44 & $45;
    if ($or$cond$i) {
     $46 = $34;
     $47 = $43;
     $48 = (($46) - ($47))|0;
     $49 = ($34|0)==($43|0);
     if (!($49)) {
      $50 = HEAP32[$22>>2]|0;
      $51 = (($50) - ($48))|0;
      HEAP32[$22>>2] = $51;
      $52 = HEAP32[((552 + 432|0))>>2]|0;
      $53 = (($52) - ($48))|0;
      HEAP32[((552 + 432|0))>>2] = $53;
      $54 = HEAP32[((552 + 24|0))>>2]|0;
      $55 = HEAP32[((552 + 12|0))>>2]|0;
      $56 = (($55) - ($48))|0;
      $57 = (($54) + 8|0);
      $58 = $57;
      $59 = $58 & 7;
      $60 = ($59|0)==(0);
      if ($60) {
       $64 = 0;
      } else {
       $61 = (0 - ($58))|0;
       $62 = $61 & 7;
       $64 = $62;
      }
      $63 = (($54) + ($64)|0);
      $65 = (($56) - ($64))|0;
      HEAP32[((552 + 24|0))>>2] = $63;
      HEAP32[((552 + 12|0))>>2] = $65;
      $66 = $65 | 1;
      $$sum$i$i = (($64) + 4)|0;
      $67 = (($54) + ($$sum$i$i)|0);
      HEAP32[$67>>2] = $66;
      $$sum2$i$i = (($56) + 4)|0;
      $68 = (($54) + ($$sum2$i$i)|0);
      HEAP32[$68>>2] = 40;
      $69 = HEAP32[((1024 + 16|0))>>2]|0;
      HEAP32[((552 + 28|0))>>2] = $69;
      $released$2$i = 1;
      STACKTOP = sp;return ($released$2$i|0);
     }
    }
   }
  }
 }
 $70 = HEAP32[((552 + 12|0))>>2]|0;
 $71 = HEAP32[((552 + 28|0))>>2]|0;
 $72 = ($70>>>0)>($71>>>0);
 if (!($72)) {
  $released$2$i = 0;
  STACKTOP = sp;return ($released$2$i|0);
 }
 HEAP32[((552 + 28|0))>>2] = -1;
 $released$2$i = 0;
 STACKTOP = sp;return ($released$2$i|0);
}
function _malloc_footprint() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[((552 + 432|0))>>2]|0;
 STACKTOP = sp;return ($0|0);
}
function _malloc_max_footprint() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[((552 + 436|0))>>2]|0;
 STACKTOP = sp;return ($0|0);
}
function _malloc_footprint_limit() {
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[((552 + 440|0))>>2]|0;
 $1 = ($0|0)==(0);
 $2 = $1 ? -1 : $0;
 STACKTOP = sp;return ($2|0);
}
function _malloc_set_footprint_limit($bytes) {
 $bytes = $bytes|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $result$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes|0)==(-1);
 if ($0) {
  $result$0 = 0;
 } else {
  $1 = HEAP32[((1024 + 8|0))>>2]|0;
  $2 = (($bytes) + -1)|0;
  $3 = (($2) + ($1))|0;
  $4 = (0 - ($1))|0;
  $5 = $3 & $4;
  $result$0 = $5;
 }
 HEAP32[((552 + 440|0))>>2] = $result$0;
 STACKTOP = sp;return ($result$0|0);
}
function _mallinfo($agg$result) {
 $agg$result = $agg$result|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $mfree$09$i = 0, $mfree$1$lcssa$i = 0, $mfree$13$i = 0;
 var $mfree$2$i = 0, $nfree$08$i = 0, $nfree$1$lcssa$i = 0, $nfree$12$i = 0, $nfree$2$i = 0, $nm$sroa$0$0$i = 0, $nm$sroa$10$0$i = 0, $nm$sroa$5$0$i = 0, $nm$sroa$63$0$i = 0, $nm$sroa$7$0$i = 0, $nm$sroa$84$0$i = 0, $nm$sroa$9$0$i = 0, $or$cond$i = 0, $q$0$in5$i = 0, $s$011$i = 0, $sum$010$i = 0, $sum$1$lcssa$i = 0, $sum$14$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1024>>2]|0;
 $1 = ($0|0)==(0);
 do {
  if ($1) {
   $2 = (_sysconf(30)|0);
   $3 = (($2) + -1)|0;
   $4 = $3 & $2;
   $5 = ($4|0)==(0);
   if ($5) {
    HEAP32[((1024 + 8|0))>>2] = $2;
    HEAP32[((1024 + 4|0))>>2] = $2;
    HEAP32[((1024 + 12|0))>>2] = -1;
    HEAP32[((1024 + 16|0))>>2] = -1;
    HEAP32[((1024 + 20|0))>>2] = 0;
    HEAP32[((552 + 444|0))>>2] = 0;
    $6 = (_time((0|0))|0);
    $7 = $6 & -16;
    $8 = $7 ^ 1431655768;
    HEAP32[1024>>2] = $8;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $9 = HEAP32[((552 + 24|0))>>2]|0;
 $10 = ($9|0)==(0|0);
 if ($10) {
  $nm$sroa$0$0$i = 0;$nm$sroa$10$0$i = 0;$nm$sroa$5$0$i = 0;$nm$sroa$63$0$i = 0;$nm$sroa$7$0$i = 0;$nm$sroa$84$0$i = 0;$nm$sroa$9$0$i = 0;
 } else {
  $11 = HEAP32[((552 + 12|0))>>2]|0;
  $12 = (($11) + 40)|0;
  $mfree$09$i = $12;$nfree$08$i = 1;$s$011$i = ((552 + 448|0));$sum$010$i = $12;
  while(1) {
   $13 = HEAP32[$s$011$i>>2]|0;
   $14 = (($13) + 8|0);
   $15 = $14;
   $16 = $15 & 7;
   $17 = ($16|0)==(0);
   if ($17) {
    $21 = 0;
   } else {
    $18 = (0 - ($15))|0;
    $19 = $18 & 7;
    $21 = $19;
   }
   $20 = (($13) + ($21)|0);
   $22 = (($s$011$i) + 4|0);
   $23 = HEAP32[$22>>2]|0;
   $24 = (($13) + ($23)|0);
   $mfree$13$i = $mfree$09$i;$nfree$12$i = $nfree$08$i;$q$0$in5$i = $20;$sum$14$i = $sum$010$i;
   while(1) {
    $25 = ($q$0$in5$i>>>0)>=($24>>>0);
    $26 = ($q$0$in5$i|0)==($9|0);
    $or$cond$i = $25 | $26;
    if ($or$cond$i) {
     $mfree$1$lcssa$i = $mfree$13$i;$nfree$1$lcssa$i = $nfree$12$i;$sum$1$lcssa$i = $sum$14$i;
     break;
    }
    $27 = (($q$0$in5$i) + 4|0);
    $28 = HEAP32[$27>>2]|0;
    $29 = ($28|0)==(7);
    if ($29) {
     $mfree$1$lcssa$i = $mfree$13$i;$nfree$1$lcssa$i = $nfree$12$i;$sum$1$lcssa$i = $sum$14$i;
     break;
    }
    $30 = $28 & -8;
    $31 = (($30) + ($sum$14$i))|0;
    $32 = $28 & 3;
    $33 = ($32|0)==(1);
    if ($33) {
     $34 = (($30) + ($mfree$13$i))|0;
     $35 = (($nfree$12$i) + 1)|0;
     $mfree$2$i = $34;$nfree$2$i = $35;
    } else {
     $mfree$2$i = $mfree$13$i;$nfree$2$i = $nfree$12$i;
    }
    $36 = (($q$0$in5$i) + ($30)|0);
    $37 = ($36>>>0)<($13>>>0);
    if ($37) {
     $mfree$1$lcssa$i = $mfree$2$i;$nfree$1$lcssa$i = $nfree$2$i;$sum$1$lcssa$i = $31;
     break;
    } else {
     $mfree$13$i = $mfree$2$i;$nfree$12$i = $nfree$2$i;$q$0$in5$i = $36;$sum$14$i = $31;
    }
   }
   $38 = (($s$011$i) + 8|0);
   $39 = HEAP32[$38>>2]|0;
   $40 = ($39|0)==(0|0);
   if ($40) {
    break;
   } else {
    $mfree$09$i = $mfree$1$lcssa$i;$nfree$08$i = $nfree$1$lcssa$i;$s$011$i = $39;$sum$010$i = $sum$1$lcssa$i;
   }
  }
  $41 = HEAP32[((552 + 432|0))>>2]|0;
  $42 = (($41) - ($sum$1$lcssa$i))|0;
  $43 = HEAP32[((552 + 436|0))>>2]|0;
  $44 = (($41) - ($mfree$1$lcssa$i))|0;
  $nm$sroa$0$0$i = $sum$1$lcssa$i;$nm$sroa$10$0$i = $11;$nm$sroa$5$0$i = $nfree$1$lcssa$i;$nm$sroa$63$0$i = $42;$nm$sroa$7$0$i = $43;$nm$sroa$84$0$i = $44;$nm$sroa$9$0$i = $mfree$1$lcssa$i;
 }
 HEAP32[$agg$result>>2] = $nm$sroa$0$0$i;
 $45 = (($agg$result) + 4|0);
 HEAP32[$45>>2] = $nm$sroa$5$0$i;
 $46 = (($agg$result) + 8|0);
 $47 = $46;
 $48 = $47;
 HEAP32[$48>>2] = 0;
 $49 = (($47) + 4)|0;
 $50 = $49;
 HEAP32[$50>>2] = 0;
 $51 = (($agg$result) + 16|0);
 HEAP32[$51>>2] = $nm$sroa$63$0$i;
 $52 = (($agg$result) + 20|0);
 HEAP32[$52>>2] = $nm$sroa$7$0$i;
 $53 = (($agg$result) + 24|0);
 HEAP32[$53>>2] = 0;
 $54 = (($agg$result) + 28|0);
 HEAP32[$54>>2] = $nm$sroa$84$0$i;
 $55 = (($agg$result) + 32|0);
 HEAP32[$55>>2] = $nm$sroa$9$0$i;
 $56 = (($agg$result) + 36|0);
 HEAP32[$56>>2] = $nm$sroa$10$0$i;
 STACKTOP = sp;return;
}
function _malloc_stats() {
 var $$neg2$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $fp$0$i = 0, $maxfp$0$i = 0, $or$cond$i = 0, $q$0$in4$i = 0, $s$06$i = 0, $used$05$i = 0, $used$1$lcssa$i = 0, $used$13$i = 0, $used$2$i = 0, $used$3$i = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer4 = sp + 16|0;
 $vararg_buffer1 = sp + 8|0;
 $vararg_buffer = sp;
 $0 = HEAP32[1024>>2]|0;
 $1 = ($0|0)==(0);
 do {
  if ($1) {
   $2 = (_sysconf(30)|0);
   $3 = (($2) + -1)|0;
   $4 = $3 & $2;
   $5 = ($4|0)==(0);
   if ($5) {
    HEAP32[((1024 + 8|0))>>2] = $2;
    HEAP32[((1024 + 4|0))>>2] = $2;
    HEAP32[((1024 + 12|0))>>2] = -1;
    HEAP32[((1024 + 16|0))>>2] = -1;
    HEAP32[((1024 + 20|0))>>2] = 0;
    HEAP32[((552 + 444|0))>>2] = 0;
    $6 = (_time((0|0))|0);
    $7 = $6 & -16;
    $8 = $7 ^ 1431655768;
    HEAP32[1024>>2] = $8;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $9 = HEAP32[((552 + 24|0))>>2]|0;
 $10 = ($9|0)==(0|0);
 if ($10) {
  $fp$0$i = 0;$maxfp$0$i = 0;$used$3$i = 0;
  $41 = HEAP32[_stderr>>2]|0;
  HEAP32[$vararg_buffer>>2] = $maxfp$0$i;
  (_fprintf(($41|0),(1048|0),($vararg_buffer|0))|0);
  HEAP32[$vararg_buffer1>>2] = $fp$0$i;
  (_fprintf(($41|0),(1080|0),($vararg_buffer1|0))|0);
  HEAP32[$vararg_buffer4>>2] = $used$3$i;
  (_fprintf(($41|0),(1112|0),($vararg_buffer4|0))|0);
  STACKTOP = sp;return;
 }
 $11 = HEAP32[((552 + 436|0))>>2]|0;
 $12 = HEAP32[((552 + 432|0))>>2]|0;
 $13 = HEAP32[((552 + 12|0))>>2]|0;
 $$neg2$i = (($12) + -40)|0;
 $14 = (($$neg2$i) - ($13))|0;
 $s$06$i = ((552 + 448|0));$used$05$i = $14;
 while(1) {
  $15 = HEAP32[$s$06$i>>2]|0;
  $16 = (($15) + 8|0);
  $17 = $16;
  $18 = $17 & 7;
  $19 = ($18|0)==(0);
  if ($19) {
   $23 = 0;
  } else {
   $20 = (0 - ($17))|0;
   $21 = $20 & 7;
   $23 = $21;
  }
  $22 = (($15) + ($23)|0);
  $24 = (($s$06$i) + 4|0);
  $25 = HEAP32[$24>>2]|0;
  $26 = (($15) + ($25)|0);
  $q$0$in4$i = $22;$used$13$i = $used$05$i;
  while(1) {
   $27 = ($q$0$in4$i>>>0)>=($26>>>0);
   $28 = ($q$0$in4$i|0)==($9|0);
   $or$cond$i = $27 | $28;
   if ($or$cond$i) {
    $used$1$lcssa$i = $used$13$i;
    break;
   }
   $29 = (($q$0$in4$i) + 4|0);
   $30 = HEAP32[$29>>2]|0;
   $31 = ($30|0)==(7);
   if ($31) {
    $used$1$lcssa$i = $used$13$i;
    break;
   }
   $32 = $30 & 3;
   $33 = ($32|0)==(1);
   $34 = $30 & -8;
   $35 = $33 ? $34 : 0;
   $used$2$i = (($used$13$i) - ($35))|0;
   $36 = (($q$0$in4$i) + ($34)|0);
   $37 = ($36>>>0)<($15>>>0);
   if ($37) {
    $used$1$lcssa$i = $used$2$i;
    break;
   } else {
    $q$0$in4$i = $36;$used$13$i = $used$2$i;
   }
  }
  $38 = (($s$06$i) + 8|0);
  $39 = HEAP32[$38>>2]|0;
  $40 = ($39|0)==(0|0);
  if ($40) {
   $fp$0$i = $12;$maxfp$0$i = $11;$used$3$i = $used$1$lcssa$i;
   break;
  } else {
   $s$06$i = $39;$used$05$i = $used$1$lcssa$i;
  }
 }
 $41 = HEAP32[_stderr>>2]|0;
 HEAP32[$vararg_buffer>>2] = $maxfp$0$i;
 (_fprintf(($41|0),(1048|0),($vararg_buffer|0))|0);
 HEAP32[$vararg_buffer1>>2] = $fp$0$i;
 (_fprintf(($41|0),(1080|0),($vararg_buffer1|0))|0);
 HEAP32[$vararg_buffer4>>2] = $used$3$i;
 (_fprintf(($41|0),(1112|0),($vararg_buffer4|0))|0);
 STACKTOP = sp;return;
}
function _mallopt($param_number,$value) {
 $param_number = $param_number|0;
 $value = $value|0;
 var $$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1024>>2]|0;
 $1 = ($0|0)==(0);
 do {
  if ($1) {
   $2 = (_sysconf(30)|0);
   $3 = (($2) + -1)|0;
   $4 = $3 & $2;
   $5 = ($4|0)==(0);
   if ($5) {
    HEAP32[((1024 + 8|0))>>2] = $2;
    HEAP32[((1024 + 4|0))>>2] = $2;
    HEAP32[((1024 + 12|0))>>2] = -1;
    HEAP32[((1024 + 16|0))>>2] = -1;
    HEAP32[((1024 + 20|0))>>2] = 0;
    HEAP32[((552 + 444|0))>>2] = 0;
    $6 = (_time((0|0))|0);
    $7 = $6 & -16;
    $8 = $7 ^ 1431655768;
    HEAP32[1024>>2] = $8;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 if ((($param_number|0) == -2)) {
  $9 = HEAP32[((1024 + 4|0))>>2]|0;
  $10 = ($9>>>0)>($value>>>0);
  if ($10) {
   $$0$i = 0;
  } else {
   $11 = (($value) + -1)|0;
   $12 = $11 & $value;
   $13 = ($12|0)==(0);
   if ($13) {
    HEAP32[((1024 + 8|0))>>2] = $value;
    $$0$i = 1;
   } else {
    $$0$i = 0;
   }
  }
 } else if ((($param_number|0) == -3)) {
  HEAP32[((1024 + 12|0))>>2] = $value;
  $$0$i = 1;
 } else if ((($param_number|0) == -1)) {
  HEAP32[((1024 + 16|0))>>2] = $value;
  $$0$i = 1;
 } else {
  $$0$i = 0;
 }
 STACKTOP = sp;return ($$0$i|0);
}
function _malloc_usable_size($mem) {
 $mem = $mem|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  $$0 = 0;
 } else {
  $1 = (($mem) + -4|0);
  $2 = HEAP32[$1>>2]|0;
  $3 = $2 & 3;
  $4 = ($3|0)==(1);
  if ($4) {
   $$0 = 0;
  } else {
   $5 = $2 & -8;
   $6 = ($3|0)==(0);
   $7 = $6 ? 8 : 4;
   $8 = (($5) - ($7))|0;
   $$0 = $8;
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function _isdigit($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($c) + -48)|0;
 $1 = ($0>>>0)<(10);
 $2 = $1&1;
 STACKTOP = sp;return ($2|0);
}
function _isspace($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($c|0)==(32);
 if ($0) {
  $4 = 1;
 } else {
  $1 = (($c) + -9)|0;
  $2 = ($1>>>0)<(5);
  $4 = $2;
 }
 $3 = $4&1;
 STACKTOP = sp;return ($3|0);
}
function _isupper($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($c) + -65)|0;
 $1 = ($0>>>0)<(26);
 $2 = $1&1;
 STACKTOP = sp;return ($2|0);
}
function _isxdigit($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $isdigit = 0, $isdigittmp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $isdigittmp = (($c) + -48)|0;
 $isdigit = ($isdigittmp>>>0)<(10);
 if ($isdigit) {
  $4 = 1;
 } else {
  $0 = $c | 32;
  $1 = (($0) + -97)|0;
  $2 = ($1>>>0)<(6);
  $4 = $2;
 }
 $3 = $4&1;
 STACKTOP = sp;return ($3|0);
}
function _tolower($c) {
 $c = $c|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_isupper($c)|0);
 $1 = ($0|0)==(0);
 $2 = $c | 32;
 $$0 = $1 ? $c : $2;
 STACKTOP = sp;return ($$0|0);
}
function _feclearexcept($mask) {
 $mask = $mask|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = sp;return 0;
}
function _feraiseexcept($mask) {
 $mask = $mask|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = sp;return 0;
}
function _fetestexcept($mask) {
 $mask = $mask|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = sp;return 0;
}
function _fegetround() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = sp;return 0;
}
function ___fesetround($r) {
 $r = $r|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = sp;return 0;
}
function _fegetenv($envp) {
 $envp = $envp|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = sp;return 0;
}
function _fesetenv($envp) {
 $envp = $envp|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = sp;return 0;
}
function ___intscan($f,$base,$pok,$0,$1) {
 $f = $f|0;
 $base = $base|0;
 $pok = $pok|0;
 $0 = $0|0;
 $1 = $1|0;
 var $$1 = 0, $$125 = 0, $$126 = 0, $$base24 = 0, $$lcssa = 0, $$sum = 0, $$sum17 = 0, $$sum1737 = 0, $$sum18 = 0, $$sum19 = 0, $$sum20 = 0, $$sum21 = 0, $$sum2155 = 0, $$sum22 = 0, $$sum23 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0;
 var $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0;
 var $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0;
 var $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0;
 var $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0;
 var $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0;
 var $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0;
 var $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0;
 var $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0;
 var $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0;
 var $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0;
 var $285 = 0, $286 = 0, $287 = 0, $288 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, $c$0 = 0, $c$1 = 0, $c$127 = 0, $c$2$be = 0, $c$2$lcssa = 0, $c$3$be = 0, $c$3$lcssa = 0, $c$362 = 0, $c$4$be = 0, $c$4$lcssa = 0, $c$5$be = 0, $c$6$be = 0, $c$6$lcssa = 0, $c$7$be = 0, $c$747 = 0, $c$8 = 0, $c$9$be = 0, $neg$0 = 0;
 var $or$cond = 0, $or$cond11 = 0, $or$cond13 = 0, $or$cond15 = 0, $or$cond31 = 0, $or$cond5 = 0, $or$cond7 = 0, $or$cond9 = 0, $x$073 = 0, $x$138 = 0, $x$256 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($base>>>0)>(36);
 if ($2) {
  $5 = (___errno_location()|0);
  HEAP32[$5>>2] = 22;
  $279 = 0;$280 = 0;
  tempRet0 = $279;
  STACKTOP = sp;return ($280|0);
 }
 $3 = (($f) + 4|0);
 $4 = (($f) + 100|0);
 while(1) {
  $6 = HEAP32[$3>>2]|0;
  $7 = HEAP32[$4>>2]|0;
  $8 = ($6>>>0)<($7>>>0);
  if ($8) {
   $9 = (($6) + 1|0);
   HEAP32[$3>>2] = $9;
   $10 = HEAP8[$6>>0]|0;
   $11 = $10&255;
   $13 = $11;
  } else {
   $12 = (___shgetc($f)|0);
   $13 = $12;
  }
  $14 = (_isspace($13)|0);
  $15 = ($14|0)==(0);
  if ($15) {
   break;
  }
 }
 $16 = ($13|0)==(45);
 do {
  if ((($13|0) == 43) | (($13|0) == 45)) {
   $17 = $16 << 31 >> 31;
   $18 = HEAP32[$3>>2]|0;
   $19 = HEAP32[$4>>2]|0;
   $20 = ($18>>>0)<($19>>>0);
   if ($20) {
    $21 = (($18) + 1|0);
    HEAP32[$3>>2] = $21;
    $22 = HEAP8[$18>>0]|0;
    $23 = $22&255;
    $c$0 = $23;$neg$0 = $17;
    break;
   } else {
    $24 = (___shgetc($f)|0);
    $c$0 = $24;$neg$0 = $17;
    break;
   }
  } else {
   $c$0 = $13;$neg$0 = 0;
  }
 } while(0);
 $25 = ($base|0)==(0);
 $26 = $base & -17;
 $27 = ($26|0)==(0);
 $28 = ($c$0|0)==(48);
 $or$cond5 = $27 & $28;
 do {
  if ($or$cond5) {
   $29 = HEAP32[$3>>2]|0;
   $30 = HEAP32[$4>>2]|0;
   $31 = ($29>>>0)<($30>>>0);
   if ($31) {
    $32 = (($29) + 1|0);
    HEAP32[$3>>2] = $32;
    $33 = HEAP8[$29>>0]|0;
    $34 = $33&255;
    $37 = $34;
   } else {
    $35 = (___shgetc($f)|0);
    $37 = $35;
   }
   $36 = $37 | 32;
   $38 = ($36|0)==(120);
   if (!($38)) {
    if ($25) {
     $$126 = 8;$c$127 = $37;
     label = 46;
     break;
    } else {
     $$1 = $base;$c$1 = $37;
     label = 32;
     break;
    }
   }
   $39 = HEAP32[$3>>2]|0;
   $40 = HEAP32[$4>>2]|0;
   $41 = ($39>>>0)<($40>>>0);
   if ($41) {
    $42 = (($39) + 1|0);
    HEAP32[$3>>2] = $42;
    $43 = HEAP8[$39>>0]|0;
    $44 = $43&255;
    $46 = $44;
   } else {
    $45 = (___shgetc($f)|0);
    $46 = $45;
   }
   $$sum23 = (($46) + 1)|0;
   $47 = (1144 + ($$sum23)|0);
   $48 = HEAP8[$47>>0]|0;
   $49 = ($48&255)>(15);
   if ($49) {
    $50 = HEAP32[$4>>2]|0;
    $51 = ($50|0)==(0|0);
    if (!($51)) {
     $52 = HEAP32[$3>>2]|0;
     $53 = (($52) + -1|0);
     HEAP32[$3>>2] = $53;
    }
    $54 = ($pok|0)==(0);
    if ($54) {
     ___shlim($f,0);
     $279 = 0;$280 = 0;
     tempRet0 = $279;
     STACKTOP = sp;return ($280|0);
    }
    if ($51) {
     $279 = 0;$280 = 0;
     tempRet0 = $279;
     STACKTOP = sp;return ($280|0);
    }
    $55 = HEAP32[$3>>2]|0;
    $56 = (($55) + -1|0);
    HEAP32[$3>>2] = $56;
    $279 = 0;$280 = 0;
    tempRet0 = $279;
    STACKTOP = sp;return ($280|0);
   } else {
    $$126 = 16;$c$127 = $46;
    label = 46;
   }
  } else {
   $$base24 = $25 ? 10 : $base;
   $$sum = (($c$0) + 1)|0;
   $57 = (1144 + ($$sum)|0);
   $58 = HEAP8[$57>>0]|0;
   $59 = $58&255;
   $60 = ($59>>>0)<($$base24>>>0);
   if ($60) {
    $$1 = $$base24;$c$1 = $c$0;
    label = 32;
   } else {
    $61 = HEAP32[$4>>2]|0;
    $62 = ($61|0)==(0|0);
    if (!($62)) {
     $63 = HEAP32[$3>>2]|0;
     $64 = (($63) + -1|0);
     HEAP32[$3>>2] = $64;
    }
    ___shlim($f,0);
    $65 = (___errno_location()|0);
    HEAP32[$65>>2] = 22;
    $279 = 0;$280 = 0;
    tempRet0 = $279;
    STACKTOP = sp;return ($280|0);
   }
  }
 } while(0);
 if ((label|0) == 32) {
  $66 = ($$1|0)==(10);
  if ($66) {
   $67 = (($c$1) + -48)|0;
   $68 = ($67>>>0)<(10);
   if ($68) {
    $71 = $67;$x$073 = 0;
    while(1) {
     $69 = ($x$073*10)|0;
     $70 = (($69) + ($71))|0;
     $72 = HEAP32[$3>>2]|0;
     $73 = HEAP32[$4>>2]|0;
     $74 = ($72>>>0)<($73>>>0);
     if ($74) {
      $75 = (($72) + 1|0);
      HEAP32[$3>>2] = $75;
      $76 = HEAP8[$72>>0]|0;
      $77 = $76&255;
      $c$2$be = $77;
     } else {
      $78 = (___shgetc($f)|0);
      $c$2$be = $78;
     }
     $79 = (($c$2$be) + -48)|0;
     $80 = ($79>>>0)<(10);
     $81 = ($70>>>0)<(429496729);
     $or$cond7 = $80 & $81;
     if ($or$cond7) {
      $71 = $79;$x$073 = $70;
     } else {
      break;
     }
    }
    $281 = $70;$282 = 0;$c$2$lcssa = $c$2$be;
   } else {
    $281 = 0;$282 = 0;$c$2$lcssa = $c$1;
   }
   $82 = (($c$2$lcssa) + -48)|0;
   $83 = ($82>>>0)<(10);
   if ($83) {
    $84 = $281;$85 = $282;$89 = $82;$c$362 = $c$2$lcssa;
    while(1) {
     $86 = (___muldi3(($84|0),($85|0),10,0)|0);
     $87 = tempRet0;
     $88 = ($89|0)<(0);
     $90 = $88 << 31 >> 31;
     $91 = $89 ^ -1;
     $92 = $90 ^ -1;
     $93 = ($87>>>0)>($92>>>0);
     $94 = ($86>>>0)>($91>>>0);
     $95 = ($87|0)==($92|0);
     $96 = $95 & $94;
     $97 = $93 | $96;
     if ($97) {
      $$lcssa = $89;$283 = $84;$284 = $85;$c$3$lcssa = $c$362;
      break;
     }
     $98 = (_i64Add(($86|0),($87|0),($89|0),($90|0))|0);
     $99 = tempRet0;
     $100 = HEAP32[$3>>2]|0;
     $101 = HEAP32[$4>>2]|0;
     $102 = ($100>>>0)<($101>>>0);
     if ($102) {
      $103 = (($100) + 1|0);
      HEAP32[$3>>2] = $103;
      $104 = HEAP8[$100>>0]|0;
      $105 = $104&255;
      $c$3$be = $105;
     } else {
      $106 = (___shgetc($f)|0);
      $c$3$be = $106;
     }
     $107 = (($c$3$be) + -48)|0;
     $108 = ($107>>>0)<(10);
     $109 = ($99>>>0)<(429496729);
     $110 = ($98>>>0)<(2576980378);
     $111 = ($99|0)==(429496729);
     $112 = $111 & $110;
     $113 = $109 | $112;
     $or$cond9 = $108 & $113;
     if ($or$cond9) {
      $84 = $98;$85 = $99;$89 = $107;$c$362 = $c$3$be;
     } else {
      $$lcssa = $107;$283 = $98;$284 = $99;$c$3$lcssa = $c$3$be;
      break;
     }
    }
    $114 = ($$lcssa>>>0)>(9);
    if ($114) {
     $253 = $284;$255 = $283;
    } else {
     $$125 = 10;$285 = $283;$286 = $284;$c$8 = $c$3$lcssa;
     label = 72;
    }
   } else {
    $253 = $282;$255 = $281;
   }
  } else {
   $$126 = $$1;$c$127 = $c$1;
   label = 46;
  }
 }
 L69: do {
  if ((label|0) == 46) {
   $115 = (($$126) + -1)|0;
   $116 = $115 & $$126;
   $117 = ($116|0)==(0);
   if ($117) {
    $122 = ($$126*23)|0;
    $123 = $122 >>> 5;
    $124 = $123 & 7;
    $125 = (1408 + ($124)|0);
    $126 = HEAP8[$125>>0]|0;
    $127 = $126 << 24 >> 24;
    $$sum1737 = (($c$127) + 1)|0;
    $128 = (1144 + ($$sum1737)|0);
    $129 = HEAP8[$128>>0]|0;
    $130 = $129&255;
    $131 = ($130>>>0)<($$126>>>0);
    if ($131) {
     $134 = $130;$x$138 = 0;
     while(1) {
      $132 = $x$138 << $127;
      $133 = $134 | $132;
      $135 = HEAP32[$3>>2]|0;
      $136 = HEAP32[$4>>2]|0;
      $137 = ($135>>>0)<($136>>>0);
      if ($137) {
       $138 = (($135) + 1|0);
       HEAP32[$3>>2] = $138;
       $139 = HEAP8[$135>>0]|0;
       $140 = $139&255;
       $c$4$be = $140;
      } else {
       $141 = (___shgetc($f)|0);
       $c$4$be = $141;
      }
      $$sum17 = (($c$4$be) + 1)|0;
      $142 = (1144 + ($$sum17)|0);
      $143 = HEAP8[$142>>0]|0;
      $144 = $143&255;
      $145 = ($144>>>0)<($$126>>>0);
      $146 = ($133>>>0)<(134217728);
      $or$cond11 = $145 & $146;
      if ($or$cond11) {
       $134 = $144;$x$138 = $133;
      } else {
       break;
      }
     }
     $150 = $143;$153 = 0;$155 = $133;$c$4$lcssa = $c$4$be;
    } else {
     $150 = $129;$153 = 0;$155 = 0;$c$4$lcssa = $c$127;
    }
    $147 = (_bitshift64Lshr(-1,-1,($127|0))|0);
    $148 = tempRet0;
    $149 = $150&255;
    $151 = ($149>>>0)>=($$126>>>0);
    $152 = ($153>>>0)>($148>>>0);
    $154 = ($155>>>0)>($147>>>0);
    $156 = ($153|0)==($148|0);
    $157 = $156 & $154;
    $158 = $152 | $157;
    $or$cond31 = $151 | $158;
    if ($or$cond31) {
     $$125 = $$126;$285 = $155;$286 = $153;$c$8 = $c$4$lcssa;
     label = 72;
     break;
    } else {
     $159 = $155;$160 = $153;$164 = $150;
    }
    while(1) {
     $161 = (_bitshift64Shl(($159|0),($160|0),($127|0))|0);
     $162 = tempRet0;
     $163 = $164&255;
     $165 = $163 | $161;
     $166 = HEAP32[$3>>2]|0;
     $167 = HEAP32[$4>>2]|0;
     $168 = ($166>>>0)<($167>>>0);
     if ($168) {
      $169 = (($166) + 1|0);
      HEAP32[$3>>2] = $169;
      $170 = HEAP8[$166>>0]|0;
      $171 = $170&255;
      $c$5$be = $171;
     } else {
      $172 = (___shgetc($f)|0);
      $c$5$be = $172;
     }
     $$sum18 = (($c$5$be) + 1)|0;
     $173 = (1144 + ($$sum18)|0);
     $174 = HEAP8[$173>>0]|0;
     $175 = $174&255;
     $176 = ($175>>>0)>=($$126>>>0);
     $177 = ($162>>>0)>($148>>>0);
     $178 = ($165>>>0)>($147>>>0);
     $179 = ($162|0)==($148|0);
     $180 = $179 & $178;
     $181 = $177 | $180;
     $or$cond = $176 | $181;
     if ($or$cond) {
      $$125 = $$126;$285 = $165;$286 = $162;$c$8 = $c$5$be;
      label = 72;
      break L69;
     } else {
      $159 = $165;$160 = $162;$164 = $174;
     }
    }
   }
   $$sum2155 = (($c$127) + 1)|0;
   $118 = (1144 + ($$sum2155)|0);
   $119 = HEAP8[$118>>0]|0;
   $120 = $119&255;
   $121 = ($120>>>0)<($$126>>>0);
   if ($121) {
    $184 = $120;$x$256 = 0;
    while(1) {
     $182 = Math_imul($x$256, $$126)|0;
     $183 = (($184) + ($182))|0;
     $185 = HEAP32[$3>>2]|0;
     $186 = HEAP32[$4>>2]|0;
     $187 = ($185>>>0)<($186>>>0);
     if ($187) {
      $188 = (($185) + 1|0);
      HEAP32[$3>>2] = $188;
      $189 = HEAP8[$185>>0]|0;
      $190 = $189&255;
      $c$6$be = $190;
     } else {
      $191 = (___shgetc($f)|0);
      $c$6$be = $191;
     }
     $$sum21 = (($c$6$be) + 1)|0;
     $192 = (1144 + ($$sum21)|0);
     $193 = HEAP8[$192>>0]|0;
     $194 = $193&255;
     $195 = ($194>>>0)<($$126>>>0);
     $196 = ($183>>>0)<(119304647);
     $or$cond13 = $195 & $196;
     if ($or$cond13) {
      $184 = $194;$x$256 = $183;
     } else {
      break;
     }
    }
    $198 = $193;$287 = $183;$288 = 0;$c$6$lcssa = $c$6$be;
   } else {
    $198 = $119;$287 = 0;$288 = 0;$c$6$lcssa = $c$127;
   }
   $197 = $198&255;
   $199 = ($197>>>0)<($$126>>>0);
   if ($199) {
    $200 = (___udivdi3(-1,-1,($$126|0),0)|0);
    $201 = tempRet0;
    $203 = $288;$205 = $287;$212 = $198;$c$747 = $c$6$lcssa;
    while(1) {
     $202 = ($203>>>0)>($201>>>0);
     $204 = ($205>>>0)>($200>>>0);
     $206 = ($203|0)==($201|0);
     $207 = $206 & $204;
     $208 = $202 | $207;
     if ($208) {
      $$125 = $$126;$285 = $205;$286 = $203;$c$8 = $c$747;
      label = 72;
      break L69;
     }
     $209 = (___muldi3(($205|0),($203|0),($$126|0),0)|0);
     $210 = tempRet0;
     $211 = $212&255;
     $213 = $211 ^ -1;
     $214 = ($210>>>0)>(4294967295);
     $215 = ($209>>>0)>($213>>>0);
     $216 = ($210|0)==(-1);
     $217 = $216 & $215;
     $218 = $214 | $217;
     if ($218) {
      $$125 = $$126;$285 = $205;$286 = $203;$c$8 = $c$747;
      label = 72;
      break L69;
     }
     $219 = (_i64Add(($211|0),0,($209|0),($210|0))|0);
     $220 = tempRet0;
     $221 = HEAP32[$3>>2]|0;
     $222 = HEAP32[$4>>2]|0;
     $223 = ($221>>>0)<($222>>>0);
     if ($223) {
      $224 = (($221) + 1|0);
      HEAP32[$3>>2] = $224;
      $225 = HEAP8[$221>>0]|0;
      $226 = $225&255;
      $c$7$be = $226;
     } else {
      $227 = (___shgetc($f)|0);
      $c$7$be = $227;
     }
     $$sum22 = (($c$7$be) + 1)|0;
     $228 = (1144 + ($$sum22)|0);
     $229 = HEAP8[$228>>0]|0;
     $230 = $229&255;
     $231 = ($230>>>0)<($$126>>>0);
     if ($231) {
      $203 = $220;$205 = $219;$212 = $229;$c$747 = $c$7$be;
     } else {
      $$125 = $$126;$285 = $219;$286 = $220;$c$8 = $c$7$be;
      label = 72;
      break;
     }
    }
   } else {
    $$125 = $$126;$285 = $287;$286 = $288;$c$8 = $c$6$lcssa;
    label = 72;
   }
  }
 } while(0);
 if ((label|0) == 72) {
  $$sum19 = (($c$8) + 1)|0;
  $232 = (1144 + ($$sum19)|0);
  $233 = HEAP8[$232>>0]|0;
  $234 = $233&255;
  $235 = ($234>>>0)<($$125>>>0);
  if ($235) {
   while(1) {
    $236 = HEAP32[$3>>2]|0;
    $237 = HEAP32[$4>>2]|0;
    $238 = ($236>>>0)<($237>>>0);
    if ($238) {
     $239 = (($236) + 1|0);
     HEAP32[$3>>2] = $239;
     $240 = HEAP8[$236>>0]|0;
     $241 = $240&255;
     $c$9$be = $241;
    } else {
     $242 = (___shgetc($f)|0);
     $c$9$be = $242;
    }
    $$sum20 = (($c$9$be) + 1)|0;
    $243 = (1144 + ($$sum20)|0);
    $244 = HEAP8[$243>>0]|0;
    $245 = $244&255;
    $246 = ($245>>>0)<($$125>>>0);
    if (!($246)) {
     break;
    }
   }
   $247 = (___errno_location()|0);
   HEAP32[$247>>2] = 34;
   $253 = $1;$255 = $0;
  } else {
   $253 = $286;$255 = $285;
  }
 }
 $248 = HEAP32[$4>>2]|0;
 $249 = ($248|0)==(0|0);
 if (!($249)) {
  $250 = HEAP32[$3>>2]|0;
  $251 = (($250) + -1|0);
  HEAP32[$3>>2] = $251;
 }
 $252 = ($253>>>0)<($1>>>0);
 $254 = ($255>>>0)<($0>>>0);
 $256 = ($253|0)==($1|0);
 $257 = $256 & $254;
 $258 = $252 | $257;
 if (!($258)) {
  $259 = $0 & 1;
  $260 = ($259|0)!=(0);
  $261 = (0)!=(0);
  $262 = $260 | $261;
  $263 = ($neg$0|0)!=(0);
  $or$cond15 = $262 | $263;
  if (!($or$cond15)) {
   $264 = (___errno_location()|0);
   HEAP32[$264>>2] = 34;
   $265 = (_i64Add(($0|0),($1|0),-1,-1)|0);
   $266 = tempRet0;
   $279 = $266;$280 = $265;
   tempRet0 = $279;
   STACKTOP = sp;return ($280|0);
  }
  $267 = ($253>>>0)>($1>>>0);
  $268 = ($255>>>0)>($0>>>0);
  $269 = ($253|0)==($1|0);
  $270 = $269 & $268;
  $271 = $267 | $270;
  if ($271) {
   $272 = (___errno_location()|0);
   HEAP32[$272>>2] = 34;
   $279 = $1;$280 = $0;
   tempRet0 = $279;
   STACKTOP = sp;return ($280|0);
  }
 }
 $273 = ($neg$0|0)<(0);
 $274 = $273 << 31 >> 31;
 $275 = $255 ^ $neg$0;
 $276 = $253 ^ $274;
 $277 = (_i64Subtract(($275|0),($276|0),($neg$0|0),($274|0))|0);
 $278 = tempRet0;
 $279 = $278;$280 = $277;
 tempRet0 = $279;
 STACKTOP = sp;return ($280|0);
}
function ___floatscan($f,$prec,$pok) {
 $f = $f|0;
 $prec = $prec|0;
 $pok = $pok|0;
 var $$$i = 0, $$0 = 0.0, $$011$i = 0, $$012$i = 0, $$01231$i = 0, $$01232$i = 0, $$06$i = 0, $$0611$i = 0, $$0612$i = 0, $$1$be$i = 0, $$1$ph$i = 0, $$13$i = 0, $$2$i = 0, $$20$i = 0, $$3$be$i = 0, $$3$lcssa$i = 0, $$3120$i = 0, $$in = 0, $$k$0$i = 0, $$lcssa60$i = 0;
 var $$lnz$0$i = 0, $$neg37$i = 0, $$old8 = 0, $$pn$i = 0.0, $$pre$i = 0.0, $$pre$i18 = 0, $$pre$phi$iZ2D = 0.0, $$promoted$i = 0, $$sink$off0$us$i = 0, $$sink$off0$us70$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0;
 var $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0;
 var $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0;
 var $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0;
 var $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0;
 var $18 = 0, $180 = 0, $181 = 0.0, $182 = 0.0, $183 = 0.0, $184 = 0.0, $185 = 0, $186 = 0, $187 = 0.0, $188 = 0.0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0;
 var $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0.0, $209 = 0.0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0;
 var $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0;
 var $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0;
 var $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0.0, $256 = 0.0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0.0, $265 = 0.0, $266 = 0.0, $267 = 0, $268 = 0, $269 = 0;
 var $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0.0, $278 = 0.0, $279 = 0.0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0.0, $284 = 0, $285 = 0, $286 = 0, $287 = 0;
 var $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0;
 var $305 = 0.0, $306 = 0.0, $307 = 0.0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0.0, $314 = 0.0, $315 = 0.0, $316 = 0.0, $317 = 0.0, $318 = 0.0, $319 = 0, $32 = 0, $320 = 0, $321 = 0.0, $322 = 0;
 var $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0;
 var $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0;
 var $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0;
 var $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0;
 var $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0;
 var $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0.0, $419 = 0.0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0;
 var $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0.0, $436 = 0.0, $437 = 0.0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0.0, $448 = 0.0, $449 = 0.0;
 var $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0.0, $46 = 0, $460 = 0.0, $461 = 0.0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0;
 var $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0.0, $474 = 0, $475 = 0.0, $476 = 0.0, $477 = 0, $478 = 0.0, $479 = 0, $48 = 0.0, $480 = 0.0, $481 = 0.0, $482 = 0, $483 = 0, $484 = 0, $485 = 0.0;
 var $486 = 0.0, $487 = 0, $488 = 0, $489 = 0, $49 = 0.0, $490 = 0, $491 = 0, $492 = 0.0, $493 = 0.0, $494 = 0.0, $495 = 0, $496 = 0, $497 = 0, $498 = 0.0, $499 = 0.0, $5 = 0, $50 = 0.0, $500 = 0, $501 = 0, $502 = 0;
 var $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0;
 var $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0;
 var $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0;
 var $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0;
 var $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0;
 var $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0;
 var $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0;
 var $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0.0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0;
 var $648 = 0, $649 = 0.0, $65 = 0, $650 = 0.0, $651 = 0.0, $652 = 0, $653 = 0.0, $654 = 0.0, $655 = 0.0, $656 = 0.0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0;
 var $666 = 0, $667 = 0.0, $668 = 0.0, $669 = 0.0, $67 = 0, $670 = 0, $671 = 0.0, $672 = 0.0, $673 = 0, $674 = 0, $675 = 0, $676 = 0.0, $677 = 0.0, $678 = 0.0, $679 = 0.0, $68 = 0, $680 = 0, $681 = 0, $682 = 0.0, $683 = 0;
 var $684 = 0.0, $685 = 0.0, $686 = 0.0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0.0, $692 = 0, $693 = 0, $694 = 0, $695 = 0.0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0;
 var $701 = 0, $702 = 0.0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0.0, $708 = 0, $709 = 0, $71 = 0, $710 = 0.0, $711 = 0.0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0;
 var $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $74 = 0;
 var $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0;
 var $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $a$0$lcssa182$i = 0, $a$078$i = 0, $a$1$i = 0, $a$2$ph57$i = 0, $a$3$i = 0, $a$3$i$ph = 0, $a$3$ph$i = 0, $a$444$i = 0, $a$5$i = 0, $bias$0$i = 0.0, $bias$0$i25 = 0.0, $bits$0$ph = 0, $brmerge = 0;
 var $brmerge108 = 0, $c$0 = 0, $c$0$i = 0, $c$1$lcssa = 0, $c$1$ph$i = 0, $c$171 = 0, $c$2 = 0, $c$2$i = 0, $c$2$lcssa$i = 0, $c$369 = 0, $c$4 = 0, $c$5 = 0, $c$6 = 0, $carry$080$i = 0, $carry1$0$us$i = 0, $carry1$0$us66$i = 0, $carry1$1$lcssa$lcssa$i = 0, $carry1$1$us$i = 0, $carry1$1$us71$i = 0, $carry3$047$i = 0;
 var $cond$i = 0, $d$0$i = 0, $denormal$0$i = 0, $denormal$029$i = 0, $denormal$030$i = 0, $denormal$1$i = 0, $denormal$2$i = 0, $e2$0$ph$i = 0, $e2$0$us$i = 0, $e2$0$us61$i = 0, $e2$1$i = 0, $e2$1$i$ph = 0, $e2$1$ph$i = 0, $e2$2$i = 0, $e2$3$i = 0, $emin$0$ph = 0, $exitcond$i = 0, $frac$0$i = 0.0, $frac$1$i = 0.0, $frac$2$i = 0.0;
 var $gotdig$0$i = 0, $gotdig$0$i11 = 0, $gotdig$2$i = 0, $gotdig$2$i12 = 0, $gotdig$3$i = 0, $gotdig$3$lcssa$i = 0, $gotdig$3116$i = 0, $gotdig$4$i = 0, $gotrad$0$i = 0, $gotrad$0$i13 = 0, $gotrad$1$i = 0, $gotrad$1$lcssa$i = 0, $gotrad$1117$i = 0, $gotrad$2$i = 0, $gottail$0$i = 0, $gottail$1$i = 0, $gottail$2$i = 0, $i$0$lcssa = 0, $i$042$i = 0, $i$070 = 0;
 var $i$1 = 0, $i$1$i = 0, $i$268 = 0, $i$3 = 0, $i$4 = 0, $j$0$lcssa$i = 0, $j$0108$i = 0, $j$0109$i = 0, $j$0110$i = 0, $j$0119$i = 0, $j$2$i = 0, $j$388$i = 0, $k$0$lcssa$i = 0, $k$0104$i = 0, $k$0105$i = 0, $k$0106$i = 0, $k$0118$i = 0, $k$2$i = 0, $k$3$i = 0, $k$479$i = 0;
 var $k$5$in$us$i = 0, $k$5$in$us65$i = 0, $k$5$us$i = 0, $k$5$us67$i = 0, $k$5$z$2$us$i = 0, $k$5$z$2$us73$i = 0, $k$645$i = 0, $lnz$0$lcssa$i = 0, $lnz$0100$i = 0, $lnz$0115$i = 0, $lnz$098$i = 0, $lnz$099$i = 0, $lnz$2$i = 0, $notlhs = 0, $notrhs = 0, $or$cond = 0, $or$cond$i = 0, $or$cond$i15 = 0, $or$cond10$i = 0, $or$cond112$i = 0;
 var $or$cond15$i = 0, $or$cond17$i = 0, $or$cond18$i = 0, $or$cond187$i = 0, $or$cond19$us$i = 0, $or$cond19$us72$i = 0, $or$cond21$i = 0, $or$cond22$i = 0, $or$cond3$i = 0, $or$cond3$i16 = 0, $or$cond5 = 0, $or$cond5$i = 0, $or$cond5$i17 = 0, $or$cond7 = 0, $or$cond8$i = 0, $or$cond8$i20 = 0, $or$cond9$not = 0, $rp$0$lcssa183$i = 0, $rp$077$i = 0, $rp$1$i19 = 0;
 var $rp$2$ph55$i = 0, $rp$3$i$ph = 0, $rp$3$ph50$i = 0, $rp$443$i = 0, $rp$5$i = 0, $scale$0$i = 0.0, $scale$1$i = 0.0, $scale$2$i = 0.0, $sign$0 = 0, $storemerge$i = 0, $sum$i = 0, $x$0$i = 0, $x$1$i = 0, $x$2$i = 0, $x$3$lcssa$i = 0, $x$318$i = 0, $x$4$lcssa$i = 0, $x$413$i = 0, $x$5$i = 0, $x$6$i = 0;
 var $x$i = 0, $y$0$i = 0.0, $y$1$i = 0.0, $y$1$i24 = 0.0, $y$2$i = 0.0, $y$2$i26 = 0.0, $y$3$i = 0.0, $y$3$lcssa$i = 0.0, $y$314$i = 0.0, $y$4$i = 0.0, $y$5$i = 0.0, $z$0$i = 0, $z$1$ph56$i = 0, $z$1$us$i = 0, $z$1$us62$i = 0, $z$2$us$i = 0, $z$2$us64$i = 0, $z$3$lcssa$lcssa$i = 0, $z$3$us$i = 0, $z$3$us74$i = 0;
 var $z$4$i = 0, $z$5$ph$i = 0, $z$7$1$i = 0, $z$7$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 512|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $x$i = sp;
 if ((($prec|0) == 0)) {
  $bits$0$ph = 24;$emin$0$ph = -149;
 } else if ((($prec|0) == 1)) {
  $bits$0$ph = 53;$emin$0$ph = -1074;
 } else if ((($prec|0) == 2)) {
  $bits$0$ph = 53;$emin$0$ph = -1074;
 } else {
  $$0 = 0.0;
  STACKTOP = sp;return (+$$0);
 }
 $0 = (($f) + 4|0);
 $1 = (($f) + 100|0);
 while(1) {
  $2 = HEAP32[$0>>2]|0;
  $3 = HEAP32[$1>>2]|0;
  $4 = ($2>>>0)<($3>>>0);
  if ($4) {
   $5 = (($2) + 1|0);
   HEAP32[$0>>2] = $5;
   $6 = HEAP8[$2>>0]|0;
   $7 = $6&255;
   $9 = $7;
  } else {
   $8 = (___shgetc($f)|0);
   $9 = $8;
  }
  $10 = (_isspace($9)|0);
  $11 = ($10|0)==(0);
  if ($11) {
   break;
  }
 }
 $12 = ($9|0)==(45);
 do {
  if ((($9|0) == 43) | (($9|0) == 45)) {
   $13 = $12&1;
   $14 = $13 << 1;
   $15 = (1 - ($14))|0;
   $16 = HEAP32[$0>>2]|0;
   $17 = HEAP32[$1>>2]|0;
   $18 = ($16>>>0)<($17>>>0);
   if ($18) {
    $19 = (($16) + 1|0);
    HEAP32[$0>>2] = $19;
    $20 = HEAP8[$16>>0]|0;
    $21 = $20&255;
    $c$0 = $21;$sign$0 = $15;
    break;
   } else {
    $22 = (___shgetc($f)|0);
    $c$0 = $22;$sign$0 = $15;
    break;
   }
  } else {
   $c$0 = $9;$sign$0 = 1;
  }
 } while(0);
 $c$171 = $c$0;$i$070 = 0;
 while(1) {
  $23 = $c$171 | 32;
  $24 = (1424 + ($i$070)|0);
  $25 = HEAP8[$24>>0]|0;
  $26 = $25 << 24 >> 24;
  $27 = ($23|0)==($26|0);
  if (!($27)) {
   $c$1$lcssa = $c$171;$i$0$lcssa = $i$070;
   break;
  }
  $28 = ($i$070>>>0)<(7);
  do {
   if ($28) {
    $29 = HEAP32[$0>>2]|0;
    $30 = HEAP32[$1>>2]|0;
    $31 = ($29>>>0)<($30>>>0);
    if ($31) {
     $32 = (($29) + 1|0);
     HEAP32[$0>>2] = $32;
     $33 = HEAP8[$29>>0]|0;
     $34 = $33&255;
     $c$2 = $34;
     break;
    } else {
     $35 = (___shgetc($f)|0);
     $c$2 = $35;
     break;
    }
   } else {
    $c$2 = $c$171;
   }
  } while(0);
  $36 = (($i$070) + 1)|0;
  $37 = ($36>>>0)<(8);
  if ($37) {
   $c$171 = $c$2;$i$070 = $36;
  } else {
   $c$1$lcssa = $c$2;$i$0$lcssa = $36;
   break;
  }
 }
 do {
  if ((($i$0$lcssa|0) == 3)) {
   label = 23;
  } else if (!((($i$0$lcssa|0) == 8))) {
   $38 = ($i$0$lcssa>>>0)>(3);
   $39 = ($pok|0)!=(0);
   $or$cond5 = $38 & $39;
   if ($or$cond5) {
    $40 = ($i$0$lcssa|0)==(8);
    if ($40) {
     break;
    } else {
     label = 23;
     break;
    }
   }
   $51 = ($i$0$lcssa|0)==(0);
   L34: do {
    if ($51) {
     $c$369 = $c$1$lcssa;$i$268 = 0;
     while(1) {
      $52 = $c$369 | 32;
      $53 = (1440 + ($i$268)|0);
      $54 = HEAP8[$53>>0]|0;
      $55 = $54 << 24 >> 24;
      $56 = ($52|0)==($55|0);
      if (!($56)) {
       $c$5 = $c$369;$i$3 = $i$268;
       break L34;
      }
      $57 = ($i$268>>>0)<(2);
      do {
       if ($57) {
        $58 = HEAP32[$0>>2]|0;
        $59 = HEAP32[$1>>2]|0;
        $60 = ($58>>>0)<($59>>>0);
        if ($60) {
         $61 = (($58) + 1|0);
         HEAP32[$0>>2] = $61;
         $62 = HEAP8[$58>>0]|0;
         $63 = $62&255;
         $c$4 = $63;
         break;
        } else {
         $64 = (___shgetc($f)|0);
         $c$4 = $64;
         break;
        }
       } else {
        $c$4 = $c$369;
       }
      } while(0);
      $65 = (($i$268) + 1)|0;
      $66 = ($65>>>0)<(3);
      if ($66) {
       $c$369 = $c$4;$i$268 = $65;
      } else {
       $c$5 = $c$4;$i$3 = $65;
       break;
      }
     }
    } else {
     $c$5 = $c$1$lcssa;$i$3 = $i$0$lcssa;
    }
   } while(0);
   if ((($i$3|0) == 3)) {
    $67 = HEAP32[$0>>2]|0;
    $68 = HEAP32[$1>>2]|0;
    $69 = ($67>>>0)<($68>>>0);
    if ($69) {
     $70 = (($67) + 1|0);
     HEAP32[$0>>2] = $70;
     $71 = HEAP8[$67>>0]|0;
     $72 = $71&255;
     $75 = $72;
    } else {
     $73 = (___shgetc($f)|0);
     $75 = $73;
    }
    $74 = ($75|0)==(40);
    if ($74) {
     $i$4 = 1;
    } else {
     $76 = HEAP32[$1>>2]|0;
     $77 = ($76|0)==(0|0);
     if ($77) {
      $$0 = nan;
      STACKTOP = sp;return (+$$0);
     }
     $78 = HEAP32[$0>>2]|0;
     $79 = (($78) + -1|0);
     HEAP32[$0>>2] = $79;
     $$0 = nan;
     STACKTOP = sp;return (+$$0);
    }
    while(1) {
     $80 = HEAP32[$0>>2]|0;
     $81 = HEAP32[$1>>2]|0;
     $82 = ($80>>>0)<($81>>>0);
     if ($82) {
      $83 = (($80) + 1|0);
      HEAP32[$0>>2] = $83;
      $84 = HEAP8[$80>>0]|0;
      $85 = $84&255;
      $88 = $85;
     } else {
      $86 = (___shgetc($f)|0);
      $88 = $86;
     }
     $87 = (($88) + -48)|0;
     $89 = ($87>>>0)<(10);
     $90 = (($88) + -65)|0;
     $91 = ($90>>>0)<(26);
     $or$cond = $89 | $91;
     if (!($or$cond)) {
      $92 = (($88) + -97)|0;
      $93 = ($92>>>0)<(26);
      $94 = ($88|0)==(95);
      $or$cond7 = $93 | $94;
      if (!($or$cond7)) {
       break;
      }
     }
     $106 = (($i$4) + 1)|0;
     $i$4 = $106;
    }
    $95 = ($88|0)==(41);
    if ($95) {
     $$0 = nan;
     STACKTOP = sp;return (+$$0);
    }
    $96 = HEAP32[$1>>2]|0;
    $97 = ($96|0)==(0|0);
    if (!($97)) {
     $98 = HEAP32[$0>>2]|0;
     $99 = (($98) + -1|0);
     HEAP32[$0>>2] = $99;
    }
    if (!($39)) {
     $101 = (___errno_location()|0);
     HEAP32[$101>>2] = 22;
     ___shlim($f,0);
     $$0 = 0.0;
     STACKTOP = sp;return (+$$0);
    }
    $100 = ($i$4|0)==(0);
    $brmerge108 = $100 | $97;
    if ($brmerge108) {
     $$0 = nan;
     STACKTOP = sp;return (+$$0);
    } else {
     $$in = $i$4;
    }
    while(1) {
     $102 = (($$in) + -1)|0;
     $103 = HEAP32[$0>>2]|0;
     $104 = (($103) + -1|0);
     HEAP32[$0>>2] = $104;
     $105 = ($102|0)==(0);
     if ($105) {
      $$0 = nan;
      break;
     } else {
      $$in = $102;
     }
    }
    STACKTOP = sp;return (+$$0);
   } else if ((($i$3|0) == 0)) {
    $112 = ($c$5|0)==(48);
    do {
     if ($112) {
      $113 = HEAP32[$0>>2]|0;
      $114 = HEAP32[$1>>2]|0;
      $115 = ($113>>>0)<($114>>>0);
      if ($115) {
       $116 = (($113) + 1|0);
       HEAP32[$0>>2] = $116;
       $117 = HEAP8[$113>>0]|0;
       $118 = $117&255;
       $121 = $118;
      } else {
       $119 = (___shgetc($f)|0);
       $121 = $119;
      }
      $120 = $121 | 32;
      $122 = ($120|0)==(120);
      if (!($122)) {
       $322 = HEAP32[$1>>2]|0;
       $323 = ($322|0)==(0|0);
       if ($323) {
        $c$6 = 48;
        break;
       }
       $324 = HEAP32[$0>>2]|0;
       $325 = (($324) + -1|0);
       HEAP32[$0>>2] = $325;
       $c$6 = 48;
       break;
      }
      $123 = HEAP32[$0>>2]|0;
      $124 = HEAP32[$1>>2]|0;
      $125 = ($123>>>0)<($124>>>0);
      if ($125) {
       $126 = (($123) + 1|0);
       HEAP32[$0>>2] = $126;
       $127 = HEAP8[$123>>0]|0;
       $128 = $127&255;
       $c$0$i = $128;$gotdig$0$i = 0;
      } else {
       $129 = (___shgetc($f)|0);
       $c$0$i = $129;$gotdig$0$i = 0;
      }
      while(1) {
       if ((($c$0$i|0) == 46)) {
        label = 70;
        break;
       } else if (!((($c$0$i|0) == 48))) {
        $168 = 0;$170 = 0;$212 = 0;$214 = 0;$c$2$i = $c$0$i;$gotdig$2$i = $gotdig$0$i;$gotrad$0$i = 0;$gottail$0$i = 0;$scale$0$i = 1.0;$x$0$i = 0;$y$0$i = 0.0;
        break;
       }
       $130 = HEAP32[$0>>2]|0;
       $131 = HEAP32[$1>>2]|0;
       $132 = ($130>>>0)<($131>>>0);
       if ($132) {
        $133 = (($130) + 1|0);
        HEAP32[$0>>2] = $133;
        $134 = HEAP8[$130>>0]|0;
        $135 = $134&255;
        $c$0$i = $135;$gotdig$0$i = 1;
        continue;
       } else {
        $136 = (___shgetc($f)|0);
        $c$0$i = $136;$gotdig$0$i = 1;
        continue;
       }
      }
      if ((label|0) == 70) {
       $137 = HEAP32[$0>>2]|0;
       $138 = HEAP32[$1>>2]|0;
       $139 = ($137>>>0)<($138>>>0);
       if ($139) {
        $140 = (($137) + 1|0);
        HEAP32[$0>>2] = $140;
        $141 = HEAP8[$137>>0]|0;
        $142 = $141&255;
        $c$1$ph$i = $142;
       } else {
        $143 = (___shgetc($f)|0);
        $c$1$ph$i = $143;
       }
       $144 = ($c$1$ph$i|0)==(48);
       if ($144) {
        $152 = 0;$153 = 0;
        while(1) {
         $145 = HEAP32[$0>>2]|0;
         $146 = HEAP32[$1>>2]|0;
         $147 = ($145>>>0)<($146>>>0);
         if ($147) {
          $148 = (($145) + 1|0);
          HEAP32[$0>>2] = $148;
          $149 = HEAP8[$145>>0]|0;
          $150 = $149&255;
          $157 = $150;
         } else {
          $151 = (___shgetc($f)|0);
          $157 = $151;
         }
         $154 = (_i64Add(($152|0),($153|0),-1,-1)|0);
         $155 = tempRet0;
         $156 = ($157|0)==(48);
         if ($156) {
          $152 = $154;$153 = $155;
         } else {
          $168 = 0;$170 = 0;$212 = $154;$214 = $155;$c$2$i = $157;$gotdig$2$i = 1;$gotrad$0$i = 1;$gottail$0$i = 0;$scale$0$i = 1.0;$x$0$i = 0;$y$0$i = 0.0;
          break;
         }
        }
       } else {
        $168 = 0;$170 = 0;$212 = 0;$214 = 0;$c$2$i = $c$1$ph$i;$gotdig$2$i = $gotdig$0$i;$gotrad$0$i = 1;$gottail$0$i = 0;$scale$0$i = 1.0;$x$0$i = 0;$y$0$i = 0.0;
       }
      }
      L119: while(1) {
       $158 = (($c$2$i) + -48)|0;
       $159 = ($158>>>0)<(10);
       do {
        if ($159) {
         $d$0$i = $158;
         label = 83;
        } else {
         $160 = $c$2$i | 32;
         $161 = (($160) + -97)|0;
         $162 = ($161>>>0)<(6);
         $163 = ($c$2$i|0)==(46);
         $or$cond$i = $162 | $163;
         if (!($or$cond$i)) {
          $c$2$lcssa$i = $c$2$i;
          break L119;
         }
         if ($163) {
          $164 = ($gotrad$0$i|0)==(0);
          if ($164) {
           $713 = $170;$714 = $168;$715 = $170;$716 = $168;$gotdig$3$i = $gotdig$2$i;$gotrad$1$i = 1;$gottail$2$i = $gottail$0$i;$scale$2$i = $scale$0$i;$x$2$i = $x$0$i;$y$2$i = $y$0$i;
           break;
          } else {
           $c$2$lcssa$i = 46;
           break L119;
          }
         } else {
          $165 = ($c$2$i|0)>(57);
          $166 = (($160) + -87)|0;
          $$$i = $165 ? $166 : $158;
          $d$0$i = $$$i;
          label = 83;
          break;
         }
        }
       } while(0);
       if ((label|0) == 83) {
        label = 0;
        $167 = ($168|0)<(0);
        $169 = ($170>>>0)<(8);
        $171 = ($168|0)==(0);
        $172 = $171 & $169;
        $173 = $167 | $172;
        do {
         if ($173) {
          $174 = $x$0$i << 4;
          $175 = (($d$0$i) + ($174))|0;
          $gottail$1$i = $gottail$0$i;$scale$1$i = $scale$0$i;$x$1$i = $175;$y$1$i = $y$0$i;
         } else {
          $176 = ($168|0)<(0);
          $177 = ($170>>>0)<(14);
          $178 = ($168|0)==(0);
          $179 = $178 & $177;
          $180 = $176 | $179;
          if ($180) {
           $181 = (+($d$0$i|0));
           $182 = $scale$0$i * 0.0625;
           $183 = $182 * $181;
           $184 = $y$0$i + $183;
           $gottail$1$i = $gottail$0$i;$scale$1$i = $182;$x$1$i = $x$0$i;$y$1$i = $184;
           break;
          }
          $185 = ($d$0$i|0)==(0);
          $186 = ($gottail$0$i|0)!=(0);
          $or$cond3$i = $185 | $186;
          if ($or$cond3$i) {
           $gottail$1$i = $gottail$0$i;$scale$1$i = $scale$0$i;$x$1$i = $x$0$i;$y$1$i = $y$0$i;
          } else {
           $187 = $scale$0$i * 0.5;
           $188 = $y$0$i + $187;
           $gottail$1$i = 1;$scale$1$i = $scale$0$i;$x$1$i = $x$0$i;$y$1$i = $188;
          }
         }
        } while(0);
        $189 = (_i64Add(($170|0),($168|0),1,0)|0);
        $190 = tempRet0;
        $713 = $212;$714 = $214;$715 = $189;$716 = $190;$gotdig$3$i = 1;$gotrad$1$i = $gotrad$0$i;$gottail$2$i = $gottail$1$i;$scale$2$i = $scale$1$i;$x$2$i = $x$1$i;$y$2$i = $y$1$i;
       }
       $191 = HEAP32[$0>>2]|0;
       $192 = HEAP32[$1>>2]|0;
       $193 = ($191>>>0)<($192>>>0);
       if ($193) {
        $194 = (($191) + 1|0);
        HEAP32[$0>>2] = $194;
        $195 = HEAP8[$191>>0]|0;
        $196 = $195&255;
        $168 = $716;$170 = $715;$212 = $713;$214 = $714;$c$2$i = $196;$gotdig$2$i = $gotdig$3$i;$gotrad$0$i = $gotrad$1$i;$gottail$0$i = $gottail$2$i;$scale$0$i = $scale$2$i;$x$0$i = $x$2$i;$y$0$i = $y$2$i;
        continue;
       } else {
        $197 = (___shgetc($f)|0);
        $168 = $716;$170 = $715;$212 = $713;$214 = $714;$c$2$i = $197;$gotdig$2$i = $gotdig$3$i;$gotrad$0$i = $gotrad$1$i;$gottail$0$i = $gottail$2$i;$scale$0$i = $scale$2$i;$x$0$i = $x$2$i;$y$0$i = $y$2$i;
        continue;
       }
      }
      $198 = ($gotdig$2$i|0)==(0);
      if ($198) {
       $199 = HEAP32[$1>>2]|0;
       $200 = ($199|0)==(0|0);
       if (!($200)) {
        $201 = HEAP32[$0>>2]|0;
        $202 = (($201) + -1|0);
        HEAP32[$0>>2] = $202;
       }
       $203 = ($pok|0)==(0);
       if ($203) {
        ___shlim($f,0);
       } else {
        if (!($200)) {
         $204 = HEAP32[$0>>2]|0;
         $205 = (($204) + -1|0);
         HEAP32[$0>>2] = $205;
         $206 = ($gotrad$0$i|0)==(0);
         if (!($206)) {
          $207 = (($204) + -2|0);
          HEAP32[$0>>2] = $207;
         }
        }
       }
       $208 = (+($sign$0|0));
       $209 = $208 * 0.0;
       $$0 = $209;
       STACKTOP = sp;return (+$$0);
      }
      $210 = ($gotrad$0$i|0)==(0);
      $211 = $210 ? $170 : $212;
      $213 = $210 ? $168 : $214;
      $215 = ($168|0)<(0);
      $216 = ($170>>>0)<(8);
      $217 = ($168|0)==(0);
      $218 = $217 & $216;
      $219 = $215 | $218;
      if ($219) {
       $221 = $170;$222 = $168;$x$318$i = $x$0$i;
       while(1) {
        $220 = $x$318$i << 4;
        $223 = (_i64Add(($221|0),($222|0),1,0)|0);
        $224 = tempRet0;
        $225 = ($224|0)<(0);
        $226 = ($223>>>0)<(8);
        $227 = ($224|0)==(0);
        $228 = $227 & $226;
        $229 = $225 | $228;
        if ($229) {
         $221 = $223;$222 = $224;$x$318$i = $220;
        } else {
         $x$3$lcssa$i = $220;
         break;
        }
       }
      } else {
       $x$3$lcssa$i = $x$0$i;
      }
      $230 = $c$2$lcssa$i | 32;
      $231 = ($230|0)==(112);
      do {
       if ($231) {
        $232 = (_scanexp($f,$pok)|0);
        $233 = tempRet0;
        $234 = ($232|0)==(0);
        $235 = ($233|0)==(-2147483648);
        $236 = $234 & $235;
        if ($236) {
         $237 = ($pok|0)==(0);
         if ($237) {
          ___shlim($f,0);
          $$0 = 0.0;
          STACKTOP = sp;return (+$$0);
         } else {
          $238 = HEAP32[$1>>2]|0;
          $239 = ($238|0)==(0|0);
          if ($239) {
           $250 = 0;$251 = 0;
           break;
          }
          $240 = HEAP32[$0>>2]|0;
          $241 = (($240) + -1|0);
          HEAP32[$0>>2] = $241;
          $250 = 0;$251 = 0;
          break;
         }
        } else {
         $250 = $232;$251 = $233;
        }
       } else {
        $242 = HEAP32[$1>>2]|0;
        $243 = ($242|0)==(0|0);
        if ($243) {
         $250 = 0;$251 = 0;
        } else {
         $244 = HEAP32[$0>>2]|0;
         $245 = (($244) + -1|0);
         HEAP32[$0>>2] = $245;
         $250 = 0;$251 = 0;
        }
       }
      } while(0);
      $246 = (_bitshift64Shl(($211|0),($213|0),2)|0);
      $247 = tempRet0;
      $248 = (_i64Add(($246|0),($247|0),-32,-1)|0);
      $249 = tempRet0;
      $252 = (_i64Add(($248|0),($249|0),($250|0),($251|0))|0);
      $253 = tempRet0;
      $254 = ($x$3$lcssa$i|0)==(0);
      if ($254) {
       $255 = (+($sign$0|0));
       $256 = $255 * 0.0;
       $$0 = $256;
       STACKTOP = sp;return (+$$0);
      }
      $257 = (0 - ($emin$0$ph))|0;
      $258 = ($253|0)>(0);
      $259 = ($252>>>0)>($257>>>0);
      $260 = ($253|0)==(0);
      $261 = $260 & $259;
      $262 = $258 | $261;
      if ($262) {
       $263 = (___errno_location()|0);
       HEAP32[$263>>2] = 34;
       $264 = (+($sign$0|0));
       $265 = $264 * 1.7976931348623157E+308;
       $266 = $265 * 1.7976931348623157E+308;
       $$0 = $266;
       STACKTOP = sp;return (+$$0);
      }
      $267 = (($emin$0$ph) + -106)|0;
      $268 = ($267|0)<(0);
      $269 = $268 << 31 >> 31;
      $270 = ($253|0)<($269|0);
      $271 = ($252>>>0)<($267>>>0);
      $272 = ($253|0)==($269|0);
      $273 = $272 & $271;
      $274 = $270 | $273;
      if ($274) {
       $276 = (___errno_location()|0);
       HEAP32[$276>>2] = 34;
       $277 = (+($sign$0|0));
       $278 = $277 * 2.2250738585072014E-308;
       $279 = $278 * 2.2250738585072014E-308;
       $$0 = $279;
       STACKTOP = sp;return (+$$0);
      }
      $275 = ($x$3$lcssa$i|0)>(-1);
      if ($275) {
       $284 = $252;$285 = $253;$x$413$i = $x$3$lcssa$i;$y$314$i = $y$0$i;
       while(1) {
        $280 = !($y$314$i >= 0.5);
        $281 = $x$413$i << 1;
        if ($280) {
         $$pn$i = $y$314$i;$x$5$i = $281;
        } else {
         $282 = $281 | 1;
         $283 = $y$314$i + -1.0;
         $$pn$i = $283;$x$5$i = $282;
        }
        $y$4$i = $y$314$i + $$pn$i;
        $286 = (_i64Add(($284|0),($285|0),-1,-1)|0);
        $287 = tempRet0;
        $288 = ($x$5$i|0)>(-1);
        if ($288) {
         $284 = $286;$285 = $287;$x$413$i = $x$5$i;$y$314$i = $y$4$i;
        } else {
         $293 = $286;$294 = $287;$x$4$lcssa$i = $x$5$i;$y$3$lcssa$i = $y$4$i;
         break;
        }
       }
      } else {
       $293 = $252;$294 = $253;$x$4$lcssa$i = $x$3$lcssa$i;$y$3$lcssa$i = $y$0$i;
      }
      $289 = ($emin$0$ph|0)<(0);
      $290 = $289 << 31 >> 31;
      $291 = (_i64Subtract(32,0,($emin$0$ph|0),($290|0))|0);
      $292 = tempRet0;
      $295 = (_i64Add(($293|0),($294|0),($291|0),($292|0))|0);
      $296 = tempRet0;
      $297 = (0)>($296|0);
      $298 = ($bits$0$ph>>>0)>($295>>>0);
      $299 = (0)==($296|0);
      $300 = $299 & $298;
      $301 = $297 | $300;
      if ($301) {
       $302 = ($295|0)<(0);
       if ($302) {
        $$0611$i = 0;
        label = 126;
       } else {
        $$06$i = $295;
        label = 124;
       }
      } else {
       $$06$i = $bits$0$ph;
       label = 124;
      }
      if ((label|0) == 124) {
       $303 = ($$06$i|0)<(53);
       if ($303) {
        $$0611$i = $$06$i;
        label = 126;
       } else {
        $$pre$i = (+($sign$0|0));
        $$0612$i = $$06$i;$$pre$phi$iZ2D = $$pre$i;$bias$0$i = 0.0;
       }
      }
      if ((label|0) == 126) {
       $304 = (84 - ($$0611$i))|0;
       $305 = (+_scalbn(1.0,$304));
       $306 = (+($sign$0|0));
       $307 = (+_copysignl($305,$306));
       $$0612$i = $$0611$i;$$pre$phi$iZ2D = $306;$bias$0$i = $307;
      }
      $308 = ($$0612$i|0)<(32);
      $309 = $y$3$lcssa$i != 0.0;
      $or$cond5$i = $308 & $309;
      $310 = $x$4$lcssa$i & 1;
      $311 = ($310|0)==(0);
      $or$cond8$i = $or$cond5$i & $311;
      $312 = $or$cond8$i&1;
      $x$6$i = (($312) + ($x$4$lcssa$i))|0;
      $y$5$i = $or$cond8$i ? 0.0 : $y$3$lcssa$i;
      $313 = (+($x$6$i>>>0));
      $314 = $$pre$phi$iZ2D * $313;
      $315 = $bias$0$i + $314;
      $316 = $$pre$phi$iZ2D * $y$5$i;
      $317 = $316 + $315;
      $318 = $317 - $bias$0$i;
      $319 = $318 != 0.0;
      if (!($319)) {
       $320 = (___errno_location()|0);
       HEAP32[$320>>2] = 34;
      }
      $321 = (+_scalbnl($318,$293));
      $$0 = $321;
      STACKTOP = sp;return (+$$0);
     } else {
      $c$6 = $c$5;
     }
    } while(0);
    $sum$i = (($emin$0$ph) + ($bits$0$ph))|0;
    $326 = (0 - ($sum$i))|0;
    $$011$i = $c$6;$gotdig$0$i11 = 0;
    while(1) {
     if ((($$011$i|0) == 46)) {
      label = 137;
      break;
     } else if (!((($$011$i|0) == 48))) {
      $$2$i = $$011$i;$717 = 0;$718 = 0;$gotdig$2$i12 = $gotdig$0$i11;$gotrad$0$i13 = 0;
      break;
     }
     $327 = HEAP32[$0>>2]|0;
     $328 = HEAP32[$1>>2]|0;
     $329 = ($327>>>0)<($328>>>0);
     if ($329) {
      $330 = (($327) + 1|0);
      HEAP32[$0>>2] = $330;
      $331 = HEAP8[$327>>0]|0;
      $332 = $331&255;
      $$011$i = $332;$gotdig$0$i11 = 1;
      continue;
     } else {
      $333 = (___shgetc($f)|0);
      $$011$i = $333;$gotdig$0$i11 = 1;
      continue;
     }
    }
    if ((label|0) == 137) {
     $334 = HEAP32[$0>>2]|0;
     $335 = HEAP32[$1>>2]|0;
     $336 = ($334>>>0)<($335>>>0);
     if ($336) {
      $337 = (($334) + 1|0);
      HEAP32[$0>>2] = $337;
      $338 = HEAP8[$334>>0]|0;
      $339 = $338&255;
      $$1$ph$i = $339;
     } else {
      $340 = (___shgetc($f)|0);
      $$1$ph$i = $340;
     }
     $341 = ($$1$ph$i|0)==(48);
     if ($341) {
      $342 = 0;$343 = 0;
      while(1) {
       $344 = (_i64Add(($342|0),($343|0),-1,-1)|0);
       $345 = tempRet0;
       $346 = HEAP32[$0>>2]|0;
       $347 = HEAP32[$1>>2]|0;
       $348 = ($346>>>0)<($347>>>0);
       if ($348) {
        $349 = (($346) + 1|0);
        HEAP32[$0>>2] = $349;
        $350 = HEAP8[$346>>0]|0;
        $351 = $350&255;
        $$1$be$i = $351;
       } else {
        $352 = (___shgetc($f)|0);
        $$1$be$i = $352;
       }
       $353 = ($$1$be$i|0)==(48);
       if ($353) {
        $342 = $344;$343 = $345;
       } else {
        $$2$i = $$1$be$i;$717 = $344;$718 = $345;$gotdig$2$i12 = 1;$gotrad$0$i13 = 1;
        break;
       }
      }
     } else {
      $$2$i = $$1$ph$i;$717 = 0;$718 = 0;$gotdig$2$i12 = $gotdig$0$i11;$gotrad$0$i13 = 1;
     }
    }
    HEAP32[$x$i>>2] = 0;
    $354 = (($$2$i) + -48)|0;
    $355 = ($354>>>0)<(10);
    $356 = ($$2$i|0)==(46);
    $or$cond112$i = $355 | $356;
    L221: do {
     if ($or$cond112$i) {
      $357 = (($x$i) + 496|0);
      $$3120$i = $$2$i;$360 = 0;$361 = 0;$719 = $356;$720 = $354;$721 = $717;$722 = $718;$gotdig$3116$i = $gotdig$2$i12;$gotrad$1117$i = $gotrad$0$i13;$j$0119$i = 0;$k$0118$i = 0;$lnz$0115$i = 0;
      L223: while(1) {
       do {
        if ($719) {
         $cond$i = ($gotrad$1117$i|0)==(0);
         if ($cond$i) {
          $723 = $360;$724 = $361;$725 = $360;$726 = $361;$gotdig$4$i = $gotdig$3116$i;$gotrad$2$i = 1;$j$2$i = $j$0119$i;$k$2$i = $k$0118$i;$lnz$2$i = $lnz$0115$i;
         } else {
          break L223;
         }
        } else {
         $359 = ($k$0118$i|0)<(125);
         $362 = (_i64Add(($360|0),($361|0),1,0)|0);
         $363 = tempRet0;
         $364 = ($$3120$i|0)!=(48);
         if (!($359)) {
          if (!($364)) {
           $723 = $721;$724 = $722;$725 = $362;$726 = $363;$gotdig$4$i = $gotdig$3116$i;$gotrad$2$i = $gotrad$1117$i;$j$2$i = $j$0119$i;$k$2$i = $k$0118$i;$lnz$2$i = $lnz$0115$i;
           break;
          }
          $374 = HEAP32[$357>>2]|0;
          $375 = $374 | 1;
          HEAP32[$357>>2] = $375;
          $723 = $721;$724 = $722;$725 = $362;$726 = $363;$gotdig$4$i = $gotdig$3116$i;$gotrad$2$i = $gotrad$1117$i;$j$2$i = $j$0119$i;$k$2$i = $k$0118$i;$lnz$2$i = $lnz$0115$i;
          break;
         }
         $$lnz$0$i = $364 ? $362 : $lnz$0115$i;
         $365 = ($j$0119$i|0)==(0);
         $366 = (($x$i) + ($k$0118$i<<2)|0);
         if ($365) {
          $storemerge$i = $720;
         } else {
          $367 = HEAP32[$366>>2]|0;
          $368 = ($367*10)|0;
          $369 = (($$3120$i) + -48)|0;
          $370 = (($369) + ($368))|0;
          $storemerge$i = $370;
         }
         HEAP32[$366>>2] = $storemerge$i;
         $371 = (($j$0119$i) + 1)|0;
         $372 = ($371|0)==(9);
         $373 = $372&1;
         $$k$0$i = (($373) + ($k$0118$i))|0;
         $$13$i = $372 ? 0 : $371;
         $723 = $721;$724 = $722;$725 = $362;$726 = $363;$gotdig$4$i = 1;$gotrad$2$i = $gotrad$1117$i;$j$2$i = $$13$i;$k$2$i = $$k$0$i;$lnz$2$i = $$lnz$0$i;
        }
       } while(0);
       $376 = HEAP32[$0>>2]|0;
       $377 = HEAP32[$1>>2]|0;
       $378 = ($376>>>0)<($377>>>0);
       if ($378) {
        $379 = (($376) + 1|0);
        HEAP32[$0>>2] = $379;
        $380 = HEAP8[$376>>0]|0;
        $381 = $380&255;
        $$3$be$i = $381;
       } else {
        $382 = (___shgetc($f)|0);
        $$3$be$i = $382;
       }
       $383 = (($$3$be$i) + -48)|0;
       $384 = ($383>>>0)<(10);
       $385 = ($$3$be$i|0)==(46);
       $or$cond$i15 = $384 | $385;
       if ($or$cond$i15) {
        $$3120$i = $$3$be$i;$360 = $725;$361 = $726;$719 = $385;$720 = $383;$721 = $723;$722 = $724;$gotdig$3116$i = $gotdig$4$i;$gotrad$1117$i = $gotrad$2$i;$j$0119$i = $j$2$i;$k$0118$i = $k$2$i;$lnz$0115$i = $lnz$2$i;
       } else {
        $$3$lcssa$i = $$3$be$i;$388 = $725;$389 = $723;$391 = $726;$392 = $724;$gotdig$3$lcssa$i = $gotdig$4$i;$gotrad$1$lcssa$i = $gotrad$2$i;$j$0$lcssa$i = $j$2$i;$k$0$lcssa$i = $k$2$i;$lnz$0$lcssa$i = $lnz$2$i;
        label = 160;
        break L221;
       }
      }
      $358 = ($gotdig$3116$i|0)!=(0);
      $727 = $360;$728 = $361;$729 = $721;$730 = $722;$731 = $358;$j$0110$i = $j$0119$i;$k$0106$i = $k$0118$i;$lnz$0100$i = $lnz$0115$i;
      label = 168;
     } else {
      $$3$lcssa$i = $$2$i;$388 = 0;$389 = $717;$391 = 0;$392 = $718;$gotdig$3$lcssa$i = $gotdig$2$i12;$gotrad$1$lcssa$i = $gotrad$0$i13;$j$0$lcssa$i = 0;$k$0$lcssa$i = 0;$lnz$0$lcssa$i = 0;
      label = 160;
     }
    } while(0);
    do {
     if ((label|0) == 160) {
      $386 = ($gotrad$1$lcssa$i|0)==(0);
      $387 = $386 ? $388 : $389;
      $390 = $386 ? $391 : $392;
      $393 = ($gotdig$3$lcssa$i|0)!=(0);
      $394 = $$3$lcssa$i | 32;
      $395 = ($394|0)==(101);
      $or$cond15$i = $393 & $395;
      if (!($or$cond15$i)) {
       $410 = ($$3$lcssa$i|0)>(-1);
       if ($410) {
        $727 = $388;$728 = $391;$729 = $387;$730 = $390;$731 = $393;$j$0110$i = $j$0$lcssa$i;$k$0106$i = $k$0$lcssa$i;$lnz$0100$i = $lnz$0$lcssa$i;
        label = 168;
        break;
       } else {
        $732 = $388;$733 = $391;$734 = $393;$735 = $387;$736 = $390;$j$0109$i = $j$0$lcssa$i;$k$0105$i = $k$0$lcssa$i;$lnz$099$i = $lnz$0$lcssa$i;
        label = 170;
        break;
       }
      }
      $396 = (_scanexp($f,$pok)|0);
      $397 = tempRet0;
      $398 = ($396|0)==(0);
      $399 = ($397|0)==(-2147483648);
      $400 = $398 & $399;
      do {
       if ($400) {
        $401 = ($pok|0)==(0);
        if ($401) {
         ___shlim($f,0);
         $$0 = 0.0;
         STACKTOP = sp;return (+$$0);
        } else {
         $402 = HEAP32[$1>>2]|0;
         $403 = ($402|0)==(0|0);
         if ($403) {
          $406 = 0;$407 = 0;
          break;
         }
         $404 = HEAP32[$0>>2]|0;
         $405 = (($404) + -1|0);
         HEAP32[$0>>2] = $405;
         $406 = 0;$407 = 0;
         break;
        }
       } else {
        $406 = $396;$407 = $397;
       }
      } while(0);
      $408 = (_i64Add(($406|0),($407|0),($387|0),($390|0))|0);
      $409 = tempRet0;
      $421 = $408;$422 = $388;$424 = $409;$425 = $391;$j$0108$i = $j$0$lcssa$i;$k$0104$i = $k$0$lcssa$i;$lnz$098$i = $lnz$0$lcssa$i;
     }
    } while(0);
    if ((label|0) == 168) {
     $411 = HEAP32[$1>>2]|0;
     $412 = ($411|0)==(0|0);
     if ($412) {
      $732 = $727;$733 = $728;$734 = $731;$735 = $729;$736 = $730;$j$0109$i = $j$0110$i;$k$0105$i = $k$0106$i;$lnz$099$i = $lnz$0100$i;
      label = 170;
     } else {
      $413 = HEAP32[$0>>2]|0;
      $414 = (($413) + -1|0);
      HEAP32[$0>>2] = $414;
      if ($731) {
       $421 = $729;$422 = $727;$424 = $730;$425 = $728;$j$0108$i = $j$0110$i;$k$0104$i = $k$0106$i;$lnz$098$i = $lnz$0100$i;
      } else {
       label = 171;
      }
     }
    }
    if ((label|0) == 170) {
     if ($734) {
      $421 = $735;$422 = $732;$424 = $736;$425 = $733;$j$0108$i = $j$0109$i;$k$0104$i = $k$0105$i;$lnz$098$i = $lnz$099$i;
     } else {
      label = 171;
     }
    }
    if ((label|0) == 171) {
     $415 = (___errno_location()|0);
     HEAP32[$415>>2] = 22;
     ___shlim($f,0);
     $$0 = 0.0;
     STACKTOP = sp;return (+$$0);
    }
    $416 = HEAP32[$x$i>>2]|0;
    $417 = ($416|0)==(0);
    if ($417) {
     $418 = (+($sign$0|0));
     $419 = $418 * 0.0;
     $$0 = $419;
     STACKTOP = sp;return (+$$0);
    }
    $420 = ($421|0)==($422|0);
    $423 = ($424|0)==($425|0);
    $426 = $420 & $423;
    $427 = ($425|0)<(0);
    $428 = ($422>>>0)<(10);
    $429 = ($425|0)==(0);
    $430 = $429 & $428;
    $431 = $427 | $430;
    $or$cond3$i16 = $426 & $431;
    if ($or$cond3$i16) {
     $432 = ($bits$0$ph>>>0)>(30);
     $433 = $416 >>> $bits$0$ph;
     $434 = ($433|0)==(0);
     $or$cond17$i = $432 | $434;
     if ($or$cond17$i) {
      $435 = (+($sign$0|0));
      $436 = (+($416>>>0));
      $437 = $435 * $436;
      $$0 = $437;
      STACKTOP = sp;return (+$$0);
     }
    }
    $438 = (($emin$0$ph|0) / -2)&-1;
    $439 = ($438|0)<(0);
    $440 = $439 << 31 >> 31;
    $441 = ($424|0)>($440|0);
    $442 = ($421>>>0)>($438>>>0);
    $443 = ($424|0)==($440|0);
    $444 = $443 & $442;
    $445 = $441 | $444;
    if ($445) {
     $446 = (___errno_location()|0);
     HEAP32[$446>>2] = 34;
     $447 = (+($sign$0|0));
     $448 = $447 * 1.7976931348623157E+308;
     $449 = $448 * 1.7976931348623157E+308;
     $$0 = $449;
     STACKTOP = sp;return (+$$0);
    }
    $450 = (($emin$0$ph) + -106)|0;
    $451 = ($450|0)<(0);
    $452 = $451 << 31 >> 31;
    $453 = ($424|0)<($452|0);
    $454 = ($421>>>0)<($450>>>0);
    $455 = ($424|0)==($452|0);
    $456 = $455 & $454;
    $457 = $453 | $456;
    if ($457) {
     $458 = (___errno_location()|0);
     HEAP32[$458>>2] = 34;
     $459 = (+($sign$0|0));
     $460 = $459 * 2.2250738585072014E-308;
     $461 = $460 * 2.2250738585072014E-308;
     $$0 = $461;
     STACKTOP = sp;return (+$$0);
    }
    $462 = ($j$0108$i|0)==(0);
    if ($462) {
     $k$3$i = $k$0104$i;
    } else {
     $463 = ($j$0108$i|0)<(9);
     if ($463) {
      $464 = (($x$i) + ($k$0104$i<<2)|0);
      $$promoted$i = HEAP32[$464>>2]|0;
      $466 = $$promoted$i;$j$388$i = $j$0108$i;
      while(1) {
       $465 = ($466*10)|0;
       $467 = (($j$388$i) + 1)|0;
       $exitcond$i = ($467|0)==(9);
       if ($exitcond$i) {
        break;
       } else {
        $466 = $465;$j$388$i = $467;
       }
      }
      HEAP32[$464>>2] = $465;
     }
     $468 = (($k$0104$i) + 1)|0;
     $k$3$i = $468;
    }
    $469 = ($lnz$098$i|0)<(9);
    if ($469) {
     $470 = ($lnz$098$i|0)<=($421|0);
     $471 = ($421|0)<(18);
     $or$cond5$i17 = $470 & $471;
     if ($or$cond5$i17) {
      $472 = ($421|0)==(9);
      if ($472) {
       $473 = (+($sign$0|0));
       $474 = HEAP32[$x$i>>2]|0;
       $475 = (+($474>>>0));
       $476 = $473 * $475;
       $$0 = $476;
       STACKTOP = sp;return (+$$0);
      }
      $477 = ($421|0)<(9);
      if ($477) {
       $478 = (+($sign$0|0));
       $479 = HEAP32[$x$i>>2]|0;
       $480 = (+($479>>>0));
       $481 = $478 * $480;
       $482 = (8 - ($421))|0;
       $483 = (1456 + ($482<<2)|0);
       $484 = HEAP32[$483>>2]|0;
       $485 = (+($484|0));
       $486 = $481 / $485;
       $$0 = $486;
       STACKTOP = sp;return (+$$0);
      }
      $487 = Math_imul($421, -3)|0;
      $$neg37$i = (($bits$0$ph) + 27)|0;
      $488 = (($$neg37$i) + ($487))|0;
      $489 = ($488|0)>(30);
      $$pre$i18 = HEAP32[$x$i>>2]|0;
      $490 = $$pre$i18 >>> $488;
      $491 = ($490|0)==(0);
      $or$cond187$i = $489 | $491;
      if ($or$cond187$i) {
       $492 = (+($sign$0|0));
       $493 = (+($$pre$i18>>>0));
       $494 = $492 * $493;
       $495 = (($421) + -10)|0;
       $496 = (1456 + ($495<<2)|0);
       $497 = HEAP32[$496>>2]|0;
       $498 = (+($497|0));
       $499 = $494 * $498;
       $$0 = $499;
       STACKTOP = sp;return (+$$0);
      }
     }
    }
    $500 = (($421|0) % 9)&-1;
    $501 = ($500|0)==(0);
    if ($501) {
     $a$2$ph57$i = 0;$e2$0$ph$i = 0;$rp$2$ph55$i = $421;$z$1$ph56$i = $k$3$i;
    } else {
     $502 = ($421|0)>(-1);
     $503 = (($500) + 9)|0;
     $504 = $502 ? $500 : $503;
     $505 = (8 - ($504))|0;
     $506 = (1456 + ($505<<2)|0);
     $507 = HEAP32[$506>>2]|0;
     $508 = ($k$3$i|0)==(0);
     if ($508) {
      $a$0$lcssa182$i = 0;$rp$0$lcssa183$i = $421;$z$0$i = 0;
     } else {
      $509 = (1000000000 / ($507|0))&-1;
      $a$078$i = 0;$carry$080$i = 0;$k$479$i = 0;$rp$077$i = $421;
      while(1) {
       $510 = (($x$i) + ($k$479$i<<2)|0);
       $511 = HEAP32[$510>>2]|0;
       $512 = (($511>>>0) % ($507>>>0))&-1;
       $513 = (($511>>>0) / ($507>>>0))&-1;
       $514 = (($513) + ($carry$080$i))|0;
       HEAP32[$510>>2] = $514;
       $515 = Math_imul($512, $509)|0;
       $516 = ($k$479$i|0)==($a$078$i|0);
       $517 = ($514|0)==(0);
       $or$cond18$i = $516 & $517;
       $518 = (($k$479$i) + 1)|0;
       if ($or$cond18$i) {
        $519 = $518 & 127;
        $520 = (($rp$077$i) + -9)|0;
        $a$1$i = $519;$rp$1$i19 = $520;
       } else {
        $a$1$i = $a$078$i;$rp$1$i19 = $rp$077$i;
       }
       $521 = ($518|0)==($k$3$i|0);
       if ($521) {
        break;
       } else {
        $a$078$i = $a$1$i;$carry$080$i = $515;$k$479$i = $518;$rp$077$i = $rp$1$i19;
       }
      }
      $522 = ($515|0)==(0);
      if ($522) {
       $a$0$lcssa182$i = $a$1$i;$rp$0$lcssa183$i = $rp$1$i19;$z$0$i = $k$3$i;
      } else {
       $523 = (($k$3$i) + 1)|0;
       $524 = (($x$i) + ($k$3$i<<2)|0);
       HEAP32[$524>>2] = $515;
       $a$0$lcssa182$i = $a$1$i;$rp$0$lcssa183$i = $rp$1$i19;$z$0$i = $523;
      }
     }
     $525 = (9 - ($504))|0;
     $526 = (($525) + ($rp$0$lcssa183$i))|0;
     $a$2$ph57$i = $a$0$lcssa182$i;$e2$0$ph$i = 0;$rp$2$ph55$i = $526;$z$1$ph56$i = $z$0$i;
    }
    L315: while(1) {
     $527 = ($rp$2$ph55$i|0)<(18);
     $528 = (($x$i) + ($a$2$ph57$i<<2)|0);
     if ($527) {
      $e2$0$us$i = $e2$0$ph$i;$z$1$us$i = $z$1$ph56$i;
      while(1) {
       $530 = (($z$1$us$i) + 127)|0;
       $carry1$0$us$i = 0;$k$5$in$us$i = $530;$z$2$us$i = $z$1$us$i;
       while(1) {
        $k$5$us$i = $k$5$in$us$i & 127;
        $531 = (($x$i) + ($k$5$us$i<<2)|0);
        $532 = HEAP32[$531>>2]|0;
        $533 = (_bitshift64Shl(($532|0),0,29)|0);
        $534 = tempRet0;
        $535 = (_i64Add(($533|0),($534|0),($carry1$0$us$i|0),0)|0);
        $536 = tempRet0;
        $537 = ($536>>>0)>(0);
        $538 = ($535>>>0)>(1000000000);
        $539 = ($536|0)==(0);
        $540 = $539 & $538;
        $541 = $537 | $540;
        if ($541) {
         $542 = (___udivdi3(($535|0),($536|0),1000000000,0)|0);
         $543 = tempRet0;
         $544 = (___uremdi3(($535|0),($536|0),1000000000,0)|0);
         $545 = tempRet0;
         $$sink$off0$us$i = $544;$carry1$1$us$i = $542;
        } else {
         $$sink$off0$us$i = $535;$carry1$1$us$i = 0;
        }
        HEAP32[$531>>2] = $$sink$off0$us$i;
        $546 = (($z$2$us$i) + 127)|0;
        $547 = $546 & 127;
        $548 = ($k$5$us$i|0)!=($547|0);
        $549 = ($k$5$us$i|0)==($a$2$ph57$i|0);
        $or$cond19$us$i = $548 | $549;
        if ($or$cond19$us$i) {
         $z$3$us$i = $z$2$us$i;
        } else {
         $550 = ($$sink$off0$us$i|0)==(0);
         $k$5$z$2$us$i = $550 ? $k$5$us$i : $z$2$us$i;
         $z$3$us$i = $k$5$z$2$us$i;
        }
        $551 = (($k$5$us$i) + -1)|0;
        if ($549) {
         break;
        } else {
         $carry1$0$us$i = $carry1$1$us$i;$k$5$in$us$i = $551;$z$2$us$i = $z$3$us$i;
        }
       }
       $552 = (($e2$0$us$i) + -29)|0;
       $553 = ($carry1$1$us$i|0)==(0);
       if ($553) {
        $e2$0$us$i = $552;$z$1$us$i = $z$3$us$i;
       } else {
        $$lcssa60$i = $552;$carry1$1$lcssa$lcssa$i = $carry1$1$us$i;$z$3$lcssa$lcssa$i = $z$3$us$i;
        break;
       }
      }
     } else {
      $529 = ($rp$2$ph55$i|0)==(18);
      if ($529) {
       $e2$0$us61$i = $e2$0$ph$i;$z$1$us62$i = $z$1$ph56$i;
      } else {
       $a$3$ph$i = $a$2$ph57$i;$e2$1$ph$i = $e2$0$ph$i;$rp$3$ph50$i = $rp$2$ph55$i;$z$5$ph$i = $z$1$ph56$i;
       break;
      }
      while(1) {
       $554 = HEAP32[$528>>2]|0;
       $555 = ($554>>>0)<(9007199);
       if (!($555)) {
        $a$3$ph$i = $a$2$ph57$i;$e2$1$ph$i = $e2$0$us61$i;$rp$3$ph50$i = 18;$z$5$ph$i = $z$1$us62$i;
        break L315;
       }
       $556 = (($z$1$us62$i) + 127)|0;
       $carry1$0$us66$i = 0;$k$5$in$us65$i = $556;$z$2$us64$i = $z$1$us62$i;
       while(1) {
        $k$5$us67$i = $k$5$in$us65$i & 127;
        $557 = (($x$i) + ($k$5$us67$i<<2)|0);
        $558 = HEAP32[$557>>2]|0;
        $559 = (_bitshift64Shl(($558|0),0,29)|0);
        $560 = tempRet0;
        $561 = (_i64Add(($559|0),($560|0),($carry1$0$us66$i|0),0)|0);
        $562 = tempRet0;
        $563 = ($562>>>0)>(0);
        $564 = ($561>>>0)>(1000000000);
        $565 = ($562|0)==(0);
        $566 = $565 & $564;
        $567 = $563 | $566;
        if ($567) {
         $568 = (___udivdi3(($561|0),($562|0),1000000000,0)|0);
         $569 = tempRet0;
         $570 = (___uremdi3(($561|0),($562|0),1000000000,0)|0);
         $571 = tempRet0;
         $$sink$off0$us70$i = $570;$carry1$1$us71$i = $568;
        } else {
         $$sink$off0$us70$i = $561;$carry1$1$us71$i = 0;
        }
        HEAP32[$557>>2] = $$sink$off0$us70$i;
        $572 = (($z$2$us64$i) + 127)|0;
        $573 = $572 & 127;
        $574 = ($k$5$us67$i|0)!=($573|0);
        $575 = ($k$5$us67$i|0)==($a$2$ph57$i|0);
        $or$cond19$us72$i = $574 | $575;
        if ($or$cond19$us72$i) {
         $z$3$us74$i = $z$2$us64$i;
        } else {
         $576 = ($$sink$off0$us70$i|0)==(0);
         $k$5$z$2$us73$i = $576 ? $k$5$us67$i : $z$2$us64$i;
         $z$3$us74$i = $k$5$z$2$us73$i;
        }
        $577 = (($k$5$us67$i) + -1)|0;
        if ($575) {
         break;
        } else {
         $carry1$0$us66$i = $carry1$1$us71$i;$k$5$in$us65$i = $577;$z$2$us64$i = $z$3$us74$i;
        }
       }
       $578 = (($e2$0$us61$i) + -29)|0;
       $579 = ($carry1$1$us71$i|0)==(0);
       if ($579) {
        $e2$0$us61$i = $578;$z$1$us62$i = $z$3$us74$i;
       } else {
        $$lcssa60$i = $578;$carry1$1$lcssa$lcssa$i = $carry1$1$us71$i;$z$3$lcssa$lcssa$i = $z$3$us74$i;
        break;
       }
      }
     }
     $580 = (($rp$2$ph55$i) + 9)|0;
     $581 = (($a$2$ph57$i) + 127)|0;
     $582 = $581 & 127;
     $583 = ($582|0)==($z$3$lcssa$lcssa$i|0);
     if ($583) {
      $584 = (($z$3$lcssa$lcssa$i) + 127)|0;
      $585 = $584 & 127;
      $586 = (($x$i) + ($585<<2)|0);
      $587 = HEAP32[$586>>2]|0;
      $588 = (($z$3$lcssa$lcssa$i) + 126)|0;
      $589 = $588 & 127;
      $590 = (($x$i) + ($589<<2)|0);
      $591 = HEAP32[$590>>2]|0;
      $592 = $591 | $587;
      HEAP32[$590>>2] = $592;
      $z$4$i = $585;
     } else {
      $z$4$i = $z$3$lcssa$lcssa$i;
     }
     $593 = (($x$i) + ($582<<2)|0);
     HEAP32[$593>>2] = $carry1$1$lcssa$lcssa$i;
     $a$2$ph57$i = $582;$e2$0$ph$i = $$lcssa60$i;$rp$2$ph55$i = $580;$z$1$ph56$i = $z$4$i;
    }
    L346: while(1) {
     $630 = (($z$5$ph$i) + 1)|0;
     $628 = $630 & 127;
     $631 = (($z$5$ph$i) + 127)|0;
     $632 = $631 & 127;
     $633 = (($x$i) + ($632<<2)|0);
     $a$3$i$ph = $a$3$ph$i;$e2$1$i$ph = $e2$1$ph$i;$rp$3$i$ph = $rp$3$ph50$i;
     while(1) {
      $606 = ($rp$3$i$ph|0)==(18);
      $634 = ($rp$3$i$ph|0)>(27);
      $$20$i = $634 ? 9 : 1;
      $a$3$i = $a$3$i$ph;$e2$1$i = $e2$1$i$ph;
      while(1) {
       $i$042$i = 0;
       while(1) {
        $596 = (($i$042$i) + ($a$3$i))|0;
        $597 = $596 & 127;
        $598 = ($597|0)==($z$5$ph$i|0);
        if ($598) {
         $i$1$i = 2;
         break;
        }
        $599 = (($x$i) + ($597<<2)|0);
        $600 = HEAP32[$599>>2]|0;
        $601 = (1448 + ($i$042$i<<2)|0);
        $602 = HEAP32[$601>>2]|0;
        $603 = ($600>>>0)<($602>>>0);
        if ($603) {
         $i$1$i = 2;
         break;
        }
        $604 = ($600>>>0)>($602>>>0);
        $595 = (($i$042$i) + 1)|0;
        if ($604) {
         $i$1$i = $i$042$i;
         break;
        }
        $594 = ($595|0)<(2);
        if ($594) {
         $i$042$i = $595;
        } else {
         $i$1$i = $595;
         break;
        }
       }
       $605 = ($i$1$i|0)==(2);
       $or$cond8$i20 = $605 & $606;
       if ($or$cond8$i20) {
        break L346;
       }
       $609 = (($$20$i) + ($e2$1$i))|0;
       $610 = ($a$3$i|0)==($z$5$ph$i|0);
       if ($610) {
        $a$3$i = $z$5$ph$i;$e2$1$i = $609;
       } else {
        break;
       }
      }
      $611 = 1 << $$20$i;
      $612 = (($611) + -1)|0;
      $613 = 1000000000 >>> $$20$i;
      $a$444$i = $a$3$i;$carry3$047$i = 0;$k$645$i = $a$3$i;$rp$443$i = $rp$3$i$ph;
      while(1) {
       $614 = (($x$i) + ($k$645$i<<2)|0);
       $615 = HEAP32[$614>>2]|0;
       $616 = $615 & $612;
       $617 = $615 >>> $$20$i;
       $618 = (($617) + ($carry3$047$i))|0;
       HEAP32[$614>>2] = $618;
       $619 = Math_imul($616, $613)|0;
       $620 = ($k$645$i|0)==($a$444$i|0);
       $621 = ($618|0)==(0);
       $or$cond21$i = $620 & $621;
       $622 = (($k$645$i) + 1)|0;
       $623 = $622 & 127;
       $624 = (($rp$443$i) + -9)|0;
       $rp$5$i = $or$cond21$i ? $624 : $rp$443$i;
       $a$5$i = $or$cond21$i ? $623 : $a$444$i;
       $625 = ($623|0)==($z$5$ph$i|0);
       if ($625) {
        break;
       } else {
        $a$444$i = $a$5$i;$carry3$047$i = $619;$k$645$i = $623;$rp$443$i = $rp$5$i;
       }
      }
      $626 = ($619|0)==(0);
      if ($626) {
       $a$3$i$ph = $a$5$i;$e2$1$i$ph = $609;$rp$3$i$ph = $rp$5$i;
       continue;
      }
      $627 = ($628|0)==($a$5$i|0);
      if (!($627)) {
       break;
      }
      $635 = HEAP32[$633>>2]|0;
      $636 = $635 | 1;
      HEAP32[$633>>2] = $636;
      $a$3$i$ph = $a$5$i;$e2$1$i$ph = $609;$rp$3$i$ph = $rp$5$i;
     }
     $629 = (($x$i) + ($z$5$ph$i<<2)|0);
     HEAP32[$629>>2] = $619;
     $a$3$ph$i = $a$5$i;$e2$1$ph$i = $609;$rp$3$ph50$i = $rp$5$i;$z$5$ph$i = $628;
    }
    $607 = $a$3$i & 127;
    $608 = ($607|0)==($z$5$ph$i|0);
    if ($608) {
     $637 = (($628) + -1)|0;
     $638 = (($x$i) + ($637<<2)|0);
     HEAP32[$638>>2] = 0;
     $z$7$i = $628;
    } else {
     $z$7$i = $z$5$ph$i;
    }
    $639 = (($x$i) + ($607<<2)|0);
    $640 = HEAP32[$639>>2]|0;
    $641 = (+($640>>>0));
    $642 = (($a$3$i) + 1)|0;
    $643 = $642 & 127;
    $644 = ($643|0)==($z$7$i|0);
    if ($644) {
     $703 = (($z$7$i) + 1)|0;
     $704 = $703 & 127;
     $705 = (($704) + -1)|0;
     $706 = (($x$i) + ($705<<2)|0);
     HEAP32[$706>>2] = 0;
     $z$7$1$i = $704;
    } else {
     $z$7$1$i = $z$7$i;
    }
    $707 = $641 * 1.0E+9;
    $708 = (($x$i) + ($643<<2)|0);
    $709 = HEAP32[$708>>2]|0;
    $710 = (+($709>>>0));
    $711 = $707 + $710;
    $668 = (+($sign$0|0));
    $650 = $668 * $711;
    $688 = (($e2$1$i) + 53)|0;
    $646 = (($688) - ($emin$0$ph))|0;
    $712 = ($646|0)<($bits$0$ph|0);
    if ($712) {
     $645 = ($646|0)<(0);
     if ($645) {
      $$01231$i = 0;$denormal$030$i = 1;
      label = 244;
     } else {
      $$012$i = $646;$denormal$0$i = 1;
      label = 243;
     }
    } else {
     $$012$i = $bits$0$ph;$denormal$0$i = 0;
     label = 243;
    }
    if ((label|0) == 243) {
     $647 = ($$012$i|0)<(53);
     if ($647) {
      $$01231$i = $$012$i;$denormal$030$i = $denormal$0$i;
      label = 244;
     } else {
      $$01232$i = $$012$i;$bias$0$i25 = 0.0;$denormal$029$i = $denormal$0$i;$frac$0$i = 0.0;$y$1$i24 = $650;
     }
    }
    if ((label|0) == 244) {
     $648 = (105 - ($$01231$i))|0;
     $649 = (+_scalbn(1.0,$648));
     $651 = (+_copysignl($649,$650));
     $652 = (53 - ($$01231$i))|0;
     $653 = (+_scalbn(1.0,$652));
     $654 = (+_fmodl($650,$653));
     $655 = $650 - $654;
     $656 = $651 + $655;
     $$01232$i = $$01231$i;$bias$0$i25 = $651;$denormal$029$i = $denormal$030$i;$frac$0$i = $654;$y$1$i24 = $656;
    }
    $657 = (($a$3$i) + 2)|0;
    $658 = $657 & 127;
    $659 = ($658|0)==($z$7$1$i|0);
    do {
     if ($659) {
      $frac$2$i = $frac$0$i;
     } else {
      $660 = (($x$i) + ($658<<2)|0);
      $661 = HEAP32[$660>>2]|0;
      $662 = ($661>>>0)<(500000000);
      do {
       if ($662) {
        $663 = ($661|0)==(0);
        if ($663) {
         $664 = (($a$3$i) + 3)|0;
         $665 = $664 & 127;
         $666 = ($665|0)==($z$7$1$i|0);
         if ($666) {
          $frac$1$i = $frac$0$i;
          break;
         }
        }
        $667 = $668 * 0.25;
        $669 = $667 + $frac$0$i;
        $frac$1$i = $669;
       } else {
        $670 = ($661>>>0)>(500000000);
        if ($670) {
         $671 = $668 * 0.75;
         $672 = $671 + $frac$0$i;
         $frac$1$i = $672;
         break;
        }
        $673 = (($a$3$i) + 3)|0;
        $674 = $673 & 127;
        $675 = ($674|0)==($z$7$1$i|0);
        if ($675) {
         $676 = $668 * 0.5;
         $677 = $676 + $frac$0$i;
         $frac$1$i = $677;
         break;
        } else {
         $678 = $668 * 0.75;
         $679 = $678 + $frac$0$i;
         $frac$1$i = $679;
         break;
        }
       }
      } while(0);
      $680 = (53 - ($$01232$i))|0;
      $681 = ($680|0)>(1);
      if (!($681)) {
       $frac$2$i = $frac$1$i;
       break;
      }
      $682 = (+_fmodl($frac$1$i,1.0));
      $683 = $682 != 0.0;
      if ($683) {
       $frac$2$i = $frac$1$i;
       break;
      }
      $684 = $frac$1$i + 1.0;
      $frac$2$i = $684;
     }
    } while(0);
    $685 = $y$1$i24 + $frac$2$i;
    $686 = $685 - $bias$0$i25;
    $687 = $688 & 2147483647;
    $689 = (-2 - ($sum$i))|0;
    $690 = ($687|0)>($689|0);
    do {
     if ($690) {
      $691 = (+Math_abs((+$686)));
      $692 = !($691 >= 9007199254740992.0);
      if ($692) {
       $denormal$2$i = $denormal$029$i;$e2$2$i = $e2$1$i;$y$2$i26 = $686;
      } else {
       $693 = ($denormal$029$i|0)!=(0);
       $694 = ($$01232$i|0)==($646|0);
       $or$cond22$i = $693 & $694;
       $denormal$1$i = $or$cond22$i ? 0 : $denormal$029$i;
       $695 = $686 * 0.5;
       $696 = (($e2$1$i) + 1)|0;
       $denormal$2$i = $denormal$1$i;$e2$2$i = $696;$y$2$i26 = $695;
      }
      $697 = (($e2$2$i) + 50)|0;
      $698 = ($697|0)>($326|0);
      if (!($698)) {
       $699 = ($denormal$2$i|0)!=(0);
       $700 = $frac$2$i != 0.0;
       $or$cond10$i = $699 & $700;
       if (!($or$cond10$i)) {
        $e2$3$i = $e2$2$i;$y$3$i = $y$2$i26;
        break;
       }
      }
      $701 = (___errno_location()|0);
      HEAP32[$701>>2] = 34;
      $e2$3$i = $e2$2$i;$y$3$i = $y$2$i26;
     } else {
      $e2$3$i = $e2$1$i;$y$3$i = $686;
     }
    } while(0);
    $702 = (+_scalbnl($y$3$i,$e2$3$i));
    $$0 = $702;
    STACKTOP = sp;return (+$$0);
   } else {
    $107 = HEAP32[$1>>2]|0;
    $108 = ($107|0)==(0|0);
    if (!($108)) {
     $109 = HEAP32[$0>>2]|0;
     $110 = (($109) + -1|0);
     HEAP32[$0>>2] = $110;
    }
    $111 = (___errno_location()|0);
    HEAP32[$111>>2] = 22;
    ___shlim($f,0);
    $$0 = 0.0;
    STACKTOP = sp;return (+$$0);
   }
  }
 } while(0);
 if ((label|0) == 23) {
  $41 = HEAP32[$1>>2]|0;
  $42 = ($41|0)==(0|0);
  if (!($42)) {
   $43 = HEAP32[$0>>2]|0;
   $44 = (($43) + -1|0);
   HEAP32[$0>>2] = $44;
  }
  $notlhs = ($pok|0)==(0);
  $notrhs = ($i$0$lcssa>>>0)<(4);
  $or$cond9$not = $notrhs | $notlhs;
  $brmerge = $or$cond9$not | $42;
  if (!($brmerge)) {
   $i$1 = $i$0$lcssa;
   while(1) {
    $45 = HEAP32[$0>>2]|0;
    $46 = (($45) + -1|0);
    HEAP32[$0>>2] = $46;
    $47 = (($i$1) + -1)|0;
    $$old8 = ($47>>>0)>(3);
    if ($$old8) {
     $i$1 = $47;
    } else {
     break;
    }
   }
  }
 }
 $48 = (+($sign$0|0));
 $49 = $48 * inf;
 $50 = $49;
 $$0 = $50;
 STACKTOP = sp;return (+$$0);
}
function ___shlim($f,$lim) {
 $f = $f|0;
 $lim = $lim|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 104|0);
 HEAP32[$0>>2] = $lim;
 $1 = (($f) + 8|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = (($f) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $2;
 $6 = $4;
 $7 = (($5) - ($6))|0;
 $8 = (($f) + 108|0);
 HEAP32[$8>>2] = $7;
 $9 = ($lim|0)!=(0);
 $10 = ($7|0)>($lim|0);
 $or$cond = $9 & $10;
 if ($or$cond) {
  $11 = (($4) + ($lim)|0);
  $12 = (($f) + 100|0);
  HEAP32[$12>>2] = $11;
  STACKTOP = sp;return;
 } else {
  $13 = (($f) + 100|0);
  HEAP32[$13>>2] = $2;
  STACKTOP = sp;return;
 }
}
function ___shgetc($f) {
 $f = $f|0;
 var $$0 = 0, $$phi$trans$insert = 0, $$phi$trans$insert2 = 0, $$pre = 0, $$pre3 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 104|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0);
 if ($2) {
  label = 3;
 } else {
  $3 = (($f) + 108|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = ($4|0)<($1|0);
  if ($5) {
   label = 3;
  }
 }
 if ((label|0) == 3) {
  $6 = (___uflow($f)|0);
  $7 = ($6|0)<(0);
  if (!($7)) {
   $9 = HEAP32[$0>>2]|0;
   $10 = ($9|0)==(0);
   $$phi$trans$insert = (($f) + 8|0);
   $$pre = HEAP32[$$phi$trans$insert>>2]|0;
   if ($10) {
    label = 8;
   } else {
    $11 = (($f) + 4|0);
    $12 = HEAP32[$11>>2]|0;
    $13 = $$pre;
    $14 = $12;
    $15 = (($13) - ($14))|0;
    $16 = (($f) + 108|0);
    $17 = HEAP32[$16>>2]|0;
    $18 = (($9) - ($17))|0;
    $19 = (($18) + -1)|0;
    $20 = ($15|0)>($19|0);
    if ($20) {
     $21 = (($12) + ($19)|0);
     $22 = (($f) + 100|0);
     HEAP32[$22>>2] = $21;
    } else {
     label = 8;
    }
   }
   if ((label|0) == 8) {
    $23 = (($f) + 100|0);
    HEAP32[$23>>2] = $$pre;
   }
   $24 = ($$pre|0)==(0|0);
   $$phi$trans$insert2 = (($f) + 4|0);
   $$pre3 = HEAP32[$$phi$trans$insert2>>2]|0;
   if (!($24)) {
    $25 = $$pre;
    $26 = $$pre3;
    $27 = (($f) + 108|0);
    $28 = HEAP32[$27>>2]|0;
    $29 = (($25) + 1)|0;
    $30 = (($29) - ($26))|0;
    $31 = (($30) + ($28))|0;
    HEAP32[$27>>2] = $31;
   }
   $32 = (($$pre3) + -1|0);
   $33 = HEAP8[$32>>0]|0;
   $34 = $33&255;
   $35 = ($34|0)==($6|0);
   if ($35) {
    $$0 = $6;
    STACKTOP = sp;return ($$0|0);
   }
   $36 = $6&255;
   HEAP8[$32>>0] = $36;
   $$0 = $6;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $8 = (($f) + 100|0);
 HEAP32[$8>>2] = 0;
 $$0 = -1;
 STACKTOP = sp;return ($$0|0);
}
function ___expo2($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $x + -1416.0996898839683;
 $1 = (+Math_exp((+$0)));
 $2 = $1 * 2.2471164185778949E+307;
 $3 = $2 * 2.2471164185778949E+307;
 STACKTOP = sp;return (+$3);
}
function ___expo2f($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $x + -162.88958740234375;
 $1 = (+Math_exp((+$0)));
 $2 = $1 * 1.6615349947311448E+35;
 $3 = $2 * 1.6615349947311448E+35;
 STACKTOP = sp;return (+$3);
}
function ___fpclassify($x) {
 $x = +$x;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 if ((($4|0) == 0)) {
  $5 = $1 & 2147483647;
  $6 = ($0|0)!=(0);
  $7 = ($5|0)!=(0);
  $8 = $6 | $7;
  $9 = $8 ? 3 : 2;
  $$0 = $9;
  STACKTOP = sp;return ($$0|0);
 } else if ((($4|0) == 2047)) {
  $10 = $1 & 1048575;
  $11 = ($0|0)==(0);
  $12 = ($10|0)==(0);
  $13 = $11 & $12;
  $14 = $13&1;
  $$0 = $14;
  STACKTOP = sp;return ($$0|0);
 } else {
  $$0 = 4;
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function ___fpclassifyf($x) {
 $x = +$x;
 var $$0 = 0, $$mask = 0, $$mask1 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $not$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 >>> 23;
 $2 = $1 & 255;
 if ((($2|0) == 0)) {
  $$mask = $0 & 2147483647;
  $3 = ($$mask|0)!=(0);
  $4 = $3 ? 3 : 2;
  $$0 = $4;
 } else if ((($2|0) == 255)) {
  $$mask1 = $0 & 8388607;
  $not$ = ($$mask1|0)==(0);
  $5 = $not$&1;
  $$0 = $5;
 } else {
  $$0 = 4;
 }
 STACKTOP = sp;return ($$0|0);
}
function ___signbit($x) {
 $x = +$x;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),63)|0);
 $3 = tempRet0;
 STACKTOP = sp;return ($2|0);
}
function ___signbitf($x) {
 $x = +$x;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 >>> 31;
 STACKTOP = sp;return ($1|0);
}
function _acosh($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 $5 = ($4>>>0)<(1024);
 if ($5) {
  $6 = $x + -1.0;
  $7 = $6 * $6;
  $8 = $6 * 2.0;
  $9 = $7 + $8;
  $10 = (+Math_sqrt((+$9)));
  $11 = $6 + $10;
  $12 = (+_log1p($11));
  $$0 = $12;
  STACKTOP = sp;return (+$$0);
 }
 $13 = ($4>>>0)<(1049);
 if ($13) {
  $14 = $x * 2.0;
  $15 = $x * $x;
  $16 = $15 + -1.0;
  $17 = (+Math_sqrt((+$16)));
  $18 = $17 + $x;
  $19 = 1.0 / $18;
  $20 = $14 - $19;
  $21 = (+Math_log((+$20)));
  $$0 = $21;
  STACKTOP = sp;return (+$$0);
 } else {
  $22 = (+Math_log((+$x)));
  $23 = $22 + 0.69314718055994529;
  $$0 = $23;
  STACKTOP = sp;return (+$$0);
 }
 return +(0.0);
}
function _acoshf($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0.0;
 var $8 = 0.0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = ($1>>>0)<(1073741824);
 if ($2) {
  $3 = $x + -1.0;
  $4 = $3 * $3;
  $5 = $3 * 2.0;
  $6 = $4 + $5;
  $7 = (+Math_sqrt((+$6)));
  $8 = $3 + $7;
  $9 = (+_log1pf($8));
  $$0 = $9;
  STACKTOP = sp;return (+$$0);
 }
 $10 = ($1>>>0)<(1166016512);
 if ($10) {
  $11 = $x * 2.0;
  $12 = $x * $x;
  $13 = $12 + -1.0;
  $14 = (+Math_sqrt((+$13)));
  $15 = $14 + $x;
  $16 = 1.0 / $15;
  $17 = $11 - $16;
  $18 = (+Math_log((+$17)));
  $$0 = $18;
  STACKTOP = sp;return (+$$0);
 } else {
  $19 = (+Math_log((+$x)));
  $20 = $19 + 0.69314718246459961;
  $$0 = $20;
  STACKTOP = sp;return (+$$0);
 }
 return +(0.0);
}
function _acoshl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_acosh($x));
 STACKTOP = sp;return (+$0);
}
function _asinh($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0;
 var $26 = 0.0, $27 = 0.0, $28 = 0, $29 = 0.0, $3 = 0, $30 = 0.0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0.0, $9 = 0.0, $__x = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 $5 = $1 & 2147483647;
 HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $5;$6 = +HEAPF64[tempDoublePtr>>3];
 $7 = ($4>>>0)>(1048);
 do {
  if ($7) {
   $8 = (+Math_log((+$6)));
   $9 = $8 + 0.69314718055994529;
   $$0 = $9;
  } else {
   $10 = ($4>>>0)>(1023);
   if ($10) {
    $11 = $6 * 2.0;
    $12 = $6 * $6;
    $13 = $12 + 1.0;
    $14 = (+Math_sqrt((+$13)));
    $15 = $6 + $14;
    $16 = 1.0 / $15;
    $17 = $11 + $16;
    $18 = (+Math_log((+$17)));
    $$0 = $18;
    break;
   }
   $19 = ($4>>>0)>(996);
   if ($19) {
    $20 = $6 * $6;
    $21 = $20 + 1.0;
    $22 = (+Math_sqrt((+$21)));
    $23 = $22 + 1.0;
    $24 = $20 / $23;
    $25 = $6 + $24;
    $26 = (+_log1p($25));
    $$0 = $26;
    break;
   } else {
    $27 = $6 + 1.3292279957849159E+36;
    $__x = $27;
    $$0 = $6;
    break;
   }
  }
 } while(0);
 $28 = ($1|0)<(0);
 if (!($28)) {
  $30 = $$0;
  STACKTOP = sp;return (+$30);
 }
 $29 = -$$0;
 $30 = $29;
 STACKTOP = sp;return (+$30);
}
function _asinhf($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0, $25 = 0.0;
 var $26 = 0.0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0, $7 = 0.0, $8 = 0.0, $9 = 0.0, $__x = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = (HEAP32[tempDoublePtr>>2]=$1,+HEAPF32[tempDoublePtr>>2]);
 $3 = ($1>>>0)>(1166016511);
 do {
  if ($3) {
   $4 = (+Math_log((+$2)));
   $5 = $4 + 0.69314718246459961;
   $$0 = $5;
  } else {
   $6 = ($1>>>0)>(1073741823);
   if ($6) {
    $7 = $2 * 2.0;
    $8 = $2 * $2;
    $9 = $8 + 1.0;
    $10 = (+Math_sqrt((+$9)));
    $11 = $2 + $10;
    $12 = 1.0 / $11;
    $13 = $7 + $12;
    $14 = (+Math_log((+$13)));
    $$0 = $14;
    break;
   }
   $15 = ($1>>>0)>(964689919);
   if ($15) {
    $16 = $2 * $2;
    $17 = $16 + 1.0;
    $18 = (+Math_sqrt((+$17)));
    $19 = $18 + 1.0;
    $20 = $16 / $19;
    $21 = $2 + $20;
    $22 = (+_log1pf($21));
    $$0 = $22;
    break;
   } else {
    $23 = $2 + 1.3292279957849159E+36;
    $__x = $23;
    $$0 = $2;
    break;
   }
  }
 } while(0);
 $24 = ($0|0)<(0);
 if (!($24)) {
  $26 = $$0;
  STACKTOP = sp;return (+$26);
 }
 $25 = -$$0;
 $26 = $25;
 STACKTOP = sp;return (+$26);
}
function _asinhl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_asinh($x));
 STACKTOP = sp;return (+$0);
}
function _atanh($x) {
 $x = +$x;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0, $24 = 0.0, $25 = 0.0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0, $9 = 0, $__x = 0.0, $y$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 $5 = $1 & 2147483647;
 HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $5;$6 = +HEAPF64[tempDoublePtr>>3];
 $7 = ($4>>>0)<(1022);
 do {
  if ($7) {
   $8 = ($4>>>0)<(991);
   if (!($8)) {
    $11 = $6 * 2.0;
    $12 = $6 * $11;
    $13 = 1.0 - $6;
    $14 = $12 / $13;
    $15 = $11 + $14;
    $16 = (+_log1p($15));
    $17 = $16 * 0.5;
    $y$0 = $17;
    break;
   }
   $9 = ($4|0)==(0);
   if ($9) {
    $10 = $6;
    $__x = $10;
    $y$0 = $6;
   } else {
    $y$0 = $6;
   }
  } else {
   $18 = 1.0 - $6;
   $19 = $6 / $18;
   $20 = $19 * 2.0;
   $21 = (+_log1p($20));
   $22 = $21 * 0.5;
   $y$0 = $22;
  }
 } while(0);
 $23 = ($1|0)<(0);
 if (!($23)) {
  $25 = $y$0;
  STACKTOP = sp;return (+$25);
 }
 $24 = -$y$0;
 $25 = $24;
 STACKTOP = sp;return (+$25);
}
function _atanhf($x) {
 $x = +$x;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0, $2 = 0.0, $20 = 0.0, $21 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0;
 var $8 = 0.0, $9 = 0.0, $__x = 0.0, $y$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = (HEAP32[tempDoublePtr>>2]=$1,+HEAPF32[tempDoublePtr>>2]);
 $3 = ($1>>>0)<(1056964608);
 do {
  if ($3) {
   $4 = ($1>>>0)<(796917760);
   if (!($4)) {
    $7 = $2 * 2.0;
    $8 = $2 * $7;
    $9 = 1.0 - $2;
    $10 = $8 / $9;
    $11 = $7 + $10;
    $12 = (+_log1pf($11));
    $13 = $12 * 0.5;
    $y$0 = $13;
    break;
   }
   $5 = ($1>>>0)<(8388608);
   if ($5) {
    $6 = $2 * $2;
    $__x = $6;
    $y$0 = $2;
   } else {
    $y$0 = $2;
   }
  } else {
   $14 = 1.0 - $2;
   $15 = $2 / $14;
   $16 = $15 * 2.0;
   $17 = (+_log1pf($16));
   $18 = $17 * 0.5;
   $y$0 = $18;
  }
 } while(0);
 $19 = ($0|0)<(0);
 if (!($19)) {
  $21 = $y$0;
  STACKTOP = sp;return (+$21);
 }
 $20 = -$y$0;
 $21 = $20;
 STACKTOP = sp;return (+$21);
}
function _atanhl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_atanh($x));
 STACKTOP = sp;return (+$0);
}
function _cbrt($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0;
 var $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0.0, $39 = 0.0, $4 = 0.0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0;
 var $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0, $9 = 0, $hx$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = $1 & 2147483647;
 $3 = ($2>>>0)>(2146435071);
 if ($3) {
  $4 = $x + $x;
  $$0 = $4;
  STACKTOP = sp;return (+$$0);
 }
 $5 = ($2>>>0)<(1048576);
 do {
  if ($5) {
   $6 = $x * 18014398509481984.0;
   HEAPF64[tempDoublePtr>>3] = $6;$7 = HEAP32[tempDoublePtr>>2]|0;
   $8 = HEAP32[tempDoublePtr+4>>2]|0;
   $9 = $8 & 2147483647;
   $10 = ($9|0)==(0);
   if ($10) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   } else {
    $11 = (($9>>>0) / 3)&-1;
    $12 = (($11) + 696219795)|0;
    $16 = $8;$47 = $7;$hx$0 = $12;
    break;
   }
  } else {
   $13 = (($2>>>0) / 3)&-1;
   $14 = (($13) + 715094163)|0;
   $16 = $1;$47 = $0;$hx$0 = $14;
  }
 } while(0);
 $15 = $16 & -2147483648;
 $17 = $hx$0 | $15;
 HEAP32[tempDoublePtr>>2] = 0;HEAP32[tempDoublePtr+4>>2] = $17;$18 = +HEAPF64[tempDoublePtr>>3];
 $19 = $18 * $18;
 $20 = $18 / $x;
 $21 = $20 * $19;
 $22 = $21 * 1.6214297201053545;
 $23 = $22 + -1.8849797954337717;
 $24 = $21 * $23;
 $25 = $24 + 1.8759518242717701;
 $26 = $21 * $21;
 $27 = $21 * $26;
 $28 = $21 * 0.14599619288661245;
 $29 = $28 + -0.75839793477876605;
 $30 = $27 * $29;
 $31 = $30 + $25;
 $32 = $18 * $31;
 HEAPF64[tempDoublePtr>>3] = $32;$33 = HEAP32[tempDoublePtr>>2]|0;
 $34 = HEAP32[tempDoublePtr+4>>2]|0;
 $35 = (_i64Add(($33|0),($34|0),-2147483648,0)|0);
 $36 = tempRet0;
 $37 = $35 & -1073741824;
 HEAP32[tempDoublePtr>>2] = $37;HEAP32[tempDoublePtr+4>>2] = $36;$38 = +HEAPF64[tempDoublePtr>>3];
 $39 = $38 * $38;
 $40 = $x / $39;
 $41 = $38 + $38;
 $42 = $40 - $38;
 $43 = $40 + $41;
 $44 = $42 / $43;
 $45 = $44 * $38;
 $46 = $38 + $45;
 $$0 = $46;
 STACKTOP = sp;return (+$$0);
}
function _cbrtf($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0;
 var $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0.0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0, $9 = 0, $hx$0 = 0, $u$sroa$0$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = ($1>>>0)>(2139095039);
 if ($2) {
  $3 = $x + $x;
  $$0 = $3;
  STACKTOP = sp;return (+$$0);
 }
 $4 = ($1>>>0)<(8388608);
 do {
  if ($4) {
   $5 = ($1|0)==(0);
   if ($5) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   } else {
    $6 = $x * 16777216.0;
    $7 = (HEAPF32[tempDoublePtr>>2]=$6,HEAP32[tempDoublePtr>>2]|0);
    $8 = $7 & 2147483647;
    $9 = (($8>>>0) / 3)&-1;
    $10 = (($9) + 642849266)|0;
    $hx$0 = $10;$u$sroa$0$0 = $7;
    break;
   }
  } else {
   $11 = (($1>>>0) / 3)&-1;
   $12 = (($11) + 709958130)|0;
   $hx$0 = $12;$u$sroa$0$0 = $0;
  }
 } while(0);
 $13 = $u$sroa$0$0 & -2147483648;
 $14 = $13 | $hx$0;
 $15 = (HEAP32[tempDoublePtr>>2]=$14,+HEAPF32[tempDoublePtr>>2]);
 $16 = $15;
 $17 = $16 * $16;
 $18 = $16 * $17;
 $19 = $x;
 $20 = $19 + $19;
 $21 = $20 + $18;
 $22 = $16 * $21;
 $23 = $19 + $18;
 $24 = $18 + $23;
 $25 = $22 / $24;
 $26 = $25 * $25;
 $27 = $25 * $26;
 $28 = $20 + $27;
 $29 = $25 * $28;
 $30 = $19 + $27;
 $31 = $27 + $30;
 $32 = $29 / $31;
 $33 = $32;
 $$0 = $33;
 STACKTOP = sp;return (+$$0);
}
function _cbrtl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_cbrt($x));
 STACKTOP = sp;return (+$0);
}
function _copysign($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 HEAPF64[tempDoublePtr>>3] = $y;$2 = HEAP32[tempDoublePtr>>2]|0;
 $3 = HEAP32[tempDoublePtr+4>>2]|0;
 $4 = $1 & 2147483647;
 $5 = $3 & -2147483648;
 $6 = $5 | $4;
 HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $6;$7 = +HEAPF64[tempDoublePtr>>3];
 STACKTOP = sp;return (+$7);
}
function _copysignf($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = (HEAPF32[tempDoublePtr>>2]=$y,HEAP32[tempDoublePtr>>2]|0);
 $2 = $0 & 2147483647;
 $3 = $1 & -2147483648;
 $4 = $3 | $2;
 $5 = (HEAP32[tempDoublePtr>>2]=$4,+HEAPF32[tempDoublePtr>>2]);
 STACKTOP = sp;return (+$5);
}
function _copysignl($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_copysign($x,$y));
 STACKTOP = sp;return (+$0);
}
function _cosh($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $2 = 0, $3 = 0.0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0.0;
 var $__x = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = $1 & 2147483647;
 HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $2;$3 = +HEAPF64[tempDoublePtr>>3];
 $4 = ($2>>>0)<(1072049730);
 if ($4) {
  $5 = ($2>>>0)<(1045430272);
  if ($5) {
   $6 = $3 + 1.3292279957849159E+36;
   $__x = $6;
   $$0 = 1.0;
   STACKTOP = sp;return (+$$0);
  } else {
   $7 = (+_expm1($3));
   $8 = $7 * $7;
   $9 = $7 + 1.0;
   $10 = $9 * 2.0;
   $11 = $8 / $10;
   $12 = $11 + 1.0;
   $$0 = $12;
   STACKTOP = sp;return (+$$0);
  }
 } else {
  $13 = ($2>>>0)<(1082535490);
  if ($13) {
   $14 = (+Math_exp((+$3)));
   $15 = 1.0 / $14;
   $16 = $14 + $15;
   $17 = $16 * 0.5;
   $$0 = $17;
   STACKTOP = sp;return (+$$0);
  } else {
   $18 = (+___expo2($3));
   $$0 = $18;
   STACKTOP = sp;return (+$$0);
  }
 }
 return +(0.0);
}
function _coshf($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0.0, $__x = 0.0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = (HEAP32[tempDoublePtr>>2]=$1,+HEAPF32[tempDoublePtr>>2]);
 $3 = ($1>>>0)<(1060205079);
 if ($3) {
  $4 = ($1>>>0)<(964689920);
  if ($4) {
   $5 = $2 + 1.3292279957849159E+36;
   $__x = $5;
   $$0 = 1.0;
   STACKTOP = sp;return (+$$0);
  } else {
   $6 = (+_expm1f($2));
   $7 = $6 * $6;
   $8 = $6 + 1.0;
   $9 = $8 * 2.0;
   $10 = $7 / $9;
   $11 = $10 + 1.0;
   $$0 = $11;
   STACKTOP = sp;return (+$$0);
  }
 } else {
  $12 = ($1>>>0)<(1118925335);
  if ($12) {
   $13 = (+Math_exp((+$2)));
   $14 = 1.0 / $13;
   $15 = $13 + $14;
   $16 = $15 * 0.5;
   $$0 = $16;
   STACKTOP = sp;return (+$$0);
  } else {
   $17 = (+___expo2f($2));
   $$0 = $17;
   STACKTOP = sp;return (+$$0);
  }
 }
 return +(0.0);
}
function _coshl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_cosh($x));
 STACKTOP = sp;return (+$0);
}
function _exp2($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0, $23 = 0.0, $24 = 0.0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0, $33 = 0, $34 = 0, $35 = 0.0, $36 = 0, $37 = 0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0;
 var $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $__x = 0.0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = $1 & 2147483647;
 $3 = ($2>>>0)>(1083174911);
 do {
  if ($3) {
   $4 = ($2>>>0)>(1083179007);
   $5 = ($1|0)>(-1);
   $6 = ($0>>>0)>(4294967295);
   $7 = ($1|0)==(-1);
   $8 = $7 & $6;
   $9 = $5 | $8;
   $or$cond = $4 & $9;
   if ($or$cond) {
    $10 = $x * 8.9884656743115795E+307;
    $$0 = $10;
    STACKTOP = sp;return (+$$0);
   }
   $11 = ($2>>>0)>(2146435071);
   if ($11) {
    $12 = -1.0 / $x;
    $$0 = $12;
    STACKTOP = sp;return (+$$0);
   }
   $13 = ($1|0)<(0);
   if ($13) {
    $14 = !($x <= -1075.0);
    if ($14) {
     $17 = $x + -4503599627370496.0;
     $18 = $17 + 4503599627370496.0;
     $19 = $18 != $x;
     if (!($19)) {
      break;
     }
     $20 = -1.4012984643248171E-45 / $x;
     $21 = $20;
     $__x = $21;
     break;
    } else {
     $15 = -1.4012984643248171E-45 / $x;
     $16 = $15;
     $__x = $16;
     $$0 = 0.0;
     STACKTOP = sp;return (+$$0);
    }
   }
  } else {
   $22 = ($2>>>0)<(1016070144);
   if ($22) {
    $23 = $x + 1.0;
    $$0 = $23;
    STACKTOP = sp;return (+$$0);
   }
  }
 } while(0);
 $24 = $x + 26388279066624.0;
 HEAPF64[tempDoublePtr>>3] = $24;$25 = HEAP32[tempDoublePtr>>2]|0;
 $26 = HEAP32[tempDoublePtr+4>>2]|0;
 $27 = (($25) + 128)|0;
 $28 = $27 & -256;
 $29 = (($28|0) / 256)&-1;
 $30 = $24 + -26388279066624.0;
 $31 = $x - $30;
 $32 = $27 << 1;
 $33 = $32 & 510;
 $34 = (1488 + ($33<<3)|0);
 $35 = +HEAPF64[$34>>3];
 $36 = $33 | 1;
 $37 = (1488 + ($36<<3)|0);
 $38 = +HEAPF64[$37>>3];
 $39 = $31 - $38;
 $40 = $35 * $39;
 $41 = $39 * 0.0013333559164630223;
 $42 = $41 + 0.0096181298421260663;
 $43 = $39 * $42;
 $44 = $43 + 0.055504108664821403;
 $45 = $39 * $44;
 $46 = $45 + 0.2402265069591;
 $47 = $39 * $46;
 $48 = $47 + 0.69314718055994529;
 $49 = $40 * $48;
 $50 = $35 + $49;
 $51 = (+_scalbn($50,$29));
 $$0 = $51;
 STACKTOP = sp;return (+$$0);
}
function _exp2f($x) {
 $x = +$x;
 var $$0 = 0.0, $$not = 0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0;
 var $25 = 0.0, $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $5 = 0.0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $__x = 0.0, $or$cond = 0, $or$cond2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = ($1>>>0)>(1123811328);
 if ($2) {
  $3 = ($0>>>0)>(1124073471);
  $4 = ($0|0)>(-1);
  $or$cond = $3 & $4;
  if ($or$cond) {
   $5 = $x * 1.7014118346046923E+38;
   $$0 = $5;
   STACKTOP = sp;return (+$$0);
  }
  $6 = ($0|0)<(0);
  if ($6) {
   $7 = ($0>>>0)>(3272998911);
   $$not = $7 ^ 1;
   $8 = $0 & 65535;
   $9 = ($8|0)==(0);
   $or$cond2 = $9 & $$not;
   if (!($or$cond2)) {
    $10 = -1.4012984643248171E-45 / $x;
    $__x = $10;
   }
   if ($7) {
    $$0 = 0.0;
    STACKTOP = sp;return (+$$0);
   }
  }
 } else {
  $11 = ($1>>>0)<(855638017);
  if ($11) {
   $12 = $x + 1.0;
   $$0 = $12;
   STACKTOP = sp;return (+$$0);
  }
 }
 $13 = $x + 786432.0;
 $14 = (HEAPF32[tempDoublePtr>>2]=$13,HEAP32[tempDoublePtr>>2]|0);
 $15 = (($14) + 8)|0;
 $16 = $15 >>> 4;
 $17 = (($16) + 1023)|0;
 $18 = (_bitshift64Shl(($17|0),0,52)|0);
 $19 = tempRet0;
 $20 = $15 & 15;
 $21 = $13 + -786432.0;
 $22 = $x - $21;
 $23 = $22;
 $24 = (5584 + ($20<<3)|0);
 $25 = +HEAPF64[$24>>3];
 $26 = $23 * $25;
 $27 = $23 * 0.24022650718688965;
 $28 = $27 + 0.69314718246459961;
 $29 = $28 * $26;
 $30 = $25 + $29;
 $31 = $23 * $23;
 $32 = $31 * $26;
 $33 = $23 * 0.0096183549612760544;
 $34 = $33 + 0.055505409836769104;
 $35 = $34 * $32;
 $36 = $30 + $35;
 HEAP32[tempDoublePtr>>2] = $18;HEAP32[tempDoublePtr+4>>2] = $19;$37 = +HEAPF64[tempDoublePtr>>3];
 $38 = $37 * $36;
 $39 = $38;
 $$0 = $39;
 STACKTOP = sp;return (+$$0);
}
function _exp2l($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_exp2($x));
 STACKTOP = sp;return (+$0);
}
function _expm1($x) {
 $x = +$x;
 var $$0 = 0.0, $$02 = 0.0, $$pn = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0.0, $23 = 0.0;
 var $24 = 0, $25 = 0.0, $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0, $33 = 0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0;
 var $42 = 0.0, $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0;
 var $60 = 0.0, $61 = 0.0, $62 = 0.0, $63 = 0.0, $64 = 0.0, $65 = 0, $66 = 0.0, $67 = 0.0, $68 = 0.0, $69 = 0.0, $7 = 0, $70 = 0.0, $71 = 0.0, $72 = 0, $73 = 0, $74 = 0, $75 = 0.0, $76 = 0, $77 = 0.0, $78 = 0.0;
 var $79 = 0, $8 = 0, $80 = 0.0, $81 = 0.0, $82 = 0.0, $83 = 0.0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0.0, $89 = 0.0, $9 = 0, $90 = 0.0, $91 = 0.0, $92 = 0.0, $93 = 0.0, $94 = 0.0, $95 = 0.0, $__x = 0.0;
 var $c$0 = 0.0, $hi$0 = 0.0, $k$0 = 0, $k$1 = 0, $lo$0 = 0.0, $y$0 = 0.0, $y$1 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = $1 & 2147483647;
 $3 = (_bitshift64Lshr(($0|0),($1|0),63)|0);
 $4 = tempRet0;
 $5 = ($2>>>0)>(1078159481);
 if ($5) {
  $6 = $1 & 2147483647;
  $7 = ($6>>>0)>(2146435072);
  $8 = ($0>>>0)>(0);
  $9 = ($6|0)==(2146435072);
  $10 = $9 & $8;
  $11 = $7 | $10;
  if ($11) {
   $$0 = $x;
   STACKTOP = sp;return (+$$0);
  }
  $12 = ($3|0)==(0);
  if (!($12)) {
   $$0 = -1.0;
   STACKTOP = sp;return (+$$0);
  }
  $13 = $x > 709.78271289338397;
  if ($13) {
   $14 = $x * 8.9884656743115795E+307;
   $$0 = $14;
   STACKTOP = sp;return (+$$0);
  }
 }
 $15 = ($2>>>0)>(1071001154);
 if ($15) {
  $16 = ($2>>>0)<(1072734898);
  do {
   if ($16) {
    $17 = ($3|0)==(0);
    if ($17) {
     $18 = $x + -0.69314718036912382;
     $hi$0 = $18;$k$0 = 1;$lo$0 = 1.9082149292705877E-10;
     break;
    } else {
     $19 = $x + 0.69314718036912382;
     $hi$0 = $19;$k$0 = -1;$lo$0 = -1.9082149292705877E-10;
     break;
    }
   } else {
    $20 = $x * 1.4426950408889634;
    $21 = ($3|0)!=(0);
    $22 = $21 ? -0.5 : 0.5;
    $23 = $20 + $22;
    $24 = (~~(($23)));
    $25 = (+($24|0));
    $26 = $25 * 0.69314718036912382;
    $27 = $x - $26;
    $28 = $25 * 1.9082149292705877E-10;
    $hi$0 = $27;$k$0 = $24;$lo$0 = $28;
   }
  } while(0);
  $29 = $hi$0 - $lo$0;
  $30 = $hi$0 - $29;
  $31 = $30 - $lo$0;
  $$02 = $29;$c$0 = $31;$k$1 = $k$0;
 } else {
  $32 = ($2>>>0)<(1016070144);
  if ($32) {
   $33 = ($2>>>0)<(1048576);
   if (!($33)) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   }
   $34 = $x;
   $__x = $34;
   $$0 = $x;
   STACKTOP = sp;return (+$$0);
  } else {
   $$02 = $x;$c$0 = 0.0;$k$1 = 0;
  }
 }
 $35 = $$02 * 0.5;
 $36 = $$02 * $35;
 $37 = $36 * -2.0109921818362437E-7;
 $38 = $37 + 4.0082178273293624E-6;
 $39 = $36 * $38;
 $40 = $39 + -7.9365075786748794E-5;
 $41 = $36 * $40;
 $42 = $41 + 0.0015873015872548146;
 $43 = $36 * $42;
 $44 = $43 + -0.033333333333333132;
 $45 = $36 * $44;
 $46 = $45 + 1.0;
 $47 = $35 * $46;
 $48 = 3.0 - $47;
 $49 = $46 - $48;
 $50 = $$02 * $48;
 $51 = 6.0 - $50;
 $52 = $49 / $51;
 $53 = $36 * $52;
 $54 = ($k$1|0)==(0);
 if ($54) {
  $55 = $$02 * $53;
  $56 = $55 - $36;
  $57 = $$02 - $56;
  $$0 = $57;
  STACKTOP = sp;return (+$$0);
 }
 $58 = $53 - $c$0;
 $59 = $$02 * $58;
 $60 = $59 - $c$0;
 $61 = $60 - $36;
 if ((($k$1|0) == -1)) {
  $62 = $$02 - $61;
  $63 = $62 * 0.5;
  $64 = $63 + -0.5;
  $$0 = $64;
  STACKTOP = sp;return (+$$0);
 } else if ((($k$1|0) == 1)) {
  $65 = $$02 < -0.25;
  if ($65) {
   $66 = $$02 + 0.5;
   $67 = $61 - $66;
   $68 = $67 * -2.0;
   $$0 = $68;
   STACKTOP = sp;return (+$$0);
  } else {
   $69 = $$02 - $61;
   $70 = $69 * 2.0;
   $71 = $70 + 1.0;
   $$0 = $71;
   STACKTOP = sp;return (+$$0);
  }
 } else {
  $72 = (($k$1) + 1023)|0;
  $73 = (_bitshift64Shl(($72|0),0,52)|0);
  $74 = tempRet0;
  HEAP32[tempDoublePtr>>2] = $73;HEAP32[tempDoublePtr+4>>2] = $74;$75 = +HEAPF64[tempDoublePtr>>3];
  $76 = ($k$1>>>0)>(56);
  if ($76) {
   $77 = $$02 - $61;
   $78 = $77 + 1.0;
   $79 = ($k$1|0)==(1024);
   if ($79) {
    $80 = $78 * 2.0;
    $81 = $80 * 8.9884656743115795E+307;
    $y$0 = $81;
   } else {
    $82 = $75 * $78;
    $y$0 = $82;
   }
   $83 = $y$0 + -1.0;
   $$0 = $83;
   STACKTOP = sp;return (+$$0);
  } else {
   $84 = (1023 - ($k$1))|0;
   $85 = (_bitshift64Shl(($84|0),0,52)|0);
   $86 = tempRet0;
   $87 = ($k$1|0)<(20);
   if ($87) {
    $88 = $$02 - $61;
    HEAP32[tempDoublePtr>>2] = $85;HEAP32[tempDoublePtr+4>>2] = $86;$89 = +HEAPF64[tempDoublePtr>>3];
    $90 = 1.0 - $89;
    $91 = $90 + $88;
    $$pn = $91;
   } else {
    HEAP32[tempDoublePtr>>2] = $85;HEAP32[tempDoublePtr+4>>2] = $86;$92 = +HEAPF64[tempDoublePtr>>3];
    $93 = $92 + $61;
    $94 = $$02 - $93;
    $95 = $94 + 1.0;
    $$pn = $95;
   }
   $y$1 = $75 * $$pn;
   $$0 = $y$1;
   STACKTOP = sp;return (+$$0);
  }
 }
 return +(0.0);
}
function _expm1f($x) {
 $x = +$x;
 var $$0 = 0.0, $$02 = 0.0, $$pn = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0.0, $16 = 0.0, $17 = 0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0;
 var $24 = 0.0, $25 = 0, $26 = 0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0;
 var $42 = 0.0, $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0.0, $62 = 0, $63 = 0.0, $64 = 0.0, $65 = 0, $66 = 0.0, $67 = 0.0, $68 = 0.0, $69 = 0.0, $7 = 0.0, $70 = 0, $71 = 0, $72 = 0, $73 = 0.0, $74 = 0.0, $75 = 0.0, $76 = 0.0, $77 = 0.0, $78 = 0.0;
 var $79 = 0.0, $8 = 0, $80 = 0.0, $9 = 0, $__x = 0.0, $c$0 = 0.0, $hi$0 = 0.0, $k$0 = 0, $k$1 = 0, $lo$0 = 0.0, $y$0 = 0.0, $y$1 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = $0 >>> 31;
 $3 = ($1>>>0)>(1100331075);
 if ($3) {
  $4 = ($1>>>0)>(2139095040);
  if ($4) {
   $$0 = $x;
   STACKTOP = sp;return (+$$0);
  }
  $5 = ($2|0)==(0);
  if (!($5)) {
   $$0 = -1.0;
   STACKTOP = sp;return (+$$0);
  }
  $6 = $x > 88.7216796875;
  if ($6) {
   $7 = $x * 1.7014118346046923E+38;
   $$0 = $7;
   STACKTOP = sp;return (+$$0);
  }
 }
 $8 = ($1>>>0)>(1051816472);
 if ($8) {
  $9 = ($1>>>0)<(1065686418);
  do {
   if ($9) {
    $10 = ($2|0)==(0);
    if ($10) {
     $11 = $x + -0.69313812255859375;
     $hi$0 = $11;$k$0 = 1;$lo$0 = 9.0580006144591607E-6;
     break;
    } else {
     $12 = $x + 0.69313812255859375;
     $hi$0 = $12;$k$0 = -1;$lo$0 = -9.0580006144591607E-6;
     break;
    }
   } else {
    $13 = $x * 1.4426950216293335;
    $14 = ($2|0)!=(0);
    $15 = $14 ? -0.5 : 0.5;
    $16 = $13 + $15;
    $17 = (~~(($16)));
    $18 = (+($17|0));
    $19 = $18 * 0.69313812255859375;
    $20 = $x - $19;
    $21 = $18 * 9.0580006144591607E-6;
    $hi$0 = $20;$k$0 = $17;$lo$0 = $21;
   }
  } while(0);
  $22 = $hi$0 - $lo$0;
  $23 = $hi$0 - $22;
  $24 = $23 - $lo$0;
  $$02 = $22;$c$0 = $24;$k$1 = $k$0;
 } else {
  $25 = ($1>>>0)<(855638016);
  if ($25) {
   $26 = ($1>>>0)<(8388608);
   if (!($26)) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   }
   $27 = $x * $x;
   $__x = $27;
   $$0 = $x;
   STACKTOP = sp;return (+$$0);
  } else {
   $$02 = $x;$c$0 = 0.0;$k$1 = 0;
  }
 }
 $28 = $$02 * 0.5;
 $29 = $$02 * $28;
 $30 = $29 * 0.0015807170420885086;
 $31 = $30 + -0.03333321213722229;
 $32 = $29 * $31;
 $33 = $32 + 1.0;
 $34 = $28 * $33;
 $35 = 3.0 - $34;
 $36 = $33 - $35;
 $37 = $$02 * $35;
 $38 = 6.0 - $37;
 $39 = $36 / $38;
 $40 = $29 * $39;
 $41 = ($k$1|0)==(0);
 if ($41) {
  $42 = $$02 * $40;
  $43 = $42 - $29;
  $44 = $$02 - $43;
  $$0 = $44;
  STACKTOP = sp;return (+$$0);
 }
 $45 = $40 - $c$0;
 $46 = $$02 * $45;
 $47 = $46 - $c$0;
 $48 = $47 - $29;
 if ((($k$1|0) == 1)) {
  $52 = $$02 < -0.25;
  if ($52) {
   $53 = $$02 + 0.5;
   $54 = $48 - $53;
   $55 = $54 * -2.0;
   $$0 = $55;
   STACKTOP = sp;return (+$$0);
  } else {
   $56 = $$02 - $48;
   $57 = $56 * 2.0;
   $58 = $57 + 1.0;
   $$0 = $58;
   STACKTOP = sp;return (+$$0);
  }
 } else if ((($k$1|0) == -1)) {
  $49 = $$02 - $48;
  $50 = $49 * 0.5;
  $51 = $50 + -0.5;
  $$0 = $51;
  STACKTOP = sp;return (+$$0);
 } else {
  $59 = $k$1 << 23;
  $60 = (($59) + 1065353216)|0;
  $61 = (HEAP32[tempDoublePtr>>2]=$60,+HEAPF32[tempDoublePtr>>2]);
  $62 = ($k$1>>>0)>(56);
  if ($62) {
   $63 = $$02 - $48;
   $64 = $63 + 1.0;
   $65 = ($k$1|0)==(128);
   if ($65) {
    $66 = $64 * 2.0;
    $67 = $66 * 1.7014118346046923E+38;
    $y$0 = $67;
   } else {
    $68 = $61 * $64;
    $y$0 = $68;
   }
   $69 = $y$0 + -1.0;
   $$0 = $69;
   STACKTOP = sp;return (+$$0);
  } else {
   $70 = (127 - ($k$1))|0;
   $71 = $70 << 23;
   $72 = ($k$1|0)<(23);
   if ($72) {
    $73 = $$02 - $48;
    $74 = (HEAP32[tempDoublePtr>>2]=$71,+HEAPF32[tempDoublePtr>>2]);
    $75 = 1.0 - $74;
    $76 = $75 + $73;
    $$pn = $76;
   } else {
    $77 = (HEAP32[tempDoublePtr>>2]=$71,+HEAPF32[tempDoublePtr>>2]);
    $78 = $77 + $48;
    $79 = $$02 - $78;
    $80 = $79 + 1.0;
    $$pn = $80;
   }
   $y$1 = $61 * $$pn;
   $$0 = $y$1;
   STACKTOP = sp;return (+$$0);
  }
 }
 return +(0.0);
}
function _expm1l($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_expm1($x));
 STACKTOP = sp;return (+$0);
}
function _fdim($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = $1 & 2147483647;
 $3 = ($2>>>0)>(2146435072);
 $4 = ($0>>>0)>(0);
 $5 = ($2|0)==(2146435072);
 $6 = $5 & $4;
 $7 = $3 | $6;
 if ($7) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 HEAPF64[tempDoublePtr>>3] = $y;$8 = HEAP32[tempDoublePtr>>2]|0;
 $9 = HEAP32[tempDoublePtr+4>>2]|0;
 $10 = $9 & 2147483647;
 $11 = ($10>>>0)>(2146435072);
 $12 = ($8>>>0)>(0);
 $13 = ($10|0)==(2146435072);
 $14 = $13 & $12;
 $15 = $11 | $14;
 if ($15) {
  $$0 = $y;
  STACKTOP = sp;return (+$$0);
 }
 $16 = $x > $y;
 if (!($16)) {
  $$0 = 0.0;
  STACKTOP = sp;return (+$$0);
 }
 $17 = $x - $y;
 $$0 = $17;
 STACKTOP = sp;return (+$$0);
}
function _fdimf($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = ($1>>>0)>(2139095040);
 if ($2) {
  $$0 = $x;
 } else {
  $3 = (HEAPF32[tempDoublePtr>>2]=$y,HEAP32[tempDoublePtr>>2]|0);
  $4 = $3 & 2147483647;
  $5 = ($4>>>0)>(2139095040);
  if ($5) {
   $$0 = $y;
  } else {
   $6 = $x > $y;
   if ($6) {
    $7 = $x - $y;
    $$0 = $7;
   } else {
    $$0 = 0.0;
   }
  }
 }
 STACKTOP = sp;return (+$$0);
}
function _fdiml($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_fdim($x,$y));
 STACKTOP = sp;return (+$0);
}
function _finite($x) {
 $x = +$x;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = $1 & 2146435072;
 $3 = ($2>>>0)<(2146435072);
 $4 = (0)<(0);
 $5 = ($2|0)==(2146435072);
 $6 = $5 & $4;
 $7 = $3 | $6;
 $8 = $7&1;
 STACKTOP = sp;return ($8|0);
}
function _finitef($x) {
 $x = +$x;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2139095040;
 $2 = ($1>>>0)<(2139095040);
 $3 = $2&1;
 STACKTOP = sp;return ($3|0);
}
function _fma($x,$y,$z) {
 $x = +$x;
 $y = +$y;
 $z = +$z;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0.0, $104 = 0.0, $105 = 0.0, $106 = 0.0, $107 = 0.0, $108 = 0.0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0;
 var $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0.0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0.0, $131 = 0.0, $132 = 0.0;
 var $133 = 0.0, $134 = 0.0, $135 = 0.0, $136 = 0.0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0;
 var $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0.0, $160 = 0, $161 = 0.0, $162 = 0.0, $17 = 0.0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0.0, $53 = 0, $54 = 0, $55 = 0, $56 = 0.0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0.0, $61 = 0, $62 = 0, $63 = 0.0, $64 = 0.0, $65 = 0.0, $66 = 0.0, $67 = 0.0, $68 = 0.0, $69 = 0.0, $7 = 0, $70 = 0.0, $71 = 0.0, $72 = 0.0, $73 = 0.0, $74 = 0.0, $75 = 0.0, $76 = 0.0, $77 = 0.0;
 var $78 = 0.0, $79 = 0.0, $8 = 0, $80 = 0.0, $81 = 0.0, $82 = 0.0, $83 = 0.0, $84 = 0.0, $85 = 0.0, $86 = 0.0, $87 = 0.0, $88 = 0, $89 = 0.0, $9 = 0, $90 = 0.0, $91 = 0.0, $92 = 0.0, $93 = 0, $94 = 0, $95 = 0.0;
 var $96 = 0.0, $97 = 0.0, $98 = 0, $99 = 0, $ex = 0, $ey = 0, $ez = 0, $or$cond = 0, $sum$sroa$0$0$i = 0.0, $sum$sroa$0$0$i2 = 0.0, $vzs = 0.0, $zs$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ex = sp + 16|0;
 $ey = sp + 12|0;
 $ez = sp + 8|0;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = $1 & 2146435072;
 $3 = ($2>>>0)<(2146435072);
 $4 = (0)<(0);
 $5 = ($2|0)==(2146435072);
 $6 = $5 & $4;
 $7 = $3 | $6;
 if ($7) {
  HEAPF64[tempDoublePtr>>3] = $y;$8 = HEAP32[tempDoublePtr>>2]|0;
  $9 = HEAP32[tempDoublePtr+4>>2]|0;
  $10 = $9 & 2146435072;
  $11 = ($10>>>0)<(2146435072);
  $12 = (0)<(0);
  $13 = ($10|0)==(2146435072);
  $14 = $13 & $12;
  $15 = $11 | $14;
  if ($15) {
   HEAPF64[tempDoublePtr>>3] = $z;$18 = HEAP32[tempDoublePtr>>2]|0;
   $19 = HEAP32[tempDoublePtr+4>>2]|0;
   $20 = $19 & 2146435072;
   $21 = ($20>>>0)<(2146435072);
   $22 = (0)<(0);
   $23 = ($20|0)==(2146435072);
   $24 = $23 & $22;
   $25 = $21 | $24;
   if (!($25)) {
    $$0 = $z;
    STACKTOP = sp;return (+$$0);
   }
   $26 = $x == 0.0;
   $27 = $y == 0.0;
   $or$cond = $26 | $27;
   if ($or$cond) {
    $28 = $x * $y;
    $29 = $28 + $z;
    $$0 = $29;
    STACKTOP = sp;return (+$$0);
   }
   $30 = $z == 0.0;
   if ($30) {
    $31 = $x * $y;
    $$0 = $31;
    STACKTOP = sp;return (+$$0);
   }
   $32 = (+_frexp($x,$ex));
   $33 = (+_frexp($y,$ey));
   $34 = (+_frexp($z,$ez));
   $35 = (_fegetround()|0);
   $36 = HEAP32[$ex>>2]|0;
   $37 = HEAP32[$ey>>2]|0;
   $38 = (($37) + ($36))|0;
   $39 = HEAP32[$ez>>2]|0;
   $40 = (($38) - ($39))|0;
   $41 = ($40|0)<(-53);
   if ($41) {
    (_i64Add(($18|0),($19|0),0,1048576)|0);
    $42 = tempRet0;
    $43 = $42 & 2145386496;
    $44 = (0)==(0);
    $45 = ($43|0)==(0);
    $46 = $44 & $45;
    if ($46) {
    }
    if ((($35|0) == 3072)) {
     $47 = $x > 0.0;
     $48 = $y < 0.0;
     $49 = $47 ^ $48;
     $50 = $z < 0.0;
     $51 = $49 ^ $50;
     if ($51) {
      $$0 = $z;
      STACKTOP = sp;return (+$$0);
     }
     $52 = (+_nextafter((+$z),0.0));
     $$0 = $52;
     STACKTOP = sp;return (+$$0);
    } else if ((($35|0) == 1024)) {
     $53 = $x > 0.0;
     $54 = $y < 0.0;
     $55 = $53 ^ $54;
     if ($55) {
      $$0 = $z;
      STACKTOP = sp;return (+$$0);
     }
     $56 = (+_nextafter((+$z),-inf));
     $$0 = $56;
     STACKTOP = sp;return (+$$0);
    } else if ((($35|0) == 2048)) {
     $57 = $x > 0.0;
     $58 = $y < 0.0;
     $59 = $57 ^ $58;
     if (!($59)) {
      $$0 = $z;
      STACKTOP = sp;return (+$$0);
     }
     $60 = (+_nextafter((+$z),inf));
     $$0 = $60;
     STACKTOP = sp;return (+$$0);
    } else {
     $$0 = $z;
     STACKTOP = sp;return (+$$0);
    }
   }
   $61 = ($40|0)<(107);
   if ($61) {
    $62 = (0 - ($40))|0;
    $63 = (+_scalbn($34,$62));
    $zs$0 = $63;
   } else {
    $64 = (+_copysign(2.2250738585072014E-308,$34));
    $zs$0 = $64;
   }
   (_fesetround(0)|0);
   $65 = $32 * 134217729.0;
   $66 = $32 - $65;
   $67 = $65 + $66;
   $68 = $32 - $67;
   $69 = $33 * 134217729.0;
   $70 = $33 - $69;
   $71 = $69 + $70;
   $72 = $33 - $71;
   $73 = $67 * $71;
   $74 = $67 * $72;
   $75 = $68 * $71;
   $76 = $75 + $74;
   $77 = $73 + $76;
   $78 = $73 - $77;
   $79 = $76 + $78;
   $80 = $68 * $72;
   $81 = $80 + $79;
   $82 = $77 + $zs$0;
   $83 = $82 - $77;
   $84 = $82 - $83;
   $85 = $77 - $84;
   $86 = $zs$0 - $83;
   $87 = $86 + $85;
   $88 = $82 == 0.0;
   if ($88) {
    (_fesetround(($35|0))|0);
    $vzs = $zs$0;
    $89 = $vzs;
    $90 = $77 + $89;
    $91 = (+_scalbn($81,$38));
    $92 = $90 + $91;
    $$0 = $92;
    STACKTOP = sp;return (+$$0);
   }
   $93 = ($35|0)==(0);
   if (!($93)) {
    $94 = (_fetestexcept(32)|0);
    (_fesetround(($35|0))|0);
    $95 = $81 + $87;
    $96 = $82 + $95;
    $97 = (+_scalbn($96,$38));
    $98 = (_ilogb((+$97))|0);
    $99 = ($98|0)<(-1022);
    if ($99) {
     $100 = (_fetestexcept(32)|0);
     $101 = ($100|0)==(0);
     if (!($101)) {
      $$0 = $97;
      STACKTOP = sp;return (+$$0);
     }
    }
    $102 = ($94|0)==(0);
    if ($102) {
     $$0 = $97;
     STACKTOP = sp;return (+$$0);
    }
    $$0 = $97;
    STACKTOP = sp;return (+$$0);
   }
   $103 = $81 + $87;
   $104 = $103 - $87;
   $105 = $103 - $104;
   $106 = $87 - $105;
   $107 = $81 - $104;
   $108 = $107 + $106;
   $109 = $108 != 0.0;
   if ($109) {
    HEAPF64[tempDoublePtr>>3] = $103;$110 = HEAP32[tempDoublePtr>>2]|0;
    $111 = HEAP32[tempDoublePtr+4>>2]|0;
    $112 = $110 & 1;
    $113 = ($112|0)==(0);
    $114 = (0)==(0);
    $115 = $113 & $114;
    if ($115) {
     HEAPF64[tempDoublePtr>>3] = $108;$116 = HEAP32[tempDoublePtr>>2]|0;
     $117 = HEAP32[tempDoublePtr+4>>2]|0;
     $118 = $116 ^ $110;
     $119 = $117 ^ $111;
     $120 = (_bitshift64Lshr(($118|0),($119|0),62)|0);
     $121 = tempRet0;
     $122 = (_i64Add(($110|0),($111|0),1,0)|0);
     $123 = tempRet0;
     $124 = (_i64Subtract(($122|0),($123|0),($120|0),($121|0))|0);
     $125 = tempRet0;
     HEAP32[tempDoublePtr>>2] = $124;HEAP32[tempDoublePtr+4>>2] = $125;$126 = +HEAPF64[tempDoublePtr>>3];
     $sum$sroa$0$0$i2 = $126;
    } else {
     $sum$sroa$0$0$i2 = $103;
    }
   } else {
    $sum$sroa$0$0$i2 = $103;
   }
   $127 = (_ilogb((+$82))|0);
   $128 = (($127) + ($38))|0;
   $129 = ($128|0)>(-1023);
   $130 = $82 + $sum$sroa$0$0$i2;
   if ($129) {
    $131 = (+_scalbn($130,$38));
    $$0 = $131;
    STACKTOP = sp;return (+$$0);
   }
   $132 = $130 - $82;
   $133 = $130 - $132;
   $134 = $82 - $133;
   $135 = $sum$sroa$0$0$i2 - $132;
   $136 = $135 + $134;
   $137 = $136 != 0.0;
   if ($137) {
    HEAPF64[tempDoublePtr>>3] = $130;$138 = HEAP32[tempDoublePtr>>2]|0;
    $139 = HEAP32[tempDoublePtr+4>>2]|0;
    $140 = (_bitshift64Lshr(($138|0),($139|0),52)|0);
    $141 = tempRet0;
    $142 = $140 & 2047;
    $143 = (0 - ($142))|0;
    $144 = ($38|0)!=($143|0);
    $145 = $138 & 1;
    $146 = ($145|0)!=(0);
    $147 = (0)!=(0);
    $148 = $146 | $147;
    $149 = $144 ^ $148;
    if ($149) {
     HEAPF64[tempDoublePtr>>3] = $136;$150 = HEAP32[tempDoublePtr>>2]|0;
     $151 = HEAP32[tempDoublePtr+4>>2]|0;
     $152 = $150 ^ $138;
     $153 = $151 ^ $139;
     $154 = (_bitshift64Lshr(($152|0),($153|0),62)|0);
     $155 = tempRet0;
     $156 = $154 & 2;
     $157 = (_i64Add(($138|0),($139|0),1,0)|0);
     $158 = tempRet0;
     $159 = (_i64Subtract(($157|0),($158|0),($156|0),0)|0);
     $160 = tempRet0;
     HEAP32[tempDoublePtr>>2] = $159;HEAP32[tempDoublePtr+4>>2] = $160;$161 = +HEAPF64[tempDoublePtr>>3];
     $sum$sroa$0$0$i = $161;
    } else {
     $sum$sroa$0$0$i = $130;
    }
   } else {
    $sum$sroa$0$0$i = $130;
   }
   $162 = (+_scalbn($sum$sroa$0$0$i,$38));
   $$0 = $162;
   STACKTOP = sp;return (+$$0);
  }
 }
 $16 = $x * $y;
 $17 = $16 + $z;
 $$0 = $17;
 STACKTOP = sp;return (+$$0);
}
function _fmaf($x,$y,$z) {
 $x = +$x;
 $y = +$y;
 $z = +$z;
 var $$0 = 0.0, $$0$in = 0.0, $$off = 0, $0 = 0.0, $1 = 0.0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0.0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0.0;
 var $24 = 0.0, $25 = 0, $26 = 0, $27 = 0.0, $28 = 0.0, $29 = 0, $3 = 0.0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0.0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond5 = 0;
 var $vxy = 0.0, $vz = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $y;
 $2 = $0 * $1;
 $3 = $z;
 $4 = $2 + $3;
 HEAPF64[tempDoublePtr>>3] = $4;$5 = HEAP32[tempDoublePtr>>2]|0;
 $6 = HEAP32[tempDoublePtr+4>>2]|0;
 $7 = (_bitshift64Lshr(($5|0),($6|0),52)|0);
 $8 = tempRet0;
 $9 = $7 & 2047;
 $10 = $5 & 536870911;
 $11 = ($10|0)!=(268435456);
 $12 = (0)!=(0);
 $13 = $11 | $12;
 $14 = ($9|0)==(2047);
 $or$cond = $13 | $14;
 $15 = $4 - $2;
 $16 = $15 == $3;
 $or$cond5 = $or$cond | $16;
 if ($or$cond5) {
  label = 3;
 } else {
  $17 = (_fegetround()|0);
  $18 = ($17|0)==(0);
  if ($18) {
   (_fesetround(3072)|0);
   $vxy = $2;
   $27 = $vxy;
   $28 = $3 + $27;
   (_fesetround(0)|0);
   $29 = $4 == $28;
   if ($29) {
    HEAPF64[tempDoublePtr>>3] = $28;$30 = HEAP32[tempDoublePtr>>2]|0;
    $31 = HEAP32[tempDoublePtr+4>>2]|0;
    $32 = (_i64Add(($30|0),($31|0),1,0)|0);
    $33 = tempRet0;
    HEAP32[tempDoublePtr>>2] = $32;HEAP32[tempDoublePtr+4>>2] = $33;$34 = +HEAPF64[tempDoublePtr>>3];
    $$0$in = $34;
   } else {
    $$0$in = $28;
   }
  } else {
   label = 3;
  }
 }
 do {
  if ((label|0) == 3) {
   $$off = (($9) + -874)|0;
   $19 = ($$off>>>0)<(23);
   if ($19) {
    $20 = (_fetestexcept(32)|0);
    $21 = ($20|0)==(0);
    if ($21) {
     $$0$in = $4;
    } else {
     $vz = $z;
     $22 = $vz;
     $23 = $22;
     $24 = $2 + $23;
     $25 = (_fetestexcept(32)|0);
     $26 = ($25|0)==(0);
     if ($26) {
      $$0$in = $24;
      break;
     } else {
      $$0$in = $24;
      break;
     }
    }
   } else {
    $$0$in = $4;
   }
  }
 } while(0);
 $$0 = $$0$in;
 STACKTOP = sp;return (+$$0);
}
function _fmal($x,$y,$z) {
 $x = +$x;
 $y = +$y;
 $z = +$z;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_llvm_fma_f64((+$x),(+$y),(+$z)));
 STACKTOP = sp;return (+$0);
}
function _fmax($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0.0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = $1 & 2147483647;
 $3 = ($2>>>0)>(2146435072);
 $4 = ($0>>>0)>(0);
 $5 = ($2|0)==(2146435072);
 $6 = $5 & $4;
 $7 = $3 | $6;
 if ($7) {
  $$0 = $y;
  STACKTOP = sp;return (+$$0);
 }
 HEAPF64[tempDoublePtr>>3] = $y;$8 = HEAP32[tempDoublePtr>>2]|0;
 $9 = HEAP32[tempDoublePtr+4>>2]|0;
 $10 = $9 & 2147483647;
 $11 = ($10>>>0)>(2146435072);
 $12 = ($8>>>0)>(0);
 $13 = ($10|0)==(2146435072);
 $14 = $13 & $12;
 $15 = $11 | $14;
 if ($15) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $16 = (_bitshift64Lshr(($0|0),($1|0),63)|0);
 $17 = tempRet0;
 $18 = (_bitshift64Lshr(($8|0),($9|0),63)|0);
 $19 = tempRet0;
 $20 = ($16|0)==($18|0);
 if ($20) {
  $23 = $x < $y;
  $24 = $23 ? $y : $x;
  $$0 = $24;
  STACKTOP = sp;return (+$$0);
 } else {
  $21 = ($1|0)<(0);
  $22 = $21 ? $y : $x;
  $$0 = $22;
  STACKTOP = sp;return (+$$0);
 }
 return +(0.0);
}
function _fmaxf($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $$unshifted = 0, $0 = 0, $1 = 0, $10 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = ($1>>>0)>(2139095040);
 do {
  if ($2) {
   $$0 = $y;
  } else {
   $3 = (HEAPF32[tempDoublePtr>>2]=$y,HEAP32[tempDoublePtr>>2]|0);
   $4 = $3 & 2147483647;
   $5 = ($4>>>0)>(2139095040);
   if ($5) {
    $$0 = $x;
   } else {
    $$unshifted = $3 ^ $0;
    $6 = ($$unshifted|0)<(0);
    if ($6) {
     $7 = ($0|0)<(0);
     $8 = $7 ? $y : $x;
     $$0 = $8;
     break;
    } else {
     $9 = $x < $y;
     $10 = $9 ? $y : $x;
     $$0 = $10;
     break;
    }
   }
  }
 } while(0);
 STACKTOP = sp;return (+$$0);
}
function _fmaxl($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_fmax($x,$y));
 STACKTOP = sp;return (+$0);
}
function _fmin($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0.0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = $1 & 2147483647;
 $3 = ($2>>>0)>(2146435072);
 $4 = ($0>>>0)>(0);
 $5 = ($2|0)==(2146435072);
 $6 = $5 & $4;
 $7 = $3 | $6;
 if ($7) {
  $$0 = $y;
  STACKTOP = sp;return (+$$0);
 }
 HEAPF64[tempDoublePtr>>3] = $y;$8 = HEAP32[tempDoublePtr>>2]|0;
 $9 = HEAP32[tempDoublePtr+4>>2]|0;
 $10 = $9 & 2147483647;
 $11 = ($10>>>0)>(2146435072);
 $12 = ($8>>>0)>(0);
 $13 = ($10|0)==(2146435072);
 $14 = $13 & $12;
 $15 = $11 | $14;
 if ($15) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $16 = (_bitshift64Lshr(($0|0),($1|0),63)|0);
 $17 = tempRet0;
 $18 = (_bitshift64Lshr(($8|0),($9|0),63)|0);
 $19 = tempRet0;
 $20 = ($16|0)==($18|0);
 if ($20) {
  $23 = $x < $y;
  $24 = $23 ? $x : $y;
  $$0 = $24;
  STACKTOP = sp;return (+$$0);
 } else {
  $21 = ($1|0)<(0);
  $22 = $21 ? $x : $y;
  $$0 = $22;
  STACKTOP = sp;return (+$$0);
 }
 return +(0.0);
}
function _fminf($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $$unshifted = 0, $0 = 0, $1 = 0, $10 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = ($1>>>0)>(2139095040);
 do {
  if ($2) {
   $$0 = $y;
  } else {
   $3 = (HEAPF32[tempDoublePtr>>2]=$y,HEAP32[tempDoublePtr>>2]|0);
   $4 = $3 & 2147483647;
   $5 = ($4>>>0)>(2139095040);
   if ($5) {
    $$0 = $x;
   } else {
    $$unshifted = $3 ^ $0;
    $6 = ($$unshifted|0)<(0);
    if ($6) {
     $7 = ($0|0)<(0);
     $8 = $7 ? $x : $y;
     $$0 = $8;
     break;
    } else {
     $9 = $x < $y;
     $10 = $9 ? $x : $y;
     $$0 = $10;
     break;
    }
   }
  }
 } while(0);
 STACKTOP = sp;return (+$$0);
}
function _fminl($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_fmin($x,$y));
 STACKTOP = sp;return (+$0);
}
function _fmod($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $$lcssa10 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0;
 var $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0.0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0;
 var $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0;
 var $150 = 0, $151 = 0.0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0.0, $24 = 0.0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0.0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0;
 var $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0;
 var $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0.0, $ex$0$lcssa = 0;
 var $ex$026 = 0, $ex$1 = 0, $ex$2$lcssa = 0, $ex$212 = 0, $ex$3$lcssa = 0, $ex$33 = 0, $ey$0$lcssa = 0, $ey$020 = 0, $ey$1$ph = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 HEAPF64[tempDoublePtr>>3] = $y;$2 = HEAP32[tempDoublePtr>>2]|0;
 $3 = HEAP32[tempDoublePtr+4>>2]|0;
 $4 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $5 = tempRet0;
 $6 = $4 & 2047;
 $7 = (_bitshift64Lshr(($2|0),($3|0),52)|0);
 $8 = tempRet0;
 $9 = $7 & 2047;
 $10 = $1 & -2147483648;
 $11 = (_bitshift64Shl(($2|0),($3|0),1)|0);
 $12 = tempRet0;
 $13 = ($11|0)==(0);
 $14 = ($12|0)==(0);
 $15 = $13 & $14;
 if (!($15)) {
  $16 = $3 & 2147483647;
  $17 = ($16>>>0)>(2146435072);
  $18 = ($2>>>0)>(0);
  $19 = ($16|0)==(2146435072);
  $20 = $19 & $18;
  $21 = $17 | $20;
  $22 = ($6|0)==(2047);
  $or$cond = $21 | $22;
  if (!($or$cond)) {
   $25 = (_bitshift64Shl(($0|0),($1|0),1)|0);
   $26 = tempRet0;
   $27 = ($26>>>0)>($12>>>0);
   $28 = ($25>>>0)>($11>>>0);
   $29 = ($26|0)==($12|0);
   $30 = $29 & $28;
   $31 = $27 | $30;
   if (!($31)) {
    $32 = ($25|0)==($11|0);
    $33 = ($26|0)==($12|0);
    $34 = $32 & $33;
    if (!($34)) {
     $$0 = $x;
     STACKTOP = sp;return (+$$0);
    }
    $35 = $x * 0.0;
    $$0 = $35;
    STACKTOP = sp;return (+$$0);
   }
   $36 = ($6|0)==(0);
   if ($36) {
    $37 = (_bitshift64Shl(($0|0),($1|0),12)|0);
    $38 = tempRet0;
    $39 = ($38|0)>(-1);
    $40 = ($37>>>0)>(4294967295);
    $41 = ($38|0)==(-1);
    $42 = $41 & $40;
    $43 = $39 | $42;
    if ($43) {
     $45 = $37;$46 = $38;$ex$026 = 0;
     while(1) {
      $44 = (($ex$026) + -1)|0;
      $47 = (_bitshift64Shl(($45|0),($46|0),1)|0);
      $48 = tempRet0;
      $49 = ($48|0)>(-1);
      $50 = ($47>>>0)>(4294967295);
      $51 = ($48|0)==(-1);
      $52 = $51 & $50;
      $53 = $49 | $52;
      if ($53) {
       $45 = $47;$46 = $48;$ex$026 = $44;
      } else {
       $ex$0$lcssa = $44;
       break;
      }
     }
    } else {
     $ex$0$lcssa = 0;
    }
    $54 = (1 - ($ex$0$lcssa))|0;
    $55 = (_bitshift64Shl(($0|0),($1|0),($54|0))|0);
    $56 = tempRet0;
    $83 = $55;$84 = $56;$ex$1 = $ex$0$lcssa;
   } else {
    $57 = $1 & 1048575;
    $58 = $57 | 1048576;
    $83 = $0;$84 = $58;$ex$1 = $6;
   }
   $59 = ($9|0)==(0);
   if ($59) {
    $60 = (_bitshift64Shl(($2|0),($3|0),12)|0);
    $61 = tempRet0;
    $62 = ($61|0)>(-1);
    $63 = ($60>>>0)>(4294967295);
    $64 = ($61|0)==(-1);
    $65 = $64 & $63;
    $66 = $62 | $65;
    if ($66) {
     $68 = $60;$69 = $61;$ey$020 = 0;
     while(1) {
      $67 = (($ey$020) + -1)|0;
      $70 = (_bitshift64Shl(($68|0),($69|0),1)|0);
      $71 = tempRet0;
      $72 = ($71|0)>(-1);
      $73 = ($70>>>0)>(4294967295);
      $74 = ($71|0)==(-1);
      $75 = $74 & $73;
      $76 = $72 | $75;
      if ($76) {
       $68 = $70;$69 = $71;$ey$020 = $67;
      } else {
       $ey$0$lcssa = $67;
       break;
      }
     }
    } else {
     $ey$0$lcssa = 0;
    }
    $77 = (1 - ($ey$0$lcssa))|0;
    $78 = (_bitshift64Shl(($2|0),($3|0),($77|0))|0);
    $79 = tempRet0;
    $85 = $78;$86 = $79;$ey$1$ph = $ey$0$lcssa;
   } else {
    $80 = $3 & 1048575;
    $81 = $80 | 1048576;
    $85 = $2;$86 = $81;$ey$1$ph = $9;
   }
   $82 = ($ex$1|0)>($ey$1$ph|0);
   $87 = (_i64Subtract(($83|0),($84|0),($85|0),($86|0))|0);
   $88 = tempRet0;
   $89 = ($88|0)>(-1);
   $90 = ($87>>>0)>(4294967295);
   $91 = ($88|0)==(-1);
   $92 = $91 & $90;
   $93 = $89 | $92;
   L27: do {
    if ($82) {
     $152 = $93;$153 = $87;$154 = $88;$95 = $83;$97 = $84;$ex$212 = $ex$1;
     while(1) {
      if ($152) {
       $94 = ($95|0)==($85|0);
       $96 = ($97|0)==($86|0);
       $98 = $94 & $96;
       if ($98) {
        break;
       } else {
        $100 = $153;$101 = $154;
       }
      } else {
       $100 = $95;$101 = $97;
      }
      $102 = (_bitshift64Shl(($100|0),($101|0),1)|0);
      $103 = tempRet0;
      $104 = (($ex$212) + -1)|0;
      $105 = ($104|0)>($ey$1$ph|0);
      $106 = (_i64Subtract(($102|0),($103|0),($85|0),($86|0))|0);
      $107 = tempRet0;
      $108 = ($107|0)>(-1);
      $109 = ($106>>>0)>(4294967295);
      $110 = ($107|0)==(-1);
      $111 = $110 & $109;
      $112 = $108 | $111;
      if ($105) {
       $152 = $112;$153 = $106;$154 = $107;$95 = $102;$97 = $103;$ex$212 = $104;
      } else {
       $$lcssa10 = $112;$114 = $102;$116 = $103;$155 = $106;$156 = $107;$ex$2$lcssa = $104;
       break L27;
      }
     }
     $99 = $x * 0.0;
     $$0 = $99;
     STACKTOP = sp;return (+$$0);
    } else {
     $$lcssa10 = $93;$114 = $83;$116 = $84;$155 = $87;$156 = $88;$ex$2$lcssa = $ex$1;
    }
   } while(0);
   if ($$lcssa10) {
    $113 = ($114|0)==($85|0);
    $115 = ($116|0)==($86|0);
    $117 = $113 & $115;
    if ($117) {
     $125 = $x * 0.0;
     $$0 = $125;
     STACKTOP = sp;return (+$$0);
    } else {
     $119 = $156;$121 = $155;
    }
   } else {
    $119 = $116;$121 = $114;
   }
   $118 = ($119>>>0)<(1048576);
   $120 = ($121>>>0)<(0);
   $122 = ($119|0)==(1048576);
   $123 = $122 & $120;
   $124 = $118 | $123;
   if ($124) {
    $126 = $121;$127 = $119;$ex$33 = $ex$2$lcssa;
    while(1) {
     $128 = (_bitshift64Shl(($126|0),($127|0),1)|0);
     $129 = tempRet0;
     $130 = (($ex$33) + -1)|0;
     $131 = ($129>>>0)<(1048576);
     $132 = ($128>>>0)<(0);
     $133 = ($129|0)==(1048576);
     $134 = $133 & $132;
     $135 = $131 | $134;
     if ($135) {
      $126 = $128;$127 = $129;$ex$33 = $130;
     } else {
      $137 = $128;$138 = $129;$ex$3$lcssa = $130;
      break;
     }
    }
   } else {
    $137 = $121;$138 = $119;$ex$3$lcssa = $ex$2$lcssa;
   }
   $136 = ($ex$3$lcssa|0)>(0);
   if ($136) {
    $139 = (_i64Add(($137|0),($138|0),0,-1048576)|0);
    $140 = tempRet0;
    $141 = (_bitshift64Shl(($ex$3$lcssa|0),0,52)|0);
    $142 = tempRet0;
    $143 = $139 | $141;
    $144 = $140 | $142;
    $149 = $144;$150 = $143;
   } else {
    $145 = (1 - ($ex$3$lcssa))|0;
    $146 = (_bitshift64Lshr(($137|0),($138|0),($145|0))|0);
    $147 = tempRet0;
    $149 = $147;$150 = $146;
   }
   $148 = $149 | $10;
   HEAP32[tempDoublePtr>>2] = $150;HEAP32[tempDoublePtr+4>>2] = $148;$151 = +HEAPF64[tempDoublePtr>>3];
   $$0 = $151;
   STACKTOP = sp;return (+$$0);
  }
 }
 $23 = $x * $y;
 $24 = $23 / $23;
 $$0 = $24;
 STACKTOP = sp;return (+$$0);
}
function _fmodf($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $$lcssa = 0, $$lcssa9 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0.0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0.0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0.0, $62 = 0, $63 = 0, $7 = 0, $8 = 0, $9 = 0, $ex$0$lcssa = 0, $ex$025 = 0, $ex$1 = 0, $ex$2$lcssa = 0, $ex$211 = 0, $ex$3$lcssa = 0, $ex$32 = 0, $ey$0$lcssa = 0, $ey$019 = 0, $ey$1$ph = 0, $i$026 = 0, $i$120 = 0, $or$cond = 0;
 var $uxi$0 = 0, $uxi$1$lcssa = 0, $uxi$112 = 0, $uxi$2 = 0, $uxi$3$lcssa = 0, $uxi$3$ph = 0, $uxi$33 = 0, $uxi$4 = 0, $uy$sroa$0$0$ph = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = (HEAPF32[tempDoublePtr>>2]=$y,HEAP32[tempDoublePtr>>2]|0);
 $2 = $0 >>> 23;
 $3 = $2 & 255;
 $4 = $1 >>> 23;
 $5 = $4 & 255;
 $6 = $0 & -2147483648;
 $7 = $1 << 1;
 $8 = ($7|0)==(0);
 if (!($8)) {
  $9 = $1 & 2147483647;
  $10 = ($9>>>0)>(2139095040);
  $11 = ($3|0)==(255);
  $or$cond = $10 | $11;
  if (!($or$cond)) {
   $14 = $0 << 1;
   $15 = ($14>>>0)>($7>>>0);
   if (!($15)) {
    $16 = ($14|0)==($7|0);
    if (!($16)) {
     $$0 = $x;
     STACKTOP = sp;return (+$$0);
    }
    $17 = $x * 0.0;
    $$0 = $17;
    STACKTOP = sp;return (+$$0);
   }
   $18 = ($3|0)==(0);
   if ($18) {
    $19 = $0 << 9;
    $20 = ($19|0)>(-1);
    if ($20) {
     $ex$025 = 0;$i$026 = $19;
     while(1) {
      $21 = (($ex$025) + -1)|0;
      $22 = $i$026 << 1;
      $23 = ($22|0)>(-1);
      if ($23) {
       $ex$025 = $21;$i$026 = $22;
      } else {
       $ex$0$lcssa = $21;
       break;
      }
     }
    } else {
     $ex$0$lcssa = 0;
    }
    $24 = (1 - ($ex$0$lcssa))|0;
    $25 = $0 << $24;
    $ex$1 = $ex$0$lcssa;$uxi$0 = $25;
   } else {
    $26 = $0 & 8388607;
    $27 = $26 | 8388608;
    $ex$1 = $3;$uxi$0 = $27;
   }
   $28 = ($5|0)==(0);
   if ($28) {
    $29 = $1 << 9;
    $30 = ($29|0)>(-1);
    if ($30) {
     $ey$019 = 0;$i$120 = $29;
     while(1) {
      $31 = (($ey$019) + -1)|0;
      $32 = $i$120 << 1;
      $33 = ($32|0)>(-1);
      if ($33) {
       $ey$019 = $31;$i$120 = $32;
      } else {
       $ey$0$lcssa = $31;
       break;
      }
     }
    } else {
     $ey$0$lcssa = 0;
    }
    $34 = (1 - ($ey$0$lcssa))|0;
    $35 = $1 << $34;
    $ey$1$ph = $ey$0$lcssa;$uy$sroa$0$0$ph = $35;
   } else {
    $36 = $1 & 8388607;
    $37 = $36 | 8388608;
    $ey$1$ph = $5;$uy$sroa$0$0$ph = $37;
   }
   $38 = ($ex$1|0)>($ey$1$ph|0);
   $39 = (($uxi$0) - ($uy$sroa$0$0$ph))|0;
   $40 = ($39|0)>(-1);
   L27: do {
    if ($38) {
     $62 = $40;$63 = $39;$ex$211 = $ex$1;$uxi$112 = $uxi$0;
     while(1) {
      if ($62) {
       $41 = ($uxi$112|0)==($uy$sroa$0$0$ph|0);
       if ($41) {
        break;
       } else {
        $uxi$2 = $63;
       }
      } else {
       $uxi$2 = $uxi$112;
      }
      $43 = $uxi$2 << 1;
      $44 = (($ex$211) + -1)|0;
      $45 = ($44|0)>($ey$1$ph|0);
      $46 = (($43) - ($uy$sroa$0$0$ph))|0;
      $47 = ($46|0)>(-1);
      if ($45) {
       $62 = $47;$63 = $46;$ex$211 = $44;$uxi$112 = $43;
      } else {
       $$lcssa = $46;$$lcssa9 = $47;$ex$2$lcssa = $44;$uxi$1$lcssa = $43;
       break L27;
      }
     }
     $42 = $x * 0.0;
     $$0 = $42;
     STACKTOP = sp;return (+$$0);
    } else {
     $$lcssa = $39;$$lcssa9 = $40;$ex$2$lcssa = $ex$1;$uxi$1$lcssa = $uxi$0;
    }
   } while(0);
   if ($$lcssa9) {
    $48 = ($uxi$1$lcssa|0)==($uy$sroa$0$0$ph|0);
    if ($48) {
     $50 = $x * 0.0;
     $$0 = $50;
     STACKTOP = sp;return (+$$0);
    } else {
     $uxi$3$ph = $$lcssa;
    }
   } else {
    $uxi$3$ph = $uxi$1$lcssa;
   }
   $49 = ($uxi$3$ph>>>0)<(8388608);
   if ($49) {
    $ex$32 = $ex$2$lcssa;$uxi$33 = $uxi$3$ph;
    while(1) {
     $51 = $uxi$33 << 1;
     $52 = (($ex$32) + -1)|0;
     $53 = ($51>>>0)<(8388608);
     if ($53) {
      $ex$32 = $52;$uxi$33 = $51;
     } else {
      $ex$3$lcssa = $52;$uxi$3$lcssa = $51;
      break;
     }
    }
   } else {
    $ex$3$lcssa = $ex$2$lcssa;$uxi$3$lcssa = $uxi$3$ph;
   }
   $54 = ($ex$3$lcssa|0)>(0);
   if ($54) {
    $55 = (($uxi$3$lcssa) + -8388608)|0;
    $56 = $ex$3$lcssa << 23;
    $57 = $55 | $56;
    $uxi$4 = $57;
   } else {
    $58 = (1 - ($ex$3$lcssa))|0;
    $59 = $uxi$3$lcssa >>> $58;
    $uxi$4 = $59;
   }
   $60 = $uxi$4 | $6;
   $61 = (HEAP32[tempDoublePtr>>2]=$60,+HEAPF32[tempDoublePtr>>2]);
   $$0 = $61;
   STACKTOP = sp;return (+$$0);
  }
 }
 $12 = $x * $y;
 $13 = $12 / $12;
 $$0 = $13;
 STACKTOP = sp;return (+$$0);
}
function _fmodl($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_fmod($x,$y));
 STACKTOP = sp;return (+$0);
}
function _frexp($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $$0 = 0.0, $$01 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, $storemerge = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 if ((($4|0) == 0)) {
  $5 = $x != 0.0;
  if ($5) {
   $6 = $x * 1.8446744073709552E+19;
   $7 = (+_frexp($6,$e));
   $8 = HEAP32[$e>>2]|0;
   $9 = (($8) + -64)|0;
   $$01 = $7;$storemerge = $9;
  } else {
   $$01 = $x;$storemerge = 0;
  }
  HEAP32[$e>>2] = $storemerge;
  $$0 = $$01;
  STACKTOP = sp;return (+$$0);
 } else if ((($4|0) == 2047)) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 } else {
  $10 = (($4) + -1022)|0;
  HEAP32[$e>>2] = $10;
  $11 = $1 & -2146435073;
  $12 = $11 | 1071644672;
  HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $12;$13 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $13;
  STACKTOP = sp;return (+$$0);
 }
 return +(0.0);
}
function _frexpf($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $$0 = 0.0, $$01 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $storemerge = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 >>> 23;
 $2 = $1 & 255;
 if ((($2|0) == 0)) {
  $3 = $x != 0.0;
  if ($3) {
   $4 = $x * 1.8446744073709552E+19;
   $5 = (+_frexpf($4,$e));
   $6 = HEAP32[$e>>2]|0;
   $7 = (($6) + -64)|0;
   $$01 = $5;$storemerge = $7;
  } else {
   $$01 = $x;$storemerge = 0;
  }
  HEAP32[$e>>2] = $storemerge;
  $$0 = $$01;
  STACKTOP = sp;return (+$$0);
 } else if ((($2|0) == 255)) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 } else {
  $8 = (($2) + -126)|0;
  HEAP32[$e>>2] = $8;
  $9 = $0 & -2139095041;
  $10 = $9 | 1056964608;
  $11 = (HEAP32[tempDoublePtr>>2]=$10,+HEAPF32[tempDoublePtr>>2]);
  $$0 = $11;
  STACKTOP = sp;return (+$$0);
 }
 return +(0.0);
}
function _frexpl($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_frexp($x,$e));
 STACKTOP = sp;return (+$0);
}
function _hypot($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $$01 = 0.0, $$02 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0.0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0;
 var $42 = 0.0, $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0;
 var $60 = 0.0, $61 = 0.0, $62 = 0.0, $63 = 0.0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $z$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 HEAPF64[tempDoublePtr>>3] = $y;$2 = HEAP32[tempDoublePtr>>2]|0;
 $3 = HEAP32[tempDoublePtr+4>>2]|0;
 $4 = $1 & 2147483647;
 $5 = $3 & 2147483647;
 $6 = ($4>>>0)<($5>>>0);
 $7 = ($0>>>0)<($2>>>0);
 $8 = ($4|0)==($5|0);
 $9 = $8 & $7;
 $10 = $6 | $9;
 $11 = $10 ? $2 : $0;
 $12 = $10 ? $5 : $4;
 $13 = $10 ? $0 : $2;
 $14 = $10 ? $4 : $5;
 $15 = (_bitshift64Lshr(($11|0),($12|0),52)|0);
 $16 = tempRet0;
 $17 = (_bitshift64Lshr(($13|0),($14|0),52)|0);
 $18 = tempRet0;
 HEAP32[tempDoublePtr>>2] = $11;HEAP32[tempDoublePtr+4>>2] = $12;$19 = +HEAPF64[tempDoublePtr>>3];
 HEAP32[tempDoublePtr>>2] = $13;HEAP32[tempDoublePtr+4>>2] = $14;$20 = +HEAPF64[tempDoublePtr>>3];
 $21 = ($17|0)==(2047);
 if ($21) {
  $$0 = $20;
  STACKTOP = sp;return (+$$0);
 }
 $22 = ($15|0)==(2047);
 $23 = ($13|0)==(0);
 $24 = ($14|0)==(0);
 $25 = $23 & $24;
 $or$cond = $22 | $25;
 if ($or$cond) {
  $$0 = $19;
  STACKTOP = sp;return (+$$0);
 }
 $26 = (($15) - ($17))|0;
 $27 = ($26|0)>(64);
 if ($27) {
  $28 = $19 + $20;
  $$0 = $28;
  STACKTOP = sp;return (+$$0);
 }
 $29 = ($15>>>0)>(1533);
 if ($29) {
  $30 = $19 * 1.9010915662951598E-211;
  $31 = $20 * 1.9010915662951598E-211;
  $$01 = $30;$$02 = $31;$z$0 = 5.2601359015483735E+210;
 } else {
  $32 = ($17>>>0)<(573);
  if ($32) {
   $33 = $19 * 5.2601359015483735E+210;
   $34 = $20 * 5.2601359015483735E+210;
   $$01 = $33;$$02 = $34;$z$0 = 1.9010915662951598E-211;
  } else {
   $$01 = $19;$$02 = $20;$z$0 = 1.0;
  }
 }
 $35 = $$01 * 134217729.0;
 $36 = $$01 - $35;
 $37 = $35 + $36;
 $38 = $$01 - $37;
 $39 = $$01 * $$01;
 $40 = $37 * $37;
 $41 = $40 - $39;
 $42 = $37 * 2.0;
 $43 = $42 * $38;
 $44 = $41 + $43;
 $45 = $38 * $38;
 $46 = $45 + $44;
 $47 = $$02 * 134217729.0;
 $48 = $$02 - $47;
 $49 = $47 + $48;
 $50 = $$02 - $49;
 $51 = $$02 * $$02;
 $52 = $49 * $49;
 $53 = $52 - $51;
 $54 = $49 * 2.0;
 $55 = $54 * $50;
 $56 = $53 + $55;
 $57 = $50 * $50;
 $58 = $57 + $56;
 $59 = $58 + $46;
 $60 = $51 + $59;
 $61 = $39 + $60;
 $62 = (+Math_sqrt((+$61)));
 $63 = $z$0 * $62;
 $$0 = $63;
 STACKTOP = sp;return (+$$0);
}
function _hypotf($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$ = 0, $$0 = 0.0, $$01 = 0.0, $$02 = 0.0, $$3 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0;
 var $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0, $26 = 0.0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0.0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond5 = 0, $z$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = (HEAPF32[tempDoublePtr>>2]=$y,HEAP32[tempDoublePtr>>2]|0);
 $2 = $0 & 2147483647;
 $3 = $1 & 2147483647;
 $4 = ($2>>>0)<($3>>>0);
 $$ = $4 ? $3 : $2;
 $$3 = $4 ? $2 : $3;
 $5 = (HEAP32[tempDoublePtr>>2]=$$,+HEAPF32[tempDoublePtr>>2]);
 $6 = (HEAP32[tempDoublePtr>>2]=$$3,+HEAPF32[tempDoublePtr>>2]);
 $7 = ($$3|0)==(2139095040);
 if ($7) {
  $$0 = $6;
  STACKTOP = sp;return (+$$0);
 }
 $8 = ($$>>>0)>(2139095039);
 $9 = ($$3|0)==(0);
 $or$cond = $8 | $9;
 $10 = (($$) - ($$3))|0;
 $11 = ($10>>>0)>(209715199);
 $or$cond5 = $or$cond | $11;
 if ($or$cond5) {
  $12 = $5 + $6;
  $$0 = $12;
  STACKTOP = sp;return (+$$0);
 }
 $13 = ($$>>>0)>(1568669695);
 if ($13) {
  $14 = $5 * 8.0779356694631609E-28;
  $15 = $6 * 8.0779356694631609E-28;
  $$01 = $15;$$02 = $14;$z$0 = 1.2379400392853803E+27;
 } else {
  $16 = ($$3>>>0)<(562036736);
  if ($16) {
   $17 = $5 * 1.2379400392853803E+27;
   $18 = $6 * 1.2379400392853803E+27;
   $$01 = $18;$$02 = $17;$z$0 = 8.0779356694631609E-28;
  } else {
   $$01 = $6;$$02 = $5;$z$0 = 1.0;
  }
 }
 $19 = $$02;
 $20 = $19 * $19;
 $21 = $$01;
 $22 = $21 * $21;
 $23 = $20 + $22;
 $24 = $23;
 $25 = (+Math_sqrt((+$24)));
 $26 = $z$0 * $25;
 $$0 = $26;
 STACKTOP = sp;return (+$$0);
}
function _hypotl($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_hypot($x,$y));
 STACKTOP = sp;return (+$0);
}
function _llrint($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_rint($x));
 $1 = (~~$0)>>>0;
 $2 = +Math_abs($0) >= 1.0 ? $0 > 0.0 ? (Math_min(+Math_floor($0 / 4294967296.0), 4294967295.0) | 0) >>> 0 : ~~+Math_ceil(($0 - +(~~$0 >>> 0)) / 4294967296.0) >>> 0 : 0;
 tempRet0 = $2;
 STACKTOP = sp;return ($1|0);
}
function _llrintf($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_rintf($x));
 $1 = (~~$0)>>>0;
 $2 = +Math_abs($0) >= 1.0 ? $0 > 0.0 ? (Math_min(+Math_floor($0 / 4294967296.0), 4294967295.0) | 0) >>> 0 : ~~+Math_ceil(($0 - +(~~$0 >>> 0)) / 4294967296.0) >>> 0 : 0;
 tempRet0 = $2;
 STACKTOP = sp;return ($1|0);
}
function _llrintl($x) {
 $x = +$x;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_llrint($x)|0);
 $1 = tempRet0;
 tempRet0 = $1;
 STACKTOP = sp;return ($0|0);
}
function _llround($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_round($x));
 $1 = (~~$0)>>>0;
 $2 = +Math_abs($0) >= 1.0 ? $0 > 0.0 ? (Math_min(+Math_floor($0 / 4294967296.0), 4294967295.0) | 0) >>> 0 : ~~+Math_ceil(($0 - +(~~$0 >>> 0)) / 4294967296.0) >>> 0 : 0;
 tempRet0 = $2;
 STACKTOP = sp;return ($1|0);
}
function _llroundf($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_roundf($x));
 $1 = (~~$0)>>>0;
 $2 = +Math_abs($0) >= 1.0 ? $0 > 0.0 ? (Math_min(+Math_floor($0 / 4294967296.0), 4294967295.0) | 0) >>> 0 : ~~+Math_ceil(($0 - +(~~$0 >>> 0)) / 4294967296.0) >>> 0 : 0;
 tempRet0 = $2;
 STACKTOP = sp;return ($1|0);
}
function _llroundl($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_roundl($x));
 $1 = (~~$0)>>>0;
 $2 = +Math_abs($0) >= 1.0 ? $0 > 0.0 ? (Math_min(+Math_floor($0 / 4294967296.0), 4294967295.0) | 0) >>> 0 : ~~+Math_ceil(($0 - +(~~$0 >>> 0)) / 4294967296.0) >>> 0 : 0;
 tempRet0 = $2;
 STACKTOP = sp;return ($1|0);
}
function _log10($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0;
 var $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0, $49 = 0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0.0;
 var $62 = 0.0, $63 = 0.0, $64 = 0.0, $65 = 0.0, $66 = 0.0, $67 = 0.0, $68 = 0.0, $69 = 0.0, $7 = 0, $70 = 0, $8 = 0.0, $9 = 0.0, $hx$0 = 0, $k$0 = 0, $or$cond = 0, $or$cond4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = ($1>>>0)<(1048576);
 $3 = ($1|0)<(0);
 $or$cond = $2 | $3;
 do {
  if ($or$cond) {
   $4 = $1 & 2147483647;
   $5 = ($0|0)==(0);
   $6 = ($4|0)==(0);
   $7 = $5 & $6;
   if ($7) {
    $8 = $x * $x;
    $9 = -1.0 / $8;
    $$0 = $9;
    STACKTOP = sp;return (+$$0);
   }
   if (!($3)) {
    $12 = $x * 18014398509481984.0;
    HEAPF64[tempDoublePtr>>3] = $12;$13 = HEAP32[tempDoublePtr>>2]|0;
    $14 = HEAP32[tempDoublePtr+4>>2]|0;
    $25 = $13;$70 = $14;$hx$0 = $14;$k$0 = -1077;
    break;
   }
   $10 = $x - $x;
   $11 = $10 / 0.0;
   $$0 = $11;
   STACKTOP = sp;return (+$$0);
  } else {
   $15 = ($1>>>0)>(2146435071);
   if ($15) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   }
   $16 = ($1|0)==(1072693248);
   $17 = ($0|0)==(0);
   $18 = (0)==(0);
   $19 = $17 & $18;
   $or$cond4 = $16 & $19;
   if ($or$cond4) {
    $$0 = 0.0;
    STACKTOP = sp;return (+$$0);
   } else {
    $25 = $0;$70 = $1;$hx$0 = $1;$k$0 = -1023;
   }
  }
 } while(0);
 $20 = (($hx$0) + 614242)|0;
 $21 = $20 >>> 20;
 $22 = (($k$0) + ($21))|0;
 $23 = $20 & 1048575;
 $24 = (($23) + 1072079006)|0;
 HEAP32[tempDoublePtr>>2] = $25;HEAP32[tempDoublePtr+4>>2] = $24;$26 = +HEAPF64[tempDoublePtr>>3];
 $27 = $26 + -1.0;
 $28 = $27 * 0.5;
 $29 = $27 * $28;
 $30 = $27 + 2.0;
 $31 = $27 / $30;
 $32 = $31 * $31;
 $33 = $32 * $32;
 $34 = $33 * 0.15313837699209373;
 $35 = $34 + 0.22222198432149784;
 $36 = $33 * $35;
 $37 = $36 + 0.39999999999409419;
 $38 = $33 * $37;
 $39 = $33 * 0.14798198605116586;
 $40 = $39 + 0.1818357216161805;
 $41 = $33 * $40;
 $42 = $41 + 0.28571428743662391;
 $43 = $33 * $42;
 $44 = $43 + 0.66666666666667351;
 $45 = $32 * $44;
 $46 = $38 + $45;
 $47 = $27 - $29;
 HEAPF64[tempDoublePtr>>3] = $47;$48 = HEAP32[tempDoublePtr>>2]|0;
 $49 = HEAP32[tempDoublePtr+4>>2]|0;
 HEAP32[tempDoublePtr>>2] = 0;HEAP32[tempDoublePtr+4>>2] = $49;$50 = +HEAPF64[tempDoublePtr>>3];
 $51 = $27 - $50;
 $52 = $51 - $29;
 $53 = $29 + $46;
 $54 = $31 * $53;
 $55 = $54 + $52;
 $56 = $50 * 0.43429448187816888;
 $57 = (+($22|0));
 $58 = $57 * 0.30102999566361177;
 $59 = $57 * 3.6942390771589308E-13;
 $60 = $50 + $55;
 $61 = $60 * 2.5082946711645275E-11;
 $62 = $59 + $61;
 $63 = $55 * 0.43429448187816888;
 $64 = $63 + $62;
 $65 = $58 + $56;
 $66 = $58 - $65;
 $67 = $56 + $66;
 $68 = $67 + $64;
 $69 = $65 + $68;
 $$0 = $69;
 STACKTOP = sp;return (+$$0);
}
function _log10f($x) {
 $x = +$x;
 var $$0 = 0.0, $$mask = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0;
 var $25 = 0.0, $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0, $34 = 0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0.0, $40 = 0.0, $41 = 0.0, $42 = 0.0;
 var $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0.0, $50 = 0.0, $51 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0, $ix$0 = 0, $k$0 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = ($0>>>0)<(8388608);
 $2 = ($0|0)<(0);
 $or$cond = $1 | $2;
 do {
  if ($or$cond) {
   $$mask = $0 & 2147483647;
   $3 = ($$mask|0)==(0);
   if ($3) {
    $4 = $x * $x;
    $5 = -1.0 / $4;
    $$0 = $5;
    STACKTOP = sp;return (+$$0);
   }
   if (!($2)) {
    $8 = $x * 33554432.0;
    $9 = (HEAPF32[tempDoublePtr>>2]=$8,HEAP32[tempDoublePtr>>2]|0);
    $ix$0 = $9;$k$0 = -152;
    break;
   }
   $6 = $x - $x;
   $7 = $6 / 0.0;
   $$0 = $7;
   STACKTOP = sp;return (+$$0);
  } else {
   $10 = ($0>>>0)>(2139095039);
   if ($10) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   }
   $11 = ($0|0)==(1065353216);
   if ($11) {
    $$0 = 0.0;
    STACKTOP = sp;return (+$$0);
   } else {
    $ix$0 = $0;$k$0 = -127;
   }
  }
 } while(0);
 $12 = (($ix$0) + 4913933)|0;
 $13 = $12 >>> 23;
 $14 = (($k$0) + ($13))|0;
 $15 = $12 & 8388607;
 $16 = (($15) + 1060439283)|0;
 $17 = (HEAP32[tempDoublePtr>>2]=$16,+HEAPF32[tempDoublePtr>>2]);
 $18 = $17 + -1.0;
 $19 = $18 + 2.0;
 $20 = $18 / $19;
 $21 = $20 * $20;
 $22 = $21 * $21;
 $23 = $22 * 0.24279078841209412;
 $24 = $23 + 0.40000972151756287;
 $25 = $22 * $24;
 $26 = $22 * 0.28498786687850952;
 $27 = $26 + 0.66666662693023682;
 $28 = $21 * $27;
 $29 = $28 + $25;
 $30 = $18 * 0.5;
 $31 = $18 * $30;
 $32 = $18 - $31;
 $33 = (HEAPF32[tempDoublePtr>>2]=$32,HEAP32[tempDoublePtr>>2]|0);
 $34 = $33 & -4096;
 $35 = (HEAP32[tempDoublePtr>>2]=$34,+HEAPF32[tempDoublePtr>>2]);
 $36 = $18 - $35;
 $37 = $36 - $31;
 $38 = $31 + $29;
 $39 = $20 * $38;
 $40 = $39 + $37;
 $41 = (+($14|0));
 $42 = $41 * 7.9034151667656261E-7;
 $43 = $35 + $40;
 $44 = $43 * -3.1689971365267411E-5;
 $45 = $42 + $44;
 $46 = $40 * 0.434326171875;
 $47 = $46 + $45;
 $48 = $35 * 0.434326171875;
 $49 = $48 + $47;
 $50 = $41 * 0.30102920532226563;
 $51 = $50 + $49;
 $$0 = $51;
 STACKTOP = sp;return (+$$0);
}
function _log10l($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_log10($x));
 STACKTOP = sp;return (+$0);
}
function _log1p($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0.0;
 var $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0, $32 = 0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0;
 var $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0.0, $60 = 0.0, $61 = 0.0;
 var $62 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0, $__x = 0.0, $c$1 = 0.0, $c$2 = 0.0, $f$1 = 0.0, $k$1 = 0.0, $or$cond = 0, $phitmp = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = ($1>>>0)<(1071284858);
 $3 = ($1|0)<(0);
 $or$cond = $2 | $3;
 do {
  if ($or$cond) {
   $4 = ($1>>>0)>(3220176895);
   if ($4) {
    $5 = $x == -1.0;
    if ($5) {
     $6 = $x / 0.0;
     $$0 = $6;
     STACKTOP = sp;return (+$$0);
    } else {
     $7 = $x - $x;
     $8 = $7 / 0.0;
     $$0 = $8;
     STACKTOP = sp;return (+$$0);
    }
   }
   $9 = (_bitshift64Shl(($1|0),0,1)|0);
   $10 = tempRet0;
   $11 = ($9>>>0)<(2034237440);
   if (!($11)) {
    $15 = ($1>>>0)<(3218259653);
    if ($15) {
     $c$2 = 0.0;$f$1 = $x;$k$1 = 0.0;
     break;
    } else {
     label = 11;
     break;
    }
   }
   $12 = $1 & 2146435072;
   $13 = ($12|0)==(0);
   if (!($13)) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   }
   $14 = $x;
   $__x = $14;
   $$0 = $x;
   STACKTOP = sp;return (+$$0);
  } else {
   $16 = ($1>>>0)>(2146435071);
   if ($16) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   } else {
    label = 11;
   }
  }
 } while(0);
 if ((label|0) == 11) {
  $17 = $x + 1.0;
  HEAPF64[tempDoublePtr>>3] = $17;$18 = HEAP32[tempDoublePtr>>2]|0;
  $19 = HEAP32[tempDoublePtr+4>>2]|0;
  $20 = (($19) + 614242)|0;
  $21 = $20 >>> 20;
  $22 = (($21) + -1023)|0;
  $23 = ($22|0)<(54);
  if ($23) {
   $24 = ($22|0)>(1);
   if ($24) {
    $25 = $17 - $x;
    $26 = 1.0 - $25;
    $30 = $26;
   } else {
    $27 = $17 + -1.0;
    $28 = $x - $27;
    $30 = $28;
   }
   $29 = $30 / $17;
   $c$1 = $29;
  } else {
   $c$1 = 0.0;
  }
  $31 = $20 & 1048575;
  $32 = (($31) + 1072079006)|0;
  HEAP32[tempDoublePtr>>2] = $18;HEAP32[tempDoublePtr+4>>2] = $32;$33 = +HEAPF64[tempDoublePtr>>3];
  $34 = $33 + -1.0;
  $phitmp = (+($22|0));
  $c$2 = $c$1;$f$1 = $34;$k$1 = $phitmp;
 }
 $35 = $f$1 * 0.5;
 $36 = $f$1 * $35;
 $37 = $f$1 + 2.0;
 $38 = $f$1 / $37;
 $39 = $38 * $38;
 $40 = $39 * $39;
 $41 = $40 * 0.15313837699209373;
 $42 = $41 + 0.22222198432149784;
 $43 = $40 * $42;
 $44 = $43 + 0.39999999999409419;
 $45 = $40 * $44;
 $46 = $40 * 0.14798198605116586;
 $47 = $46 + 0.1818357216161805;
 $48 = $40 * $47;
 $49 = $48 + 0.28571428743662391;
 $50 = $40 * $49;
 $51 = $50 + 0.66666666666667351;
 $52 = $39 * $51;
 $53 = $45 + $52;
 $54 = $36 + $53;
 $55 = $38 * $54;
 $56 = $k$1 * 1.9082149292705877E-10;
 $57 = $c$2 + $56;
 $58 = $57 + $55;
 $59 = $58 - $36;
 $60 = $f$1 + $59;
 $61 = $k$1 * 0.69314718036912382;
 $62 = $61 + $60;
 $$0 = $62;
 STACKTOP = sp;return (+$$0);
}
function _log1pf($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0;
 var $26 = 0.0, $27 = 0.0, $28 = 0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0;
 var $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0.0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, $__x = 0.0, $c$1 = 0.0, $c$2 = 0.0, $f$1 = 0.0, $k$1 = 0.0;
 var $or$cond = 0, $phitmp = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = ($0>>>0)<(1054086096);
 $2 = ($0|0)<(0);
 $or$cond = $1 | $2;
 do {
  if ($or$cond) {
   $3 = ($0>>>0)>(3212836863);
   if ($3) {
    $4 = $x == -1.0;
    if ($4) {
     $5 = $x / 0.0;
     $$0 = $5;
     STACKTOP = sp;return (+$$0);
    } else {
     $6 = $x - $x;
     $7 = $6 / 0.0;
     $$0 = $7;
     STACKTOP = sp;return (+$$0);
    }
   }
   $8 = $0 << 1;
   $9 = ($8>>>0)<(1728053248);
   if (!($9)) {
    $13 = ($0>>>0)<(3197498906);
    if ($13) {
     $c$2 = 0.0;$f$1 = $x;$k$1 = 0.0;
     break;
    } else {
     label = 11;
     break;
    }
   }
   $10 = $0 & 2139095040;
   $11 = ($10|0)==(0);
   if (!($11)) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   }
   $12 = $x * $x;
   $__x = $12;
   $$0 = $x;
   STACKTOP = sp;return (+$$0);
  } else {
   $14 = ($0>>>0)>(2139095039);
   if ($14) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   } else {
    label = 11;
   }
  }
 } while(0);
 if ((label|0) == 11) {
  $15 = $x + 1.0;
  $16 = (HEAPF32[tempDoublePtr>>2]=$15,HEAP32[tempDoublePtr>>2]|0);
  $17 = (($16) + 4913933)|0;
  $18 = $17 >>> 23;
  $19 = (($18) + -127)|0;
  $20 = ($19|0)<(25);
  if ($20) {
   $21 = ($19|0)>(1);
   if ($21) {
    $22 = $15 - $x;
    $23 = 1.0 - $22;
    $27 = $23;
   } else {
    $24 = $15 + -1.0;
    $25 = $x - $24;
    $27 = $25;
   }
   $26 = $27 / $15;
   $c$1 = $26;
  } else {
   $c$1 = 0.0;
  }
  $28 = $17 & 8388607;
  $29 = (($28) + 1060439283)|0;
  $30 = (HEAP32[tempDoublePtr>>2]=$29,+HEAPF32[tempDoublePtr>>2]);
  $31 = $30 + -1.0;
  $phitmp = (+($19|0));
  $c$2 = $c$1;$f$1 = $31;$k$1 = $phitmp;
 }
 $32 = $f$1 + 2.0;
 $33 = $f$1 / $32;
 $34 = $33 * $33;
 $35 = $34 * $34;
 $36 = $35 * 0.24279078841209412;
 $37 = $36 + 0.40000972151756287;
 $38 = $35 * $37;
 $39 = $35 * 0.28498786687850952;
 $40 = $39 + 0.66666662693023682;
 $41 = $34 * $40;
 $42 = $41 + $38;
 $43 = $f$1 * 0.5;
 $44 = $f$1 * $43;
 $45 = $44 + $42;
 $46 = $33 * $45;
 $47 = $k$1 * 9.0580006144591607E-6;
 $48 = $c$2 + $47;
 $49 = $48 + $46;
 $50 = $49 - $44;
 $51 = $f$1 + $50;
 $52 = $k$1 * 0.69313812255859375;
 $53 = $52 + $51;
 $$0 = $53;
 STACKTOP = sp;return (+$$0);
}
function _log1pl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_log1p($x));
 STACKTOP = sp;return (+$0);
}
function _log2($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0;
 var $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0, $49 = 0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0.0;
 var $62 = 0.0, $63 = 0.0, $64 = 0.0, $65 = 0.0, $66 = 0.0, $67 = 0, $7 = 0, $8 = 0.0, $9 = 0.0, $hx$0 = 0, $k$0 = 0, $or$cond = 0, $or$cond4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = ($1>>>0)<(1048576);
 $3 = ($1|0)<(0);
 $or$cond = $2 | $3;
 do {
  if ($or$cond) {
   $4 = $1 & 2147483647;
   $5 = ($0|0)==(0);
   $6 = ($4|0)==(0);
   $7 = $5 & $6;
   if ($7) {
    $8 = $x * $x;
    $9 = -1.0 / $8;
    $$0 = $9;
    STACKTOP = sp;return (+$$0);
   }
   if (!($3)) {
    $12 = $x * 18014398509481984.0;
    HEAPF64[tempDoublePtr>>3] = $12;$13 = HEAP32[tempDoublePtr>>2]|0;
    $14 = HEAP32[tempDoublePtr+4>>2]|0;
    $25 = $13;$67 = $14;$hx$0 = $14;$k$0 = -1077;
    break;
   }
   $10 = $x - $x;
   $11 = $10 / 0.0;
   $$0 = $11;
   STACKTOP = sp;return (+$$0);
  } else {
   $15 = ($1>>>0)>(2146435071);
   if ($15) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   }
   $16 = ($1|0)==(1072693248);
   $17 = ($0|0)==(0);
   $18 = (0)==(0);
   $19 = $17 & $18;
   $or$cond4 = $16 & $19;
   if ($or$cond4) {
    $$0 = 0.0;
    STACKTOP = sp;return (+$$0);
   } else {
    $25 = $0;$67 = $1;$hx$0 = $1;$k$0 = -1023;
   }
  }
 } while(0);
 $20 = (($hx$0) + 614242)|0;
 $21 = $20 >>> 20;
 $22 = (($k$0) + ($21))|0;
 $23 = $20 & 1048575;
 $24 = (($23) + 1072079006)|0;
 HEAP32[tempDoublePtr>>2] = $25;HEAP32[tempDoublePtr+4>>2] = $24;$26 = +HEAPF64[tempDoublePtr>>3];
 $27 = $26 + -1.0;
 $28 = $27 * 0.5;
 $29 = $27 * $28;
 $30 = $27 + 2.0;
 $31 = $27 / $30;
 $32 = $31 * $31;
 $33 = $32 * $32;
 $34 = $33 * 0.15313837699209373;
 $35 = $34 + 0.22222198432149784;
 $36 = $33 * $35;
 $37 = $36 + 0.39999999999409419;
 $38 = $33 * $37;
 $39 = $33 * 0.14798198605116586;
 $40 = $39 + 0.1818357216161805;
 $41 = $33 * $40;
 $42 = $41 + 0.28571428743662391;
 $43 = $33 * $42;
 $44 = $43 + 0.66666666666667351;
 $45 = $32 * $44;
 $46 = $38 + $45;
 $47 = $27 - $29;
 HEAPF64[tempDoublePtr>>3] = $47;$48 = HEAP32[tempDoublePtr>>2]|0;
 $49 = HEAP32[tempDoublePtr+4>>2]|0;
 HEAP32[tempDoublePtr>>2] = 0;HEAP32[tempDoublePtr+4>>2] = $49;$50 = +HEAPF64[tempDoublePtr>>3];
 $51 = $27 - $50;
 $52 = $51 - $29;
 $53 = $29 + $46;
 $54 = $31 * $53;
 $55 = $54 + $52;
 $56 = $50 * 1.4426950407214463;
 $57 = $50 + $55;
 $58 = $57 * 1.6751713164886512E-10;
 $59 = $55 * 1.4426950407214463;
 $60 = $59 + $58;
 $61 = (+($22|0));
 $62 = $61 + $56;
 $63 = $61 - $62;
 $64 = $56 + $63;
 $65 = $64 + $60;
 $66 = $62 + $65;
 $$0 = $66;
 STACKTOP = sp;return (+$$0);
}
function _log2f($x) {
 $x = +$x;
 var $$0 = 0.0, $$mask = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0;
 var $25 = 0.0, $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0, $34 = 0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0.0, $40 = 0.0, $41 = 0.0, $42 = 0.0;
 var $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0, $ix$0 = 0, $k$0 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = ($0>>>0)<(8388608);
 $2 = ($0|0)<(0);
 $or$cond = $1 | $2;
 do {
  if ($or$cond) {
   $$mask = $0 & 2147483647;
   $3 = ($$mask|0)==(0);
   if ($3) {
    $4 = $x * $x;
    $5 = -1.0 / $4;
    $$0 = $5;
    STACKTOP = sp;return (+$$0);
   }
   if (!($2)) {
    $8 = $x * 33554432.0;
    $9 = (HEAPF32[tempDoublePtr>>2]=$8,HEAP32[tempDoublePtr>>2]|0);
    $ix$0 = $9;$k$0 = -152;
    break;
   }
   $6 = $x - $x;
   $7 = $6 / 0.0;
   $$0 = $7;
   STACKTOP = sp;return (+$$0);
  } else {
   $10 = ($0>>>0)>(2139095039);
   if ($10) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   }
   $11 = ($0|0)==(1065353216);
   if ($11) {
    $$0 = 0.0;
    STACKTOP = sp;return (+$$0);
   } else {
    $ix$0 = $0;$k$0 = -127;
   }
  }
 } while(0);
 $12 = (($ix$0) + 4913933)|0;
 $13 = $12 >>> 23;
 $14 = (($k$0) + ($13))|0;
 $15 = $12 & 8388607;
 $16 = (($15) + 1060439283)|0;
 $17 = (HEAP32[tempDoublePtr>>2]=$16,+HEAPF32[tempDoublePtr>>2]);
 $18 = $17 + -1.0;
 $19 = $18 + 2.0;
 $20 = $18 / $19;
 $21 = $20 * $20;
 $22 = $21 * $21;
 $23 = $22 * 0.24279078841209412;
 $24 = $23 + 0.40000972151756287;
 $25 = $22 * $24;
 $26 = $22 * 0.28498786687850952;
 $27 = $26 + 0.66666662693023682;
 $28 = $21 * $27;
 $29 = $28 + $25;
 $30 = $18 * 0.5;
 $31 = $18 * $30;
 $32 = $18 - $31;
 $33 = (HEAPF32[tempDoublePtr>>2]=$32,HEAP32[tempDoublePtr>>2]|0);
 $34 = $33 & -4096;
 $35 = (HEAP32[tempDoublePtr>>2]=$34,+HEAPF32[tempDoublePtr>>2]);
 $36 = $18 - $35;
 $37 = $36 - $31;
 $38 = $31 + $29;
 $39 = $20 * $38;
 $40 = $39 + $37;
 $41 = $35 + $40;
 $42 = $41 * -1.7605285393074155E-4;
 $43 = $40 * 1.44287109375;
 $44 = $43 + $42;
 $45 = $35 * 1.44287109375;
 $46 = $45 + $44;
 $47 = (+($14|0));
 $48 = $47 + $46;
 $$0 = $48;
 STACKTOP = sp;return (+$$0);
}
function _log2l($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_log2($x));
 STACKTOP = sp;return (+$0);
}
function _lrint($x) {
 $x = +$x;
 var $0 = 0, $1 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_fetestexcept(32)|0);
 $1 = (+_rint($x));
 $2 = ($0|0)==(0);
 if ($2) {
  $3 = $1 > 2147483647.0;
  $4 = $1 < -2147483648.0;
  $or$cond = $3 | $4;
  if ($or$cond) {
  }
 }
 $5 = (~~(($1)));
 STACKTOP = sp;return ($5|0);
}
function _lrintf($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_rintf($x));
 $1 = (~~(($0)));
 STACKTOP = sp;return ($1|0);
}
function _lrintl($x) {
 $x = +$x;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_lrint($x)|0);
 STACKTOP = sp;return ($0|0);
}
function _lround($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_round($x));
 $1 = (~~(($0)));
 STACKTOP = sp;return ($1|0);
}
function _lroundf($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_roundf($x));
 $1 = (~~(($0)));
 STACKTOP = sp;return ($1|0);
}
function _lroundl($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_roundl($x));
 $1 = (~~(($0)));
 STACKTOP = sp;return ($1|0);
}
function _modf($x,$iptr) {
 $x = +$x;
 $iptr = $iptr|0;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0.0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0.0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0.0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 $5 = (($4) + -1023)|0;
 $6 = ($5|0)>(51);
 if ($6) {
  HEAPF64[$iptr>>3] = $x;
  $7 = ($5|0)!=(1024);
  $8 = $1 & 1048575;
  $9 = ($0|0)==(0);
  $10 = ($8|0)==(0);
  $11 = $9 & $10;
  $or$cond = $7 | $11;
  if (!($or$cond)) {
   $$0 = $x;
   STACKTOP = sp;return (+$$0);
  }
  $12 = $1 & -2147483648;
  HEAP32[tempDoublePtr>>2] = 0;HEAP32[tempDoublePtr+4>>2] = $12;$13 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $13;
  STACKTOP = sp;return (+$$0);
 }
 $14 = ($5|0)<(0);
 if ($14) {
  $15 = $1 & -2147483648;
  HEAP32[tempDoublePtr>>2] = 0;HEAP32[tempDoublePtr+4>>2] = $15;$16 = +HEAPF64[tempDoublePtr>>3];
  HEAPF64[$iptr>>3] = $16;
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $17 = (_bitshift64Lshr(-1,1048575,($5|0))|0);
 $18 = tempRet0;
 $19 = $17 & $0;
 $20 = $18 & $1;
 $21 = ($19|0)==(0);
 $22 = ($20|0)==(0);
 $23 = $21 & $22;
 if ($23) {
  HEAPF64[$iptr>>3] = $x;
  $24 = $1 & -2147483648;
  HEAP32[tempDoublePtr>>2] = 0;HEAP32[tempDoublePtr+4>>2] = $24;$25 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $25;
  STACKTOP = sp;return (+$$0);
 } else {
  $26 = $17 ^ -1;
  $27 = $18 ^ -1;
  $28 = $0 & $26;
  $29 = $1 & $27;
  HEAP32[tempDoublePtr>>2] = $28;HEAP32[tempDoublePtr+4>>2] = $29;$30 = +HEAPF64[tempDoublePtr>>3];
  HEAPF64[$iptr>>3] = $30;
  $31 = $x - $30;
  $$0 = $31;
  STACKTOP = sp;return (+$$0);
 }
 return +(0.0);
}
function _modff($x,$iptr) {
 $x = +$x;
 $iptr = $iptr|0;
 var $$0 = 0.0, $$mask = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0.0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0.0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 >>> 23;
 $2 = $1 & 255;
 $3 = (($2) + -127)|0;
 $4 = ($3|0)>(22);
 if ($4) {
  HEAPF32[$iptr>>2] = $x;
  $5 = ($3|0)!=(128);
  $$mask = $0 & 8388607;
  $6 = ($$mask|0)==(0);
  $or$cond = $5 | $6;
  if (!($or$cond)) {
   $$0 = $x;
   STACKTOP = sp;return (+$$0);
  }
  $7 = $0 & -2147483648;
  $8 = (HEAP32[tempDoublePtr>>2]=$7,+HEAPF32[tempDoublePtr>>2]);
  $$0 = $8;
  STACKTOP = sp;return (+$$0);
 }
 $9 = ($3|0)<(0);
 if ($9) {
  $10 = $0 & -2147483648;
  $11 = (HEAP32[tempDoublePtr>>2]=$10,+HEAPF32[tempDoublePtr>>2]);
  HEAPF32[$iptr>>2] = $11;
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $12 = 8388607 >>> $3;
 $13 = $12 & $0;
 $14 = ($13|0)==(0);
 if ($14) {
  HEAPF32[$iptr>>2] = $x;
  $15 = $0 & -2147483648;
  $16 = (HEAP32[tempDoublePtr>>2]=$15,+HEAPF32[tempDoublePtr>>2]);
  $$0 = $16;
  STACKTOP = sp;return (+$$0);
 } else {
  $17 = $12 ^ -1;
  $18 = $0 & $17;
  $19 = (HEAP32[tempDoublePtr>>2]=$18,+HEAPF32[tempDoublePtr>>2]);
  HEAPF32[$iptr>>2] = $19;
  $20 = $x - $19;
  $$0 = $20;
  STACKTOP = sp;return (+$$0);
 }
 return +(0.0);
}
function _modfl($x,$iptr) {
 $x = +$x;
 $iptr = $iptr|0;
 var $0 = 0.0, $1 = 0.0, $d = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $d = sp;
 $0 = (+_modf($x,$d));
 $1 = +HEAPF64[$d>>3];
 HEAPF64[$iptr>>3] = $1;
 STACKTOP = sp;return (+$0);
}
function _nan($s) {
 $s = $s|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = sp;return +nan;
}
function _nanf($s) {
 $s = $s|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = sp;return +nan;
}
function _nanl($s) {
 $s = $s|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = sp;return +nan;
}
function _nearbyint($x) {
 $x = +$x;
 var $0 = 0, $1 = 0.0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_fetestexcept(32)|0);
 $1 = (+_rint($x));
 $2 = ($0|0)==(0);
 if ($2) {
 }
 STACKTOP = sp;return (+$1);
}
function _nearbyintf($x) {
 $x = +$x;
 var $0 = 0, $1 = 0.0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_fetestexcept(32)|0);
 $1 = (+_rintf($x));
 $2 = ($0|0)==(0);
 if ($2) {
 }
 STACKTOP = sp;return (+$1);
}
function _nearbyintl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_nearbyint($x));
 STACKTOP = sp;return (+$0);
}
function _remainder($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, $q = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $q = sp;
 $0 = (+_remquo((+$x),(+$y),($q|0)));
 STACKTOP = sp;return (+$0);
}
function _remainderf($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, $q = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $q = sp;
 $0 = (+_remquof((+$x),(+$y),($q|0)));
 STACKTOP = sp;return (+$0);
}
function _remainderl($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_remainder($x,$y));
 STACKTOP = sp;return (+$0);
}
function _rint($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0.0, $y$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = $1 & 2146435072;
 $3 = ($2>>>0)>(1126170624);
 $4 = (0)>(0);
 $5 = ($2|0)==(1126170624);
 $6 = $5 & $4;
 $7 = $3 | $6;
 if ($7) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $8 = ($1|0)<(0);
 if ($8) {
  $9 = $x + -4503599627370496.0;
  $10 = $9 + 4503599627370496.0;
  $y$0 = $10;
 } else {
  $11 = $x + 4503599627370496.0;
  $12 = $11 + -4503599627370496.0;
  $y$0 = $12;
 }
 $13 = $y$0 == 0.0;
 if (!($13)) {
  $$0 = $y$0;
  STACKTOP = sp;return (+$$0);
 }
 $14 = $8 ? -0.0 : 0.0;
 $$0 = $14;
 STACKTOP = sp;return (+$$0);
}
function _rintf($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0.0, $y$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2130706432;
 $2 = ($1>>>0)>(1249902592);
 if ($2) {
  $$0 = $x;
 } else {
  $3 = ($0|0)<(0);
  if ($3) {
   $4 = $x + -8388608.0;
   $5 = $4 + 8388608.0;
   $y$0 = $5;
  } else {
   $6 = $x + 8388608.0;
   $7 = $6 + -8388608.0;
   $y$0 = $7;
  }
  $8 = $y$0 == 0.0;
  if ($8) {
   $9 = $3 ? -0.0 : 0.0;
   $$0 = $9;
  } else {
   $$0 = $y$0;
  }
 }
 STACKTOP = sp;return (+$$0);
}
function _rintl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_rint($x));
 STACKTOP = sp;return (+$0);
}
function _round($x) {
 $x = +$x;
 var $$0 = 0.0, $$01 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0;
 var $8 = 0, $9 = 0.0, $__x = 0.0, $y$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 $5 = ($4>>>0)>(1074);
 if ($5) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $6 = ($1|0)<(0);
 if ($6) {
  $7 = -$x;
  $$01 = $7;
 } else {
  $$01 = $x;
 }
 $8 = ($4>>>0)<(1022);
 $9 = $$01 + 4503599627370496.0;
 if ($8) {
  $__x = $9;
  $10 = $x * 0.0;
  $$0 = $10;
  STACKTOP = sp;return (+$$0);
 }
 $11 = $9 + -4503599627370496.0;
 $12 = $11 - $$01;
 $13 = $12 > 0.5;
 if ($13) {
  $14 = $$01 + $12;
  $15 = $14 + -1.0;
  $y$0 = $15;
 } else {
  $16 = !($12 <= -0.5);
  $17 = $$01 + $12;
  if ($16) {
   $y$0 = $17;
  } else {
   $18 = $17 + 1.0;
   $y$0 = $18;
  }
 }
 if (!($6)) {
  $$0 = $y$0;
  STACKTOP = sp;return (+$$0);
 }
 $19 = -$y$0;
 $$0 = $19;
 STACKTOP = sp;return (+$$0);
}
function _roundf($x) {
 $x = +$x;
 var $$0 = 0.0, $$01 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0, $7 = 0.0, $8 = 0.0, $9 = 0.0;
 var $__x = 0.0, $y$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 >>> 23;
 $2 = $1 & 255;
 $3 = ($2>>>0)>(149);
 do {
  if ($3) {
   $$0 = $x;
  } else {
   $4 = ($0|0)<(0);
   if ($4) {
    $5 = -$x;
    $$01 = $5;
   } else {
    $$01 = $x;
   }
   $6 = ($2>>>0)<(126);
   $7 = $$01 + 8388608.0;
   if ($6) {
    $__x = $7;
    $8 = $x * 0.0;
    $$0 = $8;
    break;
   }
   $9 = $7 + -8388608.0;
   $10 = $9 - $$01;
   $11 = $10 > 0.5;
   if ($11) {
    $12 = $$01 + $10;
    $13 = $12 + -1.0;
    $y$0 = $13;
   } else {
    $14 = !($10 <= -0.5);
    $15 = $$01 + $10;
    if ($14) {
     $y$0 = $15;
    } else {
     $16 = $15 + 1.0;
     $y$0 = $16;
    }
   }
   if ($4) {
    $17 = -$y$0;
    $$0 = $17;
   } else {
    $$0 = $y$0;
   }
  }
 } while(0);
 STACKTOP = sp;return (+$$0);
}
function _roundl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_round($x));
 STACKTOP = sp;return (+$0);
}
function _scalbn($x,$n) {
 $x = +$x;
 $n = $n|0;
 var $$ = 0, $$0 = 0, $$1 = 0, $0 = 0, $1 = 0.0, $10 = 0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0.0, $9 = 0, $y$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n|0)>(1023);
 if ($0) {
  $1 = $x * 8.9884656743115795E+307;
  $2 = (($n) + -1023)|0;
  $3 = ($2|0)>(1023);
  if ($3) {
   $4 = $1 * 8.9884656743115795E+307;
   $5 = (($n) + -2046)|0;
   $6 = ($5|0)>(1023);
   $$ = $6 ? 1023 : $5;
   $$0 = $$;$y$0 = $4;
  } else {
   $$0 = $2;$y$0 = $1;
  }
 } else {
  $7 = ($n|0)<(-1022);
  if ($7) {
   $8 = $x * 2.2250738585072014E-308;
   $9 = (($n) + 1022)|0;
   $10 = ($9|0)<(-1022);
   if ($10) {
    $11 = $8 * 2.2250738585072014E-308;
    $12 = (($n) + 2044)|0;
    $13 = ($12|0)<(-1022);
    $$1 = $13 ? -1022 : $12;
    $$0 = $$1;$y$0 = $11;
   } else {
    $$0 = $9;$y$0 = $8;
   }
  } else {
   $$0 = $n;$y$0 = $x;
  }
 }
 $14 = (($$0) + 1023)|0;
 $15 = (_bitshift64Shl(($14|0),0,52)|0);
 $16 = tempRet0;
 HEAP32[tempDoublePtr>>2] = $15;HEAP32[tempDoublePtr+4>>2] = $16;$17 = +HEAPF64[tempDoublePtr>>3];
 $18 = $y$0 * $17;
 STACKTOP = sp;return (+$18);
}
function _scalbnl($x,$n) {
 $x = +$x;
 $n = $n|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_scalbn($x,$n));
 STACKTOP = sp;return (+$0);
}
function _sincos($x,$s,$c) {
 $x = +$x;
 $s = $s|0;
 $c = $c|0;
 var $0 = 0.0, $1 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+Math_sin((+$x)));
 HEAPF64[$s>>3] = $0;
 $1 = (+Math_cos((+$x)));
 HEAPF64[$c>>3] = $1;
 STACKTOP = sp;return;
}
function _sincosf($x,$sin,$cos) {
 $x = +$x;
 $sin = $sin|0;
 $cos = $cos|0;
 var $0 = 0.0, $1 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+Math_sin((+$x)));
 HEAPF32[$sin>>2] = $0;
 $1 = (+Math_cos((+$x)));
 HEAPF32[$cos>>2] = $1;
 STACKTOP = sp;return;
}
function _sincosl($x,$sin,$cos) {
 $x = +$x;
 $sin = $sin|0;
 $cos = $cos|0;
 var $0 = 0.0, $1 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+Math_sin((+$x)));
 HEAPF64[$sin>>3] = $0;
 $1 = (+Math_cos((+$x)));
 HEAPF64[$cos>>3] = $1;
 STACKTOP = sp;return;
}
function _sinh($x) {
 $x = +$x;
 var $$ = 0.0, $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $3 = 0, $4 = 0.0, $5 = 0;
 var $6 = 0.0, $7 = 0, $8 = 0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = ($1|0)<(0);
 $$ = $2 ? -0.5 : 0.5;
 $3 = $1 & 2147483647;
 HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $3;$4 = +HEAPF64[tempDoublePtr>>3];
 $5 = ($3>>>0)<(1082535490);
 if (!($5)) {
  $19 = $$ * 2.0;
  $20 = (+___expo2($4));
  $21 = $19 * $20;
  $$0 = $21;
  STACKTOP = sp;return (+$$0);
 }
 $6 = (+_expm1($4));
 $7 = ($3>>>0)<(1072693248);
 if (!($7)) {
  $15 = $6 + 1.0;
  $16 = $6 / $15;
  $17 = $6 + $16;
  $18 = $$ * $17;
  $$0 = $18;
  STACKTOP = sp;return (+$$0);
 }
 $8 = ($3>>>0)<(1045430272);
 if ($8) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $9 = $6 * 2.0;
 $10 = $6 * $6;
 $11 = $6 + 1.0;
 $12 = $10 / $11;
 $13 = $9 - $12;
 $14 = $$ * $13;
 $$0 = $14;
 STACKTOP = sp;return (+$$0);
}
function _sinhf($x) {
 $x = +$x;
 var $$ = 0.0, $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $3 = 0.0, $4 = 0, $5 = 0.0, $6 = 0;
 var $7 = 0, $8 = 0.0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = ($0|0)<(0);
 $$ = $1 ? -0.5 : 0.5;
 $2 = $0 & 2147483647;
 $3 = (HEAP32[tempDoublePtr>>2]=$2,+HEAPF32[tempDoublePtr>>2]);
 $4 = ($2>>>0)<(1118925335);
 if (!($4)) {
  $18 = $$ * 2.0;
  $19 = (+___expo2f($3));
  $20 = $18 * $19;
  $$0 = $20;
  STACKTOP = sp;return (+$$0);
 }
 $5 = (+_expm1f($3));
 $6 = ($2>>>0)<(1065353216);
 if (!($6)) {
  $14 = $5 + 1.0;
  $15 = $5 / $14;
  $16 = $5 + $15;
  $17 = $$ * $16;
  $$0 = $17;
  STACKTOP = sp;return (+$$0);
 }
 $7 = ($2>>>0)<(964689920);
 if ($7) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $8 = $5 * 2.0;
 $9 = $5 * $5;
 $10 = $5 + 1.0;
 $11 = $9 / $10;
 $12 = $8 - $11;
 $13 = $$ * $12;
 $$0 = $13;
 STACKTOP = sp;return (+$$0);
}
function _sinhl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_sinh($x));
 STACKTOP = sp;return (+$0);
}
function _tanh($x) {
 $x = +$x;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0, $26 = 0.0;
 var $27 = 0.0, $3 = 0.0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0.0, $__x = 0.0, $t$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = $1 & 2147483647;
 HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $2;$3 = +HEAPF64[tempDoublePtr>>3];
 $4 = ($2>>>0)>(1071748074);
 do {
  if ($4) {
   $5 = ($2>>>0)>(1077149696);
   if ($5) {
    $6 = 0.0 / $3;
    $7 = 1.0 - $6;
    $t$0 = $7;
    break;
   } else {
    $8 = $3 * 2.0;
    $9 = (+_expm1($8));
    $10 = $9 + 2.0;
    $11 = 2.0 / $10;
    $12 = 1.0 - $11;
    $t$0 = $12;
    break;
   }
  } else {
   $13 = ($2>>>0)>(1070618798);
   if ($13) {
    $14 = $3 * 2.0;
    $15 = (+_expm1($14));
    $16 = $15 + 2.0;
    $17 = $15 / $16;
    $t$0 = $17;
    break;
   }
   $18 = ($2>>>0)>(1048575);
   if ($18) {
    $19 = $3 * -2.0;
    $20 = (+_expm1($19));
    $21 = -$20;
    $22 = $20 + 2.0;
    $23 = $21 / $22;
    $t$0 = $23;
    break;
   } else {
    $24 = $3;
    $__x = $24;
    $t$0 = $3;
    break;
   }
  }
 } while(0);
 $25 = ($1|0)<(0);
 if (!($25)) {
  $27 = $t$0;
  STACKTOP = sp;return (+$27);
 }
 $26 = -$t$0;
 $27 = $26;
 STACKTOP = sp;return (+$27);
}
function _tanhf($x) {
 $x = +$x;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0, $25 = 0.0, $26 = 0.0;
 var $3 = 0, $4 = 0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0.0, $__x = 0.0, $t$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = (HEAP32[tempDoublePtr>>2]=$1,+HEAPF32[tempDoublePtr>>2]);
 $3 = ($1>>>0)>(1057791828);
 do {
  if ($3) {
   $4 = ($1>>>0)>(1092616192);
   if ($4) {
    $5 = 0.0 / $2;
    $6 = $5 + 1.0;
    $t$0 = $6;
    break;
   } else {
    $7 = $2 * 2.0;
    $8 = (+_expm1f($7));
    $9 = $8 + 2.0;
    $10 = 2.0 / $9;
    $11 = 1.0 - $10;
    $t$0 = $11;
    break;
   }
  } else {
   $12 = ($1>>>0)>(1048757624);
   if ($12) {
    $13 = $2 * 2.0;
    $14 = (+_expm1f($13));
    $15 = $14 + 2.0;
    $16 = $14 / $15;
    $t$0 = $16;
    break;
   }
   $17 = ($1>>>0)>(8388607);
   if ($17) {
    $18 = $2 * -2.0;
    $19 = (+_expm1f($18));
    $20 = -$19;
    $21 = $19 + 2.0;
    $22 = $20 / $21;
    $t$0 = $22;
    break;
   } else {
    $23 = $2 * $2;
    $__x = $23;
    $t$0 = $2;
    break;
   }
  }
 } while(0);
 $24 = ($0|0)<(0);
 if (!($24)) {
  $26 = $t$0;
  STACKTOP = sp;return (+$26);
 }
 $25 = -$t$0;
 $26 = $25;
 STACKTOP = sp;return (+$26);
}
function _tanhl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_tanh($x));
 STACKTOP = sp;return (+$0);
}
function _trunc($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $__x = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 $5 = (($4) + -1011)|0;
 $6 = ($5|0)>(63);
 if ($6) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $7 = ($5|0)<(12);
 $8 = (_bitshift64Lshr(-1,-1,($5|0))|0);
 $9 = tempRet0;
 $10 = $7 ? -1 : $8;
 $11 = $7 ? 2147483647 : $9;
 $12 = $10 & $0;
 $13 = $11 & $1;
 $14 = ($12|0)==(0);
 $15 = ($13|0)==(0);
 $16 = $14 & $15;
 if ($16) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $17 = $x + 1.3292279957849159E+36;
 $__x = $17;
 $18 = $10 ^ -1;
 $19 = $11 ^ -1;
 $20 = $0 & $18;
 $21 = $1 & $19;
 HEAP32[tempDoublePtr>>2] = $20;HEAP32[tempDoublePtr+4>>2] = $21;$22 = +HEAPF64[tempDoublePtr>>3];
 $$0 = $22;
 STACKTOP = sp;return (+$$0);
}
function _truncf($x) {
 $x = +$x;
 var $$0 = 0.0, $$op = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0.0, $__x = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 >>> 23;
 $2 = $1 & 255;
 $3 = (($2) + -118)|0;
 $4 = ($3|0)>(31);
 if ($4) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $5 = ($3|0)<(9);
 $$op = -1 >>> $3;
 $6 = $5 ? 2147483647 : $$op;
 $7 = $6 & $0;
 $8 = ($7|0)==(0);
 if ($8) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $9 = $x + 1.3292279957849159E+36;
 $__x = $9;
 $10 = $6 ^ -1;
 $11 = $0 & $10;
 $12 = (HEAP32[tempDoublePtr>>2]=$11,+HEAPF32[tempDoublePtr>>2]);
 $$0 = $12;
 STACKTOP = sp;return (+$$0);
}
function _truncl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_trunc($x));
 STACKTOP = sp;return (+$0);
}
function _wctomb($s,$wc) {
 $s = $s|0;
 $wc = $wc|0;
 var $$0 = 0, $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 if ($0) {
  $$0 = 0;
 } else {
  $1 = (_wcrtomb($s,$wc,0)|0);
  $$0 = $1;
 }
 STACKTOP = sp;return ($$0|0);
}
function _wcrtomb($s,$wc,$st) {
 $s = $s|0;
 $wc = $wc|0;
 $st = $st|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 if ($0) {
  $$0 = 1;
  STACKTOP = sp;return ($$0|0);
 }
 $1 = ($wc>>>0)<(128);
 if ($1) {
  $2 = $wc&255;
  HEAP8[$s>>0] = $2;
  $$0 = 1;
  STACKTOP = sp;return ($$0|0);
 }
 $3 = ($wc>>>0)<(2048);
 if ($3) {
  $4 = $wc >>> 6;
  $5 = $4 | 192;
  $6 = $5&255;
  $7 = (($s) + 1|0);
  HEAP8[$s>>0] = $6;
  $8 = $wc & 63;
  $9 = $8 | 128;
  $10 = $9&255;
  HEAP8[$7>>0] = $10;
  $$0 = 2;
  STACKTOP = sp;return ($$0|0);
 }
 $11 = ($wc>>>0)<(55296);
 $12 = $wc & -8192;
 $13 = ($12|0)==(57344);
 $or$cond = $11 | $13;
 if ($or$cond) {
  $14 = $wc >>> 12;
  $15 = $14 | 224;
  $16 = $15&255;
  $17 = (($s) + 1|0);
  HEAP8[$s>>0] = $16;
  $18 = $wc >>> 6;
  $19 = $18 & 63;
  $20 = $19 | 128;
  $21 = $20&255;
  $22 = (($s) + 2|0);
  HEAP8[$17>>0] = $21;
  $23 = $wc & 63;
  $24 = $23 | 128;
  $25 = $24&255;
  HEAP8[$22>>0] = $25;
  $$0 = 3;
  STACKTOP = sp;return ($$0|0);
 }
 $26 = (($wc) + -65536)|0;
 $27 = ($26>>>0)<(1048576);
 if ($27) {
  $28 = $wc >>> 18;
  $29 = $28 | 240;
  $30 = $29&255;
  $31 = (($s) + 1|0);
  HEAP8[$s>>0] = $30;
  $32 = $wc >>> 12;
  $33 = $32 & 63;
  $34 = $33 | 128;
  $35 = $34&255;
  $36 = (($s) + 2|0);
  HEAP8[$31>>0] = $35;
  $37 = $wc >>> 6;
  $38 = $37 & 63;
  $39 = $38 | 128;
  $40 = $39&255;
  $41 = (($s) + 3|0);
  HEAP8[$36>>0] = $40;
  $42 = $wc & 63;
  $43 = $42 | 128;
  $44 = $43&255;
  HEAP8[$41>>0] = $44;
  $$0 = 4;
  STACKTOP = sp;return ($$0|0);
 } else {
  $45 = (___errno_location()|0);
  HEAP32[$45>>2] = 84;
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function ___rand48_step($xi,$lc) {
 $xi = $xi|0;
 $lc = $lc|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = HEAP16[$xi>>1]|0;
 $1 = $0&65535;
 $2 = (($xi) + 2|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 $5 = $4 << 16;
 $6 = $5 | $1;
 $7 = ($6|0)<(0);
 $8 = $7 << 31 >> 31;
 $9 = (($xi) + 4|0);
 $10 = HEAP16[$9>>1]|0;
 $11 = $10&65535;
 $12 = $8 | $11;
 $13 = HEAP16[$lc>>1]|0;
 $14 = $13&65535;
 $15 = (($lc) + 2|0);
 $16 = HEAP16[$15>>1]|0;
 $17 = $16&65535;
 $18 = $17 << 16;
 $19 = $18 | $14;
 $20 = ($19|0)<(0);
 $21 = $20 << 31 >> 31;
 $22 = (($lc) + 4|0);
 $23 = HEAP16[$22>>1]|0;
 $24 = $23&65535;
 $25 = $21 | $24;
 $26 = (___muldi3(($19|0),($25|0),($6|0),($12|0))|0);
 $27 = tempRet0;
 $28 = (($lc) + 6|0);
 $29 = HEAP16[$28>>1]|0;
 $30 = $29&65535;
 $31 = (_i64Add(($26|0),($27|0),($30|0),0)|0);
 $32 = tempRet0;
 $33 = $31&65535;
 HEAP16[$xi>>1] = $33;
 $34 = (_bitshift64Lshr(($31|0),($32|0),16)|0);
 $35 = tempRet0;
 $36 = $34&65535;
 HEAP16[$2>>1] = $36;
 $37 = $32&65535;
 HEAP16[$9>>1] = $37;
 $38 = $32 & 65535;
 tempRet0 = $38;
 STACKTOP = sp;return ($31|0);
}
function _erand48($s) {
 $s = $s|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___rand48_step($s,((5712 + 6|0)))|0);
 $1 = tempRet0;
 $2 = (_bitshift64Shl(($0|0),($1|0),4)|0);
 $3 = tempRet0;
 $4 = $3 | 1072693248;
 HEAP32[tempDoublePtr>>2] = $2;HEAP32[tempDoublePtr+4>>2] = $4;$5 = +HEAPF64[tempDoublePtr>>3];
 $6 = $5 + -1.0;
 STACKTOP = sp;return (+$6);
}
function _drand48() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___rand48_step(5712,((5712 + 6|0)))|0);
 $1 = tempRet0;
 $2 = (_bitshift64Shl(($0|0),($1|0),4)|0);
 $3 = tempRet0;
 $4 = $3 | 1072693248;
 HEAP32[tempDoublePtr>>2] = $2;HEAP32[tempDoublePtr+4>>2] = $4;$5 = +HEAPF64[tempDoublePtr>>3];
 $6 = $5 + -1.0;
 STACKTOP = sp;return (+$6);
}
function _lcong48($p) {
 $p = $p|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 ;HEAP16[5712+0>>1]=HEAP16[$p+0>>1]|0;HEAP16[5712+2>>1]=HEAP16[$p+2>>1]|0;HEAP16[5712+4>>1]=HEAP16[$p+4>>1]|0;HEAP16[5712+6>>1]=HEAP16[$p+6>>1]|0;HEAP16[5712+8>>1]=HEAP16[$p+8>>1]|0;HEAP16[5712+10>>1]=HEAP16[$p+10>>1]|0;HEAP16[5712+12>>1]=HEAP16[$p+12>>1]|0;
 STACKTOP = sp;return;
}
function _nrand48($s) {
 $s = $s|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___rand48_step($s,((5712 + 6|0)))|0);
 $1 = tempRet0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),17)|0);
 $3 = tempRet0;
 STACKTOP = sp;return ($2|0);
}
function _lrand48() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___rand48_step(5712,((5712 + 6|0)))|0);
 $1 = tempRet0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),17)|0);
 $3 = tempRet0;
 STACKTOP = sp;return ($2|0);
}
function _jrand48($s) {
 $s = $s|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___rand48_step($s,((5712 + 6|0)))|0);
 $1 = tempRet0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),16)|0);
 $3 = tempRet0;
 STACKTOP = sp;return ($2|0);
}
function _mrand48() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___rand48_step(5712,((5712 + 6|0)))|0);
 $1 = tempRet0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),16)|0);
 $3 = tempRet0;
 STACKTOP = sp;return ($2|0);
}
function _rand_r($seed) {
 $seed = $seed|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$seed>>2]|0;
 $1 = Math_imul($0, 1103515245)|0;
 $2 = (($1) + 12345)|0;
 HEAP32[$seed>>2] = $2;
 $3 = $2 >>> 11;
 $4 = $3 ^ $2;
 $5 = $4 << 7;
 $6 = $5 & -1658038656;
 $7 = $6 ^ $4;
 $8 = $7 << 15;
 $9 = $8 & -272236544;
 $10 = $9 ^ $7;
 $11 = $10 >>> 18;
 $12 = $11 ^ $10;
 $13 = $12 >>> 1;
 STACKTOP = sp;return ($13|0);
}
function _srand($s) {
 $s = $s|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($s) + -1)|0;
 $1 = 5728;
 $2 = $1;
 HEAP32[$2>>2] = $0;
 $3 = (($1) + 4)|0;
 $4 = $3;
 HEAP32[$4>>2] = 0;
 STACKTOP = sp;return;
}
function _rand() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = 5728;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = (($0) + 4)|0;
 $4 = $3;
 $5 = HEAP32[$4>>2]|0;
 $6 = (___muldi3(($2|0),($5|0),1284865837,1481765933)|0);
 $7 = tempRet0;
 $8 = (_i64Add(($6|0),($7|0),1,0)|0);
 $9 = tempRet0;
 $10 = 5728;
 $11 = $10;
 HEAP32[$11>>2] = $8;
 $12 = (($10) + 4)|0;
 $13 = $12;
 HEAP32[$13>>2] = $9;
 $14 = (_bitshift64Lshr(($8|0),($9|0),33)|0);
 $15 = tempRet0;
 STACKTOP = sp;return ($14|0);
}
function _srandom($seed) {
 $seed = $seed|0;
 var $$pre$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $k$01$i = 0;
 var $phitmp$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 ___lock((5736|0));
 $0 = HEAP32[5744>>2]|0;
 if ((($0|0) == 31)) {
  HEAP32[5768>>2] = 3;
  HEAP32[5760>>2] = 0;
  label = 6;
 } else if ((($0|0) == 0)) {
  $1 = HEAP32[5752>>2]|0;
  HEAP32[$1>>2] = $seed;
  ___unlock((5736|0));
  STACKTOP = sp;return;
 } else {
  $2 = ($0|0)==(7);
  $phitmp$i = $2 ? 3 : 1;
  HEAP32[5768>>2] = $phitmp$i;
  HEAP32[5760>>2] = 0;
  $3 = ($0|0)>(0);
  if ($3) {
   label = 6;
  } else {
   $$pre$i = HEAP32[5752>>2]|0;
   $16 = $$pre$i;
  }
 }
 if ((label|0) == 6) {
  $4 = HEAP32[5752>>2]|0;
  $5 = $seed;$6 = 0;$k$01$i = 0;
  while(1) {
   $7 = (___muldi3(($5|0),($6|0),1284865837,1481765933)|0);
   $8 = tempRet0;
   $9 = (_i64Add(($7|0),($8|0),1,0)|0);
   $10 = tempRet0;
   $11 = (($4) + ($k$01$i<<2)|0);
   HEAP32[$11>>2] = $10;
   $12 = (($k$01$i) + 1)|0;
   $13 = HEAP32[5744>>2]|0;
   $14 = ($12|0)<($13|0);
   if ($14) {
    $5 = $9;$6 = $10;$k$01$i = $12;
   } else {
    $16 = $4;
    break;
   }
  }
 }
 $15 = HEAP32[$16>>2]|0;
 $17 = $15 | 1;
 HEAP32[$16>>2] = $17;
 ___unlock((5736|0));
 STACKTOP = sp;return;
}
function _initstate($seed,$state,$size) {
 $seed = $seed|0;
 $state = $state|0;
 $size = $size|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $k$01$i = 0, $storemerge = 0, $storemerge2$in = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($size>>>0)<(8);
 if ($0) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 ___lock((5736|0));
 $1 = HEAP32[5744>>2]|0;
 $2 = $1 << 16;
 $3 = HEAP32[5768>>2]|0;
 $4 = $3 << 8;
 $5 = $4 | $2;
 $6 = HEAP32[5760>>2]|0;
 $7 = $5 | $6;
 $8 = HEAP32[5752>>2]|0;
 $9 = (($8) + -4|0);
 HEAP32[$9>>2] = $7;
 $10 = ($size>>>0)<(32);
 if ($10) {
  HEAP32[5744>>2] = 0;
  $14 = (($state) + 4|0);
  HEAP32[5752>>2] = $14;
  HEAP32[$14>>2] = $seed;
  $35 = $14;
 } else {
  $11 = ($size>>>0)<(64);
  do {
   if ($11) {
    HEAP32[5744>>2] = 7;
    $storemerge = 3;
   } else {
    $12 = ($size>>>0)<(128);
    if ($12) {
     HEAP32[5744>>2] = 15;
     $storemerge = 1;
     break;
    }
    $13 = ($size>>>0)<(256);
    if ($13) {
     HEAP32[5744>>2] = 31;
     $storemerge = 3;
     break;
    } else {
     HEAP32[5744>>2] = 63;
     $storemerge = 1;
     break;
    }
   }
  } while(0);
  $storemerge2$in = (($state) + 4|0);
  HEAP32[5752>>2] = $storemerge2$in;
  HEAP32[5768>>2] = $storemerge;
  HEAP32[5760>>2] = 0;
  $15 = $seed;$16 = 0;$k$01$i = 0;
  while(1) {
   $17 = (___muldi3(($15|0),($16|0),1284865837,1481765933)|0);
   $18 = tempRet0;
   $19 = (_i64Add(($17|0),($18|0),1,0)|0);
   $20 = tempRet0;
   $21 = (($storemerge2$in) + ($k$01$i<<2)|0);
   HEAP32[$21>>2] = $20;
   $22 = (($k$01$i) + 1)|0;
   $23 = HEAP32[5744>>2]|0;
   $24 = ($22|0)<($23|0);
   if ($24) {
    $15 = $19;$16 = $20;$k$01$i = $22;
   } else {
    break;
   }
  }
  $25 = HEAP32[$storemerge2$in>>2]|0;
  $26 = $25 | 1;
  HEAP32[$storemerge2$in>>2] = $26;
  $35 = $storemerge2$in;
 }
 $27 = HEAP32[5744>>2]|0;
 $28 = $27 << 16;
 $29 = HEAP32[5768>>2]|0;
 $30 = $29 << 8;
 $31 = $30 | $28;
 $32 = HEAP32[5760>>2]|0;
 $33 = $31 | $32;
 $34 = (($35) + -4|0);
 HEAP32[$34>>2] = $33;
 ___unlock((5736|0));
 $$0 = $9;
 STACKTOP = sp;return ($$0|0);
}
function _setstate($state) {
 $state = $state|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 ___lock((5736|0));
 $0 = HEAP32[5744>>2]|0;
 $1 = $0 << 16;
 $2 = HEAP32[5768>>2]|0;
 $3 = $2 << 8;
 $4 = $3 | $1;
 $5 = HEAP32[5760>>2]|0;
 $6 = $4 | $5;
 $7 = HEAP32[5752>>2]|0;
 $8 = (($7) + -4|0);
 HEAP32[$8>>2] = $6;
 $9 = (($state) + 4|0);
 HEAP32[5752>>2] = $9;
 $10 = HEAP32[$state>>2]|0;
 $11 = $10 >>> 16;
 HEAP32[5744>>2] = $11;
 $12 = HEAP32[$state>>2]|0;
 $13 = $12 >>> 8;
 $14 = $13 & 255;
 HEAP32[5768>>2] = $14;
 $15 = HEAP32[$state>>2]|0;
 $16 = $15 & 255;
 HEAP32[5760>>2] = $16;
 ___unlock((5736|0));
 STACKTOP = sp;return ($8|0);
}
function _random() {
 var $$ = 0, $$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $k$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 ___lock((5736|0));
 $0 = HEAP32[5744>>2]|0;
 $1 = ($0|0)==(0);
 if ($1) {
  $2 = HEAP32[5752>>2]|0;
  $3 = HEAP32[$2>>2]|0;
  $4 = Math_imul($3, 1103515245)|0;
  $5 = (($4) + 12345)|0;
  $6 = $5 & 2147483647;
  HEAP32[$2>>2] = $6;
  $k$0 = $6;
  ___unlock((5736|0));
  STACKTOP = sp;return ($k$0|0);
 } else {
  $7 = HEAP32[5760>>2]|0;
  $8 = HEAP32[5752>>2]|0;
  $9 = (($8) + ($7<<2)|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = HEAP32[5768>>2]|0;
  $12 = (($8) + ($11<<2)|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = (($13) + ($10))|0;
  HEAP32[$12>>2] = $14;
  $15 = HEAP32[5768>>2]|0;
  $16 = (($8) + ($15<<2)|0);
  $17 = HEAP32[$16>>2]|0;
  $18 = $17 >>> 1;
  $19 = (($15) + 1)|0;
  $20 = HEAP32[5744>>2]|0;
  $21 = ($19|0)==($20|0);
  $$ = $21 ? 0 : $19;
  HEAP32[5768>>2] = $$;
  $22 = HEAP32[5760>>2]|0;
  $23 = (($22) + 1)|0;
  $24 = ($23|0)==($20|0);
  $$1 = $24 ? 0 : $23;
  HEAP32[5760>>2] = $$1;
  $k$0 = $18;
  ___unlock((5736|0));
  STACKTOP = sp;return ($k$0|0);
 }
 return (0)|0;
}
function _seed48($s) {
 $s = $s|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 ;HEAP16[5904+0>>1]=HEAP16[5712+0>>1]|0;HEAP16[5904+2>>1]=HEAP16[5712+2>>1]|0;HEAP16[5904+4>>1]=HEAP16[5712+4>>1]|0;
 ;HEAP16[5712+0>>1]=HEAP16[$s+0>>1]|0;HEAP16[5712+2>>1]=HEAP16[$s+2>>1]|0;HEAP16[5712+4>>1]=HEAP16[$s+4>>1]|0;
 STACKTOP = sp;return (5904|0);
}
function _srand48($seed) {
 $seed = $seed|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = sp;
 HEAP16[$0>>1] = 13070;
 $1 = (($0) + 2|0);
 $2 = $seed&65535;
 HEAP16[$1>>1] = $2;
 $3 = (($0) + 4|0);
 $4 = $seed >>> 16;
 $5 = $4&65535;
 HEAP16[$3>>1] = $5;
 (_seed48($0)|0);
 STACKTOP = sp;return;
}
function ___overflow($f,$_c) {
 $f = $f|0;
 $_c = $_c|0;
 var $$0 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $c = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $c = sp;
 $0 = $_c&255;
 HEAP8[$c>>0] = $0;
 $1 = (($f) + 16|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)==(0|0);
 do {
  if ($3) {
   $4 = (___towrite($f)|0);
   $5 = ($4|0)==(0);
   if ($5) {
    $$pre = HEAP32[$1>>2]|0;
    $9 = $$pre;
    break;
   } else {
    $$0 = -1;
    STACKTOP = sp;return ($$0|0);
   }
  } else {
   $9 = $2;
  }
 } while(0);
 $6 = (($f) + 20|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ($7>>>0)<($9>>>0);
 if ($8) {
  $10 = HEAP8[$c>>0]|0;
  $11 = $10&255;
  $12 = (($f) + 75|0);
  $13 = HEAP8[$12>>0]|0;
  $14 = $13 << 24 >> 24;
  $15 = ($11|0)==($14|0);
  if (!($15)) {
   $16 = (($7) + 1|0);
   HEAP32[$6>>2] = $16;
   HEAP8[$7>>0] = $10;
   $$0 = $11;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $17 = (($f) + 36|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = (FUNCTION_TABLE_iiii[$18 & 1]($f,$c,1)|0);
 $20 = ($19|0)==(1);
 if (!($20)) {
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 $21 = HEAP8[$c>>0]|0;
 $22 = $21&255;
 $$0 = $22;
 STACKTOP = sp;return ($$0|0);
}
function ___toread($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 74|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = $1 << 24 >> 24;
 $3 = (($2) + 255)|0;
 $4 = $3 | $2;
 $5 = $4&255;
 HEAP8[$0>>0] = $5;
 $6 = (($f) + 20|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = (($f) + 44|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($7>>>0)>($9>>>0);
 if ($10) {
  $11 = (($f) + 36|0);
  $12 = HEAP32[$11>>2]|0;
  (FUNCTION_TABLE_iiii[$12 & 1]($f,0,0)|0);
 }
 $13 = (($f) + 16|0);
 HEAP32[$13>>2] = 0;
 $14 = (($f) + 28|0);
 HEAP32[$14>>2] = 0;
 HEAP32[$6>>2] = 0;
 $15 = HEAP32[$f>>2]|0;
 $16 = $15 & 20;
 $17 = ($16|0)==(0);
 if ($17) {
  $21 = HEAP32[$8>>2]|0;
  $22 = (($f) + 8|0);
  HEAP32[$22>>2] = $21;
  $23 = (($f) + 4|0);
  HEAP32[$23>>2] = $21;
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $18 = $15 & 4;
 $19 = ($18|0)==(0);
 if ($19) {
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 $20 = $15 | 32;
 HEAP32[$f>>2] = $20;
 $$0 = -1;
 STACKTOP = sp;return ($$0|0);
}
function ___towrite($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 74|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = $1 << 24 >> 24;
 $3 = (($2) + 255)|0;
 $4 = $3 | $2;
 $5 = $4&255;
 HEAP8[$0>>0] = $5;
 $6 = HEAP32[$f>>2]|0;
 $7 = $6 & 8;
 $8 = ($7|0)==(0);
 if ($8) {
  $10 = (($f) + 8|0);
  HEAP32[$10>>2] = 0;
  $11 = (($f) + 4|0);
  HEAP32[$11>>2] = 0;
  $12 = (($f) + 44|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = (($f) + 28|0);
  HEAP32[$14>>2] = $13;
  $15 = (($f) + 20|0);
  HEAP32[$15>>2] = $13;
  $16 = (($f) + 48|0);
  $17 = HEAP32[$16>>2]|0;
  $18 = (($13) + ($17)|0);
  $19 = (($f) + 16|0);
  HEAP32[$19>>2] = $18;
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 } else {
  $9 = $6 | 32;
  HEAP32[$f>>2] = $9;
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function ___uflow($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $c = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $c = sp;
 $0 = (($f) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 if ($2) {
  $3 = (___toread($f)|0);
  $4 = ($3|0)==(0);
  if ($4) {
   label = 3;
  } else {
   $$0 = -1;
  }
 } else {
  label = 3;
 }
 if ((label|0) == 3) {
  $5 = (($f) + 32|0);
  $6 = HEAP32[$5>>2]|0;
  $7 = (FUNCTION_TABLE_iiii[$6 & 1]($f,$c,1)|0);
  $8 = ($7|0)==(1);
  if ($8) {
   $9 = HEAP8[$c>>0]|0;
   $10 = $9&255;
   $$0 = $10;
  } else {
   $$0 = -1;
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function ___fwritex($s,$l,$f) {
 $s = $s|0;
 $l = $l|0;
 $f = $f|0;
 var $$0 = 0, $$01 = 0, $$02 = 0, $$pre = 0, $$pre5 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$0 = 0, $i$1 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 do {
  if ($2) {
   $3 = (___towrite($f)|0);
   $4 = ($3|0)==(0);
   if ($4) {
    $$pre = HEAP32[$0>>2]|0;
    $8 = $$pre;
    break;
   } else {
    $$0 = 0;
    STACKTOP = sp;return ($$0|0);
   }
  } else {
   $8 = $1;
  }
 } while(0);
 $5 = (($f) + 20|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = $8;
 $9 = $6;
 $10 = (($7) - ($9))|0;
 $11 = ($10>>>0)<($l>>>0);
 if ($11) {
  $12 = (($f) + 36|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = (FUNCTION_TABLE_iiii[$13 & 1]($f,$s,$l)|0);
  $$0 = $14;
  STACKTOP = sp;return ($$0|0);
 }
 $15 = (($f) + 75|0);
 $16 = HEAP8[$15>>0]|0;
 $17 = ($16<<24>>24)>(-1);
 L11: do {
  if ($17) {
   $i$0 = $l;
   while(1) {
    $18 = ($i$0|0)==(0);
    if ($18) {
     $$01 = $l;$$02 = $s;$29 = $6;$i$1 = 0;
     break L11;
    }
    $19 = (($i$0) + -1)|0;
    $20 = (($s) + ($19)|0);
    $21 = HEAP8[$20>>0]|0;
    $22 = ($21<<24>>24)==(10);
    if ($22) {
     break;
    } else {
     $i$0 = $19;
    }
   }
   $23 = (($f) + 36|0);
   $24 = HEAP32[$23>>2]|0;
   $25 = (FUNCTION_TABLE_iiii[$24 & 1]($f,$s,$i$0)|0);
   $26 = ($25>>>0)<($i$0>>>0);
   if ($26) {
    $$0 = $i$0;
    STACKTOP = sp;return ($$0|0);
   } else {
    $27 = (($s) + ($i$0)|0);
    $28 = (($l) - ($i$0))|0;
    $$pre5 = HEAP32[$5>>2]|0;
    $$01 = $28;$$02 = $27;$29 = $$pre5;$i$1 = $i$0;
    break;
   }
  } else {
   $$01 = $l;$$02 = $s;$29 = $6;$i$1 = 0;
  }
 } while(0);
 _memcpy(($29|0),($$02|0),($$01|0))|0;
 $30 = HEAP32[$5>>2]|0;
 $31 = (($30) + ($$01)|0);
 HEAP32[$5>>2] = $31;
 $32 = (($i$1) + ($$01))|0;
 $$0 = $32;
 STACKTOP = sp;return ($$0|0);
}
function _snprintf($s,$n,$fmt,$varargs) {
 $s = $s|0;
 $n = $n|0;
 $fmt = $fmt|0;
 $varargs = $varargs|0;
 var $0 = 0, $ap = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap = sp;
 HEAP32[$ap>>2] = $varargs;
 $0 = (_vsnprintf($s,$n,$fmt,$ap)|0);
 STACKTOP = sp;return ($0|0);
}
function _sprintf($s,$fmt,$varargs) {
 $s = $s|0;
 $fmt = $fmt|0;
 $varargs = $varargs|0;
 var $0 = 0, $ap = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap = sp;
 HEAP32[$ap>>2] = $varargs;
 $0 = (_vsprintf($s,$fmt,$ap)|0);
 STACKTOP = sp;return ($0|0);
}
function _MUSL_vfprintf($f,$fmt,$ap) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $$ = 0, $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $ap2 = 0, $internal_buf = 0, $nl_arg = 0, $nl_type = 0, $ret$1 = 0, $vacopy_currentptr = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap2 = sp + 120|0;
 $nl_type = sp + 80|0;
 $nl_arg = sp;
 $internal_buf = sp + 136|0;
 dest=$nl_type+0|0; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $vacopy_currentptr = HEAP32[$ap>>2]|0;
 HEAP32[$ap2>>2] = $vacopy_currentptr;
 $0 = (_printf_core(0,$fmt,$ap2,$nl_arg,$nl_type)|0);
 $1 = ($0|0)<(0);
 if ($1) {
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 $2 = (($f) + 48|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)==(0);
 if ($4) {
  $6 = (($f) + 44|0);
  $7 = HEAP32[$6>>2]|0;
  HEAP32[$6>>2] = $internal_buf;
  $8 = (($f) + 28|0);
  HEAP32[$8>>2] = $internal_buf;
  $9 = (($f) + 20|0);
  HEAP32[$9>>2] = $internal_buf;
  HEAP32[$2>>2] = 80;
  $10 = (($internal_buf) + 80|0);
  $11 = (($f) + 16|0);
  HEAP32[$11>>2] = $10;
  $12 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
  $13 = ($7|0)==(0|0);
  if ($13) {
   $ret$1 = $12;
  } else {
   $14 = (($f) + 36|0);
   $15 = HEAP32[$14>>2]|0;
   (FUNCTION_TABLE_iiii[$15 & 1]($f,0,0)|0);
   $16 = HEAP32[$9>>2]|0;
   $17 = ($16|0)==(0|0);
   $$ = $17 ? -1 : $12;
   HEAP32[$6>>2] = $7;
   HEAP32[$2>>2] = 0;
   HEAP32[$11>>2] = 0;
   HEAP32[$8>>2] = 0;
   HEAP32[$9>>2] = 0;
   $ret$1 = $$;
  }
 } else {
  $5 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
  $ret$1 = $5;
 }
 $$0 = $ret$1;
 STACKTOP = sp;return ($$0|0);
}
function _vsnprintf($s,$n,$fmt,$ap) {
 $s = $s|0;
 $n = $n|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $$$02 = 0, $$0 = 0, $$01 = 0, $$02 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $b = 0, $f = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $b = sp + 112|0;
 $f = sp;
 dest=$f+0|0; src=6480+0|0; stop=dest+112|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 $0 = (($n) + -1)|0;
 $1 = ($0>>>0)>(2147483646);
 if ($1) {
  $2 = ($n|0)==(0);
  if ($2) {
   $$01 = $b;$$02 = 1;
  } else {
   $3 = (___errno_location()|0);
   HEAP32[$3>>2] = 75;
   $$0 = -1;
   STACKTOP = sp;return ($$0|0);
  }
 } else {
  $$01 = $s;$$02 = $n;
 }
 $4 = $$01;
 $5 = (-2 - ($4))|0;
 $6 = ($$02>>>0)>($5>>>0);
 $$$02 = $6 ? $5 : $$02;
 $7 = (($f) + 48|0);
 HEAP32[$7>>2] = $$$02;
 $8 = (($f) + 20|0);
 HEAP32[$8>>2] = $$01;
 $9 = (($f) + 44|0);
 HEAP32[$9>>2] = $$01;
 $10 = (($$01) + ($$$02)|0);
 $11 = (($f) + 16|0);
 HEAP32[$11>>2] = $10;
 $12 = (($f) + 28|0);
 HEAP32[$12>>2] = $10;
 $13 = (_MUSL_vfprintf($f,$fmt,$ap)|0);
 $14 = ($$$02|0)==(0);
 if ($14) {
  $$0 = $13;
  STACKTOP = sp;return ($$0|0);
 }
 $15 = HEAP32[$8>>2]|0;
 $16 = HEAP32[$11>>2]|0;
 $17 = ($15|0)==($16|0);
 $18 = $17 << 31 >> 31;
 $19 = (($15) + ($18)|0);
 HEAP8[$19>>0] = 0;
 $$0 = $13;
 STACKTOP = sp;return ($$0|0);
}
function _vsprintf($s,$fmt,$ap) {
 $s = $s|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_vsnprintf($s,2147483647,$fmt,$ap)|0);
 STACKTOP = sp;return ($0|0);
}
function _atof($s) {
 $s = $s|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_strtod($s,0));
 STACKTOP = sp;return (+$0);
}
function _atoi($s) {
 $s = $s|0;
 var $$0 = 0, $$1$ph = 0, $$12 = 0, $$neg1 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n$0$lcssa = 0, $n$03 = 0, $neg$0 = 0, $neg$1$ph = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $$0 = $s;
 while(1) {
  $0 = HEAP8[$$0>>0]|0;
  $1 = $0 << 24 >> 24;
  $2 = (_isspace($1)|0);
  $3 = ($2|0)==(0);
  $4 = (($$0) + 1|0);
  if ($3) {
   break;
  } else {
   $$0 = $4;
  }
 }
 $5 = HEAP8[$$0>>0]|0;
 $6 = $5 << 24 >> 24;
 if ((($6|0) == 43)) {
  $neg$0 = 0;
  label = 5;
 } else if ((($6|0) == 45)) {
  $neg$0 = 1;
  label = 5;
 } else {
  $$1$ph = $$0;$8 = $5;$neg$1$ph = 0;
 }
 if ((label|0) == 5) {
  $$pre = HEAP8[$4>>0]|0;
  $$1$ph = $4;$8 = $$pre;$neg$1$ph = $neg$0;
 }
 $7 = $8 << 24 >> 24;
 $9 = (_isdigit($7)|0);
 $10 = ($9|0)==(0);
 if ($10) {
  $n$0$lcssa = 0;
  $20 = ($neg$1$ph|0)!=(0);
  $21 = (0 - ($n$0$lcssa))|0;
  $22 = $20 ? $n$0$lcssa : $21;
  STACKTOP = sp;return ($22|0);
 } else {
  $$12 = $$1$ph;$n$03 = 0;
 }
 while(1) {
  $11 = ($n$03*10)|0;
  $12 = (($$12) + 1|0);
  $13 = HEAP8[$$12>>0]|0;
  $14 = $13 << 24 >> 24;
  $$neg1 = (($11) + 48)|0;
  $15 = (($$neg1) - ($14))|0;
  $16 = HEAP8[$12>>0]|0;
  $17 = $16 << 24 >> 24;
  $18 = (_isdigit($17)|0);
  $19 = ($18|0)==(0);
  if ($19) {
   $n$0$lcssa = $15;
   break;
  } else {
   $$12 = $12;$n$03 = $15;
  }
 }
 $20 = ($neg$1$ph|0)!=(0);
 $21 = (0 - ($n$0$lcssa))|0;
 $22 = $20 ? $n$0$lcssa : $21;
 STACKTOP = sp;return ($22|0);
}
function _atol($s) {
 $s = $s|0;
 var $$0 = 0, $$1$ph = 0, $$12 = 0, $$neg1 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n$0$lcssa = 0, $n$03 = 0, $neg$0 = 0, $neg$1$ph = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $$0 = $s;
 while(1) {
  $0 = HEAP8[$$0>>0]|0;
  $1 = $0 << 24 >> 24;
  $2 = (_isspace($1)|0);
  $3 = ($2|0)==(0);
  $4 = (($$0) + 1|0);
  if ($3) {
   break;
  } else {
   $$0 = $4;
  }
 }
 $5 = HEAP8[$$0>>0]|0;
 $6 = $5 << 24 >> 24;
 if ((($6|0) == 43)) {
  $neg$0 = 0;
  label = 5;
 } else if ((($6|0) == 45)) {
  $neg$0 = 1;
  label = 5;
 } else {
  $$1$ph = $$0;$8 = $5;$neg$1$ph = 0;
 }
 if ((label|0) == 5) {
  $$pre = HEAP8[$4>>0]|0;
  $$1$ph = $4;$8 = $$pre;$neg$1$ph = $neg$0;
 }
 $7 = $8 << 24 >> 24;
 $9 = (_isdigit($7)|0);
 $10 = ($9|0)==(0);
 if ($10) {
  $n$0$lcssa = 0;
  $20 = ($neg$1$ph|0)!=(0);
  $21 = (0 - ($n$0$lcssa))|0;
  $22 = $20 ? $n$0$lcssa : $21;
  STACKTOP = sp;return ($22|0);
 } else {
  $$12 = $$1$ph;$n$03 = 0;
 }
 while(1) {
  $11 = ($n$03*10)|0;
  $12 = (($$12) + 1|0);
  $13 = HEAP8[$$12>>0]|0;
  $14 = $13 << 24 >> 24;
  $$neg1 = (($11) + 48)|0;
  $15 = (($$neg1) - ($14))|0;
  $16 = HEAP8[$12>>0]|0;
  $17 = $16 << 24 >> 24;
  $18 = (_isdigit($17)|0);
  $19 = ($18|0)==(0);
  if ($19) {
   $n$0$lcssa = $15;
   break;
  } else {
   $$12 = $12;$n$03 = $15;
  }
 }
 $20 = ($neg$1$ph|0)!=(0);
 $21 = (0 - ($n$0$lcssa))|0;
 $22 = $20 ? $n$0$lcssa : $21;
 STACKTOP = sp;return ($22|0);
}
function _strtof($s,$p) {
 $s = $s|0;
 $p = $p|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i = 0, dest = 0;
 var label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i = sp;
 dest=$f$i+0|0; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = (($f$i) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = (($f$i) + 8|0);
 HEAP32[$1>>2] = (-1);
 $2 = (($f$i) + 44|0);
 HEAP32[$2>>2] = $s;
 $3 = (($f$i) + 76|0);
 HEAP32[$3>>2] = -1;
 ___shlim($f$i,0);
 $4 = (+___floatscan($f$i,0,1));
 $5 = (($f$i) + 108|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = HEAP32[$0>>2]|0;
 $8 = HEAP32[$1>>2]|0;
 $9 = $7;
 $10 = $8;
 $11 = (($9) - ($10))|0;
 $12 = (($11) + ($6))|0;
 $13 = ($p|0)==(0|0);
 if ($13) {
  $17 = $4;
  STACKTOP = sp;return (+$17);
 }
 $14 = ($12|0)==(0);
 if ($14) {
  $16 = $s;
 } else {
  $15 = (($s) + ($12)|0);
  $16 = $15;
 }
 HEAP32[$p>>2] = $16;
 $17 = $4;
 STACKTOP = sp;return (+$17);
}
function _strtod($s,$p) {
 $s = $s|0;
 $p = $p|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i = 0, dest = 0, label = 0;
 var sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i = sp;
 dest=$f$i+0|0; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = (($f$i) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = (($f$i) + 8|0);
 HEAP32[$1>>2] = (-1);
 $2 = (($f$i) + 44|0);
 HEAP32[$2>>2] = $s;
 $3 = (($f$i) + 76|0);
 HEAP32[$3>>2] = -1;
 ___shlim($f$i,0);
 $4 = (+___floatscan($f$i,1,1));
 $5 = (($f$i) + 108|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = HEAP32[$0>>2]|0;
 $8 = HEAP32[$1>>2]|0;
 $9 = $7;
 $10 = $8;
 $11 = (($9) - ($10))|0;
 $12 = (($11) + ($6))|0;
 $13 = ($p|0)==(0|0);
 if ($13) {
  STACKTOP = sp;return (+$4);
 }
 $14 = ($12|0)==(0);
 if ($14) {
  $16 = $s;
 } else {
  $15 = (($s) + ($12)|0);
  $16 = $15;
 }
 HEAP32[$p>>2] = $16;
 STACKTOP = sp;return (+$4);
}
function _strtold($s,$p) {
 $s = $s|0;
 $p = $p|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i = 0, dest = 0, label = 0;
 var sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i = sp;
 dest=$f$i+0|0; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = (($f$i) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = (($f$i) + 8|0);
 HEAP32[$1>>2] = (-1);
 $2 = (($f$i) + 44|0);
 HEAP32[$2>>2] = $s;
 $3 = (($f$i) + 76|0);
 HEAP32[$3>>2] = -1;
 ___shlim($f$i,0);
 $4 = (+___floatscan($f$i,2,1));
 $5 = (($f$i) + 108|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = HEAP32[$0>>2]|0;
 $8 = HEAP32[$1>>2]|0;
 $9 = $7;
 $10 = $8;
 $11 = (($9) - ($10))|0;
 $12 = (($11) + ($6))|0;
 $13 = ($p|0)==(0|0);
 if ($13) {
  STACKTOP = sp;return (+$4);
 }
 $14 = ($12|0)==(0);
 if ($14) {
  $16 = $s;
 } else {
  $15 = (($s) + ($12)|0);
  $16 = $15;
 }
 HEAP32[$p>>2] = $16;
 STACKTOP = sp;return (+$4);
}
function _strtof_l($s,$p,$loc) {
 $s = $s|0;
 $p = $p|0;
 $loc = $loc|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i$i = 0, dest = 0;
 var label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i$i = sp;
 dest=$f$i$i+0|0; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = (($f$i$i) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = (($f$i$i) + 8|0);
 HEAP32[$1>>2] = (-1);
 $2 = (($f$i$i) + 44|0);
 HEAP32[$2>>2] = $s;
 $3 = (($f$i$i) + 76|0);
 HEAP32[$3>>2] = -1;
 ___shlim($f$i$i,0);
 $4 = (+___floatscan($f$i$i,0,1));
 $5 = (($f$i$i) + 108|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = HEAP32[$0>>2]|0;
 $8 = HEAP32[$1>>2]|0;
 $9 = $7;
 $10 = $8;
 $11 = (($9) - ($10))|0;
 $12 = (($11) + ($6))|0;
 $13 = ($p|0)==(0|0);
 if ($13) {
  $17 = $4;
  STACKTOP = sp;return (+$17);
 }
 $14 = ($12|0)==(0);
 if ($14) {
  $16 = $s;
 } else {
  $15 = (($s) + ($12)|0);
  $16 = $15;
 }
 HEAP32[$p>>2] = $16;
 $17 = $4;
 STACKTOP = sp;return (+$17);
}
function _strtod_l($s,$p,$loc) {
 $s = $s|0;
 $p = $p|0;
 $loc = $loc|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i$i = 0, dest = 0, label = 0;
 var sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i$i = sp;
 dest=$f$i$i+0|0; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = (($f$i$i) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = (($f$i$i) + 8|0);
 HEAP32[$1>>2] = (-1);
 $2 = (($f$i$i) + 44|0);
 HEAP32[$2>>2] = $s;
 $3 = (($f$i$i) + 76|0);
 HEAP32[$3>>2] = -1;
 ___shlim($f$i$i,0);
 $4 = (+___floatscan($f$i$i,1,1));
 $5 = (($f$i$i) + 108|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = HEAP32[$0>>2]|0;
 $8 = HEAP32[$1>>2]|0;
 $9 = $7;
 $10 = $8;
 $11 = (($9) - ($10))|0;
 $12 = (($11) + ($6))|0;
 $13 = ($p|0)==(0|0);
 if ($13) {
  STACKTOP = sp;return (+$4);
 }
 $14 = ($12|0)==(0);
 if ($14) {
  $16 = $s;
 } else {
  $15 = (($s) + ($12)|0);
  $16 = $15;
 }
 HEAP32[$p>>2] = $16;
 STACKTOP = sp;return (+$4);
}
function _strtold_l($s,$p,$loc) {
 $s = $s|0;
 $p = $p|0;
 $loc = $loc|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i$i = 0, dest = 0, label = 0;
 var sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i$i = sp;
 dest=$f$i$i+0|0; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = (($f$i$i) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = (($f$i$i) + 8|0);
 HEAP32[$1>>2] = (-1);
 $2 = (($f$i$i) + 44|0);
 HEAP32[$2>>2] = $s;
 $3 = (($f$i$i) + 76|0);
 HEAP32[$3>>2] = -1;
 ___shlim($f$i$i,0);
 $4 = (+___floatscan($f$i$i,2,1));
 $5 = (($f$i$i) + 108|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = HEAP32[$0>>2]|0;
 $8 = HEAP32[$1>>2]|0;
 $9 = $7;
 $10 = $8;
 $11 = (($9) - ($10))|0;
 $12 = (($11) + ($6))|0;
 $13 = ($p|0)==(0|0);
 if ($13) {
  STACKTOP = sp;return (+$4);
 }
 $14 = ($12|0)==(0);
 if ($14) {
  $16 = $s;
 } else {
  $15 = (($s) + ($12)|0);
  $16 = $15;
 }
 HEAP32[$p>>2] = $16;
 STACKTOP = sp;return (+$4);
}
function _strtoull($s,$p,$base) {
 $s = $s|0;
 $p = $p|0;
 $base = $base|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $f$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i = sp;
 HEAP32[$f$i>>2] = 0;
 $0 = (($f$i) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = (($f$i) + 44|0);
 HEAP32[$1>>2] = $s;
 $2 = ($s|0)<(0|0);
 if ($2) {
  $3 = (($f$i) + 8|0);
  HEAP32[$3>>2] = (-1);
 } else {
  $4 = (($s) + 2147483647|0);
  $5 = (($f$i) + 8|0);
  HEAP32[$5>>2] = $4;
 }
 $6 = (($f$i) + 76|0);
 HEAP32[$6>>2] = -1;
 ___shlim($f$i,0);
 $7 = (___intscan($f$i,$base,1,-1,-1)|0);
 $8 = tempRet0;
 $9 = ($p|0)==(0|0);
 if ($9) {
  tempRet0 = $8;
  STACKTOP = sp;return ($7|0);
 }
 $10 = (($f$i) + 108|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = HEAP32[$0>>2]|0;
 $13 = (($f$i) + 8|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = $12;
 $16 = $14;
 $17 = (($15) + ($11))|0;
 $18 = (($17) - ($16))|0;
 $19 = (($s) + ($18)|0);
 HEAP32[$p>>2] = $19;
 tempRet0 = $8;
 STACKTOP = sp;return ($7|0);
}
function _strtoll($s,$p,$base) {
 $s = $s|0;
 $p = $p|0;
 $base = $base|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $f$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i = sp;
 HEAP32[$f$i>>2] = 0;
 $0 = (($f$i) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = (($f$i) + 44|0);
 HEAP32[$1>>2] = $s;
 $2 = ($s|0)<(0|0);
 if ($2) {
  $3 = (($f$i) + 8|0);
  HEAP32[$3>>2] = (-1);
 } else {
  $4 = (($s) + 2147483647|0);
  $5 = (($f$i) + 8|0);
  HEAP32[$5>>2] = $4;
 }
 $6 = (($f$i) + 76|0);
 HEAP32[$6>>2] = -1;
 ___shlim($f$i,0);
 $7 = (___intscan($f$i,$base,1,0,-2147483648)|0);
 $8 = tempRet0;
 $9 = ($p|0)==(0|0);
 if ($9) {
  tempRet0 = $8;
  STACKTOP = sp;return ($7|0);
 }
 $10 = (($f$i) + 108|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = HEAP32[$0>>2]|0;
 $13 = (($f$i) + 8|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = $12;
 $16 = $14;
 $17 = (($15) + ($11))|0;
 $18 = (($17) - ($16))|0;
 $19 = (($s) + ($18)|0);
 HEAP32[$p>>2] = $19;
 tempRet0 = $8;
 STACKTOP = sp;return ($7|0);
}
function _strtoul($s,$p,$base) {
 $s = $s|0;
 $p = $p|0;
 $base = $base|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $f$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i = sp;
 HEAP32[$f$i>>2] = 0;
 $0 = (($f$i) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = (($f$i) + 44|0);
 HEAP32[$1>>2] = $s;
 $2 = ($s|0)<(0|0);
 if ($2) {
  $3 = (($f$i) + 8|0);
  HEAP32[$3>>2] = (-1);
 } else {
  $4 = (($s) + 2147483647|0);
  $5 = (($f$i) + 8|0);
  HEAP32[$5>>2] = $4;
 }
 $6 = (($f$i) + 76|0);
 HEAP32[$6>>2] = -1;
 ___shlim($f$i,0);
 $7 = (___intscan($f$i,$base,1,-1,0)|0);
 $8 = tempRet0;
 $9 = ($p|0)==(0|0);
 if ($9) {
  STACKTOP = sp;return ($7|0);
 }
 $10 = (($f$i) + 108|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = HEAP32[$0>>2]|0;
 $13 = (($f$i) + 8|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = $12;
 $16 = $14;
 $17 = (($15) + ($11))|0;
 $18 = (($17) - ($16))|0;
 $19 = (($s) + ($18)|0);
 HEAP32[$p>>2] = $19;
 STACKTOP = sp;return ($7|0);
}
function _strtol($s,$p,$base) {
 $s = $s|0;
 $p = $p|0;
 $base = $base|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $f$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i = sp;
 HEAP32[$f$i>>2] = 0;
 $0 = (($f$i) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = (($f$i) + 44|0);
 HEAP32[$1>>2] = $s;
 $2 = ($s|0)<(0|0);
 if ($2) {
  $3 = (($f$i) + 8|0);
  HEAP32[$3>>2] = (-1);
 } else {
  $4 = (($s) + 2147483647|0);
  $5 = (($f$i) + 8|0);
  HEAP32[$5>>2] = $4;
 }
 $6 = (($f$i) + 76|0);
 HEAP32[$6>>2] = -1;
 ___shlim($f$i,0);
 $7 = (___intscan($f$i,$base,1,-2147483648,0)|0);
 $8 = tempRet0;
 $9 = ($p|0)==(0|0);
 if ($9) {
  STACKTOP = sp;return ($7|0);
 }
 $10 = (($f$i) + 108|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = HEAP32[$0>>2]|0;
 $13 = (($f$i) + 8|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = $12;
 $16 = $14;
 $17 = (($15) + ($11))|0;
 $18 = (($17) - ($16))|0;
 $19 = (($s) + ($18)|0);
 HEAP32[$p>>2] = $19;
 STACKTOP = sp;return ($7|0);
}
function _strtoimax($s,$p,$base) {
 $s = $s|0;
 $p = $p|0;
 $base = $base|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $f$i$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i$i = sp;
 HEAP32[$f$i$i>>2] = 0;
 $0 = (($f$i$i) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = (($f$i$i) + 44|0);
 HEAP32[$1>>2] = $s;
 $2 = ($s|0)<(0|0);
 if ($2) {
  $3 = (($f$i$i) + 8|0);
  HEAP32[$3>>2] = (-1);
 } else {
  $4 = (($s) + 2147483647|0);
  $5 = (($f$i$i) + 8|0);
  HEAP32[$5>>2] = $4;
 }
 $6 = (($f$i$i) + 76|0);
 HEAP32[$6>>2] = -1;
 ___shlim($f$i$i,0);
 $7 = (___intscan($f$i$i,$base,1,0,-2147483648)|0);
 $8 = tempRet0;
 $9 = ($p|0)==(0|0);
 if ($9) {
  tempRet0 = $8;
  STACKTOP = sp;return ($7|0);
 }
 $10 = (($f$i$i) + 108|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = HEAP32[$0>>2]|0;
 $13 = (($f$i$i) + 8|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = $12;
 $16 = $14;
 $17 = (($15) + ($11))|0;
 $18 = (($17) - ($16))|0;
 $19 = (($s) + ($18)|0);
 HEAP32[$p>>2] = $19;
 tempRet0 = $8;
 STACKTOP = sp;return ($7|0);
}
function _strtoumax($s,$p,$base) {
 $s = $s|0;
 $p = $p|0;
 $base = $base|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $f$i$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i$i = sp;
 HEAP32[$f$i$i>>2] = 0;
 $0 = (($f$i$i) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = (($f$i$i) + 44|0);
 HEAP32[$1>>2] = $s;
 $2 = ($s|0)<(0|0);
 if ($2) {
  $3 = (($f$i$i) + 8|0);
  HEAP32[$3>>2] = (-1);
 } else {
  $4 = (($s) + 2147483647|0);
  $5 = (($f$i$i) + 8|0);
  HEAP32[$5>>2] = $4;
 }
 $6 = (($f$i$i) + 76|0);
 HEAP32[$6>>2] = -1;
 ___shlim($f$i$i,0);
 $7 = (___intscan($f$i$i,$base,1,-1,-1)|0);
 $8 = tempRet0;
 $9 = ($p|0)==(0|0);
 if ($9) {
  tempRet0 = $8;
  STACKTOP = sp;return ($7|0);
 }
 $10 = (($f$i$i) + 108|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = HEAP32[$0>>2]|0;
 $13 = (($f$i$i) + 8|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = $12;
 $16 = $14;
 $17 = (($15) + ($11))|0;
 $18 = (($17) - ($16))|0;
 $19 = (($s) + ($18)|0);
 HEAP32[$p>>2] = $19;
 tempRet0 = $8;
 STACKTOP = sp;return ($7|0);
}
function _memchr($src,$c,$n) {
 $src = $src|0;
 $c = $c|0;
 $n = $n|0;
 var $$0$lcssa = 0, $$0$lcssa36 = 0, $$012 = 0, $$1$lcssa = 0, $$15 = 0, $$22 = 0, $$3 = 0, $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0;
 var $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond11 = 0, $s$0$lcssa = 0, $s$0$lcssa35 = 0, $s$013 = 0, $s$13 = 0, $s$2 = 0, $w$0$lcssa = 0, $w$06 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $c & 255;
 $1 = $src;
 $2 = $1 & 3;
 $3 = ($2|0)!=(0);
 $4 = ($n|0)!=(0);
 $or$cond11 = $3 & $4;
 L1: do {
  if ($or$cond11) {
   $5 = $c&255;
   $$012 = $n;$s$013 = $src;
   while(1) {
    $6 = HEAP8[$s$013>>0]|0;
    $7 = ($6<<24>>24)==($5<<24>>24);
    if ($7) {
     $$0$lcssa36 = $$012;$s$0$lcssa35 = $s$013;
     label = 6;
     break L1;
    }
    $8 = (($s$013) + 1|0);
    $9 = (($$012) + -1)|0;
    $10 = $8;
    $11 = $10 & 3;
    $12 = ($11|0)!=(0);
    $13 = ($9|0)!=(0);
    $or$cond = $12 & $13;
    if ($or$cond) {
     $$012 = $9;$s$013 = $8;
    } else {
     $$0$lcssa = $9;$$lcssa = $13;$s$0$lcssa = $8;
     label = 5;
     break;
    }
   }
  } else {
   $$0$lcssa = $n;$$lcssa = $4;$s$0$lcssa = $src;
   label = 5;
  }
 } while(0);
 if ((label|0) == 5) {
  if ($$lcssa) {
   $$0$lcssa36 = $$0$lcssa;$s$0$lcssa35 = $s$0$lcssa;
   label = 6;
  } else {
   $$3 = 0;$s$2 = $s$0$lcssa;
  }
 }
 L8: do {
  if ((label|0) == 6) {
   $14 = HEAP8[$s$0$lcssa35>>0]|0;
   $15 = $c&255;
   $16 = ($14<<24>>24)==($15<<24>>24);
   if ($16) {
    $$3 = $$0$lcssa36;$s$2 = $s$0$lcssa35;
   } else {
    $17 = Math_imul($0, 16843009)|0;
    $18 = ($$0$lcssa36>>>0)>(3);
    L11: do {
     if ($18) {
      $$15 = $$0$lcssa36;$w$06 = $s$0$lcssa35;
      while(1) {
       $19 = HEAP32[$w$06>>2]|0;
       $20 = $19 ^ $17;
       $21 = (($20) + -16843009)|0;
       $22 = $20 & -2139062144;
       $23 = $22 ^ -2139062144;
       $24 = $23 & $21;
       $25 = ($24|0)==(0);
       if (!($25)) {
        $$1$lcssa = $$15;$w$0$lcssa = $w$06;
        break L11;
       }
       $26 = (($w$06) + 4|0);
       $27 = (($$15) + -4)|0;
       $28 = ($27>>>0)>(3);
       if ($28) {
        $$15 = $27;$w$06 = $26;
       } else {
        $$1$lcssa = $27;$w$0$lcssa = $26;
        break;
       }
      }
     } else {
      $$1$lcssa = $$0$lcssa36;$w$0$lcssa = $s$0$lcssa35;
     }
    } while(0);
    $29 = ($$1$lcssa|0)==(0);
    if ($29) {
     $$3 = 0;$s$2 = $w$0$lcssa;
    } else {
     $$22 = $$1$lcssa;$s$13 = $w$0$lcssa;
     while(1) {
      $30 = HEAP8[$s$13>>0]|0;
      $31 = ($30<<24>>24)==($15<<24>>24);
      if ($31) {
       $$3 = $$22;$s$2 = $s$13;
       break L8;
      }
      $32 = (($s$13) + 1|0);
      $33 = (($$22) + -1)|0;
      $34 = ($33|0)==(0);
      if ($34) {
       $$3 = 0;$s$2 = $32;
       break;
      } else {
       $$22 = $33;$s$13 = $32;
      }
     }
    }
   }
  }
 } while(0);
 $35 = ($$3|0)!=(0);
 $36 = $35 ? $s$2 : 0;
 STACKTOP = sp;return ($36|0);
}
function _memcmp($vl,$vr,$n) {
 $vl = $vl|0;
 $vr = $vr|0;
 $n = $n|0;
 var $$02 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$03 = 0, $r$04 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n|0)==(0);
 L1: do {
  if ($0) {
   $11 = 0;
  } else {
   $$02 = $n;$l$03 = $vl;$r$04 = $vr;
   while(1) {
    $1 = HEAP8[$l$03>>0]|0;
    $2 = HEAP8[$r$04>>0]|0;
    $3 = ($1<<24>>24)==($2<<24>>24);
    if (!($3)) {
     break;
    }
    $4 = (($$02) + -1)|0;
    $5 = (($l$03) + 1|0);
    $6 = (($r$04) + 1|0);
    $7 = ($4|0)==(0);
    if ($7) {
     $11 = 0;
     break L1;
    } else {
     $$02 = $4;$l$03 = $5;$r$04 = $6;
    }
   }
   $8 = $1&255;
   $9 = $2&255;
   $10 = (($8) - ($9))|0;
   $11 = $10;
  }
 } while(0);
 STACKTOP = sp;return ($11|0);
}
function _strcasecmp($_l,$_r) {
 $_l = $_l|0;
 $_r = $_r|0;
 var $$pre$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$01 = 0, $r$0$lcssa = 0, $r$02 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$_l>>0]|0;
 $1 = ($0<<24>>24)==(0);
 L1: do {
  if ($1) {
   $19 = 0;$r$0$lcssa = $_r;
  } else {
   $2 = $0&255;
   $6 = $0;$7 = $2;$l$01 = $_l;$r$02 = $_r;
   while(1) {
    $3 = HEAP8[$r$02>>0]|0;
    $4 = ($3<<24>>24)==(0);
    if ($4) {
     $19 = $6;$r$0$lcssa = $r$02;
     break L1;
    }
    $5 = ($6<<24>>24)==($3<<24>>24);
    if (!($5)) {
     $8 = (_tolower($7)|0);
     $9 = HEAP8[$r$02>>0]|0;
     $10 = $9&255;
     $11 = (_tolower($10)|0);
     $12 = ($8|0)==($11|0);
     if (!($12)) {
      break;
     }
    }
    $13 = (($l$01) + 1|0);
    $14 = (($r$02) + 1|0);
    $15 = HEAP8[$13>>0]|0;
    $16 = $15&255;
    $17 = ($15<<24>>24)==(0);
    if ($17) {
     $19 = 0;$r$0$lcssa = $14;
     break L1;
    } else {
     $6 = $15;$7 = $16;$l$01 = $13;$r$02 = $14;
    }
   }
   $$pre$pre = HEAP8[$l$01>>0]|0;
   $19 = $$pre$pre;$r$0$lcssa = $r$02;
  }
 } while(0);
 $18 = $19&255;
 $20 = (_tolower($18)|0);
 $21 = HEAP8[$r$0$lcssa>>0]|0;
 $22 = $21&255;
 $23 = (_tolower($22)|0);
 $24 = (($20) - ($23))|0;
 STACKTOP = sp;return ($24|0);
}
function _strcmp($l,$r) {
 $l = $l|0;
 $r = $r|0;
 var $$014 = 0, $$05 = 0, $$lcssa = 0, $$lcssa2 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond3 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$l>>0]|0;
 $1 = HEAP8[$r>>0]|0;
 $2 = ($0<<24>>24)!=($1<<24>>24);
 $3 = ($0<<24>>24)==(0);
 $or$cond3 = $2 | $3;
 if ($or$cond3) {
  $$lcssa = $0;$$lcssa2 = $1;
 } else {
  $$014 = $l;$$05 = $r;
  while(1) {
   $4 = (($$014) + 1|0);
   $5 = (($$05) + 1|0);
   $6 = HEAP8[$4>>0]|0;
   $7 = HEAP8[$5>>0]|0;
   $8 = ($6<<24>>24)!=($7<<24>>24);
   $9 = ($6<<24>>24)==(0);
   $or$cond = $8 | $9;
   if ($or$cond) {
    $$lcssa = $6;$$lcssa2 = $7;
    break;
   } else {
    $$014 = $4;$$05 = $5;
   }
  }
 }
 $10 = $$lcssa&255;
 $11 = $$lcssa2&255;
 $12 = (($10) - ($11))|0;
 STACKTOP = sp;return ($12|0);
}
function _strncasecmp($_l,$_r,$n) {
 $_l = $_l|0;
 $_r = $_r|0;
 $n = $n|0;
 var $$02 = 0, $$06 = 0, $$06$in = 0, $$pre$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$04 = 0, $or$cond = 0, $r$0$lcssa = 0, $r$05 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n|0)==(0);
 if ($0) {
  $$02 = 0;
  STACKTOP = sp;return ($$02|0);
 }
 $1 = HEAP8[$_l>>0]|0;
 $2 = ($1<<24>>24)==(0);
 L4: do {
  if ($2) {
   $21 = 0;$r$0$lcssa = $_r;
  } else {
   $3 = $1&255;
   $$06$in = $n;$8 = $1;$9 = $3;$l$04 = $_l;$r$05 = $_r;
   while(1) {
    $$06 = (($$06$in) + -1)|0;
    $4 = HEAP8[$r$05>>0]|0;
    $5 = ($4<<24>>24)!=(0);
    $6 = ($$06|0)!=(0);
    $or$cond = $5 & $6;
    if (!($or$cond)) {
     $21 = $8;$r$0$lcssa = $r$05;
     break L4;
    }
    $7 = ($8<<24>>24)==($4<<24>>24);
    if (!($7)) {
     $10 = (_tolower($9)|0);
     $11 = HEAP8[$r$05>>0]|0;
     $12 = $11&255;
     $13 = (_tolower($12)|0);
     $14 = ($10|0)==($13|0);
     if (!($14)) {
      break;
     }
    }
    $15 = (($l$04) + 1|0);
    $16 = (($r$05) + 1|0);
    $17 = HEAP8[$15>>0]|0;
    $18 = $17&255;
    $19 = ($17<<24>>24)==(0);
    if ($19) {
     $21 = 0;$r$0$lcssa = $16;
     break L4;
    } else {
     $$06$in = $$06;$8 = $17;$9 = $18;$l$04 = $15;$r$05 = $16;
    }
   }
   $$pre$pre = HEAP8[$l$04>>0]|0;
   $21 = $$pre$pre;$r$0$lcssa = $r$05;
  }
 } while(0);
 $20 = $21&255;
 $22 = (_tolower($20)|0);
 $23 = HEAP8[$r$0$lcssa>>0]|0;
 $24 = $23&255;
 $25 = (_tolower($24)|0);
 $26 = (($22) - ($25))|0;
 $$02 = $26;
 STACKTOP = sp;return ($$02|0);
}
function _strncmp($_l,$_r,$n) {
 $_l = $_l|0;
 $_r = $_r|0;
 $n = $n|0;
 var $$02 = 0, $$07 = 0, $$07$in = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $l$05 = 0, $or$cond = 0, $or$cond3 = 0, $r$0$lcssa = 0, $r$06 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n|0)==(0);
 if ($0) {
  $$02 = 0;
  STACKTOP = sp;return ($$02|0);
 }
 $1 = HEAP8[$_l>>0]|0;
 $2 = ($1<<24>>24)==(0);
 L4: do {
  if ($2) {
   $13 = 0;$r$0$lcssa = $_r;
  } else {
   $$07$in = $n;$7 = $1;$l$05 = $_l;$r$06 = $_r;
   while(1) {
    $$07 = (($$07$in) + -1)|0;
    $3 = HEAP8[$r$06>>0]|0;
    $4 = ($3<<24>>24)!=(0);
    $5 = ($$07|0)!=(0);
    $or$cond = $4 & $5;
    $6 = ($7<<24>>24)==($3<<24>>24);
    $or$cond3 = $or$cond & $6;
    if (!($or$cond3)) {
     $13 = $7;$r$0$lcssa = $r$06;
     break L4;
    }
    $8 = (($l$05) + 1|0);
    $9 = (($r$06) + 1|0);
    $10 = HEAP8[$8>>0]|0;
    $11 = ($10<<24>>24)==(0);
    if ($11) {
     $13 = 0;$r$0$lcssa = $9;
     break;
    } else {
     $$07$in = $$07;$7 = $10;$l$05 = $8;$r$06 = $9;
    }
   }
  }
 } while(0);
 $12 = $13&255;
 $14 = HEAP8[$r$0$lcssa>>0]|0;
 $15 = $14&255;
 $16 = (($12) - ($15))|0;
 $$02 = $16;
 STACKTOP = sp;return ($$02|0);
}
function _sn_write($f,$s,$l) {
 $f = $f|0;
 $s = $s|0;
 $l = $l|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = (($f) + 20|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = $1;
 $5 = $3;
 $6 = (($4) - ($5))|0;
 $7 = ($6>>>0)>($l>>>0);
 $l$ = $7 ? $l : $6;
 _memcpy(($3|0),($s|0),($l$|0))|0;
 $8 = HEAP32[$2>>2]|0;
 $9 = (($8) + ($l$)|0);
 HEAP32[$2>>2] = $9;
 STACKTOP = sp;return ($l|0);
}
function _try_realloc_chunk($p,$nb) {
 $p = $p|0;
 $nb = $nb|0;
 var $$pre = 0, $$pre$phiZ2D = 0, $$sum = 0, $$sum11 = 0, $$sum12 = 0, $$sum13 = 0, $$sum14 = 0, $$sum15 = 0, $$sum16 = 0, $$sum17 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum22 = 0, $$sum23 = 0, $$sum2728 = 0, $$sum3 = 0, $$sum4 = 0, $$sum5 = 0, $$sum78 = 0;
 var $$sum910 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0;
 var $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0;
 var $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0;
 var $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0;
 var $17 = 0, $170 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0;
 var $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0;
 var $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0;
 var $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0;
 var $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $R$0 = 0, $R$1 = 0, $RP$0 = 0, $cond = 0, $newp$0 = 0, $notlhs = 0, $notrhs = 0, $or$cond$not = 0;
 var $or$cond30 = 0, $storemerge = 0, $storemerge21 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($p) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = $1 & -8;
 $3 = (($p) + ($2)|0);
 $4 = HEAP32[((552 + 16|0))>>2]|0;
 $5 = $1 & 3;
 $notlhs = ($p>>>0)>=($4>>>0);
 $notrhs = ($5|0)!=(1);
 $or$cond$not = $notrhs & $notlhs;
 $6 = ($p>>>0)<($3>>>0);
 $or$cond30 = $or$cond$not & $6;
 if (!($or$cond30)) {
  _abort();
  // unreachable;
 }
 $$sum2728 = $2 | 4;
 $7 = (($p) + ($$sum2728)|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = $8 & 1;
 $10 = ($9|0)==(0);
 if ($10) {
  _abort();
  // unreachable;
 }
 $11 = ($5|0)==(0);
 if ($11) {
  $12 = ($nb>>>0)<(256);
  if ($12) {
   $newp$0 = 0;
   STACKTOP = sp;return ($newp$0|0);
  }
  $13 = (($nb) + 4)|0;
  $14 = ($2>>>0)<($13>>>0);
  if (!($14)) {
   $15 = (($2) - ($nb))|0;
   $16 = HEAP32[((1024 + 8|0))>>2]|0;
   $17 = $16 << 1;
   $18 = ($15>>>0)>($17>>>0);
   if (!($18)) {
    $newp$0 = $p;
    STACKTOP = sp;return ($newp$0|0);
   }
  }
  $newp$0 = 0;
  STACKTOP = sp;return ($newp$0|0);
 }
 $19 = ($2>>>0)<($nb>>>0);
 if (!($19)) {
  $20 = (($2) - ($nb))|0;
  $21 = ($20>>>0)>(15);
  if (!($21)) {
   $newp$0 = $p;
   STACKTOP = sp;return ($newp$0|0);
  }
  $22 = (($p) + ($nb)|0);
  $23 = $1 & 1;
  $24 = $23 | $nb;
  $25 = $24 | 2;
  HEAP32[$0>>2] = $25;
  $$sum23 = (($nb) + 4)|0;
  $26 = (($p) + ($$sum23)|0);
  $27 = $20 | 3;
  HEAP32[$26>>2] = $27;
  $28 = HEAP32[$7>>2]|0;
  $29 = $28 | 1;
  HEAP32[$7>>2] = $29;
  _dispose_chunk($22,$20);
  $newp$0 = $p;
  STACKTOP = sp;return ($newp$0|0);
 }
 $30 = HEAP32[((552 + 24|0))>>2]|0;
 $31 = ($3|0)==($30|0);
 if ($31) {
  $32 = HEAP32[((552 + 12|0))>>2]|0;
  $33 = (($32) + ($2))|0;
  $34 = ($33>>>0)>($nb>>>0);
  if (!($34)) {
   $newp$0 = 0;
   STACKTOP = sp;return ($newp$0|0);
  }
  $35 = (($33) - ($nb))|0;
  $36 = (($p) + ($nb)|0);
  $37 = $1 & 1;
  $38 = $37 | $nb;
  $39 = $38 | 2;
  HEAP32[$0>>2] = $39;
  $$sum22 = (($nb) + 4)|0;
  $40 = (($p) + ($$sum22)|0);
  $41 = $35 | 1;
  HEAP32[$40>>2] = $41;
  HEAP32[((552 + 24|0))>>2] = $36;
  HEAP32[((552 + 12|0))>>2] = $35;
  $newp$0 = $p;
  STACKTOP = sp;return ($newp$0|0);
 }
 $42 = HEAP32[((552 + 20|0))>>2]|0;
 $43 = ($3|0)==($42|0);
 if ($43) {
  $44 = HEAP32[((552 + 8|0))>>2]|0;
  $45 = (($44) + ($2))|0;
  $46 = ($45>>>0)<($nb>>>0);
  if ($46) {
   $newp$0 = 0;
   STACKTOP = sp;return ($newp$0|0);
  }
  $47 = (($45) - ($nb))|0;
  $48 = ($47>>>0)>(15);
  if ($48) {
   $49 = (($p) + ($nb)|0);
   $50 = (($p) + ($45)|0);
   $51 = $1 & 1;
   $52 = $51 | $nb;
   $53 = $52 | 2;
   HEAP32[$0>>2] = $53;
   $$sum19 = (($nb) + 4)|0;
   $54 = (($p) + ($$sum19)|0);
   $55 = $47 | 1;
   HEAP32[$54>>2] = $55;
   HEAP32[$50>>2] = $47;
   $$sum20 = (($45) + 4)|0;
   $56 = (($p) + ($$sum20)|0);
   $57 = HEAP32[$56>>2]|0;
   $58 = $57 & -2;
   HEAP32[$56>>2] = $58;
   $storemerge = $49;$storemerge21 = $47;
  } else {
   $59 = $1 & 1;
   $60 = $59 | $45;
   $61 = $60 | 2;
   HEAP32[$0>>2] = $61;
   $$sum17 = (($45) + 4)|0;
   $62 = (($p) + ($$sum17)|0);
   $63 = HEAP32[$62>>2]|0;
   $64 = $63 | 1;
   HEAP32[$62>>2] = $64;
   $storemerge = 0;$storemerge21 = 0;
  }
  HEAP32[((552 + 8|0))>>2] = $storemerge21;
  HEAP32[((552 + 20|0))>>2] = $storemerge;
  $newp$0 = $p;
  STACKTOP = sp;return ($newp$0|0);
 }
 $65 = $8 & 2;
 $66 = ($65|0)==(0);
 if (!($66)) {
  $newp$0 = 0;
  STACKTOP = sp;return ($newp$0|0);
 }
 $67 = $8 & -8;
 $68 = (($67) + ($2))|0;
 $69 = ($68>>>0)<($nb>>>0);
 if ($69) {
  $newp$0 = 0;
  STACKTOP = sp;return ($newp$0|0);
 }
 $70 = (($68) - ($nb))|0;
 $71 = $8 >>> 3;
 $72 = ($8>>>0)<(256);
 do {
  if ($72) {
   $$sum15 = (($2) + 8)|0;
   $73 = (($p) + ($$sum15)|0);
   $74 = HEAP32[$73>>2]|0;
   $$sum16 = (($2) + 12)|0;
   $75 = (($p) + ($$sum16)|0);
   $76 = HEAP32[$75>>2]|0;
   $77 = $71 << 1;
   $78 = ((552 + ($77<<2)|0) + 40|0);
   $79 = ($74|0)==($78|0);
   if (!($79)) {
    $80 = ($74>>>0)<($4>>>0);
    if ($80) {
     _abort();
     // unreachable;
    }
    $81 = (($74) + 12|0);
    $82 = HEAP32[$81>>2]|0;
    $83 = ($82|0)==($3|0);
    if (!($83)) {
     _abort();
     // unreachable;
    }
   }
   $84 = ($76|0)==($74|0);
   if ($84) {
    $85 = 1 << $71;
    $86 = $85 ^ -1;
    $87 = HEAP32[552>>2]|0;
    $88 = $87 & $86;
    HEAP32[552>>2] = $88;
    break;
   }
   $89 = ($76|0)==($78|0);
   if ($89) {
    $$pre = (($76) + 8|0);
    $$pre$phiZ2D = $$pre;
   } else {
    $90 = ($76>>>0)<($4>>>0);
    if ($90) {
     _abort();
     // unreachable;
    }
    $91 = (($76) + 8|0);
    $92 = HEAP32[$91>>2]|0;
    $93 = ($92|0)==($3|0);
    if ($93) {
     $$pre$phiZ2D = $91;
    } else {
     _abort();
     // unreachable;
    }
   }
   $94 = (($74) + 12|0);
   HEAP32[$94>>2] = $76;
   HEAP32[$$pre$phiZ2D>>2] = $74;
  } else {
   $$sum = (($2) + 24)|0;
   $95 = (($p) + ($$sum)|0);
   $96 = HEAP32[$95>>2]|0;
   $$sum2 = (($2) + 12)|0;
   $97 = (($p) + ($$sum2)|0);
   $98 = HEAP32[$97>>2]|0;
   $99 = ($98|0)==($3|0);
   do {
    if ($99) {
     $$sum4 = (($2) + 20)|0;
     $109 = (($p) + ($$sum4)|0);
     $110 = HEAP32[$109>>2]|0;
     $111 = ($110|0)==(0|0);
     if ($111) {
      $$sum3 = (($2) + 16)|0;
      $112 = (($p) + ($$sum3)|0);
      $113 = HEAP32[$112>>2]|0;
      $114 = ($113|0)==(0|0);
      if ($114) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $113;$RP$0 = $112;
      }
     } else {
      $R$0 = $110;$RP$0 = $109;
     }
     while(1) {
      $115 = (($R$0) + 20|0);
      $116 = HEAP32[$115>>2]|0;
      $117 = ($116|0)==(0|0);
      if (!($117)) {
       $R$0 = $116;$RP$0 = $115;
       continue;
      }
      $118 = (($R$0) + 16|0);
      $119 = HEAP32[$118>>2]|0;
      $120 = ($119|0)==(0|0);
      if ($120) {
       break;
      } else {
       $R$0 = $119;$RP$0 = $118;
      }
     }
     $121 = ($RP$0>>>0)<($4>>>0);
     if ($121) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0>>2] = 0;
      $R$1 = $R$0;
      break;
     }
    } else {
     $$sum14 = (($2) + 8)|0;
     $100 = (($p) + ($$sum14)|0);
     $101 = HEAP32[$100>>2]|0;
     $102 = ($101>>>0)<($4>>>0);
     if ($102) {
      _abort();
      // unreachable;
     }
     $103 = (($101) + 12|0);
     $104 = HEAP32[$103>>2]|0;
     $105 = ($104|0)==($3|0);
     if (!($105)) {
      _abort();
      // unreachable;
     }
     $106 = (($98) + 8|0);
     $107 = HEAP32[$106>>2]|0;
     $108 = ($107|0)==($3|0);
     if ($108) {
      HEAP32[$103>>2] = $98;
      HEAP32[$106>>2] = $101;
      $R$1 = $98;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $122 = ($96|0)==(0|0);
   if (!($122)) {
    $$sum11 = (($2) + 28)|0;
    $123 = (($p) + ($$sum11)|0);
    $124 = HEAP32[$123>>2]|0;
    $125 = ((552 + ($124<<2)|0) + 304|0);
    $126 = HEAP32[$125>>2]|0;
    $127 = ($3|0)==($126|0);
    if ($127) {
     HEAP32[$125>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $128 = 1 << $124;
      $129 = $128 ^ -1;
      $130 = HEAP32[((552 + 4|0))>>2]|0;
      $131 = $130 & $129;
      HEAP32[((552 + 4|0))>>2] = $131;
      break;
     }
    } else {
     $132 = HEAP32[((552 + 16|0))>>2]|0;
     $133 = ($96>>>0)<($132>>>0);
     if ($133) {
      _abort();
      // unreachable;
     }
     $134 = (($96) + 16|0);
     $135 = HEAP32[$134>>2]|0;
     $136 = ($135|0)==($3|0);
     if ($136) {
      HEAP32[$134>>2] = $R$1;
     } else {
      $137 = (($96) + 20|0);
      HEAP32[$137>>2] = $R$1;
     }
     $138 = ($R$1|0)==(0|0);
     if ($138) {
      break;
     }
    }
    $139 = HEAP32[((552 + 16|0))>>2]|0;
    $140 = ($R$1>>>0)<($139>>>0);
    if ($140) {
     _abort();
     // unreachable;
    }
    $141 = (($R$1) + 24|0);
    HEAP32[$141>>2] = $96;
    $$sum12 = (($2) + 16)|0;
    $142 = (($p) + ($$sum12)|0);
    $143 = HEAP32[$142>>2]|0;
    $144 = ($143|0)==(0|0);
    do {
     if (!($144)) {
      $145 = ($143>>>0)<($139>>>0);
      if ($145) {
       _abort();
       // unreachable;
      } else {
       $146 = (($R$1) + 16|0);
       HEAP32[$146>>2] = $143;
       $147 = (($143) + 24|0);
       HEAP32[$147>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum13 = (($2) + 20)|0;
    $148 = (($p) + ($$sum13)|0);
    $149 = HEAP32[$148>>2]|0;
    $150 = ($149|0)==(0|0);
    if (!($150)) {
     $151 = HEAP32[((552 + 16|0))>>2]|0;
     $152 = ($149>>>0)<($151>>>0);
     if ($152) {
      _abort();
      // unreachable;
     } else {
      $153 = (($R$1) + 20|0);
      HEAP32[$153>>2] = $149;
      $154 = (($149) + 24|0);
      HEAP32[$154>>2] = $R$1;
      break;
     }
    }
   }
  }
 } while(0);
 $155 = ($70>>>0)<(16);
 if ($155) {
  $156 = $1 & 1;
  $157 = $68 | $156;
  $158 = $157 | 2;
  HEAP32[$0>>2] = $158;
  $$sum910 = $68 | 4;
  $159 = (($p) + ($$sum910)|0);
  $160 = HEAP32[$159>>2]|0;
  $161 = $160 | 1;
  HEAP32[$159>>2] = $161;
  $newp$0 = $p;
  STACKTOP = sp;return ($newp$0|0);
 } else {
  $162 = (($p) + ($nb)|0);
  $163 = $1 & 1;
  $164 = $163 | $nb;
  $165 = $164 | 2;
  HEAP32[$0>>2] = $165;
  $$sum5 = (($nb) + 4)|0;
  $166 = (($p) + ($$sum5)|0);
  $167 = $70 | 3;
  HEAP32[$166>>2] = $167;
  $$sum78 = $68 | 4;
  $168 = (($p) + ($$sum78)|0);
  $169 = HEAP32[$168>>2]|0;
  $170 = $169 | 1;
  HEAP32[$168>>2] = $170;
  _dispose_chunk($162,$70);
  $newp$0 = $p;
  STACKTOP = sp;return ($newp$0|0);
 }
 return (0)|0;
}
function _internal_memalign($alignment,$bytes) {
 $alignment = $alignment|0;
 $bytes = $bytes|0;
 var $$1 = 0, $$alignment = 0, $$sum1 = 0, $$sum2 = 0, $$sum3 = 0, $$sum4 = 0, $$sum6 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0;
 var $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0;
 var $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0;
 var $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0;
 var $75 = 0, $76 = 0, $77 = 0, $8 = 0, $9 = 0, $a$0 = 0, $mem$0 = 0, $p$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($alignment>>>0)<(16);
 $$alignment = $0 ? 16 : $alignment;
 $1 = (($$alignment) + -1)|0;
 $2 = $1 & $$alignment;
 $3 = ($2|0)==(0);
 if ($3) {
  $$1 = $$alignment;
 } else {
  $a$0 = 16;
  while(1) {
   $4 = ($a$0>>>0)<($$alignment>>>0);
   $5 = $a$0 << 1;
   if ($4) {
    $a$0 = $5;
   } else {
    $$1 = $a$0;
    break;
   }
  }
 }
 $6 = (-64 - ($$1))|0;
 $7 = ($6>>>0)>($bytes>>>0);
 if (!($7)) {
  $8 = (___errno_location()|0);
  HEAP32[$8>>2] = 12;
  $mem$0 = 0;
  STACKTOP = sp;return ($mem$0|0);
 }
 $9 = ($bytes>>>0)<(11);
 if ($9) {
  $14 = 16;
 } else {
  $10 = (($bytes) + 11)|0;
  $11 = $10 & -8;
  $14 = $11;
 }
 $12 = (($$1) + 12)|0;
 $13 = (($12) + ($14))|0;
 $15 = (_malloc($13)|0);
 $16 = ($15|0)==(0|0);
 if ($16) {
  $mem$0 = 0;
  STACKTOP = sp;return ($mem$0|0);
 }
 $17 = (($15) + -8|0);
 $18 = $15;
 $19 = (($$1) + -1)|0;
 $20 = $18 & $19;
 $21 = ($20|0)==(0);
 do {
  if ($21) {
   $p$0 = $17;
  } else {
   $22 = (($15) + ($19)|0);
   $23 = $22;
   $24 = (0 - ($$1))|0;
   $25 = $23 & $24;
   $26 = $25;
   $27 = (($26) + -8|0);
   $28 = $27;
   $29 = $17;
   $30 = (($28) - ($29))|0;
   $31 = ($30>>>0)>(15);
   if ($31) {
    $34 = $27;
   } else {
    $$sum3 = (($$1) + -8)|0;
    $32 = (($26) + ($$sum3)|0);
    $34 = $32;
   }
   $33 = $34;
   $35 = (($33) - ($29))|0;
   $36 = (($15) + -4|0);
   $37 = HEAP32[$36>>2]|0;
   $38 = $37 & -8;
   $39 = (($38) - ($35))|0;
   $40 = $37 & 3;
   $41 = ($40|0)==(0);
   if ($41) {
    $42 = HEAP32[$17>>2]|0;
    $43 = (($42) + ($35))|0;
    HEAP32[$34>>2] = $43;
    $44 = (($34) + 4|0);
    HEAP32[$44>>2] = $39;
    $p$0 = $34;
    break;
   } else {
    $45 = (($34) + 4|0);
    $46 = HEAP32[$45>>2]|0;
    $47 = $46 & 1;
    $48 = $39 | $47;
    $49 = $48 | 2;
    HEAP32[$45>>2] = $49;
    $$sum4 = (($39) + 4)|0;
    $50 = (($34) + ($$sum4)|0);
    $51 = HEAP32[$50>>2]|0;
    $52 = $51 | 1;
    HEAP32[$50>>2] = $52;
    $53 = HEAP32[$36>>2]|0;
    $54 = $53 & 1;
    $55 = $35 | $54;
    $56 = $55 | 2;
    HEAP32[$36>>2] = $56;
    $$sum6 = (($35) + -4)|0;
    $57 = (($15) + ($$sum6)|0);
    $58 = HEAP32[$57>>2]|0;
    $59 = $58 | 1;
    HEAP32[$57>>2] = $59;
    _dispose_chunk($17,$35);
    $p$0 = $34;
    break;
   }
  }
 } while(0);
 $60 = (($p$0) + 4|0);
 $61 = HEAP32[$60>>2]|0;
 $62 = $61 & 3;
 $63 = ($62|0)==(0);
 if (!($63)) {
  $64 = $61 & -8;
  $65 = (($14) + 16)|0;
  $66 = ($64>>>0)>($65>>>0);
  if ($66) {
   $67 = (($64) - ($14))|0;
   $68 = (($p$0) + ($14)|0);
   $69 = $61 & 1;
   $70 = $14 | $69;
   $71 = $70 | 2;
   HEAP32[$60>>2] = $71;
   $$sum1 = $14 | 4;
   $72 = (($p$0) + ($$sum1)|0);
   $73 = $67 | 3;
   HEAP32[$72>>2] = $73;
   $$sum2 = $64 | 4;
   $74 = (($p$0) + ($$sum2)|0);
   $75 = HEAP32[$74>>2]|0;
   $76 = $75 | 1;
   HEAP32[$74>>2] = $76;
   _dispose_chunk($68,$67);
  }
 }
 $77 = (($p$0) + 8|0);
 $mem$0 = $77;
 STACKTOP = sp;return ($mem$0|0);
}
function _ialloc($n_elements,$sizes,$opts,$chunks) {
 $n_elements = $n_elements|0;
 $sizes = $sizes|0;
 $opts = $opts|0;
 $chunks = $chunks|0;
 var $$0 = 0, $$sum = 0, $$sum11 = 0, $$sum2 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $8 = 0, $9 = 0;
 var $array_size$0 = 0, $contents_size$07 = 0, $contents_size$1 = 0, $element_size$0 = 0, $i$08 = 0, $i$15 = 0, $i$15$us = 0, $marray$0 = 0, $marray$1 = 0, $p$0$in$lcssa = 0, $p$0$in3 = 0, $p$0$in3$us = 0, $remainder_size$0 = 0, $remainder_size$1$lcssa = 0, $remainder_size$14 = 0, $remainder_size$14$us = 0, $size$0$us = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1024>>2]|0;
 $1 = ($0|0)==(0);
 do {
  if ($1) {
   $2 = (_sysconf(30)|0);
   $3 = (($2) + -1)|0;
   $4 = $3 & $2;
   $5 = ($4|0)==(0);
   if ($5) {
    HEAP32[((1024 + 8|0))>>2] = $2;
    HEAP32[((1024 + 4|0))>>2] = $2;
    HEAP32[((1024 + 12|0))>>2] = -1;
    HEAP32[((1024 + 16|0))>>2] = -1;
    HEAP32[((1024 + 20|0))>>2] = 0;
    HEAP32[((552 + 444|0))>>2] = 0;
    $6 = (_time((0|0))|0);
    $7 = $6 & -16;
    $8 = $7 ^ 1431655768;
    HEAP32[1024>>2] = $8;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $9 = ($chunks|0)==(0|0);
 $10 = ($n_elements|0)==(0);
 do {
  if ($9) {
   if ($10) {
    $11 = (_malloc(0)|0);
    $$0 = $11;
    STACKTOP = sp;return ($$0|0);
   } else {
    $12 = $n_elements << 2;
    $13 = ($12>>>0)<(11);
    if ($13) {
     $array_size$0 = 16;$marray$0 = 0;
     break;
    }
    $14 = (($12) + 11)|0;
    $15 = $14 & -8;
    $array_size$0 = $15;$marray$0 = 0;
    break;
   }
  } else {
   if ($10) {
    $$0 = $chunks;
    STACKTOP = sp;return ($$0|0);
   } else {
    $array_size$0 = 0;$marray$0 = $chunks;
   }
  }
 } while(0);
 $16 = $opts & 1;
 $17 = ($16|0)==(0);
 if ($17) {
  if ($10) {
   $contents_size$1 = 0;$element_size$0 = 0;
  } else {
   $contents_size$07 = 0;$i$08 = 0;
   while(1) {
    $24 = (($sizes) + ($i$08<<2)|0);
    $25 = HEAP32[$24>>2]|0;
    $26 = ($25>>>0)<(11);
    if ($26) {
     $30 = 16;
    } else {
     $27 = (($25) + 11)|0;
     $28 = $27 & -8;
     $30 = $28;
    }
    $29 = (($30) + ($contents_size$07))|0;
    $31 = (($i$08) + 1)|0;
    $32 = ($31|0)==($n_elements|0);
    if ($32) {
     $contents_size$1 = $29;$element_size$0 = 0;
     break;
    } else {
     $contents_size$07 = $29;$i$08 = $31;
    }
   }
  }
 } else {
  $18 = HEAP32[$sizes>>2]|0;
  $19 = ($18>>>0)<(11);
  if ($19) {
   $23 = 16;
  } else {
   $20 = (($18) + 11)|0;
   $21 = $20 & -8;
   $23 = $21;
  }
  $22 = Math_imul($23, $n_elements)|0;
  $contents_size$1 = $22;$element_size$0 = $23;
 }
 $33 = (($array_size$0) + -4)|0;
 $34 = (($33) + ($contents_size$1))|0;
 $35 = (_malloc($34)|0);
 $36 = ($35|0)==(0|0);
 if ($36) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $37 = (($35) + -8|0);
 $38 = (($35) + -4|0);
 $39 = HEAP32[$38>>2]|0;
 $40 = $39 & -8;
 $41 = $opts & 2;
 $42 = ($41|0)==(0);
 if (!($42)) {
  $43 = (-4 - ($array_size$0))|0;
  $44 = (($43) + ($40))|0;
  _memset(($35|0),0,($44|0))|0;
 }
 $45 = ($marray$0|0)==(0|0);
 if ($45) {
  $46 = (($40) - ($contents_size$1))|0;
  $47 = (($35) + ($contents_size$1)|0);
  $48 = $46 | 3;
  $$sum2 = (($contents_size$1) + -4)|0;
  $49 = (($35) + ($$sum2)|0);
  HEAP32[$49>>2] = $48;
  $marray$1 = $47;$remainder_size$0 = $contents_size$1;
 } else {
  $marray$1 = $marray$0;$remainder_size$0 = $40;
 }
 HEAP32[$marray$1>>2] = $35;
 $50 = (($n_elements) + -1)|0;
 $51 = ($50|0)==(0);
 L38: do {
  if ($51) {
   $p$0$in$lcssa = $37;$remainder_size$1$lcssa = $remainder_size$0;
  } else {
   $52 = ($element_size$0|0)==(0);
   if ($52) {
    $i$15$us = 0;$p$0$in3$us = $37;$remainder_size$14$us = $remainder_size$0;
   } else {
    $i$15 = 0;$p$0$in3 = $37;$remainder_size$14 = $remainder_size$0;
    while(1) {
     $66 = (($remainder_size$14) - ($element_size$0))|0;
     $67 = $element_size$0 | 3;
     $68 = (($p$0$in3) + 4|0);
     HEAP32[$68>>2] = $67;
     $69 = (($p$0$in3) + ($element_size$0)|0);
     $70 = (($i$15) + 1)|0;
     $$sum = (($element_size$0) + 8)|0;
     $71 = (($p$0$in3) + ($$sum)|0);
     $72 = (($marray$1) + ($70<<2)|0);
     HEAP32[$72>>2] = $71;
     $73 = ($70|0)==($50|0);
     if ($73) {
      $p$0$in$lcssa = $69;$remainder_size$1$lcssa = $66;
      break L38;
     } else {
      $i$15 = $70;$p$0$in3 = $69;$remainder_size$14 = $66;
     }
    }
   }
   while(1) {
    $53 = (($sizes) + ($i$15$us<<2)|0);
    $54 = HEAP32[$53>>2]|0;
    $55 = ($54>>>0)<(11);
    if ($55) {
     $size$0$us = 16;
    } else {
     $56 = (($54) + 11)|0;
     $57 = $56 & -8;
     $size$0$us = $57;
    }
    $58 = (($remainder_size$14$us) - ($size$0$us))|0;
    $59 = $size$0$us | 3;
    $60 = (($p$0$in3$us) + 4|0);
    HEAP32[$60>>2] = $59;
    $61 = (($p$0$in3$us) + ($size$0$us)|0);
    $62 = (($i$15$us) + 1)|0;
    $$sum11 = (($size$0$us) + 8)|0;
    $63 = (($p$0$in3$us) + ($$sum11)|0);
    $64 = (($marray$1) + ($62<<2)|0);
    HEAP32[$64>>2] = $63;
    $65 = ($62|0)==($50|0);
    if ($65) {
     $p$0$in$lcssa = $61;$remainder_size$1$lcssa = $58;
     break;
    } else {
     $i$15$us = $62;$p$0$in3$us = $61;$remainder_size$14$us = $58;
    }
   }
  }
 } while(0);
 $74 = $remainder_size$1$lcssa | 3;
 $75 = (($p$0$in$lcssa) + 4|0);
 HEAP32[$75>>2] = $74;
 $$0 = $marray$1;
 STACKTOP = sp;return ($$0|0);
}
function _dispose_chunk($p,$psize) {
 $p = $p|0;
 $psize = $psize|0;
 var $$0 = 0, $$02 = 0, $$1 = 0, $$pre = 0, $$pre$phi57Z2D = 0, $$pre$phi59Z2D = 0, $$pre$phiZ2D = 0, $$pre56 = 0, $$pre58 = 0, $$sum = 0, $$sum1 = 0, $$sum12$pre = 0, $$sum13 = 0, $$sum14 = 0, $$sum15 = 0, $$sum16 = 0, $$sum17 = 0, $$sum18 = 0, $$sum19 = 0, $$sum2 = 0;
 var $$sum20 = 0, $$sum22 = 0, $$sum23 = 0, $$sum24 = 0, $$sum25 = 0, $$sum26 = 0, $$sum27 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0, $$sum31 = 0, $$sum4 = 0, $$sum5 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0;
 var $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0;
 var $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0;
 var $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0;
 var $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0;
 var $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0;
 var $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0;
 var $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0;
 var $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0;
 var $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0;
 var $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0;
 var $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0;
 var $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, $F16$0 = 0, $I19$0 = 0, $I19$0$c = 0, $K20$050 = 0, $R$0 = 0, $R$1 = 0, $R7$0 = 0, $R7$1 = 0, $RP$0 = 0, $RP9$0 = 0, $T$0$lcssa = 0, $T$049 = 0, $cond = 0, $cond46 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($p) + ($psize)|0);
 $1 = (($p) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = $2 & 1;
 $4 = ($3|0)==(0);
 do {
  if ($4) {
   $5 = HEAP32[$p>>2]|0;
   $6 = $2 & 3;
   $7 = ($6|0)==(0);
   if ($7) {
    STACKTOP = sp;return;
   }
   $8 = (0 - ($5))|0;
   $9 = (($p) + ($8)|0);
   $10 = (($5) + ($psize))|0;
   $11 = HEAP32[((552 + 16|0))>>2]|0;
   $12 = ($9>>>0)<($11>>>0);
   if ($12) {
    _abort();
    // unreachable;
   }
   $13 = HEAP32[((552 + 20|0))>>2]|0;
   $14 = ($9|0)==($13|0);
   if ($14) {
    $$sum = (($psize) + 4)|0;
    $99 = (($p) + ($$sum)|0);
    $100 = HEAP32[$99>>2]|0;
    $101 = $100 & 3;
    $102 = ($101|0)==(3);
    if (!($102)) {
     $$0 = $9;$$02 = $10;
     break;
    }
    HEAP32[((552 + 8|0))>>2] = $10;
    $103 = $100 & -2;
    HEAP32[$99>>2] = $103;
    $104 = $10 | 1;
    $$sum20 = (4 - ($5))|0;
    $105 = (($p) + ($$sum20)|0);
    HEAP32[$105>>2] = $104;
    HEAP32[$0>>2] = $10;
    STACKTOP = sp;return;
   }
   $15 = $5 >>> 3;
   $16 = ($5>>>0)<(256);
   if ($16) {
    $$sum30 = (8 - ($5))|0;
    $17 = (($p) + ($$sum30)|0);
    $18 = HEAP32[$17>>2]|0;
    $$sum31 = (12 - ($5))|0;
    $19 = (($p) + ($$sum31)|0);
    $20 = HEAP32[$19>>2]|0;
    $21 = $15 << 1;
    $22 = ((552 + ($21<<2)|0) + 40|0);
    $23 = ($18|0)==($22|0);
    if (!($23)) {
     $24 = ($18>>>0)<($11>>>0);
     if ($24) {
      _abort();
      // unreachable;
     }
     $25 = (($18) + 12|0);
     $26 = HEAP32[$25>>2]|0;
     $27 = ($26|0)==($9|0);
     if (!($27)) {
      _abort();
      // unreachable;
     }
    }
    $28 = ($20|0)==($18|0);
    if ($28) {
     $29 = 1 << $15;
     $30 = $29 ^ -1;
     $31 = HEAP32[552>>2]|0;
     $32 = $31 & $30;
     HEAP32[552>>2] = $32;
     $$0 = $9;$$02 = $10;
     break;
    }
    $33 = ($20|0)==($22|0);
    if ($33) {
     $$pre58 = (($20) + 8|0);
     $$pre$phi59Z2D = $$pre58;
    } else {
     $34 = ($20>>>0)<($11>>>0);
     if ($34) {
      _abort();
      // unreachable;
     }
     $35 = (($20) + 8|0);
     $36 = HEAP32[$35>>2]|0;
     $37 = ($36|0)==($9|0);
     if ($37) {
      $$pre$phi59Z2D = $35;
     } else {
      _abort();
      // unreachable;
     }
    }
    $38 = (($18) + 12|0);
    HEAP32[$38>>2] = $20;
    HEAP32[$$pre$phi59Z2D>>2] = $18;
    $$0 = $9;$$02 = $10;
    break;
   }
   $$sum22 = (24 - ($5))|0;
   $39 = (($p) + ($$sum22)|0);
   $40 = HEAP32[$39>>2]|0;
   $$sum23 = (12 - ($5))|0;
   $41 = (($p) + ($$sum23)|0);
   $42 = HEAP32[$41>>2]|0;
   $43 = ($42|0)==($9|0);
   do {
    if ($43) {
     $$sum24 = (16 - ($5))|0;
     $$sum25 = (($$sum24) + 4)|0;
     $53 = (($p) + ($$sum25)|0);
     $54 = HEAP32[$53>>2]|0;
     $55 = ($54|0)==(0|0);
     if ($55) {
      $56 = (($p) + ($$sum24)|0);
      $57 = HEAP32[$56>>2]|0;
      $58 = ($57|0)==(0|0);
      if ($58) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $57;$RP$0 = $56;
      }
     } else {
      $R$0 = $54;$RP$0 = $53;
     }
     while(1) {
      $59 = (($R$0) + 20|0);
      $60 = HEAP32[$59>>2]|0;
      $61 = ($60|0)==(0|0);
      if (!($61)) {
       $R$0 = $60;$RP$0 = $59;
       continue;
      }
      $62 = (($R$0) + 16|0);
      $63 = HEAP32[$62>>2]|0;
      $64 = ($63|0)==(0|0);
      if ($64) {
       break;
      } else {
       $R$0 = $63;$RP$0 = $62;
      }
     }
     $65 = ($RP$0>>>0)<($11>>>0);
     if ($65) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0>>2] = 0;
      $R$1 = $R$0;
      break;
     }
    } else {
     $$sum29 = (8 - ($5))|0;
     $44 = (($p) + ($$sum29)|0);
     $45 = HEAP32[$44>>2]|0;
     $46 = ($45>>>0)<($11>>>0);
     if ($46) {
      _abort();
      // unreachable;
     }
     $47 = (($45) + 12|0);
     $48 = HEAP32[$47>>2]|0;
     $49 = ($48|0)==($9|0);
     if (!($49)) {
      _abort();
      // unreachable;
     }
     $50 = (($42) + 8|0);
     $51 = HEAP32[$50>>2]|0;
     $52 = ($51|0)==($9|0);
     if ($52) {
      HEAP32[$47>>2] = $42;
      HEAP32[$50>>2] = $45;
      $R$1 = $42;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $66 = ($40|0)==(0|0);
   if ($66) {
    $$0 = $9;$$02 = $10;
   } else {
    $$sum26 = (28 - ($5))|0;
    $67 = (($p) + ($$sum26)|0);
    $68 = HEAP32[$67>>2]|0;
    $69 = ((552 + ($68<<2)|0) + 304|0);
    $70 = HEAP32[$69>>2]|0;
    $71 = ($9|0)==($70|0);
    if ($71) {
     HEAP32[$69>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $72 = 1 << $68;
      $73 = $72 ^ -1;
      $74 = HEAP32[((552 + 4|0))>>2]|0;
      $75 = $74 & $73;
      HEAP32[((552 + 4|0))>>2] = $75;
      $$0 = $9;$$02 = $10;
      break;
     }
    } else {
     $76 = HEAP32[((552 + 16|0))>>2]|0;
     $77 = ($40>>>0)<($76>>>0);
     if ($77) {
      _abort();
      // unreachable;
     }
     $78 = (($40) + 16|0);
     $79 = HEAP32[$78>>2]|0;
     $80 = ($79|0)==($9|0);
     if ($80) {
      HEAP32[$78>>2] = $R$1;
     } else {
      $81 = (($40) + 20|0);
      HEAP32[$81>>2] = $R$1;
     }
     $82 = ($R$1|0)==(0|0);
     if ($82) {
      $$0 = $9;$$02 = $10;
      break;
     }
    }
    $83 = HEAP32[((552 + 16|0))>>2]|0;
    $84 = ($R$1>>>0)<($83>>>0);
    if ($84) {
     _abort();
     // unreachable;
    }
    $85 = (($R$1) + 24|0);
    HEAP32[$85>>2] = $40;
    $$sum27 = (16 - ($5))|0;
    $86 = (($p) + ($$sum27)|0);
    $87 = HEAP32[$86>>2]|0;
    $88 = ($87|0)==(0|0);
    do {
     if (!($88)) {
      $89 = ($87>>>0)<($83>>>0);
      if ($89) {
       _abort();
       // unreachable;
      } else {
       $90 = (($R$1) + 16|0);
       HEAP32[$90>>2] = $87;
       $91 = (($87) + 24|0);
       HEAP32[$91>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum28 = (($$sum27) + 4)|0;
    $92 = (($p) + ($$sum28)|0);
    $93 = HEAP32[$92>>2]|0;
    $94 = ($93|0)==(0|0);
    if ($94) {
     $$0 = $9;$$02 = $10;
    } else {
     $95 = HEAP32[((552 + 16|0))>>2]|0;
     $96 = ($93>>>0)<($95>>>0);
     if ($96) {
      _abort();
      // unreachable;
     } else {
      $97 = (($R$1) + 20|0);
      HEAP32[$97>>2] = $93;
      $98 = (($93) + 24|0);
      HEAP32[$98>>2] = $R$1;
      $$0 = $9;$$02 = $10;
      break;
     }
    }
   }
  } else {
   $$0 = $p;$$02 = $psize;
  }
 } while(0);
 $106 = HEAP32[((552 + 16|0))>>2]|0;
 $107 = ($0>>>0)<($106>>>0);
 if ($107) {
  _abort();
  // unreachable;
 }
 $$sum1 = (($psize) + 4)|0;
 $108 = (($p) + ($$sum1)|0);
 $109 = HEAP32[$108>>2]|0;
 $110 = $109 & 2;
 $111 = ($110|0)==(0);
 if ($111) {
  $112 = HEAP32[((552 + 24|0))>>2]|0;
  $113 = ($0|0)==($112|0);
  if ($113) {
   $114 = HEAP32[((552 + 12|0))>>2]|0;
   $115 = (($114) + ($$02))|0;
   HEAP32[((552 + 12|0))>>2] = $115;
   HEAP32[((552 + 24|0))>>2] = $$0;
   $116 = $115 | 1;
   $117 = (($$0) + 4|0);
   HEAP32[$117>>2] = $116;
   $118 = HEAP32[((552 + 20|0))>>2]|0;
   $119 = ($$0|0)==($118|0);
   if (!($119)) {
    STACKTOP = sp;return;
   }
   HEAP32[((552 + 20|0))>>2] = 0;
   HEAP32[((552 + 8|0))>>2] = 0;
   STACKTOP = sp;return;
  }
  $120 = HEAP32[((552 + 20|0))>>2]|0;
  $121 = ($0|0)==($120|0);
  if ($121) {
   $122 = HEAP32[((552 + 8|0))>>2]|0;
   $123 = (($122) + ($$02))|0;
   HEAP32[((552 + 8|0))>>2] = $123;
   HEAP32[((552 + 20|0))>>2] = $$0;
   $124 = $123 | 1;
   $125 = (($$0) + 4|0);
   HEAP32[$125>>2] = $124;
   $126 = (($$0) + ($123)|0);
   HEAP32[$126>>2] = $123;
   STACKTOP = sp;return;
  }
  $127 = $109 & -8;
  $128 = (($127) + ($$02))|0;
  $129 = $109 >>> 3;
  $130 = ($109>>>0)<(256);
  do {
   if ($130) {
    $$sum18 = (($psize) + 8)|0;
    $131 = (($p) + ($$sum18)|0);
    $132 = HEAP32[$131>>2]|0;
    $$sum19 = (($psize) + 12)|0;
    $133 = (($p) + ($$sum19)|0);
    $134 = HEAP32[$133>>2]|0;
    $135 = $129 << 1;
    $136 = ((552 + ($135<<2)|0) + 40|0);
    $137 = ($132|0)==($136|0);
    if (!($137)) {
     $138 = ($132>>>0)<($106>>>0);
     if ($138) {
      _abort();
      // unreachable;
     }
     $139 = (($132) + 12|0);
     $140 = HEAP32[$139>>2]|0;
     $141 = ($140|0)==($0|0);
     if (!($141)) {
      _abort();
      // unreachable;
     }
    }
    $142 = ($134|0)==($132|0);
    if ($142) {
     $143 = 1 << $129;
     $144 = $143 ^ -1;
     $145 = HEAP32[552>>2]|0;
     $146 = $145 & $144;
     HEAP32[552>>2] = $146;
     break;
    }
    $147 = ($134|0)==($136|0);
    if ($147) {
     $$pre56 = (($134) + 8|0);
     $$pre$phi57Z2D = $$pre56;
    } else {
     $148 = ($134>>>0)<($106>>>0);
     if ($148) {
      _abort();
      // unreachable;
     }
     $149 = (($134) + 8|0);
     $150 = HEAP32[$149>>2]|0;
     $151 = ($150|0)==($0|0);
     if ($151) {
      $$pre$phi57Z2D = $149;
     } else {
      _abort();
      // unreachable;
     }
    }
    $152 = (($132) + 12|0);
    HEAP32[$152>>2] = $134;
    HEAP32[$$pre$phi57Z2D>>2] = $132;
   } else {
    $$sum2 = (($psize) + 24)|0;
    $153 = (($p) + ($$sum2)|0);
    $154 = HEAP32[$153>>2]|0;
    $$sum3 = (($psize) + 12)|0;
    $155 = (($p) + ($$sum3)|0);
    $156 = HEAP32[$155>>2]|0;
    $157 = ($156|0)==($0|0);
    do {
     if ($157) {
      $$sum5 = (($psize) + 20)|0;
      $167 = (($p) + ($$sum5)|0);
      $168 = HEAP32[$167>>2]|0;
      $169 = ($168|0)==(0|0);
      if ($169) {
       $$sum4 = (($psize) + 16)|0;
       $170 = (($p) + ($$sum4)|0);
       $171 = HEAP32[$170>>2]|0;
       $172 = ($171|0)==(0|0);
       if ($172) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $171;$RP9$0 = $170;
       }
      } else {
       $R7$0 = $168;$RP9$0 = $167;
      }
      while(1) {
       $173 = (($R7$0) + 20|0);
       $174 = HEAP32[$173>>2]|0;
       $175 = ($174|0)==(0|0);
       if (!($175)) {
        $R7$0 = $174;$RP9$0 = $173;
        continue;
       }
       $176 = (($R7$0) + 16|0);
       $177 = HEAP32[$176>>2]|0;
       $178 = ($177|0)==(0|0);
       if ($178) {
        break;
       } else {
        $R7$0 = $177;$RP9$0 = $176;
       }
      }
      $179 = ($RP9$0>>>0)<($106>>>0);
      if ($179) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0>>2] = 0;
       $R7$1 = $R7$0;
       break;
      }
     } else {
      $$sum17 = (($psize) + 8)|0;
      $158 = (($p) + ($$sum17)|0);
      $159 = HEAP32[$158>>2]|0;
      $160 = ($159>>>0)<($106>>>0);
      if ($160) {
       _abort();
       // unreachable;
      }
      $161 = (($159) + 12|0);
      $162 = HEAP32[$161>>2]|0;
      $163 = ($162|0)==($0|0);
      if (!($163)) {
       _abort();
       // unreachable;
      }
      $164 = (($156) + 8|0);
      $165 = HEAP32[$164>>2]|0;
      $166 = ($165|0)==($0|0);
      if ($166) {
       HEAP32[$161>>2] = $156;
       HEAP32[$164>>2] = $159;
       $R7$1 = $156;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $180 = ($154|0)==(0|0);
    if (!($180)) {
     $$sum14 = (($psize) + 28)|0;
     $181 = (($p) + ($$sum14)|0);
     $182 = HEAP32[$181>>2]|0;
     $183 = ((552 + ($182<<2)|0) + 304|0);
     $184 = HEAP32[$183>>2]|0;
     $185 = ($0|0)==($184|0);
     if ($185) {
      HEAP32[$183>>2] = $R7$1;
      $cond46 = ($R7$1|0)==(0|0);
      if ($cond46) {
       $186 = 1 << $182;
       $187 = $186 ^ -1;
       $188 = HEAP32[((552 + 4|0))>>2]|0;
       $189 = $188 & $187;
       HEAP32[((552 + 4|0))>>2] = $189;
       break;
      }
     } else {
      $190 = HEAP32[((552 + 16|0))>>2]|0;
      $191 = ($154>>>0)<($190>>>0);
      if ($191) {
       _abort();
       // unreachable;
      }
      $192 = (($154) + 16|0);
      $193 = HEAP32[$192>>2]|0;
      $194 = ($193|0)==($0|0);
      if ($194) {
       HEAP32[$192>>2] = $R7$1;
      } else {
       $195 = (($154) + 20|0);
       HEAP32[$195>>2] = $R7$1;
      }
      $196 = ($R7$1|0)==(0|0);
      if ($196) {
       break;
      }
     }
     $197 = HEAP32[((552 + 16|0))>>2]|0;
     $198 = ($R7$1>>>0)<($197>>>0);
     if ($198) {
      _abort();
      // unreachable;
     }
     $199 = (($R7$1) + 24|0);
     HEAP32[$199>>2] = $154;
     $$sum15 = (($psize) + 16)|0;
     $200 = (($p) + ($$sum15)|0);
     $201 = HEAP32[$200>>2]|0;
     $202 = ($201|0)==(0|0);
     do {
      if (!($202)) {
       $203 = ($201>>>0)<($197>>>0);
       if ($203) {
        _abort();
        // unreachable;
       } else {
        $204 = (($R7$1) + 16|0);
        HEAP32[$204>>2] = $201;
        $205 = (($201) + 24|0);
        HEAP32[$205>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum16 = (($psize) + 20)|0;
     $206 = (($p) + ($$sum16)|0);
     $207 = HEAP32[$206>>2]|0;
     $208 = ($207|0)==(0|0);
     if (!($208)) {
      $209 = HEAP32[((552 + 16|0))>>2]|0;
      $210 = ($207>>>0)<($209>>>0);
      if ($210) {
       _abort();
       // unreachable;
      } else {
       $211 = (($R7$1) + 20|0);
       HEAP32[$211>>2] = $207;
       $212 = (($207) + 24|0);
       HEAP32[$212>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $213 = $128 | 1;
  $214 = (($$0) + 4|0);
  HEAP32[$214>>2] = $213;
  $215 = (($$0) + ($128)|0);
  HEAP32[$215>>2] = $128;
  $216 = HEAP32[((552 + 20|0))>>2]|0;
  $217 = ($$0|0)==($216|0);
  if ($217) {
   HEAP32[((552 + 8|0))>>2] = $128;
   STACKTOP = sp;return;
  } else {
   $$1 = $128;
  }
 } else {
  $218 = $109 & -2;
  HEAP32[$108>>2] = $218;
  $219 = $$02 | 1;
  $220 = (($$0) + 4|0);
  HEAP32[$220>>2] = $219;
  $221 = (($$0) + ($$02)|0);
  HEAP32[$221>>2] = $$02;
  $$1 = $$02;
 }
 $222 = $$1 >>> 3;
 $223 = ($$1>>>0)<(256);
 if ($223) {
  $224 = $222 << 1;
  $225 = ((552 + ($224<<2)|0) + 40|0);
  $226 = HEAP32[552>>2]|0;
  $227 = 1 << $222;
  $228 = $226 & $227;
  $229 = ($228|0)==(0);
  if ($229) {
   $230 = $226 | $227;
   HEAP32[552>>2] = $230;
   $$sum12$pre = (($224) + 2)|0;
   $$pre = ((552 + ($$sum12$pre<<2)|0) + 40|0);
   $$pre$phiZ2D = $$pre;$F16$0 = $225;
  } else {
   $$sum13 = (($224) + 2)|0;
   $231 = ((552 + ($$sum13<<2)|0) + 40|0);
   $232 = HEAP32[$231>>2]|0;
   $233 = HEAP32[((552 + 16|0))>>2]|0;
   $234 = ($232>>>0)<($233>>>0);
   if ($234) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $231;$F16$0 = $232;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $$0;
  $235 = (($F16$0) + 12|0);
  HEAP32[$235>>2] = $$0;
  $236 = (($$0) + 8|0);
  HEAP32[$236>>2] = $F16$0;
  $237 = (($$0) + 12|0);
  HEAP32[$237>>2] = $225;
  STACKTOP = sp;return;
 }
 $238 = $$1 >>> 8;
 $239 = ($238|0)==(0);
 if ($239) {
  $I19$0 = 0;
 } else {
  $240 = ($$1>>>0)>(16777215);
  if ($240) {
   $I19$0 = 31;
  } else {
   $241 = (($238) + 1048320)|0;
   $242 = $241 >>> 16;
   $243 = $242 & 8;
   $244 = $238 << $243;
   $245 = (($244) + 520192)|0;
   $246 = $245 >>> 16;
   $247 = $246 & 4;
   $248 = $247 | $243;
   $249 = $244 << $247;
   $250 = (($249) + 245760)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 2;
   $253 = $248 | $252;
   $254 = (14 - ($253))|0;
   $255 = $249 << $252;
   $256 = $255 >>> 15;
   $257 = (($254) + ($256))|0;
   $258 = $257 << 1;
   $259 = (($257) + 7)|0;
   $260 = $$1 >>> $259;
   $261 = $260 & 1;
   $262 = $261 | $258;
   $I19$0 = $262;
  }
 }
 $263 = ((552 + ($I19$0<<2)|0) + 304|0);
 $264 = (($$0) + 28|0);
 $I19$0$c = $I19$0;
 HEAP32[$264>>2] = $I19$0$c;
 $265 = (($$0) + 20|0);
 HEAP32[$265>>2] = 0;
 $266 = (($$0) + 16|0);
 HEAP32[$266>>2] = 0;
 $267 = HEAP32[((552 + 4|0))>>2]|0;
 $268 = 1 << $I19$0;
 $269 = $267 & $268;
 $270 = ($269|0)==(0);
 if ($270) {
  $271 = $267 | $268;
  HEAP32[((552 + 4|0))>>2] = $271;
  HEAP32[$263>>2] = $$0;
  $272 = (($$0) + 24|0);
  HEAP32[$272>>2] = $263;
  $273 = (($$0) + 12|0);
  HEAP32[$273>>2] = $$0;
  $274 = (($$0) + 8|0);
  HEAP32[$274>>2] = $$0;
  STACKTOP = sp;return;
 }
 $275 = HEAP32[$263>>2]|0;
 $276 = ($I19$0|0)==(31);
 if ($276) {
  $284 = 0;
 } else {
  $277 = $I19$0 >>> 1;
  $278 = (25 - ($277))|0;
  $284 = $278;
 }
 $279 = (($275) + 4|0);
 $280 = HEAP32[$279>>2]|0;
 $281 = $280 & -8;
 $282 = ($281|0)==($$1|0);
 L194: do {
  if ($282) {
   $T$0$lcssa = $275;
  } else {
   $283 = $$1 << $284;
   $K20$050 = $283;$T$049 = $275;
   while(1) {
    $291 = $K20$050 >>> 31;
    $292 = ((($T$049) + ($291<<2)|0) + 16|0);
    $287 = HEAP32[$292>>2]|0;
    $293 = ($287|0)==(0|0);
    if ($293) {
     break;
    }
    $285 = $K20$050 << 1;
    $286 = (($287) + 4|0);
    $288 = HEAP32[$286>>2]|0;
    $289 = $288 & -8;
    $290 = ($289|0)==($$1|0);
    if ($290) {
     $T$0$lcssa = $287;
     break L194;
    } else {
     $K20$050 = $285;$T$049 = $287;
    }
   }
   $294 = HEAP32[((552 + 16|0))>>2]|0;
   $295 = ($292>>>0)<($294>>>0);
   if ($295) {
    _abort();
    // unreachable;
   }
   HEAP32[$292>>2] = $$0;
   $296 = (($$0) + 24|0);
   HEAP32[$296>>2] = $T$049;
   $297 = (($$0) + 12|0);
   HEAP32[$297>>2] = $$0;
   $298 = (($$0) + 8|0);
   HEAP32[$298>>2] = $$0;
   STACKTOP = sp;return;
  }
 } while(0);
 $299 = (($T$0$lcssa) + 8|0);
 $300 = HEAP32[$299>>2]|0;
 $301 = HEAP32[((552 + 16|0))>>2]|0;
 $302 = ($T$0$lcssa>>>0)>=($301>>>0);
 $303 = ($300>>>0)>=($301>>>0);
 $or$cond = $302 & $303;
 if (!($or$cond)) {
  _abort();
  // unreachable;
 }
 $304 = (($300) + 12|0);
 HEAP32[$304>>2] = $$0;
 HEAP32[$299>>2] = $$0;
 $305 = (($$0) + 8|0);
 HEAP32[$305>>2] = $300;
 $306 = (($$0) + 12|0);
 HEAP32[$306>>2] = $T$0$lcssa;
 $307 = (($$0) + 24|0);
 HEAP32[$307>>2] = 0;
 STACKTOP = sp;return;
}
function _scanexp($f,$pok) {
 $f = $f|0;
 $pok = $pok|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $c$0 = 0, $c$1$be = 0;
 var $c$116 = 0, $c$2$be = 0, $c$2$lcssa = 0, $c$29 = 0, $c$3$be = 0, $neg$0 = 0, $or$cond3 = 0, $or$cond5 = 0, $or$cond7 = 0, $x$017 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($f) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = (($f) + 100|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($1>>>0)<($3>>>0);
 if ($4) {
  $5 = (($1) + 1|0);
  HEAP32[$0>>2] = $5;
  $6 = HEAP8[$1>>0]|0;
  $7 = $6&255;
  $10 = $7;
 } else {
  $8 = (___shgetc($f)|0);
  $10 = $8;
 }
 $9 = ($10|0)==(45);
 if ((($10|0) == 43) | (($10|0) == 45)) {
  $11 = HEAP32[$0>>2]|0;
  $12 = $9&1;
  $13 = HEAP32[$2>>2]|0;
  $14 = ($11>>>0)<($13>>>0);
  if ($14) {
   $15 = (($11) + 1|0);
   HEAP32[$0>>2] = $15;
   $16 = HEAP8[$11>>0]|0;
   $17 = $16&255;
   $20 = $17;
  } else {
   $18 = (___shgetc($f)|0);
   $20 = $18;
  }
  $19 = (($20) + -48)|0;
  $21 = ($19>>>0)>(9);
  $22 = ($pok|0)!=(0);
  $or$cond3 = $21 & $22;
  if ($or$cond3) {
   $23 = HEAP32[$2>>2]|0;
   $24 = ($23|0)==(0|0);
   if ($24) {
    $c$0 = $20;$neg$0 = $12;
   } else {
    $25 = HEAP32[$0>>2]|0;
    $26 = (($25) + -1|0);
    HEAP32[$0>>2] = $26;
    $c$0 = $20;$neg$0 = $12;
   }
  } else {
   $c$0 = $20;$neg$0 = $12;
  }
 } else {
  $c$0 = $10;$neg$0 = 0;
 }
 $27 = (($c$0) + -48)|0;
 $28 = ($27>>>0)>(9);
 if ($28) {
  $29 = HEAP32[$2>>2]|0;
  $30 = ($29|0)==(0|0);
  if ($30) {
   $96 = -2147483648;$97 = 0;
   tempRet0 = $96;
   STACKTOP = sp;return ($97|0);
  }
  $31 = HEAP32[$0>>2]|0;
  $32 = (($31) + -1|0);
  HEAP32[$0>>2] = $32;
  $96 = -2147483648;$97 = 0;
  tempRet0 = $96;
  STACKTOP = sp;return ($97|0);
 } else {
  $c$116 = $c$0;$x$017 = 0;
 }
 while(1) {
  $33 = ($x$017*10)|0;
  $34 = (($c$116) + -48)|0;
  $35 = (($34) + ($33))|0;
  $36 = HEAP32[$0>>2]|0;
  $37 = HEAP32[$2>>2]|0;
  $38 = ($36>>>0)<($37>>>0);
  if ($38) {
   $39 = (($36) + 1|0);
   HEAP32[$0>>2] = $39;
   $40 = HEAP8[$36>>0]|0;
   $41 = $40&255;
   $c$1$be = $41;
  } else {
   $42 = (___shgetc($f)|0);
   $c$1$be = $42;
  }
  $43 = (($c$1$be) + -48)|0;
  $44 = ($43>>>0)<(10);
  $45 = ($35|0)<(214748364);
  $or$cond5 = $44 & $45;
  if ($or$cond5) {
   $c$116 = $c$1$be;$x$017 = $35;
  } else {
   break;
  }
 }
 $46 = ($35|0)<(0);
 $47 = $46 << 31 >> 31;
 $48 = (($c$1$be) + -48)|0;
 $49 = ($48>>>0)<(10);
 if ($49) {
  $52 = $35;$53 = $47;$c$29 = $c$1$be;
  while(1) {
   $54 = (___muldi3(($52|0),($53|0),10,0)|0);
   $55 = tempRet0;
   $56 = ($c$29|0)<(0);
   $57 = $56 << 31 >> 31;
   $58 = (_i64Add(($c$29|0),($57|0),-48,-1)|0);
   $59 = tempRet0;
   $60 = (_i64Add(($58|0),($59|0),($54|0),($55|0))|0);
   $61 = tempRet0;
   $62 = HEAP32[$0>>2]|0;
   $63 = HEAP32[$2>>2]|0;
   $64 = ($62>>>0)<($63>>>0);
   if ($64) {
    $65 = (($62) + 1|0);
    HEAP32[$0>>2] = $65;
    $66 = HEAP8[$62>>0]|0;
    $67 = $66&255;
    $c$2$be = $67;
   } else {
    $68 = (___shgetc($f)|0);
    $c$2$be = $68;
   }
   $69 = (($c$2$be) + -48)|0;
   $70 = ($69>>>0)<(10);
   $71 = ($61|0)<(21474836);
   $72 = ($60>>>0)<(2061584302);
   $73 = ($61|0)==(21474836);
   $74 = $73 & $72;
   $75 = $71 | $74;
   $or$cond7 = $70 & $75;
   if ($or$cond7) {
    $52 = $60;$53 = $61;$c$29 = $c$2$be;
   } else {
    $90 = $60;$91 = $61;$c$2$lcssa = $c$2$be;
    break;
   }
  }
 } else {
  $90 = $35;$91 = $47;$c$2$lcssa = $c$1$be;
 }
 $50 = (($c$2$lcssa) + -48)|0;
 $51 = ($50>>>0)<(10);
 if ($51) {
  while(1) {
   $76 = HEAP32[$0>>2]|0;
   $77 = HEAP32[$2>>2]|0;
   $78 = ($76>>>0)<($77>>>0);
   if ($78) {
    $79 = (($76) + 1|0);
    HEAP32[$0>>2] = $79;
    $80 = HEAP8[$76>>0]|0;
    $81 = $80&255;
    $c$3$be = $81;
   } else {
    $82 = (___shgetc($f)|0);
    $c$3$be = $82;
   }
   $83 = (($c$3$be) + -48)|0;
   $84 = ($83>>>0)<(10);
   if (!($84)) {
    break;
   }
  }
 }
 $85 = HEAP32[$2>>2]|0;
 $86 = ($85|0)==(0|0);
 if (!($86)) {
  $87 = HEAP32[$0>>2]|0;
  $88 = (($87) + -1|0);
  HEAP32[$0>>2] = $88;
 }
 $89 = ($neg$0|0)!=(0);
 $92 = (_i64Subtract(0,0,($90|0),($91|0))|0);
 $93 = tempRet0;
 $94 = $89 ? $92 : $90;
 $95 = $89 ? $93 : $91;
 $96 = $95;$97 = $94;
 tempRet0 = $96;
 STACKTOP = sp;return ($97|0);
}
function _printf_core($f,$fmt,$ap,$nl_arg,$nl_type) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 $nl_arg = $nl_arg|0;
 $nl_type = $nl_type|0;
 var $$ = 0, $$$5$i = 0, $$$i = 0, $$$p$i = 0, $$0 = 0, $$0$lcssa$i = 0, $$0$lcssa$i$i = 0, $$0$lcssa$i102$i = 0, $$0$lcssa$i109$i = 0, $$0$lcssa$i133$i = 0, $$0$lcssa$i148$i = 0, $$0$lcssa$i40 = 0, $$0$lcssa$i44$i = 0, $$0$lcssa$i45 = 0, $$0$lcssa$i47 = 0, $$0$lcssa$i51$i = 0, $$0$lcssa$i53$i = 0, $$0$lcssa$i55 = 0, $$0$lcssa$i61$i = 0, $$0$lcssa$i62 = 0;
 var $$0$lcssa$i68$i = 0, $$0$lcssa$i69 = 0, $$0$lcssa$i74$i = 0, $$0$lcssa$i79 = 0, $$0$lcssa$i81$i = 0, $$0$lcssa$i89$i = 0, $$01$i = 0, $$01$i$i = 0, $$01$i100$i = 0, $$01$i107$i = 0, $$01$i131$i = 0, $$01$i146$i = 0, $$01$i38 = 0, $$01$i42$i = 0, $$01$i49$i = 0, $$01$i53 = 0, $$01$i59$i = 0, $$01$i60 = 0, $$01$i66$i = 0, $$01$i67 = 0;
 var $$01$i72$i = 0, $$01$i77 = 0, $$01$i79$i = 0, $$01$lcssa$off0$i = 0, $$01$lcssa$off0$i$i = 0, $$01$lcssa$off0$i90$i = 0, $$010$i = 0.0, $$012$i = 0, $$016$i = 0, $$03$i42 = 0, $$05$i = 0, $$05$i$i = 0, $$05$i84$i = 0, $$1$i = 0.0, $$1$lcssa$i$i = 0, $$1$lcssa$i117$i = 0, $$117$i = 0, $$12$i = 0, $$12$i$i = 0, $$12$i115$i = 0;
 var $$12$i124$i = 0, $$12$i139$i = 0, $$12$i92$i = 0, $$15 = 0, $$19 = 0, $$2$i = 0.0, $$2$us$i = 0.0, $$2$us$us$i = 0.0, $$20 = 0, $$213$$26$i = 0, $$213$$28$i = 0, $$213$i = 0, $$23$i = 0, $$23$us$i = 0, $$24$i = 0, $$25$i = 0.0, $$26$i = 0, $$28$i = 0, $$3$i = 0.0, $$314$i = 0;
 var $$36$i = 0, $$4$i = 0.0, $$415$lcssa$i = 0, $$415171$i = 0, $$5189$i = 0, $$a$3$i = 0, $$a$3$us$i = 0, $$a$3$us307$i = 0, $$a$3$us308$i = 0, $$a$3309$i = 0, $$a$3310$i = 0, $$fl$4 = 0, $$lcssa292$i = 0, $$mask$i = 0, $$mask$i32 = 0, $$mask1$i = 0, $$mask1$i31 = 0, $$neg156$i = 0, $$neg157$i = 0, $$not$i = 0;
 var $$p$5 = 0, $$p$i = 0, $$pn$i = 0, $$pr = 0, $$pr$i = 0, $$pr151$i = 0, $$pre = 0, $$pre$i = 0, $$pre260 = 0, $$pre261 = 0, $$pre306$i = 0, $$sum$i = 0, $$sum18$i = 0, $$sum19$i = 0, $$z$3$i = 0, $$z$4$us$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0;
 var $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0;
 var $1019 = 0, $102 = 0, $1020 = 0.0, $1021 = 0.0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $1029$phi = 0, $103 = 0, $1030 = 0, $1030$phi = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0;
 var $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0.0, $176 = 0, $177 = 0, $178 = 0.0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0;
 var $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0;
 var $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0.0, $356 = 0, $357 = 0.0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0;
 var $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0;
 var $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0.0, $396 = 0.0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0;
 var $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0.0, $411 = 0, $412 = 0, $413 = 0, $414 = 0.0, $415 = 0.0, $416 = 0.0, $417 = 0.0, $418 = 0.0, $419 = 0.0, $42 = 0, $420 = 0, $421 = 0;
 var $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0;
 var $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0;
 var $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0.0, $468 = 0.0, $469 = 0.0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0;
 var $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0.0, $483 = 0.0, $484 = 0.0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0;
 var $495 = 0, $496 = 0, $497 = 0.0, $498 = 0.0, $499 = 0.0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0;
 var $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0;
 var $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0;
 var $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0.0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0.0, $562 = 0.0, $563 = 0.0, $564 = 0, $565 = 0, $566 = 0;
 var $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0;
 var $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0;
 var $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0;
 var $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0;
 var $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0;
 var $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0;
 var $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0;
 var $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0.0, $7 = 0, $70 = 0, $700 = 0.0, $701 = 0, $702 = 0.0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0;
 var $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0;
 var $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0;
 var $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0;
 var $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0;
 var $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0;
 var $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0;
 var $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0;
 var $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0;
 var $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0;
 var $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0;
 var $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0;
 var $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0;
 var $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0;
 var $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0;
 var $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0;
 var $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0;
 var $a$0 = 0, $a$1 = 0, $a$1$lcssa$i = 0, $a$1258$i = 0, $a$2 = 0, $a$2$ph$i = 0, $a$3$lcssa$i = 0, $a$3244$i = 0, $a$3244$us$i = 0, $a$5$lcssa$i = 0, $a$5218$i = 0, $a$6$i = 0, $a$7$i = 0, $a$8$ph$i = 0, $arglist_current = 0, $arglist_current11 = 0, $arglist_current14 = 0, $arglist_current17 = 0, $arglist_current2 = 0, $arglist_current20 = 0;
 var $arglist_current23 = 0, $arglist_current26 = 0, $arglist_current29 = 0, $arglist_current32 = 0, $arglist_current35 = 0, $arglist_current38 = 0, $arglist_current41 = 0, $arglist_current44 = 0, $arglist_current47 = 0, $arglist_current5 = 0, $arglist_current50 = 0, $arglist_current53 = 0, $arglist_current56 = 0, $arglist_current59 = 0, $arglist_current62 = 0, $arglist_current8 = 0, $arglist_next = 0, $arglist_next12 = 0, $arglist_next15 = 0, $arglist_next18 = 0;
 var $arglist_next21 = 0, $arglist_next24 = 0, $arglist_next27 = 0, $arglist_next3 = 0, $arglist_next30 = 0, $arglist_next33 = 0, $arglist_next36 = 0, $arglist_next39 = 0, $arglist_next42 = 0, $arglist_next45 = 0, $arglist_next48 = 0, $arglist_next51 = 0, $arglist_next54 = 0, $arglist_next57 = 0, $arglist_next6 = 0, $arglist_next60 = 0, $arglist_next63 = 0, $arglist_next9 = 0, $argpos$0 = 0, $big$i = 0;
 var $buf = 0, $buf$i = 0, $carry$0250$i = 0, $carry3$0238$i = 0, $carry3$0238$us$i = 0, $cnt$0 = 0, $cnt$1 = 0, $d$0$i = 0, $d$0249$i = 0, $d$0251$i = 0, $d$1237$i = 0, $d$1237$us$i = 0, $d$2$lcssa$i = 0, $d$2217$i = 0, $d$3$i = 0, $d$4180$i = 0, $d$5170$i = 0, $d$6188$i = 0, $e$0233$i = 0, $e$1$i = 0;
 var $e$2213$i = 0, $e$3$i = 0, $e$4$ph$i = 0, $e2$i = 0, $ebuf0$i = 0, $estr$0$i = 0, $estr$1$lcssa$i = 0, $estr$1$ph$i = 0, $estr$1195$i = 0, $estr$2$i = 0, $exitcond$i = 0, $fl$0113 = 0, $fl$0118 = 0, $fl$1 = 0, $fl$1$ = 0, $fl$3 = 0, $fl$4 = 0, $fl$6 = 0, $fmt81$lcssa = 0, $fmt81102 = 0;
 var $fmt82 = 0, $fmt83 = 0, $fmt84 = 0, $fmt86 = 0, $fmt87 = 0, $i$0$lcssa = 0, $i$0$lcssa267 = 0, $i$0166 = 0, $i$0232$i = 0, $i$03$i = 0, $i$03$i24 = 0, $i$1$lcssa$i = 0, $i$1174 = 0, $i$1225$i = 0, $i$2100 = 0, $i$2212$i = 0, $i$3204$i = 0, $i$397 = 0, $isdigit = 0, $isdigit$i = 0;
 var $isdigit$i26 = 0, $isdigit2$i = 0, $isdigit2$i23 = 0, $isdigit4 = 0, $isdigit6 = 0, $isdigittmp = 0, $isdigittmp$i = 0, $isdigittmp$i25 = 0, $isdigittmp1$i = 0, $isdigittmp1$i22 = 0, $isdigittmp3 = 0, $isdigittmp5 = 0, $j$0$i = 0, $j$0224$i = 0, $j$0226$i = 0, $j$1205$i = 0, $j$2$i = 0, $l$0 = 0, $l$0$i = 0, $l$1$i = 0;
 var $l$1165 = 0, $l$2 = 0, $l10n$0 = 0, $l10n$0$phi = 0, $l10n$1 = 0, $l10n$2 = 0, $l10n$3 = 0, $mb = 0, $notlhs$us$us$i = 0, $notrhs$i = 0, $or$cond = 0, $or$cond$i = 0, $or$cond$i$i = 0, $or$cond$i105$i = 0, $or$cond$i40$i = 0, $or$cond$i47$i = 0, $or$cond$i51 = 0, $or$cond$i57$i = 0, $or$cond$i58 = 0, $or$cond$i64$i = 0;
 var $or$cond$i65 = 0, $or$cond$i73 = 0, $or$cond$i75 = 0, $or$cond$i77$i = 0, $or$cond$i98$i = 0, $or$cond13 = 0, $or$cond17 = 0, $or$cond271 = 0, $or$cond32$i = 0, $or$cond34$i = 0, $or$cond5$i = 0, $or$cond7$i = 0, $or$cond7169$i = 0, $or$cond9 = 0, $or$cond9$i = 0, $p$0 = 0, $p$1 = 0, $p$2 = 0, $p$2$ = 0, $p$4266 = 0;
 var $p$5 = 0, $pad$i = 0, $pl$0 = 0, $pl$0$i = 0, $pl$1 = 0, $pl$1$i = 0, $pl$2 = 0, $prefix$0 = 0, $prefix$0$$i = 0, $prefix$0$i = 0, $prefix$1 = 0, $prefix$2 = 0, $r$0$a$8$i = 0, $re$0$i = 0, $re$1163$i = 0, $round$0162$i = 0.0, $round6$1$i = 0.0, $s$0$i = 0, $s$0$us$i = 0, $s$0$us$us$i = 0;
 var $s$1$i = 0, $s$1$lcssa$i = 0, $s$1$us$i = 0, $s$1$us$us$i = 0, $s1$0$i = 0, $s7$0177$i = 0, $s7$1$i = 0, $s8$0$lcssa$i = 0, $s8$0165$i = 0, $s9$0$i = 0, $s9$1184$i = 0, $s9$2$i = 0, $sext = 0, $sext93 = 0, $small$0$i = 0.0, $small$1$i = 0.0, $st$0 = 0, $storemerge = 0, $storemerge2111 = 0, $storemerge2117 = 0;
 var $storemerge7 = 0, $t$0 = 0, $t$1 = 0, $w$$i = 0, $w$0 = 0, $w$1 = 0, $w$2 = 0, $w$22$i = 0, $w$35$i = 0, $wc = 0, $ws$0167 = 0, $ws$1175 = 0, $y$03$i = 0, $y$03$i$i = 0, $y$03$i114$i = 0, $y$03$i123$i = 0, $y$03$i138$i = 0, $y$03$i91$i = 0, $z$0$i = 0, $z$0$lcssa = 0;
 var $z$0103 = 0, $z$1$lcssa$i = 0, $z$1257$i = 0, $z$2 = 0, $z$2$i = 0, $z$3$lcssa$i = 0, $z$3243$i = 0, $z$3243$us$i = 0, $z$4$i = 0, $z$4$us$i = 0, $z$5$i = 0, $z$6$$i = 0, $z$6$i = 0, $z$6$ph$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 864|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $big$i = sp + 16|0;
 $e2$i = sp + 8|0;
 $buf$i = sp + 560|0;
 $0 = $buf$i;
 $ebuf0$i = sp + 840|0;
 $pad$i = sp + 584|0;
 $buf = sp + 520|0;
 $wc = sp;
 $mb = sp + 852|0;
 $1 = ($f|0)!=(0|0);
 $2 = (($buf) + 40|0);
 $3 = $2;
 $4 = (($buf) + 39|0);
 $5 = (($wc) + 4|0);
 $6 = $wc;
 $7 = (($ebuf0$i) + 12|0);
 $8 = (($ebuf0$i) + 11|0);
 $9 = $7;
 $10 = (($9) - ($0))|0;
 $11 = (-2 - ($0))|0;
 $12 = (($9) + 2)|0;
 $13 = (($big$i) + 288|0);
 $14 = (($buf$i) + 9|0);
 $15 = $14;
 $16 = (($buf$i) + 8|0);
 $1029 = 0;$1030 = 0;$cnt$0 = 0;$fmt83 = $fmt;$l$0 = 0;$l10n$0 = 0;
 L1: while(1) {
  $17 = ($cnt$0|0)>(-1);
  do {
   if ($17) {
    $18 = (2147483647 - ($cnt$0))|0;
    $19 = ($l$0|0)>($18|0);
    if ($19) {
     $20 = (___errno_location()|0);
     HEAP32[$20>>2] = 75;
     $cnt$1 = -1;
     break;
    } else {
     $21 = (($l$0) + ($cnt$0))|0;
     $cnt$1 = $21;
     break;
    }
   } else {
    $cnt$1 = $cnt$0;
   }
  } while(0);
  $22 = HEAP8[$fmt83>>0]|0;
  $23 = ($22<<24>>24)==(0);
  if ($23) {
   label = 352;
   break;
  } else {
   $1031 = $22;$fmt82 = $fmt83;
  }
  while(1) {
   if ((($1031<<24>>24) == 37)) {
    $fmt81102 = $fmt82;$z$0103 = $fmt82;
    label = 9;
    break;
   } else if ((($1031<<24>>24) == 0)) {
    $fmt81$lcssa = $fmt82;$z$0$lcssa = $fmt82;
    break;
   }
   $24 = (($fmt82) + 1|0);
   $$pre = HEAP8[$24>>0]|0;
   $1031 = $$pre;$fmt82 = $24;
  }
  L12: do {
   if ((label|0) == 9) {
    while(1) {
     label = 0;
     $25 = (($fmt81102) + 1|0);
     $26 = HEAP8[$25>>0]|0;
     $27 = ($26<<24>>24)==(37);
     if (!($27)) {
      $fmt81$lcssa = $fmt81102;$z$0$lcssa = $z$0103;
      break L12;
     }
     $28 = (($z$0103) + 1|0);
     $29 = (($fmt81102) + 2|0);
     $30 = HEAP8[$29>>0]|0;
     $31 = ($30<<24>>24)==(37);
     if ($31) {
      $fmt81102 = $29;$z$0103 = $28;
      label = 9;
     } else {
      $fmt81$lcssa = $29;$z$0$lcssa = $28;
      break;
     }
    }
   }
  } while(0);
  $32 = $z$0$lcssa;
  $33 = $fmt83;
  $34 = (($32) - ($33))|0;
  if ($1) {
   (___fwritex($fmt83,$34,$f)|0);
  }
  $35 = ($z$0$lcssa|0)==($fmt83|0);
  if (!($35)) {
   $l10n$0$phi = $l10n$0;$1030$phi = $1030;$1029$phi = $1029;$cnt$0 = $cnt$1;$fmt83 = $fmt81$lcssa;$l$0 = $34;$l10n$0 = $l10n$0$phi;$1030 = $1030$phi;$1029 = $1029$phi;
   continue;
  }
  $36 = (($fmt81$lcssa) + 1|0);
  $37 = HEAP8[$36>>0]|0;
  $38 = $37 << 24 >> 24;
  $isdigittmp = (($38) + -48)|0;
  $isdigit = ($isdigittmp>>>0)<(10);
  if ($isdigit) {
   $39 = (($fmt81$lcssa) + 2|0);
   $40 = HEAP8[$39>>0]|0;
   $41 = ($40<<24>>24)==(36);
   if ($41) {
    $42 = (($fmt81$lcssa) + 3|0);
    $$pre260 = HEAP8[$42>>0]|0;
    $44 = $$pre260;$argpos$0 = $isdigittmp;$l10n$1 = 1;$storemerge = $42;
   } else {
    $44 = $37;$argpos$0 = -1;$l10n$1 = $l10n$0;$storemerge = $36;
   }
  } else {
   $44 = $37;$argpos$0 = -1;$l10n$1 = $l10n$0;$storemerge = $36;
  }
  $43 = $44 << 24 >> 24;
  $45 = $43 & -32;
  $46 = ($45|0)==(32);
  L25: do {
   if ($46) {
    $$pr = $44;$48 = $43;$fl$0118 = 0;$storemerge2117 = $storemerge;
    while(1) {
     $47 = (($48) + -32)|0;
     $49 = 1 << $47;
     $50 = $49 & 75913;
     $51 = ($50|0)==(0);
     if ($51) {
      $59 = $$pr;$fl$0113 = $fl$0118;$storemerge2111 = $storemerge2117;
      break L25;
     }
     $52 = $49 | $fl$0118;
     $53 = (($storemerge2117) + 1|0);
     $54 = HEAP8[$53>>0]|0;
     $55 = $54 << 24 >> 24;
     $56 = $55 & -32;
     $57 = ($56|0)==(32);
     if ($57) {
      $$pr = $54;$48 = $55;$fl$0118 = $52;$storemerge2117 = $53;
     } else {
      $59 = $54;$fl$0113 = $52;$storemerge2111 = $53;
      break;
     }
    }
   } else {
    $59 = $44;$fl$0113 = 0;$storemerge2111 = $storemerge;
   }
  } while(0);
  $58 = ($59<<24>>24)==(42);
  do {
   if ($58) {
    $60 = (($storemerge2111) + 1|0);
    $61 = HEAP8[$60>>0]|0;
    $62 = $61 << 24 >> 24;
    $isdigittmp5 = (($62) + -48)|0;
    $isdigit6 = ($isdigittmp5>>>0)<(10);
    if ($isdigit6) {
     $63 = (($storemerge2111) + 2|0);
     $64 = HEAP8[$63>>0]|0;
     $65 = ($64<<24>>24)==(36);
     if ($65) {
      $66 = (($nl_type) + ($isdigittmp5<<2)|0);
      HEAP32[$66>>2] = 10;
      $67 = HEAP8[$60>>0]|0;
      $68 = $67 << 24 >> 24;
      $69 = (($68) + -48)|0;
      $70 = (($nl_arg) + ($69<<3)|0);
      $71 = $70;
      $72 = $71;
      $73 = HEAP32[$72>>2]|0;
      $74 = (($71) + 4)|0;
      $75 = $74;
      $76 = HEAP32[$75>>2]|0;
      $77 = (($storemerge2111) + 3|0);
      $l10n$2 = 1;$storemerge7 = $77;$w$0 = $73;
     } else {
      label = 24;
     }
    } else {
     label = 24;
    }
    if ((label|0) == 24) {
     label = 0;
     $78 = ($l10n$1|0)==(0);
     if (!($78)) {
      $$0 = -1;
      label = 370;
      break L1;
     }
     if (!($1)) {
      $fl$1 = $fl$0113;$fmt84 = $60;$l10n$3 = 0;$w$1 = 0;
      break;
     }
     $arglist_current = HEAP32[$ap>>2]|0;
     $79 = HEAP32[$arglist_current>>2]|0;
     $arglist_next = (($arglist_current) + 4|0);
     HEAP32[$ap>>2] = $arglist_next;
     $l10n$2 = 0;$storemerge7 = $60;$w$0 = $79;
    }
    $80 = ($w$0|0)<(0);
    if ($80) {
     $81 = $fl$0113 | 8192;
     $82 = (0 - ($w$0))|0;
     $fl$1 = $81;$fmt84 = $storemerge7;$l10n$3 = $l10n$2;$w$1 = $82;
    } else {
     $fl$1 = $fl$0113;$fmt84 = $storemerge7;$l10n$3 = $l10n$2;$w$1 = $w$0;
    }
   } else {
    $83 = $59 << 24 >> 24;
    $isdigittmp1$i = (($83) + -48)|0;
    $isdigit2$i = ($isdigittmp1$i>>>0)<(10);
    if ($isdigit2$i) {
     $86 = $83;$89 = $storemerge2111;$i$03$i = 0;
     while(1) {
      $84 = ($i$03$i*10)|0;
      $85 = (($86) + -48)|0;
      $87 = (($85) + ($84))|0;
      $88 = (($89) + 1|0);
      $90 = HEAP8[$88>>0]|0;
      $91 = $90 << 24 >> 24;
      $isdigittmp$i = (($91) + -48)|0;
      $isdigit$i = ($isdigittmp$i>>>0)<(10);
      if ($isdigit$i) {
       $86 = $91;$89 = $88;$i$03$i = $87;
      } else {
       break;
      }
     }
     $92 = ($87|0)<(0);
     if ($92) {
      $$0 = -1;
      label = 370;
      break L1;
     } else {
      $fl$1 = $fl$0113;$fmt84 = $88;$l10n$3 = $l10n$1;$w$1 = $87;
     }
    } else {
     $fl$1 = $fl$0113;$fmt84 = $storemerge2111;$l10n$3 = $l10n$1;$w$1 = 0;
    }
   }
  } while(0);
  $93 = HEAP8[$fmt84>>0]|0;
  $94 = ($93<<24>>24)==(46);
  L46: do {
   if ($94) {
    $95 = (($fmt84) + 1|0);
    $96 = HEAP8[$95>>0]|0;
    $97 = ($96<<24>>24)==(42);
    if (!($97)) {
     $118 = $96 << 24 >> 24;
     $isdigittmp1$i22 = (($118) + -48)|0;
     $isdigit2$i23 = ($isdigittmp1$i22>>>0)<(10);
     if ($isdigit2$i23) {
      $121 = $118;$124 = $95;$i$03$i24 = 0;
     } else {
      $fmt87 = $95;$p$0 = 0;
      break;
     }
     while(1) {
      $119 = ($i$03$i24*10)|0;
      $120 = (($121) + -48)|0;
      $122 = (($120) + ($119))|0;
      $123 = (($124) + 1|0);
      $125 = HEAP8[$123>>0]|0;
      $126 = $125 << 24 >> 24;
      $isdigittmp$i25 = (($126) + -48)|0;
      $isdigit$i26 = ($isdigittmp$i25>>>0)<(10);
      if ($isdigit$i26) {
       $121 = $126;$124 = $123;$i$03$i24 = $122;
      } else {
       $fmt87 = $123;$p$0 = $122;
       break L46;
      }
     }
    }
    $98 = (($fmt84) + 2|0);
    $99 = HEAP8[$98>>0]|0;
    $100 = $99 << 24 >> 24;
    $isdigittmp3 = (($100) + -48)|0;
    $isdigit4 = ($isdigittmp3>>>0)<(10);
    if ($isdigit4) {
     $101 = (($fmt84) + 3|0);
     $102 = HEAP8[$101>>0]|0;
     $103 = ($102<<24>>24)==(36);
     if ($103) {
      $104 = (($nl_type) + ($isdigittmp3<<2)|0);
      HEAP32[$104>>2] = 10;
      $105 = HEAP8[$98>>0]|0;
      $106 = $105 << 24 >> 24;
      $107 = (($106) + -48)|0;
      $108 = (($nl_arg) + ($107<<3)|0);
      $109 = $108;
      $110 = $109;
      $111 = HEAP32[$110>>2]|0;
      $112 = (($109) + 4)|0;
      $113 = $112;
      $114 = HEAP32[$113>>2]|0;
      $115 = (($fmt84) + 4|0);
      $fmt87 = $115;$p$0 = $111;
      break;
     }
    }
    $116 = ($l10n$3|0)==(0);
    if (!($116)) {
     $$0 = -1;
     label = 370;
     break L1;
    }
    if ($1) {
     $arglist_current2 = HEAP32[$ap>>2]|0;
     $117 = HEAP32[$arglist_current2>>2]|0;
     $arglist_next3 = (($arglist_current2) + 4|0);
     HEAP32[$ap>>2] = $arglist_next3;
     $fmt87 = $98;$p$0 = $117;
    } else {
     $fmt87 = $98;$p$0 = 0;
    }
   } else {
    $fmt87 = $fmt84;$p$0 = -1;
   }
  } while(0);
  $fmt86 = $fmt87;$st$0 = 0;
  while(1) {
   $127 = HEAP8[$fmt86>>0]|0;
   $128 = $127 << 24 >> 24;
   $129 = (($128) + -65)|0;
   $130 = ($129>>>0)>(57);
   if ($130) {
    $$0 = -1;
    label = 370;
    break L1;
   }
   $131 = (($fmt86) + 1|0);
   $132 = ((5912 + (($st$0*58)|0)|0) + ($129)|0);
   $133 = HEAP8[$132>>0]|0;
   $134 = $133&255;
   $135 = (($134) + -1)|0;
   $136 = ($135>>>0)<(8);
   if ($136) {
    $fmt86 = $131;$st$0 = $134;
   } else {
    break;
   }
  }
  $137 = ($133<<24>>24)==(0);
  if ($137) {
   $$0 = -1;
   label = 370;
   break;
  }
  $138 = ($133<<24>>24)==(19);
  $139 = ($argpos$0|0)>(-1);
  L65: do {
   if ($138) {
    if ($139) {
     $$0 = -1;
     label = 370;
     break L1;
    } else {
     $1032 = $1029;$1033 = $1030;
     label = 63;
    }
   } else {
    if ($139) {
     $140 = (($nl_type) + ($argpos$0<<2)|0);
     HEAP32[$140>>2] = $134;
     $141 = (($nl_arg) + ($argpos$0<<3)|0);
     $142 = $141;
     $143 = $142;
     $144 = HEAP32[$143>>2]|0;
     $145 = (($142) + 4)|0;
     $146 = $145;
     $147 = HEAP32[$146>>2]|0;
     $1032 = $144;$1033 = $147;
     label = 63;
     break;
    }
    if (!($1)) {
     $$0 = 0;
     label = 370;
     break L1;
    }
    $148 = ($133&255)>(20);
    if ($148) {
     $182 = $127;$191 = $1029;$218 = $1030;
    } else {
     do {
      switch ($134|0) {
      case 9:  {
       $arglist_current5 = HEAP32[$ap>>2]|0;
       $149 = HEAP32[$arglist_current5>>2]|0;
       $arglist_next6 = (($arglist_current5) + 4|0);
       HEAP32[$ap>>2] = $arglist_next6;
       $150 = $149;
       $1034 = $1030;$1035 = $150;
       label = 64;
       break L65;
       break;
      }
      case 10:  {
       $arglist_current8 = HEAP32[$ap>>2]|0;
       $151 = HEAP32[$arglist_current8>>2]|0;
       $arglist_next9 = (($arglist_current8) + 4|0);
       HEAP32[$ap>>2] = $arglist_next9;
       $152 = ($151|0)<(0);
       $153 = $152 << 31 >> 31;
       $1034 = $153;$1035 = $151;
       label = 64;
       break L65;
       break;
      }
      case 11:  {
       $arglist_current11 = HEAP32[$ap>>2]|0;
       $154 = HEAP32[$arglist_current11>>2]|0;
       $arglist_next12 = (($arglist_current11) + 4|0);
       HEAP32[$ap>>2] = $arglist_next12;
       $1034 = 0;$1035 = $154;
       label = 64;
       break L65;
       break;
      }
      case 12:  {
       $arglist_current14 = HEAP32[$ap>>2]|0;
       $155 = $arglist_current14;
       $156 = $155;
       $157 = HEAP32[$156>>2]|0;
       $158 = (($155) + 4)|0;
       $159 = $158;
       $160 = HEAP32[$159>>2]|0;
       $arglist_next15 = (($arglist_current14) + 8|0);
       HEAP32[$ap>>2] = $arglist_next15;
       $1034 = $160;$1035 = $157;
       label = 64;
       break L65;
       break;
      }
      case 13:  {
       $arglist_current17 = HEAP32[$ap>>2]|0;
       $161 = HEAP32[$arglist_current17>>2]|0;
       $arglist_next18 = (($arglist_current17) + 4|0);
       HEAP32[$ap>>2] = $arglist_next18;
       $162 = $161&65535;
       $163 = $162 << 16 >> 16;
       $164 = ($163|0)<(0);
       $165 = $164 << 31 >> 31;
       $sext93 = $161 << 16;
       $166 = $sext93 >> 16;
       $1034 = $165;$1035 = $166;
       label = 64;
       break L65;
       break;
      }
      case 14:  {
       $arglist_current20 = HEAP32[$ap>>2]|0;
       $167 = HEAP32[$arglist_current20>>2]|0;
       $arglist_next21 = (($arglist_current20) + 4|0);
       HEAP32[$ap>>2] = $arglist_next21;
       $$mask1$i31 = $167 & 65535;
       $1034 = 0;$1035 = $$mask1$i31;
       label = 64;
       break L65;
       break;
      }
      case 15:  {
       $arglist_current23 = HEAP32[$ap>>2]|0;
       $168 = HEAP32[$arglist_current23>>2]|0;
       $arglist_next24 = (($arglist_current23) + 4|0);
       HEAP32[$ap>>2] = $arglist_next24;
       $169 = $168&255;
       $170 = $169 << 24 >> 24;
       $171 = ($170|0)<(0);
       $172 = $171 << 31 >> 31;
       $sext = $168 << 24;
       $173 = $sext >> 24;
       $1034 = $172;$1035 = $173;
       label = 64;
       break L65;
       break;
      }
      case 16:  {
       $arglist_current26 = HEAP32[$ap>>2]|0;
       $174 = HEAP32[$arglist_current26>>2]|0;
       $arglist_next27 = (($arglist_current26) + 4|0);
       HEAP32[$ap>>2] = $arglist_next27;
       $$mask$i32 = $174 & 255;
       $1034 = 0;$1035 = $$mask$i32;
       label = 64;
       break L65;
       break;
      }
      case 17:  {
       $arglist_current29 = HEAP32[$ap>>2]|0;
       HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current29>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current29+4>>2];$175 = +HEAPF64[tempDoublePtr>>3];
       $arglist_next30 = (($arglist_current29) + 8|0);
       HEAP32[$ap>>2] = $arglist_next30;
       HEAPF64[tempDoublePtr>>3] = $175;$176 = HEAP32[tempDoublePtr>>2]|0;
       $177 = HEAP32[tempDoublePtr+4>>2]|0;
       $1034 = $177;$1035 = $176;
       label = 64;
       break L65;
       break;
      }
      case 18:  {
       $arglist_current32 = HEAP32[$ap>>2]|0;
       HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current32>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current32+4>>2];$178 = +HEAPF64[tempDoublePtr>>3];
       $arglist_next33 = (($arglist_current32) + 8|0);
       HEAP32[$ap>>2] = $arglist_next33;
       HEAPF64[tempDoublePtr>>3] = $178;$179 = HEAP32[tempDoublePtr>>2]|0;
       $180 = HEAP32[tempDoublePtr+4>>2]|0;
       $1032 = $179;$1033 = $180;
       label = 63;
       break L65;
       break;
      }
      default: {
       $1034 = $1030;$1035 = $1029;
       label = 64;
       break L65;
      }
      }
     } while(0);
    }
   }
  } while(0);
  if ((label|0) == 63) {
   label = 0;
   if ($1) {
    $1034 = $1033;$1035 = $1032;
    label = 64;
   } else {
    $1029 = $1032;$1030 = $1033;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
    continue;
   }
  }
  if ((label|0) == 64) {
   label = 0;
   $$pre261 = HEAP8[$fmt86>>0]|0;
   $182 = $$pre261;$191 = $1035;$218 = $1034;
  }
  $181 = $182 << 24 >> 24;
  $183 = ($st$0|0)!=(0);
  $184 = $181 & 15;
  $185 = ($184|0)==(3);
  $or$cond9 = $183 & $185;
  $186 = $181 & -33;
  $t$0 = $or$cond9 ? $186 : $181;
  $187 = $fl$1 & 8192;
  $188 = ($187|0)==(0);
  $189 = $fl$1 & -65537;
  $fl$1$ = $188 ? $fl$1 : $189;
  L89: do {
   switch ($t$0|0) {
   case 65: case 71: case 70: case 69: case 97: case 103: case 102: case 101:  {
    HEAP32[tempDoublePtr>>2] = $191;HEAP32[tempDoublePtr+4>>2] = $218;$355 = +HEAPF64[tempDoublePtr>>3];
    HEAP32[$e2$i>>2] = 0;
    $356 = ($218|0)<(0);
    if ($356) {
     $357 = -$355;
     $$010$i = $357;$pl$0$i = 1;$prefix$0$i = 6400;
    } else {
     $358 = $fl$1$ & 2048;
     $359 = ($358|0)==(0);
     if ($359) {
      $360 = $fl$1$ & 1;
      $361 = ($360|0)==(0);
      $$$i = $361 ? ((6400 + 1|0)) : ((6400 + 6|0));
      $$010$i = $355;$pl$0$i = $360;$prefix$0$i = $$$i;
     } else {
      $$010$i = $355;$pl$0$i = 1;$prefix$0$i = ((6400 + 3|0));
     }
    }
    HEAPF64[tempDoublePtr>>3] = $$010$i;$362 = HEAP32[tempDoublePtr>>2]|0;
    $363 = HEAP32[tempDoublePtr+4>>2]|0;
    $364 = $363 & 2146435072;
    $365 = ($364>>>0)<(2146435072);
    $366 = (0)<(0);
    $367 = ($364|0)==(2146435072);
    $368 = $367 & $366;
    $369 = $365 | $368;
    if (!($369)) {
     $370 = $t$0 & 32;
     $371 = ($370|0)!=(0);
     $372 = $371 ? 6424 : 6432;
     $373 = ($$010$i != $$010$i) | (0.0 != 0.0);
     if ($373) {
      $374 = $371 ? 6440 : 6448;
      $pl$1$i = 0;$s1$0$i = $374;
     } else {
      $pl$1$i = $pl$0$i;$s1$0$i = $372;
     }
     $375 = (($pl$1$i) + 3)|0;
     $376 = $fl$1$ & 8192;
     $377 = ($376|0)==(0);
     $378 = ($w$1|0)>($375|0);
     $or$cond$i40$i = $377 & $378;
     if ($or$cond$i40$i) {
      $379 = (($w$1) - ($375))|0;
      $380 = ($379>>>0)>(256);
      $381 = $380 ? 256 : $379;
      _memset(($pad$i|0),32,($381|0))|0;
      $382 = ($379>>>0)>(255);
      if ($382) {
       $$01$i42$i = $379;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $383 = (($$01$i42$i) + -256)|0;
        $384 = ($383>>>0)>(255);
        if ($384) {
         $$01$i42$i = $383;
        } else {
         break;
        }
       }
       $385 = $379 & 255;
       $$0$lcssa$i44$i = $385;
      } else {
       $$0$lcssa$i44$i = $379;
      }
      (___fwritex($pad$i,$$0$lcssa$i44$i,$f)|0);
     }
     (___fwritex($prefix$0$i,$pl$1$i,$f)|0);
     (___fwritex($s1$0$i,3,$f)|0);
     $386 = $fl$1$ & 73728;
     $387 = ($386|0)==(8192);
     $or$cond$i47$i = $387 & $378;
     if ($or$cond$i47$i) {
      $388 = (($w$1) - ($375))|0;
      $389 = ($388>>>0)>(256);
      $390 = $389 ? 256 : $388;
      _memset(($pad$i|0),32,($390|0))|0;
      $391 = ($388>>>0)>(255);
      if ($391) {
       $$01$i49$i = $388;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $392 = (($$01$i49$i) + -256)|0;
        $393 = ($392>>>0)>(255);
        if ($393) {
         $$01$i49$i = $392;
        } else {
         break;
        }
       }
       $394 = $388 & 255;
       $$0$lcssa$i51$i = $394;
      } else {
       $$0$lcssa$i51$i = $388;
      }
      (___fwritex($pad$i,$$0$lcssa$i51$i,$f)|0);
     }
     $w$$i = $378 ? $w$1 : $375;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $w$$i;$l10n$0 = $l10n$3;
     continue L1;
    }
    $395 = (+_frexpl($$010$i,$e2$i));
    $396 = $395 * 2.0;
    $397 = $396 != 0.0;
    if ($397) {
     $398 = HEAP32[$e2$i>>2]|0;
     $399 = (($398) + -1)|0;
     HEAP32[$e2$i>>2] = $399;
    }
    $400 = $t$0 | 32;
    $401 = ($400|0)==(97);
    if ($401) {
     $402 = $t$0 & 32;
     $403 = ($402|0)==(0);
     $404 = (($prefix$0$i) + 9|0);
     $prefix$0$$i = $403 ? $prefix$0$i : $404;
     $405 = $pl$0$i | 2;
     $406 = ($p$0>>>0)>(11);
     $407 = (12 - ($p$0))|0;
     $re$0$i = $406 ? 0 : $407;
     $408 = ($re$0$i|0)==(0);
     do {
      if ($408) {
       $$1$i = $396;
      } else {
       $re$1163$i = $re$0$i;$round$0162$i = 8.0;
       while(1) {
        $409 = (($re$1163$i) + -1)|0;
        $410 = $round$0162$i * 16.0;
        $411 = ($409|0)==(0);
        if ($411) {
         break;
        } else {
         $re$1163$i = $409;$round$0162$i = $410;
        }
       }
       $412 = HEAP8[$prefix$0$$i>>0]|0;
       $413 = ($412<<24>>24)==(45);
       if ($413) {
        $414 = -$396;
        $415 = $414 - $410;
        $416 = $410 + $415;
        $417 = -$416;
        $$1$i = $417;
        break;
       } else {
        $418 = $396 + $410;
        $419 = $418 - $410;
        $$1$i = $419;
        break;
       }
      }
     } while(0);
     $420 = HEAP32[$e2$i>>2]|0;
     $421 = ($420|0)<(0);
     $422 = (0 - ($420))|0;
     $423 = $421 ? $422 : $420;
     $424 = ($423|0)<(0);
     if ($424) {
      $425 = ($423|0)<(0);
      $426 = $425 << 31 >> 31;
      $$05$i$i = $7;$427 = $423;$428 = $426;
      while(1) {
       $429 = (___uremdi3(($427|0),($428|0),10,0)|0);
       $430 = tempRet0;
       $431 = $429 | 48;
       $432 = $431&255;
       $433 = (($$05$i$i) + -1|0);
       HEAP8[$433>>0] = $432;
       $434 = (___udivdi3(($427|0),($428|0),10,0)|0);
       $435 = tempRet0;
       $436 = ($428>>>0)>(9);
       $437 = ($427>>>0)>(4294967295);
       $438 = ($428|0)==(9);
       $439 = $438 & $437;
       $440 = $436 | $439;
       if ($440) {
        $$05$i$i = $433;$427 = $434;$428 = $435;
       } else {
        break;
       }
      }
      $$0$lcssa$i53$i = $433;$$01$lcssa$off0$i$i = $434;
     } else {
      $$0$lcssa$i53$i = $7;$$01$lcssa$off0$i$i = $423;
     }
     $441 = ($$01$lcssa$off0$i$i|0)==(0);
     if ($441) {
      $$1$lcssa$i$i = $$0$lcssa$i53$i;
     } else {
      $$12$i$i = $$0$lcssa$i53$i;$y$03$i$i = $$01$lcssa$off0$i$i;
      while(1) {
       $442 = (($y$03$i$i>>>0) % 10)&-1;
       $443 = $442 | 48;
       $444 = $443&255;
       $445 = (($$12$i$i) + -1|0);
       HEAP8[$445>>0] = $444;
       $446 = (($y$03$i$i>>>0) / 10)&-1;
       $447 = ($y$03$i$i>>>0)<(10);
       if ($447) {
        $$1$lcssa$i$i = $445;
        break;
       } else {
        $$12$i$i = $445;$y$03$i$i = $446;
       }
      }
     }
     $448 = ($$1$lcssa$i$i|0)==($7|0);
     if ($448) {
      HEAP8[$8>>0] = 48;
      $estr$0$i = $8;
     } else {
      $estr$0$i = $$1$lcssa$i$i;
     }
     $449 = HEAP32[$e2$i>>2]|0;
     $450 = $449 >> 31;
     $451 = $450 & 2;
     $452 = (($451) + 43)|0;
     $453 = $452&255;
     $454 = (($estr$0$i) + -1|0);
     HEAP8[$454>>0] = $453;
     $455 = (($t$0) + 15)|0;
     $456 = $455&255;
     $457 = (($estr$0$i) + -2|0);
     HEAP8[$457>>0] = $456;
     $notrhs$i = ($p$0|0)<(1);
     if ($notrhs$i) {
      $458 = $fl$1$ & 8;
      $459 = ($458|0)==(0);
      if ($459) {
       $$2$us$us$i = $$1$i;$s$0$us$us$i = $buf$i;
       while(1) {
        $460 = (~~(($$2$us$us$i)));
        $461 = (6456 + ($460)|0);
        $462 = HEAP8[$461>>0]|0;
        $463 = $462&255;
        $464 = $463 | $402;
        $465 = $464&255;
        $466 = (($s$0$us$us$i) + 1|0);
        HEAP8[$s$0$us$us$i>>0] = $465;
        $467 = (+($460|0));
        $468 = $$2$us$us$i - $467;
        $469 = $468 * 16.0;
        $470 = $466;
        $471 = (($470) - ($0))|0;
        $472 = ($471|0)!=(1);
        $notlhs$us$us$i = $469 == 0.0;
        $or$cond$i73 = $472 | $notlhs$us$us$i;
        if ($or$cond$i73) {
         $s$1$us$us$i = $466;
        } else {
         $473 = (($s$0$us$us$i) + 2|0);
         HEAP8[$466>>0] = 46;
         $s$1$us$us$i = $473;
        }
        $474 = $469 != 0.0;
        if ($474) {
         $$2$us$us$i = $469;$s$0$us$us$i = $s$1$us$us$i;
        } else {
         $s$1$lcssa$i = $s$1$us$us$i;
         break;
        }
       }
      } else {
       $$2$us$i = $$1$i;$s$0$us$i = $buf$i;
       while(1) {
        $475 = (~~(($$2$us$i)));
        $476 = (6456 + ($475)|0);
        $477 = HEAP8[$476>>0]|0;
        $478 = $477&255;
        $479 = $478 | $402;
        $480 = $479&255;
        $481 = (($s$0$us$i) + 1|0);
        HEAP8[$s$0$us$i>>0] = $480;
        $482 = (+($475|0));
        $483 = $$2$us$i - $482;
        $484 = $483 * 16.0;
        $485 = $481;
        $486 = (($485) - ($0))|0;
        $487 = ($486|0)==(1);
        if ($487) {
         $488 = (($s$0$us$i) + 2|0);
         HEAP8[$481>>0] = 46;
         $s$1$us$i = $488;
        } else {
         $s$1$us$i = $481;
        }
        $489 = $484 != 0.0;
        if ($489) {
         $$2$us$i = $484;$s$0$us$i = $s$1$us$i;
        } else {
         $s$1$lcssa$i = $s$1$us$i;
         break;
        }
       }
      }
     } else {
      $$2$i = $$1$i;$s$0$i = $buf$i;
      while(1) {
       $490 = (~~(($$2$i)));
       $491 = (6456 + ($490)|0);
       $492 = HEAP8[$491>>0]|0;
       $493 = $492&255;
       $494 = $493 | $402;
       $495 = $494&255;
       $496 = (($s$0$i) + 1|0);
       HEAP8[$s$0$i>>0] = $495;
       $497 = (+($490|0));
       $498 = $$2$i - $497;
       $499 = $498 * 16.0;
       $500 = $496;
       $501 = (($500) - ($0))|0;
       $502 = ($501|0)==(1);
       if ($502) {
        $503 = (($s$0$i) + 2|0);
        HEAP8[$496>>0] = 46;
        $s$1$i = $503;
       } else {
        $s$1$i = $496;
       }
       $504 = $499 != 0.0;
       if ($504) {
        $$2$i = $499;$s$0$i = $s$1$i;
       } else {
        $s$1$lcssa$i = $s$1$i;
        break;
       }
      }
     }
     $505 = ($p$0|0)!=(0);
     $$pre306$i = $s$1$lcssa$i;
     $506 = (($11) + ($$pre306$i))|0;
     $507 = ($506|0)<($p$0|0);
     $or$cond271 = $505 & $507;
     $508 = $457;
     if ($or$cond271) {
      $509 = (($12) + ($p$0))|0;
      $510 = (($509) - ($508))|0;
      $l$0$i = $510;
     } else {
      $511 = (($10) - ($508))|0;
      $512 = (($511) + ($$pre306$i))|0;
      $l$0$i = $512;
     }
     $513 = (($l$0$i) + ($405))|0;
     $514 = $fl$1$ & 73728;
     $515 = ($514|0)==(0);
     $516 = ($w$1|0)>($513|0);
     $or$cond$i57$i = $515 & $516;
     if ($or$cond$i57$i) {
      $517 = (($w$1) - ($513))|0;
      $518 = ($517>>>0)>(256);
      $519 = $518 ? 256 : $517;
      _memset(($pad$i|0),32,($519|0))|0;
      $520 = ($517>>>0)>(255);
      if ($520) {
       $$01$i59$i = $517;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $521 = (($$01$i59$i) + -256)|0;
        $522 = ($521>>>0)>(255);
        if ($522) {
         $$01$i59$i = $521;
        } else {
         break;
        }
       }
       $523 = $517 & 255;
       $$0$lcssa$i61$i = $523;
      } else {
       $$0$lcssa$i61$i = $517;
      }
      (___fwritex($pad$i,$$0$lcssa$i61$i,$f)|0);
     }
     (___fwritex($prefix$0$$i,$405,$f)|0);
     $524 = ($514|0)==(65536);
     $or$cond$i64$i = $524 & $516;
     if ($or$cond$i64$i) {
      $525 = (($w$1) - ($513))|0;
      $526 = ($525>>>0)>(256);
      $527 = $526 ? 256 : $525;
      _memset(($pad$i|0),48,($527|0))|0;
      $528 = ($525>>>0)>(255);
      if ($528) {
       $$01$i66$i = $525;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $529 = (($$01$i66$i) + -256)|0;
        $530 = ($529>>>0)>(255);
        if ($530) {
         $$01$i66$i = $529;
        } else {
         break;
        }
       }
       $531 = $525 & 255;
       $$0$lcssa$i68$i = $531;
      } else {
       $$0$lcssa$i68$i = $525;
      }
      (___fwritex($pad$i,$$0$lcssa$i68$i,$f)|0);
     }
     $532 = (($$pre306$i) - ($0))|0;
     (___fwritex($buf$i,$532,$f)|0);
     $533 = $457;
     $534 = (($9) - ($533))|0;
     $535 = (($l$0$i) - ($534))|0;
     $536 = (($535) - ($532))|0;
     $537 = ($536|0)>(0);
     if ($537) {
      $538 = ($536>>>0)>(256);
      $539 = $538 ? 256 : $536;
      _memset(($pad$i|0),48,($539|0))|0;
      $540 = ($536>>>0)>(255);
      if ($540) {
       $$01$i72$i = $536;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $541 = (($$01$i72$i) + -256)|0;
        $542 = ($541>>>0)>(255);
        if ($542) {
         $$01$i72$i = $541;
        } else {
         break;
        }
       }
       $543 = $536 & 255;
       $$0$lcssa$i74$i = $543;
      } else {
       $$0$lcssa$i74$i = $536;
      }
      (___fwritex($pad$i,$$0$lcssa$i74$i,$f)|0);
     }
     (___fwritex($457,$534,$f)|0);
     $544 = ($514|0)==(8192);
     $or$cond$i77$i = $544 & $516;
     if ($or$cond$i77$i) {
      $545 = (($w$1) - ($513))|0;
      $546 = ($545>>>0)>(256);
      $547 = $546 ? 256 : $545;
      _memset(($pad$i|0),32,($547|0))|0;
      $548 = ($545>>>0)>(255);
      if ($548) {
       $$01$i79$i = $545;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $549 = (($$01$i79$i) + -256)|0;
        $550 = ($549>>>0)>(255);
        if ($550) {
         $$01$i79$i = $549;
        } else {
         break;
        }
       }
       $551 = $545 & 255;
       $$0$lcssa$i81$i = $551;
      } else {
       $$0$lcssa$i81$i = $545;
      }
      (___fwritex($pad$i,$$0$lcssa$i81$i,$f)|0);
     }
     $w$22$i = $516 ? $w$1 : $513;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $w$22$i;$l10n$0 = $l10n$3;
     continue L1;
    }
    $552 = ($p$0|0)<(0);
    $$p$i = $552 ? 6 : $p$0;
    if ($397) {
     $553 = $396 * 268435456.0;
     $554 = HEAP32[$e2$i>>2]|0;
     $555 = (($554) + -28)|0;
     HEAP32[$e2$i>>2] = $555;
     $$3$i = $553;$557 = $555;
    } else {
     $$pre$i = HEAP32[$e2$i>>2]|0;
     $$3$i = $396;$557 = $$pre$i;
    }
    $556 = ($557|0)<(0);
    $$36$i = $556 ? $big$i : $13;
    $558 = $$36$i;
    $$4$i = $$3$i;$z$0$i = $$36$i;
    while(1) {
     $559 = (~~(($$4$i))>>>0);
     HEAP32[$z$0$i>>2] = $559;
     $560 = (($z$0$i) + 4|0);
     $561 = (+($559>>>0));
     $562 = $$4$i - $561;
     $563 = $562 * 1.0E+9;
     $564 = $563 != 0.0;
     if ($564) {
      $$4$i = $563;$z$0$i = $560;
     } else {
      break;
     }
    }
    $$pr$i = HEAP32[$e2$i>>2]|0;
    $565 = ($$pr$i|0)>(0);
    if ($565) {
     $567 = $$pr$i;$a$1258$i = $$36$i;$z$1257$i = $560;
     while(1) {
      $566 = ($567|0)>(29);
      $568 = $566 ? 29 : $567;
      $d$0249$i = (($z$1257$i) + -4|0);
      $569 = ($d$0249$i>>>0)<($a$1258$i>>>0);
      do {
       if ($569) {
        $a$2$ph$i = $a$1258$i;
       } else {
        $carry$0250$i = 0;$d$0251$i = $d$0249$i;
        while(1) {
         $570 = HEAP32[$d$0251$i>>2]|0;
         $571 = (_bitshift64Shl(($570|0),0,($568|0))|0);
         $572 = tempRet0;
         $573 = (_i64Add(($571|0),($572|0),($carry$0250$i|0),0)|0);
         $574 = tempRet0;
         $575 = (___uremdi3(($573|0),($574|0),1000000000,0)|0);
         $576 = tempRet0;
         HEAP32[$d$0251$i>>2] = $575;
         $577 = (___udivdi3(($573|0),($574|0),1000000000,0)|0);
         $578 = tempRet0;
         $d$0$i = (($d$0251$i) + -4|0);
         $579 = ($d$0$i>>>0)<($a$1258$i>>>0);
         if ($579) {
          break;
         } else {
          $carry$0250$i = $577;$d$0251$i = $d$0$i;
         }
        }
        $580 = ($577|0)==(0);
        if ($580) {
         $a$2$ph$i = $a$1258$i;
         break;
        }
        $581 = (($a$1258$i) + -4|0);
        HEAP32[$581>>2] = $577;
        $a$2$ph$i = $581;
       }
      } while(0);
      $z$2$i = $z$1257$i;
      while(1) {
       $582 = ($z$2$i>>>0)>($a$2$ph$i>>>0);
       if (!($582)) {
        break;
       }
       $583 = (($z$2$i) + -4|0);
       $584 = HEAP32[$583>>2]|0;
       $585 = ($584|0)==(0);
       if ($585) {
        $z$2$i = $583;
       } else {
        break;
       }
      }
      $586 = HEAP32[$e2$i>>2]|0;
      $587 = (($586) - ($568))|0;
      HEAP32[$e2$i>>2] = $587;
      $588 = ($587|0)>(0);
      if ($588) {
       $567 = $587;$a$1258$i = $a$2$ph$i;$z$1257$i = $z$2$i;
      } else {
       $$pr151$i = $587;$a$1$lcssa$i = $a$2$ph$i;$z$1$lcssa$i = $z$2$i;
       break;
      }
     }
    } else {
     $$pr151$i = $$pr$i;$a$1$lcssa$i = $$36$i;$z$1$lcssa$i = $560;
    }
    $589 = ($$pr151$i|0)<(0);
    L222: do {
     if ($589) {
      $590 = (($$p$i) + 25)|0;
      $591 = (($590|0) / 9)&-1;
      $592 = (($591) + 1)|0;
      $593 = ($400|0)==(102);
      if ($593) {
       $594 = (($$36$i) + ($592<<2)|0);
       $596 = $$pr151$i;$a$3244$us$i = $a$1$lcssa$i;$z$3243$us$i = $z$1$lcssa$i;
       while(1) {
        $595 = (0 - ($596))|0;
        $597 = ($595|0)>(9);
        $$23$us$i = $597 ? 9 : $595;
        $598 = ($a$3244$us$i>>>0)<($z$3243$us$i>>>0);
        do {
         if ($598) {
          $623 = 1 << $$23$us$i;
          $617 = (($623) + -1)|0;
          $620 = 1000000000 >>> $$23$us$i;
          $carry3$0238$us$i = 0;$d$1237$us$i = $a$3244$us$i;
          while(1) {
           $615 = HEAP32[$d$1237$us$i>>2]|0;
           $616 = $615 & $617;
           $618 = $615 >>> $$23$us$i;
           $619 = (($618) + ($carry3$0238$us$i))|0;
           HEAP32[$d$1237$us$i>>2] = $619;
           $606 = Math_imul($616, $620)|0;
           $621 = (($d$1237$us$i) + 4|0);
           $622 = ($621>>>0)<($z$3243$us$i>>>0);
           if ($622) {
            $carry3$0238$us$i = $606;$d$1237$us$i = $621;
           } else {
            break;
           }
          }
          $602 = HEAP32[$a$3244$us$i>>2]|0;
          $603 = ($602|0)==(0);
          $604 = (($a$3244$us$i) + 4|0);
          $$a$3$us$i = $603 ? $604 : $a$3244$us$i;
          $605 = ($606|0)==(0);
          if ($605) {
           $$a$3$us308$i = $$a$3$us$i;$z$4$us$i = $z$3243$us$i;
           break;
          }
          $607 = (($z$3243$us$i) + 4|0);
          HEAP32[$z$3243$us$i>>2] = $606;
          $$a$3$us308$i = $$a$3$us$i;$z$4$us$i = $607;
         } else {
          $599 = HEAP32[$a$3244$us$i>>2]|0;
          $600 = ($599|0)==(0);
          $601 = (($a$3244$us$i) + 4|0);
          $$a$3$us307$i = $600 ? $601 : $a$3244$us$i;
          $$a$3$us308$i = $$a$3$us307$i;$z$4$us$i = $z$3243$us$i;
         }
        } while(0);
        $608 = $z$4$us$i;
        $609 = (($608) - ($558))|0;
        $610 = $609 >> 2;
        $611 = ($610|0)>($592|0);
        $$z$4$us$i = $611 ? $594 : $z$4$us$i;
        $612 = HEAP32[$e2$i>>2]|0;
        $613 = (($612) + ($$23$us$i))|0;
        HEAP32[$e2$i>>2] = $613;
        $614 = ($613|0)<(0);
        if ($614) {
         $596 = $613;$a$3244$us$i = $$a$3$us308$i;$z$3243$us$i = $$z$4$us$i;
        } else {
         $a$3$lcssa$i = $$a$3$us308$i;$z$3$lcssa$i = $$z$4$us$i;
         break L222;
        }
       }
      } else {
       $625 = $$pr151$i;$a$3244$i = $a$1$lcssa$i;$z$3243$i = $z$1$lcssa$i;
      }
      while(1) {
       $624 = (0 - ($625))|0;
       $626 = ($624|0)>(9);
       $$23$i = $626 ? 9 : $624;
       $627 = ($a$3244$i>>>0)<($z$3243$i>>>0);
       do {
        if ($627) {
         $631 = 1 << $$23$i;
         $632 = (($631) + -1)|0;
         $633 = 1000000000 >>> $$23$i;
         $carry3$0238$i = 0;$d$1237$i = $a$3244$i;
         while(1) {
          $634 = HEAP32[$d$1237$i>>2]|0;
          $635 = $634 & $632;
          $636 = $634 >>> $$23$i;
          $637 = (($636) + ($carry3$0238$i))|0;
          HEAP32[$d$1237$i>>2] = $637;
          $638 = Math_imul($635, $633)|0;
          $639 = (($d$1237$i) + 4|0);
          $640 = ($639>>>0)<($z$3243$i>>>0);
          if ($640) {
           $carry3$0238$i = $638;$d$1237$i = $639;
          } else {
           break;
          }
         }
         $641 = HEAP32[$a$3244$i>>2]|0;
         $642 = ($641|0)==(0);
         $643 = (($a$3244$i) + 4|0);
         $$a$3$i = $642 ? $643 : $a$3244$i;
         $644 = ($638|0)==(0);
         if ($644) {
          $$a$3310$i = $$a$3$i;$z$4$i = $z$3243$i;
          break;
         }
         $645 = (($z$3243$i) + 4|0);
         HEAP32[$z$3243$i>>2] = $638;
         $$a$3310$i = $$a$3$i;$z$4$i = $645;
        } else {
         $628 = HEAP32[$a$3244$i>>2]|0;
         $629 = ($628|0)==(0);
         $630 = (($a$3244$i) + 4|0);
         $$a$3309$i = $629 ? $630 : $a$3244$i;
         $$a$3310$i = $$a$3309$i;$z$4$i = $z$3243$i;
        }
       } while(0);
       $646 = $z$4$i;
       $647 = $$a$3310$i;
       $648 = (($646) - ($647))|0;
       $649 = $648 >> 2;
       $650 = ($649|0)>($592|0);
       if ($650) {
        $651 = (($$a$3310$i) + ($592<<2)|0);
        $z$5$i = $651;
       } else {
        $z$5$i = $z$4$i;
       }
       $652 = HEAP32[$e2$i>>2]|0;
       $653 = (($652) + ($$23$i))|0;
       HEAP32[$e2$i>>2] = $653;
       $654 = ($653|0)<(0);
       if ($654) {
        $625 = $653;$a$3244$i = $$a$3310$i;$z$3243$i = $z$5$i;
       } else {
        $a$3$lcssa$i = $$a$3310$i;$z$3$lcssa$i = $z$5$i;
        break;
       }
      }
     } else {
      $a$3$lcssa$i = $a$1$lcssa$i;$z$3$lcssa$i = $z$1$lcssa$i;
     }
    } while(0);
    $655 = ($a$3$lcssa$i>>>0)<($z$3$lcssa$i>>>0);
    do {
     if ($655) {
      $656 = $a$3$lcssa$i;
      $657 = (($558) - ($656))|0;
      $658 = $657 >> 2;
      $659 = ($658*9)|0;
      $660 = HEAP32[$a$3$lcssa$i>>2]|0;
      $661 = ($660>>>0)<(10);
      if ($661) {
       $e$1$i = $659;
       break;
      } else {
       $e$0233$i = $659;$i$0232$i = 10;
      }
      while(1) {
       $662 = ($i$0232$i*10)|0;
       $663 = (($e$0233$i) + 1)|0;
       $664 = ($660>>>0)<($662>>>0);
       if ($664) {
        $e$1$i = $663;
        break;
       } else {
        $e$0233$i = $663;$i$0232$i = $662;
       }
      }
     } else {
      $e$1$i = 0;
     }
    } while(0);
    $665 = ($400|0)!=(102);
    $666 = $665 ? $e$1$i : 0;
    $667 = (($$p$i) - ($666))|0;
    $668 = ($400|0)==(103);
    $669 = ($$p$i|0)!=(0);
    $$24$i = $668 & $669;
    $$neg156$i = $$24$i << 31 >> 31;
    $670 = (($667) + ($$neg156$i))|0;
    $671 = $z$3$lcssa$i;
    $672 = (($671) - ($558))|0;
    $673 = $672 >> 2;
    $674 = ($673*9)|0;
    $675 = (($674) + -9)|0;
    $676 = ($670|0)<($675|0);
    if ($676) {
     $677 = (($670) + 9216)|0;
     $678 = (($677|0) / 9)&-1;
     $$sum$i = (($678) + -1023)|0;
     $679 = (($$36$i) + ($$sum$i<<2)|0);
     $680 = (($677|0) % 9)&-1;
     $j$0224$i = (($680) + 1)|0;
     $681 = ($j$0224$i|0)<(9);
     if ($681) {
      $i$1225$i = 10;$j$0226$i = $j$0224$i;
      while(1) {
       $682 = ($i$1225$i*10)|0;
       $j$0$i = (($j$0226$i) + 1)|0;
       $exitcond$i = ($j$0$i|0)==(9);
       if ($exitcond$i) {
        $i$1$lcssa$i = $682;
        break;
       } else {
        $i$1225$i = $682;$j$0226$i = $j$0$i;
       }
      }
     } else {
      $i$1$lcssa$i = 10;
     }
     $683 = HEAP32[$679>>2]|0;
     $684 = (($683>>>0) % ($i$1$lcssa$i>>>0))&-1;
     $685 = ($684|0)==(0);
     if ($685) {
      $$sum18$i = (($678) + -1022)|0;
      $686 = (($$36$i) + ($$sum18$i<<2)|0);
      $687 = ($686|0)==($z$3$lcssa$i|0);
      if ($687) {
       $a$7$i = $a$3$lcssa$i;$d$3$i = $679;$e$3$i = $e$1$i;
      } else {
       label = 232;
      }
     } else {
      label = 232;
     }
     do {
      if ((label|0) == 232) {
       label = 0;
       $688 = (($683>>>0) / ($i$1$lcssa$i>>>0))&-1;
       $689 = $688 & 1;
       $690 = ($689|0)==(0);
       $$25$i = $690 ? 9007199254740992.0 : 9007199254740994.0;
       $691 = (($i$1$lcssa$i|0) / 2)&-1;
       $692 = ($684>>>0)<($691>>>0);
       do {
        if ($692) {
         $small$0$i = 0.5;
        } else {
         $693 = ($684|0)==($691|0);
         if ($693) {
          $$sum19$i = (($678) + -1022)|0;
          $694 = (($$36$i) + ($$sum19$i<<2)|0);
          $695 = ($694|0)==($z$3$lcssa$i|0);
          if ($695) {
           $small$0$i = 1.0;
           break;
          }
         }
         $small$0$i = 1.5;
        }
       } while(0);
       $696 = ($pl$0$i|0)==(0);
       do {
        if ($696) {
         $round6$1$i = $$25$i;$small$1$i = $small$0$i;
        } else {
         $697 = HEAP8[$prefix$0$i>>0]|0;
         $698 = ($697<<24>>24)==(45);
         if (!($698)) {
          $round6$1$i = $$25$i;$small$1$i = $small$0$i;
          break;
         }
         $699 = $$25$i * -1.0;
         $700 = $small$0$i * -1.0;
         $round6$1$i = $699;$small$1$i = $700;
        }
       } while(0);
       $701 = (($683) - ($684))|0;
       HEAP32[$679>>2] = $701;
       $702 = $round6$1$i + $small$1$i;
       $703 = $702 != $round6$1$i;
       if (!($703)) {
        $a$7$i = $a$3$lcssa$i;$d$3$i = $679;$e$3$i = $e$1$i;
        break;
       }
       $704 = (($701) + ($i$1$lcssa$i))|0;
       HEAP32[$679>>2] = $704;
       $705 = ($704>>>0)>(999999999);
       if ($705) {
        $a$5218$i = $a$3$lcssa$i;$d$2217$i = $679;
        while(1) {
         $706 = (($d$2217$i) + -4|0);
         HEAP32[$d$2217$i>>2] = 0;
         $707 = ($706>>>0)<($a$5218$i>>>0);
         if ($707) {
          $708 = (($a$5218$i) + -4|0);
          HEAP32[$708>>2] = 0;
          $a$6$i = $708;
         } else {
          $a$6$i = $a$5218$i;
         }
         $709 = HEAP32[$706>>2]|0;
         $710 = (($709) + 1)|0;
         HEAP32[$706>>2] = $710;
         $711 = ($710>>>0)>(999999999);
         if ($711) {
          $a$5218$i = $a$6$i;$d$2217$i = $706;
         } else {
          $a$5$lcssa$i = $a$6$i;$d$2$lcssa$i = $706;
          break;
         }
        }
       } else {
        $a$5$lcssa$i = $a$3$lcssa$i;$d$2$lcssa$i = $679;
       }
       $712 = $a$5$lcssa$i;
       $713 = (($558) - ($712))|0;
       $714 = $713 >> 2;
       $715 = ($714*9)|0;
       $716 = HEAP32[$a$5$lcssa$i>>2]|0;
       $717 = ($716>>>0)<(10);
       if ($717) {
        $a$7$i = $a$5$lcssa$i;$d$3$i = $d$2$lcssa$i;$e$3$i = $715;
        break;
       } else {
        $e$2213$i = $715;$i$2212$i = 10;
       }
       while(1) {
        $718 = ($i$2212$i*10)|0;
        $719 = (($e$2213$i) + 1)|0;
        $720 = ($716>>>0)<($718>>>0);
        if ($720) {
         $a$7$i = $a$5$lcssa$i;$d$3$i = $d$2$lcssa$i;$e$3$i = $719;
         break;
        } else {
         $e$2213$i = $719;$i$2212$i = $718;
        }
       }
      }
     } while(0);
     $721 = (($d$3$i) + 4|0);
     $722 = ($z$3$lcssa$i>>>0)>($721>>>0);
     $$z$3$i = $722 ? $721 : $z$3$lcssa$i;
     $a$8$ph$i = $a$7$i;$e$4$ph$i = $e$3$i;$z$6$ph$i = $$z$3$i;
    } else {
     $a$8$ph$i = $a$3$lcssa$i;$e$4$ph$i = $e$1$i;$z$6$ph$i = $z$3$lcssa$i;
    }
    $723 = (0 - ($e$4$ph$i))|0;
    $z$6$i = $z$6$ph$i;
    while(1) {
     $724 = ($z$6$i>>>0)>($a$8$ph$i>>>0);
     if (!($724)) {
      $$lcssa292$i = 0;
      break;
     }
     $725 = (($z$6$i) + -4|0);
     $726 = HEAP32[$725>>2]|0;
     $727 = ($726|0)==(0);
     if ($727) {
      $z$6$i = $725;
     } else {
      $$lcssa292$i = 1;
      break;
     }
    }
    do {
     if ($668) {
      $728 = ($$p$i|0)==(0);
      $729 = $728&1;
      $$$p$i = (($729) + ($$p$i))|0;
      $730 = ($$$p$i|0)>($e$4$ph$i|0);
      $731 = ($e$4$ph$i|0)>(-5);
      $or$cond5$i = $730 & $731;
      if ($or$cond5$i) {
       $732 = (($t$0) + -1)|0;
       $$neg157$i = (($$$p$i) + -1)|0;
       $733 = (($$neg157$i) - ($e$4$ph$i))|0;
       $$016$i = $732;$$213$i = $733;
      } else {
       $734 = (($t$0) + -2)|0;
       $735 = (($$$p$i) + -1)|0;
       $$016$i = $734;$$213$i = $735;
      }
      $736 = $fl$1$ & 8;
      $737 = ($736|0)==(0);
      if (!($737)) {
       $$117$i = $$016$i;$$314$i = $$213$i;
       break;
      }
      do {
       if ($$lcssa292$i) {
        $738 = (($z$6$i) + -4|0);
        $739 = HEAP32[$738>>2]|0;
        $740 = ($739|0)==(0);
        if ($740) {
         $j$2$i = 9;
         break;
        }
        $741 = (($739>>>0) % 10)&-1;
        $742 = ($741|0)==(0);
        if ($742) {
         $i$3204$i = 10;$j$1205$i = 0;
        } else {
         $j$2$i = 0;
         break;
        }
        while(1) {
         $743 = ($i$3204$i*10)|0;
         $744 = (($j$1205$i) + 1)|0;
         $745 = (($739>>>0) % ($743>>>0))&-1;
         $746 = ($745|0)==(0);
         if ($746) {
          $i$3204$i = $743;$j$1205$i = $744;
         } else {
          $j$2$i = $744;
          break;
         }
        }
       } else {
        $j$2$i = 9;
       }
      } while(0);
      $747 = $$016$i | 32;
      $748 = ($747|0)==(102);
      $749 = $z$6$i;
      $750 = (($749) - ($558))|0;
      $751 = $750 >> 2;
      $752 = ($751*9)|0;
      $753 = (($752) + -9)|0;
      if ($748) {
       $754 = (($753) - ($j$2$i))|0;
       $755 = ($754|0)<(0);
       $$26$i = $755 ? 0 : $754;
       $756 = ($$213$i|0)<($$26$i|0);
       $$213$$26$i = $756 ? $$213$i : $$26$i;
       $$117$i = $$016$i;$$314$i = $$213$$26$i;
       break;
      } else {
       $757 = (($753) + ($e$4$ph$i))|0;
       $758 = (($757) - ($j$2$i))|0;
       $759 = ($758|0)<(0);
       $$28$i = $759 ? 0 : $758;
       $760 = ($$213$i|0)<($$28$i|0);
       $$213$$28$i = $760 ? $$213$i : $$28$i;
       $$117$i = $$016$i;$$314$i = $$213$$28$i;
       break;
      }
     } else {
      $$117$i = $t$0;$$314$i = $$p$i;
     }
    } while(0);
    $761 = ($$314$i|0)!=(0);
    if ($761) {
     $765 = 1;
    } else {
     $762 = $fl$1$ & 8;
     $763 = ($762|0)!=(0);
     $765 = $763;
    }
    $764 = $765&1;
    $766 = $$117$i | 32;
    $767 = ($766|0)==(102);
    if ($767) {
     $768 = ($e$4$ph$i|0)>(0);
     $769 = $768 ? $e$4$ph$i : 0;
     $$pn$i = $769;$estr$2$i = 0;
    } else {
     $770 = ($e$4$ph$i|0)<(0);
     $771 = $770 ? $723 : $e$4$ph$i;
     $772 = ($771|0)<(0);
     if ($772) {
      $773 = ($771|0)<(0);
      $774 = $773 << 31 >> 31;
      $$05$i84$i = $7;$775 = $771;$776 = $774;
      while(1) {
       $777 = (___uremdi3(($775|0),($776|0),10,0)|0);
       $778 = tempRet0;
       $779 = $777 | 48;
       $780 = $779&255;
       $781 = (($$05$i84$i) + -1|0);
       HEAP8[$781>>0] = $780;
       $782 = (___udivdi3(($775|0),($776|0),10,0)|0);
       $783 = tempRet0;
       $784 = ($776>>>0)>(9);
       $785 = ($775>>>0)>(4294967295);
       $786 = ($776|0)==(9);
       $787 = $786 & $785;
       $788 = $784 | $787;
       if ($788) {
        $$05$i84$i = $781;$775 = $782;$776 = $783;
       } else {
        break;
       }
      }
      $$0$lcssa$i89$i = $781;$$01$lcssa$off0$i90$i = $782;
     } else {
      $$0$lcssa$i89$i = $7;$$01$lcssa$off0$i90$i = $771;
     }
     $789 = ($$01$lcssa$off0$i90$i|0)==(0);
     if ($789) {
      $estr$1$ph$i = $$0$lcssa$i89$i;
     } else {
      $$12$i92$i = $$0$lcssa$i89$i;$y$03$i91$i = $$01$lcssa$off0$i90$i;
      while(1) {
       $790 = (($y$03$i91$i>>>0) % 10)&-1;
       $791 = $790 | 48;
       $792 = $791&255;
       $793 = (($$12$i92$i) + -1|0);
       HEAP8[$793>>0] = $792;
       $794 = (($y$03$i91$i>>>0) / 10)&-1;
       $795 = ($y$03$i91$i>>>0)<(10);
       if ($795) {
        $estr$1$ph$i = $793;
        break;
       } else {
        $$12$i92$i = $793;$y$03$i91$i = $794;
       }
      }
     }
     $796 = $estr$1$ph$i;
     $797 = (($9) - ($796))|0;
     $798 = ($797|0)<(2);
     if ($798) {
      $estr$1195$i = $estr$1$ph$i;
      while(1) {
       $799 = (($estr$1195$i) + -1|0);
       HEAP8[$799>>0] = 48;
       $800 = $799;
       $801 = (($9) - ($800))|0;
       $802 = ($801|0)<(2);
       if ($802) {
        $estr$1195$i = $799;
       } else {
        $estr$1$lcssa$i = $799;
        break;
       }
      }
     } else {
      $estr$1$lcssa$i = $estr$1$ph$i;
     }
     $803 = $e$4$ph$i >> 31;
     $804 = $803 & 2;
     $805 = (($804) + 43)|0;
     $806 = $805&255;
     $807 = (($estr$1$lcssa$i) + -1|0);
     HEAP8[$807>>0] = $806;
     $808 = $$117$i&255;
     $809 = (($estr$1$lcssa$i) + -2|0);
     HEAP8[$809>>0] = $808;
     $810 = $809;
     $811 = (($9) - ($810))|0;
     $$pn$i = $811;$estr$2$i = $809;
    }
    $812 = (($pl$0$i) + 1)|0;
    $813 = (($812) + ($$314$i))|0;
    $l$1$i = (($813) + ($764))|0;
    $814 = (($l$1$i) + ($$pn$i))|0;
    $815 = $fl$1$ & 73728;
    $816 = ($815|0)==(0);
    $817 = ($w$1|0)>($814|0);
    $or$cond$i98$i = $816 & $817;
    if ($or$cond$i98$i) {
     $818 = (($w$1) - ($814))|0;
     $819 = ($818>>>0)>(256);
     $820 = $819 ? 256 : $818;
     _memset(($pad$i|0),32,($820|0))|0;
     $821 = ($818>>>0)>(255);
     if ($821) {
      $$01$i100$i = $818;
      while(1) {
       (___fwritex($pad$i,256,$f)|0);
       $822 = (($$01$i100$i) + -256)|0;
       $823 = ($822>>>0)>(255);
       if ($823) {
        $$01$i100$i = $822;
       } else {
        break;
       }
      }
      $824 = $818 & 255;
      $$0$lcssa$i102$i = $824;
     } else {
      $$0$lcssa$i102$i = $818;
     }
     (___fwritex($pad$i,$$0$lcssa$i102$i,$f)|0);
    }
    (___fwritex($prefix$0$i,$pl$0$i,$f)|0);
    $825 = ($815|0)==(65536);
    $or$cond$i105$i = $825 & $817;
    if ($or$cond$i105$i) {
     $826 = (($w$1) - ($814))|0;
     $827 = ($826>>>0)>(256);
     $828 = $827 ? 256 : $826;
     _memset(($pad$i|0),48,($828|0))|0;
     $829 = ($826>>>0)>(255);
     if ($829) {
      $$01$i107$i = $826;
      while(1) {
       (___fwritex($pad$i,256,$f)|0);
       $830 = (($$01$i107$i) + -256)|0;
       $831 = ($830>>>0)>(255);
       if ($831) {
        $$01$i107$i = $830;
       } else {
        break;
       }
      }
      $832 = $826 & 255;
      $$0$lcssa$i109$i = $832;
     } else {
      $$0$lcssa$i109$i = $826;
     }
     (___fwritex($pad$i,$$0$lcssa$i109$i,$f)|0);
    }
    do {
     if ($767) {
      $833 = ($a$8$ph$i>>>0)>($$36$i>>>0);
      $r$0$a$8$i = $833 ? $$36$i : $a$8$ph$i;
      $d$4180$i = $r$0$a$8$i;
      while(1) {
       $834 = HEAP32[$d$4180$i>>2]|0;
       $835 = ($834|0)==(0);
       if ($835) {
        $$1$lcssa$i117$i = $14;
       } else {
        $$12$i115$i = $14;$y$03$i114$i = $834;
        while(1) {
         $836 = (($y$03$i114$i>>>0) % 10)&-1;
         $837 = $836 | 48;
         $838 = $837&255;
         $839 = (($$12$i115$i) + -1|0);
         HEAP8[$839>>0] = $838;
         $840 = (($y$03$i114$i>>>0) / 10)&-1;
         $841 = ($y$03$i114$i>>>0)<(10);
         if ($841) {
          $$1$lcssa$i117$i = $839;
          break;
         } else {
          $$12$i115$i = $839;$y$03$i114$i = $840;
         }
        }
       }
       $842 = ($d$4180$i|0)==($r$0$a$8$i|0);
       do {
        if ($842) {
         $846 = ($$1$lcssa$i117$i|0)==($14|0);
         if (!($846)) {
          $s7$1$i = $$1$lcssa$i117$i;
          break;
         }
         HEAP8[$16>>0] = 48;
         $s7$1$i = $16;
        } else {
         $843 = ($$1$lcssa$i117$i>>>0)>($buf$i>>>0);
         if ($843) {
          $s7$0177$i = $$1$lcssa$i117$i;
         } else {
          $s7$1$i = $$1$lcssa$i117$i;
          break;
         }
         while(1) {
          $844 = (($s7$0177$i) + -1|0);
          HEAP8[$844>>0] = 48;
          $845 = ($844>>>0)>($buf$i>>>0);
          if ($845) {
           $s7$0177$i = $844;
          } else {
           $s7$1$i = $844;
           break;
          }
         }
        }
       } while(0);
       $847 = $s7$1$i;
       $848 = (($15) - ($847))|0;
       (___fwritex($s7$1$i,$848,$f)|0);
       $849 = (($d$4180$i) + 4|0);
       $850 = ($849>>>0)>($$36$i>>>0);
       if ($850) {
        break;
       } else {
        $d$4180$i = $849;
       }
      }
      $$not$i = $761 ^ 1;
      $851 = $fl$1$ & 8;
      $852 = ($851|0)==(0);
      $or$cond32$i = $852 & $$not$i;
      if (!($or$cond32$i)) {
       (___fwritex(6472,1,$f)|0);
      }
      $853 = ($849>>>0)<($z$6$i>>>0);
      $854 = ($$314$i|0)>(0);
      $or$cond7169$i = $853 & $854;
      if ($or$cond7169$i) {
       $$415171$i = $$314$i;$d$5170$i = $849;
       while(1) {
        $855 = HEAP32[$d$5170$i>>2]|0;
        $856 = ($855|0)==(0);
        if ($856) {
         $s8$0165$i = $14;
         label = 301;
        } else {
         $$12$i124$i = $14;$y$03$i123$i = $855;
         while(1) {
          $857 = (($y$03$i123$i>>>0) % 10)&-1;
          $858 = $857 | 48;
          $859 = $858&255;
          $860 = (($$12$i124$i) + -1|0);
          HEAP8[$860>>0] = $859;
          $861 = (($y$03$i123$i>>>0) / 10)&-1;
          $862 = ($y$03$i123$i>>>0)<(10);
          if ($862) {
           break;
          } else {
           $$12$i124$i = $860;$y$03$i123$i = $861;
          }
         }
         $863 = ($860>>>0)>($buf$i>>>0);
         if ($863) {
          $s8$0165$i = $860;
          label = 301;
         } else {
          $s8$0$lcssa$i = $860;
         }
        }
        if ((label|0) == 301) {
         while(1) {
          label = 0;
          $864 = (($s8$0165$i) + -1|0);
          HEAP8[$864>>0] = 48;
          $865 = ($864>>>0)>($buf$i>>>0);
          if ($865) {
           $s8$0165$i = $864;
           label = 301;
          } else {
           $s8$0$lcssa$i = $864;
           break;
          }
         }
        }
        $866 = ($$415171$i|0)>(9);
        $867 = $866 ? 9 : $$415171$i;
        (___fwritex($s8$0$lcssa$i,$867,$f)|0);
        $868 = (($d$5170$i) + 4|0);
        $869 = (($$415171$i) + -9)|0;
        $870 = ($868>>>0)<($z$6$i>>>0);
        $871 = ($869|0)>(0);
        $or$cond7$i = $870 & $871;
        if ($or$cond7$i) {
         $$415171$i = $869;$d$5170$i = $868;
        } else {
         $$415$lcssa$i = $869;
         break;
        }
       }
      } else {
       $$415$lcssa$i = $$314$i;
      }
      $872 = ($$415$lcssa$i|0)>(0);
      if (!($872)) {
       break;
      }
      $873 = ($$415$lcssa$i>>>0)>(256);
      $874 = $873 ? 256 : $$415$lcssa$i;
      _memset(($pad$i|0),48,($874|0))|0;
      $875 = ($$415$lcssa$i>>>0)>(255);
      if ($875) {
       $$01$i131$i = $$415$lcssa$i;
       while(1) {
        (___fwritex($pad$i,256,$f)|0);
        $876 = (($$01$i131$i) + -256)|0;
        $877 = ($876>>>0)>(255);
        if ($877) {
         $$01$i131$i = $876;
        } else {
         break;
        }
       }
       $878 = $$415$lcssa$i & 255;
       $$0$lcssa$i133$i = $878;
      } else {
       $$0$lcssa$i133$i = $$415$lcssa$i;
      }
      (___fwritex($pad$i,$$0$lcssa$i133$i,$f)|0);
     } else {
      $879 = (($a$8$ph$i) + 4|0);
      $z$6$$i = $$lcssa292$i ? $z$6$i : $879;
      $880 = ($$314$i|0)>(-1);
      do {
       if ($880) {
        $881 = $fl$1$ & 8;
        $882 = ($881|0)==(0);
        $$5189$i = $$314$i;$d$6188$i = $a$8$ph$i;
        while(1) {
         $883 = HEAP32[$d$6188$i>>2]|0;
         $884 = ($883|0)==(0);
         if ($884) {
          label = 313;
         } else {
          $$12$i139$i = $14;$y$03$i138$i = $883;
          while(1) {
           $885 = (($y$03$i138$i>>>0) % 10)&-1;
           $886 = $885 | 48;
           $887 = $886&255;
           $888 = (($$12$i139$i) + -1|0);
           HEAP8[$888>>0] = $887;
           $889 = (($y$03$i138$i>>>0) / 10)&-1;
           $890 = ($y$03$i138$i>>>0)<(10);
           if ($890) {
            break;
           } else {
            $$12$i139$i = $888;$y$03$i138$i = $889;
           }
          }
          $891 = ($888|0)==($14|0);
          if ($891) {
           label = 313;
          } else {
           $s9$0$i = $888;
          }
         }
         if ((label|0) == 313) {
          label = 0;
          HEAP8[$16>>0] = 48;
          $s9$0$i = $16;
         }
         $892 = ($d$6188$i|0)==($a$8$ph$i|0);
         do {
          if ($892) {
           $896 = (($s9$0$i) + 1|0);
           (___fwritex($s9$0$i,1,$f)|0);
           $897 = ($$5189$i|0)<(1);
           $or$cond34$i = $897 & $882;
           if ($or$cond34$i) {
            $s9$2$i = $896;
            break;
           }
           (___fwritex(6472,1,$f)|0);
           $s9$2$i = $896;
          } else {
           $893 = ($s9$0$i>>>0)>($buf$i>>>0);
           if ($893) {
            $s9$1184$i = $s9$0$i;
           } else {
            $s9$2$i = $s9$0$i;
            break;
           }
           while(1) {
            $894 = (($s9$1184$i) + -1|0);
            HEAP8[$894>>0] = 48;
            $895 = ($894>>>0)>($buf$i>>>0);
            if ($895) {
             $s9$1184$i = $894;
            } else {
             $s9$2$i = $894;
             break;
            }
           }
          }
         } while(0);
         $898 = $s9$2$i;
         $899 = (($15) - ($898))|0;
         $900 = ($$5189$i|0)>($899|0);
         $$$5$i = $900 ? $899 : $$5189$i;
         (___fwritex($s9$2$i,$$$5$i,$f)|0);
         $901 = (($$5189$i) - ($899))|0;
         $902 = (($d$6188$i) + 4|0);
         $903 = ($902>>>0)<($z$6$$i>>>0);
         $904 = ($901|0)>(-1);
         $or$cond9$i = $903 & $904;
         if ($or$cond9$i) {
          $$5189$i = $901;$d$6188$i = $902;
         } else {
          break;
         }
        }
        $905 = ($901|0)>(0);
        if (!($905)) {
         break;
        }
        $906 = ($901>>>0)>(256);
        $907 = $906 ? 256 : $901;
        _memset(($pad$i|0),48,($907|0))|0;
        $908 = ($901>>>0)>(255);
        if ($908) {
         $$01$i146$i = $901;
         while(1) {
          (___fwritex($pad$i,256,$f)|0);
          $909 = (($$01$i146$i) + -256)|0;
          $910 = ($909>>>0)>(255);
          if ($910) {
           $$01$i146$i = $909;
          } else {
           break;
          }
         }
         $911 = $901 & 255;
         $$0$lcssa$i148$i = $911;
        } else {
         $$0$lcssa$i148$i = $901;
        }
        (___fwritex($pad$i,$$0$lcssa$i148$i,$f)|0);
       }
      } while(0);
      $912 = $estr$2$i;
      $913 = (($9) - ($912))|0;
      (___fwritex($estr$2$i,$913,$f)|0);
     }
    } while(0);
    $914 = ($815|0)==(8192);
    $or$cond$i$i = $914 & $817;
    if ($or$cond$i$i) {
     $915 = (($w$1) - ($814))|0;
     $916 = ($915>>>0)>(256);
     $917 = $916 ? 256 : $915;
     _memset(($pad$i|0),32,($917|0))|0;
     $918 = ($915>>>0)>(255);
     if ($918) {
      $$01$i$i = $915;
      while(1) {
       (___fwritex($pad$i,256,$f)|0);
       $919 = (($$01$i$i) + -256)|0;
       $920 = ($919>>>0)>(255);
       if ($920) {
        $$01$i$i = $919;
       } else {
        break;
       }
      }
      $921 = $915 & 255;
      $$0$lcssa$i$i = $921;
     } else {
      $$0$lcssa$i$i = $915;
     }
     (___fwritex($pad$i,$$0$lcssa$i$i,$f)|0);
    }
    $w$35$i = $817 ? $w$1 : $814;
    $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $w$35$i;$l10n$0 = $l10n$3;
    continue L1;
    break;
   }
   case 105: case 100:  {
    $255 = ($218|0)<(0);
    if ($255) {
     $256 = (_i64Subtract(0,0,($191|0),($218|0))|0);
     $257 = tempRet0;
     $263 = $257;$265 = $256;$pl$0 = 1;$prefix$0 = 6376;
     label = 86;
     break L89;
    }
    $258 = $fl$1$ & 2048;
    $259 = ($258|0)==(0);
    if ($259) {
     $260 = $fl$1$ & 1;
     $261 = ($260|0)==(0);
     $$ = $261 ? 6376 : ((6376 + 2|0));
     $263 = $218;$265 = $191;$pl$0 = $260;$prefix$0 = $$;
     label = 86;
    } else {
     $263 = $218;$265 = $191;$pl$0 = 1;$prefix$0 = ((6376 + 1|0));
     label = 86;
    }
    break;
   }
   case 110:  {
    switch ($st$0|0) {
    case 0:  {
     $190 = $191;
     HEAP32[$190>>2] = $cnt$1;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 1:  {
     $192 = $191;
     HEAP32[$192>>2] = $cnt$1;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 2:  {
     $193 = ($cnt$1|0)<(0);
     $194 = $193 << 31 >> 31;
     $195 = $191;
     $196 = $195;
     $197 = $196;
     HEAP32[$197>>2] = $cnt$1;
     $198 = (($196) + 4)|0;
     $199 = $198;
     HEAP32[$199>>2] = $194;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 3:  {
     $200 = $cnt$1&65535;
     $201 = $191;
     HEAP16[$201>>1] = $200;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 4:  {
     $202 = $cnt$1&255;
     $203 = $191;
     HEAP8[$203>>0] = $202;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 6:  {
     $204 = $191;
     HEAP32[$204>>2] = $cnt$1;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 7:  {
     $205 = ($cnt$1|0)<(0);
     $206 = $205 << 31 >> 31;
     $207 = $191;
     $208 = $207;
     $209 = $208;
     HEAP32[$209>>2] = $cnt$1;
     $210 = (($208) + 4)|0;
     $211 = $210;
     HEAP32[$211>>2] = $206;
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    default: {
     $1029 = $191;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
    }
    }
    break;
   }
   case 112:  {
    $212 = ($p$0>>>0)>(8);
    $213 = $212 ? $p$0 : 8;
    $214 = $fl$1$ | 8;
    $fl$3 = $214;$p$1 = $213;$t$1 = 120;
    label = 75;
    break;
   }
   case 88: case 120:  {
    $fl$3 = $fl$1$;$p$1 = $p$0;$t$1 = $t$0;
    label = 75;
    break;
   }
   case 99:  {
    $304 = $191&255;
    HEAP8[$4>>0] = $304;
    $1036 = $191;$1037 = $218;$a$2 = $4;$fl$6 = $189;$p$5 = 1;$pl$2 = 0;$prefix$2 = 6376;$z$2 = $2;
    break;
   }
   case 109:  {
    $305 = (___errno_location()|0);
    $306 = HEAP32[$305>>2]|0;
    $307 = (_strerror(($306|0))|0);
    $a$1 = $307;
    label = 96;
    break;
   }
   case 115:  {
    $308 = $191;
    $309 = ($191|0)==(0);
    $$15 = $309 ? 6392 : $308;
    $a$1 = $$15;
    label = 96;
    break;
   }
   case 67:  {
    HEAP32[$wc>>2] = $191;
    HEAP32[$5>>2] = 0;
    $1038 = $wc;$1039 = $6;$p$4266 = -1;
    label = 101;
    break;
   }
   case 83:  {
    $316 = $191;
    $317 = ($p$0|0)==(0);
    if ($317) {
     $1040 = $191;$1041 = $316;$i$0$lcssa267 = 0;
     label = 106;
    } else {
     $1038 = $316;$1039 = $191;$p$4266 = $p$0;
     label = 101;
    }
    break;
   }
   case 111:  {
    $238 = ($191|0)==(0);
    $239 = ($218|0)==(0);
    $240 = $238 & $239;
    if ($240) {
     $$0$lcssa$i45 = $2;
    } else {
     $$03$i42 = $2;$242 = $191;$246 = $218;
     while(1) {
      $241 = $242 & 7;
      $243 = $241 | 48;
      $244 = $243&255;
      $245 = (($$03$i42) + -1|0);
      HEAP8[$245>>0] = $244;
      $247 = (_bitshift64Lshr(($242|0),($246|0),3)|0);
      $248 = tempRet0;
      $249 = ($247|0)==(0);
      $250 = ($248|0)==(0);
      $251 = $249 & $250;
      if ($251) {
       $$0$lcssa$i45 = $245;
       break;
      } else {
       $$03$i42 = $245;$242 = $247;$246 = $248;
      }
     }
    }
    $252 = $fl$1$ & 8;
    $253 = ($252|0)==(0);
    $or$cond13 = $253 | $240;
    $$19 = $or$cond13 ? 6376 : ((6376 + 5|0));
    $254 = $or$cond13&1;
    $$20 = $254 ^ 1;
    $293 = $191;$295 = $218;$a$0 = $$0$lcssa$i45;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $$20;$prefix$1 = $$19;
    label = 91;
    break;
   }
   case 117:  {
    $263 = $218;$265 = $191;$pl$0 = 0;$prefix$0 = 6376;
    label = 86;
    break;
   }
   default: {
    $1036 = $191;$1037 = $218;$a$2 = $fmt83;$fl$6 = $fl$1$;$p$5 = $p$0;$pl$2 = 0;$prefix$2 = 6376;$z$2 = $2;
   }
   }
  } while(0);
  do {
   if ((label|0) == 75) {
    label = 0;
    $215 = $t$1 & 32;
    $216 = ($191|0)==(0);
    $217 = ($218|0)==(0);
    $219 = $216 & $217;
    if ($219) {
     $293 = $191;$295 = $218;$a$0 = $2;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 6376;
     label = 91;
    } else {
     $$012$i = $2;$221 = $191;$228 = $218;
     while(1) {
      $220 = $221 & 15;
      $222 = (6456 + ($220)|0);
      $223 = HEAP8[$222>>0]|0;
      $224 = $223&255;
      $225 = $224 | $215;
      $226 = $225&255;
      $227 = (($$012$i) + -1|0);
      HEAP8[$227>>0] = $226;
      $229 = (_bitshift64Lshr(($221|0),($228|0),4)|0);
      $230 = tempRet0;
      $231 = ($229|0)==(0);
      $232 = ($230|0)==(0);
      $233 = $231 & $232;
      if ($233) {
       break;
      } else {
       $$012$i = $227;$221 = $229;$228 = $230;
      }
     }
     $234 = $fl$3 & 8;
     $235 = ($234|0)==(0);
     if ($235) {
      $293 = $191;$295 = $218;$a$0 = $227;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 6376;
      label = 91;
     } else {
      $236 = $t$1 >> 4;
      $237 = (6376 + ($236)|0);
      $293 = $191;$295 = $218;$a$0 = $227;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 2;$prefix$1 = $237;
      label = 91;
     }
    }
   }
   else if ((label|0) == 86) {
    label = 0;
    $262 = ($263>>>0)>(0);
    $264 = ($265>>>0)>(4294967295);
    $266 = ($263|0)==(0);
    $267 = $266 & $264;
    $268 = $262 | $267;
    if ($268) {
     $$05$i = $2;$269 = $265;$270 = $263;
     while(1) {
      $271 = (___uremdi3(($269|0),($270|0),10,0)|0);
      $272 = tempRet0;
      $273 = $271 | 48;
      $274 = $273&255;
      $275 = (($$05$i) + -1|0);
      HEAP8[$275>>0] = $274;
      $276 = (___udivdi3(($269|0),($270|0),10,0)|0);
      $277 = tempRet0;
      $278 = ($270>>>0)>(9);
      $279 = ($269>>>0)>(4294967295);
      $280 = ($270|0)==(9);
      $281 = $280 & $279;
      $282 = $278 | $281;
      if ($282) {
       $$05$i = $275;$269 = $276;$270 = $277;
      } else {
       break;
      }
     }
     $$0$lcssa$i47 = $275;$$01$lcssa$off0$i = $276;
    } else {
     $$0$lcssa$i47 = $2;$$01$lcssa$off0$i = $265;
    }
    $283 = ($$01$lcssa$off0$i|0)==(0);
    if ($283) {
     $293 = $265;$295 = $263;$a$0 = $$0$lcssa$i47;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $pl$0;$prefix$1 = $prefix$0;
     label = 91;
    } else {
     $$12$i = $$0$lcssa$i47;$y$03$i = $$01$lcssa$off0$i;
     while(1) {
      $284 = (($y$03$i>>>0) % 10)&-1;
      $285 = $284 | 48;
      $286 = $285&255;
      $287 = (($$12$i) + -1|0);
      HEAP8[$287>>0] = $286;
      $288 = (($y$03$i>>>0) / 10)&-1;
      $289 = ($y$03$i>>>0)<(10);
      if ($289) {
       $293 = $265;$295 = $263;$a$0 = $287;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $pl$0;$prefix$1 = $prefix$0;
       label = 91;
       break;
      } else {
       $$12$i = $287;$y$03$i = $288;
      }
     }
    }
   }
   else if ((label|0) == 96) {
    label = 0;
    $310 = (_memchr($a$1,0,$p$0)|0);
    $311 = ($310|0)==(0|0);
    if ($311) {
     $312 = (($a$1) + ($p$0)|0);
     $1036 = $191;$1037 = $218;$a$2 = $a$1;$fl$6 = $189;$p$5 = $p$0;$pl$2 = 0;$prefix$2 = 6376;$z$2 = $312;
     break;
    } else {
     $313 = $310;
     $314 = $a$1;
     $315 = (($313) - ($314))|0;
     $1036 = $191;$1037 = $218;$a$2 = $a$1;$fl$6 = $189;$p$5 = $315;$pl$2 = 0;$prefix$2 = 6376;$z$2 = $310;
     break;
    }
   }
   else if ((label|0) == 101) {
    label = 0;
    $i$0166 = 0;$l$1165 = 0;$ws$0167 = $1038;
    while(1) {
     $318 = HEAP32[$ws$0167>>2]|0;
     $319 = ($318|0)==(0);
     if ($319) {
      $i$0$lcssa = $i$0166;$l$2 = $l$1165;
      break;
     }
     $320 = (_wctomb($mb,$318)|0);
     $321 = ($320|0)<(0);
     $322 = (($p$4266) - ($i$0166))|0;
     $323 = ($320>>>0)>($322>>>0);
     $or$cond17 = $321 | $323;
     if ($or$cond17) {
      $i$0$lcssa = $i$0166;$l$2 = $320;
      break;
     }
     $324 = (($ws$0167) + 4|0);
     $325 = (($320) + ($i$0166))|0;
     $326 = ($p$4266>>>0)>($325>>>0);
     if ($326) {
      $i$0166 = $325;$l$1165 = $320;$ws$0167 = $324;
     } else {
      $i$0$lcssa = $325;$l$2 = $320;
      break;
     }
    }
    $327 = ($l$2|0)<(0);
    if ($327) {
     $$0 = -1;
     label = 370;
     break L1;
    } else {
     $1040 = $1039;$1041 = $1038;$i$0$lcssa267 = $i$0$lcssa;
     label = 106;
    }
   }
  } while(0);
  if ((label|0) == 91) {
   label = 0;
   $290 = ($p$2|0)>(-1);
   $291 = $fl$4 & -65537;
   $$fl$4 = $290 ? $291 : $fl$4;
   $292 = ($293|0)!=(0);
   $294 = ($295|0)!=(0);
   $296 = $292 | $294;
   $297 = ($p$2|0)!=(0);
   $or$cond = $296 | $297;
   if ($or$cond) {
    $298 = $a$0;
    $299 = (($3) - ($298))|0;
    $300 = $296&1;
    $301 = $300 ^ 1;
    $302 = (($301) + ($299))|0;
    $303 = ($p$2|0)>($302|0);
    $p$2$ = $303 ? $p$2 : $302;
    $1036 = $293;$1037 = $295;$a$2 = $a$0;$fl$6 = $$fl$4;$p$5 = $p$2$;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $2;
   } else {
    $1036 = $293;$1037 = $295;$a$2 = $2;$fl$6 = $$fl$4;$p$5 = 0;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $2;
   }
  }
  else if ((label|0) == 106) {
   label = 0;
   $328 = $fl$1$ & 73728;
   $329 = ($328|0)==(0);
   $330 = ($w$1|0)>($i$0$lcssa267|0);
   $or$cond$i58 = $329 & $330;
   if ($or$cond$i58) {
    $331 = (($w$1) - ($i$0$lcssa267))|0;
    $332 = ($331>>>0)>(256);
    $333 = $332 ? 256 : $331;
    _memset(($pad$i|0),32,($333|0))|0;
    $334 = ($331>>>0)>(255);
    if ($334) {
     $$01$i60 = $331;
     while(1) {
      (___fwritex($pad$i,256,$f)|0);
      $335 = (($$01$i60) + -256)|0;
      $336 = ($335>>>0)>(255);
      if ($336) {
       $$01$i60 = $335;
      } else {
       break;
      }
     }
     $337 = $331 & 255;
     $$0$lcssa$i62 = $337;
    } else {
     $$0$lcssa$i62 = $331;
    }
    (___fwritex($pad$i,$$0$lcssa$i62,$f)|0);
   }
   $338 = ($i$0$lcssa267|0)==(0);
   L477: do {
    if (!($338)) {
     $i$1174 = 0;$ws$1175 = $1041;
     while(1) {
      $339 = HEAP32[$ws$1175>>2]|0;
      $340 = ($339|0)==(0);
      if ($340) {
       break L477;
      }
      $341 = (_wctomb($mb,$339)|0);
      $342 = (($341) + ($i$1174))|0;
      $343 = ($342|0)>($i$0$lcssa267|0);
      if ($343) {
       break L477;
      }
      $344 = (($ws$1175) + 4|0);
      (___fwritex($mb,$341,$f)|0);
      $345 = ($342>>>0)<($i$0$lcssa267>>>0);
      if ($345) {
       $i$1174 = $342;$ws$1175 = $344;
      } else {
       break;
      }
     }
    }
   } while(0);
   $346 = ($328|0)==(8192);
   $or$cond$i65 = $346 & $330;
   if ($or$cond$i65) {
    $347 = (($w$1) - ($i$0$lcssa267))|0;
    $348 = ($347>>>0)>(256);
    $349 = $348 ? 256 : $347;
    _memset(($pad$i|0),32,($349|0))|0;
    $350 = ($347>>>0)>(255);
    if ($350) {
     $$01$i67 = $347;
     while(1) {
      (___fwritex($pad$i,256,$f)|0);
      $351 = (($$01$i67) + -256)|0;
      $352 = ($351>>>0)>(255);
      if ($352) {
       $$01$i67 = $351;
      } else {
       break;
      }
     }
     $353 = $347 & 255;
     $$0$lcssa$i69 = $353;
    } else {
     $$0$lcssa$i69 = $347;
    }
    (___fwritex($pad$i,$$0$lcssa$i69,$f)|0);
   }
   $354 = $330 ? $w$1 : $i$0$lcssa267;
   $1029 = $1040;$1030 = $218;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $354;$l10n$0 = $l10n$3;
   continue;
  }
  $922 = $z$2;
  $923 = $a$2;
  $924 = (($922) - ($923))|0;
  $925 = ($p$5|0)<($924|0);
  $$p$5 = $925 ? $924 : $p$5;
  $926 = (($pl$2) + ($$p$5))|0;
  $927 = ($w$1|0)<($926|0);
  $w$2 = $927 ? $926 : $w$1;
  $928 = $fl$6 & 73728;
  $929 = ($928|0)==(0);
  $930 = ($w$2|0)>($926|0);
  $or$cond$i75 = $929 & $930;
  if ($or$cond$i75) {
   $931 = (($w$2) - ($926))|0;
   $932 = ($931>>>0)>(256);
   $933 = $932 ? 256 : $931;
   _memset(($pad$i|0),32,($933|0))|0;
   $934 = ($931>>>0)>(255);
   if ($934) {
    $$01$i77 = $931;
    while(1) {
     (___fwritex($pad$i,256,$f)|0);
     $935 = (($$01$i77) + -256)|0;
     $936 = ($935>>>0)>(255);
     if ($936) {
      $$01$i77 = $935;
     } else {
      break;
     }
    }
    $937 = $931 & 255;
    $$0$lcssa$i79 = $937;
   } else {
    $$0$lcssa$i79 = $931;
   }
   (___fwritex($pad$i,$$0$lcssa$i79,$f)|0);
  }
  (___fwritex($prefix$2,$pl$2,$f)|0);
  $938 = ($928|0)==(65536);
  $or$cond$i51 = $938 & $930;
  if ($or$cond$i51) {
   $939 = (($w$2) - ($926))|0;
   $940 = ($939>>>0)>(256);
   $941 = $940 ? 256 : $939;
   _memset(($pad$i|0),48,($941|0))|0;
   $942 = ($939>>>0)>(255);
   if ($942) {
    $$01$i53 = $939;
    while(1) {
     (___fwritex($pad$i,256,$f)|0);
     $943 = (($$01$i53) + -256)|0;
     $944 = ($943>>>0)>(255);
     if ($944) {
      $$01$i53 = $943;
     } else {
      break;
     }
    }
    $945 = $939 & 255;
    $$0$lcssa$i55 = $945;
   } else {
    $$0$lcssa$i55 = $939;
   }
   (___fwritex($pad$i,$$0$lcssa$i55,$f)|0);
  }
  $946 = ($$p$5|0)>($924|0);
  if ($946) {
   $947 = (($$p$5) - ($924))|0;
   $948 = ($947>>>0)>(256);
   $949 = $948 ? 256 : $947;
   _memset(($pad$i|0),48,($949|0))|0;
   $950 = ($947>>>0)>(255);
   if ($950) {
    $$01$i38 = $947;
    while(1) {
     (___fwritex($pad$i,256,$f)|0);
     $951 = (($$01$i38) + -256)|0;
     $952 = ($951>>>0)>(255);
     if ($952) {
      $$01$i38 = $951;
     } else {
      break;
     }
    }
    $953 = $947 & 255;
    $$0$lcssa$i40 = $953;
   } else {
    $$0$lcssa$i40 = $947;
   }
   (___fwritex($pad$i,$$0$lcssa$i40,$f)|0);
  }
  (___fwritex($a$2,$924,$f)|0);
  $954 = ($928|0)==(8192);
  $or$cond$i = $954 & $930;
  if (!($or$cond$i)) {
   $1029 = $1036;$1030 = $1037;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $w$2;$l10n$0 = $l10n$3;
   continue;
  }
  $955 = (($w$2) - ($926))|0;
  $956 = ($955>>>0)>(256);
  $957 = $956 ? 256 : $955;
  _memset(($pad$i|0),32,($957|0))|0;
  $958 = ($955>>>0)>(255);
  if ($958) {
   $$01$i = $955;
   while(1) {
    (___fwritex($pad$i,256,$f)|0);
    $959 = (($$01$i) + -256)|0;
    $960 = ($959>>>0)>(255);
    if ($960) {
     $$01$i = $959;
    } else {
     break;
    }
   }
   $961 = $955 & 255;
   $$0$lcssa$i = $961;
  } else {
   $$0$lcssa$i = $955;
  }
  (___fwritex($pad$i,$$0$lcssa$i,$f)|0);
  $1029 = $1036;$1030 = $1037;$cnt$0 = $cnt$1;$fmt83 = $131;$l$0 = $w$2;$l10n$0 = $l10n$3;
 }
 if ((label|0) == 352) {
  $962 = ($f|0)==(0|0);
  if (!($962)) {
   $$0 = $cnt$1;
   STACKTOP = sp;return ($$0|0);
  }
  $963 = ($l10n$0|0)==(0);
  if ($963) {
   $$0 = 0;
   STACKTOP = sp;return ($$0|0);
  } else {
   $i$2100 = 1;
  }
  while(1) {
   $964 = (($nl_type) + ($i$2100<<2)|0);
   $965 = HEAP32[$964>>2]|0;
   $966 = ($965|0)==(0);
   if ($966) {
    $i$397 = $i$2100;
    break;
   }
   $967 = (($nl_arg) + ($i$2100<<3)|0);
   $968 = ($965>>>0)>(20);
   L534: do {
    if (!($968)) {
     do {
      switch ($965|0) {
      case 9:  {
       $arglist_current35 = HEAP32[$ap>>2]|0;
       $969 = HEAP32[$arglist_current35>>2]|0;
       $arglist_next36 = (($arglist_current35) + 4|0);
       HEAP32[$ap>>2] = $arglist_next36;
       HEAP32[$967>>2] = $969;
       break L534;
       break;
      }
      case 10:  {
       $arglist_current38 = HEAP32[$ap>>2]|0;
       $970 = HEAP32[$arglist_current38>>2]|0;
       $arglist_next39 = (($arglist_current38) + 4|0);
       HEAP32[$ap>>2] = $arglist_next39;
       $971 = ($970|0)<(0);
       $972 = $971 << 31 >> 31;
       $973 = $967;
       $974 = $973;
       HEAP32[$974>>2] = $970;
       $975 = (($973) + 4)|0;
       $976 = $975;
       HEAP32[$976>>2] = $972;
       break L534;
       break;
      }
      case 11:  {
       $arglist_current41 = HEAP32[$ap>>2]|0;
       $977 = HEAP32[$arglist_current41>>2]|0;
       $arglist_next42 = (($arglist_current41) + 4|0);
       HEAP32[$ap>>2] = $arglist_next42;
       $978 = $967;
       $979 = $978;
       HEAP32[$979>>2] = $977;
       $980 = (($978) + 4)|0;
       $981 = $980;
       HEAP32[$981>>2] = 0;
       break L534;
       break;
      }
      case 12:  {
       $arglist_current44 = HEAP32[$ap>>2]|0;
       $982 = $arglist_current44;
       $983 = $982;
       $984 = HEAP32[$983>>2]|0;
       $985 = (($982) + 4)|0;
       $986 = $985;
       $987 = HEAP32[$986>>2]|0;
       $arglist_next45 = (($arglist_current44) + 8|0);
       HEAP32[$ap>>2] = $arglist_next45;
       $988 = $967;
       $989 = $988;
       HEAP32[$989>>2] = $984;
       $990 = (($988) + 4)|0;
       $991 = $990;
       HEAP32[$991>>2] = $987;
       break L534;
       break;
      }
      case 13:  {
       $arglist_current47 = HEAP32[$ap>>2]|0;
       $992 = HEAP32[$arglist_current47>>2]|0;
       $arglist_next48 = (($arglist_current47) + 4|0);
       HEAP32[$ap>>2] = $arglist_next48;
       $993 = $992&65535;
       $994 = $993 << 16 >> 16;
       $995 = ($994|0)<(0);
       $996 = $995 << 31 >> 31;
       $997 = $967;
       $998 = $997;
       HEAP32[$998>>2] = $994;
       $999 = (($997) + 4)|0;
       $1000 = $999;
       HEAP32[$1000>>2] = $996;
       break L534;
       break;
      }
      case 14:  {
       $arglist_current50 = HEAP32[$ap>>2]|0;
       $1001 = HEAP32[$arglist_current50>>2]|0;
       $arglist_next51 = (($arglist_current50) + 4|0);
       HEAP32[$ap>>2] = $arglist_next51;
       $$mask1$i = $1001 & 65535;
       $1002 = $967;
       $1003 = $1002;
       HEAP32[$1003>>2] = $$mask1$i;
       $1004 = (($1002) + 4)|0;
       $1005 = $1004;
       HEAP32[$1005>>2] = 0;
       break L534;
       break;
      }
      case 15:  {
       $arglist_current53 = HEAP32[$ap>>2]|0;
       $1006 = HEAP32[$arglist_current53>>2]|0;
       $arglist_next54 = (($arglist_current53) + 4|0);
       HEAP32[$ap>>2] = $arglist_next54;
       $1007 = $1006&255;
       $1008 = $1007 << 24 >> 24;
       $1009 = ($1008|0)<(0);
       $1010 = $1009 << 31 >> 31;
       $1011 = $967;
       $1012 = $1011;
       HEAP32[$1012>>2] = $1008;
       $1013 = (($1011) + 4)|0;
       $1014 = $1013;
       HEAP32[$1014>>2] = $1010;
       break L534;
       break;
      }
      case 16:  {
       $arglist_current56 = HEAP32[$ap>>2]|0;
       $1015 = HEAP32[$arglist_current56>>2]|0;
       $arglist_next57 = (($arglist_current56) + 4|0);
       HEAP32[$ap>>2] = $arglist_next57;
       $$mask$i = $1015 & 255;
       $1016 = $967;
       $1017 = $1016;
       HEAP32[$1017>>2] = $$mask$i;
       $1018 = (($1016) + 4)|0;
       $1019 = $1018;
       HEAP32[$1019>>2] = 0;
       break L534;
       break;
      }
      case 17:  {
       $arglist_current59 = HEAP32[$ap>>2]|0;
       HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current59>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current59+4>>2];$1020 = +HEAPF64[tempDoublePtr>>3];
       $arglist_next60 = (($arglist_current59) + 8|0);
       HEAP32[$ap>>2] = $arglist_next60;
       HEAPF64[$967>>3] = $1020;
       break L534;
       break;
      }
      case 18:  {
       $arglist_current62 = HEAP32[$ap>>2]|0;
       HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current62>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current62+4>>2];$1021 = +HEAPF64[tempDoublePtr>>3];
       $arglist_next63 = (($arglist_current62) + 8|0);
       HEAP32[$ap>>2] = $arglist_next63;
       HEAPF64[$967>>3] = $1021;
       break L534;
       break;
      }
      default: {
       break L534;
      }
      }
     } while(0);
    }
   } while(0);
   $1022 = (($i$2100) + 1)|0;
   $1023 = ($1022|0)<(10);
   if ($1023) {
    $i$2100 = $1022;
   } else {
    $$0 = 1;
    label = 370;
    break;
   }
  }
  if ((label|0) == 370) {
   STACKTOP = sp;return ($$0|0);
  }
  while(1) {
   $1026 = (($nl_type) + ($i$397<<2)|0);
   $1027 = HEAP32[$1026>>2]|0;
   $1028 = ($1027|0)==(0);
   $1025 = (($i$397) + 1)|0;
   if (!($1028)) {
    $$0 = -1;
    label = 370;
    break;
   }
   $1024 = ($1025|0)<(10);
   if ($1024) {
    $i$397 = $1025;
   } else {
    $$0 = 1;
    label = 370;
    break;
   }
  }
  if ((label|0) == 370) {
   STACKTOP = sp;return ($$0|0);
  }
 }
 else if ((label|0) == 370) {
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function runPostSets() {
 
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
}
function _strlen(ptr) {
    ptr = ptr|0;
    var curr = 0;
    curr = ptr;
    while (((HEAP8[((curr)>>0)])|0)) {
      curr = (curr + 1)|0;
    }
    return (curr - ptr)|0;
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _memcpy(dest, src, num) {

    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}
function _bitshift64Ashr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = (high|0) < 0 ? -1 : 0;
    return (high >> (bits - 32))|0;
  }
function _llvm_ctlz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((ctlz_i8)+(x >>> 24))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((ctlz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((ctlz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((ctlz_i8)+(x&0xff))>>0)])|0) + 24)|0;
  }

function _llvm_cttz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((cttz_i8)+(x & 0xff))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((cttz_i8)+(x >>> 24))>>0)])|0) + 24)|0;
  }

// ======== compiled code from system/lib/compiler-rt , see readme therein
function ___muldsi3($a, $b) {
  $a = $a | 0;
  $b = $b | 0;
  var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
  $1 = $a & 65535;
  $2 = $b & 65535;
  $3 = Math_imul($2, $1) | 0;
  $6 = $a >>> 16;
  $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
  $11 = $b >>> 16;
  $12 = Math_imul($11, $1) | 0;
  return (tempRet0 = (($8 >>> 16) + (Math_imul($11, $6) | 0) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, 0 | ($8 + $12 << 16 | $3 & 65535)) | 0;
}
function ___divdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $7$0 = 0, $7$1 = 0, $8$0 = 0, $10$0 = 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  $7$0 = $2$0 ^ $1$0;
  $7$1 = $2$1 ^ $1$1;
  $8$0 = ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, 0) | 0;
  $10$0 = _i64Subtract($8$0 ^ $7$0, tempRet0 ^ $7$1, $7$0, $7$1) | 0;
  return (tempRet0 = tempRet0, $10$0) | 0;
}
function ___remdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $10$0 = 0, $10$1 = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  $rem = __stackBase__ | 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, $rem) | 0;
  $10$0 = _i64Subtract(HEAP32[$rem >> 2] ^ $1$0, HEAP32[$rem + 4 >> 2] ^ $1$1, $1$0, $1$1) | 0;
  $10$1 = tempRet0;
  STACKTOP = __stackBase__;
  return (tempRet0 = $10$1, $10$0) | 0;
}
function ___muldi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0, $2 = 0;
  $x_sroa_0_0_extract_trunc = $a$0;
  $y_sroa_0_0_extract_trunc = $b$0;
  $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
  $1$1 = tempRet0;
  $2 = Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0;
  return (tempRet0 = ((Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $2 | 0) + $1$1 | $1$1 & 0, 0 | $1$0 & -1) | 0;
}
function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0;
  $1$0 = ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
  return (tempRet0 = tempRet0, $1$0) | 0;
}
function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  $rem = __stackBase__ | 0;
  ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
  STACKTOP = __stackBase__;
  return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}
function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  $rem = $rem | 0;
  var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $49 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $86 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $117 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $147 = 0, $149 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $152 = 0, $154$0 = 0, $r_sroa_0_0_extract_trunc = 0, $r_sroa_1_4_extract_trunc = 0, $155 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $q_sroa_0_0_insert_insert77$1 = 0, $_0$0 = 0, $_0$1 = 0;
  $n_sroa_0_0_extract_trunc = $a$0;
  $n_sroa_1_4_extract_shift$0 = $a$1;
  $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
  $d_sroa_0_0_extract_trunc = $b$0;
  $d_sroa_1_4_extract_shift$0 = $b$1;
  $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
  if (($n_sroa_1_4_extract_trunc | 0) == 0) {
    $4 = ($rem | 0) != 0;
    if (($d_sroa_1_4_extract_trunc | 0) == 0) {
      if ($4) {
        HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
        HEAP32[$rem + 4 >> 2] = 0;
      }
      $_0$1 = 0;
      $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$4) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    }
  }
  $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
  do {
    if (($d_sroa_0_0_extract_trunc | 0) == 0) {
      if ($17) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
          HEAP32[$rem + 4 >> 2] = 0;
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      if (($n_sroa_0_0_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0;
          HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
      if (($37 & $d_sroa_1_4_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0 | $a$0 & -1;
          HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
        }
        $_0$1 = 0;
        $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $49 = _llvm_ctlz_i32($d_sroa_1_4_extract_trunc | 0) | 0;
      $51 = $49 - (_llvm_ctlz_i32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
      if ($51 >>> 0 <= 30) {
        $57 = $51 + 1 | 0;
        $58 = 31 - $51 | 0;
        $sr_1_ph = $57;
        $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
        $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
        $q_sroa_0_1_ph = 0;
        $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
        break;
      }
      if (($rem | 0) == 0) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = 0 | $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$17) {
        $117 = _llvm_ctlz_i32($d_sroa_1_4_extract_trunc | 0) | 0;
        $119 = $117 - (_llvm_ctlz_i32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        if ($119 >>> 0 <= 31) {
          $125 = $119 + 1 | 0;
          $126 = 31 - $119 | 0;
          $130 = $119 - 31 >> 31;
          $sr_1_ph = $125;
          $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
          $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
          $q_sroa_0_1_ph = 0;
          $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
          break;
        }
        if (($rem | 0) == 0) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = 0 | $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
      if (($66 & $d_sroa_0_0_extract_trunc | 0) != 0) {
        $86 = (_llvm_ctlz_i32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
        $88 = $86 - (_llvm_ctlz_i32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        $89 = 64 - $88 | 0;
        $91 = 32 - $88 | 0;
        $92 = $91 >> 31;
        $95 = $88 - 32 | 0;
        $105 = $95 >> 31;
        $sr_1_ph = $88;
        $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
        $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
        $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
        $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
        break;
      }
      if (($rem | 0) != 0) {
        HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
        HEAP32[$rem + 4 >> 2] = 0;
      }
      if (($d_sroa_0_0_extract_trunc | 0) == 1) {
        $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$0 = 0 | $a$0 & -1;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
        $_0$1 = 0 | $n_sroa_1_4_extract_trunc >>> ($78 >>> 0);
        $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
    }
  } while (0);
  if (($sr_1_ph | 0) == 0) {
    $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
    $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
    $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
    $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = 0;
  } else {
    $d_sroa_0_0_insert_insert99$0 = 0 | $b$0 & -1;
    $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
    $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0, $d_sroa_0_0_insert_insert99$1, -1, -1) | 0;
    $137$1 = tempRet0;
    $q_sroa_1_1198 = $q_sroa_1_1_ph;
    $q_sroa_0_1199 = $q_sroa_0_1_ph;
    $r_sroa_1_1200 = $r_sroa_1_1_ph;
    $r_sroa_0_1201 = $r_sroa_0_1_ph;
    $sr_1202 = $sr_1_ph;
    $carry_0203 = 0;
    while (1) {
      $147 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
      $149 = $carry_0203 | $q_sroa_0_1199 << 1;
      $r_sroa_0_0_insert_insert42$0 = 0 | ($r_sroa_0_1201 << 1 | $q_sroa_1_1198 >>> 31);
      $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
      _i64Subtract($137$0, $137$1, $r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1) | 0;
      $150$1 = tempRet0;
      $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
      $152 = $151$0 & 1;
      $154$0 = _i64Subtract($r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1, $151$0 & $d_sroa_0_0_insert_insert99$0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1) | 0;
      $r_sroa_0_0_extract_trunc = $154$0;
      $r_sroa_1_4_extract_trunc = tempRet0;
      $155 = $sr_1202 - 1 | 0;
      if (($155 | 0) == 0) {
        break;
      } else {
        $q_sroa_1_1198 = $147;
        $q_sroa_0_1199 = $149;
        $r_sroa_1_1200 = $r_sroa_1_4_extract_trunc;
        $r_sroa_0_1201 = $r_sroa_0_0_extract_trunc;
        $sr_1202 = $155;
        $carry_0203 = $152;
      }
    }
    $q_sroa_1_1_lcssa = $147;
    $q_sroa_0_1_lcssa = $149;
    $r_sroa_1_1_lcssa = $r_sroa_1_4_extract_trunc;
    $r_sroa_0_1_lcssa = $r_sroa_0_0_extract_trunc;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = $152;
  }
  $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
  $q_sroa_0_0_insert_ext75$1 = 0;
  $q_sroa_0_0_insert_insert77$1 = $q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1;
  if (($rem | 0) != 0) {
    HEAP32[$rem >> 2] = 0 | $r_sroa_0_1_lcssa;
    HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa | 0;
  }
  $_0$1 = (0 | $q_sroa_0_0_insert_ext75$0) >>> 31 | $q_sroa_0_0_insert_insert77$1 << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
  $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
  return (tempRet0 = $_0$1, $_0$0) | 0;
}
// =======================================================================



// EMSCRIPTEN_END_FUNCS

  
  function dynCall_iiii(index,a1,a2,a3) {
    index = index|0;
    a1=a1|0; a2=a2|0; a3=a3|0;
    return FUNCTION_TABLE_iiii[index&1](a1|0,a2|0,a3|0)|0;
  }

function b0(p0,p1,p2) { p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(0);return 0; }
  // EMSCRIPTEN_END_FUNCS
  var FUNCTION_TABLE_iiii = [b0,_sn_write];

  return { _i64Subtract: _i64Subtract, _free: _free, _controller_handle: _controller_handle, _realloc: _realloc, _controller_init: _controller_init, _strlen: _strlen, _memset: _memset, _malloc: _malloc, _i64Add: _i64Add, _memcpy: _memcpy, _bitshift64Lshr: _bitshift64Lshr, _bitshift64Shl: _bitshift64Shl, _calloc: _calloc, _controller_10msec_timer: _controller_10msec_timer, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_iiii: dynCall_iiii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var real__i64Subtract = asm["_i64Subtract"]; asm["_i64Subtract"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Subtract.apply(null, arguments);
};

var real__controller_handle = asm["_controller_handle"]; asm["_controller_handle"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__controller_handle.apply(null, arguments);
};

var real__realloc = asm["_realloc"]; asm["_realloc"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__realloc.apply(null, arguments);
};

var real__controller_init = asm["_controller_init"]; asm["_controller_init"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__controller_init.apply(null, arguments);
};

var real__strlen = asm["_strlen"]; asm["_strlen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__strlen.apply(null, arguments);
};

var real__i64Add = asm["_i64Add"]; asm["_i64Add"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Add.apply(null, arguments);
};

var real__bitshift64Lshr = asm["_bitshift64Lshr"]; asm["_bitshift64Lshr"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Lshr.apply(null, arguments);
};

var real__bitshift64Shl = asm["_bitshift64Shl"]; asm["_bitshift64Shl"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Shl.apply(null, arguments);
};

var real__calloc = asm["_calloc"]; asm["_calloc"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__calloc.apply(null, arguments);
};

var real__controller_10msec_timer = asm["_controller_10msec_timer"]; asm["_controller_10msec_timer"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__controller_10msec_timer.apply(null, arguments);
};

var real_runPostSets = asm["runPostSets"]; asm["runPostSets"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real_runPostSets.apply(null, arguments);
};
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _free = Module["_free"] = asm["_free"];
var _controller_handle = Module["_controller_handle"] = asm["_controller_handle"];
var _realloc = Module["_realloc"] = asm["_realloc"];
var _controller_init = Module["_controller_init"] = asm["_controller_init"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var _calloc = Module["_calloc"] = asm["_calloc"];
var _controller_10msec_timer = Module["_controller_10msec_timer"] = asm["_controller_10msec_timer"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];


// TODO: strip out parts of this we do not need

//======= begin closure i64 code =======

// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "long". This
 * implementation is derived from LongLib in GWT.
 *
 */

var i64Math = (function() { // Emscripten wrapper
  var goog = { math: {} };


  /**
   * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
   * values as *signed* integers.  See the from* functions below for more
   * convenient ways of constructing Longs.
   *
   * The internal representation of a long is the two given signed, 32-bit values.
   * We use 32-bit pieces because these are the size of integers on which
   * Javascript performs bit-operations.  For operations like addition and
   * multiplication, we split each number into 16-bit pieces, which can easily be
   * multiplied within Javascript's floating-point representation without overflow
   * or change in sign.
   *
   * In the algorithms below, we frequently reduce the negative case to the
   * positive case by negating the input(s) and then post-processing the result.
   * Note that we must ALWAYS check specially whether those values are MIN_VALUE
   * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
   * a positive number, it overflows back into a negative).  Not handling this
   * case would often result in infinite recursion.
   *
   * @param {number} low  The low (signed) 32 bits of the long.
   * @param {number} high  The high (signed) 32 bits of the long.
   * @constructor
   */
  goog.math.Long = function(low, high) {
    /**
     * @type {number}
     * @private
     */
    this.low_ = low | 0;  // force into 32 signed bits.

    /**
     * @type {number}
     * @private
     */
    this.high_ = high | 0;  // force into 32 signed bits.
  };


  // NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
  // from* methods on which they depend.


  /**
   * A cache of the Long representations of small integer values.
   * @type {!Object}
   * @private
   */
  goog.math.Long.IntCache_ = {};


  /**
   * Returns a Long representing the given (32-bit) integer value.
   * @param {number} value The 32-bit integer in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromInt = function(value) {
    if (-128 <= value && value < 128) {
      var cachedObj = goog.math.Long.IntCache_[value];
      if (cachedObj) {
        return cachedObj;
      }
    }

    var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
    if (-128 <= value && value < 128) {
      goog.math.Long.IntCache_[value] = obj;
    }
    return obj;
  };


  /**
   * Returns a Long representing the given value, provided that it is a finite
   * number.  Otherwise, zero is returned.
   * @param {number} value The number in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromNumber = function(value) {
    if (isNaN(value) || !isFinite(value)) {
      return goog.math.Long.ZERO;
    } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MIN_VALUE;
    } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MAX_VALUE;
    } else if (value < 0) {
      return goog.math.Long.fromNumber(-value).negate();
    } else {
      return new goog.math.Long(
          (value % goog.math.Long.TWO_PWR_32_DBL_) | 0,
          (value / goog.math.Long.TWO_PWR_32_DBL_) | 0);
    }
  };


  /**
   * Returns a Long representing the 64-bit integer that comes by concatenating
   * the given high and low bits.  Each is assumed to use 32 bits.
   * @param {number} lowBits The low 32-bits.
   * @param {number} highBits The high 32-bits.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
  };


  /**
   * Returns a Long representation of the given string, written using the given
   * radix.
   * @param {string} str The textual representation of the Long.
   * @param {number=} opt_radix The radix in which the text is written.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromString = function(str, opt_radix) {
    if (str.length == 0) {
      throw Error('number format error: empty string');
    }

    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (str.charAt(0) == '-') {
      return goog.math.Long.fromString(str.substring(1), radix).negate();
    } else if (str.indexOf('-') >= 0) {
      throw Error('number format error: interior "-" character: ' + str);
    }

    // Do several (8) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));

    var result = goog.math.Long.ZERO;
    for (var i = 0; i < str.length; i += 8) {
      var size = Math.min(8, str.length - i);
      var value = parseInt(str.substring(i, i + size), radix);
      if (size < 8) {
        var power = goog.math.Long.fromNumber(Math.pow(radix, size));
        result = result.multiply(power).add(goog.math.Long.fromNumber(value));
      } else {
        result = result.multiply(radixToPower);
        result = result.add(goog.math.Long.fromNumber(value));
      }
    }
    return result;
  };


  // NOTE: the compiler should inline these constant values below and then remove
  // these variables, so there should be no runtime penalty for these.


  /**
   * Number used repeated below in calculations.  This must appear before the
   * first call to any from* function below.
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_32_DBL_ =
      goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_31_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ / 2;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_48_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_64_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_63_DBL_ =
      goog.math.Long.TWO_PWR_64_DBL_ / 2;


  /** @type {!goog.math.Long} */
  goog.math.Long.ZERO = goog.math.Long.fromInt(0);


  /** @type {!goog.math.Long} */
  goog.math.Long.ONE = goog.math.Long.fromInt(1);


  /** @type {!goog.math.Long} */
  goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);


  /** @type {!goog.math.Long} */
  goog.math.Long.MAX_VALUE =
      goog.math.Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);


  /** @type {!goog.math.Long} */
  goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 0x80000000 | 0);


  /**
   * @type {!goog.math.Long}
   * @private
   */
  goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);


  /** @return {number} The value, assuming it is a 32-bit integer. */
  goog.math.Long.prototype.toInt = function() {
    return this.low_;
  };


  /** @return {number} The closest floating-point representation to this value. */
  goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ +
           this.getLowBitsUnsigned();
  };


  /**
   * @param {number=} opt_radix The radix in which the text should be written.
   * @return {string} The textual representation of this value.
   */
  goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (this.isZero()) {
      return '0';
    }

    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        // We need to change the Long value before it can be negated, so we remove
        // the bottom-most digit in this base and then recurse to do the rest.
        var radixLong = goog.math.Long.fromNumber(radix);
        var div = this.div(radixLong);
        var rem = div.multiply(radixLong).subtract(this);
        return div.toString(radix) + rem.toInt().toString(radix);
      } else {
        return '-' + this.negate().toString(radix);
      }
    }

    // Do several (6) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));

    var rem = this;
    var result = '';
    while (true) {
      var remDiv = rem.div(radixToPower);
      var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
      var digits = intval.toString(radix);

      rem = remDiv;
      if (rem.isZero()) {
        return digits + result;
      } else {
        while (digits.length < 6) {
          digits = '0' + digits;
        }
        result = '' + digits + result;
      }
    }
  };


  /** @return {number} The high 32-bits as a signed value. */
  goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
  };


  /** @return {number} The low 32-bits as a signed value. */
  goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
  };


  /** @return {number} The low 32-bits as an unsigned value. */
  goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return (this.low_ >= 0) ?
        this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
  };


  /**
   * @return {number} Returns the number of bits needed to represent the absolute
   *     value of this Long.
   */
  goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        return 64;
      } else {
        return this.negate().getNumBitsAbs();
      }
    } else {
      var val = this.high_ != 0 ? this.high_ : this.low_;
      for (var bit = 31; bit > 0; bit--) {
        if ((val & (1 << bit)) != 0) {
          break;
        }
      }
      return this.high_ != 0 ? bit + 33 : bit + 1;
    }
  };


  /** @return {boolean} Whether this value is zero. */
  goog.math.Long.prototype.isZero = function() {
    return this.high_ == 0 && this.low_ == 0;
  };


  /** @return {boolean} Whether this value is negative. */
  goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
  };


  /** @return {boolean} Whether this value is odd. */
  goog.math.Long.prototype.isOdd = function() {
    return (this.low_ & 1) == 1;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long equals the other.
   */
  goog.math.Long.prototype.equals = function(other) {
    return (this.high_ == other.high_) && (this.low_ == other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long does not equal the other.
   */
  goog.math.Long.prototype.notEquals = function(other) {
    return (this.high_ != other.high_) || (this.low_ != other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than the other.
   */
  goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than or equal to the other.
   */
  goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than the other.
   */
  goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than or equal to the other.
   */
  goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
  };


  /**
   * Compares this Long with the given one.
   * @param {goog.math.Long} other Long to compare against.
   * @return {number} 0 if they are the same, 1 if the this is greater, and -1
   *     if the given one is greater.
   */
  goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) {
      return 0;
    }

    var thisNeg = this.isNegative();
    var otherNeg = other.isNegative();
    if (thisNeg && !otherNeg) {
      return -1;
    }
    if (!thisNeg && otherNeg) {
      return 1;
    }

    // at this point, the signs are the same, so subtraction will not overflow
    if (this.subtract(other).isNegative()) {
      return -1;
    } else {
      return 1;
    }
  };


  /** @return {!goog.math.Long} The negation of this value. */
  goog.math.Long.prototype.negate = function() {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.MIN_VALUE;
    } else {
      return this.not().add(goog.math.Long.ONE);
    }
  };


  /**
   * Returns the sum of this and the given Long.
   * @param {goog.math.Long} other Long to add to this one.
   * @return {!goog.math.Long} The sum of this and the given Long.
   */
  goog.math.Long.prototype.add = function(other) {
    // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 + b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns the difference of this and the given Long.
   * @param {goog.math.Long} other Long to subtract from this.
   * @return {!goog.math.Long} The difference of this and the given Long.
   */
  goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
  };


  /**
   * Returns the product of this and the given long.
   * @param {goog.math.Long} other Long to multiply with this.
   * @return {!goog.math.Long} The product of this and the other.
   */
  goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) {
      return goog.math.Long.ZERO;
    } else if (other.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().multiply(other.negate());
      } else {
        return this.negate().multiply(other).negate();
      }
    } else if (other.isNegative()) {
      return this.multiply(other.negate()).negate();
    }

    // If both longs are small, use float multiplication
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) &&
        other.lessThan(goog.math.Long.TWO_PWR_24_)) {
      return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    }

    // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
    // We can skip products that would overflow.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns this Long divided by the given one.
   * @param {goog.math.Long} other Long by which to divide.
   * @return {!goog.math.Long} This Long divided by the given one.
   */
  goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) {
      throw Error('division by zero');
    } else if (this.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      if (other.equals(goog.math.Long.ONE) ||
          other.equals(goog.math.Long.NEG_ONE)) {
        return goog.math.Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
      } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.ONE;
      } else {
        // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
        var halfThis = this.shiftRight(1);
        var approx = halfThis.div(other).shiftLeft(1);
        if (approx.equals(goog.math.Long.ZERO)) {
          return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
        } else {
          var rem = this.subtract(other.multiply(approx));
          var result = approx.add(rem.div(other));
          return result;
        }
      }
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().div(other.negate());
      } else {
        return this.negate().div(other).negate();
      }
    } else if (other.isNegative()) {
      return this.div(other.negate()).negate();
    }

    // Repeat the following until the remainder is less than other:  find a
    // floating-point that approximates remainder / other *from below*, add this
    // into the result, and subtract it from the remainder.  It is critical that
    // the approximate value is less than or equal to the real value so that the
    // remainder never becomes negative.
    var res = goog.math.Long.ZERO;
    var rem = this;
    while (rem.greaterThanOrEqual(other)) {
      // Approximate the result of division. This may be a little greater or
      // smaller than the actual value.
      var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

      // We will tweak the approximate result by changing it in the 48-th digit or
      // the smallest non-fractional digit, whichever is larger.
      var log2 = Math.ceil(Math.log(approx) / Math.LN2);
      var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

      // Decrease the approximation until it is smaller than the remainder.  Note
      // that if it is too large, the product overflows and is negative.
      var approxRes = goog.math.Long.fromNumber(approx);
      var approxRem = approxRes.multiply(other);
      while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
        approx -= delta;
        approxRes = goog.math.Long.fromNumber(approx);
        approxRem = approxRes.multiply(other);
      }

      // We know the answer can't be zero... and actually, zero would cause
      // infinite recursion since we would make no progress.
      if (approxRes.isZero()) {
        approxRes = goog.math.Long.ONE;
      }

      res = res.add(approxRes);
      rem = rem.subtract(approxRem);
    }
    return res;
  };


  /**
   * Returns this Long modulo the given one.
   * @param {goog.math.Long} other Long by which to mod.
   * @return {!goog.math.Long} This Long modulo the given one.
   */
  goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
  };


  /** @return {!goog.math.Long} The bitwise-NOT of this value. */
  goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
  };


  /**
   * Returns the bitwise-AND of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to AND.
   * @return {!goog.math.Long} The bitwise-AND of this and the other.
   */
  goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_,
                                   this.high_ & other.high_);
  };


  /**
   * Returns the bitwise-OR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to OR.
   * @return {!goog.math.Long} The bitwise-OR of this and the other.
   */
  goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_,
                                   this.high_ | other.high_);
  };


  /**
   * Returns the bitwise-XOR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to XOR.
   * @return {!goog.math.Long} The bitwise-XOR of this and the other.
   */
  goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_,
                                   this.high_ ^ other.high_);
  };


  /**
   * Returns this Long with bits shifted to the left by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the left by the given amount.
   */
  goog.math.Long.prototype.shiftLeft = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var low = this.low_;
      if (numBits < 32) {
        var high = this.high_;
        return goog.math.Long.fromBits(
            low << numBits,
            (high << numBits) | (low >>> (32 - numBits)));
      } else {
        return goog.math.Long.fromBits(0, low << (numBits - 32));
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount.
   */
  goog.math.Long.prototype.shiftRight = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >> numBits);
      } else {
        return goog.math.Long.fromBits(
            high >> (numBits - 32),
            high >= 0 ? 0 : -1);
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount, with
   * the new top bits matching the current sign bit.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount, with
   *     zeros placed into the new leading bits.
   */
  goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >>> numBits);
      } else if (numBits == 32) {
        return goog.math.Long.fromBits(high, 0);
      } else {
        return goog.math.Long.fromBits(high >>> (numBits - 32), 0);
      }
    }
  };

  //======= begin jsbn =======

  var navigator = { appName: 'Modern Browser' }; // polyfill a little

  // Copyright (c) 2005  Tom Wu
  // All Rights Reserved.
  // http://www-cs-students.stanford.edu/~tjw/jsbn/

  /*
   * Copyright (c) 2003-2005  Tom Wu
   * All Rights Reserved.
   *
   * Permission is hereby granted, free of charge, to any person obtaining
   * a copy of this software and associated documentation files (the
   * "Software"), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish,
   * distribute, sublicense, and/or sell copies of the Software, and to
   * permit persons to whom the Software is furnished to do so, subject to
   * the following conditions:
   *
   * The above copyright notice and this permission notice shall be
   * included in all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
   * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
   * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
   *
   * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
   * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
   * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
   * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
   * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * In addition, the following condition applies:
   *
   * All redistributions must retain an intact copy of this copyright notice
   * and disclaimer.
   */

  // Basic JavaScript BN library - subset useful for RSA encryption.

  // Bits per digit
  var dbits;

  // JavaScript engine analysis
  var canary = 0xdeadbeefcafe;
  var j_lm = ((canary&0xffffff)==0xefcafe);

  // (public) Constructor
  function BigInteger(a,b,c) {
    if(a != null)
      if("number" == typeof a) this.fromNumber(a,b,c);
      else if(b == null && "string" != typeof a) this.fromString(a,256);
      else this.fromString(a,b);
  }

  // return new, unset BigInteger
  function nbi() { return new BigInteger(null); }

  // am: Compute w_j += (x*this_i), propagate carries,
  // c is initial carry, returns final carry.
  // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
  // We need to select the fastest one that works in this environment.

  // am1: use a single mult and divide to get the high bits,
  // max digit bits should be 26 because
  // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
  function am1(i,x,w,j,c,n) {
    while(--n >= 0) {
      var v = x*this[i++]+w[j]+c;
      c = Math.floor(v/0x4000000);
      w[j++] = v&0x3ffffff;
    }
    return c;
  }
  // am2 avoids a big mult-and-extract completely.
  // Max digit bits should be <= 30 because we do bitwise ops
  // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
  function am2(i,x,w,j,c,n) {
    var xl = x&0x7fff, xh = x>>15;
    while(--n >= 0) {
      var l = this[i]&0x7fff;
      var h = this[i++]>>15;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
      c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
      w[j++] = l&0x3fffffff;
    }
    return c;
  }
  // Alternately, set max digit bits to 28 since some
  // browsers slow down when dealing with 32-bit numbers.
  function am3(i,x,w,j,c,n) {
    var xl = x&0x3fff, xh = x>>14;
    while(--n >= 0) {
      var l = this[i]&0x3fff;
      var h = this[i++]>>14;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x3fff)<<14)+w[j]+c;
      c = (l>>28)+(m>>14)+xh*h;
      w[j++] = l&0xfffffff;
    }
    return c;
  }
  if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = am2;
    dbits = 30;
  }
  else if(j_lm && (navigator.appName != "Netscape")) {
    BigInteger.prototype.am = am1;
    dbits = 26;
  }
  else { // Mozilla/Netscape seems to prefer am3
    BigInteger.prototype.am = am3;
    dbits = 28;
  }

  BigInteger.prototype.DB = dbits;
  BigInteger.prototype.DM = ((1<<dbits)-1);
  BigInteger.prototype.DV = (1<<dbits);

  var BI_FP = 52;
  BigInteger.prototype.FV = Math.pow(2,BI_FP);
  BigInteger.prototype.F1 = BI_FP-dbits;
  BigInteger.prototype.F2 = 2*dbits-BI_FP;

  // Digit conversions
  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = new Array();
  var rr,vv;
  rr = "0".charCodeAt(0);
  for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
  rr = "a".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  rr = "A".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

  function int2char(n) { return BI_RM.charAt(n); }
  function intAt(s,i) {
    var c = BI_RC[s.charCodeAt(i)];
    return (c==null)?-1:c;
  }

  // (protected) copy this to r
  function bnpCopyTo(r) {
    for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
    r.t = this.t;
    r.s = this.s;
  }

  // (protected) set from integer value x, -DV <= x < DV
  function bnpFromInt(x) {
    this.t = 1;
    this.s = (x<0)?-1:0;
    if(x > 0) this[0] = x;
    else if(x < -1) this[0] = x+DV;
    else this.t = 0;
  }

  // return bigint initialized to value
  function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

  // (protected) set from string and radix
  function bnpFromString(s,b) {
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 256) k = 8; // byte array
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else { this.fromRadix(s,b); return; }
    this.t = 0;
    this.s = 0;
    var i = s.length, mi = false, sh = 0;
    while(--i >= 0) {
      var x = (k==8)?s[i]&0xff:intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-") mi = true;
        continue;
      }
      mi = false;
      if(sh == 0)
        this[this.t++] = x;
      else if(sh+k > this.DB) {
        this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
        this[this.t++] = (x>>(this.DB-sh));
      }
      else
        this[this.t-1] |= x<<sh;
      sh += k;
      if(sh >= this.DB) sh -= this.DB;
    }
    if(k == 8 && (s[0]&0x80) != 0) {
      this.s = -1;
      if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
    }
    this.clamp();
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) clamp off excess high words
  function bnpClamp() {
    var c = this.s&this.DM;
    while(this.t > 0 && this[this.t-1] == c) --this.t;
  }

  // (public) return string representation in given radix
  function bnToString(b) {
    if(this.s < 0) return "-"+this.negate().toString(b);
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else return this.toRadix(b);
    var km = (1<<k)-1, d, m = false, r = "", i = this.t;
    var p = this.DB-(i*this.DB)%k;
    if(i-- > 0) {
      if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
      while(i >= 0) {
        if(p < k) {
          d = (this[i]&((1<<p)-1))<<(k-p);
          d |= this[--i]>>(p+=this.DB-k);
        }
        else {
          d = (this[i]>>(p-=k))&km;
          if(p <= 0) { p += this.DB; --i; }
        }
        if(d > 0) m = true;
        if(m) r += int2char(d);
      }
    }
    return m?r:"0";
  }

  // (public) -this
  function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

  // (public) |this|
  function bnAbs() { return (this.s<0)?this.negate():this; }

  // (public) return + if this > a, - if this < a, 0 if equal
  function bnCompareTo(a) {
    var r = this.s-a.s;
    if(r != 0) return r;
    var i = this.t;
    r = i-a.t;
    if(r != 0) return (this.s<0)?-r:r;
    while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
    return 0;
  }

  // returns bit length of the integer x
  function nbits(x) {
    var r = 1, t;
    if((t=x>>>16) != 0) { x = t; r += 16; }
    if((t=x>>8) != 0) { x = t; r += 8; }
    if((t=x>>4) != 0) { x = t; r += 4; }
    if((t=x>>2) != 0) { x = t; r += 2; }
    if((t=x>>1) != 0) { x = t; r += 1; }
    return r;
  }

  // (public) return the number of bits in "this"
  function bnBitLength() {
    if(this.t <= 0) return 0;
    return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
  }

  // (protected) r = this << n*DB
  function bnpDLShiftTo(n,r) {
    var i;
    for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
    for(i = n-1; i >= 0; --i) r[i] = 0;
    r.t = this.t+n;
    r.s = this.s;
  }

  // (protected) r = this >> n*DB
  function bnpDRShiftTo(n,r) {
    for(var i = n; i < this.t; ++i) r[i-n] = this[i];
    r.t = Math.max(this.t-n,0);
    r.s = this.s;
  }

  // (protected) r = this << n
  function bnpLShiftTo(n,r) {
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<cbs)-1;
    var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
    for(i = this.t-1; i >= 0; --i) {
      r[i+ds+1] = (this[i]>>cbs)|c;
      c = (this[i]&bm)<<bs;
    }
    for(i = ds-1; i >= 0; --i) r[i] = 0;
    r[ds] = c;
    r.t = this.t+ds+1;
    r.s = this.s;
    r.clamp();
  }

  // (protected) r = this >> n
  function bnpRShiftTo(n,r) {
    r.s = this.s;
    var ds = Math.floor(n/this.DB);
    if(ds >= this.t) { r.t = 0; return; }
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<bs)-1;
    r[0] = this[ds]>>bs;
    for(var i = ds+1; i < this.t; ++i) {
      r[i-ds-1] |= (this[i]&bm)<<cbs;
      r[i-ds] = this[i]>>bs;
    }
    if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
    r.t = this.t-ds;
    r.clamp();
  }

  // (protected) r = this - a
  function bnpSubTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]-a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c -= a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c -= a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c -= a.s;
    }
    r.s = (c<0)?-1:0;
    if(c < -1) r[i++] = this.DV+c;
    else if(c > 0) r[i++] = c;
    r.t = i;
    r.clamp();
  }

  // (protected) r = this * a, r != this,a (HAC 14.12)
  // "this" should be the larger one if appropriate.
  function bnpMultiplyTo(a,r) {
    var x = this.abs(), y = a.abs();
    var i = x.t;
    r.t = i+y.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
    r.s = 0;
    r.clamp();
    if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
  }

  // (protected) r = this^2, r != this (HAC 14.16)
  function bnpSquareTo(r) {
    var x = this.abs();
    var i = r.t = 2*x.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < x.t-1; ++i) {
      var c = x.am(i,x[i],r,2*i,0,1);
      if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
        r[i+x.t] -= x.DV;
        r[i+x.t+1] = 1;
      }
    }
    if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
    r.s = 0;
    r.clamp();
  }

  // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
  // r != q, this != m.  q or r may be null.
  function bnpDivRemTo(m,q,r) {
    var pm = m.abs();
    if(pm.t <= 0) return;
    var pt = this.abs();
    if(pt.t < pm.t) {
      if(q != null) q.fromInt(0);
      if(r != null) this.copyTo(r);
      return;
    }
    if(r == null) r = nbi();
    var y = nbi(), ts = this.s, ms = m.s;
    var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
    if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
    else { pm.copyTo(y); pt.copyTo(r); }
    var ys = y.t;
    var y0 = y[ys-1];
    if(y0 == 0) return;
    var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
    var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
    var i = r.t, j = i-ys, t = (q==null)?nbi():q;
    y.dlShiftTo(j,t);
    if(r.compareTo(t) >= 0) {
      r[r.t++] = 1;
      r.subTo(t,r);
    }
    BigInteger.ONE.dlShiftTo(ys,t);
    t.subTo(y,y);	// "negative" y so we can replace sub with am later
    while(y.t < ys) y[y.t++] = 0;
    while(--j >= 0) {
      // Estimate quotient digit
      var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
      if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
        y.dlShiftTo(j,t);
        r.subTo(t,r);
        while(r[i] < --qd) r.subTo(t,r);
      }
    }
    if(q != null) {
      r.drShiftTo(ys,q);
      if(ts != ms) BigInteger.ZERO.subTo(q,q);
    }
    r.t = ys;
    r.clamp();
    if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
    if(ts < 0) BigInteger.ZERO.subTo(r,r);
  }

  // (public) this mod a
  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a,null,r);
    if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
    return r;
  }

  // Modular reduction using "classic" algorithm
  function Classic(m) { this.m = m; }
  function cConvert(x) {
    if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
    else return x;
  }
  function cRevert(x) { return x; }
  function cReduce(x) { x.divRemTo(this.m,null,x); }
  function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
  function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo;

  // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
  // justification:
  //         xy == 1 (mod m)
  //         xy =  1+km
  //   xy(2-xy) = (1+km)(1-km)
  // x[y(2-xy)] = 1-k^2m^2
  // x[y(2-xy)] == 1 (mod m^2)
  // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
  // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
  // JS multiply "overflows" differently from C/C++, so care is needed here.
  function bnpInvDigit() {
    if(this.t < 1) return 0;
    var x = this[0];
    if((x&1) == 0) return 0;
    var y = x&3;		// y == 1/x mod 2^2
    y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
    y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
    y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
    // last step - calculate inverse mod DV directly;
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
    y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
    // we really want the negative inverse, and -DV < y < DV
    return (y>0)?this.DV-y:-y;
  }

  // Montgomery reduction
  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp&0x7fff;
    this.mph = this.mp>>15;
    this.um = (1<<(m.DB-15))-1;
    this.mt2 = 2*m.t;
  }

  // xR mod m
  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t,r);
    r.divRemTo(this.m,null,r);
    if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
    return r;
  }

  // x/R mod m
  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  }

  // x = x/R mod m (HAC 14.32)
  function montReduce(x) {
    while(x.t <= this.mt2)	// pad x so am has enough room later
      x[x.t++] = 0;
    for(var i = 0; i < this.m.t; ++i) {
      // faster way of calculating u0 = x[i]*mp mod DV
      var j = x[i]&0x7fff;
      var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
      // use am to combine the multiply-shift-add into one call
      j = i+this.m.t;
      x[j] += this.m.am(0,u0,x,i,0,this.m.t);
      // propagate carry
      while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
    }
    x.clamp();
    x.drShiftTo(this.m.t,x);
    if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
  }

  // r = "x^2/R mod m"; x != r
  function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  // r = "xy/R mod m"; x,y != r
  function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo;

  // (protected) true iff this is even
  function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

  // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
  function bnpExp(e,z) {
    if(e > 0xffffffff || e < 1) return BigInteger.ONE;
    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
    g.copyTo(r);
    while(--i >= 0) {
      z.sqrTo(r,r2);
      if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
      else { var t = r; r = r2; r2 = t; }
    }
    return z.revert(r);
  }

  // (public) this^e % m, 0 <= e < 2^32
  function bnModPowInt(e,m) {
    var z;
    if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
    return this.exp(e,z);
  }

  // protected
  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp;

  // public
  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt;

  // "constants"
  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1);

  // jsbn2 stuff

  // (protected) convert from radix string
  function bnpFromRadix(s,b) {
    this.fromInt(0);
    if(b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
    for(var i = 0; i < s.length; ++i) {
      var x = intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }
      w = b*w+x;
      if(++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w,0);
        j = 0;
        w = 0;
      }
    }
    if(j > 0) {
      this.dMultiply(Math.pow(b,j));
      this.dAddOffset(w,0);
    }
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) return x s.t. r^x < DV
  function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

  // (public) 0 if this == 0, 1 if this > 0
  function bnSigNum() {
    if(this.s < 0) return -1;
    else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
    else return 1;
  }

  // (protected) this *= n, this >= 0, 1 < n < DV
  function bnpDMultiply(n) {
    this[this.t] = this.am(0,n-1,this,0,0,this.t);
    ++this.t;
    this.clamp();
  }

  // (protected) this += n << w words, this >= 0
  function bnpDAddOffset(n,w) {
    if(n == 0) return;
    while(this.t <= w) this[this.t++] = 0;
    this[w] += n;
    while(this[w] >= this.DV) {
      this[w] -= this.DV;
      if(++w >= this.t) this[this.t++] = 0;
      ++this[w];
    }
  }

  // (protected) convert to radix string
  function bnpToRadix(b) {
    if(b == null) b = 10;
    if(this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b,cs);
    var d = nbv(a), y = nbi(), z = nbi(), r = "";
    this.divRemTo(d,y,z);
    while(y.signum() > 0) {
      r = (a+z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d,y,z);
    }
    return z.intValue().toString(b) + r;
  }

  // (public) return value as integer
  function bnIntValue() {
    if(this.s < 0) {
      if(this.t == 1) return this[0]-this.DV;
      else if(this.t == 0) return -1;
    }
    else if(this.t == 1) return this[0];
    else if(this.t == 0) return 0;
    // assumes 16 < DB < 32
    return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
  }

  // (protected) r = this + a
  function bnpAddTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]+a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c += a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c += a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += a.s;
    }
    r.s = (c<0)?-1:0;
    if(c > 0) r[i++] = c;
    else if(c < -1) r[i++] = this.DV+c;
    r.t = i;
    r.clamp();
  }

  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.addTo = bnpAddTo;

  //======= end jsbn =======

  // Emscripten wrapper
  var Wrapper = {
    abs: function(l, h) {
      var x = new goog.math.Long(l, h);
      var ret;
      if (x.isNegative()) {
        ret = x.negate();
      } else {
        ret = x;
      }
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
    },
    ensureTemps: function() {
      if (Wrapper.ensuredTemps) return;
      Wrapper.ensuredTemps = true;
      Wrapper.two32 = new BigInteger();
      Wrapper.two32.fromString('4294967296', 10);
      Wrapper.two64 = new BigInteger();
      Wrapper.two64.fromString('18446744073709551616', 10);
      Wrapper.temp1 = new BigInteger();
      Wrapper.temp2 = new BigInteger();
    },
    lh2bignum: function(l, h) {
      var a = new BigInteger();
      a.fromString(h.toString(), 10);
      var b = new BigInteger();
      a.multiplyTo(Wrapper.two32, b);
      var c = new BigInteger();
      c.fromString(l.toString(), 10);
      var d = new BigInteger();
      c.addTo(b, d);
      return d;
    },
    stringify: function(l, h, unsigned) {
      var ret = new goog.math.Long(l, h).toString();
      if (unsigned && ret[0] == '-') {
        // unsign slowly using jsbn bignums
        Wrapper.ensureTemps();
        var bignum = new BigInteger();
        bignum.fromString(ret, 10);
        ret = new BigInteger();
        Wrapper.two64.addTo(bignum, ret);
        ret = ret.toString(10);
      }
      return ret;
    },
    fromString: function(str, base, min, max, unsigned) {
      Wrapper.ensureTemps();
      var bignum = new BigInteger();
      bignum.fromString(str, base);
      var bigmin = new BigInteger();
      bigmin.fromString(min, 10);
      var bigmax = new BigInteger();
      bigmax.fromString(max, 10);
      if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
        var temp = new BigInteger();
        bignum.addTo(Wrapper.two64, temp);
        bignum = temp;
      }
      var error = false;
      if (bignum.compareTo(bigmin) < 0) {
        bignum = bigmin;
        error = true;
      } else if (bignum.compareTo(bigmax) > 0) {
        bignum = bigmax;
        error = true;
      }
      var ret = goog.math.Long.fromString(bignum.toString()); // min-max checks should have clamped this to a range goog.math.Long can handle well
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
      if (error) throw 'range error';
    }
  };
  return Wrapper;
})();

//======= end closure i64 code =======



// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (typeof Module['locateFile'] === 'function') {
    memoryInitializer = Module['locateFile'](memoryInitializer);
  } else if (Module['memoryInitializerPrefixURL']) {
    memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, STATIC_BASE);
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      for (var i = 0; i < data.length; i++) {
        assert(HEAPU8[STATIC_BASE + i] === 0, "area for memory initializer should not have been touched before it's loaded");
      }
      HEAPU8.set(data, STATIC_BASE);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status) {
  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so not exiting');
    return;
  }

  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;

  // exit the runtime
  exitRuntime();

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  throw 'abort() at ' + stackTrace() + extra;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}



