#include "midi.h"

int main() {
    midi_init();

    midi_send_cmd2_impl(0xB2, 0x1A, 0x00);

    return 0;
}
