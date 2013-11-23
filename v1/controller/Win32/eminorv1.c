#include <windows.h>
#include <winuser.h>
#include <stdio.h>
#include <string.h>
#include <assert.h>
#include "../common/types.h"
#include "../common/hardware.h"

LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);

#define IDT_TIMER1 101

static char sClassName[] = "MyClass";
static HINSTANCE zhInstance = NULL;

const double defaultDpi = 55.4;    // NOTE(jsd): This is to-scale on my 40" Samsung HDTV 1080p
static double dpi = 55.4;
const double inWidth = 9.0;
const double inHeight = 7.0;

static LPCWSTR labels1[4] = { L"DLY/CMP", L"CHO/MUTE", L"FLT/STORE", L"PIT/EXIT" };
static LPCWSTR labels2[4] = { L"CH1/-5", L"CH2/-1", L"CH3/+1", L"CH4/+5" };

/* foot-switch pushed status */
static u32 pushed[8];
/* LED 4-digit display text */
static wchar_t leds4_text[5] = L"    ";
/* LED 1-digit display text */
static wchar_t leds1_text[2] = L" ";

static u8 fsw_active = 0;
static u8 led_active[4];
static BOOL mode = TRUE;
static BOOL rom_loaded = FALSE;

static u8 *rom_data = NULL;
static size_t rom_size;

static HWND hwndMain;

HMIDIOUT    outHandle;

void show_midi_output_devices() {
    MIDIOUTCAPS     moc;
    unsigned long iNumDevs, i;

    // Get the number of MIDI Out devices in this computer
    iNumDevs = midiOutGetNumDevs();

    // Go through all of those devices, displaying their names
    if (iNumDevs > 0) {
        printf("MIDI Devices:\r\n");
    }

    for (i = 0; i < iNumDevs; i++) {
        // Get info about the next device
        if (!midiOutGetDevCaps(i, &moc, sizeof(MIDIOUTCAPS))) {
            // Display its Device ID and name
            printf("  #%d: %ls\r\n", i, moc.szPname);
        }
    }
}

/* main entry point */
int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, PWSTR pCmdLine, int nCmdShow) {
    WNDCLASSEXW WndClass;
    MSG Msg;
    unsigned long result;

    int i;

    zhInstance = hInstance;

    WndClass.cbSize = sizeof(WNDCLASSEXW);
    WndClass.style = 0; // disable CS_DBLCLKS
    WndClass.lpfnWndProc = WndProc;
    WndClass.cbClsExtra = 0;
    WndClass.cbWndExtra = 0;
    WndClass.hInstance = zhInstance;
    WndClass.hIcon = LoadIcon(NULL, IDI_APPLICATION);
    WndClass.hIconSm = LoadIcon(NULL, IDI_APPLICATION);
    WndClass.hCursor = LoadCursor(NULL, IDC_ARROW);
    WndClass.hbrBackground = NULL;
    //WndClass.hbrBackground = (HBRUSH)(COLOR_WINDOW);
    WndClass.lpszMenuName = NULL;
    WndClass.lpszClassName = L"MyClass";

    if (!RegisterClassExW(&WndClass)) {
        MessageBoxW(0, L"Error Registering Class!", L"Error!", MB_ICONSTOP | MB_OK);
        return 0;
    }

    hwndMain = CreateWindowExW(
        0,
        L"MyClass",
        L"MIDI controller test harness",
        WS_OVERLAPPEDWINDOW & ~WS_THICKFRAME,
        CW_USEDEFAULT,
        CW_USEDEFAULT,
        (int)(inWidth * dpi) + 6,
        (int)(inHeight * dpi) + 28,
        NULL,
        NULL,
        zhInstance,
        NULL
        );

    if (hwndMain == NULL) {
        MessageBoxW(0, L"Error Creating Window!", L"Error!", MB_ICONSTOP | MB_OK);
        return 0;
    }

    // TODO: really should FreeConsole() and fclose(stdout) later but it'll be open til process end anyway.
    AllocConsole();
    freopen("CONOUT$", "wb", stdout);

    SetTimer(hwndMain,         // handle to main window
        IDT_TIMER1,            // timer identifier
        10,                    // 10-ms interval
        (TIMERPROC)NULL);     // no timer callback

    ShowWindow(hwndMain, nCmdShow);
    UpdateWindow(hwndMain);

    /* display the possible MIDI output devices: */
    show_midi_output_devices();
    // Open the MIDI Mapper
    UINT midiDeviceID = (UINT)1;
    if (wcslen(pCmdLine) > 0) {
        if (swscanf(pCmdLine, L"%d", &midiDeviceID) == 0)
            midiDeviceID = (UINT)1;
    }
    printf("Opening MIDI device ID #%d...\r\n", midiDeviceID);
    result = midiOutOpen(&outHandle, midiDeviceID, 0, 0, CALLBACK_WINDOW);
    if (result)
        printf("There was an error opening MIDI device!  Disabling MIDI output...\r\n\r\n");
    else
        printf("Opened MIDI device successfully.\r\n\r\n");

    // initialize UI bits:
    for (i = 0; i < 8; ++i) {
        pushed[i] = 0;
    }
    for (i = 0; i < 4; ++i) {
        led_active[i] = 0;
    }

    /* initialize the logic controller */
    controller_init();

    /* default Win32 message pump */
    while (GetMessage(&Msg, NULL, 0, 0)) {
        TranslateMessage(&Msg);
        DispatchMessage(&Msg);

        /* give control to the logic controller */
        controller_handle();
    }

    return 0;
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

BOOL dpi_TextOut(HDC hdc, double nXStart, double nYStart, LPCWSTR lpString, int cbString) {
    return TextOutW(hdc, (int)(nXStart * dpi), (int)(nYStart * dpi), lpString, cbString);
}

/* paint the face plate window */
void paintFacePlate(HWND hwnd) {
    HDC			hDC;
    PAINTSTRUCT	ps;
    char		num[2];

    HFONT	fontLED;
    HPEN	penThick, penThin;
    HBRUSH	brsWhite, brsDarkRed, brsRed, brsGreen, brsBlack;

    int		hCount = 0, vCount = 0;
    double	inH, inV;

    RECT client_rect;
    GetClientRect(hwnd, &client_rect);
    int win_width = client_rect.right - client_rect.left;
    int win_height = client_rect.bottom + client_rect.left;
    HDC Memhdc;
    HDC orighdc;
    HBITMAP Membitmap;
    orighdc = BeginPaint(hwnd, &ps);
    hDC = Memhdc = CreateCompatibleDC(orighdc);
    Membitmap = CreateCompatibleBitmap(orighdc, win_width, win_height);
    SelectObject(hDC, Membitmap);

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
        L"Courier New"
    );
    penThick = CreatePen(PS_SOLID, 2, RGB(0, 0, 0));
    penThin = CreatePen(PS_SOLID, 1, RGB(0, 0, 0));
    brsWhite = CreateSolidBrush(RGB(255, 255, 255));
    brsDarkRed = CreateSolidBrush(RGB(120, 12, 3));
    brsRed = CreateSolidBrush(RGB(250, 25, 5));
    brsGreen = CreateSolidBrush(RGB(25, 250, 5));
    brsBlack = CreateSolidBrush(RGB(0, 0, 0));

    SetBkMode(hDC, TRANSPARENT);
    SetTextAlign(hDC, TA_CENTER | VTA_TOP);
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
        dpi_TextOut(hDC, 1.5 + (hCount * 2.0), 4.0, labels1[hCount], (int)wcslen(labels1[hCount]));
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
        dpi_TextOut(hDC, 1.5 + (hCount * 2.0), 6.0, labels2[hCount], (int)wcslen(labels2[hCount]));
    }

    /* draw 4x evenly spaced 8mm (203.2mil) LEDs above 1-4 preset switches */
    SelectObject(hDC, penThin);
    SelectObject(hDC, brsDarkRed);
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
    SetBkColor(hDC, RGB(40, 10, 10));
    SetTextColor(hDC, RGB(255, 0, 0));
    SelectObject(hDC, fontLED);
    dpi_TextOut(hDC, 6.78, 1.02, leds1_text, 1);
    dpi_TextOut(hDC, 7.48, 1.02, leds4_text, 4);
    DeleteObject(fontLED);

    /* draw mode slider-switch */
    if (mode) {
        /* CONCERT mode */
        SelectObject(hDC, brsDarkRed);
        dpi_Rectangle(hDC, 4.35, 1.2, 4.5, 1.4);
        SelectObject(hDC, brsRed);
        dpi_Rectangle(hDC, 4.5, 1.2, 4.65, 1.4);
    } else {
        /* PRACTICE mode */
        SelectObject(hDC, brsDarkRed);
        dpi_Rectangle(hDC, 4.5, 1.2, 4.65, 1.4);
        SelectObject(hDC, brsRed);
        dpi_Rectangle(hDC, 4.35, 1.2, 4.5, 1.4);
    }

    // Copy memory buffer to screen:
    BitBlt(orighdc, 0, 0, win_width, win_height, Memhdc, 0, 0, SRCCOPY);

    DeleteObject(penThick);
    DeleteObject(penThin);
    DeleteObject(fontLED);

    DeleteObject(brsWhite);
    DeleteObject(brsDarkRed);
    DeleteObject(brsRed);
    DeleteObject(brsGreen);
    DeleteObject(brsBlack);

    DeleteObject(Membitmap);
    DeleteDC(Memhdc);
    DeleteDC(orighdc);

    EndPaint(hwnd, &ps);
}

/* message processing function: */
LRESULT CALLBACK WndProc(HWND hwnd, UINT Message, WPARAM wParam, LPARAM lParam) {
    RECT rect;
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
        case WM_MOUSEWHEEL:
            if (GET_WHEEL_DELTA_WPARAM(wParam) > 0) {
                // mwheel up
                dpi += 0.25 * (GET_KEYSTATE_WPARAM(wParam) & MK_CONTROL ? 10.0 : 1.0);
            } else {
                // mwheel down
                dpi -= 0.25 * (GET_KEYSTATE_WPARAM(wParam) & MK_CONTROL ? 10.0 : 1.0);
                if (dpi < 1.0) dpi = 1.0;
            }
            GetWindowRect(hwnd, &rect);
            SetWindowPos(hwnd, 0, rect.left, rect.top, (int)(inWidth * dpi) + 6, (int)(inHeight * dpi) + 28, SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE);
            InvalidateRect(hwnd, NULL, TRUE);
            break;
        case WM_KEYDOWN:
            /* only fire if the previous button state was UP (i.e. ignore autorepeat messages) */
            if ((lParam & (1 << 30)) == 0) {
                // ESC quits:
                if (wParam == VK_ESCAPE) {
                    DestroyWindow(hwnd);
                    break;
                }
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
    leds4_text[0] = text[0];
    leds4_text[1] = text[1];
    leds4_text[2] = text[2];
    leds4_text[3] = text[3];
    InvalidateRect(hwndMain, NULL, TRUE);
}

/* show single digit on the single digit display */
void leds_show_1digit(u8 value) {
    wsprintf(leds1_text, L"%1d", value);
    InvalidateRect(hwndMain, NULL, TRUE);
}

/* --------------- Momentary toggle foot-switches: */

/* Poll up to 28 foot-switch toggles simultaneously.  DEC INC ENTER NEXT map to 28-31 bit positions. */
u32 fsw_poll(void) {
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
u8 slider_poll(void) {
    return (mode ? 1 : 0);
}

/* Poll the expression pedal's data (0-127): */
u8 expr_poll(void) {
    return 0;
}

/* --------------- MIDI I/O functions: */

/* Send multi-byte MIDI commands
0 <= cmd     <=  F   - MIDI command
0 <= channel <=  F   - MIDI channel to send command to
00 <= data1   <= FF   - first data byte of MIDI command
00 <= data2   <= FF   - second (optional) data byte of MIDI command
*/
void midi_send_cmd1(u8 cmd, u8 channel, u8 data1) {
    if (outHandle != 0) {
        // send the MIDI command to the opened MIDI Mapper device:
        midiOutShortMsg(outHandle, ((cmd & 0xF) << 4) | (channel & 0xF) | ((u32)data1 << 8));
    }
    printf("MIDI: %1X%1X %02X\r\n", cmd, channel, data1);
}

void midi_send_cmd2(u8 cmd, u8 channel, u8 data1, u8 data2) {
    if (outHandle != 0) {
        // send the MIDI command to the opened MIDI Mapper device:
        midiOutShortMsg(outHandle, ((cmd & 0xF) << 4) | (channel & 0xF) | ((u32)data1 << 8) | ((u32)data2 << 16));
    }
    printf("MIDI: %1X%1X %02X %02X\r\n", cmd, channel, data1, data2);
}

// --------------- Flash memory interface:

static u8 flash_memory[1024] = {
#include "../common/flash_init.h"
    0
};

// Load `count` bytes from flash memory at address `addr` (0-based where 0 is first available byte of available flash memory) into `data`:
void flash_load(u16 addr, u16 count, u8 *data) {
    long file_size;
    FILE *f;

    // Check sanity of write to make sure it fits within one 64-byte chunk of flash and does not cross boundaries:
    assert(((addr)& ~63) == (((addr + count - 1)) & ~63));

    f = fopen("flash.bin", "rb");
    if (f == NULL) {
        // Initialize new file with initial flash memory data:
        f = fopen("flash.bin", "a+b");
        fwrite(flash_memory, 1, 1024, f);
        fclose(f);
        // Reopen file for reading:
        f = fopen("flash.bin", "rb");
    }
    if (f == NULL) {
        memset(data, 0, count);
        return;
    }

    // Find file size:
    fseek(f, 0, SEEK_END);
    file_size = ftell(f);

    // Attempt to seek to the location in the file:
    if (fseek(f, addr, SEEK_SET) != 0) {
        fclose(f);
        memset(data, 0, count);
        return;
    }
    if (addr > file_size) {
        // Address beyond end of file:
        fclose(f);
        memset(data, 0, count);
        return;
    }

    size_t r = fread(data, 1, count, f);
    if (r < count) {
        // Zero the remainder of the buffer:
        memset(data + r, 0, count - r);
    }
    fclose(f);
}

// Stores `count` bytes from `data` into flash memory at address `addr` (0-based where 0 is first available byte of available flash memory):
void flash_store(u16 addr, u16 count, u8 *data) {
    long p;
    FILE *f;

    // Check sanity of write to make sure it fits within one 64-byte chunk of flash and does not cross boundaries:
    assert(((addr)& ~63) == (((addr + count - 1)) & ~63));

    // Create file or append to it:
    f = fopen("flash.bin", "a+b");

    // Find file size:
    fseek(f, 0, SEEK_END);
    p = ftell(f);

    // Pad the end of the file until we reach `addr`:
    if (addr > p) {
        static u8 zeroes[64];

        while (addr - p >= 64) {
            p += (long)fwrite(zeroes, 1, 64, f);
        }
        if (addr - p > 0)
            fwrite(zeroes, 1, addr - p, f);
    }

    fseek(f, addr, SEEK_SET);

    size_t r = fwrite(data, 1, count, f);
    assert(r == count);
    fclose(f);
}
