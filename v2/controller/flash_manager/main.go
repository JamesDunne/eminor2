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

import "gopkg.in/yaml.v2"

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

// Generate flash_rom_init.h for #include in controller C code projects
func generatePICH() {
	fo, err := os.OpenFile("../PIC/flash_rom_init.h", os.O_TRUNC|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Println(err)
		return
	}
	defer func() {
		err = fo.Close()
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
				fmt.Fprint(fo, "0, ")
				continue
			}
			c := p.Name[j]
			if c < 32 {
				fmt.Fprint(fo, "0, ")
			}
			fmt.Fprintf(fo, "'%c', ", rune(c))
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

		s := make([]SceneDescriptor, 8)
		s[0] = p.SceneDescriptors[0]
		s[1] = p.SceneDescriptors[0]
		s[2] = p.SceneDescriptors[1]
		s[3] = p.SceneDescriptors[2]
		s[4] = p.SceneDescriptors[3]
		s[5] = p.SceneDescriptors[4]
		s[6] = p.SceneDescriptors[4]
		s[7] = p.SceneDescriptors[5]

		initialScene := p.InitialScene
		switch p.InitialScene {
		case 0: initialScene = 0
		case 1: initialScene = 2
		case 2: initialScene = 3
		case 3: initialScene = 4
		case 4: initialScene = 5
		case 5: initialScene = 7
		default: initialScene = 5
		}

		for j := 0; j < 8; j++ {
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
			fmt.Fprintf(fo, "0x%02X, ", b)

			// part2 (Axe-FX use same amp channel as RJM):
			b = uint8((s[j].Channel - 1) & 3)
			fmt.Fprintf(fo, "0x%02X, ", b)
		}

		// G-Major effects:
		for j := 0; j < 8; j++ {
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

			fmt.Fprintf(fo, "0x%02X, ", b)
		}

		// _unused:
		for j := 0; j < 20; j++ {
			fmt.Fprintf(fo, "0x%02X, ", 0)
		}
		fmt.Fprint(fo, "\n")
	}

	for songs = songs; songs < 128; songs++ {
		for j := 0; j < 64; j++ {
			fmt.Fprintf(fo, "0, ")
		}
		fmt.Fprint(fo, "\n")
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
		fmt.Fprintf(fo, "%d, ", byte(len(set.SongNames)))

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
		fmt.Fprintf(fo, "0x%02X, 0x%02X, ", d0, d1)
		fmt.Printf("  Date:  %04d-%02d-%02d\n", yyyy+2014, mm+1, dd+1)

		// Write out the song indices for the setlist:
		for j := 0; j < max_set_length; j++ {
			if j >= len(set.SongNames) {
				fmt.Fprintf(fo, "0xFF")
			} else {
				// Look up song by name, case-insensitive:
				song_name := strings.ToLower(set.SongNames[j])
				song_index, exists := songs_by_name[song_name]
				if !exists {
					panic(fmt.Errorf("Song name not found in all_programs.yml: '%s'", set.SongNames[j]))
				}

				// Write out song index:
				fmt.Fprintf(fo, "%2d", byte(song_index))
				fmt.Printf("  %2d) %3d %s\n", j+1, song_index+1, programs.Programs[song_index].Name)
			}
			if j < max_set_length-1 {
				fmt.Fprint(fo, ", ")
			}
		}
		if i > 0 {
			fmt.Fprint(fo, ",\n")
		} else {
			fmt.Fprint(fo, "\n")
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
	err := parse_yaml("all_programs.yml", &programs)
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

	generatePICH()

	generateJSON()
}
