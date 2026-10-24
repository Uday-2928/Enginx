import type { TutorialProject } from '../types';

export const digitalElectronicsProjects: TutorialProject[] = [
  {
    id: 'de-proj-binary-calculator',
    title: 'Build a 4-Bit Add/Subtract Unit with Overflow Flag',
    level: 'beginner',
    summary:
      'Design a guided, from-scratch 4-bit calculator datapath: full adder, ripple chain, XOR-mode subtraction and signed overflow detection — the ALU core of Module 5 assembled as one project.',
    useCase:
      'Every ALU, every address generator and every DSP slice contains exactly this structure. After this project you can read the arithmetic section of any microcontroller datasheet block diagram and know what each wire does.',
    requirements: [
      'A full_adder module with ports a, b, cin, sum, cout matching the truth table on all 8 rows.',
      'A 4-bit ripple_adder4 built from four full_adder instances chained through named carry wires.',
      'A mode input: mode=0 computes a+b, mode=1 computes a-b (XOR trick plus carry-in = mode).',
      'A signed overflow output equal to the XOR of the carry into and out of the MSB stage.',
      'All sequential assumptions documented: this datapath is purely combinational (no clock needed for the arithmetic itself).',
    ],
    learningOutcomes: [
      'Translate a truth-table specification into gate equations and then Verilog without references.',
      'Structure a datapath as small verified blocks composed structurally.',
      'Reuse one adder for two operations via the two\'s-complement mode trick.',
      'Derive and tap status flags (carry, overflow) from existing carry wires.',
    ],
    prerequisites: ['de-m02-l03', 'de-m05-l01', 'de-m03-l04'],
    architecture:
      '  mode ----+-----------------------------+\n           |                             |\n           v                             v\n  a[3:0] ---+   +---------+  +------------------+\n  b[3:0] ---+-->| XOR with|--->| 4x full_adder    |--> result[3:0]\n                | {4{mode}}|    | (direct instances)|--> cout\n                +---------+    +------------------+\n                                      ^\n                                cin = mode\n\n  inside calc4 the four full_adder instances are wired directly\n  (not via a ripple_adder4 wrapper) so the internal carries stay\n  visible:\n     fa0: cin=mode, cout=c1\n     fa1: cin=c1,   cout=c2\n     fa2: cin=c2,   cout=c3   (c3 = carry INTO the MSB stage)\n     fa3: cin=c3,   cout=cout (carry OUT of the MSB stage)\n\n  overflow = c3 XOR cout   (carry into MSB differs from carry out)\n\n  signal flow:  b bits inverted per mode -> ripple addition with\n  cin=mode -> result is a+b (mode=0) or a-b (mode=1).',
    steps: [
      {
        title: 'Verify the full adder on paper',
        detail:
          'Write the 8-row truth table from the addition rule, derive sum = a XOR b XOR cin and cout = ab + cin(a XOR b), and check both against every row. This table is the contract for the whole project.',
        code: '/* reference rows to match (a, b, cin -> sum, cout)\n   (0,0,0)->(0,0)  (0,0,1)->(1,0)  (0,1,0)->(1,0)  (0,1,1)->(0,1)\n   (1,0,0)->(1,0)  (1,0,1)->(0,1)  (1,1,0)->(0,1)  (1,1,1)->(1,1) */',
      },
      {
        title: 'Write and hand-verify full_adder',
        detail:
          'Implement the module with two continuous assignments. Trace at least rows (0,1,1) and (1,1,1) through your expressions before moving on.',
        code: 'module full_adder(\n    input  wire a,\n    input  wire b,\n    input  wire cin,\n    output wire sum,\n    output wire cout\n);\n    assign sum  = a ^ b ^ cin;\n    assign cout = (a & b) | (cin & (a ^ b));\nendmodule',
      },
      {
        title: 'Chain four full adders',
        detail:
          'Declare c1, c2, c3 as wires; instantiate fa0..fa3 with named connections. The carry chain is the delay path — keep it visible in the source.',
        code: 'module ripple_adder4(\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    input  wire       cin,\n    output wire [3:0] sum,\n    output wire       cout\n);\n    wire c1, c2, c3;\n    full_adder fa0 (.a(a[0]), .b(b[0]), .cin(cin), .sum(sum[0]), .cout(c1));\n    full_adder fa1 (.a(a[1]), .b(b[1]), .cin(c1),  .sum(sum[1]), .cout(c2));\n    full_adder fa2 (.a(a[2]), .b(b[2]), .cin(c2),  .sum(sum[2]), .cout(c3));\n    full_adder fa3 (.a(a[3]), .b(b[3]), .cin(c3),  .sum(sum[3]), .cout(cout));\nendmodule',
      },
      {
        title: 'Add subtraction mode',
        detail:
          'Invert each b bit with mode and feed cin = mode. Instantiate the four full_adder instances DIRECTLY inside calc4 (not through the ripple_adder4 wrapper) so the internal carries remain visible for the overflow tap. Verify: 0101 - 0011 = 0010 via complement addition (0101 + 1100 + 1 = 1 0010, carry-out discarded).',
        code: 'wire [3:0] b_eff = b ^ {4{mode}};\n\nfull_adder fa0 (.a(a[0]), .b(b_eff[0]), .cin(mode), .sum(result[0]), .cout(c1));\nfull_adder fa1 (.a(a[1]), .b(b_eff[1]), .cin(c1),   .sum(result[1]), .cout(c2));\nfull_adder fa2 (.a(a[2]), .b(b_eff[2]), .cin(c2),   .sum(result[2]), .cout(c3));\nfull_adder fa3 (.a(a[3]), .b(b_eff[3]), .cin(c3),   .sum(result[3]), .cout(cout));',
      },
      {
        title: 'Tap the overflow flag',
        detail:
          'overflow = c3 XOR cout: c3 is the carry INTO the MSB stage (fa2\'s carry-out feeding fa3), cout is the carry OUT of it. Confirm the Module 2 rule on two cases: 0111+0001 (overflow YES) and 1111+0001 (carry set, overflow NO).',
        code: 'assign overflow = c3 ^ cout;   // same-edge sign check',
      },
      {
        title: 'Build the verification table',
        detail:
          'Enumerate at least 12 test vectors covering: plain adds, subtracts that borrow, the four sign combinations for overflow, and mode boundaries (0111+0001 vs 1000-0001). Predict every expected result before checking.',
      },
    ],
    starterCode: {
      title: 'Project skeleton with TODOs',
      language: 'verilog',
      code:
        'module full_adder(\n    input  wire a,\n    input  wire b,\n    input  wire cin,\n    output wire sum,\n    output wire cout\n);\n    // TODO: two continuous assignments\n    assign sum  = 1\'b0;   // replace\n    assign cout = 1\'b0;   // replace\nendmodule\n\nmodule calc4(\n    input  wire       mode,    // 0 = add, 1 = subtract\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    output wire [3:0] result,\n    output wire       cout,\n    output wire       overflow\n);\n    wire [3:0] b_eff;\n    wire c1, c2, c3;\n\n    // TODO: b_eff = b inverted when mode = 1\n    assign b_eff = b;\n\n    // TODO: instantiate FOUR full_adder instances directly (fa0..fa3),\n    //       chained through c1, c2, c3, with cin = mode\n    assign result = 4\'b0;  // replace\n    assign cout   = 1\'b0;  // replace\n\n    // TODO: overflow = c3 (carry into MSB) XOR cout (carry out of MSB)\n    assign overflow = 1\'b0;  // replace\nendmodule',
      explanation: [
        'The skeleton compiles but computes nothing yet — every TODO maps to one project step.',
        'full_adder is the contract from step 1; calc4 composes it per the architecture diagram.',
        'Keep the carry wires c1..c3 named: the overflow tap (step 5) reads them directly.',
      ],
    },
    testPlan: [
      'Full-adder unit rows: verify all 8 combinations of a, b, cin against the reference table.',
      'Add mode: 0011 + 0101 = 1000 with cout = 0; 1111 + 0001 = 0000 with cout = 1.',
      'Subtract mode: 0101 - 0011 = 0010 with cout = 1 (no borrow); 0011 - 0101 = 1110 with cout = 0 (borrow).',
      'Overflow: 0111 + 0001 -> overflow = 1 (7+1 wraps to -8); 1000 + 1111 -> overflow = 1 (-8 + -1 wraps).',
      'No-overflow sanity: 1111 + 0001 -> overflow = 0 (signed -1 + 1 = 0) though cout = 1.',
      'Mode toggle: same operands under mode=0 and mode=1 produce complementary arithmetic (a+b vs a-b).',
    ],
    expectedResults:
      'All full-adder rows match the truth table; add-mode vectors return the unsigned sums with correct carry-out; subtract-mode vectors return exact differences with cout encoding no-borrow/borrow; the two wrap cases flag overflow while the -1+1 case does not. The datapath contains exactly: 4 XORs (mode layer), 4 full adders (each 2 XOR + 2 AND + 1 OR), and one overflow XOR.',
    troubleshooting: [
      'Subtraction off by one: cin was not connected to mode — a + NOT(b) alone computes a - b - 1.',
      'Overflow never asserts: the overflow tap used the wrong pair — it must be c3 (carry INTO the MSB stage) XOR cout (carry OUT of it); also confirm calc4 instantiates the four full adders directly so those carries exist as named wires.',
      'Result reversed per bit: b_eff XOR used {mode} scalar instead of {4{mode}} replication, or fa0..fa3 port order mixed positionally — use named connections.',
      'cout set on plain addition of small values: operands or result width truncated somewhere; keep 4-bit vectors intact end to end.',
      'Simulation shows x on result: some intermediate wire has no driver (usually an unconnected fa output) — every output port of every instance must be connected.',
    ],
    challengeId: 'ece-01-ripple-carry-adder',
  },
  {
    id: 'de-proj-gate-playground',
    title: 'Logic-Gate Playground: Truth Tables from NAND',
    level: 'beginner',
    summary:
      'Build all seven basic gates from NAND primitives in Verilog, then write a self-checking truth-table sweep that proves each construction — universality experienced hands-on.',
    useCase:
      'Standard-cell libraries are NAND/NOR fabrics. This project gives you the reflex of translating any Boolean expression into a NAND-only network and verifying it exhaustively — the same move synthesis tools perform on your RTL.',
    requirements: [
      'A single allowed primitive: nand2 (Verilog nand gate or ~(a & b) masked to one bit).',
      'Constructions of NOT, AND, OR, NOR, XOR, XNOR from nand2 only (no native and/or/xor gates in the build layer).',
      'A truth-table sweep that evaluates every construction on all input rows and compares against the reference gate.',
      'A written gate-count table: constructions and their NAND counts.',
      'One bonus construction of your own expression (e.g. majority) all-NAND.',
    ],
    learningOutcomes: [
      'Prove universality constructively rather than memorizing it.',
      'Trace multi-gate networks by naming every intermediate wire.',
      'Verify combinational logic exhaustively (2^n rows) as a habit.',
      'Count literals/gates and compare constructions for cost.',
    ],
    prerequisites: ['de-m03-l01', 'de-m03-l02', 'de-m03-l03'],
    architecture:
      '  verification harness\n  +------------------------------------------------------+\n  |  for a in 0..1, b in 0..1:                           |\n  |     ref    = native gate (a op b)                    |\n  |     built  = NAND-only construction                  |\n  |     assert ref == built   (all rows)                 |\n  +------------------------------------------------------+\n            ^                          ^\n            |                          |\n   +-----------------+        +---------------------+\n   | nand2 primitive |<-------| constructions:      |\n   +-----------------+        | NOT  (1 nand)       |\n                              | AND  (2 nands)      |\n                              | OR   (3 nands)      |\n                              | XOR  (4 nands)      |\n                              | NOR  (4 nands)      |\n                              | XNOR (5 nands)      |',
    steps: [
      {
        title: 'Define the primitive and the harness',
        detail:
          'Write nand2 once. The harness loops over all input combinations and compares each construction to the native operator — the loop is the proof.',
        code: '// The only gate allowed in the construction layer:\nmodule nand2(input wire a, input wire b, output wire y);\n    nand g (y, a, b);\nendmodule',
      },
      {
        title: 'Build NOT and AND',
        detail:
          'NOT = NAND(a,a) (1 gate). AND = NAND(a,b) followed by a NAND-inverter (2 gates). Verify on both rows where it matters: (0,1) and (1,1).',
        code: 'wire n_ab, y_and;\nnand2 g1 (n_ab,  a,   b);\nnand2 g2 (y_and, n_ab, n_ab);   // inverter restores AND',
      },
      {
        title: 'Build OR via De Morgan',
        detail:
          'OR = NAND(NOT a, NOT b): two tied-input NANDs feeding a third (3 gates total). Verify rows (0,0) and (0,1).',
        code: 'wire na, nb, y_or;\nnand2 g1 (na,   a,  a);   // NOT a\nnand2 g2 (nb,   b,  b);   // NOT b\nnand2 g3 (y_or, na, nb);  // NAND(na, nb) = a OR b',
      },
      {
        title: 'Build XOR with the four-gate network',
        detail:
          'n1 = NAND(a,b); n2 = NAND(a,n1); n3 = NAND(n1,b); y = NAND(n2,n3). Trace all four rows through every wire — this is Module 3\'s guided exercise made permanent.',
        code: 'wire n1, n2, n3, y_xor;\nnand2 g1 (n1,   a,  b);\nnand2 g2 (n2,   a,  n1);\nnand2 g3 (n3,   n1, b);\nnand2 g4 (y_xor, n2, n3);',
      },
      {
        title: 'Build NOR and XNOR',
        detail:
          'NOR = OR followed by NAND-inverter (4 gates); XNOR = XOR followed by inverter (5 gates). Alternatively derive XNOR as NAND(NOT n2, NOT n3) style reshuffles — any correct network counts.',
      },
      {
        title: 'Bonus: majority3 all-NAND',
        detail:
          'y = ab + bc + ca. Convert with De Morgan: y = NOT(NAND-form) — build it, count your gates, and verify all 8 rows. Compare your count with a classmate\'s; Module 4 explains why several counts can all be minimal-looking.',
      },
    ],
    starterCode: {
      title: 'Playground skeleton',
      language: 'verilog',
      code:
        'module nand2(input wire a, input wire b, output wire y);\n    nand g (y, a, b);\nendmodule\n\nmodule playground(\n    input  wire a,\n    input  wire b,\n    output wire y_not,\n    output wire y_and,\n    output wire y_or,\n    output wire y_xor\n);\n    wire t1, t2, t3;\n\n    // NOT: 1 gate\n    nand2 g_not (y_not, a, a);\n\n    // AND: 2 gates\n    nand2 g_a1  (t1,    a, b);\n    nand2 g_a2  (y_and, t1, t1);\n\n    // TODO: OR (3 gates) using t2 for NOT a, t3 for NOT b\n    assign y_or  = 1\'b0;   // replace with nand2 constructions\n\n    // TODO: XOR (4 gates)\n    assign y_xor = 1\'b0;   // replace\nendmodule',
      explanation: [
        'nand2 wraps the Verilog primitive so the construction layer only ever calls one gate.',
        'NOT and AND are provided as worked examples of the pattern: intermediate wires named, gates numbered.',
        'The OR and XOR TODOs correspond to steps 3 and 4; each is a small copy-paste-modify of the provided pattern.',
      ],
    },
    testPlan: [
      'Sweep a,b over all 4 rows for every construction; each must equal its native operator exactly.',
      'XOR spot rows: (0,0) -> 0 and (1,1) -> 0 catch the most common mis-wiring.',
      'NOR must output 1 on exactly one row (0,0) — a distinctive signature.',
      'XNOR must output 1 on the two equal rows.',
      'Bonus majority: verify all 8 rows of (a,b,c) against (a&b)|(b&c)|(a&c).',
      'Gate-count audit: recount each construction and record it in the table; a construction using more NANDs than planned usually hides an extra inverter.',
    ],
    expectedResults:
      'Every construction matches its native gate on all rows; the gate-count table reads NOT=1, AND=2, OR=3, XOR=4, NOR=4, XNOR=5 (typical). The playground demonstrates universality as a proven fact: six different functions, one primitive.',
    troubleshooting: [
      'AND outputs inverted: the second NAND (inverter) is missing or tied to the wrong wire.',
      'XOR wrong on rows (0,0)/(1,1) only: n2/n3 inputs swapped — check which gate consumes n1.',
      'OR stuck at 0: the input inverters were skipped; NAND(na, nb) needs both NOTs.',
      'Multiple drivers error: two gates driving the same wire — one wire per gate output, always.',
      'Sweep shows x: an intermediate wire was declared but never driven.',
    ],
  },
  {
    id: 'de-proj-adder-buildup',
    title: 'Half Adder to Full Adder: A Build-Up in Three Verifications',
    level: 'beginner',
    summary:
      'Grow a working 1-bit arithmetic cell in stages — half adder, full adder from two half adders, and the check that the composed version equals the direct equations — practicing structural composition and incremental verification.',
    useCase:
      'Real datapaths are built exactly this way: verified small blocks composed into larger ones, with each composition re-verified against an independent reference. This project drills the workflow you will use on every RTL block afterwards.',
    requirements: [
      'Stage 1: half_adder with sum = a XOR b, carry = a AND b, verified on 4 rows.',
      'Stage 2: full_adder_direct with the two direct equations, verified on 8 rows.',
      'Stage 3: full_adder_composed built from two half_adders plus one OR gate, verified equal to stage 2 on all 8 rows.',
      'A stated equivalence argument: why the composition must equal the direct form.',
      'A list of which carry wires are intermediate in the composed version.',
    ],
    learningOutcomes: [
      'Compose verified blocks structurally instead of rewriting logic.',
      'Prove compositional equivalence by exhaustive comparison.',
      'Recognize the full adder as a decomposition: sum path (two XORs) and carry path (majority).',
      'Practice the verify-each-stage workflow used in every real design.',
    ],
    prerequisites: ['de-m05-l01', 'de-m03-l04'],
    architecture:
      '  STAGE 3: full adder from two half adders\n\n       a --+-->[HA1]-- s1 --+-->[HA2]-- sum\n       b --+        |      +-->         |\n                    | carry1            | carry2\n                    +-------->[OR]------cout\n                                  ^\n                               cin\n\n  HA1: (s1, c1) = a + b      HA2: (sum, c2) = s1 + cin\n  cout = c1 OR c2',
    steps: [
      {
        title: 'Stage 1: half adder',
        detail:
          'Two gates. Verify the 4-row table; pay attention to (1,1) -> sum=0, carry=1 — the row people mispredict.',
        code: 'module half_adder(\n    input  wire a,\n    input  wire b,\n    output wire sum,\n    output wire carry\n);\n    assign sum   = a ^ b;\n    assign carry = a & b;\nendmodule',
      },
      {
        title: 'Stage 2: direct full adder (the reference)',
        detail:
          'Write the direct equations from the 8-row table. This module is the REFERENCE the composed version must match — keep it untouched after verification.',
        code: 'module full_adder_direct(\n    input  wire a,\n    input  wire b,\n    input  wire cin,\n    output wire sum,\n    output wire cout\n);\n    assign sum  = a ^ b ^ cin;\n    assign cout = (a & b) | (cin & (a ^ b));\nendmodule',
      },
      {
        title: 'Stage 3: composed full adder',
        detail:
          'Instantiate two half_adders: HA1 on (a, b), HA2 on (HA1.sum, cin). cout = HA1.carry OR HA2.carry. Name the intermediate wires s1, c1, c2.',
        code: 'module full_adder_composed(\n    input  wire a,\n    input  wire b,\n    input  wire cin,\n    output wire sum,\n    output wire cout\n);\n    wire s1, c1, c2;\n\n    half_adder ha1 (.a(a),  .b(b),   .sum(s1),  .carry(c1));\n    half_adder ha2 (.a(s1), .b(cin), .sum(sum), .carry(c2));\n\n    assign cout = c1 | c2;\nendmodule',
      },
      {
        title: 'Equivalence check: all 8 rows',
        detail:
          'For every (a,b,cin) verify full_adder_direct == full_adder_composed on both outputs. The algebra behind it: cout = ab + (a XOR b)cin is exactly c1 OR c2 since c1 = ab and c2 = (a XOR b)cin are never 1 simultaneously.',
      },
      {
        title: 'Trace the worst-case row',
        detail:
          'Row (1,1,1): s1 = 0, c1 = 1; HA2: sum = 0 XOR 1 = 1, c2 = 0; cout = 1. Confirm both modules agree — this row exercises every gate.',
      },
      {
        title: 'Reflect: cost of each version',
        detail:
          'Direct: 2 XOR + 2 AND + 1 OR (5 gates, depth 2). Composed: same gate count via two HA sub-blocks (depth 3 counting HA internals as 2). Discuss when structural composition wins (reuse, readability) vs when flat equations win (depth).',
      },
    ],
    starterCode: {
      title: 'Stage skeleton',
      language: 'verilog',
      code:
        'module half_adder(\n    input  wire a,\n    input  wire b,\n    output wire sum,\n    output wire carry\n);\n    assign sum   = a ^ b;\n    assign carry = a & b;\nendmodule\n\nmodule full_adder_composed(\n    input  wire a,\n    input  wire b,\n    input  wire cin,\n    output wire sum,\n    output wire cout\n);\n    wire s1, c1, c2;\n\n    // TODO: two half_adder instances + one OR\n    assign sum  = 1\'b0;   // replace\n    assign cout = 1\'b0;   // replace\nendmodule',
      explanation: [
        'Stage 1 is provided complete; stage 3 is the composition exercise.',
        'The intermediate wires s1, c1, c2 are pre-declared so the instance wiring is the only work.',
        'Keep full_adder_direct (step 2) in a separate file as the frozen reference for the equivalence check.',
      ],
    },
    testPlan: [
      'Half adder: all 4 rows match (sum = XOR, carry = AND).',
      'Direct full adder: all 8 rows match the truth table.',
      'Composed vs direct: both outputs equal on all 8 rows.',
      'Worst-case row (1,1,1): both versions give sum=1, cout=1.',
      'Independence check: change cin only (a,b fixed at 0,0) and confirm sum follows cin in both versions.',
    ],
    expectedResults:
      'All three stages verified; the composed and direct full adders are indistinguishable on every row. The gate inventory of the composed version: two half adders (2 XOR + 2 AND total) plus one OR gate; intermediate wires s1, c1, c2.',
    troubleshooting: [
      'cout stuck at 0 for row (1,1,0): the OR gate is missing or c1 is unconnected.',
      'sum wrong when cin=1: HA2 inputs took (a, cin) instead of (s1, cin).',
      'Equivalence fails on exactly two rows: usually c1/c2 swapped into the OR in either order — they are symmetric, so check the HA2 input order instead.',
      'Multiple-driver error: a wire (e.g. s1) assigned both by an instance and an assign — pick one driver.',
      'Reference results changed mid-project: stage 2 was "improved"; restore it — references must stay frozen.',
    ],
    challengeId: 'ece-04-half-adder',
  },
  {
    id: 'de-proj-modulo-n-counter',
    title: 'Design a Modulo-N Digital Counter',
    level: 'intermediate',
    summary:
      'Design and verify a synchronous modulo-N counter (worked at N=6 and N=10) with synchronous wrap, terminal-count output and enable — the timing backbone of every digital system, from baud rates to digital clocks.',
    useCase:
      'Baud-rate generators, PWM timers, debouncers, digital clock chips and address sequencers are all modulo-N counters. This project assembles the Module 6 counter theory into a parameterized, reusable block with a full verification story.',
    requirements: [
      'A synchronous counter with shared clock and async active-low reset to 0.',
      'A clock enable input (count advances only when enable is high; hold otherwise).',
      'A parameter N (work N=6 and N=10); the counter cycles exactly N states: 0 .. N-1.',
      'A terminal output asserting during the last state (N-1), usable as a cascade enable.',
      'Synchronous wrap: state N must never exist, even transiently.',
      'A verification table enumerating one full period plus the wrap edge.',
    ],
    learningOutcomes: [
      'Apply the terminal-count compare-and-wrap pattern for arbitrary N.',
      'Keep wrap transitions synchronous so illegal states never exist.',
      'Cascade counters via terminal outputs on a shared clock.',
      'Enumerate and verify a complete state sequence including boundaries.',
    ],
    prerequisites: ['de-m06-l02', 'de-m06-l04'],
    architecture:
      '                 +---------------------------+\n   clk ----------|>                          |\n   rst_n --------|  counter reg  [W-1:0]     |---- count[W-1:0]\n   enable -------|                           |\n                 |  next = terminal ? 0      |\n                 |        : count + 1        |\n                 |  terminal = (count == N-1)|---- terminal\n                 +---------------------------+\n\n   W = bits needed for N-1 (N=6 -> 3 bits; N=10 -> 4 bits)\n\n   cascade (e.g. seconds -> minutes):\n     units counter.terminal ----> tens counter.enable\n     (both share clk and rst_n)',
    steps: [
      {
        title: 'Fix the width and the sequence',
        detail:
          'For N=6: 3 bits, states 0..5. For N=10: 4 bits, states 0..9. Write the full sequence table including the wrap row (5 -> 0 or 9 -> 0) BEFORE coding — the table is the specification.',
      },
      {
        title: 'Write the counter core',
        detail:
          'One clocked block: async reset to 0; on enable, terminal ? 0 : count + 1. Note the wrap is INSIDE the clocked block — state N never exists.',
        code: 'module counter_mod_n #(\n    parameter N = 10\n)(\n    input  wire                  clk,\n    input  wire                  rst_n,\n    input  wire                  enable,\n    output reg  [$clog2(N)-1:0]  count,\n    output wire                  terminal\n);\n    assign terminal = (count == N - 1);\n\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n)\n            count <= 0;\n        else if (enable) begin\n            if (terminal)\n                count <= 0;          // synchronous wrap\n            else\n                count <= count + 1;\n        end\n        // else hold\n    end\nendmodule',
      },
      {
        title: 'Sanity-check N=16 (the free case)',
        detail:
          'Instantiate with N=16 and confirm it behaves as a plain 4-bit binary counter — terminal = (count == 15). This anchors the parameterized logic to the textbook case.',
      },
      {
        title: 'Verify N=6 and N=10 sequences',
        detail:
          'Trace one full period plus the wrap edge for each N: 0,1,2,3,4,5,0... and 0..9,0... Confirm exactly N states per period and that terminal asserts only on the last state.',
      },
      {
        title: 'Cascade two stages',
        detail:
          'Build a mod-60 seconds/minutes pair: units = counter_mod_n#(N=10), tens = counter_mod_n#(N=6), tens.enable = units.terminal. Verify the combined 00..59 wrap at the shared clock.',
        code: '// cascade sketch\nwire units_term;\ncounter_mod_n #(.N(10)) units (.clk(clk), .rst_n(rst_n),\n                               .enable(run), .terminal(units_term));\ncounter_mod_n #(.N(6))  tens  (.clk(clk), .rst_n(rst_n),\n                               .enable(units_term));',
      },
      {
        title: 'Timing note (bridge to Module 8)',
        detail:
          'The terminal compare is combinational logic on the count register; the wrap mux sits in front of D. At 100 MHz this is comfortably shallow — but write down the path ledger (t_cq + compare + mux + t_su) as practice for the timing course.',
      },
    ],
    starterCode: {
      title: 'Counter skeleton with N as a parameter',
      language: 'verilog',
      code:
        'module counter_mod_n #(\n    parameter N = 10\n)(\n    input  wire                  clk,\n    input  wire                  rst_n,\n    input  wire                  enable,\n    output reg  [3:0]            count,   // TODO: width via $clog2(N)\n    output wire                  terminal\n);\n    // TODO: terminal = (count == N-1)\n    assign terminal = 1\'b0;   // replace\n\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n)\n            count <= 4\'d0;\n        else if (enable) begin\n            // TODO: synchronous wrap at terminal, else increment\n            count <= count + 4\'d1;\n        end\n    end\nendmodule',
      explanation: [
        'The parameter N makes one module serve mod-6, mod-10 and mod-16 — parameterization is the reusable-block habit.',
        'The TODO in the clocked block is the entire wrap logic: one if on terminal.',
        'The count width TODO matters for synthesis quality: $clog2(N) bits are the honest minimum.',
      ],
    },
    testPlan: [
      'Reset behavior: rst_n low forces count = 0 immediately (async) — check before the first clock edge.',
      'Enable hold: with enable = 0 for 3 cycles, count unchanged.',
      'N=16: full 0..15 cycle, terminal only at 15, wrap to 0.',
      'N=10: 0..9 cycle, terminal only at 9, wrap synchronous (state 10 never observed).',
      'N=6: 0..5 cycle, terminal only at 5.',
      'Cascade mod-60: after units wraps 9 -> 0, tens increments on the SAME edge; combined sequence 00..59 with a single wrap edge.',
      'Boundary torture: hold the counter at terminal with enable high — it must wrap every cycle (terminal -> 0 -> 1 ...), never stick or skip.',
    ],
    expectedResults:
      'Each N produces exactly N states per period with terminal asserting on the last state only; wraps are synchronous (no transient state N); cascaded stages carry on one shared clock; the parameterized module is proven at three values of N with one code base.',
    troubleshooting: [
      'Counter skips 0: wrap used asynchronous clear on compare — move the wrap inside the clocked block.',
      'Period is N+1: terminal compares against N instead of N-1, or the sequence starts at 1.',
      'Cascade never advances tens: units.terminal not connected to tens.enable, or terminal decodes the wrong constant.',
      'Width truncation warnings: count literal widths (4\'d...) disagree with the parameter width — size literals from N.',
      'Hold not holding: the enable if-chain reorders reset/enable/wrap incorrectly — reset must be first, enable second, terminal inside enable.',
    ],
  },
];
