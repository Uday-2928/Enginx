import type { TutorialLesson } from '../types';

export const module05Lessons: TutorialLesson[] = [
  {
    id: 'de-m05-l01',
    title: 'Adders: Half, Full, and Ripple-Carry',
    summary:
      'The arithmetic engine of every processor: half adder, full adder, the 8-row specification, ripple-carry construction, subtractor variants, and the XOR-trick adder/subtractor.',
    objectives: [
      'Derive the half adder equations S = a XOR b and C = a AND b from its truth table.',
      'Design a full adder from its 8-row truth table and express it two ways.',
      'Chain full adders into an n-bit ripple-carry adder and explain its delay growth.',
      'Modify the same hardware into a subtractor (and adder/subtractor) with XORs and the carry-in.',
    ],
    whyItMatters:
      'Addition is the most-executed operation in computing — addresses, loop counters, DSP sums all reduce to it. The full adder is also the classic interview design problem and the first circuit where specification -> truth table -> K-map -> gates -> Verilog flows end to end. Two EnginX Verilog challenges (half adder, ripple-carry adder) are linked directly to this lesson.',
    prerequisites: ['de-m03-l04', 'de-m04-l02'],
    explanation:
      '### Half adder: two bits, no carry-in\n\nAdding two bits a and b produces a sum bit and a carry bit:\n\n```\n a b | S C\n 0 0 | 0 0\n 0 1 | 1 0\n 1 0 | 1 0\n 1 1 | 0 1\n```\n\nRead the columns: S is 1 when the inputs *differ* (XOR), C is 1 when *both* are 1 (AND):\n\n```\nS = a XOR b        C = a AND b\n```\n\nTwo gates. That is the entire half adder — and it is the exact circuit of the linked Verilog challenge.\n\n### Full adder: the real column of a multi-bit adder\n\nColumns of a multi-bit addition receive a **carry-in** from the right. The full adder adds three bits:\n\n```\n a b cin | S Cout\n 0 0  0  | 0  0\n 0 0  1  | 1  0\n 0 1  0  | 1  0\n 0 1  1  | 0  1\n 1 0  0  | 1  0\n 1 0  1  | 0  1\n 1 1  0  | 0  1\n 1 1  1  | 1  1\n```\n\nSum is 1 on an *odd* number of ones -> `S = a XOR b XOR cin`. Carry-out is 1 when at least two inputs are 1 -> the majority function from Module 3:\n\n```\nCout = ab + bcin + acin  =  ab + cin(a XOR b)\n```\n\nThe second form is elegant: either the two top bits generate a carry alone, or exactly one of them does and cin promotes it.\n\n### Ripple-carry: n columns chained\n\nChain n full adders, each carry-out feeding the next carry-in, and you can add n-bit numbers:\n\n```\ncin -> FA0 -> FA1 -> FA2 -> FA3 -> cout\n```\n\nThe catch is time: FA3 cannot finish until FA2\'s carry arrives, which waited on FA1, which waited on FA0. Worst case (1111 + 0001) the carry ripples through all n stages, so delay grows *linearly* with width. Faster structures (carry-lookahead) precompute carries in parallel — the classic upgrade you will meet in the VLSI track.\n\n### Subtraction with the same hardware\n\nFrom Module 2: subtracting b means adding the two\'s complement of b, which is NOT(b) + 1. So XOR every bit of b with a **mode** line (mode = 1 for subtract: inverts b; mode = 0 for add: passes b), and feed mode into the first carry-in to supply the +1:\n\n```\nbi_effective = b_i XOR mode        carry_in_0 = mode\nmode=0:  a + b            mode=1:  a + NOT(b) + 1 = a - b\n```\n\nOne adder, two operations. The final carry-out reads as "no borrow" when subtracting.',
    deepDive:
      '### Counting the delay honestly\n\nEach full adder has two delay figures that matter: t_cq-style input-to-sum delay and the *carry-in to carry-out* delay (usually the longer, since the carry path is the critical one). A 4-bit ripple adder\'s worst-case path is roughly one XOR (a XOR b) plus four carry stages. For 32 bits, that linear chain is why real ALUs use carry-lookahead (compute generate/propagate per nibble, then carries in log depth) or carry-select (two precomputed halves, mux the right one). The mux you meet next lesson is literally the fix for the delay you just built.\n\n### Overflow, one more time\n\nFor *unsigned* addition the carry-out is the story. For *signed* two\'s-complement addition, overflow is `carry into MSB != carry out of MSB` (Module 2). A production ALU computes both flags from the same hardware: cout of bit n-1, and cout of bit n-2 (the carry into the MSB). The XOR of those two is the V flag. Notice that nothing new is computed — flags are just *taps* on existing carry wires.\n\n### Half subtractor and full subtractor\n\nMirror the adders: half subtractor D = a XOR b, Borrow = a\'b. Full subtractor: D = a XOR b XOR bin (identical to the adder\'s sum!), and Bout = a\'b + bin(a XNOR b) — note the XNOR: a "propagate" for borrow happens when a and b are *equal* (a borrow passes through untouched), whereas the adder\'s carry propagates when they *differ*. Comparing the two side by side is a favorite exam question because the symmetry is easy to get backwards.',
    examples: [
      {
        title: 'Full adder in Verilog (dataflow), and the 4-bit ripple chain (structural)',
        language: 'verilog',
        code:
          '// One column: the full adder.\nmodule full_adder(\n    input  wire a,\n    input  wire b,\n    input  wire cin,\n    output wire sum,\n    output wire cout\n);\n    assign sum  = a ^ b ^ cin;\n    assign cout = (a & b) | (cin & (a ^ b));\nendmodule\n\n// Four columns chained: the ripple-carry adder.\nmodule ripple_adder4(\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    input  wire       cin,\n    output wire [3:0] sum,\n    output wire       cout\n);\n    wire c1, c2, c3;   // the carry chain\n\n    full_adder fa0 (.a(a[0]), .b(b[0]), .cin(cin), .sum(sum[0]), .cout(c1));\n    full_adder fa1 (.a(a[1]), .b(b[1]), .cin(c1),  .sum(sum[1]), .cout(c2));\n    full_adder fa2 (.a(a[2]), .b(b[2]), .cin(c2),  .sum(sum[2]), .cout(c3));\n    full_adder fa3 (.a(a[3]), .b(b[3]), .cin(c3),  .sum(sum[3]), .cout(cout));\nendmodule',
        explanation: [
          '`sum = a ^ b ^ cin` is the odd-parity rule from the truth table\'s sum column — three inputs, XOR is associative.',
          '`cout = (a & b) | (cin & (a ^ b))` is the majority form: generate term plus promoted propagate term.',
          'The chain module declares the carry wires explicitly; each full_adder instance connects one named carry, making the ripple visible in the source.',
          'Named port connections (`.a(a[0])`) avoid positional mistakes — the habit the Verilog course enforces.',
          'Reading fa0..fa3 top to bottom is *not* an execution order: all four exist concurrently, and only the carry wiring creates the delay dependency.',
        ],
      },
      {
        title: 'The adder/subtractor: mode-controlled XOR trick',
        language: 'verilog',
        code:
          'module addsub4(\n    input  wire       mode,   // 0 = add, 1 = subtract\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    output wire [3:0] result,\n    output wire       cout,\n    output wire       overflow\n);\n    wire [3:0] b_eff;\n    wire c1, c2, c3;\n\n    // XOR trick: subtract means add the two\'s complement of b.\n    assign b_eff = b ^ {4{mode}};   // invert every bit when mode=1\n\n    full_adder fa0 (.a(a[0]), .b(b_eff[0]), .cin(mode), .sum(result[0]), .cout(c1));\n    full_adder fa1 (.a(a[1]), .b(b_eff[1]), .cin(c1),   .sum(result[1]), .cout(c2));\n    full_adder fa2 (.a(a[2]), .b(b_eff[2]), .cin(c2),   .sum(result[2]), .cout(c3));\n    full_adder fa3 (.a(a[3]), .b(b_eff[3]), .cin(c3),   .sum(result[3]), .cout(cout));\n\n    // Signed overflow: carry INTO the MSB differs from carry OUT of it.\n    assign overflow = c3 ^ cout;\nendmodule',
        explanation: [
          '`b ^ {4{mode}}` replicates mode to 4 bits and XORs: mode=1 flips every bit of b, exactly NOT(b).',
          'Feeding `mode` into cin adds the missing +1 of the two\'s complement: a + NOT(b) + 1 = a - b.',
          'When mode=0 the XOR passes b unchanged and cin=0 — the module is a plain adder.',
          '`overflow = c3 ^ cout` taps the two carries the Module 2 lesson defined: differing carries means signed wrap.',
          'This is the canonical "one datapath, two operations" pattern that ALUs generalize.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'From half adder to ripple-carry adder',
        content:
          '  HALF ADDER                 FULL ADDER\n\n   a --+--[XOR]-- S            a --+\n   b --+           |            b --+--[XOR]--+--[XOR]-- S\n       +--[AND]-- C|            cin --+        |\n                   |                +--[AND]--+--[AND]-- Cout\n                (C = ab)               (maj of a, b, cin)\n\n  RIPPLE-CARRY 4-BIT:\n\n   a3 b3      a2 b2      a1 b1      a0 b0\n    | |        | |        | |        | |\n    v v        v v        v v        v v\n  +------+   +------+   +------+   +------+\n  | FA3  |<-c2-FA2  |<-c1-FA1  |<-c0-FA0  |<- cin (0 for add)\n  +--+---+   +--+---+   +--+---+   +--+---+\n     |          |          |          |\n    sum3       sum2       sum1       sum0\n     |\n    cout',
        caption:
          'The half adder builds intuition; the full adder is the real column; chaining columns trades delay for width.',
      },
    ],
    tables: [
      {
        caption: 'Full adder truth table (complete)',
        headers: ['a', 'b', 'cin', 'sum', 'cout'],
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
        caption: 'Adder vs subtractor key equations',
        headers: ['Circuit', 'Primary output', 'Secondary output'],
        rows: [
          ['Half adder', 'S = a XOR b', 'C = a AND b'],
          ['Full adder', 'S = a XOR b XOR cin', 'Cout = ab + cin(a XOR b)'],
          ['Full subtractor', 'D = a XOR b XOR bin', "Bout = a'b + bin(a XNOR b)"],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing Cout = a XOR b XOR cin (copying the sum expression).',
        fix:
          'Sum is odd-parity (XOR); carry is majority (at least two ones). Check with row a=1,b=0,cin=0: sum=1 but cout=0 — XOR would wrongly give cout=1.',
      },
      {
        mistake: 'Forgetting the +1 when converting an adder to a subtractor.',
        fix:
          'Inverting b alone computes a + NOT(b) = a - b - 1. The first carry-in must be tied to mode to add the missing 1. A subtractor that is off by one almost always forgot cin = mode.',
      },
      {
        mistake: 'Assuming all four full adders "run in order" because the Verilog lists fa0 first.',
        fix:
          'The instances are concurrent hardware; the listing order is documentation. What creates sequence is the *carry wiring*: fa3\'s inputs are only valid after the chain settles.',
      },
    ],
    guidedPractice: {
      title: 'Design the full adder from scratch',
      brief:
        'Fill the 8-row full-adder truth table from the addition rule, derive S and Cout as sums of minterms, minimize Cout on a 3-variable K-map, and confirm the result matches the majority form. Then predict the module outputs for a=1, b=1, cin=0.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    int ok = 1;\n    for (int a = 0; a <= 1; a++)\n        for (int b = 0; b <= 1; b++)\n            for (int cin = 0; cin <= 1; cin++) {\n                int total = a + b + cin;\n                int s_ref = total & 1;            /* reference from arithmetic */\n                int c_ref = (total >= 2) ? 1 : 0;\n\n                int s  = a ^ b ^ cin;             /* your equations */\n                int co = (a & b) | (cin & (a ^ b));\n\n                if (s != s_ref || co != c_ref) ok = 0;\n                printf("a=%d b=%d cin=%d -> S=%d Cout=%d\\n", a, b, cin, s, co);\n            }\n    printf("equations match all 8 rows: %s\\n", ok ? "YES" : "NO");\n    return 0;\n}',
      expectedBehavior:
        'S = a XOR b XOR cin; the K-map of Cout groups (ab), (b cin), (a cin) into the majority form ab + b cin + a cin, equal to ab + cin(a XOR b). For a=1,b=1,cin=0: S=0, Cout=1 (1+1=10). The sweep prints YES.',
      hints: [
        'The K-map groups for Cout are the three pairs of rows with two ones — diagonal-free straight pairs.',
        'Verify the equivalence: cin(a XOR b) covers rows 011 and 101; ab covers 110 and 111.',
        'The reference total = a + b + cin makes the check independent of your equations.',
      ],
    },
    practiceExercises: [
      {
        title: 'Build and test the half adder in Verilog',
        brief:
          'Write module half_adder(input a, b, output sum, carry) with two continuous assignments. Verify against the 4-row truth table by hand, then state what the module computes for a=1,b=1.',
        expectedBehavior:
          'assign sum = a ^ b; assign carry = a & b;. For a=1,b=1: sum=0, carry=1 (binary 10 = two).',
        hints: [
          'One XOR and one AND — nothing more.',
          'The row a=1,b=1 is the only carry row.',
          'This is the exact interface of the linked challenge; match the port names exactly.',
        ],
        challengeId: 'ece-04-half-adder',
      },
      {
        title: 'Trace a ripple through the worst case',
        brief:
          'For the 4-bit ripple adder computing 1111 + 0001: list the sum and carry-out of each FA stage in order, and state the final 5-bit result and why this input maximizes delay.',
        expectedBehavior:
          'With a = 1111, b = 0001: FA0: 1+1+0 -> S0=0, c1=1. FA1: 1+0+1 -> S1=0, c2=1. FA2: 1+0+1 -> S2=0, c3=1. FA3: 1+0+1 -> S3=0, cout=1. Final result 10000 = 16 (15+1): the carry traverses every stage, which is exactly why this input maximizes ripple delay.',
        hints: [
          'b = 0001 means only bit 0 of b is 1; bits 1-3 of a are the ones that carry.',
          'Each FAi (i>=1) sees a=1, b=0, cin=1: sum 0, carry 1.',
          'Count the stages the carry traverses: all four.',
        ],
        challengeId: 'ece-01-ripple-carry-adder',
      },
      {
        title: 'Full subtractor by symmetry',
        brief:
          'Design a full subtractor (inputs a, b, bin; outputs D, Bout): write its 8-row table, derive D and Bout, and state the one structural difference from the full adder.',
        expectedBehavior:
          'D = a XOR b XOR bin (identical to the adder). Bout = a\'b + a\'bin + b·bin = a\'b + bin·(a XNOR b). The difference: generate term a\'b (borrow when a < b) and the propagate term uses XNOR — a borrow passes when a equals b, while a carry propagates when a and b differ.',
        hints: [
          'Rows: 001 -> D=1,Bout=1; 010 -> 1,1; 011 -> 0,1; 111 -> 1,1; the rest Bout=0.',
          'K-map Bout: group a\'b (rows 010,011) and bin·(a XNOR b) (rows 001, 111).',
          'Compare generate/propagate with the adder form ab + cin(a XOR b).',
        ],
      },
    ],
    assessment: {
      title: 'Adders checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'A full adder has a=1, b=1, cin=1. What are sum and cout?',
          options: ['sum=1, cout=1', 'sum=1, cout=0', 'sum=0, cout=1', 'sum=0, cout=0'],
          answer: 'sum=1, cout=1',
          explanation: '1+1+1 = 3 = 11 in binary: sum 1, carry 1. The only row where all three inputs are high.',
          hint: 'Three ones make binary 11.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which expression correctly computes full-adder carry-out?',
          options: ['ab + cin(a XOR b)', 'a XOR b XOR cin', "a'b + cin", 'a + b + cin'],
          answer: 'ab + cin(a XOR b)',
          explanation: 'Generate (both high) or propagate (exactly one high) promoted by cin. The XOR triple is the SUM, not the carry.',
          hint: 'Carry needs at least two ones — majority, not parity.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A 32-bit ripple-carry adder is roughly eight times slower than an 8-bit one in the worst case.',
          answer: 'false',
          explanation:
            'Ripple delay grows linearly with width, so the factor is 32/8 = 4, not 8. Four times slower — linear, but not as bad as eight.',
          hint: 'Compute 32/8.',
          difficulty: 'hard',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'In the adder/subtractor, what value must the first carry-in take when mode=1 (subtract)? (0 or 1.)',
          answer: '1',
          explanation: 'cin=1 completes a + NOT(b) + 1, the two\'s complement of b. Without it the result is a - b - 1.',
          hint: 'The +1 of invert-and-add-one.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'Signed overflow of an n-bit adder is detected by XORing which two signals?',
          options: [
            'Carry into the MSB stage and carry out of it',
            'The MSB and LSB of the result',
            'Sum and cout of the last stage',
            'mode and cin',
          ],
          answer: 'Carry into the MSB stage and carry out of it',
          explanation: 'Differing carries at the MSB mean the sign bit was clobbered — the V flag of Module 2.',
          hint: 'Both taps already exist on the carry chain.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Half adder', definition: 'Adds two bits: S = a XOR b, C = a AND b; no carry-in.' },
      { term: 'Full adder', definition: 'Adds three bits (a, b, cin): S = a XOR b XOR cin, Cout = ab + cin(a XOR b).' },
      { term: 'Ripple-carry adder', definition: 'n full adders chained through carries; delay grows linearly with width.' },
      { term: 'Generate / propagate', definition: 'Carry terms: generate = ab (carry created regardless of cin); propagate = a XOR b (carry passed when cin arrives).' },
      { term: 'Adder/subtractor', definition: 'One adder plus XORs on b and cin=mode, computing a+b or a-b in the same hardware.' },
      { term: 'Overflow flag (V)', definition: 'XOR of the carry into and out of the MSB stage; signals signed two\'s-complement wrap.' },
    ],
    revisionSummary: [
      'Half adder: S = a XOR b, C = a AND b — two gates.',
      'Full adder: sum is odd-parity, carry is majority; both derivable from the 8-row table.',
      'Ripple-carry chains full adders; worst-case delay is linear in width (carry crosses every stage).',
      'Subtraction = addition of the complement: XOR b with mode, cin = mode.',
      'Overflow = carry-in(MSB) XOR carry-out(MSB); both flags tap existing wires.',
      'Full subtractor mirrors the adder with generate a\'b and propagate (a XNOR b).',
    ],
    furtherReading: [
      { label: 'Wikipedia — Adder (electronics)', url: 'https://en.wikipedia.org/wiki/Adder_(electronics)', kind: 'article' },
      { label: 'Wikipedia — Carry-lookahead adder', url: 'https://en.wikipedia.org/wiki/Carry-lookahead_adder', kind: 'article' },
      { label: 'All About Circuits — Binary adders', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-9/binary-adders/', kind: 'docs' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'de-m05-l02',
    title: 'Multiplexers and Demultiplexers',
    summary:
      'The data-routing blocks: 2-to-1 and 4-to-1 multiplexers, their truth tables and equations, building big muxes from small ones, demultiplexers, and why the mux is the swiss army knife of datapaths.',
    objectives: [
      'Specify a 2:1 mux with its 8-row table and equation y = sel\'a + sel·b.',
      'Build 4:1 and larger muxes from 2:1 muxes, and read select encoding.',
      'Design a demultiplexer (one input, routed to one of 2^n outputs).',
      'Use a mux as a universal logic element (implementing arbitrary functions).',
    ],
    whyItMatters:
      'Every "choose between" in hardware is a mux: ALU operation selection, register file read ports, bus steering, clock/data path selection, even implementing any Boolean function (a mux is a universal gate like NAND). The linked Verilog challenge asks you to build the 2:1 mux — the most instantiated block in most RTL libraries.',
    prerequisites: ['de-m03-l03', 'de-m04-l02'],
    explanation:
      'A **multiplexer** (mux) forwards one of 2^n data inputs to a single output, chosen by an n-bit **select**. The 2:1 mux is the atom:\n\n```\n sel a b | y\n  0   x 0 | 0      (b not selected)\n  0   1 0 | 0\n  0   x 1 | 1\n  0   1 1 | 1\n  1   0 x | 0\n  1   1 x | 1\n```\n\nMore compactly with the select column first (all 8 combinations of sel,a,b):\n\n```\n sel a b | y        equation:  y = sel\'*a + sel*b\n  0  0 0 | 0                   (in C: y = sel ? b : a)\n  0  0 1 | 0\n  0  1 0 | 1\n  0  1 1 | 1\n  1  0 0 | 0\n  1  0 1 | 1\n  1  1 0 | 0\n  1  1 1 | 1\n```\n\nYou already analyzed this network in Module 3 (y = ab + b\'c with select b): an AND-OR pair — or, in gate form, NOT sel, two ANDs, one OR. Its transistor cost is why synthesis turns `?:` expressions into mux cells eagerly.\n\n### Bigger muxes from smaller ones\n\nA 4:1 mux (select s1 s0, data d0..d3, y = d[sel]) is three 2:1 muxes:\n\n```\n d0 --+\n d1 --[2:1]-- sel=s0 --+\n                        +--[2:1]-- sel=s1 -- y\n d2 --+                 |\n d3 --[2:1]-- sel=s0 --+\n```\n\nThe first layer picks between (d0,d1) and between (d2,d3) using s0; the second picks between the two results using s1. n select bits need 2^n - 1 two-input muxes in a tree. The same expansion in RTL is often one line: `assign y = d[sel];` — synthesis builds the tree for you.\n\n### Demultiplexer: the mirror image\n\nA **demultiplexer** (demux) sends its single input to one of 2^n outputs (others held 0):\n\n```\n1:2 demux:  y0 = din * sel\'      y1 = din * sel\n```\n\nA decoder with an enable *is* a demux (data into the enable pin) — Module 5 lesson 3 makes that correspondence explicit.\n\n### Mux as universal logic\n\nFix the select inputs to your function\'s variables and drive the data pins with constants or literals: a 4:1 mux with select (a,b) and data pins implementing f\'s truth-table column implements any 2-variable function; an 8:1 mux implements any 3-variable function; and cleverly, a 4:1 mux plus one inverter implements any 3-variable function (residual-variable trick). FPGA lookup tables are exactly this idea scaled to 6 inputs — a mux tree over a truth table.',
    deepDive:
      '### Muxes in real datapaths\n\nOpen any CPU block diagram and count the muxes: ALU input selection (register vs immediate), write-back source (ALU vs memory), next-PC selection (sequential vs branch target), register-file read steering. The "control" logic of a processor is largely *select signals* computed by an FSM — Modules 6-7 build exactly those FSMs. When you later write `always @(*)` case statements in Verilog, the synthesis tool is building mux trees; understanding the gate-level equivalent keeps your RTL predictable.\n\n### Timing and the mux\'s hidden cost\n\nA mux adds one gate delay to the selected path, but wide mux trees add log2(paths) delays — and every select line is a *shared* high-fanout signal that must arrive before the data. In timing terms (Module 8), the select is part of the setup path. A classic bug: data arrives before select settles, and the output briefly passes the *wrong* value — a glitch indistinguishable from a real one at the next register unless the register clocks after everything settles.',
    examples: [
      {
        title: '2:1 mux — dataflow and behavioral Verilog',
        language: 'verilog',
        code:
          '// Dataflow: the equation itself.\nmodule mux2to1_dataflow(\n    input  wire a,     // selected when sel = 0\n    input  wire b,     // selected when sel = 1\n    input  wire sel,\n    output wire y\n);\n    assign y = sel ? b : a;          // same as: (sel & b) | (~sel & a)\nendmodule\n\n// Behavioral: selection written as a case (synthesizes to the same mux).\nmodule mux2to1_behavioral(\n    input  wire a,\n    input  wire b,\n    input  wire sel,\n    output reg  y\n);\n    always @(*) begin\n        case (sel)\n            1\'b0: y = a;\n            default: y = b;          // 1\'b1\n        endcase\n    end\nendmodule',
        explanation: [
          'The ternary `sel ? b : a` is the mux in one token sequence; synthesis maps it to a mux cell or AND-OR gates.',
          'The commented AND-OR form is the gate-level equation from the truth table — all three writings describe identical hardware.',
          'The behavioral version must declare y as `reg` (procedural assignment) even though the result is pure combinational logic — `reg` here means "assigned in an always block", not "flip-flop".',
          '`always @(*)` recomputes whenever any right-hand signal changes, matching continuous hardware behavior.',
          'A complete case (both select values) is essential: an incomplete one would infer a latch — the bug Module 6 warns about.',
        ],
      },
      {
        title: '4:1 mux from three 2:1 muxes (structural)',
        language: 'verilog',
        code:
          'module mux2to1(\n    input  wire a,\n    input  wire b,\n    input  wire sel,\n    output wire y\n);\n    assign y = sel ? b : a;\nendmodule\n\nmodule mux4to1_structural(\n    input  wire [3:0] d,     // d[sel] is forwarded\n    input  wire [1:0] sel,\n    output wire y\n);\n    wire low, high;\n\n    mux2to1 m0 (.a(d[0]), .b(d[1]), .sel(sel[0]), .y(low));\n    mux2to1 m1 (.a(d[2]), .b(d[3]), .sel(sel[0]), .y(high));\n    mux2to1 m2 (.a(low),  .b(high), .sel(sel[1]), .y(y));\nendmodule',
        explanation: [
          'Layer one: sel[0] chooses within each pair (d0/d1 and d2/d3).',
          'Layer two: sel[1] chooses between the pair winners — exactly the tree diagram.',
          'Two select bits address four inputs; in general n bits address 2^n inputs with 2^n - 1 two-input muxes.',
          'The instance order is irrelevant to behavior, but naming (low/high) documents the dataflow for the next reader.',
          'Depth is 2 mux delays; a flat 16:1 mux would also be depth 4 in this tree style — logarithmic growth is the tree\'s virtue.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Mux tree and demux mirror',
        content:
          '  4:1 MULTIPLEXER (3 x 2:1)              1:4 DEMULTIPLEXER\n\n   d0 --+\n   d1 --[MUX]-- s0 -- low --+\n                             +--[MUX]-- s1 -- y       din --+--[AND]-- y0 (sel=00)\n   d2 --+                    |                              |\n   d3 --[MUX]-- s0 -- high --+                    sel=00 --[AND]-- y1\n                                                          ...\n   select 00 -> y=d0   01 -> d1                    exactly one output\n   select 10 -> y=d2   11 -> d3                    carries din; rest are 0',
        caption:
          'Muxes funnel many sources into one wire; demuxes fan one wire out. Decoders (next lesson) are demuxes with din tied high.',
      },
    ],
    tables: [
      {
        caption: '2:1 mux — complete 8-row table',
        headers: ['sel', 'a', 'b', 'y'],
        rows: [
          ['0', '0', '0', '0'],
          ['0', '0', '1', '0'],
          ['0', '1', '0', '1'],
          ['0', '1', '1', '1'],
          ['1', '0', '0', '0'],
          ['1', '0', '1', '1'],
          ['1', '1', '0', '0'],
          ['1', '1', '1', '1'],
        ],
      },
      {
        caption: '1:4 demultiplexer (din routed by sel)',
        headers: ['sel1', 'sel0', 'y0', 'y1', 'y2', 'y3'],
        rows: [
          ['0', '0', 'din', '0', '0', '0'],
          ['0', '1', '0', 'din', '0', '0'],
          ['1', '0', '0', '0', 'din', '0'],
          ['1', '1', '0', '0', '0', 'din'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Swapping the mux arms: writing y = sel ? a : b.',
        fix:
          'Decide and document the convention (here: sel=1 forwards b) and check one row — sel=1 with a=1,b=0 must give y=0. The linked challenge tests exactly this ordering.',
      },
      {
        mistake: 'Writing an incomplete case in a combinational always block.',
        fix:
          'Every select value must assign y, or the block holds its old value — inferring a latch. Cover all cases or add a default; for full safety assign a default first, then override.',
      },
      {
        mistake: 'Assuming unselected mux inputs are ignored instantaneously.',
        fix:
          'A mux output is a *combinational* function: while select changes, the output can glitch through values of both arms. Sampling registers must wait for the select to settle (Module 8 timing), not just the data.',
      },
    ],
    guidedPractice: {
      title: 'Mux as a function generator',
      brief:
        'Implement f(a,b,c) = a\'b + ac\' using ONE 4:1 mux: wire (a,b) to the select, and determine the constant/inverter value needed on each data input. Verify all 8 rows.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    /* f = a\'b + ac\' with (a,b) on the mux select and c as residual.\n       dsel codes: 0 -> constant 0, 1 -> constant 1, 2 -> NOT c */\n    int f_data[4];\n    f_data[0] = 0;   /* (a,b)=(0,0): a\'b=0 and ac\'=0  -> constant 0 */\n    f_data[1] = 1;   /* (a,b)=(0,1): a\'b=1             -> constant 1 */\n    f_data[2] = 2;   /* (a,b)=(1,0): ac\' = c\'          -> NOT c      */\n    f_data[3] = 2;   /* (a,b)=(1,1): a\'b=0, ac\'=c\'     -> NOT c      */\n\n    int ok = 1;\n    for (int m = 0; m < 8; m++) {\n        int a = (m >> 2) & 1, b = (m >> 1) & 1, c = m & 1;\n        int f_ref = (!a & b) | (a & !c);\n        int dsel = f_data[a * 2 + b];\n        int f_mux = (dsel == 2) ? !c : dsel;\n        if (f_ref != f_mux) ok = 0;\n    }\n    printf("mux implements f on all 8 rows: %s\\n", ok ? "YES" : "NO");\n    return 0;\n}',
      expectedBehavior:
        'Data pins: d0 = constant 0, d1 = constant 1, d2 = NOT c, d3 = NOT c. Rows (0,0) and (1,1) both reduce to a pure function of c; row (0,1) is the a\'b term firing regardless of c. One 4:1 mux plus one inverter implements f exactly, and the sweep prints YES on all 8 rows.',
      hints: [
        'Rewrite f as a truth-table column indexed by (a,b): each select pair maps to one value *of the expression in c*.',
        'Allowed data-pin values: 0, 1, c, NOT c — that is the full residual-variable alphabet.',
        'Watch row (0,1): the term a\'b fires for both c values, so that pin is a constant, not c-dependent.',
      ],
    },
    practiceExercises: [
      {
        title: 'Build the 2:1 mux for the challenge',
        brief:
          'Write module mux2to1(input a, b, sel, output y) where y = a when sel=0 and y = b when sel=1. Provide the dataflow assign, and verify rows (sel,a,b) = (0,1,0) and (1,0,1).',
        expectedBehavior:
          'assign y = sel ? b : a; (or the AND-OR form). Row (0,1,0): y = a = 1. Row (1,0,1): y = b = 1. Both agree with the 8-row table.',
        hints: [
          'Ternary reads "if sel then b else a" — keep the arms straight.',
          'The AND-OR equivalent is (sel & b) | (~sel & a).',
          'Match the challenge\'s port names exactly before submitting.',
        ],
        challengeId: 'hardware-01-2to1-multiplexer',
      },
      {
        title: 'Expand to 8:1 on paper',
        brief:
          'Draw (or list) the 2:1 mux tree for an 8:1 mux: how many 2:1 muxes, how many layers, and which select bit drives which layer?',
        expectedBehavior:
          '7 two-input muxes in 3 layers: layer 1 has four muxes steered by sel[0], layer 2 has two steered by sel[1], layer 3 has one steered by sel[2]. Depth = 3 mux delays; 2^3 - 1 = 7 muxes.',
        hints: [
          'Each layer halves the number of candidates.',
          'The MSB of the select should act last (outermost layer) so the binary encoding reads naturally.',
          'Count: 4 + 2 + 1.',
        ],
      },
      {
        title: 'Demux from a decoder',
        brief:
          'Show that a 2:4 decoder with enable en behaves as a 1:4 demux when din is tied to en. Write the four output equations with din in place of en and verify one row.',
        expectedBehavior:
          "Decoder outputs y_i = en * minterm_i(sel); substituting din for en gives y0 = din*s1'*s0', y1 = din*s1'*s0, y2 = din*s1*s0', y3 = din*s1*s0 — exactly a 1:4 demux. Row check (sel=10, din=1): y2 = din*s1*s0' = 1 and every other output is 0.",
        hints: [
          'A decoder activates the one-hot output matching sel when enabled.',
          'The demux is "a decoder whose enable is the data".',
          'Verify with sel=10: only y2 may be high, and only when din=1.',
        ],
      },
    ],
    assessment: {
      title: 'Multiplexers checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'With sel=1, a=0, b=1, what is y in y = sel ? b : a?',
          code: 'assign y = sel ? b : a;',
          options: ['0', '1', 'x', 'z'],
          answer: '1',
          explanation: 'sel=1 forwards b, which is 1.',
          hint: 'sel=1 picks the after-the-question-mark arm.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'How many 2:1 muxes build a 4:1 mux tree?',
          options: ['3', '4', '2', '8'],
          answer: '3',
          explanation: 'Two in the first layer, one in the second: 2^2 - 1 = 3.',
          hint: 'Each 2:1 mux halves the candidate count.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A 4:1 mux plus at most one inverter can implement any 3-variable Boolean function.',
          answer: 'true',
          explanation:
            'Put two variables on the select lines; each data pin then needs one of {0, 1, third variable, NOT third variable} — one inverter covers the NOT.',
          hint: 'Think of the residual-variable trick from guided practice.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'A 1:4 demultiplexer with din=1 and sel=10 asserts which output? (Name it, e.g. y0.)',
          answer: 'y2',
          explanation: 'sel=10 routes din to output index 2; all other outputs are 0.',
          hint: 'Read sel as a binary output index.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'In a combinational always block, what hardware is inferred if one select value never assigns the output?',
          options: [
            'A latch (the output holds its previous value)',
            'A flip-flop',
            'Nothing — the case is still complete',
            'A tri-state buffer',
          ],
          answer: 'A latch (the output holds its previous value)',
          explanation:
            'Unassigned cases mean "keep the old value", which is memory — combinational logic must not remember. Always cover all cases or provide a default.',
          hint: 'What does "no assignment" mean to a wire that already has a value?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Multiplexer (mux)', definition: 'Forwards one of 2^n inputs to the output under n-bit select control: y = d[sel].' },
      { term: 'Select signal', definition: 'The control input choosing which data path passes; must settle before the data it steers.' },
      { term: 'Demultiplexer (demux)', definition: 'Routes one input to one of 2^n outputs; a decoder with the data on its enable.' },
      { term: 'Mux tree', definition: '2^n - 1 two-input muxes in log2 layers implementing a wide mux.' },
      { term: 'Residual variable', definition: 'The variable left off the select lines, appearing (or its complement) on data pins when a mux implements a function.' },
      { term: 'reg (Verilog)', definition: 'A variable assigned procedurally in always blocks; in combinational blocks it still synthesizes to wires, not flip-flops.' },
    ],
    revisionSummary: [
      '2:1 mux: y = sel\'a + sel·b = sel ? b : a — the atom of datapath selection.',
      'Trees: n select bits -> 2^n inputs via 2^n - 1 two-input muxes in log2(n) layers.',
      'Demux = decoder with data on enable; mirror image of the mux.',
      'Muxes are universal: 4:1 + one inverter implements any 3-variable function; FPGAs are mux/ROM forests.',
      'Incomplete case statements infer latches — always assign every branch.',
      'Select timing matters: a late select can glitch the output through the wrong arm.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Multiplexer', url: 'https://en.wikipedia.org/wiki/Multiplexer', kind: 'article' },
      { label: 'Electronics Tutorials — Multiplexer', url: 'https://www.electronics-tutorials.ws/combination/multiplexer.html', kind: 'article' },
      { label: 'All About Circuits — Multiplexers and demultiplexers', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-9/multiplexers-and-demultiplexers/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'de-m05-l03',
    title: 'Decoders, Encoders, and Priority Encoders',
    summary:
      'Translating between binary codes and one-hot codes: n-to-2^n decoders as minterm generators, simple encoders and their multiple-assertion flaw, and the priority encoder that fixes it.',
    objectives: [
      'Specify a 2:4 decoder (with enable) and derive its one-hot outputs.',
      'Use a decoder plus OR gates to implement arbitrary Boolean functions.',
      'Show why a plain 4:2 encoder is ambiguous and define priority resolution.',
      'Derive priority-encoder equations and code one in Verilog with a valid flag.',
    ],
    whyItMatters:
      'Decoders turn compact binary codes into explicit one-hot selects — memory addressing, peripheral chip-selects, instruction decoding all begin with one. Encoders do the reverse and are the standard interface for interrupt controllers. The priority encoder also introduces a specification pattern (if/else-if chains) that dominates RTL control logic, and its "valid" output is your first handshake signal.',
    prerequisites: ['de-m05-l02'],
    explanation:
      '### Decoder: binary code -> one-hot\n\nAn n-to-2^n **decoder** asserts exactly the one output whose index equals the binary input (an **one-hot** code). The 2:4 decoder with enable:\n\n```\nen s1 s0 | y3 y2 y1 y0\n 1  0  0 |  0  0  0  1\n 1  0  1 |  0  0  1  0\n 1  1  0 |  0  1  0  0\n 1  1  1 |  1  0  0  0\n 0  x  x |  0  0  0  0     (enable gates everything)\n```\n\nEach output is one minterm: `y0 = en*s1\'s0\'`, `y1 = en*s1\'s0`, `y2 = en*s1*s0\'`, `y3 = en*s1*s0`.\n\n### Decoder = minterm generator\n\nBecause each output *is* a minterm of the inputs, a decoder plus one OR gate implements any function: OR together the outputs for the function\'s 1-rows. f = Σm(1,2) becomes `f = y1 + y2`. This is the hardware realization of the canonical SOP from Module 4 — and the reason PLA/PAL structures (programmable AND-OR planes) were historically built exactly this way.\n\n### Encoder: one-hot -> binary, and its flaw\n\nA 4:2 **encoder** outputs the index of the asserted input. Its flaw: if two inputs assert simultaneously (or none), the simple OR-matrix equations produce garbage. For instance with d1 and d2 both high, naive OR logic yields y1y0 = 11 = 3 — a third, wrong code.\n\n### Priority encoder: ambiguity resolved\n\nThe **priority encoder** adds a rule: the highest-indexed asserted input wins. With d3 as top priority:\n\n```\nd3 d2 d1 d0 | y1 y0 valid\n 0  0  0  0 |  0  0   0      (nothing asserted: valid=0)\n 0  0  0  1 |  0  0   1\n 0  0  1  x |  0  1   1      (d1 wins over d0)\n 0  1  x  x |  1  0   1      (d2 wins over d1, d0)\n 1  x  x  x |  1  1   1      (d3 wins over everything)\n```\n\nEquations: `y1 = d3 + d2`, `y0 = d3 + d2\'·d1`, `valid = d3 + d2 + d1 + d0`. The **valid** flag distinguishes "output 00 because input 0 won" from "output 00 because nobody spoke" — your first example of sideband status traveling with data, the pattern behind handshakes in the RTL course.\n\n### Where you meet these blocks\n\n- CPU **instruction decode**: opcode bits -> one-hot control lines.\n- **Memory systems**: address -> row/column select.\n- **Interrupt controllers**: many request lines -> highest-priority source number.\n- **Keyboards**: key matrix -> code, with rollover handled by priority.',
    deepDive:
      '### Cascading priority encoders\n\nReal interrupt controllers cascade 8:3 priority encoders: each chip\'s "valid/enabled-out" output feeds the enable of the next-lower chip, so a request anywhere in the chain propagates its index upward. The ripple here is structural priority, not delay-critical — but note it *is* a ripple: request latency grows with chain position, the same linear-growth pattern as the ripple-carry adder, fixed the same way (lookahead-style grouping) when it matters.\n\n### One-hot thinking in RTL\n\nModern RTL frequently keeps signals one-hot end to end (one wire per state, per source) and lets muxes/decoders do the conversion only at boundaries. One-hot logic trades more wires for shallower, faster gates — the exact trade you will meet again in Module 7\'s one-hot state encoding, where FPGAs prefer it because their flip-flops are abundant and their routing is the scarce resource.',
    examples: [
      {
        title: '2:4 decoder and 4:2 priority encoder in Verilog',
        language: 'verilog',
        code:
          '// Decoder: one-hot outputs, gated by enable.\nmodule decoder2to4(\n    input  wire       en,\n    input  wire [1:0] sel,\n    output wire [3:0] y\n);\n    assign y = en ? (4\'b0001 << sel) : 4\'b0000;\nendmodule\n\n// Priority encoder: d[3] has the highest priority.\nmodule prio_enc4to2(\n    input  wire [3:0] d,\n    output reg  [1:0] y,\n    output wire       valid\n);\n    assign valid = |d;              // reduction OR: any request?\n\n    always @(*) begin\n        if      (d[3]) y = 2\'b11;\n        else if (d[2]) y = 2\'b10;\n        else if (d[1]) y = 2\'b01;\n        else           y = 2\'b00;   // d[0] or nothing\n    end\nendmodule',
        explanation: [
          'The decoder\'s shift expression `4\'b0001 << sel` builds the one-hot pattern directly; masking with en turns it off when disabled.',
          'Equivalently each y bit could be written as its minterm equation — the shift is the compact form of the same four AND gates.',
          'The priority chain reads top-down: earlier branches win, exactly matching the truth table\'s don\'t-care rows.',
          '`valid = |d` is a reduction OR — 1 when any input is asserted, separating "index 0" from "no request".',
          'The final `else` covers both d[0] and the all-zero case; valid tells the downstream block which situation it is.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Decoder as minterm generator driving a function OR',
        content:
          '            +-----------+\n   a ------ |           |--- y0 = a\'b\'  --+\n   b ------ |  2:4      |--- y1 = a\'b   --|--+[OR]-- f = y1 + y2\n            |  decoder  |                 |  |\n            |           |--- y2 = ab\'   --|--+\n            |           |--- y3 = ab      |\n            +-----------+                 (f = SUM m(1,2))\n\n  any 2-input function = decoder + one OR gate with the\n  right taps: the hardware version of canonical SOP.',
        caption:
          'The decoder enumerates all minterms; choosing taps implements any function of the inputs.',
      },
    ],
    tables: [
      {
        caption: '2:4 decoder with enable (complete)',
        headers: ['en', 's1', 's0', 'y3', 'y2', 'y1', 'y0'],
        rows: [
          ['0', 'x', 'x', '0', '0', '0', '0'],
          ['1', '0', '0', '0', '0', '0', '1'],
          ['1', '0', '1', '0', '0', '1', '0'],
          ['1', '1', '0', '0', '1', '0', '0'],
          ['1', '1', '1', '1', '0', '0', '0'],
        ],
      },
      {
        caption: '4:2 priority encoder — all 16 rows (d3 highest priority)',
        headers: ['d3', 'd2', 'd1', 'd0', 'y1', 'y0', 'valid'],
        rows: [
          ['0', '0', '0', '0', '0', '0', '0'],
          ['0', '0', '0', '1', '0', '0', '1'],
          ['0', '0', '1', '0', '0', '1', '1'],
          ['0', '0', '1', '1', '0', '1', '1'],
          ['0', '1', '0', '0', '1', '0', '1'],
          ['0', '1', '0', '1', '1', '0', '1'],
          ['0', '1', '1', '0', '1', '0', '1'],
          ['0', '1', '1', '1', '1', '0', '1'],
          ['1', '0', '0', '0', '1', '1', '1'],
          ['1', '0', '0', '1', '1', '1', '1'],
          ['1', '0', '1', '0', '1', '1', '1'],
          ['1', '0', '1', '1', '1', '1', '1'],
          ['1', '1', '0', '0', '1', '1', '1'],
          ['1', '1', '0', '1', '1', '1', '1'],
          ['1', '1', '1', '0', '1', '1', '1'],
          ['1', '1', '1', '1', '1', '1', '1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Building an encoder without a valid output and misreading 00.',
        fix:
          'Index 0 and "nothing asserted" share the same output code. Always pair an encoder (or priority encoder) with a valid/empty flag, and decide explicitly what the output means when valid = 0.',
      },
      {
        mistake: 'Assuming the priority order from the bit position without checking.',
        fix:
          'Conventions differ: some designs make d0 highest. The truth table is the contract — write it (or read the if/else chain) and confirm which input wins before relying on the block.',
      },
      {
        mistake: 'Leaving the enable floating in a decoder-based design.',
        fix:
          'An undriven en can float into the undefined region (Module 1): outputs become unpredictable and may double-select. Tie enables explicitly, and remember that a demux *uses* this pin as its data input.',
      },
    ],
    guidedPractice: {
      title: 'Implement a function with decoder + OR',
      brief:
        'Implement f(a,b,c) = Σm(1, 4, 6) using a 3:8 decoder and one OR gate: state which decoder outputs are tapped, then verify all 8 rows against the minterm list.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    /* decoder outputs y[m] = 1 exactly on row m */\n    int ok = 1;\n    for (int m = 0; m < 8; m++) {\n        int y1 = (m == 1), y4 = (m == 4), y6 = (m == 6);\n        int f_decoder = y1 | y4 | y6;       /* the OR gate */\n        int f_spec = (m == 1 || m == 4 || m == 6);\n        if (f_decoder != f_spec) ok = 0;\n    }\n    printf("decoder+OR matches SUM m(1,4,6): %s\\n", ok ? "YES" : "NO");\n    return 0;\n}',
      expectedBehavior:
        'Tap y1, y4 and y6 into one 3-input OR: f = y1 + y4 + y6. The decoder asserts exactly one output per input row, so the OR is 1 precisely on rows 1, 4, 6 — the sweep prints YES.',
      hints: [
        'The decoder already computes every minterm; the design decision is only *which* outputs to collect.',
        'The OR gate width equals the number of 1-rows.',
        'No minimization happens here — that is the point: decoder-based implementation buys speed and regularity with gates.',
      ],
    },
    practiceExercises: [
      {
        title: 'Extend to 3:8 with a Verilog case',
        brief:
          'Write a 3:8 decoder in Verilog using an always block with a case statement on sel, plus an enable that forces 8\'b0000000. Then express output y5 as a minterm equation in variables s2, s1, s0.',
        expectedBehavior:
          'The case covers all 8 sel values assigning one-hot bytes, with `if (!en) y = 8\'b0;` first (or a default). y5 = en · s2 · s1\' · s0 (row 5 = 101: s2=1, s1=0, s0=1).',
        hints: [
          'Eight case items plus the enable guard — no default needed if all 8 are listed, but adding one is safer.',
          'Row 5 in binary is 101; the minterm complements the 0-bit.',
          'One-hot output widths: 8 bits for a 3:8.',
        ],
      },
      {
        title: 'Cascaded priority',
        brief:
          'Two 4:2 priority encoders (each with a valid output and an enable) form an 8-input unit: chip H handles d7..d4, chip L handles d3..d0. State the rules for producing y2..y0 and valid for the combined unit.',
        expectedBehavior:
          'If H.valid: result = {1, H.y} (values 8-15 range), valid=1. Else if L.valid: result = {0, L.y}, valid=1. Else valid=0 and the result is don\'t-care/0. Chip L is gated (enabled) only when H has no request — the cascade rule.',
        hints: [
          'The high chip\'s valid is the cascade control.',
          'The combined index is 4 bits wide: {chip_select, chip_y}.',
          'When both chips have requests, H must win — that is what priority means across chips.',
        ],
      },
    ],
    assessment: {
      title: 'Decoders and encoders checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'A 2:4 decoder has en=1 and sel=10. Which output is high?',
          options: ['y2', 'y1', 'y3', 'y0'],
          answer: 'y2',
          explanation: 'sel=10 is binary 2, so the one-hot output y2 asserts.',
          hint: 'Read sel as a binary index.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In the priority encoder with d = 0101 (d3..d0), what are y1 y0 and valid?',
          options: ['y=10, valid=1', 'y=01, valid=1', 'y=11, valid=1', 'y=00, valid=0'],
          answer: 'y=10, valid=1',
          explanation: 'd2 is the highest asserted input (d3=0), so the index is 2 = 10 with valid=1. Lower-priority d0 is ignored.',
          hint: 'Scan from d3 down; the first 1 wins.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A decoder output y3 of a 2:4 decoder equals the minterm s1 AND s0.',
          answer: 'true',
          explanation: 'y3 corresponds to row 11: en·s1·s0 — with en high, exactly the minterm m3.',
          hint: 'Which input row makes y3 the selected one?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What single flag distinguishes "priority encoder output 00 because input 0 won" from "output 00 because no input is asserted"? (One word.)',
          answer: 'valid',
          explanation: 'valid = OR of all inputs; 0 means nobody asserted, making the y output meaningless.',
          hint: 'It is the sideband status signal.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'Why does a plain (non-priority) 4:2 encoder fail when d1 and d2 assert together?',
          options: [
            'Its OR-matrix logic produces index 3, a code nobody asserted',
            'The outputs short-circuit',
            'It outputs 0 and 0 forever',
            'It cannot be built from gates',
          ],
          answer: 'Its OR-matrix logic produces index 3, a code nobody asserted',
          explanation:
            'OR-matrix equations y1 = d2 + d3, y0 = d1 + d3 give y=11 for the d1+d2 case — an encoding of input 3, which is false. Priority (or one-hot guaranteed inputs) is required.',
          hint: 'Evaluate the naive equations with d1=d2=1.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Decoder', definition: 'n-to-2^n converter asserting the one-hot output matching the binary input; each output is one minterm.' },
      { term: 'One-hot', definition: 'A code where exactly one of n lines is asserted; the explicit form of a binary index.' },
      { term: 'Encoder', definition: '2^n-to-n converter producing the index of the asserted input; ambiguous with multiple assertions.' },
      { term: 'Priority encoder', definition: 'Encoder where the highest-indexed asserted input wins; outputs index plus valid.' },
      { term: 'Valid flag', definition: 'Sideband signal stating the main output is meaningful; the basis of hardware handshakes.' },
      { term: 'Enable', definition: 'Gating input that forces outputs inactive when low; on a decoder it doubles as demux data input.' },
    ],
    revisionSummary: [
      'Decoder: binary in, one-hot out; en=0 forces all outputs low.',
      'Decoder + OR taps = any function of the inputs (hardware canonical SOP).',
      'Plain encoders corrupt on multiple assertions; priority resolves by rank.',
      'Priority encoder: y1 = d3 + d2, y0 = d3 + d2\'d1, valid = OR of all.',
      'Valid flags distinguish meaningful outputs from idle ones — the handshake primitive.',
      'Decoders address memories and decode instructions; encoders compress interrupt/request lines.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Decoder (electronics)', url: 'https://en.wikipedia.org/wiki/Decoder_(electronics)?redirect=no', kind: 'article' },
      { label: 'Wikipedia — Encoder (electronics)', url: 'https://en.wikipedia.org/wiki/Encoder_(electronics)', kind: 'article' },
      { label: 'Electronics Tutorials — Binary decoders', url: 'https://www.electronics-tutorials.ws/combination/binary-decoder.html', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'de-m05-l04',
    title: 'Comparators, Parity, and the ALU at a Glance',
    summary:
      'Equality and magnitude comparators built from XNORs, parity generation and checking for error detection, and how function-select logic ties adders, logic units and shifts into an ALU.',
    objectives: [
      'Design 1-bit and multi-bit equality comparators from XNOR + AND trees.',
      'Build a 2-bit magnitude comparator and state its three outputs.',
      'Compute even/odd parity, explain what error classes parity detects, and design a checker.',
      'Describe ALU organization: operation select, flag generation, and the shared adder core.',
    ],
    whyItMatters:
      'Comparators decide branches (`if (a == b)`), address matching and cache hits; parity guards every serial link and memory bus at the cheapest possible cost; and the ALU is where all your Module 5 blocks meet in one datapath. This lesson closes the combinational half of the course by assembling its parts into the shape the processor course will assume you know.',
    prerequisites: ['de-m05-l01', 'de-m05-l03'],
    explanation:
      '### Equality comparator: XNOR forest\n\nTwo bits are equal when their XNOR is 1. For n-bit words, AND all n XNOR outputs:\n\n```\neq = (a0 XNOR b0)(a1 XNOR b1)...(a(n-1) XNOR b(n-1))\n```\n\nAny single differing bit kills eq — an AND of "all match" signals. Depth is 2 gates regardless of width (all XNORs work in parallel), which is why equality checks are cheap even for 64-bit words.\n\n### Magnitude comparator: three outputs\n\nA **magnitude comparator** reports a > b, a = b, a < b. For one bit:\n\n```\ngt = a * b\'        eq = a XNOR b        lt = a\' * b\n```\n\nFor two bits, compare MSBs first; if equal, fall through to the LSBs:\n\n```\ngt = (a1>b1) OR (a1==b1 AND a0>b0)\n   = a1b1\' + (a1 XNOR b1)·a0b0\'\nlt = the mirror with roles swapped\n```\n\nThis *ripple* structure (decide higher bits first, propagate "equal so far") extends to any width; production comparators use lookahead-style tree versions for speed, exactly like adders.\n\n### Parity: the cheapest error detector\n\nAppend one bit making the total count of 1s even (**even parity**) or odd (**odd parity**):\n\n```\neven parity bit:  p = d1 XOR d2 XOR d3   (XOR of all data bits)\nchecker:          err = p XOR d1 XOR d2 XOR d3   (1 = error)\n```\n\nXOR is the *odd-count detector*: a chain of XORs reports 1 when an odd number of inputs is 1. Any single flipped bit (or any odd number of flips) breaks the parity and is detected; any *even* number of flips cancels out and passes. Parity cannot locate the error or correct it — for that you need Hamming codes or CRCs, which reuse the same XOR machinery many times.\n\n### The ALU: function-select over shared hardware\n\nAn **arithmetic logic unit** computes one of several operations under an opcode:\n\n```\nop  | function\n 00 | A + B          (adder core)\n 01 | A - B          (same core, XOR trick from lesson 1)\n 10 | A AND B        (logic unit)\n 11 | A OR B         (logic unit)\n```\n\nImplementation shape: compute all operations on the *same* inputs in parallel, then mux the requested one to the output — the mux from lesson 2 doing selection duty. Flags come for free: zero (NOR of all result bits), carry (adder cout), overflow (V from lesson 1), negative (result MSB). The ALU is the meeting point of everything in this module: adder, logic gates, mux, and flags.',
    deepDive:
      '### Why parity survives\n\nParity costs one bit per byte/word (12.5% for a byte, 1.5% for 64 bits) and one XOR tree — vastly cheaper than Hamming or CRC. Serial links (UARTs add an optional parity bit — the shift registers of Module 6), memory with ECC-dimms (which upgrade to Hamming/SECDED), and I2C\'s PEC byte all trace this lineage. Knowing *what class* of errors parity catches (odd multiplicity) tells you when it is adequate: random single-bit upsets, yes; burst errors, no — a cable glitch flipping adjacent bits in pairs sails through, which is why links add CRCs.\n\n### ALU width, flags, and the C flag convention\n\nThe carry flag\'s meaning flips with the operation: set on unsigned overflow in add mode, but in subtract mode carry = 1 means *no borrow* on most architectures (because subtraction is implemented as complement addition and the carry-out comes out naturally 1 when a >= b). ARM calls it C, x86 calls it CF, and assembly courses spend a week un-teaching the confusion. The zero flag, by contrast, is architecture-independent: a wide NOR of the result — one gate of depth 2.',
    examples: [
      {
        title: '2-bit comparator and 8-bit odd-parity generator in Verilog',
        language: 'verilog',
        code:
          '// Magnitude comparator, 2 bits, written with operators.\nmodule comparator2(\n    input  wire [1:0] a,\n    input  wire [1:0] b,\n    output wire       a_gt_b,\n    output wire       a_eq_b,\n    output wire       a_lt_b\n);\n    assign a_eq_b = (a == b);\n    assign a_gt_b = (a > b);\n    assign a_lt_b = (a < b);\nendmodule\n\n// Odd-parity generator over 8 data bits (XOR reduction tree).\nmodule parity8(\n    input  wire [7:0] d,\n    output wire       parity_odd   // 1 when d holds an odd number of 1s\n);\n    assign parity_odd = ^d;         // unary reduction XOR\nendmodule',
        explanation: [
          'The relational operators (`==`, `>`, `<`) describe the comparator\'s function; synthesis builds the XNOR/AND tree (and for >, the ripple-or-lookahead magnitude structure) automatically.',
          'Exactly one of the three outputs is 1 for any input pair — a useful invariant to check in verification.',
          '`^d` is the reduction XOR: folds the tree d[0]^d[1]^...^d[7], computing the odd-count detector in one line.',
          'Even parity would send NOT(^d) so that data+parity always holds an even number of ones; the checker at the receiver XORs everything again — a second application of the same operator.',
          'Reduction operators are the RTL shorthand for the XOR trees drawn in this lesson\'s diagram; knowing the gate structure behind them keeps widths and delays predictable.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Comparator core, parity chain, and ALU organization',
        content:
          '  1-BIT COMPARATOR              PARITY CHAIN (8 bits)\n\n   a --+--[XNOR]-- eq            d0 -+[XOR]\n   b --+                         d1 -+     +[XOR]\n                                 d2 -+     |     +[XOR]-- odd count\n   a --+--[AND]- gt  (a*b\')      d3 -+-----+     |\n   b -o-+                        d4 -+           |\n                                 ...  (tree depth 3 for 8 bits)\n   b --+--[AND]- lt  (a\'*b)\n   a -o-+\n\n  ALU ORGANIZATION\n\n        A --+--> [ ADD/SUB core ]---+\n        B --+          |            |\n            +--> [ AND unit ]------+--[MUX op1 op0]--+--> result\n                 [ OR unit ]-------+                 +--> flags (Z,C,V,N)',
        caption:
          'Three views of one idea: compare with XNOR/AND, detect odd counts with XOR trees, select among parallel units with a mux.',
      },
    ],
    tables: [
      {
        caption: '1-bit comparator truth table',
        headers: ['a', 'b', 'gt (a>b)', 'eq (a=b)', 'lt (a<b)'],
        rows: [
          ['0', '0', '0', '1', '0'],
          ['0', '1', '0', '0', '1'],
          ['1', '0', '1', '0', '0'],
          ['1', '1', '0', '1', '0'],
        ],
      },
      {
        caption: 'Simple ALU operation table (2 control bits)',
        headers: ['op1', 'op0', 'Operation', 'Result for A=0101, B=0011'],
        rows: [
          ['0', '0', 'A + B', '1000 (carry 0)'],
          ['0', '1', 'A - B', '0010'],
          ['1', '0', 'A AND B', '0001'],
          ['1', '1', 'A OR B', '0111'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Building equality with XOR and forgetting the final inversion.',
        fix:
          'XOR reports *difference*; equality needs XNOR (or XOR followed by NOT). A comparator whose eq output asserts on mismatch has the two wires swapped — test the equal-words row first.',
      },
      {
        mistake: 'Claiming parity detects two flipped bits.',
        fix:
          'An even number of flips preserves the 1-count parity, so two corrupted bits pass the checker silently. Parity detects odd-multiplicity errors only; burst errors need CRC or Hamming codes.',
      },
      {
        mistake: 'Reading a subtract-mode carry flag as "borrow occurred".',
        fix:
          'In complement-based subtraction, carry-out = 1 means NO borrow (a >= b). The flag is the raw adder carry, not an inverted borrow — architectures document this; drivers must honor it.',
      },
    ],
    guidedPractice: {
      title: 'Assemble a 4-function mini-ALU table',
      brief:
        'For A = 0110 and B = 0011 with the op table from the lesson (00 add, 01 sub, 10 AND, 11 OR): compute all four results and the Z/C/V flags for each, treating values as 4-bit two\'s complement for V.',
      starterCode:
        '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t A = 0x6, B = 0x3;   /* 0110, 0011 */\n\n    uint8_t add = (uint8_t)(A + B);\n    uint8_t sub = (uint8_t)(A - B);\n    uint8_t and = (uint8_t)(A & B);\n    uint8_t or  = (uint8_t)(A | B);\n\n    printf("add: %u%u%u%u\\n", (add>>3)&1u,(add>>2)&1u,(add>>1)&1u,add&1u);\n    printf("sub: %u%u%u%u\\n", (sub>>3)&1u,(sub>>2)&1u,(sub>>1)&1u,sub&1u);\n    printf("and: %u%u%u%u\\n", (and>>3)&1u,(and>>2)&1u,(and>>1)&1u,and&1u);\n    printf("or : %u%u%u%u\\n", (or>>3)&1u,(or>>2)&1u,(or>>1)&1u,or&1u);\n    return 0;\n}',
      expectedBehavior:
        'A=0110 (6), B=0011 (3). add: 0110+0011 = 1001 with C=0 and V=1 (6+3=9 exceeds the signed maximum 7: carry into the MSB is 1 while carry out is 0). sub: 0011 (6-3=3, no borrow; complement-scheme carry-out is 1). and: 0010. or: 0111. Z=0 for all four results. The program prints the four patterns 1001, 0011, 0010, 0111.',
      hints: [
        'AND: 0110 & 0011 = 0010. OR: 0110 | 0011 = 0111.',
        'For V on add, trace carries bit by bit; the sign bits (0 and 0) producing a 1 result is the give-away.',
        'Z = 1 only when the result pattern is all zeros.',
      ],
    },
    practiceExercises: [
      {
        title: 'Parity end to end',
        brief:
          'Data 1011 0001 is sent with even parity. (a) Compute the parity bit. (b) The receiver gets 1001 0001 with its parity bit. Compute the check result and state whether an error is flagged. (c) State an error pattern parity would miss.',
        expectedBehavior:
        "(a) Data has four 1s (even), so even-parity bit = 0 (XOR of data = 0). (b) Received data 10010001 has three 1s; XOR with parity bit 0 gives 1 -> error flagged. (c) Any two flipped bits (e.g. both d0 and d1) preserve parity and pass undetected.",
        hints: [
          'Even parity: total count of 1s including the parity bit must be even.',
          'The checker XORs all nine received bits; 1 means alarm.',
          'XOR is its own inverse: even numbers of flips cancel.',
        ],
      },
      {
        title: 'Comparator tree for 4 bits',
        brief:
          'Extend the 2-bit magnitude ripple to 4 bits: write gt as a chain of terms (a3 vs b3, then a2 with equality-so-far, ...), and state the depth of the equality (XNOR) part versus the magnitude part.',
        expectedBehavior:
          'eq_so_far3 = XNOR(a3,b3); gt = a3b3\' + eq3·a2b2\' + eq3·eq2·a1b1\' + eq3·eq2·eq1·a0b0\'. Equality part: depth 2 (parallel XNORs + one AND tree of log depth). Magnitude part: the ripple chain has depth growing with width (4 terms in series-parallel), which is why fast comparators restructure it like carry-lookahead.',
        hints: [
          'Higher bits dominate; lower bits matter only under full equality above.',
          'The eq chain is shared by gt and lt.',
          'Count series ANDs along the worst path for the depth claim.',
        ],
      },
    ],
    assessment: {
      title: 'Comparators, parity, ALU checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which gate directly produces the "equal" signal for one pair of bits?',
          options: ['XNOR', 'XOR', 'NAND', 'OR'],
          answer: 'XNOR',
          explanation: 'XNOR outputs 1 exactly when its inputs match; equality of words is the AND of all bit-wise XNORs.',
          hint: 'Equality = match detector.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A single parity bit can detect any two flipped bits in a byte.',
          answer: 'false',
          explanation:
            'Two flips change the count by an even amount, leaving parity unchanged — the error passes silently. Parity catches odd-multiplicity errors only.',
          hint: 'Count how the 1s total moves.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'What does parity_odd return for d = 8\'b0000_1111?',
          code: 'assign parity_odd = ^d;',
          options: ['1', '0', 'x', '8'],
          answer: '0',
          explanation: 'd has four ones (even), so the XOR reduction is 0 — parity_odd reports even.',
          hint: 'Count the ones.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'In the mini-ALU, which block selects among the parallel operation results? (One word.)',
          answer: 'multiplexer',
          explanation: 'All operations compute in parallel on the same inputs; the opcode steers a mux (or mux tree) to pick the result.',
          hint: 'The Module 5 lesson 2 block.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'For signed 4-bit values, 0110 + 0011 = 1001. What do the C and V flags report?',
          options: ['C=0, V=1', 'C=1, V=0', 'C=0, V=0', 'C=1, V=1'],
          answer: 'C=0, V=1',
          explanation:
            'Unsigned 6+3=9 fits in 4 bits (C=0). Signed 6+3=9 exceeds +7 and wraps to -7, so V=1 (carry into MSB differs from carry out).',
          hint: 'Two positive operands produced a negative-looking result.',
          difficulty: 'hard',
        },
      ],
    },
    keyTerms: [
      { term: 'Equality comparator', definition: 'AND of bit-wise XNORs; depth-2 regardless of width.' },
      { term: 'Magnitude comparator', definition: 'Produces gt/eq/lt by comparing from the MSB down under an "equal so far" chain.' },
      { term: 'Parity bit', definition: 'An extra bit making the total 1-count even (or odd); detects odd-multiplicity errors.' },
      { term: 'Reduction operator', definition: 'Verilog `^d`, `|d`, `&d`: fold an operator across all bits of a vector (XOR tree, OR tree, AND tree).' },
      { term: 'ALU', definition: 'Arithmetic logic unit: parallel function units plus an opcode-driven mux and flag generation.' },
      { term: 'Flags (Z, C, V, N)', definition: 'Zero, carry, overflow and negative status bits tapped from the result and carry chain.' },
    ],
    revisionSummary: [
      'Equality: XNOR per bit, AND across bits — width-independent depth.',
      'Magnitude: MSB-first with "equal so far" propagation; mirror for lt.',
      'Parity: XOR tree generates, XOR-everything checks; catches odd flip counts only.',
      'ALU = shared adder + logic units + opcode mux + flags.',
      'V flag = carry-in(MSB) XOR carry-out(MSB); C behaves oppositely in subtract mode.',
      'This module\'s blocks (adder, mux, decoder, comparator) are the datapath vocabulary of the processor course.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Digital comparator', url: 'https://en.wikipedia.org/wiki/Digital_comparator', kind: 'article' },
      { label: 'Wikipedia — Parity bit', url: 'https://en.wikipedia.org/wiki/Parity_bit', kind: 'article' },
      { label: 'Wikipedia — Arithmetic logic unit', url: 'https://en.wikipedia.org/wiki/Arithmetic_logic_unit', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
