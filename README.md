Read more about this project at http://eminor2.bittwiddlers.org/

The repository is split into two versions of the project, v1 and v2.

v1 is the original eminor project created in 2007 and exists as a single prototype unit. Read more about that project here: http://bittwiddlers.org/e-minor/. I continued hacking on this project well into the design and production of v2 so that I could still have a functional MIDI controller. Its code and project files are kept around for posterity now.

v2 corresponds to the more recent eminor2 project, started in 2013. I designed v2 based on the shortcomings of v1, notably the lack of enough footswitches and the physical spacing between the footswitches. The v2 has twice as many footswitches as the v1, and has one LED per each footswitch for simple signalling UX purposes. The v2 also sports a 40x4 character LCD screen which is a notable improvement over the 5x 7-segment LED display on the v1.

Each project folder is split into `controller` and `PCB`. `controller` contains all the C and microcontroller assembly source code for the firmware controller logic. `PCB` contains all the schematics, drawings, and design files for the hardware portion.
