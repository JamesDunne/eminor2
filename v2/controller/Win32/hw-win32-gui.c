#include <windows.h>
#include <winuser.h>
#include <stdio.h>
#include "../common/types.h"
#include "../common/hardware.h"

LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);

#define IDT_TIMER1 101

static char sClassName[]  = "MyClass";
static HINSTANCE zhInstance = NULL;

const int dpi = 64;
const double inWidth = 9.0;
const double inHeight = 7.0;

/* foot-switch pushed status */
static u32 pushed[8];
/* LED 4-digit display text */
static char leds4_text[5] = "    ";
/* LED 1-digit display text */
static char leds1_text[2] = " ";

static u8 fsw_active = 0;
static u8 led_active[4];
static BOOL mode = TRUE;
static BOOL rom_loaded = FALSE;

static u8 *rom_data = NULL;
static size_t rom_size;

static HWND hwndMain;

HMIDIOUT      outHandle;

void show_midi_output_devices() {
	MIDIOUTCAPS     moc;
	unsigned long iNumDevs, i;

	/* Get the number of MIDI Out devices in this computer */
	iNumDevs = midiOutGetNumDevs();

	/* Go through all of those devices, displaying their names */
	for (i = 0; i < iNumDevs; i++)
	{
		/* Get info about the next device */
		if (!midiOutGetDevCaps(i, &moc, sizeof(MIDIOUTCAPS)))
		{
			/* Display its Device ID and name */
			printf("Device ID #%u: %s\r\n", i, moc.szPname);
		}
	}
}

/* main entry point */
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
	WNDCLASSEX WndClass;
	MSG Msg;
	unsigned long result;

	int i;

	zhInstance = hInstance;

	WndClass.cbSize        = sizeof(WNDCLASSEX);
	WndClass.style         = CS_DBLCLKS;
	WndClass.lpfnWndProc   = WndProc;
	WndClass.cbClsExtra    = 0;
	WndClass.cbWndExtra    = 0;
	WndClass.hInstance     = zhInstance;
	WndClass.hIcon         = LoadIcon(NULL, IDI_APPLICATION);
	WndClass.hIconSm       = LoadIcon(NULL, IDI_APPLICATION);
	WndClass.hCursor       = LoadCursor(NULL, IDC_ARROW);
	WndClass.hbrBackground = (HBRUSH)(COLOR_WINDOW);
	WndClass.lpszMenuName  = NULL;
	WndClass.lpszClassName = sClassName;

	if (!RegisterClassEx(&WndClass)) {
		MessageBox(0, "Error Registering Class!", "Error!", MB_ICONSTOP | MB_OK);
		return 0;
	}

	hwndMain = CreateWindowEx(
		0,
		sClassName,
		"MIDI controller test harness",
		WS_OVERLAPPEDWINDOW,
		CW_USEDEFAULT,
		CW_USEDEFAULT,
		(int)(inWidth * dpi) + 9,
		(int)(inHeight * dpi) + 28,
		NULL,
		NULL,
		zhInstance,
		NULL
	);

	if(hwndMain == NULL) {
		MessageBox(0, "Error Creating Window!", "Error!", MB_ICONSTOP | MB_OK);
		return 0;
	}

	SetTimer(hwndMain,         // handle to main window
		IDT_TIMER1,            // timer identifier
		10,                    // 10-ms interval
		(TIMERPROC) NULL);     // no timer callback

	ShowWindow(hwndMain, nCmdShow);
	UpdateWindow(hwndMain);

	for (i = 0; i < 8; ++i) {
		pushed[i] = 0;
	}
    for (i = 0; i < 4; ++i) {
        led_active[i] = 0;
    }

	/* display the possible MIDI output devices: */
	show_midi_output_devices();

	/* Open the MIDI Mapper */
	result = midiOutOpen(&outHandle, (UINT)-1, 0, 0, CALLBACK_WINDOW);
	if (result) {
		printf("There was an error opening MIDI Mapper!  Disabling MIDI output...\r\n");
	} else {
		printf("Opened MIDI mapper.\r\n");
	}

	/* initialize the logic controller */
	controller_init();

	/* default Win32 message pump */
	while(GetMessage(&Msg, NULL, 0, 0)) {
		TranslateMessage(&Msg);
		DispatchMessage(&Msg);

		/* give control to the logic controller */
		controller_handle();
	}

	return Msg.wParam;
}

/* scaled drawing routines: */

BOOL dpi_MoveTo(HDC hdc, double X, double Y) {
	return MoveToEx(hdc, (int)(X * dpi), (int)(Y * dpi), NULL);
}

BOOL dpi_LineTo(HDC hdc, double X, double Y) {
    return LineTo(hdc, (int)(X * dpi), (int)(Y * dpi));
}

BOOL dpi_Rectangle(HDC hdc, double left, double top, double right, double bottom) {
    return Rectangle(hdc,
		(int)(left * dpi),
		(int)(top * dpi),
		(int)(right * dpi),
		(int)(bottom * dpi)
	);
}

BOOL dpi_CenterEllipse(HDC hdc, double cX, double cY, double rW, double rH) {
    return Ellipse(hdc,
		(int)((cX - rW) * dpi),
		(int)((cY - rH) * dpi),
		(int)((cX + rW) * dpi),
		(int)((cY + rH) * dpi)
	);
}

BOOL dpi_TextOut(HDC hdc, double nXStart, double nYStart, LPCTSTR lpString, int cbString) {
    return TextOut(hdc, (int)(nXStart * dpi), (int)(nYStart * dpi), lpString, cbString);
}

/* paint the face plate window */
void paintFacePlate(HWND hwnd) {
	HDC			hDC;
	PAINTSTRUCT	Ps;
	char		num[2];
    char        *labels1[4] = { "DLY", "CHO", "FLT", "PIT" };
    char        *labels2[4] = { "1", "2", "3", "4" };

	HFONT	fontLED;
	HPEN	penThick, penThin;
	HBRUSH	brsWhite, brsRed, brsGreen, brsBlack;

	int		hCount = 0, vCount = 0;
	double	inH, inV;

	hDC = BeginPaint(hwnd, &Ps);

	fontLED = CreateFont(
		(int)(0.394 * dpi),
		(int)(0.236 * dpi),
		0,
		0,
		FW_SEMIBOLD, FALSE, FALSE, FALSE,
		ANSI_CHARSET,
        OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
        ANTIALIASED_QUALITY,
		DEFAULT_PITCH | FF_ROMAN,
		"Courier New"
	);
	penThick = CreatePen(PS_SOLID, 2, RGB(0, 0, 0));
	penThin  = CreatePen(PS_SOLID, 1, RGB(0, 0, 0));
	brsWhite = CreateSolidBrush(RGB(255, 255, 255));
	brsRed = CreateSolidBrush(RGB(250, 25, 5));
	brsGreen = CreateSolidBrush(RGB(25, 250, 5));
	brsBlack = CreateSolidBrush(RGB(0, 0, 0));

	SetBkMode(hDC, TRANSPARENT);
	SetTextColor(hDC, RGB(32, 64, 127));

#if 0
	/* draw grid at 1/4" sections: */
	for (inH = 0; inH <= inWidth; inH += 0.25, hCount = (hCount + 1) % 4) {
		if (hCount == 0) {
			SelectObject(hDC, penThick);
		} else {
			SelectObject(hDC, penThin);
		}
		dpi_MoveTo(hDC, inH, 0);
		dpi_LineTo(hDC, inH, inHeight);

		vCount = 0;
		for (inV = 0; inV <= inHeight; inV += 0.25, vCount = (vCount + 1) % 4) {
			if (vCount == 0) {
				SelectObject(hDC, penThick);
			} else {
				SelectObject(hDC, penThin);
			}
			dpi_MoveTo(hDC, 0, inV);
			dpi_LineTo(hDC, inWidth, inV);
		}
	}
#endif

	SelectObject(hDC, penThin);
	SelectObject(hDC, brsWhite);

	/* draw 4x evenly spaced foot-switches for controls 1-4 */
	for (hCount = 0; hCount < 4; ++hCount) {
		SelectObject(hDC, penThick);
		dpi_CenterEllipse(hDC, 1.5 + (hCount * 2.0), 3.5, 0.34026, 0.34026);
		SelectObject(hDC, penThin);
		dpi_CenterEllipse(hDC, 1.5 + (hCount * 2.0), 3.5, 0.30, 0.30);
		if (pushed[hCount] != 0) {
			SelectObject(hDC, brsRed);
			dpi_CenterEllipse(hDC, 1.5 + (hCount * 2.0), 3.5, 0.25, 0.25);
			SelectObject(hDC, brsWhite);
		}
        dpi_TextOut(hDC, 1.320 + (hCount * 2.0), 4.0, labels1[hCount], strlen(labels1[hCount]));
	}

	/* draw 4x evenly spaced foot-switches for presets 1-4 */
	for (hCount = 0; hCount < 4; ++hCount) {
		SelectObject(hDC, penThick);
		dpi_CenterEllipse(hDC, 1.5 + (hCount * 2.0), 5.5, 0.34026, 0.34026);
		SelectObject(hDC, penThin);
		dpi_CenterEllipse(hDC, 1.5 + (hCount * 2.0), 5.5, 0.30, 0.30);
		if (pushed[hCount + 4] != 0) {
			SelectObject(hDC, brsRed);
			dpi_CenterEllipse(hDC, 1.5 + (hCount * 2.0), 5.5, 0.25, 0.25);
			SelectObject(hDC, brsWhite);
		}
        dpi_TextOut(hDC, 1.475 + (hCount * 2.0), 6.0, labels2[hCount], strlen(labels2[hCount]));
	}

#if 0
	/* label the DEC, INC, ENTER, NEXT foot-switches */
	dpi_TextOut(hDC, 1.380, 6.0, "1", 3);
	dpi_TextOut(hDC, 3.410, 6.0, "2", 3);
	dpi_TextOut(hDC, 5.300, 6.0, "3", 5);
	dpi_TextOut(hDC, 7.325, 6.0, "4", 4);
#endif

	/* draw 4x evenly spaced 8mm (203.2mil) LEDs above 1-4 preset switches */
	SelectObject(hDC, penThin);
	SelectObject(hDC, brsRed);
	for (hCount = 0; hCount < 4; ++hCount) {
		if (!led_active[hCount]) {
			dpi_CenterEllipse(hDC, 1.5 + (hCount * 2.0), 2.5, 0.2032, 0.2032);
		}
	}

	SelectObject(hDC, brsGreen);
	for (hCount = 0; hCount < 4; ++hCount) {
		if (led_active[hCount]) {
			dpi_CenterEllipse(hDC, 1.5 + (hCount * 2.0), 2.5, 0.2032, 0.2032);
		}
	}

	/* write the 4-digit and 1-digit LED displays */
	SetBkMode(hDC, OPAQUE);
	SetBkColor(hDC, RGB(40,10,10));
	SetTextColor(hDC, RGB(255,0,0));
	SelectObject(hDC, fontLED);
	dpi_TextOut(hDC, 1.02, 1.02, leds4_text, 4);
	dpi_TextOut(hDC, 7.48, 1.02, leds1_text, 1);
	DeleteObject(fontLED);

	/* draw PRACTICE/CONCERT slider-switch */
	if (mode) {
		/* CONCERT mode */
		SelectObject(hDC, brsBlack);
		dpi_Rectangle(hDC, 5.35, 1.2, 5.5, 1.3);
		SelectObject(hDC, brsRed);
		dpi_Rectangle(hDC, 5.5, 1.2, 5.65, 1.3);
	} else {
		/* PRACTICE mode */
		SelectObject(hDC, brsBlack);
		dpi_Rectangle(hDC, 5.5, 1.2, 5.65, 1.3);
		SelectObject(hDC, brsRed);
		dpi_Rectangle(hDC, 5.35, 1.2, 5.5, 1.3);
	}

	DeleteObject(brsRed);
	DeleteObject(brsGreen);
	DeleteObject(penThick);
	DeleteObject(penThin);

	EndPaint(hwnd, &Ps);
}

/* message processing function: */
LRESULT CALLBACK WndProc(HWND hwnd, UINT Message, WPARAM wParam, LPARAM lParam) {
	switch (Message) {
		case WM_CLOSE:
			DestroyWindow(hwnd);
			break;
		case WM_DESTROY:
			/* Close the MIDI device */
			if (outHandle != 0) {
				if (midiOutClose(outHandle)) {
					printf("There was a problem closing the MIDI mapper.\r\n");
				} else {
					printf("Closed MIDI mapper.\r\n");
				}
			}
			PostQuitMessage(0);
			break;
		case WM_PAINT:
			paintFacePlate(hwnd);
			break;
		case WM_KEYDOWN:
			/* only fire if the previous button state was UP (i.e. ignore autorepeat messages) */
			if ((lParam & (1<<30)) == 0) {
				switch (wParam) {
					case 'Q': case 'q': pushed[0] = 1; break;
					case 'W': case 'w': pushed[1] = 1; break;
					case 'E': case 'e': pushed[2] = 1; break;
					case 'R': case 'r': pushed[3] = 1; break;
					case 'A': case 'a': pushed[4] = 1; break;
					case 'S': case 's': pushed[5] = 1; break;
					case 'D': case 'd': pushed[6] = 1; break;
					case 'F': case 'f': pushed[7] = 1; break;
				}
				/* TODO: fix to only redraw affected button */
				InvalidateRect(hwnd, NULL, TRUE);
			}
			break;
		case WM_KEYUP:
			/* handle toggle button up */
			switch (wParam) {
				case 'Q': case 'q': pushed[0] = 0; break;
				case 'W': case 'w': pushed[1] = 0; break;
				case 'E': case 'e': pushed[2] = 0; break;
				case 'R': case 'r': pushed[3] = 0; break;
				case 'A': case 'a': pushed[4] = 0; break;
				case 'S': case 's': pushed[5] = 0; break;
				case 'D': case 'd': pushed[6] = 0; break;
				case 'F': case 'f': pushed[7] = 0; break;

				case 'M': case 'm': mode = !mode; break;
			}
			/* TODO: fix to only redraw affected button */
			InvalidateRect(hwnd, NULL, TRUE);
			break;
		case WM_TIMER:
			switch (wParam) {
				case IDT_TIMER1: controller_10msec_timer(); break;
			}
			break;
		default:
			return DefWindowProc(hwnd, Message, wParam, lParam);
	}
	return 0;
}

/* --------------- LED read-out display functions: */

/* show 4 alphas on the 4-digit display */
void leds_show_4alphas(char text[LEDS_MAX_ALPHAS]) {
	strncpy(leds4_text, text, 4);
	InvalidateRect(hwndMain, NULL, TRUE);
}

/* show single digit on the single digit display */
void leds_show_1digit(u8 value) {
	sprintf(leds1_text, "%1d", value);
	InvalidateRect(hwndMain, NULL, TRUE);
}

/* --------------- Momentary toggle foot-switches: */

/* Poll up to 28 foot-switch toggles simultaneously.  DEC INC ENTER NEXT map to 28-31 bit positions. */
u32 fsw_poll() {
	return ((u32)pushed[0] << FSB_CONTROL_1) |
		   ((u32)pushed[1] << FSB_CONTROL_2) |
		   ((u32)pushed[2] << FSB_CONTROL_3) |
		   ((u32)pushed[3] << FSB_CONTROL_4) |
		   ((u32)pushed[4] << FSB_PRESET_1) |
		   ((u32)pushed[5] << FSB_PRESET_2) |
		   ((u32)pushed[6] << FSB_PRESET_3) |
		   ((u32)pushed[7] << FSB_PRESET_4);
}

/* Set currently active program foot-switch's LED indicator and disable all others */
void fsw_led_set_active(int idx) {
	int i;
	for (i = 0; i < 4; ++i) {
		led_active[i] = 0;
	}
	led_active[idx] = 1;
	InvalidateRect(hwndMain, NULL, TRUE);
}

/* Explicitly enable a single LED without affecting the others */
void fsw_led_enable(int idx) {
	led_active[idx] = 1;
	InvalidateRect(hwndMain, NULL, TRUE);
}

/* Explicitly disable a single LED without affecting the others */
void fsw_led_disable(int idx) {
	led_active[idx] = 0;
	InvalidateRect(hwndMain, NULL, TRUE);
}

/* --------------- External inputs: */

/* Poll the slider switch to see which mode we're in: */
u8 slider_poll() {
	return (mode ? 1 : 0);
}

/* Poll the expression pedal's data (0-127): */
u8 expr_poll() {
    return 0;
}

/* --------------- Data persistence functions: */

void load_eeprom() {
	FILE	*f = fopen("eeprom.bin", "rb");
	fseek(f, 0, SEEK_END);
	rom_size = ftell(f);
	fseek(f, 0, SEEK_SET);

	rom_data = malloc(sizeof(u8) * 24 * 1024);
	memset(rom_data, 0, sizeof(u8) * 24 * 1024);

	fread(rom_data, rom_size, sizeof(u8), f);
	fclose(f);

	rom_loaded = TRUE;
}

void read_eeprom(u8 chunk[64], u16 addr) {
	/* copy 64-byte chunk from rom_data: */
	memcpy(chunk, rom_data + addr, 64);
}

void write_eeprom(u8 chunk[64], u16 addr) {
	FILE *f;

	/* copy 64-byte chunk to rom_data: */
	memcpy(rom_data + addr, chunk, 64);
	/* flush the rom_data to the file: */
	f = fopen("eeprom.bin", "wb");
	fseek(f, 0, SEEK_SET);
	fwrite(rom_data, 24 * 1024, sizeof(u8), f);
	fclose(f);
}

/* Gets number of stored banks */
u16 banks_count() {
	u16	count;

	/* load from eeprom.bin */
	if (!rom_loaded) load_eeprom();

	/* read the bank count: */
	count = *((u16 *)&(rom_data[0]));
	return count;
}

/* Count in bits:

Padded bit-packed storage:
	32 bits bank name
	(16 bits per preset for 8-bit program # + 8-bit controller #) * 4 presets = 64 bits
	4 bits padding
	4 bits for sequence count
	2 bits per sequence no * 8 sequences max = 16 bits for sequence program
	8 bits padding

	32 + 64 + 4 + 4 + 16 + 8 = 128 bits = 16 bytes
*/
const u8 bank_record_size = 16;

/* Loads a bank into the specified arrays: */
void bank_load(u16 bank_index, char name[BANK_NAME_MAXLENGTH], u8 bank[BANK_PRESET_COUNT], u8 bankcontroller[BANK_PRESET_COUNT], u8 bankmap[BANK_MAP_COUNT], u8 *bankmap_count) {
	u16	count;
	u16	addr;

	/* load from eeprom.bin */
	if (!rom_loaded) load_eeprom();

	/* read the bank count: */
	count = *((u16 *)&(rom_data[0]));
	if (bank_index >= count) {
		return;
	}

	/* load the bit-compressed data */
	addr = 64 + (bank_index * bank_record_size);

	name[0] = rom_data[addr+0] & 0x7F;
	name[1] = rom_data[addr+1] & 0x7F;
	name[2] = rom_data[addr+2] & 0x7F;
	name[3] = rom_data[addr+3] & 0x7F;

	bank[0] = rom_data[addr+4] & 0x7F;
	bank[1] = rom_data[addr+5] & 0x7F;
	bank[2] = rom_data[addr+6] & 0x7F;
	bank[3] = rom_data[addr+7] & 0x7F;

	bankcontroller[0] = rom_data[addr+ 8] & 0x7F;
	bankcontroller[1] = rom_data[addr+ 9] & 0x7F;
	bankcontroller[2] = rom_data[addr+10] & 0x7F;
	bankcontroller[3] = rom_data[addr+11] & 0x7F;

	/* count is stored 0-7, but means 1-8 so add 1 */
	*bankmap_count = (rom_data[addr+12] & 0x07) + 1;
	/* load 8x 2-bit (0-3) values from the next few bytes for the sequence: */
	bankmap[0] = ((rom_data[addr+13] & 0xC0) >> 6);
	bankmap[1] = ((rom_data[addr+13] & 0x30) >> 4);
	bankmap[2] = ((rom_data[addr+13] & 0x0C) >> 2);
	bankmap[3] = ((rom_data[addr+13] & 0x03));
	bankmap[4] = ((rom_data[addr+14] & 0xC0) >> 6);
	bankmap[5] = ((rom_data[addr+14] & 0x30) >> 4);
	bankmap[6] = ((rom_data[addr+14] & 0x0C) >> 2);
	bankmap[7] = ((rom_data[addr+14] & 0x03));

	/* 8 free bits left before next 16-byte boundary */
}

/* Load bank name for browsing through banks: */
void bank_loadname(u16 bank_index, char name[BANK_NAME_MAXLENGTH]) {
	u16	count;
	u16	addr;

	/* load from eeprom.bin */
	if (!rom_loaded) load_eeprom();

	/* read the bank count: */
	count = *((u16 *)&(rom_data[0]));
	if (bank_index >= count) {
		return;
	}

	/* load the bit-compressed data */
	addr = 64 + (bank_index * bank_record_size);

	name[0] = rom_data[addr+0] & 0x7F;
	name[1] = rom_data[addr+1] & 0x7F;
	name[2] = rom_data[addr+2] & 0x7F;
	name[3] = rom_data[addr+3] & 0x7F;
}

/* Stores the programs back to the bank: */
void bank_store(u16 bank_index, u8 bank[BANK_PRESET_COUNT], u8 bankcontroller[BANK_PRESET_COUNT], u8 bankmap[BANK_MAP_COUNT], u8 bankmap_count) {
	u8 chunk[64];
	u16	addr, addrhi, addrlo;

	addr = 64 + (bank_index * bank_record_size);
	addrhi = addr & ~63;
	addrlo = addr & 63;

	/* load the 64-byte aligned chunk: */
	read_eeprom(chunk, addrhi);

	/* overwrite the bank program section for the bank record: */
	chunk[addrlo+4] = bank[0];
	chunk[addrlo+5] = bank[1];
	chunk[addrlo+6] = bank[2];
	chunk[addrlo+7] = bank[3];

	chunk[addrlo+ 8] = bankcontroller[0] & 0x7F;
	chunk[addrlo+ 9] = bankcontroller[1] & 0x7F;
	chunk[addrlo+10] = bankcontroller[2] & 0x7F;
	chunk[addrlo+11] = bankcontroller[3] & 0x7F;

	/* count is stored 0-7, but means 1-8 so subtract 1 */
	chunk[addrlo+12] = (bankmap_count - 1) & 0x07;
	/* store 8x 2-bit (0-3) values to the next few bytes for the sequence: */
	chunk[addrlo+13] = ((bankmap[0] & 0x03) << 6) |
					   ((bankmap[1] & 0x03) << 4) |
					   ((bankmap[2] & 0x03) << 2) |
					    (bankmap[3] & 0x03);
	chunk[addrlo+14] = ((bankmap[4] & 0x03) << 6) |
					   ((bankmap[5] & 0x03) << 4) |
					   ((bankmap[6] & 0x03) << 2) |
					    (bankmap[7] & 0x03);

	/* write back the 64-byte chunk: */
	write_eeprom(chunk, (64 + (bank_index * bank_record_size)) & ~63);
}

/* Look up a bank # in the sorted index */
u16 bank_getsortedindex(u16 sort_index) {
	u16	count;
	u16	addr;

	/* load from eeprom.bin */
	if (!rom_loaded) load_eeprom();

	/* read the bank count: */
	count = *((u16 *)&(rom_data[0]));
	if (sort_index >= count) {
		return count;
	}

	/* read the bank index given the sort index location: */
	addr = 64 + (count * bank_record_size) + (sort_index * sizeof(u16));
	return *((u16 *)&(rom_data[addr]));
}

/* --------------- MIDI I/O functions: */

/* Send formatted MIDI commands.

	0 <= cmd <= F       - MIDI command
	0 <= channel <= F   - MIDI channel to send command to
	00 <= data1 <= FF   - data byte of MIDI command
*/
void midi_send_cmd1(u8 cmd, u8 channel, u8 data1) {
	printf("MIDI: cmd=%1X, chan=%1X, %02X\r\n", cmd, channel, data1);
	if (outHandle != 0) {
		/* send the MIDI command to the opened MIDI Mapper device: */
		midiOutShortMsg(outHandle, ((cmd & 0xF) << 4) | (channel & 0xF) | ((u32)data1 << 8));
	}
}

/* Send formatted MIDI commands.

	0 <= cmd <= F       - MIDI command
	0 <= channel <= F   - MIDI channel to send command to
	00 <= data1 <= FF   - first data byte of MIDI command
	00 <= data2 <= FF   - second (optional) data byte of MIDI command
*/
void midi_send_cmd2(u8 cmd, u8 channel, u8 data1, u8 data2) {
	printf("MIDI: cmd=%1X, chan=%1X, %02X %02X\r\n", cmd, channel, data1, data2);
	if (outHandle != 0) {
		/* send the MIDI command to the opened MIDI Mapper device: */
		midiOutShortMsg(outHandle, ((cmd & 0xF) << 4) | (channel & 0xF) | ((u32)data1 << 8) | ((u32)data2 << 16));
	}
}
