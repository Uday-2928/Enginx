import type { TutorialLesson } from '../types';

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'embc-m02-l1',
    title: 'Fixed-Width Types and Signed Pitfalls',
    summary:
      'Why embedded code uses uint8_t/int32_t instead of int, how unsigned arithmetic wraps, and the classic signed/unsigned comparison bugs that bite firmware.',
    objectives: [
      'Choose the correct fixed-width type from <stdint.h> for a register, a counter and a sensor value.',
      'Predict exactly what happens when unsigned arithmetic wraps at zero or the maximum.',
      'Explain the implicit conversion rules that make a signed/unsigned comparison go wrong.',
      'Explain why the width of int itself is unreliable across MCUs.',
    ],
    whyItMatters:
      'On a desktop an off-by-one extra byte is a crashed tab; on an MCU it is a corrupted register write or a silent wraparound that fires once a month. Every register is a fixed width, every timer counter has a maximum, and a wrong type choice is one of the top three sources of real firmware bugs.',
    prerequisites: ['embc-m01-l1', 'embc-m01-l3'],
    explanation:
      'The type `int` is defined by C to be the *natural* width of the machine — 16 bits on an AVR, 32 bits on a Cortex-M, 64 bits on a desktop. That portability trap is why embedded C almost always uses the fixed-width types from `<stdint.h>`: `uint8_t`, `int16_t`, `uint32_t`, and so on. When you write `uint32_t`, every compiler on every target gives you exactly 32 unsigned bits.\n\n### Match the type to the hardware\n\nA register is 8, 16 or 32 bits wide — model it with exactly that width. A timer counter that overflows at 65535 must be `uint16_t` if you want the overflow behaviour to be visible and correct. A sensor count that fits in one byte wastes half your RAM as an `int`. Choosing the hardware-matching type is not pedantry; it is how the arithmetic itself stays correct.\n\n### Unsigned arithmetic is a clock\n\nUnsigned types follow modular arithmetic with a strict guarantee: the result is reduced modulo 2^N. So `uint8_t` arithmetic wraps 255 + 1 = 0, and 0 - 1 = 255. This is *defined* behaviour — unlike signed overflow, which is undefined. The wrap is sometimes useful (hashes, ring-buffer indices) and sometimes fatal (a countdown timer that skips past zero into 255). You must be able to trace it by eye.\n\n### The signed/unsigned comparison trap\n\nWhen a signed and an unsigned value meet in an expression, C converts the signed operand to unsigned first. A negative number then becomes a huge positive one: -1 becomes 4294967295 in 32 bits. A check like `if (length < LIMIT)` where `length` is `int32_t` holding -1 (a common "error" sentinel) silently evaluates `4294967295 < LIMIT` — false — and the error path never runs. This single rule causes countless production bugs, which is why `int` is signed and registers are unsigned and never the two shall meet without a cast.',
    deepDive:
      '### Why AVR programmers feel this hardest\n\nOn an 8-bit AVR, `int` is 16 bits: a loop counting to 100000 overflows immediately and a `uint32_t` multiply pulls in library code. Programmers who learned on 32-bit targets get bitten twice when they move: first by assuming `int` is 32 bits, then by assuming the compiler will optimise wider math for free. The lesson: fixed-width types everywhere, and know your target\'s word size.\n\n### char is a trap of its own\n\nPlain `char` has an implementation-defined signedness: signed on x86, unsigned by default on most ARM compilers. Code like `char c = uart_read(); if (c < 0)` behaves differently per target. Embedded style reserves `char` for actual text characters and uses `uint8_t` for raw bytes. If you must mean "signed small number", say `int8_t`.\n\n### Wrapping on purpose: the ring-buffer trick\n\nThe modular nature of unsigned types is a feature when you design for it. Later in this course, ring-buffer indices deliberately use unsigned types and modular arithmetic (`(head + 1) % SIZE`) so the "clock" of the type does the bookkeeping. You will see the same trick in software tick counters that run for years: they are allowed to wrap because every comparison is written as a *difference*, which stays correct across the wrap. That idiom appears in the timer module.',
    examples: [
      {
        title: 'Watching unsigned wraparound happen',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t small = 250u;\n\n    for (int i = 0; i < 8; i++) {\n        small = (uint8_t)(small + 1u);\n        printf("step %d: %u\\n", i, (unsigned)small);\n    }\n    return 0;\n}',
        explanation: [
          '`small` is `uint8_t`, so every value is taken modulo 256 — a hardware register width in miniature.',
          'The cast `(uint8_t)(small + 1u)` makes the wrap explicit: `small + 1u` is computed as int, then deliberately reduced back to 8 bits.',
          'Trace: 250+1=251, 252, 253, 254, 255, then 255+1 wraps to 0, then 1, 2.',
          'Exact output: `step 0: 251` / `step 1: 252` / `step 2: 253` / `step 3: 254` / `step 4: 255` / `step 5: 0` / `step 6: 1` / `step 7: 2`.',
          'On real hardware the same effect silently converts a "count down from 3" sequencer into a 255-step hang if the type or comparison is wrong.',
        ],
      },
      {
        title: 'The signed/unsigned comparison that hides an error',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    int32_t  received = -1;    /* convention: -1 means "read error" */\n    uint32_t limit    = 10u;\n\n    if (received < limit) {\n        printf("accepted value %d\\n", received);\n    } else {\n        printf("rejected (error path)\\n");\n    }\n\n    /* What the comparison really used: */\n    printf("received as unsigned = %u\\n", (unsigned)received);\n    return 0;\n}',
        explanation: [
          'In `received < limit`, C converts `received` (int32_t) to `unsigned` to match `limit`, because mixed signed/unsigned comparisons promote to unsigned.',
          'The bit pattern of -1 becomes 0xFFFFFFFF = 4294967295 — a *defined* conversion (modulo 2^32), not undefined behaviour.',
          'So the condition is `4294967295 < 10` → false, and the error branch runs. Output: `rejected (error path)`.',
          'The final print confirms the mechanics: `received as unsigned = 4294967295`.',
          'Fixes: keep the sentinel in the same type (`int32_t limit = -1` would compare signed), or reject negatives explicitly with `(received < 0)` before any unsigned involvement.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Unsigned wraparound as a circle',
        content:
          '            0\n        +-------+\n    255 |       | 1\n        |  uint |\n        |  8_t  |\n    254 |       | 2\n        +-------+\n           ...\n\n  going up:  253 -> 254 -> 255 -> 0   (255 + 1 wraps to 0)\n  going down:  3 -> 2 -> 1 -> 0 -> 255 (0 - 1 wraps to 255)',
        caption:
          'Unsigned types form a closed ring of 2^N values. Every arithmetic step is well defined; the danger is only in forgetting the ring has no ends.',
      },
    ],
    tables: [
      {
        caption: 'Fixed-width integer types (from <stdint.h>)',
        headers: ['Type', 'Width', 'Range', 'Typical embedded use'],
        rows: [
          ['uint8_t', '8 bits', '0 .. 255', 'Registers, raw bytes, small flags'],
          ['int8_t', '8 bits', '-128 .. 127', 'Small signed deltas'],
          ['uint16_t', '16 bits', '0 .. 65535', '16-bit timer counters, ADC samples'],
          ['int16_t', '16 bits', '-32768 .. 32767', 'Signed sensor values'],
          ['uint32_t', '32 bits', '0 .. 4294967295', '32-bit registers, microsecond ticks'],
          ['int32_t', '32 bits', '-2147483648 .. 2147483647', 'Signed math with headroom'],
        ],
      },
      {
        caption: 'Width of int by common target',
        headers: ['Target', 'int width', 'Consequence'],
        rows: [
          ['ATmega328P (AVR)', '16 bits', 'int overflows past 32767; 32-bit math is slow'],
          ['STM32 (Cortex-M)', '32 bits', 'int is comfortable; still prefer fixed widths for registers'],
          ['Host PC (x86-64)', '32 bits', 'int stays 32 bits even on 64-bit systems'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using plain int/long for register-sized values.',
        fix:
          'Use the <stdint.h> fixed-width types. int changes width per target (16-bit on AVR); registers do not. Reserve int for loop counters that cannot overflow.',
      },
      {
        mistake: 'Looping with an unsigned countdown: `for (uint8_t i = 10; i >= 0; i--)`.',
        fix:
          'An unsigned value is always >= 0, so this never ends: after i = 0 the decrement wraps to 255. Count up to `i < 10`, or use a signed index if you must count down through zero.',
      },
      {
        mistake: 'Storing a "no data" sentinel of -1 in an unsigned variable and comparing it later.',
        fix:
          'The -1 becomes a huge unsigned value. Use the same type for sentinel and value, or use a separate status/error return instead of magic values in unsigned data.',
      },
    ],
    guidedPractice: {
      title: 'Trace wraparound and a mixed comparison',
      brief:
        'Without running code: (a) start at uint8_t x = 4 and subtract 1 ten times — what are the values seen, and what does x finish as? (b) Given `int16_t delta = -2; uint16_t budget = 5;` what boolean does `delta < budget` evaluate to after the implicit conversion, and to what values?',
      expectedBehavior:
        '(a) 4->3->2->1->0->255->254->253->252->251->250, finishing at 250. (b) delta converts from -2 to 65534 in 16-bit unsigned, so 65534 < 5 is false. Both traces demonstrate the closed ring and the promotion rule.',
      hints: [
        'Draw the 0..255 circle from the diagram and walk it.',
        'For (b), negate: -2 in two\'s complement 16-bit is 0xFFFE = 65534.',
      ],
    },
    practiceExercises: [
      {
        title: 'Pick the types',
        brief:
          'Choose a type for each, with a one-line justification: (1) a 12-bit ADC result register, (2) a temperature reading from -40 to +125 degrees, (3) a microsecond tick counter expected to run for hours, (4) an I2C device byte address.',
        expectedBehavior:
          '(1) uint16_t — raw counts 0..4095 fit and match the register width. (2) int16_t — signed small range. (3) uint32_t — 4294967295 microseconds is about 71 minutes; hours need either a 64-bit tick or a wrapping-difference design (module 05). (4) uint8_t — one bus byte.',
        hints: [
          'Ask: can the value be negative? What is the true hardware range?',
          'For (3), check 2^32 microseconds against 1 hour = 3.6e9 microseconds.',
        ],
      },
      {
        title: 'Fix the broken loop',
        brief:
          'Rewrite `for (uint8_t i = 10; i >= 0; i--) { process(i); }` so it calls process(10) down to process(0) exactly once each, and explain why the original never stops.',
        expectedBehavior:
          'A correct form is `for (int i = 10; i >= 0; i--)` or `for (uint8_t i = 10; i > 0; ) { i--; process(i); }` with care. The original never terminates because unsigned i is always >= 0 and wraps 0 -> 255 after the body runs at 0.',
        hints: [
          'The condition `i >= 0` on unsigned is always true.',
          'Two standard fixes: signed counter, or restructure the test around `i > 0`.',
        ],
      },
    ],
    assessment: {
      title: 'Fixed-width types checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'After `uint8_t x = 200; x = (uint8_t)(x + 100);` what is x?',
          options: ['44', '300', '0', '255'],
          answer: '44',
          explanation:
            '200 + 100 = 300; reduced modulo 256 gives 300 - 256 = 44. Unsigned 8-bit arithmetic is defined to wrap.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In `if (a < b)` with `int32_t a = -1; uint32_t b = 5;`, which comparison actually executes?',
          options: [
            '4294967295 < 5',
            '-1 < 5',
            'undefined behaviour',
            'compiler error',
          ],
          answer: '4294967295 < 5',
          explanation:
            'Mixed signed/unsigned comparisons convert the signed operand to unsigned first; -1 becomes 0xFFFFFFFF, so the condition is false.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'The width of int is guaranteed to be 32 bits on every C platform.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'int is the natural machine width — 16 bits on AVR, 32 bits on Cortex-M and desktops. Only stdint.h types guarantee widths.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does this print?',
          code: 'uint8_t t = 5u;\nt = (uint8_t)(t - 10u);\nprintf("%u\\n", (unsigned)t);',
          options: ['251', '0', '255', 'undefined behaviour'],
          answer: '251',
          explanation:
            '5 - 10 in 8-bit modular arithmetic wraps to 5 - 10 + 256 = 251. The wrap is defined for unsigned types.',
          hint: 'Add 256 to the negative result.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt: 'A firmware read routine returns -1 on timeout and stores into `uint32_t data`. The caller checks `if (data < 0)`. What is the bug?',
          options: [
            'The comparison is always false: an unsigned value can never be negative',
            'Nothing is wrong',
            'uint32_t cannot store -1',
            'The check should be data > 0',
          ],
          answer: 'The comparison is always false: an unsigned value can never be negative',
          explanation:
            'A compiler may warn about it; at runtime the test is dead code. Sentinels and their checks must live in the same signedness — or better, use a separate error status.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Fixed-width type', definition: 'A stdint.h type such as uint16_t with an exactly guaranteed bit width across platforms.' },
      { term: 'Modular (wraparound) arithmetic', definition: 'Unsigned arithmetic reduced modulo 2^N: results wrap at the type\'s limits, always defined.' },
      { term: 'Usual arithmetic conversions', definition: 'The C rule set that decides a common type for mixed operands — including promoting signed to unsigned in mixed comparisons.' },
      { term: 'Implementation-defined', definition: 'Behaviour each compiler must document but may differ on, such as the signedness of plain char.' },
    ],
    revisionSummary: [
      'Use uint8_t/uint16_t/uint32_t from <stdint.h>; int changes width per target.',
      'Unsigned math wraps (defined); signed overflow is undefined.',
      'Mixed signed/unsigned comparisons convert the signed side to unsigned: -1 becomes huge.',
      'Unsigned loops that test >= 0 never terminate.',
      'char is for text; bytes and registers are uint8_t.',
    ],
    furtherReading: [
      { label: 'cppreference — fixed-width integer types', url: 'https://en.cppreference.com/w/c/types/integer', kind: 'docs' },
      { label: 'Wikipedia — C data types', url: 'https://en.wikipedia.org/wiki/C_data_types', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'embc-m02-l2',
    title: 'Bitwise Operations for Hardware',
    summary:
      'Master &, |, ^, ~, << and >> as the core toolkit for registers: building masks, setting, clearing, toggling, extracting and inserting bit fields.',
    objectives: [
      'Predict the result of any single bitwise operation on a byte, by hand, in binary.',
      'Build masks with shifts (1u << n) and combine them for multi-bit fields.',
      'Extract a bit field from a register and insert a new field value without disturbing neighbours.',
      'Recognise when to use & (test/extract) versus | (set/combine) versus ^ (toggle).',
    ],
    whyItMatters:
      'Hardware configuration is a bit-packing exercise: one 32-bit register may hold a dozen independent settings. Every driver you will ever write is built from the six operations in this lesson, and interviewers test them directly. Fluency here — doing 0x53 ^ 0x20 in your head — is what makes the register modules fast.',
    prerequisites: ['embc-m02-l1'],
    explanation:
      'C gives you six operators that act on every bit of an integer at once. They map one-to-one onto the logic gates from digital electronics, which is no accident: registers *are* collections of flip-flops.\n\n### The six operators\n\n- `a & b` — AND per bit: 1 only where *both* are 1. Used to **test** and to **extract** (mask off what you do not want).\n- `a | b` — OR per bit: 1 where *either* is 1. Used to **set** bits and to **combine** fields.\n- `a ^ b` — XOR per bit: 1 where they **differ**. Used to **toggle** bits and to compare.\n- `~a` — NOT per bit: flips every bit. Used to build "all bits except..." masks.\n- `a << n` — shift left: each bit moves up n places, zeros fill in from the right. Multiplies by 2^n (unsigned).\n- `a >> n` — shift right: each bit moves down; for unsigned types zeros fill from the left.\n\n### Masks: patterns that select bits\n\nA **mask** is a constant with 1s exactly on the bits you care about. `0x08` selects bit 3. `(uint8_t)(1u << 5)` also selects bit 5 but *documents the bit number*, which is why firmware writes masks as shifts of 1. For multi-bit fields, build the mask from a small all-ones pattern shifted into place: a 3-bit-wide field starting at bit 4 has mask `(uint8_t)(0x7u << 4)` = 0x70.\n\n### The five fundamental register idioms\n\nFor a register `reg` and mask `m`:\n- Test: `if (reg & m)` — true if *any* masked bit is set.\n- Extract: `value = (reg & m) >> shift;`\n- Set: `reg |= m;`\n- Clear: `reg &= (uint8_t)~m;` — the ~ flips the mask so 0s land on the bits to clear.\n- Toggle: `reg ^= m;`\n\nThese five lines are the skeleton of every peripheral driver in this course. Note the asymmetry: you can only *test* with `&`; `|` cannot read a bit back because OR cannot turn a 1 off.',
    deepDive:
      '### Doing it in binary by hand\n\nSpeed comes from writing bytes as two hex digits — each hex digit is exactly four bits. 0x53 is `0101 0011`, so "bit 6" is the second-highest bit (1), and bit 0 is the rightmost (1). When an operation is unclear, expand both operands into 8 binary digits, apply the gate column by column, and re-pack. Practise until `0x53 | 0x08` instantly reads as "set bit 3" giving 0x5B.\n\n### Field insert: the read-modify-write pattern in miniature\n\nSetting a *field* (several bits with a numeric meaning, e.g. a 3-bit mode selector) needs care that single bits do not. You cannot OR the new value in if any old bits are set — OR can only add 1s. The sequence is: mask the field to zero (`reg &= ~FIELD_MASK`), then OR the shifted new value (`reg |= (new << SHIFT)`). This is a **read-modify-write**: it reads the register, modifies it in the C variable world, and writes it back. Module 03 shows why that sequence needs `volatile` and why it can race with interrupts.\n\n### Shift safety and width\n\nShifting by an amount >= the type\'s width is undefined behaviour, and `1 << 31` on a 32-bit signed int is already dangerous (it overflows into the sign bit). The embedded habit is to shift *unsigned* literals — `1u`, `0x7u` — and cast the result back down to the register width. `1u << 31` is perfectly fine; `1 << 31` is not.',
    examples: [
      {
        title: 'All five idioms on one status byte, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t status = 0x53;                 /* binary 0101 0011 */\n\n    uint8_t bit0 = (uint8_t)(status & 0x01u);\n    uint8_t bit6 = (uint8_t)((status >> 6) & 0x01u);\n    uint8_t set3 = (uint8_t)(status | 0x08u);\n    uint8_t clr1 = (uint8_t)(status & (uint8_t)~0x02u);\n    uint8_t tgl5 = (uint8_t)(status ^ 0x20u);\n\n    printf("status    = 0x%02X\\n", (unsigned)status);\n    printf("bit0      = %u\\n",  (unsigned)bit0);\n    printf("bit6      = %u\\n",  (unsigned)bit6);\n    printf("set bit3  = 0x%02X\\n", (unsigned)set3);\n    printf("clr bit1  = 0x%02X\\n", (unsigned)clr1);\n    printf("tgl bit5  = 0x%02X\\n", (unsigned)tgl5);\n    return 0;\n}',
        explanation: [
          '`status = 0x53` = binary 0101 0011; every result below can be checked column by column in binary.',
          'Test: `0x53 & 0x01` = 1, so bit0 is set. Extract bit 6 by shifting it down first: `0x53 >> 6` = 01, `& 1` = 1.',
          'Set bit 3: 0101 0011 | 0000 1000 = 0101 1011 = 0x5B. OR can only add 1s.',
          'Clear bit 1: `~0x02` in 8 bits is 1111 1101 (0xFD); 0101 0011 & 1111 1101 = 0101 0001 = 0x51.',
          'Toggle bit 5: 0101 0011 ^ 0010 0000 = 0111 0011 = 0x73.',
          'Exact output: `status    = 0x53` / `bit0      = 1` / `bit6      = 1` / `set bit3  = 0x5B` / `clr bit1  = 0x51` / `tgl bit5  = 0x73`.',
        ],
      },
      {
        title: 'Extracting and inserting a 3-bit mode field',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n#define MODE_SHIFT 4u                        /* field starts at bit 4 */\n#define MODE_WIDTH 3u                        /* field is 3 bits wide  */\n#define MODE_MASK  ((uint8_t)(0x7u << MODE_SHIFT)) /* 0111 0000 */\n\nint main(void) {\n    uint8_t config = 0xD4;               /* 1101 0100 */\n\n    /* Extract: mask the field, slide it down to bit 0. */\n    uint8_t mode = (uint8_t)((config & MODE_MASK) >> MODE_SHIFT);\n\n    /* Insert mode = 2 without disturbing neighbouring bits. */\n    config = (uint8_t)(config & (uint8_t)~MODE_MASK);  /* clear field  */\n    config = (uint8_t)(config | (0x2u << MODE_SHIFT)); /* set new value */\n\n    printf("mode read = %u\\n", (unsigned)mode);\n    printf("config now = 0x%02X\\n", (unsigned)config);\n    return 0;\n}',
        explanation: [
          'MODE_MASK = 0x7 << 4 = 0111 0000 = 0x70 — the 3-bit field at bits 4..6.',
          'Extract: 0xD4 & 0x70 = 0101 0000 = 0x50; >> 4 gives 5. So the stored mode is 5.',
          'Insert step 1 (clear field): ~0x70 in 8 bits = 1000 1111 = 0x8F; 0xD4 & 0x8F = 1000 0100 = 0x84.',
          'Insert step 2 (write new): 0x2 << 4 = 0x20; 0x84 | 0x20 = 1010 0100 = 0xA4.',
          'Exact output: `mode read = 5` then `config now = 0xA4`. The clear-then-OR pair is the field-insert idiom; OR alone would corrupt the field if any old bits were set.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Bit numbering and a field inside a byte',
        content:
          '   bit:    7  6  5  4  3  2  1  0\n          +-----------------------+\n   0xD4 = | 1| 1| 0| 1| 0| 1| 0| 0 |\n          +-----------------------+\n             \\____ _____/\n                  V\n        MODE field = bits 6..4 (3 bits wide)\n\n   mask for the field:      0111 0000 = 0x70\n   field value (raw):       0xD4 & 0x70 = 0x50\n   field value (shifted):   0x50 >> 4   = 5',
        caption:
          'Bit 0 is the least-significant bit. A "field" is a group of bits with a numeric meaning; it always needs mask + shift to read, and clear + OR to write.',
      },
    ],
    tables: [
      {
        caption: 'Bitwise operator quick reference (a = 0xF0, b = 0x3C)',
        headers: ['Operator', 'Name', 'Per-bit rule', 'Example (8-bit)', 'Result'],
        rows: [
          ['a & b', 'AND', '1 only if both 1', '1111 0000 & 0011 1100', '0x30'],
          ['a | b', 'OR', '1 if either 1', '1111 0000 | 0011 1100', '0xFC'],
          ['a ^ b', 'XOR', '1 if different', '1111 0000 ^ 0011 1100', '0xCC'],
          ['~a', 'NOT', 'flip all bits (8-bit view)', '~1111 0000', '0x0F'],
          ['a << 2', 'shift left', 'move up, zero-fill', '1111 0000 << 2', '0xC0 (bits lost off top)'],
          ['a >> 2', 'shift right', 'move down, zero-fill (unsigned)', '1111 0000 >> 2', '0x3C'],
        ],
      },
      {
        caption: 'The five register idioms',
        headers: ['Operation', 'C code', 'Note'],
        rows: [
          ['Test bit(s)', 'if (reg & mask)', 'True if any masked bit is 1'],
          ['Extract field', 'v = (reg & mask) >> shift', 'Mask first, then slide to bit 0'],
          ['Set bit(s)', 'reg |= mask', 'OR can only add 1s'],
          ['Clear bit(s)', 'reg &= ~mask', 'Invert the mask so 0s land on target bits'],
          ['Toggle bit(s)', 'reg ^= mask', 'Flips exactly the masked bits'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using logical && and || instead of bitwise & and | on registers.',
        fix:
          '&& treats each operand as "zero or non-zero" and returns 0 or 1 — it loses every bit except one. Masks and registers always use the single-character operators & and |.',
      },
      {
        mistake: 'Trying to clear a bit with OR, or set a bit with AND.',
        fix:
          'OR can only turn 1s on and AND can only turn 1s off. Clearing needs reg &= ~mask; setting needs reg |= mask. If the code does not invert the mask for clearing, it is wrong.',
      },
      {
        mistake: 'Shifting 1 (signed int) by 31: `1 << 31`, or shifting by more than the width.',
        fix:
          '1 is a signed int and 1 << 31 overflows it (undefined behaviour). Shift unsigned literals: `1u << 31` is fine. Also never shift by an amount >= the target width — that is undefined regardless of type.',
      },
    ],
    guidedPractice: {
      title: 'Hand-trace a register sequence',
      brief:
        'A register starts at 0x00. Apply, in order: set bit 0 and bit 3; clear bit 0; toggle bit 1; set bits 6 and 7. Write the value after each step in hex AND binary, then state the final value.',
      expectedBehavior:
        'After set b0,b3: 0x09 (0000 1001). Clear b0: 0x08. Toggle b1: 0x0A (0000 1010). Set b6,b7: 0xCA (1100 1010). Final value 0xCA.',
      hints: [
        'Two bits can be set in one operation by OR-ing their masks: 0x01 | 0x08 = 0x09.',
        'Verify each step in binary before moving on.',
      ],
    },
    practiceExercises: [
      {
        title: 'Field surgery',
        brief:
          'A register = 0xC7 holds a 2-bit SPEED field at bits 5..4 (rest is other settings). Read the field value, then change it to 3 and give the final register value. Do it by hand, then check by writing the C using the insert idiom.',
        expectedBehavior:
          'Read: 0xC7 = 1100 0111; & 0x30 (0011 0000) = 0000 0000, so the field value is 0. Insert 3: clear the field (0xC7 & ~0x30 = 0xC7 & 0xCF = 0xC7 — unchanged since the field bits were already 0), then OR the new value (0x3 << 4 = 0x30) giving 0xF7. Final register 0xF7.',
        hints: [
          '0xC7 in binary is 1100 0111 — look at bits 5..4 first.',
          'The clear step is a no-op when the field already reads zero; the OR still does the work.',
        ],
      },
      {
        title: 'Swap without a temporary',
        brief:
          'The XOR-swap trick exchanges two variables: `a ^= b; b ^= a; a ^= b;`. Trace it for a = 0x0F, b = 0xF0 and confirm both swap. Then explain in one sentence why XOR-swap is still a bad idea in real code (hint: three writes instead of one assignment, and it breaks if both names are the same object).',
        expectedBehavior:
          'a ^= b: a = 0xFF. b ^= a: b = 0x0F. a ^= b: a = 0xF0. Values swapped. It is a bad idea: it is harder to read, usually no faster on real compilers, and self-assignment (a ^= a style aliasing) zeroes the value.',
        hints: [
          'Track both binary patterns through the three statements.',
          'Think about what happens if both operands are the same memory location.',
        ],
      },
    ],
    assessment: {
      title: 'Bitwise operations checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does `REG |= (1u << 3);` do to an 8-bit register REG?',
          options: [
            'Sets bit 3 to 1, leaves all other bits unchanged',
            'Clears bit 3',
            'Toggles bit 3',
            'Sets the register to 3',
          ],
          answer: 'Sets bit 3 to 1, leaves all other bits unchanged',
          explanation:
            '1u << 3 builds the mask 0x08; OR-ing it into REG forces bit 3 to 1 and cannot touch other bits because OR with 0 preserves.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What is the final value of r?',
          code: 'uint8_t r = 0x53;\nr = (uint8_t)(r & (uint8_t)~0x02u);\nr = (uint8_t)(r | 0x80u);\n/* r = ? */',
          options: ['0xD1', '0x51', '0xD3', '0x53'],
          answer: '0xD1',
          explanation:
            '0x53 & ~0x02 = 0x53 & 0xFD = 0x51 (bit 1 cleared); 0x51 | 0x80 = 0xD1 (bit 7 set).',
          hint: 'Work in binary: 0101 0011, clear bit 1, then set bit 7.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'A 4-bit field occupies bits 7..4. Which expression reads it as a value 0..15?',
          options: [
            '(reg & 0xF0u) >> 4',
            'reg & 0x0Fu',
            'reg >> 4',
            '(reg >> 4) & 0xF0u',
          ],
          answer: '(reg & 0xF0u) >> 4',
          explanation:
            'Mask with 0xF0 to isolate bits 7..4, then shift right by 4 to normalise the field down to bit 0. Option 3 also happens to work for a field ending at bit 7, but masking first is the safe, general idiom.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Which single operation flips a bit regardless of its current state?',
          options: ['XOR (^=)', 'OR (|=)', 'AND (&=)', 'NOT (~)'],
          answer: 'XOR (^=)',
          explanation:
            'XOR with 1 inverts the bit: 0^1=1, 1^1=0. OR can only set; AND with an inverted mask can only clear.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt: 'This line is meant to clear bit 5: `reg |= 0x20u;`. What is wrong?',
          options: [
            'OR sets the bit; clearing needs reg &= (uint8_t)~0x20u',
            'Nothing, OR clears bits too',
            '0x20 is bit 4, not bit 5',
            'It must be reg ^= 0x20u to clear',
          ],
          answer: 'OR sets the bit; clearing needs reg &= (uint8_t)~0x20u',
          explanation:
            'OR can never turn a 1 off. The clear idiom ANDs with the inverted mask so zeros land on bit 5 and 1s preserve everything else. (XOR would toggle, which is wrong when the bit is already 0.)',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Mask', definition: 'A constant whose 1-bits mark the bits of interest in a register; built from shifts like (1u << n).' },
      { term: 'Read-modify-write', definition: 'Reading a register, changing bits in software, and writing it back — required for changing part of a register.' },
      { term: 'Bit field', definition: 'A multi-bit group inside a register with a numeric meaning, accessed with mask plus shift.' },
      { term: 'Toggle', definition: 'Inverting one or more bits with XOR so their state flips on every operation.' },
    ],
    revisionSummary: [
      '& tests/extracts, | sets/combines, ^ toggles, ~ inverts masks, << >> position bits.',
      'Test with &: OR can never read or clear a bit.',
      'Clear = AND with inverted mask: reg &= ~mask.',
      'Field insert = clear field, then OR the shifted value.',
      'Shift unsigned literals; never shift by >= the type width.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Bitwise operations in C', url: 'https://en.wikipedia.org/wiki/Bitwise_operations_in_C', kind: 'article' },
      { label: 'Wikipedia — Mask (computing)', url: 'https://en.wikipedia.org/wiki/Mask_(computing)', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m02-l3',
    title: 'Volatile, Const and Compiler Realities',
    summary:
      'Introduce volatile — why hardware-visible variables need it, what it does and does not promise — plus const data in flash, the warnings that catch firmware bugs, and undefined behaviour to avoid.',
    objectives: [
      'State what volatile tells the compiler and why hardware-adjacent variables require it.',
      'List what volatile does NOT provide: atomicity, mutual exclusion, memory ordering.',
      'Use const correctly for flash-resident tables and read-only data.',
      'Name the compiler warnings that catch embedded bugs and the undefined behaviours to avoid.',
    ],
    whyItMatters:
      'volatile is the single most misunderstood keyword in embedded C. Omit it and your polling loops may hang at -O2; sprinkle it everywhere and you slow every access and hide real bugs. Worse, developers who believe volatile makes code "thread-safe" ship race conditions. This lesson installs the correct mental model early; module 03 deepens it at the register level.',
    prerequisites: ['embc-m02-l1', 'embc-m02-l2'],
    explanation:
      'The `volatile` qualifier is an instruction *to the compiler*: "every read and write of this variable is externally visible — do not cache, do not elide, do not reorder it relative to other volatile accesses." Hardware changes memory behind the compiler\'s back (interrupt handlers, peripherals, other cores), so any variable that hardware or an ISR touches must be declared volatile.\n\n### Why the compiler needs telling\n\nA C compiler assumes single-threaded semantics: if your code writes `flag = 0` and then spins on `while (flag == 0)`, the compiler reasons that nothing in between can change `flag`, and may rewrite the loop into `if (flag == 0) for(;;);` — an infinite loop that never re-reads memory. With `-O0` you will not see this; with `-O2` on real cross-compilers you will. Declaring `flag` as `volatile uint8_t` forces every iteration to perform an actual memory read.\n\n### What volatile does NOT do\n\nThis is the part people get wrong. volatile does **not** make access atomic — a volatile 16-bit read on an 8-bit CPU still happens as two byte reads that an interrupt can split. It does **not** provide mutual exclusion — two contexts can still interleave their read-modify-writes. It does **not** order non-volatile memory accesses around it. Those guarantees come from atomic instructions, critical sections and memory barriers — treated properly in the interrupts module. The one-line summary: volatile prevents *the compiler* from breaking your code; it does nothing about *the hardware or concurrency* doing so.\n\n### const and where it lives\n\n`const` data is read-only by contract, and on MCUs the linker places it in flash alongside the code — saving precious SRAM. Font tables, lookup tables and message strings should be `static const`. Combine qualifiers freely: `const volatile uint32_t STATUS_REG` is meaningful on real hardware — "you must not write it, but the hardware changes it" (a read-only status register).\n\n### Compiler realities\n\nEmbedded code should build warning-clean with `-Wall -Wextra`, ideally `-Werror` so warnings block the build. Implicit conversions between signed/unsigned, unused results, missing return values and uninitialized variables are all caught by warnings before they become field failures. And treat **undefined behaviour** (UB) as radioactive: signed overflow, out-of-bounds arrays, wild pointer dereferences, shifting by >= the type width, and reading uninitialized locals. Optimizers legally assume UB never happens and may delete entire code paths that "prove" it.',
    deepDive:
      '### When is volatile required?\n\nThree cases, all with the same shape — the variable is changed or read outside the flow of the code that is looking at it: (1) a variable shared with an **interrupt service routine** (the ISR sets a flag the main loop polls); (2) a **memory-mapped register** (a peripheral changes its status register between your reads); (3) a variable shared with **another execution context** (RTOS task, DMA writing a buffer — with caveats about ordering, covered later). If a variable is touched *only* inside one function call chain, volatile is pure overhead — most locals and non-shared globals do not need it.\n\n### volatile and sequencing, honestly\n\nC guarantees that volatile accesses happen in program order *relative to each other* — volatile-to-volatile ordering is stable. But the compiler may still move *non-volatile* accesses across a volatile one, and modern CPUs (and some bus systems) may reorder at runtime. So `data = buffer;` followed by `ready = 1;` (both non-volatile / hardware-shared) is NOT a safe handoff pattern without barriers or the platform\'s ordering rules. This is exactly why module 06 uses critical sections and module 14 discusses DMA cache coherency: because volatile alone cannot carry those guarantees.\n\n### Reading warnings like a firmware engineer\n\nTurn on `-Wall -Wextra` and read every warning as a possible field failure: "comparison of signed and unsigned" is the module-02-l1 trap; "unused variable" is often an unfinished init sequence; "missing initializer" hides a register you forgot to configure; "suggest parentheses" frequently marks a real precedence bug like `x & 3 == 1` (which parses as `x & (3 == 1)`). Fix causes, not symptoms — never silence a warning with a cast you have not justified.',
    examples: [
      {
        title: 'A volatile flag polled by main, set "by an interrupt"',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of a hardware event flag. On a real MCU this is\n * set inside a timer ISR; the ISR would be declared per vendor docs. */\nstatic volatile uint8_t event_flag = 0u;\n\nstatic void simulated_timer_isr(void) {\n    event_flag = 1u;              /* what the real ISR would do */\n}\n\nint main(void) {\n    uint32_t spins = 0u;\n\n    simulated_timer_isr();        /* pretend the interrupt just fired */\n\n    while (event_flag == 0u) {    /* volatile forces a real re-read     */\n        spins++;\n    }\n    printf("flag seen after %u spins\\n", (unsigned)spins);\n    return 0;\n}',
        explanation: [
          '`event_flag` is `volatile uint8_t`: main loop and "ISR" are two execution contexts sharing one variable.',
          'Because the flag was already set to 1 before the loop, the condition is false on first check: the loop body never runs, `spins` stays 0.',
          'Exact output: `flag seen after 0 spins`.',
          'The volatile qualifier matters for the *other* ordering: had the interrupt fired after the loop started, without volatile an optimizing compiler could legally never re-read the flag and the loop would spin forever. With volatile, each check is a genuine memory read.',
          'Honesty note: on this host example the compiler cannot actually observe an ISR, so this demonstrates the required *pattern*; the hang it prevents happens on real cross-compiled firmware at -O2.',
        ],
      },
      {
        title: 'const tables live in flash — and defensive bounds checks',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* 7-segment patterns for digits 0..9, common-cathode encoding.\n * static const => placed in flash, zero SRAM cost. */\nstatic const uint8_t seven_seg_digits[10] = {\n    0x3Fu, 0x06u, 0x5Bu, 0x4Fu, 0x66u,\n    0x6Du, 0x7Du, 0x07u, 0x7Fu, 0x6Fu\n};\n\n#define SEG_DASH 0x40u /* just the middle segment: for invalid input */\n\nstatic uint8_t seg_for_digit(uint8_t digit) {\n    if (digit > 9u) {\n        return (uint8_t)SEG_DASH;  /* defensive: reject bad input */\n    }\n    return seven_seg_digits[digit];\n}\n\nint main(void) {\n    printf("digit 3 -> 0x%02X\\n", (unsigned)seg_for_digit(3u));\n    printf("digit 8 -> 0x%02X\\n", (unsigned)seg_for_digit(8u));\n    printf("digit 12 -> 0x%02X\\n", (unsigned)seg_for_digit(12u));\n    return 0;\n}',
        explanation: [
          'The lookup table is `static const`: the compiler places it in flash (.rodata), so it costs no SRAM — a real budget win on a 2 KB part.',
          'The bounds check before indexing is the defensive habit: an unvalidated digit of 12 would otherwise read past the array — undefined behaviour.',
          'Traces: seg_for_digit(3) = 0x4F, seg_for_digit(8) = 0x7F, seg_for_digit(12) hits the guard and returns 0x40.',
          'Exact output: `digit 3 -> 0x4F` / `digit 8 -> 0x7F` / `digit 12 -> 0x40`.',
          'Patterns like this are exactly what flash is good for: immutable data the program reads in place.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'What volatile changes in an optimizing compiler',
        content:
          'SOURCE                       WITHOUT volatile (-O2)            WITH volatile\n\nuint8_t flag;   /* shared */  uint8_t flag;                     volatile uint8_t flag;\n\nflag = 0;                     flag = 0;                         flag = 0;\nwhile (flag == 0) {           if (flag == 0) {                  L: if (flag == 0) {\n    spin++;                       for (;;) { }   /* flag never      spin++;\n}                                  }  /* re-read! */       goto L;   /* flag\n                              }                                                  re-read */\n                                                                }\n\nThe compiler assumes nothing else can change flag between reads,\nso it "optimizes" the loop into a hang. volatile forbids that.',
        caption:
          'Educational illustration of compiler reasoning. volatile does not make this safe under concurrency — it only forces real memory accesses.',
      },
    ],
    tables: [
      {
        caption: 'What volatile guarantees and what it does not',
        headers: ['Guarantee?', 'Statement'],
        rows: [
          ['Yes', 'Every source-level read/write issues a real memory access'],
          ['Yes', 'Volatile accesses are not deleted or merged away'],
          ['Yes', 'Volatile accesses execute in program order relative to other volatile accesses'],
          ['No', 'Atomicity: a multi-byte volatile access can still be torn'],
          ['No', 'Mutual exclusion: concurrent read-modify-writes still race'],
          ['No', 'Ordering of NON-volatile accesses around volatile ones'],
          ['No', 'Hardware-level memory barriers or cache coherency'],
        ],
      },
      {
        caption: 'Undefined behaviours embedded code must avoid',
        headers: ['UB', 'Typical firmware form', 'Safe replacement'],
        rows: [
          ['Signed overflow', 'int16 math past 32767 in a filter', 'Wider type or unsigned modular design'],
          ['Out-of-bounds array', 'table[sensor_id] with bad id', 'Bounds check before every index'],
          ['Shift >= width', '1u << 32 on 32-bit int', 'Clamp shift amounts'],
          ['Wild pointer', 'cast of unvalidated address to pointer', 'Only vendor-defined addresses; mocks on host'],
          ['Uninitialized read', 'local counter used before first write', 'Initialize at declaration'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Believing volatile makes a variable "thread-safe" or atomic.',
        fix:
          'volatile only stops the compiler from caching/eliding accesses. For atomicity and mutual exclusion you need critical sections, atomic instructions or RTOS primitives — module 06 covers the mechanics.',
      },
      {
        mistake: 'Marking every variable volatile "to be safe".',
        fix:
          'volatile disables optimizations on every access and can hide genuine sharing bugs by silencing the symptom. Mark exactly the variables that hardware, ISRs or other contexts touch; keep everything else optimizable.',
      },
      {
        mistake: 'Silencing warnings with random casts instead of reading them.',
        fix:
          'Build with -Wall -Wextra (and -Werror in CI). Each warning names a possible field failure: signed/unsigned mix, unused result, missing initializer. Fix the cause; justify any cast you add.',
      },
    ],
    guidedPractice: {
      title: 'Audit a snippet for qualifiers',
      brief:
        'For each variable, state whether it needs volatile, const, both, or neither, and why: (a) a 7-segment font table; (b) a UART status register; (c) a counter incremented in a timer ISR and polled in main; (d) a local loop counter; (e) a read-only hardware ID register that the hardware fixes at the factory.',
      expectedBehavior:
        '(a) const. (b) volatile (hardware changes it). (c) volatile (shared with ISR). (d) neither. (e) const volatile — read-only to software, changing in hardware terms only at manufacture; it must never be cached out of existence.',
      hints: [
        'Ask: who else can change this value besides the code that reads it?',
        'Ask separately: is software allowed to write it?',
      ],
    },
    practiceExercises: [
      {
        title: 'Spot the hang risk',
        brief:
          'This loop waits for hardware: `uint32_t *STATUS = ...; while ((*STATUS & 1u) == 0) {}` — written WITHOUT volatile. Explain precisely what an optimizing compiler may do, what the programmer must add, and why adding volatile to *STATUS is necessary but still not sufficient if a timeout is required.',
        expectedBehavior:
          'At -O2 the compiler may read *STATUS once and spin forever if the bit was 0 (loop condition hoisted). Declaring the pointer volatile (or the pointed-to type) forces a re-read each iteration. But volatile gives no timeout: a stuck peripheral hangs the loop forever — production code pairs the poll with a bounded counter and an error path.',
        hints: [
          'Two separate defects: compiler caching, and unbounded waiting.',
          'Module 07 turns "wait with timeout" into a reusable pattern.',
        ],
      },
      {
        title: 'Rewrite with const where possible',
        brief:
          'This code wastes SRAM: `uint8_t baud_table[4] = {1, 2, 4, 8}; uint8_t msg[] = "READY";`. Declare both so they live in flash, and state which C rule makes the msg version require care (the trailing NUL).',
        expectedBehavior:
          '`static const uint8_t baud_table[4] = {1,2,4,8};` and `static const char msg[] = "READY";` (6 bytes including the NUL terminator). const + static removes them from RAM; string literals implicitly include the terminating NUL byte.',
        hints: [
          'static keeps the name file-local AND avoids an exported symbol.',
          'A string literal of 5 letters occupies 6 bytes.',
        ],
      },
    ],
    assessment: {
      title: 'Volatile and const checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does volatile instruct the compiler to do?',
          options: [
            'Perform every read/write as a real memory access, without caching or eliding',
            'Make all accesses atomic',
            'Prevent interrupts during access',
            'Place the variable in flash',
          ],
          answer: 'Perform every read/write as a real memory access, without caching or eliding',
          explanation:
            'volatile is a compiler-level instruction only. Atomicity, exclusion and barriers need other mechanisms.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A flag is set in a timer ISR and polled in main. Without volatile, what can happen at -O2?',
          options: [
            'The compiler may cache the flag in a register and loop forever',
            'The ISR will not run',
            'The flag becomes atomic',
            'Nothing changes',
          ],
          answer: 'The compiler may cache the flag in a register and loop forever',
          explanation:
            'The optimizer assumes no other context modifies the flag between reads, so it can hoist the read out of the loop — a classic embedded hang.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Declaring a shared variable volatile guarantees that a 32-bit read of it cannot be torn in half by an interrupt.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'volatile says nothing about atomicity. On an 8-bit CPU a 32-bit volatile read is still multiple byte reads; critical sections or atomics are required.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Which placement is correct for a large immutable lookup table on an MCU with tiny RAM?',
          options: [
            'static const, letting the linker keep it in flash',
            'A non-const global in SRAM',
            'A local array built at startup',
            'Declared volatile so it stays fresh',
          ],
          answer: 'static const, letting the linker keep it in flash',
          explanation:
            'const data is read-only and lands in flash (.rodata), preserving SRAM for variables and stack.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt: '`int8_t temp = 100; temp = temp * 2;` — what is the defect class here?',
          options: [
            'Signed overflow: undefined behaviour',
            'Nothing: 200 fits in int8_t',
            'Should be unsigned',
            'Missing volatile',
          ],
          answer: 'Signed overflow: undefined behaviour',
          explanation:
            'int8_t maxes at 127; 200 overflows it. Signed overflow is UB, so the optimizer may assume it never happens and generate surprising code. Use a wider type.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'volatile', definition: 'A qualifier telling the compiler every access is externally visible and must be a real memory access, in order.' },
      { term: 'const', definition: 'A qualifier forbidding software writes; on MCUs it directs data to flash, saving SRAM.' },
      { term: 'Undefined behaviour (UB)', definition: 'Situations with no defined C semantics (signed overflow, bad shifts, out-of-bounds) where optimizers may do anything.' },
      { term: 'Torn access', definition: 'A multi-byte read or write observed half-complete by another context; volatile does not prevent it.' },
    ],
    revisionSummary: [
      'volatile = "no caching, no eliding, real accesses in order" — compiler-level only.',
      'volatile does NOT give atomicity, exclusion or non-volatile ordering.',
      'Mark volatile exactly what ISRs, registers or other contexts touch.',
      'const data lives in flash and costs no SRAM; const volatile suits hardware-set read-only registers.',
      'Build -Wall -Wextra clean; treat UB as deletable code.',
    ],
    furtherReading: [
      { label: 'cppreference — cv (const/volatile) qualifiers', url: 'https://en.cppreference.com/w/c/language/qualifiers', kind: 'docs' },
      { label: 'Wikipedia — Volatile (computer programming)', url: 'https://en.wikipedia.org/wiki/Volatile_(computer_programming)', kind: 'article' },
      { label: 'Wikipedia — Undefined behavior', url: 'https://en.wikipedia.org/wiki/Undefined_behavior', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
