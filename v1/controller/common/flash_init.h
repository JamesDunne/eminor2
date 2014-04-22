// Include this file inside an array initializer for flash memory!
// Assumes hardware.h has been included

// Initial stored state of flash memory:
// NOTE(jsd): This is specific to my setup.

struct program flash_memory[128] = {
    // 01: Monkeywrench:
    {
        .name = "Monkeywrench",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                4 | m_channel_initial,
                5
            }
    },

    // 02: Even flow:
    {
        .name = "Even Flow",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                4 | m_channel_initial,
                5
            }
    },

    // 03: Zero:
    {
        .name = "Zero",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay),
            (fxm_noisegate | fxm_delay | fxm_pitch)
        },
        .rjm = {
                0,
                1,
                4 | m_channel_initial,
                5,
                5,
                5
            }
    },

    // 04: Wonderwall:
    {
        .name = "Wonderwall",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (0),
            (fxm_delay),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                2 | m_channel_initial,
                3
            }
    },

    // 05: Buddy Holly:
    {
        .name = "Buddy Holly",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                4 | m_channel_initial,
                5
            }
    },

    // 06: Plush:
    {
        .name = "Plush",
        .fx = {
            (fxm_compressor | fxm_chorus),
            (fxm_compressor | fxm_chorus | fxm_delay),
            (fxm_noisegate | fxm_chorus | fxm_eq),
            (fxm_noisegate | fxm_chorus | fxm_delay | fxm_eq),
            (fxm_noisegate | fxm_chorus | fxm_eq),
            (fxm_noisegate | fxm_chorus | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                4 | m_channel_initial,
                5
            }
    },

    // 07: Come Out and Play:
    {
        .name = "Come Out and Play",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                4 | m_channel_initial,
                5
            }
    },

    // 08: Drive:
    {
        .name = "Drive",
        .fx = {
            (fxm_compressor | fxm_chorus),
            (fxm_compressor | fxm_chorus | fxm_delay),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0 | m_channel_initial,
                1,
                2,
                3,
                4,
                5
            }
    },

    // 09: When I Come Around:
    {
        .name = "When I Come Around",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                4 | m_channel_initial,
                5
            }
    },

    // 10: Everything Zen:
    {
        .name = "Everything Zen",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_compressor | fxm_eq),
            (fxm_compressor | fxm_eq | fxm_delay),
            (fxm_compressor | fxm_eq),
            (fxm_compressor | fxm_eq | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                2 | m_channel_initial,
                3
            }
    },

    // 11: Enter Sandman:
    {
        .name = "Enter Sandman",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0 | m_channel_initial,
                1,
                2,
                3,
                4,
                5
            }
    },

    // 12: Crawling in the Dark:
    {
        .name = "Crawling in the Dark",
        .fx = {
            (fxm_compressor),
            (fxm_compressor | fxm_filter | fxm_delay),
            (fxm_noisegate | fxm_filter | fxm_delay),
            (fxm_noisegate | fxm_filter | fxm_delay),
            (fxm_noisegate),
            (fxm_noisegate | fxm_filter | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2 | m_channel_initial,
                3,
                4,
                3
            }
    },

    // 13: Song 2:
    {
        .name = "Song 2",
        .fx = {
            (fxm_compressor | fxm_eq),
            (fxm_compressor | fxm_eq),
            (fxm_compressor | fxm_eq),
            (fxm_compressor | fxm_eq),
            (fxm_compressor | fxm_eq),
            (fxm_compressor | fxm_eq)
        },
        .rjm = {
                0 | m_channel_initial,
                1,
                0,
                1,
                0,
                1
            }
    },

    // 14: Sex Type Thing:
    {
        .name = "Sex Type Thing",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                4 | m_channel_initial,
                5
            }
    },

    // 15: Mr. Jones:
    {
        .name = "Mr. Jones",
        .fx = {
            (fxm_compressor),
            (fxm_compressor | fxm_delay),
            (fxm_compressor),
            (fxm_compressor | fxm_delay),
            (fxm_compressor),
            (fxm_compressor | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                2 | m_channel_initial,
                3
            }
    },

    // 16: Counting Blue Cars:
    {
        .name = "Counting Blue Cars",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (0),
            (0),
            (fxm_delay),
            (fxm_delay)
        },
        .rjm = {
                0,
                1,
                4,
                5,
                4 | m_channel_initial,
                5
            }
    },

    // 17: In Bloom:
    {
        .name = "In Bloom",
        .fx = {
            (fxm_compressor | fxm_eq),
            (fxm_compressor | fxm_eq | fxm_delay),
            (fxm_compressor | fxm_eq),
            (fxm_compressor | fxm_eq | fxm_delay),
            (fxm_compressor | fxm_eq),
            (fxm_compressor | fxm_eq | fxm_delay)
        },
        .rjm = {
                0 | m_channel_initial,
                1,
                0,
                1,
                0,
                1
            }
    },

    // 18: Hash Pipe:
    {
        .name = "Hash Pipe",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                4 | m_channel_initial,
                5
            }
    },

    // 19: My Hero:
    {
        .name = "My Hero",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                4 | m_channel_initial,
                5
            }
    },

    // 20: Machinehead:
    {
        .name = "Machinehead",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_compressor | fxm_eq),
            (fxm_compressor | fxm_eq | fxm_delay),
            (fxm_compressor | fxm_eq),
            (fxm_compressor | fxm_eq | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                2 | m_channel_initial,
                3
            }
    },

    // 21: Holiday:
    {
        .name = "Holiday",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                4 | m_channel_initial,
                5
            }
    },

    // 22: Closing Time:
    {
        .name = "Closing Time",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_compressor),
            (fxm_compressor | fxm_delay),
            (fxm_compressor),
            (fxm_compressor | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                2 | m_channel_initial,
                3
            }
    },

    // 23: Brainstew:
    {
        .name = "Brainstew",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                4 | m_channel_initial,
                5
            }
    },

    // 24: Bells:
    {
        .name = "Bells",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2,
                3,
                4 | m_channel_initial,
                5
            }
    },

    // 25: Local H:
    {
        .name = "Local H",
        .fx = {
            (fxm_compressor),
            (fxm_compressor),
            (fxm_noisegate),
            (fxm_noisegate),
            (fxm_noisegate | fxm_delay | fxm_chorus),
            (fxm_noisegate | fxm_delay)
        },
        .rjm = {
                0,
                1,
                2 | m_channel_initial,
                3,
                2,
                3
            }
    },
};
