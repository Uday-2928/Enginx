import type { TutorialLesson } from '../types';

export const module06Lessons: TutorialLesson[] = [
  {
    id: 'de-m06-l01',
    title: 'Latches: SR and D, and the Level-vs-Edge Distinction',
    summary:
      'The first memory elements: the cross-coupled SR latch, its forbidden state, the gated D latch, and the crucial difference between level-sensitive (transparent) and edge-sensitive storage.',
    objectives: [
      'Explain how cross-coupled NOR (or NAND) gates remember one bit.',
      'Build the SR latch truth table and state why S=R=1 is forbidden.',
      'Design the gated D latch and describe transparent vs hold behavior.',
      'Distinguish level-sensitive latches from edge-sensitive flip-flops and predict when each updates.',
    ],
    whyItMatters:
      'Memory is what separates Modules 6-7 from everything before: a single feedback loop turns logic into state. Latches are also the #1 accidental bug in student RTL ("inferred latch" warnings) and the reason the Verilog course keeps repeating "complete your combinational blocks". Understanding transparency deeply makes edge-triggered flip-flops (next lesson) feel inevitable rather than arbitrary.',
    prerequisites: ['de-m03-l03'],
    explanation:
      '### One bit of memory from two gates\n\nFeed a NOR gate\'s output back into its own input and something new appears: the output can *sustain itself*. Two NOR gates cross-coupled — each fed by the other\'s output — form the **SR latch** (Set-Reset). Note the wiring: S drives the gate that produces Q\' (asserting S forces Q\' low, which drives Q high through the other gate):\n\n```\n   S ---\\    +--------+\n         +---|  NOR1  |--- Q\'\n   Q --/     +--------+\n\n   R ---\\    +--------+\n         +---|  NOR2  |--- Q\n   Q\'--/     +--------+\n\n   netlist:  Q\' = NOR(S, Q)\n             Q  = NOR(R, Q\')\n```\n\n- **S = 1, R = 0**: Q\' = NOR(S=1, Q) = 0 immediately; that 0 feeds the second gate, so Q = NOR(R=0, Q\'=0) = 1 — the latch is *set*.\n- **S = 0, R = 1**: the mirror image resets Q to 0 (R forces Q low, which lets Q\' rise).\n- **S = 0, R = 0**: each NOR simply passes its feedback through — the latch *holds* whatever it had. This row is the memory.\n- **S = 1, R = 1**: both outputs are forced to 0, so Q and Q\' are no longer complementary, and when S and R drop *simultaneously* the final state depends on analog racing. This row is **forbidden** — the price of the simple structure.\n\nThe NAND version is identical with active-low inputs (S\' and R\'), which matches real chips that assert controls low.\n\n### Gating it: the D latch\n\nRaw SR latches respond instantly to S and R — useful for switch debouncing, chaotic for buses. Gate the inputs so they only matter while an **enable** is high, and tie S = D, R = NOT D:\n\n```\nEN D | Q(next)\n 0  x | Q (hold)          opaque: input ignored\n 1  0 | 0                 transparent: Q follows D\n 1  1 | 1\n```\n\nWhile EN = 1 the latch is **transparent** — Q tracks D continuously, like a wire. When EN drops, Q freezes at the D value it last saw. One bit captured, held indefinitely.\n\n### Level vs edge: the distinction everything else builds on\n\n- **Level-sensitive** (latches): output responds during the *entire* active level. A long EN pulse lets data flow through continuously.\n- **Edge-sensitive** (flip-flops, next lesson): output updates only at the *instant* of a clock edge (rising or falling).\n\nWhy hardware standardized on edges: with transparent latches chained, data can race through several stages in one enable pulse (an *hazard*), and analysis becomes analog. Edge-triggering samples exactly once per clock, making whole systems predictable: one value in, one value out, per clock. That predictability is what makes Modules 7-8 possible.',
    deepDive:
      '### Metastability: the latch\'s dark secret\n\nWhat if S rises and falls nearly simultaneously, or D changes right as EN falls? The cross-coupled loop can balance at a *third* voltage where neither NOR wins — **metastable** state. It eventually falls to 0 or 1, but after an unpredictable delay, and the choice is unpredictable too. Every real flip-flop datasheet specifies a *resolution time constant*; every asynchronous input crossing a clock domain must be synchronized (two flip-flops in series) precisely because metastability cannot be eliminated, only made astronomically unlikely. This single phenomenon justifies most of the clock-domain-crossing rules in the RTL course.\n\n### Why "inferred latch" is a compile warning, not a feature\n\nWhen a Verilog combinational always block fails to assign an output in some branch, the tool keeps the *previous* value — that is latch behavior, synthesized as real gated storage. It is usually unintended: the designer thought in software terms (assign only when needed) instead of hardware terms (every wire driven continuously). The fix is structural: default assignments at the top of the block, complete case/if coverage. You now know the hardware reason the warning exists: transparency was inferred where none was specified.\n\n### Latches that legitimately exist\n\nLevel-sensitive latches are not mistakes everywhere: transparent high/low latches paired back-to-back create *time borrowing* in high-speed pipelines (data can arrive "late" into the transparent phase), and pulsed latches shrink clock power. But these are expert techniques built on a deep understanding of exactly the transparency you just learned — the RTL course keeps them behind lint rules for good reason.',
    examples: [
      {
        title: 'Simulating the D latch\'s transparency in Verilog',
        language: 'verilog',
        code:
          '// Level-sensitive D latch: transparent while en = 1.\nmodule d_latch(\n    input  wire en,\n    input  wire d,\n    output reg  q\n);\n    always @(*) begin\n        if (en)\n            q = d;\n        // when en = 0 there is NO assignment:\n        // q keeps its previous value -> the latch behavior\n    end\nendmodule',
        explanation: [
          'The sensitivity `@(*)` means "re-evaluate when en or d changes": while en = 1, every change of d re-assigns q — transparency in action.',
          'When en = 0 the if-branch is skipped and q simply keeps its last value; simulation shows q frozen, hardware shows a stored bit.',
          'This block *intentionally* describes a latch. In code that meant to be combinational, the identical pattern is the "inferred latch" bug — the difference is only whether you wanted memory.',
          'A `reg` assigned like this does not automatically become a flip-flop: reg means "procedurally assigned"; the *absence* of a clock edge makes it a latch.',
          'Note what the module cannot tell you: real latch timing (how late in the en pulse d may change) is a datasheet/timing question — Module 8.',
        ],
      },
      {
        title: 'SR latch behavior simulated in C (cross-coupled equations)',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* NOR SR latch:  Q\' = NOR(S, Q);   Q = NOR(R, Q\').\n   Real gates re-evaluate continuously; this model applies the pair\n   of equations repeatedly until the loop settles (max 8 passes). */\nvoid sr_settle(uint8_t s, uint8_t r, uint8_t *q, uint8_t *qb) {\n    for (int pass = 0; pass < 8; pass++) {\n        uint8_t qb_next = (uint8_t)(!(s | *q) & 1u);\n        uint8_t q_next  = (uint8_t)(!(r | *qb) & 1u);\n        if (q_next == *q && qb_next == *qb) break;   /* stable point */\n        *q  = q_next;\n        *qb = qb_next;\n    }\n}\n\nint main(void) {\n    uint8_t q = 0, qb = 1;                 /* known start (after reset) */\n    uint8_t seq_s[6] = {1, 0, 0, 0, 1, 0};\n    uint8_t seq_r[6] = {0, 1, 0, 0, 0, 0};\n\n    for (int i = 0; i < 6; i++) {\n        sr_settle(seq_s[i], seq_r[i], &q, &qb);\n        printf("step %d: S=%u R=%u -> Q=%u (Q\'=%u)\\n",\n               i, seq_s[i], seq_r[i], q, qb);\n    }\n    return 0;\n}',
        explanation: [
          'The equations mirror the netlist exactly: Q\' = NOR(S, Q) and Q = NOR(R, Q\'), each computed from the other\'s current value.',
          'The settle loop emulates what physics does instantly: keep re-applying the gate equations until nothing changes (1-2 passes for valid rows).',
          'Steps 1-2 demonstrate set (S=1 -> Q=1, Q\'=0) then reset (R=1 -> Q=0, Q\'=1).',
          'Steps 3-4 have S=R=0: the hold row — Q keeps its previous value, which is the memory behavior; step 5 sets again and step 6 holds.',
          'Try extending seq_s/seq_r with S=R=1: the model settles at Q=Q\'=0, the broken forbidden state — the simulation proves why that row is banned.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'SR latch structure and gated D latch',
        content:
          '  SR LATCH (NOR version)             GATED D LATCH\n\n   S ---\\    +--------+                D ---+--[AND]--- S* ---\\\n        +---|  NOR1  |--- Q\'               |              +---|  NOR1  |--- Q\'\n   Q --/     +--------+             EN --+--[AND]--- R* ---/    +--------+\n                                     |                          ^\n   R ---\\    +--------+              +--[NOT]-- D\' --------------+\n        +---|  NOR2  |--- Q\n   Q\'--/     +--------+               while EN=1: Q follows D\n                                      while EN=0: Q holds (opaque)\n\n  netlist: Q\' = NOR(S, Q)            S* = D AND EN\n           Q  = NOR(R, Q\')           R* = (NOT D) AND EN\n\n  (S drives the Q\' gate: S=1 -> Q\'=0 -> Q=1.  R drives the Q gate.)',
        caption:
          'Feedback turns two NORs into memory; the enable gate makes the memory controllable in time.',
      },
      {
        kind: 'waveform',
        title: 'Transparency window of a D latch',
        content:
          'educational waveform (illustrative)\n\n         +--------------+\n  EN     |              |                    en high = transparent\n  -------+              +-----------------\n\n  D      ~~~~XX~~~~~~~~~~~~XX~~~~~      d toggles freely\n\n  Q      ~~~~~XXXXXXXXXXXXXXXXX~~~      while en=1, q TRACKS d;\n                                        after en falls, q FREEZES\n              ^ en rises         ^ en falls: q = last d seen',
        caption:
          'educational waveform (illustrative). While EN is high the latch is a wire; when EN drops, the last D value is captured and held.',
      },
    ],
    tables: [
      {
        caption: 'SR latch (NOR version) — complete behavior',
        headers: ['S', 'R', 'Q(next)', 'Meaning'],
        rows: [
          ['0', '0', 'Q', 'hold (the memory row)'],
          ['0', '1', '0', 'reset'],
          ['1', '0', '1', 'set'],
          ['1', '1', 'forbidden', 'Q = Q\' = 0; release is unpredictable'],
        ],
      },
      {
        caption: 'Gated D latch',
        headers: ['EN', 'D', 'Q(next)'],
        rows: [
          ['0', 'x', 'Q (hold)'],
          ['1', '0', '0'],
          ['1', '1', '1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using the forbidden S=R=1 row and assuming Q\' stays the complement of Q.',
        fix:
          'With both inputs asserted, both NOR outputs are 0, breaking the Q/Q\' complement guarantee; releasing both at once races. If your design can assert both (even briefly), use a D latch or add logic that prevents the state.',
      },
      {
        mistake: 'Confusing transparent latch behavior with flip-flop behavior in timing reasoning.',
        fix:
          'A latch passes data during the whole active level; a flip-flop samples only at the edge. When a long EN pulse overlaps input changes, the latch output changes too — chains of such latches can pass data through several stages in one pulse. Reserve latch behavior for when you mean it.',
      },
      {
        mistake: 'Leaving an incomplete if/case in RTL and ignoring the latch warning.',
        fix:
          'Unassigned branches = remembered values = inferred latches. Default the output at the top of the block (`y = 1\'b0;`) or complete every branch. Fix the *description*, not the warning filter.',
      },
    ],
    guidedPractice: {
      title: 'Trace a transparent window',
      brief:
        'A D latch has EN high from t=0 to t=10 and D taking values 1 (t=0..3), 0 (t=3..6), 1 (t=6..9), 0 (t=9..12). Write Q\'s value during and after the window, marking each change. Then state what Q would be at t=15.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    int q = 0;                       /* initial stored value */\n    int en_end = 10;\n    for (int t = 0; t <= 12; t++) {\n        int d;\n        if (t < 3)      d = 1;\n        else if (t < 6) d = 0;\n        else if (t < 9) d = 1;\n        else            d = 0;\n        if (t < en_end && d != q) q = d;   /* transparent: follow D */\n        printf("t=%2d  D=%d  Q=%d%s\\n", t, d, q, t >= en_end ? "  (held)" : "");\n    }\n    return 0;\n}',
      expectedBehavior:
        'While EN is high (t=0..9): Q follows D, stepping 1,0,1. At t=9 D drops to 0 and Q follows to 0 *only if* that happens before EN falls at t=10 — here it does (change at t=9 < 10), so Q freezes at 0 from t=10 onward. Q(15) = 0. The subtle case: a D change at t=10.5 would NOT be captured.',
      hints: [
        'Transparency ends at the falling edge of EN, not at the last D change.',
        'Q changes exactly when D changes *and* EN=1.',
        'After EN falls, ignore D completely — the table rows with EN=0 are the hold rows.',
      ],
    },
    practiceExercises: [
      {
        title: 'Debounce a switch with an SR latch',
        brief:
          'A push-button\'s raw line bounces between 0 and 1 for a few milliseconds on press. Explain how an SR latch driven by two threshold comparators (S = "pressed beyond upper threshold", R = "released below lower threshold") yields a clean signal, and state why the S=R=1 condition never occurs.',
        expectedBehavior:
          'The first press assertion sets Q=1 and further bounces (S=1 with R=0, then S=0 R=0) cannot unset it — only the release comparator does. Because the thresholds are separated (hysteresis), S and R never assert together, avoiding the forbidden row. The latch *remembers* which threshold was crossed last: exactly the memory a debouncer needs.',
        hints: [
          'Set wins on the way up; only reset can undo it.',
          'Bounces below the upper threshold still leave S=0, R=0 — hold.',
          'Hysteresis separates the two thresholds in voltage (and time), keeping S,R mutually exclusive.',
        ],
      },
      {
        title: 'Fix an inferred latch',
        brief:
          'The block `always @(*) if (sel) y = a;` infers a latch. Rewrite it two ways: (a) complete the if, (b) use a default assignment. State the hardware difference between the fixed version and the original.',
        expectedBehavior:
          "(a) `if (sel) y = a; else y = 1'b0;` (or the complement). (b) `y = 1'b0; if (sel) y = a;`. The fixed versions are pure combinational (a mux); the original stores the previous y when sel=0 — real gated memory, almost never intended.",
        hints: [
          'Ask what y must be when sel = 0 — the original has no answer, which is the bug.',
          'A default assignment at the top covers every path; later assignments override it.',
          'The corrected hardware is one mux — compare with the Module 5 mux circuits.',
        ],
      },
    ],
    assessment: {
      title: 'Latches checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In a NOR SR latch with S=0 and R=0, what does the circuit do?',
          options: ['Holds its previous state', 'Resets to 0', 'Sets to 1', 'Enters the forbidden state'],
          answer: 'Holds its previous state',
          explanation: 'With both inputs low, each NOR simply echoes its feedback input — the self-sustaining loop stores the bit.',
          hint: 'Which row is the "memory" row?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'While EN=1, a D latch output Q tracks every change of D.',
          answer: 'true',
          explanation: 'That is transparency: during the active level the latch behaves like a wire; storage happens only when EN deasserts.',
          hint: 'Level-sensitive means active during the whole level.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'A D latch has EN fall while D=1 (D was stable at 1 through the window). What is Q afterwards?',
          code: 'always @(*) begin\n    if (en) q = d;\nend',
          options: ['0', '1', 'x', 'alternates'],
          answer: '1',
          explanation: 'The latch freezes the last value seen while transparent: D=1 at the falling edge of EN, so Q holds 1.',
          hint: 'What was q assigned last?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What is the name of the unstable middle condition a latch can enter when set/reset activity is timed unluckily? (One word.)',
          answer: 'metastability',
          explanation:
            'The cross-coupled loop can balance between valid levels and take unbounded, unpredictable time to resolve — the reason asynchronous inputs need synchronizers.',
          hint: 'Meta- = in between; the loop balances at an invalid voltage.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'Why is S=R=1 forbidden in a NOR SR latch?',
          options: [
            'Both outputs go 0 (breaking Q/Q\' complement) and release timing decides the final state',
            'It shorts the power supply',
            'The gates cannot physically reach that input combination',
            'It sets the latch to 1',
          ],
          answer: "Both outputs go 0 (breaking Q/Q' complement) and release timing decides the final state",
          explanation:
            'Asserting both inputs forces Q = Q\' = 0; when they release (even microseconds apart), the latch settles by racing — an unpredictable result.',
          hint: 'Trace both NOR outputs with S=R=1.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'SR latch', definition: 'Cross-coupled NOR (or NAND) gates storing one bit; set/reset inputs with a forbidden combination.' },
      { term: 'Transparent', definition: 'Latch mode during the active level: output follows input continuously.' },
      { term: 'D latch', definition: 'Enable-gated latch storing D when EN deasserts; transparent while EN asserts.' },
      { term: 'Level-sensitive', definition: 'Responding during the entire active level of a control signal (latch behavior).' },
      { term: 'Edge-sensitive', definition: 'Responding only at the instant of a clock edge (flip-flop behavior).' },
      { term: 'Metastability', definition: 'An invalid intermediate state of a storage loop with unbounded resolution time; managed by synchronizers.' },
      { term: 'Inferred latch', definition: 'Unintended latch created when RTL fails to assign an output in all combinational branches.' },
    ],
    revisionSummary: [
      'Cross-coupled feedback = memory; the S=R=0 row is the hold.',
      'Forbidden row S=R=1: outputs lose complementarity; release races.',
      'D latch = SR latch + enable gating with S=D, R=D\'.',
      'Transparent during EN=1; captured (frozen) when EN falls.',
      'Level vs edge is THE distinction: latches track during levels, flip-flops sample at edges.',
      'Incomplete combinational RTL infers latches — default assignments and complete branches prevent it.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Flip-flop (electronics), latch section', url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)', kind: 'article' },
      { label: 'Wikipedia — Metastability (electronics)', url: 'https://en.wikipedia.org/wiki/Metastability_(electronics)', kind: 'article' },
      { label: 'All About Circuits — Edge-triggered latches and flip-flops', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-10/edge-triggered-latches-flip-flops/', kind: 'docs' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'de-m06-l02',
    title: 'Flip-Flops: D, JK, and T — Clocking, Reset, and Enable',
    summary:
      'Edge-triggered storage: characteristic tables of D, JK and T flip-flops, rising vs falling edge triggering, synchronous vs asynchronous reset, and clock enables — the standard cell of all sequential RTL.',
    objectives: [
      'Predict D flip-flop outputs from a clocked waveform (Q takes D at each active edge).',
      'State the JK characteristic table including the toggle case, and the T flip-flop behavior.',
      'Differentiate synchronous and asynchronous reset (and set) and code both in Verilog.',
      'Add a clock enable correctly (mux feedback, not clock gating).',
    ],
    whyItMatters:
      'The D flip-flop is the single most instantiated cell in digital design — every register, pipeline stage, and FSM state bit is one. The clocked-update discipline it creates is the backbone of RTL (the Verilog course\'s `always @(posedge clk)` blocks) and of Module 8 timing analysis. The linked EnginX challenge has you build one.',
    prerequisites: ['de-m06-l01'],
    explanation:
      'A **flip-flop** copies its input to its output only at the active **clock edge**, holding it the rest of the time. The D flip-flop\'s entire contract:\n\n```\n         at the rising clock edge:  Q(next) = D\n         between edges:             Q holds\n```\n\nOne stored bit per flop; n flops sharing one clock store an n-bit word (next lesson). Everything else in this lesson varies that theme.\n\n### The JK flip-flop: SR with the forbidden state tamed\n\nJK replaces SR\'s forbidden row with **toggle**:\n\n```\n J K | Q(next)\n 0 0 | Q        hold\n 0 1 | 0        reset\n 1 0 | 1        set\n 1 1 | NOT Q    toggle\n```\n\nToggle is powerful (counters are toggle machines) but the J=K=1 row is also why JKs fell out of fashion in synchronous design: a toggling output feeding back to its own inputs at high clock rates invites the very racing edges flops exist to prevent. Modern RTL uses D flops; JK survives in counters and textbooks.\n\n### The T flip-flop: a JK with tied inputs\n\n`T = 0` holds, `T = 1` toggles. Divide-by-2 is its native talent: clock a T flip-flop with T=1 and Q toggles once per clock — the output frequency is exactly half. Chain them and each stage divides again: 4-bit ripple counters (lesson 4) are four T flops.\n\n### Reset: synchronous or asynchronous?\n\n- **Synchronous reset**: the reset value loads only *at a clock edge* while reset is asserted. Verilog: reset inside a single `posedge clk` block.\n- **Asynchronous reset**: reset asserts *immediately*, clock or no clock. Verilog: reset in the sensitivity list (`posedge clk or negedge rst_n`).\n\nAsynchronous reset guarantees a known state even without a running clock (essential at power-up) but releases into unknown timing unless deassertion is synchronized — real chips use async assert, sync release. Either way, **every** flip-flop needs a defined power-up path; the FSM course will depend on it.\n\n### Clock enable without clock gating\n\n"Hold this value some cycles, load on others" is done with a mux in front of D:\n\n```\nQ(next) = en ? D : Q        (feedback mux — the safe pattern)\n```\n\nGating the clock itself (AND-ing the clock with en) saves power but violates timing analysis assumptions and produces skewed clocks — done only by clock-domain experts with special cells. RTL rule: enable = mux feedback, never clock gating.',
    deepDive:
      '### Inside the edge trigger: master-slave\n\nAn edge-triggered flop is two latches in series with opposite phases: the **master** is transparent while clock is low (capturing D), the **slave** while clock is high (passing master\'s value to Q). Net effect: Q changes once per cycle, shortly after the rising edge. This is why the clock-to-Q delay (Module 8) exists and why the flop is immune to D wiggling between edges. Understanding master-slave turns the abstract "samples at the edge" into a concrete circuit you could draw — and explains why build-through exercises pair a low-latch and a high-latch.\n\n### Why D won\n\nD flops make timing analysis closed-form: every path starts at a flop clock pin and ends at a flop D pin, so setup/hold checks (Module 8) are uniform. JK/T behaviors are trivially *built* from D flops in RTL: `q <= q ^ t;` is a T flop; the JK table is a two-line case. The industry kept one flop family and expressed the rest in logic — simplicity of verification beat variety of cells, a pattern worth noticing as an engineer.',
    examples: [
      {
        title: 'D flip-flop with async reset, and T/JK built from D in Verilog',
        language: 'verilog',
        code:
          '// The standard cell: D flip-flop, active-low ASYNC reset.\nmodule dff_arst(\n    input  wire clk,\n    input  wire rst_n,   // active-low, asynchronous\n    input  wire d,\n    output reg  q\n);\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n)\n            q <= 1\'b0;      // immediate, clock-independent\n        else\n            q <= d;         // sampled at the rising edge\n    end\nendmodule\n\n// T flip-flop expressed on a D flop: toggle when t = 1.\nmodule tff(\n    input  wire clk,\n    input  wire rst_n,\n    input  wire t,\n    output reg  q\n);\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n) q <= 1\'b0;\n        else        q <= q ^ t;   // hold (t=0) or toggle (t=1)\n    end\nendmodule',
        explanation: [
          'The sensitivity list `posedge clk or negedge rst_n` is what makes the reset asynchronous: it can fire without a clock edge.',
          'Inside, reset is checked first, so an asserted rst_n wins over data at every edge too — both entry paths converge on q = 0.',
          '`q <= d` is a nonblocking assignment: all flops in a design sample "simultaneously" at the edge, matching real registers (the Verilog course formalizes this).',
          'The T flop is one line on top of a D flop: XOR feedback implements the toggle row of the characteristic table.',
          'A JK would be a two-line case on the same skeleton (`2\'b11: q <= ~q;`), showing why RTL shops standardized on D.',
        ],
      },
      {
        title: 'Synchronous reset and clock enable, compared',
        language: 'verilog',
        code:
          '// SYNCHRONOUS reset + clock enable: reset takes effect only at an edge.\nmodule dff_sync_rst_en(\n    input  wire clk,\n    input  wire rst_n,   // active-low, SYNCHRONOUS\n    input  wire en,      // clock enable: load when 1, hold when 0\n    input  wire d,\n    output reg  q\n);\n    always @(posedge clk) begin     // NOTE: clk only in the list\n        if (!rst_n)\n            q <= 1\'b0;\n        else if (en)\n            q <= d;\n        // else: hold (the mux feedback is expressed by doing nothing)\n    end\nendmodule',
        explanation: [
          'With `clk` alone in the sensitivity list, nothing happens between edges — reset waits for the next clock, by definition synchronous.',
          'The priority order matters: reset outranks enable; enable outranks hold.',
          'The `else` branch does nothing, which *is* the enable-hold behavior: q keeps its value. Synthesis builds the en mux feedback; it does not gate the clock.',
          'Compare the two modules: the only structural change (sensitivity list) flips the reset from async to sync — a one-token difference with system-level consequences.',
          'Convention note: most FPGA flows prefer sync reset (maps to LUT logic); most ASIC libraries provide both — your team\'s style guide decides, and now you know the trade.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'D flip-flop sampling at rising edges',
        content:
          'educational waveform (illustrative)\n\n            E1        E2        E3        E4        E5\n  clk    ___/^^\\_____/^^\\_____/^^\\_____/^^\\_____/^^\\___\n\n  D      XXX##1######0#######1#######1#######0######\n              (d may wiggle between edges; only edge values matter)\n\n  Q      _____#1#######0#######1#######1#######0######\n              q takes D\'s edge value shortly after each E,\n              and ignores every mid-cycle wiggle of D\n\n  edge values of D:  E1=1  E2=0  E3=1  E4=1  E5=0\n  q sequence:        1     0     1     1     0',
        caption:
          'educational waveform (illustrative). The flop samples D only at rising edges; between edges D is free to change without effect.',
      },
    ],
    tables: [
      {
        caption: 'Characteristic tables',
        headers: ['Flip-flop', 'Inputs', 'Q(next)'],
        rows: [
          ['D', 'D = 0', '0'],
          ['D', 'D = 1', '1'],
          ['JK', 'J=0, K=0', 'Q (hold)'],
          ['JK', 'J=0, K=1', '0 (reset)'],
          ['JK', 'J=1, K=0', '1 (set)'],
          ['JK', 'J=1, K=1', 'NOT Q (toggle)'],
          ['T', 'T = 0', 'Q (hold)'],
          ['T', 'T = 1', 'NOT Q (toggle)'],
        ],
      },
      {
        caption: 'Synchronous vs asynchronous reset',
        headers: ['Property', 'Synchronous reset', 'Asynchronous reset'],
        rows: [
          ['Takes effect', 'At the next clock edge', 'Immediately on assertion'],
          ['Needs a running clock', 'Yes', 'No'],
          ['Verilog sensitivity', 'posedge clk only', 'posedge clk or negedge rst_n'],
          ['Release (deassert) care', 'Already aligned to clock', 'Must be synchronized to avoid races'],
          ['Typical use', 'FPGA flows, internally generated resets', 'Power-up guarantees, ASIC library flops'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Mixing async reset style with sync-only coding (e.g. adding negedge rst_n but also clk-gated logic inside).',
        fix:
          'Pick one convention per flop: async = reset in the sensitivity list with an if-first structure; sync = clk-only sensitivity with reset as the highest-priority if. Never both, and never assign q outside either branch.',
      },
      {
        mistake: 'Gating the clock to implement an enable.',
        fix:
          'AND-ing the clock with an enable creates a delayed, skewed clock that breaks setup/hold analysis. Use the mux-feedback pattern (`else` hold or `en ? d : q`); only library clock-gating cells (with latch-based enable) may do this, inserted by tools.',
      },
      {
        mistake: 'Assuming JK toggle happens "during" the clock high time.',
        fix:
          'Edge-triggered JK toggles exactly once per active edge. (The classic *level-triggered JK race-around* problem was a property of old level-sensitive JK latches — the reason master-slave edge triggering was invented.)',
      },
    ],
    guidedPractice: {
      title: 'Predict a flop chain across five edges',
      brief:
        'A D flip-flop with async active-low reset has D = NOT Q (its own complement fed back — a divide-by-2). Given rst_n released before edge E1 and D stable per the waveform method, list Q after each of five rising edges. Then state the output frequency if clk is 100 MHz.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    int q = 0;                       /* after reset */\n    printf("after reset: Q=%d\\n", q);\n    for (int e = 1; e <= 5; e++) {\n        q = !q;                      /* D = NOT Q sampled at the edge */\n        printf("edge E%d: Q=%d\\n", e, q);\n    }\n    return 0;\n}',
      expectedBehavior:
        'Q sequence: 1, 0, 1, 0, 1 — toggling every edge, so Q is clk/2. At 100 MHz the Q output is a 50 MHz square wave. The flop + XOR feedback (T = 1) is the divide-by-two cell.',
      hints: [
        'At each edge, Q(next) = D = NOT Q(current).',
        'After reset Q=0, so the first edge loads D=1.',
        'Frequency halves because the state needs two clock periods per full Q cycle.',
      ],
    },
    practiceExercises: [
      {
        title: 'Build the D flip-flop for the challenge',
        brief:
          'Write module dff(input clk, input d, output reg q) that samples d on every rising edge (no reset for the challenge\'s interface). Then add a synchronous active-high reset version beside it and state the one-line difference.',
        expectedBehavior:
          'Core: `always @(posedge clk) q <= d;`. Sync-reset version: `always @(posedge clk) begin if (rst) q <= 1\'b0; else q <= d; end` — the sensitivity list is unchanged; only the priority if is added.',
        hints: [
          'Nonblocking `<=` for all flop assignments.',
          'Async reset would instead add `or negedge rst_n` to the list — keep them straight.',
          'Match the challenge port names exactly.',
        ],
        challengeId: 'ece-02-d-flip-flop',
      },
      {
        title: 'JK table drill',
        brief:
          'A JK flip-flop currently holds Q=1. For each input pair applied at successive edges — (0,1), (1,1), (1,0), (0,0) — state Q after each edge.',
        expectedBehavior:
          '(0,1) reset -> Q=0. (1,1) toggle -> Q=1. (1,0) set -> Q=1 (already 1). (0,0) hold -> Q=1. Final Q=1 after the four edges.',
        hints: [
          'Apply the characteristic table row by row.',
          'Toggle means NOT the current value.',
          'Set on an already-set flop changes nothing.',
        ],
      },
      {
        title: 'Reset strategy critique',
        brief:
          'A design must guarantee a known state immediately at power-up, before any clock is stable. Which reset style fits, and what extra care does its *release* need? Answer in three sentences referencing the comparison table.',
        expectedBehavior:
          'Asynchronous reset: it acts without a clock, so state is defined as soon as power and reset logic are valid. The release (deassertion) must be synchronized to the clock (async assert, sync release), because releasing asynchronously near a clock edge can leave some flops reset and others not — a recovery/removal violation. A synchronizer on the reset release gives all flops the same aligned release edge.',
        hints: [
          'Which style needs no clock to assert?',
          'Asserting is easy; deasserting is where races hide.',
          'Two flip-flops in series on the reset line is the standard release synchronizer.',
        ],
      },
    ],
    assessment: {
      title: 'Flip-flops checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'A D flip-flop has D=1 during edge E3 and D=0 at all other edges. Q starts at 0. What is Q after E3 (and between E2 and E3)?',
          options: ['Q=1 after E3; Q=0 before it', 'Q=1 immediately when D becomes 1', 'Q=0 forever', 'Q toggles'],
          answer: 'Q=1 after E3; Q=0 before it',
          explanation: 'The flop samples D only at edges; between E2 and E3 Q stays 0, then loads 1 at E3.',
          hint: 'Edges are the only sampling instants.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In a JK flip-flop, what does the input pair J=1, K=1 do?',
          options: ['Toggles Q', 'Sets Q', 'Resets Q', 'Is forbidden like SR'],
          answer: 'Toggles Q',
          explanation: 'JK converts the forbidden SR row into toggle — the whole point of the JK redesign.',
          hint: 'JK tamed the forbidden state by making it useful.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'An asynchronous reset can take effect while the clock is stopped.',
          answer: 'true',
          explanation: 'That is its defining property (and its value at power-up): the reset term acts on the signal edge, independent of clk.',
          hint: 'Check the sensitivity list semantics.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What is the safe RTL pattern for "load on enable, hold otherwise"? (Name the structure, two words.)',
          answer: 'mux feedback',
          explanation: 'Q(next) = en ? D : Q — a mux feeding D from either new data or the flop\'s own output; synthesis maps it to an enable flop.',
          hint: 'The enable chooses between d and q.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'output-prediction',
          prompt: 'A T flip-flop (T=1, divide-by-2 wiring) starts at Q=0 and sees four rising clock edges. What is Q after them, and what is Q\'s frequency relative to a 10 MHz clock?',
          code: 'always @(posedge clk) q <= q ^ 1\'b1;   // t tied high',
          options: ['Q=0, 5 MHz', 'Q=1, 5 MHz', 'Q=0, 10 MHz', 'Q=1, 20 MHz'],
          answer: 'Q=0, 5 MHz',
          explanation: 'Four toggles from 0: 1,0,1,0 — Q returns to 0, having completed two full cycles in four clock periods: f = 10 MHz / 2 = 5 MHz.',
          hint: 'Toggle count parity decides the final value; frequency halves.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'D flip-flop', definition: 'Edge-triggered storage: Q(next) = D at the active clock edge; the standard sequential cell.' },
      { term: 'JK flip-flop', definition: 'SR-derived flop whose 11 input toggles instead of racing: hold/reset/set/toggle table.' },
      { term: 'T flip-flop', definition: 'JK with J=K=T: hold at 0, toggle at 1; the divide-by-two cell.' },
      { term: 'Master-slave', definition: 'Two opposite-phase latches forming one edge-triggered flop; explains clock-to-Q delay.' },
      { term: 'Asynchronous reset', definition: 'Reset acting immediately regardless of the clock; asserted in the Verilog sensitivity list.' },
      { term: 'Clock enable', definition: 'Hold/load control implemented as mux feedback into D — never by gating the clock in RTL.' },
    ],
    revisionSummary: [
      'Flop contract: sample D at the active edge, hold otherwise.',
      'JK table: 00 hold, 01 reset, 10 set, 11 toggle — the tamed SR.',
      'T = tied JK: toggles when T=1, halving frequency — counter DNA.',
      'Async reset: `posedge clk or negedge rst_n`; sync reset: clk only. Never mix.',
      'Enable = mux feedback into D; clock gating is an expert tool flow, not RTL.',
      'Master-slave construction explains single-update-per-edge and clock-to-Q delay.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Flip-flop (electronics)', url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)', kind: 'article' },
      { label: 'Electronics Tutorials — Sequential logic flip-flops', url: 'https://www.electronics-tutorials.ws/sequential/seq_1.html', kind: 'article' },
      { label: 'All About Circuits — The D flip-flop', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-10/edge-triggered-latches-flip-flops/', kind: 'docs' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'de-m06-l03',
    title: 'Registers and Shift Registers',
    summary:
      'Sharing a clock across flip-flops: n-bit registers with load and clear, the four shift-register topologies (SISO/SIPO/PISO/PIPO), and serial links as the canonical application.',
    objectives: [
      'Build an n-bit register from D flip-flops and add load/clear controls.',
      'Define SISO, SIPO, PISO and PIPO data flow and one use case for each.',
      'Trace data through a shift register one position per clock.',
      'Write a parameterizable shift register in Verilog using concatenation.',
    ],
    whyItMatters:
      'Registers are the "R" in RTL — the named storage every architecture description assumes. Shift registers are the serial-link engine (UARTs, SPI, I2C all shift bits one per clock) and the classic interview block. The Verilog `{shreg[2:0], serial_in}` idiom you learn here appears in every serial protocol implementation you will ever read.',
    prerequisites: ['de-m06-l02'],
    explanation:
      '### A register = n flip-flops, one clock\n\nWire n D flip-flops to the same clock, give each its own D input, and you have an n-bit **register**: on every edge, the whole word loads simultaneously. Add control the way Module 6 lesson 2 built them:\n\n- **Load enable**: mux feedback per bit (load new word or hold).\n- **Clear/reset**: synchronous or asynchronous, all bits to 0.\n- **Set**: rarely provided; use load with a constant instead.\n\nIn RTL a register is just a clocked process on a vector: `if (en) q <= d;`. The "one driver, shared clock" picture is what synthesis builds.\n\n### Shift registers: data moving one bit per clock\n\nChain flops so each D receives its neighbor\'s Q, and the whole word steps sideways each clock. Four topologies, named by how data enters and leaves:\n\n```\nSISO  Serial-In,  Serial-Out:  one wire in, delay line out\nSIPO  Serial-In,  Parallel-Out: collect bits into a word (receiver side)\nPISO  Parallel-In, Serial-Out:  emit a word bit by bit (transmitter side)\nPIPO  Parallel-In, Parallel-Out: just a register (load + read)\n```\n\nA 4-bit shift-right with serial input `sin`:\n\n```\nsin -->[FF0]-->[FF1]-->[FF2]-->[FF3]--> sout\n       q0       q1       q2       q3\n\nVerilog:  shreg <= {shreg[2:0], sin};   // shift LEFT in vector terms:\n          new bit enters at LSB, old MSB leaves\n```\n\nWait — direction conventions trip everyone. In the code above the *vector* shifts toward the MSB: sin becomes the new LSB, and the previous q3 is pushed out (to sout). In *hardware drawings* the arrows flow left-to-right. Both describe the same register; pick one convention per project and document it.\n\n### Worked trace\n\nStart `0000`, feed the bits 1,1,0,1 (LSB-first serial stream), one per clock:\n\n```\nedge:  start  1     2     3     4\nq3..q0: 0000  0001  0011  0110  1101\n              sin=1 enters q0; every prior bit slides up one position\n```\n\nAfter four clocks the register *holds the serial stream as a parallel word* — that is SIPO reception. A PISO transmitter is the same register loaded in parallel and tapped at one end.\n\n### Universal asynchronous receiver-transmitter: the flagship application\n\nA UART wraps a shift register with start/stop framing: the transmitter PISOs out a start bit, 8 data bits (LSB first), and a stop bit; the receiver SIPOs them back at the agreed baud rate. Every "serial console" you have ever used is two shift registers plus a baud-rate counter — which is the next lesson\'s topic.',
    deepDive:
      '### Delay lines and pipelining\n\nA SISO register with n stages is a *discrete delay line*: the output equals the input delayed by n clocks. That is not a curiosity — pipelining a long combinational path means inserting register stages, i.e., making the data shift through, trading latency for clock speed (Module 8 formalizes why). Once you see pipelining as "registers every k stages of logic", the shift register becomes the mental model for an entire CPU pipeline.\n\n### Shifts with direction and fill: barrel shifters\n\nGeneralized shifting (rotate, arithmetic shift with sign fill) is done by a **barrel shifter**: layers of muxes that move bits by 1, 2, 4 positions in parallel — log2(width) mux layers, one per shift-power bit. It is the mux lesson\'s tree pattern applied to data movement, and it is the hardware behind C\'s `<<` and `>>` on words. The simple serial shift register is the barrel shifter\'s degenerate one-bit-per-clock cousin.',
    examples: [
      {
        title: 'Parameterizable shift register (SIPO + serial out)',
        language: 'verilog',
        code:
          'module shiftreg #(\n    parameter WIDTH = 4\n)(\n    input  wire             clk,\n    input  wire             rst_n,\n    input  wire             load,        // parallel load enable\n    input  wire [WIDTH-1:0] par_in,\n    input  wire             sin,         // serial input\n    output wire             sout,        // serial output (MSB leaves first)\n    output wire [WIDTH-1:0] par_out\n);\n    reg [WIDTH-1:0] shreg;\n\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n)\n            shreg <= {WIDTH{1\'b0}};\n        else if (load)\n            shreg <= par_in;                    // PIPO mode\n        else\n            shreg <= {shreg[WIDTH-2:0], sin};   // shift: sin enters at LSB\n    end\n\n    assign sout    = shreg[WIDTH-1];\n    assign par_out = shreg;\nendmodule',
        explanation: [
          'The parameter WIDTH makes the same description a 4-bit or 64-bit register — parameterization is standard practice, not elegance.',
          '`load` selects PIPO behavior; otherwise the register shifts: `sin` becomes the new LSB and every bit moves one position toward the MSB.',
          'The concatenation `{shreg[WIDTH-2:0], sin}` is the shift idiom: drop the old MSB, append the new LSB.',
          '`sout` taps the MSB, so the *first* bit shifted in is the *first* bit shifted out after WIDTH clocks — FIFO ordering for a serial stream.',
          'Reset is asynchronous active-low, matching the convention established in the flip-flop lesson; every sequential block in this course keeps it.',
        ],
      },
      {
        title: 'Tracing a serial stream into a parallel word (C model)',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    /* Receive bits 1,1,0,1 (transmitted LSB first) into a 4-bit SIPO. */\n    const int bits[4] = {1, 1, 0, 1};\n    uint8_t shreg = 0;\n\n    for (int i = 0; i < 4; i++) {\n        shreg = (uint8_t)((shreg << 1) | (bits[i] & 1u));\n        printf("after bit %d (%d): shreg = ", i, bits[i]);\n        for (int b = 3; b >= 0; b--) putchar(((shreg >> b) & 1u) ? \'1\' : \'0\');\n        printf("\\n");\n    }\n    printf("parallel value = %u (0x%X)\\n", shreg, shreg);\n    return 0;\n}',
        explanation: [
          'Each iteration models one clock: shift the register up one position and insert the new bit at the LSB — the software mirror of `{shreg[2:0], sin}`.',
          'The intermediate prints show the word assembling: 0001, 0011, 0110, 1101.',
          'The final value 1101 = 0xD demonstrates SIPO: a serial stream became an addressable word.',
          'Note the bit order: because the stream arrives LSB-first and enters at the LSB, the final vector reads naturally — transmitting MSB-first would require reversing the wire order or the shift direction.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The four shift-register topologies',
        content:
          '  SISO (delay line)              SIPO (serial receiver)\n\n   sin>--[FF]-->[FF]-->[FF]-->sout  sin>--[FF]--o-- q0\n                 one bit out              [FF]--o-- q1   <- parallel\n                                          [FF]--o-- q2     word out\n                                          [FF]--o-- q3\n\n  PISO (serial transmitter)      PIPO (plain register)\n\n   par_in==>[FF][FF][FF][FF]--sout par_in==>[FF][FF][FF][FF]==>par_out\n        (load word, clock it out)       (load, read - no shift)',
        caption:
          'Same chain of flops, four I/O conventions: how data enters and how it leaves.',
      },
    ],
    tables: [
      {
        caption: 'Shift-register trace: 0000 receiving bits 1,1,0,1',
        headers: ['Edge', 'sin', 'q3 q2 q1 q0'],
        rows: [
          ['start', '-', '0 0 0 0'],
          ['1', '1', '0 0 0 1'],
          ['2', '1', '0 0 1 1'],
          ['3', '0', '0 1 1 0'],
          ['4', '1', '1 1 0 1'],
        ],
      },
      {
        caption: 'Topology selection guide',
        headers: ['Topology', 'Data in', 'Data out', 'Typical use'],
        rows: [
          ['SISO', 'serial', 'serial', 'Delay line, pipelining'],
          ['SIPO', 'serial', 'parallel', 'UART/SPI receiver'],
          ['PISO', 'parallel', 'serial', 'UART/SPI transmitter'],
          ['PIPO', 'parallel', 'parallel', 'Plain register, pipeline stage'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Mixing shift direction conventions between drawing and code.',
        fix:
          'Decide: `{shreg[WIDTH-2:0], sin}` shifts toward the MSB (sin at LSB); `{sin, shreg[WIDTH-1:1]}` shifts toward the LSB (sin at MSB). Both are valid; mixing them mid-design reverses your bit order and corrupts serial protocols.',
      },
      {
        mistake: 'Assigning a register bit in two different always blocks.',
        fix:
          'Each reg (and each bit of a reg vector) must have exactly one driver process. Two blocks updating shreg[0] is a multiple-driver error — merge the logic or partition the vector cleanly.',
      },
      {
        mistake: 'Assuming a shift register outputs its word "already aligned".',
        fix:
          'The parallel value is only meaningful after exactly WIDTH clocks (SIPO), and alignment depends on which end you tapped. Protocols solve this with start bits and baud counters — count your edges before declaring the word received.',
      },
    ],
    guidedPractice: {
      title: 'Transmit a word serially (PISO trace)',
      brief:
        'A PISO register loads 1011 (parallel), then shifts toward the MSB with sin=0, tapping sout at the MSB. Trace sout for four clocks after load, and state the serial bit order that leaves the chip.',
      starterCode:
        '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t shreg = 0xB;   /* 1011 loaded in parallel */\n    printf("loaded: ");\n    for (int b = 3; b >= 0; b--) putchar(((shreg >> b) & 1u) ? \'1\' : \'0\');\n    printf("\\n");\n\n    for (int clk = 1; clk <= 4; clk++) {\n        int sout = (shreg >> 3) & 1u;              /* MSB leaves first */\n        shreg = (uint8_t)((shreg << 1) & 0xFu);    /* shift toward MSB, sin=0 */\n        printf("clock %d: sout=%d\\n", clk, sout);\n    }\n    return 0;\n}',
      expectedBehavior:
        'sout sequence after load: 1, 0, 1, 1 — the word leaves MSB-first. The register passes through 1011 -> 0110 -> 1100 -> 1000 -> 0000 (sin=0 fills the emptied LSB). A receiver shifting the other way reconstructs 1011 (or 1101, depending on its convention — this is exactly why protocols specify bit order).',
      hints: [
        'The MSB tap emits the oldest-loaded bit first.',
        'Each clock: read sout BEFORE shifting, then shift.',
        'With sin=0 the register drains to zero in exactly four clocks.',
      ],
    },
    practiceExercises: [
      {
        title: 'Pipeline a datapath',
        brief:
          'A combinational block takes 8 ns; the clock is 100 MHz (10 ns). Explain how inserting a 2-stage pipeline (registers splitting the logic in half) raises throughput, using the SISO delay-line picture, and state the new latency in clocks.',
        expectedBehavior:
          'Split logic into two ~4 ns halves with a register between: each stage now meets the 10 ns period comfortably, so the clock can (potentially) rise beyond 100 MHz. One item still takes 2 clocks (latency 2), but a new result can *start* every clock — throughput one per cycle instead of one per 8+ ns. The pipeline is literally a SISO shift register threaded through the logic stages.',
        hints: [
          'Throughput (items per second) and latency (time per item) are different metrics.',
          'Registers bound the combinational depth between them.',
          'Module 8 will quantify exactly why the split helps: setup time per stage.',
        ],
      },
      {
        title: 'Rotate via shift register',
        brief:
          'Show how a 4-bit register with parallel load and a feedback connection (q0 routed back to sin) rotates its contents: trace 1001 for four clocks with load released after the first.',
        expectedBehavior:
          'Load 1001; thereafter sin = q0 (the LSB feeds back). Clocks: 1001 -> 1100 -> 0110 -> 0011 -> 1001 — after four clocks the original word returns: a rotate-right by one per clock. This circular shift register is the ring counter\'s cousin and costs no extra mux.',
        hints: [
          'The LSB that falls off the end is exactly what re-enters.',
          'Rotate = shift where nothing is lost.',
          'Four distinct states before repeat — count them.',
        ],
      },
    ],
    assessment: {
      title: 'Registers and shift registers checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does the Verilog idiom `shreg <= {shreg[2:0], sin};` do on a 4-bit register?',
          options: [
            'Shifts toward the MSB, entering sin at the LSB',
            'Shifts toward the LSB, entering sin at the MSB',
            'Loads sin into all four bits',
            'Rotates the register left',
          ],
          answer: 'Shifts toward the MSB, entering sin at the LSB',
          explanation: 'The old bits move up one position and sin takes the vacant LSB; the old MSB is pushed out (tapped as sout).',
          hint: 'Which position does sin occupy in the concatenation?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A SISO register with 8 stages delays its input by exactly 8 clock cycles.',
          answer: 'true',
          explanation: 'Each flop contributes one clock of delay; the chain is a discrete delay line of n cycles.',
          hint: 'One flop = one clock of delay.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'Register 0000 receives serial bits 1,0,1 (one per clock, entering at LSB, shifting toward MSB). What does it hold after three clocks (q2 q1 q0)?',
          code: 'shreg <= {shreg[2:0], sin};',
          options: ['101', '010', '011', '110'],
          answer: '101',
          explanation: 'Trace: 000 -> 001 (sin=1) -> 010 (sin=0) -> 101 (sin=1). The first-received bit ends up highest.',
          hint: 'Apply the shift three times, appending each bit at the LSB.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Which topology does the transmitter side of a UART use? (Four-letter acronym.)',
          answer: 'PISO',
          explanation: 'Parallel-In Serial-Out: the byte loads in parallel and clocks out bit by bit with start/stop framing.',
          hint: 'The transmitter holds a whole byte but sends one bit at a time.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'Why is a register bit assigned in two always blocks an error?',
          options: [
            'Two drivers contend for one net — the hardware equivalent of a short',
            'Verilog forbids two always blocks per module',
            'It makes synthesis slower but is legal',
            'It only matters for latches',
          ],
          answer: 'Two drivers contend for one net — the hardware equivalent of a short',
          explanation: 'A wire with two active drivers is contention; synthesis flags multiple drivers and simulation produces x. Every reg needs exactly one driving process.',
          hint: 'Think two gate outputs on one wire.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Register', definition: 'n D flip-flops sharing one clock, storing an n-bit word; the R in RTL.' },
      { term: 'Shift register', definition: 'Flops chained so data moves one position per clock.' },
      { term: 'SISO / SIPO / PISO / PIPO', definition: 'The four I/O topologies: serial/parallel in, serial/parallel out.' },
      { term: 'Concatenation shift', definition: 'The Verilog idiom `{shreg[WIDTH-2:0], sin}` moving data and inserting the new bit in one assignment.' },
      { term: 'Pipeline', definition: 'Registers inserted along a datapath to bound combinational depth; a SISO delay line through the logic.' },
      { term: 'Barrel shifter', definition: 'Mux layers shifting by powers of two in one clock; the parallel cousin of the shift register.' },
    ],
    revisionSummary: [
      'Register = shared-clock flops with load (mux feedback) and clear.',
      'Four topologies by I/O: SISO delay, SIPO receive, PISO transmit, PIPO store.',
      'One bit enters per clock; after WIDTH clocks a serial stream becomes a word (and vice versa).',
      'The concatenation idiom encodes both shift direction and entry point — document the convention.',
      'Pipelining is shift-register thinking applied to datapaths.',
      'UART/SPI are shift registers plus framing and baud timing.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Shift register', url: 'https://en.wikipedia.org/wiki/Shift_register', kind: 'article' },
      { label: 'Wikipedia — Universal asynchronous receiver-transmitter', url: 'https://en.wikipedia.org/wiki/Universal_asynchronous_receiver-transmitter', kind: 'article' },
      { label: 'All About Circuits — Shift registers', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-12/serial-in-serial-out-shift-register/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'de-m06-l04',
    title: 'Counters: Ripple vs Synchronous',
    summary:
      'Counting with flip-flops: ripple (asynchronous) counters and their propagation-delay flaw, synchronous counters with shared clocks and enable chains, and designing modulo-N counters.',
    objectives: [
      'Build a ripple counter from T flip-flops and trace its count sequence including transient states.',
      'Quantify the ripple counter\'s delay growth and decoding-glitch problem.',
      'Design a synchronous counter where every flop shares the clock.',
      'Design a modulo-N counter (worked: mod-10) using comparison and synchronous clear.',
    ],
    whyItMatters:
      'Counters time everything: baud rates, PWM, debouncers, address sequencers, timer peripherals. The ripple-vs-synchronous contrast is a compact lesson in why clocked synchronous design conquered digital electronics — the same reasoning scales to clock domain crossing and timing closure in later courses.',
    prerequisites: ['de-m06-l02', 'de-m06-l03'],
    explanation:
      '### Ripple counter: the lazy chain\n\nA T flip-flop with T=1 divides its clock by two. Chain them, clocking each stage from the *previous stage\'s output*, and the chain counts:\n\n```\nclk -->[FF0] Q0 -->[FF1] Q1 -->[FF2] Q2      (negative-edge triggered\n                                                flops, Q drives next clk)\nQ2 Q1 Q0:  000 -> 001 -> 010 -> ... -> 111 -> 000\n```\n\nQ0 toggles every clock, Q1 every second clock, Q2 every fourth — the binary count appears across Q2..Q0. Beautifully cheap. Two flaws:\n\n1. **Delay accumulates.** Each flop only starts after the previous one toggles: changing 111 -> 000 walks through 110 and 100 transiently. A 4-bit ripple counter takes 4 flop delays to settle; n bits take n.\n2. **Decode glitches.** Any logic decoding a value (e.g. "count == 6") sees the transient codes and can pulse falsely.\n\n### Synchronous counter: everyone clocks together\n\nGive **every** flop the same clock and compute each stage\'s toggle enable combinationally:\n\n```\nen0 = 1                      (LSB always toggles)\nen1 = Q0                     (toggle when lower bits all 1)\nen2 = Q0 AND Q1\nenN = AND of all lower bits\n\nT_i = en_i,  Q_i(next) = Q_i XOR en_i\n```\n\nAll bits change within one clock-to-Q plus a small AND delay — the count is valid together, decoders see no transients, and speed no longer degrades with width (only the AND chain grows, and lookahead fixes even that). This is the "synchronous design" philosophy in miniature: one clock, logic computes next state, flops update together.\n\n### Modulo-N counters\n\nA 4-bit binary counter is naturally mod-16. For **mod-10** (a decimal digit), detect the terminal count and clear:\n\n```\nterminal = (count == 4\'d9)        // 1001\ncount(next) = terminal ? 0 : count + 1\n```\n\nThe comparison plus the mux-feedback clear make the counter wrap 0..9 — the heart of every digital clock chip. Detect-and-clear must be *synchronous* (act at the edge) or you reintroduce a ripple-style transient: an asynchronous clear on compare creates a one-gate-delay spike of state 10 that decoders can see.',
    deepDive:
      '### Why synchronous design won\n\nThe ripple counter is honest async design: cheap, fast for the first stage, but unanalyzable at scale — delays compose, glitches multiply, and no timing tool can certify it. Synchronous design replaces "wait for the previous stage" with "everyone waits for the same edge", converting all delay questions into one uniform check (Module 8): does data arrive between one edge and the next? That question is answerable statically, which is what lets billion-transistor chips be verified at all. Every async trick you meet later (clock domains, async FIFOs) exists as a *localized, carefully managed exception* to the synchronous rule.\n\n### Ring, Johnson, and LFSR counters\n\nNot all counters are binary. A **ring counter** circulates a single 1 (one-hot states — directly usable as decoder outputs). A **Johnson** counter feeds back the complement, giving 2n states from n flops with only decode-two-inputs complexity. An **LFSR** (linear feedback shift register) counts through 2^n - 1 pseudo-random states with one XOR — used for BIST and scrambling. They trade natural binary ordering for cheaper logic or special properties; choosing a counter type is a design decision, not a default.',
    examples: [
      {
        title: 'Synchronous 4-bit counter with enable and mod-10 wrap (Verilog)',
        language: 'verilog',
        code:
          'module counter_mod10(\n    input  wire       clk,\n    input  wire       rst_n,\n    input  wire       enable,      // count on edges when high\n    output reg  [3:0] count,\n    output wire       terminal     // high during the last state (9)\n);\n    assign terminal = (count == 4\'d9);\n\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n)\n            count <= 4\'d0;\n        else if (enable) begin\n            if (terminal)\n                count <= 4\'d0;            // synchronous wrap: 9 -> 0\n            else\n                count <= count + 4\'d1;\n        end\n        // else hold\n    end\nendmodule',
        explanation: [
          'One clock, one reset: every bit of `count` updates together at each edge — synchronous by construction.',
          '`terminal` is a combinational compare against 9; the wrap uses it *inside* the clocked block, so state 10 never exists, even transiently.',
          '`enable` implements the shared-enable counter behavior: all flops hold when it is low.',
          'The count sequence is 0,1,...,9,0,1,... — a decimal digit; chaining this stage\'s `terminal` into a next stage\'s enable builds multi-digit clocks.',
          'A plain mod-16 version is the same module without the terminal compare; the mod-N skeleton generalizes to any N with one constant change.',
        ],
      },
      {
        title: 'Ripple-counter transient states, demonstrated as a simulation trace',
        language: 'text',
        code:
          '3-bit ripple counter, negative-edge-triggered flops,\nQ0 clocked by clk; Q1 by Q0 falling; Q2 by Q1 falling.\n\nTransition 7 -> 0 (clk falling edge at t0):\n\n  t0        : Q2 Q1 Q0 = 1 1 1   (value 7)\n  t0 + d    : Q0 toggles 1->0    = 1 1 0   (value 6)  <-- transient\n  t0 + 2d   : Q1 toggles 1->0    = 1 0 0   (value 4)  <-- transient\n  t0 + 3d   : Q2 toggles 1->0    = 0 0 0   (value 0)  correct\n\n  A decoder for "6" wired to Q2..Q0 pulses HIGH for one gate delay\n  during the 7->0 transition, although 6 was never the settled count.\n\nWorst-case settle time = n * t_pd(FF). At n=8 and t_pd = 1 ns,\nthe count is unreliable for 8 ns after every relevant edge.',
        explanation: [
          'Each row is one flop\'s contribution: the carry *is* physical, one delay at a time.',
          'The transient codes (6, then 4) are real voltage states on the Q pins — any decoder sees them.',
          'Synchronous counting would show exactly one transition, 7 -> 0, at one clock-to-Q delay.',
          'This is the entire argument for the synchronous style, compressed into one timing diagram.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Ripple chain vs synchronous enable chain',
        content:
          '  RIPPLE (clock daisy-chained)        SYNCHRONOUS (shared clock)\n\n  clk>--[FF0]--Q0>--[FF1]--Q1>--[FF2]        clk ----+----+----+\n                 ^          ^                        |    |    |\n                 clock      clock                  [FF0][FF1][FF2]\n                                                     ^    ^    ^\n                                              en0=1  en1=Q0  en2=Q0*Q1\n                                                     (AND enable chain)\n\n  ripple: settle delay grows with n; decode glitches.\n  sync:   all bits valid after ONE clock-to-Q; clean decode.',
        caption:
          'Same count sequence, two clocking disciplines — and two very different timing stories.',
      },
    ],
    tables: [
      {
        caption: 'Synchronous counter enable logic (4 bits)',
        headers: ['Bit', 'Toggle enable', 'Meaning'],
        rows: [
          ['Q0', '1', 'LSB toggles every count'],
          ['Q1', 'Q0', 'Toggles when Q0 was 1'],
          ['Q2', 'Q0 AND Q1', 'Toggles when both lower bits were 1'],
          ['Q3', 'Q0 AND Q1 AND Q2', 'Toggles when all lower bits were 1'],
        ],
      },
      {
        caption: 'Mod-10 counter sequence (terminal compare at 9)',
        headers: ['count', 'binary', 'terminal?', 'next'],
        rows: [
          ['0', '0000', 'no', '1'],
          ['1', '0001', 'no', '2'],
          ['2', '0010', 'no', '3'],
          ['3', '0011', 'no', '4'],
          ['4', '0100', 'no', '5'],
          ['5', '0101', 'no', '6'],
          ['6', '0110', 'no', '7'],
          ['7', '0111', 'no', '8'],
          ['8', '1000', 'no', '9'],
          ['9', '1001', 'YES', '0 (wrap)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Clocking later stages from Q when the flops are rising-edge triggered.',
        fix:
          'For an up-counter with rising-edge flops, clock later stages from Q\' (the complement) — or, far better, switch to the synchronous structure. Mismatched edge polarity gives a *down*-counter, a classic surprise.',
      },
      {
        mistake: 'Implementing mod-N wrap with asynchronous clear on compare.',
        fix:
          'Async clear on (count == N) lets state N exist for a gate delay — the same transient/glitch disease as the ripple counter. Compare and clear *synchronously* inside the clocked block so state N never exists.',
      },
      {
        mistake: 'Counting the mod-10 sequence from 1 to 10.',
        fix:
          'A mod-10 counter has ten states: 0..9. Off-by-one in the terminal compare (== 10) skips state 0 and breaks downstream decoders. Always enumerate the sequence as a table before coding.',
      },
    ],
    guidedPractice: {
      title: 'Design a mod-6 counter',
      brief:
        'Design a 3-bit synchronous counter that cycles 0..5 (mod-6): write the terminal compare, the next-state rule, and enumerate the full sequence including the wrap. Then explain why the compare value is 5, not 6.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    int count = 0;\n    for (int clk = 0; clk < 14; clk++) {\n        printf("count = %d\\n", count);\n        int terminal = (count == 5);        /* mod-6: last state is 5 */\n        count = terminal ? 0 : count + 1;\n    }\n    return 0;\n}',
      expectedBehavior:
        'Sequence: 0,1,2,3,4,5,0,1,... — six states, wrapping via the compare count == 5. The compare value is the LAST state (5), because the wrap fires when the counter sits on the final state and must move to 0; comparing == 6 would require state 6 to exist (7 total states with a skip), breaking the mod-6 period.',
      hints: [
        'mod-N means N distinct states; for 0-based counting the last is N-1.',
        'The wrap is "when terminal, next = 0", evaluated synchronously.',
        'The printed sequence must show exactly six values between wraps.',
      ],
    },
    practiceExercises: [
      {
        title: 'Cascade two mod-10 stages',
        brief:
          'Two mod-10 counters make a 00-99 counter: stage L counts units, stage H counts tens. Specify the connection (what H\'s enable sees) and state the total state count.',
        expectedBehavior:
          'H.enable = L.terminal (asserted while L sits on 9). At the shared clock edge where L wraps 9->0, H increments — exactly one carry per 100 clocks. Total states: 10 x 10 = 100 (00..99). This is the synchronous-cascade rule: enables ripple logically, but every flop still shares one clock.',
        hints: [
          'The tens digit advances only when the units digit is about to wrap.',
          'Use the terminal output, not decoded equality in the next stage.',
          'Count states: mod-10 x mod-10.',
        ],
      },
      {
        title: 'Decode-glitch forensics',
        brief:
          'A 4-bit ripple counter runs 0111 -> 1000 (7 -> 8). List the transient states a decoder sees and their order, then compute how many settle-delays the transition takes.',
        expectedBehavior:
          'Ripple-up with negative-edge flops: the clock edge toggles Q0 (1->0), whose falling edge toggles Q1 (1->0), then Q2, then Q3. Sequence: 0111 -> 0110 (6) -> 0100 (4) -> 0000 (0) -> 1000 (8). Decoders for 6, 4 and 0 each see a false pulse, and the transition takes 4 flip-flop delays to settle.',
        hints: [
          'At each stage, the toggle ripples from LSB upward, one flop delay at a time.',
          'Write each intermediate 4-bit pattern as a decimal value to see which decoders misfire.',
          'Count stages toggled: that equals the settle delays.',
        ],
      },
    ],
    assessment: {
      title: 'Counters checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What fundamentally limits a ripple counter\'s maximum clock frequency?',
          options: [
            'The accumulated propagation delays of all stages in the chain',
            'The number of decoded outputs',
            'The reset width',
            'Nothing — ripple counters are unconditionally fastest',
          ],
          answer: 'The accumulated propagation delays of all stages in the chain',
          explanation: 'Each stage waits for the previous; total settle time is n flip-flop delays, capping the clock period.',
          hint: 'How long until the last stage settles?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'In a synchronous counter, every flip-flop receives the same clock signal.',
          answer: 'true',
          explanation: 'That is the definition; stage-to-stage sequencing happens through combinational enable logic, not clock chaining.',
          hint: 'One clock, many enables.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'A mod-10 counter currently reads 9 and enable is high. What does it hold after the next rising edge?',
          code: 'if (terminal)      // count == 9\n    count <= 0;\nelse\n    count <= count + 1;',
          options: ['0', '10', '9', 'undefined'],
          answer: '0',
          explanation: 'The synchronous wrap fires: state 10 never exists. The counter has ten states, 0 through 9.',
          hint: 'What does terminal detect?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Name the counter type that circulates a single 1 through n flip-flops (one-hot states). (Two words.)',
          answer: 'ring counter',
          explanation: 'A ring counter shifts a solitary 1 around the loop; its outputs are directly usable as one-hot selects.',
          hint: 'A shift register with feedback and one hot bit.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'Why must a mod-N wrap use synchronous clear rather than asynchronous clear on compare?',
          options: [
            'Async clear lets the illegal state N exist for a gate delay, exposing decoders to glitches',
            'Async clear is slower',
            'Sync clear uses fewer gates',
            'Async clear cannot clear to zero',
          ],
          answer: 'Async clear lets the illegal state N exist for a gate delay, exposing decoders to glitches',
          explanation:
            'Compare-then-async-clear means the counter physically enters state N briefly — a transient like the ripple counter\'s. Synchronous wrapping inside the clocked block makes state N impossible.',
          hint: 'How long does the async path take to act?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Ripple counter', definition: 'Async counter whose stages clock from the previous stage\'s output; delay and glitches accumulate with width.' },
      { term: 'Synchronous counter', definition: 'All flops share one clock; toggle enables derive combinationally from lower bits.' },
      { term: 'Terminal count', definition: 'The final state of a modulo-N counter (N-1 for 0-based counting); decoded to trigger the wrap.' },
      { term: 'Modulo-N', definition: 'A counter with exactly N distinct states before repeating.' },
      { term: 'Ring counter', definition: 'Shift register with feedback circulating a single 1: n states, one-hot outputs.' },
      { term: 'Johnson counter', definition: 'Ring counter feeding back the complement: 2n states from n flops.' },
    ],
    revisionSummary: [
      'T flop + chain = ripple counter: cheap, but n-stage settle time and decode glitches.',
      'Synchronous counter: shared clock, enable_i = AND of lower bits; clean and width-scalable.',
      'Mod-N: compare the last state (N-1) and wrap synchronously; state N must never exist.',
      'Decode glitches come from transient states — synchronous design removes them at the source.',
      'Cascade counters via terminal-count enables on a shared clock.',
      'Ring/Johnson/LFSR counters trade binary ordering for simpler or special-purpose logic.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Counter (digital)', url: 'https://en.wikipedia.org/wiki/Counter_(digital)', kind: 'article' },
      { label: 'Wikipedia — Ring counter', url: 'https://en.wikipedia.org/wiki/Ring_counter', kind: 'article' },
      { label: 'Electronics Tutorials — Counters', url: 'https://www.electronics-tutorials.ws/counter/count_1.html', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
];
