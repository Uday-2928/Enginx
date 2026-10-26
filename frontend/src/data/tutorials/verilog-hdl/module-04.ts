import type { TutorialLesson } from '../types';

// Module 04 — Operators
export const module04Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m04-l1',
    title: 'Arithmetic Operators and the Width-Growth Rule',
    summary:
      'Use + - * / % in hardware, learn the N+1-bit rule for addition, and stop losing carries to silent truncation.',
    objectives: [
      'Apply the five arithmetic operators to vectors and predict results.',
      'State the width of an arithmetic expression from operand widths and assignment context.',
      'Preserve a carry using concatenation on the left-hand side.',
      'Explain what / and % produce for unsigned and negative operands, and division by zero.',
    ],
    whyItMatters:
      'Arithmetic is where hardware differs most sharply from software intuition: in C an int addition silently wraps at 32 bits and everyone lives with it; in RTL *you* choose the register widths, so *you* own every dropped carry and truncated product. Width bugs in adders are among the most common functional errors in student and professional designs alike — and they are fully preventable with one rule learned in this lesson.',
    prerequisites: ['vlog-m03-l3'],
    explanation:
      'Verilog provides the familiar arithmetic operators — `+`, `-`, `*`, `/`, `%` — but their meaning is shaped by hardware widths. The core rule: **an expression is evaluated at the width of its widest operand *and* its assignment context** (the left-hand side, or enclosing expression). Two consequences:\n\n1. **Addition grows by one bit.** Adding two N-bit values can produce N+1 bits (the carry). `assign {c, s} = a + b;` with N-bit a, b and N+1-bit left-hand side gives the addition an (N+1)-bit context, so the carry lands in c. Writing `assign s = a + b;` evaluates in N bits and silently drops the carry.\n2. **Truncation is silent.** If the computed result exceeds the left-hand side, high bits are dropped without error. Sometimes wrap-around is exactly what you want (module 10’s free-running counters); often it is a bug.\n\nSubtraction behaves analogously with a borrow; multiplication of N-bit by M-bit values needs up to N+M bits (`{hi, lo} = a * b;`), and division/modulo produce a quotient and remainder of the dividend’s width. **Division or modulo by zero yields x in simulation** — there is no exception to catch; hardware dividers (which synthesis may or may not infer for `/` and `%`) are expensive, so real designs avoid general division unless the operand is a power of two (use shifts instead).\n\nNegative numbers use two\'s complement: declaring a vector `signed` makes `+`, `-`, `*`, and comparisons operate signed; mixing signed and unsigned operands silently reverts the whole expression to unsigned (module 03).',
    deepDive:
      '### Why the LHS participates in sizing\n\nThe Verilog standard defines expression size as the maximum of all operands *in the expression context*, where the context includes the assignment target. This is why `{c, s} = a + b` works: the 5-bit LHS widens the context, so the 4-bit operands are zero-extended to 5 bits before adding, and the carry appears naturally in the top bit. The same mechanism means `assign s = a + b + 1;` with 4-bit operands and a 4-bit s computes everything at 4 bits — the +1 cannot overflow into invisibility because there is no wider context. To add with carry-in: `assign {c, s} = a + b + cin;` — cin zero-extends, the context is 5 bits, c = carry out.\n\n### Multiply and the N+M rule\n\nA 4x4 multiply needs 8 bits; a 8x8 needs 16. `wire [7:0] prod = a * b;` with 4-bit a, b is safe (8 >= 8) but `wire [6:0] prod` would truncate. Synthesis maps `*` to dedicated multiplier hardware (DSP blocks on FPGAs) — fine for small widths, a genuine cost decision for wide datapaths. Division is worse: most synthesis tools do not infer a divider from `/`; they either reject it or require a vendor core. Design rule: express division by constants as shifts, and use `/` only where a divider IP or a known-small operand makes it sane.\n\n### Reading arithmetic RTL aloud\n\nRead `assign {cout, sum} = a + b + cin;` as "an adder with carry-in cin, whose 5-bit output feeds a wire named cout and a 4-bit bundle named sum". The concatenation on the left is not a trick — it *is* the interface of a full adder, and the ripple-carry adder of module 05 is just this line repeated across bit positions.',
    examples: [
      {
        title: 'The carry-preserving adder: context width in action',
        language: 'verilog',
        code:
          '// add4.v — 4-bit adder with carry-in and carry-out\nmodule add4(\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    input  wire       cin,\n    output wire [3:0] sum,\n    output wire       cout\n);\n    // LHS {cout, sum} is 5 bits wide, so the addition runs in 5 bits:\n    // operands are zero-extended, cin added, and the carry out survives.\n    assign {cout, sum} = a + b + cin;\n\nendmodule',
        explanation: [
          'The concatenation `{cout, sum}` on the left is a 5-bit target: 1 carry bit + 4 sum bits.',
          'Because the LHS is 5 bits, `a + b + cin` is evaluated in 5-bit context — no information is lost.',
          'Trace: a = 4\'b1001 (9), b = 4\'b1000 (8), cin = 0. Five-bit addition: 9 + 8 = 17 = 1_0001. So cout = 1, sum = 4\'b0001. The 4-bit truncation version would have printed sum = 0001 with NO cout — a wrong answer for 9+8=17.',
          'Trace with cin = 1: 9 + 8 + 1 = 18 = 1_0010 → cout = 1, sum = 4\'b0010.',
          'This single line is a complete full-adder-per-bit ripple structure once synthesis maps it — the structural version appears in module 05.',
        ],
      },
      {
        title: 'Multiplication width and the modulo operator',
        language: 'verilog',
        code:
          '// arith_demo.v — multiply width and % behavior\n`timescale 1ns/1ps\nmodule arith_demo;\n    reg  [3:0] a, b;\n    reg  [7:0] wide_prod;    // 4x4 needs up to 8 bits\n    reg  [3:0] trunc_prod;   // deliberately narrow: shows truncation\n    reg  [3:0] q, r;\n\n    initial begin\n        a = 4\'d9; b = 4\'d9;\n        wide_prod   = a * b;   // 81 = 8\'b0101_0001, fits in 8 bits\n        trunc_prod  = a * b;   // context 4 bits: keeps 0001 -> 1  (LOST bits!)\n\n        a = 4\'d13; b = 4\'d4;\n        q = a / b;             // 13/4 = 3 (integer, remainder dropped)\n        r = a % b;             // 13%4 = 1 (the remainder)\n        $display("prod=%d trunc=%d q=%d r=%d", wide_prod, trunc_prod, q, r);\n        $finish;\n    end\nendmodule',
        explanation: [
          '`a * b` with both operands 4 bits can reach 15x15 = 225, which needs 8 bits — wide_prod catches all of it (9x9 = 81 = 0101_0001).',
          '`trunc_prod` shows the silent truncation: the 8-bit product 0101_0001 is cut to its low 4 bits 0001. The high nibble 0101 vanished with no error.',
          'Integer division truncates toward zero: 13/4 = 3 in hardware, exactly like C ints.',
          'Modulo gives the remainder: 13 % 4 = 1. Common use: `if (cnt % 4 == 0)` — though for power-of-two moduli, `cnt[1:0] == 2\'b00` is cheaper hardware.',
          'If b were 0, q and r would read x in simulation — division by zero has no defined value.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Context width: the same addition, two fates',
        content:
          '  4-bit a=1001, b=1000  (9 + 8 = 17 = 1_0001)\n\n  CASE 1 — 5-bit context (LHS is {cout, sum}):\n      cout  sum[3:0]\n       1    0 0 0 1     <- full answer survives\n\n  CASE 2 — 4-bit context (LHS is a 4-bit wire):\n      sum[3:0]\n      0 0 0 1           <- carry dropped, result reads "1"\n                           9+8 does NOT equal 1: silent bug',
        caption:
          'The left-hand side is part of the expression: widen it and the carry survives; narrow it and truncation is silent.',
      },
    ],
    tables: [
      {
        caption: 'Arithmetic operators on unsigned N-bit vectors',
        headers: ['Operator', 'Meaning', 'Result width needed', 'Notes'],
        rows: [
          ['a + b', 'Add', 'N+1 (carry)', 'assign {c, s} = a + b; keeps the carry'],
          ['a - b', 'Subtract', 'N+1 (borrow)', 'Unsigned underflow wraps around'],
          ['a * b', 'Multiply', 'N+M', 'Synthesizes to multiplier/DSP logic'],
          ['a / b', 'Divide (integer)', 'N', 'b=0 gives x; synthesis support varies'],
          ['a % b', 'Modulo (remainder)', 'N', 'Power-of-two modulus: prefer part-select'],
        ],
      },
      {
        caption: 'Worked traces for add4 (assign {cout,sum} = a+b+cin)',
        headers: ['a', 'b', 'cin', 'sum', 'cout', 'Check (decimal)'],
        rows: [
          ['0001', '0010', '0', '0011', '0', '1+2+0 = 3'],
          ['1001', '1000', '0', '0001', '1', '9+8 = 17'],
          ['0111', '0001', '1', '1001', '0', '7+1+1 = 9'],
          ['1111', '1111', '1', '1111', '1', '15+15+1 = 31'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing `assign s = a + b;` on N-bit signals and expecting a carry flag "for free".',
        fix:
          'The carry is dropped because the context is N bits. Declare the carry and use the concatenation form: `assign {carry, s} = a + b;`. If wrap-around is intended, say so in a comment — silent truncation must be a decision, not an accident.',
      },
      {
        mistake: 'Using `/` or `%` inside synthesizable datapath logic for arbitrary operands.',
        fix:
          'Synthesis may reject or produce a very large divider for arbitrary `/`. Replace powers of two with shifts and slices (`cnt[1:0]` instead of `cnt % 4`); use a vendor divider core or restructure the algorithm for other divisors.',
      },
      {
        mistake: 'Mixing signed and unsigned operands in one arithmetic expression.',
        fix:
          'One unsigned operand makes the whole expression unsigned (module 03). Keep signedness uniform; when negatives are involved, declare every operand `signed` and use signed literals (e.g. 8\'sd5).',
      },
    ],
    guidedPractice: {
      title: 'Trace the width',
      brief:
        'With reg [3:0] a = 4\'d7, b = 4\'d9: predict (a) the value assigned by `assign s = a + b;` to a 4-bit s, (b) the values of cout and sum in `assign {cout, sum} = a + b;`, and (c) the 8-bit product of a and b.',
      expectedBehavior:
        '(a) 7+9 = 16 = 1_0000; 4-bit context keeps 0000 — s = 4\'b0000 (wrong-looking but exactly what the code asked). (b) cout = 1, sum = 4\'b0000. (c) 7x9 = 63 = 8\'b0011_1111.',
      hints: [
        'Compute the true answer first, then apply the context width.',
        '63 in binary: 32+16+8+4+2+1 = 0011_1111.',
      ],
    },
    practiceExercises: [
      {
        title: 'Find the width bug #1',
        brief:
          'A designer writes a 8-bit accumulating counter: `reg [7:0] total; ... total = total + inc;` and separately computes a checksum `assign chk = total + 8\'d1;` expecting chk to flag overflow. The overflow flag `ovf` is assigned `assign ovf = (chk == 8\'d0);`. Does this detect overflow of total+1 reliably? Explain precisely what hardware computes.',
        expectedBehavior:
          'Partially — but only by accident of wrap-around, not by computing a carry. chk is an 8-bit context: total+1 wraps to 0 exactly when total was 255, so (chk==0) does equal "carry occurred" here. The reliable, self-documenting form is `wire [8:0] ext = {1\'b0, total} + 9\'d1; assign ovf = ext[8]; assign chk = ext[7:0];` — computing the carry explicitly instead of inferring it from a comparison.',
        hints: [
          'Ask: in what width is total+1 evaluated?',
          'When does an 8-bit addition produce a zero result?',
        ],
      },
      {
        title: 'Find the width bug #2',
        brief:
          'A 4x4 multiplier’s output feeds a 3-bit "category" signal: `assign cat = (a * b) > 8\'d63;` — the designer intends cat=1 for products above 63. The comparison operands are 4-bit a*b and an 8-bit literal. What width does the comparison use, and is cat correct for all a, b?',
        expectedBehavior:
          'The comparison context is 8 bits (the literal), so a*b is evaluated at 8 bits — the product is NOT truncated and cat is correct: cat = 1 exactly when the true product exceeds 63. The subtle lesson: here the wide literal RESCUED the expression; in `assign cat2 = (prod > 7\'d63)` with 3-bit prod the product would already be truncated BEFORE the compare. Never truncate before comparing — widen the context instead.',
        hints: [
          'Comparison width = max of the two operand widths (and context).',
          'Where would the truncation have happened in the broken variant?',
        ],
      },
    ],
    assessment: {
      title: 'Module 04 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Adding two N-bit unsigned values can require how many result bits?',
          options: ['N', 'N+1', 'N+2', '2N'],
          answer: 'N+1',
          explanation:
            'The worst case (all-ones plus all-ones) needs one extra carry bit. Multiplication is the operator that needs 2N.',
          hint: 'Only one bit of "overflow" can appear from an addition.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'In `assign {cout, sum} = a + b;` with 4-bit a, b, the addition is evaluated in 5 bits.',
          answer: 'true',
          explanation:
            'The left-hand side is 5 bits wide, and the LHS is part of the expression context — so the operands are widened to 5 bits before adding and the carry survives in cout.',
          hint: 'The LHS participates in expression sizing.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'What does sum hold after this statement, given a = 4\'b1001 and b = 4\'b1000?',
          code: 'assign sum = a + b;   // 4-bit sum, 4-bit a, b',
          options: ["4'b0001", "4'b0000", "4'b1001", "4'b1111"],
          answer: "4'b0001",
          explanation:
            'The true total is 17 = 1_0001, but the 4-bit context truncates the carry: sum keeps 0001. This is why the carry-preserving form uses {cout, sum} on the left.',
          hint: 'Evaluate at the context width, then drop high bits.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'In simulation, what does `assign q = a / b;` produce when b = 0?',
          options: ['x', '0', 'z', 'It stops the simulation'],
          answer: 'x',
          explanation:
            'Division by zero has no defined value; the simulator assigns x. There is no exception mechanism in synthesizable hardware.',
          hint: 'Undefined math produces the "unknown" value.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'How many bits are needed to hold the full product of an 8-bit by 8-bit unsigned multiply (give just the number)?',
          answer: '16',
          explanation:
            'The maximum product 255 x 255 = 65025 needs 16 bits (2N for N-bit operands).',
          hint: 'Worst case: (2^N - 1) squared is just under 2^(2N).',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Context width', definition: 'The width at which an expression is evaluated: the maximum of operand widths and the assignment target width.' },
      { term: 'Carry out', definition: 'The extra bit produced when an addition overflows its operand width; preserved via {cout, sum} = a + b.' },
      { term: 'Truncation', definition: 'Silent dropping of high bits when a result is assigned to a narrower target.' },
      { term: 'Two’s complement', definition: 'The signed number encoding Verilog uses when operands are declared signed.' },
      { term: 'Integer division', definition: '/ truncates toward zero; % yields the remainder; both yield x for a zero divisor.' },
    ],
    revisionSummary: [
      'Expression width = max(operand widths, LHS/context width) — the LHS counts.',
      'assign {carry, sum} = a + b + cin; is the carry-preserving adder idiom.',
      'Multiplication needs N+M bits; assign the product wide or lose the high half.',
      '/ and %: integer semantics, x on divide-by-zero, poor synthesis support — shift/slice for powers of two.',
      'Truncation is silent: make every wrap-around a documented decision.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Adder (electronics)', url: 'https://en.wikipedia.org/wiki/Adder_(electronics)', kind: 'article' },
      { label: 'Wikipedia — Two\'s complement', url: 'https://en.wikipedia.org/wiki/Two%27s_complement', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'vlog-m04-l2',
    title: 'Bitwise, Reduction, Logical Operators and Shifts',
    summary:
      'Command the gate-level operators (& | ^ ~), the fold-to-one-bit reductions (&a, |a, ^a), the logical operators (&& || !), and both shift families.',
    objectives: [
      'Apply bitwise operators to vectors bit by bit and predict each result.',
      'Distinguish bitwise (&) from logical (&&) — and know why the wrong one ruins mux logic.',
      'Use reduction operators to build OR-trees, AND-trees and parity in one symbol.',
      'Choose <<, >>, <<< and >>> correctly, including on signed values.',
    ],
    whyItMatters:
      'These operators are the atoms of datapath design: masks, flags, parity, alignment and sign handling all reduce to them. The & vs && confusion in particular produces circuits that "work" in the lab and fail on corner cases (module 08 shows the 2:1 mux that breaks), so learning the exact semantics now prevents a whole family of bugs later.',
    prerequisites: ['vlog-m04-l1'],
    explanation:
      '**Bitwise operators** act on vectors bit by bit, producing a result as wide as the widest operand: `&` (AND), `|` (OR), `^` (XOR), `~` (NOT), plus `~^`/`^~` (XNOR). On 1-bit wires they are exactly the logic gates of module 02; on buses they apply the gate to each bit position independently: `8\'b1100 & 8\'b1010 = 8\'b1000`.\n\n**Reduction operators** use the same symbols in *unary* position — `&a`, `|a`, `^a`, `~&a`, `~|a`, `~^a` — folding an entire vector to a single bit. `|flag_bus` is 1 when ANY bit is set (an OR-tree); `&done_bits` is 1 when ALL bits are set; `^data` is the parity (1 when the vector holds an odd number of ones). They synthesize to trees of gates and are the idiomatic one-line way to write these functions.\n\n**Logical operators** — `&&`, `||`, `!` — treat operands as *conditions* and always produce a 1-bit 0/1 answer: an operand is "true" if it is nonzero. `if (a && b)` with 4-bit a, b tests "both a and b are nonzero", NOT the bitwise AND. The x-rule matters in simulation: an operand of all-zeros is false; an operand with x bits and no 1s is treated as false; any 1 bit makes it true.\n\n**Shifts**: `a << n` moves bits left, filling with zeros (bits shifted out are lost — unless the context is wider); `a >> n` moves right, filling with zeros for unsigned operands. The arithmetic right shift `a >>> n` fills with the sign bit — but only when `a` is declared `signed`; on unsigned vectors `>>>` behaves exactly like `>>`. Shift amounts may be constants or runtime signals (a runtime shift synthesizes to a barrel-shifter-style multiplexer tree).',
    deepDive:
      '### The mux that & vs && broke\n\nThe bitwise 2:1 mux `y = (s & b) | (~s & a);` is correct — for 1-bit s. Now write it with the logical operator by mistake: `(s && b) | (!s && a)`. With s = 4\'b0010 (nonzero, "true") and b = 4\'b0000, `s && b` = 1 && 0 = 0 — but the bitwise version gives s & b = 0010 & 0000 = 0000 too... the failure mode appears with multi-bit DATA: the logical version collapses each term to a single bit, so y (declared 4 bits) gets zero-extended single bits — the data bits of b and a never reach y. The rule to internalize: **&& / || / ! are for conditions (if, while, boolean flags); & / | / ~ / ^ are for data paths.** Module 08 builds the correct multi-bit mux with replication: `y = ({4{s}} & b) | ({4{~s}} & a);`.\n\n### Reduction as hardware\n\n`|a` on an 8-bit vector is a 7-input OR — synthesizers build a balanced tree (log2(8) = 3 gate levels), which is why reduction operators are cheap and fast. `^a` is a parity tree; `&a` an AND-tree "all bits set" detector. Idioms worth memorizing: `|bus` as "anything active?", `&count_all_ones` as "every lane done?", `^data ^ 1\'b0` as even-parity bit.\n\n### Shift amounts and hardware cost\n\nA constant shift (`a << 2`) is pure wiring — no gates at all, just renaming which bits go where. A variable shift (`a << sh`) becomes a multiplexer tree (a barrel shifter): log2(W) stages, each conditionally shifting by a power of two. That cost jump is why module 08 gives the barrel shifter its own treatment, and why "shift by 1 per clock" (a shift register, module 09) is often cheaper than a combinational wide shift.',
    examples: [
      {
        title: 'Bitwise vs logical vs reduction — one table of traces',
        language: 'verilog',
        code:
          '// bitwise_demo.v — the three families side by side\n`timescale 1ns/1ps\nmodule bitwise_demo;\n    reg [3:0] a, b;\n    reg       f;\n\n    initial begin\n        a = 4\'b1100; b = 4\'b1010;\n\n        // Bitwise: per-bit gates, 4-bit results.\n        $display("and=%b or=%b xor=%b not=%b",\n                 a & b, a | b, a ^ b, ~a);\n        // -> and=1000 or=1110 xor=0110 not=0011\n\n        // Logical: operands as conditions, 1-bit results.\n        // a is nonzero (true), b is nonzero (true).\n        $display("andl=%b orl=%b notl=%b",\n                 a && b, a || b, !a);\n        // -> andl=1 orl=1 notl=0\n\n        // Reduction: fold a whole vector to 1 bit.\n        $display("redor=%b redand=%b redxor=%b",\n                 |a, &a, ^a);\n        // -> redor=1 redand=0 redxor=0 (1100 has two 1s: even parity)\n\n        f = (a != 0) && (b[0] == 1\'b0);  // conditions: 1 AND 1 = 1\n        $display("f=%b", f);\n        $finish;\n    end\nendmodule',
        explanation: [
          'Bitwise row: AND keeps only bit positions where BOTH vectors have 1 (1100 & 1010 = 1000); OR merges (1110); XOR marks differing positions (0110); ~ flips all four bits (0011).',
          'Logical row: a and b are each nonzero → "true", so a && b = 1, a || b = 1, and !a = 0. The 4-bit values were collapsed to single bits before combining.',
          'Reduction row: |a = 1 (some bit set), &a = 0 (not all bits set), ^a = 0 (two ones = even parity).',
          'f combines two explicit conditions with && — the correct use of the logical operator.',
          'The $display comments are the deterministic expected output: each expression is a pure function of the constant inputs above it.',
        ],
      },
      {
        title: 'Shifts: logical, arithmetic, variable amounts',
        language: 'verilog',
        code:
          '// shift_demo.v — all four shift behaviors\n`timescale 1ns/1ps\nmodule shift_demo;\n    reg  [7:0]        u;      // unsigned byte\n    reg  signed [7:0] s;      // signed byte\n    reg  [7:0]        sh;\n\n    initial begin\n        u = 8\'b0001_0000;      // 16\n        sh = u << 2;           // logical LEFT:  0100_0000 (64) — zeros fill right\n        $display("shl=%b", sh);\n\n        u = 8\'b1000_0000;\n        sh = u << 1;           // left shift OUT of range: top bit lost -> 0000_0000\n        $display("shl_lost=%b", sh);\n\n        u = 8\'b1000_0000;\n        sh = u >> 3;           // logical RIGHT: 0001_0000 — zeros fill left\n        $display("shr=%b", sh);\n\n        s = -8\'sd8;            // 1111_1000 as signed (-8)\n        sh = s >>> 1;          // ARITHMETIC right: sign-fill -> 1111_1100 (-4)\n        $display("shra=%b", sh);\n\n        sh = u >>> 1;          // u is UNSIGNED: >>> acts like >> -> 0100_0000\n        $display("shra_unsigned=%b", sh);\n        $finish;\n    end\nendmodule',
        explanation: [
          '`u << 2`: bits move left two places, zeros fill the vacated low bits: 0001_0000 becomes 0100_0000 (16 x 4 = 64).',
          'Left-shifting 1000_0000 by 1 pushes the only set bit out of the 8-bit result: 0000_0000. Shifted-out bits are gone unless the assignment context is wider.',
          '`u >> 3` fills from the left with zeros: 1000_0000 becomes 0001_0000 (128 / 8 = 16).',
          '`s >>> 1` with s signed (-8 = 1111_1000) fills with the sign bit 1: 1111_1100 = -4. Arithmetic shift right = division by 2 with rounding toward negative infinity.',
          '`u >>> 1` with u unsigned behaves identically to >> (zero fill): 0100_0000. The >>> operator only differs on SIGNED left operands.',
          'All printed values follow directly from the bit patterns — deterministic, no timing involved (this is a sim-only module; it would not synthesize, and is labeled as such).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Shift mechanics on an 8-bit byte',
        content:
          '  LOGICAL LEFT  (a << 2):  zeros enter from the right\n     in : 0001_0000\n     out: 0100_0000        (bits fall off the LEFT edge)\n\n  LOGICAL RIGHT (a >> 3):  zeros enter from the left\n     in : 1000_0000\n     out: 0001_0000        (bits fall off the RIGHT edge)\n\n  ARITHMETIC RIGHT (s >>> 1, s SIGNED): sign bit replicated\n     in : 1111_1000  (-8)\n     out: 1111_1100  (-4)   (sign bit copied in from the left)\n\n  VARIABLE shift (a << n): multiplexer tree, one stage per power of two\n     stage1: shift by 1 if n[0]\n     stage2: shift by 2 if n[1]\n     stage3: shift by 4 if n[2]   -> log2(W) stages total',
        caption:
          'Constant shifts are wiring; variable shifts are mux trees; >>> fills with sign bits only for signed operands.',
      },
    ],
    tables: [
      {
        caption: 'Bitwise operator traces (a = 1100, b = 1010)',
        headers: ['Expression', 'Result', 'Reading'],
        rows: [
          ['a & b', "4'b1000", '1 only where both are 1'],
          ['a | b', "4'b1110", '1 where at least one is 1'],
          ['a ^ b', "4'b0110", '1 where inputs differ'],
          ['~a', "4'b0011", 'every bit inverted'],
          ['a ~^ b', "4'b1001", '1 where inputs match (XNOR)'],
        ],
      },
      {
        caption: 'Reduction operators on a = 4\'b1100',
        headers: ['Expression', 'Result', 'Hardware meaning'],
        rows: [
          ['|a', "1'b1", 'OR-tree: any bit set'],
          ['&a', "1'b0", 'AND-tree: all bits set (false here)'],
          ['^a', "1'b0", 'XOR-tree/parity: even number of ones'],
          ['~|a', "1'b0", 'NOR-tree: "is it exactly zero?"'],
        ],
      },
      {
        caption: 'Shift operators',
        headers: ['Operator', 'Fill bits', 'Signed operand?', 'Typical use'],
        rows: [
          ['<<', 'zeros (low end)', 'n/a', 'Multiply by 2^n; align fields'],
          ['>>', 'zeros (high end)', 'works unsigned or signed', 'Unsigned divide by 2^n'],
          ['>>>', 'sign bit (high end)', 'ONLY differs when operand is signed', 'Signed divide by 2^n'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using && / || on data-path vectors (e.g. writing the mux as (s && b) | (!s && a)).',
        fix:
          'Logical operators collapse each operand to one "true/false" bit; the data bits never reach the output. Use bitwise operators for data, and replication for multi-bit muxes: ({W{s}} & b) | ({W{~s}} & a).',
      },
      {
        mistake: 'Expecting >>> to sign-extend an unsigned vector.',
        fix:
          '>>> only fills with the sign bit when the LEFT operand is declared signed. On unsigned vectors it is identical to >>. If you need arithmetic behavior, declare the reg/wire signed.',
      },
      {
        mistake: 'Assuming a left shift keeps the shifted-out bits.',
        fix:
          'Bits shifted past the MSB are dropped (at the result’s context width). To capture them, widen the context: assign {lost, sh} = a << 1; keeps the expelled top bit in lost.',
      },
    ],
    guidedPractice: {
      title: 'Three families, one byte',
      brief:
        'With a = 8\'b1010_0110, b = 8\'b0110_0011 evaluate: (1) a & b, (2) a | b, (3) a ^ b, (4) |b, (5) ^a, (6) (a != 0) && (b[0]), (7) a << 1, (8) (signed)a >> 2 — give the (8-bit or 1-bit) result of each.',
      expectedBehavior:
        "(1) 0010_0010. (2) 1110_0111. (3) 1100_0101. (4) 1 (b has set bits). (5) a has four 1s → even parity → 0. (6) 1 && 1 = 1 (a nonzero, b[0]=1). (7) 0100_1100 (the top 1 shifted out is lost at 8-bit context). (8) sign-fill right shift of 1010_0110 by 2 → 1110_1001 (MSB replicated twice).",
      hints: [
        'Do bitwise columns first: write the two bytes stacked and operate per column.',
        'Count the ones in a for parity; replicate the MSB for the signed right shift.',
      ],
    },
    practiceExercises: [
      {
        title: 'Build flag logic in one line each',
        brief:
          'Using reduction operators only, write expressions for: (a) "any channel of busy[7:0] is active", (b) "all eight lanes of done[7:0] finished", (c) the odd-parity bit of tx[7:0] (1 when the count of ones is odd), (d) "status[7:0] is exactly zero".',
        expectedBehavior:
          '(a) |busy. (b) &done. (c) ^tx. (d) ~|status (equivalently status == 8\'b0, but the reduction is cheaper and idiomatic).',
        hints: [
          'One symbol per function: OR-tree, AND-tree, XOR-tree.',
          '"Exactly zero" is the NOR of all bits.',
        ],
      },
      {
        title: 'Fix the broken mux',
        brief:
          'A 4-bit 2:1 mux was written as `assign y = (sel && b) | (!sel && a);` with all signals 4 bits. Explain precisely why y is wrong (what values reach it), and write the correct bitwise version.',
        expectedBehavior:
          'sel && b collapses to a 1-bit value (0 or 1), same for !sel && a; the OR of those single bits is zero-extended to 4 bits — y can only be 4\'b0000 or 4\'b0001, never real data. Correct: `assign y = ({4{sel}} & b) | ({4{~sel}} & a);` — replication turns the 1-bit select into a 4-bit mask.',
        hints: [
          'Trace sel = 4\'b0010, a = 4\'b1010, b = 4\'b0101 through the broken line.',
          'The correct form needs the select replicated to the data width.',
        ],
      },
    ],
    assessment: {
      title: 'Module 04 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What is 4\'b1100 ^ 4\'b1010?',
          code: "assign y = a ^ b;  // a=4'b1100, b=4'b1010",
          options: ["4'b0110", "4'b1000", "4'b1110", "4'b0011"],
          answer: "4'b0110",
          explanation:
            'XOR per bit: 1^1=0, 1^0=1, 0^1=1, 0^0=0 → 0110. XOR marks the positions where the inputs differ.',
          hint: 'Column-by-column: same gives 0, different gives 1.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What does the expression |rx[7:0] compute?',
          options: [
            '1 if any bit of rx is set (an OR-tree)',
            'The bitwise OR of rx with itself',
            '1 only if all bits of rx are set',
            'A 8-bit OR result',
          ],
          answer: '1 if any bit of rx is set (an OR-tree)',
          explanation:
            'A unary | is the reduction OR: it folds all 8 bits into a single 1-bit answer, 1 when at least one bit is 1.',
          hint: 'Unary position = reduction (fold to one bit).',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'For an unsigned 8-bit vector u, the operators u >> 2 and u >>> 2 produce the same result.',
          answer: 'true',
          explanation:
            '>>> differs from >> only when the left operand is declared signed (it then fills with the sign bit). On unsigned operands both zero-fill.',
          hint: 'Arithmetic shift needs a signed operand to know the sign.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'reg signed [7:0] s = -8\'sd8 (pattern 1111_1000). What is s >>> 1?',
          code:
            'reg signed [7:0] s;\ns = -8\'sd8;          // 8\'b1111_1000\nassign y = s >>> 1;  // y is 8 bits',
          options: ["8'b1111_1100", "8'b0111_1100", "8'b1111_1000", "8'b0001_1111"],
          answer: "8'b1111_1100",
          explanation:
            'Signed operand: >>> fills with the MSB (1). 1111_1000 shifted right one place with sign fill gives 1111_1100 — numerically -4, i.e. -8 divided by 2.',
          hint: 'Copy the sign bit into the vacated position.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'Which expression tests "status[7:0] is exactly zero" most idiomatically?',
          options: ['~|status', '!status', 'status == 8\'b0 && 1\'b1', '&status'],
          answer: '~|status',
          explanation:
            '~|status is the NOR reduction: 1 exactly when no bit is set. (!status also works — it is the same condition — but the reduction is the idiomatic RTL form and states the hardware intent directly.)',
          hint: 'NOR-tree = "no bit is 1".',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Bitwise operator', definition: 'Gate applied independently to each bit position of its operands: & | ^ ~ ~^.' },
      { term: 'Reduction operator', definition: 'Unary & | ^ ~& ~| ~^ folding a whole vector into a single result bit.' },
      { term: 'Logical operator', definition: '&& || ! treating operands as conditions and yielding a 1-bit 0/1 result.' },
      { term: 'Logical shift', definition: '<< or >>: bits move, vacated positions fill with zeros.' },
      { term: 'Arithmetic shift', definition: '>>> on a signed operand: vacated high positions fill with the sign bit.' },
    ],
    revisionSummary: [
      'Bitwise operators process vectors per bit; logical operators collapse operands to true/false and yield 1 bit.',
      'Reductions build trees: |any, &all, ^parity, ~|is-zero.',
      '<< and >> zero-fill; >>> sign-fills only for signed left operands.',
      'Constant shifts are free wiring; variable shifts are mux trees.',
      'For multi-bit mux logic, replicate the select: ({W{s}} & b) | ({W{~s}} & a).',
    ],
    furtherReading: [
      { label: 'Wikipedia — Bitwise operation', url: 'https://en.wikipedia.org/wiki/Bitwise_operation', kind: 'article' },
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'vlog-m04-l3',
    title: 'Equality, Conditional, Concatenation and Precedence',
    summary:
      'Finish the operator toolkit: == vs ===, the ? : multiplexer, {concatenation} and {N{replication}}, and the precedence table that decides it all.',
    objectives: [
      'Distinguish == (x-propagating) from === (four-state literal compare) and know where each is legal.',
      'Use ?: for muxes and defaulting, including nested conditionals.',
      'Assemble and split buses with concatenation and replication.',
      'Apply operator precedence to read unfamiliar expressions without guessing.',
    ],
    whyItMatters:
      'These operators are the connective tissue of RTL: concatenation builds and splits buses everywhere in datapath code, ?: writes muxes and reset defaults, and the == vs === distinction decides whether your testbench can even detect an x. Precedence mistakes produce code that compiles and does something subtly different from what the author read into it — the classic silent killer.',
    prerequisites: ['vlog-m04-l1', 'vlog-m04-l2'],
    explanation:
      '**Equality comes in two families.** `==` and `!=` are the synthesizable operators: if any operand bit is x or z, the result is x — meaning "this comparison cannot be decided". `===` and `!==` are the four-state operators: they compare bit patterns INCLUDING x and z literally (x === x is true). Synthesizers cannot build "compare against unknown" hardware, so `===`/`!==` are **simulation-only** — indispensable in testbenches for checking whether a signal is x (`if (q === 1\'bx)`), and illegal as design logic. Related and fully synthesizable: relational operators `< <= > >=` (unsigned unless all operands are signed).\n\n**The conditional operator** `cond ? a : b` is the 2:1 multiplexer of Verilog: cond true selects a, false selects b, x in the cond is resolved per-bit (if a and b agree in a bit position, that bit wins; otherwise x). Nesting builds wider muxes: `s[1] ? (s[0] ? d : c) : (s[0] ? b : a)` is a 4:1 mux. Right-associativity makes chains read naturally.\n\n**Concatenation** `{a, b}` glues signals into a wider bus, left-to-right in written order; **replication** `{N{expr}}` repeats expr N times (N must be a constant in Verilog-2001). Together they are the bus plumbing of RTL: `{carry, sum} = a + b;`, `{q[6:0], q[7]} = q;` (a rotate!), `sign_ext = {{8{sin[7]}}, sin};`.\n\n**Precedence** resolves ambiguity. The order (highest first): unary operators (! ~ & | ^ reductions, + - signs); then * / %; then + -; then shifts; then relational; then equality; then & ; then ^ ; then | ; then && ; then || ; then ?: ; then assignment. When in doubt — or when reading someone else’s dense one-liner — add parentheses: they cost nothing and document intent.',
    deepDive:
      '=== in the lab, == in the chip\n\nA testbench idiom you will use constantly in module 14: `if (dut_out !== expected)` catches the case where dut_out is x — `!=` would return x itself (not 1), and an x in an if-condition is treated as FALSE, so the check would silently pass! That asymmetry (== returning x, x treated as false in conditions) is exactly how x-bugs slip through naive testbenches. Design code, by contrast, must never contain ===: hardware cannot compare against unknown.\n\n### Replication subtleties\n\n`{N{expr}}` requires constant N in Verilog-2001 (SystemVerilog relaxes this). A nested replication builds sign-extension generically: `{{(W-9){x[8]}}, x}` extends a 9-bit x to W bits for any W. Also note concatenation needs at least one sized operand — `{a, 5}` is ambiguous (how wide is 5?) and flagged by tools; write `{a, 4\'d5}`.\n\n### Reading precedence like an engineer\n\nTwo habits prevent 95 percent of precedence bugs: (1) parenthesize every mix of bitwise and equality/every mix of arithmetic with shifts; (2) remember that & binds TIGHTER than ^ which binds tighter than |, and that == is LOOSER than & — so `a & b == c` parses as `a & (b == c)`, almost never what the author meant. Write `(a & b) == c`.',
    examples: [
      {
        title: 'Equality: ==, ===, and the x-trap in if conditions',
        language: 'verilog',
        code:
          '// equality_demo.v — sim-only showcase of x behavior\n`timescale 1ns/1ps\nmodule equality_demo;\n    reg [1:0] a, b;\n\n    initial begin\n        a = 2\'b1x;     // bit 1 known 1, bit 0 unknown\n        b = 2\'b1x;\n\n        // == : any x in operands -> result is x\n        $display("eq  =%b", a == b);    // x\n        // === : four-state literal compare, x matches x\n        $display("eqe =%b", a === b);   // 1\n\n        // The x-trap: x is treated as FALSE in if-conditions.\n        if (a == b)  $display("== branch taken");       // NOT taken\n        if (a != b)  $display("!= branch taken");       // NOT taken either!\n        if (a === b) $display("=== branch taken");      // taken\n\n        $finish;\n    end\nendmodule',
        explanation: [
          '`a == b` with x bits in both operands returns x — the comparison is undecided, not false.',
          '`a === b` compares the literal bit patterns including the x: 1x === 1x is true (result 1).',
          'The x-trap: with `a == b` evaluating to x, the if treats x as FALSE — so NEITHER the == branch nor the != branch runs. A naive `if (a != b) error();` check silently passes when both sides are equally unknown.',
          'This is exactly why self-checking testbenches (module 14) compare with !== : `if (out !== expected)` fires even when out is x.',
          'Remember: === and !== are simulation-only; synthesizable design code uses == and accepts that x means "undecided".',
        ],
      },
      {
        title: 'Concatenation and replication: bus plumbing',
        language: 'verilog',
        code:
          '// concat_demo.v — building and splitting buses\nmodule concat_demo(\n    input  wire [3:0] lo,\n    input  wire [3:0] hi,\n    input  wire [7:0] byte_in,\n    output wire [7:0] joined,    // {hi, lo} as one byte\n    output wire [3:0] upper,     // top nibble of byte_in\n    output wire [7:0] rotated,   // byte_in rotated left by 1\n    output wire [7:0] masked,    // 0xF0 pattern via replication\n    output wire [7:0] sign_ext   // byte_in sign-extended from 4-bit view\n);\n    assign joined  = {hi, lo};                 // 4+4 -> 8 bits\n    assign upper   = byte_in[7:4];             // part-select (module 03)\n    assign rotated = {byte_in[6:0], byte_in[7]}; // move MSB to LSB position\n    assign masked  = {4{2\'b11}};               // 4 copies of 11 -> 1111_1111\n    assign sign_ext = {{4{byte_in[7]}}, byte_in[7:4]}; // replicate MSB, keep nibble\n\nendmodule',
        explanation: [
          '`{hi, lo}` — concatenation is written left-to-right: the FIRST item becomes the MOST significant bits. joined = hi*16 + lo.',
          '`{byte_in[6:0], byte_in[7]}` — the classic rotate-left-by-1 idiom: everything except the MSB moves up one place, and the MSB wraps to the bottom.',
          '`{4{2\'b11}}` — replication: the 2-bit pattern 11 repeated four times = 8\'b1111_1111. Replication counts must be constants in Verilog-2001.',
          '`{{4{byte_in[7]}}, byte_in[7:4]}` — nested replication + concatenation: the sign bit (byte_in[7]) copied four times, then the original high nibble. A manual sign-extension.',
          'Trace with hi=4\'b0011, lo=4\'b1001, byte_in=8\'b1001_0110: joined = 0011_1001; upper = 1001; rotated = 0010_1101; masked = 1111_1111; sign_ext = 1111_1001.',
        ],
      },
      {
        title: 'Precedence: two expressions that are NOT the same',
        language: 'verilog',
        code:
          '// precedence_demo.v — & binds tighter than ==\n`timescale 1ns/1ps\nmodule precedence_demo;\n    reg [3:0] a, b, c;\n    reg       p1, p2;\n\n    initial begin\n        a = 4\'b0100; b = 4\'b0111; c = 4\'b0100;\n\n        // Written as: a & b == c\n        // Parsed as:  a & (b == c)   because == binds LOOSER than &\n        p1 = a & b == c;\n\n        // Written with explicit parentheses (what was MEANT):\n        p2 = (a & b) == c;\n\n        $display("p1=%b p2=%b", p1, p2);\n        $finish;\n    end\nendmodule',
        explanation: [
          'The trap: `a & b == c` is parsed as `a & (b == c)` because == has LOWER precedence than &. An author meaning "(a AND b) equals c" gets a bitwise AND with a 1-bit comparison result instead.',
          'Trace p1 with a=0100, b=0111, c=0100: b == c is 0 (0111 != 0100); then a & 0 = 0000; assigned to the 1-bit reg p1 that truncates to 0.',
          'Trace p2, the intended logic: (a & b) = 0100 & 0111 = 0100; compared with c = 0100 → 1.',
          'Same constants, same apparent intent, DIFFERENT answers (p1=0, p2=1): the printed line is `p1=0 p2=1`. This is precisely how precedence bugs ship.',
          'The professional rule: parenthesize whenever two operator families mix. Costs nothing, documents intent.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Operator precedence (high binds tightest)',
        content:
          '  HIGHEST   unary:  !  ~  &a |a ^a  +x -x   (reductions & signs)\n            multiplicative:  *  /  %\n            additive:        +  -\n            shift:           <<  >>  <<<  >>>\n            relational:      <  <=  >  >=\n            equality:        ==  !=  ===  !==\n            bitwise AND:     &\n            bitwise XOR:     ^  ~^ ^~\n            bitwise OR:      |\n            logical AND:     &&\n            logical OR:      ||\n            conditional:     ? :\n  LOWEST    assignment:      =  <=\n\n  TRAP:  a & b == c   parses as   a & (b == c)\n         write        (a & b) == c',
        caption:
          'Memorize the neighborhood of & ^ | versus == : equality binds looser than bitwise AND, tighter than logical AND.',
      },
    ],
    tables: [
      {
        caption: 'Equality operator behavior with unknowns (a = 2\'b1x, b = 2\'b1x)',
        headers: ['Expression', 'Result', 'Legal in design RTL?', 'Use case'],
        rows: [
          ['a == b', 'x (undecided)', 'Yes', 'Normal data comparison'],
          ['a != b', 'x', 'Yes', 'Normal data comparison'],
          ['a === b', '1 (x matches x literally)', 'No — simulation only', 'Testbench x-detection'],
          ['a !== b', '0', 'No — simulation only', 'Self-checking testbenches'],
        ],
      },
      {
        caption: 'Conditional operator selection',
        headers: ['cond', 'Result', 'Note'],
        rows: [
          ['1 (true)', 'a (the true branch)', 'Nonzero = true'],
          ['0 (false)', 'b (the false branch)', 'Zero = false'],
          ['x/z', 'Per bit: a[i] if a[i]==b[i], else x', 'Agreement wins, disagreement stays unknown'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using === or !== inside synthesizable design code.',
        fix:
          'Four-state comparisons have no hardware meaning: a chip cannot test "is this wire unknown". Restrict ===/!== to testbenches; in design code, == returning x already means "cannot decide".',
      },
      {
        mistake: 'Writing `a & b == c` (or similar mixed-family expressions) without parentheses.',
        fix:
          'It parses as a & (b == c). Bitwise & binds tighter than ==. Always parenthesize when mixing bitwise and equality/comparison operators.',
      },
      {
        mistake: 'Concatenating an unsized number: {a, 5}.',
        fix:
          'Unsized constants have no defined width in concatenation and are flagged by tools. Size every constant inside a concat: {a, 4\'d5}.',
      },
    ],
    guidedPractice: {
      title: 'Read the dense one-liner',
      brief:
        'Given a = 4\'b1010, b = 4\'b1100, c = 4\'b1010, and each result assigned to a 1-bit wire, evaluate exactly as Verilog parses it: (1) y1 = a & b == c; (2) y2 = (a & b) == c; (3) y3 = a == c | b; (4) y4 = (a == c) || (a == b); (5) w = {a[0], b[3], 2\'b01} (w is 5 bits).',
      expectedBehavior:
        "(1) parses as a & (b == c): b==c is 0 (1100 != 1010), then a & 0 = 0000, truncated to 1 bit → 0. (2) (a&b) = 1000, compared with c = 1010 → 0. (3) == binds tighter than |: (a == c) is 1; 1 | b evaluated at 4-bit width gives 0001 | 1100 = 1101, truncated to 1 bit → 1. (4) explicit: 1 || 0 = 1. (5) {a[0], b[3], 01} = {0, 1, 01} = 5'b00101.",
      hints: [
        'Binding order: & > ^ > | > && ; equality sits between relational and &.',
        'Rewrite each expression with the parentheses the parser inserts before evaluating.',
      ],
    },
    practiceExercises: [
      {
        title: 'Rotate right by 3',
        brief:
          'Using one concatenation expression, rotate an 8-bit bus din right by 3 (bits fall off the bottom and re-enter at the top). Verify your expression with din = 8\'b1000_0001.',
        expectedBehavior:
          'assign rot = {din[2:0], din[7:3]}; — the low three bits move to the top, the rest shift down three places. Verification bit by bit: result[0]=din[3]=0, result[1]=din[4]=0, result[2]=din[5]=0, result[3]=din[6]=0, result[4]=din[7]=1, result[5]=din[0]=1, result[6]=din[1]=0, result[7]=din[2]=0 → rot = 8\'b0011_0000. Cross-check by concatenation: {din[2:0], din[7:3]} = {001, 10000} = 0011_0000 — the two methods agree.',
        hints: [
          'Rotate right by k = {low k bits on top, remaining bits below}: {din[k-1:0], din[7:k]}.',
          'Trace each result bit back to its source index: result[i] = din[(i+k) mod 8].',
        ],
      },
      {
        title: 'Width-bug hunt (assessment warm-up)',
        brief:
          'Find and fix the bug: `wire [8:0] big = a + b; wire [3:0] s = big;` with a, b 4-bit — the designer complains "sum is wrong when a+b overflows". What is actually happening, and what is the clean fix?',
        expectedBehavior:
          'Nothing is wrong with the addition: big (9 bits) correctly holds the 5-bit sum zero-extended. The bug is the SECOND line: s truncates big to its low 4 bits — the carry sits in big[4] and is dropped from s. Fix: either declare s 5 bits, or skip the intermediate: `assign {carry, s} = a + b;` with carry/s the needed widths.',
        hints: [
          'Each assignment applies its own width adjustment.',
          'The carry lives in bit 4 of big — where does it go on the way to s?',
        ],
      },
    ],
    assessment: {
      title: 'Module 04 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What is the key difference between == and === ?',
          options: [
            '== returns x when operands contain x/z; === compares x and z literally and is simulation-only',
            '== is for signed values, === for unsigned',
            '=== is synthesizable and faster',
            'There is no difference in simulation',
          ],
          answer: '== returns x when operands contain x/z; === compares x and z literally and is simulation-only',
          explanation:
            '== is the synthesizable equality that propagates unknowns; === performs four-state literal comparison (x===x is true) and only exists for simulation, e.g. testbench x-checks.',
          hint: 'One is for chips, one is for the lab.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What is {2\'b10, 3\'b001}?',
          code: 'wire [4:0] w = {2\'b10, 3\'b001};',
          options: ["5'b10001", "5'b10101", "5'b01001", "5'b10011"],
          answer: "5'b10001",
          explanation:
            'Concatenation joins left-to-right, first item most significant: {10, 001} = 10001.',
          hint: 'Glue the bit strings in written order.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'With a = 4\'b0101, b = 4\'b0011, c = 4\'b0000, what does the expression `a & b == c` actually compute (as parsed)?',
          code:
            'wire [3:0] a = 4\'b0101, b = 4\'b0011, c = 4\'b0000;\nwire y = a & b == c;',
          options: [
            'a & (b == c) → 0',
            '(a & b) == c → 0',
            '(a & b) == c → 1',
            'a & (b == c) → 1',
          ],
          answer: 'a & (b == c) → 0',
          explanation:
            '== binds looser than &, so the parse is a & (b == c). b==c is 0 (0011 != 0000); then a & 0 = 0000, taken in the 1-bit LHS context as 0. The intended (a&b)==c would ALSO be 0 here — but for a different reason; on other inputs the two diverge.',
          hint: 'Insert the parentheses the precedence rules imply first.',
          difficulty: 'hard',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Which expression sign-extends the 4-bit signed value s[3:0] to 8 bits?',
          options: ["{{4{s[3]}}, s}", "{4{s[3]}} + s", "{s, 4{s[3]}}", "{{4{1'b0}}, s}"],
          answer: "{{4{s[3]}}, s}",
          explanation:
            'Replicate the sign bit s[3] four times and place it ABOVE the original 4 bits: {{4{s[3]}}, s}. Option B adds instead of concatenating; option C puts the sign bits BELOW; option D zero-extends regardless of sign.',
          hint: 'Sign bits go on the LEFT (most significant) side.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'In a testbench, which operator (two characters) should compare a DUT output against the expected value so that an x result is caught?',
          answer: '!==',
          explanation:
            '!== is the four-state inequality: out !== expected is true when they differ in ANY respect including x/z, so it catches the case where == would return x and the if would silently skip.',
          hint: 'The four-state NOT-equal.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Four-state equality', definition: '=== / !==: compare including x and z literally; simulation-only.' },
      { term: 'Conditional operator', definition: 'cond ? a : b — a 2:1 multiplexer; nests to build wider muxes.' },
      { term: 'Concatenation', definition: '{a, b, c}: joins signals left-to-right, first item most significant.' },
      { term: 'Replication', definition: '{N{expr}}: repeats a pattern N times (constant N in Verilog-2001).' },
      { term: 'Precedence', definition: 'The binding order among operators; & binds tighter than ==, which binds tighter than |.' },
    ],
    revisionSummary: [
      '== propagates x (design code); === compares x/z literally (testbenches only).',
      '?: is the 2:1 mux; with x in the condition, per-bit agreement wins.',
      '{a, b} concatenates most-significant-first; {N{p}} replicates; constants inside concats must be sized.',
      'Precedence trap: a & b == c means a & (b == c). Parenthesize mixed families.',
      'Rotate idiom: {low_slice, high_slice} reorders bits without arithmetic.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
      { label: 'Wikipedia — Truth table', url: 'https://en.wikipedia.org/wiki/Truth_table', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
