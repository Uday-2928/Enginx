import type { TutorialLesson } from '../types';

/**
 * Module 03 — RTL Coding Methodology.
 * Clocked-process and combinational-process rules, latch avoidance, and the
 * naming/structure/reuse conventions used across the rest of this course.
 */

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'rtl-m03-l1',
    title: 'The Clocked Process: Rules That Never Bend',
    summary:
      'One clock, one reset, nonblocking assignments, enables before the default transfer, and nothing else in the block. The clocked-process template turns every register in your design into a reviewable, synthesizable, timing-predictable unit.',
    objectives: [
      'Write the canonical clocked-process template from memory: sensitivity, reset first, enables, default transfer.',
      'Explain why exactly one clock and one reset may appear per clocked process.',
      'Use nonblocking assignments exclusively in clocked processes and state the race they prevent.',
      'Recognize and correct the four classic clocked-process violations in review.',
    ],
    whyItMatters:
      'Every flip-flop in your design comes from a clocked process, so the quality of your design\'s registers is exactly the quality of your clocked-process discipline. The rules in this lesson are not style preferences: each one exists because breaking it produces a specific, known failure — multi-clock blocks synthesize to race-prone clock muxing, blocking assignments in clocked code create simulation races that differ between tools, missing reset branches create registers that power up in unknown states. Teams enforce these rules with lint because reviewers cannot catch every instance across thousands of lines; you can, by making the template a reflex.',
    prerequisites: ['rtl-m01-l1', 'rtl-m01-l3'],
    explanation: [
      'The canonical template has five features, and every clocked process you write in this course follows it. One: the **sensitivity list** is `always @(posedge clk or negedge reset_n)` — the clock edge and the reset edge, and nothing else. Two: the **reset branch comes first** and assigns every register in the block its reset value. Three: **enables follow** in priority order (clear beats load, load beats default). Four: the **default transfer** is the unconditional fall-through case. Five: every assignment is **nonblocking** (`<=`). That is the whole grammar; complex registers are complex priority structures inside it, never exceptions to it.',
      'The **one clock rule** exists because a block clocked by two edges has no defined transfer event. `always @(posedge clk_a or posedge clk_b)` describes hardware that samples on both — which is a race by construction, and synthesis either rejects it or builds clock-muxing logic no timing tool can fully verify. A design with genuine multi-clock needs belongs to *separate* clocked processes, one per domain, inside separately-owned modules, with the crossing itself handled by the CDC discipline of module 07. Inside one process: one clock.',
      'The **one reset rule** pairs with it: a process with two reset conditions (say `reset_n` and a software init strobe) does not have two resets — it has one reset and one *enable with reset-like behaviour*, and the coding must say so: reset first, then `else if (init) ...` as an ordinary priority branch. Mixing a second async signal into the sensitivity list (`or negedge init_n`) creates a second asynchronously-clearable register set with its own recovery timing problem — a real structure, but one that belongs in an explicitly designed synchronizer, not an accident of typing.',
      'The **nonblocking rule** (`<=`) is about the transfer event. Nonblocking assignments evaluate all right-hand sides using current values, then commit all updates simultaneously — exactly the register-transfer semantics of module 01. Blocking assignments (`=`) in a clocked process commit statement-by-statement, so later statements in the *same* block read the *new* values while other blocks still see old ones: a simulator-dependent race. The classic bitten pattern is two registers swapping or a shift register written with `=`: `a = b; b = a;` leaves both equal to the old `b`, where the hardware (and the `<=` version) swaps correctly. Synthesis will happily build the correct hardware anyway — so the bug hides until someone reads the waveform, which is why the rule is absolute: **blocking never appears in a clocked process**, no exceptions, no "just this once".',
      'The **enable priority structure** is where register behaviour actually lives. Read the template top to bottom as "who wins this edge": reset wins always; then each enable in listed order; then the default. Two practical consequences: first, *holding* requires no code — a register whose enable is false is simply not assigned, and flip-flops hold for free; second, priority is explicit and reviewed — if a clear can be masked by a load, that ordering is a design decision visible in the branch order, not an accident buried in nested conditionals.',
    ].join('\n\n'),
    deepDive: [
      'Why does the reset branch assign *every* register in the block? Because "partially reset" is a design decision, not a coding accident. There are legitimate partial resets — a datapath register whose value is meaningless until first loaded might be left unreset to save the reset fanout — but such choices must be visible in the register list (module 02) and commented at the register. The lint rule "every register assigned in the reset branch or explicitly waiving" turns the exception into a documented decision. The default discipline: reset everything, waive explicitly and locally.',
      'The template also encodes the synchronous-enable idiom you will use constantly: a clock enable is an ordinary branch, never a gated clock (module 07 expands on why). `else if (en) q <= d;` builds a mux in front of the flip-flop\'s D input — cheap, timing-visible, safe. Compare the anti-pattern of gating the clock itself: the enable becomes a series element in the clock path, adding skew and nightmare timing exceptions. Same register behaviour, categorically different hardware. When you review, the tell is the word "clk" appearing anywhere in a right-hand side or an if-condition inside design code: in disciplined RTL, clk appears *only* in sensitivity lists.',
      'A note on simulation semantics to close the loop with module 01: with all design registers on nonblocking assignments and all clouds combinational, the simulator settles each cycle in a defined order — clouds compute, then registers commit — regardless of tool or statement order. That determinism is what makes waveform debugging meaningful and what makes the course\'s traced examples trustworthy. The moment one blocking assignment enters a clocked process, the settlement order becomes statement-order-dependent, and your simulation becomes a moving target across tools and releases. The template is not constraining your expressiveness; it is buying you determinism.',
    ].join('\n\n'),
    examples: [
      {
        title: 'The canonical clocked-process template, applied to a load-and-enable register',
        language: 'verilog',
        code: [
          '// Canonical clocked process: 8-bit register with sync load,',
          '// sync clear, and enable. Priority: reset > clear > load > en.',
          'module reg_le #(parameter integer WIDTH = 8) (',
          '    input  wire             clk,',
          '    input  wire             reset_n,',
          '    input  wire             clear_i,   // 1: clear next edge',
          '    input  wire             load_i,    // 1: load next edge',
          '    input  wire             en_i,      // 1: sample next edge',
          '    input  wire [WIDTH-1:0] d_i,',
          '    output reg  [WIDTH-1:0] q_o',
          ');',
          '',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n)',
          '            q_o <= {WIDTH{1\'b0}};          // 1. reset first',
          '        else if (clear_i)',
          '            q_o <= {WIDTH{1\'b0}};          // 2. enables in',
          '        else if (load_i)                   //    priority order',
          '            q_o <= d_i;',
          '        else if (en_i)',
          '            q_o <= q_o;                    // 3. explicit hold',
          '        // 4. no else: implicit hold (en_i=0 -> no transfer)',
          '    end',
          '',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Line 15: the sensitivity list names exactly two events: the clock edge and the reset edge. Any other name here is a bug.',
          'Lines 16-17: the reset branch assigns the register (singular — the block owns one register bank) its documented reset value.',
          'Lines 18-21: enables in priority order. clear beats load beats enable — if clear_i and load_i are both 1 on the same edge, the register clears. That priority is a design decision, visible here.',
          'Lines 22-24: an explicit hold branch is optional; omitting the else is identical hardware. Write it only when the hold deserves a comment.',
          'Trace (WIDTH=8, start q=0): edge with clear_i=1 -> q=0. Edge with load_i=1, d=0xA7 -> q=0xA7. Edge with en_i=1, d=0x11 -> q unchanged (0xA7): the enable branch wins because it precedes nothing else, and it assigns q_o to itself. Edge with all enables 0 -> hold. Edge with load_i=1 and clear_i=1 -> q=0 (clear wins by order).',
        ],
      },
      {
        title: 'Four violations and their corrections',
        language: 'verilog',
        code: [
          '// VIOLATION 1: two clocks in one block.',
          'always @(posedge clk_a or posedge clk_b)  // BAD: no single',
          '    q <= d;                                // transfer event',
          '// FIX: one process per clock, in per-domain modules; CDC by design.',
          '',
          '// VIOLATION 2: blocking assignments in a clocked shift register.',
          'always @(posedge clk) begin',
          '    s0 = d;      // BAD: s0 updated NOW',
          '    s1 = s0;     //      so s1 gets the NEW s0',
          '    s2 = s1;     //      and s2 too: s0==s1==s2==d',
          'end',
          '// FIX: nonblocking preserves the pipeline semantics:',
          'always @(posedge clk) begin',
          '    s0 <= d;',
          '    s1 <= s0;    // s1 gets the OLD s0: a true 3-stage shift',
          '    s2 <= s1;',
          'end',
          '',
          '// VIOLATION 3: logic in the sensitivity list (async claims).',
          'always @(posedge clk or negedge reset_n or en)  // BAD: en is not',
          '    if (en) q <= d;                              // a reset',
          '// FIX: enables belong in the body, never in the list:',
          'always @(posedge clk or negedge reset_n)',
          '    if (!reset_n) q <= 1\'b0;',
          '    else if (en)  q <= d;',
          '',
          '// VIOLATION 4: a register missing from the reset branch.',
          'always @(posedge clk or negedge reset_n) begin',
          '    if (!reset_n) begin',
          '        a_q <= 1\'b0;         // BAD: b_q powers up unknown (x)',
          '    end else begin',
          '        a_q <= a_d;',
          '        b_q <= b_d;          // b_q has NO defined reset value',
          '    end',
          'end',
          '// FIX: assign every register in the reset branch, or document the',
          '// intentional exception in the register list AND comment it here.',
        ].join('\n'),
        explanation: [
          'Violation 1: two clock edges in one sensitivity list has no register-transfer meaning — the block would sample on either edge. Hardware with real multi-clock interaction is split across processes and modules with explicit CDC structure (module 07).',
          'Violation 2, traced: with `=`, after one edge all three stages hold d (assignment order makes each stage read the just-updated previous stage). With `<=`, each stage reads the *pre-edge* value: d shifts one stage per cycle, the intended pipeline. The hardware the second form builds is what the first form *meant* — the bug is purely in the simulation semantics, which is the nastiest kind.',
          'Violation 3: adding `en` to the sensitivity list claims en is an asynchronous event like reset; synthesis would build logic that clears/loads whenever en *changes*, which is not the intent and is not a register any more.',
          'Violation 4: b_q starts simulation as x and powers up on silicon in an unknown state; any consumer of b_q inherits the unknown. Either reset it, or record the intentional unreset in the register list — never silence.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'What the template synthesizes to',
        content: [
          '                     priority structure',
          '                 +------------------------+',
          '  clear_i ------>| 1\'b0                   |',
          '  load_i, d_i -->| d_i        (muxes)     |---- D',
          '  en_i ---------|> q_o (hold)            |     |',
          '                 +------------------------+     v',
          '                                          +----------+',
          '  clk  ----------------------------------->| clk port |',
          '  reset_n ---> (async clear, active low)->| rst port |',
          '                                          |          |',
          '                                          |   Q -----+---> q_o',
          '                                          +----------+',
          '',
          '  Template feature          Hardware',
          '  ----------------------    ------------------------------',
          '  enable branches           muxes feeding D',
          '  default transfer          the mux default input',
          '  nonblocking               (register semantics itself)',
          '  negedge reset_n           the FF\'s async reset pin',
        ].join('\n'),
        caption:
          'Every template feature maps to a concrete piece of the flip-flop and its input mux: enables become muxes, the reset becomes the async pin, the branch order becomes mux priority.',
      },
    ],
    tables: [
      {
        caption: 'The five template rules and the failure each prevents',
        headers: ['Rule', 'Form', 'Failure if broken'],
        rows: [
          ['One clock', 'only posedge clk in the list', 'Race-prone clock muxing; unverifiable timing'],
          ['One reset', 'async reset_n as the only other event', 'Second async event creates unplanned async paths'],
          ['Reset first, complete', 'every register assigned', 'Unknown power-up state (x) propagates'],
          ['Enables as branches', 'priority-ordered if/else', 'Hidden priority; masked commands'],
          ['Nonblocking only', 'q <= d always', 'Simulator races; code behaves differently per tool'],
        ],
      },
      {
        caption: 'Blocking vs nonblocking in a 3-stage shift (value of s1 after the edge)',
        headers: ['Assignment style', 's0 after edge', 's1 after edge', 's2 after edge'],
        rows: [
          ['blocking ( s0=d; s1=s0; s2=s1; )', 'd', 'd (new s0)', 'd (new s1)'],
          ['nonblocking ( <= )', 'd', 'old s0', 'old s1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Mixing blocking and nonblocking assignments in the same clocked block "because it compiles".',
        fix:
          'The mixed block has two semantics at once: the blocking statements participate in intra-block ordering races while the nonblocking ones do not. Even when a specific simulator produces the intended order today, the code is unreviewable and tool-dependent. Rule: clocked block means `<=` on every assignment, full stop.',
      },
      {
        mistake: 'Putting an enable (or a data signal) into the sensitivity list.',
        fix:
          'The sensitivity list of a synthesizable process names only clock and reset edges. An enable in the list changes the process from edge-triggered to edge-plus-level-triggered, which synthesizes to something other than a register. Enables go in the body as priority branches.',
      },
      {
        mistake: 'Implementing a clock enable by gating the clock signal (assign gclk = clk & en).',
        fix:
          'Gated clocks create skew, break timing analysis on every downstream register, and are a CDC-style hazard even in single-clock designs. The enable is a branch in the clocked body: `else if (en) q <= d;`. Module 07 covers the clocking rules in full; for now the habit is: clk appears only in sensitivity lists.',
      },
    ],
    guidedPractice: {
      title: 'Build and trace a priority register',
      brief:
        'Write a 12-bit register with: async active-low reset to 0xABC; a synchronous clr input (clears to 0); a synchronous ld input loading d_i; and an unconditional increment-by-1 default. Specify the priority order you chose, implement it with the template, then trace three edges: (clr=1, ld=0, d=0x111), (clr=0, ld=1, d=0x222), (clr=0, ld=0, d=0x333).',
      starterCode: [
        'module prio_reg (',
        '    input  wire        clk,',
        '    input  wire        reset_n,',
        '    input  wire        clr_i,',
        '    input  wire        ld_i,',
        '    input  wire [11:0] d_i,',
        '    output reg  [11:0] q_o',
        ');',
        '    // TODO: template with chosen priority',
        'endmodule',
      ].join('\n'),
      expectedBehavior:
        'Priority: reset > clr > ld > increment. Code: if (!reset_n) q_o <= 12\'hABC; else if (clr_i) q_o <= 12\'h0; else if (ld_i) q_o <= d_i; else q_o <= q_o + 12\'d1. Trace from a known q: after edge 1 q=0; after edge 2 q=0x222; after edge 3 q=0x223 (increment default). Note the reset value 0xABC is deliberate: reset values need not be zero — the register list defines them.',
      hints: [
        'The default branch (increment) is the unconditional fall-through — no if around it.',
        'clr must beat ld, or "clear while loading" becomes a load.',
        'Reset value 0xABC goes in the reset branch only, never in the clr branch.',
      ],
      challengeId: 'ece-02-d-flip-flop',
    },
    practiceExercises: [
      {
        title: 'Repair the register',
        brief:
          'Fix this block, listing each violation and its rule: always @(posedge clk or negedge rst or load) begin if (rst) q = 0; else if (load) q = d; end — where rst is active-high and the designer wants active-low reset_n.',
        expectedBehavior:
          'Violations: (1) `load` in the sensitivity list — remove, it is an enable (rule: only clk and reset edges); (2) blocking `=` — change both to `<=`; (3) reset polarity: active-high `rst` is not this course\'s convention and `negedge rst` with active-high semantics inverts the intent — use `negedge reset_n` with `if (!reset_n)`. Corrected: always @(posedge clk or negedge reset_n) begin if (!reset_n) q <= {W{1\'b0}}; else if (load) q <= d; end.',
        hints: [
          'Three rules are broken; find them by walking the template top to bottom.',
          'The sensitivity-list fix and the enable fix go together.',
          'Check the polarity of both the edge and the if-condition.',
        ],
      },
      {
        title: 'Hold or transfer?',
        brief:
          'For the template register, state the value after the edge for each input combination (current q=5, d=9): (a) en=0, no other input; (b) en=1; (c) clear=1, en=1; (d) clear=1 and load=1 with d=9, where load has higher priority than clear in a colleague\'s version. Which ordering is defensible?',
        expectedBehavior:
          '(a) 5 (implicit hold). (b) 9. (c) 0 (clear beats enable by branch order). (d) 9 in the colleague\'s ordering — the clear is silently masked by the load. Defensible ordering: clear must beat load; a command that loses to a data operation is a specification bug, not a style choice. The template\'s job is to make this visible before silicon does.',
        hints: [
          'Implicit hold needs no code — what was NOT assigned is held.',
          'Priority is read off the branch order, top to bottom.',
          'Ask what the spec intends when two commands arrive together.',
        ],
      },
    ],
    assessment: {
      title: 'Clocked process checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'What hardware does an enable branch (else if (en) q <= d;) synthesize to?',
          options: [
            'A gated clock',
            'A mux on the flip-flop D input',
            'A second flip-flop',
            'A combinational loop',
          ],
          answer: 'A mux on the flip-flop D input',
          explanation:
            'The enable is data-path logic: when en is low the mux feeds q back into D, so the register re-loads its own value (hold). The clock stays clean — gating clocks is the anti-pattern, never the idiom.',
          hint: 'The clock pin is untouched; what changes is what arrives at D.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt:
            'This shift register uses blocking assignments. After one clock edge with d=7 (and s0,s1 previously 1 and 2), what does s2 hold?',
          code: 'always @(posedge clk) begin\n    s0 = d;\n    s1 = s0;\n    s2 = s1;\nend',
          options: ['2', '1', '7', 'x'],
          answer: '7',
          explanation:
            'Blocking assignments execute in order: s0 becomes 7 immediately, s1 reads the new s0 (7), s2 reads the new s1 (7). All stages collapse to d after one edge. With <=, s2 would hold 2 (the old s1).',
          hint: 'Blocking means "right now", not "at the edge".',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'bug-identification',
          prompt:
            'Which single feature of this block violates the one-reset rule?',
          code: [
            'always @(posedge clk or negedge reset_n',
            '                     or negedge init_n) begin',
            '    if (!reset_n)      q <= 8\'h00;',
            '    else if (!init_n)  q <= 8\'hFF;',
            '    else               q <= d_i;',
            'end',
          ].join('\n'),
          options: [
            'Nothing; two resets are fine if ordered',
            'init_n appears as a second asynchronous edge event in the sensitivity list; it is a synchronous enable with reset-like behaviour and belongs in the body',
            'The reset value should be 8\'hFF',
            'The else branch is missing an assignment',
          ],
          answer:
            'init_n appears as a second asynchronous edge event in the sensitivity list; it is a synchronous enable with reset-like behaviour and belongs in the body',
          explanation:
            'The list may contain exactly posedge clk and the one async reset edge. init_n as written creates registers that are asynchronously cleared by init_n — a separate async path with its own recovery/removal timing that nobody designed. Fix: else if (!init_n) q <= 8\'hFF; inside the clocked body, with no second list entry.',
          hint: 'Count the edge events in the list.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt:
            'A clocked process that assigns a register in some branches but not others infers a latch.',
          answer: 'false',
          explanation:
            'In a clocked process, an unassigned register simply holds — flip-flops hold for free, no latch is inferred. Latches come from *combinational* processes with incomplete assignment. (A combinational process missing a branch is the latch factory; module 03 lesson 2 covers it.)',
          hint: 'What does a flip-flop do when its enable is low?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt:
            'In one sentence each: why must the reset branch assign every register in the block, and what is the sanctioned way to leave one register unreset?',
          answer:
            'Every register needs a defined power-up state, otherwise it is x in simulation and unknown in silicon; an intentional unreset is documented in the register list and commented at the register as an explicit exception',
          explanation:
            'The default discipline is reset-everything. Exceptions exist (datapath registers written before read), but they must be recorded decisions visible to lint and review, not silent omissions.',
          hint: 'Unknown states propagate to every consumer.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      {
        term: 'Clocked process',
        definition:
          'An always block with posedge clk (and the one async reset edge) that synthesizes to registers.',
      },
      {
        term: 'Nonblocking assignment (<=)',
        definition:
          'Evaluates all right-hand sides with current values, commits simultaneously: the register-transfer semantics.',
      },
      {
        term: 'Blocking assignment (=)',
        definition:
          'Immediate statement-by-statement update; correct only in combinational processes and testbenches.',
      },
      {
        term: 'Enable priority',
        definition:
          'The ordered if/else structure deciding which command wins on a given edge.',
      },
      {
        term: 'Implicit hold',
        definition:
          'A register not assigned on an edge keeps its value — free with flip-flops, needs no code.',
      },
    ],
    revisionSummary: [
      'Template: sensitivity = posedge clk or negedge reset_n; reset first and complete; enables in priority order; default transfer; nonblocking only.',
      'One clock, one reset, per process. Multi-clock designs are separate processes/modules with designed CDC.',
      'Enable = mux on D, never a gated clock. clk appears only in sensitivity lists in design code.',
      'Blocking in a clocked block = simulator race; the shift-register collapse is the canonical example.',
      'Unassigned register in a clocked block holds; it does not latch.',
      'Reset values need not be zero (e.g. 0xABC); they come from the register list.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Flip-flop (electronics)',
        url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)',
        kind: 'article',
      },
      {
        label: 'Icarus Verilog documentation',
        url: 'https://steveicarus.github.io/iverilog/',
        kind: 'tool',
      },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'rtl-m03-l2',
    title: 'The Combinational Process and Latch Avoidance',
    summary:
      'Combinational clouds get their own discipline: blocking assignments, complete assignment of every output on every path, defaults at the top. Break completeness and the synthesizer quietly builds a latch where you meant a wire.',
    objectives: [
      'Write combinational processes with always @* and blocking assignments, defaults first.',
      'Predict exactly which code shapes infer latches: incomplete if/case, missing default, partially assigned outputs.',
      'Explain why a latch is harmful in synchronous designs and recognize its symptoms.',
      'Repair a latch-forming process in two different ways (default assignments and full coverage).',
    ],
    whyItMatters:
      'The inferred latch is the most common structural bug in student and production RTL alike. It never announces itself: the code compiles, simulation often works, and synthesis prints a warning among hundreds. But a latch is level-sensitive, ungated memory — it passes transparencies, breaks static timing analysis, and behaves differently between simulation and silicon. Since every output of every cloud you write is one incomplete branch away from becoming one, latch avoidance must be a typing-level reflex, not a review-time hope.',
    prerequisites: ['rtl-m03-l1', 'rtl-m01-l1'],
    explanation: [
      'A **combinational process** (`always @*`) describes a cloud: outputs must be a pure function of current inputs, with no storage. Its three rules mirror the clocked template. One: **blocking assignments** (`=`) — you want statement-order semantics to build up a result, and `<=` in combinational code is a classic source of confusion. Two: **the sensitivity list is `@*`** — the tool infers the full list; hand-writing signals there and missing one produces a simulation/synthesis mismatch. Three: **every output is assigned on every path** — the latch rule, and the subject of this lesson.',
      'Why does incompleteness build a latch? Consider `always @* begin if (sel) y = a; end`. When sel is 0, the code assigns y nothing — but a combinational block cannot "do nothing": y is a physical net and must hold *some* value. The only hardware that remembers a previous value without a clock is a **latch**, so synthesis builds one: y keeps its old value while sel is 0. The designer usually meant "y = 0 when sel is 0" or "y is don\'t-care" — but "keep the previous value" is what the code literally says, and the tool does exactly what the code says. Every latch-forming pattern is this same accident: a path through the process that leaves an output unassigned.',
      'The two repair patterns cover all cases. **Defaults at the top**: assign every output a harmless value before the branches (`y = 1\'b0;` then override inside the ifs). Any path that misses the branches now falls through to the default — completeness by construction. **Full coverage**: restructure so every path assigns (add the `else`, or the `default:` in a case). Defaults are the more robust habit because they survive future edits — adding a fourth branch to a defaulted case cannot create a latch, while adding a branch to a fully-covered non-defaulted case can.',
      'The case statement is the other great latch factory: a case without `default:` over an enum-like selector whose values the case does not fully enumerate leaves those selector values unassigned. In a **clocked** process that is fine (hold); in a **combinational** process it is a latch on every missed value. The habit: every combinational case ends with `default:` — even when you believe the selector cannot reach other values, especially then, because the belief is exactly what the default protects when it turns out false.',
      'Why latches matter, concretely: a latch is **level-sensitive** — it passes data through while its gate is active, so its output is a clock-independent, timing-uncontrolled path. Static timing analysis cannot properly constrain it; the tool either excludes it (leaving an unconstrained path that may fail in silicon) or reports an error. Latches also create simulation/synthesis mismatches when the designer\'s x-handling differs from the tool\'s. And they usually indicate the designer *meant* something else entirely — so beyond the hardware harm, a latch is a reliable flag that the code does not say what the author thought it said.',
    ].join('\n\n'),
    deepDive: [
      'A precise mental model helps: a combinational process is a *function definition*. Every output is a return value; every execution path must return. The if-without-else is a path that "falls off the end" — in software a missing return; in hardware a latch holding the last returned value. Reading your always @* blocks as functions, and lint-checking them for "all paths return", is the cleanest formulation of the rule. It also explains the default-first pattern: initialize the return values, then refine them — a style straight out of defensive software engineering.',
      'The asymmetry with clocked processes confuses people, so state it exactly: in a **clocked** process, not assigning a register means *hold* — that is a flip-flop with a disabled enable, perfectly good hardware. In a **combinational** process, not assigning an output means *remember* — and memory without a clock is a latch. The same textual omission produces opposite hardware depending on which process it sits in. This is why the two templates must become reflexes separately: mixing their rules (blocking in clocked, incomplete in combinational) produces the two most common bugs in the trade.',
      'One subtlety worth knowing: `casex` and `casez` interact with defaults in ways that hide bugs — a `casex` that matches don\'t-cares aggressively can make the default unreachable for values you expected to hit it, and unmatched-x inputs can select a branch nobody intended. The course convention (module 09 enforces it in lint) is: `case` with an explicit `default:` in combinational code; `casex` only with a lint waiver and a written reason, `casez` only for genuine priority patterns. The default is not decoration; it is the code\'s answer to the selector values you did not think of.',
    ].join('\n\n'),
    examples: [
      {
        title: 'A latch, found and fixed two ways',
        language: 'verilog',
        code: [
          '// BUGGY: infers a latch on y when sel==0.',
          'module mux_latch (',
          '    input  wire       sel,',
          '    input  wire [7:0] a, b,',
          '    output reg  [7:0] y',
          ');',
          '    always @* begin',
          '        if (sel)',
          '            y = a;      // sel==0: y never assigned -> LATCH',
          '        // (designer meant: y = b)',
          '    end',
          'endmodule',
          '',
          '// FIX 1: defaults at the top (preferred, survives edits).',
          'always @* begin',
          '    y = b;              // default: harmless, defined on all paths',
          '    if (sel)',
          '        y = a;          // override',
          'end',
          '',
          '// FIX 2: full coverage (equivalent hardware here).',
          'always @* begin',
          '    if (sel)',
          '        y = a;',
          '    else',
          '        y = b;          // every path assigns',
          'end',
        ].join('\n'),
        explanation: [
          'The buggy block: when sel is 0, y is left unassigned, so the tool infers a transparent latch enabled by ~sel that holds y\'s previous value. Simulation may hide it if sel never sits at 0 with a stale y, but synthesis reports the latch and timing loses the path.',
          'Fix 1 assigns the default first, then overrides: any present or future path that misses an assignment falls through to the default. This is the habit that scales to ten-branch clouds.',
          'Fix 2 adds the missing else. Identical hardware for this tiny case, but as branches grow, a newly added branch silently re-opens the latch unless every path was re-audited. Defaults make the completeness structural rather than vigilance-based.',
          'Both fixes produce the same 2:1 mux: y = sel ? a : b. The continuous-assignment form `assign y = sel ? a : b;` is even better here — when a cloud fits in one expression, prefer assign; use always @* when the structure needs intermediate variables.',
        ],
      },
      {
        title: 'The case-statement latch and the defaulted priority encoder',
        language: 'verilog',
        code: [
          '// A 4-request priority encoder: out = highest set bit index,',
          '// valid = any bit set. Selector is one-hot-ish req[3:0].',
          'module prio_enc (',
          '    input  wire [3:0] req_i,',
          '    output reg  [1:0] idx_o,',
          '    output reg        valid_o',
          ');',
          '',
          '    // Defaults first: no path can leave an output behind.',
          '    always @* begin',
          '        idx_o   = 2\'d0;',
          '        valid_o = 1\'b0;',
          '        if      (req_i[3]) begin idx_o = 2\'d3; valid_o = 1\'b1; end',
          '        else if (req_i[2]) begin idx_o = 2\'d2; valid_o = 1\'b1; end',
          '        else if (req_i[1]) begin idx_o = 2\'d1; valid_o = 1\'b1; end',
          '        else if (req_i[0]) begin idx_o = 2\'d0; valid_o = 1\'b1; end',
          '        // req_i==4\'b0000 falls through to defaults: idx 0, valid 0',
          '    end',
          '',
          '    // Equivalent case form. Note the default:',
          '    always @* begin',
          '        idx_o   = 2\'d0;',
          '        valid_o = 1\'b0;',
          '        casez (req_i)',
          '            4\'b1???: begin idx_o = 2\'d3; valid_o = 1\'b1; end',
          '            4\'b01??: begin idx_o = 2\'d2; valid_o = 1\'b1; end',
          '            4\'b001?: begin idx_o = 2\'d1; valid_o = 1\'b1; end',
          '            4\'b0001: begin idx_o = 2\'d0; valid_o = 1\'b1; end',
          '            default: begin idx_o = 2\'d0; valid_o = 1\'b0; end',
          '        endcase',
          '    end',
          'endmodule',
        ].join('\n'),
        explanation: [
          'The if/else chain is a priority structure: bit 3 wins, then 2, 1, 0. Blocking assignments build the result top-down.',
          'Lines 11-12: defaults before the chain. The all-zeros request now yields idx 0 with valid 0 — defined behaviour for the one combination the branches do not cover.',
          'The casez variant encodes the same priority with don\'t-care patterns: 4\'b1??? matches anything with bit 3 set, so later rows only see the remaining cases. The default row catches 4\'b0000 — and also any x/z contamination, which is exactly the scenario the default exists for.',
          'Delete the defaults in either block and the all-zeros request infers latches on idx_o and valid_o — two latches from one forgotten row. This is the case-statement latch factory in miniature.',
          'Trace: req=0101 -> row 4\'b01?? matches (bit 2 set): idx=2, valid=1. req=0000 -> default: idx=0, valid=0. req=1000 -> idx=3, valid=1.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Same code, opposite hardware: the process decides',
        content: [
          '  CODE:   if (sel) y = a;      (no else, no default)',
          '',
          '  In a COMBINATIONAL process (always @*):',
          '          +---------------------------+',
          '  sel --->| latch (transparent when   |',
          '          | ~sel active): y keeps its |---- y',
          '  a  ---->| last value while sel==0   |',
          '          +---------------------------+',
          '          UNGATED memory: timing-blind, STA-hostile',
          '',
          '  In a CLOCKED process (always @(posedge clk)):',
          '          +---------------------------+',
          '  sel --->| enable mux on D           |',
          '  a  --->| (sel=0: reload old y)     |---- y',
          '  clk -->| flip-flop                 |',
          '          +---------------------------+',
          '          CLEAN register: hold is intended behaviour',
          '',
          '  Same three lines. The process type decides whether the',
          '  omission is a feature (hold) or a bug (latch).',
        ].join('\n'),
        caption:
          'The missing branch is identical text in both process types; only the process kind turns it into hold (fine) or latch (bug).',
      },
    ],
    tables: [
      {
        caption: 'Latch-forming patterns and their repairs',
        headers: ['Pattern', 'What synthesizes', 'Repair'],
        rows: [
          ['if without else (combinational)', 'Latch enabled by the missing branch', 'Default at top, or add the else'],
          ['case without default, selector has uncovered values', 'One latch per missed value per output', 'default: row'],
          ['Output assigned in only some branches of a multi-branch chain', 'Latch on every uncovered path', 'Assign every output on every path'],
          ['Output assigned before some branches but overwritten inconsistently', 'Correct but fragile; future edit re-opens latch', 'Defaults-first style as a habit'],
          ['Same patterns in a CLOCKED process', 'Not a latch: register holds', 'Nothing — this is correct RTL'],
        ],
      },
      {
        caption: 'Combinational vs clocked process rules side by side',
        headers: ['Aspect', 'Combinational (always @*)', 'Clocked (always @(posedge clk...))'],
        rows: [
          ['Assignment operator', 'Blocking =', 'Nonblocking <='],
          ['Sensitivity list', '@* (inferred)', 'posedge clk or negedge reset_n'],
          ['Unassigned output on a path', 'LATCH (bug)', 'Hold (correct)'],
          ['Default assignments', 'At top of block', 'Not applicable (reset branch is first)'],
          ['case default', 'Required', 'Recommended (illegal-state safety, module 05)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Trusting the synthesizer warning list to catch latches later.',
        fix:
          'Latch warnings arrive among hundreds of messages, often worded as "inferred latch for signal y" without saying which path missed the assignment. The cheap catch is at writing time: defaults at the top of every always @* block make latches structurally impossible in that block. Treat a latch warning in review as a bug, not a style note.',
      },
      {
        mistake: 'Writing hand-maintained sensitivity lists (always @(a or b or sel)).',
        fix:
          'Hand lists go stale: add a term to the logic, forget the list, and simulation now uses a stale snapshot of inputs while synthesis builds the full cloud — a simulation/synthesis mismatch that wastes a debugging day. Verilog-2001 gives you `always @*`; use it everywhere in combinational code.',
      },
      {
        mistake: 'Using casex "for convenience" and assuming the default row will catch bad inputs.',
        fix:
          'casex matches x/z in the selector as don\'t-cares, so an x-contaminated input can select an unintended branch and never reach the default. Prefer case (or casez for priority patterns), and treat any casex as a lint-flagged exception with a written justification (module 09).',
      },
    ],
    guidedPractice: {
      title: 'Defuse a three-output latch farm',
      brief:
        'This combinational block computes an ALU slice: y = add(a,b) when op=0, y = a&b when op=1, and co (carry out) only for op=0. It has three latch-forming paths. Rewrite it with defaults-first style, state which paths were incomplete, and give y and co for op=2\'d2 (an undefined op) after your fix.',
      starterCode: [
        'module alu_slice (',
        '    input  wire [7:0] a, b,',
        '    input  wire [1:0] op,',
        '    output reg  [7:0] y,',
        '    output reg        co',
        ');',
        '    always @* begin',
        '        // TODO: rewrite with defaults; define behaviour for op=2 and 3',
        '    end',
        'endmodule',
      ].join('\n'),
      expectedBehavior:
        'Original latch paths: y unassigned for op=2/3; co unassigned for op=1 and op=2/3. Fixed: defaults y = 8\'h00; co = 1\'b0; then case (op) 2\'d0: begin y = a + b; co = (9\'(a)+b>>8 style) end — in plain Verilog: {co, y} = a + b with a 9-bit intermediate; 2\'d1: y = a & b; default: y = 8\'h00 (or a defined pattern, documented). For op=2\'d2: y=0x00, co=0 — defined, testable, and lint-clean.',
      hints: [
        'The 9-bit trick: declare wire [8:0] sum = a + b; then y = sum[7:0]; co = sum[8]; — the assignment context extends both operands to 9 bits, so the carry lands in sum[8] (width discipline from module 04 applied early).',
        'Count paths: 4 op values x 2 outputs = 8 cells; the buggy code fills 3.',
        'A defined "unknown op" behaviour (zeros) is a spec decision, not a hack — document it in the case default comment.',
      ],
    },
    practiceExercises: [
      {
        title: 'Spot the latch before the tool does',
        brief:
          'For each fragment, say whether a latch is inferred and on which signal: (a) always @* if (en) y = a; (b) always @(posedge clk) if (en) q <= a; (c) always @* begin y = 0; case (s) 2\'b00: y = 1; 2\'b01: y = 2; endcase end; (d) always @* begin case (s) 2\'b00: y = 1; default: y = 0; endcase end.',
        expectedBehavior:
          '(a) Latch on y for en=0. (b) No latch — clocked process, q holds when en=0. (c) No latch — the pre-case default covers 2\'b10/2\'b11 (y=0). (d) No latch — full coverage via default. The pattern to internalize: process type plus path coverage decides, not the presence of if/case.',
        hints: [
          'Ask: is there a path on which the output is never assigned?',
          '(b) is the trap — the same text as (a) but a different process.',
          'A default assignment before a partial case rescues the uncovered values.',
        ],
      },
      {
        title: 'Defaults under edit pressure',
        brief:
          'A colleague\'s fully-covered 3-branch combinational decoder assigns y on every path (no defaults). A fourth branch is added for a new opcode — and a latch appears. Explain mechanically how the edit re-opened completeness, then rewrite the block defaults-first so the next opcode addition cannot.',
        expectedBehavior:
          'Mechanism: the new branch was added with a y assignment for its own opcode but the old chain\'s structure (if/else if/else) was converted to if/else-if without an else — the default path (no opcode matches) is now uncovered, so y latches. Rewrite: y = <default>; at the top, then if/else-if chain with no trailing else required. Future branches cannot un-cover the default path because the default is unconditional.',
        hints: [
          'The bug is not in the new branch — it is in what the edit did to the coverage of the old ones.',
          'Defaults-first converts completeness from "checked per edit" to "structural".',
          'This is the maintainability argument for defaults, beyond the one-off fix.',
        ],
      },
    ],
    assessment: {
      title: 'Combinational process checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'What hardware does synthesis build for always @* begin if (sel) y = a; end when sel is 0?',
          options: [
            'A wire driving y to 0',
            'A transparent latch holding y\'s previous value',
            'A flip-flop clocked by sel',
            'Nothing; y floats',
          ],
          answer: 'A transparent latch holding y\'s previous value',
          explanation:
            'The sel==0 path leaves y unassigned; a combinational net cannot "do nothing", so the tool infers the only clockless memory available — a latch, enabled by ~sel.',
          hint: 'What kind of memory works without a clock edge?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt:
            'What does idx_o hold for req_i = 4\'b0000 in the defaulted priority encoder?',
          code: 'idx_o = 2\'d0; valid_o = 1\'b0;\nif (req_i[3]) begin idx_o = 2\'d3; valid_o = 1\'b1; end\nelse if (req_i[2]) begin idx_o = 2\'d2; valid_o = 1\'b1; end\nelse if (req_i[1]) begin idx_o = 2\'d1; valid_o = 1\'b1; end\nelse if (req_i[0]) begin idx_o = 2\'d0; valid_o = 1\'b1; end',
          options: ['2\'d0 with valid 0', '2\'d3 with valid 1', 'x (unknown)', '2\'d1 with valid 0'],
          answer: '2\'d0 with valid 0',
          explanation:
            'No branch matches the all-zeros request, so execution falls through to the defaults assigned before the chain: idx_o = 0, valid_o = 0. Remove those defaults and this same input infers two latches.',
          hint: 'Defaults execute first; branches only override.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'An output left unassigned on some paths of a CLOCKED process infers a latch.',
          answer: 'false',
          explanation:
            'In a clocked process an unassigned register holds its value — flip-flops do that natively. Latches only come from combinational processes. The same omission means hold (fine) in clocked code and latch (bug) in combinational code.',
          hint: 'Which process type has memory by design?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt:
            'A designer writes always @(a or b or sel) y = sel ? a : b; and finds that simulation and synthesis disagree after a new input c is added to the expression. What went wrong?',
          options: [
            'Synthesis ignored c because it is unsigned',
            'The hand-written sensitivity list was not updated to include c, so simulation evaluates with a stale snapshot while synthesis built the full cloud',
            'The ternary operator cannot be used in always blocks',
            'Nothing; the mismatch must come from the testbench',
          ],
          answer:
            'The hand-written sensitivity list was not updated to include c, so simulation evaluates with a stale snapshot while synthesis built the full cloud',
          explanation:
            'Hand-maintained lists go stale at the first edit. `always @*` infers the complete list, eliminating the whole failure class. This is why the course convention mandates @* for every combinational process.',
          hint: 'Compare the list contents before and after the edit.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt:
            'State the two sanctioned ways to make a combinational if/case complete, and which one survives future edits better.',
          answer:
            'Defaults assigned at the top of the block before the branches, or full path coverage (else clauses / default case rows); defaults survive edits better because new branches cannot un-cover an unconditional default',
          explanation:
            'Both produce identical hardware today; defaults make completeness structural, so adding a branch later cannot silently re-open a latch path.',
          hint: 'One is a property of the code\'s structure, the other of its current content.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      {
        term: 'Combinational process',
        definition:
          'An always @* block with blocking assignments describing a memory-free cloud.',
      },
      {
        term: 'Inferred latch',
        definition:
          'A transparent latch synthesized because a combinational path left an output unassigned.',
      },
      {
        term: 'Default assignment',
        definition:
          'A harmless value assigned to every output at the top of a combinational block, before any branch.',
      },
      {
        term: 'Path coverage',
        definition:
          'The property that every execution path assigns every output — the completeness requirement.',
      },
      {
        term: 'casez / casex',
        definition:
          'Case variants with z (and x) treated as don\'t-cares; useful for priority patterns, dangerous with x-contaminated selectors.',
      },
    ],
    revisionSummary: [
      'Combinational rules: always @*, blocking =, every output assigned on every path.',
      'Incomplete if/case in combinational code infers a latch — the same omission in clocked code is a clean hold.',
      'Repair pattern 1: defaults at the top (preferred — structurally complete). Repair pattern 2: full coverage with else/default.',
      'Every combinational case ends with default:, even when the selector "cannot" reach uncovered values.',
      'Never hand-write sensitivity lists; @* prevents the stale-list simulation/synthesis mismatch.',
      'Latches break STA and usually mean the code does not say what the author meant.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Latch (electronics)',
        url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Static timing analysis',
        url: 'https://en.wikipedia.org/wiki/Static_timing_analysis',
        kind: 'article',
      },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'rtl-m03-l3',
    title: 'Naming, Structure, and Reuse',
    summary:
      'A naming convention that reviewers can parse at a glance, modules that do one job, parameters that make blocks reusable, and the lint-friendly habits that keep warnings meaningful. This lesson fixes the style used for the rest of the course.',
    objectives: [
      'Apply the course naming convention (clk, reset_n, _i/_o ports, _q/_d registers, _n, _en, _tick) consistently.',
      'Structure a module as header, parameters, interface, clouds, registers — in that order.',
      'Parameterize a design and use generate for structure repetition.',
      'Explain how naming and structure choices make lint output actionable.',
    ],
    whyItMatters:
      'RTL is read far more often than it is written — by reviewers, by verification engineers writing against your interface, by synthesis and lint tools pattern-matching your structure, and by you in six months. A consistent naming system converts every name into a spec: `count_q` tells a reviewer "this is the counter\'s register" without reading a line of logic, and `tick` tells the lint tool which signals are deliberately single-cycle. Teams with real conventions review faster, reuse more, and get quieter lint reports — not because they write less logic, but because their code states its own intent.',
    prerequisites: ['rtl-m03-l1', 'rtl-m03-l2'],
    explanation: [
      '**The course naming convention** (declared here, used everywhere after): clocks are `clk`; the asynchronous active-low reset is `reset_n` (the `_n` suffix marks active-low everywhere). Ports carry direction suffixes: inputs `_i`, outputs `_o` — `data_i`, `sum_o`, `cfg_wr_i`. Internal registers carry `_q` ("q" as in flip-flop Q output): `count_q`, `st_q`; their next-value combinational counterparts carry `_d`: `count_d`, `st_d`. Single-cycle event pulses are `_tick`: `tc_tick`. Enables are `_en` (`byte_en_i`), selects are `_sel`, active-low anything is `_n`. One rule makes it all work: **the suffix is part of the contract** — a signal named `*_q` is assigned only in clocked processes; a `*_d` only in combinational ones. Violating the suffix is a review finding, the same as violating the process templates.',
      '**Module structure, top to bottom**, is fixed: (1) the header comment — one paragraph: what the block does, its interfaces, its clocking, its reset values, and a pointer to the spec/decision log; (2) parameters with defaults and a one-line comment each; (3) the port list, grouped clk/reset, then config, then datapath, each port commented at its declaration; (4) localparams (FSM state encodings, magic numbers); (5) signal declarations, registers first; (6) clouds — assign statements and always @* blocks; (7) clocked processes; (8) instances of submodules. The order is the reading order of a reviewer: intent first, then structure. A module whose declarations and logic are interleaved randomly forces every reader to reconstruct that intent themselves — every time.',
      '**Parameters make blocks reusable**; the discipline is deciding what *varies* versus what is *structural*. Widths, depths, and reset values vary — parameterize them. The FSM\'s state count, the handshake protocol, the register map — these are the block\'s identity; parameterizing them produces configure-everything modules that are configure-nothing reliably. The classic reusable form is a parameterized register with enable: WIDTH, RESET_VALUE as parameters, used dozens of times in a design. Paired with **generate** for structural repetition (N identical bank instances, byte-lane replication), parameters cover most reuse needs without any cleverness. The rule of thumb: if you are copying a module to change one number, you needed a parameter; if you are copying it to change its behaviour, you needed a different module.',
      '**Lint-friendly habits** make the tool\'s output trustworthy. Declare every signal with an explicit width (`wire [15:0] x;`, never bare `wire x` for buses); use sized literals (`16\'h0000`, never plain `0`) so width mismatches surface instead of silently extending; give every unused-but-real signal a name that says why (`unused_cfg_bit3`) or remove it; avoid implied default widths in concatenations and replications; keep one module per file so file-scoped lint reports are meaningful. The point is not a clean report for its own sake: **lint is only useful when the remaining warnings are surprising**. Every warning you prevent by convention is one that would have buried a real one.',
      '**One module, one job.** The PIT of module 02 will be coded as `pit_top` (config bus, instances, output glue) containing `pit_control` (decode, FSM, flags) and `pit_datapath` (counter) — because the top level is where integration and review happen and it should read like the block diagram; the leaf modules are where the logic lives and they should be independently testable. The test: you should be able to state each module\'s job in one sentence without the word "and". If you cannot, split it.',
    ].join('\n\n'),
    deepDive: [
      'Why the `_q`/`_d` pairing pays for itself: it makes the transfer equation visible in the source. `count_q <= count_d;` in a clocked process, with `assign count_d = ...` in the cloud, is the R <- f(R, in) structure stated as text — reviewers can check every register\'s next-value function by scanning the `_d` assignments, without simulating anything. It also catches a whole bug class at review: a `_d` signal assigned in a clocked process, or a `_q` assigned combinationally, is immediately suspicious. The alternative (arbitrary names) hides the register/cloud boundary inside every module, and each reviewer must rebuild it from scratch.',
      'Parameterization has a verification cost that reuse enthusiasm hides: each distinct parameter combination is, for verification purposes, a different design. A module with WIDTH and DEPTH parameters has WIDTH x DEPTH interesting configurations, and a responsible team tests the corners (minimum, maximum, a mid value) rather than one default. The habit that keeps this honest: parameters get documented ranges (WIDTH: 4-32; DEPTH: 2-64) in the header, and the testbench is parameterized with the module so the same suite runs per configuration. Unbounded parameterization ("what if someone wants WIDTH=1?") is not flexibility; it is undocumented behaviour.',
      'Generate blocks earn their keep when repetition is *structural* — N identical byte lanes, a parameterized number of pipeline stages — and mislead when the repetition is *incidental* (similar-looking registers that differ in one enable). The test: could an array of instances be described in one sentence ("six byte-lane registers, each with its own enable")? If yes, generate. If the instances would need per-instance exceptions, write them out explicitly — a generate with two special cases inside is harder to review than six plain instances. Lint tools handle generate blocks well, but naming the generate blocks (`begin : g_byte_lane`) is what makes hierarchical names in waveforms and reports readable.',
    ].join('\n\n'),
    examples: [
      {
        title: 'The convention applied: a parameterized, lint-clean byte-enable register file',
        language: 'verilog',
        code: [
          '// -----------------------------------------------------------------',
          '// byte_en_regfile: WIDTH-bit register with per-byte write enables.',
          '//',
          '// Interface : clk, reset_n (async, active-low); byte_en_i[BYTES-1:0]',
          '//              selects which bytes of data_i are written on an edge;',
          '//              unwritten bytes hold. q_o reads the current value.',
          '// Clocking   : single clock domain, posedge clk.',
          '// Reset      : all bytes to RESET_VALUE (parameter).',
          '// Spec       : regfile block, decision log D2 (byte granularity).',
          '// -----------------------------------------------------------------',
          'module byte_en_regfile #(',
          '    parameter integer WIDTH       = 32,  // total width, multiple of 8',
          '    parameter integer BYTES       = WIDTH/8,',
          '    parameter [WIDTH-1:0] RESET_VALUE = {WIDTH{1\'b0}}',
          ') (',
          '    input  wire                  clk,',
          '    input  wire                  reset_n,',
          '    input  wire [BYTES-1:0]      byte_en_i,',
          '    input  wire [WIDTH-1:0]      data_i,',
          '    output wire [WIDTH-1:0]      q_o',
          ');',
          '',
          '    reg [WIDTH-1:0] data_q;',
          '',
          '    // Clocked process: per-byte enables via a loop over byte lanes.',
          '    integer i;',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n)',
          '            data_q <= RESET_VALUE;',
          '        else begin',
          '            for (i = 0; i < BYTES; i = i + 1) begin',
          '                if (byte_en_i[i])',
          '                    data_q[8*i +: 8] <= data_i[8*i +: 8];',
          '                // else: byte holds (clocked -> hold, no latch)',
          '            end',
          '        end',
          '    end',
          '',
          '    assign q_o = data_q;',
          '',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Lines 1-8: the header answers what/interfaces/clocking/reset in eight lines — a reviewer knows the contract before any code. The pointer to the decision log connects this code to its architecture artifact.',
          'Lines 9-13: parameters with defaults and comments. RESET_VALUE is itself parameterized, so instantiators get defined power-up values — the register-list discipline of module 02, expressed in code.',
          'Line 25: `data_q` follows the `_q` convention; it is assigned only here, in the clocked process.',
          'Lines 27-35: the byte-lane loop. `8*i +: 8` is Verilog-2001 indexed part-select: byte i, eight bits wide. Unwritten bytes are simply not assigned — in a clocked process that is hold, deliberately.',
          'Trace (WIDTH=32, data_q=0xAABBCCDD, byte_en_i=4\'b0101, data_i=0x11223344): bytes 0 and 2 are written, so after the edge data_q = 0xAA33CC44. Bytes 1 and 3 held.',
          'The module is reusable as-is: change WIDTH to 16 and the loop, enables and reset all follow. Nothing inside the body mentions 32.',
        ],
      },
      {
        title: 'Generate for structural repetition: N staged registers',
        language: 'verilog',
        code: [
          '// -----------------------------------------------------------------',
          '// delay_line: parameterized N-stage shift register with valid.',
          '// Used to delay a data stream by STAGES cycles, carrying its',
          '// valid bit alongside so the consumer knows which cycles matter.',
          '// -----------------------------------------------------------------',
          'module delay_line #(',
          '    parameter integer WIDTH  = 8,',
          '    parameter integer STAGES = 3',
          ') (',
          '    input  wire             clk,',
          '    input  wire             reset_n,',
          '    input  wire [WIDTH-1:0] data_i,',
          '    input  wire             valid_i,',
          '    output wire [WIDTH-1:0] data_o,',
          '    output wire             valid_o',
          ');',
          '',
          '    generate',
          '        if (STAGES == 0) begin : g_pass',
          '            // Degenerate configuration: wire-through, no registers.',
          '            assign data_o  = data_i;',
          '            assign valid_o = valid_i;',
          '        end else begin : g_pipe',
          '            reg [WIDTH-1:0] data_q [0:STAGES-1];',
          '            reg             valid_q [0:STAGES-1];',
          '            integer s;',
          '            always @(posedge clk or negedge reset_n) begin',
          '                if (!reset_n) begin',
          '                    for (s = 0; s < STAGES; s = s + 1) begin',
          '                        data_q[s]  <= {WIDTH{1\'b0}};',
          '                        valid_q[s] <= 1\'b0;',
          '                    end',
          '                end else begin',
          '                    data_q[0]  <= data_i;',
          '                    valid_q[0] <= valid_i;',
          '                    for (s = 1; s < STAGES; s = s + 1) begin',
          '                        data_q[s]  <= data_q[s-1];',
          '                        valid_q[s] <= valid_q[s-1];',
          '                    end',
          '                end',
          '            end',
          '            assign data_o  = data_q[STAGES-1];',
          '            assign valid_o = valid_q[STAGES-1];',
          '        end',
          '    endgenerate',
          'endmodule',
        ].join('\n'),
        explanation: [
          'The generate chooses structure by configuration: STAGES=0 is a wire (a legal, useful degenerate case), anything else is a shift register. Both are named (`g_pass`, `g_pipe`) so hierarchical paths in waveforms stay readable.',
          'The data and valid arrays shift together — valid is delayed by exactly the same STAGES as data. Trace STAGES=2, inputs (d1,v=1), (d2,v=0), (d3,v=1): after edge 1 stage0=(d1,1); after edge 2 stage0=(d2,0), stage1=(d1,1) -> outputs (d1,1); after edge 3 outputs (d2,0). The valid stream mirrors the data stream, stage for stage.',
          'The reset loop covers every element — the "assign every register in the reset branch" rule, scaled to an array.',
          'This module is the seed of the valid-pipeline machinery in module 06 and appears unchanged in the capstone\'s toolchain of small parts.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Module reading order (structure as documentation)',
        content: [
          '  +--------------------------------------------+',
          '  | 1. HEADER: what, interfaces, clocking,     |',
          '  |    reset, spec pointer                     |',
          '  +--------------------------------------------+',
          '  | 2. PARAMETERS (with ranges + defaults)     |',
          '  | 3. PORTS (clk/reset | config | datapath)   |',
          '  | 4. LOCALPARAMS (ST_*, magic numbers)       |',
          '  | 5. DECLARATIONS (_q registers first, _d)   |',
          '  | 6. CLOUDS (assign, always @*)              |',
          '  | 7. CLOCKED PROCESSES (one per register     |',
          '  |    group, template of lesson 1)            |',
          '  | 8. INSTANCES (submodules, named)           |',
          '  +--------------------------------------------+',
          '',
          '  Reading order == review order: intent, then structure,',
          '  then behaviour, then composition.',
        ].join('\n'),
        caption:
          'A fixed section order makes any module navigable without reading logic; deviations are review findings, not style opinions.',
      },
      {
        kind: 'block',
        title: 'Top level reads like the block diagram',
        content: [
          '                 pit_top',
          '  cfg_wr_i  --->+---------------------------+',
          '  cfg_addr_i -->|  decode glue (small!)     |',
          '  cfg_wdata_i ->|   +-------------------+   |',
          '                |   | pit_control       |   |',
          '                |   |  st_q, tc_q,      |   |',
          '                |   |  period_q, ...    |   |',
          '                |   +---------+---------+   |',
          '                |       | run, load  ^      |',
          '                |       v            | tick |',
          '                |   +-------------------+   |',
          '                |   | pit_datapath      |   |',
          '                |   |  count_q          |   |',
          '                |   +-------------------+   |',
          '  cfg_rdata_o <-|  read mux                 |',
          '  irq_o        <-+---------------------------+',
          '',
          '  pit_top: one job = "integrate the PIT"  (no FSMs inside)',
          '  pit_control: one job = "decide"         (no 16-bit adds)',
          '  pit_datapath: one job = "count"         (no config decode)',
        ].join('\n'),
        caption:
          'The hierarchy mirrors the module-02 partition: the top level is glue and instances, leaves own the logic. Each module\'s job states in one sentence without "and".',
      },
    ],
    tables: [
      {
        caption: 'The course naming convention (declared here, used everywhere)',
        headers: ['Suffix / name', 'Meaning', 'Example'],
        rows: [
          ['clk', 'The clock. Appears only in sensitivity lists in design code', 'always @(posedge clk ...)'],
          ['reset_n', 'Asynchronous, active-low reset', 'if (!reset_n)'],
          ['_i / _o', 'Port direction: input / output', 'data_i, sum_o'],
          ['_q', 'A register (assigned only in clocked processes)', 'count_q, st_q'],
          ['_d', 'Next-value combinational signal for a _q', 'count_d, st_d'],
          ['_n', 'Active-low anything', 'enable_n, valid_n'],
          ['_en', 'Enable', 'byte_en_i, irq_en_q'],
          ['_tick', 'Single-cycle event pulse', 'tc_tick'],
          ['_sel', 'Select / choose signal', 'mux_sel'],
          ['ST_*', 'FSM state localparams', 'ST_IDLE, ST_RUN'],
        ],
      },
      {
        caption: 'Copy-paste vs parameter vs generate vs new module',
        headers: ['Situation', 'Right tool'],
        rows: [
          ['Same module, different width or depth', 'parameter'],
          ['Same module, different reset value', 'parameter'],
          ['N identical instances of one leaf', 'generate for-loop'],
          ['Structurally different behaviour', 'a different module (never a mode parameter for identity)'],
          ['Two lines that happen to look similar', 'just write them out; do not abstract'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Inventing per-module naming schemes ("count" in one file, "cnt_reg" in the next).',
        fix:
          'Adopt one convention per project and enforce it mechanically (lint checks names). The suffix system is only worth what its consistency is worth: `count_q` is information only if every register ends in _q everywhere. When joining a team with an existing convention, the convention wins — even if you prefer yours.',
      },
      {
        mistake: 'Parameterizing behaviour ("MODE = 0 means FIFO, 1 means stack") until the module is unreadable.',
        fix:
          'Parameters are for values, not identities. A module whose behaviour branches on parameters is several modules wearing one name; split it. The reusable artifacts that survive are narrow and deep (a register with enable, a delay line), not wide configure-everything blocks.',
      },
      {
        mistake: 'Leaving magic numbers in logic (if (cnt == 12), state = 3\'d4).',
        fix:
          'Every non-obvious literal becomes a localparam with a comment: localparam CNT_PERIOD = 12; localparam ST_FLUSH = 3\'d4;. The lint rule "no bare literals wider than a bit in comparisons" keeps widths and meanings reviewable — and when the spec changes 12 to 10, there is exactly one edit.',
      },
    ],
    guidedPractice: {
      title: 'Rename and restructure a module to convention',
      brief:
        'This module works but violates the convention throughout: unexplained names (r1, r2, tmp, f), a magic number, mixed declaration/logic order, and a copy-paste instead of a parameter. Rename per the convention, restructure into the eight sections, replace the duplication, and write the header. The block: a 4-bit counter that counts up when go is high, wraps at 10 (not 16), and a second identical counter for a second channel — currently two copies.',
      starterCode: [
        'module thing(',
        '  input clk, rst, go1, go2,',
        '  output [3:0] c1, c2',
        ');',
        'reg [3:0] r1, r2;',
        'always @(posedge clk or negedge rst) begin',
        '  if (!rst) r1 = 0; else if (go1) begin',
        '    if (r1 == 10) r1 = 0; else r1 = r1 + 1; end',
        'end',
        'always @(posedge clk or negedge rst) begin',
        '  if (!rst) r2 = 0; else if (go2) begin',
        '    if (r2 == 10) r2 = 0; else r2 = r2 + 1; end',
        'end',
        'assign c1 = r1; assign c2 = r2;',
        'endmodule',
      ].join('\n'),
      expectedBehavior:
        'Fixes: active-low reset_n (port rename, if (!reset_n)); nonblocking <= in clocked blocks (both use = now — a latent simulation race); localparam WRAP = 4\'d10 with a comment ("spec: wraps at 10, not 15 — T12"); naming r1/r2 -> count_a_q, count_b_q (or one parameterized instance); go1/go2 -> go_a_i, go_b_i; c1/c2 -> count_a_o, count_b_o; duplication removed either via a parameterized leaf counter module instantiated twice, or (acceptable) one clocked process covering both channels with a comment; header added: what/interfaces/clocking/reset/spec pointer. The wrap-at-10 is a spec decision — it deserves the localparam comment so nobody "fixes" it to 15.',
      hints: [
        'Two separate rule violations (blocking assigns, reset polarity) hide under the naming problems — fix those first.',
        'The magic 10 is a spec fact: name it and cite the test that checks it.',
        'The cleanest dedup is a small leaf module instantiated twice.',
      ],
    },
    practiceExercises: [
      {
        title: 'Decode names to hardware',
        brief:
          'Using only the naming convention (no logic shown), state what kind of object each name is and where it may be assigned: tc_tick, st_d, irq_en_q, cfg_wr_i, valid_n, period_q.',
        expectedBehavior:
          'tc_tick: a single-cycle event pulse (combinational or registered — check its assignment site; likely combinational decode). st_d: next-value combinational signal for a state register (assigned only in an always @* or assign). irq_en_q: a register (assigned only in a clocked process). cfg_wr_i: an input port. valid_n: an active-low signal. period_q: a register. The point: the convention encodes assignment-site constraints, which is what makes reviews fast.',
        hints: [
          'Suffixes carry the contract; the base name carries the meaning.',
          '_d and _q pair: if you see one, look for the other.',
          '_tick implies exactly-one-cycle duration — a property a testbench can check.',
        ],
      },
      {
        title: 'Choose the reuse mechanism',
        brief:
          'For each, choose copy / parameter / generate / separate module, with one sentence of justification: (a) eight identical 8-bit status registers with individual enables; (b) a 16-bit and a 32-bit version of the same CRC block; (c) a datapath adder and a control FSM that happen to both use a 4-bit signal; (d) an SPI master and an I2C master "because they both shift bits".',
        expectedBehavior:
          '(a) generate over a parameterized register-with-enable leaf. (b) parameter WIDTH (values differ, structure identical). (c) copy/plain code — similarity of width is not a reuse relation. (d) separate modules — protocol identity differs; a mode parameter would couple two unrelated state machines. The test in every row: does the variation change values, structure, or identity?',
        hints: [
          'Values -> parameter; structure -> generate; identity -> separate modules.',
          '(c) is the trap: similar-looking is not the same as same.',
          '(a) needs a leaf module first, then a generate.',
        ],
      },
    ],
    assessment: {
      title: 'Naming, structure, reuse checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'Under the course convention, where may a signal named valid_q be assigned?',
          options: [
            'In any always block',
            'Only in a clocked process',
            'Only in a combinational process',
            'Only by continuous assign',
          ],
          answer: 'Only in a clocked process',
          explanation:
            'The _q suffix marks a register, and registers are created exclusively by clocked processes. A _q assigned combinationally is a naming-contract violation and a review finding.',
          hint: 'The suffix encodes the assignment site.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt:
            'In byte_en_regfile (WIDTH=32) with data_q = 0xAABBCCDD, byte_en_i = 4\'b0101 and data_i = 0x11223344, what does q_o read after the edge?',
          code: 'for (i = 0; i < BYTES; i = i + 1) begin\n    if (byte_en_i[i])\n        data_q[8*i +: 8] <= data_i[8*i +: 8];\nend',
          options: ['0x11223344', '0xAA33CC44', '0x11BB33DD', '0x00000000'],
          answer: '0xAA33CC44',
          explanation:
            'byte_en_i[0]=1 and [2]=1, so bytes 0 and 2 are written (0x44, 0x33); bytes 1 and 3 hold (0xBB, 0xAA). Result: 0xAA 33 CC 44.',
          hint: 'byte_en_i bit i gates byte i; unwritten bytes hold.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'A module with parameter MODE, where MODE=0 builds a FIFO and MODE=1 builds a stack, is good reuse practice.',
          answer: 'false',
          explanation:
            'Parameters are for values (widths, depths, reset values), not for identity. A behaviour-switching parameter is several modules wearing one name — each configuration needs separate verification, and readers must mentally compile both personalities to review any line.',
          hint: 'Does the parameter change a number or what the module is?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt:
            'Which habit most directly makes lint reports actionable rather than noise?',
          options: [
            'Disabling lint during development',
            'Explicit widths and sized literals everywhere, so real width/signedness issues are not buried under default-width noise',
            'Writing everything in one large file',
            'Using unsized literals to let the tool decide widths',
          ],
          answer:
            'Explicit widths and sized literals everywhere, so real width/signedness issues are not buried under default-width noise',
          explanation:
            'Lint is only useful when its remaining warnings are surprising. Conventions that prevent the predictable warnings (sized literals, explicit widths, no magic numbers) keep the report short enough that a genuine bug stands out.',
          hint: 'What fraction of a noisy report would you actually read?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt:
            'State the one-sentence test for whether a module should be split, and name the two leaf modules the PIT will be split into.',
          answer:
            'A module\'s job must be statable in one sentence without the word "and"; the PIT splits into pit_control (decide: decode, FSM, flags) and pit_datapath (count), with pit_top as integration glue',
          explanation:
            'The top level reads like the block diagram (instances and glue only); leaves own logic and are independently testable. This mirrors the module-02 partition one-for-one.',
          hint: 'The hierarchy should mirror the architecture partition.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      {
        term: 'Naming convention',
        definition:
          'The shared suffix system (_i/_o/_q/_d/_n/_en/_tick) encoding direction, storage and polarity in every name.',
      },
      {
        term: 'localparam',
        definition:
          'A module-local constant replacing magic numbers; the named form of a design fact.',
      },
      {
        term: 'generate',
        definition:
          'Verilog construct producing parameterized structural repetition (instance arrays, conditional structure).',
      },
      {
        term: 'Indexed part select (+:)',
        definition:
          'Verilog-2001 slice of fixed width at a computed offset: data[8*i +: 8].',
      },
      {
        term: 'Lint-friendly',
        definition:
          'Coding habits (explicit widths, sized literals, no dead code) that keep tool warnings meaningful.',
      },
    ],
    revisionSummary: [
      'Convention: clk, reset_n, _i/_o ports, _q registers, _d next-values, _n active-low, _en, _tick single-cycle, ST_* states.',
      'The suffix is a contract: _q only in clocked processes, _d only in combinational ones.',
      'Module structure: header, parameters, ports, localparams, declarations, clouds, clocked processes, instances — reading order is review order.',
      'Parameters for values (with documented ranges); generate for structural repetition; separate modules for different identities.',
      'Lint-friendly: explicit widths, sized literals, named unused signals, one module per file, no magic numbers.',
      'One module, one job; top levels read like block diagrams; leaves are independently testable.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Verilog',
        url: 'https://en.wikipedia.org/wiki/Verilog',
        kind: 'article',
      },
      {
        label: 'Yosys open synthesis suite documentation',
        url: 'https://yosyshq.readthedocs.io/',
        kind: 'tool',
      },
    ],
    estimatedMinutes: 45,
  },
];
