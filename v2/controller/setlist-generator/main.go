package main

import (
	cryptoRand "crypto/rand"
	"encoding/binary"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"os"
	"strconv"

	"gopkg.in/yaml.v2"
)

type SongMeta struct {
	primaryName string

	Names       []string `yaml:"names"`
	ShortName   string   `yaml:"short_name"`
	Artist      string   `yaml:"artist"`
	Starts      string   `yaml:"starts"`
	Deprecated  bool     `yaml:"deprecated"`
	YouTubeLink string   `yaml:"youtubeLink"`
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
	songNamesYamlPath := "../flash_manager_v6/song-names.yml"
	err := parse_yaml(songNamesYamlPath, &meta)
	if err != nil {
		log.Fatal(err)
	}

	// Filter out deprecated songs:
	song_names := make([]*SongMeta, 0, len(meta.Songs))
	for _, song := range meta.Songs {
		if song.Deprecated {
			continue
		}
		song.primaryName = song.Names[0]

		if song.YouTubeLink == "" {
			query := fmt.Sprintf("%s %s", song.Artist, song.primaryName)
			var rspb []byte
			song.YouTubeLink, rspb, err = searchVideoLink(query)
			if err != nil {
				fmt.Println(err)
				goto ok
			}
			fmt.Fprintf(os.Stderr, "search for '%s':\n%s\n", query, string(rspb))
		}

		//fmt.Printf("%s - %s\t%s\n", song.Artist, song.primaryName, song.YouTubeLink)
	ok:
		song_names = append(song_names, song)
	}

	outb, err := yaml.Marshal(&meta)
	if err != nil {
		log.Println(err)
	} else {
		err = ioutil.WriteFile(songNamesYamlPath, outb, 0644)
		if err != nil {
			log.Println(err)
		}
	}

	// shuffle song list:
	r := rand.New(NewCryptoRandSource())
	r.Shuffle(len(song_names), func(i, j int) { song_names[i], song_names[j] = song_names[j], song_names[i] })

	// clip shuffled song list:
	args := os.Args
	if len(args) > 1 {
		max, _ := strconv.Atoi(args[1])
		if max < 0 {
			max = 0
		}
		if max >= len(song_names) {
			max = len(song_names)
		}
		song_names = song_names[:max]
	}

	// output song list:
	for _, song := range song_names {
		fmt.Println(song.Names[0])
	}
}
