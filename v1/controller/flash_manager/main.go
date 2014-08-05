package main

import (
	"io/ioutil"
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
	RJMChannel int
	RJMSolo    bool
	RJMEQ      bool

	FX map[GMajEffect]bool
}

type Program struct {
	Name             string
	GMajorProgram    int
	RJMInitial       int
	SceneDescriptors []SceneDescriptor
}

func main() {
	bytes, err := ioutil.ReadFile("programs.yml")
	if err != nil {
		panic(err)
	}

	var programs Program
	err = yaml.Unmarshal(bytes, &programs)
	if err != nil {
		panic(err)
	}

}
