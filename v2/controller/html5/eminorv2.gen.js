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
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

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
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB;
// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)
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

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
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

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
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

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
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
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
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
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) { var success = enlargeMemory(); if (!success) { DYNAMICTOP = ret; return 0; } }; return ret; },
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
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
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
    if ((!opts || !opts.async) && typeof EmterpreterAsync === 'object') {
      assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling ccall');
    }
    if (opts && opts.async) assert(!returnType, 'async ccalls cannot return values');
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
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
    funcstr += "if (typeof EmterpreterAsync === 'object') { assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling cwrap') }";
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

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if ((typeof _sbrk !== 'undefined' && !_sbrk.called) || !runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module['getMemory'] = getMemory;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
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
  return Module['UTF8ToString'](ptr);
}
Module['Pointer_stringify'] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module['AsciiToString'] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module['stringToAscii'] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

function UTF8ArrayToString(u8Array, idx) {
  var u0, u1, u2, u3, u4, u5;

  var str = '';
  while (1) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    u0 = u8Array[idx++];
    if (!u0) return str;
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    u1 = u8Array[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    u2 = u8Array[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u3 = u8Array[idx++] & 63;
      if ((u0 & 0xF8) == 0xF0) {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
      } else {
        u4 = u8Array[idx++] & 63;
        if ((u0 & 0xFC) == 0xF8) {
          u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
        } else {
          u5 = u8Array[idx++] & 63;
          u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
        }
      }
    }
    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
}
Module['UTF8ArrayToString'] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8, ptr);
}
Module['UTF8ToString'] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module['stringToUTF8Array'] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}
Module['stringToUTF8'] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module['lengthBytesUTF8'] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

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

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}
Module['stringToUTF16'] = stringToUTF16;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}
Module['lengthBytesUTF16'] = lengthBytesUTF16;

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}
Module['stringToUTF32'] = stringToUTF32;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}
Module['lengthBytesUTF32'] = lengthBytesUTF32;

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
  if (x % 4096 > 0) {
    x += (4096 - (x % 4096));
  }
  return x;
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

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec (and given that TOTAL_STACK=' + TOTAL_STACK + ')');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer;
buffer = new ArrayBuffer(TOTAL_MEMORY);
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
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
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
    HEAP8[((buffer++)>>0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
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


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

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
var Math_clz32 = Math.clz32;

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

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
  return id;
}

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

var ASM_CONSTS = [];




STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 16976;
  /* global initializers */  __ATINIT__.push();
  

/* memory initializer */ allocate([0,40,0,0,0,0,0,0,77,111,110,107,101,121,119,114,101,110,99,104,0,0,0,0,0,0,0,0,36,60,37,61,166,62,1,1,64,64,64,80,69,118,101,110,32,70,108,111,119,0,0,0,0,0,0,0,0,0,0,0,36,60,37,61,166,62,1,1,64,64,64,80,90,101,114,111,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,60,38,62,166,62,1,1,64,80,64,84,87,111,110,100,101,114,119,97,108,108,0,0,0,0,0,0,0,0,0,0,36,60,37,189,37,61,65,65,209,193,193,209,66,117,100,100,121,32,72,111,108,108,121,0,0,0,0,0,0,0,0,0,36,60,37,61,166,62,1,1,64,64,64,80,80,108,117,115,104,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,60,37,61,166,62,9,153,200,216,200,216,67,111,109,101,32,79,117,116,32,97,110,100,32,80,108,97,121,0,0,0,36,60,37,61,166,62,1,1,64,64,64,80,68,114,105,118,101,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,60,37,189,37,61,65,65,209,193,193,209,87,104,101,110,32,73,32,67,111,109,101,32,65,114,111,117,110,100,0,0,36,60,37,61,166,62,1,1,64,64,64,80,69,118,101,114,121,116,104,105,110,103,32,90,101,110,0,0,0,0,0,0,36,60,37,37,37,189,0,0,208,208,192,208,69,110,116,101,114,32,83,97,110,100,109,97,110,0,0,0,0,0,0,0,164,60,38,62,38,62,1,1,64,64,64,80,67,114,97,119,108,105,110,103,32,105,110,32,116,104,101,32,68,97,114,107,36,36,161,33,37,37,1,1,82,82,64,64,83,111,110,103,32,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,164,36,38,62,38,62,193,193,193,193,193,193,83,101,120,32,84,121,112,101,32,84,104,105,110,103,0,0,0,0,0,0,36,60,37,61,166,62,1,1,64,64,64,80,77,114,32,74,111,110,101,115,0,0,0,0,0,0,0,0,0,0,0,0,36,60,37,189,37,61,65,65,209,193,193,209,67,111,117,110,116,105,110,103,32,66,108,117,101,32,67,97,114,115,0,0,36,60,38,62,166,62,25,25,64,64,80,80,73,110,32,66,108,111,111,109,0,0,0,0,0,0,0,0,0,0,0,0,164,60,38,62,38,62,193,193,193,193,193,193,72,97,115,104,32,80,105,112,101,0,0,0,0,0,0,0,0,0,0,0,36,60,37,61,166,62,1,1,64,64,64,80,77,121,32,72,101,114,111,0,0,0,0,0,0,0,0,0,0,0,0,0,36,60,37,61,166,62,1,1,64,64,64,80,77,97,99,104,105,110,101,104,101,97,100,0,0,0,0,0,0,0,0,0,36,60,37,61,165,37,1,1,193,193,193,209,72,111,108,105,100,97,121,0,0,0,0,0,0,0,0,0,0,0,0,0,36,60,37,61,166,62,1,1,64,64,64,80,67,108,111,115,105,110,103,32,84,105,109,101,0,0,0,0,0,0,0,0,36,60,37,61,165,61,1,1,64,80,64,80,66,114,97,105,110,115,116,101,119,0,0,0,0,0,0,0,0,0,0,0,36,60,37,37,166,62,1,1,64,64,64,64,66,111,117,110,100,32,102,111,114,32,116,104,101,32,70,108,111,111,114,0,36,60,165,37,37,61,1,1,64,64,88,80,73,32,65,108,111,110,101,0,0,0,0,0,0,0,0,0,0,0,0,0,164,60,37,61,37,61,25,1,64,64,64,80,67,117,109,98,101,114,115,111,109,101,0,0,0,0,0,0,0,0,0,0,36,60,37,61,165,61,1,1,64,64,64,80,76,117,109,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,60,37,61,165,61,1,1,64,64,64,64,72,101,121,32,74,101,97,108,111,117,115,121,0,0,0,0,0,0,0,0,36,60,37,61,165,61,1,1,64,64,64,80,75,114,121,112,116,111,110,105,116,101,0,0,0,0,0,0,0,0,0,0,164,60,37,61,38,62,1,1,64,64,64,80,68,97,109,109,105,116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,60,37,61,165,61,1,1,64,64,64,80,83,101,109,105,45,99,104,97,114,109,101,100,32,76,105,102,101,0,0,0,36,60,37,61,165,61,1,1,64,64,64,80,77,121,32,79,119,110,32,87,111,114,115,116,32,69,110,101,109,121,0,0,36,60,37,61,166,62,1,1,64,64,64,64,84,104,101,32,77,105,100,100,108,101,0,0,0,0,0,0,0,0,0,0,36,60,165,61,29,37,0,0,0,0,18,0,66,117,108,108,101,116,32,87,105,116,104,32,66,117,116,116,101,114,102,108,164,36,26,26,38,46,1,1,80,80,64,64,73,102,32,89,111,117,32,67,111,117,108,100,32,79,110,108,121,32,83,101,36,60,29,29,37,189,1,1,80,80,64,80,66,101,97,117,116,105,102,117,108,32,68,105,115,97,115,116,101,114,0,0,36,60,29,29,165,61,1,1,80,80,64,64,70,111,114,32,87,104,111,109,32,84,104,101,32,66,101,108,108,32,84,111,36,60,37,61,166,62,1,1,64,64,64,64], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
/* memory initializer */ allocate([26,62,3,9,12,20,19,27,4,2,22,28,18,13,35,33,11,23,36,17,25,32,0,26,5,29,31,8,10,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+4104);
/* memory initializer */ allocate([32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,0,0,0,0,80,114,111,103,114,97,109,58,32,32,32,32,32,32,32,32,32,32,32,32,0,0,0,0,112,32,60,32,54,0,0,0,46,46,47,99,111,109,109,111,110,47,99,111,110,116,114,111,108,108,101,114,45,111,110,101,46,99,0,0,0,0,0,0,115,101,116,95,114,106,109,95,99,104,97,110,110,101,108,0,105,100,120,32,60,32,54,0,103,109,97,106,95,116,111,103,103,108,101,95,99,99,0,0,32,99,109,32,102,108,32,112,116,32,99,104,32,100,108,32,114,118,32,32,0,0,0,0,32,77,68,32,83,68,32,45,45,32,45,45,32,82,77,32,83,87,32,32,0,0,0,0,32,32,32,32,115,99,101,110,101,32,100,101,115,105,103,110,32,32,32,32,0,0,0,0,32,45,45,32,45,45,32,45,45,32,45,45,32,45,45,32,45,45,32,32,0,0,0,0,80,114,111,103,114,97,109,32,32,32,32,32,32,32,32,32,35,32,32,32,0,0,0,0,50,48,49,52,45,48,49,45,48,49,32,32,32,32,32,32,32,35,32,48,0,0,0,0,77,85,84,69,0,0,0,0,0,0,0,0,0,0,109,230,236,222,5,0,11,0,0,0,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,1,2,3,4,5,6,7,8,9,255,255,255,255,255,255,255,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,255,255,255,255,255,255,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,0,0,0,0,0,0,0,1,2,4,7,3,6,5,0,0,0,0,0,0,0,0,105,110,102,105,110,105,116,121,0,0,0,0,0,0,0,0,10,0,0,0,100,0,0,0,232,3,0,0,16,39,0,0,160,134,1,0,64,66,15,0,128,150,152,0,0,225,245,5,93,61,127,102,158,160,230,63,0,0,0,0,0,136,57,61,68,23,117,250,82,176,230,63,0,0,0,0,0,0,216,60,254,217,11,117,18,192,230,63,0,0,0,0,0,120,40,189,191,118,212,221,220,207,230,63,0,0,0,0,0,192,30,61,41,26,101,60,178,223,230,63,0,0,0,0,0,0,216,188,227,58,89,152,146,239,230,63,0,0,0,0,0,0,188,188,134,147,81,249,125,255,230,63,0,0,0,0,0,216,47,189,163,45,244,102,116,15,231,63,0,0,0,0,0,136,44,189,195,95,236,232,117,31,231,63,0,0,0,0,0,192,19,61,5,207,234,134,130,47,231,63,0,0,0,0,0,48,56,189,82,129,165,72,154,63,231,63,0,0,0,0,0,192,0,189,252,204,215,53,189,79,231,63,0,0,0,0,0,136,47,61,241,103,66,86,235,95,231,63,0,0,0,0,0,224,3,61,72,109,171,177,36,112,231,63,0,0,0,0,0,208,39,189,56,93,222,79,105,128,231,63,0,0,0,0,0,0,221,188,0,29,172,56,185,144,231,63,0,0,0,0,0,0,227,60,120,1,235,115,20,161,231,63,0,0,0,0,0,0,237,188,96,208,118,9,123,177,231,63,0,0,0,0,0,64,32,61,51,193,48,1,237,193,231,63,0,0,0,0,0,0,160,60,54,134,255,98,106,210,231,63,0,0,0,0,0,144,38,189,59,78,207,54,243,226,231,63,0,0,0,0,0,224,2,189,232,195,145,132,135,243,231,63,0,0,0,0,0,88,36,189,78,27,62,84,39,4,232,63,0,0,0,0,0,0,51,61,26,7,209,173,210,20,232,63,0,0,0,0,0,0,15,61,126,205,76,153,137,37,232,63,0,0,0,0,0,192,33,189,208,66,185,30,76,54,232,63,0,0,0,0,0,208,41,61,181,202,35,70,26,71,232,63,0,0,0,0,0,16,71,61,188,91,159,23,244,87,232,63,0,0,0,0,0,96,34,61,175,145,68,155,217,104,232,63,0,0,0,0,0,196,50,189,149,163,49,217,202,121,232,63,0,0,0,0,0,0,35,189,184,101,138,217,199,138,232,63,0,0,0,0,0,128,42,189,0,88,120,164,208,155,232,63,0,0,0,0,0,0,237,188,35,162,42,66,229,172,232,63,0,0,0,0,0,40,51,61,250,25,214,186,5,190,232,63,0,0,0,0,0,180,66,61,131,67,181,22,50,207,232,63,0,0,0,0,0,208,46,189,76,102,8,94,106,224,232,63,0,0,0,0,0,80,32,189,7,120,21,153,174,241,232,63,0,0,0,0,0,40,40,61,14,44,40,208,254,2,233,63,0,0,0,0,0,176,28,189,150,255,145,11,91,20,233,63,0,0,0,0,0,224,5,189,249,47,170,83,195,37,233,63,0,0,0,0,0,64,245,60,74,198,205,176,55,55,233,63,0,0,0,0,0,32,23,61,174,152,95,43,184,72,233,63,0,0,0,0,0,0,9,189,203,82,200,203,68,90,233,63,0,0,0,0,0,104,37,61,33,111,118,154,221,107,233,63,0,0,0,0,0,208,54,189,42,78,222,159,130,125,233,63,0,0,0,0,0,0,1,189,163,35,122,228,51,143,233,63,0,0,0,0,0,0,45,61,4,6,202,112,241,160,233,63,0,0,0,0,0,164,56,189,137,255,83,77,187,178,233,63,0,0,0,0,0,92,53,61,91,241,163,130,145,196,233,63,0,0,0,0,0,184,38,61,197,184,75,25,116,214,233,63,0,0,0,0,0,0,236,188,142,35,227,25,99,232,233,63,0,0,0,0,0,208,23,61,2,243,7,141,94,250,233,63,0,0,0,0,0,64,22,61,77,229,93,123,102,12,234,63,0,0,0,0,0,0,245,188,246,184,142,237,122,30,234,63,0,0,0,0,0,224,9,61,39,46,74,236,155,48,234,63,0,0,0,0,0,216,42,61,93,10,70,128,201,66,234,63,0,0,0,0,0,240,26,189,155,37,62,178,3,85,234,63,0,0,0,0,0,96,11,61,19,98,244,138,74,103,234,63,0,0,0,0,0,136,56,61,167,179,48,19,158,121,234,63,0,0,0,0,0,32,17,61,141,46,193,83,254,139,234,63,0,0,0,0,0,192,6,61,210,252,121,85,107,158,234,63,0,0,0,0,0,184,41,189,184,111,53,33,229,176,234,63,0,0,0,0,0,112,43,61,129,243,211,191,107,195,234,63,0,0,0,0,0,0,217,60,128,39,60,58,255,213,234,63,0,0,0,0,0,0,228,60,163,210,90,153,159,232,234,63,0,0,0,0,0,144,44,189,103,243,34,230,76,251,234,63,0,0,0,0,0,80,22,61,144,183,141,41,7,14,235,63,0,0,0,0,0,212,47,61,169,137,154,108,206,32,235,63,0,0,0,0,0,112,18,61,75,26,79,184,162,51,235,63,0,0,0,0,0,71,77,61,231,71,183,21,132,70,235,63,0,0,0,0,0,56,56,189,58,89,229,141,114,89,235,63,0,0,0,0,0,0,152,60,106,197,241,41,110,108,235,63,0,0,0,0,0,208,10,61,80,94,251,242,118,127,235,63,0,0,0,0,0,128,222,60,178,73,39,242,140,146,235,63,0,0,0,0,0,192,4,189,3,6,161,48,176,165,235,63,0,0,0,0,0,112,13,189,102,111,154,183,224,184,235,63,0,0,0,0,0,144,13,61,255,193,75,144,30,204,235,63,0,0,0,0,0,160,2,61,111,161,243,195,105,223,235,63,0,0,0,0,0,120,31,189,184,29,215,91,194,242,235,63,0,0,0,0,0,160,16,189,233,178,65,97,40,6,236,63,0,0,0,0,0,64,17,189,224,82,133,221,155,25,236,63,0,0,0,0,0,224,11,61,238,100,250,217,28,45,236,63,0,0,0,0,0,64,9,189,47,208,255,95,171,64,236,63,0,0,0,0,0,208,14,189,21,253,250,120,71,84,236,63,0,0,0,0,0,102,57,61,203,208,87,46,241,103,236,63,0,0,0,0,0,16,26,189,182,193,136,137,168,123,236,63,0,0,0,0,128,69,88,189,51,231,6,148,109,143,236,63,0,0,0,0,0,72,26,189,223,196,81,87,64,163,236,63,0,0,0,0,0,0,203,60,148,144,239,220,32,183,236,63,0,0,0,0,0,64,1,61,137,22,109,46,15,203,236,63,0,0,0,0,0,32,240,60,18,196,93,85,11,223,236,63,0,0,0,0,0,96,243,60,59,171,91,91,21,243,236,63,0,0,0,0,0,144,6,189,188,137,7,74,45,7,237,63,0,0,0,0,0,160,9,61,250,200,8,43,83,27,237,63,0,0,0,0,0,224,21,189,133,138,13,8,135,47,237,63,0,0,0,0,0,40,29,61,3,162,202,234,200,67,237,63,0,0,0,0,0,160,1,61,145,164,251,220,24,88,237,63,0,0,0,0,0,0,223,60,161,230,98,232,118,108,237,63,0,0,0,0,0,160,3,189,78,131,201,22,227,128,237,63,0,0,0,0,0,216,12,189,144,96,255,113,93,149,237,63,0,0,0,0,0,192,244,60,174,50,219,3,230,169,237,63,0,0,0,0,0,144,255,60,37,131,58,214,124,190,237,63,0,0,0,0,0,128,233,60,69,180,1,243,33,211,237,63,0,0,0,0,0,32,245,188,191,5,28,100,213,231,237,63,0,0,0,0,0,112,29,189,236,154,123,51,151,252,237,63,0,0,0,0,0,20,22,189,94,125,25,107,103,17,238,63,0,0,0,0,0,72,11,61,231,163,245,20,70,38,238,63,0,0,0,0,0,206,64,61,92,238,22,59,51,59,238,63,0,0,0,0,0,104,12,61,180,63,139,231,46,80,238,63,0,0,0,0,0,48,9,189,104,109,103,36,57,101,238,63,0,0,0,0,0,0,229,188,68,76,199,251,81,122,238,63,0,0,0,0,0,248,7,189,38,183,205,119,121,143,238,63,0,0,0,0,0,112,243,188,232,144,164,162,175,164,238,63,0,0,0,0,0,208,229,60,228,202,124,134,244,185,238,63,0,0,0,0,0,26,22,61,13,104,142,45,72,207,238,63,0,0,0,0,0,80,245,60,20,133,24,162,170,228,238,63,0,0,0,0,0,64,198,60,19,90,97,238,27,250,238,63,0,0,0,0,0,128,238,188,6,65,182,28,156,15,239,63,0,0,0,0,0,136,250,188,99,185,107,55,43,37,239,63,0,0,0,0,0,144,44,189,117,114,221,72,201,58,239,63,0,0,0,0,0,0,170,60,36,69,110,91,118,80,239,63,0,0,0,0,0,240,244,188,253,68,136,121,50,102,239,63,0,0,0,0,0,128,202,60,56,190,156,173,253,123,239,63,0,0,0,0,0,188,250,60,130,60,36,2,216,145,239,63,0,0,0,0,0,96,212,188,142,144,158,129,193,167,239,63,0,0,0,0,0,12,11,189,17,213,146,54,186,189,239,63,0,0,0,0,0,224,192,188,148,113,143,43,194,211,239,63,0,0,0,0,128,222,16,189,238,35,42,107,217,233,239,63,0,0,0,0,0,67,238,60,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,190,188,90,250,26,11,240,63,0,0,0,0,0,64,179,188,3,51,251,169,61,22,240,63,0,0,0,0,0,23,18,189,130,2,59,20,104,33,240,63,0,0,0,0,0,64,186,60,108,128,119,62,154,44,240,63,0,0,0,0,0,152,239,60,202,187,17,46,212,55,240,63,0,0,0,0,0,64,199,188,137,127,110,232,21,67,240,63,0,0,0,0,0,48,216,60,103,84,246,114,95,78,240,63,0,0,0,0,0,63,26,189,90,133,21,211,176,89,240,63,0,0,0,0,0,132,2,189,149,31,60,14,10,101,240,63,0,0,0,0,0,96,241,60,26,247,221,41,107,112,240,63,0,0,0,0,0,36,21,61,45,168,114,43,212,123,240,63,0,0,0,0,0,160,233,188,208,155,117,24,69,135,240,63,0,0,0,0,0,64,230,60,200,7,102,246,189,146,240,63,0,0,0,0,0,120,0,189,131,243,198,202,62,158,240,63,0,0,0,0,0,0,152,188,48,57,31,155,199,169,240,63,0,0,0,0,0,160,255,60,252,136,249,108,88,181,240,63,0,0,0,0,0,200,250,188,138,108,228,69,241,192,240,63,0,0,0,0,0,192,217,60,22,72,114,43,146,204,240,63,0,0,0,0,0,32,5,61,216,93,57,35,59,216,240,63,0,0,0,0,0,208,250,188,243,209,211,50,236,227,240,63,0,0,0,0,0,172,27,61,166,169,223,95,165,239,240,63,0,0,0,0,0,232,4,189,240,210,254,175,102,251,240,63,0,0,0,0,0,48,13,189,75,35,215,40,48,7,241,63,0,0,0,0,0,80,241,60,91,91,18,208,1,19,241,63,0,0,0,0,0,0,236,60,249,42,94,171,219,30,241,63,0,0,0,0,0,188,22,61,213,49,108,192,189,42,241,63,0,0,0,0,0,64,232,60,125,4,242,20,168,54,241,63,0,0,0,0,0,208,14,189,233,45,169,174,154,66,241,63,0,0,0,0,0,224,232,60,56,49,79,147,149,78,241,63,0,0,0,0,0,64,235,60,113,142,165,200,152,90,241,63,0,0,0,0,0,48,5,61,223,195,113,84,164,102,241,63,0,0,0,0,0,56,3,61,17,82,125,60,184,114,241,63,0,0,0,0,0,212,40,61,159,187,149,134,212,126,241,63,0,0,0,0,0,208,5,189,147,141,140,56,249,138,241,63,0,0,0,0,0,136,28,189,102,93,55,88,38,151,241,63,0,0,0,0,0,240,17,61,167,203,111,235,91,163,241,63,0,0,0,0,0,72,16,61,227,135,19,248,153,175,241,63,0,0,0,0,0,57,71,189,84,93,4,132,224,187,241,63,0,0,0,0,0,228,36,61,67,28,40,149,47,200,241,63,0,0,0,0,0,32,10,189,178,185,104,49,135,212,241,63,0,0,0,0,0,128,227,60,49,64,180,94,231,224,241,63,0,0,0,0,0,192,234,60,56,217,252,34,80,237,241,63,0,0,0,0,0,144,1,61,247,205,56,132,193,249,241,63,0,0,0,0,0,120,27,189,143,141,98,136,59,6,242,63,0,0,0,0,0,148,45,61,30,168,120,53,190,18,242,63,0,0,0,0,0,0,216,60,65,221,125,145,73,31,242,63,0,0,0,0,0,52,43,61,35,19,121,162,221,43,242,63,0,0,0,0,0,248,25,61,231,97,117,110,122,56,242,63,0,0,0,0,0,200,25,189,39,20,130,251,31,69,242,63,0,0,0,0,0,48,2,61,2,166,178,79,206,81,242,63,0,0,0,0,0,72,19,189,176,206,30,113,133,94,242,63,0,0,0,0,0,112,18,61,22,125,226,101,69,107,242,63,0,0,0,0,0,208,17,61,15,224,29,52,14,120,242,63,0,0,0,0,0,238,49,61,62,99,245,225,223,132,242,63,0,0,0,0,0,192,20,189,48,187,145,117,186,145,242,63,0,0,0,0,0,216,19,189,9,223,31,245,157,158,242,63,0,0,0,0,0,176,8,61,155,14,209,102,138,171,242,63,0,0,0,0,0,124,34,189,58,218,218,208,127,184,242,63,0,0,0,0,0,52,42,61,249,26,119,57,126,197,242,63,0,0,0,0,0,128,16,189,217,2,228,166,133,210,242,63,0,0,0,0,0,208,14,189,121,21,100,31,150,223,242,63,0,0,0,0,0,32,244,188,207,46,62,169,175,236,242,63,0,0,0,0,0,152,36,189,34,136,189,74,210,249,242,63,0,0,0,0,0,48,22,189,37,182,49,10,254,6,243,63,0,0,0,0,0,54,50,189,11,165,238,237,50,20,243,63,0,0,0,0,128,223,112,189,184,215,76,252,112,33,243,63,0,0,0,0,0,72,34,189,162,233,168,59,184,46,243,63,0,0,0,0,0,152,37,189,102,23,100,178,8,60,243,63,0,0,0,0,0,208,30,61,39,250,227,102,98,73,243,63,0,0,0,0,0,0,220,188,15,159,146,95,197,86,243,63,0,0,0,0,0,216,48,189,185,136,222,162,49,100,243,63,0,0,0,0,0,200,34,61,57,170,58,55,167,113,243,63,0,0,0,0,0,96,32,61,254,116,30,35,38,127,243,63,0,0,0,0,0,96,22,189,56,216,5,109,174,140,243,63,0,0,0,0,0,224,10,189,195,62,113,27,64,154,243,63,0,0,0,0,0,114,68,189,32,160,229,52,219,167,243,63,0,0,0,0,0,32,8,61,149,110,236,191,127,181,243,63,0,0,0,0,0,128,62,61,242,168,19,195,45,195,243,63,0,0,0,0,0,128,239,60,34,225,237,68,229,208,243,63,0,0,0,0,0,160,23,189,187,52,18,76,166,222,243,63,0,0,0,0,0,48,38,61,204,78,28,223,112,236,243,63,0,0,0,0,0,166,72,189,140,126,172,4,69,250,243,63,0,0,0,0,0,220,60,189,187,160,103,195,34,8,244,63,0,0,0,0,0,184,37,61,149,46,247,33,10,22,244,63,0,0,0,0,0,192,30,61,70,70,9,39,251,35,244,63,0,0,0,0,0,96,19,189,32,169,80,217,245,49,244,63,0,0,0,0,0,152,35,61,235,185,132,63,250,63,244,63,0,0,0,0,0,0,250,60,25,137,97,96,8,78,244,63,0,0,0,0,0,192,246,188,1,210,167,66,32,92,244,63,0,0,0,0,0,192,11,189,22,0,29,237,65,106,244,63,0,0,0,0,0,128,18,189,38,51,139,102,109,120,244,63,0,0,0,0,0,224,48,61,0,60,193,181,162,134,244,63,0,0,0,0,0,64,45,189,4,175,146,225,225,148,244,63,0,0,0,0,0,32,12,61,114,211,215,240,42,163,244,63,0,0,0,0,0,80,30,189,1,184,109,234,125,177,244,63,0,0,0,0,0,128,7,61,225,41,54,213,218,191,244,63,0,0,0,0,0,128,19,189,50,193,23,184,65,206,244,63,0,0,0,0,0,128,0,61,219,221,253,153,178,220,244,63,0,0,0,0,0,112,44,61,150,171,216,129,45,235,244,63,0,0,0,0,0,224,28,189,2,45,157,118,178,249,244,63,0,0,0,0,0,32,25,61,193,49,69,127,65,8,245,63,0,0,0,0,0,192,8,189,42,102,207,162,218,22,245,63,0,0,0,0,0,0,250,188,234,81,63,232,125,37,245,63,0,0,0,0,0,8,74,61,218,78,157,86,43,52,245,63,0,0,0,0,0,216,38,189,26,172,246,244,226,66,245,63,0,0,0,0,0,68,50,189,219,148,93,202,164,81,245,63,0,0,0,0,0,60,72,61,107,17,233,221,112,96,245,63,0,0,0,0,0,176,36,61,222,41,181,54,71,111,245,63,0,0,0,0,0,90,65,61,14,196,226,219,39,126,245,63,0,0,0,0,0,224,41,189,111,199,151,212,18,141,245,63,0,0,0,0,0,8,35,189,76,11,255,39,8,156,245,63,0,0,0,0,0,236,77,61,39,84,72,221,7,171,245,63,0,0,0,0,0,0,196,188,244,122,168,251,17,186,245,63,0,0,0,0,0,8,48,61,11,70,89,138,38,201,245,63,0,0,0,0,0,200,38,189,63,142,153,144,69,216,245,63,0,0,0,0,0,154,70,61,225,32,173,21,111,231,245,63,0,0,0,0,0,64,27,189,202,235,220,32,163,246,245,63,0,0,0,0,0,112,23,61,184,220,118,185,225,5,246,63,0,0,0,0,0,248,38,61,21,247,205,230,42,21,246,63,0,0,0,0,0,0,1,61,49,85,58,176,126,36,246,63,0,0,0,0,0,208,21,189,181,41,25,29,221,51,246,63,0,0,0,0,0,208,18,189,19,195,204,52,70,67,246,63,0,0,0,0,0,128,234,188,250,142,188,254,185,82,246,63,0,0,0,0,0,96,40,189,151,51,85,130,56,98,246,63,0,0,0,0,0,254,113,61,142,50,8,199,193,113,246,63,0,0,0,0,0,32,55,189,126,169,76,212,85,129,246,63,0,0,0,0,0,128,230,60,113,148,158,177,244,144,246,63,0,0,0,0,0,120,41,189,205,59,127,102,158,160,230,63,135,1,235,115,20,161,231,63,219,160,42,66,229,172,232,63,144,240,163,130,145,196,233,63,173,211,90,153,159,232,234,63,156,82,133,221,155,25,236,63,135,164,251,220,24,88,237,63,218,144,164,162,175,164,238,63,0,0,0,0,0,0,240,63,15,137,249,108,88,181,240,63,123,81,125,60,184,114,241,63,56,98,117,110,122,56,242,63,21,183,49,10,254,6,243,63,34,52,18,76,166,222,243,63,39,42,54,213,218,191,244,63,41,84,72,221,7,171,245,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,0,0,0,0,124,63,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,0,10,0,17,17,17,0,0,0,0,5,0,0,0,0,0,0,9,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,15,10,17,17,17,3,10,7,0,1,19,9,11,11,0,0,9,6,11,0,0,11,0,6,17,0,0,0,17,17,17,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,10,10,17,17,17,0,10,0,0,2,0,9,11,0,0,0,9,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,4,13,0,0,0,0,9,14,0,0,0,0,0,14,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,0,0,0,0,0,0,0,0,0,0,0,15,0,0,0,0,15,0,0,0,0,9,16,0,0,0,0,0,16,0,0,16,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,10,0,0,0,0,9,11,0,0,0,0,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,48,49,50,51,52,53,54,55,56,57,65,66,67,68,69,70,45,43,32,32,32,48,88,48,120,0,0,0,0,0,0,0,40,110,117,108,108,41,0,0,45,48,88,43,48,88,32,48,88,45,48,120,43,48,120,32,48,120,0,0,0,0,0,0,105,110,102,0,0,0,0,0,73,78,70,0,0,0,0,0,110,97,110,0,0,0,0,0,78,65,78,0,0,0,0,0,46,0,0,0,0,0,0,0,0,0,0,0,45,244,81,88,207,140,177,192,70,246,181,203,41,49,3,199,4,91,112,48,180,93,253,32,120,127,139,154,216,89,41,80,104,72,137,171,167,86,3,108,255,183,205,136,63,212,119,180,43,165,163,112,241,186,228,168,252,65,131,253,217,111,225,138,122,47,45,116,150,7,31,13,9,94,3,118,44,112,247,64,165,44,167,111,87,65,168,170,116,223,160,88,100,3,74,199,196,60,83,174,175,95,24,4,21,177,227,109,40,134,171,12,164,191,67,240,233,80,129,57,87,22,82,55,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,109,97,120,32,115,121,115,116,101,109,32,98,121,116,101,115,32,61,32,37,49,48,108,117,10,0,0,0,0,0,0,0,115,121,115,116,101,109,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0,0,0,0,0,0,0,105,110,32,117,115,101,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0,0,0,0,0,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+10656);





/* no memory initializer */
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

// {{PRE_LIBRARY}}


  function _() {
  Module['printErr']('missing function: '); abort(-1);
  }

  var _cosf=Math_cos;

   
  Module["_i64Subtract"] = _i64Subtract;

  var _DtoILow=true;

  function ___assert_fail(condition, filename, line, func) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
    }

  function _remquof() {
  Module['printErr']('missing function: remquof'); abort(-1);
  }

   
  Module["_memset"] = _memset;

  var _BDtoILow=true;

  var _FtoIHigh=true;

  
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }function _strerror_r(errnum, strerrbuf, buflen) {
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
              // we will read data by chunks of BUFSIZE
              var BUFSIZE = 256;
              var buf = new Buffer(BUFSIZE);
              var bytesRead = 0;
  
              var fd = process.stdin.fd;
              // Linux and Mac cannot use process.stdin.fd (which isn't set up as sync)
              var usingDevice = false;
              try {
                fd = fs.openSync('/dev/stdin', 'r');
                usingDevice = true;
              } catch (e) {}
  
              bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
  
              if (usingDevice) { fs.closeSync(fd); }
              if (bytesRead > 0) {
                result = buf.slice(0, bytesRead).toString('utf-8');
              } else {
                result = null;
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
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
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
                mmap: MEMFS.stream_ops.mmap,
                msync: MEMFS.stream_ops.msync
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
          } else {
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
          else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
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
        },msync:function (stream, buffer, offset, length, mmapFlags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          if (mmapFlags & 2) {
            // MAP_PRIVATE calls need not to be synced back to underlying fs
            return 0;
          }
  
          var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
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
  
          if (!fileStore.indexNames.contains('timestamp')) {
            fileStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
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
          transaction.onerror = function(e) {
            callback(this.error);
            e.preventDefault();
          };
  
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
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
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
  
        transaction.onerror = function(e) {
          done(this.error);
          e.preventDefault();
        };
  
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
            path = fs.readlinkSync(path);
            path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
            return path;
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
        return PATH.resolve(FS.getPath(lookup.node.parent), link.node_ops.readlink(link));
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
      },msync:function (stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },munmap:function (stream) {
        return 0;
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
          ret = UTF8ArrayToString(buf, 0);
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
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn);
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
          write: function(stream, buffer, offset, length, pos) { return length; }
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
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency('cp ' + fullname); // might have several active requests for the same fullname
        function processData(byteArray) {
          function finish(byteArray) {
            if (preFinish) preFinish();
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency(dep);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency(dep);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency(dep);
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
      assert((varargs & 3) === 0);
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        argIndex = Runtime.prepVararg(argIndex, type);
        if (type === 'double') {
          ret = (HEAP32[((tempDoublePtr)>>2)]=HEAP32[(((varargs)+(argIndex))>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((varargs)+((argIndex)+(4)))>>2)],(+(HEAPF64[(tempDoublePtr)>>3])));
          argIndex += 8;
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+4))>>2)]];
  
          argIndex += 8;
        } else {
          assert((argIndex & 3) === 0);
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
          argIndex += 4;
        }
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


  var _sqrtf=Math_sqrt;

  function ___unlock() {}

   
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

  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 85: return totalMemory / PAGE_SIZE;
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
        case 79:
          return 0;
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
      if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success) return -1 >>> 0; // sbrk failure code
      }
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
FS.staticInit();__ATINIT__.unshift(function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() });__ATMAIN__.push(function() { FS.ignorePermissions = false });__ATEXIT__.push(function() { FS.quit() });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
__ATINIT__.unshift(function() { TTY.init() });__ATEXIT__.push(function() { TTY.shutdown() });
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); var NODEJS_PATH = require("path"); NODEFS.staticInit(); }
__ATINIT__.push(function() { SOCKFS.root = FS.mount(SOCKFS, {}, null); });
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };
Module.asmLibraryArg = { "abort": abort, "assert": assert, "nullFunc_iiii": nullFunc_iiii, "invoke_iiii": invoke_iiii, "_fabs": _fabs, "_lcd_row_get": _lcd_row_get, "_midi_send_cmd1": _midi_send_cmd1, "_sin": _sin, "_exp": _exp, "_cosf": _cosf, "_send": _send, "_sqrtf": _sqrtf, "_cosl": _cosl, "_remquof": _remquof, "___setErrNo": ___setErrNo, "___assert_fail": ___assert_fail, "_write": _write, "_fflush": _fflush, "_pwrite": _pwrite, "_strerror_r": _strerror_r, "_fprintf": _fprintf, "__reallyNegative": __reallyNegative, "_sbrk": _sbrk, "_cos": _cos, "_nextafter": _nextafter, "_remquo": _remquo, "_sinf": _sinf, "_fileno": _fileno, "_sysconf": _sysconf, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_lcd_updated_all": _lcd_updated_all, "_led_set": _led_set, "_llvm_fma_f64": _llvm_fma_f64, "_log": _log, "___unlock": ___unlock, "_fsw_poll": _fsw_poll, "_": _, "___errno_location": ___errno_location, "_expf": _expf, "_midi_send_cmd2": _midi_send_cmd2, "_fesetround": _fesetround, "_logf": _logf, "_sinl": _sinl, "___lock": ___lock, "_abort": _abort, "_fwrite": _fwrite, "_time": _time, "_mkport": _mkport, "_strerror": _strerror, "__formatString": __formatString, "_sqrt": _sqrt, "_ilogb": _ilogb, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8, "_stderr": _stderr };
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
  var _stderr=env._stderr|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
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
  var Math_min=global.Math.min;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
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
  var _fesetround=env._fesetround;
  var _logf=env._logf;
  var _sinl=env._sinl;
  var ___lock=env.___lock;
  var _abort=env._abort;
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
function establishStackSpace(stackBase, stackMax) {
  stackBase = stackBase|0;
  stackMax = stackMax|0;
  STACKTOP = stackBase;
  STACK_MAX = stackMax;
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

function _flash_load($addr,$count,$data) {
 $addr = $addr|0;
 $count = $count|0;
 $data = $data|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $addr;
 $1 = $count;
 $2 = $data;
 $3 = $2;
 $4 = $0;
 $5 = $4&65535;
 $6 = (16 + ($5)|0);
 $7 = $1;
 $8 = $7&65535;
 _memcpy(($3|0),($6|0),($8|0))|0;
 STACKTOP = sp;return;
}
function _flash_store($addr,$count,$data) {
 $addr = $addr|0;
 $count = $count|0;
 $data = $data|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $addr;
 $1 = $count;
 $2 = $data;
 $3 = $0;
 $4 = $3&65535;
 $5 = (16 + ($4)|0);
 $6 = $2;
 $7 = $1;
 $8 = $7&65535;
 _memcpy(($5|0),($6|0),($8|0))|0;
 STACKTOP = sp;return;
}
function _load_program_state() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, $mkv_chan = 0, $new_rjm_actual = 0, $out_level = 0, $rdesc = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = HEAP8[10256>>0]|0;
 $1 = $0&255;
 $2 = $1&65535;
 $3 = $2<<5;
 $4 = $3&65535;
 _flash_load($4,32,10264);
 $5 = HEAP8[10264>>0]|0;
 $6 = $5&255;
 $7 = ($6|0)==(0);
 if ($7) {
  HEAP8[10264>>0] = 32;
  HEAP8[(10265)>>0] = 32;
  HEAP8[(10266)>>0] = 32;
  $8 = HEAP8[10256>>0]|0;
  $9 = $8&255;
  $10 = (($9) + 1)|0;
  $11 = $10&255;
  (_ritoa(10264,$11,3)|0);
  HEAP8[(10268)>>0] = 0;
  HEAP8[(10284)>>0] = 36;
  HEAP8[(10285)>>0] = 56;
  HEAP8[(10286)>>0] = 37;
  HEAP8[(10287)>>0] = 57;
  HEAP8[(10288)>>0] = -90;
  HEAP8[(10289)>>0] = 58;
  HEAP8[(10290)>>0] = 1;
  HEAP8[(10291)>>0] = 1;
  HEAP8[(10292)>>0] = 64;
  HEAP8[(10293)>>0] = 64;
  HEAP8[(10294)>>0] = 64;
  HEAP8[(10295)>>0] = 80;
 }
 HEAP8[10296>>0] = 4;
 $i = 0;
 while(1) {
  $12 = $i;
  $13 = $12&255;
  $14 = ($13|0)<(6);
  if (!($14)) {
   break;
  }
  $15 = $i;
  $16 = $15&255;
  $17 = ((10284) + ($16)|0);
  $18 = HEAP8[$17>>0]|0;
  $rdesc = $18;
  $19 = $rdesc;
  $20 = $19&255;
  $21 = $20 & 3;
  $22 = $21&255;
  $mkv_chan = $22;
  $23 = $mkv_chan;
  $new_rjm_actual = $23;
  $24 = $rdesc;
  $25 = $24&255;
  $26 = $25 & 124;
  $27 = $26 >> 2;
  $28 = $27&255;
  $out_level = $28;
  $29 = $out_level;
  $30 = $29 << 24 >> 24;
  $31 = ($30|0)>(15);
  if ($31) {
   $32 = $out_level;
   $33 = $32&255;
   $34 = $33 | 224;
   $35 = $34&255;
   $out_level = $35;
  }
  $36 = $out_level;
  $37 = $36 << 24 >> 24;
  $38 = (($37) + -9)|0;
  $39 = $38&255;
  $out_level = $39;
  $40 = $rdesc;
  $41 = $40&255;
  $42 = $41 & 128;
  $43 = ($42|0)==(128);
  if ($43) {
   $44 = $i;
   HEAP8[10296>>0] = $44;
  }
  $45 = $new_rjm_actual;
  $46 = $i;
  $47 = $46&255;
  $48 = (10304 + ($47)|0);
  HEAP8[$48>>0] = $45;
  $49 = $out_level;
  $50 = $i;
  $51 = $50&255;
  $52 = (10312 + ($51)|0);
  HEAP8[$52>>0] = $49;
  $53 = $i;
  $54 = (($53) + 1)<<24>>24;
  $i = $54;
 }
 STACKTOP = sp;return;
}
function _controller_init() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[10320>>0] = 1;
 HEAP8[10328>>0] = 0;
 HEAP8[10336>>0] = 0;
 $i = 0;
 while(1) {
  $0 = $i;
  $1 = $0&255;
  $2 = ($1|0)<(4);
  if (!($2)) {
   break;
  }
  $3 = $i;
  $4 = $3&255;
  $5 = (10344 + ($4<<3)|0);
  $6 = ((($5)) + 4|0);
  HEAP8[$6>>0] = 0;
  $7 = $i;
  $8 = $7&255;
  $9 = (10344 + ($8<<3)|0);
  HEAP8[$9>>0] = 0;
  $10 = $i;
  $11 = (($10) + 1)<<24>>24;
  $i = $11;
 }
 HEAP8[10376>>0] = 0;
 HEAP8[10384>>0] = 0;
 HEAP8[10392>>0] = 0;
 HEAP8[10400>>0] = 0;
 HEAP16[10408>>1] = 0;
 HEAP16[10416>>1] = -1;
 HEAP8[10424>>0] = 0;
 HEAP8[10432>>0] = 0;
 HEAP8[10440>>0] = 0;
 HEAP8[10448>>0] = 0;
 HEAP8[10456>>0] = 0;
 HEAP8[10464>>0] = 0;
 HEAP8[10472>>0] = 0;
 HEAP8[10480>>0] = 0;
 HEAP8[10488>>0] = 0;
 HEAP8[10496>>0] = 0;
 HEAP8[10504>>0] = 0;
 HEAP8[10296>>0] = 0;
 HEAP8[10512>>0] = -1;
 HEAP8[10256>>0] = 0;
 HEAP8[10520>>0] = 84;
 HEAP8[(10521)>>0] = 85;
 HEAP8[(10522)>>0] = 86;
 HEAP8[(10523)>>0] = 87;
 HEAP8[(10524)>>0] = 88;
 HEAP8[(10525)>>0] = 89;
 HEAP8[(10526)>>0] = 90;
 HEAP8[(10527)>>0] = 91;
 HEAP8[(10290)>>0] = 0;
 HEAP8[(10291)>>0] = 16;
 HEAP8[(10292)>>0] = 0;
 HEAP8[(10293)>>0] = 16;
 HEAP8[(10294)>>0] = 0;
 HEAP8[(10295)>>0] = 16;
 $i = 0;
 while(1) {
  $12 = $i;
  $13 = $12&255;
  $14 = ($13|0)<(4);
  if (!($14)) {
   break;
  }
  $15 = $i;
  $16 = (_lcd_row_get(($15|0))|0);
  $17 = $i;
  $18 = $17&255;
  $19 = (10528 + ($18<<2)|0);
  HEAP32[$19>>2] = $16;
  $20 = $i;
  $21 = (($20) + 1)<<24>>24;
  $i = $21;
 }
 $i = 0;
 while(1) {
  $22 = $i;
  $23 = $22&255;
  $24 = ($23|0)<(20);
  if (!($24)) {
   break;
  }
  $25 = $i;
  $26 = $25&255;
  $27 = (10664 + ($26)|0);
  $28 = HEAP8[$27>>0]|0;
  $29 = $i;
  $30 = $29&255;
  $31 = HEAP32[10528>>2]|0;
  $32 = (($31) + ($30)|0);
  HEAP8[$32>>0] = $28;
  $33 = $i;
  $34 = $33&255;
  $35 = (10664 + ($34)|0);
  $36 = HEAP8[$35>>0]|0;
  $37 = $i;
  $38 = $37&255;
  $39 = HEAP32[(10532)>>2]|0;
  $40 = (($39) + ($38)|0);
  HEAP8[$40>>0] = $36;
  $41 = $i;
  $42 = $41&255;
  $43 = (10688 + ($42)|0);
  $44 = HEAP8[$43>>0]|0;
  $45 = $i;
  $46 = $45&255;
  $47 = HEAP32[(10536)>>2]|0;
  $48 = (($47) + ($46)|0);
  HEAP8[$48>>0] = $44;
  $49 = $i;
  $50 = $49&255;
  $51 = (10664 + ($50)|0);
  $52 = HEAP8[$51>>0]|0;
  $53 = $i;
  $54 = $53&255;
  $55 = HEAP32[(10540)>>2]|0;
  $56 = (($55) + ($54)|0);
  HEAP8[$56>>0] = $52;
  $57 = $i;
  $58 = (($57) + 1)<<24>>24;
  $i = $58;
 }
 _update_lcd();
 _switch_setlist_mode(1);
 _set_gmaj_program();
 _scene_activate();
 STACKTOP = sp;return;
}
function _controller_10msec_timer() {
 var $$ = 0, $$1 = 0, $$2 = 0, $$3 = 0, $$4 = 0, $$5 = 0, $$6 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0;
 var $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0;
 var $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0;
 var $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[10432>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)>(0);
 if ($2) {
  $3 = HEAP8[10432>>0]|0;
  $4 = (($3) + 1)<<24>>24;
  HEAP8[10432>>0] = $4;
  $5 = HEAP8[10432>>0]|0;
  $6 = $5&255;
  $7 = ($6|0)>=(240);
  $$ = $7 ? -128 : $4;
  HEAP8[10432>>0] = $$;
 }
 $8 = HEAP8[10440>>0]|0;
 $9 = $8&255;
 $10 = ($9|0)>(0);
 if ($10) {
  $11 = HEAP8[10440>>0]|0;
  $12 = (($11) + 1)<<24>>24;
  HEAP8[10440>>0] = $12;
  $13 = HEAP8[10440>>0]|0;
  $14 = $13&255;
  $15 = ($14|0)>=(240);
  $$1 = $15 ? -128 : $12;
  HEAP8[10440>>0] = $$1;
 }
 $16 = HEAP8[10424>>0]|0;
 $17 = $16&255;
 $18 = ($17|0)>(0);
 if ($18) {
  $19 = HEAP8[10424>>0]|0;
  $20 = (($19) + 1)<<24>>24;
  HEAP8[10424>>0] = $20;
  $21 = HEAP8[10424>>0]|0;
  $22 = $21&255;
  $23 = ($22|0)>=(240);
  $$2 = $23 ? -128 : $20;
  HEAP8[10424>>0] = $$2;
 }
 $24 = HEAP8[10448>>0]|0;
 $25 = $24&255;
 $26 = ($25|0)>(0);
 if ($26) {
  $27 = HEAP8[10448>>0]|0;
  $28 = (($27) + 1)<<24>>24;
  HEAP8[10448>>0] = $28;
  $29 = HEAP8[10448>>0]|0;
  $30 = $29&255;
  $31 = ($30|0)>=(240);
  $$3 = $31 ? -128 : $28;
  HEAP8[10448>>0] = $$3;
 }
 $32 = HEAP8[10456>>0]|0;
 $33 = $32&255;
 $34 = ($33|0)>(0);
 if ($34) {
  $35 = HEAP8[10456>>0]|0;
  $36 = (($35) + 1)<<24>>24;
  HEAP8[10456>>0] = $36;
  $37 = HEAP8[10456>>0]|0;
  $38 = $37&255;
  $39 = ($38|0)>=(240);
  $$4 = $39 ? -128 : $36;
  HEAP8[10456>>0] = $$4;
 }
 $40 = HEAP8[10472>>0]|0;
 $41 = $40&255;
 $42 = ($41|0)>(0);
 if ($42) {
  $43 = HEAP8[10472>>0]|0;
  $44 = (($43) + 1)<<24>>24;
  HEAP8[10472>>0] = $44;
  $45 = HEAP8[10472>>0]|0;
  $46 = $45&255;
  $47 = ($46|0)>=(55);
  if ($47) {
   HEAP8[10472>>0] = 45;
   HEAP8[10480>>0] = 1;
  }
 }
 $48 = HEAP8[10464>>0]|0;
 $49 = $48&255;
 $50 = ($49|0)>(0);
 if ($50) {
  $51 = HEAP8[10464>>0]|0;
  $52 = (($51) + 1)<<24>>24;
  HEAP8[10464>>0] = $52;
  $53 = HEAP8[10464>>0]|0;
  $54 = $53&255;
  $55 = ($54|0)>=(240);
  $$5 = $55 ? -128 : $52;
  HEAP8[10464>>0] = $$5;
 }
 $56 = HEAP8[10544>>0]|0;
 $57 = $56&255;
 $58 = ($57|0)>(0);
 if ($58) {
  $59 = HEAP8[10544>>0]|0;
  $60 = (($59) + 1)<<24>>24;
  HEAP8[10544>>0] = $60;
  $61 = HEAP8[10544>>0]|0;
  $62 = $61&255;
  $63 = ($62|0)>=(240);
  $$6 = $63 ? -128 : $60;
  HEAP8[10544>>0] = $$6;
 }
 $64 = HEAP8[10488>>0]|0;
 $65 = ($64<<24>>24)!=(0);
 if (!($65)) {
  return;
 }
 $66 = HEAP8[10488>>0]|0;
 $67 = (($66) + -1)<<24>>24;
 HEAP8[10488>>0] = $67;
 return;
}
function _prog_next() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[10256>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)!=(127);
 if (!($2)) {
  _set_gmaj_program();
  return;
 }
 $3 = HEAP8[10256>>0]|0;
 $4 = (($3) + 1)<<24>>24;
 HEAP8[10256>>0] = $4;
 _set_gmaj_program();
 return;
}
function _prog_prev() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[10256>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)!=(0);
 if (!($2)) {
  _set_gmaj_program();
  return;
 }
 $3 = HEAP8[10256>>0]|0;
 $4 = (($3) + -1)<<24>>24;
 HEAP8[10256>>0] = $4;
 _set_gmaj_program();
 return;
}
function _song_next() {
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[10552>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)==(0);
 if ($2) {
  return;
 }
 $3 = HEAP8[10400>>0]|0;
 $4 = $3&255;
 $5 = HEAP8[10552>>0]|0;
 $6 = $5&255;
 $7 = (($6) - 1)|0;
 $8 = ($4|0)<($7|0);
 if ($8) {
  $9 = HEAP8[10400>>0]|0;
  $10 = (($9) + 1)<<24>>24;
  HEAP8[10400>>0] = $10;
 }
 _set_gmaj_program();
 return;
}
function _song_prev() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[10400>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)!=(0);
 if (!($2)) {
  _set_gmaj_program();
  return;
 }
 $3 = HEAP8[10400>>0]|0;
 $4 = (($3) + -1)<<24>>24;
 HEAP8[10400>>0] = $4;
 _set_gmaj_program();
 return;
}
function _handle_mode_LIVE() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0;
 var $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0;
 var $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0;
 var $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0;
 var $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $or$cond = 0, $or$cond3 = 0, $or$cond5 = 0, $or$cond7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_is_top_button_pressed(1)|0);
 $1 = ($0<<24>>24)!=(0);
 if ($1) {
  _gmaj_toggle_cc(0);
  HEAP8[10432>>0] = 1;
 } else {
  $2 = (_is_top_button_released(1)|0);
  $3 = $2&255;
  $4 = ($3|0)!=(0);
  if ($4) {
   $5 = HEAP8[10432>>0]|0;
   $6 = $5&255;
   $7 = ($6|0)>=(31);
   if ($7) {
    HEAP8[10432>>0] = 0;
    _gmaj_toggle_cc(0);
   }
  }
 }
 $8 = (_is_top_button_pressed(2)|0);
 $9 = ($8<<24>>24)!=(0);
 if ($9) {
  _gmaj_toggle_cc(1);
  HEAP8[10432>>0] = 1;
 } else {
  $10 = (_is_top_button_released(2)|0);
  $11 = $10&255;
  $12 = ($11|0)!=(0);
  if ($12) {
   $13 = HEAP8[10432>>0]|0;
   $14 = $13&255;
   $15 = ($14|0)>=(31);
   if ($15) {
    HEAP8[10432>>0] = 0;
    _gmaj_toggle_cc(1);
   }
  }
 }
 $16 = (_is_top_button_pressed(4)|0);
 $17 = ($16<<24>>24)!=(0);
 if ($17) {
  _gmaj_toggle_cc(2);
  HEAP8[10432>>0] = 1;
 } else {
  $18 = (_is_top_button_released(4)|0);
  $19 = $18&255;
  $20 = ($19|0)!=(0);
  if ($20) {
   $21 = HEAP8[10432>>0]|0;
   $22 = $21&255;
   $23 = ($22|0)>=(31);
   if ($23) {
    HEAP8[10432>>0] = 0;
    _gmaj_toggle_cc(2);
   }
  }
 }
 $24 = (_is_top_button_pressed(8)|0);
 $25 = ($24<<24>>24)!=(0);
 if ($25) {
  _gmaj_toggle_cc(3);
  HEAP8[10432>>0] = 1;
 } else {
  $26 = (_is_top_button_released(8)|0);
  $27 = $26&255;
  $28 = ($27|0)!=(0);
  if ($28) {
   $29 = HEAP8[10432>>0]|0;
   $30 = $29&255;
   $31 = ($30|0)>=(31);
   if ($31) {
    HEAP8[10432>>0] = 0;
    _gmaj_toggle_cc(3);
   }
  }
 }
 $32 = (_is_top_button_pressed(16)|0);
 $33 = ($32<<24>>24)!=(0);
 if ($33) {
  _gmaj_toggle_cc(4);
  HEAP8[10432>>0] = 1;
 } else {
  $34 = (_is_top_button_released(16)|0);
  $35 = $34&255;
  $36 = ($35|0)!=(0);
  if ($36) {
   $37 = HEAP8[10432>>0]|0;
   $38 = $37&255;
   $39 = ($38|0)>=(31);
   if ($39) {
    HEAP8[10432>>0] = 0;
    _gmaj_toggle_cc(4);
   }
  }
 }
 $40 = (_is_top_button_pressed(32)|0);
 $41 = ($40<<24>>24)!=(0);
 if ($41) {
  _gmaj_toggle_cc(5);
  HEAP8[10432>>0] = 1;
 } else {
  $42 = (_is_top_button_released(32)|0);
  $43 = $42&255;
  $44 = ($43|0)!=(0);
  if ($44) {
   $45 = HEAP8[10432>>0]|0;
   $46 = $45&255;
   $47 = ($46|0)>=(31);
   if ($47) {
    HEAP8[10432>>0] = 0;
    _gmaj_toggle_cc(5);
   }
  }
 }
 $48 = (_is_bot_button_pressed(1)|0);
 $49 = ($48<<24>>24)!=(0);
 if ($49) {
  _set_rjm_channel(0);
  _reset_tuner_mute();
  HEAP8[10544>>0] = 1;
 } else {
  $50 = (_is_bot_button_held(1)|0);
  $51 = $50&255;
  $52 = ($51|0)!=(0);
  if ($52) {
   $53 = HEAP8[10544>>0]|0;
   $54 = $53&255;
   $55 = ($54|0)>=(76);
   if ($55) {
    _switch_mode(2);
    HEAP8[10544>>0] = 0;
   }
  }
 }
 $56 = (_is_bot_button_pressed(2)|0);
 $57 = ($56<<24>>24)!=(0);
 if ($57) {
  _set_rjm_channel(1);
  _reset_tuner_mute();
  HEAP8[10544>>0] = 1;
 } else {
  $58 = (_is_bot_button_held(2)|0);
  $59 = $58&255;
  $60 = ($59|0)!=(0);
  if ($60) {
   $61 = HEAP8[10544>>0]|0;
   $62 = $61&255;
   $63 = ($62|0)>=(76);
   if ($63) {
    _switch_mode(2);
    HEAP8[10544>>0] = 0;
   }
  }
 }
 $64 = (_is_bot_button_pressed(4)|0);
 $65 = ($64<<24>>24)!=(0);
 if ($65) {
  _set_rjm_channel(2);
  _reset_tuner_mute();
  HEAP8[10544>>0] = 1;
 } else {
  $66 = (_is_bot_button_held(4)|0);
  $67 = $66&255;
  $68 = ($67|0)!=(0);
  if ($68) {
   $69 = HEAP8[10544>>0]|0;
   $70 = $69&255;
   $71 = ($70|0)>=(76);
   if ($71) {
    _switch_mode(2);
    HEAP8[10544>>0] = 0;
   }
  }
 }
 $72 = (_is_bot_button_pressed(8)|0);
 $73 = ($72<<24>>24)!=(0);
 if ($73) {
  _set_rjm_channel(3);
  _reset_tuner_mute();
  HEAP8[10544>>0] = 1;
 } else {
  $74 = (_is_bot_button_held(8)|0);
  $75 = $74&255;
  $76 = ($75|0)!=(0);
  if ($76) {
   $77 = HEAP8[10544>>0]|0;
   $78 = $77&255;
   $79 = ($78|0)>=(76);
   if ($79) {
    _switch_mode(2);
    HEAP8[10544>>0] = 0;
   }
  }
 }
 $80 = (_is_bot_button_pressed(16)|0);
 $81 = ($80<<24>>24)!=(0);
 if ($81) {
  _set_rjm_channel(4);
  _reset_tuner_mute();
  HEAP8[10544>>0] = 1;
 } else {
  $82 = (_is_bot_button_held(16)|0);
  $83 = $82&255;
  $84 = ($83|0)!=(0);
  if ($84) {
   $85 = HEAP8[10544>>0]|0;
   $86 = $85&255;
   $87 = ($86|0)>=(76);
   if ($87) {
    _switch_mode(2);
    HEAP8[10544>>0] = 0;
   }
  }
 }
 $88 = (_is_bot_button_pressed(32)|0);
 $89 = ($88<<24>>24)!=(0);
 if ($89) {
  _set_rjm_channel(5);
  _reset_tuner_mute();
  HEAP8[10544>>0] = 1;
 } else {
  $90 = (_is_bot_button_held(32)|0);
  $91 = $90&255;
  $92 = ($91|0)!=(0);
  if ($92) {
   $93 = HEAP8[10544>>0]|0;
   $94 = $93&255;
   $95 = ($94|0)>=(76);
   if ($95) {
    _switch_mode(2);
    HEAP8[10544>>0] = 0;
   }
  }
 }
 $96 = (_is_bot_button_pressed(64)|0);
 $97 = ($96<<24>>24)!=(0);
 do {
  if ($97) {
   HEAP8[10448>>0] = 1;
  } else {
   $98 = (_is_bot_button_held(64)|0);
   $99 = $98&255;
   $100 = ($99|0)!=(0);
   if ($100) {
    $101 = HEAP8[10448>>0]|0;
    $102 = $101&255;
    $103 = ($102|0)>=(76);
    if ($103) {
     _enable_mute();
     HEAP8[10448>>0] = 0;
     break;
    }
   }
   $104 = (_is_bot_button_released(64)|0);
   $105 = ($104<<24>>24)!=(0);
   if ($105) {
    HEAP8[10448>>0] = 0;
   }
  }
 } while(0);
 $106 = (_is_bot_button_pressed(64)|0);
 $107 = ($106<<24>>24)!=(0);
 if ($107) {
  $108 = HEAP8[10504>>0]|0;
  $109 = $108&255;
  $110 = $109 ^ -1;
  $111 = $110 & 127;
  $112 = $111&255;
  HEAP8[10504>>0] = $112;
  $113 = HEAP8[10504>>0]|0;
  _gmaj_cc_set(80,$113);
 }
 $114 = (_is_bot_button_pressed(-128)|0);
 $115 = ($114<<24>>24)!=(0);
 do {
  if ($115) {
   $116 = HEAP8[10256>>0]|0;
   $117 = $116&255;
   $118 = HEAP8[10512>>0]|0;
   $119 = $118&255;
   $120 = ($117|0)!=($119|0);
   if ($120) {
    $121 = HEAP8[10512>>0]|0;
    HEAP8[10256>>0] = $121;
    $122 = HEAP8[10384>>0]|0;
    HEAP8[10400>>0] = $122;
    _set_gmaj_program_only();
    $123 = HEAP8[10616>>0]|0;
    HEAP8[10296>>0] = $123;
    _update_lcd();
   } else {
    _reset_tuner_mute();
   }
   HEAP8[10456>>0] = 1;
  } else {
   $124 = (_is_bot_button_held(-128)|0);
   $125 = $124&255;
   $126 = ($125|0)!=(0);
   if ($126) {
    $127 = HEAP8[10456>>0]|0;
    $128 = $127&255;
    $129 = ($128|0)>=(76);
    if ($129) {
     HEAP8[10456>>0] = 0;
     _switch_mode(1);
     break;
    }
   }
   $130 = (_is_bot_button_released(-128)|0);
   $131 = ($130<<24>>24)!=(0);
   if ($131) {
    HEAP8[10456>>0] = 0;
   }
  }
 } while(0);
 $132 = HEAP8[10320>>0]|0;
 $133 = $132&255;
 $134 = ($133|0)==(0);
 $135 = (_is_top_button_pressed(-128)|0);
 $136 = ($135<<24>>24)!=(0);
 if ($134) {
  do {
   if ($136) {
    HEAP8[10472>>0] = 1;
    _prog_next();
   } else {
    $137 = (_is_top_button_released(-128)|0);
    $138 = ($137<<24>>24)!=(0);
    if ($138) {
     HEAP8[10472>>0] = 0;
     break;
    }
    $139 = (_is_top_button_held(-128)|0);
    $140 = ($139<<24>>24)!=(0);
    $141 = HEAP8[10480>>0]|0;
    $142 = ($141<<24>>24)!=(0);
    $or$cond = $140 & $142;
    if (!($or$cond)) {
     break;
    }
    HEAP8[10480>>0] = 0;
    _prog_next();
   }
  } while(0);
  $143 = (_is_top_button_pressed(64)|0);
  $144 = ($143<<24>>24)!=(0);
  if ($144) {
   HEAP8[10472>>0] = 1;
   _prog_prev();
   return;
  }
  $145 = (_is_top_button_released(64)|0);
  $146 = ($145<<24>>24)!=(0);
  if ($146) {
   HEAP8[10472>>0] = 0;
   return;
  }
  $147 = (_is_top_button_held(64)|0);
  $148 = ($147<<24>>24)!=(0);
  $149 = HEAP8[10480>>0]|0;
  $150 = ($149<<24>>24)!=(0);
  $or$cond3 = $148 & $150;
  if (!($or$cond3)) {
   return;
  }
  HEAP8[10480>>0] = 0;
  _prog_prev();
  return;
 } else {
  do {
   if ($136) {
    HEAP8[10472>>0] = 1;
    _song_next();
   } else {
    $151 = (_is_top_button_released(-128)|0);
    $152 = ($151<<24>>24)!=(0);
    if ($152) {
     HEAP8[10472>>0] = 0;
     break;
    }
    $153 = (_is_top_button_held(-128)|0);
    $154 = ($153<<24>>24)!=(0);
    $155 = HEAP8[10480>>0]|0;
    $156 = ($155<<24>>24)!=(0);
    $or$cond5 = $154 & $156;
    if (!($or$cond5)) {
     break;
    }
    HEAP8[10480>>0] = 0;
    _song_next();
   }
  } while(0);
  $157 = (_is_top_button_pressed(64)|0);
  $158 = ($157<<24>>24)!=(0);
  if ($158) {
   HEAP8[10472>>0] = 1;
   _song_prev();
   return;
  }
  $159 = (_is_top_button_released(64)|0);
  $160 = ($159<<24>>24)!=(0);
  if ($160) {
   HEAP8[10472>>0] = 0;
   return;
  }
  $161 = (_is_top_button_held(64)|0);
  $162 = ($161<<24>>24)!=(0);
  $163 = HEAP8[10480>>0]|0;
  $164 = ($163<<24>>24)!=(0);
  $or$cond7 = $162 & $164;
  if (!($or$cond7)) {
   return;
  }
  HEAP8[10480>>0] = 0;
  _song_prev();
  return;
 }
}
function _handle_mode_PROGRAMMING() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_is_bot_button_pressed(-128)|0);
 $1 = ($0<<24>>24)!=(0);
 if ($1) {
  _switch_mode(0);
 }
 $2 = (_is_bot_button_pressed(1)|0);
 $3 = ($2<<24>>24)!=(0);
 if ($3) {
  _set_rjm_channel(0);
  _reset_tuner_mute();
 }
 $4 = (_is_bot_button_pressed(2)|0);
 $5 = ($4<<24>>24)!=(0);
 if ($5) {
  _set_rjm_channel(1);
  _reset_tuner_mute();
 }
 $6 = (_is_bot_button_pressed(4)|0);
 $7 = ($6<<24>>24)!=(0);
 if ($7) {
  _set_rjm_channel(2);
  _reset_tuner_mute();
 }
 $8 = (_is_bot_button_pressed(8)|0);
 $9 = ($8<<24>>24)!=(0);
 if ($9) {
  _set_rjm_channel(3);
  _reset_tuner_mute();
 }
 $10 = (_is_bot_button_pressed(16)|0);
 $11 = ($10<<24>>24)!=(0);
 if ($11) {
  _set_rjm_channel(4);
  _reset_tuner_mute();
 }
 $12 = (_is_bot_button_pressed(32)|0);
 $13 = ($12<<24>>24)!=(0);
 if ($13) {
  _set_rjm_channel(5);
  _reset_tuner_mute();
 }
 $14 = (_is_top_button_pressed(1)|0);
 $15 = ($14<<24>>24)!=(0);
 if ($15) {
  $16 = HEAP8[10320>>0]|0;
  $17 = $16&255;
  $18 = $17 ^ 1;
  $19 = $18&255;
  _switch_setlist_mode($19);
 }
 $20 = (_is_top_button_pressed(2)|0);
 $21 = ($20<<24>>24)!=(0);
 if ($21) {
  _switch_mode(2);
 }
 (_is_top_button_pressed(4)|0);
 (_is_top_button_pressed(8)|0);
 $22 = (_is_top_button_pressed(16)|0);
 $23 = ($22<<24>>24)!=(0);
 if ($23) {
  $24 = HEAP8[10320>>0]|0;
  $25 = $24&255;
  $26 = ($25|0)==(1);
  if ($26) {
   _cut_setlist_entry();
   _set_gmaj_program();
  }
 }
 $27 = (_is_top_button_pressed(32)|0);
 $28 = ($27<<24>>24)!=(0);
 if ($28) {
  $29 = HEAP8[10320>>0]|0;
  $30 = $29&255;
  $31 = ($30|0)==(1);
  if ($31) {
   $32 = HEAP8[10400>>0]|0;
   HEAP8[10624>>0] = $32;
   _switch_mode(3);
   _update_lcd();
  }
 }
 $33 = (_is_bot_button_pressed(64)|0);
 $34 = ($33<<24>>24)!=(0);
 do {
  if ($34) {
   HEAP8[10424>>0] = 1;
  } else {
   $35 = (_is_bot_button_held(64)|0);
   $36 = $35&255;
   $37 = ($36|0)!=(0);
   if ($37) {
    $38 = HEAP8[10424>>0]|0;
    $39 = $38&255;
    $40 = ($39|0)>=(76);
    if ($40) {
     _store_program_state();
     HEAP8[10488>>0] = 80;
     HEAP8[10424>>0] = 0;
     break;
    }
   }
   $41 = (_is_bot_button_released(64)|0);
   $42 = ($41<<24>>24)!=(0);
   if ($42) {
    HEAP8[10424>>0] = 0;
   }
  }
 } while(0);
 $43 = HEAP8[10320>>0]|0;
 $44 = $43&255;
 $45 = ($44|0)==(0);
 $46 = (_is_top_button_pressed(-128)|0);
 $47 = ($46<<24>>24)!=(0);
 if (!($45)) {
  if ($47) {
   $62 = HEAP8[10392>>0]|0;
   $63 = $62&255;
   $64 = ($63|0)<(31);
   if ($64) {
    $65 = HEAP8[10392>>0]|0;
    $66 = (($65) + 1)<<24>>24;
    HEAP8[10392>>0] = $66;
    $67 = HEAP8[10320>>0]|0;
    _switch_setlist_mode($67);
   }
  }
  $68 = (_is_top_button_pressed(64)|0);
  $69 = ($68<<24>>24)!=(0);
  if (!($69)) {
   return;
  }
  $70 = HEAP8[10392>>0]|0;
  $71 = $70&255;
  $72 = ($71|0)>(0);
  if (!($72)) {
   return;
  }
  $73 = HEAP8[10392>>0]|0;
  $74 = (($73) + -1)<<24>>24;
  HEAP8[10392>>0] = $74;
  $75 = HEAP8[10320>>0]|0;
  _switch_setlist_mode($75);
  return;
 }
 do {
  if ($47) {
   HEAP8[10472>>0] = 1;
   _prog_next();
  } else {
   $48 = (_is_top_button_released(-128)|0);
   $49 = ($48<<24>>24)!=(0);
   if ($49) {
    HEAP8[10472>>0] = 0;
    break;
   }
   $50 = (_is_top_button_held(-128)|0);
   $51 = ($50<<24>>24)!=(0);
   $52 = HEAP8[10480>>0]|0;
   $53 = ($52<<24>>24)!=(0);
   $or$cond = $51 & $53;
   if ($or$cond) {
    HEAP8[10480>>0] = 0;
    _prog_next();
   }
  }
 } while(0);
 $54 = (_is_top_button_pressed(64)|0);
 $55 = ($54<<24>>24)!=(0);
 if ($55) {
  HEAP8[10472>>0] = 1;
  _prog_prev();
  return;
 }
 $56 = (_is_top_button_released(64)|0);
 $57 = ($56<<24>>24)!=(0);
 if ($57) {
  HEAP8[10472>>0] = 0;
  return;
 }
 $58 = (_is_top_button_held(64)|0);
 $59 = ($58<<24>>24)!=(0);
 $60 = HEAP8[10480>>0]|0;
 $61 = ($60<<24>>24)!=(0);
 $or$cond3 = $59 & $61;
 if (!($or$cond3)) {
  return;
 }
 HEAP8[10480>>0] = 0;
 _prog_prev();
 return;
}
function _handle_mode_SCENE_DESIGN() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_is_bot_button_pressed(-128)|0);
 $1 = ($0<<24>>24)!=(0);
 if ($1) {
  $2 = HEAP8[10336>>0]|0;
  _switch_mode($2);
 }
 $3 = (_is_bot_button_pressed(1)|0);
 $4 = ($3<<24>>24)!=(0);
 if ($4) {
  HEAP8[10296>>0] = 0;
  _scene_activate();
 }
 $5 = (_is_bot_button_pressed(2)|0);
 $6 = ($5<<24>>24)!=(0);
 if ($6) {
  HEAP8[10296>>0] = 1;
  _scene_activate();
 }
 $7 = (_is_bot_button_pressed(4)|0);
 $8 = ($7<<24>>24)!=(0);
 if ($8) {
  HEAP8[10296>>0] = 2;
  _scene_activate();
 }
 $9 = (_is_bot_button_pressed(8)|0);
 $10 = ($9<<24>>24)!=(0);
 if ($10) {
  HEAP8[10296>>0] = 3;
  _scene_activate();
 }
 $11 = (_is_bot_button_pressed(16)|0);
 $12 = ($11<<24>>24)!=(0);
 if ($12) {
  HEAP8[10296>>0] = 4;
  _scene_activate();
 }
 $13 = (_is_bot_button_pressed(32)|0);
 $14 = ($13<<24>>24)!=(0);
 if ($14) {
  HEAP8[10296>>0] = 5;
  _scene_activate();
 }
 $15 = (_is_top_button_pressed(1)|0);
 $16 = ($15<<24>>24)!=(0);
 if ($16) {
  $17 = HEAP8[10296>>0]|0;
  _scene_update($17,0,0);
 }
 $18 = (_is_top_button_pressed(2)|0);
 $19 = ($18<<24>>24)!=(0);
 if ($19) {
  $20 = HEAP8[10296>>0]|0;
  _scene_update($20,0,5);
 }
 $21 = (_is_top_button_pressed(4)|0);
 $22 = ($21<<24>>24)!=(0);
 if ($22) {
  $23 = HEAP8[10296>>0]|0;
  _scene_update($23,1,0);
 }
 $24 = (_is_top_button_pressed(8)|0);
 $25 = ($24<<24>>24)!=(0);
 if ($25) {
  $26 = HEAP8[10296>>0]|0;
  _scene_update($26,1,5);
 }
 $27 = (_is_top_button_pressed(16)|0);
 $28 = ($27<<24>>24)!=(0);
 if ($28) {
  $29 = HEAP8[10296>>0]|0;
  _scene_update($29,2,0);
 }
 $30 = (_is_top_button_pressed(32)|0);
 $31 = ($30<<24>>24)!=(0);
 if ($31) {
  $32 = HEAP8[10296>>0]|0;
  _scene_update($32,2,5);
 }
 $33 = (_is_bot_button_pressed(64)|0);
 $34 = ($33<<24>>24)!=(0);
 do {
  if ($34) {
   HEAP8[10424>>0] = 1;
  } else {
   $35 = (_is_bot_button_held(64)|0);
   $36 = $35&255;
   $37 = ($36|0)!=(0);
   if ($37) {
    $38 = HEAP8[10424>>0]|0;
    $39 = $38&255;
    $40 = ($39|0)>=(76);
    if ($40) {
     _store_program_state();
     HEAP8[10488>>0] = 80;
     HEAP8[10424>>0] = 0;
     break;
    }
   }
   $41 = (_is_bot_button_released(64)|0);
   $42 = ($41<<24>>24)!=(0);
   if ($42) {
    HEAP8[10424>>0] = 0;
   }
  }
 } while(0);
 $43 = (_is_top_button_pressed(-128)|0);
 $44 = ($43<<24>>24)!=(0);
 if ($44) {
  $45 = HEAP8[10296>>0]|0;
  $46 = HEAP8[10296>>0]|0;
  $47 = $46&255;
  $48 = (10304 + ($47)|0);
  $49 = HEAP8[$48>>0]|0;
  $50 = HEAP8[10296>>0]|0;
  $51 = $50&255;
  $52 = (10312 + ($51)|0);
  $53 = HEAP8[$52>>0]|0;
  $54 = $53 << 24 >> 24;
  $55 = (($54) + 1)|0;
  $56 = $55&255;
  _scene_update($45,$49,$56);
 }
 $57 = (_is_top_button_pressed(64)|0);
 $58 = ($57<<24>>24)!=(0);
 if (!($58)) {
  return;
 }
 $59 = HEAP8[10296>>0]|0;
 $60 = HEAP8[10296>>0]|0;
 $61 = $60&255;
 $62 = (10304 + ($61)|0);
 $63 = HEAP8[$62>>0]|0;
 $64 = HEAP8[10296>>0]|0;
 $65 = $64&255;
 $66 = (10312 + ($65)|0);
 $67 = HEAP8[$66>>0]|0;
 $68 = $67 << 24 >> 24;
 $69 = (($68) - 1)|0;
 $70 = $69&255;
 _scene_update($59,$63,$70);
 return;
}
function _handle_mode_SETLIST_REORDER() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond3 = 0, $tmp = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (_is_bot_button_pressed(-128)|0);
 $1 = ($0<<24>>24)!=(0);
 if ($1) {
  _switch_mode(1);
 }
 $2 = (_is_top_button_pressed(-128)|0);
 $3 = ($2<<24>>24)!=(0);
 do {
  if ($3) {
   HEAP8[10472>>0] = 1;
   _song_next();
  } else {
   $4 = (_is_top_button_released(-128)|0);
   $5 = ($4<<24>>24)!=(0);
   if ($5) {
    HEAP8[10472>>0] = 0;
    break;
   }
   $6 = (_is_top_button_held(-128)|0);
   $7 = ($6<<24>>24)!=(0);
   $8 = HEAP8[10480>>0]|0;
   $9 = ($8<<24>>24)!=(0);
   $or$cond = $7 & $9;
   if ($or$cond) {
    HEAP8[10480>>0] = 0;
    _song_next();
   }
  }
 } while(0);
 $10 = (_is_top_button_pressed(64)|0);
 $11 = ($10<<24>>24)!=(0);
 do {
  if ($11) {
   HEAP8[10472>>0] = 1;
   _song_prev();
  } else {
   $12 = (_is_top_button_released(64)|0);
   $13 = ($12<<24>>24)!=(0);
   if ($13) {
    HEAP8[10472>>0] = 0;
    break;
   }
   $14 = (_is_top_button_held(64)|0);
   $15 = ($14<<24>>24)!=(0);
   $16 = HEAP8[10480>>0]|0;
   $17 = ($16<<24>>24)!=(0);
   $or$cond3 = $15 & $17;
   if ($or$cond3) {
    HEAP8[10480>>0] = 0;
    _song_prev();
   }
  }
 } while(0);
 $18 = (_is_bot_button_pressed(64)|0);
 $19 = ($18<<24>>24)!=(0);
 if (!($19)) {
  STACKTOP = sp;return;
 }
 $20 = HEAP8[10400>>0]|0;
 $21 = $20&255;
 $22 = ((10555) + ($21)|0);
 $23 = HEAP8[$22>>0]|0;
 $tmp = $23;
 $24 = HEAP8[10624>>0]|0;
 $25 = $24&255;
 $26 = ((10555) + ($25)|0);
 $27 = HEAP8[$26>>0]|0;
 $28 = HEAP8[10400>>0]|0;
 $29 = $28&255;
 $30 = ((10555) + ($29)|0);
 HEAP8[$30>>0] = $27;
 $31 = $tmp;
 $32 = HEAP8[10624>>0]|0;
 $33 = $32&255;
 $34 = ((10555) + ($33)|0);
 HEAP8[$34>>0] = $31;
 $35 = HEAP8[10624>>0]|0;
 HEAP8[10400>>0] = $35;
 _switch_mode(1);
 STACKTOP = sp;return;
}
function _controller_handle() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $tmp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (_fsw_poll()|0);
 $tmp = $0;
 $1 = $tmp;
 $2 = $1&65535;
 $3 = $2 & 255;
 $4 = $3&255;
 HEAP8[10632>>0] = $4;
 $5 = $tmp;
 $6 = $5&65535;
 $7 = $6 >> 8;
 $8 = $7 & 255;
 $9 = $8&255;
 HEAP8[(10636)>>0] = $9;
 $10 = HEAP8[10328>>0]|0;
 $11 = $10&255;
 $12 = ($11|0)==(0);
 do {
  if ($12) {
   _handle_mode_LIVE();
  } else {
   $13 = HEAP8[10328>>0]|0;
   $14 = $13&255;
   $15 = ($14|0)==(1);
   if ($15) {
    _handle_mode_PROGRAMMING();
    break;
   }
   $16 = HEAP8[10328>>0]|0;
   $17 = $16&255;
   $18 = ($17|0)==(2);
   if ($18) {
    _handle_mode_SCENE_DESIGN();
    break;
   }
   $19 = HEAP8[10328>>0]|0;
   $20 = $19&255;
   $21 = ($20|0)==(3);
   if ($21) {
    _handle_mode_SETLIST_REORDER();
   }
  }
 } while(0);
 _calc_leds();
 ;HEAP32[10640>>2]=HEAP32[10632>>2]|0;HEAP32[10640+4>>2]=HEAP32[10632+4>>2]|0;
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
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $3 = 0, $30 = 0;
 var $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0;
 var $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0;
 var $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0;
 var $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $b = 0, $ch = 0, $dd = 0, $fx = 0, $i = 0;
 var $mm = 0, $out_level = 0, $pos_level = 0, $yyyy = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $b = 1;
 $0 = HEAP8[10296>>0]|0;
 $1 = $0&255;
 $2 = ((10290) + ($1)|0);
 $3 = HEAP8[$2>>0]|0;
 $4 = $3&255;
 $5 = $4 & -193;
 $6 = $5&255;
 $fx = $6;
 $7 = HEAP8[10328>>0]|0;
 $8 = $7&255;
 $9 = ($8|0)==(0);
 L1: do {
  if ($9) {
   $i = 0;
   while(1) {
    $10 = $i;
    $11 = $10 << 24 >> 24;
    $12 = ($11|0)<(20);
    if (!($12)) {
     break;
    }
    $13 = $i;
    $14 = $13 << 24 >> 24;
    $15 = (10792 + ($14)|0);
    $16 = HEAP8[$15>>0]|0;
    $17 = $i;
    $18 = $17 << 24 >> 24;
    $19 = HEAP32[(10540)>>2]|0;
    $20 = (($19) + ($18)|0);
    HEAP8[$20>>0] = $16;
    $21 = $i;
    $22 = (($21) + 1)<<24>>24;
    $i = $22;
   }
   $i = 0;
   while(1) {
    $23 = $i;
    $24 = $23 << 24 >> 24;
    $25 = ($24|0)<(6);
    if (!($25)) {
     break L1;
    }
    $26 = $fx;
    $27 = $26&255;
    $28 = $b;
    $29 = $28&255;
    $30 = $27 & $29;
    $31 = $b;
    $32 = $31&255;
    $33 = ($30|0)==($32|0);
    if ($33) {
     $34 = $i;
     $35 = $34 << 24 >> 24;
     $36 = ($35*3)|0;
     $37 = (($36) + 1)|0;
     $38 = HEAP32[(10540)>>2]|0;
     $39 = (($38) + ($37)|0);
     $40 = HEAP8[$39>>0]|0;
     $41 = $40&255;
     $42 = $41 & -33;
     $43 = $42&255;
     HEAP8[$39>>0] = $43;
     $44 = $i;
     $45 = $44 << 24 >> 24;
     $46 = ($45*3)|0;
     $47 = (($46) + 2)|0;
     $48 = HEAP32[(10540)>>2]|0;
     $49 = (($48) + ($47)|0);
     $50 = HEAP8[$49>>0]|0;
     $51 = $50&255;
     $52 = $51 & -33;
     $53 = $52&255;
     HEAP8[$49>>0] = $53;
    }
    $54 = $i;
    $55 = (($54) + 1)<<24>>24;
    $i = $55;
    $56 = $b;
    $57 = $56&255;
    $58 = $57 << 1;
    $59 = $58&255;
    $b = $59;
   }
  } else {
   $60 = HEAP8[10328>>0]|0;
   $61 = $60&255;
   $62 = ($61|0)==(1);
   if ($62) {
    $i = 0;
    while(1) {
     $63 = $i;
     $64 = $63 << 24 >> 24;
     $65 = ($64|0)<(20);
     if (!($65)) {
      break L1;
     }
     $66 = $i;
     $67 = $66 << 24 >> 24;
     $68 = (10816 + ($67)|0);
     $69 = HEAP8[$68>>0]|0;
     $70 = $i;
     $71 = $70 << 24 >> 24;
     $72 = HEAP32[(10540)>>2]|0;
     $73 = (($72) + ($71)|0);
     HEAP8[$73>>0] = $69;
     $74 = $i;
     $75 = (($74) + 1)<<24>>24;
     $i = $75;
    }
   }
   $76 = HEAP8[10328>>0]|0;
   $77 = $76&255;
   $78 = ($77|0)==(2);
   if ($78) {
    $i = 0;
    while(1) {
     $79 = $i;
     $80 = $79 << 24 >> 24;
     $81 = ($80|0)<(20);
     if (!($81)) {
      break L1;
     }
     $82 = $i;
     $83 = $82 << 24 >> 24;
     $84 = (10840 + ($83)|0);
     $85 = HEAP8[$84>>0]|0;
     $86 = $i;
     $87 = $86 << 24 >> 24;
     $88 = HEAP32[(10540)>>2]|0;
     $89 = (($88) + ($87)|0);
     HEAP8[$89>>0] = $85;
     $90 = $i;
     $91 = (($90) + 1)<<24>>24;
     $i = $91;
    }
   }
   $92 = HEAP8[10328>>0]|0;
   $93 = $92&255;
   $94 = ($93|0)==(3);
   if ($94) {
    $i = 0;
    while(1) {
     $95 = $i;
     $96 = $95 << 24 >> 24;
     $97 = ($96|0)<(20);
     if (!($97)) {
      break L1;
     }
     $98 = $i;
     $99 = $98 << 24 >> 24;
     $100 = (10864 + ($99)|0);
     $101 = HEAP8[$100>>0]|0;
     $102 = $i;
     $103 = $102 << 24 >> 24;
     $104 = HEAP32[(10540)>>2]|0;
     $105 = (($104) + ($103)|0);
     HEAP8[$105>>0] = $101;
     $106 = $i;
     $107 = (($106) + 1)<<24>>24;
     $i = $107;
    }
   }
  }
 } while(0);
 $108 = HEAP8[10320>>0]|0;
 $109 = $108&255;
 $110 = ($109|0)==(0);
 if ($110) {
  $i = 0;
  while(1) {
   $111 = $i;
   $112 = $111 << 24 >> 24;
   $113 = ($112|0)<(20);
   if (!($113)) {
    break;
   }
   $114 = $i;
   $115 = $114 << 24 >> 24;
   $116 = (10888 + ($115)|0);
   $117 = HEAP8[$116>>0]|0;
   $118 = $i;
   $119 = $118 << 24 >> 24;
   $120 = HEAP32[(10532)>>2]|0;
   $121 = (($120) + ($119)|0);
   HEAP8[$121>>0] = $117;
   $122 = $i;
   $123 = (($122) + 1)<<24>>24;
   $i = $123;
  }
  $124 = HEAP32[(10532)>>2]|0;
  $125 = HEAP8[10256>>0]|0;
  $126 = $125&255;
  $127 = (($126) + 1)|0;
  $128 = $127&255;
  (_ritoa($124,$128,19)|0);
 } else {
  $129 = HEAP8[(10554)>>0]|0;
  $130 = $129&255;
  $131 = $130 >> 1;
  $132 = $131&255;
  $yyyy = $132;
  $133 = HEAP8[(10554)>>0]|0;
  $134 = $133&255;
  $135 = $134 & 1;
  $136 = $135 << 3;
  $137 = HEAP8[(10553)>>0]|0;
  $138 = $137&255;
  $139 = $138 >> 5;
  $140 = $136 | $139;
  $141 = $140&255;
  $mm = $141;
  $142 = HEAP8[(10553)>>0]|0;
  $143 = $142&255;
  $144 = $143 & 31;
  $145 = $144&255;
  $dd = $145;
  $i = 0;
  while(1) {
   $146 = $i;
   $147 = $146 << 24 >> 24;
   $148 = ($147|0)<(20);
   if (!($148)) {
    break;
   }
   $149 = $i;
   $150 = $149 << 24 >> 24;
   $151 = (10912 + ($150)|0);
   $152 = HEAP8[$151>>0]|0;
   $153 = $i;
   $154 = $153 << 24 >> 24;
   $155 = HEAP32[(10532)>>2]|0;
   $156 = (($155) + ($154)|0);
   HEAP8[$156>>0] = $152;
   $157 = $i;
   $158 = (($157) + 1)<<24>>24;
   $i = $158;
  }
  $159 = HEAP32[(10532)>>2]|0;
  $160 = $yyyy;
  $161 = $160&255;
  $162 = (($161) + 14)|0;
  $163 = $162&255;
  (_ritoa($159,$163,3)|0);
  $164 = HEAP32[(10532)>>2]|0;
  $165 = $mm;
  $166 = $165&255;
  $167 = (($166) + 1)|0;
  $168 = $167&255;
  (_ritoa($164,$168,6)|0);
  $169 = HEAP32[(10532)>>2]|0;
  $170 = $dd;
  $171 = $170&255;
  $172 = (($171) + 1)|0;
  $173 = $172&255;
  (_ritoa($169,$173,9)|0);
  $174 = HEAP32[(10532)>>2]|0;
  $175 = HEAP8[10400>>0]|0;
  $176 = $175&255;
  $177 = (($176) + 1)|0;
  $178 = $177&255;
  (_ritoa($174,$178,19)|0);
 }
 $i = 0;
 while(1) {
  $179 = $i;
  $180 = $179 << 24 >> 24;
  $181 = ($180|0)<(20);
  if (!($181)) {
   break;
  }
  $182 = $i;
  $183 = $182 << 24 >> 24;
  $184 = HEAP32[10528>>2]|0;
  $185 = (($184) + ($183)|0);
  HEAP8[$185>>0] = 32;
  $186 = $i;
  $187 = $186 << 24 >> 24;
  $188 = (10264 + ($187)|0);
  $189 = HEAP8[$188>>0]|0;
  $190 = $i;
  $191 = $190 << 24 >> 24;
  $192 = HEAP32[(10536)>>2]|0;
  $193 = (($192) + ($191)|0);
  HEAP8[$193>>0] = $189;
  $194 = $i;
  $195 = $194 << 24 >> 24;
  $196 = (10264 + ($195)|0);
  $197 = HEAP8[$196>>0]|0;
  $198 = $197&255;
  $199 = ($198|0)==(0);
  if ($199) {
   break;
  }
  $200 = $i;
  $201 = (($200) + 1)<<24>>24;
  $i = $201;
 }
 while(1) {
  $202 = $i;
  $203 = $202 << 24 >> 24;
  $204 = ($203|0)<(20);
  if (!($204)) {
   break;
  }
  $205 = $i;
  $206 = $205 << 24 >> 24;
  $207 = HEAP32[10528>>2]|0;
  $208 = (($207) + ($206)|0);
  HEAP8[$208>>0] = 32;
  $209 = $i;
  $210 = $209 << 24 >> 24;
  $211 = HEAP32[(10536)>>2]|0;
  $212 = (($211) + ($210)|0);
  HEAP8[$212>>0] = 32;
  $213 = $i;
  $214 = (($213) + 1)<<24>>24;
  $i = $214;
 }
 $215 = HEAP8[10496>>0]|0;
 $216 = ($215<<24>>24)!=(0);
 L51: do {
  if ($216) {
   $i = 0;
   while(1) {
    $217 = $i;
    $218 = $217 << 24 >> 24;
    $219 = ($218|0)<(4);
    if (!($219)) {
     break L51;
    }
    $220 = $i;
    $221 = $220 << 24 >> 24;
    $222 = (10936 + ($221)|0);
    $223 = HEAP8[$222>>0]|0;
    $224 = $i;
    $225 = $224 << 24 >> 24;
    $226 = HEAP32[10528>>2]|0;
    $227 = (($226) + ($225)|0);
    HEAP8[$227>>0] = $223;
    $228 = $i;
    $229 = (($228) + 1)<<24>>24;
    $i = $229;
   }
  }
 } while(0);
 $230 = HEAP8[10328>>0]|0;
 $231 = $230&255;
 $232 = ($231|0)==(2);
 if ($232) {
  $233 = HEAP8[10296>>0]|0;
  $234 = $233&255;
  $235 = (10304 + ($234)|0);
  $236 = HEAP8[$235>>0]|0;
  $ch = $236;
  $237 = HEAP8[10296>>0]|0;
  $238 = $237&255;
  $239 = (10312 + ($238)|0);
  $240 = HEAP8[$239>>0]|0;
  $out_level = $240;
  $241 = $out_level;
  $242 = $241 << 24 >> 24;
  $243 = $242&255;
  $pos_level = $243;
 } else {
  $244 = HEAP8[10616>>0]|0;
  $245 = $244&255;
  $246 = (10648 + ($245)|0);
  $247 = HEAP8[$246>>0]|0;
  $ch = $247;
  $248 = HEAP8[10616>>0]|0;
  $249 = $248&255;
  $250 = (10656 + ($249)|0);
  $251 = HEAP8[$250>>0]|0;
  $out_level = $251;
  $252 = $out_level;
  $253 = $252 << 24 >> 24;
  $254 = $253&255;
  $pos_level = $254;
 }
 $255 = HEAP32[10528>>2]|0;
 $256 = ((($255)) + 6|0);
 HEAP8[$256>>0] = 67;
 $257 = HEAP32[10528>>2]|0;
 $258 = ((($257)) + 7|0);
 HEAP8[$258>>0] = 72;
 $259 = $ch;
 $260 = $259&255;
 $261 = (49 + ($260))|0;
 $262 = $261&255;
 $263 = HEAP32[10528>>2]|0;
 $264 = ((($263)) + 8|0);
 HEAP8[$264>>0] = $262;
 $265 = $out_level;
 $266 = $265 << 24 >> 24;
 $267 = ($266|0)==(0);
 do {
  if ($267) {
   $268 = HEAP32[10528>>2]|0;
   $269 = ((($268)) + 11|0);
   HEAP8[$269>>0] = 32;
  } else {
   $270 = $out_level;
   $271 = $270 << 24 >> 24;
   $272 = ($271|0)>(0);
   $273 = HEAP32[10528>>2]|0;
   $274 = ((($273)) + 11|0);
   if ($272) {
    HEAP8[$274>>0] = 43;
    break;
   } else {
    HEAP8[$274>>0] = 45;
    $275 = $out_level;
    $276 = $275 << 24 >> 24;
    $277 = (0 - ($276))|0;
    $278 = $277&255;
    $pos_level = $278;
    break;
   }
  }
 } while(0);
 $279 = HEAP32[10528>>2]|0;
 $280 = $pos_level;
 (_litoa($279,$280,12)|0);
 $281 = HEAP8[10256>>0]|0;
 $282 = $281&255;
 $283 = HEAP8[10512>>0]|0;
 $284 = $283&255;
 $285 = ($282|0)!=($284|0);
 if (!($285)) {
  _lcd_updated_all();
  STACKTOP = sp;return;
 }
 $i = 16;
 while(1) {
  $286 = $i;
  $287 = $286 << 24 >> 24;
  $288 = ($287|0)<(20);
  if (!($288)) {
   break;
  }
  $289 = $i;
  $290 = $289 << 24 >> 24;
  $291 = HEAP32[10528>>2]|0;
  $292 = (($291) + ($290)|0);
  HEAP8[$292>>0] = 42;
  $293 = $i;
  $294 = (($293) + 1)<<24>>24;
  $i = $294;
 }
 _lcd_updated_all();
 STACKTOP = sp;return;
}
function _switch_setlist_mode($new_mode) {
 $new_mode = $new_mode|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $new_mode;
 $1 = $0;
 HEAP8[10320>>0] = $1;
 $2 = HEAP8[10320>>0]|0;
 $3 = $2&255;
 $4 = ($3|0)==(1);
 if (!($4)) {
  _update_lcd();
  STACKTOP = sp;return;
 }
 $5 = HEAP8[10392>>0]|0;
 $6 = $5&255;
 $7 = $6&65535;
 $8 = $7<<6;
 $9 = (4096 + ($8))|0;
 $10 = $9&65535;
 _flash_load($10,64,10552);
 HEAP8[10400>>0] = 0;
 _set_gmaj_program();
 _update_lcd();
 STACKTOP = sp;return;
}
function _set_gmaj_program() {
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 _set_gmaj_program_only();
 $0 = HEAP8[10464>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)==(0);
 if (!($2)) {
  _update_lcd();
  return;
 }
 _set_rjm_leds();
 _update_lcd();
 return;
}
function _scene_activate() {
 var $$ = 0, $$$ = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, $max_level = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = HEAP8[10256>>0]|0;
 $1 = $0&255;
 $2 = HEAP8[10512>>0]|0;
 $3 = $2&255;
 $4 = ($1|0)!=($3|0);
 if ($4) {
  HEAP8[10464>>0] = 0;
  $5 = HEAP8[10256>>0]|0;
  _midi_send_cmd1(12,0,($5|0));
  $6 = HEAP8[10256>>0]|0;
  HEAP8[10512>>0] = $6;
 }
 $7 = HEAP8[10296>>0]|0;
 HEAP8[10616>>0] = $7;
 $i = 0;
 while(1) {
  $8 = $i;
  $9 = $8&255;
  $10 = ($9|0)<(6);
  if (!($10)) {
   break;
  }
  $11 = $i;
  $12 = $11&255;
  $13 = (10304 + ($12)|0);
  $14 = HEAP8[$13>>0]|0;
  $15 = $i;
  $16 = $15&255;
  $17 = (10648 + ($16)|0);
  HEAP8[$17>>0] = $14;
  $18 = $i;
  $19 = $18&255;
  $20 = (10312 + ($19)|0);
  $21 = HEAP8[$20>>0]|0;
  $22 = $i;
  $23 = $22&255;
  $24 = (10656 + ($23)|0);
  HEAP8[$24>>0] = $21;
  $25 = $i;
  $26 = (($25) + 1)<<24>>24;
  $i = $26;
 }
 $27 = HEAP8[10296>>0]|0;
 $28 = $27&255;
 $29 = (10304 + ($28)|0);
 $30 = HEAP8[$29>>0]|0;
 $31 = $30&255;
 $32 = $31 << 1;
 $33 = $32&255;
 _midi_send_cmd1(12,1,($33|0));
 $34 = HEAP8[10296>>0]|0;
 $35 = $34&255;
 $36 = (10312 + ($35)|0);
 $37 = HEAP8[$36>>0]|0;
 $38 = $37 << 24 >> 24;
 $39 = (($38) + 121)|0;
 $40 = $39&255;
 $max_level = $40;
 $41 = $max_level;
 $42 = $41&255;
 $43 = ($42|0)>(127);
 $$ = $43 ? 127 : $40;
 $max_level = $$;
 $44 = $max_level;
 $45 = $44&255;
 $46 = ($45|0)<(0);
 $$$ = $46 ? 0 : $$;
 $max_level = $$$;
 $47 = $max_level;
 _midi_send_cmd2(11,0,92,($47|0));
 _update_effects_MIDI_state();
 _update_lcd();
 STACKTOP = sp;return;
}
function _is_top_button_pressed($mask) {
 $mask = $mask|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mask;
 $1 = HEAP8[(10636)>>0]|0;
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
 $9 = HEAP8[(10644)>>0]|0;
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
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $idxMask = 0, $togglevalue = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $idx;
 $togglevalue = 0;
 $1 = $0;
 $2 = $1&255;
 $3 = ($2|0)<(6);
 if (!($3)) {
  ___assert_fail((10768|0),(10720|0),392,(10776|0));
  // unreachable;
 }
 $4 = $0;
 $5 = $4&255;
 $6 = 1 << $5;
 $7 = $6&255;
 $idxMask = $7;
 $8 = $idxMask;
 $9 = $8&255;
 $10 = HEAP8[10296>>0]|0;
 $11 = $10&255;
 $12 = ((10290) + ($11)|0);
 $13 = HEAP8[$12>>0]|0;
 $14 = $13&255;
 $15 = $14 ^ $9;
 $16 = $15&255;
 HEAP8[$12>>0] = $16;
 $17 = HEAP8[10296>>0]|0;
 $18 = $17&255;
 $19 = ((10290) + ($18)|0);
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
 $28 = (10520 + ($27)|0);
 $29 = HEAP8[$28>>0]|0;
 $30 = $togglevalue;
 _gmaj_cc_set($29,$30);
 _update_lcd();
 STACKTOP = sp;return;
}
function _is_top_button_released($mask) {
 $mask = $mask|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mask;
 $1 = HEAP8[(10644)>>0]|0;
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
 $9 = HEAP8[(10636)>>0]|0;
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
 $1 = HEAP8[10632>>0]|0;
 $2 = $1&255;
 $3 = $0;
 $4 = $3&255;
 $5 = $2 & $4;
 $6 = $0;
 $7 = $6&255;
 $8 = ($5|0)==($7|0);
 if ($8) {
  $9 = HEAP8[10640>>0]|0;
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
  $4 = HEAP8[10400>>0]|0;
  HEAP8[10384>>0] = $4;
  $5 = $0;
  HEAP8[10296>>0] = $5;
  _scene_activate();
  STACKTOP = sp;return;
 } else {
  ___assert_fail((10712|0),(10720|0),507,(10752|0));
  // unreachable;
 }
}
function _reset_tuner_mute() {
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[10496>>0]|0;
 $1 = ($0<<24>>24)!=(0);
 if (!($1)) {
  return;
 }
 _disable_mute();
 return;
}
function _is_bot_button_held($mask) {
 $mask = $mask|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mask;
 $1 = HEAP8[10632>>0]|0;
 $2 = $1&255;
 $3 = $0;
 $4 = $3&255;
 $5 = $2 & $4;
 $6 = ($5|0)!=(0);
 $7 = $6&1;
 $8 = $7&255;
 STACKTOP = sp;return ($8|0);
}
function _switch_mode($new_mode) {
 $new_mode = $new_mode|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $new_mode;
 $1 = HEAP8[10328>>0]|0;
 HEAP8[10336>>0] = $1;
 $2 = $0;
 HEAP8[10328>>0] = $2;
 _update_lcd();
 STACKTOP = sp;return;
}
function _enable_mute() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 HEAP8[10496>>0] = 1;
 _gmaj_cc_set(81,127);
 _update_lcd();
 return;
}
function _is_bot_button_released($mask) {
 $mask = $mask|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mask;
 $1 = HEAP8[10640>>0]|0;
 $2 = $1&255;
 $3 = $0;
 $4 = $3&255;
 $5 = $2 & $4;
 $6 = $0;
 $7 = $6&255;
 $8 = ($5|0)==($7|0);
 if ($8) {
  $9 = HEAP8[10632>>0]|0;
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
function _set_gmaj_program_only() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[10320>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)==(1);
 if ($2) {
  $3 = HEAP8[10400>>0]|0;
  $4 = $3&255;
  $5 = ((10555) + ($4)|0);
  $6 = HEAP8[$5>>0]|0;
  HEAP8[10256>>0] = $6;
 }
 $7 = HEAP8[10256>>0]|0;
 $8 = $7&255;
 $9 = HEAP8[10512>>0]|0;
 $10 = $9&255;
 $11 = ($8|0)!=($10|0);
 if (!($11)) {
  HEAP8[10464>>0] = 0;
  _load_program_state();
  return;
 }
 $12 = HEAP8[10464>>0]|0;
 $13 = $12&255;
 $14 = ($13|0)==(0);
 if (!($14)) {
  _load_program_state();
  return;
 }
 HEAP8[10464>>0] = 1;
 _load_program_state();
 return;
}
function _is_top_button_held($mask) {
 $mask = $mask|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mask;
 $1 = HEAP8[(10636)>>0]|0;
 $2 = $1&255;
 $3 = $0;
 $4 = $3&255;
 $5 = $2 & $4;
 $6 = ($5|0)!=(0);
 $7 = $6&1;
 $8 = $7&255;
 STACKTOP = sp;return ($8|0);
}
function _cut_setlist_entry() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = HEAP8[10400>>0]|0;
 $1 = $0&255;
 $2 = HEAP8[10552>>0]|0;
 $3 = $2&255;
 $4 = ($1|0)>=($3|0);
 if ($4) {
  STACKTOP = sp;return;
 }
 $5 = HEAP8[10552>>0]|0;
 $6 = $5&255;
 $7 = ($6|0)<=(0);
 if ($7) {
  STACKTOP = sp;return;
 }
 $8 = HEAP8[10400>>0]|0;
 $9 = $8&255;
 $10 = (($9) + 1)|0;
 $11 = $10&255;
 $i = $11;
 while(1) {
  $12 = $i;
  $13 = $12&255;
  $14 = HEAP8[10552>>0]|0;
  $15 = $14&255;
  $16 = ($13|0)<($15|0);
  if (!($16)) {
   break;
  }
  $17 = $i;
  $18 = $17&255;
  $19 = (($18) - 1)|0;
  $20 = ((10555) + ($19)|0);
  $21 = $i;
  $22 = $21&255;
  $23 = ((10555) + ($22)|0);
  ;HEAP8[$20>>0]=HEAP8[$23>>0]|0;
  $24 = $i;
  $25 = (($24) + 1)<<24>>24;
  $i = $25;
 }
 $26 = HEAP8[10552>>0]|0;
 $27 = (($26) + -1)<<24>>24;
 HEAP8[10552>>0] = $27;
 STACKTOP = sp;return;
}
function _store_program_state() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $i = 0;
 while(1) {
  $0 = $i;
  $1 = $0&255;
  $2 = ($1|0)<(6);
  if (!($2)) {
   break;
  }
  $3 = $i;
  $4 = $3&255;
  $5 = ((10284) + ($4)|0);
  $6 = HEAP8[$5>>0]|0;
  $7 = $6&255;
  $8 = $7 & 127;
  $9 = $8&255;
  HEAP8[$5>>0] = $9;
  $10 = $i;
  $11 = (($10) + 1)<<24>>24;
  $i = $11;
 }
 $12 = HEAP8[10296>>0]|0;
 $13 = $12&255;
 $14 = ((10284) + ($13)|0);
 $15 = HEAP8[$14>>0]|0;
 $16 = $15&255;
 $17 = $16 | 128;
 $18 = $17&255;
 HEAP8[$14>>0] = $18;
 $19 = HEAP8[10512>>0]|0;
 $20 = $19&255;
 $21 = $20&65535;
 $22 = $21<<5;
 $23 = $22&65535;
 _flash_store($23,32,10264);
 STACKTOP = sp;return;
}
function _scene_update($preset,$new_rjm_channel,$out_level) {
 $preset = $preset|0;
 $new_rjm_channel = $new_rjm_channel|0;
 $out_level = $out_level|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $7 = 0, $8 = 0, $9 = 0, $desc = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $preset;
 $1 = $new_rjm_channel;
 $2 = $out_level;
 $3 = $0;
 $4 = $3&255;
 $5 = ((10284) + ($4)|0);
 $6 = HEAP8[$5>>0]|0;
 $desc = $6;
 $7 = $desc;
 $8 = $7&255;
 $9 = $8 & -4;
 $10 = $9&255;
 $desc = $10;
 $11 = $1;
 $12 = $11&255;
 $13 = $12 & 3;
 $14 = $desc;
 $15 = $14&255;
 $16 = $15 | $13;
 $17 = $16&255;
 $desc = $17;
 $18 = $2;
 $19 = $18 << 24 >> 24;
 $20 = ($19|0)<(-25);
 if ($20) {
  $2 = -25;
 } else {
  $21 = $2;
  $22 = $21 << 24 >> 24;
  $23 = ($22|0)>(6);
  if ($23) {
   $2 = 6;
  }
 }
 $24 = $desc;
 $25 = $24&255;
 $26 = $25 & -125;
 $27 = $26&255;
 $desc = $27;
 $28 = $2;
 $29 = $28 << 24 >> 24;
 $30 = (($29) + 9)|0;
 $31 = $30 & 31;
 $32 = $31&255;
 $33 = $32&255;
 $34 = $33 << 2;
 $35 = $desc;
 $36 = $35&255;
 $37 = $36 | $34;
 $38 = $37&255;
 $desc = $38;
 $39 = $desc;
 $40 = $0;
 $41 = $40&255;
 $42 = ((10284) + ($41)|0);
 HEAP8[$42>>0] = $39;
 $43 = $1;
 $44 = $0;
 $45 = $44&255;
 $46 = (10304 + ($45)|0);
 HEAP8[$46>>0] = $43;
 $47 = $2;
 $48 = $0;
 $49 = $48&255;
 $50 = (10312 + ($49)|0);
 HEAP8[$50>>0] = $47;
 $51 = $0;
 $52 = $51&255;
 $53 = (10304 + ($52)|0);
 $54 = HEAP8[$53>>0]|0;
 $55 = $0;
 $56 = $55&255;
 $57 = (10648 + ($56)|0);
 HEAP8[$57>>0] = $54;
 $58 = $0;
 $59 = $58&255;
 $60 = (10312 + ($59)|0);
 $61 = HEAP8[$60>>0]|0;
 $62 = $0;
 $63 = $62&255;
 $64 = (10656 + ($63)|0);
 HEAP8[$64>>0] = $61;
 _scene_activate();
 STACKTOP = sp;return;
}
function _calc_leds() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0;
 var $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0;
 var $99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[10328>>0]|0;
 $1 = $0&255;
 $2 = ($1|0)==(0);
 do {
  if ($2) {
   $3 = HEAP8[(10636)>>0]|0;
   $4 = ($3&255) >>> 7;
   $5 = $4&255;
   $6 = $5&255;
   $7 = HEAP8[(10348)>>0]|0;
   $8 = $6 & 1;
   $9 = ($8 << 7)&255;
   $10 = $7 & 127;
   $11 = $10 | $9;
   HEAP8[(10348)>>0] = $11;
   $12 = HEAP8[(10636)>>0]|0;
   $13 = ($12&255) >>> 6;
   $14 = $13 & 1;
   $15 = $14&255;
   $16 = $15&255;
   $17 = HEAP8[(10348)>>0]|0;
   $18 = $16 & 1;
   $19 = ($18 << 6)&255;
   $20 = $17 & -65;
   $21 = $20 | $19;
   HEAP8[(10348)>>0] = $21;
   $22 = HEAP8[10632>>0]|0;
   $23 = ($22&255) >>> 6;
   $24 = $23 & 1;
   $25 = $24&255;
   $26 = $25&255;
   $27 = HEAP8[10344>>0]|0;
   $28 = $26 & 1;
   $29 = ($28 << 6)&255;
   $30 = $27 & -65;
   $31 = $30 | $29;
   HEAP8[10344>>0] = $31;
   $32 = HEAP8[10256>>0]|0;
   $33 = $32&255;
   $34 = HEAP8[10512>>0]|0;
   $35 = $34&255;
   $36 = ($33|0)!=($35|0);
   do {
    if ($36) {
     $37 = HEAP8[10464>>0]|0;
     $38 = $37&255;
     $39 = $38 & 15;
     $40 = ($39|0)>=(8);
     if ($40) {
      _set_rjm_leds();
      break;
     } else {
      _clear_rjm_leds();
      break;
     }
    } else {
     _set_rjm_leds();
    }
   } while(0);
   $41 = HEAP8[10296>>0]|0;
   $42 = $41&255;
   $43 = ((10290) + ($42)|0);
   $44 = HEAP8[$43>>0]|0;
   $45 = $44&255;
   $46 = $45 & -193;
   $47 = HEAP8[(10348)>>0]|0;
   $48 = $47&255;
   $49 = $48 & 192;
   $50 = $46 | $49;
   $51 = $50&255;
   HEAP8[(10348)>>0] = $51;
   $52 = HEAP8[10432>>0]|0;
   $53 = $52&255;
   $54 = ($53|0)>=(31);
   if ($54) {
    $55 = HEAP8[10432>>0]|0;
    $56 = $55&255;
    $57 = $56 & 15;
    $58 = ($57|0)>=(8);
    $59 = HEAP8[10296>>0]|0;
    $60 = $59&255;
    $61 = ((10290) + ($60)|0);
    $62 = HEAP8[$61>>0]|0;
    $63 = $62&255;
    $64 = HEAP8[(10636)>>0]|0;
    $65 = $64&255;
    if ($58) {
     $66 = $65 ^ -1;
     $67 = $63 & $66;
     $68 = $67 & -193;
     $69 = HEAP8[(10348)>>0]|0;
     $70 = $69&255;
     $71 = $70 & 192;
     $72 = $68 | $71;
     $73 = $72&255;
     HEAP8[(10348)>>0] = $73;
     break;
    } else {
     $74 = $63 | $65;
     $75 = $74 & -193;
     $76 = HEAP8[(10348)>>0]|0;
     $77 = $76&255;
     $78 = $77 & 192;
     $79 = $75 | $78;
     $80 = $79&255;
     HEAP8[(10348)>>0] = $80;
     break;
    }
   }
  } else {
   $81 = HEAP8[10328>>0]|0;
   $82 = $81&255;
   $83 = ($82|0)==(1);
   if ($83) {
    $84 = HEAP8[(10636)>>0]|0;
    HEAP8[(10356)>>0] = $84;
    $85 = HEAP8[10296>>0]|0;
    $86 = $85&255;
    $87 = 1 << $86;
    $88 = HEAP8[10632>>0]|0;
    $89 = $88&255;
    $90 = $89 & 192;
    $91 = $87 | $90;
    $92 = $91&255;
    HEAP8[(10352)>>0] = $92;
    break;
   }
   $93 = HEAP8[10328>>0]|0;
   $94 = $93&255;
   $95 = ($94|0)==(2);
   if ($95) {
    $96 = HEAP8[10296>>0]|0;
    $97 = $96&255;
    $98 = (10304 + ($97)|0);
    $99 = HEAP8[$98>>0]|0;
    $100 = $99&255;
    $101 = $100 << 1;
    $102 = HEAP8[10296>>0]|0;
    $103 = $102&255;
    $104 = (10312 + ($103)|0);
    $105 = HEAP8[$104>>0]|0;
    $106 = $105 << 24 >> 24;
    $107 = ($106|0)<=(0);
    $108 = $107 ? 0 : 1;
    $109 = $101 | $108;
    $110 = 1 << $109;
    $111 = HEAP8[(10636)>>0]|0;
    $112 = $111&255;
    $113 = $112 & 192;
    $114 = $110 | $113;
    $115 = $114&255;
    HEAP8[(10364)>>0] = $115;
    $116 = HEAP8[10296>>0]|0;
    $117 = $116&255;
    $118 = 1 << $117;
    $119 = HEAP8[10632>>0]|0;
    $120 = $119&255;
    $121 = $120 & 192;
    $122 = $118 | $121;
    $123 = $122&255;
    HEAP8[(10360)>>0] = $123;
    break;
   }
   $124 = HEAP8[10328>>0]|0;
   $125 = $124&255;
   $126 = ($125|0)==(3);
   if ($126) {
    $127 = HEAP8[(10636)>>0]|0;
    HEAP8[(10372)>>0] = $127;
    $128 = HEAP8[10632>>0]|0;
    HEAP8[(10368)>>0] = $128;
   }
  }
 } while(0);
 $129 = HEAP8[10488>>0]|0;
 $130 = ($129<<24>>24)!=(0);
 if (!($130)) {
  _send_leds();
  return;
 }
 $131 = HEAP8[10488>>0]|0;
 $132 = $131&255;
 $133 = $132 & 15;
 $134 = ($133|0)>=(8);
 $135 = HEAP8[10328>>0]|0;
 $136 = $135&255;
 $137 = (10344 + ($136<<3)|0);
 $138 = HEAP8[$137>>0]|0;
 $139 = $138 & -65;
 if ($134) {
  $140 = $139 | 64;
  HEAP8[$137>>0] = $140;
  _send_leds();
  return;
 } else {
  HEAP8[$137>>0] = $139;
  _send_leds();
  return;
 }
}
function _set_rjm_leds() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[10296>>0]|0;
 $1 = $0&255;
 $2 = 1 << $1;
 $3 = HEAP8[10344>>0]|0;
 $4 = $3&255;
 $5 = $4 & 192;
 $6 = $2 | $5;
 $7 = $6&255;
 HEAP8[10344>>0] = $7;
 return;
}
function _clear_rjm_leds() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[10344>>0]|0;
 $1 = $0&255;
 $2 = $1 & 192;
 $3 = $2&255;
 HEAP8[10344>>0] = $3;
 return;
}
function _send_leds() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[10328>>0]|0;
 $1 = $0&255;
 $2 = (10344 + ($1<<3)|0);
 $3 = HEAP8[$2>>0]|0;
 $4 = $3&255;
 $5 = $4&65535;
 $6 = HEAP8[10328>>0]|0;
 $7 = $6&255;
 $8 = (10344 + ($7<<3)|0);
 $9 = ((($8)) + 4|0);
 $10 = HEAP8[$9>>0]|0;
 $11 = $10&255;
 $12 = $11&65535;
 $13 = $12 << 8;
 $14 = $5 | $13;
 $15 = $14&65535;
 HEAP16[10408>>1] = $15;
 $16 = HEAP16[10408>>1]|0;
 $17 = $16&65535;
 $18 = HEAP16[10416>>1]|0;
 $19 = $18&65535;
 $20 = ($17|0)!=($19|0);
 if (!($20)) {
  return;
 }
 $21 = HEAP16[10408>>1]|0;
 _led_set(($21|0));
 $22 = HEAP16[10408>>1]|0;
 HEAP16[10416>>1] = $22;
 return;
}
function _disable_mute() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 HEAP8[10496>>0] = 0;
 _gmaj_cc_set(81,0);
 _update_lcd();
 return;
}
function _update_effects_MIDI_state() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $fx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = HEAP8[10296>>0]|0;
 $1 = $0&255;
 $2 = ((10290) + ($1)|0);
 $3 = HEAP8[$2>>0]|0;
 $fx = $3;
 $4 = $fx;
 $5 = $4&255;
 $6 = $5 & -193;
 $7 = HEAP8[(10348)>>0]|0;
 $8 = $7&255;
 $9 = $8 & 192;
 $10 = $6 | $9;
 $11 = $10&255;
 HEAP8[(10348)>>0] = $11;
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
function _isdigit($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($c) + -48)|0;
 $1 = ($0>>>0)<(10);
 $2 = $1&1;
 return ($2|0);
}
function _isspace($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($c|0)==(32);
 $1 = (($c) + -9)|0;
 $2 = ($1>>>0)<(5);
 $3 = $0 | $2;
 $4 = $3&1;
 return ($4|0);
}
function _isupper($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($c) + -65)|0;
 $1 = ($0>>>0)<(26);
 $2 = $1&1;
 return ($2|0);
}
function _isxdigit($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $isdigit = 0, $isdigittmp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $isdigittmp = (($c) + -48)|0;
 $isdigit = ($isdigittmp>>>0)<(10);
 if ($isdigit) {
  $4 = 1;
  $3 = $4&1;
  return ($3|0);
 }
 $0 = $c | 32;
 $1 = (($0) + -97)|0;
 $2 = ($1>>>0)<(6);
 $4 = $2;
 $3 = $4&1;
 return ($3|0);
}
function _tolower($c) {
 $c = $c|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_isupper($c)|0);
 $1 = ($0|0)==(0);
 $2 = $c | 32;
 $$0 = $1 ? $c : $2;
 return ($$0|0);
}
function _feclearexcept($mask) {
 $mask = $mask|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function _feraiseexcept($mask) {
 $mask = $mask|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function _fetestexcept($mask) {
 $mask = $mask|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function _fegetround() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function ___fesetround($r) {
 $r = $r|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function _fegetenv($envp) {
 $envp = $envp|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function _fesetenv($envp) {
 $envp = $envp|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function ___intscan($f,$base,$pok,$0,$1) {
 $f = $f|0;
 $base = $base|0;
 $pok = $pok|0;
 $0 = $0|0;
 $1 = $1|0;
 var $$1 = 0, $$122 = 0, $$123 = 0, $$base21 = 0, $$lcssa = 0, $$lcssa130 = 0, $$lcssa131 = 0, $$lcssa132 = 0, $$lcssa133 = 0, $$lcssa134 = 0, $$lcssa135 = 0, $$sum = 0, $$sum14 = 0, $$sum1445 = 0, $$sum15 = 0, $$sum16 = 0, $$sum17 = 0, $$sum18 = 0, $$sum1865 = 0, $$sum19 = 0;
 var $$sum20 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0;
 var $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0;
 var $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0;
 var $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0;
 var $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0;
 var $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0;
 var $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0;
 var $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0;
 var $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0;
 var $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0;
 var $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0;
 var $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0;
 var $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0;
 var $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0;
 var $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $c$0 = 0, $c$1 = 0, $c$124 = 0, $c$2$be = 0, $c$2$be$lcssa = 0, $c$2$lcssa = 0, $c$3$be = 0, $c$3$lcssa = 0, $c$371 = 0;
 var $c$4$be = 0, $c$4$be$lcssa = 0, $c$4$lcssa = 0, $c$5$be = 0, $c$6$be = 0, $c$6$be$lcssa = 0, $c$6$lcssa = 0, $c$7$be = 0, $c$753 = 0, $c$8 = 0, $c$9$be = 0, $neg$0 = 0, $or$cond = 0, $or$cond12 = 0, $or$cond40 = 0, $or$cond5 = 0, $or$cond7 = 0, $x$082 = 0, $x$146 = 0, $x$266 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($base>>>0)>(36);
 if ($2) {
  $5 = (___errno_location()|0);
  HEAP32[$5>>2] = 22;
  $282 = 0;$283 = 0;
  tempRet0 = ($282);
  return ($283|0);
 }
 $3 = ((($f)) + 4|0);
 $4 = ((($f)) + 100|0);
 while(1) {
  $6 = HEAP32[$3>>2]|0;
  $7 = HEAP32[$4>>2]|0;
  $8 = ($6>>>0)<($7>>>0);
  if ($8) {
   $9 = ((($6)) + 1|0);
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
   $$lcssa135 = $13;
   break;
  }
 }
 $16 = ($$lcssa135|0)==(45);
 do {
  if ((($$lcssa135|0) == 43) | (($$lcssa135|0) == 45)) {
   $17 = $16 << 31 >> 31;
   $18 = HEAP32[$3>>2]|0;
   $19 = HEAP32[$4>>2]|0;
   $20 = ($18>>>0)<($19>>>0);
   if ($20) {
    $21 = ((($18)) + 1|0);
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
   $c$0 = $$lcssa135;$neg$0 = 0;
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
    $32 = ((($29)) + 1|0);
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
     $$123 = 8;$c$124 = $37;
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
    $42 = ((($39)) + 1|0);
    HEAP32[$3>>2] = $42;
    $43 = HEAP8[$39>>0]|0;
    $44 = $43&255;
    $46 = $44;
   } else {
    $45 = (___shgetc($f)|0);
    $46 = $45;
   }
   $$sum20 = (($46) + 1)|0;
   $47 = (10960 + ($$sum20)|0);
   $48 = HEAP8[$47>>0]|0;
   $49 = ($48&255)>(15);
   if ($49) {
    $50 = HEAP32[$4>>2]|0;
    $51 = ($50|0)==(0|0);
    if (!($51)) {
     $52 = HEAP32[$3>>2]|0;
     $53 = ((($52)) + -1|0);
     HEAP32[$3>>2] = $53;
    }
    $54 = ($pok|0)==(0);
    if ($54) {
     ___shlim($f,0);
     $282 = 0;$283 = 0;
     tempRet0 = ($282);
     return ($283|0);
    }
    if ($51) {
     $282 = 0;$283 = 0;
     tempRet0 = ($282);
     return ($283|0);
    }
    $55 = HEAP32[$3>>2]|0;
    $56 = ((($55)) + -1|0);
    HEAP32[$3>>2] = $56;
    $282 = 0;$283 = 0;
    tempRet0 = ($282);
    return ($283|0);
   } else {
    $$123 = 16;$c$124 = $46;
    label = 46;
   }
  } else {
   $$base21 = $25 ? 10 : $base;
   $$sum = (($c$0) + 1)|0;
   $57 = (10960 + ($$sum)|0);
   $58 = HEAP8[$57>>0]|0;
   $59 = $58&255;
   $60 = ($59>>>0)<($$base21>>>0);
   if ($60) {
    $$1 = $$base21;$c$1 = $c$0;
    label = 32;
   } else {
    $61 = HEAP32[$4>>2]|0;
    $62 = ($61|0)==(0|0);
    if (!($62)) {
     $63 = HEAP32[$3>>2]|0;
     $64 = ((($63)) + -1|0);
     HEAP32[$3>>2] = $64;
    }
    ___shlim($f,0);
    $65 = (___errno_location()|0);
    HEAP32[$65>>2] = 22;
    $282 = 0;$283 = 0;
    tempRet0 = ($282);
    return ($283|0);
   }
  }
 } while(0);
 if ((label|0) == 32) {
  $66 = ($$1|0)==(10);
  if ($66) {
   $67 = (($c$1) + -48)|0;
   $68 = ($67>>>0)<(10);
   if ($68) {
    $71 = $67;$x$082 = 0;
    while(1) {
     $69 = ($x$082*10)|0;
     $70 = (($69) + ($71))|0;
     $72 = HEAP32[$3>>2]|0;
     $73 = HEAP32[$4>>2]|0;
     $74 = ($72>>>0)<($73>>>0);
     if ($74) {
      $75 = ((($72)) + 1|0);
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
     $82 = $80 & $81;
     if ($82) {
      $71 = $79;$x$082 = $70;
     } else {
      $$lcssa134 = $70;$c$2$be$lcssa = $c$2$be;
      break;
     }
    }
    $284 = $$lcssa134;$285 = 0;$c$2$lcssa = $c$2$be$lcssa;
   } else {
    $284 = 0;$285 = 0;$c$2$lcssa = $c$1;
   }
   $83 = (($c$2$lcssa) + -48)|0;
   $84 = ($83>>>0)<(10);
   if ($84) {
    $85 = $284;$86 = $285;$89 = $83;$c$371 = $c$2$lcssa;
    while(1) {
     $87 = (___muldi3(($85|0),($86|0),10,0)|0);
     $88 = tempRet0;
     $90 = ($89|0)<(0);
     $91 = $90 << 31 >> 31;
     $92 = $89 ^ -1;
     $93 = $91 ^ -1;
     $94 = ($88>>>0)>($93>>>0);
     $95 = ($87>>>0)>($92>>>0);
     $96 = ($88|0)==($93|0);
     $97 = $96 & $95;
     $98 = $94 | $97;
     if ($98) {
      $$lcssa = $89;$286 = $85;$287 = $86;$c$3$lcssa = $c$371;
      break;
     }
     $99 = (_i64Add(($87|0),($88|0),($89|0),($91|0))|0);
     $100 = tempRet0;
     $101 = HEAP32[$3>>2]|0;
     $102 = HEAP32[$4>>2]|0;
     $103 = ($101>>>0)<($102>>>0);
     if ($103) {
      $104 = ((($101)) + 1|0);
      HEAP32[$3>>2] = $104;
      $105 = HEAP8[$101>>0]|0;
      $106 = $105&255;
      $c$3$be = $106;
     } else {
      $107 = (___shgetc($f)|0);
      $c$3$be = $107;
     }
     $108 = (($c$3$be) + -48)|0;
     $109 = ($108>>>0)<(10);
     $110 = ($100>>>0)<(429496729);
     $111 = ($99>>>0)<(2576980378);
     $112 = ($100|0)==(429496729);
     $113 = $112 & $111;
     $114 = $110 | $113;
     $or$cond7 = $109 & $114;
     if ($or$cond7) {
      $85 = $99;$86 = $100;$89 = $108;$c$371 = $c$3$be;
     } else {
      $$lcssa = $108;$286 = $99;$287 = $100;$c$3$lcssa = $c$3$be;
      break;
     }
    }
    $115 = ($$lcssa>>>0)>(9);
    if ($115) {
     $255 = $287;$257 = $286;
    } else {
     $$122 = 10;$288 = $286;$289 = $287;$c$8 = $c$3$lcssa;
     label = 72;
    }
   } else {
    $255 = $285;$257 = $284;
   }
  } else {
   $$123 = $$1;$c$124 = $c$1;
   label = 46;
  }
 }
 L69: do {
  if ((label|0) == 46) {
   $116 = (($$123) + -1)|0;
   $117 = $116 & $$123;
   $118 = ($117|0)==(0);
   if ($118) {
    $123 = ($$123*23)|0;
    $124 = $123 >>> 5;
    $125 = $124 & 7;
    $126 = (11224 + ($125)|0);
    $127 = HEAP8[$126>>0]|0;
    $128 = $127 << 24 >> 24;
    $$sum1445 = (($c$124) + 1)|0;
    $129 = (10960 + ($$sum1445)|0);
    $130 = HEAP8[$129>>0]|0;
    $131 = $130&255;
    $132 = ($131>>>0)<($$123>>>0);
    if ($132) {
     $135 = $131;$x$146 = 0;
     while(1) {
      $133 = $x$146 << $128;
      $134 = $135 | $133;
      $136 = HEAP32[$3>>2]|0;
      $137 = HEAP32[$4>>2]|0;
      $138 = ($136>>>0)<($137>>>0);
      if ($138) {
       $139 = ((($136)) + 1|0);
       HEAP32[$3>>2] = $139;
       $140 = HEAP8[$136>>0]|0;
       $141 = $140&255;
       $c$4$be = $141;
      } else {
       $142 = (___shgetc($f)|0);
       $c$4$be = $142;
      }
      $$sum14 = (($c$4$be) + 1)|0;
      $143 = (10960 + ($$sum14)|0);
      $144 = HEAP8[$143>>0]|0;
      $145 = $144&255;
      $146 = ($145>>>0)<($$123>>>0);
      $147 = ($134>>>0)<(134217728);
      $148 = $147 & $146;
      if ($148) {
       $135 = $145;$x$146 = $134;
      } else {
       $$lcssa130 = $134;$$lcssa131 = $144;$c$4$be$lcssa = $c$4$be;
       break;
      }
     }
     $152 = $$lcssa131;$154 = 0;$156 = $$lcssa130;$c$4$lcssa = $c$4$be$lcssa;
    } else {
     $152 = $130;$154 = 0;$156 = 0;$c$4$lcssa = $c$124;
    }
    $149 = (_bitshift64Lshr(-1,-1,($128|0))|0);
    $150 = tempRet0;
    $151 = $152&255;
    $153 = ($151>>>0)>=($$123>>>0);
    $155 = ($154>>>0)>($150>>>0);
    $157 = ($156>>>0)>($149>>>0);
    $158 = ($154|0)==($150|0);
    $159 = $158 & $157;
    $160 = $155 | $159;
    $or$cond40 = $153 | $160;
    if ($or$cond40) {
     $$122 = $$123;$288 = $156;$289 = $154;$c$8 = $c$4$lcssa;
     label = 72;
     break;
    } else {
     $161 = $156;$162 = $154;$166 = $152;
    }
    while(1) {
     $163 = (_bitshift64Shl(($161|0),($162|0),($128|0))|0);
     $164 = tempRet0;
     $165 = $166&255;
     $167 = $165 | $163;
     $168 = HEAP32[$3>>2]|0;
     $169 = HEAP32[$4>>2]|0;
     $170 = ($168>>>0)<($169>>>0);
     if ($170) {
      $171 = ((($168)) + 1|0);
      HEAP32[$3>>2] = $171;
      $172 = HEAP8[$168>>0]|0;
      $173 = $172&255;
      $c$5$be = $173;
     } else {
      $174 = (___shgetc($f)|0);
      $c$5$be = $174;
     }
     $$sum15 = (($c$5$be) + 1)|0;
     $175 = (10960 + ($$sum15)|0);
     $176 = HEAP8[$175>>0]|0;
     $177 = $176&255;
     $178 = ($177>>>0)>=($$123>>>0);
     $179 = ($164>>>0)>($150>>>0);
     $180 = ($167>>>0)>($149>>>0);
     $181 = ($164|0)==($150|0);
     $182 = $181 & $180;
     $183 = $179 | $182;
     $or$cond = $178 | $183;
     if ($or$cond) {
      $$122 = $$123;$288 = $167;$289 = $164;$c$8 = $c$5$be;
      label = 72;
      break L69;
     } else {
      $161 = $167;$162 = $164;$166 = $176;
     }
    }
   }
   $$sum1865 = (($c$124) + 1)|0;
   $119 = (10960 + ($$sum1865)|0);
   $120 = HEAP8[$119>>0]|0;
   $121 = $120&255;
   $122 = ($121>>>0)<($$123>>>0);
   if ($122) {
    $186 = $121;$x$266 = 0;
    while(1) {
     $184 = Math_imul($x$266, $$123)|0;
     $185 = (($186) + ($184))|0;
     $187 = HEAP32[$3>>2]|0;
     $188 = HEAP32[$4>>2]|0;
     $189 = ($187>>>0)<($188>>>0);
     if ($189) {
      $190 = ((($187)) + 1|0);
      HEAP32[$3>>2] = $190;
      $191 = HEAP8[$187>>0]|0;
      $192 = $191&255;
      $c$6$be = $192;
     } else {
      $193 = (___shgetc($f)|0);
      $c$6$be = $193;
     }
     $$sum18 = (($c$6$be) + 1)|0;
     $194 = (10960 + ($$sum18)|0);
     $195 = HEAP8[$194>>0]|0;
     $196 = $195&255;
     $197 = ($196>>>0)<($$123>>>0);
     $198 = ($185>>>0)<(119304647);
     $199 = $198 & $197;
     if ($199) {
      $186 = $196;$x$266 = $185;
     } else {
      $$lcssa132 = $185;$$lcssa133 = $195;$c$6$be$lcssa = $c$6$be;
      break;
     }
    }
    $201 = $$lcssa133;$290 = $$lcssa132;$291 = 0;$c$6$lcssa = $c$6$be$lcssa;
   } else {
    $201 = $120;$290 = 0;$291 = 0;$c$6$lcssa = $c$124;
   }
   $200 = $201&255;
   $202 = ($200>>>0)<($$123>>>0);
   if ($202) {
    $203 = (___udivdi3(-1,-1,($$123|0),0)|0);
    $204 = tempRet0;
    $205 = $291;$207 = $290;$215 = $201;$c$753 = $c$6$lcssa;
    while(1) {
     $206 = ($205>>>0)>($204>>>0);
     $208 = ($207>>>0)>($203>>>0);
     $209 = ($205|0)==($204|0);
     $210 = $209 & $208;
     $211 = $206 | $210;
     if ($211) {
      $$122 = $$123;$288 = $207;$289 = $205;$c$8 = $c$753;
      label = 72;
      break L69;
     }
     $212 = (___muldi3(($207|0),($205|0),($$123|0),0)|0);
     $213 = tempRet0;
     $214 = $215&255;
     $216 = $214 ^ -1;
     $217 = ($213>>>0)>(4294967295);
     $218 = ($212>>>0)>($216>>>0);
     $219 = ($213|0)==(-1);
     $220 = $219 & $218;
     $221 = $217 | $220;
     if ($221) {
      $$122 = $$123;$288 = $207;$289 = $205;$c$8 = $c$753;
      label = 72;
      break L69;
     }
     $222 = (_i64Add(($214|0),0,($212|0),($213|0))|0);
     $223 = tempRet0;
     $224 = HEAP32[$3>>2]|0;
     $225 = HEAP32[$4>>2]|0;
     $226 = ($224>>>0)<($225>>>0);
     if ($226) {
      $227 = ((($224)) + 1|0);
      HEAP32[$3>>2] = $227;
      $228 = HEAP8[$224>>0]|0;
      $229 = $228&255;
      $c$7$be = $229;
     } else {
      $230 = (___shgetc($f)|0);
      $c$7$be = $230;
     }
     $$sum19 = (($c$7$be) + 1)|0;
     $231 = (10960 + ($$sum19)|0);
     $232 = HEAP8[$231>>0]|0;
     $233 = $232&255;
     $234 = ($233>>>0)<($$123>>>0);
     if ($234) {
      $205 = $223;$207 = $222;$215 = $232;$c$753 = $c$7$be;
     } else {
      $$122 = $$123;$288 = $222;$289 = $223;$c$8 = $c$7$be;
      label = 72;
      break;
     }
    }
   } else {
    $$122 = $$123;$288 = $290;$289 = $291;$c$8 = $c$6$lcssa;
    label = 72;
   }
  }
 } while(0);
 if ((label|0) == 72) {
  $$sum16 = (($c$8) + 1)|0;
  $235 = (10960 + ($$sum16)|0);
  $236 = HEAP8[$235>>0]|0;
  $237 = $236&255;
  $238 = ($237>>>0)<($$122>>>0);
  if ($238) {
   while(1) {
    $239 = HEAP32[$3>>2]|0;
    $240 = HEAP32[$4>>2]|0;
    $241 = ($239>>>0)<($240>>>0);
    if ($241) {
     $242 = ((($239)) + 1|0);
     HEAP32[$3>>2] = $242;
     $243 = HEAP8[$239>>0]|0;
     $244 = $243&255;
     $c$9$be = $244;
    } else {
     $245 = (___shgetc($f)|0);
     $c$9$be = $245;
    }
    $$sum17 = (($c$9$be) + 1)|0;
    $246 = (10960 + ($$sum17)|0);
    $247 = HEAP8[$246>>0]|0;
    $248 = $247&255;
    $249 = ($248>>>0)<($$122>>>0);
    if (!($249)) {
     break;
    }
   }
   $250 = (___errno_location()|0);
   HEAP32[$250>>2] = 34;
   $255 = $1;$257 = $0;
  } else {
   $255 = $289;$257 = $288;
  }
 }
 $251 = HEAP32[$4>>2]|0;
 $252 = ($251|0)==(0|0);
 if (!($252)) {
  $253 = HEAP32[$3>>2]|0;
  $254 = ((($253)) + -1|0);
  HEAP32[$3>>2] = $254;
 }
 $256 = ($255>>>0)<($1>>>0);
 $258 = ($257>>>0)<($0>>>0);
 $259 = ($255|0)==($1|0);
 $260 = $259 & $258;
 $261 = $256 | $260;
 if (!($261)) {
  $262 = $0 & 1;
  $263 = ($262|0)!=(0);
  $264 = (0)!=(0);
  $265 = $263 | $264;
  $266 = ($neg$0|0)!=(0);
  $or$cond12 = $265 | $266;
  if (!($or$cond12)) {
   $267 = (___errno_location()|0);
   HEAP32[$267>>2] = 34;
   $268 = (_i64Add(($0|0),($1|0),-1,-1)|0);
   $269 = tempRet0;
   $282 = $269;$283 = $268;
   tempRet0 = ($282);
   return ($283|0);
  }
  $270 = ($255>>>0)>($1>>>0);
  $271 = ($257>>>0)>($0>>>0);
  $272 = ($255|0)==($1|0);
  $273 = $272 & $271;
  $274 = $270 | $273;
  if ($274) {
   $275 = (___errno_location()|0);
   HEAP32[$275>>2] = 34;
   $282 = $1;$283 = $0;
   tempRet0 = ($282);
   return ($283|0);
  }
 }
 $276 = ($neg$0|0)<(0);
 $277 = $276 << 31 >> 31;
 $278 = $257 ^ $neg$0;
 $279 = $255 ^ $277;
 $280 = (_i64Subtract(($278|0),($279|0),($neg$0|0),($277|0))|0);
 $281 = tempRet0;
 $282 = $281;$283 = $280;
 tempRet0 = ($282);
 return ($283|0);
}
function ___floatscan($f,$prec,$pok) {
 $f = $f|0;
 $prec = $prec|0;
 $pok = $pok|0;
 var $$$i = 0, $$0 = 0.0, $$0$i25 = 0.0, $$010$i = 0, $$07$i = 0, $$0710$i = 0, $$0711$i = 0, $$09$i = 0, $$1$be$i = 0, $$1$ph$i = 0, $$11$i = 0, $$18$i = 0, $$2$i = 0, $$3$be$i = 0, $$3$lcssa$i = 0, $$3121$i = 0, $$in = 0, $$k$0$i = 0, $$lcssa = 0, $$lcssa288 = 0;
 var $$lcssa289 = 0, $$lcssa308 = 0, $$lcssa308$lcssa = 0, $$lcssa309 = 0, $$lcssa309$lcssa = 0, $$lcssa322 = 0, $$lcssa323 = 0, $$lcssa333 = 0, $$lcssa50$i = 0, $$lnz$0$i = 0, $$neg32$i = 0, $$not$i = 0, $$old8 = 0, $$pn$i = 0.0, $$pre$i = 0, $$pre$i17 = 0, $$pre$phi42$iZ2D = 0.0, $$pre41$i = 0.0, $$promoted = 0, $$promoted$i = 0;
 var $$promoted185 = 0, $$sink$off0$us$i = 0, $$sink$off0$us93$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0;
 var $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0;
 var $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0;
 var $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0;
 var $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0.0, $177 = 0.0, $178 = 0.0, $179 = 0.0, $18 = 0, $180 = 0, $181 = 0, $182 = 0.0, $183 = 0.0, $184 = 0, $185 = 0;
 var $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0;
 var $203 = 0.0, $204 = 0.0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0;
 var $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0;
 var $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0.0, $253 = 0.0, $254 = 0, $255 = 0, $256 = 0, $257 = 0;
 var $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0.0, $262 = 0.0, $263 = 0.0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0.0, $275 = 0.0;
 var $276 = 0.0, $277 = 0, $278 = 0, $279 = 0.0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0;
 var $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0.0, $304 = 0.0, $305 = 0.0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0;
 var $311 = 0.0, $312 = 0.0, $313 = 0.0, $314 = 0.0, $315 = 0.0, $316 = 0.0, $317 = 0, $318 = 0, $319 = 0.0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0;
 var $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0;
 var $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0;
 var $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0;
 var $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0;
 var $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0.0, $419 = 0.0;
 var $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0.0, $436 = 0.0, $437 = 0.0;
 var $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0.0, $448 = 0.0, $449 = 0.0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0;
 var $456 = 0, $457 = 0, $458 = 0, $459 = 0.0, $46 = 0, $460 = 0.0, $461 = 0.0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0.0;
 var $474 = 0, $475 = 0.0, $476 = 0.0, $477 = 0, $478 = 0.0, $479 = 0, $48 = 0.0, $480 = 0.0, $481 = 0.0, $482 = 0, $483 = 0, $484 = 0, $485 = 0.0, $486 = 0.0, $487 = 0, $488 = 0, $489 = 0, $49 = 0.0, $490 = 0, $491 = 0;
 var $492 = 0.0, $493 = 0.0, $494 = 0.0, $495 = 0, $496 = 0, $497 = 0, $498 = 0.0, $499 = 0.0, $5 = 0, $50 = 0.0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0;
 var $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0;
 var $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0;
 var $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0;
 var $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0;
 var $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0;
 var $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0;
 var $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0;
 var $636 = 0, $637 = 0.0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0.0, $643 = 0.0, $644 = 0.0, $645 = 0, $646 = 0.0, $647 = 0.0, $648 = 0.0, $649 = 0.0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0;
 var $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0.0, $661 = 0.0, $662 = 0.0, $663 = 0, $664 = 0.0, $665 = 0.0, $666 = 0, $667 = 0, $668 = 0, $669 = 0.0, $67 = 0, $670 = 0.0, $671 = 0.0;
 var $672 = 0.0, $673 = 0, $674 = 0, $675 = 0.0, $676 = 0, $677 = 0.0, $678 = 0.0, $679 = 0.0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0.0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0.0, $69 = 0;
 var $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0.0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0.0, $702 = 0, $703 = 0, $704 = 0.0, $705 = 0.0, $706 = 0, $707 = 0;
 var $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0;
 var $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0;
 var $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $a$0$lcssa177$i = 0, $a$0101$i = 0, $a$1$i = 0, $a$1$i$lcssa = 0, $a$2$ph38$i = 0, $a$3$i = 0;
 var $a$3$i$lcssa300 = 0, $a$3$i301 = 0, $a$3$ph$i = 0, $a$3$ph183$i = 0, $a$478$i = 0, $a$5$i = 0, $a$5$i$lcssa = 0, $a$5$i$lcssa$lcssa = 0, $bias$0$i = 0.0, $bias$0$i23 = 0.0, $bits$0$ph = 0, $brmerge = 0, $brmerge$i26 = 0, $brmerge187 = 0, $c$0 = 0, $c$0$i = 0, $c$1$lcssa = 0, $c$1$ph$i = 0, $c$185 = 0, $c$2 = 0;
 var $c$2$i = 0, $c$2$lcssa$i = 0, $c$4 = 0, $c$4$1 = 0, $c$6 = 0, $carry$0103$i = 0, $carry1$0$us$i = 0, $carry1$0$us89$i = 0, $carry1$1$lcssa$lcssa$i = 0, $carry1$1$us$i = 0, $carry1$1$us$i$lcssa = 0, $carry1$1$us94$i = 0, $carry1$1$us94$i$lcssa = 0, $carry3$081$i = 0, $cond$i = 0, $d$0$i = 0, $denormal$0$i = 0, $denormal$1$i = 0, $denormal$2$i = 0, $e2$0$ph$i = 0;
 var $e2$0$us$i = 0, $e2$0$us84$i = 0, $e2$1$i = 0, $e2$1$i298 = 0, $e2$1$ph$i = 0, $e2$1$ph182$i = 0, $e2$2$i = 0, $e2$3$i = 0, $emin$0$ph = 0, $exitcond$i = 0, $frac$0$i = 0.0, $frac$1$i = 0.0, $frac$2$i = 0.0, $gotdig$0$i = 0, $gotdig$0$i$lcssa294 = 0, $gotdig$0$i12 = 0, $gotdig$0$i12$lcssa331 = 0, $gotdig$2$i = 0, $gotdig$2$i$lcssa = 0, $gotdig$2$i13 = 0;
 var $gotdig$3$i = 0, $gotdig$3$lcssa$i = 0, $gotdig$3117$i = 0, $gotdig$3117$i$lcssa = 0, $gotdig$4$i = 0, $gotrad$0$i = 0, $gotrad$0$i$lcssa = 0, $gotrad$0$i14 = 0, $gotrad$1$i = 0, $gotrad$1$lcssa$i = 0, $gotrad$1118$i = 0, $gotrad$2$i = 0, $gottail$0$i = 0, $gottail$1$i = 0, $gottail$2$i = 0, $i$0$lcssa = 0, $i$084 = 0, $i$1 = 0, $i$4 = 0, $i$4$lcssa = 0;
 var $j$0$lcssa$i = 0, $j$0120$i = 0, $j$0120$i$lcssa = 0, $j$067$i = 0, $j$068$i = 0, $j$069$i = 0, $j$2$i = 0, $j$3110$i = 0, $k$0$lcssa$i = 0, $k$0119$i = 0, $k$0119$i$lcssa = 0, $k$063$i = 0, $k$064$i = 0, $k$065$i = 0, $k$2$i = 0, $k$3$i = 0, $k$4102$i = 0, $k$5$in$us$i = 0, $k$5$in$us88$i = 0, $k$5$us$i = 0;
 var $k$5$us90$i = 0, $k$5$z$2$us$i = 0, $k$5$z$2$us96$i = 0, $k$679$i = 0, $lnz$0$lcssa$i = 0, $lnz$0116$i = 0, $lnz$0116$i$lcssa = 0, $lnz$057$i = 0, $lnz$058$i = 0, $lnz$059$i = 0, $lnz$2$i = 0, $notlhs = 0, $notrhs = 0, $or$cond = 0, $or$cond$i = 0, $or$cond$i16 = 0, $or$cond13$i = 0, $or$cond15$i = 0, $or$cond16$i = 0, $or$cond17$us$i = 0;
 var $or$cond17$us95$i = 0, $or$cond19$i = 0, $or$cond20$i = 0, $or$cond216$i = 0, $or$cond3$i = 0, $or$cond4$i = 0, $or$cond5 = 0, $or$cond6$i = 0, $or$cond7 = 0, $or$cond8$i = 0, $or$cond9$i = 0, $or$cond9$not = 0, $rp$0$lcssa178$i = 0, $rp$0100$i = 0, $rp$1$i18 = 0, $rp$1$i18$lcssa = 0, $rp$2$ph36$i = 0, $rp$3$ph$i = 0, $rp$3$ph34$i = 0, $rp$477$i = 0;
 var $rp$5$i = 0, $rp$5$i$lcssa = 0, $rp$5$i$lcssa$lcssa = 0, $scale$0$i = 0.0, $scale$1$i = 0.0, $scale$2$i = 0.0, $sign$0 = 0, $storemerge$i = 0, $sum$i = 0, $x$0$i = 0, $x$0$i$lcssa = 0, $x$1$i = 0, $x$2$i = 0, $x$3$lcssa$i = 0, $x$324$i = 0, $x$4$lcssa$i = 0, $x$419$i = 0, $x$5$i = 0, $x$6$i = 0, $x$i = 0;
 var $y$0$i = 0.0, $y$0$i$lcssa = 0.0, $y$1$i = 0.0, $y$1$i22 = 0.0, $y$2$i = 0.0, $y$2$i24 = 0.0, $y$3$i = 0.0, $y$3$lcssa$i = 0.0, $y$320$i = 0.0, $y$4$i = 0.0, $y$5$i = 0.0, $z$0$i = 0, $z$1$ph37$i = 0, $z$1$us$i = 0, $z$1$us85$i = 0, $z$2$us$i = 0, $z$2$us87$i = 0, $z$3$lcssa$lcssa$i = 0, $z$3$us$i = 0, $z$3$us$i$lcssa = 0;
 var $z$3$us97$i = 0, $z$3$us97$i$lcssa = 0, $z$4$i = 0, $z$5$ph$i = 0, $z$7$1$i = 0, $z$7$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 512|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $x$i = sp;
 if ((($prec|0) == 0)) {
  $bits$0$ph = 24;$emin$0$ph = -149;
 } else if ((($prec|0) == 2)) {
  $bits$0$ph = 53;$emin$0$ph = -1074;
 } else if ((($prec|0) == 1)) {
  $bits$0$ph = 53;$emin$0$ph = -1074;
 } else {
  $$0 = 0.0;
  STACKTOP = sp;return (+$$0);
 }
 $0 = ((($f)) + 4|0);
 $1 = ((($f)) + 100|0);
 while(1) {
  $2 = HEAP32[$0>>2]|0;
  $3 = HEAP32[$1>>2]|0;
  $4 = ($2>>>0)<($3>>>0);
  if ($4) {
   $5 = ((($2)) + 1|0);
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
   $$lcssa333 = $9;
   break;
  }
 }
 $12 = ($$lcssa333|0)==(45);
 do {
  if ((($$lcssa333|0) == 43) | (($$lcssa333|0) == 45)) {
   $13 = $12&1;
   $14 = $13 << 1;
   $15 = (1 - ($14))|0;
   $16 = HEAP32[$0>>2]|0;
   $17 = HEAP32[$1>>2]|0;
   $18 = ($16>>>0)<($17>>>0);
   if ($18) {
    $19 = ((($16)) + 1|0);
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
   $c$0 = $$lcssa333;$sign$0 = 1;
  }
 } while(0);
 $c$185 = $c$0;$i$084 = 0;
 while(1) {
  $23 = $c$185 | 32;
  $24 = (11240 + ($i$084)|0);
  $25 = HEAP8[$24>>0]|0;
  $26 = $25 << 24 >> 24;
  $27 = ($23|0)==($26|0);
  if (!($27)) {
   $c$1$lcssa = $c$185;$i$0$lcssa = $i$084;
   break;
  }
  $28 = ($i$084>>>0)<(7);
  do {
   if ($28) {
    $29 = HEAP32[$0>>2]|0;
    $30 = HEAP32[$1>>2]|0;
    $31 = ($29>>>0)<($30>>>0);
    if ($31) {
     $32 = ((($29)) + 1|0);
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
    $c$2 = $c$185;
   }
  } while(0);
  $36 = (($i$084) + 1)|0;
  $37 = ($36>>>0)<(8);
  if ($37) {
   $c$185 = $c$2;$i$084 = $36;
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
   $or$cond5 = $39 & $38;
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
   do {
    if ($51) {
     $52 = $c$1$lcssa | 32;
     $53 = ($52|0)==(110);
     if ($53) {
      $54 = HEAP32[$0>>2]|0;
      $55 = HEAP32[$1>>2]|0;
      $56 = ($54>>>0)<($55>>>0);
      if ($56) {
       $57 = ((($54)) + 1|0);
       HEAP32[$0>>2] = $57;
       $58 = HEAP8[$54>>0]|0;
       $59 = $58&255;
       $c$4 = $59;
      } else {
       $60 = (___shgetc($f)|0);
       $c$4 = $60;
      }
      $61 = $c$4 | 32;
      $62 = ($61|0)==(97);
      if (!($62)) {
       break;
      }
      $712 = HEAP32[$0>>2]|0;
      $713 = HEAP32[$1>>2]|0;
      $714 = ($712>>>0)<($713>>>0);
      if ($714) {
       $716 = ((($712)) + 1|0);
       HEAP32[$0>>2] = $716;
       $717 = HEAP8[$712>>0]|0;
       $718 = $717&255;
       $c$4$1 = $718;
      } else {
       $715 = (___shgetc($f)|0);
       $c$4$1 = $715;
      }
      $719 = $c$4$1 | 32;
      $720 = ($719|0)==(110);
      if (!($720)) {
       break;
      }
      $63 = HEAP32[$0>>2]|0;
      $64 = HEAP32[$1>>2]|0;
      $65 = ($63>>>0)<($64>>>0);
      if ($65) {
       $66 = ((($63)) + 1|0);
       HEAP32[$0>>2] = $66;
       $67 = HEAP8[$63>>0]|0;
       $68 = $67&255;
       $70 = $68;
      } else {
       $69 = (___shgetc($f)|0);
       $70 = $69;
      }
      $71 = ($70|0)==(40);
      if ($71) {
       $i$4 = 1;
      } else {
       $72 = HEAP32[$1>>2]|0;
       $73 = ($72|0)==(0|0);
       if ($73) {
        $$0 = nan;
        STACKTOP = sp;return (+$$0);
       }
       $74 = HEAP32[$0>>2]|0;
       $75 = ((($74)) + -1|0);
       HEAP32[$0>>2] = $75;
       $$0 = nan;
       STACKTOP = sp;return (+$$0);
      }
      while(1) {
       $76 = HEAP32[$0>>2]|0;
       $77 = HEAP32[$1>>2]|0;
       $78 = ($76>>>0)<($77>>>0);
       if ($78) {
        $79 = ((($76)) + 1|0);
        HEAP32[$0>>2] = $79;
        $80 = HEAP8[$76>>0]|0;
        $81 = $80&255;
        $84 = $81;
       } else {
        $82 = (___shgetc($f)|0);
        $84 = $82;
       }
       $83 = (($84) + -48)|0;
       $85 = ($83>>>0)<(10);
       $86 = (($84) + -65)|0;
       $87 = ($86>>>0)<(26);
       $or$cond = $85 | $87;
       if (!($or$cond)) {
        $88 = (($84) + -97)|0;
        $89 = ($88>>>0)<(26);
        $90 = ($84|0)==(95);
        $or$cond7 = $90 | $89;
        if (!($or$cond7)) {
         $$lcssa289 = $84;$i$4$lcssa = $i$4;
         break;
        }
       }
       $102 = (($i$4) + 1)|0;
       $i$4 = $102;
      }
      $91 = ($$lcssa289|0)==(41);
      if ($91) {
       $$0 = nan;
       STACKTOP = sp;return (+$$0);
      }
      $92 = HEAP32[$1>>2]|0;
      $93 = ($92|0)==(0|0);
      if (!($93)) {
       $94 = HEAP32[$0>>2]|0;
       $95 = ((($94)) + -1|0);
       HEAP32[$0>>2] = $95;
      }
      if (!($39)) {
       $97 = (___errno_location()|0);
       HEAP32[$97>>2] = 22;
       ___shlim($f,0);
       $$0 = 0.0;
       STACKTOP = sp;return (+$$0);
      }
      $96 = ($i$4$lcssa|0)==(0);
      $brmerge187 = $96 | $93;
      if ($brmerge187) {
       $$0 = nan;
       STACKTOP = sp;return (+$$0);
      }
      $$promoted185 = HEAP32[$0>>2]|0;
      $$in = $i$4$lcssa;$100 = $$promoted185;
      while(1) {
       $98 = (($$in) + -1)|0;
       $99 = ((($100)) + -1|0);
       $101 = ($98|0)==(0);
       if ($101) {
        $$lcssa288 = $99;
        break;
       } else {
        $$in = $98;$100 = $99;
       }
      }
      HEAP32[$0>>2] = $$lcssa288;
      $$0 = nan;
      STACKTOP = sp;return (+$$0);
     }
     $108 = ($c$1$lcssa|0)==(48);
     do {
      if ($108) {
       $109 = HEAP32[$0>>2]|0;
       $110 = HEAP32[$1>>2]|0;
       $111 = ($109>>>0)<($110>>>0);
       if ($111) {
        $112 = ((($109)) + 1|0);
        HEAP32[$0>>2] = $112;
        $113 = HEAP8[$109>>0]|0;
        $114 = $113&255;
        $117 = $114;
       } else {
        $115 = (___shgetc($f)|0);
        $117 = $115;
       }
       $116 = $117 | 32;
       $118 = ($116|0)==(120);
       if (!($118)) {
        $320 = HEAP32[$1>>2]|0;
        $321 = ($320|0)==(0|0);
        if ($321) {
         $c$6 = 48;
         break;
        }
        $322 = HEAP32[$0>>2]|0;
        $323 = ((($322)) + -1|0);
        HEAP32[$0>>2] = $323;
        $c$6 = 48;
        break;
       }
       $119 = HEAP32[$0>>2]|0;
       $120 = HEAP32[$1>>2]|0;
       $121 = ($119>>>0)<($120>>>0);
       if ($121) {
        $122 = ((($119)) + 1|0);
        HEAP32[$0>>2] = $122;
        $123 = HEAP8[$119>>0]|0;
        $124 = $123&255;
        $c$0$i = $124;$gotdig$0$i = 0;
       } else {
        $125 = (___shgetc($f)|0);
        $c$0$i = $125;$gotdig$0$i = 0;
       }
       while(1) {
        if ((($c$0$i|0) == 46)) {
         $gotdig$0$i$lcssa294 = $gotdig$0$i;
         label = 71;
         break;
        } else if (!((($c$0$i|0) == 48))) {
         $162 = 0;$164 = 0;$721 = 0;$722 = 0;$c$2$i = $c$0$i;$gotdig$2$i = $gotdig$0$i;$gotrad$0$i = 0;$gottail$0$i = 0;$scale$0$i = 1.0;$x$0$i = 0;$y$0$i = 0.0;
         break;
        }
        $126 = HEAP32[$0>>2]|0;
        $127 = HEAP32[$1>>2]|0;
        $128 = ($126>>>0)<($127>>>0);
        if ($128) {
         $129 = ((($126)) + 1|0);
         HEAP32[$0>>2] = $129;
         $130 = HEAP8[$126>>0]|0;
         $131 = $130&255;
         $c$0$i = $131;$gotdig$0$i = 1;
         continue;
        } else {
         $132 = (___shgetc($f)|0);
         $c$0$i = $132;$gotdig$0$i = 1;
         continue;
        }
       }
       if ((label|0) == 71) {
        $133 = HEAP32[$0>>2]|0;
        $134 = HEAP32[$1>>2]|0;
        $135 = ($133>>>0)<($134>>>0);
        if ($135) {
         $136 = ((($133)) + 1|0);
         HEAP32[$0>>2] = $136;
         $137 = HEAP8[$133>>0]|0;
         $138 = $137&255;
         $c$1$ph$i = $138;
        } else {
         $139 = (___shgetc($f)|0);
         $c$1$ph$i = $139;
        }
        $140 = ($c$1$ph$i|0)==(48);
        if ($140) {
         $148 = 0;$149 = 0;
         while(1) {
          $141 = HEAP32[$0>>2]|0;
          $142 = HEAP32[$1>>2]|0;
          $143 = ($141>>>0)<($142>>>0);
          if ($143) {
           $144 = ((($141)) + 1|0);
           HEAP32[$0>>2] = $144;
           $145 = HEAP8[$141>>0]|0;
           $146 = $145&255;
           $152 = $146;
          } else {
           $147 = (___shgetc($f)|0);
           $152 = $147;
          }
          $150 = (_i64Add(($148|0),($149|0),-1,-1)|0);
          $151 = tempRet0;
          $153 = ($152|0)==(48);
          if ($153) {
           $148 = $150;$149 = $151;
          } else {
           $162 = 0;$164 = 0;$721 = $150;$722 = $151;$c$2$i = $152;$gotdig$2$i = 1;$gotrad$0$i = 1;$gottail$0$i = 0;$scale$0$i = 1.0;$x$0$i = 0;$y$0$i = 0.0;
           break;
          }
         }
        } else {
         $162 = 0;$164 = 0;$721 = 0;$722 = 0;$c$2$i = $c$1$ph$i;$gotdig$2$i = $gotdig$0$i$lcssa294;$gotrad$0$i = 1;$gottail$0$i = 0;$scale$0$i = 1.0;$x$0$i = 0;$y$0$i = 0.0;
        }
       }
       while(1) {
        $154 = (($c$2$i) + -48)|0;
        $155 = ($154>>>0)<(10);
        $$pre$i = $c$2$i | 32;
        if ($155) {
         label = 83;
        } else {
         $156 = (($$pre$i) + -97)|0;
         $157 = ($156>>>0)<(6);
         $158 = ($c$2$i|0)==(46);
         $or$cond6$i = $158 | $157;
         if (!($or$cond6$i)) {
          $206 = $721;$207 = $164;$209 = $722;$210 = $162;$c$2$lcssa$i = $c$2$i;$gotdig$2$i$lcssa = $gotdig$2$i;$gotrad$0$i$lcssa = $gotrad$0$i;$x$0$i$lcssa = $x$0$i;$y$0$i$lcssa = $y$0$i;
          break;
         }
         if ($158) {
          $159 = ($gotrad$0$i|0)==(0);
          if ($159) {
           $723 = $164;$724 = $162;$725 = $164;$726 = $162;$gotdig$3$i = $gotdig$2$i;$gotrad$1$i = 1;$gottail$2$i = $gottail$0$i;$scale$2$i = $scale$0$i;$x$2$i = $x$0$i;$y$2$i = $y$0$i;
          } else {
           $206 = $721;$207 = $164;$209 = $722;$210 = $162;$c$2$lcssa$i = 46;$gotdig$2$i$lcssa = $gotdig$2$i;$gotrad$0$i$lcssa = $gotrad$0$i;$x$0$i$lcssa = $x$0$i;$y$0$i$lcssa = $y$0$i;
           break;
          }
         } else {
          label = 83;
         }
        }
        if ((label|0) == 83) {
         label = 0;
         $160 = ($c$2$i|0)>(57);
         $161 = (($$pre$i) + -87)|0;
         $d$0$i = $160 ? $161 : $154;
         $163 = ($162|0)<(0);
         $165 = ($164>>>0)<(8);
         $166 = ($162|0)==(0);
         $167 = $166 & $165;
         $168 = $163 | $167;
         do {
          if ($168) {
           $169 = $x$0$i << 4;
           $170 = (($d$0$i) + ($169))|0;
           $gottail$1$i = $gottail$0$i;$scale$1$i = $scale$0$i;$x$1$i = $170;$y$1$i = $y$0$i;
          } else {
           $171 = ($162|0)<(0);
           $172 = ($164>>>0)<(14);
           $173 = ($162|0)==(0);
           $174 = $173 & $172;
           $175 = $171 | $174;
           if ($175) {
            $176 = (+($d$0$i|0));
            $177 = $scale$0$i * 0.0625;
            $178 = $177 * $176;
            $179 = $y$0$i + $178;
            $gottail$1$i = $gottail$0$i;$scale$1$i = $177;$x$1$i = $x$0$i;$y$1$i = $179;
            break;
           }
           $180 = ($d$0$i|0)==(0);
           $181 = ($gottail$0$i|0)!=(0);
           $or$cond$i = $181 | $180;
           if ($or$cond$i) {
            $gottail$1$i = $gottail$0$i;$scale$1$i = $scale$0$i;$x$1$i = $x$0$i;$y$1$i = $y$0$i;
           } else {
            $182 = $scale$0$i * 0.5;
            $183 = $y$0$i + $182;
            $gottail$1$i = 1;$scale$1$i = $scale$0$i;$x$1$i = $x$0$i;$y$1$i = $183;
           }
          }
         } while(0);
         $184 = (_i64Add(($164|0),($162|0),1,0)|0);
         $185 = tempRet0;
         $723 = $721;$724 = $722;$725 = $184;$726 = $185;$gotdig$3$i = 1;$gotrad$1$i = $gotrad$0$i;$gottail$2$i = $gottail$1$i;$scale$2$i = $scale$1$i;$x$2$i = $x$1$i;$y$2$i = $y$1$i;
        }
        $186 = HEAP32[$0>>2]|0;
        $187 = HEAP32[$1>>2]|0;
        $188 = ($186>>>0)<($187>>>0);
        if ($188) {
         $189 = ((($186)) + 1|0);
         HEAP32[$0>>2] = $189;
         $190 = HEAP8[$186>>0]|0;
         $191 = $190&255;
         $162 = $726;$164 = $725;$721 = $723;$722 = $724;$c$2$i = $191;$gotdig$2$i = $gotdig$3$i;$gotrad$0$i = $gotrad$1$i;$gottail$0$i = $gottail$2$i;$scale$0$i = $scale$2$i;$x$0$i = $x$2$i;$y$0$i = $y$2$i;
         continue;
        } else {
         $192 = (___shgetc($f)|0);
         $162 = $726;$164 = $725;$721 = $723;$722 = $724;$c$2$i = $192;$gotdig$2$i = $gotdig$3$i;$gotrad$0$i = $gotrad$1$i;$gottail$0$i = $gottail$2$i;$scale$0$i = $scale$2$i;$x$0$i = $x$2$i;$y$0$i = $y$2$i;
         continue;
        }
       }
       $193 = ($gotdig$2$i$lcssa|0)==(0);
       if ($193) {
        $194 = HEAP32[$1>>2]|0;
        $195 = ($194|0)==(0|0);
        if (!($195)) {
         $196 = HEAP32[$0>>2]|0;
         $197 = ((($196)) + -1|0);
         HEAP32[$0>>2] = $197;
        }
        $198 = ($pok|0)==(0);
        if ($198) {
         ___shlim($f,0);
        } else {
         if (!($195)) {
          $199 = HEAP32[$0>>2]|0;
          $200 = ((($199)) + -1|0);
          HEAP32[$0>>2] = $200;
          $201 = ($gotrad$0$i$lcssa|0)==(0);
          if (!($201)) {
           $202 = ((($199)) + -2|0);
           HEAP32[$0>>2] = $202;
          }
         }
        }
        $203 = (+($sign$0|0));
        $204 = $203 * 0.0;
        $$0 = $204;
        STACKTOP = sp;return (+$$0);
       }
       $205 = ($gotrad$0$i$lcssa|0)==(0);
       $208 = $205 ? $207 : $206;
       $211 = $205 ? $210 : $209;
       $212 = ($210|0)<(0);
       $213 = ($207>>>0)<(8);
       $214 = ($210|0)==(0);
       $215 = $214 & $213;
       $216 = $212 | $215;
       if ($216) {
        $218 = $207;$219 = $210;$x$324$i = $x$0$i$lcssa;
        while(1) {
         $217 = $x$324$i << 4;
         $220 = (_i64Add(($218|0),($219|0),1,0)|0);
         $221 = tempRet0;
         $222 = ($221|0)<(0);
         $223 = ($220>>>0)<(8);
         $224 = ($221|0)==(0);
         $225 = $224 & $223;
         $226 = $222 | $225;
         if ($226) {
          $218 = $220;$219 = $221;$x$324$i = $217;
         } else {
          $x$3$lcssa$i = $217;
          break;
         }
        }
       } else {
        $x$3$lcssa$i = $x$0$i$lcssa;
       }
       $227 = $c$2$lcssa$i | 32;
       $228 = ($227|0)==(112);
       do {
        if ($228) {
         $229 = (_scanexp($f,$pok)|0);
         $230 = tempRet0;
         $231 = ($229|0)==(0);
         $232 = ($230|0)==(-2147483648);
         $233 = $231 & $232;
         if ($233) {
          $234 = ($pok|0)==(0);
          if ($234) {
           ___shlim($f,0);
           $$0 = 0.0;
           STACKTOP = sp;return (+$$0);
          } else {
           $235 = HEAP32[$1>>2]|0;
           $236 = ($235|0)==(0|0);
           if ($236) {
            $247 = 0;$248 = 0;
            break;
           }
           $237 = HEAP32[$0>>2]|0;
           $238 = ((($237)) + -1|0);
           HEAP32[$0>>2] = $238;
           $247 = 0;$248 = 0;
           break;
          }
         } else {
          $247 = $229;$248 = $230;
         }
        } else {
         $239 = HEAP32[$1>>2]|0;
         $240 = ($239|0)==(0|0);
         if ($240) {
          $247 = 0;$248 = 0;
         } else {
          $241 = HEAP32[$0>>2]|0;
          $242 = ((($241)) + -1|0);
          HEAP32[$0>>2] = $242;
          $247 = 0;$248 = 0;
         }
        }
       } while(0);
       $243 = (_bitshift64Shl(($208|0),($211|0),2)|0);
       $244 = tempRet0;
       $245 = (_i64Add(($243|0),($244|0),-32,-1)|0);
       $246 = tempRet0;
       $249 = (_i64Add(($245|0),($246|0),($247|0),($248|0))|0);
       $250 = tempRet0;
       $251 = ($x$3$lcssa$i|0)==(0);
       if ($251) {
        $252 = (+($sign$0|0));
        $253 = $252 * 0.0;
        $$0 = $253;
        STACKTOP = sp;return (+$$0);
       }
       $254 = (0 - ($emin$0$ph))|0;
       $255 = ($250|0)>(0);
       $256 = ($249>>>0)>($254>>>0);
       $257 = ($250|0)==(0);
       $258 = $257 & $256;
       $259 = $255 | $258;
       if ($259) {
        $260 = (___errno_location()|0);
        HEAP32[$260>>2] = 34;
        $261 = (+($sign$0|0));
        $262 = $261 * 1.7976931348623157E+308;
        $263 = $262 * 1.7976931348623157E+308;
        $$0 = $263;
        STACKTOP = sp;return (+$$0);
       }
       $264 = (($emin$0$ph) + -106)|0;
       $265 = ($264|0)<(0);
       $266 = $265 << 31 >> 31;
       $267 = ($250|0)<($266|0);
       $268 = ($249>>>0)<($264>>>0);
       $269 = ($250|0)==($266|0);
       $270 = $269 & $268;
       $271 = $267 | $270;
       if ($271) {
        $273 = (___errno_location()|0);
        HEAP32[$273>>2] = 34;
        $274 = (+($sign$0|0));
        $275 = $274 * 2.2250738585072014E-308;
        $276 = $275 * 2.2250738585072014E-308;
        $$0 = $276;
        STACKTOP = sp;return (+$$0);
       }
       $272 = ($x$3$lcssa$i|0)>(-1);
       if ($272) {
        $282 = $249;$283 = $250;$x$419$i = $x$3$lcssa$i;$y$320$i = $y$0$i$lcssa;
        while(1) {
         $277 = !($y$320$i >= 0.5);
         $278 = $x$419$i << 1;
         $279 = $y$320$i + -1.0;
         $280 = $277&1;
         $281 = $280 | $278;
         $x$5$i = $281 ^ 1;
         $$pn$i = $277 ? $y$320$i : $279;
         $y$4$i = $y$320$i + $$pn$i;
         $284 = (_i64Add(($282|0),($283|0),-1,-1)|0);
         $285 = tempRet0;
         $286 = ($281|0)>(-1);
         if ($286) {
          $282 = $284;$283 = $285;$x$419$i = $x$5$i;$y$320$i = $y$4$i;
         } else {
          $291 = $284;$292 = $285;$x$4$lcssa$i = $x$5$i;$y$3$lcssa$i = $y$4$i;
          break;
         }
        }
       } else {
        $291 = $249;$292 = $250;$x$4$lcssa$i = $x$3$lcssa$i;$y$3$lcssa$i = $y$0$i$lcssa;
       }
       $287 = ($emin$0$ph|0)<(0);
       $288 = $287 << 31 >> 31;
       $289 = (_i64Subtract(32,0,($emin$0$ph|0),($288|0))|0);
       $290 = tempRet0;
       $293 = (_i64Add(($291|0),($292|0),($289|0),($290|0))|0);
       $294 = tempRet0;
       $295 = (0)>($294|0);
       $296 = ($bits$0$ph>>>0)>($293>>>0);
       $297 = (0)==($294|0);
       $298 = $297 & $296;
       $299 = $295 | $298;
       if ($299) {
        $300 = ($293|0)<(0);
        if ($300) {
         $$0710$i = 0;
         label = 124;
        } else {
         $$07$i = $293;
         label = 122;
        }
       } else {
        $$07$i = $bits$0$ph;
        label = 122;
       }
       do {
        if ((label|0) == 122) {
         $301 = ($$07$i|0)<(53);
         if ($301) {
          $$0710$i = $$07$i;
          label = 124;
          break;
         }
         $$pre41$i = (+($sign$0|0));
         $$0711$i = $$07$i;$$pre$phi42$iZ2D = $$pre41$i;$bias$0$i = 0.0;
        }
       } while(0);
       if ((label|0) == 124) {
        $302 = (84 - ($$0710$i))|0;
        $303 = (+_scalbn(1.0,$302));
        $304 = (+($sign$0|0));
        $305 = (+_copysignl($303,$304));
        $$0711$i = $$0710$i;$$pre$phi42$iZ2D = $304;$bias$0$i = $305;
       }
       $306 = ($$0711$i|0)<(32);
       $307 = $y$3$lcssa$i != 0.0;
       $or$cond4$i = $307 & $306;
       $308 = $x$4$lcssa$i & 1;
       $309 = ($308|0)==(0);
       $or$cond9$i = $309 & $or$cond4$i;
       $310 = $or$cond9$i&1;
       $x$6$i = (($310) + ($x$4$lcssa$i))|0;
       $y$5$i = $or$cond9$i ? 0.0 : $y$3$lcssa$i;
       $311 = (+($x$6$i>>>0));
       $312 = $$pre$phi42$iZ2D * $311;
       $313 = $bias$0$i + $312;
       $314 = $$pre$phi42$iZ2D * $y$5$i;
       $315 = $314 + $313;
       $316 = $315 - $bias$0$i;
       $317 = $316 != 0.0;
       if (!($317)) {
        $318 = (___errno_location()|0);
        HEAP32[$318>>2] = 34;
       }
       $319 = (+_scalbnl($316,$291));
       $$0 = $319;
       STACKTOP = sp;return (+$$0);
      } else {
       $c$6 = $c$1$lcssa;
      }
     } while(0);
     $sum$i = (($emin$0$ph) + ($bits$0$ph))|0;
     $324 = (0 - ($sum$i))|0;
     $$09$i = $c$6;$gotdig$0$i12 = 0;
     while(1) {
      if ((($$09$i|0) == 46)) {
       $gotdig$0$i12$lcssa331 = $gotdig$0$i12;
       label = 135;
       break;
      } else if (!((($$09$i|0) == 48))) {
       $$2$i = $$09$i;$727 = 0;$728 = 0;$gotdig$2$i13 = $gotdig$0$i12;$gotrad$0$i14 = 0;
       break;
      }
      $325 = HEAP32[$0>>2]|0;
      $326 = HEAP32[$1>>2]|0;
      $327 = ($325>>>0)<($326>>>0);
      if ($327) {
       $328 = ((($325)) + 1|0);
       HEAP32[$0>>2] = $328;
       $329 = HEAP8[$325>>0]|0;
       $330 = $329&255;
       $$09$i = $330;$gotdig$0$i12 = 1;
       continue;
      } else {
       $331 = (___shgetc($f)|0);
       $$09$i = $331;$gotdig$0$i12 = 1;
       continue;
      }
     }
     if ((label|0) == 135) {
      $332 = HEAP32[$0>>2]|0;
      $333 = HEAP32[$1>>2]|0;
      $334 = ($332>>>0)<($333>>>0);
      if ($334) {
       $335 = ((($332)) + 1|0);
       HEAP32[$0>>2] = $335;
       $336 = HEAP8[$332>>0]|0;
       $337 = $336&255;
       $$1$ph$i = $337;
      } else {
       $338 = (___shgetc($f)|0);
       $$1$ph$i = $338;
      }
      $339 = ($$1$ph$i|0)==(48);
      if ($339) {
       $340 = 0;$341 = 0;
       while(1) {
        $342 = (_i64Add(($340|0),($341|0),-1,-1)|0);
        $343 = tempRet0;
        $344 = HEAP32[$0>>2]|0;
        $345 = HEAP32[$1>>2]|0;
        $346 = ($344>>>0)<($345>>>0);
        if ($346) {
         $347 = ((($344)) + 1|0);
         HEAP32[$0>>2] = $347;
         $348 = HEAP8[$344>>0]|0;
         $349 = $348&255;
         $$1$be$i = $349;
        } else {
         $350 = (___shgetc($f)|0);
         $$1$be$i = $350;
        }
        $351 = ($$1$be$i|0)==(48);
        if ($351) {
         $340 = $342;$341 = $343;
        } else {
         $$2$i = $$1$be$i;$727 = $342;$728 = $343;$gotdig$2$i13 = 1;$gotrad$0$i14 = 1;
         break;
        }
       }
      } else {
       $$2$i = $$1$ph$i;$727 = 0;$728 = 0;$gotdig$2$i13 = $gotdig$0$i12$lcssa331;$gotrad$0$i14 = 1;
      }
     }
     HEAP32[$x$i>>2] = 0;
     $352 = (($$2$i) + -48)|0;
     $353 = ($352>>>0)<(10);
     $354 = ($$2$i|0)==(46);
     $355 = $354 | $353;
     L214: do {
      if ($355) {
       $356 = ((($x$i)) + 496|0);
       $$3121$i = $$2$i;$359 = 0;$360 = 0;$729 = $354;$730 = $352;$731 = $727;$732 = $728;$gotdig$3117$i = $gotdig$2$i13;$gotrad$1118$i = $gotrad$0$i14;$j$0120$i = 0;$k$0119$i = 0;$lnz$0116$i = 0;
       L216: while(1) {
        do {
         if ($729) {
          $cond$i = ($gotrad$1118$i|0)==(0);
          if ($cond$i) {
           $733 = $359;$734 = $360;$735 = $359;$736 = $360;$gotdig$4$i = $gotdig$3117$i;$gotrad$2$i = 1;$j$2$i = $j$0120$i;$k$2$i = $k$0119$i;$lnz$2$i = $lnz$0116$i;
          } else {
           $737 = $731;$738 = $732;$739 = $359;$740 = $360;$gotdig$3117$i$lcssa = $gotdig$3117$i;$j$0120$i$lcssa = $j$0120$i;$k$0119$i$lcssa = $k$0119$i;$lnz$0116$i$lcssa = $lnz$0116$i;
           break L216;
          }
         } else {
          $358 = ($k$0119$i|0)<(125);
          $361 = (_i64Add(($359|0),($360|0),1,0)|0);
          $362 = tempRet0;
          $363 = ($$3121$i|0)!=(48);
          if (!($358)) {
           if (!($363)) {
            $733 = $731;$734 = $732;$735 = $361;$736 = $362;$gotdig$4$i = $gotdig$3117$i;$gotrad$2$i = $gotrad$1118$i;$j$2$i = $j$0120$i;$k$2$i = $k$0119$i;$lnz$2$i = $lnz$0116$i;
            break;
           }
           $373 = HEAP32[$356>>2]|0;
           $374 = $373 | 1;
           HEAP32[$356>>2] = $374;
           $733 = $731;$734 = $732;$735 = $361;$736 = $362;$gotdig$4$i = $gotdig$3117$i;$gotrad$2$i = $gotrad$1118$i;$j$2$i = $j$0120$i;$k$2$i = $k$0119$i;$lnz$2$i = $lnz$0116$i;
           break;
          }
          $$lnz$0$i = $363 ? $361 : $lnz$0116$i;
          $364 = ($j$0120$i|0)==(0);
          $365 = (($x$i) + ($k$0119$i<<2)|0);
          if ($364) {
           $storemerge$i = $730;
          } else {
           $366 = HEAP32[$365>>2]|0;
           $367 = ($366*10)|0;
           $368 = (($$3121$i) + -48)|0;
           $369 = (($368) + ($367))|0;
           $storemerge$i = $369;
          }
          HEAP32[$365>>2] = $storemerge$i;
          $370 = (($j$0120$i) + 1)|0;
          $371 = ($370|0)==(9);
          $372 = $371&1;
          $$k$0$i = (($372) + ($k$0119$i))|0;
          $$11$i = $371 ? 0 : $370;
          $733 = $731;$734 = $732;$735 = $361;$736 = $362;$gotdig$4$i = 1;$gotrad$2$i = $gotrad$1118$i;$j$2$i = $$11$i;$k$2$i = $$k$0$i;$lnz$2$i = $$lnz$0$i;
         }
        } while(0);
        $375 = HEAP32[$0>>2]|0;
        $376 = HEAP32[$1>>2]|0;
        $377 = ($375>>>0)<($376>>>0);
        if ($377) {
         $378 = ((($375)) + 1|0);
         HEAP32[$0>>2] = $378;
         $379 = HEAP8[$375>>0]|0;
         $380 = $379&255;
         $$3$be$i = $380;
        } else {
         $381 = (___shgetc($f)|0);
         $$3$be$i = $381;
        }
        $382 = (($$3$be$i) + -48)|0;
        $383 = ($382>>>0)<(10);
        $384 = ($$3$be$i|0)==(46);
        $385 = $384 | $383;
        if ($385) {
         $$3121$i = $$3$be$i;$359 = $735;$360 = $736;$729 = $384;$730 = $382;$731 = $733;$732 = $734;$gotdig$3117$i = $gotdig$4$i;$gotrad$1118$i = $gotrad$2$i;$j$0120$i = $j$2$i;$k$0119$i = $k$2$i;$lnz$0116$i = $lnz$2$i;
        } else {
         $$3$lcssa$i = $$3$be$i;$387 = $733;$388 = $735;$390 = $734;$391 = $736;$gotdig$3$lcssa$i = $gotdig$4$i;$gotrad$1$lcssa$i = $gotrad$2$i;$j$0$lcssa$i = $j$2$i;$k$0$lcssa$i = $k$2$i;$lnz$0$lcssa$i = $lnz$2$i;
         label = 158;
         break L214;
        }
       }
       $357 = ($gotdig$3117$i$lcssa|0)!=(0);
       $741 = $739;$742 = $740;$743 = $737;$744 = $738;$745 = $357;$j$069$i = $j$0120$i$lcssa;$k$065$i = $k$0119$i$lcssa;$lnz$059$i = $lnz$0116$i$lcssa;
       label = 166;
      } else {
       $$3$lcssa$i = $$2$i;$387 = $727;$388 = 0;$390 = $728;$391 = 0;$gotdig$3$lcssa$i = $gotdig$2$i13;$gotrad$1$lcssa$i = $gotrad$0$i14;$j$0$lcssa$i = 0;$k$0$lcssa$i = 0;$lnz$0$lcssa$i = 0;
       label = 158;
      }
     } while(0);
     do {
      if ((label|0) == 158) {
       $386 = ($gotrad$1$lcssa$i|0)==(0);
       $389 = $386 ? $388 : $387;
       $392 = $386 ? $391 : $390;
       $393 = ($gotdig$3$lcssa$i|0)!=(0);
       $394 = $$3$lcssa$i | 32;
       $395 = ($394|0)==(101);
       $or$cond13$i = $395 & $393;
       if (!($or$cond13$i)) {
        $410 = ($$3$lcssa$i|0)>(-1);
        if ($410) {
         $741 = $388;$742 = $391;$743 = $389;$744 = $392;$745 = $393;$j$069$i = $j$0$lcssa$i;$k$065$i = $k$0$lcssa$i;$lnz$059$i = $lnz$0$lcssa$i;
         label = 166;
         break;
        } else {
         $746 = $388;$747 = $391;$748 = $393;$749 = $389;$750 = $392;$j$068$i = $j$0$lcssa$i;$k$064$i = $k$0$lcssa$i;$lnz$058$i = $lnz$0$lcssa$i;
         label = 168;
         break;
        }
       }
       $396 = (_scanexp($f,$pok)|0);
       $397 = tempRet0;
       $398 = ($396|0)==(0);
       $399 = ($397|0)==(-2147483648);
       $400 = $398 & $399;
       if ($400) {
        $401 = ($pok|0)==(0);
        if ($401) {
         ___shlim($f,0);
         $$0$i25 = 0.0;
         break;
        }
        $402 = HEAP32[$1>>2]|0;
        $403 = ($402|0)==(0|0);
        if ($403) {
         $406 = 0;$407 = 0;
        } else {
         $404 = HEAP32[$0>>2]|0;
         $405 = ((($404)) + -1|0);
         HEAP32[$0>>2] = $405;
         $406 = 0;$407 = 0;
        }
       } else {
        $406 = $396;$407 = $397;
       }
       $408 = (_i64Add(($406|0),($407|0),($389|0),($392|0))|0);
       $409 = tempRet0;
       $420 = $408;$422 = $388;$423 = $409;$425 = $391;$j$067$i = $j$0$lcssa$i;$k$063$i = $k$0$lcssa$i;$lnz$057$i = $lnz$0$lcssa$i;
       label = 170;
      }
     } while(0);
     if ((label|0) == 166) {
      $411 = HEAP32[$1>>2]|0;
      $412 = ($411|0)==(0|0);
      if ($412) {
       $746 = $741;$747 = $742;$748 = $745;$749 = $743;$750 = $744;$j$068$i = $j$069$i;$k$064$i = $k$065$i;$lnz$058$i = $lnz$059$i;
       label = 168;
      } else {
       $413 = HEAP32[$0>>2]|0;
       $414 = ((($413)) + -1|0);
       HEAP32[$0>>2] = $414;
       if ($745) {
        $420 = $743;$422 = $741;$423 = $744;$425 = $742;$j$067$i = $j$069$i;$k$063$i = $k$065$i;$lnz$057$i = $lnz$059$i;
        label = 170;
       } else {
        label = 169;
       }
      }
     }
     if ((label|0) == 168) {
      if ($748) {
       $420 = $749;$422 = $746;$423 = $750;$425 = $747;$j$067$i = $j$068$i;$k$063$i = $k$064$i;$lnz$057$i = $lnz$058$i;
       label = 170;
      } else {
       label = 169;
      }
     }
     do {
      if ((label|0) == 169) {
       $415 = (___errno_location()|0);
       HEAP32[$415>>2] = 22;
       ___shlim($f,0);
       $$0$i25 = 0.0;
      }
      else if ((label|0) == 170) {
       $416 = HEAP32[$x$i>>2]|0;
       $417 = ($416|0)==(0);
       if ($417) {
        $418 = (+($sign$0|0));
        $419 = $418 * 0.0;
        $$0$i25 = $419;
        break;
       }
       $421 = ($420|0)==($422|0);
       $424 = ($423|0)==($425|0);
       $426 = $421 & $424;
       $427 = ($425|0)<(0);
       $428 = ($422>>>0)<(10);
       $429 = ($425|0)==(0);
       $430 = $429 & $428;
       $431 = $427 | $430;
       $or$cond$i16 = $431 & $426;
       if ($or$cond$i16) {
        $432 = ($bits$0$ph>>>0)>(30);
        $433 = $416 >>> $bits$0$ph;
        $434 = ($433|0)==(0);
        $or$cond15$i = $432 | $434;
        if ($or$cond15$i) {
         $435 = (+($sign$0|0));
         $436 = (+($416>>>0));
         $437 = $435 * $436;
         $$0$i25 = $437;
         break;
        }
       }
       $438 = (($emin$0$ph|0) / -2)&-1;
       $439 = ($438|0)<(0);
       $440 = $439 << 31 >> 31;
       $441 = ($423|0)>($440|0);
       $442 = ($420>>>0)>($438>>>0);
       $443 = ($423|0)==($440|0);
       $444 = $443 & $442;
       $445 = $441 | $444;
       if ($445) {
        $446 = (___errno_location()|0);
        HEAP32[$446>>2] = 34;
        $447 = (+($sign$0|0));
        $448 = $447 * 1.7976931348623157E+308;
        $449 = $448 * 1.7976931348623157E+308;
        $$0$i25 = $449;
        break;
       }
       $450 = (($emin$0$ph) + -106)|0;
       $451 = ($450|0)<(0);
       $452 = $451 << 31 >> 31;
       $453 = ($423|0)<($452|0);
       $454 = ($420>>>0)<($450>>>0);
       $455 = ($423|0)==($452|0);
       $456 = $455 & $454;
       $457 = $453 | $456;
       if ($457) {
        $458 = (___errno_location()|0);
        HEAP32[$458>>2] = 34;
        $459 = (+($sign$0|0));
        $460 = $459 * 2.2250738585072014E-308;
        $461 = $460 * 2.2250738585072014E-308;
        $$0$i25 = $461;
        break;
       }
       $462 = ($j$067$i|0)==(0);
       if ($462) {
        $k$3$i = $k$063$i;
       } else {
        $463 = ($j$067$i|0)<(9);
        if ($463) {
         $464 = (($x$i) + ($k$063$i<<2)|0);
         $$promoted$i = HEAP32[$464>>2]|0;
         $466 = $$promoted$i;$j$3110$i = $j$067$i;
         while(1) {
          $465 = ($466*10)|0;
          $467 = (($j$3110$i) + 1)|0;
          $exitcond$i = ($467|0)==(9);
          if ($exitcond$i) {
           $$lcssa323 = $465;
           break;
          } else {
           $466 = $465;$j$3110$i = $467;
          }
         }
         HEAP32[$464>>2] = $$lcssa323;
        }
        $468 = (($k$063$i) + 1)|0;
        $k$3$i = $468;
       }
       $469 = ($lnz$057$i|0)<(9);
       if ($469) {
        $470 = ($lnz$057$i|0)<=($420|0);
        $471 = ($420|0)<(18);
        $or$cond3$i = $470 & $471;
        if ($or$cond3$i) {
         $472 = ($420|0)==(9);
         if ($472) {
          $473 = (+($sign$0|0));
          $474 = HEAP32[$x$i>>2]|0;
          $475 = (+($474>>>0));
          $476 = $473 * $475;
          $$0$i25 = $476;
          break;
         }
         $477 = ($420|0)<(9);
         if ($477) {
          $478 = (+($sign$0|0));
          $479 = HEAP32[$x$i>>2]|0;
          $480 = (+($479>>>0));
          $481 = $478 * $480;
          $482 = (8 - ($420))|0;
          $483 = (11256 + ($482<<2)|0);
          $484 = HEAP32[$483>>2]|0;
          $485 = (+($484|0));
          $486 = $481 / $485;
          $$0$i25 = $486;
          break;
         }
         $$neg32$i = (($bits$0$ph) + 27)|0;
         $487 = Math_imul($420, -3)|0;
         $488 = (($$neg32$i) + ($487))|0;
         $489 = ($488|0)>(30);
         $$pre$i17 = HEAP32[$x$i>>2]|0;
         $490 = $$pre$i17 >>> $488;
         $491 = ($490|0)==(0);
         $or$cond216$i = $489 | $491;
         if ($or$cond216$i) {
          $492 = (+($sign$0|0));
          $493 = (+($$pre$i17>>>0));
          $494 = $492 * $493;
          $495 = (($420) + -10)|0;
          $496 = (11256 + ($495<<2)|0);
          $497 = HEAP32[$496>>2]|0;
          $498 = (+($497|0));
          $499 = $494 * $498;
          $$0$i25 = $499;
          break;
         }
        }
       }
       $500 = (($420|0) % 9)&-1;
       $501 = ($500|0)==(0);
       if ($501) {
        $a$2$ph38$i = 0;$e2$0$ph$i = 0;$rp$2$ph36$i = $420;$z$1$ph37$i = $k$3$i;
       } else {
        $502 = ($420|0)>(-1);
        $503 = (($500) + 9)|0;
        $504 = $502 ? $500 : $503;
        $505 = (8 - ($504))|0;
        $506 = (11256 + ($505<<2)|0);
        $507 = HEAP32[$506>>2]|0;
        $508 = ($k$3$i|0)==(0);
        if ($508) {
         $a$0$lcssa177$i = 0;$rp$0$lcssa178$i = $420;$z$0$i = 0;
        } else {
         $509 = (1000000000 / ($507|0))&-1;
         $a$0101$i = 0;$carry$0103$i = 0;$k$4102$i = 0;$rp$0100$i = $420;
         while(1) {
          $510 = (($x$i) + ($k$4102$i<<2)|0);
          $511 = HEAP32[$510>>2]|0;
          $512 = (($511>>>0) % ($507>>>0))&-1;
          $513 = (($511>>>0) / ($507>>>0))&-1;
          $514 = (($513) + ($carry$0103$i))|0;
          HEAP32[$510>>2] = $514;
          $515 = Math_imul($512, $509)|0;
          $516 = ($k$4102$i|0)==($a$0101$i|0);
          $517 = ($514|0)==(0);
          $or$cond16$i = $516 & $517;
          $518 = (($k$4102$i) + 1)|0;
          $519 = $518 & 127;
          $520 = (($rp$0100$i) + -9)|0;
          $rp$1$i18 = $or$cond16$i ? $520 : $rp$0100$i;
          $a$1$i = $or$cond16$i ? $519 : $a$0101$i;
          $521 = ($518|0)==($k$3$i|0);
          if ($521) {
           $$lcssa322 = $515;$a$1$i$lcssa = $a$1$i;$rp$1$i18$lcssa = $rp$1$i18;
           break;
          } else {
           $a$0101$i = $a$1$i;$carry$0103$i = $515;$k$4102$i = $518;$rp$0100$i = $rp$1$i18;
          }
         }
         $522 = ($$lcssa322|0)==(0);
         if ($522) {
          $a$0$lcssa177$i = $a$1$i$lcssa;$rp$0$lcssa178$i = $rp$1$i18$lcssa;$z$0$i = $k$3$i;
         } else {
          $523 = (($k$3$i) + 1)|0;
          $524 = (($x$i) + ($k$3$i<<2)|0);
          HEAP32[$524>>2] = $$lcssa322;
          $a$0$lcssa177$i = $a$1$i$lcssa;$rp$0$lcssa178$i = $rp$1$i18$lcssa;$z$0$i = $523;
         }
        }
        $525 = (9 - ($504))|0;
        $526 = (($525) + ($rp$0$lcssa178$i))|0;
        $a$2$ph38$i = $a$0$lcssa177$i;$e2$0$ph$i = 0;$rp$2$ph36$i = $526;$z$1$ph37$i = $z$0$i;
       }
       L295: while(1) {
        $527 = ($rp$2$ph36$i|0)<(18);
        $528 = (($x$i) + ($a$2$ph38$i<<2)|0);
        if ($527) {
         $e2$0$us$i = $e2$0$ph$i;$z$1$us$i = $z$1$ph37$i;
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
           $549 = ($k$5$us$i|0)==($a$2$ph38$i|0);
           $or$cond17$us$i = $548 | $549;
           $550 = ($$sink$off0$us$i|0)==(0);
           $k$5$z$2$us$i = $550 ? $k$5$us$i : $z$2$us$i;
           $z$3$us$i = $or$cond17$us$i ? $z$2$us$i : $k$5$z$2$us$i;
           $551 = (($k$5$us$i) + -1)|0;
           if ($549) {
            $carry1$1$us$i$lcssa = $carry1$1$us$i;$z$3$us$i$lcssa = $z$3$us$i;
            break;
           } else {
            $carry1$0$us$i = $carry1$1$us$i;$k$5$in$us$i = $551;$z$2$us$i = $z$3$us$i;
           }
          }
          $552 = (($e2$0$us$i) + -29)|0;
          $553 = ($carry1$1$us$i$lcssa|0)==(0);
          if ($553) {
           $e2$0$us$i = $552;$z$1$us$i = $z$3$us$i$lcssa;
          } else {
           $$lcssa50$i = $552;$carry1$1$lcssa$lcssa$i = $carry1$1$us$i$lcssa;$z$3$lcssa$lcssa$i = $z$3$us$i$lcssa;
           break;
          }
         }
        } else {
         $529 = ($rp$2$ph36$i|0)==(18);
         if ($529) {
          $e2$0$us84$i = $e2$0$ph$i;$z$1$us85$i = $z$1$ph37$i;
         } else {
          $a$3$ph$i = $a$2$ph38$i;$e2$1$ph$i = $e2$0$ph$i;$rp$3$ph34$i = $rp$2$ph36$i;$z$5$ph$i = $z$1$ph37$i;
          break;
         }
         while(1) {
          $554 = HEAP32[$528>>2]|0;
          $555 = ($554>>>0)<(9007199);
          if (!($555)) {
           $a$3$ph$i = $a$2$ph38$i;$e2$1$ph$i = $e2$0$us84$i;$rp$3$ph34$i = 18;$z$5$ph$i = $z$1$us85$i;
           break L295;
          }
          $556 = (($z$1$us85$i) + 127)|0;
          $carry1$0$us89$i = 0;$k$5$in$us88$i = $556;$z$2$us87$i = $z$1$us85$i;
          while(1) {
           $k$5$us90$i = $k$5$in$us88$i & 127;
           $557 = (($x$i) + ($k$5$us90$i<<2)|0);
           $558 = HEAP32[$557>>2]|0;
           $559 = (_bitshift64Shl(($558|0),0,29)|0);
           $560 = tempRet0;
           $561 = (_i64Add(($559|0),($560|0),($carry1$0$us89$i|0),0)|0);
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
            $$sink$off0$us93$i = $570;$carry1$1$us94$i = $568;
           } else {
            $$sink$off0$us93$i = $561;$carry1$1$us94$i = 0;
           }
           HEAP32[$557>>2] = $$sink$off0$us93$i;
           $572 = (($z$2$us87$i) + 127)|0;
           $573 = $572 & 127;
           $574 = ($k$5$us90$i|0)!=($573|0);
           $575 = ($k$5$us90$i|0)==($a$2$ph38$i|0);
           $or$cond17$us95$i = $574 | $575;
           $576 = ($$sink$off0$us93$i|0)==(0);
           $k$5$z$2$us96$i = $576 ? $k$5$us90$i : $z$2$us87$i;
           $z$3$us97$i = $or$cond17$us95$i ? $z$2$us87$i : $k$5$z$2$us96$i;
           $577 = (($k$5$us90$i) + -1)|0;
           if ($575) {
            $carry1$1$us94$i$lcssa = $carry1$1$us94$i;$z$3$us97$i$lcssa = $z$3$us97$i;
            break;
           } else {
            $carry1$0$us89$i = $carry1$1$us94$i;$k$5$in$us88$i = $577;$z$2$us87$i = $z$3$us97$i;
           }
          }
          $578 = (($e2$0$us84$i) + -29)|0;
          $579 = ($carry1$1$us94$i$lcssa|0)==(0);
          if ($579) {
           $e2$0$us84$i = $578;$z$1$us85$i = $z$3$us97$i$lcssa;
          } else {
           $$lcssa50$i = $578;$carry1$1$lcssa$lcssa$i = $carry1$1$us94$i$lcssa;$z$3$lcssa$lcssa$i = $z$3$us97$i$lcssa;
           break;
          }
         }
        }
        $580 = (($rp$2$ph36$i) + 9)|0;
        $581 = (($a$2$ph38$i) + 127)|0;
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
        $a$2$ph38$i = $582;$e2$0$ph$i = $$lcssa50$i;$rp$2$ph36$i = $580;$z$1$ph37$i = $z$4$i;
       }
       L320: while(1) {
        $624 = (($z$5$ph$i) + 1)|0;
        $621 = $624 & 127;
        $625 = (($z$5$ph$i) + 127)|0;
        $626 = $625 & 127;
        $627 = (($x$i) + ($626<<2)|0);
        $a$3$ph183$i = $a$3$ph$i;$e2$1$ph182$i = $e2$1$ph$i;$rp$3$ph$i = $rp$3$ph34$i;
        while(1) {
         $628 = ($rp$3$ph$i|0)==(18);
         $629 = ($rp$3$ph$i|0)>(27);
         $$18$i = $629 ? 9 : 1;
         $$not$i = $628 ^ 1;
         $a$3$i = $a$3$ph183$i;$e2$1$i = $e2$1$ph182$i;
         while(1) {
          $594 = $a$3$i & 127;
          $595 = ($594|0)==($z$5$ph$i|0);
          do {
           if ($595) {
            label = 220;
           } else {
            $596 = (($x$i) + ($594<<2)|0);
            $597 = HEAP32[$596>>2]|0;
            $598 = ($597>>>0)<(9007199);
            if ($598) {
             label = 220;
             break;
            }
            $599 = ($597>>>0)>(9007199);
            if ($599) {
             break;
            }
            $600 = (($a$3$i) + 1)|0;
            $601 = $600 & 127;
            $602 = ($601|0)==($z$5$ph$i|0);
            if ($602) {
             label = 220;
             break;
            }
            $708 = (($x$i) + ($601<<2)|0);
            $709 = HEAP32[$708>>2]|0;
            $710 = ($709>>>0)<(254740991);
            if ($710) {
             label = 220;
             break;
            }
            $711 = ($709>>>0)>(254740991);
            $brmerge$i26 = $711 | $$not$i;
            if (!($brmerge$i26)) {
             $635 = $594;$a$3$i301 = $a$3$i;$e2$1$i298 = $e2$1$i;$z$7$i = $z$5$ph$i;
             break L320;
            }
           }
          } while(0);
          if ((label|0) == 220) {
           label = 0;
           if ($628) {
            label = 221;
            break L320;
           }
          }
          $603 = (($e2$1$i) + ($$18$i))|0;
          $604 = ($a$3$i|0)==($z$5$ph$i|0);
          if ($604) {
           $a$3$i = $z$5$ph$i;$e2$1$i = $603;
          } else {
           $$lcssa308 = $603;$a$3$i$lcssa300 = $a$3$i;
           break;
          }
         }
         $605 = 1 << $$18$i;
         $606 = (($605) + -1)|0;
         $607 = 1000000000 >>> $$18$i;
         $a$478$i = $a$3$i$lcssa300;$carry3$081$i = 0;$k$679$i = $a$3$i$lcssa300;$rp$477$i = $rp$3$ph$i;
         while(1) {
          $608 = (($x$i) + ($k$679$i<<2)|0);
          $609 = HEAP32[$608>>2]|0;
          $610 = $609 & $606;
          $611 = $609 >>> $$18$i;
          $612 = (($611) + ($carry3$081$i))|0;
          HEAP32[$608>>2] = $612;
          $613 = Math_imul($610, $607)|0;
          $614 = ($k$679$i|0)==($a$478$i|0);
          $615 = ($612|0)==(0);
          $or$cond19$i = $614 & $615;
          $616 = (($k$679$i) + 1)|0;
          $617 = $616 & 127;
          $618 = (($rp$477$i) + -9)|0;
          $rp$5$i = $or$cond19$i ? $618 : $rp$477$i;
          $a$5$i = $or$cond19$i ? $617 : $a$478$i;
          $619 = ($617|0)==($z$5$ph$i|0);
          if ($619) {
           $$lcssa309 = $613;$a$5$i$lcssa = $a$5$i;$rp$5$i$lcssa = $rp$5$i;
           break;
          } else {
           $a$478$i = $a$5$i;$carry3$081$i = $613;$k$679$i = $617;$rp$477$i = $rp$5$i;
          }
         }
         $620 = ($$lcssa309|0)==(0);
         if ($620) {
          $a$3$ph183$i = $a$5$i$lcssa;$e2$1$ph182$i = $$lcssa308;$rp$3$ph$i = $rp$5$i$lcssa;
          continue;
         }
         $622 = ($621|0)==($a$5$i$lcssa|0);
         if (!($622)) {
          $$lcssa308$lcssa = $$lcssa308;$$lcssa309$lcssa = $$lcssa309;$a$5$i$lcssa$lcssa = $a$5$i$lcssa;$rp$5$i$lcssa$lcssa = $rp$5$i$lcssa;
          break;
         }
         $630 = HEAP32[$627>>2]|0;
         $631 = $630 | 1;
         HEAP32[$627>>2] = $631;
         $a$3$ph183$i = $a$5$i$lcssa;$e2$1$ph182$i = $$lcssa308;$rp$3$ph$i = $rp$5$i$lcssa;
        }
        $623 = (($x$i) + ($z$5$ph$i<<2)|0);
        HEAP32[$623>>2] = $$lcssa309$lcssa;
        $a$3$ph$i = $a$5$i$lcssa$lcssa;$e2$1$ph$i = $$lcssa308$lcssa;$rp$3$ph34$i = $rp$5$i$lcssa$lcssa;$z$5$ph$i = $621;
       }
       if ((label|0) == 221) {
        if ($595) {
         $632 = (($621) + -1)|0;
         $633 = (($x$i) + ($632<<2)|0);
         HEAP32[$633>>2] = 0;
         $635 = $z$5$ph$i;$a$3$i301 = $a$3$i;$e2$1$i298 = $e2$1$i;$z$7$i = $621;
        } else {
         $635 = $594;$a$3$i301 = $a$3$i;$e2$1$i298 = $e2$1$i;$z$7$i = $z$5$ph$i;
        }
       }
       $634 = (($x$i) + ($635<<2)|0);
       $636 = HEAP32[$634>>2]|0;
       $637 = (+($636>>>0));
       $638 = (($a$3$i301) + 1)|0;
       $639 = $638 & 127;
       $640 = ($639|0)==($z$7$i|0);
       if ($640) {
        $697 = (($a$3$i301) + 2)|0;
        $698 = $697 & 127;
        $699 = (($698) + -1)|0;
        $700 = (($x$i) + ($699<<2)|0);
        HEAP32[$700>>2] = 0;
        $z$7$1$i = $698;
       } else {
        $z$7$1$i = $z$7$i;
       }
       $701 = $637 * 1.0E+9;
       $702 = (($x$i) + ($639<<2)|0);
       $703 = HEAP32[$702>>2]|0;
       $704 = (+($703>>>0));
       $705 = $701 + $704;
       $661 = (+($sign$0|0));
       $643 = $661 * $705;
       $681 = (($e2$1$i298) + 53)|0;
       $687 = (($681) - ($emin$0$ph))|0;
       $688 = ($687|0)<($bits$0$ph|0);
       $706 = ($687|0)<(0);
       $$$i = $706 ? 0 : $687;
       $denormal$0$i = $688&1;
       $$010$i = $688 ? $$$i : $bits$0$ph;
       $707 = ($$010$i|0)<(53);
       if ($707) {
        $641 = (105 - ($$010$i))|0;
        $642 = (+_scalbn(1.0,$641));
        $644 = (+_copysignl($642,$643));
        $645 = (53 - ($$010$i))|0;
        $646 = (+_scalbn(1.0,$645));
        $647 = (+_fmodl($643,$646));
        $648 = $643 - $647;
        $649 = $644 + $648;
        $bias$0$i23 = $644;$frac$0$i = $647;$y$1$i22 = $649;
       } else {
        $bias$0$i23 = 0.0;$frac$0$i = 0.0;$y$1$i22 = $643;
       }
       $650 = (($a$3$i301) + 2)|0;
       $651 = $650 & 127;
       $652 = ($651|0)==($z$7$1$i|0);
       do {
        if ($652) {
         $frac$2$i = $frac$0$i;
        } else {
         $653 = (($x$i) + ($651<<2)|0);
         $654 = HEAP32[$653>>2]|0;
         $655 = ($654>>>0)<(500000000);
         do {
          if ($655) {
           $656 = ($654|0)==(0);
           if ($656) {
            $657 = (($a$3$i301) + 3)|0;
            $658 = $657 & 127;
            $659 = ($658|0)==($z$7$1$i|0);
            if ($659) {
             $frac$1$i = $frac$0$i;
             break;
            }
           }
           $660 = $661 * 0.25;
           $662 = $660 + $frac$0$i;
           $frac$1$i = $662;
          } else {
           $663 = ($654>>>0)>(500000000);
           if ($663) {
            $664 = $661 * 0.75;
            $665 = $664 + $frac$0$i;
            $frac$1$i = $665;
            break;
           }
           $666 = (($a$3$i301) + 3)|0;
           $667 = $666 & 127;
           $668 = ($667|0)==($z$7$1$i|0);
           if ($668) {
            $669 = $661 * 0.5;
            $670 = $669 + $frac$0$i;
            $frac$1$i = $670;
            break;
           } else {
            $671 = $661 * 0.75;
            $672 = $671 + $frac$0$i;
            $frac$1$i = $672;
            break;
           }
          }
         } while(0);
         $673 = (53 - ($$010$i))|0;
         $674 = ($673|0)>(1);
         if (!($674)) {
          $frac$2$i = $frac$1$i;
          break;
         }
         $675 = (+_fmodl($frac$1$i,1.0));
         $676 = $675 != 0.0;
         if ($676) {
          $frac$2$i = $frac$1$i;
          break;
         }
         $677 = $frac$1$i + 1.0;
         $frac$2$i = $677;
        }
       } while(0);
       $678 = $y$1$i22 + $frac$2$i;
       $679 = $678 - $bias$0$i23;
       $680 = $681 & 2147483647;
       $682 = (-2 - ($sum$i))|0;
       $683 = ($680|0)>($682|0);
       do {
        if ($683) {
         $684 = (+Math_abs((+$679)));
         $685 = !($684 >= 9007199254740992.0);
         if ($685) {
          $denormal$2$i = $denormal$0$i;$e2$2$i = $e2$1$i298;$y$2$i24 = $679;
         } else {
          $686 = ($$010$i|0)==($687|0);
          $or$cond20$i = $688 & $686;
          $denormal$1$i = $or$cond20$i ? 0 : $denormal$0$i;
          $689 = $679 * 0.5;
          $690 = (($e2$1$i298) + 1)|0;
          $denormal$2$i = $denormal$1$i;$e2$2$i = $690;$y$2$i24 = $689;
         }
         $691 = (($e2$2$i) + 50)|0;
         $692 = ($691|0)>($324|0);
         if (!($692)) {
          $693 = ($denormal$2$i|0)!=(0);
          $694 = $frac$2$i != 0.0;
          $or$cond8$i = $694 & $693;
          if (!($or$cond8$i)) {
           $e2$3$i = $e2$2$i;$y$3$i = $y$2$i24;
           break;
          }
         }
         $695 = (___errno_location()|0);
         HEAP32[$695>>2] = 34;
         $e2$3$i = $e2$2$i;$y$3$i = $y$2$i24;
        } else {
         $e2$3$i = $e2$1$i298;$y$3$i = $679;
        }
       } while(0);
       $696 = (+_scalbnl($y$3$i,$e2$3$i));
       $$0$i25 = $696;
      }
     } while(0);
     $$0 = $$0$i25;
     STACKTOP = sp;return (+$$0);
    }
   } while(0);
   $103 = HEAP32[$1>>2]|0;
   $104 = ($103|0)==(0|0);
   if (!($104)) {
    $105 = HEAP32[$0>>2]|0;
    $106 = ((($105)) + -1|0);
    HEAP32[$0>>2] = $106;
   }
   $107 = (___errno_location()|0);
   HEAP32[$107>>2] = 22;
   ___shlim($f,0);
   $$0 = 0.0;
   STACKTOP = sp;return (+$$0);
  }
 } while(0);
 if ((label|0) == 23) {
  $41 = HEAP32[$1>>2]|0;
  $42 = ($41|0)==(0|0);
  if (!($42)) {
   $43 = HEAP32[$0>>2]|0;
   $44 = ((($43)) + -1|0);
   HEAP32[$0>>2] = $44;
  }
  $notlhs = ($pok|0)==(0);
  $notrhs = ($i$0$lcssa>>>0)<(4);
  $or$cond9$not = $notrhs | $notlhs;
  $brmerge = $or$cond9$not | $42;
  if (!($brmerge)) {
   $$promoted = HEAP32[$0>>2]|0;
   $46 = $$promoted;$i$1 = $i$0$lcssa;
   while(1) {
    $45 = ((($46)) + -1|0);
    $47 = (($i$1) + -1)|0;
    $$old8 = ($47>>>0)>(3);
    if ($$old8) {
     $46 = $45;$i$1 = $47;
    } else {
     $$lcssa = $45;
     break;
    }
   }
   HEAP32[$0>>2] = $$lcssa;
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
 $0 = ((($f)) + 104|0);
 HEAP32[$0>>2] = $lim;
 $1 = ((($f)) + 8|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($f)) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $2;
 $6 = $4;
 $7 = (($5) - ($6))|0;
 $8 = ((($f)) + 108|0);
 HEAP32[$8>>2] = $7;
 $9 = ($lim|0)!=(0);
 $10 = ($7|0)>($lim|0);
 $or$cond = $9 & $10;
 if ($or$cond) {
  $11 = (($4) + ($lim)|0);
  $12 = ((($f)) + 100|0);
  HEAP32[$12>>2] = $11;
  return;
 } else {
  $13 = ((($f)) + 100|0);
  HEAP32[$13>>2] = $5;
  return;
 }
}
function ___shgetc($f) {
 $f = $f|0;
 var $$0 = 0, $$phi$trans$insert = 0, $$phi$trans$insert3 = 0, $$pre = 0, $$pre4 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0;
 var $40 = 0, $41 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 104|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0);
 if ($2) {
  label = 3;
 } else {
  $3 = ((($f)) + 108|0);
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
   $$phi$trans$insert = ((($f)) + 8|0);
   if ($10) {
    $$pre = HEAP32[$$phi$trans$insert>>2]|0;
    $11 = $$pre;
    $26 = $$pre;$41 = $11;
    label = 9;
   } else {
    $12 = HEAP32[$$phi$trans$insert>>2]|0;
    $13 = ((($f)) + 4|0);
    $14 = HEAP32[$13>>2]|0;
    $15 = $12;
    $16 = $14;
    $17 = (($15) - ($16))|0;
    $18 = ((($f)) + 108|0);
    $19 = HEAP32[$18>>2]|0;
    $20 = (($9) - ($19))|0;
    $21 = (($20) + -1)|0;
    $22 = ($17|0)>($21|0);
    if ($22) {
     $23 = (($14) + ($21)|0);
     $24 = ((($f)) + 100|0);
     HEAP32[$24>>2] = $23;
     $27 = $12;
    } else {
     $26 = $15;$41 = $12;
     label = 9;
    }
   }
   if ((label|0) == 9) {
    $25 = ((($f)) + 100|0);
    HEAP32[$25>>2] = $26;
    $27 = $41;
   }
   $28 = ($27|0)==(0|0);
   $$phi$trans$insert3 = ((($f)) + 4|0);
   $$pre4 = HEAP32[$$phi$trans$insert3>>2]|0;
   if (!($28)) {
    $29 = $27;
    $30 = $$pre4;
    $31 = ((($f)) + 108|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = (($29) + 1)|0;
    $34 = (($33) - ($30))|0;
    $35 = (($34) + ($32))|0;
    HEAP32[$31>>2] = $35;
   }
   $36 = ((($$pre4)) + -1|0);
   $37 = HEAP8[$36>>0]|0;
   $38 = $37&255;
   $39 = ($38|0)==($6|0);
   if ($39) {
    $$0 = $6;
    return ($$0|0);
   }
   $40 = $6&255;
   HEAP8[$36>>0] = $40;
   $$0 = $6;
   return ($$0|0);
  }
 }
 $8 = ((($f)) + 100|0);
 HEAP32[$8>>2] = 0;
 $$0 = -1;
 return ($$0|0);
}
function ___expo2($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $x + -1416.0996898839683;
 $1 = (+Math_exp((+$0)));
 $2 = $1 * 2.2471164185778949E+307;
 $3 = $2 * 2.2471164185778949E+307;
 return (+$3);
}
function ___expo2f($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $x + -162.88958740234375;
 $1 = (+Math_exp((+$0)));
 $2 = $1 * 1.6615349947311448E+35;
 $3 = $2 * 1.6615349947311448E+35;
 return (+$3);
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
  return ($$0|0);
 } else if ((($4|0) == 2047)) {
  $10 = $1 & 1048575;
  $11 = ($0|0)==(0);
  $12 = ($10|0)==(0);
  $13 = $11 & $12;
  $14 = $13&1;
  $$0 = $14;
  return ($$0|0);
 } else {
  $$0 = 4;
  return ($$0|0);
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
 if ((($2|0) == 255)) {
  $$mask1 = $0 & 8388607;
  $not$ = ($$mask1|0)==(0);
  $5 = $not$&1;
  $$0 = $5;
  return ($$0|0);
 } else if ((($2|0) == 0)) {
  $$mask = $0 & 2147483647;
  $3 = ($$mask|0)!=(0);
  $4 = $3 ? 3 : 2;
  $$0 = $4;
  return ($$0|0);
 } else {
  $$0 = 4;
  return ($$0|0);
 }
 return (0)|0;
}
function ___signbit($x) {
 $x = +$x;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),63)|0);
 $3 = tempRet0;
 return ($2|0);
}
function ___signbitf($x) {
 $x = +$x;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 >>> 31;
 return ($1|0);
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
  return (+$$0);
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
  return (+$$0);
 } else {
  $22 = (+Math_log((+$x)));
  $23 = $22 + 0.69314718055994529;
  $$0 = $23;
  return (+$$0);
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
  return (+$$0);
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
  return (+$$0);
 } else {
  $19 = (+Math_log((+$x)));
  $20 = $19 + 0.69314718246459961;
  $$0 = $20;
  return (+$$0);
 }
 return +(0.0);
}
function _acoshl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_acosh($x));
 return (+$0);
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
 $29 = -$$0;
 $30 = $28 ? $29 : $$0;
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
 $25 = -$$0;
 $26 = $24 ? $25 : $$0;
 STACKTOP = sp;return (+$26);
}
function _asinhl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_asinh($x));
 return (+$0);
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
 $24 = -$y$0;
 $25 = $23 ? $24 : $y$0;
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
 $20 = -$y$0;
 $21 = $19 ? $20 : $y$0;
 STACKTOP = sp;return (+$21);
}
function _atanhl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_atanh($x));
 return (+$0);
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
  return (+$$0);
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
    return (+$$0);
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
 return (+$$0);
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
  return (+$$0);
 }
 $4 = ($1>>>0)<(8388608);
 do {
  if ($4) {
   $5 = ($1|0)==(0);
   if ($5) {
    $$0 = $x;
    return (+$$0);
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
 return (+$$0);
}
function _cbrtl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_cbrt($x));
 return (+$0);
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
 return (+$7);
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
 return (+$5);
}
function _copysignl($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_copysign($x,$y));
 return (+$0);
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
 return (+$0);
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
   $or$cond = $9 & $4;
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
 $34 = (11288 + ($33<<3)|0);
 $35 = +HEAPF64[$34>>3];
 $36 = $33 | 1;
 $37 = (11288 + ($36<<3)|0);
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
 $24 = (15384 + ($20<<3)|0);
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
 return (+$0);
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
 do {
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
   } else {
    label = 11;
   }
  } else {
   $15 = ($2>>>0)>(1071001154);
   if ($15) {
    $16 = ($2>>>0)<(1072734898);
    if (!($16)) {
     label = 11;
     break;
    }
    $17 = ($3|0)==(0);
    if ($17) {
     $18 = $x + -0.69314718036912382;
     $hi$0 = $18;$k$0 = 1;$lo$0 = 1.9082149292705877E-10;
     label = 12;
     break;
    } else {
     $19 = $x + 0.69314718036912382;
     $hi$0 = $19;$k$0 = -1;$lo$0 = -1.9082149292705877E-10;
     label = 12;
     break;
    }
   }
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
 } while(0);
 if ((label|0) == 11) {
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
  label = 12;
 }
 if ((label|0) == 12) {
  $29 = $hi$0 - $lo$0;
  $30 = $hi$0 - $29;
  $31 = $30 - $lo$0;
  $$02 = $29;$c$0 = $31;$k$1 = $k$0;
 }
 $35 = $$02 * 0.5;
 $36 = $$02 * $35;
 $37 = $36 * 2.0109921818362437E-7;
 $38 = 4.0082178273293624E-6 - $37;
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
 if ((($k$1|0) == 1)) {
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
 } else if ((($k$1|0) == -1)) {
  $62 = $$02 - $61;
  $63 = $62 * 0.5;
  $64 = $63 + -0.5;
  $$0 = $64;
  STACKTOP = sp;return (+$$0);
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
   $80 = $78 * 2.0;
   $81 = $80 * 8.9884656743115795E+307;
   $82 = $75 * $78;
   $y$0 = $79 ? $81 : $82;
   $83 = $y$0 + -1.0;
   $$0 = $83;
   STACKTOP = sp;return (+$$0);
  }
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
 do {
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
   } else {
    label = 11;
   }
  } else {
   $8 = ($1>>>0)>(1051816472);
   if ($8) {
    $9 = ($1>>>0)<(1065686418);
    if (!($9)) {
     label = 11;
     break;
    }
    $10 = ($2|0)==(0);
    if ($10) {
     $11 = $x + -0.69313812255859375;
     $hi$0 = $11;$k$0 = 1;$lo$0 = 9.0580006144591607E-6;
     label = 12;
     break;
    } else {
     $12 = $x + 0.69313812255859375;
     $hi$0 = $12;$k$0 = -1;$lo$0 = -9.0580006144591607E-6;
     label = 12;
     break;
    }
   }
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
 } while(0);
 if ((label|0) == 11) {
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
  label = 12;
 }
 if ((label|0) == 12) {
  $22 = $hi$0 - $lo$0;
  $23 = $hi$0 - $22;
  $24 = $23 - $lo$0;
  $$02 = $22;$c$0 = $24;$k$1 = $k$0;
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
   $66 = $64 * 2.0;
   $67 = $66 * 1.7014118346046923E+38;
   $68 = $61 * $64;
   $y$0 = $65 ? $67 : $68;
   $69 = $y$0 + -1.0;
   $$0 = $69;
   STACKTOP = sp;return (+$$0);
  }
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
 return +(0.0);
}
function _expm1l($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_expm1($x));
 return (+$0);
}
function _fdim($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
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
  return (+$$0);
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
  return (+$$0);
 }
 $16 = $x > $y;
 $17 = $x - $y;
 $18 = $16 ? $17 : 0.0;
 $$0 = $18;
 return (+$$0);
}
function _fdimf($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = ($1>>>0)>(2139095040);
 if ($2) {
  $$0 = $x;
  return (+$$0);
 }
 $3 = (HEAPF32[tempDoublePtr>>2]=$y,HEAP32[tempDoublePtr>>2]|0);
 $4 = $3 & 2147483647;
 $5 = ($4>>>0)>(2139095040);
 if ($5) {
  $$0 = $y;
  return (+$$0);
 }
 $6 = $x > $y;
 $7 = $x - $y;
 $8 = $6 ? $7 : 0.0;
 $$0 = $8;
 return (+$$0);
}
function _fdiml($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_fdim($x,$y));
 return (+$0);
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
 return ($8|0);
}
function _finitef($x) {
 $x = +$x;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2139095040;
 $2 = ($1>>>0)<(2139095040);
 $3 = $2&1;
 return ($3|0);
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
    $149 = $148 ^ $144;
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
 $or$cond5 = $16 | $or$cond;
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
 return (+$0);
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
  return (+$$0);
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
  return (+$$0);
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
  return (+$$0);
 } else {
  $21 = ($1|0)<(0);
  $22 = $21 ? $y : $x;
  $$0 = $22;
  return (+$$0);
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
 if ($2) {
  $$0 = $y;
  return (+$$0);
 }
 $3 = (HEAPF32[tempDoublePtr>>2]=$y,HEAP32[tempDoublePtr>>2]|0);
 $4 = $3 & 2147483647;
 $5 = ($4>>>0)>(2139095040);
 if ($5) {
  $$0 = $x;
  return (+$$0);
 }
 $$unshifted = $3 ^ $0;
 $6 = ($$unshifted|0)<(0);
 if ($6) {
  $7 = ($0|0)<(0);
  $8 = $7 ? $y : $x;
  $$0 = $8;
  return (+$$0);
 } else {
  $9 = $x < $y;
  $10 = $9 ? $y : $x;
  $$0 = $10;
  return (+$$0);
 }
 return +(0.0);
}
function _fmaxl($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_fmax($x,$y));
 return (+$0);
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
  return (+$$0);
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
  return (+$$0);
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
  return (+$$0);
 } else {
  $21 = ($1|0)<(0);
  $22 = $21 ? $x : $y;
  $$0 = $22;
  return (+$$0);
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
 if ($2) {
  $$0 = $y;
  return (+$$0);
 }
 $3 = (HEAPF32[tempDoublePtr>>2]=$y,HEAP32[tempDoublePtr>>2]|0);
 $4 = $3 & 2147483647;
 $5 = ($4>>>0)>(2139095040);
 if ($5) {
  $$0 = $x;
  return (+$$0);
 }
 $$unshifted = $3 ^ $0;
 $6 = ($$unshifted|0)<(0);
 if ($6) {
  $7 = ($0|0)<(0);
  $8 = $7 ? $x : $y;
  $$0 = $8;
  return (+$$0);
 } else {
  $9 = $x < $y;
  $10 = $9 ? $x : $y;
  $$0 = $10;
  return (+$$0);
 }
 return +(0.0);
}
function _fminl($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_fmin($x,$y));
 return (+$0);
}
function _fmod($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $$lcssa7 = 0, $$x = 0.0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0;
 var $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0.0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0;
 var $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0;
 var $15 = 0, $150 = 0.0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0.0, $24 = 0.0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0.0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0.0;
 var $ex$0$lcssa = 0, $ex$026 = 0, $ex$1 = 0, $ex$2$lcssa = 0, $ex$212 = 0, $ex$3$lcssa = 0, $ex$39 = 0, $ey$0$lcssa = 0, $ey$020 = 0, $ey$1$ph = 0, $or$cond = 0, label = 0, sp = 0;
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
    $35 = $x * 0.0;
    $$x = $34 ? $35 : $x;
    return (+$$x);
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
   L23: do {
    if ($82) {
     $152 = $93;$153 = $87;$154 = $88;$94 = $83;$96 = $84;$ex$212 = $ex$1;
     while(1) {
      if ($152) {
       $95 = ($94|0)==($85|0);
       $97 = ($96|0)==($86|0);
       $98 = $95 & $97;
       if ($98) {
        break;
       } else {
        $100 = $153;$101 = $154;
       }
      } else {
       $100 = $94;$101 = $96;
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
       $152 = $112;$153 = $106;$154 = $107;$94 = $102;$96 = $103;$ex$212 = $104;
      } else {
       $$lcssa7 = $112;$113 = $102;$115 = $103;$155 = $106;$156 = $107;$ex$2$lcssa = $104;
       break L23;
      }
     }
     $99 = $x * 0.0;
     $$0 = $99;
     return (+$$0);
    } else {
     $$lcssa7 = $93;$113 = $83;$115 = $84;$155 = $87;$156 = $88;$ex$2$lcssa = $ex$1;
    }
   } while(0);
   if ($$lcssa7) {
    $114 = ($113|0)==($85|0);
    $116 = ($115|0)==($86|0);
    $117 = $114 & $116;
    if ($117) {
     $125 = $x * 0.0;
     $$0 = $125;
     return (+$$0);
    } else {
     $118 = $156;$120 = $155;
    }
   } else {
    $118 = $115;$120 = $113;
   }
   $119 = ($118>>>0)<(1048576);
   $121 = ($120>>>0)<(0);
   $122 = ($118|0)==(1048576);
   $123 = $122 & $121;
   $124 = $119 | $123;
   if ($124) {
    $126 = $120;$127 = $118;$ex$39 = $ex$2$lcssa;
    while(1) {
     $128 = (_bitshift64Shl(($126|0),($127|0),1)|0);
     $129 = tempRet0;
     $130 = (($ex$39) + -1)|0;
     $131 = ($129>>>0)<(1048576);
     $132 = ($128>>>0)<(0);
     $133 = ($129|0)==(1048576);
     $134 = $133 & $132;
     $135 = $131 | $134;
     if ($135) {
      $126 = $128;$127 = $129;$ex$39 = $130;
     } else {
      $137 = $128;$138 = $129;$ex$3$lcssa = $130;
      break;
     }
    }
   } else {
    $137 = $120;$138 = $118;$ex$3$lcssa = $ex$2$lcssa;
   }
   $136 = ($ex$3$lcssa|0)>(0);
   if ($136) {
    $139 = (_i64Add(($137|0),($138|0),0,-1048576)|0);
    $140 = tempRet0;
    $141 = (_bitshift64Shl(($ex$3$lcssa|0),0,52)|0);
    $142 = tempRet0;
    $143 = $139 | $141;
    $144 = $140 | $142;
    $149 = $144;$151 = $143;
   } else {
    $145 = (1 - ($ex$3$lcssa))|0;
    $146 = (_bitshift64Lshr(($137|0),($138|0),($145|0))|0);
    $147 = tempRet0;
    $149 = $147;$151 = $146;
   }
   $148 = $149 | $10;
   HEAP32[tempDoublePtr>>2] = $151;HEAP32[tempDoublePtr+4>>2] = $148;$150 = +HEAPF64[tempDoublePtr>>3];
   $$0 = $150;
   return (+$$0);
  }
 }
 $23 = $x * $y;
 $24 = $23 / $23;
 $$0 = $24;
 return (+$$0);
}
function _fmodf($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $$lcssa = 0, $$lcssa6 = 0, $$x = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0.0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0.0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0.0, $62 = 0, $63 = 0, $7 = 0, $8 = 0, $9 = 0, $ex$0$lcssa = 0, $ex$025 = 0, $ex$1 = 0, $ex$2$lcssa = 0, $ex$211 = 0, $ex$3$lcssa = 0, $ex$38 = 0, $ey$0$lcssa = 0, $ey$019 = 0, $ey$1$ph = 0, $i$026 = 0, $i$120 = 0;
 var $or$cond = 0, $uxi$0 = 0, $uxi$1$lcssa = 0, $uxi$112 = 0, $uxi$2 = 0, $uxi$3$lcssa = 0, $uxi$3$ph = 0, $uxi$39 = 0, $uxi$4 = 0, $uy$sroa$0$0$ph = 0, label = 0, sp = 0;
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
    $17 = $x * 0.0;
    $$x = $16 ? $17 : $x;
    return (+$$x);
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
   L23: do {
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
       $$lcssa = $46;$$lcssa6 = $47;$ex$2$lcssa = $44;$uxi$1$lcssa = $43;
       break L23;
      }
     }
     $42 = $x * 0.0;
     $$0 = $42;
     return (+$$0);
    } else {
     $$lcssa = $39;$$lcssa6 = $40;$ex$2$lcssa = $ex$1;$uxi$1$lcssa = $uxi$0;
    }
   } while(0);
   if ($$lcssa6) {
    $48 = ($uxi$1$lcssa|0)==($uy$sroa$0$0$ph|0);
    if ($48) {
     $50 = $x * 0.0;
     $$0 = $50;
     return (+$$0);
    } else {
     $uxi$3$ph = $$lcssa;
    }
   } else {
    $uxi$3$ph = $uxi$1$lcssa;
   }
   $49 = ($uxi$3$ph>>>0)<(8388608);
   if ($49) {
    $ex$38 = $ex$2$lcssa;$uxi$39 = $uxi$3$ph;
    while(1) {
     $51 = $uxi$39 << 1;
     $52 = (($ex$38) + -1)|0;
     $53 = ($51>>>0)<(8388608);
     if ($53) {
      $ex$38 = $52;$uxi$39 = $51;
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
   return (+$$0);
  }
 }
 $12 = $x * $y;
 $13 = $12 / $12;
 $$0 = $13;
 return (+$$0);
}
function _fmodl($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_fmod($x,$y));
 return (+$0);
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
  return (+$$0);
 } else if ((($4|0) == 2047)) {
  $$0 = $x;
  return (+$$0);
 } else {
  $10 = (($4) + -1022)|0;
  HEAP32[$e>>2] = $10;
  $11 = $1 & -2146435073;
  $12 = $11 | 1071644672;
  HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $12;$13 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $13;
  return (+$$0);
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
  return (+$$0);
 } else if ((($2|0) == 255)) {
  $$0 = $x;
  return (+$$0);
 } else {
  $8 = (($2) + -126)|0;
  HEAP32[$e>>2] = $8;
  $9 = $0 & -2139095041;
  $10 = $9 | 1056964608;
  $11 = (HEAP32[tempDoublePtr>>2]=$10,+HEAPF32[tempDoublePtr>>2]);
  $$0 = $11;
  return (+$$0);
 }
 return +(0.0);
}
function _frexpl($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_frexp($x,$e));
 return (+$0);
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
  return (+$$0);
 }
 $22 = ($15|0)==(2047);
 $23 = ($13|0)==(0);
 $24 = ($14|0)==(0);
 $25 = $23 & $24;
 $or$cond = $25 | $22;
 if ($or$cond) {
  $$0 = $19;
  return (+$$0);
 }
 $26 = (($15) - ($17))|0;
 $27 = ($26|0)>(64);
 if ($27) {
  $28 = $19 + $20;
  $$0 = $28;
  return (+$$0);
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
 return (+$$0);
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
  return (+$$0);
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
  return (+$$0);
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
 return (+$$0);
}
function _hypotl($x,$y) {
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_hypot($x,$y));
 return (+$0);
}
function _llrint($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_rint($x));
 $1 = (~~$0)>>>0;
 $2 = +Math_abs($0) >= 1.0 ? $0 > 0.0 ? (~~+Math_min(+Math_floor($0 / 4294967296.0), 4294967295.0)) >>> 0 : ~~+Math_ceil(($0 - +(~~$0 >>> 0)) / 4294967296.0) >>> 0 : 0;
 tempRet0 = ($2);
 return ($1|0);
}
function _llrintf($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_rintf($x));
 $1 = (~~$0)>>>0;
 $2 = +Math_abs($0) >= 1.0 ? $0 > 0.0 ? (~~+Math_min(+Math_floor($0 / 4294967296.0), 4294967295.0)) >>> 0 : ~~+Math_ceil(($0 - +(~~$0 >>> 0)) / 4294967296.0) >>> 0 : 0;
 tempRet0 = ($2);
 return ($1|0);
}
function _llrintl($x) {
 $x = +$x;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_llrint($x)|0);
 $1 = tempRet0;
 tempRet0 = ($1);
 return ($0|0);
}
function _llround($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_round($x));
 $1 = (~~$0)>>>0;
 $2 = +Math_abs($0) >= 1.0 ? $0 > 0.0 ? (~~+Math_min(+Math_floor($0 / 4294967296.0), 4294967295.0)) >>> 0 : ~~+Math_ceil(($0 - +(~~$0 >>> 0)) / 4294967296.0) >>> 0 : 0;
 tempRet0 = ($2);
 return ($1|0);
}
function _llroundf($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_roundf($x));
 $1 = (~~$0)>>>0;
 $2 = +Math_abs($0) >= 1.0 ? $0 > 0.0 ? (~~+Math_min(+Math_floor($0 / 4294967296.0), 4294967295.0)) >>> 0 : ~~+Math_ceil(($0 - +(~~$0 >>> 0)) / 4294967296.0) >>> 0 : 0;
 tempRet0 = ($2);
 return ($1|0);
}
function _llroundl($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_roundl($x));
 $1 = (~~$0)>>>0;
 $2 = +Math_abs($0) >= 1.0 ? $0 > 0.0 ? (~~+Math_min(+Math_floor($0 / 4294967296.0), 4294967295.0)) >>> 0 : ~~+Math_ceil(($0 - +(~~$0 >>> 0)) / 4294967296.0) >>> 0 : 0;
 tempRet0 = ($2);
 return ($1|0);
}
function _log10($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0.0;
 var $26 = 0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0;
 var $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0, $49 = 0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0.0;
 var $62 = 0.0, $63 = 0.0, $64 = 0.0, $65 = 0.0, $66 = 0.0, $67 = 0.0, $68 = 0.0, $69 = 0.0, $7 = 0, $70 = 0, $8 = 0.0, $9 = 0.0, $hx$0 = 0, $k$0 = 0, $or$cond = 0, $or$cond4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = ($1>>>0)<(1048576);
 $3 = ($1|0)<(0);
 $or$cond = $3 | $2;
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
    return (+$$0);
   }
   if (!($3)) {
    $12 = $x * 18014398509481984.0;
    HEAPF64[tempDoublePtr>>3] = $12;$13 = HEAP32[tempDoublePtr>>2]|0;
    $14 = HEAP32[tempDoublePtr+4>>2]|0;
    $26 = $13;$70 = $14;$hx$0 = $14;$k$0 = -1077;
    break;
   }
   $10 = $x - $x;
   $11 = $10 / 0.0;
   $$0 = $11;
   return (+$$0);
  } else {
   $15 = ($1>>>0)>(2146435071);
   if ($15) {
    $$0 = $x;
    return (+$$0);
   }
   $16 = ($1|0)==(1072693248);
   $17 = ($0|0)==(0);
   $18 = (0)==(0);
   $19 = $17 & $18;
   $or$cond4 = $19 & $16;
   if ($or$cond4) {
    $$0 = 0.0;
    return (+$$0);
   } else {
    $26 = $0;$70 = $1;$hx$0 = $1;$k$0 = -1023;
   }
  }
 } while(0);
 $20 = (($hx$0) + 614242)|0;
 $21 = $20 >>> 20;
 $22 = (($k$0) + ($21))|0;
 $23 = $20 & 1048575;
 $24 = (($23) + 1072079006)|0;
 HEAP32[tempDoublePtr>>2] = $26;HEAP32[tempDoublePtr+4>>2] = $24;$25 = +HEAPF64[tempDoublePtr>>3];
 $27 = $25 + -1.0;
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
 return (+$$0);
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
    return (+$$0);
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
   return (+$$0);
  } else {
   $10 = ($0>>>0)>(2139095039);
   if ($10) {
    $$0 = $x;
    return (+$$0);
   }
   $11 = ($0|0)==(1065353216);
   if ($11) {
    $$0 = 0.0;
    return (+$$0);
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
 $44 = $43 * 3.1689971365267411E-5;
 $45 = $42 - $44;
 $46 = $40 * 0.434326171875;
 $47 = $46 + $45;
 $48 = $35 * 0.434326171875;
 $49 = $48 + $47;
 $50 = $41 * 0.30102920532226563;
 $51 = $50 + $49;
 $$0 = $51;
 return (+$$0);
}
function _log10l($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_log10($x));
 return (+$0);
}
function _log1p($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0.0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0.0, $25 = 0.0;
 var $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0, $31 = 0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0;
 var $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0.0, $60 = 0.0, $61 = 0.0;
 var $7 = 0.0, $8 = 0, $9 = 0, $__x = 0.0, $c$1 = 0.0, $c$2 = 0.0, $f$1 = 0.0, $k$1 = 0.0, $or$cond = 0, $phitmp = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = ($1>>>0)<(1071284858);
 $3 = ($1|0)<(0);
 $or$cond = $3 | $2;
 do {
  if ($or$cond) {
   $4 = ($1>>>0)>(3220176895);
   if ($4) {
    $5 = $x == -1.0;
    if ($5) {
     $$0 = -inf;
     STACKTOP = sp;return (+$$0);
    }
    $6 = $x - $x;
    $7 = $6 / 0.0;
    $$0 = $7;
    STACKTOP = sp;return (+$$0);
   }
   $8 = (_bitshift64Shl(($1|0),0,1)|0);
   $9 = tempRet0;
   $10 = ($8>>>0)<(2034237440);
   if (!($10)) {
    $14 = ($1>>>0)<(3218259653);
    if ($14) {
     $c$2 = 0.0;$f$1 = $x;$k$1 = 0.0;
     break;
    } else {
     label = 10;
     break;
    }
   }
   $11 = $1 & 2146435072;
   $12 = ($11|0)==(0);
   if (!($12)) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   }
   $13 = $x;
   $__x = $13;
   $$0 = $x;
   STACKTOP = sp;return (+$$0);
  } else {
   $15 = ($1>>>0)>(2146435071);
   if ($15) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   } else {
    label = 10;
   }
  }
 } while(0);
 if ((label|0) == 10) {
  $16 = $x + 1.0;
  HEAPF64[tempDoublePtr>>3] = $16;$17 = HEAP32[tempDoublePtr>>2]|0;
  $18 = HEAP32[tempDoublePtr+4>>2]|0;
  $19 = (($18) + 614242)|0;
  $20 = $19 >>> 20;
  $21 = (($20) + -1023)|0;
  $22 = ($21|0)<(54);
  if ($22) {
   $23 = ($21|0)>(1);
   $24 = $16 - $x;
   $25 = 1.0 - $24;
   $26 = $16 + -1.0;
   $27 = $x - $26;
   $28 = $23 ? $25 : $27;
   $29 = $28 / $16;
   $c$1 = $29;
  } else {
   $c$1 = 0.0;
  }
  $30 = $19 & 1048575;
  $31 = (($30) + 1072079006)|0;
  HEAP32[tempDoublePtr>>2] = $17;HEAP32[tempDoublePtr+4>>2] = $31;$32 = +HEAPF64[tempDoublePtr>>3];
  $33 = $32 + -1.0;
  $phitmp = (+($21|0));
  $c$2 = $c$1;$f$1 = $33;$k$1 = $phitmp;
 }
 $34 = $f$1 * 0.5;
 $35 = $f$1 * $34;
 $36 = $f$1 + 2.0;
 $37 = $f$1 / $36;
 $38 = $37 * $37;
 $39 = $38 * $38;
 $40 = $39 * 0.15313837699209373;
 $41 = $40 + 0.22222198432149784;
 $42 = $39 * $41;
 $43 = $42 + 0.39999999999409419;
 $44 = $39 * $43;
 $45 = $39 * 0.14798198605116586;
 $46 = $45 + 0.1818357216161805;
 $47 = $39 * $46;
 $48 = $47 + 0.28571428743662391;
 $49 = $39 * $48;
 $50 = $49 + 0.66666666666667351;
 $51 = $38 * $50;
 $52 = $44 + $51;
 $53 = $35 + $52;
 $54 = $37 * $53;
 $55 = $k$1 * 1.9082149292705877E-10;
 $56 = $c$2 + $55;
 $57 = $56 + $54;
 $58 = $57 - $35;
 $59 = $f$1 + $58;
 $60 = $k$1 * 0.69314718036912382;
 $61 = $60 + $59;
 $$0 = $61;
 STACKTOP = sp;return (+$$0);
}
function _log1pf($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0;
 var $26 = 0.0, $27 = 0, $28 = 0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0;
 var $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0.0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $6 = 0.0, $7 = 0, $8 = 0, $9 = 0, $__x = 0.0, $c$1 = 0.0, $c$2 = 0.0, $f$1 = 0.0, $k$1 = 0.0, $or$cond = 0;
 var $phitmp = 0.0, label = 0, sp = 0;
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
     $$0 = -inf;
     STACKTOP = sp;return (+$$0);
    }
    $5 = $x - $x;
    $6 = $5 / 0.0;
    $$0 = $6;
    STACKTOP = sp;return (+$$0);
   }
   $7 = $0 << 1;
   $8 = ($7>>>0)<(1728053248);
   if (!($8)) {
    $12 = ($0>>>0)<(3197498906);
    if ($12) {
     $c$2 = 0.0;$f$1 = $x;$k$1 = 0.0;
     break;
    } else {
     label = 10;
     break;
    }
   }
   $9 = $0 & 2139095040;
   $10 = ($9|0)==(0);
   if (!($10)) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   }
   $11 = $x * $x;
   $__x = $11;
   $$0 = $x;
   STACKTOP = sp;return (+$$0);
  } else {
   $13 = ($0>>>0)>(2139095039);
   if ($13) {
    $$0 = $x;
    STACKTOP = sp;return (+$$0);
   } else {
    label = 10;
   }
  }
 } while(0);
 if ((label|0) == 10) {
  $14 = $x + 1.0;
  $15 = (HEAPF32[tempDoublePtr>>2]=$14,HEAP32[tempDoublePtr>>2]|0);
  $16 = (($15) + 4913933)|0;
  $17 = $16 >>> 23;
  $18 = (($17) + -127)|0;
  $19 = ($18|0)<(25);
  if ($19) {
   $20 = ($18|0)>(1);
   $21 = $14 - $x;
   $22 = 1.0 - $21;
   $23 = $14 + -1.0;
   $24 = $x - $23;
   $25 = $20 ? $22 : $24;
   $26 = $25 / $14;
   $c$1 = $26;
  } else {
   $c$1 = 0.0;
  }
  $27 = $16 & 8388607;
  $28 = (($27) + 1060439283)|0;
  $29 = (HEAP32[tempDoublePtr>>2]=$28,+HEAPF32[tempDoublePtr>>2]);
  $30 = $29 + -1.0;
  $phitmp = (+($18|0));
  $c$2 = $c$1;$f$1 = $30;$k$1 = $phitmp;
 }
 $31 = $f$1 + 2.0;
 $32 = $f$1 / $31;
 $33 = $32 * $32;
 $34 = $33 * $33;
 $35 = $34 * 0.24279078841209412;
 $36 = $35 + 0.40000972151756287;
 $37 = $34 * $36;
 $38 = $34 * 0.28498786687850952;
 $39 = $38 + 0.66666662693023682;
 $40 = $33 * $39;
 $41 = $40 + $37;
 $42 = $f$1 * 0.5;
 $43 = $f$1 * $42;
 $44 = $43 + $41;
 $45 = $32 * $44;
 $46 = $k$1 * 9.0580006144591607E-6;
 $47 = $c$2 + $46;
 $48 = $47 + $45;
 $49 = $48 - $43;
 $50 = $f$1 + $49;
 $51 = $k$1 * 0.69313812255859375;
 $52 = $51 + $50;
 $$0 = $52;
 STACKTOP = sp;return (+$$0);
}
function _log1pl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_log1p($x));
 return (+$0);
}
function _log2($x) {
 $x = +$x;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0.0;
 var $26 = 0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0;
 var $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0, $49 = 0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0.0;
 var $62 = 0.0, $63 = 0.0, $64 = 0.0, $65 = 0.0, $66 = 0.0, $67 = 0, $7 = 0, $8 = 0.0, $9 = 0.0, $hx$0 = 0, $k$0 = 0, $or$cond = 0, $or$cond4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = ($1>>>0)<(1048576);
 $3 = ($1|0)<(0);
 $or$cond = $3 | $2;
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
    return (+$$0);
   }
   if (!($3)) {
    $12 = $x * 18014398509481984.0;
    HEAPF64[tempDoublePtr>>3] = $12;$13 = HEAP32[tempDoublePtr>>2]|0;
    $14 = HEAP32[tempDoublePtr+4>>2]|0;
    $26 = $13;$67 = $14;$hx$0 = $14;$k$0 = -1077;
    break;
   }
   $10 = $x - $x;
   $11 = $10 / 0.0;
   $$0 = $11;
   return (+$$0);
  } else {
   $15 = ($1>>>0)>(2146435071);
   if ($15) {
    $$0 = $x;
    return (+$$0);
   }
   $16 = ($1|0)==(1072693248);
   $17 = ($0|0)==(0);
   $18 = (0)==(0);
   $19 = $17 & $18;
   $or$cond4 = $19 & $16;
   if ($or$cond4) {
    $$0 = 0.0;
    return (+$$0);
   } else {
    $26 = $0;$67 = $1;$hx$0 = $1;$k$0 = -1023;
   }
  }
 } while(0);
 $20 = (($hx$0) + 614242)|0;
 $21 = $20 >>> 20;
 $22 = (($k$0) + ($21))|0;
 $23 = $20 & 1048575;
 $24 = (($23) + 1072079006)|0;
 HEAP32[tempDoublePtr>>2] = $26;HEAP32[tempDoublePtr+4>>2] = $24;$25 = +HEAPF64[tempDoublePtr>>3];
 $27 = $25 + -1.0;
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
 return (+$$0);
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
    return (+$$0);
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
   return (+$$0);
  } else {
   $10 = ($0>>>0)>(2139095039);
   if ($10) {
    $$0 = $x;
    return (+$$0);
   }
   $11 = ($0|0)==(1065353216);
   if ($11) {
    $$0 = 0.0;
    return (+$$0);
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
 $42 = $41 * 1.7605285393074155E-4;
 $43 = $40 * 1.44287109375;
 $44 = $43 - $42;
 $45 = $35 * 1.44287109375;
 $46 = $45 + $44;
 $47 = (+($14|0));
 $48 = $47 + $46;
 $$0 = $48;
 return (+$$0);
}
function _log2l($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_log2($x));
 return (+$0);
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
 return ($5|0);
}
function _lrintf($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_rintf($x));
 $1 = (~~(($0)));
 return ($1|0);
}
function _lrintl($x) {
 $x = +$x;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_lrint($x)|0);
 return ($0|0);
}
function _lround($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_round($x));
 $1 = (~~(($0)));
 return ($1|0);
}
function _lroundf($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_roundf($x));
 $1 = (~~(($0)));
 return ($1|0);
}
function _lroundl($x) {
 $x = +$x;
 var $0 = 0.0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_roundl($x));
 $1 = (~~(($0)));
 return ($1|0);
}
function _modf($x,$iptr) {
 $x = +$x;
 $iptr = $iptr|0;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0.0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0.0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0.0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $or$cond = 0, label = 0, sp = 0;
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
  $or$cond = $11 | $7;
  if (!($or$cond)) {
   $$0 = $x;
   return (+$$0);
  }
  $12 = $1 & -2147483648;
  HEAP32[tempDoublePtr>>2] = 0;HEAP32[tempDoublePtr+4>>2] = $12;$13 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $13;
  return (+$$0);
 }
 $14 = ($4>>>0)<(1023);
 if ($14) {
  $15 = $1 & -2147483648;
  $16 = $iptr;
  $17 = $16;
  HEAP32[$17>>2] = 0;
  $18 = (($16) + 4)|0;
  $19 = $18;
  HEAP32[$19>>2] = $15;
  $$0 = $x;
  return (+$$0);
 }
 $20 = (_bitshift64Lshr(-1,1048575,($5|0))|0);
 $21 = tempRet0;
 $22 = $20 & $0;
 $23 = $21 & $1;
 $24 = ($22|0)==(0);
 $25 = ($23|0)==(0);
 $26 = $24 & $25;
 if ($26) {
  HEAPF64[$iptr>>3] = $x;
  $27 = $1 & -2147483648;
  HEAP32[tempDoublePtr>>2] = 0;HEAP32[tempDoublePtr+4>>2] = $27;$28 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $28;
  return (+$$0);
 } else {
  $29 = $20 ^ -1;
  $30 = $21 ^ -1;
  $31 = $0 & $29;
  $32 = $1 & $30;
  HEAP32[tempDoublePtr>>2] = $31;HEAP32[tempDoublePtr+4>>2] = $32;$33 = +HEAPF64[tempDoublePtr>>3];
  $34 = $iptr;
  $35 = $34;
  HEAP32[$35>>2] = $31;
  $36 = (($34) + 4)|0;
  $37 = $36;
  HEAP32[$37>>2] = $32;
  $38 = $x - $33;
  $$0 = $38;
  return (+$$0);
 }
 return +(0.0);
}
function _modff($x,$iptr) {
 $x = +$x;
 $iptr = $iptr|0;
 var $$0 = 0.0, $$mask = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0.0, $19 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0.0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
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
  $or$cond = $6 | $5;
  if (!($or$cond)) {
   $$0 = $x;
   return (+$$0);
  }
  $7 = $0 & -2147483648;
  $8 = (HEAP32[tempDoublePtr>>2]=$7,+HEAPF32[tempDoublePtr>>2]);
  $$0 = $8;
  return (+$$0);
 }
 $9 = ($2>>>0)<(127);
 if ($9) {
  $10 = $0 & -2147483648;
  HEAP32[$iptr>>2] = $10;
  $$0 = $x;
  return (+$$0);
 }
 $11 = 8388607 >>> $3;
 $12 = $11 & $0;
 $13 = ($12|0)==(0);
 if ($13) {
  HEAPF32[$iptr>>2] = $x;
  $14 = $0 & -2147483648;
  $15 = (HEAP32[tempDoublePtr>>2]=$14,+HEAPF32[tempDoublePtr>>2]);
  $$0 = $15;
  return (+$$0);
 } else {
  $16 = $11 ^ -1;
  $17 = $0 & $16;
  $18 = (HEAP32[tempDoublePtr>>2]=$17,+HEAPF32[tempDoublePtr>>2]);
  HEAP32[$iptr>>2] = $17;
  $19 = $x - $18;
  $$0 = $19;
  return (+$$0);
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
 return +nan;
}
function _nanf($s) {
 $s = $s|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return +nan;
}
function _nanl($s) {
 $s = $s|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return +nan;
}
function _nearbyint($x) {
 $x = +$x;
 var $0 = 0, $1 = 0.0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_fetestexcept(32)|0);
 $1 = (+_rint($x));
 $2 = ($0|0)==(0);
 if (!($2)) {
  return (+$1);
 }
 return (+$1);
}
function _nearbyintf($x) {
 $x = +$x;
 var $0 = 0, $1 = 0.0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_fetestexcept(32)|0);
 $1 = (+_rintf($x));
 $2 = ($0|0)==(0);
 if (!($2)) {
  return (+$1);
 }
 return (+$1);
}
function _nearbyintl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_nearbyint($x));
 return (+$0);
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
 return (+$0);
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
  return (+$$0);
 }
 $8 = ($1|0)<(0);
 $9 = $x + -4503599627370496.0;
 $10 = $9 + 4503599627370496.0;
 $11 = $x + 4503599627370496.0;
 $12 = $11 + -4503599627370496.0;
 $y$0 = $8 ? $10 : $12;
 $13 = $y$0 == 0.0;
 if (!($13)) {
  $$0 = $y$0;
  return (+$$0);
 }
 $14 = $8 ? -0.0 : 0.0;
 $$0 = $14;
 return (+$$0);
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
  return (+$$0);
 }
 $3 = ($0|0)<(0);
 $4 = $x + -8388608.0;
 $5 = $4 + 8388608.0;
 $6 = $x + 8388608.0;
 $7 = $6 + -8388608.0;
 $y$0 = $3 ? $5 : $7;
 $8 = $y$0 == 0.0;
 if (!($8)) {
  $$0 = $y$0;
  return (+$$0);
 }
 $9 = $3 ? -0.0 : 0.0;
 $$0 = $9;
 return (+$$0);
}
function _rintl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_rint($x));
 return (+$0);
}
function _round($x) {
 $x = +$x;
 var $$0 = 0.0, $$x = 0.0, $$y$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0.0, $8 = 0, $9 = 0.0, $__x = 0.0, $y$0 = 0.0, label = 0, sp = 0;
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
 $7 = -$x;
 $$x = $6 ? $7 : $x;
 $8 = ($4>>>0)<(1022);
 $9 = $$x + 4503599627370496.0;
 if ($8) {
  $__x = $9;
  $10 = $x * 0.0;
  $$0 = $10;
  STACKTOP = sp;return (+$$0);
 }
 $11 = $9 + -4503599627370496.0;
 $12 = $11 - $$x;
 $13 = $12 > 0.5;
 if ($13) {
  $14 = $$x + $12;
  $15 = $14 + -1.0;
  $y$0 = $15;
 } else {
  $16 = !($12 <= -0.5);
  $17 = $$x + $12;
  if ($16) {
   $y$0 = $17;
  } else {
   $18 = $17 + 1.0;
   $y$0 = $18;
  }
 }
 $19 = -$y$0;
 $$y$0 = $6 ? $19 : $y$0;
 $$0 = $$y$0;
 STACKTOP = sp;return (+$$0);
}
function _roundf($x) {
 $x = +$x;
 var $$0 = 0.0, $$x = 0.0, $$y$0 = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0, $7 = 0.0, $8 = 0.0;
 var $9 = 0.0, $__x = 0.0, $y$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 >>> 23;
 $2 = $1 & 255;
 $3 = ($2>>>0)>(149);
 if ($3) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $4 = ($0|0)<(0);
 $5 = -$x;
 $$x = $4 ? $5 : $x;
 $6 = ($2>>>0)<(126);
 $7 = $$x + 8388608.0;
 if ($6) {
  $__x = $7;
  $8 = $x * 0.0;
  $$0 = $8;
  STACKTOP = sp;return (+$$0);
 }
 $9 = $7 + -8388608.0;
 $10 = $9 - $$x;
 $11 = $10 > 0.5;
 if ($11) {
  $12 = $$x + $10;
  $13 = $12 + -1.0;
  $y$0 = $13;
 } else {
  $14 = !($10 <= -0.5);
  $15 = $$x + $10;
  if ($14) {
   $y$0 = $15;
  } else {
   $16 = $15 + 1.0;
   $y$0 = $16;
  }
 }
 $17 = -$y$0;
 $$y$0 = $4 ? $17 : $y$0;
 $$0 = $$y$0;
 STACKTOP = sp;return (+$$0);
}
function _roundl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_round($x));
 return (+$0);
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
 return (+$18);
}
function _scalbnl($x,$n) {
 $x = +$x;
 $n = $n|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_scalbn($x,$n));
 return (+$0);
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
 return;
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
 return;
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
 return;
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
  return (+$$0);
 }
 $6 = (+_expm1($4));
 $7 = ($3>>>0)<(1072693248);
 if (!($7)) {
  $15 = $6 + 1.0;
  $16 = $6 / $15;
  $17 = $6 + $16;
  $18 = $$ * $17;
  $$0 = $18;
  return (+$$0);
 }
 $8 = ($3>>>0)<(1045430272);
 if ($8) {
  $$0 = $x;
  return (+$$0);
 }
 $9 = $6 * 2.0;
 $10 = $6 * $6;
 $11 = $6 + 1.0;
 $12 = $10 / $11;
 $13 = $9 - $12;
 $14 = $$ * $13;
 $$0 = $14;
 return (+$$0);
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
  return (+$$0);
 }
 $5 = (+_expm1f($3));
 $6 = ($2>>>0)<(1065353216);
 if (!($6)) {
  $14 = $5 + 1.0;
  $15 = $5 / $14;
  $16 = $5 + $15;
  $17 = $$ * $16;
  $$0 = $17;
  return (+$$0);
 }
 $7 = ($2>>>0)<(964689920);
 if ($7) {
  $$0 = $x;
  return (+$$0);
 }
 $8 = $5 * 2.0;
 $9 = $5 * $5;
 $10 = $5 + 1.0;
 $11 = $9 / $10;
 $12 = $8 - $11;
 $13 = $$ * $12;
 $$0 = $13;
 return (+$$0);
}
function _sinhl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_sinh($x));
 return (+$0);
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
 $26 = -$t$0;
 $27 = $25 ? $26 : $t$0;
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
 $25 = -$t$0;
 $26 = $24 ? $25 : $t$0;
 STACKTOP = sp;return (+$26);
}
function _tanhl($x) {
 $x = +$x;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_tanh($x));
 return (+$0);
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
 return (+$0);
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
 return ($$0|0);
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
  return ($$0|0);
 }
 $1 = ($wc>>>0)<(128);
 if ($1) {
  $2 = $wc&255;
  HEAP8[$s>>0] = $2;
  $$0 = 1;
  return ($$0|0);
 }
 $3 = ($wc>>>0)<(2048);
 if ($3) {
  $4 = $wc >>> 6;
  $5 = $4 | 192;
  $6 = $5&255;
  $7 = ((($s)) + 1|0);
  HEAP8[$s>>0] = $6;
  $8 = $wc & 63;
  $9 = $8 | 128;
  $10 = $9&255;
  HEAP8[$7>>0] = $10;
  $$0 = 2;
  return ($$0|0);
 }
 $11 = ($wc>>>0)<(55296);
 $12 = $wc & -8192;
 $13 = ($12|0)==(57344);
 $or$cond = $11 | $13;
 if ($or$cond) {
  $14 = $wc >>> 12;
  $15 = $14 | 224;
  $16 = $15&255;
  $17 = ((($s)) + 1|0);
  HEAP8[$s>>0] = $16;
  $18 = $wc >>> 6;
  $19 = $18 & 63;
  $20 = $19 | 128;
  $21 = $20&255;
  $22 = ((($s)) + 2|0);
  HEAP8[$17>>0] = $21;
  $23 = $wc & 63;
  $24 = $23 | 128;
  $25 = $24&255;
  HEAP8[$22>>0] = $25;
  $$0 = 3;
  return ($$0|0);
 }
 $26 = (($wc) + -65536)|0;
 $27 = ($26>>>0)<(1048576);
 if ($27) {
  $28 = $wc >>> 18;
  $29 = $28 | 240;
  $30 = $29&255;
  $31 = ((($s)) + 1|0);
  HEAP8[$s>>0] = $30;
  $32 = $wc >>> 12;
  $33 = $32 & 63;
  $34 = $33 | 128;
  $35 = $34&255;
  $36 = ((($s)) + 2|0);
  HEAP8[$31>>0] = $35;
  $37 = $wc >>> 6;
  $38 = $37 & 63;
  $39 = $38 | 128;
  $40 = $39&255;
  $41 = ((($s)) + 3|0);
  HEAP8[$36>>0] = $40;
  $42 = $wc & 63;
  $43 = $42 | 128;
  $44 = $43&255;
  HEAP8[$41>>0] = $44;
  $$0 = 4;
  return ($$0|0);
 } else {
  $45 = (___errno_location()|0);
  HEAP32[$45>>2] = 84;
  $$0 = -1;
  return ($$0|0);
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
 $2 = ((($xi)) + 2|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 $5 = $4 << 16;
 $6 = $5 | $1;
 $7 = ($6|0)<(0);
 $8 = $7 << 31 >> 31;
 $9 = ((($xi)) + 4|0);
 $10 = HEAP16[$9>>1]|0;
 $11 = $10&65535;
 $12 = $8 | $11;
 $13 = HEAP16[$lc>>1]|0;
 $14 = $13&65535;
 $15 = ((($lc)) + 2|0);
 $16 = HEAP16[$15>>1]|0;
 $17 = $16&65535;
 $18 = $17 << 16;
 $19 = $18 | $14;
 $20 = ($19|0)<(0);
 $21 = $20 << 31 >> 31;
 $22 = ((($lc)) + 4|0);
 $23 = HEAP16[$22>>1]|0;
 $24 = $23&65535;
 $25 = $21 | $24;
 $26 = (___muldi3(($19|0),($25|0),($6|0),($12|0))|0);
 $27 = tempRet0;
 $28 = ((($lc)) + 6|0);
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
 tempRet0 = ($38);
 return ($31|0);
}
function _erand48($s) {
 $s = $s|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___rand48_step($s,(10950))|0);
 $1 = tempRet0;
 $2 = (_bitshift64Shl(($0|0),($1|0),4)|0);
 $3 = tempRet0;
 $4 = $3 | 1072693248;
 HEAP32[tempDoublePtr>>2] = $2;HEAP32[tempDoublePtr+4>>2] = $4;$5 = +HEAPF64[tempDoublePtr>>3];
 $6 = $5 + -1.0;
 return (+$6);
}
function _drand48() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___rand48_step(10944,(10950))|0);
 $1 = tempRet0;
 $2 = (_bitshift64Shl(($0|0),($1|0),4)|0);
 $3 = tempRet0;
 $4 = $3 | 1072693248;
 HEAP32[tempDoublePtr>>2] = $2;HEAP32[tempDoublePtr+4>>2] = $4;$5 = +HEAPF64[tempDoublePtr>>3];
 $6 = $5 + -1.0;
 return (+$6);
}
function _lcong48($p) {
 $p = $p|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 ;HEAP16[10944>>1]=HEAP16[$p>>1]|0;HEAP16[10944+2>>1]=HEAP16[$p+2>>1]|0;HEAP16[10944+4>>1]=HEAP16[$p+4>>1]|0;HEAP16[10944+6>>1]=HEAP16[$p+6>>1]|0;HEAP16[10944+8>>1]=HEAP16[$p+8>>1]|0;HEAP16[10944+10>>1]=HEAP16[$p+10>>1]|0;HEAP16[10944+12>>1]=HEAP16[$p+12>>1]|0;
 return;
}
function _nrand48($s) {
 $s = $s|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___rand48_step($s,(10950))|0);
 $1 = tempRet0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),17)|0);
 $3 = tempRet0;
 return ($2|0);
}
function _lrand48() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___rand48_step(10944,(10950))|0);
 $1 = tempRet0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),17)|0);
 $3 = tempRet0;
 return ($2|0);
}
function _jrand48($s) {
 $s = $s|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___rand48_step($s,(10950))|0);
 $1 = tempRet0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),16)|0);
 $3 = tempRet0;
 return ($2|0);
}
function _mrand48() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (___rand48_step(10944,(10950))|0);
 $1 = tempRet0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),16)|0);
 $3 = tempRet0;
 return ($2|0);
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
 return ($13|0);
}
function _srand($s) {
 $s = $s|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($s) + -1)|0;
 $1 = 15512;
 $2 = $1;
 HEAP32[$2>>2] = $0;
 $3 = (($1) + 4)|0;
 $4 = $3;
 HEAP32[$4>>2] = 0;
 return;
}
function _rand() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = 15512;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = (($0) + 4)|0;
 $4 = $3;
 $5 = HEAP32[$4>>2]|0;
 $6 = (___muldi3(($2|0),($5|0),1284865837,1481765933)|0);
 $7 = tempRet0;
 $8 = (_i64Add(($6|0),($7|0),1,0)|0);
 $9 = tempRet0;
 $10 = 15512;
 $11 = $10;
 HEAP32[$11>>2] = $8;
 $12 = (($10) + 4)|0;
 $13 = $12;
 HEAP32[$13>>2] = $9;
 $14 = (_bitshift64Lshr(($8|0),($9|0),33)|0);
 $15 = tempRet0;
 return ($14|0);
}
function _srandom($seed) {
 $seed = $seed|0;
 var $$pre$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $k$01$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 ___lock((15520|0));
 $0 = HEAP32[15528>>2]|0;
 $1 = ($0|0)==(0);
 if ($1) {
  $2 = HEAP32[15536>>2]|0;
  HEAP32[$2>>2] = $seed;
  ___unlock((15520|0));
  return;
 }
 $3 = ($0|0)==(31);
 $4 = ($0|0)==(7);
 $5 = $3 | $4;
 $6 = $5 ? 3 : 1;
 HEAP32[15544>>2] = $6;
 HEAP32[15552>>2] = 0;
 $7 = ($0|0)>(0);
 if ($7) {
  $8 = HEAP32[15536>>2]|0;
  $10 = 0;$9 = $seed;$k$01$i = 0;
  while(1) {
   $11 = (___muldi3(($9|0),($10|0),1284865837,1481765933)|0);
   $12 = tempRet0;
   $13 = (_i64Add(($11|0),($12|0),1,0)|0);
   $14 = tempRet0;
   $15 = (($8) + ($k$01$i<<2)|0);
   HEAP32[$15>>2] = $14;
   $16 = (($k$01$i) + 1)|0;
   $17 = HEAP32[15528>>2]|0;
   $18 = ($16|0)<($17|0);
   if ($18) {
    $10 = $14;$9 = $13;$k$01$i = $16;
   } else {
    $20 = $8;
    break;
   }
  }
 } else {
  $$pre$i = HEAP32[15536>>2]|0;
  $20 = $$pre$i;
 }
 $19 = HEAP32[$20>>2]|0;
 $21 = $19 | 1;
 HEAP32[$20>>2] = $21;
 ___unlock((15520|0));
 return;
}
function _initstate($seed,$state,$size) {
 $seed = $seed|0;
 $state = $state|0;
 $size = $size|0;
 var $$0 = 0, $$ph = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, $k$01$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($size>>>0)<(8);
 if ($0) {
  $$0 = 0;
  return ($$0|0);
 }
 ___lock((15520|0));
 $1 = HEAP32[15528>>2]|0;
 $2 = $1 << 16;
 $3 = HEAP32[15544>>2]|0;
 $4 = $3 << 8;
 $5 = $4 | $2;
 $6 = HEAP32[15552>>2]|0;
 $7 = $5 | $6;
 $8 = HEAP32[15536>>2]|0;
 $9 = ((($8)) + -4|0);
 HEAP32[$9>>2] = $7;
 $10 = ($size>>>0)<(32);
 if ($10) {
  HEAP32[15528>>2] = 0;
  $14 = ((($state)) + 4|0);
  HEAP32[15536>>2] = $14;
  HEAP32[$14>>2] = $seed;
 } else {
  $11 = ($size>>>0)<(64);
  do {
   if ($11) {
    HEAP32[15528>>2] = 7;
    $$ph = 7;
   } else {
    $12 = ($size>>>0)<(128);
    if ($12) {
     HEAP32[15528>>2] = 15;
     $$ph = 15;
     break;
    }
    $13 = ($size>>>0)<(256);
    if ($13) {
     HEAP32[15528>>2] = 31;
     $$ph = 31;
     break;
    } else {
     HEAP32[15528>>2] = 63;
     $$ph = 63;
     break;
    }
   }
  } while(0);
  $15 = ((($state)) + 4|0);
  HEAP32[15536>>2] = $15;
  $16 = ($$ph|0)==(31);
  $17 = ($$ph|0)==(7);
  $18 = $16 | $17;
  $19 = $18 ? 3 : 1;
  HEAP32[15544>>2] = $19;
  HEAP32[15552>>2] = 0;
  $20 = $seed;$21 = 0;$k$01$i = 0;
  while(1) {
   $22 = (___muldi3(($20|0),($21|0),1284865837,1481765933)|0);
   $23 = tempRet0;
   $24 = (_i64Add(($22|0),($23|0),1,0)|0);
   $25 = tempRet0;
   $26 = (($15) + ($k$01$i<<2)|0);
   HEAP32[$26>>2] = $25;
   $27 = (($k$01$i) + 1)|0;
   $28 = HEAP32[15528>>2]|0;
   $29 = ($27|0)<($28|0);
   if ($29) {
    $20 = $24;$21 = $25;$k$01$i = $27;
   } else {
    break;
   }
  }
  $30 = HEAP32[$15>>2]|0;
  $31 = $30 | 1;
  HEAP32[$15>>2] = $31;
 }
 $32 = HEAP32[15528>>2]|0;
 $33 = $32 << 16;
 $34 = HEAP32[15544>>2]|0;
 $35 = $34 << 8;
 $36 = $35 | $33;
 $37 = HEAP32[15552>>2]|0;
 $38 = $36 | $37;
 HEAP32[$state>>2] = $38;
 ___unlock((15520|0));
 $$0 = $9;
 return ($$0|0);
}
function _setstate($state) {
 $state = $state|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 ___lock((15520|0));
 $0 = HEAP32[15528>>2]|0;
 $1 = $0 << 16;
 $2 = HEAP32[15544>>2]|0;
 $3 = $2 << 8;
 $4 = $3 | $1;
 $5 = HEAP32[15552>>2]|0;
 $6 = $4 | $5;
 $7 = HEAP32[15536>>2]|0;
 $8 = ((($7)) + -4|0);
 HEAP32[$8>>2] = $6;
 $9 = ((($state)) + 4|0);
 HEAP32[15536>>2] = $9;
 $10 = HEAP32[$state>>2]|0;
 $11 = $10 >>> 16;
 HEAP32[15528>>2] = $11;
 $12 = HEAP32[$state>>2]|0;
 $13 = $12 >>> 8;
 $14 = $13 & 255;
 HEAP32[15544>>2] = $14;
 $15 = HEAP32[$state>>2]|0;
 $16 = $15 & 255;
 HEAP32[15552>>2] = $16;
 ___unlock((15520|0));
 return ($8|0);
}
function _random() {
 var $$ = 0, $$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $k$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 ___lock((15520|0));
 $0 = HEAP32[15528>>2]|0;
 $1 = ($0|0)==(0);
 if ($1) {
  $2 = HEAP32[15536>>2]|0;
  $3 = HEAP32[$2>>2]|0;
  $4 = Math_imul($3, 1103515245)|0;
  $5 = (($4) + 12345)|0;
  $6 = $5 & 2147483647;
  HEAP32[$2>>2] = $6;
  $k$0 = $6;
  ___unlock((15520|0));
  return ($k$0|0);
 } else {
  $7 = HEAP32[15552>>2]|0;
  $8 = HEAP32[15536>>2]|0;
  $9 = (($8) + ($7<<2)|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = HEAP32[15544>>2]|0;
  $12 = (($8) + ($11<<2)|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = (($13) + ($10))|0;
  HEAP32[$12>>2] = $14;
  $15 = HEAP32[15544>>2]|0;
  $16 = (($8) + ($15<<2)|0);
  $17 = HEAP32[$16>>2]|0;
  $18 = $17 >>> 1;
  $19 = (($15) + 1)|0;
  $20 = HEAP32[15528>>2]|0;
  $21 = ($19|0)==($20|0);
  $$ = $21 ? 0 : $19;
  HEAP32[15544>>2] = $$;
  $22 = HEAP32[15552>>2]|0;
  $23 = (($22) + 1)|0;
  $24 = ($23|0)==($20|0);
  $$1 = $24 ? 0 : $23;
  HEAP32[15552>>2] = $$1;
  $k$0 = $18;
  ___unlock((15520|0));
  return ($k$0|0);
 }
 return (0)|0;
}
function _seed48($s) {
 $s = $s|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 ;HEAP16[15560>>1]=HEAP16[10944>>1]|0;HEAP16[15560+2>>1]=HEAP16[10944+2>>1]|0;HEAP16[15560+4>>1]=HEAP16[10944+4>>1]|0;
 ;HEAP16[10944>>1]=HEAP16[$s>>1]|0;HEAP16[10944+2>>1]=HEAP16[$s+2>>1]|0;HEAP16[10944+4>>1]=HEAP16[$s+4>>1]|0;
 return (15560|0);
}
function _srand48($seed) {
 $seed = $seed|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = sp;
 HEAP16[$0>>1] = 13070;
 $1 = ((($0)) + 2|0);
 $2 = $seed&65535;
 HEAP16[$1>>1] = $2;
 $3 = ((($0)) + 4|0);
 $4 = $seed >>> 16;
 $5 = $4&65535;
 HEAP16[$3>>1] = $5;
 (_seed48($0)|0);
 STACKTOP = sp;return;
}
function ___overflow($f,$_c) {
 $f = $f|0;
 $_c = $_c|0;
 var $$0 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $c = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $c = sp;
 $0 = $_c&255;
 HEAP8[$c>>0] = $0;
 $1 = ((($f)) + 16|0);
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
 $6 = ((($f)) + 20|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ($7>>>0)<($9>>>0);
 if ($8) {
  $10 = $_c & 255;
  $11 = ((($f)) + 75|0);
  $12 = HEAP8[$11>>0]|0;
  $13 = $12 << 24 >> 24;
  $14 = ($10|0)==($13|0);
  if (!($14)) {
   $15 = ((($7)) + 1|0);
   HEAP32[$6>>2] = $15;
   HEAP8[$7>>0] = $0;
   $$0 = $10;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $16 = ((($f)) + 36|0);
 $17 = HEAP32[$16>>2]|0;
 $18 = (FUNCTION_TABLE_iiii[$17 & 1]($f,$c,1)|0);
 $19 = ($18|0)==(1);
 if (!($19)) {
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 $20 = HEAP8[$c>>0]|0;
 $21 = $20&255;
 $$0 = $21;
 STACKTOP = sp;return ($$0|0);
}
function ___toread($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 74|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = $1 << 24 >> 24;
 $3 = (($2) + 255)|0;
 $4 = $3 | $2;
 $5 = $4&255;
 HEAP8[$0>>0] = $5;
 $6 = ((($f)) + 20|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ((($f)) + 44|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($7>>>0)>($9>>>0);
 if ($10) {
  $11 = ((($f)) + 36|0);
  $12 = HEAP32[$11>>2]|0;
  (FUNCTION_TABLE_iiii[$12 & 1]($f,0,0)|0);
 }
 $13 = ((($f)) + 16|0);
 HEAP32[$13>>2] = 0;
 $14 = ((($f)) + 28|0);
 HEAP32[$14>>2] = 0;
 HEAP32[$6>>2] = 0;
 $15 = HEAP32[$f>>2]|0;
 $16 = $15 & 20;
 $17 = ($16|0)==(0);
 if ($17) {
  $21 = HEAP32[$8>>2]|0;
  $22 = ((($f)) + 8|0);
  HEAP32[$22>>2] = $21;
  $23 = ((($f)) + 4|0);
  HEAP32[$23>>2] = $21;
  $$0 = 0;
  return ($$0|0);
 }
 $18 = $15 & 4;
 $19 = ($18|0)==(0);
 if ($19) {
  $$0 = -1;
  return ($$0|0);
 }
 $20 = $15 | 32;
 HEAP32[$f>>2] = $20;
 $$0 = -1;
 return ($$0|0);
}
function ___towrite($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 74|0);
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
  $10 = ((($f)) + 8|0);
  HEAP32[$10>>2] = 0;
  $11 = ((($f)) + 4|0);
  HEAP32[$11>>2] = 0;
  $12 = ((($f)) + 44|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ((($f)) + 28|0);
  HEAP32[$14>>2] = $13;
  $15 = ((($f)) + 20|0);
  HEAP32[$15>>2] = $13;
  $16 = $13;
  $17 = ((($f)) + 48|0);
  $18 = HEAP32[$17>>2]|0;
  $19 = (($16) + ($18)|0);
  $20 = ((($f)) + 16|0);
  HEAP32[$20>>2] = $19;
  $$0 = 0;
  return ($$0|0);
 } else {
  $9 = $6 | 32;
  HEAP32[$f>>2] = $9;
  $$0 = -1;
  return ($$0|0);
 }
 return (0)|0;
}
function ___uflow($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $c = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $c = sp;
 $0 = ((($f)) + 8|0);
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
  $5 = ((($f)) + 32|0);
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
 var $$0 = 0, $$01 = 0, $$02 = 0, $$pre = 0, $$pre6 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$0 = 0, $i$0$lcssa10 = 0;
 var $i$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 do {
  if ($2) {
   $3 = (___towrite($f)|0);
   $4 = ($3|0)==(0);
   if ($4) {
    $$pre = HEAP32[$0>>2]|0;
    $7 = $$pre;
    break;
   } else {
    $$0 = 0;
    return ($$0|0);
   }
  } else {
   $7 = $1;
  }
 } while(0);
 $5 = ((($f)) + 20|0);
 $6 = HEAP32[$5>>2]|0;
 $8 = $7;
 $9 = $6;
 $10 = (($8) - ($9))|0;
 $11 = ($10>>>0)<($l>>>0);
 if ($11) {
  $12 = ((($f)) + 36|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = (FUNCTION_TABLE_iiii[$13 & 1]($f,$s,$l)|0);
  $$0 = $14;
  return ($$0|0);
 }
 $15 = ((($f)) + 75|0);
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
     $i$0$lcssa10 = $i$0;
     break;
    } else {
     $i$0 = $19;
    }
   }
   $23 = ((($f)) + 36|0);
   $24 = HEAP32[$23>>2]|0;
   $25 = (FUNCTION_TABLE_iiii[$24 & 1]($f,$s,$i$0$lcssa10)|0);
   $26 = ($25>>>0)<($i$0$lcssa10>>>0);
   if ($26) {
    $$0 = $i$0$lcssa10;
    return ($$0|0);
   } else {
    $27 = (($s) + ($i$0$lcssa10)|0);
    $28 = (($l) - ($i$0$lcssa10))|0;
    $$pre6 = HEAP32[$5>>2]|0;
    $$01 = $28;$$02 = $27;$29 = $$pre6;$i$1 = $i$0$lcssa10;
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
 return ($$0|0);
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
 dest=$nl_type; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $vacopy_currentptr = HEAP32[$ap>>2]|0;
 HEAP32[$ap2>>2] = $vacopy_currentptr;
 $0 = (_printf_core(0,$fmt,$ap2,$nl_arg,$nl_type)|0);
 $1 = ($0|0)<(0);
 if ($1) {
  $$0 = -1;
  STACKTOP = sp;return ($$0|0);
 }
 $2 = ((($f)) + 48|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)==(0);
 if ($4) {
  $6 = ((($f)) + 44|0);
  $7 = HEAP32[$6>>2]|0;
  HEAP32[$6>>2] = $internal_buf;
  $8 = ((($f)) + 28|0);
  HEAP32[$8>>2] = $internal_buf;
  $9 = ((($f)) + 20|0);
  HEAP32[$9>>2] = $internal_buf;
  HEAP32[$2>>2] = 80;
  $10 = ((($internal_buf)) + 80|0);
  $11 = ((($f)) + 16|0);
  HEAP32[$11>>2] = $10;
  $12 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
  $13 = ($7|0)==(0|0);
  if ($13) {
   $ret$1 = $12;
  } else {
   $14 = ((($f)) + 36|0);
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
 dest=$f; src=15568; stop=dest+112|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
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
 $7 = ((($f)) + 48|0);
 HEAP32[$7>>2] = $$$02;
 $8 = ((($f)) + 20|0);
 HEAP32[$8>>2] = $$01;
 $9 = ((($f)) + 44|0);
 HEAP32[$9>>2] = $$01;
 $10 = (($$01) + ($$$02)|0);
 $11 = ((($f)) + 16|0);
 HEAP32[$11>>2] = $10;
 $12 = ((($f)) + 28|0);
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
 return ($0|0);
}
function _atof($s) {
 $s = $s|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_strtod($s,0));
 return (+$0);
}
function _atoi($s) {
 $s = $s|0;
 var $$0 = 0, $$0$lcssa = 0, $$1$ph = 0, $$13 = 0, $$lcssa9 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $isdigit = 0, $isdigit2 = 0, $isdigittmp = 0, $isdigittmp1 = 0, $isdigittmp5 = 0, $n$0$lcssa = 0, $n$04 = 0, $neg$0 = 0, $neg$1$ph = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $$0 = $s;
 while(1) {
  $0 = HEAP8[$$0>>0]|0;
  $1 = $0 << 24 >> 24;
  $2 = (_isspace($1)|0);
  $3 = ($2|0)==(0);
  $4 = ((($$0)) + 1|0);
  if ($3) {
   $$0$lcssa = $$0;$$lcssa9 = $4;
   break;
  } else {
   $$0 = $4;
  }
 }
 $5 = HEAP8[$$0$lcssa>>0]|0;
 $6 = $5 << 24 >> 24;
 if ((($6|0) == 43)) {
  $neg$0 = 0;
  label = 5;
 } else if ((($6|0) == 45)) {
  $neg$0 = 1;
  label = 5;
 } else {
  $$1$ph = $$0$lcssa;$8 = $5;$neg$1$ph = 0;
 }
 if ((label|0) == 5) {
  $$pre = HEAP8[$$lcssa9>>0]|0;
  $$1$ph = $$lcssa9;$8 = $$pre;$neg$1$ph = $neg$0;
 }
 $7 = $8 << 24 >> 24;
 $isdigittmp1 = (($7) + -48)|0;
 $isdigit2 = ($isdigittmp1>>>0)<(10);
 if ($isdigit2) {
  $$13 = $$1$ph;$isdigittmp5 = $isdigittmp1;$n$04 = 0;
 } else {
  $n$0$lcssa = 0;
  $14 = ($neg$1$ph|0)!=(0);
  $15 = (0 - ($n$0$lcssa))|0;
  $16 = $14 ? $n$0$lcssa : $15;
  return ($16|0);
 }
 while(1) {
  $9 = ($n$04*10)|0;
  $10 = ((($$13)) + 1|0);
  $11 = (($9) - ($isdigittmp5))|0;
  $12 = HEAP8[$10>>0]|0;
  $13 = $12 << 24 >> 24;
  $isdigittmp = (($13) + -48)|0;
  $isdigit = ($isdigittmp>>>0)<(10);
  if ($isdigit) {
   $$13 = $10;$isdigittmp5 = $isdigittmp;$n$04 = $11;
  } else {
   $n$0$lcssa = $11;
   break;
  }
 }
 $14 = ($neg$1$ph|0)!=(0);
 $15 = (0 - ($n$0$lcssa))|0;
 $16 = $14 ? $n$0$lcssa : $15;
 return ($16|0);
}
function _atol($s) {
 $s = $s|0;
 var $$0 = 0, $$0$lcssa = 0, $$1$ph = 0, $$13 = 0, $$lcssa9 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $isdigit = 0, $isdigit2 = 0, $isdigittmp = 0, $isdigittmp1 = 0, $isdigittmp5 = 0, $n$0$lcssa = 0, $n$04 = 0, $neg$0 = 0, $neg$1$ph = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $$0 = $s;
 while(1) {
  $0 = HEAP8[$$0>>0]|0;
  $1 = $0 << 24 >> 24;
  $2 = (_isspace($1)|0);
  $3 = ($2|0)==(0);
  $4 = ((($$0)) + 1|0);
  if ($3) {
   $$0$lcssa = $$0;$$lcssa9 = $4;
   break;
  } else {
   $$0 = $4;
  }
 }
 $5 = HEAP8[$$0$lcssa>>0]|0;
 $6 = $5 << 24 >> 24;
 if ((($6|0) == 43)) {
  $neg$0 = 0;
  label = 5;
 } else if ((($6|0) == 45)) {
  $neg$0 = 1;
  label = 5;
 } else {
  $$1$ph = $$0$lcssa;$8 = $5;$neg$1$ph = 0;
 }
 if ((label|0) == 5) {
  $$pre = HEAP8[$$lcssa9>>0]|0;
  $$1$ph = $$lcssa9;$8 = $$pre;$neg$1$ph = $neg$0;
 }
 $7 = $8 << 24 >> 24;
 $isdigittmp1 = (($7) + -48)|0;
 $isdigit2 = ($isdigittmp1>>>0)<(10);
 if ($isdigit2) {
  $$13 = $$1$ph;$isdigittmp5 = $isdigittmp1;$n$04 = 0;
 } else {
  $n$0$lcssa = 0;
  $14 = ($neg$1$ph|0)!=(0);
  $15 = (0 - ($n$0$lcssa))|0;
  $16 = $14 ? $n$0$lcssa : $15;
  return ($16|0);
 }
 while(1) {
  $9 = ($n$04*10)|0;
  $10 = ((($$13)) + 1|0);
  $11 = (($9) - ($isdigittmp5))|0;
  $12 = HEAP8[$10>>0]|0;
  $13 = $12 << 24 >> 24;
  $isdigittmp = (($13) + -48)|0;
  $isdigit = ($isdigittmp>>>0)<(10);
  if ($isdigit) {
   $$13 = $10;$isdigittmp5 = $isdigittmp;$n$04 = $11;
  } else {
   $n$0$lcssa = $11;
   break;
  }
 }
 $14 = ($neg$1$ph|0)!=(0);
 $15 = (0 - ($n$0$lcssa))|0;
 $16 = $14 ? $n$0$lcssa : $15;
 return ($16|0);
}
function _strtof($s,$p) {
 $s = $s|0;
 $p = $p|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i = 0, dest = 0;
 var label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i = sp;
 dest=$f$i; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = ((($f$i)) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = ((($f$i)) + 8|0);
 HEAP32[$1>>2] = (-1);
 $2 = ((($f$i)) + 44|0);
 HEAP32[$2>>2] = $s;
 $3 = ((($f$i)) + 76|0);
 HEAP32[$3>>2] = -1;
 ___shlim($f$i,0);
 $4 = (+___floatscan($f$i,0,1));
 $5 = ((($f$i)) + 108|0);
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
 $14 = ($12|0)!=(0);
 $15 = (($s) + ($12)|0);
 $16 = $14 ? $15 : $s;
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
 dest=$f$i; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = ((($f$i)) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = ((($f$i)) + 8|0);
 HEAP32[$1>>2] = (-1);
 $2 = ((($f$i)) + 44|0);
 HEAP32[$2>>2] = $s;
 $3 = ((($f$i)) + 76|0);
 HEAP32[$3>>2] = -1;
 ___shlim($f$i,0);
 $4 = (+___floatscan($f$i,1,1));
 $5 = ((($f$i)) + 108|0);
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
 $14 = ($12|0)!=(0);
 $15 = (($s) + ($12)|0);
 $16 = $14 ? $15 : $s;
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
 dest=$f$i; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = ((($f$i)) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = ((($f$i)) + 8|0);
 HEAP32[$1>>2] = (-1);
 $2 = ((($f$i)) + 44|0);
 HEAP32[$2>>2] = $s;
 $3 = ((($f$i)) + 76|0);
 HEAP32[$3>>2] = -1;
 ___shlim($f$i,0);
 $4 = (+___floatscan($f$i,2,1));
 $5 = ((($f$i)) + 108|0);
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
 $14 = ($12|0)!=(0);
 $15 = (($s) + ($12)|0);
 $16 = $14 ? $15 : $s;
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
 dest=$f$i$i; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = ((($f$i$i)) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = ((($f$i$i)) + 8|0);
 HEAP32[$1>>2] = (-1);
 $2 = ((($f$i$i)) + 44|0);
 HEAP32[$2>>2] = $s;
 $3 = ((($f$i$i)) + 76|0);
 HEAP32[$3>>2] = -1;
 ___shlim($f$i$i,0);
 $4 = (+___floatscan($f$i$i,0,1));
 $5 = ((($f$i$i)) + 108|0);
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
 $14 = ($12|0)!=(0);
 $15 = (($s) + ($12)|0);
 $16 = $14 ? $15 : $s;
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
 dest=$f$i$i; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = ((($f$i$i)) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = ((($f$i$i)) + 8|0);
 HEAP32[$1>>2] = (-1);
 $2 = ((($f$i$i)) + 44|0);
 HEAP32[$2>>2] = $s;
 $3 = ((($f$i$i)) + 76|0);
 HEAP32[$3>>2] = -1;
 ___shlim($f$i$i,0);
 $4 = (+___floatscan($f$i$i,1,1));
 $5 = ((($f$i$i)) + 108|0);
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
 $14 = ($12|0)!=(0);
 $15 = (($s) + ($12)|0);
 $16 = $14 ? $15 : $s;
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
 dest=$f$i$i; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $0 = ((($f$i$i)) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = ((($f$i$i)) + 8|0);
 HEAP32[$1>>2] = (-1);
 $2 = ((($f$i$i)) + 44|0);
 HEAP32[$2>>2] = $s;
 $3 = ((($f$i$i)) + 76|0);
 HEAP32[$3>>2] = -1;
 ___shlim($f$i$i,0);
 $4 = (+___floatscan($f$i$i,2,1));
 $5 = ((($f$i$i)) + 108|0);
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
 $14 = ($12|0)!=(0);
 $15 = (($s) + ($12)|0);
 $16 = $14 ? $15 : $s;
 HEAP32[$p>>2] = $16;
 STACKTOP = sp;return (+$4);
}
function _strtoull($s,$p,$base) {
 $s = $s|0;
 $p = $p|0;
 $base = $base|0;
 var $$sink$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i = sp;
 HEAP32[$f$i>>2] = 0;
 $0 = ((($f$i)) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = ((($f$i)) + 44|0);
 HEAP32[$1>>2] = $s;
 $2 = ($s|0)<(0|0);
 $3 = ((($s)) + 2147483647|0);
 $$sink$i = $2 ? (-1) : $3;
 $4 = ((($f$i)) + 8|0);
 HEAP32[$4>>2] = $$sink$i;
 $5 = ((($f$i)) + 76|0);
 HEAP32[$5>>2] = -1;
 ___shlim($f$i,0);
 $6 = (___intscan($f$i,$base,1,-1,-1)|0);
 $7 = tempRet0;
 $8 = ($p|0)==(0|0);
 if ($8) {
  tempRet0 = ($7);
  STACKTOP = sp;return ($6|0);
 }
 $9 = ((($f$i)) + 108|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = HEAP32[$0>>2]|0;
 $12 = HEAP32[$4>>2]|0;
 $13 = $11;
 $14 = $12;
 $15 = (($13) + ($10))|0;
 $16 = (($15) - ($14))|0;
 $17 = (($s) + ($16)|0);
 HEAP32[$p>>2] = $17;
 tempRet0 = ($7);
 STACKTOP = sp;return ($6|0);
}
function _strtoll($s,$p,$base) {
 $s = $s|0;
 $p = $p|0;
 $base = $base|0;
 var $$sink$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i = sp;
 HEAP32[$f$i>>2] = 0;
 $0 = ((($f$i)) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = ((($f$i)) + 44|0);
 HEAP32[$1>>2] = $s;
 $2 = ($s|0)<(0|0);
 $3 = ((($s)) + 2147483647|0);
 $$sink$i = $2 ? (-1) : $3;
 $4 = ((($f$i)) + 8|0);
 HEAP32[$4>>2] = $$sink$i;
 $5 = ((($f$i)) + 76|0);
 HEAP32[$5>>2] = -1;
 ___shlim($f$i,0);
 $6 = (___intscan($f$i,$base,1,0,-2147483648)|0);
 $7 = tempRet0;
 $8 = ($p|0)==(0|0);
 if ($8) {
  tempRet0 = ($7);
  STACKTOP = sp;return ($6|0);
 }
 $9 = ((($f$i)) + 108|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = HEAP32[$0>>2]|0;
 $12 = HEAP32[$4>>2]|0;
 $13 = $11;
 $14 = $12;
 $15 = (($13) + ($10))|0;
 $16 = (($15) - ($14))|0;
 $17 = (($s) + ($16)|0);
 HEAP32[$p>>2] = $17;
 tempRet0 = ($7);
 STACKTOP = sp;return ($6|0);
}
function _strtoul($s,$p,$base) {
 $s = $s|0;
 $p = $p|0;
 $base = $base|0;
 var $$sink$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i = sp;
 HEAP32[$f$i>>2] = 0;
 $0 = ((($f$i)) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = ((($f$i)) + 44|0);
 HEAP32[$1>>2] = $s;
 $2 = ($s|0)<(0|0);
 $3 = ((($s)) + 2147483647|0);
 $$sink$i = $2 ? (-1) : $3;
 $4 = ((($f$i)) + 8|0);
 HEAP32[$4>>2] = $$sink$i;
 $5 = ((($f$i)) + 76|0);
 HEAP32[$5>>2] = -1;
 ___shlim($f$i,0);
 $6 = (___intscan($f$i,$base,1,-1,0)|0);
 $7 = tempRet0;
 $8 = ($p|0)==(0|0);
 if ($8) {
  STACKTOP = sp;return ($6|0);
 }
 $9 = ((($f$i)) + 108|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = HEAP32[$0>>2]|0;
 $12 = HEAP32[$4>>2]|0;
 $13 = $11;
 $14 = $12;
 $15 = (($13) + ($10))|0;
 $16 = (($15) - ($14))|0;
 $17 = (($s) + ($16)|0);
 HEAP32[$p>>2] = $17;
 STACKTOP = sp;return ($6|0);
}
function _strtol($s,$p,$base) {
 $s = $s|0;
 $p = $p|0;
 $base = $base|0;
 var $$sink$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i = sp;
 HEAP32[$f$i>>2] = 0;
 $0 = ((($f$i)) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = ((($f$i)) + 44|0);
 HEAP32[$1>>2] = $s;
 $2 = ($s|0)<(0|0);
 $3 = ((($s)) + 2147483647|0);
 $$sink$i = $2 ? (-1) : $3;
 $4 = ((($f$i)) + 8|0);
 HEAP32[$4>>2] = $$sink$i;
 $5 = ((($f$i)) + 76|0);
 HEAP32[$5>>2] = -1;
 ___shlim($f$i,0);
 $6 = (___intscan($f$i,$base,1,-2147483648,0)|0);
 $7 = tempRet0;
 $8 = ($p|0)==(0|0);
 if ($8) {
  STACKTOP = sp;return ($6|0);
 }
 $9 = ((($f$i)) + 108|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = HEAP32[$0>>2]|0;
 $12 = HEAP32[$4>>2]|0;
 $13 = $11;
 $14 = $12;
 $15 = (($13) + ($10))|0;
 $16 = (($15) - ($14))|0;
 $17 = (($s) + ($16)|0);
 HEAP32[$p>>2] = $17;
 STACKTOP = sp;return ($6|0);
}
function _strtoimax($s,$p,$base) {
 $s = $s|0;
 $p = $p|0;
 $base = $base|0;
 var $$sink$i$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i$i = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i$i = sp;
 HEAP32[$f$i$i>>2] = 0;
 $0 = ((($f$i$i)) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = ((($f$i$i)) + 44|0);
 HEAP32[$1>>2] = $s;
 $2 = ($s|0)<(0|0);
 $3 = ((($s)) + 2147483647|0);
 $$sink$i$i = $2 ? (-1) : $3;
 $4 = ((($f$i$i)) + 8|0);
 HEAP32[$4>>2] = $$sink$i$i;
 $5 = ((($f$i$i)) + 76|0);
 HEAP32[$5>>2] = -1;
 ___shlim($f$i$i,0);
 $6 = (___intscan($f$i$i,$base,1,0,-2147483648)|0);
 $7 = tempRet0;
 $8 = ($p|0)==(0|0);
 if ($8) {
  tempRet0 = ($7);
  STACKTOP = sp;return ($6|0);
 }
 $9 = ((($f$i$i)) + 108|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = HEAP32[$0>>2]|0;
 $12 = HEAP32[$4>>2]|0;
 $13 = $11;
 $14 = $12;
 $15 = (($13) + ($10))|0;
 $16 = (($15) - ($14))|0;
 $17 = (($s) + ($16)|0);
 HEAP32[$p>>2] = $17;
 tempRet0 = ($7);
 STACKTOP = sp;return ($6|0);
}
function _strtoumax($s,$p,$base) {
 $s = $s|0;
 $p = $p|0;
 $base = $base|0;
 var $$sink$i$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f$i$i = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f$i$i = sp;
 HEAP32[$f$i$i>>2] = 0;
 $0 = ((($f$i$i)) + 4|0);
 HEAP32[$0>>2] = $s;
 $1 = ((($f$i$i)) + 44|0);
 HEAP32[$1>>2] = $s;
 $2 = ($s|0)<(0|0);
 $3 = ((($s)) + 2147483647|0);
 $$sink$i$i = $2 ? (-1) : $3;
 $4 = ((($f$i$i)) + 8|0);
 HEAP32[$4>>2] = $$sink$i$i;
 $5 = ((($f$i$i)) + 76|0);
 HEAP32[$5>>2] = -1;
 ___shlim($f$i$i,0);
 $6 = (___intscan($f$i$i,$base,1,-1,-1)|0);
 $7 = tempRet0;
 $8 = ($p|0)==(0|0);
 if ($8) {
  tempRet0 = ($7);
  STACKTOP = sp;return ($6|0);
 }
 $9 = ((($f$i$i)) + 108|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = HEAP32[$0>>2]|0;
 $12 = HEAP32[$4>>2]|0;
 $13 = $11;
 $14 = $12;
 $15 = (($13) + ($10))|0;
 $16 = (($15) - ($14))|0;
 $17 = (($s) + ($16)|0);
 HEAP32[$p>>2] = $17;
 tempRet0 = ($7);
 STACKTOP = sp;return ($6|0);
}
function _memchr($src,$c,$n) {
 $src = $src|0;
 $c = $c|0;
 $n = $n|0;
 var $$0$lcssa = 0, $$0$lcssa44 = 0, $$019 = 0, $$1$lcssa = 0, $$110 = 0, $$110$lcssa = 0, $$24 = 0, $$3 = 0, $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0;
 var $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond18 = 0, $s$0$lcssa = 0, $s$0$lcssa43 = 0, $s$020 = 0, $s$15 = 0, $s$2 = 0, $w$0$lcssa = 0, $w$011 = 0, $w$011$lcssa = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $c & 255;
 $1 = $src;
 $2 = $1 & 3;
 $3 = ($2|0)!=(0);
 $4 = ($n|0)!=(0);
 $or$cond18 = $4 & $3;
 L1: do {
  if ($or$cond18) {
   $5 = $c&255;
   $$019 = $n;$s$020 = $src;
   while(1) {
    $6 = HEAP8[$s$020>>0]|0;
    $7 = ($6<<24>>24)==($5<<24>>24);
    if ($7) {
     $$0$lcssa44 = $$019;$s$0$lcssa43 = $s$020;
     label = 6;
     break L1;
    }
    $8 = ((($s$020)) + 1|0);
    $9 = (($$019) + -1)|0;
    $10 = $8;
    $11 = $10 & 3;
    $12 = ($11|0)!=(0);
    $13 = ($9|0)!=(0);
    $or$cond = $13 & $12;
    if ($or$cond) {
     $$019 = $9;$s$020 = $8;
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
   $$0$lcssa44 = $$0$lcssa;$s$0$lcssa43 = $s$0$lcssa;
   label = 6;
  } else {
   $$3 = 0;$s$2 = $s$0$lcssa;
  }
 }
 L8: do {
  if ((label|0) == 6) {
   $14 = HEAP8[$s$0$lcssa43>>0]|0;
   $15 = $c&255;
   $16 = ($14<<24>>24)==($15<<24>>24);
   if ($16) {
    $$3 = $$0$lcssa44;$s$2 = $s$0$lcssa43;
   } else {
    $17 = Math_imul($0, 16843009)|0;
    $18 = ($$0$lcssa44>>>0)>(3);
    L11: do {
     if ($18) {
      $$110 = $$0$lcssa44;$w$011 = $s$0$lcssa43;
      while(1) {
       $19 = HEAP32[$w$011>>2]|0;
       $20 = $19 ^ $17;
       $21 = (($20) + -16843009)|0;
       $22 = $20 & -2139062144;
       $23 = $22 ^ -2139062144;
       $24 = $23 & $21;
       $25 = ($24|0)==(0);
       if (!($25)) {
        $$110$lcssa = $$110;$w$011$lcssa = $w$011;
        break;
       }
       $26 = ((($w$011)) + 4|0);
       $27 = (($$110) + -4)|0;
       $28 = ($27>>>0)>(3);
       if ($28) {
        $$110 = $27;$w$011 = $26;
       } else {
        $$1$lcssa = $27;$w$0$lcssa = $26;
        label = 11;
        break L11;
       }
      }
      $$24 = $$110$lcssa;$s$15 = $w$011$lcssa;
     } else {
      $$1$lcssa = $$0$lcssa44;$w$0$lcssa = $s$0$lcssa43;
      label = 11;
     }
    } while(0);
    if ((label|0) == 11) {
     $29 = ($$1$lcssa|0)==(0);
     if ($29) {
      $$3 = 0;$s$2 = $w$0$lcssa;
      break;
     } else {
      $$24 = $$1$lcssa;$s$15 = $w$0$lcssa;
     }
    }
    while(1) {
     $30 = HEAP8[$s$15>>0]|0;
     $31 = ($30<<24>>24)==($15<<24>>24);
     if ($31) {
      $$3 = $$24;$s$2 = $s$15;
      break L8;
     }
     $32 = ((($s$15)) + 1|0);
     $33 = (($$24) + -1)|0;
     $34 = ($33|0)==(0);
     if ($34) {
      $$3 = 0;$s$2 = $32;
      break;
     } else {
      $$24 = $33;$s$15 = $32;
     }
    }
   }
  }
 } while(0);
 $35 = ($$3|0)!=(0);
 $36 = $35 ? $s$2 : 0;
 return ($36|0);
}
function _memcmp($vl,$vr,$n) {
 $vl = $vl|0;
 $vr = $vr|0;
 $n = $n|0;
 var $$03 = 0, $$lcssa = 0, $$lcssa19 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$04 = 0, $r$05 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n|0)==(0);
 if ($0) {
  $11 = 0;
  return ($11|0);
 } else {
  $$03 = $n;$l$04 = $vl;$r$05 = $vr;
 }
 while(1) {
  $1 = HEAP8[$l$04>>0]|0;
  $2 = HEAP8[$r$05>>0]|0;
  $3 = ($1<<24>>24)==($2<<24>>24);
  if (!($3)) {
   $$lcssa = $1;$$lcssa19 = $2;
   break;
  }
  $4 = (($$03) + -1)|0;
  $5 = ((($l$04)) + 1|0);
  $6 = ((($r$05)) + 1|0);
  $7 = ($4|0)==(0);
  if ($7) {
   $11 = 0;
   label = 5;
   break;
  } else {
   $$03 = $4;$l$04 = $5;$r$05 = $6;
  }
 }
 if ((label|0) == 5) {
  return ($11|0);
 }
 $8 = $$lcssa&255;
 $9 = $$lcssa19&255;
 $10 = (($8) - ($9))|0;
 $11 = $10;
 return ($11|0);
}
function _strcasecmp($_l,$_r) {
 $_l = $_l|0;
 $_r = $_r|0;
 var $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$03 = 0, $l$03$lcssa24 = 0, $r$0$lcssa = 0, $r$04 = 0, $r$04$lcssa23 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$_l>>0]|0;
 $1 = ($0<<24>>24)==(0);
 L1: do {
  if ($1) {
   $19 = 0;$r$0$lcssa = $_r;
  } else {
   $2 = $0&255;
   $5 = $0;$7 = $2;$l$03 = $_l;$r$04 = $_r;
   while(1) {
    $3 = HEAP8[$r$04>>0]|0;
    $4 = ($3<<24>>24)==(0);
    if ($4) {
     $19 = $5;$r$0$lcssa = $r$04;
     break L1;
    }
    $6 = ($5<<24>>24)==($3<<24>>24);
    if (!($6)) {
     $8 = (_tolower($7)|0);
     $9 = HEAP8[$r$04>>0]|0;
     $10 = $9&255;
     $11 = (_tolower($10)|0);
     $12 = ($8|0)==($11|0);
     if (!($12)) {
      $l$03$lcssa24 = $l$03;$r$04$lcssa23 = $r$04;
      break;
     }
    }
    $13 = ((($l$03)) + 1|0);
    $14 = ((($r$04)) + 1|0);
    $15 = HEAP8[$13>>0]|0;
    $16 = $15&255;
    $17 = ($15<<24>>24)==(0);
    if ($17) {
     $19 = 0;$r$0$lcssa = $14;
     break L1;
    } else {
     $5 = $15;$7 = $16;$l$03 = $13;$r$04 = $14;
    }
   }
   $$pre = HEAP8[$l$03$lcssa24>>0]|0;
   $19 = $$pre;$r$0$lcssa = $r$04$lcssa23;
  }
 } while(0);
 $18 = $19&255;
 $20 = (_tolower($18)|0);
 $21 = HEAP8[$r$0$lcssa>>0]|0;
 $22 = $21&255;
 $23 = (_tolower($22)|0);
 $24 = (($20) - ($23))|0;
 return ($24|0);
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
 $or$cond3 = $3 | $2;
 if ($or$cond3) {
  $$lcssa = $0;$$lcssa2 = $1;
 } else {
  $$014 = $l;$$05 = $r;
  while(1) {
   $4 = ((($$014)) + 1|0);
   $5 = ((($$05)) + 1|0);
   $6 = HEAP8[$4>>0]|0;
   $7 = HEAP8[$5>>0]|0;
   $8 = ($6<<24>>24)!=($7<<24>>24);
   $9 = ($6<<24>>24)==(0);
   $or$cond = $9 | $8;
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
 return ($12|0);
}
function _strncasecmp($_l,$_r,$n) {
 $_l = $_l|0;
 $_r = $_r|0;
 $n = $n|0;
 var $$04 = 0, $$08 = 0, $$08$in = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$06 = 0, $l$06$lcssa28 = 0, $or$cond = 0, $r$0$lcssa = 0, $r$07 = 0, $r$07$lcssa27 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n|0)==(0);
 if ($0) {
  $$04 = 0;
  return ($$04|0);
 }
 $1 = HEAP8[$_l>>0]|0;
 $2 = ($1<<24>>24)==(0);
 L4: do {
  if ($2) {
   $21 = 0;$r$0$lcssa = $_r;
  } else {
   $3 = $1&255;
   $$08$in = $n;$7 = $1;$9 = $3;$l$06 = $_l;$r$07 = $_r;
   while(1) {
    $$08 = (($$08$in) + -1)|0;
    $4 = HEAP8[$r$07>>0]|0;
    $5 = ($4<<24>>24)!=(0);
    $6 = ($$08|0)!=(0);
    $or$cond = $6 & $5;
    if (!($or$cond)) {
     $21 = $7;$r$0$lcssa = $r$07;
     break L4;
    }
    $8 = ($7<<24>>24)==($4<<24>>24);
    if (!($8)) {
     $10 = (_tolower($9)|0);
     $11 = HEAP8[$r$07>>0]|0;
     $12 = $11&255;
     $13 = (_tolower($12)|0);
     $14 = ($10|0)==($13|0);
     if (!($14)) {
      $l$06$lcssa28 = $l$06;$r$07$lcssa27 = $r$07;
      break;
     }
    }
    $15 = ((($l$06)) + 1|0);
    $16 = ((($r$07)) + 1|0);
    $17 = HEAP8[$15>>0]|0;
    $18 = $17&255;
    $19 = ($17<<24>>24)==(0);
    if ($19) {
     $21 = 0;$r$0$lcssa = $16;
     break L4;
    } else {
     $$08$in = $$08;$7 = $17;$9 = $18;$l$06 = $15;$r$07 = $16;
    }
   }
   $$pre = HEAP8[$l$06$lcssa28>>0]|0;
   $21 = $$pre;$r$0$lcssa = $r$07$lcssa27;
  }
 } while(0);
 $20 = $21&255;
 $22 = (_tolower($20)|0);
 $23 = HEAP8[$r$0$lcssa>>0]|0;
 $24 = $23&255;
 $25 = (_tolower($24)|0);
 $26 = (($22) - ($25))|0;
 $$04 = $26;
 return ($$04|0);
}
function _strncmp($_l,$_r,$n) {
 $_l = $_l|0;
 $_r = $_r|0;
 $n = $n|0;
 var $$03 = 0, $$08 = 0, $$08$in = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $l$06 = 0, $or$cond = 0, $or$cond4 = 0, $r$0$lcssa = 0, $r$07 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n|0)==(0);
 if ($0) {
  $$03 = 0;
  return ($$03|0);
 }
 $1 = HEAP8[$_l>>0]|0;
 $2 = ($1<<24>>24)==(0);
 L4: do {
  if ($2) {
   $13 = 0;$r$0$lcssa = $_r;
  } else {
   $$08$in = $n;$6 = $1;$l$06 = $_l;$r$07 = $_r;
   while(1) {
    $$08 = (($$08$in) + -1)|0;
    $3 = HEAP8[$r$07>>0]|0;
    $4 = ($3<<24>>24)!=(0);
    $5 = ($$08|0)!=(0);
    $or$cond = $5 & $4;
    $7 = ($6<<24>>24)==($3<<24>>24);
    $or$cond4 = $7 & $or$cond;
    if (!($or$cond4)) {
     $13 = $6;$r$0$lcssa = $r$07;
     break L4;
    }
    $8 = ((($l$06)) + 1|0);
    $9 = ((($r$07)) + 1|0);
    $10 = HEAP8[$8>>0]|0;
    $11 = ($10<<24>>24)==(0);
    if ($11) {
     $13 = 0;$r$0$lcssa = $9;
     break;
    } else {
     $$08$in = $$08;$6 = $10;$l$06 = $8;$r$07 = $9;
    }
   }
  }
 } while(0);
 $12 = $13&255;
 $14 = HEAP8[$r$0$lcssa>>0]|0;
 $15 = $14&255;
 $16 = (($12) - ($15))|0;
 $$03 = $16;
 return ($$03|0);
}
function _scanexp($f,$pok) {
 $f = $f|0;
 $pok = $pok|0;
 var $$lcssa22 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0;
 var $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0;
 var $99 = 0, $c$0 = 0, $c$1$be = 0, $c$1$be$lcssa = 0, $c$112 = 0, $c$2$be = 0, $c$2$lcssa = 0, $c$27 = 0, $c$3$be = 0, $neg$0 = 0, $or$cond3 = 0, $x$013 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($f)) + 100|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($1>>>0)<($3>>>0);
 if ($4) {
  $5 = ((($1)) + 1|0);
  HEAP32[$0>>2] = $5;
  $6 = HEAP8[$1>>0]|0;
  $7 = $6&255;
  $9 = $7;
 } else {
  $8 = (___shgetc($f)|0);
  $9 = $8;
 }
 $10 = ($9|0)==(45);
 if ((($9|0) == 43) | (($9|0) == 45)) {
  $11 = $10&1;
  $12 = HEAP32[$0>>2]|0;
  $13 = HEAP32[$2>>2]|0;
  $14 = ($12>>>0)<($13>>>0);
  if ($14) {
   $15 = ((($12)) + 1|0);
   HEAP32[$0>>2] = $15;
   $16 = HEAP8[$12>>0]|0;
   $17 = $16&255;
   $20 = $17;
  } else {
   $18 = (___shgetc($f)|0);
   $20 = $18;
  }
  $19 = (($20) + -48)|0;
  $21 = ($19>>>0)>(9);
  $22 = ($pok|0)!=(0);
  $or$cond3 = $22 & $21;
  if ($or$cond3) {
   $23 = HEAP32[$2>>2]|0;
   $24 = ($23|0)==(0|0);
   if ($24) {
    $c$0 = $20;$neg$0 = $11;
   } else {
    $25 = HEAP32[$0>>2]|0;
    $26 = ((($25)) + -1|0);
    HEAP32[$0>>2] = $26;
    $c$0 = $20;$neg$0 = $11;
   }
  } else {
   $c$0 = $20;$neg$0 = $11;
  }
 } else {
  $c$0 = $9;$neg$0 = 0;
 }
 $27 = (($c$0) + -48)|0;
 $28 = ($27>>>0)>(9);
 if ($28) {
  $29 = HEAP32[$2>>2]|0;
  $30 = ($29|0)==(0|0);
  if ($30) {
   $98 = -2147483648;$99 = 0;
   tempRet0 = ($98);
   return ($99|0);
  }
  $31 = HEAP32[$0>>2]|0;
  $32 = ((($31)) + -1|0);
  HEAP32[$0>>2] = $32;
  $98 = -2147483648;$99 = 0;
  tempRet0 = ($98);
  return ($99|0);
 } else {
  $c$112 = $c$0;$x$013 = 0;
 }
 while(1) {
  $33 = ($x$013*10)|0;
  $34 = (($c$112) + -48)|0;
  $35 = (($34) + ($33))|0;
  $36 = HEAP32[$0>>2]|0;
  $37 = HEAP32[$2>>2]|0;
  $38 = ($36>>>0)<($37>>>0);
  if ($38) {
   $39 = ((($36)) + 1|0);
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
  $46 = $44 & $45;
  if ($46) {
   $c$112 = $c$1$be;$x$013 = $35;
  } else {
   $$lcssa22 = $35;$c$1$be$lcssa = $c$1$be;
   break;
  }
 }
 $47 = ($$lcssa22|0)<(0);
 $48 = $47 << 31 >> 31;
 $49 = (($c$1$be$lcssa) + -48)|0;
 $50 = ($49>>>0)<(10);
 if ($50) {
  $53 = $$lcssa22;$54 = $48;$c$27 = $c$1$be$lcssa;
  while(1) {
   $55 = (___muldi3(($53|0),($54|0),10,0)|0);
   $56 = tempRet0;
   $57 = ($c$27|0)<(0);
   $58 = $57 << 31 >> 31;
   $59 = (_i64Add(($c$27|0),($58|0),-48,-1)|0);
   $60 = tempRet0;
   $61 = (_i64Add(($59|0),($60|0),($55|0),($56|0))|0);
   $62 = tempRet0;
   $63 = HEAP32[$0>>2]|0;
   $64 = HEAP32[$2>>2]|0;
   $65 = ($63>>>0)<($64>>>0);
   if ($65) {
    $66 = ((($63)) + 1|0);
    HEAP32[$0>>2] = $66;
    $67 = HEAP8[$63>>0]|0;
    $68 = $67&255;
    $c$2$be = $68;
   } else {
    $69 = (___shgetc($f)|0);
    $c$2$be = $69;
   }
   $70 = (($c$2$be) + -48)|0;
   $71 = ($70>>>0)<(10);
   $72 = ($62|0)<(21474836);
   $73 = ($61>>>0)<(2061584302);
   $74 = ($62|0)==(21474836);
   $75 = $74 & $73;
   $76 = $72 | $75;
   $77 = $71 & $76;
   if ($77) {
    $53 = $61;$54 = $62;$c$27 = $c$2$be;
   } else {
    $92 = $61;$93 = $62;$c$2$lcssa = $c$2$be;
    break;
   }
  }
 } else {
  $92 = $$lcssa22;$93 = $48;$c$2$lcssa = $c$1$be$lcssa;
 }
 $51 = (($c$2$lcssa) + -48)|0;
 $52 = ($51>>>0)<(10);
 if ($52) {
  while(1) {
   $78 = HEAP32[$0>>2]|0;
   $79 = HEAP32[$2>>2]|0;
   $80 = ($78>>>0)<($79>>>0);
   if ($80) {
    $81 = ((($78)) + 1|0);
    HEAP32[$0>>2] = $81;
    $82 = HEAP8[$78>>0]|0;
    $83 = $82&255;
    $c$3$be = $83;
   } else {
    $84 = (___shgetc($f)|0);
    $c$3$be = $84;
   }
   $85 = (($c$3$be) + -48)|0;
   $86 = ($85>>>0)<(10);
   if (!($86)) {
    break;
   }
  }
 }
 $87 = HEAP32[$2>>2]|0;
 $88 = ($87|0)==(0|0);
 if (!($88)) {
  $89 = HEAP32[$0>>2]|0;
  $90 = ((($89)) + -1|0);
  HEAP32[$0>>2] = $90;
 }
 $91 = ($neg$0|0)!=(0);
 $94 = (_i64Subtract(0,0,($92|0),($93|0))|0);
 $95 = tempRet0;
 $96 = $91 ? $94 : $92;
 $97 = $91 ? $95 : $93;
 $98 = $97;$99 = $96;
 tempRet0 = ($98);
 return ($99|0);
}
function _printf_core($f,$fmt,$ap,$nl_arg,$nl_type) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 $nl_arg = $nl_arg|0;
 $nl_type = $nl_type|0;
 var $$ = 0, $$$i = 0, $$0 = 0, $$0$i = 0, $$0$lcssa$i = 0, $$0$lcssa$i$i = 0, $$0$lcssa$i104$i = 0, $$0$lcssa$i128$i = 0, $$0$lcssa$i143$i = 0, $$0$lcssa$i39$i = 0, $$0$lcssa$i46 = 0, $$0$lcssa$i46$i = 0, $$0$lcssa$i48$i = 0, $$0$lcssa$i51 = 0, $$0$lcssa$i53 = 0, $$0$lcssa$i56$i = 0, $$0$lcssa$i61 = 0, $$0$lcssa$i63$i = 0, $$0$lcssa$i68 = 0, $$0$lcssa$i69$i = 0;
 var $$0$lcssa$i75 = 0, $$0$lcssa$i76$i = 0, $$0$lcssa$i84$i = 0, $$0$lcssa$i85 = 0, $$0$lcssa$i97$i = 0, $$01$i = 0, $$01$i$i = 0, $$01$i102$i = 0, $$01$i126$i = 0, $$01$i141$i = 0, $$01$i37$i = 0, $$01$i44 = 0, $$01$i44$i = 0, $$01$i54$i = 0, $$01$i59 = 0, $$01$i61$i = 0, $$01$i66 = 0, $$01$i67$i = 0, $$01$i73 = 0, $$01$i74$i = 0;
 var $$01$i83 = 0, $$01$i95$i = 0, $$01$lcssa$off0$i = 0, $$01$lcssa$off0$i$i = 0, $$01$lcssa$off0$i85$i = 0, $$012$i = 0, $$013$i = 0, $$03$i48 = 0, $$05$i = 0, $$05$i$i = 0, $$05$i79$i = 0, $$07$i = 0.0, $$1$i = 0.0, $$1$lcssa$i$i = 0, $$1$lcssa$i112$i = 0, $$100 = 0, $$114$i = 0, $$12$i = 0, $$12$i$i = 0, $$12$i110$i = 0;
 var $$12$i119$i = 0, $$12$i134$i = 0, $$12$i134$i$lcssa = 0, $$12$i87$i = 0, $$2$i = 0.0, $$2$us$i = 0.0, $$2$us$us$i = 0.0, $$20$i = 0.0, $$21$i = 0, $$210$$22$i = 0, $$210$$24$i = 0, $$210$i = 0, $$23$i = 0, $$24 = 0, $$25 = 0, $$3$i = 0.0, $$31$i = 0, $$311$i = 0, $$4$i = 0.0, $$412$lcssa$i = 0;
 var $$412184$i = 0, $$5196$i = 0, $$a$3$i = 0, $$a$3$us$i = 0, $$a$3$us303$i = 0, $$a$3$us304$i = 0, $$a$3305$i = 0, $$a$3306$i = 0, $$fl$4 = 0, $$l10n$0 = 0, $$lcssa = 0, $$lcssa275$i = 0, $$lcssa443 = 0, $$lcssa448 = 0, $$lcssa449 = 0, $$lcssa450 = 0, $$lcssa451 = 0, $$lcssa452 = 0, $$lcssa454 = 0, $$lcssa455 = 0;
 var $$lcssa461 = 0, $$lcssa465 = 0, $$lcssa467 = 0, $$lcssa470 = 0, $$lcssa471 = 0, $$lcssa474 = 0.0, $$lcssa475 = 0, $$lcssa478 = 0, $$lcssa482 = 0, $$mask$i = 0, $$mask$i38 = 0, $$mask1$i = 0, $$mask1$i37 = 0, $$neg151$i = 0, $$neg152$i = 0, $$p$$i = 0, $$p$5 = 0, $$p$i = 0, $$pn$i = 0, $$pr$i = 0;
 var $$pr146$i = 0, $$pre = 0, $$pre$i = 0, $$pre$phi302$iZ2D = 0, $$pre272 = 0, $$pre300$i = 0, $$pre301$i = 0, $$sum$i = 0, $$sum15$i = 0, $$sum16$i = 0, $$z$3$i = 0, $$z$4$i = 0, $$z$4$us$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0;
 var $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0;
 var $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0;
 var $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0;
 var $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $1075 = 0;
 var $1076 = 0, $1077 = 0, $1078 = 0, $1079 = 0, $108 = 0, $1080 = 0, $1081 = 0, $1082 = 0, $1083 = 0, $1084 = 0, $1085 = 0, $1086 = 0, $1087 = 0, $1088 = 0, $1089 = 0, $109 = 0, $1090 = 0, $1091 = 0, $1092 = 0, $1093 = 0;
 var $1094 = 0, $1095 = 0, $1096 = 0, $1097 = 0, $1098 = 0, $1099 = 0, $11 = 0, $110 = 0, $1100 = 0, $1101 = 0, $1102 = 0, $1103 = 0, $1104 = 0, $1105 = 0, $1106 = 0, $1107 = 0, $1108 = 0, $1109 = 0, $111 = 0, $1110 = 0;
 var $1111 = 0, $1112 = 0, $1113 = 0, $1114 = 0, $1115 = 0, $1116 = 0, $1117 = 0, $1118 = 0, $1119 = 0, $112 = 0, $1120 = 0, $1121 = 0, $1122 = 0, $1123 = 0, $1124 = 0, $1125 = 0, $1126 = 0, $1127 = 0, $1128 = 0, $1129 = 0;
 var $113 = 0, $1130 = 0, $1131 = 0, $1132 = 0, $1133 = 0, $1134 = 0, $1135 = 0, $1136 = 0, $1137 = 0, $1138 = 0, $1139 = 0, $114 = 0, $1140 = 0, $1141 = 0, $1142 = 0, $1143 = 0, $1144 = 0, $1145 = 0, $1146 = 0, $1147 = 0;
 var $1148 = 0, $1149 = 0.0, $115 = 0, $1150 = 0, $1151 = 0, $1152 = 0, $1153 = 0, $1154 = 0, $1155 = 0, $1156 = 0.0, $1157 = 0, $1158 = 0, $1159 = 0, $116 = 0, $1160 = 0, $1161 = 0, $1162 = 0, $1163 = 0, $1164 = 0, $1164$phi = 0;
 var $1165 = 0, $1165$phi = 0, $1166 = 0, $1167 = 0, $1168 = 0, $1169 = 0, $117 = 0, $1170 = 0, $1171 = 0, $1172 = 0, $1173 = 0, $1174 = 0, $1175 = 0, $1176 = 0, $1177 = 0, $1178 = 0, $1179 = 0, $118 = 0, $1180 = 0, $1181 = 0;
 var $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0;
 var $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0;
 var $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0;
 var $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0;
 var $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0;
 var $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0;
 var $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0.0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0;
 var $245 = 0, $246 = 0, $247 = 0.0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0;
 var $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0;
 var $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0;
 var $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0;
 var $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0;
 var $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0;
 var $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0;
 var $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0;
 var $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0;
 var $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0;
 var $425 = 0.0, $426 = 0, $427 = 0.0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0;
 var $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0;
 var $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0.0, $467 = 0.0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0;
 var $48 = 0, $480 = 0, $481 = 0, $482 = 0.0, $483 = 0, $484 = 0, $485 = 0, $486 = 0.0, $487 = 0.0, $488 = 0.0, $489 = 0.0, $49 = 0, $490 = 0.0, $491 = 0.0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0;
 var $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0;
 var $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0;
 var $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0.0, $54 = 0, $540 = 0.0, $541 = 0.0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0;
 var $551 = 0, $552 = 0, $553 = 0, $554 = 0.0, $555 = 0.0, $556 = 0.0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0.0;
 var $57 = 0, $570 = 0.0, $571 = 0.0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0;
 var $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0;
 var $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0;
 var $623 = 0, $624 = 0, $625 = 0, $626 = 0.0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0.0, $635 = 0.0, $636 = 0.0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0;
 var $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0;
 var $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0;
 var $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0;
 var $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0;
 var $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0;
 var $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0;
 var $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0;
 var $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0.0, $776 = 0.0, $777 = 0, $778 = 0.0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0;
 var $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0;
 var $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0;
 var $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0;
 var $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0;
 var $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0;
 var $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0;
 var $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0;
 var $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0;
 var $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0;
 var $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0;
 var $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0;
 var $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $a$0 = 0, $a$1 = 0, $a$1$lcssa$i = 0;
 var $a$1253$i = 0, $a$2 = 0, $a$2$ph$i = 0, $a$3$lcssa$i = 0, $a$3240$i = 0, $a$3240$us$i = 0, $a$5$lcssa$i = 0, $a$5215$i = 0, $a$6$i = 0, $a$7$i = 0, $a$8$ph$i = 0, $arglist_current = 0, $arglist_current11 = 0, $arglist_current14 = 0, $arglist_current17 = 0, $arglist_current2 = 0, $arglist_current20 = 0, $arglist_current23 = 0, $arglist_current26 = 0, $arglist_current29 = 0;
 var $arglist_current32 = 0, $arglist_current35 = 0, $arglist_current38 = 0, $arglist_current41 = 0, $arglist_current44 = 0, $arglist_current47 = 0, $arglist_current5 = 0, $arglist_current50 = 0, $arglist_current53 = 0, $arglist_current56 = 0, $arglist_current59 = 0, $arglist_current62 = 0, $arglist_current8 = 0, $arglist_next = 0, $arglist_next12 = 0, $arglist_next15 = 0, $arglist_next18 = 0, $arglist_next21 = 0, $arglist_next24 = 0, $arglist_next27 = 0;
 var $arglist_next3 = 0, $arglist_next30 = 0, $arglist_next33 = 0, $arglist_next36 = 0, $arglist_next39 = 0, $arglist_next42 = 0, $arglist_next45 = 0, $arglist_next48 = 0, $arglist_next51 = 0, $arglist_next54 = 0, $arglist_next57 = 0, $arglist_next6 = 0, $arglist_next60 = 0, $arglist_next63 = 0, $arglist_next9 = 0, $argpos$0 = 0, $big$i = 0, $buf = 0, $buf$i = 0, $carry$0246$i = 0;
 var $carry3$0234$i = 0, $carry3$0234$us$i = 0, $cnt$0 = 0, $cnt$1 = 0, $cnt$1$lcssa = 0, $d$0$i = 0, $d$0245$i = 0, $d$0247$i = 0, $d$1233$i = 0, $d$1233$us$i = 0, $d$2$lcssa$i = 0, $d$2214$i = 0, $d$3$i = 0, $d$4191$i = 0, $d$5183$i = 0, $d$6195$i = 0, $e$0229$i = 0, $e$1$i = 0, $e$2210$i = 0, $e$3$i = 0;
 var $e$4$ph$i = 0, $e2$i = 0, $ebuf0$i = 0, $estr$0$i = 0, $estr$1$lcssa$i = 0, $estr$1$ph$i = 0, $estr$1201$i = 0, $estr$2$i = 0, $exitcond$i = 0, $expanded = 0, $expanded101 = 0, $expanded102 = 0, $expanded103 = 0, $expanded105 = 0, $expanded106 = 0, $expanded108 = 0, $expanded109 = 0, $expanded110 = 0, $expanded112 = 0, $expanded113 = 0;
 var $expanded115 = 0, $expanded116 = 0, $expanded117 = 0, $expanded119 = 0, $expanded120 = 0, $expanded122 = 0, $expanded123 = 0, $expanded124 = 0, $expanded126 = 0, $expanded127 = 0, $expanded129 = 0, $expanded130 = 0, $expanded131 = 0, $expanded133 = 0, $expanded134 = 0, $expanded136 = 0, $expanded137 = 0, $expanded138 = 0, $expanded140 = 0, $expanded141 = 0;
 var $expanded143 = 0, $expanded144 = 0, $expanded145 = 0, $expanded147 = 0, $expanded148 = 0, $expanded150 = 0, $expanded151 = 0, $expanded152 = 0, $expanded154 = 0, $expanded155 = 0, $expanded157 = 0, $expanded158 = 0, $expanded159 = 0, $expanded161 = 0, $expanded162 = 0, $expanded164 = 0, $expanded165 = 0, $expanded166 = 0, $expanded168 = 0, $expanded169 = 0;
 var $expanded171 = 0, $expanded172 = 0, $expanded173 = 0, $expanded175 = 0, $expanded176 = 0, $expanded178 = 0, $expanded179 = 0, $expanded180 = 0, $expanded182 = 0, $expanded183 = 0, $expanded185 = 0, $expanded186 = 0, $expanded187 = 0, $expanded189 = 0, $expanded190 = 0, $expanded192 = 0, $expanded193 = 0, $expanded194 = 0, $expanded196 = 0, $expanded197 = 0;
 var $expanded199 = 0, $expanded200 = 0, $expanded201 = 0, $expanded203 = 0, $expanded204 = 0, $expanded206 = 0, $expanded207 = 0, $expanded208 = 0, $expanded210 = 0, $expanded211 = 0, $expanded213 = 0, $expanded214 = 0, $expanded215 = 0, $expanded64 = 0, $expanded66 = 0, $expanded67 = 0, $expanded68 = 0, $expanded70 = 0, $expanded71 = 0, $expanded73 = 0;
 var $expanded74 = 0, $expanded75 = 0, $expanded77 = 0, $expanded78 = 0, $expanded80 = 0, $expanded81 = 0, $expanded82 = 0, $expanded84 = 0, $expanded85 = 0, $expanded87 = 0, $expanded88 = 0, $expanded89 = 0, $expanded91 = 0, $expanded92 = 0, $expanded94 = 0, $expanded95 = 0, $expanded96 = 0, $expanded98 = 0, $expanded99 = 0, $fl$0115 = 0;
 var $fl$0175 = 0, $fl$1 = 0, $fl$1$ = 0, $fl$3 = 0, $fl$4 = 0, $fl$6 = 0, $fmt87$lcssa = 0, $fmt87167 = 0, $fmt88 = 0, $fmt89 = 0, $fmt90 = 0, $fmt92 = 0, $fmt92$lcssa446 = 0, $fmt93 = 0, $i$0$lcssa = 0, $i$0$lcssa275 = 0, $i$0180 = 0, $i$0228$i = 0, $i$03$i = 0, $i$03$i30 = 0;
 var $i$1$lcssa$i = 0, $i$1191 = 0, $i$1222$i = 0, $i$2166 = 0, $i$2166$lcssa = 0, $i$2209$i = 0, $i$3164 = 0, $i$3205$i = 0, $isdigit = 0, $isdigit$i = 0, $isdigit$i32 = 0, $isdigit10 = 0, $isdigit12 = 0, $isdigit2$i = 0, $isdigit2$i28 = 0, $isdigittmp = 0, $isdigittmp$ = 0, $isdigittmp$i = 0, $isdigittmp$i31 = 0, $isdigittmp1$i = 0;
 var $isdigittmp1$i27 = 0, $isdigittmp11 = 0, $isdigittmp4$i = 0, $isdigittmp4$i29 = 0, $isdigittmp9 = 0, $j$0$i = 0, $j$0221$i = 0, $j$0223$i = 0, $j$1206$i = 0, $j$2$i = 0, $l$0 = 0, $l$0$i = 0, $l$1$i = 0, $l$1179 = 0, $l$2 = 0, $l10n$0 = 0, $l10n$0$lcssa = 0, $l10n$0$phi = 0, $l10n$1 = 0, $l10n$2 = 0;
 var $l10n$3 = 0, $mb = 0, $notlhs$us$us$i = 0, $notrhs$i = 0, $or$cond = 0, $or$cond$i = 0, $or$cond$i$i = 0, $or$cond$i100$i = 0, $or$cond$i35$i = 0, $or$cond$i42$i = 0, $or$cond$i52$i = 0, $or$cond$i57 = 0, $or$cond$i59$i = 0, $or$cond$i64 = 0, $or$cond$i71 = 0, $or$cond$i72$i = 0, $or$cond$i79 = 0, $or$cond$i81 = 0, $or$cond$i93$i = 0, $or$cond15 = 0;
 var $or$cond19 = 0, $or$cond22 = 0, $or$cond29$i = 0, $or$cond331 = 0, $or$cond6$i = 0, $p$0 = 0, $p$1 = 0, $p$2 = 0, $p$2$ = 0, $p$3 = 0, $p$4274 = 0, $p$5 = 0, $pad$i = 0, $pl$0 = 0, $pl$0$i = 0, $pl$1 = 0, $pl$1$i = 0, $pl$2 = 0, $prefix$0 = 0, $prefix$0$$i = 0;
 var $prefix$0$i = 0, $prefix$1 = 0, $prefix$2 = 0, $r$0$a$8$i = 0, $re$1179$i = 0, $round$0178$i = 0.0, $round6$1$i = 0.0, $s$0$i = 0, $s$0$us$i = 0, $s$0$us$us$i = 0, $s$1$i = 0, $s$1$lcssa$i = 0, $s$1$us$i = 0, $s$1$us$us$i = 0, $s1$0$i = 0, $s7$0188$i = 0, $s7$1$i = 0, $s8$0$lcssa$i = 0, $s8$0180$i = 0, $s9$0$i = 0;
 var $s9$1192$i = 0, $s9$2$i = 0, $sext = 0, $sext101 = 0, $small$0$i = 0.0, $small$1$i = 0.0, $st$0 = 0, $st$0$lcssa447 = 0, $storemerge = 0, $storemerge13 = 0, $storemerge8113 = 0, $storemerge8174 = 0, $t$0 = 0, $t$1 = 0, $w$$i = 0, $w$0 = 0, $w$1 = 0, $w$2 = 0, $w$30$i = 0, $wc = 0;
 var $ws$0181 = 0, $ws$1192 = 0, $y$03$i = 0, $y$03$i$i = 0, $y$03$i109$i = 0, $y$03$i118$i = 0, $y$03$i133$i = 0, $y$03$i86$i = 0, $z$0$i = 0, $z$0$lcssa = 0, $z$0168 = 0, $z$1 = 0, $z$1$lcssa$i = 0, $z$1252$i = 0, $z$2 = 0, $z$2$i = 0, $z$2$i$lcssa = 0, $z$3$lcssa$i = 0, $z$3239$i = 0, $z$3239$us$i = 0;
 var $z$4$i = 0, $z$4$us$i = 0, $z$6$$i = 0, $z$6$i = 0, $z$6$i$lcssa = 0, $z$6$ph$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 864|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $big$i = sp + 16|0;
 $e2$i = sp;
 $buf$i = sp + 832|0;
 $0 = $buf$i;
 $ebuf0$i = sp + 816|0;
 $pad$i = sp + 520|0;
 $buf = sp + 776|0;
 $wc = sp + 8|0;
 $mb = sp + 828|0;
 $1 = ($f|0)!=(0|0);
 $2 = ((($buf)) + 40|0);
 $3 = $2;
 $4 = ((($buf)) + 39|0);
 $5 = ((($wc)) + 4|0);
 $6 = $wc;
 $7 = ((($ebuf0$i)) + 12|0);
 $8 = ((($ebuf0$i)) + 11|0);
 $9 = $7;
 $10 = (($9) - ($0))|0;
 $11 = (-2 - ($0))|0;
 $12 = (($9) + 2)|0;
 $13 = ((($big$i)) + 288|0);
 $14 = ((($buf$i)) + 9|0);
 $15 = $14;
 $16 = ((($buf$i)) + 8|0);
 $1164 = 0;$1165 = 0;$cnt$0 = 0;$fmt89 = $fmt;$l$0 = 0;$l10n$0 = 0;
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
  $22 = HEAP8[$fmt89>>0]|0;
  $23 = ($22<<24>>24)==(0);
  if ($23) {
   $cnt$1$lcssa = $cnt$1;$l10n$0$lcssa = $l10n$0;
   label = 344;
   break;
  } else {
   $1166 = $22;$fmt88 = $fmt89;
  }
  while(1) {
   if ((($1166<<24>>24) == 0)) {
    $fmt87$lcssa = $fmt88;$z$0$lcssa = $fmt88;
    break;
   } else if ((($1166<<24>>24) == 37)) {
    $fmt87167 = $fmt88;$z$0168 = $fmt88;
    label = 9;
    break;
   }
   $24 = ((($fmt88)) + 1|0);
   $$pre = HEAP8[$24>>0]|0;
   $1166 = $$pre;$fmt88 = $24;
  }
  L12: do {
   if ((label|0) == 9) {
    while(1) {
     label = 0;
     $25 = ((($fmt87167)) + 1|0);
     $26 = HEAP8[$25>>0]|0;
     $27 = ($26<<24>>24)==(37);
     if (!($27)) {
      $fmt87$lcssa = $fmt87167;$z$0$lcssa = $z$0168;
      break L12;
     }
     $28 = ((($z$0168)) + 1|0);
     $29 = ((($fmt87167)) + 2|0);
     $30 = HEAP8[$29>>0]|0;
     $31 = ($30<<24>>24)==(37);
     if ($31) {
      $fmt87167 = $29;$z$0168 = $28;
      label = 9;
     } else {
      $fmt87$lcssa = $29;$z$0$lcssa = $28;
      break;
     }
    }
   }
  } while(0);
  $32 = $z$0$lcssa;
  $33 = $fmt89;
  $34 = (($32) - ($33))|0;
  if ($1) {
   (___fwritex($fmt89,$34,$f)|0);
  }
  $35 = ($z$0$lcssa|0)==($fmt89|0);
  if (!($35)) {
   $l10n$0$phi = $l10n$0;$1165$phi = $1165;$1164$phi = $1164;$cnt$0 = $cnt$1;$fmt89 = $fmt87$lcssa;$l$0 = $34;$l10n$0 = $l10n$0$phi;$1165 = $1165$phi;$1164 = $1164$phi;
   continue;
  }
  $36 = ((($fmt87$lcssa)) + 1|0);
  $37 = HEAP8[$36>>0]|0;
  $38 = $37 << 24 >> 24;
  $isdigittmp = (($38) + -48)|0;
  $isdigit = ($isdigittmp>>>0)<(10);
  if ($isdigit) {
   $39 = ((($fmt87$lcssa)) + 2|0);
   $40 = HEAP8[$39>>0]|0;
   $41 = ($40<<24>>24)==(36);
   $42 = ((($fmt87$lcssa)) + 3|0);
   $$100 = $41 ? $42 : $36;
   $$l10n$0 = $41 ? 1 : $l10n$0;
   $isdigittmp$ = $41 ? $isdigittmp : -1;
   $$pre272 = HEAP8[$$100>>0]|0;
   $44 = $$pre272;$argpos$0 = $isdigittmp$;$l10n$1 = $$l10n$0;$storemerge = $$100;
  } else {
   $44 = $37;$argpos$0 = -1;$l10n$1 = $l10n$0;$storemerge = $36;
  }
  $43 = $44 << 24 >> 24;
  $45 = $43 & -32;
  $46 = ($45|0)==(32);
  L24: do {
   if ($46) {
    $48 = $43;$53 = $44;$fl$0175 = 0;$storemerge8174 = $storemerge;
    while(1) {
     $47 = (($48) + -32)|0;
     $49 = 1 << $47;
     $50 = $49 & 75913;
     $51 = ($50|0)==(0);
     if ($51) {
      $62 = $53;$fl$0115 = $fl$0175;$storemerge8113 = $storemerge8174;
      break L24;
     }
     $52 = $53 << 24 >> 24;
     $54 = (($52) + -32)|0;
     $55 = 1 << $54;
     $56 = $55 | $fl$0175;
     $57 = ((($storemerge8174)) + 1|0);
     $58 = HEAP8[$57>>0]|0;
     $59 = $58 << 24 >> 24;
     $60 = $59 & -32;
     $61 = ($60|0)==(32);
     if ($61) {
      $48 = $59;$53 = $58;$fl$0175 = $56;$storemerge8174 = $57;
     } else {
      $62 = $58;$fl$0115 = $56;$storemerge8113 = $57;
      break;
     }
    }
   } else {
    $62 = $44;$fl$0115 = 0;$storemerge8113 = $storemerge;
   }
  } while(0);
  $63 = ($62<<24>>24)==(42);
  do {
   if ($63) {
    $64 = ((($storemerge8113)) + 1|0);
    $65 = HEAP8[$64>>0]|0;
    $66 = $65 << 24 >> 24;
    $isdigittmp11 = (($66) + -48)|0;
    $isdigit12 = ($isdigittmp11>>>0)<(10);
    if ($isdigit12) {
     $67 = ((($storemerge8113)) + 2|0);
     $68 = HEAP8[$67>>0]|0;
     $69 = ($68<<24>>24)==(36);
     if ($69) {
      $70 = (($nl_type) + ($isdigittmp11<<2)|0);
      HEAP32[$70>>2] = 10;
      $71 = HEAP8[$64>>0]|0;
      $72 = $71 << 24 >> 24;
      $73 = (($72) + -48)|0;
      $74 = (($nl_arg) + ($73<<3)|0);
      $75 = $74;
      $76 = $75;
      $77 = HEAP32[$76>>2]|0;
      $78 = (($75) + 4)|0;
      $79 = $78;
      $80 = HEAP32[$79>>2]|0;
      $81 = ((($storemerge8113)) + 3|0);
      $l10n$2 = 1;$storemerge13 = $81;$w$0 = $77;
     } else {
      label = 23;
     }
    } else {
     label = 23;
    }
    if ((label|0) == 23) {
     label = 0;
     $82 = ($l10n$1|0)==(0);
     if (!($82)) {
      $$0 = -1;
      label = 363;
      break L1;
     }
     if (!($1)) {
      $fl$1 = $fl$0115;$fmt90 = $64;$l10n$3 = 0;$w$1 = 0;
      break;
     }
     $arglist_current = HEAP32[$ap>>2]|0;
     $83 = $arglist_current;
     $84 = ((0) + 4|0);
     $expanded64 = $84;
     $expanded = (($expanded64) - 1)|0;
     $85 = (($83) + ($expanded))|0;
     $86 = ((0) + 4|0);
     $expanded68 = $86;
     $expanded67 = (($expanded68) - 1)|0;
     $expanded66 = $expanded67 ^ -1;
     $87 = $85 & $expanded66;
     $88 = $87;
     $89 = HEAP32[$88>>2]|0;
     $arglist_next = ((($88)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next;
     $l10n$2 = 0;$storemerge13 = $64;$w$0 = $89;
    }
    $90 = ($w$0|0)<(0);
    if ($90) {
     $91 = $fl$0115 | 8192;
     $92 = (0 - ($w$0))|0;
     $fl$1 = $91;$fmt90 = $storemerge13;$l10n$3 = $l10n$2;$w$1 = $92;
    } else {
     $fl$1 = $fl$0115;$fmt90 = $storemerge13;$l10n$3 = $l10n$2;$w$1 = $w$0;
    }
   } else {
    $93 = $62 << 24 >> 24;
    $isdigittmp1$i = (($93) + -48)|0;
    $isdigit2$i = ($isdigittmp1$i>>>0)<(10);
    if ($isdigit2$i) {
     $97 = $storemerge8113;$i$03$i = 0;$isdigittmp4$i = $isdigittmp1$i;
     while(1) {
      $94 = ($i$03$i*10)|0;
      $95 = (($94) + ($isdigittmp4$i))|0;
      $96 = ((($97)) + 1|0);
      $98 = HEAP8[$96>>0]|0;
      $99 = $98 << 24 >> 24;
      $isdigittmp$i = (($99) + -48)|0;
      $isdigit$i = ($isdigittmp$i>>>0)<(10);
      if ($isdigit$i) {
       $97 = $96;$i$03$i = $95;$isdigittmp4$i = $isdigittmp$i;
      } else {
       $$lcssa = $95;$$lcssa443 = $96;
       break;
      }
     }
     $100 = ($$lcssa|0)<(0);
     if ($100) {
      $$0 = -1;
      label = 363;
      break L1;
     } else {
      $fl$1 = $fl$0115;$fmt90 = $$lcssa443;$l10n$3 = $l10n$1;$w$1 = $$lcssa;
     }
    } else {
     $fl$1 = $fl$0115;$fmt90 = $storemerge8113;$l10n$3 = $l10n$1;$w$1 = 0;
    }
   }
  } while(0);
  $101 = HEAP8[$fmt90>>0]|0;
  $102 = ($101<<24>>24)==(46);
  L45: do {
   if ($102) {
    $103 = ((($fmt90)) + 1|0);
    $104 = HEAP8[$103>>0]|0;
    $105 = ($104<<24>>24)==(42);
    if (!($105)) {
     $132 = $104 << 24 >> 24;
     $isdigittmp1$i27 = (($132) + -48)|0;
     $isdigit2$i28 = ($isdigittmp1$i27>>>0)<(10);
     if ($isdigit2$i28) {
      $136 = $103;$i$03$i30 = 0;$isdigittmp4$i29 = $isdigittmp1$i27;
     } else {
      $fmt93 = $103;$p$0 = 0;
      break;
     }
     while(1) {
      $133 = ($i$03$i30*10)|0;
      $134 = (($133) + ($isdigittmp4$i29))|0;
      $135 = ((($136)) + 1|0);
      $137 = HEAP8[$135>>0]|0;
      $138 = $137 << 24 >> 24;
      $isdigittmp$i31 = (($138) + -48)|0;
      $isdigit$i32 = ($isdigittmp$i31>>>0)<(10);
      if ($isdigit$i32) {
       $136 = $135;$i$03$i30 = $134;$isdigittmp4$i29 = $isdigittmp$i31;
      } else {
       $fmt93 = $135;$p$0 = $134;
       break L45;
      }
     }
    }
    $106 = ((($fmt90)) + 2|0);
    $107 = HEAP8[$106>>0]|0;
    $108 = $107 << 24 >> 24;
    $isdigittmp9 = (($108) + -48)|0;
    $isdigit10 = ($isdigittmp9>>>0)<(10);
    if ($isdigit10) {
     $109 = ((($fmt90)) + 3|0);
     $110 = HEAP8[$109>>0]|0;
     $111 = ($110<<24>>24)==(36);
     if ($111) {
      $112 = (($nl_type) + ($isdigittmp9<<2)|0);
      HEAP32[$112>>2] = 10;
      $113 = HEAP8[$106>>0]|0;
      $114 = $113 << 24 >> 24;
      $115 = (($114) + -48)|0;
      $116 = (($nl_arg) + ($115<<3)|0);
      $117 = $116;
      $118 = $117;
      $119 = HEAP32[$118>>2]|0;
      $120 = (($117) + 4)|0;
      $121 = $120;
      $122 = HEAP32[$121>>2]|0;
      $123 = ((($fmt90)) + 4|0);
      $fmt93 = $123;$p$0 = $119;
      break;
     }
    }
    $124 = ($l10n$3|0)==(0);
    if (!($124)) {
     $$0 = -1;
     label = 363;
     break L1;
    }
    if ($1) {
     $arglist_current2 = HEAP32[$ap>>2]|0;
     $125 = $arglist_current2;
     $126 = ((0) + 4|0);
     $expanded71 = $126;
     $expanded70 = (($expanded71) - 1)|0;
     $127 = (($125) + ($expanded70))|0;
     $128 = ((0) + 4|0);
     $expanded75 = $128;
     $expanded74 = (($expanded75) - 1)|0;
     $expanded73 = $expanded74 ^ -1;
     $129 = $127 & $expanded73;
     $130 = $129;
     $131 = HEAP32[$130>>2]|0;
     $arglist_next3 = ((($130)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next3;
     $fmt93 = $106;$p$0 = $131;
    } else {
     $fmt93 = $106;$p$0 = 0;
    }
   } else {
    $fmt93 = $fmt90;$p$0 = -1;
   }
  } while(0);
  $fmt92 = $fmt93;$st$0 = 0;
  while(1) {
   $139 = HEAP8[$fmt92>>0]|0;
   $140 = $139 << 24 >> 24;
   $141 = (($140) + -65)|0;
   $142 = ($141>>>0)>(57);
   if ($142) {
    $$0 = -1;
    label = 363;
    break L1;
   }
   $143 = ((($fmt92)) + 1|0);
   $144 = ((15680 + (($st$0*58)|0)|0) + ($141)|0);
   $145 = HEAP8[$144>>0]|0;
   $146 = $145&255;
   $147 = (($146) + -1)|0;
   $148 = ($147>>>0)<(8);
   if ($148) {
    $fmt92 = $143;$st$0 = $146;
   } else {
    $$lcssa448 = $143;$$lcssa449 = $145;$$lcssa450 = $146;$fmt92$lcssa446 = $fmt92;$st$0$lcssa447 = $st$0;
    break;
   }
  }
  $149 = ($$lcssa449<<24>>24)==(0);
  if ($149) {
   $$0 = -1;
   label = 363;
   break;
  }
  $150 = ($$lcssa449<<24>>24)==(19);
  $151 = ($argpos$0|0)>(-1);
  L64: do {
   if ($150) {
    if ($151) {
     $$0 = -1;
     label = 363;
     break L1;
    } else {
     $1167 = $1164;$1168 = $1165;
     label = 62;
    }
   } else {
    if ($151) {
     $152 = (($nl_type) + ($argpos$0<<2)|0);
     HEAP32[$152>>2] = $$lcssa450;
     $153 = (($nl_arg) + ($argpos$0<<3)|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = ((($153)) + 4|0);
     $156 = HEAP32[$155>>2]|0;
     $1167 = $156;$1168 = $154;
     label = 62;
     break;
    }
    if (!($1)) {
     $$0 = 0;
     label = 363;
     break L1;
    }
    $157 = ($$lcssa449&255)>(20);
    if ($157) {
     $259 = $1165;$286 = $1164;
    } else {
     do {
      switch ($$lcssa450|0) {
      case 11:  {
       $arglist_current11 = HEAP32[$ap>>2]|0;
       $175 = $arglist_current11;
       $176 = ((0) + 4|0);
       $expanded92 = $176;
       $expanded91 = (($expanded92) - 1)|0;
       $177 = (($175) + ($expanded91))|0;
       $178 = ((0) + 4|0);
       $expanded96 = $178;
       $expanded95 = (($expanded96) - 1)|0;
       $expanded94 = $expanded95 ^ -1;
       $179 = $177 & $expanded94;
       $180 = $179;
       $181 = HEAP32[$180>>2]|0;
       $arglist_next12 = ((($180)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next12;
       $259 = $181;$286 = 0;
       break L64;
       break;
      }
      case 9:  {
       $arglist_current5 = HEAP32[$ap>>2]|0;
       $158 = $arglist_current5;
       $159 = ((0) + 4|0);
       $expanded78 = $159;
       $expanded77 = (($expanded78) - 1)|0;
       $160 = (($158) + ($expanded77))|0;
       $161 = ((0) + 4|0);
       $expanded82 = $161;
       $expanded81 = (($expanded82) - 1)|0;
       $expanded80 = $expanded81 ^ -1;
       $162 = $160 & $expanded80;
       $163 = $162;
       $164 = HEAP32[$163>>2]|0;
       $arglist_next6 = ((($163)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next6;
       $165 = $164;
       $259 = $165;$286 = $1164;
       break L64;
       break;
      }
      case 12:  {
       $arglist_current14 = HEAP32[$ap>>2]|0;
       $182 = $arglist_current14;
       $183 = ((0) + 8|0);
       $expanded99 = $183;
       $expanded98 = (($expanded99) - 1)|0;
       $184 = (($182) + ($expanded98))|0;
       $185 = ((0) + 8|0);
       $expanded103 = $185;
       $expanded102 = (($expanded103) - 1)|0;
       $expanded101 = $expanded102 ^ -1;
       $186 = $184 & $expanded101;
       $187 = $186;
       $188 = $187;
       $189 = $188;
       $190 = HEAP32[$189>>2]|0;
       $191 = (($188) + 4)|0;
       $192 = $191;
       $193 = HEAP32[$192>>2]|0;
       $arglist_next15 = ((($187)) + 8|0);
       HEAP32[$ap>>2] = $arglist_next15;
       $259 = $190;$286 = $193;
       break L64;
       break;
      }
      case 10:  {
       $arglist_current8 = HEAP32[$ap>>2]|0;
       $166 = $arglist_current8;
       $167 = ((0) + 4|0);
       $expanded85 = $167;
       $expanded84 = (($expanded85) - 1)|0;
       $168 = (($166) + ($expanded84))|0;
       $169 = ((0) + 4|0);
       $expanded89 = $169;
       $expanded88 = (($expanded89) - 1)|0;
       $expanded87 = $expanded88 ^ -1;
       $170 = $168 & $expanded87;
       $171 = $170;
       $172 = HEAP32[$171>>2]|0;
       $arglist_next9 = ((($171)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next9;
       $173 = ($172|0)<(0);
       $174 = $173 << 31 >> 31;
       $259 = $172;$286 = $174;
       break L64;
       break;
      }
      case 13:  {
       $arglist_current17 = HEAP32[$ap>>2]|0;
       $194 = $arglist_current17;
       $195 = ((0) + 4|0);
       $expanded106 = $195;
       $expanded105 = (($expanded106) - 1)|0;
       $196 = (($194) + ($expanded105))|0;
       $197 = ((0) + 4|0);
       $expanded110 = $197;
       $expanded109 = (($expanded110) - 1)|0;
       $expanded108 = $expanded109 ^ -1;
       $198 = $196 & $expanded108;
       $199 = $198;
       $200 = HEAP32[$199>>2]|0;
       $arglist_next18 = ((($199)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next18;
       $201 = $200&65535;
       $202 = $201 << 16 >> 16;
       $203 = ($202|0)<(0);
       $204 = $203 << 31 >> 31;
       $sext101 = $200 << 16;
       $205 = $sext101 >> 16;
       $259 = $205;$286 = $204;
       break L64;
       break;
      }
      case 15:  {
       $arglist_current23 = HEAP32[$ap>>2]|0;
       $213 = $arglist_current23;
       $214 = ((0) + 4|0);
       $expanded120 = $214;
       $expanded119 = (($expanded120) - 1)|0;
       $215 = (($213) + ($expanded119))|0;
       $216 = ((0) + 4|0);
       $expanded124 = $216;
       $expanded123 = (($expanded124) - 1)|0;
       $expanded122 = $expanded123 ^ -1;
       $217 = $215 & $expanded122;
       $218 = $217;
       $219 = HEAP32[$218>>2]|0;
       $arglist_next24 = ((($218)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next24;
       $220 = $219&255;
       $221 = $220 << 24 >> 24;
       $222 = ($221|0)<(0);
       $223 = $222 << 31 >> 31;
       $sext = $219 << 24;
       $224 = $sext >> 24;
       $259 = $224;$286 = $223;
       break L64;
       break;
      }
      case 14:  {
       $arglist_current20 = HEAP32[$ap>>2]|0;
       $206 = $arglist_current20;
       $207 = ((0) + 4|0);
       $expanded113 = $207;
       $expanded112 = (($expanded113) - 1)|0;
       $208 = (($206) + ($expanded112))|0;
       $209 = ((0) + 4|0);
       $expanded117 = $209;
       $expanded116 = (($expanded117) - 1)|0;
       $expanded115 = $expanded116 ^ -1;
       $210 = $208 & $expanded115;
       $211 = $210;
       $212 = HEAP32[$211>>2]|0;
       $arglist_next21 = ((($211)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next21;
       $$mask1$i37 = $212 & 65535;
       $259 = $$mask1$i37;$286 = 0;
       break L64;
       break;
      }
      case 18:  {
       $arglist_current32 = HEAP32[$ap>>2]|0;
       $241 = $arglist_current32;
       $242 = ((0) + 8|0);
       $expanded141 = $242;
       $expanded140 = (($expanded141) - 1)|0;
       $243 = (($241) + ($expanded140))|0;
       $244 = ((0) + 8|0);
       $expanded145 = $244;
       $expanded144 = (($expanded145) - 1)|0;
       $expanded143 = $expanded144 ^ -1;
       $245 = $243 & $expanded143;
       $246 = $245;
       $247 = +HEAPF64[$246>>3];
       $arglist_next33 = ((($246)) + 8|0);
       HEAP32[$ap>>2] = $arglist_next33;
       HEAPF64[tempDoublePtr>>3] = $247;$248 = HEAP32[tempDoublePtr>>2]|0;
       $249 = HEAP32[tempDoublePtr+4>>2]|0;
       $259 = $248;$286 = $249;
       break L64;
       break;
      }
      case 17:  {
       $arglist_current29 = HEAP32[$ap>>2]|0;
       $232 = $arglist_current29;
       $233 = ((0) + 8|0);
       $expanded134 = $233;
       $expanded133 = (($expanded134) - 1)|0;
       $234 = (($232) + ($expanded133))|0;
       $235 = ((0) + 8|0);
       $expanded138 = $235;
       $expanded137 = (($expanded138) - 1)|0;
       $expanded136 = $expanded137 ^ -1;
       $236 = $234 & $expanded136;
       $237 = $236;
       $238 = +HEAPF64[$237>>3];
       $arglist_next30 = ((($237)) + 8|0);
       HEAP32[$ap>>2] = $arglist_next30;
       HEAPF64[tempDoublePtr>>3] = $238;$239 = HEAP32[tempDoublePtr>>2]|0;
       $240 = HEAP32[tempDoublePtr+4>>2]|0;
       $259 = $239;$286 = $240;
       break L64;
       break;
      }
      case 16:  {
       $arglist_current26 = HEAP32[$ap>>2]|0;
       $225 = $arglist_current26;
       $226 = ((0) + 4|0);
       $expanded127 = $226;
       $expanded126 = (($expanded127) - 1)|0;
       $227 = (($225) + ($expanded126))|0;
       $228 = ((0) + 4|0);
       $expanded131 = $228;
       $expanded130 = (($expanded131) - 1)|0;
       $expanded129 = $expanded130 ^ -1;
       $229 = $227 & $expanded129;
       $230 = $229;
       $231 = HEAP32[$230>>2]|0;
       $arglist_next27 = ((($230)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next27;
       $$mask$i38 = $231 & 255;
       $259 = $$mask$i38;$286 = 0;
       break L64;
       break;
      }
      default: {
       $259 = $1165;$286 = $1164;
       break L64;
      }
      }
     } while(0);
    }
   }
  } while(0);
  if ((label|0) == 62) {
   label = 0;
   if ($1) {
    $259 = $1168;$286 = $1167;
   } else {
    $1164 = $1167;$1165 = $1168;$cnt$0 = $cnt$1;$fmt89 = $$lcssa448;$l$0 = $34;$l10n$0 = $l10n$3;
    continue;
   }
  }
  $250 = HEAP8[$fmt92$lcssa446>>0]|0;
  $251 = $250 << 24 >> 24;
  $252 = ($st$0$lcssa447|0)!=(0);
  $253 = $251 & 15;
  $254 = ($253|0)==(3);
  $or$cond15 = $252 & $254;
  $255 = $251 & -33;
  $t$0 = $or$cond15 ? $255 : $251;
  $256 = $fl$1 & 8192;
  $257 = ($256|0)==(0);
  $258 = $fl$1 & -65537;
  $fl$1$ = $257 ? $fl$1 : $258;
  L86: do {
   switch ($t$0|0) {
   case 88: case 120:  {
    $fl$3 = $fl$1$;$p$1 = $p$0;$t$1 = $t$0;
    label = 73;
    break;
   }
   case 112:  {
    $281 = ($p$0>>>0)>(8);
    $282 = $281 ? $p$0 : 8;
    $283 = $fl$1$ | 8;
    $fl$3 = $283;$p$1 = $282;$t$1 = 120;
    label = 73;
    break;
   }
   case 110:  {
    switch ($st$0$lcssa447|0) {
    case 4:  {
     $271 = $cnt$1&255;
     $272 = $259;
     HEAP8[$272>>0] = $271;
     $1164 = $286;$1165 = $259;$cnt$0 = $cnt$1;$fmt89 = $$lcssa448;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 3:  {
     $269 = $cnt$1&65535;
     $270 = $259;
     HEAP16[$270>>1] = $269;
     $1164 = $286;$1165 = $259;$cnt$0 = $cnt$1;$fmt89 = $$lcssa448;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 0:  {
     $260 = $259;
     HEAP32[$260>>2] = $cnt$1;
     $1164 = $286;$1165 = $259;$cnt$0 = $cnt$1;$fmt89 = $$lcssa448;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 7:  {
     $274 = ($cnt$1|0)<(0);
     $275 = $274 << 31 >> 31;
     $276 = $259;
     $277 = $276;
     $278 = $277;
     HEAP32[$278>>2] = $cnt$1;
     $279 = (($277) + 4)|0;
     $280 = $279;
     HEAP32[$280>>2] = $275;
     $1164 = $286;$1165 = $259;$cnt$0 = $cnt$1;$fmt89 = $$lcssa448;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 1:  {
     $261 = $259;
     HEAP32[$261>>2] = $cnt$1;
     $1164 = $286;$1165 = $259;$cnt$0 = $cnt$1;$fmt89 = $$lcssa448;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 6:  {
     $273 = $259;
     HEAP32[$273>>2] = $cnt$1;
     $1164 = $286;$1165 = $259;$cnt$0 = $cnt$1;$fmt89 = $$lcssa448;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    case 2:  {
     $262 = ($cnt$1|0)<(0);
     $263 = $262 << 31 >> 31;
     $264 = $259;
     $265 = $264;
     $266 = $265;
     HEAP32[$266>>2] = $cnt$1;
     $267 = (($265) + 4)|0;
     $268 = $267;
     HEAP32[$268>>2] = $263;
     $1164 = $286;$1165 = $259;$cnt$0 = $cnt$1;$fmt89 = $$lcssa448;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
     break;
    }
    default: {
     $1164 = $286;$1165 = $259;$cnt$0 = $cnt$1;$fmt89 = $$lcssa448;$l$0 = $34;$l10n$0 = $l10n$3;
     continue L1;
    }
    }
    break;
   }
   case 111:  {
    $307 = ($259|0)==(0);
    $308 = ($286|0)==(0);
    $309 = $307 & $308;
    if ($309) {
     $$0$lcssa$i51 = $2;
    } else {
     $$03$i48 = $2;$311 = $259;$315 = $286;
     while(1) {
      $310 = $311 & 7;
      $312 = $310 | 48;
      $313 = $312&255;
      $314 = ((($$03$i48)) + -1|0);
      HEAP8[$314>>0] = $313;
      $316 = (_bitshift64Lshr(($311|0),($315|0),3)|0);
      $317 = tempRet0;
      $318 = ($316|0)==(0);
      $319 = ($317|0)==(0);
      $320 = $318 & $319;
      if ($320) {
       $$0$lcssa$i51 = $314;
       break;
      } else {
       $$03$i48 = $314;$311 = $316;$315 = $317;
      }
     }
    }
    $321 = $fl$1$ & 8;
    $322 = ($321|0)==(0);
    $or$cond19 = $322 | $309;
    $$24 = $or$cond19 ? 16160 : (16165);
    $323 = $or$cond19&1;
    $$25 = $323 ^ 1;
    $361 = $259;$363 = $286;$a$0 = $$0$lcssa$i51;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $$25;$prefix$1 = $$24;
    label = 89;
    break;
   }
   case 105: case 100:  {
    $324 = ($286|0)<(0);
    if ($324) {
     $325 = (_i64Subtract(0,0,($259|0),($286|0))|0);
     $326 = tempRet0;
     $331 = $326;$333 = $325;$pl$0 = 1;$prefix$0 = 16160;
     label = 84;
     break L86;
    }
    $327 = $fl$1$ & 2048;
    $328 = ($327|0)==(0);
    if ($328) {
     $329 = $fl$1$ & 1;
     $330 = ($329|0)==(0);
     $$ = $330 ? 16160 : (16162);
     $331 = $286;$333 = $259;$pl$0 = $329;$prefix$0 = $$;
     label = 84;
    } else {
     $331 = $286;$333 = $259;$pl$0 = 1;$prefix$0 = (16161);
     label = 84;
    }
    break;
   }
   case 99:  {
    $373 = $259&255;
    HEAP8[$4>>0] = $373;
    $1169 = $286;$1170 = $259;$a$2 = $4;$fl$6 = $258;$p$5 = 1;$pl$2 = 0;$prefix$2 = 16160;$z$2 = $2;
    break;
   }
   case 67:  {
    HEAP32[$wc>>2] = $259;
    HEAP32[$5>>2] = 0;
    $1173 = $wc;$1174 = $6;$p$4274 = -1;
    label = 97;
    break;
   }
   case 109:  {
    $374 = (___errno_location()|0);
    $375 = HEAP32[$374>>2]|0;
    $376 = (_strerror(($375|0))|0);
    $a$1 = $376;
    label = 94;
    break;
   }
   case 83:  {
    $386 = $259;
    $387 = ($p$0|0)==(0);
    if ($387) {
     $1175 = $259;$1176 = $386;$i$0$lcssa275 = 0;
     label = 102;
    } else {
     $1173 = $386;$1174 = $259;$p$4274 = $p$0;
     label = 97;
    }
    break;
   }
   case 117:  {
    $331 = $286;$333 = $259;$pl$0 = 0;$prefix$0 = 16160;
    label = 84;
    break;
   }
   case 115:  {
    $377 = $259;
    $378 = ($259|0)!=(0);
    $379 = $378 ? $377 : 16176;
    $a$1 = $379;
    label = 94;
    break;
   }
   case 65: case 71: case 70: case 69: case 97: case 103: case 102: case 101:  {
    HEAP32[tempDoublePtr>>2] = $259;HEAP32[tempDoublePtr+4>>2] = $286;$425 = +HEAPF64[tempDoublePtr>>3];
    HEAP32[$e2$i>>2] = 0;
    $426 = ($286|0)<(0);
    if ($426) {
     $427 = -$425;
     $$07$i = $427;$pl$0$i = 1;$prefix$0$i = 16184;
    } else {
     $428 = $fl$1$ & 2048;
     $429 = ($428|0)==(0);
     if ($429) {
      $430 = $fl$1$ & 1;
      $431 = ($430|0)==(0);
      $$$i = $431 ? (16185) : (16190);
      $$07$i = $425;$pl$0$i = $430;$prefix$0$i = $$$i;
     } else {
      $$07$i = $425;$pl$0$i = 1;$prefix$0$i = (16187);
     }
    }
    HEAPF64[tempDoublePtr>>3] = $$07$i;$432 = HEAP32[tempDoublePtr>>2]|0;
    $433 = HEAP32[tempDoublePtr+4>>2]|0;
    $434 = $433 & 2146435072;
    $435 = ($434>>>0)<(2146435072);
    $436 = (0)<(0);
    $437 = ($434|0)==(2146435072);
    $438 = $437 & $436;
    $439 = $435 | $438;
    do {
     if ($439) {
      $466 = (+_frexpl($$07$i,$e2$i));
      $467 = $466 * 2.0;
      $468 = $467 != 0.0;
      if ($468) {
       $469 = HEAP32[$e2$i>>2]|0;
       $470 = (($469) + -1)|0;
       HEAP32[$e2$i>>2] = $470;
      }
      $471 = $t$0 | 32;
      $472 = ($471|0)==(97);
      if ($472) {
       $473 = $t$0 & 32;
       $474 = ($473|0)==(0);
       $475 = ((($prefix$0$i)) + 9|0);
       $prefix$0$$i = $474 ? $prefix$0$i : $475;
       $476 = $pl$0$i | 2;
       $477 = ($p$0>>>0)>(11);
       $478 = (12 - ($p$0))|0;
       $479 = ($478|0)==(0);
       $480 = $477 | $479;
       do {
        if ($480) {
         $$1$i = $467;
        } else {
         $re$1179$i = $478;$round$0178$i = 8.0;
         while(1) {
          $481 = (($re$1179$i) + -1)|0;
          $482 = $round$0178$i * 16.0;
          $483 = ($481|0)==(0);
          if ($483) {
           $$lcssa474 = $482;
           break;
          } else {
           $re$1179$i = $481;$round$0178$i = $482;
          }
         }
         $484 = HEAP8[$prefix$0$$i>>0]|0;
         $485 = ($484<<24>>24)==(45);
         if ($485) {
          $486 = -$467;
          $487 = $486 - $$lcssa474;
          $488 = $$lcssa474 + $487;
          $489 = -$488;
          $$1$i = $489;
          break;
         } else {
          $490 = $467 + $$lcssa474;
          $491 = $490 - $$lcssa474;
          $$1$i = $491;
          break;
         }
        }
       } while(0);
       $492 = HEAP32[$e2$i>>2]|0;
       $493 = ($492|0)<(0);
       $494 = (0 - ($492))|0;
       $495 = $493 ? $494 : $492;
       $496 = ($495|0)<(0);
       if ($496) {
        $497 = ($495|0)<(0);
        $498 = $497 << 31 >> 31;
        $$05$i$i = $7;$499 = $495;$500 = $498;
        while(1) {
         $501 = (___uremdi3(($499|0),($500|0),10,0)|0);
         $502 = tempRet0;
         $503 = $501 | 48;
         $504 = $503&255;
         $505 = ((($$05$i$i)) + -1|0);
         HEAP8[$505>>0] = $504;
         $506 = (___udivdi3(($499|0),($500|0),10,0)|0);
         $507 = tempRet0;
         $508 = ($500>>>0)>(9);
         $509 = ($499>>>0)>(4294967295);
         $510 = ($500|0)==(9);
         $511 = $510 & $509;
         $512 = $508 | $511;
         if ($512) {
          $$05$i$i = $505;$499 = $506;$500 = $507;
         } else {
          $$lcssa475 = $505;$1177 = $506;$1178 = $507;
          break;
         }
        }
        $$0$lcssa$i48$i = $$lcssa475;$$01$lcssa$off0$i$i = $1177;
       } else {
        $$0$lcssa$i48$i = $7;$$01$lcssa$off0$i$i = $495;
       }
       $513 = ($$01$lcssa$off0$i$i|0)==(0);
       if ($513) {
        $$1$lcssa$i$i = $$0$lcssa$i48$i;
       } else {
        $$12$i$i = $$0$lcssa$i48$i;$y$03$i$i = $$01$lcssa$off0$i$i;
        while(1) {
         $514 = (($y$03$i$i>>>0) % 10)&-1;
         $515 = $514 | 48;
         $516 = $515&255;
         $517 = ((($$12$i$i)) + -1|0);
         HEAP8[$517>>0] = $516;
         $518 = (($y$03$i$i>>>0) / 10)&-1;
         $519 = ($y$03$i$i>>>0)<(10);
         if ($519) {
          $$1$lcssa$i$i = $517;
          break;
         } else {
          $$12$i$i = $517;$y$03$i$i = $518;
         }
        }
       }
       $520 = ($$1$lcssa$i$i|0)==($7|0);
       if ($520) {
        HEAP8[$8>>0] = 48;
        $estr$0$i = $8;
       } else {
        $estr$0$i = $$1$lcssa$i$i;
       }
       $521 = HEAP32[$e2$i>>2]|0;
       $522 = $521 >> 31;
       $523 = $522 & 2;
       $524 = (($523) + 43)|0;
       $525 = $524&255;
       $526 = ((($estr$0$i)) + -1|0);
       HEAP8[$526>>0] = $525;
       $527 = (($t$0) + 15)|0;
       $528 = $527&255;
       $529 = ((($estr$0$i)) + -2|0);
       HEAP8[$529>>0] = $528;
       $530 = $fl$1$ & 8;
       $531 = ($530|0)==(0);
       if ($531) {
        $notrhs$i = ($p$0|0)<(1);
        if ($notrhs$i) {
         $$2$us$us$i = $$1$i;$s$0$us$us$i = $buf$i;
         while(1) {
          $532 = (~~(($$2$us$us$i)));
          $533 = (16144 + ($532)|0);
          $534 = HEAP8[$533>>0]|0;
          $535 = $534&255;
          $536 = $535 | $473;
          $537 = $536&255;
          $538 = ((($s$0$us$us$i)) + 1|0);
          HEAP8[$s$0$us$us$i>>0] = $537;
          $539 = (+($532|0));
          $540 = $$2$us$us$i - $539;
          $541 = $540 * 16.0;
          $542 = $538;
          $543 = (($542) - ($0))|0;
          $544 = ($543|0)!=(1);
          $notlhs$us$us$i = $541 == 0.0;
          $or$cond$i79 = $544 | $notlhs$us$us$i;
          if ($or$cond$i79) {
           $s$1$us$us$i = $538;
          } else {
           $545 = ((($s$0$us$us$i)) + 2|0);
           HEAP8[$538>>0] = 46;
           $s$1$us$us$i = $545;
          }
          $546 = $541 != 0.0;
          if ($546) {
           $$2$us$us$i = $541;$s$0$us$us$i = $s$1$us$us$i;
          } else {
           $s$1$lcssa$i = $s$1$us$us$i;
           break;
          }
         }
        } else {
         $$2$us$i = $$1$i;$s$0$us$i = $buf$i;
         while(1) {
          $547 = (~~(($$2$us$i)));
          $548 = (16144 + ($547)|0);
          $549 = HEAP8[$548>>0]|0;
          $550 = $549&255;
          $551 = $550 | $473;
          $552 = $551&255;
          $553 = ((($s$0$us$i)) + 1|0);
          HEAP8[$s$0$us$i>>0] = $552;
          $554 = (+($547|0));
          $555 = $$2$us$i - $554;
          $556 = $555 * 16.0;
          $557 = $553;
          $558 = (($557) - ($0))|0;
          $559 = ($558|0)==(1);
          if ($559) {
           $560 = ((($s$0$us$i)) + 2|0);
           HEAP8[$553>>0] = 46;
           $s$1$us$i = $560;
          } else {
           $s$1$us$i = $553;
          }
          $561 = $556 != 0.0;
          if ($561) {
           $$2$us$i = $556;$s$0$us$i = $s$1$us$i;
          } else {
           $s$1$lcssa$i = $s$1$us$i;
           break;
          }
         }
        }
       } else {
        $$2$i = $$1$i;$s$0$i = $buf$i;
        while(1) {
         $562 = (~~(($$2$i)));
         $563 = (16144 + ($562)|0);
         $564 = HEAP8[$563>>0]|0;
         $565 = $564&255;
         $566 = $565 | $473;
         $567 = $566&255;
         $568 = ((($s$0$i)) + 1|0);
         HEAP8[$s$0$i>>0] = $567;
         $569 = (+($562|0));
         $570 = $$2$i - $569;
         $571 = $570 * 16.0;
         $572 = $568;
         $573 = (($572) - ($0))|0;
         $574 = ($573|0)==(1);
         if ($574) {
          $575 = ((($s$0$i)) + 2|0);
          HEAP8[$568>>0] = 46;
          $s$1$i = $575;
         } else {
          $s$1$i = $568;
         }
         $576 = $571 != 0.0;
         if ($576) {
          $$2$i = $571;$s$0$i = $s$1$i;
         } else {
          $s$1$lcssa$i = $s$1$i;
          break;
         }
        }
       }
       $577 = ($p$0|0)!=(0);
       $$pre300$i = $s$1$lcssa$i;
       $578 = (($11) + ($$pre300$i))|0;
       $579 = ($578|0)<($p$0|0);
       $or$cond331 = $577 & $579;
       $580 = $529;
       $581 = (($12) + ($p$0))|0;
       $582 = (($581) - ($580))|0;
       $583 = $529;
       $584 = (($10) - ($583))|0;
       $585 = (($584) + ($$pre300$i))|0;
       $l$0$i = $or$cond331 ? $582 : $585;
       $586 = (($l$0$i) + ($476))|0;
       $587 = $fl$1$ & 73728;
       $588 = ($587|0)==(0);
       $589 = ($w$1|0)>($586|0);
       $or$cond$i52$i = $588 & $589;
       if ($or$cond$i52$i) {
        $590 = (($w$1) - ($586))|0;
        $591 = ($590>>>0)>(256);
        $592 = $591 ? 256 : $590;
        _memset(($pad$i|0),32,($592|0))|0;
        $593 = ($590>>>0)>(255);
        if ($593) {
         $$01$i54$i = $590;
         while(1) {
          (___fwritex($pad$i,256,$f)|0);
          $594 = (($$01$i54$i) + -256)|0;
          $595 = ($594>>>0)>(255);
          if ($595) {
           $$01$i54$i = $594;
          } else {
           break;
          }
         }
         $596 = $590 & 255;
         $$0$lcssa$i56$i = $596;
        } else {
         $$0$lcssa$i56$i = $590;
        }
        (___fwritex($pad$i,$$0$lcssa$i56$i,$f)|0);
       }
       (___fwritex($prefix$0$$i,$476,$f)|0);
       $597 = ($587|0)==(65536);
       $or$cond$i59$i = $597 & $589;
       if ($or$cond$i59$i) {
        $598 = (($w$1) - ($586))|0;
        $599 = ($598>>>0)>(256);
        $600 = $599 ? 256 : $598;
        _memset(($pad$i|0),48,($600|0))|0;
        $601 = ($598>>>0)>(255);
        if ($601) {
         $$01$i61$i = $598;
         while(1) {
          (___fwritex($pad$i,256,$f)|0);
          $602 = (($$01$i61$i) + -256)|0;
          $603 = ($602>>>0)>(255);
          if ($603) {
           $$01$i61$i = $602;
          } else {
           break;
          }
         }
         $604 = $598 & 255;
         $$0$lcssa$i63$i = $604;
        } else {
         $$0$lcssa$i63$i = $598;
        }
        (___fwritex($pad$i,$$0$lcssa$i63$i,$f)|0);
       }
       $605 = (($$pre300$i) - ($0))|0;
       (___fwritex($buf$i,$605,$f)|0);
       $606 = $529;
       $607 = (($9) - ($606))|0;
       $608 = (($l$0$i) - ($607))|0;
       $609 = (($608) - ($605))|0;
       $610 = ($609|0)>(0);
       if ($610) {
        $611 = ($609>>>0)>(256);
        $612 = $611 ? 256 : $609;
        _memset(($pad$i|0),48,($612|0))|0;
        $613 = ($609>>>0)>(255);
        if ($613) {
         $$01$i67$i = $609;
         while(1) {
          (___fwritex($pad$i,256,$f)|0);
          $614 = (($$01$i67$i) + -256)|0;
          $615 = ($614>>>0)>(255);
          if ($615) {
           $$01$i67$i = $614;
          } else {
           break;
          }
         }
         $616 = $609 & 255;
         $$0$lcssa$i69$i = $616;
        } else {
         $$0$lcssa$i69$i = $609;
        }
        (___fwritex($pad$i,$$0$lcssa$i69$i,$f)|0);
       }
       (___fwritex($529,$607,$f)|0);
       $617 = ($587|0)==(8192);
       $or$cond$i72$i = $617 & $589;
       if ($or$cond$i72$i) {
        $618 = (($w$1) - ($586))|0;
        $619 = ($618>>>0)>(256);
        $620 = $619 ? 256 : $618;
        _memset(($pad$i|0),32,($620|0))|0;
        $621 = ($618>>>0)>(255);
        if ($621) {
         $$01$i74$i = $618;
         while(1) {
          (___fwritex($pad$i,256,$f)|0);
          $622 = (($$01$i74$i) + -256)|0;
          $623 = ($622>>>0)>(255);
          if ($623) {
           $$01$i74$i = $622;
          } else {
           break;
          }
         }
         $624 = $618 & 255;
         $$0$lcssa$i76$i = $624;
        } else {
         $$0$lcssa$i76$i = $618;
        }
        (___fwritex($pad$i,$$0$lcssa$i76$i,$f)|0);
       }
       $w$$i = $589 ? $w$1 : $586;
       $$0$i = $w$$i;
       break;
      }
      $625 = ($p$0|0)<(0);
      $$p$i = $625 ? 6 : $p$0;
      if ($468) {
       $626 = $467 * 268435456.0;
       $627 = HEAP32[$e2$i>>2]|0;
       $628 = (($627) + -28)|0;
       HEAP32[$e2$i>>2] = $628;
       $$3$i = $626;$629 = $628;
      } else {
       $$pre$i = HEAP32[$e2$i>>2]|0;
       $$3$i = $467;$629 = $$pre$i;
      }
      $630 = ($629|0)<(0);
      $$31$i = $630 ? $big$i : $13;
      $631 = $$31$i;
      $$4$i = $$3$i;$z$0$i = $$31$i;
      while(1) {
       $632 = (~~(($$4$i))>>>0);
       HEAP32[$z$0$i>>2] = $632;
       $633 = ((($z$0$i)) + 4|0);
       $634 = (+($632>>>0));
       $635 = $$4$i - $634;
       $636 = $635 * 1.0E+9;
       $637 = $636 != 0.0;
       if ($637) {
        $$4$i = $636;$z$0$i = $633;
       } else {
        $$lcssa451 = $633;
        break;
       }
      }
      $$pr$i = HEAP32[$e2$i>>2]|0;
      $638 = ($$pr$i|0)>(0);
      if ($638) {
       $639 = $$pr$i;$a$1253$i = $$31$i;$z$1252$i = $$lcssa451;
       while(1) {
        $640 = ($639|0)>(29);
        $641 = $640 ? 29 : $639;
        $d$0245$i = ((($z$1252$i)) + -4|0);
        $642 = ($d$0245$i>>>0)<($a$1253$i>>>0);
        do {
         if ($642) {
          $a$2$ph$i = $a$1253$i;
         } else {
          $carry$0246$i = 0;$d$0247$i = $d$0245$i;
          while(1) {
           $643 = HEAP32[$d$0247$i>>2]|0;
           $644 = (_bitshift64Shl(($643|0),0,($641|0))|0);
           $645 = tempRet0;
           $646 = (_i64Add(($644|0),($645|0),($carry$0246$i|0),0)|0);
           $647 = tempRet0;
           $648 = (___uremdi3(($646|0),($647|0),1000000000,0)|0);
           $649 = tempRet0;
           HEAP32[$d$0247$i>>2] = $648;
           $650 = (___udivdi3(($646|0),($647|0),1000000000,0)|0);
           $651 = tempRet0;
           $d$0$i = ((($d$0247$i)) + -4|0);
           $652 = ($d$0$i>>>0)<($a$1253$i>>>0);
           if ($652) {
            $$lcssa452 = $650;
            break;
           } else {
            $carry$0246$i = $650;$d$0247$i = $d$0$i;
           }
          }
          $653 = ($$lcssa452|0)==(0);
          if ($653) {
           $a$2$ph$i = $a$1253$i;
           break;
          }
          $654 = ((($a$1253$i)) + -4|0);
          HEAP32[$654>>2] = $$lcssa452;
          $a$2$ph$i = $654;
         }
        } while(0);
        $z$2$i = $z$1252$i;
        while(1) {
         $655 = ($z$2$i>>>0)>($a$2$ph$i>>>0);
         if (!($655)) {
          $z$2$i$lcssa = $z$2$i;
          break;
         }
         $656 = ((($z$2$i)) + -4|0);
         $657 = HEAP32[$656>>2]|0;
         $658 = ($657|0)==(0);
         if ($658) {
          $z$2$i = $656;
         } else {
          $z$2$i$lcssa = $z$2$i;
          break;
         }
        }
        $659 = HEAP32[$e2$i>>2]|0;
        $660 = (($659) - ($641))|0;
        HEAP32[$e2$i>>2] = $660;
        $661 = ($660|0)>(0);
        if ($661) {
         $639 = $660;$a$1253$i = $a$2$ph$i;$z$1252$i = $z$2$i$lcssa;
        } else {
         $$pr146$i = $660;$a$1$lcssa$i = $a$2$ph$i;$z$1$lcssa$i = $z$2$i$lcssa;
         break;
        }
       }
      } else {
       $$pr146$i = $$pr$i;$a$1$lcssa$i = $$31$i;$z$1$lcssa$i = $$lcssa451;
      }
      $662 = ($$pr146$i|0)<(0);
      L237: do {
       if ($662) {
        $663 = (($$p$i) + 25)|0;
        $664 = (($663|0) / 9)&-1;
        $665 = (($664) + 1)|0;
        $666 = ($471|0)==(102);
        if (!($666)) {
         $699 = $$pr146$i;$a$3240$i = $a$1$lcssa$i;$z$3239$i = $z$1$lcssa$i;
         while(1) {
          $698 = (0 - ($699))|0;
          $700 = ($698|0)>(9);
          $701 = $700 ? 9 : $698;
          $702 = ($a$3240$i>>>0)<($z$3239$i>>>0);
          do {
           if ($702) {
            $706 = 1 << $701;
            $707 = (($706) + -1)|0;
            $708 = 1000000000 >>> $701;
            $carry3$0234$i = 0;$d$1233$i = $a$3240$i;
            while(1) {
             $709 = HEAP32[$d$1233$i>>2]|0;
             $710 = $709 & $707;
             $711 = $709 >>> $701;
             $712 = (($711) + ($carry3$0234$i))|0;
             HEAP32[$d$1233$i>>2] = $712;
             $713 = Math_imul($710, $708)|0;
             $714 = ((($d$1233$i)) + 4|0);
             $715 = ($714>>>0)<($z$3239$i>>>0);
             if ($715) {
              $carry3$0234$i = $713;$d$1233$i = $714;
             } else {
              $$lcssa454 = $713;
              break;
             }
            }
            $716 = HEAP32[$a$3240$i>>2]|0;
            $717 = ($716|0)==(0);
            $718 = ((($a$3240$i)) + 4|0);
            $$a$3$i = $717 ? $718 : $a$3240$i;
            $719 = ($$lcssa454|0)==(0);
            if ($719) {
             $$a$3306$i = $$a$3$i;$z$4$i = $z$3239$i;
             break;
            }
            $720 = ((($z$3239$i)) + 4|0);
            HEAP32[$z$3239$i>>2] = $$lcssa454;
            $$a$3306$i = $$a$3$i;$z$4$i = $720;
           } else {
            $703 = HEAP32[$a$3240$i>>2]|0;
            $704 = ($703|0)==(0);
            $705 = ((($a$3240$i)) + 4|0);
            $$a$3305$i = $704 ? $705 : $a$3240$i;
            $$a$3306$i = $$a$3305$i;$z$4$i = $z$3239$i;
           }
          } while(0);
          $721 = $z$4$i;
          $722 = $$a$3306$i;
          $723 = (($721) - ($722))|0;
          $724 = $723 >> 2;
          $725 = ($724|0)>($665|0);
          $726 = (($$a$3306$i) + ($665<<2)|0);
          $$z$4$i = $725 ? $726 : $z$4$i;
          $727 = HEAP32[$e2$i>>2]|0;
          $728 = (($727) + ($701))|0;
          HEAP32[$e2$i>>2] = $728;
          $729 = ($728|0)<(0);
          if ($729) {
           $699 = $728;$a$3240$i = $$a$3306$i;$z$3239$i = $$z$4$i;
          } else {
           $a$3$lcssa$i = $$a$3306$i;$z$3$lcssa$i = $$z$4$i;
           break L237;
          }
         }
        }
        $667 = (($$31$i) + ($665<<2)|0);
        $669 = $$pr146$i;$a$3240$us$i = $a$1$lcssa$i;$z$3239$us$i = $z$1$lcssa$i;
        while(1) {
         $668 = (0 - ($669))|0;
         $670 = ($668|0)>(9);
         $671 = $670 ? 9 : $668;
         $672 = ($a$3240$us$i>>>0)<($z$3239$us$i>>>0);
         do {
          if ($672) {
           $697 = 1 << $671;
           $690 = (($697) + -1)|0;
           $694 = 1000000000 >>> $671;
           $carry3$0234$us$i = 0;$d$1233$us$i = $a$3240$us$i;
           while(1) {
            $688 = HEAP32[$d$1233$us$i>>2]|0;
            $689 = $688 & $690;
            $691 = $688 >>> $671;
            $692 = (($691) + ($carry3$0234$us$i))|0;
            HEAP32[$d$1233$us$i>>2] = $692;
            $693 = Math_imul($689, $694)|0;
            $695 = ((($d$1233$us$i)) + 4|0);
            $696 = ($695>>>0)<($z$3239$us$i>>>0);
            if ($696) {
             $carry3$0234$us$i = $693;$d$1233$us$i = $695;
            } else {
             $$lcssa455 = $693;
             break;
            }
           }
           $676 = HEAP32[$a$3240$us$i>>2]|0;
           $677 = ($676|0)==(0);
           $678 = ((($a$3240$us$i)) + 4|0);
           $$a$3$us$i = $677 ? $678 : $a$3240$us$i;
           $679 = ($$lcssa455|0)==(0);
           if ($679) {
            $$a$3$us304$i = $$a$3$us$i;$z$4$us$i = $z$3239$us$i;
            break;
           }
           $680 = ((($z$3239$us$i)) + 4|0);
           HEAP32[$z$3239$us$i>>2] = $$lcssa455;
           $$a$3$us304$i = $$a$3$us$i;$z$4$us$i = $680;
          } else {
           $673 = HEAP32[$a$3240$us$i>>2]|0;
           $674 = ($673|0)==(0);
           $675 = ((($a$3240$us$i)) + 4|0);
           $$a$3$us303$i = $674 ? $675 : $a$3240$us$i;
           $$a$3$us304$i = $$a$3$us303$i;$z$4$us$i = $z$3239$us$i;
          }
         } while(0);
         $681 = $z$4$us$i;
         $682 = (($681) - ($631))|0;
         $683 = $682 >> 2;
         $684 = ($683|0)>($665|0);
         $$z$4$us$i = $684 ? $667 : $z$4$us$i;
         $685 = HEAP32[$e2$i>>2]|0;
         $686 = (($685) + ($671))|0;
         HEAP32[$e2$i>>2] = $686;
         $687 = ($686|0)<(0);
         if ($687) {
          $669 = $686;$a$3240$us$i = $$a$3$us304$i;$z$3239$us$i = $$z$4$us$i;
         } else {
          $a$3$lcssa$i = $$a$3$us304$i;$z$3$lcssa$i = $$z$4$us$i;
          break;
         }
        }
       } else {
        $a$3$lcssa$i = $a$1$lcssa$i;$z$3$lcssa$i = $z$1$lcssa$i;
       }
      } while(0);
      $730 = ($a$3$lcssa$i>>>0)<($z$3$lcssa$i>>>0);
      do {
       if ($730) {
        $731 = $a$3$lcssa$i;
        $732 = (($631) - ($731))|0;
        $733 = $732 >> 2;
        $734 = ($733*9)|0;
        $735 = HEAP32[$a$3$lcssa$i>>2]|0;
        $736 = ($735>>>0)<(10);
        if ($736) {
         $e$1$i = $734;
         break;
        } else {
         $e$0229$i = $734;$i$0228$i = 10;
        }
        while(1) {
         $737 = ($i$0228$i*10)|0;
         $738 = (($e$0229$i) + 1)|0;
         $739 = ($735>>>0)<($737>>>0);
         if ($739) {
          $e$1$i = $738;
          break;
         } else {
          $e$0229$i = $738;$i$0228$i = $737;
         }
        }
       } else {
        $e$1$i = 0;
       }
      } while(0);
      $740 = ($471|0)!=(102);
      $741 = $740 ? $e$1$i : 0;
      $742 = (($$p$i) - ($741))|0;
      $743 = ($471|0)==(103);
      $744 = ($$p$i|0)!=(0);
      $745 = $744 & $743;
      $$neg151$i = $745 << 31 >> 31;
      $746 = (($742) + ($$neg151$i))|0;
      $747 = $z$3$lcssa$i;
      $748 = (($747) - ($631))|0;
      $749 = $748 >> 2;
      $750 = ($749*9)|0;
      $751 = (($750) + -9)|0;
      $752 = ($746|0)<($751|0);
      if ($752) {
       $753 = (($746) + 9216)|0;
       $754 = (($753|0) / 9)&-1;
       $$sum$i = (($754) + -1023)|0;
       $755 = (($$31$i) + ($$sum$i<<2)|0);
       $756 = (($753|0) % 9)&-1;
       $j$0221$i = (($756) + 1)|0;
       $757 = ($j$0221$i|0)<(9);
       if ($757) {
        $i$1222$i = 10;$j$0223$i = $j$0221$i;
        while(1) {
         $758 = ($i$1222$i*10)|0;
         $j$0$i = (($j$0223$i) + 1)|0;
         $exitcond$i = ($j$0$i|0)==(9);
         if ($exitcond$i) {
          $i$1$lcssa$i = $758;
          break;
         } else {
          $i$1222$i = $758;$j$0223$i = $j$0$i;
         }
        }
       } else {
        $i$1$lcssa$i = 10;
       }
       $759 = HEAP32[$755>>2]|0;
       $760 = (($759>>>0) % ($i$1$lcssa$i>>>0))&-1;
       $761 = ($760|0)==(0);
       if ($761) {
        $$sum15$i = (($754) + -1022)|0;
        $762 = (($$31$i) + ($$sum15$i<<2)|0);
        $763 = ($762|0)==($z$3$lcssa$i|0);
        if ($763) {
         $a$7$i = $a$3$lcssa$i;$d$3$i = $755;$e$3$i = $e$1$i;
        } else {
         label = 221;
        }
       } else {
        label = 221;
       }
       do {
        if ((label|0) == 221) {
         label = 0;
         $764 = (($759>>>0) / ($i$1$lcssa$i>>>0))&-1;
         $765 = $764 & 1;
         $766 = ($765|0)==(0);
         $$20$i = $766 ? 9007199254740992.0 : 9007199254740994.0;
         $767 = (($i$1$lcssa$i|0) / 2)&-1;
         $768 = ($760>>>0)<($767>>>0);
         do {
          if ($768) {
           $small$0$i = 0.5;
          } else {
           $769 = ($760|0)==($767|0);
           if ($769) {
            $$sum16$i = (($754) + -1022)|0;
            $770 = (($$31$i) + ($$sum16$i<<2)|0);
            $771 = ($770|0)==($z$3$lcssa$i|0);
            if ($771) {
             $small$0$i = 1.0;
             break;
            }
           }
           $small$0$i = 1.5;
          }
         } while(0);
         $772 = ($pl$0$i|0)==(0);
         do {
          if ($772) {
           $round6$1$i = $$20$i;$small$1$i = $small$0$i;
          } else {
           $773 = HEAP8[$prefix$0$i>>0]|0;
           $774 = ($773<<24>>24)==(45);
           if (!($774)) {
            $round6$1$i = $$20$i;$small$1$i = $small$0$i;
            break;
           }
           $775 = -$$20$i;
           $776 = -$small$0$i;
           $round6$1$i = $775;$small$1$i = $776;
          }
         } while(0);
         $777 = (($759) - ($760))|0;
         HEAP32[$755>>2] = $777;
         $778 = $round6$1$i + $small$1$i;
         $779 = $778 != $round6$1$i;
         if (!($779)) {
          $a$7$i = $a$3$lcssa$i;$d$3$i = $755;$e$3$i = $e$1$i;
          break;
         }
         $780 = (($777) + ($i$1$lcssa$i))|0;
         HEAP32[$755>>2] = $780;
         $781 = ($780>>>0)>(999999999);
         if ($781) {
          $a$5215$i = $a$3$lcssa$i;$d$2214$i = $755;
          while(1) {
           $782 = ((($d$2214$i)) + -4|0);
           HEAP32[$d$2214$i>>2] = 0;
           $783 = ($782>>>0)<($a$5215$i>>>0);
           if ($783) {
            $784 = ((($a$5215$i)) + -4|0);
            HEAP32[$784>>2] = 0;
            $a$6$i = $784;
           } else {
            $a$6$i = $a$5215$i;
           }
           $785 = HEAP32[$782>>2]|0;
           $786 = (($785) + 1)|0;
           HEAP32[$782>>2] = $786;
           $787 = ($786>>>0)>(999999999);
           if ($787) {
            $a$5215$i = $a$6$i;$d$2214$i = $782;
           } else {
            $a$5$lcssa$i = $a$6$i;$d$2$lcssa$i = $782;
            break;
           }
          }
         } else {
          $a$5$lcssa$i = $a$3$lcssa$i;$d$2$lcssa$i = $755;
         }
         $788 = $a$5$lcssa$i;
         $789 = (($631) - ($788))|0;
         $790 = $789 >> 2;
         $791 = ($790*9)|0;
         $792 = HEAP32[$a$5$lcssa$i>>2]|0;
         $793 = ($792>>>0)<(10);
         if ($793) {
          $a$7$i = $a$5$lcssa$i;$d$3$i = $d$2$lcssa$i;$e$3$i = $791;
          break;
         } else {
          $e$2210$i = $791;$i$2209$i = 10;
         }
         while(1) {
          $794 = ($i$2209$i*10)|0;
          $795 = (($e$2210$i) + 1)|0;
          $796 = ($792>>>0)<($794>>>0);
          if ($796) {
           $a$7$i = $a$5$lcssa$i;$d$3$i = $d$2$lcssa$i;$e$3$i = $795;
           break;
          } else {
           $e$2210$i = $795;$i$2209$i = $794;
          }
         }
        }
       } while(0);
       $797 = ((($d$3$i)) + 4|0);
       $798 = ($z$3$lcssa$i>>>0)>($797>>>0);
       $$z$3$i = $798 ? $797 : $z$3$lcssa$i;
       $a$8$ph$i = $a$7$i;$e$4$ph$i = $e$3$i;$z$6$ph$i = $$z$3$i;
      } else {
       $a$8$ph$i = $a$3$lcssa$i;$e$4$ph$i = $e$1$i;$z$6$ph$i = $z$3$lcssa$i;
      }
      $799 = (0 - ($e$4$ph$i))|0;
      $z$6$i = $z$6$ph$i;
      while(1) {
       $800 = ($z$6$i>>>0)>($a$8$ph$i>>>0);
       if (!($800)) {
        $$lcssa275$i = 0;$z$6$i$lcssa = $z$6$i;
        break;
       }
       $801 = ((($z$6$i)) + -4|0);
       $802 = HEAP32[$801>>2]|0;
       $803 = ($802|0)==(0);
       if ($803) {
        $z$6$i = $801;
       } else {
        $$lcssa275$i = 1;$z$6$i$lcssa = $z$6$i;
        break;
       }
      }
      do {
       if ($743) {
        $804 = $744&1;
        $805 = $804 ^ 1;
        $$p$$i = (($805) + ($$p$i))|0;
        $806 = ($$p$$i|0)>($e$4$ph$i|0);
        $807 = ($e$4$ph$i|0)>(-5);
        $or$cond6$i = $806 & $807;
        if ($or$cond6$i) {
         $808 = (($t$0) + -1)|0;
         $$neg152$i = (($$p$$i) + -1)|0;
         $809 = (($$neg152$i) - ($e$4$ph$i))|0;
         $$013$i = $808;$$210$i = $809;
        } else {
         $810 = (($t$0) + -2)|0;
         $811 = (($$p$$i) + -1)|0;
         $$013$i = $810;$$210$i = $811;
        }
        $812 = $fl$1$ & 8;
        $813 = ($812|0)==(0);
        if (!($813)) {
         $$114$i = $$013$i;$$311$i = $$210$i;$$pre$phi302$iZ2D = $812;
         break;
        }
        do {
         if ($$lcssa275$i) {
          $814 = ((($z$6$i$lcssa)) + -4|0);
          $815 = HEAP32[$814>>2]|0;
          $816 = ($815|0)==(0);
          if ($816) {
           $j$2$i = 9;
           break;
          }
          $817 = (($815>>>0) % 10)&-1;
          $818 = ($817|0)==(0);
          if ($818) {
           $i$3205$i = 10;$j$1206$i = 0;
          } else {
           $j$2$i = 0;
           break;
          }
          while(1) {
           $819 = ($i$3205$i*10)|0;
           $820 = (($j$1206$i) + 1)|0;
           $821 = (($815>>>0) % ($819>>>0))&-1;
           $822 = ($821|0)==(0);
           if ($822) {
            $i$3205$i = $819;$j$1206$i = $820;
           } else {
            $j$2$i = $820;
            break;
           }
          }
         } else {
          $j$2$i = 9;
         }
        } while(0);
        $823 = $$013$i | 32;
        $824 = ($823|0)==(102);
        $825 = $z$6$i$lcssa;
        $826 = (($825) - ($631))|0;
        $827 = $826 >> 2;
        $828 = ($827*9)|0;
        $829 = (($828) + -9)|0;
        if ($824) {
         $830 = (($829) - ($j$2$i))|0;
         $831 = ($830|0)<(0);
         $$21$i = $831 ? 0 : $830;
         $832 = ($$210$i|0)<($$21$i|0);
         $$210$$22$i = $832 ? $$210$i : $$21$i;
         $$114$i = $$013$i;$$311$i = $$210$$22$i;$$pre$phi302$iZ2D = 0;
         break;
        } else {
         $833 = (($829) + ($e$4$ph$i))|0;
         $834 = (($833) - ($j$2$i))|0;
         $835 = ($834|0)<(0);
         $$23$i = $835 ? 0 : $834;
         $836 = ($$210$i|0)<($$23$i|0);
         $$210$$24$i = $836 ? $$210$i : $$23$i;
         $$114$i = $$013$i;$$311$i = $$210$$24$i;$$pre$phi302$iZ2D = 0;
         break;
        }
       } else {
        $$pre301$i = $fl$1$ & 8;
        $$114$i = $t$0;$$311$i = $$p$i;$$pre$phi302$iZ2D = $$pre301$i;
       }
      } while(0);
      $837 = $$311$i | $$pre$phi302$iZ2D;
      $838 = ($837|0)!=(0);
      $839 = $838&1;
      $840 = $$114$i | 32;
      $841 = ($840|0)==(102);
      if ($841) {
       $842 = ($e$4$ph$i|0)>(0);
       $843 = $842 ? $e$4$ph$i : 0;
       $$pn$i = $843;$estr$2$i = 0;
      } else {
       $844 = ($e$4$ph$i|0)<(0);
       $845 = $844 ? $799 : $e$4$ph$i;
       $846 = ($845|0)<(0);
       if ($846) {
        $847 = ($845|0)<(0);
        $848 = $847 << 31 >> 31;
        $$05$i79$i = $7;$849 = $845;$850 = $848;
        while(1) {
         $851 = (___uremdi3(($849|0),($850|0),10,0)|0);
         $852 = tempRet0;
         $853 = $851 | 48;
         $854 = $853&255;
         $855 = ((($$05$i79$i)) + -1|0);
         HEAP8[$855>>0] = $854;
         $856 = (___udivdi3(($849|0),($850|0),10,0)|0);
         $857 = tempRet0;
         $858 = ($850>>>0)>(9);
         $859 = ($849>>>0)>(4294967295);
         $860 = ($850|0)==(9);
         $861 = $860 & $859;
         $862 = $858 | $861;
         if ($862) {
          $$05$i79$i = $855;$849 = $856;$850 = $857;
         } else {
          $$lcssa461 = $855;$1179 = $856;$1180 = $857;
          break;
         }
        }
        $$0$lcssa$i84$i = $$lcssa461;$$01$lcssa$off0$i85$i = $1179;
       } else {
        $$0$lcssa$i84$i = $7;$$01$lcssa$off0$i85$i = $845;
       }
       $863 = ($$01$lcssa$off0$i85$i|0)==(0);
       if ($863) {
        $estr$1$ph$i = $$0$lcssa$i84$i;
       } else {
        $$12$i87$i = $$0$lcssa$i84$i;$y$03$i86$i = $$01$lcssa$off0$i85$i;
        while(1) {
         $864 = (($y$03$i86$i>>>0) % 10)&-1;
         $865 = $864 | 48;
         $866 = $865&255;
         $867 = ((($$12$i87$i)) + -1|0);
         HEAP8[$867>>0] = $866;
         $868 = (($y$03$i86$i>>>0) / 10)&-1;
         $869 = ($y$03$i86$i>>>0)<(10);
         if ($869) {
          $estr$1$ph$i = $867;
          break;
         } else {
          $$12$i87$i = $867;$y$03$i86$i = $868;
         }
        }
       }
       $870 = $estr$1$ph$i;
       $871 = (($9) - ($870))|0;
       $872 = ($871|0)<(2);
       if ($872) {
        $estr$1201$i = $estr$1$ph$i;
        while(1) {
         $873 = ((($estr$1201$i)) + -1|0);
         HEAP8[$873>>0] = 48;
         $874 = $873;
         $875 = (($9) - ($874))|0;
         $876 = ($875|0)<(2);
         if ($876) {
          $estr$1201$i = $873;
         } else {
          $estr$1$lcssa$i = $873;
          break;
         }
        }
       } else {
        $estr$1$lcssa$i = $estr$1$ph$i;
       }
       $877 = $e$4$ph$i >> 31;
       $878 = $877 & 2;
       $879 = (($878) + 43)|0;
       $880 = $879&255;
       $881 = ((($estr$1$lcssa$i)) + -1|0);
       HEAP8[$881>>0] = $880;
       $882 = $$114$i&255;
       $883 = ((($estr$1$lcssa$i)) + -2|0);
       HEAP8[$883>>0] = $882;
       $884 = $883;
       $885 = (($9) - ($884))|0;
       $$pn$i = $885;$estr$2$i = $883;
      }
      $886 = (($pl$0$i) + 1)|0;
      $887 = (($886) + ($$311$i))|0;
      $l$1$i = (($887) + ($839))|0;
      $888 = (($l$1$i) + ($$pn$i))|0;
      $889 = $fl$1$ & 73728;
      $890 = ($889|0)==(0);
      $891 = ($w$1|0)>($888|0);
      $or$cond$i93$i = $890 & $891;
      if ($or$cond$i93$i) {
       $892 = (($w$1) - ($888))|0;
       $893 = ($892>>>0)>(256);
       $894 = $893 ? 256 : $892;
       _memset(($pad$i|0),32,($894|0))|0;
       $895 = ($892>>>0)>(255);
       if ($895) {
        $$01$i95$i = $892;
        while(1) {
         (___fwritex($pad$i,256,$f)|0);
         $896 = (($$01$i95$i) + -256)|0;
         $897 = ($896>>>0)>(255);
         if ($897) {
          $$01$i95$i = $896;
         } else {
          break;
         }
        }
        $898 = $892 & 255;
        $$0$lcssa$i97$i = $898;
       } else {
        $$0$lcssa$i97$i = $892;
       }
       (___fwritex($pad$i,$$0$lcssa$i97$i,$f)|0);
      }
      (___fwritex($prefix$0$i,$pl$0$i,$f)|0);
      $899 = ($889|0)==(65536);
      $or$cond$i100$i = $899 & $891;
      if ($or$cond$i100$i) {
       $900 = (($w$1) - ($888))|0;
       $901 = ($900>>>0)>(256);
       $902 = $901 ? 256 : $900;
       _memset(($pad$i|0),48,($902|0))|0;
       $903 = ($900>>>0)>(255);
       if ($903) {
        $$01$i102$i = $900;
        while(1) {
         (___fwritex($pad$i,256,$f)|0);
         $904 = (($$01$i102$i) + -256)|0;
         $905 = ($904>>>0)>(255);
         if ($905) {
          $$01$i102$i = $904;
         } else {
          break;
         }
        }
        $906 = $900 & 255;
        $$0$lcssa$i104$i = $906;
       } else {
        $$0$lcssa$i104$i = $900;
       }
       (___fwritex($pad$i,$$0$lcssa$i104$i,$f)|0);
      }
      if ($841) {
       $907 = ($a$8$ph$i>>>0)>($$31$i>>>0);
       $r$0$a$8$i = $907 ? $$31$i : $a$8$ph$i;
       $d$4191$i = $r$0$a$8$i;
       while(1) {
        $908 = HEAP32[$d$4191$i>>2]|0;
        $909 = ($908|0)==(0);
        if ($909) {
         $$1$lcssa$i112$i = $14;
        } else {
         $$12$i110$i = $14;$y$03$i109$i = $908;
         while(1) {
          $910 = (($y$03$i109$i>>>0) % 10)&-1;
          $911 = $910 | 48;
          $912 = $911&255;
          $913 = ((($$12$i110$i)) + -1|0);
          HEAP8[$913>>0] = $912;
          $914 = (($y$03$i109$i>>>0) / 10)&-1;
          $915 = ($y$03$i109$i>>>0)<(10);
          if ($915) {
           $$1$lcssa$i112$i = $913;
           break;
          } else {
           $$12$i110$i = $913;$y$03$i109$i = $914;
          }
         }
        }
        $916 = ($d$4191$i|0)==($r$0$a$8$i|0);
        do {
         if ($916) {
          $920 = ($$1$lcssa$i112$i|0)==($14|0);
          if (!($920)) {
           $s7$1$i = $$1$lcssa$i112$i;
           break;
          }
          HEAP8[$16>>0] = 48;
          $s7$1$i = $16;
         } else {
          $917 = ($$1$lcssa$i112$i>>>0)>($buf$i>>>0);
          if ($917) {
           $s7$0188$i = $$1$lcssa$i112$i;
          } else {
           $s7$1$i = $$1$lcssa$i112$i;
           break;
          }
          while(1) {
           $918 = ((($s7$0188$i)) + -1|0);
           HEAP8[$918>>0] = 48;
           $919 = ($918>>>0)>($buf$i>>>0);
           if ($919) {
            $s7$0188$i = $918;
           } else {
            $s7$1$i = $918;
            break;
           }
          }
         }
        } while(0);
        $921 = $s7$1$i;
        $922 = (($15) - ($921))|0;
        (___fwritex($s7$1$i,$922,$f)|0);
        $923 = ((($d$4191$i)) + 4|0);
        $924 = ($923>>>0)>($$31$i>>>0);
        if ($924) {
         $$lcssa470 = $923;
         break;
        } else {
         $d$4191$i = $923;
        }
       }
       $925 = ($837|0)==(0);
       if (!($925)) {
        (___fwritex(16240,1,$f)|0);
       }
       $926 = ($$lcssa470>>>0)<($z$6$i$lcssa>>>0);
       $927 = ($$311$i|0)>(0);
       $928 = $927 & $926;
       if ($928) {
        $$412184$i = $$311$i;$d$5183$i = $$lcssa470;
        while(1) {
         $929 = HEAP32[$d$5183$i>>2]|0;
         $930 = ($929|0)==(0);
         if ($930) {
          $s8$0180$i = $14;
          label = 289;
         } else {
          $$12$i119$i = $14;$y$03$i118$i = $929;
          while(1) {
           $931 = (($y$03$i118$i>>>0) % 10)&-1;
           $932 = $931 | 48;
           $933 = $932&255;
           $934 = ((($$12$i119$i)) + -1|0);
           HEAP8[$934>>0] = $933;
           $935 = (($y$03$i118$i>>>0) / 10)&-1;
           $936 = ($y$03$i118$i>>>0)<(10);
           if ($936) {
            $$lcssa471 = $934;
            break;
           } else {
            $$12$i119$i = $934;$y$03$i118$i = $935;
           }
          }
          $937 = ($$lcssa471>>>0)>($buf$i>>>0);
          if ($937) {
           $s8$0180$i = $$lcssa471;
           label = 289;
          } else {
           $s8$0$lcssa$i = $$lcssa471;
          }
         }
         if ((label|0) == 289) {
          while(1) {
           label = 0;
           $938 = ((($s8$0180$i)) + -1|0);
           HEAP8[$938>>0] = 48;
           $939 = ($938>>>0)>($buf$i>>>0);
           if ($939) {
            $s8$0180$i = $938;
            label = 289;
           } else {
            $s8$0$lcssa$i = $938;
            break;
           }
          }
         }
         $940 = ($$412184$i|0)>(9);
         $941 = $940 ? 9 : $$412184$i;
         (___fwritex($s8$0$lcssa$i,$941,$f)|0);
         $942 = ((($d$5183$i)) + 4|0);
         $943 = (($$412184$i) + -9)|0;
         $944 = ($942>>>0)<($z$6$i$lcssa>>>0);
         $945 = $940 & $944;
         if ($945) {
          $$412184$i = $943;$d$5183$i = $942;
         } else {
          $$412$lcssa$i = $943;
          break;
         }
        }
       } else {
        $$412$lcssa$i = $$311$i;
       }
       $946 = ($$412$lcssa$i|0)>(0);
       if ($946) {
        $947 = ($$412$lcssa$i>>>0)>(256);
        $948 = $947 ? 256 : $$412$lcssa$i;
        _memset(($pad$i|0),48,($948|0))|0;
        $949 = ($$412$lcssa$i>>>0)>(255);
        if ($949) {
         $$01$i126$i = $$412$lcssa$i;
         while(1) {
          (___fwritex($pad$i,256,$f)|0);
          $950 = (($$01$i126$i) + -256)|0;
          $951 = ($950>>>0)>(255);
          if ($951) {
           $$01$i126$i = $950;
          } else {
           break;
          }
         }
         $952 = $$412$lcssa$i & 255;
         $$0$lcssa$i128$i = $952;
        } else {
         $$0$lcssa$i128$i = $$412$lcssa$i;
        }
        (___fwritex($pad$i,$$0$lcssa$i128$i,$f)|0);
       }
      } else {
       $953 = ((($a$8$ph$i)) + 4|0);
       $z$6$$i = $$lcssa275$i ? $z$6$i$lcssa : $953;
       $954 = ($$311$i|0)>(-1);
       do {
        if ($954) {
         $955 = ($$pre$phi302$iZ2D|0)==(0);
         $$5196$i = $$311$i;$d$6195$i = $a$8$ph$i;
         while(1) {
          $956 = HEAP32[$d$6195$i>>2]|0;
          $957 = ($956|0)==(0);
          if ($957) {
           label = 303;
          } else {
           $$12$i134$i = $14;$y$03$i133$i = $956;
           while(1) {
            $958 = (($y$03$i133$i>>>0) % 10)&-1;
            $959 = $958 | 48;
            $960 = $959&255;
            $961 = ((($$12$i134$i)) + -1|0);
            HEAP8[$961>>0] = $960;
            $962 = (($y$03$i133$i>>>0) / 10)&-1;
            $963 = ($y$03$i133$i>>>0)<(10);
            if ($963) {
             $$12$i134$i$lcssa = $$12$i134$i;$$lcssa465 = $961;
             break;
            } else {
             $$12$i134$i = $961;$y$03$i133$i = $962;
            }
           }
           $964 = ($$lcssa465|0)==($14|0);
           if ($964) {
            label = 303;
           } else {
            $1181 = $$12$i134$i$lcssa;$s9$0$i = $$lcssa465;
           }
          }
          if ((label|0) == 303) {
           label = 0;
           HEAP8[$16>>0] = 48;
           $1181 = $14;$s9$0$i = $16;
          }
          $965 = ($d$6195$i|0)==($a$8$ph$i|0);
          do {
           if ($965) {
            (___fwritex($s9$0$i,1,$f)|0);
            $969 = ($$5196$i|0)<(1);
            $or$cond29$i = $955 & $969;
            if ($or$cond29$i) {
             $s9$2$i = $1181;
             break;
            }
            (___fwritex(16240,1,$f)|0);
            $s9$2$i = $1181;
           } else {
            $966 = ($s9$0$i>>>0)>($buf$i>>>0);
            if ($966) {
             $s9$1192$i = $s9$0$i;
            } else {
             $s9$2$i = $s9$0$i;
             break;
            }
            while(1) {
             $967 = ((($s9$1192$i)) + -1|0);
             HEAP8[$967>>0] = 48;
             $968 = ($967>>>0)>($buf$i>>>0);
             if ($968) {
              $s9$1192$i = $967;
             } else {
              $s9$2$i = $967;
              break;
             }
            }
           }
          } while(0);
          $970 = $s9$2$i;
          $971 = (($15) - ($970))|0;
          $972 = ($$5196$i|0)>($971|0);
          $973 = $972 ? $971 : $$5196$i;
          (___fwritex($s9$2$i,$973,$f)|0);
          $974 = (($$5196$i) - ($971))|0;
          $975 = ((($d$6195$i)) + 4|0);
          $976 = ($975>>>0)<($z$6$$i>>>0);
          $977 = ($974|0)>(-1);
          $978 = $976 & $977;
          if ($978) {
           $$5196$i = $974;$d$6195$i = $975;
          } else {
           $$lcssa467 = $974;
           break;
          }
         }
         $979 = ($$lcssa467|0)>(0);
         if (!($979)) {
          break;
         }
         $980 = ($$lcssa467>>>0)>(256);
         $981 = $980 ? 256 : $$lcssa467;
         _memset(($pad$i|0),48,($981|0))|0;
         $982 = ($$lcssa467>>>0)>(255);
         if ($982) {
          $$01$i141$i = $$lcssa467;
          while(1) {
           (___fwritex($pad$i,256,$f)|0);
           $983 = (($$01$i141$i) + -256)|0;
           $984 = ($983>>>0)>(255);
           if ($984) {
            $$01$i141$i = $983;
           } else {
            break;
           }
          }
          $985 = $$lcssa467 & 255;
          $$0$lcssa$i143$i = $985;
         } else {
          $$0$lcssa$i143$i = $$lcssa467;
         }
         (___fwritex($pad$i,$$0$lcssa$i143$i,$f)|0);
        } else {
        }
       } while(0);
       $986 = $estr$2$i;
       $987 = (($9) - ($986))|0;
       (___fwritex($estr$2$i,$987,$f)|0);
      }
      $988 = ($889|0)==(8192);
      $or$cond$i$i = $988 & $891;
      if ($or$cond$i$i) {
       $989 = (($w$1) - ($888))|0;
       $990 = ($989>>>0)>(256);
       $991 = $990 ? 256 : $989;
       _memset(($pad$i|0),32,($991|0))|0;
       $992 = ($989>>>0)>(255);
       if ($992) {
        $$01$i$i = $989;
        while(1) {
         (___fwritex($pad$i,256,$f)|0);
         $993 = (($$01$i$i) + -256)|0;
         $994 = ($993>>>0)>(255);
         if ($994) {
          $$01$i$i = $993;
         } else {
          break;
         }
        }
        $995 = $989 & 255;
        $$0$lcssa$i$i = $995;
       } else {
        $$0$lcssa$i$i = $989;
       }
       (___fwritex($pad$i,$$0$lcssa$i$i,$f)|0);
      }
      $w$30$i = $891 ? $w$1 : $888;
      $$0$i = $w$30$i;
     } else {
      $440 = $t$0 & 32;
      $441 = ($440|0)!=(0);
      $442 = $441 ? 16208 : 16216;
      $443 = ($$07$i != $$07$i) | (0.0 != 0.0);
      $444 = $441 ? 16224 : 16232;
      $pl$1$i = $443 ? 0 : $pl$0$i;
      $s1$0$i = $443 ? $444 : $442;
      $445 = (($pl$1$i) + 3)|0;
      $446 = $fl$1$ & 8192;
      $447 = ($446|0)==(0);
      $448 = ($w$1|0)>($445|0);
      $or$cond$i35$i = $447 & $448;
      if ($or$cond$i35$i) {
       $449 = (($w$1) - ($445))|0;
       $450 = ($449>>>0)>(256);
       $451 = $450 ? 256 : $449;
       _memset(($pad$i|0),32,($451|0))|0;
       $452 = ($449>>>0)>(255);
       if ($452) {
        $$01$i37$i = $449;
        while(1) {
         (___fwritex($pad$i,256,$f)|0);
         $453 = (($$01$i37$i) + -256)|0;
         $454 = ($453>>>0)>(255);
         if ($454) {
          $$01$i37$i = $453;
         } else {
          break;
         }
        }
        $455 = $449 & 255;
        $$0$lcssa$i39$i = $455;
       } else {
        $$0$lcssa$i39$i = $449;
       }
       (___fwritex($pad$i,$$0$lcssa$i39$i,$f)|0);
      }
      (___fwritex($prefix$0$i,$pl$1$i,$f)|0);
      (___fwritex($s1$0$i,3,$f)|0);
      $456 = $fl$1$ & 73728;
      $457 = ($456|0)==(8192);
      $or$cond$i42$i = $457 & $448;
      if ($or$cond$i42$i) {
       $458 = (($w$1) - ($445))|0;
       $459 = ($458>>>0)>(256);
       $460 = $459 ? 256 : $458;
       _memset(($pad$i|0),32,($460|0))|0;
       $461 = ($458>>>0)>(255);
       if ($461) {
        $$01$i44$i = $458;
        while(1) {
         (___fwritex($pad$i,256,$f)|0);
         $462 = (($$01$i44$i) + -256)|0;
         $463 = ($462>>>0)>(255);
         if ($463) {
          $$01$i44$i = $462;
         } else {
          break;
         }
        }
        $464 = $458 & 255;
        $$0$lcssa$i46$i = $464;
       } else {
        $$0$lcssa$i46$i = $458;
       }
       (___fwritex($pad$i,$$0$lcssa$i46$i,$f)|0);
      }
      $465 = $448 ? $w$1 : $445;
      $$0$i = $465;
     }
    } while(0);
    $1164 = $286;$1165 = $259;$cnt$0 = $cnt$1;$fmt89 = $$lcssa448;$l$0 = $$0$i;$l10n$0 = $l10n$3;
    continue L1;
    break;
   }
   default: {
    $1169 = $286;$1170 = $259;$a$2 = $fmt89;$fl$6 = $fl$1$;$p$5 = $p$0;$pl$2 = 0;$prefix$2 = 16160;$z$2 = $2;
   }
   }
  } while(0);
  if ((label|0) == 73) {
   label = 0;
   $284 = $t$1 & 32;
   $285 = ($259|0)==(0);
   $287 = ($286|0)==(0);
   $288 = $285 & $287;
   if ($288) {
    $361 = $259;$363 = $286;$a$0 = $2;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 16160;
    label = 89;
   } else {
    $$012$i = $2;$290 = $259;$297 = $286;
    while(1) {
     $289 = $290 & 15;
     $291 = (16144 + ($289)|0);
     $292 = HEAP8[$291>>0]|0;
     $293 = $292&255;
     $294 = $293 | $284;
     $295 = $294&255;
     $296 = ((($$012$i)) + -1|0);
     HEAP8[$296>>0] = $295;
     $298 = (_bitshift64Lshr(($290|0),($297|0),4)|0);
     $299 = tempRet0;
     $300 = ($298|0)==(0);
     $301 = ($299|0)==(0);
     $302 = $300 & $301;
     if ($302) {
      $$lcssa482 = $296;
      break;
     } else {
      $$012$i = $296;$290 = $298;$297 = $299;
     }
    }
    $303 = $fl$3 & 8;
    $304 = ($303|0)==(0);
    if ($304) {
     $361 = $259;$363 = $286;$a$0 = $$lcssa482;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 16160;
     label = 89;
    } else {
     $305 = $t$1 >> 4;
     $306 = (16160 + ($305)|0);
     $361 = $259;$363 = $286;$a$0 = $$lcssa482;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 2;$prefix$1 = $306;
     label = 89;
    }
   }
  }
  else if ((label|0) == 84) {
   label = 0;
   $332 = ($331>>>0)>(0);
   $334 = ($333>>>0)>(4294967295);
   $335 = ($331|0)==(0);
   $336 = $335 & $334;
   $337 = $332 | $336;
   if ($337) {
    $$05$i = $2;$338 = $333;$339 = $331;
    while(1) {
     $340 = (___uremdi3(($338|0),($339|0),10,0)|0);
     $341 = tempRet0;
     $342 = $340 | 48;
     $343 = $342&255;
     $344 = ((($$05$i)) + -1|0);
     HEAP8[$344>>0] = $343;
     $345 = (___udivdi3(($338|0),($339|0),10,0)|0);
     $346 = tempRet0;
     $347 = ($339>>>0)>(9);
     $348 = ($338>>>0)>(4294967295);
     $349 = ($339|0)==(9);
     $350 = $349 & $348;
     $351 = $347 | $350;
     if ($351) {
      $$05$i = $344;$338 = $345;$339 = $346;
     } else {
      $$lcssa478 = $344;$1171 = $345;$1172 = $346;
      break;
     }
    }
    $$0$lcssa$i53 = $$lcssa478;$$01$lcssa$off0$i = $1171;
   } else {
    $$0$lcssa$i53 = $2;$$01$lcssa$off0$i = $333;
   }
   $352 = ($$01$lcssa$off0$i|0)==(0);
   if ($352) {
    $361 = $333;$363 = $331;$a$0 = $$0$lcssa$i53;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $pl$0;$prefix$1 = $prefix$0;
    label = 89;
   } else {
    $$12$i = $$0$lcssa$i53;$y$03$i = $$01$lcssa$off0$i;
    while(1) {
     $353 = (($y$03$i>>>0) % 10)&-1;
     $354 = $353 | 48;
     $355 = $354&255;
     $356 = ((($$12$i)) + -1|0);
     HEAP8[$356>>0] = $355;
     $357 = (($y$03$i>>>0) / 10)&-1;
     $358 = ($y$03$i>>>0)<(10);
     if ($358) {
      $361 = $333;$363 = $331;$a$0 = $356;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $pl$0;$prefix$1 = $prefix$0;
      label = 89;
      break;
     } else {
      $$12$i = $356;$y$03$i = $357;
     }
    }
   }
  }
  else if ((label|0) == 94) {
   label = 0;
   $380 = (_memchr($a$1,0,$p$0)|0);
   $381 = ($380|0)==(0|0);
   $382 = $380;
   $383 = $a$1;
   $384 = (($382) - ($383))|0;
   $385 = (($a$1) + ($p$0)|0);
   $z$1 = $381 ? $385 : $380;
   $p$3 = $381 ? $p$0 : $384;
   $1169 = $286;$1170 = $259;$a$2 = $a$1;$fl$6 = $258;$p$5 = $p$3;$pl$2 = 0;$prefix$2 = 16160;$z$2 = $z$1;
  }
  else if ((label|0) == 97) {
   label = 0;
   $i$0180 = 0;$l$1179 = 0;$ws$0181 = $1173;
   while(1) {
    $388 = HEAP32[$ws$0181>>2]|0;
    $389 = ($388|0)==(0);
    if ($389) {
     $i$0$lcssa = $i$0180;$l$2 = $l$1179;
     break;
    }
    $390 = (_wctomb($mb,$388)|0);
    $391 = ($390|0)<(0);
    $392 = (($p$4274) - ($i$0180))|0;
    $393 = ($390>>>0)>($392>>>0);
    $or$cond22 = $391 | $393;
    if ($or$cond22) {
     $i$0$lcssa = $i$0180;$l$2 = $390;
     break;
    }
    $394 = ((($ws$0181)) + 4|0);
    $395 = (($390) + ($i$0180))|0;
    $396 = ($p$4274>>>0)>($395>>>0);
    if ($396) {
     $i$0180 = $395;$l$1179 = $390;$ws$0181 = $394;
    } else {
     $i$0$lcssa = $395;$l$2 = $390;
     break;
    }
   }
   $397 = ($l$2|0)<(0);
   if ($397) {
    $$0 = -1;
    label = 363;
    break;
   } else {
    $1175 = $1174;$1176 = $1173;$i$0$lcssa275 = $i$0$lcssa;
    label = 102;
   }
  }
  if ((label|0) == 89) {
   label = 0;
   $359 = ($p$2|0)>(-1);
   $360 = $fl$4 & -65537;
   $$fl$4 = $359 ? $360 : $fl$4;
   $362 = ($361|0)!=(0);
   $364 = ($363|0)!=(0);
   $365 = $362 | $364;
   $366 = ($p$2|0)!=(0);
   $or$cond = $365 | $366;
   if ($or$cond) {
    $367 = $a$0;
    $368 = (($3) - ($367))|0;
    $369 = $365&1;
    $370 = $369 ^ 1;
    $371 = (($370) + ($368))|0;
    $372 = ($p$2|0)>($371|0);
    $p$2$ = $372 ? $p$2 : $371;
    $1169 = $363;$1170 = $361;$a$2 = $a$0;$fl$6 = $$fl$4;$p$5 = $p$2$;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $2;
   } else {
    $1169 = $363;$1170 = $361;$a$2 = $2;$fl$6 = $$fl$4;$p$5 = 0;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $2;
   }
  }
  else if ((label|0) == 102) {
   label = 0;
   $398 = $fl$1$ & 73728;
   $399 = ($398|0)==(0);
   $400 = ($w$1|0)>($i$0$lcssa275|0);
   $or$cond$i64 = $399 & $400;
   if ($or$cond$i64) {
    $401 = (($w$1) - ($i$0$lcssa275))|0;
    $402 = ($401>>>0)>(256);
    $403 = $402 ? 256 : $401;
    _memset(($pad$i|0),32,($403|0))|0;
    $404 = ($401>>>0)>(255);
    if ($404) {
     $$01$i66 = $401;
     while(1) {
      (___fwritex($pad$i,256,$f)|0);
      $405 = (($$01$i66) + -256)|0;
      $406 = ($405>>>0)>(255);
      if ($406) {
       $$01$i66 = $405;
      } else {
       break;
      }
     }
     $407 = $401 & 255;
     $$0$lcssa$i68 = $407;
    } else {
     $$0$lcssa$i68 = $401;
    }
    (___fwritex($pad$i,$$0$lcssa$i68,$f)|0);
   }
   $408 = ($i$0$lcssa275|0)==(0);
   L463: do {
    if (!($408)) {
     $i$1191 = 0;$ws$1192 = $1176;
     while(1) {
      $409 = HEAP32[$ws$1192>>2]|0;
      $410 = ($409|0)==(0);
      if ($410) {
       break L463;
      }
      $411 = (_wctomb($mb,$409)|0);
      $412 = (($411) + ($i$1191))|0;
      $413 = ($412|0)>($i$0$lcssa275|0);
      if ($413) {
       break L463;
      }
      $414 = ((($ws$1192)) + 4|0);
      (___fwritex($mb,$411,$f)|0);
      $415 = ($412>>>0)<($i$0$lcssa275>>>0);
      if ($415) {
       $i$1191 = $412;$ws$1192 = $414;
      } else {
       break;
      }
     }
    }
   } while(0);
   $416 = ($398|0)==(8192);
   $or$cond$i71 = $416 & $400;
   if ($or$cond$i71) {
    $417 = (($w$1) - ($i$0$lcssa275))|0;
    $418 = ($417>>>0)>(256);
    $419 = $418 ? 256 : $417;
    _memset(($pad$i|0),32,($419|0))|0;
    $420 = ($417>>>0)>(255);
    if ($420) {
     $$01$i73 = $417;
     while(1) {
      (___fwritex($pad$i,256,$f)|0);
      $421 = (($$01$i73) + -256)|0;
      $422 = ($421>>>0)>(255);
      if ($422) {
       $$01$i73 = $421;
      } else {
       break;
      }
     }
     $423 = $417 & 255;
     $$0$lcssa$i75 = $423;
    } else {
     $$0$lcssa$i75 = $417;
    }
    (___fwritex($pad$i,$$0$lcssa$i75,$f)|0);
   }
   $424 = $400 ? $w$1 : $i$0$lcssa275;
   $1164 = $286;$1165 = $1175;$cnt$0 = $cnt$1;$fmt89 = $$lcssa448;$l$0 = $424;$l10n$0 = $l10n$3;
   continue;
  }
  $996 = $z$2;
  $997 = $a$2;
  $998 = (($996) - ($997))|0;
  $999 = ($p$5|0)<($998|0);
  $$p$5 = $999 ? $998 : $p$5;
  $1000 = (($pl$2) + ($$p$5))|0;
  $1001 = ($w$1|0)<($1000|0);
  $w$2 = $1001 ? $1000 : $w$1;
  $1002 = $fl$6 & 73728;
  $1003 = ($1002|0)==(0);
  $1004 = ($w$2|0)>($1000|0);
  $or$cond$i81 = $1003 & $1004;
  if ($or$cond$i81) {
   $1005 = (($w$2) - ($1000))|0;
   $1006 = ($1005>>>0)>(256);
   $1007 = $1006 ? 256 : $1005;
   _memset(($pad$i|0),32,($1007|0))|0;
   $1008 = ($1005>>>0)>(255);
   if ($1008) {
    $$01$i83 = $1005;
    while(1) {
     (___fwritex($pad$i,256,$f)|0);
     $1009 = (($$01$i83) + -256)|0;
     $1010 = ($1009>>>0)>(255);
     if ($1010) {
      $$01$i83 = $1009;
     } else {
      break;
     }
    }
    $1011 = $1005 & 255;
    $$0$lcssa$i85 = $1011;
   } else {
    $$0$lcssa$i85 = $1005;
   }
   (___fwritex($pad$i,$$0$lcssa$i85,$f)|0);
  }
  (___fwritex($prefix$2,$pl$2,$f)|0);
  $1012 = ($1002|0)==(65536);
  $or$cond$i57 = $1012 & $1004;
  if ($or$cond$i57) {
   $1013 = (($w$2) - ($1000))|0;
   $1014 = ($1013>>>0)>(256);
   $1015 = $1014 ? 256 : $1013;
   _memset(($pad$i|0),48,($1015|0))|0;
   $1016 = ($1013>>>0)>(255);
   if ($1016) {
    $$01$i59 = $1013;
    while(1) {
     (___fwritex($pad$i,256,$f)|0);
     $1017 = (($$01$i59) + -256)|0;
     $1018 = ($1017>>>0)>(255);
     if ($1018) {
      $$01$i59 = $1017;
     } else {
      break;
     }
    }
    $1019 = $1013 & 255;
    $$0$lcssa$i61 = $1019;
   } else {
    $$0$lcssa$i61 = $1013;
   }
   (___fwritex($pad$i,$$0$lcssa$i61,$f)|0);
  }
  $1020 = ($$p$5|0)>($998|0);
  if ($1020) {
   $1021 = (($$p$5) - ($998))|0;
   $1022 = ($1021>>>0)>(256);
   $1023 = $1022 ? 256 : $1021;
   _memset(($pad$i|0),48,($1023|0))|0;
   $1024 = ($1021>>>0)>(255);
   if ($1024) {
    $$01$i44 = $1021;
    while(1) {
     (___fwritex($pad$i,256,$f)|0);
     $1025 = (($$01$i44) + -256)|0;
     $1026 = ($1025>>>0)>(255);
     if ($1026) {
      $$01$i44 = $1025;
     } else {
      break;
     }
    }
    $1027 = $1021 & 255;
    $$0$lcssa$i46 = $1027;
   } else {
    $$0$lcssa$i46 = $1021;
   }
   (___fwritex($pad$i,$$0$lcssa$i46,$f)|0);
  }
  (___fwritex($a$2,$998,$f)|0);
  $1028 = ($1002|0)==(8192);
  $or$cond$i = $1028 & $1004;
  if ($or$cond$i) {
   $1029 = (($w$2) - ($1000))|0;
   $1030 = ($1029>>>0)>(256);
   $1031 = $1030 ? 256 : $1029;
   _memset(($pad$i|0),32,($1031|0))|0;
   $1032 = ($1029>>>0)>(255);
   if ($1032) {
    $$01$i = $1029;
    while(1) {
     (___fwritex($pad$i,256,$f)|0);
     $1033 = (($$01$i) + -256)|0;
     $1034 = ($1033>>>0)>(255);
     if ($1034) {
      $$01$i = $1033;
     } else {
      break;
     }
    }
    $1035 = $1029 & 255;
    $$0$lcssa$i = $1035;
   } else {
    $$0$lcssa$i = $1029;
   }
   (___fwritex($pad$i,$$0$lcssa$i,$f)|0);
  }
  $1164 = $1169;$1165 = $1170;$cnt$0 = $cnt$1;$fmt89 = $$lcssa448;$l$0 = $w$2;$l10n$0 = $l10n$3;
 }
 if ((label|0) == 344) {
  $1036 = ($f|0)==(0|0);
  if (!($1036)) {
   $$0 = $cnt$1$lcssa;
   STACKTOP = sp;return ($$0|0);
  }
  $1037 = ($l10n$0$lcssa|0)==(0);
  if ($1037) {
   $$0 = 0;
   STACKTOP = sp;return ($$0|0);
  } else {
   $i$2166 = 1;
  }
  while(1) {
   $1038 = (($nl_type) + ($i$2166<<2)|0);
   $1039 = HEAP32[$1038>>2]|0;
   $1040 = ($1039|0)==(0);
   if ($1040) {
    $i$2166$lcssa = $i$2166;
    break;
   }
   $1042 = (($nl_arg) + ($i$2166<<3)|0);
   $1043 = ($1039>>>0)>(20);
   L522: do {
    if (!($1043)) {
     do {
      switch ($1039|0) {
      case 9:  {
       $arglist_current35 = HEAP32[$ap>>2]|0;
       $1044 = $arglist_current35;
       $1045 = ((0) + 4|0);
       $expanded148 = $1045;
       $expanded147 = (($expanded148) - 1)|0;
       $1046 = (($1044) + ($expanded147))|0;
       $1047 = ((0) + 4|0);
       $expanded152 = $1047;
       $expanded151 = (($expanded152) - 1)|0;
       $expanded150 = $expanded151 ^ -1;
       $1048 = $1046 & $expanded150;
       $1049 = $1048;
       $1050 = HEAP32[$1049>>2]|0;
       $arglist_next36 = ((($1049)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next36;
       HEAP32[$1042>>2] = $1050;
       break L522;
       break;
      }
      case 10:  {
       $arglist_current38 = HEAP32[$ap>>2]|0;
       $1051 = $arglist_current38;
       $1052 = ((0) + 4|0);
       $expanded155 = $1052;
       $expanded154 = (($expanded155) - 1)|0;
       $1053 = (($1051) + ($expanded154))|0;
       $1054 = ((0) + 4|0);
       $expanded159 = $1054;
       $expanded158 = (($expanded159) - 1)|0;
       $expanded157 = $expanded158 ^ -1;
       $1055 = $1053 & $expanded157;
       $1056 = $1055;
       $1057 = HEAP32[$1056>>2]|0;
       $arglist_next39 = ((($1056)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next39;
       $1058 = ($1057|0)<(0);
       $1059 = $1058 << 31 >> 31;
       $1060 = $1042;
       $1061 = $1060;
       HEAP32[$1061>>2] = $1057;
       $1062 = (($1060) + 4)|0;
       $1063 = $1062;
       HEAP32[$1063>>2] = $1059;
       break L522;
       break;
      }
      case 11:  {
       $arglist_current41 = HEAP32[$ap>>2]|0;
       $1064 = $arglist_current41;
       $1065 = ((0) + 4|0);
       $expanded162 = $1065;
       $expanded161 = (($expanded162) - 1)|0;
       $1066 = (($1064) + ($expanded161))|0;
       $1067 = ((0) + 4|0);
       $expanded166 = $1067;
       $expanded165 = (($expanded166) - 1)|0;
       $expanded164 = $expanded165 ^ -1;
       $1068 = $1066 & $expanded164;
       $1069 = $1068;
       $1070 = HEAP32[$1069>>2]|0;
       $arglist_next42 = ((($1069)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next42;
       $1071 = $1042;
       $1072 = $1071;
       HEAP32[$1072>>2] = $1070;
       $1073 = (($1071) + 4)|0;
       $1074 = $1073;
       HEAP32[$1074>>2] = 0;
       break L522;
       break;
      }
      case 12:  {
       $arglist_current44 = HEAP32[$ap>>2]|0;
       $1075 = $arglist_current44;
       $1076 = ((0) + 8|0);
       $expanded169 = $1076;
       $expanded168 = (($expanded169) - 1)|0;
       $1077 = (($1075) + ($expanded168))|0;
       $1078 = ((0) + 8|0);
       $expanded173 = $1078;
       $expanded172 = (($expanded173) - 1)|0;
       $expanded171 = $expanded172 ^ -1;
       $1079 = $1077 & $expanded171;
       $1080 = $1079;
       $1081 = $1080;
       $1082 = $1081;
       $1083 = HEAP32[$1082>>2]|0;
       $1084 = (($1081) + 4)|0;
       $1085 = $1084;
       $1086 = HEAP32[$1085>>2]|0;
       $arglist_next45 = ((($1080)) + 8|0);
       HEAP32[$ap>>2] = $arglist_next45;
       $1087 = $1042;
       $1088 = $1087;
       HEAP32[$1088>>2] = $1083;
       $1089 = (($1087) + 4)|0;
       $1090 = $1089;
       HEAP32[$1090>>2] = $1086;
       break L522;
       break;
      }
      case 13:  {
       $arglist_current47 = HEAP32[$ap>>2]|0;
       $1091 = $arglist_current47;
       $1092 = ((0) + 4|0);
       $expanded176 = $1092;
       $expanded175 = (($expanded176) - 1)|0;
       $1093 = (($1091) + ($expanded175))|0;
       $1094 = ((0) + 4|0);
       $expanded180 = $1094;
       $expanded179 = (($expanded180) - 1)|0;
       $expanded178 = $expanded179 ^ -1;
       $1095 = $1093 & $expanded178;
       $1096 = $1095;
       $1097 = HEAP32[$1096>>2]|0;
       $arglist_next48 = ((($1096)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next48;
       $1098 = $1097&65535;
       $1099 = $1098 << 16 >> 16;
       $1100 = ($1099|0)<(0);
       $1101 = $1100 << 31 >> 31;
       $1102 = $1042;
       $1103 = $1102;
       HEAP32[$1103>>2] = $1099;
       $1104 = (($1102) + 4)|0;
       $1105 = $1104;
       HEAP32[$1105>>2] = $1101;
       break L522;
       break;
      }
      case 14:  {
       $arglist_current50 = HEAP32[$ap>>2]|0;
       $1106 = $arglist_current50;
       $1107 = ((0) + 4|0);
       $expanded183 = $1107;
       $expanded182 = (($expanded183) - 1)|0;
       $1108 = (($1106) + ($expanded182))|0;
       $1109 = ((0) + 4|0);
       $expanded187 = $1109;
       $expanded186 = (($expanded187) - 1)|0;
       $expanded185 = $expanded186 ^ -1;
       $1110 = $1108 & $expanded185;
       $1111 = $1110;
       $1112 = HEAP32[$1111>>2]|0;
       $arglist_next51 = ((($1111)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next51;
       $$mask1$i = $1112 & 65535;
       $1113 = $1042;
       $1114 = $1113;
       HEAP32[$1114>>2] = $$mask1$i;
       $1115 = (($1113) + 4)|0;
       $1116 = $1115;
       HEAP32[$1116>>2] = 0;
       break L522;
       break;
      }
      case 15:  {
       $arglist_current53 = HEAP32[$ap>>2]|0;
       $1117 = $arglist_current53;
       $1118 = ((0) + 4|0);
       $expanded190 = $1118;
       $expanded189 = (($expanded190) - 1)|0;
       $1119 = (($1117) + ($expanded189))|0;
       $1120 = ((0) + 4|0);
       $expanded194 = $1120;
       $expanded193 = (($expanded194) - 1)|0;
       $expanded192 = $expanded193 ^ -1;
       $1121 = $1119 & $expanded192;
       $1122 = $1121;
       $1123 = HEAP32[$1122>>2]|0;
       $arglist_next54 = ((($1122)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next54;
       $1124 = $1123&255;
       $1125 = $1124 << 24 >> 24;
       $1126 = ($1125|0)<(0);
       $1127 = $1126 << 31 >> 31;
       $1128 = $1042;
       $1129 = $1128;
       HEAP32[$1129>>2] = $1125;
       $1130 = (($1128) + 4)|0;
       $1131 = $1130;
       HEAP32[$1131>>2] = $1127;
       break L522;
       break;
      }
      case 16:  {
       $arglist_current56 = HEAP32[$ap>>2]|0;
       $1132 = $arglist_current56;
       $1133 = ((0) + 4|0);
       $expanded197 = $1133;
       $expanded196 = (($expanded197) - 1)|0;
       $1134 = (($1132) + ($expanded196))|0;
       $1135 = ((0) + 4|0);
       $expanded201 = $1135;
       $expanded200 = (($expanded201) - 1)|0;
       $expanded199 = $expanded200 ^ -1;
       $1136 = $1134 & $expanded199;
       $1137 = $1136;
       $1138 = HEAP32[$1137>>2]|0;
       $arglist_next57 = ((($1137)) + 4|0);
       HEAP32[$ap>>2] = $arglist_next57;
       $$mask$i = $1138 & 255;
       $1139 = $1042;
       $1140 = $1139;
       HEAP32[$1140>>2] = $$mask$i;
       $1141 = (($1139) + 4)|0;
       $1142 = $1141;
       HEAP32[$1142>>2] = 0;
       break L522;
       break;
      }
      case 17:  {
       $arglist_current59 = HEAP32[$ap>>2]|0;
       $1143 = $arglist_current59;
       $1144 = ((0) + 8|0);
       $expanded204 = $1144;
       $expanded203 = (($expanded204) - 1)|0;
       $1145 = (($1143) + ($expanded203))|0;
       $1146 = ((0) + 8|0);
       $expanded208 = $1146;
       $expanded207 = (($expanded208) - 1)|0;
       $expanded206 = $expanded207 ^ -1;
       $1147 = $1145 & $expanded206;
       $1148 = $1147;
       $1149 = +HEAPF64[$1148>>3];
       $arglist_next60 = ((($1148)) + 8|0);
       HEAP32[$ap>>2] = $arglist_next60;
       HEAPF64[$1042>>3] = $1149;
       break L522;
       break;
      }
      case 18:  {
       $arglist_current62 = HEAP32[$ap>>2]|0;
       $1150 = $arglist_current62;
       $1151 = ((0) + 8|0);
       $expanded211 = $1151;
       $expanded210 = (($expanded211) - 1)|0;
       $1152 = (($1150) + ($expanded210))|0;
       $1153 = ((0) + 8|0);
       $expanded215 = $1153;
       $expanded214 = (($expanded215) - 1)|0;
       $expanded213 = $expanded214 ^ -1;
       $1154 = $1152 & $expanded213;
       $1155 = $1154;
       $1156 = +HEAPF64[$1155>>3];
       $arglist_next63 = ((($1155)) + 8|0);
       HEAP32[$ap>>2] = $arglist_next63;
       HEAPF64[$1042>>3] = $1156;
       break L522;
       break;
      }
      default: {
       break L522;
      }
      }
     } while(0);
    }
   } while(0);
   $1157 = (($i$2166) + 1)|0;
   $1158 = ($1157|0)<(10);
   if ($1158) {
    $i$2166 = $1157;
   } else {
    $$0 = 1;
    label = 363;
    break;
   }
  }
  if ((label|0) == 363) {
   STACKTOP = sp;return ($$0|0);
  }
  $1041 = ($i$2166$lcssa|0)<(10);
  if ($1041) {
   $i$3164 = $i$2166$lcssa;
  } else {
   $$0 = 1;
   STACKTOP = sp;return ($$0|0);
  }
  while(1) {
   $1161 = (($nl_type) + ($i$3164<<2)|0);
   $1162 = HEAP32[$1161>>2]|0;
   $1163 = ($1162|0)==(0);
   $1159 = (($i$3164) + 1)|0;
   if (!($1163)) {
    $$0 = -1;
    label = 363;
    break;
   }
   $1160 = ($1159|0)<(10);
   if ($1160) {
    $i$3164 = $1159;
   } else {
    $$0 = 1;
    label = 363;
    break;
   }
  }
  if ((label|0) == 363) {
   STACKTOP = sp;return ($$0|0);
  }
 }
 else if ((label|0) == 363) {
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function _sn_write($f,$s,$l) {
 $f = $f|0;
 $s = $s|0;
 $l = $l|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $l$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($f)) + 20|0);
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
 return ($l|0);
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$3$i = 0, $$lcssa = 0, $$lcssa211 = 0, $$lcssa215 = 0, $$lcssa216 = 0, $$lcssa217 = 0, $$lcssa219 = 0, $$lcssa222 = 0, $$lcssa224 = 0, $$lcssa226 = 0, $$lcssa228 = 0, $$lcssa230 = 0, $$lcssa232 = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i22$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i23$iZ2D = 0;
 var $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi58$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre106 = 0, $$pre14$i$i = 0, $$pre43$i = 0, $$pre56$i$i = 0, $$pre57$i$i = 0, $$pre8$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i13$i = 0, $$sum$i14$i = 0, $$sum$i17$i = 0, $$sum$i19$i = 0;
 var $$sum$i2334 = 0, $$sum$i32 = 0, $$sum$i35 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i15$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum116$i = 0;
 var $$sum117$i = 0, $$sum118$i = 0, $$sum119$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum120$i = 0, $$sum121$i = 0, $$sum122$i = 0, $$sum123$i = 0, $$sum124$i = 0, $$sum125$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum15$i = 0, $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0;
 var $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i16$i = 0, $$sum2$i18$i = 0, $$sum2$i21$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0, $$sum25$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i27 = 0;
 var $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0, $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0;
 var $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0;
 var $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0;
 var $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0;
 var $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0;
 var $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0;
 var $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0;
 var $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0;
 var $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0;
 var $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0;
 var $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0;
 var $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0;
 var $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0;
 var $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0;
 var $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0;
 var $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0;
 var $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0;
 var $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0;
 var $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0;
 var $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0;
 var $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0;
 var $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0;
 var $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0;
 var $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0;
 var $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0;
 var $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0;
 var $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0;
 var $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0;
 var $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0;
 var $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0;
 var $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0;
 var $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0;
 var $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0;
 var $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0;
 var $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0;
 var $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0;
 var $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0;
 var $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0;
 var $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0;
 var $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0;
 var $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0;
 var $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0;
 var $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0;
 var $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0;
 var $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0;
 var $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0;
 var $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0;
 var $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0;
 var $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0;
 var $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0;
 var $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0;
 var $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0;
 var $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0;
 var $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0;
 var $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0;
 var $F5$0$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$029$i = 0, $K2$07$i$i = 0, $K8$051$i$i = 0, $R$0$i = 0, $R$0$i$i = 0, $R$0$i$i$lcssa = 0, $R$0$i$lcssa = 0, $R$0$i18 = 0, $R$0$i18$lcssa = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i$i$lcssa = 0, $RP$0$i$lcssa = 0;
 var $RP$0$i17 = 0, $RP$0$i17$lcssa = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i25$i = 0, $T$028$i = 0, $T$028$i$lcssa = 0, $T$050$i$i = 0, $T$050$i$i$lcssa = 0, $T$06$i$i = 0, $T$06$i$i$lcssa = 0, $br$0$ph$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0, $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0;
 var $not$$i = 0, $not$$i$i = 0, $not$$i26$i = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i30 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond3$i = 0, $or$cond5$i = 0, $or$cond57$i = 0, $or$cond6$i = 0, $or$cond8$i = 0, $or$cond9$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i$lcssa = 0, $rsize$0$i15 = 0, $rsize$1$i = 0;
 var $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$084$i = 0, $sp$084$i$lcssa = 0, $sp$183$i = 0, $sp$183$i$lcssa = 0, $ssize$0$$i = 0, $ssize$0$i = 0, $ssize$1$ph$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0, $t$1$i = 0, $t$2$ph$i = 0;
 var $t$2$v$3$i = 0, $t$230$i = 0, $tbase$255$i = 0, $tsize$0$ph$i = 0, $tsize$0323944$i = 0, $tsize$1$i = 0, $tsize$254$i = 0, $v$0$i = 0, $v$0$i$lcssa = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$3$ph$i = 0, $v$332$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   $2 = (($bytes) + 11)|0;
   $3 = $2 & -8;
   $4 = $1 ? 16 : $3;
   $5 = $4 >>> 3;
   $6 = HEAP32[16376>>2]|0;
   $7 = $6 >>> $5;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($5))|0;
    $13 = $12 << 1;
    $14 = (16416 + ($13<<2)|0);
    $$sum10 = (($13) + 2)|0;
    $15 = (16416 + ($$sum10<<2)|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = ((($16)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[16376>>2] = $22;
     } else {
      $23 = HEAP32[(16392)>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = ((($18)) + 12|0);
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
    $30 = ((($16)) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    return ($mem$0|0);
   }
   $34 = HEAP32[(16384)>>2]|0;
   $35 = ($4>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $5;
     $38 = 2 << $5;
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
     $66 = (16416 + ($65<<2)|0);
     $$sum4 = (($65) + 2)|0;
     $67 = (16416 + ($$sum4<<2)|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = ((($68)) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[16376>>2] = $74;
       $88 = $34;
      } else {
       $75 = HEAP32[(16392)>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = ((($70)) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[(16384)>>2]|0;
        $88 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($4))|0;
     $82 = $4 | 3;
     $83 = ((($68)) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($4)|0);
     $85 = $81 | 1;
     $$sum56 = $4 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $89 = ($88|0)==(0);
     if (!($89)) {
      $90 = HEAP32[(16396)>>2]|0;
      $91 = $88 >>> 3;
      $92 = $91 << 1;
      $93 = (16416 + ($92<<2)|0);
      $94 = HEAP32[16376>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[16376>>2] = $98;
       $$pre105 = (($92) + 2)|0;
       $$pre106 = (16416 + ($$pre105<<2)|0);
       $$pre$phiZ2D = $$pre106;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = (16416 + ($$sum9<<2)|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[(16392)>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = ((($F4$0)) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = ((($90)) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = ((($90)) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[(16384)>>2] = $81;
     HEAP32[(16396)>>2] = $84;
     $mem$0 = $69;
     return ($mem$0|0);
    }
    $106 = HEAP32[(16380)>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $4;
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
     $131 = (16680 + ($130<<2)|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = ((($132)) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($4))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = ((($t$0$i)) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = ((($t$0$i)) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        $rsize$0$i$lcssa = $rsize$0$i;$v$0$i$lcssa = $v$0$i;
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = ((($144)) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($4))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[(16392)>>2]|0;
     $150 = ($v$0$i$lcssa>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i$lcssa) + ($4)|0);
     $152 = ($v$0$i$lcssa>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = ((($v$0$i$lcssa)) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = ((($v$0$i$lcssa)) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i$lcssa|0);
     do {
      if ($157) {
       $167 = ((($v$0$i$lcssa)) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = ((($v$0$i$lcssa)) + 16|0);
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
        $173 = ((($R$0$i)) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = ((($R$0$i)) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         $R$0$i$lcssa = $R$0$i;$RP$0$i$lcssa = $RP$0$i;
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i$lcssa>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i$lcssa>>2] = 0;
        $R$1$i = $R$0$i$lcssa;
        break;
       }
      } else {
       $158 = ((($v$0$i$lcssa)) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = ((($159)) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i$lcssa|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = ((($156)) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i$lcssa|0);
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
       $181 = ((($v$0$i$lcssa)) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = (16680 + ($182<<2)|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i$lcssa|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[(16380)>>2]|0;
         $189 = $188 & $187;
         HEAP32[(16380)>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[(16392)>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = ((($154)) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i$lcssa|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = ((($154)) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[(16392)>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = ((($R$1$i)) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = ((($v$0$i$lcssa)) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = ((($R$1$i)) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = ((($201)) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = ((($v$0$i$lcssa)) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[(16392)>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = ((($R$1$i)) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = ((($207)) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i$lcssa>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i$lcssa) + ($4))|0;
      $215 = $214 | 3;
      $216 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i$lcssa) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $4 | 3;
      $221 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i$lcssa | 1;
      $$sum$i35 = $4 | 4;
      $223 = (($v$0$i$lcssa) + ($$sum$i35)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i$lcssa) + ($4))|0;
      $224 = (($v$0$i$lcssa) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i$lcssa;
      $225 = HEAP32[(16384)>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[(16396)>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = (16416 + ($229<<2)|0);
       $231 = HEAP32[16376>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[16376>>2] = $235;
        $$pre$i = (($229) + 2)|0;
        $$pre8$i = (16416 + ($$pre$i<<2)|0);
        $$pre$phi$iZ2D = $$pre8$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = (16416 + ($$sum3$i<<2)|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[(16392)>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = ((($F1$0$i)) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = ((($227)) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = ((($227)) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[(16384)>>2] = $rsize$0$i$lcssa;
      HEAP32[(16396)>>2] = $151;
     }
     $243 = ((($v$0$i$lcssa)) + 8|0);
     $mem$0 = $243;
     return ($mem$0|0);
    }
   } else {
    $nb$0 = $4;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[(16380)>>2]|0;
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
     $275 = (16680 + ($idx$0$i<<2)|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L123: do {
      if ($277) {
       $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
       label = 86;
      } else {
       $278 = ($idx$0$i|0)==(31);
       $279 = $idx$0$i >>> 1;
       $280 = (25 - ($279))|0;
       $281 = $278 ? 0 : $280;
       $282 = $246 << $281;
       $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $282;$t$0$i14 = $276;$v$0$i16 = 0;
       while(1) {
        $283 = ((($t$0$i14)) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($rsize$0$i15>>>0);
        if ($287) {
         $288 = ($285|0)==($246|0);
         if ($288) {
          $rsize$331$i = $286;$t$230$i = $t$0$i14;$v$332$i = $t$0$i14;
          label = 90;
          break L123;
         } else {
          $rsize$1$i = $286;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $289 = ((($t$0$i14)) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $sizebits$0$i >>> 31;
        $292 = (((($t$0$i14)) + 16|0) + ($291<<2)|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         label = 86;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     if ((label|0) == 86) {
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
       $328 = (16680 + ($327<<2)|0);
       $329 = HEAP32[$328>>2]|0;
       $t$2$ph$i = $329;$v$3$ph$i = 0;
      } else {
       $t$2$ph$i = $t$1$i;$v$3$ph$i = $v$2$i;
      }
      $330 = ($t$2$ph$i|0)==(0|0);
      if ($330) {
       $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$3$ph$i;
      } else {
       $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$3$ph$i;
       label = 90;
      }
     }
     if ((label|0) == 90) {
      while(1) {
       label = 0;
       $331 = ((($t$230$i)) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = ((($t$230$i)) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if (!($338)) {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $337;$v$332$i = $t$2$v$3$i;
        label = 90;
        continue;
       }
       $339 = ((($t$230$i)) + 20|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $340;$v$332$i = $t$2$v$3$i;
        label = 90;
       }
      }
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[(16384)>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[(16392)>>2]|0;
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
       $350 = ((($v$3$lcssa$i)) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = ((($v$3$lcssa$i)) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = ((($v$3$lcssa$i)) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = ((($v$3$lcssa$i)) + 16|0);
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
          $370 = ((($R$0$i18)) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if (!($372)) {
           $R$0$i18 = $371;$RP$0$i17 = $370;
           continue;
          }
          $373 = ((($R$0$i18)) + 16|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if ($375) {
           $R$0$i18$lcssa = $R$0$i18;$RP$0$i17$lcssa = $RP$0$i17;
           break;
          } else {
           $R$0$i18 = $374;$RP$0$i17 = $373;
          }
         }
         $376 = ($RP$0$i17$lcssa>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17$lcssa>>2] = 0;
          $R$1$i20 = $R$0$i18$lcssa;
          break;
         }
        } else {
         $355 = ((($v$3$lcssa$i)) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = ((($356)) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = ((($353)) + 8|0);
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
         $378 = ((($v$3$lcssa$i)) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = (16680 + ($379<<2)|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[(16380)>>2]|0;
           $386 = $385 & $384;
           HEAP32[(16380)>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[(16392)>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = ((($351)) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = ((($351)) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[(16392)>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = ((($R$1$i20)) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = ((($v$3$lcssa$i)) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = ((($R$1$i20)) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = ((($398)) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = ((($v$3$lcssa$i)) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[(16392)>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = ((($R$1$i20)) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = ((($404)) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L199: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2334 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2334)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = (16416 + ($424<<2)|0);
          $426 = HEAP32[16376>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          if ($429) {
           $430 = $426 | $427;
           HEAP32[16376>>2] = $430;
           $$pre$i25 = (($424) + 2)|0;
           $$pre43$i = (16416 + ($$pre$i25<<2)|0);
           $$pre$phi$i26Z2D = $$pre43$i;$F5$0$i = $425;
          } else {
           $$sum17$i = (($424) + 2)|0;
           $431 = (16416 + ($$sum17$i<<2)|0);
           $432 = HEAP32[$431>>2]|0;
           $433 = HEAP32[(16392)>>2]|0;
           $434 = ($432>>>0)<($433>>>0);
           if ($434) {
            _abort();
            // unreachable;
           } else {
            $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
           }
          }
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = ((($F5$0$i)) + 12|0);
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
         $463 = (16680 + ($I7$0$i<<2)|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[(16380)>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[(16380)>>2] = $471;
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
         $476 = ((($475)) + 4|0);
         $477 = HEAP32[$476>>2]|0;
         $478 = $477 & -8;
         $479 = ($478|0)==($rsize$3$lcssa$i|0);
         L217: do {
          if ($479) {
           $T$0$lcssa$i = $475;
          } else {
           $480 = ($I7$0$i|0)==(31);
           $481 = $I7$0$i >>> 1;
           $482 = (25 - ($481))|0;
           $483 = $480 ? 0 : $482;
           $484 = $rsize$3$lcssa$i << $483;
           $K12$029$i = $484;$T$028$i = $475;
           while(1) {
            $491 = $K12$029$i >>> 31;
            $492 = (((($T$028$i)) + 16|0) + ($491<<2)|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             $$lcssa232 = $492;$T$028$i$lcssa = $T$028$i;
             break;
            }
            $485 = $K12$029$i << 1;
            $486 = ((($487)) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L217;
            } else {
             $K12$029$i = $485;$T$028$i = $487;
            }
           }
           $494 = HEAP32[(16392)>>2]|0;
           $495 = ($$lcssa232>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$$lcssa232>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$028$i$lcssa;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L199;
           }
          }
         } while(0);
         $499 = ((($T$0$lcssa$i)) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[(16392)>>2]|0;
         $502 = ($500>>>0)>=($501>>>0);
         $not$$i = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = $502 & $not$$i;
         if ($503) {
          $504 = ((($500)) + 12|0);
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
       $508 = ((($v$3$lcssa$i)) + 8|0);
       $mem$0 = $508;
       return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[(16384)>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[(16396)>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[(16396)>>2] = $514;
   HEAP32[(16384)>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = ((($512)) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[(16384)>>2] = 0;
   HEAP32[(16396)>>2] = 0;
   $520 = $509 | 3;
   $521 = ((($512)) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = ((($512)) + 8|0);
  $mem$0 = $525;
  return ($mem$0|0);
 }
 $526 = HEAP32[(16388)>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[(16388)>>2] = $528;
  $529 = HEAP32[(16400)>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[(16400)>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = ((($529)) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = ((($529)) + 8|0);
  $mem$0 = $535;
  return ($mem$0|0);
 }
 $536 = HEAP32[16848>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[(16856)>>2] = $538;
    HEAP32[(16852)>>2] = $538;
    HEAP32[(16860)>>2] = -1;
    HEAP32[(16864)>>2] = -1;
    HEAP32[(16868)>>2] = 0;
    HEAP32[(16820)>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[16848>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[(16856)>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  return ($mem$0|0);
 }
 $552 = HEAP32[(16816)>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[(16808)>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   return ($mem$0|0);
  }
 }
 $558 = HEAP32[(16820)>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L258: do {
  if ($560) {
   $561 = HEAP32[(16400)>>2]|0;
   $562 = ($561|0)==(0|0);
   L260: do {
    if ($562) {
     label = 174;
    } else {
     $sp$0$i$i = (16824);
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = ((($sp$0$i$i)) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        $$lcssa228 = $sp$0$i$i;$$lcssa230 = $565;
        break;
       }
      }
      $569 = ((($sp$0$i$i)) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 174;
       break L260;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $594 = HEAP32[(16388)>>2]|0;
     $595 = (($548) - ($594))|0;
     $596 = $595 & $549;
     $597 = ($596>>>0)<(2147483647);
     if ($597) {
      $598 = (_sbrk(($596|0))|0);
      $599 = HEAP32[$$lcssa228>>2]|0;
      $600 = HEAP32[$$lcssa230>>2]|0;
      $601 = (($599) + ($600)|0);
      $602 = ($598|0)==($601|0);
      $$3$i = $602 ? $596 : 0;
      if ($602) {
       $603 = ($598|0)==((-1)|0);
       if ($603) {
        $tsize$0323944$i = $$3$i;
       } else {
        $tbase$255$i = $598;$tsize$254$i = $$3$i;
        label = 194;
        break L258;
       }
      } else {
       $br$0$ph$i = $598;$ssize$1$ph$i = $596;$tsize$0$ph$i = $$3$i;
       label = 184;
      }
     } else {
      $tsize$0323944$i = 0;
     }
    }
   } while(0);
   do {
    if ((label|0) == 174) {
     $572 = (_sbrk(0)|0);
     $573 = ($572|0)==((-1)|0);
     if ($573) {
      $tsize$0323944$i = 0;
     } else {
      $574 = $572;
      $575 = HEAP32[(16852)>>2]|0;
      $576 = (($575) + -1)|0;
      $577 = $576 & $574;
      $578 = ($577|0)==(0);
      if ($578) {
       $ssize$0$i = $550;
      } else {
       $579 = (($576) + ($574))|0;
       $580 = (0 - ($575))|0;
       $581 = $579 & $580;
       $582 = (($550) - ($574))|0;
       $583 = (($582) + ($581))|0;
       $ssize$0$i = $583;
      }
      $584 = HEAP32[(16808)>>2]|0;
      $585 = (($584) + ($ssize$0$i))|0;
      $586 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $587 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i30 = $586 & $587;
      if ($or$cond$i30) {
       $588 = HEAP32[(16816)>>2]|0;
       $589 = ($588|0)==(0);
       if (!($589)) {
        $590 = ($585>>>0)<=($584>>>0);
        $591 = ($585>>>0)>($588>>>0);
        $or$cond2$i = $590 | $591;
        if ($or$cond2$i) {
         $tsize$0323944$i = 0;
         break;
        }
       }
       $592 = (_sbrk(($ssize$0$i|0))|0);
       $593 = ($592|0)==($572|0);
       $ssize$0$$i = $593 ? $ssize$0$i : 0;
       if ($593) {
        $tbase$255$i = $572;$tsize$254$i = $ssize$0$$i;
        label = 194;
        break L258;
       } else {
        $br$0$ph$i = $592;$ssize$1$ph$i = $ssize$0$i;$tsize$0$ph$i = $ssize$0$$i;
        label = 184;
       }
      } else {
       $tsize$0323944$i = 0;
      }
     }
    }
   } while(0);
   L280: do {
    if ((label|0) == 184) {
     $604 = (0 - ($ssize$1$ph$i))|0;
     $605 = ($br$0$ph$i|0)!=((-1)|0);
     $606 = ($ssize$1$ph$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $605;
     $607 = ($545>>>0)>($ssize$1$ph$i>>>0);
     $or$cond6$i = $607 & $or$cond5$i;
     do {
      if ($or$cond6$i) {
       $608 = HEAP32[(16856)>>2]|0;
       $609 = (($547) - ($ssize$1$ph$i))|0;
       $610 = (($609) + ($608))|0;
       $611 = (0 - ($608))|0;
       $612 = $610 & $611;
       $613 = ($612>>>0)<(2147483647);
       if ($613) {
        $614 = (_sbrk(($612|0))|0);
        $615 = ($614|0)==((-1)|0);
        if ($615) {
         (_sbrk(($604|0))|0);
         $tsize$0323944$i = $tsize$0$ph$i;
         break L280;
        } else {
         $616 = (($612) + ($ssize$1$ph$i))|0;
         $ssize$2$i = $616;
         break;
        }
       } else {
        $ssize$2$i = $ssize$1$ph$i;
       }
      } else {
       $ssize$2$i = $ssize$1$ph$i;
      }
     } while(0);
     $617 = ($br$0$ph$i|0)==((-1)|0);
     if ($617) {
      $tsize$0323944$i = $tsize$0$ph$i;
     } else {
      $tbase$255$i = $br$0$ph$i;$tsize$254$i = $ssize$2$i;
      label = 194;
      break L258;
     }
    }
   } while(0);
   $618 = HEAP32[(16820)>>2]|0;
   $619 = $618 | 4;
   HEAP32[(16820)>>2] = $619;
   $tsize$1$i = $tsize$0323944$i;
   label = 191;
  } else {
   $tsize$1$i = 0;
   label = 191;
  }
 } while(0);
 if ((label|0) == 191) {
  $620 = ($550>>>0)<(2147483647);
  if ($620) {
   $621 = (_sbrk(($550|0))|0);
   $622 = (_sbrk(0)|0);
   $623 = ($621|0)!=((-1)|0);
   $624 = ($622|0)!=((-1)|0);
   $or$cond3$i = $623 & $624;
   $625 = ($621>>>0)<($622>>>0);
   $or$cond8$i = $625 & $or$cond3$i;
   if ($or$cond8$i) {
    $626 = $622;
    $627 = $621;
    $628 = (($626) - ($627))|0;
    $629 = (($nb$0) + 40)|0;
    $630 = ($628>>>0)>($629>>>0);
    $$tsize$1$i = $630 ? $628 : $tsize$1$i;
    if ($630) {
     $tbase$255$i = $621;$tsize$254$i = $$tsize$1$i;
     label = 194;
    }
   }
  }
 }
 if ((label|0) == 194) {
  $631 = HEAP32[(16808)>>2]|0;
  $632 = (($631) + ($tsize$254$i))|0;
  HEAP32[(16808)>>2] = $632;
  $633 = HEAP32[(16812)>>2]|0;
  $634 = ($632>>>0)>($633>>>0);
  if ($634) {
   HEAP32[(16812)>>2] = $632;
  }
  $635 = HEAP32[(16400)>>2]|0;
  $636 = ($635|0)==(0|0);
  L299: do {
   if ($636) {
    $637 = HEAP32[(16392)>>2]|0;
    $638 = ($637|0)==(0|0);
    $639 = ($tbase$255$i>>>0)<($637>>>0);
    $or$cond9$i = $638 | $639;
    if ($or$cond9$i) {
     HEAP32[(16392)>>2] = $tbase$255$i;
    }
    HEAP32[(16824)>>2] = $tbase$255$i;
    HEAP32[(16828)>>2] = $tsize$254$i;
    HEAP32[(16836)>>2] = 0;
    $640 = HEAP32[16848>>2]|0;
    HEAP32[(16412)>>2] = $640;
    HEAP32[(16408)>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $641 = $i$02$i$i << 1;
     $642 = (16416 + ($641<<2)|0);
     $$sum$i$i = (($641) + 3)|0;
     $643 = (16416 + ($$sum$i$i<<2)|0);
     HEAP32[$643>>2] = $642;
     $$sum1$i$i = (($641) + 2)|0;
     $644 = (16416 + ($$sum1$i$i<<2)|0);
     HEAP32[$644>>2] = $642;
     $645 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($645|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $645;
     }
    }
    $646 = (($tsize$254$i) + -40)|0;
    $647 = ((($tbase$255$i)) + 8|0);
    $648 = $647;
    $649 = $648 & 7;
    $650 = ($649|0)==(0);
    $651 = (0 - ($648))|0;
    $652 = $651 & 7;
    $653 = $650 ? 0 : $652;
    $654 = (($tbase$255$i) + ($653)|0);
    $655 = (($646) - ($653))|0;
    HEAP32[(16400)>>2] = $654;
    HEAP32[(16388)>>2] = $655;
    $656 = $655 | 1;
    $$sum$i13$i = (($653) + 4)|0;
    $657 = (($tbase$255$i) + ($$sum$i13$i)|0);
    HEAP32[$657>>2] = $656;
    $$sum2$i$i = (($tsize$254$i) + -36)|0;
    $658 = (($tbase$255$i) + ($$sum2$i$i)|0);
    HEAP32[$658>>2] = 40;
    $659 = HEAP32[(16864)>>2]|0;
    HEAP32[(16404)>>2] = $659;
   } else {
    $sp$084$i = (16824);
    while(1) {
     $660 = HEAP32[$sp$084$i>>2]|0;
     $661 = ((($sp$084$i)) + 4|0);
     $662 = HEAP32[$661>>2]|0;
     $663 = (($660) + ($662)|0);
     $664 = ($tbase$255$i|0)==($663|0);
     if ($664) {
      $$lcssa222 = $660;$$lcssa224 = $661;$$lcssa226 = $662;$sp$084$i$lcssa = $sp$084$i;
      label = 204;
      break;
     }
     $665 = ((($sp$084$i)) + 8|0);
     $666 = HEAP32[$665>>2]|0;
     $667 = ($666|0)==(0|0);
     if ($667) {
      break;
     } else {
      $sp$084$i = $666;
     }
    }
    if ((label|0) == 204) {
     $668 = ((($sp$084$i$lcssa)) + 12|0);
     $669 = HEAP32[$668>>2]|0;
     $670 = $669 & 8;
     $671 = ($670|0)==(0);
     if ($671) {
      $672 = ($635>>>0)>=($$lcssa222>>>0);
      $673 = ($635>>>0)<($tbase$255$i>>>0);
      $or$cond57$i = $673 & $672;
      if ($or$cond57$i) {
       $674 = (($$lcssa226) + ($tsize$254$i))|0;
       HEAP32[$$lcssa224>>2] = $674;
       $675 = HEAP32[(16388)>>2]|0;
       $676 = (($675) + ($tsize$254$i))|0;
       $677 = ((($635)) + 8|0);
       $678 = $677;
       $679 = $678 & 7;
       $680 = ($679|0)==(0);
       $681 = (0 - ($678))|0;
       $682 = $681 & 7;
       $683 = $680 ? 0 : $682;
       $684 = (($635) + ($683)|0);
       $685 = (($676) - ($683))|0;
       HEAP32[(16400)>>2] = $684;
       HEAP32[(16388)>>2] = $685;
       $686 = $685 | 1;
       $$sum$i17$i = (($683) + 4)|0;
       $687 = (($635) + ($$sum$i17$i)|0);
       HEAP32[$687>>2] = $686;
       $$sum2$i18$i = (($676) + 4)|0;
       $688 = (($635) + ($$sum2$i18$i)|0);
       HEAP32[$688>>2] = 40;
       $689 = HEAP32[(16864)>>2]|0;
       HEAP32[(16404)>>2] = $689;
       break;
      }
     }
    }
    $690 = HEAP32[(16392)>>2]|0;
    $691 = ($tbase$255$i>>>0)<($690>>>0);
    if ($691) {
     HEAP32[(16392)>>2] = $tbase$255$i;
     $755 = $tbase$255$i;
    } else {
     $755 = $690;
    }
    $692 = (($tbase$255$i) + ($tsize$254$i)|0);
    $sp$183$i = (16824);
    while(1) {
     $693 = HEAP32[$sp$183$i>>2]|0;
     $694 = ($693|0)==($692|0);
     if ($694) {
      $$lcssa219 = $sp$183$i;$sp$183$i$lcssa = $sp$183$i;
      label = 212;
      break;
     }
     $695 = ((($sp$183$i)) + 8|0);
     $696 = HEAP32[$695>>2]|0;
     $697 = ($696|0)==(0|0);
     if ($697) {
      $sp$0$i$i$i = (16824);
      break;
     } else {
      $sp$183$i = $696;
     }
    }
    if ((label|0) == 212) {
     $698 = ((($sp$183$i$lcssa)) + 12|0);
     $699 = HEAP32[$698>>2]|0;
     $700 = $699 & 8;
     $701 = ($700|0)==(0);
     if ($701) {
      HEAP32[$$lcssa219>>2] = $tbase$255$i;
      $702 = ((($sp$183$i$lcssa)) + 4|0);
      $703 = HEAP32[$702>>2]|0;
      $704 = (($703) + ($tsize$254$i))|0;
      HEAP32[$702>>2] = $704;
      $705 = ((($tbase$255$i)) + 8|0);
      $706 = $705;
      $707 = $706 & 7;
      $708 = ($707|0)==(0);
      $709 = (0 - ($706))|0;
      $710 = $709 & 7;
      $711 = $708 ? 0 : $710;
      $712 = (($tbase$255$i) + ($711)|0);
      $$sum112$i = (($tsize$254$i) + 8)|0;
      $713 = (($tbase$255$i) + ($$sum112$i)|0);
      $714 = $713;
      $715 = $714 & 7;
      $716 = ($715|0)==(0);
      $717 = (0 - ($714))|0;
      $718 = $717 & 7;
      $719 = $716 ? 0 : $718;
      $$sum113$i = (($719) + ($tsize$254$i))|0;
      $720 = (($tbase$255$i) + ($$sum113$i)|0);
      $721 = $720;
      $722 = $712;
      $723 = (($721) - ($722))|0;
      $$sum$i19$i = (($711) + ($nb$0))|0;
      $724 = (($tbase$255$i) + ($$sum$i19$i)|0);
      $725 = (($723) - ($nb$0))|0;
      $726 = $nb$0 | 3;
      $$sum1$i20$i = (($711) + 4)|0;
      $727 = (($tbase$255$i) + ($$sum1$i20$i)|0);
      HEAP32[$727>>2] = $726;
      $728 = ($720|0)==($635|0);
      L324: do {
       if ($728) {
        $729 = HEAP32[(16388)>>2]|0;
        $730 = (($729) + ($725))|0;
        HEAP32[(16388)>>2] = $730;
        HEAP32[(16400)>>2] = $724;
        $731 = $730 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $732 = (($tbase$255$i) + ($$sum42$i$i)|0);
        HEAP32[$732>>2] = $731;
       } else {
        $733 = HEAP32[(16396)>>2]|0;
        $734 = ($720|0)==($733|0);
        if ($734) {
         $735 = HEAP32[(16384)>>2]|0;
         $736 = (($735) + ($725))|0;
         HEAP32[(16384)>>2] = $736;
         HEAP32[(16396)>>2] = $724;
         $737 = $736 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $738 = (($tbase$255$i) + ($$sum40$i$i)|0);
         HEAP32[$738>>2] = $737;
         $$sum41$i$i = (($736) + ($$sum$i19$i))|0;
         $739 = (($tbase$255$i) + ($$sum41$i$i)|0);
         HEAP32[$739>>2] = $736;
         break;
        }
        $$sum2$i21$i = (($tsize$254$i) + 4)|0;
        $$sum114$i = (($$sum2$i21$i) + ($719))|0;
        $740 = (($tbase$255$i) + ($$sum114$i)|0);
        $741 = HEAP32[$740>>2]|0;
        $742 = $741 & 3;
        $743 = ($742|0)==(1);
        if ($743) {
         $744 = $741 & -8;
         $745 = $741 >>> 3;
         $746 = ($741>>>0)<(256);
         L331: do {
          if ($746) {
           $$sum3738$i$i = $719 | 8;
           $$sum124$i = (($$sum3738$i$i) + ($tsize$254$i))|0;
           $747 = (($tbase$255$i) + ($$sum124$i)|0);
           $748 = HEAP32[$747>>2]|0;
           $$sum39$i$i = (($tsize$254$i) + 12)|0;
           $$sum125$i = (($$sum39$i$i) + ($719))|0;
           $749 = (($tbase$255$i) + ($$sum125$i)|0);
           $750 = HEAP32[$749>>2]|0;
           $751 = $745 << 1;
           $752 = (16416 + ($751<<2)|0);
           $753 = ($748|0)==($752|0);
           do {
            if (!($753)) {
             $754 = ($748>>>0)<($755>>>0);
             if ($754) {
              _abort();
              // unreachable;
             }
             $756 = ((($748)) + 12|0);
             $757 = HEAP32[$756>>2]|0;
             $758 = ($757|0)==($720|0);
             if ($758) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $759 = ($750|0)==($748|0);
           if ($759) {
            $760 = 1 << $745;
            $761 = $760 ^ -1;
            $762 = HEAP32[16376>>2]|0;
            $763 = $762 & $761;
            HEAP32[16376>>2] = $763;
            break;
           }
           $764 = ($750|0)==($752|0);
           do {
            if ($764) {
             $$pre57$i$i = ((($750)) + 8|0);
             $$pre$phi58$i$iZ2D = $$pre57$i$i;
            } else {
             $765 = ($750>>>0)<($755>>>0);
             if ($765) {
              _abort();
              // unreachable;
             }
             $766 = ((($750)) + 8|0);
             $767 = HEAP32[$766>>2]|0;
             $768 = ($767|0)==($720|0);
             if ($768) {
              $$pre$phi58$i$iZ2D = $766;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $769 = ((($748)) + 12|0);
           HEAP32[$769>>2] = $750;
           HEAP32[$$pre$phi58$i$iZ2D>>2] = $748;
          } else {
           $$sum34$i$i = $719 | 24;
           $$sum115$i = (($$sum34$i$i) + ($tsize$254$i))|0;
           $770 = (($tbase$255$i) + ($$sum115$i)|0);
           $771 = HEAP32[$770>>2]|0;
           $$sum5$i$i = (($tsize$254$i) + 12)|0;
           $$sum116$i = (($$sum5$i$i) + ($719))|0;
           $772 = (($tbase$255$i) + ($$sum116$i)|0);
           $773 = HEAP32[$772>>2]|0;
           $774 = ($773|0)==($720|0);
           do {
            if ($774) {
             $$sum67$i$i = $719 | 16;
             $$sum122$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $784 = (($tbase$255$i) + ($$sum122$i)|0);
             $785 = HEAP32[$784>>2]|0;
             $786 = ($785|0)==(0|0);
             if ($786) {
              $$sum123$i = (($$sum67$i$i) + ($tsize$254$i))|0;
              $787 = (($tbase$255$i) + ($$sum123$i)|0);
              $788 = HEAP32[$787>>2]|0;
              $789 = ($788|0)==(0|0);
              if ($789) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $788;$RP$0$i$i = $787;
              }
             } else {
              $R$0$i$i = $785;$RP$0$i$i = $784;
             }
             while(1) {
              $790 = ((($R$0$i$i)) + 20|0);
              $791 = HEAP32[$790>>2]|0;
              $792 = ($791|0)==(0|0);
              if (!($792)) {
               $R$0$i$i = $791;$RP$0$i$i = $790;
               continue;
              }
              $793 = ((($R$0$i$i)) + 16|0);
              $794 = HEAP32[$793>>2]|0;
              $795 = ($794|0)==(0|0);
              if ($795) {
               $R$0$i$i$lcssa = $R$0$i$i;$RP$0$i$i$lcssa = $RP$0$i$i;
               break;
              } else {
               $R$0$i$i = $794;$RP$0$i$i = $793;
              }
             }
             $796 = ($RP$0$i$i$lcssa>>>0)<($755>>>0);
             if ($796) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i$lcssa>>2] = 0;
              $R$1$i$i = $R$0$i$i$lcssa;
              break;
             }
            } else {
             $$sum3536$i$i = $719 | 8;
             $$sum117$i = (($$sum3536$i$i) + ($tsize$254$i))|0;
             $775 = (($tbase$255$i) + ($$sum117$i)|0);
             $776 = HEAP32[$775>>2]|0;
             $777 = ($776>>>0)<($755>>>0);
             if ($777) {
              _abort();
              // unreachable;
             }
             $778 = ((($776)) + 12|0);
             $779 = HEAP32[$778>>2]|0;
             $780 = ($779|0)==($720|0);
             if (!($780)) {
              _abort();
              // unreachable;
             }
             $781 = ((($773)) + 8|0);
             $782 = HEAP32[$781>>2]|0;
             $783 = ($782|0)==($720|0);
             if ($783) {
              HEAP32[$778>>2] = $773;
              HEAP32[$781>>2] = $776;
              $R$1$i$i = $773;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $797 = ($771|0)==(0|0);
           if ($797) {
            break;
           }
           $$sum30$i$i = (($tsize$254$i) + 28)|0;
           $$sum118$i = (($$sum30$i$i) + ($719))|0;
           $798 = (($tbase$255$i) + ($$sum118$i)|0);
           $799 = HEAP32[$798>>2]|0;
           $800 = (16680 + ($799<<2)|0);
           $801 = HEAP32[$800>>2]|0;
           $802 = ($720|0)==($801|0);
           do {
            if ($802) {
             HEAP32[$800>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $803 = 1 << $799;
             $804 = $803 ^ -1;
             $805 = HEAP32[(16380)>>2]|0;
             $806 = $805 & $804;
             HEAP32[(16380)>>2] = $806;
             break L331;
            } else {
             $807 = HEAP32[(16392)>>2]|0;
             $808 = ($771>>>0)<($807>>>0);
             if ($808) {
              _abort();
              // unreachable;
             }
             $809 = ((($771)) + 16|0);
             $810 = HEAP32[$809>>2]|0;
             $811 = ($810|0)==($720|0);
             if ($811) {
              HEAP32[$809>>2] = $R$1$i$i;
             } else {
              $812 = ((($771)) + 20|0);
              HEAP32[$812>>2] = $R$1$i$i;
             }
             $813 = ($R$1$i$i|0)==(0|0);
             if ($813) {
              break L331;
             }
            }
           } while(0);
           $814 = HEAP32[(16392)>>2]|0;
           $815 = ($R$1$i$i>>>0)<($814>>>0);
           if ($815) {
            _abort();
            // unreachable;
           }
           $816 = ((($R$1$i$i)) + 24|0);
           HEAP32[$816>>2] = $771;
           $$sum3132$i$i = $719 | 16;
           $$sum119$i = (($$sum3132$i$i) + ($tsize$254$i))|0;
           $817 = (($tbase$255$i) + ($$sum119$i)|0);
           $818 = HEAP32[$817>>2]|0;
           $819 = ($818|0)==(0|0);
           do {
            if (!($819)) {
             $820 = ($818>>>0)<($814>>>0);
             if ($820) {
              _abort();
              // unreachable;
             } else {
              $821 = ((($R$1$i$i)) + 16|0);
              HEAP32[$821>>2] = $818;
              $822 = ((($818)) + 24|0);
              HEAP32[$822>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum120$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $823 = (($tbase$255$i) + ($$sum120$i)|0);
           $824 = HEAP32[$823>>2]|0;
           $825 = ($824|0)==(0|0);
           if ($825) {
            break;
           }
           $826 = HEAP32[(16392)>>2]|0;
           $827 = ($824>>>0)<($826>>>0);
           if ($827) {
            _abort();
            // unreachable;
           } else {
            $828 = ((($R$1$i$i)) + 20|0);
            HEAP32[$828>>2] = $824;
            $829 = ((($824)) + 24|0);
            HEAP32[$829>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $744 | $719;
         $$sum121$i = (($$sum9$i$i) + ($tsize$254$i))|0;
         $830 = (($tbase$255$i) + ($$sum121$i)|0);
         $831 = (($744) + ($725))|0;
         $oldfirst$0$i$i = $830;$qsize$0$i$i = $831;
        } else {
         $oldfirst$0$i$i = $720;$qsize$0$i$i = $725;
        }
        $832 = ((($oldfirst$0$i$i)) + 4|0);
        $833 = HEAP32[$832>>2]|0;
        $834 = $833 & -2;
        HEAP32[$832>>2] = $834;
        $835 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $836 = (($tbase$255$i) + ($$sum10$i$i)|0);
        HEAP32[$836>>2] = $835;
        $$sum11$i$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $837 = (($tbase$255$i) + ($$sum11$i$i)|0);
        HEAP32[$837>>2] = $qsize$0$i$i;
        $838 = $qsize$0$i$i >>> 3;
        $839 = ($qsize$0$i$i>>>0)<(256);
        if ($839) {
         $840 = $838 << 1;
         $841 = (16416 + ($840<<2)|0);
         $842 = HEAP32[16376>>2]|0;
         $843 = 1 << $838;
         $844 = $842 & $843;
         $845 = ($844|0)==(0);
         do {
          if ($845) {
           $846 = $842 | $843;
           HEAP32[16376>>2] = $846;
           $$pre$i22$i = (($840) + 2)|0;
           $$pre56$i$i = (16416 + ($$pre$i22$i<<2)|0);
           $$pre$phi$i23$iZ2D = $$pre56$i$i;$F4$0$i$i = $841;
          } else {
           $$sum29$i$i = (($840) + 2)|0;
           $847 = (16416 + ($$sum29$i$i<<2)|0);
           $848 = HEAP32[$847>>2]|0;
           $849 = HEAP32[(16392)>>2]|0;
           $850 = ($848>>>0)<($849>>>0);
           if (!($850)) {
            $$pre$phi$i23$iZ2D = $847;$F4$0$i$i = $848;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i23$iZ2D>>2] = $724;
         $851 = ((($F4$0$i$i)) + 12|0);
         HEAP32[$851>>2] = $724;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $852 = (($tbase$255$i) + ($$sum27$i$i)|0);
         HEAP32[$852>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $853 = (($tbase$255$i) + ($$sum28$i$i)|0);
         HEAP32[$853>>2] = $841;
         break;
        }
        $854 = $qsize$0$i$i >>> 8;
        $855 = ($854|0)==(0);
        do {
         if ($855) {
          $I7$0$i$i = 0;
         } else {
          $856 = ($qsize$0$i$i>>>0)>(16777215);
          if ($856) {
           $I7$0$i$i = 31;
           break;
          }
          $857 = (($854) + 1048320)|0;
          $858 = $857 >>> 16;
          $859 = $858 & 8;
          $860 = $854 << $859;
          $861 = (($860) + 520192)|0;
          $862 = $861 >>> 16;
          $863 = $862 & 4;
          $864 = $863 | $859;
          $865 = $860 << $863;
          $866 = (($865) + 245760)|0;
          $867 = $866 >>> 16;
          $868 = $867 & 2;
          $869 = $864 | $868;
          $870 = (14 - ($869))|0;
          $871 = $865 << $868;
          $872 = $871 >>> 15;
          $873 = (($870) + ($872))|0;
          $874 = $873 << 1;
          $875 = (($873) + 7)|0;
          $876 = $qsize$0$i$i >>> $875;
          $877 = $876 & 1;
          $878 = $877 | $874;
          $I7$0$i$i = $878;
         }
        } while(0);
        $879 = (16680 + ($I7$0$i$i<<2)|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $880 = (($tbase$255$i) + ($$sum12$i$i)|0);
        HEAP32[$880>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $881 = (($tbase$255$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $882 = (($tbase$255$i) + ($$sum14$i$i)|0);
        HEAP32[$882>>2] = 0;
        HEAP32[$881>>2] = 0;
        $883 = HEAP32[(16380)>>2]|0;
        $884 = 1 << $I7$0$i$i;
        $885 = $883 & $884;
        $886 = ($885|0)==(0);
        if ($886) {
         $887 = $883 | $884;
         HEAP32[(16380)>>2] = $887;
         HEAP32[$879>>2] = $724;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $888 = (($tbase$255$i) + ($$sum15$i$i)|0);
         HEAP32[$888>>2] = $879;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $889 = (($tbase$255$i) + ($$sum16$i$i)|0);
         HEAP32[$889>>2] = $724;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $890 = (($tbase$255$i) + ($$sum17$i$i)|0);
         HEAP32[$890>>2] = $724;
         break;
        }
        $891 = HEAP32[$879>>2]|0;
        $892 = ((($891)) + 4|0);
        $893 = HEAP32[$892>>2]|0;
        $894 = $893 & -8;
        $895 = ($894|0)==($qsize$0$i$i|0);
        L417: do {
         if ($895) {
          $T$0$lcssa$i25$i = $891;
         } else {
          $896 = ($I7$0$i$i|0)==(31);
          $897 = $I7$0$i$i >>> 1;
          $898 = (25 - ($897))|0;
          $899 = $896 ? 0 : $898;
          $900 = $qsize$0$i$i << $899;
          $K8$051$i$i = $900;$T$050$i$i = $891;
          while(1) {
           $907 = $K8$051$i$i >>> 31;
           $908 = (((($T$050$i$i)) + 16|0) + ($907<<2)|0);
           $903 = HEAP32[$908>>2]|0;
           $909 = ($903|0)==(0|0);
           if ($909) {
            $$lcssa = $908;$T$050$i$i$lcssa = $T$050$i$i;
            break;
           }
           $901 = $K8$051$i$i << 1;
           $902 = ((($903)) + 4|0);
           $904 = HEAP32[$902>>2]|0;
           $905 = $904 & -8;
           $906 = ($905|0)==($qsize$0$i$i|0);
           if ($906) {
            $T$0$lcssa$i25$i = $903;
            break L417;
           } else {
            $K8$051$i$i = $901;$T$050$i$i = $903;
           }
          }
          $910 = HEAP32[(16392)>>2]|0;
          $911 = ($$lcssa>>>0)<($910>>>0);
          if ($911) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$$lcssa>>2] = $724;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $912 = (($tbase$255$i) + ($$sum23$i$i)|0);
           HEAP32[$912>>2] = $T$050$i$i$lcssa;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $913 = (($tbase$255$i) + ($$sum24$i$i)|0);
           HEAP32[$913>>2] = $724;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $914 = (($tbase$255$i) + ($$sum25$i$i)|0);
           HEAP32[$914>>2] = $724;
           break L324;
          }
         }
        } while(0);
        $915 = ((($T$0$lcssa$i25$i)) + 8|0);
        $916 = HEAP32[$915>>2]|0;
        $917 = HEAP32[(16392)>>2]|0;
        $918 = ($916>>>0)>=($917>>>0);
        $not$$i26$i = ($T$0$lcssa$i25$i>>>0)>=($917>>>0);
        $919 = $918 & $not$$i26$i;
        if ($919) {
         $920 = ((($916)) + 12|0);
         HEAP32[$920>>2] = $724;
         HEAP32[$915>>2] = $724;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $921 = (($tbase$255$i) + ($$sum20$i$i)|0);
         HEAP32[$921>>2] = $916;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $922 = (($tbase$255$i) + ($$sum21$i$i)|0);
         HEAP32[$922>>2] = $T$0$lcssa$i25$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $923 = (($tbase$255$i) + ($$sum22$i$i)|0);
         HEAP32[$923>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $711 | 8;
      $924 = (($tbase$255$i) + ($$sum1819$i$i)|0);
      $mem$0 = $924;
      return ($mem$0|0);
     } else {
      $sp$0$i$i$i = (16824);
     }
    }
    while(1) {
     $925 = HEAP32[$sp$0$i$i$i>>2]|0;
     $926 = ($925>>>0)>($635>>>0);
     if (!($926)) {
      $927 = ((($sp$0$i$i$i)) + 4|0);
      $928 = HEAP32[$927>>2]|0;
      $929 = (($925) + ($928)|0);
      $930 = ($929>>>0)>($635>>>0);
      if ($930) {
       $$lcssa215 = $925;$$lcssa216 = $928;$$lcssa217 = $929;
       break;
      }
     }
     $931 = ((($sp$0$i$i$i)) + 8|0);
     $932 = HEAP32[$931>>2]|0;
     $sp$0$i$i$i = $932;
    }
    $$sum$i14$i = (($$lcssa216) + -47)|0;
    $$sum1$i15$i = (($$lcssa216) + -39)|0;
    $933 = (($$lcssa215) + ($$sum1$i15$i)|0);
    $934 = $933;
    $935 = $934 & 7;
    $936 = ($935|0)==(0);
    $937 = (0 - ($934))|0;
    $938 = $937 & 7;
    $939 = $936 ? 0 : $938;
    $$sum2$i16$i = (($$sum$i14$i) + ($939))|0;
    $940 = (($$lcssa215) + ($$sum2$i16$i)|0);
    $941 = ((($635)) + 16|0);
    $942 = ($940>>>0)<($941>>>0);
    $943 = $942 ? $635 : $940;
    $944 = ((($943)) + 8|0);
    $945 = (($tsize$254$i) + -40)|0;
    $946 = ((($tbase$255$i)) + 8|0);
    $947 = $946;
    $948 = $947 & 7;
    $949 = ($948|0)==(0);
    $950 = (0 - ($947))|0;
    $951 = $950 & 7;
    $952 = $949 ? 0 : $951;
    $953 = (($tbase$255$i) + ($952)|0);
    $954 = (($945) - ($952))|0;
    HEAP32[(16400)>>2] = $953;
    HEAP32[(16388)>>2] = $954;
    $955 = $954 | 1;
    $$sum$i$i$i = (($952) + 4)|0;
    $956 = (($tbase$255$i) + ($$sum$i$i$i)|0);
    HEAP32[$956>>2] = $955;
    $$sum2$i$i$i = (($tsize$254$i) + -36)|0;
    $957 = (($tbase$255$i) + ($$sum2$i$i$i)|0);
    HEAP32[$957>>2] = 40;
    $958 = HEAP32[(16864)>>2]|0;
    HEAP32[(16404)>>2] = $958;
    $959 = ((($943)) + 4|0);
    HEAP32[$959>>2] = 27;
    ;HEAP32[$944>>2]=HEAP32[(16824)>>2]|0;HEAP32[$944+4>>2]=HEAP32[(16824)+4>>2]|0;HEAP32[$944+8>>2]=HEAP32[(16824)+8>>2]|0;HEAP32[$944+12>>2]=HEAP32[(16824)+12>>2]|0;
    HEAP32[(16824)>>2] = $tbase$255$i;
    HEAP32[(16828)>>2] = $tsize$254$i;
    HEAP32[(16836)>>2] = 0;
    HEAP32[(16832)>>2] = $944;
    $960 = ((($943)) + 28|0);
    HEAP32[$960>>2] = 7;
    $961 = ((($943)) + 32|0);
    $962 = ($961>>>0)<($$lcssa217>>>0);
    if ($962) {
     $964 = $960;
     while(1) {
      $963 = ((($964)) + 4|0);
      HEAP32[$963>>2] = 7;
      $965 = ((($964)) + 8|0);
      $966 = ($965>>>0)<($$lcssa217>>>0);
      if ($966) {
       $964 = $963;
      } else {
       break;
      }
     }
    }
    $967 = ($943|0)==($635|0);
    if (!($967)) {
     $968 = $943;
     $969 = $635;
     $970 = (($968) - ($969))|0;
     $971 = HEAP32[$959>>2]|0;
     $972 = $971 & -2;
     HEAP32[$959>>2] = $972;
     $973 = $970 | 1;
     $974 = ((($635)) + 4|0);
     HEAP32[$974>>2] = $973;
     HEAP32[$943>>2] = $970;
     $975 = $970 >>> 3;
     $976 = ($970>>>0)<(256);
     if ($976) {
      $977 = $975 << 1;
      $978 = (16416 + ($977<<2)|0);
      $979 = HEAP32[16376>>2]|0;
      $980 = 1 << $975;
      $981 = $979 & $980;
      $982 = ($981|0)==(0);
      if ($982) {
       $983 = $979 | $980;
       HEAP32[16376>>2] = $983;
       $$pre$i$i = (($977) + 2)|0;
       $$pre14$i$i = (16416 + ($$pre$i$i<<2)|0);
       $$pre$phi$i$iZ2D = $$pre14$i$i;$F$0$i$i = $978;
      } else {
       $$sum4$i$i = (($977) + 2)|0;
       $984 = (16416 + ($$sum4$i$i<<2)|0);
       $985 = HEAP32[$984>>2]|0;
       $986 = HEAP32[(16392)>>2]|0;
       $987 = ($985>>>0)<($986>>>0);
       if ($987) {
        _abort();
        // unreachable;
       } else {
        $$pre$phi$i$iZ2D = $984;$F$0$i$i = $985;
       }
      }
      HEAP32[$$pre$phi$i$iZ2D>>2] = $635;
      $988 = ((($F$0$i$i)) + 12|0);
      HEAP32[$988>>2] = $635;
      $989 = ((($635)) + 8|0);
      HEAP32[$989>>2] = $F$0$i$i;
      $990 = ((($635)) + 12|0);
      HEAP32[$990>>2] = $978;
      break;
     }
     $991 = $970 >>> 8;
     $992 = ($991|0)==(0);
     if ($992) {
      $I1$0$i$i = 0;
     } else {
      $993 = ($970>>>0)>(16777215);
      if ($993) {
       $I1$0$i$i = 31;
      } else {
       $994 = (($991) + 1048320)|0;
       $995 = $994 >>> 16;
       $996 = $995 & 8;
       $997 = $991 << $996;
       $998 = (($997) + 520192)|0;
       $999 = $998 >>> 16;
       $1000 = $999 & 4;
       $1001 = $1000 | $996;
       $1002 = $997 << $1000;
       $1003 = (($1002) + 245760)|0;
       $1004 = $1003 >>> 16;
       $1005 = $1004 & 2;
       $1006 = $1001 | $1005;
       $1007 = (14 - ($1006))|0;
       $1008 = $1002 << $1005;
       $1009 = $1008 >>> 15;
       $1010 = (($1007) + ($1009))|0;
       $1011 = $1010 << 1;
       $1012 = (($1010) + 7)|0;
       $1013 = $970 >>> $1012;
       $1014 = $1013 & 1;
       $1015 = $1014 | $1011;
       $I1$0$i$i = $1015;
      }
     }
     $1016 = (16680 + ($I1$0$i$i<<2)|0);
     $1017 = ((($635)) + 28|0);
     HEAP32[$1017>>2] = $I1$0$i$i;
     $1018 = ((($635)) + 20|0);
     HEAP32[$1018>>2] = 0;
     HEAP32[$941>>2] = 0;
     $1019 = HEAP32[(16380)>>2]|0;
     $1020 = 1 << $I1$0$i$i;
     $1021 = $1019 & $1020;
     $1022 = ($1021|0)==(0);
     if ($1022) {
      $1023 = $1019 | $1020;
      HEAP32[(16380)>>2] = $1023;
      HEAP32[$1016>>2] = $635;
      $1024 = ((($635)) + 24|0);
      HEAP32[$1024>>2] = $1016;
      $1025 = ((($635)) + 12|0);
      HEAP32[$1025>>2] = $635;
      $1026 = ((($635)) + 8|0);
      HEAP32[$1026>>2] = $635;
      break;
     }
     $1027 = HEAP32[$1016>>2]|0;
     $1028 = ((($1027)) + 4|0);
     $1029 = HEAP32[$1028>>2]|0;
     $1030 = $1029 & -8;
     $1031 = ($1030|0)==($970|0);
     L459: do {
      if ($1031) {
       $T$0$lcssa$i$i = $1027;
      } else {
       $1032 = ($I1$0$i$i|0)==(31);
       $1033 = $I1$0$i$i >>> 1;
       $1034 = (25 - ($1033))|0;
       $1035 = $1032 ? 0 : $1034;
       $1036 = $970 << $1035;
       $K2$07$i$i = $1036;$T$06$i$i = $1027;
       while(1) {
        $1043 = $K2$07$i$i >>> 31;
        $1044 = (((($T$06$i$i)) + 16|0) + ($1043<<2)|0);
        $1039 = HEAP32[$1044>>2]|0;
        $1045 = ($1039|0)==(0|0);
        if ($1045) {
         $$lcssa211 = $1044;$T$06$i$i$lcssa = $T$06$i$i;
         break;
        }
        $1037 = $K2$07$i$i << 1;
        $1038 = ((($1039)) + 4|0);
        $1040 = HEAP32[$1038>>2]|0;
        $1041 = $1040 & -8;
        $1042 = ($1041|0)==($970|0);
        if ($1042) {
         $T$0$lcssa$i$i = $1039;
         break L459;
        } else {
         $K2$07$i$i = $1037;$T$06$i$i = $1039;
        }
       }
       $1046 = HEAP32[(16392)>>2]|0;
       $1047 = ($$lcssa211>>>0)<($1046>>>0);
       if ($1047) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$$lcssa211>>2] = $635;
        $1048 = ((($635)) + 24|0);
        HEAP32[$1048>>2] = $T$06$i$i$lcssa;
        $1049 = ((($635)) + 12|0);
        HEAP32[$1049>>2] = $635;
        $1050 = ((($635)) + 8|0);
        HEAP32[$1050>>2] = $635;
        break L299;
       }
      }
     } while(0);
     $1051 = ((($T$0$lcssa$i$i)) + 8|0);
     $1052 = HEAP32[$1051>>2]|0;
     $1053 = HEAP32[(16392)>>2]|0;
     $1054 = ($1052>>>0)>=($1053>>>0);
     $not$$i$i = ($T$0$lcssa$i$i>>>0)>=($1053>>>0);
     $1055 = $1054 & $not$$i$i;
     if ($1055) {
      $1056 = ((($1052)) + 12|0);
      HEAP32[$1056>>2] = $635;
      HEAP32[$1051>>2] = $635;
      $1057 = ((($635)) + 8|0);
      HEAP32[$1057>>2] = $1052;
      $1058 = ((($635)) + 12|0);
      HEAP32[$1058>>2] = $T$0$lcssa$i$i;
      $1059 = ((($635)) + 24|0);
      HEAP32[$1059>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1060 = HEAP32[(16388)>>2]|0;
  $1061 = ($1060>>>0)>($nb$0>>>0);
  if ($1061) {
   $1062 = (($1060) - ($nb$0))|0;
   HEAP32[(16388)>>2] = $1062;
   $1063 = HEAP32[(16400)>>2]|0;
   $1064 = (($1063) + ($nb$0)|0);
   HEAP32[(16400)>>2] = $1064;
   $1065 = $1062 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1066 = (($1063) + ($$sum$i32)|0);
   HEAP32[$1066>>2] = $1065;
   $1067 = $nb$0 | 3;
   $1068 = ((($1063)) + 4|0);
   HEAP32[$1068>>2] = $1067;
   $1069 = ((($1063)) + 8|0);
   $mem$0 = $1069;
   return ($mem$0|0);
  }
 }
 $1070 = (___errno_location()|0);
 HEAP32[$1070>>2] = 12;
 $mem$0 = 0;
 return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$lcssa = 0, $$pre = 0, $$pre$phi59Z2D = 0, $$pre$phi61Z2D = 0, $$pre$phiZ2D = 0, $$pre57 = 0, $$pre58 = 0, $$pre60 = 0, $$sum = 0, $$sum11 = 0, $$sum12 = 0, $$sum13 = 0, $$sum14 = 0, $$sum1718 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum22 = 0, $$sum23 = 0, $$sum24 = 0;
 var $$sum25 = 0, $$sum26 = 0, $$sum27 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0, $$sum31 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0;
 var $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0;
 var $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0;
 var $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0;
 var $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0;
 var $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0;
 var $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0;
 var $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0;
 var $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0;
 var $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0;
 var $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0;
 var $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $K19$052 = 0, $R$0 = 0, $R$0$lcssa = 0, $R$1 = 0;
 var $R7$0 = 0, $R7$0$lcssa = 0, $R7$1 = 0, $RP$0 = 0, $RP$0$lcssa = 0, $RP9$0 = 0, $RP9$0$lcssa = 0, $T$0$lcssa = 0, $T$051 = 0, $T$051$lcssa = 0, $cond = 0, $cond47 = 0, $not$ = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = ((($mem)) + -8|0);
 $2 = HEAP32[(16392)>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = ((($mem)) + -4|0);
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
    return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[(16396)>>2]|0;
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
    HEAP32[(16384)>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum20 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum20)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum30 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum30)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum31 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum31)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = (16416 + ($25<<2)|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = ((($22)) + 12|0);
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
     $35 = HEAP32[16376>>2]|0;
     $36 = $35 & $34;
     HEAP32[16376>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre60 = ((($24)) + 8|0);
     $$pre$phi61Z2D = $$pre60;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = ((($24)) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi61Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = ((($22)) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi61Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum22 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum22)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum23 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum23)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum25 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum25)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum24 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum24)|0);
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
      $63 = ((($R$0)) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = ((($R$0)) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       $R$0$lcssa = $R$0;$RP$0$lcssa = $RP$0;
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0$lcssa>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0$lcssa>>2] = 0;
      $R$1 = $R$0$lcssa;
      break;
     }
    } else {
     $$sum29 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum29)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = ((($49)) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = ((($46)) + 8|0);
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
    $$sum26 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum26)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = (16680 + ($72<<2)|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[(16380)>>2]|0;
      $79 = $78 & $77;
      HEAP32[(16380)>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[(16392)>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = ((($44)) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = ((($44)) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[(16392)>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = ((($R$1)) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum27 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum27)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = ((($R$1)) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = ((($91)) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum28 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum28)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[(16392)>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = ((($R$1)) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = ((($97)) + 24|0);
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
 $$sum19 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum19)|0);
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
  $117 = HEAP32[(16400)>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[(16388)>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[(16388)>>2] = $120;
   HEAP32[(16400)>>2] = $p$0;
   $121 = $120 | 1;
   $122 = ((($p$0)) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[(16396)>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    return;
   }
   HEAP32[(16396)>>2] = 0;
   HEAP32[(16384)>>2] = 0;
   return;
  }
  $125 = HEAP32[(16396)>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[(16384)>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[(16384)>>2] = $128;
   HEAP32[(16396)>>2] = $p$0;
   $129 = $128 | 1;
   $130 = ((($p$0)) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum1718 = $8 | 4;
    $138 = (($mem) + ($$sum1718)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = (16416 + ($140<<2)|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[(16392)>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = ((($137)) + 12|0);
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
     $151 = HEAP32[16376>>2]|0;
     $152 = $151 & $150;
     HEAP32[16376>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre58 = ((($139)) + 8|0);
     $$pre$phi59Z2D = $$pre58;
    } else {
     $154 = HEAP32[(16392)>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = ((($139)) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi59Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = ((($137)) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi59Z2D>>2] = $137;
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
       $181 = ((($R7$0)) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if (!($183)) {
        $R7$0 = $182;$RP9$0 = $181;
        continue;
       }
       $184 = ((($R7$0)) + 16|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if ($186) {
        $R7$0$lcssa = $R7$0;$RP9$0$lcssa = $RP9$0;
        break;
       } else {
        $R7$0 = $185;$RP9$0 = $184;
       }
      }
      $187 = HEAP32[(16392)>>2]|0;
      $188 = ($RP9$0$lcssa>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0$lcssa>>2] = 0;
       $R7$1 = $R7$0$lcssa;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[(16392)>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = ((($166)) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = ((($163)) + 8|0);
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
     $$sum12 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum12)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = (16680 + ($191<<2)|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond47 = ($R7$1|0)==(0|0);
      if ($cond47) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[(16380)>>2]|0;
       $198 = $197 & $196;
       HEAP32[(16380)>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[(16392)>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = ((($161)) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = ((($161)) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[(16392)>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = ((($R7$1)) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum13 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum13)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = ((($R7$1)) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = ((($210)) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum14 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum14)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[(16392)>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = ((($R7$1)) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = ((($216)) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = ((($p$0)) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[(16396)>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[(16384)>>2] = $133;
   return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = ((($p$0)) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = (16416 + ($233<<2)|0);
  $235 = HEAP32[16376>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[16376>>2] = $239;
   $$pre = (($233) + 2)|0;
   $$pre57 = (16416 + ($$pre<<2)|0);
   $$pre$phiZ2D = $$pre57;$F16$0 = $234;
  } else {
   $$sum11 = (($233) + 2)|0;
   $240 = (16416 + ($$sum11<<2)|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[(16392)>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = ((($F16$0)) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = ((($p$0)) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = ((($p$0)) + 12|0);
  HEAP32[$246>>2] = $234;
  return;
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
 $272 = (16680 + ($I18$0<<2)|0);
 $273 = ((($p$0)) + 28|0);
 HEAP32[$273>>2] = $I18$0;
 $274 = ((($p$0)) + 16|0);
 $275 = ((($p$0)) + 20|0);
 HEAP32[$275>>2] = 0;
 HEAP32[$274>>2] = 0;
 $276 = HEAP32[(16380)>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L199: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[(16380)>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = ((($p$0)) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = ((($p$0)) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = ((($p$0)) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ((($284)) + 4|0);
   $286 = HEAP32[$285>>2]|0;
   $287 = $286 & -8;
   $288 = ($287|0)==($psize$1|0);
   L202: do {
    if ($288) {
     $T$0$lcssa = $284;
    } else {
     $289 = ($I18$0|0)==(31);
     $290 = $I18$0 >>> 1;
     $291 = (25 - ($290))|0;
     $292 = $289 ? 0 : $291;
     $293 = $psize$1 << $292;
     $K19$052 = $293;$T$051 = $284;
     while(1) {
      $300 = $K19$052 >>> 31;
      $301 = (((($T$051)) + 16|0) + ($300<<2)|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       $$lcssa = $301;$T$051$lcssa = $T$051;
       break;
      }
      $294 = $K19$052 << 1;
      $295 = ((($296)) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $T$0$lcssa = $296;
       break L202;
      } else {
       $K19$052 = $294;$T$051 = $296;
      }
     }
     $303 = HEAP32[(16392)>>2]|0;
     $304 = ($$lcssa>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$$lcssa>>2] = $p$0;
      $305 = ((($p$0)) + 24|0);
      HEAP32[$305>>2] = $T$051$lcssa;
      $306 = ((($p$0)) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = ((($p$0)) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $308 = ((($T$0$lcssa)) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[(16392)>>2]|0;
   $311 = ($309>>>0)>=($310>>>0);
   $not$ = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = $311 & $not$;
   if ($312) {
    $313 = ((($309)) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = ((($p$0)) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = ((($p$0)) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = ((($p$0)) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[(16408)>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[(16408)>>2] = $318;
 $319 = ($318|0)==(0);
 if ($319) {
  $sp$0$in$i = (16832);
 } else {
  return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = ((($sp$0$i)) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[(16408)>>2] = -1;
 return;
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
  return ($6|0);
 }
 $8 = ((($6)) + -4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = $9 & 3;
 $11 = ($10|0)==(0);
 if ($11) {
  return ($6|0);
 }
 _memset(($6|0),0,($req$0|0))|0;
 return ($6|0);
}
function _realloc($oldmem,$bytes) {
 $oldmem = $oldmem|0;
 $bytes = $bytes|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $mem$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($oldmem|0)==(0|0);
 if ($0) {
  $1 = (_malloc($bytes)|0);
  $mem$0 = $1;
  return ($mem$0|0);
 }
 $2 = ($bytes>>>0)>(4294967231);
 if ($2) {
  $3 = (___errno_location()|0);
  HEAP32[$3>>2] = 12;
  $mem$0 = 0;
  return ($mem$0|0);
 }
 $4 = ($bytes>>>0)<(11);
 $5 = (($bytes) + 11)|0;
 $6 = $5 & -8;
 $7 = $4 ? 16 : $6;
 $8 = ((($oldmem)) + -8|0);
 $9 = (_try_realloc_chunk($8,$7)|0);
 $10 = ($9|0)==(0|0);
 if (!($10)) {
  $11 = ((($9)) + 8|0);
  $mem$0 = $11;
  return ($mem$0|0);
 }
 $12 = (_malloc($bytes)|0);
 $13 = ($12|0)==(0|0);
 if ($13) {
  $mem$0 = 0;
  return ($mem$0|0);
 }
 $14 = ((($oldmem)) + -4|0);
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
 return ($mem$0|0);
}
function _realloc_in_place($oldmem,$bytes) {
 $oldmem = $oldmem|0;
 $bytes = $bytes|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $oldmem$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($oldmem|0)==(0|0);
 if ($0) {
  return (0|0);
 }
 $1 = ($bytes>>>0)>(4294967231);
 if (!($1)) {
  $3 = ($bytes>>>0)<(11);
  $4 = (($bytes) + 11)|0;
  $5 = $4 & -8;
  $6 = $3 ? 16 : $5;
  $7 = ((($oldmem)) + -8|0);
  $8 = (_try_realloc_chunk($7,$6)|0);
  $9 = ($8|0)==($7|0);
  $oldmem$ = $9 ? $oldmem : 0;
  return ($oldmem$|0);
 }
 $2 = (___errno_location()|0);
 HEAP32[$2>>2] = 12;
 return (0|0);
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
  return ($$0|0);
 } else {
  $2 = (_internal_memalign($alignment,$bytes)|0);
  $$0 = $2;
  return ($$0|0);
 }
 return (0)|0;
}
function _posix_memalign($pp,$alignment,$bytes) {
 $pp = $pp|0;
 $alignment = $alignment|0;
 $bytes = $bytes|0;
 var $$0 = 0, $$alignment = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $mem$0 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($alignment|0)==(8);
 do {
  if ($0) {
   $1 = (_malloc($bytes)|0);
   $mem$0 = $1;
  } else {
   $2 = $alignment >>> 2;
   $3 = $alignment & 3;
   $4 = ($3|0)!=(0);
   $5 = ($2|0)==(0);
   $or$cond = $4 | $5;
   if ($or$cond) {
    $$0 = 22;
    return ($$0|0);
   }
   $6 = (($2) + 1073741823)|0;
   $7 = $6 & $2;
   $8 = ($7|0)==(0);
   if (!($8)) {
    $$0 = 22;
    return ($$0|0);
   }
   $9 = (-64 - ($alignment))|0;
   $10 = ($9>>>0)<($bytes>>>0);
   if ($10) {
    $$0 = 12;
    return ($$0|0);
   } else {
    $11 = ($alignment>>>0)<(16);
    $$alignment = $11 ? 16 : $alignment;
    $12 = (_internal_memalign($$alignment,$bytes)|0);
    $mem$0 = $12;
    break;
   }
  }
 } while(0);
 $13 = ($mem$0|0)==(0|0);
 if ($13) {
  $$0 = 12;
  return ($$0|0);
 }
 HEAP32[$pp>>2] = $mem$0;
 $$0 = 0;
 return ($$0|0);
}
function _valloc($bytes) {
 $bytes = $bytes|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[16848>>2]|0;
 $1 = ($0|0)==(0);
 if (!($1)) {
  $9 = HEAP32[(16852)>>2]|0;
  $10 = (_memalign($9,$bytes)|0);
  return ($10|0);
 }
 $2 = (_sysconf(30)|0);
 $3 = (($2) + -1)|0;
 $4 = $3 & $2;
 $5 = ($4|0)==(0);
 if (!($5)) {
  _abort();
  // unreachable;
 }
 HEAP32[(16856)>>2] = $2;
 HEAP32[(16852)>>2] = $2;
 HEAP32[(16860)>>2] = -1;
 HEAP32[(16864)>>2] = -1;
 HEAP32[(16868)>>2] = 0;
 HEAP32[(16820)>>2] = 0;
 $6 = (_time((0|0))|0);
 $7 = $6 & -16;
 $8 = $7 ^ 1431655768;
 HEAP32[16848>>2] = $8;
 $9 = HEAP32[(16852)>>2]|0;
 $10 = (_memalign($9,$bytes)|0);
 return ($10|0);
}
function _pvalloc($bytes) {
 $bytes = $bytes|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[16848>>2]|0;
 $1 = ($0|0)==(0);
 do {
  if ($1) {
   $2 = (_sysconf(30)|0);
   $3 = (($2) + -1)|0;
   $4 = $3 & $2;
   $5 = ($4|0)==(0);
   if ($5) {
    HEAP32[(16856)>>2] = $2;
    HEAP32[(16852)>>2] = $2;
    HEAP32[(16860)>>2] = -1;
    HEAP32[(16864)>>2] = -1;
    HEAP32[(16868)>>2] = 0;
    HEAP32[(16820)>>2] = 0;
    $6 = (_time((0|0))|0);
    $7 = $6 & -16;
    $8 = $7 ^ 1431655768;
    HEAP32[16848>>2] = $8;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $9 = HEAP32[(16852)>>2]|0;
 $10 = (($bytes) + -1)|0;
 $11 = (($10) + ($9))|0;
 $12 = (0 - ($9))|0;
 $13 = $11 & $12;
 $14 = (_memalign($9,$13)|0);
 return ($14|0);
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
 return ($0|0);
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
  return 0;
 } else {
  $a$06$i = $array;
 }
 L3: while(1) {
  $2 = HEAP32[$a$06$i>>2]|0;
  $3 = ($2|0)==(0|0);
  do {
   if ($3) {
    $$pre$i = ((($a$06$i)) + 4|0);
    $$pre$phi$iZ2D = $$pre$i;
   } else {
    $4 = ((($2)) + -8|0);
    $5 = ((($2)) + -4|0);
    $6 = HEAP32[$5>>2]|0;
    $7 = $6 & -8;
    HEAP32[$a$06$i>>2] = 0;
    $8 = HEAP32[(16392)>>2]|0;
    $9 = ($4>>>0)<($8>>>0);
    $10 = $6 & 3;
    $11 = ($10|0)==(1);
    $or$cond$i = $9 | $11;
    if ($or$cond$i) {
     label = 9;
     break L3;
    }
    $12 = ((($a$06$i)) + 4|0);
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
  return 0;
 }
 return (0)|0;
}
function _malloc_trim($pad) {
 $pad = $pad|0;
 var $$$i = 0, $$lcssa = 0, $$lcssa6 = 0, $$sum$i$i = 0, $$sum2$i$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0;
 var $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0;
 var $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $8 = 0, $9 = 0, $or$cond$i = 0, $released$2$i = 0;
 var $sp$0$i$i = 0, $sp$0$i$i$lcssa = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[16848>>2]|0;
 $1 = ($0|0)==(0);
 do {
  if ($1) {
   $2 = (_sysconf(30)|0);
   $3 = (($2) + -1)|0;
   $4 = $3 & $2;
   $5 = ($4|0)==(0);
   if ($5) {
    HEAP32[(16856)>>2] = $2;
    HEAP32[(16852)>>2] = $2;
    HEAP32[(16860)>>2] = -1;
    HEAP32[(16864)>>2] = -1;
    HEAP32[(16868)>>2] = 0;
    HEAP32[(16820)>>2] = 0;
    $6 = (_time((0|0))|0);
    $7 = $6 & -16;
    $8 = $7 ^ 1431655768;
    HEAP32[16848>>2] = $8;
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
  return ($released$2$i|0);
 }
 $10 = HEAP32[(16400)>>2]|0;
 $11 = ($10|0)==(0|0);
 if ($11) {
  $released$2$i = 0;
  return ($released$2$i|0);
 }
 $12 = (($pad) + 40)|0;
 $13 = HEAP32[(16388)>>2]|0;
 $14 = ($13>>>0)>($12>>>0);
 if ($14) {
  $15 = HEAP32[(16856)>>2]|0;
  $16 = (-41 - ($pad))|0;
  $17 = (($16) + ($13))|0;
  $18 = (($17) + ($15))|0;
  $19 = (($18>>>0) / ($15>>>0))&-1;
  $sp$0$i$i = (16824);
  while(1) {
   $20 = HEAP32[$sp$0$i$i>>2]|0;
   $21 = ($20>>>0)>($10>>>0);
   if (!($21)) {
    $22 = ((($sp$0$i$i)) + 4|0);
    $23 = HEAP32[$22>>2]|0;
    $24 = (($20) + ($23)|0);
    $25 = ($24>>>0)>($10>>>0);
    if ($25) {
     $$lcssa = $sp$0$i$i;$$lcssa6 = $22;$sp$0$i$i$lcssa = $sp$0$i$i;
     break;
    }
   }
   $26 = ((($sp$0$i$i)) + 8|0);
   $27 = HEAP32[$26>>2]|0;
   $sp$0$i$i = $27;
  }
  $28 = (($19) + -1)|0;
  $29 = Math_imul($28, $15)|0;
  $30 = ((($sp$0$i$i$lcssa)) + 12|0);
  $31 = HEAP32[$30>>2]|0;
  $32 = $31 & 8;
  $33 = ($32|0)==(0);
  if ($33) {
   $34 = (_sbrk(0)|0);
   $35 = HEAP32[$$lcssa>>2]|0;
   $36 = HEAP32[$$lcssa6>>2]|0;
   $37 = (($35) + ($36)|0);
   $38 = ($34|0)==($37|0);
   if ($38) {
    $39 = ($29>>>0)>(2147483646);
    $40 = (-2147483648 - ($15))|0;
    $$$i = $39 ? $40 : $29;
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
      $50 = HEAP32[$$lcssa6>>2]|0;
      $51 = (($50) - ($48))|0;
      HEAP32[$$lcssa6>>2] = $51;
      $52 = HEAP32[(16808)>>2]|0;
      $53 = (($52) - ($48))|0;
      HEAP32[(16808)>>2] = $53;
      $54 = HEAP32[(16400)>>2]|0;
      $55 = HEAP32[(16388)>>2]|0;
      $56 = (($55) - ($48))|0;
      $57 = ((($54)) + 8|0);
      $58 = $57;
      $59 = $58 & 7;
      $60 = ($59|0)==(0);
      $61 = (0 - ($58))|0;
      $62 = $61 & 7;
      $63 = $60 ? 0 : $62;
      $64 = (($54) + ($63)|0);
      $65 = (($56) - ($63))|0;
      HEAP32[(16400)>>2] = $64;
      HEAP32[(16388)>>2] = $65;
      $66 = $65 | 1;
      $$sum$i$i = (($63) + 4)|0;
      $67 = (($54) + ($$sum$i$i)|0);
      HEAP32[$67>>2] = $66;
      $$sum2$i$i = (($56) + 4)|0;
      $68 = (($54) + ($$sum2$i$i)|0);
      HEAP32[$68>>2] = 40;
      $69 = HEAP32[(16864)>>2]|0;
      HEAP32[(16404)>>2] = $69;
      $released$2$i = 1;
      return ($released$2$i|0);
     }
    }
   }
  }
 }
 $70 = HEAP32[(16388)>>2]|0;
 $71 = HEAP32[(16404)>>2]|0;
 $72 = ($70>>>0)>($71>>>0);
 if (!($72)) {
  $released$2$i = 0;
  return ($released$2$i|0);
 }
 HEAP32[(16404)>>2] = -1;
 $released$2$i = 0;
 return ($released$2$i|0);
}
function _malloc_footprint() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[(16808)>>2]|0;
 return ($0|0);
}
function _malloc_max_footprint() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[(16812)>>2]|0;
 return ($0|0);
}
function _malloc_footprint_limit() {
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[(16816)>>2]|0;
 $1 = ($0|0)==(0);
 $2 = $1 ? -1 : $0;
 return ($2|0);
}
function _malloc_set_footprint_limit($bytes) {
 $bytes = $bytes|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $result$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes|0)==(-1);
 if ($0) {
  $result$0 = 0;
 } else {
  $1 = HEAP32[(16856)>>2]|0;
  $2 = (($bytes) + -1)|0;
  $3 = (($2) + ($1))|0;
  $4 = (0 - ($1))|0;
  $5 = $3 & $4;
  $result$0 = $5;
 }
 HEAP32[(16816)>>2] = $result$0;
 return ($result$0|0);
}
function _mallinfo($agg$result) {
 $agg$result = $agg$result|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $mfree$017$i = 0, $mfree$1$lcssa$i = 0, $mfree$1$lcssa$i$lcssa = 0;
 var $mfree$13$i = 0, $mfree$2$i = 0, $nfree$016$i = 0, $nfree$1$lcssa$i = 0, $nfree$1$lcssa$i$lcssa = 0, $nfree$12$i = 0, $nfree$2$i = 0, $nm$sroa$0$0$i = 0, $nm$sroa$10$0$i = 0, $nm$sroa$5$0$i = 0, $nm$sroa$63$0$i = 0, $nm$sroa$7$0$i = 0, $nm$sroa$84$0$i = 0, $nm$sroa$9$0$i = 0, $or$cond$i = 0, $q$0$in5$i = 0, $s$019$i = 0, $sum$018$i = 0, $sum$1$lcssa$i = 0, $sum$1$lcssa$i$lcssa = 0;
 var $sum$14$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[16848>>2]|0;
 $1 = ($0|0)==(0);
 do {
  if ($1) {
   $2 = (_sysconf(30)|0);
   $3 = (($2) + -1)|0;
   $4 = $3 & $2;
   $5 = ($4|0)==(0);
   if ($5) {
    HEAP32[(16856)>>2] = $2;
    HEAP32[(16852)>>2] = $2;
    HEAP32[(16860)>>2] = -1;
    HEAP32[(16864)>>2] = -1;
    HEAP32[(16868)>>2] = 0;
    HEAP32[(16820)>>2] = 0;
    $6 = (_time((0|0))|0);
    $7 = $6 & -16;
    $8 = $7 ^ 1431655768;
    HEAP32[16848>>2] = $8;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $9 = HEAP32[(16400)>>2]|0;
 $10 = ($9|0)==(0|0);
 if ($10) {
  $nm$sroa$0$0$i = 0;$nm$sroa$10$0$i = 0;$nm$sroa$5$0$i = 0;$nm$sroa$63$0$i = 0;$nm$sroa$7$0$i = 0;$nm$sroa$84$0$i = 0;$nm$sroa$9$0$i = 0;
 } else {
  $11 = HEAP32[(16388)>>2]|0;
  $12 = (($11) + 40)|0;
  $mfree$017$i = $12;$nfree$016$i = 1;$s$019$i = (16824);$sum$018$i = $12;
  while(1) {
   $13 = HEAP32[$s$019$i>>2]|0;
   $14 = ((($13)) + 8|0);
   $15 = $14;
   $16 = $15 & 7;
   $17 = ($16|0)==(0);
   $18 = (0 - ($15))|0;
   $19 = $18 & 7;
   $20 = $17 ? 0 : $19;
   $21 = (($13) + ($20)|0);
   $22 = ((($s$019$i)) + 4|0);
   $23 = HEAP32[$22>>2]|0;
   $24 = (($13) + ($23)|0);
   $mfree$13$i = $mfree$017$i;$nfree$12$i = $nfree$016$i;$q$0$in5$i = $21;$sum$14$i = $sum$018$i;
   while(1) {
    $25 = ($q$0$in5$i>>>0)>=($24>>>0);
    $26 = ($q$0$in5$i|0)==($9|0);
    $or$cond$i = $25 | $26;
    if ($or$cond$i) {
     $mfree$1$lcssa$i = $mfree$13$i;$nfree$1$lcssa$i = $nfree$12$i;$sum$1$lcssa$i = $sum$14$i;
     break;
    }
    $27 = ((($q$0$in5$i)) + 4|0);
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
    $34 = $33&1;
    $nfree$2$i = (($34) + ($nfree$12$i))|0;
    $35 = $33 ? $30 : 0;
    $mfree$2$i = (($35) + ($mfree$13$i))|0;
    $36 = (($q$0$in5$i) + ($30)|0);
    $37 = ($36>>>0)<($13>>>0);
    if ($37) {
     $mfree$1$lcssa$i = $mfree$2$i;$nfree$1$lcssa$i = $nfree$2$i;$sum$1$lcssa$i = $31;
     break;
    } else {
     $mfree$13$i = $mfree$2$i;$nfree$12$i = $nfree$2$i;$q$0$in5$i = $36;$sum$14$i = $31;
    }
   }
   $38 = ((($s$019$i)) + 8|0);
   $39 = HEAP32[$38>>2]|0;
   $40 = ($39|0)==(0|0);
   if ($40) {
    $mfree$1$lcssa$i$lcssa = $mfree$1$lcssa$i;$nfree$1$lcssa$i$lcssa = $nfree$1$lcssa$i;$sum$1$lcssa$i$lcssa = $sum$1$lcssa$i;
    break;
   } else {
    $mfree$017$i = $mfree$1$lcssa$i;$nfree$016$i = $nfree$1$lcssa$i;$s$019$i = $39;$sum$018$i = $sum$1$lcssa$i;
   }
  }
  $41 = HEAP32[(16808)>>2]|0;
  $42 = (($41) - ($sum$1$lcssa$i$lcssa))|0;
  $43 = HEAP32[(16812)>>2]|0;
  $44 = (($41) - ($mfree$1$lcssa$i$lcssa))|0;
  $nm$sroa$0$0$i = $sum$1$lcssa$i$lcssa;$nm$sroa$10$0$i = $11;$nm$sroa$5$0$i = $nfree$1$lcssa$i$lcssa;$nm$sroa$63$0$i = $42;$nm$sroa$7$0$i = $43;$nm$sroa$84$0$i = $44;$nm$sroa$9$0$i = $mfree$1$lcssa$i$lcssa;
 }
 HEAP32[$agg$result>>2] = $nm$sroa$0$0$i;
 $45 = ((($agg$result)) + 4|0);
 HEAP32[$45>>2] = $nm$sroa$5$0$i;
 $46 = ((($agg$result)) + 8|0);
 $47 = $46;
 $48 = $47;
 HEAP32[$48>>2] = 0;
 $49 = (($47) + 4)|0;
 $50 = $49;
 HEAP32[$50>>2] = 0;
 $51 = ((($agg$result)) + 16|0);
 HEAP32[$51>>2] = $nm$sroa$63$0$i;
 $52 = ((($agg$result)) + 20|0);
 HEAP32[$52>>2] = $nm$sroa$7$0$i;
 $53 = ((($agg$result)) + 24|0);
 HEAP32[$53>>2] = 0;
 $54 = ((($agg$result)) + 28|0);
 HEAP32[$54>>2] = $nm$sroa$84$0$i;
 $55 = ((($agg$result)) + 32|0);
 HEAP32[$55>>2] = $nm$sroa$9$0$i;
 $56 = ((($agg$result)) + 36|0);
 HEAP32[$56>>2] = $nm$sroa$10$0$i;
 return;
}
function _malloc_stats() {
 var $$neg2$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $fp$0$i = 0, $maxfp$0$i = 0, $or$cond$i = 0, $q$0$in4$i = 0, $s$010$i = 0, $used$09$i = 0, $used$1$lcssa$i = 0, $used$13$i = 0, $used$2$i = 0, $used$3$i = 0, $vararg_buffer = 0, $vararg_buffer1 = 0, $vararg_buffer4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $vararg_buffer4 = sp + 16|0;
 $vararg_buffer1 = sp;
 $vararg_buffer = sp + 8|0;
 $0 = HEAP32[16848>>2]|0;
 $1 = ($0|0)==(0);
 do {
  if ($1) {
   $2 = (_sysconf(30)|0);
   $3 = (($2) + -1)|0;
   $4 = $3 & $2;
   $5 = ($4|0)==(0);
   if ($5) {
    HEAP32[(16856)>>2] = $2;
    HEAP32[(16852)>>2] = $2;
    HEAP32[(16860)>>2] = -1;
    HEAP32[(16864)>>2] = -1;
    HEAP32[(16868)>>2] = 0;
    HEAP32[(16820)>>2] = 0;
    $6 = (_time((0|0))|0);
    $7 = $6 & -16;
    $8 = $7 ^ 1431655768;
    HEAP32[16848>>2] = $8;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $9 = HEAP32[(16400)>>2]|0;
 $10 = ($9|0)==(0|0);
 if ($10) {
  $fp$0$i = 0;$maxfp$0$i = 0;$used$3$i = 0;
  $41 = HEAP32[_stderr>>2]|0;
  HEAP32[$vararg_buffer>>2] = $maxfp$0$i;
  (_fprintf(($41|0),(16872|0),($vararg_buffer|0))|0);
  HEAP32[$vararg_buffer1>>2] = $fp$0$i;
  (_fprintf(($41|0),(16904|0),($vararg_buffer1|0))|0);
  HEAP32[$vararg_buffer4>>2] = $used$3$i;
  (_fprintf(($41|0),(16936|0),($vararg_buffer4|0))|0);
  STACKTOP = sp;return;
 }
 $11 = HEAP32[(16812)>>2]|0;
 $12 = HEAP32[(16808)>>2]|0;
 $13 = HEAP32[(16388)>>2]|0;
 $$neg2$i = (($12) + -40)|0;
 $14 = (($$neg2$i) - ($13))|0;
 $s$010$i = (16824);$used$09$i = $14;
 while(1) {
  $15 = HEAP32[$s$010$i>>2]|0;
  $16 = ((($15)) + 8|0);
  $17 = $16;
  $18 = $17 & 7;
  $19 = ($18|0)==(0);
  $20 = (0 - ($17))|0;
  $21 = $20 & 7;
  $22 = $19 ? 0 : $21;
  $23 = (($15) + ($22)|0);
  $24 = ((($s$010$i)) + 4|0);
  $25 = HEAP32[$24>>2]|0;
  $26 = (($15) + ($25)|0);
  $q$0$in4$i = $23;$used$13$i = $used$09$i;
  while(1) {
   $27 = ($q$0$in4$i>>>0)>=($26>>>0);
   $28 = ($q$0$in4$i|0)==($9|0);
   $or$cond$i = $27 | $28;
   if ($or$cond$i) {
    $used$1$lcssa$i = $used$13$i;
    break;
   }
   $29 = ((($q$0$in4$i)) + 4|0);
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
  $38 = ((($s$010$i)) + 8|0);
  $39 = HEAP32[$38>>2]|0;
  $40 = ($39|0)==(0|0);
  if ($40) {
   $fp$0$i = $12;$maxfp$0$i = $11;$used$3$i = $used$1$lcssa$i;
   break;
  } else {
   $s$010$i = $39;$used$09$i = $used$1$lcssa$i;
  }
 }
 $41 = HEAP32[_stderr>>2]|0;
 HEAP32[$vararg_buffer>>2] = $maxfp$0$i;
 (_fprintf(($41|0),(16872|0),($vararg_buffer|0))|0);
 HEAP32[$vararg_buffer1>>2] = $fp$0$i;
 (_fprintf(($41|0),(16904|0),($vararg_buffer1|0))|0);
 HEAP32[$vararg_buffer4>>2] = $used$3$i;
 (_fprintf(($41|0),(16936|0),($vararg_buffer4|0))|0);
 STACKTOP = sp;return;
}
function _mallopt($param_number,$value) {
 $param_number = $param_number|0;
 $value = $value|0;
 var $$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[16848>>2]|0;
 $1 = ($0|0)==(0);
 do {
  if ($1) {
   $2 = (_sysconf(30)|0);
   $3 = (($2) + -1)|0;
   $4 = $3 & $2;
   $5 = ($4|0)==(0);
   if ($5) {
    HEAP32[(16856)>>2] = $2;
    HEAP32[(16852)>>2] = $2;
    HEAP32[(16860)>>2] = -1;
    HEAP32[(16864)>>2] = -1;
    HEAP32[(16868)>>2] = 0;
    HEAP32[(16820)>>2] = 0;
    $6 = (_time((0|0))|0);
    $7 = $6 & -16;
    $8 = $7 ^ 1431655768;
    HEAP32[16848>>2] = $8;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 if ((($param_number|0) == -2)) {
  $9 = HEAP32[(16852)>>2]|0;
  $10 = ($9>>>0)>($value>>>0);
  if ($10) {
   $$0$i = 0;
   return ($$0$i|0);
  }
  $11 = (($value) + -1)|0;
  $12 = $11 & $value;
  $13 = ($12|0)==(0);
  if (!($13)) {
   $$0$i = 0;
   return ($$0$i|0);
  }
  HEAP32[(16856)>>2] = $value;
  $$0$i = 1;
  return ($$0$i|0);
 } else if ((($param_number|0) == -1)) {
  HEAP32[(16864)>>2] = $value;
  $$0$i = 1;
  return ($$0$i|0);
 } else if ((($param_number|0) == -3)) {
  HEAP32[(16860)>>2] = $value;
  $$0$i = 1;
  return ($$0$i|0);
 } else {
  $$0$i = 0;
  return ($$0$i|0);
 }
 return (0)|0;
}
function _malloc_usable_size($mem) {
 $mem = $mem|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  $$0 = 0;
  return ($$0|0);
 }
 $1 = ((($mem)) + -4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = $2 & 3;
 $4 = ($3|0)==(1);
 if ($4) {
  $$0 = 0;
  return ($$0|0);
 }
 $5 = $2 & -8;
 $6 = ($3|0)==(0);
 $7 = $6 ? 8 : 4;
 $8 = (($5) - ($7))|0;
 $$0 = $8;
 return ($$0|0);
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
 var $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $R$0 = 0, $R$0$lcssa = 0, $R$1 = 0, $RP$0 = 0, $RP$0$lcssa = 0, $cond = 0, $newp$0 = 0, $notlhs = 0;
 var $notrhs = 0, $or$cond$not = 0, $or$cond30 = 0, $storemerge = 0, $storemerge21 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($p)) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = $1 & -8;
 $3 = (($p) + ($2)|0);
 $4 = HEAP32[(16392)>>2]|0;
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
   return ($newp$0|0);
  }
  $13 = (($nb) + 4)|0;
  $14 = ($2>>>0)<($13>>>0);
  if (!($14)) {
   $15 = (($2) - ($nb))|0;
   $16 = HEAP32[(16856)>>2]|0;
   $17 = $16 << 1;
   $18 = ($15>>>0)>($17>>>0);
   if (!($18)) {
    $newp$0 = $p;
    return ($newp$0|0);
   }
  }
  $newp$0 = 0;
  return ($newp$0|0);
 }
 $19 = ($2>>>0)<($nb>>>0);
 if (!($19)) {
  $20 = (($2) - ($nb))|0;
  $21 = ($20>>>0)>(15);
  if (!($21)) {
   $newp$0 = $p;
   return ($newp$0|0);
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
  return ($newp$0|0);
 }
 $30 = HEAP32[(16400)>>2]|0;
 $31 = ($3|0)==($30|0);
 if ($31) {
  $32 = HEAP32[(16388)>>2]|0;
  $33 = (($32) + ($2))|0;
  $34 = ($33>>>0)>($nb>>>0);
  if (!($34)) {
   $newp$0 = 0;
   return ($newp$0|0);
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
  HEAP32[(16400)>>2] = $36;
  HEAP32[(16388)>>2] = $35;
  $newp$0 = $p;
  return ($newp$0|0);
 }
 $42 = HEAP32[(16396)>>2]|0;
 $43 = ($3|0)==($42|0);
 if ($43) {
  $44 = HEAP32[(16384)>>2]|0;
  $45 = (($44) + ($2))|0;
  $46 = ($45>>>0)<($nb>>>0);
  if ($46) {
   $newp$0 = 0;
   return ($newp$0|0);
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
  HEAP32[(16384)>>2] = $storemerge21;
  HEAP32[(16396)>>2] = $storemerge;
  $newp$0 = $p;
  return ($newp$0|0);
 }
 $65 = $8 & 2;
 $66 = ($65|0)==(0);
 if (!($66)) {
  $newp$0 = 0;
  return ($newp$0|0);
 }
 $67 = $8 & -8;
 $68 = (($67) + ($2))|0;
 $69 = ($68>>>0)<($nb>>>0);
 if ($69) {
  $newp$0 = 0;
  return ($newp$0|0);
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
   $78 = (16416 + ($77<<2)|0);
   $79 = ($74|0)==($78|0);
   if (!($79)) {
    $80 = ($74>>>0)<($4>>>0);
    if ($80) {
     _abort();
     // unreachable;
    }
    $81 = ((($74)) + 12|0);
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
    $87 = HEAP32[16376>>2]|0;
    $88 = $87 & $86;
    HEAP32[16376>>2] = $88;
    break;
   }
   $89 = ($76|0)==($78|0);
   if ($89) {
    $$pre = ((($76)) + 8|0);
    $$pre$phiZ2D = $$pre;
   } else {
    $90 = ($76>>>0)<($4>>>0);
    if ($90) {
     _abort();
     // unreachable;
    }
    $91 = ((($76)) + 8|0);
    $92 = HEAP32[$91>>2]|0;
    $93 = ($92|0)==($3|0);
    if ($93) {
     $$pre$phiZ2D = $91;
    } else {
     _abort();
     // unreachable;
    }
   }
   $94 = ((($74)) + 12|0);
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
      $115 = ((($R$0)) + 20|0);
      $116 = HEAP32[$115>>2]|0;
      $117 = ($116|0)==(0|0);
      if (!($117)) {
       $R$0 = $116;$RP$0 = $115;
       continue;
      }
      $118 = ((($R$0)) + 16|0);
      $119 = HEAP32[$118>>2]|0;
      $120 = ($119|0)==(0|0);
      if ($120) {
       $R$0$lcssa = $R$0;$RP$0$lcssa = $RP$0;
       break;
      } else {
       $R$0 = $119;$RP$0 = $118;
      }
     }
     $121 = ($RP$0$lcssa>>>0)<($4>>>0);
     if ($121) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0$lcssa>>2] = 0;
      $R$1 = $R$0$lcssa;
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
     $103 = ((($101)) + 12|0);
     $104 = HEAP32[$103>>2]|0;
     $105 = ($104|0)==($3|0);
     if (!($105)) {
      _abort();
      // unreachable;
     }
     $106 = ((($98)) + 8|0);
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
    $125 = (16680 + ($124<<2)|0);
    $126 = HEAP32[$125>>2]|0;
    $127 = ($3|0)==($126|0);
    if ($127) {
     HEAP32[$125>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $128 = 1 << $124;
      $129 = $128 ^ -1;
      $130 = HEAP32[(16380)>>2]|0;
      $131 = $130 & $129;
      HEAP32[(16380)>>2] = $131;
      break;
     }
    } else {
     $132 = HEAP32[(16392)>>2]|0;
     $133 = ($96>>>0)<($132>>>0);
     if ($133) {
      _abort();
      // unreachable;
     }
     $134 = ((($96)) + 16|0);
     $135 = HEAP32[$134>>2]|0;
     $136 = ($135|0)==($3|0);
     if ($136) {
      HEAP32[$134>>2] = $R$1;
     } else {
      $137 = ((($96)) + 20|0);
      HEAP32[$137>>2] = $R$1;
     }
     $138 = ($R$1|0)==(0|0);
     if ($138) {
      break;
     }
    }
    $139 = HEAP32[(16392)>>2]|0;
    $140 = ($R$1>>>0)<($139>>>0);
    if ($140) {
     _abort();
     // unreachable;
    }
    $141 = ((($R$1)) + 24|0);
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
       $146 = ((($R$1)) + 16|0);
       HEAP32[$146>>2] = $143;
       $147 = ((($143)) + 24|0);
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
     $151 = HEAP32[(16392)>>2]|0;
     $152 = ($149>>>0)<($151>>>0);
     if ($152) {
      _abort();
      // unreachable;
     } else {
      $153 = ((($R$1)) + 20|0);
      HEAP32[$153>>2] = $149;
      $154 = ((($149)) + 24|0);
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
  return ($newp$0|0);
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
  return ($newp$0|0);
 }
 return (0)|0;
}
function _internal_memalign($alignment,$bytes) {
 $alignment = $alignment|0;
 $bytes = $bytes|0;
 var $$1 = 0, $$alignment = 0, $$sum1 = 0, $$sum2 = 0, $$sum3 = 0, $$sum4 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0;
 var $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0;
 var $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0;
 var $76 = 0, $8 = 0, $9 = 0, $a$0 = 0, $mem$0 = 0, $p$0 = 0, label = 0, sp = 0;
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
  return ($mem$0|0);
 }
 $9 = ($bytes>>>0)<(11);
 $10 = (($bytes) + 11)|0;
 $11 = $10 & -8;
 $12 = $9 ? 16 : $11;
 $13 = (($12) + 12)|0;
 $14 = (($13) + ($$1))|0;
 $15 = (_malloc($14)|0);
 $16 = ($15|0)==(0|0);
 if ($16) {
  $mem$0 = 0;
  return ($mem$0|0);
 }
 $17 = ((($15)) + -8|0);
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
   $27 = ((($26)) + -8|0);
   $28 = $27;
   $29 = $17;
   $30 = (($28) - ($29))|0;
   $31 = ($30>>>0)>(15);
   $$sum3 = (($$1) + -8)|0;
   $32 = (($26) + ($$sum3)|0);
   $33 = $31 ? $27 : $32;
   $34 = $33;
   $35 = (($34) - ($29))|0;
   $36 = ((($15)) + -4|0);
   $37 = HEAP32[$36>>2]|0;
   $38 = $37 & -8;
   $39 = (($38) - ($35))|0;
   $40 = $37 & 3;
   $41 = ($40|0)==(0);
   if ($41) {
    $42 = HEAP32[$17>>2]|0;
    $43 = (($42) + ($35))|0;
    HEAP32[$33>>2] = $43;
    $44 = ((($33)) + 4|0);
    HEAP32[$44>>2] = $39;
    $p$0 = $33;
    break;
   } else {
    $45 = ((($33)) + 4|0);
    $46 = HEAP32[$45>>2]|0;
    $47 = $46 & 1;
    $48 = $39 | $47;
    $49 = $48 | 2;
    HEAP32[$45>>2] = $49;
    $$sum4 = (($39) + 4)|0;
    $50 = (($33) + ($$sum4)|0);
    $51 = HEAP32[$50>>2]|0;
    $52 = $51 | 1;
    HEAP32[$50>>2] = $52;
    $53 = HEAP32[$36>>2]|0;
    $54 = $53 & 1;
    $55 = $35 | $54;
    $56 = $55 | 2;
    HEAP32[$36>>2] = $56;
    $57 = HEAP32[$45>>2]|0;
    $58 = $57 | 1;
    HEAP32[$45>>2] = $58;
    _dispose_chunk($17,$35);
    $p$0 = $33;
    break;
   }
  }
 } while(0);
 $59 = ((($p$0)) + 4|0);
 $60 = HEAP32[$59>>2]|0;
 $61 = $60 & 3;
 $62 = ($61|0)==(0);
 if (!($62)) {
  $63 = $60 & -8;
  $64 = (($12) + 16)|0;
  $65 = ($63>>>0)>($64>>>0);
  if ($65) {
   $66 = (($63) - ($12))|0;
   $67 = (($p$0) + ($12)|0);
   $68 = $60 & 1;
   $69 = $12 | $68;
   $70 = $69 | 2;
   HEAP32[$59>>2] = $70;
   $$sum1 = $12 | 4;
   $71 = (($p$0) + ($$sum1)|0);
   $72 = $66 | 3;
   HEAP32[$71>>2] = $72;
   $$sum2 = $63 | 4;
   $73 = (($p$0) + ($$sum2)|0);
   $74 = HEAP32[$73>>2]|0;
   $75 = $74 | 1;
   HEAP32[$73>>2] = $75;
   _dispose_chunk($67,$66);
  }
 }
 $76 = ((($p$0)) + 8|0);
 $mem$0 = $76;
 return ($mem$0|0);
}
function _ialloc($n_elements,$sizes,$opts,$chunks) {
 $n_elements = $n_elements|0;
 $sizes = $sizes|0;
 $opts = $opts|0;
 $chunks = $chunks|0;
 var $$0 = 0, $$sum = 0, $$sum11 = 0, $$sum2 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $9 = 0, $array_size$0 = 0, $contents_size$07 = 0, $contents_size$1 = 0, $element_size$0 = 0, $i$08 = 0, $i$15 = 0, $i$15$us = 0, $marray$0 = 0, $marray$1 = 0, $p$0$in$lcssa = 0, $p$0$in3 = 0, $p$0$in3$us = 0, $remainder_size$0 = 0, $remainder_size$1$lcssa = 0;
 var $remainder_size$14$us = 0, $scevgep = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[16848>>2]|0;
 $1 = ($0|0)==(0);
 do {
  if ($1) {
   $2 = (_sysconf(30)|0);
   $3 = (($2) + -1)|0;
   $4 = $3 & $2;
   $5 = ($4|0)==(0);
   if ($5) {
    HEAP32[(16856)>>2] = $2;
    HEAP32[(16852)>>2] = $2;
    HEAP32[(16860)>>2] = -1;
    HEAP32[(16864)>>2] = -1;
    HEAP32[(16868)>>2] = 0;
    HEAP32[(16820)>>2] = 0;
    $6 = (_time((0|0))|0);
    $7 = $6 & -16;
    $8 = $7 ^ 1431655768;
    HEAP32[16848>>2] = $8;
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
   if (!($10)) {
    $12 = $n_elements << 2;
    $13 = ($12>>>0)<(11);
    $14 = (($12) + 11)|0;
    $15 = $14 & -8;
    $16 = $13 ? 16 : $15;
    $array_size$0 = $16;$marray$0 = 0;
    break;
   }
   $11 = (_malloc(0)|0);
   $$0 = $11;
   return ($$0|0);
  } else {
   if ($10) {
    $$0 = $chunks;
    return ($$0|0);
   } else {
    $array_size$0 = 0;$marray$0 = $chunks;
   }
  }
 } while(0);
 $17 = $opts & 1;
 $18 = ($17|0)==(0);
 if ($18) {
  $contents_size$07 = 0;$i$08 = 0;
  while(1) {
   $25 = (($sizes) + ($i$08<<2)|0);
   $26 = HEAP32[$25>>2]|0;
   $27 = ($26>>>0)<(11);
   $28 = (($26) + 11)|0;
   $29 = $28 & -8;
   $30 = $27 ? 16 : $29;
   $31 = (($30) + ($contents_size$07))|0;
   $32 = (($i$08) + 1)|0;
   $33 = ($32|0)==($n_elements|0);
   if ($33) {
    $contents_size$1 = $31;$element_size$0 = 0;
    break;
   } else {
    $contents_size$07 = $31;$i$08 = $32;
   }
  }
 } else {
  $19 = HEAP32[$sizes>>2]|0;
  $20 = ($19>>>0)<(11);
  $21 = (($19) + 11)|0;
  $22 = $21 & -8;
  $23 = $20 ? 16 : $22;
  $24 = Math_imul($23, $n_elements)|0;
  $contents_size$1 = $24;$element_size$0 = $23;
 }
 $34 = (($array_size$0) + -4)|0;
 $35 = (($34) + ($contents_size$1))|0;
 $36 = (_malloc($35)|0);
 $37 = ($36|0)==(0|0);
 if ($37) {
  $$0 = 0;
  return ($$0|0);
 }
 $38 = ((($36)) + -8|0);
 $39 = ((($36)) + -4|0);
 $40 = HEAP32[$39>>2]|0;
 $41 = $40 & -8;
 $42 = $opts & 2;
 $43 = ($42|0)==(0);
 if (!($43)) {
  $44 = (-4 - ($array_size$0))|0;
  $45 = (($44) + ($41))|0;
  _memset(($36|0),0,($45|0))|0;
 }
 $46 = ($marray$0|0)==(0|0);
 if ($46) {
  $47 = (($41) - ($contents_size$1))|0;
  $48 = (($36) + ($contents_size$1)|0);
  $49 = $47 | 3;
  $$sum2 = (($contents_size$1) + -4)|0;
  $50 = (($36) + ($$sum2)|0);
  HEAP32[$50>>2] = $49;
  $marray$1 = $48;$remainder_size$0 = $contents_size$1;
 } else {
  $marray$1 = $marray$0;$remainder_size$0 = $41;
 }
 HEAP32[$marray$1>>2] = $36;
 $51 = (($n_elements) + -1)|0;
 $52 = ($51|0)==(0);
 L30: do {
  if ($52) {
   $p$0$in$lcssa = $38;$remainder_size$1$lcssa = $remainder_size$0;
  } else {
   $53 = ($element_size$0|0)==(0);
   if ($53) {
    $i$15$us = 0;$p$0$in3$us = $38;$remainder_size$14$us = $remainder_size$0;
    while(1) {
     $59 = (($sizes) + ($i$15$us<<2)|0);
     $60 = HEAP32[$59>>2]|0;
     $61 = ($60>>>0)<(11);
     $62 = (($60) + 11)|0;
     $63 = $62 & -8;
     $64 = $61 ? 16 : $63;
     $65 = (($remainder_size$14$us) - ($64))|0;
     $66 = $64 | 3;
     $67 = ((($p$0$in3$us)) + 4|0);
     HEAP32[$67>>2] = $66;
     $68 = (($p$0$in3$us) + ($64)|0);
     $69 = (($i$15$us) + 1)|0;
     $$sum11 = (($64) + 8)|0;
     $70 = (($p$0$in3$us) + ($$sum11)|0);
     $71 = (($marray$1) + ($69<<2)|0);
     HEAP32[$71>>2] = $70;
     $72 = ($69|0)==($51|0);
     if ($72) {
      $p$0$in$lcssa = $68;$remainder_size$1$lcssa = $65;
      break L30;
     } else {
      $i$15$us = $69;$p$0$in3$us = $68;$remainder_size$14$us = $65;
     }
    }
   }
   $54 = Math_imul($element_size$0, $51)|0;
   $55 = (($54) + -8)|0;
   $56 = (1 - ($n_elements))|0;
   $57 = Math_imul($element_size$0, $56)|0;
   $58 = $element_size$0 | 3;
   $$sum = (($element_size$0) + 8)|0;
   $i$15 = 0;$p$0$in3 = $38;
   while(1) {
    $73 = ((($p$0$in3)) + 4|0);
    HEAP32[$73>>2] = $58;
    $74 = (($p$0$in3) + ($element_size$0)|0);
    $75 = (($i$15) + 1)|0;
    $76 = (($p$0$in3) + ($$sum)|0);
    $77 = (($marray$1) + ($75<<2)|0);
    HEAP32[$77>>2] = $76;
    $78 = ($75|0)==($51|0);
    if ($78) {
     break;
    } else {
     $i$15 = $75;$p$0$in3 = $74;
    }
   }
   $scevgep = (($36) + ($55)|0);
   $79 = (($remainder_size$0) + ($57))|0;
   $p$0$in$lcssa = $scevgep;$remainder_size$1$lcssa = $79;
  }
 } while(0);
 $80 = $remainder_size$1$lcssa | 3;
 $81 = ((($p$0$in$lcssa)) + 4|0);
 HEAP32[$81>>2] = $80;
 $$0 = $marray$1;
 return ($$0|0);
}
function _dispose_chunk($p,$psize) {
 $p = $p|0;
 $psize = $psize|0;
 var $$0 = 0, $$02 = 0, $$1 = 0, $$lcssa = 0, $$pre = 0, $$pre$phi50Z2D = 0, $$pre$phi52Z2D = 0, $$pre$phiZ2D = 0, $$pre48 = 0, $$pre49 = 0, $$pre51 = 0, $$sum = 0, $$sum1 = 0, $$sum10 = 0, $$sum11 = 0, $$sum12 = 0, $$sum13 = 0, $$sum14 = 0, $$sum16 = 0, $$sum17 = 0;
 var $$sum18 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum21 = 0, $$sum22 = 0, $$sum23 = 0, $$sum24 = 0, $$sum25 = 0, $$sum3 = 0, $$sum4 = 0, $$sum5 = 0, $$sum7 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0;
 var $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0;
 var $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0;
 var $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0;
 var $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0;
 var $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0;
 var $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0;
 var $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0;
 var $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0;
 var $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0;
 var $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0;
 var $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0;
 var $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0;
 var $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I19$0 = 0, $K20$043 = 0, $R$0 = 0, $R$0$lcssa = 0, $R$1 = 0, $R7$0 = 0, $R7$0$lcssa = 0, $R7$1 = 0, $RP$0 = 0, $RP$0$lcssa = 0, $RP9$0 = 0, $RP9$0$lcssa = 0, $T$0$lcssa = 0, $T$042 = 0, $T$042$lcssa = 0, $cond = 0;
 var $cond39 = 0, $not$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($p) + ($psize)|0);
 $1 = ((($p)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = $2 & 1;
 $4 = ($3|0)==(0);
 do {
  if ($4) {
   $5 = HEAP32[$p>>2]|0;
   $6 = $2 & 3;
   $7 = ($6|0)==(0);
   if ($7) {
    return;
   }
   $8 = (0 - ($5))|0;
   $9 = (($p) + ($8)|0);
   $10 = (($5) + ($psize))|0;
   $11 = HEAP32[(16392)>>2]|0;
   $12 = ($9>>>0)<($11>>>0);
   if ($12) {
    _abort();
    // unreachable;
   }
   $13 = HEAP32[(16396)>>2]|0;
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
    HEAP32[(16384)>>2] = $10;
    $103 = $100 & -2;
    HEAP32[$99>>2] = $103;
    $104 = $10 | 1;
    $$sum14 = (4 - ($5))|0;
    $105 = (($p) + ($$sum14)|0);
    HEAP32[$105>>2] = $104;
    HEAP32[$0>>2] = $10;
    return;
   }
   $15 = $5 >>> 3;
   $16 = ($5>>>0)<(256);
   if ($16) {
    $$sum24 = (8 - ($5))|0;
    $17 = (($p) + ($$sum24)|0);
    $18 = HEAP32[$17>>2]|0;
    $$sum25 = (12 - ($5))|0;
    $19 = (($p) + ($$sum25)|0);
    $20 = HEAP32[$19>>2]|0;
    $21 = $15 << 1;
    $22 = (16416 + ($21<<2)|0);
    $23 = ($18|0)==($22|0);
    if (!($23)) {
     $24 = ($18>>>0)<($11>>>0);
     if ($24) {
      _abort();
      // unreachable;
     }
     $25 = ((($18)) + 12|0);
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
     $31 = HEAP32[16376>>2]|0;
     $32 = $31 & $30;
     HEAP32[16376>>2] = $32;
     $$0 = $9;$$02 = $10;
     break;
    }
    $33 = ($20|0)==($22|0);
    if ($33) {
     $$pre51 = ((($20)) + 8|0);
     $$pre$phi52Z2D = $$pre51;
    } else {
     $34 = ($20>>>0)<($11>>>0);
     if ($34) {
      _abort();
      // unreachable;
     }
     $35 = ((($20)) + 8|0);
     $36 = HEAP32[$35>>2]|0;
     $37 = ($36|0)==($9|0);
     if ($37) {
      $$pre$phi52Z2D = $35;
     } else {
      _abort();
      // unreachable;
     }
    }
    $38 = ((($18)) + 12|0);
    HEAP32[$38>>2] = $20;
    HEAP32[$$pre$phi52Z2D>>2] = $18;
    $$0 = $9;$$02 = $10;
    break;
   }
   $$sum16 = (24 - ($5))|0;
   $39 = (($p) + ($$sum16)|0);
   $40 = HEAP32[$39>>2]|0;
   $$sum17 = (12 - ($5))|0;
   $41 = (($p) + ($$sum17)|0);
   $42 = HEAP32[$41>>2]|0;
   $43 = ($42|0)==($9|0);
   do {
    if ($43) {
     $$sum18 = (16 - ($5))|0;
     $$sum19 = (($$sum18) + 4)|0;
     $53 = (($p) + ($$sum19)|0);
     $54 = HEAP32[$53>>2]|0;
     $55 = ($54|0)==(0|0);
     if ($55) {
      $56 = (($p) + ($$sum18)|0);
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
      $59 = ((($R$0)) + 20|0);
      $60 = HEAP32[$59>>2]|0;
      $61 = ($60|0)==(0|0);
      if (!($61)) {
       $R$0 = $60;$RP$0 = $59;
       continue;
      }
      $62 = ((($R$0)) + 16|0);
      $63 = HEAP32[$62>>2]|0;
      $64 = ($63|0)==(0|0);
      if ($64) {
       $R$0$lcssa = $R$0;$RP$0$lcssa = $RP$0;
       break;
      } else {
       $R$0 = $63;$RP$0 = $62;
      }
     }
     $65 = ($RP$0$lcssa>>>0)<($11>>>0);
     if ($65) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0$lcssa>>2] = 0;
      $R$1 = $R$0$lcssa;
      break;
     }
    } else {
     $$sum23 = (8 - ($5))|0;
     $44 = (($p) + ($$sum23)|0);
     $45 = HEAP32[$44>>2]|0;
     $46 = ($45>>>0)<($11>>>0);
     if ($46) {
      _abort();
      // unreachable;
     }
     $47 = ((($45)) + 12|0);
     $48 = HEAP32[$47>>2]|0;
     $49 = ($48|0)==($9|0);
     if (!($49)) {
      _abort();
      // unreachable;
     }
     $50 = ((($42)) + 8|0);
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
    $$sum20 = (28 - ($5))|0;
    $67 = (($p) + ($$sum20)|0);
    $68 = HEAP32[$67>>2]|0;
    $69 = (16680 + ($68<<2)|0);
    $70 = HEAP32[$69>>2]|0;
    $71 = ($9|0)==($70|0);
    if ($71) {
     HEAP32[$69>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $72 = 1 << $68;
      $73 = $72 ^ -1;
      $74 = HEAP32[(16380)>>2]|0;
      $75 = $74 & $73;
      HEAP32[(16380)>>2] = $75;
      $$0 = $9;$$02 = $10;
      break;
     }
    } else {
     $76 = HEAP32[(16392)>>2]|0;
     $77 = ($40>>>0)<($76>>>0);
     if ($77) {
      _abort();
      // unreachable;
     }
     $78 = ((($40)) + 16|0);
     $79 = HEAP32[$78>>2]|0;
     $80 = ($79|0)==($9|0);
     if ($80) {
      HEAP32[$78>>2] = $R$1;
     } else {
      $81 = ((($40)) + 20|0);
      HEAP32[$81>>2] = $R$1;
     }
     $82 = ($R$1|0)==(0|0);
     if ($82) {
      $$0 = $9;$$02 = $10;
      break;
     }
    }
    $83 = HEAP32[(16392)>>2]|0;
    $84 = ($R$1>>>0)<($83>>>0);
    if ($84) {
     _abort();
     // unreachable;
    }
    $85 = ((($R$1)) + 24|0);
    HEAP32[$85>>2] = $40;
    $$sum21 = (16 - ($5))|0;
    $86 = (($p) + ($$sum21)|0);
    $87 = HEAP32[$86>>2]|0;
    $88 = ($87|0)==(0|0);
    do {
     if (!($88)) {
      $89 = ($87>>>0)<($83>>>0);
      if ($89) {
       _abort();
       // unreachable;
      } else {
       $90 = ((($R$1)) + 16|0);
       HEAP32[$90>>2] = $87;
       $91 = ((($87)) + 24|0);
       HEAP32[$91>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum22 = (($$sum21) + 4)|0;
    $92 = (($p) + ($$sum22)|0);
    $93 = HEAP32[$92>>2]|0;
    $94 = ($93|0)==(0|0);
    if ($94) {
     $$0 = $9;$$02 = $10;
    } else {
     $95 = HEAP32[(16392)>>2]|0;
     $96 = ($93>>>0)<($95>>>0);
     if ($96) {
      _abort();
      // unreachable;
     } else {
      $97 = ((($R$1)) + 20|0);
      HEAP32[$97>>2] = $93;
      $98 = ((($93)) + 24|0);
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
 $106 = HEAP32[(16392)>>2]|0;
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
  $112 = HEAP32[(16400)>>2]|0;
  $113 = ($0|0)==($112|0);
  if ($113) {
   $114 = HEAP32[(16388)>>2]|0;
   $115 = (($114) + ($$02))|0;
   HEAP32[(16388)>>2] = $115;
   HEAP32[(16400)>>2] = $$0;
   $116 = $115 | 1;
   $117 = ((($$0)) + 4|0);
   HEAP32[$117>>2] = $116;
   $118 = HEAP32[(16396)>>2]|0;
   $119 = ($$0|0)==($118|0);
   if (!($119)) {
    return;
   }
   HEAP32[(16396)>>2] = 0;
   HEAP32[(16384)>>2] = 0;
   return;
  }
  $120 = HEAP32[(16396)>>2]|0;
  $121 = ($0|0)==($120|0);
  if ($121) {
   $122 = HEAP32[(16384)>>2]|0;
   $123 = (($122) + ($$02))|0;
   HEAP32[(16384)>>2] = $123;
   HEAP32[(16396)>>2] = $$0;
   $124 = $123 | 1;
   $125 = ((($$0)) + 4|0);
   HEAP32[$125>>2] = $124;
   $126 = (($$0) + ($123)|0);
   HEAP32[$126>>2] = $123;
   return;
  }
  $127 = $109 & -8;
  $128 = (($127) + ($$02))|0;
  $129 = $109 >>> 3;
  $130 = ($109>>>0)<(256);
  do {
   if ($130) {
    $$sum12 = (($psize) + 8)|0;
    $131 = (($p) + ($$sum12)|0);
    $132 = HEAP32[$131>>2]|0;
    $$sum13 = (($psize) + 12)|0;
    $133 = (($p) + ($$sum13)|0);
    $134 = HEAP32[$133>>2]|0;
    $135 = $129 << 1;
    $136 = (16416 + ($135<<2)|0);
    $137 = ($132|0)==($136|0);
    if (!($137)) {
     $138 = ($132>>>0)<($106>>>0);
     if ($138) {
      _abort();
      // unreachable;
     }
     $139 = ((($132)) + 12|0);
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
     $145 = HEAP32[16376>>2]|0;
     $146 = $145 & $144;
     HEAP32[16376>>2] = $146;
     break;
    }
    $147 = ($134|0)==($136|0);
    if ($147) {
     $$pre49 = ((($134)) + 8|0);
     $$pre$phi50Z2D = $$pre49;
    } else {
     $148 = ($134>>>0)<($106>>>0);
     if ($148) {
      _abort();
      // unreachable;
     }
     $149 = ((($134)) + 8|0);
     $150 = HEAP32[$149>>2]|0;
     $151 = ($150|0)==($0|0);
     if ($151) {
      $$pre$phi50Z2D = $149;
     } else {
      _abort();
      // unreachable;
     }
    }
    $152 = ((($132)) + 12|0);
    HEAP32[$152>>2] = $134;
    HEAP32[$$pre$phi50Z2D>>2] = $132;
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
       $173 = ((($R7$0)) + 20|0);
       $174 = HEAP32[$173>>2]|0;
       $175 = ($174|0)==(0|0);
       if (!($175)) {
        $R7$0 = $174;$RP9$0 = $173;
        continue;
       }
       $176 = ((($R7$0)) + 16|0);
       $177 = HEAP32[$176>>2]|0;
       $178 = ($177|0)==(0|0);
       if ($178) {
        $R7$0$lcssa = $R7$0;$RP9$0$lcssa = $RP9$0;
        break;
       } else {
        $R7$0 = $177;$RP9$0 = $176;
       }
      }
      $179 = ($RP9$0$lcssa>>>0)<($106>>>0);
      if ($179) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0$lcssa>>2] = 0;
       $R7$1 = $R7$0$lcssa;
       break;
      }
     } else {
      $$sum11 = (($psize) + 8)|0;
      $158 = (($p) + ($$sum11)|0);
      $159 = HEAP32[$158>>2]|0;
      $160 = ($159>>>0)<($106>>>0);
      if ($160) {
       _abort();
       // unreachable;
      }
      $161 = ((($159)) + 12|0);
      $162 = HEAP32[$161>>2]|0;
      $163 = ($162|0)==($0|0);
      if (!($163)) {
       _abort();
       // unreachable;
      }
      $164 = ((($156)) + 8|0);
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
     $$sum8 = (($psize) + 28)|0;
     $181 = (($p) + ($$sum8)|0);
     $182 = HEAP32[$181>>2]|0;
     $183 = (16680 + ($182<<2)|0);
     $184 = HEAP32[$183>>2]|0;
     $185 = ($0|0)==($184|0);
     if ($185) {
      HEAP32[$183>>2] = $R7$1;
      $cond39 = ($R7$1|0)==(0|0);
      if ($cond39) {
       $186 = 1 << $182;
       $187 = $186 ^ -1;
       $188 = HEAP32[(16380)>>2]|0;
       $189 = $188 & $187;
       HEAP32[(16380)>>2] = $189;
       break;
      }
     } else {
      $190 = HEAP32[(16392)>>2]|0;
      $191 = ($154>>>0)<($190>>>0);
      if ($191) {
       _abort();
       // unreachable;
      }
      $192 = ((($154)) + 16|0);
      $193 = HEAP32[$192>>2]|0;
      $194 = ($193|0)==($0|0);
      if ($194) {
       HEAP32[$192>>2] = $R7$1;
      } else {
       $195 = ((($154)) + 20|0);
       HEAP32[$195>>2] = $R7$1;
      }
      $196 = ($R7$1|0)==(0|0);
      if ($196) {
       break;
      }
     }
     $197 = HEAP32[(16392)>>2]|0;
     $198 = ($R7$1>>>0)<($197>>>0);
     if ($198) {
      _abort();
      // unreachable;
     }
     $199 = ((($R7$1)) + 24|0);
     HEAP32[$199>>2] = $154;
     $$sum9 = (($psize) + 16)|0;
     $200 = (($p) + ($$sum9)|0);
     $201 = HEAP32[$200>>2]|0;
     $202 = ($201|0)==(0|0);
     do {
      if (!($202)) {
       $203 = ($201>>>0)<($197>>>0);
       if ($203) {
        _abort();
        // unreachable;
       } else {
        $204 = ((($R7$1)) + 16|0);
        HEAP32[$204>>2] = $201;
        $205 = ((($201)) + 24|0);
        HEAP32[$205>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum10 = (($psize) + 20)|0;
     $206 = (($p) + ($$sum10)|0);
     $207 = HEAP32[$206>>2]|0;
     $208 = ($207|0)==(0|0);
     if (!($208)) {
      $209 = HEAP32[(16392)>>2]|0;
      $210 = ($207>>>0)<($209>>>0);
      if ($210) {
       _abort();
       // unreachable;
      } else {
       $211 = ((($R7$1)) + 20|0);
       HEAP32[$211>>2] = $207;
       $212 = ((($207)) + 24|0);
       HEAP32[$212>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $213 = $128 | 1;
  $214 = ((($$0)) + 4|0);
  HEAP32[$214>>2] = $213;
  $215 = (($$0) + ($128)|0);
  HEAP32[$215>>2] = $128;
  $216 = HEAP32[(16396)>>2]|0;
  $217 = ($$0|0)==($216|0);
  if ($217) {
   HEAP32[(16384)>>2] = $128;
   return;
  } else {
   $$1 = $128;
  }
 } else {
  $218 = $109 & -2;
  HEAP32[$108>>2] = $218;
  $219 = $$02 | 1;
  $220 = ((($$0)) + 4|0);
  HEAP32[$220>>2] = $219;
  $221 = (($$0) + ($$02)|0);
  HEAP32[$221>>2] = $$02;
  $$1 = $$02;
 }
 $222 = $$1 >>> 3;
 $223 = ($$1>>>0)<(256);
 if ($223) {
  $224 = $222 << 1;
  $225 = (16416 + ($224<<2)|0);
  $226 = HEAP32[16376>>2]|0;
  $227 = 1 << $222;
  $228 = $226 & $227;
  $229 = ($228|0)==(0);
  if ($229) {
   $230 = $226 | $227;
   HEAP32[16376>>2] = $230;
   $$pre = (($224) + 2)|0;
   $$pre48 = (16416 + ($$pre<<2)|0);
   $$pre$phiZ2D = $$pre48;$F16$0 = $225;
  } else {
   $$sum7 = (($224) + 2)|0;
   $231 = (16416 + ($$sum7<<2)|0);
   $232 = HEAP32[$231>>2]|0;
   $233 = HEAP32[(16392)>>2]|0;
   $234 = ($232>>>0)<($233>>>0);
   if ($234) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $231;$F16$0 = $232;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $$0;
  $235 = ((($F16$0)) + 12|0);
  HEAP32[$235>>2] = $$0;
  $236 = ((($$0)) + 8|0);
  HEAP32[$236>>2] = $F16$0;
  $237 = ((($$0)) + 12|0);
  HEAP32[$237>>2] = $225;
  return;
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
 $263 = (16680 + ($I19$0<<2)|0);
 $264 = ((($$0)) + 28|0);
 HEAP32[$264>>2] = $I19$0;
 $265 = ((($$0)) + 16|0);
 $266 = ((($$0)) + 20|0);
 HEAP32[$266>>2] = 0;
 HEAP32[$265>>2] = 0;
 $267 = HEAP32[(16380)>>2]|0;
 $268 = 1 << $I19$0;
 $269 = $267 & $268;
 $270 = ($269|0)==(0);
 if ($270) {
  $271 = $267 | $268;
  HEAP32[(16380)>>2] = $271;
  HEAP32[$263>>2] = $$0;
  $272 = ((($$0)) + 24|0);
  HEAP32[$272>>2] = $263;
  $273 = ((($$0)) + 12|0);
  HEAP32[$273>>2] = $$0;
  $274 = ((($$0)) + 8|0);
  HEAP32[$274>>2] = $$0;
  return;
 }
 $275 = HEAP32[$263>>2]|0;
 $276 = ((($275)) + 4|0);
 $277 = HEAP32[$276>>2]|0;
 $278 = $277 & -8;
 $279 = ($278|0)==($$1|0);
 L191: do {
  if ($279) {
   $T$0$lcssa = $275;
  } else {
   $280 = ($I19$0|0)==(31);
   $281 = $I19$0 >>> 1;
   $282 = (25 - ($281))|0;
   $283 = $280 ? 0 : $282;
   $284 = $$1 << $283;
   $K20$043 = $284;$T$042 = $275;
   while(1) {
    $291 = $K20$043 >>> 31;
    $292 = (((($T$042)) + 16|0) + ($291<<2)|0);
    $287 = HEAP32[$292>>2]|0;
    $293 = ($287|0)==(0|0);
    if ($293) {
     $$lcssa = $292;$T$042$lcssa = $T$042;
     break;
    }
    $285 = $K20$043 << 1;
    $286 = ((($287)) + 4|0);
    $288 = HEAP32[$286>>2]|0;
    $289 = $288 & -8;
    $290 = ($289|0)==($$1|0);
    if ($290) {
     $T$0$lcssa = $287;
     break L191;
    } else {
     $K20$043 = $285;$T$042 = $287;
    }
   }
   $294 = HEAP32[(16392)>>2]|0;
   $295 = ($$lcssa>>>0)<($294>>>0);
   if ($295) {
    _abort();
    // unreachable;
   }
   HEAP32[$$lcssa>>2] = $$0;
   $296 = ((($$0)) + 24|0);
   HEAP32[$296>>2] = $T$042$lcssa;
   $297 = ((($$0)) + 12|0);
   HEAP32[$297>>2] = $$0;
   $298 = ((($$0)) + 8|0);
   HEAP32[$298>>2] = $$0;
   return;
  }
 } while(0);
 $299 = ((($T$0$lcssa)) + 8|0);
 $300 = HEAP32[$299>>2]|0;
 $301 = HEAP32[(16392)>>2]|0;
 $302 = ($300>>>0)>=($301>>>0);
 $not$ = ($T$0$lcssa>>>0)>=($301>>>0);
 $303 = $302 & $not$;
 if (!($303)) {
  _abort();
  // unreachable;
 }
 $304 = ((($300)) + 12|0);
 HEAP32[$304>>2] = $$0;
 HEAP32[$299>>2] = $$0;
 $305 = ((($$0)) + 8|0);
 HEAP32[$305>>2] = $300;
 $306 = ((($$0)) + 12|0);
 HEAP32[$306>>2] = $T$0$lcssa;
 $307 = ((($$0)) + 24|0);
 HEAP32[$307>>2] = 0;
 return;
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
  return $10$0 | 0;
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
  return $1$0 | 0;
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
      $49 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
      $51 = $49 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
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
        $117 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
        $119 = $117 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
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
        $86 = (Math_clz32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
        $88 = $86 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
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
    $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0 | 0, $d_sroa_0_0_insert_insert99$1 | 0, -1, -1) | 0;
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



  
function dynCall_iiii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  return FUNCTION_TABLE_iiii[index&1](a1|0,a2|0,a3|0)|0;
}

function b0(p0,p1,p2) { p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(0);return 0; }

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_iiii = [b0,_sn_write];

  return { _i64Subtract: _i64Subtract, _free: _free, _controller_handle: _controller_handle, _controller_init: _controller_init, _strlen: _strlen, _memset: _memset, _malloc: _malloc, _i64Add: _i64Add, _memcpy: _memcpy, _bitshift64Lshr: _bitshift64Lshr, _bitshift64Shl: _bitshift64Shl, _controller_10msec_timer: _controller_10msec_timer, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, establishStackSpace: establishStackSpace, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_iiii: dynCall_iiii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var real__i64Subtract = asm["_i64Subtract"]; asm["_i64Subtract"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Subtract.apply(null, arguments);
};

var real__free = asm["_free"]; asm["_free"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__free.apply(null, arguments);
};

var real__controller_handle = asm["_controller_handle"]; asm["_controller_handle"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__controller_handle.apply(null, arguments);
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

var real__malloc = asm["_malloc"]; asm["_malloc"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__malloc.apply(null, arguments);
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

var real__controller_10msec_timer = asm["_controller_10msec_timer"]; asm["_controller_10msec_timer"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__controller_10msec_timer.apply(null, arguments);
};

var real__bitshift64Shl = asm["_bitshift64Shl"]; asm["_bitshift64Shl"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Shl.apply(null, arguments);
};
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _free = Module["_free"] = asm["_free"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _controller_handle = Module["_controller_handle"] = asm["_controller_handle"];
var _controller_init = Module["_controller_init"] = asm["_controller_init"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _controller_10msec_timer = Module["_controller_10msec_timer"] = asm["_controller_10msec_timer"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
;

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.establishStackSpace = asm['establishStackSpace'];

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
  if (!Module['calledRun']) run();
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
    exit(ret, /* implicit = */ true);
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

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') implicitly called by end of main(), but noExitRuntime, so not exiting the runtime (you can use emscripten_force_exit, if you want to force a true shutdown)');
    return;
  }

  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)');
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

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

var abortDecorators = [];

function abort(what) {
  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
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



