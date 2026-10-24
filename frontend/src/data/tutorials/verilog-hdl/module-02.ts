import type { TutorialLesson } from '../types';

// Module 02 — Module Structure
export const module02Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m02-l1',
    title: 'Anatomy of a Module',
    summary:
      'Dissect the smallest useful Verilog module keyword by keyword, and learn the formatting conventions this course uses everywhere.',
    objectives: [
      'Name and explain every keyword in a minimal module declaration.',
      'Write a complete combinational module with ports, an assign, and endmodule.',
      'Read a truth table alongside the code that implements it.',
      'Apply this course’s formatting and commenting conventions to your own modules.',
    ],
    whyItMatters:
      'The module is the fundamental unit of Verilog — every design and every testbench is one. Understanding each keyword precisely matters because synthesis tools treat these words as hardware contracts: `input wire` is a promise about direction and connectivity, `assign` is a promise about combinational logic, `endmodule` closes a physical boundary. Master one module completely and every larger design is just modules wired to modules.',
    prerequisites: ['vlog-m01-l1'],
    explanation:
      'Everything in Verilog lives inside a **module**: a named, self-contained unit with a boundary of **ports** through which signals enter and leave. A module is the hardware analog of a chip package: pins (ports) on the outside, a circuit inside. Here is the smallest useful design — a two-input AND gate — annotated:\n\n```\nmodule and_gate(                  // 1. keyword "module" + the module NAME\n    input  wire a,                // 2. port: direction=input, type=wire, name=a\n    input  wire b,                //    (each port is a separate declaration)\n    output wire y                 // 3. output port: this module drives it\n);\n    assign y = a & b;             // 4. continuous assignment: an AND gate\n\nendmodule                        // 5. keyword "endmodule" closes the module\n```\n\nEvery piece has a precise meaning. `module` begins a design unit and gives it the name other files reference when instantiating it. The **port list** declares the boundary: each entry states a direction (`input` = driven from outside, read inside; `output` = driven inside, read outside), a type (`wire` = a net continuously driven by something), and a name. The semicolon after the port list ends the declaration section. The **body** contains the hardware description — here one `assign`, a continuous assignment that permanently drives `y` with the AND of `a` and `b`. `endmodule` closes the unit; nothing may appear outside a module.\n\n### The AND gate’s complete specification\n\nBecause `y = a & b` is combinational, its entire behavior fits a four-row truth table — and that table *is* the contract your code must satisfy. Tracing it row by row (exactly what a simulator or a piece of silicon does) is the verification habit used in every lesson of this course.',
    deepDive:
      '### The semicolon map\n\nVerilog punctuation is unforgiving and worth stating precisely. The port list ends with a semicolon after the closing parenthesis: `... output wire y);`. Ports inside the list are comma-separated. Each body statement (`assign ...;`) ends with its own semicolon. `endmodule` takes NO semicolon. Forgetting the port-list semicolon, or adding one after `endmodule`, are the two most common first-day syntax errors.\n\n### Why write `wire` explicitly?\n\nOld-style Verilog lets you write `input a` and quietly makes `a` a 1-bit wire. This course always writes `input wire a` / `output reg q` explicitly, for two reasons. First, implicit nets silently become 1-bit wide even when you connect an 8-bit signal — a classic width bug that explicit types expose immediately. Second, explicit types force you to *decide* whether an output is a net (combinational, `wire`) or a procedural target (`reg`) — exactly the decision that sets your coding style. (You can enforce this with `` `default_nettype none `` — a compiler directive discussed in module 03.)\n\n### One module per file (by convention)\n\nTools do not require it, but the universal convention is one module per file, named after the module: `and_gate.v` contains `module and_gate`, `tb_and_gate.v` contains the testbench. This keeps tool command lines predictable (`iverilog -g2001 -o sim.vvp and_gate.v tb_and_gate.v`) and makes code review and reuse dramatically easier.',
    examples: [
      {
        title: 'The complete AND gate, with matching truth table',
        language: 'verilog',
        code:
          '// and_gate.v — two-input AND gate\n// Convention: module name matches file name.\nmodule and_gate(\n    input  wire a,     // 1-bit input port, driven from outside\n    input  wire b,     // 1-bit input port\n    output wire y      // 1-bit output port, driven by this module\n);\n    // Continuous assignment: y is PERMANENTLY (a AND b).\n    // Combinational logic — no clock, no memory.\n    assign y = a & b;\n\nendmodule',
        explanation: [
          '`module and_gate(` — declares the design unit; the name is how testbenches and other modules reference it.',
          '`input wire a` / `input wire b` — inputs are nets driven by the *caller*; inside this module they are read-only.',
          '`output wire y` — this module drives y; `wire` because a continuous driver (assign) will feed it.',
          '`assign y = a & b;` — one AND gate, alive for the whole simulation / forever in silicon. `&` is the bitwise AND operator (module 04).',
          '`endmodule` — mandatory, no semicolon.',
        ],
      },
      {
        title: 'A three-gate module showing multiple outputs',
        language: 'verilog',
        code:
          '// gates3.v — three independent outputs from two inputs\nmodule gates3(\n    input  wire a,\n    input  wire b,\n    output wire y_and,   // a AND b\n    output wire y_or,    // a OR  b\n    output wire y_xor    // a XOR b\n);\n    assign y_and = a & b;    // AND gate\n    assign y_or  = a | b;    // OR gate\n    assign y_xor = a ^ b;    // XOR gate\n\nendmodule',
        explanation: [
          'One module may declare any number of ports: two inputs feed three separate continuous assignments.',
          'The three assigns are three separate, concurrent gates — the file order among them is irrelevant.',
          'Each output is driven by exactly one assign; driving one wire twice would be a multiple-driver error (module 15).',
          'Trace check with (a,b) = (1,0): y_and = 0, y_or = 1, y_xor = 1 — matching the truth table below.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'A module is a chip package: ports and internals',
        content:
          '              and_gate (module boundary)\n         +----------------------------+\n   a --->| a                 +------+ |\n         |                   |      | |\n         |          internal | AND  |--|--> y\n   b --->| b          wire   | gate | |\n         |            +------+      | |\n         |            |             |\n         |        "assign y = a & b" |\n         +----------------------------+\n\n   ports = pins on the package (input: enter only; output: leave only)\n   body  = circuit inside the package',
        caption:
          'The port list is the package pin-out; the body is the die inside. Callers see only pins.',
      },
    ],
    tables: [
      {
        caption: 'Two-input AND gate truth table (the contract of and_gate)',
        headers: ['a', 'b', 'y = a & b'],
        rows: [
          ['0', '0', '0'],
          ['0', '1', '0'],
          ['1', '0', '0'],
          ['1', '1', '1'],
        ],
      },
      {
        caption: 'Truth table of gates3',
        headers: ['a', 'b', 'y_and', 'y_or', 'y_xor'],
        rows: [
          ['0', '0', '0', '0', '0'],
          ['0', '1', '0', '1', '1'],
          ['1', '0', '0', '1', '1'],
          ['1', '1', '1', '1', '0'],
        ],
      },
      {
        caption: 'Punctuation rules for a module',
        headers: ['Location', 'Punctuation', 'Notes'],
        rows: [
          ['End of port list', ');', 'Semicolon after the closing parenthesis'],
          ['Between ports', ',', 'Comma-separated; a trailing comma before ) is an error'],
          ['After each assign/statement', ';', 'Required'],
          ['After endmodule', 'none', 'endmodule takes no semicolon'],
          ['Comments', '// to end of line', 'Also /* block */; code must remain valid with comments removed'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Omitting the semicolon after the port list (writing `output wire y)` then starting the body).',
        fix:
          'The declaration section ends with `);` — closing parenthesis then semicolon. Body statements each carry their own semicolons.',
      },
      {
        mistake: 'Adding a semicolon after `endmodule;` or forgetting `endmodule` entirely.',
        fix:
          '`endmodule` is a bare keyword with no punctuation. If it is missing, the next module declaration becomes a syntax error far from the real mistake — check module boundaries first when errors point at "unexpected module".',
      },
      {
        mistake: 'Declaring an output port but never driving it.',
        fix:
          'An undriven output gives `z` in simulation and a constant (or floating) net in synthesis. Every declared port must be driven by an assign, an always block, or an instance connection.',
      },
    ],
    guidedPractice: {
      title: 'Write your first module from a spec',
      brief:
        'Write a module named `or_gate` with inputs `a`, `b` and output `y` computing a OR b, in the exact style of and_gate (explicit wire types, one assign, a comment, endmodule). Then state its full truth table.',
      expectedBehavior:
        'module or_gate(input wire a, input wire b, output wire y); assign y = a | b; endmodule — truth table: (0,0)→0, (0,1)→1, (1,0)→1, (1,1)→1. Only the operator and name changed from the AND version.',
      hints: [
        'Copy the and_gate skeleton; change the name and swap & for |.',
        'OR outputs 1 in every row except (0,0).',
      ],
      challengeId: 'ece-07-or-gate',
    },
    practiceExercises: [
      {
        title: 'NOT gate as a one-input module',
        brief:
          'Write module `not_gate` with `input wire a` and `output wire y` computing the inversion, then give its two-row truth table and confirm row (a=1) gives y=0.',
        expectedBehavior:
          'module not_gate(input wire a, output wire y); assign y = ~a; endmodule — table: a=0 → y=1; a=1 → y=0. The ~ operator is bitwise NOT (module 04); on a 1-bit wire it is a plain inverter.',
        hints: [
          'A port list may contain just one input and one output.',
          'The bitwise negation operator is the tilde ~.',
        ],
        challengeId: 'ece-05-not-gate',
      },
      {
        title: 'Read and repair',
        brief:
          'This module has three syntax errors. Find them: `module nand2 (input wire a input wire b, output wire y)  assign y = ~(a & b) endmodule`',
        expectedBehavior:
          'Errors: (1) missing comma between the two input ports; (2) missing semicolon after the port list parenthesis; (3) missing semicolon after the assign. Corrected: module nand2(input wire a, input wire b, output wire y); assign y = ~(a & b); endmodule',
        hints: [
          'Compare punctuation token by token against the and_gate skeleton.',
          'NAND = NOT(AND): the ~ wraps the whole parenthesized AND.',
        ],
        challengeId: 'ece-06-and-gate',
      },
    ],
    assessment: {
      title: 'Module 02 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does the port declaration `output wire y` promise?',
          options: [
            'y is driven by logic inside this module and is a net (continuously driven)',
            'y is an input that other modules may drive',
            'y must be assigned inside an always block',
            'y is 8 bits wide by default',
          ],
          answer: 'y is driven by logic inside this module and is a net (continuously driven)',
          explanation:
            'output = direction (driven internally); wire = a net suited to continuous drivers like assign. A procedurally assigned output would be `output reg`.',
          hint: 'Direction first, then type.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'In the module and_gate, the assign statement executes once when simulation starts and then stops.',
          answer: 'false',
          explanation:
            'An assign is a standing gate: it holds y = a & b forever, re-evaluating whenever a or b changes. Combinational hardware never "stops".',
          hint: 'Recall lesson m01-l1: hardware never stops running.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'Using gates3 from Example 2, what are y_or and y_xor when a=0 and b=1?',
          code:
            'assign y_or  = a | b;\nassign y_xor = a ^ b;   // a=0, b=1',
          options: ['y_or=1, y_xor=1', 'y_or=0, y_xor=1', 'y_or=1, y_xor=0', 'y_or=0, y_xor=0'],
          answer: 'y_or=1, y_xor=1',
          explanation:
            'OR: 0|1 = 1. XOR: inputs differ (0 vs 1), so the difference detector fires: 0^1 = 1.',
          hint: 'XOR is 1 exactly when the inputs differ.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Which line is syntactically correct as the close of a module?',
          options: ['endmodule;', 'endmodule', 'end module', '};'],
          answer: 'endmodule',
          explanation:
            'endmodule is a bare keyword: no semicolon, no space, no braces.',
          hint: 'Only statements inside the body take semicolons.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'What single operator (one character) does the assign in and_gate use to build the AND function?',
          answer: '&',
          explanation:
            'The bitwise AND operator & combines the two 1-bit inputs; on 1-bit wires it is exactly the AND gate.',
          hint: 'The same symbol C uses for bitwise AND.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Module', definition: 'The fundamental Verilog design unit: a named boundary of ports containing a hardware description.' },
      { term: 'Port', definition: 'A named connection point on a module boundary with a direction (input/output/inout) and a type/width.' },
      { term: 'Continuous assignment', definition: 'An assign statement: a permanent combinational driver for a wire, active for the whole simulation.' },
      { term: 'endmodule', definition: 'The keyword that closes a module declaration; takes no semicolon.' },
      { term: 'Elaboration', definition: 'The tool step that instantiates the hierarchy, checking port names, directions and widths.' },
    ],
    revisionSummary: [
      'Every design and testbench is a module: name + port list + body + endmodule.',
      'Ports declare direction and type; this course always writes input wire / output reg explicitly.',
      'One assign per relationship; each assign is a concurrent, permanent piece of combinational hardware.',
      'Punctuation: `);` closes the port list, every statement ends with ;, endmodule takes none.',
      'One module per file, file named after the module, testbenches in their own files.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'vlog-m02-l2',
    title: 'Ports: Directions and Widths',
    summary:
      'Master input, output and inout ports, single bits and buses, and the width-matching rules that keep connections honest.',
    objectives: [
      'Declare ports of all three directions and explain when inout is appropriate.',
      'Declare vector (bus) ports and connect them width-correctly.',
      'Choose between output wire and output reg correctly.',
      'Predict what happens when port widths do not match.',
    ],
    whyItMatters:
      'Ports are the only way data enters or leaves a module, so port discipline is interface discipline. Real bugs cluster exactly here: an 8-bit signal connected to a 1-bit port truncates silently, an input accidentally driven creates contention, and an inout used as a quick fix creates tri-state chaos. Clean port declarations are also self-documenting — a reviewer should understand a module’s interface from its port list alone.',
    prerequisites: ['vlog-m02-l1'],
    explanation:
      'Every port has three attributes: **direction**, **type** and **width**. The direction is one of:\n\n- **input** — driven by the caller, read-only inside the module. Connecting an assign (or always block) to drive an input is an error: contention.\n- **output** — driven inside the module, readable by the caller. Outputs may *also* be read inside the module in Verilog (unlike VHDL) — for example `assign echo = y;` after `output wire y` is legal.\n- **inout** — bidirectional, used for true tri-state buses where drivers take turns. inout ports must be nets (`wire`), and a module can drive them only with tri-state drivers (`assign bus = enable ? data : 1\'bz;`). Modern FPGA and ASIC design avoids internal tri-states — use inout only at chip boundaries (I2C pins, memory data buses) if at all.\n\nThe type distinguishes nets from variables: ports driven by `assign` or by other instances are `wire`; ports assigned inside `always` blocks must be declared `reg` (module 06 explains exactly why — and why `reg` does *not* imply a physical register). The width defaults to one bit; a bus is declared with a range **inside the port declaration**:\n\n```\nmodule byte_swap(\n    input  wire [7:0] din,    // 8-bit input bus, MSB = din[7]\n    output wire [7:0] dout    // 8-bit output bus\n);\n    assign dout = {din[3:0], din[7:4]};  // swap nibbles\nendmodule\n```\n\nWidths matter at every connection. When you connect a signal to a port of different width, the connection is padded or truncated to the *port’s* declared width: extra high bits are dropped, missing high bits are zero-filled. The tools usually warn — but warnings are easy to miss in a large build, so the professional habit is to make every width explicit and deliberate.',
    deepDive:
      '### Old-style and ANSI-style port lists\n\nVerilog-1995 separated ports from declarations: `module m(a, y); input a; output y; assign ...`. Verilog-2001 merged them into the **ANSI-style** list this course uses: `module m(input wire a, output wire y);`. ANSI style is preferred because direction, type and width sit in one place — one glance tells you the whole interface. Never mix styles in one module.\n\n### Reading an 8-bit port: din[7] is the MSB\n\nWith `input wire [7:0] din`, element 7 is the left-most (most significant) bit of the bus by convention. Reversing the range (`[0:7]`) is legal but makes the bit order "little-endian" and confuses every reader (and often the author); this course always uses `[N-1:0]`. A useful invariant: if a bus carries the number 5, then din[2:0] = 3\'b101 and din[7:3] = 5\'b00000.\n\n### Output reg vs output wire — decide by the driver\n\nThe rule that never fails: look at what drives the port. Continuous assignment (`assign`) or a submodule output → `output wire`. Procedural assignment inside `always` → `output reg`. Mixing both drivers for one port is illegal. Example: a mux written as `always @*` needs `output reg y`; the same mux written as `assign y = s ? b : a;` needs `output wire y`. Same hardware, different declaration — the port type documents the coding style, not the physical structure.',
    examples: [
      {
        title: 'Bus ports: an 8-bit registered-style interface (combinational)',
        language: 'verilog',
        code:
          '// byte_mask.v — mask an 8-bit bus under control of a single-bit enable\nmodule byte_mask(\n    input  wire [7:0] din,     // 8-bit data input\n    input  wire       en,      // 1-bit enable\n    output wire [7:0] dout     // 8-bit data output\n);\n    // When en=1 pass din through; when en=0 force all zeros.\n    // 8\'h00 is an 8-bit literal — width-matched on purpose (module 03).\n    assign dout = en ? din : 8\'h00;\n\nendmodule',
        explanation: [
          '`[7:0]` on a port declares an 8-bit bus; bit 7 is the MSB by this course’s convention.',
          '`en` is deliberately declared without a range: it is one bit wide. Mixing bus and scalar ports in one list is normal.',
          'The ternary selects between two width-matched 8-bit operands, so dout is 8 bits with no padding surprises.',
          'Trace: din=8\'b1010_1010, en=1 → dout=8\'b1010_1010. din unchanged, en=0 → dout=8\'b0000_0000.',
        ],
      },
      {
        title: 'inout done correctly: a tri-state pin (and why it stays at the top level)',
        language: 'verilog',
        code:
          '// gpio_pin.v — bidirectional pin with tri-state driver\n// NOTE: tri-state modeling is for chip-boundary pins / top level.\nmodule gpio_pin(\n    input  wire       drive_en,   // when 1, this chip drives the pin\n    input  wire       out_val,    // value to drive\n    inout  wire       pad,        // the physical bidirectional pin\n    output wire       in_val      // always reads the pad\n);\n    // Tri-state driver: drive the pad, or release it to high-impedance.\n    assign pad    = drive_en ? out_val : 1\'bz;\n    // The pad can be read at any time (by us or by the other chip).\n    assign in_val = pad;\n\nendmodule',
        explanation: [
          '`inout wire pad` — a bidirectional net. It must be a `wire`; you cannot make an inout a reg.',
          'The only legal way to "not drive" a net is the high-impedance value `1\'bz`: when drive_en=0 the module releases the pad so another device may drive it.',
          'Reading a tri-state net (`assign in_val = pad;`) always works — the net carries whatever the winning driver put on it.',
          'Why not use inout everywhere? Real FPGAs/ASICs have tri-state drivers only in I/O rings; internal tri-state buses do not synthesize to clean hardware. Use muxes for internal "who owns the bus" decisions (module 08).',
          'Trace: drive_en=1, out_val=1, external chip released → pad=1, in_val=1. drive_en=0 → pad is z unless someone else drives it.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Port directions viewed from inside the module',
        content:
          '                  (inside byte_mask)\n             +-----------------------------+\n   din[7:0] -->[ 8-bit input: read only  ]\n             |                             |\n        en  -->[ 1-bit input: read only   ]\n             |                             |\n             |   "assign dout = en ? din"  |\n             |                             |\n             +--[ 8-bit output: driven here ]--> dout[7:0]\n             +-----------------------------+\n\n   inout (tri-state case):\n   pad <====== both directions, one driver at a time (z releases the wire)',
        caption:
          'Inputs flow in and are read; outputs are driven and may also be read internally; inout needs tri-state z to yield the wire.',
      },
    ],
    tables: [
      {
        caption: 'Port direction rules',
        headers: ['Direction', 'Driven by', 'Usual type', 'Notes'],
        rows: [
          ['input', 'Caller (outside)', 'wire', 'Never drive it from inside the module'],
          ['output', 'This module', 'wire (assign) or reg (always)', 'May also be read inside the module'],
          ['inout', 'Whoever wins the bus', 'wire only', 'Tri-state z to release; keep at chip top level'],
        ],
      },
      {
        caption: 'Width mismatch: connecting a 4-bit signal sig to a port of width W',
        headers: ['Port width W', 'What the connection becomes', 'Example (sig=4\'b1011)'],
        rows: [
          ['4 bits', 'Exact match, all four bits', 'port = 1011'],
          ['Wider (e.g. 6)', 'Zero-extended on the left', 'port = 001011'],
          ['Narrower (e.g. 2)', 'Truncated: high bits dropped', 'port = 11 (bits 1:0)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Declaring a bus port without a range: `input wire data` then connecting an 8-bit signal.',
        fix:
          'A range-less port is 1 bit; the upper 7 bits are silently truncated on connection. Write `input wire [7:0] data` and keep widths matched everywhere. Enable `` `default_nettype none `` so implicit 1-bit nets become errors.',
      },
      {
        mistake: 'Assigning to an input port from inside the module to "override" the caller.',
        fix:
          'Inputs are read-only inside the module — two drivers on one net is contention (both fight; in simulation the result is x). If you need a defaulted value, copy the input to an internal wire with an assign and drive the internal wire.',
      },
      {
        mistake: 'Using inout as a general "either direction" port inside a design.',
        fix:
          'inout implies tri-state drivers, which only exist at chip I/O. For internal bidirectional data movement, use a mux: `assign data_out = we ? data_in : 8\'hzz;` is NOT a fix — restructure with two unidirectional buses and an enable instead.',
      },
    ],
    guidedPractice: {
      title: 'Declare the interface first',
      brief:
        'A 4-bit ALU slice needs: two 4-bit data inputs a and b, a 2-bit opcode input op, and one 4-bit result output plus one 1-bit carry-out flag output. Write only the module header (module name, full port list, closing `);`) — no body yet. Then annotate each port with its direction and width.',
      expectedBehavior:
        'module alu4(input wire [3:0] a, input wire [3:0] b, input wire [1:0] op, output wire [3:0] result, output wire carry); — five ports: two 4-bit inputs, one 2-bit input, one 4-bit output, one 1-bit output. Nothing here decides combinational vs clocked yet; that is the body’s job.',
      hints: [
        'Group data ports by width; flags are 1-bit and need no range.',
        'Choose wire for now: this will be written with assign statements in module 05.',
      ],
    },
    practiceExercises: [
      {
        title: 'Width mismatch trace',
        brief:
          'A module declares `output wire [3:0] y` and the caller connects a 6-bit signal `t = 6\'b101101` to it. What value does the caller observe on the connection, and what would change if the port were `[5:0]`?',
        expectedBehavior:
          'With the 4-bit port the connection truncates to the low four bits: the caller sees 4\'b1101 (the two high bits 10 are dropped). With a matching [5:0] port the full 6\'b101101 arrives. The padding/truncation happens at the connection, sized by the port declaration.',
        hints: [
          'Padding/truncation keeps the RIGHT-hand (least significant) bits.',
          'The port width, not the signal width, wins.',
        ],
      },
      {
        title: 'Pick the port type',
        brief:
          'Three outputs: (1) y assigned only by `assign y = a ^ b;`; (2) q assigned only inside `always @(posedge clk)`; (3) bus connected straight to a submodule instance’s output port. Give the exact declaration for each.',
        expectedBehavior:
          '(1) `output wire y` — continuous driver. (2) `output reg q` — procedural target; in a clocked block this really is a register. (3) `output wire` — the instance drives it like a continuous driver. Driver type decides port type, every time.',
        hints: [
          'assign or instance output → wire; always-block assignment → reg.',
          'reg in a clocked block becomes flip-flops in module 09 — but reg in a combinational block does not (module 03).',
        ],
      },
    ],
    assessment: {
      title: 'Module 02 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which declaration correctly creates an 8-bit input bus named din?',
          options: ['input wire [7:0] din', 'input wire din[7:0]', 'input [7] wire din', 'input wire 8 din'],
          answer: 'input wire [7:0] din',
          explanation:
            'The range precedes the name and belongs inside the port declaration: `input wire [7:0] din`. Ranges do not trail the identifier, and widths are not written as plain numbers.',
          hint: 'Range comes right after the type keyword.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'In Verilog, a module may read the value of its own output port.',
          answer: 'true',
          explanation:
            'Unlike VHDL, Verilog outputs can be read internally: `assign y2 = y1 & en;` with `output wire y1` is legal. (It is still often clearer to use an internal wire.)',
          hint: 'VHDL restricts this; Verilog does not.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'A caller connects 6\'b101101 to a port declared `input wire [3:0] din`. What does din hold inside the module?',
          code: 'input wire [3:0] din;   // caller drives din = 6\'b101101',
          options: ['4\'b1101', '4\'b1011', '4\'b0000', '4\'bxxxx'],
          answer: '4\'b1101',
          explanation:
            'The 6-bit value is truncated to the port’s 4-bit width, keeping the least-significant bits: 1101. Width mismatches pad or truncate at the connection.',
          hint: 'Right-aligned: low bits survive, high bits drop.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'An output is assigned ONLY inside `always @* begin y = a & b; end`. Correct declaration?',
          options: ['output wire y', 'output reg y', 'output logic y (Verilog-2001)', 'inout wire y'],
          answer: 'output reg y',
          explanation:
            'Procedural assignment targets must be variables: `output reg y`. It is still pure combinational hardware — reg does not imply a register here (module 03). `logic` is SystemVerilog, out of scope for now.',
          hint: 'always-block targets are reg.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'What value (Verilog literal, one token) must a tri-state driver assign to release an inout pad?',
          answer: "1'bz",
          explanation:
            'High impedance z releases the net so another driver can take it. It is the only way to "not drive" a net.',
          hint: 'The four values are 0, 1, x and z — you want the high-impedance one.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Port direction', definition: 'input (driven externally), output (driven internally), or inout (bidirectional tri-state).' },
      { term: 'Bus port', definition: 'A port declared with a range such as [7:0], carrying multiple bits as one bundle.' },
      { term: 'Truncation', definition: 'Dropping high bits when a wider signal connects to a narrower port; padding adds zeros (or sign bits) the other way.' },
      { term: 'High impedance (z)', definition: 'The value a driver assigns to release a net; used with inout/tri-state pins.' },
      { term: 'ANSI-style port list', definition: 'Verilog-2001 style where direction, type and width are declared inside the port list itself.' },
    ],
    revisionSummary: [
      'Three directions: input (read-only inside), output (driven inside, also readable), inout (tri-state, top level only).',
      'Widths: default 1 bit; declare buses as [N-1:0]; mismatches pad/truncate at the connection with the port width winning.',
      'output wire for assign/instance-driven ports; output reg for always-driven ports. The driver decides.',
      'This course uses [N-1:0] (MSB = bit N-1) and ANSI-style port lists exclusively.',
      'Internal tri-state buses do not synthesize; use muxes inside chips and keep inout for real pins.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
      { label: 'All About Circuits — Digital textbook', url: 'https://www.allaboutcircuits.com/textbook/digital/', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'vlog-m02-l3',
    title: 'Instantiation and Hierarchical Design',
    summary:
      'Build big circuits out of small ones: instantiate modules, choose named vs positional connections, and wire two half adders into a full adder.',
    objectives: [
      'Instantiate a module with both named and positional port connections.',
      'Explain why named connections are the professional default.',
      'Design hierarchically: a top module wiring submodules with internal nets.',
      'Trace a full adder built from two half adders, signal by signal.',
    ],
    whyItMatters:
      'Hierarchy is how hardware stays sane: a CPU is ALUs wired to registers, an ALU is adders wired to muxes, an adder is gates. Instantiation is the mechanism — and it is also where a huge class of bugs lives: wrong port order with positional connections, unconnected outputs, and nets left floating. Learning to think in terms of instances and nets (rather than one giant flat file) is what makes 10,000-line designs reviewable at all.',
    prerequisites: ['vlog-m02-l1', 'vlog-m02-l2'],
    explanation:
      'Using a module is called **instantiating** it — you create a *copy* of its hardware, give that copy an instance name, and wire its ports to signals in the enclosing module. One definition, unlimited copies, exactly like placing multiple chips of the same part number on a board:\n\n```\nand_gate u1 (.a(x), .b(y), .z(w));   // named connections\nand_gate u2 (x, y, w);               // positional connections\n```\n\n**Named connections** (`.port(signal)`) tie each port to a signal by name — order does not matter, omitted ports are left deliberately unconnected, and reviewers can check the wiring at a glance. **Positional connections** list signals in the exact port-declaration order — compact but fragile: reorder the module’s ports and every positional instantiation silently rewires into garbage. This course uses named connections everywhere; positional is shown once so you can recognize it.\n\n### Hierarchy: the top module\n\nA **top module** contains no chip-level logic of its own — it declares internal nets and wires instances together, like a backplane connecting daughter boards. The classic example: a full adder from two half adders. A half adder computes sum = a^b and carry = a&b. Chaining two of them (plus one OR gate) produces the full adder: first adder adds a and b; second adds that partial sum to cin; the two carries OR together. The top module declares only *nets* (`wire s1, c1, c2;`) — internal connections with no external pins.',
    deepDive:
      '### Instance rules worth memorizing\n\nEvery instantiation is `module_name instance_name (connections);` — the instance name is mandatory and becomes part of the hierarchical path (`tb.dut.u1`). Unconnected ports are written explicitly as `.port()` — an empty connection documents "intentionally unused" (versus a forgotten wire). Two instances may never share one instance name in the same scope, and you cannot instantiate into a port of direction conflict — an input of the child must be driven by the parent, an output of the child drives the parent.\n\n### What the elaborated hierarchy looks like\n\nAfter elaboration, the design is a tree: `tb → full_adder → ha1 → and/primitives`. Every signal belongs to exactly one scope, and hierarchical names (`full_adder.ha1.s`) can reach across boundaries — legal and occasionally useful in testbenches (module 14 uses this to peek inside DUTs), but forbidden inside synthesizable design code: design modules must only touch their own ports and internal nets, or they stop being reusable blocks.\n\n### Parameters preview\n\nInstances can also override parameters — `counter #(.WIDTH(12)) u_cnt (...);` — which module 13 develops fully. The syntax matters now because you will see it in professional code: a `#(...)` before the connection list customizes the copy, just like template arguments.',
    examples: [
      {
        title: 'Half adder and full adder: hierarchy in action',
        language: 'verilog',
        code:
          '// half_adder.v — 1-bit adder without carry-in\nmodule half_adder(\n    input  wire a,\n    input  wire b,\n    output wire sum,\n    output wire carry\n);\n    assign sum   = a ^ b;   // XOR: 1 when inputs differ\n    assign carry = a & b;   // AND: 1 when both set\nendmodule\n\n// full_adder.v — 1-bit adder with carry-in, built from TWO half adders\nmodule full_adder(\n    input  wire a,\n    input  wire b,\n    input  wire cin,\n    output wire sum,\n    output wire cout\n);\n    wire s1;    // partial sum of a+b\n    wire c1;    // carry from a+b\n    wire c2;    // carry from (a+b)+cin\n\n    half_adder ha1 (.a(a),  .b(b),   .sum(s1),  .carry(c1));\n    half_adder ha2 (.a(s1), .b(cin), .sum(sum), .carry(c2));\n\n    assign cout = c1 | c2;   // overall carry\n\nendmodule',
        explanation: [
          '`half_adder` is the leaf: two assigns, sum = a^b and carry = a&b (truth table below).',
          'The `wire s1, c1, c2;` declarations in full_adder are internal nets — no external pins, pure plumbing between instances.',
          '`half_adder ha1 (.a(a), .b(b), ...)` — instantiation: module type, then a chosen instance name, then named port connections. ha1 adds a+b.',
          'ha2 consumes ha1’s output: `.a(s1), .b(cin)` — it adds the partial sum to the carry-in, producing the final `sum`.',
          'Both half-carry outputs OR into cout: c1 fires when a+b overflows, c2 when (a+b)+cin overflows.',
          'Trace (a,b,cin) = (1,1,1): s1 = 1^1 = 0; c1 = 1&1 = 1; sum = 0^1 = 1; c2 = 0&1 = 0; cout = 1|0 = 1. Result sum=1, cout=1 — and indeed 1+1+1 = 3 = binary 11.',
        ],
      },
      {
        title: 'Positional connections (recognize, then avoid)',
        language: 'verilog',
        code:
          '// Same full adder, positional style — shown for recognition only.\nmodule full_adder_pos(\n    input  wire a,\n    input  wire b,\n    input  wire cin,\n    output wire sum,\n    output wire cout\n);\n    wire s1, c1, c2;\n\n    half_adder ha1 (a,  b,   s1,  c1 );  // must match (a,b,sum,carry) order\n    half_adder ha2 (s1, cin, sum, c2 );\n\n    assign cout = c1 | c2;\n\nendmodule',
        explanation: [
          'Positional connections list signals in the exact order of the child’s port declarations: (a, b, sum, carry).',
          'It works — but if half_adder’s ports were ever reordered, both instantiations would silently miswire: a reader must open the child module to verify correctness.',
          'Named style costs a few characters and buys self-evident wiring. This course and most professional style guides use named connections exclusively.',
          'Note the instances still need unique names (ha1, ha2) and each ends with a semicolon.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Full adder as a hierarchy of two half adders',
        content:
          '                 full_adder\n        +----------------------------------+\n  a ----+--> .a                     .carry +---- c1 --+\n        |    +-----------+                 |          |\n  b ----+--> .b  ha1     |                 |     +----+----+\n        |        |       |                 |     |         |\n        |        +--.sum--+--> s1 --+       |    (OR)       |\n        |                           |       |     |         |\n cin ----+--> .a  ha2               |      +-----+--> cout\n        |    +-----------+         |             |\n        |        |       |         |             |\n        |        +--.sum--+--> sum (output)       |\n        |        +--.carry+--> c2 ----------------+\n        +----------------------------------+\n\n   s1 = a ^ b        (ha1 partial sum)\n   c1 = a & b        (ha1 carry)\n   sum = s1 ^ cin    (ha2 sum)\n   c2  = s1 & cin    (ha2 carry)\n   cout = c1 | c2',
        caption:
          'The top module contains no gate logic — only instances and nets. Every wire in the diagram corresponds to one declared net.',
      },
    ],
    tables: [
      {
        caption: 'Half adder truth table',
        headers: ['a', 'b', 'sum = a^b', 'carry = a&b'],
        rows: [
          ['0', '0', '0', '0'],
          ['0', '1', '1', '0'],
          ['1', '0', '1', '0'],
          ['1', '1', '0', '1'],
        ],
      },
      {
        caption: 'Full adder truth table (verify the hierarchy on every row)',
        headers: ['a', 'b', 'cin', 'sum', 'cout'],
        rows: [
          ['0', '0', '0', '0', '0'],
          ['0', '0', '1', '1', '0'],
          ['0', '1', '0', '1', '0'],
          ['0', '1', '1', '0', '1'],
          ['1', '0', '0', '1', '0'],
          ['1', '0', '1', '0', '1'],
          ['1', '1', '0', '0', '1'],
          ['1', '1', '1', '1', '1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using positional connections for modules with many ports (or reordered ports).',
        fix:
          'Switch to named connections (.port(signal)). Positional wiring is only as safe as your memory of the child’s port order; named wiring is checked by the tool against declared names.',
      },
      {
        mistake: 'Forgetting the instance name: `and_gate (x, y, w);`.',
        fix:
          'Instantiations require a unique instance identifier: `and_gate u1 (x, y, w);`. The instance name is mandatory and forms the hierarchical path.',
      },
      {
        mistake: 'Declaring an internal connection as `reg` "to be safe" or leaving it undeclared.',
        fix:
          'Internal nets driven by instance outputs or assigns must be `wire`. Undeclared identifiers become implicit 1-bit nets — truncating buses silently. Declare every internal net explicitly and consider `` `default_nettype none ``.',
      },
    ],
    guidedPractice: {
      title: 'Trace the hierarchy on paper',
      brief:
        'For the full_adder in Example 1, fill the missing truth-table rows by tracing through BOTH half adders: (a,b,cin) = (0,1,1) and (1,0,1). For each row write s1, c1, c2 before concluding sum and cout.',
      expectedBehavior:
        '(0,1,1): s1 = 0^1 = 1; c1 = 0&1 = 0; sum = 1^1 = 0; c2 = 1&1 = 1; cout = 0|1 = 1. (1,0,1): s1 = 1^0 = 1; c1 = 1&0 = 0; sum = 1^1 = 0; c2 = 1&1 = 1; cout = 0|1 = 1. Both rows: sum=0, cout=1 — matches the truth table (1+0+1 = 2 = 10).',
      hints: [
        'Trace ha1 first (a, b), then feed its outputs into ha2 (s1, cin).',
        'Check the arithmetic: 0+1+1 = 2 and 1+0+1 = 2, and 2 = binary 10 → sum 0, carry 1.',
      ],
      challengeId: 'ece-04-half-adder',
    },
    practiceExercises: [
      {
        title: 'Two-bit adder from copies',
        brief:
          'Using full_adder as a leaf, write a top module `adder2` that adds two 2-bit numbers a[1:0] and b[1:0] with carry-in cin, producing sum[1:0] and cout. Instantiate exactly two full_adder cells.',
        expectedBehavior:
          'Instantiate fa0 with (a[0], b[0], cin) → sum[0], c_mid; instantiate fa1 with (a[1], b[1], c_mid) → sum[1], cout. Declare internal `wire c_mid;`. This is the ripple-carry structure — module 05 scales it to 4 bits.',
        hints: [
          'Bit 0 handles the external carry-in; bit 1 consumes the internal carry.',
          'The only internal net is the middle carry.',
        ],
        challengeId: 'ece-01-ripple-carry-adder',
      },
      {
        title: 'Find the wiring bug',
        brief:
          'This top module miswires something. Spot it: `full_adder u1 (.a(a), .b(b), .sum(w1), .carry(w2)); full_adder u2 (.a(w2), .b(cin), .sum(sum), .carry(cout));` — the designer intended the same two-half-adder structure as the lesson.',
        expectedBehavior:
          'u2’s inputs are wrong: it must consume the partial SUM (w1) with cin, not the carry w2. The carry-out should come from OR-ing both carries (u1’s .carry(w2) and u2’s .carry), not from wiring carry into the next adder. Correct: u2(.a(w1), .b(cin), .sum(sum), .carry(c2)); assign cout = w2 | c2; with internal wires w1, w2, c2.',
        hints: [
          'Ask: which intermediate signal is a SUM, and which is a CARRY?',
          'In the working structure, cout never feeds an adder input.',
        ],
      },
    ],
    assessment: {
      title: 'Module 02 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why does this course use named port connections (.a(a)) instead of positional (a)?',
          options: [
            'Named connections are order-independent, self-documenting, and checked against the child’s declared port names',
            'Positional connections are not supported by simulators',
            'Named connections simulate faster',
            'Positional connections cannot drive outputs',
          ],
          answer:
            'Named connections are order-independent, self-documenting, and checked against the child’s declared port names',
          explanation:
            'Positional connections depend on the child’s port ORDER — reordering ports silently rewires every positional instance. Named connections bind by name and fail loudly at elaboration if the name is wrong.',
          hint: 'Which style survives a port reorder without breaking?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'In the hierarchical full_adder, what are sum and cout for (a,b,cin) = (1,1,1)?',
          code:
            'half_adder ha1 (.a(a),  .b(b),   .sum(s1),  .carry(c1));\nhalf_adder ha2 (.a(s1), .b(cin), .sum(sum), .carry(c2));\nassign cout = c1 | c2;   // a=1, b=1, cin=1',
          options: ['sum=1, cout=1', 'sum=0, cout=1', 'sum=1, cout=0', 'sum=0, cout=0'],
          answer: 'sum=1, cout=1',
          explanation:
            's1 = 1^1 = 0; c1 = 1&1 = 1; sum = 0^1 = 1; c2 = 0&1 = 0; cout = 1|0 = 1. Arithmetic check: 1+1+1 = 3 = 11₂.',
          hint: 'Trace ha1, then ha2, then the OR.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A top-level module that only instantiates submodules and wires them together still needs to declare the connecting internal signals.',
          answer: 'true',
          explanation:
            'Internal connections are nets declared in the top module (wire s1, c1, c2;). Undeclared ones become implicit 1-bit wires — silently truncating any bus wider than one bit.',
          hint: 'Nets do not appear from nowhere; something must declare them.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'In `half_adder u3 (.a(x), .b(y), .sum(), .carry(c));`, what does `.sum()` mean?',
          options: [
            'The sum port is deliberately left unconnected',
            'The sum port connects to a signal named empty',
            'It is a syntax error — use .sum(w) always',
            'It creates an internal net named sum',
          ],
          answer: 'The sum port is deliberately left unconnected',
          explanation:
            'An empty named connection documents an intentionally unused output. It is legal syntax; good style adds a comment explaining WHY the output is unused.',
          hint: 'Empty parentheses = no signal attached.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the full hierarchical path of the first half adder instance if full_adder is instantiated as dut inside testbench tb (use dots).',
          answer: 'tb.dut.ha1',
          explanation:
            'Hierarchical names concatenate instance names from the simulation root downward: tb → dut (the full_adder) → ha1 (its first half adder).',
          hint: 'Root first, then each instance name, separated by dots.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Instantiation', definition: 'Creating a named copy of a module inside another module and wiring its ports.' },
      { term: 'Named connection', definition: 'Port wiring written as .port(signal), independent of declaration order.' },
      { term: 'Positional connection', definition: 'Port wiring by declaration order — compact but fragile; not used in this course.' },
      { term: 'Top module', definition: 'The outermost module that wires submodules together and (in simulation) is the simulation root.' },
      { term: 'Hierarchical name', definition: 'The dotted path from the root to a signal or instance, e.g. tb.dut.ha1.s1.' },
    ],
    revisionSummary: [
      'Instantiate with `module_type instance_name (.port(signal), ...);` — the instance name is mandatory.',
      'Prefer named connections; use positional only to recognize legacy code.',
      'Hierarchy = leaf modules + a top module of nets and instances; the full adder from two half adders is the canonical pattern.',
      'Internal wires must be declared; implicit 1-bit nets are silent width bugs.',
      'Every instance needs a unique name in its scope; hierarchical paths (tb.dut.ha1) address instances from the root.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Adder (electronics)', url: 'https://en.wikipedia.org/wiki/Adder_(electronics)', kind: 'article' },
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
