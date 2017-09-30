// +build ignore

//go:generate sh -c "go tool cgo -godefs program-v5_types.go > program-v5.go"

package main

// #include "../common/types.h"
// #include "../common/program-v5.h"
import "C"

const FWfxm_1 = C.fxm_1
const FWfxm_2 = C.fxm_2
const FWfxm_3 = C.fxm_3
const FWfxm_4 = C.fxm_4
const FWfxm_5 = C.fxm_5
const FWfxm_acoustc = C.fxm_acoustc
const FWfxm_dirty = C.fxm_dirty

type FWamp C.struct_amp
type FWscene_descriptor C.struct_scene_descriptor
type FWprogram C.struct_program
type FWset_entry C.struct_set_entry
type FWset_list C.struct_set_list

const FWamp_sizeof = C.sizeof_struct_amp
const FWprogram_sizeof = C.sizeof_struct_program
const FWset_entry_sizeof = C.sizeof_struct_set_entry
const FWset_list_sizeof = C.sizeof_struct_set_list

const FWscene_count_max = C.scene_count_max
