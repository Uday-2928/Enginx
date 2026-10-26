import type { TutorialLesson } from '../types';

// Module 15 — Latches & Synthesis Mistakes
export const module15Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m15-l1',
    title: 'Accidental Latches: Three Broken-and-Fixed Pairs',
    summary:
      'Watch incomplete if, incomplete case, and partially-assigned outputs each become a latch — with the synthesis interpretation and the fix side by side.',
    objectives: [
      'Explain why incomplete combinational assignments imply memory.',
      'Diagnose the three classic latch cases: missing else, missing default, partial assignment.',
      'Fix each case with defaults-first and complete branches.',
      'Spot the latch signature in synthesis reports and waveforms.',
    ],
    whyItMatters:
      'The accidental latch is the most common synthesizable-looking mistake in RTL: the code simulates plausibly, synthesis accepts it, and the hardware silently gains a level-sensitive memory element that was never specified — bringing timing havoc and sim/synth divergence. Learning to SEE the three patterns (and the defaults-first reflex that prevents all of them) is the single highest-value coding habit in this course.',
    prerequisites: ['vlog-m06-l2', 'vlog-m07-l3', 'vlog-m08-l1'],
    explanation:
      'Combinational logic has no memory: its outputs are pure functions of its CURRENT inputs. When a combinational always @* block fails to assign an output on some input path, the tool is forced to invent memory — the output must HOLD its previous value on those paths, and holding previous values is exactly what a **latch** is. Synthesis then builds a level-sensitive storage element fed by the block’s inputs: unspecified hardware, a new feedback loop, and a timing path no clock can manage. The three classic causes:\n\n**Case 1 — incomplete if.** `if (sel) y = a;` with no else: on sel=0, y is unassigned → holds → latch.\n\n**Case 2 — incomplete case.** A case whose arms do not cover all selector values and has no default: uncovered values leave outputs unassigned → latch.\n\n**Case 3 — partial assignment.** EVERY branch assigns y, but another output z is assigned only in SOME branches: z holds on the missing paths → latch on z even though y is fine. The sneakiest case: the fix is not about branches but about every output, every path.\n\nThe **defaults-first fix** covers all three: assign every output a default value at the top of the block, then let the branches override. Every path is now complete by construction; no latch can form. (The alternative — complete every branch explicitly — also works but rots as branches grow.)',
    deepDive:
      '### The synthesis interpretation, precisely\n\nGiven `always @* if (sel) y = a;`, the tool reasons: "y must equal a when sel=1; when sel=0 the code says nothing — but y is a combinational output, so it must be SOMETHING: the only behavior consistent with the code is to keep its last value". Last-value-keeping + level-sensitive trigger = D-latch with enable=sel. The waveform signature: y changes only while sel is high, freezing between — combinational data that remembers. In synthesis reports, latches appear as "inferred latch" warnings; in FPGA netlists as transparent latches (bad: no clock to time them against); the fix report says "no latch". Some tools offer full_case/parallel_case pragmas to SUPPRESS the warning — suppressing a warning is not fixing the code; this course fixes the code.\n\n### Why the latch also breaks verification\n\nThe latch creates sim/synth divergence risk: the simulator evaluates the always @* block faithfully — including holding y when no assignment fires — so simulation "works" (that is why the bug ships!). But: (1) the hardware now has a transparent-latch timing path the static timing tool cannot clock-constrain normally; (2) reset behavior is undefined — the latch powers up unknown and may never receive a reset (latches are outside the course’s reset template); (3) downstream logic samples frozen garbage after reset. Testbenches that never hold sel=0 long enough never see the freeze — another reason directed corners exist (module 14).\n\n### Latch vs register: both memory, only one wanted\n\nA latch is level-sensitive (transparent while enabled); a register is edge-sensitive. Registers come from CLOCKED always blocks — deliberate, timed, resettable. Latches come from INCOMPLETE COMBINATIONAL blocks — accidental, untimed, unreset. The rule of thumb that keeps them apart: memory belongs in clocked blocks; combinational blocks must be complete. If a design genuinely needs a latch (rare: some bus-hold, low-power cells), it is a deliberate, documented, library-level decision — never an accident in decode logic.',
    examples: [
      {
        title: 'Case 1 and Case 2: broken vs fixed, side by side',
        language: 'verilog',
        code:
          '// CASE 1: incomplete if -> latch on y\nmodule latch_case1_broken(\n    input  wire sel,\n    input  wire a,\n    input  wire b,\n    output reg  y\n);\n    // BROKEN: no else. sel=0 -> y unassigned -> holds -> LATCH.\n    always @* begin\n        if (sel) y = a;\n    end\nendmodule\n\n// CASE 1 FIXED: complete the decision.\nmodule latch_case1_fixed(\n    input  wire sel,\n    input  wire a,\n    input  wire b,\n    output reg  y\n);\n    always @* begin\n        if (sel) y = a;\n        else     y = b;      // every path assigns: pure mux\n    end\nendmodule\n\n// CASE 2: incomplete case -> latch on y for uncovered opcodes\nmodule latch_case2_broken(\n    input  wire [1:0] op,\n    input  wire [3:0] a, b,\n    output reg  [3:0] y\n);\n    // BROKEN: op=2\'b11 unassigned -> holds -> LATCH.\n    always @* begin\n        case (op)\n            2\'b00: y = a + b;\n            2\'b01: y = a - b;\n            2\'b10: y = a & b;\n        endcase\n    end\nendmodule\n\n// CASE 2 FIXED: default completes the case.\nmodule latch_case2_fixed(\n    input  wire [1:0] op,\n    input  wire [3:0] a, b,\n    output reg  [3:0] y\n);\n    always @* begin\n        y = 4\'h0;                       // default FIRST\n        case (op)\n            2\'b00:  y = a + b;\n            2\'b01:  y = a - b;\n            2\'b10:  y = a & b;\n            default: y = a | b;          // every value covered\n        endcase\n    end\nendmodule',
        explanation: [
          'Case 1 broken: on sel=0 the block assigns nothing; synthesis infers a latch with enable=sel. The fixed version is the module 08 mux — complete by construction.',
          'Case 2 broken: op=2\'b11 falls through the case with y unassigned — a latch that freezes the LAST result whenever opcode 11 appears. The fixed version defaults y first and covers everything with a default arm.',
          'The defaults-first pattern (y = 0 before the case) is belt AND braces: even a future edit that removes an arm cannot re-create the latch.',
          'Waveform signature of the broken versions: y holds its last value while sel=0 (Case 1) or op=11 (Case 2) — combinational outputs that remember.',
          'Synthesis-report signature: "inferred latch for y" — treat as an error, not a warning.',
        ],
      },
      {
        title: 'Case 3: partial assignment — the latch that hides behind a correct output',
        language: 'verilog',
        code:
          '// CASE 3: partial assignment -> y fine, z LATCHES\nmodule latch_case3_broken(\n    input  wire       en,\n    input  wire [3:0] a, b,\n    output reg  [3:0] y,\n    output reg  [3:0] z\n);\n    // BROKEN: y assigned on EVERY path; z only when en=1.\n    always @* begin\n        y = a & b;          // unconditional: y is safe\n        if (en)\n            z = a | b;      // en=0: z unassigned -> z LATCHES\n    end\nendmodule\n\n// CASE 3 FIXED: defaults cover BOTH outputs.\nmodule latch_case3_fixed(\n    input  wire       en,\n    input  wire [3:0] a, b,\n    output reg  [3:0] y,\n    output reg  [3:0] z\n);\n    always @* begin\n        y = a & b;          // defaults first: every output, every path\n        z = 4\'h0;\n        if (en)\n            z = a | b;\n    end\nendmodule',
        explanation: [
          'The trap: review focuses on y (assigned everywhere, fine) while z latches silently on the en=0 path. Partial assignment is per-OUTPUT, not per-block.',
          'Synthesis reports name the LATCHED signal (z) — read latch warnings for the NAME, not just the count.',
          'The fix assigns a default to EVERY output before branching: z = 4\'h0 first, then the conditional override.',
          'Verification: a directed corner holding en=0 across changing (a,b) exposes the broken z freezing (its value stops tracking) — the fixed version always tracks.',
          'Mental audit for every combinational block: list the outputs; confirm each has a default OR a complete branch set.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Broken vs fixed: what synthesis builds',
        content:
          '  BROKEN (incomplete if):               FIXED (complete):\n\n    sel ----+                           sel ----+--+\n            | [LATCH, enable=sel]               |   |\n    a  ----D----[Q]--- y            a ------[mux]--+- y\n                                     b ---------\'\n\n    (y freezes when sel=0)              (y tracks the selected input)\n\n  Latch anatomy: D = the assigned value, enable = the missing condition,\n  Q = the output. The tool built memory from your silence.',
        caption:
          'Silence on a path is not neutrality — the synthesizer must keep the old value, and keeping old values is a latch.',
      },
    ],
    tables: [
      {
        caption: 'The three latch causes and their fixes',
        headers: ['Case', 'Broken shape', 'What latches', 'Fix'],
        rows: [
          ['1. Incomplete if', 'if (c) y = a; (no else)', 'y, enabled by c', 'else branch (or default first)'],
          ['2. Incomplete case', 'arms missing + no default', 'y on uncovered values', 'default arm + pre-case default'],
          ['3. Partial assignment', 'z assigned in some branches only', 'z, enabled by the branch condition', 'default for EVERY output first'],
        ],
      },
      {
        caption: 'Latch vs register',
        headers: ['Aspect', 'Accidental latch', 'Deliberate register'],
        rows: [
          ['Sensitivity', 'Level (transparent while enabled)', 'Edge (captures at clock)'],
          ['Origin', 'Incomplete combinational block', 'Clocked always block'],
          ['Reset', 'None — powers up unknown', 'Course async template'],
          ['Timing', 'Untimed, unclockable path', 'Analyzed against the clock'],
          ['Verdict', 'Bug — fix the code', 'Design element'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Treating latch warnings as informational because "simulation looked right".',
        fix:
          'Simulation faithfully shows the HOLDING behavior — that is why the bug survives. Every inferred-latch warning is a code defect: find the named signal, add the default, rebuild.',
      },
      {
        mistake: 'Fixing Case 3 by assigning the latched output inside every branch — but missing a newly added branch later.',
        fix:
          'Defaults-first is edit-proof: the pre-branch default covers paths that do not exist yet. Complete-branches-only rots; defaults do not.',
      },
      {
        mistake: 'Silencing latch warnings with full_case/parallel_case pragmas.',
        fix:
          'Pragmas suppress the warning while leaving the incomplete logic — and full_case can even change behavior dangerously (it asserts coverage you did not prove). Fix the code; keep the warnings meaningful.',
      },
    ],
    guidedPractice: {
      title: 'Name the latch',
      brief:
        'For each block, state WHICH signal latches and on which condition: (1) always @* begin p = a; if (c) q = b; end; (2) always @* case (s[1:0]) 2\'b00: r = x; 2\'b01: r = y; endcase; (3) always @* begin t = a | b; if (en) begin u = t & c; v = c; end end',
      expectedBehavior:
        '(1) q latches when c=0 (p is unconditional). (2) r latches for s = 2\'b10 and 2\'b11 (uncovered arms). (3) u and v BOTH latch when en=0 (t is unconditional). In every case the fix is defaults-first for the named signals.',
      hints: [
        'Audit per OUTPUT: which outputs are assigned on which paths?',
        'Uncovered case arms = every unlisted selector value.',
      ],
    },
    practiceExercises: [
      {
        title: 'Defaults-first refactor',
        brief:
          'Refactor this to latch-free form without changing behavior: `always @* begin if (mode) y = a + b; else if (!mode && !hold) y = a - b; end` — note hold=1 with mode=0 currently "intends" to hold; decide and document the intended behavior.',
        expectedBehavior:
          'If holding was INTENTIONAL, this must be a clocked register (memory belongs in clocked blocks) — not a latch. If unintended, defaults-first: always @* begin y = 4\'h0; if (mode) y = a + b; else y = a - b; end. The exercise’s lesson: "holding" in combinational code is either a spec requirement (→ register) or a bug (→ default).',
        hints: [
          'Ask: is the hold a requirement? If yes, which clock edge captures?',
          'Combinational blocks cannot own memory — complete them or clock them.',
        ],
      },
      {
        title: 'Latch hunt in a mixed block',
        brief:
          'A priority encoder writes: `always @* begin if (in[3]) begin y = 2\'d3; v = 1; end else if (in[2]) y = 2\'d2; else if (in[1]) begin y = 2\'d1; v = 1; end else if (in[0]) begin y = 2\'d0; v = 1; end end` — find every latching signal/condition pair and rewrite defaults-first.',
        expectedBehavior:
          'v latches on every branch that does not set it (in=0100, in=0000, in=0010? — in[2] branch sets y only, no v). Precisely: v is unassigned when the in[2] branch fires (y=2) and when no input is set (y stays default-less too: y also latches on in=0000). Fix: y = 2\'d0; v = 1\'b0; defaults first, then branches that override both.',
        hints: [
          'Check BOTH outputs on EVERY branch.',
          'The in[2] branch is the sneaky one: it sets y but not v.',
        ],
      },
    ],
    assessment: {
      title: 'Module 15 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why does an unassigned output path in a combinational always block infer a latch?',
          options: [
            'The output must hold its previous value on that path — and holding previous values is latch behavior',
            'Verilog always adds memory to reg outputs',
            'Synthesis cannot build muxes',
            'It does not — the output is just 0',
          ],
          answer: 'The output must hold its previous value on that path — and holding previous values is latch behavior',
          explanation:
            'Silence on a path means "keep the old value"; level-sensitive last-value-keeping IS a latch. The tool builds memory from the incompleteness.',
          hint: 'What must the output DO on that path?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'bug-identification',
          prompt: 'Which signal(s) latch here?',
          code:
            'always @* begin\n    y = a & b;\n    if (en) begin\n        z = a | b;\n        w = a ^ b;\n    end\nend',
          options: ['z and w, when en=0', 'y only', 'all three, always', 'none — y covers the block'],
          answer: 'z and w, when en=0',
          explanation:
            'Partial assignment is per-output: y is unconditional (safe); z and w are assigned only in the en=1 branch, so both latch when en=0.',
          hint: 'Audit each output across every path.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'What is the defaults-first pattern?',
          options: [
            'Assign every output a default value before the branching, then let branches override',
            'Put default: in every case and nothing else',
            'Initialize outputs in an initial block',
            'Assign outputs in both if and else with the same value',
          ],
          answer: 'Assign every output a default value before the branching, then let branches override',
          explanation:
            'Pre-branching defaults make every path complete by construction — the edit-proof fix for all three latch causes.',
          hint: 'Where do the defaults go relative to the if/case?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'full_case synthesis pragmas are an acceptable substitute for writing complete case statements.',
          answer: 'false',
          explanation:
            'Pragmas suppress the warning (and can even change synthesis behavior based on an unproven assertion) while the code remains incomplete. Fix the code with defaults; keep warnings meaningful.',
          hint: 'Does the pragma add the missing hardware or just silence the message?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'What phrase in a synthesis report identifies this bug class (three words)?',
          answer: 'inferred latch for',
          explanation:
            'Reports say "inferred latch for <signal>" — read the SIGNAL NAME, then fix that signal’s default.',
          hint: 'The tool tells you both the element and the signal.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Accidental latch', definition: 'Level-sensitive memory synthesized from an incomplete combinational assignment; unspecified hardware.' },
      { term: 'Partial assignment', definition: 'Some outputs assigned only on some paths — the latch hides behind correctly-assigned siblings.' },
      { term: 'Defaults-first', definition: 'Assigning every output a default before branching; the edit-proof latch prevention pattern.' },
      { term: 'Inferred latch warning', definition: 'The synthesis report line naming the latched signal; always a defect in RTL code.' },
      { term: 'full_case pragma', definition: 'A tool directive asserting case coverage — suppresses warnings without fixing code; banned in this course.' },
    ],
    revisionSummary: [
      'Combinational blocks must assign every output on every path; silence = latch.',
      'Three causes: incomplete if, incomplete case, partial (per-output) assignment.',
      'Defaults-first fixes all three and survives future edits.',
      'Latch warnings name the signal — fix that signal’s default; never pragma away.',
      '"Hold" behavior in comb code is either a spec (→ clocked register) or a bug (→ default).',
    ],
    furtherReading: [
      { label: 'Yosys documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
      { label: 'Wikipedia — Latch (electronics)', url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m15-l2',
    title: 'Structural Faults: Lists, Widths, Drivers and Undriven Signals',
    summary:
      'Four more silent killers: incomplete sensitivity lists, width mismatches, multiple drivers, and undriven signals — diagnosis and prevention for each.',
    objectives: [
      'Explain (again, now with synthesis context) why incomplete lists desynchronize sim from synth.',
      'Interpret width-mismatch warnings and fix them deliberately.',
      'Diagnose multiple-driver conflicts on nets and regs.',
      'Hunt undriven signals and predict their sim vs synthesis behavior.',
    ],
    whyItMatters:
      'These four faults rarely stop compilation — they produce wrong hardware or lying simulations that pass review. They are also exactly what design reviews and lint runs exist to catch; an engineer who self-audits for them ships cleaner code and reviews others’ faster. Each fault has a precise mechanical story from this course’s earlier modules; this lesson assembles the diagnosis playbook.',
    prerequisites: ['vlog-m15-l1', 'vlog-m06-l3', 'vlog-m03-l3'],
    explanation:
      '**Incomplete sensitivity lists** (module 06-l3): synthesis ignores the list (gates react to all inputs) while simulation obeys it — the testbench lies. Prevention: always @* for combinational blocks; the two-edge template for clocked ones.\n\n**Width mismatches:** every assignment pads or truncates to the LHS width (module 03/04). A 6-bit result feeding a 4-bit wire silently drops the top bits — the carry-loss bug class. Tools warn; the discipline is treating width warnings as errors, sizing the LHS for the math (concatenation targets like {c, s}), and matching port widths at every connection.\n\n**Multiple drivers:** one signal, two writers. For regs (two always blocks) simulation gives order-dependent last-write-wins; synthesis errors or builds nonsense. For wires (two assigns or an assign plus an instance output) simulation RESOLVES the two drivers — differing values resolve to x — and synthesis errors. The rule from module 07-l2 stands: one reg, one block; one net, one continuous driver (tri-state z being the sanctioned exception at pins).\n\n**Undriven signals:** declared but never assigned. In simulation they read z (wires) or x (uninitialized regs); synthesis typically ties undriven nets to constant 0 (or optimizes them away) — so the simulation shows "hi-Z mystery" while hardware quietly computes with 0: divergence by default. Prevention: every declared signal gets exactly one driver; `` `default_nettype none `` catches the undeclared-typo cousin.',
    deepDive:
      '### The width-audit method\n\nFor each assignment, compute: RHS true width (module 04 context rules — operands AND LHS) vs LHS width. Three outcomes: equal (fine); RHS wider (truncation — must be INTENTIONAL: wrap-around specs, bit-slicing); LHS wider (padding — must be intentional: zero vs sign extension, module 03). The audit takes minutes per module and kills the entire silent-truncation bug class. In review, the question for every narrowing assignment is: "which bits are dropped, and is that the spec?" — exactly the module 04 exercise discipline.\n\n### Multi-driver forensics\n\nWhen a net shows x in simulation without a clear cause, count its drivers: in the same module (two assigns — grep the target name), across hierarchy (a port driven by both the parent and the child), or via output ports driven internally AND externally. The x appears only where the drivers DISAGREE (resolved nets), which localizes the fault: per-value x means contention intervals. For regs, the sim gives order-dependent results — the tell is "different results across simulator versions or optimization levels". Both stories end the same way: restructure to a single writer (merge blocks, priority-order conditions).\n\n### Undriven and implicit nets: the typo family\n\nTwo cousins: (1) declared-but-undriven (simulation z/x, synthesis 0) — from deleted drivers or renamed signals; (2) UNDECLARED identifiers that become implicit 1-bit nets (the module 03 default_nettype discussion) — the 8-bit signal quietly truncated to 1 bit. Both are compileable, plausible, wrong. `` `default_nettype none `` converts the second family into hard errors; the first is caught by lint rules ("signal has no driver") and by the review habit of checking every declared signal has exactly one writer.',
    examples: [
      {
        title: 'The four faults in one annotated module (broken) and its repair',
        language: 'verilog',
        code:
          '// fault_demo_broken.v — four faults, each labeled\nmodule fault_demo_broken(\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    input  wire       sel,\n    output wire [3:0] y1,     // FAULT 3: also driven below (multiple drivers)\n    output wire [3:0] y2,     // FAULT 4: never driven\n    output reg  [3:0] y3      // FAULT 2: width mismatch on assignment\n);\n    wire [5:0] wide;          // FAULT 1’s sibling: implicit-net cousin avoided here\n\n    // FAULT 1: incomplete sensitivity list (b missing).\n    always @(a or sel) begin\n        y3 = sel ? a : (b + 4\'d1);\n    end\n\n    assign y1 = a & b;        // first driver of y1\n    assign y1 = a | b;        // FAULT 3: second driver of y1\n\n    assign wide = a + b;      // 6-bit result: intentional here\n    // FAULT 2: truncating assignment (top 2 bits dropped silently):\n    always @* begin\n        y3 = wide;            // 6 -> 4 bits: UNINTENTIONAL truncation\n    end\n    // NOTE: y3 is ALSO assigned above -> see fault 3 (two blocks, one reg).\n\n    // FAULT 4: y2 declared, never driven.\n\nendmodule',
        explanation: [
          'FAULT 1: the always block reads b but the list omits it — simulation misses b-only changes; synthesis builds the full logic. Fix: always @*.',
          'FAULT 2: y3 = wide truncates 6 bits into 4 — the high bits vanish without error. Fix: size the LHS ({2\'b00, y3} is not a fix — either widen y3 or slice deliberately: y3 = wide[3:0]; with a comment).',
          'FAULT 3: y1 has TWO continuous drivers (and y3 has two writer blocks!) — simulation resolves y1 to x where a&b differs from a|b; synthesis errors. Fix: one driver per signal — pick the intended function.',
          'FAULT 4: y2 is never driven — z in simulation, tied 0 (or optimized) in synthesis. Fix: drive it or delete it.',
          'This module is deliberately broken (a teaching artifact): it is the checklist of what to grep for in review.',
        ],
      },
      {
        title: 'The repaired module with the audit comments in place',
        language: 'verilog',
        code:
          '// fault_demo_fixed.v — each fault fixed, with the audit note\nmodule fault_demo_fixed(\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    input  wire       sel,\n    output wire [3:0] y1,     // single driver below\n    output wire [3:0] y2,     // now driven\n    output reg  [3:0] y3      // single writer block; width matched\n);\n    wire [4:0] wide;          // sized for a+b+1: max 15+15+1 = 31\n\n    // Fault 1 fix: always @* (complete list, derived by the tool).\n    // Fault 3 fix: ONE writer block for y3 (merged the two).\n    always @* begin\n        if (sel) y3 = a;\n        else     y3 = wide[3:0];   // Fault 2 fix: DELIBERATE slice (comment: low 4 of a+b+1)\n    end\n\n    assign wide = a + b + 1\'b1;   // 5-bit context: carry/borrow visible\n\n    assign y1 = sel ? (a & b) : (a | b);   // one driver: mux instead of two\n    assign y2 = ~y1;                        // Fault 4 fix: driven, one driver\n\nendmodule',
        explanation: [
          'Every fault has a one-line fix and an audit comment stating the INTENT (deliberate slicing, single driver, explicit width).',
          'wide is now 5 bits because a+b+1 can reach 31 — the module 04 context-width rule applied to the intermediate itself.',
          'The y1 double-driver became a mux (one driver selecting between the two functions) — the standard restructure for "two drivers that were really a selection".',
          'y2 gets a real function (~y1) — the point is not WHAT it computes but that it is driven exactly once.',
          'The always @* with a complete if/else is latch-free (module 15-l1) AND list-correct (module 06-l3) — the patterns compose.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Multi-driver resolution in simulation',
        content:
          '  driver1: a&b = 0110\n  driver2: a|b = 1110        (same net y1)\n\n  resolved: 0110 AND/OR per bit:\n    bit3: 0 vs 1 -> conflict -> x\n    bit2: 1 vs 1 -> agree  -> 1\n    bit1: 1 vs 1 -> agree  -> 1\n    bit0: 0 vs 0 -> agree  -> 0\n\n  y1 = x110   (x appears exactly where drivers disagree)',
        caption:
          'Resolved nets show x only where drivers fight — the localization clue for multi-driver forensics.',
      },
    ],
    tables: [
      {
        caption: 'The four structural faults: behavior and fix',
        headers: ['Fault', 'Simulation shows', 'Synthesis builds', 'Fix'],
        rows: [
          ['Incomplete sensitivity list', 'Misses unlisted-input changes', 'Full logic (list ignored)', 'always @* (comb); two-edge template (clocked)'],
          ['Width mismatch', 'Truncated/padded values', 'Same truncation/padding', 'Size LHS for the math; make slices deliberate'],
          ['Multiple drivers', 'x where drivers disagree (nets); order-dependent (regs)', 'Error or broken logic', 'One writer: merge blocks or mux'],
          ['Undriven signal', 'z (net) / x (reg)', 'Constant 0 or optimized away', 'Drive it or delete it'],
        ],
      },
      {
        caption: 'Self-audit checklist per module',
        headers: ['Check', 'Tool/habit'],
        rows: [
          ['Every comb block uses @*', 'Review + lint'],
          ['Every width change intentional', 'Width warnings as errors + comments at slices'],
          ['One writer per signal', 'Grep target names; count writers'],
          ['Every declared signal driven', 'Lint "no driver" rules; delete dead signals'],
          ['No implicit nets', '`default_nettype none'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Ignoring width-mismatch warnings because "it still works in simulation".',
        fix:
          'The truncation is real in both sim and synthesis — it "works" only when dropped bits never mattered yet. Treat every width warning as a defect until proven intentional (with a comment at the slice).',
      },
      {
        mistake: 'Resolving a two-driver conflict by making one driver conditional (adding an enable).',
        fix:
          'A conditional second driver is still a second driver. Restructure to ONE driver: merge the logic into a mux or a single always block with priority.',
      },
      {
        mistake: 'Leaving an unused output declared "in case we need it later".',
        fix:
          'Undriven outputs silently become constants (or float as z into the parent). Declare only what you drive; version control remembers deleted signals better than dead declarations do.',
      },
    ],
    guidedPractice: {
      title: 'Fault audit',
      brief:
        'Audit this module for all four fault classes: `module m(input wire [3:0] x, input wire e, output wire [2:0] o1, output reg [3:0] o2); assign o1 = x; always @(x) o2 = e ? (x + 1) : o2; endmodule` — list each fault, its sim/synthesis symptom, and the fix.',
      expectedBehavior:
        'Faults: (1) incomplete list (e missing) — sim misses e changes. (2) width mismatch: x (4 bits) truncates into o1 (3 bits) — top bit lost. (3) o2 holds when e=0 (o2 = o2) — a latch-style hold in a comb block (Case 1/3 hybrid: the else assigns o2 to itself, which is still a hold → latch). (4) No multiple-driver or undriven faults here. Fixes: always @*; o1 = x[2:0] with a comment (or widen o1); decide hold semantics (register if intended, else default).',
      hints: [
        'o2 = o2 is a hold — is memory intended here?',
        'x into a 3-bit output: which bit dies?',
      ],
    },
    practiceExercises: [
      {
        title: 'Driver census',
        brief:
          'For a net w driven by: instance U1’s output port, an assign, and nothing else — plus a reg r written in blocks B1 and B2 — state the exact sim behavior of each and the synthesis verdict for each.',
        expectedBehavior:
          'w: two continuous drivers (instance output + assign) — simulation resolves (x where they disagree); synthesis: multiple-driver error. r: two procedural writers — simulation last-write-wins per step (order-dependent); synthesis: error. Both fixed by single-writer restructuring: mux the two sources into one assign; merge B1/B2 with priority conditions.',
        hints: [
          'Nets resolve; regs race.',
          'Synthesis rejects both patterns outright.',
        ],
      },
      {
        title: 'Width audit worksheet',
        brief:
          'Audit and annotate: (1) wire [4:0] s; assign s = a + b; (a,b 4-bit); (2) wire [3:0] t = {a, b}; (3) assign c = a[1:0] * b[1:0]; with c 3 bits. Which are correct, which truncate, which need widening?',
        expectedBehavior:
          '(1) Correct: 4-bit+4-bit needs 5 bits; s is 5 bits. (2) TRUNCATES: the concatenation is 8 bits into 4 — keeps a only (top 4 bits). Deliberate? comment it; likely a bug (want t = b? or a wider t). (3) 2x2 multiply needs 4 bits; c (3 bits) truncates the top bit — widen to [3:0].',
        hints: [
          'Compute the RHS true width first (module 04 rules).',
          'Concatenation width = sum of parts.',
        ],
      },
    ],
    assessment: {
      title: 'Module 15 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'With an incomplete sensitivity list, which tool is "wrong" relative to real hardware?',
          options: [
            'The simulator — it obeys the list and misses changes the hardware would see',
            'The synthesizer',
            'Both',
            'Neither — they agree',
          ],
          answer: 'The simulator — it obeys the list and misses changes the hardware would see',
          explanation:
            'Synthesis ignores lists (gates react to all inputs); the simulator honors them literally — so the SIMULATION diverges from the hardware the code synthesizes to.',
          hint: 'Which tool is forced to obey the @(...) literally?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'wire [2:0] o1; assign o1 = 4\'b1010; What does o1 hold?',
          code: 'wire [2:0] o1;\nassign o1 = 4\'b1010;',
          options: ["3'b010", "3'b101", "3'b111", "3'b000"],
          answer: "3'b010",
          explanation:
            'The 4-bit value truncates to the 3-bit LHS, keeping the LOW bits: 010. The top bit (1) is silently dropped.',
          hint: 'Truncation keeps the least-significant bits.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'A net shows x only during certain input combinations. Most likely cause?',
          options: [
            'Two drivers disagreeing exactly during those combinations',
            'An incomplete sensitivity list',
            'An undriven signal',
            'A width mismatch',
          ],
          answer: 'Two drivers disagreeing exactly during those combinations',
          explanation:
            'Resolved multi-driver nets produce x where driver values differ; undriven nets are permanently z; lists cause stale (not x) values.',
          hint: 'Where do the two drivers’ values differ?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'An undriven wire reads z in simulation but typically becomes a constant 0 in synthesized hardware.',
          answer: 'true',
          explanation:
            'No driver = high impedance in the model; synthesis ties undriven nets to 0 (or optimizes them away) — a sim/synth divergence class of its own.',
          hint: 'Does real silicon have "nothing" on a net?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Which compiler directive (with backtick) makes undeclared identifiers a compile error instead of implicit 1-bit nets?',
          answer: '`default_nettype none',
          explanation:
            'It disables implicit net creation — the typo-that-becomes-a-1-bit-wire bug becomes a hard error at compile time.',
          hint: 'It controls the DEFAULT net type.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Width audit', definition: 'Checking RHS true width against LHS for every assignment; truncation/padding must be intentional.' },
      { term: 'Multiple drivers', definition: 'Two writers on one signal: x-resolution (nets) or races (regs); synthesis error.' },
      { term: 'Undriven signal', definition: 'Declared but never assigned: z/x in simulation, constant-0 (or removed) in hardware.' },
      { term: 'Driver census', definition: 'Counting writers per signal — the multi-driver prevention habit.' },
      { term: 'default_nettype none', definition: 'Directive making undeclared identifiers hard errors; kills the implicit-net bug family.' },
    ],
    revisionSummary: [
      'Incomplete lists: the simulator lies; always @* and the two-edge template.',
      'Width warnings are defects until annotated intentional; audit RHS-true-width vs LHS.',
      'One writer per signal: merge blocks (regs) or mux (nets); tri-state is the only sanctioned multi-driver.',
      'Undriven signals: z/x in sim, 0 in hardware — drive or delete.',
      '`default_nettype none catches the implicit-net cousin at compile time.',
    ],
    furtherReading: [
      { label: 'Yosys documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m15-l3',
    title: 'Feedback Loops, Reset Mistakes and the Sim/Synth Gap',
    summary:
      'Close the trap catalog: combinational feedback loops, reset misuse, unsynthesizable constructs, and the complete simulation-synthesis mismatch checklist.',
    objectives: [
      'Diagnose combinational feedback loops (including the latch-through-broken-mux form).',
      'Identify reset mistakes: mixing styles, resetting datapath unnecessarily, missing reset edge in the list.',
      'Apply the unsynthesizable-constructs checklist.',
      'Enumerate the causes of simulation-synthesis mismatch and their preventions.',
    ],
    whyItMatters:
      'This lesson completes the fault catalog a working RTL engineer carries in their head. Feedback loops and reset mistakes are the two categories that produce chips which "simulated fine" and fail in the lab; the unsynthesizable-constructs list is the line between code that describes hardware and code that only describes simulation. Mastering this module means your designs arrive at synthesis clean and your simulations mean what they say.',
    prerequisites: ['vlog-m15-l1', 'vlog-m15-l2', 'vlog-m09-l1'],
    explanation:
      '**Combinational feedback loops** occur when a combinational path feeds itself: `assign y = en ? a : y;` — y on both sides. The simulator may hang or produce stale values; synthesis builds a loop with no stable truth table (a latch-like structure with ZERO enable control — worse than a latch: unpredictable). The "broken mux" form is the common one: someone tries to make a mux hold its value. The fixes: if holding is required, use a clocked register (the hold is then edge-timed and resettable); if not, complete the mux with a real else-value.\n\n**Reset mistakes:** (1) mixing sync and async resets across a design — release sequencing becomes unmanageable (module 09-l1); (2) resetting everything — big datapaths (multipliers, long pipelines) may not need reset at all (their first valid data flushes them), and reset nets on huge fanouts are timing nightmares; reset CONTROL and STATUS logic, not raw datapath registers, is the guideline; (3) polarity/list mismatches (module 09-l1’s hybrid) — the wrong edge in the sensitivity list; (4) no reset on state that NEEDS it (FSM state registers) — the machine starts in an unknown state.\n\n**Unsynthesizable constructs** (the checklist below): anything that schedules time, talks to the console/filesystem, or depends on simulator services. A design file containing any of them is a verification artifact misplaced.\n\n**Simulation-synthesis mismatch causes**, consolidated: incomplete sensitivity lists; x-optimism (simulations resolve x more favorably than gates do); initial-value reliance (simulators can seed regs; silicon cannot — ASIC); delay-based "racing" tricks; unsynthesizable constructs silently dropped; multiple drivers resolved differently; latch inference behaving differently under X-injection. Each has a prevention rule taught in this course — the checklist is the summary.',
    deepDive:
      '### x-optimism and x-pessimism, honestly stated\n\nSimulation resolves unknowns with algebraic rules (0 AND x = 0: "optimistic" — it assumes the best). Real gates resolve unknown VOLTAGES physically: an x in simulation often means the hardware would be some DEFINITE but unknowable value. The mismatch class: designs whose x-behavior looks benign in sim but maps to wrong-but-defined hardware. The defenses: reset all state (no x at the start), avoid ===-based design logic, and treat x in RTL waveforms as "unverified", not "probably fine". (The mirror error, x-pessimism — gate-level sims propagating x further than reality — belongs to netlist simulation, a next-course topic.)\n\n### Reset strategy in one paragraph\n\nOne style per design (course: async assert, active-low). Reset what NEEDS it: control/state (FSMs, counters, valid bits, mode registers); datapath registers may skip reset when their consumers are valid-gated (module 09-l3’s valid discipline) — saving reset-tree fanout. Never reset BRAM contents (module 12: block RAM has no resettable reads — init is a different mechanism). Release cleanly (synchronizers are the next-course topic; note it honestly). Test BOTH reset edges in the suite (module 14-l3).\n\n### The final trap catalog (course capstone checklist)\n\nLatches (module 15-l1), structural faults (15-l2), loops/resets (this lesson), plus the sim-only leaks (#, initial, $display in design files), implicit nets, and blocking-in-clocked misuse (module 07). The combined checklist is the pre-synthesis review script: run it on every module before commit — it is literally what senior reviewers do.',
    examples: [
      {
        title: 'Combinational feedback: broken mux-hold and its two honest fixes',
        language: 'verilog',
        code:
          '// loop_broken.v — the "mux that holds" anti-pattern\nmodule loop_broken(\n    input  wire       en,\n    input  wire [3:0] a,\n    output wire [3:0] y\n);\n    // BROKEN: y feeds itself. en=1 -> y=a; en=0 -> y=y (hold attempt).\n    assign y = en ? a : y;\nendmodule\n\n// FIX A: holding is a REGISTER\'s job (clocked, resettable).\nmodule loop_fixA(\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire       en,\n    input  wire [3:0] a,\n    output reg  [3:0] y\n);\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) y <= 4\'h0;\n        else if (en)  y <= a;      // hold via enable mux (module 09-l2)\n    end\nendmodule\n\n// FIX B: no hold intended — complete the mux with a real value.\nmodule loop_fixB(\n    input  wire       en,\n    input  wire [3:0] a,\n    input  wire [3:0] idle_val,\n    output wire [3:0] y\n);\n    assign y = en ? a : idle_val;   // every path defined: no loop, no latch\nendmodule',
        explanation: [
          'The broken form: y = en ? a : y has y in its own combinational cone. Simulation: the value may persist (simulator artifact) or oscillate; synthesis: an uncontrolled loop — no truth table, no timing.',
          'FIX A recognizes the INTENT (hold) and gives it to a register: edge-timed, async-reset, enable-mux hold — the module 09-l2 pattern. This is the honest home of "memory".',
          'FIX B recognizes NO hold was intended: the else path gets a real value (idle_val or 0). Pure combinational, complete, loop-free.',
          'The diagnosis question: "did I mean to remember?" — yes → clocked block; no → complete the mux. There is no third answer.',
          'Feedback can hide across hierarchy too (module A’s output into module B, back into A) — the review question generalizes: does any combinational path return to its own start?',
        ],
      },
      {
        title: 'Reset mistakes: three broken forms and the template',
        language: 'verilog',
        code:
          '// reset_broken.v — three misuse forms, labeled\nmodule reset_broken(\n    input  wire       clk,\n    input  wire       arst_n,     // intended async reset\n    input  wire       srst_n,     // a second, sync reset (MIXED STYLES)\n    input  wire [3:0] d,\n    output reg  [3:0] q1,\n    output reg  [3:0] q2\n);\n    // (1) MIXED STYLES: two resets, different mechanisms, one design.\n    always @(posedge clk or negedge arst_n)\n        if (!arst_n) q1 <= 4\'h0;\n        else if (!srst_n) q1 <= 4\'h0;    // sync flavor bolted on\n        else          q1 <= d;\n\n    // (2) WRONG EDGE in the list (module 09-l1’s hybrid bug):\n    always @(posedge clk or posedge arst_n)   // posedge of an ACTIVE-LOW line!\n        if (!arst_n) q2 <= 4\'h0;\n        else         q2 <= d;\n\nendmodule\n\n// reset_fixed.v — ONE style, correct template, datapath note\nmodule reset_fixed(\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire [3:0] d,\n    output reg  [3:0] q\n);\n    // Course template: async active-low, reset arm first.\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) q <= 4\'h0;\n        else          q <= d;\n    end\n    // DATAPATH NOTE: wide pipelines may skip reset entirely (valid-gated\n    // consumers); control/state (FSMs, counters, valids) always reset.\nendmodule',
        explanation: [
          'Mistake (1): two reset mechanisms in one block/design make release sequencing and DFT unmanageable — one style, one reset tree.',
          'Mistake (2): posedge on an active-low line triggers the reset at the WRONG transition (the release, not the assert) — polarity/list mismatch, the silent reset bug.',
          'The fixed module is the course template verbatim — five lines that pattern-match to the correct flop cell.',
          'The datapath note is the honest scope: not every register needs reset; control state always does. Reset fanout is a real timing resource.',
          'Both broken forms SIMULATE plausibly — these are review-and-report catches, not simulation catches.',
        ],
      },
      {
        title: 'The unsynthesizable-constructs checklist, embodied',
        language: 'verilog',
        code:
          '// unsynth_demo.v — a design file that MUST NOT synthesize (and why)\nmodule unsynth_demo(\n    input  wire clk,\n    input  wire go,\n    output reg  [7:0] acc\n);\n    initial begin                 // (1) initial: sim-only (ASIC truth)\n        acc = 8\'h00;\n    end\n\n    always @(posedge clk) begin\n        if (go)\n            acc <= acc + #2 8\'d1;  // (2) intra-assignment delay: sim-only\n    end\n\n    // (3) system tasks in design code: sim-only\n    // always @(posedge clk) $display("acc=%d", acc);\n\n    // (4) file I/O, $random, waits, fork/join: all sim-only (not shown)\nendmodule',
        explanation: [
          '(1) initial seeds a DESIGN register: ASIC truth is unknown-at-power-up; FPGA tools may accept it (labeled vendor-specific) — portable RTL uses reset.',
          '(2) #2 inside the clocked assignment schedules a delayed update — meaningful only to the simulator; synthesis drops it and the hardware differs from the sim.',
          '(3) $display in design code: console output has no gate equivalent. The comment MARKS the line instead of including it actively.',
          'The checklist to enforce on design files: no initial, no #, no $tasks, no waits/fork, no event controls beyond the two-edge template, no casex, no X assignments in logic.',
          'The testbench may use ALL of these — the boundary is the FILE’s role, not the language.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Simulation-synthesis mismatch: causes and preventions',
        content:
          '  CAUSE                                PREVENTION (course rule)\n  ---------------------------------    --------------------------------\n  Incomplete sensitivity list          always @* / two-edge template\n  x-optimism (sim resolves x kindly)   reset all state; no X logic\n  Initial-value reliance               reset template, not initial\n  Delay-based racing                   zero-delay RTL; sim-only delays\n  Unsynthesizable constructs leaked    design-file checklist (no #,$,initial)\n  Multiple drivers resolved differently one-writer rule\n  Latch inference (X-sensitive hold)   defaults-first completeness',
        caption:
          'Every mismatch cause has a course rule that prevents it — the checklist IS the summary of modules 06-15.',
      },
    ],
    tables: [
      {
        caption: 'Unsynthesizable constructs checklist (design files)',
        headers: ['Construct', 'Why it cannot build', 'Where it belongs'],
        rows: [
          ['# delays (any form)', 'Time scheduling has no gate', 'Testbench only'],
          ['initial blocks', 'Nothing "runs once" in silicon (ASIC)', 'Testbench; labeled FPGA-init exception'],
          ['$display/$monitor/$finish/$random', 'Simulator services', 'Testbench only'],
          ['$readmemh in ASIC-targeted RTL', 'No file system in silicon', 'Sim; FPGA-init per vendor (labeled)'],
          ['wait / fork / join / disable', 'No procedural concurrency in gates', 'Testbench only'],
          ['casex', 'x-matching is not a gate function', 'Nowhere (use casez)'],
        ],
      },
      {
        caption: 'Reset discipline summary',
        headers: ['Rule', 'Statement'],
        rows: [
          ['One style', 'Async active-low course-wide; never mix'],
          ['Reset control/state', 'FSMs, counters, valids, mode registers'],
          ['Datapath may skip', 'Valid-gated pipelines can flush naturally'],
          ['Polarity matches list', 'negedge reset_n ⇔ if (!reset_n)'],
          ['Both edges tested', 'Startup AND mid-operation (module 14-l3)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Building a "self-holding mux" with assign y = en ? a : y;.',
        fix:
          'That is a combinational feedback loop, not a hold. If hold is intended, use a clocked enable register; otherwise complete the mux with a real value.',
      },
      {
        mistake: 'Bolting a second reset (sync) onto blocks that already have the async one "for safety".',
        fix:
          'Two resets = unmanageable release sequencing and DFT chaos. One style, one tree. Safety comes from testing both edges (module 14-l3), not from doubling mechanisms.',
      },
      {
        mistake: 'Assuming simulation x-values predict hardware behavior.',
        fix:
          'x is "the model cannot answer", not "probably zero". Reset all state so x never exists, and treat any remaining x as unverified behavior.',
      },
    ],
    guidedPractice: {
      title: 'The capstone fault hunt',
      brief:
        'Audit this module and list EVERY fault with its class: `module z(input clk, input rst, input [2:0] s, output reg [3:0] f); always @(posedge clk or posedge rst) begin if (!rst) f <= 0; else case (s) 0: f = 1; 1: f = f + 1; endcase #1 f = f; end endmodule` — then rewrite it clean.',
      expectedBehavior:
        'Faults: (1) reset polarity/list mismatch — posedge rst in the list but !rst tested in the body (module 09-l1/15-l3); (2) incomplete case in a CLOCKED block — f simply holds for s=2..7 (that is register hold behavior, NOT a latch — latches only come from combinational blocks) but it is an undocumented policy: add a default or comment the hold intent; (3) #1 delay inside design code (unsynthesizable); (4) blocking assignments in a clocked block (module 07 rule 2); (5) the trailing `#1 f = f;` — a second, delayed, self-copying write that exists only in simulation. Clean rewrite: always @(posedge clk or negedge rst_n) begin if (!rst_n) f <= 4\'d0; else case (s) 3\'d0: f <= 4\'d1; 3\'d1: f <= f + 4\'d1; default: f <= 4\'d0; endcase end — nonblocking, default arm, matching polarity, no delays.',
      hints: [
        'Run the full catalog: reset polarity, case completeness (hold policy in clocked blocks), sim-only constructs, assignment style.',
        'Count the faults before reading the answer — there are five.',
      ],
    },
    practiceExercises: [
      {
        title: 'Loop or register?',
        brief:
          'A teammate writes `always @* if (ld) sum = in; else sum = sum;` intending a hold. Classify the fault, then produce BOTH fixes (register version and completed-mux version) and state which fits a spec saying "sum updates on ld, otherwise freezes".',
        expectedBehavior:
          'The else sum = sum is a hold in a combinational block — latch/loop-class fault. Register fix: always @(posedge clk or negedge reset_n) if (!reset_n) sum <= 0; else if (ld) sum <= in;. The spec says FREEZE → the register version is the correct home for that behavior.',
        hints: [
          'Freeze semantics = memory = clocked block.',
          'The completed-mux version (else sum = idle) only fits specs where the "hold" value is a real defined value.',
        ],
      },
      {
        title: 'Mismatch autopsy',
        brief:
          'A design simulated correctly for months, then failed on hardware: the FSM sometimes woke in a garbage state. The RTL used an initial block to set state = IDLE and had no reset. Explain the failure and write the fix.',
        expectedBehavior:
          'The initial block seeded state ONLY in simulation (FPGA configs may honor it; ASIC silicon never does): the hardware woke with state = undefined, and without a reset path the case default (if any) was the only recovery — possibly none. Fix: state register under the async active-low reset template (reset to IDLE), remove the initial seed, and add reset verification to the suite (module 14-l3).',
        hints: [
          'Which world honors initial?',
          'What hardware mechanism was missing?',
        ],
      },
    ],
    assessment: {
      title: 'Module 15 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'bug-identification',
          prompt: 'What is fundamentally wrong with `assign y = en ? a : y;`?',
          code: 'assign y = en ? a : y;',
          options: [
            'Combinational feedback: y is in its own logic cone — an uncontrolled loop, not a hold',
            'Nothing — this is the standard enable pattern',
            'The conditional operator cannot reference wires',
            'It infers a clocked register',
          ],
          answer: 'Combinational feedback: y is in its own logic cone — an uncontrolled loop, not a hold',
          explanation:
            'Holding is register behavior. This builds a zero-control combinational loop (worse than a latch). Fix A: clocked enable register. Fix B: complete the mux with a real value.',
          hint: 'Trace the loop: what feeds y?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which registers may legitimately SKIP reset in a well-designed chip?',
          options: [
            'Datapath pipeline registers whose consumers are valid-gated',
            'FSM state registers',
            'Counter registers',
            'Pipeline valid bits',
          ],
          answer: 'Datapath pipeline registers whose consumers are valid-gated',
          explanation:
            'Control/state (FSMs, counters, valids) must reset — they define "what the machine is doing". Raw datapath registers can flush naturally when valid gating hides stale slots.',
          hint: 'Which registers define the machine’s control state?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Which construct in a DESIGN file is guaranteed to cause sim/synth divergence?',
          options: [
            'An intra-assignment delay (#2) inside a clocked block',
            'A case statement with a default',
            'Nonblocking assignments in a clocked block',
            'A generate-for with parameter bounds',
          ],
          answer: 'An intra-assignment delay (#2) inside a clocked block',
          explanation:
            'Delays schedule simulation events with no hardware meaning — synthesis drops them, hardware diverges from sim. The other three are fully synthesizable.',
          hint: 'What does a gate know about time units?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'Simulation resolving 0 AND x to 0 is "optimistic" — real hardware could behave differently for unknown voltages.',
          answer: 'true',
          explanation:
            'x-optimism: the simulator’s algebra assumes favorable resolution; physical unknowns resolve to definite-but-unpredictable values. Reset-all-state prevents x from ever existing.',
          hint: 'Can silicon hold a real "unknown"?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the two worlds whose different treatment of initial blocks causes the "wake up in garbage state" failure (simulation and ... ).',
          answer: 'simulation and silicon',
          explanation:
            'Simulators execute initial blocks; silicon (ASIC truth) powers up unknown and needs a real reset path. FPGA configuration loading initial values is the labeled vendor exception.',
          hint: 'One world runs code; one world powers up.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Combinational feedback loop', definition: 'A combinational path feeding itself — no truth table, no timing; fixed by register or completed mux.' },
      { term: 'Reset discipline', definition: 'One style per design; reset control/state, valid-gated datapath may skip; test both edges.' },
      { term: 'x-optimism', definition: 'Simulation resolving unknowns favorably (0 AND x = 0) where hardware is unpredictable.' },
      { term: 'Unsynthesizable construct', definition: 'A simulator-service feature (#, initial, $tasks, waits) with no hardware meaning.' },
      { term: 'Mismatch checklist', definition: 'The consolidated list of sim/synth divergence causes, each with its course prevention rule.' },
    ],
    revisionSummary: [
      'Feedback loops: y = en ? a : y is never a hold — register it or complete it.',
      'One reset style per design; reset control/state; datapath may flush via valid gating.',
      'Design files contain zero sim-only constructs: no #, initial, $tasks, waits, casex.',
      'Every sim/synth mismatch cause maps to a course rule — the checklist is the course in one page.',
      'x in a waveform means unverified, not benign.',
    ],
    furtherReading: [
      { label: 'Yosys documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
      { label: 'Wikipedia — Logic synthesis', url: 'https://en.wikipedia.org/wiki/Logic_synthesis', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
