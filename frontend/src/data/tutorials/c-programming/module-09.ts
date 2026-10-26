import type { TutorialLesson } from '../types';

export const module09Lessons: TutorialLesson[] = [
  {
    id: 'cpg-m09-l1',
    title: 'Structures, Nested Structures and typedef',
    summary:
      'Group related fields into structs, nest them into records, name the types with typedef, and pass them by value versus by pointer with open eyes.',
    objectives: [
      'Define struct types with typedef and declare, initialize and access members.',
      'Access nested members with chains of dots and arrows.',
      'Explain what pass-by-value means for a struct argument (a full copy).',
      'Choose by-value or by-pointer passing using size and mutation intent.',
    ],
    whyItMatters:
      'A sensor reading is not one number - it is value, timestamp, unit, quality. Structs turn scattered parallel arrays into coherent records that functions can pass as one unit. In firmware, structs describe DMA descriptors, protocol frames and device state blocks; typedef makes all of it readable.',
    prerequisites: ['cpg-m08-l3', 'cpg-m02-l3'],
    explanation:
      'A **struct** is a programmer-defined type bundling named members:\n\n```\ntypedef struct {\n    uint16_t millivolts;\n    uint8_t  quality;\n} Sample;\n```\n\n`typedef` gives the whole thing a one-word name - `Sample s;` instead of `struct {...} s;` - and firmware style uses it universally. Members are accessed with the **dot**: `s.millivolts = 3300;`. Initializers follow the declaration order: `Sample s = { 3300, 95 };` fills millivolts then quality (C99 also allows designated initializers: `Sample s = { .quality = 95, .millivolts = 3300 };` - order-independent and self-documenting).\n\n### Nesting\n\nA struct member can itself be a struct, building records from records:\n\n```\ntypedef struct {\n    uint32_t seconds;\n    Sample   sample;\n} TimedReading;\n```\n\nAccess chains through: `r.sample.quality`. Each level reads as a path - "the reading\'s sample\'s quality" - which is why well-named structs make drivers nearly self-documenting.\n\n### Pointers and the arrow\n\nThrough a pointer to a struct, `(*p).member` works but is clumsy; C provides the arrow: `p->member` means exactly `(*p).member`. Dot follows a struct; arrow follows a pointer to a struct - the distinction is purely about whether you have the object or its address.\n\n### Passing: value or pointer?\n\nPassing a struct **by value copies every member** into the callee\'s frame - simple and safe for small types (a two-member Sample is cheaper to copy than to alias), wasteful for large ones. Firmware convention: small structs (a few words) by value; anything larger, or anything the function must modify, by pointer - usually `const Record *in` for inputs and `Record *out` for outputs (module 8\'s const rules apply member-for-member).',
    deepDive:
      '### Struct assignment and shallow copies\n\nAssignment (`a = b;`) copies all members byte-for-byte - including nested structs and arrays inside the struct. For plain data that is exactly right; it becomes a trap when a member is a pointer: the copy gets a copy of the *pointer*, so both structs alias the same target (a shallow copy). Firmware structs rarely embed owning pointers - buffers are separate, fixed arrays - so the pitfall is rare in practice, but the rule stands: struct copy duplicates the members it holds, not what they point at.\n\n### Structs as module state\n\nThe largest payoff of structs in firmware is consolidating a module\'s state: instead of ten file-scope globals (`s_speed`, `s_direction`, `s_fault_flags`...), one `static DeviceState g_state;` holds them. Functions take `DeviceState *state` - the dependency is explicit at every call site, two instances of the module become possible (two motors!), and review sees exactly which functions touch state. This is the step from "C with globals" to "C with interfaces", and it costs one typedef.\n\n### Memory layout, briefly (lesson 3 finishes it)\n\nMembers are laid out in declaration order, but the compiler may insert **padding** between them to satisfy each member\'s alignment requirement - a uint32_t member wants a 4-byte-aligned address. So `sizeof(Record)` can exceed the sum of member sizes. Two consequences now: do not compare structs with == (padding bytes may differ between two logically-equal structs - compare member by member), and never serialize a struct by dumping its raw bytes across a wire or into EEPROM unless both sides agree on layout - lesson 3 quantifies why.',
    examples: [
      {
        title: 'A nested sensor record, dot and arrow',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\ntypedef struct {\n    uint16_t millivolts;\n    uint8_t  quality;\n} Sample;\n\ntypedef struct {\n    uint32_t seconds;\n    Sample   sample;\n} TimedReading;\n\nint main(void) {\n    TimedReading r;\n    r.seconds = 1000;\n    r.sample.millivolts = 3300;\n    r.sample.quality = 95;\n\n    printf("t=%u s, %u mV, quality=%u%%\\n",\n           (unsigned)r.seconds,\n           (unsigned)r.sample.millivolts,\n           (unsigned)r.sample.quality);\n\n    TimedReading *pr = &r;      /* pointer to the record */\n    pr->sample.quality = 88;    /* arrow = (*pr).member  */\n    printf("quality now=%u\\n", (unsigned)pr->sample.quality);\n    return 0;\n}',
        explanation: [
          'Two typedefs build the type: Sample bundles a measurement, TimedReading adds a timestamp around it.',
          'Member access chains through the nesting: r.sample.millivolts reads "the reading\'s sample\'s millivolts".',
          'The printf shows the record: t=1000 s, 3300 mV, quality=95%% prints a literal percent (the %% escape).',
          'Through the pointer, the arrow reaches the same members: pr->sample.quality is (*pr).sample.quality spelled comfortably.',
          'Output:\n```\nt=1000 s, 3300 mV, quality=95%\nquality now=88\n```',
        ],
      },
      {
        title: 'Pass by value copies; pass by pointer reaches',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\ntypedef struct {\n    int counts;\n    int status;\n} Reading;\n\nvoid try_edit_by_value(Reading r) {\n    r.counts = 999;          /* the copy changes */\n}\n\nvoid set_counts(Reading *r, int counts) {\n    r->counts = counts;      /* the original changes */\n}\n\nint main(void) {\n    Reading a = {100, 0};\n    try_edit_by_value(a);\n    printf("a.counts=%d\\n", a.counts);\n\n    set_counts(&a, 250);\n    printf("a.counts=%d\\n", a.counts);\n    return 0;\n}',
        explanation: [
          'try_edit_by_value receives a full copy of the struct; the assignment edits the copy, which dies at return - a.counts is still 100.',
          'set_counts receives the address; the arrow writes into the original - a.counts becomes 250.',
          'The same pass-by-value rule from module 6 applies to structs, member for member; pointers (module 8) are the escape hatch.',
          'Style note: a small two-int struct copies cheaply by value; a 64-byte state block would travel by const pointer for reads and plain pointer for writes.',
          'Output:\n```\na.counts=100\na.counts=250\n```',
        ],
      },
    ],
    tables: [
      {
        caption: 'Member access: dot vs arrow',
        headers: ['You have', 'Syntax', 'Meaning'],
        rows: [
          ['A struct variable', 'r.sample.quality', 'Follow the member path'],
          ['A pointer to struct', 'pr->sample.quality', 'Dereference, then the same path'],
          ['Equivalent longhand', '(*pr).sample.quality', 'Arrow is exactly this, prettier'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Forgetting the semicolon after the closing brace of a struct definition.',
        fix:
          'The definition is a declaration statement: `typedef struct { ... } Name;` - the trailing semicolon is part of it. Its absence usually triggers a baffling cascade on the NEXT declaration; fix the first error.',
      },
      {
        mistake: 'Comparing structs with ==: `if (a == b)`.',
        fix:
          'C has no struct equality operator - and padding bytes could differ anyway. Compare member by member (or memcmp only when the struct is guaranteed fully initialized with no padding traps).',
      },
      {
        mistake: 'Using dot through a pointer or arrow through a value: `p.member` / `r->member`.',
        fix:
          'The compiler rejects both with a pointed message. The rule: dot follows an object, arrow follows a pointer - if the arrow is missing where (*p). is intended, the code does not compile.',
      },
      {
        mistake: 'Passing a large struct by value into a hot-path function.',
        fix:
          'Every call copies every member. Firmware convention: structs beyond a few words travel by pointer - `const Big *in` for read-only, `Big *out` for produced results.',
      },
    ],
    guidedPractice: {
      title: 'Design a device record and update it through a pointer',
      brief:
        'Design `typedef struct { uint16_t raw; uint16_t millivolts; uint8_t ok; } AdcChannel;`. Write functions: `void convert(AdcChannel *ch)` that sets millivolts = raw * 3300 / 4096 and ok = 1 when raw <= 4095 else 0; and a main that fills raw = 2048, converts through the pointer, and prints all three members.',
      starterCode:
          '#include <stdio.h>\n#include <stdint.h>\n\ntypedef struct {\n    uint16_t raw;\n    uint16_t millivolts;\n    uint8_t  ok;\n} AdcChannel;\n\nstatic void convert(AdcChannel *ch) {\n    ch->millivolts = (uint16_t)((uint32_t)ch->raw * 3300u / 4096u);\n    ch->ok = (ch->raw <= 4095u) ? 1u : 0u;\n}\n\nint main(void) {\n    AdcChannel ch = { 2048, 0, 0 };\n    convert(&ch);\n    printf("raw=%u mv=%u ok=%u\\n",\n           (unsigned)ch.raw, (unsigned)ch.millivolts, (unsigned)ch.ok);\n    return 0;\n}',
      expectedBehavior:
        'millivolts = 2048 * 3300 / 4096 = 6758400 / 4096 = 1650 (exactly: 4096 * 1650 = 6758400); ok = 1 since 2048 <= 4095. Output: `raw=2048 mv=1650 ok=1`. Note the widen-before-multiply cast (module 2) inside the struct member update.',
      hints: [
        'The struct groups the three related values so one pointer carries them all into convert().',
        'raw * 3300 needs 32-bit arithmetic: cast before multiplying, module 2 lesson 3.',
        'Designated initializers ({ .raw = 2048 }) would make the initialization self-documenting.',
      ],
    },
    practiceExercises: [
      {
        title: 'Protocol frame struct',
        brief:
          'Define a frame type: `typedef struct { uint8_t addr; uint8_t cmd; uint16_t payload; uint8_t crc; } Frame;`. Write a function `uint8_t frame_crc(const Frame *f)` that XORs addr, cmd, the high payload byte and the low payload byte. Compute it by hand for {addr=0x01, cmd=0x10, payload=0xA207, crc=0} and verify in code.',
        expectedBehavior:
          'crc = 0x01 ^ 0x10 ^ 0xA2 ^ 0x07 = 0xB4. Extract bytes with shifts: (uint8_t)(f->payload >> 8) and (uint8_t)f->payload. The function takes a const pointer: read-only access to the frame.',
        hints: [
          'Split payload into bytes with (payload >> 8) and (payload & 0xFF).',
          'XOR the four bytes in any order - XOR is commutative (module 3).',
          'The const on the parameter promises the frame is not modified.',
        ],
      },
      {
        title: 'Two channels, one module',
        brief:
          'Extend the AdcChannel design to two independent channels (an array of two AdcChannel structs). Convert both through a loop of pointers, with raw = 1024 and 4095. Predict both millivolt values before running.',
        expectedBehavior:
          'Channel 0: 1024 * 3300 / 4096 = 3379200 / 4096 = 825. Channel 1: 4095 * 3300 / 4096 = 13513500 / 4096 = 3299 (4096 * 3299 = 13508604, remainder 4896). Both ok = 1. The struct-array combination is the standard multi-instance driver pattern.',
        hints: [
          'Loop with `AdcChannel *ch = &channels[i];` so the body reads like the single-channel version.',
          '4095 (full scale minus one) does not map to exactly 3300 mV under this model - the truncation is real and expected.',
          'Two instances from one type definition is exactly why structs beat parallel globals.',
        ],
      },
    ],
    assessment: {
      title: 'Structures checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n#include <stdint.h>\n\ntypedef struct {\n    uint16_t millivolts;\n    uint8_t  quality;\n} Sample;\n\nint main(void) {\n    Sample s = { 3300, 95 };\n    Sample *p = &s;\n    p->quality = 88;\n    printf("%u %u\\n", (unsigned)s.millivolts, (unsigned)s.quality);\n    return 0;\n}',
          options: ['3300 95', '3300 88', '88 3300', 'garbage'],
          answer: '3300 88',
          explanation:
            'The initializer fills millivolts=3300, quality=95 in declaration order; the arrow write changes quality to 88 through the pointer, and the print reads 3300 88.',
          hint: 'Which member does the arrow line modify?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'When is passing a struct by value the right choice?',
          options: [
            'Never - always pass pointers',
            'When the struct is small and the function must not modify the caller\'s copy',
            'When the struct contains arrays',
            'When the function must modify the original',
          ],
          answer: 'When the struct is small and the function must not modify the caller\'s copy',
          explanation:
            'By-value passes a full copy: cheap for a few words, wasteful for large blocks, and inherently protective (the callee cannot touch the original). Modification requires a pointer.',
          hint: 'What does the callee receive under pass-by-value?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'The arrow operator p->m means exactly (*p).m.',
          answer: 'true',
          explanation:
            'The arrow dereferences the pointer and selects the member - pure syntax sugar for the two-step longhand, and required because p.m would not compile on a pointer.',
          hint: 'One operator fuses two steps.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A driver stores its state in five file-scope globals and passes none of them around. A second motor is added and the code cannot run two instances. What struct-based redesign fixes this?',
          answer: 'Consolidate the five globals into a state struct type and give each motor its own instance - functions take DeviceState *state so state access is explicit per call and multiple instances coexist',
          explanation:
            'Structs turn implicit global coupling into explicit, per-instance data. One typedef plus pointer parameters converts a singleton design into a multi-instance one.',
          hint: 'Which construct bundles related state into one named unit?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Why is `if (recordA == recordB)` not a legal or meaningful comparison for structs?',
          answer: 'C defines no == for structs (only members copy/assign), and even member-wise equality would be ambiguous with padding bytes - compare the members you care about explicitly',
          explanation:
            'Struct equality must be written member by member; memcmp across padding can report differences for logically equal records.',
          hint: 'Which operators did C define for whole structs?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'struct', definition: 'A programmer-defined type bundling named members of possibly different types.' },
      { term: 'typedef', definition: 'Names a type; combined with struct it gives firmware records one-word names.' },
      { term: 'Member access (. / ->)', definition: 'Dot follows a struct variable; arrow follows a pointer to one - identical semantics.' },
      { term: 'Nested struct', definition: 'A struct member that is itself a struct; access chains through each level.' },
      { term: 'Designated initializer', definition: 'C99 syntax (.member = value) initializing fields by name, in any order.' },
      { term: 'Shallow copy', definition: 'Struct assignment copies member values, including pointers - both structs then alias the same targets.' },
    ],
    revisionSummary: [
      'typedef struct { members } Name; - the firmware record idiom; declaration ends with a semicolon.',
      'Dot follows objects, arrow follows pointers; access chains through nesting.',
      'By value = full copy (safe, costly for large structs); by pointer = reach the original.',
      'Assignment copies members byte-for-byte - shallowly: embedded pointers inside structs alias.',
      'No == on structs: compare members explicitly.',
      'Consolidating globals into a state struct converts singletons into multi-instance modules.',
    ],
    furtherReading: [
      { label: 'cppreference - structs', url: 'https://en.cppreference.com/w/c/language/struct', kind: 'docs' },
      { label: 'Wikipedia - struct (C programming language)', url: 'https://en.wikipedia.org/wiki/Struct_(C_programming_language)', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'cpg-m09-l2',
    title: 'Unions: One Memory, Several Views',
    summary:
      'Overlay a 32-bit register and its bytes with a union, learn the shared-memory insight, and meet endianness - the reason the byte order surprises you exactly once.',
    objectives: [
      'Declare unions and explain that all members share the same storage.',
      'Use a union to access a word as bytes (and back) on a known-endian target.',
      'State the union access rule: read the member you last wrote (or a byte view).',
      'Explain endianness and write byte-order-independent code with shifts and masks.',
    ],
    whyItMatters:
      'Hardware registers are 32 bits; protocols move 8 bits at a time; EEPROM stores bytes. The union is C\'s tool for viewing the same storage both ways - the register view and the byte view. Every bootloader, flash driver and protocol stack uses this overlay (or its shift-and-mask equivalent), and every one of them must respect endianness.',
    prerequisites: ['cpg-m09-l1', 'cpg-m03-l3'],
    explanation:
      'A **union** declares members that all start at the same address - one storage, several interpretations:\n\n```\ntypedef union {\n    uint32_t word;      /* the 32-bit view */\n    uint8_t  byte[4];   /* the 8-bit view  */\n} Reg32;\n```\n\nThe union\'s size is its **largest member** (4 bytes here). Writing `reg.word = 0x11223344u;` fills all four bytes; reading `reg.byte[0]` then looks at the first stored byte - which byte of the word that is depends on the machine\'s **endianness**:\n\n- **Little-endian** (x86, most ARM): least significant byte first - byte[0] is 0x44.\n- **Big-endian** (some network processors, classic MC68k): most significant byte first - byte[0] is 0x11.\n\n### The access rule\n\nC says reading a union member other than the one last written is an *unspecified value* in the general case - with two safe, universally supported practices: reading through **unsigned char** (byte) views is explicitly allowed, and reading another integer member of the same width re-interprets the bits on every mainstream compiler (the register-overlay idiom). The unsafe habit is writing an int member and reading a float member expecting meaning. When portability matters more than convenience, shift-and-mask (below) expresses the same idea with zero ambiguity.\n\n### The portable alternative\n\nThe byte extraction that works identically everywhere:\n\n```\nuint8_t b0 = (uint8_t)(w & 0xFFu);          /* LSB */\nuint8_t b3 = (uint8_t)((w >> 24) & 0xFFu);  /* MSB */\n```\n\nNamed by position (LSB/MSB) rather than by address, it has no endianness dependence - the reason firmware style guides often prefer masks for protocol code and reserve unions for register-shaped structures.',
    deepDive:
      '### Why the union-overlay idiom works in practice\n\nThe strictly-pedantic reading of C says type-punning through a union (write word, read bytes, or write bytes, read word) has unspecified results - but the practical contract is solid: every mainstream compiler (GCC, Clang, MSVC, and the embedded armcc/IAR families) documents and supports it, precisely because hardware APIs need it. The fully-guaranteed route in the standard is access through **unsigned char**, which may always alias any object. So the engineering rule: unions for byte-viewing integer registers are accepted practice (annotate them), unions for punning between float and int require documented compiler support, and anything else is a code review flag. When in doubt, shifts and masks - verbose, but zero caveats.\n\n### Endianness as a systems skill\n\nEndianness decides how multi-byte values map onto addresses, and it bites in three places: (1) **wire protocols** - network byte order is big-endian; serializing a uint32_t by dumping memory sends the wrong bytes on a little-endian MCU unless you shift-and-mask; (2) **file formats and flash images** - a binary dump read on the other endianness has every multi-byte field scrambled; (3) **byte-viewing unions** - byte[0] means different bytes on different machines. Portable firmware either fixes its own convention ("store LSB first in the buffer") with explicit shifts, or detects endianness at build time. The habit to build now: when serializing, never dump memory - emit bytes by position with shifts.\n\n### Unions in register structures\n\nThe classic peripheral descriptor overlays a word register with bit-field or byte views:\n\n```\ntypedef union {\n    uint32_t word;\n    struct { uint32_t enable:1; uint32_t mode:3; uint32_t reserved:28; } bits;\n} CTRL;\n```\n\nOne storage, a whole-word write for atomic setup and named-bit access for tweaks. It is genuinely useful - and it stacks the portability caveats of bit fields (next lesson: layout is implementation-defined) onto the union caveat, which is why datasheet-faithful drivers often declare the union but do the bit work with masks. You will meet both styles in real code; now you can read both.',
    examples: [
      {
        title: 'Register overlay: word view and byte view',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational simulation of a register-like storage.\n   This is an ordinary C union in host memory - no\n   hardware is involved anywhere. */\ntypedef union {\n    uint32_t word;\n    uint8_t  byte[4];\n} Reg32;\n\nint main(void) {\n    Reg32 reg;\n    reg.word = 0x11223344u;\n\n    printf("word    = 0x%08X\\n", (unsigned)reg.word);\n    printf("byte[0] = 0x%02X\\n", (unsigned)reg.byte[0]);\n    printf("byte[3] = 0x%02X\\n", (unsigned)reg.byte[3]);\n\n    reg.byte[0] = 0xFF;     /* byte-view write */\n    printf("new word = 0x%08X\\n", (unsigned)reg.word);\n    return 0;\n}',
        explanation: [
          'One 4-byte storage, two views. The word write fills all of it; the byte reads look at individual positions.',
          'On a LITTLE-endian machine (x86, most ARM - the expected output here): byte[0] holds the least significant byte 0x44, byte[3] the most significant 0x11. On a big-endian machine the two prints would swap.',
          'Writing byte[0] = 0xFF modifies the low byte of the same storage: the word view now reads 0x112233FF - the views are one memory.',
          'Output (little-endian target):\n```\nword    = 0x11223344\nbyte[0] = 0x44\nbyte[3] = 0x11\nnew word = 0x112233FF\n```',
        ],
      },
      {
        title: 'The portable twin: shifts and masks',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint32_t w = 0x11223344u;\n\n    /* Positional bytes - identical on every platform. */\n    uint8_t b0 = (uint8_t)(w & 0xFFu);            /* LSB */\n    uint8_t b1 = (uint8_t)((w >> 8) & 0xFFu);\n    uint8_t b2 = (uint8_t)((w >> 16) & 0xFFu);\n    uint8_t b3 = (uint8_t)((w >> 24) & 0xFFu);    /* MSB */\n\n    printf("lsb=0x%02X mid0=0x%02X mid1=0x%02X msb=0x%02X\\n",\n           (unsigned)b0, (unsigned)b1, (unsigned)b2, (unsigned)b3);\n\n    /* Rebuild from bytes - endianness never enters. */\n    uint32_t rebuilt = (uint32_t)b3 << 24 | (uint32_t)b2 << 16\n                     | (uint32_t)b1 << 8 | (uint32_t)b0;\n    printf("rebuilt = 0x%08X\\n", (unsigned)rebuilt);\n    return 0;\n}',
        explanation: [
          'Each byte is named by POSITION (LSB, bit 8-15, bit 16-23, MSB), not by memory address - no endianness assumption anywhere.',
          'Extraction: mask keeps 8 bits; shift moves the wanted byte to the bottom. Every intermediate is well-defined unsigned arithmetic (module 3).',
          'Rebuild ORs the widened bytes back into position - the exact pattern protocol code uses to serialize and deserialize, on any machine.',
          'Output:\n```\nlsb=0x44 mid0=0x33 mid1=0x22 msb=0x11\nrebuilt = 0x11223344\n```',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'The same four bytes under both views (little-endian)',
        content:
          '   memory address:    base    base+1  base+2  base+3\n                    +-------+-------+-------+-------+\n   stored bytes     |  0x44 |  0x33 |  0x22 |  0x11 |\n                    +-------+-------+-------+-------+\n\n   union view A: word  = 0x11223344\n                 (LSB at the lowest address -> little-endian)\n\n   union view B: byte[0]=0x44 byte[1]=0x33 byte[2]=0x22 byte[3]=0x11\n\n   On a BIG-endian machine the same word 0x11223344 stores as:\n                    |  0x11 |  0x22 |  0x33 |  0x44 |\n   -> byte[0] would read 0x11. The views share storage;\n      the byte ORDER is the platform\'s choice.',
        caption:
          'A union gives two names to one storage. Endianness decides how the word maps onto the byte positions - which is why portable code prefers positional shifts.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming byte[0] is the most significant byte.',
        fix:
          'It is the byte at the lowest address, which is the MSB only on big-endian machines. Name bytes by position (LSB/MSB) with shifts when the code must be portable; rely on array indexes only where the target endianness is fixed and documented.',
      },
      {
        mistake: 'Writing one union member and reading an unrelated type for meaning: write float, read uint32_t "as the bits".',
        fix:
          'Type-punning between incompatible types (float to int) is outside the standard\'s guarantees; it needs documented compiler support (and in practice memcpy or unions of identical width). Byte views of integer members are the sanctioned overlay.',
      },
      {
        mistake: 'Serializing a struct or union by writing its raw memory to a wire or file.',
        fix:
          'Raw dumps carry padding and endianness. Emit fields explicitly with shifts (portable twin above) or a documented byte layout; parse the same way.',
      },
      {
        mistake: 'Assuming sizeof(union) is the sum of members.',
        fix:
          'It is the largest member (plus possible tail padding for alignment). Reg32 is 4 bytes, not 8 - the members overlay, not concatenate.',
      },
    ],
    guidedPractice: {
      title: 'Build a byte-wise register set',
      brief:
        'Using the Reg32 union, set the word to 0 and then build the value 0xDEADBEEF byte by byte through the byte array (assign byte[0..3] with the values that produce it on a little-endian target), print the word view, then verify by re-deriving the byte assignments from the word with shifts. State each byte assignment before running.',
      starterCode:
          '#include <stdio.h>\n#include <stdint.h>\n\ntypedef union {\n    uint32_t word;\n    uint8_t  byte[4];\n} Reg32;\n\nint main(void) {\n    Reg32 reg;\n    reg.word = 0u;\n\n    /* little-endian: byte[0] is the LSB */\n    reg.byte[0] = 0xEFu;\n    reg.byte[1] = 0xBEu;\n    reg.byte[2] = 0xADu;\n    reg.byte[3] = 0xDEu;\n\n    printf("word = 0x%08X\\n", (unsigned)reg.word);\n\n    /* verification by positional extraction */\n    printf("lsb=0x%02X msb=0x%02X\\n",\n           (unsigned)(reg.word & 0xFFu),\n           (unsigned)((reg.word >> 24) & 0xFFu));\n    return 0;\n}',
      expectedBehavior:
        'The byte writes assemble 0xDEADBEEF (LSB 0xEF at byte[0] on little-endian); the word print shows 0xDEADBEEF. The positional verification reads lsb=0xEF and msb=0xDE - matching the assignments. On a big-endian target the same byte writes would produce the byte-reversed word, which is exactly the lesson.',
      hints: [
        'Little-endian: increasing array index = increasing significance.',
        '0xDEADBEEF byte order, LSB first: EF BE AD DE.',
        'The shift-and-mask check is endianness-independent - use it as the ground truth.',
      ],
    },
    practiceExercises: [
      {
        title: 'Endianness detector',
        brief:
          'Write a tiny program that stores 0x01 in a uint32_t, inspects its first byte through a uint8_t* cast, and prints LITTLE or BIG according to whether that byte is 0x01. Note in a comment what the test does and does not guarantee.',
        expectedBehavior:
          'On little-endian machines the lowest address holds 0x01 -> prints LITTLE; on big-endian, BIG. The comment should note: this inspects the running platform only, at runtime; portable code must not branch on it silently - it documents assumptions.',
        hints: [
          'Cast the address: uint8_t *p = (uint8_t *)&value;.',
          '0x01 as a word puts its only nonzero (least significant) byte somewhere - the first address tells you the order.',
          'Real firmware instead fixes a convention with shifts - this detector is a teaching probe.',
        ],
      },
      {
        title: 'Serialize and deserialize a 16-bit value',
        brief:
          'Write two functions with fixed convention LSB-first: `void put16(uint8_t *buf, uint16_t v)` storing both bytes, and `uint16_t get16(const uint8_t *buf)` rebuilding it. Round-trip 0xCAFE through a 2-byte buffer and print the buffer bytes and the rebuilt value.',
        expectedBehavior:
          'put16 stores buf[0] = 0xFE (LSB), buf[1] = 0xCA. get16 rebuilds (uint16_t)buf[0] | ((uint16_t)buf[1] << 8) = 0xCAFE. The convention is explicit in the functions, so the pair works identically on any platform - the standard way protocol stacks frame multi-byte fields.',
        hints: [
          'LSB-first convention: buf[0] = v & 0xFF; buf[1] = (v >> 8) & 0xFF.',
          'Rebuild by widening each byte before shifting - module 3\'s pack idiom.',
          'The round trip must return exactly 0xCAFE - behavior parity is the test.',
        ],
      },
    ],
    assessment: {
      title: 'Unions and endianness checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'On a LITTLE-endian machine, what does this program print?',
          code: '#include <stdio.h>\n#include <stdint.h>\n\ntypedef union {\n    uint32_t word;\n    uint8_t  byte[4];\n} Reg32;\n\nint main(void) {\n    Reg32 r;\n    r.word = 0xA1B2C3D4u;\n    printf("%02X\\n", (unsigned)r.byte[0]);\n    return 0;\n}',
          options: ['A1', 'D4', 'B2', 'C3'],
          answer: 'D4',
          explanation:
            'Little-endian stores the least significant byte (D4) at the lowest address, which is byte[0]. A big-endian machine would print A1.',
          hint: 'Which byte sits at the lowest address on a little-endian machine?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What is sizeof of the union below?',
          code: 'typedef union {\n    uint32_t word;\n    uint16_t half;\n    uint8_t  byte;\n} Trio;',
          options: ['The sum of the members (12 bytes)', 'The largest member (4 bytes)', 'The smallest member (1 byte)', 'Undefined'],
          answer: 'The largest member (4 bytes)',
          explanation:
            'All members share one storage sized to fit the largest: 4 bytes here (plus any alignment padding the platform requires). Members overlay; they do not concatenate.',
          hint: 'One storage, several names - how big must the storage be?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Code that extracts bytes with (w >> 8) & 0xFF produces identical results on little- and big-endian machines.',
          answer: 'true',
          explanation:
            'Shifts and masks are positional (value-space) operations independent of memory order - the portable alternative to byte-addressed views, and the preferred idiom for protocol serialization.',
          hint: 'Do shifts consult memory addresses at all?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A protocol stack on a little-endian MCU sends a uint32_t by writing the union\'s byte[0..3] to the wire in index order. The receiver (big-endian host) reassembles MSB-first and reads the wrong value. Name the defect and the two portable fixes.',
          answer: 'The sender relies on memory byte order instead of a positional convention - fixes: serialize with explicit shifts into a documented byte order (LSB-first or MSB-first, both sides agreed), or use the platform byte-swap so the wire order is fixed',
          explanation:
            'Wire formats are defined by position; dumping memory imports the platform\'s endianness. Shift-and-mask (or htonl-style conversion) emits bytes by significance regardless of hardware.',
          hint: 'Which property of the bytes - address or significance - should decide wire order?',
          difficulty: 'hard',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'State the access rule for unions that keeps you within the standard\'s guarantees, and the one universally-allowed exception.',
          answer: 'Read back the member you last wrote (or same-width integer reinterpretation, an accepted-but-implementation-defined idiom) - the universally guaranteed exception is reading through unsigned char views, which may inspect any object\'s bytes',
          explanation:
            'Byte views are the standard-sanctioned overlay; same-width integer punning is universal practice with compiler support; incompatible-type punning needs documented support.',
          hint: 'Which character type may always alias any object?',
          difficulty: 'hard',
        },
      ],
    },
    keyTerms: [
      { term: 'union', definition: 'A type whose members share one storage, sized to the largest member.' },
      { term: 'Overlay', definition: 'The register idiom: one storage with a word view and a byte (or bit) view.' },
      { term: 'Endianness', definition: 'The byte order of multi-byte values in memory: LSB-first (little) or MSB-first (big).' },
      { term: 'Network byte order', definition: 'The big-endian convention of wire protocols - multi-byte fields are sent MSB first.' },
      { term: 'Type punning', definition: 'Writing one union member and reading another for reinterpretation - accepted for integer byte views, flagged beyond.' },
      { term: 'Byte-swap', definition: 'Reversing a multi-byte value\'s byte order to convert between endiannesses.' },
    ],
    revisionSummary: [
      'Union members share one storage sized to the largest member - views, not additions.',
      'byte[0] is the lowest ADDRESS; its significance depends on endianness (LSB on little-endian).',
      'Safe access: read what you wrote, integer reinterprets of the same width (universal practice), unsigned char views (guaranteed).',
      'Shift-and-mask extraction/rebuild is endianness-blind - the portable serialization idiom.',
      'Never dump struct/union memory to a wire: padding and byte order are platform choices.',
      'Register overlay unions + bit-field structs stack portability caveats - datasheet-faithful drivers often mask instead.',
    ],
    furtherReading: [
      { label: 'Wikipedia - Endianness', url: 'https://en.wikipedia.org/wiki/Endianness', kind: 'article' },
      { label: 'cppreference - union', url: 'https://en.cppreference.com/w/c/language/union', kind: 'docs' },
      { label: 'Wikipedia - Union type', url: 'https://en.wikipedia.org/wiki/Union_type', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'cpg-m09-l3',
    title: 'Enums, Bit Fields and Struct Layout',
    summary:
      'Name states with enums, try C\'s bit fields - and understand precisely why their layout is implementation-defined, which is why embedded code usually chooses explicit masks.',
    objectives: [
      'Define enums for machine states and switch over them with compiler coverage checks.',
      'Declare bit fields and explain what the compiler is free to choose about their layout.',
      'Explain struct padding and alignment; predict sizeof for simple records.',
      'Argue the mask-based alternative for register fields and write it.',
    ],
    whyItMatters:
      'Enums turn magic numbers into named states that the compiler checks; padding knowledge explains why sizeof surprises you and why wire formats never dump raw structs; and the bit-field portability story is a rite of passage - every firmware engineer eventually meets a bit field that packed differently on the new compiler, and learns the mask idiom that never lies.',
    prerequisites: ['cpg-m09-l1', 'cpg-m03-l4'],
    explanation:
      '### Enums: named integers\n\n```\ntypedef enum {\n    ST_IDLE,\n    ST_MEASURE,\n    ST_TRANSMIT,\n    ST_FAULT\n} State;\n```\n\nEnum constants are ints, numbered from 0 upward (ST_IDLE = 0, ST_MEASURE = 1...), unless given explicit values. Their value is threefold: names replace magic numbers at every use site, a switch over an enum gets **compiler coverage warnings** for missing cases (-Wswitch), and debuggers show the names. Enums are the natural state type for the state machines of project 3.\n\n### Bit fields: members of sub-word width\n\n```\ntypedef struct {\n    uint8_t enable : 1;\n    uint8_t mode   : 3;\n    uint8_t flags  : 4;\n} PackedFlags;\n```\n\nThe `: 3` asks for a 3-bit member. The compiler allocates and accesses the bits for you - writing `f.mode = 5;` does the shift-and-mask dance internally. But the standard lets the implementation choose nearly everything that matters: the **order** of bits within the storage unit (LSB-first or MSB-first), the **size and alignment of the storage unit**, and whether fields may straddle unit boundaries. Two compilers, two layouts - which is why bit fields are fine for internal, same-compiler bookkeeping and untrustworthy for hardware registers and wire formats.\n\n### Padding and alignment\n\nStruct members are aligned: a uint32_t member sits at a 4-byte-aligned offset, and the compiler inserts invisible **padding** to arrange that. The classic case:\n\n```\ntypedef struct {\n    uint8_t  a;     /* offset 0, then 3 padding bytes */\n    uint32_t b;     /* offset 4 */\n    uint8_t  c;     /* offset 8, then 3 tail padding */\n} Padded;           /* sizeof = 12, not 6 */\n```\n\nOrdering members largest-first usually shrinks the record. Padding is why raw struct dumps are not portable, and why sizeof matters more than intuition.',
    deepDive:
      '### Why bit-field layout is implementation-defined - and what that costs\n\nA bit field has no mandated storage model: the standard names the member count semantics but leaves the container unit, bit ordering, and straddling rules to the implementation. Concretely, `uint8_t mode : 3` might occupy bits 0-2 of a byte on one compiler and bits 5-7 on another; a `uint32_t x : 20` might straddle two words or not. Firmware feels this in three places: a register described with bit fields matches the hardware only on the compiler whose layout the datasheet was written for; a bit-field struct written to EEPROM reads back differently after a toolchain change; and two CPUs sharing memory (multi-core, DMA) corrupt each other\'s fields. Hence the embedded rule: bit fields for internal software state, **explicit masks for anything with an external contract**. The mask form states the bit positions in code where the bit field leaves them to the implementation:\n\n```\nreg = (uint8_t)((reg & ~(0x07u << 3)) | ((mode & 0x07u) << 3));\n```\n\n- verbose, portable, and reviewable against the datasheet line by line.\n\n### Alignment as a hardware requirement\n\nAlignment is not pedantry: many architectures simply fault on misaligned word access (older ARM), and others access in multiple slow cycles. The compiler\'s padding exists to keep every member on a legal boundary. Firmware meets the same requirement in DMA and buffer descriptors (hardware demands aligned buffers), in packed wire structs (where you trade speed for size), and in casted buffers (casting a byte buffer to a struct pointer can produce misaligned members - undefined behavior unless alignment is guaranteed). The professional habits: let the compiler lay out internal structs; place wire fields explicitly byte by byte; and when a spec demands packed layout, use the vendor\'s packed attribute with full knowledge that unaligned access may cost faults or cycles.\n\n### Enums in API design\n\nBeyond state machines, enums earn their keep as function vocabulary: `typedef enum { UART_OK, UART_BUSY, UART_ERR_FRAMING } UartStatus;` documents every outcome, and callers switch over the names instead of decoding ints. Two refinements professionals use: explicit values for protocol-critical enums (`ST_FAULT = 3` when a spec pins the number - the pinning also survives reordering) and a sentinel count member (`STATE_COUNT` last) for array sizing and completeness assertions. A switch over an enum missing a case is a *warning* with -Wswitch - which converts "add a new state" into a compile-error-driven checklist across the whole codebase. That compiler-checked vocabulary is the closest thing C has to sum types.',
    examples: [
      {
        title: 'An enum-driven state step',
        language: 'c',
        code:
          '#include <stdio.h>\n\ntypedef enum {\n    ST_IDLE,\n    ST_MEASURE,\n    ST_TRANSMIT,\n    ST_FAULT\n} State;\n\nint main(void) {\n    State s = ST_MEASURE;\n\n    switch (s) {\n    case ST_IDLE:\n        printf("idle: waiting for trigger\\n");\n        break;\n    case ST_MEASURE:\n        printf("measuring...\\n");\n        s = ST_TRANSMIT;\n        break;\n    case ST_TRANSMIT:\n        printf("transmitting\\n");\n        break;\n    case ST_FAULT:\n        printf("fault\\n");\n        break;\n    default:\n        break;\n    }\n    printf("next state = %d\\n", (int)s);\n    return 0;\n}',
        explanation: [
          'The enum numbers states from 0: ST_IDLE=0, ST_MEASURE=1, ST_TRANSMIT=2, ST_FAULT=3 - but code always names them.',
          'The switch runs the ST_MEASURE arm, prints, and assigns the next state - one case per state is the state-machine skeleton (project 3 scales it into a superloop).',
          'The cast to int prints the numeric state: 2 (ST_TRANSMIT). Printing states numerically is standard for logs.',
          'With -Wall -Wswitch, deleting a case would produce a warning: the compiler checks enum coverage.',
          'Output:\n```\nmeasuring...\nnext state = 2\n```',
        ],
      },
      {
        title: 'Bit fields, padding and sizeof, measured',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\ntypedef struct {\n    uint8_t enable : 1;\n    uint8_t mode   : 3;\n    uint8_t flags  : 4;\n} PackedFlags;\n\ntypedef struct {\n    uint8_t  a;\n    uint32_t b;\n    uint8_t  c;\n} Padded;\n\nint main(void) {\n    PackedFlags f = { 1, 5, 0 };\n\n    printf("sizeof PackedFlags = %zu\\n", sizeof(PackedFlags));\n    printf("sizeof Padded      = %zu\\n", sizeof(Padded));\n    printf("enable=%u mode=%u\\n", (unsigned)f.enable, (unsigned)f.mode);\n    return 0;\n}',
        explanation: [
          'PackedFlags packs 1 + 3 + 4 = 8 bits into one uint8_t storage unit: sizeof 1 on mainstream compilers - the fields fit a single unit.',
          'Padded shows alignment at work: a at offset 0, 3 bytes of padding, b aligned at offset 4, c at offset 8, 3 tail bytes - sizeof 12 on typical 32/64-bit targets (not 6).',
          'The bit-field writes look like members: f.mode = 5 stores into the 3-bit field; the printed values are the fields, whatever internal shift the compiler chose.',
          'The layout itself (which bits, where the padding sits) is implementation-defined - exactly why these structs are not serialized raw.',
          'Output (typical gcc/clang targets):\n```\nsizeof PackedFlags = 1\nsizeof Padded      = 12\nenable=1 mode=5\n```',
        ],
      },
    ],
    tables: [
      {
        caption: 'Bit fields vs explicit masks',
        headers: ['', 'Bit fields', 'Explicit masks'],
        rows: [
          ['Syntax', 'uint8_t mode : 3;', 'reg & 0x38, (mode << 3)'],
          ['Layout', 'Implementation-defined (order, units, straddle)', 'Stated in the code'],
          ['Portable across compilers', 'No', 'Yes'],
          ['Suitable for', 'Internal software state', 'Hardware registers, wire formats, shared memory'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Describing hardware registers with bit fields and shipping to a different compiler.',
        fix:
          'Bit-field order and storage units are implementation-defined; the hardware fixes them absolutely. Use explicit masks (set/clear/extract with shifts) so the code names the same bits the datasheet does, on every compiler.',
      },
      {
        mistake: 'Serializing a struct by writing sizeof(bytes) of it to flash or a wire.',
        fix:
          'Padding bytes and endianness travel with the dump. Serialize field by field in a documented order - or accept the format is compiler- and platform-specific forever.',
      },
      {
        mistake: 'Assuming enum values beyond the defaults: inserting a new state in the middle and reusing saved numeric logs.',
        fix:
          'Defaults renumber on insertion. Pin values explicitly (ST_FAULT = 3) when numbers cross a boundary - logs, wire, EEPROM - and add a COUNT sentinel for completeness checks.',
      },
      {
        mistake: 'Declaring a bit field without an explicit signedness: `int mode : 3;`.',
        fix:
          'A plain int bit field of width 3 has implementation-defined signedness (it may be signed, holding -4..3). Always spell unsigned: `unsigned int mode : 3;` or uint8_t-backed fields.',
      },
    ],
    guidedPractice: {
      title: 'Same field, both spellings',
      brief:
        'A register stores a 3-bit MODE at bits 3-5. (1) Write the mask-based set: clear the field, then insert value 6, starting from reg = 0x1C (field bits = 011, plus bit 2 set). (2) Write the same field update with a bit-field struct view. (3) Print the final reg (expect 0x34) and explain in one comment which spelling states the bit positions explicitly.',
      starterCode:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    /* (1) explicit masks: MODE at bits 3-5, width 3 */\n    uint8_t reg = 0x1C;                      /* 0001 1100 */\n    const uint8_t MODE_MASK = (uint8_t)(0x07u << 3);   /* 0x38 */\n\n    reg = (uint8_t)(reg & (uint8_t)~MODE_MASK);        /* clear field */\n    reg = (uint8_t)(reg | (6u << 3));                  /* insert 6    */\n    printf("mask version : 0x%02X\\n", (unsigned)reg);\n\n    /* (2) bit-field view (layout is implementation-defined) */\n    typedef struct {\n        uint8_t lo    : 3;\n        uint8_t mode  : 3;\n        uint8_t hi    : 2;\n    } View;\n    View v;\n    v.lo = 4u;\n    v.mode = 6u;\n    v.hi = 0u;\n    printf("field version: mode=%u\\n", (unsigned)v.mode);\n    return 0;\n}',
      expectedBehavior:
        'Mask version: 0x1C & ~0x38 = 0x04 (the low bit survives), then 6 << 3 = 0x30, so reg = 0x34 - bit 2 untouched, field now 110. Field version prints mode=6 regardless of how the compiler laid out the bits. The comment: the mask spelling names bits 3-5 in the source; the bit field leaves the placement to the implementation.',
      hints: [
        'Field mask in position: 0x07 << 3 = 0x38.',
        'Clear-then-set: AND with the complement, then OR the shifted value.',
        'Keep one nonzero bit outside the field (the 0x04) to watch the masks preserve it.',
      ],
    },
    practiceExercises: [
      {
        title: 'Reorder the struct, watch sizeof',
        brief:
          'Define `struct { char tag; double value; char flag; }` (8-byte-aligned double on typical hosts) and print sizeof. Then reorder to `struct { double value; char tag; char flag; }` and print again. State the rule about ordering members largest-first.',
        expectedBehavior:
          'First order: tag at 0, padding to 8, value at 8, flag at 16, tail padding to 24 - sizeof 24. Reordered: value at 0, tag at 8, flag at 9, tail to 16 - sizeof 16. Same data, 8 bytes saved: largest-first minimizes padding.',
        hints: [
          'Alignment of double is 8 on typical hosts - the char before it forces 7 padding bytes.',
          'Compute each member\'s offset before running, then check.',
          'The total size also rounds up to the largest alignment (tail padding).',
        ],
      },
      {
        title: 'Pinned enum for a wire format',
        brief:
          'Define an enum of command codes for a protocol where the numbers are fixed by a spec: PING=1, READ=2, WRITE=3, RESET=4, plus a CMD_COUNT sentinel. Write a function `const char *cmd_name(unsigned code)` switching over the enum and returning names, with an "unknown" default. Test codes 2 and 9.',
        expectedBehavior:
          'cmd_name(2) returns "READ"; cmd_name(9) hits the default "unknown". The explicit =N values pin the wire numbers; CMD_COUNT supports array sizing and completeness checks. Note the function returns a string literal - safe, static storage (module 8).',
        hints: [
          'Pin each value with = in the enumerator list.',
          'The switch needs a case per command plus default - same skeleton as the state example.',
          'Returning literals avoids any buffer management - literals live for the whole program.',
        ],
      },
    ],
    assessment: {
      title: 'Enums, bit fields and layout checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\ntypedef enum {\n    ST_IDLE,\n    ST_MEASURE,\n    ST_TRANSMIT,\n    ST_FAULT\n} State;\n\nint main(void) {\n    State s = ST_TRANSMIT;\n    printf("%d\\n", (int)s);\n    return 0;\n}',
          options: ['2', '3', '1', 'ST_TRANSMIT'],
          answer: '2',
          explanation:
            'Enum constants number from 0: ST_IDLE=0, ST_MEASURE=1, ST_TRANSMIT=2. The cast prints the numeric value.',
          hint: 'Count from zero through the enumerator list.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which property of bit fields does the C standard actually guarantee?',
          options: [
            'Bits are allocated LSB-first within the unit',
            'Fields never straddle storage-unit boundaries',
            'The field widths you declare (e.g. 3 bits hold 0..7)',
            'The layout matches the datasheet',
          ],
          answer: 'The field widths you declare (e.g. 3 bits hold 0..7)',
          explanation:
            'The standard fixes the width semantics; the storage unit size/order, bit ordering and straddling are all implementation-defined. That is why hardware-facing code uses masks.',
          hint: 'Which part is arithmetic, and which part is memory layout?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'On typical 32/64-bit targets, `struct { uint8_t a; uint32_t b; uint8_t c; }` has sizeof 6.',
          answer: 'false',
          explanation:
            'Alignment inserts 3 bytes after a (b needs a 4-byte-aligned offset) and up to 3 tail bytes: sizeof is typically 12. Padding trades bytes for aligned access.',
          hint: 'Where must the uint32_t member sit?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A team describes an SPI control register with a bit-field struct, compiles it with vendor A\'s compiler, then moves to vendor B - and the driver sets the wrong bits. Explain the root cause and the durable fix.',
          answer: 'Bit-field layout (bit order, storage units, straddling) is implementation-defined and the two compilers chose differently - the durable fix is explicit masks: set/clear/extract with (1u << bit) and field masks, stating the positions the datasheet fixes',
          explanation:
            'Hardware layout is absolute; the compiler\'s is not. Masks move the bit positions from the implementation\'s choice into the source, reviewable line by line.',
          hint: 'What did the standard leave to the implementation?',
          difficulty: 'hard',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Give two reasons to pin enum values explicitly (= 3 style) in firmware code.',
          answer: 'Inserting or reordering enumerators would otherwise renumber everything after it, corrupting saved logs, EEPROM data or wire values that encoded the old numbers - and pinned values let code match a fixed specification',
          explanation:
            'Defaults are convenient internally; any value that crosses a boundary (storage, wire, another build) needs explicit pinning. A COUNT sentinel rounds out the pattern.',
          hint: 'What happens to the numbers of enumerators after an insertion?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'enum', definition: 'Named integer constants, numbered from 0 unless pinned; the state-machine vocabulary type.' },
      { term: 'Bit field', definition: 'A struct member of declared sub-word width (member : bits); layout is implementation-defined.' },
      { term: 'Padding', definition: 'Invisible bytes the compiler inserts to satisfy member alignment.' },
      { term: 'Alignment', definition: 'The address-multiple requirement of a type; misaligned access faults or slows on many architectures.' },
      { term: 'Packed layout', definition: 'Forcing structs without padding via vendor attributes - smaller, but misaligned access costs apply.' },
      { term: 'Field mask', definition: 'The width mask placed at its offset ((0x07u << 3)) used to clear, insert and extract fields portably.' },
    ],
    revisionSummary: [
      'Enums name integer constants from 0; pin values explicitly when numbers cross boundaries.',
      '-Wswitch makes a switch over an enum a coverage checklist - add a state, get compile errors until handled.',
      'Bit fields: widths are guaranteed; order, units and straddling are implementation-defined.',
      'Embedded rule: bit fields for internal state, explicit masks for registers, wire and shared memory.',
      'Alignment inserts padding: order members largest-first to shrink records; never dump raw structs.',
      'sizeof answers layout questions the source code cannot show - measure, do not guess.',
    ],
    furtherReading: [
      { label: 'cppreference - bit fields', url: 'https://en.cppreference.com/w/c/language/bit_field', kind: 'docs' },
      { label: 'cppreference - enum', url: 'https://en.cppreference.com/w/c/language/enum', kind: 'docs' },
      { label: 'Wikipedia - Data structure alignment', url: 'https://en.wikipedia.org/wiki/Data_structure_alignment', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
