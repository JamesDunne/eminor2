#include <windows.h>
#include <windowsx.h>
#include <winuser.h>
#include <stdio.h>
#include <string.h>
#include <assert.h>
#include "../common/types.h"
#include "../common/hardware.h"

typedef unsigned long u32;

LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);

#define IDT_TIMER1 101

static HINSTANCE zhInstance = NULL;

// display scale factor (pixels per inch)
const double defaultDpi = 55.4;    // NOTE(jsd): This is to-scale on my 40" Samsung HDTV 1080p
static double dpi = 55.4;

// Total width, height in inches:
const double inWidth = 20.078;
const double inHeight = 6.305;

// Position and spacing of footswitches (from centers):
const double vStart = 2.0;
const double hLeft = 1.0;
const double hSpacing = 2.57;
const double vSpacing = 3.15;

// was 0.2032
const double inLEDOuterDiam = (8 /*mm*/ * 0.01 * 2.54);

// was 0.34026
const double inFswOuterDiam = (12.2 /*mm*/ * 0.01 * 2.54);
// was 0.30
const double inFswInnerDiam = (10 /*mm*/ * 0.01 * 2.54);

// button labels:
static LPCTSTR labels[2][8] = {
    { L"COMP", L"FILTER", L"PITCH", L"CHORUS", L"DELAY", L"REVERB", L"MUTE", L"PREV" },
    { L"CH1", L"CH1S", L"CH2", L"CH2S", L"CH3", L"CH3S", L"TAP/STORE", L"NEXT" }
};

static LPCTSTR keylabels[2][8] = {
    { L"Q", L"W", L"E", L"R", L"T", L"Y", L"U", L"I" },
    { L"A", L"S", L"D", L"F", L"G", L"H", L"J", L"K" }
};

// foot-switch state
static io16 fsw_state;
// LED state:
static io16 led_state;

static HWND hwndMain;

// MIDI I/O:

HMIDIOUT outHandle;

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

// main entry point
int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, PWSTR pCmdLine, int nCmdShow) {
    WNDCLASSEXW WndClass;
    MSG Msg;
    unsigned long result;

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

    #define TARGET_RESOLUTION 1         // 1-millisecond target resolution

    TIMECAPS tc;
    UINT     wTimerRes;

    if (timeGetDevCaps(&tc, sizeof(TIMECAPS)) != TIMERR_NOERROR)
    {
        return -1;
    }

    wTimerRes = min(max(tc.wPeriodMin, TARGET_RESOLUTION), tc.wPeriodMax);
    timeBeginPeriod(wTimerRes);

    // TODO: really should FreeConsole() and fclose(stdout) later but it'll be open til process end anyway.
    AllocConsole();
    freopen("CONOUT$", "wb", stdout);

    // Activate the 10ms timer:
    SetTimer(hwndMain,         // handle to main window
        IDT_TIMER1,            // timer identifier
        10,                    // 10-ms interval
        (TIMERPROC)NULL);      // no timer callback

    // display the possible MIDI output devices:
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
    fsw_state.bot.byte = 0;
    fsw_state.top.byte = 0;
    led_state.bot.byte = 0;
    led_state.top.byte = 0;

    // initialize the logic controller
    controller_init();

    // Show main window:
    ShowWindow(hwndMain, nCmdShow);
    UpdateWindow(hwndMain);

    // default Win32 message pump
    DWORD timeLast = timeGetTime();
    while (GetMessage(&Msg, NULL, 0, 0)) {
        TranslateMessage(&Msg);
        DispatchMessage(&Msg);

        // handle the 10ms timer:
        DWORD timeCurr = timeGetTime();
        if (timeCurr - timeLast >= 10) {
            controller_10msec_timer();
            timeLast = timeCurr;
        }

        // give control to the logic controller:
        controller_handle();
    }

    return 0;
}

// scaled drawing routines:

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

// paint the face plate window
void paintFacePlate(HWND hwnd) {
    HDC			hDC;
    PAINTSTRUCT	ps;

    HPEN	penThick, penThin, penGridThick, penGridThin;
    HBRUSH	brsWhite, brsDarkSilver, brsDarkGreen, brsGreen, brsBlack;

    int		h = 0, v = 0;
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

    penGridThick = CreatePen(PS_SOLID, 2, RGB(32, 32, 32));
    penGridThin = CreatePen(PS_SOLID, 1, RGB(32, 32, 32));

    penThick = CreatePen(PS_SOLID, 2, RGB(128, 128, 128));
    penThin = CreatePen(PS_SOLID, 1, RGB(128, 128, 128));

    brsWhite = CreateSolidBrush(RGB(192, 192, 192));
    brsDarkSilver = CreateSolidBrush(RGB(96, 96, 96));
    brsDarkGreen = CreateSolidBrush(RGB(8, 30, 3));
    brsGreen = CreateSolidBrush(RGB(25, 250, 5));
    brsBlack = CreateSolidBrush(RGB(0, 0, 0));

    SelectObject(hDC, brsBlack);
    dpi_Rectangle(hDC, 0, 0, inWidth, inHeight);

    SetBkMode(hDC, TRANSPARENT);

#if 1
    // draw grid:
    for (inH = 0; inH <= inWidth; inH += 0.1, h = (h + 1) % 10) {
        if (h == 0)
            SelectObject(hDC, penGridThick);
        else
            SelectObject(hDC, penGridThin);
        dpi_MoveTo(hDC, inH, 0);
        dpi_LineTo(hDC, inH, inHeight);

        v = 0;
        for (inV = 0; inV <= inHeight; inV += 0.1, v = (v + 1) % 10) {
            if (v == 0)
                SelectObject(hDC, penGridThick);
            else
                SelectObject(hDC, penGridThin);
            dpi_MoveTo(hDC, 0, inV);
            dpi_LineTo(hDC, inWidth, inV);
        }
    }
#endif

    // dpi label:
    SetTextAlign(hDC, TA_LEFT | VTA_TOP);
    wchar_t tmp[16];
    swprintf(tmp, 16, L"dpi: %3.2f", dpi);
    SetTextColor(hDC, RGB(100, 100, 100));
    dpi_TextOut(hDC, 0.5, 0.5, tmp, (int)wcslen(tmp));

    SetTextAlign(hDC, TA_CENTER | VTA_TOP);

    // 2 rows of foot switches:
    for (v = 0; v < 2; ++v) {
        b8 fsw, led;
        if (v == 0) {
            fsw = fsw_state.top;
            led = led_state.top;
        } else {
            fsw = fsw_state.bot;
            led = led_state.bot;
        }

        SelectObject(hDC, brsWhite);

        // draw 2 rows of 8 evenly spaced foot-switches
        u8 b = 1;
        for (h = 0; h < 8; ++h, b <<= 1) {
            SelectObject(hDC, penThick);
            dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart + (v * vSpacing), inFswOuterDiam, inFswOuterDiam);
            SelectObject(hDC, penThin);
            dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart + (v * vSpacing), inFswInnerDiam, inFswInnerDiam);
            if (fsw.byte & b) {
                SelectObject(hDC, brsDarkSilver);
                dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart + (v * vSpacing), inFswOuterDiam, inFswOuterDiam);
                SelectObject(hDC, brsWhite);
            }

            // Set label color:
            if (v == 0 && h < 6)
                SetTextColor(hDC, RGB(64, 64, 192));
            else if (v == 1 && h < 6)
                SetTextColor(hDC, RGB(64, 192, 64));
            else
                SetTextColor(hDC, RGB(224, 224, 224));

            dpi_TextOut(hDC, hLeft + (h * hSpacing), vStart + 0.5 + (v * vSpacing), labels[v][h], (int)wcslen(labels[v][h]));

            // Label w/ the keyboard key:
            SetTextColor(hDC, RGB(96, 16, 16));
            dpi_TextOut(hDC, hLeft + (h * hSpacing), vStart + 0.75 + (v * vSpacing), keylabels[v][h], 1);
        }

        // 8 evenly spaced 8mm (203.2mil) LEDs above 1-4 preset switches

        // draw inactive LEDs:
        SelectObject(hDC, penThin);
        SelectObject(hDC, brsDarkGreen);
        b = 1;
        for (h = 0; h < 8; ++h, b <<= 1) {
            if ((led.byte & b) == 0) {
                dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart - 0.7 + (v * vSpacing), inLEDOuterDiam, inLEDOuterDiam);
            }
        }

        // draw active LEDs:
        SelectObject(hDC, brsGreen);
        b = 1;
        for (h = 0; h < 8; ++h, b <<= 1) {
            if (led.byte & b) {
                dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart - 0.7 + (v * vSpacing), inLEDOuterDiam, inLEDOuterDiam);
            }
        }
    }

    // Copy memory buffer to screen:
    BitBlt(orighdc, 0, 0, win_width, win_height, Memhdc, 0, 0, SRCCOPY);

    // Cleanup:
    DeleteObject(brsWhite);
    DeleteObject(brsDarkGreen);
    DeleteObject(brsDarkSilver);
    DeleteObject(brsGreen);
    DeleteObject(brsBlack);

    DeleteObject(penThick);
    DeleteObject(penThin);
    DeleteObject(penGridThick);
    DeleteObject(penGridThin);

    DeleteObject(Membitmap);
    DeleteDC(Memhdc);
    DeleteDC(orighdc);

    EndPaint(hwnd, &ps);
}

// message processing function:
LRESULT CALLBACK WndProc(HWND hwnd, UINT Message, WPARAM wParam, LPARAM lParam) {
    RECT rect;
    switch (Message) {
        case WM_CLOSE:
            DestroyWindow(hwnd);
            break;
        case WM_DESTROY:
            // Close the MIDI device:
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
        case WM_LBUTTONDOWN: {
            int h, b;

            double x = (double)GET_X_LPARAM(lParam) / dpi,
                y = (double)GET_Y_LPARAM(lParam) / dpi;
            const double r_sqr = inFswOuterDiam * inFswOuterDiam;

            // Find out which foot-switch the mouse cursor is inside:
            b = 1;
            for (h = 0; h < 8; ++h, b <<= 1) {
                double bx = (hLeft + (h * hSpacing));
                double by = (vStart + (0 * vSpacing));
                double dist_sqr = ((x - bx) * (x - bx)) + ((y - by) * (y - by));
                if (dist_sqr <= r_sqr) {
                    fsw_state.top.byte |= b;
                }
            }
            b = 1;
            for (h = 0; h < 8; ++h, b <<= 1) {
                double bx = (hLeft + (h * hSpacing));
                double by = (vStart + (1 * vSpacing));
                double dist_sqr = ((x - bx) * (x - bx)) + ((y - by) * (y - by));
                if (dist_sqr <= r_sqr) {
                    fsw_state.bot.byte |= b;
                }
            }

            InvalidateRect(hwnd, NULL, TRUE);
            break;
        }
        case WM_LBUTTONUP:
            fsw_state.bot.byte = 0;
            fsw_state.top.byte = 0;
            InvalidateRect(hwnd, NULL, TRUE);
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
            // only fire if the previous button state was UP (i.e. ignore autorepeat messages)
            if ((lParam & (1 << 30)) == 0) {
                // ESC quits:
                if (wParam == VK_ESCAPE) {
                    DestroyWindow(hwnd);
                    break;
                }
                switch (wParam) {
                    case 'Q': case 'q': fsw_state.top.bits._1 = 1; break;
                    case 'W': case 'w': fsw_state.top.bits._2 = 1; break;
                    case 'E': case 'e': fsw_state.top.bits._3 = 1; break;
                    case 'R': case 'r': fsw_state.top.bits._4 = 1; break;
                    case 'T': case 't': fsw_state.top.bits._5 = 1; break;
                    case 'Y': case 'y': fsw_state.top.bits._6 = 1; break;
                    case 'U': case 'u': fsw_state.top.bits._7 = 1; break;
                    case 'I': case 'i': fsw_state.top.bits._8 = 1; break;

                    case 'A': case 'a': fsw_state.bot.bits._1 = 1; break;
                    case 'S': case 's': fsw_state.bot.bits._2 = 1; break;
                    case 'D': case 'd': fsw_state.bot.bits._3 = 1; break;
                    case 'F': case 'f': fsw_state.bot.bits._4 = 1; break;
                    case 'G': case 'g': fsw_state.bot.bits._5 = 1; break;
                    case 'H': case 'h': fsw_state.bot.bits._6 = 1; break;
                    case 'J': case 'j': fsw_state.bot.bits._7 = 1; break;
                    case 'K': case 'k': fsw_state.bot.bits._8 = 1; break;

                    case '0': {
                                  dpi = defaultDpi;
                                  GetWindowRect(hwnd, &rect);
                                  SetWindowPos(hwnd, 0, rect.left, rect.top, (int)(inWidth * dpi) + 16, (int)(inHeight * dpi) + 37, SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE);
                                  break;
                    }
                }
                InvalidateRect(hwnd, NULL, TRUE);
            }
            break;
        case WM_KEYUP:
            // handle toggle button up
            switch (wParam) {
                case 'Q': case 'q': fsw_state.top.bits._1 = 0; break;
                case 'W': case 'w': fsw_state.top.bits._2 = 0; break;
                case 'E': case 'e': fsw_state.top.bits._3 = 0; break;
                case 'R': case 'r': fsw_state.top.bits._4 = 0; break;
                case 'T': case 't': fsw_state.top.bits._5 = 0; break;
                case 'Y': case 'y': fsw_state.top.bits._6 = 0; break;
                case 'U': case 'u': fsw_state.top.bits._7 = 0; break;
                case 'I': case 'i': fsw_state.top.bits._8 = 0; break;

                case 'A': case 'a': fsw_state.bot.bits._1 = 0; break;
                case 'S': case 's': fsw_state.bot.bits._2 = 0; break;
                case 'D': case 'd': fsw_state.bot.bits._3 = 0; break;
                case 'F': case 'f': fsw_state.bot.bits._4 = 0; break;
                case 'G': case 'g': fsw_state.bot.bits._5 = 0; break;
                case 'H': case 'h': fsw_state.bot.bits._6 = 0; break;
                case 'J': case 'j': fsw_state.bot.bits._7 = 0; break;
                case 'K': case 'k': fsw_state.bot.bits._8 = 0; break;
            }
            InvalidateRect(hwnd, NULL, TRUE);
            break;
        default:
            return DefWindowProc(hwnd, Message, wParam, lParam);
    }
    return 0;
}

// --------------- Momentary toggle foot-switches and LEDs interface:

// Poll 16 foot-switch toggles simultaneously
u16 fsw_poll(void) {
    return ((u16)fsw_state.bot.byte) | ((u16)fsw_state.top.byte << 8);
}

// Explicitly set the state of all 16 LEDs
void led_set(u16 leds) {
    led_state.bot.byte = leds & 0xFF;
    led_state.top.byte = (leds >> 8) & 0xFF;
    InvalidateRect(hwndMain, NULL, TRUE);
}

// --------------- MIDI I/O interface:

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

// Load `count` bytes from flash memory at address `addr` (0-based where 0 is first available byte of available flash memory) into `data`:
void flash_load(u16 addr, u16 count, u8 *data) {
#if _DEBUG
    long p;
#endif

    FILE *f = fopen("flash.bin", "rb");
    if (f == NULL) {
        memset(data, 0, count);
        return;
    }

    // Attempt to seek to the location in the file:
    if (fseek(f, addr, SEEK_SET) != 0) {
        fclose(f);
        memset(data, 0, count);
        return;
    }

#if _DEBUG
    p = ftell(f);
    assert(p == addr);
#endif

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
    u16 start_chunk, end_chunk;
    FILE *f;

    // Check sanity of write to make sure it fits within one 64-byte chunk of flash and does not cross boundaries:
    start_chunk = (addr)& ~63;
    end_chunk = ((addr + count - 1)) & ~63;
    assert(start_chunk == end_chunk);

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
    p = ftell(f);
    assert(p == addr);

    size_t r = fwrite(data, 1, count, f);
    if (r < count) {
        assert(0);
    }
    fclose(f);
}
