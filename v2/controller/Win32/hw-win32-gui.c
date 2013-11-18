#include <windows.h>
#include <winuser.h>
#include <stdio.h>
#include <string.h>
#include "../common/types.h"
#include "../common/hardware.h"

LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);

#define IDT_TIMER1 101

static HINSTANCE zhInstance = NULL;

// display scale factor (pixels per inch)
const double dpi = 55.4;    // NOTE(jsd): This is to-scale on my 40" Samsung HDTV 1080p

// Total width, height in inches:
const double inWidth = 20.0;
const double inHeight = 7.0;

// Position and spacing of footswitches (from centers):
const double vStart = 2.5;
const double hLeft = 1.0;
const double hSpacing = 2.57;
const double vSpacing = 3.15;

// was 0.2032
const double inLEDOuterDiam = (8 /*mm*/ * 0.01 * 2.54);

// was 0.34026
const double inFswOuterDiam = (12.2 /*mm*/ * 0.01 * 2.54);
// was 0.30
const double inFswInnerDiam = (11 /*mm*/ * 0.01 * 2.54);

// button labels:
static LPCTSTR labels[2][8] = {
    { L"CMP", L"FLT", L"PIT", L"CHO", L"DLY", L"RVB", L"MUTE", L"PREV" },
    { L"1", L"1S", L"2", L"2S", L"3", L"3S", L"TAP", L"NEXT" }
};

static LPCTSTR keylabels[2][8] = {
    { L"Q", L"W", L"E", L"R", L"T", L"Y", L"U", L"I" },
    { L"A", L"S", L"D", L"F", L"G", L"H", L"J", L"K" }
};

// foot-switch pushed state
static u16 fsw_pushed;
// LED state:
static u8 led_state[2];

static HWND hwndMain;

HMIDIOUT      outHandle;

void show_midi_output_devices() {
    MIDIOUTCAPS     moc;
    unsigned long iNumDevs, i;

    // Get the number of MIDI Out devices in this computer
    iNumDevs = midiOutGetNumDevs();

    // Go through all of those devices, displaying their names
    if (iNumDevs > 0) {
        printf("MIDI Devices:\r\n");
    }

    for (i = 0; i < iNumDevs; i++)
    {
        // Get info about the next device
        if (!midiOutGetDevCaps(i, &moc, sizeof(MIDIOUTCAPS)))
        {
            // Display its Device ID and name
            printf("  #%d: %ls\r\n", i, moc.szPname);
        }
    }
}

// main entry point
int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, PWSTR pCmdLine, int nCmdShow) {
    WNDCLASSEX WndClass;
    MSG Msg;
    unsigned long result;

    zhInstance = hInstance;

    WndClass.cbSize = sizeof(WNDCLASSEX);
    WndClass.style = CS_DBLCLKS;
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
        MessageBox(0, L"Error Registering Class!", L"Error!", MB_ICONSTOP | MB_OK);
        return 0;
    }

    hwndMain = CreateWindowExW(
        0,
        L"MyClass",
        L"MIDI controller test harness",
        WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT,
        CW_USEDEFAULT,
        (int)(inWidth * dpi) + 16,
        (int)(inHeight * dpi) + 37,
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
    fsw_pushed = 0;
    for (int r = 0; r < 2; ++r) {
        led_state[r] = 0;
    }

    // initialize the logic controller
    controller_init();

    // Show main window:
    ShowWindow(hwndMain, nCmdShow);
    //UpdateWindow(hwndMain);

    // default Win32 message pump
    while (GetMessage(&Msg, NULL, 0, 0)) {
        TranslateMessage(&Msg);
        DispatchMessage(&Msg);

        // give control to the logic controller
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
    SetTextAlign(hDC, TA_CENTER);

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

    for (v = 0; v < 2; ++v) {
        SelectObject(hDC, penThin);
        SelectObject(hDC, brsWhite);
        // draw 2 rows of 8 evenly spaced foot-switches
        u16 b = 1 << (v * 8);
        for (h = 0; h < 8; ++h, b <<= 1) {
            SelectObject(hDC, penThick);
            dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart + (v * vSpacing), inFswOuterDiam, inFswOuterDiam);
            SelectObject(hDC, penThin);
            dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart + (v * vSpacing), inFswInnerDiam, inFswInnerDiam);
            if (fsw_pushed & b) {
                SelectObject(hDC, brsDarkSilver);
                dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart + (v * vSpacing), inFswOuterDiam, inFswOuterDiam);
                SelectObject(hDC, brsWhite);
            }
            SetTextColor(hDC, RGB(192, 192, 192));
            dpi_TextOut(hDC, hLeft + (h * hSpacing), vStart + 0.5 + (v * vSpacing), labels[v][h], (int)wcslen(labels[v][h]));

            // Label w/ the keyboard key:
            wchar_t tmp[2] = L" ";
            tmp[0] = keylabels[v][h][0];
            SetTextColor(hDC, RGB(96, 16, 16));
            dpi_TextOut(hDC, hLeft + (h * hSpacing), vStart + 0.75 + (v * vSpacing), tmp, 1);
        }

        // 8 evenly spaced 8mm (203.2mil) LEDs above 1-4 preset switches

        // draw inactive LEDs:
        SelectObject(hDC, penThin);
        SelectObject(hDC, brsDarkGreen);
        b = 1;
        for (h = 0; h < 8; ++h, b <<= 1) {
            if ((led_state[v] & b) == 0) {
                dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart - 0.7 + (v * vSpacing), inLEDOuterDiam, inLEDOuterDiam);
            }
        }

        // draw active LEDs:
        SelectObject(hDC, brsGreen);
        b = 1;
        for (h = 0; h < 8; ++h, b <<= 1) {
            if (led_state[v] & b) {
                dpi_CenterEllipse(hDC, hLeft + (h * hSpacing), vStart - 0.7 + (v * vSpacing), inLEDOuterDiam, inLEDOuterDiam);
            }
        }
    }

    BitBlt(orighdc, 0, 0, win_width, win_height, Memhdc, 0, 0, SRCCOPY);

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
    case WM_KEYDOWN:
        // only fire if the previous button state was UP (i.e. ignore autorepeat messages)
        if ((lParam & (1 << 30)) == 0) {
            switch (wParam) {
            case 'Q': case 'q': fsw_pushed |= FSM_TOP_1; break;
            case 'W': case 'w': fsw_pushed |= FSM_TOP_2; break;
            case 'E': case 'e': fsw_pushed |= FSM_TOP_3; break;
            case 'R': case 'r': fsw_pushed |= FSM_TOP_4; break;
            case 'T': case 't': fsw_pushed |= FSM_TOP_5; break;
            case 'Y': case 'y': fsw_pushed |= FSM_TOP_6; break;
            case 'U': case 'u': fsw_pushed |= FSM_TOP_7; break;
            case 'I': case 'i': fsw_pushed |= FSM_TOP_8; break;

            case 'A': case 'a': fsw_pushed |= FSM_BOT_1; break;
            case 'S': case 's': fsw_pushed |= FSM_BOT_2; break;
            case 'D': case 'd': fsw_pushed |= FSM_BOT_3; break;
            case 'F': case 'f': fsw_pushed |= FSM_BOT_4; break;
            case 'G': case 'g': fsw_pushed |= FSM_BOT_5; break;
            case 'H': case 'h': fsw_pushed |= FSM_BOT_6; break;
            case 'J': case 'j': fsw_pushed |= FSM_BOT_7; break;
            case 'K': case 'k': fsw_pushed |= FSM_BOT_8; break;
            }
            InvalidateRect(hwnd, NULL, TRUE);
        }
        break;
    case WM_KEYUP:
        // handle toggle button up
        switch (wParam) {
        case 'Q': case 'q': fsw_pushed &= ~FSM_TOP_1; break;
        case 'W': case 'w': fsw_pushed &= ~FSM_TOP_2; break;
        case 'E': case 'e': fsw_pushed &= ~FSM_TOP_3; break;
        case 'R': case 'r': fsw_pushed &= ~FSM_TOP_4; break;
        case 'T': case 't': fsw_pushed &= ~FSM_TOP_5; break;
        case 'Y': case 'y': fsw_pushed &= ~FSM_TOP_6; break;
        case 'U': case 'u': fsw_pushed &= ~FSM_TOP_7; break;
        case 'I': case 'i': fsw_pushed &= ~FSM_TOP_8; break;

        case 'A': case 'a': fsw_pushed &= ~FSM_BOT_1; break;
        case 'S': case 's': fsw_pushed &= ~FSM_BOT_2; break;
        case 'D': case 'd': fsw_pushed &= ~FSM_BOT_3; break;
        case 'F': case 'f': fsw_pushed &= ~FSM_BOT_4; break;
        case 'G': case 'g': fsw_pushed &= ~FSM_BOT_5; break;
        case 'H': case 'h': fsw_pushed &= ~FSM_BOT_6; break;
        case 'J': case 'j': fsw_pushed &= ~FSM_BOT_7; break;
        case 'K': case 'k': fsw_pushed &= ~FSM_BOT_8; break;
        }
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

// --------------- Momentary toggle foot-switches:

// Poll 16 foot-switch toggles simultaneously
u16 fsw_poll() {
    return fsw_pushed;
}

// Explicitly set the state of all 16 LEDs
void led_set(u8 topMask, u8 botMask) {
    led_state[0] = topMask;
    led_state[1] = botMask;
    InvalidateRect(hwndMain, NULL, TRUE);
}

// --------------- MIDI I/O functions:

/* Send formatted MIDI commands.

    0 <= cmd <= F       - MIDI command
    0 <= channel <= F   - MIDI channel to send command to
    00 <= data1 <= FF   - data byte of MIDI command
*/
void midi_send_cmd1(u8 cmd, u8 channel, u8 data1) {
    if (outHandle != 0) {
        // send the MIDI command to the opened MIDI Mapper device:
        midiOutShortMsg(outHandle, ((cmd & 0xF) << 4) | (channel & 0xF) | ((u32)data1 << 8));
    }
    printf("MIDI: %1X%1X %02X\r\n", cmd, channel, data1);
}

/* Send formatted MIDI commands.

    0 <= cmd <= F       - MIDI command
    0 <= channel <= F   - MIDI channel to send command to
    00 <= data1 <= FF   - first data byte of MIDI command
    00 <= data2 <= FF   - second (optional) data byte of MIDI command
    */
void midi_send_cmd2(u8 cmd, u8 channel, u8 data1, u8 data2) {
    if (outHandle != 0) {
        // send the MIDI command to the opened MIDI Mapper device:
        midiOutShortMsg(outHandle, ((cmd & 0xF) << 4) | (channel & 0xF) | ((u32)data1 << 8) | ((u32)data2 << 16));
    }
    printf("MIDI: %1X%1X %02X %02X\r\n", cmd, channel, data1, data2);
}
