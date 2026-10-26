import type { TutorialLesson } from '../types';

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'dver-m03-l1',
    title: 'Functional Coverage: Bins for Features and Edge Cases',
    summary:
      'Turn the verification plan into measurable bins so every run reports which features and corners were actually exercised — concept plus a labeled SystemVerilog sketch.',
    objectives: [
      'Explain what functional coverage measures and why it is plan-driven, not tool-automatic.',
      'Design bins for features and edge cases from plan rows (accepted, rejected, corner, interaction).',
      'Read the mapping from plan item to coverpoint bin and identify a missing or extra bin in review.',
      'State the honest limit: a hit means exercised, and checking still belongs to the scoreboards.',
    ],
    whyItMatters:
      'The verification plan says WHAT must be exercised; functional coverage measures WHETHER it was. Without it, "we ran 200 tests" is an article of faith; with it, closure becomes a to-do list of named, empty bins. This is also the language of verification reviews: "what is your FIFO coverage?" has a precise answer only when the bins were designed from the plan.',
    prerequisites: [
      'dver-m01-l2: the plan table (bins are its measurable shadow)',
      'dver-m02: the testbenches whose stimulus the bins will measure',
    ],
    explanation:
      '**Functional coverage** answers: of the scenarios the plan declares important, which ones did the stimulus actually produce? You design it yourself, from the plan: each plan row (or scenario group) becomes a **bin** — a named, countable condition. A run that never hit `push_while_full` shows an empty bin with that exact name; the report is the plan with hit counters attached.\n\nBin design follows the plan\'s scenario classes from Module 01. For a FIFO: **accepted** bins (push accepted, pop accepted), **rejected** bins (push while full, pop while empty), **corner** bins (occupancy exactly 0, exactly max, wrap-around), and **interaction** bins (push+pop in the same cycle, back-to-back pushes). For a counter: bins for the wrap cycle, rollover masking, load-at-max. Each bin has a sampling condition — the Boolean that defines "this scenario occurred" — and the sampling point should be a meaningful event (per transfer, per cycle for occupancy), not an arbitrary time.\n\nThe mechanics differ by tooling. In plain Verilog you can build coverage manually with counters and an end-of-test report — coarse but fully runnable on this platform. In SystemVerilog the **covergroup** construct does it natively (coverpoints, bins, crosses, sampling events); the sketch below is labeled SystemVerilog and, as everywhere in the verification subset, needs a full simulator — Icarus does not implement covergroups, so treat it as the standard form of the concept. Either way, the design thinking — which conditions deserve names — is identical, and it is the thinking this lesson teaches.',
    deepDive:
      '### From plan row to bin: the mapping discipline\n\nThe review question is always "does every plan item have a bin, and does every bin map to a plan item?" A bin with no plan item is clutter (delete or spec it); a plan item with no bin is unverifiable (add one). Concretely: plan row V3 "push while full is rejected without corrupting state" becomes two artifacts — the bin `push_full_hit` (stimulus reached it) and the scoreboard check (state stayed correct when it did). The pair is the point: **bins measure occurrence; checks prove correctness**. A coverage report of 100 percent with a scoreboard that never ran is a tour, not a verification.\n\n### Choosing the sampling point\n\nPer-cycle sampling is simple and right for state-like quantities (occupancy, flag values, FSM state). Event-based sampling is right for transaction-like quantities (per completed transfer, per accepted push). Sampling everything per-clock inflates counts and buries the signal in noise; sampling transactions only can miss state-resident corners (occupancy=0 while idle is a legal corner). The rule: sample each bin where its condition is meaningful, and document the point in the bin name or comment. Crosses (op x occupancy, push x pop) multiply the space fast — cross only the pairs the plan names as interaction items, or the report becomes unreadable.\n\n### The three honest failure modes of coverage programs\n\n(1) **Bins too coarse**: `addr_accessed` as one bin reports success while only 3 of 256 addresses were ever read — subdivide by plan intent (low/mid/high/max). (2) **Bins without checks**: covered-but-unchecked scenarios feel like progress and verify nothing; every bin needs its paired check row. (3) **Coverage theater**: chasing the number instead of the risk — closing empty bins by weight-of-random instead of asking why stimulus never reached them (often the answer is an over-constrained stimulus model, and the fix is in the constraints, not in 10x more runs). The mature loop: read empty bins, classify (stimulus hole vs unreachable vs wrongly specified), act, re-run — the closure loop from the SystemVerilog course, now grounded in your own plan.',
    examples: [
      {
        title: 'Manual coverage in plain Verilog-2001 (runnable here)',
        language: 'verilog',
        code:
        '// Verilog-2001 manual functional coverage (runnable on this platform)\n// Counters per plan row, with an end-of-test report.\n`timescale 1ns/1ps\nmodule cov_manual;\n    reg push = 0, pop = 0, full = 0, empty = 1;\n    integer n_push_ok = 0, n_push_full = 0, n_pop_ok = 0;\n    integer n_pop_empty = 0, n_rw_same = 0, n_occ_max = 0;\n    integer i;\n\n    task sample;\n        begin\n            if (push && !full)  n_push_ok   = n_push_ok + 1;\n            if (push && full)   n_push_full = n_push_full + 1;\n            if (pop && !empty)  n_pop_ok    = n_pop_ok + 1;\n            if (pop && empty)   n_pop_empty = n_pop_empty + 1;\n            if (push && pop)    n_rw_same   = n_rw_same + 1;\n        end\n    endtask\n\n    initial begin\n        // (stimulus loop from the FIFO testbench drives push/pop/full/empty\n        //  and occupancy; sample is called every cycle)\n        for (i = 0; i < 1000; i = i + 1) sample;\n\n        $display("PLAN BIN REPORT");\n        $display("push_ok        = %0d %s", n_push_ok,   n_push_ok   ? "HIT" : "EMPTY");\n        $display("push_while_full= %0d %s", n_push_full, n_push_full ? "HIT" : "EMPTY");\n        $display("pop_ok         = %0d %s", n_pop_ok,    n_pop_ok    ? "HIT" : "EMPTY");\n        $display("pop_while_empty= %0d %s", n_pop_empty, n_pop_empty ? "HIT" : "EMPTY");\n        $display("rw_same_cycle  = %0d %s", n_rw_same,   n_rw_same   ? "HIT" : "EMPTY");\n        $finish;\n    end\nendmodule',
        explanation: [
          'Each plan row is an integer counter with a sampling condition — the concept with zero tool magic, fully runnable under Icarus.',
          'The report prints HIT/EMPTY per bin: EMPTY lines are the to-do list (retarget stimulus or justify the bin out).',
          'Sample is called once per cycle with the current signals; occupancy bins would be sampled per cycle against the occupancy value.',
          'This manual style is exactly what covergroups automate in SystemVerilog.',
        ],
      },
      {
        title: 'The same bins as a SystemVerilog covergroup (concept)',
        language: 'systemverilog',
        code:
        '// SystemVerilog covergroup — CONCEPT on this platform:\n// needs a full SV simulator (Icarus does not implement covergroups).\n\ncovergroup fifo_cg @(posedge clk);\n  cp_push: coverpoint {push, full} {\n    bins push_ok    = {2\'b10};          // push, not full\n    bins push_full  = {2\'b11};          // push while full\n  }\n  cp_pop: coverpoint {pop, empty} {\n    bins pop_ok     = {2\'b10};\n    bins pop_empty  = {2\'b11};\n  }\n  cp_occ: coverpoint occ {\n    bins occ_zero = {0};\n    bins occ_max  = {DEPTH};\n    bins occ_mid  = {[1:DEPTH-1]};\n  }\n  x_pushpop: cross cp_push, cp_pop;     // interaction item from the plan\nendgroup',
        explanation: [
          'The covergroup samples per posedge; each bins declaration is one plan item with a name a reviewer recognizes.',
          'cp_push packs (push, full) into a 2-bit value so the rejected corner (push while full) is one named bin.',
          'cp_occ shows state-resident bins: zero and max occupancy are legal corners stimulus must reach.',
          'x_pushpop is the interaction cross; cross only pairs the plan actually names.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Plan, bins, checks: the triangle',
        content:
        '            VERIFICATION PLAN\n          (feature x scenario x check)\n                  |            |\n       stimulus   |            |  checking\n       reaches it |            |  proves it\n                  v            v\n        COVERAGE BINS <--- SCOREBOARD / INVARIANTS\n        (hit or EMPTY)     (pass or FAIL)\n\n   A covered bin without a check = a tour, not a verification.\n   A check without a bin = proof that never fires (stimulus\n   never reached it) = false confidence.\n\n   Closure = every bin HIT (or justified-out) AND every paired\n   check executed and passing.',
        caption:
          'Bins and checks are two views of the same plan rows; closure needs both.',
      },
    ],
    tables: [
      {
        caption: 'Bin classes derived from plan scenario types',
        headers: ['Plan scenario class', 'Bin style', 'FIFO example'],
        rows: [
          ['Accepted behavior', 'Positive-condition bin', 'push_ok, pop_ok'],
          ['Rejected/fault behavior', 'Reject-condition bin', 'push_while_full, pop_while_empty'],
          ['Boundary/corner', 'State-value bins at limits', 'occ_zero, occ_max, wrap cycle'],
          ['Interaction', 'Cross of two coverpoints', 'push x pop same cycle'],
          ['Reset/fault injection', 'Special-event bin (set by fault test)', 'mid_op_reset_hit'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Bins that only measure values (256 address autobins) instead of plan intent.',
        fix: 'Name bins after plan items: address_low/high/max, wrap_cycle, rejected_push. A report full of addr[137]=1 tells nobody whether the plan is done.',
      },
      {
        mistake: 'Treating a bin hit as proof of correctness.',
        fix: 'A hit means the scenario was EXERCISED. The paired check (scoreboard, invariant, assertion) proves it was CORRECT. Closure requires both columns.',
      },
      {
        mistake: 'Closing empty bins by running 10x longer instead of asking why stimulus misses them.',
        fix: 'Empty bins have causes: over-constrained stimulus, a missing directed row, or an unreachable bin. Diagnose the cause; longer runs are the last resort, not the first.',
      },
    ],
    guidedPractice: {
      title: 'Bins from a counter plan',
      brief:
        'Using the counter corners from Module 02 lesson 3 (wrap, rollover masking, load-vs-enable, hold, reset priority), write the manual Verilog-2001 bin declarations (integer counters + sampling conditions) you would add to that testbench, and the report lines.',
      starterCode:
        '// integer n_wrap = 0;      // sampled when ...\n// integer n_ro_mask = 0;   // sampled when ...\n// ... (complete all five)',
      expectedBehavior:
        'n_wrap: rollover == 1 (sampled per cycle); n_ro_mask: q==15 && en==0 (mask corner); n_ld_wins: ld && en (priority interaction); n_hold: en==0 && !ld && !rst (sampled per cycle); n_rst_active: rst==1. Report prints each with HIT/EMPTY; empty n_ro_mask means stimulus never tried loading at the wrap.',
      hints: [
        'One counter per plan row, one condition each.',
        'Masking corner: the wrap value with en low.',
        'The report format mirrors the FIFO example.',
      ],
    },
    practiceExercises: [
      {
        title: 'Audit the bin set',
        brief:
          'A teammate\'s FIFO coverage has: push_ok, pop_ok, data_value bins for all 256 data values. List the three review findings.',
        expectedBehavior:
          '(1) Rejected-corner bins missing (push_while_full, pop_while_empty) — fault scenarios unmeasured. (2) Interaction bins missing (rw_same_cycle) — the plan interaction item is unmeasured. (3) The 256 data bins encode values, not plan intent — replace with a small corner set (0, max, random mid) unless the plan declares data-value sweep an item.',
        hints: [
          'Which plan scenario classes have no bins?',
          'Do the data bins map to any plan item?',
          'Rejected and interaction corners are the usual gaps.',
        ],
      },
      {
        title: 'Diagnose the empty bin',
        brief:
          'After 5,000 random FIFO cycles, bin push_while_full is EMPTY. Write the diagnostic questions in order and the two likely root causes with fixes.',
        expectedBehavior:
          'Questions: How is full ever reached? Does stimulus push when full is high? Is the constraint model excluding pushes at high occupancy? Causes: (1) stimulus never fills the FIFO — fix by biasing push probability up or adding a fill-then-stress directed phase; (2) constraints forbid push-while-full for legality — split legality (legal per spec) from stress (push anyway, expect rejection), since rejection IS specified behavior worth testing.',
        hints: [
          'Can full ever be high under current stimulus?',
          'Is push-while-full "illegal" or "specified rejection"?',
          'The fix is in stimulus design, not run length.',
        ],
      },
    ],
    assessment: {
      title: 'Functional coverage checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does an EMPTY bin in a coverage report mean?',
          options: [
            'The DUT failed that scenario',
            'The stimulus never produced that scenario',
            'The scoreboard failed',
            'The bin is unimportant',
          ],
          answer: 'The stimulus never produced that scenario',
          explanation:
            'Coverage measures stimulus reach, not DUT correctness. Empty means: retarget stimulus, or justify the bin out with a documented reason.',
          hint: 'Coverage and checking measure different things.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which bin pair corresponds to one plan row for "push while full is rejected without corrupting state"?',
          options: [
            'bin push_full only',
            'bin push_full (coverage) plus the state-corruption check (scoreboard)',
            'bin push_ok plus bin pop_empty',
            'A cross of push and data',
          ],
          answer: 'bin push_full (coverage) plus the state-corruption check (scoreboard)',
          explanation:
            'The row needs both artifacts: the bin proves stimulus reached the scenario; the check proves the DUT behaved correctly when it did.',
          hint: 'Occurrence and correctness are different columns.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'SystemVerilog covergroups run on this platform under the Icarus grader.',
          answer: 'false',
          explanation:
            'Covergroups are verification-subset SV; Icarus does not implement them. The manual counter style in this lesson is the runnable equivalent.',
          hint: 'Recall the verification-subset honesty rule.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What are the two allowed end states of any plan bin at closure (comma-separated)?',
          answer: 'hit, justified-out',
          explanation:
            'Every bin ends HIT (stimulus reached it, paired check ran) or justified-out (removed with a written reason). Silent deletion hides plan items.',
          hint: 'Same two states as the plan-item rule.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Functional coverage', definition: 'Plan-driven measurement of which declared scenarios the stimulus actually produced.' },
      { term: 'Bin', definition: 'A named, countable condition corresponding to a plan scenario; the unit of the coverage report.' },
      { term: 'Sampling condition', definition: 'The Boolean defining when a bin counts; chosen where the scenario is meaningful.' },
      { term: 'Cross', definition: 'A bin pair-combination measuring interaction scenarios the plan names.' },
      { term: 'Coverage closure', definition: 'The loop of measuring, classifying empty bins, retargeting stimulus, and justifying removals until every bin is hit or justified-out.' },
    ],
    revisionSummary: [
      'Bins are the measurable shadow of plan rows: one named condition per scenario class.',
      'Cover accepted, rejected, corner and interaction scenarios; cross only named interactions.',
      'A hit is exercised, not checked — every bin pairs with a check.',
      'Manual counters implement the concept in plain Verilog (runnable here); covergroups automate it in SV (full simulator).',
      'Empty bins are diagnoses, not reminders to run longer.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Functional coverage', url: 'https://en.wikipedia.org/wiki/Functional_coverage', kind: 'article' },
      { label: 'Wikipedia — Code coverage', url: 'https://en.wikipedia.org/wiki/Code_coverage', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'dver-m03-l2',
    title: 'Code Coverage: Types, Uses, and Hard Limits',
    summary:
      'What line, toggle and branch coverage actually measure, what 100 percent line coverage proves (very little), and how to use code coverage without letting it substitute for thinking.',
    objectives: [
      'Define line, toggle, branch and expression coverage and what each observes.',
      'Explain with a concrete example why 100 percent line coverage can coexist with untested behavior.',
      'Use code coverage for what it is good at: dead code, unexecuted branches, stuck-at nodes.',
      'State the division of labor between code coverage and functional coverage.',
    ],
    whyItMatters:
      'Code coverage is the only coverage that arrives free: tools measure it on every run. That convenience is exactly why it is misused — "100 percent covered" is the most common false claim in verification status meetings. Knowing precisely what it measures makes you the engineer who reads coverage reports correctly, and the one who never confuses executed-lines with verified-behavior.',
    prerequisites: [
      'dver-m03-l1: functional coverage and the plan-driven bin mindset',
      'dver-m02-l1: what a stimulus run actually does',
    ],
    explanation:
      '**Code coverage** is measured by the tool, automatically, on every simulation: it records which parts of the RTL text were *executed*. The main flavors: **line (statement) coverage** — every executable statement ran at least once; **branch (decision) coverage** — every if/case branch was taken in both directions; **expression (condition) coverage** — sub-conditions of a Boolean were each true and false; **toggle coverage** — every bit of every signal transitioned 0->1 and 1->0. All four measure *the code*, driven by whatever stimulus happened to run.\n\nWhy that is a hard limit: consider `if (a && b) y = 1; else y = 0;` exercised only with (a=1,b=1) and (a=0,b=1). Both lines executed — 100 percent line coverage. But the sub-condition a=false was never seen with b=false, the y=0 branch fired only for one reason, and no functional statement anywhere says what y should be when a=1,b=0 — because code coverage does not know what y SHOULD be, only that the assignment ran. Correctness never enters: code coverage is stimulus bookkeeping, not verification.\n\nIts genuine uses are the complement: **dead code** (a line never executed — either unreachable by design or a missing scenario), **unexecuted branches** (a case arm never hit: which FSM state was never entered?), **toggle holes** (a bus bit stuck at 0 across the whole regression: a width bug, a tie-off, or a missing scenario — all worth knowing), and **regression health** (line coverage dropping between runs means stimulus regressed). Used this way, code coverage is a cheap, honest mirror; used as a completion metric, it is theater.',
    deepDive:
      '### The 100-percent illusion, precisely\n\nBuild the full counterexample. DUT: `if (we) mem[waddr] <= wdata; if (re) rdata <= mem[raddr];` — a two-line always block. Stimulus: one write to address 0, then one read of address 0. Line coverage: 100 percent (both lines ran). What was NOT tested: concurrent read and write (the two ifs in the same cycle), any address other than 0, reading a never-written address, back-to-back operations, x-propagation on unwritten reads. The lesson: line coverage granularity is the statement, and the interesting behaviors live *between* statements — in combinations, sequences and corners. Branch coverage improves this (it demands both arms of each if) but is still blind to interaction: both lines can run in different cycles forever.\n\n### Expression and toggle: the mid-tier metrics\n\nExpression coverage closes part of the gap: for `if (a && b)` it demands a=1/b=0, a=0/b=1, and both-true — exposing short-circuit structure. It scales as the product of sub-conditions, so tools usually settle for a weaker pair-per-term goal. Toggle coverage is the silent hero for datapaths: a bit that never toggles across a full regression is a genuine finding — stuck tie-off, wrong width connection, or a scenario hole. Toggle reports on wide buses and memory arrays are where "the tool found something I forgot" happens most often.\n\n### The division of labor, stated once\n\nCode coverage: cheap, automatic, measures stimulus execution against the code — use it to find dead code, missed branches and stuck bits, and to compare stimulus sets. Functional coverage: designed, plan-driven, measures scenario occurrence against the SPEC — use it to decide whether the plan is done. A completion claim cites both plus the checkers: functional bins all hit or justified, code coverage reviewed with anomalies explained, checks green. Neither number alone is a claim; together with checks they are the evidence package.\n\n### Tool honesty for this platform\n\nIcarus Verilog does not produce line/branch/toggle coverage reports. So on this platform you practice the *reasoning*: given a stimulus list, predict which lines/branches/toggles executed (the guided practice does exactly this), and treat real coverage reports as the tool-layer version of the same analysis. The skill transfers; only the report format differs.',
    examples: [
      {
        title: 'The same stimulus, four coverage views',
        language: 'text',
        code:
        '// DUT (Verilog-2001):\n//   always @(posedge clk) begin\n//     if (we)  mem[waddr] <= wdata;      // L1\n//     if (re)  rdata      <= mem[raddr]; // L2\n//   end\n//\n// Stimulus: one write to addr 0; later, one read of addr 0.\n//\n// LINE coverage:     100%   (L1 ran on the write, L2 on the read)\n// BRANCH coverage:   100%   (each if taken both ways across the run:\n//                            we=1 cycle and we=0 cycles; same for re)\n// EXPRESSION:        n/a (single conditions)\n// TOGGLE:            waddr[0] toggled (0->1? NO: only addr 0 written!\n//                    waddr[3:1] never toggled; wdata bits depend on data)\n//\n// Functional view (what code coverage cannot see):\n//   - concurrent read+write in the SAME cycle: NEVER TESTED\n//   - read of a never-written address: NEVER TESTED\n//   - addresses 1..255: NEVER WRITTEN OR READ\n//   - back-to-back write/read: NEVER TESTED\n//\n// Verdict: 100% line + 100% branch, four high-value behaviors untested.',
        explanation: [
          'Two ifs, two cycles of stimulus: every textual metric reads 100 percent.',
          'Toggle coverage is the one that blinks: waddr bits 3:1 never moved — a real, actionable hole.',
          'The functional list names behaviors between the lines: same-cycle rw, stale reads, address sweep, back-to-back timing.',
          'This is the exact shape of the "100 percent covered" claim that fools status meetings.',
        ],
      },
      {
        title: 'Predicting coverage from stimulus (the skill, no tool needed)',
        language: 'verilog',
        code:
        '// Verilog-2001 exercise frame (runnable on this platform)\n// DUT fragment:\n//   always @(posedge clk) begin\n//     if (en) cnt <= cnt + 1;        // B1: then-branch / else-hold\n//     if (ld) cnt <= d;              // B2\n//   end\n//   assign rollover = (cnt == 4\'hF);\n//\n// Stimulus plan:\n//   cycles 1-3 : en=1, ld=0           -> B1 then-branch x3\n//   cycle  4   : en=0, ld=0           -> B1 else (hold)\n//   cycle  5   : en=1, ld=1, d=9      -> B1 then + B2 then (priority?)\n//   cycle  6   : en=0, ld=1, d=2      -> B1 else + B2 then\n//   cycles 7-8 : en=0, ld=0           -> B1 else x2\n//\n// Predictions: line 100% for both statements.\n// Branch B1: both directions hit. Branch B2: only THEN hit —\n// ld=0 never occurs with the write in cycle 5/6? it does (cycles 1-4,\n// 7-8): B2 else also hit -> B2 both directions.\n// NOT covered: cnt reaching 0xF (rollover path), en&&ld priority at\n// the wrap, d==0 corner. The plan bins from Module 03 lesson 1 name these.',
        explanation: [
          'Reading stimulus and predicting line/branch outcomes is the no-tool version of the coverage skill — and it is checkable by hand.',
          'The prediction surfaces the real gaps: rollover never reached, wrap-priority interaction untested, d=0 corner missed.',
          'Those gaps are exactly the functional bins the previous lesson would have designed first.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'What each coverage type can and cannot see',
        content:
        '  stimulus executes code:   if (a && b) y = 1; else y = 0;\n\n  LINE        sees: statements run            misses: which values\n  BRANCH      sees: both arms taken           misses: why (which inputs)\n  EXPRESSION  sees: sub-conditions true/false misses: sequences, combos\n  TOGGLE      sees: bit transitions           misses: meaning of the bit\n  --------------------------------------------------------------\n  FUNCTIONAL  knows: the SPEC. bins: a&&b with b=0, a&&b with a=0,\n  (plan)            y==expected per spec for EVERY input class\n\n  Division of labor:\n    code coverage -> dead code, missed branches, stuck bits,\n                     stimulus-set comparison\n    functional    -> is the PLAN exercised? is the behavior checked?\n  Neither alone is a completion claim.',
        caption:
          'Four automatic metrics measure the text; the plan measures the meaning. The two layers answer different questions.',
      },
    ],
    tables: [
      {
        caption: 'Code coverage types at a glance',
        headers: ['Type', 'Measures', 'Finds', 'Blind to'],
        rows: [
          ['Line (statement)', 'Statements executed >= 1 time', 'Dead code, missing scenarios', 'Which values, interactions'],
          ['Branch (decision)', 'Each if/case arm taken both ways', 'Unvisited states, unused arms', 'Same-cycle interactions'],
          ['Expression (condition)', 'Sub-conditions true and false', 'Short-circuit structure holes', 'Sequences across cycles'],
          ['Toggle', '0->1 and 1->0 per bit', 'Stuck bits, width/tie bugs', 'Bit meaning, correctness'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reporting "100 percent line coverage" as verification completion.',
        fix: 'Line coverage says every statement executed with something. Completion claims cite functional bins (hit or justified), reviewed code coverage AND passing checks.',
      },
      {
        mistake: 'Ignoring toggle reports on wide buses.',
        fix: 'A never-toggling bit across a full regression is a finding: tie-off, wrong width, or scenario hole. Chase every one before sign-off.',
      },
      {
        mistake: 'Improving code-coverage numbers by adding stimulus that re-executes covered lines.',
        fix: 'If the gap is functional (interactions, corners), the fix is new scenarios (bins, directed rows), not more executions of the same text.',
      },
    ],
    guidedPractice: {
      title: 'Predict the coverage holes',
      brief:
        'Stimulus drives a 4-bit counter: 20 cycles with en=1, then 5 cycles with en=0, never any load. The DUT has: count logic, load logic, rollover output. List: line coverage result, branch results, toggle result on cnt[3:0], and the three functional behaviors never tested.',
      expectedBehavior:
        'Line: 100 percent (count and hold logic executed; load line only if its always-arm exists and never ran — if load is an else-if arm, that line is 0 percent, a finding). Branch: en-both-ways hit; load-then never hit (if load exists). Toggle: cnt[3:0] all toggle (counting 0..15 wraps), so no toggle hole. Functional holes: load behavior, load-vs-enable priority, wrap-with-load interaction, plus reset-priority (if untested).',
      hints: [
        'Whether the load line is dead depends on the coding style — both answers are instructive.',
        'Counting 20 cycles from 0 wraps: all bits toggle.',
        'The functional list is the point of the exercise.',
      ],
    },
    practiceExercises: [
      {
        title: 'Explain the false claim',
        brief:
          'In review, an engineer says: "Block is done: 100 percent line coverage." Write the 5-sentence response using the two-ifs FIFO example, and the three questions you ask next.',
        expectedBehavior:
          'Response: line coverage measures executed statements, not behavior; the two-ifs block reads 100 percent while concurrent rw, stale reads and address sweep go untested. Questions: (1) What functional bins exist and what is empty? (2) What do branch and toggle reports show? (3) Which checks (scoreboard/invariants) ran on which scenarios?',
        hints: [
          'The counterexample is load-bearing.',
          'Move the conversation to bins and checks.',
          'Toggle is the question that finds stuck bits.',
        ],
      },
      {
        title: 'Design the stimulus from the toggle report',
        brief:
          'A regression shows addr[7:4] never toggled on a 256-address FIFO. Give the two possible root causes and the stimulus fix for each.',
        expectedBehavior:
          'Causes: (1) scenario hole — stimulus only ever addressed the low half; fix with address-range bins and a directed high-address sweep; (2) a design bug — upper address bits tied off or misconnected, so stimulus DID try but the port never moved; fix is RTL, found by cross-checking TB-driven addr vs DUT port in a waveform.',
        hints: [
          'Stimulus hole or wiring bug: how would you tell them apart?',
          'Dump addr at the TB and the port and compare.',
          'Toggle holes are findings either way.',
        ],
      },
    ],
    assessment: {
      title: 'Code coverage checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which statement about 100 percent line coverage is TRUE?',
          options: [
            'It proves all specified behaviors were tested',
            'It proves every executable statement ran at least once with something',
            'It proves the scoreboard passed',
            'It proves toggle coverage is also 100 percent',
          ],
          answer: 'It proves every executable statement ran at least once with something',
          explanation:
            'That is exactly and only what it measures; behavior coverage requires functional bins, and correctness requires checks.',
          hint: 'The metric is defined on statements.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A wide bus shows bits 7:4 never toggled across the regression. This most likely indicates:',
          options: [
            'A tool error',
            'A scenario hole or a wiring/tie-off bug — both are findings to chase',
            'Nothing: buses do not need to toggle',
            'That line coverage is deficient',
          ],
          answer: 'A scenario hole or a wiring/tie-off bug — both are findings to chase',
          explanation:
            'Toggle holes are actionable either way: missing stimulus ranges or a real RTL defect. Both require investigation before sign-off.',
          hint: 'Silent bits are never normal on a healthy bus.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Branch coverage requires each side of every if and case arm to have been taken during the run.',
          answer: 'true',
          explanation:
            'Branch (decision) coverage demands both directions of each decision, which is why it finds unvisited FSM states and unused case arms that line coverage misses.',
          hint: 'Its whole point is both directions.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Which coverage type measures that every bit of every signal transitioned in both directions?',
          answer: 'toggle coverage',
          explanation:
            'Toggle coverage is per-bit transition tracking; its holes surface stuck-at nodes, width bugs and scenario holes on buses and arrays.',
          hint: 'It is named after the transition.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Line (statement) coverage', definition: 'Fraction of executable statements executed at least once; weakest metric.' },
      { term: 'Branch (decision) coverage', definition: 'Fraction of decision arms (if/case) taken in both directions.' },
      { term: 'Expression (condition) coverage', definition: 'Whether sub-conditions of Boolean expressions were each observed true and false.' },
      { term: 'Toggle coverage', definition: 'Per-bit tracking of 0->1 and 1->0 transitions; finds stuck bits and wiring defects.' },
      { term: '100-percent illusion', definition: 'Full textual coverage coexisting with untested behaviors: statements ran, scenarios did not.' },
    ],
    revisionSummary: [
      'Line/branch/expression/toggle all measure the code under the stimulus that ran — never correctness.',
      'Two-ifs example: 100 percent line and branch with four critical behaviors untested.',
      'Real uses: dead code, unvisited arms, stuck bits (toggle), stimulus-set comparison.',
      'Completion claims = functional bins + reviewed code coverage + passing checks.',
      'Icarus does not emit coverage reports here; practice the reasoning by prediction.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Code coverage', url: 'https://en.wikipedia.org/wiki/Code_coverage', kind: 'article' },
      { label: 'Wikipedia — Functional coverage', url: 'https://en.wikipedia.org/wiki/Functional_coverage', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'dver-m03-l3',
    title: 'Regressions, Seed Control, and Bug Reports People Can Act On',
    summary:
      'Automate the nightly loop, reproduce any failure exactly with seeds, minimize a failing case, and write the bug report that gets fixed the same day.',
    objectives: [
      'Describe a regression suite structure: test list, seeds, pass/fail parsing, triage flow.',
      'Control randomness with seeds in plain Verilog ($random(seed), $value$plusargs) and reproduce a failing run exactly.',
      'Minimize a failing test case systematically.',
      'Write a bug report with the seven fields that make it actionable.',
    ],
    whyItMatters:
      'Verification at scale is logistics: hundreds of runs overnight, a handful failing, and the difference between a healthy project and a stuck one is how fast failures become reproduced, minimized, assigned and fixed. Seed discipline and good bug reports are the two cheapest process skills with the highest visible payoff — and both are interview questions because teams have been burned by their absence.',
    prerequisites: [
      'dver-m02-l1: self-checking verdicts (regressions parse them)',
      'dver-m03-l1/l2: coverage reports (triage uses them)',
    ],
    explanation:
      'A **regression suite** is the test list plus automation: run every test (and every seed of the random tests), capture each result, parse the PASS/FAIL verdict lines, collect FAIL logs, and produce a morning summary: N tests, M seeds, K failures with links. The self-checking verdict from Module 02 is what makes this possible — scripts grep for `ALL TESTS PASSED` vs `FAILED:` because the testbench always prints exactly one. Regression hygiene rules: tests must be deterministic-or-reseeded (same inputs, same result), each run must be self-contained (no leftover state), and every failure must leave its log and waveform behind.\n\n**Seed control** is what makes random tests reproducible. Verilog\'s `$random` (and `$urandom` in later standards) draw from a pseudo-random stream seeded at start. Two mechanisms matter. (1) `$random(seed_var)`: passing a seed variable makes the generator use and update it — same seed in, same sequence out. (2) Reading the seed from the command line with `$value$plusargs("seed=%d", seed)` lets the regression pass a different seed per run while logging it — and lets you re-run a failing run *exactly* by passing its seed back. The discipline: the seed is part of the test\'s identity; a failure without its recorded seed is half a bug report.\n\n**Minimization** turns "the 10,000-transaction run failed" into "these 7 operations fail": freeze the seed, replay, then cut stimulus (binary search over the transaction list, or hand-reduce while the failure persists) until the smallest sequence still fails. A minimal case halves debug time and often reveals the bug class immediately (always the 3rd read after a mid-op reset, for instance).\n\nA **bug report** that engineers can act on has seven fields: a specific title (what is wrong, where), environment (simulator/version, RTL commit), reproduction (exact command/seed), stimulus description (or attached minimal case), expected behavior (the spec sentence), observed behavior (the FAIL lines with timestamps), and severity plus a first-guess localization. The expected-behavior field is the spec link from Module 01 — without it, the report is an opinion; with it, it is evidence.',
    deepDive:
      '### Regression anatomy and triage flow\n\nThe nightly loop: (1) launch matrix — every directed test once, every random test x K seeds (K grows with project maturity: 5 early, 50+ late); (2) parse verdicts — PASS lines, FAIL lines, plus crash/timeout as their own category (a hung test is a finding, not an infrastructure note); (3) triage — classify each failure: known bug (link it), new bug (report it), or infrastructure (fix the harness); (4) coverage collection on a weekly cadence (full regressions are expensive) with the closure loop from lesson 1. Two policies keep the loop honest: **no red overnight** (failures are triaged same-day, or the team stops trusting the report) and **no skipping** (a "temporarily disabled" test with no bug link is a hole in the plan — Module 01\'s waiver rule applies to regressions too).\n\n### Seed mechanics in Verilog, precisely\n\n`$random(seed)` takes an inout seed variable: the first call uses it, subsequent calls update it — so a TB that saves the seed at start (`seed = 32\'h1234_5678;` or read from plusargs) and passes the same variable to every `$random` call reproduces exactly across simulators that implement the standard LFSR-style algorithm (the standard defines the algorithm for $random, making it portable; $urandom is NOT defined identically across simulators — for cross-tool reproducibility prefer $random(seed) or your own PRG). The regression wrapper passes `-Pvalue$plusargs` style arguments (tool-dependent; Icarus uses `-Pvalue.plusargs` naming or the `+seed=123` plusarg form) — the portable part is the TB: `$value$plusargs("seed=%d", seed)` with a default when absent. Log the seed in the verdict line: `SEED=1234 ALL TESTS PASSED` — the morning triage then has seeds without opening logs.\n\n### Minimization as binary search\n\nWith a recorded failing seed, minimization is mechanical: (1) replay: confirm the failure; (2) if stimulus is a script/loop with a count N, binary-search N (N/2 fails? keep halving; passes? the trigger is in the removed half); (3) if stimulus is a list of operations, delete halves the same way; (4) hand-simplify constants (addresses, data) to canonical values — the bug rarely depends on them, and the smaller case is easier to read; (5) write the minimal case as a directed test so it joins the regression as the bug\'s regression-guard. Timebox minimization: 30-60 minutes; if the failure resists, attach the seed and full log instead — a reproduced-but-unminimized report beats a day lost to shaving one cycle.\n\n### What makes reports get fixed the same day\n\nRead like the assignee: they need to reproduce in under five minutes. The seven fields do that: title names symptom and block; environment pins the RTL commit (a bug report against yesterday\'s RTL wastes everyone\'s evening); reproduction is one copy-paste command with the seed; the minimal case (or the exact sequence) removes archaeology; expected-behavior quotes the spec sentence (Module 01\'s triangulation, pre-done); observed-behavior lists the actual FAIL lines with timestamps; localization-guess shows you did half the debugging already ("fails only when ld and en coincide — see t=340ns"). What makes reports rot: vagueness ("sometimes fails"), missing seeds ("random failed"), and merged reports (three bugs in one ticket fix slowly).',
    examples: [
      {
        title: 'Seed-controlled random stimulus in plain Verilog-2001',
        language: 'verilog',
        code:
        '// Verilog-2001 (runnable on this platform, Icarus supports plusargs)\n`timescale 1ns/1ps\nmodule tb_rand_seeded;\n    reg clk = 0;\n    reg [31:0] seed;\n    integer i, r, errors = 0;\n\n    always #5 clk = ~clk;\n\n    initial begin\n        // seed from command line (+seed=1234), default otherwise\n        if (!$value$plusargs("seed=%d", seed))\n            seed = 32\'hDEAD_BEEF;\n        $display("SEED=%0d", seed);\n\n        for (i = 0; i < 100; i = i + 1) begin\n            r = $random(seed);          // seed variable: portable replay\n            // ... drive stimulus derived from r, self-check as usual ...\n        end\n        if (errors == 0) $display("SEED=%0d ALL TESTS PASSED", seed);\n        else             $display("SEED=%0d FAILED: %0d errors", seed, errors);\n        $finish;\n    end\nendmodule',
        explanation: [
          '$value$plusargs("seed=%d", seed) reads +seed=1234 from the command line; the default keeps local runs deterministic too.',
          '$random(seed) uses AND updates the seed variable: same seed reproduces the identical stimulus sequence — the replay guarantee.',
          'The verdict line embeds the seed: the regression log then contains the identity of every run without opening files.',
          'Verdict formats stay script-parseable: PASS lines contain ALL TESTS PASSED, failures contain FAILED: with the count.',
        ],
      },
      {
        title: 'Minimization: from 10,000 ops to 7',
        language: 'text',
        code:
        '// Failure: SEED=981237 FAILED after 10,000 random FIFO ops.\n//\n// Step 1 — replay:      rerun with +seed=981237. Fails identically.   [reproduced]\n// Step 2 — halve N:     5,000 ops? PASSES. 7,500? FAILS.             [trigger in last 2500]\n// Step 3 — bisect ops:  drop 2nd half of final 2500? still fails at\n//                        ~8,125 ops. Narrow by halves: 3 more runs.\n// Step 4 — hand-reduce: the surviving core is:\n//         fill to full (4 pushes), push #5 (rejected), pop, push\n//         -> FAIL: occupancy off by one after rejected push.\n// Step 5 — simplify:    data values -> canonical (0x11, 0x22...);\n//         still fails. 7 operations total.\n//\n// Result: minimal case written as directed test t_fifo_reject_occ;\n// joins the regression as the guard for this bug. Debug time for the\n// designer: minutes, because the case fits on one screen.',
        explanation: [
          'Halving first (step 2) is the big win: 10,000 -> ~8,000 in three runs.',
          'The surviving 7-op sequence names the bug class in its shape: rejected push corrupts occupancy.',
          'The minimal case becomes a permanent directed regression row — the bug cannot return silently.',
          'Timebox rule respected: had bisection resisted, the seed + log would ship instead.',
        ],
      },
      {
        title: 'The seven-field bug report',
        language: 'text',
        code:
        '// Title:    fifo4: occupancy decrements on rejected push while full\n//\n// 1. Environment:  Icarus 12, RTL commit 4f2c1e9 (fifo4.v), TB commit 9a03bb2\n// 2. Reproduce:    iverilog -o sim tb_fifo.v fifo4.v && ./sim +seed=981237\n// 3. Stimulus:     minimal directed case attached (t_fifo_reject_occ):\n//                  fill 4/4, push (rejected), pop, push\n// 4. Expected:     Spec 4.2: "A push while full is ignored; occupancy\n//                  and pointer state are unchanged by the rejected push."\n// 5. Observed:     FAIL t=340 occupancy=4 exp=3 ... FAILED: 1 errors\n//                  (SEED=981237 full log attached)\n// 6. Severity:     Major (occupancy divergence corrupts all later reads)\n// 7. Localization: bug appears only after a REJECTED push; suspect\n//                  the push-while-full branch updates the write pointer\n//                  or occupancy before the full check.\n//\n// Anti-patterns this avoids: "FIFO is broken sometimes" (no repro),\n// "random failed" (no seed), three symptoms merged into one ticket.',
        explanation: [
          'Every field answers a question the assignee would otherwise ask; reproduction is one copy-paste line with the seed.',
          'The expected field quotes the spec sentence — the Module 01 triangulation done in advance.',
          'The localization guess comes from the minimized case\'s shape, and states a suspicion rather than a verdict.',
          'One symptom per ticket keeps fixes and verification one-to-one.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The nightly regression loop',
        content:
        '   launch matrix            parse & classify          act\n  +----------------+       +------------------+     +------------------+\n  | directed tests |       | PASS             |     | archive          |\n  | random x K     | ----> | FAIL             | --> | new bug: report  |\n  | seeds each     |       | TIMEOUT/CRASH    |     | known bug: link  |\n  | (seed logged)  |       +------------------+     | infra: fix harness|\n  +----------------+                                  +--------+---------+\n          ^                                                    |\n          |            morning summary: N tests, M seeds,      |\n          +------------ K failures with seeds+logs <-----------+\n\n  Policies: no red overnight (triage same day); no disabled test\n  without a bug link; every FAIL leaves log + VCD + seed.',
        caption:
          'Regressions are logistics: deterministic verdicts in, classified failures out, nothing red survives the morning.',
      },
    ],
    tables: [
      {
        caption: 'The seven fields of an actionable bug report',
        headers: ['Field', 'Content', 'Kills which anti-pattern'],
        rows: [
          ['Title', 'Symptom + block, specific', 'Vague one-liners'],
          ['Environment', 'Simulator, versions, RTL/TB commits', 'Stale-RTL confusion'],
          ['Reproduction', 'Exact command with seed', 'Cannot-reproduce tickets'],
          ['Stimulus', 'Minimal case or exact sequence', 'Archaeology'],
          ['Expected', 'The spec sentence', 'Opinion vs evidence'],
          ['Observed', 'FAIL lines with timestamps, log attached', 'He-said-she-said'],
          ['Severity + localization', 'Impact and first-guess suspect', 'Mis-prioritized, un-debugged dumps'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Running random tests without recording the seed.',
        fix: 'Print the seed in the verdict line and read it via $value$plusargs with a default. A failure without a seed is unreproducible by definition.',
      },
      {
        mistake: 'Spending a day minimizing when the failure resists.',
        fix: 'Timebox minimization (30-60 minutes). A reproduced report with seed and logs beats a lost day; minimize only while it keeps yielding.',
      },
      {
        mistake: 'Disabling a failing test "temporarily" without a bug link.',
        fix: 'Disabled tests are plan holes. Every skip gets a bug ticket link and a review date, or it gets fixed. The regression must stay a complete mirror of the plan.',
      },
    ],
    guidedPractice: {
      title: 'Build the triage table',
      brief:
        'Your morning summary shows: t_count PASSED, t_fifo_seed981 FAILED (new pattern), t_uart TIMEOUT, t_adder FAILED (same signature as bug #142). For each, write the triage classification and the next action.',
      starterCode:
        '// t_count      -> ...\n// t_fifo_981   -> ...\n// t_uart       -> ...\n// t_adder      -> ...',
      expectedBehavior:
        't_count: PASS, archive. t_fifo: new bug — reproduce with +seed=981, minimize (timeboxed), file with the seven fields. t_uart: TIMEOUT is its own category — check for a hang (wait vs deadlock); if DUT deadlock, it is a bug; if TB wait bug, fix harness. t_adder: known bug — link to #142, confirm the signature matches, no new ticket.',
      hints: [
        'TIMEOUT is a finding, not noise.',
        'Known-signature failures get links, not new tickets.',
        'Reproduce-before-report for new failures.',
      ],
    },
    practiceExercises: [
      {
        title: 'Write the report',
        brief:
          'From the minimized 7-op FIFO case in example 2, write the complete bug report (all seven fields). Invent plausible-but-consistent details for environment and log lines.',
        expectedBehavior:
          'A complete report with: specific title (occupancy off-by-one after rejected push), environment (Icarus, commits), one-line reproduce command with seed 981237, the 7-op stimulus, the spec sentence for rejected pushes, the observed FAIL lines with t=340 and SEED, severity Major, localization pointing at the push-while-full branch. Graded on completeness and specificity, not on exact wording.',
        hints: [
          'Copy the seven-field template from example 3.',
          'The expected field must quote a spec sentence.',
          'The observed field needs at least one FAIL line with a time.',
        ],
      },
      {
        title: 'Design the seed policy',
        brief:
          'Your project runs 12 random tests. Propose the seed policy: how many seeds per test early vs late in the project, where seeds come from, and what the verdict line must contain. Justify each rule in one sentence.',
        expectedBehavior:
          'Early: 5 seeds/test (cheap signal). Late: 50+ (statistical depth), plus the recorded seed of every historical failure re-run weekly (bug cannot silently return). Seeds come from $value$plusargs with a logged default. Verdict lines contain SEED, verdict and error count so triage and replay need no log digging.',
        hints: [
          'Seed count is a maturity dial.',
          'Historical-failure seeds are regression guards.',
          'The verdict line is the interface to the morning summary.',
        ],
      },
    ],
    assessment: {
      title: 'Regressions and bug reports checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which mechanism makes a random Verilog testbench reproduce a specific past run?',
          options: [
            'Running it twice',
            'Recording and reusing the seed ($random(seed) / plusargs)',
            'Increasing the iteration count',
            'Recompiling the DUT',
          ],
          answer: 'Recording and reusing the seed ($random(seed) / plusargs)',
          explanation:
            'The seed determines the whole pseudo-random stream; replaying with the identical seed reproduces the identical stimulus and the identical failure.',
          hint: 'What parameter fixes the random sequence?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which bug-report field prevents the "is this even a bug?" argument?',
          options: ['Severity', 'Expected behavior quoting the spec sentence', 'Title', 'Environment'],
          answer: 'Expected behavior quoting the spec sentence',
          explanation:
            'The expected field is the spec link: it converts the report from opinion to evidence and pre-does the Module 01 triangulation.',
          hint: 'Correctness is spec-relative.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A test that hangs should be classified as infrastructure noise and dropped from the regression.',
          answer: 'false',
          explanation:
            'TIMEOUT/CRASH is its own triage category: a hung test may be a DUT deadlock (a real bug) or a TB wait bug. Either way it is triaged, not dropped.',
          hint: 'Hangs are findings until proven otherwise.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What is the systematic name for shrinking a failing run to the smallest sequence that still fails (two words)?',
          answer: 'test minimization',
          explanation:
            'Minimization (usually by bisection over stimulus count, then hand-simplification) produces the small case that halves debug time and joins the regression as a guard.',
          hint: 'It happens after replay, before reporting.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Regression suite', definition: 'The automated nightly run of all tests (and seeds), with parsed verdicts and a triage flow.' },
      { term: 'Seed', definition: 'The starting value of the pseudo-random stream; identical seed reproduces an identical run.' },
      { term: '$random(seed)', definition: 'Verilog system function using and updating an inout seed variable; standard-defined and portable.' },
      { term: '$value$plusargs', definition: 'Reads command-line arguments (+seed=1234) into the testbench; the standard seed-transport mechanism.' },
      { term: 'Test minimization', definition: 'Reducing a failing run to the smallest still-failing sequence via bisection and simplification.' },
      { term: 'Bug report', definition: 'The seven-field evidence package: title, environment, reproduction, stimulus, expected, observed, severity/localization.' },
    ],
    revisionSummary: [
      'Regression = test list x seeds, parsed verdicts, same-day triage, no red overnight.',
      'Seeds: $value$plusargs in, $random(seed) for portable replay, seed printed in every verdict.',
      'Minimize by bisection within a timebox; the minimal case becomes a directed regression guard.',
      'Reports: seven fields, spec sentence in expected, reproduction in one line.',
      'Every disabled test needs a bug link; every escape updates the plan.',
    ],
    furtherReading: [
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
      { label: 'Wikipedia — Regression testing', url: 'https://en.wikipedia.org/wiki/Regression_testing', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
