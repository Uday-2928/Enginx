import type { TutorialProject } from '../types';

export const fpgaProjects: TutorialProject[] = [
  {
    id: 'fpga-proj-seg4',
    title: 'Four-Digit Seven-Segment Display Controller',
    level: 'intermediate',
    summary:
      'Design, simulate and document a complete multiplexed display controller: BCD input, scan timer, digit mux and segment decoder, verified in iverilog against a full testbench — then learn what a real board would add.',
    useCase:
      'Any device that shows a numeric readout: clock, thermometer, counter, voltage display. The multiplexed four-digit driver is the canonical "first real peripheral" in FPGA work.',
    requirements: [
      'Display four BCD digits (16-bit packed input) on a four-digit multiplexed seven-segment display.',
      'Scan at 1 ms per digit (50 MHz clock), giving a 250 Hz frame rate — flicker-free.',
      'Decode BCD 0-9 to segments {g,f,e,d,c,b,a} in common-cathode style; blank (all off) for invalid nibbles.',
      'Produce a one-hot digit-select output; document that board polarity may be active-low.',
      'Async active-low reset returns the scan timer and digit index to the first digit.',
      'Full testbench: decoder truth table (10 rows), mux select rows, and a scan-timing check.',
    ],
    learningOutcomes: [
      'Multi-block design decomposition: timer / mux / decoder as separately testable units.',
      'Refresh-rate and counter-width arithmetic applied end to end.',
      'Truth-table-driven combinational verification.',
      'Honest hardware planning: the board adds drive transistors, current resistors and pin constraints.',
    ],
    prerequisites: [
      'fpga-m04-l2 (Lab 3 walks this structure)',
      'Verilog testbenches (Verilog course)',
    ],
    architecture:
      'Three cooperating blocks on one 50 MHz clock: (1) a 16-bit scan timer producing a digit index (2 bits) every 50,000 cycles; (2) a 4-to-1 mux selecting the active digit\'s BCD nibble from the 16-bit packed input; (3) a combinational BCD-to-seven-segment decoder (10-row case). Digit-select and segments are pure combinational outputs of the index and selected nibble.',
    steps: [
      {
        title: 'Write the specification table',
        detail:
          'Before RTL: pin down scan period (1 ms), clock (50 MHz), counter width (16 bits — show the 2^15/2^16 comparison), frame rate (250 Hz), segment code table (10 rows) and reset behavior. This is the artifact every later step is checked against.',
      },
      {
        title: 'Build and test the decoder alone',
        detail:
          'Module seg_decode: 4-bit BCD in, 7-bit seg out. Testbench drives all 10 valid digits plus 6 invalid nibbles; expected outputs are the table codes and 7\'b0000000 for invalid.',
        code:
          '// Decoder TB core: exhaustive rows\ninteger d;\ninitial begin\n  for (d = 0; d <= 15; d = d + 1) begin\n    dig = d[3:0]; #10;\n    $display("dig=%d seg=%b", d, seg);\n  end\nend',
      },
      {
        title: 'Build and test the scan timer',
        detail:
          'Module seg_scan with TICKS parameter (shrunk to ~10 in simulation). Verify dig_idx increments every TICKS cycles and wraps 0-3, and that reset returns it to 0.',
      },
      {
        title: 'Build the mux and integrate',
        detail:
          'Module seg4_mux wiring timer + mux + decoder as in fpga-m04-l2. Top-level testbench holds distinct values per digit (e.g., 0x3210 packed) and checks that each digit-select slot shows that digit\'s segments on the shared bus.',
      },
      {
        title: 'Verify scan timing in simulation',
        detail:
          'With TICKS shrunk (e.g., 10 cycles), assert that exactly one an line is active at any time, an rotates 0001->0010->0100->1000, and the full frame takes 4×TICKS cycles.',
      },
      {
        title: 'Produce the hardware plan (conceptual)',
        detail:
          'Write the planning table (ports: clk, reset_n, bcd_in[15:0], seg[6:0], an[3:0]; pins "from board doc"), note per-digit 25% duty and peak-current considerations, and state which steps require a physical board.',
      },
    ],
    starterCode: {
      title: 'Project skeleton with the decoder truth table pre-filled',
      language: 'verilog',
      code:
        'module seg4_mux (\n    input  wire        clk,\n    input  wire        reset_n,\n    input  wire [15:0] bcd_in,\n    output reg  [6:0]  seg,\n    output reg  [3:0]  an\n);\n    localparam integer TICKS = 50_000;   // 1 ms at 50 MHz; shrink in TB\n    localparam integer CNT_W = 16;\n\n    reg [CNT_W-1:0] tick_cnt;\n    reg [1:0]       dig_idx;\n\n    // TODO 1: scan timer (terminal-count -> dig_idx++)\n    // TODO 2: digit mux  (dig_idx -> dig = bcd_in slice)\n    // TODO 3: BCD decode (dig -> seg, table below)\n    // TODO 4: one-hot an output\n\n    always @(*) begin\n        case (dig)  // NOTE: add the dig wire from TODO 2\n            4\'d0:    seg = 7\'b0111111;\n            4\'d1:    seg = 7\'b0000110;\n            4\'d2:    seg = 7\'b1011011;\n            4\'d3:    seg = 7\'b1001111;\n            4\'d4:    seg = 7\'b1100110;\n            4\'d5:    seg = 7\'b1101101;\n            4\'d6:    seg = 7\'b1111101;\n            4\'d7:    seg = 7\'b0000111;\n            4\'d8:    seg = 7\'b1111111;\n            4\'d9:    seg = 7\'b1101111;\n            default: seg = 7\'b0000000;\n        endcase\n    end\nendmodule',
      explanation: [
        'The decoder table is provided so you focus on the timer, mux and integration — the sequential and structural skills.',
        'TODO 1 uses the terminal-count pattern from Lab 1; TODO 2 is a case on dig_idx; TODO 4 is a case producing one-hot an.',
        'The comment flags that `dig` must be declared (reg [3:0]) by TODO 2 — the skeleton will not compile until the TODOs are complete.',
      ],
    },
    testPlan: [
      'Decoder: 16-row exhaustive check (10 valid codes, 6 blanks).',
      'Timer: shrunk TICKS; dig_idx increments per period, wraps after 3, reset returns 0.',
      'Integration: packed 0x3210 shows digit0/1/2/3 codes on seg during slots 0/1/2/3 respectively.',
      'Scan timing: exactly one an bit active per cycle; frame period == 4×TICKS.',
      'Reset: mid-frame reset returns scan to slot 0 within one cycle.',
    ],
    expectedResults:
      'In iverilog simulation: all testbench checks pass with the display rotating through the four digits at the shrunk scan rate, one digit lit at a time. No hardware run is claimed or possible on this platform; the hardware plan documents what a real board adds.',
    troubleshooting: [
      'Multiple an lines active: your an case overlaps or defaults wrong — each slot must select exactly one digit.',
      'Wrong glyphs: segment table order mismatch — confirm the {g,f,e,d,c,b,a} bit order against your table.',
      'Flicker concern (on a real board): frame rate below ~100 Hz means scan period too long — recompute TICKS.',
      'dig_idx stuck: terminal-count comparison off by one (== TICKS vs == TICKS-1).',
    ],
    hardwareDependencies:
      'Requires an FPGA dev board to run on hardware; fully simulable in iverilog on this platform via linked challenges where available. Board steps (pin planning, segment polarity, transistor digit drivers) are documented conceptually.',
  },
  {
    id: 'fpga-proj-pwm-dimmer',
    title: 'PWM LED Dimmer with Button-Controlled Brightness',
    level: 'beginner',
    summary:
      'A free-running 8-bit PWM modulator whose duty cycle steps up/down on button presses — combining Lab 4\'s PWM with a synchronous button-edge detector, verified entirely in simulation.',
    useCase:
      'LED dimming, fan and buzzer control, and the foundation for motor drive — anywhere a load\'s power is modulated by duty cycle rather than level.',
    requirements: [
      '8-bit free-running PWM at 50 MHz (≈195.3 kHz) driving a LED output.',
      'Two button inputs: one increases duty by 16 per press, one decreases it; duty saturates at 0 and 255.',
      'Buttons are synchronized (2-FF) and edge-detected (one duty step per press, not per held cycle).',
      'Async active-low reset sets duty to a mid value (128).',
      'Testbench: verifies PWM frequency, saturation behavior, and exactly one step per button press.',
    ],
    learningOutcomes: [
      'Composing a modulator with a synchronous control path.',
      'Synchronizer + edge detector as a reusable input-conditioning unit.',
      'Saturation arithmetic in RTL.',
      'Frequency-vs-resolution reasoning (why 8 bits and not 4 or 12).',
    ],
    prerequisites: [
      'fpga-m04-l1 (terminal-count pattern)',
      'fpga-m04-l2 (PWM lab)',
      'fpga-m04-l3 (synchronizer pattern)',
    ],
    architecture:
      'Three blocks: (1) an 8-bit free-running counter; (2) a comparator producing pwm_out = (cnt < duty); (3) a control path that 2-FF-synchronizes each button, detects rising edges, and steps a saturation-clamped duty register by ±16.',
    steps: [
      {
        title: 'Write the PWM core and its timing math',
        detail:
          'Reuse the Lab 4 pwm_led module; document PWM frequency = 50 MHz / 256 ≈ 195.3 kHz in a comment derived from the clock and width parameters.',
      },
      {
        title: 'Build the input conditioner',
        detail:
          'Module btn_edge: per-button 2-FF synchronizer (as in Lab 6), then a rising-edge detector (prev stage register + compare) emitting a 1-cycle pulse per press.',
        code:
          'always @(posedge clk or negedge reset_n) begin\n    if (!reset_n) begin\n        s1 <= 1\'b0; s2 <= 1\'b0; prev <= 1\'b0;\n    end else begin\n        s1   <= btn;\n        s2   <= s1;\n        prev <= s2;\n    end\nend\nassign press = s2 & ~prev;   // 1-cycle pulse on rising edge',
      },
      {
        title: 'Build the duty controller',
        detail:
          'On up-press: duty <= (duty >= 240) ? 255 : duty + 16. On down-press: duty <= (duty <= 16) ? 0 : duty - 16. Reset loads 128. Note the clamp values guarantee saturation without overflow.',
      },
      {
        title: 'Integrate and write the testbench',
        detail:
          'Top module wires conditioner + duty controller + PWM core. Testbench: shrunk counter (WIDTH parameter), press buttons for one cycle at a time, check duty steps exactly once, and check pwm_out low-fraction matches duty/256 over a full period.',
      },
      {
        title: 'Document the hardware plan',
        detail:
          'Planning table for clk, reset_n, btn_up, btn_dn, pwm_out; note that buttons on real boards need the debouncer conversation (mechanical bounce is a hardware fact) and LEDs need a current-set resistor.',
      },
    ],
    testPlan: [
      'PWM period equals 2^WIDTH cycles of the shrunk clock; duty=128 gives half-period high/low split.',
      'Each single-cycle press of btn_up adds exactly 16 to duty (verify over 3 presses: 128→144→160→176).',
      'Press btn_up repeatedly until saturation: duty stops at 255 and stays.',
      'Press btn_dn past zero: duty stops at 0 and pwm_out is constant low.',
      'Held button: exactly ONE step (edge detection), not repeated steps.',
      'Reset restores duty=128 and a synchronized idle line state.',
    ],
    expectedResults:
      'Simulation shows a clean PWM square wave at the shrunk rate whose high fraction equals duty/256, stepping once per press and saturating at both rails. No hardware claims — the board version additionally needs debounce handling and current-limiting, documented in the plan.',
    troubleshooting: [
      'Duty steps continuously while held: edge detector missing — you are level-detecting, not edge-detecting.',
      'Duty wraps 255→0 on press: clamp missing — add saturation before the add.',
      'Multiple pulses per press in the TB: press held multiple clock cycles in the stimulus — pulse it for exactly one cycle, or confirm the edge detector handles it.',
      'No PWM output at all: counter not free-running (accidental enable), or comparator operands swapped.',
    ],
    hardwareDependencies:
      'Requires an FPGA dev board to run on hardware; fully simulable in iverilog on this platform via linked challenges where available. Board steps (buttons with pull-ups, LED resistor, pin constraints) are documented conceptually.',
  },
  {
    id: 'fpga-proj-uart-loopback',
    title: 'UART Loopback Link (8N1, 115200 baud)',
    level: 'intermediate',
    summary:
      'Complete the Lab 6 UART into a verified project: transmitter, receiver with mid-bit sampling and stop-bit check, loopback integration, and a scoreboard testbench that sends a byte stream and checks every received byte.',
    useCase:
      'The debug channel of virtually every FPGA product: printing status to a PC, receiving commands. Loopback is also the standard factory test for UART hardware.',
    requirements: [
      'TX and RX at 8N1, 115200 baud from 50 MHz (DIV=434, error ≈ +0.006%, documented).',
      'TX: start on a pulse, shift LSB-first, exactly 10 bit periods per frame, returns to idle high.',
      'RX: 2-FF synchronize, mid-start re-center, mid-bit sampling, valid pulse only on a verified stop bit.',
      'Loopback top connecting TX to RX (educational), with tx also exposed.',
      'Scoreboard testbench: sends 8 known bytes back-to-back (respecting busy), checks all 8 arrive with correct values and exactly one valid pulse each.',
      'Documented omissions: no overrun, no parity, no FIFO — stated in the project README.',
    ],
    learningOutcomes: [
      'Protocol state machines with bit-level timing contracts.',
      'Asynchronous-input discipline (synchronizer, re-centering) applied end to end.',
      'Scoreboard-style verification: self-checking testbench with expected-value tracking.',
      'Honest scoping: naming what a production UART adds and why.',
    ],
    prerequisites: [
      'fpga-m04-l3 (Lab 6 builds both modules)',
      'Verilog tasks and self-checking testbenches (Verilog course)',
    ],
    architecture:
      'uart_tx (bit-period state machine with shift register), uart_rx (synchronizer + mid-bit sampling machine), uart_loopback top wiring tx→rx. The testbench instantiates the top, drives byte requests through the start interface (waiting on busy between frames), and compares rx_data at each rx_valid pulse against the sent queue.',
    steps: [
      {
        title: 'Re-derive the timing contract',
        detail:
          'DIV = 50,000,000/115,200 = 434 (434.03 rounded); HALF = 217; frame = 10 bit periods; actual baud 115,207 (+0.006%). Put these numbers in comments at the top of both modules — they are the contract the testbench checks.',
      },
      {
        title: 'Complete uart_tx with the corrected bit sequencing',
        detail:
          'Per Lab 6: bit_idx walks 0..9; data bits at boundaries 0..7 via sh[0] with right-shift; stop forced at the bit_idx==8 boundary; busy cleared at bit_idx==9. Trace one frame by hand (byte 0x55) before simulating.',
      },
      {
        title: 'Complete uart_rx with re-centering and stop verification',
        detail:
          'Per Lab 6: 2-FF sync, start-edge detect, HALF-count to mid-start with still-low confirmation (glitch abort), 8 mid-bit samples shifted LSB-first, valid pulsed with data only if the stop slot samples high.',
      },
      {
        title: 'Write the scoreboard testbench',
        detail:
          'Task send_byte(d): wait !busy, drive data, pulse start one cycle, push d into an expected queue. Main: send {8\'h55, 8\'hA5, 8\'h00, 8\'hFF, 8\'hC3, 8\'h3C, 8\'h0F, 8\'hF0}, then on each rx_valid compare rx_data with the queue head and error-count on mismatch. Finish with a pass/fail summary.',
        code:
          'task send_byte(input [7:0] d);\nbegin\n    wait (!busy);\n    data = d;\n    start = 1\'b1; @(posedge clk);\n    start = 1\'b0;\n    expected[$] = d;   // simple queue for the scoreboard\nend\nendtask\n\n// scoreboard:\nalways @(posedge clk) begin\n    if (rx_valid) begin\n        if (rx_data !== expected[0]) begin\n            errors = errors + 1;\n            $display("MISMATCH: got %h expected %h", rx_data, expected[0]);\n        end\n        // pop expected[0] here (shift the queue)\n    end\nend',
      },
      {
        title: 'Run the back-to-back stress',
        detail:
          'Send all 8 bytes with zero idle gap beyond the busy handshake — the RX must handle a new start edge immediately after each stop. Confirm 8/8 match, zero errors, and exactly 8 valid pulses.',
      },
      {
        title: 'Negative test: corrupt a stop bit',
        detail:
          'In a TX-bypass testbench, drive a frame with a LOW stop bit and confirm the RX publishes no valid pulse (framing rejection working). This proves the stop check is load-bearing, not decorative.',
      },
      {
        title: 'Document the hardware plan and omissions',
        detail:
          'Planning table for clk, reset_n, tx, rx pins; note that real boards loop back with a jumper or talk to a PC USB-UART bridge; list the production features omitted (overrun, parity, FIFOs) as future work with pointers to Module 5\'s CDC notes.',
      },
    ],
    starterCode: {
      title: 'Scoreboard testbench skeleton',
      language: 'verilog',
      code:
        '`timescale 1ns/1ps\nmodule tb_uart_loopback;\n    reg clk = 0;\n    reg reset_n = 0;\n    reg start = 0;\n    reg [7:0] data = 8\'h00;\n    wire tx, rx_valid;\n    wire [7:0] rx_data;\n\n    uart_loopback dut (\n        .clk(clk), .reset_n(reset_n),\n        .start(start), .data(data),\n        .tx(tx), .rx_valid(rx_valid), .rx_data(rx_data)\n    );\n\n    always #10 clk = ~clk;      // 50 MHz\n\n    reg [7:0] expected [0:255]; // queue via index\n    integer wr = 0, rd = 0, errors = 0;\n\n    task send_byte(input [7:0] d);\n      begin\n        wait (!dut.u_tx_busy_alias_or_probe); // TODO: expose busy or re-drive timing\n        data  = d;\n        start = 1\'b1; @(posedge clk);\n        start = 1\'b0;\n        expected[wr] = d; wr = wr + 1;\n      end\n    endtask\n\n    // TODO: scoreboard on rx_valid; final $display pass/fail; $finish.\nendmodule',
      explanation: [
        'The skeleton fixes the structure — clock, DUT, queue, task shape — and leaves the busy-probe and scoreboard as TODOs, which is the actual verification thinking of the project.',
        'The commented TODO on the busy probe is deliberate: hierarchy access (`dut.u_tx.busy`) works in iverilog but should be a conscious choice; exposing busy at the loopback top is the cleaner alternative.',
        'The queue uses a fixed array with write/read indices — simple and adequate for 8 bytes.',
      ],
    },
    testPlan: [
      'Single byte 0x55: TX wire shows 0,1,0,1,0,1,0,1,0... — verify shape on a waveform dump, then RX returns 0x55 with one valid pulse.',
      'Byte 0xA5 LSB-first trace matches the sequence 0,1,0,1,0,0,1,0,1,1 on the wire.',
      'Back-to-back stream of 8 bytes: 8 valid pulses, 8/8 scoreboard matches, 0 errors.',
      'Framing: corrupted-stop negative test yields zero valid pulses.',
      'Reset mid-frame: design returns to idle and the next byte still transfers correctly.',
    ],
    expectedResults:
      'Simulation: 8/8 bytes round-trip through loopback with zero scoreboard errors; corrupted-stop frames are silently rejected (no valid pulse). No hardware run is claimed — board use requires a real FPGA with TX/RX pins (jumper loopback or USB-UART bridge), as documented.',
    troubleshooting: [
      'RX never pulses valid: check mid-start confirmation — if the re-center sees the line high, the frame was a glitch; also verify DIV/HALF arithmetic.',
      'Received bytes shifted (wrong bit order): LSB-first assembly inverted — check the {rx_ff2, sh[7:1]} shift direction.',
      'Intermittent wrong values only on back-to-back frames: re-centering off by one bit period (HALF vs DIV error) — re-derive the sample grid.',
      'Scoreboard fires on garbage once at start: the RX saw the TX line before reset released — hold reset across the first frames or initialize the line high in the TB.',
    ],
    hardwareDependencies:
      'Requires an FPGA dev board to run on hardware; fully simulable in iverilog on this platform via linked challenges where available. Board steps (TX/RX pin planning, jumper loopback or USB-UART bridge) are documented conceptually.',
  },
];
