import type { TutorialLesson } from '../types';

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'cpg-m02-l1',
    title: 'Variables, Constants and Initialization',
    summary:
      'Declare, initialize and name variables that model real quantities - samples, thresholds, counts - and learn why every variable deserves a value before its first read.',
    objectives: [
      'Declare variables with appropriate names and initialize them at the point of declaration.',
      'Use const for quantities that must not change and explain the benefit over bare literals.',
      'Distinguish declaration, initialization and assignment.',
      'Choose variable names that survive contact with a real codebase review.',
    ],
    whyItMatters:
      'A variable in embedded C is not an abstract box - it is one or more bytes of RAM (or a register) whose width and range you are responsible for. Getting names, initial values and constants right is the difference between code a reviewer trusts in five minutes and code that gets kicked back with fifty comments.',
    prerequisites: ['cpg-m01-l2'],
    explanation:
      'A **variable** is a named piece of memory that holds a value of a stated type. Three verbs matter:\n\n- **Declaration** creates the variable: `int sample;` - the name and type now exist.\n- **Initialization** gives the first value at the moment of creation: `int sample = 512;`.\n- **Assignment** replaces the value later: `sample = 780;`.\n\nThe order is strict: a variable must be declared before use, and by strong convention initialized before its first read. An uninitialized local variable in C does not hold zero - it holds whatever bytes were already in that stack slot, and *reading* it is undefined behavior. The professional rule is therefore absolute: **initialize at declaration, always**. If a real value is not known yet, initialize with a safe placeholder and set the real value on the same path that first uses it.\n\n### Constants: values that must not move\n\nWhen a value is fixed by the design - a reference voltage, a maximum count, a bit mask - declare it `const`:\n\n```\nconst int ADC_MAX_COUNTS = 1023;   /* 10-bit converter          */\nconst int VREF_MV = 3300;          /* reference, in millivolts  */\n```\n\n`const` makes assignment to the name a compile error, so the compiler enforces the intent instead of trusting discipline. It also documents meaning: a reader of `sample * VREF_MV / ADC_MAX_COUNTS` sees labeled quantities instead of mystery numbers like `3300` and `1023` (the so-called **magic numbers** anti-pattern). Constants live in the same memory as variables, can be inspected in a debugger by name, and respect type checking - all reasons embedded style guides prefer them over textual `#define` macros for typed values (macros are covered properly in module 10).',
    deepDive:
      '### Names are an interface\n\nA variable name is documentation the compiler checks every time it is used. Compare `int t = 780;` with `int sample_counts = 780;`. Rules that age well: spell out units in the name when several systems are in play (`millivolts`, `ms`, `counts`); name booleans as predicates (`is_valid`, `has_fault`); reserve single letters for tiny, obvious scopes like a loop counter. Consistent `camelCase` or `snake_case` matters less than picking one - most embedded C codebases use `snake_case`.\n\n### What const really promises\n\n`const` means "this name will not be reassigned through this name" - slightly weaker than "never changes", which is why `const int *p` (pointer to constant data) and `int *const p` (constant pointer) are different declarations, dissected in module 8. For simple scalars the distinction is invisible and the benefit is total: the compiler rejects every accidental write. On small targets, `const` data can additionally be placed in flash instead of RAM by the linker - a real memory win you will meet again in the build-process module.\n\n### Declaration order and readability\n\nC99 allows declarations anywhere in a block, but declaring variables at the top of the function - or at first meaningful use, consistently - keeps the set of live names visible in one glance. What you should never do is declare a variable, use it fifty lines later, and hope the reader remembers its role. Declare close to use, initialize immediately, and the code explains itself.',
    examples: [
      {
        title: 'A conversion using named constants',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    const int ADC_MAX_COUNTS = 1023;   /* 10-bit converter        */\n    const int VREF_MV = 3300;          /* reference in millivolts */\n\n    int sample = 780;\n    int millivolts = (sample * VREF_MV) / ADC_MAX_COUNTS;\n\n    printf("sample = %d\\n", sample);\n    printf("millivolts = %d\\n", millivolts);\n    return 0;\n}',
        explanation: [
          'The two `const int` lines fix design constants by name; writing `ADC_MAX_COUNTS = 512;` later would be a compile error, which is the point.',
          '`int sample = 780;` declares and initializes in one step - the initialization-at-declaration habit.',
          'The conversion is 780 * 3300 = 2574000, then 2574000 / 1023 = 2516 (integer division: 1023 * 2516 = 2573868, and the next multiple exceeds the value).',
          'The name `millivolts` carries the unit; a reader never has to guess whether 2516 is volts, millivolts or counts.',
          'Output:\n```\nsample = 780\nmillivolts = 2516\n```',
        ],
      },
      {
        title: 'Declaration, initialization and assignment as separate steps',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int raw;              /* declaration only          */\n    int filtered = 0;     /* declaration + init        */\n\n    raw = 990;            /* assignment                */\n    filtered = filtered + (raw - filtered) / 4;\n\n    printf("raw=%d filtered=%d\\n", raw, filtered);\n    return 0;\n}',
        explanation: [
          '`raw` is declared empty, then assigned 990 - legal, but note that reading `raw` before the assignment would be undefined behavior. This is why the initialize-at-declaration style is preferred: it removes the class of bug entirely.',
          '`filtered` starts at 0, so the first filter step has a defined input: (990 - 0) / 4 = 247, and filtered = 0 + 247 = 247.',
          'Output: `raw=990 filtered=247`',
          'The second line of the filter shows assignment building on the previous value - variables are state that changes over time.',
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reading a local variable before assigning it, like `int total; printf("%d", total);`.',
        fix:
          'The variable holds garbage bytes from the stack and reading it is undefined behavior - the compiler may even delete the print. Always initialize at declaration: `int total = 0;`. Build with -Wall; GCC flags "may be used uninitialized" cases.',
      },
      {
        mistake: 'Hard-coding magic numbers deep in the code, like `if (sample > 4095)`.',
        fix:
          'Name them once as `const` with units: `const int ADC_MAX_12BIT = 4095;`. The call site becomes self-documenting, the value is changeable in one place, and a search for the name finds every usage.',
      },
      {
        mistake: 'Naming variables `a`, `x2`, `temp1`, `data2`.',
        fix:
          'Name the quantity and its unit: `sample_counts`, `delay_ms`, `temp_celsius`. Single letters are acceptable only for short-lived, obvious roles like a loop index. Future-you at 2 a.m. is the audience.',
      },
    ],
    guidedPractice: {
      title: 'Refactor magic numbers into constants',
      brief:
        'Take the program below and replace every magic number with a named const. Keep the printed output identical.\n\n```\n#include <stdio.h>\nint main(void) {\n    int s = 4095;\n    printf("pct=%d\\n", (s * 100) / 4095);\n    return 0;\n}\n```',
      starterCode:
          '#include <stdio.h>\n\nint main(void) {\n    int s = 4095;\n    printf("pct=%d\\n", (s * 100) / 4095);\n    return 0;\n}',
      expectedBehavior:
        'For example: `const int ADC_MAX_12BIT = 4095;` and `const int PCT_FULL_SCALE = 100;`, then `printf("pct=%d\\n", (s * PCT_FULL_SCALE) / ADC_MAX_12BIT);`. Output stays `pct=100` because 4095 * 100 / 4095 = 100 exactly.',
      hints: [
        'Pick names that state quantity and unit, not just "max".',
        'Only the literals need to move into consts - the variable s stays a variable because it models a changing sample.',
        '4095 * 100 fits easily in int (max 409500), so no overflow concern at this scale.',
      ],
    },
    practiceExercises: [
      {
        title: 'Declare a sensor inventory',
        brief:
          'Declare and initialize variables for: a 12-bit raw sample (use 3001), a temperature in tenths of a degree (use 235 for 23.5 C), a boolean-style validity flag using int (1 = valid), and a maximum allowed sample. Print all four with matching printf specifiers.',
        expectedBehavior:
          'Four declarations such as `int sample = 3001;`, `int temp_deci_c = 235;`, `int is_valid = 1;`, `const int SAMPLE_MAX = 4095;` and one printf per value. Output: `sample=3001`, `temp_deci_c=235`, `is_valid=1`, `max=4095` (exact labels may differ).',
        hints: [
          'Encode the unit in the name when the type cannot: deci-degrees, counts, millivolts.',
          'The maximum is a design constant - it deserves const.',
          'Every %d must be matched by an int argument, in order.',
        ],
      },
      {
        title: 'Predict then verify',
        brief:
          'Before running, write down the output of:\n\n```\nint a = 5;\nint b = a * 3;\nint a = ...  /* stop: this line is not allowed - why? */\n```\n\nThen write a legal version that changes `a` to 10 after computing `b`, and print both.',
        expectedBehavior:
          'The stopped line is illegal: `a` is already declared in the same block, and re-declaring it is a compile error (redefinition). The legal version assigns instead: `a = 10;` after computing b, then prints `b=15 a=10`.',
        hints: [
          'Declaration creates a name; a second declaration of the same name in the same scope is a redefinition error.',
          'Assignment (a = 10;) changes the value of an existing variable - that is legal anywhere after declaration.',
          'Trace in order: b is computed from the value a held at that moment, which is 5.',
        ],
      },
    ],
    assessment: {
      title: 'Variables and constants checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does an uninitialized local int variable contain when first read?',
          options: ['Always zero', 'Whatever bytes were in that stack location', 'A compiler-generated error value', 'minus one'],
          answer: 'Whatever bytes were in that stack location',
          explanation:
            'Local (automatic) variables are not zeroed; they inherit leftover stack bytes. Reading one is undefined behavior, so the program may print garbage, crash, or be optimized strangely.',
          hint: 'C does not clear locals for you - memory keeps its previous contents.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    const int SCALE = 100;\n    int raw = 8;\n    int pct = raw * SCALE / 10;\n    printf("pct=%d\\n", pct);\n    return 0;\n}',
          options: ['pct=80', 'pct=810', 'pct=8', 'pct=100'],
          answer: 'pct=80',
          explanation:
            'Assignment runs right to left: raw * SCALE / 10 = 8 * 100 / 10 = 800 / 10 = 80. The const SCALE is just a named 100.',
          hint: 'Substitute the constants, then apply * and / left to right.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'After `const int LIMIT = 10;`, the statement `LIMIT = 20;` is a compile error.',
          answer: 'true',
          explanation:
            'const forbids assignment through that name. This is the feature: the compiler enforces the design decision instead of hoping nobody edits the value.',
          hint: 'What was const invented for?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A teammate writes `int t; ... 40 lines ... if (t > 100)`. What is the defect, and what is the one-line fix?',
          answer: 't is read without ever being initialized (garbage value, undefined behavior) - fix by initializing at declaration, e.g. int t = 0;',
          explanation:
            'Uninitialized local reads are undefined behavior in C and a classic source of heisenbugs that appear only in release builds. Initialize at the point of declaration.',
          hint: 'Look for a declaration with no initializer.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Give two concrete reasons to prefer `const int VREF_MV = 3300;` over writing 3300 inline in several places.',
          answer: 'A named constant documents meaning and units at each use site, is changeable in exactly one place, and the compiler rejects accidental writes to it',
          explanation:
            'Names carry semantics (magic numbers do not), single-point change prevents inconsistent edits, and const gets compile-time write protection. Some toolchains can also place const data in flash rather than RAM.',
          hint: 'Think about the next engineer reading the expression, and about needing to change the value later.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Variable', definition: 'A named region of memory holding a value of a stated type, whose contents can change during execution.' },
      { term: 'Declaration', definition: 'The statement that introduces a name and type, e.g. int x; before any use.' },
      { term: 'Initialization', definition: 'Supplying the first value at the moment a variable is created, e.g. int x = 0;.' },
      { term: 'Assignment', definition: 'Replacing the value of an existing variable with =, e.g. x = x + 1;.' },
      { term: 'const', definition: 'A qualifier making assignment to the name a compile error, used for design constants.' },
      { term: 'Magic number', definition: 'An unexplained literal embedded in logic; replaced by named constants in professional code.' },
    ],
    revisionSummary: [
      'Declare before use; initialize at declaration; the three verbs are declare, initialize, assign.',
      'Reading an uninitialized local is undefined behavior - never do it, and let -Wall help you.',
      'const turns design constants into compiler-enforced, self-documenting names.',
      'Magic numbers are replaced by named constants with units in the name.',
      'Names are checked documentation: spell out quantity and unit (millivolts, counts, ms).',
      'Integer division truncates - plan scaling (millivolts, tenths of a degree) around it.',
    ],
    furtherReading: [
      { label: 'cppreference - C declarations', url: 'https://en.cppreference.com/w/c/language/declarations', kind: 'docs' },
      { label: 'cppreference - cv (const) qualification', url: 'https://en.cppreference.com/w/c/language/const', kind: 'docs' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'cpg-m02-l2',
    title: 'Integer Types, Signedness and Two\'s Complement',
    summary:
      'Meet the C integer family, learn how signed values are really stored in two\'s complement, and see how the same byte reads differently as signed or unsigned.',
    objectives: [
      'List the standard integer types (char, short, int, long, long long) and their guaranteed minimum ranges.',
      'Explain two\'s complement encoding and why hardware prefers it.',
      'Show how one byte pattern represents two different values depending on signedness.',
      'State the rule for what happens when converting between signed and unsigned types.',
    ],
    whyItMatters:
      'Hardware does not have numbers - it has bits. A sensor register, an ADC result, a timer counter: all are fixed-width bit patterns, and whether the top bit is a sign or just bit 7 is *your* decision as the programmer. Reading a signed sensor value as unsigned is one of the most common real firmware bugs, and it is invisible unless you understand representation.',
    prerequisites: ['cpg-m02-l1'],
    explanation:
      'C offers integer types of several widths. The standard guarantees minimums; exact sizes are implementation-defined, which is precisely why the fixed-width types of the next lesson exist.\n\n| Type | Guaranteed minimum range | Typical size on common 32/64-bit targets |\n|---|---|---|\n| `char` | -128 to 127 or 0 to 255 | 1 byte |\n| `short` | -32768 to 32767 | 2 bytes |\n| `int` | -32768 to 32767 | 4 bytes |\n| `long` | -2147483648 to 2147483647 | 4 or 8 bytes |\n| `long long` | about -9.2e18 to 9.2e18 | 8 bytes |\n\nEach type also has an `unsigned` variant whose bits all count as magnitude: `unsigned char` on a typical target holds 0 to 255, `unsigned int` 0 to 4294967295. **Signedness decides how the top bit is interpreted** - it does not change how arithmetic circuits work.\n\n### Two\'s complement\n\nNegative values are stored in **two\'s complement** form: to negate x, flip all bits and add 1. In 8 bits, 1 is `0000 0001`; flip gives `1111 1110`; add 1 gives `1111 1111` - so -1 is stored as `0xFF`, the same pattern that unsigned 255 uses. The top bit acts as a sign indicator (1 means negative) but is also a real weight of -128, which is what makes the encoding beautiful for hardware:\n\n- One adder handles signed and unsigned addition alike - the bit patterns just work.\n- There is exactly one zero (`0000 0000`), not two.\n- Comparisons, subtraction and negation reuse the same circuits.\n\nAn 8-bit signed value therefore spans -128 to +127 (asymmetric: one more negative than positive), while unsigned spans 0 to 255. Same 256 patterns, two interpretations.',
    deepDive:
      '### The conversion rule: modulo, not rounding\n\nConverting a signed value to an unsigned type (or to a narrower type) is defined as taking the value modulo 2^N. So `(uint8_t)(-1)` is 255 - not an error, not truncation of a sign, just modulo arithmetic. Converting an unsigned value into a signed type that cannot hold it (like 255 into int8_t) is **implementation-defined**: every mainstream compiler produces the two\'s complement interpretation (-1), but the standard technically lets it vary. The embedded takeaway: whenever data crosses a width or signedness boundary, write the conversion explicitly and know what you asked for.\n\n### Why hardware loves two\'s complement\n\nImagine building a 4-bit ALU. With sign-magnitude encoding, addition needs special cases for signs. With two\'s complement, the adder is a plain ripple-carry circuit for *both* interpretations: adding `1111` (-1 signed) to `0001` (1) gives `1 0000`, and discarding the carry out leaves 0 - correct. The carry bit the ALU reports even tells you whether the unsigned interpretation overflowed, while a separate overflow flag tracks signed overflow. That dual-reporting is exactly what your status register gives you on a real MCU - flags you will use in the bitwise module.\n\n### Sign extension when widths grow\n\nWhen a signed 8-bit value moves into a 16-bit slot, the hardware copies the sign bit into all new high bits (sign extension): -1 as `0xFF` becomes `0xFFFF`, still -1. Unsigned values zero-extend instead: 255 as `0x00FF` becomes `0x00FF`, still 255. C performs these promotions silently whenever a narrow value participates in an expression or a printf argument list - which is why the example below casts explicitly, and why you should too when the interpretation matters.',
    examples: [
      {
        title: 'One byte, two interpretations',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    int8_t  s = -1;    /* stored pattern: 0xFF */\n    uint8_t u = 255;   /* stored pattern: 0xFF */\n\n    printf("s as signed   : %d\\n", (int)s);\n    printf("s as unsigned : %u\\n", (unsigned)(uint8_t)s);\n    printf("u as unsigned : %u\\n", (unsigned)u);\n    printf("u as signed   : %d\\n", (int)(int8_t)u);\n    return 0;\n}',
        explanation: [
          '`int8_t s = -1` and `uint8_t u = 255` store the identical pattern `0xFF` - one byte, eight ones.',
          '`(int)s` promotes with sign extension, so the signed interpretation is preserved: prints `-1`.',
          '`(uint8_t)s` reinterprets the same bits as unsigned (a well-defined modulo conversion): prints `255`.',
          '`u` printed as unsigned is `255` - the natural reading of its own pattern.',
          '`(int8_t)u` asks for the signed interpretation of `0xFF`; on every mainstream two\'s complement compiler this yields `-1` (the conversion is technically implementation-defined, which the printout demonstrates for your machine).',
          'Output:\n```\ns as signed   : -1\ns as unsigned : 255\nu as unsigned : 255\nu as signed   : -1\n```',
        ],
      },
      {
        title: 'Negation by flip-and-add-one',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t bits = 0x05;                  /* five, in bits */\n    uint8_t flipped = (uint8_t)~bits;     /* flip all bits */\n    uint8_t negated = (uint8_t)(flipped + 1u);\n\n    printf("bits    = 0x%02X\\n", (unsigned)bits);\n    printf("flipped = 0x%02X\\n", (unsigned)flipped);\n    printf("negated = 0x%02X (should read as -5)\\n", (unsigned)negated);\n    printf("as int8 = %d\\n", (int)(int8_t)negated);\n    return 0;\n}',
        explanation: [
          'Start with 5 = `0x05`. Flipping all 8 bits gives `0xFA` (250 if read unsigned).',
          'Adding 1 gives `0xFB`. In two\'s complement, `0xFB` read as signed 8-bit is -5 - this is the negate algorithm the ALU itself uses.',
          'The last line asks for the signed interpretation and prints `-5`, confirming the pattern encodes -5.',
          'Output:\n```\nbits    = 0x05\nflipped = 0xFA\nnegated = 0xFB (should read as -5)\nas int8 = -5\n```',
        ],
      },
    ],
    tables: [
      {
        caption: 'The same 8-bit patterns, two interpretations',
        headers: ['Pattern (hex)', 'Binary', 'As signed int8_t', 'As unsigned uint8_t'],
        rows: [
          ['0x7F', '0111 1111', '127', '127'],
          ['0x80', '1000 0000', '-128', '128'],
          ['0xFB', '1111 1011', '-5', '251'],
          ['0xFF', '1111 1111', '-1', '255'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming `int` is always 32 bits (or that `char` is signed).',
        fix:
          'The standard only guarantees minimum ranges, and plain `char` may be signed or unsigned depending on the platform. When width or signedness matters - which for register data is always - use the <stdint.h> fixed-width types from the next lesson.',
      },
      {
        mistake: 'Storing a sensor value like 200 in an `int8_t` (or plain `char`) and reading -56 back out.',
        fix:
          '200 does not fit in signed 8 bits (-128..127); the conversion is modulo 256, yielding the two\'s complement reinterpretation. Choose the type from the range first: any 0..255 quantity needs uint8_t or wider.',
      },
      {
        mistake: 'Comparing a signed and an unsigned value in the same expression, like `if (count < total_u)`.',
        fix:
          'C converts the signed operand to unsigned for the comparison, so a negative count becomes an enormous positive number and the test goes the wrong way. Keep both sides the same signedness, and enable -Wall which warns about exactly this.',
      },
    ],
    guidedPractice: {
      title: 'Complete the interpretation table',
      brief:
        'Without running code, fill in the signed (int8_t) and unsigned (uint8_t) interpretations of: 0x7F, 0x80, 0xFE. Then verify all six cells with a tiny program that casts and prints, following the one-byte-two-interpretations example.',
      starterCode:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t patterns[3] = { 0x7F, 0x80, 0xFE };\n    for (int i = 0; i < 3; i++) {\n        printf("0x%02X signed=%3d unsigned=%3u\\n",\n               (unsigned)patterns[i],\n               (int)(int8_t)patterns[i],\n               (unsigned)patterns[i]);\n    }\n    return 0;\n}',
      expectedBehavior:
        '0x7F: 127 and 127. 0x80: -128 and 128. 0xFE: -2 and 254. The rule: signed values above 0x7F wrap into the negative range - (256 - unsigned_value).',
      hints: [
        '0x7F is the largest positive signed byte; one more flips the sign bit.',
        'For a pattern P with sign bit set, signed value = P - 256 (e.g. 0xFE = 254 - 256 = -2).',
        'The starter code prints both interpretations of each pattern; predict before running.',
      ],
    },
    practiceExercises: [
      {
        title: 'Two\'s complement by hand',
        brief:
          'On paper, compute the 8-bit two\'s complement of 9, 60 and 127: write the binary, flip the bits, add one, and give the result in hex. Verify each with a C program using the negate-by-flip-and-add-one pattern.',
        expectedBehavior:
          '-9 is 0xF7, -60 is 0xC4, -127 is 0x81. Each result printed via (int)(int8_t)pattern must read back as -9, -60 and -127.',
        hints: [
          '9 = 0000 1001 -> flip 1111 0110 -> add 1 -> 1111 0111 = 0xF7.',
          'The trick continues to work at the edge: -127 leaves 0x81, and 0x81 reads back as -127.',
          'Note what happens if you try -128: 0x80 negates to itself. The range is asymmetric.',
        ],
      },
      {
        title: 'Signed or unsigned? Choose for each signal',
        brief:
          'For each quantity, choose a C type and justify in one line: (a) ADC counts 0..4095, (b) temperature -40..125 in degrees, (c) difference between two ADC readings, (d) a byte-wide status register. Write the four declarations.',
        expectedBehavior:
          'Sensible answers: (a) uint16_t - range fits, registers are unsigned; (b) int8_t - range -40..125 fits comfortably; (c) int16_t or int32_t - differences go negative; (d) uint8_t - register bits are unsigned by convention.',
        hints: [
          'Pick the smallest type whose range covers the quantity with margin - but never smaller than correctness.',
          'Differences of unsigned quantities can be negative; that decides (c).',
          'Hardware-facing bit patterns are conventionally unsigned, keeping shifts well-defined.',
        ],
      },
    ],
    assessment: {
      title: 'Representation checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t b = 0xFF;\n    printf("%u %d\\n", (unsigned)b, (int)(int8_t)b);\n    return 0;\n}',
          options: ['255 255', '255 -1', '-1 -1', '256 255'],
          answer: '255 -1',
          explanation:
            'The pattern 0xFF read unsigned is 255; read as int8_t it is -1 in two\'s complement. One byte, two interpretations - exactly the lesson.',
          hint: 'The top bit is a magnitude bit when unsigned and a sign-weight bit when signed.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In two\'s complement, why does hardware prefer this encoding?',
          options: [
            'It makes numbers easier for humans to read',
            'The same adder circuit works for signed and unsigned addition',
            'It allows two representations of zero',
            'It doubles the maximum positive value',
          ],
          answer: 'The same adder circuit works for signed and unsigned addition',
          explanation:
            'Two\'s complement arithmetic is ordinary binary addition with the carry discarded, so one adder serves both interpretations, and there is a unique zero.',
          hint: 'Think about how many distinct ALU circuits a design would need otherwise.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Converting the value -1 to uint8_t gives 255 by definition of the C language.',
          answer: 'true',
          explanation:
            'Conversion to an unsigned type is defined as taking the value modulo 2^N: -1 mod 256 = 255. The result is well-defined; no surprise is permitted.',
          hint: 'Unsigned conversions are modulo arithmetic, not error conditions.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A sensor returns values 0..255. The firmware stores them in `int8_t` and thresholds with `if (value > 100)`. Values above 127 misbehave. Explain the bug and give the minimal fix.',
          answer: 'Values above 127 do not fit in int8_t and are reinterpreted as negative (e.g. 200 becomes -56), so the comparison is false - fix by using uint8_t (or wider) for the value',
          explanation:
            'The type must match the range. Storing 0..255 data in a signed byte corrupts everything above 127; all downstream comparisons see negative numbers.',
          hint: 'Check the range of the type against the range of the data.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'State the guaranteed range of an 8-bit two\'s complement integer and explain in one sentence why it is asymmetric.',
          answer: 'It spans -128 to +127; the asymmetry comes from the sign bit also carrying weight -128, and zero consuming one of the positive-side patterns',
          explanation:
            'The 256 patterns split into 128 negatives (top bit 1, weights including -128) and 128 non-negative patterns of which one is zero, leaving 127 positives.',
          hint: 'Count the patterns: 256 total, one is zero.',
          difficulty: 'hard',
        },
      ],
    },
    keyTerms: [
      { term: 'Two\'s complement', definition: 'The standard encoding for signed integers: negate by flipping all bits and adding 1; the top bit carries weight -2^(N-1).' },
      { term: 'Signedness', definition: 'Whether the top bit of a value contributes a negative weight (signed) or is just another magnitude bit (unsigned).' },
      { term: 'Unsigned conversion', definition: 'Defined in C as taking the value modulo 2^N - e.g. (uint8_t)(-1) is 255.' },
      { term: 'Implementation-defined', definition: 'Behavior the standard deliberately leaves to each compiler, such as converting an out-of-range value to a signed type.' },
      { term: 'Sign extension', definition: 'Copying the sign bit into new high bits when a signed value widens; unsigned values zero-extend instead.' },
      { term: 'Fixed-width type', definition: 'A type with exactly N bits, such as uint8_t from <stdint.h> - covered fully in the next lesson.' },
    ],
    revisionSummary: [
      'The C integer family guarantees minimum ranges only; exact sizes are platform-dependent.',
      'Two\'s complement: negate = flip all bits, add 1; -1 is all ones (0xFF in 8 bits).',
      'One byte pattern has two readings: 0xFF is -1 signed and 255 unsigned.',
      'Signed 8-bit range is -128..127; unsigned is 0..255; the range decides the type.',
      'Signed-to-unsigned conversion is modulo 2^N and well-defined; the reverse is implementation-defined.',
      'Mixed signed/unsigned comparisons silently convert to unsigned - keep sides consistent and use -Wall.',
    ],
    furtherReading: [
      { label: 'Wikipedia - Two\'s complement', url: 'https://en.wikipedia.org/wiki/Two%27s_complement', kind: 'article' },
      { label: 'cppreference - integer types and conversions', url: 'https://en.cppreference.com/w/c/language/arithmetic_types', kind: 'docs' },
      { label: 'Wikipedia - Signed number representations', url: 'https://en.wikipedia.org/wiki/Signed_number_representations', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'cpg-m02-l3',
    title: 'Fixed-Width Types and Integer Overflow',
    summary:
      'Adopt the <stdint.h> types professional firmware uses, then watch an unsigned counter wrap around and understand why signed overflow is undefined behavior instead.',
    objectives: [
      'Use uint8_t, uint16_t, uint32_t, int32_t and friends, and state why firmware prefers them.',
      'Trace unsigned wrap-around arithmetic precisely, bit for bit.',
      'Explain why signed overflow is undefined behavior and how to avoid triggering it.',
      'Select the correct type for a hardware quantity from its documented range.',
    ],
    whyItMatters:
      'Datasheets speak in bits: an ADC result is 12 bits, a timer count is 16 bits, a register is 32 bits. The <stdint.h> types let your code say exactly that - and code that says exactly what it means survives the jump from a 32-bit host to an 8-bit target. Overflow, meanwhile, is where naive C quietly breaks: a millisecond uptime counter that wraps, a sample sum that goes negative. You need both surprises in your mental model before they appear on real hardware.',
    prerequisites: ['cpg-m02-l2'],
    explanation:
      '`<stdint.h>` (C99) defines exact-width integer types - the vocabulary of every modern embedded codebase:\n\n| Type | Bits | Range | Typical firmware use |\n|---|---|---|---|\n| `uint8_t` | 8 | 0..255 | registers, byte buffers, flags |\n| `int8_t` | 8 | -128..127 | small signed samples |\n| `uint16_t` | 16 | 0..65535 | 16-bit ADC/timer results |\n| `int16_t` | 16 | -32768..32767 | signed sensor data |\n| `uint32_t` | 32 | 0..4294967295 | 32-bit registers, ticks, CRCs |\n| `int32_t` | 32 | about -2.1e9..2.1e9 | accumulators, millisecond clocks |\n| `uint64_t` | 64 | 0..about 1.8e19 | microsecond uptime |\n\nTwo related families round it out: *minimum-width* types (`int_least16_t`) and *fast* types (`int_fast8_t`, fastest at least that wide). Also useful: `INT8_MIN`, `INT32_MAX` and similar limit macros, and `intptr_t` for an integer that can hold a pointer.\n\nThe rule is simple: **when the width of the data matters - always, for hardware - name the width.** Use plain `int` only for loop counters and pure host-side arithmetic where no width contract exists.\n\n### Unsigned overflow: wrap-around\n\nUnsigned arithmetic is defined to work modulo 2^N. Add 1 to a uint8_t holding 255 and you get 0 - guaranteed, on every platform. This is not a bug; it is the mathematics of the register, and timer/counter hardware is built on it. The danger is only ever *unintentional* wrap.\n\n### Signed overflow: undefined behavior\n\nIf a *signed* computation leaves the representable range - `INT32_MAX + 1` - the C standard declares the behavior **undefined**. Not "wraps", not "traps": anything may happen, and optimizing compilers exploit that freedom in ways that can delete your overflow checks. The professional response: never write a signed expression that can overflow, and reach for unsigned types when modular behavior is actually wanted.',
    deepDive:
      '### Why the wrap example matters on real MCUs\n\nA 16-bit timer counting a 1 MHz clock wraps every 65.536 ms; firmware that computes elapsed time must handle the wrap with unsigned subtraction - `(now - start)` in modular arithmetic gives the correct short interval even across a wrap, *provided* both operands are unsigned and the interval is shorter than the full period. This exact pattern (free-running counter + modular subtraction) is the heart of every embedded timing library. The same trust in modulo arithmetic is why checksums and hash functions use unsigned types.\n\n### The silent signed/unsigned promotion trap\n\nIn any expression, values narrower than int are promoted to int first. A uint8_t holding 250 plus 1 is computed as int arithmetic (251) and only becomes uint8_t again when stored. That promotion usually saves you, but it has a famous side effect on comparisons: `uint8_t` values in a comparison with a negative int compare as signed. And with `size_t` (the unsigned type of sizeof and array indices), a loop like `for (size_t i = n - 1; i >= 0; i--)` never terminates, because an unsigned value is always >= 0. Termination checks belong on a different invariant for unsigned counters - or use a signed index type.\n\n### Overflow in the other direction: numbers too small\n\nOverflow is not only about the top. `(sample * 3300) / 4096` with sample up to 4095 needs a product up to 13,513,500 - fine for int32_t, hopeless for int16_t. The *intermediate* result, not the operands, decides. When you scale sensor data, compute the worst-case product first and pick a type that holds the intermediate. A frequent embedded idiom: widen before multiplying (`(int32_t)sample * 3300`), narrow only at the store.',
    examples: [
      {
        title: 'Watch a uint8_t wrap around',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t counter = 250;\n\n    for (int i = 0; i < 8; i++) {\n        printf("tick %d: counter = %u\\n", i, (unsigned)counter);\n        counter = (uint8_t)(counter + 1u);\n    }\n    return 0;\n}',
        explanation: [
          '`counter` is a genuine 8-bit unsigned value - exactly the width of a tiny hardware counter.',
          'Each iteration prints first, then adds 1. Addition happens in int arithmetic after promotion (250 + 1 = 251, all representable), and the cast stores the low 8 bits back.',
          'At 255 + 1 the arithmetic gives 256, and storing modulo 256 wraps to 0 - the guaranteed unsigned behavior.',
          'Output:\n```\ntick 0: counter = 250\ntick 1: counter = 251\ntick 2: counter = 252\ntick 3: counter = 253\ntick 4: counter = 254\ntick 5: counter = 255\ntick 6: counter = 0\ntick 7: counter = 1\n```',
        ],
      },
      {
        title: 'Signed limits: printing them, never crossing them',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    printf("INT32_MAX = %d\\n", INT32_MAX);\n    printf("INT32_MIN = %d\\n", INT32_MIN);\n    printf("INT8_MAX  = %d\\n", INT8_MAX);\n    printf("INT8_MIN  = %d\\n", INT8_MIN);\n\n    /* WRONG (do not write): INT32_MAX + 1 is signed overflow,\n       and in C that is undefined behavior - anything may happen.\n       Use a wider type (int64_t) or an unsigned type instead.   */\n\n    int64_t safe = (int64_t)INT32_MAX + 1;\n    printf("INT32_MAX + 1 in int64 = %lld\\n", (long long)safe);\n    return 0;\n}',
        explanation: [
          'The limit macros come from <stdint.h> and name the exact bounds of each fixed-width type - no magic numbers.',
          'Printing them shows the asymmetric two\'s complement ranges: INT32 spans about plus/minus 2.1 billion, INT8 spans -128..127.',
          'The commented block marks the trap: `INT32_MAX + 1` computed in int32_t is undefined behavior, not a guaranteed wrap.',
          'The safe version widens BEFORE the addition: (int64_t)INT32_MAX + 1 = 2147483648, printed with %lld through a long long cast.',
          'Output:\n```\nINT32_MAX = 2147483647\nINT32_MIN = -2147483648\nINT8_MAX  = 127\nINT8_MIN  = -128\nINT32_MAX + 1 in int64 = 2147483648\n```',
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Accumulating many 12-bit samples into a `uint16_t` sum.',
        fix:
          'Work out the worst case: 4096 samples of 4095 each is over 16 million - far beyond 65535. Sum into `uint32_t` (or wider). The intermediate result, not the inputs, picks the type.',
      },
      {
        mistake: 'Writing `for (size_t i = n - 1; i >= 0; i--)` to walk an array backwards.',
        fix:
          'size_t is unsigned, so `i >= 0` is always true and the loop runs forever (it wraps to SIZE_MAX when i hits 0 and decrements). Count down with `while (i-- > 0)` on a size_t, or use a signed index, or walk forwards.',
      },
      {
        mistake: 'Assuming signed overflow wraps "like the hardware does" and writing checks like `if (a + b < a)`.',
        fix:
          'Signed overflow is undefined behavior: the compiler may assume it never happens and optimize the check away. Use unsigned types for modular semantics, wider types for the intermediate, or pre-check with limits (e.g. `if (a > INT32_MAX - b)`).',
      },
    ],
    guidedPractice: {
      title: 'Trace wrap-around arithmetic on paper',
      brief:
        'A uint16_t timer runs at 1 tick per millisecond and free-runs. It reads 65200 now. (1) How many ms until it wraps to 0? (2) It reads 65200 now and 150 after the wrap - what elapsed time should firmware compute with unsigned subtraction (now - start), and why is the modular result correct?',
      expectedBehavior:
        '(1) 65536 - 65200 = 336 ms. (2) In uint16_t arithmetic, 150 - 65200 wraps: 150 + 65536 - 65200 = 486 ms, which is the true elapsed time because the interval (486 ms) is shorter than the full 65536 ms period. This is why elapsed-time code uses unsigned subtraction.',
      hints: [
        'The counter goes 0..65535, so the wrap period is 65536 ticks, not 65535.',
        'Modular subtraction answers "how far ahead is b of a" for free when the interval is shorter than the period.',
        'This only works because the type is unsigned - signed overflow would be UB instead of well-defined wrap.',
      ],
    },
    practiceExercises: [
      {
        title: 'Pick the accumulator type',
        brief:
          'You must average 100 samples, each 0..4095, using integer math. Compute the maximum possible sum, choose the narrowest safe type for the sum, and write the declaration. Then choose the type for a millisecond uptime counter that must not wrap for at least 49 days.',
        expectedBehavior:
          'Max sum = 409500, so uint32_t is the narrowest listed safe accumulator (uint16_t tops out at 65535). For 49 days: 49 * 86400000 ms = 4233600000, which exceeds uint32_t (4294967295 is about 49.7 days - marginal), so a careful engineer chooses uint64_t for headroom.',
        hints: [
          'Worst case first: N * max_value, then compare against 2^N - 1 for each candidate width.',
          'uint32_t holds up to 4294967295 ms = about 49.7 days - right at the edge, which is exactly why real code often jumps to 64 bits.',
          'Naming the requirement numerically (49 * 86400000) is the professional habit.',
        ],
      },
      {
        title: 'Widen before you multiply',
        brief:
          'Convert a 12-bit sample (0..4095) to millivolts with the model mv = sample * 3300 / 4096. Write the conversion with sample stored as uint16_t, making the intermediate safe, and print a result for sample = 4000.',
        expectedBehavior:
          'A correct version: `int32_t mv = (int32_t)sample * 3300 / 4096;` - the product (13,200,000 max) must be computed in 32 bits before dividing. For sample = 4000: 4000 * 3300 = 13,200,000; 13,200,000 / 4096 = 3222 (integer division), so the output is mv=3222.',
        hints: [
          'Compute the worst-case product 4095 * 3300 = 13,513,500 and compare with 32767 - int16 arithmetic would overflow.',
          'Cast the input before the multiply; casting after the divide is too late.',
          '13,200,000 / 4096: 4096 * 3222 = 13,197,312, remainder 2688 - so 3222 it is.',
        ],
      },
    ],
    assessment: {
      title: 'Fixed-width types and overflow checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t c = 255;\n    c = (uint8_t)(c + 1u);\n    printf("c=%u\\n", (unsigned)c);\n    return 0;\n}',
          options: ['c=255', 'c=256', 'c=0', 'c=-1'],
          answer: 'c=0',
          explanation:
            'Unsigned arithmetic is modulo 2^8: 256 mod 256 = 0. The wrap is guaranteed by the standard for unsigned types.',
          hint: '255 is the top of the uint8_t range - what does +1 do modulo 256?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Why is `INT32_MAX + 1` (in int32_t arithmetic) considered a serious bug even though most CPUs wrap silently?',
          options: [
            'Because the result is always zero',
            'Because signed overflow is undefined behavior - the compiler may assume it never happens',
            'Because it triggers an exception on all platforms',
            'Because INT32_MAX is not a constant',
          ],
          answer: 'Because signed overflow is undefined behavior - the compiler may assume it never happens',
          explanation:
            'Undefined behavior licenses optimizations: checks written after an overflow can be deleted, loops restructured, results invented. The hardware usually wraps, but the C program is not obligated to show it.',
          hint: 'UB does not mean "crash" - it means the standard promises nothing at all.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Summing 100 samples of up to 4095 each is safe in a uint16_t accumulator.',
          answer: 'false',
          explanation:
            'The worst case is 409500, far beyond the uint16_t maximum of 65535. The sum needs uint32_t (or wider).',
          hint: 'Multiply the count by the maximum sample and compare with 65535.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'Find the bug: `for (size_t i = n - 1; i >= 0; i--) { process(data[i]); }`',
          answer: 'The loop never terminates - size_t is unsigned so i >= 0 is always true, and when i reaches 0 the decrement wraps to a huge value',
          explanation:
            'An unsigned value cannot be negative, so the termination condition is a tautology. Walk backwards with `while (i-- > 0)` on a size_t, or use a signed index type.',
          hint: 'What are the possible values of any unsigned quantity?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'A datasheet says a register holds a 12-bit unsigned result. Which stdint type do you choose, and why is plain int acceptable only sometimes?',
          answer: 'uint16_t - it exactly covers 0..4095 with room; plain int is usually 32 bits and would work arithmetically, but it does not document the hardware contract and its width is not guaranteed across platforms',
          explanation:
            'Fixed-width types encode the datasheet promise in the code and survive target changes. Using int works by accident of today\'s int being wide enough, which is exactly the kind of accident portability exists to remove.',
          hint: 'Choose the type that states the contract, not one that merely happens to fit.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Fixed-width type', definition: 'A stdint.h type with an exact bit width, such as uint16_t, making data width explicit and portable.' },
      { term: 'Wrap-around', definition: 'Defined unsigned behavior where arithmetic works modulo 2^N: 255 + 1 = 0 for uint8_t.' },
      { term: 'Signed overflow', definition: 'A signed computation leaving its representable range - undefined behavior in C, never a safe wrap.' },
      { term: 'Intermediate result', definition: 'The value computed inside an expression before the final store; its width, not the operands, decides overflow.' },
      { term: 'size_t', definition: 'The unsigned type of sizeof and array sizes; never negative, so never test it against >= 0.' },
      { term: 'Limit macro', definition: 'A named bound such as INT32_MAX from <stdint.h>, used for pre-checks instead of discovering overflow at runtime.' },
    ],
    revisionSummary: [
      'Hardware data has contractual widths - say them with uint8_t/uint16_t/uint32_t/int32_t.',
      'Unsigned arithmetic is modulo 2^N: wrap-around is guaranteed, and modular subtraction computes elapsed time.',
      'Signed overflow is undefined behavior; widen the intermediate or pre-check with limit macros.',
      'The intermediate result of a multiply can overflow even when inputs and output both fit.',
      'size_t is unsigned: loops must test a different invariant than >= 0.',
      'Work out worst-case magnitudes before choosing accumulator types.',
    ],
    furtherReading: [
      { label: 'cppreference - fixed-width integer types (stdint.h)', url: 'https://en.cppreference.com/w/c/types/integer', kind: 'docs' },
      { label: 'Wikipedia - Integer overflow', url: 'https://en.wikipedia.org/wiki/Integer_overflow', kind: 'article' },
      { label: 'Wikipedia - Modular arithmetic', url: 'https://en.wikipedia.org/wiki/Modular_arithmetic', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'cpg-m02-l4',
    title: 'Characters, Floats and Scope',
    summary:
      'Treat char as the small integer it is, learn why floating point accumulates error, and master block scope plus the lifetime difference between automatic and static variables.',
    objectives: [
      'Use char as a one-byte integer and connect characters to their ASCII codes.',
      'Explain why 0.1 cannot be stored exactly in binary floating point and predict the resulting surprise.',
      'Choose float vs double deliberately and print them with correct specifiers.',
      'Predict which names are visible where (scope) and how long each variable lives (lifetime), including static locals.',
    ],
    whyItMatters:
      'Characters are how protocols speak (every UART command is a char stream), floats are how sensors lie (a 0.1 that is not 0.1), and scope is how big programs stay sane. This lesson closes out the type system with the three tools you will touch daily: reading ASCII, comparing floats safely, and keeping names local.',
    prerequisites: ['cpg-m02-l3'],
    explanation:
      '### char: a byte that sometimes means a letter\n\n`char` is a one-byte integer. When it holds `A`, it literally holds the number 65 (the ASCII code), and you may do arithmetic on it: `c + 1` is 66, the code of `B`. Whether plain `char` behaves signed or unsigned is platform-defined - one more reason the explicit `int8_t`/`uint8_t` exist when the numeric role matters. Char literals are written with single quotes: `\'A\'`, `\'0\'`, `\'\\n\'`. Note that `\'0\'` is the character code 48, not the number 0, and that the string form `"0"` is a two-byte array (digit plus terminator) - a distinction with its own lesson in module 7.\n\n### float and double: close, not exact\n\nFloating-point types store values in the form sign * mantissa * 2^exponent - binary fractions. The consequence that surprises everyone: numbers like 0.1 have no exact binary form (like 1/3 in decimal, the bits repeat forever), so `0.1` is stored as the nearest representable value - a hair off. Most arithmetic inherits the hair. Rule of thumb for firmware: use floats where a sensor model is genuinely fractional and approximate is fine; avoid them for money-like exactness, loop counters, and equality tests. When you must compare, test the distance: `if (fabsf(a - b) < 0.0001f)`. `float` is typically 32-bit (about 7 decimal digits), `double` 64-bit (about 15) - and on many small MCUs, only float is supported in hardware, so double costs software emulation.\n\n### Scope and lifetime\n\n**Scope** answers "where can this name be seen?" A variable declared inside a block `{ ... }` is visible from its declaration to the end of that block. Inner blocks can declare their own variables, even shadowing outer names (legal, but confusing - avoid). **Lifetime** answers "when does the storage exist?" Automatic variables (the default) are created when their block is entered and destroyed when it exits - each call to a function gets fresh ones. A `static` local is scoped to its function but lives for the whole program run, remembering its value between calls - perfect for a "how many times have I been called" counter, and the closest thing C has to a private module variable.',
    deepDive:
      '### Why binary fractions cannot hold 0.1\n\nA float stores numbers as m * 2^e with a limited mantissa (24 bits for float). In binary, 0.1 = 0.000110011001100... with the pattern 0011 repeating forever - exactly like 1/3 in decimal. Rounding to 24 significant bits gives 0.100000001490116... The error is tiny but not zero, and it propagates into every sum and product: 0.1f + 0.2f is 0.30000001, and running accumulations let these last-bit errors grow step by step. This is not a C defect but the nature of binary fractions - the same behavior lives in every language on the same hardware. Embedded consequence: comparisons against float literals must use tolerances, and accumulated quantities (integrals, running averages) need error budgets.\n\n### static locals: state with a small footprint\n\nA static local lives in the same memory as globals (the data segment - meet it in module 10) but its *name* is visible only inside its function. That combination is exactly right for things like a sample counter inside a sensor driver: no other file can collide with the name, yet the value persists across calls. The cost is hidden state: functions with static locals are not reentrant, which matters the moment interrupts or RTOS tasks share them. Embedded style guides often restrict static locals to deliberately-owned module state, documented as such.\n\n### Shadowing: the name that lied\n\nDeclaring `int count;` inside an inner block when an outer `count` exists creates two independent variables; inside the block, every mention means the inner one. Compilers allow it; reviewers flag it. If two quantities deserve the same name, they are either the same quantity (use one variable) or they deserve distinguishing names. Build with `-Wshadow` to make the compiler enforce this.',
    examples: [
      {
        title: 'char is a small integer',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    char letter = \'A\';\n    char next = (char)(letter + 1);\n    char digit_zero = \'0\';\n\n    printf("letter = %c code = %d\\n", letter, letter);\n    printf("next = %c code = %d\\n", next, next);\n    printf("digit char \'0\' as number = %d\\n", digit_zero);\n    return 0;\n}',
        explanation: [
          '`letter` holds the number 65; `%c` prints it as a character (A) and `%d` prints the same byte as its code (65).',
          '`(char)(letter + 1)` - the addition happens in int, then the cast narrows it back: 66, the code of B.',
          '`\'0\'` is ASCII 48. Converting digit characters to numbers is later done exactly like this: subtract \'0\'.',
          'Output:\n```\nletter = A code = 65\nnext = B code = 66\ndigit char \'0\' as number = 48\n```',
        ],
      },
      {
        title: 'The 0.1 surprise, measured in float and double',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    float f = 0.1f + 0.2f;\n    double d = 0.1 + 0.2;\n\n    printf("float, 1 dp : %.1f\\n", f);\n    printf("float, 8 dp : %.8f\\n", f);\n    printf("double, 17 dp: %.17f\\n", d);\n    return 0;\n}',
        explanation: [
          '`0.1f` and `0.2f` are the nearest floats to those decimals; their exact sum falls between two floats, and rounding lands on the float 0.300000011920929, not exactly 0.3.',
          'Printed to one decimal it looks perfect (`0.3`); printed to eight decimals the representation error shows: `0.30000001`.',
          'The double computation repeats the story with more bits: 0.1 + 0.2 in double is the famous 0.30000000000000004, visible only when printed to 17 decimals.',
          'Accumulating many such additions lets these last-bit errors grow, which is why running sums of float data need an error budget - and why comparisons use tolerances, never ==.',
          'Output:\n```\nfloat, 1 dp : 0.3\nfloat, 8 dp : 0.30000001\ndouble, 17 dp: 0.30000000000000004\n```',
        ],
      },
      {
        title: 'Block scope in action',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int outer = 10;\n\n    {\n        int inner = 5;\n        printf("inner block: outer=%d inner=%d\\n", outer, inner);\n    }\n\n    printf("after block: outer=%d\\n", outer);\n    return 0;\n}',
        explanation: [
          '`outer` is visible for the whole function body, including inside the bare inner block.',
          '`inner` is created at its declaration inside the block and destroyed at the closing brace - it does not exist outside.',
          'The second printf can no longer name `inner`; using it there would be a compile error (undeclared identifier).',
          'Output:\n```\ninner block: outer=10 inner=5\nafter block: outer=10\n```',
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Testing floats for exact equality: `if (average == 0.3f)`.',
        fix:
          'Rounding makes exact equality unreliable. Compare against a tolerance: `if (fabsf(average - 0.3f) < 1e-4f)` (include <math.h>). Reserve == for integers.',
      },
      {
        mistake: 'Confusing `\'0\'` and `0`, or `\'\\n\'` and `"\\n"`.',
        fix:
          '`\'0\'` is the character code 48; `0` is the number zero. `\'\\n\'` is one byte (code 10); `"\\n"` is a string of two bytes. Single quotes build one character, double quotes build a string - module 7 expands on the string side.',
      },
      {
        mistake: 'Letting an inner block redeclare an outer name (`int count;` twice, nested).',
        fix:
          'Shadowing compiles but misleads: inside the block, the outer variable is unreachable even though it still exists. Rename one of them, and consider -Wshadow to make the compiler flag every occurrence.',
      },
    ],
    guidedPractice: {
      title: 'Build a digit-to-value converter',
      brief:
        'A UART sends the digit characters \'4\', \'0\', \'9\', \'6\'. Convert each to its numeric value by subtracting \'0\', sum them, and print both the running sum and each character with its code.',
      starterCode:
          '#include <stdio.h>\n\nint main(void) {\n    char digits[4] = { \'4\', \'0\', \'9\', \'6\' };\n    int sum = 0;\n\n    for (int i = 0; i < 4; i++) {\n        int value = digits[i] - \'0\';\n        sum += value;\n        printf("char %c code %d value %d sum %d\\n",\n               digits[i], digits[i], value, sum);\n    }\n    printf("total = %d\\n", sum);\n    return 0;\n}',
      expectedBehavior:
        'Codes are 52, 48, 57, 54; values are 4, 0, 9, 6; running sums 4, 4, 13, 19; final `total = 19`. Note digits[i] passed to %c prints the letter, and the same expression passed to %d prints its code - the variable is one byte, the format chooses the view.',
      hints: [
        'ASCII \'0\' is 48, so \'4\' (52) - \'0\' = 4. The subtraction is the whole trick.',
        'One expression can be printed twice with different specifiers: %c shows the glyph, %d shows the number.',
        'Check the arithmetic: 4 + 0 + 9 + 6 = 19.',
      ],
    },
    practiceExercises: [
      {
        title: 'Tolerance-based comparison',
        brief:
          'Compute `float x = 0.1f * 3.0f;` and test it against 0.3f twice: once with `==` and once with a tolerance of 1e-6f. Print a line for each test reporting which one accepted the value, and explain the result in a comment.',
        expectedBehavior:
          'The == test may accept or reject depending on rounding (0.1f * 3.0f rounds to the float 0.300000011920929, and 0.3f is the same float - so == often passes here), which is exactly the fragility the tolerance test removes: it accepts regardless of last-bit rounding. The lesson: == on floats is a coin flip across compilers and optimizations.',
        hints: [
          'Include <math.h> for fabsf.',
          'Write the tolerance test as `fabsf(x - 0.3f) < 1e-6f`.',
          'The point is not which way == falls on one compiler - it is that the outcome is not guaranteed, so professionals do not use it.',
        ],
      },
      {
        title: 'static call counter',
        brief:
          'Write a function `int next_id(void)` containing a static local counter that starts at 1 and increases by one per call. Call it three times from main and print each result. Predict the output first.',
        expectedBehavior:
          'The static local initializes once, before any call, and persists: the outputs are 1, then 2, then 3. Rewriting `static int id = 1;` as plain `int id = 1;` would print 1, 1, 1 - the automatic variable is recreated each call.',
        hints: [
          'Declaration: `static int id = 1;` inside the function body.',
          'The initializer of a static local runs exactly once, not per call.',
          'Predict before running - then try removing the static keyword to see the contrast.',
        ],
      },
    ],
    assessment: {
      title: 'Characters, floats, scope checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    char c = \'C\';\n    printf("%c %d\\n", c, c);\n    return 0;\n}',
          options: ['C 67', 'C 3', '67 C', 'C 99'],
          answer: 'C 67',
          explanation:
            'char c holds the ASCII code of C, which is 67. %c renders the glyph, %d renders the numeric code - same byte, two views.',
          hint: 'ASCII uppercase letters start at A = 65.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Why should float values never be compared with ==?',
          options: [
            'Because floats are slower than ints',
            'Because rounding means two mathematically equal values may differ in their last bits',
            'Because == is not defined for floats',
            'Because floats are always unsigned',
          ],
          answer: 'Because rounding means two mathematically equal values may differ in their last bits',
          explanation:
            'Binary floating point cannot represent decimals like 0.1 exactly, so computed paths that should agree can land one unit-in-the-last-place apart. Compare with a tolerance: fabsf(a - b) < eps.',
          hint: 'Recall what 0.1f + 0.2f printed at eight decimals.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A `static` local variable is created fresh every time its function is called.',
          answer: 'false',
          explanation:
            'A static local is initialized once and lives for the whole program run - it remembers its value between calls. Automatic locals are the ones recreated per call.',
          hint: 'Which storage duration does the static keyword select?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'This code compiles but prints the wrong thing for the digit test. Find and fix it.\n\n```\nchar c = \'7\';\nif (c == 7) {\n    printf("seven\\n");\n}\n```',
          answer: 'c == 7 compares the character code 55 against the number 7 - the test should be c == \'7\' (or c - \'0\' == 7)',
          explanation:
            'The character 7 is the byte 55, not the integer 7. Character comparisons must use character literals; converting a digit character to its numeric value requires subtracting \'0\'.',
          hint: 'What number does the byte actually hold?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'A variable is declared inside an inner block. State where its name is visible (scope) and when its storage disappears (lifetime).',
          answer: 'The name is visible from its declaration to the end of the inner block only, and the storage is destroyed when the block exits (automatic lifetime)',
          explanation:
            'Scope is lexical - the region of code that can see the name; lifetime is temporal - when the object exists. Automatic locals tie the two together: block exit ends both.',
          hint: 'Two different questions: who can see it, and when does it stop existing.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'ASCII', definition: 'The standard byte code mapping characters to numbers: A is 65, a is 97, 0 is 48.' },
      { term: 'char literal', definition: 'A single character in single quotes, such as A or \\n, whose value is its byte code.' },
      { term: 'Floating point', definition: 'Representation as sign, mantissa and binary exponent; exact for binary fractions, approximate for decimals like 0.1.' },
      { term: 'Scope', definition: 'The region of source code in which a name can be referenced.' },
      { term: 'Lifetime', definition: 'The span of execution during which an object exists: automatic (per block) or static (whole program).' },
      { term: 'static local', definition: 'A function-local variable with static lifetime - remembers its value across calls, visible only inside its function.' },
    ],
    revisionSummary: [
      'char is a one-byte integer; char literals are single-quoted and digit characters need - \'0\' to become numbers.',
      'Binary floating point stores 0.1 approximately; compare floats with a tolerance, never ==.',
      'float is about 7 significant digits, double about 15; printf needs %f/%e/%g (floats promote to double).',
      'Scope is where a name is visible; lifetime is when storage exists - block exit ends automatic variables.',
      'static locals persist across calls with function-only visibility: ideal for module-private counters.',
      'Avoid shadowing outer names in inner blocks; -Wshadow turns the hazard into a build message.',
    ],
    furtherReading: [
      { label: 'Wikipedia - IEEE 754 floating point', url: 'https://en.wikipedia.org/wiki/IEEE_754', kind: 'article' },
      { label: 'Wikipedia - ASCII', url: 'https://en.wikipedia.org/wiki/ASCII', kind: 'article' },
      { label: 'Wikipedia - Scope (computer programming)', url: 'https://en.wikipedia.org/wiki/Scope_(computer_programming)', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
