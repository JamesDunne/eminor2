package main

import (
	//"bytes"
	"fmt"
	"io/ioutil"
	"log"
	"os"
)

import "gopkg.in/yaml.v1"

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
	RJMEQ      bool `yaml:"rjm_eq"`

	FX []string `yaml:"fx"`
}

type Program struct {
	Name             string            `yaml:"name"`
	GMajorProgram    int               `yaml:"gmaj_program"`
	RJMInitial       int               `yaml:"rjm_initial"`
	SceneDescriptors []SceneDescriptor `yaml:"scenes"`
}

type Programs struct {
	Programs []Program `yaml:"programs"`
}

func main() {
	// Load YAML file:
	ymlbytes, err := ioutil.ReadFile("programs.yml")
	if err != nil {
		panic(err)
	}

	// Parse YAML:
	var programs Programs
	err = yaml.Unmarshal(ymlbytes, &programs)
	if err != nil {
		log.Println(err)
		return
	}
	//fmt.Printf("%+v\n\n", programs)

	fo, err := os.OpenFile("../PIC/flash_rom_init.h", os.O_TRUNC|os.O_CREATE, 0644)
	if err != nil {
		log.Println(err)
		return
	}
	defer fo.Close()

	// Translate to binary data for FLASH memory:
	for i, p := range programs.Programs {
		// Write the name first:
		if len(p.Name) > 20 {
			panic(fmt.Errorf("Name is longer than 20 character limit: '%s'", p.Name))
		}

		for j := 0; j < 20; j++ {
			if j >= len(p.Name) {
				fmt.Fprint(fo, "0, ")
				continue
			}
			c := p.Name[j]
			if c < 32 {
				fmt.Fprintf(fo, "%d, ", p.RJMInitial)
			}
			fmt.Fprintf(fo, "'%c', ", rune(c))
		}

		fmt.Fprintf(fo, "%d, ", p.RJMInitial)

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
		fmt.Fprintf(fo, "0")

		if i < len(programs.Programs)-1 {
			fmt.Fprint(fo, ",\n")
		} else {
			fmt.Fprint(fo, "\n")
		}
	}
}
