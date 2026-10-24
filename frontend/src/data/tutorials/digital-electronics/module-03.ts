import type { TutorialLesson } from '../types';

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'de-m03-l01',
    title: 'The Seven Logic Gates',
    summary:
      'AND, OR, NOT, NAND, NOR, XOR and XNOR: what each one computes, how to read its truth table at a glance, and how the same seven functions appear as C operators and Verilog primitives.',
    objectives: [
      'State the output of any of the seven gates for any input combination without a reference.',
      'Relate each gate to a plain-language reading (all / any / differ / match).',
      'Write the gates as C bitwise expressions on single-bit values.',
      'Recognize gate symbols and inversion bubbles in schematics and netlists.',
    ],
    whyItMatters:
      'Gates are the vocabulary of every schematic, every netlist and every line of combinational RTL. Adders are built from XOR and AND; comparators from XNOR; control logic from NAND and NOR. If reading a truth table is slow, every later topic is slow — this is the lesson to over-learn.',
    prerequisites: ['de-m01-l02', 'de-m01-l03'],
    explanation:
      'A **logic gate** is a small hardware block that computes one fixed Boolean function of its binary inputs. Its complete behavior is its **truth table**: one row per input combination. With two inputs there are four rows, so seven functions fit on a page — and that page is the periodic table of digital design.\n\n### The three basic gates\n\n- **AND** — outputs 1 only when *all* inputs are 1. Think of two switches in series: current flows only if both conduct. Written `a AND b`, `a * b` in Boolean algebra, `a & b` in code.\n- **OR** — outputs 1 when *at least one* input is 1. Two switches in parallel. Written `a OR b`, `a + b` in Boolean algebra, `a | b` in code.\n- **NOT** — the inverter; outputs the opposite of its single input. Written `NOT a`, `a\'` or `~a`, `!a` or `~a` in code.\n\n### The four derived gates\n\n- **NAND** = AND followed by NOT (drawn with an inversion *bubble* on the output). It outputs 0 only in the all-ones row.\n- **NOR** = OR followed by NOT. It outputs 1 only in the all-zeros row.\n- **XOR** ("exclusive or") — outputs 1 when the inputs *differ*. It is the difference detector, and the heart of adders and parity circuits.\n- **XNOR** ("exclusive nor", or equivalence) — outputs 1 when the inputs *match*. It is the equality detector for one bit; the comparator in Module 5 is a bundle of XNORs.\n\nA reading trick that survives under pressure: say each gate\'s contract in words — AND "all", OR "any", XOR "differ", XNOR "match", NAND "not all", NOR "none".\n\n### Bubbles: inversion as a terminal\n\nThe small circle on NAND/NOR/XNOR outputs (and sometimes on inputs) means "invert at this terminal". Reading schematics is mostly about tracking bubbles; Lesson 2 shows how bubbles can be pushed around with De Morgan\'s theorem, and Module 4 makes it algebra.',
    deepDive:
      '### XOR is addition, XNOR is equality\n\nLook at the XOR column of the truth table next to binary addition of two bits: 0+0=0, 0+1=1, 1+0=1, 1+1=0 (ignoring the carry). XOR *is* the sum bit of an adder, and AND is the carry bit. That single observation is why the full adder in Module 5 has the shape it does. Similarly XNOR is the natural one-bit equality test, which is why magnitude comparators are forests of XNORs feeding an AND.\n\n### Gates as physical objects\n\nEach gate is a handful of transistors (CMOS NOT needs two, NAND needs four), a few femtoseconds-to-picoseconds of propagation delay, and input capacitance. *Propagation delay* — the time between an input change and the output settling — is zero in every truth table but never zero in silicon; Module 8 turns that fact into setup/hold analysis. Even in this lesson, keep the habit that wire values take time to become valid.\n\n### Three-valued simulation reality\n\nBetween power-up and the first valid inputs, gate inputs may be x (undefined), and gates propagate unknowns: 0 AND x = 0 (a zero forces the result) but 1 AND x = x. Knowing which inputs *control* a gate even under uncertainty is how simulation mysteries get debugged later — and it comes straight from reading truth tables carefully.',
    examples: [
      {
        title: 'All seven gates as C bitwise expressions',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t a = 1;\n    uint8_t b = 0;\n\n    uint8_t g_and  = (uint8_t)(a & b);            /* AND : all        */\n    uint8_t g_or   = (uint8_t)(a | b);            /* OR  : any        */\n    uint8_t g_not  = (uint8_t)(~a & 1u);          /* NOT : invert     */\n    uint8_t g_nand = (uint8_t)(~(a & b) & 1u);    /* NAND: not all    */\n    uint8_t g_nor  = (uint8_t)(~(a | b) & 1u);    /* NOR : none       */\n    uint8_t g_xor  = (uint8_t)(a ^ b);            /* XOR : differ     */\n    uint8_t g_xnor = (uint8_t)(~(a ^ b) & 1u);    /* XNOR: match      */\n\n    printf("a=%u b=%u\\n", a, b);\n    printf("AND=%u OR=%u NOT=%u\\n", g_and, g_or, g_not);\n    printf("NAND=%u NOR=%u XOR=%u XNOR=%u\\n",\n           g_nand, g_nor, g_xor, g_xnor);\n    return 0;\n}',
        explanation: [
          'Each variable models one wire as a 0/1 value inside a `uint8_t`; the mask `& 1u` after every `~` keeps the result to one bit, because `~` flips all eight bits of the byte.',
          'With a=1, b=0: AND=0 (not all high), OR=1 (at least one high), NOT(a)=0.',
          'NAND of (1,0) is 1 (only the all-ones row gives 0); NOR is 0 (only the all-zeros row gives 1).',
          'XOR=1 because the inputs differ; XNOR=0 because they do not match.',
          'Change a and b to 1,1 and re-predict all seven outputs before comparing with the truth table — that habit is the whole exercise.',
        ],
      },
      {
        title: 'The same gates as Verilog primitives',
        language: 'verilog',
        code:
          'module gate_primitives(\n    input  wire a,\n    input  wire b,\n    output wire y_and,\n    output wire y_or,\n    output wire y_not,\n    output wire y_nand,\n    output wire y_nor,\n    output wire y_xor,\n    output wire y_xnor\n);\n    // Gate primitives: output port first, then inputs.\n    and  g1 (y_and,  a, b);\n    or   g2 (y_or,   a, b);\n    not  g3 (y_not,  a);\n    nand g4 (y_nand, a, b);\n    nor  g5 (y_nor,  a, b);\n    xor  g6 (y_xor,  a, b);\n    xnor g7 (y_xnor, a, b);\nendmodule',
        explanation: [
          'Verilog ships the seven gates as built-in **primitives**; instantiating one is literally placing a gate in a netlist.',
          'The first connection is always the output; the remaining connections are the inputs, in order.',
          'An instance name (`g1` ...) is optional for primitives but makes waveforms and schematics far easier to read.',
          'This module is pure structure — you could draw it pin for pin. Dataflow style (`assign y_and = a & b;`) is equivalent and more common in RTL; both appear throughout this course.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Gate symbols with inversion bubbles',
        content:
          '   a ----| AND |---- y    y = 1 only if a=1 and b=1\n   b ----|     |\n\n   a ----| OR  |---- y    y = 1 if a=1 or b=1 (or both)\n   b ----|     |\n\n   a ----[NOT]------ y    y = NOT a\n\n   a ----| NAND|--o-- y    bubble = invert: y = NOT(a AND b)\n   b ----|      |\n\n   a ----| NOR |-o--- y    y = NOT(a OR b)\n   b ----|     |\n\n   a ----| XOR |---- y    y = 1 if a differs from b\n   b ----|     |\n\n   a ----| XNOR|--o-- y    y = 1 if a matches b\n   b ----|      |\n\n  (o = small inversion bubble on the output terminal)',
        caption:
          'Block-style symbols; a bubble anywhere on a gate means logical inversion at that terminal.',
      },
    ],
    tables: [
      {
        caption: 'Two-input gates — complete truth tables',
        headers: ['a', 'b', 'AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'],
        rows: [
          ['0', '0', '0', '0', '1', '1', '0', '1'],
          ['0', '1', '0', '1', '1', '0', '1', '0'],
          ['1', '0', '0', '1', '1', '0', '1', '0'],
          ['1', '1', '1', '1', '0', '0', '0', '1'],
        ],
      },
      {
        caption: 'The NOT gate',
        headers: ['a', 'NOT a'],
        rows: [
          ['0', '1'],
          ['1', '0'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using `&&` and `||` instead of `&` and `|` for bit work in C.',
        fix:
          '`&&`/`||` are *logical* operators on whole conditions and always produce 0 or 1; `&`/`|` are *bitwise* and act per bit. For register and gate modeling, the bitwise pair is nearly always right. Tell: if your operands represent bits or masks, use the single-character operator.',
      },
      {
        mistake: 'Mixing up XOR and XNOR when reading a symbol quickly.',
        fix:
          'Check the bubble first: XNOR carries an output bubble. Then verify with the rows where inputs are equal — XNOR gives 1 there, XOR gives 0. The equal-rows test is unambiguous.',
      },
      {
        mistake: 'Believing a gate "knows" its inputs\' history.',
        fix:
          'Gates are combinational: the output is a function of the *present* input values only. If behavior must depend on the past, you need memory elements (Module 6), not more gates.',
      },
    ],
    guidedPractice: {
      title: 'Write a gate contract, then prove it',
      brief:
        'For y = (a AND b) OR (NOT a AND c): first state in words when y is 1, then fill its 8-row truth table by hand, then confirm with the C sweep in the starter code.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    for (int a = 0; a <= 1; a++)\n        for (int b = 0; b <= 1; b++)\n            for (int c = 0; c <= 1; c++) {\n                int t1 = a & b;            /* a AND b        */\n                int t2 = (!a) & c;         /* (NOT a) AND c  */\n                int y  = t1 | t2;          /* OR             */\n                printf("a=%d b=%d c=%d  y=%d\\n", a, b, c, y);\n            }\n    return 0;\n}',
      expectedBehavior:
        'In words: y = 1 when (a AND b are both 1) OR (a is 0 AND c is 1). Tracing: y = 1 on rows 001, 011, 110, 111 and y = 0 on rows 000, 010, 100, 101. Row 101 is the instructive one: b=0 kills the first AND and a=1 kills the second, so y=0.',
      hints: [
        'Evaluate the two ANDs independently before the final OR.',
        'The word statement "a AND b, or else a=0 AND c" is the contract — every table row must obey it.',
        'Row 101 is the trap: b=0 kills the first AND and a=1 kills the second, so y=0.',
      ],
    },
    practiceExercises: [
      {
        title: 'Model an AND gate in Verilog',
        brief:
          'Write a Verilog module `and_gate` with inputs a, b and output y using one continuous assignment. Then add a second output y_n computed with a `nand` primitive, and state the relationship between y and y_n for every row.',
        expectedBehavior:
          'The module body is `assign y = a & b;` plus `nand g(y_n, a, b);`. For every input row y_n = NOT y: the two outputs are exact complements.',
        hints: [
          'Copy the port-list skeleton from the example module.',
          'One line per gate; the primitive form puts the output first.',
          'The relationship you must state is exactly what the bubble means.',
        ],
        challengeId: 'ece-06-and-gate',
      },
      {
        title: 'Model an OR gate and its bubbled twin',
        brief:
          'Write a Verilog module `or_gate` with inputs a, b and output y, then predict and verify: for which input rows does y = 1? Do the same for a NOT gate module `inv` with input a and output y.',
        expectedBehavior:
          '`assign y = a | b;` gives y=1 on rows 01, 10, 11 (any input high). The inverter `assign y = ~a;` outputs the complement of a on both rows.',
        hints: [
          'OR is the "any" contract — one high input suffices.',
          'The NOT module has one input and no second operand.',
        ],
        challengeId: 'ece-07-or-gate',
      },
      {
        title: 'Model a NOT gate in Verilog',
        brief:
          'Write a Verilog module `inv` with input a and output y where y is the complement of a, using one continuous assignment. Verify both rows of its truth table, then state what y_not equals in the playground module when a = 1.',
        expectedBehavior:
          'The module body is `assign y = ~a;` (equivalently a `not` primitive: `not g(y, a);`). Row a=0 -> y=1; row a=1 -> y=0. In the playground, y_not = 0 when a = 1.',
        hints: [
          'The inverter has one input — the port list is shorter than the two-input gates.',
          'In Verilog, `~` is bitwise NOT; on a 1-bit wire it is exactly the inverter.',
          'A `not` primitive also exists with output-first port order, mirroring the other gates.',
        ],
        challengeId: 'ece-05-not-gate',
      },
      {
        title: 'Gates under unknown inputs',
        brief:
          'Using simulation semantics (0, 1, x): evaluate (a) 0 AND x; (b) 1 AND x; (c) 0 OR x; (d) 1 OR x; (e) NOT x. Which gates "decide" despite an unknown input, and why is that knowledge useful?',
        expectedBehavior:
          '(a) 0 (a low input forces AND low). (b) x. (c) x. (d) 1 (a high input forces OR high). (e) x. AND with one input 0 and OR with one input 1 are decided regardless of the unknown; this lets you reason about circuits during power-up and spot which x values actually matter.',
        hints: [
          'Ask: "could any value of the unknown change the output?" If no, the output is decided.',
          'This is the controlling-value idea: 0 controls AND, 1 controls OR.',
        ],
      },
    ],
    assessment: {
      title: 'Seven gates checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which gate outputs 1 in exactly one row of its two-input truth table — and which row?',
          options: ['NOR, the all-zeros row', 'NAND, the all-ones row', 'XOR, the mixed rows', 'AND, the all-ones row'],
          answer: 'NOR, the all-zeros row',
          explanation:
            'NOR is 1 only when both inputs are 0. NAND is 0 in exactly one row (all ones); XOR is 1 in two rows; AND is 1 in one row — but the question asks for the gate whose *output is 1* in one row, which is NOR.',
          hint: 'Two gates have exactly one distinguished row; check which one has the 1 there.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'XNOR outputs 1 whenever its two inputs are equal.',
          answer: 'true',
          explanation: 'XNOR (equivalence) is 1 on rows 00 and 11 — the matching rows — and 0 where inputs differ.',
          hint: 'XNOR is the one-bit equality test.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'With a=1 and b=1, what does y hold?',
          code: 'assign y = a ^ b;',
          options: ['0', '1', 'x', 'z'],
          answer: '0',
          explanation: 'XOR outputs 1 only when inputs differ; equal inputs give 0.',
          hint: 'XOR is the difference detector.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Name the two-input gate whose output is the exact complement of AND for every input row.',
          answer: 'NAND',
          explanation: 'NAND = NOT AND: its output is 0 only in the all-ones row, complementing AND everywhere.',
          hint: 'The bubble on the output tells you.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'output-prediction',
          prompt: 'In C, what is the value of g after these lines?',
          code: 'uint8_t a = 1, b = 1;\nuint8_t g = (uint8_t)(~(a & b) & 1u);',
          options: ['0', '1', '255', 'undefined'],
          answer: '0',
          explanation: 'a & b = 1; ~1 flips all eight bits to 11111110; masking with 1u keeps the LSB = 0. So g = 0 — the NAND of two ones.',
          hint: 'Do the AND first, then think about what ~ does to all 8 bits.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Truth table', definition: 'The complete input-to-output specification of a gate, one row per input combination.' },
      { term: 'Bubble', definition: 'The small circle on a gate terminal indicating inversion at that terminal.' },
      { term: 'XOR', definition: 'Exclusive-OR: outputs 1 when an odd number of inputs are 1 (for two inputs: when they differ).' },
      { term: 'XNOR', definition: 'Equivalence: outputs 1 when inputs match; the one-bit equality detector.' },
      { term: 'Controlling value', definition: 'An input value that forces a gate\'s output regardless of other inputs (0 for AND/NAND, 1 for OR/NOR).' },
      { term: 'Combinational', definition: 'Describing circuits whose outputs depend only on present inputs — the property of every bare gate.' },
    ],
    revisionSummary: [
      'Contracts in words: AND all, OR any, NAND not-all, NOR none, XOR differ, XNOR match, NOT invert.',
      'XOR column = sum bit of binary addition; AND column = carry bit.',
      'In C use & | ^ ~ (bitwise) for bits, never && ||; mask after ~.',
      'Verilog provides gate primitives with output-first port order, and & | ^ in continuous assignments.',
      'Bubbles mark inversion terminals; read them first in any schematic.',
      'Unknown (x) inputs: 0 controls AND, 1 controls OR — some outputs are decidable even then.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Logic gate', url: 'https://en.wikipedia.org/wiki/Logic_gate', kind: 'article' },
      { label: 'Electronics Tutorials — Logic gates', url: 'https://www.electronics-tutorials.ws/logic/logic-gates.html', kind: 'article' },
      { label: 'All About Circuits — Digital gates', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-3/', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'de-m03-l02',
    title: 'Universal Gates: Building Everything from NAND and NOR',
    summary:
      'Why NAND and NOR are called universal, how to construct NOT, AND, OR and XOR from each of them, and why real chip libraries are NAND-heavy.',
    objectives: [
      'Build NOT, AND, OR from NAND gates alone and from NOR gates alone.',
      'Build XOR from exactly four NAND gates and trace every intermediate wire.',
      'Explain the economic reason synthesis tools map logic onto NAND/NOR structures.',
      'Apply De Morgan’s pairing to push bubbles through a mixed-gate network.',
    ],
    whyItMatters:
      'Universality is not a party trick: CMOS manufacturing makes NAND (and NOR) the cheapest, fastest gates, so real silicon implements your RTL mostly as optimized NAND/NOR networks. Recognizing that an AND in your code becomes NAND-plus-inverter on the die closes the loop between this course and the VLSI track.',
    prerequisites: ['de-m03-l01'],
    explanation:
      'A gate family is **universal** if any Boolean function can be built from it alone. NAND and NOR both qualify, and the proof is constructive — you only need three building blocks: invert, AND, OR.\n\n### From NAND\n\n- **NOT**: tie both inputs together: `NOT a = NAND(a, a)`.\n- **AND**: invert the NAND output: `a AND b = NAND(NAND(a,b), NAND(a,b))` — two gates.\n- **OR**: by De Morgan, `a OR b = NOT(NOT a AND NOT b)`, so invert each input and NAND the results: `NAND(NAND(a,a), NAND(b,b))` — three gates.\n- **XOR**: four gates, shown in the diagram below; trace every wire to believe it.\n\n### From NOR\n\nMirror images: **NOT** = `NOR(a, a)`; **OR** = invert the NOR output; **AND** = `NOR(NOR(a,a), NOR(b,b))` (invert both inputs, then NOR — De Morgan again: `a AND b = NOT(NOT a OR NOT b)`).\n\n### Why silicon prefers NAND\n\nIn CMOS, a two-input NAND is four transistors with the output pull-up being two parallel PMOS devices (fast), while NOR’s pull-up is two series PMOS (slower and larger for the same drive). Standard-cell libraries therefore offer NAND at many input counts with tight, fast timing, and **synthesis tools rebuild your AND/OR logic into NAND/NOR networks** automatically. When you later read a synthesized netlist and find almost no plain AND gates, this lesson is why.\n\n### Bubble pushing\n\nDe Morgan’s theorems turn a bubbled gate into the opposite gate:\n\n- `NOT(a AND b) = (NOT a) OR (NOT b)` — NAND = OR with both inputs bubbled.\n- `NOT(a OR b) = (NOT a) AND (NOT b)` — NOR = AND with both inputs bubbled.\n\nThis lets you redraw networks so bubbles on the two ends of a wire cancel, making active-low logic (`reset_n`, `enable_n`) readable. Two bubbles in a row = no inversion at all.',
    deepDive:
      '### Counting gates, then shaving them\n\nThe naive NAND-only build of `y = a AND (b OR NOT c)`: one NAND as inverter for c, three NANDs for the OR (two inverters + one NAND), two NANDs for the AND (one + inverter) — six gates. Pushing bubbles and re-reading the expression as `NOT( a\' OR (b OR c\')\' )` style transformations can shave one or two. Minimization (Module 4) is the systematic version of this game; the Karnaugh map tells you the minimum *before* you start wiring.\n\n### Universality with two inputs or one\n\nNote the subtlety: NAND2 is universal *because* you can wire both inputs to the same signal to get an inverter. A hypothetical gate without any input duplication (e.g. true 2-input XOR alone) is not universal. The general theorem: a gate family is universal if it can express NOT and (AND or OR). This is why FPGA lookup tables — which can realize *any* function of k inputs — sit at the top of the universality hierarchy, and why the VLSI track cares about cell libraries rather than individual gates.',
    examples: [
      {
        title: 'XOR from four NANDs, verified exhaustively in C',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* The only gate we are allowed: two-input NAND, one bit wide. */\nuint8_t nand2(uint8_t a, uint8_t b) {\n    return (uint8_t)(~(a & b) & 1u);\n}\n\n/* XOR built purely from nand2 — the four-gate network. */\nuint8_t xor_from_nand(uint8_t a, uint8_t b) {\n    uint8_t n1 = nand2(a, b);     /* gate 1 */\n    uint8_t n2 = nand2(a, n1);    /* gate 2 */\n    uint8_t n3 = nand2(n1, b);    /* gate 3 */\n    uint8_t y  = nand2(n2, n3);   /* gate 4 */\n    return y;\n}\n\nint main(void) {\n    for (int a = 0; a <= 1; a++)\n        for (int b = 0; b <= 1; b++) {\n            uint8_t y = xor_from_nand((uint8_t)a, (uint8_t)b);\n            printf("a=%d b=%d -> y=%d\\n", a, b, y);\n        }\n    return 0;\n}',
        explanation: [
          '`nand2` is the single allowed primitive: AND then invert, masked to one bit.',
          'Gate 1 computes n1 = NOT(a AND b) — the "not both" signal.',
          'Gates 2 and 3 each combine one input with n1; for differing inputs exactly one of them goes low.',
          'Gate 4 ORs the pair via NAND: y = NOT(n2 AND n3), which is 1 exactly when n2 and n3 differ.',
          'The loop prints 0, 1, 1, 0 for (00, 01, 10, 11) — XOR, achieved without a single XOR gate.',
        ],
      },
      {
        title: 'The same four-NAND network as structural Verilog',
        language: 'verilog',
        code:
          'module xor4_nand(\n    input  wire a,\n    input  wire b,\n    output wire y\n);\n    wire n1, n2, n3;   // one wire per intermediate gate output\n\n    nand g1 (n1, a,  b);\n    nand g2 (n2, a,  n1);\n    nand g3 (n3, n1, b);\n    nand g4 (y,  n2, n3);\nendmodule',
        explanation: [
          'Four primitive instances mirror the C network exactly; `wire n1, n2, n3` name the intermediate nets.',
          'Each NAND drives exactly one wire, and each wire has exactly one driver — the rule that keeps netlists sane.',
          'Reading order does not matter here: all four gates act concurrently, with n1 ready "before" (in delay terms) g2 and g3 can settle.',
          'This is the structural style; synthesis would produce the same network from the single line `assign y = a ^ b;`.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'XOR from four NAND gates, fully traced',
        content:
          '   a, b  = inputs\n\n   a --------+\n   b --------+--[NAND g1]---- n1          g1 = NAND(a, b)\n\n   a --------+\n   n1 -------+--[NAND g2]---- n2          g2 = NAND(a, n1)\n\n   n1 -------+\n   b --------+--[NAND g3]---- n3          g3 = NAND(n1, b)\n\n   n2 -------+\n   n3 -------+--[NAND g4]---- y           g4 = NAND(n2, n3)\n\n   trace all four rows:\n   (a,b)=(0,0): n1=1  n2=1  n3=1  y=0   (match  -> XOR=0 OK)\n   (a,b)=(0,1): n1=1  n2=1  n3=0  y=1   (differ -> XOR=1 OK)\n   (a,b)=(1,0): n1=1  n2=0  n3=1  y=1   (differ -> XOR=1 OK)\n   (a,b)=(1,1): n1=0  n2=1  n3=1  y=0   (match  -> XOR=0 OK)',
        caption:
          'The four-NAND XOR with every wire labelled; the row traces prove it without ever drawing a transistor.',
      },
      {
        kind: 'ascii',
        title: 'De Morgan bubble pushing',
        content:
          '  NAND drawn two ways (identical function):\n\n    a ---|    \\\n         |NAND|--o--- y            a --o--|    \\\n    b ---|    /                            |OR |---- y\n                                           b --o--|    /\n\n    "NAND"  =  "OR with both inputs bubbled"\n\n  NOR drawn two ways:\n\n    a ---|    \\\n         |NOR |---o-- y            a --o--|     \\\n    b ---|    /                            |AND |---- y\n                                           b --o--|     /\n\n    "NOR"   =  "AND with both inputs bubbled"\n\n  Rule: a bubble on BOTH ends of a wire cancels;\n        push bubbles toward each other to make them meet.',
        caption:
          'Bubble pushing redraws the same circuit into the gate family you prefer, or cancels pairs of bubbles entirely.',
      },
    ],
    tables: [
      {
        caption: 'Universal constructions (cheapest first)',
        headers: ['Target', 'From NAND', 'From NOR'],
        rows: [
          ['NOT a', '1 gate: NAND(a, a)', '1 gate: NOR(a, a)'],
          ['a AND b', '2 gates: NAND + inverter', '3 gates: 2 inverters + NOR'],
          ['a OR b', '3 gates: 2 inverters + NAND', '2 gates: NOR + inverter'],
          ['a XOR b', '4 gates (see diagram)', '5 gates (typical build)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Building AND from NAND as `NAND(a,b)` and calling it done.',
        fix:
          'NAND(a,b) is the complement of AND. The final inversion is not optional: AND = NOT(NAND(a,b)), and the inverter is one more NAND with tied inputs.',
      },
      {
        mistake: 'Cancelling a bubble against nothing.',
        fix:
          'Bubbles cancel only in *pairs on the same wire*. A lone bubble must be accounted for as an inversion — either absorbed into an adjacent bubbled gate (De Morgan) or implemented with an explicit inverter.',
      },
      {
        mistake: 'Assuming "universal" means "fastest".',
        fix:
          'Universality says possible, not optimal. The four-NAND XOR has two gate delays in series; a native XOR cell in a library is faster. Universality matters for library design and synthesis, while hand optimization starts from K-maps (Module 4).',
      },
    ],
    guidedPractice: {
      title: 'OR from three NANDs',
      brief:
        'Using only NAND gates, build y = a OR b. Draw (or list) the three gates, name every intermediate wire, and trace rows (a,b) = (0,0) and (1,1) to verify.',
      starterCode:
        '#include <stdio.h>\n#include <stdint.h>\n\nuint8_t nand2(uint8_t a, uint8_t b) {\n    return (uint8_t)(~(a & b) & 1u);\n}\n\n/* TODO: implement OR using only nand2 calls (three gates expected) */\nuint8_t or_from_nand(uint8_t a, uint8_t b) {\n    uint8_t na = nand2(a, a);   /* NOT a */\n    uint8_t nb = nand2(b, b);   /* NOT b */\n    return nand2(na, nb);       /* NAND(NOT a, NOT b) = a OR b */\n}\n\nint main(void) {\n    for (int a = 0; a <= 1; a++)\n        for (int b = 0; b <= 1; b++)\n            printf("a=%d b=%d or=%d\\n", a, b, or_from_nand((uint8_t)a, (uint8_t)b));\n    return 0;\n}',
      expectedBehavior:
        'Gates: g1 = NAND(a,a) = NOT a; g2 = NAND(b,b) = NOT b; g3 = y = NAND(NOT a, NOT b). Row (0,0): g1=1, g2=1, y=NAND(1,1)=0 — correct (OR of two lows is low). Row (1,1): g1=0, g2=0, y=NAND(0,0)=1 — correct. The printed table is 0,1,1,1.',
      hints: [
        'Start from De Morgan: a OR b = NOT( (NOT a) AND (NOT b) ).',
        'Each NOT inside the De Morgan form is one NAND with tied inputs.',
        'The outer NOT is what turns the inner AND into the final NAND.',
      ],
    },
    practiceExercises: [
      {
        title: 'NOR toolkit',
        brief:
          'Using only NOR gates, build (a) NOT a, (b) a OR b, (c) a AND b. State the gate count of each and verify row (a,b) = (0,1) for part (c).',
        expectedBehavior:
          '(a) 1 gate: NOR(a,a). (b) 2 gates: NOR(a,b) then invert it. (c) 3 gates: invert a, invert b, NOR the results (De Morgan: a AND b = NOT(NOT a OR NOT b)). Row (0,1): NOT a = 1, NOT b = 0, NOR(1,0) = 0 = 0 AND 1. Correct.',
        hints: [
          'NOR is the mirror of NAND: it owns OR the way NAND owns AND.',
          'For (c), write the De Morgan identity first, then implement each NOT as a tied-input NOR.',
          'A two-input NOR outputs 1 only when both inputs are 0 — use that to verify rows quickly.',
        ],
      },
      {
        title: 'Shave a NAND network',
        brief:
          'Build y = a AND (b OR NOT c) using only NAND gates. First build it naively (invert c; OR b with it; AND the result with a), then find the shorter factored construction. Verify rows (a,b,c) = (1,1,1) and (1,0,1).',
        expectedBehavior:
          'The factored form y = a * (b + c\') leads to 4 NANDs: n1 = NAND(b,b) = b\'; n2 = NAND(n1, c) = b + c\' (since NAND(x,y) = x\' + y\'); n3 = NAND(a, n2) = NOT(a(b+c\')); n4 = NAND(n3, n3) = a(b+c\') = y. The naive build (invert c, OR via three NANDs, AND via two NANDs) needs 6. Row (1,1,1): n1=0, n2=1, n3=0, n4=1 -> y=1. Row (1,0,1): n1=1, n2=0, n3=1, n4=0 -> y=0. Both match the truth table.',
        hints: [
          'Use the NAND identity NAND(x,y) = NOT(x) + NOT(y) to build OR-of-terms cheaply.',
          'Factor a out of the expression before wiring: y = a(b + c\').',
          'An AND is always two NANDs (NAND + tied-input NAND); the OR inside costs only one NAND if you feed it the already-inverted terms.',
        ],
      },
    ],
    assessment: {
      title: 'Universal gates checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'How many two-input NAND gates are needed to build XOR (using tied-input NANDs as inverters)?',
          options: ['4', '3', '5', '6'],
          answer: '4',
          explanation: 'The classic network: n1=NAND(a,b), n2=NAND(a,n1), n3=NAND(n1,b), y=NAND(n2,n3).',
          hint: 'Two gates share the first NAND\'s output.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'NOR can implement NOT by tying its two inputs together.',
          answer: 'true',
          explanation: 'NOR(a,a) = NOT(a OR a) = NOT a; the same trick makes NAND(a,a) = NOT a.',
          hint: 'What is a OR a?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'Using the four-NAND XOR network, what is y when a=1 and b=0?',
          code: 'n1 = NAND(a, b);\nn2 = NAND(a, n1);\nn3 = NAND(n1, b);\ny  = NAND(n2, n3);',
          options: ['0', '1', 'x', 'undefined'],
          answer: '1',
          explanation: 'n1 = NAND(1,0) = 1; n2 = NAND(1,1) = 0; n3 = NAND(1,0) = 1; y = NAND(0,1) = 1 — XOR of differing inputs.',
          hint: 'Trace the four wires in order.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'By De Morgan, a NOR gate is equivalent to which basic gate with both inputs bubbled? (One word.)',
          answer: 'AND',
          explanation: 'NOT(a OR b) = (NOT a) AND (NOT b): a NOR behaves as an AND whose inputs are inverted.',
          hint: 'The second De Morgan identity.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'Why do CMOS standard-cell libraries favor NAND over AND?',
          options: [
            'NAND needs fewer transistors and has a faster pull-up structure; AND is NAND plus an inverter',
            'NAND gates use no PMOS transistors',
            'AND gates cannot be synthesized',
            'NAND outputs drive longer wires',
          ],
          answer: 'NAND needs fewer transistors and has a faster pull-up structure; AND is NAND plus an inverter',
          explanation:
            'A CMOS NAND uses 4 transistors with parallel PMOS pull-up; an AND is a NAND followed by an inverter (6 transistors). Synthesis therefore maps logic onto NAND/NOR structures.',
          hint: 'Count the extra inversion an AND needs.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Universal gate', definition: 'A gate (NAND or NOR) from which every Boolean function can be constructed.' },
      { term: 'Bubble pushing', definition: 'Redrawing gates via De Morgan so inversion bubbles move or cancel pairwise on wires.' },
      { term: 'Standard cell', definition: 'A pre-designed gate layout (NAND, NOR, flip-flop...) in a chip library; NAND cells are typically smallest and fastest.' },
      { term: 'Synthesis mapping', definition: 'The tool step that rewrites AND/OR logic into the library\'s preferred cells, usually NAND/NOR-based.' },
      { term: 'Active-low', definition: 'A signal asserted when it is 0, conventionally suffixed _n; its logic is full of bubbles.' },
    ],
    revisionSummary: [
      'NOT = NAND(a,a) = NOR(a,a): one gate each way.',
      'AND from NAND: 2 gates. OR from NAND: 3 gates. (Mirrored for NOR.)',
      'XOR from NAND: 4 gates — the classic interview circuit; trace all four rows.',
      'De Morgan: NAND = bubbled OR, NOR = bubbled AND; bubbles cancel pairwise on wires.',
      'CMOS economics make NAND the library favorite; synthesis speaks NAND/NOR fluently.',
      'Universal means possible, not optimal — minimization (Module 4) finds the cheap version.',
    ],
    furtherReading: [
      { label: 'Electronics Tutorials — Universal gates', url: 'https://www.electronics-tutorials.ws/logic/universal-gates.html', kind: 'article' },
      { label: 'Wikipedia — NAND logic', url: 'https://en.wikipedia.org/wiki/NAND_logic', kind: 'article' },
      { label: 'Wikipedia — NOR logic', url: 'https://en.wikipedia.org/wiki/NOR_logic', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'de-m03-l03',
    title: 'Gate Networks: Analysis by Tracing',
    summary:
      'Reading multi-gate circuits: forward tracing from inputs to output, reverse reasoning from a required output, and turning a network back into its truth table.',
    objectives: [
      'Trace a multi-gate network by labelling every wire for every input row.',
      'Derive the complete truth table of a network systematically (2^n rows).',
      'Reason backwards: find input values that force a required output.',
      'Recognize when a network computes a familiar block (here: a 2-to-1 multiplexer).',
    ],
    whyItMatters:
      'Before you can *design* circuits (Module 4 onward) you must *read* them fluently. Tracing is also the daily debugging method: when a board or simulation misbehaves, engineers walk a netlist with a probe, wire by wire, comparing each node against what the truth table says it must be. And the network in this lesson\'s example turns out to be a multiplexer — the exact block Module 5 formalizes.',
    prerequisites: ['de-m03-l01', 'de-m03-l02'],
    explanation:
      'A **gate network** (or combinational network) is gates wired so information flows from inputs to output with no loops. **Analysis** means recovering its truth table; the method is disciplined propagation:\n\n1. Name every intermediate wire (n1, n2, ...).\n2. Pick an input row (start with all zeros; walk through all 2^n rows).\n3. Evaluate gates whose inputs are known; write the value on their output wire.\n4. Repeat until the output is reached. An output is only believable when *every* row has been traced.\n\n### The worked network\n\n```\n       a ---+---[AND]--- n1 --+\n       b ---+                +---[OR]--- y\n       b --o[NOT]--- nb --+---[AND]--- n2 --+\n       c ---+              \n\n  netlist:  n1 = a AND b\n            nb = NOT b\n            n2 = nb AND c\n            y  = n1 OR n2\n```\n\nTracing all 8 rows yields the table below. Two things to notice:\n\n- When b = 1: n1 = a, n2 = 0, so y = a — the output *copies* a.\n- When b = 0: n1 = 0, n2 = c, so y = c — the output *copies* c.\n\nSo `y = ab + b\'c` means: **b selects which input (a or c) reaches y**. That is a 2-to-1 **multiplexer** with select = b — a major Module 5 block that you have just analyzed from scratch. Recognizing patterns like this is what makes netlists shrink in your head.\n\n### Reverse tracing\n\nForward tracing answers "what does it do?". Reverse tracing answers "what makes it do X?": to force y = 1 in the mux network, either n1 = 1 (requires a = 1 and b = 1) or n2 = 1 (requires b = 0 and c = 1). OR gates are satisfied by *any* path; AND gates require *all* their feeder conditions. This is exactly how engineers generate test vectors to detect stuck-at faults — and how you should attack "make this output 1" exam questions.',
    deepDive:
      '### Why loops are forbidden (for now)\n\nIf gate outputs feed back into earlier gates through pure combinational logic, the "truth table" may not exist: the circuit can oscillate or latch into a state that depends on analog details. Every legal combinational network is a **directed acyclic graph** from inputs to outputs. Memory (Module 6) reintroduces loops deliberately — but *through clocked storage*, which turns wild analog feedback into clean, discretized state. Keep the rule in your head: gates forward, state backward.\n\n### From network back to algebra, and forward again\n\nOnce you can write a netlist as an expression (`y = ab + b\'c`) and an expression as a netlist, the two representations become interchangeable. Module 4 adds the missing skill: making the expression *small*. The mux expression `ab + b\'c` is already minimal, but expressions like `ab + ab\'` collapse to `a` — and knowing when is the difference between a 6-gate circuit and a 2-gate one.',
    examples: [
      {
        title: 'Exhaustive trace of the mux-shaped network',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    printf("a b c | n1 nb n2 | y\\n");\n    printf("----------------------\\n");\n    for (int a = 0; a <= 1; a++)\n        for (int b = 0; b <= 1; b++)\n            for (int c = 0; c <= 1; c++) {\n                int n1 = a & b;        /* AND */\n                int nb = !b;           /* NOT */\n                int n2 = nb & c;       /* AND */\n                int y  = n1 | n2;      /* OR  */\n                printf("%d %d %d |  %d  %d  %d | %d\\n",\n                       a, b, c, n1, nb, n2, y);\n            }\n    return 0;\n}',
        explanation: [
          'The three nested loops enumerate all 2^3 input rows — for n inputs you must always produce 2^n rows, no shortcuts.',
          'Each variable n1, nb, n2 mirrors one gate output; printing them makes the propagation visible instead of guessing at y.',
          'Rows with b=1 show nb=0 so n2=0 and y=n1=a: the b=1 half of the table is the "copy a" half.',
          'Rows with b=0 show n1=0 and y=n2=c: the "copy c" half.',
          'The split behavior is the signature of a multiplexer — when you meet the mux truth table in Module 5, it will look exactly like this.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'The worked network, annotated for tracing',
        content:
          '   a, b, c = inputs\n\n   b --------[NOT g1]----- nb              g1 = NOT b\n\n   a --------+\n   b --------+---[AND g2]---- n1           g2 = a AND b\n\n   nb -------+\n   c --------+---[AND g3]---- n2           g3 = nb AND c\n\n   n1 -------+\n   n2 -------+---[OR  g4]---- y            g4 = n1 OR n2\n\n   expression: y = a*b + b\'*c   ->  2-to-1 mux, select = b\n\n   tracing order: g1 first (nb needed by g3), then g2, g3, then g4.',
        caption:
          'Always rewrite a messy drawing as an ordered netlist before tracing; then evaluate gates in an order that respects data flow.',
      },
    ],
    tables: [
      {
        caption: 'Complete trace: y = ab + b\'c (a 2-to-1 mux)',
        headers: ['a', 'b', 'c', 'n1 = ab', 'nb = b\'', 'n2 = b\'c', 'y'],
        rows: [
          ['0', '0', '0', '0', '1', '0', '0'],
          ['0', '0', '1', '0', '1', '1', '1'],
          ['0', '1', '0', '0', '0', '0', '0'],
          ['0', '1', '1', '0', '0', '0', '0'],
          ['1', '0', '0', '0', '1', '0', '0'],
          ['1', '0', '1', '0', '1', '1', '1'],
          ['1', '1', '0', '1', '0', '0', '1'],
          ['1', '1', '1', '1', '0', '0', '1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Tracing only the row that "obviously" matters and declaring victory.',
        fix:
          'One lucky row proves nothing: a network can agree on the row you tried and be wrong on three others. The acceptance test for analysis is the complete 2^n-row table.',
      },
      {
        mistake: 'Evaluating gates in drawing order instead of data-flow order.',
        fix:
          'A gate can only be evaluated when all its inputs are known. Order gates topologically: inputs first, then gates whose inputs are already labelled. In the example, nb must be computed before n2 even if NOT is drawn lower on the page.',
      },
      {
        mistake: 'Assuming inverted bubbles apply to the whole gate network.',
        fix:
          'A bubble inverts exactly one terminal of one gate. In the example, the NOT applies to wire b only; n2 = (NOT b) AND c, not NOT(b AND c). Misplaced bubbles are the most common tracing error.',
      },
    ],
    guidedPractice: {
      title: 'Trace a three-gate network end to end',
      brief:
        'Network: n1 = a XOR b; n2 = n1 AND a; y = n1 OR n2. Build the complete 4-row trace (2 inputs), state the expression for y, and simplify it by inspection: which rows make y = 1, and what simpler gate does y reduce to?',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    for (int a = 0; a <= 1; a++)\n        for (int b = 0; b <= 1; b++) {\n            int n1 = a ^ b;\n            int n2 = n1 & a;\n            int y  = n1 | n2;\n            printf("a=%d b=%d | n1=%d n2=%d | y=%d\\n", a, b, n1, n2, y);\n        }\n    return 0;\n}',
      expectedBehavior:
        'Rows: (0,0): n1=0, n2=0, y=0. (0,1): n1=1, n2=0, y=1. (1,0): n1=1, n2=0, y=1. (1,1): n1=0, n2=0, y=0. y = (a XOR b) OR ((a XOR b) AND a) = a XOR b — the OR with n2 adds nothing because n2=1 requires n1=1, which already forces y=1. y is just XOR.',
      hints: [
        'n2 = 1 needs n1 = 1 AND a = 1; check which row satisfies that.',
        'When X OR (X AND a) appears, the second term is redundant — absorption.',
        'The final table (0,1,1,0) is a familiar one: check it against the XOR column.',
      ],
    },
    practiceExercises: [
      {
        title: 'Reverse-trace the mux',
        brief:
          'For the network y = ab + b\'c: (a) list ALL input triples (a,b,c) that force y = 1; (b) find an input that forces y = 0 no matter what the remaining input is, and justify with the OR-gate structure.',
        expectedBehavior:
          '(a) y=1 on 001, 101, 110, 111 (b=1 with a=1, or b=0 with c=1). (b) No single input alone forces y=0 for all others — but a=0 with b=1 forces y=0 regardless of c (n1=0 since a=0; n2=0 since b=1), i.e. the pair (a=0, b=1) controls the output to 0.',
        hints: [
          'For (a), take each OR term separately: which rows satisfy ab? Which satisfy b\'c?',
          'For (b), look for a controlling value combination: what kills both AND terms simultaneously?',
        ],
      },
      {
        title: 'Two-level vs three-level counting',
        brief:
          'For the mux network (4 gates): state its *depth* (gates on the longest input-to-output path) and its *gate count*. Then argue from depth why changing c settles before or after changing b affects y.',
        expectedBehavior:
          'Depth 3: b -> NOT -> AND -> OR (the n2 path) is the longest; the n1 path is depth 2. Gate count 4. A change in b must pass through NOT, then AND, then OR (3 delays), while a change in c passes through AND, OR (2 delays) — so a late c-change can arrive at the OR before an earlier b-change has settled, producing a momentary wrong output (a glitch; analyzed properly in Module 8).',
        hints: [
          'Depth counts gates in series, not total gates.',
          'Compare path lengths: b\' path (NOT, AND, OR) vs a path (AND, OR) vs c path (AND, OR).',
          'Unequal path lengths to the same gate are the root cause of glitches.',
        ],
      },
    ],
    assessment: {
      title: 'Gate network tracing checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'In the network y = ab + b\'c, what is y for (a,b,c) = (1,0,1)?',
          options: ['0', '1', 'x', 'undefined'],
          answer: '1',
          explanation: 'b=0 makes b\'=1, so n2 = c = 1 and y = OR(0, 1) = 1. This is the mux selecting c.',
          hint: 'Which AND term can be 1 when b=0?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'The traced truth table of y = ab + b\'c is identical to which Module 5 block?',
          options: ['A 2-to-1 multiplexer with select b', 'A half adder', 'A decoder', 'An XNOR comparator'],
          answer: 'A 2-to-1 multiplexer with select b',
          explanation: 'b=1 copies a to y; b=0 copies c to y — precisely a 2:1 mux selecting between a (in) and c (in).',
          hint: 'One input chooses which of two others passes through.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A combinational network may contain a feedback loop as long as all gates are the same type.',
          answer: 'false',
          explanation:
            'Combinational networks must be loop-free (acyclic). Any pure-gate loop risks oscillation or uncontrolled latching; legal feedback goes through clocked memory elements.',
          hint: 'Think about what happens when the output feeds the input instantly.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'For a network with 4 inputs, how many rows must its complete truth table have? (Number.)',
          answer: '16',
          explanation: '2^4 = 16 rows; completeness means every row traced.',
          hint: '2^n.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'output-prediction',
          prompt: 'In the guided-practice network n1 = a XOR b; n2 = n1 AND a; y = n1 OR n2, what is y for (a,b) = (1,1)?',
          code: 'n1 = a ^ b;\nn2 = n1 & a;\ny  = n1 | n2;',
          options: ['0', '1', '2', 'x'],
          answer: '0',
          explanation: 'n1 = 1 XOR 1 = 0; n2 = 0 AND 1 = 0; y = 0 OR 0 = 0. The network reduces to plain XOR.',
          hint: 'Trace n1 first.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Gate network', definition: 'A loop-free interconnection of gates computing a combinational function.' },
      { term: 'Tracing', definition: 'Evaluating a network by propagating known values from inputs toward outputs, wire by wire.' },
      { term: 'Netlist', definition: 'An ordered textual list of gates and their connections — the traceable form of a schematic.' },
      { term: 'Depth', definition: 'The number of gates on the longest input-to-output path; a first-order proxy for delay.' },
      { term: 'Reverse tracing', definition: 'Reasoning from a required output backwards to find controlling input combinations.' },
      { term: 'Directed acyclic graph', definition: 'The mathematical form of every legal combinational network: arrows forward, no cycles.' },
    ],
    revisionSummary: [
      'Analysis protocol: name wires, enumerate all 2^n rows, evaluate in data-flow order.',
      'y = ab + b\'c is a 2:1 mux — recognize it; Module 5 formalizes it.',
      'Reverse tracing: OR satisfied by any path, AND requires all feeders.',
      'Combinational networks are acyclic; loops belong to clocked sequential logic.',
      'Depth (series gates) sets delay; unequal path depths cause glitches.',
      'Every network has three interchangeable forms: drawing, netlist, Boolean expression.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Combinational logic', url: 'https://en.wikipedia.org/wiki/Combinational_logic', kind: 'article' },
      { label: 'All About Circuits — Boolean algebra and combinational circuits', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-7/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'de-m03-l04',
    title: 'Gate Networks in Verilog: A Preview',
    summary:
      'Writing gate-level and dataflow Verilog for real networks: primitive instantiation, wire declarations, a complete worked module (the majority-of-three function), and how synthesis sees it.',
    objectives: [
      'Describe a gate network in structural Verilog using primitives and named wires.',
      'Rewrite the same network in dataflow style with assign statements.',
      'Check a combinational module against its truth table by hand.',
      'Predict what a synthesis tool would build from the module.',
    ],
    whyItMatters:
      'This lesson converts everything from Lessons 1-3 into the exact form the Verilog course uses daily. After it, gate networks stop being drawings and become modules you can write, read and hand to synthesis. The majority function used here is not a toy: it reappears inside carry-lookahead adders and as the carry logic of the ripple adder you will build in Module 5 and in the linked Verilog challenges.',
    prerequisites: ['de-m03-l03'],
    explanation:
      'Verilog offers two equivalent ways to describe the networks you can now trace:\n\n### Structural style: you draw the netlist in text\n\n```verilog\nmodule majority3_structural(\n    input  wire a,\n    input  wire b,\n    input  wire c,\n    output wire y\n);\n    wire ab, bc, ca;              // one wire per internal node\n\n    and g1 (ab, a, b);\n    and g2 (bc, b, c);\n    and g3 (ca, c, a);\n    or  g4 (y,  ab, bc, ca);\nendmodule\n```\n\nEvery line instantiates one gate: keyword, optional instance name, then **output first**, then inputs. The `wire` declarations name internal nodes exactly as in tracing. Ports come from the module header; internal wires must be declared.\n\n### Dataflow style: you state the equations\n\n```verilog\nmodule majority3_dataflow(\n    input  wire a,\n    input  wire b,\n    input  wire c,\n    output wire y\n);\n    assign y = (a & b) | (b & c) | (a & c);\nendmodule\n```\n\nEach `assign` is one continuous assignment — a wire permanently driven by an expression. Synthesis maps `&` to AND, `|` to OR, `^` to XOR, `~` to NOT.\n\n### Both describe the same hardware\n\nThe structural version names four gates; the dataflow version names one expression. A synthesis tool reading either produces the same optimized netlist (probably NAND-based, per Lesson 2). Choosing styles is a communication decision: structural is explicit and close to the schematic; dataflow is compact and close to the algebra. You will write both throughout the Verilog course.\n\n### The verification habit\n\nWhatever the style, the acceptance test is the same truth table you already know how to build. For majority3 the function is 1 when *two or more* inputs are 1 — rows 011, 101, 110, 111. Check the dataflow expression against each row; check the structural netlist by tracing. If a style is hard to verify by hand, that is a signal the *description* — not the hardware concept — is too clever.',
    deepDive:
      '### What synthesis actually sees\n\nFrom `assign y = (a & b) | (b & c) | (a & c);` a synthesis tool builds a small graph of operator nodes, optimizes it (shared terms, De Morgan rewrites), then maps it onto library cells: likely three NAND2 gates and one NOR3 with inverted inputs, or a single complex cell. It also computes the delays of Lesson 3\'s depth analysis. Two lines of Verilog that differ cosmetically can produce identical silicon; two that differ in *width* or *sensitivity* produce different silicon — which is why width discipline (Module 2) and complete specifications matter more than style.\n\n### Where gate-level thinking still earns its keep in RTL\n\nEven when you write behavioral RTL later, three habits from gate level transfer directly: (1) every wire has exactly one driver; (2) combinational outputs must not depend on anything but current inputs (no storage sneaking in); (3) depth is delay — the fewer series operators between input and output, the faster the path. The majority function\'s three parallel AND paths are depth-2; a chained version `(a & b) | ((a & c) | (b & c))` is still depth-2, but a *serial* formulation like ((a & b) & c) would compute something else entirely — always re-derive, never re-arrange blindly.',
    examples: [
      {
        title: 'Structural and dataflow majority, plus a trace table',
        language: 'verilog',
        code:
          '// Structural: the netlist, gate by gate.\nmodule majority3_structural(\n    input  wire a,\n    input  wire b,\n    input  wire c,\n    output wire y\n);\n    wire ab, bc, ca;\n\n    and g1 (ab, a,  b);\n    and g2 (bc, b,  c);\n    and g3 (ca, c,  a);\n    or  g4 (y,  ab, bc, ca);\nendmodule\n\n// Dataflow: the same function as one expression.\nmodule majority3_dataflow(\n    input  wire a,\n    input  wire b,\n    input  wire c,\n    output wire y\n);\n    assign y = (a & b) | (b & c) | (a & c);\nendmodule',
        explanation: [
          'Both modules expose identical ports (a, b, c in; y out), so either can replace the other in a larger design.',
          'Structural: `wire ab, bc, ca;` declares the three internal nodes; each `and` drives exactly one of them; the `or` collects all three.',
          'Dataflow: one continuous assignment; operator precedence in Verilog makes parentheses here for readability, and `&` binds tighter than `|` anyway.',
          'Verification rows: (0,1,1) -> bc=1 -> y=1; (1,0,1) -> ca=1 -> y=1; (1,1,0) -> ab=1 -> y=1; (0,0,1) -> all ANDs 0 -> y=0.',
          'In a real build these two modules would live in files the synthesis tool compiles together; here they document the two authoring styles side by side.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'majority3: from expression to gates to library cells',
        content:
          '  RTL text:        assign y = (a & b) | (b & c) | (a & c);\n\n  netlist:         a --+--(AND)-- ab --+\n                   b --+               |\n                                       +--(OR3)-- y\n                   b --+--(AND)-- bc --+\n                   c --+               |\n                   c --+--(AND)-- ca --+\n                   a --+\n\n  after synthesis (typical NAND mapping, educational sketch):\n\n       ab\'  bc\'  ca\' produced by NANDs, then a 3-input NOR:\n       y = NOR( ab\', bc\', ca\' ) = ab + bc + ca\n\n  depth of both versions: 2 series gates -> short path, no long carry chain.',
        caption:
          'One function, three artifacts: RTL expression, gate netlist, and the NAND-mapped cells synthesis prefers (educational sketch, not a specific tool\'s output).',
      },
    ],
    tables: [
      {
        caption: 'majority3 truth table — the verification target',
        headers: ['a', 'b', 'c', 'ab', 'bc', 'ca', 'y'],
        rows: [
          ['0', '0', '0', '0', '0', '0', '0'],
          ['0', '0', '1', '0', '0', '0', '0'],
          ['0', '1', '0', '0', '0', '0', '0'],
          ['0', '1', '1', '0', '1', '0', '1'],
          ['1', '0', '0', '0', '0', '0', '0'],
          ['1', '0', '1', '0', '0', '1', '1'],
          ['1', '1', '0', '1', '0', '0', '1'],
          ['1', '1', '1', '1', '1', '1', '1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Forgetting to declare internal wires in structural style.',
        fix:
          'Ports are declared in the header; every *internal* node needs its own `wire` declaration. An undeclared wire is a compile error in Verilog-2001 (or a one-bit default with warnings in loose tools) — declare first, instantiate second.',
      },
      {
        mistake: 'Putting the input before the output in a primitive instantiation.',
        fix:
          'Gate primitives take the output as the FIRST connection: `and g(ab, a, b)` drives ab from a, b. Reversing the order silently drives your input wire — a hard-to-spot bug that shows up as multiple-driver errors.',
      },
      {
        mistake: 'Confusing `&` (bitwise AND) with `&&` (logical AND) in Verilog.',
        fix:
          'In Verilog, `&` on single bits is the gate you want; `&&` treats operands as true/false values and also works on multi-bit vectors differently. On 1-bit wires they coincide numerically, but write `&` for logic you intend to synthesize as gates — the habit prevents bugs when widths grow.',
      },
    ],
    guidedPractice: {
      title: 'Write your own combinational module',
      brief:
        'Write a Verilog module `alert` with inputs `door`, `ignition`, `seatbelt` and output `y`, where y = 1 when the door is open AND the ignition is on, OR the seatbelt is unbuckled AND the ignition is on (treat unbuckled as seatbelt = 0, so the term is (~seatbelt & ignition)). Provide BOTH a dataflow version and a structural version with three gates or fewer. Verify rows (door,ignition,seatbelt) = (1,1,1) and (0,1,0).',
      starterCode:
        '// Dataflow version to complete:\nmodule alert(\n    input  wire door,\n    input  wire ignition,\n    input  wire seatbelt,\n    output wire y\n);\n    // y = (door & ignition) | (~seatbelt & ignition);\n    // TODO: write the assign, then simplify: y = ignition & (door | ~seatbelt)\n    assign y = ignition & (door | ~seatbelt);\nendmodule',
      expectedBehavior:
        'Dataflow: `assign y = (door & ignition) | (~seatbelt & ignition);` which simplifies to `assign y = ignition & (door | ~seatbelt);` (factoring ignition by the distributive law). Structural: one AND for (door | ~seatbelt) built from an OR plus a NOT, then a final AND with ignition — three gates total. Row (1,1,1): door|~seatbelt = 1|0 = 1, ignition=1 -> y=1. Row (0,1,0): 0|1 = 1, ignition=1 -> y=1.',
      hints: [
        'Both terms share the factor ignition — factor it out before drawing gates.',
        'A factored form is legal RTL precisely because it describes the same truth table.',
        'For the structural version, the OR gate inputs are door and NOT seatbelt.',
      ],
    },
    practiceExercises: [
      {
        title: 'Two styles, one function',
        brief:
          'The function y = a XOR b XOR c is the sum bit of a full adder (Module 5). Write it (a) in dataflow style with one assign, (b) structurally with two xor primitives chained through one internal wire. Verify row (1,1,1).',
        expectedBehavior:
          '(a) `assign y = a ^ b ^ c;` (associative, no parentheses needed). (b) `wire ab; xor g1(ab, a, b); xor g2(y, ab, c);`. Row (1,1,1): 1^1 = 0, 0^1 = 1 -> y = 1 (three inputs differ oddly: odd parity).',
        hints: [
          'XOR is associative, so the chain computes the same function as one 3-input xor primitive.',
          'Chained style needs one internal wire for the first gate\'s output.',
          'Odd number of 1s -> XOR result 1.',
        ],
      },
      {
        title: 'Read a netlist you did not write',
        brief:
          'Given: wire p, q; and g1(p, a, b); and g2(q, p, c); or g3(y, q, a); — write the Boolean expression for y, build its truth table, and name the familiar function it computes.',
        expectedBehavior:
          'p = ab; q = abc; y = abc + a. Since a=1 makes y=1 regardless (abc needs a=1 too), y = a. The network is just a wire from a — a good lesson in why redundant terms hide in netlists.',
        hints: [
          'Substitute gate by gate: q contains p.',
          'Then ask: which rows make y=1? Every row with a=1, plus rows with abc=1 — but abc=1 already has a=1.',
          'The absorption identity a + ab = a does the simplification.',
        ],
      },
    ],
    assessment: {
      title: 'Verilog gate networks checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In structural Verilog, what is the correct instantiation of an AND gate driving wire ab from inputs a and b?',
          options: ['and g1 (ab, a, b);', 'and g1 (a, b, ab);', 'assign and ab = a, b;', 'gate and (a, b) -> ab;'],
          answer: 'and g1 (ab, a, b);',
          explanation: 'Gate primitives list the output first, then the inputs; the instance name is optional but recommended.',
          hint: 'Output first.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'The structural and dataflow versions of majority3 synthesize to equivalent hardware.',
          answer: 'true',
          explanation:
            'They describe the same truth table through different authoring styles; synthesis optimizes both to the same (or equivalent) netlist.',
          hint: 'Style is for humans; the function is for silicon.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'What is y in majority3_dataflow for (a,b,c) = (0,1,1)?',
          code: 'assign y = (a & b) | (b & c) | (a & c);',
          options: ['0', '1', 'x', 'z'],
          answer: '1',
          explanation: 'b & c = 1 & 1 = 1, so y = 1. Two inputs are high, satisfying the majority.',
          hint: 'Find any AND term that equals 1.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What Verilog keyword declares an internal node wire in a module body? (One word.)',
          answer: 'wire',
          explanation: 'Internal nets are declared with `wire`; they need no values assigned at declaration, only drivers.',
          hint: 'It is also the port type keyword.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'A colleague writes y = ((a & b) & c) intending majority-of-three. What is actually described?',
          options: [
            'a AND b AND c — 1 only when all three are high',
            'The majority function',
            'A syntax error',
            'An XOR of the three inputs',
          ],
          answer: 'a AND b AND c — 1 only when all three are high',
          explanation:
            'Serial ANDs require every input high; majority requires only two. The truth tables differ on rows 011, 101, 110 — re-deriving the table catches the error instantly.',
          hint: 'Compare the all-ones row and the two-ones rows.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Structural style', definition: 'Describing hardware by instantiating gates (or modules) and wiring them explicitly.' },
      { term: 'Dataflow style', definition: 'Describing hardware with continuous assignments (`assign`) of Boolean expressions to wires.' },
      { term: 'Gate primitive', definition: 'A built-in Verilog gate (and, or, not, nand, nor, xor, xnor) instantiated like a component.' },
      { term: 'Port', definition: 'A named input or output connection of a module; the module\'s interface.' },
      { term: 'One driver per wire', definition: 'The netlist rule that each wire is driven by exactly one gate or assign — multiple drivers are contention.' },
    ],
    revisionSummary: [
      'Structural = netlist in text: declare wires, instantiate gates output-first.',
      'Dataflow = equations: one assign per driven wire.',
      'Both styles converge to the same synthesized netlist; pick per readability.',
      'Verification is style-independent: check the complete truth table.',
      'Serial AND is not majority — re-derive tables, never re-arrange expressions blindly.',
      'This module (majority3) returns as carry logic inside adders in Module 5 and the Verilog challenges.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
      { label: 'All About Circuits — Introduction to Verilog', url: 'https://www.allaboutcircuits.com/technical-articles/introduction-to-verilog/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
];
