import type { TutorialLesson } from '../types';

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'cpg-m03-l1',
    title: 'Arithmetic, Relational and Logical Operators',
    summary:
      'Master the everyday operator set - arithmetic, comparison, logic, compound assignment - and the precedence rules that silently rewire expressions you thought you wrote.',
    objectives: [
      'Use +, -, *, / and % correctly on integers, predicting truncation and remainder.',
      'Evaluate expressions with relational and logical operators, including short-circuit behavior.',
      'Recite the precedence tiers that matter and use parentheses to make intent undeniable.',
      'Diagnose the classic `flags & 0x04 == 0` precedence bug on sight.',
    ],
    whyItMatters:
      'Before you touch a single register you must be fluent in the operators every line of C uses. The majority of real-world firmware bugs in expression logic come from two things: integer division truncating when the author expected a fraction, and precedence quietly grouping an expression differently than the author read it. Both are preventable with the habits in this lesson.',
    prerequisites: ['cpg-m02-l1', 'cpg-m02-l2'],
    explanation:
      'C operators come in families, and reading an expression means knowing both the family and the binding order.\n\n### Arithmetic: +, -, *, /, %\n\nAddition, subtraction and multiplication behave as expected on integers. Division `/` between two integers **truncates toward zero**: `7 / 2` is 3, `-7 / 2` is -3. The `%` operator yields the **remainder**: `7 % 2` is 1, `-7 % 2` is -1 (the sign follows the left operand in C99). Together they decompose numbers: `reading / 10` shifts the decimal, `reading % 10` isolates the last digit. Dividing or taking the remainder by zero is undefined behavior - guard it.\n\n### Relational: == != < > <= >=\n\nEach comparison produces an int: 1 for true, 0 for false. Beware the two classics. First, `=` assigns and `==` compares - `if (x = 5)` assigns 5, yields 5 (truthy), and silently corrupts x; good compilers warn, so read the warnings. Second, `a < b < c` does not chain: it parses as `(a < b) < c`, comparing a 0-or-1 result with c. Chained tests need `&&`.\n\n### Logical: && || !\n\n`&&` and `||` operate on truthiness (zero is false, anything else is true) and **short-circuit**: `&&` never evaluates its right side if the left is false; `||` never evaluates its right side if the left is true. This is a control-flow feature, not an optimization detail - it is how you write `if (p != 0 && *p > 10)` safely, because `*p` is only touched when p was checked. `!` inverts truthiness.\n\n### Assignment operators: = += -= *= /= %= &= |= ^= <<= >>=\n\n`x += 4` is `x = x + 4`; every binary operator has a compound form. They are shorthand, not new semantics - and they make read-modify-write patterns (`flags |= mask`) read as one idea.',
    deepDive:
      '### Precedence: the tiers that actually matter\n\nThe full C precedence table has 15 rows; four trouble spots cause most accidents. From tighter to looser binding: (1) unary `! ~ ++ --` bind tightest; (2) `* / %` bind tighter than `+ -`; (3) **shifts bind looser than arithmetic but tighter than comparisons**; (4) **comparisons (< <= > >=) bind tighter than equality (== !=)**, which bind tighter than `&`, then `^`, then `|`, then `&&`, then `||`, with plain assignment loosest of all. The disastrous consequence: `x & 3 == 1` parses as `x & (3 == 1)` because `==` binds tighter than `&` - the mask becomes `x & 0`. Any expression mixing bitwise and comparison operators needs explicit parentheses, full stop.\n\n### Why % matters in firmware\n\nRemainder is how software builds hardware-shaped structures: `sample % BUFFER_SIZE` turns an ever-increasing index into a circular buffer position; `ms % 1000 == 0` fires a once-per-second task from a millisecond tick. In both cases the modulus is a power of two on many systems, and some codebases write `& (SIZE - 1)` instead because bitwise AND is cheaper than division - an optimization you will be able to read (and judge) after the next lesson.\n\n### Evaluation order and side effects\n\nC fixes precedence and associativity, but for most binary operators it does NOT fix which operand is evaluated first - `f() + g()` may run f or g first. Operators with a defined order: `&&`, `||`, `,` (left first) and `?:`. If an operand has a side effect another operand depends on, you have a bug regardless of precedence. The style rule that prevents the whole class: one side effect per statement, no `++` inside larger expressions, no `i + i++` anywhere, ever.',
    examples: [
      {
        title: 'Decomposing a reading with / and %',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int reading = 247;\n\n    int hundreds = reading / 100;\n    int tens     = (reading / 10) % 10;\n    int ones     = reading % 10;\n\n    printf("reading = %d\\n", reading);\n    printf("digits  = %d, %d, %d\\n", hundreds, tens, ones);\n    return 0;\n}',
        explanation: [
          '`reading / 100` is 247 / 100 = 2 - integer division discards the remainder, which is exactly the hundreds digit.',
          '`(reading / 10) % 10`: the division gives 24 (dropping the ones digit), then % 10 keeps the last digit of that, 4. The parentheses document the two steps.',
          '`reading % 10` is the remainder 7 - the ones digit.',
          'This / and % pair is the standard way to split a number into digits for display on seven-segment or character LCDs.',
          'Output:\n```\nreading = 247\ndigits  = 2, 4, 7\n```',
        ],
      },
      {
        title: 'The precedence bug, reproduced and fixed',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int flags = 0x01;   /* bit 0 set, bit 2 clear */\n\n    int wrong = flags & 0x04 == 0;   /* parses as flags & (0x04 == 0) */\n    int right = (flags & 0x04) == 0;\n\n    printf("wrong = %d\\n", wrong);\n    printf("right = %d\\n", right);\n    return 0;\n}',
        explanation: [
          'The intent of both lines is "is bit 2 clear?" - but the first one is a real bug that compiles.',
          '`0x04 == 0` binds tighter than `&`, so it evaluates first to 0; then `flags & 0` gives 0. The test always yields 0 regardless of the flags value.',
          'The fixed version applies the mask first: `flags & 0x04` is `0x01 & 0x04` = 0, and `0 == 0` is 1.',
          'GCC with -Wall even warns: "suggest parentheses around comparison in operand of &" - the compiler is telling you it grouped differently than a human would read.',
          'Output:\n```\nwrong = 0\nright = 1\n```',
        ],
      },
      {
        title: 'Short-circuit evaluation as a guard',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int count = 0;\n    int total = 120;\n\n    /* The && short-circuits: the division only runs\n       when count is nonzero, so no divide-by-zero. */\n    if (count != 0 && total / count > 10) {\n        printf("busy\\n");\n    } else {\n        printf("idle or unchecked\\n");\n    }\n    return 0;\n}',
        explanation: [
          'The left operand `count != 0` is false, so `&&` skips the right operand entirely - `total / count` never executes.',
          'Without short-circuiting this would be a division by zero, which is undefined behavior; the guard pattern makes the check and the use one indivisible expression.',
          'The same pattern guards pointer dereferences (`p != 0 && p->ready`), which becomes essential in module 8.',
          'Output: `idle or unchecked`',
        ],
      },
    ],
    tables: [
      {
        caption: 'Precedence tiers you must know (tightest first)',
        headers: ['Tier', 'Operators', 'Grouping'],
        rows: [
          ['Unary', '! ~ ++ - (cast) sizeof', 'right to left'],
          ['Multiplicative', '* / %', 'left to right'],
          ['Additive', '+ -', 'left to right'],
          ['Shift', '<< >>', 'left to right'],
          ['Relational', '< <= > >=', 'left to right'],
          ['Equality', '== !=', 'left to right'],
          ['Bitwise AND', '&', 'left to right'],
          ['Bitwise XOR, OR', '^ then |', 'left to right'],
          ['Logical AND, OR', '&& then ||', 'left to right'],
          ['Assignment', '= += -= &= |= ^= <<= >>= *= /= %=', 'right to left'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing `if (x = 5)` when meaning `if (x == 5)`.',
        fix:
          '`=` assigns and yields the assigned value (5, truthy), so the branch always runs and x is corrupted. Let -Wall catch it ("suggest parentheses around assignment used as truth value"), and consider the discipline of writing constant comparisons as `5 == x` so a typo becomes a compile error.',
      },
      {
        mistake: 'Chaining comparisons: `if (0 <= v <= 1023)`.',
        fix:
          'This parses as `(0 <= v) <= 1023`, and since `0 <= v` is 0 or 1, the whole thing is always true. Write both tests explicitly: `if (v >= 0 && v <= 1023)`.',
      },
      {
        mistake: 'Using `/` and expecting a fractional result on integers: `float avg = total / n;` with ints.',
        fix:
          'The division happens in int arithmetic BEFORE the assignment, so 7 / 2 is 3 even though avg is a float. Cast one operand first: `float avg = (float)total / n;` - or keep scaled integers (module 2 style) when the platform avoids floating point.',
      },
      {
        mistake: 'Assuming both operands of an expression are always evaluated, like `f() && g()` where g must run.',
        fix:
          '`&&` and `||` skip their right operand when the left decides the result. If the right side has a required side effect (a read that clears a flag, a state update), move it to its own statement.',
      },
    ],
    guidedPractice: {
      title: 'Predict, then verify: expressions on one reading',
      brief:
        'Given `int v = 1030;`, predict the value of each expression on paper, then check with printf: (a) `v / 100`, (b) `v % 100`, (c) `v / 1000 == 1`, (d) `v > 512 && v < 2000`, (e) `!(v % 2)`, (f) `v % 10 * 3`.',
      starterCode:
          '#include <stdio.h>\n\nint main(void) {\n    int v = 1030;\n    printf("a=%d\\n", v / 100);\n    printf("b=%d\\n", v % 100);\n    printf("c=%d\\n", v / 1000 == 1);\n    printf("d=%d\\n", v > 512 && v < 2000);\n    printf("e=%d\\n", !(v % 2));\n    printf("f=%d\\n", v % 10 * 3);\n    return 0;\n}',
      expectedBehavior:
        '(a) 10 (truncated). (b) 30. (c) 1 - v/1000 is 1, which equals 1. (d) 1 - both comparisons hold. (e) 1 - v % 2 is 0, and !0 is 1 (even test). (f) 0 * 3 = 0, because % binds tighter than *, so the ones digit times 3 - v ends in 0.',
      hints: [
        'For (c): does the division or the comparison happen first, per the table?',
        'For (e): % binds tighter than !, so the expression is !(v % 2) - the classic even/odd test.',
        'For (f): % and * have the same tier and group left to right, so it is (v % 10) * 3.',
      ],
    },
    practiceExercises: [
      {
        title: 'Range checker with one guard',
        brief:
          'Write a program with `int sample = 2048;` that prints three lines using && and ||: whether the sample is in range 0..4095, whether it is out of that range, and whether it is in the bottom or top quarter of the range. Use no if statements - print the 0/1 results directly.',
        expectedBehavior:
          'For 2048: in_range=1, out_of_range=0, edge_quarter=1 (2048 is exactly the top of the third quarter and the bottom of the fourth: `(sample < 1024) || (sample >= 3072)` is false; a correct top-or-bottom-quarter test for 0..4095 in quarters of 1024 is `sample < 1024 || sample > 3071`, which for 2048 is 0). Your printed numbers must match the expressions you chose - state the quarter boundaries in a comment.',
        hints: [
          'Name each predicate in a variable first: `int in_range = sample >= 0 && sample <= 4095;`.',
          'The negation of a range is where De Morgan lives: !(a && b) is !a || !b.',
          'Quarters of 0..4095 are 0..1023, 1024..2047, 2048..3071, 3072..4095 - pick boundaries and test them by hand.',
        ],
      },
      {
        title: 'Break the expression on purpose',
        brief:
          'Write `int bit2 = flags & 0x04 == 0;` with flags = 0x04, print it, then add the parenthesized correct version and print both. Also compile with -Wall and record the exact warning text.',
        expectedBehavior:
          'With flags = 0x04: wrong = 0x04 & (0x04 == 0) = 0x04 & 0 = 0; right = (0x04 & 0x04) == 0 = 4 == 0 = 0. Both are 0 for this input, which is the insidious part - the bug hides until flags has bit 2 clear. GCC -Wall reports something like "suggest parentheses around comparison in operand of &".',
        hints: [
          'Evaluate the == first for the unparenthesized version - it binds tighter than &.',
          'Choose a second flags value (bit 2 clear) that separates the two results, like 0x01.',
          'Reading the warning text is the point: the compiler saw a different expression than you wrote.',
        ],
      },
    ],
    assessment: {
      title: 'Operators checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    int v = 1234;\n    printf("%d %d %d\\n", v / 1000, v / 100 % 10, v % 10);\n    return 0;\n}',
          options: ['1 2 4', '1 23 4', '1 2 3', '12 3 4'],
          answer: '1 2 4',
          explanation:
            'v / 1000 = 1 (thousands). v / 100 = 12, then % 10 = 2 (hundreds). v % 10 = 4 (ones). Division peels high digits, remainder peels low ones.',
          hint: 'Work each expression separately: / first, then %.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What does the expression `x & 0x08 == 0x08` actually compute?',
          options: [
            'Whether bit 3 of x is set',
            'x & 1, because 0x08 == 0x08 evaluates to 1 first',
            'A compile error - the expression is illegal',
            'x shifted right by 8',
          ],
          answer: 'x & 1, because 0x08 == 0x08 evaluates to 1 first',
          explanation:
            'Equality binds tighter than bitwise AND, so the expression is x & (0x08 == 0x08) = x & 1 - it tests bit 0, not bit 3. Mask-and-compare expressions always need parentheses.',
          hint: 'Where does == sit in the precedence table relative to &?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In `if (p != 0 && *p > 10)`, the dereference *p is guaranteed never to run when p is 0.',
          answer: 'true',
          explanation:
            '&& short-circuits: a false left operand means the right operand is not evaluated at all. This guard pattern is the standard way to make a check and its dependent use atomic.',
          hint: 'Short-circuit evaluation is a semantic guarantee, not an optimization.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'Find the bug: `if (0 < v < 4096) { accept(v); }`',
          answer: 'The comparison chains wrongly - it parses as (0 < v) < 4096, and since 0 < v is 0 or 1 the condition is always true - write v > 0 && v < 4096',
          explanation:
            'C has no chained comparison syntax. The left comparison produces 0 or 1, which then compares against 4096 and always passes, so accept() runs for every v.',
          hint: 'What type does a comparison produce, and what happens when you compare that?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Explain in one sentence why `float avg = total / n;` with int total and n can still be wrong, and give the fix.',
          answer: 'The division executes in int arithmetic (truncating) before the assignment to the float - fix by casting one operand, e.g. (float)total / n',
          explanation:
            'Types are decided per-expression: int / int is an int. The float on the left only receives the already-truncated value. Cast before the division to force floating-point arithmetic.',
          hint: 'When does the truncation happen relative to the assignment?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Integer division', definition: 'The / of two integers, truncating toward zero: 7 / 2 is 3.' },
      { term: 'Remainder', definition: 'The % operator; 7 % 2 is 1. Dividing by zero is undefined behavior.' },
      { term: 'Short-circuit evaluation', definition: '&& and || skip the right operand when the left already decides the result - a guarantee you can build guards on.' },
      { term: 'Precedence', definition: 'The binding tightness of operators; == binds tighter than &, which is the source of the classic mask-test bug.' },
      { term: 'Compound assignment', definition: 'Operators like += and |= combining an operation with assignment: flags |= mask is flags = flags | mask.' },
      { term: 'Truthiness', definition: 'Zero means false, any nonzero value means true, everywhere C asks for a condition.' },
    ],
    revisionSummary: [
      'Integer / truncates toward zero; % gives the remainder and together they decompose numbers.',
      'Relational operators produce int 0 or 1; never chain comparisons, never confuse = with ==.',
      '&& and || short-circuit - build guard patterns on that guarantee.',
      'Precedence tiers from tight to loose: unary, * / %, + -, shifts, relational, equality, &, ^, |, &&, ||, assignment.',
      'Any expression mixing & with == needs explicit parentheses - or it computes something else entirely.',
      'Compile with -Wall: the compiler flags assignment-in-condition and comparison-in-& grouping.',
    ],
    furtherReading: [
      { label: 'cppreference - C operator precedence', url: 'https://en.cppreference.com/w/c/language/operator_precedence', kind: 'docs' },
      { label: 'Wikipedia - Modulo operation', url: 'https://en.wikipedia.org/wiki/Modulo_operation', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'cpg-m03-l2',
    title: 'Bitwise AND, OR, XOR and NOT',
    summary:
      'Work the four bitwise operators on whole bytes, learn the algebra of XOR, and read hex literals the way register datasheets write them.',
    objectives: [
      'Compute &, |, ^ and ~ on 8-bit values by hand, lane by lane.',
      'State the XOR identities (x ^ x = 0, x ^ 0 = x, self-inverse) and name two uses of each.',
      'Read and write hexadecimal literals fluently, mapping each hex digit to four bits.',
      'Explain why ~ requires masking when narrow types are involved.',
    ],
    whyItMatters:
      'Bitwise operators are the screwdrivers of embedded C. Configuration registers, interrupt masks, checksums, peripheral enables - all are manipulated with &, |, ^ and ~. Datasheets describe hardware in hex and bit numbers; this lesson is where your eyes learn to see a byte as eight independently addressable switches.',
    prerequisites: ['cpg-m03-l1'],
    explanation:
      'The bitwise operators apply a one-bit logic function to each bit position independently - like eight tiny gates running in parallel across a byte.\n\n### The four operators on one lane\n\n- `&` (AND): 1 only when both bits are 1. Used to **keep** selected bits and zero the rest - "masking".\n- `|` (OR): 1 when at least one bit is 1. Used to **switch on** selected bits without disturbing others.\n- `^` (XOR): 1 when the bits differ. Used to **flip** selected bits, and as the workhorse of checksums and compare-equal tricks.\n- `~` (NOT): flips every bit of the operand. Used to build "everything except" masks for clearing.\n\n### Hex is the native notation\n\nDatasheets write registers in hex because each hex digit is exactly four bits: `0xF0` is `1111 0000` at a glance. Learn the sixteens: A=1010, C=1100, F=1111, and you can read any mask mentally. This course writes bit patterns with a space every nibble (`0b`-style thinking, expressed in hex) - and when C23-style `0b` literals are unavailable, hex is the portable spelling.\n\n### A worked byte\n\nWith `a = 0xF0` (1111 0000) and `b = 0x3C` (0011 1100): AND keeps only lanes where both are 1 -> `0x30`; OR lights any lane that is 1 in either -> `0xFC`; XOR keeps lanes that differ -> `0xCC`; NOT of a -> `0x0F`. Every register operation you will ever write decomposes into these four motions plus shifts (next lesson).\n\n### XOR algebra\n\nXOR is its own inverse: `x ^ x = 0`, `x ^ 0 = x`, and applying the same XOR twice restores the original. That algebra makes XOR the tool for (1) **toggling** bits (`reg ^= mask` flips exactly the masked bits), (2) **checksums** - XOR all bytes of a message and any single-bit corruption changes the result, the scheme used in NMEA GPS sentences, and (3) swapping two values without a temporary (a party trick worth understanding, rarely worth writing).',
    deepDive:
      '### ~ and the promotion trap\n\n`~` operates on the promoted type. For a `uint8_t mask`, the expression `~mask` is computed in (typically 32-bit) int: `~0x02` is 0xFFFFFFFD, not 0xFD. Assigning that to a uint8_t takes the low byte and you get the 0xFD you wanted - but understanding *why* protects you when the pattern is used inside a wider expression, where the high one-bits would leak. The robust idiom for narrow types is an explicit cast: `(uint8_t)~mask`, or building clear operations as `reg & (uint8_t)~mask`. The same trap explains why `~0` is not 0xFF on a 32-bit int platform - it is 0xFFFFFFFF. Width discipline: when you mean a byte, say byte, in both the type and the cast.\n\n### The lane diagram as a design tool\n\nBefore writing register code, professionals sketch the operation in a two-row diagram - bits of the register on top, mask below, result underneath. It catches wrong-bit-number errors instantly, costs ten seconds, and doubles as documentation. The example below shows the diagram in comments next to each operation; adopt the habit now and the peripheral-configuration chapters of any MCU manual become mechanical.\n\n### Where XOR shows up in protocols\n\nMany serial protocols end a frame with a XOR checksum: every payload byte is XORed into an accumulator, and the receiver repeats the computation, comparing results. A single flipped bit anywhere breaks the equality - a cheap, O(n) integrity check that needs no lookup tables. The same self-inverse property powers **erasure decoding** (RAID-5 parity: lost byte = XOR of the survivors) and simple obfuscation. When you meet a protocol spec that says "checksum: XOR of all bytes", you now know exactly what C implements it.',
    examples: [
      {
        title: 'Four operations on two bytes, annotated',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t a = 0xF0;   /* 1111 0000 */\n    uint8_t b = 0x3C;   /* 0011 1100 */\n\n    printf("a & b = 0x%02X\\n", (unsigned)(a & b));\n    printf("a | b = 0x%02X\\n", (unsigned)(a | b));\n    printf("a ^ b = 0x%02X\\n", (unsigned)(a ^ b));\n    printf("~a    = 0x%02X\\n", (unsigned)(uint8_t)~a);\n    return 0;\n}',
        explanation: [
          'AND keeps lanes where both bytes have 1: `1111 0000 & 0011 1100` = `0011 0000` = 0x30.',
          'OR lights any lane set in either: `1111 0000 | 0011 1100` = `1111 1100` = 0xFC.',
          'XOR keeps lanes that differ: `1111 0000 ^ 0011 1100` = `1100 1100` = 0xCC.',
          'NOT flips all bits of a; the cast `(uint8_t)~a` keeps the low 8 bits: 0x0F. Without the cast, ~ computes 0xFFFFFF0F in int and the %02X would print garbage-width values.',
          'Output:\n```\na & b = 0x30\na | b = 0xFC\na ^ b = 0xCC\n~a    = 0x0F\n```',
        ],
      },
      {
        title: 'XOR checksum over a data frame',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t frame[5] = { 0x01, 0x54, 0xA2, 0x07, 0x11 };\n    uint8_t checksum = 0x00;\n\n    for (int i = 0; i < 5; i++) {\n        checksum = (uint8_t)(checksum ^ frame[i]);\n    }\n\n    printf("checksum = 0x%02X\\n", (unsigned)checksum);\n    return 0;\n}',
        explanation: [
          'The accumulator starts at 0 (the identity element for XOR: anything ^ 0 is itself).',
          'Each byte folds in: 0x00^0x01 = 0x01; ^0x54 = 0x55; ^0xA2 = 0xF7; ^0x07 = 0xF0; ^0x11 = 0xE1.',
          'Verify one step by hand: `1111 0101 ^ 1010 0010` = `0101 0111` - XOR is lane-wise difference detection.',
          'A receiver computing the same fold over frame + checksum would reach 0x00 (every value XORed with itself cancels) - that zero-test is the integrity check.',
          'Output: `checksum = 0xE1`',
        ],
      },
    ],
    tables: [
      {
        caption: 'One-bit lane behavior of each operator',
        headers: ['A', 'B', 'A & B', 'A | B', 'A ^ B', '~A'],
        rows: [
          ['0', '0', '0', '0', '0', '1'],
          ['0', '1', '0', '1', '1', '1'],
          ['1', '0', '0', '1', '1', '0'],
          ['1', '1', '1', '1', '0', '0'],
        ],
      },
      {
        caption: 'Which operator for which job',
        headers: ['Job', 'Operator', 'Pattern'],
        rows: [
          ['Keep only selected bits', '&', 'value & mask'],
          ['Switch on selected bits', '|', 'value | mask'],
          ['Flip selected bits', '^', 'value ^ mask'],
          ['Build a clear-mask', '~', '(uint8_t)~mask'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using `&&` and `||` where `&` and `|` are meant.',
        fix:
          'The doubled operators are *logical*: they treat each operand as one truth value and produce 0 or 1, discarding bit structure. `0xF0 && 0x3C` is 1; `0xF0 & 0x3C` is 0x30. Any operand that represents bits or masks wants the single-character operator.',
      },
      {
        mistake: 'Writing `reg & ~0x02` on a narrow register variable and assuming the high bits are harmless.',
        fix:
          '`~0x02` is 0xFFFFFFFD in 32-bit int, and the expression `reg & 0xFFFFFFFD` computes in int before the store - the low byte is right, but the habit breaks the moment the value stays int (then bits 8..31 get set!). Write the width explicitly: `reg & (uint8_t)~0x02`.',
      },
      {
        mistake: 'Believing `|` sets *only* the masked bits to 1 and clears everything else.',
        fix:
          'OR can only turn bits on; bits outside the mask pass through unchanged (that is its virtue). To force specific bits to a chosen value you need clear-then-set: `reg = (reg & ~mask) | newvalue`, a pattern the next lesson drills.',
      },
    ],
    guidedPractice: {
      title: 'Sketch-then-code a byte operation',
      brief:
        'With `reg = 0xA5` (1010 0101): (1) sketch a lane diagram, (2) predict each result in binary, then (3) verify in code: `reg & 0x0F`, `reg | 0x10`, `reg ^ 0xFF`, `(uint8_t)~reg`.',
      starterCode:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t reg = 0xA5;\n    printf("and = 0x%02X\\n", (unsigned)(reg & 0x0F));\n    printf("or  = 0x%02X\\n", (unsigned)(reg | 0x10));\n    printf("xor = 0x%02X\\n", (unsigned)(reg ^ 0xFF));\n    printf("not = 0x%02X\\n", (unsigned)(uint8_t)~reg);\n    return 0;\n}',
      expectedBehavior:
        'and = 0x05 (low nibble kept). or = 0xB5 (bit 4 forced on: 1010 0101 | 0001 0000 = 1011 0101). xor = 0x5A (every bit flipped - XOR with all ones is a NOT). not = 0x5A (same as the xor here, because the mask was all ones).',
      hints: [
        'Write 0xA5 as 1010 0101 first; every answer is four seconds of lane logic away.',
        'XOR with 0xFF flips all eight bits - equivalent to ~ for a byte.',
        'Check: 0xA5 & 0x0F keeps only the low nibble, 0101 = 5.',
      ],
    },
    practiceExercises: [
      {
        title: 'Decode a datasheet mask',
        brief:
          'A datasheet says: "bit 7: ENABLE, bit 2: MODE0, bit 1: MODE1". Write the hex masks for each of the three fields, then write one expression that sets ENABLE and MODE0 while clearing MODE1, starting from `uint8_t cfg = 0x00;`.',
        expectedBehavior:
          'ENABLE = 0x80, MODE0 = 0x04, MODE1 = 0x02. Setting ENABLE and MODE0: `cfg |= 0x80 | 0x04;` gives 0x84. Clearing MODE1 is already satisfied (it was 0); the general safe form is `cfg &= (uint8_t)~0x02;` which leaves 0x84 unchanged.',
        hints: [
          'Bit n has weight 2^n: bit 7 is 128 = 0x80, bit 2 is 4, bit 1 is 2.',
          'Two fields can be set in one OR because OR is commutative and the masks do not overlap.',
          'Always include the clear step when the previous value of the bits is unknown - that is the clear-then-set discipline.',
        ],
      },
      {
        title: 'Swap two values with XOR (then explain why not to use it)',
        brief:
          'Given `uint8_t x = 0x0F; uint8_t y = 0xF0;`, swap them using three XOR statements and no extra variable. Print both before and after. Then write a comment explaining why a temporary variable is preferred in production code.',
        expectedBehavior:
          'x ^= y -> x = 0xFF; y ^= x -> y = 0x0F; x ^= y -> x = 0xF0. Printed: before 0x0F 0xF0, after 0xF0 0x0F. The comment should note: three XORs are harder to read, fail silently if both names refer to the same object (it zeroes it), and defeat some compiler optimizations - swap with a temp is clearer and just as fast.',
        hints: [
          'The sequence is x ^= y; y ^= x; x ^= y; - trace it lane by lane on one bit to see why.',
          'The self-inverse property does all the work: each XOR folds information in, and the third one unfolds it.',
          'The classic catastrophic case is swap(&arr[i], &arr[i]) with the XOR version - the same location XORed with itself becomes zero.',
        ],
      },
    ],
    assessment: {
      title: 'Bitwise operators checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t x = 0x0A;\n    x = (uint8_t)(x | 0x05);\n    printf("%u\\n", (unsigned)x);\n    return 0;\n}',
          options: ['5', '10', '15', '240'],
          answer: '15',
          explanation:
            '0x0A is 1010, 0x05 is 0101; OR gives 1111 = 0x0F = 15. OR turns on every bit set in either operand.',
          hint: 'Convert both to binary first, then OR lane by lane.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which operation flips exactly the bits where mask has a 1 and leaves the rest untouched?',
          options: ['value & mask', 'value | mask', 'value ^ mask', '~value'],
          answer: 'value ^ mask',
          explanation:
            'XOR inverts each masked bit (1^1=0, 0^1=1) and passes through unmasked bits (anything^0 is itself). That targeted inversion is the toggle idiom.',
          hint: 'Which operator returns 1 precisely when the input bits differ?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Evaluating `0xF0 && 0x0F` gives 0x00.',
          answer: 'false',
          explanation:
            '&& is the logical AND: both operands are nonzero, so the result is 1. The bitwise version 0xF0 & 0x0F would be 0x00 - the two operators answer different questions.',
          hint: 'Logical operators see one truth value per operand, not eight bits.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A driver wants to clear bit 5 of a uint8_t register and writes `reg = reg & ~0x20;`. On a 32-bit int platform this produces the right low byte here but carries a latent width bug. Explain the trap and give the robust spelling.',
          answer: '~0x20 is computed in int as 0xFFFFFFDF, so the expression runs at 32-bit width and high one-bits can leak into wider contexts - the robust form casts the mask back to the register width: reg & (uint8_t)~0x20',
          explanation:
            'Integer promotion widens ~ beyond the intended byte. Storing to a uint8_t truncates harmlessly today, but the same habit inside a wider expression silently sets bits 8..31. Width-explicit casts document and enforce the intent.',
          hint: 'Ask: what is the type of ~0x20 before any assignment?',
          difficulty: 'hard',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'A frame check XORs all payload bytes into one accumulator. State the property of XOR that makes the receiver able to verify the frame, and what the receiver computes the accumulator to when the frame plus its checksum is intact.',
          answer: 'XOR is self-inverse (x ^ x = 0), so folding the checksum byte back in cancels everything - the receiver computes 0x00 for an intact frame',
          explanation:
            'Every byte XORed with its own contribution vanishes, so frame ^ checksum = 0 when nothing changed. Any single-bit corruption survives the fold and breaks the zero.',
          hint: 'What does x ^ x give, and what is left after XORing everything with itself?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Bitwise operator', definition: 'An operator (&, |, ^, ~) applying a one-bit logic function to every bit position independently.' },
      { term: 'Mask', definition: 'A bit pattern selecting which positions an operation touches: 1-bits mark the active lanes.' },
      { term: 'Toggle', definition: 'Inverting selected bits with XOR: value ^ mask.' },
      { term: 'Hex literal', definition: 'A 0x-prefixed constant where each digit encodes four bits - the datasheet-native spelling of registers.' },
      { term: 'XOR checksum', definition: 'An integrity check folding all bytes into one XOR accumulator; self-cancels to 0x00 on an intact frame.' },
      { term: 'Self-inverse', definition: 'The XOR property x ^ x = 0: applying the same XOR twice restores the original value.' },
    ],
    revisionSummary: [
      '& keeps masked bits, | sets them, ^ toggles them, ~ builds the complement mask.',
      'Hex maps one digit to four bits: F0 is 1111 0000 - learn to read bytes through it.',
      'XOR identities: x ^ x = 0, x ^ 0 = x, and self-inverse - the algebra behind toggles and checksums.',
      '~ promotes to int: cast narrow complements explicitly, (uint8_t)~mask.',
      '&& and || are logical, not bitwise: 0xF0 && 0x0F is 1, while 0xF0 & 0x0F is 0.',
      'OR can only set bits; forcing a field to a value requires clear-then-set.',
    ],
    furtherReading: [
      { label: 'Wikipedia - Bitwise operation', url: 'https://en.wikipedia.org/wiki/Bitwise_operation', kind: 'article' },
      { label: 'cppreference - bitwise arithmetic', url: 'https://en.cppreference.com/w/c/language/operator_arithmetic', kind: 'docs' },
      { label: 'Wikipedia - XOR gate', url: 'https://en.wikipedia.org/wiki/XOR_gate', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'cpg-m03-l3',
    title: 'Shifts: Moving Bits, Packing Data',
    summary:
      'Use left and right shifts to multiply, divide and reposition bits; pack and unpack multi-byte values; and learn exactly where shifting becomes undefined or implementation-defined.',
    objectives: [
      'Compute x << n and x >> n on unsigned values and connect them to multiplication and division by powers of two.',
      'Pack two bytes into a 16-bit word and unpack it again with shifts and masks.',
      'State the three shift hazards: shifting signed values into the sign bit, right-shifting negatives, and shift counts at or beyond the width.',
      'Write shift expressions that are well-defined on every platform.',
    ],
    whyItMatters:
      'Sensor data rarely arrives in convenient widths: an ADC result spans two register bytes, a 12-bit value hides in the top of a 16-bit word, a status nibble sits at bits 4-7. Shifts are how C moves data between positions - and they are also the fastest multiply/divide-by-2^k available. The hazards, meanwhile, are a documented minefield: the same expression that works on your laptop is undefined on the target.',
    prerequisites: ['cpg-m03-l2'],
    explanation:
      'A shift slides every bit of a value left or right by a count, filling the vacated positions with zeros (for unsigned types).\n\n### Left shift: <<\n\n`x << n` moves bits n places toward the most significant end, filling with zeros. For unsigned x, each shift multiplies by 2 (discarding bits that fall off the top): `0x01 << 4` is `0x10`. Two everyday uses: computing **bit masks** - `(1u << 5)` is bit 5, the 32-valued mask - and **positioning data**, like moving a low byte to the high half of a word.\n\n### Right shift: >>\n\n`x >> n` moves bits toward the least significant end; for unsigned x the top positions fill with zeros, and each shift divides by 2, discarding the remainder: `0b1010 >> 1` is `0b101`. Right shifts are how you **extract** a field: to read bits 4-7 of a byte, shift right by 4 and mask the low nibble - `(x >> 4) & 0x0F`.\n\n### The three hazards\n\n1. **Signed left shift into the sign bit is undefined behavior.** `1 << 31` with a 32-bit signed int is UB (the bit arrives at the sign position). Shift unsigned types, or widen first.\n2. **Right shift of negative signed values is implementation-defined** (most compilers sign-extend, but the standard does not promise it).\n3. **A shift count at or beyond the type width is undefined behavior**: on a 32-bit int, `1u << 32` is UB - even though a 64-bit register would happily do it. Guard counts, or compute in the right width.\n\nThe professional habit: shift **unsigned** types, keep counts **strictly less than the width**, and write `(1uL << n)` style constants when a mask must exceed int width.',
    deepDive:
      '### Why signed shifts are a minefield\n\nFor signed left shifts, C99 says the behavior is undefined if the result (or any intermediate 1-bit) lands in the sign position - a legacy of one\'s-complement and sign-magnitude machines, and today a license for optimizer reasoning like "shifts cannot change the sign, therefore...". Right shifts of negatives are implementation-defined: gcc and most embedded compilers perform an **arithmetic** shift (the sign bit is copied into the vacated highs, so -8 >> 1 stays -4), but a **logical** shift (zeros in) is permitted by the standard. The clean rules: unsigned values for shifting; if you must shift a signed value right, you are trusting your compiler - document it; if you need arithmetic division by 2^k of possibly-negative values, use division `/` which defines its own rounding (toward zero) and is portable.\n\n### Packing and unpacking: the transfer idiom\n\nSerial peripherals deliver data byte by byte; registers deliver fields at offsets. The universal pattern is shift-and-OR to assemble, shift-and-mask to disassemble:\n\n- Pack: `word = (uint16_t)((high << 8) | low)` - the high byte is promoted to int, shifted 8, ORed with the low byte, and stored narrowed.\n- Unpack: `high = (uint8_t)(word >> 8); low = (uint8_t)word;`\n\nThe subtle part is doing it in the right width: `high << 8` is safe because uint8_t promotes to (32-bit) int before shifting - but the same habit with a uint16_t holding 0xFFFF shifted left 16 in int arithmetic would be UB. When in doubt, cast to the destination width *before* shifting: `((uint32_t)high << 8)`.\n\n### Shifts as fast arithmetic - and when that is wrong\n\n`x << 3` is x * 8 and `x >> 3` is x / 8 for unsigned x. Compilers perform these substitutions automatically and safely; humans should usually write the arithmetic and let the compiler choose. Two places where shifts are semantically different from division: negative operands (see above) and overflow - `x << n` silently discards high bits where multiplication would (for signed) invoke undefined behavior anyway. Bottom line: shifts are for *positions and fields*; multiplication is for *arithmetic*. Mixing the two up is readable-but-fragile style.',
    examples: [
      {
        title: 'Packing two bytes into a 16-bit word',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t high = 0x12;\n    uint8_t low  = 0x34;\n\n    uint16_t word = (uint16_t)((high << 8) | low);\n\n    printf("high = 0x%02X\\n", (unsigned)high);\n    printf("low  = 0x%02X\\n", (unsigned)low);\n    printf("word = 0x%04X\\n", (unsigned)word);\n    return 0;\n}',
        explanation: [
          '`high` promotes to int (0x12 = 18); `high << 8` shifts it eight places: 0x1200. Shifting a uint8_t left by 8 is safe because promotion widens it to (typically 32-bit) int first.',
          'ORing with `low` fills the low half: 0x1200 | 0x0034 = 0x1234. OR is correct here because the low half of 0x1200 is all zeros.',
          'The cast to uint16_t stores the intended 16-bit value; without it the int result would just be narrowed implicitly at assignment.',
          'Unpacking reverses it: `(uint8_t)(word >> 8)` recovers 0x12 and `(uint8_t)word` recovers 0x34 - the round-trip idiom for two-wire sensor reads.',
          'Output:\n```\nhigh = 0x12\nlow  = 0x34\nword = 0x1234\n```',
        ],
      },
      {
        title: 'Shifts as multiply and divide by powers of two',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    for (int i = 0; i < 8; i++) {\n        printf("1u << %d = %u\\n", i, 1u << i);\n    }\n\n    uint32_t y = 200u;\n    printf("200 >> 1 = %u\\n", y >> 1);\n    printf("200 >> 2 = %u\\n", y >> 2);\n    printf("200 << 1 = %u\\n", y << 1);\n    return 0;\n}',
        explanation: [
          'The loop prints powers of two: 1, 2, 4, 8, 16, 32, 64, 128. `1u << n` is the standard spelling of "bit n" as a mask - note the u suffix keeping everything unsigned.',
          '`200 >> 1` is 100 (divide by 2); `200 >> 2` is 50 (divide by 4). Low bits fall off: this is floor division for unsigned values.',
          '`200 << 1` is 400 - doubling, with room to spare in 32 bits.',
          'All operands are unsigned, so every shift here is well-defined on every C platform.',
          'Output:\n```\n1u << 0 = 1\n1u << 1 = 2\n1u << 2 = 4\n1u << 3 = 8\n1u << 4 = 16\n1u << 5 = 32\n1u << 6 = 64\n1u << 7 = 128\n200 >> 1 = 100\n200 >> 2 = 50\n200 << 1 = 400\n```',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Left shift and right shift of a byte',
        content:
          'bit positions:   7654 3210\n\nx         =      0001 0110   (0x16)\nx << 2    =      0101 1000   (0x58)   two zeros enter at the right,\n                                         the top two bits (01) fall off\n\nx         =      0001 0110   (0x16)\nx >> 2    =      0000 0101   (0x05)   two zeros enter at the left,\n                                         the bottom bits (10) fall off\n\npowers of two via 1u << n:\n  n:     0    1    2    3    4    5    6    7\n  mask:  01   02   04   08   10   20   40   80  (hex)',
        caption:
          'For unsigned values, << multiplies by 2 per position (until bits drop off the top) and >> divides by 2 per position (discarding the remainder).',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing `1 << 31` or `1 << n` with n possibly 31 to build a large mask.',
        fix:
          'On a 32-bit int platform `1 << 31` is undefined behavior: the operand 1 is a signed int and the shifted 1 lands in the sign bit. Make the operand unsigned so the result type is unsigned: `1u << 31` is well-defined. For masks that must exceed 32 bits use `1uL << n` or `(uint64_t)1 << n`. Rule: never shift a signed 1 into the sign position.',
      },
      {
        mistake: 'Shifting by an amount equal to or larger than the type width: `(uint8_t)x << 8` computed as byte shift? More precisely, `x << 32` on 32-bit int.',
        fix:
          'A shift count >= the promoted type width is undefined behavior. uint8_t promotes to int (32 bits), so << 8 on a byte is safe; but << 32 on int is not. If you need a 32-bit shift, widen the operand first: `((uint32_t)x) << 24`, and keep counts < 32.',
      },
      {
        mistake: 'Using `>>` to divide negative numbers and expecting C division semantics.',
        fix:
          'Right shift of a negative signed value is implementation-defined (often arithmetic, rounding toward minus infinity), while `/` rounds toward zero: -7 / 2 is -3, but -7 >> 1 is typically -4. Use / when the operand can be negative.',
      },
    ],
    guidedPractice: {
      title: 'Pack, unpack, verify',
      brief:
        'A sensor returns its 12-bit reading as two bytes: `b1 = 0x0F` (high 4 bits) and `b2 = 0xA7` (low 8 bits). (1) Assemble the 12-bit value with shifts and OR. (2) Split it back into high and low fields with shift-and-mask. (3) Print the assembled value in hex and decimal and verify both fields.',
      starterCode:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t b1 = 0x0F;\n    uint8_t b2 = 0xA7;\n\n    uint16_t reading = (uint16_t)(((b1 << 8) | b2) & 0x0FFFu);\n    uint8_t hi = (uint8_t)(reading >> 8);\n    uint8_t lo = (uint8_t)(reading & 0xFFu);\n\n    printf("reading = 0x%03X (%u)\\n", (unsigned)reading, (unsigned)reading);\n    printf("hi = 0x%02X lo = 0x%02X\\n", (unsigned)hi, (unsigned)lo);\n    return 0;\n}',
      expectedBehavior:
        'Assembly: (0x0F << 8) | 0xA7 = 0x0FA7, and & 0x0FFF keeps 12 bits: 0xFA7. Unpacked: hi = (0xFA7 >> 8) = 0x0F and lo = 0xA7 - both round-trip exactly. Printed: reading = 0xFA7 (4007), hi = 0x0F, lo = 0xA7. Decimal check: 0xFA7 = 15*256 + 167 = 4007.',
      hints: [
        'b1 << 8 puts the high nibble at bits 8-11; OR places b2 at bits 0-7.',
        'The & 0x0FFFu documents that only 12 bits are meaningful - if b1 ever held garbage above bit 3, the mask cleans it.',
        'Verify the decimal: 0xFA7 = 0xF00 (3840) + 0xA7 (167) = 4007.',
      ],
    },
    practiceExercises: [
      {
        title: 'Extract a register field',
        brief:
          'A 16-bit configuration register has a 3-bit SPEED field at bits 5-7. Given `uint16_t cfg = 0x00A0;`, write an expression that extracts the SPEED value as a number 0..7, and state what value it holds.',
        expectedBehavior:
          'The field is `(cfg >> 5) & 0x07u`. With 0x00A0 = 0b0000 0000 1010 0000, bits 5-7 hold 101, so the extracted value is 5. The mask 0x07 keeps exactly three bits after the shift.',
        hints: [
          'Shift right until the field\'s lowest bit reaches position 0, then mask to the field width.',
          'Bit 5 is worth 32: 0xA0 = 1010 0000 has bits 5 and 7 set, so the field bits are 101.',
          'Mask after shifting, not before, when the field sits high in the word.',
        ],
      },
      {
        title: 'Insert a field without disturbing neighbors',
        brief:
          'Still using the 3-bit SPEED field at bits 5-7 of cfg: write the clear-then-set sequence that changes SPEED to 6 while leaving every other bit of cfg untouched. Start from cfg = 0x00A0 and print the result.',
        expectedBehavior:
          'Two steps: `cfg = (uint16_t)(cfg & ~(0x07u << 5));` clears the field (0x00A0 & ~0x00E0 = 0x0000), then `cfg |= 6u << 5;` sets it (0x00C0). Final cfg = 0x00C0, all other bits as they started (0).',
        hints: [
          'Build the field mask in position first: 0x07u << 5 = 0xE0.',
          'Clear with AND of the complement, set with OR - the universal read-modify-write pair.',
          'Verify no other bit changed: 0x00A0 had only field bits set here, so try a second run with cfg = 0xFFA0 to see the neighbors survive (result 0xFFC0).',
        ],
      },
    ],
    assessment: {
      title: 'Shifts checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    printf("%u\\n", 6u >> 1);\n    return 0;\n}',
          options: ['12', '3', '6', '1'],
          answer: '3',
          explanation:
            '6u >> 1 shifts the unsigned value 6 right by one: each shift halves it, discarding the remainder bit. 6 = 110 binary becomes 11 = 3.',
          hint: 'Right shift on an unsigned value is division by 2 per position.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which expression is UNDEFINED on a platform where int is 32 bits?',
          options: ['1u << 30', '(1u << 31)', '1 << 31', '8u >> 3'],
          answer: '1 << 31',
          explanation:
            'The operand 1 is a signed int, and shifting it so a 1 lands in the sign bit is undefined behavior. `1u << 31` is well-defined because the operand is unsigned. (8u >> 3 is 1 - a count within the width is fine.)',
          hint: 'The sign bit is the boundary: which operand type reaches it?',
          difficulty: 'hard',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'On all C platforms, `(-8) >> 1` is guaranteed to evaluate to -4.',
          answer: 'false',
          explanation:
            'Right shift of a negative signed value is implementation-defined: most compilers sign-extend (giving -4), but the standard does not require it. Portable code divides with / or works in unsigned.',
          hint: 'Implementation-defined means each compiler picks and documents.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A driver assembles a 32-bit register value with `uint32_t reg = (a << 24) | (b << 16) | (c << 8) | d;` where a..d are uint8_t. Explain when this expression is undefined behavior, and give the robust spelling.',
          answer: 'It is undefined behavior whenever a is 128 or more - a promotes to signed int and a << 24 then exceeds INT_MAX - the robust spelling casts to the unsigned destination width before shifting: ((uint32_t)a << 24) | ((uint32_t)b << 16) | ((uint32_t)c << 8) | d',
          explanation:
            'uint8_t promotes to signed int, so the shift runs in 32-bit signed arithmetic; a << 24 with a >= 128 puts a 1 in the sign bit and exceeds INT_MAX, which is undefined behavior for signed left shifts. Casting each operand to uint32_t before shifting makes the arithmetic unsigned and well-defined.',
          hint: 'What is the promoted type of a, and how large can a << 24 get?',
          difficulty: 'hard',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'You need bit n of a 64-bit status word as a 0/1. Write the expression, naming the literal suffix you must use and why.',
          answer: 'status64 >> n & 1u (parenthesized: (status64 >> n) & 1u) - and masks beyond 32 bits must be built like 1uL << n or (uint64_t)1 << n because a plain 1u << 63 on a 64-bit value would shift an int/unsigned int by more than its width',
          explanation:
            'Extracting a bit is shift-then-mask. The subtle half is building the mask: the literal 1 is only 32 bits wide on common platforms, so reaching bit 63 requires an explicitly wide 1 (1uL, or a uint64_t cast).',
          hint: 'Width of the literal, then shift count versus width.',
          difficulty: 'hard',
        },
      ],
    },
    keyTerms: [
      { term: 'Left shift', definition: 'x << n moves bits toward the MSB filling with zeros; for unsigned x, multiplication by 2^N until bits drop off.' },
      { term: 'Right shift', definition: 'x >> n moves bits toward the LSB; for unsigned x, division by 2^N discarding the remainder.' },
      { term: 'Sign bit', definition: 'The most significant bit of a signed value; shifting a 1 into it is undefined behavior.' },
      { term: 'Arithmetic vs logical shift', definition: 'Arithmetic right shift copies the sign bit into vacated highs; logical fills zeros. The standard leaves the choice for signed operands to the implementation.' },
      { term: 'Pack/unpack', definition: 'The shift-and-OR / shift-and-mask idiom for assembling and splitting multi-byte values.' },
      { term: 'Promotion', definition: 'Narrow unsigned types widen to int inside expressions - the reason uint8_t << 8 is safe.' },
    ],
    revisionSummary: [
      'Unsigned << multiplies by 2 per position; >> divides by 2 per position, discarding remainder bits.',
      '1u << n is the standard mask-for-bit-n; keep counts strictly less than the promoted width.',
      'Shifting a signed 1 into the sign bit is UB; right-shifting negatives is implementation-defined - shift unsigned.',
      'Pack fields with (wide << offset) | low; unpack with (value >> offset) & field_mask.',
      'uint8_t/uint16_t operands promote to int before shifting, which is what makes small shifts safe.',
      'Use shifts for positions and fields; use * and / for arithmetic and let the compiler optimize.',
    ],
    furtherReading: [
      { label: 'cppreference - shift operators', url: 'https://en.cppreference.com/w/c/language/operator_arithmetic', kind: 'docs' },
      { label: 'Wikipedia - Bitwise shift', url: 'https://en.wikipedia.org/wiki/Bitwise_operation#Bit_shifts', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'cpg-m03-l4',
    title: 'Masks and Flag Registers: Set, Clear, Toggle, Test',
    summary:
      'Put the whole bitwise toolkit together into the four register idioms - set, clear, toggle, test - and run a simulated multi-flag status register end to end.',
    objectives: [
      'Write the four idioms (|=, &= ~, ^=, &-and-test) from memory and explain what each does to unmasked bits.',
      'Build masks from bit numbers with 1u << n and from fields with (2^width - 1) << offset.',
      'Extract a multi-bit field from a register in two operations.',
      'Simulate a flag register with named bit constants and read its hex state after a sequence of operations.',
    ],
    whyItMatters:
      'This is the lesson the whole module builds toward: nearly every peripheral driver you will ever write is a sequence of set/clear/toggle/test on registers. Get the four idioms automatic and the jump from "C programmer" to "firmware engineer" is mostly vocabulary. The simulation here is honest C on a host - the same expressions, byte for byte, drive real hardware in the embedded course.',
    prerequisites: ['cpg-m03-l2', 'cpg-m03-l3'],
    explanation:
      'A **flag register** is one byte (or word) where each bit is an independent boolean - RX-ready here, error there, enable somewhere else. Hardware implements them in silicon; firmware models them with the four idioms.\n\n### The four idioms\n\nWith `mask` marking the bits of interest:\n\n- **Set** (turn bits on): `reg |= mask;` - OR turns masked bits to 1, leaves everything else alone.\n- **Clear** (turn bits off): `reg &= (uint8_t)~mask;` - AND with the complement zeroes masked bits, leaves the rest.\n- **Toggle** (flip bits): `reg ^= mask;` - XOR inverts exactly the masked bits.\n- **Test** (read bits): `if ((reg & mask) != 0)` - the AND isolates the bits; nonzero means at least one is set. Never write `(reg & mask) == mask` unless you mean *all* mask bits, and never `== 1` unless the mask is a single bit.\n\nAll four leave unmasked bits untouched - that preservation is the entire point of masking.\n\n### Building masks from bit numbers\n\nDatasheets name bits by position: bit 0, bit 3, bit 7. Translate with a shift: bit n is `(1u << n)` (for a byte-wide register, cast the result: `(uint8_t)(1u << n)`). Multi-bit fields combine a width mask and an offset: a 3-bit field at bits 5-7 is `(0x07u << 5)`; to modify it you clear the whole field then OR the shifted new value. Name every mask once with meaning - `const uint8_t RX_READY = (uint8_t)(1u << 0);` - and the driver reads like its datasheet.',
    deepDive:
      '### Read-modify-write and why it deserves respect\n\n`reg |= mask` is not one hardware event: it reads the register, modifies the value in the CPU, and writes it back. Between the read and the write, two things can betray you. First, some real registers have **write-1-to-clear** semantics or side effects on read (reading a status register can acknowledge an interrupt) - a blind read-modify-write would then commit a side effect you never intended, which is why datasheets deserve a slow read. Second, if an interrupt handler or another thread modifies the same register between your read and your write, their change is silently overwritten - the classic lost-update race. On a host simulation there is no race; on real firmware, shared registers get updated inside interrupt-disabled critical sections or use hardware atomic set/clear registers. The habit starts here: know that the idiom is three events, not one.\n\n### Testing the all-bits, any-bits and exact-match questions\n\nThree different questions hide inside "test the mask": (1) **any** masked bit set - `(reg & mask) != 0`; (2) **all** masked bits set - `(reg & mask) == mask`; (3) **exact** pattern - `reg == expected`. Choosing the wrong one is a classic driver bug: an interrupt handler waiting for two flags with `!= 0` fires after the first arrives. Decide which semantics the hardware contract needs, then write the comparison that says it.\n\n### From flags to bit fields in structs\n\nWhen a set of flags belongs together in software (not to a hardware register), C offers bit fields (module 9) - but portability caveats make experienced embedded developers prefer exactly these mask idioms on a plain uint8_t/uint32_t, with named constants. The mask style compiles identically everywhere, prints trivially in hex during debugging, and maps one-to-one onto hardware when the day comes. You will use both representations in this course; the masks are the portable backbone.',
    examples: [
      {
        title: 'A full flag-register workout (simulated)',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational simulation of a status flag register.\n   The variable below is an ordinary C object - no\n   hardware is read or written anywhere in this program. */\nint main(void) {\n    uint8_t status = 0x00;                      /* all flags clear */\n\n    const uint8_t RX_READY = (uint8_t)(1u << 0);   /* 0x01 */\n    const uint8_t TX_DONE  = (uint8_t)(1u << 1);   /* 0x02 */\n    const uint8_t ERROR    = (uint8_t)(1u << 3);   /* 0x08 */\n\n    status |= RX_READY;                          /* set bit 0 */\n    status |= TX_DONE;                           /* set bit 1 */\n    printf("after set:    0x%02X\\n", (unsigned)status);\n\n    status &= (uint8_t)~TX_DONE;                 /* clear bit 1 */\n    status ^= ERROR;                             /* set bit 3  */\n    status ^= ERROR;                             /* toggle off */\n    printf("after modify: 0x%02X\\n", (unsigned)status);\n\n    if ((status & RX_READY) != 0) {\n        printf("RX_READY is set\\n");\n    }\n    return 0;\n}',
        explanation: [
          'The named constants translate datasheet bit numbers into masks: bit 0 = 0x01, bit 1 = 0x02, bit 3 = 0x08.',
          'Two sets later, status = 0x01 | 0x02 = 0x03. Unmasked bits (none yet) are preserved.',
          'Clearing TX_DONE: `status & ~0x02` = 0x03 & 0xFD = 0x01. Then ERROR is toggled twice: 0x01 ^ 0x08 = 0x09, and 0x09 ^ 0x08 = 0x01 - back where it started, the self-inverse property at work.',
          'The test `(status & RX_READY) != 0` isolates bit 0: 0x01 & 0x01 = 1, nonzero, so the branch runs. Using != 0 (not == 1) is what makes the idiom safe for any mask width.',
          'Output:\n```\nafter set:    0x03\nafter modify: 0x01\nRX_READY is set\n```',
        ],
      },
      {
        title: 'Field extraction and clear-then-set',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t config = 0xB7;   /* 1011 0111 */\n\n    /* 3-bit MODE field at bits 4-6: extract it */\n    uint8_t mode = (uint8_t)((config >> 4) & 0x07u);\n\n    /* change MODE to 5 without touching other bits */\n    config = (uint8_t)(config & ~(0x07u << 4));\n    config = (uint8_t)(config | (5u << 4));\n\n    printf("old mode = %u\\n", (unsigned)mode);\n    printf("config   = 0x%02X\\n", (unsigned)config);\n    return 0;\n}',
        explanation: [
          'Extraction is shift-then-mask: `(0xB7 >> 4)` = 0x0B, and `& 0x07` keeps the three field bits: 0x03. The old MODE was 3.',
          'Clearing the field: mask-in-position is `0x07 << 4` = 0x70; the complement is 0x8F; `0xB7 & 0x8F` = 0x87 - other bits (101 and the low nibble) survive.',
          'Setting the new value: `5 << 4` = 0x50; `0x87 | 0x50` = 0xD7. Compare with the original 0xB7: only bits 4-6 changed.',
          'This extract / clear / set trio is the universal read-modify-write for register fields.',
          'Output:\n```\nold mode = 3\nconfig   = 0xD7\n```',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Bit numbering of a byte-wide flag register',
        content:
          '   bit:      7    6    5    4    3    2    1    0\n           +----+----+----+----+----+----+----+----+\n   status  | .  | .  | .  | .  |ERR | .  |TXD |RXR |\n           +----+----+----+----+----+----+----+----+\n   mask      80   40   20   10   08   04   02   01  (hex weight = 2^bit)\n\n   set bit n    : reg |=  (1u << n)\n   clear bit n  : reg &= ~(1u << n)\n   toggle bit n : reg ^=  (1u << n)\n   test bit n   : (reg & (1u << n)) != 0',
        caption:
          'Bit 0 is the least significant (rightmost); its mask is 0x01. The four idioms sit under the diagram - they never disturb unmasked bits.',
      },
    ],
    tables: [
      {
        caption: 'The four idioms and their scope of effect',
        headers: ['Operation', 'Expression', 'Masked bits', 'Other bits'],
        rows: [
          ['Set', 'reg |= mask', 'become 1', 'unchanged'],
          ['Clear', 'reg &= (uint8_t)~mask', 'become 0', 'unchanged'],
          ['Toggle', 'reg ^= mask', 'inverted', 'unchanged'],
          ['Test', '(reg & mask) != 0', 'read only', 'unchanged'],
        ],
      },
      {
        caption: 'Test semantics: choose deliberately',
        headers: ['Question', 'Correct comparison'],
        rows: [
          ['Is any masked bit set?', '(reg & mask) != 0'],
          ['Are all masked bits set?', '(reg & mask) == mask'],
          ['Does the register equal an exact pattern?', 'reg == pattern'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Clearing with AND of the mask instead of the complement: `reg &= mask;` to "clear a bit".',
        fix:
          '`reg &= mask` keeps only the masked bits and destroys everything else. Clearing needs the complement: `reg &= (uint8_t)~mask;`. Sketch both on the lane diagram once and the difference is unforgettable.',
      },
      {
        mistake: 'Testing a multi-bit mask with `== 1`, like `if ((status & 0x06) == 1)`.',
        fix:
          'ANDing with 0x06 can produce 0x02, 0x04, 0x06 or 0 - never 1 - so this test is always false. For "any bit set" compare `!= 0`; for "all bits set" compare `== 0x06`.',
      },
      {
        mistake: 'Hard-coding mask values inline: `status |= 0x02;` buried in a driver.',
        fix:
          'Name the mask once with its datasheet meaning: `const uint8_t TX_DONE = (uint8_t)(1u << 1);`. The call site reads as intent, the bit number is visible, and a wrong-bit bug becomes visible at the definition.',
      },
      {
        mistake: 'Forgetting the cast when storing a mask expression into a narrow type: `uint8_t m = ~RX_READY;`.',
        fix:
          '~RX_READY is computed in int (0xFFFFFFFE); assigning to uint8_t takes the low byte (0xFE) which happens to be right - but make the width explicit with `(uint8_t)~RX_READY` so the intent survives review and wider refactorings.',
      },
    ],
    guidedPractice: {
      title: 'Drive a simulated register through a script',
      brief:
        'Start from `uint8_t reg = 0x00;`. Apply, on paper with the lane diagram and then in code: set bits 0 and 2; clear bit 0; toggle bit 5; toggle bit 5 again; set bit 7. Predict the hex value after each step, then verify with printf after every operation.',
      starterCode:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t reg = 0x00;\n\n    const uint8_t B0 = (uint8_t)(1u << 0);\n    const uint8_t B2 = (uint8_t)(1u << 2);\n    const uint8_t B5 = (uint8_t)(1u << 5);\n    const uint8_t B7 = (uint8_t)(1u << 7);\n\n    reg |= B0;  printf("1: 0x%02X\\n", (unsigned)reg);\n    reg |= B2;  printf("2: 0x%02X\\n", (unsigned)reg);\n    reg &= (uint8_t)~B0; printf("3: 0x%02X\\n", (unsigned)reg);\n    reg ^= B5;  printf("4: 0x%02X\\n", (unsigned)reg);\n    reg ^= B5;  printf("5: 0x%02X\\n", (unsigned)reg);\n    reg |= B7;  printf("6: 0x%02X\\n", (unsigned)reg);\n    return 0;\n}',
      expectedBehavior:
        '1: 0x01 (bit 0). 2: 0x05 (bits 0 and 2). 3: 0x04 (bit 0 cleared, bit 2 survives). 4: 0x24 (bit 5 on). 5: 0x04 (bit 5 toggled back off - self-inverse). 6: 0x84 (bit 7 on, bit 2 untouched).',
      hints: [
        'Masks: B0 = 0x01, B2 = 0x04, B5 = 0x20, B7 = 0x80.',
        'After step 3 the value is 0x04: clearing one bit never touches the others.',
        'Steps 4 and 5 prove the toggle idiom: two identical XORs cancel.',
      ],
    },
    practiceExercises: [
      {
        title: 'Any, all, exact',
        brief:
          'Given `uint8_t status = 0x05;` with masks DONE = 0x01, READY = 0x04, BOTH = 0x05, write and evaluate three tests: any of BOTH set, all of BOTH set, and status equal to 0x05 exactly. Print each 0/1 result and state which comparison form each uses.',
        expectedBehavior:
          'any: (0x05 & 0x05) != 0 -> 1. all: (0x05 & 0x05) == 0x05 -> 1. exact: 0x05 == 0x05 -> 1. With status = 0x04 instead, the three give 1, 0, 0 - the distinctions become visible. The point: three questions, three different comparisons.',
        hints: [
          'Pick a second status value where the three tests disagree, and verify.',
          '0x04 & 0x05 = 0x04: any-masked is true, all-masked is false.',
          'Exact equality ignores masking entirely - it compares the whole register.',
        ],
      },
      {
        title: 'Design a 4-flag protocol',
        brief:
          'Design a byte-wide flag register for a data logger with flags: CARD_FULL (bit 0), LOW_BATTERY (bit 1), WRITE_ERROR (bit 2), SYNCED (bit 3). Write the four named mask constants, a function comment describing the register, and a main that sets CARD_FULL and WRITE_ERROR, clears nothing, toggles SYNCED twice, and prints the final register in hex and binary-by-hand.',
        expectedBehavior:
          'Masks 0x01, 0x02, 0x04, 0x08. After the script: CARD_FULL and WRITE_ERROR set -> 0x05; SYNCED toggled twice leaves it clear. Final register = 0x05 = 0000 0101 in binary. Any deviation means an idiom was applied to the wrong mask.',
        hints: [
          'Bit n weight is 2^n - fill the mask table before writing code.',
          'Toggling twice returns the bit to its starting state; say so in your trace.',
          'Print with %02X and translate the hex to binary by hand to complete the exercise.',
        ],
      },
    ],
    assessment: {
      title: 'Masks and flags checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t reg = 0x00;\n    reg |= (uint8_t)(1u << 2);\n    reg |= (uint8_t)(1u << 5);\n    reg &= (uint8_t)~(1u << 2);\n    printf("0x%02X\\n", (unsigned)reg);\n    return 0;\n}',
          options: ['0x04', '0x20', '0x24', '0x00'],
          answer: '0x20',
          explanation:
            'Set bit 2 (0x04), set bit 5 (0x20) -> 0x24; clear bit 2 -> 0x20. Each idiom touches only its own mask.',
          hint: 'Track the bits: which ones are on after each of the three lines?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which expression correctly tests whether ANY bit of mask 0x06 is set in reg?',
          options: ['(reg & 0x06) == 1', '(reg & 0x06) != 0', '(reg && 0x06) != 0', '(reg | 0x06) != 0'],
          answer: '(reg & 0x06) != 0',
          explanation:
            'AND with the mask isolates the bits; nonzero means at least one survived. == 1 fails because the AND can yield 0x02 or 0x04; && loses bit structure; | does not isolate anything.',
          hint: 'The AND result can be 0x02, 0x04, 0x06 or 0 - which comparison accepts all three nonzero cases?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'After `reg ^= mask; reg ^= mask;` the register is guaranteed to hold its original value.',
          answer: 'true',
          explanation:
            'XOR is self-inverse: the first application flips masked bits, the second flips them back. Unmasked bits were never touched.',
          hint: 'What is x ^ x?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A driver contains `cfg &= MODE_MASK;` where MODE_MASK = 0x70 is the 3-bit field at bits 4-6, and the author intended to clear the field. What actually happens, and what is the correct statement?',
          answer: 'cfg &= 0x70 wipes every bit outside the field (keeps only bits 4-6) - the correct clear-field statement is cfg &= (uint8_t)~(0x07u << 4), masking the complement',
          explanation:
            'AND keeps masked bits and zeroes the rest, so this destroys the whole register except the field. Clearing a field means ANDing with the complement of the field mask placed at its offset.',
          hint: 'Which bits does AND keep - the masked ones or the others?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'code-completion',
          prompt: 'Complete the missing idiom so the function sets bits in the simulated register only where mask has 1s, leaving other bits unchanged:\n\n```\nvoid reg_set(uint8_t *reg, uint8_t mask) {\n    ______\n}\n```',
          answer: '*reg |= mask;',
          explanation:
            'OR-assign turns each masked bit on and passes all others through - the set idiom on the pointed-to register. (The * dereference is module 8 material; here it just means "the variable the pointer refers to".)',
          hint: 'Which of the four idioms turns masked bits to 1?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Flag register', definition: 'A word whose individual bits are independent status or control booleans.' },
      { term: 'Set / clear / toggle / test', definition: 'The four register idioms: |=, &= ~mask, ^=, and (reg & mask) != 0.' },
      { term: 'Bit number', definition: 'The position of a bit, counted from 0 at the least significant end; its mask weight is 2^bit.' },
      { term: 'Field', definition: 'A multi-bit group inside a register, addressed by width mask and offset, modified with clear-then-set.' },
      { term: 'Read-modify-write', definition: 'The three-event reality behind |= and &= ~: read, modify in the CPU, write back.' },
      { term: 'Write-1-to-clear', definition: 'A register convention where writing 1 to a bit clears it - always check the datasheet before assuming the standard idioms.' },
    ],
    revisionSummary: [
      'The four idioms: set |= mask, clear &= (uint8_t)~mask, toggle ^= mask, test (reg & mask) != 0.',
      'Masks come from bit numbers: (1u << n); fields from width and offset: (width_mask << offset).',
      'All four idioms leave unmasked bits untouched - preservation is the point of masking.',
      'Choose test semantics deliberately: any-bits (!= 0), all-bits (== mask), or exact equality.',
      'Field modification is extract (>> then &), clear ( &= ~field), set (|= value << offset).',
      'Name every mask once with its datasheet meaning; magic mask constants hide bit-number bugs.',
      'Read-modify-write is three events - on real hardware, check for side effects and races.',
    ],
    furtherReading: [
      { label: 'All About Circuits - boolean algebra and logic', url: 'https://www.allaboutcircuits.com/textbook/digital/', kind: 'article' },
      { label: 'cppreference - bitwise operators', url: 'https://en.cppreference.com/w/c/language/operator_arithmetic', kind: 'docs' },
      { label: 'Wikipedia - Mask (computing)', url: 'https://en.wikipedia.org/wiki/Mask_(computing)', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
];
