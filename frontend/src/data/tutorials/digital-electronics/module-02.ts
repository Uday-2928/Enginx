import type { TutorialLesson } from '../types';

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'de-m02-l01',
    title: 'Number Systems and Radix Conversion',
    summary:
      'Positional notation in any base, converting between decimal, binary, octal and hexadecimal in both directions, and why hardware people think in hex.',
    objectives: [
      'State the positional-weight rule that defines any numeral system with radix r.',
      'Convert decimal to binary (repeated division) and binary to decimal (weights) fluently.',
      'Convert between binary and octal (3-bit groups) and binary and hexadecimal (4-bit groups) by regrouping.',
      'Explain why hexadecimal is the standard shorthand for bit patterns in datasheets, memory dumps and RTL.',
    ],
    whyItMatters:
      'Every register value, address, opcode and datasheet table you will ever read is written in binary, hex or octal. The embedded C course prints status registers in hex; the Verilog course writes literals like `4\'hA`; this course uses binary for every truth table. Conversion must become automatic, not a procedure you rediscover under time pressure.',
    prerequisites: ['de-m01-l03'],
    explanation:
      'A positional numeral system writes a number as digits multiplied by powers of the **radix** r. For the number `d_n ... d_2 d_1 d_0` in base r, the value is:\n\n```\nvalue = d_n * r^n + ... + d_2 * r^2 + d_1 * r^1 + d_0 * r^0\n```\n\nDecimal is just the special case r = 10. Binary is r = 2 with digits 0 and 1; octal is r = 8; hexadecimal is r = 16, needing six extra digits A=10, B=11, C=12, D=13, E=14, F=15.\n\n### Binary to decimal: add the weights\n\nWrite the powers of two above the digits and sum the ones underneath:\n\n```\nweight:   64   32   16    8    4    2    1\nbits:      1    0    1    1    0    1    0\nvalue =   64 + 16 + 8 + 2 = 90\n```\n\nOnly bits set to 1 contribute; the zeros simply skip their weights. So `1011010` is 90.\n\n### Decimal to binary: repeated division by 2\n\nDivide by 2, record the remainder, repeat until the quotient is 0, then read the remainders **bottom to top**:\n\n```\n45 / 2 = 22  remainder 1   <- LSB\n22 / 2 = 11  remainder 0\n11 / 2 = 5   remainder 1\n 5 / 2 = 2   remainder 1\n 2 / 2 = 1   remainder 0\n 1 / 2 = 0   remainder 1   <- MSB\n\n45 = 101101 in binary\n```\n\nThe first remainder is the **least-significant bit (LSB)** and the last is the **most-significant bit (MSB)** — terms you will use every day from now on.\n\n### Regrouping: the fast lane\n\nBecause 8 = 2^3 and 16 = 2^4, octal and hex map onto binary *without arithmetic*:\n\n- **Binary to hex**: split into groups of 4 from the right, convert each group to one hex digit.\n- **Binary to octal**: split into groups of 3 from the right.\n\n```\n1011 1101 0110\n   B    D    6        -> 0xBD6 (hex, 3 digits replace 12 bits)\n\n001 011 110 101\n  1   3   6   5      -> 1365 (octal, 4 digits replace 12 bits)\n```\n\nThis is why hex dominates: one hex digit is exactly one nibble (4 bits), so `0xBD6` *is* the bit pattern, merely readable. Engineers say "hex is binary for humans".\n\n### Notation you must recognize\n\n- `1011` with a subscript two, or `4\'b1011` in Verilog, means binary.\n- `0x` prefix or `h` suffix means hex (`0x2F`, `2Fh`).\n- A leading `0` in C means **octal**, a famous trap: `017` is 15, not 17.',
    deepDive:
      '### Why powers of two rule hardware\n\nA register of n bits has exactly 2^n states, so counting hardware is naturally binary, and group sizes that divide 2^n cleanly (nibbles, bytes, 32-bit words) keep conversions lossless. Base 10 has no such correspondence — dividing binary by ten requires actual division circuits, which is why binary-coded decimal (BCD, storing each decimal digit in 4 bits) exists as a convenience encoding for displays even though it wastes six of every sixteen patterns.\n\n### Fractional conversion preview\n\nThe same weight rule extends right of the radix point with negative powers: 0.5, 0.25, 0.125 ... Converting decimal fractions *to* binary uses repeated multiplication by 2 instead of division (tracking the integer part), and some fractions that terminate in decimal never terminate in binary (0.2 is an infinite binary fraction) — a fact that eventually matters for floating-point, and that Lesson 4 develops in fixed-point form.\n\n### Radix in RTL literals\n\nVerilog writes sized literals as `<width>\'<base><digits>`: `4\'b1011`, `8\'h2F`, `3\'o7`, `4\'d11` all describe values an RTL designer can eyeball at the bit level. Reading and *writing* these without hesitation is a stated prerequisite of the Verilog course, and it is exactly the skill this lesson drills.',
    examples: [
      {
        title: 'Decimal to binary by repeated division, in C',
        language: 'c',
        code:
          '#include <stdio.h>\n\nvoid print_binary(unsigned int value) {\n    char bits[33];          /* room for 32 bits + terminator */\n    int i = 0;\n\n    if (value == 0) {\n        printf("0");\n        return;\n    }\n    while (value > 0) {\n        bits[i++] = (char)(\'0\' + (value % 2));  /* remainder = next bit, LSB first */\n        value /= 2;                             /* shift the number right by one bit */\n    }\n    while (i > 0) {\n        putchar(bits[--i]);                     /* print in reverse: MSB first */\n    }\n}\n\nint main(void) {\n    printf("45  = "); print_binary(45);  putchar(\'\\n\');\n    printf("200 = "); print_binary(200); putchar(\'\\n\');\n    return 0;\n}',
        explanation: [
          'Each loop iteration implements one column of the hand method: `value % 2` is the remainder (the next bit), `value / 2` is the quotient passed to the next row.',
          'Remainders arrive LSB first, exactly as in the paper method, so they are stored in an array and printed back-to-front.',
          'The `value == 0` guard exists because the loop would otherwise print nothing at all — zero is a special case in every conversion routine.',
          'For 45 the algorithm pushes bits 1,0,1,1,0,1 and prints them reversed: `101101`, matching the worked example.',
          'For 200 the output is `11001000`: 128 + 64 + 8.',
        ],
      },
      {
        title: 'Binary to hexadecimal by nibble regrouping',
        language: 'text',
        code:
          'Convert 1011 1101 0110 (12 bits) to hex and octal.\n\nHex step (groups of 4, right to left):\n\n   1011 | 1101 | 0110\n    B      D      6        (1011=8+2+1=11=B, 1101=8+4+1=13=D, 0110=4+2=6)\n\n   answer: 0xBD6\n\nOctal step (groups of 3, right to left — pad the left group with zeros):\n\n   001 | 011 | 110 | 101\n     1     3     6     5\n\n   answer: 1365 (octal)\n\nCheck by decimal: 0xBD6 = 11*256 + 13*16 + 6 = 2816 + 208 + 6 = 3030\n                  101111010110 = 2048+512+256+128+64+16+4+2 = 3030',
        explanation: [
          'Split from the right so every group is full; left padding with zeros never changes the value.',
          'Each 4-bit group maps to one hex digit through the 0-15 table, no arithmetic needed.',
          'Each 3-bit group maps to one octal digit (0-7), which is why octal was popular on 12/24-bit machines.',
          'The decimal cross-check confirms both answers land on 3030 — always verify a conversion by one independent route.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Positional weights in four radices',
        content:
          '          digit:    d3     d2     d1     d0\n\n  decimal (r=10):  1000    100     10      1     ->  2025 = 2*1000+0*100+2*10+5\n  binary  (r=2):     8      4      2      1     ->  1011 = 8+2+1 = 11\n  octal   (r=8):   512     64      8      1     ->  345o = 3*64+4*8+5 = 229\n  hex     (r=16): 4096    256     16      1     ->  1A4h = 256+10*16+4 = 424',
        caption:
          'One rule generates every numeral system: each digit position is a power of the radix.',
      },
    ],
    tables: [
      {
        caption: 'The 0-15 reference table (memorize this)',
        headers: ['Decimal', 'Binary', 'Octal', 'Hexadecimal'],
        rows: [
          ['0', '0000', '0', '0'],
          ['1', '0001', '1', '1'],
          ['2', '0010', '2', '2'],
          ['3', '0011', '3', '3'],
          ['4', '0100', '4', '4'],
          ['5', '0101', '5', '5'],
          ['6', '0110', '6', '6'],
          ['7', '0111', '7', '7'],
          ['8', '1000', '10', '8'],
          ['9', '1001', '11', '9'],
          ['10', '1010', '12', 'A'],
          ['11', '1011', '13', 'B'],
          ['12', '1100', '14', 'C'],
          ['13', '1101', '15', 'D'],
          ['14', '1110', '16', 'E'],
          ['15', '1111', '17', 'F'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reading remainders top-to-bottom when converting decimal to binary.',
        fix:
          'The first remainder is the LSB, so the answer is read from the *last* remainder to the first (bottom to top on paper). A quick sanity check: a binary number ending in 0 must be even, and the parity of each trailing bit must match the parity of the divisions.',
      },
      {
        mistake: 'Regrouping binary from the left when converting to hex or octal.',
        fix:
          'Always group from the right (LSB) side and pad the left group with leading zeros. Grouping from the left misaligns every weight and gives a wrong answer whenever the bit count is not an exact multiple of 4 (or 3).',
      },
      {
        mistake: 'Treating a C literal like `017` as seventeen.',
        fix:
          'In C a leading zero means octal: `017` is 1*8 + 7 = 15. Use `0x` for hex and avoid leading zeros on decimals. Verilog makes the base explicit (`4\'d17`), which is one of its kindnesses.',
      },
    ],
    guidedPractice: {
      title: 'Convert 173 through every radix',
      brief:
        'Convert decimal 173 to (a) binary, (b) hexadecimal, (c) octal. Use repeated division for (a), nibble regrouping for (b) and triple regrouping for (c). Then verify (a) by summing weights and (b),(c) by evaluating back to decimal.',
      starterCode:
        '#include <stdio.h>\n\n/* print_binary from the example, to verify your hand work */\nvoid print_binary(unsigned int value) {\n    char bits[33];\n    int i = 0;\n    if (value == 0) { printf("0"); return; }\n    while (value > 0) {\n        bits[i++] = (char)(\'0\' + (value % 2));\n        value /= 2;\n    }\n    while (i > 0) putchar(bits[--i]);\n}\n\nint main(void) {\n    printf("173 = ");\n    print_binary(173);\n    printf("\\n");\n    printf("hex: %X\\n", 173);   /* %X prints hexadecimal */\n    printf("oct: %o\\n", 173);   /* %o prints octal */\n    return 0;\n}',
      expectedBehavior:
        '173 = 10101101 in binary (128+32+8+4+1), = 0xAD in hex (1010=A, 1101=D), = 0255 in octal (010 101 101 -> 2 5 5). The program prints 10101101, hex AD, oct 255, confirming all three.',
      hints: [
        'Divisions: 173/2=86 r1, 86/2=43 r0, 43/2=21 r1, 21/2=10 r1, 10/2=5 r0, 5/2=2 r1, 2/2=1 r0, 1/2=0 r1 — read upward.',
        'For hex, split 10101101 into 1010 | 1101 and use the 0-15 table.',
        'For octal, pad to nine bits: 010 101 101.',
      ],
    },
    practiceExercises: [
      {
        title: 'Hex to decimal and back',
        brief:
          'Convert 0x9C to decimal and to binary. Then convert decimal 500 to hexadecimal (use repeated division by 16: 500/16 = 31 remainder 4, 31/16 = 1 remainder 15, ...).',
        expectedBehavior:
          '0x9C = 9*16 + 12 = 156 = 10011100 in binary (1001=9, 1100=C). 500 = 0x1F4 (1*256 + 15*16 + 4 = 256+240+4).',
        hints: [
          'Hex to decimal: expand weights 256, 16, 1 for a three-digit pattern.',
          'Hex to binary: one nibble per digit, no arithmetic.',
          'Decimal to hex: same division loop as binary but with 16 and remainders up to 15.',
        ],
      },
      {
        title: 'Convert 1011 and friends (assessment warm-up)',
        brief:
          'Without a calculator: (a) convert binary 1011 to decimal; (b) convert binary 110110 to hexadecimal; (c) convert octal 345 to decimal.',
        expectedBehavior:
          '(a) 1011 = 8+2+1 = 11. (b) 11 0110 -> pad to 0011 0110 -> 0x36 (= 54 decimal). (c) 345 octal = 3*64 + 4*8 + 5 = 229.',
        hints: [
          '(a) four weights: 8, 4, 2, 1.',
          '(b) pad the left group to four bits before mapping digits.',
          '(c) octal weights are 64, 8, 1.',
        ],
      },
      {
        title: 'The width question',
        brief:
          'A status register is 10 bits wide. What is its maximum unsigned value in decimal and hex? How many hex digits are needed to print it?',
        expectedBehavior:
          'Maximum = 2^10 - 1 = 1023 = 0x3FF, which needs 3 hex digits (2 hex digits only cover 8 bits, i.e. 0-255).',
        hints: [
          'n bits hold values 0 .. 2^n - 1.',
          '1023 in binary is 1111111111; group in fours from the right: 11 1111 1111.',
        ],
      },
    ],
    assessment: {
      title: 'Radix conversion checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'short-answer',
          prompt: 'Convert binary 1011 to decimal. (Answer with a number.)',
          answer: '11',
          explanation: 'Weights 8, 4, 2, 1: bits 1,0,1,1 give 8 + 0 + 2 + 1 = 11.',
          hint: 'Add the weights under the 1 bits.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'short-answer',
          prompt: 'Convert binary 110110 to hexadecimal. (Answer like 0x.. )',
          answer: '0x36',
          explanation: 'Group in fours from the right: 0011 0110 -> 3 and 6 -> 0x36 (decimal 54).',
          hint: 'Pad the left group to four bits first.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'What is decimal 45 in binary?',
          options: ['101101', '110011', '101011', '110101'],
          answer: '101101',
          explanation: 'Repeated division by 2 gives remainders 1,0,1,1,0,1 read bottom-up: 101101 (32+8+4+1 = 45).',
          hint: '45 = 32 + 13; keep splitting.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Convert octal 345 to decimal. (Answer with a number.)',
          answer: '229',
          explanation: '345 in octal = 3*64 + 4*8 + 5 = 192 + 32 + 5 = 229.',
          hint: 'Octal weights are 64, 8, 1.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'true-false',
          prompt: 'In C, the literal 017 has the value seventeen.',
          answer: 'false',
          explanation:
            'A leading 0 in C means octal: 017 = 1*8 + 7 = 15. Hex needs the 0x prefix.',
          hint: 'What does a leading zero mean in C?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Radix (base)', definition: 'The number of distinct digits a numeral system uses; each position carries a power of the radix as its weight.' },
      { term: 'LSB', definition: 'Least-significant bit: the bit carrying the 2^0 = 1 weight; the rightmost bit in written form.' },
      { term: 'MSB', definition: 'Most-significant bit: the bit carrying the largest power-of-two weight; the leftmost bit in written form.' },
      { term: 'Nibble', definition: 'A group of 4 bits; exactly one hexadecimal digit.' },
      { term: 'Hexadecimal', definition: 'Base-16 notation using digits 0-9 and A-F; one digit per 4 bits, the standard shorthand for bit patterns.' },
      { term: 'Octal', definition: 'Base-8 notation, one digit per 3 bits; still seen in UNIX file permissions and old datasheets.' },
    ],
    revisionSummary: [
      'value = sum of digit * radix^position, one rule for every base.',
      'Binary to decimal: add weights 1, 2, 4, 8, ... under the 1 bits.',
      'Decimal to binary: divide by 2 collecting remainders, read them bottom-to-top (last = MSB).',
      'Binary to hex: groups of 4 from the right; to octal: groups of 3.',
      'Memorize the 0-15 table — it is the entire conversion machinery for hex and octal.',
      'Hex literals in C start 0x; Verilog uses width\'base form like 4\'b1011; C leading-zero literals are octal.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Positional notation', url: 'https://en.wikipedia.org/wiki/Positional_notation', kind: 'article' },
      { label: 'Wikipedia — Hexadecimal', url: 'https://en.wikipedia.org/wiki/Hexadecimal', kind: 'article' },
      { label: 'Electronics Tutorials — Binary numbers', url: 'https://www.electronics-tutorials.ws/binary/bin.html', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'de-m02-l02',
    title: 'Binary Arithmetic: Addition and Subtraction',
    summary:
      'Column addition with carries, column subtraction with borrows, the single-bit addition table that hardware implements, and what a carry-out means for fixed-width registers.',
    objectives: [
      'Add and subtract multi-bit binary numbers by hand, tracking carries and borrows column by column.',
      'Recite the 1-bit full-addition rule: sum and carry-out for every (a, b, carry-in) combination.',
      'Explain how a hardware ripple-carry adder performs the same column process in parallel per bit, sequentially through the carries.',
      'Distinguish the result width from the carry-out when an addition overflows the register.',
    ],
    whyItMatters:
      'Addition is the workhorse of computing — address calculation, counters, DSP, everything — and it is the first circuit you will design in Module 5. Hand-addition fluency lets you predict what your hardware *should* do, which is how you catch simulation errors. The carry chain also introduces the propagation-delay problem that returns in Module 8 as the reason adders limit clock speed.',
    prerequisites: ['de-m02-l01'],
    explanation:
      'Binary addition follows the same column algorithm as decimal, with a smaller table. The single-bit cases:\n\n- `0 + 0 = 0`, carry 0\n- `0 + 1 = 1`, carry 0\n- `1 + 0 = 1`, carry 0\n- `1 + 1 = 10` — write 0, carry 1 (this is the "two" of binary)\n- `1 + 1 + 1 = 11` — write 1, carry 1 (a carry arriving on top of two ones)\n\n### Worked addition\n\n```\n  carries:   1 1 1 1\n              (from each column)\n     a:     1 0 1 1     (11)\n     b:   + 0 1 1 0     ( 6)\n          ---------\n   result: 1 0 0 0 1     (17)\n```\n\nColumn 0: 1+0 = 1. Column 1: 1+1 = 10, write 0 carry 1. Column 2: 0+1+carry1 = 10, write 0 carry 1. Column 3: 1+0+carry1 = 10, write 0 carry 1. The final carry out of the top column becomes the extra bit: 10001 = 17. Inside an n-bit register that fifth bit would be the **carry-out flag** and the register would hold 0001.\n\n### Subtraction with borrows\n\n- `0 - 0 = 0`, `1 - 0 = 1`, `1 - 1 = 0`, and `0 - 1 = 1` **borrow 1** from the next column (worth 2).\n\n```\n     a:     1 0 1 0     (10)\n     b:   - 0 1 1 0     ( 6)\n          ---------\n   result:   0 1 0 0     ( 4)\n```\n\nColumn 1: 1-1 = 0. Column 2: 0-1 needs a borrow: 10 - 1 = 1, and column 3 is reduced by the borrow. Column 3: 1-0-borrow1 = 0. Result 0100 = 4. Borrows ripple exactly like carries, just in the opposite arithmetic direction.\n\n### What the hardware actually builds\n\nA **full adder** is the circuit that implements one column: it takes bits a, b and the carry-in from the column to the right, and produces sum and carry-out. Chain n of them and you get an n-bit adder. The single-bit table below *is* the specification — Module 5 turns it into gates, and the Verilog course asks you to code it (there is a linked challenge on the adder lesson).\n\n### Fixed width and the carry-out\n\nRegisters have a fixed width, so hardware keeps n bits of the result and exposes the overflow past the top as a separate **carry flag**. `1011 + 0110` in a 4-bit register stores 0001 and sets carry-out = 1. Nothing is "lost" — it is reported. This same event, reinterpreted, becomes *signed overflow* in the next lesson.',
    deepDive:
      '### Why the carry chain sets the speed limit\n\nIn a ripple-carry adder, column i cannot finish until column i-1 delivers its carry. The worst case (like 1111 + 0001) walks a carry through every column, so total delay grows linearly with width. Faster adders (carry-lookahead, carry-select, prefix adders) precompute carries in parallel — a classical VLSI topic that only makes sense once you feel the ripple by hand. This is your first concrete example of *critical path*, which Module 8 formalizes.\n\n### Subtraction hardware: add the negative\n\nReal ALUs rarely build separate subtractors. Instead, subtracting b means adding the two\'s complement of b (next lesson): every bit of b is XORed with a mode bit that is 1 for subtract (which inverts it), and the mode bit also enters the carry-in, completing the "+1". One adder then serves both operations — check the 4-bit example: 10 - 6 = 10 + (256-6 style complement in 4 bits: 1010) = 1010 + 1010 = 1 0100, carry-out 1, result 0100 = 4, correct. A discarded carry-out of 1 means "no borrow" in this scheme.',
    examples: [
      {
        title: 'A 4-bit ripple-carry adder modeled bit by bit in C',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Adds two 4-bit values plus a carry-in, exactly one column at a time,\n   the way a ripple-carry adder does. */\nuint8_t add4(uint8_t a, uint8_t b, uint8_t carry_in, uint8_t *carry_out) {\n    uint8_t sum = 0;\n    uint8_t carry = carry_in & 1u;\n\n    for (int i = 0; i < 4; i++) {\n        uint8_t ai = (a >> i) & 1u;              /* bit i of a */\n        uint8_t bi = (b >> i) & 1u;              /* bit i of b */\n        uint8_t column = (uint8_t)(ai + bi + carry);  /* 0, 1, 2 or 3 */\n\n        sum |= (uint8_t)((column & 1u) << i);    /* write the sum bit */\n        carry = (uint8_t)(column >> 1);          /* pass the carry left */\n    }\n    *carry_out = carry;\n    return sum;\n}\n\nint main(void) {\n    uint8_t cout;\n    uint8_t s = add4(0xB, 0x6, 0, &cout);   /* 1011 + 0110 */\n    printf("1011 + 0110 = %u%u%u%u (carry-out %u)\\n",\n           (s >> 3) & 1u, (s >> 2) & 1u, (s >> 1) & 1u, s & 1u, cout);\n\n    s = add4(0xD, 0xB, 0, &cout);           /* 1101 + 1011 */\n    printf("1101 + 1011 = %u%u%u%u (carry-out %u)\\n",\n           (s >> 3) & 1u, (s >> 2) & 1u, (s >> 1) & 1u, s & 1u, cout);\n    return 0;\n}',
        explanation: [
          'The loop variable `i` walks the columns from LSB (i = 0) to MSB (i = 3), mirroring the hand algorithm.',
          '`ai + bi + carry` can be 0..3; its bit 0 is the column sum bit and its bit 1 is the carry to the next column — precisely the single-bit table.',
          '`sum |= (column & 1) << i` writes each sum bit into position i, building the result in the register.',
          'For 1011 + 0110 the columns produce 1, 0, 0, 0 with a final carry, so the printout is `0001 (carry-out 1)` — together 10001 = 17.',
          'For 1101 + 1011 (13 + 11 = 24) the result is `1000 (carry-out 1)`: 24 = 11000, register holds the low 4 bits.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Column addition with the carry row made explicit',
        content:
          '   carry row :  1 1 1 1    (carries produced by each column)\n                  | | | |\n        a:        1 0 1 1      (11)\n        b:     +  0 1 1 0      ( 6)\n               ----------\n        sum:   1  0 0 0 1      (17 = carry-out + 4 result bits)\n\n        column:    3 2 1 0\n        weights:   8 4 2 1\n\n   Each column:  ai + bi + carry_in  ->  sum bit + carry_out\n   The carry enters the column to its LEFT, which is why the\n   answer grows one bit wider than the operands.',
        caption:
          'The carry row makes visible the values a full adder passes between columns.',
      },
      {
        kind: 'block',
        title: 'Four full adders chained into a 4-bit adder',
        content:
          '        a3 b3        a2 b2        a1 b1        a0 b0\n         | |          | |          | |          | |\n         v v          v v          v v          v v\n       +------+     +------+     +------+     +------+\n  c3 <-| FA3  |<-c2-| FA2  |<-c1-| FA1  |<-c0-| FA0  |<- carry_in\n       |      |     |      |     |      |     |      |\n       +--+---+     +--+---+     +--+---+     +--+---+\n          |            |            |            |\n          v            v            v            v\n         sum3         sum2         sum1         sum0\n\n       carry_in = 0 for plain addition\n       carry_out (c3) = 1 means the true result needs 5 bits',
        caption:
          'The ripple-carry structure: each full adder waits for its right neighbor. FA0 can start immediately; FA3 finishes last.',
      },
    ],
    tables: [
      {
        caption: 'Single-bit full addition — the complete specification',
        headers: ['a', 'b', 'carry-in', 'sum', 'carry-out'],
        rows: [
          ['0', '0', '0', '0', '0'],
          ['0', '0', '1', '1', '0'],
          ['0', '1', '0', '1', '0'],
          ['0', '1', '1', '0', '1'],
          ['1', '0', '0', '1', '0'],
          ['1', '0', '1', '0', '1'],
          ['1', '1', '0', '0', '1'],
          ['1', '1', '1', '1', '1'],
        ],
      },
      {
        caption: 'Single-bit subtraction (a - b - borrow-in)',
        headers: ['a', 'b', 'borrow-in', 'difference', 'borrow-out'],
        rows: [
          ['0', '0', '0', '0', '0'],
          ['0', '0', '1', '1', '1'],
          ['0', '1', '0', '1', '1'],
          ['0', '1', '1', '0', '1'],
          ['1', '0', '0', '1', '0'],
          ['1', '0', '1', '0', '0'],
          ['1', '1', '0', '0', '0'],
          ['1', '1', '1', '0', '1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Forgetting that a carry may arrive on top of 1 + 1.',
        fix:
          'Always write the carry row above your columns and add three values per column: a, b, carry-in. The case 1+1+1 = 11 (write 1, carry 1) is the one people skip, and it appears in every worst-case pattern like 1111 + 0001.',
      },
      {
        mistake: 'Dropping the final carry-out as if the addition were wrong.',
        fix:
          'A carry out of the MSB column is *correct and reported*: the register keeps n bits and the flag records the overflow. In the 10 - 6 scheme via complements, carry-out = 1 actually signals success (no borrow).',
      },
      {
        mistake: 'Borrowing from a column that is itself 0 without cascading further.',
        fix:
          'A borrow must cascade: 1000 - 0001 requires borrowing through three zeros, turning 1000 into 0111 + 1 borrowed for the current column (8 - 1 = 7). Walk left until you find the first 1, flip every zero you pass to 1, and reduce that 1 to 0.',
      },
    ],
    guidedPractice: {
      title: 'Add and subtract 4-bit values',
      brief:
        'By hand: (a) compute 1101 + 1011 showing the carry row; (b) compute 1010 - 0110 showing the borrow row; (c) verify both against the C model from the example by predicting its printed output first.',
      starterCode:
        '#include <stdio.h>\n#include <stdint.h>\n\nuint8_t add4(uint8_t a, uint8_t b, uint8_t carry_in, uint8_t *carry_out) {\n    uint8_t sum = 0;\n    uint8_t carry = carry_in & 1u;\n    for (int i = 0; i < 4; i++) {\n        uint8_t column = (uint8_t)(((a >> i) & 1u) + ((b >> i) & 1u) + carry);\n        sum |= (uint8_t)((column & 1u) << i);\n        carry = (uint8_t)(column >> 1);\n    }\n    *carry_out = carry;\n    return sum;\n}\n\nint main(void) {\n    uint8_t cout;\n    uint8_t s = add4(0xD, 0xB, 0, &cout);\n    printf("1101+1011 -> %u%u%u%u, c=%u\\n",\n           (s >> 3) & 1u, (s >> 2) & 1u, (s >> 1) & 1u, s & 1u, cout);\n    /* subtraction check: 1010 - 0110 = 0100 (10 - 6 = 4) */\n    printf("decimal check: %d\\n", 10 - 6);\n    return 0;\n}',
      expectedBehavior:
        '(a) 1101 + 1011 = carry row 1111, result 11000 (13 + 11 = 24): register 1000, carry-out 1. (b) 1010 - 0110 = 0100 (10 - 6 = 4) with a borrow from bit 2. The program prints `1101+1011 -> 1000, c=1` and `decimal check: 4`.',
      hints: [
        'For (a), process columns 0..3 as 1+1, 0+1+1, 1+0+1, 1+1+1.',
        'For (b), only column 2 needs a borrow; trace its effect on column 3.',
        'Predict the C output before running the logic in your head — predicting output is the core skill of hardware verification.',
      ],
    },
    practiceExercises: [
      {
        title: 'Worst-case carry propagation',
        brief:
          'Compute 1111 + 0001 by hand with the carry row. Explain why this pattern is the slowest input for a ripple-carry adder, and state which column finishes first and which last.',
        expectedBehavior:
          '1111 + 0001 = 10000 (15 + 1 = 16): the carry is born in column 0 and ripples through columns 1, 2, 3. Column 0 finishes first; column 3 must wait for all three earlier carries, so it finishes last and determines the total delay.',
        hints: [
          'Column 0: 1+1 = 10 immediately creates the carry.',
          'Each subsequent column is 0+0+carry or 1+0+carry — the carry must physically travel.',
          'Delay of the chain = number of columns the carry traverses; that is the "ripple".',
        ],
      },
      {
        title: 'Subtraction with a cascading borrow',
        brief:
          'Compute 1000 - 0001 by hand, showing every borrow. Then compute 110100 - 011011 and check: 52 - 27 = 25.',
        expectedBehavior:
          '1000 - 0001 = 0111 (8 - 1 = 7), with a borrow cascading through three zeros. 110100 - 011011 = 011001 = 25, requiring borrows in several columns; the decimal check 52 - 27 = 25 confirms.',
        hints: [
          'For the first: 8 - 1 borrows from the bit worth 8; the three zeros become ones.',
          'For the second, work strictly column by column and mark each borrow above the next column.',
          'Convert to decimal at the end as an independent check, never as the method.',
        ],
      },
      {
        title: 'Predict the flags',
        brief:
          'An ALU adds 0111 + 0111 in a 4-bit register. State the stored 4-bit result, the carry-out, and the decimal value of the true (untruncated) result.',
        expectedBehavior:
          '7 + 7 = 14 = 1110, which still fits in 4 bits, so the register holds 1110 and carry-out = 0. The untruncated result is also 14 — no overflow past 15 occurred.',
        hints: [
          '0111 is 7; doubling it gives 14.',
          '1110 needs only 4 bits, so nothing spills into the carry.',
          'The interesting cases are results of 16 or more — this is not one of them.',
        ],
      },
    ],
    assessment: {
      title: 'Binary arithmetic checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What is the sum of 1011 + 0110, written as a 5-bit result including the carry-out bit?',
          options: ['10001', '01101', '10011', '11001'],
          answer: '10001',
          explanation: '11 + 6 = 17 = 10001. The carry-out is the leading 1; a 4-bit register would store 0001 and raise carry-out.',
          hint: 'Add the decimal values if the columns feel shaky.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'short-answer',
          prompt: 'Compute 1010 - 0110. (Give the 4-bit result, e.g. 0101.)',
          answer: '0100',
          explanation: '10 - 6 = 4 = 0100. A borrow occurs in column 2 and is repaid from column 3.',
          hint: '10 - 6 = 4; verify the binary of 4.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'In the single-bit addition table, what are sum and carry-out for a=1, b=1, carry-in=1?',
          options: ['sum=1, carry-out=1', 'sum=0, carry-out=1', 'sum=1, carry-out=0', 'sum=0, carry-out=0'],
          answer: 'sum=1, carry-out=1',
          explanation: '1 + 1 + 1 = 3 = 11 in binary: write 1, carry 1. This is the row that makes worst-case carry chains long.',
          hint: 'Three ones make three, which is binary 11.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'In an n-bit register, a carry-out of 1 after an addition means the stored n-bit result is wrong.',
          answer: 'false',
          explanation:
            'It means the true result needs more than n bits; the register correctly stores the low n bits and the carry flag reports the extra bit. Nothing is wrong — it must be interpreted.',
          hint: 'Flags exist precisely to report events the width cannot.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Compute 110100 - 011011 as a 6-bit binary result. (Binary only.)',
          answer: '011001',
          explanation: '52 - 27 = 25 = 011001. Column-by-column, borrows are needed where a 0 meets a 1 subtraction.',
          hint: '52 - 27 = 25; convert 25 to 6-bit binary as a check.',
          difficulty: 'hard',
        },
      ],
    },
    keyTerms: [
      { term: 'Carry', definition: 'The 1 passed to the next-left column when a column\'s sum reaches the radix (2 in binary).' },
      { term: 'Borrow', definition: 'The 1 taken from the next-left column when subtracting needs more than the current column holds.' },
      { term: 'Full adder', definition: 'A circuit adding three bits (a, b, carry-in) to produce sum and carry-out; one column of a multi-bit adder.' },
      { term: 'Ripple-carry adder', definition: 'An n-bit adder built by chaining full adders so each carry ripples to the next column.' },
      { term: 'Carry-out', definition: 'The carry leaving the MSB column, reported as a flag when the true result exceeds the register width.' },
      { term: 'LSB / MSB', definition: 'Least-/most-significant bit: the 1-weight end and the highest-weight end of a binary number.' },
    ],
    revisionSummary: [
      'Column addition: add a + b + carry-in per column; write the sum bit, pass the carry.',
      '1+1 = 10 and 1+1+1 = 11 — memorize these two compound cases.',
      'Column subtraction: borrows cascade left until a 1 is found.',
      'The full-adder table (8 rows) is the complete spec; Module 5 implements it in gates.',
      'Fixed-width registers truncate to n bits and report the overflow as carry-out.',
      'Carries must physically travel through columns — the origin of adder delay and of Module 8 timing limits.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Adder (electronics)', url: 'https://en.wikipedia.org/wiki/Adder_(electronics)', kind: 'article' },
      { label: 'Electronics Tutorials — Binary numbers addition', url: 'https://www.electronics-tutorials.ws/binary/binary-numbers.html', kind: 'article' },
      { label: 'All About Circuits — Binary arithmetic', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-2/binary-arithmetic/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'de-m02-l03',
    title: "Two's Complement and Signed Arithmetic",
    summary:
      'The standard encoding for signed integers: how two\'s complement works, how to negate, why addition hardware needs no changes, and how to detect signed overflow.',
    objectives: [
      'Interpret an n-bit pattern as unsigned or as two\'s-complement signed, given the MSB rule.',
      'Negate any two\'s-complement value with the invert-and-add-1 recipe.',
      'State the range of n-bit two\'s complement and explain why it is asymmetric.',
      'Add signed values and detect overflow using the carry-in/carry-out rule or the sign rule.',
    ],
    whyItMatters:
      "Two's complement is *the* signed-integer representation of modern computing: C's `int8_t`, Verilog's `signed` vectors, every ALU and every C compiler. The magic is that the same adder serves signed and unsigned math with zero extra hardware. The Embedded C course reuses this exact machinery when it teaches integer promotion and char sign-ness, so the vocabulary — two's complement, MSB sign bit, overflow — must be solid now.",
    prerequisites: ['de-m02-l02'],
    explanation:
      "Unsigned values use all n bits as magnitude. For **signed** values we need negative numbers too, and the industry-standard answer is **two's complement**: keep the ordinary weights for bits n-1 down to 1, but give the MSB a *negative* weight:\n\n```\n4-bit pattern b3 b2 b1 b0 has value:  -8*b3 + 4*b2 + 2*b1 + 1*b0\n```\n\nSo `0101` = 5, and `1011` = -8 + 2 + 1 = **-5**. One convention, no separate sign flag, and every pattern maps to exactly one number.\n\n### The negation recipe\n\nTo negate x: **invert every bit, then add 1**.\n\n```\n 6 = 00000110\ninvert:  11111001\nadd 1:   11111010  =  -6    (check: -8-4-2+0+... -> 128-based check below)\n```\n\nWhy it works: inverting x gives (2^n - 1) - x, and adding 1 gives 2^n - x, which is exactly -x modulo 2^n. The recipe applied twice returns the original number. Note the special case: negating 1000 0000 (-128, in 8 bits) yields itself — there is no +128 to reach, which is the boundary case behind the range asymmetry.\n\n### Range\n\nn-bit two's complement spans **-2^(n-1) to +2^(n-1) - 1**: 8 bits give -128 to +127, 16 bits give -32768 to +32767. The extra negative value exists because zero consumes one of the positive-side patterns (there is no negative zero).\n\n### One adder for both worlds\n\nUnsigned 1111 + 0001 = (carry-out 1) 0000 means 15 + 1 = 16 mod 16. Signed, the same bits are -1 + 1 = 0. The bit-level arithmetic is *identical*; only the interpretation differs. That is the entire economic argument for two's complement: no signed-only circuitry, no separate subtractor (add the complement), no sign correction after addition.\n\n### Detecting signed overflow\n\nOverflow happens when the true result falls outside the representable range. Two equivalent tests:\n\n1. **Carry test**: overflow iff the carry *into* the MSB column differs from the carry *out* of it.\n2. **Sign test**: overflow iff two operands of the same sign produce a result of the opposite sign. (If operands have different signs, overflow is impossible.)\n\nExample: `0111 (+7) + 0001 (+1) = 1000 (-8)` — carry into MSB is 1, carry out is 0: mismatch, overflow. `1000 (-8) + 1111 (-1) = 0111 (+7)` — again mismatch: two negatives produced a positive. Underflow is the same event on the negative side (e.g. -128 - 1 wraps to +127).",
    deepDive:
      '### Sign extension\n\nWidening a signed value to more bits must preserve its value: copy the MSB into every new bit. `1111` (-1 in 4 bits) becomes `11111111` (-1 in 8 bits); `0101` (5) becomes `00000101`. Widening an *unsigned* value instead pads with zeros. In C this is the difference between converting a `signed char` and an `unsigned char` to `int` — the Embedded C course revisits this as sign-extension vs zero-extension, and RTL synthesis performs it automatically on `signed` Verilog operands.\n\n### The modular arithmetic view\n\nTwo\'s complement is arithmetic modulo 2^n with the top half of the number circle relabeled as negative. Every operation is a walk around a 2^n-position circle: adding walks forward, subtracting backward, and "overflow" is landing on the far side of the circle from where arithmetic in infinite precision would put you. This view explains why the negation recipe works, why adding works for subtraction, and why the range is asymmetric — all at once.\n\n### Overflow vs carry: two different flags\n\nReal ALUs report *both*: the carry flag (unsigned overflow past the top) and the overflow flag (signed overflow). 1111 + 0001 sets carry (unsigned 15+1=16 > 15) but *not* overflow (signed -1+1=0 is fine). 0111 + 0001 sets overflow (signed 7+1 wraps) but *not* carry (unsigned 7+1=8 still fits). Which flag matters depends entirely on whether your variables are signed — a distinction the Embedded C course makes you apply in code.',
    examples: [
      {
        title: 'Signed addition with overflow detection, modeled portably in C',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* 8-bit two\'s-complement addition performed on unsigned storage,\n   with the hardware overflow test. Unsigned arithmetic wraps cleanly,\n   which is exactly what an n-bit hardware adder does. */\nint add8(uint8_t a, uint8_t b, int *overflow) {\n    uint8_t raw = (uint8_t)(a + b);\n\n    /* Test 1 (carry): carry INTO the MSB must equal carry OUT of it. */\n    /* Test 2 (sign):  equal input signs but a result sign that differs. */\n    int same_sign    = ((a ^ b) & 0x80u) == 0;    /* operands agree in sign */\n    int sign_flipped = ((raw ^ a) & 0x80u) != 0;  /* result sign differs from a */\n    *overflow = same_sign && sign_flipped;\n\n    /* Reinterpret the 8-bit pattern in two\'s complement: */\n    return (raw >= 0x80u) ? (int)raw - 256 : (int)raw;\n}\n\nint main(void) {\n    int of;\n    int r;\n\n    r = add8(0x7Fu, 0x01u, &of);   /* +127 + +1 */\n    printf(" 127 +   1 = %4d, overflow: %s\\n", r, of ? "YES" : "no");\n\n    r = add8(0xFFu, 0x01u, &of);   /* -1 + +1 */\n    printf("  -1 +   1 = %4d, overflow: %s\\n", r, of ? "YES" : "no");\n\n    r = add8(0x80u, 0xFFu, &of);   /* -128 + -1 */\n    printf("-128 +  -1 = %4d, overflow: %s\\n", r, of ? "YES" : "no");\n\n    r = add8(0x0Au, 0xF6u, &of);   /* +10 + -10 */\n    printf("  10 + -10 = %4d, overflow: %s\\n", r, of ? "YES" : "no");\n    return 0;\n}',
        explanation: [
          'The raw 8-bit sum wraps modulo 256 exactly like hardware; unsigned arithmetic in C is defined to wrap, so the model has no undefined behavior.',
          'The sign test is the compact hardware rule: overflow is only possible when operand signs match, and then only if the result sign flips.',
          'Case 1: 0x7F + 0x01 = 0x80; both operands positive, result pattern negative — overflow YES, and the pattern reinterprets to -128.',
          'Case 2: -1 + 1 = 0 with no overflow (signs differ, so overflow is impossible); the function returns 0.',
          'Case 3: -128 + -1 = -129, unrepresentable; the bits wrap to 0x7F (+127) and overflow YES — underflow and overflow are the same wrap event.',
          'Case 4: 10 + (-10) = 0, the textbook proof that adding a value to its complement yields zero with no overflow.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'The 4-bit two\'s-complement number circle (as a line)',
        content:
          '  -8    -7    -6    -5    -4    -3    -2    -1     0    +1   +2   +3   +4   +5   +6   +7\n 1000  1001  1010  1011  1100  1101  1110  1111  0000  0001 0010 0011 0100 0101 0110 0111\n\n  ^                                                                                  ^\n  |                                                                                  |\n  most negative (wraps to 0000 on +1)                          most positive (no +1 slot)\n\n  reading rule: MSB weight is -8 (for 4 bits); all other weights positive\n  negation:     invert all bits, add 1\n  range:        -2^(n-1) ... +2^(n-1)-1   (asymmetric: one extra negative)',
        caption:
          "Signed interpretation of every 4-bit pattern; unsigned values would label the same patterns 8..15.",
      },
    ],
    tables: [
      {
        caption: '4-bit two\'s complement — all 16 patterns',
        headers: ['Binary', 'Unsigned', "Two's complement"],
        rows: [
          ['0000', '0', '0'],
          ['0001', '1', '1'],
          ['0010', '2', '2'],
          ['0011', '3', '3'],
          ['0100', '4', '4'],
          ['0101', '5', '5'],
          ['0110', '6', '6'],
          ['0111', '7', '7'],
          ['1000', '8', '-8'],
          ['1001', '9', '-7'],
          ['1010', '10', '-6'],
          ['1011', '11', '-5'],
          ['1100', '12', '-4'],
          ['1101', '13', '-3'],
          ['1110', '14', '-2'],
          ['1111', '15', '-1'],
        ],
      },
      {
        caption: 'Carry flag vs overflow flag on the same additions (8-bit)',
        headers: ['Operation', 'Unsigned reading', 'Signed reading', 'Carry flag', 'Overflow flag'],
        rows: [
          ['1111 1111 + 0000 0001', '255 + 1 = 256 (wrap to 0)', '-1 + 1 = 0 (correct)', '1', '0'],
          ['0111 1111 + 0000 0001', '127 + 1 = 128 (fits)', '127 + 1 = -8 (wrap)', '0', '1'],
          ['1000 0000 + 1111 1111', '128 + 255 = 383 (wrap)', '-128 + -1 = +127 (wrap)', '1', '1'],
          ['0000 1010 + 1111 0110', '10 + 246 = 256 (wrap)', '10 + -10 = 0 (correct)', '1', '0'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using a separate "sign bit + magnitude" reading for two\'s complement.',
        fix:
          "Sign-magnitude (where 1011 = -3) is a different, obsolete encoding. In two's complement the MSB is not a flag, it is a *negative weight*: 1011 = -8+2+1 = -5. The quick route is still invert-and-add-1.",
      },
      {
        mistake: 'Calling every discarded carry-out a signed overflow.',
        fix:
          'Carry-out is the *unsigned* event; signed overflow needs the carry-in vs carry-out mismatch (or the sign test). 1111 + 0001 has carry-out 1 but is perfectly correct signed math (-1 + 1 = 0).',
      },
      {
        mistake: 'Zero-extending a negative value when widening it.',
        fix:
          'Sign extension copies the MSB: -1 as 4-bit 1111 must widen to 11111111, not 00001111. Zero-extension changes the value from -1 to +15. Widths change; values must not.',
      },
    ],
    guidedPractice: {
      title: 'Negate, interpret, add',
      brief:
        "Working in 8 bits: (a) write +6 in binary and negate it with the invert-and-add-1 recipe; (b) interpret the pattern 10010110 as signed; (c) compute -3 + -5 in 4 bits and state whether overflow occurs.",
      starterCode:
        '#include <stdio.h>\n#include <stdint.h>\n\n/* verify your hand results: reinterpret an 8-bit pattern as signed */\nint as_signed8(uint8_t raw) {\n    return (raw >= 0x80u) ? (int)raw - 256 : (int)raw;\n}\n\nint main(void) {\n    printf("0x9C as signed = %d\\n", as_signed8(0x9C));  /* part (b) */\n    printf("0xFA as signed = %d\\n", as_signed8(0xFA));  /* part (a) check */\n    return 0;\n}',
      expectedBehavior:
        "(a) +6 = 00000110 -> invert 11111001 -> add 1 = 11111010 = -6 (0xFA). (b) 10010110: MSB set, so value = 150 - 256 = -106. (c) -3 = 1101, -5 = 1011; 1101 + 1011 = 1 1000 -> 4-bit result 1000 = -8, no overflow because -8 is representable and carry-out is discarded.",
      hints: [
        "Negation: 00000110 -> 11111001 -> +1 -> 11111010.",
        "For (b), either subtract 256 from the unsigned value or invert+add 1 to find the magnitude (0110 1010 = 106).",
        "For (c), check the answer against the true sum (-8) — if the 4-bit result equals it, there is no overflow.",
      ],
    },
    practiceExercises: [
      {
        title: 'Overflow forensics',
        brief:
          "In 8-bit two's complement, compute with signs: (a) 100 + 50; (b) -100 + -50; (c) -100 + 50. For each, give the stored byte, the true arithmetic result, and whether the overflow flag sets.",
        expectedBehavior:
          "(a) true result 150 > 127: stored 10010110 (-106), overflow YES (carry into MSB 1, out 0). (b) true result -150 < -128: stored 01100110 (+102), overflow YES (two negatives giving a positive). (c) true result -50: stored 11001110, no overflow (signs differ).",
        hints: [
          "First decide from the true result whether it fits in -128..127.",
          "For the flag, apply: same operand signs + flipped result sign = overflow.",
          "Stored byte = true result modulo 256, reinterpreted signed.",
        ],
      },
      {
        title: 'Subtraction as complement addition',
        brief:
          "Compute 10 - 6 in 4-bit two's complement by adding the complement: write 10, write -6 (negate 0110), add them, discard the carry-out, and verify the result is 4.",
        expectedBehavior:
          "10 = 1010; 6 = 0110 -> -6 = 1001 + 1 = 1010. 1010 + 1010 = 1 0100: carry-out 1 is discarded, leaving 0100 = 4. Correct — the discarded carry-out of 1 means 'no borrow occurred'.",
        hints: [
          "Negate 6 first: invert 0110 -> 1001, add 1 -> 1010.",
          "Add the two 4-bit patterns and keep only 4 bits.",
          "A final carry-out of 1 in subtract-mode means the subtraction succeeded.",
        ],
      },
      {
        title: 'Sign extension drill',
        brief:
          "Widen each 4-bit value to 8 bits, preserving value: (a) 0101; (b) 1011; (c) 1111. Give both the 8-bit pattern and the decimal value.",
        expectedBehavior:
          "(a) 00000101 = 5 (copy 0s). (b) 11111011 = -5 (copy 1s: -128+64+32+16+8+2+1 = -5). (c) 11111111 = -1.",
        hints: [
          "Signed widening replicates the MSB; unsigned widening pads with zeros.",
          "Check (b) by invert+add 1: 00000100 + 1 = 00000101 = 5, so the value is -5.",
          "A widened value must read as the same number in both widths — that is the acceptance test.",
        ],
      },
    ],
    assessment: {
      title: "Two's complement checkpoint",
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'short-answer',
          prompt: "Interpret the 4-bit pattern 1011 as a two's-complement signed value. (Answer with a number.)",
          answer: '-5',
          explanation: "MSB weight is -8: -8 + 0 + 2 + 1 = -5. Equivalently invert 1011 -> 0100, add 1 -> 0101 = 5, so the value is -5.",
          hint: "Give the MSB its negative weight (-8 for 4 bits).",
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'short-answer',
          prompt: "Write -6 as an 8-bit two's-complement pattern.",
          answer: '11111010',
          explanation: "6 = 00000110; inverted = 11111001; +1 = 11111010.",
          hint: "Invert the pattern of 6, then add 1.",
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: "What is the range of an 8-bit two's-complement integer?",
          options: ['-128 to +127', '-127 to +127', '-128 to +128', '-255 to +255'],
          answer: '-128 to +127',
          explanation: "-2^(n-1) to +2^(n-1)-1: 10000000 = -128, 01111111 = +127. Zero takes one pattern from the positive side, making the range asymmetric.",
          hint: "One extra value on the negative side.",
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: "Signed overflow occurs when the carry into the MSB column equals the carry out of it.",
          answer: 'false',
          explanation:
            "Overflow is when they DIFFER. Equal carries mean the sign of the result is consistent; a mismatch means the sign bit was clobbered by a magnitude carry.",
          hint: "The rule detects a *mismatch*, not a match.",
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'output-prediction',
          prompt: 'What does the C model print for the overflow flag in the case add8(0x80u, 0xFFu, &of) (-128 + -1)?',
          code:
            'uint8_t raw = (uint8_t)(a + b);\nint same_sign    = ((a ^ b) & 0x80u) == 0;\nint sign_flipped = ((raw ^ a) & 0x80u) != 0;\n*overflow = same_sign && sign_flipped;',
          options: ['YES (overflow)', 'no', 'cannot be determined', 'the code is invalid'],
          answer: 'YES (overflow)',
          explanation:
            "raw = 0x7F. Operands -128 and -1 share sign bit 1 (same_sign true), and the result sign 0 differs from a's sign 1 (sign_flipped true): overflow. The true result -129 does not fit in 8 bits.",
          hint: "Apply the sign test to the two operand MSBs and the result MSB.",
          difficulty: 'hard',
        },
      ],
    },
    keyTerms: [
      { term: "Two's complement", definition: 'Signed binary encoding where the MSB carries weight -2^(n-1); identical addition hardware serves signed and unsigned values.' },
      { term: 'Sign bit', definition: 'The MSB of a two\'s-complement value: 0 for non-negative, 1 for negative (as a consequence of its negative weight).' },
      { term: 'Overflow', definition: 'A signed result outside the representable range; detected by differing carry-in/carry-out at the MSB or by the sign test.' },
      { term: 'Underflow', definition: 'The negative-direction wrap: a result below -2^(n-1) that wraps into the positive range.' },
      { term: 'Sign extension', definition: 'Widening a signed value by replicating the MSB into the new bits, preserving its value.' },
      { term: 'Carry flag vs overflow flag', definition: 'Carry reports unsigned out-of-range; overflow reports signed out-of-range. ALUs report both.' },
    ],
    revisionSummary: [
      "Two's complement: MSB weight is negative (-2^(n-1)), all other weights positive.",
      "Negate: invert all bits, add 1. Applying it twice returns the original.",
      "Range is -2^(n-1) .. +2^(n-1)-1 — asymmetric because 0 uses a positive-side pattern.",
      "The same adder serves signed and unsigned; only interpretation and flags differ.",
      "Overflow test: carry into MSB != carry out of MSB (equivalently, matching operand signs but flipped result sign).",
      "Sign-extend when widening signed values; zero-extend unsigned.",
      "Subtraction = addition of the complement; a discarded carry-out of 1 means 'no borrow'.",
    ],
    furtherReading: [
      { label: "Wikipedia — Two's complement", url: "https://en.wikipedia.org/wiki/Two%27s_complement", kind: 'article' },
      { label: 'Wikipedia — Signed number representations', url: 'https://en.wikipedia.org/wiki/Signed_number_representations', kind: 'article' },
      { label: 'Electronics Tutorials — Signed binary numbers', url: 'https://www.electronics-tutorials.ws/binary/signed-binary-numbers.html', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'de-m02-l04',
    title: 'Fixed-Width Values, Bit Significance, and Binary Fractions',
    summary:
      'What a fixed width buys and costs, MSB/LSB and nibble manipulation in code, and the two\'s-complement-friendly world of binary fractions and fixed-point numbers.',
    objectives: [
      'Compute the range of an n-bit unsigned or signed field and choose widths deliberately.',
      'Extract, set, clear and test individual bits and nibbles with shifts and masks.',
      'Evaluate binary fractions and convert fixed-point patterns to decimal values.',
      'Explain why hardware prefers fixed-point (and often avoids floating point) for arithmetic.',
    ],
    whyItMatters:
      'Real registers always have a fixed width: an 8-bit status register, a 10-bit ADC result, a 32-bit timer. Reading datasheets and writing drivers means treating one variable as *fields*: bit 7 means something, bits 3-0 mean something else. Meanwhile, when hardware must handle fractions — audio levels, filter coefficients, motor positions — it uses binary fractions in fixed-point form, the same trick this lesson teaches. These are exactly the skills the Embedded C course drills with `&`, `|`, `<<` and `>>`.',
    prerequisites: ['de-m02-l01', 'de-m02-l03'],
    explanation:
      'A **fixed-width** value lives in exactly n bits, no matter how small its magnitude. That has two consequences: the range is capped (n unsigned bits hold 0 to 2^n - 1; signed, -2^(n-1) to 2^(n-1) - 1) and results that exceed the width must be *truncated with a flag* or *wrapped*, never silently extended.\n\n### Bit significance and masking\n\nThe bits of a byte have unequal importance: the **MSB** carries the largest weight, the **LSB** the smallest. Software reaches individual bits with masks:\n\n- Test bit i: `(x >> i) & 1`\n- Set bit i: `x | (1 << i)`\n- Clear bit i: `x & ~(1 << i)`\n- Extract the low nibble: `x & 0x0F`; the high nibble: `(x >> 4) & 0x0F`\n\nEvery peripheral driver in the Embedded C course is built from these four operations on real register addresses.\n\n### Binary fractions\n\nThe weight rule continues past the binary point with negative powers of two:\n\n```\n  1  0 .  1   0   1\n  2  1 | 1/2  1/4  1/8\n       |  weights 2^0, then 2^-1, 2^-2, 2^-3 ...\n\n10.11 in binary = 2 + 0.5 + 0.25 = 2.75\n0.101           = 0.5 + 0.125   = 0.625\n0.011           = 0.25 + 0.125  = 0.375\n```\n\nNote what binary fractions *cannot* do: 0.2 decimal has no finite binary form (it becomes a repeating pattern, 0.00110011...), which is the deep reason binary floating point cannot represent 0.2 exactly — and why digital hardware often sidesteps fractions altogether.\n\n### Fixed-point: fractions with integer hardware\n\n**Fixed-point** fixes the binary point at an agreed position. In a Q2.2 format (2 integer bits, 2 fraction bits, 4 bits total), the pattern `0110` means `01.10` = 1 + 0.5 = **1.5**. Multiplying two Q2.2 values yields a Q4.4 product that the code shifts back — but the *adder needs no changes at all*: adding two Q2.2 patterns adds exactly like integers. That is the entire appeal for hardware: reuse integer ALUs, accept a fixed resolution of 2^-2 = 0.25 in this example, and document the scaling in the type name. Audio pipelines, PID controllers and DSP filters on small chips live in fixed-point.',
    deepDive:
      '### Truncation, rounding and growth: the three fixed-width disciplines\n\nWhen arithmetic changes widths, hardware designers make one of three explicit choices. *Truncation* drops high bits (modular wrap — correct for counters). *Saturation* clamps at the max/min value (correct for audio, where wrap would click horribly). *Growth* widens the result type so nothing is lost (correct for accumulation, e.g. a 16-bit sum of 8-bit samples needs 16 + log2(N) bits). Choosing the wrong one is a classic bug class — a music player that wraps instead of saturates produces a full-scale square wave at every clip.\n\n### Resolution vs range: the fixed-point bargain\n\nEvery fixed-point format is a trade: Q2.2 spans -2.0 to +1.75 in steps of 0.25. Doubling fraction bits halves the step but (at fixed total width) halves the range. Floats escape this by storing an exponent, at the cost of entirely different adder hardware, variable rounding, and — historically — orders of magnitude more silicon and latency. FPGAs and small MCUs still default to fixed-point for control loops; this is why DSP literature speaks of Q15 (one sign bit, 15 fraction bits) as a native dialect.\n\n### Where the bit positions come from in RTL\n\nVerilog declares widths explicitly: `[9:0] adc_value` is a 10-bit bus, `[3:0]` a nibble. Concatenation `{high, low}` and part-selects `adc_value[9:2]` do in hardware what shifts and masks do in C. If you finish this course comfortable with "bit i has weight 2^i, fields are slices of a register", the Verilog course\'s vector syntax will read like a notation change, not a new concept.',
    examples: [
      {
        title: 'Reading a status register as fields in C',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t status = 0xB4;    /* pretend this came from a peripheral */\n\n    printf("pattern       : %d%d%d%d %d%d%d%d\\n",\n           (status >> 7) & 1u, (status >> 6) & 1u, (status >> 5) & 1u, (status >> 4) & 1u,\n           (status >> 3) & 1u, (status >> 2) & 1u, (status >> 1) & 1u, status & 1u);\n    printf("bit 7 (MSB)   : %u\\n", (unsigned)((status >> 7) & 1u));\n    printf("bit 0 (LSB)   : %u\\n", (unsigned)(status & 1u));\n    printf("low nibble    : 0x%X\\n", (unsigned)(status & 0x0Fu));\n    printf("high nibble   : 0x%X\\n", (unsigned)((status >> 4) & 0x0Fu));\n    printf("bit 2 set?    : %s\\n", (status & (1u << 2)) ? "yes" : "no");\n\n    uint8_t with_flag = (uint8_t)(status | (1u << 0));   /* set bit 0 */\n    uint8_t cleared   = (uint8_t)(status & (uint8_t)~(1u << 5)); /* clear bit 5 */\n    printf("set bit 0     : 0x%02X\\n", (unsigned)with_flag);\n    printf("clear bit 5   : 0x%02X\\n", (unsigned)cleared);\n    return 0;\n}',
        explanation: [
          '0xB4 is 1011 0100 — the printout reconstructs it bit by bit to make the mapping visible.',
          'Bit 7 (MSB) is 1, bit 0 (LSB) is 0; the nibbles are 0xB and 0x4, matching the hex spelling of the value itself.',
          'The test `(status >> i) & 1` is the canonical read-one-bit idiom; the masked-and-shifted forms for nibbles are the same idea over 4 bits.',
          'Setting bit 0 gives 1011 0101 = 0xB5; clearing bit 5 gives 1001 0100 = 0x94 — both operations only touch their own bit.',
          'This exact test/set/clear trio is what the Embedded C course applies to peripheral registers; here it is pure bit practice.',
        ],
      },
      {
        title: 'Fixed-point Q2.2 arithmetic check',
        language: 'text',
        code:
          'Format: Q2.2  ->  4-bit pattern s ii ff   (1 sign-ish MSB, 2 integer, 2 fraction)\nWeights:      -2 , 1 , 1/2 , 1/4\n\npattern 0110  ->  01.10  ->  0*2 + 1*1 + 1*0.5 + 0*0.25  =  1.5\npattern 1110  ->  11.10  ->  -2 + 1 + 0.5               = -0.5\npattern 1111  ->  11.11  ->  -2 + 1 + 0.5 + 0.25        = -0.25\npattern 0100  ->  01.00  ->  +1.0\n\nAddition (integer adder, no changes):\n   1.5 + (-0.5) = 1.0\n   0110 + 1110 = 1 0100  ->  keep 4 bits: 0100 = +1.0   OK\n\nMultiplication grows the format: Q2.2 * Q2.2 -> Q4.4 (8 bits)\n   1.5 * 1.5 = 2.25 -> 0010 0100 pattern; shift right by 2 to return to Q2.2\n   0010 0100 >> 2 = 0010 01 -> keep 4 bits: 1001 = -1.75  (SATURATE/round in real code,\n   this example shows why naive truncation after multiply needs care)',
        explanation: [
          'The Q2.2 weights reuse two\'s complement: MSB negative, then integer weights, then fraction weights 1/2, 1/4.',
          'Addition of fixed-point patterns is plain integer addition as long as both operands share the same format — the whole point of fixed-point.',
          'The multiplication result is correct at 2.25 in Q4.4; converting back to Q2.2 cannot represent it exactly, illustrating the resolution bargain.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Bit weights across an 8-bit register and a Q2.2 field',
        content:
          '  8-bit unsigned register:\n\n   bit:     7    6    5    4    3    2    1    0\n   weight: 128   64   32   16    8    4    2    1\n            ^                             ^\n           MSB                           LSB\n\n  the same 8 bits as Q4.4 fixed point:\n\n   bit:     7    6    5    4  .  3    2    1    0\n   weight:  -8    4    2    1  .  1/2  1/4  1/8 1/16\n                                    ^ binary point (fixed by agreement)\n\n  same bits, different agreed meaning — the point position IS the format.',
        caption:
          'Fixed width means fixed weights; where you place the binary point is a documented convention, not a property of the bits.',
      },
    ],
    tables: [
      {
        caption: 'Range of common widths',
        headers: ['Width', 'Unsigned range', "Signed (two's complement) range"],
        rows: [
          ['4 bits', '0 .. 15', '-8 .. +7'],
          ['8 bits (byte)', '0 .. 255', '-128 .. +127'],
          ['10 bits (typical ADC)', '0 .. 1023', '-512 .. +511'],
          ['16 bits (half-word)', '0 .. 65 535', '-32 768 .. +32 767'],
          ['32 bits (word)', '0 .. 4 294 967 295', '-2 147 483 648 .. +2 147 483 647'],
        ],
      },
      {
        caption: 'Binary fraction weights',
        headers: ['Bit position', 'Weight', 'Decimal value'],
        rows: [
          ['2^0 (units)', '1', '1.0'],
          ['2^-1', '1/2', '0.5'],
          ['2^-2', '1/4', '0.25'],
          ['2^-3', '1/8', '0.125'],
          ['2^-4', '1/16', '0.0625'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming 0.1 or 0.2 have exact binary representations.',
        fix:
          'Decimal fractions with factors other than 2 in the denominator repeat forever in binary (0.2 = 0.001100110011...). Fixed-point and floating point both approximate them. Never compare computed fractional values with == in code; compare against a tolerance.',
      },
      {
        mistake: 'Shifting a value wider than its type and expecting bits to appear.',
        fix:
          'In C, `(uint8_t)x << 8` shifts in a promoted int then truncates on assignment; if you need the high bits, compute in a wider type first (`(uint32_t)x << 8`). In hardware terms: the wire is only n bits wide; widening must be explicit, with sign or zero extension (previous lesson).',
      },
      {
        mistake: 'Mixing fixed-point formats in one expression.',
        fix:
          'Q2.2 + Q4.4 adds the *bit patterns*, which is meaningless. Convert to a common format (shift one operand) first. Real projects encode the format in the type or name (`temp_q22`) precisely to make mismatches visible in review.',
      },
    ],
    guidedPractice: {
      title: 'Decode an ADC result and a fixed-point coefficient',
      brief:
        'A 10-bit ADC reading is stored as 0x2FF. (a) What is its decimal value and binary pattern? (b) The ADC reference spans 0-5.0 V; what voltage does the reading represent (value * 5.0 / 1023, to two decimals)? (c) Interpret the 4-bit pattern 0110 as Q2.2 fixed point.',
      starterCode:
        '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint16_t adc = 0x2FF;              /* 10-bit field inside 16 bits */\n    printf("adc value   = %u\\n", (unsigned)adc);\n    printf("voltage     = %.2f V\\n", adc * 5.0 / 1023.0);\n\n    uint8_t q22 = 0x6;                 /* Q2.2 pattern 0110 */\n    double value = ((q22 & 0x8) ? -2.0 : 0.0)   /* bit 3: weight -2   */\n                 + ((q22 & 0x4) ? 1.0 : 0.0)   /* bit 2: weight  1   */\n                 + ((q22 & 0x2) ? 0.5 : 0.0)   /* bit 1: weight  1/2 */\n                 + ((q22 & 0x1) ? 0.25 : 0.0); /* bit 0: weight  1/4 */\n    printf("Q2.2 value  = %.2f\\n", value);\n    return 0;\n}',
      expectedBehavior:
        '(a) 0x2FF = 767 = 10 1111 1111 in binary. (b) 767 * 5.0 / 1023 = 3.75 V. (c) 0110 = 01.10 = 1.5.',
      hints: [
        'Hex to binary is nibble-for-nibble: 2 = 0010, F = 1111.',
        'The program prints 767, 3.75 V and 1.50 — predict each before agreeing.',
        'For (c), split the pattern at the binary point: 01 | 10.',
      ],
    },
    practiceExercises: [
      {
        title: 'Field surgery',
        brief:
          'For control = 0xB4 (1011 0100): give the value of bits 6..4 as a 3-bit field, the value of bit 0, and the new byte after setting bit 1 and clearing bit 2.',
        expectedBehavior:
          'Bits 6..4 = 011 = 3. Bit 0 = 0. Setting bit 1 gives 0xB4 | 0x02 = 0xB6; clearing bit 2 gives 0xB4 & ~0x04 = 0xB0; applying both gives 0xB0 | 0x02 = 0xB2.',
        hints: [
          'Extract a field with (x >> start) & ((1 << width) - 1).',
          'Set with |, clear with & ~ — the two never swap roles.',
          'Apply operations one at a time and recompute the hex after each.',
        ],
      },
      {
        title: 'Fixed-point range budget',
        brief:
          'You must represent temperatures from -10.0 to +40.0 degrees with a resolution of at least 0.05 degrees in a 16-bit signed fixed-point format. Propose a Q format, compute its actual step and range, and confirm both requirements hold.',
        expectedBehavior:
          'Q7.8 (8 fraction bits) gives a step of 1/256 = 0.0039 and a signed range of -128 to +127.996 — resolution is far better than 0.05 and range covers -10..+40. Q6.9 would also work; Q5.10 wastes range but still qualifies. The essential check: step = 2^-fraction_bits <= 0.05, and range 2^(integer_bits) covers the span.',
        hints: [
          'Resolution requirement: 2^-f <= 0.05 -> f >= 5 (1/32 = 0.03125).',
          'Range requirement: integer span must exceed 50 degrees in magnitude.',
          'Any (i, f) split of 16 bits with f >= 5 and i >= 6 satisfies both; pick one and verify numbers.',
        ],
      },
      {
        title: 'Binary fraction conversion sprint',
        brief:
          'Convert to decimal: (a) 0.101; (b) 10.11; (c) 0.011. Then convert 0.75 decimal to binary.',
        expectedBehavior:
          '(a) 0.5 + 0.125 = 0.625. (b) 2 + 0.5 + 0.25 = 2.75. (c) 0.25 + 0.125 = 0.375. And 0.75 = 0.11 in binary (0.5 + 0.25).',
        hints: [
          'Weights right of the point: 1/2, 1/4, 1/8.',
          'For 0.75, subtract the largest weight that fits (0.5), then the next (0.25).',
          'Termination check: a decimal fraction converts to a finite binary fraction only when it is a sum of distinct 2^-k terms.',
        ],
      },
    ],
    assessment: {
      title: 'Fixed width and fractions checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'short-answer',
          prompt: 'What is the maximum unsigned value of a 10-bit register? (Number only.)',
          answer: '1023',
          explanation: '2^10 - 1 = 1023; typical of ADC outputs.',
          hint: '2^10 minus one.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does the program print for the low nibble of status = 0xB4?',
          code: 'uint8_t status = 0xB4;\nprintf("low nibble: 0x%X\\n", status & 0x0F);',
          options: ['0xB', '0x4', '0xB4', '0x40'],
          answer: '0x4',
          explanation: '0xB4 & 0x0F keeps only the four LSBs: 0100 = 0x4. The high nibble (0xB) needs a shift first.',
          hint: 'The mask 0x0F keeps 4 bits without moving them.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'short-answer',
          prompt: 'What decimal value does binary 0.101 represent? (Number.)',
          answer: '0.625',
          explanation: '0.101 = 1/2 + 0/4 + 1/8 = 0.5 + 0.125 = 0.625.',
          hint: 'Weights 1/2 and 1/8 are set.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'In a Q2.2 fixed-point format, what value does the pattern 1110 represent?',
          options: ['-0.5', '+6.0', '-2.5', '14'],
          answer: '-0.5',
          explanation: 'As Q2.2 the weights are -2, 1, 1/2, 1/4: 1110 = -2 + 1 + 0.5 + 0 = -0.5. As unsigned it would be 14 — the format agreement decides.',
          hint: 'Place the point: 11.10, then apply two\'s-complement weights.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'true-false',
          prompt: 'Decimal 0.2 can be represented exactly in any finite number of binary fraction bits.',
          answer: 'false',
          explanation:
            '0.2 = 0.001100110011... repeating, so any finite binary fraction only approximates it. This is why fractional code compares with tolerances.',
          hint: 'Try to write 0.2 as a sum of distinct 1/2^k terms and see if the series ends.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Fixed width', definition: 'A value stored in an agreed number of bits; range and wrap behavior follow from the width, not from the value.' },
      { term: 'Bit significance', definition: 'The weight hierarchy of bits in a word: MSB carries 2^(n-1), LSB carries 2^0.' },
      { term: 'Mask', definition: 'A constant bit pattern (e.g. 0x0F) combined with &, | to isolate, set or clear specific bits.' },
      { term: 'Binary point', definition: 'The base-2 radix point separating integer weights (2^0, 2^1, ...) from fraction weights (2^-1, 2^-2, ...).' },
      { term: 'Fixed-point (Q format)', definition: 'A convention fixing the binary point position, e.g. Q2.2, so integer hardware can compute fractional values.' },
      { term: 'Saturation', definition: 'Clamping an out-of-range result to the format maximum/minimum instead of wrapping.' },
    ],
    revisionSummary: [
      'Width fixes the range: unsigned 0..2^n-1, signed -2^(n-1)..2^(n-1)-1.',
      'The four bit idioms: test (>>i)&1, set |(1<<i), clear &~(1<<i), nibble extract with 0x0F.',
      'Binary fractions continue the weight rule with negative powers: 0.101 = 0.625.',
      'Fixed-point = integer hardware + agreed binary point: Q2.2 pattern 0110 = 1.5.',
      'Choose overflow handling deliberately: wrap (counters), saturate (audio), or widen (accumulators).',
      '0.1 and 0.2 are infinite in binary — never compare fractional results for exact equality.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Q (number format)', url: 'https://en.wikipedia.org/wiki/Q_(number_format)', kind: 'article' },
      { label: 'Wikipedia — Fixed-point arithmetic', url: 'https://en.wikipedia.org/wiki/Fixed-point_arithmetic', kind: 'article' },
      { label: 'All About Circuits — Binary fractions', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-2/binary-fraction/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
];
