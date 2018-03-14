#ifndef WINVER                  // Specifies that the minimum required platform is Windows 7.
#define WINVER 0x0601           // Change this to the appropriate value to target other versions of Windows.
#endif

#ifndef _WIN32_WINNT            // Specifies that the minimum required platform is Windows 7.
#define _WIN32_WINNT 0x0601     // Change this to the appropriate value to target other versions of Windows.
#endif

#include <windows.h>
#include <windowsx.h>
#include <shellapi.h>
#include <wchar.h>
#include <winuser.h>
#include <stdio.h>
#include <stdbool.h>
#include <string.h>
#include <math.h>
#include <assert.h>
#include "../common/types.h"
#include "../common/hardware.h"
//#include "../common/memory.h"
#include "font-5x8.h"

// MinGW fixes:
#ifndef GET_KEYSTATE_WPARAM
#  define GET_KEYSTATE_WPARAM(wParam) (LOWORD(wParam))
#endif
#if _WIN32
#  define swprintf _snwprintf
#endif

#define FEAT_MIDI
#ifdef __TINYC__
#  undef FEAT_MIDI
#endif

typedef unsigned long u32;

LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);

void handleButtonDown(HWND hwnd, POINT point);

void handleButtonUp(HWND hwnd);

static HINSTANCE zhInstance = NULL;

#define mmToIn 0.0393701

// display scale factor (pixels per inch)
// NOTE(jsd): 55.4 dpi is to-scale on my 40" Samsung HDTV 1080p
const double defaultDpi = 55.4;
static double dpi = 66; // 82; 93.5;

// Total width, height in inches:
const double inWidth = 20.078;
const double inHeight = 6.305;

// Position and spacing of footswitches (from centers):
const double hLeft = 1.0;
const double hSpacing = 2.5714285714285714285714285714286;

// From bottom going up:
const double vStart = 5.6;
const double vSpacing = 2.15;

const double vLEDOffset = -0.65;

const double inLEDOuterDiam = (12 /*mm*/ * mmToIn);
const double inFswOuterDiam = (12.2 /*mm*/ * mmToIn);
const double inFswInnerDiam = (10 /*mm*/ * mmToIn);

// button labels:
const static LPCWSTR keylabels[2][8] = {
    { L"A", L"S", L"D", L"F", L"G", L"H", L"J", L"K" },
    { L"Q", L"W", L"E", L"R", L"T", L"Y", L"U", L"I" }
};

#ifdef HWFEAT_LABEL_UPDATES

WCHAR *labels[2][8];
char *labels_ascii[2][8];

#else

const static LPCWSTR labels[2][8] = {
    { L"A-1", L"A-2", L"A-3", L"A-4", L"A-5", L"A-6", L"TAP/STORE", L"ENTER" },
    { L"COMP", L"FILTER", L"PITCH", L"CHORUS", L"DELAY", L"REVERB", L"PREV", L"NEXT" }
};

#endif

#ifdef FEAT_LCD
// currently displayed LCD text in row X col format:
WCHAR lcd_text[LCD_ROWS][LCD_COLS];
char lcd_ascii[LCD_ROWS][LCD_COLS];
#endif

static bool show_dimensions = false;

// foot-switch state
static io16 fsw_state;
// LED state:
static io16 led_state;

static HWND hwndMain;

static UINT IDT_TIMER10MS = 101, IDT_TIMER40MS = 102;

int midi_count;
// MIDI I/O:

#ifdef FEAT_MIDI
HMIDIOUT    outHandle;
MIDIOUTCAPS outDevices[10];
unsigned long outNumDevs;
#endif

void show_midi_output_devices() {
#ifdef FEAT_MIDI
    unsigned long i;

    // Get the number of MIDI Out devices in this computer
    outNumDevs = midiOutGetNumDevs();

    // Go through all of those devices, displaying their names
    if (outNumDevs > 0) {
        printf("MIDI Devices:\r\n");
    }

    for (i = 0; i < outNumDevs; i++) {
        // Get info about the next device
        if (!midiOutGetDevCaps(i, &outDevices[i], sizeof(MIDIOUTCAPS))) {
            // Display its Device ID and name
            printf("  #%d: %ls\r\n", i, outDevices[i].szPname);
        }
    }
#endif
}

// main entry point
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR paCmdLine, int nCmdShow) {
    WNDCLASSEXW WndClass;
    MSG Msg;
    unsigned long result;
    LPWSTR *szArglist;
    int nArgs;

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

    // register the window for touch instead of gestures
    RegisterTouchWindow(hwndMain, TWF_WANTPALM);

#define TARGET_RESOLUTION 1         // 1-millisecond target resolution

#ifdef FEAT_MIDI
    TIMECAPS tc;
    UINT     wTimerRes;

    if (timeGetDevCaps(&tc, sizeof(TIMECAPS)) != TIMERR_NOERROR)
    {
        return -1;
    }

    wTimerRes = min(max(tc.wPeriodMin, TARGET_RESOLUTION), tc.wPeriodMax);
    timeBeginPeriod(wTimerRes);
#endif

    // TODO: really should FreeConsole() and fclose(stdout) later but it'll be open til process end anyway.
    AllocConsole();
    freopen("CONOUT$", "wb", stdout);

    // display the possible MIDI output devices:
    show_midi_output_devices();

#ifdef FEAT_MIDI
    // Open the MIDI Mapper
    UINT midiDeviceID = (UINT)1;
    szArglist = CommandLineToArgvW(GetCommandLineW(), &nArgs);

    if (nArgs > 1) {
        for (int i = 0; i < outNumDevs; i++) {
            if (wcsicmp(szArglist[1], outDevices[i].szPname) == 0) {
                midiDeviceID = i;
                printf("Selected MIDI device #%d: %ls\n", i, outDevices[i].szPname);
                break;
            }
        }
    }

    printf("Opening MIDI device ID #%d...\r\n", midiDeviceID);
    result = midiOutOpen(&outHandle, midiDeviceID, 0, 0, CALLBACK_WINDOW);
    if (result) {
        printf("There was an error opening MIDI device!  Disabling MIDI output...\r\n\r\n");
        outHandle = 0;
    } else {
        printf("Opened MIDI device successfully.\r\n\r\n");
    }
#endif

#ifdef HWFEAT_LABEL_UPDATES

    for (int i = 0; i < 8; i++) {
        labels[0][i] = (WCHAR *)malloc(sizeof(WCHAR) * 21);
        labels[1][i] = (WCHAR *)malloc(sizeof(WCHAR) * 21);
        labels_ascii[0][i] = (char *)malloc(sizeof(char) * 20);
        labels_ascii[1][i] = (char *)malloc(sizeof(char) * 20);
    }

#endif

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

    SetTimer(hwndMain, IDT_TIMER10MS, 10, (TIMERPROC) NULL);

    PeekMessage(&Msg, NULL, 0, 0, PM_NOREMOVE);

    // default Win32 message pump
    //DWORD timeLast = timeGetTime();
    while (Msg.message != WM_QUIT) {
        if (!GetMessage(&Msg, NULL, 0, 0)) {
            break;
        }
        TranslateMessage(&Msg);
        DispatchMessage(&Msg);
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
    int l, t, r, b;
    RECT rect;

    l = (int)floor(left * dpi);
    t = (int)floor(top * dpi);
    r = (int)floor(right * dpi);
    b = (int)floor(bottom * dpi);

    if (r - l == 0) r = l + 1;
    if (b - t == 0) b = t + 1;

    rect.left = l;
    rect.top = t;
    rect.bottom = b;
    rect.right = r;
    return FrameRect(hdc, &rect, 0);
}

BOOL dpi_FillRect(HDC hdc, double left, double top, double right, double bottom) {
    int l, t, r, b;
    RECT rect;

    l = (int)floor(left * dpi);
    t = (int)floor(top * dpi);
    r = (int)floor(right * dpi);
    b = (int)floor(bottom * dpi);

    if (r - l == 0) r = l + 1;
    if (b - t == 0) b = t + 1;

    rect.left = l;
    rect.top = t;
    rect.bottom = b;
    rect.right = r;
    return FillRect(hdc, &rect, 0);
}

BOOL dpi_CenterEllipse(HDC hdc, double cX, double cY, double rW, double rH) {
    return Ellipse(hdc,
        (int)floor((cX - rW) * dpi),
        (int)floor((cY - rH) * dpi),
        (int)ceil((cX + rW) * dpi),
        (int)ceil((cY + rH) * dpi)
        );
}

BOOL dpi_TextOut(HDC hdc, double nXStart, double nYStart, LPCWSTR lpString, int cbString) {
    return TextOutW(hdc, (int)(nXStart * dpi), (int)(nYStart * dpi), lpString, cbString);
}

// Draws a cross-hatch and labels the cX, cY point.
BOOL dpi_Label(HDC hdc, double cX, double cY, COLORREF color, HFONT font, UINT align) {
    wchar_t tmp[16];
    swprintf(tmp, 16, L"%-2.3f, %-2.3f", cX, cY);

    UINT old_ta = GetTextAlign(hdc);
    COLORREF old_color = GetTextColor(hdc);
    HFONT old_font = GetCurrentObject(hdc, OBJ_FONT);
    HPEN old_pen = GetCurrentObject(hdc, OBJ_PEN);

    SetTextColor(hdc, color);
    SetTextAlign(hdc, align); // TA_CENTER | VTA_TOP
    SelectObject(hdc, font);
    SelectObject(hdc, GetStockObject(WHITE_PEN));

    // Draw cross-hair:
    dpi_MoveTo(hdc, cX, cY - 0.05);
    dpi_LineTo(hdc, cX, cY + 0.0525);
    dpi_MoveTo(hdc, cX - 0.05, cY);
    dpi_LineTo(hdc, cX + 0.0525, cY);
    // Label:
    BOOL ret = TextOutW(hdc, (int)(cX * dpi), (int)(cY * dpi), tmp, (int)wcslen(tmp));

    SelectObject(hdc, old_pen);
    SelectObject(hdc, old_font);
    SetTextAlign(hdc, old_ta);
    SetTextColor(hdc, old_color);
    return ret;
}

// paint the face plate window
void paintFacePlate(HWND hwnd) {
    HDC         hDC;
    PAINTSTRUCT ps;

    HDC     lcdDC;
    HBITMAP lcdBMP;

    HFONT   fontLabel, fontDimLabel;
    HPEN    penLCD, penThick, penThin, penGridThick, penGridThin;
    HBRUSH  brsLCD, brsLCDBack, brsWhite, brsDarkSilver, brsDarkGreen, brsGreen, brsBlack;

    COLORREF    dimLabelColor = RGB(240, 240, 120);

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

    penLCD = CreatePen(PS_NULL, 1, RGB(255, 255, 255));
    brsLCD = CreateSolidBrush(RGB(255, 255, 255));
    brsLCDBack = CreateSolidBrush(RGB(0, 0, 192));

    brsWhite = CreateSolidBrush(RGB(192, 192, 192));
    brsDarkSilver = CreateSolidBrush(RGB(96, 96, 96));
    brsDarkGreen = CreateSolidBrush(RGB(8, 30, 3));
    brsGreen = CreateSolidBrush(RGB(25, 250, 5));
    brsBlack = CreateSolidBrush(RGB(0, 0, 0));

    SelectObject(hDC, brsBlack);
    dpi_FillRect(hDC, 0, 0, inWidth, inHeight);

    SetBkMode(hDC, TRANSPARENT);

    fontLabel = CreateFont(
        (int)((10.0) * mmToIn * dpi),
        (int)((4.0) * mmToIn * dpi),
        0,
        0,
        FW_SEMIBOLD, FALSE, FALSE, FALSE,
        ANSI_CHARSET,
        OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
        CLEARTYPE_QUALITY,
        DEFAULT_PITCH | FF_ROMAN,
        // TODO: pick a best font and fallback to worse ones depending on availability.
        L"Tahoma"
    );

    fontDimLabel = CreateFont(
        18,
        6,
        0,
        0,
        FW_SEMIBOLD, FALSE, FALSE, FALSE,
        ANSI_CHARSET,
        OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
        CLEARTYPE_QUALITY,
        DEFAULT_PITCH | FF_ROMAN,
        // TODO: pick a best font and fallback to worse ones depending on availability.
        L"Tahoma"
    );

    SetTextColor(hDC, RGB(100, 100, 100));
    SelectObject(hDC, fontLabel);

    // draw grid:
    if (show_dimensions) {
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
    }

#ifdef FEAT_LCD
    // LCD dimensions taken from http://www.newhavendisplay.com/nhd0420d3znswbbwv3-p-5745.html
    const double lcdCenterX = (inWidth * 0.5);
    const double lcdCenterY = 1.25;

    // Draw PCB outline:
    //SelectObject(hDC, brsWhite);
    //dpi_Rectangle(hDC, lcdCenterX - ((98 * mmToIn) * 0.5), lcdCenterY - (60 * mmToIn * 0.5), lcdCenterX + ((98 * mmToIn) * 0.5), lcdCenterY + (60 * mmToIn * 0.5));

    // Draw screw mounting holes:
    const double screwRadius = 1.25 * mmToIn;
    SelectObject(hDC, penThin);
    SelectObject(hDC, GetStockObject(NULL_BRUSH));
    dpi_CenterEllipse(hDC, lcdCenterX - (93 * mmToIn * 0.5), lcdCenterY - (55.0 * mmToIn * 0.5), screwRadius, screwRadius);
    dpi_CenterEllipse(hDC, lcdCenterX + (93 * mmToIn * 0.5), lcdCenterY - (55.0 * mmToIn * 0.5), screwRadius, screwRadius);
    dpi_CenterEllipse(hDC, lcdCenterX - (93 * mmToIn * 0.5), lcdCenterY + (55.0 * mmToIn * 0.5), screwRadius, screwRadius);
    dpi_CenterEllipse(hDC, lcdCenterX + (93 * mmToIn * 0.5), lcdCenterY + (55.0 * mmToIn * 0.5), screwRadius, screwRadius);

    // Draw a solid black background for beveled area:
    SelectObject(hDC, penLCD);
    SelectObject(hDC, brsBlack);
    dpi_FillRect(hDC, lcdCenterX - ((87.3 * mmToIn) * 0.5), lcdCenterY - (41.7 * mmToIn * 0.5), lcdCenterX + ((87.3 * mmToIn) * 0.5), lcdCenterY + (41.7 * mmToIn * 0.5));

    // Draw a solid blue background for LCD area:
    SelectObject(hDC, penLCD);
    SelectObject(hDC, brsLCDBack);
    dpi_FillRect(hDC, lcdCenterX - ((76 * mmToIn) * 0.5), lcdCenterY - (25.2 * mmToIn * 0.5), lcdCenterX + ((76 * mmToIn) * 0.5), lcdCenterY + (25.2 * mmToIn * 0.5));

    const double lcdLeft = lcdCenterX - (70.4 * mmToIn * 0.5);
    const double lcdTop = lcdCenterY - (20.8 * mmToIn * 0.5);
    const double lcdWidth = (70.4 * mmToIn);
    const double lcdHeight = (20.8 * mmToIn);

    // Emulate an LCD with a 5x8 font:
    // Draw the LCD characters scaled up x12 and use StretchBlt to scale them back down:
    RECT rect;
    // Create a scaled-up representation of the LCD screen itself:
    lcdDC = CreateCompatibleDC(orighdc);
    // One LCD pixel (plus spacing) is 12 screen pixels; the lit part of the LCD pixel is 11 screen pixels
    lcdBMP = CreateCompatibleBitmap(orighdc, (LCD_COLS * 6 - 1) * 12, (LCD_ROWS * 9 - 1) * 12);
    SelectObject(lcdDC, lcdBMP);

    if (!show_dimensions) {
        // Fill the blue background:
        SelectObject(lcdDC, penLCD);
        SelectObject(lcdDC, brsLCDBack);
        rect.left = 0;
        rect.top = 0;
        rect.right = (LCD_COLS * 6 - 1) * 12;
        rect.bottom = (LCD_ROWS * 9 - 1) * 12;
        FillRect(lcdDC, &rect, brsLCDBack);

        SelectObject(lcdDC, penLCD);
        SelectObject(lcdDC, brsLCD);
        for (int r = 0; r < LCD_ROWS; ++r)
        for (int c = 0; c < LCD_COLS; ++c)
        for (int y = 0; y < 8; ++y) {
            // Grab font bitmap row (8 bits wide = 8 cols, MSB to left):
            u8 ch = console_font_5x8[(lcd_text[r][c] & 255) * 8 + y];
            u8 b = (1 << 6);

            rect.left = (c * 12 * 6);
            rect.top = (r * 12 * 9 + y * 12);
            rect.right = (c * 12 * 6) + 12;    // use + 11 for authentic spacing
            rect.bottom = (r * 12 * 9 + y * 12) + 12;   // use + 11 for authentic spacing

            for (int x = 0; x < 5; ++x, b >>= 1, rect.left += 12, rect.right += 12) {
                if (ch & b) {
                    FillRect(lcdDC, &rect, brsLCD);
                }
            }
        }

        // Copy for debugging:
        //BitBlt(Memhdc, 0, 0, (LCD_COLS * 6 - 1) * 12, (LCD_ROWS * 9 - 1) * 12, lcdDC, 0, 0, SRCCOPY);

        // Stretch scaled LCD buffer down to main screen (HALFTONE provides an antialiasing effect):
        SetStretchBltMode(hDC, HALFTONE);
        StretchBlt(hDC, (int)(lcdLeft * dpi), (int)(lcdTop * dpi), (int)(lcdWidth * dpi), (int)(lcdHeight * dpi), lcdDC, 0, 0, (LCD_COLS * 6 - 1) * 12, (LCD_ROWS * 9 - 1) * 12, SRCCOPY);
    }

    DeleteObject(lcdBMP);
    DeleteDC(lcdDC);

    if (show_dimensions) {
        // 4 corners of LCD's PCB:
        dpi_Label(hDC, lcdCenterX - ((98 * mmToIn) * 0.5), lcdCenterY - (60 * mmToIn * 0.5), dimLabelColor, fontDimLabel, TA_CENTER | VTA_TOP);
        dpi_Label(hDC, lcdCenterX - ((98 * mmToIn) * 0.5), lcdCenterY + (60 * mmToIn * 0.5), dimLabelColor, fontDimLabel, TA_CENTER | VTA_TOP);
        dpi_Label(hDC, lcdCenterX + ((98 * mmToIn) * 0.5), lcdCenterY + (60 * mmToIn * 0.5), dimLabelColor, fontDimLabel, TA_CENTER | VTA_TOP);
        dpi_Label(hDC, lcdCenterX + ((98 * mmToIn) * 0.5), lcdCenterY - (60 * mmToIn * 0.5), dimLabelColor, fontDimLabel, TA_CENTER | VTA_TOP);
        // 4 corners of LCD extruded part:
        dpi_Label(hDC, lcdCenterX - ((87.3 * mmToIn) * 0.5), lcdCenterY - (41.7 * mmToIn * 0.5), dimLabelColor, fontDimLabel, TA_CENTER | VTA_TOP);
        dpi_Label(hDC, lcdCenterX - ((87.3 * mmToIn) * 0.5), lcdCenterY + (41.7 * mmToIn * 0.5), dimLabelColor, fontDimLabel, TA_CENTER | VTA_TOP);
        dpi_Label(hDC, lcdCenterX + ((87.3 * mmToIn) * 0.5), lcdCenterY + (41.7 * mmToIn * 0.5), dimLabelColor, fontDimLabel, TA_CENTER | VTA_TOP);
        dpi_Label(hDC, lcdCenterX + ((87.3 * mmToIn) * 0.5), lcdCenterY - (41.7 * mmToIn * 0.5), dimLabelColor, fontDimLabel, TA_CENTER | VTA_TOP);
    }
#endif

    // dpi label:
    wchar_t tmp[16];
    swprintf(tmp, 16, L"dpi: %3.2f", dpi);
    if (show_dimensions) {
        SetTextAlign(hDC, TA_LEFT | VTA_TOP);
        dpi_TextOut(hDC, 0.5, 0.5, tmp, (int)wcslen(tmp));
    }

    SetTextAlign(hDC, TA_CENTER | VTA_TOP);

    // 2 rows of foot switches:
    for (v = 0; v < 2; ++v) {
        b8 fsw, led;
        if (v == 1) {
            fsw = fsw_state.top;
            led = led_state.top;
        } else {
            fsw = fsw_state.bot;
            led = led_state.bot;
        }

        if (!show_dimensions) {
            SelectObject(hDC, brsWhite);
        } else {
            SelectObject(hDC, GetStockObject(NULL_BRUSH));
        }

        // draw 2 rows of 8 evenly spaced foot-switches
        u8 b = 1;
        for (h = 0; h < 8; ++h, b <<= 1) {
            SelectObject(hDC, penThick);
            dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart - (v * vSpacing), inFswOuterDiam * 0.5, inFswOuterDiam * 0.5);
            if (!show_dimensions) {
                SelectObject(hDC, penThin);
                dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart - (v * vSpacing), inFswInnerDiam * 0.5, inFswInnerDiam * 0.5);
                if (fsw.byte & b) {
                    SelectObject(hDC, brsDarkSilver);
                    dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart - (v * vSpacing), inFswOuterDiam * 0.5, inFswOuterDiam * 0.5);
                    SelectObject(hDC, brsWhite);
                }
            }

            // Set label color:
            if (v == 0)
                SetTextColor(hDC, RGB(64, 64, 192));
            else if (v == 1)
                SetTextColor(hDC, RGB(64, 192, 64));

            SetTextAlign(hDC, TA_CENTER | VTA_TOP);
            dpi_TextOut(hDC, hLeft + (h * hSpacing), vStart + 0.25 - (v * vSpacing), labels[v][h], (int)wcslen(labels[v][h]));

            // Label w/ the keyboard key:
            if (!show_dimensions) {
                SetTextColor(hDC, RGB(96, 16, 16));
                SetTextAlign(hDC, TA_CENTER | VTA_BASELINE);
                dpi_TextOut(hDC, hLeft + (h * hSpacing), vStart + 0.125 - (v * vSpacing), keylabels[v][h], 1);
            }

            if (show_dimensions) {
                dpi_Label(hDC, hLeft + (h * hSpacing), vStart - (v * vSpacing), dimLabelColor, fontDimLabel, TA_CENTER | VTA_TOP);
            }
        }

        // 8 evenly spaced 8mm (203.2mil) LEDs above 1-4 preset switches

        // draw inactive LEDs:
        SelectObject(hDC, penThin);
        if (!show_dimensions) {
            SelectObject(hDC, brsDarkGreen);
        } else {
            SelectObject(hDC, GetStockObject(NULL_BRUSH));
        }
        b = 1;
        for (h = 0; h < 8; ++h, b <<= 1) {
            if (!show_dimensions) {
                if ((led.byte & b) == 0) {
                    dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart + vLEDOffset - (v * vSpacing), inLEDOuterDiam * 0.5, inLEDOuterDiam * 0.5);
                }
            } else {
                dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart + vLEDOffset - (v * vSpacing), inLEDOuterDiam * 0.5, inLEDOuterDiam * 0.5);
                dpi_Label(hDC, hLeft + (h * hSpacing), vStart + vLEDOffset - (v * vSpacing), dimLabelColor, fontDimLabel, TA_CENTER | VTA_TOP);
            }
        }

        // draw active LEDs:
        if (!show_dimensions) {
            SelectObject(hDC, brsGreen);
            b = 1;
            for (h = 0; h < 8; ++h, b <<= 1) {
                if (led.byte & b) {
                    dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart + vLEDOffset - (v * vSpacing), inLEDOuterDiam * 0.5, inLEDOuterDiam * 0.5);
                }
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

    DeleteObject(penLCD);
    DeleteObject(brsLCD);
    DeleteObject(brsLCDBack);

    DeleteObject(fontDimLabel);
    DeleteObject(fontLabel);

    DeleteObject(Membitmap);
    DeleteDC(Memhdc);
    DeleteDC(orighdc);

    EndPaint(hwnd, &ps);
}

#define MOUSEEVENTF_FROMTOUCH 0xFF515700

// message processing function:
LRESULT CALLBACK WndProc(HWND hwnd, UINT Message, WPARAM wParam, LPARAM lParam) {
    RECT rect;
    UINT cInputs;
    TOUCHINPUT pInputs[10];
    POINT ptInput;

    switch (Message) {
        case WM_CLOSE:
            DestroyWindow(hwnd);
            break;
        case WM_DESTROY:
#ifdef FEAT_MIDI
            // Close the MIDI device:
            if (outHandle != 0) {
                if (midiOutClose(outHandle)) {
                    printf("There was a problem closing the MIDI mapper.\r\n");
                } else {
                    printf("Closed MIDI mapper.\r\n");
                }
            }
#endif
            PostQuitMessage(0);
            break;
        case WM_TIMER:
            if (wParam == IDT_TIMER10MS) {
                midi_count = 0;

                // handle the 10ms timer:
                controller_10msec_timer();

                // give control to the logic controller:
                controller_handle();

                if (midi_count > 0) {
                    printf("MIDI sent %d bytes this iteration\n", midi_count);
                }
            }
            break;
        case WM_PAINT:
            paintFacePlate(hwnd);
            break;
        case WM_LBUTTONDOWN:
            if ((GetMessageExtraInfo() & MOUSEEVENTF_FROMTOUCH) != MOUSEEVENTF_FROMTOUCH) {
                //printf("lbuttondown 0x%08x 0x%08x\n", lParam, wParam);
                ptInput.x = LOWORD(lParam);
                ptInput.y = HIWORD(lParam);
                handleButtonDown(hwnd, ptInput);
            }
            break;
        case WM_LBUTTONUP:
            if ((GetMessageExtraInfo() & MOUSEEVENTF_FROMTOUCH) != MOUSEEVENTF_FROMTOUCH) {
                //printf("lbuttonup   0x%08x 0x%08x\n", lParam, wParam);
                handleButtonUp(hwnd);
            }
            break;
        case WM_TOUCH:
            cInputs = LOWORD(wParam);
            if (GetTouchInputInfo((HTOUCHINPUT)lParam, cInputs, pInputs, sizeof(TOUCHINPUT))) {
                for (UINT i=0; i < cInputs; i++) {
                    TOUCHINPUT ti = pInputs[i];

                    if (ti.dwFlags & TOUCHEVENTF_UP) {
                        //printf("TOUCH button %02x UP\n", ti.dwID);
                        handleButtonUp(hwnd);
                    } else if (ti.dwFlags & TOUCHEVENTF_DOWN) {
                        // Find the client coord of the touch:
                        ptInput.x = TOUCH_COORD_TO_PIXEL(ti.x);
                        ptInput.y = TOUCH_COORD_TO_PIXEL(ti.y);
                        ScreenToClient(hwnd, &ptInput);

                        //printf("TOUCH button %02x DN x=%03d, y=%03d\n", ti.dwID, ptInput.x, ptInput.y);
                        handleButtonDown(hwnd, ptInput);
                    }
                }
            }
            CloseTouchInputHandle((HTOUCHINPUT)lParam);
            return DefWindowProc(hwnd, Message, wParam, lParam);
        case WM_MOUSEWHEEL:
            if ((GetMessageExtraInfo() & MOUSEEVENTF_FROMTOUCH) != MOUSEEVENTF_FROMTOUCH) {
                if (GET_WHEEL_DELTA_WPARAM(wParam) > 0) {
                    // mwheel up
                    dpi += 0.125 * (GET_KEYSTATE_WPARAM(wParam) & MK_CONTROL ? 10.0 : 1.0);
                } else {
                    // mwheel down
                    dpi -= 0.125 * (GET_KEYSTATE_WPARAM(wParam) & MK_CONTROL ? 10.0 : 1.0);
                    if (dpi < 1.0) dpi = 1.0;
                }
                GetWindowRect(hwnd, &rect);
                SetWindowPos(hwnd, 0, rect.left, rect.top, (int) (inWidth * dpi) + 6, (int) (inHeight * dpi) + 28,
                             SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE);
                InvalidateRect(hwnd, NULL, TRUE);
            }
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
                        SetWindowPos(hwnd, 0, rect.left, rect.top, (int)(inWidth * dpi) + 6, (int)(inHeight * dpi) + 28, SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE);
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

                    // <space> toggles showing dimensions:
                case ' ': show_dimensions = !show_dimensions; break;
            }
            InvalidateRect(hwnd, NULL, TRUE);
            break;
        case WM_GETMINMAXINFO: {
            // Specify max window bounds:
            DefWindowProc(hwnd, Message, wParam, lParam);
            MINMAXINFO* pmmi = (MINMAXINFO*)lParam;
            pmmi->ptMaxTrackSize.x = (int)(inWidth * dpi) + 6;
            pmmi->ptMaxTrackSize.y = (int)(inHeight * dpi) + 28;
            return 0;
        }
        default:
            return DefWindowProc(hwnd, Message, wParam, lParam);
    }
    return 0;
}

void handleButtonUp(HWND hwnd) {
    fsw_state.bot.byte = 0;
    fsw_state.top.byte = 0;
    InvalidateRect(hwnd, NULL, TRUE);
}

void handleButtonDown(HWND hwnd, POINT point) {
    int h, b;

    double x = (double) point.x / dpi, y = (double) point.y / dpi;
    const double r_sqr = (inFswOuterDiam * 1.5 * 0.5) * (inFswOuterDiam * 1.5 * 0.5);

    // Find out which foot-switch the mouse cursor is inside:
    b = 1;
    for (h = 0; h < 8; ++h, b <<= 1) {
        double bx = (hLeft + (h * hSpacing));
        double by = (vStart - (0 * vSpacing));
        double dist_sqr = ((x - bx) * (x - bx)) + ((y - by) * (y - by));
        if (dist_sqr <= r_sqr) {
            fsw_state.bot.byte |= b;
        }
    }
    b = 1;
    for (h = 0; h < 8; ++h, b <<= 1) {
        double bx = (hLeft + (h * hSpacing));
        double by = (vStart - (1 * vSpacing));
        double dist_sqr = ((x - bx) * (x - bx)) + ((y - by) * (y - by));
        if (dist_sqr <= r_sqr) {
            fsw_state.top.byte |= b;
        }
    }

    InvalidateRect(hwnd, NULL, TRUE);
}

void debug_log(const char *fmt, ...) {
    va_list ap;
    printf("DEBUG: ");
    va_start(ap, fmt);
    vprintf(fmt, ap);
    va_end(ap);
    printf("\n");
}

#ifdef HWFEAT_LABEL_UPDATES

char **label_row_get(u8 row) {
    return labels_ascii[row];
}

void label_row_update(u8 row) {
    assert(row < 2);

    // Convert ASCII to UTF-16:
    int c, i;
    for (i = 0; i < 8; ++i) {
        for (c = 0; c < 20; ++c) {
            if (labels_ascii[row][i][c] == 0) {
                labels[row][i][c] = (WCHAR)0;
                break;
            }
            labels[row][i][c] = (WCHAR)labels_ascii[row][i][c];
        }
        labels[row][i][c] = (WCHAR)0;
    }

    // Request a UI repaint:
    InvalidateRect(hwndMain, NULL, TRUE);
}

#endif

#ifdef FEAT_LCD

// Pass back the LCD text buffer for the given row:
char *lcd_row_get(u8 row) {
    assert(row < 4);
    return lcd_ascii[row];
}

// Update all LCD display text:
void lcd_updated_all(void) {
    // Convert ASCII to UTF-16:
    int c, row;
    for (row = 0; row < LCD_ROWS; ++row) {
        for (c = 0; c < LCD_COLS; ++c) {
            // Display NUL characters which show up on hardware:
            if (lcd_ascii[row][c] == 0) {
                lcd_text[row][c] = 1;
                continue;
            }
            lcd_text[row][c] = (WCHAR)lcd_ascii[row][c];
        }
    }

    // Request a UI repaint:
    InvalidateRect(hwndMain, NULL, TRUE);
}

#endif

// --------------- Momentary toggle foot-switches and LEDs interface:

// Poll 16 foot-switch toggles simultaneously
u16 fsw_poll(void) {
    return ((u16)fsw_state.bot.byte) | ((u16)fsw_state.top.byte << 8);
}

// Explicitly set the state of all 16 LEDs
void led_set(u16 leds) {
    if ((led_state.bot.byte != (leds & 0xFF)) || (led_state.top.byte != ((leds >> 8) & 0xFF))) {
        led_state.bot.byte = leds & 0xFF;
        led_state.top.byte = (leds >> 8) & 0xFF;
        InvalidateRect(hwndMain, NULL, TRUE);
    }
}

// --------------- MIDI I/O interface:

MIDIHDR sysex;
BOOL sysex_queuing = FALSE;
DWORD sysex_ptr = 0;
CHAR midiErrorText[1024];

void midi_send_sysex(u8 byte) {
    if (!sysex_queuing) {
        if (sysex.lpData == NULL) {
            sysex.lpData = malloc(128);
        }
        sysex_queuing = TRUE;
        sysex_ptr = 0;
    }

    // Enqueue byte:
    sysex.lpData[sysex_ptr++] = byte;
    midi_count += 1;

    // Send SysEx stream:
    if (byte == 0xF7) {
        sysex.dwFlags = 0;
        sysex.dwBufferLength = sysex_ptr;
        printf("MIDI SysEx:");
        for (DWORD i = 0; i < sysex_ptr; i++) {
            printf(" %02X", (u8)sysex.lpData[i]);
        }
        printf("\n");
        sysex_queuing = FALSE;
#ifdef FEAT_MIDI
        if (outHandle != 0) {
            MMRESULT r;
            r = midiOutPrepareHeader(outHandle, &sysex, sizeof(sysex));
            if (r != MMSYSERR_NOERROR) {
                midiOutGetErrorTextA(r, midiErrorText, 1024);
                printf("MIDI ERROR: %s\n", midiErrorText);
            }
            r = midiOutLongMsg(outHandle, &sysex, sizeof(sysex));
            if (r != MMSYSERR_NOERROR) {
                midiOutGetErrorTextA(r, midiErrorText, 1024);
                printf("MIDI ERROR: %s\n", midiErrorText);
            }
        }
#endif
    }
}

/* Send multi-byte MIDI commands
    0 <= cmd     <=  F   - MIDI command
    0 <= channel <=  F   - MIDI channel to send command to
    00 <= data1   <= FF   - first data byte of MIDI command
    00 <= data2   <= FF   - second (optional) data byte of MIDI command
    */
void midi_send_cmd1_impl(u8 cmd_byte, u8 data1) {
#ifdef FEAT_MIDI
    if (outHandle != 0) {
        MMRESULT r;
        // send the MIDI command to the opened MIDI Mapper device:
        r = midiOutShortMsg(outHandle, cmd_byte | ((u32)data1 << 8));
        if (r != MMSYSERR_NOERROR) {
            midiOutGetErrorTextA(r, midiErrorText, 1024);
            printf("MIDI ERROR: %s\n", midiErrorText);
        }
    }
#endif
    midi_count += 2;
    printf("MIDI: %02X %02X\r\n", cmd_byte, data1);
}

void midi_send_cmd2_impl(u8 cmd_byte, u8 data1, u8 data2) {
#ifdef FEAT_MIDI
    if (outHandle != 0) {
        MMRESULT r;
        // send the MIDI command to the opened MIDI Mapper device:
        r = midiOutShortMsg(outHandle, cmd_byte | ((u32)data1 << 8) | ((u32)data2 << 16));
        if (r != MMSYSERR_NOERROR) {
            midiOutGetErrorTextA(r, midiErrorText, 1024);
            printf("MIDI ERROR: %s\n", midiErrorText);
        }
    }
#endif
    midi_count += 3;
    printf("MIDI: %02X %02X %02X\r\n", cmd_byte, data1, data2);
}

// --------------- Flash memory interface:

#if HW_VERSION == 1
u8 flash_bank[2][4096] = {
    {
#include "../PIC/flash_v1_bank0.h"
    },
    {
#include "../PIC/flash_v1_bank1.h"
    }
};
#elif HW_VERSION == 2
u8 flash_bank[3][4096] = {
    {
#include "../PIC/flash_v2_bank0.h"
    },
    {
#include "../PIC/flash_v2_bank1.h"
    },
    {
#include "../PIC/flash_v2_bank2.h"
    }
};
#elif HW_VERSION == 3
u8 flash_bank[3][4096] = {
	{
#include "../PIC/flash_v3_bank0.h"
	},
	{
#include "../PIC/flash_v3_bank1.h"
	},
	{
#include "../PIC/flash_v3_bank2.h"
	}
};
#elif HW_VERSION == 4
u8 flash_bank[3][4096] = {
	{
#include "../PIC/flash_v4_bank0.h"
	},
	{
#include "../PIC/flash_v4_bank1.h"
	},
	{
#include "../PIC/flash_v4_bank2.h"
	}
};
#elif HW_VERSION == 5
u8 flash_bank[3][4096] = {
    {
#include "../PIC/flash_v5_bank0.h"
    },
    {
#include "../PIC/flash_v5_bank1.h"
    },
    {
#include "../PIC/flash_v5_bank2.h"
    }
};
#else
#error HW_ VERSION must be set!
#endif

// Load `count` bytes from flash memory at address `addr` (0-based where 0 is first available byte of available flash memory) into `data`:
void flash_load(u16 addr, u16 count, u8 *data) {
    u8 bank = (u8)(addr >> 12);
    addr &= 0x0FFF;

    memcpy((void *)data, (void *)&flash_bank[bank][addr], count);
}

// Stores `count` bytes from `data` into flash memory at address `addr` (0-based where 0 is first available byte of available flash memory):
void flash_store(u16 addr, u16 count, u8 *data) {
    u8 bank = (u8)(addr >> 12);
    addr &= 0x0FFF;

    // Check sanity of write to make sure it fits within one 64-byte chunk of flash and does not cross boundaries:
    assert(((addr)& ~63) == (((addr + count - 1)) & ~63));

    memcpy((void *)&flash_bank[bank][addr], (void *)data, count);
}

// Get a pointer to flash memory at address:
rom const u8 *flash_addr(u16 addr) {
    u8 bank = (u8)(addr >> 12);
    addr &= 0x0FFF;

    return (u8 *)flash_bank[bank] + addr;
}
