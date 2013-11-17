#include <windows.h>
#include <winuser.h>
#include <stdio.h>
#include "../common/types.h"
#include "../common/hardware.h"

LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);

#define IDT_TIMER1 101

static char sClassName[] = "MyClass";
static HINSTANCE zhInstance = NULL;

/* scale factor (pixels per inch) */
const int dpi = 72;
const double inWidth = 20.0;
const double inHeight = 7.0;

const double vStart = 2.5;
const double hSpacing = 2.35;
const double vSpacing = 2.75;

// button labels:
static char *labels[2][8] = {
    { "CMP", "FLT", "PIT", "CHO", "DLY", "RVB", "MUTE", "PREV" },
    {  "1",   "1S",  "2",   "2S",  "3",   "3S", "TAP ", "NEXT" }
};

/* foot-switch pushed state */
static u16 fsw_pushed;
// LED state:
static u8 led_state[2];

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

    WndClass.cbSize = sizeof(WNDCLASSEX);
    WndClass.style = CS_DBLCLKS;
    WndClass.lpfnWndProc = WndProc;
    WndClass.cbClsExtra = 0;
    WndClass.cbWndExtra = 0;
    WndClass.hInstance = zhInstance;
    WndClass.hIcon = LoadIcon(NULL, IDI_APPLICATION);
    WndClass.hIconSm = LoadIcon(NULL, IDI_APPLICATION);
    WndClass.hCursor = LoadCursor(NULL, IDC_ARROW);
    WndClass.hbrBackground = (HBRUSH)(COLOR_WINDOW);
    WndClass.lpszMenuName = NULL;
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

    if (hwndMain == NULL) {
        MessageBox(0, "Error Creating Window!", "Error!", MB_ICONSTOP | MB_OK);
        return 0;
    }

    SetTimer(hwndMain,         // handle to main window
        IDT_TIMER1,            // timer identifier
        10,                    // 10-ms interval
        (TIMERPROC)NULL);     // no timer callback

    ShowWindow(hwndMain, nCmdShow);
    UpdateWindow(hwndMain);

    fsw_pushed = 0;
    for (int r = 0; r < 2; ++r) {
        led_state[r] = 0;
    }

    /* display the possible MIDI output devices: */
    show_midi_output_devices();

    /* Open the MIDI Mapper */
    result = midiOutOpen(&outHandle, (UINT)-1, 0, 0, CALLBACK_WINDOW);
    if (result) {
        printf("There was an error opening MIDI Mapper!  Disabling MIDI output...\r\n");
    }
    else {
        printf("Opened MIDI mapper.\r\n");
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
        (int)((cX - rW) * dpi) - 1,
        (int)((cY - rH) * dpi) - 1,
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

    HPEN	penThick, penThin;
    HBRUSH	brsWhite, brsRed, brsDarkGreen, brsGreen, brsBlack;

    int		h = 0, v = 0;
    double	inH, inV;

    hDC = BeginPaint(hwnd, &Ps);

    penThick = CreatePen(PS_SOLID, 2, RGB(128, 128, 128));
    penThin = CreatePen(PS_SOLID, 1, RGB(128, 128, 128));
    brsWhite = CreateSolidBrush(RGB(192, 192, 192));
    brsRed = CreateSolidBrush(RGB(250, 25, 5));
    brsDarkGreen = CreateSolidBrush(RGB(8, 30, 3));
    brsGreen = CreateSolidBrush(RGB(25, 250, 5));
    brsBlack = CreateSolidBrush(RGB(0, 0, 0));

    SelectObject(hDC, brsBlack);
    dpi_Rectangle(hDC, 0, 0, inWidth, inHeight);

    SetBkMode(hDC, TRANSPARENT);
    SetTextColor(hDC, RGB(192, 192, 192));

#if 0
    /* draw grid at 1/4" sections: */
    for (inH = 0; inH <= inWidth; inH += 0.25, h = (h + 1) % 4) {
        if (h == 0) {
            SelectObject(hDC, penThick);
        }
        else {
            SelectObject(hDC, penThin);
        }
        dpi_MoveTo(hDC, inH, 0);
        dpi_LineTo(hDC, inH, inHeight);

        v = 0;
        for (inV = 0; inV <= inHeight; inV += 0.25, v = (v + 1) % 4) {
            if (v == 0) {
                SelectObject(hDC, penThick);
            }
            else {
                SelectObject(hDC, penThin);
            }
            dpi_MoveTo(hDC, 0, inV);
            dpi_LineTo(hDC, inWidth, inV);
        }
    }
#endif

    for (v = 0; v < 2; ++v) {
        SelectObject(hDC, penThin);
        SelectObject(hDC, brsWhite);
        /* draw 2 rows of 8 evenly spaced foot-switches */
        u16 b = 1 << (v * 8);
        for (h = 0; h < 8; ++h, b <<= 1) {
            SelectObject(hDC, penThick);
            dpi_CenterEllipse(hDC, 1.5 + (h * hSpacing), vStart + (v * vSpacing), 0.34026, 0.34026);
            SelectObject(hDC, penThin);
            dpi_CenterEllipse(hDC, 1.5 + (h * hSpacing), vStart + (v * vSpacing), 0.30, 0.30);
            if (fsw_pushed & b) {
                SelectObject(hDC, brsRed);
                dpi_CenterEllipse(hDC, 1.5 + (h * hSpacing), vStart + (v * vSpacing), 0.25, 0.25);
                SelectObject(hDC, brsWhite);
            }
            dpi_TextOut(hDC, 1.320 + (h * hSpacing), vStart + 0.5 + (v * vSpacing), labels[v][h], strlen(labels[v][h]));
        }

        // 8 evenly spaced 8mm (203.2mil) LEDs above 1-4 preset switches

        // draw inactive LEDs:
        SelectObject(hDC, penThin);
        SelectObject(hDC, brsDarkGreen);
        b = 1;
        for (h = 0; h < 8; ++h, b <<= 1) {
            if ((led_state[v] & b) == 0) {
                dpi_CenterEllipse(hDC, 1.5 + (h * hSpacing), vStart - 0.7 + (v * vSpacing), 0.2032, 0.2032);
            }
        }

        // draw active LEDs:
        SelectObject(hDC, brsGreen);
        b = 1;
        for (h = 0; h < 8; ++h, b <<= 1) {
            if (led_state[v] & b) {
                dpi_CenterEllipse(hDC, 1.5 + (h * hSpacing), vStart - 0.7 + (v * vSpacing), 0.2032, 0.2032);
            }
        }
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
            }
            else {
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
            /* TODO: fix to only redraw affected button */
            InvalidateRect(hwnd, NULL, TRUE);
        }
        break;
    case WM_KEYUP:
        /* handle toggle button up */
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

/* --------------- Momentary toggle foot-switches: */

/* Poll up to 28 foot-switch toggles simultaneously.  DEC INC ENTER NEXT map to 28-31 bit positions. */
u16 fsw_poll() {
    return fsw_pushed;
}

/* Explicitly set the state of all 16 LEDs */
void led_set(u8 topMask, u8 botMask) {
    led_state[0] = topMask;
    led_state[1] = botMask;
    InvalidateRect(hwndMain, NULL, TRUE);
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
