import type { TutorialLesson } from '../types';

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'sv-m03-l1',
    title: 'always_comb, always_ff, always_latch: Intent You Can Compile',
    summary:
      'Replace the do-everything always block with three purpose-built blocks that let the tool check your combinational, sequential and latch intents — and make sensitivity-list bugs impossible.',
    objectives: [
      'Rewrite always @(*) as always_comb and list the two extra checks the tool now performs.',
      'Rewrite always @(posedge clk) as always_ff and state the assignment-style rule it enforces.',
      'Explain what always_latch is for and why declaring latch intent is better than inferring one by accident.',
      'Show how an incomplete sensitivity list in Verilog creates a sim/synth mismatch and why always_comb eliminates the class.',
    ],
    whyItMatters:
      'The plain always block is the most error-prone construct in Verilog because the same keyword means three different kinds of hardware, and one of them (the sensitivity list) is hand-maintained. The typed always blocks convert the three most common RTL bug families — sensitivity-list omissions, accidental latches, and mixed assignment styles in clocked code — from silent simulation mysteries into compile-time messages. Teams that adopt them report the bugs simply stop happening; that is the whole point of the design subset.',
    prerequisites: [
      'sv-m01-l3: the refactor workflow',
      'Verilog always blocks, blocking vs nonblocking assignment, and inferred latches',
    ],
    explanation:
      'In Verilog, every procedural block starts with the same word: `always`. The hardware it describes is decided by the sensitivity list and the code inside — three very different outcomes from one keyword. SystemVerilog names the three intents instead.\n\n**always_comb** says "this block is combinational logic". The tool builds the sensitivity list from the code (so `always @(a or b)` with a forgotten `c` becomes impossible), executes the block once at time zero (so outputs are valid before the first clock, unlike @(*) which waits for a first change), and — critically — refuses to let the block drive a variable that has another driver. If the code does not assign an output on every path, a standard-conforming tool reports latch-like behavior, because combinational logic has no memory: every output must be a function of current inputs only.\n\n**always_ff** says "this block models flip-flops". It requires a clocking event in the sensitivity list and requires that the variables it assigns are written only with **nonblocking** (`<=`) assignments. Mixing `q = d;` and `q <= d;` in a clocked block is one of the classic Verilog simulation/synthesis mismatch bugs; under always_ff it is a compile error. The tool may also reject structures it cannot map to flip-flops.\n\n**always_latch** says "this block intentionally models a level-sensitive latch", for the legitimate designs that need one (bus holding, some clock-gating structures). Its value is mostly negative space: when a latch appears where you did not want one, the tool that checks always_comb will have told you first. And when you genuinely want a latch, always_latch documents it instead of leaving a surprise for the synthesis report.\n\nThe mental model: Verilog asked you to *describe mechanics* (sensitivity list, assignment operators); SystemVerilog lets you *declare intent* and makes the tool check the mechanics. Same hardware when you are correct, dramatically better errors when you are not.',
    deepDive:
      '### The sensitivity-list bug, made concrete\n\nHere is the classic. In Verilog-2001: `always @(a or b) y = a & b & c;` — the engineer adds input c to the logic and forgets the list. In simulation, y only updates when a or b changes; toggling c alone does nothing, so the simulator shows a stale y. Synthesis, which ignores sensitivity lists for combinational inference and builds the real logic function, produces y = a&b&c. The design passes unit simulation if the testbench happens to wiggle a or b alongside c, and fails in system integration. Verilog-2001 added `@(*)` to autogenerate the list, which fixed the omission bug — but @(*) still does not run at time zero, does not check for other drivers, and does not flag incompleteness. always_comb is @(*) plus those three checks. That is the honest summary: not a new kind of hardware, a better-checked idiom.\n\n### Why always_ff bans blocking assignments\n\nBlocking assignment in a clocked block works when each variable is written in exactly one block and read in the right order — but the style invites race conditions the moment two blocks write the same variable or ordering assumptions shift. The nonblocking rule (`<=`) gives every clocked variable clean delta-cycle semantics: sample all inputs, update all outputs, no order dependence. always_ff makes that style mandatory rather than recommended. The residual race Verilog allowed — two always_ff blocks writing one variable — is legal in the standard (like Verilog) but flagged by lint and forbidden by every serious coding guideline; keep one writer per clocked variable.\n\n### always_latch and the latch family tree\n\nA latch is level-sensitive: while enable is high, output follows input; when it falls, output holds. It is the hardware you get when a combinational block fails to assign an output on every path. Unintended latches are dangerous in synthesis (timing analysis loses the clock, hold checking gets exotic) and so every tool warns. The legitimate uses exist — the hold state of a bus, some power-saving structures — and always_latch exists so that when a latch is *wanted*, the source says so and the tool checks the enable/hold structure instead of inferring it from a code accident. If you never intentionally use latches, you will still benefit: always_comb converts "unintended latch" from a synthesis-report surprise into an immediate source-level message.\n\n### Tool support honesty\n\nThe typed always blocks are among the best-supported SystemVerilog design features: Icarus, Verilator and all commercial simulators implement them, and synthesis tools map them identically to the Verilog originals. This is one lesson where what you write here is close to what you can run on this platform.',
    examples: [
      {
        title: 'The bug always_comb prevents',
        language: 'verilog',
        code:
        '// Verilog-2001: two versions of the same decoder\nmodule decode_v(\n    input  wire [1:0] sel,\n    input  wire       en,\n    output reg  [3:0] y\n);\n    // BUG: sensitivity list omits sel. Simulation freezes y when only\n    // sel changes; synthesis builds the correct full logic. Mismatch.\n    always @(en) begin\n        if (en) y = 4\'b0001 << sel;\n        else    y = 4\'b0000;\n    end\n\n    // Verilog-2001 fix: @(*) autogenerates the list (but no other checks)\n    // always @(*) begin ... end\nendmodule',
        explanation: [
          'The list @(en) omits sel: toggling sel alone leaves y stale in simulation, while synthesis still builds y = en ? (1<<sel) : 0.',
          'This is the canonical sim/synth mismatch: the RTL text and the netlist disagree about what y depends on.',
          'The @(*) fix repairs the list but performs no further checking — the lesson is that hand-maintained lists are a bug factory.',
        ],
      },
      {
        title: 'The same decoder under always_comb',
        language: 'systemverilog',
        code:
        '// SystemVerilog: intent declared, checks automatic\nmodule decode_sv(\n    input  logic [1:0] sel,\n    input  logic       en,\n    output logic [3:0] y\n);\n    always_comb begin\n        if (en) y = 4\'b0001 << sel;\n        else    y = 4\'b0000;\n    end\n    // - y is assigned on BOTH paths: no latch warning, correct.\n    // - No sensitivity list exists to get wrong.\n    // - y runs at time 0 and may have no other driver.\nendmodule',
        explanation: [
          'No sensitivity list at all: the tool derives what y depends on from the code, so the omission bug class is gone.',
          'Both branches assign y, so the block is genuinely combinational — the tool checks this instead of silently inferring a latch.',
          'Had either branch been missing, a standard-conforming tool would report latch-like behavior here, in the source, not in a synthesis report.',
        ],
      },
      {
        title: 'always_ff and always_latch side by side',
        language: 'systemverilog',
        code:
        '// SystemVerilog: sequential intent vs declared latch intent\nmodule intent_demo(\n    input  logic       clk,\n    input  logic       rst_n,\n    input  logic       hold_en,   // latch enable\n    input  logic       d,\n    output logic       q_ff,\n    output logic       q_lat\n);\n    // Flip-flop: nonblocking only, clocking event required.\n    always_ff @(posedge clk or negedge rst_n) begin\n        if (!rst_n) q_ff <= 1\'b0;\n        else        q_ff <= d;\n        // q_ff = d;      // COMPILE ERROR under always_ff:\n    end                   // blocking assignment in a clocked block\n\n    // Intentional level-sensitive latch: output follows d while hold_en,\n    // holds when hold_en falls.\n    always_latch begin\n        if (hold_en) q_lat = d;\n    end\nendmodule',
        explanation: [
          'always_ff keeps the async-reset template from Verilog; the only change is the keyword, and the commented blocking line shows what the tool now rejects.',
          'always_latch writes q_lat only when hold_en — that conditional-assignment shape IS a latch; declaring it makes the intent explicit and checked.',
          'If the same shape appeared inside an always_comb, the tool would report the latch as a problem instead of accepting it.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'One keyword, three intents',
        content:
        '                       always (Verilog-2001)\n        +-------------------+-------------------+\n        |                   |                   |\n        v                   v                   v\n   combinational       flip-flops          level-sensitive latch\n   always_comb         always_ff           always_latch\n   ------------        ------------        ---------------\n   no sensitivity      clocking event      enable-conditioned\n     list (derived)      required            assignment only\n   assigns every       nonblocking (<=)    legal place for\n     output, every       mandatory           hold semantics\n     path (checked)    one writer per\n   executes at t=0       variable (guideline)\n   no other drivers    (checked by tool)\n\n   Wrong intent -> immediate source-level message\n   (instead of a synthesis report or a lab mystery)',
        caption:
          'The typed blocks do not add hardware; they attach tool-enforceable meaning to the three things always always meant.',
      },
    ],
    tables: [
      {
        caption: 'The three typed always blocks vs the Verilog original',
        headers: ['Block', 'Verilog equivalent', 'Extra tool checks', 'Typical bug it kills'],
        rows: [
          ['always_comb', 'always @(*)', 'Derived sensitivity list; time-0 evaluation; latch warning; no other drivers on outputs', 'Missing sensitivity entry; unintended latch'],
          ['always_ff', 'always @(posedge clk ...)', 'Nonblocking-only assignment; clocking event required; flip-flop mappability', 'Mixed = / <= in clocked code'],
          ['always_latch', 'always @(...) with conditional assignment', 'Checked enable/hold structure; explicit intent', 'Silent latch surprises for the reader'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing always_comb for a block that also reads a signal assigned inside itself with blocking order dependencies.',
        fix: 'always_comb executes as a function of current inputs; sequential dependence between its own variables is allowed only in the normal dataflow sense. If you find yourself relying on statement order to fake memory, the block is not combinational — restructure or use always_ff.',
      },
      {
        mistake: 'Using always_ff without a clocking event (just always_ff begin ... end).',
        fix: 'always_ff requires a clocking event in the sensitivity list — that is part of the definition of flip-flop intent. A plain always_comb block with edge-like code is a modeling error the tool will report.',
      },
      {
        mistake: 'Letting two always_ff blocks drive the same variable because it compiles.',
        fix: 'Multiple procedural drivers on a variable simulate in undefined order (a race). Compile success is not design success; enforce one writer per clocked variable in review and with lint.',
      },
    ],
    guidedPractice: {
      title: 'Convert a block to always_comb and fix the latch',
      brief:
        'The starter block computes a priority grant but never assigns grant when no request is active. Convert it to always_comb, fix the incomplete assignment with a default, and state what the tool would have said without the fix.',
      starterCode:
        'module prio(\n    input  logic [3:0] req,\n    output logic [3:0] grant\n);\n    // TODO: convert to always_comb, assign grant on every path\n    always @(*) begin\n        if      (req[3]) grant = 4\'b1000;\n        else if (req[2]) grant = 4\'b0100;\n        else if (req[1]) grant = 4\'b0010;\n        else if (req[0]) grant = 4\'b0001;\n    end\nendmodule',
      expectedBehavior:
        'Correct answer: add an else branch (or a default grant = 4\'b0000;) and write always_comb. Without the fix the tool reports latch-like behavior on grant, because grant must hold its value when all req bits are 0 — memory a combinational block cannot have.',
      hints: [
        'What happens when req = 4\'b0000?',
        'A default assignment at the top of the block is the idiomatic fix.',
        'Which block reports the problem: always_comb itself.',
      ],
    },
    practiceExercises: [
      {
        title: 'Classify the block',
        brief:
          'For each fragment, name the right typed block: (a) next-state logic reading state and inputs; (b) state register update on posedge; (c) a bus-hold register that keeps data while enable is low; (d) a block computing a sum from three inputs.',
        expectedBehavior:
          '(a) always_comb. (b) always_ff. (c) always_latch. (d) always_comb.',
        hints: [
          'Ask: memory or no memory? Edge or level?',
          'A bus hold is the textbook legitimate latch.',
          'Combinational outputs = always_comb, even in a sequential-looking module.',
        ],
      },
      {
        title: 'Explain the time-zero difference',
        brief:
          'A testbench samples a decoder output at time 0, before any input changes. Explain why an @(*) version may show a stale value while an always_comb version does not, and why this matters for reset-state checking.',
        expectedBehavior:
          '@(*) waits for the first change on a listed signal before executing; at time 0 the output holds its initializer (often x). always_comb executes once at time 0, so outputs are consistent with the initial inputs immediately — which makes reset-state assertions meaningful.',
        hints: [
          'When does @(*) first run?',
          'What do uninitialized regs read as?',
          'Reset-state checks sample right after reset, often near time 0.',
        ],
      },
    ],
    assessment: {
      title: 'Typed always blocks checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which check does always_comb perform that always @(*) does not?',
          options: [
            'It derives the sensitivity list',
            'It reports latch-like behavior when an output is not assigned on every path',
            'It synthesizes to different hardware',
            'It supports nonblocking assignments',
          ],
          answer: 'It reports latch-like behavior when an output is not assigned on every path',
          explanation:
            'Both derive sensitivity lists; they synthesize to the same hardware. always_comb adds the completeness (latch) check, time-0 evaluation, and the no-other-drivers rule.',
          hint: 'Two of the options are things both blocks do.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'bug-identification',
          prompt: 'This block is rejected by the tool. Why?',
          code: 'always_ff @(posedge clk) begin\n    q = d;\nend',
          options: [
            'Missing reset',
            'Blocking assignment inside a clocked block',
            'q must be declared wire',
            'Missing negedge in the sensitivity list',
          ],
          answer: 'Blocking assignment inside a clocked block',
          explanation:
            'always_ff requires nonblocking assignments for the variables it clocks; q = d must be q <= d.',
          hint: 'Which assignment operator does flip-flop modeling demand?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A conditional assignment inside always_comb (assigning an output only when enable is high) is a legitimate way to describe a latch.',
          answer: 'false',
          explanation:
            'always_comb is for combinational intent and a standard-conforming tool reports the memory-like behavior. The legitimate idiom for an intentional latch is always_latch.',
          hint: 'Which block exists precisely for intentional latches?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Which typed block executes once at time zero so its outputs are valid before the first input change (one word with underscore)?',
          answer: 'always_comb',
          explanation:
            'always_comb performs an initial evaluation at time 0, unlike @(*) which waits for a first sensitivity event. This makes outputs well-defined from the start of simulation.',
          hint: 'It is the combinational-intent block.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'always_comb', definition: 'Combinational-intent block: derived sensitivity list, time-0 evaluation, latch warning, no competing drivers.' },
      { term: 'always_ff', definition: 'Flip-flop-intent block: clocking event required, nonblocking assignments mandatory.' },
      { term: 'always_latch', definition: 'Latch-intent block: declares and checks level-sensitive hold behavior.' },
      { term: 'Sensitivity list', definition: 'The Verilog trigger condition of an always block; hand-maintained lists are a classic bug source.' },
      { term: 'Latch inference', definition: 'Hardware memory created accidentally when a combinational block leaves an output unassigned on some path.' },
    ],
    revisionSummary: [
      'always = three different hardwares; SystemVerilog names the intent instead.',
      'always_comb: no sensitivity list, runs at t=0, warns on incompleteness, forbids other drivers.',
      'always_ff: clocking event required, nonblocking only — the mixed-assignment bug becomes a compile error.',
      'always_latch: for intentional latches only; accidental ones surface as always_comb warnings.',
      'Same hardware when correct; dramatically better errors when not.',
    ],
    furtherReading: [
      { label: 'Wikipedia — SystemVerilog (procedural blocks)', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
      { label: 'Wikipedia — Latch (electronics)', url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'sv-m03-l2',
    title: 'Interfaces: Bundling Related Signals',
    summary:
      'Collapse the port-list sprawl of a valid/ready handshake into one interface, connect it by name, and see why bundles beat parallel signal lists as designs scale.',
    objectives: [
      'Define an interface bundling a request/response group of signals.',
      'Instantiate an interface and connect it to a module that declares the interface as a port type.',
      'Explain how adding a signal to an interface updates every connection with one edit.',
      'Trace a valid/ready handshake cycle-by-cycle on a waveform.',
    ],
    whyItMatters:
      'Ask anyone who built a bus-based SoC in plain Verilog: the port list is where the bugs live. Twenty signals that travel together get wired one by one, one mis-ordered connection silently swaps two of them, and every new feature means touching dozens of files. Interfaces make "these signals belong together" a language construct. The valid/ready handshake you will bundle here is the single most common interface pattern in modern design, so this lesson pays off in every later course.',
    prerequisites: [
      'sv-m01-l2: logic and signal declarations',
      'The handshaking concept from the RTL methodology course',
    ],
    explanation:
      'An **interface** is a named bundle of signals (and optional methods) declared once and instantiated like a module. Here is the canonical streaming handshake:\n\n```\ninterface stream_if #(parameter int W = 8) (input logic clk, input logic rst_n);\n  logic        valid;\n  logic        ready;\n  logic [W-1:0] data;\nendinterface\n```\n\nA producer drives valid/data; a consumer drives ready. A transfer happens on a clock edge where **valid and ready are both high** — either side may stall the other. Modules adopt the bundle with one port: `module producer(stream_if sif);` — no more eleven-line port lists. The testbench creates one interface instance (`stream_if bus(.clk(clk), .rst_n(rst_n));`) and passes the same instance to producer, consumer and monitor, so every block references the *same* signals instead of interconnected copies.\n\nThe scale argument is the one to remember. Adding a `user` sideband bit to a Verilog handshake means editing: the interface-as-port-list of the producer, the consumer, every instantiation, and every wire in between. With an interface it means editing the interface — every connection updates because the connection is the bundle, not a list of individual nets. This is the same reason object-oriented code beats copy-paste: change the abstraction once.\n\nHonesty note: interfaces are design-subset SystemVerilog. Icarus supports basic interface instantiation and access, though some corners (modports in all positions, parameter edge cases) vary by version; commercial tools and Verilator support them fully. If the grader rejects a given interface construct, treat the code as illustrative — it is standard-correct.',
    deepDive:
      '### Where interfaces sit in the language\n\nAn interface is a real design element with its own scope: it can contain parameters, signals, always blocks, assertions and tasks, and it is instantiated in a module with an instance name. Signals inside are accessed hierarchically (`bus.valid`) or through ports declared with the interface type (`sif.valid`). That second form is the one to prefer in module headers, because it keeps modules connectable through a *contract* (this interface) rather than through global hierarchical names. In verification code you will meet **virtual interfaces** (Module 04) which let classes hold handles to interface instances — the last piece that makes OOP testbenches connect to real signals.\n\n### The valid/ready contract, precisely\n\nThe protocol rules are worth memorizing because they recur everywhere (AXI-Stream, AXI handshakes, NoC links): (1) once a source asserts valid, it must keep it asserted (with stable data) until the transfer completes — no "valid for one cycle, retract, retry"; (2) a destination may assert ready unconditionally or conditionally, but a transfer is committed exactly on the edge where valid && ready; (3) neither side may wait for the other in a way that deadlocks — typically ready must not depend on valid in the same cycle if the spec forbids it (a common rule in AXI configs). Breaking rule (1) is the most common handshake bug, and it is invisible unless your monitor checks it — which is exactly what assertions (Module 06) and a good monitor (Module 04) are for.\n\n### Interfaces vs structs vs plain ports\n\nA packed struct (Module 02) groups bits into one *value*; an interface groups signals into one *connection*. A struct field has a single driver inside one module; interface signals are separate nets/variables that different modules drive in different directions. You will often use both together: an interface carrying a struct payload plus the handshake bits. Plain ports remain right for tiny, stable boundaries — a two-signal module does not need the machinery. The decision scales: the more signals travel together, the more the interface pays.',
    examples: [
      {
        title: 'Port-list sprawl in plain Verilog',
        language: 'verilog',
        code:
        '// Verilog-2001: every connection repeats the bundle by hand\nmodule producer_v(\n    input  wire       clk,\n    input  wire       rst_n,\n    output reg        vld,\n    output reg  [7:0] dat,\n    input  wire       rdy\n);\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n) begin vld <= 1\'b0; dat <= 8\'h00; end\n        else if (!vld || rdy) begin\n            vld <= 1\'b1;             // keep valid up until accepted\n            dat <= dat + 8\'d1;       // example payload: a counter\n        end\n    end\nendmodule\n\nmodule consumer_v(\n    input  wire       clk,\n    input  wire       rst_n,\n    input  wire       vld,\n    input  wire [7:0] dat,\n    output reg        rdy\n);\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n) rdy <= 1\'b1;\n        else        rdy <= ~rdy;   // demo consumer: accepts every other cycle\n    end\nendmodule\n// Four signal wires must now be declared and connected at the top level:\n// vld, dat, rdy plus clock/reset. Every extra signal = 4 more edits.',
        explanation: [
          'The handshake signals exist as separate ports in each module and as separate wires at the top level: 3 signals x 3 sites = 9 declaration/connection points before any feature is added.',
          'The producer holds valid until ready (protocol rule 1); the demo consumer toggles ready to create stalls.',
          'Every new sideband signal multiplies the edit surface.',
        ],
      },
      {
        title: 'The same bundle as an interface',
        language: 'systemverilog',
        code:
        '// SystemVerilog: one bundle, one connection (illustrative if your\n// tool lacks interface support — standard-correct per IEEE 1800)\ninterface stream_if #(parameter int W = 8)\n                     (input logic clk, input logic rst_n);\n    logic         valid;\n    logic         ready;\n    logic [W-1:0] data;\nendinterface\n\nmodule producer(stream_if sif);\n    always_ff @(posedge sif.clk or negedge sif.rst_n) begin\n        if (!sif.rst_n) begin\n            sif.valid <= 1\'b0;\n            sif.data  <= \'0;\n        end else if (!sif.valid || sif.ready) begin\n            sif.valid <= 1\'b1;          // hold until accepted\n            sif.data  <= sif.data + 1\'b1;\n        end\n    end\nendmodule\n\nmodule consumer(stream_if sif, output logic [7:0] last);\n    logic rdy_q;\n    always_ff @(posedge sif.clk or negedge sif.rst_n) begin\n        if (!sif.rst_n) rdy_q <= 1\'b1;\n        else            rdy_q <= ~rdy_q;   // accept every other cycle\n        last <= (sif.valid && sif.ready) ? sif.data : last;\n    end\n    assign sif.ready = rdy_q;\nendmodule',
        explanation: [
          'The interface declares the three handshake signals once, plus clock/reset as interface-level inputs — every user gets them.',
          'producer and consumer each declare ONE port (stream_if sif); sif.valid / sif.ready / sif.data read like the protocol spec.',
          'Adding a sideband bit later means one edit inside stream_if — every instantiation and connection follows automatically.',
          'consumer writes last only on accepted transfers (valid && ready), a pattern monitors reuse.',
        ],
      },
      {
        title: 'Top level: instantiate once, share everywhere',
        language: 'systemverilog',
        code:
        '// SystemVerilog top level: one interface instance for the whole system\nmodule top;\n    logic clk = 1\'b0;\n    logic rst_n = 1\'b0;\n    logic [7:0] last;\n\n    always #5 clk = ~clk;               // 100 MHz demo clock\n\n    stream_if #(8) bus (.clk(clk), .rst_n(rst_n));\n\n    producer u_prod (.sif(bus));\n    consumer u_cons (.sif(bus), .last(last));\n\n    initial begin\n        #23 rst_n = 1\'b1;               // release reset at t=23ns\n        #200 $finish;\n    end\nendmodule',
        explanation: [
          'The interface instance bus is created exactly like a module instance, including its parameter and port connections.',
          'Both DUT blocks receive the SAME instance, so u_prod.valid and u_cons.valid are literally one signal — no top-level wires to cross-connect.',
          'The testbench clock/reset live at top level and feed the interface, matching how commercial environments attach clocks to interfaces.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'valid/ready handshake with a stall',
        content:
        '         cycle:    1     2     3     4     5     6\n                   |     |     |     |     |     |      <- rising edges\nclk         ____----____----____----____----____----\nvalid       ____----________----____----____----\ndata        ----===D0====----====D1====----===D2==   (D stable while waiting)\nready       ____--------________--------________--\ntransfer?      D0      -     D1     D2     -\n\n  Cycle 1: valid=1 ready=1        -> D0 accepted\n  Cycle 2: valid=0 ready=1        -> idle (source had nothing)\n  Cycle 3: valid=1 ready=0        -> STALL: D1 held, no transfer\n  Cycle 4: valid=1 ready=1        -> D1 accepted (same data as c3)\n  Cycle 5: valid=1 ready=1        -> D2 accepted\n\n  Rule: a transfer happens only on an edge where valid AND ready are 1.',
        caption:
          'Educational waveform (illustrative) of the valid/ready contract: data may not change while valid is high and the transfer has not completed.',
      },
    ],
    tables: [
      {
        caption: 'Grouping mechanisms compared',
        headers: ['Mechanism', 'Groups', 'Direction control per user', 'Best for'],
        rows: [
          ['Plain ports', 'Nothing — one signal each', 'Implicit in port direction', 'Tiny stable boundaries'],
          ['Packed struct', 'Bits of one value', 'N/A (one value)', 'Payloads, flat buses'],
          ['interface', 'Signals as one connection', 'Yes — modports (next lesson)', 'Buses, handshakes, SoC links'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Dropping valid for one cycle and re-asserting it with new data when the consumer stalls.',
        fix: 'Protocol rule 1: once valid is high it stays high, with stable data, until ready completes the transfer. Gate your data update with (!valid || ready), exactly as the example producer does.',
      },
      {
        mistake: 'Creating two interface instances and connecting one to the producer and one to the consumer.',
        fix: 'A handshake needs ONE instance shared by both sides (and the monitor). Two instances create two separate sets of signals, and the transfer never happens.',
      },
      {
        mistake: 'Driving an interface signal from two modules without direction discipline.',
        fix: 'Interfaces do not by themselves prevent multi-driver mistakes. Use modports (next lesson) so each role sees only the signals it is allowed to drive, and keep one driver per signal.',
      },
    ],
    guidedPractice: {
      title: 'Add a sideband signal',
      brief:
        'Starting from stream_if in this lesson, add a 2-bit user sideband carried with the data, update the producer to drive it with a counter, and count how many files must change. Then compare with the Verilog version.',
      starterCode:
        'interface stream_if #(parameter int W = 8)\n                     (input logic clk, input logic rst_n);\n    logic         valid;\n    logic         ready;\n    logic [W-1:0] data;\n    // add: logic [1:0] user;\nendinterface',
      expectedBehavior:
        'Add `logic [1:0] user;` inside the interface, and have producer drive sif.user (for example sif.user <= sif.user + 1 on accepted transfers). Only ONE file (the interface) changes structurally; producer changes behaviorally. In the Verilog version, user would touch both module port lists, both instantiations, and the top-level wire: 5+ edits.',
      hints: [
        'The interface is the contract; consumers read it but need no port changes.',
        'Count Verilog edits: port list x2, instantiation x2, wire declaration.',
        'Sideband signals must obey the same stability rule as data while valid is high.',
      ],
    },
    practiceExercises: [
      {
        title: 'Trace the handshake',
        brief:
          'Given cycles 1..6 with valid = 1,0,1,1,1,0 and ready = 1,1,0,1,1,1, and data D0..D2 asserted from cycle 1, 3, 5 respectively: list which cycles transfer data and what the monitor would record.',
        expectedBehavior:
          'Transfers occur on cycles where valid && ready: cycle 1 (D0), cycle 4 (D1), cycle 5 (D2). Cycle 3 is a stall (valid without ready), cycle 2 and 6 are idle for the source. The monitor records three transfers: D0, D1, D2.',
        hints: [
          'A transfer needs BOTH signals high on the same edge.',
          'Data on a stalled cycle is the same data that transfers later.',
          'valid=0 cycles are idle, not errors.',
        ],
      },
      {
        title: 'Spot the protocol violation',
        brief:
          'A producer asserts valid with data 0xAA for one cycle while ready is low, then deasserts valid for a cycle, then reasserts with 0xBB. Which handshake rule is broken, and what would a correct producer do?',
        expectedBehavior:
          'Rule 1 is broken: valid was retracted before the transfer completed. A correct producer holds valid=1 and data=0xAA until an edge where ready is high; only then may it move to new data.',
        hints: [
          'What is the meaning of valid being high for one cycle with no ready?',
          'Re-asserting with different data means the first transfer vanished.',
          'The fix is a hold condition in the producer update equation.',
        ],
      },
    ],
    assessment: {
      title: 'Interfaces checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'On which clock edge does a valid/ready transfer commit?',
          options: [
            'The edge where valid rises',
            'The edge where ready rises',
            'The edge where valid AND ready are both high',
            'The edge after valid and ready have both been high once',
          ],
          answer: 'The edge where valid AND ready are both high',
          explanation:
            'The transfer is committed exactly on the edge sampling valid=1 and ready=1. Either side alone high means stall or idle, not transfer.',
          hint: 'Both parties must agree on the same edge.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Adding a new sideband signal to an interface requires editing how many connection sites at top level?',
          options: [
            'One (the interface declaration)',
            'One per connected module',
            'One per signal wire at top level',
            'None; the signal must be added in every module',
          ],
          answer: 'One (the interface declaration)',
          explanation:
            'The connection is the bundle. Modules that declare the interface as a port automatically gain the new signal; only behavior that drives or uses it needs code changes.',
          hint: 'What is it that gets wired — signals or the bundle?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A producer may retract valid (drop it to 0) before the consumer asserts ready, as long as it re-asserts valid with the same data later.',
          answer: 'false',
          explanation:
            'Once valid is asserted it must remain asserted, with stable data, until the transfer completes. Retraction and re-assertion is a protocol violation even with unchanged data.',
          hint: 'Re-read rule 1 of the handshake contract.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What keyword declares a bundle of signals that is instantiated like a module and passed as a port type?',
          answer: 'interface',
          explanation:
            'An interface declares the bundle; instances are created like modules and modules declare the interface type as a port.',
          hint: 'It is in this lesson title.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'interface', definition: 'A named, instantiable bundle of signals (and optional code) connecting multiple modules through one contract.' },
      { term: 'Interface instance', definition: 'A concrete instantiation of an interface, shared by every module and monitor that connects to it.' },
      { term: 'valid/ready handshake', definition: 'The two-party flow control where a transfer commits exactly on an edge with both signals high.' },
      { term: 'Stall', definition: 'A cycle where valid is high but ready is low: data is held and no transfer occurs.' },
      { term: 'Sideband signal', definition: 'A signal (such as user or type) carried alongside the payload through the same bundle.' },
    ],
    revisionSummary: [
      'Interfaces turn "these signals travel together" into one declaration and one connection.',
      'Modules declare the interface as a port type; the top level instantiates it once and shares it.',
      'Adding a signal is a one-file edit — the scaling argument over port lists.',
      'valid/ready: transfer commits only on an edge with both high; valid holds with stable data until then.',
      'Interfaces are SV design-subset features; basic forms are widely supported, corners vary by tool.',
    ],
    furtherReading: [
      { label: 'Wikipedia — SystemVerilog (interfaces)', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
      { label: 'Wikipedia — Advanced eXtensible Interface (handshake origin)', url: 'https://en.wikipedia.org/wiki/Advanced_eXtensible_Interface', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'sv-m03-l3',
    title: 'Modports and End-to-End Connection Discipline',
    summary:
      'Give each role its own view of an interface — which signals it may drive and which it may only watch — and connect a DUT, a testbench and a monitor through one bundle without multi-driver accidents.',
    objectives: [
      'Declare modports that restrict a role to driving only its own signals.',
      'Connect modules through different modports of one interface instance.',
      'Explain how modports turn direction discipline from review convention into tool-checked structure.',
      'Describe where a monitor attaches and why it uses a watch-only view.',
    ],
    whyItMatters:
      'An interface bundles signals but says nothing about who drives what — connect a module wrong and you get x-values or silent contention that the bundle made easier to create. Modports fix this: each role (master, slave, monitor) gets a named view with explicit input/output directions, and connecting through the wrong view becomes a compile error. This is the difference between an interface as a convenience and an interface as a protocol contract, and it is the pattern every professional SV testbench uses.',
    prerequisites: [
      'sv-m03-l2: interfaces and the valid/ready handshake',
      'sv-m01-l2: the one-driver rule for variables',
    ],
    explanation:
      'A **modport** is a named view of an interface that fixes the direction of each signal for whoever connects through it. Declared inside the interface:\n\n```\ninterface stream_if #(parameter int W = 8)\n                     (input logic clk, input logic rst_n);\n  logic         valid;\n  logic         ready;\n  logic [W-1:0] data;\n\n  modport src (output valid, data, input ready, clk, rst_n);\n  modport dst (input valid, data, clk, rst_n, output ready);\n  modport mon (input valid, ready, data, clk, rst_n);\nendinterface\n```\n\nA producer declares its port as `stream_if.src sif` and can drive only valid and data — assigning sif.ready through that view is a compile error. The consumer uses `.dst`, a passive monitor uses `.mon` and cannot drive anything. The signals are still one shared set of wires; modports only restrict each connection\'s *view*. Note the syntax detail: directions are listed per signal, and signals not mentioned in a modport are not accessible through it at all — the view is allow-list, not block-list.\n\nThe end-to-end pattern is then fixed: the top level instantiates the interface once; the producer connects via the src modport; the consumer via dst; the testbench and monitor via mon (or via a stimulus modport that lets the TB play the src role). Direction discipline is now structural: the protocol\'s "who drives what" is checked at compile time on every instantiation instead of being policed by review.',
    deepDive:
      '### Why an allow-list view is the right default\n\nThe dangerous connections are the ones nobody thought about: a consumer that "helpfully" also drives valid during some corner case compiles fine in plain Verilog and produces a multi-driver race that shows up as intermittent x-propagation months later. With modports, that code does not compile — the dst view does not export valid as an output. Allow-listing also documents the protocol in code: reading the modport block tells you the complete direction contract of each role without reading any module body. In review, a modport diff IS a protocol change, which focuses attention.\n\n### What modports do not do\n\nHonest boundaries, so you are not surprised later: a modport is a *view*, not a copy — there are still exactly one valid/ready/data in existence. It does not add synchronizers, arbiters or FIFOs; it does not check protocol *sequences* (that valid stays stable until ready — that is the job of assertions, Module 06). And modport direction checking applies to the *connection*; it cannot stop a module from misusing a signal it legitimately drives (that is what assertions and lint are for). Knowing the boundary between "structure the language enforces" and "behavior you must still verify" is exactly the verification mindset this course builds.\n\n### The testbench role and clocking blocks (a look ahead)\n\nIn commercial-style environments the testbench connects through a modport too, and usually through a **clocking block** declared in the interface — a named sampling/driving abstraction that says "sample these signals at the clock edge with a defined skew, drive those with a defined skew". Clocking blocks remove the sample-at-exactly-which-edge ambiguity between class code and the DUT and are standard in UVM environments. They are SV testbench-side features beyond Icarus\' support, so this course treats them as concept: recognize them when reading professional code, where they appear as `clocking cb @(posedge clk);` inside the interface and modports referencing `(clocking cb);`.\n\n### Support reality\n\nInterfaces: broadly supported. Modports: supported by commercial tools and Verilator; Icarus supports them partially, with version-dependent corners. As throughout this module, treat any grader rejection as a tool-support limit, not a code bug — the constructs here are standard-correct.',
    examples: [
      {
        title: 'One interface, three modports, connected correctly',
        language: 'systemverilog',
        code:
        '// SystemVerilog: modports enforce who drives what (standard-correct;\n// some tools - including older Icarus - support modports partially)\ninterface stream_if #(parameter int W = 8)\n                     (input logic clk, input logic rst_n);\n    logic         valid;\n    logic         ready;\n    logic [W-1:0] data;\n\n    modport src (output valid, data,\n                 input  ready, clk, rst_n);\n    modport dst (input  valid, data, clk, rst_n,\n                 output ready);\n    modport mon (input  valid, ready, data, clk, rst_n);\nendinterface\n\nmodule producer(stream_if.src sif);\n    always_ff @(posedge sif.clk or negedge sif.rst_n) begin\n        if (!sif.rst_n)      sif.valid <= 1\'b0;\n        else if (!sif.valid || sif.ready) begin\n            sif.valid <= 1\'b1;\n            sif.data  <= sif.data + 1\'b1;\n            // sif.ready <= 1;   // COMPILE ERROR: ready is input in src view\n        end\n    end\nendmodule\n\nmodule consumer #(parameter int W = 8) (stream_if.dst sif, output logic [W-1:0] last);\n    always_ff @(posedge sif.clk or negedge sif.rst_n) begin\n        if (!sif.rst_n) sif.ready <= 1\'b1;\n        else            sif.ready <= ~sif.ready;\n        last <= (sif.valid && sif.ready) ? sif.data : last;\n    end\nendmodule',
        explanation: [
          'src view: valid/data are outputs, ready is input — a producer literally cannot drive ready through this view.',
          'dst view: the mirror image; mon view: all inputs, so a monitor cannot disturb the signals it watches.',
          'The commented line inside producer shows the payoff: the direction mistake is a compile error, not an x-propagation mystery.',
          'last is parameterized on the consumer side (#(parameter int W = 8)); a module cannot read the interface parameter from the port type, so each module declares the widths it needs — keep them consistent with the interface instantiation.',
        ],
      },
      {
        title: 'Top level: every role connects through its modport',
        language: 'systemverilog',
        code:
        '// SystemVerilog top level: one instance, role-specific views\nmodule top;\n    logic clk = 1\'b0;\n    logic rst_n = 1\'b0;\n    logic [7:0] last;\n\n    always #5 clk = ~clk;\n\n    stream_if #(8) bus (.clk(clk), .rst_n(rst_n));\n\n    producer u_prod (.sif(bus.src));      // drives valid/data only\n    consumer u_cons (.sif(bus.dst), .last(last)); // drives ready only\n\n    // A monitor would connect as:\n    // monitor u_mon (.sif(bus.mon));    // input-only view\n\n    initial begin\n        #23 rst_n = 1\'b1;\n        #300;\n        $display("last accepted byte = %0d", last);\n        $finish;\n    end\nendmodule',
        explanation: [
          'The connection syntax is bus.src / bus.dst / bus.mon: the instance name qualified by the view name.',
          'All three connections reference the same underlying signals; only the permissions differ.',
          'This top level is also where a plain-Verilog-friendly testbench would drive stimulus — via the interface instance or a dedicated TB modport.',
        ],
      },
      {
        title: 'A watch-only monitor task through the mon view',
        language: 'systemverilog',
        code:
        '// SystemVerilog: monitoring through the input-only view (sketch)\nmodule monitor(stream_if.mon sif, output integer xfers);\n    initial xfers = 0;\n    always @(posedge sif.clk) begin\n        if (sif.rst_n && sif.valid && sif.ready) begin\n            xfers = xfers + 1;\n            $display("[%0t] transfer data=%0d", $time, sif.data);\n        end\n    end\nendmodule\n// mon exposes every signal as input: the monitor can count and print,\n// but any accidental assignment to valid/ready/data is a compile error.',
        explanation: [
          'The monitor samples on the clock edge and records a transfer exactly when valid && ready — the same commit rule as the protocol.',
          'Because the view is input-only, the tool enforces the observer role; monitors that disturb the DUT are a real (and embarrassing) bug class this prevents.',
          'In a full environment this task would push a transaction object into the scoreboard — the bridge to Module 04.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Views over one shared bundle',
        content:
        '                  +------------------------------------+\n                  |        stream_if instance bus      |\n                  |   valid      ready      data       |\n                  |   (one set of signals, W bits)     |\n                  +----+-----------------+---------+---+\n                       |                 |         |\n              view src |          view dst|         | view mon\n             (D: v,d)  |          (D: rdy)|         | (drives: nothing)\n                       v                 v         v\n                 +-----------+     +-----------+  +---------+\n                 | producer  |     | consumer  |  | monitor |\n                 +-----------+     +-----------+  +---------+\n\n  D = signals this view may Drive; everything else is input-only or\n  invisible. Wrong-direction access = compile error, not an x in the lab.',
        caption:
          'Modports are per-role views over one shared bundle: the protocol direction contract becomes compiler-checked structure.',
      },
    ],
    tables: [
      {
        caption: 'Role-to-modport mapping for the streaming interface',
        headers: ['Role', 'Modport', 'May drive', 'May read'],
        rows: [
          ['Producer / TB stimulus', 'src', 'valid, data', 'ready, clk, rst_n'],
          ['Consumer / DUT sink', 'dst', 'ready', 'valid, data, clk, rst_n'],
          ['Monitor / scoreboard tap', 'mon', 'nothing', 'valid, ready, data, clk, rst_n'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Declaring a modport but connecting modules to the bare interface (bus instead of bus.src).',
        fix: 'A connection that omits the modport gets the unmoded view, where all signals are accessible and nothing is enforced. Always qualify the view at the connection site; coding guidelines make it mandatory.',
      },
      {
        mistake: 'Assuming a modport copies the signals or creates separate instances per view.',
        fix: 'Modports are views, not copies. There is exactly one valid/ready/data; every role references the same signals with different permissions.',
      },
      {
        mistake: 'Expecting modports to check protocol sequences like valid-stability or req-ack pairing.',
        fix: 'Modports enforce structure (directions), not behavior over time. Temporal rules are assertions (Module 06); data correctness is the scoreboard (Module 04).',
      },
    ],
    guidedPractice: {
      title: 'Add a request/grant modport set',
      brief:
        'An arbiter interface carries req[3:0], grant[3:0] and clk. Write the interface with two modports: requester (drives req only) and arbiter (drives grant only), plus a mon view. Then write the two module port declarations.',
      starterCode:
        'interface arbi_if (input logic clk);\n    logic [3:0] req;\n    logic [3:0] grant;\n    // modports here\nendinterface',
      expectedBehavior:
        'modport requester(output req, input grant, clk); modport arbiter(input req, clk, output grant); modport mon(input req, grant, clk); Module headers: module agent4(stream_if-like arbi_if.requester rif); and module arb(arbi_if.arbiter aif);.',
      hints: [
        'Each modport lists exactly the signals its role may drive.',
        'The requester needs to read grant to know it won.',
        'mon drives nothing.',
      ],
    },
    practiceExercises: [
      {
        title: 'Catch the wrong-view bug',
        brief:
          'A consumer connected through stream_if.src contains the line `sif.ready <= ~sif.ready;`. Explain what happens at compile time, and what would have happened in plain Verilog with hand-connected wires instead.',
        expectedBehavior:
          'Compile error: ready is an input in the src view, so the consumer cannot drive it. In plain Verilog the connection would compile, creating two drivers on ready (consumer and true consumer), producing x-values or last-write-wins races that appear as intermittent handshake failures.',
        hints: [
          'Check the src modport direction list.',
          'Multiple drivers on one signal: what does simulation show?',
          'Compare: compile error now vs intermittent failure later.',
        ],
      },
      {
        title: 'Design a register-bus modport set',
        brief:
          'A register bus has addr, wdata, rdata, wr, rd, ack. Define the modports for master (drives addr, wdata, wr, rd; reads rdata, ack), slave (mirror), and monitor. State for each role whether rdata or ack appears as output.',
        expectedBehavior:
          'master: output addr, wdata, wr, rd; input rdata, ack. slave: input addr, wdata, wr, rd; output rdata, ack. mon: all inputs. Only the slave drives rdata and ack.',
        hints: [
          'The slave responds, so response signals are its outputs.',
          'The master reads responses; the monitor only watches.',
          'Lists must be allow-lists: unlisted signals are inaccessible.',
        ],
      },
    ],
    assessment: {
      title: 'Modports checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A module connected through stream_if.src assigns sif.ready. What happens?',
          options: [
            'It compiles and creates a second driver on ready',
            'Compile error: ready is an input in the src view',
            'It compiles; the assignment is ignored',
            'Compile error only if two modules do it',
          ],
          answer: 'Compile error: ready is an input in the src view',
          explanation:
            'Modports are allow-list views: a signal listed as input cannot be driven through that view, so the direction mistake is caught at compile time.',
          hint: 'Re-read the src modport declaration.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'How many physical valid signals exist when one stream_if instance is connected through src, dst and mon views?',
          options: ['One', 'Two (one for TB, one for DUT)', 'Three (one per view)', 'Depends on the monitor count'],
          answer: 'One',
          explanation:
            'Modports are views over one shared bundle; the signals exist once and every role references the same ones with different permissions.',
          hint: 'Views restrict access; they do not duplicate hardware.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A signal not mentioned in a modport is inaccessible through that modport view.',
          answer: 'true',
          explanation:
            'A modport is an allow-list: only listed signals are visible through the view, with the listed directions. Unlisted signals require the bare interface or another modport.',
          hint: 'Think allow-list versus block-list.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Write the connection fragment that connects a monitor to interface instance bus through its mon view.',
          answer: '.sif(bus.mon)',
          explanation:
            'Views are selected at the connection site: instance name qualified by view name, bus.mon.',
          hint: 'It is the instance name, a dot, and the view name.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'modport', definition: 'A named view of an interface fixing each visible signal as input or output for connections made through it.' },
      { term: 'View', definition: 'The role-specific perspective on an interface bundle; views restrict, never copy.' },
      { term: 'Allow-list', definition: 'The modport visibility model: unlisted signals are inaccessible through the view.' },
      { term: 'Monitor', definition: 'A passive observer that samples interface activity and reports transactions; connects through an input-only view.' },
      { term: 'Clocking block', definition: 'An interface construct defining synchronized sampling/driving skews relative to a clock; concept-covered here.' },
    ],
    revisionSummary: [
      'Modports give each role a checked view: exactly which signals it may drive.',
      'Connect through views at the top level: bus.src, bus.dst, bus.mon.',
      'Views are allow-lists over ONE shared set of signals; nothing is duplicated.',
      'Modports enforce direction structure; temporal protocol rules still need assertions.',
      'Wrong-direction access becomes a compile error instead of an intermittent lab failure.',
    ],
    furtherReading: [
      { label: 'Wikipedia — SystemVerilog', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
      { label: 'Wikipedia — Bus (computing)', url: 'https://en.wikipedia.org/wiki/Bus_(computing)', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
