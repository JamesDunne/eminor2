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
		w.fo, err = os.OpenFile(fmt.Sprintf("../PIC/flash_%s.h", version), os.O_TRUNC|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			panic(err)
		}
	}

	// Write leading open curly every 128 bytes:
	if w.bytesWritten&0x7F == 0 {
		if w.bytesWritten > 0 {
			// End the previous line with a comma:
			fmt.Fprint(w.fo, ",\n")
		}
		fmt.Fprint(w.fo, "{")
		return
	}

	fmt.Fprint(w.fo, ",")
}

func (w *BankedWriter) cycle() {
	if (w.bytesWritten & 0x7F) == 0x7F {
		// Close last line:
		fmt.Fprint(w.fo, "}")
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

func (w *BankedWriter) BytesWritten() int {
	return w.bytesWritten
}
