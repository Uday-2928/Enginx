import type { TutorialLesson } from '../types';

/**
 * GOLDEN EXAMPLE — FORMAT REFERENCE ONLY.
 *
 * This file is the quality bar for every tutorial lesson on the platform.
 * It is NOT imported by the course registry. Content authors should copy its
 * shape: complete truth tables, an ASCII diagram, two worked code examples
 * with line-by-line explanations, three common mistakes, guided practice plus
 * two practice exercises, a four-question mixed-kind assessment, key terms, a
 * revision summary and real further-reading links.
 */
export const GOLDEN_LESSON: TutorialLesson = {
  id: 'digital-electronics-logic-gates',
  title: 'Logic Gates',
  summary:
    'Meet the seven gates every digital circuit is built from, read their truth tables, and express the same logic in both C and Verilog.',
  objectives: [
    'State the truth table of AND, OR, NOT, NAND, NOR, XOR and XNOR without looking it up.',
    'Explain why NAND and NOR are called universal gates and build an inverter from each.',
    'Translate a gate-level description into both C bitwise expressions and Verilog continuous assignments.',
    'Predict the output of a small gate network by propagating values through it.',
  ],
  whyItMatters:
    'Every digital system you will ever design — a counter, a CPU, a GPU — decomposes into a handful of logic gates. Interviewers use gate questions to check whether you can reason from first principles, and synthesis tools compile your RTL down to exactly these primitives on real silicon. If your gate-level intuition is fast and reliable, every later topic (Boolean minimization, RTL coding, timing analysis) becomes dramatically easier.',
  prerequisites: [
    'Binary number basics (0 and 1 as voltage levels)',
    'What a truth table is',
  ],
  explanation:
    'A **logic gate** is a hardware function that takes one or more binary inputs and produces exactly one binary output. Because voltages are interpreted as only two states — low (0) and high (1) — a gate\'s entire behavior fits in a small table.\n\n### The core gates\n\n- **AND** outputs 1 only when *all* inputs are 1 — like two switches in series.\n- **OR** outputs 1 when *at least one* input is 1 — like two switches in parallel.\n- **NOT** (an inverter) outputs the opposite of its single input.\n\n### The derived gates\n\n- **NAND** and **NOR** are AND/OR followed by an inversion bubble. They are *universal*: any circuit, no matter how complex, can be built from NAND gates alone (or from NOR gates alone).\n- **XOR** outputs 1 when the inputs *differ*; **XNOR** outputs 1 when they *match*. XOR is the "difference detector" and is the heart of every adder and parity circuit.\n\nA useful reading habit: always trace a gate network from the inputs toward the output, writing the value on every wire. If a wire value is unknown, its downstream gate cannot be evaluated yet.\n\n```\nPriority when tracing: inputs -> intermediate wires -> output\n```\n\nIn code, the same seven behaviors map directly onto operators: C gives you `&`, `|`, `^` and `~` on integers, and Verilog gives you the same operators on bit vectors, plus explicit gate primitives.',
  deepDive:
    '### Why NAND is universal\n\nInvert using a NAND by tying both inputs together: `NAND(a, a) = NOT(a)`. Once you can invert, an AND is `NOT(NAND(a, b))`, and an OR follows from De Morgan\'s theorem: `a OR b = NOT(NOT(a) AND NOT(b))`. The same construction works with NOR. This is not just trivia — many standard-cell libraries make NAND the smallest, fastest gate, so synthesis tools genuinely rebuild your logic out of NANDs.\n\n### Bubble pushing\n\nAn inversion bubble on a gate\'s input can be "pushed" to the output side by switching the gate\'s family (AND becomes OR and vice versa) using De Morgan\'s identities:\n\n- `NOT(a AND b) == (NOT a) OR (NOT b)`\n- `NOT(a OR b) == (NOT a) AND (NOT b)`\n\nEngineers use this to redraw circuits so bubbles cancel pairwise on wires, which makes active-low signals far easier to read.\n\n### Active-low signals\n\nReal chips name many control signals `enable_n` or `reset_n`. The `_n` suffix means the signal is active when it is 0. A gate feeding such a signal usually has a bubble on its output; forgetting a single bubble is one of the most common real-world schematic and RTL bugs.',
  examples: [
    {
      title: 'Gates as C bitwise expressions',
      language: 'c',
      code:
        '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t a = 1;\n    uint8_t b = 0;\n\n    uint8_t and_out = a & b;\n    uint8_t or_out = a | b;\n    uint8_t not_out = (uint8_t)~a & 1u;\n    uint8_t xor_out = a ^ b;\n\n    printf("a=%u b=%u\\n", a, b);\n    printf("AND=%u OR=%u NOT=%u XOR=%u\\n", and_out, or_out, not_out, xor_out);\n    return 0;\n}',
      explanation: [
        'Declare single-bit values inside `uint8_t` so each variable models one wire.',
        '`a & b` is the AND gate: 1 only when both operands are 1.',
        '`a | b` is the OR gate: 1 when at least one operand is 1.',
        '`~a` flips **all eight** bits of the byte, so `& 1u` masks back to the least-significant bit to model a 1-bit NOT gate.',
        '`a ^ b` is XOR: 1 exactly when the inputs differ.',
        'The printed result for `a=1, b=0` is `AND=0 OR=1 NOT=0 XOR=1`, matching the truth tables.',
      ],
    },
    {
      title: 'Gate primitives and continuous assignments in Verilog',
      language: 'verilog',
      code:
        'module gate_demo(\n    input  wire a,\n    input  wire b,\n    output wire y_and,\n    output wire y_or,\n    output wire y_xor,\n    output wire y_nand\n);\n    // Dataflow style: one assign per gate.\n    assign y_and = a & b;\n    assign y_or  = a | b;\n    assign y_xor = a ^ b;\n\n    // Gate-primitive style: output first, instance name optional.\n    nand (y_nand, a, b);\n\nendmodule',
      explanation: [
        'Each port is a single-bit `wire` — a physical connection, not a variable.',
        'The three `assign` statements are **continuous assignments**: the hardware recomputes them whenever `a` or `b` changes, forever.',
        '`a & b`, `a | b` and `a ^ b` are bitwise operators that synthesize to AND, OR and XOR gates.',
        'The `nand` line instantiates a built-in gate primitive: the first argument is the output, followed by the inputs. Unlike module instances, gate primitives may omit the instance name.',
        'Everything in this module is purely combinational — no clock, no registers, no memory of past inputs.',
      ],
    },
  ],
  diagrams: [
    {
      kind: 'ascii',
      title: 'AND and OR gate symbols',
      content:
        '            +-------+\n   a -------|       |\n            |  AND  |---- y = 1 only if a=1 and b=1\n   b -------|       |\n            +-------+\n\n            +-------+\n   a -------|       |\n            |  OR   |---- y = 1 if a=1 or b=1\n   b -------|       |\n            +-------+\n\n   a ----[NOT]---- y = NOT a',
      caption:
        'Block-style gate symbols. A small circle (bubble) drawn on a gate\'s output means the signal is inverted before leaving the gate.',
    },
    {
      kind: 'block',
      title: 'XOR built entirely from NAND gates',
      content:
        '   a ---+------------+--[NAND]--+--[NAND]--+--[NAND]-- y = a XOR b\n        |            |    2     |    4     |\n   b ---|---+--[NAND]-+----+-----+----+     |\n        |   |    1     |  |          |     |\n        +---+----------+  +--[NAND]--+-----+\n                               3\n\n   Gate 1: n1 = NAND(a, b)\n   Gate 2: n2 = NAND(a, n1)\n   Gate 3: n3 = NAND(n1, b)\n   Gate 4: y  = NAND(n2, n3)\n\n   Verification rows:\n   (a,b)=(0,0): n1=1, n2=1, n3=1, y=0  (XOR=0, correct)\n   (a,b)=(1,1): n1=0, n2=1, n3=1, y=0  (XOR=0, correct)\n   (a,b)=(0,1): n1=1, n2=1, n3=0, y=1  (XOR=1, correct)\n   (a,b)=(1,0): n1=1, n2=0, n3=1, y=1  (XOR=1, correct)',
      caption:
        'Four NAND gates reproduce XOR exactly. Every intermediate wire is labelled so each row of the truth table can be traced independently.',
    },
  ],
  tables: [
    {
      caption: 'Two-input gate truth tables',
      headers: ['a', 'b', 'AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR'],
      rows: [
        ['0', '0', '0', '0', '0', '1', '1', '1'],
        ['0', '1', '0', '1', '1', '1', '0', '0'],
        ['1', '0', '0', '1', '1', '1', '0', '0'],
        ['1', '1', '1', '1', '0', '0', '0', '1'],
      ],
    },
    {
      caption: 'Single-input NOT gate truth table',
      headers: ['a', 'NOT a'],
      rows: [
        ['0', '1'],
        ['1', '0'],
      ],
    },
  ],
  commonMistakes: [
    {
      mistake:
        'Using `&&` instead of `&` in C for bit manipulation.',
      fix:
        '`&&` is the *logical* AND of two conditions and always yields 0 or 1; `&` is the *bitwise* AND that operates on every bit. For register work use `&`. A reliable tell: if you are combining variables that represent bits or masks, you almost certainly want the single-character operator.',
    },
    {
      mistake:
        'Confusing XOR and XNOR when reading a schematic.',
      fix:
        'XOR outputs 1 when inputs differ; XNOR adds an output bubble and outputs 1 when inputs match. Check for the bubble every time, and validate your reading against the one row that distinguishes them: both inputs equal.',
    },
    {
      mistake:
        'Trusting a single hand-trace when checking a gate network.',
      fix:
        'One traced input combination can accidentally match the expected output while three other rows are wrong. Trace every row: label each intermediate wire for each input combination and compare against the full truth table before declaring the network correct or buggy.',
    },
  ],
  guidedPractice: {
    title: 'Trace a two-gate network',
    brief:
      'Given y = (a AND b) OR (NOT a), build its complete truth table by hand, then confirm it in code with the C expressions `((a & b) | (~a & 1))`.',
    starterCode:
      '#include <stdio.h>\n\nint main(void) {\n    for (int a = 0; a <= 1; a++) {\n        for (int b = 0; b <= 1; b++) {\n            int y = ((a & b) | (~a & 1)) & 1;\n            printf("a=%d b=%d y=%d\\n", a, b, y);\n        }\n    }\n    return 0;\n}',
    expectedBehavior:
      'The truth table is 1,1,0,1 for (a,b) = (0,0), (0,1), (1,0), (1,1) — the output equals NOT(a) OR (a AND b), which simplifies to NOT(a) OR b.',
    hints: [
      'Evaluate the AND first, then NOT a, then OR the two results.',
      'In C, `~a` touches all bits, so mask with `& 1` before comparing.',
      'Check row (1,1) carefully: AND gives 1, NOT a gives 0, so y = 1 OR 0 = 1.',
    ],
    challengeId: 'ece-06-and-gate',
  },
  practiceExercises: [
    {
      title: 'Build XOR from the two-gate limit',
      brief:
        'Using only AND, OR and NOT gates (at most four of them), draw or list a network that computes a XOR b. Verify all four input rows.',
      expectedBehavior:
        'A correct minimal answer is y = (a AND (NOT b)) OR ((NOT a) AND b). All four truth-table rows must match XOR.',
      hints: [
        'XOR is true in two rows: (0,1) and (1,0).',
        'Detect each row with its own product term, then OR the two terms.',
        'This pattern — one AND per minterm, OR of the minterms — is the sum-of-products template you will reuse everywhere.',
      ],
      challengeId: 'ece-07-or-gate',
    },
    {
      title: 'Universal-gate conversion',
      brief:
        'Rewrite y = a AND (b OR NOT c) using only NAND gates. State how many NANDs you used and verify two rows of your choice.',
      expectedBehavior:
        'A five-NAND solution exists: invert c, OR b with it via a NAND-plus-invert construction, then AND via NAND-plus-invert. Any correct all-NAND network with verified rows is acceptable.',
      hints: [
        'First build NOT with one NAND (tie its inputs together).',
        'Remember: x AND y = NOT(NAND(x, y)), and x OR y = NAND(NOT x, NOT y).',
        'Count gates after simplifying — pushing bubbles can save you one.',
      ],
    },
  ],
  assessment: {
    title: 'Logic gates checkpoint',
    passScore: 75,
    questions: [
      {
        id: 'q1',
        kind: 'multiple-choice',
        prompt: 'Which gate outputs 1 only when every one of its inputs is 1?',
        options: ['AND', 'OR', 'XOR', 'NOR'],
        answer: 'AND',
        explanation:
          'AND is the "all inputs high" function; OR needs only one high input, XOR detects differing inputs and NOR is the inverted OR.',
        hint: 'Think of switches wired in series.',
        difficulty: 'easy',
      },
      {
        id: 'q2',
        kind: 'true-false',
        prompt: 'Any Boolean function can be implemented using only two-input NAND gates.',
        answer: 'true',
        explanation:
          'NAND is universal: tying its inputs together makes an inverter, and inverter plus NAND reproduces AND, OR and therefore every sum-of-products function.',
        hint: 'This property is why NAND-heavy standard-cell libraries exist.',
        difficulty: 'medium',
      },
      {
        id: 'q3',
        kind: 'output-prediction',
        prompt: 'What value does y hold when a=1 and b=1?',
        code: 'assign y = a ^ b;  // a = 1, b = 1',
        options: ['0', '1', 'x', 'z'],
        answer: '0',
        explanation:
          'XOR outputs 1 only when the inputs differ. With a=1 and b=1 the inputs match, so y=0.',
        hint: 'XOR is the "difference detector".',
        difficulty: 'easy',
      },
      {
        id: 'q4',
        kind: 'short-answer',
        prompt:
          'Name the single two-input gate (one word) whose output is 1 exactly when its two inputs differ.',
        answer: 'XOR',
        explanation:
          'Exclusive-OR (XOR) is 1 precisely for the rows (0,1) and (1,0) — the rows where inputs differ.',
        hint: 'Its symbol is a caret ^ in both C and Verilog.',
        difficulty: 'easy',
      },
    ],
  },
  keyTerms: [
    { term: 'Logic gate', definition: 'A hardware function mapping one or more binary inputs to exactly one binary output.' },
    { term: 'Truth table', definition: 'A table listing the output for every combination of input values — the complete specification of a gate.' },
    { term: 'Universal gate', definition: 'A gate (NAND or NOR) from which any Boolean function can be built.' },
    { term: 'Bubble', definition: 'The small circle on a gate symbol meaning logical inversion at that terminal.' },
    { term: 'Active-low signal', definition: 'A signal that is asserted when it is 0, conventionally suffixed _n in schematics and RTL.' },
  ],
  revisionSummary: [
    'AND = all inputs 1; OR = any input 1; NOT = invert; XOR = inputs differ; XNOR = inputs match.',
    'NAND and NOR each negate their base gate\'s output; both are universal gates.',
    'De Morgan: NOT(a AND b) = (NOT a) OR (NOT b), and NOT(a OR b) = (NOT a) AND (NOT b).',
    'C bitwise operators (&, |, ^, ~) and Verilog operators model gates directly; mask with & 1 when a NOT widens beyond one bit.',
    'Always validate gate networks on every truth-table row, never on a single traced example.',
  ],
  furtherReading: [
    { label: 'Electronics Tutorials — Universal gates', url: 'https://www.electronics-tutorials.ws/logic/universal-gates.html', kind: 'article' },
    { label: 'Wikipedia — Logic gate', url: 'https://en.wikipedia.org/wiki/Logic_gate', kind: 'article' },
  ],
  estimatedMinutes: 45,
};
