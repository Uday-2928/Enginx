import type { TutorialLesson } from '../types';

/**
 * Module 01 — RTL Fundamentals.
 * What register-transfer level actually means, where RTL sits among the
 * abstraction levels, and the design process that produces verified RTL.
 */
export const module01Lessons: TutorialLesson[] = [
  {
    id: 'rtl-m01-l1',
    title: 'What RTL Actually Is',
    summary:
      'Register-transfer level is a design discipline, not a syntax: state lives in registers, computation lives in combinational logic, and every clock edge performs a simultaneous transfer of new values into registers.',
    objectives: [
      'Define the register-transfer view of a digital circuit and write the transfer equation R_next = f(R, in) for a given block.',
      'Identify the three ingredients of any RTL design: registers, combinational logic and a clocked transfer event.',
      'Explain why the clock cycle, not the second, is the unit of time in RTL.',
      'Trace a small sequential design (an accumulator) cycle by cycle and predict every register value.',
    ],
    whyItMatters:
      'You already know Verilog syntax. What separates an RTL designer from someone who knows Verilog is the mental model behind the code. RTL — register-transfer level — is a contract about structure: memory is concentrated in registers, all the cleverness lives in logic between registers, and nothing in the design remembers anything else. Once you see every module as "a bank of registers plus a combinational cloud that computes their next values", reading, writing, timing-checking and debugging hardware all become systematic. Every later lesson in this course — partitioning, pipelining, timing, lint — is an application of this one idea.',
    prerequisites: [],
    explanation: [
      'A **register** is a bank of flip-flops that samples its inputs on one clock edge and holds the value until the next edge. **Combinational logic** is a cloud of gates with no memory: its output is a pure function of its current inputs. **Register-transfer level (RTL)** is the abstraction in which you describe a digital circuit as exactly these two things, connected so that on every active clock edge, every register simultaneously loads a new value computed from the current register contents and the current inputs.',
      'That behaviour has a compact equation. For every register R in the design:',
      '`R_next = f(R, inputs)` and on each clock edge `R <- R_next`.',
      'Read it aloud: "the next value of R is a combinational function of the current state and the current inputs, and it is transferred into R at the clock edge." The word *transfer* is the point — a clock edge is an event that copies computed values into storage, everywhere in the design at once. This is why RTL code organizes itself into two kinds of processes: **clocked processes** (the register banks, which sample) and **combinational processes or continuous assignments** (the clouds, which compute).',
      'Because all storage is clocked, time in an RTL design is measured in **cycles**, not nanoseconds. Question "how long does this take?" becomes "how many clock edges?" Question "when does this happen?" becomes "on which cycle?" Physical time (nanoseconds per cycle) is set later by the clock frequency and verified by timing analysis — module 08 covers that. At design time you reason in cycles: cycle 1 the input arrives, cycle 2 the adder result lands in a register, cycle 3 it leaves the block. Two designs with identical logic but different register placement differ in cycles-per-operation, and that difference is the subject of pipelining in module 06.',
      'A first worked example: an **accumulator**. It adds each input sample to a running sum. The register is `sum`; the combinational cloud is an adder computing `sum + data_i`; the transfer equation is `sum_next = clear ? 0 : sum + data_i`. Note what the accumulator does *not* have: it has no other memory. If you know `sum` and `data_i` and `clear` right now, you know everything about its future — that totality is the hallmark of the register-transfer style.',
      'Datapath and control are already visible in this tiny example. The adder and the register are the **datapath** (the part that moves and transforms data). The `clear` input is **control** (the part that decides what the datapath does this cycle: accumulate or clear). Real designs scale this partition up — wide arithmetic clouds and many registers on the datapath side, finite-state machines producing control signals on the other — and modules 04 and 05 are devoted to each half.',
    ].join('\n\n'),
    deepDive: [
      'Why does the industry design at this level rather than above or below it? Above RTL (pure behavioural C-like descriptions) you give up cycle accuracy: a "sum all elements" description does not say whether it finishes in 10 cycles or 10,000, and physical hardware needs that answer. Below RTL (gate level) you are hand-placing individual AND gates — thousands of decisions the tool can make better and faster. RTL is the sweet spot: cycle-accurate, yet free of gate-level detail. Synthesis tools exist precisely to compile RTL downward to gates while preserving the cycle-by-cycle behaviour.',
      'The "no other memory" property deserves emphasis because it is what makes RTL verifiable. If every register\'s next value is a function of current registers and inputs, then a simulation (or a careful human trace) of the design is a deterministic walk through states: state in, inputs in, next state out. Races, glitches and metastability live *inside* the combinational clouds and *between* clouds and registers, and the methodology in module 03 is designed so you never have to think about them: by sampling clouds only at clock edges and following the blocking/nonblocking discipline, the gate-level chaos collapses into clean cycle-by-cycle transfers.',
      'The transfer equation also explains the two questions you ask of every line of clocked RTL: *what is being transferred?* (the right-hand side — is the next-value computation what I intend?) and *when is it transferred?* (the enable structure — every cycle, or only when some condition holds?). Debugging in practice is usually finding that one of the two is not what you meant: a wrong term in the cloud, or a missing enable that overwrites a register every cycle.',
    ].join('\n\n'),
    examples: [
      {
        title: 'An 8-bit accumulator: the minimal complete RTL design',
        language: 'verilog',
        code: [
          'module accumulator #(',
          '    parameter integer WIDTH = 8',
          ')(',
          '    input  wire             clk,',
          '    input  wire             reset_n,   // async, active-low',
          '    input  wire             clear,     // control: 1 = clear next edge',
          '    input  wire [WIDTH-1:0] data_i,    // datapath input',
          '    output reg  [WIDTH-1:0] sum_o      // datapath output (register)',
          ');',
          '',
          '    // Clocked process: the register bank. One clock, one reset,',
          '    // nonblocking assignments only.',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n)',
          '            sum_o <= {WIDTH{1\'b0}};',
          '        else if (clear)',
          '            sum_o <= {WIDTH{1\'b0}};',
          '        else',
          '            sum_o <= sum_o + data_i;   // the transfer R <- R_next',
          '    end',
          '',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Lines 1-9: the interface. `data_i` and `sum_o` are the datapath ports; `clear` is a control input; `clk` and `reset_n` are the universal clock and active-low asynchronous reset. `sum_o` is `output reg` because it is assigned inside a clocked process — it synthesizes to a flip-flop, not a wire.',
          'Line 13: `always @(posedge clk or negedge reset_n)` declares this process as register storage: it reacts to the clock edge and to the reset edge, and nothing else.',
          'Lines 14-15: the reset branch. Async active-low style: when `reset_n` is low the register is forced to zero immediately, without waiting for a clock. Every clocked process in this course starts with exactly this structure.',
          'Line 16: the `clear` enable. Control inputs appear as prioritized conditions *before* the default transfer — reset beats clear, clear beats accumulate.',
          'Line 19: the transfer itself. `sum_o <= sum_o + data_i` is the equation `R <- f(R, in)` written literally: the adder (combinational cloud) computes `sum + data_i` continuously, and each clock edge transfers that value into the register.',
          'Cycle trace with reset released and inputs 3, 5, 2: reset edge makes sum_o = 0. Edge 1 samples sum=0 + 3 -> sum_o = 3. Edge 2 samples 3 + 5 -> sum_o = 8. Edge 3 samples 8 + 2 -> sum_o = 10. At 8 bits, adding 10 more to 250 would give 4: the register truncates to WIDTH bits (wrap-around), a datapath width issue module 04 treats formally.',
        ],
      },
      {
        title: 'The same accumulator seen as registers and clouds',
        language: 'verilog',
        code: [
          '// Deliberately verbose form of the same hardware, written so the',
          '// register/cloud separation is explicit. In production you would',
          '// write the compact version from the first example.',
          'module accumulator_explicit #(parameter integer WIDTH = 8) (',
          '    input  wire             clk,',
          '    input  wire             reset_n,',
          '    input  wire             clear,',
          '    input  wire [WIDTH-1:0] data_i,',
          '    output wire [WIDTH-1:0] sum_o',
          ');',
          '',
          '    reg  [WIDTH-1:0] sum_q;              // the register (state)',
          '    wire [WIDTH-1:0] sum_d;              // the next value (from the cloud)',
          '    wire [WIDTH-1:0] sum_plus_in = sum_q + data_i;',
          '',
          '    // Combinational cloud: next-value function f(R, in).',
          '    assign sum_d = clear ? {WIDTH{1\'b0}} : sum_plus_in;',
          '',
          '    // Register bank: pure sampling, no logic mixed in.',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) sum_q <= {WIDTH{1\'b0}};',
          '        else          sum_q <= sum_d;',
          '    end',
          '',
          '    assign sum_o = sum_q;',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Line 12: the state register `sum_q`. The `_q` suffix (pronounced "q") marks a register output — a naming habit this course uses throughout, paired with `_d` for the next value.',
          'Line 13: `sum_d` is the *next* value, computed combinationally. The pair (sum_d, sum_q) makes the transfer equation visible in the source text.',
          'Line 14: an intermediate cloud — an adder whose inputs are the current state and the current input. It runs continuously; only the register decides which of its values becomes state.',
          'Line 17: the next-value function, including the clear override, as a pure combinational assign.',
          'Lines 20-23: the register bank now contains *no* logic at all in its branches — it is a pure sampler. This two-process split is exactly how many teams write production RTL (module 03 turns it into a standard template), and it makes the hardware structure unmistakable to reviewers and to synthesis tools.',
          'Both modules describe the same hardware. The second is more verbose; its value is that "registers + clouds" is not a metaphor here — you can point at each register and each cloud in the source.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The generic RTL block: registers plus clouds',
        content: [
          '                 combinational cloud',
          '              +---------------------+',
          '  inputs ---->|  f(R, in)           |---- next values ----+',
          '  (current)   |  adders, muxes,     |                     |',
          '              |  comparators...     |                     |',
          '              +---------------------+                     |',
          '                                                          v',
          '                 +-----------------------------------+  clock edge',
          '                 |  register bank  R                 |  transfers',
          '                 |  (the only memory in the block)   |  next -> current',
          '                 +-----------------------------------+',
          '                              |',
          '                              +--> outputs (current state)',
          '',
          '  Every clock edge:  R  <-  f(R, in)     (all registers simultaneously)',
        ].join('\n'),
        caption:
          'The register-transfer structure every RTL module shares: state in registers, computation between them, and one simultaneous transfer event per clock edge.',
      },
      {
        kind: 'waveform',
        title: 'Accumulator cycle trace (data 3, 5, 2 after reset)',
        content: [
          '          __    __    __    __    __    __',
          'clk    __|  |__|  |__|  |__|  |__|  |__|  |__',
          '         t0    t1    t2    t3    t4    t5',
          '',
          'clear   ----____________________________----',
          'data_i  ==X==3=====X==5=====X==2=========X==',
          '              (input changes between edges are allowed)',
          '',
          'sum_o   ==X==0=====X==3=====X==8=====X==10==',
          '              ^     ^     ^     ^',
          '              t1    t2    t3    t4: value visible after',
          '              each rising edge (clock-to-Q delay)',
          '',
          'Read: at t1 the register holds 0 (from reset).',
          'At t2 it holds 0+3=3, at t3 3+5=8, at t4 8+2=10.',
        ].join('\n'),
        caption:
          'educational waveform (illustrative): the accumulator register updates only on rising clock edges; the output changes just after each edge and then holds for a full cycle.',
      },
    ],
    tables: [
      {
        caption: 'The three ingredients of RTL and where each lives in the code',
        headers: ['Ingredient', 'What it is', 'Verilog form', 'Synthesizes to'],
        rows: [
          ['Register', 'Clocked storage; the only memory', 'always @(posedge clk ...) with <=', 'Flip-flops'],
          ['Combinational cloud', 'Next-value / output function, no memory', 'always @* with = , or assign', 'Gates, adders, muxes'],
          ['Clock edge', 'The single transfer event', 'posedge clk in the sensitivity list', 'Clock tree + FF clock pins'],
        ],
      },
      {
        caption: 'Datapath versus control in the accumulator',
        headers: ['Aspect', 'Datapath', 'Control'],
        rows: [
          ['Job', 'Move and transform data', 'Decide what happens each cycle'],
          ['In this example', 'Adder, sum register, data_i, sum_o', 'clear input, enable priority'],
          ['Scales up to', 'ALUs, multipliers, shifters, wide registers', 'FSMs, counters-as-controllers, flags'],
          ['Typical signals', 'Wide buses (8-64 bits)', 'Single bits, active-high commands'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake:
          'Thinking RTL is "Verilog with a certain style of syntax" and jumping straight to typing code.',
        fix:
          'RTL is a structural contract: registers for all state, combinational clouds for all computation, clock edges for all transfers. Before writing a module, be able to point at its registers (name them, give widths) and its clouds (one sentence each). If you cannot, the design is not ready to code — that is an architecture problem, and no amount of syntax will fix it.',
      },
      {
        mistake: 'Reasoning about a design in nanoseconds ("this happens 2 ns after that").',
        fix:
          'At design time, reason in clock cycles. The only physical times an RTL designer commits to are clock frequency targets and timing budgets, checked later by timing analysis. Saying "the result is available one cycle after the input" is a design statement; saying "available after 4.2 ns" is a timing-analysis statement that needs a clock period to even be meaningful.',
      },
      {
        mistake: 'Letting one combinational output feed another cloud and then another register with no clear picture of the path, then treating each signal as independent.',
        fix:
          'Clouds compose: output of one cloud is just another input. When tracing or reviewing, draw (even mentally) the directed graph from registers through clouds back to registers. Any cycle entirely inside clouds (no register on the loop) is a combinational loop — a construction bug you must always design out, because it has no stable value.',
      },
    ],
    guidedPractice: {
      title: 'Write the transfer equation and trace a masked accumulator',
      brief:
        'For a variant of the accumulator with an extra enable input `add_en` (accumulate only when add_en is 1, otherwise hold), write the transfer equation in the form R_next = f(R, in), then trace sum_o for: reset released, then cycles with (add_en, data_i) = (1,4), (1,6), (0,9), (1,2). Implement it in Verilog and check your trace.',
      starterCode: [
        'module acc_enabled #(parameter integer WIDTH = 8) (',
        '    input  wire             clk,',
        '    input  wire             reset_n,',
        '    input  wire             clear,',
        '    input  wire             add_en,',
        '    input  wire [WIDTH-1:0] data_i,',
        '    output reg  [WIDTH-1:0] sum_o',
        ');',
        '    always @(posedge clk or negedge reset_n) begin',
        '        if (!reset_n)     sum_o <= {WIDTH{1\'b0}};',
        '        else if (clear)   sum_o <= {WIDTH{1\'b0}};',
        '        else if (add_en)  sum_o <= sum_o + data_i;',
        '        // else hold',
        '    end',
        'endmodule',
      ].join('\n'),
      expectedBehavior:
        'Equation: sum_next = !reset_n ? 0 : clear ? 0 : add_en ? sum + data_i : sum. Trace after reset: 0 (reset value), then 4, 10, 10 (held when add_en=0), 12. The enable changes *when* the transfer happens; the cloud and the register are unchanged in structure.',
      hints: [
        'The enable belongs in the transfer condition, not inside the adder cloud.',
        'When add_en=0 the register does nothing — holding is a transfer of the old value onto itself.',
        'Check the priority order: reset, then clear, then enable, then the default transfer.',
      ],
    },
    practiceExercises: [
      {
        title: 'Down-counter from first principles',
        brief:
          'Write the RTL for an 8-bit down-counter: it loads value_i when load is 1, otherwise decrements by 1 each cycle, stopping at 0 (do not wrap below zero). State the transfer equation first, then implement it, then trace five cycles after loading 3.',
        expectedBehavior:
          'Equation: cnt_next = load ? value_i : (cnt != 0 ? cnt - 1 : cnt). Trace after load of 3: 3, 2, 1, 0, 0, 0. The "stop at 0" clause is a mux in the cloud (a compare against zero plus a mux), not extra storage.',
        hints: [
          'Stopping at zero means the decrement input to the adder/subtractor is gated by a compare.',
          'One register only: the counter value. The compare (cnt == 0) is combinational.',
          'Your clocked block should have the same shape as the accumulator: reset, load, default.',
        ],
      },
      {
        title: 'Find the hidden state',
        brief:
          'A colleague claims this module "has no registers, so it is purely combinational": assign y = en ? (a & b) : last; where last is declared reg and driven by assign last = a. Is the colleague right? Explain which declaration is misleading and what the hardware actually is.',
        expectedBehavior:
          'The colleague is wrong to trust the declaration. `reg` does not mean flip-flop — it means "assigned procedurally". Here `last` is assigned by a continuous assign (legal for a reg in Verilog), so it synthesizes to a wire carrying a & nothing but `a`. The whole module is one cloud: y = en ? (a & b) : a. There is no storage. The lesson: registers are created by clocked processes, not by the reg keyword.',
        hints: [
          'Ask the transfer-equation question: is there any clocked process?',
          'In Verilog-2001, a reg assigned only by assign is still combinational.',
          'Count flip-flops: a clocked process is the only thing that creates one here (there is none).',
        ],
      },
    ],
    assessment: {
      title: 'RTL fundamentals checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'In the register-transfer equation R <- f(R, in), what does f represent physically?',
          options: [
            'The clock distribution network',
            'Combinational logic between registers',
            'The flip-flop clock-to-Q delay',
            'A second register bank',
          ],
          answer: 'Combinational logic between registers',
          explanation:
            'f is the next-value function: pure combinational logic computing the new register contents from current state and inputs. The clock only triggers the transfer; it is not part of f.',
          hint: 'f has no memory of its own.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt:
            'After reset, the enabled accumulator receives (add_en, data_i) = (1,5), then (0,7), then (1,3). What does sum_o hold after the third accumulating cycle?',
          code: [
            'always @(posedge clk or negedge reset_n) begin',
            '    if (!reset_n)    sum_o <= 8\'d0;',
            '    else if (add_en) sum_o <= sum_o + data_i;',
            'end',
          ].join('\n'),
          options: ['5', '12', '8', '15'],
          answer: '8',
          explanation:
            'Cycle 1: 0 + 5 = 5. Cycle 2: add_en=0 so sum_o holds 5 (the 7 is ignored). Cycle 3: 5 + 3 = 8.',
          hint: 'The enable means one of the three inputs never enters the sum.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'In Verilog, declaring a signal as reg guarantees that synthesis will create a flip-flop for it.',
          answer: 'false',
          explanation:
            'reg is a procedural-assignment type, not a storage guarantee. A reg assigned only by continuous assign or in an always @* block is combinational. Flip-flops are created exclusively by clocked processes.',
          hint: 'Where do flip-flops actually come from — the type or the process?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In one word each: what is the unit of time in RTL design, and what event transfers new values into registers?',
          answer: 'cycle; clock edge',
          explanation:
            'RTL designs are reasoned about in clock cycles; the clock edge (rising, in this course) is the event that simultaneously transfers every computed next value into its register.',
          hint: 'Nanoseconds are the wrong unit until timing analysis begins.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt:
            'A designer writes a block whose combinational output y feeds a chain of logic that eventually loops back to an input of y, with no register anywhere in the loop. What is this construction called, and why must it be designed out?',
          options: [
            'A pipeline; it improves timing',
            'A combinational loop; it has no stable value',
            'A latch; it holds state safely',
            'A synchronizer; it cleans up metastability',
          ],
          answer: 'A combinational loop; it has no stable value',
          explanation:
            'A feedback path with no register is a combinational loop: y depends on y. Such a network has no well-defined steady value and behaves unpredictably in simulation and synthesis. Registers are what break feedback loops into defined cycles.',
          hint: 'Ask the transfer-equation question: can f be evaluated?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      {
        term: 'Register',
        definition:
          'A bank of flip-flops clocked by a common clock edge; the only storage element in RTL.',
      },
      {
        term: 'Combinational cloud',
        definition:
          'Memory-free logic whose outputs are pure functions of current inputs; computes register next-values and outputs.',
      },
      {
        term: 'Register transfer',
        definition:
          'The simultaneous loading of every register with its computed next value on a clock edge: R <- f(R, in).',
      },
      {
        term: 'Cycle',
        definition:
          'One clock period; the unit of time in which RTL behaviour is specified and verified.',
      },
      {
        term: 'Datapath',
        definition:
          'The part of a design that carries and transforms data: adders, registers, muxes, wide buses.',
      },
      {
        term: 'Control',
        definition:
          'The part of a design that decides what the datapath does each cycle: enables, selects, FSM outputs, single-bit commands.',
      },
    ],
    revisionSummary: [
      'RTL = registers (all state) + combinational clouds (all computation) + one simultaneous transfer per clock edge.',
      'Transfer equation: R_next = f(R, in), applied at every active clock edge.',
      'Time in RTL is measured in clock cycles; physical nanoseconds are a later, separately verified concern.',
      'Enables and overrides (reset, clear, load) change *when* or *what* is transferred, not the register/cloud structure.',
      'Datapath moves data; control decides. Every real design is a partition of the two.',
      'reg does not imply a flip-flop; only clocked processes create registers.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Register-transfer level',
        url: 'https://en.wikipedia.org/wiki/Register-transfer_level',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Flip-flop (electronics)',
        url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)',
        kind: 'article',
      },
      {
        label: 'All About Circuits — Digital textbook',
        url: 'https://www.allaboutcircuits.com/textbook/digital/',
        kind: 'article',
      },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'rtl-m01-l2',
    title: 'Abstraction Levels: Behavioural, RTL, Gate',
    summary:
      'The same function can be described as an algorithm, as registers-and-clouds, or as a netlist of gates. Knowing what each level specifies — and what it leaves out — tells you which level to work at and what you are committing to when you do.',
    objectives: [
      'Distinguish behavioural, RTL and gate-level descriptions by what each one specifies about time.',
      'Recognize that only the RTL level is simultaneously cycle-accurate and tractable to write by hand.',
      'Predict what a synthesis tool does to each kind of description.',
      'Convert a behavioural description of a small function into cycle-accurate RTL.',
    ],
    whyItMatters:
      'The most expensive misunderstandings in hardware teams come from mixing levels without noticing. A verification engineer assumes cycle accuracy from a model that is only algorithmic; a designer hand-optimizes gate-level details the synthesizer was going to rebuild anyway; a "behavioural" Verilog block quietly becomes synthesizable and doubles the area. As a designer you will live at RTL — but you must be able to read all three levels fluently: behavioural models as references, gate-level netlists as evidence, and your own RTL as the contract between them.',
    prerequisites: ['rtl-m01-l1'],
    explanation: [
      'A digital function can be described at many levels of detail, and the levels differ in one specific dimension: **how precisely they specify time**. A **behavioural description** states *what* must be computed and is loose about *when*: "the output is the average of the last four samples." An **RTL description** states exactly *when*, in clock cycles: "the average appears one cycle after the fourth sample arrives," and it states the hardware structure: three delay registers, an adder tree, a register on the output. A **gate-level description** states everything at the finest grain — individual AND/OR/flip-flop cells and their connections — which is what a synthesis tool emits and what physical verification needs.',
      'The trade-off is expressiveness versus tractability. Behavioural descriptions are short and fast to simulate (a C model of a filter runs millions of times faster than its gate netlist), but they leave the hardware questions unanswered: how many cycles? how much area? which registers? Gate level answers everything but is unreadable at scale — a CPU is millions of gates. RTL sits in the middle and is the level humans design at: precise enough that synthesis can produce real gates from it, abstract enough that a person can still read it.',
      'A key fact to internalize: **Verilog is not one abstraction level** — it is a language usable at all of them. The same module header can introduce a behavioural function, cycle-accurate RTL, or a structural netlist of gate primitives. What decides the level is *which constructs you use and what your code says about time*: a `for` loop over an array computing a whole frame at once is behavioural; `always @(posedge clk)` blocks with nonblocking assignments are RTL; instantiations of `and`, `or` and `nand` primitives are structural gate level.',
      'Synthesis is the compiler from higher levels to lower ones, and it treats the levels very differently. From RTL it does most of its valuable work: mapping your `+` to a carry chain, your muxes to LUTs or gates, your clocked processes to flip-flops, and optimizing across cloud boundaries. From behavioural code that says nothing about cycles, a synthesis tool either refuses, or makes arbitrary architectural choices you did not intend — which is why "synthesizable subset" discipline (module 03) matters: within it, the tool preserves your cycle-by-cycle intent exactly. From gate level there is nothing left to synthesize; tools instead do placement and routing.',
      'The practical workflow uses all three: a **behavioural reference model** (often C, or untimed Verilog) defines correctness; the **RTL** implements it cycle by cycle and is verified against the reference; synthesis produces the **gate netlist**, which is re-simulated against the same vectors to prove the tool preserved behaviour, then handed to physical design. Each arrow is a translation that can introduce errors, which is why each level is verified against the level above it.',
    ].join('\n\n'),
    deepDive: [
      'Consider a 4-sample moving average. Behaviourally: `y = (s0 + s1 + s2 + s3) / 4` computed the instant samples are available — the description contains no registers, so it cannot tell you when y is ready. RTL: keep a 3-deep shift register (three 8-bit flip-flop banks), add all four taps with an adder tree, register the result. Now time is specified: first result two cycles after the stream starts (one to fill the delay line and add, one for the output register), one result per cycle thereafter. The RTL made three decisions the behavioural description never faced: pipeline depth (two cycles of latency), the width of the sum (10 bits before division, so no overflow), and where the division by 4 became a 2-bit right shift. Writing RTL *is* making these decisions; that is the job.',
      'Simulation speed differences are enormous and flow from the same distinction. A gate-level netlist must evaluate every single cell every delta-cycle — a 4-sample average is hundreds of events; the behavioural one-liner is a handful. This is why verification hierarchies exist: run millions of transactions against the behavioural model, thousands against RTL, and only a handful of regression vectors against the post-synthesis netlist. A designer who understands which level a claim was checked at is much harder to fool than one who hears "it passed verification" and stops asking.',
      'One subtlety worth naming: **the levels are about what is specified, not about file size.** A 5,000-line Verilog file full of clocked processes is still RTL (though badly organized); a 20-line always block with an untimed for-loop over a frame buffer is behavioural. Ask: does this code say which clock edge each effect happens on? If yes — RTL. If the answer is "some time after start" — behavioural. If the answer is "delta cycles between primitive gates" — gate level.',
    ].join('\n\n'),
    examples: [
      {
        title: 'One function, three levels: 4-sample moving average',
        language: 'verilog',
        code: [
          '// LEVEL 1: BEHAVIOURAL. Computes the whole answer at once.',
          '// No clock, no registers, no cycle information. Good as a',
          '// reference model; not a hardware implementation.',
          'function [9:0] movavg_behav(',
          '    input [7:0] x0, x1, x2, x3',
          ');',
          '    reg [9:0] sum;',
          '    integer i;',
          '    begin',
          '        sum = 10\'d0;',
          '        for (i = 0; i < 4; i = i + 1) begin',
          '            case (i)',
          '                0: sum = sum + x0;',
          '                1: sum = sum + x1;',
          '                2: sum = sum + x2;',
          '                3: sum = sum + x3;',
          '            endcase',
          '        end',
          '        movavg_behav = sum >> 2;   // divide by 4',
          '    end',
          'endfunction',
          '',
          '// LEVEL 2: RTL. Cycle-accurate: one sample per clock, result one',
          '// cycle after the 4th sample. Registers and clouds are explicit.',
          'module movavg_rtl (',
          '    input  wire       clk,',
          '    input  wire       reset_n,',
          '    input  wire [7:0] x_i,      // sample stream, one per cycle',
          '    output reg  [7:0] y_o       // 4-sample average, registered',
          ');',
          '    reg [7:0] x1_q, x2_q, x3_q;   // 3-deep delay line',
          '    reg [9:0] sum_q;              // full-width sum',
          '',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) begin',
          '            x1_q  <= 8\'d0;  x2_q <= 8\'d0;  x3_q <= 8\'d0;',
          '            sum_q <= 10\'d0;',
          '            y_o   <= 8\'d0;',
          '        end else begin',
          '            x1_q  <= x_i;              // shift the window',
          '            x2_q  <= x1_q;',
          '            x3_q  <= x2_q;',
          '            sum_q <= x_i + x1_q + x2_q + x3_q;  // adder tree',
          '            y_o   <= sum_q[9:2];       // divide by 4 via shift',
          '        end',
          '    end',
          'endmodule',
          '',
          '// LEVEL 3: GATE-LEVEL (structural). Every cell named. What synthesis',
          '// emits; unreadable at scale, but what physical tools consume.',
          'module and2 (input wire a, b, output wire y);',
          '    and g1 (y, a, b);',
          'endmodule',
        ].join('\n'),
        explanation: [
          'The behavioural function (lines 1-21) is a pure computation: given four samples it returns the average with no notion of clock. The for-loop unrolls to four adds; there is no hardware implied and no timing information. It is perfect as a verification reference.',
          'The RTL module (lines 25-47) makes the hardware decisions explicit: three delay registers hold the window (line 31), one 10-bit register holds the sum (line 32) — 10 bits because four 8-bit values can sum to 1022, needing 10 bits — and the output register `y_o` produces one result per cycle.',
          'Line 43: the sum uses the full 10-bit width before shifting; truncating to 8 bits before the shift would corrupt results (module 04 quantifies width growth).',
          'Line 44: dividing by 4 is a 2-bit right shift, chosen because shifting by a constant is free in hardware while a divider is expensive. That is an RTL-level decision a behavioural description never had to make.',
          'The gate-level stub (lines 51-53) shows the bottom of the stack: a single primitive instantiation with no behaviour beyond the cell itself. A real synthesized movavg_rtl would be dozens of such cells.',
          'Trace of movavg_rtl for samples 4, 8, 12, 16 arriving on consecutive cycles: cycle 1 edges: x1_q=4, sum=4. Cycle 2: x1_q=8, x2_q=4, sum=12. Cycle 3: x1_q=12, x2_q=8, x3_q=4, sum=24. Cycle 4: x1_q=16, x2_q=12, x3_q=8, x4 term x_i=16, sum=40; but note the sum at cycle 4 uses the window 16,12,8,4 — y_o gets sum_q from cycle 3 (window 12,8,4,0) shifted, and the first *full-window* average (16+12+8+4)=40>>2=10 appears on y_o one cycle after cycle 4. The delay line means early outputs average against zeros — a corner case the spec must define (module 02 makes this explicit).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Levels and the tools that move between them',
        content: [
          '   SPECIFICATION      ("average the last 4 samples")',
          '        |',
          '        v',
          '   BEHAVIOURAL        what, loosely when      C model / untimed Verilog',
          '        |                                        (reference model)',
          '        |  designer decides: cycles, registers, widths',
          '        v',
          '   RTL                what, exactly when      registers + clouds',
          '        |                                        (the design itself)',
          '        |  synthesis (module 10)',
          '        v',
          '   GATE LEVEL         cells and nets          netlist of primitives',
          '        |                                        (synthesizer output)',
          '        |  place & route',
          '        v',
          '   PHYSICAL           transistors / layout    GDSII',
        ].join('\n'),
        caption:
          'Design flows downward; verification compares each level against the one above. The designer authors at RTL; tools author the levels below.',
      },
      {
        kind: 'block',
        title: 'movavg_rtl as registers and clouds',
        content: [
          '  x_i ----+--[cloud: 3 x 8-bit adder tree]--->[sum_q 10-bit]-->>2-->[y_o 8-bit]',
          '          |            ^',
          '          +-->[x1_q]---+',
          '               |',
          '               +-->[x2_q]-+',
          '                          |',
          '                          +-->[x3_q]',
          '',
          '  Registers: x1_q, x2_q, x3_q, sum_q, y_o  (all clocked together)',
          '  Clouds:    adder tree, shift-by-2 (wiring only)',
          '  Latency:   full-window average = 2 cycles after 4th sample',
          '  Throughput: 1 average per cycle',
        ].join('\n'),
        caption:
          'The same moving average at RTL: five register banks, one adder tree, and a free constant shift. Every hardware decision is visible.',
      },
    ],
    tables: [
      {
        caption: 'Abstraction levels compared',
        headers: ['Property', 'Behavioural', 'RTL', 'Gate level'],
        rows: [
          ['Specifies function', 'Yes', 'Yes', 'Yes'],
          ['Specifies cycles', 'No', 'Yes, exactly', 'Yes (in delta cycles)'],
          ['Specifies registers', 'No', 'Yes', 'Yes (as cells)'],
          ['Specifies gates/area', 'No', 'No (implied)', 'Yes'],
          ['Human-writable at scale', 'Yes', 'Yes', 'No'],
          ['Simulation speed', 'Fastest', 'Medium', 'Slowest'],
          ['Synthesis input?', 'Limited / ambiguous', 'The standard input', 'Output, not input'],
          ['Typical artifact', 'C reference model', 'The design', 'Netlist for P&R'],
        ],
      },
      {
        caption: 'Which Verilog construct signals which level',
        headers: ['Construct', 'Level it indicates'],
        rows: [
          ['always @(posedge clk) with <=', 'RTL (register)'],
          ['always @* / assign', 'RTL (cloud) or behavioural (if untimed math)'],
          ['for-loop over a frame / array, no clock', 'Behavioural'],
          ['wait statements, #delays in design code', 'Behavioural (not synthesizable)'],
          ['and/or/nand primitive instantiations', 'Gate level (structural)'],
          ['Instance of a cell library module', 'Gate level (structural)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Treating any Verilog that compiles as "RTL" and expecting synthesis to preserve it.',
        fix:
          'Test each process with the timing question: does it say what happens on each clock edge? Clocked processes and always @* clouds do; #delay waits, frame-sized loops and event-free computations do not. Keep behavioural code in verification files, clearly marked, and keep the synthesizable design free of timing constructs.',
      },
      {
        mistake: 'Hand-writing gate-level logic inside a design "because it will be faster".',
        fix:
          'Modern synthesis re-derives gate structure from the RTL clouds and will typically override your gate-level micro-decisions — you inherit the unreadability without the benefit. Spend the effort where it pays: architecture, register placement and clean clouds (modules 06 and 08). Write gates only when instantiating vendor primitives deliberately (e.g. block RAM or DSP macros).',
      },
      {
        mistake: 'Using a behavioural model as if it were cycle-accurate during planning ("the C model does it in one line, so it is cheap").',
        fix:
          'The C model contains zero architectural information. Latency, throughput and area come from the RTL decisions: how many registers, how the work is split across cycles. Derive those numbers from the block diagram, never from the line count of a behavioural description.',
      },
    ],
    guidedPractice: {
      title: 'Convert a behavioural description to RTL',
      brief:
        'Behavioural spec: "y is the maximum of the last two inputs x[n] and x[n-1]". Convert this into cycle-accurate RTL: decide the registers, the cloud, the latency and the output timing, then implement it as a module max2_rtl with clk, reset_n, x_i[7:0], y_o[7:0].',
      starterCode: [
        'module max2_rtl (',
        '    input  wire       clk,',
        '    input  wire       reset_n,',
        '    input  wire [7:0] x_i,',
        '    output reg  [7:0] y_o',
        ');',
        '    // TODO: one delay register + one compare/mux cloud + output register',
        'endmodule',
      ].join('\n'),
      expectedBehavior:
        'One 8-bit register x1_q delays the stream; the cloud is the compare-and-mux max(x_i, x1_q); y_o registers the result. Latency: y_o shows max(x[n-1], x[n-2]) — i.e. the max of consecutive pairs, one pair per cycle, two cycles after the pair entered. Code: always block with x1_q <= x_i; y_o <= (x_i > x1_q) ? x_i : x1_q;.',
      hints: [
        'Ask the RTL question: what is in a register two cycles from now? The previous sample, and the registered max.',
        'The compare > is the cloud; the mux selecting the larger value is part of the same cloud.',
        'Trace samples 3, 9: after two edges y_o should hold 9.',
      ],
    },
    practiceExercises: [
      {
        title: 'Classify the level',
        brief:
          'Classify each fragment as behavioural, RTL or gate-level, and say what timing information it gives: (a) always @(posedge clk) q <= d & en; (b) assign y = (a > b) ? a : b; (c) a frame loop computing a 1024-point sum then a #10 wait; (d) buf g1 (y, a);',
        expectedBehavior:
          '(a) RTL — register with enable, transfer on every posedge. (b) RTL cloud — combinational compare/mux, no storage. (c) Behavioural — untimed bulk computation plus a simulation delay; not synthesizable. (d) Gate level — one named primitive cell.',
        hints: [
          'Question one per fragment: which clock edge does the effect happen on?',
          '(b) has no clocked process — it cannot be more than a cloud.',
          'A # delay belongs in testbenches, not design code.',
        ],
      },
      {
        title: 'Cost of the level below',
        brief:
          'The movavg_rtl module has 5 register banks (3+10+8 = 21 flip-flops) and 3 adders. Estimate the flip-flop count for a 64-sample moving average keeping the same structure, and explain why the behavioural one-liner gives no hint of that growth.',
        expectedBehavior:
          'A 64-deep window needs a 63-deep delay line (63 x 8 = 504 flip-flops) plus the sum and output registers, so roughly 504 + 10 + 8 = 522 flip-flops versus 21 — a 25x growth the behavioural description (still one line) completely hides. Structure and cost live at RTL, not in the algorithm statement.',
        hints: [
          'A 64-sample window holds 63 old samples plus the live input.',
          'Count flip-flops, not lines of code.',
          'The adder tree also grows (64 inputs) — the point is that no level above RTL can tell you this.',
        ],
      },
    ],
    assessment: {
      title: 'Abstraction levels checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'What does an RTL description specify that a behavioural description does not?',
          options: [
            'The function of the design',
            'Which clock edge each result is produced on',
            'The voltage levels',
            'The testbench',
          ],
          answer: 'Which clock edge each result is produced on',
          explanation:
            'The defining addition of RTL over behavioural is exact cycle timing (and hence register placement). Function is specified at both levels; voltage and testbenches are outside all three levels.',
          hint: 'Think about the word "transfer" in register-transfer level.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'A colleague hands you a Verilog block whose body is one always @(posedge clk) process computing a 256-element sum each cycle via a for-loop. What is it?',
          options: [
            'Pure RTL; any clocked process is RTL',
            'Gate level because it has a loop',
            'Behavioural inside a clocked wrapper: the loop hides a huge combinational cloud with no pipeline, and synthesis will build exactly that',
            'Not synthesizable at all, in any form',
          ],
          answer:
            'Behavioural inside a clocked wrapper: the loop hides a huge combinational cloud with no pipeline, and synthesis will build exactly that',
          explanation:
            'The posedge wrapper makes it technically synthesizable, but the 256-input adder tree is one enormous cloud with no registers inside — functionally behavioural thinking wearing RTL clothes. It will be a timing disaster; the fix is architectural (pipelining, module 06), not syntactic.',
          hint: 'The wrapper does not pipelining make.',
          difficulty: 'hard',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'A gate-level netlist of a design will always have more simulation events per second than the RTL of the same design.',
          answer: 'true',
          explanation:
            'Gate level evaluates every primitive cell on every delta cycle, while RTL evaluates one process per clock edge and cloud. That is why netlist simulation is reserved for spot-check regressions rather than full verification.',
          hint: 'Count the things being evaluated in each style.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt:
            'In movavg_rtl, samples 4 and 8 arrive on consecutive cycles (and reset value 0 fills the rest of the window). What is sum_q after the second sample has been sampled?',
          code: 'sum_q <= x_i + x1_q + x2_q + x3_q;',
          options: ['12', '4', '8', '16'],
          answer: '12',
          explanation:
            'After the second edge, the window is (x_i=8, x1_q=4, x2_q=0, x3_q=0), so sum_q = 8 + 4 + 0 + 0 = 12. Early outputs average against reset zeros — the fill-up corner case.',
          hint: 'The delay line starts empty.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt:
            'Name the two artifacts that sandwich the RTL in a standard flow: the level used as the correctness reference above it, and the artifact synthesis produces below it.',
          answer: 'behavioural reference model above; gate-level netlist below',
          explanation:
            'The behavioural model (often C) defines what "correct" means; synthesis compiles RTL to the gate-level netlist, which is verified against the same vectors and then goes to physical design.',
          hint: 'One answers "what", the other answers "which gates".',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      {
        term: 'Behavioural description',
        definition:
          'A specification of function without cycle timing; used as reference model, not as implementation.',
      },
      {
        term: 'Cycle-accurate',
        definition:
          'Specifies exactly which clock edge every observable effect occurs on — the defining property of RTL.',
      },
      {
        term: 'Gate-level netlist',
        definition:
          'A structural list of primitive or library cells and their connections; synthesis output.',
      },
      {
        term: 'Synthesizable subset',
        definition:
          'The disciplined part of the HDL language with an unambiguous hardware meaning; the part synthesis preserves.',
      },
      {
        term: 'Reference model',
        definition:
          'A behavioural implementation (often C) used to check the RTL against during verification.',
      },
    ],
    revisionSummary: [
      'Levels differ in how much time they specify: behavioural (function only), RTL (exact cycles), gate (cells and nets).',
      'RTL is the human design level: cycle-accurate but free of gate detail; synthesis bridges RTL to gates.',
      'Verilog serves all levels; the constructs (clocked processes vs untimed loops vs primitives) reveal which one you are writing.',
      'RTL authorship makes the real decisions: latency, width, register placement — none of which exist in a behavioural description.',
      'Verification compares levels: reference model vs RTL vs netlist, in decreasing volume.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Register-transfer level',
        url: 'https://en.wikipedia.org/wiki/Register-transfer_level',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Logic synthesis',
        url: 'https://en.wikipedia.org/wiki/Logic_synthesis',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Hardware description language',
        url: 'https://en.wikipedia.org/wiki/Hardware_description_language',
        kind: 'article',
      },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'rtl-m01-l3',
    title: 'The Design Process: Spec to Verified RTL',
    summary:
      'RTL design is a loop, not a typing exercise: pin down the specification, choose an architecture, write RTL to that architecture, verify against the spec, lint, and only then synthesize. Each stage has an artifact and an exit criterion.',
    objectives: [
      'Name the stages of the RTL design loop and the artifact each stage produces.',
      'State what a specification must pin down before architecture work starts.',
      'Explain why verification starts at the specification stage, not after coding.',
      'Apply the loop to a small example and identify where each later module of this course plugs in.',
    ],
    whyItMatters:
      'Bugs get more expensive by roughly an order of magnitude per stage they survive: free to fix in the spec, cheap in RTL, costly in the netlist, catastrophic in silicon. The design loop exists to force errors to surface at the cheapest possible stage. Teams that "start coding" first reliably produce designs that work in simulation and fail in review, synthesis, or the lab. Everything else in this course — partitioning, coding standards, timing awareness, lint — is one stage of this loop done well; this lesson is the map.',
    prerequisites: ['rtl-m01-l1', 'rtl-m01-l2'],
    explanation: [
      'The RTL design process is a loop with five stages. **1. Specification:** a written document of what the block must do — function, interfaces, performance, corner cases. **2. Architecture (micro-architecture):** the block diagram — the registers, the datapath/control partition, the interfaces, the cycle budget. **3. RTL coding:** implementing the architecture in Verilog, following the coding methodology. **4. Verification:** simulation against the spec (self-checking testbenches), plus lint and reviews. **5. Synthesis awareness:** checking that the RTL meets timing and area targets, feeding violations back as RTL changes. The loop closes: every finding sends you back to an earlier artifact, and each iteration should end with updated documents, not just updated code.',
      'The **specification** is the contract every later stage checks against. A usable RTL spec pins down: the function (including what the block does *not* do); every interface (signal names, widths, direction, protocol, reset values); the clock and reset scheme; performance (cycles per operation, latency, target frequency); and the corner cases (what happens on simultaneous events, at boundary values, when inputs misbehave). If the spec says only "8-bit counter", it has not been written yet — an 8-bit counter spec also says what load does when count is nonzero, whether it wraps at 255 or stops, and which cycle the rollover flag appears on.',
      'The **architecture** stage turns the spec into structure: a block diagram with named modules, a register map if the block is configurable, and a cycle-by-cycle behavioural outline of the interesting sequences. Two architecture outputs dominate everything downstream: the **register list** (which determines state, area, and much of the timing structure) and the **datapath/control partition** (which determines how cleanly the design will code and verify). This is where latency and throughput are *decided*; coding cannot recover from an architecture with the wrong number of pipeline registers — it can only decorate it.',
      '**Verification is not a post-coding activity.** The moment the spec is written you can derive its observable behaviours as a test list; the moment the block diagram exists you can review it for missing resets, unregistered outputs on long paths, and missing handshake signals. Coding then becomes *transcribing an already-reviewed architecture*, and the testbench — ideally written in parallel with the RTL — checks the code against the spec, not the code against the code. A design whose only verification is "I simulated it and it looked right" is unverified; a design with a test list derived from the spec, each test passing with self-checking code, is on solid ground.',
      'The loop ends (for a given iteration) at **synthesis and timing**, which is feedback, not verdict: a timing violation is information about the architecture (module 08), a lint warning is information about the code (module 09), and both flow back as changes to earlier artifacts. What you must never do is let the loop run backwards silently — changing RTL to satisfy the testbench rather than the spec, or bending the spec to match what the code happens to do. The spec stays the reference point; the artifacts below it are its implementation, in decreasing order of authority.',
    ].join('\n\n'),
    deepDive: [
      'Why is the spec the cheapest place to fix bugs? Because every later artifact inherits from it. An ambiguity like "does STOP clear the counter?" costs one sentence to resolve in the spec. Discovered in RTL, the same question requires redesigning a control signal and updating the block diagram. Discovered in verification, it invalidates tests that were written against the wrong reading. Discovered by a customer, it is a hardware erratum. The design loop is thus an *ambiguity pump*: it pushes every question up to the earliest artifact that can answer it.',
      'There is a documented-artifact discipline worth adopting from day one: each stage leaves a file, and each file carries a version. Spec v1.2, architecture doc v1.0, test plan v0.9. When a review finds a discrepancy, you know which artifact is wrong because each has a version and an owner. Solo engineers skip this and pay for it three weeks later when they cannot remember whether the register map on the whiteboard or in the code is current. In this course, module 02 builds the spec-to-architecture artifacts for a real example, and module 11 closes the loop with the verification report.',
      'Iteration count is a design-quality metric. A well-run block goes through the loop a handful of times with each iteration fixing a specific documented finding. A loop that spins (endless "small tweaks" with no artifact updates) is a symptom that the architecture was never actually finished, and the correct response is usually to stop coding and finish the block diagram — not to keep adjusting RTL hoping the design converges.',
    ].join('\n\n'),
    examples: [
      {
        title: 'The loop applied to a tiny block: edge-to-pulse converter',
        language: 'verilog',
        code: [
          '// STAGE 1 - SPEC (excerpt)',
          '//   Function: convert a 1-cycle-wide pulse request into a',
          '//   strobe lasting exactly 4 cycles.',
          '//   Interfaces: clk, reset_n, trigger_i, strobe_o.',
          '//   Timing: strobe_o rises the cycle after trigger_i; width 4.',
          '//   Corner: trigger_i during an active strobe restarts the 4.',
          '',
          '// STAGE 2 - ARCHITECTURE (register list)',
          '//   Registers: cnt_q[1:0]  (counts 3,2,1,0 while active)',
          '//   Datapath:  2-bit down counter cloud',
          '//   Control:   active_q (strobe active flag)',
          '//   Equation:  strobe_o = active_q;  active while cnt_q != 0',
          '',
          '// STAGE 3+4 - RTL (coded directly from the register list above)',
          'module pulse4 (',
          '    input  wire clk,',
          '    input  wire reset_n,',
          '    input  wire trigger_i,',
          '    output wire strobe_o',
          ');',
          '    reg [1:0] cnt_q;',
          '    reg       active_q;',
          '',
          '    wire reload = trigger_i | (active_q & (cnt_q == 2\'d0));',
          '',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) begin',
          '            cnt_q    <= 2\'d0;',
          '            active_q <= 1\'b0;',
          '        end else if (reload) begin',
          '            cnt_q    <= 2\'d3;      // start a fresh 4-cycle window',
          '            active_q <= 1\'b1;',
          '        end else if (active_q) begin',
          '            cnt_q    <= cnt_q - 2\'d1;',
          '            active_q <= (cnt_q != 2\'d0); // clears after 4 cycles',
          '        end',
          '    end',
          '',
          '    assign strobe_o = active_q;',
          'endmodule',
          '',
          '// STAGE 4 - test list derived from spec (each item = one TB test):',
          '//   T1 idle output, T2 single trigger width==4, T3 retrigger',
          '//   mid-strobe restarts window, T4 reset mid-strobe clears.',
        ].join('\n'),
        explanation: [
          'Lines 1-5 are the spec fragment: function, interfaces, exact timing ("rises the cycle after", "width 4"), and one corner case. Note the specificity — "width 4" and "cycle after" are testable claims, unlike "a short pulse".',
          'Lines 7-10 are the architecture: the complete register list (two registers) and the transfer equations. Nothing here mentions Verilog; this is structure.',
          'Line 16: `reload` is the control cloud — a trigger, or the active window expiring, restarts the counter. This is the only cleverness in the design and it lives in one line.',
          'Lines 18-31: the register list transcribed directly into one clocked process. Every register from the architecture appears; nothing extra was invented during coding.',
          'Line 28: active_q clears when cnt_q has reached 0 — because on that edge cnt_q reloads via `reload` or the strobe finishes. Trace: trigger at t1: cnt_q=3, active=1 (strobe rises at t2). t2..t5: counts 3,2,1,0 with active held while nonzero -> at the edge after cnt_q hits 0, active clears. Total strobe width: cycles t2-t5 = 4 cycles as specified.',
          'Line 33 and the corner: trigger during strobe re-runs `reload`, resetting cnt_q to 3 — the window restarts, exactly per spec. The test list (lines 36-37) covers it as T3.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'The RTL design loop',
        content: [
          '        +---------------------+',
          '        | 1. SPECIFICATION    |  artifact: written spec',
          '        |    function, ifs,   |  exit: no known ambiguity;',
          '        |    timing, corners  |  every "etc." resolved',
          '        +----------+----------+',
          '                   v',
          '        +---------------------+',
          '        | 2. ARCHITECTURE     |  artifact: block diagram,',
          '        |    registers,       |  register list, cycle plan',
          '        |    datapath/control |  exit: register list complete,',
          '        |    partition        |  reviewed',
          '        +----------+----------+',
          '                   v',
          '        +---------------------+',
          ' 3+4.   | RTL CODING          |  artifact: Verilog',
          '  +-----+    transcribe the   |  exit: lint clean (m09),',
          ' |     |    architecture      |  self-checking sim passes (m09)',
          ' |     +----------+----------+',
          ' |                v',
          ' |     +---------------------+',
          ' |     | 5. SYNTHESIS/TIMING |  artifact: area + timing report',
          ' +-----+    feedback to 2 & 3 |  exit: timing met or arch',
          '       +---------------------+  decision recorded (m08)',
        ].join('\n'),
        caption:
          'Each stage has an artifact and an exit criterion; findings at any stage flow back up as changes to the earlier artifact, never as silent local patches.',
      },
      {
        kind: 'block',
        title: 'Where the rest of this course lives in the loop',
        content: [
          '  SPEC -----+--- m02: spec -> architecture, running example (timer)',
          '            |',
          '  ARCH -----+--- m04 datapath  m05 control  m06 pipelining',
          '            |    m07 clocking/reset decisions',
          '            |',
          '  RTL  -----+--- m03 coding methodology',
          '            |',
          '  VERIFY ---+--- m09 lint + self-checking TB',
          '            |',
          '  SYNTH ----+--- m08 timing-aware RTL   m10 synthesis awareness',
          '            |',
          '  ALL ------+--- m11 capstone: the full loop on one block',
        ].join('\n'),
        caption:
          'Course map: every module trains one stage of the loop; the capstone runs the whole loop end to end.',
      },
    ],
    tables: [
      {
        caption: 'Minimum contents of an RTL specification',
        headers: ['Section', 'Must state', 'Testable form'],
        rows: [
          ['Function', 'What the block does and explicitly does not do', 'Inputs -> outputs per cycle'],
          ['Interfaces', 'Name, width, direction, protocol, reset value of every port', 'A signal table'],
          ['Clocking/reset', 'Frequency target, reset polarity, sync/async, which regs reset', 'A reset column in the register list'],
          ['Performance', 'Cycles per operation, latency, throughput, target frequency', 'Numbers, not adjectives'],
          ['Corner cases', 'Simultaneous events, boundary values, illegal inputs', 'A numbered list, each with defined behaviour'],
        ],
      },
      {
        caption: 'Cost of fixing a design error by the stage that catches it',
        headers: ['Caught in', 'Typical cost', 'Why'],
        rows: [
          ['Specification review', 'One sentence', 'Nothing built yet'],
          ['Architecture review', 'A redrawn diagram', 'No code exists to rewrite'],
          ['RTL simulation', 'Code change + rerun', 'Testbench catches it, hours lost'],
          ['Post-synthesis timing', 'Architecture change + redo flow', 'Days: re-synthesize, re-verify'],
          ['Silicon', 'Respins, schedule loss', 'Weeks to months, hardware cost'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Starting to code before the register list exists, "to explore the design".',
        fix:
          'Exploration belongs in the architecture stage — even a napkin block diagram with named registers beats code as an exploration tool, because it exposes structure without inviting syntax bugs. If you must explore in code, do it in a scratch file you are prepared to delete; never let scratch code silently become the design.',
      },
      {
        mistake: 'Treating verification as the final stage that starts after coding.',
        fix:
          'Derive the test list from the spec the day the spec is written, and review it. Tests derived before coding check the code against the spec; tests written after coding unconsciously check the code against the code — they encode the same misreadings the coder had.',
      },
      {
        mistake: 'Fixing a synthesis-time problem directly in the RTL without updating the architecture artifact.',
        fix:
          'If the fix changes register placement, latency or the block diagram, it is an architecture change: update the diagram and register list first, then the code. Otherwise the documents rot, and the next engineer (including future you) will "fix" the design back into the bug.',
      },
    ],
    guidedPractice: {
      title: 'Write the spec and register list before the code',
      brief:
        'Spec (given): "A debounced button input: btn_raw_i may bounce for up to 5 ms; btn_o must change only after the raw input has held a new value for 4 consecutive clock cycles of a 1 kHz sample enable." Write (1) the missing spec details as questions-and-answers you must resolve (sample enable source, reset value of btn_o, behaviour when the raw input flaps every 3 cycles), then (2) the register list and transfer equations, then (3) implement the RTL.',
      starterCode: [
        'module debouncer (',
        '    input  wire clk,',
        '    input  wire reset_n,',
        '    input  wire sample_en,   // 1-cycle pulse at 1 kHz',
        '    input  wire btn_raw_i,',
        '    output reg  btn_o',
        ');',
        '    // TODO: counter + captured-value register',
        'endmodule',
      ].join('\n'),
      expectedBehavior:
        'Resolved spec: sample_en is an external 1-cycle enable; btn_o resets to 0; a raw input that flaps within 3 cycles never updates btn_o (stability requires 4 consecutive equal samples). Registers: cnt_q[1:0], stable_q (last sampled raw), btn_q. Equations: on sample_en, if raw == stable_q then cnt_q <= 3 else cnt_q <= cnt_q - 1; when cnt_q hits 0, btn_q <= raw and cnt_q reloads. The 4-cycle stability timer and the registered output are the whole design.',
      hints: [
        'The enable (sample_en) gates the whole transfer, exactly like the accumulator enable in lesson 1.',
        '"4 consecutive samples" needs a 2-bit counter and a 1-bit captured value — that is the register list.',
        'Write the corner-case answers before coding: the flapping case is a test, not an accident.',
      ],
    },
    practiceExercises: [
      {
        title: 'Audit a bad spec',
        brief:
          'A colleague\'s spec reads: "Design a FIFO. It should be fast. Depth 8, width 8. Full and empty flags as usual. Reset however the FPGA does it." List at least six unanswered questions that block architecture work, and propose the one-line spec answer for each.',
        expectedBehavior:
          'Reasonable Q&A set: (1) Interface protocol for push/pop — e.g. valid/ready. (2) Behaviour writing when full — reject, or overwrite? (3) Behaviour reading when empty — return garbage, or stall? (4) Do full/empty assert combinationally on the same-cycle op? (5) Reset polarity and whether flags reset synchronously — pick active-low async per course style. (6) Is a count output required, at what width — log2(8)+1 = 4 bits. Each answer is testable; "fast" and "as usual" are not.',
        hints: [
          'Start from the spec template in this lesson: interfaces, corners, reset, performance.',
          '"As usual" is the classic ambiguity marker — replace each instance with a sentence.',
          'Corner questions (write-when-full) are the ones that will bite during verification.',
        ],
      },
      {
        title: 'Trace the loop on a real failure',
        brief:
          'A timer block passed simulation but failed timing: the terminal-count compare (count == 0) fed a wide output mux, giving a 12 ns path on a 10 ns clock. Write the two-line finding report: which loop stage produced the finding, which artifact must change first, and what the artifact change is.',
        expectedBehavior:
          'Finding produced at stage 5 (synthesis/timing). The architecture artifact changes first: the block diagram gains one register (register the compare result, or register the output mux selection), accepting one cycle of added latency and updating the spec\'s timing section. Only then does the RTL change, followed by re-verification — the code edit is downstream of the artifact edit.',
        hints: [
          'Registering a signal changes the cycle plan — whose artifact owns the cycle plan?',
          'The spec\'s timing section must be updated in the same iteration, or the documents disagree.',
        ],
      },
    ],
    assessment: {
      title: 'Design process checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'Which item is the primary exit criterion of the architecture stage?',
          options: [
            'The code compiles',
            'A complete register list and block diagram that reviewers have checked',
            'The testbench passes',
            'Timing is met',
          ],
          answer: 'A complete register list and block diagram that reviewers have checked',
          explanation:
            'Architecture is done when the structure is fully named: every register with its width and reset value, the datapath/control split, and the cycle plan. Compilation, simulation and timing are exits of later stages.',
          hint: 'What artifact does coding transcribe?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt:
            'If simulation passes but the specification was ambiguous, the design is verified.',
          answer: 'false',
          explanation:
            'Simulation can only verify the code against the reading of the spec the testbench author held. An ambiguous spec makes "verified" undefined — resolving the ambiguity and re-deriving the tests is part of the loop.',
          hint: 'Verified against what?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'short-answer',
          prompt:
            'A timing report shows a critical path at 12 ns against a 10 ns clock. Name the loop stage that produced this finding and the earliest artifact that must be edited in response.',
          answer: 'synthesis/timing stage; the architecture (block diagram / register list)',
          explanation:
            'Timing findings come from stage 5. A path 2 ns over budget is usually fixed by adding or moving a register boundary — a cycle-plan change — so the architecture artifact is edited first, then the RTL, then re-verification.',
          hint: 'Fixing timing usually means moving a register.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt:
            'A designer "fixes" a simulation mismatch by changing the RTL so the testbench passes, without consulting the spec. Which loop rule did they break?',
          options: [
            'None; tests define correctness',
            'The spec, not the testbench, is the reference point; the discrepancy must be resolved against the spec (and the spec updated deliberately if it was wrong)',
            'Testbenches must never be written before coding',
            'RTL may not change after synthesis',
          ],
          answer:
            'The spec, not the testbench, is the reference point; the discrepancy must be resolved against the spec (and the spec updated deliberately if it was wrong)',
          explanation:
            'The loop\'s authority order is spec > architecture > RTL > netlist. Making the code agree with a testbench while both disagree with the spec hides the defect rather than fixing it.',
          hint: 'Which artifact outranks which?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt:
            'Which spec sentence is actually testable as written?',
          options: [
            'The timer should fire reasonably often',
            'The timer asserts terminal count exactly 3 cycles after START is written, for PERIOD=3',
            'The timer uses a robust FSM',
            'The timer handles corner cases properly',
          ],
          answer:
            'The timer asserts terminal count exactly 3 cycles after START is written, for PERIOD=3',
          explanation:
            'A testable claim names concrete values on concrete cycles: it can pass or fail in a testbench. The others are opinions that no test can check.',
          hint: 'Could you write a pass/fail check from the sentence alone?',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      {
        term: 'Specification',
        definition:
          'The written contract of function, interfaces, timing and corner cases every later artifact is checked against.',
      },
      {
        term: 'Micro-architecture',
        definition:
          'The register list, block diagram and cycle plan that implement the spec — decided before coding.',
      },
      {
        term: 'Register list',
        definition:
          'Every register in the design with name, width, reset value and enable — the architecture stage\'s main output.',
      },
      {
        term: 'Design loop',
        definition:
          'Spec -> architecture -> RTL -> verification -> synthesis, with findings flowing back to earlier artifacts.',
      },
      {
        term: 'Exit criterion',
        definition:
          'The objective condition that declares a stage complete (e.g. "register list reviewed, no open questions").',
      },
    ],
    revisionSummary: [
      'The loop: specification, architecture, RTL, verification, synthesis/timing — each stage leaves a versioned artifact.',
      'A spec pins down function, interfaces, clocking/reset, performance numbers and corner cases; testable sentences only.',
      'Latency, throughput and area are decided at architecture; coding transcribes, it does not redesign.',
      'Verification artifacts (test lists) are derived from the spec before coding exists.',
      'Timing and lint findings are feedback into earlier artifacts — update the diagram and spec, then the code.',
      'Authority order: spec > architecture > RTL > netlist. Never fix downstream artifacts against upstream ones silently.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Design flow (EDA)',
        url: 'https://en.wikipedia.org/wiki/Design_flow_(EDA)',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Register-transfer level',
        url: 'https://en.wikipedia.org/wiki/Register-transfer_level',
        kind: 'article',
      },
      {
        label: 'Icarus Verilog documentation (for the verification stage)',
        url: 'https://steveicarus.github.io/iverilog/',
        kind: 'tool',
      },
    ],
    estimatedMinutes: 45,
  },
];
