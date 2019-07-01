package main

import (
	//"bufio"
	//"encoding/hex"
	"encoding/json"
	"flag"
	"math"
	//"io"
	"strconv"
	//"bytes"
	"fmt"
	"io/ioutil"
	"os"
	"strings"
	//"time"
)

import (
	//"path"

	"gopkg.in/yaml.v2"
)

// #include "../common/types.h"
// #include "../common/v5_fx_names.h"
import "C"

var FWfx_names = C.v5_fx_names

var version string

type AmpDefault struct {
	DirtyGain int     `yaml:"dirty_gain"` // amp gain (1-127), 0 means default
	CleanGain int     `yaml:"clean_gain"`
	Gate      float64 `yaml:"gate"` // post-amp gate (-76dB to -12dB, default -40dB)
}

type AxeMidiAmpv6 struct {
	FXLayout []string `yaml:"fx_layout"`
}

type Ampv6 struct {
	Gain    int      `yaml:"gain"`    // amp gain (1-127), 0 means default
	Gate    float64  `yaml:"gate"`    // post-amp gate (-76dB to -12dB, default -40dB)
	Channel string   `yaml:"channel"` // "clean" or "dirty"
	Level   float64  `yaml:"level"`   // pre-delay volume in dB (-inf to +6dB)
	FX      []string `yaml:"fx,flow"` // any combo of "delay", "pitch", or "chorus"
}

type SceneDescriptorv6 struct {
	MG Ampv6 `yaml:"MG"`
	JD Ampv6 `yaml:"JD"`
}

type Songv6 struct {
	Name             string              `yaml:"name"`
	AxeMidiProgram   int                 `yaml:"axe_midi"`
	TD50MidiProgram  int                 `yaml:"td50_midi"`
	Tempo            int                 `yaml:"tempo"`
	Gain             int                 `yaml:"gain"` // amp gain (1-127), 0 means default
	Gate             float64             `yaml:"gate"` // gate threshold -76dB to -12.5dB
	Amp              []AmpDefault        `yaml:"amp"`
	SceneDescriptors []SceneDescriptorv6 `yaml:"scenes"`
}

type AxeMidiProgramv6 struct {
	AxeMidiAmps []AxeMidiAmpv6 `yaml:"amps"`
	AmpDefaults AmpDefault     `yaml:"defaults"`
}

// Defaults for all songs:
type AllSongsv6 struct {
	AxeMidiProgram  int `yaml:"axe_midi"`
	TD50MidiProgram int `yaml:"td50_midi"`
}

type Programsv6 struct {
	AxeMidi  []AxeMidiProgramv6 `yaml:"axe_midi"`
	AllSongs AllSongsv6         `yaml:"all_songs"`
	Songs    []*Songv6          `yaml:"songs"`
}

type Setlistv6 struct {
	// YAML sourced:
	Date        string   `yaml:"date"`
	Venue       string   `yaml:"venue"`
	Songs       []string `yaml:"songs"`
	ShouldPrint bool     `yaml:"print"`
	IsActive    bool     `yaml:"active"`

	// Computed:
	SongNames []string
}

type Setlistsv6 struct {
	Set  int         `yaml:"set"`
	Sets []Setlistv6 `yaml:"sets"`
}

const (
	FX3_Compressor uint8 = 1 << iota
	FX3_Filter
	FX3_Pitch
	FX3_Chorus
	FX3_Delay
	FX3_Reverb
	FX3_Noisegate
	FX3_EQ
)

var FXNames = []string{
	"compressor",
	"filter",
	"pitch",
	"chorus",
	"delay",
	"reverb",
	"gate",
	"eq",
}

const song_name_max_length = 20

type SongMeta struct {
	PrimaryName string

	Names     []string `yaml:"names"`
	ShortName string   `yaml:"short_name"`
	Starts    string   `yaml:"starts"`
}

// Globals, yuck, but this is just a dumb CLI tool so who cares.
var (
	programs Programsv6
	setlists Setlistsv6

	songs_by_name map[string]int
	song_meta     []*SongMeta
)

func partial_match_song_name(name string) (*SongMeta, error) {
	type candidate struct {
		name string
		meta *SongMeta
	}

	candidates := make([]candidate, 0, len(song_meta))
	nameLower := strings.ToLower(name)

	for _, meta := range song_meta {
		// Skip alternate names if the short-name matches:
		if strings.ToLower(meta.ShortName) == nameLower {
			candidates = append(candidates, candidate{name: meta.ShortName, meta: meta})
			continue
		}

		for _, metaname := range meta.Names {
			if strings.HasPrefix(strings.ToLower(metaname), nameLower) {
				candidates = append(candidates, candidate{name: metaname, meta: meta})
			}
		}
	}

	if len(candidates) == 1 {
		return candidates[0].meta, nil
	}

	if len(candidates) == 0 {
		return nil, fmt.Errorf("No match for song name '%s' in song-names.yml", name)
	}
	return nil, fmt.Errorf("Multiple matches for partial song name '%s' in song-names.yml", name)
}

func parse_yaml(path string, dest interface{}) error {
	// Load YAML file:
	ymlbytes, err := ioutil.ReadFile(path)
	if err != nil {
		return err
	}

	// Parse YAML:
	err = yaml.Unmarshal(ymlbytes, dest)
	if err != nil {
		return err
	}

	return nil
}

func write_yaml(path string, src interface{}) error {
	bytes, err := yaml.Marshal(src)
	if err != nil {
		return err
	}

	err = ioutil.WriteFile(path, bytes, 0664)
	return err
}

func logTaper(b int) int {
	// 127 * (ln(x+1)^2) / (ln(127+1)^2)
	return int(127.0 * math.Pow(math.Log2(float64(b)+1.0), 2) / math.Pow(math.Log2(127.0+1.0), 2))
}

func gainOrDefault(gain int, gainDefault int) int {
	if gain != 0 {
		return gain
	}
	return gainDefault
}

func gainOrLogOrDefault(gain int, gainLog int, gainDefault int) int {
	if gain != 0 {
		return gain
	}
	if gainLog != 0 {
		return logTaper(gainLog)
	}
	return gainDefault
}

// Generate flash_rom_init.h for #include in controller C code projects
func generatePICH() {
	//var err error
	bw := NewBankedWriter()
	defer func() {
		err := bw.Close()
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}
		fmt.Println("Closed.")
	}()

	// Create lookup table of FX name to MIDI CC number:
	fx_midi_cc := make(map[string]uint8)
	for cc := uint8(41); cc <= 98; cc++ {
		key := C.GoStringN(&FWfx_names[cc-uint8(41)][0], 4)
		key = strings.ToLower(key)
		key = strings.TrimSpace(key)
		// fmt.Printf("['%s'] = 0x%02x\n", key, cc)
		fx_midi_cc[key] = cc
	}

	// Make song lookup table by name:
	for i, p := range programs.Songs {
		// Record the name-to-index mapping:
		meta, err := partial_match_song_name(p.Name)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}

		songs_by_name[meta.PrimaryName] = i
	}

	// Write header data:
	bw.WriteDecimal(uint8(len(programs.AxeMidi)))
	bw.WriteDecimal(uint8(len(programs.Songs)))

	// Write setlist data for last active setlist:
	for i := len(setlists.Sets) - 1; i >= 0; i-- {
		set := setlists.Sets[i]
		if !set.IsActive {
			continue
		}

		song_count := len(set.Songs)
		fmt.Printf("Set #%d\n", i+1)
		if song_count > FWmax_set_length {
			panic(fmt.Errorf("Set list cannot have more than %d songs; %d songs currently.", FWmax_set_length, song_count))
		}

		set.SongNames = make([]string, 0, song_count)
		for _, text := range set.Songs {
			if strings.HasPrefix(text, "BREAK: ") {
				continue
			}
			set.SongNames = append(set.SongNames, text)
		}

		// Count number of actual songs excluding BREAK lines:
		song_count = len(set.SongNames)

		fwsetlist := FWset_list{}
		fwsetlist.Count = uint8(song_count)
		fmt.Printf("  Songs: %d\n", fwsetlist.Count)

		//// dates since 2014 stored in 16 bits:
		////  yyyyyyym mmmddddd
		////  |||||||| ||||||||
		////  |||||||| |||\++++ day of month [0..30]
		////  |||||||\-+++----- month [0..11, 12-15 unused]
		////  \++++++---------- year since 2014 [0..127]

		//// Parse date string using `time` package:
		//t, err := time.Parse("2006-01-02", set.Date)
		//if err != nil {
		//	panic(fmt.Errorf("Error parsing date: '%s'", set.Date))
		//}

		//// Offset our dd, mm, yyyy values for encoding:
		//dd := (t.Day() - 1)
		//mm := (int(t.Month()) - 1)
		//yyyy := (t.Year() - 2014)

		//// Encode date as 16-bit packed value:
		//d0 := byte((dd & 31) | ((mm & 7) << 5))
		//d1 := byte(((mm >> 3) & 1) | ((yyyy & 127) << 1))

		//// Write the two 8-bit values for the date:
		//bw.WriteHex(d0)
		//bw.WriteHex(d1)
		//fmt.Printf("  Date:  %04d-%02d-%02d\n", yyyy+2014, mm+1, dd+1)

		last_song_index := 0
		// Write out the song indices for the setlist:
		for j := 0; j < FWmax_set_length; j++ {
			if j >= len(set.SongNames) {
				fwsetlist.Entries[j].Song = uint8(0xFF)
			} else {
				// Look up song by name, case-insensitive:
				meta, err := partial_match_song_name(set.SongNames[j])
				if err != nil {
					//panic(err)
					fmt.Fprintln(os.Stderr, err)
					fwsetlist.Entries[j].Song = uint8(last_song_index)
					continue
				}

				song_index, exists := songs_by_name[meta.PrimaryName]
				if !exists {
					panic(fmt.Errorf("Primary song name not found in all_programs.yml: '%s' ('%s')", meta.PrimaryName, set.SongNames[j]))
				}

				// Write out song index:
				fwsetlist.Entries[j].Song = uint8(song_index)
				fmt.Printf("  %2d) %3d %s\n", j+1, song_index+1, meta.PrimaryName)
				last_song_index = song_index
			}
		}

		// Write out set_list struct:
		lastWritten := bw.BytesWritten()
		bw.WriteDecimal(byte(fwsetlist.Count))
		for j := 0; j < FWmax_set_length; j++ {
			bw.WriteDecimal(fwsetlist.Entries[j].Song)
		}

		set_list_size := bw.BytesWritten() - lastWritten
		if set_list_size != FWset_list_sizeof {
			panic(fmt.Errorf("failed to write expected set_list size %d; wrote %d", FWset_list_sizeof, set_list_size))
		}

		// Can only write one setlist:
		break
	}

	// Write axe_midi section:
	for _, am := range programs.AxeMidi {
		bw.WriteHex(uint8(am.AmpDefaults.DirtyGain))
		bw.WriteHex(uint8(am.AmpDefaults.CleanGain))
		bw.WriteHex(uint8(am.AmpDefaults.Gate))

		for a := 0; a < 2; a++ {
			for x := 0; x < 5; x++ {
				key := strings.ToLower(am.AxeMidiAmps[a].FXLayout[x])
				key = strings.TrimSpace(key)
				cc, ok := fx_midi_cc[key]
				if !ok {
					panic(fmt.Errorf("could not find CC for FX by name '%s'", key))
				}

				bw.WriteHex(cc)
			}
		}
	}

	// Fill in remaining descriptors for axe_midi:
	for i := len(programs.AxeMidi); i < FWmax_axe_midi_program_count; i++ {
		bw.WriteHex(0x5E) // dirty_gain
		bw.WriteHex(0x1A) // clean_gain
		bw.WriteHex(71)   // gate

		bw.WriteHex(uint8(fx_midi_cc["pit1"]))
		bw.WriteHex(uint8(fx_midi_cc["rtr1"]))
		bw.WriteHex(uint8(fx_midi_cc["flg1"]))
		bw.WriteHex(uint8(fx_midi_cc["cho1"]))
		bw.WriteHex(uint8(fx_midi_cc["dly1"]))

		bw.WriteHex(uint8(fx_midi_cc["pit2"]))
		bw.WriteHex(uint8(fx_midi_cc["rtr2"]))
		bw.WriteHex(uint8(fx_midi_cc["flg2"]))
		bw.WriteHex(uint8(fx_midi_cc["cho2"]))
		bw.WriteHex(uint8(fx_midi_cc["dly2"]))
	}

	for i := 0; i < FWaxe_midi_padding; i++ {
		bw.WriteDecimal(0)
	}

	// Translate YAML to binary data for FLASH memory (see common/controller.c):
	for i, p := range programs.Songs {
		// Record the name-to-index mapping:
		meta, err := partial_match_song_name(p.Name)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}

		// Too many scenes?
		if len(p.SceneDescriptors) > FWscene_count_max {
			fmt.Fprintf(
				os.Stderr,
				"Song %s has %d scenes, more than the maximum of %d!\n",
				p.Name,
				len(p.SceneDescriptors),
				FWscene_count_max,
			)
			return
		}

		lastWritten := bw.BytesWritten()
		fwprogram := FWsong{}

		short_name := meta.ShortName

		_ = i
		// _, err = fmt.Printf("%3d) %s\n", i+1, short_name)
		// if err != nil {
		// 	fmt.Fprintln(os.Stderr, err)
		// 	return
		// }

		// Pad name to 20 chars with NULs:
		for n := 0; n < 20; n++ {
			if n < len(short_name) {
				fwprogram.Name[n] = short_name[n]
			} else {
				fwprogram.Name[n] = 0
			}
		}

		if p.AxeMidiProgram == 0 {
			p.AxeMidiProgram = programs.AllSongs.AxeMidiProgram
		}
		if p.TD50MidiProgram == 0 {
			p.TD50MidiProgram = programs.AllSongs.TD50MidiProgram
		}

		fwprogram.Axe_midi_program = uint8(p.AxeMidiProgram - 1)
		fwprogram.Td50_midi_program = uint8(p.TD50MidiProgram - 1)
		fwprogram.Tempo = uint8(p.Tempo)

		axemidi := programs.AxeMidi[fwprogram.Axe_midi_program]

		if len(p.Amp) == 0 {
			p.Amp = make([]AmpDefault, 2)
			// Inherit from AxeMidiAmp:
			p.Amp[0].DirtyGain = 0
			p.Amp[0].CleanGain = 0
			p.Amp[0].Gate = 0
		}

		// Write scene descriptors (5 bytes each):
		fwprogram.Scene_count = uint8(len(p.SceneDescriptors))
		for n, s := range p.SceneDescriptors {
			// Write amp descriptors:
			for a, amp := range []*Ampv6{&s.MG, &s.JD} {
				fwamp := &fwprogram.Scene[n].Amp[a]

				// Gain (0 = default gain for amp, 1..127 = explicit gain):
				if amp.Gain != 0 {
					fwamp.Gain = uint8(amp.Gain)
				} else {
					fwamp.Gain = 0
				}

				// Volume:
				if amp.Level > 6 {
					amp.Level = 6
				}
				fwamp.Volume = DBtoMIDI(amp.Level)

				// FX:
				fwamp.Fx = 0
				if amp.Channel == "dirty" {
					fwamp.Fx |= FWfxm_dirty
				} else if amp.Channel == "acoustic" {
					fwamp.Fx |= FWfxm_acoustc
				}

				fx_layout := axemidi.AxeMidiAmps[a].FXLayout
				if len(fx_layout) > 5 {
					fmt.Printf("Too many effects defined in fx_layout %v\n", fx_layout)
				} else {
					for _, effect := range amp.FX {
						fxn := 5
						for fxi, fxname := range fx_layout {
							if effect == fxname {
								fxn = fxi
								break
							}
						}
						if fxn >= 5 {
							fmt.Printf("Effect name '%s' not found in fx_layout %v\n", effect, fx_layout)
							continue
						}

						// Enable the effect:
						fwamp.Fx |= 1 << uint(fxn)
					}
				}

				// Gate:
				fwamp.Gate = 0
				if amp.Gate != 0 {
					g := amp.Gate

					// Range clamp:
					g = math.Max(-76.0, math.Min(-12.5, g))

					// Convert from dB to MIDI 0..127 external controller map for gate1/2 threshold:
					// SPOILER ALERT: (128.0 / (-12.0 - -76.0)) = 2.0
					fwamp.Gate = uint8((g - -76.0) * (128.0 / (-12.0 - -76.0)))

					if fwamp.Gate > 0x7F {
						panic(fmt.Errorf("gate threshold %d cannot exceed max of 127", fwamp.Gate))
					}
				}
			}
		}

		// Write out program data:
		for n := 0; n < 20; n++ {
			c := fwprogram.Name[n]
			if c < 32 || c > 127 {
				bw.WriteDecimal(c)
			} else {
				bw.WriteChar(c)
			}
		}

		bw.WriteDecimal(fwprogram.Axe_midi_program)
		bw.WriteDecimal(fwprogram.Td50_midi_program)
		bw.WriteDecimal(fwprogram.Tempo)

		if (bw.BytesWritten() - lastWritten) != 23 {
			panic(fmt.Errorf("out of sync - expected to write only 23 bytes so far"))
		}

		bw.WriteHex(fwprogram.Amp_defaults.Dirty_gain)
		bw.WriteHex(fwprogram.Amp_defaults.Clean_gain)
		bw.WriteHex(fwprogram.Amp_defaults.Gate)

		// scene_count
		bw.WriteDecimal(fwprogram.Scene_count)

		for s := 0; s < FWscene_count_max; s++ {
			for a := 0; a < 2; a++ {
				fwamp := &fwprogram.Scene[s].Amp[a]
				// Write the amp descriptor:
				bw.WriteHex(fwamp.Gain)
				bw.WriteHex(fwamp.Gate)
				bw.WriteHex(fwamp.Fx)
				bw.WriteHex(fwamp.Volume)
			}
		}

		// Padding
		for a := 0; a < len(fwprogram.X_padding); a++ {
			bw.WriteDecimal(0)
		}

		// Check written size:
		program_written_size := bw.BytesWritten() - lastWritten
		if program_written_size != FWsong_sizeof {
			panic(fmt.Errorf("Failed to write expected program size %d; wrote %d", FWsong_sizeof, program_written_size))
		}
	}
}

// Generate JSON for Google Docs setlist generator script:
func generateJSON() {
	fjson, err := os.OpenFile("setlist.json", os.O_TRUNC|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}
	defer func() {
		err = fjson.Close()
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}
	}()

	// Set up a temporary struct to marshal JSON data to:
	type setlistJson struct {
		Date  string        `json:"date"`
		Venue string        `json:"venue"`
		Songs []interface{} `json:"songs"`
	}

	setlistsJson := make([]setlistJson, 0, len(setlists.Sets))

	// Choose the last setlist:
	for _, set := range setlists.Sets {
		if !set.ShouldPrint {
			continue
		}

		setlistData := setlistJson{
			Date:  set.Date,
			Venue: set.Venue,
			Songs: make([]interface{}, 0, len(set.Songs)),
		}

		j := 0
		for _, song_name := range set.Songs {
			name_lower := strings.ToLower(song_name)
			if strings.HasPrefix(name_lower, "break: ") {
				// Write out break text:
				setlistData.Songs = append(setlistData.Songs, &struct {
					BreakText string `json:"breakText"`
				}{
					BreakText: song_name[len("break: "):],
				})
				continue
			}

			// We know we'll find the song; we would've panic()d above already.
			meta, err := partial_match_song_name(song_name)
			if err != nil {
				meta = &SongMeta{
					PrimaryName: song_name,
					Names:       []string{song_name},
					ShortName:   song_name,
					Starts:      "",
				}
			}
			j++

			setlistData.Songs = append(setlistData.Songs, &struct {
				Index  int    `json:"i"`
				Title  string `json:"title"`
				Starts string `json:"starts"`
			}{
				Index:  j,
				Title:  meta.PrimaryName,
				Starts: meta.Starts,
			})
		}
		setlistsJson = append(setlistsJson, setlistData)
	}

	// Marshal array of Printable setlists to JSON file:
	bytes, err := json.MarshalIndent(setlistsJson, "", "  ")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}

	_, err = fjson.Write(bytes)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}
}

func generateTSV() {

	tsv, err := os.Create("songs.tsv")
	if err != nil {
		panic(err)
	}
	defer tsv.Close()

	// Translate YAML to binary data for FLASH memory (see common/controller.c):
	for i, p := range programs.Songs {
		meta, err := partial_match_song_name(p.Name)
		if err != nil {
			return
		}

		fmt.Fprintf(tsv, "%d\t%s\n", i+1, meta.PrimaryName)
	}

}

func parseHex(s string) int64 {
	value, err := strconv.ParseInt(s, 16, 64)
	if err != nil {
		panic(err)
	}
	return value
}

//  p = 10 ^ (dB / 20)
// dB = log10(p) * 20
// Log20A means 20% percent at half-way point of knob, i.e. dB = 20 * ln(0.20) / ln(10) = -13.98dB
func dB(percent float64) float64 {
	db := math.Log10(percent) * 20.0
	return db
}

func MIDItoDB(n uint8) float64 {
	p := float64(n) / 127.0
	// log20a taper (50% -> 20%)
	p = (math.Pow(15.5, p) - 1.0) / 14.5
	//fmt.Printf("%3.f\n", p * 127.0)
	db := dB(p) + 6.0
	return db
}

func round(n float64) float64 {
	if (n - math.Floor(n)) >= 0.5 {
		return math.Ceil(n)
	} else {
		return math.Floor(n)
	}
}

func DBtoMIDI(db float64) uint8 {
	db = db - 6.0
	p := math.Pow(10.0, (db / 20.0))
	plog := math.Log10(p*14.5+1.0) / math.Log10(15.5)
	plog *= 127.0
	return uint8(round(plog))
}

func genVolumeTable() {
	//   0/127 = -INFdB
	//  63/127 =  -14dB
	// 127/127 =    0dB
	for n := uint8(0); n <= 127; n++ {
		db := MIDItoDB(n)
		//fmt.Printf("\"%+5.1f\", // %d == %d\n", db, n, dBtoMIDI(db))

		posdb := math.Abs(db)

		// Represent as u16 in BCD:
		bcd0 := uint16((posdb - math.Floor(posdb)) * 10)
		bcd1 := uint16(((posdb / 10.0) - math.Floor(posdb/10.0)) * 10)
		bcd2 := uint16(((posdb / 100.0) - math.Floor(posdb/100.0)) * 10)
		var bcd3 uint16
		if math.Signbit(db) {
			bcd3 = 0x0F
		} else {
			bcd3 = 0x00
		}
		db10s := (bcd3 << 12) | (bcd2 << 8) | (bcd1 << 4) | bcd0
		if math.IsInf(db, -1) {
			db10s = math.MaxUint16
		}
		fmt.Printf("0x%04X, // %d\n", db10s, n)
	}
}

func main() {
	genVolume := flag.Bool("volume", false, "Generate volume table")
	flag.Parse()

	if *genVolume {
		genVolumeTable()
		return
	}

	version = os.Getenv("HW_VERSION")
	if version == "" {
		version = "6"
	}
	// fmt.Fprintf(os.Stderr, "HW_VERSION = '%s'\n", version)
	version = "v" + version

	// Load song names mapping YAML file:
	song_names := &struct {
		Songs []*SongMeta
	}{}
	fmt.Fprintln(os.Stderr, "Loading 'song-names.yml'")
	err := parse_yaml("song-names.yml", song_names)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}

	// Convert parsed song names YAML into a lookup map:
	song_meta = song_names.Songs
	for _, meta := range song_meta {
		meta.PrimaryName = meta.Names[0]

		if len(meta.ShortName) > song_name_max_length {
			fmt.Printf("short_name is longer than %d character limit: '%s', %d chars\n", song_name_max_length, meta.ShortName, len(meta.ShortName))
		}
	}

	// Add setlist data:
	fmt.Fprintln(os.Stderr, "Loading 'setlists.yml'")
	err = parse_yaml("setlists.yml", &setlists)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}
	//fmt.Printf("%+v\n\n", setlists)

	songs_by_name = make(map[string]int)

	programs_yaml := fmt.Sprintf("all_programs-%s.yml", version)
	fmt.Fprintf(os.Stderr, "Loading '%s'\n", programs_yaml)
	err = parse_yaml(programs_yaml, &programs)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}
	//fmt.Printf("%+v\n\n", programs)

	generatePICH()

	generateJSON()

	generateTSV()
}
