#include "types.h"

// BCD-encoded dB value table (from PIC/v4_lookup.h):
#pragma romdata
rom const u16 dB_bcd_lookup[128] = {
#include "../PIC/v4_lookup.h"
};

#include "v5_fx_names.h"
