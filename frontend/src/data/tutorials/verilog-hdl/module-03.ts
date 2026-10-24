import type { TutorialLesson } from '../types';

// Module 03 — Data Types & Values
export const module03Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m03-l1',
    title: 'wire vs reg — and the Four Values 0, 1, x, z',
    summary:
      'Learn what wire and reg really mean (and unlearn "reg = register"), then meet the four-valued logic system that sets Verilog apart from C.',
    objectives: [
      'Define wire (net) and reg (variable) by how they are assigned, not by what they synthesize to.',
      'Debunk the misconception that reg always implies a physical register.',
      'Explain the meaning and origin of x (unknown) and z (high impedance).',
      'Predict how x propagates through AND, OR and NOT gates.',
    ],
    whyItMatters:
      'The wire/reg distinction decides which Verilog constructs you may use on a signal, and misreading it produces code that will not compile for reasons that seem arbitrary. The four-valued system is equally load-bearing: x and z are how simulators tell you "something is wrong" (undriven, uninitialized, conflicting drivers) — designers who can read x/z clues debug in minutes what takes others days.',
    prerequisites: ['vlog-m02-l1', 'vlog-m02-l2'],
    explanation:
      'Verilog has two families of data objects, and the difference is **how they are assigned**, not what hardware they become:\n\n- **Nets (`wire`)** represent physical connections. A net is *continuously driven* by something — an `assign` statement, an output port of a submodule, or a gate primitive. You cannot procedurally assign to a net inside an `always` block; a net has no memory of an assignment, it simply *is* the resolved value of its driver(s).\n- **Variables (`reg`)** are assignment targets inside procedural blocks (`initial`, `always`). A reg holds a value from one procedural assignment to the next. The keyword is a historical accident: **reg does NOT mean "physical register".** A reg assigned in a clocked `always @(posedge clk)` block does synthesize to flip-flops — but a reg assigned in a combinational `always @*` block synthesizes to *plain wires and gates*, with no clock and no memory whatsoever.\n\nThe correct mental rule: **wire = continuously driven net; reg = procedural assignment target.** Which hardware each becomes depends entirely on the code that assigns it (module 06 and 09 develop this fully).\n\n### The four values\n\nVerilog signals are four-valued, not Boolean. **0** is a logic low, **1** a logic high, **x** means *unknown* — the value exists but we cannot determine it (uninitialized reg, conflicting drivers, reading a signal before stimulus), and **z** means *high impedance* — nothing is driving the wire at all (a tri-state buffer released, a wire with no driver). Hardware never contains "x": it is a simulation concept meaning "the model cannot answer". That is precisely its value — x is an alarm bell telling you the testbench has not driven something, or two drivers fight. C has no equivalent: a C int is always "some number"; a Verilog wire can genuinely be "nothing".',
    deepDive:
      '### How x propagates through gates\n\nGate behavior with unknowns follows "resolve what you can": an AND gate with one input 0 outputs 0 *no matter what the other input is* (0 AND anything = 0). But AND with one input 1 and the other x gives x — the output truly depends on the unknown. OR is symmetric: 1 OR anything = 1; 0 OR x = x. NOT x = x. This is why a single uninitialized input can poison a whole datapath — and why a well-aimed 0 can "sanitize" a path.\n\n### z in action\n\nz appears three ways: (1) a wire no one drives — the most common beginner x/z source; (2) a tri-state driver assigning 1\'bz, as in inout pads (module 02); (3) an output port of a submodule left unconnected at instantiation. Reading a z-driven net with a pull purpose gives z itself; downstream gates treat z like x (unknown). Note the diagnostic pair: **z usually means "no driver"; x usually means "conflict or uninitialized"** — different diseases, different cures.\n\n### Enforcing explicit nets\n\nThe compiler directive `` `default_nettype none `` (placed at the top of a file) disables implicit net creation: every identifier must be declared, and the famous typo-that-becomes-a-1-bit-wire bug becomes a compile error instead. Many professional style guides mandate it. You may also meet `tri`, `wand`, `wor` — net subtypes for resolved multi-driver cases; this course uses plain `wire` and avoids multi-driver nets entirely.',
    examples: [
      {
        title: 'wire and reg side by side — same hardware, different assignment style',
        language: 'verilog',
        code:
          '// Two ways to describe the SAME combinational hardware.\nmodule same_hardware(\n    input  wire a,\n    input  wire b,\n    input  wire sel,\n    output wire y_wire,    // net driven by assign\n    output reg  y_reg      // variable driven by always (NOT a register!)\n);\n    // Style 1: continuous assignment on a net.\n    assign y_wire = sel ? b : a;\n\n    // Style 2: procedural assignment on a reg, in a COMBINATIONAL block.\n    // y_reg is still just a mux — no clock, no flip-flop, no memory.\n    always @* begin\n        if (sel) y_reg = b;\n        else     y_reg = a;\n    end\n\nendmodule',
        explanation: [
          '`y_wire` is a net: the assign continuously drives it, forever reflecting (sel ? b : a).',
          '`y_reg` is a reg: assigned inside `always @*`, a combinational procedural block. Despite the keyword, it synthesizes to the same multiplexer as y_wire — there is no clock anywhere.',
          'The deciding factor for flip-flops is the enclosing block: `always @(posedge clk)` makes registers; `always @*` makes pure logic. The type wire/reg only decides what language constructs you may use.',
          'Both outputs have identical truth tables: sel=0 → a, sel=1 → b.',
          'Memory check: an assign cannot target y_reg (type error), and an always block cannot assign y_wire (procedural/net error). The type system enforces assignment style.',
        ],
      },
      {
        title: 'Where x and z come from, and how they spread',
        language: 'verilog',
        code:
          '// Diagnostic module: sources and spread of x and z.\n`timescale 1ns/1ps\nmodule xz_demo;\n    reg a;              // regs start UNINITIALIZED -> x until assigned\n    wire b;             // driven below\n    wire orphan;        // NO driver anywhere -> z forever\n    wire y_and, y_or, y_not;\n\n    // Continuous logic fed by a (x at time 0!) and b.\n    assign b     = a;        // copies the unknown\n    assign y_and = a & 1\'b0; // 0 dominates: resolves to 0\n    assign y_or  = a | 1\'b0; // a is x -> output x\n    assign y_not = ~a;       // NOT x = x\n\n    initial begin\n        $display("t=0 : a=%b b=%b orphan=%b y_and=%b y_or=%b",\n                 a, b, orphan, y_and, y_or);\n        a = 1\'b1;            // initialize: the x poison stops here\n        #1;\n        $display("t=1 : a=%b b=%b y_and=%b y_or=%b",\n                 a, b, y_and, y_or);\n        $finish;\n    end\nendmodule',
        explanation: [
          'At time 0, reg `a` is x (never initialized), so b, y_or and y_not are also x — one unknown input poisoned three downstream signals.',
          '`y_and = a & 1\'b0` is the exception: AND with a hard 0 resolves to 0 regardless of the unknown — the "0 dominates" rule.',
          '`orphan` has no driver at all: it is z (high impedance) for the whole run. z = nobody home; x = value exists but unknown.',
          'After `a = 1\'b1` and a settling step, all derived signals become known (b=1, y_and=0, y_or=1, y_not=0).',
          'This trace is illustrative of the four-valued rules; the exact printout ordering conventions are simulator details — run it yourself via a linked challenge to see the live output.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'x-propagation through a gate',
        content:
          '        x ---\\\n              AND --- 0     (one input is hard 0: output resolves to 0)\n        0 ---/\n\n        x ---\\\n              AND --- x     (hard 1 cannot decide the AND)\n        1 ---/\n\n        x ---\\\n              OR  --- 1     (one input is hard 1: output resolves to 1)\n        1 ---/\n\n        x ---\\\n              OR  --- x\n        0 ---/\n\n        x ---[NOT]--- x',
        caption:
          'Resolve what you can: hard 0 wins an AND, hard 1 wins an OR; otherwise the unknown propagates.',
      },
    ],
    tables: [
      {
        caption: 'The four Verilog values',
        headers: ['Value', 'Name', 'Meaning', 'Typical cause'],
        rows: [
          ['0', 'Logic low', 'Driven low', 'Normal operation'],
          ['1', 'Logic high', 'Driven high', 'Normal operation'],
          ['x', 'Unknown', 'A value exists but is not determinable', 'Uninitialized reg, conflicting drivers, x-propagation'],
          ['z', 'High impedance', 'Nothing is driving the net', 'Undriven wire, tri-state released (1\'bz), unconnected output'],
        ],
      },
      {
        caption: 'wire vs reg — the decision table',
        headers: ['Question', 'wire', 'reg'],
        rows: [
          ['Assigned by assign?', 'Yes', 'No (type error)'],
          ['Assigned in always/initial?', 'No (illegal)', 'Yes (required)'],
          ['Driven by submodule output?', 'Yes', 'No'],
          ['Synthesizes to flip-flops?', 'Never (nets have no memory)', 'Only if assigned in a clocked block'],
          ['Synthesizes to plain gates?', 'Yes', 'Yes, when assigned in always @*'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Believing every reg becomes a flip-flop, and avoiding reg in combinational code "to save registers".',
        fix:
          'reg means "procedural assignment target", nothing more. Combinational always @* blocks must target regs and synthesize to plain gates. Registers appear only when assignment happens on a clock edge (module 09).',
      },
      {
        mistake: 'Assigning to a wire inside an always block, or to a reg with an assign.',
        fix:
          'The two types have disjoint assignment mechanisms: nets take continuous drivers (assign, instance outputs); variables take procedural assignments (inside initial/always). Pick the type from the driver you intend to use.',
      },
      {
        mistake: 'Ignoring an x in a waveform because "the simulator is being picky".',
        fix:
          'x means your model cannot answer — trace it upstream to its source: an unassigned reg, an input the testbench never drove, or two drivers fighting. Fixing the source early is minutes; discovering it after synthesis is days.',
      },
    ],
    guidedPractice: {
      title: 'Predict the four-value behavior',
      brief:
        'Given a = x, b = 0, c = 1, evaluate: (1) a & b, (2) a & c, (3) a | c, (4) ~a, (5) b & c. Then state which result would change if b were z instead of 0.',
      expectedBehavior:
        '(1) x & 0 = 0 (zero dominates AND). (2) x & 1 = x. (3) x | 1 = 1 (one dominates OR). (4) ~x = x. (5) 0 & 1 = 0. With b = z: z behaves as unknown in gates, so (1) z & 0 = 0 still, and (5) z & 1 = x — that row changes from 0 to x.',
      hints: [
        'Rule: hard 0 wins AND, hard 1 wins OR; otherwise unknown/z propagates.',
        'z acts like x inside gate computations.',
      ],
    },
    practiceExercises: [
      {
        title: 'Diagnose from values',
        brief:
          'A testbench observes: ctrl = z, data = x, ready = 1. For each signal name one plausible root cause and one debug action.',
        expectedBehavior:
          'ctrl = z: no driver drives ctrl (or an unconnected output port) — check for a missing assign/instance connection. data = x: an uninitialized reg or conflicting drivers upstream — trace data’s driver chain; check for a missing reset or stimulus. ready = 1: healthy, nothing to do.',
        hints: [
          'z = "nobody home"; x = "conflict or never set".',
          'Undriven nets and unassigned regs are the two most common sources.',
        ],
      },
      {
        title: 'Convert styles',
        brief:
          'Rewrite `assign eq = (a == b);` as a combinational always block (with the correct output declaration), then state the port type change required.',
        expectedBehavior:
          'always @* begin eq = (a == b); end with the port changed from `output wire eq` to `output reg eq`. Same comparison hardware; only the assignment style and type changed.',
        hints: [
          'Procedural targets must be reg.',
          'always @* recomputes whenever anything read inside changes — same continuous behavior as assign.',
        ],
      },
    ],
    assessment: {
      title: 'Module 03 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'When does a reg synthesize to a physical register (flip-flops)?',
          options: [
            'Only when assigned inside a clocked always block such as always @(posedge clk)',
            'Always — reg means register',
            'Never — regs are simulation-only',
            'When declared with more than 8 bits',
          ],
          answer: 'Only when assigned inside a clocked always block such as always @(posedge clk)',
          explanation:
            'The enclosing block decides the hardware. A reg in always @* is pure combinational logic; a reg in a clocked block becomes flip-flops. The keyword reg only marks a procedural assignment target.',
          hint: 'The keyword is about assignment style, not silicon.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A net can be procedurally assigned inside an always block as long as it is also driven by an assign.',
          answer: 'false',
          explanation:
            'Nets accept only continuous drivers (assign, instance outputs, gate primitives). Procedural assignment requires a variable (reg). Two driver families on one object are illegal — and two assigns on one wire are a multiple-driver problem anyway.',
          hint: 'wire and reg have disjoint assignment mechanisms.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'What is the value of y if a = x and the code is assign y = a & 1\'b0; ?',
          code: 'assign y = a & 1\'b0;   // a is unknown (x)',
          options: ['x', '0', '1', 'z'],
          answer: '0',
          explanation:
            'AND with a hard 0 resolves to 0 no matter what the other input is — the "0 dominates" rule for AND with unknowns.',
          hint: 'Can the output ever be 1, whatever a turns out to be?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'A wire in a waveform shows a flat, unbroken z. Most likely cause?',
          options: [
            'Nothing drives the wire (or a tri-state driver is permanently released)',
            'The wire is assigned in two places with different values',
            'The wire was never initialized in an initial block',
            'The wire is 8 bits wide but used as 1 bit',
          ],
          answer: 'Nothing drives the wire (or a tri-state driver is permanently released)',
          explanation:
            'z = high impedance = no driver. Conflicting drivers produce x, not z; uninitialized regs produce x; width issues cause truncation, not z.',
          hint: 'z is the "nobody home" value.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Which compiler directive (with backtick) makes all implicit 1-bit net creation an error?',
          answer: '`default_nettype none',
          explanation:
            'Placed in a source file, `default_nettype none forces every identifier to be explicitly declared, turning the classic undeclared-signal typo into a compile error.',
          hint: 'It is about the DEFAULT net type.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Net (wire)', definition: 'A data object representing a physical connection, continuously driven by assign, gates, or instance outputs.' },
      { term: 'Variable (reg)', definition: 'A data object assigned only by procedural statements inside initial/always blocks.' },
      { term: 'x (unknown)', definition: 'Four-valued logic state meaning a value exists but cannot be determined.' },
      { term: 'z (high impedance)', definition: 'Four-valued logic state meaning nothing is driving the net.' },
      { term: 'default_nettype', definition: 'Compiler directive; `default_nettype none forbids implicit net declarations.' },
    ],
    revisionSummary: [
      'wire = continuously driven net; reg = procedural assignment target. That is the whole difference.',
      'reg does NOT mean register: combinational always @* targets are regs and synthesize to plain gates.',
      'Four values: 0, 1, x (unknown), z (high impedance). Hardware has no x — it is a simulation alarm.',
      'Gate rules with unknowns: 0 wins AND, 1 wins OR, otherwise x/z propagates; ~x = x.',
      'z means no driver (undriven wire, released tri-state, unconnected port); x means conflict or uninitialized.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'vlog-m03-l2',
    title: 'Vectors, Bit-Select and Part-Select',
    summary:
      'Declare multi-bit buses, index single bits and slices, and learn what happens when an index runs off the end of the vector.',
    objectives: [
      'Declare vectors with [N-1:0] ranges and explain MSB/LSB conventions.',
      'Use bit-selects and part-selects, including variable indexing.',
      'Assemble and disassemble buses with concatenation as a preview of module 04.',
      'Predict out-of-range and unknown-index behavior in simulation.',
    ],
    whyItMatters:
      'Real designs move data in buses: addresses, opcodes, ASCII bytes. Nearly every datapath bug involves a wrong slice or an off-by-one range, and these bugs are notoriously quiet — a [6:0] instead of [7:0] compiles, simulates, and quietly drops the top bit. Fluency with ranges and selects is daily bread for an RTL engineer.',
    prerequisites: ['vlog-m03-l1', 'vlog-m02-l2'],
    explanation:
      'A **vector** (bus) is a group of bits declared with a range. This course uses the descending convention `wire [7:0] data;` — element 7 is the most significant bit, element 0 the least significant. The range applies to every use of the name: `data` alone means all 8 bits; `data[3]` is a **bit-select** (one bit); `data[7:4]` is a **part-select** (a contiguous slice, here the upper nibble). Slices keep their natural width: `data[7:4]` is 4 bits wide and remains "bit 7 first".\n\nBoth constant and variable indexing are allowed. A variable bit-select — `data[idx]` with idx a reg or integer — synthesizes to a multiplexer (one AND-tree per output bit) and is the standard way to build register files and addressable muxes. Verilog-2001 also adds **indexed part-selects**: `data[base +: 4]` extracts 4 bits starting at base (rising upward from base); the fixed `+:` width avoids the classic reversed-range typo `data[base+3:base]` breaking when base becomes 0.\n\n### What goes wrong at the edges\n\nReading outside the declared range — `data[8]` on an 8-bit bus — yields **x** in simulation; a *variable* index that overflows also produces x for that cycle. Writing outside the range does nothing. Neither case is a compile error, so a wrong index silently produces unknown data until a testbench catches it. Similarly, part-selects must have both bounds inside the range and the bounds in the "right" order for the declared direction: on a `[7:0]` vector, `data[3:6]` (descending bounds written ascending) is illegal.',
    deepDive:
      '### Ranges are declared once, used everywhere\n\nThe declared range follows the signal through the whole design: a `wire [7:0]` port connected to a `wire [15:0]` net pads or truncates at the connection (module 02). Slices inherit direction too: with `[7:0]`, `data[3:0]` reads naturally left-to-right (3 is more significant); the same code on a `[0:7]` vector silently reverses bit significance. That is why this course bans ascending ranges: they are legal, but one mixed-endian module can corrupt an entire team’s assumptions.\n\n### Memory arrays vs vectors\n\n`reg [7:0] mem [0:255];` is a different animal — an **array** (memory) of 256 words, each 8 bits. You can index a whole word (`mem[addr]`) but not bits within a word in the same expression (`mem[addr][3]` requires SystemVerilog or a temporary variable). Arrays and memories get their own module (12); the distinction to hold now: a vector is ONE word of N bits; an array is MANY words.',
    examples: [
      {
        title: 'Bit-select, part-select, variable index',
        language: 'verilog',
        code:
          '// slice_demo.v — common vector operations\nmodule slice_demo(\n    input  wire [7:0] data,    // the bus under study\n    input  wire [2:0] idx,     // variable index, 0..7\n    output wire       msb,     // single bit\n    output wire [3:0] low_nib, // lower nibble\n    output wire       picked,  // data bit chosen by idx\n    output wire [7:0] expanded // byte widened from one bit\n);\n    // Constant bit-select: one bit out.\n    assign msb = data[7];\n\n    // Constant part-select: bits 3 down to 0 (4 bits).\n    assign low_nib = data[3:0];\n\n    // VARIABLE bit-select: a 8-to-1 mux in hardware.\n    assign picked = data[idx];\n\n    // Zero-extend a bit to a byte by concatenation (module 04 preview).\n    assign expanded = {8{msb}};   // replicate msb 8 times\n\nendmodule',
        explanation: [
          '`data[7]` — constant bit-select: a single wire, no logic in hardware at all.',
          '`data[3:0]` — constant part-select: pure wiring, bits 3..0 in their natural order (bit 3 first).',
          '`data[idx]` with a variable idx — synthesizes to an 8:1 multiplexer: for each idx value, a different data bit reaches `picked`.',
          '`{8{msb}}` — replication: the single bit copied into all 8 positions (full concatenation rules in module 04).',
          'Trace: data = 8\'b1011_0101, idx = 3\'b5, msb = 1, low_nib = 4\'b0101, picked = data[5] = 1, expanded = 8\'b1111_1111.',
        ],
      },
      {
        title: 'Indexed part-select (+:) and the nibble swap',
        language: 'verilog',
        code:
          '// nibble_ops.v — slices under a variable base\nmodule nibble_ops(\n    input  wire [7:0] din,\n    input  wire [2:0] base,     // starting bit for the window\n    output wire [7:0] swapped,  // high/low nibbles exchanged\n    output wire [3:0] window    // 4 bits starting at base\n);\n    // Swap nibbles: {upper, lower} becomes {lower, upper}.\n    assign swapped = {din[3:0], din[7:4]};\n\n    // Indexed part-select: 4 bits rising from base.\n    // din[base +: 4] == din[base+3 : base] WITHOUT the typo risk.\n    assign window = din[base +: 4];\n\nendmodule',
        explanation: [
          '`{din[3:0], din[7:4]}` — concatenation reorders slices: the low nibble moves to the high half. din = 8\'b1011_0101 gives swapped = 8\'b0101_1011.',
          '`din[base +: 4]` — indexed part-select: the window always has width 4 (a constant) and starts at variable base, extending UPWARD (toward more significant bits).',
          'The `+:` form exists because the equivalent `din[base+3:base]` must be rewritten whenever base changes — with base=0 it collapses to `din[3:0]`, which is exactly what +: handles automatically.',
          'Trace: base = 4 → window = din[7:4] = 4\'b1011 (for din = 8\'b1011_0101). base = 0 → window = din[3:0] = 4\'b0101.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Anatomy of an 8-bit vector',
        content:
          '   declaration:  wire [7:0] data;\n\n   bit index:       7    6    5    4    3    2    1    0\n                 +----+----+----+----+----+----+----+----+\n   value 1011_0101:  1    0    1    1    0    1    0    1\n                 +----+----+----+----+----+----+----+----+\n                    ^^^^              ^^^^\n                    |                 |\n   data[7:4] = 4\'b1011  (upper nibble, part-select)\n   data[3:0] = 4\'b0101  (lower nibble)\n   data[5]   = 1\'b1     (bit-select)\n   data[idx] with idx=5 -> same bit, via an 8:1 mux',
        caption:
          'With the [N-1:0] convention the MSB is the highest index. Part-selects are contiguous slices; bit-selects pick one wire.',
      },
    ],
    tables: [
      {
        caption: 'Select operations on wire [7:0] data (value 8\'b1011_0101)',
        headers: ['Expression', 'Kind', 'Width', 'Result'],
        rows: [
          ['data', 'Whole vector', '8', "8'b1011_0101"],
          ['data[7]', 'Bit-select (constant)', '1', "1'b1"],
          ['data[3:0]', 'Part-select (constant)', '4', "4'b0101"],
          ['data[idx], idx=5', 'Bit-select (variable)', '1', "1'b1 (via 8:1 mux)"],
          ['data[base +: 4], base=4', 'Indexed part-select', '4', "4'b1011"],
          ['data[8]', 'Out of range', '1', 'x in simulation'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Declaring an ascending range [0:7] in one module while the rest of the project uses [7:0].',
        fix:
          'Ascending ranges reverse the meaning of "high" and "low" bits and silently reverse slices. Standardize on [N-1:0] project-wide; if you must read legacy ascending code, translate every slice to explicit indices before reasoning about it.',
      },
      {
        mistake: 'Writing a variable part-select as data[base+3:base].',
        fix:
          'It breaks when base=0 (range becomes [3:0], fine) but also risks reversed bounds after arithmetic. Use the Verilog-2001 indexed form `data[base +: 4]`, whose width is constant by construction.',
      },
      {
        mistake: 'Assuming an out-of-range index is a compile error.',
        fix:
          'It is not: constant out-of-range reads compile (with a warning in many tools) and return x in simulation; variable over-range reads return x at runtime. Add assertions or dedicated testbench rows that exercise boundary indices.',
      },
    ],
    guidedPractice: {
      title: 'Slice and dice a byte',
      brief:
        'For data = 8\'b1100_1010 evaluate: (1) data[6:4], (2) data[0], (3) {data[1:0], data[7:6]}, (4) data[idx] with idx=3\'b6, (5) data[4 +: 2]. State the width of each result.',
      expectedBehavior:
        '(1) data[6:4] = 3\'b100 (bits 6,5,4 = 1,0,0), width 3. (2) data[0] = 1\'b0. (3) concatenation = {10, 11} = 4\'b1011, width 4. (4) data[6] = 1\'b1. (5) bits 4 and 5 rising = 2\'b01, width 2.',
      hints: [
        'Write out the bit positions 7..0 above the value before slicing.',
        'Indexed part-selects rise from the base: [4 +: 2] covers bits 4 and 5.',
      ],
    },
    practiceExercises: [
      {
        title: 'Build an 8:1 mux with a variable index',
        brief:
          'Write module mux8_index(input wire [7:0] d, input wire [2:0] sel, output wire y) that outputs d[sel] — one line of RTL. Then say what hardware it implies.',
        expectedBehavior:
          'assign y = d[sel]; — an 8:1 multiplexer (eight 3-input AND terms into an OR, or equivalent mux cell). This one-liner is the idiomatic way to write addressable selection.',
        hints: [
          'The variable bit-select IS the mux — no case statement needed.',
          'sel must be wide enough to index all 8 entries: 3 bits.',
        ],
      },
      {
        title: 'Catch the reversed range',
        brief:
          'A teammate writes `assign top = din[4:7];` on a [7:0] vector and reports a compile error. Explain the error and give two correct alternatives.',
        expectedBehavior:
          'On a descending [7:0] vector the bounds must also descend: [4:7] has ascending bounds and is illegal. Alternatives: `din[7:4]` (same bits, correct order), or declare din ascending (banned by this course’s convention).',
        hints: [
          'The direction of the declared range constrains every slice.',
          'The bits wanted are 7,6,5,4 — write the range high-first.',
        ],
      },
    ],
    assessment: {
      title: 'Module 03 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'With `wire [7:0] data;`, which statement about data[3:0] is true?',
          options: [
            'It is a 4-bit slice containing bits 3, 2, 1, 0 — bit 3 the most significant',
            'It is a 3-bit slice',
            'It reverses the vector order permanently',
            'It is illegal syntax; part-selects need +:',
          ],
          answer: 'It is a 4-bit slice containing bits 3, 2, 1, 0 — bit 3 the most significant',
          explanation:
            'A constant part-select takes bits between the bounds inclusive; on a descending vector the first (left) bound is the more significant bit. Width = 3-0+1 = 4.',
          hint: 'Inclusive bounds; width = high - low + 1.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Reading data[8] from an 8-bit vector is a compile-time error.',
          answer: 'false',
          explanation:
            'It compiles (often with a warning) and returns x in simulation. Out-of-range access is a runtime/value problem, not a syntax one — testbenches must exercise boundary indices.',
          hint: 'The language prefers to model the unknown rather than stop.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'What is {data[1:0], data[7:6]} for data = 8\'b1100_1010?',
          code: 'wire [7:0] data = 8\'b1100_1010;\nwire [3:0] q = {data[1:0], data[7:6]};',
          options: ["4'b1011", "4'b0011", "4'b1100", "4'b1110"],
          answer: "4'b1011",
          explanation:
            'data[1:0] = 2\'b10 (the two LSBs of ...1010 are 1,0 → 10), data[7:6] = 2\'b11. Concatenation is left-to-right: {10, 11} = 4\'b1011.',
          hint: 'Concatenate the two slices in the written order.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'What hardware does `assign picked = data[idx];` (data 8 bits, idx 3 bits) synthesize to?',
          options: ['An 8:1 multiplexer', 'Eight flip-flops', 'A 3-bit adder', 'Nothing — it is simulation-only'],
          answer: 'An 8:1 multiplexer',
          explanation:
            'A variable bit-select is an addressable read: for each of the 8 idx values a different data bit reaches the output — exactly an 8:1 mux (typically built from AND/OR trees or LUTs).',
          hint: 'One output, selected from 8 inputs by a 3-bit control.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the indexed part-select that reads 6 bits starting at variable base, rising upward.',
          answer: 'din[base +: 6]',
          explanation:
            'The +: form fixes the width (6) and extends upward from base, equivalent to din[base+5:base] without the reversed-range risk.',
          hint: 'The width after the +: is a constant.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Vector', definition: 'A multi-bit signal declared with a range, e.g. wire [7:0].' },
      { term: 'Bit-select', definition: 'Access to one bit of a vector, constant (data[3]) or variable (data[idx]).' },
      { term: 'Part-select', definition: 'Access to a contiguous slice of bits, e.g. data[7:4], or indexed data[base +: 4].' },
      { term: 'Indexed part-select', definition: 'Verilog-2001 form [base +: width] with constant width and variable base; avoids reversed-range bugs.' },
      { term: 'MSB / LSB', definition: 'Most/least significant bit; with the [N-1:0] convention these are bits N-1 and 0.' },
    ],
    revisionSummary: [
      'Declare vectors as [N-1:0]; bit N-1 is the MSB. Never mix ascending ranges into a project.',
      'Bit-select data[i] = one wire (constant index = wiring, variable index = mux).',
      'Part-select data[h:l] = contiguous slice, width h-l+1, bounds inclusive and descending.',
      'data[base +: W] gives a constant-width window rising from a variable base.',
      'Out-of-range or over-range reads return x in simulation — test the boundary indices on purpose.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
      { label: 'All About Circuits — Digital textbook', url: 'https://www.allaboutcircuits.com/textbook/digital/', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'vlog-m03-l3',
    title: 'Literals, Parameters, and Width & Signedness Rules',
    summary:
      'Write sized literals correctly, size designs with parameter/localparam, and master the extension and truncation rules that govern every assignment.',
    objectives: [
      'Write sized literals in binary, hex and decimal, including x/z digits and underscores.',
      'Explain parameter vs localparam and use both.',
      'Predict zero-extension, sign-extension and truncation on width mismatch.',
      'Describe signed/unsigned pitfalls and where SystemVerilog’s logic type fits.',
    ],
    whyItMatters:
      'Numbers are where silent corruption lives. `if (cnt == 10)` comparing an 8-bit counter against an unsized 32-bit literal is fine — but `assign small = big + 1;` throwing away the carry is a real bug that ships. Likewise, signed comparisons that secretly become unsigned are among the most-reported Verilog traps in professional code review. Parameters, meanwhile, are how one module serves every width in the design.',
    prerequisites: ['vlog-m03-l1', 'vlog-m03-l2'],
    explanation:
      'A **sized literal** states its width and base explicitly: `4\'b1010` (4 bits binary), `8\'hFF` (8 bits hex), `12\'d255` (12 bits decimal), `4\'bx01x` (unknown/wildcard digits allowed in binary), `16\'hFF_0F` (underscores for readability, ignored by tools). The form is `<width>\'<base><digits>`; base is b, o, d or h (case-insensitive). An **unsized literal** like `10` or `\'h3C` defaults to at least 32 bits — usually harmless in comparisons, dangerous in assignments (a 32-bit value truncated into a narrow wire). A bare decimal in an expression is also **signed**; a sized literal like `8\'d200` is unsigned unless you write the s prefix (`8\'sh80`).\n\n### parameter and localparam\n\n`parameter` declares a compile-time constant that *callers may override* per instance (`counter #(.N(12)) u (...)`), and `localparam` declares one derived internally that nobody may touch (widths computed from parameters, state encodings). Using localparam for everything except the deliberate knobs is professional hygiene: it prevents callers from "helpfully" redefining your internals.\n\n### Width matching on assignment\n\nWhen RHS and LHS widths differ, Verilog adjusts the RHS to the LHS width: **zero-extension** (pad high bits with 0) or, if the RHS is signed, **sign-extension** (replicate the MSB); if the RHS is wider, the high bits are **truncated**. Truncation is silent data loss — the carry of an addition, the overflow of a product. The professional reflex: size the LHS for the math you intend (`{carry, sum} = a + b;`) and never rely on automatic truncation to "wrap around" unless wrap-around is the specified behavior.',
    deepDive:
      '### Signedness: the invisible handover\n\nSignedness follows the *expression*: if ALL operands are signed, arithmetic and comparisons are signed; the moment ANY operand is unsigned (all sized literals, all plain regs/wires), the whole operation becomes unsigned. Classic bug: `reg signed [7:0] a; ... if (a > 8\'d5)` — the sized literal 8\'d5 is unsigned, so the comparison is unsigned and a = -1 (8\'hFF) compares "greater than" 5. Fix with a signed literal `8\'sd5` or an explicitly signed constant. Signed arithmetic is covered further in module 04; the survival rule is: keep signedness uniform across every operand.\n\n### Sizing the LHS for carry\n\nThe width of an addition in Verilog is the maximum of the operand widths *and the assignment context*. `assign {c, s} = a + b;` with 4-bit a, b gives the addition a 5-bit context (LHS is 5 bits), so the carry survives in c. `assign s = a + b;` (4-bit LHS) computes in 4 bits and drops the carry. This context rule — the LHS participates in sizing — is the single most useful width fact in the language, and module 04 builds an entire lesson on its consequences.\n\n### SystemVerilog’s logic — the modern unifier (preview)\n\nSystemVerilog (a superset used by most modern teams) replaces the wire/reg decision with a single type: `logic`. A `logic` signal may be driven by an assign OR procedurally — but still by only ONE driver, which preserves the useful error-catching of reg while ending the wire/reg bookkeeping. Verilog-2001 has no logic type; this course teaches wire/reg because they remain the portable standard, but when you read modern code, translate `logic` as "wire or reg, whichever the driver needs".',
    examples: [
      {
        title: 'Literals: every form you will actually use',
        language: 'verilog',
        code:
          '// literals_demo.v — sized literal gallery\n`timescale 1ns/1ps\nmodule literals_demo;\n    reg [7:0] mask, hexval, decval, wild;\n    reg [11:0] spaced;\n    reg signed [7:0] neg;\n\n    initial begin\n        mask   = 8\'b1010_0101;  // binary with underscores\n        hexval = 8\'hA5;         // hex, same value as mask\n        decval = 8\'d165;        // decimal, same value again\n        wild   = 8\'b0000_xxxx;  // x digits: upper nibble unknown\n        spaced = 12\'hF_0F;      // readability grouping\n        neg    = -8\'sd5;        // signed literal: minus five\n\n        $display("mask=%b hex=%h dec=%d", mask, hexval, decval);\n        $display("wild=%b spaced=%h neg=%d", wild, spaced, neg);\n        $finish;\n    end\nendmodule',
        explanation: [
          'All three of mask/hexval/decval hold the same bit pattern 1010_0101 (165 decimal, A5 hex) — base changes spelling, not value.',
          'Underscores in 8\'b1010_0101 and 12\'hF_0F exist purely for humans; the tool ignores them.',
          'x digits create per-bit unknowns: wild = 0000xxxx. Useful for modeling don\'t-care stimulus.',
          '-8\'sd5: the s prefix makes the literal signed so the minus sign does two\'s-complement math (-5 = 8\'hFB). Without s, -8\'d5 is an unsigned 32-bit negation truncated — usually the wrong thing.',
          'The two $display lines are sim-only; their printed values (mask=A5 etc.) follow directly from the assignments above.',
        ],
      },
      {
        title: 'parameter/localparam and width-matched design',
        language: 'verilog',
        code:
          '// counter_wide.v — parameterized width, derived localparams\nmodule counter_wide #(\n    parameter WIDTH = 4          // caller may override\n)(\n    input  wire             clk,\n    input  wire             reset_n,\n    output wire [WIDTH-1:0] count,\n    output wire             at_max    // 1 while count holds the top value\n);\n    // Derived constant: NO caller may override this.\n    localparam MAX = {WIDTH{1\'b1}};      // all-ones = maximum value\n\n    reg [WIDTH-1:0] cnt;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n)        cnt <= {WIDTH{1\'b0}};  // zero of right width\n        else if (cnt == MAX) cnt <= {WIDTH{1\'b0}};\n        else                 cnt <= cnt + {{(WIDTH-1){1\'b0}}, 1\'b1};\n    end\n\n    assign count = cnt;\n    assign at_max = (cnt == MAX);\n\nendmodule',
        explanation: [
          '`parameter WIDTH = 4` — the deliberate knob: instantiate as `counter_wide #(.WIDTH(8))` for an 8-bit counter.',
          '`localparam MAX` — derived from WIDTH; marking it localparam forbids callers from overriding internal logic.',
          '`{WIDTH{1\'b0}}` — width-generic zero: replication builds the right number of bits for ANY WIDTH, instead of hardcoding 4\'d0.',
          'The increment uses a width-generic one: {{(WIDTH-1){1\'b0}}, 1\'b1} is a WIDTH-bit value equal to 1 for any WIDTH.',
          'The counting block is a standard async-active-low-reset design (full treatment in modules 09/10); the lesson here is that every literal scales with the parameter.',
          'Trace at WIDTH=4: cnt counts 0000, 0001, ... 1111, then wraps to 0000; at_max is 1 exactly while cnt = 1111.',
        ],
      },
      {
        title: 'Extension and truncation in action',
        language: 'verilog',
        code:
          '// width_rules.v — what survives an assignment\nmodule width_rules;\n    reg  [3:0] small;      // 4 bits\n    reg  signed [3:0] ssmall;\n    reg  [7:0] wide;       // 8 bits\n    reg  [2:0] narrow;     // 3 bits\n\n    initial begin\n        small = 4\'b0111;        //            7\n        wide  = small;          // zero-extend: 0000_0111 = 8\'d7\n        narrow= small;          // truncate:        _111 = 3\'d7\n\n        small = 4\'b1111;        // 15 (or -1 if signed)\n        wide  = small;          // unsigned src: 0000_1111 = 15\n\n        ssmall = 4\'b1111;       // -1 as a 4-bit signed value\n        wide   = ssmall;        // SIGNED src: sign-extend 1111_1111 = -1 (255 unsigned)\n        $finish;\n    end\nendmodule',
        explanation: [
          '`wide = small` with small = 4\'b0111: the 4-bit source is zero-extended to 8 bits — 00000111.',
          '`narrow = small`: only the low 3 bits survive (truncation) — 111. The high bit is silently dropped.',
          'The decisive case: when the SOURCE is signed (ssmall = -1), extension replicates the sign bit: 4\'b1111 becomes 8\'b1111_1111, preserving the value -1.',
          'Unsigned source 4\'b1111 extends with zeros (15); signed source extends with ones (-1). Same bit pattern, different declared signedness, different result.',
          'Truncation never warns about lost information in plain Verilog — tools may emit width-mismatch warnings; treat them as review flags.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Extension and truncation rules',
        content:
          '  ZERO-EXTEND (unsigned source, wider LHS)\n     src  4\'b0111   ->  LHS 8\'b0000_0111     (pad with 0s on the left)\n\n  SIGN-EXTEND (signed source, wider LHS)\n     src  signed 4\'b1111 (-1) ->  8\'b1111_1111 (-1)   (replicate MSB)\n\n  TRUNCATE (wider source, narrower LHS)\n     src  8\'b1010_0011 ->  LHS 4\'b0011           (keep LSBs, drop MSBs)\n\n  CONTEXT WIDTH (addition)\n     assign {c, s} = a + b;   // LHS 5 bits -> addition runs in 5 bits\n     assign      s  = a + b;  // LHS 4 bits -> carry silently lost',
        caption:
          'Verilog adjusts the right-hand side to the left-hand side: pad, sign-replicate, or drop high bits.',
      },
    ],
    tables: [
      {
        caption: 'Literal forms',
        headers: ['Literal', 'Width', 'Value / meaning'],
        rows: [
          ["4'b1010", '4 bits', '1010 binary = 10'],
          ["8'hFF", '8 bits', 'FF hex = 255'],
          ["12'd255", '12 bits', '255 decimal'],
          ["8'b0000_xxxx", '8 bits', 'Low nibble unknown (x digits)'],
          ["16'hFF_0F", '16 bits', 'Underscores ignored: FF0F hex'],
          ["10 (unsized)", '≥32 bits', 'Signed decimal; beware in assignments'],
          ["8'sh80", '8 bits signed', '-128 (signed hex literal)'],
        ],
      },
      {
        caption: 'parameter vs localparam',
        headers: ['Aspect', 'parameter', 'localparam'],
        rows: [
          ['Who sets it', 'Caller may override per instance (#(.P(v)))', 'Module itself only'],
          ['Typical use', 'Deliberate design knobs (WIDTH, N)', 'Derived values, state encodings, fixed constants'],
          ['Syntax scope', 'Module header #(...) list or body', 'Module body only'],
          ['Risk if misused', 'Callers alter internals unexpectedly', 'None — that is the point'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Relying on unsized literals in assignments: `assign q = 0;` on an 8-bit bus.',
        fix:
          'The unsized 0 is 32 bits; it works here but teaches the wrong habit for nonzero values (truncation surprises). Write width-matched literals: `assign q = 8\'d0;` or use replication `{8{1\'b0}}` in parameterized code.',
      },
      {
        mistake: 'Comparing a signed reg against an unsigned sized literal and trusting the result.',
        fix:
          'Mixed signedness makes the WHOLE comparison unsigned. Use signed literals (8\'sd5), or cast consistently, and keep signedness uniform across every operand of the expression.',
      },
      {
        mistake: 'Making every constant a parameter so callers can override internal encodings.',
        fix:
          'Expose only deliberate knobs as parameters; declare everything derived or internal as localparam. Otherwise an innocent-looking instantiation #(.N(3)) can silently redefine a state encoding.',
      },
    ],
    guidedPractice: {
      title: 'Width arithmetic detective',
      brief:
        'With reg [3:0] a = 4\'b1001; reg [7:0] w; reg [2:0] n; evaluate after each statement: (1) w = a; (2) n = a; (3) w = a + 4\'b0111; (hint: what is the LHS width of the addition?) — give the 8-bit and 3-bit patterns and the decimal values.',
      expectedBehavior:
        '(1) w = 8\'b0000_1001 (zero-extend, 9). (2) n = 3\'b001 (truncate to low 3 bits, 1). (3) the addition context is the LHS width: 8 bits, so 9 + 7 = 16 fits: w = 8\'b0001_0000 (16) — no truncation because the LHS is wider than the operands.',
      hints: [
        'Extension pads with 0 for unsigned sources.',
        'The assignment context (LHS width) participates in expression sizing — preview of module 04.',
      ],
    },
    practiceExercises: [
      {
        title: 'Signedness trap',
        brief:
          'reg signed [7:0] t = -8\'sd1 (bit pattern 1111_1111). Predict the comparison `if (t > 8\'d0)` — true or false — and the fix that makes it evaluate as signed.',
        expectedBehavior:
          'False. The literal 8\'d0 is unsigned, making the whole comparison unsigned: t as unsigned is 255 > 0. Fix: compare against a signed literal (8\'sd0) or a signed-typed constant, keeping ALL operands signed.',
        hints: [
          'Signedness of an expression follows the operands: one unsigned operand poisons the lot.',
          'The s in 8\'sd0 is the fix.',
        ],
      },
      {
        title: 'Parameterize a width-generic reset',
        brief:
          'Inside a module with `parameter WIDTH = 8` and a clocked block resetting a reg [WIDTH-1:0] q, write the reset assignment so it stays correct for any WIDTH, and explain why 8\'h00 would be a bug.',
        expectedBehavior:
          'q <= {WIDTH{1\'b0}}; — replication builds exactly WIDTH zero bits. Hardcoded 8\'h00 works only at WIDTH=8; at WIDTH=12 it would truncate to the low 8 bits, leaving q[11:8]... actually it pads: 12-bit LHS zero-extends the 8-bit literal to 12\'h000 — accidentally still zero, but at WIDTH=4 it truncates to 4\'h0 (still zero by luck). The real hazard is with nonzero constants (e.g. a preset value), so the habit is width-generic literals everywhere.',
        hints: [
          'Replication {N{pattern}} scales with parameters.',
          'Ask what happens to a NONZERO width-hardcoded constant at other widths.',
        ],
      },
    ],
    assessment: {
      title: 'Module 03 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which literal is the 8-bit hex value A5?',
          options: ["8'hA5", "8'dA5", "h8_A5", "8bA5"],
          answer: "8'hA5",
          explanation:
            "Format is <width>'<base><digits>: 8'hA5 is 8 bits in hex. 8'dA5 mixes decimal base with hex digits and is invalid.",
          hint: "Apostrophe, then base letter, then digits.",
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A localparam can be overridden by the caller at instantiation time.',
          answer: 'false',
          explanation:
            'Only parameters are overridable via #(.NAME(value)). localparam constants are internal and derived — that protection is their purpose.',
          hint: 'Local means "not your business, caller".',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'reg [7:0] w; reg signed [3:0] s = 4\'b1100; After w = s; what is w?',
          code:
            'reg [7:0] w;\nreg signed [3:0] s = 4\'b1100;   // -4 as signed 4-bit\nw = s;',
          options: ["8'b1111_1100", "8'b0000_1100", "8'b1100_0000", "8'bxxxx_xxxx"],
          answer: "8'b1111_1100",
          explanation:
            'The signed source sign-extends: the MSB (1) is replicated into the four new high bits. 4\'b1100 (-4) becomes 8\'b1111_1100 (-4). An unsigned source would have zero-extended to 8\'b0000_1100.',
          hint: 'Signed sources replicate the sign bit when widened.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Which statement about `assign y = a + b;` (all 4-bit, y 4-bit) is correct?',
          options: [
            'The carry out of the addition is silently lost — size the LHS ({c,s}) to keep it',
            'Verilog automatically widens y to 5 bits',
            'The addition is performed in 32 bits and never truncates',
            'The + operator is illegal on 4-bit vectors',
          ],
          answer: 'The carry out of the addition is silently lost — size the LHS ({c,s}) to keep it',
          explanation:
            'The expression is evaluated at the width set by its widest operand AND the assignment context — 4 bits here — so the carry is dropped. Writing assign {c, s} = a + b; gives the addition a 5-bit context.',
          hint: 'The LHS participates in expression width.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'What single SystemVerilog type unifies wire and reg (one word)?',
          answer: 'logic',
          explanation:
            'SystemVerilog’s logic type may be driven by an assign or procedurally (but still only one driver). Verilog-2001 has no logic type — this course uses wire/reg.',
          hint: 'It is named after what it models: a logic signal.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Sized literal', definition: 'A constant with explicit width and base: 4\'b1010, 8\'hFF, 12\'d255.' },
      { term: 'parameter', definition: 'A compile-time constant that callers may override per instance.' },
      { term: 'localparam', definition: 'A compile-time constant derived inside the module; callers cannot override it.' },
      { term: 'Sign extension', definition: 'Widening a signed value by replicating its MSB so the numeric value is preserved.' },
      { term: 'logic (SV)', definition: 'SystemVerilog’s single type usable both as net-style and variable-style target (one driver only); preview only in this course.' },
    ],
    revisionSummary: [
      "Literals: <width>'<base><digits>; underscores aid reading; x/z digits legal in binary; unsized constants are 32-bit signed.",
      'parameter = caller-settable knob; localparam = internal derived constant. Choose deliberately.',
      'Assignment adjusts RHS to LHS width: zero-extend (unsigned), sign-extend (signed), truncate (drop MSBs).',
      'Expression width includes the LHS context: assign {c,s} = a+b; preserves the carry, assign s = a+b; loses it.',
      'Mixed signedness makes operations unsigned — keep operands uniformly signed or uniformly unsigned.',
      'SystemVerilog logic = the modern wire/reg unifier; translate it as "either, per its driver".',
    ],
    furtherReading: [
      { label: 'Wikipedia — Two\'s complement', url: 'https://en.wikipedia.org/wiki/Two%27s_complement', kind: 'article' },
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
