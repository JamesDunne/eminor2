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
/** @const */var flash_size = 4096;
var flash = null;

// ----------------------------- UI code:

var midiLog;
var midiLogHeight = 240;

var cvs, ctx;
//var dpi = 55.4;
/** @const */var dpi = 42;
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
/** @const */var hSpacing = 2.57;

/** @const */var vStart = 5.5;
/** @const */var vSpacing = 2.25;

/** @const */var vLEDOffset = -0.55;

/** @const */var inLEDOuterDiam = (8 /*mm*/ * 0.0393701);
/** @const */var inFswOuterDiam = (12.2 /*mm*/ * 0.0393701);
/** @const */var inFswInnerDiam = (10 /*mm*/ * 0.0393701);

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
    ctx.font = '11px Consolas';
    ctx.lineWidth = 1;
    ctx.fillStyle = "#C0C0C0";
    for (v = 0; v < 4; ++v) {
        if (lcd_rows[v] === undefined) continue;
        dpi_TextOut(lcdCenterX - (70.4 * mmToIn * 0.5), lcdCenterY - (20.8 * mmToIn * 0.5) + (v * 4.76 * mmToIn), lcd_rows[v]);
    }

    ctx.textAlign = "center";
    ctx.font = '9pt Arial Bold';

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
            dpi_TextOut(hLeft + (h * hSpacing), vStart + 0.125 - (v * vSpacing), keylabels[v][h]);
        }

        // 8 evenly spaced 8mm (203.2mil) LEDs above 1-4 preset switches

        // draw inactive LEDs:
        ctx.lineWidth = 3;
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
    var hasOffset = e.hasOwnProperty('offsetX'),
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

// Pass back the LCD text buffer for the given row:
// char *lcd_row_get(u8 row)
function _lcd_row_get(row) {
	// malloc a 20-byte buffer for the asked-for row of text (0-3):
	lcd_rows_text_ptrs[row] = eminorv2._malloc(20);
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
		var c = eminorv2.getValue(text_ptr + i, 'i8');
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
function _midi_send_cmd1(cmd, chan, data1) {
	// TODO: add commentary about recognized commands
	var f = "" + hex1(cmd) + hex1(chan) + " " + hex2(data1) + "\n";
	midiLog.appendChild(document.createTextNode(f));
	midiLog.scrollTop = midiLog.scrollHeight - midiLogHeight;
}

// called to send MIDI command with two data bytes:
function _midi_send_cmd2(cmd, chan, data1, data2) {
	// TODO: add commentary about recognized commands
	var f = "" + hex1(cmd) + hex1(chan) + " " + hex2(data1) + " " + hex2(data2) + "\n";
	midiLog.appendChild(document.createTextNode(f));
	midiLog.scrollTop = midiLog.scrollHeight - midiLogHeight;
}

function init_flash() {
    if (flash == undefined || flash.length < (flash_size * 2)) {
        //flash = new Array(flash_size + 1).join("00");
        flash = "4D6F6E6B65797772656E636800000000000000000440516201010140404050004576656E20466C6F7700000000000000000000000440516202010140404050005A65726F00000000000000000000000000000000044062620301014050405400576F6E64657277616C6C0000000000000000000003405151044141D1C1C1D100427564647920486F6C6C79000000000000000000044051620501014040405000506C75736800000000000000000000000000000004405162060999C8D8C8D800436F6D65204F757420616E6420506C6179000000044051620701014040405000447269766500000000000000000000000000000003405151084141D1C1C1D1005768656E204920436F6D652041726F756E64000004405162090101404040500045766572797468696E67205A656E000000000000054011510A0000D0D0C0D000456E7465722053616E646D616E00000000000000004051620B01014040405000437261776C696E6720696E20746865204461726B044051620C01014040405000536F6E6720320000000000000000000000000000000044440DC1C1C1C1C1C1005365782054797065205468696E67000000000000044051620E010140404050004D72204A6F6E6573000000000000000000000000034051510F4141D1C1C1D100436F756E74696E6720426C756520436172730000044062621019194040505000496E20426C6F6F6D0000000000000000000000000040444411C1C1C1C1C1C10048617368205069706500000000000000000000000440516212010140404050004D79204865726F000000000000000000000000000440516213010140404050004D616368696E656865616400000000000000000004405111140101C1C1C1D100486F6C6964617900000000000000000000000000044051621501014040405000436C6F73696E672054696D650000000000000000044051511601014050405000427261696E737465770000000000000000000000044011621701014040404000426F756E6420666F722074686520466C6F6F72000240115118010140405850004920416C6F6E650000000000000000000000000000405151191901404040500043756D626572736F6D6500000000000000000000044051511A010140404050004C756D7000000000000000000000000000000000044051511B01014040404000486579204A65616C6F7573790000000000000000044051511C010140404050004B727970746F6E69746500000000000000000000044051621D0101404040500044616D6D69740000000000000000000000000000044051511E0101404040500053656D692D636861726D6564204C696665000000044051511F010140404050004D79204F776E20576F72737420456E656D790000044051622001014040404000546865204D6964646C650000000000000000000004401151210000001900000042756C6C6574205769746820427574746572666C0440516222010140404040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000183B021F141D1913041020081705111B2116001A0F020C120D090AFFFFFFFFFF0F0F02090C0216041F051B001A13110A141DFFFFFFFFFFFFFFFFFFFFFFFFFFFF165501090C021216180419130514001A170F1110080D1B150AFFFFFFFFFFFFFF0FF500090C021604170F1413000B0511150AFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
    }
}

// loads a chunk of bytes from persistent storage:
function _flash_load(addr, count, data_ptr) {
    init_flash();

	for (var a = 0; a < count; a++) {
		// unaligned stores! some platforms might take issue with this.
		var v = parseInt(flash.substring((addr + a) * 2, (addr + a) * 2 + 2), 16);
		eminorv2.setValue(data_ptr + a, v, 'i8');
	}
}

// stores a chunk of bytes to persistent storage:
function _flash_store(addr, count, data_ptr) {
	// Verify store does not cross 64-byte boundary!
	var start_chunk = (addr) & ~63;
	var end_chunk = (addr + count - 1) & ~63;
	if (start_chunk !== end_chunk) throw "Flash store cannot cross 64-byte boundary!";

    init_flash();

	// Update the flash string with data read from the heap:
	for (var a = 0; a < count; a++) {
		// unaligned loads! some platforms might take issue with this.
		var v = eminorv2.getValue(data_ptr + a, 'i8');
		var h = hex2(v);
		flash = flash.substring(0, (addr + a) * 2) + h + flash.substring((addr + a) * 2 + 2);
	}
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

if (!document.addEventListener) {
    document.attachEvent("onload", init);
} else {
    document.addEventListener("DOMContentLoaded", init, false);
}
