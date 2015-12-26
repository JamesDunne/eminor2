package main

import (
	"bufio"
	"encoding/hex"
	"encoding/json"
	"flag"
	"io"
	"strconv"
	//"bytes"
	"fmt"
	"io/ioutil"
	"os"
	"strings"
	"time"
)

import (
	"path"

	"gopkg.in/yaml.v2"
)

var version string

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

type SongMeta struct {
	PrimaryName string

	Names     []string `yaml:"names"`
	ShortName string   `yaml:"short_name"`
	Starts    string   `yaml:"starts"`
}

type SceneDescriptor struct {
	Channel int `yaml:"channel"` // 1, 2, 3
	Level   int `yaml:"level"`   // 5 bits signed, -16..+15, offset -9 => -25..+6

	AxeScene int `yaml:"axe_scene,omitempty"`

	FX []string `yaml:"fx,flow"`
}

type Program struct {
	Name             string            `yaml:"name"`
	GMajorProgram    int               `yaml:"gmaj_program,omitempty"`
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
	programs Programs
	setlists Setlists

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

		_, err = fmt.Printf("%3d) #%3d %s\n", i+1, p.GMajorProgram, short_name)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}

		// Copy name characters:
		for j := 0; j < song_name_max_length; j++ {
			if j >= len(short_name) {
				bw.WriteDecimal(0)
				continue
			}
			c := short_name[j]
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
			// Up-convert v1 to v2:
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

func loadHex(r io.Reader, offset int64, length int64) (finalBytes []byte, err error) {
	s := bufio.NewScanner(r)
	lineno := 0

	extendedAddress := int64(0)

	finalBytes = make([]byte, length)

readLoop:
	for s.Scan() {
		lineno++
		line := s.Text()
		// Skip blank lines:
		if len(line) == 0 {
			continue
		}
		// Make sure we have a leading ':':
		if line[0] != ':' {
			return nil, fmt.Errorf("No leading ':' in line %d", lineno)
		}
		line = line[1:]

		// Parse out the standard fields:
		recLen := parseHex(line[0 : 0+2])
		address := parseHex(line[2 : 2+4])
		recType := parseHex(line[6 : 6+2])
		payload := line[8 : 8+recLen*2]
		chksum := parseHex(line[8+recLen*2 : 8+recLen*2+2])

		// Verify checksum:
		chksum_calc := int64(0)
		for j := int64(0); j < recLen+4; j++ {
			chksum_calc += parseHex(line[j*2 : j*2+2])
		}
		chksum_calc = (^chksum_calc) + 1
		if (chksum_calc & 0xFF) != chksum {
			return nil, fmt.Errorf("Checksum fail in line %d", lineno)
		}

		const (
			HEX_FILE_EXTENDED_LINEAR_ADDRESS = 0x04
			HEX_FILE_EOF                     = 0x01
			HEX_FILE_DATA                    = 0x00
		)

		switch recType {
		case HEX_FILE_EXTENDED_LINEAR_ADDRESS:
			extendedAddress = parseHex(payload)
			break
		case HEX_FILE_EOF:
			break readLoop
		case HEX_FILE_DATA:
			actualAddress := (extendedAddress << 16) + address
			// Skip the data if it's outside our target window:
			if actualAddress < offset {
				continue
			}
			if actualAddress >= offset+length {
				// Ideally should early exit here but the HEX could suddenly relocate back into our target address space;
				// very unlikely that it would though.
				continue
			}

			fmt.Printf("%08x: %s\n", actualAddress, payload)

			var decoded int
			sliceIndex := (actualAddress - offset)
			if sliceIndex+recLen >= length {
				// Only decode up to length of buffer:
				decoded, err = hex.Decode(finalBytes[sliceIndex:len(finalBytes)], []byte(payload))
			} else {
				decoded, err = hex.Decode(finalBytes[sliceIndex:sliceIndex+recLen], []byte(payload))
				if err == nil && int64(decoded) != recLen {
					return nil, fmt.Errorf("Decoded only %d HEX bytes, expected %d on line %d", decoded, recLen, lineno)
				}
			}

			if err != nil {
				return nil, fmt.Errorf("Error decoding HEX bytes on line %d: '%s'\n%s", lineno, payload, err)
			}
			break
		}
	}
	// If any scanner errors, abort:
	if err = s.Err(); err != nil {
		return nil, err
	}

	return
}

func extractProgramsV1(hexBytes []byte) (err error) {
	// V1 programs parser:
	programs.Programs = make([]*Program, 0, 128)
	for i := 0; i < 128; i++ {
		o := i * 32
		if hexBytes[o] == 0 {
			// No holes.
			break
		}

		program := &Program{
			Name:             strings.TrimRight(string(hexBytes[o:o+20]), " \x00\n\r\t"),
			SceneDescriptors: make([]SceneDescriptor, 6, 6),
			// G-Major program number is not stored in the flash memory; it is assumed that the song definition order lines
			// up 1:1 with G-Major program numbers.
			GMajorProgram: i + 1,
		}

		meta, err := partial_match_song_name(program.Name)
		if err != nil {
			return err
		}
		program.Name = meta.ShortName

		for j := 0; j < 6; j++ {
			// Scene descriptors:
			// bits:
			// 7654 3210
			// IBBB BBCC
			// |||| ||||
			// |||| ||\+--- Channel (2 bits, 0-2, 3 ignored)
			// |+++-++--- Out Level (5 bits signed, -16..+15, offset -9 => -25..+6)
			// \----------- Initial
			program.SceneDescriptors[j].Channel = int(hexBytes[o+20+j]&3) + 1
			program.SceneDescriptors[j].Level = int((hexBytes[o+20+j]>>2)&0x1F) - 9
			program.SceneDescriptors[j].FX = make([]string, 0, 8)
			for b := uint(0); b < 8; b++ {
				if (hexBytes[o+20+6+j])&(1<<b) == (1 << b) {
					program.SceneDescriptors[j].FX = append(program.SceneDescriptors[j].FX, FXNames[b])
				}
			}
			if hexBytes[o+20+j]&0x80 == 0x80 {
				program.InitialScene = j + 1
			}
		}

		programs.Programs = append(programs.Programs, program)
	}
	return nil
}

func main() {
	hexFileName := flag.String("hex", "", "")
	hexOffset := flag.Int64("offs", 0x004900, "ROM_SAVEDATA offset in HEX file")
	const hexLength = 0x1000
	flag.Parse()

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

	// Check for HEX parsing commandline option:
	if *hexFileName != "" {
		// Read HEX file and export YAML:
		fi, err := os.Open(*hexFileName)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}
		hexBytes, err := loadHex(fi, *hexOffset, hexLength)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}

		// Parse the bytes and emit a YAML:
		err = extractProgramsV1(hexBytes)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}

		// Marshal to YAML and output:
		yamlBytes, err := yaml.Marshal(programs)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
		}
		_, yamlFileName := path.Split(*hexFileName)
		dot := strings.LastIndex(yamlFileName, ".")
		if dot >= 0 {
			yamlFileName = yamlFileName[:dot] + ".yml"
		} else {
			yamlFileName += ".yml"
		}
		fmt.Printf("Writing YAML to '%s'\n", yamlFileName)
		ioutil.WriteFile(yamlFileName, yamlBytes, 0644)
		return
	}

	version = os.Getenv("HW_VERSION")
	if version != "1" && version != "2" {
		fmt.Println("HW_VERSION environment variable must be either '1' or '2'.")
		return
	}
	fmt.Fprintf(os.Stderr, "HW_VERSION = '%s'\n", version)
	version = "v" + version

	err = parse_yaml(fmt.Sprintf("all_programs-%s.yml", version), &programs)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}
	//fmt.Printf("%+v\n\n", programs)

	// Add setlist data:
	err = parse_yaml("setlists.yml", &setlists)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}
	//fmt.Printf("%+v\n\n", setlists)

	songs_by_name = make(map[string]int)

	generatePICH()

	if version == "v1" {
		// Update YAML data:
		for _, p := range programs.Programs {
			if len(p.SceneDescriptors) != 6 {
				continue
			}
			s := make([]SceneDescriptor, 8)
			s[0] = p.SceneDescriptors[0]
			s[1] = p.SceneDescriptors[0]
			s[2] = p.SceneDescriptors[1]
			s[3] = p.SceneDescriptors[2]
			s[4] = p.SceneDescriptors[3]
			s[5] = p.SceneDescriptors[4]
			s[6] = p.SceneDescriptors[4]
			s[7] = p.SceneDescriptors[5]
			p.SceneDescriptors = s

			initialScene := 6
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
			p.InitialScene = initialScene

			for j := 0; j < 8; j++ {
				if s[j].AxeScene == 0 {
					// Axe-FX use same amp channel as RJM:
					s[j].AxeScene = s[j].Channel
					// MG doesn't like channel 3, and we don't map solo channel:
					if s[j].AxeScene > 2 {
						s[j].AxeScene = 2
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
		err = ioutil.WriteFile("all_programs-v2-gen.yml", out_text, 0644)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			return
		}
	}

	generateJSON()
}
