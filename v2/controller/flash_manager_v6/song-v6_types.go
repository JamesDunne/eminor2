// +build ignore

package main

// #include "../common/types.h"
// #include "../common/song-v6.h"
import "C"

const FWfx_count = C.fx_count
const FWfxm_1 = C.fxm_1
const FWfxm_2 = C.fxm_2
const FWfxm_3 = C.fxm_3
const FWfxm_4 = C.fxm_4
//const FWfxm_5 = C.fxm_5
const FWfxm_acoustc = C.fxm_acoustc
const FWfxm_dirty = C.fxm_dirty

const FWvolume_0dB = C.volume_0dB
const FWvolume_6dB = C.volume_6dB

const FWdirty_gain_default = C.dirty_gain_default
const FWclean_gain_default = C.clean_gain_default
const FWgate_default = C.gate_default

type FWamp_defaults C.struct_amp_defaults
type FWamp_descriptor C.struct_amp_descriptor
type FWaxe_midi_program C.struct_axe_midi_program

type FWamp C.struct_amp
type FWscene_descriptor C.struct_scene_descriptor
type FWsong C.struct_song
type FWset_entry C.struct_set_entry
type FWset_list C.struct_set_list

const FWmax_axe_midi_program_count = C.max_axe_midi_program_count
const FWaxe_midi_padding = C.axe_midi_padding

const FWamp_sizeof = C.sizeof_struct_amp
const FWsong_sizeof = C.sizeof_struct_song
const FWset_entry_sizeof = C.sizeof_struct_set_entry
const FWset_list_sizeof = C.sizeof_struct_set_list

const FWscene_count_max = C.scene_count_max

const FWmax_set_length = C.max_set_length
