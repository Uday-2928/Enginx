import type { TutorialLesson } from '../types';

// Module 06 — Procedural Blocks
export const module06Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m06-l1',
    title: 'initial and always: the Two Procedural Worlds',
    summary:
      'Enter procedural Verilog: initial blocks that run once (simulation-only) and always blocks that repeat forever, with begin/end sequencing.',
    objectives: [
      'Distinguish initial from always and state where each is legal.',
      'Use begin/end to sequence statements and understand why procedural targets must be reg.',
      'Label every simulation-only construct you write.',
      'Recognize the synthesizable patterns of always at a glance.',
    ],
    whyItMatters:
      'Procedural blocks are where Verilog starts to look like software — and where the software analogy starts to hurt. Everything you write inside initial and always is subject to scheduling semantics (module 07) and synthesis pattern-matching (modules 08-09). Getting the mental model right now — initial is a simulation harness tool, always is how you describe registers and combinational logic — prevents the two most common categories of beginner bugs.',
    prerequisites: ['vlog-m05-l1', 'vlog-m03-l1'],
    explanation:
      'Verilog has exactly two kinds of **procedural blocks** — regions of code containing sequential statements:\n\n- **initial** runs ONCE, starting at simulation time 0. It has no hardware meaning: nothing in a chip "runs once at startup" (with narrow, vendor-specific FPGA exceptions for power-up values). initial is the workhorse of testbenches — stimulus, expected-value checks, $display summaries all live there. **Treat every initial block as simulation-only.**\n- **always** repeats FOREVER — the block re-executes every time its event control (the `@(...)` part) triggers. This is the hardware-flavored block: `always @(posedge clk)` describes registers, `always @*` describes combinational logic. An always block without an event control (`always #5 clk = ~clk;`) loops endlessly with a delay — a simulation-only idiom for clock generation, useless for synthesis.\n\nStatements inside both block types execute **in written order** — this is the one place Verilog behaves sequentially, and the reason procedural targets must be variables (`reg`): a statement needs somewhere to *store* a result between statements. `begin ... end` groups statements into one block (like C braces); a block without begin/end executes just its single statement.\n\n### The synthesizable patterns of always\n\nSynthesis tools do not "run" always blocks — they recognize STRUCTURES. Three patterns cover 95 percent of design code: `always @(posedge clk ...)` with nonblocking assignments → registers (module 09); `always @*` with complete if/case and blocking assignments → combinational logic (module 08); anything else (delays, waits, initial) → simulation-only. Holding these three shapes in your head turns "is this synthesizable?" into a glance.',
    deepDive:
      '### Why procedural targets must be reg\n\nA continuous assign is *always* evaluating — it needs no storage, it is a standing gate. A procedural statement executes at a *moment* (a trigger, a clock edge) and its effect must persist until the next such moment: that requires a variable that HOLDS a value between executions. That holding is what reg means — nothing more. This is also why combinational always blocks do not create registers: the block re-executes immediately whenever inputs change, so the reg tracks its expression continuously, exactly like a wire (module 03’s debunk, now with the mechanism).\n\n### begin/end and statement anatomy\n\n`begin : name ... end` may carry an optional label (useful for disabling the block in testbenches). Declarations (regs, integers) may appear at the TOP of a named block only. The sequencing inside a block is strict: statement 2 sees the effects of statement 1 (for blocking assignments) — which is precisely the behavior that makes combinational code natural and clocked code dangerous when misused (the blocking-vs-nonblocking story of module 07).\n\n### initial in the real world (the honest footnote)\n\nFPGA flows commonly accept reg initialization (`reg [7:0] cnt = 0;`) and even initial blocks to set power-up values, because FPGA configuration hardware genuinely loads initial contents. ASIC flows do not: silicon powers up in an unknown state and relies on reset. This course keeps ALL initialization in reset logic (portable) and uses initial only in testbenches (always simulation-only). If you rely on initial values in design code, label it as FPGA-specific in a comment.',
    examples: [
      {
        title: 'The two blocks side by side: harness vs hardware',
        language: 'verilog',
        code:
          '// ---------- design side: always = hardware structure ----------\nmodule reg1(\n    input  wire clk,\n    input  wire reset_n,\n    input  wire d,\n    output reg  q        // reg: procedural target (IS a flip-flop here)\n);\n    // Clocked always: registers. Sim+synthesis legal.\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n)\n            q <= 1\'b0;          // nonblocking: module 07 explains why\n        else\n            q <= d;\n    end\nendmodule\n\n// ---------- testbench side: initial = simulation harness ----------\n`timescale 1ns/1ps\nmodule tb_reg1;              // testbench: no ports, sim-only\n    reg clk, reset_n, d;\n    wire q;\n\n    reg1 dut (.clk(clk), .reset_n(reset_n), .d(d), .q(q));\n\n    // Clock generator: always + delay = SIM-ONLY loop.\n    initial clk = 1\'b0;\n    always  #5 clk = ~clk;   // toggles every 5 time units, forever\n\n    initial begin            // stimulus: runs once from time 0\n        reset_n = 0; d = 0;\n        #12  reset_n = 1;    // release reset mid-period (on purpose)\n        #10  d = 1;          // change data away from clock edges\n        #20  d = 0;\n        #20;\n        $display("simulation done");\n        $finish;\n    end\nendmodule',
        explanation: [
          'Design module: `always @(posedge clk or negedge reset_n)` is the async-reset flip-flop template — q captures d on every rising clock edge, and resets to 0 the moment reset_n falls. (Full treatment in module 09.)',
          'Testbench: `initial clk = 0;` + `always #5 clk = ~clk;` is the standard clock generator — the always-with-delay form loops forever and is SIM-ONLY (no hardware meaning).',
          'The stimulus initial block sequences like a script: apply reset, wait #12, release, drive d, finish. Every #delay and $display here is simulation-only.',
          'q is `output reg` because it is assigned procedurally; in THIS block (clocked) it really is a flip-flop.',
          'Note the event control `@(posedge clk or negedge reset_n)`: two trigger edges, the exact list synthesis expects for an async-reset flop — incomplete lists are a module 15 mistake.',
        ],
      },
      {
        title: 'begin/end sequencing and the reg requirement',
        language: 'verilog',
        code:
          '// seq_demo.v — sim-only demo of procedural sequencing\n`timescale 1ns/1ps\nmodule seq_demo;\n    reg [3:0] acc;      // procedural target: reg\n    integer   i;        // loop variable\n\n    initial begin\n        acc = 4\'d0;                    // statement 1\n        for (i = 0; i < 4; i = i + 1) begin\n            acc = acc + 4\'d3;          // blocking: executes NOW, in order\n            $display("i=%0d acc=%0d", i, acc);   // sees the NEW acc\n        end\n        $finish;\n    end\nendmodule',
        explanation: [
          'Statements inside one initial block execute strictly in order: each `acc = acc + 3` completes before the $display reads acc.',
          'Expected printed lines: i=0 acc=3, i=1 acc=6, i=2 acc=9, i=3 acc=12 — four blocking additions, each observed immediately after.',
          'acc is a reg because only variables can be procedural targets; the integer i is the loop counter (a sim construct here).',
          'This sequencing is REAL in simulation and would be WRONG to imitate in clocked design code — module 07 shows why blocking accumulation across registers causes races. Here, inside a single sim-only initial block, it is exactly what we want.',
          'begin/end groups the loop body (two statements); the outer begin/end groups the whole stimulus.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Which block belongs where',
        content:
          '   +---------------------+----------------------+---------------------+\n   |      BLOCK          |       RUNS           |      LEGAL IN       |\n   +---------------------+----------------------+---------------------+\n   | initial             | once at t=0          | SIM ONLY (TB init,  |\n   |                     |                      | FPGA power-up init*)|\n   | always @(posedge..) | on each clock edge   | design (registers)  |\n   | always @*           | on any input change  | design (comb logic) |\n   | always #5 ...       | forever, by delay    | SIM ONLY (clk gen)  |\n   +---------------------+----------------------+---------------------+\n\n   * FPGA-vendor-specific power-up initialization; not portable, not ASIC.',
        caption:
          'The block type tells you the world: testbench harness or design structure. Label anything outside design patterns as simulation-only.',
      },
    ],
    tables: [
      {
        caption: 'Procedural block quick reference',
        headers: ['Construct', 'Executes', 'Synthesizable?', 'Typical use'],
        rows: [
          ['initial', 'Once, at time 0', 'No (ASIC); FPGA init cases only', 'Testbench stimulus, checks'],
          ['always @(posedge clk or negedge reset_n)', 'On each edge in the list', 'Yes — registers', 'Sequential design RTL'],
          ['always @*', 'On any referenced signal change', 'Yes — combinational logic', 'Combinational design RTL'],
          ['always #N stmt', 'Forever, every N time units', 'No', 'Clock/oscillator generation in TB'],
          ['begin ... end', 'Groups statements in order', '(a grouping, not a construct)', 'Everywhere inside blocks'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Putting stimulus, delays or $display inside a design (synthesizable) module.',
        fix:
          'Design modules contain only synthesizable structure: clocked always blocks, always @*, assign, instances. Stimulus and printing live in a separate testbench file — the split from module 01 that keeps synthesis clean.',
      },
      {
        mistake: 'Assigning a wire inside an always block (or a reg with an assign) after "it seemed more natural".',
        fix:
          'Procedural assignment requires a variable: change the declaration to reg (and the port to output reg if applicable). Continuous drivers require nets. The type follows the driver.',
      },
      {
        mistake: 'Forgetting begin/end around a multi-statement block, leaving only the first statement inside the loop or always body.',
        fix:
          'A block without begin/end owns exactly ONE statement — the classic silent bug (the second statement runs unconditionally, outside the loop/edge). Group every multi-statement body in begin...end, always.',
      },
    ],
    guidedPractice: {
      title: 'Classify the blocks',
      brief:
        'For each fragment, state: initial or always, synthesizable or sim-only, and what hardware (if any) it describes: (1) always @(posedge clk) cnt <= cnt + 1; (2) initial begin a=0; b=0; end (3) always @* y = a & b; (4) always #10 clk = ~clk; (5) initial $display("done");',
      expectedBehavior:
        '(1) always, synthesizable — an incrementing register (module 10). (2) initial, sim-only — testbench stimulus. (3) always @*, synthesizable — an AND gate as combinational logic. (4) always-with-delay, sim-only — a clock generator. (5) initial, sim-only — a message printer.',
      hints: [
        'Event control with clock edges = registers; @* = combinational; delays = simulation.',
        'initial never synthesizes (ASIC rule; FPGA init is the labeled exception).',
      ],
    },
    practiceExercises: [
      {
        title: 'Build the classic clock generator',
        brief:
          'Write a testbench skeleton (module tb; ... endmodule) with a 10-time-unit-period clock (toggle every 5), a reset asserted for 7 units then released, and a $finish after 100 units. Label every sim-only construct with a comment.',
        expectedBehavior:
          'initial clk = 0; always #5 clk = ~clk; — period 10. Stimulus initial: reset_n = 0; #7 reset_n = 1; #100 $finish; (or a total-time guard). Comments on initial, #, $display/$finish marking them sim-only.',
        hints: [
          'Toggle interval is HALF the period.',
          'Two initial blocks may coexist: one for the clock seed, one for stimulus (or seed clk in the stimulus block first line).',
        ],
      },
      {
        title: 'Spot the missing begin/end',
        brief:
          'What actually happens here? `always @(posedge clk) if (en) q <= d; flag <= 1\'b1;` — the designer intended flag to set only when en is high.',
        expectedBehavior:
          'The if owns only its single statement (q <= d). The second statement `flag <= 1\'b1;` executes on EVERY clock edge regardless of en. Fix: wrap both in begin/end inside the if: if (en) begin q <= d; flag <= 1\'b1; end (and reset flag somewhere, or it holds 1 forever once set).',
        hints: [
          'A block without begin/end is exactly one statement.',
          'What owns the second line: the if, or the always block?',
        ],
      },
    ],
    assessment: {
      title: 'Module 06 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What is the fundamental difference between initial and always blocks?',
          options: [
            'initial runs once at time 0; always re-executes whenever its event control triggers',
            'initial is synthesizable, always is not',
            'initial can assign wires, always cannot',
            'They are interchangeable synonyms',
          ],
          answer: 'initial runs once at time 0; always re-executes whenever its event control triggers',
          explanation:
            'initial = one-shot (simulation harness work); always = forever, re-triggered by edges (@(posedge clk)), signal changes (@*) or delays (#5).',
          hint: 'Once vs forever.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Statements inside a single initial block execute in written order, one after another.',
          answer: 'true',
          explanation:
            'Within one procedural block, statements are sequential (with blocking assignment semantics). BETWEEN blocks there is no order — that is the concurrency boundary. Module 07 formalizes this.',
          hint: 'Order inside a block; no order between blocks.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'What does the seq_demo loop print on its last iteration (i=3)?',
          code:
            'acc = 4\'d0;\nfor (i = 0; i < 4; i = i + 1) begin\n    acc = acc + 4\'d3;\n    $display("i=%0d acc=%0d", i, acc);\nend',
          options: ['i=3 acc=12', 'i=3 acc=9', 'i=4 acc=12', 'i=3 acc=3'],
          answer: 'i=3 acc=12',
          explanation:
            'Four blocking additions of 3: acc reaches 3, 6, 9, 12 across i = 0..3. Each display sees the just-updated acc because blocking assignment completes before the next statement.',
          hint: 'Count the additions: 3 x 4 = 12.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Why must a signal assigned inside an always block be declared reg?',
          options: [
            'Procedural statements store results in variables; a variable holds the value between block executions',
            'reg forces the synthesizer to create a flip-flop',
            'Wires are too slow for procedural code',
            'It is only a style convention — wire works too',
          ],
          answer: 'Procedural statements store results in variables; a variable holds the value between block executions',
          explanation:
            'Procedural assignment happens at discrete moments and the result must persist until the next one — that is the definition of a variable (reg). The flip-flop (or not) is decided by the block’s structure, not the keyword.',
          hint: 'Who remembers the value between two clock edges?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the event control (the @(...) part only) for an always block triggered by the rising edge of clk and the falling edge of an active-low reset named reset_n.',
          answer: 'posedge clk or negedge reset_n',
          explanation:
            'always @(posedge clk or negedge reset_n) — the standard asynchronous active-low reset template used throughout this course.',
          hint: 'Two edges joined by "or".',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'initial block', definition: 'A procedural block that runs once at time 0; simulation-only (except vendor-specific FPGA init).' },
      { term: 'always block', definition: 'A procedural block that repeats forever, re-executing on its event control trigger.' },
      { term: 'Event control', definition: 'The @(...) clause selecting what triggers an always block: edges, signal changes, or nothing (pure delay loop).' },
      { term: 'begin/end', definition: 'Statement grouping with strict in-block ordering; the Verilog analog of braces.' },
      { term: 'Procedural target', definition: 'A variable (reg) assigned inside initial/always; the only legal target of procedural assignment.' },
    ],
    revisionSummary: [
      'initial: once at t=0, simulation-only. always: forever, triggered by its event control.',
      'Three synthesizable always shapes: @(posedge clk...) registers, @* combinational, and nothing else.',
      'Procedural targets are reg because statements need storage between executions — not because reg means flip-flop.',
      'begin/end groups statements; a missing begin/end silently moves the second statement outside the intended scope.',
      'Label every sim-only construct (initial, #delays, $display, clock-gen always) in comments.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'vlog-m06-l2',
    title: 'if/else Priority Logic and the case Family',
    summary:
      'Describe decisions in hardware: the priority chains of if/else, the parallel selections of case, and the wildcards and dangers of casez and casex.',
    objectives: [
      'Write priority logic with if/else and identify which expression gets priority.',
      'Implement parallel selection with case, always including a default.',
      'Use casez wildcards for grouped matches and explain why casex is dangerous.',
      'Choose between if/case based on the hardware you want.',
    ],
    whyItMatters:
      'Decisions are half of digital design. if/else and case both "make choices" in RTL, but they imply DIFFERENT hardware: priority chains versus parallel multiplexers. Choosing deliberately — and always writing the default — is the difference between clean logic and an accidental latch (module 15). The casez wildcard form is everywhere in real opcode decoding, and the casex trap is a famous source of simulation-passes-silicon-fails bugs.',
    prerequisites: ['vlog-m06-l1', 'vlog-m04-l3'],
    explanation:
      'Inside a combinational always block, **if/else** describes PRIORITY logic: the first true condition wins, later branches are only examined when earlier ones are false. Hardware translation: a chain of 2:1 muxes where each mux’s select is a condition and the "else" path feeds from the next stage. Order matters semantically — `if (a[3]) ... else if (a[2]) ...` gives bit 3 the highest priority.\n\n**case** describes PARALLEL selection: one expression compared against a list of constant items; the matching item’s statements execute. Synthesis maps it to a multiplexer (one input per item) — no inherent priority, all items evaluated "at once". Rules that are non-negotiable: the case expression and items must be width-matched (a 2-bit selector against 3-bit items matches nothing); **always write a default** — without it, unlisted selector values leave outputs holding their old value, i.e. a latch (module 15).\n\n**casez** treats z (written as z or ?) in the CASE ITEMS as don\'t-care wildcards: `3\'b1??` matches 100, 101, 110, 111. This is the idiomatic way to write grouped/priority decoding. **casex** additionally treats x as a wildcard — including x bits arriving in real data at runtime — so a genuinely unknown input silently matches an arm it should not: a simulation-passes, silicon-fails trap. Professional rule: use casez when you mean wildcards; never use casex; prefer ? over z in items for readability.',
    deepDive:
      '### Priority vs parallel: the hardware tells you\n\nAsk: "can two conditions ever be true at once, and does which-one-wins matter?" If yes (e.g. a priority encoder where input 3 outranks input 2), if/else states the intent directly. If the conditions are mutually exclusive by construction (e.g. an opcode that is exactly one of 8 values), case states parallelism and synthesis builds a balanced mux. Note that a CASE items list checked top-to-bottom by the simulator, and some synthesis tools exploit "full_case" hints — but the SOURCE-level contract is: case = no overlap needed, if/else = explicit priority. When in doubt, write if/else for priority and case for exclusivity; reviewers will thank you.\n\n### casez done right, with a default\n\nA robust casez decode looks like:\n\n```\ncasez (opcode)\n    3\'b1??: out = 2\'b00;   // anything starting with 1\n    3\'b01?: out = 2\'b01;   // 01x patterns\n    3\'b001: out = 2\'b10;   // exact\n    default: out = 2\'b11;  // catch-all (000 and anything else)\nendcase\n```\n\nThe items are ordered by specificity — earlier (broader) arms would shadow later ones, so write broad patterns first only when they genuinely have priority. The default guarantees every possible input (including x/z values in the selector) has a defined result.\n\n### Width matching in case\n\nA classic silent bug: `case (sel) 4\'b0001: ... endcase` where sel is 2 bits — the item can NEVER match (a 2-bit value zero-extends in the comparison context, but the 4-bit item 0001 only equals the extended sel when sel\'s upper bits are 0... precisely: the comparison extends the SHORTER side, so 2\'b01 becomes 4\'b0001 and matches — while 2\'b11 becomes 0101 and does not). Keep case expressions and items at the SAME declared width; the tools’ warnings about width mismatch in case items deserve immediate fixes.',
    examples: [
      {
        title: 'Priority encoder: if/else chain vs casez, same hardware intent',
        language: 'verilog',
        code:
          '// pri_enc_if.v — 4-to-2 priority encoder, if/else style\n// Highest numbered input wins. valid = 1 when any input is set.\nmodule pri_enc_if(\n    input  wire [3:0] in,\n    output reg  [1:0] y,\n    output reg        valid\n);\n    always @* begin\n        // DEFAULT FIRST: complete assignments prevent latches (module 15).\n        y     = 2\'b00;\n        valid = 1\'b0;\n\n        if (in[3]) begin\n            y = 2\'d3; valid = 1\'b1;      // highest priority\n        end else if (in[2]) begin\n            y = 2\'d2; valid = 1\'b1;\n        end else if (in[1]) begin\n            y = 2\'d1; valid = 1\'b1;\n        end else if (in[0]) begin\n            y = 2\'d0; valid = 1\'b1;\n        end\n        // no else needed: defaults above cover in == 0000\n    end\nendmodule\n\n// pri_enc_cz.v — identical behavior, casez style\nmodule pri_enc_cz(\n    input  wire [3:0] in,\n    output reg  [1:0] y,\n    output reg        valid\n);\n    always @* begin\n        y     = 2\'b00;\n        valid = 1\'b0;\n        casez (in)\n            4\'b1???: begin y = 2\'d3; valid = 1\'b1; end\n            4\'b01??: begin y = 2\'d2; valid = 1\'b1; end\n            4\'b001?: begin y = 2\'d1; valid = 1\'b1; end\n            4\'b0001: begin y = 2\'d0; valid = 1\'b1; end\n            default: ;                       // in == 0000: keep defaults\n        endcase\n    end\nendmodule',
        explanation: [
          'if/else version: in[3] wins if set — the FIRST branch has priority. Later branches only run when all higher bits are 0.',
          'Both modules assign DEFAULTS before the decision — the latch-prevention pattern; module 15 shows what happens without it.',
          'casez version: ? in an item is a wildcard (z). 4\'b1??? matches any input with bit 3 set; 4\'b01?? matches bit 2 set and bit 3 clear, and so on — the same priority chain, written as patterns.',
          'The default arm is empty on purpose: the pre-assigned defaults cover the all-zeros input. (An empty statement via ; is legal.)',
          'Verification rows: in=0101 → bit 2 wins → y=2, valid=1 (both styles). in=0001 → y=0, valid=1. in=0000 → y=0, valid=0. in=1111 → y=3 (bit 3 has priority).',
        ],
      },
      {
        title: 'case for an ALU opcode decode (the shape you will reuse in module 08)',
        language: 'verilog',
        code:
          '// alu_decode.v — parallel selection on an opcode\nmodule alu_decode(\n    input  wire [1:0] op,\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    output reg  [3:0] result\n);\n    always @* begin\n        case (op)\n            2\'b00:  result = a + b;   // ADD\n            2\'b01:  result = a - b;   // SUB\n            2\'b10:  result = a & b;   // AND\n            2\'b11:  result = a | b;   // OR\n            default: result = 4\'b0000; // unreachable here but REQUIRED style\n        endcase\n    end\nendmodule',
        explanation: [
          'All four arms are mutually exclusive — op is exactly one of four values — so case (parallel mux) is the natural description.',
          'The default arm is present even though 2 bits are fully enumerated: consistency. Some tools/lint rules REQUIRE it; it also guards against later width changes.',
          'result is a reg assigned in an always @* block — pure combinational hardware (module 03), one mux per result bit.',
          'Trace: op=2\'b01, a=0110 (6), b=0001 (1) → result = 0101 (5). op=2\'b10, a=1100, b=1010 → result = 1000.',
          'This case skeleton (opcode + operands + result) is exactly the ALU slice core you will flesh out with flags in module 08.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'if/else priority chain vs case parallel mux',
        content:
          '  if/else (PRIORITY):                    case (PARALLEL):\n\n  cond1 --[mux]-- out                     item0 --\\\n            |                                      [mux]-- out\n       else |                               item1 --/\n  cond2 --[mux]                              item2 --+\n            |                                        |\n       else |                                  item3 -\'  (one mux level,\ n       default --\'                             ...         N inputs, 1 select)\n\n  first true condition wins             selector picks exactly one arm;\n  order encodes ranking                 arms are mutually exclusive',
        caption:
          'if/else builds a ranked chain of muxes; case builds one wide mux. Same blocks, different hardware shape.',
      },
    ],
    tables: [
      {
        caption: 'The case family',
        headers: ['Statement', 'Wildcard handling', 'Use when', 'Danger'],
        rows: [
          ['case', 'None — exact 4-state compare of expression vs items', 'Mutually exclusive selections (opcodes, states)', 'Missing default → latch'],
          ['casez', 'z or ? in ITEMS are don\'t-cares', 'Grouped/priority patterns (1?? decoding)', 'Selector x still matched literally — write default'],
          ['casex', 'x AND z wildcards (items AND expression)', 'Avoid entirely', 'Real x data silently matches arms: silicon/sim divergence'],
        ],
      },
      {
        caption: 'Priority encoder verification (both styles)',
        headers: ['in[3:0]', 'y', 'valid', 'Note'],
        rows: [
          ['0000', '00', '0', 'no inputs: defaults'],
          ['0001', '00', '1', 'only bit 0'],
          ['0101', '10', '1', 'bit 2 outranks bit 0'],
          ['1000', '11', '1', 'bit 3 alone'],
          ['1111', '11', '1', 'highest priority wins'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Omitting default in a case (or forgetting the final else), so unlisted values keep the old output.',
        fix:
          'Always write default (even when "unreachable") and/or assign defaults to every output BEFORE the decision chain. Incomplete decisions infer latches — module 15 dissects three broken/fixed pairs.',
      },
      {
        mistake: 'Using casex "because it accepts everything".',
        fix:
          'casex lets real x bits in data match case arms — the design appears to work in simulation and misbehaves in hardware where x never exists. Use casez for wildcards; leave casex to legacy code you must read (never write).',
      },
      {
        mistake: 'Relying on case-item order to express priority in a plain case.',
        fix:
          'case selects the matching arm; if two items could both match (via wildcards), the FIRST match wins — but for true priority logic with distinct conditions, if/else states the intent unambiguously. Use casez-with-ordered-patterns or if/else, and document the ranking.',
      },
    ],
    guidedPractice: {
      title: 'Predict the decode',
      brief:
        'Using the casez table from the lesson (1?? → 00, 01? → 01, 001 → 10, default → 11 on a 3-bit opcode), evaluate out for op = 3\'b101, 3\'b010, 3\'b000, 3\'b1x1. Then state which result would change if casez were casex.',
      expectedBehavior:
        "3'b101 matches 1?? (MSB set) → out=00. 3'b010: 1?? needs the MSB set — no; 01? matches bits[2:1]=01 with bit0 wild → out=01. 3'b000 matches nothing (1?? no, 01? no, 001 no) → default → 11. 3'b1x1 matches 1?? (MSB=1; the ? wildcards cover the lower two bits whatever they hold) → 00. With casex instead: the x in the SELECTOR also becomes a wildcard, so a selector like 3'bx00 would match the first arm 1?? (x matches the 1) — unknown opcodes silently take the first arm instead of falling to default. With casez, x in the selector matches only literal wildcards (?), so under-decoded selectors reach default. THAT is the dangerous difference.",
      hints: [
        'In casez, wildcards live in the ITEMS; in casex, also in the selector expression.',
        'Match patterns top-down: first matching item wins.',
      ],
    },
    practiceExercises: [
      {
        title: 'Seven-segment decoder nibble',
        brief:
          'Write module seg7(input wire [3:0] digit, output reg [6:0] seg) that maps 0→7\'b1111110, 1→7\'b0110000, 2→7\'b1101101, default→7\'b0000001 using case. Verify two rows.',
        expectedBehavior:
          'case (digit) with the three listed items and default → 7\'b0000001. digit=0 → seg=1111110; digit=9 → default → 0000001. All outputs assigned in every arm (default covers the rest) — no latch.',
        hints: [
          'One case, items 4\'d0, 4\'d1, 4\'d2, default.',
          'Assign seg in EVERY arm — the default arm included.',
        ],
      },
      {
        title: 'Priority vs parallel: which tool?',
        brief:
          'Two specifications: (A) "output the index of the HIGHEST set bit of a 4-bit bus, 0 if none"; (B) "output f(a,b) where a 2-bit mode selects one of four fixed functions". Which needs if/else priority and which fits case? Justify by asking whether conditions can co-occur.',
        expectedBehavior:
          '(A) is priority: multiple bits can be set simultaneously and ranking decides — if/else chain (or casez patterns 1???, 01??...). (B) is parallel: mode values are mutually exclusive — plain case with default.',
        hints: [
          'The discriminating question: can two conditions be true at once?',
          'Bit tests can co-occur; a fully-enumerated opcode cannot.',
        ],
      },
    ],
    assessment: {
      title: 'Module 06 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In an if/else if chain inside always @*, which condition has priority?',
          options: [
            'The first true condition in written order',
            'The last else branch',
            'All matching branches execute in order',
            'Priority is undefined in Verilog',
          ],
          answer: 'The first true condition in written order',
          explanation:
            'if/else is sequential priority logic: the first true branch wins and the rest are skipped — that ordering is the meaning of the chain.',
          hint: 'Written order = ranking.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What is the professional stance on casex?',
          options: [
            'Avoid it: x in real data silently matches case arms, causing sim/silicon divergence',
            'Prefer it over casez for speed',
            'Use it whenever inputs may be unknown',
            'It is required for don\'t-care decoding',
          ],
          answer: 'Avoid it: x in real data silently matches case arms, causing sim/silicon divergence',
          explanation:
            'casex treats x as a wildcard in BOTH items and the selector, so genuinely unknown runtime data matches whatever arm comes first. casez gives wildcards where you write them (? in items) without that trap.',
          hint: 'Which statement lets unknown HARDWARE values decide the branch?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'With casez items checked in order — 4\'b1??? → y=3; 4\'b01?? → y=2; 4\'b001? → y=1; default → y=0 — what is y for in = 4\'b0110?',
          code:
            'casez (in)\n    4\'b1???: y = 2\'d3;\n    4\'b01??: y = 2\'d2;\n    4\'b001?: y = 2\'d1;\n    default: y = 2\'d0;\nendcase   // in = 4\'b0110',
          options: ['2', '1', '3', '0'],
          answer: '2',
          explanation:
            'in = 0110: item 1 needs bit3=1 (no); item 2 is 01?? — bits 3,2 = 0,1 match, bits 1,0 are wildcards → MATCHES. y = 2.',
          hint: 'Check the patterns top-down; ? matches anything.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'A case statement with no default always synthesizes to a multiplexer with no latches.',
          answer: 'false',
          explanation:
            'Without a default (or pre-assigned defaults), selector values not covered by any item leave outputs holding their previous value — combinational logic with memory, i.e. an accidental latch (module 15).',
          hint: 'What does the output do for an unlisted selector value?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Which wildcard character (? or z) does this course recommend inside casez items, and why (one word: readability)?',
          answer: '?',
          explanation:
            '? is a synonym for z in case items but reads as "don\'t care" rather than "high impedance", so patterns like 3\'b1?? state their intent visibly.',
          hint: 'It visually reads as "anything".',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Priority logic', definition: 'if/else chains where written order defines which condition wins; synthesizes to a mux chain.' },
      { term: 'Parallel selection', definition: 'case behavior: one selector, mutually exclusive arms, one wide multiplexer in hardware.' },
      { term: 'casez', definition: 'case with z/? wildcards in items — grouped matching without the casex hazard.' },
      { term: 'casex', definition: 'case treating x AND z as wildcards everywhere — dangerous, never use in new code.' },
      { term: 'default', definition: 'The mandatory catch-all arm ensuring every selector value produces a defined output.' },
    ],
    revisionSummary: [
      'if/else = priority chain (first true wins); case = parallel mux (mutually exclusive arms).',
      'Always write default and/or pre-assign defaults; incomplete decisions infer latches.',
      'casez items use ? for don\'t-care groups; order broad patterns deliberately; casex is banned.',
      'Width-match the case expression and items; heed width-mismatch warnings in case items.',
      'Choose the construct by asking "can two conditions co-occur?" — yes → if/else, no → case.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
      { label: 'All About Circuits — Digital textbook', url: 'https://www.allaboutcircuits.com/textbook/digital/', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'vlog-m06-l3',
    title: 'Sensitivity Lists and Synthesizable Loops',
    summary:
      'Learn how always @* watches its inputs, why incomplete lists broke classic designs, and how for loops unroll into real hardware.',
    objectives: [
      'Write complete sensitivity lists and explain why always @* is the modern default.',
      'Explain the sim/synth mismatch an incomplete list causes.',
      'Use for loops with static bounds as unrolled combinational logic.',
      'Identify loop constructs that cannot be synthesized.',
    ],
    whyItMatters:
      'The sensitivity list decides WHEN a procedural block reacts — get it wrong and simulation and synthesis disagree, the worst kind of bug because your verification environment itself lies. Meanwhile, for loops are the bridge between sequential-looking code and parallel hardware: a loop over STATIC bounds unrolls into N copies of logic, a pattern you will use for parity trees, popcounts, adder arrays and register banks through the rest of the course.',
    prerequisites: ['vlog-m06-l1', 'vlog-m06-l2'],
    explanation:
      'An always block’s **sensitivity list** — the signals inside `@(...)` — declares exactly when the block re-executes. For combinational logic the rule is absolute: the list must contain EVERY signal the block reads, because hardware combinational logic reacts to all of them, always. The modern spelling removes the risk: **`always @*`** (or `always @(*)`) tells the tools "watch everything I reference" — the list is derived automatically and stays correct as the code evolves. This course uses `always @*` for every combinational block.\n\nThe historical hazard: classic Verilog required hand-written lists, and a forgotten signal produced the infamous **simulation/synthesis mismatch** — synthesis ignores the list (it builds logic that reacts to all inputs, because real gates have no choice) while the simulator honors it literally (the block only wakes when a LISTED signal changes). Result: change an unlisted input, and the hardware would respond but the simulation doesn’t — or worse, the simulation shows stale correct-looking values. Whole design teams lost weeks to this in the 1990s; @* exists precisely to kill the bug class.\n\n**for loops** synthesize when their bounds are static (constants or parameters) and the body contains no timing/event controls: the tool UNROLLS the loop into N parallel copies of the body’s logic. A loop is a typing convenience for repeated structure, not a time sequence — after unrolling there is no "i" and no order, just N pieces of hardware. Loops with variable bounds, while loops waiting on data, or loops containing #delays are simulation-only.',
    deepDive:
      '### What unrolling really builds\n\n`for (i = 0; i < 8; i = i + 1) p = p + a[i];` inside always @* with p pre-assigned becomes an 8-input adder tree — the loop index becomes wire labels, nothing more. Two consequences worth internalizing: (1) the "iterations" all happen AT ONCE — a loop is parallel hardware, the opposite of a software loop in time; (2) accumulation works because p is assigned iteratively in the SOURCE TEXT, and the unroller chains the additions — the final p is an expression tree 8 levels deep. For accumulation-heavy loops, width discipline (module 04) applies to the accumulator: p must be wide enough for the final value.\n\n### The loop variables that are legal\n\nVerilog-2001 loop variables are integers declared outside (integer i;) — they exist in synthesis only as unrolling bookkeeping and consume no hardware. Bounds may be parameters (generate loops, module 13, take this further with genvar). What is NOT synthesizable: bounds from signals (`for (i = 0; i < count; ...)` — hardware cannot unroll an unknown count), while/repeat waiting on signals, and any body containing @ or #. When you need data-dependent repetition, that is a state machine (module 11), not a loop.\n\n### Sensitivity lists in clocked blocks\n\nFor sequential blocks the list is a TEMPLATE, not a computation: `always @(posedge clk or negedge reset_n)` — exactly the clock edge plus the async reset edge, nothing else (data signals NEVER appear; the flop samples them at the edge). Adding extra signals to a clocked list, or listing the reset wrongly (posedge instead of negedge for an active-low reset), creates sim/synth divergence of its own kind — module 15 returns to this. The complete rule set: comb blocks use @*; clocked blocks use the two-edge template and nothing more.',
    examples: [
      {
        title: 'The mismatch bug: incomplete list vs always @*',
        language: 'verilog',
        code:
          '// BROKEN (classic style, incomplete list):\nmodule and_or_broken(\n    input  wire a,\n    input  wire b,\n    input  wire c,\n    output reg  y\n);\n    // INTENT: y = (a & b) | c\n    // BUG: c is missing from the sensitivity list.\n    always @(a or b) begin\n        y = (a & b) | c;\n    end\nendmodule\n\n// FIXED:\nmodule and_or_fixed(\n    input  wire a,\n    input  wire b,\n    input  wire c,\n    output reg  y\n);\n    always @* begin          // tool derives the full list: a, b, c\n        y = (a & b) | c;\n    end\nendmodule',
        explanation: [
          'BROKEN: synthesis builds y = (a&b)|c — real gates react to c, always. The SIMULATOR only re-executes the block when a or b changes: toggle c alone and simulation leaves y stale while real hardware would update. The testbench now lies about the design.',
          'FIXED: always @* makes the tool watch every referenced signal — here a, b, c. The mismatch class of bugs is closed at the source.',
          'The code inside both blocks is identical: only the list differs. That is how sneaky this bug is — review the @(...) line, not just the body.',
          'Course rule: write always @* for every combinational block; hand-written lists appear only in the clocked two-edge template.',
          'This is a historical-style demo: modern lint tools flag incomplete lists, but @* prevents the bug from being written at all.',
        ],
      },
      {
        title: 'Loops that synthesize: popcount and parity by unrolling',
        language: 'verilog',
        code:
          '// popcount8.v — count the 1-bits of a byte with a STATIC-bound loop\nmodule popcount8(\n    input  wire [7:0] data,\n    output reg  [3:0] ones     // 8 ones max: 4 bits is enough\n);\n    integer i;                  // unrolling bookkeeping only\n\n    always @* begin\n        ones = 4\'d0;            // default FIRST: no latch\n        for (i = 0; i < 8; i = i + 1) begin\n            ones = ones + data[i];   // unrolled into an 8-input adder tree\n        end\n    end\nendmodule',
        explanation: [
          'Static bounds (0 to 7): synthesizable. The tool unrolls eight iterations: ones = 0 + d0 + d1 + ... + d7 — an adder tree, all bits summed in parallel.',
          'ones is pre-assigned 4\'d0 before the loop — both a latch-prevention default and the accumulator seed.',
          'Width check (module 04): 8 ones needs 4 bits (max value 8 = 4\'b1000) — ones is exactly wide enough.',
          'Trace data = 8\'b1011_0110: ones = 1+1+0+1+1+0+1+0? careful — bits 7..0 = 1,0,1,1,0,1,1,0 → five ones → ones = 4\'b0101 (5). Parity would be 5 mod 2 = 1 (odd).',
          'The integer i exists only in the source text: after unrolling there is no loop, no counter, no sequencing — just a tree of adders.',
        ],
      },
      {
        title: 'Loops that CANNOT synthesize (sim-only patterns)',
        language: 'verilog',
        code:
          '// sim_loops.v — SIMULATION-ONLY loop patterns, labeled as such\n`timescale 1ns/1ps\nmodule sim_loops;\n    reg [7:0] data;\n    integer   n;\n\n    initial begin\n        data = 8\'b0000_0001;\n        // (1) VARIABLE bound: how could hardware unroll an unknown count?\n        for (n = 0; n < 4; n = n + 1) begin   // n<4 is static-ish, but:\n            data = data << 1;                  // in an initial block this is\n            $display("data=%b", data);         // sim-only stimulus anyway\n        end\n        // (2) Data-dependent WHILE: pure simulation.\n        n = 0;\n        while (data[7] == 1\'b0) begin\n            data = data << 1;\n            n = n + 1;\n        end\n        $display("MSB reached after %0d shifts", n);\n        $finish;\n    end\nendmodule',
        explanation: [
          '(1) runs in an initial block — stimulus, by definition sim-only. Even a "static-looking" bound belongs to the harness here.',
          '(2) the while loop waits on DATA (data[7]) — hardware cannot be unrolled to an unknown depth; this is inherently a runtime/sequential activity. In design RTL, data-dependent iteration becomes a state machine (module 11).',
          'Expected prints: after the for loop, data = 0001_0000 (four left shifts of 1); the while then shifts until bit 7 sets: 0010_0000, 0100_0000, 1000_0000 → "MSB reached after 3 shifts".',
          'Rule of thumb for design code: for-loops with CONSTANT/PARAMETER bounds only; everything data-dependent is always+FSM territory.',
          'All of this file is simulation-only — the comments and this list say so explicitly.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'A for loop unrolls into parallel hardware',
        content:
          '   SOURCE (looks sequential):          HARDWARE (all parallel):\n\n   ones = 0;                           ones = 0 + d0 + d1 + d2\n   for i=0..7:                              + d3 + d4 + d5\n       ones = ones + data[i];               + d6 + d7\n                                       (8-input adder tree,\n   no loop, no counter,                 ~3 adder levels deep)\n   no time ordering after unroll',
        caption:
          'Static-bound loops are a typing convenience: the tool flattens them into N parallel copies of the body.',
      },
    ],
    tables: [
      {
        caption: 'Sensitivity list rules',
        headers: ['Block type', 'Correct list', 'Never'],
        rows: [
          ['Combinational (always @*)', '@* — tool-derived, always complete', 'Hand-written partial lists (a or b)'],
          ['Clocked', '@(posedge clk or negedge reset_n) — exactly two edges', 'Data signals in the list; wrong reset edge'],
          ['Clock generator (sim)', 'none — always #N stmt', 'Using it in design RTL'],
        ],
      },
      {
        caption: 'Loop synthesizability',
        headers: ['Loop shape', 'Synthesizable?', 'Becomes'],
        rows: [
          ['for, constant/parameter bounds, no @ or # in body', 'Yes', 'N parallel copies (unrolled)'],
          ['for with signal-dependent bound', 'No', 'Use an FSM for data-dependent iteration'],
          ['while / repeat waiting on data', 'No (design); Yes (testbench)', 'Sim-only stimulus patterns'],
          ['Loop containing #delay or @', 'No', 'Simulation-only'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing explicit sensitivity lists like always @(a or b) for combinational logic.',
        fix:
          'Use always @*. Hand-maintained lists rot as the body evolves — a forgotten signal silently desynchronizes simulation from synthesis. Reserve explicit lists for the clocked two-edge template.',
      },
      {
        mistake: 'Expecting a for loop with a signal-dependent bound to synthesize.',
        fix:
          'Hardware cannot build an unknown number of copies. If the repetition count is data, you need a clocked process/FSM that iterates over clock cycles — a different (sequential) design, not a loop.',
      },
      {
        mistake: 'Forgetting the default assignment before a loop that accumulates into an output.',
        fix:
          'Assign the accumulator its seed (often zero) before the loop, inside the same always @* — this both prevents latch inference for paths the loop might not cover and gives the accumulation a defined starting value.',
      },
    ],
    guidedPractice: {
      title: 'Unroll it by hand',
      brief:
        'For data = 4\'b0110, manually unroll the popcount loop (4-bit version: for i=0..3, ones = ones + data[i]) showing ones after each unrolled term, and give the final ones value. Then state how many adders the synthesis result contains.',
      expectedBehavior:
        'Unrolled: ones = 0 + data[0] = 0+0 = 0; + data[1] = 1 → 1; + data[2] = 1 → 2; + data[3] = 0 → 2. Final ones = 2 (4\'b0010). Hardware: a 4-input adder tree — three 1-bit additions (or an equivalent compressor), all evaluating in parallel.',
      hints: [
        'data[0] is the LSB: 0110 → d0=0, d1=1, d2=1, d3=0.',
        'After unrolling there is no order — the "sequence" is just how you write the tree.',
      ],
    },
    practiceExercises: [
      {
        title: 'Even-parity generator by loop',
        brief:
          'Write module parity9(input wire [8:0] data, output reg par) where par = 1 when data holds an EVEN number of ones, using a for loop. (Hint: compute odd parity first, then invert.)',
        expectedBehavior:
        'always @* begin par = 1\'b0; for (i = 0; i < 9; i = i + 1) par = par ^ data[i]; par = ~par; end — the XOR chain yields odd-parity (1 when the count of ones is odd); inverting gives even-parity. Width: par is 1 bit throughout.',
        hints: [
          'XOR-reduction gives odd parity directly (or just write par = ^data then invert).',
          'Seed the accumulator before the loop.',
        ],
      },
      {
        title: 'Audit the list',
        brief:
          'Find every sensitivity/structure problem: (1) always @(a) y = a | b; (2) always @(posedge clk or posedge rst) with an ACTIVE-LOW reset_n used in the body (if (!reset_n)); (3) always @* with a for loop whose bound is the input signal len.',
        expectedBehavior:
          '(1) incomplete list — b missing; fix with @*. (2) list/body mismatch: the body tests reset_n but the list waits on a DIFFERENT signal rst (and posedge of an active-low reset is the wrong edge) — the async reset would never fire correctly; fix to @(posedge clk or negedge reset_n). (3) signal-dependent bound: not synthesizable as a loop; restructure as a clocked process that iterates over len cycles.',
        hints: [
          'For combinational blocks: @* and nothing else.',
          'For clocked blocks: exactly posedge clk and the reset edge — and the reset edge must match the reset polarity in the body.',
        ],
      },
    ],
    assessment: {
      title: 'Module 06 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why does this course write always @* for combinational blocks?',
          options: [
            'The tool derives the complete sensitivity list, preventing sim/synthesis mismatch from forgotten signals',
            'It simulates faster than explicit lists',
            '@* is required syntax for case statements',
            'It forces the block to run on clock edges',
          ],
          answer: 'The tool derives the complete sensitivity list, preventing sim/synthesis mismatch from forgotten signals',
          explanation:
            '@* watches every referenced signal automatically. Hand-written lists silently rot when the body changes — the classic incomplete-list mismatch.',
          hint: 'Who can maintain a hand-written list better than the tool reading the body?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A combinational block uses the list always @(a or b) but its body also reads c. What does SYNTHESIS build?',
          options: [
            'Logic reacting to a, b AND c — synthesis ignores the incomplete list',
            'Logic reacting only to a and b',
            'Nothing — it is a synthesis error',
            'A latch on c',
          ],
          answer: 'Logic reacting to a, b AND c — synthesis ignores the incomplete list',
          explanation:
            'Real gates react to all their inputs; the synthesizer builds y = f(a,b,c) regardless of the list. The SIMULATOR honors the list — hence the mismatch: only simulation is wrong.',
          hint: 'Which tool is forced to obey the list, and which builds physical gates?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A for loop with constant bounds synthesizes into hardware that executes its iterations one after another over several clock cycles.',
          answer: 'false',
          explanation:
            'Static-bound loops unroll into N PARALLEL copies of the body — no sequence, no cycles. Sequential repetition over time is what clocked processes/FSMs do.',
          hint: 'Unrolling: is there any "next iteration" left?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'For popcount8 with data = 8\'b1011_0110, what is ones after the unrolled loop?',
          code:
            'ones = 4\'d0;\nfor (i = 0; i < 8; i = i + 1)\n    ones = ones + data[i];\n// data = 8\'b1011_0110',
          options: ["4'b0101", "4'b0110", "4'b1000", "4'b0011"],
          answer: "4'b0101",
          explanation:
            'data holds five ones (bits 7, 5, 4, 2, 1). The unrolled sum is 5 = 4\'b0101.',
          hint: 'Count the set bits: 1011_0110 → 1+0+1+1+0+1+1+0.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the complete event control for a clocked block with rising-edge clk and asynchronous active-low reset reset_n (no data signals).',
          answer: 'posedge clk or negedge reset_n',
          explanation:
            'The two-edge template: the clock edge samples data; the reset edge forces recovery. Data signals never appear in a clocked sensitivity list.',
          hint: 'Clock edge + reset edge, joined by "or".',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Sensitivity list', definition: 'The @(...) signals that trigger an always block; combinational blocks must react to all read signals.' },
      { term: 'always @*', definition: 'Combinational always with tool-derived (complete) sensitivity list — the course standard.' },
      { term: 'Simulation/synthesis mismatch', definition: 'Divergence between simulated and synthesized behavior; classically caused by incomplete sensitivity lists.' },
      { term: 'Loop unrolling', definition: 'Synthesis expands static-bound loops into parallel copies of the body; the loop ceases to exist.' },
      { term: 'genvar', definition: 'The index variable of generate loops (module 13); exists only at elaboration.' },
    ],
    revisionSummary: [
      'always @* for every combinational block; hand-written lists only in the clocked two-edge template.',
      'Synthesis ignores sensitivity lists (gates react to all inputs); simulation obeys them — mismatch = lying testbench.',
      'Static-bound for loops unroll to parallel hardware; seed accumulators with a default assignment first.',
      'Signal-dependent bounds, while-loops on data, and delays in loops are simulation-only or FSM territory.',
      'Loop variables (integer) cost no hardware — they vanish at unrolling.',
    ],
    furtherReading: [
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
