// banked_writer
package main

import (
	"fmt"
	"os"
)

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
	//if version == "v4" {
	if w.bytesWritten&63 == 0 {
		fmt.Fprint(w.fo, "\n")
	}
	//}
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
