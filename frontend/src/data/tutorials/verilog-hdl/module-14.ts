import type { TutorialLesson } from '../types';

// Module 14 — Testbenches & Simulation
export const module14Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m14-l1',
    title: 'Testbench Anatomy: Stimulus, Clock, Reset',
    summary:
      'Build the standard testbench skeleton: no ports, DUT instance, clock generator, reset sequence, and stimulus with deliberate timing.',
    objectives: [
      'Assemble the standard testbench structure and justify each part.',
      'Generate a clock with the forever-equivalent always-delay idiom and control reset timing.',
      'Drive stimulus with initial blocks and deliberate between-edge timing.',
      'Choose between $finish and $stop correctly.',
    ],
    whyItMatters:
      'The testbench is your laboratory: the DUT is the experiment, stimulus is the procedure, and displays are the instruments. A sloppy harness produces ambiguous evidence; a disciplined one — clean clock, deliberate reset timing, between-edge stimulus — produces results you can act on. Every lesson so far sketched testbenches; this module makes them systematic.',
    prerequisites: ['vlog-m06-l1', 'vlog-m13-l2'],
    explanation:
      'A testbench is a Verilog module with **no ports** — it IS the outside world. Its fixed anatomy:\n\n1. **Signal declarations**: regs for everything the testbench DRIVES (DUT inputs), wires for everything it OBSERVES (DUT outputs).\n2. **DUT instantiation**: named connections, exactly like any module (module 02-l3).\n3. **Clock generation**: the idiomatic pair `initial clk = 0; always #5 clk = ~clk;` — a 10-time-unit period, running forever (the always-with-delay form is sim-only by nature).\n4. **Reset sequence**: assert at t=0, release between clock edges (module 09-l1 timing), sized to cover startup.\n5. **Stimulus**: one or more initial blocks applying inputs with #delays — changed BETWEEN edges so each value is cleanly sampled.\n6. **Termination**: `$finish` ends the simulation (print summary first); `$stop` suspends it (interactive debugging, simulator-dependent behavior).\n\nTiming discipline for stimulus: drive data between edges, never exactly at them. Changing an input at the same simulation instant as a clock edge creates race-y sampling questions (does the flop see the old or new value? — the answer depends on delta ordering you should not rely on). The professional pattern: change inputs a half-period away from edges, or use negedge of the clock for stimulus driving posedge-clocked DUTs.',
    deepDive:
      '### Clock periods and timescale\n\n`` `timescale 1ns/1ps `` sets the unit (1 ns) and precision (1 ps) for delays in that file: `#5` means 5 ns. The period choice is arbitrary in RTL simulation (zero-delay logic: only ORDER matters, not absolute time) — but readable periods (10 units) and a precision finer than any delay you use prevent rounding surprises. The clock generator must never be in the DUT file: it is harness-only, sim-only.\n\n### Multiple initial blocks: concurrency in the harness\n\nTestbenches commonly run several initial blocks (clock seed, reset, stimulus, monitor) — all alive concurrently, exactly like hardware blocks (module 01). Ordering BETWEEN blocks at the same time step is undefined (module 07): never build stimulus where one initial must "run before" another at t=0. Use explicit delays to sequence: the reset block releases at #12; the stimulus block waits #20 before its first vector — deliberate, order-independent.\n\n### Loop-driven stimulus\n\nHand-writing 100 vectors is unmaintainable; loops generate them: `for (i = 0; i < 256; i = i + 1) begin {a, b} = i; #10; end` sweeps all 8-bit adder inputs in one block. Combine with tasks (module 13-l2) for per-vector checking, and with $random (simulation-only system function) for randomized vectors — the seed of constrained-random verification, which module 14-l2 develops into directed-random hybrid testing.',
    examples: [
      {
        title: 'The complete standard skeleton, annotated',
        language: 'verilog',
        code:
          '// tb_standard.v — the course-standard testbench anatomy\n`timescale 1ns/1ps\nmodule tb_standard;\n    // 1. Declarations: drive with regs, observe with wires.\n    reg        clk;\n    reg        reset_n;\n    reg  [3:0] a, b;\n    wire [3:0] sum;\n    wire       cout;\n\n    // 2. DUT instance (named connections).\n    adder4_wide dut (\n        .a(a), .b(b), .cin(1\'b0),\n        .sum(sum), .cout(cout)\n    );\n\n    // 3. Clock generator: 10-unit period, runs forever. SIM-ONLY.\n    initial clk = 1\'b0;\n    always  #5 clk = ~clk;\n\n    // 4. Reset: assert at t=0, release BETWEEN edges (edges at 5,15,25...).\n    initial begin\n        reset_n = 1\'b0;\n        #12  reset_n = 1\'b1;      // released mid-period, before the t=15 edge\n    end\n\n    // 5. Stimulus: vectors applied between edges.\n    initial begin\n        a = 4\'d0; b = 4\'d0;\n        #20  {a, b} = {4\'d7, 4\'d9};    // t=20 (between edges 15 and 25)\n        #10  {a, b} = {4\'d15, 4\'d15};  // t=30\n        #10  {a, b} = {4\'d1, 4\'d1};    // t=40\n        #10;\n        $display("simulation complete");\n        $finish;                        // 6. Terminate\n    end\nendmodule',
        explanation: [
          'Six numbered parts: declarations, instance, clock, reset, stimulus, termination — every testbench in this course follows this shape.',
          'The DUT is the module 05 wide adder; cin is tied directly to 1\'b0 in the connection (constant connections are legal and explicit).',
          'Clock: seed + always-delay toggle — period 10, edges at t=5, 15, 25, 35...',
          'Reset released at t=12: between the t=5 and t=15 edges, so the first sampling edge (t=15) sees reset_n=1 — clean, race-free.',
          'Stimulus changes at t=20, 30, 40 — all mid-period (between edges), never at an edge: each vector is sampled exactly once by the following edge.',
          'All delay/initial/always-# constructs are sim-only by nature; the DUT file contains none of them.',
        ],
      },
      {
        title: 'Loop-driven exhaustive stimulus with a monitor-style report',
        language: 'verilog',
        code:
          '// tb_sweep.v — SIM-ONLY: exhaustive 8-row sweep, tabulated output\n`timescale 1ns/1ps\nmodule tb_sweep;\n    reg        clk, reset_n;\n    reg  [3:0] a, b;\n    wire [3:0] sum;\n    wire       cout;\n    integer    i;\n\n    adder4_wide dut (.a(a), .b(b), .cin(1\'b0), .sum(sum), .cout(cout));\n\n    initial clk = 1\'b0;\n    always #5 clk = ~clk;\n\n    initial begin\n        reset_n = 0; a = 0; b = 0;\n        #12 reset_n = 1;\n        #3;                             // t=15: aligned to just AFTER an edge\n        for (i = 0; i < 8; i = i + 1) begin\n            {a, b} = i[5:0];            // a = bits 5:4, b = bits 3:0\n            @(negedge clk);             // drive at the falling edge:\n                                        // half a period before the NEXT posedge\n            #1;                         // small settle margin\n            $display("a=%0d b=%0d -> sum=%0d cout=%b", a, b, sum, cout);\n        end\n        $finish;\n    end\nendmodule',
        explanation: [
          'The loop enumerates vectors; the concatenation {a, b} = i[5:0] puts i\'s bits 5:4 into a and bits 3:0 into b. For i = 0..7 the upper bits are 0, so this sweep covers a=0 with b=0..7 — a directed subset; full coverage needs i to run to 255.',
          'Stimulus timing uses @(negedge clk): driving exactly at the falling edge guarantees the value is stable half a period before the next rising edge — the race-free driving idiom for posedge DUTs.',
          '#1 after the negedge lets combinational outputs settle before the display (the standing habit).',
          'Expected output rows (a=0): sum = b, cout = 0 for all eight rows — the display lines follow from the adder function.',
          'This loop + display pattern becomes self-checking in the next lesson by replacing the display with a task that COMPARES against expected values.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Stimulus timing: drive between edges (educational waveform, illustrative)',
        content:
          '  clk     _|▔|_|▔|_|▔|_|▔|_\n             e1    e2    e3\n  a/b     --X-------X-------X---   changes mid-period (X = new vector)\n          safe: each vector stable\n          across exactly one posedge\n\n  RISKY: changing at the edge itself\n  clk     _|▔|_|▔|_\n  a/b     ---X-------   same-instant change + edge = sampling race',
        caption:
          'educational waveform (illustrative): drive halfway between edges (or at negedges) so every posedge samples one clean, stable vector.',
      },
    ],
    tables: [
      {
        caption: 'Testbench anatomy checklist',
        headers: ['Part', 'Construct', 'Notes'],
        rows: [
          ['Declarations', 'reg for driven signals, wire for observed', 'The drive/observe split'],
          ['DUT instance', 'Named connections', 'Constants may connect directly (.cin(1\'b0))'],
          ['Clock', 'initial seed + always #N toggle', 'Sim-only; never in DUT files'],
          ['Reset', 'initial with mid-period release', 'Covers startup; re-pulse for reset tests'],
          ['Stimulus', 'initial blocks, loops, tasks', 'Drive between edges (or at negedge)'],
          ['Termination', '$finish (end) / $stop (suspend)', 'Print a summary first'],
        ],
      },
      {
        caption: '$finish vs $stop',
        headers: ['Task', 'Effect', 'Use'],
        rows: [
          ['$finish', 'Ends the simulation process', 'Normal termination after summary'],
          ['$stop', 'Suspends in interactive mode', 'Interactive debugging sessions'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Changing stimulus exactly at the clock edge and trusting which value the flop captured.',
        fix:
          'Drive mid-period (or at negedge). Same-instant changes and edges create delta-order races — undefined intent, confusing evidence.',
      },
      {
        mistake: 'Releasing reset exactly at a clock edge.',
        fix:
          'Release between edges (e.g. #12 with edges at 5/15) so the first sampling edge unambiguously sees reset released. Reset-timing races masquerade as "sometimes works".',
      },
      {
        mistake: 'Forgetting $finish so the simulation runs forever (clock generator never stops).',
        fix:
          'The always-delay clock runs forever by design; $finish is the only stop. Put it at the end of the stimulus block (and consider a watchdog timeout initial block for long suites).',
      },
    ],
    guidedPractice: {
      title: 'Rebuild the skeleton from memory',
      brief:
        'Write the complete testbench skeleton for a D-FF (flop_arst from module 09): declarations, instance, 10-unit clock, reset released at t=12, d toggling at t=20 and t=35, finish at t=60. Then list which edges sample each d value.',
      expectedBehavior:
        'Structure matches the six-part anatomy. Edges at t=5,15,25,35,45,55. d=1 from t=20 → sampled at e3 (t=25) → q rises after t=25. d=0 from t=35 → sampled at e4 (t=45) → q falls after t=45. Reset released t=12 → first active edge t=15 captures d=0.',
      hints: [
        'Edges every 10 units starting at t=5.',
        'Each between-edge change is sampled by the NEXT posedge.',
      ],
    },
    practiceExercises: [
      {
        title: 'Watchdog guard',
        brief:
          'Add a watchdog initial block to tb_standard: if the simulation reaches t=200, print "TIMEOUT" and $finish. Why is this robustness, not decoration?',
        expectedBehavior:
          'initial begin #200; $display("TIMEOUT: stimulus never reached $finish"); $finish; end — it turns a hung simulation (e.g. a stimulus loop bug, a missing $finish) into a diagnosable report instead of a silent infinite run.',
        hints: [
          'The watchdog and the stimulus $finish race harmlessly — first one wins.',
          'Hung suites waste real compute in CI; watchdogs are standard practice.',
        ],
      },
      {
        title: 'Negedge-driving conversion',
        brief:
          'Convert a stimulus block that uses #10 delays into @(negedge clk) driving. State when the two approaches differ visibly (and when not).',
        expectedBehavior:
          'With a 10-unit period, #10 steps and @(negedge clk) both land mid-pattern IF the delays align with edges — but #drift accumulates with any non-periodic delay; negedge-driving is self-aligning with the clock forever. They differ visibly when stimulus delays are not exact multiples of the half period.',
        hints: [
          'Delays accumulate; event controls track the clock itself.',
          'For a DUT with a different period, negedge-driving adapts automatically.',
        ],
      },
    ],
    assessment: {
      title: 'Module 14 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why does a testbench module have no port list?',
          options: [
            'It IS the outside world — nothing surrounds it to connect to',
            'Ports slow simulation down',
            'It is a Verilog syntax restriction',
            'Ports would leak DUT internals',
          ],
          answer: 'It IS the outside world — nothing surrounds it to connect to',
          explanation:
            'The testbench is the simulation root: it instantiates the DUT and plays the environment. There is no outer module to connect through.',
          hint: 'What is above the testbench in the hierarchy?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which clock-generator idiom is correct?',
          options: [
            'initial clk = 0; always #5 clk = ~clk;',
            'assign clk = ~clk;',
            'always clk = ~clk; (no delay)',
            'initial forever clk = ~clk; (no delay)',
          ],
          answer: 'initial clk = 0; always #5 clk = ~clk;',
          explanation:
            'The seed starts the value; the always-with-delay toggles forever at the half-period. Options B/C toggle in zero time (infinite zero-delay loop).',
          hint: 'Something must advance time between toggles.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Changing a DUT input exactly at a rising clock edge guarantees the flop captures the new value.',
          answer: 'false',
          explanation:
            'Same-instant changes race with the edge — the captured value depends on delta ordering, not intent. Drive between edges (or at negedge) for unambiguous sampling.',
          hint: 'Module 07: same-time-step ordering.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'What is the difference between $finish and $stop?',
          options: [
            '$finish ends the simulation; $stop suspends it (interactive debugging)',
            '$stop ends the simulation; $finish suspends it',
            'They are synonyms',
            '$finish prints; $stop does not',
          ],
          answer: '$finish ends the simulation; $stop suspends it (interactive debugging)',
          explanation:
            '$finish terminates; $stop pauses (in interactive simulators) so you can inspect state. Suites normally end with $finish.',
          hint: 'Which one would you use to end a CI run?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'With `always #5 clk = ~clk;` starting from clk=0 at t=0, at what time does the FIRST rising edge occur (number)?',
          answer: '5',
          explanation:
            'clk starts 0; the first toggle (at t=5) raises it — the first posedge is at t=5, then every 10 units.',
          hint: 'The first toggle happens at #5.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Testbench', definition: 'A port-less module that instantiates the DUT, drives stimulus, and checks responses — the simulation root.' },
      { term: 'Clock generator', definition: 'initial seed + always #N toggle; sim-only by nature.' },
      { term: 'Between-edge stimulus', definition: 'Driving inputs mid-period (or at negedge) so each posedge samples one clean vector.' },
      { term: 'Watchdog', definition: 'A timeout initial block that terminates hung simulations with a diagnostic.' },
      { term: '$finish / $stop', definition: 'End the simulation / suspend it interactively.' },
    ],
    revisionSummary: [
      'Testbench anatomy: declarations, DUT instance, clock, reset, stimulus, $finish.',
      'Clock: initial seed + always #N toggle; period = 2N; sim-only.',
      'Drive between edges (or at negedge); release reset between edges; never race an edge.',
      'Multiple initial blocks are concurrent — sequence with explicit delays, never with file order.',
      'Loops + tasks generate vectors; watchdogs guard against hung runs; $finish ends.',
    ],
    furtherReading: [
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
      { label: 'Wikipedia — Logic simulation', url: 'https://en.wikipedia.org/wiki/Logic_simulation', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'vlog-m14-l2',
    title: 'Self-Checking Testbenches',
    summary:
      'Upgrade from eyeballing displays to verdicts: reference models, four-state comparisons, error counters and machine-readable PASS/FAIL summaries.',
    objectives: [
      'Build a reference model that computes expected results independently.',
      'Compare with !== so x counts as failure.',
      'Count errors and emit a final PASS/FAIL summary.',
      'Combine directed, exhaustive and random vectors sensibly.',
    ],
    whyItMatters:
      'A display you read by hand does not scale and does not gate: only a self-checking testbench — one that prints PASS or FAIL itself — can be trusted in regression and CI. The platform evaluator that grades your linked challenges is exactly such a harness: it compares your DUT against expected behavior and reports verdicts. Learning to build your own makes the grader transparent rather than magical.',
    prerequisites: ['vlog-m14-l1', 'vlog-m13-l2', 'vlog-m04-l3'],
    explanation:
      'A **self-checking testbench** decides correctness itself. Three ingredients:\n\n1. **A reference model** — an independent implementation of the specification (a second adder written differently, an array of golden answers, a behavioral algorithm). Independence matters: a reference that reuses the DUT’s code verifies nothing.\n2. **A comparator** — per vector, compare DUT outputs against the reference with `!==` (four-state). Why not `!=`? Because `x != 5` evaluates to x, and x in an if-condition is FALSE — a broken (x-producing) DUT would silently PASS. `!==` returns true on any difference INCLUDING unknowns: x can never slip through.\n3. **Accounting** — an error counter incremented per mismatch, with a final `$display("TEST %s: %0d errors", ...)` summary. CI systems and the platform evaluator grep for exactly such verdicts.\n\n**Vector strategies, combined:** directed vectors target known-tricky corners (wrap edges, reset mid-op, all-ones); exhaustive sweeps cover the whole input space when small enough (a 4-bit adder: 512 vectors — trivially); constrained-random vectors (sim-only $random with modulo/width constraints) explore combinations you did not think of. The professional suite is directed corners + exhaustive-where-cheap + randomized bulk.',
    deepDive:
      '### The x-pass trap, quantified\n\n`if (dut_out != expected) errors++;` — suppose dut_out is 4\'bxxxx. `x != 5` evaluates to x (module 04: unknowns propagate through equality). The if treats x as FALSE → errors not incremented → the run "passes" while the DUT output is entirely unknown. This is THE classic verification bug, and the reason the four-state operators exist. The fix is mechanical: every comparison in a checker uses !== or !==; every condition that gates a verdict is four-state-clean. Audit habit: grep your testbench for `!=` and `==` — every hit that feeds a verdict is suspect.\n\n### Reference model styles, with independence analysis\n\nGolden-array: precomputed expected values (generated by a script or by hand) — maximally independent, but only as good as the generator. Behavioral model: the spec written at a DIFFERENT abstraction (e.g. the adder checked as `expected = a + b + cin` — a decimal-ish arithmetic oracle). Structural twin: a second RTL implementation — weakest independence (same author biases), still useful for equivalence-style checks. The best suites mix: arithmetic oracles for datapath, golden arrays for protocol sequences, behavioral algorithms for control.\n\n### Reporting for machines and humans\n\nPer-vector logs are for humans (keep them brief, one line per failure with the full vector context); the SUMMARY line is for machines: a fixed format like `SUMMARY: 0 errors / 1024 vectors` that scripts can grep. Exit discipline: $finish after the summary; some flows also check exit codes ($finish takes an optional argument in some simulators — vendor-specific, labeled as such). The platform evaluator runs your module in ITS harness: your job is clean DUT behavior and correct port interfaces, not summary formats — but the skill transfers directly.',
    examples: [
      {
        title: 'Fully self-checking exhaustive adder testbench',
        language: 'verilog',
        code:
          '// tb_adder_selfcheck.v — SIM-ONLY: 512 exhaustive vectors, verdict\n`timescale 1ns/1ps\nmodule tb_adder_selfcheck;\n    reg  [3:0] a, b;\n    reg        cin;\n    wire [3:0] sum;\n    wire       cout;\n    integer    i, errors;\n    reg [4:0]  expected;      // reference: {carry, sum} as arithmetic\n\n    adder4_wide dut (.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));\n\n    initial begin\n        errors = 0;\n        for (i = 0; i < 512; i = i + 1) begin\n            {cin, b, a} = i[8:0];          // unpack the loop counter\n            #1;                             // settle\n            // Reference model: pure arithmetic, INDEPENDENT of DUT code.\n            expected = a + b + cin;         // 5-bit context: carry included\n            if ({cout, sum} !== expected) begin\n                errors = errors + 1;\n                $display("FAIL a=%0d b=%0d cin=%b: got %b want %b",\n                         a, b, cin, {cout, sum}, expected);\n            end\n        end\n        // Machine-readable summary (module 13 task style).\n        if (errors == 0)\n            $display("SUMMARY: PASS 0 errors / 512 vectors");\n        else\n            $display("SUMMARY: FAIL %0d errors / 512 vectors", errors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'The loop enumerates all 9 input bits (512 vectors): {cin, b, a} = i unpacks the counter directly into the stimulus registers.',
          'The reference model is ARITHMETIC — expected = a + b + cin in a 5-bit context (module 04’s rule) — written at a different abstraction than the DUT’s structure. Independence: an adder bug cannot hide in the oracle.',
          'The comparator is !== : an x anywhere in {cout, sum} mismatches and FAILS — the x-pass trap is structurally closed.',
          'Expected-result spot rows: i where a=15,b=15,cin=1 → expected 5\'b1_1111; a=8,b=8,cin=0 → 1_0000.',
          'The final line prints a fixed-format verdict: PASS if and only if errors == 0 — this is what regression scripts (and the platform evaluator, in its own harness) consume.',
        ],
      },
      {
        title: 'Directed corners plus constrained-random bulk',
        language: 'verilog',
        code:
          '// tb_hybrid.v — SIM-ONLY: corners + $random bulk, one checker task\n`timescale 1ns/1ps\nmodule tb_hybrid;\n    reg  [3:0] a, b;\n    reg        cin;\n    wire [3:0] sum;\n    wire       cout;\n    integer    i, errors;\n\n    adder4_wide dut (.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));\n\n    task check_vec;\n        input [4:0] expect5;\n        begin\n            #1;\n            if ({cout, sum} !== expect5) begin\n                errors = errors + 1;\n                $display("FAIL a=%0d b=%0d cin=%b got=%b want=%b",\n                         a, b, cin, {cout, sum}, expect5);\n            end\n        end\n    endtask\n\n    initial begin\n        errors = 0;\n        // --- directed corners ---\n        {cin, b, a} = 9\'b0_0000_0000; check_vec(a + b + cin);  // zeros\n        {cin, b, a} = 9\'b0_1111_1111; check_vec(a + b + cin);  // all-ones\n        {cin, b, a} = 9\'b1_0001_1111; check_vec(a + b + cin);  // wrap edge\n        // --- randomized bulk ($random is SIM-ONLY) ---\n        for (i = 0; i < 200; i = i + 1) begin\n            a   = $random % 16;   // modulo constrains into range (simple form)\n            b   = $random % 16;\n            cin = $random;\n            check_vec(a + b + cin);\n        end\n        if (errors == 0) $display("SUMMARY: PASS 0 errors / 203 vectors");\n        else             $display("SUMMARY: FAIL %0d errors / 203 vectors", errors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'check_vec packages settle-compare-count (module 13-l2); the reference expression a+b+cin reuses the same 5-bit context trick as the exhaustive version.',
          'Directed corners first: zeros, all-ones, and the carry-chain wrap edge (15+1+1 with cin... here 15+1 with cin=1 = 17 = 1_0001). These are the rows human intuition says matter.',
          '$random is a SIM-ONLY system function generating signed 32-bit values; % 16 constrains into 0..15 (a simple unconstrained-style; proper constrained-random is SV territory — labeled).',
          'Note on expected values: the corners call check_vec(a + b + cin) — the reference is computed from the SAME stimulus values just driven, keeping the vector and its oracle adjacent and auditable.',
          'The summary line counts 203 vectors (3 corners + 200 random) — the fixed format is what makes suites greppable.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Self-checking testbench architecture',
        content:
          '                 +---------------------------+\n   vectors ----->| STIMULUS (loops, corners, |----> DUT inputs\n   (corners +    | $random, tasks)            |\n    random)      +---------------------------+            |\n                                                          v\n                 +---------------------------+        +--------+\n   spec ------->| REFERENCE MODEL           |------->|COMPARE |--> errors++\n   (arithmetic/ | (independent of DUT code) | expect | !==    |\n    golden)     +---------------------------+        +--------+\n                                                          |\n                                                          v\n                                              SUMMARY: PASS/FAIL + counts',
        caption:
          'Stimulus and reference are independent; the comparator is four-state; the summary is the machine contract.',
      },
    ],
    tables: [
      {
        caption: 'Vector strategies',
        headers: ['Strategy', 'Covers', 'Cost', 'Use when'],
        rows: [
          ['Directed corners', 'Known tricky rows (wrap, reset, extremes)', 'Cheap', 'Always — first'],
          ['Exhaustive sweep', 'Every input combination', '2^N vectors', 'Small input spaces'],
          ['Constrained random', 'Unthought-of combinations', 'Sim-only $random', 'Bulk confidence'],
        ],
      },
      {
        caption: 'Comparison operator audit for checkers',
        headers: ['Operator', 'x behavior', 'Verdict-safe?'],
        rows: [
          ['== / !=', 'return x; x-in-if is FALSE → x silently passes', 'NO'],
          ['=== / !==', 'compare x/z literally; !== fires on unknowns', 'YES (testbench-only)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Comparing with == / != in checker code.',
        fix:
          'x-propagating equality makes unknown outputs silently pass (x-in-if is false). Every verdict-bearing comparison uses !== (and === for x-detection). Audit: no == or != may feed an error counter.',
      },
      {
        mistake: 'Building the reference model by copying the DUT’s RTL.',
        fix:
          'A copied model shares the DUT’s bugs. Write the reference at a different abstraction: arithmetic oracle, golden array, behavioral algorithm — independence is the whole point.',
      },
      {
        mistake: 'Random-only verification ("$random will find it").',
        fix:
          'Random explores broadly but misses targeted corners (wrap edges, reset mid-op) until told. Layer: directed corners first, then exhaustive-where-cheap, then random bulk.',
      },
    ],
    guidedPractice: {
      title: 'Close the x-pass hole',
      brief:
        'A colleague’s checker reads: `if (result != expected) errors = errors + 1;` and reports PASS after 1000 vectors. Construct a concrete scenario where a fully-broken DUT (all-x output) passes, and rewrite the checker correctly.',
      expectedBehavior:
        'If result is 4\'bxxxx for every vector: x != expected evaluates to x; x in the if-condition is treated as FALSE → errors stays 0 → SUMMARY: PASS with a dead DUT. Fix: if (result !== expected) — the four-state compare fires on any difference including x. Also add an explicit x-scan: if (^result === 1\'bx) $display("x detected").',
      hints: [
        'Module 04: == and != propagate x; conditions treat x as false.',
        'The fix is one character wide and closes the hole completely.',
      ],
    },
    practiceExercises: [
      {
        title: 'Golden-array checker for a decoder',
        brief:
          'Build a self-checking TB for the module 08 decoder2to4 using a golden array expected[0..7] filled with the 8 truth-table rows, driven by a loop. State the array contents.',
        expectedBehavior:
          'reg [3:0] expected [0:7]; filled: {en=0,s=00..11} → 0000,0000,0000,0000; {en=1,s=00..11} → 0001,0010,0100,1000. Loop i=0..7 unpacks {en,s} = i[2:0], compare y !== expected[i], count errors, summary.',
        hints: [
          'Index the golden array with the same i that generates stimulus.',
          'The 4 disabled rows all expect 0000.',
        ],
      },
      {
        title: 'Regression-friendly summary',
        brief:
          'Modify the exhaustive adder TB so the summary ALSO prints the first failing vector index (0 if none). Why does this help a 10,000-vector suite?',
        expectedBehavior:
          'Track first_fail = (errors == 1) ? i : first_fail on each new failure (initialize to -1... or use errors==0 sentinel); print "SUMMARY: ... first_fail=%0d". For huge suites, the first failure usually identifies the bug family immediately — no need to scroll thousands of FAIL lines.',
        hints: [
          'Record the index on the FIRST error only.',
          'Failures usually share a cause; the first is the diagnostic.',
        ],
      },
    ],
    assessment: {
      title: 'Module 14 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why must self-checking testbenches compare with !== rather than !=?',
          options: [
            '!= returns x for unknown operands and x is treated as FALSE in if — broken (x) outputs silently pass',
            '!= is slower',
            '!== is synthesizable and != is not',
            'There is no difference in testbenches',
          ],
          answer: '!= returns x for unknown operands and x is treated as FALSE in if — broken (x) outputs silently pass',
          explanation:
            'The x-pass trap: an all-x DUT output compares as x, and the if skips the error count. !== compares four-state literally and fires on any difference.',
          hint: 'What does an if do with an x condition?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What makes a reference model useful?',
          options: [
            'Independence: implemented at a different abstraction, sharing no DUT code',
            'It must be faster than the DUT',
            'It must use the same algorithms as the DUT',
            'It only needs to cover half the vectors',
          ],
          answer: 'Independence: implemented at a different abstraction, sharing no DUT code',
          explanation:
            'A reference that copies DUT logic shares its bugs. Arithmetic oracles, golden arrays and behavioral algorithms are independent vantage points.',
          hint: 'Would a copied model catch a copied bug?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'In the exhaustive TB, the loop hits i where {cin,b,a} = 9\'b1_0001_1111. What expected value does the reference compute?',
          code:
            '{cin, b, a} = i[8:0];\nexpected = a + b + cin;\n// {cin,b,a} = 9\'b1_0001_1111',
          options: ["5'b1_0001", "5'b1_0000", "5'b0_1111", "5'b0_0001"],
          answer: "5'b1_0001",
          explanation:
            "Unpack the concatenation: cin is the MSB = 1, b = 0001 = 1, a = 1111 = 15. The reference computes 15 + 1 + 1 = 17 = 5'b1_0001 — carry set, sum 0001.",
          hint: 'Unpack carefully: MSB is cin, then b, then a.',
          difficulty: 'hard',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'Directed corner vectors (wrap edges, all-ones) should run even when a random bulk suite exists.',
          answer: 'true',
          explanation:
            'Random exploration is broad but untargeted; corners encode known-dangerous rows explicitly and fail fast. Professional suites layer corners under random bulk.',
          hint: 'Does $random know which rows are dangerous?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the fixed-format summary line that prints when errors is zero (use $display with the word SUMMARY).',
          answer: 'SUMMARY: PASS 0 errors',
          explanation:
            'A fixed, greppable verdict line — the machine contract of a self-checking testbench (course format: SUMMARY: PASS 0 errors / N vectors).',
          hint: 'Start with the word SUMMARY.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Self-checking testbench', definition: 'A harness that computes expected results, compares, and prints a PASS/FAIL verdict itself.' },
      { term: 'Reference model', definition: 'An independent implementation of the spec at a different abstraction, used as the answer key.' },
      { term: 'x-pass trap', definition: 'The failure mode where x-propagating comparisons let unknown outputs pass verdicts.' },
      { term: 'Error counter', definition: 'Global tally of mismatches, feeding the final summary line.' },
      { term: 'Directed + random', definition: 'The layered vector strategy: known corners explicitly, random bulk for breadth.' },
    ],
    revisionSummary: [
      'Self-checking = independent reference + four-state compare + error counter + fixed summary.',
      '!== in every verdict-bearing comparison; == / != are banned from checkers (x-pass trap).',
      'Reference models: arithmetic oracles, golden arrays, behavioral algorithms — never DUT copies.',
      'Vector layers: directed corners, exhaustive-where-cheap, constrained random bulk.',
      'Fixed-format SUMMARY lines are what regressions and graders consume.',
    ],
    furtherReading: [
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
      { label: 'Wikipedia — Logic simulation', url: 'https://en.wikipedia.org/wiki/Logic_simulation', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m14-l3',
    title: 'Advanced Verification: Full Suites, Waveforms and the Platform Flow',
    summary:
      'Assemble complete self-checking suites for the ALU slice and a counter, add waveform dumping and reset-mid-operation tests, and learn exactly how the platform grades challenges.',
    objectives: [
      'Assemble a complete self-checking suite for the module 08 ALU slice.',
      'Assemble a reset-and-enable suite for the module 10 counter.',
      'Test edge cases: reset mid-operation, all-x inputs, boundary values.',
      'Use $monitor, $dumpvars/VCD and know precisely how the platform evaluator runs your code.',
    ],
    whyItMatters:
      'This lesson completes your verification toolkit and demystifies grading: the platform runs your linked challenges on real Icarus Verilog (iverilog + vvp) against its own harness. Every skill here — self-checking tasks, waveform dumps, reset-mid-operation tests — is simultaneously what makes YOUR suites trustworthy and what makes you effective inside any professional verification environment.',
    prerequisites: ['vlog-m14-l2', 'vlog-m08-l3', 'vlog-m10-l1'],
    explanation:
      '**Complete suites** assemble everything: the six-part anatomy (l1), apply_check tasks and reference models (l2), plus system-level scenarios — reset asserted MID-OPERATION (state must recover cleanly), boundary values (all-ones in, all-ones out), and disabled/hold behavior. The ALU suite below sweeps each opcode with directed operands AND flags checks; the counter suite verifies reset value, counting, hold, and a mid-count reset.\n\n**Waveform visibility:** `$dumpfile("sim.vcd"); $dumpvars(0, tb);` records every signal of the tb hierarchy into a VCD file (0 = all levels deep) — openable in GTKWave. VCDs answer the questions $display cannot: glitch hunting, ordering between blocks, the module 07 waveform forensics. Dumping everything on huge designs bloats files — scope the dump to the interesting subtree when needed.\n\n**$monitor** prints automatically whenever any argument changes (one line per change) — a lightweight live trace; $display prints only when executed. Suites typically use $display for verdicts and either $monitor or waveforms for tracing.\n\n**The platform flow, honestly:** when you link a challenge, your submitted module is compiled with iverilog (Verilog-2001 dialect) and run under vvp against the challenge’s own harness, which drives your ports and compares behavior. That means: match the challenge’s exact port names/widths/directions, keep design files sim-clean (no $finish in design modules, no vendor constructs), and treat lesson snippets as illustrations — they become REAL simulation when a challenge runs them. SystemVerilog-only niceties ($fatal, $assert) are labeled SV here and are not needed for any challenge.',
    deepDive:
      '### The ALU suite: structure worth copying\n\nPer-opcode directed vectors with a per-op expected-value policy: for arithmetic ops the oracle is the arithmetic (a+b, a+~b+1); for logic ops, a parallel behavioral expression; for shifts, the concatenation forms; for SLT, explicit $signed comparison. Flags get their own assertions: zero ⇔ result==0 (tautology check: flags must AGREE with the result — a consistency check independent of the operand values). That flags-vs-result consistency check is a powerful trick: it verifies internal coherence even where the golden value itself is debatable.\n\n### Reset mid-operation: the state-integrity test\n\nSequence: run the DUT into an interesting state (counter mid-count, ALU mid-vector), then assert reset WITHOUT an edge, hold, release, and verify: outputs return to reset values, no phantom outputs (no spurious done/tc pulses), and the first post-reset operation is correct. This scenario is where async-reset templates prove themselves (module 09-l1) and where uninitialized state (module 15’s undriven/reset mistakes) is exposed. Include it in EVERY sequential-DUT suite.\n\n### Coverage of behavior, honestly scoped\n\nFunctional coverage in its full sense (SystemVerilog covergroups) is beyond this course — labeled SV. The Verilog-2001 practice: enumerate the BEHAVIOR space (opcodes × operand classes × flag outcomes) as a checklist and verify each cell exists in the suite — a hand-rolled coverage matrix. For the ALU: 8 opcodes × {zeros, ones, random} operand classes = 24 minimum cells; the suite below hits all 8 opcodes and the 3 classes.',
    examples: [
      {
        title: 'Complete self-checking suite for the ALU slice',
        language: 'verilog',
        code:
          '// tb_alu_full.v — SIM-ONLY: all 8 opcodes, 3 operand classes, flags\n`timescale 1ns/1ps\nmodule tb_alu_full;\n    reg  [2:0] op;\n    reg  [3:0] a, b;\n    wire [3:0] result;\n    wire       zero, carry, negative;\n    integer    errors, vectors;\n\n    alu_slice dut (.op(op), .a(a), .b(b), .result(result),\n                   .zero(zero), .carry(carry), .negative(negative));\n\n    task check_alu;\n        input [2:0] t_op;\n        input [3:0] t_a, t_b;\n        input [3:0] expect_r;\n        begin\n            op = t_op; a = t_a; b = t_b;\n            #1;\n            vectors = vectors + 1;\n            if (result !== expect_r) begin\n                errors = errors + 1;\n                $display("FAIL op=%b a=%b b=%b got=%b want=%b",\n                         t_op, t_a, t_b, result, expect_r);\n            end\n            // Flags-vs-result consistency (independent coherence check):\n            if (zero !== ~|result || negative !== result[3]) begin\n                errors = errors + 1;\n                $display("FLAG-MISMATCH op=%b a=%b b=%b", t_op, t_a, t_b);\n            end\n        end\n    endtask\n\n    initial begin\n        errors = 0; vectors = 0;\n        // ADD class: zeros / ones / random-ish\n        check_alu(3\'b000, 4\'h0, 4\'h0, 4\'h0);\n        check_alu(3\'b000, 4\'hF, 4\'h1, 4\'h0);      // 15+1 = 16 -> 0 (mod 16)\n        check_alu(3\'b000, 4\'hA, 4\'h5, 4\'hF);\n        // SUB\n        check_alu(3\'b001, 4\'h5, 4\'h5, 4\'h0);\n        check_alu(3\'b001, 4\'h3, 4\'h7, 4\'hC);      // 3-7 = -4 = 0xC\n        // AND / OR / XOR\n        check_alu(3\'b010, 4\'hC, 4\'hA, 4\'h8);\n        check_alu(3\'b011, 4\'hC, 4\'hA, 4\'hE);\n        check_alu(3\'b100, 4\'hC, 4\'hA, 4\'h6);\n        // SHL / SHR\n        check_alu(3\'b101, 4\'h9, 4\'h0, 4\'h2);      // 1001 << 1\n        check_alu(3\'b110, 4\'h9, 4\'h0, 4\'h4);      // 1001 >> 1\n        // SLT (signed)\n        check_alu(3\'b111, 4\'hF, 4\'h0, 4\'h1);      // -1 < 0\n        check_alu(3\'b111, 4\'h0, 4\'hF, 4\'h0);      // 0 < -1 false\n        if (errors == 0)\n            $display("SUMMARY: PASS 0 errors / %0d vectors", vectors);\n        else\n            $display("SUMMARY: FAIL %0d errors / %0d vectors", errors, vectors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'Twelve directed vectors cover all 8 opcodes across the operand classes {zeros, extremes, mixed} — the hand-rolled coverage matrix.',
          'The reference values are derived per-op at a different abstraction: arithmetic (ADD/SUB), behavioral boolean (AND/OR/XOR), bit-concatenation (shifts), $signed reasoning (SLT rows).',
          'The flags-vs-result consistency check is INDEPENDENT of the golden values: zero must equal ~|result and negative must equal result[3] for ANY operand — it catches flag wiring bugs even on vectors whose golden value is wrong.',
          'Expected rows verified: 15+1 = 16 → result 0 (mod 16) with zero=1 (the consistency check then confirms zero=1 automatically). SUB 3-7: 3+8+1 = 12 → 0xC. SLT: -1 < 0 → 1; 0 < -1 → 0.',
          'Sim-only file: initial, tasks, #1, $display, $finish — all harness constructs; the DUT file stays clean.',
        ],
      },
      {
        title: 'Counter suite with reset-mid-operation and waveform dump',
        language: 'verilog',
        code:
          '// tb_counter_full.v — SIM-ONLY: count, hold, reset mid-count, VCD\n`timescale 1ns/1ps\nmodule tb_counter_full;\n    reg        clk, reset_n, en;\n    wire [3:0] count;\n    integer    errors;\n\n    counter_up4 dut (.clk(clk), .reset_n(reset_n), .count(count));\n\n    initial clk = 1\'b0;\n    always #5 clk = ~clk;\n\n    // VCD waveform: full hierarchy dump (view in GTKWave).\n    initial begin\n        $dumpfile("counter_sim.vcd");\n        $dumpvars(0, tb_counter_full);\n    end\n\n    task check_count;\n        input [3:0] want;\n        input [127:0] label;\n        begin\n            #1;\n            if (count !== want) begin\n                errors = errors + 1;\n                $display("FAIL %0s: got %0d want %0d", label, count, want);\n            end\n        end\n    endtask\n\n    initial begin\n        errors = 0;\n        en = 1\'b1;\n        reset_n = 0;\n        check_count(4\'d0, "in reset");\n        #12 reset_n = 1;\n        @(posedge clk); check_count(4\'d1, "first count");\n        @(posedge clk); @(posedge clk); check_count(4\'d3, "third count");\n        // RESET MID-OPERATION: assert between edges, no $finish games.\n        #2 reset_n = 0;          // mid-period async clear\n        check_count(4\'d0, "async clear mid-count");\n        #2 reset_n = 1;\n        @(posedge clk); check_count(4\'d1, "restart clean");\n        if (errors == 0) $display("SUMMARY: PASS 0 errors");\n        else             $display("SUMMARY: FAIL %0d errors", errors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'The suite verifies: reset value, single steps, hold-capable enable usage (en tied high here — a hold test would gate it), the ASYNC mid-count clear (the module 09 signature behavior), and clean restart.',
          'Reset mid-operation: reset_n falls at a NON-edge moment; the very next #1 check sees count=0 — proof the async path works without waiting for an edge.',
          '$dumpfile/$dumpvars(0, tb) record the whole hierarchy to counter_sim.vcd — open in GTKWave to SEE the wrap, the clear, the timing. Sim-only constructs, harness-only.',
          'check_count uses !== with a text label — failures print readable context.',
          'Expected values traced: edges at 5,15,25,...; after reset release at t=12: first edge t=15 → count=1; two more edges (25, 35) → 3; mid-count clear → 0; restart edge → 1.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'The verification checklist per sequential DUT',
        content:
          '  [ ] reset value while in reset\n  [ ] one step / N steps after release\n  [ ] hold/enable behavior\n  [ ] boundary: max value, wrap/underflow edge\n  [ ] RESET MID-OPERATION (async clear, clean restart)\n  [ ] no phantom outputs (done/tc) after reset\n  [ ] first post-reset operation correct\n  [ ] flags consistent with outputs (datapath DUTs)',
        caption:
          'The per-DUT checklist this module assembles — reuse it verbatim for the module 16 projects.',
      },
    ],
    tables: [
      {
        caption: 'System task reference (this course’s scope)',
        headers: ['Task', 'World', 'Purpose'],
        rows: [
          ['$display', 'sim', 'Formatted print at execution point (verdicts, logs)'],
          ['$monitor', 'sim', 'Auto-print on any argument change (live trace)'],
          ['$finish / $stop', 'sim', 'End / suspend the simulation'],
          ['$dumpfile/$dumpvars', 'sim', 'Record VCD waveform for GTKWave'],
          ['$random', 'sim', 'Random vector generation'],
          ['$fatal', 'SystemVerilog — labeled', 'Immediate fatal error with exit status; not needed here'],
        ],
      },
      {
        caption: 'Platform evaluation facts (honest statement)',
        headers: ['Aspect', 'Reality'],
        rows: [
          ['Engine', 'Icarus Verilog: iverilog compiles, vvp runs'],
          ['Dialect', 'Verilog-2001 (this course’s dialect)'],
          ['Harness', 'The challenge’s own testbench drives your module’s ports'],
          ['Your responsibility', 'Exact port names/widths/directions; clean synthesizable design file'],
          ['Lesson snippets', 'Illustrative — real simulation happens in linked challenges'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Putting $finish or $display inside the DUT module to "help the grader".',
        fix:
          'Design modules stay silent and synthesizable; the HARNESS (the challenge’s or yours) does all talking. A $finish in a DUT kills the harness’s own stimulus plan mid-run.',
      },
      {
        mistake: 'Dumping waveforms with $dumpvars(1, tb) and missing the internal DUT signals.',
        fix:
          'The depth argument 0 dumps ALL levels of the hierarchy below the scope. Use 1 only when you deliberately want top-level-only traces.',
      },
      {
        mistake: 'Skipping reset-mid-operation tests because "reset works, we test it at t=0".',
        fix:
          'Startup reset and MID-OPERATION reset are different failure surfaces (stale state, phantom pulses, partial clears). Every sequential suite includes the mid-op reset scenario.',
      },
    ],
    guidedPractice: {
      title: 'Design a flag-consistency check',
      brief:
        'The ALU suite compares zero !== ~|result and negative !== result[3]. Explain why this check is useful even if the golden result values were wrong, and add the analogous consistency assertion for carry (carry must be 0 unless op is ADD or SUB).',
      expectedBehavior:
        'The flag checks verify INTERNAL COHERENCE (flags match the produced result) — independent of whether the result itself is correct: a flags-wiring bug is caught even on vectors with wrong golden values. Carry assertion: if (!(op == 3\'b000 || op == 3\'b001) && carry !== 1\'b0) → error — carry must be forced 0 for logic/shift ops per the module 08 spec.',
      hints: [
        'Coherence checks test the implementation against itself + spec invariants.',
        'The carry invariant comes straight from the operation table.',
      ],
    },
    practiceExercises: [
      {
        title: 'Wrap-edge stress for the counter',
        brief:
          'Extend tb_counter_full: after restart, enable counting to the wrap (count 15 → 0) and verify with exactly two checks. Count the clock edges required from count=1.',
        expectedBehavior:
          'From count=1, 14 edges reach 15 (check_count(15) after the 14th edge), one more wraps to 0 (check_count(0)). Total 15 edges. The wrap check is the module 10-l1 canonical row — now inside a full suite with VCD.',
        hints: [
          'count=1 → 15 needs 14 increments.',
          'The wrap edge is its own check.',
        ],
      },
      {
        title: 'Read the grader’s mind',
        brief:
          'A challenge expects module alu4(input [3:0] a, b, input [1:0] op, output reg [3:0] y). Your file declares output wire y and computes with assigns. What harness behavior do you expect, and what is the fix?',
        expectedBehavior:
          'Port DIRECTION/TYPE mismatch: the harness (Verilog) connects to y regardless, but output reg vs wire matters only inside your module — the real issue: your assign-based y is fine as `output wire`. The genuine failure mode is NAME/WIDTH mismatch (y vs result, [3:0] vs [4:0]) — the harness fails to elaborate or drives the wrong signal. Fix: match the challenge declaration EXACTLY (names, widths, directions).',
        hints: [
          'Harnesses connect by NAME and check widths at elaboration.',
          'wire vs reg is internal style; names and widths are the interface.',
        ],
      },
    ],
    assessment: {
      title: 'Module 14 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which pair records a VCD waveform of the whole testbench hierarchy?',
          options: [
            '$dumpfile("sim.vcd"); $dumpvars(0, tb);',
            '$monitor(tb); $dumpall;',
            '$display("vcd"); $finish;',
            '$dumpvars("sim.vcd");',
          ],
          answer: '$dumpfile("sim.vcd"); $dumpvars(0, tb);',
          explanation:
            '$dumpfile names the VCD file; $dumpvars(0, tb) records all hierarchy levels below tb. Viewable in GTKWave.',
          hint: 'One names the file, one selects the scope and depth.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Resetting the DUT mid-operation (between clock edges) is a standard scenario in sequential-DUT test suites.',
          answer: 'true',
          explanation:
            'Mid-operation reset tests state integrity: clean return to reset values, no phantom outputs, correct first post-reset operation — a different failure surface than startup reset.',
          hint: 'Is startup reset the only way reset is used in real systems?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'In tb_counter_full, after the mid-count async clear (count was 3), what does the FIRST check after #2 of reset low show?',
          code:
            '#2 reset_n = 0;\ncheck_count(4\'d0, "async clear mid-count");\n// count was 3, no clock edge between',
          options: ['0', '3', 'x', '1'],
          answer: '0',
          explanation:
            'The async reset clears count the instant reset_n falls — no edge required. The #1 inside check_count is plenty of settle time for the clear to be visible.',
          hint: 'Module 09: the async path needs no clock.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'How does the platform evaluate linked Verilog challenges?',
          options: [
            'It compiles with iverilog and runs under vvp against the challenge’s own harness',
            'A human reviews the code for style',
            'It converts the Verilog to C and runs it',
            'It only checks that the code compiles',
          ],
          answer: 'It compiles with iverilog and runs under vvp against the challenge’s own harness',
          explanation:
            'The evaluator performs REAL simulation: your module’s ports are driven and its behavior compared. Match port names/widths exactly and keep design files clean.',
          hint: 'Module 01-l3 introduced this flow.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Which SystemVerilog task (labeled as SV, not needed for this course) aborts a simulation with a fatal error and exit status?',
          answer: '$fatal',
          explanation:
            '$fatal is SystemVerilog’s immediate-termination error task; Verilog-2001 testbenches use $display + $finish instead.',
          hint: 'Its name is the severity.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'VCD', definition: 'Value-change dump: the standard waveform file produced by $dumpfile/$dumpvars, viewed in GTKWave.' },
      { term: 'Coverage matrix', definition: 'The hand-rolled behavior checklist (opcodes × operand classes) every suite must hit.' },
      { term: 'Mid-operation reset', definition: 'Asserting reset between edges during activity; tests state integrity beyond startup.' },
      { term: '$monitor', definition: 'Auto-prints whenever any argument changes — a live trace complement to $display.' },
      { term: 'Flag consistency check', definition: 'Asserting flags agree with results (zero ⇔ ~|result) — coherence independent of golden values.' },
    ],
    revisionSummary: [
      'Full suites = anatomy + tasks + reference + coverage matrix + mid-op reset + summary.',
      'ALU suite: 8 opcodes × operand classes; flags-vs-result coherence checked independently.',
      'Counter suite: reset, steps, async mid-count clear, clean restart; VCD records the evidence.',
      '$dumpvars(0, tb) dumps everything below tb; $monitor auto-traces changes.',
      'The platform runs real iverilog/vvp on linked challenges — exact port contracts, clean DUT files.',
    ],
    furtherReading: [
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
      { label: 'Wikipedia — Value change dump', url: 'https://en.wikipedia.org/wiki/Value_change_dump', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
];
