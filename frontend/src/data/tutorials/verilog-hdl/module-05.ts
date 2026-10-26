import type { TutorialLesson } from '../types';

// Module 05 — Continuous Assignments
export const module05Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m05-l1',
    title: 'assign Semantics: Dataflow Modelling',
    summary:
      'Master the continuous assignment — Verilog’s purest way to say "this wire IS this function" — and build gate networks with it.',
    objectives: [
      'State the three semantic properties of assign: continuous, stateless, single-driver.',
      'Compose multi-gate functions from nested expressions and intermediate nets.',
      'Write a spec → equation → code → truth-table workflow for small combinational blocks.',
      'Sketch a simulation-only testbench that sweeps a truth table.',
    ],
    whyItMatters:
      'Dataflow modelling is the clearest way to describe combinational hardware: one assign per wire, the code reads like the schematic. Most professional combinational logic is either dataflow or a structured always block; knowing exactly what assign promises (and what it forbids) keeps you on the right side of the line, and gives you the vocabulary to recognize when a colleague’s "clever" always block is just an assign in disguise.',
    prerequisites: ['vlog-m02-l3', 'vlog-m03-l1', 'vlog-m04-l3'],
    explanation:
      'A **continuous assignment** has the form `assign <net> = <expression>;`. Three properties define it:\n\n1. **Continuous** — the assignment is always in effect. Whenever any signal on the right-hand side changes, the expression is re-evaluated and the net updated, forever. There is no "when" to it: no clock, no trigger, no ordering.\n2. **Stateless** — an assign has no memory of past values. It cannot remember, count or wait; it is a pure function of its current inputs, realized as wires and gates. If you need state, you need registers (module 09).\n3. **Single-driver** — each net gets exactly ONE continuous driver. Two assigns to the same wire is a multiple-driver conflict (module 15); the one exception is deliberately tri-state modeling with z.\n\nThe targets must be nets (`wire`) — this is why module 02 insisted on `output wire` for assign-driven ports. The right-hand side is any synthesizable expression: the operators of module 04 compose freely, so a single assign can describe a whole gate network: `assign y = (a & b) | (~c & d);` is four gates in one line.\n\n### Spec → equation → code → table\n\nProfessional combinational design follows a fixed rhythm: **(1)** write the specification in words; **(2)** derive the Boolean equation or truth table; **(3)** code one assign per output, with intermediate nets for shared terms; **(4)** verify by completing the truth table row by row. This lesson applies the rhythm to gates, adders, muxes, decoders and comparators — by the end, it will be reflex.',
    deepDive:
      '### Intermediate nets as named gates\n\nComplex expressions get unreadable fast: `y = (a & b) | (~c & d) | (b & ~d & e);` hides its structure. The professional style names each shared sub-expression with an intermediate wire — `wire ab = a & b;` — then ORs the named pieces. Synthesis produces identical hardware (the intermediate names vanish into net names), but human reviewers can compare each assign against the spec equation. Readability of RTL is a functional requirement, not aesthetics: designs live for years and are read dozens of times after being written once.\n\n### What assign CANNOT do\n\nThree hard limits shape when to leave dataflow style: an assign cannot contain procedural statements (no if/case — those live in always blocks, module 06); it cannot target a reg; and it cannot describe behavior that depends on *sequence* ("first sample, then compare") — sequence needs registers. A useful smell test: if your assign nest is deeper than three levels or repeats a long sub-expression twice, switch to named intermediate nets — or to a combinational always block with if/case for genuinely priority-flavored logic.\n\n### Delays on assigns are simulation-only\n\n`assign #2 y = a & b;` adds 2 time units of *inertial* delay in simulation — a modeling tool for gate-level timing, never a design feature. Synthesis ignores the number entirely (or errors). The habit to build: zero-delay assigns in RTL, delays only in testbenches and gate-level netlist models.',
    examples: [
      {
        title: 'A 4-input function built in order: spec, equation, code, table',
        language: 'verilog',
        code:
          '// func4.v — y = 1 when (a AND b) OR (NOT c AND d)\n// Spec:      y is high when a and b are both high,\n//            or when c is low and d is high.\n// Equation:  y = ab + c\'d\nmodule func4(\n    input  wire a,\n    input  wire b,\n    input  wire c,\n    input  wire d,\n    output wire y\n);\n    // Named intermediate terms (optional but recommended):\n    wire ab   = a & b;      // AND gate\n    wire nc_d = (~c) & d;   // NOT + AND\n\n    assign y = ab | nc_d;   // OR of the two product terms\n\nendmodule',
        explanation: [
          'The spec sentence and the header comment carry the same information as the code — future reviewers check code against comment, not against memory.',
          '`wire ab = a & b;` — a net declared AND initialized with its driver: shorthand for a declaration plus an assign. One gate, one name.',
          '`assign y = ab | nc_d;` — the top-level OR, wired from the two named terms.',
          'Hardware reading: two AND gates (one preceded by an inverter) feeding one OR gate.',
          'Verification sample rows: (a,b,c,d)=(1,1,0,0): ab=1 → y=1. (0,0,1,1): ab=0, nc_d = 0&1 = 0 → y=0. (0,0,0,1): ab=0, nc_d = 1&1 = 1 → y=1.',
        ],
      },
      {
        title: 'Truth-table sweep testbench (simulation-only)',
        language: 'verilog',
        code:
          '// tb_func4.v — simulation-only sweep of the 16 input rows\n`timescale 1ns/1ps\nmodule tb_func4;\n    reg  a, b, c, d;      // stimulus registers\n    wire y;               // observed output\n    integer i;            // loop variable (sim-only)\n\n    func4 dut (.a(a), .b(b), .c(c), .d(d), .y(y));\n\n    initial begin\n        // Sweep all 16 rows by decoding i into the four inputs.\n        for (i = 0; i < 16; i = i + 1) begin\n            {a, b, c, d} = i[3:0];   // i as the 4-bit stimulus vector\n            #1;                       // let the gates settle\n            $display("abcd=%b%b%b%b y=%b", a, b, c, d, y);\n        end\n        $finish;\n    end\nendmodule',
        explanation: [
          'This testbench is SIMULATION-ONLY: the initial block, for loop, #1 delays and $display would never be synthesized.',
          'The loop enumerates i = 0..15; the concatenation {a,b,c,d} = i[3:0] unpacks the counter into the four stimulus bits (a gets the MSB).',
          '#1 before each display lets the assign network settle, so the printed y is the settled answer for that row (module 01 habit).',
          'Sample expected rows (y = ab + c\'d): i=12, inputs 1100 → ab=1, y=1. i=3, inputs 0011 → ab=0, c\'d=0 (c=1), y=0. i=5, inputs 0101 → ab=0, c\'d=1 (c=0, d=1), y=1. i=2, inputs 0010 → ab=0, c\'d=0 (c=1, d=0), y=0. Every printed row follows from the equation.',
          'This pattern — loop, unpack, settle, display — becomes the self-checking testbench of module 14 once an expected-value model is added.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'func4 as a schematic — each assign is a gate',
        content:
          '   a ----\\\n         AND ----- ab --\\\n   b ----/               \\\n                          OR ----- y\n   c --[NOT]--\\          /\n               AND -----/\n   d ----------/\n\n   Reading order matches code order:\n     wire ab   = a & b      -> the upper AND gate\n     wire nc_d = ~c & d     -> inverter + lower AND\n     assign y = ab | nc_d   -> the OR gate',
        caption:
          'Dataflow code and schematic are isomorphic: one assign per named gate. This is why dataflow style reviews so well.',
      },
    ],
    tables: [
      {
        caption: 'func4 selected verification rows (y = ab + c\'d)',
        headers: ['a', 'b', 'c', 'd', 'ab', "c'd", 'y'],
        rows: [
          ['1', '1', '0', '0', '1', '0', '1'],
          ['0', '0', '1', '1', '0', '0', '0'],
          ['0', '0', '0', '1', '0', '1', '1'],
          ['0', '1', '0', '1', '0', '1', '1'],
          ['1', '0', '1', '1', '0', '0', '0'],
        ],
      },
      {
        caption: 'assign rules at a glance',
        headers: ['Question', 'Answer'],
        rows: [
          ['Target type?', 'Net (wire) only — never reg'],
          ['Re-evaluated when?', 'Whenever any RHS signal changes — always'],
          ['Multiple assigns per net?', 'One continuous driver only (z for tri-state sharing)'],
          ['Contains if/case?', 'No — use a combinational always block instead'],
          ['Delays meaningful in synthesis?', 'No — #delays are simulation-only'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assigning the same wire from two assigns "because both equations are sometimes valid".',
        fix:
          'One net, one continuous driver. If outputs must merge conditionally, that is a mux: `assign y = sel ? f_expr : g_expr;` — a single assign whose condition chooses the source.',
      },
      {
        mistake: 'Trying to put an if inside an assign (assign y = if (s) ...).',
        fix:
          'assign takes an expression, not statements. For 2-way selection use the conditional operator (s ? a : b); for multi-way priority logic use a combinational always block (module 06) with the output declared reg.',
      },
      {
        mistake: 'Adding #delays to design assigns to "make timing realistic".',
        fix:
          'Synthesis ignores (or rejects) assign delays — your gate-level result will differ from the simulation. Keep RTL zero-delay; timing realism belongs to gate-level netlist simulation and static timing analysis.',
      },
    ],
    guidedPractice: {
      title: 'Spec to dataflow, end to end',
      brief:
        'Design module alarm(input wire door, input wire window, input wire armed, output wire siren) with the spec: the siren rings when armed AND (door OR window) is open. Write the spec sentence as a Boolean equation, implement with at most two assigns (one intermediate net allowed), and verify rows (armed,door,window) = (1,1,0), (1,0,0), (0,1,1).',
      expectedBehavior:
        'Equation: siren = armed & (door | window). Code: wire breach = door | window; assign siren = armed & breach; — or a single assign with parentheses. Verification: (1,1,0): breach=1, armed=1 → 1. (1,0,0): breach=0 → 0. (0,1,1): breach=1, armed=0 → 0. The alarm only sounds when the system is armed.',
      hints: [
        'Parenthesize the OR: AND binds tighter than OR in the spec’s meaning.',
        'Each verification row: evaluate the inner OR first, then the AND.',
      ],
    },
    practiceExercises: [
      {
        title: 'Nested expression to named nets',
        brief:
          'Rewrite `assign y = (a & b & c) | (a & b & ~d) | (~a & c);` using at least one shared intermediate net, and identify the repeated sub-expression.',
        expectedBehavior:
          'The term (a & b) is shared by the first two product terms: wire ab = a & b; assign y = (ab & c) | (ab & ~d) | (~a & c);. Optionally factor further: y = (ab & (c | ~d)) | (~a & c) — same truth table, two fewer gate inputs.',
        hints: [
          'Look for the factor common to two product terms.',
          'Boolean factoring (ab·c + ab·d\' = ab·(c + d\')) is free area savings in hardware.',
        ],
      },
      {
        title: 'Diagnose the illegal assign',
        brief:
          'Which of these are legal, and why: (1) assign x = a ? b : c; (2) reg r; initial r = 0; assign x = r; (3) assign x = #3 a & b; (4) two assigns both targeting x in one module?',
        expectedBehavior:
          '(1) Legal — conditional operator in an expression. (2) Legal but style-suspicious: reading a reg in an assign is fine (regs can be read); the initial is sim-only. (3) Syntactically legal, simulation-only delay — synthesis ignores/rejects it; not for design RTL. (4) Illegal in design: two continuous drivers on one net conflict (simulation resolves differing values to x; synthesis errors).',
        hints: [
          'Ask for each: is it an expression? does hardware have a meaning for it?',
          'One net, one continuous driver — tri-state z is the only sanctioned exception.',
        ],
      },
    ],
    assessment: {
      title: 'Module 05 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'When is the right-hand side of an assign re-evaluated?',
          options: [
            'Whenever any signal on the right-hand side changes — continuously, forever',
            'Once at time zero',
            'On every rising clock edge',
            'When the assigned wire is read',
          ],
          answer: 'Whenever any signal on the right-hand side changes — continuously, forever',
          explanation:
            'Continuity is the defining property: the assign is a standing relationship, re-evaluated on every relevant change with no trigger or clock involved.',
          hint: 'Recall the hardware-never-stops principle from module 01.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'An assign statement can target a reg if the reg is declared inside the same module.',
          answer: 'false',
          explanation:
            'Continuous assignments drive nets (wire). Procedural targets (reg) are assigned inside initial/always blocks. Mixing driver families on one object is illegal.',
          hint: 'wire for assign, reg for procedural — module 03’s decision table.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'For func4 (y = (a & b) | (~c & d)), what is y when a=0, b=1, c=0, d=1?',
          code:
            'assign y = (a & b) | (~c & d);\n// a=0, b=1, c=0, d=1',
          options: ['1', '0', 'x', 'z'],
          answer: '1',
          explanation:
            'First term: 0 & 1 = 0. Second term: ~0 & 1 = 1 & 1 = 1. OR: 0 | 1 = 1. The c\'d term fires because c is low and d is high.',
          hint: 'Evaluate both product terms, then OR them.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Which construct is ILLEGAL inside an assign statement?',
          options: ['The conditional operator ?:', 'An if/else statement', 'A concatenation {a, b}', 'A reduction |bus'],
          answer: 'An if/else statement',
          explanation:
            'assign takes a single expression. if/else are procedural statements belonging to always blocks; everything else listed is an expression operator and legal.',
          hint: 'Expression vs statement — assign only accepts the former.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'In the sweep testbench, why does the loop wait #1 before each $display?',
          answer: 'To let the combinational outputs settle',
          explanation:
            'After stimulus changes, the continuous assignments update in the same time step; displaying immediately can print stale or x values. One time step of settling makes every printed row trustworthy.',
          hint: 'Continuous-assignment updates are scheduled events (module 01/07).',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Continuous assignment', definition: 'assign net = expression; a permanent, stateless combinational driver re-evaluated on every RHS change.' },
      { term: 'Dataflow modelling', definition: 'Describing hardware as Boolean equations between nets — one assign per relationship.' },
      { term: 'Intermediate net', definition: 'A named wire holding a shared sub-expression, improving readability without changing hardware.' },
      { term: 'Single driver', definition: 'The rule that one net has exactly one continuous driver; violations conflict or create x.' },
      { term: 'Inertial delay', definition: 'Simulation-only delay on an assign; pulses shorter than the delay are absorbed. Not a synthesis construct.' },
    ],
    revisionSummary: [
      'assign = continuous + stateless + single-driver; targets are nets.',
      'One assign per wire; shared sub-expressions become named intermediate nets.',
      'The design rhythm: spec in words → Boolean equation → code → row-by-row truth-table verification.',
      'assign accepts expressions only — ?: for selection, always blocks for if/case logic.',
      'Delays on assigns are simulation-only; design RTL stays zero-delay.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
      { label: 'All About Circuits — Digital textbook', url: 'https://www.allaboutcircuits.com/textbook/digital/', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'vlog-m05-l2',
    title: 'Building Adders from Assignments',
    summary:
      'Design the half adder, full adder and 4-bit ripple-carry adder in dataflow style — the classic first datapath, and the template for ALUs.',
    objectives: [
      'Derive half-adder and full-adder equations from truth tables.',
      'Implement both in dataflow Verilog with named intermediate nets.',
      'Scale to a 4-bit ripple-carry adder two ways: structurally and with one wide addition.',
      'Verify an adder against arithmetic on every truth-table row.',
    ],
    whyItMatters:
      'The adder is thehello-world of datapaths and the seed of every ALU: multipliers, address generators, program counters all reduce to adders. More importantly, the exercise teaches the general method — truth table to equations to dataflow code to row-by-row verification — which is how all combinational blocks get designed. The linked challenges for this lesson let you run these circuits on the platform’s real Icarus Verilog evaluator.',
    prerequisites: ['vlog-m05-l1', 'vlog-m04-l1'],
    explanation:
      'A **half adder** adds two bits. Its truth table has four rows; reading the outputs as functions: sum is 1 exactly when the inputs DIFFER (XOR), carry is 1 exactly when BOTH are set (AND). Two gates, done:\n\n```\nsum   = a ^ b\ncarry = a & b\n```\n\nA **full adder** adds three bits (a, b, carry-in). The same read-off-the-table method gives sum = a^b^cin (XOR is odd-parity: sum is 1 when an odd number of inputs is 1) and cout = majority(a, b, cin) — 1 when at least two inputs are 1. The majority can be written several ways; the dataflow favorite keeps the shared term visible: cout = (a&b) | (p & cin) where p = a^b (note a&b | a&cin | b&cin collapses to this because p&cin covers the a&b&cin overlap twice — the OR absorbs it).\n\nA **4-bit ripple-carry adder** chains four full adders: each stage’s carry-out feeds the next stage’s carry-in. You can build it structurally (four full_adder instances — the hierarchy skill of module 02) or with ONE wide addition: `assign {cout, sum} = a + b + cin;` (module 04’s context-width rule). Both describe the same function; synthesis tools routinely build carry-lookahead or other fast structures from either. The structural form makes the ripple explicit and maps 1:1 to the challenge linked below.',
    deepDive:
      '### Why "ripple" and what it costs\n\nIn the ripple structure, stage 3’s correct answer is not available until stage 2’s carry has propagated through stage 2, which waited on stage 1, and so on — the carry ripples across the width. Each stage is fast (two gate levels), but the total delay grows linearly with width: a 64-bit ripple adder is roughly 64x the gate delay of one stage. Real ALUs use carry-lookahead or carry-select structures that compute carries in parallel at the cost of area; synthesis may restructure your `a + b` automatically. The RTL lesson: write the function clearly (`{cout,sum} = a + b + cin`), and let the tool choose the carry topology — but KNOW that the ripple structure is what the naive form implies, because in module 09 the clock period will have to accommodate it.\n\n### Verifying adders: don’t trust one row\n\nAn adder has a beautiful arithmetic oracle: expected = a + b + cin. A testbench that loops all 2^13 input combinations of a 4-bit adder (8 bits of operands + 1 carry = 512 rows) and compares against the oracle catches every equation typo. Manually, the discipline is checking the STRUCTURAL rows: all-zeros, all-ones, single-bit walks, and the boundary cases (0111+0001 crossing into 1000, 1111+0001 wrapping). Module 14 builds exactly this self-checking loop.',
    examples: [
      {
        title: 'Half adder and full adder, dataflow with named terms',
        language: 'verilog',
        code:
          '// half_adder.v\nmodule half_adder(\n    input  wire a,\n    input  wire b,\n    output wire sum,\n    output wire carry\n);\n    assign sum   = a ^ b;   // odd parity of two inputs\n    assign carry = a & b;   // both set\nendmodule\n\n// full_adder.v — dataflow with the shared XOR term named\nmodule full_adder(\n    input  wire a,\n    input  wire b,\n    input  wire cin,\n    output wire sum,\n    output wire cout\n);\n    wire p;                 // p = a ^ b : the shared propagate term\n\n    assign p    = a ^ b;\n    assign sum  = p ^ cin;         // odd parity of three inputs\n    assign cout = (a & b) | (p & cin);   // majority\n\nendmodule',
        explanation: [
          'Half adder: two assigns, two gates. sum = a^b (1 when inputs differ), carry = a&b (1 when both set).',
          'full_adder names the propagate term p = a^b because TWO equations use it — the shared-term discipline from lesson 1.',
          'sum = p ^ cin = a^b^cin: XOR is the odd-parity function, so sum is 1 when an odd number of (a, b, cin) are 1.',
          'cout = (a & b) | (p & cin): both-set case, plus propagate-with-carry case. Together they are the majority function.',
          'Trace (a,b,cin) = (1,0,1): p = 1, sum = 1^1 = 0, cout = (1&0) | (1&1) = 0|1 = 1. Arithmetic check: 1+0+1 = 2 = 10₂ → sum 0 carry 1. Correct.',
        ],
      },
      {
        title: '4-bit ripple-carry adder: structural and one-line forms',
        language: 'verilog',
        code:
          '// adder4_struct.v — four full adders chained (explicit ripple)\nmodule adder4_struct(\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    input  wire       cin,\n    output wire [3:0] sum,\n    output wire       cout\n);\n    wire c1, c2, c3;   // internal carry chain\n\n    full_adder fa0 (.a(a[0]), .b(b[0]), .cin(cin), .sum(sum[0]), .cout(c1));\n    full_adder fa1 (.a(a[1]), .b(b[1]), .cin(c1),  .sum(sum[1]), .cout(c2));\n    full_adder fa2 (.a(a[2]), .b(b[2]), .cin(c2),  .sum(sum[2]), .cout(c3));\n    full_adder fa3 (.a(a[3]), .b(b[3]), .cin(c3),  .sum(sum[3]), .cout(cout));\n\nendmodule\n\n// adder4_wide.v — one wide addition (same function)\nmodule adder4_wide(\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    input  wire       cin,\n    output wire [3:0] sum,\n    output wire       cout\n);\n    // 5-bit LHS context: the carry survives (module 04 rule).\n    assign {cout, sum} = a + b + cin;\n\nendmodule',
        explanation: [
          'Structural form: four full_adder instances; the internal wires c1..c3 ARE the ripple chain. Bit 0 consumes the external cin; each next stage consumes the previous carry.',
          'Wide form: one line. The 5-bit left-hand side {cout, sum} gives the addition a 5-bit context, so no carry is lost.',
          'Both describe the identical function — trace one row on both: a = 0111 (7), b = 0001 (1), cin = 0. Structural: fa0: 1+1 = sum 0, carry 1; fa1: 1+0+1 = sum 0, carry 1; fa2: 1+0+1 = sum 0, carry 1; fa3: 0+0+1 = sum 1, carry 0. Result sum = 1000 (8), cout = 0. Wide: 7+1+0 = 8 = 0_1000. Agreement.',
          'Overflow row: a = 1111 (15), b = 0001 (1), cin = 0 → 16 = 1_0000: sum = 0000, cout = 1 on both forms.',
          'In synthesis the wide form may be restructured into a faster carry topology; the structural form documents the ripple explicitly. Same behavior, different hints to the tool.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Ripple-carry structure of adder4',
        content:
          '   a[0] b[0] cin        a[1] b[1]         a[2] b[2]         a[3] b[3]\n      \\   /   |            \\   /             \\   /             \\   /\n      FA0     |            FA1               FA2               FA3\n      / \\     |            / \\               / \\               / \\\n   sum[0] c1--+--------- sum[1] c2 -------- sum[2] c3 ------- sum[3]  cout\n\n   carry chain: cin -> FA0 -> FA1 -> FA2 -> FA3 -> cout\n   (the "ripple": stage 3 waits on the whole chain)',
        caption:
          'Each FA is the dataflow full adder above; the internal wires c1..c3 are the carry chain that limits speed.',
      },
    ],
    tables: [
      {
        caption: 'Half adder truth table',
        headers: ['a', 'b', 'sum', 'carry'],
        rows: [
          ['0', '0', '0', '0'],
          ['0', '1', '1', '0'],
          ['1', '0', '1', '0'],
          ['1', '1', '0', '1'],
        ],
      },
      {
        caption: 'Full adder truth table with intermediate p = a^b',
        headers: ['a', 'b', 'cin', 'p', 'sum', 'cout'],
        rows: [
          ['0', '0', '0', '0', '0', '0'],
          ['0', '0', '1', '0', '1', '0'],
          ['0', '1', '0', '1', '1', '0'],
          ['0', '1', '1', '1', '0', '1'],
          ['1', '0', '0', '1', '1', '0'],
          ['1', '0', '1', '1', '0', '1'],
          ['1', '1', '0', '0', '0', '1'],
          ['1', '1', '1', '0', '1', '1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing cout = a & b | cin (missing the two-input cases).',
        fix:
          'Carry-out is a MAJORITY: (a&b) | (a&cin) | (b&cin) — equivalently (a&b) | (p&cin). The buggy form fails exactly one truth-table row: a=0,b=0,cin=1 (bug=1, true carry=0) — which is precisely why exhaustive row testing matters. The majority form passes all eight rows. Verify (0,0,1), (1,0,1) and (1,1,0) whenever you touch carry logic.',
      },
      {
        mistake: 'Connecting the ripple chain to the wrong stage (fa1 consuming cout instead of c1).',
        fix:
          'Stage k’s carry-in is stage k-1’s carry-out — the internal chain c1, c2, c3 — while only the LAST stage’s carry-out leaves the module as cout. Named connections and a drawn block diagram prevent the miswiring.',
      },
      {
        mistake: 'Declaring sum as 4 bits in the wide form but writing assign sum = a + b + cin;.',
        fix:
          'That evaluates in 4-bit context and drops the carry silently. Either the {cout, sum} concatenation form, or an explicit 5-bit intermediate: wire [4:0] ext = a + b + cin; assign sum = ext[3:0]; assign cout = ext[4];',
      },
    ],
    guidedPractice: {
      title: 'Complete the full-adder verification',
      brief:
        'Fill the missing p, sum, cout values for the full adder on rows (a,b,cin) = (0,1,1) and (1,1,1), then confirm each against decimal arithmetic (a+b+cin).',
      expectedBehavior:
        '(0,1,1): p = 0^1 = 1; sum = 1^1 = 0; cout = (0&1)|(1&1) = 1 → 0+1+1 = 2 = 10₂ ✓. (1,1,1): p = 0; sum = 0^1 = 1; cout = (1&1)|(0&1) = 1 → 1+1+1 = 3 = 11₂ ✓.',
      hints: [
        'Compute p first — both other equations use it.',
        'The decimal oracle: a+b+cin written as a 2-bit binary number IS (cout, sum).',
      ],
      challengeId: 'ece-04-half-adder',
    },
    practiceExercises: [
      {
        title: 'Structural 4-bit adder on the platform',
        brief:
          'Instantiate adder4 (or your own four full_adder cells) and verify the rows a=1001, b=0011, cin=1 and a=1111, b=1111, cin=0 by hand-tracing the carry chain before checking against arithmetic.',
        expectedBehavior:
          'Row 1: 9+3+1 = 13 = 0_1101 → sum=1101, cout=0. Chain: fa0: 1+1+1 → sum0=1,c=1; fa1: 0+1+1 → sum1=0,c=1; fa2: 0+0+1 → sum2=1,c=0; fa3: 1+0+0 → sum3=1,c=0 → 1101, cout=0 ✓. Row 2: 15+15 = 30 = 1_1110 → sum=1110, cout=1; the carry propagates through all four stages.',
        hints: [
          'Trace stage by stage; write the carry after each stage.',
          'The decimal oracle decides correctness, not intuition.',
        ],
        challengeId: 'ece-01-ripple-carry-adder',
      },
      {
        title: 'Subtract via two’s complement (preview of module 08)',
        brief:
          'Using only additions and XOR, write dataflow assigns for a 4-bit add/sub unit: when mode=1 compute a-b, else a+b, producing {cout, diff}. Hint: a - b = a + ~b + 1.',
        expectedBehavior:
          'wire [3:0] bx = b ^ {4{mode}};  // mode=1 flips every bit (NOT b)\nassign {cout, diff} = a + bx + mode;  // +1 comes from mode itself. Trace a=0110 (6), b=0011 (3), mode=1: bx = 1100; 6+12+1 = 19 = 1_0011 → diff=0011 (3), cout=1. For unsigned math, cout=1 means NO borrow.',
        hints: [
          'Two’s complement negation: invert every bit, then add one.',
          'mode conveniently supplies BOTH the inversion control and the +1.',
        ],
      },
    ],
    assessment: {
      title: 'Module 05 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What are sum and carry of the half adder for a=1, b=1?',
          code:
            'assign sum   = a ^ b;\nassign carry = a & b;   // a=1, b=1',
          options: ['sum=0, carry=1', 'sum=1, carry=1', 'sum=0, carry=0', 'sum=1, carry=0'],
          answer: 'sum=0, carry=1',
          explanation:
            'sum = 1^1 = 0 (inputs equal), carry = 1&1 = 1. Arithmetic: 1+1 = 2 = 10₂.',
          hint: '1+1 in binary is "10".',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which expression correctly computes full-adder carry-out?',
          options: [
            '(a & b) | (p & cin) with p = a ^ b',
            'a & b & cin',
            'a ^ b ^ cin',
            'a | b | cin',
          ],
          answer: '(a & b) | (p & cin) with p = a ^ b',
          explanation:
            'Carry-out is the majority of the three inputs. (a&b)|(p&cin) covers both-set and propagate-with-cin; expanding p gives (a&b)|(a&cin)|(b&cin). Option C is the SUM, not the carry.',
          hint: 'Carry fires when at least TWO inputs are 1.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'In adder4_wide (assign {cout, sum} = a + b + cin;), what are cout and sum for a=0111, b=1001, cin=0?',
          code: 'assign {cout, sum} = a + b + cin;   // a=0111, b=1001, cin=0',
          options: ['cout=1, sum=0000', 'cout=0, sum=0000', 'cout=1, sum=1111', 'cout=0, sum=1111'],
          answer: 'cout=1, sum=0000',
          explanation:
            '7 + 9 + 0 = 16 = 1_0000. The 5-bit context keeps the carry: cout=1, sum=0000.',
          hint: 'Add in decimal first, then write the 5-bit result.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'In the structural ripple adder, stage fa2’s carry-in connects to fa1’s carry-out through an internal wire.',
          answer: 'true',
          explanation:
            'The carry chain c1, c2, c3 links each stage’s cout to the next stage’s cin; only fa3’s cout leaves as the module’s cout.',
          hint: 'That chain is exactly why it is called a ripple-carry adder.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the two Boolean equations of the half adder (use ^ and & on a and b).',
          answer: 'sum = a ^ b, carry = a & b',
          explanation:
            'sum is the XOR (odd parity of two inputs) and carry is the AND (both set) — the complete half-adder specification.',
          hint: 'Two operators, two equations.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Half adder', definition: 'Two-bit adder without carry-in: sum = a^b, carry = a&b.' },
      { term: 'Full adder', definition: 'Three-bit adder: sum = a^b^cin, cout = majority(a,b,cin) = (a&b)|(p&cin).' },
      { term: 'Propagate term', definition: 'p = a^b: signals that a carry-in would propagate to carry-out; shared by sum and cout equations.' },
      { term: 'Ripple-carry adder', definition: 'Chained full adders whose carry chain propagates stage to stage; delay grows with width.' },
      { term: 'Arithmetic oracle', definition: 'The independent reference (a+b+cin) a testbench compares against — the basis of self-checking verification.' },
    ],
    revisionSummary: [
      'Half adder: sum = a^b, carry = a&b. Full adder: sum = a^b^cin, cout = (a&b)|(p&cin).',
      'Name the shared term p = a^b; both sum and cout consume it.',
      'Ripple adder = chained full adders; the internal carry wires are the critical path.',
      'The one-line wide form {cout, sum} = a + b + cin is functionally identical; the 5-bit LHS preserves the carry.',
      'Verify against the decimal oracle on structural rows: zeros, ones, and carry-chain boundaries.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Adder (electronics)', url: 'https://en.wikipedia.org/wiki/Adder_(electronics)', kind: 'article' },
      { label: 'All About Circuits — Binary adders', url: 'https://www.allaboutcircuits.com/textbook/digital/', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m05-l3',
    title: 'Muxes, Decoders and Comparators in Dataflow',
    summary:
      'Build the three most-used combinational blocks — multiplexer, decoder, magnitude comparator — as continuous assignments.',
    objectives: [
      'Write a 2:1 mux two ways: conditional operator and AND-OR form.',
      'Scale to a 4:1 mux with nested conditionals or concatenated selects.',
      'Build a 2:4 decoder with enable using a shift expression.',
      'Implement a magnitude comparator producing gt/eq/lt flags.',
    ],
    whyItMatters:
      'These three blocks are the plumbing of every design: muxes route data, decoders generate one-hot enables (register selects, memory wordlines), comparators make decisions. Interviewers test them because they reveal whether a candidate can go from spec to truth table to correct, width-safe RTL in minutes. The linked challenge lets you verify a 2:1 mux on the real evaluator.',
    prerequisites: ['vlog-m05-l1', 'vlog-m05-l2', 'vlog-m04-l3'],
    explanation:
      'A **2:1 multiplexer** selects one of two data sources: y = s ? b : a (s=0 picks a, s=1 picks b). The bitwise equivalent — `y = (s & b) | (~s & a);` — is exact for 1-bit signals, and for buses needs replication: `y = ({8{s}} & b) | ({8{~s}} & a);`. The conditional form is preferred: it is width-oblivious and reads as the intent.\n\nA **4:1 mux** selects among four sources with two select bits. Nested conditionals write it directly: `y = s[1] ? (s[0] ? d : c) : (s[0] ? b : a);`. A decoder is the mux’s mirror: given a binary select, assert exactly ONE output. A 2:4 decoder with enable produces y = one-hot(s) when en, all-zeros otherwise — expressible as a shift: `assign y = en ? (4\'b0001 << s) : 4\'b0000;` (s zero-extends in the shift context, so the 1 lands at bit position s).\n\nA **magnitude comparator** answers three questions at once: is a greater, equal, or less than b? Equality is one == (or XNOR-reduction of the difference); for unsigned values a>b and a<b are direct relational operators. All three outputs derive from one shared subtraction computed in the two\'s-complement mask form — sub = a + ~b + 1 in a 5-bit context — where the top bit (sub[4]) = 1 means NO borrow occurred (a >= b), and zero-ness of the low bits means equality. Writing all three from one shared adder is the datapath-clean form, though separate relational operators synthesize to equally good logic for small widths. (Subtlety worth knowing: the direct form {c, diff} = a - b also builds one subtractor, but its top bit is the BORROW flag — the opposite polarity. This course standardizes on the mask form, matching the module 08 ALU.)',
    deepDive:
      '### The decoder-shift trick and its limits\n\n`4\'b0001 << s` puts a one at position s — a decoder in one operator. It works because the shift amount s (3 bits) zero-extends into the 32-bit shift context and 4\'b0001 extends to match the assignment width; the bits beyond the LHS width simply fall off. The same trick scales: 8\'b0000_0001 << s[2:0] is a 3:8 decoder. Be aware of the boundaries: the literal must be wide enough that 1<<s stays inside it, and the idiom hides the gate structure — a case statement (module 06) shows the same decoder more explicitly. Both are acceptable; consistency within a project is what matters.\n\n### Comparator flags from subtraction\n\nThe mask-form comparator mirrors how real ALU flags work (module 08 builds exactly this): with sub = a + ~b + 1 in a 5-bit context, gt = sub[4] (no borrow occurred); eq = ~|sub[3:0] (the NOR reduction — every bit of the difference is zero); lt = ~sub[4]. Three flags, one adder, no duplicated comparators. POLARITY WARNING: the direct form {c, diff} = a - b gives a top bit that is the BORROW itself (1 when a < b) — the opposite of the mask form. Pick one idiom, name the wire for what it is, and verify both the a<b and a>=b rows explicitly. For SIGNED values the borrow logic changes (overflow enters the picture), which is why signed comparison deserves its own careful treatment — a preview of the ALU project in module 16.\n\n### Mux trees are everywhere\n\nAny "choose among N" behavior is a mux tree: the decoder picks a register, a mux tree routes it to the bus. Variable part-select (module 03) and case statements (module 06) are other spellings of the same hardware. Recognizing that four different syntaxes describe one mux family is the step from "learning constructs" to "designing".',
    examples: [
      {
        title: '2:1 and 4:1 multiplexers (both styles)',
        language: 'verilog',
        code:
          '// mux2.v — the canonical mux, conditional form\nmodule mux2(\n    input  wire       a,     // selected when s = 0\n    input  wire       b,     // selected when s = 1\n    input  wire       s,\n    output wire       y\n);\n    assign y = s ? b : a;\n\nendmodule\n\n// mux2_ao.v — AND-OR form (exact for 1-bit; replication for buses)\nmodule mux2_ao(\n    input  wire a,\n    input  wire b,\n    input  wire s,\n    output wire y\n);\n    // 1-bit data: plain bitwise form.\n    assign y = (s & b) | (~s & a);\n\nendmodule\n\n// mux4.v — 4:1 mux by nested conditionals\nmodule mux4(\n    input  wire [3:0] d,     // d[0]..d[3]\n    input  wire [1:0] s,\n    output wire       y\n);\n    assign y = s[1] ? (s[0] ? d[3] : d[2])\n                    : (s[0] ? d[1] : d[0]);\n\nendmodule',
        explanation: [
          'mux2: s=0 selects a (the "false" branch), s=1 selects b. The condition selects the expression AFTER the question mark when true.',
          'mux2_ao: when s=1, (s&b) passes b and (~s&a) is 0; when s=0 the roles swap. Exact for 1 bit.',
          'mux4: the outer s[1] picks the upper pair (d[3]/d[2]) or lower pair (d[1]/d[0]); the inner s[0] picks within the pair. This is a two-level mux tree.',
          'For a BUS version of the AND-OR form, replicate the select: y = ({4{s}} & b) | ({4{~s}} & a); — module 04’s mask idiom.',
          'Verification rows for mux4: s=00 → d[0], s=01 → d[1], s=10 → d[2], s=11 → d[3]. Trace s=10, d=1010 → y = d[2] = 1.',
        ],
      },
      {
        title: '2:4 decoder with enable, and a magnitude comparator',
        language: 'verilog',
        code:
          '// decoder2to4.v — one-hot output, enable input\nmodule decoder2to4(\n    input  wire [1:0] s,\n    input  wire       en,\n    output wire [3:0] y      // y[i] = 1 iff en and s == i\n);\n    // Shift idiom: put a single 1 at position s, gated by en.\n    assign y = en ? (4\'b0001 << s) : 4\'b0000;\n\nendmodule\n\n// compare4.v — unsigned magnitude comparator via the shared-adder idiom\nmodule compare4(\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    output wire       gt,    // a > b\n    output wire       eq,    // a == b\n    output wire       lt     // a < b\n);\n    // Subtraction a - b computed as a + ~b + 1 (two\'s complement),\n    // in a 5-bit context so the top bit is visible.\n    // With the mask form, top bit = 1 means NO borrow (a >= b).\n    wire [3:0] bx   = ~b;\n    wire [4:0] sub  = a + bx + 1\'b1;\n\n    assign eq = ~|sub[3:0];         // NOR reduction: difference is zero\n    assign gt = sub[4] & ~eq;       // no borrow AND not equal\n    assign lt = ~sub[4];            // borrow occurred\n\nendmodule',
        explanation: [
          'Decoder: en=1 places a single 1 at bit position s (4\'b0001 << s); en=0 forces all zeros. s=2\'b10 → y = 4\'b0100.',
          'The shift literal 4\'b0001 is width-matched to y; the shift amount s zero-extends automatically. All four y bits are mutually exclusive by construction.',
          'Comparator: one adder serves all three flags. sub = a + ~b + 1 in a 5-bit context: top bit sub[4] = 1 exactly when NO borrow occurred (a >= b) — the mask form of two\'s-complement subtraction.',
          'eq = ~|sub[3:0]: the NOR-reduction (module 04) is 1 exactly when every difference bit is 0.',
          'gt = sub[4] & ~eq (no borrow AND not equal), lt = ~sub[4] (borrow means a < b for unsigned).',
          'Verification rows: a=0101(5), b=0011(3): 5+12+1 = 18 = 1_0010 → gt=1, eq=0, lt=0. a=0011(3), b=0101(5): 3+10+1 = 14 = 0_1110 → lt=1. a=b=0110: 6+9+1 = 16 = 1_0000 → eq=1, gt=0, lt=0.',
          'SUBTLETY (worth knowing): the DIRECT form {c, d} = a - b also works, but its top bit is the BORROW flag (1 when a < b) — the OPPOSITE polarity of the mask form. This course standardizes on the mask form (a + ~b + 1), where top bit = no-borrow, matching the ALU of module 08.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'The mux-decoder mirror',
        content:
          '  MUX 4:1  (N inputs -> 1, chosen by select)     DECODER 2:4 (1 select -> N one-hot)\n\n   d0 --\\                                        s=00 -> y = 0001\n   d1 ---[mux]-- y          s[1:0]                s=01 -> y = 0010\n   d2 --/                                         s=10 -> y = 0100\n   d3 -\'                                          s=11 -> y = 1000\n\n   mux:    many data sources, ONE winner per select value\n   decoder: one select value, ONE active output line\n   (together: decoder picks, mux routes — register-file addressing)',
        caption:
          'A decoder asserts one-of-N; a mux selects one-of-N. Register files are exactly a decoder plus per-bit mux trees.',
      },
    ],
    tables: [
      {
        caption: '2:4 decoder with enable (truth table)',
        headers: ['en', 's[1]', 's[0]', 'y[3]', 'y[2]', 'y[1]', 'y[0]'],
        rows: [
          ['0', 'x', 'x', '0', '0', '0', '0'],
          ['1', '0', '0', '0', '0', '0', '1'],
          ['1', '0', '1', '0', '0', '1', '0'],
          ['1', '1', '0', '0', '1', '0', '0'],
          ['1', '1', '1', '1', '0', '0', '0'],
        ],
      },
      {
        caption: 'Magnitude comparator verification rows (unsigned)',
        headers: ['a', 'b', 'sub = a+~b+1 (5-bit)', 'diff', 'noborrow', 'gt', 'eq', 'lt'],
        rows: [
          ['0101', '0011', '1_0010', '0010', '1', '1', '0', '0'],
          ['0011', '0101', '0_1110', '1110', '0', '0', '0', '1'],
          ['0110', '0110', '1_0000', '0000', '1', '0', '1', '0'],
          ['1111', '1111', '1_0000', '0000', '1', '0', '1', '0'],
        ],
      },
      {
        caption: 'mux4 selection map',
        headers: ['s[1]', 's[0]', 'y'],
        rows: [
          ['0', '0', 'd[0]'],
          ['0', '1', 'd[1]'],
          ['1', '0', 'd[2]'],
          ['1', '1', 'd[3]'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing the AND-OR mux on buses without replication: y = (s & b) | (~s & a) with 8-bit a, b.',
        fix:
          'The 1-bit s only masks bit 0; the other seven bits of the AND terms come from s’s zero-extension (zeros). Replicate: ({8{s}} & b) | ({8{~s}} & a) — or simply use the conditional operator, which handles any width.',
      },
      {
        mistake: 'Decoder shift literal too narrow: assign y = 2\'b01 << s; on a 4-bit y.',
        fix:
          'The literal must reach the highest output position: for s up to 3, 4\'b0001 << s keeps the one inside the width. A 2-bit literal would push the 1 out of existence for s >= 2 (it truncates at the assignment width). Match the literal to the OUTPUT width.',
      },
      {
        mistake: 'Reusing the comparator’s borrow logic unchanged for signed inputs.',
        fix:
          'The mask form (sub = a + ~b + 1, top bit = no-borrow) is correct for UNSIGNED comparison only. Signed magnitude comparison must account for the sign/overflow bits (module 16’s ALU handles signed properly). Mixing them silently produces wrong answers on negative operands — and mixing the mask form with the DIRECT form {c, d} = a - b (whose top bit is the borrow, opposite polarity) produces inverted flags.',
      },
    ],
    guidedPractice: {
      title: 'Comparator corner rows',
      brief:
        'For compare4 (sub = a + ~b + 1 in 5-bit context), compute sub, gt, eq, lt for (a,b) = (1111, 0000), (0000, 1111), (1001, 1001). Confirm each against decimal arithmetic.',
      expectedBehavior:
        '(1111,0000): sub = 15+15+1 = 31 = 1_1111 → noborrow=1, diff=1111 → gt=1, eq=0, lt=0. (0000,1111): sub = 0+0+1 = 1 = 0_0001 → noborrow=0 (borrow), diff=0001 → gt=0, eq=0, lt=1. (1001,1001): sub = 9+6+1 = 16 = 1_0000 → noborrow=1, diff=0000 → gt=0, eq=1, lt=0.',
      hints: [
        'Compute sub = a + (15 - b) + 1 in 5 bits: top bit = 1 exactly when a >= b (no borrow).',
        'eq comes from the NOR of diff, independent of the borrow.',
      ],
    },
    practiceExercises: [
      {
        title: '3:8 decoder by shift',
        brief:
          'Write module decoder3to8(input wire [2:0] s, input wire en, output wire [7:0] y) using the shift idiom, and verify rows s=0, s=5, s=7 (with en=1) plus one en=0 row.',
        expectedBehavior:
          'assign y = en ? (8\'b0000_0001 << s) : 8\'b0000_0000; — s=0 → 0000_0001; s=5 → 0010_0000; s=7 → 1000_0000; en=0 → 0000_0000 regardless of s. The 8-bit literal guarantees the one stays inside the width for every s.',
        hints: [
          'The literal width must equal the output width.',
          'One-hot: exactly one bit set, at position s.',
        ],
      },
      {
        title: 'Mux challenge: the platform version',
        brief:
          'Write the 2:1 mux in BOTH styles (conditional and AND-OR with replication for 1-bit data it is identical), then predict outputs for (a,b,s) = (0,1,0), (0,1,1), (1,1,1) and run the linked challenge to check on the real evaluator.',
        expectedBehavior:
          'y = s ? b : a and y = (s & b) | (~s & a) agree on every 1-bit row: (0,1,0) → 0; (0,1,1) → 1; (1,1,1) → 1. The challenge harness runs your module under Icarus Verilog — the linked challenge is the real-simulation check for this lesson.',
        hints: [
          's=0 chooses a, s=1 chooses b — in both forms.',
          'Trace the AND-OR form term by term.',
        ],
      },
    ],
    assessment: {
      title: 'Module 05 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'In mux4 (nested conditionals), what is y for s = 2\'b10 and d = 4\'b1010?',
          code:
            'assign y = s[1] ? (s[0] ? d[3] : d[2])\n                : (s[0] ? d[1] : d[0]);\n// s=2\'b10, d=4\'b1010',
          options: ['1', '0', 'x', 'z'],
          answer: '1',
          explanation:
            's[1]=1 selects the upper pair; s[0]=0 picks d[2]. d = 1010 → d[2] = 1.',
          hint: 'Outer select picks the pair, inner select picks within it.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Why does the bus version of the AND-OR mux need replication of the select?',
          options: [
            'So the 1-bit select masks all bits of the data word, not just bit 0',
            'Because Verilog cannot AND a 1-bit with an 8-bit value',
            'Replication makes the mux faster in simulation',
            'It is not needed — s auto-replicates in bitwise operations',
          ],
          answer: 'So the 1-bit select masks all bits of the data word, not just bit 0',
          explanation:
            'In (s & b), the 1-bit s zero-extends to 8 bits: bits 7:1 of the AND term are always 0. Replication {8{s}} turns the select into a proper 8-bit mask. (The conditional operator avoids the issue entirely.)',
          hint: 'What does zero-extension do to a mask?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'For decoder2to4 with en=1 and s = 2\'b11, what is y?',
          code: 'assign y = en ? (4\'b0001 << s) : 4\'b0000;   // en=1, s=2\'b11',
          options: ["4'b1000", "4'b0100", "4'b0010", "4'b0001"],
          answer: "4'b1000",
          explanation:
            'The single 1 shifts left by s = 3 positions: 0001 << 3 = 1000. One-hot at position 3.',
          hint: 'Shift the one left by the decimal value of s.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'In compare4 (sub = a + ~b + 1 in a 5-bit context), lt = ~sub[4] is a correct "less than" flag for unsigned operands.',
          answer: 'true',
          explanation:
            'With the mask form, sub[4] = 1 exactly when NO borrow occurred (a >= b), so ~sub[4] = 1 exactly when a < b. (For signed operands this logic is insufficient — signs and overflow enter the analysis; and note the DIRECT form {c, d} = a - b has the OPPOSITE top-bit polarity: its top bit is the borrow itself.)',
          hint: 'Unsigned subtraction borrows exactly when the minuend is smaller.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the one-line dataflow expression for a 2:1 mux selecting b when s=1 (use the conditional operator).',
          answer: 'y = s ? b : a',
          explanation:
            'The conditional operator is the canonical 2:1 mux: true condition (s=1) selects b, false (s=0) selects a.',
          hint: 'Question mark, then the s=1 source, colon, the s=0 source.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Multiplexer (mux)', definition: 'Selects one of 2^N data sources under control of an N-bit select; y = s ? b : a is the 2:1 form.' },
      { term: 'Decoder', definition: 'Asserts exactly one of 2^N outputs according to the select value; often with an enable gating all outputs.' },
      { term: 'One-hot', definition: 'An encoding where exactly one bit is set — the natural output pattern of a decoder.' },
      { term: 'Magnitude comparator', definition: 'Produces gt/eq/lt flags comparing two values; shared-subtraction form derives all three from one subtractor.' },
      { term: 'Borrow', definition: 'The unsigned subtraction equivalent of an inverted carry; noborrow = a >= b.' },
    ],
    revisionSummary: [
      '2:1 mux: conditional form for any width; AND-OR form needs {W{s}} replication on buses.',
      '4:1 mux: nested conditionals build a two-level mux tree.',
      'Decoder: y = en ? (one_hot_literal << s) : 0 — match the literal width to the output width.',
      'Comparator: one subtraction {noborrow, diff} = a - b yields eq = ~|diff, gt = noborrow & ~eq, lt = ~noborrow (unsigned).',
      'Decoder asserts one-of-N; mux selects one-of-N — together they form register files and routers.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Multiplexer', url: 'https://en.wikipedia.org/wiki/Multiplexer', kind: 'article' },
      { label: 'Wikipedia — Decoder', url: 'https://en.wikipedia.org/wiki/Decoder', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
