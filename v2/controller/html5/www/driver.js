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

// ----------------------------- UI code:

var midiLog;
var midiLogHeight = 240;

var cvs, ctx;
//var dpi = 55.4;
var dpi = 42;

var labels = [
    ["COMP", "FILTER", "PITCH", "CHORUS", "DELAY", "REVERB", "MUTE", "PREV"],
    ["CH1", "CH1S", "CH2", "CH2S", "CH3", "CH3S", "TAP", "NEXT"]
];

var keylabels = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I"],
    ["A", "S", "D", "F", "G", "H", "J", "K"]
];

// Total width, height in inches:
var inWidth = 20.0;
var inHeight = 7.0;

// Position and spacing of footswitches (from centers):
var vStart = 2.5;
var hLeft = 1.0;
var hSpacing = 2.57;
var vSpacing = 3.15;

// was 0.2032
var inLEDOuterDiam = (8 /*mm*/ * 0.01 * 2.54);

// was 0.34026
var inFswOuterDiam = (12.2 /*mm*/ * 0.01 * 2.54);
// was 0.30
var inFswInnerDiam = (10 /*mm*/ * 0.01 * 2.54);

function dpi_MoveTo(X, Y) {
    ctx.moveTo(X * dpi, Y * dpi);
}

function dpi_LineTo(X, Y) {
    ctx.lineTo(X * dpi, Y * dpi);
}

function dpi_CenterCircle(cX, cY, r) {
    ctx.arc(cX * dpi, cY * dpi, r * dpi, 0, 2 * Math.PI);
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

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = '10pt Arial Bold';

    // 2 rows of foot switches:
    for (v = 0; v < 2; ++v) {
        var led_state = (v == 0) ? led_state_top : led_state_bot;

        // draw 2 rows of 8 evenly spaced foot-switches
        var b = 1 << (v * 8);
        for (h = 0; h < 8; ++h, b <<= 1) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#808080";
            ctx.fillStyle = "#C0C0C0";
            dpi_FillAndStrokeCircle(hLeft + (h * hSpacing), vStart + (v * vSpacing), inFswOuterDiam);

            ctx.lineWidth = 1;
            dpi_FillAndStrokeCircle(hLeft + (h * hSpacing), vStart + (v * vSpacing), inFswInnerDiam);
            if (fsw_state & b) {
                // Foot switch is depressed:
                ctx.fillStyle = "#606060";
                dpi_FillAndStrokeCircle(hLeft + (h * hSpacing), vStart + (v * vSpacing), inFswOuterDiam);
            }

            // Set label color:
            if (v == 0 && h < 6)
                ctx.fillStyle = "#4040C0";
            else if (v == 1 && h < 6)
                ctx.fillStyle = "#40C040";
            else
                ctx.fillStyle = "#E0E0E0";

            ctx.lineWidth = 1;
            dpi_TextOut(hLeft + (h * hSpacing), vStart + 0.5 + (v * vSpacing), labels[v][h]);

            // Label w/ the keyboard key:
            ctx.fillStyle = "#601010";
            dpi_TextOut(hLeft + (h * hSpacing), vStart + 0.75 + (v * vSpacing), keylabels[v][h]);
        }

        // 8 evenly spaced 8mm (203.2mil) LEDs above 1-4 preset switches

        // draw inactive LEDs:
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#202020";
        ctx.fillStyle = "#081E03";
        b = 1;
        for (h = 0; h < 8; ++h, b <<= 1) {
            if ((led_state & b) == 0) {
                dpi_FillAndStrokeCircle(hLeft + (h * hSpacing), vStart - 0.7 + (v * vSpacing), inLEDOuterDiam);
            }
        }

        // draw active LEDs:
        ctx.fillStyle = "#19FA05";
        b = 1;
        for (h = 0; h < 8; ++h, b <<= 1) {
            if (led_state & b) {
                dpi_FillAndStrokeCircle(hLeft + (h * hSpacing), vStart - 0.7 + (v * vSpacing), inLEDOuterDiam);
            }
        }
    }

    ctx.restore();
}

function keydown(e) {
    if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return false;

    // QWERTYUI for top row:
    if (e.keyCode == 81) fsw_state |= 1;
    else if (e.keyCode == 87) fsw_state |= 2;
    else if (e.keyCode == 69) fsw_state |= 4;
    else if (e.keyCode == 82) fsw_state |= 8;
    else if (e.keyCode == 84) fsw_state |= 16;
    else if (e.keyCode == 89) fsw_state |= 32;
    else if (e.keyCode == 85) fsw_state |= 64;
    else if (e.keyCode == 73) fsw_state |= 128;
        // ASDFGHJK for bottom row:
    else if (e.keyCode == 65) fsw_state |= 256;
    else if (e.keyCode == 83) fsw_state |= 512;
    else if (e.keyCode == 68) fsw_state |= 1024;
    else if (e.keyCode == 70) fsw_state |= 2048;
    else if (e.keyCode == 71) fsw_state |= 4096;
    else if (e.keyCode == 72) fsw_state |= 8192;
    else if (e.keyCode == 74) fsw_state |= 16384;
    else if (e.keyCode == 75) fsw_state |= 32768;
    else return true;

    ui_modified = true;
    e.preventDefault();
    return false;
}

function keyup(e) {
    if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return false;

    // QWERTYUI for top row:
    if (e.keyCode == 81) fsw_state &= 1 ^ 65535;
    else if (e.keyCode == 87) fsw_state &= 2 ^ 65535;
    else if (e.keyCode == 69) fsw_state &= 4 ^ 65535;
    else if (e.keyCode == 82) fsw_state &= 8 ^ 65535;
    else if (e.keyCode == 84) fsw_state &= 16 ^ 65535;
    else if (e.keyCode == 89) fsw_state &= 32 ^ 65535;
    else if (e.keyCode == 85) fsw_state &= 64 ^ 65535;
    else if (e.keyCode == 73) fsw_state &= 128 ^ 65535;
        // ASDFGHJK for bottom row:
    else if (e.keyCode == 65) fsw_state &= 256 ^ 65535;
    else if (e.keyCode == 83) fsw_state &= 512 ^ 65535;
    else if (e.keyCode == 68) fsw_state &= 1024 ^ 65535;
    else if (e.keyCode == 70) fsw_state &= 2048 ^ 65535;
    else if (e.keyCode == 71) fsw_state &= 4096 ^ 65535;
    else if (e.keyCode == 72) fsw_state &= 8192 ^ 65535;
    else if (e.keyCode == 74) fsw_state &= 16384 ^ 65535;
    else if (e.keyCode == 75) fsw_state &= 32768 ^ 65535;
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
    var hasOffset = e.hasOwnProperty('offsetX'),
        // TODO: should really recurse into e.target for a general solution
        ex = hasOffset ? e.offsetX : (e.layerX - e.target.offsetLeft),
        ey = hasOffset ? e.offsetY : (e.layerY - e.target.offsetTop);
    var x = ex / dpi, y = ey / dpi;
    var r_sqr = inFswOuterDiam * inFswOuterDiam;
    var dist;

    // Find out which foot-switch we're nearest to:
    var h = 0, v = 0, b = 0;
    for (v = 0; v < 2; ++v) {
        var b = 1 << (v * 8);
        for (h = 0; h < 8; ++h, b <<= 1) {
            dist = (x - (hLeft + (h * hSpacing))) * (x - (hLeft + (h * hSpacing))) + (y - (vStart + (v * vSpacing))) * (y - (vStart + (v * vSpacing)));
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

// ----------------------------- Utility functions:

function hex1(v) {
    var h = v.toString(16).toUpperCase();
    return (h).substring(0, 1);
}
function hex2(v) {
    var h = v.toString(16).toUpperCase();
    return ("00" + h).substring(h.length);
}

// ----------------------------- MIDI controller "hardware" interface:

// poll all 16 foot switches' state in a 16-bit word:
function _fsw_poll() { return fsw_state; }

// called to set the new state of the LEDs in a top and bottom row, each 8-bit words:
function _led_set(top, bot) {
    if (led_state_top != top) ui_modified = true;
    if (led_state_bot != bot) ui_modified = true;

    led_state_top = top;
    led_state_bot = bot;
}

// called to send MIDI command with one data byte:
function _midi_send_cmd1(cmd, chan, data1) {
    var f = "" + hex1(cmd) + hex1(chan) + " " + hex2(data1) + "\n";
    midiLog.appendChild(document.createTextNode(f));
    midiLog.scrollTop = midiLog.scrollHeight - midiLogHeight;
}

// called to send MIDI command with two data bytes:
function _midi_send_cmd2(cmd, chan, data1, data2) {
    var f = "" + hex1(cmd) + hex1(chan) + " " + hex2(data1) + " " + hex2(data2) + "\n";
    midiLog.appendChild(document.createTextNode(f));
    midiLog.scrollTop = midiLog.scrollHeight - midiLogHeight;
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
    cvs.addEventListener('mousedown', mousedown, true);
    cvs.addEventListener('mouseup', mouseup, true);

    // Keyboard handlers (only work if tabindex attribute is present on canvas element):
    cvs.addEventListener("keydown", keydown, false);
    cvs.addEventListener("keyup", keyup, false);

    // Give the canvas focus:
    cvs.focus();

    // Initialize controller:
    // NOTE(jsd): `eminorv2` is the name of the emscripten compiled module; exported functions have a leading '_'.
    eminorv2._controller_init();
    // Render initial UI:
    requestAnimFrame(renderUI);

    // Setup a refresh rate of 10ms:
    setInterval(function () {
        // Handle controller timers and logic:
        eminorv2._controller_10msec_timer();
        eminorv2._controller_handle();

        // Update UI only on changes:
        if (ui_modified) {
            requestAnimFrame(renderUI);
            ui_modified = false;
        }
    }, 10);
}

document.addEventListener("DOMContentLoaded", init, false);
