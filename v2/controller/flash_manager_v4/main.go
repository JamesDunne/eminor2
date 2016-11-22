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
	"time"
)

import (
	//"path"

	"gopkg.in/yaml.v2"
)

var version string

const (
	FX4_Dirty uint8 = 1 << iota
	FX4_Delay
	FX4_Pitch
	FX4_Chorus
	FX4_XY
)

type Ampv4 struct {
	XY      string   `yaml:"xy"`      // "X" or "Y" amp settings
	Channel string   `yaml:"channel"` // "clean" or "dirty"
	Level   float64  `yaml:"level"`   // dB
	FX      []string `yaml:"fx,flow"` // any combo of "delay", "pitch", or "chorus"
}

type SceneDescriptorv4 struct {
	Name string `yaml:"name"`
	MG   Ampv4  `yaml:"MG"`
	JD   Ampv4  `yaml:"JD"`
}

type Programv4 struct {
	Name             string              `yaml:"name"`
	SceneDescriptors []SceneDescriptorv4 `yaml:"scenes"`
}

type Programsv4 struct {
	Programs []*Programv4 `yaml:"programs"`
}

type Setlistv4 struct {
	// YAML sourced:
	Date        string   `yaml:"date"`
	Venue       string   `yaml:"venue"`
	Songs       []string `yaml:"songs"`
	ShouldPrint bool     `yaml:"print"`
	IsActive    bool     `yaml:"active"`

	// Computed:
	SongNames []string
}

type Setlistsv4 struct {
	Set  int         `yaml:"set"`
	Sets []Setlistv4 `yaml:"sets"`
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

type SceneDescriptorv3 struct {
	Channel int `yaml:"channel"` // 1, 2, 3
	Level   int `yaml:"level"`   // 5 bits signed, -16..+15, offset -9 => -25..+6

	AxeScene int `yaml:"axe_scene,omitempty"`

	FX []string `yaml:"fx,flow"`
}

type Programv3 struct {
	Name             string              `yaml:"name"`
	GMajorProgram    int                 `yaml:"gmaj_program,omitempty"`
	InitialScene     int                 `yaml:"initial_scene"`
	SceneDescriptors []SceneDescriptorv3 `yaml:"scenes"`
	Sequence         []int               `yaml:"sequence"`
}

type Programsv3 struct {
	Programs []*Programv3 `yaml:"programs"`
}

type Setlistv3 struct {
	// YAML sourced:
	Date        string   `yaml:"date"`
	Venue       string   `yaml:"venue"`
	Songs       []string `yaml:"songs"`
	ShouldPrint bool     `yaml:"print"`
	IsActive    bool     `yaml:"active"`

	// Computed:
	SongNames []string
}

type Setlistsv3 struct {
	Set  int         `yaml:"set"`
	Sets []Setlistv3 `yaml:"sets"`
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
	programs Programsv4
	setlists Setlistsv4

	programsv3 Programsv3
	setlistsv3 Setlistsv3

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
		return nil, fmt.Errorf("No match for song name")
	}
	return nil, fmt.Errorf("Multiple matches for partial song name")
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

type BankedWriter struct {
	fo           *os.File
	bankNumber   int
	bytesWritten int
}

func NewBankedWriter() *BankedWriter {
	w := &BankedWriter{
		fo:           nil,
		bankNumber:   0,
		bytesWritten: 0,
	}

	return w
}

func (w *BankedWriter) Close() error {
	if w.fo == nil {
		return nil
	}

	// MPLAB C18 compiler requires a newline at the end of the header file, otherwise you get a syntax error.
	fmt.Fprint(w.fo, "\n")

	return w.fo.Close()
}

func (w *BankedWriter) writeSeparator() {
	// Open new file when needed:
	if w.fo == nil {
		var err error
		w.fo, err = os.OpenFile(fmt.Sprintf("../PIC/flash_%s_bank%d.h", version, w.bankNumber), os.O_TRUNC|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			panic(err)
		}
	}

	// Don't write separators at top of bank files:
	if w.bytesWritten&0x0FFF == 0 {
		return
	}

	fmt.Fprint(w.fo, ",")
	if version == "v2" || version == "v3" || version == "v4" {
		if w.bytesWritten&63 == 0 {
			fmt.Fprint(w.fo, "\n")
		}
	} else if version == "v1" {
		if w.bytesWritten&31 == 0 {
			fmt.Fprint(w.fo, "\n")
		}
	}
}

func (w *BankedWriter) cycle() {
	// Are we about to cross a 4K boundary?
	if (w.bytesWritten & 0x0FFF) == 0x0FFF {
		// Close last open file:
		w.Close()

		// Next bank:
		w.bankNumber++

		// Indicate to open a new file on next write:
		w.fo = nil
	}

	w.bytesWritten++
}

func (w *BankedWriter) WriteHex(b uint8) {
	w.writeSeparator()
	fmt.Fprintf(w.fo, " 0x%02X", b)
	w.cycle()
}

func (w *BankedWriter) WriteDecimal(b uint8) {
	w.writeSeparator()
	fmt.Fprintf(w.fo, "  %3d", b)
	w.cycle()
}

func (w *BankedWriter) WriteChar(b uint8) {
	w.writeSeparator()
	fmt.Fprintf(w.fo, "  '%c'", rune(b))
	w.cycle()
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

	// Define name_table:
	name_table := make([]string, 0, len(programs.Programs))
	name_table_lookup := make(map[string]int)

	// Function to set or get name_table entry:
	set_name_table := func(name string) uint8 {
		if idx, ok := name_table_lookup[name]; ok {
			return uint8(idx)
		} else {
			idx := len(name_table)
			name_table_lookup[name] = idx
			name_table = append(name_table, name)
			if idx > 255 {
				panic("Ran out of name_table entries!")
			}
			return uint8(idx)
		}
	}

	// Translate YAML to binary data for FLASH memory (see common/controller.c):
	songs := 0
	for i, p := range programs.Programs {
		songs++

		// Record the name-to-index mapping:
		meta, err := partial_match_song_name(p.Name)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}
		songs_by_name[meta.PrimaryName] = i

		short_name := meta.ShortName

		_, err = fmt.Printf("%3d) %s\n", i+1, short_name)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}

		// Write name into name table:
		bw.WriteHex(set_name_table(short_name))

		// Copy scenes:
		/*
			struct program {
			    // Index into the name table for the name of the program (song):
			    u8 name_index;

			    // Number of scenes defined:
			    u8 scene_count;
			    u8 _unused1;    // perhaps AXE-FX program # for different songs?
			    u8 _unused2;

			    // Scene descriptors (5 bytes each):
			    struct scene_descriptor {
			        // Index into the name table for the name of the scene:
			        u8 name_index;
			        // 2 amps:
			        struct amp amp[2];
			    } scene[12];
			};
		*/

		// Write scene count:
		bw.WriteDecimal(uint8(len(p.SceneDescriptors)))
		bw.WriteDecimal(0)
		bw.WriteDecimal(0)

		// Write scene descriptors (5 bytes each):
		n := 0
		for _, s := range p.SceneDescriptors {
			n++

			// Write name_table index of scene name:
			bw.WriteHex(set_name_table(s.Name))

			// Write amp descriptors:
			for _, amp := range []*Ampv4{&s.MG, &s.JD} {
				b1, b2 := byte(0), byte(0)
				if amp.Channel == "dirty" {
					b1 |= FX4_Dirty
				}
				if amp.XY == "Y" {
					b1 |= FX4_XY
				}
				for _, effect := range amp.FX {
					if effect == "pitch" {
						b1 |= FX4_Pitch
					} else if effect == "chorus" {
						b1 |= FX4_Chorus
					} else if effect == "delay" {
						b1 |= FX4_Delay
					}
				}

				if amp.Level < -57.5 {
					amp.Level = -57.5
				}
				if amp.Level > 6 {
					amp.Level = 6
				}
				b2 = uint8((amp.Level * 2) + (127 - 12))

				bw.WriteHex(b1)
				bw.WriteHex(b2)
			}
		}

		if n < 12 {
			// Pad the remaining scenes:
			for ; n < 12; n++ {
				bw.WriteDecimal(0)
				bw.WriteDecimal(0)
				bw.WriteDecimal(0)
				bw.WriteDecimal(0)
				bw.WriteDecimal(0)
			}
		}
	}

	for ; songs < 128; songs++ {
		// Pad the remaining songs:
		for j := 0; j < 64; j++ {
			bw.WriteDecimal(0)
		}
	}

	const max_set_length = 61

	// Write setlist data in reverse order of sets:
	for i := len(setlists.Sets) - 1; i >= 0; i-- {
		set := setlists.Sets[i]
		if !set.IsActive {
			continue
		}

		fmt.Printf("Set #%d\n", i+1)
		if len(set.Songs) > max_set_length {
			panic(fmt.Errorf("Set list cannot have more than %d songs; %d songs currently.", max_set_length, len(set.Songs)))
		}

		set.SongNames = make([]string, 0, len(set.Songs))
		for _, text := range set.Songs {
			if strings.HasPrefix(text, "BREAK: ") {
				continue
			}
			set.SongNames = append(set.SongNames, text)
		}

		fmt.Printf("  Songs: %d\n", len(set.SongNames))
		bw.WriteDecimal(byte(len(set.SongNames)))

		// dates since 2014 stored in 16 bits:
		//  yyyyyyym mmmddddd
		//  |||||||| ||||||||
		//  |||||||| |||\++++ day of month [0..30]
		//  |||||||\-+++----- month [0..11, 12-15 unused]
		//  \++++++---------- year since 2014 [0..127]

		// Parse date string using `time` package:
		t, err := time.Parse("2006-01-02", set.Date)
		if err != nil {
			panic(fmt.Errorf("Error parsing date: '%s'", set.Date))
		}

		// Offset our dd, mm, yyyy values for encoding:
		dd := (t.Day() - 1)
		mm := (int(t.Month()) - 1)
		yyyy := (t.Year() - 2014)

		// Encode date as 16-bit packed value:
		d0 := byte((dd & 31) | ((mm & 7) << 5))
		d1 := byte(((mm >> 3) & 1) | ((yyyy & 127) << 1))

		// Write the two 8-bit values for the date:
		bw.WriteHex(d0)
		bw.WriteHex(d1)
		fmt.Printf("  Date:  %04d-%02d-%02d\n", yyyy+2014, mm+1, dd+1)

		// Write out the song indices for the setlist:
		for j := 0; j < max_set_length; j++ {
			if j >= len(set.SongNames) {
				bw.WriteHex(0xFF)
			} else {
				// Look up song by name, case-insensitive:
				meta, err := partial_match_song_name(set.SongNames[j])
				if err != nil {
					panic(err)
				}

				song_index, exists := songs_by_name[meta.PrimaryName]
				if !exists {
					panic(fmt.Errorf("Primary song name not found in all_programs.yml: '%s' ('%s')", meta.PrimaryName, set.SongNames[j]))
				}

				// Write out song index:
				bw.WriteDecimal(byte(song_index))
				fmt.Printf("  %2d) %3d %s\n", j+1, song_index+1, meta.PrimaryName)
			}
		}
	}

	// Generate name table (20 chars each):
	for _, name := range name_table {
		for j := 0; j < 20; j++ {
			if j >= len(name) {
				bw.WriteDecimal(0)
				continue
			}
			c := name[j]
			if c < 32 {
				bw.WriteDecimal(0)
			}
			bw.WriteChar(c)
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
			meta, _ := partial_match_song_name(song_name)
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

func parseHex(s string) int64 {
	value, err := strconv.ParseInt(s, 16, 64)
	if err != nil {
		panic(err)
	}
	return value
}

func volume_7bit(level float64) uint8 {
	p := math.Pow(10.0, (level / 20.0))
	p = (p * 64)
	v := uint8(p)
	return v
}

func genVolumeTable() {
	// 7 bit signed volume in half-dB increments, where (0dB = 127 - 12):
	for level := -115; level <= 12; level++ {
		v := volume_7bit(float64(level) / 2.0)
		fmt.Printf(", %3v // %+5.1f dB\n", v, float64(level)/2.0)
	}
}

func main() {
	convertV3toV4 := flag.Bool("convert", false, "Convert V3 to V4 YAML")
	genVolume := flag.Bool("volume", false, "Generate volume table")
	flag.Parse()

	if *genVolume {
		genVolumeTable()
		return
	}

	version = os.Getenv("HW_VERSION")
	if version != "1" && version != "2" && version != "3" && version != "4" {
		version = "4"
	}
	fmt.Fprintf(os.Stderr, "HW_VERSION = '%s'\n", version)
	version = "v" + version

	// Load song names mapping YAML file:
	song_names := &struct {
		Songs []*SongMeta
	}{}
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
	err = parse_yaml("setlists.yml", &setlists)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}
	//fmt.Printf("%+v\n\n", setlists)

	songs_by_name = make(map[string]int)

	if *convertV3toV4 {
		err = parse_yaml(fmt.Sprintf("all_programs-%s.yml", "v3"), &programsv3)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}
		//fmt.Printf("%+v\n\n", programs)

		// Update YAML data from v3 to v4:
		programs.Programs = make([]*Programv4, 0, len(programsv3.Programs))
		for _, p3 := range programsv3.Programs {
			p4 := new(Programv4)
			programs.Programs = append(programs.Programs, p4)

			// Copy program name:
			p4.Name = p3.Name

			// Create descriptors in sequence order:
			p4.SceneDescriptors = make([]SceneDescriptorv4, 0, len(p3.Sequence))
			for _, snum := range p3.Sequence {
				// Look up original scene:
				s3 := p3.SceneDescriptors[snum-1]

				p4.SceneDescriptors = append(p4.SceneDescriptors, SceneDescriptorv4{})
				s4 := &p4.SceneDescriptors[len(p4.SceneDescriptors)-1]

				s4.Name = ""
				if s3.Channel == 1 {
					s4.JD.Channel = "clean"
				} else {
					s4.JD.Channel = "dirty"
				}
				if s3.Channel == 2 {
					s4.JD.XY = "Y"
				} else {
					s4.JD.XY = "X"
				}

				s4.JD.Level = float64(s3.Level * 6 / 5)

				// Filter out bad FX that no longer apply:
				s4.JD.FX = make([]string, 0, len(s3.FX))
				for _, fx := range s3.FX {
					if fx == "gate" || fx == "eq" || fx == "compressor" {
						continue
					}
					s4.JD.FX = append(s4.JD.FX, fx)
				}

				// If any FX are enabled and we're on a dirty channel it's a lead:
				if s3.Channel != 1 && (s3.Level > 0 || len(s4.JD.FX) > 0) {
					s4.Name += "JD lead"
				} else {
					if s3.Channel == 1 {
						s4.Name += "JD clean"
					} else {
						s4.Name += "JD dirty"
					}
				}

				if s3.AxeScene == 1 {
					s4.MG.Channel = "clean"
				} else {
					s4.MG.Channel = "dirty"
				}
				s4.MG.XY = "X"
				if s3.AxeScene == 4 {
					s4.MG.Level = 3
					s4.MG.FX = []string{"delay"}
					s4.Name += ";MG lead"
				} else {
					s4.MG.Level = 0
					if s3.AxeScene == 1 {
						s4.Name += ";MG clean"
					} else {
						s4.Name += ";MG dirty"
					}
				}
			}
		}

		// Rewrite YAML file:
		out_text, err := yaml.Marshal(&programs)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}
		err = ioutil.WriteFile("all_programs-v4.yml", out_text, 0644)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}

		return
	}

	err = parse_yaml(fmt.Sprintf("all_programs-%s.yml", version), &programs)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}
	//fmt.Printf("%+v\n\n", programs)

	generatePICH()

	//generateJSON()
}
