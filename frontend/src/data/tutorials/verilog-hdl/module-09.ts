import type { TutorialLesson } from '../types';

// Module 09 — Sequential Design
export const module09Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m09-l1',
    title: 'Flip-Flops and Reset Strategy',
    summary:
      'Build the D flip-flop — the atom of sequential design — and choose between synchronous and asynchronous reset with full awareness of the trade-offs.',
    objectives: [
      'Write the canonical D flip-flop and D flip-flop with async active-low reset.',
      'Implement synchronous reset and state its trade-offs versus asynchronous.',
      'Explain why the course standardizes on async active-low reset.',
      'Verify flip-flop behavior with a clocked testbench (and the linked challenge).',
    ],
    whyItMatters:
      'Every stateful circuit — counters, FSMs, pipelines, FIFOs — is flip-flops plus rules. The reset decision in particular is an architecture-level choice: it affects timing, area, testability and how the chip recovers from the unknown. Choosing deliberately, and applying ONE style consistently, is a mark of professional RTL; mixing styles casually is a documented source of real silicon failures.',
    prerequisites: ['vlog-m06-l1', 'vlog-m07-l3'],
    explanation:
      'A **D flip-flop** copies its input to its output at a clock edge and holds it otherwise:\n\n```\nalways @(posedge clk)\n    q <= d;\n```\n\nThat is the whole device. The nonblocking assignment (module 07) models the physics: q samples the pre-edge d and updates just after the edge. Everything else in sequential design is variation on this template.\n\n**Asynchronous reset** (the course standard) adds a second edge to the sensitivity list:\n\n```\nalways @(posedge clk or negedge reset_n)\n    if (!reset_n) q <= 1\'b0;\n    else          q <= d;\n```\n\nThe flop clears the INSTANT reset_n falls — no clock required. The template’s non-negotiable details: the reset is **active-low** (`negedge reset_n`, tested with `!reset_n`), the reset arm comes FIRST in the if-chain, and no other signal ever appears in the list. **Synchronous reset** keeps the flop list clock-only and checks the reset inside:\n\n```\nalways @(posedge clk)\n    if (!reset_n) q <= 1\'b0;\n    else          q <= d;\n```\n\nSame body, different list — and a different physical device: the sync reset is DATA at the flop’s D input (extra logic in front of the flop), while the async reset is a dedicated control pin on the flop cell.',
    deepDive:
      '### Async vs sync: the real trade-off table\n\nAsync reset pros: works without a clock (crucial for recovery from a dead/clocked-out state), no datapath cost, smaller/faster critical paths. Cons: reset release (deassertion) must be synchronized — releasing reset near a clock edge makes SOME flops see it and others not (recovery/removal timing violations); it is not always available on every cell in ASIC libraries in both polarities. Sync reset pros: the reset is fully synchronized to the clock (no release race), plays perfectly with scan test. Cons: needs a live clock to reset at all, adds a mux in every datapath (area/timing). Professional practice: async assert, and release either synchronized (a small reset-synchronizer) or in a flow that guarantees clean release. This course: async active-low everywhere, and we note release synchronization as the topic your next course should cover.\n\n### Why active-low, and why the template is rigid\n\nActive-low reset is an electrical convention: noise tends to glitch lines upward, and power-up default levels on many processes/fabric structures are low — an active-low reset is naturally asserted at power-on. The template is rigid because synthesis pattern-matches it: ANY extra signal in the list, wrong edge polarity, or statements before the if-chain changes the inferred cell or breaks the reset path (module 15’s reset mistakes). Treat the five lines as a fixed idiom.\n\n### Negedge vs posedge flops\n\n`always @(negedge clk) q <= d;` infers a falling-edge flop — legal and occasionally used in source-synchronous interfaces, but every negedge flop in a design doubles the clock-domain complexity (two "phases" of state). Course rule: posedge flops exclusively unless an interface forces otherwise, and never mix edges casually in one block. The linked challenge is a plain posedge D-FF with async reset — the canonical first sequential design.',
    examples: [
      {
        title: 'The three flop templates, verified by a clocked testbench',
        language: 'verilog',
        code:
          '// flop_d.v — plain D flip-flop\nmodule flop_d(\n    input  wire clk,\n    input  wire d,\n    output reg  q\n);\n    always @(posedge clk)\n        q <= d;\nendmodule\n\n// flop_arst.v — D flip-flop, ASYNC active-low reset (course standard)\nmodule flop_arst(\n    input  wire clk,\n    input  wire reset_n,\n    input  wire d,\n    output reg  q\n);\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) q <= 1\'b0;    // async: fires the moment reset_n falls\n        else          q <= d;       // edge-captured otherwise\n    end\nendmodule\n\n// flop_srst.v — D flip-flop, SYNCHRONOUS reset (reset is data)\nmodule flop_srst(\n    input  wire clk,\n    input  wire reset_n,\n    input  wire d,\n    output reg  q\n);\n    always @(posedge clk) begin     // clock only in the list\n        if (!reset_n) q <= 1\'b0;    // applied AT the clock edge\n        else          q <= d;\n    end\nendmodule',
        explanation: [
          'flop_d: the atom. q copies d at each rising edge and holds between edges — a 1-bit memory.',
          'flop_arst: reset_n falling triggers the block IMMEDIATELY (negedge in the list), clearing q without waiting for a clock. The if-orders matter: reset first, else capture.',
          'flop_srst: the list has only posedge clk — the reset only takes effect AT a clock edge, as data selected into the flop. No clock = no reset.',
          'All three use nonblocking assignment (module 07 rule 2) — these are genuine registers.',
          'Synthesis view: flop_arst maps to a flop cell with an async clear pin; flop_srst maps to a plain flop with a 2:1 mux (reset_n ? d : 0) feeding D.',
        ],
      },
      {
        title: 'Clocked testbench: proving edge capture and async clear',
        language: 'verilog',
        code:
          '// tb_flop_arst.v — SIM-ONLY: clocked stimulus with deliberate timings\n`timescale 1ns/1ps\nmodule tb_flop_arst;\n    reg  clk, reset_n, d;\n    wire q;\n\n    flop_arst dut (.clk(clk), .reset_n(reset_n), .d(d), .q(q));\n\n    initial clk = 1\'b0;\n    always #5 clk = ~clk;         // 10-unit period, SIM-ONLY\n\n    initial begin\n        reset_n = 0; d = 0;\n        #3;                        // reset pulses WITHOUT any clock edge\n        reset_n = 1;               // release between edges\n        #7;                        // reach the next rising edge with d=0\n        d = 1;                     // change data BETWEEN edges\n        #10;                       // edge captured d=1\n        d = 0;\n        #10;                       // edge captured d=0\n        reset_n = 0;               // async clear: q falls immediately,\n                                   // NOT at an edge (we are mid-period)\n        #2;\n        reset_n = 1;\n        #10;\n        $finish;\n    end\nendmodule',
        explanation: [
          'Stimulus is timed BETWEEN clock edges (data changes at t=10, 20... while edges fall at t=5, 15, 25...) — the clean way to exercise edge-capture without setup/hold ambiguity in RTL sim.',
          'The reset pulse at t=0..3 includes NO clock edge: q is cleared purely by the async path — the signature property of async reset.',
          'd=1 applied before the edge at t=15 → q becomes 1 just after that edge; d=0 before the edge at t=25 → q returns to 0. Edge-capture demonstrated.',
          'The mid-period reset at t≈30 clears q instantly (async behavior); a sync-reset flop would NOT clear until the next edge — a testbench row that distinguishes the two styles.',
          'Educational waveform below; run the linked challenge to see the real evaluator check a D-FF with its own harness.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'D flip-flop with async reset (educational waveform, illustrative)',
        content:
          '  clk      ___|▔▔|___|▔▔|___|▔▔|___|▔▔|___\n                 e1     e2     e3     e4\n  d        ___/▔▔▔▔▔▔▔▔▔▔\\___________/▔▔▔▔\n  reset_n  ▔▔\\_______/▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\\___/▔▔▔\n              ^t0            (async clear mid-period)^t30\n  q        ___/▔▔▔▔▔▔▔▔▔▔▔\\__________\n\n  Reading: q clears at t0 (reset asserts, no clock needed).\n  At e1 q captures d=1; at e2 q captures d=0 (d fell before e2).\n  At t30 reset asserts again: q clears INSTANTLY, mid-period —\n  the async signature. (Illustrative; timings match tb_flop_arst.)',
        caption:
          'educational waveform (illustrative): the flop samples d only at rising edges, but reset acts immediately, clock or not.',
      },
    ],
    tables: [
      {
        caption: 'Async vs synchronous reset',
        headers: ['Aspect', 'Async (course standard)', 'Synchronous'],
        rows: [
          ['Sensitivity list', 'posedge clk or negedge reset_n', 'posedge clk only'],
          ['Reset acts', 'Immediately, no clock needed', 'At the next clock edge'],
          ['Hardware', 'Flop async-clear pin', 'Mux (reset ? 0 : d) into D'],
          ['Needs running clock?', 'No', 'Yes'],
          ['Release hazard', 'Must be released cleanly (synchronizer)', 'No race — inherently synchronized'],
          ['Datapath cost', 'None', 'One mux per flop'],
        ],
      },
      {
        caption: 'The async-reset template, line by line',
        headers: ['Line', 'Rule'],
        rows: [
          ['always @(posedge clk or negedge reset_n)', 'Exactly two edges; reset edge matches polarity (active-low → negedge)'],
          ['if (!reset_n)', 'Test the ACTIVE state; reset arm FIRST'],
          ['q <= 1\'b0;', 'Nonblocking; reset value explicit'],
          ['else q <= d;', 'The functional capture — nothing else in the list'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Mixing reset styles across a design (async in some blocks, sync in others).',
        fix:
          'Choose ONE reset style per design (course standard: async active-low) and apply it in every clocked block. Mixed styles complicate reset-tree analysis and release sequencing.',
      },
      {
        mistake: 'Adding data signals to a clocked sensitivity list, e.g. @(posedge clk or d).',
        fix:
          'A clocked list contains exactly posedge clk and (for async reset) the reset edge. Any extra edge is a different physical event the synthesizer cannot map to a flop — sim/synth divergence guaranteed.',
      },
      {
        mistake: 'Using an active-high reset body (!reset_n replaced by reset_n) with a negedge list (or vice versa).',
        fix:
          'Polarity must match: active-low reset_n → negedge reset_n and if (!reset_n). A mismatched pair resets at the wrong edge and never recovers correctly — the classic silent reset bug.',
      },
    ],
    guidedPractice: {
      title: 'Predict the flop trace',
      brief:
        'For flop_arst with clk edges at t=5,15,25,35 and stimulus: reset_n=0 at t=0, reset_n=1 at t=8, d=1 at t=10, d=0 at t=22, reset_n=0 at t=30, reset_n=1 at t=33: give q at t=7, t=16, t=28, t=31, t=40.',
      expectedBehavior:
        't=7: q=0 (still in reset). t=16: q=1 (edge at 15 captured d=1, applied after the edge). t=28: q=0 (edge at 25 captured d=0 — d fell at t=22, before the edge). t=31: q=0 (async clear fired at t=30, mid-period, no edge needed). t=40: q=0 (edges at 35 sample d=0).',
      hints: [
        'Flops capture at edges only; reset acts instantly.',
        'd changes at t=10 and t=22 — both BETWEEN edges, so each is captured at the NEXT edge.',
      ],
      challengeId: 'ece-02-d-flip-flop',
    },
    practiceExercises: [
      {
        title: 'Platform challenge: the D flip-flop',
        brief:
          'Implement the challenge D flip-flop (check the challenge interface for the exact reset polarity and port names), run it on the platform evaluator, then deliberately swap the reset polarity and describe the failure you would expect.',
        expectedBehavior:
          'The correct module uses the async active-low template from this lesson. With swapped polarity (posedge reset_n / if (reset_n)), the flop would "reset" whenever reset_n is HIGH and capture only while reset_n is LOW — inverted behavior that fails the harness vectors. Reading the spec polarity before coding is the lesson.',
        hints: [
          'The challenge spec defines polarity — never assume.',
          'Match port names exactly for the harness to connect.',
        ],
      },
      {
        title: 'Distinguish the two reset styles from a testbench row',
        brief:
          'Design a two-line testbench experiment that distinguishes flop_arst from flop_srst: assert reset mid-period (no edge nearby) and observe q. State what each flop does.',
        expectedBehavior:
          'Drive reset_n low with no clock edge for several time units: flop_arst clears q immediately (negedge in the sensitivity list); flop_srst holds q until the next rising edge (reset is only data at the edge). That single observation identifies the style.',
        hints: [
          'Async reset needs no clock; sync reset is sampled at the edge.',
          'Make sure the observation window contains no clock edge.',
        ],
      },
    ],
    assessment: {
      title: 'Module 09 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What makes the reset in `always @(posedge clk or negedge reset_n)` asynchronous?',
          options: [
            'The negedge reset_n in the sensitivity list: the block triggers when reset falls, without a clock edge',
            'The keyword async in the module',
            'The reset value being 0',
            'Nothing — this is a synchronous reset',
          ],
          answer: 'The negedge reset_n in the sensitivity list: the block triggers when reset falls, without a clock edge',
          explanation:
            'The extra edge in the event control makes reset_n itself a trigger — the flop clears the moment the reset line falls, clock or no clock.',
          hint: 'Which edges can wake the block?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'flop_arst: reset_n=1, d=1 for the whole window, q=0. A single clock edge passes. What is q after the edge?',
          code:
            'always @(posedge clk or negedge reset_n) begin\n    if (!reset_n) q <= 1\'b0;\n    else          q <= d;\nend\n// reset_n=1, d=1, q=0; one posedge',
          options: ['1', '0', 'x', 'z'],
          answer: '1',
          explanation:
            'With reset released, the else arm captures: q samples the pre-edge d=1 and updates to 1 just after the edge.',
          hint: 'No reset active → the capture arm runs.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'A synchronous reset differs from asynchronous because it...',
          options: [
            'only takes effect at a clock edge and requires a running clock',
            'resets faster in simulation',
            'does not need to be released carefully',
            'uses no extra logic',
          ],
          answer: 'only takes effect at a clock edge and requires a running clock',
          explanation:
            'Sync reset is data at the flop’s D input (a mux): sampled at edges. No clock → no reset. (It does avoid release races — its genuine advantage — and costs a mux per flop.)',
          hint: 'Is the reset an edge trigger or sampled data?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'What is wrong with this reset template?',
          code:
            'always @(posedge clk or posedge reset_n) begin\n    if (!reset_n) q <= 1\'b0;\n    else          q <= d;\nend',
          options: [
            'Edge polarity mismatch: the list waits for posedge reset_n but the body tests !reset_n — wrong reset behavior',
            'The reset value must be 1',
            'd must appear in the sensitivity list',
            'Nothing is wrong',
          ],
          answer: 'Edge polarity mismatch: the list waits for posedge reset_n but the body tests !reset_n — wrong reset behavior',
          explanation:
            'An active-low reset needs negedge in the list (and !reset_n in the body). This hybrid triggers on the rising edge of an active-low line — the wrong moment — and the inferred hardware does not match the intent.',
          hint: 'Compare the edge in the list with the level tested in the body.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the two edges of the course-standard async-reset sensitivity list (posedge/negedge with signal names).',
          answer: 'posedge clk or negedge reset_n',
          explanation:
            'The course template: rising clock edge plus falling edge of the active-low reset. No other signal ever appears.',
          hint: 'Clock edge first, reset edge second.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'D flip-flop', definition: 'Copies d to q at each clock edge; the atomic state element of synchronous design.' },
      { term: 'Asynchronous reset', definition: 'Reset acting immediately via a second edge in the sensitivity list; no clock required.' },
      { term: 'Synchronous reset', definition: 'Reset sampled as data at clock edges (mux into D); needs a live clock.' },
      { term: 'Active-low', definition: 'Asserted when 0 (suffix _n); the course-wide reset convention.' },
      { term: 'Reset release', definition: 'Deassertion of reset; must be clean (synchronized) to avoid some-flops-reset races.' },
    ],
    revisionSummary: [
      'The D-FF is two lines: always @(posedge clk) q <= d; — sample pre-edge, update post-edge.',
      'Course standard: async active-low reset — negedge reset_n in the list, if (!reset_n) FIRST in the body.',
      'Sync reset = data at the edge: clock-only list, same body; needs a live clock, costs a mux, no release race.',
      'Never put data signals in a clocked sensitivity list; never mix reset styles across a design.',
      'Reset polarity must match between list edge and body test — mismatches are silent killers.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Flip-flop (electronics)', url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)', kind: 'article' },
      { label: 'Electronics Tutorials — Sequential logic', url: 'https://www.electronics-tutorials.ws/sequential/seq_1.html', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m09-l2',
    title: 'Enables, Registers and Shift Registers',
    summary:
      'Add data-flow control to flip-flops: clock enables done right (mux feedback, never gated clocks), multi-bit registers, and the SISO/SIPO shift register family.',
    objectives: [
      'Implement clock enables with the if (enable) pattern and explain the inferred feedback mux.',
      'Distinguish clock enables from gated clocks — and state why gated clocks are forbidden in RTL.',
      'Build N-bit registers with load and clear controls.',
      'Design SISO and SIPO shift registers and verify their delay behavior.',
    ],
    whyItMatters:
      'Real datapaths do not capture every cycle — enables decide when state updates, and doing them wrong (gating the clock!) breaks timing closure and creates glitches that no simulation shows. Shift registers, meanwhile, are the serial workhorses of digital design: UARTs, serializers, delay lines and scanners are all this lesson’s SISO/SIPO patterns scaled up.',
    prerequisites: ['vlog-m09-l1', 'vlog-m07-l2'],
    explanation:
      'A **clock enable** makes a register update only when allowed — by muxing its OWN OUTPUT back to its input:\n\n```\nalways @(posedge clk or negedge reset_n)\n    if (!reset_n) q <= 1\'b0;\n    else if (en)  q <= d;      // when en=0: q <= q (holds)\n```\n\nSynthesis reads the missing else-assignment as "keep the old value" and builds a 2:1 mux in front of the flop: D = en ? d : q. The clock NEVER stops. The forbidden alternative — feeding a divided or gated clock (`assign clk_g = clk & en;`) — breaks everything the clock network guarantees: gated clocks glitch (the AND of clk and en produces runt pulses when en changes mid-high-phase), bypass the balanced clock tree (massive skew), and defeat timing analysis. Rule: **data is gated, clocks are not.** When you need a slower-rate process, use an enable strobe generated from a counter (module 10) — the clock keeps running, the logic acts once per strobe.\n\nAn **N-bit register** is N flops sharing a clock, enable and reset — declared as a vector and captured in one statement: `q <= d;` on [7:0] vectors is eight flops in one line. Add a synchronous load by extending the priority chain: reset (async) > load (capture d) > hold.\n\nA **shift register** chains flops so each captures the previous one each clock: SISO (serial-in serial-out) is a delay line of depth N; SIPO (serial-in parallel-out) exposes every stage, converting a serial bit stream to a parallel word over N cycles (module 10 builds the parallel-in variants and the UART-flavored transmitter).',
    deepDive:
      '### The enable mux and timing\n\nThe inferred enable mux sits in the D-path of every enabled flop — it costs delay and area (one mux per bit) but keeps the clock pristine. Compare with clock gating (a latch-based gate on the clock line itself): gating saves the flop’s clock-tree power when disabled for long periods, which is why real flows DO gate clocks — but via verified clock-gating cells inserted by power tools at a late stage, never by hand-written RTL. Your RTL contract: enables everywhere, clocks untouched. The synthesis tool + power compiler collaborates to convert enable-heavy designs into gated clocks safely when the power budget demands it.\n\n### Shift register as delay line, formally\n\nA SISO of depth N implements y[t] = x[t-N] — a discrete delay. This is the discrete-time building block for correlation, synchronization and pipelining. Depth-N SIPO additionally gives parallel access: after N cycles, the full N-bit word is available at once. The combined S2P/P2S pair (module 10) is a serial link: P2S at the transmitter walks a word out bit by bit; S2P at the receiver reassembles it. Timing alignment (start bits, framing) is what turns these into UART — module 10 completes that story.\n\n### Resetting shift registers: which stages?\n\nReset ALL stages of a delay line (course template) — a partially-reset shift register emits stale bits after reset release, corrupting the first N outputs. For very deep shifters, some designs reset only the head and let the line flush; that is an optimization with a documented warm-up window. Course rule: reset every state element, verify the first N post-reset outputs in the testbench.',
    examples: [
      {
        title: 'Enabled register with load and clear — the workhorse pattern',
        language: 'verilog',
        code:
          '// reg8_ctl.v — 8-bit register with async reset, sync load/enable\nmodule reg8_ctl(\n    input  wire       clk,\n    input  wire       reset_n,   // async, active-low: clears to zero\n    input  wire       load,      // sync load: capture din at the edge\n    input  wire       en,        // sync enable: capture when no load\n    input  wire [7:0] din,\n    output reg  [7:0] q\n);\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n)\n            q <= 8\'d0;             // 1. async reset: highest priority\n        else if (load)\n            q <= din;              // 2. load overrides enable\n        else if (en)\n            q <= din;              // 3. enabled capture\n        // no else: q holds (implicit q <= q -> enable mux)\n    end\nendmodule',
        explanation: [
          'Priority order is a specification: async reset first, then load, then enable. With load and en both high, load wins — document this in the header.',
          'Here load and en do the same thing (both capture din) — in a real design load might capture from a different source; the point is the PRIORITY CHAIN shape.',
          'The missing final else is deliberate: synthesis infers q <= q (hold) — the enable mux in front of each of the 8 flops.',
          'The clock is never touched: en gates DATA, not the clock. This is the anti-gated-clock rule in practice.',
          'Trace: reset released, load=0, en=1, din=8\'hA5 → at the edge q = A5. Next cycle en=0 → q holds A5 through any number of edges.',
        ],
      },
      {
        title: 'SISO and SIPO shift registers',
        language: 'verilog',
        code:
          '// siso4.v — serial-in serial-out: a 4-stage delay line\nmodule siso4(\n    input  wire clk,\n    input  wire reset_n,\n    input  wire sin,        // serial input\n    output wire sout        // serial output (4 cycles delayed)\n);\n    reg [3:0] shreg;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n)\n            shreg <= 4\'b0000;          // ALL stages reset (stale-bit rule)\n        else\n            shreg <= {shreg[2:0], sin}; // shift left: sin enters at bit 0\n    end\n\n    assign sout = shreg[3];             // the oldest bit leaves at the top\nendmodule\n\n// sipo4.v — serial-in parallel-out: serial stream -> 4-bit word\nmodule sipo4(\n    input  wire clk,\n    input  wire reset_n,\n    input  wire sin,\n    output wire [3:0] pout              // complete after 4 input cycles\n);\n    reg [3:0] shreg;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n)\n            shreg <= 4\'b0000;\n        else\n            shreg <= {shreg[2:0], sin};\n    end\n\n    assign pout = shreg;                // all four stages visible\nendmodule',
        explanation: [
          'The shift expression {shreg[2:0], sin}: the old bits 2..0 move up one position, and sin enters at bit 0. Each bit takes 4 clocks to travel from sin to sout (SISO delay = depth).',
          'SISO trace with sin = 1,0,1,1 (edges e1..e4), starting 0000: after e1: 0001; e2: 0010; e3: 0101; e4: 1011. sout (=bit 3) reads 0,0,0,1 — the FIRST input bit arrives at sout after exactly 4 edges.',
          'SIPO is the same hardware with the whole register exposed: after the same 4 edges, pout = 4\'b1011 — the serial stream reassembled MSB-last (sin was the LSB first).',
          'Bit-order convention matters: sin enters at bit 0 (LSB-first here); a design spec may demand MSB-first — module 10’s UART TX shifts the other way. Always state the convention in the module header.',
          'All stages reset together, so the first 4 post-reset outputs are deterministic zeros, not stale garbage.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Enable mux vs forbidden gated clock',
        content:
          '  CORRECT — clock enable (data gating):\n\n        d ----[mux]--- D \\n   en ----/  ^     \\  [FLOP]--- q\n                  q ----\'        ^\n                                 clk  (untouched!)\n\n  FORBIDDEN — gated clock:\n\n        clk --[AND]-- clk_g --> [FLOP]\n        en  ---\'   (glitches, skew, timing blindness)\n\n  SHIFT REGISTER (SISO depth 4):\n\n   sin -->[FF]-->[FF]-->[FF]-->[FF]--> sout\n          q0     q1     q2     q3      (4-cycle delay)',
        caption:
          'Enable = mux in the D-path with the clock pristine. Gated clocks break the clock network contract. Shift registers chain flops for delay.',
      },
    ],
    tables: [
      {
        caption: 'Shift register conventions',
        headers: ['Variant', 'Input', 'Output', 'Use'],
        rows: [
          ['SISO', '1 serial bit/cycle', '1 serial bit/cycle, N-cycle delayed', 'Delay lines, debounce, serialization'],
          ['SIPO', '1 serial bit/cycle', 'N-bit word every N cycles', 'Serial link receiver'],
          ['PISO (module 10)', 'N-bit word (loaded)', '1 serial bit/cycle', 'Serial link transmitter'],
          ['Universal (module 10)', 'serial + parallel', 'both', 'Teaching completeness'],
        ],
      },
      {
        caption: 'SISO4 trace: sin = 1,0,1,1 (register starts 0000)',
        headers: ['Edge', 'shreg[3:0] after', 'sout'],
        rows: [
          ['e1', '0001', '0'],
          ['e2', '0010', '0'],
          ['e3', '0101', '0'],
          ['e4', '1011', '1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Gating the clock to "pause" a register: assign clk_en = clk & en;',
        fix:
          'Never gate clocks in RTL — glitches and skew corrupt the whole clock domain. Use the enable pattern (else-branch hold) so synthesis builds the D-mux; real clock gating is a tool-managed power optimization.',
      },
      {
        mistake: 'Adding an explicit else q <= q; and worrying it creates a latch or extra hardware.',
        fix:
          'else q <= q; is harmless (synthesis sees the hold) but redundant — the omitted else means exactly that. Either form is fine; be consistent within the project. The latch danger belongs to COMBINATIONAL blocks (module 15), not clocked ones.',
      },
      {
        mistake: 'Resetting only part of a shift register, then debugging "stale" first outputs.',
        fix:
          'Reset every stage of the chain. A partially reset line emits N-stale-bits worth of garbage; testbenches must verify the first N post-reset cycles are clean.',
      },
    ],
    guidedPractice: {
      title: 'Enable semantics by trace',
      brief:
        'For reg8_ctl (reset released, din=8\'h3C throughout): load=1 for one cycle at edge e2, en=0 otherwise. Starting from q=0, give q after edges e1..e4.',
      expectedBehavior:
        'e1: load=0, en=0 → hold: q=0. e2: load=1 → q=3C. e3: load=0, en=0 → hold: q=3C. e4: hold: q=3C. The enable mux kept the loaded value stable across disabled cycles — data gating, clock untouched.',
      hints: [
        'With no load and no enable, the implicit else holds q.',
        'Load overrides enable in the priority chain (here they agree anyway).',
      ],
    },
    practiceExercises: [
      {
        title: 'SIPO with MSB-first capture',
        brief:
          'Modify sipo4 so the FIRST serial bit becomes the MSB of pout (MSB-first convention), then trace pout after 4 edges for sin = 1,0,1,1.',
        expectedBehavior:
          'Shift the other way: shreg <= {sin, shreg[3:1]}; — sin enters at bit 3 (the MSB) and older bits move down. Trace sin=1,0,1,1 from 0000: e1: 1000; e2: 0100; e3: 1010; e4: 1101. pout = 4\'b1101 — the first bit captured sits in the MSB, as the MSB-first convention demands.',
        hints: [
          'MSB-first: new bit at the TOP, old bits shift DOWN.',
          'Trace each edge: concatenate sin with the shifted old value.',
        ],
      },
      {
        title: 'Depth-8 delay line with enable',
        brief:
          'Build siso8_en: an 8-stage SISO that only shifts when en=1 (holding ALL stages otherwise), async active-low reset. State the total delay from sin to sout in ENABLED cycles.',
        expectedBehavior:
          'reg [7:0] shreg; in the clocked block: if (!reset_n) shreg <= 0; else if (en) shreg <= {shreg[6:0], sin}; — sout = shreg[7]. Delay = 8 ENABLED cycles (disabled cycles freeze the whole line).',
        hints: [
          'One enable guards the entire shift — all stages hold together.',
          'Depth in cycles counts only cycles where shifting actually happened.',
        ],
      },
    ],
    assessment: {
      title: 'Module 09 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'How does synthesis implement `else if (en) q <= d;` in a clocked block with no final else?',
          options: [
            'A 2:1 mux feeding the flop’s D input (en ? d : q) — the clock stays free-running',
            'A gated clock',
            'A second flip-flop',
            'It cannot synthesize',
          ],
          answer: 'A 2:1 mux feeding the flop’s D input (en ? d : q) — the clock stays free-running',
          explanation:
            'The omitted else means "hold", which synthesis realizes as feedback through a mux on the D path. The clock is never gated.',
          hint: 'Where does the "hold" hardware live — clock or data?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Gating a clock with combinational logic (assign gclk = clk & en;) is an acceptable RTL technique for saving power.',
          answer: 'false',
          explanation:
            'Hand-gated clocks glitch when en changes during the clock’s high phase, bypass the balanced clock tree, and are invisible to timing analysis. Enables gate data; real clock gating is inserted later by power tools with verified cells.',
          hint: 'What happens if en changes while clk is high?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'For siso4 (sin enters at bit 0, sout = bit 3) starting from 0000 with sin = 1 for exactly one cycle then 0 forever, what does sout show over the following cycles?',
          code:
            'shreg <= {shreg[2:0], sin};\nassign sout = shreg[3];   // sin=1 for one cycle, then 0',
          options: [
            'sout pulses 1 exactly 4 cycles after the input bit',
            'sout stays 0 forever',
            'sout follows sin immediately',
            'sout pulses 1 one cycle after the input',
          ],
          answer: 'sout pulses 1 exactly 4 cycles after the input bit',
          explanation:
            'The bit enters at bit 0 and walks up one position per clock: 4 stages → 4-cycle delay. The single 1 appears at bit 3 (sout) on the 4th clock after it entered.',
          hint: 'Count stages from bit 0 to bit 3.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'What is wrong with this "enabled" register?',
          code:
            'always @(posedge clk_g or negedge reset_n) begin\n    if (!reset_n) q <= 0;\n    else          q <= d;\nend\n// with: assign clk_g = clk & en;',
          options: [
            'The clock is gated by an AND gate — glitches and clock-tree skew; use an enable mux instead',
            'The reset is synchronous',
            'q should be a wire',
            'Nothing — this is the recommended enable pattern',
          ],
          answer: 'The clock is gated by an AND gate — glitches and clock-tree skew; use an enable mux instead',
          explanation:
            'This is the forbidden gated-clock pattern. The correct form: always @(posedge clk or negedge reset_n) with if (!reset_n) ... else if (en) q <= d; — gating the DATA, never the clock.',
          hint: 'Which signal did the designer gate?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'In one sentence: what hardware does a SISO shift register of depth N implement?',
          answer: 'an N-cycle delay line',
          explanation:
            'Each bit takes N clocks to traverse the chain: y[t] = x[t-N]. It is the discrete-time delay element underlying serializers, debouncers and correlators.',
          hint: 'Think in terms of y[t] = x[t - ?].',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Clock enable', definition: 'Control that makes a register hold or capture via a D-input mux; the clock runs continuously.' },
      { term: 'Gated clock', definition: 'Combinational logic interrupting the clock line — glitchy, skew-prone, forbidden in RTL.' },
      { term: 'SISO', definition: 'Serial-in serial-out shift register: an N-cycle delay line.' },
      { term: 'SIPO', definition: 'Serial-in parallel-out: reassembles a serial stream into an N-bit word over N cycles.' },
      { term: 'Hold', definition: 'Register behavior when enabled off: q <= q, implemented by the enable mux feedback.' },
    ],
    revisionSummary: [
      'Enables: if (en) capture, missing else = hold; synthesis builds the D-mux; clock untouched.',
      'Never gate clocks in RTL — data gating only; tool-managed clock gating comes much later in real flows.',
      'N-bit register = N flops in one vector assignment; priority chain: reset > load > enable.',
      'SISO = N-cycle delay line; SIPO exposes all stages to reassemble serial words.',
      'State the bit-order convention (LSB/MSB-first) in every shift register interface; reset all stages.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Shift register', url: 'https://en.wikipedia.org/wiki/Shift_register', kind: 'article' },
      { label: 'Wikipedia — Flip-flop (electronics)', url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m09-l3',
    title: 'Clock Dividers, Edge Detection and Simple Pipelines',
    summary:
      'Generate slower-rate strobes from counters (never divided clocks), synchronize and detect edges of async inputs with double-flops, and build a 2-stage pipeline with valid.',
    objectives: [
      'Build a divide-by-2N toggle and an enable strobe — and explain why strobes beat divided clocks.',
      'Synchronize asynchronous inputs with a double-flop and detect rising/falling edges.',
      'Explain metastability and why the synchronizer chain mitigates (not eliminates) it.',
      'Design a 2-stage pipeline with valid propagation.',
    ],
    whyItMatters:
      'These three patterns — strobe generation, input synchronization and pipelining — appear in essentially every FPGA design ever shipped. They are also where beginners make architecture-level mistakes (feeding divided clocks around the design, using unsynchronized inputs as clock enables) whose damage only appears on hardware, never in simulation. Learning the correct idioms now is cheap; learning them from a dead board is not.',
    prerequisites: ['vlog-m09-l2', 'vlog-m07-l3'],
    explanation:
      '**Slower rates, the right way.** To act once per N clocks, generate a periodic **enable strobe** from a counter and guard every downstream block with it — the clock network stays single and clean. The naive alternative (divide the clock and distribute clk/2 to other blocks) creates a second clock domain: cross-domain paths lose phase relationship, timing analysis fragments, and the divided clock’s routing skew is unmanaged. Strobes keep ONE clock; the enable pattern (module 09-l2) makes logic act at the slower RATE while remaining a single-domain design. (A toggle flop producing clk/2 as a DATA signal is fine for an output pin — the sin is using it as another block’s clock.)\n\n**Asynchronous inputs.** Any input not generated by our clock (buttons, other chips) can change arbitrarily close to a clock edge — the flop’s output can go **metastable** (an invalid intermediate voltage that resolves unpredictably late). You cannot eliminate metastability; you make it harmless with a **double-flop synchronizer**: two flops in series on the clock. The first may go metastable; it has a full clock period to resolve before the second samples it. The probability of the SECOND flop also going metastable is astronomically small (mean time between failures of years-to-centuries), which is the engineering acceptance criterion.\n\n**Edge detection** then compares two synchronized samples: rising = current 1 and previous 0; falling = current 0 and previous 1. Three flops total (two for synchronization, one for the delayed sample) produce a clean one-cycle pulse.\n\n**Pipelines.** Splitting long combinational logic with register stages raises the maximum clock frequency: each stage has less logic to settle. The bookkeeping cost is **valid-bit propagation** so downstream consumers know WHICH pipeline slots hold real data — the 2-stage example below is the pattern every deeper pipeline repeats.',
    deepDive:
      '### Metastability, quantified (honestly)\n\nA flop samples while its input transitions: the output hovers between levels and resolves to 0 or 1 after a random delay (metastability resolution time, a device statistic). With no synchronizer, downstream logic reads an invalid value and different gates may disagree — intermittent, unreproducible failures. A 2-flop synchronizer gives one full period of resolution slack; the residual failure probability decays exponentially with the slack, giving MTBFs in the years for typical clock ratios. Three flops when the input is very fast or clocks are very fast. Course stance: EVERY unsynchronized input gets a 2-flop synchronizer, no exceptions; the synchronizer output is then treated as ordinary synchronous data.\n\n### Edge-detect wiring, precisely\n\n```\nalways @(posedge clk) begin\n    meta <= async_in;     // 1st sync stage (may go metastable)\n    sync <= meta;         // 2nd: clean synchronized sample\n    prev <= sync;         // 1-cycle-delayed clean sample\nend\nassign rise = sync & ~prev;   // 1-cycle pulse on rising edges\nassign fall = ~sync & prev;   // 1-cycle pulse on falling edges\n```\n\nNote the discipline: logic NEVER taps meta (the metastable stage). The pulse appears two clocks after the physical input changed — the price of safety, and constant.\n\n### Pipeline valid semantics\n\nEach stage registers data AND its valid bit together; a stage’s output valid means "the data in THIS slot has been processed by stages 1..k". Flushing (reset or bubble insertion) drives valid low so consumers ignore stale slots. The 2-stage example makes the contract explicit; module 16’s projects extend it to back-pressure (ready/valid handshakes).',
    examples: [
      {
        title: 'Divide-by-2N toggle and the enable-strobe alternative',
        language: 'verilog',
        code:
          '// div2_toggle.v — clk/2 as a DATA output (fine on a pin; not a clock!)\nmodule div2_toggle(\n    input  wire clk,\n    input  wire reset_n,\n    output reg  slow\n);\n    always @(posedge clk or negedge reset_n)\n        if (!reset_n) slow <= 1\'b0;\n        else          slow <= ~slow;    // toggles every clock: period = 2T\nendmodule\n\n// strobe_gen.v — the RIGHT way: an enable strobe every N clocks\nmodule strobe_gen(\n    input  wire clk,\n    input  wire reset_n,\n    output reg  tick                    // 1-cycle pulse every N clocks\n);\n    localparam N = 4;\n    reg [1:0] cnt;                      // 2 bits hold 0..3 = N-1\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            cnt  <= 2\'d0;\n            tick <= 1\'b0;\n        end else begin\n            if (cnt == N-1) begin\n                cnt  <= 2\'d0;\n                tick <= 1\'b1;           // strobe: one cycle wide\n            end else begin\n                cnt  <= cnt + 2\'d1;\n                tick <= 1\'b0;\n            end\n        end\n    end\nendmodule',
        explanation: [
          'div2_toggle: a flop toggling every clock produces a square wave at clk/2 — perfectly fine as a DATA signal (an output pin, a status LED), and exactly how you should NOT clock other logic.',
          'strobe_gen: the counter runs 0..N-1 and raises tick for exactly one clock every N — downstream blocks use tick as an enable (module 09-l2 pattern): one clock domain, clean timing.',
          'Counter sizing is manual in Verilog-2001: 0..3 needs 2 bits, so reg [1:0]. (SystemVerilog’s $clog2(N) automates this — labeled as a SystemVerilog feature; not used here to stay Verilog-2001-portable.)',
          'Trace strobe_gen N=4: cnt/tick: 0/0, 1/0, 2/0, 3/1, 0/0, 1/0, 2/0, 3/1 — a strobe every 4th clock, period N (not 2N) because tick is a pulse, not a square wave.',
          'If you need a square-wave OUTPUT at clk/(2N), keep the toggle flop but ONLY at the pin; internal logic consumes strobes.',
        ],
      },
      {
        title: 'Double-flop synchronizer with edge detection',
        language: 'verilog',
        code:
          '// sync_edge.v — synchronize an async input, then detect edges\nmodule sync_edge(\n    input  wire clk,\n    input  wire reset_n,\n    input  wire async_in,     // button, other-chip signal: NOT synchronous\n    output wire level,        // synchronized level\n    output wire rise,         // 1-cycle pulse on 0->1\n    output wire fall          // 1-cycle pulse on 1->0\n);\n    reg meta, sync, prev;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            meta <= 1\'b0;\n            sync <= 1\'b0;\n            prev <= 1\'b0;\n        end else begin\n            meta <= async_in;   // 1st stage: may go METASTABLE\n            sync <= meta;       // 2nd stage: clean sample\n            prev <= sync;       // 1-cycle-delayed clean sample\n        end\n    end\n\n    assign level = sync;\n    assign rise  =  sync & ~prev;   // current 1, previous 0\n    assign fall  = ~sync &  prev;   // current 0, previous 1\n\nendmodule',
        explanation: [
          'Three flops, one purpose each: meta (metastability catcher — NEVER used in logic), sync (clean current sample), prev (clean previous sample).',
          'rise = sync & ~prev is a 1-cycle-wide pulse exactly when the synchronized level went 0→1 between the last two clocks.',
          'Timing: the input changes just before edge n → meta captures it at n (possibly metastable) → sync is clean at n+1 → rise pulses after edge n+1: a constant 2-cycle latency, the price of safety.',
          'Trace async_in rising between edges 1 and 2: after e2: meta=1, sync=0, prev=0; after e3: meta=1, sync=1, prev=0 → rise=1; after e4: prev=1 → rise=0. One clean pulse.',
          'The reset value 0 for meta/sync means an input held high at reset release produces one synthetic rise pulse — testbench and system design must expect it (a classic integration surprise).',
        ],
      },
      {
        title: 'Two-stage pipeline with valid propagation',
        language: 'verilog',
        code:
          '// pipe2.v — 2-stage pipeline: (a+b) then +1, with valid tracking\nmodule pipe2(\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire       in_valid,\n    input  wire [7:0] a,\n    input  wire [7:0] b,\n    output wire       out_valid,\n    output wire [7:0] out\n);\n    // Stage 1 registers: data + valid move together.\n    reg       s1_valid;\n    reg [7:0] s1_sum;\n\n    // Stage 2 registers.\n    reg       s2_valid;\n    reg [7:0] s2_out;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            s1_valid <= 1\'b0;\n            s1_sum   <= 8\'d0;\n            s2_valid <= 1\'b0;\n            s2_out   <= 8\'d0;\n        end else begin\n            s1_valid <= in_valid;          // stage 1 captures\n            s1_sum   <= a + b;\n\n            s2_valid <= s1_valid;          // stage 2 captures stage 1\n            s2_out   <= s1_sum + 8\'d1;     // (a+b) + 1\n        end\n    end\n\n    assign out_valid = s2_valid;\n    assign out       = s2_out;\n\nendmodule',
        explanation: [
          'Each stage registers data AND valid together — the invariant: s1_valid means "s1_sum holds a real sum".',
          'Latency is exactly 2 clocks: an input accepted at edge n produces its output after edge n+2, with out_valid high for that one cycle.',
          'Trace in_valid=1 for one cycle with a=3,b=4: after e1: s1_valid=1, s1_sum=7; after e2: s2_valid=1, s2_out=8 → out=8, out_valid=1 for one cycle; after e3: s2_valid=0 (bubble flows through).',
          'Reset clears both valid bits so downstream logic ignores the stale pipeline contents after reset — the reason valid registers are reset even when data registers could skip it.',
          'This is the seed of every deeper pipeline: more stages = same pattern, plus ready/valid back-pressure when the consumer can stall (module 16 projects).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Synchronizer + edge detect, and the 2-stage pipeline',
        content:
          '  SYNCHRONIZER + EDGE DETECT\n\n   async_in -->[FF meta]-->[FF sync]-->[FF prev]\n                  (metastable)   |          |\n                                 v          v\n                        rise = sync & ~prev   (1-cycle pulse)\n                        fall = ~sync & prev\n\n  2-STAGE PIPELINE\n\n   a,b --[+ ]-->[FF]-- s1_sum --[+1]-->[FF]--> out\n   in_valid -----------^ s1_valid ---------^----- out_valid\n         stage 1 logic      stage 2 logic\n   (each stage: shorter comb path -> higher clock possible)',
        caption:
          'Two flops tame an async input; logic taps only the clean stages. Pipelines register data and valid together at every stage.',
      },
    ],
    tables: [
      {
        caption: 'Divided clock vs enable strobe',
        headers: ['Aspect', 'Divided clock (clk/2 as clock)', 'Enable strobe (tick)'],
        rows: [
          ['Clock domains', 'Two — phase relation lost', 'One — single clock everywhere'],
          ['Timing analysis', 'Fragmented, skew unmanaged', 'Standard single-domain STA'],
          ['Glitch risk', 'Yes (if divided by logic)', 'None — it is ordinary data'],
          ['Use', 'Output pins only', 'All internal slower-rate logic'],
        ],
      },
      {
        caption: 'Synchronizer stage roles',
        headers: ['Flop', 'Role', 'Used in logic?'],
        rows: [
          ['meta', 'Absorbs metastability; resolves within one clock', 'NEVER'],
          ['sync', 'Clean current sample', 'Yes (level, edge detect)'],
          ['prev', 'Clean 1-cycle-delayed sample', 'Yes (edge detect)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Distributing a divided or toggled flop output as another block’s clock.',
        fix:
          'Keep one clock; distribute enable strobes. The toggle flop is legitimate as a data/pin output only. Second clock domains are an architecture decision with dedicated crossing logic — not a shortcut.',
      },
      {
        mistake: 'Using an unsynchronized external input directly in logic or as a clock enable.',
        fix:
          'Every async input passes a 2-flop synchronizer first; logic taps only the clean stage. Unsynchronized inputs cause intermittent metastability failures that simulation cannot reproduce.',
      },
      {
        mistake: 'Tapping the meta stage of the synchronizer for faster response.',
        fix:
          'meta is by definition the possibly-invalid value; using it reintroduces the failure the synchronizer exists to prevent. Accept the constant 2-cycle latency.',
      },
    ],
    guidedPractice: {
      title: 'Pipeline trace',
      brief:
        'For pipe2: in_valid=1 with (a,b)=(1,1) at edge 1; in_valid=0 afterward. Give (out_valid, out) after each of edges 1-5.',
      expectedBehavior:
        'e1: s1 captures (valid=1, sum=2); s2 re-captures old stage1 (valid=0). e2: s2 captures (valid=1, out=3) — output visible now; s1 reloads (valid=0, bubble). e3: s2 captures bubble (valid=0). e4, e5: valid stays 0. So: e1 (0,x), e2 (1,3), e3 (0,x), e4 (0,x), e5 (0,x) — one valid output exactly 2 edges after input.',
      hints: [
        'Valid and data travel together; bubbles are valid=0 slots.',
        'Latency = number of stages = 2.',
      ],
    },
    practiceExercises: [
      {
        title: 'Strobe from a decade counter',
        brief:
          'Modify strobe_gen so tick fires every 10 clocks (N=10) without using $clog2 (declare the counter width explicitly). Give the counter’s value sequence around a tick.',
        expectedBehavior:
          'reg [3:0] cnt; (0..9 needs 4 bits). Sequence: ..., 8, 9→(tick=1, cnt=0), 1, 2, ... tick is high exactly when cnt==9 transitions. One clock domain, strobe every 10th clock.',
        hints: [
          '0..9 fits in 4 bits; compare cnt == 4\'d9.',
          'tick is 1 cycle wide, asserted on the wrap.',
        ],
      },
      {
        title: 'Synchronizer sanity check',
        brief:
          'An engineer connects a button through ONE flop and feeds both rise detection and a counter enable from it, reporting "random single-cycle glitches" in the lab. Diagnose using this lesson’s model, and give the fix.',
        expectedBehavior:
          'The single flop is the metastability catcher, and its (possibly invalid) output is being USED in logic — every near-edge button transition can produce an invalid sample that downstream logic interprets unpredictably: the observed random glitches. Fix: 2-flop synchronizer (meta unused, logic on sync) with edge pulses from sync/prev. Also: buttons bounce — module 10’s counter/shift techniques add debouncing after synchronization.',
        hints: [
          'Which stage is allowed to be invalid?',
          'The fix adds one flop and moves all logic taps.',
        ],
      },
    ],
    assessment: {
      title: 'Module 09 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why prefer an enable strobe over distributing a divided clock to other blocks?',
          options: [
            'Strobes keep a single clock domain — clean timing, no phase/skew fragmentation',
            'Strobes use less simulation time',
            'Divided clocks are illegal in Verilog',
            'Strobes have higher frequency',
          ],
          answer: 'Strobes keep a single clock domain — clean timing, no phase/skew fragmentation',
          explanation:
            'A divided clock creates a second clock domain with unmanaged skew and fragmented timing analysis; a strobe is ordinary single-domain data gating logic via enables.',
          hint: 'How many clock domains does each approach create?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What is the role of the FIRST flop in a double-flop synchronizer?',
          options: [
            'It may go metastable and needs one clock period to resolve; its output is never used by logic',
            'It detects edges',
            'It inverts the input',
            'It stores the final clean value',
          ],
          answer: 'It may go metastable and needs one clock period to resolve; its output is never used by logic',
          explanation:
            'meta absorbs the metastable event; the full clock period before the second flop samples gives it time to resolve. Logic taps only sync (and prev).',
          hint: 'Which flop is allowed to produce an invalid value?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'In sync_edge, the async input rises just before clock edge n. During which cycle is the rise pulse high?',
          code:
            'meta <= async_in;\nsync <= meta;\nprev <= sync;\nassign rise = sync & ~prev;',
          options: ['After edge n+1 (cycle between n+1 and n+2)', 'After edge n (immediately)', 'After edge n+2', 'Never — rise cannot detect async edges'],
          answer: 'After edge n+1 (cycle between n+1 and n+2)',
          explanation:
            'meta captures the input at edge n; sync becomes clean at n+1; prev holds the OLD sync (0) until edge n+2. So after edge n+1: sync=1, prev=0 → rise = 1 for exactly that cycle. Trace the three flops edge by edge to confirm.',
          hint: 'Track meta, sync and prev at edges n, n+1 and n+2.',
          difficulty: 'hard',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'In a pipeline, each stage registers its data together with a valid bit so consumers know which slots hold real results.',
          answer: 'true',
          explanation:
            'The valid bit is the pipeline’s bookkeeping: it marks live data, lets bubbles (invalid slots) flow through, and is reset with the data to hide stale post-reset contents.',
          hint: 'What tells the consumer "this result is real"?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'How many clock cycles of latency does a 2-stage pipeline add between input acceptance and output availability (number)?',
          answer: '2',
          explanation:
            'Each register stage adds one cycle; two stages → 2-cycle latency, with out_valid high on the cycle the result lands.',
          hint: 'One per stage.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Enable strobe', definition: 'A 1-cycle-wide periodic pulse used as a clock enable to act once per N clocks in a single domain.' },
      { term: 'Metastability', definition: 'A flop output hovering between levels when sampled too close to a transition; resolves unpredictably.' },
      { term: 'Double-flop synchronizer', definition: 'Two flops in series on an async input: stage 1 absorbs metastability, stage 2 delivers a clean sample.' },
      { term: 'Edge detection', definition: 'rise = sync & ~prev, fall = ~sync & prev — one-cycle pulses from synchronized samples.' },
      { term: 'Pipeline valid', definition: 'A per-stage flag traveling with data, marking slots that hold real results.' },
    ],
    revisionSummary: [
      'One clock forever: slower rates come from counter strobes, not divided clocks.',
      'Every async input gets a 2-flop synchronizer; logic never taps the meta stage.',
      'Edge detect = sync vs prev: rise = sync & ~prev, fall = ~sync & prev; constant 2-cycle latency.',
      'A held-high async input at reset release produces one synthetic rise pulse — expect it in system tests.',
      'Pipelines register data+valid per stage; latency = stage count; reset clears valids.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Metastability (electronics)', url: 'https://en.wikipedia.org/wiki/Metastability_(electronics)', kind: 'article' },
      { label: 'Wikipedia — Classic RISC pipeline', url: 'https://en.wikipedia.org/wiki/Classic_RISC_pipeline', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
