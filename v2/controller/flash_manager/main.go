package main

import (
	"encoding/json"
	//"bytes"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"strings"
	"time"
)

import (
	"gopkg.in/yaml.v2"
)

const (
	version = "v1"
	//version = "v2"
)

const (
	FX_Compressor uint8 = 1 << iota
	FX_Filter
	FX_Pitch
	FX_Chorus
	FX_Delay
	FX_Reverb
	FX_Noisegate
	FX_EQ
)

type SceneDescriptor struct {
	Channel int `yaml:"channel"` // 1, 2, 3
	Level   int `yaml:"level"`   // 5 bits signed, -16..+15, offset -9 => -25..+6

	AxeScene int `yaml:"axe_scene"`

	FX []string `yaml:"fx,flow"`
}

type Program struct {
	Name             string            `yaml:"name"`
	AltNames         []string          `yaml:"altnames"`
	Starts           string            `yaml:"starts,omitempty"`
	GMajorProgram    int               `yaml:"gmaj_program"`
	InitialScene     int               `yaml:"initial_scene"`
	SceneDescriptors []SceneDescriptor `yaml:"scenes"`
}

type Programs struct {
	Programs []*Program `yaml:"programs"`
}

type Setlist struct {
	// YAML sourced:
	Date        string   `yaml:"date"`
	Venue       string   `yaml:"venue"`
	Songs       []string `yaml:"songs"`
	ShouldPrint bool     `yaml:"print"`
	IsActive    bool     `yaml:"active"`

	// Computed:
	SongNames []string
}

type Setlists struct {
	Set  int       `yaml:"set"`
	Sets []Setlist `yaml:"sets"`
}

const song_name_max_length = 20

// Globals, yuck, but this is just a dumb CLI tool so who cares.
var (
	programs      Programs
	setlists      Setlists
	songs_by_name map[string]int
)

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
	version      string
	bankNumber   int
	bytesWritten int
}

func NewBankedWriter(version string) *BankedWriter {
	w := &BankedWriter{
		fo:           nil,
		version:      version,
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
		w.fo, err = os.OpenFile(fmt.Sprintf("../PIC/flash_%s_bank%d.h", w.version, w.bankNumber), os.O_TRUNC|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			panic(err)
		}
	}

	// Don't write separators at top of bank files:
	if w.bytesWritten&0x0FFF == 0 {
		return
	}

	fmt.Fprint(w.fo, ",")
	if version == "v2" {
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
func generatePICH(version string) {
	var err error
	bw := NewBankedWriter(version)
	defer func() {
		err := bw.Close()
		if err != nil {
			log.Println(err)
			return
		}
		fmt.Println("Closed.")
	}()

	// Translate YAML to binary data for FLASH memory (see common/controller.c):
	songs := 0
	for i, p := range programs.Programs {
		_, err = fmt.Printf("%3d) #%3d %s\n", i+1, p.GMajorProgram, p.Name)
		if err != nil {
			log.Println(err)
			return
		}

		songs++

		// Write the name first:
		if len(p.Name) > song_name_max_length {
			fmt.Printf("Name is longer than %d character limit: '%s', %d chars\n", song_name_max_length, p.Name, len(p.Name))
		}

		// Record the name-to-index mapping:
		songs_by_name[strings.ToLower(p.Name)] = i
		for _, altname := range p.AltNames {
			songs_by_name[strings.ToLower(altname)] = i
		}

		// Copy name characters:
		for j := 0; j < song_name_max_length; j++ {
			if j >= len(p.Name) {
				bw.WriteDecimal(0)
				continue
			}
			c := p.Name[j]
			if c < 32 {
				bw.WriteDecimal(0)
			}
			bw.WriteChar(c)
		}

		// Scene descriptors:
		// bits:
		// 7654 3210
		// IBBB BBCC
		// |||| ||||
		// |||| ||\+--- Channel (2 bits, 0-2, 3 ignored)
		// |+++-++--- Out Level (5 bits signed, -16..+15, offset -9 => -25..+6)
		// \----------- Initial
		const (
			lvl_offset = 9
			lvl_min    = -16 - lvl_offset
			lvl_max    = 15 - lvl_offset
		)

		s := p.SceneDescriptors
		initialScene := p.InitialScene

		if version == "v2" {
			if len(p.SceneDescriptors) == 6 {
				s = make([]SceneDescriptor, 8)
				s[0] = p.SceneDescriptors[0]
				s[1] = p.SceneDescriptors[0]
				s[2] = p.SceneDescriptors[1]
				s[3] = p.SceneDescriptors[2]
				s[4] = p.SceneDescriptors[3]
				s[5] = p.SceneDescriptors[4]
				s[6] = p.SceneDescriptors[4]
				s[7] = p.SceneDescriptors[5]

				switch p.InitialScene {
				case 1:
					initialScene = 1
					break
				case 2:
					initialScene = 3
					break
				case 3:
					initialScene = 4
					break
				case 4:
					initialScene = 5
					break
				case 5:
					initialScene = 6
					break
				case 6:
					initialScene = 8
					break
				default:
					initialScene = 6
					break
				}
			}
		}

		for j := 0; j < len(s); j++ {
			// Cap the out level range to -25..+6
			lvl5bit := s[j].Level
			if lvl5bit < lvl_min {
				lvl5bit = lvl_min
			}
			if lvl5bit > lvl_max {
				lvl5bit = lvl_max
			}
			// Offset up to accommodate uneven range.
			lvl5bit += lvl_offset

			b := uint8((s[j].Channel-1)&3) | uint8((int8(lvl5bit&31))<<2)
			if initialScene-1 == j {
				b |= 0x80
			}

			// part1:
			bw.WriteHex(b)

			if version == "v2" {
				// part2:
				if s[j].AxeScene == 0 {
					// Axe-FX use same amp channel as RJM:
					s[j].AxeScene = s[j].Channel
				}
				b = uint8((s[j].AxeScene - 1) & 3)
				bw.WriteHex(b)
			}
		}

		p.SceneDescriptors = s
		p.InitialScene = initialScene

		// G-Major effects:
		for j := 0; j < len(s); j++ {
			// Translate effect name strings into bit flags:
			b := uint8(0)
			for _, effect := range s[j].FX {
				if effect == "compressor" {
					b |= FX_Compressor
				} else if effect == "filter" {
					b |= FX_Filter
				} else if effect == "pitch" {
					b |= FX_Pitch
				} else if effect == "chorus" {
					b |= FX_Chorus
				} else if effect == "delay" {
					b |= FX_Delay
				} else if effect == "reverb" {
					b |= FX_Reverb
				} else if effect == "gate" {
					b |= FX_Noisegate
				} else if effect == "eq" {
					b |= FX_EQ
				}
			}

			bw.WriteHex(b)
		}

		if version == "v2" {
			// _unused:
			for j := 0; j < 20; j++ {
				bw.WriteHex(0)
			}
		}
	}

	if version == "v1" {
		for songs = songs; songs < 128; songs++ {
			for j := 0; j < 32; j++ {
				bw.WriteDecimal(0)
			}
		}
	} else if version == "v2" {
		for songs = songs; songs < 128; songs++ {
			for j := 0; j < 64; j++ {
				bw.WriteDecimal(0)
			}
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
		//  |||||||\-+++----- month [0..11]
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
				song_name := strings.ToLower(set.SongNames[j])
				song_index, exists := songs_by_name[song_name]
				if !exists {
					panic(fmt.Errorf("Song name not found in all_programs.yml: '%s'", set.SongNames[j]))
				}

				// Write out song index:
				bw.WriteDecimal(byte(song_index))
				fmt.Printf("  %2d) %3d %s\n", j+1, song_index+1, programs.Programs[song_index].Name)
			}
		}
	}
}

// Generate JSON for Google Docs setlist generator script:
func generateJSON() {
	fjson, err := os.OpenFile("setlist.json", os.O_TRUNC|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Println(err)
		return
	}
	defer func() {
		err = fjson.Close()
		if err != nil {
			log.Println(err)
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
			// Look up song by name, case-insensitive:
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
			song_index, _ := songs_by_name[name_lower]
			j++

			// Write out song index:
			prog := programs.Programs[song_index]
			setlistData.Songs = append(setlistData.Songs, &struct {
				Index  int    `json:"i"`
				Title  string `json:"title"`
				Starts string `json:"starts"`
			}{
				Index:  j,
				Title:  prog.Name,
				Starts: prog.Starts,
			})
		}
		setlistsJson = append(setlistsJson, setlistData)
	}

	// Marshal array of Printable setlists to JSON file:
	bytes, err := json.MarshalIndent(setlistsJson, "", "  ")
	if err != nil {
		log.Println(err)
		return
	}

	_, err = fjson.Write(bytes)
	if err != nil {
		log.Println(err)
		return
	}
}

func main() {
	err := parse_yaml(fmt.Sprintf("all_programs-%s.yml", version), &programs)
	if err != nil {
		log.Println(err)
		return
	}
	//fmt.Printf("%+v\n\n", programs)

	// NOTE(jsd): Enable this to rewrite YAML data.
	if false {
		// Update YAML data:
		for _, pr := range programs.Programs {
			pr.InitialScene += 1
		}

		// Rewrite YAML file:
		out_text, err := yaml.Marshal(&programs)
		if err != nil {
			log.Println(err)
			return
		}
		err = ioutil.WriteFile("all_programs.gen.yml", out_text, 0644)
		if err != nil {
			log.Println(err)
			return
		}
		return
	}

	// Add setlist data:
	err = parse_yaml("setlists.yml", &setlists)
	if err != nil {
		log.Println(err)
		return
	}
	//fmt.Printf("%+v\n\n", setlists)

	songs_by_name = make(map[string]int)

	generatePICH(version)

	//write_yaml("all_programs.gen.yml", programs)

	generateJSON()
}
