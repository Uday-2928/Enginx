import type { TutorialLesson } from '../types';

// Module 11 — Finite-State Machines
export const module11Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m11-l1',
    title: 'FSM Fundamentals: Moore vs Mealy',
    summary:
      'Recap state-machine theory, then implement the SAME 1011 sequence detector as both Moore and Mealy and compare their output timing.',
    objectives: [
      'Read and draw FSM state diagrams and transition tables.',
      'Define Moore and Mealy machines precisely.',
      'Implement the 1011 overlapping sequence detector both ways.',
      'Predict and compare output timing: same-cycle (Mealy) vs next-cycle (Moore).',
    ],
    whyItMatters:
      'FSMs are the control planes of all digital systems — protocol handlers, bus arbiters, traffic controllers, command interpreters. The Moore/Mealy choice is a real design decision with timing consequences (glitch-free registered outputs vs single-cycle response), and the sequence detector is the canonical exercise that makes the trade-off concrete. Every later module (FIFO control, UART framing, the traffic project) is an FSM wearing different clothes.',
    prerequisites: ['vlog-m10-l1', 'vlog-m06-l2', 'vlog-m07-l3'],
    explanation:
      'A **finite-state machine** is a register of state plus rules: on every clock, the NEXT state is computed from the CURRENT state and the inputs, and the state register captures it. Everything the machine "remembers" lives in the state encoding; everything it decides is the next-state function.\n\nTwo output conventions exist:\n\n- **Moore**: outputs depend ONLY on the state. Output changes are registered (aligned with state changes) — clean, glitch-resistant, but delayed: the machine must first REACH a state that asserts the output.\n- **Mealy**: outputs depend on state AND inputs, combinationally. Outputs can respond in the SAME cycle as the triggering input — faster, fewer states sometimes — but the combinational path (input → output) can glitch and must not feed asynchronous logic directly.\n\n**The 1011 detector (overlapping)** looks for the bit sequence 1,0,1,1 arriving one bit per clock; overlapping means the trailing bits of one match can seed the next (…101**1011**… contains two matches). States track "longest useful suffix seen": S0 (nothing), S1 ("1"), S10 ("10"), S101 ("101"), and for Moore a fifth state S_OK (detected). Transitions follow the suffix logic — from S101 on x=0 you do NOT fall to S0: the trailing "10" is still useful, so you go to S10. This suffix bookkeeping is the whole intellectual content of sequence detectors.',
    deepDive:
      '### Deriving transitions from suffixes (the general method)\n\nOn input x in state "prefix P", the new progress is the longest suffix of P+x that is still a prefix of the target "1011". Examples: from S101 ("101") with x=0: the string "1010" ends in "10" → S10. From S1 ("1") with x=1: "11" ends in "1" → S1 (stay). From S_OK after detection, the last consumed bits are "…1011": with x=1 the stream ends "…10111" whose suffix "1" → S1; with x=0 it ends "…10110" with suffix "10" → S10. Once you can do this mechanically, ANY sequence detector — and any string-matching control logic — is a fill-in table.\n\n### Why Moore needs the fifth state\n\nMoore outputs live IN states, so detection needs a state whose existence IS "just detected": S_OK. Mealy outputs live ON transitions (S101 + x=1 → z=1), so four states suffice. This is the general pattern: Mealy may save states, Moore spends a state to buy a registered, glitch-free output. Neither is "better"; the interface requirements decide (does the consumer need the pulse in-cycle? can it tolerate glitches?).\n\n### Comparing the timing on one trace\n\nInput 1,0,1,1: Mealy asserts z=1 DURING the 4th bit cycle (state S101 AND x=1 — combinational). Moore asserts z=1 during the 5th cycle (the state register lands in S_OK one edge later). The information is identical; the DELIVERY differs by one cycle. Testbenches must encode this expectation — it is the most common source of "my FSM is one cycle late" confusion.',
    examples: [
      {
        title: 'Moore 1011 detector: diagram, table, RTL',
        language: 'verilog',
        code:
          '// detect1011_moore.v — overlapping sequence detector, MOORE output\nmodule detect1011_moore(\n    input  wire clk,\n    input  wire reset_n,\n    input  wire x,          // one bit per clock\n    output wire z           // 1 in the cycle AFTER the 4th matching bit\n);\n    localparam S0   = 3\'d0,   // no progress\n               S1   = 3\'d1,   // seen "1"\n               S10  = 3\'d2,   // seen "10"\n               S101 = 3\'d3,   // seen "101"\n               S_OK = 3\'d4;   // seen "1011" (output state)\n\n    reg [2:0] state, next;\n\n    // Next-state logic (combinational, complete with default).\n    always @* begin\n        next = S0;                       // default: safe recovery\n        case (state)\n            S0:   next = x ? S1   : S0;\n            S1:   next = x ? S1   : S10;\n            S10:  next = x ? S101 : S0;\n            S101: next = x ? S_OK : S10;\n            S_OK: next = x ? S1   : S10;  // overlap: suffix seeds next match\n            default: next = S0;\n        endcase\n    end\n\n    // State register (async active-low reset to S0).\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) state <= S0;\n        else          state <= next;\n    end\n\n    // Moore output: a function of state ONLY.\n    assign z = (state == S_OK);\n\nendmodule',
        explanation: [
          'Five states encode detection progress; S_OK exists solely to be the output state (the Moore tax).',
          'The next-state case is complete: every state has both input branches, default covers impossible encodings (safe recovery to S0).',
          'Suffix transitions verified: S101 + x=0 → S10 (the trailing "10" of "1010" is progress, not failure); S_OK + x=1 → S1, + x=0 → S10.',
          'Trace input 1,0,1,1 (edges e1..e4, starting S0): e1: S0,x=1→S1. e2: S1,x=0→S10. e3: S10,x=1→S101. e4: S101,x=1→S_OK. z becomes 1 AFTER e4 — one cycle later than the bit that completed the match.',
          'Overlapping trace "1011011": continues e5: S_OK,x=0→S10; e6: S10,x=1→S101; e7: S101,x=1→S_OK — second detection at e7 ✓.',
        ],
      },
      {
        title: 'Mealy 1011 detector and the timing comparison',
        language: 'verilog',
        code:
          '// detect1011_mealy.v — overlapping detector, MEALY output\nmodule detect1011_mealy(\n    input  wire clk,\n    input  wire reset_n,\n    input  wire x,\n    output wire z          // 1 DURING the cycle of the 4th matching bit\n);\n    localparam S0   = 2\'d0,\n               S1   = 2\'d1,\n               S10  = 2\'d2,\n               S101 = 2\'d3;\n\n    reg [1:0] state, next;\n\n    always @* begin\n        next = S0;\n        case (state)\n            S0:   next = x ? S1   : S0;\n            S1:   next = x ? S1   : S10;\n            S10:  next = x ? S101 : S0;\n            S101: next = x ? S1   : S10;   // no S_OK: back to progress\n            default: next = S0;\n        endcase\n    end\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) state <= S0;\n        else          state <= next;\n    end\n\n    // Mealy output: state AND current input.\n    assign z = (state == S101) && x;\n\nendmodule',
        explanation: [
          'Four states — no S_OK, because the output fires ON the S101+x=1 transition instead of in a dedicated state.',
          'z = (state == S101) && x is combinational: it can change mid-cycle when x changes. That speed is the Mealy advantage; the glitch exposure is the price.',
          'Same trace 1,0,1,1: e1→S1, e2→S10, e3→S101; during the 4th cycle state=S101 and x=1 → z=1 IMMEDIATELY (same cycle as the completing bit).',
          'Overlapping "1011011": after firing at b4 the machine took next=S1 (suffix "1"); e5: S1,x=0→S10; e6: S10,x=1→S101; b7: z=1 again ✓.',
          'TIMING COMPARISON (the assessment-worthy row): on input 1,0,1,1 — Mealy z=1 during cycle 4; Moore z=1 during cycle 5. Same detection, one cycle apart.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'Moore 1011 detector: state diagram (x/z notation)',
        content:
          '            x=1            x=0            x=1            x=1\n   [S0] ---------> [S1] ---------> [S10] ---------> [S101] ---------> [S_OK]\n    ^z=0            |z=0            |z=0            |z=0             z=1\n    |               |x=1(self)      |x=0->S0        |x=0->S10          |\n    +--- x=0 (self) +               +               +                  |\n                                                                          |\n        S_OK: x=1 -> S1 (suffix "1"),  x=0 -> S10 (suffix "10")  <--------+\n\n   Moore output: z=1 ONLY in S_OK (state-owned output).',
        caption:
          'Each arrow is one clock transition; self-loops handle non-progress inputs. S_OK exists to carry the output.',
      },
    ],
    tables: [
      {
        caption: 'Moore transition/output table',
        headers: ['State', 'Means', 'next if x=0', 'next if x=1', 'z'],
        rows: [
          ['S0', 'no progress', 'S0', 'S1', '0'],
          ['S1', 'seen 1', 'S10', 'S1', '0'],
          ['S10', 'seen 10', 'S0', 'S101', '0'],
          ['S101', 'seen 101', 'S10', 'S_OK', '0'],
          ['S_OK', 'detected 1011', 'S10', 'S1', '1'],
        ],
      },
      {
        caption: 'Mealy transition/output table (z on transitions)',
        headers: ['State', 'x=0: next / z', 'x=1: next / z'],
        rows: [
          ['S0', 'S0 / 0', 'S1 / 0'],
          ['S1', 'S10 / 0', 'S1 / 0'],
          ['S10', 'S0 / 0', 'S101 / 0'],
          ['S101', 'S10 / 0', 'S1 / 1'],
        ],
      },
      {
        caption: 'Timing comparison on input 1,0,1,1',
        headers: ['Cycle', 'x', 'Moore state', 'Moore z', 'Mealy z'],
        rows: [
          ['1', '1', 'S1', '0', '0'],
          ['2', '0', 'S10', '0', '0'],
          ['3', '1', 'S101', '0', '0'],
          ['4', '1', 'S_OK (lands after c4)', '0 during c4', '1 (same cycle)'],
          ['5', '-', 'S_OK held', '1', '0'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Sending S101 → S0 on x=0 (dropping the useful "10" suffix).',
        fix:
          'Track the longest useful SUFFIX: "1010" ends in "10" → S10. Wrong suffix handling silently breaks OVERLAPPING detection (…1011011… misses the second match).',
      },
      {
        mistake: 'Comparing Moore and Mealy outputs cycle-for-cycle and concluding one is broken.',
        fix:
          'They differ by one cycle BY DESIGN (registered vs combinational output). The testbench encodes each style’s expected timing separately — module 14 shows the harness doing exactly that.',
      },
      {
        mistake: 'Leaving a Mealy output combinationally connected to another clocked block’s async reset or an output pin without registration.',
        fix:
          'Mealy outputs can glitch mid-cycle (input changes). If the consumer needs a clean pulse, register the Mealy output (three-always style, module 11-l2) — costing the cycle you were trying to save.',
      },
    ],
    guidedPractice: {
      title: 'Complete the overlapping trace',
      brief:
        'For BOTH detectors, trace input 1,1,0,1,0,1,1 (seven cycles): give state after each edge and the z value during each cycle (Moore: state-owned; Mealy: state+input). How many detections and where?',
      expectedBehavior:
        'Stream contains 1011 at bits 4-7 only (1,1,0,1,0,1,1 → positions 4..7 = 1,0,1,1). Mealy: z=1 during cycle 7. Moore: state lands in S_OK after edge 7 → z=1 during cycle 8. State traces — Mealy: e1 S1, e2 S1, e3 S10, e4 S101, e5 S10 (x=0 from S101), e6 S101, e7 fire. Moore: e1 S1, e2 S1, e3 S10, e4 S101, e5 S10, e6 S101, e7 S_OK.',
      hints: [
        'The first two 1s both keep you in S1 ("11" still has suffix "1").',
        'From S101 with x=0 you go to S10, NOT S0.',
      ],
    },
    practiceExercises: [
      {
        title: 'Detect 110 (non-overlapping vs overlapping)',
        brief:
          'Build the transition table for a Moore detector of 110 with OVERLAPPING enabled, and identify which row changes if overlapping is disabled (return to S0 after detection).',
        expectedBehavior:
          'States: S0, S1 ("1"), S11 ("11"), S_OK. Suffix transitions: S1+x=1→S11; S11+x=0→S_OK; S11+x=1→S11 ("111" suffix "11"); S_OK+x=1→S1, x=0→S0? — suffix of "1100" is none→S0; of "1101" is "1"→S1. Disabling overlap: S_OK always returns to S0 (discarding the "1" suffix of "1101").',
        hints: [
          'Apply the suffix method mechanically to every (state, x) pair.',
          'The only difference is the S_OK row.',
        ],
      },
      {
        title: 'Why one cycle later?',
        brief:
          'In one paragraph, explain to a reviewer why the Moore detector’s z rises one cycle after the 4th input bit, and what hardware difference causes it.',
        expectedBehavior:
          'Moore outputs are decoded from the state REGISTER: the S_OK state exists only after the next-state value has been captured at the edge FOLLOWING the 4th bit, so z rises then. Mealy decodes state AND the live input combinationally, so the completing bit itself participates in z. Hardware difference: Moore output = decode of registered state (glitch-free, registered timing); Mealy output = registered state plus a live-input gate in the same combinational cone.',
        hints: [
          'Ask: which register does the output decode from?',
          'Where does the completing input bit enter each circuit?',
        ],
      },
    ],
    assessment: {
      title: 'Module 11 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What defines a MOORE machine?',
          options: [
            'Outputs are a function of state only',
            'Outputs are a function of state and inputs',
            'It has no outputs',
            'It uses one-hot encoding',
          ],
          answer: 'Outputs are a function of state only',
          explanation:
            'Moore outputs decode from the state register alone — registered, glitch-free, one cycle after the triggering input. Mealy adds live inputs to the output logic.',
          hint: 'Whose name is on the box — what does the output see?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'In detect1011_moore, the machine is in S101 and x=1 arrives. What is z during this cycle, and what is the state after the edge?',
          code:
            'S101: next = x ? S_OK : S10;\nassign z = (state == S_OK);\n// state=S101, x=1',
          options: ['z=0 during, S_OK after', 'z=1 during, S_OK after', 'z=1 during, S101 after', 'z=0, S101 after'],
          answer: 'z=0 during, S_OK after',
          explanation:
            'Moore z decodes the CURRENT state (S101 → z=0). The edge captures next=S_OK, so z rises one cycle later — the Moore timing signature.',
          hint: 'z looks at state, and state has not changed yet.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'In the overlapping 1011 detector, from state S101 with x=0, the correct next state is:',
          options: ['S10 (the trailing "10" is still progress)', 'S0 (match failed)', 'S101 (stay)', 'S_OK'],
          answer: 'S10 (the trailing "10" is still progress)',
          explanation:
            'The stream so far ends "…1010"; its longest suffix that is a prefix of 1011 is "10" → S10. Dropping to S0 breaks overlapping detection.',
          hint: 'What suffix of "1010" is useful?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'A Mealy implementation of the 1011 detector needs one fewer state than the Moore implementation.',
          answer: 'true',
          explanation:
            'Mealy fires the output on the S101+x=1 transition, so no dedicated S_OK state is needed: 4 states vs Moore’s 5. Mealy often saves states; Moore spends one for registered outputs.',
          hint: 'Where does each style "store" the detection event?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'For input 1,0,1,1: during which cycle (number) does the MEALY z first assert?',
          answer: '4',
          explanation:
            'Mealy z = (state == S101) && x fires combinationally during the 4th cycle — the same cycle whose input bit completes the match. (Moore asserts during cycle 5.)',
          hint: 'Same cycle as the completing bit.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Finite-state machine', definition: 'State register + next-state function: sequential control described as states and transitions.' },
      { term: 'Moore machine', definition: 'Outputs decode from state only; registered timing, glitch-free.' },
      { term: 'Mealy machine', definition: 'Outputs decode from state AND inputs; same-cycle response, combinational glitch exposure.' },
      { term: 'Suffix tracking', definition: 'Deriving transitions from the longest useful suffix of the consumed stream — the sequence-detector method.' },
      { term: 'Overlapping detection', definition: 'Matches allowed to share bits: the tail of one match seeds the next.' },
    ],
    revisionSummary: [
      'FSM = state register + combinational next-state logic; the state encoding holds all memory.',
      'Moore: state-owned outputs, one-cycle-later, glitch-free. Mealy: transition-owned outputs, same-cycle, glitch-prone.',
      'Sequence detectors use longest-useful-suffix transitions — S101+x=0 goes to S10, never S0.',
      'Mealy saved a state (4 vs 5) by firing on the transition; Moore spent S_OK to register the output.',
      'Encode each style’s timing separately in testbenches — the one-cycle difference is by design.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Finite-state machine', url: 'https://en.wikipedia.org/wiki/Finite-state_machine', kind: 'article' },
      { label: 'Wikipedia — Moore machine', url: 'https://en.wikipedia.org/wiki/Moore_machine', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'vlog-m11-l2',
    title: 'FSM Coding Templates and State Encoding',
    summary:
      'Adopt the two-always and three-always FSM skeletons, learn why defaults are non-negotiable, and choose between binary and one-hot encodings.',
    objectives: [
      'Write the two-always FSM template (state reg + next-state comb) from memory.',
      'Add the three-always registered-output variant and know when to use it.',
      'Apply default assignments and safe-recovery states against x-state and illegal encodings.',
      'Choose binary vs one-hot encoding with area/speed trade-offs stated.',
    ],
    whyItMatters:
      'FSMs are where hardware teams converge on near-universal templates — because FSM bugs (stuck states, latch inference, illegal-state capture) are expensive and 100 percent preventable by style. The two-always skeleton is also the direct application of module 07’s methodology: one clocked block, one combinational block, defaults everywhere. Encoding choice, meanwhile, is your first real FPGA-vs-ASIC resource trade-off decision.',
    prerequisites: ['vlog-m11-l1', 'vlog-m07-l3', 'vlog-m06-l2'],
    explanation:
      'The **two-always template** splits the machine exactly along module 07’s lines:\n\n```\n// Block 1: combinational next-state + outputs (always @*, blocking)\n// Block 2: clocked state register (always @(posedge clk...), nonblocking)\n```\n\nThe combinational block computes `next` from `state` and inputs — with a DEFAULT next at the top and a default branch in the case. The clocked block is three lines: reset to the home state, else capture next. Outputs may be decoded with continuous assigns (Moore) from state.\n\nThe **three-always template** adds a third clocked block that REGISTERS the outputs: outputs change one cycle later but are glitch-free and directly usable as clean enables. Choose it when outputs drive real-world pins or async-sensitive logic; stay two-always when same-cycle Moore outputs are fine.\n\n**Defaults are the FSM safety net**, twice over: (1) the combinational default (`next = S0;` before the case, plus a case default) prevents latch inference and covers any state value the case does not name; (2) safe recovery sends illegal encodings (state values your localparams never assign — reachable after X-state injection or cosmic upsets in real silicon) back to the home state instead of hanging.\n\n**State encoding** assigns binary values to states: **binary** packs states into ceil(log2(N)) bits (5 states → 3 bits — minimum flip-flops, more next-state decoding logic); **one-hot** uses one flip-flop per state (5 states → 5 bits — next-state logic becomes "is my bit set and is the condition true", very shallow, ideal for FPGA LUT architectures where flip-flops are plentiful). The synthesis tool may re-encode anyway; explicit localparam encodings make the source intent reviewable.',
    deepDive:
      '### Why the default-next must come BEFORE the case\n\nAssigning `next = S0;` at the top of the always @* block gives every path through the case a defined result — the latch-prevention discipline from module 06/15 applied to FSMs. It ALSO implements safe recovery for free: if `state` holds an encoding no case arm names (e.g. 3\'d5 for a 5-state one-hot machine after an X-injection or an SEU), the case falls through to default and the machine walks home next cycle. Omit the default and synthesis builds latches for `next` — an FSM that can freeze mid-graph, the worst failure mode a controller has.\n\n### One-hot mechanics, made concrete\n\nIn one-hot, each state is a single set bit: S0=5\'b00001, S1=5\'b00010, …. The next-state logic for S10 becomes: `next[S101] = state[S10] & x;` — one AND gate per transition, no N-bit comparisons. Outputs become single-wire taps (z = state[S_OK]). On FPGAs (LUT + FF rich, logic-depth poor) one-hot typically wins on speed; in ASIC standard cells the flip-flop cost makes binary attractive for >16-state machines. Many synthesis tools offer "one-hot encoding" switches — but a hand-written one-hot template documents the intent regardless of tool flags.\n\n### Registered outputs: the third always in practice\n\n```\nalways @(posedge clk or negedge reset_n)\n    if (!reset_n) z_r <= 1\'b0;\n    else          z_r <= (state == S_OK);   // register the Moore decode\n```\n\nz_r is now edge-aligned and glitch-free — the right choice when z_r enables off-chip logic or a reset path. The cost: z_r lags the Moore decode by one cycle, so the specification’s timing (and the testbench) must be written against the REGISTERED timing. Decide output timing once, at the interface, and encode it in the template choice.',
    examples: [
      {
        title: 'The two-always template, fully annotated (Moore 1011)',
        language: 'verilog',
        code:
          '// fsm_template.v — the course-standard two-always Moore FSM\nmodule fsm_1011(\n    input  wire clk,\n    input  wire reset_n,\n    input  wire x,\n    output wire z\n);\n    // ---- state encoding (binary here; one-hot variant below) ----\n    localparam [2:0] S0   = 3\'d0,\n                     S1   = 3\'d1,\n                     S10  = 3\'d2,\n                     S101 = 3\'d3,\n                     S_OK = 3\'d4;\n\n    reg [2:0] state, next;\n\n    // ---- ALWAYS 1: combinational next-state (blocking, defaults first) ----\n    always @* begin\n        next = S0;                       // DEFAULT #1: safe recovery + no latch\n        case (state)\n            S0:   next = x ? S1   : S0;\n            S1:   next = x ? S1   : S10;\n            S10:  next = x ? S101 : S0;\n            S101: next = x ? S_OK : S10;\n            S_OK: next = x ? S1   : S10;\n            default: next = S0;          // DEFAULT #2: illegal encodings go home\n        endcase\n    end\n\n    // ---- ALWAYS 2: clocked state register (nonblocking, async reset) ----\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) state <= S0;       // home state\n        else          state <= next;\n    end\n\n    // ---- Moore output decode (continuous assign: state only) ----\n    assign z = (state == S_OK);\n\nendmodule',
        explanation: [
          'ALWAYS 1 is pure combinational: blocking assignments, defaults before and inside the case. It answers "what should the next state be?" — never captures anything.',
          'ALWAYS 2 is the only stateful element: three lines, course reset template, nonblocking. It answers "when does the state move?" — at edges only.',
          'The two defaults together mean the FSM can never hang: unknown states AND uncovered branches both resolve to S0 next cycle.',
          'Output as a continuous assign keeps the two-always purity: z is a decode of registered state (same-cycle Moore timing).',
          'This exact skeleton — rename states, edit the case — is the template for every FSM in modules 11-l3 and 16.',
        ],
      },
      {
        title: 'One-hot encoding and the three-always registered-output variant',
        language: 'verilog',
        code:
          '// fsm_onehot_regout.v — one-hot states + registered output\nmodule fsm_1011_oh(\n    input  wire clk,\n    input  wire reset_n,\n    input  wire x,\n    output wire z_r        // REGISTERED output: glitch-free, 1 cycle later\n);\n    // One-hot: one bit per state. 5 states -> 5 flip-flops.\n    localparam [4:0] S0   = 5\'b00001,\n                     S1   = 5\'b00010,\n                     S10  = 5\'b00100,\n                     S101 = 5\'b01000,\n                     S_OK = 5\'b10000;\n\n    reg [4:0] state, next;\n    reg       z_r;\n\n    // ALWAYS 1: next-state (one-hot style: bit-wise moves)\n    always @* begin\n        next = S0;                                  // default target\n        case (state)\n            S0:   next = x ? S1   : S0;\n            S1:   next = x ? S1   : S10;\n            S10:  next = x ? S101 : S0;\n            S101: next = x ? S_OK : S10;\n            S_OK: next = x ? S1   : S10;\n            default: next = S0;\n        endcase\n    end\n\n    // ALWAYS 2: state register — reset must land on a LEGAL one-hot value.\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) state <= S0;                  // = 5\'b00001\n        else          state <= next;\n    end\n\n    // ALWAYS 3: registered output (glitch-free pin driver).\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) z_r <= 1\'b0;\n        else          z_r <= (state == S_OK);       // register the decode\n    end\n\nendmodule',
        explanation: [
          'One-hot encodings: each state is a single set bit. Comparisons like (state == S_OK) become single-bit decodes in hardware — shallow logic, FPGA-friendly.',
          'Reset value matters doubly in one-hot: state <= S0 (5\'b00001) is a LEGAL one-hot code; resetting to 5\'b00000 would be an illegal state the case-default would have to rescue.',
          'ALWAYS 3 registers the output decode: z_r is edge-aligned and glitch-free — suitable for off-chip pins or async-sensitive consumers — at the cost of one more cycle of latency.',
          'The one-cycle price is now explicit in the interface: consumers of z_r see the detection one cycle later than the two-always z. Document this in the header.',
          'Template summary: two-always for internal same-cycle Moore outputs; three-always when outputs must be registered (pins, async consumers, clean enables).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Two-always vs three-always FSM structure',
        content:
          '  TWO-ALWAYS                          THREE-ALWAYS (+ registered outputs)\n\n   x ----+---> [always @* ] -- next --+                   x --+---> [always @*] -- next --+\n         |     next-state logic       |                       |                          |\n         |         ^ state            v                       |          ^ state         v\n         |         |              [posedge clk]             |          |          [posedge clk]\n         |         |              state reg                 |          |          state reg\n         +----------------------------------------------+   |          +-----------------------------------+\n                                                                          | state\n                                                                          v\n                                                                  [posedge clk] output reg\n                                                                          |\n                                                                          v\n                                                                    z_r (glitch-free,\n                                                                         1 cycle later)\n\n   z = decode(state)   (same-cycle Moore)',
        caption:
          'The third always only REGISTERS the output decode: same machine, cleaner output timing, one cycle of latency.',
      },
    ],
    tables: [
      {
        caption: 'FSM template checklist (review with this)',
        headers: ['Item', 'Requirement'],
        rows: [
          ['Combinational block', 'always @*, blocking, default next BEFORE the case'],
          ['Case', 'default branch → home state'],
          ['State register', 'always @(posedge clk or negedge reset_n), nonblocking, reset to home'],
          ['Outputs', 'Moore decode from state (two-always) or registered (three-always)'],
          ['Encoding', 'localparam, binary or one-hot; reset value is a LEGAL encoding'],
        ],
      },
      {
        caption: 'Binary vs one-hot encoding',
        headers: ['Aspect', 'Binary', 'One-hot'],
        rows: [
          ['Flip-flops', 'ceil(log2 N) — 3 for 5 states', 'N — 5 for 5 states'],
          ['Next-state logic', 'N-bit compares (deeper)', 'bit taps + ANDs (shallow)'],
          ['Output decode', 'compare against encoded value', 'single wire tap'],
          ['Best home', 'ASIC, large state counts', 'FPGA (LUT+FF rich)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Omitting the default next (or the case default) because "every state is covered".',
        fix:
          'Coverage is not the point: defaults give X-injected and illegally-encoded states a path home and prevent latch inference on next. Both defaults, always — the FSM safety net.',
      },
      {
        mistake: 'Resetting a one-hot state register to 5\'b00000.',
        fix:
          'All-zeros is not a legal one-hot state. Reset to the HOME state’s one-hot code (e.g. S0 = 5\'b00001) so the machine starts on a valid state.',
      },
      {
        mistake: 'Mixing registered and combinational outputs for the same signal across template variants, then chasing a one-cycle timing "bug".',
        fix:
          'Decide output timing at the interface: same-cycle (two-always) or registered (three-always). The testbench expectations must match the chosen template — the one-cycle delta is design, not defect.',
      },
    ],
    guidedPractice: {
      title: 'Audit an FSM skeleton',
      brief:
        'Find every violation in: `always @(posedge clk) begin state <= next; end` / `always @* begin case (state) S_A: next = S_B; S_B: next = S_A; endcase end` with states S_A=1\'b0, S_B=1\'b1, reset absent, output assign y = (state == 2\'b10);',
      expectedBehavior:
        'Violations: (1) state register has NO reset (Rule 5: reset all state; also no negedge reset_n in the list); (2) case has no default AND no default next assignment — latch inference on next and no illegal-state recovery; (3) y compares state against 2\'b10 — impossible for a 1-bit state: y is stuck 0; output should be (state == S_B).',
      hints: [
        'Check the template checklist row by row.',
        'The output decode width mismatch is the sneaky one.',
      ],
    },
    practiceExercises: [
      {
        title: 'Convert binary to one-hot',
        brief:
          'Rewrite the two-always 1011 template with one-hot encodings (5\'b00001…5\'b10000), keeping behavior identical. Then state the flip-flop count before (3) and after (5), and why the next-state logic gets shallower.',
        expectedBehavior:
          'Same case structure; localparams become 5\'b00001, 5\'b00010, 5\'b00100, 5\'b01000, 5\'b10000; reset value S0 = 5\'b00001. Flip-flops: 3 → 5. Next-state logic: each transition becomes a single-bit test + condition (e.g. next[S101] = state[S10] & x) instead of 3-bit equality compares — one gate level shallower.',
        hints: [
          'Only the localparam values and the reset value change.',
          'Equality against a one-hot code is a single wire.',
        ],
      },
      {
        title: 'Registered output for a noisy consumer',
        brief:
          'Take fsm_1011 (two-always) and produce the three-always variant whose z_r drives an off-chip LED. State the latency change and update the timing table row for input 1,0,1,1.',
        expectedBehavior:
          'Add the third clocked block registering z_r <= (state == S_OK) with async reset. Latency: detection now visible 2 cycles after the 4th bit (1 for Moore state + 1 for the output register). Timing row: cycle 4 z_r=0, cycle 5 z_r=0, cycle 6 z_r=1.',
        hints: [
          'Each registration adds one cycle.',
          'The testbench expectation must move to cycle 6.',
        ],
      },
    ],
    assessment: {
      title: 'Module 11 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In the two-always template, what do the two blocks each contain?',
          options: [
            'Combinational next-state logic (always @*, blocking) and a clocked state register (nonblocking)',
            'Two clocked registers',
            'A clocked block for next-state and a combinational block for state',
            'Outputs only',
          ],
          answer: 'Combinational next-state logic (always @*, blocking) and a clocked state register (nonblocking)',
          explanation:
            'The split follows module 07’s methodology: the comb block computes next (what), the clocked block captures it (when). Outputs decode from state.',
          hint: 'What vs when.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Why must the next-state case include a default (or a pre-case default assignment)?',
          options: [
            'Prevents latch inference and gives illegal/X-injected state encodings a path back to the home state',
            'It makes simulation faster',
            'It is required for one-hot encoding only',
            'It substitutes for the reset',
          ],
          answer: 'Prevents latch inference and gives illegal/X-injected state encodings a path back to the home state',
          explanation:
            'Defaults complete the combinational logic (no latch on next) and implement safe recovery — the FSM can never hang on an uncovered state value.',
          hint: 'What happens if state holds a value no arm names?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'For a 5-state FSM on an FPGA, which encoding generally minimizes next-state logic depth?',
          options: ['One-hot (5 flip-flops, bit-tap transitions)', 'Binary (3 flip-flops)', 'Gray code', 'No encoding — use integers'],
          answer: 'One-hot (5 flip-flops, bit-tap transitions)',
          explanation:
            'One-hot transitions become single-bit tests + ANDs (shallow), trading 2 extra flip-flops — the right trade on FPGA fabrics. Binary minimizes flip-flops but deepens the decode.',
          hint: 'Which resource is abundant on FPGAs?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'This one-hot FSM has a reset bug. What is it?',
          code:
            'localparam [2:0] S0 = 3\'b001, S1 = 3\'b010, S2 = 3\'b100;\nalways @(posedge clk or negedge reset_n)\n    if (!reset_n) state <= 3\'b000;',
          options: [
            'The reset value 3\'b000 is not a legal one-hot state — reset to S0 (3\'b001)',
            'The reset should be synchronous',
            'The encodings are binary',
            'Nothing is wrong',
          ],
          answer: 'The reset value 3\'b000 is not a legal one-hot state — reset to S0 (3\'b001)',
          explanation:
            'One-hot machines must wake up in a valid one-hot state. Resetting to all-zeros creates an illegal state that the (hoped-for) default would have to rescue — fix the reset value instead.',
          hint: 'Is 000 a one-hot code?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'What does the third always block in the three-always template add (two words)?',
          answer: 'registered outputs',
          explanation:
            'It registers the output decode: glitch-free, edge-aligned outputs at the cost of one extra cycle of latency.',
          hint: 'It moves the output through a flip-flop.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Two-always template', definition: 'Combinational next-state block + clocked state register; Moore outputs decoded from state.' },
      { term: 'Three-always template', definition: 'Adds a clocked output-register block: glitch-free outputs, one extra cycle of latency.' },
      { term: 'Safe recovery', definition: 'Defaults routing illegal or X-injected state encodings back to the home state next cycle.' },
      { term: 'Binary encoding', definition: 'ceil(log2 N) bits of state — minimum flip-flops, deeper decode.' },
      { term: 'One-hot encoding', definition: 'One flip-flop per state — shallow decode, FPGA-friendly; reset value must be a legal one-hot code.' },
    ],
    revisionSummary: [
      'Two-always: comb next-state (defaults first) + clocked state register; z decoded from state.',
      'Three-always: add registered outputs for pins/async consumers — one cycle later, glitch-free.',
      'Defaults twice: pre-case default next AND case default branch — no latches, no hangs.',
      'One-hot: one FF per state, bit-tap transitions; reset to a legal one-hot code.',
      'Binary minimizes flip-flops; one-hot minimizes logic depth — pick by target and state count.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Finite-state machine', url: 'https://en.wikipedia.org/wiki/Finite-state_machine', kind: 'article' },
      { label: 'Wikipedia — One-hot', url: 'https://en.wikipedia.org/wiki/One-hot', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m11-l3',
    title: 'Worked FSM Designs: Traffic Light and Vending Machine',
    summary:
      'Apply the template to two classic controllers — a timer-driven traffic light and a coin-accumulating vending machine — with verification checklists.',
    objectives: [
      'Design a traffic-light controller with parameterized timings and a countdown timer.',
      'Design a vending machine accumulating coins with exact-change and change-giving paths.',
      'Produce a verification checklist for each FSM.',
      'Recognize timer-driven vs event-driven FSM structures.',
    ],
    whyItMatters:
      'These two designs cover the two great FSM families: TIMER-driven (the controller advances on internal countdowns — traffic lights, watchdogs, protocol timeouts) and EVENT-driven (the controller reacts to external tokens — coins, keys, interrupts). Both are interview staples and both appear as full projects in module 16 and projects.ts; learning them as clean template applications makes the capstone versions straightforward.',
    prerequisites: ['vlog-m11-l2', 'vlog-m10-l2'],
    explanation:
      '**Traffic light (timer-driven).** Four states — A_GREEN, A_YELLOW, B_GREEN, B_YELLOW — cycle in strict order. A countdown timer registers the remaining duration; when it hits zero, the machine advances and reloads the timer with the NEXT state’s duration (green and yellow durations differ — parameters). Outputs are one-hot lamps decoded from state (Moore). The timer and the FSM share one clocked block or live in two (state register + timer register) — both valid; the template below uses two registers in one clocked block with the combinational next-state logic computing both.\n\n**Vending machine (event-driven).** Price 20, coins nickel (01) and dime (10), none (00). States hold accumulated credit: S0, S5, S10, S15. Coin events transition; reaching >= 20 moves to a dispense state — with a separate DISPENSE_CHANGE state when credit overshoots (15 + dime = 25 → dispense + 5 change). After dispense, both states return to S0. Outputs (Moore): dispense in either dispense state; change only in DISPENSE_CHANGE.\n\n**Verification checklists** (the deliverable of this lesson): traffic — order of states, correct duration per state, timer reload on transition, reset to A_GREEN, lamp one-hotness (never two lamps on); vending — every (state, coin) pair, exact-20 vs 25-with-change paths, dispense pulse duration, return to S0, ignored coins while dispensing.',
    deepDive:
      '### Timer arithmetic: count-down vs count-up\n\nCount-down (reload N-1, decrement, advance on 0) reads naturally as "time remaining". Count-up (increment, advance on N-1) matches the module 10-l2 terminal-count pattern. Both are correct; the classic bug is mixing metaphors — advancing on timer==0 in a count-up design (which fires on the FIRST cycle since the counter starts at 0). Pick one, encode it in the parameter names (DUR_GREEN vs GREEN_N), and verify the FIRST state’s duration in the testbench — that is where the off-by-one hides (a green lasting T+1 cycles because the reload and the compare disagree).\n\n### Event validity windows\n\nEvent-driven FSMs must specify WHEN inputs are sampled: the vending machine samples coin every clock (a held coin would repeatedly add credit!). The clean contract: coin is a 1-cycle pulse per inserted coin (produced by an edge-detector on the mechanical switch — module 09-l3). The RTL below documents this and ignores coin during dispense states; the testbench drives pulse-per-coin. Sampling contracts are interface decisions — unwritten ones become integration bugs.\n\n### Change-giving as a state, not an output hack\n\nGiving change takes TIME (a physical actuator cycles) — so it gets its own state (DISPENSE_CHANGE) whose output (change) asserts while the machine waits. Overloading dispense’s state with a conditional change output (Mealy-flavored) would glitch the change line and hide the wait duration. Rule: physical actions that take time get states; instantaneous decodes get outputs.',
    examples: [
      {
        title: 'Traffic light controller with parameterized timer',
        language: 'verilog',
        code:
          '// traffic_light.v — timer-driven Moore FSM\nmodule traffic_light #(\n    parameter T_GREEN  = 10,     // clocks per green\n    parameter T_YELLOW = 2       // clocks per yellow\n)(\n    input  wire clk,\n    input  wire reset_n,\n    output reg  a_green,\n    output reg  a_yellow,\n    output reg  b_green,\n    output reg  b_yellow\n);\n    localparam [1:0] A_G = 2\'d0, A_Y = 2\'d1, B_G = 2\'d2, B_Y = 2\'d3;\n    localparam [3:0] TMAX = (T_GREEN > T_YELLOW) ? T_GREEN : T_YELLOW;\n\n    reg [1:0] state, next;\n    reg [3:0] tcnt, tnext;      // countdown timer (fits TMAX up to 15)\n\n    // ALWAYS 1: next state AND next timer (combinational, defaults first).\n    always @* begin\n        next  = A_G;            // defaults\n        tnext = T_GREEN - 1;    // default reload: what A_G needs\n        case (state)\n            A_G: begin\n                if (tcnt == 0) begin next = A_Y; tnext = T_YELLOW - 1; end\n                else           tnext = tcnt - 4\'d1;\n            end\n            A_Y: begin\n                if (tcnt == 0) begin next = B_G; tnext = T_GREEN - 1; end\n                else           tnext = tcnt - 4\'d1;\n            end\n            B_G: begin\n                if (tcnt == 0) begin next = B_Y; tnext = T_YELLOW - 1; end\n                else           tnext = tcnt - 4\'d1;\n            end\n            B_Y: begin\n                if (tcnt == 0) begin next = A_G; tnext = T_GREEN - 1; end\n                else           tnext = tcnt - 4\'d1;\n            end\n            default: begin next = A_G; tnext = T_GREEN - 1; end\n        endcase\n    end\n\n    // ALWAYS 2: state + timer registers.\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            state <= A_G;\n            tcnt  <= T_GREEN - 1;   // A_G lasts T_GREEN clocks from reset\n        end else begin\n            state <= next;\n            tcnt  <= tnext;\n        end\n    end\n\n    // Moore lamp decode (one-hot by construction).\n    always @* begin\n        a_green  = (state == A_G);\n        a_yellow = (state == A_Y);\n        b_green  = (state == B_G);\n        b_yellow = (state == B_Y);\n    end\n\nendmodule',
        explanation: [
          'The FSM and its timer advance together: tcnt counts down each cycle; hitting 0 both switches state AND reloads the timer for the next duration.',
          'Parameterized durations: T_GREEN and T_YELLOW are single edit points; TMAX sizes the counter comment-wise (4 bits hold up to 15).',
          'Cycle accounting check (T_GREEN=10, T_YELLOW=2): reset loads tcnt=9; A_G holds while tcnt = 9,8,...,0 — exactly 10 clocks in A_GREEN; then 2 clocks in A_YELLOW. The reload value is DURATION-1 because the reload cycle itself is the first cycle of the new state.',
          'Reset lands in A_G with a loaded timer — the design never shows an un-lighted intersection.',
          'Lamps are mutually exclusive (one-hot decode of state) — the verification checklist checks exactly that.',
        ],
      },
      {
        title: 'Vending machine: coins, dispense, change',
        language: 'verilog',
        code:
          '// vending.v — event-driven Moore FSM (coin pulses; price 20)\nmodule vending(\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire [1:0] coin,        // 00 none, 01 nickel(5), 10 dime(10)\n    output reg        dispense,\n    output reg        change5      // give 5 back (25 paid)\n);\n    localparam [2:0] S0   = 3\'d0,   // credit 0\n                     S5   = 3\'d1,   // credit 5\n                     S10  = 3\'d2,   // credit 10\n                     S15  = 3\'d3,   // credit 15\n                     SDIS = 3\'d4,   // dispensing (no change)\n                     SDIS_CH = 3\'d5;// dispensing + change\n\n    reg [2:0] state, next;\n\n    always @* begin\n        next = S0;                                   // default: recover home\n        case (state)\n            S0:  next = (coin == 2\'b01) ? S5  :\n                        (coin == 2\'b10) ? S10 : S0;\n            S5:  next = (coin == 2\'b01) ? S10 :\n                        (coin == 2\'b10) ? S15 : S5;\n            S10: next = (coin == 2\'b01) ? S15 :\n                        (coin == 2\'b10) ? SDIS : S10;   // 10+10 = 20 exact\n            S15: next = (coin == 2\'b01) ? SDIS :      // 15+5 = 20 exact\n                        (coin == 2\'b10) ? SDIS_CH : S15; // 15+10 = 25: change\n            SDIS:    next = S0;                     // one-cycle dispense act\n            SDIS_CH: next = S0;\n            default: next = S0;\n        endcase\n    end\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) state <= S0;\n        else          state <= next;\n    end\n\n    always @* begin\n        dispense = (state == SDIS) || (state == SDIS_CH);\n        change5  = (state == SDIS_CH);\n    end\n\nendmodule',
        explanation: [
          'States ARE the accumulated credit — the machine never stores a running total separately; the state encoding is the datapath (a classic Moore trick).',
          'The 20-exact paths: S10+dime → SDIS (10+10), S15+nickel → SDIS (15+5). The overshoot path: S15+dime → SDIS_CH (25 → dispense + 5 change).',
          'Dispense states last exactly one cycle (next = S0): dispense is a 1-cycle pulse. A real actuator would add a wait-for-done state — the state-structure point of the deepDive.',
          'coin is sampled every clock: the CONTRACT is 1-cycle pulses per coin (edge-detector output, module 09-l3). A held coin would keep adding credit — the checklist tests this.',
          'Trace: dime, dime: S0 →(dime) S10 →(dime) SDIS → S0: dispense pulses once, no change. Trace: dime, nickel, dime: S0→S10→S15→SDIS_CH: dispense + change ✓.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'Vending machine state diagram (coin labels on transitions)',
        content:
          '            nickel          dime\n   [S0] -----------> [S5] -----------> [S10]\n     |                  |                  |\n     | dime             | dime             | dime\n     v                  v                  v\n   [S10]             [S15]             [SDIS] --+ (dispense=1)\n     |                  |            (exact 20)  |\n     +------------------+                  v\n     dime                nickel         [S0]\n           S15 -- dime --> [SDIS_CH] (dispense=1, change5=1) --> S0',
        caption:
          'States hold credit; coins are transition labels; physical actions (dispense/change) are Moore outputs of dedicated states.',
      },
    ],
    tables: [
      {
        caption: 'Traffic light timing table (T_GREEN=10, T_YELLOW=2)',
        headers: ['State', 'Duration (clocks)', 'Lamps on'],
        rows: [
          ['A_G', '10', 'a_green'],
          ['A_Y', '2', 'a_yellow'],
          ['B_G', '10', 'b_green'],
          ['B_Y', '2', 'b_yellow'],
          ['total cycle', '24 clocks', 'exactly one lamp at a time'],
        ],
      },
      {
        caption: 'Vending machine transition table (coin: 0=none, 5, 10)',
        headers: ['State (credit)', 'coin=0', 'coin=5', 'coin=10'],
        rows: [
          ['S0 (0)', 'S0', 'S5', 'S10'],
          ['S5 (5)', 'S5', 'S10', 'S15'],
          ['S10 (10)', 'S10', 'S15', 'SDIS (exact 20)'],
          ['S15 (15)', 'S15', 'SDIS (exact 20)', 'SDIS_CH (25: change)'],
          ['SDIS / SDIS_CH', 'S0', 'S0', 'S0'],
        ],
      },
      {
        caption: 'FSM verification checklist (both designs)',
        headers: ['Check', 'Traffic', 'Vending'],
        rows: [
          ['Reset state', 'A_G with timer loaded', 'S0'],
          ['Happy path', 'A_G 10 → A_Y 2 → B_G 10 → B_Y 2 → repeat', 'dime+dime → dispense, no change'],
          ['Alternate path', 'timer expiry order', 'dime+nickel+dime → dispense + change'],
          ['Edge behavior', 'timer reload on transition; no dark cycle', 'coin ignored (contract) during dispense'],
          ['Output sanity', 'exactly one lamp high always', 'dispense 1-cycle pulse; change only in SDIS_CH'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Green lasting T+1 cycles because the reload value and the compare disagree.',
        fix:
          'With count-down and "advance on tcnt == 0", the reload is DURATION-1 (the reload cycle is the first cycle of the new state). Verify the FIRST state’s duration explicitly in the testbench.',
      },
      {
        mistake: 'Assuming coin stays high while the customer "holds" the button.',
        fix:
          'The interface contract is 1-cycle pulses per coin (edge-detected input). A held coin re-triggers credit additions every clock; either document the pulse contract or add edge detection inside.',
      },
      {
        mistake: 'Baking change-giving into the dispense state with a Mealy-ish conditional output.',
        fix:
          'Actions that take physical time get their own states (SDIS_CH) with Moore outputs. This keeps change glitch-free, encodes the wait duration, and keeps the diagram honest.',
      },
    ],
    guidedPractice: {
      title: 'Cycle-accounting audit',
      brief:
        'For traffic_light (T_GREEN=10, T_YELLOW=2): starting from reset, list (state, tcnt) for the first 14 cycles and confirm A_G lasts exactly 10 and A_Y exactly 2.',
      expectedBehavior:
        'Cycle 1: A_G, tcnt=9 (registered at reset release edge). Cycles 1-10: A_G with tcnt 9..0 (10 cycles). Cycle 11: A_Y, tcnt=1. Cycle 12: A_Y, tcnt=0. Cycle 13: B_G, tcnt=9. A_G spanned exactly 10 cycles (tcnt 9→0), A_Y exactly 2 (1→0). The off-by-one trap: reload value DURATION-1 makes the duration EXACT because the reload cycle counts as the new state’s first.',
      hints: [
        'tcnt decrements every cycle including the transition cycle.',
        'Count states per tcnt value: 10 distinct tcnt values in A_G.',
      ],
    },
    practiceExercises: [
      {
        title: 'Emergency mode (add a state)',
        brief:
          'Extend traffic_light: an input hazard forces an immediate transition to A_YELLOW from B_G or B_Y (skipping remaining time), with normal timing resumed afterward. Update the case and the verification checklist.',
        expectedBehavior:
          'Add to B_G/B_Y arms: if (tcnt == 0 || hazard) → next = B_Y/A_G respectively with reloads. B_Y on hazard → A_G with reload. Checklist gains: hazard from mid-B_G lands in B_Y with full yellow duration; hazard during A states ignored (spec choice documented).',
        hints: [
          'OR the hazard into the timer-expiry condition.',
          'Decide (and document) whether hazard interrupts A-side states too.',
        ],
      },
      {
        title: 'Price 25 variant',
        brief:
          'Modify vending for price 25 with the same coins: enumerate the new states (0,5,10,15,20) and all dispense/change transitions. Which paid totals give change?',
        expectedBehavior:
          'States S0, S5, S10, S15, S20 (credit 0..20 in 5-steps) plus the two dispense states. Dispense-no-change: S15+dime → 25 exact, and S20+nickel → 25 exact. Dispense-with-change: S20+dime → 30 → change 5 (the ONLY overshoot reachable: the max paid beyond 25 is 30 since the machine dispenses at 25). The state-per-credit pattern scales, but state count grows with price granularity — a general design lesson.',
        hints: [
          'Credit can now reach 20 without dispensing.',
          'Overshoot is capped: max paid beyond price = 25-20 with the previous price; here 30-25 = 5? — enumerate carefully: 20+dime = 30 → change 5; the max overshoot is one dime minus the 5-step.',
        ],
      },
    ],
    assessment: {
      title: 'Module 11 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In the traffic-light FSM, why is the timer reload value DURATION-1 rather than DURATION?',
          options: [
            'Because the reload cycle itself is the first cycle of the new state’s duration',
            'To save one flip-flop',
            'Because timers count up',
            'Arbitrary style choice',
          ],
          answer: 'Because the reload cycle itself is the first cycle of the new state’s duration',
          explanation:
            'The transition into a state and the timer load happen on the same edge; that cycle must count toward the duration. Reload DURATION-1 with "advance on 0" yields exactly DURATION cycles per state.',
          hint: 'Count the cycles: reload cycle + DURATION-1 more.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'vending receives dime, nickel, dime (three 1-cycle pulses). What pulses on the outputs, in order?',
          code:
            'S10: coin=10 -> SDIS;  S15: coin=10 -> SDIS_CH;\ndispense = (state==SDIS)||(state==SDIS_CH);  change5 = (state==SDIS_CH);',
          options: [
            'dispense for 1 cycle with change5 for 1 cycle (after the third coin)',
            'dispense only, no change',
            'nothing — credit never reaches 20',
            'two dispense pulses',
          ],
          answer: 'dispense for 1 cycle with change5 for 1 cycle (after the third coin)',
          explanation:
            'dime → S10 (10); nickel → S15 (15); dime → SDIS_CH (25). One cycle in SDIS_CH: dispense=1 AND change5=1, then back to S0.',
          hint: 'Track the credit: 10, 15, 25.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In vending, holding the coin input high for 5 cycles inserts five coins.',
          answer: 'true',
          explanation:
            'coin is sampled every clock — a 5-cycle-high nickel input adds 5 five times (or triggers repeatedly). The documented contract is 1-cycle pulses per coin; producing them is the edge-detector’s job (module 09-l3).',
          hint: 'How often does the next-state logic sample coin?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Which FSM output structure guarantees "exactly one lamp high at all times"?',
          options: [
            'One-hot Moore decode: each lamp = (state == its state)',
            'Independent boolean equations per lamp',
            'A Mealy output from the timer',
            'Registered lamp outputs only',
          ],
          answer: 'One-hot Moore decode: each lamp = (state == its state)',
          explanation:
            'Decoding each lamp from the single state register makes mutual exclusion structural — the state register holds exactly one state, so exactly one comparison is true.',
          hint: 'How many states can the register hold at once?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the two FSM families this lesson’s designs represent (timer-? and event-?).',
          answer: 'timer-driven and event-driven',
          explanation:
            'Traffic light advances on internal countdowns (timer-driven); vending advances on external coin tokens (event-driven). Most real controllers mix both.',
          hint: 'What makes each machine leave a state?',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Timer-driven FSM', definition: 'Advances when an internal countdown expires (traffic lights, timeouts).' },
      { term: 'Event-driven FSM', definition: 'Advances on external input tokens (coins, keys, requests).' },
      { term: 'State-as-datapath', definition: 'Encoding the accumulated quantity (credit) directly in the state, avoiding a separate register.' },
      { term: 'Pulse contract', definition: 'The interface agreement that event inputs are 1-cycle pulses (edge-detected upstream).' },
      { term: 'Cycle accounting', definition: 'Verifying exact durations (state cycles, timer reloads) against the specification.' },
    ],
    revisionSummary: [
      'Timer-driven: countdown reload = DURATION-1 (reload cycle counts); verify first-state duration.',
      'Event-driven: document the input pulse contract; ignore events in dispense/wait states as specified.',
      'State-as-datapath (credit in the state encoding) avoids a separate accumulator.',
      'Physical actions that take time get dedicated states with Moore outputs.',
      'Checklists: reset state, happy path, alternate path, edge behavior, output one-hotness/pulse width.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Finite-state machine', url: 'https://en.wikipedia.org/wiki/Finite-state_machine', kind: 'article' },
      { label: 'Electronics Tutorials — Sequential logic', url: 'https://www.electronics-tutorials.ws/sequential/seq_1.html', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
];
