import type { TutorialLesson } from '../types';

// Module 13 — Functions, Tasks, Parameters & Generate
export const module13Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m13-l1',
    title: 'Functions: Reusable Combinational Logic',
    summary:
      'Package combinational computations as functions — called inline everywhere, unrolled at synthesis — with popcount and max as worked examples.',
    objectives: [
      'Declare and call Verilog functions with correct return/input rules.',
      'Implement popcount and max-of-two as functions and know what hardware each becomes.',
      'State the restrictions (no timing, no nonblocking, executes in zero time).',
      'Recognize constant function uses (e.g. clog2-style width computation).',
    ],
    whyItMatters:
      'Functions are how RTL stays DRY without losing hardware clarity: the same popcount, saturate or max logic written once and inlined at every call site. Because a function call is just an expression (zero-time, combinational), it fits inside assigns and always blocks naturally — and synthesis unrolls it, so you pay area per call site, exactly as if you had pasted the code. Knowing precisely what a function CAN and CANNOT contain keeps it a tool instead of a trap.',
    prerequisites: ['vlog-m06-l3', 'vlog-m04-l1'],
    explanation:
      'A **function** is a named combinational expression with inputs and exactly one return value:\n\n```\nfunction [3:0] popcount8;\n    input [7:0] data;\n    integer i;\n    begin\n        popcount8 = 4\'d0;               // function name = return variable\n        for (i = 0; i < 8; i = i + 1)\n            popcount8 = popcount8 + data[i];\n    end\nendfunction\n```\n\nSemantics that matter: a function **executes in zero simulation time** (no delays, no waits, no event controls inside); it is called as an EXPRESSION — `assign ones = popcount8(byte);` or inside an always block — and each call site becomes its own copy of the logic at synthesis (functions are inlined, not shared). The function name acts as the return variable: assign to it, and its final value is the return. Inputs are declared inside (Verilog-2001 style, one per line), the function is at least one input, and locals (integers) live inside.\n\nRestrictions, stated as hardware facts: no `#delays` (combinational logic has no clock), no nonblocking assignment (there is nothing to schedule — the result is needed NOW), no event controls, no output ports. What functions CAN do: loops with constant bounds (unrolled), case/if, calls to OTHER functions, and reading module signals. **Constant functions** — functions evaluated at elaboration when all arguments are constants — compute derived constants like address widths, replacing the missing clog2 of Verilog-2001.',
    deepDive:
      '### What hardware a function call builds\n\nEach call site instantiates the function’s logic: `assign a_max = max8(x, y); assign b_max = max8(p, q);` builds TWO comparator circuits. This is the opposite of software linkage (one code body, many callers) — RTL functions are text macros with types and scoping. Budget accordingly: calling popcount8 twelve times costs twelve adder trees. When sharing IS wanted (large logic used once per cycle in one place), it was never a function’s job — it is a module instance (shared by construction) or a datapath register.\n\n### Automatic functions (the SystemVerilog preview)\n\nVerilog-2001 functions use STATIC locals: a function calling ITSELF (recursion) or reentered concurrently shares its locals — usually a bug source. SystemVerilog’s `function automatic` gives each call fresh locals, enabling recursion and safe reuse. In Verilog-2001, write functions non-recursively and unroll loops explicitly (constant bounds). The course stays non-automatic; when you read modern SV code, `automatic` is the keyword to notice.\n\n### Constant functions in practice\n\n```\nfunction integer clog2;\n    input integer value;\n    integer v;\n    begin\n        v = value - 1;\n        for (clog2 = 0; v > 0; clog2 = clog2 + 1)\n            v = v >> 1;\n    end\nendfunction\n// usage: reg [clog2(DEPTH)-1:0] addr;   // elaboration-time width\n```\n\nAll arguments constants → the tool evaluates the loop at elaboration and substitutes the integer. This is the standard Verilog-2001 replacement for SystemVerilog’s $clog2 — and it is why module 09-l3 avoided $clog2: the portable equivalent is a constant function like this one.',
    examples: [
      {
        title: 'popcount8 as a function, called from RTL and from an assign',
        language: 'verilog',
        code:
          '// popcount_func.v — function definition and two call sites\nmodule popcount_func(\n    input  wire [7:0] data_a,\n    input  wire [7:0] data_b,\n    output wire [3:0] ones_a,\n    output wire [3:0] ones_b,\n    output wire       parity_a     // odd-parity bit of data_a\n);\n    // The function: zero-time combinational, inlined per call site.\n    function [3:0] popcount8;\n        input [7:0] data;\n        integer i;\n        begin\n            popcount8 = 4\'d0;\n            for (i = 0; i < 8; i = i + 1)\n                popcount8 = popcount8 + data[i];\n        end\n    endfunction\n\n    assign ones_a = popcount8(data_a);    // call site 1: adder tree A\n    assign ones_b = popcount8(data_b);    // call site 2: adder tree B\n\n    assign parity_a = ^data_a;            // cheaper parity: reduction, not a call\n\nendmodule',
        explanation: [
          'The function assigns its own name as the return variable, accumulating data bits — the module 06 popcount loop, now packaged.',
          'TWO call sites build TWO separate 8-input adder trees: functions inline at synthesis; there is no shared "subroutine" hardware.',
          'parity_a deliberately does NOT call the function: a ^reduction is one XOR tree — cheaper than a 4-bit count. Functions express intent; reductions express parity.',
          'Trace data_a = 8\'b1011_0110: ones_a = 5 (4\'b0101) — five set bits (bits 7,5,4,2,1); parity_a = 5 mod 2 = 1 (odd).',
          'The loop bound (8) is constant → synthesizable unrolling (module 06-l3 rules apply inside functions).',
        ],
      },
      {
        title: 'max function and a constant-function width calculator',
        language: 'verilog',
        code:
          '// max_clog2.v — a max() function and an elaboration-time clog2\nmodule max_demo #(\n    parameter DEPTH = 100\n)(\n    input  wire [7:0] x,\n    input  wire [7:0] y,\n    output wire [7:0] big,\n    output wire [9:0] index      // wide enough for DEPTH-1 = 99\n);\n    // 1. Combinational max: a comparator + 2:1 mux at each call site.\n    function [7:0] max8;\n        input [7:0] a;\n        input [7:0] b;\n        begin\n            if (a > b) max8 = a;\n            else       max8 = b;\n        end\n    endfunction\n\n    // 2. CONSTANT function: evaluated at elaboration (constants in).\n    function integer clog2;\n        input integer value;\n        integer v;\n        begin\n            v = value - 1;\n            for (clog2 = 0; v > 0; clog2 = clog2 + 1)\n                v = v >> 1;\n        end\n    endfunction\n\n    localparam ABITS = clog2(DEPTH);      // clog2(100) = 7\n\n    assign big   = max8(x, y);\n    assign index = {{(10-ABITS){1\'b0}}, {ABITS{1\'b0}}};  // demo of width math\n\nendmodule',
        explanation: [
          'max8 is a comparator-plus-mux: the if inside a function is the same combinational decision as an always @* if — zero time, inlined per call.',
          'Trace max8(8\'hA5, 8\'h3C): 0xA5 > 0x3C → returns 0xA5.',
          'clog2 runs at ELABORATION because DEPTH is a parameter (constant): the loop unrolls symbolically and ABITS becomes the constant 7 (ceil(log2(100)) = 7).',
          'The index assignment demonstrates width-generic padding with the derived ABITS — the module 03/09 replication idiom powered by a constant function.',
          'This clog2 pattern is the portable Verilog-2001 answer to SystemVerilog’s $clog2 — the reason module 09 could avoid SV features.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Function call = inlined logic at every call site',
        content:
          '  SOURCE:                             HARDWARE (after synthesis):\n\n  assign a = popcount8(x);            [adder tree]-- a\n                                      (copy 1 of the function body)\n  assign b = popcount8(y);\n                                      [adder tree]-- b\n                                      (copy 2 of the function body)\n\n  ONE definition, N call sites -> N copies. No sharing, no calls,\n  no stack: a function is a typed text macro with scoping.',
        caption:
          'Functions inline: budget area per call site. Shared logic is module-instance territory, not function territory.',
      },
    ],
    tables: [
      {
        caption: 'Function rules at a glance',
        headers: ['Rule', 'Reason'],
        rows: [
          ['Executes in zero time', 'It is combinational logic, not a process'],
          ['No #delay, no @(event), no wait', 'No hardware meaning inside a pure function'],
          ['No nonblocking assignment', 'Nothing to schedule — result needed immediately'],
          ['Exactly one return (the name)', 'assign to the function name; final value returns'],
          ['At least one input; no outputs', 'Inputs are the function’s operands'],
          ['Constant bounds loops', 'Synthesis unrolls them (module 06-l3)'],
        ],
      },
      {
        caption: 'Function vs module instance',
        headers: ['Aspect', 'Function', 'Module instance'],
        rows: [
          ['Hardware per use', 'Inlined copy at every call', 'One copy per instance (shared by construction)'],
          ['Returns', 'Single value (expression)', 'Any number of output ports'],
          ['Timing', 'Zero-time combinational only', 'Can contain registers/clocks'],
          ['Best for', 'Expressions reused in code text', 'Structural blocks reused in hierarchy'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Putting delays, event controls or nonblocking assignments inside a function.',
        fix:
          'Functions are zero-time combinational expressions: blocking assignments only, no #/@. If you need timing or registers, that logic belongs in an always block or a module.',
      },
      {
        mistake: 'Assuming one function definition shares one copy of hardware across call sites.',
        fix:
          'Every call site inlines its own copy. For big reused logic, instantiate a module — instances are shared by construction.',
      },
      {
        mistake: 'Writing a recursive function (or one calling itself indirectly) in Verilog-2001.',
        fix:
          'Static locals make recursion unsafe (shared state between levels). Unroll with constant-bound loops; SystemVerilog’s automatic functions are the labeled modern answer.',
      },
    ],
    guidedPractice: {
      title: 'Write a saturating adder function',
      brief:
        'Write function [7:0] sat_add8 taking two 8-bit inputs and returning their sum saturated at 255 (no wrap). Use a 9-bit intermediate, then verify sat_add8(200, 100) and sat_add8(100, 50) by hand.',
      expectedBehavior:
        'function [7:0] sat_add8; input [7:0] a; input [7:0] b; reg [8:0] t; begin t = a + b; sat_add8 = t[8] ? 8\'hFF : t[7:0]; end endfunction — trace: 200+100 = 300 = 9\'b1_0010_1100 → t[8]=1 → returns 255. 100+50 = 150 → t[8]=0 → returns 150.',
      hints: [
        'The carry bit of the 9-bit sum IS the saturation condition.',
        'Assign the function name in both branches.',
      ],
    },
    practiceExercises: [
      {
        title: 'Count leading zeros',
        brief:
          'Write function [3:0] clz8 returning the number of leading zeros of an 8-bit input (8 for 0x00). Use a constant-bound loop scanning from the MSB with an early-stick flag (no break statements — model the stop with a flag).',
        expectedBehavior:
        'function [3:0] clz8; input [7:0] d; integer i; reg done; begin clz8 = 4\'d0; done = 1\'b0; for (i = 7; i >= 0; i = i - 1) begin if (!done && !d[i]) clz8 = clz8 + 4\'d1; else done = 1\'b1; end end endfunction — trace 8\'b0010_0000: bits 7,6 are 0 (count 2), bit 5 is 1 → done → returns 2. Synthesizes as a priority chain (unrolled).',
        hints: [
          'A done flag replaces break — the loop body gates updates on it.',
          'Scan from bit 7 downward; every zero before the first 1 counts.',
        ],
      },
      {
        title: 'Constant-function parameter check',
        brief:
          'Given DEPTH = 1000, compute clog2(DEPTH) by hand using the function from Example 2, and state the correct address range declaration.',
        expectedBehavior:
          'v starts at 999; halvings: 999→499→249→124→62→31→15→7→3→1→0: that is 10 iterations with v still >0 after the 10th? count: clog2 increments each time v>0: 999(1), 499(2), 249(3), 124(4), 62(5), 31(6), 15(7), 7(8), 3(9), 1(10) → v=0 after the 10th shift; result 10. Declaration: reg [clog2(DEPTH)-1:0] addr; i.e. reg [9:0] — 1024 >= 1000 ✓.',
        hints: [
          'Each iteration halves v and increments the count while v > 0.',
          'Verify: 2^10 = 1024 >= 1000, 2^9 = 512 < 1000.',
        ],
      },
    ],
    assessment: {
      title: 'Module 13 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does a function call site become at synthesis?',
          options: [
            'Its own copy of the function’s logic (inlined)',
            'A shared subroutine with a call/return path',
            'A clocked register',
            'Nothing — functions are simulation-only',
          ],
          answer: 'Its own copy of the function’s logic (inlined)',
          explanation:
            'Functions are typed text macros: each call site instantiates the logic. Budget area per call site; share hardware with module instances instead.',
          hint: 'Is there any "call" mechanism in hardware?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which construct is ILLEGAL inside a Verilog function?',
          options: ['A for loop with constant bounds', 'An if/else', 'A #5 delay', 'Calling another function'],
          answer: 'A #5 delay',
          explanation:
            'Functions execute in zero time — delays have no meaning (and no synthesizable counterpart). Loops, branches and nested function calls are fine.',
          hint: 'Can combinational logic "wait"?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'What does popcount8 (module 06-style loop) return for 8\'b1011_0110?',
          code:
            'popcount8 = 4\'d0;\nfor (i = 0; i < 8; i = i + 1)\n    popcount8 = popcount8 + data[i];\n// data = 8\'b1011_0110',
          options: ["4'd5", "4'd4", "4'd6", "4'd3"],
          answer: "4'd5",
          explanation:
            'Five set bits (positions 7, 5, 4, 2, 1): the unrolled sum is 5 = 4\'b0101.',
          hint: 'Count the 1s in 1011_0110.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'A constant function (all-constant arguments) is evaluated during elaboration and can size declarations.',
          answer: 'true',
          explanation:
            'With constant inputs the tool evaluates the body at elaboration — the standard Verilog-2001 mechanism for derived widths (the clog2 pattern) before SystemVerilog’s $clog2.',
          hint: 'When can the tool safely run the loop itself?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'What variable name does a function assign to produce its return value?',
          answer: 'its own name',
          explanation:
            'The function identifier acts as the return variable: assignments to popcount8 inside the body define the returned value.',
          hint: 'The function name is the return register.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Function', definition: 'Zero-time combinational expression with inputs and one return (assigned to its own name); inlined per call site.' },
      { term: 'Constant function', definition: 'A function evaluated at elaboration when all arguments are constants; used for derived widths.' },
      { term: 'clog2 pattern', definition: 'The portable Verilog-2001 constant function computing ceil(log2(N)) — the $clog2 replacement.' },
      { term: 'Inlining', definition: 'Synthesis expands each function call into its own copy of the body’s logic.' },
      { term: 'automatic (SV)', definition: 'SystemVerilog keyword giving functions fresh locals per call (recursion-safe) — labeled preview only.' },
    ],
    revisionSummary: [
      'Functions = zero-time combinational expressions: blocking only, no delays/events, return via the function name.',
      'Every call site inlines a copy — area scales with call sites.',
      'Constant functions compute elaboration-time constants (widths) — the portable clog2.',
      'Reductions (^data) beat function calls for parity; pick the cheaper hardware, not just the neater code.',
      'No recursion in Verilog-2001 (static locals); SystemVerilog automatic is the labeled modern answer.',
    ],
    furtherReading: [
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'vlog-m13-l2',
    title: 'Tasks: Simulation Helpers with Timing',
    summary:
      'Package repetitive testbench behavior into tasks — including delays and multiple outputs — and master the function/task divide.',
    objectives: [
      'Declare and call tasks, including ones with delays and multiple outputs.',
      'Build an apply-and-check testbench task and reuse it across vectors.',
      'State the precise function/task differences (timing, outputs, call contexts).',
      'Explain why tasks belong in testbenches (and the rare legal synthesis cases).',
    ],
    whyItMatters:
      'Testbenches drown in repetition: apply vector, wait, check, report — hundreds of times. Tasks are the cure: named, parameterized chunks of procedural behavior that MAY consume time and produce multiple outputs. They are also the structured path to the self-checking testbenches of module 14 — this lesson builds the apply_check task you will use there verbatim.',
    prerequisites: ['vlog-m13-l1', 'vlog-m06-l1'],
    explanation:
      'A **task** is a named procedural subroutine. Unlike functions, tasks MAY contain delays and event controls (they consume simulation time), may have multiple output/inout arguments, and are CALLED AS STATEMENTS (not expressions):\n\n```\ntask apply_check;\n    input [3:0] t_a, t_b;\n    input [3:0] expect_sum;\n    begin\n        a = t_a;  b = t_b;        // drive stimulus\n        #1;                        // TIME passes: settle\n        if ({carry, sum} !== {1\'b0, expect_sum})\n            errors = errors + 1;\n    end\nendtask\n// call: apply_check(4\'d7, 4\'d9, 4\'d0);   // as a statement\n```\n\nThe function/task divide, precisely: functions are zero-time expressions with one return; tasks are time-consuming statements with any number of outputs. A function can call functions but NOT tasks; a task can call both. Tasks cannot appear in continuous assignments or expressions — they live in procedural code, which is why their home is the testbench.\n\n**Synthesis honesty:** most tasks (anything with #, @, waits) are simulation-only, and this course uses them there exclusively. Verilog permits synthesizable tasks in limited forms (zero-time, no timing controls — essentially a multi-output function), but the industry convention keeps design RTL in functions/blocks and tasks in verification; this course follows the convention and labels tasks as sim-side constructs.',
    deepDive:
      '### Task arguments: copy-in, copy-out\n\nTask inputs copy values in at call time; outputs copy out when the task completes. That semantics has a testbench consequence: a task that drives a DUT input REGISTER keeps driving it after returning (the argument was copied into the driver reg) — which is usually what you want for stimulus, and occasionally a surprise when you expected the signal to revert. Inout arguments (rare) pass by reference-flavored copy semantics. For multi-cycle tasks (e.g. "hold these inputs for 3 cycles"), the delay structure lives inside the task and the caller simply waits for the call to return — sequence-like behavior packaged once.\n\n### Local variables and reentrancy\n\nVerilog-2001 tasks have static locals like functions: a task interrupted by another call to itself shares state. In testbenches this rarely matters (calls are sequential), but a task called from a clocked always block AND an initial block could interleave — keep tasks single-caller or design state-free. SystemVerilog again offers automatic for fresh frames; labeled as SV, out of portable scope.\n\n### The apply-and-check pattern, generalized\n\nEvery self-checking testbench is a loop over task calls: `apply_check(a, b, expected)` per vector, with a global error counter and a final PASS/FAIL summary (module 14). The task owns: stimulus driving, settling delay, comparison (with !== to catch x), and error accounting. The testbench owns: vector enumeration (loops, files) and reporting. Separating those responsibilities is what makes a 500-vector suite maintainable — change the checking policy once, in the task.',
    examples: [
      {
        title: 'The apply-and-check task driving an adder (with error counter)',
        language: 'verilog',
        code:
          '// tb_adder_task.v — SIM-ONLY: task-based self-checking skeleton\n`timescale 1ns/1ps\nmodule tb_adder_task;\n    reg  [3:0] a, b;\n    reg        cin;\n    wire [3:0] sum;\n    wire       cout;\n    integer    errors;\n\n    // DUT: the module 05 wide adder\n    adder4_wide dut (.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));\n\n    task apply_check;\n        input [3:0] t_a;\n        input [3:0] t_b;\n        input       t_cin;\n        input [4:0] expect5;      // {cout, sum} expected\n        begin\n            a = t_a; b = t_b; cin = t_cin;   // drive\n            #1;                                // settle (TIME: task advantage)\n            if ({cout, sum} !== expect5) begin\n                errors = errors + 1;\n                $display("FAIL: %0d+%0d+%0d -> %b (expected %b)",\n                         t_a, t_b, t_cin, {cout, sum}, expect5);\n            end\n        end\n    endtask\n\n    initial begin\n        errors = 0;\n        apply_check(4\'d0,  4\'d0,  1\'b0, 5\'b0_0000);\n        apply_check(4\'d7,  4\'d9,  1\'b0, 5\'b1_0000);   // 16\n        apply_check(4\'d15, 4\'d15, 1\'b1, 5\'b1_1111);   // 31\n        apply_check(4\'d3,  4\'d4,  1\'b1, 5\'b0_1000);   // 8\n        $display("done: %0d errors", errors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'The task packages drive-settle-compare; each call is one test vector with its expected 5-bit result {cout, sum}.',
          'The comparison uses !== (four-state): an x anywhere in the DUT output counts as FAIL — the module 14 standard.',
          'Time passes INSIDE the task (#1) — impossible for functions; that is why this is a task.',
          'Expected values verified by hand: 0+0+0 = 0 → 0_0000; 7+9 = 16 → 1_0000; 15+15+1 = 31 → 1_1111; 3+4+1 = 8 → 0_1000.',
          'The error counter + summary line is the self-checking pattern; module 14 replaces hand-written vectors with loops and a reference model.',
        ],
      },
      {
        title: 'A multi-cycle task with an output argument',
        language: 'verilog',
        code:
          '// tb_seq_task.v — SIM-ONLY: a task that runs a timed SEQUENCE\n`timescale 1ns/1ps\nmodule tb_seq_task;\n    reg clk, reset_n;\n    reg       cmd;\n    wire [3:0] count;\n\n    // DUT: a simple enabled up-counter (module 10 style, 4-bit)\n    counter_up_en dut (.clk(clk), .reset_n(reset_n), .en(cmd), .count(count));\n\n    initial clk = 1\'b0;\n    always #5 clk = ~clk;\n\n    reg [3:0] observed;      // copy-out target for pulse_count\n\n    // Task with TIMING and an output: pulse en for n_cycles, report final.\n    task pulse_count;\n        input integer n_cycles;\n        output [3:0] final_count;\n        integer k;\n        begin\n            cmd = 1\'b1;\n            for (k = 0; k < n_cycles; k = k + 1)\n                @(posedge clk);      // wait n clock edges INSIDE the task\n            cmd = 1\'b0;\n            final_count = count;     // copy out the observed value\n        end\n    endtask\n\n    initial begin\n        reset_n = 0; cmd = 0;\n        #12 reset_n = 1;\n        #1;\n        pulse_count(3, observed);    // count 3 edges\n        $display("after 3 enabled edges: %0d", observed);\n        pulse_count(2, observed);\n        $display("after 2 more: %0d", observed);\n        $finish;\n    end\n\nendmodule',
        explanation: [
          'The task waits on CLOCK EDGES (@(posedge clk)) — timing inside tasks is their defining capability, impossible in functions.',
          'The output argument final_count copies the observed count back to the caller’s reg (observed, declared at module level) — multiple outputs are ordinary task arguments.',
          'Trace (counter resets to 0): pulse_count(3) waits 3 edges with en=1 → count=3 → observed=3. pulse_count(2) → count=5.',
          'cmd deasserts after the loop: between calls the counter holds — enable semantics from module 09-l2 exercised by the task’s timing structure.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Function vs task decision path',
        content:
          '   Need a VALUE in an expression?            Need to CONSUME TIME or\n   (assign, if condition, RHS)              drive a multi-step sequence?\n        |                                        |\n        v                                        v\n   [FUNCTION]                              [TASK]\n   zero time, one return              delays/@ allowed, N outputs\n   inlined per call site              called as a statement\n        |                                        |\n        +---> combinational logic          testbench sequences,\n                                           stimulus, checking',
        caption:
          'Expression → function; statement with timing → task. The divide mirrors comb logic vs procedural behavior.',
      },
    ],
    tables: [
      {
        caption: 'Function vs task',
        headers: ['Property', 'Function', 'Task'],
        rows: [
          ['Execution time', 'Zero (combinational)', 'May consume time (#, @)'],
          ['Return values', 'Exactly one (its name)', 'Any number (output/inout args)'],
          ['Call context', 'Expression (assign, RHS, if)', 'Statement only'],
          ['Can call', 'Functions only', 'Functions and tasks'],
          ['Synthesis role', 'Yes (inlined comb logic)', 'Sim-only in this course (labeled)'],
          ['Typical home', 'Design + testbench', 'Testbench'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Calling a task inside an assign or an expression.',
        fix:
          'Tasks are statements; only functions are expressions. Restructure: the task performs the sequence and copies results into regs; the expression reads those regs.',
      },
      {
        mistake: 'Forgetting the settling delay inside a checking task, comparing stale outputs.',
        fix:
          'The apply-and-check task must #1 (or wait an edge) between driving stimulus and comparing — the module 01/05 habit, now packaged once in the task where it can never be forgotten.',
      },
      {
        mistake: 'Putting timing-containing tasks in design RTL "for reuse".',
        fix:
          'Tasks with #/@ are simulation-only by content. Design-side shared logic is a function (zero-time) or a module instance. Keep the task habit in testbench files.',
      },
    ],
    guidedPractice: {
      title: 'Extend apply_check for subtraction',
      brief:
        'Add a task check_sub that drives the adder4 in subtract mode (reuse module 05’s a + ~b + 1 idiom by feeding b\' = ~b and cin = 1) and checks the result. State the expected 5-bit values for a=9, b=5 (9-5) and a=3, b=7 (3-7).',
      expectedBehavior:
        'Drive b = ~5 = 4\'b1010, cin = 1: 9+10+1 = 20 = 1_0100 → expect 5\'b1_0100 (carry=1: no borrow). a=3, b=7: b\' = 1000, 3+8+1 = 12 = 0_1100 → expect 5\'b0_1100 (carry=0: borrow). The task reuses apply_check with the two’s-complement-transformed operands.',
      hints: [
        'Subtraction rides the same adder: invert b, carry-in 1.',
        'carry=1 means NO borrow in subtract mode (module 08).',
      ],
    },
    practiceExercises: [
      {
        title: 'Reset-pulse task',
        brief:
          'Write task do_reset that asserts reset_n low for exactly 2.5 clock periods (a mid-period assertion, per module 09) and releases between edges, then waits one edge. Why is this a task and not a function?',
        expectedBehavior:
          'task do_reset; begin reset_n = 0; #(CLK_PERIOD*2 + CLK_PERIOD/2); reset_n = 1; @(posedge clk); end endtask (with a localparam CLK_PERIOD). It consumes TIME — the defining task property; a function cannot wait.',
        hints: [
          'Mid-period assertion: delay is not a whole number of periods.',
          'Any construct containing # must be a task (or plain initial code).',
        ],
      },
      {
        title: 'Task-driven frame test',
        brief:
          'Using the uart_tx_simple of module 10, write task send_byte(input [7:0] d) that pulses send for one clock and then waits 12 clocks (frame + margin), copying nothing back. Then state how many send_byte calls fit per millisecond if clk is 1 MHz (one bit per clock).',
        expectedBehavior:
          'task send_byte; input [7:0] d; begin din = d; send = 1; @(posedge clk); send = 0; repeat (12) @(posedge clk); end endtask. At 1 MHz with 1 bit/clk: a 10-bit frame takes 10 clocks; the task occupies 13 → ~76,923 calls per ms (10^6 clocks/s ÷ 13).',
        hints: [
          'Pulse send for exactly one edge; hold din stable.',
          'repeat (N) @(posedge clk) waits N edges.',
        ],
      },
    ],
    assessment: {
      title: 'Module 13 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What can a task do that a function cannot?',
          options: [
            'Consume simulation time (#, @) and return multiple outputs',
            'Be called from an always block',
            'Contain combinational logic',
            'Read module signals',
          ],
          answer: 'Consume simulation time (#, @) and return multiple outputs',
          explanation:
            'Tasks are procedural subroutines: timing inside, any number of output/inout arguments. Functions are zero-time single-return expressions.',
          hint: 'What does the apply-and-check task do between driving and checking?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Where can a task be called?',
          options: [
            'As a statement inside procedural code (initial, always)',
            'Inside an assign expression',
            'Inside a continuous assignment’s RHS',
            'Anywhere a wire is declared',
          ],
          answer: 'As a statement inside procedural code (initial, always)',
          explanation:
            'Tasks are statements, not expressions — they live in initial/always (testbench) code. Functions are the expression-callable form.',
          hint: 'Statement vs expression.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'With the pulse_count task from Example 2 (counter starting at 0), what does observed hold after pulse_count(3) followed by pulse_count(2)?',
          code:
            'pulse_count(3, observed);\npulse_count(2, observed);\n// en=1 during pulses, holds between',
          options: ['5', '3', '2', '0'],
          answer: '5',
          explanation:
            'First call: 3 enabled edges → count 3. Between calls en=0 → hold. Second call: 2 more → 5. The task’s timing structure exercises hold-and-resume semantics.',
          hint: 'The counter holds between calls (module 09-l2).',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'A task containing @(posedge clk) can be synthesized into a clocked design block.',
          answer: 'false',
          explanation:
            'Event controls and delays inside tasks are simulation-only content. Design-side shared logic is functions (zero-time) or module instances; course convention keeps tasks in testbenches.',
          hint: 'What hardware would "wait for an edge inside a call" be?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Which comparison operator (two characters) should apply_check use so an x in the DUT output counts as a mismatch?',
          answer: '!==',
          explanation:
            'The four-state inequality fires when outputs differ in ANY respect including x/z — the self-checking standard (module 04/14).',
          hint: 'Four-state not-equal.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Task', definition: 'Procedural subroutine that may consume time and return any number of output arguments; called as a statement.' },
      { term: 'apply-and-check', definition: 'The testbench task pattern: drive stimulus, settle, compare with !==, count errors.' },
      { term: 'Copy-in/copy-out', definition: 'Task argument semantics: inputs copied at call, outputs copied back at completion.' },
      { term: 'Error counter', definition: 'A global integer tallying mismatches; the summary line reports PASS/FAIL (module 14).' },
      { term: 'Sim-side construct', definition: 'A construct (task with timing, delays) labeled as belonging to the verification world.' },
    ],
    revisionSummary: [
      'Tasks: time-consuming statements with multi-output arguments — the testbench subroutine.',
      'Functions: zero-time expressions with one return — the design-side reusable logic.',
      'apply_check owns drive-settle-compare-count; the testbench owns vectors and reporting.',
      'Wait inside tasks with # or @(posedge clk); compare with !== to catch x.',
      'Timing-containing tasks never belong in design RTL — labeled sim-side.',
    ],
    furtherReading: [
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'vlog-m13-l3',
    title: 'Parameters and Generate: Designing Families of Blocks',
    summary:
      'Parameterize modules into product families, and use generate for/if to scale structure itself — building a small reusable RTL library.',
    objectives: [
      'Instantiate parameterized modules with #(.PARAM(value)) overrides.',
      'Write generate-for blocks with genvar to unroll repeated structure.',
      'Use generate-if to include/exclude optional features at elaboration.',
      'Assemble a mini-library: parameterized counter, mux, adder, register bank.',
    ],
    whyItMatters:
      'Parameters and generate are how one verified module serves an entire design: the same FIFO at depth 8 or 8192, the same ALU at 8 or 32 bits. Generate blocks scale STRUCTURE (N instances, conditional pipelines) at elaboration time — the mechanism behind every configurable IP core you will ever use. Mastering elaboration-time thinking (what exists before simulation starts) is the step from writing modules to designing libraries.',
    prerequisites: ['vlog-m13-l1', 'vlog-m09-l1', 'vlog-m03-l3'],
    explanation:
      '**Parameters** are elaboration-time constants declared in the module header. Callers override per instance:\n\n```\ncounter_wide #(.WIDTH(12)) u_cnt (.clk(clk), ...);   // 12-bit counter\n```\n\nEverything derived from parameters (widths, compares, replication counts) re-computes automatically — the width-generic idioms of module 03 ({WIDTH{1\'b0}}, localparam MAX) are what make overriding SAFE. Rule recap: parameter = deliberate knob; localparam = derived, non-overridable.\n\n**Generate constructs** build structure at elaboration:\n\n- **generate-for** with a `genvar` index unrolls a block N times — N instances, N assigns, or N chunks of an always block (each iteration gets its own elaboration-time copy; genvars are NOT runtime variables).\n- **generate-if** includes or excludes a block based on a parameter — optional registers, alternate implementations, debug taps.\n- Each generated item needs its own elaboration name: label the loop (`for (...) begin : g_bits ... end`) so hierarchical names (u_mem.g_bits[3].u_ff) stay addressable.\n\nThe mental model: generate runs BEFORE simulation — it writes the netlist you actually simulate. Conditions must be constant expressions (parameters, localparams); data-dependent structure is runtime territory (FSMs), never generate.',
    deepDive:
      '### Elaboration-time vs runtime: the decisive split\n\nElaboration-time quantities: parameters, localparams, genvars, generate conditions, constant functions. Runtime quantities: signal values, register contents, FSM state. A generate condition CANNOT test a signal (hardware structure is fixed before inputs exist); a runtime if CANNOT change widths or instance counts. The recurring beginner error is trying to parameterize at runtime — e.g. "generate a mux tree of depth chosen by a select input". Depth-from-signal means a runtime structure — which is just... a mux (the structure for ALL depths already exists, selected). Recognizing that "runtime-parameterized hardware" usually already exists as the union structure dissolves the confusion.\n\n### generate-for over instances: the register bank\n\nThe canonical generate-for builds N flops or N sub-blocks with per-index connections:\n\n```\ngenvar i;\ngenerate\n    for (i = 0; i < WIDTH; i = i + 1) begin : g_ff\n        flop_arst u_ff (.clk(clk), .reset_n(reset_n),\n                        .d(din[i]), .q(qout[i]));\n    end\nendgenerate\n```\n\nEach i is a separate instance with a hierarchical name (g_ff[3].u_ff). The same result often comes from one vectorized always block — the professional decision rule: generate-for when the repeated units are INSTANCES (different module types, shared hierarchy) or when per-bit expressions differ structurally; vectorized RTL when the bits are uniform. Both describe the same hardware for uniform flops; generate makes the per-bit structure visible and addressable.\n\n### Parameter validation and defaults\n\nLibrary modules should be USABLE WRONG-PROOF: sensible defaults (WIDTH=8), documented legal ranges, and — where the tool allows — elaboration-time checks (an initial block with $error is sim-only; some tools support elaboration asserts). At minimum, document constraints in the header ("WIDTH >= 1, DEPTH a power of two") and derive everything (ABITS = clog2(DEPTH)) so no caller can desynchronize the widths by hand.',
    examples: [
      {
        title: 'A parameterized 2:1 bus mux and its generate-for bit-slice view',
        language: 'verilog',
        code:
          '// mux2p.v — parameterized bus mux (one-line RTL form)\nmodule mux2p #(\n    parameter WIDTH = 8\n)(\n    input  wire [WIDTH-1:0] a,\n    input  wire [WIDTH-1:0] b,\n    input  wire             s,\n    output wire [WIDTH-1:0] y\n);\n    assign y = s ? b : a;      // width-agnostic conditional mux\nendmodule\n\n// mux2p_gen.v — SAME function, structurally per-bit via generate-for\nmodule mux2p_gen #(\n    parameter WIDTH = 8\n)(\n    input  wire [WIDTH-1:0] a,\n    input  wire [WIDTH-1:0] b,\n    input  wire             s,\n    output wire [WIDTH-1:0] y\n);\n    genvar i;\n    generate\n        for (i = 0; i < WIDTH; i = i + 1) begin : g_bit\n            // Each bit gets its own 1-bit mux (module 08 style).\n            mux2_1bit u_mux (.a(a[i]), .b(b[i]), .s(s), .y(y[i]));\n        end\n    endgenerate\nendmodule\n\n// The 1-bit leaf (for completeness):\nmodule mux2_1bit(\n    input  wire a,\n    input  wire b,\n    input  wire s,\n    output wire y\n);\n    assign y = s ? b : a;\nendmodule',
        explanation: [
          'Both modules are functionally identical for any WIDTH — the vectorized form is terser; the generate form makes the per-bit structure explicit and instance-addressable (g_bit[3].u_mux).',
          'generate-for with genvar i unrolls WIDTH copies at ELABORATION: for WIDTH=8, eight mux2_1bit instances exist before any simulation runs.',
          'The loop label (: g_bit) is required for instance arrays like this — hierarchical names become u_mux.g_bit[2].u_mux.y.',
          'Overriding: mux2p #(.WIDTH(16)) u16 (.a(a16), .b(b16), .s(sel), .y(y16)); — every derived width follows automatically.',
          'Decision rule restated: uniform bits → vectorized RTL; per-bit structural differences or instance arrays → generate.',
        ],
      },
      {
        title: 'generate-if: an optional output register inside one module',
        language: 'verilog',
        code:
          '// datapath_stage.v — optional pipeline register via generate-if\nmodule datapath_stage #(\n    parameter WIDTH   = 8,\n    parameter REGISTER_OUT = 0    // 0 = combinational out, 1 = registered\n)(\n    input  wire             clk,\n    input  wire             reset_n,\n    input  wire [WIDTH-1:0] din,\n    output wire [WIDTH-1:0] dout\n);\n    wire [WIDTH-1:0] computed = din;   // stand-in for real stage logic\n\n    generate\n        if (REGISTER_OUT) begin : g_reg\n            reg [WIDTH-1:0] q;\n            always @(posedge clk or negedge reset_n) begin\n                if (!reset_n) q <= {WIDTH{1\'b0}};\n                else          q <= computed;\n            end\n            assign dout = q;\n        end else begin : g_comb\n            assign dout = computed;    // combinational passthrough\n        end\n    endgenerate\n\nendmodule',
        explanation: [
          'The parameter REGISTER_OUT selects the structure at elaboration: with 1, the module contains flops; with 0, it is pure wiring. Only ONE branch exists in the elaborated design.',
          'The branches are labeled (g_reg/g_comb) so hierarchical paths differ visibly between configurations.',
          'The clocked branch uses the full course template (async active-low reset, width-generic zero) — parameterization never excuses style breaks.',
          'This is exactly how IP cores expose "add output register" checkboxes: one module, elaboration-time variants.',
          'Instantiations: datapath_stage #(.WIDTH(8), .REGISTER_OUT(1)) u_fast (...); vs #(.REGISTER_OUT(0)) — two different hardware shapes from one source.',
        ],
      },
      {
        title: 'The mini-library: four parameterized building blocks',
        language: 'verilog',
        code:
          '// mini_lib.v — the course library in one file (each block reusable)\n\n// 1. Parameterized enabled counter (module 10, width-generic)\nmodule lib_counter #(\n    parameter WIDTH = 8\n)(\n    input  wire             clk,\n    input  wire             reset_n,\n    input  wire             en,\n    output wire [WIDTH-1:0] count\n);\n    reg [WIDTH-1:0] cnt;\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) cnt <= {WIDTH{1\'b0}};\n        else if (en)  cnt <= cnt + {{(WIDTH-1){1\'b0}}, 1\'b1};\n    end\n    assign count = cnt;\nendmodule\n\n// 2. Parameterized register bank with load-enable\n//    AWIDTH is set by the caller to clog2(NREG) (module 13-l1 constant\n//    function) - strictly Verilog-2001-portable, no SV features.\nmodule lib_regbank #(\n    parameter NREG   = 4,\n    parameter WIDTH  = 8,\n    parameter AWIDTH = 2          // = clog2(NREG): 2 for NREG=4\n)(\n    input  wire                  clk,\n    input  wire                  reset_n,\n    input  wire [AWIDTH-1:0]     waddr,\n    input  wire [WIDTH-1:0]      din,\n    input  wire                  we,\n    output wire [WIDTH-1:0]      dout\n);\n    reg [WIDTH-1:0] regs [0:NREG-1];\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin : rst\n            integer k;\n            for (k = 0; k < NREG; k = k + 1)\n                regs[k] <= {WIDTH{1\'b0}};\n        end else if (we) begin\n            regs[waddr] <= din;\n        end\n    end\n\n    // Async read mux (small NREG: distributed shape, module 12-l2)\n    assign dout = regs[waddr];\n\nendmodule',
        explanation: [
          'lib_counter: the module 10 counter made width-generic — the zero literal, the increment one, and the compare all scale with WIDTH.',
          'lib_regbank: an array-based register file; the reset loop (constant NREG bound) unrolls into per-word resets — a generate-equivalent inside an always block.',
          'AWIDTH is a caller-supplied parameter (set to clog2(NREG) via the module 13-l1 constant function) — keeping the library strictly Verilog-2001; SystemVerilog’s $clog2 would automate it but is labeled out of scope for portable RTL.',
          'The read is async (small arrays: distributed shape); a BRAM-shaped version would register the read — the module 12-l2 decision applies to the library too.',
          'These two plus mux2p (Example 1) and the wide adder of module 05 form the reusable kit that modules 14-16 assemble into full designs.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Elaboration: parameters and generate write the netlist',
        content:
          '   SOURCE (one module, parameters)          ELABORATED NETLIST (what sim/synth see)\n\n   mux2p #(.WIDTH(4)) u1 (...)   --->   mux2 with 4-bit ports\n   mux2p #(.WIDTH(16)) u2 (...)  --->   mux2 with 16-bit ports\n\n   generate for i=0..7:                8 instances: g_bit[0].u_mux ... g_bit[7].u_mux\n       mux2_1bit u_mux (...)           (structure EXISTS before simulation)\n\n   generate if (REGISTER_OUT)          one branch only:\n       ...registered...                REGISTER_OUT=1 -> flops present\n   else                                REGISTER_OUT=0 -> pure wiring\n       ...combinational...',
        caption:
          'Parameters and generate run at elaboration: they decide what hardware EXISTS. Runtime signals only steer the hardware that already exists.',
      },
    ],
    tables: [
      {
        caption: 'Elaboration-time vs runtime',
        headers: ['Question', 'Elaboration-time (parameters/generate)', 'Runtime (signals/FSMs)'],
        rows: [
          ['Widths, depths', 'Yes — parameterized declarations', 'Never — structure is fixed'],
          ['Instance counts', 'Yes — generate-for', 'Never'],
          ['Optional features', 'Yes — generate-if', 'Only by enabling/disabling behavior'],
          ['Data-dependent choices', 'No — use the union structure', 'Yes — muxes/FSMs select'],
        ],
      },
      {
        caption: 'The mini-library so far',
        headers: ['Block', 'Parameters', 'Source lesson'],
        rows: [
          ['lib_counter', 'WIDTH', 'module 10'],
          ['mux2p / mux2p_gen', 'WIDTH', 'module 08/13'],
          ['adder (wide form)', 'width via ports', 'module 05'],
          ['lib_regbank', 'NREG, WIDTH', 'module 12'],
          ['datapath_stage', 'WIDTH, REGISTER_OUT', 'module 13'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Hardcoding widths inside a "parameterized" module (8\'h00 reset in a WIDTH-parameter counter).',
        fix:
          'Every literal scales with the parameter: {WIDTH{1\'b0}}, {{(WIDTH-1){1\'b0}}, 1\'b1}, compares against parameter-derived localparams. One hardcoded width silently breaks every override.',
      },
      {
        mistake: 'Writing a generate condition on a runtime signal (if (en) generate...).',
        fix:
          'Generate conditions are elaboration-time constants (parameters only). Runtime choices belong to muxes/FSMs over hardware that already exists.',
      },
      {
        mistake: 'Omitting the loop label on a generate-for, then failing to find instances in waves or constraints.',
        fix:
          'Label every generate block (begin : g_name) — hierarchical instance names and tool addressing depend on it.',
      },
    ],
    guidedPractice: {
      title: 'Parameterize a modulo counter',
      brief:
        'Take counter_mod10 (module 10-l2) and make it fully generic: parameter MOD_VAL (the count of states), with the counter width derived via the clog2 constant function. State the derived width for MOD_VAL = 100 and the reload compare.',
      expectedBehavior:
        'parameter MOD_VAL = 10; localparam ABITS = clog2(MOD_VAL); reg [ABITS-1:0] cnt; reload compare: cnt == MOD_VAL-1. For MOD_VAL=100: clog2(100) = 7 → cnt is [6:0]; compare cnt == 99.',
      hints: [
        'Only the compare constant and the width derive; the structure is unchanged.',
        'clog2(100) = 7 (2^7 = 128 >= 100).',
      ],
    },
    practiceExercises: [
      {
        title: 'Generate a parity tree',
        brief:
          'Using generate-for, build an 8-input XOR tree from 2-input XOR cells (parameterized to N inputs, N a power of two): stage k pairs outputs of stage k-1. State the number of levels and cells for N=8.',
        expectedBehavior:
          'log2(8) = 3 levels; 7 two-input XOR cells (4+2+1). Structure: level 0 cells take inputs 2k, 2k+1; each later level pairs the previous level’s outputs. A generate-for-per-level (nested) or a flat XOR reduction — the generate version makes the tree addressable.',
        hints: [
          'Each level halves the signal count.',
          'N-1 two-input cells total for N inputs.',
        ],
      },
      {
        title: 'Optional gray-code output',
        brief:
          'Extend lib_counter with parameter GRAY_OUT (0/1): when 1, the count output is the binary-to-gray conversion (out = cnt ^ (cnt >> 1)). Use generate-if to switch the output path, and give the gray values for cnt = 0..4 (4-bit).',
        expectedBehavior:
          'generate if (GRAY_OUT) assign count = cnt ^ (cnt >> 1); else assign count = cnt; endgenerate. Gray sequence: 0000, 0001, 0011, 0010, 0110 — adjacent codes differ in exactly one bit (the property gray counters exploit).',
        hints: [
          'Binary→gray is one XOR line: cnt ^ (cnt >> 1).',
          'Verify adjacency: 0011 → 0010 differs in bit 0 only.',
        ],
      },
    ],
    assessment: {
      title: 'Module 13 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'When do generate blocks run?',
          options: [
            'At elaboration — before simulation; they decide what hardware exists',
            'Every clock cycle',
            'When the genvar signal changes',
            'After synthesis, at place-and-route',
          ],
          answer: 'At elaboration — before simulation; they decide what hardware exists',
          explanation:
            'Generate constructs unroll/include/exclude structure using constant (parameter) conditions. By the time simulation starts, the generated netlist is fixed.',
          hint: 'Can structure change while signals exist?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What is wrong with instantiating `counter_wide #(.WIDTH(8))` when the module body contains `cnt <= 8\'d0;` for reset?',
          options: [
            'The hardcoded width ignores the parameter — overrides to other widths break; use {WIDTH{1\'b0}}',
            'Nothing — 8 matches the override',
            'The reset should be synchronous',
            'counter_wide cannot be parameterized',
          ],
          answer: 'The hardcoded width ignores the parameter — overrides to other widths break; use {WIDTH{1\'b0}}',
          explanation:
            'A parameterized module must scale every literal with its parameters. The width-generic reset (and increment) idioms are what make overrides safe.',
          hint: 'What happens with #(.WIDTH(12))?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'datapath_stage with REGISTER_OUT=1: din=5 stable. What is dout after the first clock edge following reset release?',
          code:
            'if (REGISTER_OUT) begin\n    always @(posedge clk...) q <= computed;\n    assign dout = q;\nend\n// computed = din = 5',
          options: ['5', '0', 'x', 'combinational — dout follows din'],
          answer: '5',
          explanation:
            'With the register branch elaborated in, dout is q: the first edge after reset captures computed=5 → dout=5. (With REGISTER_OUT=0 the same module would be pure wiring.)',
          hint: 'Which branch did elaboration keep?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'A generate-for loop index (genvar) can be compared against a runtime signal inside the loop body.',
          answer: 'false',
          explanation:
            'Genvars exist only at elaboration; the loop body cannot test runtime signals for STRUCTURE. Runtime signal tests inside generated logic are ordinary RTL conditions (muxes), which is legal — but they do not change the structure.',
          hint: 'When does a genvar cease to exist?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the width-generic zero assignment for a parameterized reg [WIDTH-1:0] q (one statement).',
          answer: 'q <= {WIDTH{1\'b0}};',
          explanation:
            'Replication builds exactly WIDTH zero bits for any parameter value — the core width-generic idiom.',
          hint: 'Replicate a 1-bit zero WIDTH times.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Parameter override', definition: '#(.NAME(value)) customizing one instance’s elaboration-time constants.' },
      { term: 'generate-for', definition: 'Elaboration-time loop with genvar unrolling structure (instances/assigns) N times.' },
      { term: 'generate-if', definition: 'Elaboration-time conditional including exactly one structural variant.' },
      { term: 'genvar', definition: 'The elaboration-only index of generate loops; not a runtime signal.' },
      { term: 'Mini-library', definition: 'A set of parameterized, style-consistent building blocks reused across designs.' },
    ],
    revisionSummary: [
      'Parameters + derived localparams + width-generic literals = override-safe modules.',
      'generate-for unrolls structure at elaboration; label every loop for hierarchical addressing.',
      'generate-if includes one variant — the mechanism behind IP configuration checkboxes.',
      'Elaboration decides existence; runtime signals only steer existing hardware.',
      'The mini-library (counter, mux, adder, regbank, stage) is the kit modules 14-16 assemble.',
    ],
    furtherReading: [
      { label: 'Yosys documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
