gcc -std=c99 -D HWFEAT_LABEL_UPDATES -D UNICODE -D _UNICODE -D_WIN32_WINNT=0x0601 eminorv2.c ..\common\controller-two.c -Wl,--subsystem,windows -lkernel32 -luser32 -lgdi32 -lwinmm -o eminorv2.exe
