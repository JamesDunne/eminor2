#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include "util.h"

int main(int argc, char **argv) {
    char dst[6] = "   ";
    u8 n = 0;

    if (argc <= 1) {
        n = 254;
    } else {
        n = atoi(argv[1]);
    }

    ritoa(dst, 2, n);

    printf("%s\n", dst);

    return 0;
}
