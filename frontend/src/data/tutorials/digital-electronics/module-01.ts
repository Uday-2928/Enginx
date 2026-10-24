import type { TutorialLesson } from '../types';

export const module01Lessons: TutorialLesson[] = [
  {
    id: 'de-m01-l01',
    title: 'Analog vs Digital Signals',
    summary:
      'What a signal is, how continuous analog waveforms differ from two-level digital ones, and why almost every modern electronic system converts the world to bits as early as it can.',
    objectives: [
      'Define a signal and explain the difference between continuous (analog) and discrete (digital) representation.',
      'Describe the sensor-to-ADC-to-logic-to-DAC chain used by virtually every mixed-signal system.',
      'List the practical reasons digital representation dominates: noise rejection, regeneration, storage, and programmability.',
      'Compute the number of quantization levels produced by an n-bit converter.',
    ],
    whyItMatters:
      'Digital electronics is the art of representing information with just two symbols, 0 and 1, and computing with them reliably. Before you can study gates, flip-flops and timing, you need a clear picture of *why* engineers deliberately throw away the infinite detail of an analog voltage and keep only two levels — because that trade is the reason every circuit in this course exists. The answer (noise immunity plus programmability) also explains the design rules you will meet later, such as noise margins and clocked registers.',
    prerequisites: [],
    explanation:
      'A **signal** is a physical quantity — usually a voltage or a current — that carries information. In an **analog** signal the quantity varies *continuously*: between any two voltages there is always another valid voltage, and the waveform has a meaningful value at every instant of time. A microphone output, a thermistor voltage and an old radio broadcast are all analog.\n\nA **digital** signal keeps time continuous but crushes the *amplitude* axis down to two symbols. The circuit treats any voltage in a defined low band as the symbol 0 and any voltage in a defined high band as the symbol 1. There are no legal values in between. That single restriction is what makes the rest of this course possible.\n\n### The digitization chain\n\nThe real world is analog, so practical systems convert:\n\n1. A **sensor** (microphone, camera pixel, temperature probe) produces an analog voltage.\n2. An **ADC** (analog-to-digital converter) *samples* the voltage at regular instants and *quantizes* each sample to the nearest of `2^n` levels, producing an n-bit number.\n3. **Digital logic** — everything in this course — stores, transforms and transmits those bits.\n4. A **DAC** (digital-to-analog converter) reconstructs an analog voltage when the result must drive a speaker, motor or display.\n\nAn n-bit converter has exactly `2^n` output codes: 3 bits give 8 levels, 8 bits give 256 levels, 16 bits give 65 536 levels. More bits mean finer steps but slower, larger, more power-hungry converters — every engineering choice in electronics is a trade.\n\n### Why digital wins (most of the time)\n\n- **Noise immunity and regeneration.** A small amount of noise added to an analog signal is *permanently* mixed in; an amplifier that boosts the signal boosts the noise too. A digital receiver only has to decide *which band* a voltage fell in, and each gate output is then rewritten as a clean, fresh 0 or 1. Noise does not accumulate through a chain of gates — it is wiped out at every stage.\n- **Storage without decay.** A bit stored in memory, on disk or in a flash chip can be copied a million times with no loss. An analog recording degrades with every copy.\n- **Programmability.** The same silicon runs a different function when you change the bits of a program. Analog behavior is fixed by the physics of the components.\n- **Error detection and correction.** With only two symbols, extra bits (like the parity bit you will meet in Module 5) can detect and even repair damage.\n\n### Where analog still rules\n\nDigital is not automatically better. Radio-frequency front ends, power amplification and the sensors themselves are analog domains, because no digital symbol can carry a 28 GHz waveform. Even inside digital chips, analog effects never disappear — voltages still ramp, currents still charge capacitances — which is exactly why Module 8 on timing exists. The digital view is an *abstraction* that engineers work hard to maintain.',
    deepDive:
      '### Regeneration: the killer feature\n\nImagine a signal passing through ten stages. Suppose each stage adds 0.1 V of noise. The analog signal leaves carrying 1 V of accumulated noise that no later stage can remove. In a digital chain, each receiver compares the arriving voltage against its thresholds and regenerates a full-swing clean output, so the noise of stage one never reaches stage ten. This is why digital links can be thousands of kilometres long (with repeaters) while an analog signal degrades after a few metres of cable.\n\n### Sampling and quantization error\n\nConverting analog to digital loses information twice. *Sampling* loses everything that happens between sample instants (formalized by the Nyquist theorem: you must sample at more than twice the highest frequency of interest). *Quantization* snaps each sample to the nearest level, so a value halfway between two levels is always off by up to half a step. Audio CDs use 16 bits at 44 100 samples per second: the quantization step is small enough (about 15 parts per million of full scale) that the error is below what human ears detect.\n\n### The abstraction ladder\n\nDigital design works because each layer hides the layer below. Transistors behave as switches; switches are grouped into gates; gates into adders and registers; registers into processors. Every layer only has to honor the contract of the one above it. This course walks that ladder from the gate level upward, and the Verilog course you may take later starts one rung higher, describing hardware as text that a tool compiles down to these same gates.',
    examples: [
      {
        title: 'Quantizing analog samples with a 3-bit ADC',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    /* Four analog samples of a sensor voltage, in volts */\n    double samples_v[4] = {0.0, 2.9, 5.1, 6.4};\n\n    /* A 3-bit ADC has 2^3 = 8 levels (codes 0..7) and\n       snaps each sample to the NEAREST level. */\n    for (int i = 0; i < 4; i++) {\n        int code = (int)(samples_v[i] + 0.5);   /* round to nearest integer */\n        if (code > 7) code = 7;                 /* clip to the ADC range */\n        printf("%.1f V -> code %d = %d%d%d\\n",\n               samples_v[i], code,\n               (code >> 2) & 1, (code >> 1) & 1, code & 1);\n    }\n    return 0;\n}',
        explanation: [
          'The array models four instants at which an ADC samples an analog sensor voltage.',
          'Adding 0.5 and truncating with `(int)` performs round-to-nearest, which is how a real quantizer snaps a voltage to the closest level.',
          'A 3-bit converter can only emit codes 0 through 7, so the `if` clips any sample above full scale — real ADCs saturate exactly this way.',
          'The three shift-and-mask terms `(code >> 2) & 1`, `(code >> 1) & 1`, `code & 1` extract the bit pattern of the code so it can be printed as binary.',
          'The samples 0.0, 2.9, 5.1 and 6.4 V produce codes 0 (`000`), 3 (`011`), 5 (`101`) and 6 (`110`) — four analog values, four digital symbols.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Analog waveform vs digital two-level waveform',
        content:
          '   ANALOG: any voltage at any instant\n\n   v\n 5V|          .--.\n   |        /      \\              .--.\n   |       /        \\            /\n 0V|------/----------\\----------/------> time\n   |                  \'--\'\n   every point on this curve is meaningful\n\n   DIGITAL: only two legal zones\n\n   v\n 5V|       +------+           +------+\n   |       |      |           |      |\n 0V+-------+      +-----------+      +----> time\n         near 0 V = 0    near 5 V = 1\n         anything in between is illegal',
        caption:
          'An analog signal may take any amplitude; a digital signal is only ever interpreted as 0 or 1, with a forbidden band in between.',
      },
      {
        kind: 'block',
        title: 'The mixed-signal processing chain',
        content:
          '  real world    |        digital domain         |   real world\n                |                               |\n  +--------+    |  +---------+   +----------+   |  +---------+\n  | sensor |--->|  |   ADC   |-->|  digital |-->|  |   DAC   |---> actuator\n  | (analog)|   |  | samples |   |  logic   |   |  | levels  |    speaker,\n  +--------+    |  | to bits |   | (this    |   |  | to volts|    motor ...\n                |  +---------+   |  course) |   |  +---------+\n                |                +----------+   |',
        caption:
          'Sensors deliver analog values; the ADC and DAC bracket the digital domain where all computation happens.',
      },
    ],
    tables: [
      {
        caption: 'Analog vs digital representation',
        headers: ['Property', 'Analog', 'Digital'],
        rows: [
          ['Amplitude values', 'Infinitely many (continuous)', 'Exactly two symbols: 0 and 1'],
          ['Noise effect', 'Accumulates and cannot be removed', 'Rejected by thresholds, regenerated each stage'],
          ['Storage', 'Decays and degrades on every copy', 'Perfect copies: RAM, disk, flash'],
          ['Processing', 'Fixed by the physical circuit', 'Reprogrammable — same silicon, new behavior'],
          ['Error handling', 'None available', 'Detectable and correctable with extra bits'],
          ['Typical examples', 'Microphone output, thermometer bulb', 'CPU, memory, digital audio file'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Believing that a digital 0 means exactly 0.000 volts.',
        fix:
          'A 0 is any voltage inside a defined *low band* (for example, up to 1.5 V on a 5 V CMOS input). The next lesson defines these bands precisely as logic levels and noise margins. Thinking in exact voltages leads to circuits that are needlessly fragile.',
      },
      {
        mistake: 'Confusing sampling rate with resolution.',
        fix:
          'Sampling rate is how *often* you capture a value (samples per second); resolution is how *finely* you split the amplitude range (bits per sample). Audio needs both — 44 100 Hz and 16 bits. A system can be excellent on one and terrible on the other.',
      },
      {
        mistake: 'Assuming digital is always the right choice.',
        fix:
          'Digital costs converters, a clock, and quantization error. For a single-gain amplifier or a GHz radio chain, analog is simpler and faster. Choose digital when information must be stored, computed on, transmitted far, or protected from noise.',
      },
    ],
    guidedPractice: {
      title: 'Count quantization levels and step size',
      brief:
        'Complete the starter program so it prints, for ADC resolutions of 1 to 8 bits, the number of codes (2^n) and the voltage step size for a 0-5 V converter range. A 3-bit converter should report 8 levels and a 0.625 V step.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    double range_v = 5.0;\n    for (int bits = 1; bits <= 8; bits++) {\n        int levels = 1;\n        for (int i = 0; i < bits; i++) {\n            levels = levels * 2;          /* levels = 2^bits */\n        }\n        double step_v = range_v / levels;\n        printf("%d-bit: %4d levels, step = %.4f V\\n", bits, levels, step_v);\n    }\n    return 0;\n}',
      expectedBehavior:
        'The loop prints 2, 4, 8, 16, 32, 64, 128, 256 levels with steps 2.5, 1.25, 0.625, ... , 0.0195 V. Each extra bit doubles the level count and halves the step.',
      hints: [
        '2^n is just 1 multiplied by 2, n times — no floating point needed for the level count.',
        'The step size is the full range divided by the number of levels.',
        'Check your loop against the known anchor: 3 bits must give 8 levels, 0.625 V.',
      ],
    },
    practiceExercises: [
      {
        title: 'Regenerate a noisy bit stream',
        brief:
          'A received digital signal (0-5 V levels) is read as 0.1, 4.9, 2.6, 5.0, 1.8, 3.9 volts. Using thresholds LOW <= 1.5 V and HIGH >= 3.5 V, write down the recovered bit for each sample, and state what a receiver should do with the 2.6 V sample (the one that falls in the forbidden band).',
        expectedBehavior:
          'Recovered bits: 0, 1, undefined, 1, 0, 1. The 2.6 V sample sits between the bands, so a robust receiver flags it as unreliable rather than guessing — for example by re-sampling or using error-correcting codes.',
        hints: [
          'Compare each voltage against the two thresholds independently.',
          'Only voltages at or below the LOW threshold decode as 0; only those at or above the HIGH threshold decode as 1.',
          'The forbidden band exists precisely so the receiver can *know* when a value is untrustworthy.',
        ],
      },
      {
        title: 'Size a storage buffer for digital audio',
        brief:
          'CD-quality mono audio uses 44 100 samples per second with 16 bits (2 bytes) per sample. Compute how many bytes one minute of audio occupies, then state how many minutes fit in 50 MB (using 1 MB = 1 000 000 bytes).',
        expectedBehavior:
          '44 100 x 60 x 2 = 5 292 000 bytes per minute, about 5.29 MB. So 50 MB holds roughly 9.4 minutes of mono audio (stereo would double it).',
        hints: [
          'Bytes per second = sample rate x bytes per sample.',
          'Multiply by 60 for one minute, then divide 50 000 000 by the per-minute figure.',
          'Notice how fast uncompressed data grows — this motivates compression and why systems prefer few bits.',
        ],
      },
    ],
    assessment: {
      title: 'Analog vs digital checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which property is the single biggest practical reason modern systems digitize signals early?',
          options: [
            'Digital signals can be regenerated cleanly after noise, while analog noise accumulates',
            'Digital circuits are always smaller than analog ones',
            'Analog voltages cannot be amplified',
            'Digital systems never need converters',
          ],
          answer:
            'Digital signals can be regenerated cleanly after noise, while analog noise accumulates',
          explanation:
            'Each digital stage re-decides the symbol and emits a fresh, clean level, so noise never accumulates down a chain. Analog processing mixes noise in permanently.',
          hint: 'Think about what happens after ten stages of processing a weak, noisy signal.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A digital 0 always means exactly 0.000 volts on the wire.',
          answer: 'false',
          explanation:
            'A 0 is any voltage within a defined low band. The circuit never relies on an exact voltage — only on which band a value falls in.',
          hint: 'Remember the forbidden band between the low and high zones.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'short-answer',
          prompt: 'How many distinct output codes does a 4-bit ADC have? (Answer with a number.)',
          answer: '16',
          explanation:
            'An n-bit converter has 2^n codes; 2^4 = 16 codes, covering the range in 16 steps.',
          hint: 'Count with powers of two: 2, 4, 8, ...',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt:
            'A 3-bit ADC with codes 0..7 covering 0-7 V uses round-to-nearest. What code does a 5.1 V sample produce?',
          options: ['4', '5', '6', '7'],
          answer: '5',
          explanation:
            '5.1 is nearest to the level 5 (rounding 5.1 + 0.5 = 5.6 down to 5). Code 5 in binary is 101.',
          hint: 'Which integer is closest to 5.1?',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Signal', definition: 'A physical quantity, usually voltage or current, that carries information.' },
      { term: 'Analog', definition: 'A representation in which the amplitude varies continuously over a range of values and time.' },
      { term: 'Digital', definition: 'A representation using discrete symbols — in binary electronics, only 0 and 1.' },
      { term: 'Sampling', definition: 'Capturing the value of an analog signal at regular instants of time.' },
      { term: 'Quantization', definition: 'Snapping a sampled value to the nearest of 2^n discrete levels, introducing a bounded error.' },
      { term: 'Regeneration', definition: 'Re-emitting a clean, full-swing digital level at each stage so noise does not accumulate.' },
    ],
    revisionSummary: [
      'Analog = continuous amplitude; digital = only two legal symbols, 0 and 1.',
      'Practical chain: sensor -> ADC -> digital logic -> DAC -> actuator.',
      'An n-bit converter produces 2^n codes; more bits means finer steps but cost and speed trade-offs.',
      'Digital wins through noise immunity, regeneration, lossless copying, programmability and error detection.',
      'Analog never disappears: sensors, RF and power stages remain analog, and real wires still behave analog inside digital chips.',
      'A digital 0 is a *band* of voltages, not an exact value — the foundation of noise margins in the next lesson.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Digital signal', url: 'https://en.wikipedia.org/wiki/Digital_signal', kind: 'article' },
      { label: 'Wikipedia — Analog signal', url: 'https://en.wikipedia.org/wiki/Analog_signal', kind: 'article' },
      { label: 'All About Circuits — Analog and digital electronics', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-1/analog-and-digital-digital-data/', kind: 'docs' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'de-m01-l02',
    title: 'Logic Levels and Noise Margins',
    summary:
      'How voltages are mapped to 0 and 1, what VIH, VIL, VOH and VOL mean, and how the gap between them — the noise margin — makes digital circuits robust.',
    objectives: [
      'Define driver-side levels (VOH, VOL) and receiver-side thresholds (VIH, VIL) and draw the voltage bands they create.',
      'Compute high and low noise margins from a logic-family specification.',
      'Explain what happens when a voltage lands in the undefined region, and why real chips forbid operating there.',
      'Decide whether two logic families can be interconnected by comparing their level specifications.',
    ],
    whyItMatters:
      'Noise margins are the reason the digital abstraction survives contact with real, noisy electronics. Every timing rule, every interconnect standard and every logic family datasheet you will ever read is expressed in these four voltages. They also explain the undefined or unknown value (written x in Verilog) that you will meet constantly in simulation — a value that is neither a valid 0 nor a valid 1.',
    prerequisites: ['de-m01-l01'],
    explanation:
      'To turn voltages into logic, a digital system splits the supply range into **four** boundaries. A *driver* (a gate output) promises to deliver a high level of at least **VOH** and a low level of at most **VOL**. A *receiver* (a gate input) promises to interpret anything at or above **VIH** as a 1 and anything at or below **VIL** as a 0.\n\nBecause VOH is greater than VIH and VOL is less than VIL, there is a guaranteed gap on each side:\n\n- **Noise margin high**: `NMH = VOH - VIH` — how much the high level can sag and still be read as 1.\n- **Noise margin low**: `NML = VIL - VOL` — how far the low level can rise and still be read as 0.\n\nAnything between VIL and VIH is the **undefined region**: a receiver cannot promise what it will interpret, and different chips (or the same chip at a different temperature) may disagree. Good designs never let a static signal sit there.\n\n### Reading a level diagram\n\n```\n0 V ... guaranteed 0 ... VIL ... FORBIDDEN ... VIH ... guaranteed 1 ... VDD\n         band             max      BAND           min\n```\n\nThe driver outputs swing *wider* than the receiver requires; that deliberate overlap is the safety margin.\n\n### Working example with representative values\n\nTake a simplified 5 V CMOS system with `VOL = 0.05 V`, `VIL = 1.5 V`, `VIH = 3.5 V`, `VOH = 4.95 V`:\n\n- `NMH = 4.95 - 3.5 = 1.45 V`\n- `NML = 1.5 - 0.05 = 1.45 V`\n\nA receiver input can tolerate up to 1.45 V of noise riding on either level and still decode correctly. TTL-style values are much tighter (`VOH = 2.4 V`, `VIH = 2.0 V`, giving `NMH = 0.4 V`), which is one reason CMOS replaced TTL for most new design.\n\n### When things go undefined\n\nIf a wire is *not driven at all* — a cut trace, an unconnected input, a tri-stated bus with no master — its voltage floats, and the receiving gate may see anything. Simulators model this as the unknown value **x**. Verilog also has **z**, high impedance, meaning "driven by nothing". Distinguishing x (unknown value) from z (no driver) is a skill you will use in every simulation of the Verilog course.',
    deepDive:
      '### Why thresholds are asymmetric in the datasheet\n\nVOH is specified at some maximum output current and VIL/VIH across temperature and process corners. Real datasheets therefore quote *worst-case* values: the weakest driver and the pickiest receiver. That is exactly what a noise margin calculation needs — design to the worst case and the typical case takes care of itself.\n\n### Interfacing logic families\n\nTo connect family A (driver) to family B (receiver) you need all four of these to hold: `VOH(A) >= VIH(B)` and `VOL(A) <= VIL(B)` for logic correctness, plus current capability for speed and fan-out. A classic trap: 5 V CMOS driving TTL works for highs (4.95 >= 2.0) but old TTL inputs load the CMOS output heavily, while 5 V TTL driving 3.3 V CMOS can *damage* the receiver because the high level exceeds its absolute maximum. Level shifters exist for exactly this reason.\n\n### Where the threshold physically comes from\n\nInside a CMOS gate, two transistor networks fight: a pull-up network toward VDD and a pull-down network toward ground. The switching threshold is where neither wins decisively. In the undefined band both networks partially conduct, which is also why a gate held in that region dissipates wasteful shoot-through current — one more reason floating inputs are banned in real designs. Unused CMOS inputs are always tied to a valid level.',
    examples: [
      {
        title: 'A voltage-to-logic decoder in C',
        language: 'c',
        code:
          '#include <stdio.h>\n\n/* Representative 5 V CMOS receiver thresholds (volts) */\n#define VIL_MAX 1.5   /* at or below this -> logic 0 */\n#define VIH_MIN 3.5   /* at or above this -> logic 1 */\n\n/* Returns 0 or 1 for valid levels, or -1 for the undefined region */\nint decode_voltage(double v) {\n    if (v <= VIL_MAX) return 0;\n    if (v >= VIH_MIN) return 1;\n    return -1;                    /* forbidden band: unreliable */\n}\n\nint main(void) {\n    double probe[5] = {0.2, 1.4, 2.5, 3.6, 4.8};\n    for (int i = 0; i < 5; i++) {\n        int bit = decode_voltage(probe[i]);\n        printf("%.1f V -> %s\\n", probe[i],\n               bit == -1 ? "UNDEFINED" : (bit ? "1" : "0"));\n    }\n    return 0;\n}',
        explanation: [
          'The two `#define`s model the receiver thresholds from a datasheet; real systems also add hysteresis and temperature derating.',
          '`decode_voltage` implements exactly the receiver contract: decide 0, decide 1, or declare the value unreliable.',
          'The probe values 0.2 and 1.4 V fall at or below VIL_MAX, so both decode as 0 — note 1.4 V is still a legal 0 even though it "feels" high.',
          'The 2.5 V probe lands between the thresholds and reports UNDEFINED, which is how simulation tools justify showing an x.',
          'The 3.6 V and 4.8 V probes both decode as 1 — the receiver does not care how far above VIH the value is, only that it cleared the bar.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Voltage bands, thresholds and noise margins',
        content:
          '  0 V                                                         VDD (5 V)\n   |      <--- NML --->|                 |<--- NMH --->|\n   |                   |                 |             |\n   |   ================|=================|=============|=====\n   |   guaranteed 0    VIL      FORBIDDEN  VIH     guaranteed 1\n   |      band         (1.5 V)   REGION    (3.5 V)    band\n   |                   |     (1.5-3.5)    |             |\n   |   driver promises |                 | promises    |\n   |   VOL <= 0.05 V   |                 | VOH >= 4.95 |\n\n   driver output bands are WIDER than receiver requirement bands,\n   and the difference on each side is the noise margin.',
        caption:
          'The driver guarantees levels outside the receiver thresholds; the slack on each side is the noise margin that absorbs noise.',
      },
      {
        kind: 'block',
        title: 'One driver, one receiver, one noisy wire',
        content:
          '  +---------+   wire (picks up noise)    +-----------+\n  |  DRIVER |------------ ~ ~ ~ -------->| RECEIVER  |\n  | VOH/VOL |         noise adds        | VIH/VIL   |\n  +---------+                           +-----------+\n\n  rule:  VOH(driver) >= VIH(receiver)   -> high margin exists\n         VOL(driver) <= VIL(receiver)   -> low margin exists\n\n  NMH = VOH - VIH        NML = VIL - VOL',
        caption:
          'Noise margins are computed pair-wise: the driver spec of one device against the receiver spec of the next.',
      },
    ],
    tables: [
      {
        caption: 'Representative logic levels (textbook values, 5 V supplies)',
        headers: ['Symbol', 'Meaning', 'CMOS (simplified)', 'TTL'],
        rows: [
          ['VOL', 'Output low voltage (max)', '0.05 V', '0.4 V'],
          ['VIL', 'Input low threshold (max)', '1.5 V', '0.8 V'],
          ['VIH', 'Input high threshold (min)', '3.5 V', '2.0 V'],
          ['VOH', 'Output high voltage (min)', '4.95 V', '2.4 V'],
          ['NML = VIL - VOL', 'Low noise margin', '1.45 V', '0.4 V'],
          ['NMH = VOH - VIH', 'High noise margin', '1.45 V', '0.4 V'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Computing noise margin as VIH - VIL (threshold gap).',
        fix:
          'The noise margin always compares a *driver* spec against a *receiver* spec: NMH = VOH - VIH and NML = VIL - VOL. The gap between VIH and VIL is the undefined region, which is the opposite of a margin.',
      },
      {
        mistake: 'Leaving unused CMOS inputs floating.',
        fix:
          'A floating input can sit in the undefined region, oscillate, or pick up noise, and the gate wastes current fighting itself. Tie unused inputs to VDD or ground (or to another driven signal). In simulation this mistake appears as x values propagating through your logic.',
      },
      {
        mistake: 'Assuming a "1" must be near the full supply voltage.',
        fix:
          'Validity is defined by thresholds, not by proximity to VDD. On TTL, 2.4 V is a guaranteed 1 despite being less than half the 5 V supply. Always check the datasheet bands instead of intuition.',
      },
    ],
    guidedPractice: {
      title: 'Compute noise margins for 3.3 V LVTTL',
      brief:
        'A 3.3 V LVTTL system specifies VOL = 0.4 V, VIL = 0.8 V, VIH = 2.0 V, VOH = 2.4 V. Compute NMH and NML, then state whether a driver that sags to 1.9 V on a high output still communicates correctly.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    double vol = 0.4, vil = 0.8, vih = 2.0, voh = 2.4;\n\n    double nmh = voh - vih;   /* high-side margin */\n    double nml = vil - vol;   /* low-side margin  */\n    printf("NMH = %.1f V, NML = %.1f V\\n", nmh, nml);\n\n    double sagged_high = 1.9; /* a driver that failed to reach VOH */\n    if (sagged_high >= vih) {\n        printf("sagged high still reads as 1\\n");\n    } else {\n        printf("sagged high is UNDEFINED\\n");\n    }\n    return 0;\n}',
      expectedBehavior:
        'NMH = 2.4 - 2.0 = 0.4 V and NML = 0.8 - 0.4 = 0.4 V. The sagged output of 1.9 V is below VIH = 2.0 V, so it lands in the undefined region and must not be relied on.',
      hints: [
        'Each margin is a subtraction across the driver/receiver boundary, never between the two input thresholds.',
        'To judge the sagged value, ask: is it at or above VIH? At or below VIL? Or neither?',
        'Notice both margins are equal here — that symmetry is common but not required.',
      ],
    },
    practiceExercises: [
      {
        title: 'Family compatibility check',
        brief:
          'Driver A (5 V CMOS): VOL = 0.05 V, VOH = 4.95 V. Receiver B (TTL): VIL = 0.8 V, VIH = 2.0 V. Verify both noise margins and state whether A can drive B reliably.',
        expectedBehavior:
          'NMH = 4.95 - 2.0 = 2.95 V and NML = 0.8 - 0.05 = 0.75 V. Both are positive and generous, so logic levels are compatible (current loading and speed would still need checking, per the deep dive).',
        hints: [
          'Use the driver values of A and the receiver values of B — never mix two drivers or two receivers.',
          'A margin of zero or less means the families cannot talk to each other.',
        ],
      },
      {
        title: 'Count tolerated noise stages',
        brief:
          'A chain of five gates uses the CMOS levels from the lesson (margins 1.45 V each side). Each gate output can be disturbed by up to 0.3 V of noise before the next receiver. Explain why the fifth gate still receives clean logic values, and what would happen in an analogous analog chain that also added 0.3 V per stage.',
        expectedBehavior:
          'Each receiver absorbs up to 1.45 V of noise, far more than 0.3 V, and then regenerates a fresh full-swing output — noise is not passed downstream. In the analog chain, 5 stages would accumulate roughly 5 x 0.3 = 1.5 V of distortion with no mechanism to remove it.',
        hints: [
          'The key word is regeneration: the receiver makes a decision, then the driver emits a brand-new level.',
          'Contrast "decide then rewrite" with "pass the signal through unchanged".',
        ],
      },
    ],
    assessment: {
      title: 'Logic levels checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Given VOH = 4.95 V and VIH = 3.5 V, what is the high noise margin?',
          options: ['1.45 V', '3.5 V', '4.95 V', '8.45 V'],
          answer: '1.45 V',
          explanation: 'NMH = VOH - VIH = 4.95 - 3.5 = 1.45 V.',
          hint: 'Subtract the receiver requirement from the driver guarantee.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A wire that is not driven by anything (floating) always decodes as 0.',
          answer: 'false',
          explanation:
            'A floating wire has no defined voltage at all; it may read 0, 1, or hover in the undefined region. Simulators show it as unknown (x).',
          hint: 'Think about what the voltage actually is when nothing is connected.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt:
            'Using the decoder thresholds VIL_MAX = 1.5 V and VIH_MIN = 3.5 V from the example, what does decode_voltage(2.5) return?',
          code:
            '#define VIL_MAX 1.5\n#define VIH_MIN 3.5\n\nint decode_voltage(double v) {\n    if (v <= VIL_MAX) return 0;\n    if (v >= VIH_MIN) return 1;\n    return -1;\n}',
          options: ['0', '1', '-1 (undefined)', '2'],
          answer: '-1 (undefined)',
          explanation:
            '2.5 V is above VIL_MAX and below VIH_MIN, so it lands in the forbidden band and the function returns -1, modelling an unknown value.',
          hint: 'Is 2.5 V inside either guaranteed band?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'What is the name (one or two words) of the voltage region between VIL and VIH where a receiver cannot guarantee its decision?',
          answer: 'undefined region',
          explanation:
            'The undefined (forbidden) region lies between the input thresholds; static signals must never dwell there.',
          hint: 'The lesson also calls it the forbidden band.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt:
            'Driver A has VOL = 0.4 V and receiver B has VIL = 0.8 V. A noise source injects up to 0.5 V onto a wire that A drives low. What is the consequence?',
          options: [
            'The low noise margin (0.4 V) is exceeded, so B may misread the wire as 1',
            'Nothing: noise never affects digital wires',
            'The wire now reads as 1 permanently and can never recover',
            'The values are corrupted only if the noise lasts several clock cycles',
          ],
          answer:
            'The low noise margin (0.4 V) is exceeded, so B may misread the wire as 1',
          explanation:
            'NML = VIL - VOL = 0.8 - 0.4 = 0.4 V. Noise of 0.5 V can push the wire to 0.9 V, above VIL, so the receiver can no longer guarantee a 0. The margin was smaller than the disturbance.',
          hint: 'Compare the injected noise against NML = VIL - VOL.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'VOH', definition: 'Minimum output high voltage a driver guarantees.' },
      { term: 'VOL', definition: 'Maximum output low voltage a driver guarantees.' },
      { term: 'VIH', definition: 'Minimum input voltage a receiver interprets as logic 1.' },
      { term: 'VIL', definition: 'Maximum input voltage a receiver interprets as logic 0.' },
      { term: 'Noise margin', definition: 'The slack between a driver guarantee and a receiver threshold: NMH = VOH - VIH, NML = VIL - VOL.' },
      { term: 'Undefined region', definition: 'The input voltage band between VIL and VIH where the received logic value cannot be guaranteed (shown as x in simulation).' },
    ],
    revisionSummary: [
      'Four voltages define the digital abstraction: driver VOH/VOL and receiver VIH/VIL.',
      'NMH = VOH - VIH and NML = VIL - VOL; both must be positive for two devices to interoperate.',
      'Voltages between VIL and VIH are undefined; a static signal there is a design bug.',
      'Floating (undriven) wires show as unknown x in simulation; high-impedance z means no driver at all.',
      'CMOS margins are typically much wider than TTL margins, one reason CMOS dominates.',
      'Unused inputs must be tied to a valid level to keep them out of the undefined region.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Logic level', url: 'https://en.wikipedia.org/wiki/Logic_level', kind: 'article' },
      { label: 'Electronics Tutorials — Digital logic gates and noise margins', url: 'https://www.electronics-tutorials.ws/logic/logic-gates.html', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'de-m01-l03',
    title: 'Digital Systems, Binary Representation, and the Two Families of Circuits',
    summary:
      'The block view of a digital system, how binary encodes numbers and other information, and the fundamental split between combinational circuits (no memory) and sequential circuits (with memory).',
    objectives: [
      'Draw the input-logic-output block structure of a digital system and place ADC, logic and DAC blocks in it.',
      'Explain how a group of bits encodes not just numbers but text, pixels and machine states.',
      'Classify a circuit as combinational or sequential from its behavior.',
      'Identify which modules of this course belong to each family.',
    ],
    whyItMatters:
      'Every design decision in hardware starts with one question: does this circuit need memory? Combinational circuits (adders, muxes, decoders) are pure functions of their current inputs; sequential circuits (registers, counters, FSMs) remember history under the control of a clock. Mixing them up is the most common architectural mistake beginners make, and the distinction organizes the entire second half of this course.',
    prerequisites: ['de-m01-l01', 'de-m01-l02'],
    explanation:
      'Zoom out from voltages and look at a whole digital product: a washing machine controller, a network card, a calculator. All of them share the same skeleton:\n\n1. **Inputs** — buttons, sensors, communication pins — deliver information as bits.\n2. **Digital logic** transforms those bits, possibly using values stored from earlier.\n3. **Outputs** — displays, motors, transmission pins — present the result.\n\n### Bits encode everything\n\nA single **bit** (binary digit) holds one of two values. Alone it is tiny; in groups it encodes anything you can enumerate:\n\n- 4 bits encode the numbers 0-15; 8 bits (**one byte**) encode 0-255, or one ASCII character.\n- 24 bits encode one colour pixel (8 bits each for red, green and blue).\n- A handful of bits encode a *state*: door open/closed, wash cycle phase, traffic-light colour.\n\nThe same bit pattern means different things depending on the agreed interpretation — 0110 0001 is both decimal 97 and the letter a. Hardware does not know or care; the *interpretation* lives in the design. This is why this course insists you always state what your bits mean.\n\n### Combinational circuits: pure functions\n\nA **combinational** circuit computes its output from the *current inputs only*. Feed it the same inputs twice and it must answer identically, no matter what happened before. It has no memory, no clock, no state. Adders, multiplexers, decoders, encoders and comparators are combinational. A useful mental model: a combinational circuit is a lookup table that hardware evaluates.\n\n### Sequential circuits: functions with memory\n\nA **sequential** circuit depends on history. A counter must remember its current value to produce the next one; a traffic-light controller must remember which light is green. Memory elements (**latches** and **flip-flops**, Module 6) store bits, and a **clock** paces when new values are accepted, which lets designers reason about circuits step by step instead of continuously.\n\n```\nCombinational:   inputs  ----> [ logic ]  ----> output      (no storage)\nSequential:      inputs  ----> [ logic ]  ----> output\n                                    ^    |\n                                    +----+\n                                 (fed back through memory, paced by a clock)\n```\n\nThat feedback path is the structural difference: sequential circuits feed part of their output back into their inputs through memory. Every counter, register and state machine in this course is a variation of that one picture.',
    deepDive:
      '### Why the split matters for design method\n\nCombinational circuits are analyzed with truth tables and Boolean algebra (Modules 3-5): enumerate inputs, define outputs, minimize logic. Sequential circuits need a *sequence* of reasoning — you describe behavior as states and transitions (Modules 6-7) because the answer depends on time. Two different toolsets, one course split, and the same distinction reappears in Verilog: combinational logic is written with continuous assignments, sequential logic inside clocked always blocks.\n\n### Open-loop vs closed-loop in the digital domain\n\nThe feedback through memory makes sequential circuits the digital equivalent of closed-loop systems. It also introduces hazards analog designers never face: what happens the *first* moment power is applied and the memory holds garbage? Reset circuits exist to answer that, and asynchronous feedback inside combinational logic (accidental loops) is a notorious bug class you will learn to avoid.\n\n### Hierarchy: systems from blocks\n\nReal designs compose both families. A CPU is: registers and a program counter (sequential) wrapped around an ALU (combinational), with a controller FSM (sequential) steering everything. Learning to see any block diagram as "combinational datapath + sequential control" is the single most reusable skill this course teaches — it is exactly how the Verilog and processor courses are organized.',
    examples: [
      {
        title: 'Combinational vs sequential behavior modeled in C',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* COMBINATIONAL: output depends only on the current arguments.\n   Same inputs -> same answer, always. */\nuint8_t majority(uint8_t a, uint8_t b, uint8_t c) {\n    return (uint8_t)(((a & b) | (b & c) | (a & c)) & 1u);\n}\n\n/* SEQUENTIAL: output depends on the call history,\n   which lives in the static variable (a memory element). */\nuint8_t toggle(void) {\n    static uint8_t state = 0;\n    state = (uint8_t)(state ^ 1u);\n    return state;\n}\n\nint main(void) {\n    printf("majority(0,1,1) = %u\\n", majority(0, 1, 1));\n    printf("majority(0,1,1) again = %u\\n", majority(0, 1, 1));\n\n    printf("toggle: %u\\n", toggle());   /* 1 */\n    printf("toggle: %u\\n", toggle());   /* 0 */\n    printf("toggle: %u\\n", toggle());   /* 1 */\n    return 0;\n}',
        explanation: [
          '`majority` is a pure function: called twice with (0,1,1) it returns 1 both times — the signature of combinational behavior.',
          'Its expression `(a & b) | (b & c) | (a & c)` is the majority-of-three function; it will reappear as a gate circuit in Module 3 and a Verilog module in Module 1 lesson 4.',
          '`toggle` keeps a `static` variable — a software stand-in for a flip-flop storing one bit of state.',
          'Each call flips the stored bit, so the same function call returns 1, then 0, then 1: identical inputs, different outputs, purely because history differs.',
          'In hardware, the `static` memory becomes a flip-flop and the implicit "call" becomes a clock edge — that mapping is Module 6.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'System skeleton and the sequential feedback loop',
        content:
          '  SYSTEM SKELETON\n\n   inputs                    digital logic                 outputs\n  +--------+   bits    +---------------------+   bits    +---------+\n  | buttons|---------->|   combinational     |---------->| display |\n  | sensors|           |   + sequential      |           | motors  |\n  | comms  |           |     (clocked)       |           | comms   |\n  +--------+           +---------------------+           +---------+\n\n  THE SEQUENTIAL CORE (memory + feedback)\n\n   inputs ---> [ next-state logic ]---> [ memory (flip-flops) ]---> outputs\n                        ^                        |\n                        +------------------------+\n                            state fed back, updated on clock edges',
        caption:
          'Left: every digital product is inputs, logic, outputs. Right: sequential behavior comes from feeding stored state back into the logic.',
      },
    ],
    tables: [
      {
        caption: 'Combinational vs sequential circuits',
        headers: ['Aspect', 'Combinational', 'Sequential'],
        rows: [
          ['Output depends on', 'Current inputs only', 'Current inputs AND stored history'],
          ['Memory', 'None', 'Latches / flip-flops'],
          ['Clock', 'Not needed', 'Required (or at least an event to update state)'],
          ['Analysis tool', 'Truth table, Boolean algebra', 'State diagram, state table, timing'],
          ['Examples', 'Adder, mux, decoder, comparator', 'Counter, register, FSM, CPU control'],
          ['Course modules', 'Modules 3, 4, 5', 'Modules 6, 7'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Calling any circuit with a clock "combinational".',
        fix:
          'The defining property of combinational logic is *no memory*, not "no clock". If the output depends on past values — anything remembered in flip-flops — the circuit is sequential even if most of its guts are combinational gates.',
      },
      {
        mistake: 'Assuming a bit pattern has one inherent meaning.',
        fix:
          'Bits mean whatever the designer agrees they mean: 01100001 is 97, the letter a, or a motor-command code. Always write down the encoding (a comment or a table) before writing logic that interprets it.',
      },
      {
        mistake: 'Forgetting the reset path in a sequential design sketch.',
        fix:
          'On power-up, memory holds arbitrary values. Every sequential block diagram should show a reset (or an initial-state mechanism); Module 6 makes this a coding rule in Verilog.',
      },
    ],
    guidedPractice: {
      title: 'Sort circuits into the two families',
      brief:
        'Classify each of the following as combinational or sequential, and justify with one sentence: (a) a circuit that outputs 1 when its 4 inputs contain an odd number of 1s; (b) a circuit that beeps when a door has been open for 30 seconds; (c) a 4-bit circuit that outputs the larger of two numbers; (d) a circuit that advances through a fixed pattern of light phases.',
      starterCode:
        '/* Fill in your classification and reason, then compare with\n   expectedBehavior.\n\n   (a) parity-of-4-inputs      : ?\n   (b) door-open-30s alerter   : ?\n   (c) larger-of-two-numbers   : ?\n   (d) light-phase sequencer   : ?\n*/',
      expectedBehavior:
        '(a) combinational — pure function of current inputs. (b) sequential — it must remember how long the door has been open (elapsed time is history). (c) combinational — comparing two present values needs no memory. (d) sequential — a fixed pattern through time is state, exactly like a traffic light.',
      hints: [
        'Ask: "if I freeze time and hand the circuit fresh inputs, can it answer with no other information?" If yes, combinational.',
        'Any phrase like "has been", "for 30 seconds", "advances", or "remembers" signals history, hence sequential.',
        'Duration measurement in (b) can be built as a counter — which is sequential hardware counting clock edges.',
      ],
    },
    practiceExercises: [
      {
        title: 'Enumerate an encoding space',
        brief:
          'A controller must represent 6 wash-cycle phases. How many bits are required at minimum? How many phase codes go unused? Repeat for 10 phases.',
        expectedBehavior:
          '3 bits (8 codes) for 6 phases, leaving 2 unused; 4 bits (16 codes) for 10 phases, leaving 6 unused. Unused codes are either treated as impossible (don\'t cares, Module 4) or explicitly trapped as errors.',
        hints: [
          'Find the smallest n with 2^n >= the number of items.',
          'Unused = 2^n minus the number of real codes; deciding what happens when one occurs is a design decision, not an accident.',
        ],
      },
      {
        title: 'Spot the hidden feedback loop',
        brief:
          'A student builds a circuit: an AND gate whose output feeds one of its own inputs (the other input is signal x). Explain why this is neither cleanly combinational nor a well-defined sequential circuit, and what missing ingredient makes feedback legal in real designs.',
        expectedBehavior:
          'The gate output depends on itself instantly — an unclocked feedback loop. Its behavior depends on analog details (delays), so it is not a clean combinational function, and without a memory element and clock pacing it is not a well-defined sequential circuit either. Legal feedback goes through a latch/flip-flop updated by a clock (or an intentional reset), which is exactly the sequential core diagram.',
        hints: [
          'Trace one loop around: output -> input -> output. Does it ever settle to a defined function of x?',
          'Compare with the sequential core picture: the feedback there passes through memory that updates on clock edges, breaking the instantaneous loop.',
        ],
      },
    ],
    assessment: {
      title: 'Systems and circuit families checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which circuit is combinational?',
          options: [
            'A 4-bit adder producing the sum of its two present inputs',
            'A counter advancing on every clock edge',
            'A traffic-light controller cycling through phases',
            'A shift register serializing a byte',
          ],
          answer: 'A 4-bit adder producing the sum of its two present inputs',
          explanation:
            'The adder is a pure function of current inputs. The counter, controller and shift register all store state and advance on clock edges, making them sequential.',
          hint: 'Which one needs no memory at all to answer?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A sequential circuit must contain a clock for its outputs to depend on history.',
          answer: 'false',
          explanation:
            'Memory (state) is what makes it sequential; a clock paces the updates in synchronous design, but level-sensitive latches or even an unclocked SR latch already exhibit history-dependent behavior.',
          hint: 'Revisit the definition: the essential ingredient is memory, and the clock is an organization tool.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'short-answer',
          prompt: 'How many distinct values can one byte (8 bits) represent?',
          answer: '256',
          explanation: '2^8 = 256 distinct patterns, from 00000000 to 11111111.',
          hint: '2^8.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does the C function majority return for inputs a=1, b=0, c=1?',
          code: 'uint8_t majority(uint8_t a, uint8_t b, uint8_t c) {\n    return (uint8_t)(((a & b) | (b & c) | (a & c)) & 1u);\n}',
          options: ['0', '1', '2', 'undefined'],
          answer: '1',
          explanation: '(a&b)=0, (b&c)=0, (a&c)=1, so the OR is 1. At least two inputs are 1, which is exactly what majority computes.',
          hint: 'Count how many inputs are 1.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Structurally, what feature present in sequential circuits but absent in combinational circuits makes their outputs history-dependent? (One word.)',
          answer: 'memory',
          explanation:
            'Stored state — memory elements such as latches and flip-flops — is what lets a sequential circuit remember history.',
          hint: 'It stores the state that gets fed back.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Bit', definition: 'One binary digit, holding the value 0 or 1; the atom of all digital information.' },
      { term: 'Byte', definition: 'A group of 8 bits, able to represent 256 distinct values.' },
      { term: 'Combinational circuit', definition: 'A circuit whose outputs are a function of current inputs only, with no memory.' },
      { term: 'Sequential circuit', definition: 'A circuit whose behavior depends on stored history as well as current inputs, paced by a clock in synchronous design.' },
      { term: 'State', definition: 'The stored information summarizing a circuit\'s relevant history.' },
      { term: 'Feedback', definition: 'Routing a circuit\'s outputs back toward its inputs; through memory elements it creates sequential behavior.' },
    ],
    revisionSummary: [
      'Every digital system reduces to inputs -> logic -> outputs.',
      'Bits encode anything enumerable: numbers, ASCII text, pixels, machine states; the interpretation is a design agreement.',
      'Combinational = pure function of current inputs; analyze with truth tables and Boolean algebra.',
      'Sequential = combinational logic + memory with feedback, paced by a clock; analyze with state diagrams and timing.',
      'Modules 3-5 build the combinational toolbox; Modules 6-7 build the sequential one; Module 8 adds the time dimension.',
      'Every sequential design needs a plan for power-up state (reset).',
    ],
    furtherReading: [
      { label: 'Wikipedia — Combinational logic', url: 'https://en.wikipedia.org/wiki/Combinational_logic', kind: 'article' },
      { label: 'Wikipedia — Sequential logic', url: 'https://en.wikipedia.org/wiki/Sequential_logic', kind: 'article' },
      { label: 'All About Circuits — Digital textbook, Vol. IV introduction', url: 'https://www.allaboutcircuits.com/textbook/digital/', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'de-m01-l04',
    title: 'From Circuits to RTL: The Verilog Bridge',
    summary:
      'How text becomes hardware: the abstraction ladder from transistors to RTL, what an HDL actually describes, and a first look at a real Verilog module that you will be able to read by the end of this course.',
    objectives: [
      'Name the rungs of the abstraction ladder: transistors, gates, modules, RTL.',
      'Explain why an HDL describes hardware structure and parallel behavior rather than a sequence of steps.',
      'Read a trivial Verilog module and identify its ports, wires and continuous assignment.',
      'Describe what synthesis does with RTL and why the discipline of this course (truth tables, clean combinational blocks, clocked registers) maps onto it.',
    ],
    whyItMatters:
      'This course is the on-ramp to hardware engineering on EnginX: the Verilog, RTL and VLSI tracks all assume you can think in truth tables, gate networks, flip-flops and timing budgets. Seeing a 15-line Verilog module now — and understanding that it *is* the gate circuits you are learning — makes the later courses feel like a continuation instead of a restart.',
    prerequisites: ['de-m01-l01', 'de-m01-l03'],
    explanation:
      'Nobody draws a billion transistors by hand. Hardware is built through an **abstraction ladder**, where each level is described in a language of its own and compiled down to the level below:\n\n1. **Transistors** — physical switches whose physics analog designers own.\n2. **Gates** — transistors arranged into AND, OR, NOT and friends; this is Module 3.\n3. **Functional blocks** — gates composed into adders, muxes, registers, counters; Modules 4-6.\n4. **RTL (Register-Transfer Level)** — a text description of *what* transfers happen *between registers on each clock edge*; the language of the Verilog course.\n5. **System** — processors, buses, peripherals composed in C, Verilog or diagrams.\n\nA **hardware description language (HDL)** such as Verilog lets you write text at level 4 (or even level 3, gate by gate). The key mental shift: Verilog is *not* a program that runs top to bottom. It describes a *structure* of wires and blocks that all act **concurrently**. If three `assign` statements exist, all three are "live" at once, like three gates on a breadboard.\n\n### What synthesis does\n\n**Synthesis** is the compiler of hardware: it reads your RTL and produces a **netlist** — a concrete list of gates and their connections — meeting the logic you wrote. Later steps place those gates on silicon (or an FPGA) and check the timing budgets of Module 8. When you write `assign y = a & b;`, synthesis delivers a real AND gate; when you write a clocked `always` block, it delivers flip-flops. Bad habits in RTL produce bloated or broken hardware, which is why disciplined thinking — the kind this course drills — matters more than syntax.\n\n### Your first module\n\nBelow is a complete Verilog module for the majority-of-three function you already saw in C. Notice the one-to-one correspondence with a gate network: three AND gates feeding one OR gate.\n\n```verilog\nmodule majority3(\n    input  wire a,\n    input  wire b,\n    input  wire c,\n    output wire y\n);\n    assign y = (a & b) | (b & c) | (a & c);\nendmodule\n```\n\n- `module ... endmodule` names a hardware block, like a C function but describing *circuitry*.\n- `input wire` / `output wire` declare ports — the pins of the block.\n- `assign y = ...` is a **continuous assignment**: the wire `y` is permanently driven by that expression, forever, whenever any input changes. There is no "call" and no "return".\n- `&`, `|` and `^` are the same bitwise operators as C — because they model the same gates.\n\nBy the end of Module 3 you will trace this net by net; after Module 5 you will write adders like this yourself; after Module 6 the clocked versions will feel obvious.',
    deepDive:
      '### Two styles you will meet in Verilog\n\nThe course later uses two Verilog styles. *Structural* style instantiates gates explicitly (`and g1(w, a, b);`) — you literally draw the netlist in text. *Dataflow/behavioral* style writes equations or algorithms (`assign y = ...` or clocked `always` blocks) and lets synthesis pick the gates. Both describe the same hardware; professionals read and write both, and this course\'s examples switch between them deliberately so neither feels foreign.\n\n### Why concurrency changes how you debug\n\nSoftware bugs hide in *sequences*: what ran before what. Hardware bugs hide in *structures*: what drives this wire, is anything driven twice, is this loop combinational? The Verilog simulator will show you x values (from Module 1 lesson 2) when a wire has no driver or conflicting drivers. The habit you should start building now: whenever you look at a piece of hardware, ask "who drives this wire, and is that a function of current inputs only, or of clocked state?"\n\n### The contract between this course and the toolchain\n\nSynthesis tools trust your intent. If you describe latches accidentally, they build latches; if you leave a case incomplete, they build whatever survives. Every convention taught in the coming modules — complete truth tables, no floating descriptions, registered outputs on FSMs, resets on all sequential blocks — exists because some tool will faithfully build the lazy version otherwise.',
    examples: [
      {
        title: 'A complete Verilog module: majority of three',
        language: 'verilog',
        code:
          'module majority3(\n    input  wire a,\n    input  wire b,\n    input  wire c,\n    output wire y\n);\n    // y is a wire, permanently driven by the expression on the right.\n    assign y = (a & b) | (b & c) | (a & c);\nendmodule',
        explanation: [
          '`module majority3( ... ) ... endmodule` declares a reusable hardware block with its list of ports — the pins other circuits will connect to.',
          'Each port is a 1-bit `wire`: `input wire a` is a connection arriving from outside, `output wire y` is a connection this module drives.',
          '`assign y = (a & b) | (b & c) | (a & c);` is one **continuous assignment**: three AND operations feeding one OR, exactly the gate network in the diagram above.',
          'There is no clock, no memory and no order of execution here: whenever a, b or c changes, the expression re-evaluates and y settles to its new value — combinational hardware in a single line.',
          'The same expression in C (`(a & b) | (b & c) | (a & c)` on uint8_t values) computes the identical function on bits; the difference is that the Verilog version *is* circuitry, not a computation a processor performs.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The abstraction ladder',
        content:
          '   level                described with            built by\n   -----------------    ----------------------    ----------------\n   5. System            C, diagrams, scripts      you + tools\n   4. RTL               Verilog (behavior)        you, this bridge\n   3. Blocks            adders, regs, FSMs        Modules 4-7\n   2. Gates             AND/OR/NOT networks       Modules 3-5\n   1. Transistors       switch physics            analog/VLSI track\n\n   compile steps:   RTL --synthesis--> gate netlist --place&route--> silicon\n                    (timing checks from Module 8 guard every arrow)',
        caption:
          'Each rung hides the one below it; this course trains rungs 2-4 so the Verilog course starts at rung 4 feeling familiar.',
      },
      {
        kind: 'ascii',
        title: 'majority3: the text and the gates it names',
        content:
          '   assign y = (a & b) | (b & c) | (a & c);\n\n   becomes this structure:\n\n    a ---+---[ AND ]----+\n    b ---+      1        |\n                       [ OR ]---- y\n    b ---+---[ AND ]----+\n    c ---+      2        |\n    c ---+---[ AND ]----+\n    a ---+      3        |',
        caption:
          'One continuous assignment names three AND gates and one OR gate; synthesis maps each operator to a real gate.',
      },
    ],
    tables: [
      {
        caption: 'Same function, three languages of hardware',
        headers: ['View', 'How it looks'],
        rows: [
          ['Truth table', 'y = 1 on rows 011, 101, 110, 111 (at least two inputs high)'],
          ['Boolean algebra', 'y = ab + bc + ca'],
          ['C (bits)', 'y = (a & b) | (b & c) | (a & c)'],
          ['Verilog RTL', 'assign y = (a & b) | (b & c) | (a & c);'],
          ['Gate netlist', '3 two-input AND gates feeding one 3-input OR gate'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reading Verilog top-to-bottom like a program with an execution order.',
        fix:
          'Verilog describes concurrent hardware: every continuous assignment is always active. Order of statements in a module does not create sequence (only clocked always blocks create time steps, via flip-flops). When reviewing RTL, think "circuit diagram", not "script".',
      },
      {
        mistake: 'Believing `assign` is a one-time calculation.',
        fix:
          'A continuous assignment is a permanent connection: whenever a or b changes, y is recomputed, forever. It is closer to a wire with a function attached than to a statement.',
      },
      {
        mistake: 'Treating C and Verilog operators as interchangeable in every context.',
        fix:
          'The operators model the same gates, but C runs *sequentially* on values while Verilog *is* hardware on wires. In particular, C needs masks like `& 1` after `~` because it works on whole bytes, while a 1-bit Verilog `wire` needs no mask. Watch the width of every operand — width thinking starts here and dominates the Verilog course.',
      },
    ],
    guidedPractice: {
      title: 'Read and trace your first module',
      brief:
        'For the majority3 module above, evaluate y for the four input rows (a,b,c) = (0,0,1), (0,1,1), (1,0,0) and (1,1,1) by computing each AND term first, then the OR. Then state which single row property (in words) makes y equal 1.',
      starterCode:
        '/* Trace table to complete:\n   (a,b,c)   a&b   b&c   a&c   y\n   (0,0,1)    ?     ?     ?    ?\n   (0,1,1)    ?     ?     ?    ?\n   (1,0,0)    ?     ?     ?    ?\n   (1,1,1)    ?     ?     ?    ?\n*/',
      expectedBehavior:
        '(0,0,1): 0,0,0 -> y=0. (0,1,1): 0,1,0 -> y=1. (1,0,0): 0,0,0 -> y=0. (1,1,1): 1,1,1 -> y=1. The property: y = 1 exactly when two or more inputs are 1 (the majority function).',
      hints: [
        'Compute each AND independently before touching the OR.',
        'A row yields y=1 as soon as any one AND term is 1.',
        'After filling the table, count the 1s in each input row and compare with y.',
      ],
    },
    practiceExercises: [
      {
        title: 'Write a two-gate module',
        brief:
          'Write a Verilog module named `warn` with inputs `door` and `speed` and output `y`, where y = 1 when door is 1 AND speed is 1. Use one continuous assignment. Then write the same function as a C one-liner.',
        expectedBehavior:
          'A correct module declares the two input wires and one output wire and contains `assign y = door & speed;`. The C equivalent is `uint8_t y = (uint8_t)(door & speed);`. Both describe one AND gate.',
        hints: [
          'Copy the module shell from majority3 and rename ports.',
          'The condition "door AND speed" is literally the & operator.',
          'One input, one gate, one output: the smallest complete module is three lines of body.',
        ],
      },
      {
        title: 'Spot the concurrency error',
        brief:
          'In Verilog, what is wrong with assigning the same output wire twice — `assign y = a & b;` followed later by `assign y = c;`? Relate your answer to the concurrency of hardware rather than to programming style.',
        expectedBehavior:
          'Both assignments are continuously active, so the wire would have two simultaneous drivers fighting each other (a short between two outputs). This is a structural error, not an "override": in hardware, unlike software, a later line does not replace an earlier one.',
        hints: [
          'Picture two gate outputs soldered to the same wire.',
          'In simulation this typically produces x or z on the wire; in real silicon it is a contention fault.',
          'Each wire needs exactly one driver — a rule the Verilog course will enforce constantly.',
        ],
      },
    ],
    assessment: {
      title: 'RTL bridge checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does an HDL like Verilog primarily describe?',
          options: [
            'A sequence of steps the processor executes in order',
            'Hardware structure and behavior, with components acting concurrently',
            'A list of keyboard commands for a simulator GUI',
            'The physical shape of transistor layouts',
          ],
          answer: 'Hardware structure and behavior, with components acting concurrently',
          explanation:
            'An HDL text is a description of a circuit: wires, blocks and their connections, all active at once. Execution order is a software concept.',
          hint: 'Contrast with a C program\'s top-to-bottom execution.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Synthesis converts RTL text into a gate-level netlist.',
          answer: 'true',
          explanation:
            'Synthesis is the step that compiles RTL descriptions into concrete gates and their connections; placement and routing then turn the netlist into silicon or FPGA configuration.',
          hint: 'It is the hardware equivalent of a compiler.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'What value does y hold in the majority3 module when a=0, b=1, c=1?',
          code: 'assign y = (a & b) | (b & c) | (a & c);',
          options: ['0', '1', 'x', 'z'],
          answer: '1',
          explanation: 'The middle term b & c = 1 & 1 = 1, so the OR yields 1.',
          hint: 'Find any single AND term that is 1.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What one word names the RTL-to-gates compilation step?',
          answer: 'synthesis',
          explanation:
            'Synthesis translates RTL into a netlist of gates; later steps handle placement, routing and timing verification.',
          hint: 'The hardware compiler\'s name.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'RTL', definition: 'Register-transfer level: a hardware description stating what data transfers occur between registers on each clock edge.' },
      { term: 'HDL', definition: 'Hardware description language (e.g. Verilog): text that describes concurrent hardware structure and behavior.' },
      { term: 'Synthesis', definition: 'The toolchain step that compiles RTL into a gate-level netlist.' },
      { term: 'Netlist', definition: 'A concrete list of gates (and their connections) implementing a design.' },
      { term: 'Continuous assignment', definition: 'Verilog `assign`: a permanent connection that keeps a wire driven by an expression as its inputs change.' },
      { term: 'Concurrent', definition: 'Executing/happening at the same time; hardware blocks all act concurrently, unlike sequential software steps.' },
    ],
    revisionSummary: [
      'Abstraction ladder: transistors -> gates -> blocks -> RTL -> system.',
      'Verilog describes hardware: wires, ports and modules, all acting concurrently — never a step-by-step script.',
      '`assign` = a wire continuously driven by an expression; `&`, `|`, `^`, `~` map directly onto gates.',
      'Synthesis compiles RTL to a netlist; timing rules (Module 8) decide whether the result meets its clock.',
      'Clean RTL comes from clean fundamentals: complete truth tables, one driver per wire, explicit resets.',
      'This course and the Verilog course are one continuous ladder — the vocabulary is shared by design.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Hardware description language', url: 'https://en.wikipedia.org/wiki/Hardware_description_language', kind: 'article' },
      { label: 'Wikipedia — Register-transfer level', url: 'https://en.wikipedia.org/wiki/Register-transfer_level', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
