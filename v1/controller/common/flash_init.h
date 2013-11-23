// Include this file inside an array initializer for flash memory!
// Assumes hardware.h has been included

// Initial stored state of flash memory:
// NOTE(jsd): This is specific to my setup.
// static u8 flash_memory[1024] = {

// 01: Monkeywrench:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
4,    // initial RJM channel v2
0,    // unused

// 02: Even flow:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
4,    // initial RJM channel v2
0,    // unused

// 03: Zero:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay | fxm_pitch),
4,    // initial RJM channel v2
0,    // unused

// 04: Wonderwall:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
2,    // initial RJM channel v2
0,    // unused

// 05: Buddy Holly:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
4,    // initial RJM channel v2
0,    // unused

// 06: Plush:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_chorus),
(fxm_noisegate | fxm_delay),
4,    // initial RJM channel v2
0,    // unused

// 07: Come Out and Play:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
4,    // initial RJM channel v2
0,    // unused

// 08: Drive:
(fxm_compressor | fxm_chorus),
(fxm_compressor | fxm_chorus | fxm_delay),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
0,    // initial RJM channel v2
0,    // unused

// 09: When I Come Around:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
4,    // initial RJM channel v2
0,    // unused

// 10: Glycerine:
(fxm_compressor),
(fxm_compressor),
(0),
(fxm_delay),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
2,    // initial RJM channel v2
0,    // unused

// 11: Enter Sandman:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
0,    // initial RJM channel v2
0,    // unused

// 12: Crawling in the Dark:
(fxm_compressor | fxm_chorus | fxm_delay),
(fxm_compressor | fxm_chorus | fxm_delay),
(fxm_noisegate | fxm_chorus | fxm_delay),
(fxm_noisegate | fxm_chorus | fxm_delay),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
2,    // initial RJM channel v2
0,    // unused

// 13: Song 2:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
0,    // initial RJM channel v2
0,    // unused

// 14: Sex Type Thing:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
4,    // initial RJM channel v2
0,    // unused

// 15: Mr. Jones:
(fxm_compressor),
(fxm_compressor | fxm_delay),
(fxm_compressor),
(fxm_compressor | fxm_delay),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
2,    // initial RJM channel v2
0,    // unused

// 16: Counting Blue Cars:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
(fxm_noisegate | fxm_delay),
4,    // initial RJM channel v2
0,    // unused

// 17: In Bloom:
(0),
(fxm_delay),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
0,    // initial RJM channel v2
0,    // unused

// 18: Hash Pipe:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
4,    // initial RJM channel v2
0,    // unused

// 19: My Hero:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
4,    // initial RJM channel v2
0,    // unused

// 20: Machinehead:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
2,    // initial RJM channel v2
0,    // unused

// 21: Holiday:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
4,    // initial RJM channel v2
0,    // unused

// 22: Closing Time:
(fxm_compressor),
(fxm_compressor),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
(fxm_noisegate),
(fxm_noisegate | fxm_delay),
2,    // initial RJM channel v2
0,    // unused

// }; // static u8 flash_memory[]
