import type { TutorialLesson } from '../types';

// Module 07 — Blocking vs Nonblocking
export const module07Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m07-l1',
    title: 'Scheduling Semantics: = Now, <= At the End of the Step',
    summary:
      'Open the simulator’s engine room: how blocking and nonblocking assignments are scheduled, and why the difference decides correctness.',
    objectives: [
      'State what blocking (=) does immediately and what nonblocking (<=) schedules.',
      'Describe the NBA (nonblocking assignment) update region of a simulation time step.',
      'Predict $display values interleaved with = and <= in a single block.',
      'Explain why the two operators exist rather than one.',
    ],
    whyItMatters:
      'Blocking vs nonblocking is the most consequential two-symbol distinction in Verilog. Engineers who only memorize "use <= in clocked blocks" cannot diagnose the race conditions that follow; engineers who understand the scheduling regions can predict ANY simulation outcome by hand. This lesson builds that predictive ability — the module’s next two lessons apply it to the classic shift-register and swap bugs.',
    prerequisites: ['vlog-m06-l1', 'vlog-m06-l3'],
    explanation:
      'Both operators live inside procedural blocks, and the difference is WHEN the left-hand side actually changes:\n\n**Blocking assignment `=`**: evaluate the right-hand side and update the left-hand side IMMEDIATELY, before the next statement runs. It "blocks" the rest of the block until done — like ordinary software assignment. `a = 1; b = a;` leaves b = 1 with b seeing the NEW a.\n\n**Nonblocking assignment `<=`**: evaluate the right-hand side NOW, but schedule the left-hand-side UPDATE for the end of the current time step — the **NBA region**. `a <= 1; b <= a;` evaluates both right-hand sides against the OLD a: b gets the old a, and a changes only after every statement in the time step has been evaluated. All register transfers in a clocked system happen this way: at a clock edge, every flop simultaneously samples its input as it exists BEFORE the edge.\n\nThe simulator implements this with a **stratified event queue** per time step: active events (current statement execution, blocking updates) run first; then the **NBA region** applies all scheduled nonblocking updates; then $monitor-type observation. This layering is why a `<=` chain in one block behaves like parallel flops, and why `$display` placed between two `<=` statements still prints the OLD value — the updates have not landed yet.',
    deepDive:
      '### Walking one time step by hand\n\nAt a clock edge, a block containing `q1 <= d; q2 <= q1;` executes as: (1) evaluate RHS d (current value), schedule q1 = d_value; (2) evaluate RHS q1 — STILL THE OLD q1, because the update has not happened — schedule q2 = old_q1; (3) statements exhausted, the NBA region fires: q1 and q2 update together. Net effect: every register sampled its pre-edge input — exactly how edge-triggered flops behave in silicon. The language deliberately models physics: a real flop’s output cannot change until after the edge, and no flop can "see" another flop’s same-edge output.\n\n### Why two operators at all\n\nIf `=` were the only assignment, describing simultaneous register transfers would require the user to manually save old values into temporaries (and to reason about statement order — pure software thinking). The `<=` operator encodes "sample all inputs at the edge, update all outputs after" in one symbol, matching hardware semantics. Conversely, combinational always blocks WANT software-like immediate sequencing (compute intermediate, then combine), which is `=`. The two operators exist because the two hardware domains — registers and combinational logic — have genuinely different update semantics. (Deep language note: `<=` is also the less-than-or-equal operator; Verilog disambiguates by context — in an expression it compares, as an assignment it schedules.)\n\n### Reading $display interleavings\n\nWithin one initial block: `a = 0; a = 1; $display(...)` prints a=1 (blocking, immediate). `a = 0; a <= 1; $display(...)` prints a=0 — the display runs in the active region, the scheduled update has not fired; after a `#1` (any time advance), a reads 1. No mystery once the regions are visible: **displays see pre-NBA values; time advances flush the NBA queue.**',
    examples: [
      {
        title: 'One block, both operators: a fully predictable trace',
        language: 'verilog',
        code:
          '// schedule_demo.v — sim-only; every printed value is derivable\n`timescale 1ns/1ps\nmodule schedule_demo;\n    reg [1:0] a;\n    reg [1:0] b;\n\n    initial begin\n        // --- blocking: updates land immediately ---\n        a = 2\'d1;\n        $display("1: a=%0d (blocking, immediate)", a);   // a=1\n\n        // --- nonblocking: update scheduled, not applied ---\n        a <= 2\'d2;\n        $display("2: a=%0d (NBA update has NOT fired)", a);  // a=1 still\n\n        #1;   // time advances -> NBA region applies -> a becomes 2\n        $display("3: a=%0d (after time step)", a);           // a=2\n\n        // --- nonblocking samples OLD values across statements ---\n        b = 2\'d7;\n        a <= b + 2\'d1;    // RHS evaluated NOW: b=7 -> schedules a=0 (mod 4)\n        b <= a;           // RHS evaluated NOW: a is STILL 2 -> b<=2\n        #1;\n        $display("4: a=%0d b=%0d (both updated together)", a, b);\n        // a=0 (7+1=8, mod 4 = 0), b=2\n\n        $finish;\n    end\nendmodule',
        explanation: [
          'Line 1: `a = 2\'d1` updates immediately — the display sees a=1.',
          'Line 2: `a <= 2\'d2` only SCHEDULES the update; the very next display still reads a=1. This is the NBA region at work.',
          'After `#1`, time advances, the scheduled update applies, and a reads 2.',
          'Line 4: both right-hand sides are evaluated BEFORE either update lands: a <= b+1 samples b=7 (schedules a = 8 mod 4 = 0); b <= a samples the OLD a=2. After the step: a=0, b=2 — a simultaneous, old-value-based register transfer.',
          'Every printed value here is deterministic: single block, explicit ordering, known scheduling. Trace them yourself before believing the comments.',
        ],
      },
      {
        title: 'The stratified event queue, drawn and applied',
        language: 'verilog',
        code:
          '// queue_demo.v — why displays between two <= print old values\n`timescale 1ns/1ps\nmodule queue_demo;\n    reg x, y;\n\n    initial begin\n        x = 1\'b0; y = 1\'b0;\n        #5;                      // time 5: edge of interest\n        x <= 1\'b1;               // schedule x=1 (NBA)\n        $display("t=%0t x=%b", $time, x);   // prints x=0 (pre-NBA)\n        y <= x;                  // RHS x is STILL 0 -> y gets 0\n        #1;\n        $display("t=%0t x=%b y=%b", $time, x, y);  // x=1, y=0\n        $finish;\n    end\nendmodule',
        explanation: [
          'Time-step picture at t=5: ACTIVE region runs the statements (scheduling x=1, printing x=0, scheduling y=old_x=0); then the NBA region applies x=1; no statement runs after that in this step.',
          'First display: x=0 — the update is pending, not applied. This is not a glitch; it is the definition of nonblocking.',
          'y <= x evaluated x BEFORE the update, so y receives 0 — the pre-edge value. After #1: x=1, y=0. Hand-traceable, every time.',
          'If you need to OBSERVE post-update values in the same time step, $strobe (prints in the monitor region, after NBA) exists — but the simple course pattern is: wait a time step, then display.',
          'This file is sim-only throughout; nothing in it would synthesize.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'One clock edge: blocking vs nonblocking view (educational waveform, illustrative)',
        content:
          '  clk        ___|▔▔▔|___|▔▔▔|___\n                  ^ edge n\n\n  d          ____|▔▔▔▔▔▔▔▔▔|___\n\n  NONBLOCKING (correct flop model):\n  q <= d:    _____|▔▔▔▔▔▔▔▔|____   q samples PRE-edge d at edge n,\n                                changes just AFTER the edge (NBA)\n\n  BLOCKING misuse in one clocked block:\n  q = d; then r = q;  ->  r gets the NEW q at the SAME edge\n  (r behaves like combinational-from-q instead of a second flop)\n\n  NBA region: all <= updates land together AFTER statement execution,\n  BEFORE the next time step. Every register sees pre-edge values.',
        caption:
          'educational waveform (illustrative): nonblocking updates model real flops — simultaneous, post-edge, sampled from pre-edge values.',
      },
    ],
    tables: [
      {
        caption: 'Blocking vs nonblocking at a glance',
        headers: ['Property', 'Blocking (=)', 'Nonblocking (<=)'],
        rows: [
          ['RHS evaluation', 'Now, statement by statement', 'Now, all at block entry to the statement'],
          ['LHS update', 'Immediately, before next statement', 'Scheduled to NBA region (end of time step)'],
          ['Later statements see', 'The NEW value', 'The OLD value'],
          ['Models', 'Sequenced combinational computation', 'Simultaneous register transfers'],
          ['Course home', 'Combinational always @* blocks', 'Clocked always @(posedge...) blocks'],
        ],
      },
      {
        caption: 'The schedule_demo trace (deterministic)',
        headers: ['Step', 'Statement', 'Region', 'Effect'],
        rows: [
          ['1', 'a = 1; $display', 'active', 'a=1, prints a=1'],
          ['2', 'a <= 2; $display', 'active then NBA', 'schedules a=2; prints a=1'],
          ['3', '#1', 'time advance', 'NBA applies: a=2'],
          ['4', 'b=7; a<=b+1; b<=a; #1', 'active, NBA, advance', 'a samples b=7 → 0; b samples old a=2 → 2'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Expecting $display right after a <= to show the new value.',
        fix:
          'Nonblocking updates land in the NBA region after the block finishes executing. Display after a time step (#1), or use $strobe if you must observe post-update values in the same step.',
      },
      {
        mistake: 'Assuming <= means "less than or equal" everywhere.',
        fix:
          'In an expression context it is the comparison; as an assignment operator it schedules. Verilog separates the two by grammar position. When reading dense code, check whether <= sits between expressions (compare) or after a variable (assignment).',
      },
      {
        mistake: 'Mixing = and <= in one block "wherever convenient".',
        fix:
          'Mixing hides which values are old and which are new — the recipe for order-dependent races. Course rule (module 07-l3 gives the reasons): = in combinational always @* blocks, <= in clocked always blocks, never mixed.',
      },
    ],
    guidedPractice: {
      title: 'Hand-schedule a time step',
      brief:
        'Given regs q=1, d=0 and the block `always @(posedge clk) begin q <= d; d_check = q; end` (d_check is a reg written with =): list what each RHS evaluates to, what the NBA region applies, and what a $display placed immediately after the block’s last statement (same time step) would print for q and d_check.',
      expectedBehavior:
        'q <= d evaluates d=0 → schedules q=0. d_check = q evaluates q=1 (OLD value — the update has not fired) and applies immediately → d_check=1. NBA applies q=0. The same-step display prints q=1 (pre-NBA) and d_check=1. Note d_check in a clocked block with = is exactly the misuse lesson 2 dissects.',
      hints: [
        'Blocking updates apply inside the active region; nonblocking wait for NBA.',
        'A display in the active region cannot see NBA results.',
      ],
    },
    practiceExercises: [
      {
        title: 'Predict the three prints',
        brief:
          'Write down the three $display outputs of: `initial begin r = 3; r <= 5; $display("%0d", r); r = 7; $display("%0d", r); #1; $display("%0d", r); end` — then check each against the scheduling rules.',
        expectedBehavior:
          'Prints 3, then 7, then 5. Print 1: the scheduled update (r<=5) has not fired, r still reads 3. Print 2: the blocking r = 7 applied immediately, so r reads 7. But the scheduled NBA update r=5 was never cancelled: at the END of the same time step the NBA region applies r=5, OVERWRITING the blocking 7 — so after #1, print 3 shows 5. Lesson: an NBA update is the last writer of its time step, even against later blocking writes.',
        hints: [
          'Active region first (all = updates and both displays), NBA last.',
          'A scheduled NBA update still fires at the end of the step — it is the final writer of that step.',
        ],
      },
      {
        title: 'Explain the operator to a reviewer',
        brief:
          'In two sentences each, justify to a code reviewer: (1) why clocked blocks need <= rather than =; (2) why combinational blocks want = rather than <=.',
        expectedBehavior:
          '(1) All flops must sample their inputs as they existed BEFORE the edge and update simultaneously after it — <= evaluates all RHS against old values and updates together, matching silicon. (2) Combinational logic is a chain of immediate dependencies — intermediate results must be visible to the next statement (software-like sequencing), which is =; scheduling them would require artificial delay to propagate.',
        hints: [
          'Think "simultaneous sampling" vs "sequenced computation".',
          'Each domain mimics different physics.',
        ],
      },
    ],
    assessment: {
      title: 'Module 07 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'When does a nonblocking assignment (<=) actually update its left-hand side?',
          options: [
            'At the end of the current time step, in the NBA region',
            'Immediately, before the next statement',
            'One clock cycle later',
            'Only when the simulator is stopped',
          ],
          answer: 'At the end of the current time step, in the NBA region',
          explanation:
            '<= evaluates the RHS immediately but schedules the LHS update for the NBA region — after all active-region statements in the time step have run.',
          hint: 'The N in NBA is "nonblocking"; the updates land at the step’s end.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does the second $display print?',
          code:
            'a = 2\'d1;\na <= 2\'d2;\n$display("%0d", a);   // print #1\n#1;\n$display("%0d", a);   // print #2',
          options: ['2', '1', 'x', '0'],
          answer: '2',
          explanation:
            'Print #1 shows 1 (the NBA update has not fired). After #1 the update has applied, so print #2 shows 2.',
          hint: 'Time advance flushes the scheduled updates.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In `b <= a;` executed at a clock edge, b receives the value a had BEFORE the edge’s updates.',
          answer: 'true',
          explanation:
            'All right-hand sides of nonblocking assignments in the step are evaluated against pre-update (pre-edge) values; updates land together afterward. This is precisely the flop-sampling model.',
          hint: 'Flops sample pre-edge inputs.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Which assignment style models "all registers update simultaneously at the clock edge"?',
          options: ['Nonblocking <=', 'Blocking =', 'Continuous assign', 'Either, with enough #delays'],
          answer: 'Nonblocking <=',
          explanation:
            '<= samples all inputs at the edge and applies all updates together at the end of the step — simultaneous register transfer. Blocking assignments sequence one at a time within the block.',
          hint: 'Simultaneity is the whole point of the NBA region.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the simulation region (three-letter abbreviation) where scheduled nonblocking updates are applied.',
          answer: 'NBA',
          explanation:
            'The nonblocking assignment update region runs after the active region within each time step, applying all scheduled <= updates together.',
          hint: 'It is named after the assignment itself.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Blocking assignment (=)', definition: 'Evaluate and update immediately; the statement "blocks" until done.' },
      { term: 'Nonblocking assignment (<=)', definition: 'Evaluate now, schedule the update for the NBA region at the end of the time step.' },
      { term: 'NBA region', definition: 'The part of a simulation time step where scheduled nonblocking updates are applied together.' },
      { term: 'Stratified event queue', definition: 'The simulator’s ordered regions within a time step: active, inactive, NBA, monitor.' },
      { term: '$strobe', definition: 'A display variant that runs after the NBA region, seeing post-update values in the same step.' },
    ],
    revisionSummary: [
      '= updates now and blocks; <= schedules the update for the end of the time step (NBA).',
      'All <= right-hand sides see pre-update values — the flop-sampling model of hardware.',
      'Displays in the active region print pre-NBA values; advance time (or $strobe) to see updates.',
      'The two operators exist because registers (simultaneous sampling) and combinational chains (sequenced computation) have different physics.',
      'Predict any single-block trace by walking regions: active statements → NBA updates → next step.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m07-l2',
    title: 'Races, Swaps and Shift Registers: <= vs = in Action',
    summary:
      'Watch blocking assignments create order-dependent races between blocks and broken shift registers within blocks — and fix every case with nonblocking.',
    objectives: [
      'Explain the two-block swap race and why its outcome is simulator-dependent.',
      'Trace a blocking shift register that collapses to one stage.',
      'Show that nonblocking chains shift correctly and swaps cleanly.',
      'State the multiple-driver hazard of writing one reg from two blocks.',
    ],
    whyItMatters:
      'These two examples — the swap and the shift register — are THE canonical demonstrations that assignment style is not a style preference but a correctness decision. Every interview loop for RTL roles includes a variant of them. Once you can trace both races by hand, the course methodology of lesson 3 stops being a rule to memorize and becomes the only sane choice.',
    prerequisites: ['vlog-m07-l1', 'vlog-m06-l1'],
    explanation:
      '**The two-block swap.** Two always blocks, both triggered by the same clock edge, one assigning x from y and the other y from x. With blocking assignments, the outcome depends on the ORDER the simulator happens to run the two blocks — an order the standard does not define. If block 1 runs first: x = y (x gets old y), then y = x (y gets the just-updated x = old y) — both end as old y, old x is lost. If block 2 runs first, both end as old x. Same code, different runs of the SAME simulator can differ: a **race condition**. With nonblocking assignments, both right-hand sides sample pre-edge values and both updates land together: a clean simultaneous swap, every run.\n\n**The collapsing shift register.** In ONE clocked block, the blocking chain `q1 = d; q2 = q1; q3 = q2;` executes top to bottom within the same edge: q2 receives the NEW q1 (which is d), q3 receives the new q2 (also d) — all three stages load d at the same edge. The "3-stage shift register" shifts by one, not three. The nonblocking chain `q1 <= d; q2 <= q1; q3 <= q2;` samples all pre-edge values: after edge n, q1 = pre-d? no — q1 = d as of edge n, q2 = q1 as it was BEFORE edge n, q3 = q2 before edge n: a genuine 3-cycle delay line.\n\n**One reg, two blocks.** A subtler race: two blocks assign DIFFERENT logic to the SAME reg (e.g. one block does `cnt <= cnt + 1` on clk, another does `cnt <= 0` on reset). In simulation the blocks run in arbitrary order each step — "last write wins" per step, sometimes the increment, sometimes the clear. Synthesis, by contrast, sees two drivers and errors (or builds broken logic). One reg, one always block: always.',
    deepDive:
      '### Why the standard leaves block order undefined\n\nVerilog models concurrent hardware; two always blocks at the same edge are two flops clocked at once, and physical flops have no "order". Any order-dependence in the language would let a design simulate correctly in one tool and fail in another (or across versions, or with optimization changes). The standard therefore says: between blocks, execution order at the same simulation time is indeterminate. The engineering conclusion is absolute — inter-block value dependencies at the same edge must survive ANY order, and only nonblocking sampling provides that.\n\n### The blocking shift register that "works" for the wrong reason\n\nThe blocking chain produces q1 = q2 = q3 = d after each edge — which LOOKS like a shift register if you only ever load it once! The bug appears on the second distinct value: with d changing d0 → d1 → d2, all three stages always show the CURRENT d; nothing is delayed. Regression tests that only inject one value and check one stage pass; the part ships broken. The nonblocking version shows q1 = d0, then q1 = d1 and q2 = d0, etc. — the delay line you specified. Trace both on paper until the difference is visceral.\n\n### Multiple drivers: sim and synthesis disagree again\n\nFor a reg assigned in two clocked blocks, simulation produces order-dependent "last write wins" per step — nondeterministic-looking results. Synthesis does not even get that far: two drivers on one register is an error (or, for wire-type nets, resolution to x when drivers disagree). Either way the design is unsound. The fix is structural, not cosmetic: merge the logic into ONE block (priority-order the conditions inside it) or restructure so each reg has exactly one writer.',
    examples: [
      {
        title: 'The swap: blocking race vs nonblocking determinism',
        language: 'verilog',
        code:
          '// swap_race.v — SIM-ONLY demonstration of order dependence\n`timescale 1ns/1ps\nmodule swap_race;\n    reg clk;\n    reg [3:0] x = 4\'d1, y = 4\'d9;   // power-up seed (sim-only convenience)\n\n    always #5 clk = ~clk;\n\n    // BLOCKING version: two blocks, same edge, ORDER UNDEFINED.\n    always @(posedge clk) begin\n        x = y;\n    end\n    always @(posedge clk) begin\n        y = x;\n    end\n\n    initial begin\n        #10;   // one clock edge has passed\n        $display("blocking result: x=%0d y=%0d", x, y);\n        // Run-order dependent: (9,9) if x-block ran first, (1,1) if y-block did.\n        $finish;\n    end\nendmodule\n\n// swap_fixed.v — the nonblocking swap: deterministic\nmodule swap_fixed(\n    input  wire       clk,\n    input  wire       reset_n,\n    output reg  [3:0] x,\n    output reg  [3:0] y\n);\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            x <= 4\'d1;\n            y <= 4\'d9;\n        end else begin\n            x <= y;    // both sample PRE-edge values\n            y <= x;    // -> clean simultaneous swap, every run\n        end\n    end\nendmodule',
        explanation: [
          'Blocking two-block version: whichever block executes first overwrites its variable, so the second block reads the NEW value. (9,9) and (1,1) are both reachable outcomes — the standard does not fix block order. This is the definition of a simulation race.',
          'Nonblocking fix: x <= y and y <= x both sample the pre-edge values (1 and 9), then update together — x=9, y=1 after the edge, deterministically.',
          'The fixed module follows course style: clocked always with async active-low reset, all assignments nonblocking.',
          'Moral: when two same-edge blocks exchange values, only <= is correct; = encodes an order that hardware does not have.',
          'The race module is sim-only by nature (seeds, delays, display); the fixed module is portable RTL.',
        ],
      },
      {
        title: 'The shift register that collapses — and the correct delay line',
        language: 'verilog',
        code:
          '// shift_broken.v — blocking chain in one clocked block\nmodule shift_broken(\n    input  wire       clk,\n    input  wire       d,\n    output reg        q1, q2, q3\n);\n    always @(posedge clk) begin\n        q1 = d;     // q1 updated NOW\n        q2 = q1;    // reads the NEW q1 (= d)!\n        q3 = q2;    // reads the NEW q2 (= d)!\n    end\nendmodule\n// Result: q1 = q2 = q3 = d after EVERY edge. All three stages\n// show the current input — the register collapsed to ONE stage.\n\n// shift_fixed.v — nonblocking chain: a real 3-stage delay line\nmodule shift_fixed(\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire       d,\n    output reg        q1, q2, q3\n);\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            q1 <= 1\'b0;\n            q2 <= 1\'b0;\n            q3 <= 1\'b0;\n        end else begin\n            q1 <= d;    // samples pre-edge d\n            q2 <= q1;   // samples PRE-edge q1 (one cycle older)\n            q3 <= q2;   // samples PRE-edge q2 (two cycles older)\n        end\n    end\nendmodule',
        explanation: [
          'Broken: blocking assignments execute in order within the same edge — q2 = q1 reads q1 AFTER it was overwritten with d. All three flops load d simultaneously: the chain is gone. With a d sequence 1,0,1,1..., all outputs simply follow d.',
          'Fixed: each RHS samples its pre-edge value. Feed d = 1,0,1,1 with q\'s starting at 0: after edge1: q1=1,q2=0,q3=0; edge2: q1=0,q2=1,q3=0; edge3: q1=1,q2=0,q3=1; edge4: q1=1,q2=1,q3=0 — the input pattern walks down the line one stage per clock. A true shift register.',
          'The one-stage collapse is dangerous precisely because a single-value test cannot catch it — the outputs match d, which "looks like" shifting once. Multi-value regression exposes it.',
          'Both modules use the same interface; only the assignment operators differ. Same flops exist in synthesis for BOTH? No — for the broken version synthesis builds q2 = d and q3 = d combinationally (or errors on the style); the point: the CODE does not describe what the author intended.',
          'This is the canonical argument for the course rule: nonblocking in every clocked block.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Shift register: blocking collapse vs nonblocking delay line (educational waveform, illustrative)',
        content:
          '  edge:        n1    n2    n3    n4\n  d:           1     0     1     1\n\n  FIXED (nonblocking): input walks down the line\n  q1:          1     0     1     1\n  q2:          0     1     0     1     (q1 delayed by 1 clk)\n  q3:          0     0     1     0     (q2 delayed by 1 clk)\n\n  BROKEN (blocking in one block): all stages collapse to d\n  q1:          1     0     1     1\n  q2:          1     0     1     1   <- no delay: equals d\n  q3:          1     0     1     1   <- no delay: equals d',
        caption:
          'educational waveform (illustrative): with nonblocking, each stage is one clock older; with blocking, the chain vanishes and every stage shows the input.',
      },
    ],
    tables: [
      {
        caption: 'Swap outcomes at one clock edge',
        headers: ['Style', 'Block order', 'x after edge', 'y after edge', 'Verdict'],
        rows: [
          ['blocking', 'x-block first', 'old y (9)', 'old y (9)', 'old x lost'],
          ['blocking', 'y-block first', 'old x (1)', 'old x (1)', 'old y lost'],
          ['nonblocking', 'any order', 'old y (9)', 'old x (1)', 'clean swap'],
        ],
      },
      {
        caption: 'Shift register stage values after edge n2 (d sequence 1,0,...)',
        headers: ['Stage', 'nonblocking (fixed)', 'blocking (broken)'],
        rows: [
          ['q1', '0 (current d)', '0 (current d)'],
          ['q2', '1 (q1 from edge n1)', '0 (copies new q1 = d)'],
          ['q3', '0 (q2 from edge n1)', '0 (copies new q2 = d)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using blocking assignments for register chains "because it reads top-to-bottom logically".',
        fix:
          'Top-to-bottom reading is exactly the bug: later statements see earlier updates, collapsing stages. Registers transfer simultaneously — write <= in clocked blocks so every RHS samples pre-edge values.',
      },
      {
        mistake: 'Writing the same reg from two always blocks (e.g. increment in one, clear in another).',
        fix:
          'One reg, one block. Merge the conditions into a single clocked block with explicit priority (reset first, then enable, then increment) — module 10’s counters show the pattern.',
      },
      {
        mistake: 'Trusting a single-value test to validate a shift register.',
        fix:
          'Inject a CHANGING sequence and verify each stage is delayed by its exact number of clocks. A collapsed chain is invisible to one-value tests because every stage trivially equals the input.',
      },
    ],
    guidedPractice: {
      title: 'Trace both shift registers',
      brief:
        'For d = 1,1,0,1 (four clock edges) with all q starting 0, tabulate q1, q2, q3 after each edge for BOTH shift_fixed and shift_broken. Circle the first edge where the two implementations differ.',
      expectedBehavior:
        'FIXED: e1: 1,0,0; e2: 1,1,0; e3: 0,1,1; e4: 1,0,1. BROKEN: e1: 1,1,1; e2: 1,1,1; e3: 0,0,0; e4: 1,1,1. They differ from the very FIRST edge (q2: fixed 0 vs broken 1) — the collapse is immediate, not gradual.',
      hints: [
        'Fixed: each stage takes the previous stage’s PRE-edge value.',
        'Broken: every stage equals the current d after each edge.',
      ],
    },
    practiceExercises: [
      {
        title: 'Three-block race triangle',
        brief:
          'Extend the swap to three blocks with blocking assignments: b1: a = b; b2: b = c; b3: c = a; (all at posedge clk, a=1,b=2,c=3 initially). List the possible outcome sets and explain why no outcome is a clean rotation.',
        expectedBehavior:
          'Depending on execution order, values overwrite in chains: e.g. b1 first: a=2; b2: b=3; b3: c=a=2 → (2,3,2). Other orders give different duplicates — in every outcome at least one original value is destroyed by an intervening overwrite; a clean rotation (2,3,1) or (3,1,2) never occurs. With <= in all three blocks the rotation is exact and deterministic.',
        hints: [
          'Each blocking statement sees whatever the earlier-executed blocks already wrote.',
          'Nonblocking samples all pre-edge values first — rotation preserved.',
        ],
      },
      {
        title: 'Merge the drivers',
        brief:
          'Two engineers wrote: block A: `always @(posedge clk) if (inc) cnt <= cnt + 1;` and block B: `always @(posedge clk) if (clr) cnt <= 0;` on the same cnt. Rewrite as ONE block with correct priority (clear beats increment), course style with async active-low reset.',
        expectedBehavior:
          'always @(posedge clk or negedge reset_n) begin\n  if (!reset_n)      cnt <= 0;\n  else if (clr)      cnt <= 0;\n  else if (inc)      cnt <= cnt + 1;\nend — one writer for cnt; reset outranks clear which outranks increment. (Priority order is a spec decision; document it.)',
        hints: [
          'One reg, one always block.',
          'Order the if/else chain by the required priority.',
        ],
      },
    ],
    assessment: {
      title: 'Module 07 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Two always blocks at the same clock edge exchange values with BLOCKING assignments. What is guaranteed?',
          options: [
            'Nothing — the result depends on undefined block execution order (a race)',
            'A clean swap always occurs',
            'Both variables receive the older value',
            'Synthesis refuses to compile it',
          ],
          answer: 'Nothing — the result depends on undefined block execution order (a race)',
          explanation:
            'With =, whichever block runs first overwrites its variable before the second reads it; the standard does not define inter-block order at the same time step. Different runs can yield different results.',
          hint: 'Is there any defined order between two always blocks?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'In shift_fixed (nonblocking), with d=1 at edge n1 and d=0 at edge n2, what is q2 after edge n2 (all q start 0)?',
          code:
            'always @(posedge clk) begin\n    q1 <= d;\n    q2 <= q1;\n    q3 <= q2;\nend\n// d: n1=1, n2=0; q1=q2=q3=0 initially',
          options: ['1', '0', 'x', 'undefined'],
          answer: '1',
          explanation:
            'Edge n1: q1 samples d=1 → q1=1. Edge n2: q2 samples the pre-edge q1 (=1) → q2=1. One clock of delay, exactly as designed.',
          hint: 'Each stage takes the previous stage’s value from BEFORE the edge.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'bug-identification',
          prompt: 'What is wrong with this clocked block?',
          code:
            'always @(posedge clk) begin\n    s1 = d;\n    s2 = s1;\n    s3 = s2;\nend',
          options: [
            'Blocking assignments collapse the chain: all stages load d at the same edge instead of shifting',
            'The sensitivity list is incomplete',
            'Missing reset — this cannot simulate',
            'Nothing is wrong; this is a proper 3-stage shift register',
          ],
          answer: 'Blocking assignments collapse the chain: all stages load d at the same edge instead of shifting',
          explanation:
            'Each blocking statement sees the previous statement’s update, so s2 and s3 receive the NEW s1/s2 (= d). The register chain degenerates to one stage of delay. The fix is nonblocking assignments.',
          hint: 'What value does s2 = s1 read — the old s1 or the just-written s1?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'Assigning the same reg from two different always blocks is acceptable if the conditions making each write are mutually exclusive.',
          answer: 'false',
          explanation:
            'Even with exclusive conditions, simulation executes the blocks in undefined order (last-write-wins per step) and synthesis sees two drivers — an error or broken logic. Merge into one block with priority-ordered conditions.',
          hint: 'Who decides the order between the two blocks?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Which assignment operator (one symbol pair) makes a two-variable swap within a single clocked block behave as a simultaneous exchange?',
          answer: '<=',
          explanation:
            'Nonblocking assignments sample both pre-edge values and update together — the swap is exact. With = the second statement would read the first’s fresh value and destroy one of the originals.',
          hint: 'The scheduling operator.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Race condition', definition: 'Behavior depending on undefined simulation execution order (e.g. inter-block blocking exchanges).' },
      { term: 'Register chain collapse', definition: 'Blocking assignments in a clocked block making all chained stages capture the same value at one edge.' },
      { term: 'Delay line', definition: 'A chain of registers each one clock older than the previous — the correct nonblocking shift register.' },
      { term: 'Multiple drivers', definition: 'Two procedural blocks (or assigns) writing one signal: last-write-wins in simulation, error in synthesis.' },
      { term: 'Simultaneous transfer', definition: 'All registers sampling pre-edge inputs and updating together — modeled by nonblocking assignment.' },
    ],
    revisionSummary: [
      'Two blocks exchanging with = race; with <= they swap deterministically.',
      'Blocking chains in one clocked block collapse: q2 = q1 reads the NEW q1.',
      'Nonblocking chains are true delay lines: each stage one clock older.',
      'One reg, one always block — merge drivers with priority-ordered if/else.',
      'Test shift registers with CHANGING input sequences; a single value hides the collapse.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
      { label: 'Wikipedia — Race condition', url: 'https://en.wikipedia.org/wiki/Race_condition', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m07-l3',
    title: 'The Methodology: Why = for Comb, <= for Clocked',
    summary:
      'Derive the industry-standard assignment rules from the scheduling semantics, and codify the one-block-per-reg discipline.',
    objectives: [
      'Justify blocking assignment in combinational always @* blocks from the semantics.',
      'Justify nonblocking assignment in clocked blocks from flop physics.',
      'Apply the complete rule list (including never-mix and one-block-per-reg).',
      'Recognize the waveform signature of each misuse.',
    ],
    whyItMatters:
      'This lesson converts everything from lessons 1 and 2 into a defensible engineering methodology — the one used across the industry. In code review, "why did you use <= here?" must have a physics-based answer, not "the style guide says so". Teams that internalize the WHY write designs that simulate identically in every tool and synthesize into the hardware they drew.',
    prerequisites: ['vlog-m07-l1', 'vlog-m07-l2'],
    explanation:
      'The complete course methodology, now derived:\n\n**Rule 1 — blocking (=) in combinational always @* blocks.** Combinational logic is a dependency chain: compute an intermediate, then use it. Blocking assignment IS that semantics — statement 2 sees statement 1’s result immediately. With <= in a comb block, every RHS would sample stale values and the outputs would lag one "delta step" behind, requiring artificial structure to propagate; it also misleads readers into expecting registered behavior. (It can be made to work with careful coding, but it buys nothing and risks everything.)\n\n**Rule 2 — nonblocking (<=) in clocked always blocks.** A bank of flops all samples its inputs as they were before the edge and updates together after it. Nonblocking assignment IS that semantics — every RHS samples pre-edge values, every update lands in the NBA region together. With =, statement order fabricates a fake "wiring order" between flops that does not exist in silicon (lesson 2’s collapses and races).\n\n**Rule 3 — never mix = and <= in one block.** Mixing makes value freshness depend on statement order in ways neither pure semantics predicts; review becomes guesswork and races hide in the seams.\n\n**Rule 4 — one reg, one always block.** Two writers to one reg race in simulation and error in synthesis (lesson 2).\n\n**Rule 5 — design regs never rely on initial values; reset them.** initial-based power-up is FPGA-specific; async active-low reset (course template) is portable.',
    deepDive:
      '### The falsifiable test for any clocked block\n\nTo check a clocked block, ask: "if all right-hand sides were sampled ONE EDGE EARLIER, would the hardware be the same?" For a correct nonblocking block, yes — that is what sampling means. For a blocking block, no: the answer depends on statement order, i.e. on software artifacts. Another useful review question: "could I reorder the statements in this block and change behavior?" A correct clocked block is order-insensitive under <=; a blocking block is order-SENSITIVE by construction — the smell of a latent race.\n\n### Where confusion still legitimately arises\n\nLatch-free combinational always blocks pre-assign defaults, then override — all blocking. Some engineers write clocked blocks that compute an intermediate combinationally THEN register it, tempted to mix = (for the intermediate) with <= (for the register). The clean alternatives, in order of preference: (1) split into two blocks — an always @* computing the intermediate (blocking) and an always @(posedge clk) registering it (nonblocking); (2) if the intermediate is small, inline it into the <= right-hand side. Both keep every block internally uniform — the property that makes the rules enforceable.\n\n### The waveform signatures of misuse\n\nDiagnostic patterns worth memorizing from waveforms: (1) a "shift register" whose stages all show the same value as the input → blocking collapse; (2) outputs that change half a delta before the clock edge in some tools → blocking in clocked blocks racing the stimulus; (3) a signal that only updates when an UNRELATED signal toggles → missing sensitivity entry (module 06); (4) a reg that "remembers" its value when a select goes inactive → accidental latch (module 15). Each signature maps to exactly one coding mistake — waveform forensics, not guesswork.',
    examples: [
      {
        title: 'The same datapath three ways: which obeys the rules?',
        language: 'verilog',
        code:
          '// Style A (CORRECT): two uniform blocks — comb computes, clocked registers.\nmodule acc_good(\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire       en,\n    input  wire [7:0] din,\n    output reg  [7:0] total\n);\n    reg [7:0] next;\n\n    always @* begin                  // combinational: blocking\n        next = total + din;\n    end\n\n    always @(posedge clk or negedge reset_n) begin   // clocked: nonblocking\n        if (!reset_n) total <= 8\'d0;\n        else if (en)  total <= next;\n    end\nendmodule\n\n// Style B (LEGAL BUT SMELLY): mixing = and <= in one block.\nmodule acc_mixed(\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire       en,\n    input  wire [7:0] din,\n    output reg  [7:0] total\n);\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n)\n            total <= 8\'d0;\n        else if (en) begin\n            total = total + din;   // blocking inside a clocked block\n            total <= total;        // redundant re-assignment: confusion\n        end\n    end\nendmodule',
        explanation: [
          'Style A: the combinational block (next = total + din) uses =, uniform; the clocked block uses <=, uniform. next is a real wire between a comb cloud and a flop bank — reviewable, order-insensitive, portable.',
          'Trace A: en=1, din=5, total=2 → next=7; at the edge total samples pre-edge total (2) + din → 7. Clean accumulate-per-enable.',
          'Style B "works" here only by accident: the blocking write computes total+ din, then the nonblocking write re-schedules the same value. Two writers to total in one block — an order-dependent construction that defies review.',
          'The reviewer question for B: "which assignment wins?" has no principled answer — that is the disqualifying smell.',
          'Course verdict: write Style A. Two small uniform blocks beat one clever mixed one, every time.',
        ],
      },
      {
        title: 'The order-insensitivity check, demonstrated',
        language: 'verilog',
        code:
          '// order_check.v — clocked block under <= : reorder statements, same result\n`timescale 1ns/1ps\nmodule order_check;\n    reg clk;\n    reg [1:0] a = 2\'d1, b = 2\'d2, na, nb;  // seeds are sim-only\n\n    always #5 clk = ~clk;\n\n    // Version 1: original order.\n    always @(posedge clk) begin\n        na <= b;\n        nb <= a;\n    end\n\n    // Version 2 (commented): reordered — identical behavior.\n    // always @(posedge clk) begin\n    //     nb <= a;\n    //     na <= b;\n    // end\n\n    initial begin\n        #10;\n        $display("after one edge: na=%0d nb=%0d", na, nb);  // 2, 1\n        $finish;\n    end\nendmodule',
        explanation: [
          'Under <=, statement order inside the block is irrelevant: both RHS values are sampled before any update. Version 1 and the commented Version 2 produce identical results (na=2, nb=1).',
          'This order-insensitivity is the reviewable property: a clocked block whose meaning survives reordering describes real parallel flops; one that does not, describes software.',
          'Run the same experiment with = and the two orders give different outcomes — the race from lesson 2, now as a controlled experiment.',
          'The seeds (a=1, b=2 in the declarations) are a sim-only convenience; real design regs get reset (Rule 5).',
          'Expected print: after one edge: na=2 nb=1 — deterministic under nonblocking.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The two-block datapath shape (Style A) as hardware',
        content:
          '             +----------------+        +------------------+\n   din ----->|  COMB CLOUD    | next   |   FLOP BANK      |----> total\n   total ----|  total + din   |------->|  @(posedge clk)  |\n             |  (always @*, =)|        |  (always, <=)    |\n             +----------------+        +------------------+\n                       ^    clk --------------> ^\n                       |                        |\n                reset_n ----------------------> (async clear)\n\n   Comb block answers: what is the NEXT value?   (blocking =)\n   Clocked block answers: WHEN does it move?      (nonblocking <=)',
        caption:
          'Split comb-compute from clocked-capture: each block uniform in style, each answering one question. The standard datapath shape for the rest of the course.',
      },
    ],
    tables: [
      {
        caption: 'The five rules of the course methodology',
        headers: ['Rule', 'Statement', 'Enforced by'],
        rows: [
          ['1', 'Blocking = in combinational always @* blocks', 'Dependency chains need immediate visibility'],
          ['2', 'Nonblocking <= in clocked always blocks', 'Flops sample pre-edge and update together'],
          ['3', 'Never mix = and <= in one block', 'Mixing hides value freshness; races hide in seams'],
          ['4', 'One reg, one always block', 'Two drivers race in sim, error in synthesis'],
          ['5', 'Reset design regs; never rely on initial', 'initial is FPGA-specific; reset is portable'],
        ],
      },
      {
        caption: 'Waveform forensics: signature to cause',
        headers: ['Waveform symptom', 'Likely cause', 'Module'],
        rows: [
          ['All shift stages equal the input', 'Blocking chain collapse', '07-l2'],
          ['Result changes if two blocks swap order', 'Inter-block blocking race', '07-l2'],
          ['Output stale until an unrelated signal moves', 'Incomplete sensitivity list', '06-l3'],
          ['Output holds value when select deasserts', 'Accidental latch', '15-l1'],
          ['Value appears before the clock edge', 'Blocking in a clocked block', '07-l1/l3'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Following the rules as slogans without being able to justify them in review.',
        fix:
          'Anchor each rule in semantics: comb = dependency chain (=), clocked = simultaneous sampling (<=). If you cannot answer "why" for a construct in your block, restructure until each block is uniform and justifiable.',
      },
      {
        mistake: 'Mixing styles in one block to "save a block" when computing-then-registering.',
        fix:
          'Split into an always @* (blocking) plus a clocked block (nonblocking) — Style A — or inline the expression into the <= RHS. Two uniform blocks are cheaper than one ambiguous one.',
      },
      {
        mistake: 'Leaving design regs unreset because "simulation seeds them anyway".',
        fix:
          'Simulation seeds are sim-only conveniences; silicon powers up unknown (except vendor-specific FPGA init). Give every state reg a reset path in the course template (async active-low), and verify the reset vector in the testbench.',
      },
    ],
    guidedPractice: {
      title: 'Review three blocks',
      brief:
        'Apply the five rules to each and give a verdict (pass / fix): (1) always @* begin t1 = a & b; y = t1 | c; end; (2) always @(posedge clk) begin q1 = d; q2 <= q1; end; (3) always @(posedge clk) begin r <= r + 1; end / separately always @(negedge reset_n) r <= 0; (i.e. r written in two blocks).',
      expectedBehavior:
        '(1) PASS — uniform blocking in a comb block, dependency chain visible. (2) FIX — mixed styles in a clocked block; make both <= (a proper 2-stage chain) or restructure. (3) FIX — r has two writer blocks (Rule 4); merge: always @(posedge clk or negedge reset_n) with if (!reset_n) r <= 0; else r <= r + 1;.',
      hints: [
        'Check uniformity first (one style per block), then single-writer, then reset.',
        'Rule 3 violations often hide as "just one blocking line" in a clocked block.',
      ],
    },
    practiceExercises: [
      {
        title: 'Rewrite to Style A',
        brief:
          'Restructure acc_mixed from Example 1 into the two-block Style A form, preserving behavior (accumulate din into total while en, async active-low reset). Then trace two clock edges with din=3, en=1 and initial total=4.',
        expectedBehavior:
          'Comb block: always @* next = total + din; Clocked: if (!reset_n) total <= 0; else if (en) total <= next;. Trace: edge 1: total samples 4+3 → 7; edge 2: total samples 7+3 → 10. Deterministic, order-insensitive, single-writer.',
        hints: [
          'Move the addition into always @*; the clocked block only decides whether to capture.',
          'Reset outranks enable in the priority chain.',
        ],
      },
      {
        title: 'Write the review verdict',
        brief:
          'A colleague submits: `always @(posedge clk) if (!rst_n) q <= 0; else begin tmp = a & b; q <= tmp | c; end` (tmp is a reg). Give a verdict with the exact rule numbers violated and the corrected Style A code.',
        expectedBehavior:
          'Violates Rule 3 (mixed = and <= in one clocked block) and skirts Rule 1 (tmp is combinational work inside a clocked block). Fix: always @* tmp = (a & b) | c; then always @(posedge clk or negedge reset_n) if (!reset_n) q <= 1\'b0; else q <= tmp; — uniform blocks, reset matches the course template (note the colleague’s block also lacks reset_n in the sensitivity list — Rule: the two-edge template).',
        hints: [
          'Combinational work belongs in always @*.',
          'The clocked block’s event control must include the reset edge.',
        ],
      },
    ],
    assessment: {
      title: 'Module 07 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why do combinational always @* blocks use blocking assignment?',
          options: [
            'Later statements must see earlier results — a dependency chain needs immediate updates',
            'Blocking assignment synthesizes to fewer gates',
            'Nonblocking is illegal in always @*',
            'It makes simulation faster',
          ],
          answer: 'Later statements must see earlier results — a dependency chain needs immediate updates',
          explanation:
            'Combinational logic is sequenced computation: intermediates must be visible to subsequent statements, which is exactly blocking semantics.',
          hint: 'What does the next statement need from the previous one?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which property lets you verify a clocked block is correctly coded?',
          options: [
            'Reordering its nonblocking statements does not change behavior',
            'It contains at least one blocking assignment for intermediates',
            'Its outputs update before the clock edge',
            'It assigns every reg in every branch',
          ],
          answer: 'Reordering its nonblocking statements does not change behavior',
          explanation:
            'Order-insensitivity under <= proves the block describes parallel flops sampling pre-edge values — the physical model. Order-sensitivity signals software-style sequencing that silicon does not have.',
          hint: 'Real flops have no statement order.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'bug-identification',
          prompt: 'Which methodology rule does this violate, and what is the risk?',
          code:
            'always @(posedge clk) begin\n    if (!reset_n) state <= IDLE;\n    else begin\n        nxt = decode(state);\n        state <= nxt;\n    end\nend',
          options: [
            'Rule 3: mixing = and <= in one clocked block — value freshness depends on statement order',
            'Rule 5: the reset value is wrong',
            'Rule 4: state has two writers',
            'No violation — this is the recommended pattern',
          ],
          answer: 'Rule 3: mixing = and <= in one clocked block — value freshness depends on statement order',
          explanation:
            'The blocking intermediate inside a clocked block mixes styles. It happens to work here (nxt is used only after its assignment), but the block is no longer uniformly reviewable; the clean form splits decode into always @* or inlines it into the <= RHS.',
          hint: 'Look at the two assignment operators inside the else branch.',
          difficulty: 'hard',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'A reg assigned in two separate always blocks can be made safe by ensuring the two conditions never overlap.',
          answer: 'false',
          explanation:
            'Exclusive conditions do not fix undefined inter-block execution order (simulation races) or the two-driver problem (synthesis). Merge into a single block with priority-ordered conditions.',
          hint: 'Module 07-l2’s multiple-driver rule.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'In one sentence: what question does the clocked always block answer, and what operator embodies it?',
          answer: 'when the value moves — nonblocking <=',
          explanation:
            'The comb block computes the next value (what); the clocked block decides when it is captured (when), using nonblocking assignment for simultaneous, pre-edge sampling.',
          hint: 'Style A: what vs when.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Methodology rules', definition: 'The five course rules: = in comb, <= in clocked, never mix, one writer per reg, always reset.' },
      { term: 'Order-insensitivity', definition: 'The property that reordering nonblocking statements in a clocked block leaves behavior unchanged — proof of correct flop modeling.' },
      { term: 'Style A (two-block)', definition: 'Comb always @* computing next values + clocked always capturing them; uniform styles per block.' },
      { term: 'Waveform forensics', definition: 'Diagnosing coding mistakes from characteristic simulation waveform patterns.' },
      { term: 'Uniform block', definition: 'A procedural block using exactly one assignment style, so its semantics are reviewable in one glance.' },
    ],
    revisionSummary: [
      'Rule 1: = in always @* — dependency chains need immediate visibility.',
      'Rule 2: <= in clocked blocks — simultaneous pre-edge sampling, post-edge update.',
      'Rule 3: never mix styles in one block; Rule 4: one writer per reg; Rule 5: reset all state.',
      'Order-insensitivity is the reviewable proof a clocked block is correct.',
      'Compute-then-register: split into two uniform blocks (Style A) instead of mixing.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 40,
  },
];
