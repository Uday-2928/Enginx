import type { TutorialLesson } from '../types';

// Module 10 — Counters & Registers
export const module10Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m10-l1',
    title: 'Up, Down and Up/Down Counters',
    summary:
      'Design the counter family — the most-used sequential block — and verify wrap-around, direction control and reset behavior precisely.',
    objectives: [
      'Build a free-running 4-bit up counter with async active-low reset.',
      'Add direction control and predict the wrap/underflow points.',
      'Specify width, overflow behavior and verification points for any counter.',
      'Trace counter values across wrap-around edges.',
    ],
    whyItMatters:
      'Counters time everything: baud rates, PWM, debounce intervals, address generation, protocol framing. They are also the first place students meet arithmetic-on-registers in a clocked block — where module 04’s width rules and module 07’s nonblocking discipline combine. A counter you can specify, build and verify in five minutes is a professional reflex.',
    prerequisites: ['vlog-m09-l1', 'vlog-m04-l1'],
    explanation:
      'A **free-running N-bit up counter** is a register that adds 1 every clock, wrapping naturally at its width:\n\n```\nalways @(posedge clk or negedge reset_n)\n    if (!reset_n) count <= 4\'d0;\n    else          count <= count + 4\'d1;\n```\n\nNo comparison, no terminal count: at 4\'b1111 the next increment wraps to 4\'b0000 — unsigned arithmetic overflow used deliberately. That is a SPECIFICATION ("counts 0-15 forever, wrapping"), not an accident, and it costs nothing: the adder is only 4 bits wide.\n\nA **down counter** subtracts, wrapping from 0 to all-ones (underflow). An **up/down counter** selects per clock from a direction input:\n\n```\nelse if (up_dn) count <= count + 4\'d1;\nelse            count <= count - 4\'d1;\n```\n\nThe **specification checklist** for any counter (used in every lesson below): width (how many bits); direction and control inputs; reset value and style; wrap behavior (free-running vs terminal-count, module 10-l2); enable (does it count every clock or only when enabled); and outputs (raw count, terminal-count flag, wrap pulse). Verification points follow directly: reset value, one increment step, the wrap edge (all-ones → 0), the enable-hold behavior, and — for down counters — the underflow edge.',
    deepDive:
      '### Wrap-around as a feature\n\nFree-running wrap is modular arithmetic: the counter computes count(t) = (count(0) + t) mod 16. Uses are everywhere: a phase accumulator, a sequence generator, a cheap pseudo-random step (XOR the bits for entropy). The discipline is documentation: "wraps at 16" in the module header so no reviewer mistakes it for a bug. When wrapping is NOT wanted, you need the terminal-count compare of module 10-l2 — a different specification.\n\n### Width choice and the arithmetic\n\nAn N-bit counter distinguishes 2^N states; choose N from the requirement (count to 100 → 7 bits, since 2^6 = 64 < 100 <= 128 = 2^7). The increment `count + 4\'d1` evaluates in the LHS context (module 04): 4-bit operands, 4-bit result — the discarded carry IS the wrap. Down-counting 0 - 1 in 4-bit unsigned gives 1111 (15) — two’s-complement underflow, again by design. Both directions rely on unsigned wrap; if you need saturation (stop at max instead of wrapping), that is an explicit compare-and-hold, not free arithmetic.\n\n### Counters as timebase: frequency measurement\n\nA counter measured against a known clock converts time to numbers: count events for one second (strobe from module 09-l3) and the count IS the frequency in Hz. This "counter + strobe" pairing is the universal recipe behind frequency meters, PWM generators, stopwatch projects (projects.ts) and UART baud generation (module 10-l3) — one pattern, many products.',
    examples: [
      {
        title: 'Up, down, and up/down — the full family',
        language: 'verilog',
        code:
          '// counter_up4.v — free-running 4-bit up counter\nmodule counter_up4(\n    input  wire       clk,\n    input  wire       reset_n,\n    output wire [3:0] count\n);\n    reg [3:0] cnt;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) cnt <= 4\'d0;        // reset to zero\n        else          cnt <= cnt + 4\'d1;  // wrap 1111 -> 0000 by design\n    end\n\n    assign count = cnt;\nendmodule\n\n// counter_down4.v — free-running down counter\nmodule counter_down4(\n    input  wire       clk,\n    input  wire       reset_n,\n    output wire [3:0] count\n);\n    reg [3:0] cnt;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) cnt <= 4\'d15;       // start at the TOP\n        else          cnt <= cnt - 4\'d1;  // underflow 0000 -> 1111\n    end\n\n    assign count = cnt;\nendmodule\n\n// counter_ud4.v — bidirectional with direction input\nmodule counter_ud4(\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire       up_dn,     // 1 = count up, 0 = count down\n    output wire [3:0] count\n);\n    reg [3:0] cnt;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n)   cnt <= 4\'d0;\n        else if (up_dn) cnt <= cnt + 4\'d1;\n        else            cnt <= cnt - 4\'d1;\n    end\n\n    assign count = cnt;\nendmodule',
        explanation: [
          'Up counter: one add, one reset arm. The wrap at 15→0 is implicit in 4-bit arithmetic — the discarded carry.',
          'Down counter: reset value chosen as 15 (the top) so the first cycle counts 15, 14, 13...; underflow 0→15 is the two’s-complement wrap.',
          'Up/down: the direction input selects add or subtract inside the priority chain (reset > up > down). Direction changes take effect at the NEXT edge — no combinational glitch can corrupt the count.',
          'Trace up counter from reset: 0,1,2,...,14,15,0,1 — the wrap edge (15→0) is the critical verification row.',
          'Trace up/down starting 0 with up_dn = 1,1,0,0: 1,2,1,0; one more down (5th edge) wraps to 15 — the underflow edge is the second critical row.',
        ],
      },
      {
        title: 'Counter verification points as a testbench skeleton',
        language: 'verilog',
        code:
          '// tb_counter_up4.v — SIM-ONLY: the five canonical checks\n`timescale 1ns/1ps\nmodule tb_counter_up4;\n    reg  clk, reset_n;\n    wire [3:0] count;\n\n    counter_up4 dut (.clk(clk), .reset_n(reset_n), .count(count));\n\n    initial clk = 1\'b0;\n    always #5 clk = ~clk;\n\n    task check;\n        input [3:0] expect_val;\n        input [127:0] label;\n        begin\n            #1;   // settle after the edge\n            if (count !== expect_val)\n                $display("FAIL %0s: got %0d expected %0d", label, count, expect_val);\n            else\n                $display("pass %0s: %0d", label, count);\n        end\n    endtask\n\n    initial begin\n        reset_n = 0;\n        check(4\'d0,  "reset value");     // t=~1: still reset\n        #10 reset_n = 1;                  // release before an edge\n        #10 check(4\'d1,  "one step");     // after 1 edge: count=1\n        #10 check(4\'d2,  "second step");\n        #130;                             // 13 more edges: 2+13 = 15\n        check(4\'d15, "pre-wrap max");\n        #10 check(4\'d0,  "wrap to zero"); // the 16th increment wraps\n        #20;\n        $finish;\n    end\nendmodule',
        explanation: [
          'Five canonical checks: reset value, one increment, a second increment, the maximum (15), and the wrap edge (15→0). Every free-running counter test needs exactly these.',
          'The check task (module 13 formalizes tasks) waits #1 after the edge so the nonblocking update has landed, then compares with !== — the four-state compare that catches x (module 04/14).',
          'Timing map: reset released at t=10; edges at t=15, 25, 35...; count=1 checked at t=26 (after the t=25 edge). The #130 block walks to the 15-count, then one more edge wraps.',
          'The task/label style keeps the log readable: "pass wrap to zero: 0" is self-documenting evidence.',
          'Sim-only file: clock gen, delays, $display, task — all labeled by nature of the testbench module (no ports, initial blocks).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Up counter wrap (educational waveform, illustrative)',
        content:
          '  edge:    e1  e2  e3 ... e14 e15 e16 e17\n  count:    1   2   3 ...  14  15   0   1\n                                          ^\n                                wrap: 1111 -> 0000\n                                (the discarded carry IS the wrap)',
        caption:
          'educational waveform (illustrative): a free-running counter is modular arithmetic — the wrap edge is the must-verify row.',
      },
    ],
    tables: [
      {
        caption: 'Counter specification checklist',
        headers: ['Item', 'Question', 'Example (counter_ud4)'],
        rows: [
          ['Width', 'How many states?', '4 bits = 16 states'],
          ['Direction', 'Up, down, selectable?', 'up_dn input, 1 = up'],
          ['Reset', 'Value and style?', '0, async active-low'],
          ['Wrap', 'Free or terminal-count?', 'Free: 15→0 up, 0→15 down'],
          ['Enable', 'Every clock or gated by enable?', 'Every clock'],
          ['Outputs', 'Raw count? flags?', 'count[3:0] only'],
        ],
      },
      {
        caption: 'Up/down counter trace (reset 0; up_dn = 1,1,0,0,0)',
        headers: ['Edge', 'up_dn', 'count after'],
        rows: [
          ['e1', '1', '1'],
          ['e2', '1', '2'],
          ['e3', '0', '1'],
          ['e4', '0', '0'],
          ['e5', '0', '15 (underflow wrap)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming the counter stops at 15 (or that 15→0 is a bug).',
        fix:
          'Free-running counters wrap by design — document it in the header. If stopping is required, that is the terminal-count specification of module 10-l2, implemented with an explicit compare.',
      },
      {
        mistake: 'Resetting a down counter to 0 and expecting it to count 15,14,13...',
        fix:
          'A down counter’s useful range starts at its reset value. Reset to all-ones (the top) to count down the full range; resetting to 0 immediately underflows to 15 on the first enabled edge — surprising unless specified.',
      },
      {
        mistake: 'Mixing direction logic combinationally into the addend (count <= count + (up_dn ? +1 : -1) written with signed tricks).',
        fix:
          'Keep it in the plain if/else chain — two explicit assignments. Clever arithmetic directions invite signedness traps (module 03) and read worse; the branch costs nothing after synthesis.',
      },
    ],
    guidedPractice: {
      title: 'Trace the wrap edges',
      brief:
        'For counter_ud4 reset to 0 with up_dn sequence 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0 (18 edges): give count after each edge, circling the wrap edge. Then state where the down direction would wrap if it continued.',
      expectedBehavior:
        'Edges 1-15: count = 1..15. Edge 16: count wraps to 0 (the wrap edge — 1111→0000). Edge 17 (up_dn=0): count = 15 (0-1 underflow wrap). Edge 18: 14. The down-direction wrap is the same 0→15 edge — both directions share the modular boundary at 0/15.',
      hints: [
        'Fifteen increments from 0 reach 15; the sixteenth wraps.',
        'Underflow and overflow meet at the same modular seam.',
      ],
    },
    practiceExercises: [
      {
        title: 'Down counter with the five checks',
        brief:
          'Write a testbench skeleton for counter_down4 mirroring the five canonical checks (reset value 15, one decrement, two decrements, minimum 0, underflow wrap to 15). State the expected count after each check point.',
        expectedBehavior:
          'Checks: reset → 15; after 1 edge → 14; after 2 → 13; continue to 0; one more edge → 15 (underflow). Same task-based structure as the up-counter TB with values mirrored.',
        hints: [
          'Mirror the up-counter TB; every expected value maps n → 16-n (mod 16).',
          'The underflow edge (0→15) replaces the wrap edge.',
        ],
      },
      {
        title: 'Frequency of the MSB',
        brief:
          'For counter_up4 clocked at 100 MHz, what is the frequency of count[3] (the MSB)? Of count[0]? Justify using the counting pattern.',
        expectedBehavior:
          'count[0] toggles every clock → 50 MHz (period 2 clocks). count[3] completes one 0→1→0 cycle per full 16-count → 100/16 = 6.25 MHz. Each bit k divides by 2^(k+1): the counter is a chain of divide-by-2 stages — but as module 09-l3 stressed, use the BITS as data/enables, never as clocks.',
        hints: [
          'count[0] alternates 0,1,0,1...',
          'The MSB is high for counts 8-15: 8 clocks high, 8 low.',
        ],
      },
    ],
    assessment: {
      title: 'Module 10 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'counter_up4 has counted to 4\'b1111. What does it hold after the next clock edge?',
          code:
            'else cnt <= cnt + 4\'d1;\n// cnt = 4\'b1111, one more edge',
          options: ["4'b0000", "4'b1111", "4'b0001", "x"],
          answer: "4'b0000",
          explanation:
            'The 4-bit addition wraps: 15+1 = 16 = 1_0000, truncated to 0000. Free-running wrap is the specified behavior.',
          hint: '4-bit context: the carry is discarded.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A down counter resets to 4\'d15. Why choose 15 as the reset value?',
          options: [
            'So the full downward range 15..0 is available immediately after reset',
            'Because reset must set the maximum',
            'So the counter never underflows',
            'It is arbitrary — 0 works identically',
          ],
          answer: 'So the full downward range 15..0 is available immediately after reset',
          explanation:
            'A down counter’s range is [reset value .. 0]. Resetting to the top gives the full range; resetting to 0 underflows to 15 on the first edge.',
          hint: 'What range does a down counter cover from its start value?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In counter_ud4, changing up_dn between clock edges takes effect at the next edge.',
          answer: 'true',
          explanation:
            'The direction is sampled by the clocked block at each edge; mid-cycle changes simply choose the branch at the next capture. No glitches are possible because the state updates only at edges.',
          hint: 'When does a clocked block look at its inputs?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Which is NOT one of the five canonical counter verification points?',
          options: [
            'Reset value',
            'One increment step',
            'The wrap/underflow edge',
            'Power consumption during counting',
          ],
          answer: 'Power consumption during counting',
          explanation:
            'The five: reset value, one step, two steps (or a mid-range value), the max/min, and the wrap/underflow edge. Power is a physical measurement, not an RTL simulation point.',
          hint: 'Which checks prove the counting arithmetic?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'How many states does a 7-bit counter distinguish (number)?',
          answer: '128',
          explanation:
            '2^7 = 128 states (0..127) — enough to count to 100, the example requirement.',
          hint: '2^N.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Free-running counter', definition: 'Increments (or decrements) every clock, wrapping at its width — modular arithmetic by design.' },
      { term: 'Wrap / underflow', definition: 'The modular seam: all-ones→0 (up) or 0→all-ones (down); the critical verification edge.' },
      { term: 'Up/down counter', definition: 'Direction input selects increment or decrement per clock, inside the reset-first priority chain.' },
      { term: 'Terminal count', definition: 'A specified maximum where the counter stops or reloads — module 10-l2’s compare-based design.' },
      { term: 'Counter specification', definition: 'Width, direction, reset value/style, wrap behavior, enable, outputs — the checklist every counter declares.' },
    ],
    revisionSummary: [
      'Up counter: cnt <= cnt + 1 with async reset to 0; wrap 15→0 is free arithmetic, documented as spec.',
      'Down counter: reset to the top (all-ones); underflow 0→15 on the first wrap.',
      'Up/down: if/else selects add/subtract at each edge; direction changes take effect next edge.',
      'Five verification points: reset, step, step, max/min, wrap edge — build the TB around them.',
      'Width from requirement: 2^N states; counter bits are data enables (never clocks).',
    ],
    furtherReading: [
      { label: 'Wikipedia — Counter (digital)', url: 'https://en.wikipedia.org/wiki/Counter_(digital)', kind: 'article' },
      { label: 'Electronics Tutorials — Counters', url: 'https://www.electronics-tutorials.ws/sequential/seq_4.html', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'vlog-m10-l2',
    title: 'Modulo-N Counters, Terminal Count and Clock Enables',
    summary:
      'Make counters that stop, reload or pulse at N: terminal-count compares, the enable-vs-gated-clock distinction, and sync-vs-async reset variants.',
    objectives: [
      'Build a modulo-N counter with terminal-count pulse and parameterized N.',
      'Enable counting with a clock-enable input — and articulate why the clock itself is never gated.',
      'Implement sync-reset and async-reset variants of the same counter.',
      'Verify rollover, TC pulse width and reset priority.',
    ],
    whyItMatters:
      'Most real counters are NOT free-running: baud generators, PWM periods, timeout watches and FIFO pointers all count to a specific N and either reload or pulse. The terminal-count pattern is also your first parameterized sequential block — and the clock-enable discussion here is the practical sequel to module 09’s "never gate clocks", applied to the most common place designers are tempted to gate.',
    prerequisites: ['vlog-m10-l1', 'vlog-m09-l2'],
    explanation:
      'A **modulo-N counter** counts 0..N-1 and wraps (or reloads) at N. Two idioms:\n\n```\n// compare-and-clear\nelse if (cnt == N-1) cnt <= 0;\nelse                 cnt <= cnt + 1;\n\n// add-and-branch on overflow (equivalent)\nelse cnt <= (cnt == N-1) ? 0 : cnt + 1;\n```\n\nThe **terminal count (TC) output** — `assign tc = (cnt == N-1);` — is a combinational pulse asserted during the LAST count; a **wrap pulse** (registered) fires one cycle later. Which one your consumer needs is a specification decision: TC is combinational (can glitch if cnt is decoded from ripple sources — fine in synchronous designs where consumers sample at edges), the registered pulse is clean and one-cycle-wide.\n\n**Enabling counting:** add `en` to the chain: `else if (en) begin ... end` — when en=0 the counter holds. The clock NEVER stops: this is the clock-enable pattern (module 09-l2). The forbidden alternative — building a slow clock from the counter and clocking downstream logic with it — was rejected in module 09-l3 and is repeated here because counters are exactly where the temptation strikes ("I already have the rollover signal, why not use it as a clock?"). Because rollover is combinational, using it as a clock adds glitches to the crime. Strobe enables, always.\n\n**Reset variants:** the same modulo-N counter with synchronous reset just moves the reset check inside the clock-only block. Choose per project; do not mix (module 09-l1).',
    deepDive:
      '### Choosing between compare-and-clear and add-and-branch\n\nBoth infer nearly identical hardware (a comparator plus an mux into the counter’s D-path). Compare-and-clear reads as a state machine step (explicit reload action — where you might ALSO load a terminal pulse); add-and-branch is a single expression, compact for tiny counters. Consistency within a project beats micro-optimizing; the compare must use the SAME constant as the reload decision (N-1) — a mismatch between compare constant and reload constant is a classic off-by-one that produces an N+1 counter.\n\n### Terminal count vs wrap pulse, precisely\n\nWith compare-and-clear on N=10: cnt sequence 0..9; tc = (cnt == 9) is high during the whole cycle where cnt=9 (one clock period), then low. If a downstream block needs "one pulse per period" to INCREMENT its own logic, sampling tc at the clock edge works — it sees tc high exactly once per period. If instead you need a pulse synchronized to the reload EVENT, register it: `wrap <= (cnt == N-1);` — high one cycle AFTER the last count, aligned with cnt returning to 0. Misusing one for the other shifts your system’s timing by a cycle; testbench checks must pin this down explicitly.\n\n### Enable placement in the chain\n\nPriority order matters: reset > en-gated wrap logic > hold. Write:\n\n```\nif (!reset_n)        cnt <= 0;\nelse if (en) begin\n    if (cnt == N-1) cnt <= 0;\n    else            cnt <= cnt + 1;\nend\n// else: hold\n```\n\nNesting the wrap inside the enable keeps "disabled" meaning "frozen exactly where it was", including mid-count — the semantics timers and stopwatch projects (projects.ts) depend on. Flattening enable and wrap into one condition (en && cnt == N-1) is equivalent but nests worse as controls grow.',
    examples: [
      {
        title: 'Modulo-10 counter with TC pulse and enable (parameterized)',
        language: 'verilog',
        code:
          '// counter_mod10.v — counts 0..9, TC during 9, enable-gated\nmodule counter_mod10 #(\n    parameter N = 10\n)(\n    input  wire       clk,\n    input  wire       reset_n,   // async, active-low\n    input  wire       en,        // clock enable: count only when 1\n    output wire [3:0] count,     // 4 bits hold 0..9\n    output wire       tc         // terminal count: (cnt == N-1)\n);\n    reg [3:0] cnt;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n)\n            cnt <= 4\'d0;\n        else if (en) begin\n            if (cnt == N-1)\n                cnt <= 4\'d0;          // reload: modulo behavior\n            else\n                cnt <= cnt + 4\'d1;\n        end\n        // else: hold exactly where it is\n    end\n\n    assign count = cnt;\n    assign tc    = (cnt == N-1);       // combinational pulse during the last count\n\nendmodule',
        explanation: [
          'Priority chain: async reset first; the enable gates the whole wrap/count nest; disabled means frozen mid-count (stopwatch semantics).',
          'The compare constant and the reload boundary are the same N-1 — one edit point via the parameter. Trace N=10: 0,1,...,9 → reload to 0: ten states, a true decade counter.',
          'tc is combinational: high exactly while cnt=9. A registered wrap pulse would be `wrap <= (cnt == N-1);` — high the cycle AFTER the last count (the reload event).',
          'Trace with en=1 continuously: e1..e10: cnt = 1,2,...,9 then reload → 0 at the 10th edge; tc is high during the cycle where cnt=9 (after the 9th edge).',
          'With en=0 mid-count (say cnt=5): the counter holds 5 through any number of edges — the freeze semantics timers need.',
        ],
      },
      {
        title: 'Sync-reset variant and the enable-strobe cascade',
        language: 'verilog',
        code:
          '// counter_mod10_sync.v — SAME counter, synchronous reset\nmodule counter_mod10_sync #(\n    parameter N = 10\n)(\n    input  wire       clk,\n    input  wire       reset_n,   // SYNCHRONOUS active-low\n    input  wire       en,\n    output wire [3:0] count,\n    output wire       tc\n);\n    reg [3:0] cnt;\n\n    always @(posedge clk) begin          // clock only in the list\n        if (!reset_n)\n            cnt <= 4\'d0;                  // applied at the edge\n        else if (en) begin\n            if (cnt == N-1) cnt <= 4\'d0;\n            else            cnt <= cnt + 4\'d1;\n        end\n    end\n\n    assign count = cnt;\n    assign tc    = (cnt == N-1);\n\nendmodule\n\n// decade_cascade.v — two mod-10 stages via STROBE, not chained clocks\nmodule decade_cascade(\n    input  wire       clk,\n    input  wire       reset_n,\n    output wire [3:0] ones,\n    output wire [3:0] tens\n);\n    wire ones_tc;\n\n    // Stage 0 counts every clock; its TC enables stage 1.\n    counter_mod10 u_ones (.clk(clk), .reset_n(reset_n), .en(1\'b1),\n                          .count(ones), .tc(ones_tc));\n    // Stage 1 uses TC as a clock ENABLE — same clock, one domain.\n    counter_mod10 u_tens (.clk(clk), .reset_n(reset_n), .en(ones_tc),\n                          .count(tens), .tc());\n\nendmodule',
        explanation: [
          'Sync variant: identical body, clock-only list — the reset is data at the edge (module 09-l1 trade-offs apply; pick one style per project).',
          'decade_cascade: a two-digit (0-99) counter. The ones-stage TC becomes the TENS-stage enable — both stages share ONE clock; the cascade is by enable, never by feeding TC as a clock.',
          'Trace: ones: 0..9; when ones hits 9, tc=1 → at the NEXT edge ones reloads to 0 AND tens increments — the two events are the same edge, phase-aligned by construction.',
          'The tens instance leaves tc unconnected (.tc()) — the empty named connection documents the unused output (module 02).',
          'This cascade pattern scales: hundreds stage enabled by tens.tc — always same-clock, enable-chained.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Modulo-10 counting with TC (educational waveform, illustrative)',
        content:
          '  cnt:  0  1  2  3  4  5  6  7  8  9  0  1 ...\n  tc:   0  0  0  0  0  0  0  0  0  1  0  0 ...\n                                          ^\n                          tc high during cnt=9 (combinational)\n\n  registered wrap pulse (wrap <= tc): high one cycle LATER,\n  aligned with the reload edge.',
        caption:
          'educational waveform (illustrative): TC marks the last count; a registered wrap pulse marks the reload event — one cycle apart, choose deliberately.',
      },
    ],
    tables: [
      {
        caption: 'Counter control semantics',
        headers: ['Condition', 'Action', 'Hardware'],
        rows: [
          ['reset_n = 0', 'cnt <= 0 (async, immediate)', 'Flop async-clear'],
          ['en = 1, cnt < N-1', 'cnt <= cnt + 1', 'Increment mux path'],
          ['en = 1, cnt = N-1', 'cnt <= 0', 'Reload mux path'],
          ['en = 0', 'hold (implicit q <= q)', 'Enable mux feedback'],
        ],
      },
      {
        caption: 'Reset style variants for the same counter',
        headers: ['Aspect', 'Async version', 'Sync version'],
        rows: [
          ['Sensitivity list', 'posedge clk or negedge reset_n', 'posedge clk only'],
          ['Reset timing', 'Immediate on reset_n fall', 'At the next clock edge'],
          ['Course guidance', 'Default (portable template)', 'When project standard demands'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using the TC/rollover signal as a CLOCK for the next stage.',
        fix:
          'Cascade by enable: next_stage.en = this_stage.tc, both on the same clk. TC is combinational (glitch-prone) and a divided clock fragments the domain — both are module 09-l3 violations.',
      },
      {
        mistake: 'Comparing against N instead of N-1 (or resetting when cnt == N).',
        fix:
          'cnt == N is unreachable when the counter wraps at N-1 — the reload never fires and the counter runs to its bit-width wrap instead. The compare constant IS the modulo; make it a parameter-derived single point of truth.',
      },
      {
        mistake: 'Putting the enable OUTSIDE the wrap logic (e.g. wrapping even when disabled).',
        fix:
          'Nest the wrap compare inside `else if (en)`. A counter that reloads while disabled violates freeze semantics — fatal for timers that must resume exactly where they paused.',
      },
    ],
    guidedPractice: {
      title: 'Off-by-one hunt',
      brief:
        'A "mod-10" counter uses `if (cnt == 10) cnt <= 0; else cnt <= cnt + 1;` with a 4-bit cnt. What does it actually count, and what is the fix?',
      expectedBehavior:
        'cnt == 10 (4\'b1010) is reachable! The counter counts 0,1,...,9,10 (eleven states) before reloading at the 11th edge — an 11-count, not 10. The reload condition must compare against the LAST COUNT (N-1 = 9), not the modulus: if (cnt == 4\'d9) cnt <= 0;. General rule: reload when cnt == N-1; the modulus is the COUNT of states, not the reload threshold.',
      hints: [
        'Is 10 reachable in a 4-bit counter that has not reloaded yet?',
        'The counter must hold exactly N states: 0..N-1.',
      ],
    },
    practiceExercises: [
      {
        title: 'Parameterized mod-N with wrap pulse',
        brief:
          'Extend counter_mod10 to output a REGISTERED wrap pulse (wrap) in addition to tc, and instantiate it as mod-6 (N=6). Trace cnt, tc, wrap for 8 edges from reset with en=1.',
        expectedBehavior:
          'Add reg wrap_r; assign wrap = wrap_r; in the clocked block: wrap_r <= (cnt == N-1) when en... simplest correct form: wrap_r <= en & (cnt == N-1); (registered once). Trace N=6: cnt = 1,2,3,4,5,0,1,2; tc high during cnt=5 (after e5); wrap high after e6 (the reload edge) — exactly one cycle later than tc.',
        hints: [
          'The registered pulse samples the TC condition at the edge where the reload happens.',
          'N=6: reload compare is cnt == 5.',
        ],
      },
      {
        title: 'Three-digit cascade (0-999)',
        brief:
          'Extend decade_cascade with a hundreds stage. State every enable connection and confirm the domain count of the design.',
        expectedBehavior:
          'counter_mod10 u_hundreds (.en(tens_tc), ...) — hundreds enabled by tens.tc; tens by ones.tc; all three instances share the SAME clk. Exactly one clock domain; the cascade is purely enable-chained. Total range 000..999 with a clean simultaneous-carry structure.',
        hints: [
          'Each stage’s tc enables the next; clocks are identical everywhere.',
          'Unused tc of the top stage: .tc() unconnected.',
        ],
      },
    ],
    assessment: {
      title: 'Module 10 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A modulo-N counter must reload when cnt equals...',
          options: ['N-1 (the last count)', 'N (the modulus)', 'N+1', '0'],
          answer: 'N-1 (the last count)',
          explanation:
            'The counter holds N states 0..N-1; the reload fires when the LAST count is reached. Comparing against N is either unreachable (if wrapping first) or creates N+1 states.',
          hint: 'How many states does a mod-10 counter hold, and what is the last one?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'For counter_mod10 (N=10) with en=1 from reset, during which count is tc high?',
          code: 'assign tc = (cnt == N-1);   // N=10',
          options: ['while cnt = 9', 'while cnt = 0', 'while cnt = 10', 'never — tc stays 0'],
          answer: 'while cnt = 9',
          explanation:
            'tc = (cnt == 9): asserted during the cycle where the counter holds its last value, before the reload edge.',
          hint: 'The last count of 0..9.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Two mod-10 counters cascade to count 0-99. The correct connection is...',
          options: [
            'ones.tc → tens.en, both clocked by the same clk',
            'ones.tc → tens.clk (ripple)',
            'ones.count → tens.clk',
            'Both counters share the enable input',
          ],
          answer: 'ones.tc → tens.en, both clocked by the same clk',
          explanation:
            'Cascade by clock-enable: the lower stage’s terminal count enables the upper stage’s increment, all on one clock. Using tc as a clock creates a glitchy second domain.',
          hint: 'Data is gated, clocks are not.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'This counter must freeze when en=0 but instead keeps rolling over. Why?',
          code:
            'always @(posedge clk or negedge reset_n) begin\n    if (!reset_n)              cnt <= 0;\n    else if (cnt == N-1)       cnt <= 0;\n    else if (en)               cnt <= cnt + 1;\nend',
          options: [
            'The wrap branch ignores en — reload happens even while disabled',
            'The reset is synchronous',
            'cnt must be 5 bits for N=10',
            'Nothing is wrong',
          ],
          answer: 'The wrap branch ignores en — reload happens even while disabled',
          explanation:
            'The compare/reload sits OUTSIDE the enable gate: a disabled counter sitting at N-1 still reloads to 0. Fix by nesting the wrap inside else if (en).',
          hint: 'Which branch executes when en=0 and cnt = N-1?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the registered wrap-pulse assignment for counter_mod10 (one line, nonblocking, inside the clocked block).',
          answer: 'wrap_r <= (cnt == N-1);',
          explanation:
            'Registered at the reload edge, the wrap pulse fires one cycle after tc — aligned with cnt returning to 0.',
          hint: 'It samples the same condition tc uses.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Modulo-N counter', definition: 'Counts 0..N-1 and reloads; N states, reload compare at N-1.' },
      { term: 'Terminal count (TC)', definition: 'Combinational flag asserted during the last count (cnt == N-1).' },
      { term: 'Wrap pulse', definition: 'Registered pulse fired at the reload edge — one cycle after TC.' },
      { term: 'Enable cascade', definition: 'Chaining counters by connecting each stage’s TC to the next stage’s enable — one shared clock.' },
      { term: 'Freeze semantics', definition: 'Disabled counter holds its exact mid-count value; implemented by nesting wrap inside the enable.' },
    ],
    revisionSummary: [
      'Modulo-N: reload when cnt == N-1; the compare constant is the single source of truth for N.',
      'TC is combinational (during the last count); a registered wrap pulse fires at the reload edge — choose deliberately.',
      'Enable gates counting: nest the wrap inside else if (en) for true freeze semantics.',
      'Cascade counters by enable (tc → en), never by clock; one domain, aligned carries.',
      'Sync and async reset variants share the body; pick one style per project.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Counter (digital)', url: 'https://en.wikipedia.org/wiki/Counter_(digital)', kind: 'article' },
      { label: 'Electronics Tutorials — Counters', url: 'https://www.electronics-tutorials.ws/sequential/seq_4.html', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m10-l3',
    title: 'Serial Links: P2S and S2P with a UART Flavour',
    summary:
      'Build the parallel-to-serial and serial-to-parallel converters — the shift-register workhorses — and assemble a UART-style transmitter frame.',
    objectives: [
      'Design a P2S transmitter: load, shift order, bit counter, done flag.',
      'Design an S2P receiver with a frame-complete pulse.',
      'Assemble a UART-flavored 8N1 frame (start, 8 data LSB-first, stop) at a fixed bit rate.',
      'Specify verification points for serial links.',
    ],
    whyItMatters:
      'Serial links are how chips talk: UART, SPI, I2C all serialize words through shift registers with framing and bit-rate control. The P2S/S2P pair taught here is the honest educational core of a UART transmitter — the linked project (projects.ts) completes it with a proper baud generator. Mastering bit-order, framing and bit-counting here makes every serial protocol course easier.',
    prerequisites: ['vlog-m10-l2', 'vlog-m09-l2'],
    explanation:
      'A **P2S (parallel-to-serial) transmitter** walks a loaded word out one bit per enabled clock:\n\n1. On a load pulse, capture the data word into a shift register AND arm a bit counter.\n2. Every enabled cycle, present the current bit (LSB or MSB per convention) on the serial output and shift the register one position.\n3. When the bit counter reaches the word width, assert done and go idle.\n\nAn **S2P receiver** is the mirror: shift incoming bits into a register, count them, and pulse frame_done when the Nth bit lands — the parallel word is then valid for one cycle (or until the next frame).\n\nThe **UART 8N1 flavor** wraps the raw shift with framing: one START bit (0), eight data bits (LSB first), one STOP bit (1); the line idles high. The transmitter below loads a 10-bit frame {stop, data[7:0], start} and shifts it out LSB-first at a fixed bit period (a baud strobe from module 10-l2 does this properly; this lesson uses a simplified fixed-rate enable so the framing logic stays the focus). Bit order and idle level are CONVENTIONS — the module header states them, and the testbench verifies them bit by bit.',
    deepDive:
      '### The frame-register trick\n\nInstead of a data register plus separate start/stop logic, load the WHOLE frame as one 10-bit shift register: {1\'b1, data, 1\'b0} — stop bit at the top, start bit at the bottom. Shifting RIGHT one position per bit-time with a 1-fill presents bits in order: start (bit 0 first), data[0..7], then stop, then idle 1s forever. One register, one shift expression, zero special cases — the framing is literally the register’s bit pattern. This is the classic UART-TX implementation shape (the projects.ts version adds a proper baud counter and busy flag).\n\n### LSB-first vs MSB-first: a contract, not a preference\n\nUART sends LSB first; SPI mode is configurable; some legacy links are MSB-first. The shift DIRECTION encodes the choice: right-shift with the output tapped at bit 0 gives LSB-first; left-shift tapped at the top gives MSB-first. Getting this wrong produces "perfectly good" data reversed — a bug that survives casual testing (byte 0x01 looks like 0x80) and fails interoperability. State the convention in the header, verify it with a known pattern byte in the testbench (0x01 walks a single 1 through the frame — a self-revealing pattern).\n\n### Bit-rate reality (honest scope note)\n\nA real UART samples the line at a multiple of the bit rate (typically 16x) and majority-votes each bit mid-cell, because both ends run on independent clocks. The transmitter here assumes a shared/ideal bit clock — appropriate for the educational scope and for loopback testing; the projects.ts UART-TX adds the oversampled baud counter, and receiver-side oversampling is a next-course topic.',
    examples: [
      {
        title: 'P2S transmitter with bit counter (fixed bit rate)',
        language: 'verilog',
        code:
          '// p2s_tx.v — parallel-to-serial, LSB first, load-and-go\nmodule p2s_tx(\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire       load,        // 1-cycle pulse: capture and start\n    input  wire [7:0] din,\n    output wire       sdata,       // serial bit stream (LSB first)\n    output wire       busy,        // shifting in progress\n    output wire       done         // 1-cycle pulse: frame complete\n);\n    reg [7:0] shreg;\n    reg [2:0] bcnt;\n    reg       active;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            shreg  <= 8\'d0;\n            bcnt   <= 3\'d0;\n            active <= 1\'b0;\n        end else if (load) begin\n            shreg  <= din;         // capture the whole word\n            bcnt   <= 3\'d0;        // 8 bits to send\n            active <= 1\'b1;\n        end else if (active) begin\n            shreg  <= {1\'b0, shreg[7:1]};  // shift right: LSB leaves first\n            if (bcnt == 3\'d7) begin\n                active <= 1\'b0;    // 8 bits sent\n                bcnt   <= 3\'d0;\n            end else begin\n                bcnt   <= bcnt + 3\'d1;\n            end\n        end\n    end\n\n    assign sdata = shreg[0];       // the CURRENT output bit\n    assign busy  = active;\n    assign done  = active && (bcnt == 3\'d7);  // during the last bit\n\nendmodule',
        explanation: [
          'load captures the word and arms the transmitter; every subsequent clock shifts right, so bit 0 (the LSB) is on sdata first — the LSB-first contract.',
          'The bit counter runs 0..7; on the 8th shift the transmitter goes idle. done is asserted during the LAST bit cycle (a hand-shaking hook for back-to-back frames).',
          'The 1\'b0 fill from the left means trailing bits after the frame are zeros — for a real UART you fill with 1s (idle high) — see the UART flavor example.',
          'Trace din=8\'b0000_0001 (LSB-first witness pattern): sdata shows 1,0,0,0,0,0,0,0 — the single 1 exits first. din=0x80 would exit as 0,0,0,0,0,0,0,1.',
          'busy rises with load (same edge, registered) and falls when the last bit shifts — consumers use busy to avoid reloading mid-frame.',
        ],
      },
      {
        title: 'UART-flavored 8N1 transmitter (frame register + start/stop)',
        language: 'verilog',
        code:
          '// uart_tx_simple.v — 8N1 frame, fixed bit rate (educational scope)\n// Frame: START(0), data[0..7] LSB first, STOP(1). Line idles high.\nmodule uart_tx_simple(\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire       send,        // 1-cycle pulse: transmit din\n    input  wire [7:0] din,\n    output wire       tx           // the serial line\n);\n    reg [9:0] frame;      // {stop, data[7:0], start}\n    reg [3:0] bcnt;       // 10 bits to send\n    reg       active;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            frame  <= 10\'h3FF;         // all 1s: idle line\n            bcnt   <= 4\'d0;\n            active <= 1\'b0;\n        end else if (send && !active) begin\n            frame  <= {1\'b1, din, 1\'b0};  // build the whole frame at once\n            bcnt   <= 4\'d0;\n            active <= 1\'b1;\n        end else if (active) begin\n            frame  <= {1\'b1, frame[9:1]};  // shift right, fill with IDLE (1)\n            if (bcnt == 4\'d9)\n                active <= 1\'b0;            // frame complete\n            else\n                bcnt   <= bcnt + 4\'d1;\n        end\n    end\n\n    assign tx = active ? frame[0] : 1\'b1;   // idle high between frames\n\nendmodule',
        explanation: [
          'The frame register packs the ENTIRE 8N1 frame at load time: bit 0 = start (0), bits 1-8 = data LSB-first, bit 9 = stop (1). Shifting right with 1-fill presents them in order and then idles the line high.',
          'tx = frame[0] while active, forced 1 when idle — the line never glitches low between frames.',
          'Trace din = 8\'b0000_0101 (0x05): frame at load = {stop=1, din=00000101, start=0} = 10\'b1000_0010_10. tx sequence: 0 (START), 1 (d0), 0 (d1), 1 (d2), 0, 0, 0, 0 (d3..d7), 1 (STOP), then idle 1s.',
          'The send-when-active guard (send && !active) drops overlapping requests — a documented limitation; the projects.ts UART adds a FIFO or busy indication.',
          'This module assumes one bit per clk (fixed rate) — the educational simplification. The project version replaces the implicit rate with a baud-tick enable; framing logic is UNCHANGED — which is exactly why it was kept separate.',
        ],
      },
      {
        title: 'S2P receiver with frame-done pulse',
        language: 'verilog',
        code:
          '// s2p_rx.v — serial-to-parallel, LSB first, fixed bit rate\nmodule s2p_rx(\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire       bit_en,      // 1-cycle strobe: a new bit is valid NOW\n    input  wire       sdata,       // serial input\n    output wire [7:0] dout,        // reassembled word\n    output wire       frame_done   // 1-cycle pulse: 8 bits collected\n);\n    reg [7:0] shreg;\n    reg [2:0] bcnt;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            shreg <= 8\'d0;\n            bcnt  <= 3\'d0;\n        end else if (bit_en) begin\n            shreg <= {sdata, shreg[7:1]};  // MSB-first accumulation\n                                          // (first bit ends up at bit 7:\n                                          //  matches LSB-first TX order)\n            if (bcnt == 3\'d7) begin\n                bcnt <= 3\'d0;              // frame complete; next bit_en\n                                          // overwrites shreg (new frame)\n            end else begin\n                bcnt  <= bcnt + 3\'d1;\n            end\n        end\n    end\n\n    assign dout       = shreg;\n    assign frame_done = bit_en && (bcnt == 3\'d7);  // during the 8th bit\n\nendmodule',
        explanation: [
          'Each bit_en strobe admits one bit. The accumulate direction {sdata, shreg[7:1]} puts each NEW bit at bit 7 and moves older bits down — the mirror of the TX shift. For din = 0x01 sent LSB-first (bits arrive 1,0,0,0,0,0,0,0), the accumulation walks 1000_0000 → 0100_0000 → ... → 0000_0001, so after the 8th strobe dout = 0x01 exactly — the receiver REVERSES the shift direction relative to the transmitter, which is how LSB-first TX pairs with this accumulate order.',
          'frame_done pulses (combinational on bit_en) during the 8th bit strobe; consumers sample dout at that strobe. A registered version would fire one cycle later — the module 10-l2 TC-vs-wrap choice again.',
          'After frame_done the counter restarts; the next 8 strobes overwrite shreg — back-to-back frames work with no idle handling (the word updates in place).',
          'Verification points for any serial link: bit order (0x01 and 0x80 witness patterns), frame boundary timing (done exactly on the 8th bit), idle behavior between frames, and reset cleanliness (no phantom done pulses).',
          'Real UART receivers add start-bit detection and 16x oversampling — the honest scope boundary of this lesson (noted in deepDive); the project version of the TX side adds the baud counter.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'UART 8N1 frame for data 0x05 (educational waveform, illustrative)',
        content:
          '  tx (idle 1)  ▔▔\\_  bit0=1  bit1=0  bit2=1  bit3..7=0  _/▔▔▔▔ idle\n               start (0)                              stop (1)\n\n  bit order:  START, d0, d1, d2, d3, d4, d5, d6, d7, STOP\n  data 0x05 = 0000_0101 -> d0=1, d1=0, d2=1, d3..d7=0\n\n  time ->   each bit one bit-period wide (here: one clk for simplicity)',
        caption:
          'educational waveform (illustrative): the frame register emits START, the eight data bits LSB-first, and STOP — then idles high.',
      },
    ],
    tables: [
      {
        caption: 'UART 8N1 frame layout',
        headers: ['Position', 'Bit', 'Value'],
        rows: [
          ['1st', 'START', '0'],
          ['2nd-9th', 'data[0]..data[7] (LSB first)', 'payload'],
          ['10th', 'STOP', '1'],
          ['between frames', 'IDLE', '1'],
        ],
      },
      {
        caption: 'P2S/S2P verification points',
        headers: ['Check', 'Method', 'Pass criterion'],
        rows: [
          ['Bit order', 'Send 0x01 and 0x80 (witness patterns)', 'Single 1 exits first / last respectively'],
          ['Frame length', 'Count cycles from load to done', 'Exactly 8 (or 10 with framing)'],
          ['Idle level', 'Observe line between frames', 'Stays high, no glitches'],
          ['Reset cleanliness', 'Reset mid-frame', 'No phantom done; line returns to idle'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Shifting the transmitter one way and accumulating the receiver the same way, then shipping reversed bytes.',
        fix:
          'TX shifts right (LSB out first); an LSB-first RX accumulates as {sdata, shreg[7:1]}. Verify with the 0x01/0x80 witness patterns — a wrong pairing fails them immediately.',
      },
      {
        mistake: 'Filling the shift register with zeros on a UART TX, dragging the line low after the frame.',
        fix:
          'UART idle is HIGH: fill with 1s ({1\'b1, frame[9:1]}) and force tx=1 when inactive. A zero-filled register holds the line low — the receiver reads a spurious start bit.',
      },
      {
        mistake: 'Accepting a new send while the transmitter is mid-frame.',
        fix:
          'Guard with send && !active (or expose busy and make the consumer wait). Overwriting a shifting register corrupts the current frame silently.',
      },
    ],
    guidedPractice: {
      title: 'Walk a frame bit by bit',
      brief:
        'For uart_tx_simple with din = 8\'b0000_0101: write the frame register value at load, then the tx output for each of the 10 active cycles plus idle. Confirm the start bit, the LSB-first data order, and the stop bit.',
      expectedBehavior:
        'frame at load = {stop=1, din=00000101, start=0} = 10\'b1000_0010_10. tx per cycle (frame[0], shifting right with 1-fill): 0 (START), 1 (d0), 0 (d1), 1 (d2), 0, 0, 0, 0 (d3..d7), 1 (STOP), 1 (idle fill). The witness: 1s in the data field at the 1st and 3rd data positions — matching 0x05 LSB-first.',
      hints: [
        'Build the register from the outside in: stop, then data, then start.',
        'Each cycle the LSB exits and a 1 enters at the top.',
      ],
    },
    practiceExercises: [
      {
        title: 'MSB-first variant',
        brief:
          'Modify p2s_tx to send MSB first (tap bit 7, shift left with 0-fill). State the new sdata sequence for din = 8\'b0000_0101.',
        expectedBehavior:
          'sdata = shreg[7]; shift: shreg <= {shreg[6:0], 1\'b0};. Sequence for 0x05: 0,0,0,0,0,1,0,1 — the byte reversed relative to the LSB-first version. The receiver’s accumulate direction must flip to match.',
        hints: [
          'MSB-first: output the top bit; new bits enter at the bottom.',
          '0x05 = 00000101: MSB-first order reads the string left to right.',
        ],
      },
      {
        title: 'Loopback sanity test',
        brief:
          'Sketch (in words + a module skeleton) a loopback testbench: p2s_tx drives s2p_rx directly (sdata to sdata, a strobe as bit_en for both). Which din values prove bit-order correctness, and what must dout equal after each frame?',
        expectedBehavior:
          'Drive the same bit_en strobe to both (TX shifts on it; RX admits on it). Witness values 8\'h01 and 8\'h80 prove bit order (their single 1 lands at opposite ends); random values like 8\'hA5 prove content. After each 8-bit frame, dout must equal the sent din — assert with !== at frame_done.',
        hints: [
          'The strobe must tick exactly 8 times per frame.',
          'Check dout exactly when frame_done pulses.',
        ],
      },
    ],
    assessment: {
      title: 'Module 10 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In the UART 8N1 frame, what is the bit order of the data field?',
          options: ['LSB first', 'MSB first', 'Configurable per frame', 'Alternating'],
          answer: 'LSB first',
          explanation:
            'UART convention sends data bit 0 first; the frame register {1\'b1, din, 1\'b0} shifted right emits exactly that order.',
          hint: 'Which end of the byte leaves the shift register first when shifting right?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'uart_tx_simple sends din = 8\'b1000_0000. What is the SECOND bit on the wire after the start bit?',
          code:
            'frame <= {1\'b1, din, 1\'b0};\nassign tx = frame[0];   // shift right, LSB first\n// din = 8\'b1000_0000',
          options: ['0', '1', 'x', 'stop bit'],
          answer: '0',
          explanation:
            'After the start bit, data bits go LSB-first: din[0] = 0, din[1] = 0, ... The first data bit (din[0]) is 0, and the second is also 0. The single 1 (din[7]) is the LAST data bit.',
          hint: 'List din[0], din[1], ... in order.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A UART transmitter whose shift register fills with zeros after the last data bit holds the line in the idle (correct) state.',
          answer: 'false',
          explanation:
            'UART idle is HIGH. Zero-fill drags the line low after the stop bit — the receiver interprets it as a start bit. Fill with 1s and force tx=1 when inactive.',
          hint: 'What level is the idle line?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A loopback of p2s_tx (shift right, LSB-first out) into an S2P that accumulates as {shreg[6:0], sdata} produces reversed bytes. What is the mismatch?',
          code:
            '// TX: sdata = shreg[0]; shreg <= {1\'b0, shreg[7:1]};\n// RX: shreg <= {shreg[6:0], sdata};',
          options: [
            'The RX accumulates MSB-first into the bottom — its shift direction must mirror the TX (use {sdata, shreg[7:1]})',
            'The TX should send MSB first',
            'The bit counter is wrong',
            'Nothing — the code is correct',
          ],
          answer: 'The RX accumulates MSB-first into the bottom — its shift direction must mirror the TX (use {sdata, shreg[7:1]})',
          explanation:
            'An LSB-first TX must pair with an RX that accumulates {sdata, shreg[7:1]} (first bit ends at bit 7). The shown RX pushes bits the other way, reversing the byte. Witness pattern 0x01 catches it.',
          hint: 'Where must the FIRST transmitted bit end up in the RX register?',
          difficulty: 'hard',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'How many bits are in a complete UART 8N1 frame including start and stop (number)?',
          answer: '10',
          explanation:
            '1 start + 8 data + 1 stop = 10 bits — hence the 10-bit frame register {stop, data, start}.',
          hint: 'Framing adds two bits to the payload.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'P2S', definition: 'Parallel-to-serial converter: loads a word, shifts one bit per enabled clock.' },
      { term: 'S2P', definition: 'Serial-to-parallel converter: accumulates N bits, pulses frame-complete.' },
      { term: '8N1', definition: 'UART framing: 1 start bit (0), 8 data bits LSB-first, 1 stop bit (1); idle high.' },
      { term: 'Bit counter', definition: 'Counts shifted bits 0..N-1; drives done/frame_done and return-to-idle.' },
      { term: 'Witness pattern', definition: 'A test value (0x01, 0x80) whose structure makes bit-order errors self-revealing.' },
    ],
    revisionSummary: [
      'P2S: load, shift right (LSB-first), count 8 bits, done; guard against mid-frame reloads.',
      'UART 8N1: frame register {1, din, 0}, 1-fill for idle-high, tx forced 1 when inactive.',
      'S2P mirrors the TX shift direction: {sdata, shreg[7:1]} for LSB-first TX.',
      'Witness patterns (0x01/0x80) and frame-boundary checks are the serial-link verification core.',
      'Fixed bit rate is the educational scope; real UARTs add baud counters and oversampling (project version does the TX side).',
    ],
    furtherReading: [
      { label: 'Wikipedia — Universal asynchronous receiver-transmitter', url: 'https://en.wikipedia.org/wiki/Universal_asynchronous_receiver-transmitter', kind: 'article' },
      { label: 'Wikipedia — Shift register', url: 'https://en.wikipedia.org/wiki/Shift_register', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
];
