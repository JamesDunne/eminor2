package main

import (
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
	RJMChannel int  `yaml:"rjm_channel"`
	RJMSolo    bool `yaml:"rjm_solo"`
	RJMEQ      bool `yaml:"rjm_eq,omitempty"`

	FX []string `yaml:"fx,flow"`
}

type Program struct {
	Name             string            `yaml:"name"`
	GMajorProgram    int               `yaml:"gmaj_program"`
	RJMInitial       int               `yaml:"rjm_initial"`
	SceneDescriptors []SceneDescriptor `yaml:"scenes"`
}

type Programs struct {
	Programs []*Program `yaml:"programs"`
}

type Setlist struct {
	Date  string   `yaml:"date"`
	Songs []string `yaml:"songs"`
}

type Setlists struct {
	Set  int       `yaml:"set"`
	Sets []Setlist `yaml:"sets"`
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

func main() {
	var programs Programs
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
			pr.RJMInitial += 1
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
	var setlists Setlists
	err = parse_yaml("setlists.yml", &setlists)
	if err != nil {
		log.Println(err)
		return
	}
	//fmt.Printf("%+v\n\n", setlists)

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

	const song_name_max_length = 20

	// Translate to binary data for FLASH memory:
	songs_by_name := make(map[string]int)
	songs := 0
	for i, p := range programs.Programs {
		_, err = fmt.Printf("%3d) %s\n", i+1, p.Name)
		if err != nil {
			log.Println(err)
			return
		}

		songs++

		// Write the name first:
		if len(p.Name) > 20 {
			fmt.Printf("Name is longer than 20 character limit: '%s', %d chars\n", p.Name, len(p.Name))
		}

		// Record the name-to-index mapping:
		songs_by_name[strings.ToLower(p.Name)] = i

		// Copy name characters:
		for j := 0; j < 20; j++ {
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

		// Initial channel:
		fmt.Fprintf(fo, "%d, ", p.RJMInitial-1)

		// RJM channel descriptors:
		s := p.SceneDescriptors
		for j := 0; j < 3; j++ {
			b := uint8((s[j*2+0].RJMChannel - 1) | ((s[j*2+1].RJMChannel - 1) << 4))
			if s[j*2+0].RJMSolo {
				b |= 0x04
			}
			if s[j*2+0].RJMEQ {
				b |= 0x08
			}
			if s[j*2+1].RJMSolo {
				b |= 0x40
			}
			if s[j*2+1].RJMEQ {
				b |= 0x80
			}

			fmt.Fprintf(fo, "0x%02X, ", b)
		}

		// G-Major effects:
		fmt.Fprintf(fo, "%d, ", p.GMajorProgram)
		for j := 0; j < 6; j++ {
			// Translate effect name strings into bit flags:
			b := uint8(0)
			for _, effect := range p.SceneDescriptors[j].FX {
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
				} else if effect == "noisegate" {
					b |= FX_Noisegate
				} else if effect == "eq" {
					b |= FX_EQ
				}
			}

			fmt.Fprintf(fo, "0x%02X, ", b)
		}

		// Unused:
		fmt.Fprint(fo, "0")

		fmt.Fprint(fo, ",\n")
	}

	for songs = songs; songs < 128; songs++ {
		fmt.Fprint(fo, "0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0")

		fmt.Fprint(fo, ",\n")
	}

	const max_set_length = 29

	// Write setlist data in reverse order of sets:
	for i := len(setlists.Sets) - 1; i >= 0; i-- {
		set := setlists.Sets[i]
		fmt.Printf("Set #%d\n", i+1)
		if len(set.Songs) > max_set_length {
			panic(fmt.Errorf("Set list cannot have more than %d songs; %d songs currently.", max_set_length, len(set.Songs)))
		}

		fmt.Printf("  Songs: %d\n", len(set.Songs))
		fmt.Fprintf(fo, "%d, ", byte(len(set.Songs)))

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
		fmt.Fprintf(fo, "%d, %d, ", d0, d1)
		fmt.Printf("  Date:  %04d-%02d-%02d\n", yyyy+2014, mm+1, dd+1)

		// Write out the song indices for the setlist:
		for j := 0; j < max_set_length; j++ {
			if j >= len(set.Songs) {
				fmt.Fprintf(fo, "0xFF")
			} else {
				// Look up song by name, case-insensitive:
				song_name := strings.ToLower(set.Songs[j])
				song_index, exists := songs_by_name[song_name]
				if !exists {
					panic(fmt.Errorf("Song name not found in all_programs.yml: '%s'", set.Songs[j]))
				}

				// Write out song index:
				fmt.Fprintf(fo, "0x%02X", byte(song_index))
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
