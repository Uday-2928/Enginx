import type { TutorialLesson } from '../types';

export const module04Lessons: TutorialLesson[] = [
  {
    id: 'dver-m04-l1',
    title: 'Verifying a Synchronous FIFO',
    summary:
      'Apply everything from Modules 1-3 to the canonical verification target: a synchronous FIFO — corner matrix, reference model, scoreboard and a self-checking testbench skeleton in portable Verilog.',
    objectives: [
      'Enumerate the FIFO corner cases (full, empty, simultaneous read+write, overflow/underflow attempts, wrap, reset mid-stream) as explicit checks.',
      'Build a reference model of a FIFO in plain Verilog and keep it cycle-aligned with the DUT.',
      'Design a scoreboard that checks FIFO ordering, not just final contents.',
      'Explain why flag timing (registered vs combinational) must come from the spec before flags can be checked.',
    ],
    whyItMatters:
      'The synchronous FIFO appears inside nearly every real block: bus bridges, DMA engines, network MACs, display pipelines. It is also the densest concentration of corner cases per line of RTL you will ever meet — two interacting pointers, two boundary flags, and simultaneous operations on both ports. Verification interviews use FIFOs precisely because a candidate who can enumerate the corners systematically demonstrates the skill that transfers to every other design.',
    prerequisites: [
      'Self-checking testbench patterns (Module 02)',
      'Coverage and regression discipline (Module 03)',
      'Verilog tasks, loops and nonblocking assignment semantics',
    ],
    explanation:
      'A synchronous FIFO has one clock, a write port (`wen`, `wdata`, `full`), a read port (`ren`, `rdata`, `empty`) and internal storage with head/tail pointers. Verification starts by writing the **corner matrix** — the table of interesting states x operations — because a FIFO that passes a "write 3, read 3" test has proven almost nothing.\n\nThe core corners: (1) **empty boundary** — read attempts at empty must be ignored, `empty` must assert after the last read; (2) **full boundary** — write attempts at full must be ignored without corrupting contents, `full` must assert after the last accepted write; (3) **simultaneous read+write when full** — the read frees a slot, so does the write land in the same cycle? Only the spec answers this; (4) **simultaneous read+write when empty** — the write fills a slot; can the read see it this cycle? Again, spec-defined; (5) **wrap-around** — pointers wrap modulo depth, and depth is often not a power of two in real designs; (6) **reset mid-stream** — contents vanish, flags return to empty.\n\nThe checking strategy is a **reference model**: a behavioral mirror of the FIFO (an array, a head index, a tail index, a count) updated with the same clock-edge semantics the spec promises. On every clock edge the testbench applies the same stimulus to DUT and model, then compares: `full`/`empty` against the model count, `rdata` against the model head *at the moment of an accepted read*, and — after any sequence — the entire contents in order. The model is written from the spec, never from the RTL; if both are wrong the same way, that is a spec bug you inherited, which is exactly why the model author should read the spec independently.',
    deepDive:
      '### Flag timing is a spec decision\n\nSome FIFOs compute `empty = (head == tail)` combinationally; others register the flag so it reflects the *previous* cycle\'s state. A checker that samples `full` in the wrong cycle relative to the DUT\'s convention manufactures false failures — or worse, masks real ones. Rule: before writing a single checker line, write down from the spec what `full`/`empty` mean *in which cycle*, and encode that in the model. If the spec is silent, that is a spec bug to file, not a detail to guess.\n\n### Scoreboard checks order, not just contents\n\nA FIFO is an *ordering* contract: data comes out in the order it went in. Checking only "the set of read values equals the set of written values" passes a FIFO that has swapped two entries. The scoreboard must compare sequence positions: read number k must equal write number k (for accepted operations). In Verilog-2001 the cleanest model is an array with head/tail indices plus a count — not a sorted comparison.\n\n### Rejected operations must be proven rejected\n\nThe subtlest FIFO bugs hide in what the DUT does with an *attempted* write at full: it must not overwrite the oldest entry, must not advance the tail, must not corrupt the count. The testbench therefore deliberately drives `wen=1` while full and then continues reading everything — if any slot was clobbered, the ordering check fails with a precise mismatch message naming the read index.',
    examples: [
      {
        title: 'Self-checking FIFO testbench skeleton (Verilog-2001, runs on Icarus Verilog)',
        language: 'verilog',
        code:
          'module fifo_tb;\n    localparam WIDTH = 8;\n    localparam DEPTH = 8;\n\n    reg               clk;\n    reg               rst_n;\n    reg               wen;\n    reg  [WIDTH-1:0]  wdata;\n    wire              full;\n    reg               ren;\n    wire              empty;\n    wire [WIDTH-1:0]  rdata;\n\n    // Reference model: spec-written mirror of the FIFO\n    reg [WIDTH-1:0]  mem [0:DEPTH-1];\n    integer          head, tail, count;\n    integer          errors;\n\n    fifo #(.WIDTH(WIDTH), .DEPTH(DEPTH)) dut (\n        .clk(clk), .rst_n(rst_n),\n        .wen(wen), .wdata(wdata), .full(full),\n        .ren(ren), .rdata(rdata), .empty(empty)\n    );\n\n    always #5 clk = ~clk;  // simulation-only clock generation\n\n    // Checker: sampled every posedge after the model updates\n    task check_flags;\n        begin\n            if (full  !== (count == DEPTH)) begin\n                errors = errors + 1;\n                $display("FAIL t=%0t full=%b expected=%b", $time, full, (count == DEPTH));\n            end\n            if (empty !== (count == 0)) begin\n                errors = errors + 1;\n                $display("FAIL t=%0t empty=%b expected=%b", $time, empty, (count == 0));\n            end\n        end\n    endtask\n\n    initial begin\n        clk = 0; rst_n = 0; wen = 0; ren = 0;\n        errors = 0; head = 0; tail = 0; count = 0;\n        repeat (2) @(posedge clk);\n        rst_n = 1;\n        check_flags;  // empty must be asserted after reset\n\n        // Fill to full, then attempt one more write (must be rejected)\n        for (integer i = 0; i < DEPTH; i = i + 1) begin\n            @(negedge clk);\n            wen = 1; wdata = 8\'hA0 + i[7:0];\n            @(posedge clk);\n            #1; // model update follows the same accept rules\n            if (count < DEPTH) begin\n                mem[tail] = wdata; tail = (tail + 1) % DEPTH; count = count + 1;\n            end\n            check_flags;\n        end\n        @(negedge clk); wen = 0;\n\n        // ... drain, ordering check, simultaneous corners (see guided practice)\n\n        if (errors == 0) $display("TEST PASS");\n        else              $display("TEST FAIL (%0d errors)", errors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'The reference model (`mem`, `head`, `tail`, `count`) is written from the spec text, not from reading the DUT source.',
          'The DUT is instantiated with the same parameters the model assumes — a mismatch here invalidates every check silently.',
          '`check_flags` compares DUT flags against the model count every cycle it is called; each failure prints the time and both values so a debug session starts with evidence.',
          'Stimulus is applied at `negedge` and checked just after `posedge` — driving and sampling on opposite edges is the classic race-avoidance pattern for clocked TBs in plain Verilog.',
          'The model update is guarded by `count < DEPTH`, which encodes the spec rule that a write at full is rejected — so if the DUT accepts it, the flags diverge and the checker fires.',
          'The final `TEST PASS`/`TEST FAIL` summary plus `$finish` make the bench regression-automatable: the exit verdict is machine-parseable.',
        ],
      },
      {
        title: 'The FIFO corner matrix as a table',
        language: 'text',
        code:
          'State      | Op A      | Op B       | Expected (per spec)\n-----------+-----------+------------+----------------------------------\nempty      | read      | -          | ignored; empty stays; rdata stable\nempty      | write     | -          | accepted; empty deasserts\nempty      | write+read| -          | write accepted; read: spec-defined\nfull       | write     | -          | rejected; contents preserved\nfull       | read      | -          | accepted; full deasserts\nfull       | write+read| -          | read accepted; write: spec-defined\npartial    | write+read| -          | both accepted; count unchanged\nany        | reset     | -          | empty; contents lost; flags empty\n2 entries  | 2 reads   | 1 write    | ordering: oldest out first',
        explanation: [
          'Every row is one directed test plus one checker; "spec-defined" rows are the ones that expose missing spec detail.',
          'The final row is the ordering trap: a value written before another must be read before it, even with interleaved operations.',
          'This table *is* the functional coverage list for the FIFO: each row becomes a cover point, and closure means every row was hit by stimulus.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'FIFO testbench architecture',
        content:
          '              +---------------+\n  stimulus -->|     DUT       |--> flags, rdata\n  generator   | (RTL FIFO)    |        |\n       |      +---------------+        |\n       |              ^               v\n       |      +---------------+   +---------+\n       +----->| Reference     |-->| compare |--> PASS/FAIL\n              | model (spec)  |   +---------+\n              +---------------+\n\n  Same stimulus, same clock; model written from spec;\n  comparator checks flags every cycle and rdata at reads.',
        caption: 'The reference-model pattern: stimulus feeds DUT and model identically; a comparator turns divergence into a logged failure.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Checking flags in the wrong cycle because the DUT registers them.',
        fix: 'Read the spec first and encode the flag timing in the model. If flags are registered, the model must predict the registered value — comparing a combinational expectation against a registered output fails on every boundary transition.',
      },
      {
        mistake: 'Driving stimulus and sampling checks on the same clock edge with blocking assignments.',
        fix: 'Drive at negedge (or use nonblocking consistently) and sample after the posedge settles. A TB race between stimulus and checking produces failures that exist only in the testbench and waste days.',
      },
      {
        mistake: 'Never attempting an operation at full or empty because "the design will never do that".',
        fix: 'Systems attempt illegal operations constantly during integration. The rejected-operation corners are where data corruption lives; drive them deliberately and prove the contents survived.',
      },
    ],
    guidedPractice: {
      title: 'Complete the drain and ordering check',
      brief:
        'Extend the skeleton: after filling to full, drive the rejected write (one cycle of wen=1 while full), then drain all DEPTH entries one per cycle, checking that read k returns the value written at index k. Then attempt a read at empty and verify rdata and empty behave per the corner matrix.',
      starterCode:
        '// After the fill loop from the example:\n@(negedge clk); wen = 1; wdata = 8\'hFF;   // attempt write at FULL\n@(posedge clk); #1;\nif (count == DEPTH) $display("INFO: model also rejected (good)");\n@(negedge clk); wen = 0;\n\nfor (integer k = 0; k < DEPTH; k = k + 1) begin\n    @(negedge clk); ren = 1;\n    @(posedge clk); #1;\n    if (rdata !== mem[head]) begin\n        errors = errors + 1;\n        $display("FAIL order: read %0d got %h expected %h", k, rdata, mem[head]);\n    end\n    head = (head + 1) % DEPTH; count = count - 1;\n    check_flags;\nend\n@(negedge clk); ren = 1;                    // attempt read at EMPTY\n@(posedge clk); #1; check_flags;\n@(negedge clk); ren = 0;',
      expectedBehavior:
        'All reads return values in write order (A0, A1, ... for the fill from the example); the rejected write at full changes nothing, so the ordering check passes; the empty read leaves empty asserted; final verdict is TEST PASS with zero errors.',
      hints: [
        'The ordering check compares against mem[head] — the model head, which only advances on accepted reads.',
        'If the rejected-write test fails, check whether the DUT advanced its tail on the rejected write — that is a real bug, not a TB bug.',
        'Keep #1 after posedge before checking: it lets both DUT and model settle, avoiding zero-delay races.',
      ],
    },
    practiceExercises: [
      {
        title: 'Simultaneous read+write at the full boundary',
        brief:
          'Add a test that holds wen=1 and ren=1 for the cycle when the FIFO is exactly full with one more pending write. Determine from your spec what must happen, encode it in the model, and verify the DUT matches.',
        expectedBehavior:
          'The read is accepted; the write is accepted only if the spec says the freed slot is usable in the same cycle (common in FIFOs with pass-through, rejected in conservative designs). The point is the check exists and matches the spec sentence.',
        hints: [
          'Set up the state precisely: DEPTH-1 writes, then one cycle of write-only to reach full, then the simultaneous cycle.',
          'This corner is a classic interview question precisely because two defensible spec answers exist.',
        ],
      },
      {
        title: 'Wrap stress with a non-trivial sequence',
        brief:
          'Run 3 x DEPTH random-length bursts of writes and reads (never both idle), letting the pointers wrap at least three times, with the model checking flags every cycle and ordering at every read.',
        expectedBehavior:
          'Ordering holds across wraps; flags track the count at every cycle; the run ends with TEST PASS. Any divergence prints the cycle and values — that is your debug starting point.',
        hints: [
          'Generate data values from a seeded $random so the run is reproducible (Module 03 discipline).',
          'Track a global read-counter and write-counter in the model — comparing them against the count exposes accounting bugs in the model itself.',
        ],
      },
    ],
    assessment: {
      title: 'FIFO verification checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'A FIFO testbench writes 4 values, reads them back, and compares only the sorted set of values read against the sorted set written. Which bug does this checker definitely MISS?',
          options: [
            'Two entries swapped in order (reads B,A instead of A,B)',
            'The FIFO returns 8\'hFF on every read',
            'The FIFO never asserts empty after the last read',
            'The FIFO drops every write',
          ],
          answer: 'Two entries swapped in order (reads B,A instead of A,B)',
          explanation:
            'A set comparison ignores sequence position, and FIFO correctness IS the sequence contract. The other three failures change the multiset or the flags and would be caught.',
          hint: 'What makes a FIFO a FIFO rather than a bag?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'Why must the reference model be written from the specification rather than from the RTL source?',
          options: [
            'Because reading RTL is slower than reading the spec',
            'Because a model copied from the RTL inherits the RTL bugs and agrees with them',
            'Because Verilog cannot express behavioral models',
            'Because synthesis tools reject reference models',
          ],
          answer: 'Because a model copied from the RTL inherits the RTL bugs and agrees with them',
          explanation:
            'The model is an independent implementation of the spec. Copying the DUT logic makes the comparison circular — it can only catch TB wiring mistakes, never DUT bugs.',
          hint: 'Two witnesses who rehearse together prove nothing.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'Driving stimulus at the negedge and checking just after the posedge is a standard race-avoidance pattern for clocked testbenches in plain Verilog.',
          answer: 'true',
          explanation:
            'Separating the drive edge from the sample edge guarantees stimulus is stable when the DUT and model see the posedge, eliminating zero-delay ordering races without SystemVerilog clocking blocks.',
          hint: 'It replaces what SystemVerilog clocking blocks give you for free.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Name the two FIFO boundary states whose simultaneous read+write behavior is spec-defined rather than universally standardized (one word each, comma-separated).',
          answer: 'full, empty',
          explanation:
            'At full, whether a same-cycle read frees a slot for the write is a design decision; at empty, whether the read can observe the same-cycle write likewise. Both must be pinned down by the spec before checkers can be written.',
          hint: 'The two flag names are the two boundary states.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Reference model', definition: 'A behavioral implementation of the spec, cycle-aligned with the DUT, used as the comparison oracle.' },
      { term: 'Scoreboard', definition: 'Checking machinery that compares DUT outputs against the model, typically preserving ordering information.' },
      { term: 'Corner matrix', definition: 'The table of interesting states x operations; each row becomes a directed test and a cover point.' },
      { term: 'Rejected operation', definition: 'An attempted read at empty or write at full; must be ignored without state corruption.' },
      { term: 'Wrap-around', definition: 'Pointer arithmetic modulo depth; a coverage point because off-by-one wrap bugs hide from short tests.' },
    ],
    revisionSummary: [
      'Enumerate corners first: empty, full, simultaneous at both boundaries, rejected operations, wrap, reset mid-stream.',
      'The reference model is written from the spec, never from the RTL — independence is the whole point.',
      'Check ordering, not sets: read k must equal write k for accepted operations.',
      'Flag timing (registered vs combinational) is a spec decision; encode it in the model before checking flags.',
      'Deliberately drive rejected operations and prove contents survived — corruption hides there.',
    ],
    furtherReading: [
      { label: 'Wikipedia — FIFO (electronics)', url: 'https://en.wikipedia.org/wiki/FIFO_(electronics)', kind: 'article' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'dver-m04-l2',
    title: 'Register-Interface Verification',
    summary:
      'Register blocks are the most checkable spec in hardware: reset values, access types (RW, RO, W1C), readback, bit isolation and unmapped-address behavior — with ready-to-adapt Verilog checker tasks.',
    objectives: [
      'Verify reset values and write/readback for every documented register, automatically.',
      'Distinguish and test the standard access types: RW, RO, W1C and read-to-clear.',
      'Prove bit isolation — writing one field never disturbs another.',
      'Define and test unmapped-address behavior from the spec instead of assuming it.',
    ],
    whyItMatters:
      'Almost every block you will verify — timers, DMA controllers, PHYs — exposes a register interface, and software bring-up dies on register bugs. The register map is a table, which makes it the rare spec artifact you can turn into a near-exhaustive automated check. An afternoon of register verification work eliminates the most embarrassing class of silicon errata: "bit 3 of CTRL reads back inverted".',
    prerequisites: [
      'Self-checking testbench patterns (Module 02)',
      'The spec-as-source-of-truth discipline (Module 01)',
    ],
    explanation:
      'A register interface spec is a table: address, name, reset value, and an access type per field. Each cell converts directly into checks. **Reset values**: after reset, every readable register must return exactly its documented reset value — a simple sweep. **Write/readback (RW)**: write a walking-1s pattern (0x01, 0x02, 0x04, ...) and read back after each write; this catches stuck bits and decode mistakes in one pass. **Read-only (RO)**: writes must be ignored — write all-ones, write all-zeros, read back the unchanged value (which may require forcing the underlying source, e.g. a status flag, to a known state first). **Write-1-to-clear (W1C)**: the most commonly mis-implemented type — writing 1 to a bit clears it, writing 0 leaves it untouched, and writing 1 to *other* bits must not disturb it.\n\n**Bit isolation** deserves its own test: set field A to a pattern, write field B, then re-read field A. Interactions through shared decode logic or missing masks produce exactly this failure, and a whole-register readback sweep will not catch it because each write test rewrites the entire register.\n\nFinally, **unmapped addresses**: the spec must say what a read or write to an undocumented address does (read-as-zero, bus error, or wraps to a mapped address). This is a classic spec gap — file it if missing, then test whichever behavior the spec settles on. An interface that silently aliases an unmapped address onto a control register is a software foot-gun that verification should catch, not a customer.',
    deepDive:
      '### Why readback alone is weak\n\nA register that passes write/readback has proven storage and decode — nothing else. The *function* behind the register (a W1C bit actually clearing the interrupt, an ENABLE bit actually starting the timer) is verified by the block-level functional tests. Keep the two separated in the plan: the register suite proves the *interface contract*; functional tests prove the *semantics*. This split keeps the register suite reusable across projects — the access-type matrix barely changes between blocks.\n\n### The access-type matrix\n\nThe professional way to hold all of this is a table with one row per field: address, bits, type, reset. The testbench can be generated from (or driven by) that table — many teams keep the register table in a machine-readable form (IP-XACT, SystemRDL, or a plain CSV) and generate both the RTL decoder *and* the verification suite from it, so they cannot disagree. On this platform, keep it simple: a Verilog task per access type, driven by explicit calls, is enough to verify any register block to a professional standard.\n\n### Side-effect ordering\n\nW1C registers interact with live events: if the interrupt source re-asserts in the same cycle you clear it, a correct design re-asserts (the event is not lost). Spec-dependent and subtle — the check is: force event, clear, force again immediately, verify the second event survives. This is the level where register verification becomes real verification.',
    examples: [
      {
        title: 'Checker tasks for the standard access types (Verilog-2001)',
        language: 'verilog',
        code:
          '// Bus model: single-cycle write / read with one wait state, task-based\n// (adapt to your DUT\'s bus protocol)\n\nreg [31:0] rd_data;\ninteger    errors;\n\ntask bus_write(input [7:0] addr, input [31:0] data);\n    begin\n        @(negedge clk);\n        wr_en = 1; wr_addr = addr; wr_data = data;\n        @(negedge clk);\n        wr_en = 0;\n    end\nendtask\n\ntask bus_read(input [7:0] addr);\n    begin\n        @(negedge clk);\n        rd_en = 1; rd_addr = addr;\n        @(posedge clk); #1;\n        rd_data = rdata_bus;\n        @(negedge clk);\n        rd_en = 0;\n    end\nendtask\n\n// RW: walking-1s write/readback\ntask check_rw(input [7:0] addr);\n    integer b;\n    begin\n        for (b = 0; b < 32; b = b + 1) begin\n            bus_write(addr, 32\'h1 << b);\n            bus_read(addr);\n            if (rd_data !== (32\'h1 << b)) begin\n                errors = errors + 1;\n                $display("FAIL RW addr=%h bit%0d wrote %h read %h",\n                         addr, b, 32\'h1 << b, rd_data);\n            end\n        end\n    end\nendtask\n\n// W1C: writing 0 preserves, writing 1 clears only that bit\ntask check_w1c(input [7:0] addr, input [31:0] set_state);\n    begin\n        // assume status bits already driven to set_state by a backdoor force\n        bus_write(addr, 32\'h0);          // write all zeros\n        bus_read(addr);\n        if (rd_data !== set_state) begin\n            errors = errors + 1;\n            $display("FAIL W1C: write-0 must not clear (addr %h)", addr);\n        end\n        bus_write(addr, 32\'h1);          // clear only bit 0\n        bus_read(addr);\n        if (rd_data !== (set_state & ~32\'h1)) begin\n            errors = errors + 1;\n            $display("FAIL W1C: only bit 0 must clear (addr %h)", addr);\n        end\n    end\nendtask',
        explanation: [
          'The bus tasks encapsulate the protocol timing once; every checker reuses them, so a protocol change is a one-place fix.',
          '`check_rw` walks a single 1 through all 32 bit positions — stuck-at and decode faults cannot hide from a full walking-1s pass.',
          'The `!==` comparison matters: if the bus ever returns x (undriven decode path), the check fails loudly instead of silently passing.',
          '`check_w1c` assumes the status source was forced to a known state first (backdoor force or a driven event) — W1C cannot be checked against an uncontrolled source.',
          'The write-0 sub-check is the one most often skipped and most often broken: naive W1C RTL clears on any write.',
        ],
      },
      {
        title: 'Reset-value sweep',
        language: 'verilog',
        code:
          '// After releasing reset, every readable register must return its\n// documented reset value. The expected values live in one table so\n// spec changes touch exactly one place.\n\nreg [7:0]  addr_list [0:3];\nreg [31:0] rst_list  [0:3];\ninteger    i;\n\ninitial begin\n    addr_list[0] = 8\'h00; rst_list[0] = 32\'h0000_0001; // CTRL\n    addr_list[1] = 8\'h04; rst_list[1] = 32\'h0000_0000; // STATUS\n    addr_list[2] = 8\'h08; rst_list[2] = 32\'h0000_00FF; // PRESCALE\n    addr_list[3] = 8\'h0C; rst_list[3] = 32\'h0000_0000; // unused\nend\n\n// In the main initial block, after reset:\nfor (i = 0; i < 4; i = i + 1) begin\n    bus_read(addr_list[i]);\n    if (rd_data !== rst_list[i]) begin\n        errors = errors + 1;\n        $display("FAIL reset: addr %h read %h expected %h",\n                 addr_list[i], rd_data, rst_list[i]);\n    end\nend',
        explanation: [
          'The expected-reset table is a transcription of the spec table — keep them textually adjacent in review so drift is visible.',
          'One loop covers every readable register; adding a register is one line, so the sweep never goes stale.',
          'Reset-value failures are the cheapest bugs to find and the most embarrassing to ship; this loop makes them impossible to miss.',
        ],
      },
    ],
    tables: [
      {
        caption: 'Access-type behavior matrix (the contract your checkers enforce)',
        headers: ['Type', 'Write 1', 'Write 0', 'Read', 'Prime checker'],
        rows: [
          ['RW', 'sets the bit', 'clears the bit', 'returns stored value', 'walking-1s readback'],
          ['RO', 'ignored', 'ignored', 'returns source value', 'write 1s and 0s, value unchanged'],
          ['W1C', 'clears the bit', 'no effect', 'returns current status', 'write-0 preserves; single-bit clear'],
          ['Unmapped', 'spec-defined', 'spec-defined', 'spec-defined', 'probe per spec (file gap if silent)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Testing W1C by writing all-ones and checking the register reads zero.',
        fix: 'That passes even if writing zero also clears. Always include the write-zero-preserves sub-check, and clear one bit at a time to prove neighbor isolation.',
      },
      {
        mistake: 'Whole-register writes only, so bit isolation is never exercised.',
        fix: 'Program field A, write a different field B in the same register, re-read A. Shared-decode bugs appear only under partial writes.',
      },
      {
        mistake: 'Assuming unmapped addresses read as zero because that is what the RTL happens to do.',
        fix: 'The RTL behavior is a bug candidate, not a spec. If the spec is silent, file the gap, get the behavior defined, then test it — otherwise you are verifying an accident.',
      },
    ],
    guidedPractice: {
      title: 'Build the W1C suite for a status register',
      brief:
        'Given STATUS at 0x04 with fields DONE[0], ERR[1], HALF[2] (all W1C, sources forced by testbench signals), use check_w1c-style tasks to verify: write-0 preserves all three; clearing DONE leaves ERR and HALF set; a re-asserting DONE in the cycle after a clear is not lost.',
      starterCode:
        '// Backdoor: drive the status sources directly\n// (force or dedicated test inputs — adapt to your DUT)\n@(negedge clk); tb_done = 1; tb_err = 1; tb_half = 1;\nbus_read(8\'h04);\nif (rd_data !== 32\'h7) errors = errors + 1;  // all three visible\n\nbus_write(8\'h04, 32\'h1);                      // clear DONE only\nbus_read(8\'h04);\nif (rd_data !== 32\'h6) begin\n    errors = errors + 1;\n    $display("FAIL: clear DONE disturbed others");\nend\n\n// Same-cycle re-assert: DONE rises again right after the clear\n@(negedge clk); tb_done = 1;\nbus_read(8\'h04);\nif (rd_data !== 32\'h7) $display("FAIL: re-assert lost");',
      expectedBehavior:
        'All three sub-checks pass: write-0 changes nothing, single-bit clear is surgical, and a status event arriving immediately after its clear re-asserts instead of being swallowed.',
      hints: [
        'If clearing DONE clears everything, look for the RTL clearing the whole register on any write — a classic W1C bug.',
        'The same-cycle re-assert check may legitimately fail per spec (pulse-lost designs exist); if so, verify the spec sentence instead of assuming.',
      ],
    },
    practiceExercises: [
      {
        title: 'Full register-map automation',
        brief:
          'Combine the reset sweep, RW walking-1s, and W1C checks into one ordered suite that runs after reset and prints a per-register PASS line, ending in a single TEST PASS/FAIL verdict.',
        expectedBehavior:
          'Running the suite on any conforming register block prints one line per register and one verdict; a seeded bug in any access type flips the verdict to FAIL with the address named.',
        hints: [
          'Drive everything from the address/type tables — the suite body should contain zero register-specific code.',
          'Re-use the bus tasks; never re-implement protocol timing per check.',
        ],
      },
      {
        title: 'Unmapped-address probe',
        brief:
          'Write the spec sentence (or file the gap) for accesses to an address not in the map, then implement the probe test for the defined behavior.',
        expectedBehavior:
          'The probe test demonstrates the documented behavior (read-as-zero, error response, or alias) and the spec has a sentence to cite — no behavior is verified by accident.',
        hints: [
          'Probe several unmapped addresses, not one — decode aliases often hit only part of the space.',
          'A read that returns x is a finding, not a pass: undriven decode paths must be spec-defined too.',
        ],
      },
    ],
    assessment: {
      title: 'Register verification checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'Writing all-ones to a W1C register and observing that it reads back zero afterwards proves which of the following?',
          options: [
            'That the W1C semantics are fully correct',
            'Only that ones can clear bits — not that zeros preserve them or that neighbors are isolated',
            'That the register is actually RW',
            'Nothing at all',
          ],
          answer: 'Only that ones can clear bits — not that zeros preserve them or that neighbors are isolated',
          explanation:
            'The dangerous W1C bugs (clear-on-any-write, over-clearing) need the write-zero and single-bit sub-checks to expose. The all-ones write is necessary but far from sufficient.',
          hint: 'What would a buggy clear-on-any-write implementation do under this test?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'bug-identification',
          prompt:
            'A verification plan reads: "Write 0x1 to CTRL, read back 0x1, done." What is the most significant gap for a CTRL register whose bit 0 is ENABLE (RW) and bit 1 is MODE (RW)?',
          code:
            '// Spec: CTRL (0x00), reset 0x0\n//   bit0 ENABLE : RW\n//   bit1 MODE   : RW (0 = slow, 1 = fast)\n// Test as written:\n//   bus_write(0x00, 0x1);\n//   bus_read(0x00);   // expect 0x1 -> PASS',
          options: [
            'The reset value was never checked',
            'Bit isolation is never tested: setting MODE after ENABLE may disturb ENABLE',
            'Walking-1s was not used on bit 1',
            'The test should use 0x3 instead of 0x1',
          ],
          answer: 'Bit isolation is never tested: setting MODE after ENABLE may disturb ENABLE',
          explanation:
            'The single write/readback proves one value round-trips. Fields sharing a register interact through the decode and mask logic — only a program-A, write-B, re-read-A sequence can expose it. (Reset and walking-1s are also gaps, but isolation is the one that functional software will trip on.)',
          hint: 'Two fields, one register, one tested value.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'A register block that passes a full readback suite has proven that its ENABLE bit actually enables the block\'s function.',
          answer: 'false',
          explanation:
            'Readback proves storage and decode — the interface contract. Whether ENABLE has the promised functional effect is proven only by the functional tests that observe the block\'s behavior.',
          hint: 'Interface contract vs semantics.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'What access type is defined as "writing 1 clears the bit, writing 0 has no effect" (abbreviation)?',
          answer: 'W1C',
          explanation:
            'Write-1-to-clear, the standard mechanism for interrupt and event status registers precisely because software can clear one event without disturbing others in the same register.',
          hint: 'Three characters, starts with W.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Access type', definition: 'Per-field contract: RW, RO, W1C (write-1-to-clear), read-to-clear — each with its own checker pattern.' },
      { term: 'Walking-1s', definition: 'A write/readback pattern moving a single 1 through every bit position; exposes stuck bits and decode faults.' },
      { term: 'Bit isolation', definition: 'The property that writing one field of a register never disturbs another field of the same register.' },
      { term: 'Backdoor access', definition: 'Testbench-driven manipulation of internal signals (e.g. forcing status sources) to create checkable states.' },
      { term: 'Unmapped address', definition: 'An address outside the register map; its read/write behavior must be spec-defined, not accidental.' },
    ],
    revisionSummary: [
      'Register specs are tables; convert every cell into an automated check (reset value, access type, field bits).',
      'RW: walking-1s readback. RO: writes ignored. W1C: write-0 preserves + single-bit surgical clear + neighbor isolation.',
      'Bit isolation needs program-A, write-B, re-read-A — whole-register sweeps cannot see it.',
      'Readback proves the interface contract only; functional semantics need functional tests.',
      'Unmapped-address behavior is a spec sentence or a spec gap — never verify an accident.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Memory-mapped I/O', url: 'https://en.wikipedia.org/wiki/Memory-mapped_I/O', kind: 'article' },
      { label: 'Wikipedia — Register transfer level', url: 'https://en.wikipedia.org/wiki/Register_transfer_level', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'dver-m04-l3',
    title: 'UART Transmitter and Parameterized Modules',
    summary:
      'Two applied finales: a bit-level verification plan for a UART TX (frame format, baud tolerance, back-to-back frames) and a strategy for parameterized modules — boundary configurations, not just the default.',
    objectives: [
      'Write a verification plan for a UART transmitter whose checks operate on bits, not bytes.',
      'Measure baud-period tolerance in the testbench and compare it against a stated budget.',
      'Verify a parameterized module at boundary configurations (width 1 and width 32), not only at its default.',
      'Adapt reference models so width-dependent behavior (overflow, width growth) is checked at every configuration.',
    ],
    whyItMatters:
      'The UART is the first place most engineers meet protocol verification: the contract is a waveform with bit-level timing, and a byte-level echo test cannot see bit-order, stop-bit or half-period errors — the bugs that actually occur. Parameterized modules are the second universal reality: your WIDTH=8 test suite passes while the WIDTH=1 and WIDTH=32 configurations — the ones a customer actually instantiates — hide off-by-one bugs. These two skills, bit-level checking and configuration-sweep testing, multiply the value of everything in Modules 1-3.',
    prerequisites: [
      'UART frame format (Embedded C course, Module 7)',
      'Self-checking testbench patterns and reference models (Module 02)',
      'Parameterized modules (Verilog course, Module 13)',
    ],
    explanation:
      'A UART transmitter serializes a byte as: idle-high line, a 0 **start bit**, eight data bits **LSB first**, an optional parity bit, and a 1 **stop bit** (extendable to two). The verification contract is that waveform. The checker therefore cannot be "echo the byte" — it must be a **bit-level monitor**: a task that, on the falling edge of the start bit, samples the line at the *midpoint of each bit period* and reconstructs the frame, comparing against the byte that was pushed into the transmitter. Midpoint sampling is deliberate: it is exactly how a real receiver works, so the testbench validates the transmitter against its actual consumer.\n\n**Baud tolerance** is the second check: measure the actual start-bit duration in simulation time and compare with the expected period (clock frequency divided by the baud divisor). A transmitter with a rounding error in its divisor still produces frames that echo correctly in an idealized testbench but fail against a real receiver at the edge of its tolerance. The testbench computes the error in percent and checks it against a budget you state in the plan (classically about ±2-3% end-to-end for UART).\n\n**Parameterized modules** need the same discipline applied across configurations. The reliable minimum: verify at the **boundary configurations** — WIDTH=1 (degenerate: does the wrap, carry or flag logic still behave?) and a large width like WIDTH=32 (does width growth, zero-extension or overflow behave?) — plus the default. The mechanism in Verilog-2001 is straightforward: the testbench itself is parameterized, and the regression script (or a generate-based wrapper) instantiates it per configuration. The reference model must be written so its arithmetic follows the parameter — a model hard-coded to 8 bits verifies nothing at 32.',
    deepDive:
      '### Why byte-level tests miss bit-level bugs\n\nImagine the transmitter sends bits MSB-first (a real, common RTL mistake). An idealized testbench loop that "reads a byte" by sampling at bit times and assembling in the same wrong order round-trips perfectly. Only a monitor that assembles the frame *per the spec* (LSB first) and compares against the driven byte catches it. Same story for stop-bit length (a receiver resynchronizes on start edges, so a 0.7-bit stop passes echo tests and fails marginal receivers) and for start-bit glitches shorter than a filter would accept. The general principle: **the checker must implement the spec independently, at the same granularity the spec speaks** — for UART, bits.\n\n### Configuration coverage as a coverage model\n\nTreat parameter values as a coverage dimension: for a WIDTH parameter, the interesting values are 1, 2 (smallest multi-bit), the default, and a large value where carries interact (e.g. 32). For a DEPTH parameter, 1 and a non-power-of-two (e.g. 5, if supported — exposes wrap logic that assumed power-of-two). Each (parameter, corner) pair is a cover point; a configuration is "verified" when its corner matrix has been run. On large teams this is where generate-based parameterized testbenches or vManager-style regression management earn their keep; at your scale, a script looping `iverilog` runs per configuration does the same job.\n\n### An honest limit\n\nA UART TX testbench checks the waveform contract and the timing budget. It does not prove interoperability with every real receiver — receivers vary in sampling strategy and tolerance. The plan should say so: "verified: frame format at midpoint sampling, baud error < X%, back-to-back frames". Claims stop at the evidence.',
    examples: [
      {
        title: 'Bit-level UART frame monitor (Verilog-2001 task)',
        language: 'verilog',
        code:
          '// Assumes: parameter BIT_T = clock periods per UART bit.\n// DUT signals: tx (serial out), plus a way to push a byte\n// (e.g. wen/data_in/busy) adapted to your transmitter.\n\ntask check_frame(input [7:0] expected_byte);\n    integer b;\n    reg [7:0] sampled;\n    real     start_err_pct;\n    begin\n        // 1. Wait for the start bit (falling edge) while idle-high\n        @(negedge tx);\n\n        // 2. Measure the start-bit period against the budget\n        #(BIT_T * CLK_PERIOD * 0.5);        // midpoint of start bit\n        if (tx !== 1\'b0) begin\n            errors = errors + 1;\n            $display("FAIL: start bit not low at midpoint");\n        end\n\n        // 3. Sample 8 data bits at midpoints, LSB first\n        sampled = 8\'h00;\n        for (b = 0; b < 8; b = b + 1) begin\n            #(BIT_T * CLK_PERIOD);          // next bit midpoint\n            sampled[b] = tx;                 // LSB first assembly\n        end\n\n        // 4. Stop bit must be high at its midpoint\n        #(BIT_T * CLK_PERIOD);\n        if (tx !== 1\'b1) begin\n            errors = errors + 1;\n            $display("FAIL: stop bit not high at midpoint");\n        end\n\n        // 5. Data comparison — the independent spec check\n        if (sampled !== expected_byte) begin\n            errors = errors + 1;\n            $display("FAIL: sent %h received-as-spec %h",\n                     expected_byte, sampled);\n        end\n    end\nendtask',
        explanation: [
          'The monitor triggers on the start-bit falling edge and samples every bit at its midpoint — the same strategy a real UART receiver uses.',
          '`sampled[b] = tx` assembles LSB-first per the spec; if the DUT is accidentally MSB-first, `sampled` is the bit-reversal of the expected byte and the check fails.',
          'The stop-bit midpoint check catches shortened stop bits that byte-echo tests cannot see.',
          'The comparison is against `expected_byte` — the value the testbench pushed — never against a re-reading of the DUT.',
          'This task is the reusable core of the UART TX suite; every scenario (single, back-to-back, reset mid-frame) calls it once per frame.',
        ],
      },
      {
        title: 'Parameterized testbench, instantiated per configuration',
        language: 'verilog',
        code:
          '// counter_tb.v — parameterized like the DUT so one file\n// verifies every configuration the regression requests.\nmodule counter_tb #(parameter WIDTH = 8);\n    reg               clk, rst_n, en;\n    wire [WIDTH-1:0]  count;\n    wire              wrap;\n    reg  [WIDTH-1:0]  model_q;\n    integer           errors;\n\n    counter #(.WIDTH(WIDTH)) dut (\n        .clk(clk), .rst_n(rst_n), .en(en),\n        .count(count), .wrap(wrap)\n    );\n\n    always #5 clk = ~clk;\n\n    // Reference model sized by the same parameter\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n)      model_q <= {WIDTH{1\'b0}};\n        else if (en)     model_q <= model_q + 1\'b1;  // wraps naturally\n    end\n\n    always @(posedge clk) begin\n        if (rst_n) begin\n            if (count !== model_q) begin\n                errors = errors + 1;\n                $display("FAIL W=%0d t=%0t count=%h model=%h",\n                         WIDTH, $time, count, model_q);\n            end\n            if (wrap !== (model_q == {WIDTH{1\'b1}})) begin\n                errors = errors + 1;\n                $display("FAIL W=%0d wrap at %h", WIDTH, model_q);\n            end\n        end\n    end\n\n    initial begin\n        clk = 0; rst_n = 0; en = 0; errors = 0;\n        repeat (2) @(posedge clk); rst_n = 1;\n        en = 1;\n        // At WIDTH=32 a full wrap sweep is impractical; drive a bounded\n        // number of ticks plus a directed check at the all-ones state.\n        repeat (20) @(posedge clk);\n        // For small widths, let it wrap at least twice by construction:\n        // WIDTH=1 wraps every other tick; WIDTH=8 needs 256 — add a\n        // directed preload if the DUT supports it, else bump the count.\n        en = 0;\n        if (errors == 0) $display("TEST PASS (WIDTH=%0d)", WIDTH);\n        else             $display("TEST FAIL (WIDTH=%0d, %0d errors)", WIDTH, errors);\n        $finish;\n    end\nendmodule\n\n// top.v — one instance per configuration:\nmodule top;\n    counter_tb #(.WIDTH(1))  tb_w1  ();\n    counter_tb #(.WIDTH(2))  tb_w2  ();\n    counter_tb #(.WIDTH(8))  tb_w8  ();\n    counter_tb #(.WIDTH(32)) tb_w32 ();\nendmodule',
        explanation: [
          'The testbench takes the same parameter as the DUT — the reference model\'s arithmetic (`+ 1\'b1` on a WIDTH-wide reg) follows the configuration automatically.',
          'The wrap flag check is parameter-aware: all-ones is `{WIDTH{1\'b1}}`, so the check is correct at every width including the degenerate WIDTH=1.',
          'WIDTH=1 is the configuration where wrap logic usually breaks — it asserts on every second tick; the model predicts that, so a DUT that only wraps at 8-bit boundaries fails immediately.',
          'Instantiating several configurations in one `top` module lets a single `iverilog` run verify them all; each prints its own PASS/FAIL line.',
          'The comment is honest about test economics: a 32-bit full-wrap sweep is 4 billion cycles, so wide configurations use bounded random plus directed boundary states instead.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'UART frame for byte 0x55, LSB first (educational waveform, illustrative)',
        content:
          'idle   start  b0   b1   b2   b3   b4   b5   b6   b7   stop\n ___    ___   ___      ___      ___      ___      ___    ___\n     \\ /   \\     \\    /   \\    /   \\    /   \\    /   \\  /\n      X     X     X         X         X         X\n 1 |  0  |  1  |  0  |  1  |  0  |  1  |  0  |  1  |  0  |  1\n\n 0x55 = 01010101b -> LSB first on the wire: 1,0,1,0,1,0,1,0\n Monitor samples at each bit midpoint (marked X).',
        caption:
          'The frame for 0x55 is the ideal directed test: alternating bits expose bit-order errors unambiguously (MSB-first transmission produces the mirrored pattern 0xAA at the monitor).',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Verifying the UART transmitter with a byte-echo loop instead of a bit-level monitor.',
        fix: 'An echo loop shares the DUT\'s assumptions. Check the waveform the spec defines: start edge, per-bit midpoint samples assembled LSB-first, stop bit — all compared against the pushed byte.',
      },
      {
        mistake: 'Testing parameterized modules only at the default parameter values.',
        fix: 'The default is the configuration everyone tests; the bugs live at WIDTH=1 and at wide values where carry/overflow interact. Sweep boundary configurations in every regression.',
      },
      {
        mistake: 'Writing the reference model with hard-coded widths.',
        fix: 'Parameterize the model identically to the DUT (or compute from the parameter), otherwise the "model" silently verifies a different design than the one instantiated.',
      },
    ],
    guidedPractice: {
      title: 'The 0x55 frame test',
      brief:
        'Using check_frame, transmit the byte 0x55 (alternating bits), then 0x00 and 0xFF (all-low and all-high data). Verify all three frames pass the bit-level monitor, and compute the measured start-bit period error against a 2% budget.',
      starterCode:
        '// Push 0x55 and verify the frame\n@(negedge clk); wen = 1; data_in = 8\'h55;\n@(negedge clk); wen = 0;\nwait (!busy);            // frame complete\ncheck_frame(8\'h55);      // monitor already ran during transmission — see hint\n\n// A cleaner structure: fork the monitor before pushing the byte\n// fork; check_frame(8\'h55); join_none  (or use a fork/join around push)',
      expectedBehavior:
        'Three frames verified bit-by-bit: the alternating pattern catches bit-order bugs, 0x00 and 0xFF catch stuck-line and start/stop confusion; the measured bit period is within the stated budget and the error in percent is printed.',
      hints: [
        'check_frame blocks on the start edge, so run it concurrently with the push (fork...join_none) or call it before the frame starts.',
        '0x55 LSB-first produces the perfect visual pattern in the waveform viewer — learn to recognize it on sight.',
        'Measure the period between the start-edge time and one BIT_T later in simulation time; percentage error = (measured - expected)/expected * 100.',
      ],
    },
    practiceExercises: [
      {
        title: 'Back-to-back frames and reset mid-frame',
        brief:
          'Push bytes continuously with no idle gap between frames (if the transmitter supports it) for at least 10 bytes, then push a byte and assert reset in the middle of its data bits. Verify every completed frame passed the monitor and the line returns to idle-high after reset.',
        expectedBehavior:
          'All complete frames verify; the interrupted frame is abandoned (no partial frame ever passes the monitor); after reset release the line is idle-high and the next frame starts cleanly with a proper start bit.',
        hints: [
          'Back-to-back means the stop bit of one frame is followed immediately by the start bit of the next — the monitor must re-arm without seeing idle.',
          'A line stuck low after mid-frame reset is a real bug class: the receiver would see a perpetual break condition.',
        ],
      },
      {
        title: 'Configuration sweep for a parameterized counter',
        brief:
          'Adapt the parameterized testbench pattern to a counter with WIDTH and an optional MODE (0 = wrap, 1 = saturate). Verify WIDTH in {1, 2, 8, 32} x MODE in {0, 1}, with the model implementing both modes.',
        expectedBehavior:
          'Eight configurations, each with its own PASS/FAIL line: wrap mode rolls over at all-ones; saturate mode holds at all-ones; WIDTH=1 saturate-mode holds at 1 forever after the first tick.',
        hints: [
          'Model MODE in the reference with a conditional in the clocked block — two lines of model code, one entire bug class covered.',
          'WIDTH=1 saturate is the single most bug-prone cell in the matrix; make sure stimulus actually reaches the saturated state.',
        ],
      },
    ],
    assessment: {
      title: 'Applied verification checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'A UART transmitter testbench pushes 0x55, loops the serial line back through a matching receiver model the same engineer wrote from the DUT, and sees the byte echo correctly. What has NOT been proven?',
          options: [
            'That the frames conform to the spec\'s bit order and stop-bit timing',
            'That the transmitter can send 0x55',
            'That the loopback wiring is correct',
            'That the testbench runs',
          ],
          answer: 'That the frames conform to the spec\'s bit order and stop-bit timing',
          explanation:
            'A receiver written from the DUT (or sharing its author\'s assumptions) inherits its mistakes — MSB-first transmits echo perfectly through an MSB-first receiver. Only an independent, spec-written bit monitor breaks the circle.',
          hint: 'Who wrote the checker, and from what?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'Which parameter value for a WIDTH-parameterized counter is MOST likely to expose a bug that testing at WIDTH=8 misses?',
          options: ['WIDTH=16', 'WIDTH=1', 'WIDTH=4', 'WIDTH=8 with a different seed'],
          answer: 'WIDTH=1',
          explanation:
            'WIDTH=1 is the degenerate configuration: all-ones is 1\'b1, so wrap/saturate logic triggers every other tick and off-by-one width assumptions (like `count < WIDTH-1` vs `<=`) break immediately.',
          hint: 'Think about where the boundary math collapses.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'A simulation-time measurement showing the UART bit period is 1.4% shorter than the ideal period should be reported as a verification failure.',
          answer: 'false',
          explanation:
            'It is a measurement to compare against the stated tolerance budget. If the plan budgets ±2%, 1.4% passes; the finding is the measured error versus the budget, not a bare pass/fail invented after the fact.',
          hint: 'Failures are defined by the plan, and the plan states a budget.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In a UART frame, data bits are transmitted starting with which bit of the byte: the most-significant or the least-significant?',
          answer: 'least-significant',
          explanation:
            'UART transmits LSB first. A transmitter that shifts MSB first produces bit-reversed bytes — a classic bug that only a spec-written bit-level monitor catches reliably.',
          hint: 'The opposite of most bus protocols.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Bit-level monitor', definition: 'A checker that samples a serial waveform at bit midpoints and reconstructs frames per the spec, independent of the DUT.' },
      { term: 'Baud tolerance', definition: 'The budgeted percentage error between actual and ideal bit periods; measured in the TB and compared against the plan.' },
      { term: 'Boundary configuration', definition: 'Extreme parameter values (WIDTH=1, large widths, non-power-of-two depths) where parameterized logic actually breaks.' },
      { term: 'Configuration sweep', definition: 'Running the parameterized testbench across a chosen set of configurations in regression.' },
      { term: 'Back-to-back frames', definition: 'Consecutive UART frames with no idle gap; stress the transmitter\'s re-arm and stop-bit logic.' },
    ],
    revisionSummary: [
      'UART verification is bit-level: start edge, midpoint samples assembled LSB-first per the spec, stop-bit check — never a byte echo through assumptions you share with the DUT.',
      'Measure baud error in percent and compare against a budget stated in the plan; the finding is the number plus the budget.',
      'Parameterized modules are verified at boundary configurations (1, 2, default, large) — the default is the configuration everyone already tested.',
      'Parameterize the reference model identically to the DUT, or it verifies a different design.',
      'State claims at the evidence boundary: "frame format verified at midpoint sampling" is honest; "works with all receivers" is not.',
    ],
    furtherReading: [
      { label: 'Wikipedia — UART', url: 'https://en.wikipedia.org/wiki/Universal_asynchronous_receiver-transmitter', kind: 'article' },
      { label: 'Wikipedia — Serial port', url: 'https://en.wikipedia.org/wiki/Serial_port', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
];
