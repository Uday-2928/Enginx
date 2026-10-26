import type { TutorialLesson } from '../types';

export const module08Lessons: TutorialLesson[] = [
  {
    id: 'embc-m08-l1',
    title: 'SPI Fundamentals: Signals and the Shift-Register Exchange',
    summary:
      'Four wires, a controller and peripherals, and the elegant full-duplex shift-register swap that moves every SPI byte.',
    objectives: [
      'Name the four SPI signals and state each one\'s direction and purpose.',
      'Explain controller/peripheral roles and why chip select enables a device.',
      'Model the 8-clock shift-register exchange and predict both sides\' bytes.',
      'Explain why the first exchange of a session reads meaningless data.',
    ],
    whyItMatters:
      'SPI is the fastest common embedded bus — flash chips, displays, SD cards and sensors all speak it. Its shift-register model is simple enough to hold in your head completely, which makes SPI debugging the most predictable of the serial buses.',
    prerequisites: ['embc-m07-l1', 'embc-m03-l1'],
    explanation:
      'SPI (serial peripheral interface) is a short-distance, synchronous, full-duplex bus. One device — the **controller** (historically "master") — generates the serial clock; every other device is a **peripheral** that shifts data in step with that clock. There is no addressing or acknowledgement on the wire: selection is done by a dedicated wire per peripheral.\n\n### The four signals\n\n- **SCLK** — the clock, always driven by the controller. Every bit moves on its edges; without it, nothing happens.\n- **MOSI** ("controller out, peripheral in") — data from controller to peripheral.\n- **MISO** ("controller in, peripheral out") — data from peripheral to controller.\n- **CS/SS** (chip select, active-low) — one wire per peripheral. The selected peripheral connects its shift register to MISO; unselected ones release the lines.\n\n### The shift-register exchange\n\nBoth sides hold an 8-bit shift register wired into a ring: the controller\'s output feeds the peripheral\'s input and vice versa. On each of 8 clock edges, both sides shift one bit across. After exactly 8 clocks, the two bytes have swapped places: the controller now holds what the peripheral had, and the peripheral holds what the controller sent. This is why SPI is **full-duplex**: reading and writing happen simultaneously in every exchange, even when one direction is meaningless.\n\n### The first-byte consequence\n\nBecause the exchange swaps *old* contents, the first exchange of a session returns whatever the peripheral\'s shift register held (often 0x00 or 0xFF) while delivering the controller\'s command. Real device protocols are designed around this: the controller sends a command and *then* clocks dummy bytes (0x00 or 0xFF) whose exchange results are the actual response. "My SPI device returns garbage on the first byte" is not a bug — it is the shift-register model working exactly as built.',
    deepDive:
      '### Why SPI is fast — and short-range\n\nNo addressing overhead, no arbitration, no acknowledgement per byte: the controller just clocks bits as fast as both ends allow (tens of MHz on ordinary parts). The costs are wiring (one CS per device — pins grow linearly with devices), no flow control, and no standard connector or discovery protocol: every device defines its own command set. Distance is limited because the un-clocked, un-checked lines are noise-sensitive; SPI runs on PCBs and inside enclosures, not across rooms (that is UART/RS-485 territory).\n\n### Speed and the clock divider\n\nThe controller\'s SPI peripheral divides the bus clock to make SCLK, exactly like a timer prescaler: SCLK = f_bus / divider. The datasheet of the *peripheral device* states its maximum SCLK — the controller must not exceed it. A common bring-up rule: start at a low SCLK (e.g. 1 MHz), prove the protocol works, then raise the clock until errors appear, then back off with margin. Mode and speed misconfiguration produce different symptoms — mode errors shift or invert data; excessive speed produces sporadic single-bit errors that scale with clock rate.\n\n### Reading an SPI device datasheet, honestly\n\nReal devices (an SPI flash chip, an accelerometer) define: the command byte values, whether data follows an address, MSB- or LSB-first, the required SPI mode (CPOL/CPHA — next lesson), maximum clock, and CS frame rules (commands are usually valid only within one CS-low session). Those command sets are device-specific and *must* come from that device\'s datasheet — there is no universal SPI command standard. Lesson 3 builds a mock device with a simple command set so you practise exactly this reading skill.',
    examples: [
      {
        title: 'The full-duplex swap, simulated and traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of an SPI controller + one peripheral.\n * Real firmware drives the vendor\'s SPI registers (STM32 SPIx_DR,\n * ATmega SPDR); the exchange-in-8-clocks behaviour modelled here is\n * what the silicon does. */\nstatic volatile uint8_t MOCK_SPI_DR = 0x00u;   /* controller data reg  */\nstatic uint8_t mock_slave_shift = 0x00u;       /* peripheral shift reg */\n\nstatic uint8_t spi_exchange(uint8_t out) {\n    MOCK_SPI_DR = out;                 /* load controller register        */\n    /* 8 SCLK edges: the two registers swap contents. */\n    uint8_t in = mock_slave_shift;     /* controller receives old slave   */\n    mock_slave_shift = out;            /* peripheral receives ours        */\n    return in;\n}\n\nint main(void) {\n    uint8_t r1 = spi_exchange(0x01u);  /* command byte: "read ID" (say)  */\n    uint8_t r2 = spi_exchange(0x00u);  /* dummy byte: clocks the answer  */\n    uint8_t r3 = spi_exchange(0x00u);  /* another dummy for a 2nd byte   */\n\n    printf("xchg1 got 0x%02X\\n", (unsigned)r1);\n    printf("xchg2 got 0x%02X\\n", (unsigned)r2);\n    printf("xchg3 got 0x%02X\\n", (unsigned)r3);\n    return 0;\n}',
        explanation: [
          'Exchange 1 delivers our command 0x01 to the peripheral; the controller receives the peripheral\'s *old* shift-register content, 0x00.',
          'Exchange 2 (a dummy 0x00) now receives what the peripheral prepared during exchange 1 — the mock models that as 0x01.',
          'Exchange 3 receives 0x00, the dummy we sent.',
          'Exact output: `xchg1 got 0x00` / `xchg2 got 0x01` / `xchg3 got 0x00`.',
          'The pattern — command, then dummies whose exchanges carry the response — is how every real SPI read transaction works (lesson 3 uses it for a memory read).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'SPI bus with two peripherals and the shift-register ring',
        content:
          '  CONTROLLER                                PERIPHERAL A      PERIPHERAL B\n  -----------                                ------------      ------------\n   SCLK  ---+--------------------------------> clock             clock\n            |\   MOSI  ---+--------+------------------------> din               din\n            | \n            |  +-> ... one CS per peripheral ...\n            |\n   MISO  <--+-------------------+------------------ dout                dout\n                                     (only selected CS connects its\n                                      shift register to the bus)\n\n  INSIDE ONE EXCHANGE (8 clocks):\n   controller reg: [b7 b6 b5 b4 b3 b2 b1 b0]\n                        ||  one bit crosses per clock edge  ||\n   peripheral reg: [p7 p6 p5 p4 p3 p2 p1 p0]\n   after 8 clocks: controller holds p7..p0, peripheral holds b7..b0',
        caption:
          'Conceptual bus layout. The clock is shared; MISO/MOSI are shared; CS picks which peripheral participates in each session.',
      },
    ],
    tables: [
      {
        caption: 'SPI signals',
        headers: ['Signal', 'Driven by', 'Purpose'],
        rows: [
          ['SCLK', 'Controller only', 'Times every bit; speed = bus clock / divider'],
          ['MOSI', 'Controller', 'Data toward peripherals'],
          ['MISO', 'Selected peripheral', 'Data toward controller'],
          ['CS/SS (one per device)', 'Controller', 'Active-low session selector'],
        ],
      },
      {
        caption: 'SPI versus UART at a glance',
        headers: ['Property', 'SPI', 'UART'],
        rows: [
          ['Clock', 'Explicit (SCLK)', 'None (baud agreement)'],
          ['Duplex', 'Full, every exchange', 'Two independent directions'],
          ['Wires', '4 + one CS per device', '2 (crossed)'],
          ['Error detection', 'None built in', 'Framing/parity flags'],
          ['Distance', 'On-board, short', 'Longer (with level standards)'],
          ['Typical speed', '1-50 MHz', 'up to ~1 Mbaud'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Treating the first exchanged byte as device data.',
        fix:
          'The first exchange returns the peripheral\'s stale shift-register content. Protocol reads always clock dummy bytes after the command and use only those results.',
      },
      {
        mistake: 'Leaving CS asserted between unrelated commands.',
        fix:
          'Most devices interpret byte streams only within one CS-low session; command boundaries are CS edges. Assert CS, run the transaction, deassert — every time.',
      },
      {
        mistake: 'Assuming SPI has addressing or acknowledgement.',
        fix:
          'Neither exists on the wire. Addressing = which CS you assert; "acknowledgement" = your protocol\'s own status reads. Bus errors are silent unless your protocol checks them.',
      },
    ],
    guidedPractice: {
      title: 'Trace a three-byte exchange',
      brief:
        'A peripheral\'s shift register starts at 0x7F. The controller exchanges 0xAA, then 0x12, then 0x00. Write the controller\'s received byte after each exchange and the peripheral register content after the session.',
      expectedBehavior:
        'Exchange 1: controller gets 0x7F, peripheral = 0xAA. Exchange 2: controller gets 0xAA, peripheral = 0x12. Exchange 3: controller gets 0x12, peripheral = 0x00. Final peripheral register: 0x00.',
      hints: [
        'Each exchange: receive = old peripheral value; peripheral register = the byte just sent.',
        'Track both registers side by side.',
      ],
    },
    practiceExercises: [
      {
        title: 'Design a status-poll exchange',
        brief:
          'A device protocol: send command 0x05, then two dummy exchanges; the second dummy returns the status. Write the C exchange sequence and state which return values are meaningful.',
        expectedBehavior:
          '`spi_exchange(0x05); uint8_t d1 = spi_exchange(0x00); uint8_t status = spi_exchange(0x00);` — d1 is the stale/first response (meaningless), status is meaningful. Only the bytes exchanged *after* the command carry device data.',
        hints: [
          'The command exchange itself returns stale data.',
          'Count which dummy carries which response.',
        ],
      },
      {
        title: 'Choose the clock',
        brief:
          'f_bus = 72 MHz; a display accepts max 20 MHz SPI. From dividers 2,4,8,16, which keeps SCLK legal, and what SCLK does it produce? Why might you still choose the next-slower divider?',
        expectedBehavior:
          '72/2 = 36 MHz (illegal), 72/4 = 18 MHz (legal, fastest allowed). Choosing 72/8 = 9 MHz adds margin for long traces, marginal signal integrity, or marginal device batches — speed versus robustness is an engineering call, made with a logic analyzer or scope (module 17).',
        hints: [
          'SCLK = f_bus / divider.',
          'Compare 18 MHz against the 20 MHz limit before adding margin.',
        ],
      },
    ],
    assessment: {
      title: 'SPI fundamentals checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which signal does ONLY the controller drive?',
          options: ['SCLK', 'MISO', 'CS', 'MOSI'],
          answer: 'SCLK',
          explanation:
            'The controller generates the shared clock; MISO is driven by the selected peripheral, MOSI by the controller, CS by the controller.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'After one 8-clock exchange with peripheral register 0x3C, the controller receives:',
          options: ['0x3C', '0x00', 'whatever it sent', 'a checksum'],
          answer: '0x3C',
          explanation:
            'The exchange swaps the two registers: the controller ends up with the peripheral\'s previous contents.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'SPI peripherals receive commands addressed to them by a byte address on the bus.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'Selection is electrical — the CS wire. Whatever the selected device receives, it interprets per its own command set.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'Using the mock: after spi_exchange(0xAB) with the slave register starting at 0x00, what do the controller receive and the slave register hold?',
          code: 'uint8_t in = spi_exchange(0xABu);  /* slave started at 0x00 */',
          options: ['in=0x00, slave=0xAB', 'in=0xAB, slave=0x00', 'in=0x00, slave=0x00', 'in=0xAB, slave=0xAB'],
          answer: 'in=0x00, slave=0xAB',
          explanation:
            'The controller receives the slave\'s old 0x00; the slave register takes our 0xAB.',
          hint: 'The swap hands over old contents both ways.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Why does a real SPI read protocol clock dummy bytes after the command?',
          answer: 'so the device\'s response, prepared during the command exchange, is shifted out during the dummy exchanges',
          explanation:
            'Responses lag one exchange behind commands because each swap delivers stale contents first — dummies fill that pipeline.',
          hint: 'Remember which exchange returns stale data.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Controller / peripheral', definition: 'The SPI side that generates SCLK / the sides that follow it (newer, neutral names for master/slave).' },
      { term: 'MOSI / MISO', definition: 'Data lines: controller-out-peripheral-in and controller-in-peripheral-out.' },
      { term: 'Chip select (CS)', definition: 'Active-low per-device wire that opens an exchange session with one peripheral.' },
      { term: 'Shift-register exchange', definition: 'The 8-clock full-duplex swap that underlies every SPI transfer.' },
    ],
    revisionSummary: [
      'Four wires: SCLK, MOSI, MISO, CS-per-device.',
      'Every exchange is a full-duplex 8-bit swap — reads and writes are simultaneous.',
      'First response of a session is stale; protocols pad with dummies.',
      'Sessions are bounded by CS edges.',
      'No addressing, no acks, no built-in errors — speed and simplicity are the trade.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Serial Peripheral Interface', url: 'https://en.wikipedia.org/wiki/Serial_Peripheral_Interface', kind: 'article' },
      { label: 'All About Circuits', url: 'https://www.allaboutcircuits.com/', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'embc-m08-l2',
    title: 'Clock Polarity and Phase: the Four SPI Modes',
    summary:
      'CPOL and CPHA define exactly when bits are sampled and changed — the four modes, why mode 0 dominates, and the classic one-bit-shift symptom of a mode mismatch.',
    objectives: [
      'Define CPOL (idle clock level) and CPHA (sampling edge).',
      'Name all four modes and draw mode 0 timing from memory.',
      'Predict the data corruption a CPOL/CPHA mismatch produces.',
      'Configure controller and device consistently using a device datasheet\'s mode statement.',
    ],
    whyItMatters:
      'A mode mismatch is the number one SPI bring-up failure — the bus "works" but every byte is bit-rotated. Ten minutes with CPOL/CPHA saves an afternoon of wrong-data mysteries.',
    prerequisites: ['embc-m08-l1'],
    explanation:
      'SPI defines no fixed clock convention, so two configuration bits describe it:\n\n- **CPOL** (clock polarity): the SCLK level *between* transfers. CPOL = 0 idles the clock low; CPOL = 1 idles it high.\n- **CPHA** (clock phase): which edge *samples* data. CPHA = 0 samples on the leading edge (the first edge of each clock pulse); CPHA = 1 samples on the trailing edge.\n\nThe transmitter changes data on the opposite edge from the sampler, so data is stable at every sampling instant. Together the bits make four modes:\n\n| Mode | CPOL | CPHA | Clock idles | Sample on |\n|------|------|------|-------------|-----------|\n| 0 | 0 | 0 | low | rising (leading) edge |\n| 1 | 0 | 1 | low | falling (trailing) edge |\n| 2 | 1 | 0 | high | falling (leading) edge |\n| 3 | 1 | 1 | high | rising (trailing) edge |\n\n**Mode 0 is the overwhelmingly common default** — most sensors, flashes and displays use it, and many controllers boot with it. Mode 3 is the second most common. Modes 1 and 2 exist but are rare.\n\n### The mismatch symptom\n\nIf the controller samples on a different edge than the device expects, the receiver still gets 8 bits per byte — but offset by half a bit, so it assembles the bitstream shifted by one position. A byte 0xA5 (1010 0101, MSB first) followed by an idle/dummy byte reads as 0x4A (0100 1010): every byte appears **left-rotated by one bit**, with the LSB picking up the next byte\'s MSB. Data is not random — it is consistently shifted, which is the diagnostic fingerprint. (Inversion of all bits points at CPOL being wrong instead.)\n\n### Choosing the mode, honestly\n\nThe mode is a property of the *peripheral device*: its datasheet states "SPI mode 0" (or CPOL=0, CPHA=0) in the timing section. The controller is then configured to match — one register field on most MCUs. There is nothing to negotiate at runtime (unlike I2C addressing); a mismatch is a silent configuration bug. When a datasheet shows a timing diagram instead of a mode number, read it: the clock\'s idle level gives CPOL; the edge at which MISO is stable-then-sampled gives CPHA.',
    deepDive:
      '### Where the half-bit shift comes from\n\nConsider mode 0 (sample on rising, change on falling) versus a receiver that samples on the falling edge (mode 1 behaviour). Between two rising edges, the transmitter drives bit N for the first half and bit N+1 for the second half; the mode-1 receiver samples at the changeover and — depending on setup/hold — captures the *next* bit in the stream. Every subsequent bit is therefore one position early: the receiver\'s byte is the original stream rotated by one bit. That is why the corruption is deterministic and bit-rotational rather than noisy — and why swapping to the correct mode instantly "fixes" every byte at once.\n\n### Reading a real timing diagram, honestly\n\nDevice datasheets draw SCLK, MOSI and MISO aligned to edges. The recipe: find where the clock rests between bytes (CPOL), find the edge at which MISO\'s value is *sampled into* the receiver — drawn with the "stable window" shading (CPHA). Some datasheets instead mark "clock phase" on the diagram or list modes per command; a few devices even switch modes per command type (rare, but real — some displays do). The controller\'s mode register must be set per session in that case. All of these specifics live in the device datasheet and the MCU\'s SPI chapter — this course teaches the reading method, using mocks for the runnable parts.\n\n### Mode and speed interact\n\nAt low SCLK, a mode mismatch is cleanly deterministic. At high SCLK, marginal timing adds sporadic *additional* single-bit errors on top of the systematic shift. Debug order at bring-up: (1) fix the mode with a slow clock until data is systematically correct, (2) then raise speed while watching for sporadic errors. Doing both at once conflates two independent problems — the same isolation discipline as module 17\'s debugging methodology.',
    examples: [
      {
        title: 'Simulating the one-bit-rotation symptom',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Host model of the bitstream on MISO for a device sending 0xA5\n * followed by 0x00, MSB first. */\nstatic uint8_t bit_at(const uint8_t stream[2], uint8_t index) {\n    /* index 0..15 across the two bytes, MSB first */\n    if (index < 8u) {\n        return (uint8_t)((stream[0] >> (7u - index)) & 1u);\n    }\n    return (uint8_t)((stream[1] >> (15u - index)) & 1u);\n}\n\nint main(void) {\n    const uint8_t stream[2] = { 0xA5u, 0x00u };\n\n    /* Correct (mode 0): sample bits 0..7 -> 0xA5. */\n    uint8_t good = 0u;\n    for (uint8_t i = 0u; i < 8u; i++) {\n        good = (uint8_t)((good << 1) | bit_at(stream, i));\n    }\n\n    /* Mismatched CPHA: samples land half a bit late -> bits 1..8. */\n    uint8_t bad = 0u;\n    for (uint8_t i = 1u; i <= 8u; i++) {\n        bad = (uint8_t)((bad << 1) | bit_at(stream, i));\n    }\n\n    printf("mode matched:    0x%02X\\n", (unsigned)good);\n    printf("mode mismatched: 0x%02X (rotated left by 1)\\n", (unsigned)bad);\n    return 0;\n}',
        explanation: [
          'bit_at extracts stream bit `index`, MSB first across the two bytes: 1,0,1,0,0,1,0,1 then eight 0s.',
          'good assembles bits 0..7: 1010 0101 = 0xA5.',
          'bad assembles bits 1..8: 0,1,0,0,1,0,1,0 = 0100 1010 = 0x4A.',
          'Exact output: `mode matched:    0xA5` / `mode mismatched: 0x4A (rotated left by 1)`.',
          '0xA5 → 0x4A is a clean left-rotation: the diagnostic signature of a CPHA mismatch. Every byte of a real transfer would look consistently "shifted", not random.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'SPI mode 0 timing (CPOL=0, CPHA=0)',
        content:
          '  CS     :___                                     (low = selected)\n\n  SCLK    ____|\'|_|\'|_|\'|_|\'|_|\'|_|\'|_|\'|_|\'|____\n              1  2  3  4  5  6  7  8          (idle low between)\n                 rising edges = sample points (^)\n\n  MOSI    < b7 >< b6 >< b5 >< b4 >< b3 >< b2 >< b1 >< b0 >\n          (changed on falling edges, stable across rising edges)\n\n  MISO    < p7 >< p6 >< p5 >< p4 >< p3 >< p2 >< p1 >< p0 >\n\n  sample:      ^    ^    ^    ^    ^    ^    ^    ^   <- on rising',
        caption:
          'Educational waveform (illustrative). Mode 0: clock idles low, data sampled on the rising (leading) edge, changed on the falling edge.',
      },
    ],
    tables: [
      {
        caption: 'The four SPI modes',
        headers: ['Mode', 'CPOL', 'CPHA', 'Clock idle', 'Sample edge', 'Frequency of use'],
        rows: [
          ['0', '0', '0', 'low', 'rising (leading)', 'Most common default'],
          ['1', '0', '1', 'low', 'falling (trailing)', 'Rare'],
          ['2', '1', '0', 'high', 'falling (leading)', 'Rare'],
          ['3', '1', '1', 'high', 'rising (trailing)', 'Second most common'],
        ],
      },
      {
        caption: 'Symptom-to-cause map for SPI bring-up',
        headers: ['Symptom', 'Likely cause'],
        rows: [
          ['Every byte bit-rotated by 1', 'CPHA mismatch'],
          ['All bits inverted (0xA5 <-> 0x5A)', 'CPOL mismatch'],
          ['Random single-bit errors that scale with clock', 'SCLK too fast / signal integrity'],
          ['Nothing moves at all', 'CS wiring, or peripheral not selected'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Memorising the mode table without connecting it to the timing diagram.',
        fix:
          'Derive, do not memorise: CPOL = idle level; CPHA = which edge samples. Given any datasheet diagram you can reconstruct the mode number in seconds — and verify it.',
      },
      {
        mistake: 'Fixing a mode mismatch by changing the clock speed.',
        fix:
          'Speed changes nothing about a systematic one-bit rotation. Fix CPOL/CPHA; then tune speed against sporadic errors.',
      },
      {
        mistake: 'Assuming mode 0 everywhere.',
        fix:
          'Mode is per-device. Some devices (especially some memories and ADCs) use mode 3; a few switch modes per command. Check each device datasheet\'s timing section.',
      },
    ],
    guidedPractice: {
      title: 'Read a mode from prose',
      brief:
        'A device datasheet says: "SCLK idles high; data on MISO is valid on the second (trailing) edge of each clock pulse." Determine CPOL, CPHA, the mode number, and which common alternative mode a careless bring-up might accidentally use.',
      expectedBehavior:
        'CPOL = 1 (idle high). Trailing-edge sampling = CPHA 1. Mode 3. A careless setup might leave the controller at mode 0 (the default), producing the classic bit-rotation or inverted-data symptoms.',
      hints: [
        'Idle level → CPOL; sample edge position (leading/trailing) → CPHA.',
        'Default controller modes are usually 0.',
      ],
    },
    practiceExercises: [
      {
        title: 'Predict the rotated byte',
        brief:
          'A device sends 0x3C then 0xFF, MSB first. A CPHA-mismatched receiver samples one bit late. Compute the first received byte.',
        expectedBehavior:
          '0x3C = 0011 1100; stream: 0,0,1,1,1,1,0,0 then 1,1,1,1,1,1,1,1. Sampling bits 1..8: 0,1,1,1,1,0,0,1 = 0111 1001 = 0x79.',
        hints: [
          'Write all 16 stream bits first.',
          'The rotated byte takes stream bits 1 through 8.',
        ],
      },
      {
        title: 'Mode 2 from scratch',
        brief:
          'State mode 2\'s CPOL, CPHA, idle level and sample edge; then sketch (in text) its SCLK waveform for two clock pulses.',
        expectedBehavior:
          'CPOL=1, CPHA=0, clock idles high, sampling on the falling (leading) edge. Sketch: SCLK starts high, drops for each pulse and returns high — samples at each falling edge.',
        hints: [
          'Mirror of mode 0 with an inverted clock.',
          'Leading edge = the first edge of each pulse.',
        ],
      },
    ],
    assessment: {
      title: 'SPI modes checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'CPOL defines:',
          options: [
            'The clock level between transfers',
            'Which edge samples data',
            'The bit order',
            'The maximum clock speed',
          ],
          answer: 'The clock level between transfers',
          explanation:
            'CPOL = polarity = idle level of SCLK; CPHA chooses the sampling edge.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'SPI mode 0 is:',
          options: [
            'CPOL=0, CPHA=0 — idle low, sample on rising edge',
            'CPOL=1, CPHA=1',
            'CPOL=0, CPHA=1',
            'CPOL=1, CPHA=0',
          ],
          answer: 'CPOL=0, CPHA=0 — idle low, sample on rising edge',
          explanation:
            'Mode 0 is the common default: clock idles low, data sampled on the leading (rising) edge.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A CPHA mismatch makes received data look like the correct bytes rotated by one bit.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'Sampling half a bit late shifts the assembled stream one position — deterministic, not noisy.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'In the simulation, what does the mismatched receiver read for stream 0x80 followed by 0x00?',
          code: '/* MSB-first stream: 1,0,0,0,0,0,0,0 then eight 0s */\n/* mismatched receiver assembles bits 1..8 */',
          options: ['0x00', '0x01', '0x80', '0x40'],
          answer: '0x00',
          explanation:
            'Bits 1..8 are all 0 (only bit 0 carried the 1), so the rotated reading is 0x00. A received all-zero stream from a device sending 0x80s is another classic mismatch signature.',
          hint: 'Which stream bit carries the 1, and does the rotated window include it?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Where does the correct SPI mode for a device come from?',
          answer: 'the device datasheet (timing section states the mode or the CPOL/CPHA timing diagram)',
          explanation:
            'Mode is a property of the peripheral device; the controller is configured to match. Never assume a default.',
          hint: 'One document, one section.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'CPOL', definition: 'Clock polarity: the SCLK idle level between transfers.' },
      { term: 'CPHA', definition: 'Clock phase: which edge (leading/trailing) samples data.' },
      { term: 'SPI mode', definition: 'The CPOL/CPHA pair, numbered 0-3; mode 0 is the common default.' },
      { term: 'Bit rotation symptom', definition: 'The one-bit-shifted byte pattern characteristic of a CPHA mismatch.' },
    ],
    revisionSummary: [
      'CPOL = idle level; CPHA = sample edge; four modes total.',
      'Mode 0 (idle low, sample rising) dominates; mode 3 next.',
      'CPHA mismatch → one-bit rotation; CPOL mismatch → inversion.',
      'Fix mode first at low clock, then tune speed.',
      'The mode comes from the device datasheet, always.',
    ],
    furtherReading: [
      { label: 'Wikipedia — SPI mode numbering (Clock polarity and phase)', url: 'https://en.wikipedia.org/wiki/Serial_Peripheral_Interface#Mode_numbers', kind: 'article' },
      { label: 'docs.arduino.cc — SPI library transactions', url: 'https://docs.arduino.cc/', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'embc-m08-l3',
    title: 'SPI Transactions: Sessions, Commands and a Mock Device',
    summary:
      'Structure real transfers as CS-bounded sessions against a device command set — implemented against a mock memory device with write and read commands.',
    objectives: [
      'Structure a transaction: assert CS, clock command/address/data, deassert CS.',
      'Implement a stateful mock SPI device with a read and a write command.',
      'Handle multi-byte transfers and MSB-first byte order in code.',
      'Manage multiple devices on one bus with per-device CS.',
    ],
    whyItMatters:
      'This lesson assembles modules 8-1 and 8-2 into the shape of every real SPI driver: sessions against a command set. The mock device is deliberately simple, but the controller-side code is exactly what you would write against an SPI flash or sensor — with register names swapped for vendor headers.',
    prerequisites: ['embc-m08-l1', 'embc-m08-l2'],
    explanation:
      'A real SPI exchange is never one byte in isolation. It is a **session**: CS goes low, the controller clocks a command byte, any addressing bytes, then the data bytes, and CS returns high. The device interprets the byte stream *within* the session — a command sets the device\'s internal state, and following bytes are treated accordingly. Forgetting the deassert (or asserting mid-session) makes the device misinterpret the stream.\n\n### The controller-side transaction\n\nA read from a memory-like device typically looks like:\n\n```c\nuint8_t spi_read_status(uint8_t cmd) {\n    uint8_t result;\n    spi_cs_low();\n    (void)spi_exchange(cmd);            /* device latches the command   */\n    result = spi_exchange(0x00u);       /* dummy clocks the response    */\n    spi_cs_high();\n    return result;\n}\n```\n\nNote the dummy exchange — lesson 1\'s pipeline lag — and that every byte is a full-duplex exchange even when one direction is ignored. Multi-byte reads loop the dummy exchanges; writes loop real data bytes. Byte order (MSB-first bit order inside each byte, and multi-byte address order) comes from the device datasheet.\n\n### A stateful mock device\n\nThe mock in the example implements two commands over a 256-byte memory: `0x02 addr_hi addr_lo data...` (write) and `0x03 addr_hi addr_lo` followed by dummy exchanges that return successive bytes (read). Its state machine — idle, got-command, got-address, streaming — is a miniature of what real device silicon does, and the controller code that drives it is a miniature of every memory-driver you will write.\n\n### Many devices, one bus\n\nAll devices share SCLK/MOSI/MISO; each has its own CS. Only the selected device may drive MISO — its CS enables its output driver. Firmware treats CS lines as GPIO outputs (module 04) and raises exactly one at a time; two devices selected at once means two peripherals fighting over MISO (bus contention, excessive current, garbage). Some devices also *require* CS to frame each command (flash chips, for instance, execute on the rising CS edge), so session discipline is not cosmetic.',
    deepDive:
      '### Transaction helpers and layering\n\nProduction drivers layer three levels: (1) the hardware exchange (`spi_exchange` — vendor registers, possibly DMA-backed), (2) transaction helpers (`spi_read_regs(cmd, addr, buf, len)` — CS discipline, command framing), and (3) device logic (`flash_read_id()`, `accel_read_temp()` — the command set from the datasheet). Keeping the layers separate means porting to a different MCU touches only level 1, and adding a device touches only level 3. Module 13 formalises this layering; here it is enough to feel the seams.\n\n### Where sessions go wrong, symptom-wise\n\nCommon failures map cleanly to session mistakes. Data shifted by one byte → a missing or extra dummy exchange (pipeline lag miscounted). Device ignores everything → CS never actually low (GPIO config, active-level mix-up) or asserted before the lines settle. First byte of every read wrong → you used the command exchange\'s stale response instead of the first dummy\'s. Read works, write does not → many devices require a write-enable command first (flash) or a delay between write and next access. Each symptom names its own check — SPI debugging is mostly bookkeeping discipline.\n\n### Byte order and bit order, honestly\n\nSPI defines bit order per the device (overwhelmingly MSB first), and *multi-byte* field order is purely your protocol\'s choice — addresses may be big- or little-endian depending on the device. The mock uses big-endian address bytes (hi then lo) as most memory devices do. When in doubt, put a logic analyzer on the bus (module 17) and read the actual edge timings — the bus is fully visible in a way UART never is.',
    examples: [
      {
        title: 'A mock SPI memory device: write and read sessions, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* --- controller side (vendor register mock) --- */\nstatic volatile uint8_t MOCK_SPI_DR = 0x00u;\nstatic uint8_t mock_cs_level = 1u;               /* 1 = deselected */\n\nstatic uint8_t mock_slave_state  = 0u;           /* 0 cmd, 1 ahi, 2 alo, 3 data */\nstatic uint8_t mock_slave_cmd    = 0u;\nstatic uint16_t mock_slave_addr  = 0u;\nstatic uint8_t  mock_slave_mem[256];\nstatic uint8_t  mock_slave_out   = 0x00u;        /* what MISO carries next */\n\nstatic uint8_t spi_exchange(uint8_t out) {\n    uint8_t in;\n    if (mock_cs_level != 0u) {\n        return 0xFFu;                    /* nobody selected: line floats high */\n    }\n    in = mock_slave_out;                 /* full-duplex swap                */\n    mock_slave_out = 0x00u;\n\n    /* Device state machine reacts to the byte we sent. */\n    switch (mock_slave_state) {\n    case 0u:\n        mock_slave_cmd = out;\n        mock_slave_state = 1u;\n        break;\n    case 1u:\n        mock_slave_addr = (uint16_t)((uint16_t)out << 8);\n        mock_slave_state = 2u;\n        break;\n    case 2u:\n        mock_slave_addr |= out;\n        mock_slave_state = 3u;\n        if (mock_slave_cmd == 0x03u) {\n            mock_slave_out = mock_slave_mem[mock_slave_addr]; /* read: prep     */\n            mock_slave_addr = (uint16_t)(mock_slave_addr + 1u); /* prep consumed it */\n        }\n        break;\n    default:\n        if (mock_slave_cmd == 0x02u) {\n            mock_slave_mem[mock_slave_addr] = out;    /* write: store    */\n            mock_slave_addr = (uint16_t)(mock_slave_addr + 1u);\n        } else if (mock_slave_cmd == 0x03u) {\n            mock_slave_out = mock_slave_mem[mock_slave_addr]; /* next byte */\n            mock_slave_addr = (uint16_t)(mock_slave_addr + 1u);\n        }\n        break;\n    }\n    (void)MOCK_SPI_DR;\n    return in;\n}\n\nstatic void spi_cs(uint8_t level) {\n    mock_cs_level = level;\n    if (level != 0u) {\n        mock_slave_state = 0u;           /* session ends: reset to command */\n    }\n}\n\n/* --- application: write "HI" at 0x0010, read it back --- */\nint main(void) {\n    spi_cs(0u);                          /* write session */\n    (void)spi_exchange(0x02u);           /* WRITE cmd */\n    (void)spi_exchange(0x00u);           /* addr hi */\n    (void)spi_exchange(0x10u);           /* addr lo */\n    (void)spi_exchange(0x48u);           /* \'H\' */\n    (void)spi_exchange(0x49u);           /* \'I\' */\n    spi_cs(1u);\n\n    uint8_t b1, b2;\n    spi_cs(0u);                          /* read session */\n    (void)spi_exchange(0x03u);           /* READ cmd */\n    (void)spi_exchange(0x00u);\n    (void)spi_exchange(0x10u);\n    b1 = spi_exchange(0x00u);            /* dummy -> first byte */\n    b2 = spi_exchange(0x00u);            /* dummy -> second byte */\n    spi_cs(1u);\n\n    printf("read back: 0x%02X 0x%02X\\n", (unsigned)b1, (unsigned)b2);\n    return 0;\n}',
        explanation: [
          'Write session: CS low, command 0x02, address 0x0010, then the two data bytes are stored at successive addresses by the device state machine.',
          'Read session: command 0x03 and the address; the device prepares mem[0x10] for the next exchange (and advances its pointer, since the prep consumed that address). The first dummy exchange returns 0x48 (H), the second returns 0x49 (I).',
          'Note the pipeline: the read data for address N is returned by the exchange *after* the address — the shift-register lag from lesson 1, visible in real device timing diagrams.',
          'Exact output: `read back: 0x48 0x49`.',
          'Every session ends with CS high, which resets the device state machine to "expect a command" — the session discipline that real devices enforce.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Session anatomy for a read command',
        content:
          '  CS    :_______________________________________:\n\n  MOSI   0x03   a_hi   a_lo   dummy  dummy  ...\n  MISO   ----   ----   ----   d[0]   d[1]   ...\n\n         cmd    address        data out starts one\n                               exchange after the address\n                               (shift-register lag)\n\n  Device state machine (mock):\n    CS low  -> state = CMD\n    0x03    -> expect address bytes\n    a_hi,a_lo -> prepare mem[addr]\n    each dummy -> return mem[addr++]\n    CS high -> state = CMD (session over)',
        caption:
          'Educational timing sketch (illustrative). Command, address, then data — with the one-exchange pipeline lag that dummy bytes absorb.',
      },
    ],
    tables: [
      {
        caption: 'Mock device command set (educational)',
        headers: ['Command', 'Bytes', 'Meaning'],
        rows: [
          ['0x02', 'cmd, addr_hi, addr_lo, data...', 'Write data to memory, address auto-increments'],
          ['0x03', 'cmd, addr_hi, addr_lo, then dummies', 'Read data from memory, address auto-increments'],
        ],
      },
      {
        caption: 'Session failure symptoms',
        headers: ['Symptom', 'Cause to check first'],
        rows: [
          ['Data shifted by one byte', 'Miscounted dummy exchanges'],
          ['First read byte wrong', 'Used the command exchange\'s stale response'],
          ['Device ignores everything', 'CS never asserted / wrong active level'],
          ['Two devices corrupt the bus', 'Two CS lines active at once'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Forgetting the deassert, or asserting two CS lines at once.',
        fix:
          'Every transaction is CS-low ... CS-high, and exactly one device selected. Track CS in one helper function so it cannot be forgotten.',
      },
      {
        mistake: 'Reusing the command exchange\'s return value as data.',
        fix:
          'That first return is the stale shift-register content. Real data starts with the exchange after the command (and after the address for reads).',
      },
      {
        mistake: 'Mixing up per-device byte order conventions.',
        fix:
          'Bit order (usually MSB first) and multi-byte field order are device-specific. Keep each device\'s conventions inside its own driver layer, never in the shared SPI exchange.',
      },
    ],
    guidedPractice: {
      title: 'Extend the mock with a status command',
      brief:
        'Add command 0x05 (read status): after the command byte, the first dummy exchange returns a device status byte (mock: return 0x80 meaning "ready"). Write the device state-machine case and the controller-side session function, and state what the controller receives from the command exchange itself.',
      expectedBehavior:
        'Device: on 0x05 set state and prepare status byte (mock_slave_out = 0x80); next exchange returns it. Controller: cs_low; exchange(0x05); status = exchange(0x00); cs_high. The command exchange returns stale data (0x00/0xFF depending on the session start) — only the first dummy carries the status.',
      hints: [
        'Reuse the state machine structure of 0x03.',
        'Count the exchanges: command, then how many dummies?',
      ],
    },
    practiceExercises: [
      {
        title: 'Read three bytes in one session',
        brief:
          'Using the mock, write a session that reads 3 bytes from address 0x0020 after storing 0xDE 0xAD 0xBE there. Predict the exact printf output of your read loop.',
        expectedBehavior:
          'Write session stores the three bytes at 0x20..0x22. Read session: cmd+address then three dummies return 0xDE, 0xAD, 0xBE. Loop prints `byte 0: 0xDE` / `byte 1: 0xAD` / `byte 2: 0xBE` (format per your printf).',
        hints: [
          'The address auto-increments per exchange after the address.',
          'Three data bytes need three dummy exchanges.',
        ],
      },
      {
        title: 'Diagnose a shifted stream',
        brief:
          'A teammate\'s read of a 4-byte ID returns {0x00, 0xDE, 0xAD, 0xBE} when the device stores 0xDE 0xAD 0xBE 0xEF. Diagnose from the symptom and state the fix in the transaction code.',
        expectedBehavior:
          'The stream is shifted by one exchange — the code treated the command exchange\'s stale response as the first data byte (or dropped one dummy). Fix: add one more dummy exchange (or stop consuming the command exchange\'s return), so data aligns.',
        hints: [
          'The leading 0x00 is the stale byte.',
          'Count command/address/dummy exchanges against the device protocol.',
        ],
      },
    ],
    assessment: {
      title: 'SPI transactions checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What bounds a device\'s interpretation of a byte stream?',
          options: [
            'The CS-low session',
            'The number of bytes sent',
            'A newline character',
            'The clock speed',
          ],
          answer: 'The CS-low session',
          explanation:
            'Devices frame commands with CS edges; the state machine resets when CS returns high.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In the mock read, which exchange returns the first data byte?',
          options: [
            'The first dummy exchange after the address',
            'The command exchange',
            'The address-lo exchange',
            'None; reads need a new session',
          ],
          answer: 'The first dummy exchange after the address',
          explanation:
            'The device prepares the byte during the address exchange; the following (dummy) exchange shifts it out.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Two SPI devices can share MISO as long as they are clocked at the same speed.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'Only the CS-selected device may drive MISO; two selected devices contend for the line regardless of speed.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'With the mock deselected (CS high), what does spi_exchange return?',
          code: 'static uint8_t spi_exchange(uint8_t out) {\n    if (mock_cs_level != 0u) {\n        return 0xFFu;\n    }\n    /* ... */\n}',
          options: ['0xFF', '0x00', 'The last byte sent', 'Nothing; it blocks'],
          answer: '0xFF',
          explanation:
            'With nobody selected the MISO line idles high in the mock — real hardware shows the pull/floating state, and writes go nowhere.',
          hint: 'Look at the first branch of the mock.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the three layers of a production SPI driver stack.',
          answer: 'hardware exchange, transaction helpers (CS/command framing), device command-set logic',
          explanation:
            'Register-level exchange, session/protocol helpers, and datasheet-level device functions — porting and extension touch different layers.',
          hint: 'Registers, protocol, device.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Session', definition: 'One CS-low period during which a device interprets a command/address/data byte stream.' },
      { term: 'Command set', definition: 'The device-specific byte protocol from its datasheet (no SPI-wide standard).' },
      { term: 'Stateful device model', definition: 'The mock (and real silicon) pattern where each received byte advances a small state machine.' },
      { term: 'Dummy exchange', definition: 'A neutral byte (0x00/0xFF) clocked purely to shift out the device\'s prepared response.' },
    ],
    revisionSummary: [
      'Transaction = CS low → command → address → data → CS high.',
      'Responses lag one exchange; dummies carry them out.',
      'One CS asserted at a time; sessions reset the device state machine.',
      'Layer the driver: exchange / transactions / device commands.',
      'Symptoms map to session bookkeeping errors — count your exchanges.',
    ],
    furtherReading: [
      { label: 'Wikipedia — SPI protocol example (transaction framing)', url: 'https://en.wikipedia.org/wiki/Serial_Peripheral_Interface', kind: 'article' },
      { label: 'docs.arduino.cc — SPI library transactions', url: 'https://docs.arduino.cc/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
];
