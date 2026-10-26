import type { TutorialLesson } from '../types';

export const module04Lessons: TutorialLesson[] = [
  {
    id: 'fpga-m04-l1',
    title: 'Labs 1-2: LED Blink and Switch Gating',
    summary:
      'The classic first labs, done properly: a blinker whose counter width is derived from arithmetic, and a combinational switch gate — both written simulation-first, with honest notes on what changes when a real board appears.',
    objectives: [
      'Derive counter width from clock frequency and target blink period (25 bits for 0.5 s at 50 MHz).',
      'Write a parameterized blinker with async active-low reset and a terminal-count toggle.',
      'Write a pure combinational input-gating lab and predict its LUT cost (one LUT4).',
      'State exactly which steps of these labs require physical hardware and which are fully simulable in iverilog on this platform.',
    ],
    whyItMatters:
      'Blinking an LED is the FPGA equivalent of "hello world" — and doing it *deliberately* teaches the two habits that separate professionals from tutorial-followers: deriving numbers from requirements (counter width math) and verifying in simulation before hardware. The gating lab then shows the floor of FPGA cost: your entire design in one lookup table.',
    prerequisites: [
      'Flip-flops and clocked always-blocks (Verilog course)',
      'Fabric resources: LUTs, FFs, I/O blocks (fpga-m01-l3)',
      'Pin constraints and planning tables (fpga-m03-l1)',
    ],
    explanation:
      'Both labs target a hypothetical board with a 50 MHz oscillator, a few switches and a few LEDs — the classic beginner setup. Every lab here follows the same contract, stated once: **the RTL is complete and simulable with iverilog on this platform; the hardware steps (pin planning table, constraints file, board programming) require a real dev board and are described conceptually.** This platform has no physical FPGA and no synthesis tools, so "done" means "testbench passes in simulation" — and we say so every time.\n\n### Lab 1: the blinker, from math to RTL\n\nRequirement: an LED that blinks at 1 Hz (0.5 s on, 0.5 s off) from a 50 MHz clock. The LED state changes every 0.5 s, so a counter must measure 0.5 s = 0.5 × 50,000,000 = **25,000,000 cycles**. Width: 2^24 = 16,777,216 is too small; 2^25 = 33,554,432 suffices, so the counter is **25 bits**. The design counts 0 to 24,999,999, then toggles the LED and clears — a terminal-count toggle, the workhorse pattern of all FPGA timing.\n\n### Lab 2: gating, and what "free" means\n\nRequirement: LED on only while switch 0 AND switch 1 are on. This is one combinational assignment: `assign led = sw0 & sw1;`. On fabric it costs exactly **one LUT4** (and zero FFs — nothing is clocked). The lab\'s teaching point is calibration: after Module 2\'s utilization lessons, you should *predict* one LUT before building, then check the report and find one LUT. Estimates you verify become intuition; estimates you never check become folklore.',
    deepDive:
      '### Why terminal-count toggle instead of counting to 50,000,000\n\nA tempting alternative counts a full second (50,000,000 cycles, 26 bits) and drives the LED from the counter MSB. That trick produces a square wave only if the count range is a power of two — and 50,000,000 is not, so the MSB is high for an *uneven* fraction of the cycle (2^26 = 67,108,864 versus the 50,000,000 actually counted), producing an asymmetric blink. The toggle-at-terminal-count pattern sidesteps this entirely: it is exact for any period. This is a real trap — many first blinkers blink with an uneven duty cycle and nobody notices for weeks.\n\n### Reset discipline in the labs\n\nAll labs use the platform convention: async active-low `reset_n`, nonblocking assignments in clocked blocks. On a real board, reset_n would come from a button or a power-on-reset circuit, and its pin constraint (Lesson m03-l1) matters as much as the LED\'s. In simulation we drive it in the testbench: assert low, wait a few cycles, release before the rising edge — never mid-edge.',
    examples: [
      {
        title: 'Lab 1: parameterized blinker with the width math embedded',
        language: 'verilog',
        code:
          'module blinker #(\n    parameter integer TOGGLE_CYCLES = 25_000_000  // 0.5 s at 50 MHz\n) (\n    input  wire clk,\n    input  wire reset_n,                 // async active-low\n    output reg  led\n);\n    // Width derivation: need to hold 24,999,999.\n    // 2^24 = 16,777,216 (too small); 2^25 = 33,554,432 -> 25 bits.\n    localparam integer CNT_W = 25;\n\n    reg [CNT_W-1:0] cnt;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            cnt <= {CNT_W{1\'b0}};\n            led <= 1\'b0;\n        end else if (cnt == TOGGLE_CYCLES - 1) begin\n            cnt <= {CNT_W{1\'b0}};\n            led <= ~led;                 // toggle every 0.5 s\n        end else begin\n            cnt <= cnt + 1\'b1;\n        end\n    end\nendmodule',
        explanation: [
          'Parameter line: TOGGLE_CYCLES = 25,000,000 encodes the requirement (0.5 s at 50 MHz) as arithmetic, not as a magic number — change the clock or period by changing math, not code.',
          'Localparam CNT_W = 25 with the derivation in the comment: the counter must represent 0 through 24,999,999; 24,999,999 < 2^25 = 33,554,432 but > 2^24 − 1 = 16,777,215, so 25 bits are necessary and sufficient.',
          'Reset branch: async active-low, clears counter and LED — platform convention.',
          'Terminal-count branch: `cnt == TOGGLE_CYCLES - 1` fires on the 25,000,000th cycle; the toggle makes led blink at exactly 1 Hz (0.5 s low, 0.5 s high).',
          'Trace (first seconds): reset releases at t=0 with cnt=0, led=0. cnt counts up; at the cycle where cnt=24,999,999, led flips to 1 and cnt clears. Flip again at t=1.0 s, t=1.5 s... a 1 Hz square wave.',
        ],
      },
      {
        title: 'Labs 1-2: testbench skeleton (iverilog-runnable) and Lab 2 gate',
        language: 'verilog',
        code:
          '// Lab 2: one-LUT gate — the whole design.\nmodule sw_gate (\n    input  wire sw0,\n    input  wire sw1,\n    output wire led\n);\n    assign led = sw0 & sw1;   // predicted cost: 1 LUT4, 0 FFs\nendmodule\n\n// Lab 1 testbench: verify 1 Hz blink by counting toggles.\n`timescale 1ns/1ps\nmodule tb_blinker;\n    reg clk = 0;\n    reg reset_n = 0;\n    wire led;\n\n    blinker #(.TOGGLE_CYCLES(50)) dut (   // shrunk: 50 cycles = 1 us period\n        .clk(clk), .reset_n(reset_n), .led(led)\n    );\n\n    always #10 clk = ~clk;               // 50 MHz\n\n    initial begin\n        #100 reset_n = 1;                // release after 5 clocks\n        #5200;                           // > 5 toggle periods at 50 cycles\n        $display("TEST DONE: watch led toggle every 50 cycles (1 us)");\n        $finish;\n    end\nendmodule',
        explanation: [
          'Lab 2 is one continuous assignment: sw0 AND sw1. On any 4-input-LUT family this is a single LUT; the testbench can verify all four input combinations exhaustively.',
          'The testbench shrinks TOGGLE_CYCLES to 50 — the parameterization exists precisely so simulation can verify *structure* (terminal-count toggle) without simulating 25 million cycles.',
          '`always #10 clk = ~clk;` makes a 50 MHz clock (20 ns period): the same frequency the real board would use, so the only lab change on hardware is TOGGLE_CYCLES back to 25,000,000.',
          'Reset is released at t=100 ns (after 5 clock edges) — cleanly between edges, per the reset discipline note.',
          'Honest hardware note: on a real board, Lab 1 additionally needs a planning table + pin constraints for clk, reset_n and led, and Lab 2 for sw0/sw1 — the RTL is unchanged.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Lab 1 and Lab 2 structures',
        content:
          'LAB 1 (sequential, 25 FFs + carry):        LAB 2 (combinational, 1 LUT):\n\n   clk -->+---------+   +------+            sw0 ---+--[ LUT4 ]-- led\n          | counter |-->| mux/ |--> led            |     AND\n   rst_n->| 25 bits |   | togg |            sw1 ---+\n          +---------+   +------+\n             ^  cnt==TOGGLE-1 clears and toggles',
        caption:
          'Lab 1 spends 25 FFs and a carry chain to make time; Lab 2 spends one LUT to make a decision. Together they bracket the fabric\'s cost range.',
      },
    ],
    tables: [
      {
        caption: 'Counter width derivation table (50 MHz clock) — do this arithmetic every time',
        headers: ['Target event', 'Cycles needed', 'Minimum bits', 'Reasoning'],
        rows: [
          ['Toggle every 0.5 s (1 Hz blink)', '25,000,000', '25', '2^24 = 16.7M < 25M; 2^25 = 33.6M >= 25M'],
          ['Tick every 1 ms (display scan)', '50,000', '16', '2^15 = 32,768 < 50,000; 2^16 = 65,536 >= 50,000'],
          ['Tick every 1 s (FSM seconds)', '50,000,000', '26', '2^25 = 33.5M < 50M; 2^26 = 67.1M >= 50M'],
          ['1 baud bit at 115200', '434 (approx)', '9', '2^8 = 256 < 434; 2^9 = 512 >= 434'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Choosing counter width by eyeballing ("24 bits sounds right").',
        fix: 'Do the division and the power-of-two comparison explicitly, as the width table shows. A 24-bit counter silently wraps at 16,777,216 cycles (0.3355 s at 50 MHz), producing a fast, slightly wrong blink that looks superficially correct.',
      },
      {
        mistake: 'Driving the LED from combinational logic on a long counter (e.g., led = ~cnt[24]).',
        fix: 'Unless the terminal count is a power of two, MSB taps give uneven duty cycles (see deep dive). Use the terminal-count toggle pattern, which is exact for arbitrary periods.',
      },
      {
        mistake: 'Simulating the full 25,000,000-cycle period because the parameter "must match hardware".',
        fix: 'Parameterize the period and shrink it in simulation. You are verifying the toggle *structure*, not wall-clock time. Hardware correctness comes from the same parameter restored to 25,000,000.',
      },
    ],
    guidedPractice: {
      title: 'Re-derive the blinker for a new board',
      brief:
        'A new board has a 12 MHz oscillator. Recompute TOGGLE_CYCLES and CNT_W for a 1 Hz blink, then state what changes in the RTL (ideally: nothing but parameters). Show the power-of-two comparison.',
      starterCode:
        'CLK = 12,000,000 Hz\nHalf period = 0.5 s\nTOGGLE_CYCLES = ______\n2^N = ______ >= TOGGLE_CYCLES\nCNT_W = ______',
      expectedBehavior:
        'TOGGLE_CYCLES = 12,000,000 / 2 = 6,000,000. 2^22 = 4,194,304 < 6,000,000; 2^23 = 8,388,608 >= 6,000,000, so CNT_W = 23. In the parameterized RTL nothing changes except the instantiation parameter — that is the point of parameters.',
      hints: [
        'Cycles = frequency × time; half the blink period is what the counter measures.',
        'Find the smallest N with 2^N >= 6,000,000.',
        'If you find yourself editing the always-block, you have missed the parameterization lesson.',
      ],
    },
    practiceExercises: [
      {
        title: 'Exhaustive gate verification',
        brief:
          'Write a testbench loop for sw_gate that drives all four (sw0,sw1) combinations and prints the led result; state the expected four-line output.',
        expectedBehavior:
          'Using a for loop over {sw0,sw1} = 00,01,10,11 with a small settle delay each: led prints 0,0,0,1 — AND truth. Four lines, exhaustive, no clock needed (combinational).',
        hints: [
          'Combinational logic needs settle time (#1 is fine) after each input change, not clock edges.',
          'Loop the 2-bit concatenation {sw0,sw1} from 0 to 3 and unpack.',
          'Expected rows come straight from the AND truth table.',
        ],
      },
      {
        title: 'Duty-cycle detective',
        brief:
          'A colleague’s blinker uses led = ~cnt[25] with cnt counting 0..49,999,999 (26 bits, 1 s period at 50 MHz). Without simulating, predict the LED duty cycle and justify with the power-of-two argument.',
        expectedBehavior:
          'The MSB is high whenever bit 25 is set: counts 33,554,432..49,999,999 — 16,445,568 cycles high out of 50,000,000 (~32.9%), low ~67.1%. A 67/33 blink instead of 50/50. Fix: terminal-count toggle.',
        hints: [
          'Bit 25 is 1 for which range of count values?',
          'Compare that range’s size to 50,000,000.',
          '2^26 = 67,108,864 — the counter never reaches it; that gap is the asymmetry.',
        ],
      },
    ],
    assessment: {
      title: 'Labs 1-2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'At 50 MHz, how many clock cycles does one 0.5 s half-period contain, and what counter width covers counting it?',
          options: [
            '25,000,000 cycles; 25 bits',
            '50,000,000 cycles; 25 bits',
            '25,000,000 cycles; 24 bits',
            '5,000,000 cycles; 23 bits',
          ],
          answer: '25,000,000 cycles; 25 bits',
          explanation:
            '0.5 s × 50,000,000 Hz = 25,000,000 cycles. Counting 0..24,999,999 needs 25 bits (2^24 = 16,777,216 is too small; 2^25 = 33,554,432 suffices).',
          hint: 'Frequency × time = cycles; then compare against powers of two.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Reading a counter MSB directly (led = ~cnt[24] style) always produces a 50% duty-cycle blink when the terminal count is not a power of two.',
          answer: 'false',
          explanation:
            'The MSB is set only while the count exceeds 2^24, and since the terminal count (25,000,000) is not a power of two, that fraction is not half — the blink is asymmetric. Terminal-count toggle is exact for any period.',
          hint: 'What fraction of 0..24,999,999 has bit 24 set?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'In sw_gate (led = sw0 & sw1), what is led when sw0=1 and sw1=0?',
          code: 'assign led = sw0 & sw1;  // sw0=1, sw1=0',
          options: ['0', '1', 'x', 'z'],
          answer: '0',
          explanation:
            'AND outputs 1 only when both inputs are 1; with sw1=0 the gate outputs 0.',
          hint: 'AND is the "all inputs high" function.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: what fabric resource does the Lab 2 gate consume exactly one of, on a 4-input-LUT family?',
          answer: 'LUT',
          explanation:
            'A two-input AND is one 4-input LUT (two inputs tied or unused). Zero flip-flops — the lab is purely combinational.',
          hint: 'It is the truth-table element from Module 1.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Terminal-count toggle', definition: 'Pattern: count to N−1, clear, toggle an output — exact timing for arbitrary N.' },
      { term: 'Counter width math', definition: 'Deriving register width as the smallest N with 2^N >= required cycle count.' },
      { term: 'Parameterized period', definition: 'Encoding the timing requirement as a parameter so simulation can shrink it.' },
      { term: 'Duty cycle', definition: 'Fraction of the period a signal is high; MSB taps give wrong duty for non-power-of-two counts.' },
      { term: 'Simulation-first lab', definition: 'A lab whose verification completes in iverilog simulation, with hardware steps documented conceptually.' },
    ],
    revisionSummary: [
      'Cycles = frequency × time; width = smallest N with 2^N >= count. 0.5 s at 50 MHz = 25M cycles = 25 bits.',
      'Terminal-count toggle is exact for any period; MSB taps are only exact for power-of-two ranges.',
      'Lab 2 costs one LUT and zero FFs — calibrate your estimates against such floors.',
      'Labs are simulation-complete on this platform (iverilog); hardware steps need a real board and a planning table.',
      'Reset discipline: async active-low reset_n, released between clock edges in the testbench.',
    ],
    furtherReading: [
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
      { label: 'Wikipedia — Field-programmable gate array', url: 'https://en.wikipedia.org/wiki/Field-programmable_gate_array', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'fpga-m04-l2',
    title: 'Labs 3-4: Seven-Segment Multiplexed Display and PWM Dimmer',
    summary:
      'Two human-interface classics: a four-digit multiplexed seven-segment controller with refresh-rate math, and an 8-bit PWM dimmer with frequency math — both simulation-complete, both with real-board honesty notes.',
    objectives: [
      'Derive the scan timing for a 4-digit multiplexed display: 1 ms per digit, 16-bit counter at 50 MHz, 250 Hz frame rate.',
      'Write the BCD-to-seven-segment decoder and the digit multiplexer as separate combinational blocks.',
      'Derive PWM frequency from counter width (50 MHz / 256 ≈ 195 kHz for 8 bits) and explain why that is flicker-free.',
      'Explain the multiplexing trade: shared segment lines and per-digit duty cycle, and what that changes on a real board.',
    ],
    whyItMatters:
      'These two labs are the bridge from "a blinking LED" to "an interface a human actually reads". The seven-segment controller is the standard first multi-block design — three cooperating pieces with a shared timing budget — and the PWM lab introduces duty-cycle thinking that recurs in motor control, audio and power electronics. Both also teach the honest math habit: compute the timing numbers before writing the always-blocks.',
    prerequisites: [
      'Terminal-count pattern (fpga-m04-l1)',
      'Combinational case statements (Verilog course)',
      'Width-derivation table (fpga-m04-l1)',
    ],
    explanation:
      '### Lab 3: four digits, one set of segment lines\n\nA four-digit seven-segment display wired naively needs 7 segments × 4 digits = 28 pins. Real boards multiplex: all four digits share the 7 segment lines, and a digit-select output enables exactly one digit at a time. If the scan is fast enough, persistence of vision fuses the four flashes into a steady display.\n\n**The timing math.** Scan each digit for 1 ms: at 50 MHz that is 50,000 cycles per digit, needing a 16-bit counter (2^15 = 32,768 < 50,000; 2^16 = 65,536 >= 50,000). One full frame is 4 × 1 ms = 4 ms → **250 Hz frame rate**, comfortably above the roughly 50-90 Hz where humans perceive flicker. Faster scans only burn power; slower ones (below ~60-100 Hz frame rate) visibly flicker.\n\n**The structure** — three blocks, worth internalizing as a template: a *scan timer* (terminal-count + index), a *digit select mux* (picks the active digit\'s BCD nibble), and a *BCD-to-segment decoder* (a pure combinational case). Each block is independently testable — the multi-block habit that scales to real designs.\n\n### Lab 4: PWM, from width to frequency\n\nPulse-width modulation drives the LED with a fast square wave whose duty cycle encodes brightness; the eye averages the flashes. An 8-bit free-running counter at 50 MHz gives PWM frequency 50,000,000 / 256 ≈ **195.3 kHz** — far above any visible flicker, which is why 8-bit PWM looks perfectly smooth. The comparator `cnt < duty` is the entire modulator: duty 0 → always off, duty 255 → on 255/256 of the time.',
    deepDive:
      '### The multiplexing trade, honestly\n\nMultiplexing saves pins but each digit is now lit only 1/4 of the time (25% duty). On a real board that has a visible consequence: per-digit average brightness drops, so designs either accept dimmer digits, raise per-pulse current toward the digit\'s peak rating, or scan faster. Peak-vs-average current is a datasheet question (the display\'s, the transistor\'s, and the FPGA pin\'s) — exactly the "verify against official docs" discipline the microcontrollers course teaches. The digit-select output usually drives a transistor, not the digit pin directly, because a whole digit\'s segments can sum to more current than one FPGA pin should source. None of this changes the RTL; all of it changes the board design — which is why this lab is honest about where RTL ends.\n\n### Why the decoder and the mux must stay separate blocks\n\nIt is tempting to fuse digit selection and segment decoding into one giant case over 16 bits. Resist: separate blocks give separate testbenches (decode truth table is 10 rows; mux is 4 rows), cleaner timing reports (each path is short), and independent reuse. The scan timer / mux / decoder split is also precisely how you would pipeline this design if timing ever demanded it — a registered decode stage between mux and pins is the m03-l3 pipeline fix in miniature.',
    examples: [
      {
        title: 'Lab 3: complete four-digit multiplexed display controller',
        language: 'verilog',
        code:
          'module seg4_mux (\n    input  wire        clk,\n    input  wire        reset_n,      // async active-low\n    input  wire [15:0] bcd_in,       // {dig3,dig2,dig1,dig0}, 4-bit BCD each\n    output reg  [6:0]  seg,          // {g,f,e,d,c,b,a}, active-high\n    output reg  [3:0]  an            // one-hot digit select\n);\n    localparam integer TICKS = 50_000;   // 1 ms per digit at 50 MHz\n    localparam integer CNT_W = 16;       // 2^16 = 65,536 >= 50,000\n\n    reg [CNT_W-1:0] tick_cnt;\n    reg [1:0]       dig_idx;\n\n    // Block 1: scan timer\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            tick_cnt <= {CNT_W{1\'b0}};\n            dig_idx  <= 2\'d0;\n        end else if (tick_cnt == TICKS - 1) begin\n            tick_cnt <= {CNT_W{1\'b0}};\n            dig_idx  <= dig_idx + 1\'b1;\n        end else begin\n            tick_cnt <= tick_cnt + 1\'b1;\n        end\n    end\n\n    // Block 2: digit-select mux\n    reg [3:0] dig;\n    always @(*) begin\n        case (dig_idx)\n            2\'d0:    dig = bcd_in[3:0];\n            2\'d1:    dig = bcd_in[7:4];\n            2\'d2:    dig = bcd_in[11:8];\n            default: dig = bcd_in[15:12];\n        endcase\n    end\n\n    // Block 3: BCD -> seven segments ({g,f,e,d,c,b,a}, common-cathode style)\n    always @(*) begin\n        case (dig)\n            4\'d0:    seg = 7\'b0111111;\n            4\'d1:    seg = 7\'b0000110;\n            4\'d2:    seg = 7\'b1011011;\n            4\'d3:    seg = 7\'b1001111;\n            4\'d4:    seg = 7\'b1100110;\n            4\'d5:    seg = 7\'b1101101;\n            4\'d6:    seg = 7\'b1111101;\n            4\'d7:    seg = 7\'b0000111;\n            4\'d8:    seg = 7\'b1111111;\n            4\'d9:    seg = 7\'b1101111;\n            default: seg = 7\'b0000000;  // blank for non-BCD inputs\n        endcase\n    end\n\n    // Digit-select drive (board polarity may be active-low on real boards)\n    always @(*) begin\n        case (dig_idx)\n            2\'d0:    an = 4\'b0001;\n            2\'d1:    an = 4\'b0010;\n            2\'d2:    an = 4\'b0100;\n            default: an = 4\'b1000;\n        endcase\n    end\nendmodule',
        explanation: [
          'Scan timer: counts 0..49,999 (TICKS − 1) = 50,000 cycles = 1 ms per digit; dig_idx then advances, giving a 4 ms frame = 250 Hz refresh — above the ~50-90 Hz flicker-fusion band.',
          'Width check stated in the localparams: 16 bits because 2^15 = 32,768 < 50,000 and 2^16 = 65,536 >= 50,000 — same derivation table as Lab 1.',
          'Digit mux: pure combinational case selecting one BCD nibble of bcd_in per scan slot; dig0 (bcd_in[3:0]) is displayed while an=0001.',
          'Segment decoder: standard common-cathode-style codes in {g,f,e,d,c,b,a} order — e.g., 0 = segments a-f on = 0111111; 8 = all on = 1111111. Verify two rows yourself: 1 → b,c → 0000110; 4 → f,g,b,c → 1100110.',
          'an is one-hot here; many real boards use active-low common-anode drives via transistors — the board planning table (m03-l1) decides polarity, not the RTL.',
          'Honesty note: hardware steps (digit drive transistors, current resistors, pin constraints) need a real board; the RTL is fully simulable in iverilog on this platform.',
        ],
      },
      {
        title: 'Lab 4: 8-bit PWM dimmer with the frequency math',
        language: 'verilog',
        code:
          'module pwm_led #(\n    parameter integer WIDTH = 8\n) (\n    input  wire             clk,\n    input  wire             reset_n,\n    input  wire [WIDTH-1:0] duty,\n    output wire             pwm_out\n);\n    // PWM frequency = CLK_HZ / 2^WIDTH = 50e6 / 256 = 195,312.5 Hz\n    // -> far above visible flicker (~50-90 Hz); smooth to the eye.\n    reg [WIDTH-1:0] cnt;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n)\n            cnt <= {WIDTH{1\'b0}};\n        else\n            cnt <= cnt + 1\'b1;          // free-running\n    end\n\n    assign pwm_out = (cnt < duty);      // high for \'duty\' of 256 slots\nendmodule',
        explanation: [
          'The counter free-runs through all 256 values every 50,000,000/256 = 195,312.5 cycles — that is, the PWM frequency is ≈195.3 kHz, derived in the comment before any RTL.',
          'The comparator is the modulator: while cnt < duty the output is high. duty=0 → never high (off); duty=128 → high exactly half of each period (50%); duty=255 → high 255/256 (near-full).',
          'Brightness perception: the eye integrates the fast flashes, so perceived brightness tracks the duty cycle roughly linearly for LEDs.',
          'Reset clears the counter so the first period is deterministic in simulation.',
          'Edge behavior worth tracing: at duty=0 the comparison cnt < 0 is never true — a clean constant 0, no glitch. At duty=255, output is low only when cnt==255 — one cycle low per 256, i.e., 255/256 duty.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Multiplexed scan: digit enable and shared segments (educational waveform, illustrative)',
        content:
          'an[0]  ____/|￣￣￣￣|________|________|________\nan[1]  ________/|￣￣￣￣|________|________|______\nan[2]  ________________/|￣￣￣￣|________|______\nan[3]  ________________________/|￣￣￣￣|______\n         |--1 ms--|--1 ms--|--1 ms--|--1 ms--|\nseg    ==<digit0 >==<digit1 >==<digit2 >==<digit3 >== (shared lines,\n                                                     change at slot edges)\nFrame = 4 ms -> 250 Hz refresh (flicker-free)',
        caption:
          'Each digit is enabled 1 ms per 4 ms frame (25% duty). Segments change only at slot boundaries. Illustrative timing, not a measured trace.',
      },
      {
        kind: 'waveform',
        title: 'PWM at duty = 3/4 (educational waveform, illustrative)',
        content:
          'cnt:    0 . . . 191 | 192 . . . 255 | 0 . . .\npwm_out ____________|               |____________\n        high 192 of 256 slots -> 75% duty\nPeriod = 256 cycles = 5.12 us at 50 MHz -> ~195.3 kHz',
        caption:
          'The comparator slices the free-running counter at the duty value. Brightness ≈ duty; frequency is set by counter width.',
      },
    ],
    tables: [
      {
        caption: 'Seven-segment codes, 0-9 (order {g,f,e,d,c,b,a}, common-cathode style, active-high)',
        headers: ['Digit', 'Segments lit', 'seg[6:0]', 'Hex'],
        rows: [
          ['0', 'a b c d e f', '0111111', '0x3F'],
          ['1', 'b c', '0000110', '0x06'],
          ['2', 'a b d e g', '1011011', '0x5B'],
          ['3', 'a b c d g', '1001111', '0x4F'],
          ['4', 'b c f g', '1100110', '0x66'],
          ['5', 'a c d f g', '1101101', '0x6D'],
          ['6', 'a c d e f g', '1111101', '0x7D'],
          ['7', 'a b c', '0000111', '0x07'],
          ['8', 'a b c d e f g', '1111111', '0x7F'],
          ['9', 'a b c d f g', '1101111', '0x6F'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Scanning so slowly the display visibly flickers (or so fast the per-digit duty approaches zero brightness).',
        fix: 'Compute the frame rate before coding: frame Hz = 1000 / (digit count × ms-per-digit). Keep it above ~100 Hz for comfort; 250 Hz (this lab) is a sane default. Faster scans waste power and dim digits.',
      },
      {
        mistake: 'Building one giant case over all 16 BCD inputs instead of mux + decoder blocks.',
        fix: 'Keep digit-select mux and BCD decode as separate always-blocks: each gets its own truth-table testbench (4 rows and 10 rows), and the timing paths stay short. Fused cases are a maintenance and timing liability.',
      },
      {
        mistake: 'Assuming segment codes are universal across boards.',
        fix: 'Codes depend on segment wiring order and display type (common anode vs cathode, a..g order). The table here is the common-cathode {g,f,e,d,c,b,a} convention; your board\'s documentation decides the actual mapping — check before wiring, exactly like pin constraints.',
      },
    ],
    guidedPractice: {
      title: 'Re-time the display for a 100 MHz clock',
      brief:
        'The board clock is now 100 MHz. Recompute: cycles per 1 ms digit slot, minimum counter width, and frame rate for four digits. Then state what changes in seg4_mux.',
      starterCode:
        'CLK = 100,000,000 Hz\nCycles per 1 ms slot = ______\n2^N >= cycles -> N = ______\nFrame = 4 slots -> frame rate = ______ Hz',
      expectedBehavior:
        'Cycles per slot = 100,000. Width: 2^16 = 65,536 < 100,000; 2^17 = 131,072 >= 100,000 → 17 bits. Frame = 4 ms → 250 Hz, unchanged. In RTL: TICKS = 100_000 and CNT_W = 17; nothing else moves.',
      hints: [
        'Cycles per slot scales with the clock; the frame period in milliseconds does not.',
        'Recompute width from the new cycle count — do not reuse 16 out of habit.',
        'Only localparams should change; that is the parameterization paying off.',
      ],
    },
    practiceExercises: [
      {
        title: 'Decoder verification rows',
        brief:
          'Verify the segment table rows for 3 and 6 by listing which segments each digit lights and confirming the 7-bit code in {g,f,e,d,c,b,a} order.',
        expectedBehavior:
          '3 lights a,b,c,d,g → g=1,f=0,e=0,d=1,c=1,b=1,a=1 → 1001111 ✓. 6 lights a,c,d,e,f,g → g=1,f=1,e=1,d=1,c=0,b=0,a=1 → 1111101 ✓. Both match the table.',
        hints: [
          'Sketch a seven-segment digit and trace which strokes form 3 and 6.',
          'The code order is fixed: g is the MSB, a is the LSB.',
          '6 has NO top-right (b) segment; 3 has NO f (upper-left) or e (lower-left).',
        ],
      },
      {
        title: 'PWM width trade study',
        brief:
          'For WIDTH = 8 vs 12 at 50 MHz, compute PWM frequency for each, and state one reason a design might choose 12 bits despite the frequency drop.',
        expectedBehavior:
          'WIDTH=8: 50e6/256 ≈ 195.3 kHz. WIDTH=12: 50e6/4096 ≈ 12.2 kHz. 12 bits gives 4096 brightness steps (finer dimming, or use for higher-power LED drivers where low-frequency ripple matters less), at a still-flicker-free frequency.',
        hints: [
          'Frequency = clock / 2^width — it drops by 16x from 8 to 12 bits.',
          'Both frequencies sit far above visible flicker (~50-90 Hz).',
          'Resolution (steps of brightness) is the reason to widen; frequency is the cost.',
        ],
      },
    ],
    assessment: {
      title: 'Display and PWM labs checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'At 50 MHz with 1 ms per digit, what is the frame rate of a 4-digit multiplexed display, and is it flicker-free?',
          options: [
            '250 Hz; yes, comfortably above the ~50-90 Hz flicker band',
            '25 Hz; no, it will visibly flicker',
            '1 kHz; yes, but wasteful',
            '4 Hz; no, it will look like sequential flashing',
          ],
          answer: '250 Hz; yes, comfortably above the ~50-90 Hz flicker band',
          explanation:
            'Each digit gets 1 ms; four digits make a 4 ms frame → 250 Hz. Human flicker fusion sits around 50-90 Hz, so 250 Hz appears steady.',
          hint: 'Frame = digit count × per-digit time.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'An 8-bit free-running PWM counter at 50 MHz produces what PWM frequency?',
          options: ['≈ 195.3 kHz', '≈ 195.3 MHz', '≈ 50 kHz', '≈ 1.225 kHz'],
          answer: '≈ 195.3 kHz',
          explanation:
            'PWM frequency = clock / 2^width = 50,000,000 / 256 = 195,312.5 Hz ≈ 195.3 kHz — far above any visible flicker.',
          hint: 'Frequency = clock / 2^width.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'In the seven-segment table ({g,f,e,d,c,b,a}), what is seg for digit 1?',
          code: "4'd1: seg = 7'b???????;",
          options: ['0000110', '0111111', '1011011', '1100110'],
          answer: '0000110',
          explanation:
            'Digit 1 lights only segments b and c. With g as MSB and a as LSB: g=0,f=0,e=0,d=0,c=1,b=1,a=0 → 0000110.',
          hint: 'Only the two right-hand vertical strokes are lit.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'In a 4-digit multiplexed display scanned as in this lab, each digit is lit 25% of the time, which affects real-board brightness and current planning.',
          answer: 'true',
          explanation:
            'Each digit is enabled 1 ms of every 4 ms frame — a 25% duty factor. Average brightness and per-digit peak current are board-design consequences (transistor drive, resistor choice), which the RTL does not change but the hardware plan must respect.',
          hint: 'One of four slots per frame.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Multiplexed display', definition: 'Display sharing segment lines across digits, one digit enabled per scan slot.' },
      { term: 'Frame rate', definition: 'How often the full digit set is refreshed: 1 / (digits × slot time); 250 Hz here.' },
      { term: 'BCD decoder', definition: 'Combinational 4-bit binary-to-seven-segment case block.' },
      { term: 'Duty cycle', definition: 'Fraction of a period a PWM output is high; encodes LED brightness.' },
      { term: 'PWM frequency', definition: 'Clock / 2^width for a free-running counter PWM; 195.3 kHz at 8 bits / 50 MHz.' },
    ],
    revisionSummary: [
      'Scan math: 1 ms/digit at 50 MHz = 50,000 cycles = 16-bit counter; 4-digit frame = 4 ms = 250 Hz.',
      'Structure template: scan timer -> digit mux -> BCD decoder; test each block separately.',
      'Segment codes depend on board wiring; the {g,f,e,d,c,b,a} common-cathode table is a convention, not a law.',
      'PWM frequency = clock / 2^width; 8 bits at 50 MHz ≈ 195.3 kHz, flicker-free with 256 brightness steps.',
      'Multiplexing costs per-digit duty (25%) — a board-design (current/brightness) issue, not an RTL issue.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Seven-segment display', url: 'https://en.wikipedia.org/wiki/Seven-segment_display', kind: 'article' },
      { label: 'Wikipedia — Pulse-width modulation', url: 'https://en.wikipedia.org/wiki/Pulse-width_modulation', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'fpga-m04-l3',
    title: 'Labs 5-6: FSM Traffic Light and UART Loopback',
    summary:
      'Close the lab series with the two signature sequential designs: a Moore traffic-light FSM on a 1 Hz tick, and an educational UART transmitter/receiver pair running 8N1 at 115200 baud with the divisor math shown.',
    objectives: [
      'Build a Moore FSM with a 1 Hz tick enable and per-state durations (10/3/10 s) and verify the cycle timing.',
      'Derive the UART bit period: 50 MHz / 115200 ≈ 434 cycles per bit, with ~0.006% rate error.',
      'Trace a complete 8N1 frame (start, 8 data LSB-first, stop) through the transmitter state machine.',
      'Explain mid-bit sampling and the 2-FF input synchronizer in the receiver, and why loopback is an educational shortcut.',
    ],
    whyItMatters:
      'FSMs and UARTs are the two structures every FPGA engineer writes first and debugs forever. The traffic light cements Moore-style thinking (outputs from state, timers as data); the UART is your first serial protocol — the same framing, divisor and sampling concepts recur in SPI, I2C and every custom link. Together they complete the simulation-first toolkit: after this lesson you can verify any small sequential design without hardware.',
    prerequisites: [
      'Terminal-count pattern and width math (fpga-m04-l1)',
      'FSM encoding and reset discipline (RTL Design course)',
      'Labs 1-4 structures (fpga-m04-l1, fpga-m04-l2)',
    ],
    explanation:
      '### Lab 5: traffic light as a Moore FSM\n\nSpecification: RED 10 s, GREEN 10 s, YELLOW 3 s, repeating; outputs are the three lamps. Moore style (outputs depend only on state) keeps outputs glitch-free: derive them combinationally from the state register. The timing substrate is a **1 Hz tick**: a prescaler counts 50,000,000 cycles (26 bits — 2^26 = 67,108,864 >= 50,000,000) and pulses `tick` once per second. The FSM then advances on ticks, with a seconds-remaining register per state. Splitting "make one second" (prescaler) from "spend seconds" (FSM) keeps both halves trivially testable.\n\n### Lab 6: UART 8N1 loopback\n\nUART frames are: idle high, a low **start bit**, 8 data bits **LSB first**, a high **stop bit**. At 115200 baud each bit lasts 1/115200 s ≈ 8.68 µs; at 50 MHz that is 50,000,000/115,200 = 434.03 → **434 cycles per bit** (actual rate 115,207 baud, +0.006% error — negligible against UART\'s percent-level tolerance). The transmitter is a shift register with a bit counter; the receiver **synchronizes the asynchronous input through two flip-flops**, waits for the start edge, re-centers at mid-start, then samples each bit at its center — the classic robustness trick, since mid-bit is maximally far from bit-boundary noise. The lab closes with **loopback**: the transmitter output feeds the receiver input, so one simulation proves both directions. On a real board, loopback becomes an external jumper or a second board; the RTL is unchanged.',
    deepDive:
      '### Why the receiver synchronizes and re-centers\n\nThe `rx` line is asynchronous to `clk` — it can change at any instant. Sampling it directly risks metastability, so it passes through two flip-flops first (the 2-FF synchronizer; Module 5 covers the theory). Re-centering matters for the same reason: we detect the start edge within one clock cycle, but the *bit grid* must start from the middle of the start bit — sampling at mid-bit gives each bit the full half-bit margin of tolerance on either side before an error occurs. Skipping re-centering works at exactly matched rates and fails quietly whenever the two sides\' clocks differ slightly — exactly the kind of bug that survives a quick test and dies in the field.\n\n### What this educational UART omits (stated plainly)\n\nProduction UARTs add: overrun detection (new byte before the old was read), parity, a framing-error flag distinguishable from a data-valid pulse, FIFOs on both sides, and a proper baud-rate generator with fractional division. This lab implements the core frame machine honestly — start detection, mid-bit sampling, LSB-first assembly, stop verification — and omits the rest *on purpose*, saying so. The omission list is itself the syllabus for your second UART.',
    examples: [
      {
        title: 'Lab 5: Moore traffic light with 1 Hz tick enable',
        language: 'verilog',
        code:
          'module traffic_light (\n    input  wire clk,\n    input  wire reset_n,        // async active-low\n    output wire red,\n    output wire yellow,\n    output wire green\n);\n    // --- 1 Hz tick: 50,000,000 cycles per second, 26 bits ---\n    localparam integer TICK_CYCLES = 50_000_000;\n    localparam integer TICK_W      = 26;   // 2^26 = 67,108,864 >= 50,000,000\n    reg [TICK_W-1:0] tick_cnt;\n    wire             tick = (tick_cnt == TICK_CYCLES - 1);\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n)          tick_cnt <= {TICK_W{1\'b0}};\n        else if (tick)         tick_cnt <= {TICK_W{1\'b0}};\n        else                   tick_cnt <= tick_cnt + 1\'b1;\n    end\n\n    // --- Moore FSM on ticks ---\n    localparam RED = 2\'d0, GREEN = 2\'d1, YELLOW = 2\'d2;\n    reg [1:0] state;\n    reg [3:0] sec_left;      // counts seconds remaining (max 10)\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            state    <= RED;\n            sec_left <= 4\'d10;\n        end else if (tick) begin\n            if (sec_left <= 4\'d1) begin\n                // Transition: load the DURATION OF THE STATE WE ARE ENTERING.\n                sec_left <= (state == RED)    ? 4\'d10 :  // entering GREEN (10 s)\n                            (state == GREEN)  ? 4\'d3  :  // entering YELLOW (3 s)\n                                              4\'d10;     // entering RED (10 s)\n                state    <= (state == RED)    ? GREEN :\n                            (state == GREEN)  ? YELLOW : RED;\n            end else begin\n                sec_left <= sec_left - 1\'b1;\n            end\n        end\n    end\n\n    // Moore outputs: function of state only.\n    assign red    = (state == RED);\n    assign yellow = (state == YELLOW);\n    assign green  = (state == GREEN);\nendmodule',
        explanation: [
          'Prescaler: counts 0..49,999,999 (50,000,000 cycles = exactly 1 s at 50 MHz); 26 bits because 2^25 = 33.5M < 50M <= 2^26 = 67.1M. `tick` is a 1-cycle-per-second enable pulse.',
          'FSM clocked block advances ONLY on tick — so every state transition in simulation is one simulated second; shrink TICK_CYCLES in the testbench to verify structure fast.',
          'Durations: RED holds 10 ticks (reset loads sec_left=10; transitions when it reaches 1), GREEN 10, YELLOW 3 — total cycle 23 s.',
          'Outputs are continuous assigns from state only (Moore) — no output depends on the tick or sec_left, so lamps are glitch-free while a state holds.',
          'Trace check: reset → RED, 10. Ticks 1-9 decrement; tick 10 → GREEN, 10. Same for GREEN; YELLOW counts 3 ticks then wraps to RED. Cycle = 10+10+3 = 23 s ✓.',
        ],
      },
      {
        title: 'Lab 6: UART transmitter and receiver (8N1, 115200 baud at 50 MHz)',
        language: 'verilog',
        code:
          'module uart_tx #(\n    parameter integer CLK_HZ = 50_000_000,\n    parameter integer BAUD   = 115_200\n) (\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire       start,\n    input  wire [7:0] data,\n    output reg        tx,\n    output reg        busy\n);\n    localparam integer DIV = CLK_HZ / BAUD;  // 434 cycles/bit (+0.006% error)\n    localparam integer DIV_W = 9;            // 2^9 = 512 >= 434\n\n    reg [DIV_W-1:0] div_cnt;\n    reg [3:0]       bit_idx;                 // 0..9: start,8 data,stop\n    reg [7:0]       sh;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            tx <= 1\'b1; busy <= 1\'b0;\n            div_cnt <= 0; bit_idx <= 0; sh <= 8\'h00;\n        end else if (!busy) begin\n            tx <= 1\'b1;                       // idle high\n            if (start) begin\n                busy <= 1\'b1; sh <= data;\n                div_cnt <= 0; bit_idx <= 0;\n                tx <= 1\'b0;                   // start bit now\n            end\n        end else if (div_cnt == DIV - 1) begin\n            div_cnt <= 0;\n            if (bit_idx == 4\'d9) begin\n                busy <= 1\'b0;                 // stop bit finished, back to idle\n            end else begin\n                bit_idx <= bit_idx + 1\'b1;\n                if (bit_idx == 4\'d8) begin\n                    tx <= 1\'b1;               // stop bit (after 8 data bits)\n                end else begin\n                    tx <= sh[0];              // data bit, LSB first\n                    sh <= sh >> 1;\n                end\n            end\n        end else begin\n            div_cnt <= div_cnt + 1\'b1;\n        end\n    end\nendmodule\n\nmodule uart_rx #(\n    parameter integer CLK_HZ = 50_000_000,\n    parameter integer BAUD   = 115_200\n) (\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire       rx,\n    output reg  [7:0] data,\n    output reg        valid                 // 1-cycle pulse per byte\n);\n    localparam integer DIV  = CLK_HZ / BAUD; // 434\n    localparam integer HALF = DIV / 2;       // 217: mid-bit offset\n\n    reg rx_ff1, rx_ff2;                      // 2-FF synchronizer\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            rx_ff1 <= 1\'b1; rx_ff2 <= 1\'b1;\n        end else begin\n            rx_ff1 <= rx;\n            rx_ff2 <= rx_ff1;\n        end\n    end\n\n    reg        active;\n    reg [8:0]  div_cnt;\n    reg [3:0]  bit_idx;                      // 0=start-wait,1..8=data,9=stop\n    reg [7:0]  sh;\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            active <= 1\'b0; div_cnt <= 0; bit_idx <= 0;\n            sh <= 8\'h00; data <= 8\'h00; valid <= 1\'b0;\n        end else begin\n            valid <= 1\'b0;                   // default: no pulse\n            if (!active) begin\n                if (!rx_ff2) begin           // start edge seen\n                    active <= 1\'b1; div_cnt <= 0; bit_idx <= 0;\n                end\n            end else if (bit_idx == 4\'d0 && div_cnt == HALF - 1) begin\n                if (!rx_ff2) begin           // confirmed mid-start: recenter\n                    div_cnt <= 0; bit_idx <= 1;\n                end else begin\n                    active <= 1\'b0;          // glitch: line recovered early\n                end\n            end else if (div_cnt == DIV - 1) begin\n                div_cnt <= 0;\n                if (bit_idx <= 4\'d8) begin   // sample middle of d0..d7\n                    sh  <= {rx_ff2, sh[7:1]};\n                    bit_idx <= bit_idx + 1\'b1;\n                end else begin               // middle of stop slot\n                    active <= 1\'b0;\n                    data   <= sh;\n                    valid  <= rx_ff2;        // stop bit must be high\n                end\n            end else begin\n                div_cnt <= div_cnt + 1\'b1;\n            end\n        end\n    end\nendmodule\n\n// Educational loopback top: TX feeds RX internally.\n// Real-board version: TX/RX to pins, loop with a jumper.\nmodule uart_loopback (\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire       start,\n    input  wire [7:0] data,\n    output wire       tx,\n    output wire       rx_valid,\n    output wire [7:0] rx_data\n);\n    uart_tx u_tx (.clk(clk), .reset_n(reset_n),\n                  .start(start), .data(data), .tx(tx), .busy());\n    uart_rx u_rx (.clk(clk), .reset_n(reset_n),\n                  .rx(tx), .data(rx_data), .valid(rx_valid));\nendmodule',
        explanation: [
          'TX divisor: DIV = 50,000,000/115,200 = 434 (rounded); 9 bits hold it. Actual baud = 50e6/434 ≈ 115,207 — a +0.006% error, far inside UART tolerance.',
          'TX frame trace: idle tx=1; start loads data and drops tx to 0 (start bit). At each DIV boundary: bit_idx 0..7 shifts the next data bit out LSB-first (`tx <= sh[0]`, then `sh >>= 1`), so periods 2-9 carry d0..d7; at the bit_idx==8 boundary the code forces tx=1 for the stop bit (period 10); at bit_idx==9 it clears busy. Exactly 10 bit periods, verified by stepping the state: bit_idx walks 0→1→…→8→9 with one bit on the wire per period.',
          'Loopback top: instantiate uart_tx and uart_rx and wire the TX output to the RX input — one simulation then exercises both machines with a known byte (e.g., 0x55: data bits 1,0,1,0,1,0,1,0 alternately). On a real board this wiring becomes an external jumper or a cross-link to a second board; the RTL does not change.',
          'RX synchronizer: rx is asynchronous, so rx_ff1/rx_ff2 are the mandatory 2-FF stage before any decision logic (Module 5 covers metastability theory).',
          'RX re-centering: after the start edge, it counts HALF = 217 cycles to the middle of the start bit, confirms the line is still low (else glitch → back to idle), and restarts its bit grid there. Subsequent samples at mid-bit have maximum timing margin.',
          'RX assembly: each DIV period later is the middle of d0..d7; `sh <= {rx_ff2, sh[7:1]}` shifts LSB-first so d0 lands in bit 0 and d7 in bit 7 after 8 samples. At the middle of the stop slot, data is published with valid pulsed only if the stop bit was actually high (framing check).',
          'The top module wires u_tx.tx to u_rx.rx directly — loopback in one simulation, no testbench wiring tricks. Stated omissions for honesty: no overrun detection, no parity, no FIFOs, no fractional baud division; this lab implements the core frame machine only.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'Lab 5 Moore FSM and Lab 6 TX bit sequence',
        content:
          'LAB 5 (transitions on 1 Hz tick):\n\n   RED(10s) ----------> GREEN(10s) ----------> YELLOW(3s)\n      ^                    |                       |\n      +--------------------+-----------------------+\n   outputs: red=1        green=1               yellow=1\n\nLAB 6 TX line for data=0x55 (LSB first), one bit = 434 cycles:\n\n idle  START d0  d1  d2  d3  d4  d5  d6  d7  STOP idle\n ￣￣\\___/￣\\___/￣\\___/￣\\___/￣\\_____/￣￣￣￣\n  1    0    1   0   1   0   1   0   1   0   1',
        caption:
          'Left: Moore lamps depend only on state; edges cost one tick. Right: 0x55 alternates every bit — the classic frame-visibility byte. Illustrative waveform.',
      },
    ],
    tables: [
      {
        caption: 'UART 8N1 timing at 50 MHz / 115200 baud',
        headers: ['Quantity', 'Value', 'Derivation'],
        rows: [
          ['Bit period (ideal)', '8.6806 us', '1 / 115200'],
          ['Cycles per bit (DIV)', '434', '50,000,000 / 115,200 = 434.03, rounded'],
          ['Actual baud with 434', '115,207', '50,000,000 / 434'],
          ['Rate error', '+0.006%', '(115,207 − 115,200) / 115,200'],
          ['Frame length', '10 bits', 'start + 8 data + stop = 86.8 us'],
          ['Mid-bit offset (HALF)', '217 cycles', 'DIV / 2'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Sampling the RX input directly without the 2-FF synchronizer.',
        fix: 'rx is asynchronous to clk; direct sampling invites metastability. Two flip-flops before any decision logic are mandatory, and the first-FF output must feed nothing else.',
      },
      {
        mistake: 'Starting the data-bit grid at the start EDGE instead of mid-start.',
        fix: 'Detect the edge, then count HALF cycles to mid-start and re-center the bit grid there. Sampling at bit centers tolerates rate mismatch in both directions; edge-grid sampling accumulates error across the frame and fails at the last bits.',
      },
      {
        mistake: 'Forgetting the stop bit in the TX (or not verifying it in the RX).',
        fix: 'The frame contract is 10 bits: start, 8 data, stop. TX must drive tx=1 for the final period; RX should only pulse valid when the stop slot samples high. Without the stop check, a glitched frame publishes garbage data silently.',
      },
    ],
    guidedPractice: {
      title: 'Re-time the UART for 9600 baud',
      brief:
        'Recompute DIV, DIV_W, HALF, actual baud, and rate error for 9600 baud at 50 MHz. Then state whether the error is acceptable (UART links tolerate roughly percent-level total mismatch).',
      starterCode:
        'DIV    = 50,000,000 / 9,600 = ______\nDIV_W  = ______ (2^N >= DIV)\nHALF   = ______\nActual = 50,000,000 / DIV = ______ baud\nError  = ______ %',
      expectedBehavior:
        'DIV = 5208 (50,000,000/9,600 = 5208.33, rounded down). DIV_W = 13 (2^12 = 4096 < 5208; 2^13 = 8192 >= 5208). HALF = 2604. Actual = 50,000,000/5208 ≈ 9600.6 baud → error ≈ +0.007%. Comfortably acceptable.',
      hints: [
        'Divisor = clock / baud, rounded to integer.',
        'HALF = DIV/2 (integer division).',
        'Errors well under 1% are normal for integer-divisor UARTs.',
      ],
    },
    practiceExercises: [
      {
        title: 'Frame trace for 0xA5',
        brief:
          'Byte 0xA5 (10100101). List the ten 8N1 wire values in order (start, d0..d7 LSB-first, stop), then verify your TX module would produce exactly that sequence.',
        expectedBehavior:
          'Start=0; LSB-first data: d0=1, d1=0, d2=1, d3=0, d4=0, d5=1, d6=0, d7=1; stop=1. Sequence: 0,1,0,1,0,0,1,0,1,1. The TX shifts sh right each bit, so it emits exactly this order.',
        hints: [
          '0xA5 = 1010 0101 in binary (MSB left).',
          'LSB first means d0 is the rightmost bit of that byte.',
          'Write all ten wire values as one line, then re-check the shift order.',
        ],
      },
      {
        title: 'FSM duration audit',
        brief:
          'Modify the traffic-light spec to RED 8 s, GREEN 12 s, YELLOW 3 s. State exactly which values change in the RTL and re-verify the full cycle length by tracing ticks.',
      expectedBehavior:
        'Keep the loading convention (a transition loads the DURATION OF THE STATE BEING ENTERED). Changes: the reset load becomes 8 (RED now 8 s); the transition loads become: RED-exit loads 12 (entering GREEN), GREEN-exit loads 3 (entering YELLOW), YELLOW-exit loads 8 (entering RED). sec_left stays 4-bit (max 15 >= 12). Trace: reset RED sec=8 -> RED 8 ticks -> GREEN 12 -> YELLOW 3 -> RED 8; full cycle = 8 + 12 + 3 = 23 s.',
        hints: [
          'Decide whether durations load at state ENTRY or EXIT and keep it consistent with the original code (transition loads the next state\'s duration).',
          '4-bit sec_left holds up to 15 — check 12 fits.',
          'Sum the three durations for the cycle length.',
        ],
      },
    ],
    assessment: {
      title: 'FSM and UART labs checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'At 50 MHz driving 115200 baud, how many clock cycles per UART bit does the integer divisor give, and what is the rate error?',
          options: [
            '434 cycles; about +0.006%',
            '434 cycles; about 6%',
            '5208 cycles; about +0.007%',
            '4340 cycles; about 0.6%',
          ],
          answer: '434 cycles; about +0.006%',
          explanation:
            '50,000,000/115,200 = 434.03 → DIV = 434. Actual baud = 50e6/434 ≈ 115,207, an error of (115,207−115,200)/115,200 ≈ +0.006% — negligible against UART tolerance.',
          hint: 'Divide clock by baud; round to integer.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'The receiver samples each data bit at the middle of the bit period to maximize tolerance to rate mismatch between transmitter and receiver.',
          answer: 'true',
          explanation:
            'Mid-bit sampling gives each bit a half-bit margin of timing error on either side. This is why the RX re-centers at mid-start and counts full bit periods from there.',
          hint: 'Where is the sample farthest from both bit boundaries?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'In the traffic-light FSM, why are the lamp outputs continuous assigns from state rather than registered outputs toggled in the clocked block?',
          options: [
            'Because Moore outputs depend only on state, so direct decoding is glitch-free while the state holds',
            'Because continuous assigns synthesize to fewer LUTs always',
            'Because registered outputs would violate the async reset rule',
            'Because outputs must lag the state by one cycle',
          ],
          answer: 'Because Moore outputs depend only on state, so direct decoding is glitch-free while the state holds',
          explanation:
            'Moore definition: outputs are a function of state alone. Decoding state combinationally keeps that contract visible; lamps cannot glitch mid-second because state is stable for whole seconds.',
          hint: 'Recall what the M in Moore guarantees.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: the two-flip-flop structure at the RX input that safely captures an asynchronous signal before decision logic.',
          answer: 'synchronizer',
          explanation:
            'The 2-FF synchronizer (two back-to-back flip-flops, nothing else reading the first) resolves asynchronous inputs before they touch decision logic. Module 5 covers the metastability background.',
          hint: 'It synchronizes the async input to the clock.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Moore FSM', definition: 'State machine whose outputs depend only on the current state.' },
      { term: 'Tick enable', definition: 'A 1-cycle pulse produced by a prescaler (here 1 Hz), gating a slow state machine inside a fast clock domain.' },
      { term: '8N1', definition: 'UART framing: 8 data bits, no parity, 1 stop bit, plus the start bit — 10 bits per frame.' },
      { term: 'Mid-bit sampling', definition: 'Sampling each bit at its center, reached by re-centering the bit grid at mid-start.' },
      { term: 'Loopback', definition: 'Connecting TX output to RX input to test both directions in one simulation or with one jumper.' },
    ],
    revisionSummary: [
      'Split slow timing from fast logic: prescaler makes a 1 Hz tick; FSM spends ticks. 26 bits for 50M cycles.',
      'Moore outputs decode from state only — glitch-free while stable.',
      'UART 8N1 = start + 8 data LSB-first + stop = 10 bit periods; DIV = clock/baud (434 at 50 MHz/115200, +0.006%).',
      'RX pipeline: 2-FF synchronize → detect start edge → re-center at mid-start (HALF) → sample each bit center → verify stop before valid.',
      'Loopback makes one simulation prove both directions; production features (overrun, parity, FIFOs) are documented omissions.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Universal asynchronous receiver-transmitter', url: 'https://en.wikipedia.org/wiki/Universal_asynchronous_receiver-transmitter', kind: 'article' },
      { label: 'Wikipedia — Finite-state machine', url: 'https://en.wikipedia.org/wiki/Finite-state_machine', kind: 'article' },
    ],
    estimatedMinutes: 55,
  },
];
