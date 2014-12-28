package main

import (
	"image"
	//"time"
)
import "github.com/andlabs/ui"

//#include "../common/controller-simple.c"
import "C"

const mmToIn = 0.0393701

// display scale factor (pixels per inch)
// NOTE(jsd): 55.4 dpi is to-scale on my 40" Samsung HDTV 1080p
const defaultDpi = 55.4
const dpi = 93.5

// Total width, height in inches:
const inWidth = 20.078
const inHeight = 6.305

// Position and spacing of footswitches (from centers):
const hLeft = 1.0
const hSpacing = 2.5714285714285714285714285714286

// From bottom going up:
const vStart = 5.6
const vSpacing = 2.15

const vLEDOffset = -0.65

const inLEDOuterDiam = (12 /*mm*/ * mmToIn)
const inFswOuterDiam = (12.2 /*mm*/ * mmToIn)
const inFswInnerDiam = (10 /*mm*/ * mmToIn)

// button labels:
var labels = [][]string{
	[]string{"CH1", "CH1S", "CH2", "CH2S", "CH3", "CH3S", "TAP/STORE", "NEXT"},
	[]string{"COMP", "FILTER", "PITCH", "CHORUS", "DELAY", "REVERB", "MUTE", "PREV"},
}

var keylabels = [][]string{
	[]string{"A", "S", "D", "F", "G", "H", "J", "K"},
	[]string{"Q", "W", "E", "R", "T", "Y", "U", "I"},
}

type canvasArea struct {
	img *image.RGBA
}

// Paint is called when the Area needs to be redrawn.
// The part of the Area that needs to be redrawn is stored in cliprect.
// Before Paint() is called, this region is cleared with a system-defined background color.
// You MUST handle this event, and you MUST return a valid image, otherwise deadlocks and panicking will occur.
// The image returned must have the same size as rect (but does not have to have the same origin points).
// Example:
// 	imgFromFile, _, err := image.Decode(file)
// 	if err != nil { panic(err) }
// 	img := image.NewRGBA(imgFromFile.Rect)
// 	draw.Draw(img, img.Rect, imgFromFile, image.ZP, draw.Over)
// 	// ...
// 	func (h *myAreaHandler) Paint(rect image.Rectangle) *image.RGBA {
// 		return img.SubImage(rect).(*image.RGBA)
// 	}
func (area *canvasArea) Paint(cliprect image.Rectangle) *image.RGBA {
	return area.img
}

// Mouse is called when the Area receives a mouse event.
// You are allowed to do nothing in this handler (to ignore mouse events).
// See MouseEvent for details.
// After handling the mouse event, package ui will decide whether to perform platform-dependent event chain continuation based on that platform's designated action (so it is not possible to override global mouse events this way).
func (area *canvasArea) Mouse(e ui.MouseEvent) {
	return
}

// Key is called when the Area receives a keyboard event.
// Return true to indicate that you handled the event; return false to indicate that you did not and let the system handle the event.
// You are allowed to do nothing in this handler (to ignore keyboard events); in this case, return false.
// See KeyEvent for details.
func (area *canvasArea) Key(e ui.KeyEvent) (handled bool) {
	return false
}

func main() {
	hw_init()

	C.controller_init()

	//timer_10ms := time.Tick(10 * time.Millisecond)
	//for {
	//	C.controller_handle()
	//	select {
	//	case <-timer_10ms:
	//		C.controller_10msec_timer()
	//	default:
	//	}
	//}

	go ui.Do(func() {
		widthFloat := float64(inWidth * dpi)
		heightFloat := float64(inHeight * dpi)
		width := int(widthFloat)
		height := int(heightFloat)

		canvas := &canvasArea{
			img: image.NewRGBA(image.Rect(0, 0, width, height)),
		}
		area := ui.NewArea(width, height, canvas)
		w := ui.NewWindow("e-minor v2", width+6, height+28, area)

		w.Show()
	})
	err := ui.Go()
	if err != nil {
		panic(err)
	}
}
