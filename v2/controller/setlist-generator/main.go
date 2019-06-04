package main

import (
	cryptoRand "crypto/rand"
	"encoding/binary"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"

	"gopkg.in/yaml.v2"
)

type SongMeta struct {
	PrimaryName string

	Names      []string `yaml:"names"`
	ShortName  string   `yaml:"short_name"`
	Starts     string   `yaml:"starts"`
	Deprecated bool     `yaml:"deprecated"`
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

type CryptoRandSource struct{}

func NewCryptoRandSource() CryptoRandSource {
	return CryptoRandSource{}
}

func (_ CryptoRandSource) Int63() int64 {
	var b [8]byte
	cryptoRand.Read(b[:])
	// mask off sign bit to ensure positive number
	return int64(binary.LittleEndian.Uint64(b[:]) & (1<<63 - 1))
}
func (_ CryptoRandSource) Seed(seed int64) {}

func main() {
	meta := &struct {
		Songs []*SongMeta
	}{}
	err := parse_yaml("../flash_manager_v5/song-names.yml", &meta)
	if err != nil {
		log.Fatal(err)
	}

	// Filter out deprecated songs:
	song_names := make([]*SongMeta, 0, len(meta.Songs))
	for _, song := range meta.Songs {
		if song.Deprecated {
			continue
		}
		song_names = append(song_names, song)
	}

	// shuffle song list:
	r := rand.New(NewCryptoRandSource())
	r.Shuffle(len(song_names), func(i, j int) { song_names[i], song_names[j] = song_names[j], song_names[i] })

	for _, song := range song_names {
		fmt.Println(song.Names[0])
	}
}
