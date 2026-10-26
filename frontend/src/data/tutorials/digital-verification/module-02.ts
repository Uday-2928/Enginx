import type { TutorialLesson } from '../types';

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'dver-m02-l1',
    title: 'The Self-Checking Testbench: Reference Model, Error Counter, Verdict',
    summary:
      'Build the workhorse pattern of verification in plain Verilog-2001: exhaustive stimulus, a reference model, an error counter and a PASS/FAIL summary — fully worked on a 4-bit adder, runnable on this platform.',
    objectives: [
      'Name the three components every self-checking testbench needs.',
      'Build an exhaustive self-checking testbench for a combinational block and predict its output.',
      'Explain why the checker compares against a computed reference rather than hardcoded values.',
      'Apply the pattern with tasks and repeated stimulus for sequential blocks.',
    ],
    whyItMatters:
      'This is the single most reused pattern in hardware verification. Before any class-based machinery, a testbench earns trust by answering two questions automatically: is the output right, and did anything fail? A testbench that just prints waveforms makes a human the checker; a self-checking testbench makes every regression run a verdict. Everything later in this course — scoreboards, coverage, regressions — is this pattern scaling up.',
    prerequisites: [
      'Verilog testbench basics: reg/wire, initial, always, $display',
      'dver-m01-l2: the plan table (every test here corresponds to a row)',
    ],
    explanation:
      'A **self-checking testbench** contains three things a stimulus-only testbench does not. First, a **reference model**: an independent way to compute the expected result — for an adder it can be the language operator (+) in the testbench; for a sequential block it is a small behavioral model updated in step with the DUT. Second, a **comparison and error counter**: every observation is compared (with !==, so x-values fail) and mismatches increment a counter and print a message with enough context to debug. Third, a **final verdict**: one line at the end — ALL TESTS PASSED or FAILED with the count — so a regression log is readable by scripts and humans.\n\nThe worked example below is exhaustive: a 4-bit adder has 16 x 16 x 2 = 512 input combinations, so the testbench loops over all of them and computes the expected 5-bit result (carry out concatenated with sum) as `ia + ib + ic` in an integer-sized variable. The DUT claim `{cout, sum} == a + b + cin` is checked for every vector. Because the reference uses the simulator arithmetic rather than hand-computed constants, the test stays correct if the loop bounds change, and no transcription errors can hide.\n\nDesign details that make the pattern trustworthy: drive inputs from **integer loop variables** (no typing errors), apply a small **#1 delay** after each input change so combinational outputs settle before checking, compare with **!==** (an x in the DUT output is a failure, not a pass), print **failing vectors** (input values plus expected vs got) so failures are debuggable without re-running, and keep a **counter** so one run reports all errors rather than stopping at the first. For sequential blocks the same skeleton reappears with tasks for the operations and the reference model updated per cycle — lesson 3 shows exactly that.',
    deepDive:
      '### Why !== and not !=\n\nIn Verilog, x (unknown) is contagious: if the DUT output is x and you compare with !=, the comparison result is x, and `if (x)` is treated as false — so a broken output would PASS. The case-inequality operator !== treats x and z as real values that fail equality. Rule: checkers always use !== / ===. This is one of the highest-frequency bugs in beginner testbenches, and it manufactures false confidence silently.\n\n### Where the reference model comes from\n\nThree honest sources, in rising order of power: (1) **language arithmetic** — when the DUT implements a function the testbench language also has (adders, comparators, shifts): free and exact; (2) **a golden behavioral model** — a small always-block or function written from the spec, updated in parallel with the DUT: works for sequential blocks (counters, FIFOs) and must itself be reviewed like RTL; (3) **hardcoded golden values** — a table of input->output pairs: acceptable for small enumerable cases, but it does not scale and each entry is a chance for a transcription typo, which is why the exhaustive loop above prefers computing expectations. Whatever the source, the model is derived from the SPEC, never from the RTL (re-read Module 01 lesson 1: the RTL cannot judge itself).\n\n### Timing hygiene: drive on negedge, check after settle\n\nRace-free testbenches follow a clock discipline: change inputs on the **negedge** (or well before the posedge), let the posedge sample them, then check outputs after a small settle delay. In the combinational adder there is no clock, so #1 after the assignment suffices. In sequential tests (lesson 3) the pattern is: @(negedge clk) to apply stimulus, @(posedge clk) #1 to check. Adopting this habit early prevents the "it works when I add a #2" class of flaky testbenches.\n\n### Runnable here, honestly\n\nThis lesson is plain Verilog-2001: the platform grader (Icarus Verilog) compiles and runs every example and exercise exactly as shown. That is deliberate — self-checking fundamentals should be practiced where they can actually execute, and the same structure ports to constrained-random environments later.',
    examples: [
      {
        title: 'DUT: the 4-bit adder under test',
        language: 'verilog',
        code:
        '// Verilog-2001 DUT (runnable on this platform)\nmodule adder4(\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    input  wire       cin,\n    output wire [3:0] sum,\n    output wire       cout\n);\n    assign {cout, sum} = a + b + cin;   // 5-bit result: carry + 4-bit sum\nendmodule',
        explanation: [
          'The concatenation {cout, sum} is the full 5-bit arithmetic result — the natural checking surface.',
          'Any bug in a, b, cin handling shows up as a mismatch against the testbench arithmetic reference.',
        ],
      },
      {
        title: 'The self-checking exhaustive testbench',
        language: 'verilog',
        code:
        '// Verilog-2001 testbench (runnable on this platform)\n`timescale 1ns/1ps\nmodule tb_adder4;\n    reg  [3:0] a, b;\n    reg        cin;\n    wire [3:0] sum;\n    wire       cout;\n\n    integer ia, ib, ic;\n    integer errors;\n    reg [4:0] expected;\n\n    adder4 dut(.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));\n\n    initial begin\n        errors = 0;\n        for (ia = 0; ia < 16; ia = ia + 1)\n          for (ib = 0; ib < 16; ib = ib + 1)\n            for (ic = 0; ic < 2; ic = ic + 1) begin\n                a   = ia[3:0];\n                b   = ib[3:0];\n                cin = ic[0];\n                #1;                                  // settle\n                expected = ia + ib + ic;             // reference model\n                if ({cout, sum} !== expected) begin  // x-aware compare\n                    errors = errors + 1;\n                    $display("FAIL a=%0d b=%0d cin=%0d got=%b exp=%b",\n                             a, b, cin, {cout, sum}, expected);\n                end\n            end\n        if (errors == 0)\n            $display("ALL TESTS PASSED (512 vectors)");\n        else\n            $display("FAILED: %0d errors", errors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'Three nested loops cover all 16 x 16 x 2 = 512 input combinations — exhaustive is affordable for small combinational blocks.',
          'expected = ia + ib + ic is the reference model: simulator arithmetic standing in for the spec "sum with carry".',
          'The comparison uses !== so an x or z output is a failure. With != a broken (x) output would silently pass.',
          'FAIL lines print the full input vector plus got/exp — each failure is debuggable without re-running.',
          'Output for a correct adder: exactly one line, "ALL TESTS PASSED (512 vectors)". Output for a buggy adder: N FAIL lines then "FAILED: N errors".',
        ],
      },
      {
        title: 'A deliberately broken DUT: what the log looks like',
        language: 'verilog',
        code:
        '// Verilog-2001: same testbench against a buggy DUT (cin ignored)\nmodule adder4_buggy(\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    input  wire       cin,\n    output wire [3:0] sum,\n    output wire       cout\n);\n    assign {cout, sum} = a + b;       // BUG: cin dropped\nendmodule\n\n// Instantiating tb_adder4 with this DUT prints, for every odd result:\n//   FAIL a=0 b=0 cin=1 got=00000 exp=00001\n//   FAIL a=0 b=1 cin=1 got=00001 exp=00010\n//   ... (256 failing vectors: every case with cin=1)\n//   FAILED: 256 errors',
        explanation: [
          'Every vector with cin=1 mismatches (the sum is one low), and the count is exactly 256 = 16x16 vectors with cin=1.',
          'The log pattern (which vectors fail) localizes the bug instantly: all failures have cin=1, so the carry input path is dead.',
          'This negative-test habit — deliberately break the DUT and confirm the checker catches it — is how you prove the testbench itself works.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Self-checking testbench anatomy',
        content:
        '   STIMULUS                DUT                 REFERENCE MODEL\n   (loops/tasks)      +-------------+       (spec-derived, independent)\n    a,b,cin  -------> |   adder4    |          ia + ib + ic\n    every vector      +------+------+                  |\n                             |  got                   | exp\n                             +--------+  +------------+\n                                      v  v\n                                 COMPARATOR (!==)\n                                      |\n                        mismatch -> FAIL msg + errors++\n                                      |\n                                      v\n                          VERDICT: PASSED / FAILED (count)\n\n   Three required parts:\n   1. reference model (from SPEC, never from the RTL)\n   2. x-aware comparison with error counter\n   3. final PASS/FAIL summary line (script-readable)',
        caption:
          'The pattern that every later structure (scoreboards, regressions) scales up: model, compare, count, verdict.',
      },
    ],
    tables: [
      {
        caption: 'Reference-model sources and when to use them',
        headers: ['Source', 'Best for', 'Risk', 'Example'],
        rows: [
          ['Language arithmetic', 'Functions the TB language also has', 'None worth noting', 'adder4 expected = ia+ib+ic'],
          ['Golden behavioral model', 'Sequential blocks (counters, FIFOs)', 'Model must be reviewed like RTL', 'exp_q updated per clock'],
          ['Hardcoded golden table', 'Small enumerable cases', 'Transcription typos; does not scale', 'expected[ia][ib][ic] tables'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Comparing with != or == instead of !== / === in checkers.',
        fix: 'If the DUT output is x, `x != expected` evaluates to x, and `if (x)` takes the false branch — the bug PASSES. Checkers must use !== so x and z fail loudly.',
      },
      {
        mistake: 'Stopping the test at the first mismatch (or printing thousands of lines).',
        fix: 'Count errors and keep running (with a cap, e.g. report the first 20), so one run shows the failure PATTERN (all cin=1 fails) instead of a single point.',
      },
      {
        mistake: 'Building the reference model by copying the DUT code.',
        fix: 'A model copied from the RTL copies its bugs. Derive the model from the spec (or use language arithmetic), and review it like a deliverable. A checker that agrees with the DUT by construction checks nothing.',
      },
    ],
    guidedPractice: {
      title: 'Self-check a 2-bit magnitude comparator',
      brief:
        'Write the self-checking exhaustive testbench for a 2-bit comparator with outputs gt, eq, lt. Loop over all 16 input pairs, compute expected gt/eq/lt from the loop indices, count errors, print the verdict. State the exact final line for a correct DUT.',
      starterCode:
        '`timescale 1ns/1ps\nmodule tb_cmp2;\n    // reg a, b; wire gt, eq, lt; integer ia, ib, errors;\n    // comparator DUT here or assume cmp2 exists\n    initial begin\n        // loops, reference model, !== compare, counter, verdict\n    end\nendmodule',
      expectedBehavior:
        'Two nested loops (ia, ib from 0 to 3), 16 vectors; expected: gt = (ia > ib), eq = (ia == ib), lt = (ia < ib); compare all three with !== and count errors. For a correct DUT the final line is exactly: ALL TESTS PASSED (16 vectors).',
      hints: [
        'Drive a = ia[1:0], b = ib[1:0] after #1 settle.',
        'Three comparisons per vector, all !==.',
        'The verdict format matches the adder example.',
      ],
    },
    practiceExercises: [
      {
        title: 'Add the failure cap',
        brief:
          'Modify the adder testbench so it prints at most the first 20 failures but still counts all of them, and says "PRINT TRUNCATED" if it hit the cap. State what the final line prints for the buggy cin-dropping DUT.',
        expectedBehavior:
          'A counter plus condition (errors <= 20) around the $display, and a flag for truncation. For the buggy DUT: 20 FAIL lines, then FAILED: 256 errors (PRINT TRUNCATED). The count stays complete even though printing stopped.',
        hints: [
          'Two integers: errors counts everything, printed counts up to 20.',
          'Set a truncated flag when skipping the 21st print.',
          'The verdict must always print the true total.',
        ],
      },
      {
        title: 'Negative-test your own checker',
        brief:
          'Describe (5-8 sentences) the procedure to prove that your comparator testbench would actually catch a bug, including which bug you inject, what log you expect, and how you return to a clean state.',
        expectedBehavior:
          'Inject a specific defect (e.g. swap gt and lt, or drop the eq case), run, confirm the log shows the expected failing vectors (the swapped rows) and a nonzero error count, then revert and confirm ALL TESTS PASSED. This negative test is the only proof that a green run means something.',
        hints: [
          'Pick a bug with a predictable failure pattern.',
          'A checker that never failed is unproven.',
          'Revert and re-run: the clean state is part of the procedure.',
        ],
      },
    ],
    assessment: {
      title: 'Self-checking testbench checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which comparison must a Verilog checker use so that an x on the DUT output counts as a failure?',
          options: ['!=', '==', '!==', '<='],
          answer: '!==',
          explanation:
            'Case-inequality treats x/z as real values, so x !== expected is TRUE and the failure is caught. With != the comparison yields x and the if takes the false branch.',
          hint: 'The operator that treats x as a value, not as unknown.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'The buggy adder (cin dropped) runs against the exhaustive testbench. How many vectors fail and what is the final line?',
          code: 'assign {cout, sum} = a + b;   // cin ignored\n// tb loops ia,ib in 0..15, ic in 0..1',
          options: [
            '0 errors, ALL TESTS PASSED',
            '128 errors, FAILED',
            '256 errors, FAILED: 256 errors',
            '512 errors, FAILED',
          ],
          answer: '256 errors, FAILED: 256 errors',
          explanation:
            'Every vector with cin=1 mismatches (16x16 = 256); all cin=0 vectors pass. The verdict line reports the true count.',
          hint: 'Which half of the vector space is affected?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'For the exhaustive adder test, using hardcoded 512 golden values is the preferred reference-model style.',
          answer: 'false',
          explanation:
            'Computing expectations from loop indices (ia + ib + ic) is transcription-proof and self-maintaining; hardcoded tables invite typos and do not scale.',
          hint: 'Which style survives a loop-bound change?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Name the three required components of a self-checking testbench (comma-separated, in order: model, comparison, verdict).',
          answer: 'reference model, error counter, PASS/FAIL summary',
          explanation:
            'The reference model computes expectations from the spec; the x-aware comparison counts mismatches; the final summary makes the run script-readable.',
          hint: 'Model, compare, judge.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Self-checking testbench', definition: 'A testbench that computes expected results, compares every observation, counts errors and prints a final verdict.' },
      { term: 'Reference model', definition: 'The spec-derived independent computation of expected behavior; may be language arithmetic, a behavioral model, or golden values.' },
      { term: 'Error counter', definition: 'The running count of mismatches, printed at end of test; enables full-pattern failure reporting.' },
      { term: 'Case-inequality (!==)', definition: 'The x/z-aware comparison operator required in checkers so unknowns fail loudly.' },
      { term: 'Negative test', definition: 'Deliberately injecting a defect to prove the checker catches it; the proof that green runs mean something.' },
    ],
    revisionSummary: [
      'Three parts: reference model (from spec), !== comparison with counter, final verdict line.',
      'Exhaustive loops are affordable for small combinational blocks; compute expectations, do not transcribe.',
      '!== is non-negotiable in checkers; != passes x-contaminated outputs silently.',
      'Print failing vectors with inputs and got/exp so failures are debuggable from the log.',
      'Prove the testbench with a negative test before trusting green runs.',
    ],
    furtherReading: [
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
      { label: 'Wikipedia — Test bench (electronics)', url: 'https://en.wikipedia.org/wiki/Test_bench', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'dver-m02-l2',
    title: 'Checking Resets, Mid-Operation Reset Tests, and VCD Debugging',
    summary:
      'Sequential blocks need reset-specific tests: the mid-operation reset, reference models that track reset, and the VCD workflow for debugging what actually happened.',
    objectives: [
      'Write a mid-operation reset test that proves a counter restarts cleanly.',
      'Maintain a per-cycle reference model through reset and count checks with tasks.',
      'Explain what a VCD file is, how $dumpfile/$dumpvars produce one, and how to use it in debugging.',
      'Recognize how SV assertions express the same checks (concept, labeled SystemVerilog).',
    ],
    whyItMatters:
      'Reset is where sequential designs fail in real systems: the lab hits reset mid-operation, and a block that only resets cleanly from idle will lock up or corrupt data. The mid-operation reset test is the cheapest insurance against the most embarrassing class of field failures — and the reference-model discipline you practice here is exactly what scales into scoreboards.',
    prerequisites: [
      'dver-m02-l1: the self-checking pattern and !== checking',
      'Verilog always blocks and nonblocking assignment',
    ],
    explanation:
      'A **mid-operation reset test** drives the DUT into a non-idle state, asserts reset for exactly one (or a few) cycles while activity is ongoing, then verifies: (1) the state went to the reset value; (2) operation resumes cleanly from that value; (3) no glitch or partial update occurred. The testbench structure is the self-checking pattern plus one new element: a **reference model variable updated in lockstep** with the DUT, including through the reset — so every cycle has an expectation, and the reset cycles have expectations too.\n\nThe worked example uses a 4-bit counter with synchronous enable and reset. The testbench keeps `exp_q`, updates it with the same rule the spec defines (reset wins, then enable), and checks the DUT after every posedge with a #1 settle. Driving on negedge and checking after posedge+#1 gives race-free behavior. The mid-op reset is inserted mid-count with enable still high — the abusive version, because a reset that arrives while the block was busy is the one that happens in the field.\n\n**VCD (Value Change Dump)** is the standard text format for waveform data, and the debugging workflow is: (1) the testbench dumps selected signals with `$dumpfile("name.vcd")` and `$dumpvars(0, tb)`; (2) run the failing case; (3) open the VCD in a waveform viewer (GTKWave is the common open-source choice); (4) navigate to the failing check\'s timestamp ($time from the FAIL line) and read the signal sequence around it. The discipline that makes this fast: keep the FAIL message with `$time` in it, and dump at the testbench top so the dump includes the DUT hierarchy. VCD files get large — dump once for debugging runs, and consider turning dumps off (or scoping them) for big regressions.',
    deepDive:
      '### What the mid-op reset test actually proves (and does not)\n\nIt proves: the state register honors reset at any phase of operation; outputs resume from the reset value; the reference model and DUT stay in lockstep after the disturbance. It does NOT prove: reset *timing* relative to clock edges in asynchronous systems (that is a timing-analysis topic — the STA course covers recovery/removal), or reset behavior in the presence of X-propagation from power-up (a different, harder test). Scope discipline: name what the test covers in the plan row, so nobody believes reset is "fully verified" from one testbench.\n\n### Reset styles and what the TB must model\n\nTwo legal styles exist: **synchronous** reset (sampled at the clock edge — the TB asserts it like any input, effects at posedge) and **asynchronous** reset (immediate — the TB asserts it mid-cycle and the state changes at once, then the model must follow immediately, not at the edge). The reference model must match the DUT\'s style or the test measures the wrong contract. The example uses synchronous reset; the async variant checks the state right after asserting reset *without* waiting for an edge, which requires the #0/#1 hygiene the lesson already teaches. Also plan the reset *release* corner: releasing reset exactly at a clock edge is a real-world hazard (setup/hold on the reset pin) — worth a plan row at P1 for blocks that matter.\n\n### The VCD workflow in practice\n\nA concrete debugging session: the FAIL line says `FAIL t=135 q=1010 exp=0000`. Steps: open the VCD, jump to 135ns, look backward ~3 cycles: what were rst/en? If rst was asserted and q still shows 1010, either the reset path is broken in the RTL or the TB deasserted rst too late. The waveform answers which in one look. Two workflow upgrades: (1) dump DUT *and* TB reference signals together (exp_q next to q) so mismatches are visible without re-running; (2) name dumps per test (`$dumpfile("tb_counter_midrst.vcd")`) so failing runs keep their evidence instead of overwriting each other.\n\n### The same checks as assertions (honest labeling)\n\nEverything above is plain Verilog-2001 and runs on this platform. The SystemVerilog way to express the reset check is a concurrent assertion — concept only here, since SVA needs a full simulator: `assert property (@(posedge clk) rst |=> q == 0);` ("reset followed by zero") and `assert property (@(posedge clk) disable iff (rst) en |=> q == $past(q) + 1);` ("enable advances by one"). Same contract, permanent per-cycle checking instead of a test-loop check. The SystemVerilog course covers the syntax; the point here is recognizing that your testbench checks are formalizable.',
    examples: [
      {
        title: 'DUT: counter with synchronous reset and enable',
        language: 'verilog',
        code:
        '// Verilog-2001 DUT (runnable on this platform)\nmodule counter4(\n    input  wire       clk,\n    input  wire       rst,     // synchronous, active-high\n    input  wire       en,\n    output reg  [3:0] q\n);\n    always @(posedge clk) begin\n        if (rst)     q <= 4\'d0;\n        else if (en) q <= q + 4\'d1;\n    end\nendmodule',
        explanation: [
          'Sync reset has priority over enable; otherwise q increments when enabled.',
          'The TB reference model must mirror exactly this priority: rst wins, then en, else hold.',
        ],
      },
      {
        title: 'Mid-operation reset test with lockstep reference model',
        language: 'verilog',
        code:
        '// Verilog-2001 testbench (runnable on this platform)\n`timescale 1ns/1ps\nmodule tb_counter_midrst;\n    reg  clk = 0, rst = 0, en = 0;\n    wire [3:0] q;\n    reg  [3:0] exp_q = 4\'d0;\n    integer errors = 0;\n\n    counter4 dut(.clk(clk), .rst(rst), .en(en), .q(q));\n\n    always #5 clk = ~clk;                 // 10 ns period\n\n    task check;\n        begin\n            if (q !== exp_q) begin\n                errors = errors + 1;\n                $display("FAIL t=%0t q=%b exp=%b", $time, q, exp_q);\n            end\n        end\n    endtask\n\n    initial begin\n        $dumpfile("tb_counter_midrst.vcd");\n        $dumpvars(0, tb_counter_midrst);  // dump TB + DUT hierarchy\n\n        // phase 1: reset from idle\n        rst = 1; en = 0;\n        @(negedge clk);\n        @(negedge clk);\n        rst = 0;\n        @(posedge clk); #1; check;        // q == 0\n\n        // phase 2: count to a non-idle state (exp_q 0 -> 3)\n        en = 1;\n        repeat (3) begin\n            @(posedge clk); #1;\n            exp_q = exp_q + 4\'d1; check;\n        end                               // exp_q == 3, q == 3\n\n        // phase 3: MID-OPERATION RESET, one cycle, en still high\n        @(negedge clk); rst = 1;\n        @(posedge clk); #1;\n        exp_q = 4\'d0; check;              // reset fired mid-count\n        @(negedge clk); rst = 0;\n\n        // phase 4: clean resume from zero\n        repeat (2) begin\n            @(posedge clk); #1;\n            exp_q = exp_q + 4\'d1; check;  // 1, then 2\n        end\n\n        if (errors == 0) $display("ALL TESTS PASSED");\n        else             $display("FAILED: %0d errors", errors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'exp_q is the lockstep reference: updated at the same moments the spec says the DUT updates, including through reset.',
          'Drive on negedge (rst/en changes), check after posedge with #1 settle: race-free discipline from lesson 1.',
          'Phase 3 is the point of the test: reset asserted while en=1 and q=3. If the DUT ignored mid-operation resets, q would show 4 here and the FAIL line carries the timestamp for the VCD.',
          'Phase 4 proves clean resume: expectations continue from 0, and the exp_q updates mirror the resumed DUT exactly.',
          'Traced expected log for a correct DUT: only "ALL TESTS PASSED". VCD file tb_counter_midrst.vcd captures all phases.',
        ],
      },
      {
        title: 'The same two rules as SystemVerilog assertions (concept)',
        language: 'systemverilog',
        code:
        '// SystemVerilog Assertions — CONCEPT ONLY on this platform:\n// needs a full SV simulator (Icarus does not run assert property).\n// Same contract as the testbench checks above, checked every cycle:\n\n// Rule 1: after a reset cycle, q is zero.\n// a_rst_clears: assert property (@(posedge clk) rst |=> (q == 4\'d0));\n\n// Rule 2: with enable and no reset, q advances by one.\n// a_en_advances: assert property (@(posedge clk) disable iff (rst)\n//                                 en |=> (q == $past(q) + 4\'d1));\n\n// Rule 3: with no enable and no reset, q holds.\n// a_hold: assert property (@(posedge clk) disable iff (rst)\n//                          !en |=> $stable(q));',
        explanation: [
          'These are the testbench checks restated as permanent per-cycle claims — the assertion layer of the same verification plan.',
          '$past(q) is the previous-cycle value; $stable(q) means unchanged. Both formalize what exp_q tracked manually.',
          'Not runnable on this platform (SVA needs a full simulator); shown to connect the course to the SystemVerilog material.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'The mid-operation reset test, cycle by cycle',
        content:
        '         cycle:    1   2   3   4   5   6   7   8   9  10  11\n                    |   |   |   |   |   |   |   |   |   |   |\nclk          ____----__--__--__--__--__--__--__--__--__--__--\nrst          ________--______________--____--______________\n                              ^reset in       ^reset out\nen           ________----------________________--------------\nq (DUT)      ________0000 1   2   3   0   0   1   2  ...\nexp_q (TB)   ________0000 1   2   3   0   0   1   2  ...\n\n  Phase 2: q counts 1,2,3 (en=1).\n  Phase 3: rst=1 while en=1 and q=3 -> q forced to 0 at the edge.\n  Phase 4: resume 1,2 from zero. TB exp_q follows every step.\n  Any q != exp_q prints FAIL with $time for the VCD workflow.',
        caption:
          'Educational waveform (illustrative): the reset arrives mid-count with enable high — the abusive case the field produces.',
      },
    ],
    tables: [
      {
        caption: 'Reset test matrix for a sequential block',
        headers: ['Scenario', 'What is checked', 'Priority'],
        rows: [
          ['Reset from idle', 'State reaches reset value; outputs static', 'P0'],
          ['Reset mid-operation (busy)', 'State clears; clean resume; no partial update', 'P0'],
          ['Reset exactly one cycle (pulse)', 'Full reset effect from a minimum-width pulse', 'P1'],
          ['Reset released at clock edge', 'Defined behavior at the release hazard', 'P1'],
          ['Reset with inputs active (en/ld high)', 'Reset priority beats all inputs', 'P0'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reference model that does not follow reset (exp_q keeps counting through the reset).',
        fix: 'Update exp_q with the spec rule including reset priority, at the same edges the DUT sees. If the model and DUT disagree about reset, the test measures a fiction.',
      },
      {
        mistake: 'Checking at the same edge the inputs change (races).',
        fix: 'Drive on negedge, sample effects after posedge with a small settle (#1). The drive-check separation is what makes the test reproducible instead of flaky.',
      },
      {
        mistake: 'Dumping the whole design for a large regression and drowning in gigabyte VCDs.',
        fix: 'Dump for debugging runs, scope the dump ($dumpvars level and module argument), and name files per test. Turn dumping off (or trim scope) in regression mode.',
      },
    ],
    guidedPractice: {
      title: 'Reset pulse-width test',
      brief:
        'Extend the lesson testbench with phase 5: assert reset for exactly one cycle, then deassert, but this time set en=0 during the reset cycle and re-enable after. Predict exp_q at each check and confirm the DUT and model agree.',
      starterCode:
        '// phase 5: reset pulse with en low\n// @(negedge clk); rst = 1; en = 0;\n// ... complete with checks ...',
      expectedBehavior:
        'Reset cycle: exp_q = 0 (reset fired). The following cycles with en=0: exp_q stays 0 (hold). Re-enable: exp_q steps 1, 2. The full expected sequence after phase 3: 0 (reset), 0 (hold), 1, 2. All checks pass on a correct DUT; the exercise is keeping exp_q honest through the en=0 hold.',
      hints: [
        'Reset wins over en in both DUT and model.',
        'Hold cycles do not change exp_q but still get a check.',
        'Resume continues from 0, not from the pre-reset count.',
      ],
    },
    practiceExercises: [
      {
        title: 'Read the waveform like a debug session',
        brief:
          'A FAIL prints: "FAIL t=135 q=1010 exp=0000". Using the lesson VCD workflow, write the 4-step investigation and the two possible conclusions.',
        expectedBehavior:
          '1) Open tb_counter_midrst.vcd in a viewer. 2) Jump to t=135ns. 3) Inspect rst/en/q around 125-135ns. Conclusions: (a) rst was asserted at the preceding edge but q did not clear — RTL reset path broken; (b) rst was NOT asserted — TB stimulus error (rst driven late/wrong), fix the testbench. The waveform decides which; the FAIL timestamp makes the jump direct.',
        hints: [
          'The FAIL line carries the exact time to jump to.',
          'The question is what rst/en were doing at the sampling edge.',
          'Both conclusions are legitimate; the waveform arbitrates.',
        ],
      },
      {
        title: 'Async reset variant',
        brief:
          'The DUT changes to asynchronous reset (always @(posedge clk or negedge rst_n)). State the two changes the testbench needs: where rst_n is asserted relative to the clock, and when the model (exp_q) updates.',
        expectedBehavior:
          'rst_n asserts mid-cycle (not aligned to an edge) and q clears immediately — so check right after asserting (small settle), without waiting for an edge. exp_q updates at the assertion moment too, mirroring async behavior. The rest of the lockstep loop continues at posedges once rst_n is released.',
        hints: [
          'Async means no edge required for the reset effect.',
          'The model must follow the same immediacy.',
          'Release timing still matters at the next posedge.',
        ],
      },
    ],
    assessment: {
      title: 'Reset testing and VCD checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What makes a mid-operation reset test stronger than a reset-from-idle test?',
          options: [
            'It runs longer',
            'Reset arrives while the block is busy, matching real-system disturbances',
            'It uses more signals',
            'It avoids the reference model',
          ],
          answer: 'Reset arrives while the block is busy, matching real-system disturbances',
          explanation:
            'Field resets hit busy blocks; the mid-op test proves state clears and operation resumes cleanly from the reset value with enable still active.',
          hint: 'Which scenario does the field actually produce?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In the lesson testbench, when are stimulus inputs changed and when are outputs checked?',
          options: [
            'Inputs at posedge, checked at posedge',
            'Inputs at negedge, checked after posedge with a settle delay',
            'Both at time zero',
            'Inputs randomly, checked randomly',
          ],
          answer: 'Inputs at negedge, checked after posedge with a settle delay',
          explanation:
            'The drive-on-negedge/check-after-posedge discipline prevents simulation races and makes every run reproducible.',
          hint: 'Two different edges, two different jobs.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'The lockstep reference variable exp_q must be updated through reset cycles as well, following the spec reset priority.',
          answer: 'true',
          explanation:
            'If the model stops tracking during reset, the resume-phase checks compare against a stale expectation and the test loses meaning.',
          hint: 'Lockstep means every cycle, including disturbed ones.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Which pair of Verilog system tasks produces a waveform file for offline debugging (task names, comma-separated)?',
          answer: '$dumpfile, $dumpvars',
          explanation:
            '$dumpfile("x.vcd") names the file and $dumpvars(0, tb) selects the scope and depth to record; the result opens in any VCD viewer such as GTKWave.',
          hint: 'One names the file, one selects signals.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Mid-operation reset test', definition: 'Asserting reset while the block is busy and verifying clean restart — the field-realistic reset scenario.' },
      { term: 'Lockstep reference model', definition: 'A TB variable updated at the same moments and rules as the DUT, including through reset.' },
      { term: 'VCD (Value Change Dump)', definition: 'The standard text waveform format produced by $dumpfile/$dumpvars and read by viewers like GTKWave.' },
      { term: 'Drive-check discipline', definition: 'Change stimulus on one clock edge, check effects after the next with a settle delay; prevents races.' },
      { term: 'Synchronous vs asynchronous reset', definition: 'Sync: sampled at the clock edge. Async: takes effect immediately; the TB model must match the style.' },
    ],
    revisionSummary: [
      'Reset needs its own scenarios: idle, mid-operation, pulse, edge-release, inputs-active.',
      'Lockstep reference models follow reset priority and make every cycle checked.',
      'Negedge drive, posedge+settle check: the race-free habit.',
      'VCD debugging: FAIL line carries $time; dump TB scope including the reference model.',
      'The same rules formalize as SV assertions (concept-only on this platform).',
    ],
    furtherReading: [
      { label: 'Wikipedia — Value change dump', url: 'https://en.wikipedia.org/wiki/Value_change_dump', kind: 'article' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'dver-m02-l3',
    title: 'Testing Counters and FSMs: Corners, Arcs, and Illegal States',
    summary:
      'The two most common sequential blocks get their characteristic test strategies: counter corners (overflow, load, enable) and FSM coverage (every arc, plus illegal-state recovery).',
    objectives: [
      'Write a corner testbench for a counter with load and enable: wrap, load-vs-enable priority, rollover pulse.',
      'Drive every arc of an FSM from its transition table and check next-state per arc.',
      'Explain illegal-state recovery and how to test it by injecting a bad state encoding.',
      'Map counter and FSM tests onto plan rows with the right check style.',
    ],
    whyItMatters:
      'Counters and FSMs are in every design, and their bugs are stereotyped: a counter that wraps one state early, a load that loses to enable, an FSM arc that was never drawn. The strategies here — corner enumeration for counters, arc-by-arc driving plus fault injection for FSMs — generalize to any sequential block you will verify, and they are exactly what a reviewer asks: "did you test the wrap? did you test every transition?"',
    prerequisites: [
      'dver-m02-l1/l2: self-checking pattern, lockstep models, reset testing',
      'FSM design from the Verilog course (state registers, next-state logic)',
    ],
    explanation:
      '**Counter corners.** A counter is a small state machine whose "states" are its count values, so its interesting scenarios are boundary ones: the wrap (max -> 0, with the rollover pulse exactly one cycle wide), load priority (load beats enable when both are high — or does it? the spec decides and the test checks), enable masking (en=0 holds), and load-while-wrapping (d replaces the wrap). Each corner gets a directed sequence plus the lockstep-model check from lesson 2; the model is one line (`exp_q <= ld ? d : en ? exp_q+1 : exp_q`) which makes the whole testbench short and trustworthy.\n\n**FSM arc coverage.** An FSM specification is a transition table; its natural test is to drive **every arc** at least once and check the destination state per arc. Practically: enumerate the table (state, input-condition, next-state), write a directed sequence that reaches each row, and check state (or its behavioral consequence) after each transition. For a traffic-light or UART-style FSM this is 6-20 directed rows — perfectly manageable — and it is the direct analog of code-coverage "branch coverage" but at the protocol level, which is what actually matters.\n\n**Illegal-state recovery.** A binary-encoded n-state FSM has more encodings than states (4 states in 2 bits leaves no spares, but 5 states in 3 bits leaves 3 illegal encodings). What does the spec require when the FSM somehow lands in an illegal encoding (SEU, glitch, bug)? Usually: return to a safe state. The test injects the illegal encoding into the state register (`force dut.state = 3\'b101;`) and verifies recovery within the spec\'s bound. This is a fault-injection test — it uses `force`, a testbench-only construct — and it belongs in the plan as its own row because no amount of legal stimulus ever produces an illegal state.',
    deepDive:
      '### The counter model is one line — use it\n\n`exp_q <= rst ? 0 : ld ? d : en ? exp_q + 1 : exp_q;` in the TB, evaluated on the same edges, makes every corner checkable by comparison instead of by hand-derived golden numbers. The corners then become *stimulus sequences*, not special checker code: wrap happens naturally by counting 17 cycles; load-vs-enable is two inputs set simultaneously; load-into-wrap is a load timed at q==15. Short models are reviewable models — a reviewer can verify the one-liner against the spec in ten seconds, which is the real reason to prefer it over clever golden tables.\n\n### Reading the FSM table into tests\n\nTake the FSM spec as a table: (current state, input condition) -> (next state, outputs). For each row write: the path to reach the current state (or reuse the previous test\'s end state), the input condition, and the check that next state and outputs match. Two practical upgrades: (1) **sequence the rows** so most arcs chain from the previous arc — fewer setup steps; (2) for arcs guarded by multi-cycle conditions (req held 2 cycles), the check is on the *timing* too: assert the arc fires on the right cycle, not just eventually. Output-generality: also check outputs on arcs where the spec defines them — next-state-only checking misses Mealy-output bugs.\n\n### Illegal-state injection, precisely\n\nVerilog `force`/`release` lets a testbench override a signal: `force dut.state = 3\'b101;` then one clock later `release dut.state;`. The FSM now stands in an encoding no legal stimulus reaches. The check: within the spec-declared bound (often "next cycle" or "within N cycles"), state must reach a designated safe state (usually IDLE). Notes: `force` is a simulation construct (works on this platform with Icarus), it is only for fault injection — never for normal stimulus — and if the spec says nothing about illegal states, that is a spec gap to file (the safe answer is a default branch that recovers; the silent answer is undefined lockup, which you want discovered now, not in the field). This pairs with the design-side guideline: every FSM case statement gets a default that recovers.\n\n### Mapping to the plan\n\nThese tests are plan rows like any other: V-row "counter wrap + rollover pulse width" (check: lockstep model + rollover exactly at wrap), V-row "FSM all arcs" (check: next state per arc — often decomposed one row per arc group), V-row "illegal state recovery" (check: forced encoding reaches safe state in bound). The check-style column will say: lockstep model for counters, direct expectation for arcs, fault injection for recovery.',
    examples: [
      {
        title: 'DUT: counter with load, enable, rollover',
        language: 'verilog',
        code:
        '// Verilog-2001 DUT (runnable on this platform)\nmodule counter4_ld(\n    input  wire       clk,\n    input  wire       rst,    // sync, priority 1\n    input  wire       ld,     // sync load, priority 2\n    input  wire       en,     // count enable, priority 3\n    input  wire [3:0] d,\n    output reg  [3:0] q,\n    output wire       rollover // 1 during the cycle q==15 and counting\n);\n    always @(posedge clk) begin\n        if (rst)  q <= 4\'d0;\n        else if (ld) q <= d;\n        else if (en) q <= q + 4\'d1;\n    end\n    assign rollover = (q == 4\'d15) && en && !ld && !rst;\nendmodule',
        explanation: [
          'Priority order rst > ld > en is explicit; the rollover definition says "this cycle counts toward the wrap".',
          'The spec nuance the TB must check: rollover is suppressed when ld or rst masks the count — a classic ambiguity to pin down.',
        ],
      },
      {
        title: 'Corner testbench with a one-line model',
        language: 'verilog',
        code:
        '// Verilog-2001 testbench (runnable on this platform)\n`timescale 1ns/1ps\nmodule tb_counter_corners;\n    reg clk = 0, rst = 0, ld = 0, en = 0;\n    reg  [3:0] d = 0;\n    wire [3:0] q;\n    wire rollover;\n    reg  [3:0] exp_q = 0;\n    reg  exp_ro;\n    integer errors = 0;\n\n    counter4_ld dut(.clk(clk), .rst(rst), .ld(ld), .en(en),\n                    .d(d), .q(q), .rollover(rollover));\n\n    always #5 clk = ~clk;\n\n    task step;                 // advance one cycle with current inputs\n        begin\n            @(negedge clk);\n            // model evaluates with the inputs the DUT will sample\n            exp_ro  = (exp_q == 4\'d15) && en && !ld && !rst;\n            exp_q   = rst  ? 4\'d0 :\n                      ld   ? d    :\n                      en   ? exp_q + 4\'d1 : exp_q;\n            @(posedge clk); #1;\n            if (q !== exp_q || rollover !== exp_ro) begin\n                errors = errors + 1;\n                $display("FAIL t=%0t q=%b exp=%b ro=%b exp_ro=%b",\n                         $time, q, exp_q, rollover, exp_ro);\n            end\n        end\n    endtask\n\n    initial begin\n        // corner A: reset\n        rst = 1; step;                 // exp_q = 0\n        rst = 0;\n        // corner B: free-run to the wrap and through it (17 cycles)\n        en = 1;\n        repeat (17) step;              // crosses 15 -> 0, rollover at 15\n        // corner C: load wins over enable at the same cycle\n        ld = 1; d = 4\'d9; step;        // exp_q = 9 even though en=1\n        ld = 0;\n        // corner D: load into the wrap: q=15 then load replaces count\n        ld = 1; d = 4\'d15; step;       // q=15\n        ld = 0; en = 1; step;          // counts to wrap edge: exp ro=1\n        ld = 1; d = 4\'d7; step;        // load masks the wrap: ro must be 0\n        ld = 0; en = 0; step;          // hold\n        if (errors == 0) $display("ALL TESTS PASSED");\n        else             $display("FAILED: %0d errors", errors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'One task (step) drives one cycle and checks both q and rollover against the one-line model — every corner is then just a stimulus sequence.',
          'Corner B crosses the wrap: exp_q reaches 15 (rollover=1 that cycle) then 0; a wrap-early bug fails here.',
          'Corner C is the interaction: ld=1 with en=1 — the model says load wins; a priority bug in the RTL fails immediately.',
          'Corner D is the subtle one: loading 15 then counting sets up the wrap, and loading 7 at the wrap moment must suppress rollover — matching the DUT definition exactly.',
          'Trace: after corner B exp_q=0 (17 increments from 0 wrap once); corner C makes it 9; D: 15, then 0 (wrap), then 7, then hold at 7.',
        ],
      },
      {
        title: 'FSM arc driving and illegal-state recovery',
        language: 'verilog',
        code:
        '// Verilog-2001: FSM test patterns (runnable on this platform)\n// DUT: 3-state FSM with state reg visible as dut.state (2 bits)\n// localparams in DUT: IDLE=0, RUN=1, DONE=2\n\n`timescale 1ns/1ps\nmodule tb_fsm;\n    reg clk = 0, rst = 0, go = 0, done_in = 0;\n    wire [1:0] state;\n    integer errors = 0;\n\n    // fsm3 dut(.clk(clk), .rst(rst), .go(go), .done_in(done_in), .state(state));\n    // (assume fsm3: IDLE -go-> RUN -done_in-> DONE -always-> IDLE)\n    wire [1:0] state_unused = 2\'b00; assign state = state_unused;\n\n    always #5 clk = ~clk;\n\n    task expect_state(input [1:0] s, input [127:0] label);\n        begin\n            // state here is dut.state in real use\n            if (state !== s) begin\n                errors = errors + 1;\n                $display("FAIL %0s: state=%b exp=%b", label, state, s);\n            end\n        end\n    endtask\n\n    initial begin\n        // arc 1: IDLE -go-> RUN\n        rst = 1; go = 0; done_in = 0;\n        @(negedge clk); rst = 0;\n        @(negedge clk); go = 1;             // apply arc input\n        @(posedge clk); #1; expect_state(2\'b01, "IDLE->RUN");\n        // arc 2: RUN -done_in-> DONE\n        @(negedge clk); go = 0; done_in = 1;\n        @(posedge clk); #1; expect_state(2\'b10, "RUN->DONE");\n        // arc 3: DONE -> IDLE (unconditional)\n        @(negedge clk); done_in = 0;\n        @(posedge clk); #1; expect_state(2\'b00, "DONE->IDLE");\n\n        // illegal-state injection (fault test)\n        // force dut.state = 2\'b11;  // illegal encoding (only 0,1,2 legal)\n        // @(posedge clk); #1;\n        // expect_state(2\'b00, "illegal->IDLE recovery");\n        // release dut.state;\n\n        if (errors == 0) $display("ALL TESTS PASSED");\n        else             $display("FAILED: %0d errors", errors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'Each arc is one directed row: reach the state, apply the guard input, check the next state one cycle later.',
          'Arcs chain (IDLE->RUN->DONE->IDLE), so setup cost is minimal — the sequencing trick from the deep dive.',
          'The commented force/release block is the illegal-state fault injection: 2\'b11 is an encoding no legal transition produces; the FSM must recover to IDLE.',
          'The task takes a label so FAIL lines name the arc — small cost, enormous debugging value.',
          'In a real run, state is dut.state (hierarchical read); the wire stub here keeps the listing self-contained.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'Arc coverage on the example FSM',
        content:
        '              +------+  go   +------+  done_in  +------+\n              | IDLE | ----> | RUN  | --------> | DONE |\n              +------+       +------+           +------+\n                 ^  ^                                 |  |\n                 |  +---------------------------------+  |\n                 |        (arc 3: unconditional)         |\n                 +---------------------------------------+\n\n  Arc table -> test rows:\n    arc 1: IDLE -go-> RUN        (check state=RUN)\n    arc 2: RUN  -done_in-> DONE  (check state=DONE)\n    arc 3: DONE -> IDLE          (check state=IDLE)\n    fault: state=2\'b11 (forced)  (check recovery to IDLE)\n\n  Every arc driven at least once = FSM branch coverage at the\n  protocol level; the fault row covers what legal stimulus cannot.',
        caption:
          'The transition table becomes the test list; illegal encodings need fault injection, not stimulus.',
      },
    ],
    tables: [
      {
        caption: 'Counter corner checklist (plan-ready)',
        headers: ['Corner', 'Stimulus', 'Check'],
        rows: [
          ['Wrap max -> 0', 'Free-run 17 cycles from 0', 'exp_q wraps once; rollover exactly 1 cycle at 15'],
          ['Rollover masking', 'ld or rst active at the wrap cycle', 'rollover suppressed'],
          ['Load vs enable', 'ld=1 and en=1 same cycle', 'q == d (spec priority)'],
          ['Load into wrap', 'q=15, then ld with new d', 'no rollover; q == d'],
          ['Enable hold', 'en=0 with no ld/rst', 'q unchanged (lockstep model)'],
          ['Reset priority', 'rst=1 with ld/en high', 'q == 0'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Testing only the wrap value and not the rollover pulse width.',
        fix: 'Check that rollover is asserted exactly during the q==15 counting cycle and low the cycle after — a two-cycle-high or late pulse is a real bug the value check misses.',
      },
      {
        mistake: 'Assuming FSM arc coverage from stimulus that "goes through" the FSM.',
        fix: 'Stimulus traveling a path proves only that path. Enumerate the transition table and drive every arc deliberately; unvisited arcs are the bugs.',
      },
      {
        mistake: 'Forgetting illegal-state recovery entirely (or testing it without a spec bound).',
        fix: 'Plan a fault-injection row: force each illegal encoding, require recovery to the safe state within the spec bound. No bound in the spec? File the spec gap first.',
      },
    ],
    guidedPractice: {
      title: 'Extend the corner testbench',
      brief:
        'Add corner E: hold at the wrap edge (en=0 while q==15) and confirm rollover stays 0; then corner F: rst during load (rst=1, ld=1, d=9) and confirm q==0. Use the step task; state the model values after each.',
      starterCode:
        '// corners E and F using the step task from the lesson\n// E: en=0, q==15 -> rollover must be 0, q holds at 15\n// F: rst=1, ld=1, d=9 -> q==0',
      expectedBehavior:
        'E: exp_q stays 15 and exp_ro = 0 (en=0 masks rollover); q checks 15. F: exp_q = 0 (rst wins over ld), exp_ro = 0; q checks 0. Two more plan corners covered with zero new checker code.',
      hints: [
        'The model already encodes both priorities.',
        'E tests the en-mask on rollover; F tests rst-over-ld priority.',
        'No checker changes needed — only stimulus.',
      ],
    },
    practiceExercises: [
      {
        title: 'Write the arc table for a mod-6 counter',
        brief:
          'A mod-6 counter counts 0..5 then wraps. Write its arc table (state, condition, next) and the directed stimulus that drives every arc, including the wrap arc. Note where a plain 4-bit counter test would fail this DUT.',
        expectedBehavior:
          'Arcs: 0->1, 1->2, 2->3, 3->4, 4->5 (en=1 each), 5->0 (wrap arc). Directed: free-run 7 cycles from 0 with the lockstep model `exp_q == (exp_q+1) % 6`. Difference: a 4-bit model never wraps at 5 — the mod-6 wrap check requires the mod in the model, or a bug that counts to 6 passes unnoticed.',
        hints: [
          'Six arcs, one wrap.',
          'The model must implement the modulo, not the width.',
          'Counting to 6 is the bug class here.',
        ],
      },
      {
        title: 'Justify the fault row',
        brief:
          'A designer says illegal-state testing is unnecessary because "the FSM can never get there". Write the 5-sentence rebuttal naming two real paths to illegal states and the cost of skipping the test.',
        expectedBehavior:
          'Paths: (1) the state register itself can be corrupted (SEU in radiation environments, power glitch, or a synthesis/tool bug); (2) a bug elsewhere (reset race, x-propagation at power-up) can leave illegal encodings in the register. The one-line default recovery branch plus one fault row is minutes of work; skipping it means the failure mode, if real, is discovered at bring-up or in the field as an unexplainable lockup.',
        hints: [
          'Never-get-there assumes no faults and no bugs.',
          'What does the default branch cost?',
          'Where would the lockup be discovered otherwise?',
        ],
      },
    ],
    assessment: {
      title: 'Counters and FSMs checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'The rollover output should be checked for what, beyond being 1 during the wrap cycle?',
          options: [
            'That it is also 1 one cycle later (pulse stretching)',
            'That it is 0 again the cycle after the wrap (exactly one cycle wide)',
            'That it matches d',
            'Nothing else',
          ],
          answer: 'That it is 0 again the cycle after the wrap (exactly one cycle wide)',
          explanation:
            'Pulse width is the bug: a rollover that stays high two cycles corrupts any downstream single-pulse logic. The corner test checks the full timeline, not just the peak.',
          hint: 'Pulses have a width, not just a value.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What does driving every arc of an FSM prove that path-based stimulus does not?',
          options: [
            'That outputs are glitch-free',
            'That every specified transition fires to its specified destination',
            'That the FSM is fast enough',
            'That reset works',
          ],
          answer: 'That every specified transition fires to its specified destination',
          explanation:
            'Stimulus that traverses the FSM proves only the arcs it used. Arc-table-driven tests prove each transition row of the spec.',
          hint: 'Coverage of the table, not of a walk.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Illegal-state recovery is tested by constraining stimulus cleverly so the FSM wanders into an illegal encoding.',
          answer: 'false',
          explanation:
            'Legal stimulus cannot reach illegal encodings by definition. The test uses fault injection (force on the state register) plus release, then checks recovery within the spec bound.',
          hint: 'How do you reach a state no input sequence reaches?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Which Verilog testbench construct injects a value into a DUT register for fault injection (one word)?',
          answer: 'force',
          explanation:
            'force dut.state = 3\'b101; overrides the register; release restores normal drive. Simulation-only, for fault tests.',
          hint: 'Its name says what it does.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Corner (counter)', definition: 'A boundary scenario: wrap, load-vs-enable priority, rollover masking, hold, reset priority.' },
      { term: 'Rollover pulse', definition: 'The one-cycle-wide indicator asserted during the counting cycle that wraps the counter.' },
      { term: 'Arc coverage', definition: 'Driving every transition of the FSM transition table at least once with per-arc next-state checks.' },
      { term: 'Illegal-state recovery', definition: 'Behavior (usually return to a safe state) required when the FSM holds an encoding outside its legal set.' },
      { term: 'force / release', definition: 'Testbench-only fault-injection constructs overriding a signal value; never used for normal stimulus.' },
    ],
    revisionSummary: [
      'Counter corners: wrap, rollover width and masking, load priority, hold, reset priority — all via one-line lockstep model.',
      'FSM tests: enumerate the transition table, drive every arc, check next state (and outputs) per arc.',
      'Chain arcs to minimize setup; name arcs in FAIL messages.',
      'Illegal encodings need fault injection (force/release) with a spec-declared recovery bound.',
      'Each test maps to a plan row with its check style named.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Finite-state machine', url: 'https://en.wikipedia.org/wiki/Finite-state_machine', kind: 'article' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 45,
  },
];
