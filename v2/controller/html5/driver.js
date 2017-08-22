"use strict";

// This javascript code initializes the demo on DOMContentLoaded event.

// Document elements expected to exist:
//   <canvas id="cvs"></canvas>
//   <pre id="midiLog"></pre>

// Global state:
var ui_modified = false;
var fsw_state = 0;
var led_state_top = 0;
var led_state_bot = 0;
var lcd_rows = ['01234567890123456789', '01234567890123456789', '01234567890123456789', '01234567890123456789'];
var lcd_rows_text_ptrs = [0,0,0,0];
var label_rows_text_ptrs = [0,0];
/** @const */var flash_size = 4096;
var flash = null;

var midiAccess = null;
var midiSupport = null;
var midiOutput = null;
var sysexMsg = null;

// ----------------------------- UI code:

var midiLog;
var midiLogHeight = 240;

var cvs, ctx;
var dpi = 50;
/** @const */var mmToIn = 0.0393701;

/** @const */var labels = [
    ["CH1", "CH1S", "CH2", "CH2S", "CH3", "CH3S", "TAP/STORE", "CANCEL"],
    ["COMP", "FILTER", "PITCH", "CHORUS", "DELAY", "REVERB", "PREV", "NEXT"]
];

/** @const */var keylabels = [
    ["A", "S", "D", "F", "G", "H", "J", "K"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I"]
];

// Total width, height in inches:
/** @const */var inWidth = 20.078;
/** @const */var inHeight = 6.305;

// Position and spacing of footswitches (from centers):
/** @const */var hLeft = 1.0;
/** @const */var hSpacing = 2.5714285714285714285714285714286;

/** @const */var vStart = 5.6;
/** @const */var vSpacing = 2.15;

/** @const */var vLEDOffset = -0.65;

/** @const */var inLEDOuterDiam = (12 /*mm*/ * mmToIn);
/** @const */var inFswOuterDiam = (12.2 /*mm*/ * mmToIn);
/** @const */var inFswInnerDiam = (10 /*mm*/ * mmToIn);

function dpi_MoveTo(X, Y) {
    ctx.moveTo(X * dpi, Y * dpi);
}

function dpi_LineTo(X, Y) {
    ctx.lineTo(X * dpi, Y * dpi);
}

function dpi_CenterCircle(cX, cY, r) {
    ctx.arc(cX * dpi, cY * dpi, r * dpi, 0, 2 * Math.PI);
}

function dpi_FillRect(l, t, r, b) {
    ctx.fillRect(l * dpi, t * dpi, (r - l) * dpi, (b - t) * dpi);
}

function dpi_FillAndStrokeCircle(cX, cY, r) {
    ctx.beginPath();
    ctx.arc(cX * dpi, cY * dpi, r * dpi, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cX * dpi, cY * dpi, r * dpi, 0, 2 * Math.PI);
    ctx.stroke();
}

function dpi_TextOut(nXStart, nYStart, lpString) {
    ctx.fillText(lpString, nXStart * dpi, nYStart * dpi);
}

function renderUI() {
    ctx.save();
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.strokeStyle = "#808080";
    ctx.strokeRect(0, 0, cvs.width, cvs.height);

    var h, inH, v, inV;

    if (false) {
        // draw grid:
        ctx.strokeStyle = "#202020";
        h = 0;
        for (inH = 0; inH <= inWidth; inH += 0.1, h = (h + 1) % 10) {
            if (h == 0) {
                ctx.lineWidth = 2;
            } else {
                ctx.lineWidth = 1;
            }
            ctx.beginPath();
            dpi_MoveTo(inH, 0);
            dpi_LineTo(inH, inHeight);
            ctx.stroke();

            v = 0;
            for (inV = 0; inV <= inHeight; inV += 0.1, v = (v + 1) % 10) {
                if (v == 0) {
                    ctx.lineWidth = 2;
                } else {
                    ctx.lineWidth = 1;
                }
                ctx.beginPath();
                dpi_MoveTo(0, inV);
                dpi_LineTo(inWidth, inV);
                ctx.stroke();
            }
        }
    }

    // draw LCD display (4x20 chars):
    /** @const */var lcdCenterX = (inWidth * 0.5);
    /** @const */var lcdCenterY = 1.25;

    ctx.fillStyle = "#000090";
    dpi_FillRect(lcdCenterX - ((76 * mmToIn) * 0.5), lcdCenterY - (25.2 * mmToIn * 0.5), lcdCenterX + ((76 * mmToIn) * 0.5), lcdCenterY + (25.2 * mmToIn * 0.5));

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = '' + ((7/40)*dpi).toString() + 'pt Courier New';
    ctx.lineWidth = 1;
    ctx.fillStyle = "#C0C0C0";
    for (v = 0; v < 4; ++v) {
        if (lcd_rows[v] === undefined) continue;
        dpi_TextOut(lcdCenterX - (70.4 * mmToIn * 0.5), lcdCenterY - (20.8 * mmToIn * 0.5) + (v * 4.76 * mmToIn), lcd_rows[v]);
    }

    ctx.textAlign = "center";
    ctx.font = '' + ((9/40)*dpi).toString() + 'pt Arial Bold';

    // draw 2 rows of foot switches and LEDs, starting at bottom row and moving up:
    for (v = 0; v < 2; ++v) {
        var led_state = (v == 0) ? led_state_bot : led_state_top;

        // draw 8 evenly spaced foot-switches
        var b = 1 << (v * 8);
        for (h = 0; h < 8; ++h, b <<= 1) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#808080";
            ctx.fillStyle = "#C0C0C0";
            dpi_FillAndStrokeCircle(hLeft + (h * hSpacing), vStart - (v * vSpacing), inFswOuterDiam * 0.5);

            ctx.lineWidth = 1;
            dpi_FillAndStrokeCircle(hLeft + (h * hSpacing), vStart - (v * vSpacing), inFswInnerDiam * 0.5);
            if (fsw_state & b) {
                // Foot switch is depressed:
                ctx.fillStyle = "#606060";
                dpi_FillAndStrokeCircle(hLeft + (h * hSpacing), vStart - (v * vSpacing), inFswOuterDiam * 0.5);
            }

            // Set label color:
            if (v == 0 && h < 6)
                ctx.fillStyle = "#4040C0";
            else if (v == 1 && h < 6)
                ctx.fillStyle = "#40C040";
            else
                ctx.fillStyle = "#E0E0E0";

            ctx.lineWidth = 1;
            ctx.textBaseline = "top";
            dpi_TextOut(hLeft + (h * hSpacing), vStart + 0.25 - (v * vSpacing), labels[v][h]);

            // Label w/ the keyboard key:
            ctx.fillStyle = "#601010";
            ctx.textBaseline = "alphabetic";
            dpi_TextOut(hLeft + (h * hSpacing), vStart + 0.10 - (v * vSpacing), keylabels[v][h]);
        }

        // 8 evenly spaced 8mm (203.2mil) LEDs above 1-4 preset switches

        // draw inactive LEDs:
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#202020";
        ctx.fillStyle = "#081E03";
        b = 1;
        for (h = 0; h < 8; ++h, b <<= 1) {
            if ((led_state & b) == 0) {
                dpi_FillAndStrokeCircle(hLeft + (h * hSpacing), vStart + vLEDOffset - (v * vSpacing), inLEDOuterDiam * 0.5);
            }
        }

        // draw active LEDs:
        ctx.fillStyle = "#19FA05";
        b = 1;
        for (h = 0; h < 8; ++h, b <<= 1) {
            if (led_state & b) {
                dpi_FillAndStrokeCircle(hLeft + (h * hSpacing), vStart + vLEDOffset - (v * vSpacing), inLEDOuterDiam * 0.5);
            }
        }
    }

    ctx.restore();
}

function keydown(e) {
    if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return false;

    // ASDFGHJK for bottom row:
    if (e.keyCode == 65) fsw_state |= 1;
    else if (e.keyCode == 83) fsw_state |= 2;
    else if (e.keyCode == 68) fsw_state |= 4;
    else if (e.keyCode == 70) fsw_state |= 8;
    else if (e.keyCode == 71) fsw_state |= 16;
    else if (e.keyCode == 72) fsw_state |= 32;
    else if (e.keyCode == 74) fsw_state |= 64;
    else if (e.keyCode == 75) fsw_state |= 128;
        // QWERTYUI for top row:
    else if (e.keyCode == 81) fsw_state |= 256;
    else if (e.keyCode == 87) fsw_state |= 512;
    else if (e.keyCode == 69) fsw_state |= 1024;
    else if (e.keyCode == 82) fsw_state |= 2048;
    else if (e.keyCode == 84) fsw_state |= 4096;
    else if (e.keyCode == 89) fsw_state |= 8192;
    else if (e.keyCode == 85) fsw_state |= 16384;
    else if (e.keyCode == 73) fsw_state |= 32768;
    else return true;

    ui_modified = true;
    e.preventDefault();
    return false;
}

function keyup(e) {
    if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return false;

    // ASDFGHJK for bottom row:
    if (e.keyCode == 65) fsw_state &= 1 ^ 65535;
    else if (e.keyCode == 83) fsw_state &= 2 ^ 65535;
    else if (e.keyCode == 68) fsw_state &= 4 ^ 65535;
    else if (e.keyCode == 70) fsw_state &= 8 ^ 65535;
    else if (e.keyCode == 71) fsw_state &= 16 ^ 65535;
    else if (e.keyCode == 72) fsw_state &= 32 ^ 65535;
    else if (e.keyCode == 74) fsw_state &= 64 ^ 65535;
    else if (e.keyCode == 75) fsw_state &= 128 ^ 65535;
        // QWERTYUI for top row:
    else if (e.keyCode == 81) fsw_state &= 256 ^ 65535;
    else if (e.keyCode == 87) fsw_state &= 512 ^ 65535;
    else if (e.keyCode == 69) fsw_state &= 1024 ^ 65535;
    else if (e.keyCode == 82) fsw_state &= 2048 ^ 65535;
    else if (e.keyCode == 84) fsw_state &= 4096 ^ 65535;
    else if (e.keyCode == 89) fsw_state &= 8192 ^ 65535;
    else if (e.keyCode == 85) fsw_state &= 16384 ^ 65535;
    else if (e.keyCode == 73) fsw_state &= 32768 ^ 65535;
    else return true;

    ui_modified = true;
    e.preventDefault();
    return false;
}

// mouse button held down inside canvas:
function mousedown(e) {
    var old_fsw_state = fsw_state;

    // FF does not have offsetX/Y pairs.
    // e.offsetX, e.offsetY is relative mouse position from top-left of canvas:
    var hasOffset = e.offsetX != undefined,
        // TODO: should really recurse into e.target for a general solution
        ex = hasOffset ? e.offsetX : (e.layerX - e.target.offsetLeft),
        ey = hasOffset ? e.offsetY : (e.layerY - e.target.offsetTop);
    var x = ex / dpi, y = ey / dpi;
    var r_sqr = (inFswOuterDiam * 0.5) * (inFswOuterDiam * 0.5);
    var dist;

    // Find out which foot-switch we're nearest to:
    var h = 0, v = 0, b = 0;
    for (v = 0; v < 2; ++v) {
        var b = 1 << (v * 8);
        for (h = 0; h < 8; ++h, b <<= 1) {
            dist = (x - (hLeft + (h * hSpacing))) * (x - (hLeft + (h * hSpacing))) + (y - (vStart - (v * vSpacing))) * (y - (vStart - (v * vSpacing)));
            if (dist < r_sqr) {
                fsw_state |= b;
            }
        }
    }

    if (old_fsw_state !== fsw_state) ui_modified = true;
}

// mouse button released inside canvas:
function mouseup(e) {
    fsw_state = 0;
    ui_modified = true;
}

function touchstart(e) {
    e.preventDefault();

    var old_fsw_state = fsw_state;

    var target = e.target;
    var r_sqr = (inFswOuterDiam * 0.5) * (inFswOuterDiam * 0.5) * 3;
    var dist;

    var t = e.targetTouches;
    for (i = 0; i < t.length; i++) {
        var ex = (t[i].pageX - target.offsetLeft),
            ey = (t[i].pageY - target.offsetTop);
        var x = ex / dpi, y = ey / dpi;

        // Find out which foot-switch we're nearest to:
        var h = 0, v = 0, b = 0;
        for (v = 0; v < 2; ++v) {
            var b = 1 << (v * 8);
            for (h = 0; h < 8; ++h, b <<= 1) {
                dist = (x - (hLeft + (h * hSpacing))) * (x - (hLeft + (h * hSpacing))) + (y - (vStart - (v * vSpacing))) * (y - (vStart - (v * vSpacing)));
                if (dist < r_sqr) {
                    fsw_state |= b;
                }
            }
        }
    }

    if (old_fsw_state !== fsw_state) ui_modified = true;

    return false;
}

function touchend(e) {
    e.preventDefault();

    fsw_state = 0;
    ui_modified = true;

    return false;
}

// ----------------------------- Utility functions:

// fix signed to unsigned:
function i8tou8(v) {
    if (v < 0) {
        return (255 - ~v) & 0xFF;
    }
    return v;
}

function hex2(v) {
    var h = v.toString(16).toUpperCase();
    return ("00" + h).substring(h.length);
}

// ----------------------------- MIDI controller "hardware" interface:

// Pass back the LCD text buffer for the given row:
// char *lcd_row_get(u8 row)
function _lcd_row_get(row) {
    // malloc a 20-byte buffer for the asked-for row of text (0-3):
    if (lcd_rows_text_ptrs[row] == 0) {
        lcd_rows_text_ptrs[row] = Module._malloc(20);
    }
    return lcd_rows_text_ptrs[row];
}

// poll all 16 foot switches' state in a 16-bit word:
function _fsw_poll() { return fsw_state; }

// called to set the new state of the LEDs in a top and bottom row, each 8-bit words:
function _led_set(leds) {
    var bot = leds & 255;
    var top = (leds >>> 8) & 255;

    if (led_state_bot != bot) ui_modified = true;
    if (led_state_top != top) ui_modified = true;

    led_state_bot = bot;
    led_state_top = top;
}

function _lcd_updated_row(row) {
    //assert(row < 4);

    var text_ptr = lcd_rows_text_ptrs[row];
    var prevRowText = lcd_rows[row];
    lcd_rows[row] = '';

    var i;
    for (i = 0; i < 20; ++i) {
        // Read char from RAM:
        var c = Module.getValue(text_ptr + i, 'i8');
        if (c == 0) break;

        // Assume ASCII and append char to string:
        lcd_rows[row] += String.fromCharCode(c & 127);
    }
    // Fill the rest with spaces:
    for (; i < 20; ++i)
        lcd_rows[row] += " ";

    // Notify UI of update if necessary:
    if (prevRowText !== lcd_rows[row])
        ui_modified = true;
}

function _lcd_updated_all() {
    _lcd_updated_row(0);
    _lcd_updated_row(1);
    _lcd_updated_row(2);
    _lcd_updated_row(3);
}

// called to send MIDI command with one data byte:
function _midi_send_cmd1_impl(cmd, data1) {
    cmd = i8tou8(cmd);
    data1 = i8tou8(data1);

    // TODO: add commentary about recognized commands
    var f = "" + hex2(cmd) + " " + hex2(data1) + "\n";
    midi_log(f);

    if (!midiSupport) return;
    if (!midiOutput) return;
    // TODO: maybe queue up bytes and deliver at end of main loop?
    try {
        midiOutput.send([cmd, data1]);
    } catch (e) {
        console.error(e);
    }
}

// called to send MIDI command with two data bytes:
function _midi_send_cmd2_impl(cmd, data1, data2) {
    cmd = i8tou8(cmd);
    data1 = i8tou8(data1);
    data2 = i8tou8(data2);

    // TODO: add commentary about recognized commands
    var f = "" + hex2(cmd) + " " + hex2(data1) + " " + hex2(data2) + "\n";
    midi_log(f);

    if (!midiSupport) return;
    if (!midiOutput) return;
    // TODO: maybe queue up bytes and deliver at end of main loop?
    try {
        midiOutput.send([cmd, data1, data2]);
    } catch (e) {
        console.error(e);
    }
}

function _midi_send_sysex(byte) {
    byte = i8tou8(byte);

    if (sysexMsg === null) {
         if (byte === 0xF0) {
            sysexMsg = [0xF0];
         } else {
            console.error("Attempting to start SysEx message without 0xF0! " + byte);
         }
    } else {
        sysexMsg.push(byte);
        if (byte === 0xF7) {
            if (midiSupport && midiOutput) {
                try {
                    midiOutput.send(sysexMsg);
                } catch (e) {
                    console.error(e);
                }
            }

            try {
                str = ""
                for (var i = 0; i < sysexMsg.length; i++) {
                    str += hex2(sysexMsg[i]) + " ";
                }
                midi_log("" + str + "\n");
            } catch (e) {
                console.error(e);
            }
        }
    }
}

function _midi_log_cwrap(text_ptr) {
    midi_log(Module.UTF8ToString(text_ptr) + "\n");
}

function midi_log(text) {
    midiLog.appendChild(document.createTextNode(text));
    midiLog.scrollTop = midiLog.scrollHeight - midiLogHeight;
}

function _label_row_get(row) {
    if (label_rows_text_ptrs[row] === 0) {
        label_rows_text_ptrs[row] = Module._malloc(8 * 4);
    }
    return label_rows_text_ptrs[row];
}

function _label_row_update(row) {
    var i;
    for (i = 0; i < 8; i++) {
        var p = label_rows_text_ptrs[row] + (4 * i);
        var t = Module.getValue(p, 'i8*');
        labels[row][i] = Module.UTF8ToString(t);
    }
    ui_modified = true;
}

// ----------------------------- Startup:

// Document initialization:
function init() {
    // Polyfill for `requestAnimationFrame`:
    window.requestAnimFrame = (function () {
        return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function (/* function */ callback, /* DOMElement */ element) {
                    window.setTimeout(callback, 1000 / 60);
                };
    })();

    // Set up a scrollable <pre> element to display the MIDI commands sent:
    midiLog = document.getElementById('midiLog');
    midiLogHeight = midiLog.clientHeight;
    //midiLog.style.height = "" + midiLogHeight + "px";
    if (midiLog.style['overflow-y'] !== undefined) {
        midiLog.style['overflow-y'] = "scroll";
    } else {
        // FireFox hack:
        midiLog.style.overflow = '-moz-scrollbars-vertical';
    }

    // Get canvas and its drawing context:
    cvs = document.getElementById('cvs');
    ctx = cvs.getContext('2d');

    // Set up canvas:
    cvs.setAttribute('width', inWidth * dpi);
    cvs.setAttribute('height', inHeight * dpi);

    // Mouse handlers:
    cvs.addEventListener('mousedown', mousedown, true);
    cvs.addEventListener('mouseup', mouseup, true);

    // Touch handlers (mobile):
    cvs.addEventListener('touchstart', touchstart, true);
    cvs.addEventListener('touchend', touchend, true);

    // Keyboard handlers (only work if tabindex attribute is present on canvas element):
    cvs.addEventListener("keydown", keydown, false);
    cvs.addEventListener("keyup", keyup, false);

    // Give the canvas focus:
    cvs.focus();

    var clearMidiOut = document.getElementById('clearMidiOut');
    if (clearMidiOut)
        clearMidiOut.addEventListener('click', function (e) {
            e.preventDefault();
            var c = midiLog.childNodes;
            for (var i = c.length - 1; i >= 0; i--) {
                midiLog.removeChild(c[i]);
            }
            cvs.focus();
            return false;
        });

    // check for web-midi with sysex access:
    midiSupport = null;
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess({sysex: true})
            .then(
                function (access) {
                    midiAccess = access;
                    midiSupport = true;
                    midiOutput = null;

                    var midiSelect = document.getElementById("midiSelect");

                    // onchange event:
                    if (midiSelect) {
                        midiSelect.addEventListener("change", function (e) {
                            if (midiSelect.value == 0) {
                                console.log("disable MIDI");
                                midiOutput = null;
                                return;
                            }

                            midiOutput = midiAccess.outputs.get(parseInt(midiSelect.value, 10));
                            if (midiOutput) {
                                console.log("change MIDI to " + midiOutput.name);
                            } else {
                                console.error("failed to find MIDI by key=" + midiSelect.value);
                            }
                        });
                    }

                    // Could be 0..n outputs; try to select first if any:
                    midiAccess.outputs.forEach(function(output, key) {
                        if (midiSelect) {
                            // Create an <option> for the MIDI output port:
                            var opt = document.createElement("option");
                            opt.setAttribute("value", key);
                            opt.appendChild(document.createTextNode(output.name));
                            midiSelect.appendChild(opt);

                            if (midiOutput === null) {
                                midiOutput = output;
                                midiSelect.value = key;
                            }
                        } else {
                            if (midiOutput === null) {
                                midiOutput = output;
                            }
                        }
                    });

                    startMachine();
                },
                function (err) {
                    midiSupport = false;
                    startMachine();
                }
            );
    } else {
        midiSupport = false;
        startMachine();
    }
}

function startMachine() {
    // Initialize controller:
    // NOTE(jsd): `Module` is the name of the emscripten compiled module; exported functions have a leading '_'.
    Module._controller_init();
    // Render initial UI:
    requestAnimFrame(renderUI);

    // Setup a refresh rate of 10ms:
    setInterval(function () {
        // Handle controller timers and logic:
        Module._controller_10msec_timer();
        Module._controller_handle();

        // Update UI only on changes:
        if (ui_modified) {
            requestAnimFrame(renderUI);
            ui_modified = false;
        }
    }, 10);
}

if (!document.addEventListener) {
    document.attachEvent("onload", init);
} else {
    document.addEventListener("DOMContentLoaded", init, false);
}
