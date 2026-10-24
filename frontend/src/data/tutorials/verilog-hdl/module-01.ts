import type { TutorialLesson } from '../types';

// Module 01 — Introduction to Verilog
export const module01Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m01-l1',
    title: 'What Is a Hardware Description Language?',
    summary:
      'Meet Verilog as a language for describing hardware structure, and confront the single biggest misconception beginners carry: that Verilog is "just like C".',
    objectives: [
      'Explain what a hardware description language describes and who consumes it.',
      'Contrast sequential program execution (C) with concurrent hardware structure (Verilog).',
      'Read a small Verilog snippet and say what physical hardware each line represents.',
      'Identify which parts of Verilog describe parallel structure and which model time.',
    ],
    whyItMatters:
      'Nearly every early Verilog bug comes from thinking like a software developer: expecting statements to "run" top to bottom, once. Verilog files are not programs that execute — they are blueprints that tools either simulate over time or compile into physical gates. If you internalize the concurrency model in this lesson, every later module (procedural blocks, blocking vs nonblocking, FSMs) will make sense; if you skip it, you will fight the language for months.',
    prerequisites: [],
    explanation:
      'A **hardware description language** (HDL) is a language whose text describes the *structure* and *behavior* of digital hardware. A Verilog source file is not a recipe a CPU follows — it is a specification that two very different tools can consume: a **simulator** evaluates the described circuit over time so you can check its behavior, and a **synthesizer** translates the described circuit into a netlist of real gates and flip-flops that a chip can be built from. Same file, two consumers, two very different meanings of "run".\n\n### C executes in time; Verilog exists in space\n\nA C program is a **sequence**: one program counter walks statements one at a time, and each statement runs when control reaches it. `y = (a & b) | c;` means "at this point in the flow, compute this once". A Verilog continuous assignment `assign y = (a & b) | c;` means something completely different: "build a small combinational circuit whose output y always equals (a & b) | c, from now until the power is removed". It does not run once. It does not run when control reaches it. It simply *is* — a standing relationship between wires, recomputed by physics (or by the simulator) every time any input changes, forever, in parallel with every other piece of hardware in the design.\n\nThis is the number-one misconception this course exists to kill: **Verilog is not executed top-to-bottom.** Adding a third `assign` to a module does not make the circuit slower or take another clock cycle — it builds a third piece of hardware that operates *simultaneously* with the other two. Hardware design is a game of space (how many gates, how many registers); software is a game of time (how many instructions, how many cycles).\n\n### Where Verilog *is* sequential\n\nVerilog does have sequential-looking code: statements inside `initial` and `always` blocks, which you will meet in module 06. But even there, the sequencing models something physical — usually *time* (what happens at this clock edge versus the next one), not program flow. And in a real design, dozens of such blocks are all alive at once, each reacting to clock edges independently. A Verilog design is best pictured as a photograph of a circuit board: every block is awake at the same time.',
    deepDive:
      '### Hardware thinks in space, software in time\n\nIn C, you unroll work *over time*: a loop runs its body N times, reusing the same ALU. In hardware you can unroll work *over space*: build N copies of the adder and compute everything in one shot — paying silicon area instead of clock cycles. This is the fundamental trade-off of chip design, and it falls straight out of the concurrency model: since nothing ever "waits its turn" unless you explicitly build a state machine that makes it wait, parallelism is the default and costs area.\n\n### Event-driven simulation\n\nSimulators such as Icarus Verilog are **event-driven**: they do not recompute the whole universe every nanosecond. They keep a list of "things that changed" and wake up only the blocks whose inputs changed. This is why a Verilog description with no changing inputs produces no simulation activity at all — the simulator literally has nothing to do. You will rely on this when writing testbenches: no stimulus means no events means no results.\n\n### The mental translation habit\n\nTrain yourself to read every line of RTL as a piece of hardware:\n\n- `assign y = a & b;` → an AND gate.\n- `assign y = s ? a : b;` → a 2:1 multiplexer.\n- `q <= d;` inside `always @(posedge clk)` → a D flip-flop clocked by clk.\n- A vector `[7:0]` → an 8-wide bundle of wires.\n\nIf you can keep answering "what gate is this?", you are doing hardware design; the moment you catch yourself reasoning "this statement runs first", stop and re-read the line as a wire.',
    examples: [
      {
        title: 'The same computation, as software and as hardware',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int a = 1, b = 0, c = 1;\n    int y;\n\n    y = (a & b) | c;   /* executes ONCE, here, in order */\n\n    printf("y=%d\\n", y);   /* prints y=1 */\n    return 0;\n}',
        explanation: [
          'Control flows top to bottom: declarations, then the assignment, then the print.',
          'The expression `(a & b) | c` is evaluated exactly once, at the moment control reaches it — with the values a, b, c hold at that instant.',
          'After this line runs, changing a, b or c has no effect on y until the statement is executed again.',
          'If we wanted y to track future changes, the C program would need an explicit loop re-evaluating the expression forever.',
        ],
      },
      {
        title: 'The same function as standing Verilog hardware',
        language: 'verilog',
        code:
          '// Hardware description — every line is ALWAYS active, in parallel.\nmodule demo(\n    input  wire a,\n    input  wire b,\n    input  wire c,\n    output wire y1,\n    output wire y2\n);\n    assign y1 = a & b;    // AND gate: exists continuously\n    assign y2 = y1 | c;   // OR gate: y1 is a real wire feeding it\n\nendmodule',
        explanation: [
          'Line by line, this module describes two gates wired together: y1 = AND(a, b), then y2 = OR(y1, c).',
          'Both `assign` statements describe hardware that is alive at the same time — there is no "first" and "second" statement, only two gates connected by the wire y1.',
          'With a=1, b=0, c=1 the physical answer is y1=0, y2=1 — and it stays that way the entire time those inputs are applied. If a later changes to 0, y2 changes to 1 with no code running anywhere.',
          'Nothing here "executes". If a synthesis tool reads this file, it emits exactly two gates. If a simulator reads it, it watches those two gates react to input changes.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Sequential software flow vs concurrent hardware',
        content:
          '  SOFTWARE (C) — control flow in TIME          HARDWARE (Verilog) — structure in SPACE\n\n       +-----------+                                 a ----+            +-----+\n       |  a=1      |                                       |            |     |\n       +-----------+                                 b ----+--+--(AND)---| y1  |\n       |  y = ...  |  one statement at a time                  |  gate     |     |\n       +-----------+                                     c ----+----(OR)---| y2  |\n       |  printf   |  runs once, then program exits                 |  gate     +-----+\n       +-----------+                                                (both gates live\n                                                                      simultaneously,\n      y changes only when the                                          forever)\n      statement executes again',
        caption:
          'The C statement is an event in time; the two Verilog assigns are two gates that exist permanently and react in parallel.',
      },
    ],
    tables: [
      {
        caption: 'C mindset vs Verilog mindset',
        headers: ['Question', 'C program', 'Verilog design'],
        rows: [
          ['What does the text describe?', 'A sequence of instructions', 'A network of hardware blocks'],
          ['When does a statement "run"?', 'When control reaches it', 'It never runs — it exists'],
          ['What happens after it runs?', 'Effect completes, done', 'Reacts to inputs forever'],
          ['What does adding a line cost?', 'A little more runtime', 'More silicon area'],
          ['What is "fast"?', 'Fewer executed instructions', 'Shorter clock period, less area'],
          ['Parallelism', 'Explicit (threads)', 'The default state of the universe'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reading Verilog top-to-bottom as if it were a C program, expecting an assign to "have run" by the time the next line is read.',
        fix:
          'An assign is not a step in a sequence — it is a standing gate. Two assigns in a module have no ordering relationship at all; they are two pieces of hardware that became alive simultaneously when the design was elaborated.',
      },
      {
        mistake: 'Assuming statements lower in the file take effect "later" in simulation time.',
        fix:
          'File order affects only parsing and (in some cases) elaboration details, never when hardware reacts. Hardware reacts to input changes, whenever they occur. Simulation time is advanced only by delays (#) and clock edges.',
      },
      {
        mistake: 'Thinking "I will add a loop in Verilog to repeat this computation each cycle".',
        fix:
          'Repetition in hardware is usually unrolled (parallel copies, more area) or built as clocked logic (registers + a state machine). Decide what hardware you want first, then write the Verilog that describes it — never the reverse.',
      },
    ],
    guidedPractice: {
      title: 'Read hardware, not instructions',
      brief:
        'Given the two-assign module in Example 2, write down the value of y1 and y2 for all four combinations of (a, b) with c fixed at 1. Then answer: if a changes from 1 to 0 at time 10 ns, at what time does y2 change, and which Verilog statement "caused" it?',
      expectedBehavior:
        'With c=1: (a,b)=(0,0): y1=0, y2=1; (0,1): y1=0, y2=1; (1,0): y1=0, y2=1; (1,1): y1=1, y2=1. When a falls at 10 ns, y2 does not change at all (y1=0 either way, and 0|1=1). No statement caused it — the OR gate simply sees its inputs.',
      hints: [
        'Trace gate by gate: AND first, then OR — exactly like reading a schematic, not like stepping through code.',
        'For the timing question, ask: does any input of the OR gate actually change when a falls?',
      ],
    },
    practiceExercises: [
      {
        title: 'Hardware or software reasoning?',
        brief:
          'For each claim, state whether it is a valid statement about a Verilog design: (1) "This assign runs before that one." (2) "This register updates on every rising clock edge." (3) "This function returns a value each time it is called." (4) "These two always blocks are both active at the same clock edge."',
        expectedBehavior:
          'Only claims (2) and (4) are valid hardware reasoning. (1) is sequential-program thinking — assigns have no execution order. (3) describes software; Verilog functions are combinational hardware, not call/return code (module 13 shows the precise rules).',
      hints: [
        'Ask each claim: does it talk about time/edges (valid) or about execution order (invalid)?',
        'Clock edges are real hardware events — describing behavior per edge is exactly right.',
      ],
      },
      {
        title: 'Draw the circuit',
        brief:
          'Sketch (on paper) the gate circuit described by: assign p = a ^ b; assign q = p & c_in; assign sum = p ^ c_in; assign c_out = q | (a & b);. Then verify by hand that with a=1, b=0, c_in=1 the outputs are sum=0, c_out=1.',
        expectedBehavior:
          'The circuit is a full adder built from two half-adders. Trace: p = 1^0 = 1; q = 1&1 = 1; sum = 1^1 = 0; c_out = 1 | (1&0) = 1. Outputs sum=0, c_out=1 — correct, since 1+0+1 = 2 = binary 10.',
      hints: [
        'Each assign is one gate (XOR, AND, XOR, OR) with the named wires as pins.',
        'Check the arithmetic meaning: a + b + c_in = 2, and 2 in two bits is 10, i.e. sum=0 carry=1.',
      ],
      },
    ],
    assessment: {
      title: 'Module 01 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What is the fundamental difference between a C program and a Verilog design?',
          options: [
            'C executes statements in order with one program counter; Verilog describes hardware whose blocks are all active concurrently',
            'Verilog is faster than C because it is compiled to machine code',
            'C cannot describe arithmetic; Verilog can',
            'There is no real difference — Verilog is C with different keywords',
          ],
          answer:
            'C executes statements in order with one program counter; Verilog describes hardware whose blocks are all active concurrently',
          explanation:
            'C is a sequential model of computation in time; Verilog is a description of parallel structure in space. The other options are either false or miss the point entirely.',
          hint: 'Think "program counter vs photograph of a circuit board".',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt:
            'Adding a third continuous assignment (assign) to a module makes the described circuit take one additional clock cycle to produce its outputs.',
          answer: 'false',
          explanation:
            'Another assign builds another piece of combinational hardware operating in parallel. It may cost area or (if chained) add propagation delay, but it never adds a clock cycle by itself.',
          hint: 'Does a new gate need a clock to do its job?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'Using the module below, what is the value of y2 when a=1, b=0 and c=1?',
          code:
            'assign y1 = a & b;\nassign y2 = y1 | c;',
          options: ['0', '1', 'x', 'z'],
          answer: '1',
          explanation:
            'Trace the gates: y1 = 1 & 0 = 0, then y2 = 0 | 1 = 1. Both gates evaluate "at once" as standing hardware; the trace order is just how humans read schematics.',
          hint: 'Evaluate the AND, feed it into the OR.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Name the two very different backend processes that can consume the same Verilog source file (one word each, separated by "and").',
          answer: 'simulation and synthesis',
          explanation:
            'A simulator evaluates the described circuit over time to check behavior; a synthesizer compiles the synthesizable subset into a netlist of real gates and flip-flops.',
          hint: 'One checks what the design DOES; the other builds what the design IS.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'HDL', definition: 'Hardware description language — a language whose text describes the structure and behavior of digital hardware.' },
      { term: 'Concurrency', definition: 'The property that all hardware blocks in a design are active simultaneously, reacting to input changes independently.' },
      { term: 'Continuous assignment', definition: 'A Verilog assign statement — a permanent driver/wire relationship, recomputed whenever any right-hand-side signal changes.' },
      { term: 'Elaboration', definition: 'The step where a tool instantiates the full module hierarchy from the source files, resolving ports and parameters.' },
      { term: 'Netlist', definition: 'A list of gates (or cells) and their connections — the output of synthesis.' },
    ],
    revisionSummary: [
      'A Verilog file is a hardware description, not a program: it is consumed by simulators and synthesizers.',
      'C executes in time (one statement at a time); Verilog exists in space (all gates live simultaneously).',
      'Continuous assignments are standing relationships between wires, recomputed on every relevant change — forever.',
      'Sequential-looking code inside initial/always models time (clock edges), and many such blocks run concurrently.',
      'Read every line as hardware: assign = gate/wire, q <= d in a clocked block = D flip-flop, [7:0] = 8-wide bundle.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Hardware description language', url: 'https://en.wikipedia.org/wiki/Hardware_description_language', kind: 'article' },
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'vlog-m01-l2',
    title: 'Simulation vs Synthesis and Levels of Abstraction',
    summary:
      'Separate the two worlds a Verilog file lives in — the simulator and the synthesizer — and learn the abstraction ladder from behavioral models down to gates.',
    objectives: [
      'Define simulation and synthesis and state what each consumes and produces.',
      'Classify Verilog constructs as synthesizable or simulation-only.',
      'Describe behavioral, RTL, gate-level and switch-level abstraction levels.',
      'Write the same small circuit at three different abstraction levels.',
    ],
    whyItMatters:
      'Every professional Verilog engineer lives at the boundary between simulation and synthesis. Code that simulates beautifully but synthesizes into the wrong hardware (or nothing at all) is one of the most expensive mistakes in chip design, because it passes the lab bench and fails in silicon. Knowing exactly which constructs the synthesizer will honor — and at which abstraction level you are writing — is what separates RTL designers from people who merely type Verilog.',
    prerequisites: ['vlog-m01-l1'],
    explanation:
      '**Simulation** means evaluating your described circuit over simulated time. A simulator (such as the Icarus Verilog pair `iverilog` + `vvp`) reads your files, instantiates the hierarchy, and then reacts to stimulus: every time an input changes, it recomputes affected logic and advances simulated time. Simulation answers the question "does this design *behave* correctly?" and lets you print, log and draw waveforms of anything.\n\n**Synthesis** means compiling a *subset* of Verilog into a **netlist** — a concrete list of gates, flip-flops and their connections — targeted at a specific technology (an FPGA family, or an ASIC standard-cell library). Synthesis answers the question "what physical hardware should be built?". Crucially, the synthesizer only understands constructs that have a hardware meaning. Timing directives like `#5`, `initial` blocks, `$display` and file I/O have no circuit equivalent: they are **simulation-only**. A synthesizer ignores or rejects them. Rule of thumb: *if it mentions time, printing, or files, it is simulation-only until proven otherwise*.\n\n### The abstraction ladder\n\nDigital hardware can be described at several levels of detail. At the top sits **behavioral** modeling — algorithms and mathematics with no structural intent ("compute the average of these samples"). In the middle, and the professional working level for FPGA and ASIC design, is **RTL** — register-transfer level — where you describe every clock edge explicitly: which registers capture what, and what combinational logic sits between registers. Below RTL are **gate-level** netlists (actual AND/OR gates and flip-flops, usually produced by synthesis, not written by hand) and **switch-level** models (transistors — beyond this course). The higher you write, the less you say about structure and the more freedom (and risk) you hand the tools; RTL is the sweet spot where you control exactly which registers exist while leaving gate choices to the synthesizer.',
    deepDive:
      '### What "synthesizable" really means\n\nA construct is synthesizable when a tool can map it to hardware with an unambiguous meaning: continuous assignments, `always` blocks with proper structure, `if`/`case`, most operators, module instantiation, `generate` blocks. Constructs with no hardware meaning — delays, `initial` (except special FPGA initialization cases), `$display`, `$finish`, `$random`, `fork/join` — are simulation-only. Some constructs sit in between: a `for` loop with constant bounds unrolls into parallel hardware, but a data-dependent `while` loop cannot be built. Module 15 collects the full trap list.\n\n### Simulation time vs physical time\n\nRTL simulation is *idealized*: an `assign` updates in zero simulated time, and a clock edge applies to all flip-flops at the same instant. Real silicon has propagation delays, so real timing closure is checked by separate static timing analysis after synthesis/place-and-route, not by your RTL testbench. That is why a design can "pass simulation" and still fail timing — the two checks answer different questions.\n\n### One circuit, three descriptions\n\nThe same 2:1 multiplexer can be written behaviorally, at RTL/dataflow, or as an explicit gate netlist. All three *simulate identically* and all three *synthesize to essentially the same mux* — but they demand different amounts of structural intent from you. Writing gate-level by hand is a waste of effort; writing pure behavioral algorithms only works where the synthesizer can infer structure. RTL is where engineers are expected to be explicit.',
    examples: [
      {
        title: 'One 2:1 multiplexer at three abstraction levels',
        language: 'verilog',
        code:
          '// (1) Behavioral / algorithmic flavor: describe the DECISION,\n//     let tools infer structure.\nmodule mux2_behavioral(\n    input  wire a, input wire b, input wire s,\n    output reg   y                 // reg because assigned procedurally\n);\n    always @* begin\n        if (s) y = b;\n        else   y = a;\n    end\nendmodule\n\n// (2) RTL / dataflow flavor: one Boolean equation, one mux.\nmodule mux2_dataflow(\n    input  wire a, input wire b, input wire s,\n    output wire y\n);\n    assign y = s ? b : a;          // conditional operator = 2:1 mux\nendmodule\n\n// (3) Gate-level flavor: exact primitive gates, hand-connected.\nmodule mux2_gates(\n    input  wire a, input wire b, input wire s,\n    output wire y\n);\n    wire s_n, t_a, t_b;            // internal nets\n    not  g1 (s_n, s);              // s_n = NOT s\n    and  g2 (t_a, a, s_n);         // t_a = a AND NOT s\n    and  g3 (t_b, b, s);           // t_b = b AND s\n    or   g4 (y, t_a, t_b);         // y = t_a OR t_b\nendmodule',
        explanation: [
          'Version 1 states the *behavior* (if s choose b else a); the synthesizer infers the multiplexer. Note `output reg` — a procedural target, still pure combinational logic here.',
          'Version 2 states the *dataflow equation*; the conditional operator `?:` is the textbook RTL way to write a 2:1 mux.',
          'Version 3 names every gate and every internal wire — what a synthesis tool would output as a netlist. Nobody writes real designs this way, but reading netlists is a required skill.',
          'All three have identical truth tables: s=0 gives y=a, s=1 gives y=b. All three synthesize to the same hardware in any reasonable tool.',
          '`always @*`, `assign`, and gate primitives are all synthesizable; nothing in this example is simulation-only.',
        ],
      },
      {
        title: 'Synthesizable core with a simulation-only wrapper',
        language: 'verilog',
        code:
          '// ---------- synthesizable design (what the chip gets) ----------\nmodule and_gate(\n    input  wire a,\n    input  wire b,\n    output wire y\n);\n    assign y = a & b;              // synthesizable: an AND gate\nendmodule\n\n// ---------- simulation-only harness (never synthesized) ----------\n`timescale 1ns/1ps\nmodule tb_and_gate;                // testbench: no ports\n    reg a, b;                      // sim-only stimulus registers\n    wire y;\n\n    and_gate dut (.a(a), .b(b), .y(y));   // instance of the design\n\n    initial begin                  // SIM-ONLY: runs once at time 0\n        a = 0; b = 0;\n        #10;                       // SIM-ONLY: wait 10 time units\n        a = 1; b = 1;\n        #10;\n        $display("a=%b b=%b y=%b", a, b, y);  // SIM-ONLY: print\n        $finish;                   // SIM-ONLY: end simulation\n    end\nendmodule',
        explanation: [
          'The top module (`and_gate`) contains only synthesizable content — exactly what a synthesizer would turn into one AND gate.',
          'The bottom module (`tb_and_gate`) is a testbench: it has no ports (it is the "outside world"), and every line in it is simulation-only: the `initial` block, the `#10` delays, `$display` and `$finish`.',
          'This split — clean synthesizable design file, separate sim-only testbench file — is the standard professional layout, and the one this course uses everywhere.',
          'If you fed both files to a synthesizer and told it the top module is `and_gate`, it would simply ignore the testbench file.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Where a Verilog file goes: simulation vs synthesis',
        content:
          '                        +------------------+\n   design.v   --------->|                  |------> waveforms, logs,\n   tb.v       --------->|    SIMULATOR     |       PASS/FAIL verdict\n   (stimulus)           | (iverilog + vvp) |\n                        +------------------+\n\n                        +------------------+\n   design.v   --------->|    SYNTHESIS     |------> gate netlist\n   (RTL only!)          | (Yosys / vendor) |\n                        +------------------+\n                                 |\n                                 v\n                   +---------------------------+\n                   | FPGA: place & route -> bitstream\n                   | ASIC: floorplan, P&R, DRC/LVS -> GDSII\n                   +---------------------------+\n\n   SIM-ONLY constructs (never synthesized):\n     #delay   initial   $display   $monitor   $finish   $random   $readmemh*',
        caption:
          'The testbench feeds the simulator; only the synthesizable design subset feeds synthesis. (*$readmemh is usable for FPGA memory init in some vendor flows — module 12 covers the details.)',
      },
    ],
    tables: [
      {
        caption: 'Abstraction levels for digital hardware',
        headers: ['Level', 'What you describe', 'Typical constructs', 'Who writes it'],
        rows: [
          ['Behavioral', 'Algorithms, transfer functions; no timing/structure intent', 'always blocks with loops/math, complex expressions', 'Designers (for models & verification), high-level synthesis'],
          ['RTL (register-transfer)', 'Every clock edge: registers, and the logic between them', 'always @(posedge clk), assign, if/case', 'Designers — the professional working level'],
          ['Gate level', 'Exact gates/cells and connections', 'and/or/not primitives, netlist modules', 'Synthesis tools; read by humans, rarely written'],
          ['Switch level', 'Transistors and charge storage', 'nmos/pmos primitives', 'Library/SRAM specialists — out of scope here'],
        ],
      },
      {
        caption: 'Synthesizable vs simulation-only quick reference',
        headers: ['Construct', 'Simulator', 'Synthesizer', 'Hardware meaning'],
        rows: [
          ['assign y = expr;', 'Yes', 'Yes', 'Combinational logic driving wire y'],
          ['always @(posedge clk) q <= d;', 'Yes', 'Yes', 'D flip-flop(s)'],
          ['always @* comb block', 'Yes', 'Yes', 'Combinational logic'],
          ['#10 (delay)', 'Yes', 'No', 'None — time has no gate'],
          ['initial block', 'Yes', 'No*', 'None in ASIC; FPGA power-up init is vendor-specific'],
          ['$display / $finish / $random', 'Yes', 'No', 'None — simulator services'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Putting `#5` delays or `$display` inside design RTL "to fix" a simulation problem.',
        fix:
          'Delays and system tasks have no hardware meaning, so synthesis drops or rejects them — your gate-level circuit then behaves differently from the simulation. Keep design files 100 percent synthesizable and confine delays and printing to testbenches.',
      },
      {
        mistake: 'Believing a passing simulation proves the hardware works.',
        fix:
          'RTL simulation is zero-delay and idealized; it proves behavior, not timing. Physical timing is verified by static timing analysis after place-and-route. Both checks are mandatory in real flows.',
      },
      {
        mistake: 'Writing purely behavioral code (loops over time, algorithms) for hardware you intend to build, then wondering why synthesis explodes.',
        fix:
          'For anything you will build, write RTL: explicit registers with clocked processes, explicit combinational dataflow. Use behavioral style only for testbench models and reference checks.',
      },
    ],
    guidedPractice: {
      title: 'Sort the constructs',
      brief:
        'Classify each of the following as synthesizable (S) or simulation-only (M): (a) assign y = a ^ b; (b) #5 a = 1; (c) always @(posedge clk) q <= d; (d) $display("hi"); (e) always @* y = a & b; (f) $finish;',
      expectedBehavior:
        '(a) S, (b) M, (c) S, (d) M, (e) S, (f) M. The S items each map to concrete hardware (an XOR gate, flip-flops, combinational logic); the M items are simulator services (delay scheduling, console output, ending the run).',
      hints: [
        'Ask: could a piece of silicon "do" this statement on its own, without a simulator?',
        'Anything whose entire purpose is to talk to the console, the filesystem or the simulation clock is sim-only.',
      ],
    },
    practiceExercises: [
      {
        title: 'Two descriptions, one truth table',
        brief:
          'Build the truth table of mux2_behavioral and mux2_gates from Example 1 by hand for (a,b,s) = (0,0,0), (0,0,1), (1,0,1), (1,1,0) and confirm all three descriptions agree.',
        expectedBehavior:
          'Rows: (0,0,0)→y=0; (0,0,1)→y=0; (1,0,1)→y=0 (b=0 selected); (1,1,0)→y=1 (a=1 selected). Behavior, dataflow and gate versions agree on every row — they are the same circuit.',
      hints: [
        'For the gate version propagate wire by wire: s_n, then t_a/t_b, then y.',
        'For the behavioral version just apply the if/else decision.',
      ],
      },
      {
        title: 'Spot the non-portable line',
        brief:
          'A colleague’s "synthesizable" counter contains the lines: `#2 cnt <= cnt + 1;` and `$display("cnt=%d", cnt);` inside the clocked always block. Identify each problem and state where those lines belong.',
        expectedBehavior:
          '`#2` and `$display` are simulation-only; a synthesizer will reject or silently drop them, so the synthesized counter differs from the simulated one. Both lines belong in the testbench (or should simply be deleted from the design). The correct clocked body is just `cnt <= cnt + 1;`.',
      hints: [
        'Ask for each line: what gate implements it?',
        'Prints and delays are the simulator’s job, never the silicon’s.',
      ],
      },
    ],
    assessment: {
      title: 'Module 01 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does a synthesis tool consume and produce?',
          options: [
            'Consumes synthesizable RTL, produces a gate-level netlist',
            'Consumes a testbench, produces waveforms',
            'Consumes a netlist, produces RTL',
            'Consumes RTL, produces simulation logs',
          ],
          answer: 'Consumes synthesizable RTL, produces a gate-level netlist',
          explanation:
            'Synthesis compiles RTL into a netlist of technology cells. Waveforms and logs come from simulation, not synthesis.',
          hint: 'Synthesis = compile to gates.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A design that simulates correctly is therefore guaranteed to meet timing in real silicon.',
          answer: 'false',
          explanation:
            'RTL simulation is idealized (zero-delay, perfectly simultaneous clocking). Real propagation delays are checked by static timing analysis after place-and-route — a separate, mandatory step.',
          hint: 'Does the simulator know about wire delays in your FPGA?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Which abstraction level is the professional working level for FPGA/ASIC design, where every clock edge is explicit?',
          options: ['Switch level', 'Gate level', 'RTL (register-transfer level)', 'Transistor schematic'],
          answer: 'RTL (register-transfer level)',
          explanation:
            'RTL describes registers and the logic between them per clock edge — enough structure to control the hardware, without hand-placing gates.',
          hint: 'It is literally named after registers moving data.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'In mux2_dataflow from the lesson (assign y = s ? b : a;), what is y when a=1, b=0, s=1?',
          code: 'assign y = s ? b : a;   // a=1, b=0, s=1',
          options: ['0', '1', 'x', 'z'],
          answer: '0',
          explanation:
            'The conditional operator selects b when s is true: y = b = 0. s=1 chooses the "true" branch (b), not the first-listed operand.',
          hint: 's=1 selects the expression after the question mark.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Simulation', definition: 'Evaluating a hardware description over simulated time to check behavior, using a simulator such as Icarus Verilog.' },
      { term: 'Synthesis', definition: 'Compiling the synthesizable subset of RTL into a netlist of technology-specific gates and flip-flops.' },
      { term: 'Netlist', definition: 'The structural output of synthesis: cells (gates, flip-flops) and their net connections.' },
      { term: 'RTL', definition: 'Register-transfer level: describing design behavior as registers plus the combinational logic transferring data between them each clock.' },
      { term: 'Simulation-only construct', definition: 'A Verilog feature with no hardware meaning (delays, initial, $display, $finish) that synthesizers ignore or reject.' },
    ],
    revisionSummary: [
      'Simulation checks behavior over time; synthesis builds hardware. Same file, different consumers.',
      'Delays (#), initial blocks, $display/$finish/$random are simulation-only; keep them out of design RTL.',
      'Abstraction ladder: behavioral > RTL > gate > switch. RTL is the professional design level.',
      'The same circuit can be written behaviorally, as RTL dataflow, or gate-by-gate — all three can simulate identically.',
      'A passing simulation proves behavior, not timing; timing closure is a separate post-layout check.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Logic synthesis', url: 'https://en.wikipedia.org/wiki/Logic_synthesis', kind: 'article' },
      { label: 'Wikipedia — Register-transfer level', url: 'https://en.wikipedia.org/wiki/Register-transfer_level', kind: 'article' },
      { label: 'Yosys open synthesis suite documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'vlog-m01-l3',
    title: 'The Tool Flow: Icarus Verilog, FPGA and ASIC Flows',
    summary:
      'Run your first real Verilog compilation and simulation with Icarus Verilog, and see how the same RTL travels through FPGA and ASIC tool chains.',
    objectives: [
      'Compile and run a design plus testbench with iverilog and vvp.',
      'Explain the stages of the FPGA flow (synthesis, place and route, bitstream) and the ASIC flow.',
      'Describe exactly how this platform evaluates Verilog challenges.',
      'Predict what a simple deterministic testbench prints, and explain why a #delay is needed before reading outputs.',
    ],
    whyItMatters:
      'Tools are where theory becomes feedback. A designer who can compile, simulate and read a FAIL message in under a minute learns ten times faster than one who waits for someone else to run the code. This lesson gives you the exact open-source workflow (Icarus Verilog) used by this platform’s challenge evaluator, and maps it onto the professional FPGA and ASIC flows so you know where each skill you learn will be used.',
    prerequisites: ['vlog-m01-l1', 'vlog-m01-l2'],
    explanation:
      'The open-source toolchain you will use is **Icarus Verilog**. Its compiler `iverilog` reads your `.v` files, elaborates the module hierarchy (checking names, port connections and widths), and produces a simulation image; the runner `vvp` executes it, printing `$display` output and honoring delays. Waveform dumps can be written to `.vcd` files and viewed in GTKWave. The typical command line is:\n\n```\niverilog -g2001 -o sim.vvp design.v tb_design.v\nvvp sim.vvp\n```\n\nThe `-g2001` flag selects the Verilog-2001 generation — the dialect this course teaches. (By default Icarus is generous and accepts several dialects; being explicit keeps your code portable.)\n\n### Professional flows\n\nIn an **FPGA flow**, your RTL goes through synthesis (Yosys or a vendor suite such as Vivado/Quartus), then place-and-route fits the netlist onto the chip’s lookup tables, flip-flops and routing, then timing analysis proves the clock frequency, and finally a bitstream configures the device. In an **ASIC flow**, the netlist is mapped to a standard-cell library, then floorplanned, placed, routed, checked (DRC/LVS) and taped out as GDSII for fabrication. The RTL you write in this course is the *entry point to both flows* — which is why coding discipline matters from lesson one.\n\n### How this platform evaluates Verilog\n\nWhen you link a challenge on this platform, your code is compiled and run for real with **Icarus Verilog (iverilog + vvp)**, and the harness compares behavior against expected results. That means: write clean Verilog-2001, make testbench-visible outputs complete, and never rely on vendor-specific extensions. The code snippets inside lessons, however, are illustrative explanations — they become *real* simulation the moment you run a linked challenge.',
    deepDive:
      '### What elaboration catches\n\nBetween "compiles" and "simulates correctly" sits elaboration: the tool instantiates your hierarchy and checks that every instance’s ports exist, connect in the right order/name, and have compatible widths (mismatches warn). Elaboration is also when undeclared signals become implicit 1-bit nets — a famous source of silent bugs that module 03’s `default_nettype discussion addresses. Treat elaboration warnings as errors in waiting.\n\n### Why stimulus then #1 then display\n\nIn Example 1 below, the testbench assigns `a = 1; b = 1;` and only *then* waits with `#1` before displaying y. That wait is not cosmetic: when a continuous assignment’s inputs change, the output update is scheduled as a simulation event in the same time step, and a `$display` executed immediately in the same block can run before that update lands — printing the old (or unknown) value. Waiting one delta/time step guarantees the gates have settled. This is your first taste of simulation scheduling, which module 07 develops properly.\n\n### Reading the Icarus output\n\n`vvp` prints exactly what your `$display` statements print, plus any warnings. No output usually means your stimulus never executed (check that the initial block exists and `$finish` is reachable). Warnings about implicit wires or width mismatches deserve immediate attention — they are how real bugs hide.',
    examples: [
      {
        title: 'First end-to-end run: design, testbench, commands',
        language: 'verilog',
        code:
          '// File: and_gate.v  (the design — synthesizable)\nmodule and_gate(\n    input  wire a,\n    input  wire b,\n    output wire y\n);\n    assign y = a & b;\nendmodule\n\n// File: tb_and_gate.v  (the testbench — simulation-only)\n`timescale 1ns/1ps\nmodule tb_and_gate;\n    reg a, b;                          // drive the inputs\n    wire y;                            // observe the output\n\n    and_gate dut (.a(a), .b(b), .y(y));  // named connections\n\n    initial begin\n        a = 1; b = 1;                  // apply input vector\n        #1;                            // let the gates settle\n        $display("a=%b b=%b y=%b", a, b, y);   // print one row\n        $finish;                       // end simulation\n    end\nendmodule',
        explanation: [
          'The design file holds only synthesizable content: one module, one assign, one AND gate.',
          'The testbench has no ports; it declares stimulus registers (a, b), a observation wire (y), and instantiates the DUT with named connections (.port(signal)).',
          'Stimulus runs in one initial block: apply inputs, wait #1 so the continuous assignment updates y, then $display prints the sampled row.',
          'Running `iverilog -g2001 -o sim.vvp and_gate.v tb_and_gate.v` then `vvp sim.vvp` prints exactly: `a=1 b=1 y=1` — one deterministic line, because the inputs are held constant and there is only one display.',
          'Remove the `#1;` and the display may print `y=x`: the assign update is scheduled but has not landed when $display runs in the same time step. This #1-before-inspect pattern is used in every testbench in this course.',
        ],
      },
      {
        title: 'A four-row stimulus sweep (still fully deterministic)',
        language: 'verilog',
        code:
          '`timescale 1ns/1ps\nmodule tb_and_gate_all;\n    reg a, b;\n    wire y;\n\n    and_gate dut (.a(a), .b(b), .y(y));\n\n    initial begin\n        a = 0; b = 0; #1 $display("a=%b b=%b y=%b", a, b, y);\n        a = 0; b = 1; #1 $display("a=%b b=%b y=%b", a, b, y);\n        a = 1; b = 0; #1 $display("a=%b b=%b y=%b", a, b, y);\n        a = 1; b = 1; #1 $display("a=%b b=%b y=%b", a, b, y);\n        $finish;\n    end\nendmodule',
        explanation: [
          'Four stimulus rows, each followed by a one-step wait and a display: the complete truth table of the AND gate.',
          'Expected printed lines, in order: `a=0 b=0 y=0`, `a=0 b=1 y=0`, `a=1 b=0 y=0`, `a=1 b=1 y=1`. Each is deterministic: inputs are constant during each wait, so y is stable when displayed.',
          'This "apply, wait, check" rhythm is the skeleton of every testbench you will write; module 14 upgrades it to self-checking loops instead of four hand-written rows.',
          'The delay after each stimulus row is what makes the expected output trustworthy — without it, printed values could lag the inputs.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Your code through the flows',
        content:
          '        YOU (this course)                 PROFESSIONAL FPGA FLOW           PROFESSIONAL ASIC FLOW\n\n   design.v  tb.v                RTL (.v)  -----------------> RTL (.v)\n      |         |                    |                            |\n      v         v                    v                            v\n   +--------------+           +-------------+              +-------------+\n   | iverilog     |           | synthesis   |              | synthesis   |\n   | (elaborate + |           | (Yosys/     |              | (std-cell   |\n   |  compile)    |           |  Vivado)    |              |  mapping)   |\n   +--------------+           +-------------+              +-------------+\n      |                              |                            |\n      v                              v                            v\n   +--------------+           place & route                floorplan, place & route\n   | vvp          |           timing analysis               DRC / LVS checks\n   | (simulate)   |           bitstream -> FPGA               GDSII -> tapeout\n   +--------------+\n   PASS/FAIL + logs',
        caption:
          'Icarus Verilog is the fast feedback loop you use while writing RTL; FPGA and ASIC flows are where the same RTL eventually becomes hardware.',
      },
    ],
    tables: [
      {
        caption: 'Icarus Verilog quick commands',
        headers: ['Command', 'Purpose'],
        rows: [
          ['iverilog -g2001 -o sim.vvp design.v tb.v', 'Compile design + testbench into simulation image sim.vvp'],
          ['vvp sim.vvp', 'Run the simulation; prints $display output'],
          ['vvp sim.vvp +vcd', 'Run (if TB supports it) writing a VCD waveform file'],
          ['$dumpfile("sim.vcd"); $dumpvars(0, tb);', 'TB statements that record all signals to a VCD for GTKWave'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Forgetting to pass all source files to iverilog (design and testbench).',
        fix:
          'iverilog only knows the files you name on the command line. Compile with every needed file: `iverilog -g2001 -o sim.vvp and_gate.v tb_and_gate.v`. A missing design file shows up as "unknown module" errors during elaboration.',
      },
      {
        mistake: 'Displaying outputs immediately after assigning inputs, with no wait, and trusting the printed value.',
        fix:
          'Insert `#1;` (or any delay) between stimulus and inspection. Continuous-assignment updates are scheduled events in the same time step; an immediate $display can observe the old value. Every testbench in this course waits before checking.',
      },
      {
        mistake: 'Assuming vendor-specific extensions or SV-only constructs will work on the platform evaluator.',
        fix:
          'The platform runs Icarus Verilog on standard Verilog-2001. Stick to the dialect taught here: explicit wire/reg types, Verilog-2001 signed arithmetic, no vendor pragmas, no SystemVerilog features unless a lesson explicitly marks them.',
      },
    ],
    guidedPractice: {
      title: 'Predict the console output',
      brief:
        'For the four-row testbench in Example 2, write down the four lines that vvp prints, before running anything. Then check your reasoning against the AND truth table.',
      expectedBehavior:
        'The exact lines are: a=0 b=0 y=0 / a=0 b=1 y=0 / a=1 b=0 y=0 / a=1 b=1 y=1. Each row: y = a AND b, displayed after the inputs have been stable for one time step.',
      hints: [
        'Take each stimulus row in order; only y=1 when both inputs are 1.',
        'The %b format prints one character per bit.',
      ],
    },
    practiceExercises: [
      {
        title: 'Modify the sweep for OR',
        brief:
          'Change both files so the design computes y = a | b, and state the four printed lines without running the simulator.',
        expectedBehavior:
          'Lines: a=0 b=0 y=0 / a=0 b=1 y=1 / a=1 b=0 y=1 / a=1 b=1 y=1. Only the design equation changed; the testbench rhythm is untouched.',
      hints: [
        'Swap the & operator for | in the assign only.',
        'OR outputs 1 when at least one input is 1.',
      ],
      },
      {
        title: 'Break it on purpose',
        brief:
          'Predict what happens if you (1) delete the #1 delay before each $display, and (2) misspell the instance connection .y(y) as .yy(y). Explain each symptom.',
        expectedBehavior:
          '(1) The printed y may still show the previous value (or x at the very first row) because the assign update is scheduled but not yet applied when $display runs — a classic scheduling race. (2) Elaboration fails with a port-not-found error: named connections must match declared port names exactly.',
      hints: [
        'Think about what is scheduled versus what has already happened in the same time step (full story in module 07).',
        'Named connections are checked strictly at elaboration.',
      ],
      },
    ],
    assessment: {
      title: 'Module 01 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which pair of commands compiles and then runs a Verilog simulation with Icarus Verilog?',
          options: [
            'iverilog -g2001 -o sim.vvp design.v tb.v, then vvp sim.vvp',
            'gcc design.v tb.v, then ./a.out',
            'vvp design.v tb.v, then iverilog sim.vvp',
            'iverilog sim.vvp, then vvp -o design.v',
          ],
          answer: 'iverilog -g2001 -o sim.vvp design.v tb.v, then vvp sim.vvp',
          explanation:
            'iverilog compiles all listed sources into a simulation image; vvp executes that image. GCC is for C, and the other orderings do not exist.',
          hint: 'Compile first, run second — like any toolchain.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'When you link a challenge on this platform, your Verilog is executed by a real simulator (Icarus Verilog), not just reviewed by a human.',
          answer: 'true',
          explanation:
            'The platform evaluator runs iverilog + vvp on linked challenges and checks behavior. In-lesson snippets are illustrative, but linked challenges get genuine simulation.',
          hint: 'That is why clean Verilog-2001 matters.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'For the testbench in Example 1, what line does vvp print?',
          code:
            'initial begin\n    a = 1; b = 1;\n    #1;\n    $display("a=%b b=%b y=%b", a, b, y);\n    $finish;\nend',
          options: ['a=1 b=1 y=1', 'a=1 b=1 y=x', 'a=0 b=0 y=0', 'nothing — $finish runs first'],
          answer: 'a=1 b=1 y=1',
          explanation:
            'Inputs are applied, one time step passes (the assign settles y = 1 & 1 = 1), then the display runs. Deterministic: constant inputs and a single display.',
          hint: 'The #1 lets the AND gate settle before the print.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In the FPGA flow, name the stage that comes immediately after synthesis and fits the netlist onto the chip’s logic and routing resources (two words).',
          answer: 'place and route',
          explanation:
            'Synthesis produces the netlist; place-and-route assigns it to physical LUTs, flip-flops and routing; timing analysis and bitstream generation follow.',
          hint: 'It literally positions and wires the cells.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'iverilog', definition: 'The Icarus Verilog compiler: elaborates and compiles Verilog sources into a simulation image.' },
      { term: 'vvp', definition: 'The Icarus Verilog runtime that executes the compiled simulation and prints/display results.' },
      { term: 'VCD', definition: 'Value change dump — a standard waveform file ($dumpfile/$dumpvars) viewable in tools like GTKWave.' },
      { term: 'Bitstream', definition: 'The configuration file that programs an FPGA’s logic and routing after place-and-route.' },
      { term: 'Tapeout', definition: 'The final ASIC design hand-off (GDSII) sent for fabrication.' },
    ],
    revisionSummary: [
      'iverilog compiles (design.v + tb.v) into sim.vvp; vvp runs it. -g2001 selects the course dialect.',
      'Elaboration checks hierarchy, port names and widths; heed its warnings about implicit nets and widths.',
      'FPGA flow: RTL → synthesis → place & route → timing → bitstream. ASIC flow adds standard cells, DRC/LVS, tapeout.',
      'This platform runs linked challenges on real Icarus Verilog; in-lesson snippets are illustrative unless you run a linked challenge.',
      'Always wait (e.g. #1) after applying stimulus before displaying outputs — otherwise prints can show stale or x values.',
    ],
    furtherReading: [
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
      { label: 'Wikipedia — Field-programmable gate array', url: 'https://en.wikipedia.org/wiki/Field-programmable_gate_array', kind: 'article' },
      { label: 'Wikipedia — Electronic design automation', url: 'https://en.wikipedia.org/wiki/Electronic_design_automation', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
];
