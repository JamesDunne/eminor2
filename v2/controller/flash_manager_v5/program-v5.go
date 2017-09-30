// Created by cgo -godefs - DO NOT EDIT
// cgo -godefs program-v5_types.go

package main

const FWfxm_1 = 0x1
const FWfxm_2 = 0x2
const FWfxm_3 = 0x4
const FWfxm_4 = 0x8
const FWfxm_5 = 0x10
const FWfxm_acoustc = 0x40
const FWfxm_dirty = 0x80

type FWamp struct {
	Gain	uint8
	Fx	uint8
	Volume	uint8
}
type FWscene_descriptor struct {
	Amp [2]FWamp
}
type FWprogram struct {
	Name		[20]uint8
	Midi_program	uint8
	Tempo		uint8
	Default_gain	[2]uint8
	Fx_midi_cc	[2][5]uint8
	X_padding	[4]uint8
	Scene		[15]FWscene_descriptor
}
type FWset_entry struct {
	Program uint8
}
type FWset_list struct {
	Count	uint8
	D0	uint8
	D1	uint8
	Entries	[61]FWset_entry
}

const FWamp_sizeof = 0x3
const FWprogram_sizeof = 0x80
const FWset_entry_sizeof = 0x1
const FWset_list_sizeof = 0x40

const FWscene_count_max = 0xf
