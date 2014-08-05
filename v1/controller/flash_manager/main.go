package main

import (
	"io/ioutil"
	"log"
)

import "gopkg.in/yaml.v1"

type GMajEffect int

const (
	Compressor GMajEffect = iota
	Filter
	Pitch
	Chorus
	Delay
	Reverb
	Noisegate
	EQ
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
	bytes, err := ioutil.ReadFile("programs.yml")
	if err != nil {
		panic(err)
	}

	// Parse YAML:
	var programs Programs
	err = yaml.Unmarshal(bytes, &programs)
	if err != nil {
		log.Println(err)
		return
	}
	log.Printf("%+v\n", programs)

	// Translate to binary data for FLASH memory:
	for _, _ = range programs.Programs {
		// The C struct to translate to:
		//struct program {
		//    // Name of the program in ASCII, max 20 chars, NUL terminator is optional at 20 char limit; NUL padding is preferred:
		//    char name[20];

		//    // Initial RJM channel selection (0 to 6):
		//    u8 rjm_initial;
		//    // RJM channel descriptors mapped to 6 channel selector buttons (see rjm_*); 4 bits each channels, 6 channels, hence 4x6 = 24 bits = 3 octets:
		//    u8 rjm_desc[3];

		//    // G-major program number (1 to 128, 0 for unused):
		//    u8 gmaj_program;
		//    // G-major effects enabled by default per channel (see fxm_*):
		//    u8 fx[6];

		//    // Reserved:
		//    u8 _unused;
		//};

	}
}
