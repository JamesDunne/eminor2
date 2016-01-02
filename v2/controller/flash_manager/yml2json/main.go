package main

import (
	"fmt"
	"io/ioutil"
	"os"

	"github.com/ghodss/yaml"
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

func FileName(path string) string {
	for i := len(path) - 1; i >= 0 && !os.IsPathSeparator(path[i]); i-- {
		if path[i] == '.' {
			return path[:i]
		}
	}
	return ""
}

func main() {
	args := os.Args[1:]
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "missing input YAML file")
		return
	}

	// Load YAML file:
	ymlbytes, err := ioutil.ReadFile(args[0])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}

	jsonbytes, err := yaml.YAMLToJSON(ymlbytes)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}

	outName := FileName(args[0]) + ".json"
	err = ioutil.WriteFile(outName, jsonbytes, 0644)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return
	}
}
