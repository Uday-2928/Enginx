import type { TutorialProject } from '../types';

// RTL Projects — the course capstone project catalogue.
export const verilogHdlProjects: TutorialProject[] = [
  {
    id: 'vlog-project-alu',
    title: 'Parameterized ALU with Flags',
    level: 'intermediate',
    summary:
      'Design and verify a WIDTH-parameterized ALU: ADD, SUB, AND, OR, XOR, SHL, SHR and SLT with zero, carry and negative flags — the complete guided build from module 16 as a formal project.',
    useCase:
      'The arithmetic core of every processor and datapath: address computation, comparisons, bit manipulation. This parameterized version serves 8-bit microcontroller paths and 32-bit datapaths from one verified source file.',
    requirements: [
      'WIDTH parameter (default 8); every literal derives from it — zero hardcoded widths',
      '3-bit opcode: 000 ADD, 001 SUB, 010 AND, 011 OR, 100 XOR, 101 SHL, 110 SHR, 111 SLT (signed)',
      'Outputs: result[WIDTH-1:0], zero, carry, negative (separate 1-bit flags)',
      'One shared adder/subtractor (b XOR mode-mask, mode through carry-in)',
      'Carry: adder carry-out for ADD, no-borrow for SUB, forced 0 for all other ops',
      'Combinational only: no clock, no reset; latch-free (defaults before the case)',
      'SLT via $signed comparison; case complete with default',
    ],
    learningOutcomes: [
      'Datapath-sharing architecture: expensive structures (carry chains) shared behind cheap control (masks, muxes)',
      'Parameter discipline at full scale (module 13-l3 idioms in a real block)',
      'Flag semantics as a specification, verified by coherence checks',
      'Signedness verification: the negative-operand witness vectors',
    ],
    prerequisites: ['vlog-m16-l1', 'vlog-m08-l3', 'vlog-m14-l3'],
    architecture:
      '   a[7:0] ---+------------------------+\n             |                        v\n   b[7:0] -[XOR mask]-- bx --> [ (W+1)-bit ADDER ] --> sum[W:0]\n             ^  (SUB mask)          |\n             is_sub                 |\n                                    v\n   op[2:0] --> [ CASE MUX ] --> result[W-1:0] --> [FLAG TAPS]\n               add/sub: sum[W-1:0]              zero     = ~|result\n               and/or/xor: a op b               negative = result[W-1]\n               shl/shr: wiring                  carry    = sum[W] (add/sub only)\n               slt: $signed compare',
    steps: [
      {
        title: 'Write the specification sheet',
        detail:
          'Before any RTL: the 8-row operation table with result and carry semantics per op (module 16-l1 table). Decide flag behavior for logic/shift ops (forced 0). This sheet is the verification oracle’s source of truth.',
      },
      {
        title: 'Build the shared adder/subtractor',
        detail:
          'wire is_sub = (op == 3\'b001); wire [WIDTH-1:0] bx = b ^ {WIDTH{is_sub}}; wire [WIDTH:0] sum = a + bx + is_sub; — the (WIDTH+1)-bit context preserves the carry (module 04 rule, parameterized).',
      },
      {
        title: 'Code the case mux with defaults-first',
        detail:
          'always @* with result/carry defaults before the case; arms per the spec table; SLT using ($signed(a) < $signed(b)) returning a width-generic one-hot. Default arm returns zero.',
        code:
          "always @* begin\n    result = {WIDTH{1'b0}};\n    carry  = 1'b0;\n    case (op)\n        3'b000:  result = sum[WIDTH-1:0];\n        3'b001:  result = sum[WIDTH-1:0];\n        3'b010:  result = a & b;\n        3'b011:  result = a | b;\n        3'b100:  result = a ^ b;\n        3'b101:  result = {a[WIDTH-2:0], 1'b0};\n        3'b110:  result = {1'b0, a[WIDTH-1:1]};\n        3'b111:  result = ($signed(a) < $signed(b))\n                          ? {{(WIDTH-1){1'b0}}, 1'b1}\n                          : {WIDTH{1'b0}};\n        default: result = {WIDTH{1'b0}};\n    endcase\n    zero     = ~|result;\n    negative = result[WIDTH-1];\n    carry    = ((op == 3'b000) || is_sub) ? sum[WIDTH] : 1'b0;\nend",
      },
      {
        title: 'Write the checking task with coherence checks',
        detail:
          'check_alu(op, a, b, expect_r, expect_c): drive, settle #1, compare result and carry with !==, then verify zero === ~|result and negative === result[WIDTH-1] (coherence independent of golden values).',
      },
      {
        title: 'Run the directed vector set',
        detail:
          '12 vectors: every opcode × operand classes {zeros, extremes, mixed}, both SLT signedness witnesses (FF vs 00 both directions). Hand-verify every expected value before simulating.',
      },
      {
        title: 'Add the randomized arithmetic layer',
        detail:
          '300 $random vectors each for ADD and SUB (oracles: the 9-bit arithmetic), keeping logic/shift/SLT directed. Total ~615 vectors, SUMMARY: PASS/FAIL line.',
      },
      {
        title: 'Synthesis notes write-up',
        detail:
          'Document: carry chain = the critical structure; SHL/SHR-1 are wiring; a variable-shift variant adds log2(W) mux stages; flags fan out only to status logic. No clock → no timing closure in this module.',
      },
    ],
    testPlan: [
      'Reset/coherence: flags agree with result on EVERY vector (zero === ~|result, negative === result[W-1])',
      'ADD: 00+00, FF+01 (carry=1), A5+3C; randomized oracle sweep',
      'SUB: 42-42 (carry=1 no borrow), 03-07 (borrow, carry=0), FF-01',
      'Logic: C3 op AA for AND/OR/XOR against behavioral oracles',
      'Shifts: 81<<1 = 02, 81>>1 = 40',
      'SLT: FF<00 → 1, 00<FF → 0 (the signedness witnesses)',
      'Width override: repeat the suite at WIDTH=4 and WIDTH=16 (parameter-generic proof)',
      'Fixed-format SUMMARY line greppable by scripts',
    ],
    expectedResults:
      'SUMMARY: PASS with 0 errors across all vectors at WIDTH=8, 4 and 16. Every SLT witness row returns the signed answer. Flags never contradict results. The WIDTH=4/16 runs pass WITHOUT code changes — the parameterization proof.',
    troubleshooting: [
      'SUB results off by one → the carry-in +1 is missing (sum = a + bx + is_sub, not a + bx)',
      'Carry wrong on logic ops → carry must be forced 0 outside ADD/SUB (the case-based tap)',
      'SLT wrong on negatives → missing $signed casts: the compare went unsigned (module 03 trap)',
      'WIDTH=16 fails → a hardcoded 8-bit literal somewhere; grep for 8\' and [7:0]',
      'x outputs on some op → incomplete case or missing default (module 15-l1)',
    ],
    synthesisConsiderations:
      'The carry chain is the critical path — for WIDTH > 16 consider explicit carry-lookahead structure or DSP mapping. SHL/SHR-1 are pure wiring. Replacing SHR-1 with a >> b[2:0] variable shift infers a log2(W)-stage barrel mux tree (documented area cost). Flags are status outputs: keep them off the result path. The module is clockless; consumers set the frequency.',
  },
  {
    id: 'vlog-project-traffic-light',
    title: 'Traffic Light Controller with Parameterized Timings',
    level: 'intermediate',
    summary:
      'The timer-driven FSM capstone: four phases with parameterized durations, an integrated countdown timer, hazard short-circuiting, and cycle-accounting verification.',
    useCase:
      'Any duration-sequenced controller: intersection control, beacon sequences, watchdog timeouts, protocol framing timers. The timer-driven FSM pattern is one of the two fundamental controller families.',
    requirements: [
      'Four phases cycling A_GREEN → A_YELLOW → B_GREEN → B_YELLOW, repeating',
      'T_GREEN (default 10) and T_YELLOW (default 2) parameters; timer width derived, never hardcoded',
      'Exactly one A-lamp and one B-lamp lit at all times (Moore decodes)',
      'Reset (async active-low) lands in A_GREEN with the timer loaded',
      'Hazard input short-circuits B_G/B_Y immediately; ignored during A phases (documented spec)',
      'Reload = DURATION-1 at every transition (exact cycle accounting)',
      'Defaults-first combinational block; complete case with default',
    ],
    learningOutcomes: [
      'Timer-driven FSM design with exact cycle accounting (the off-by-one discipline)',
      'Safety-spec encoding: hazard semantics as explicit transition-table rows',
      'Parameterized durations without desynchronizing the timer width',
      'Residency-tally verification (counting cycles per state programmatically)',
    ],
    prerequisites: ['vlog-m16-l2', 'vlog-m11-l3', 'vlog-m10-l2'],
    architecture:
      '            T=10          T=2           T=10          T=2\n   [A_G] ---------> [A_Y] ---------> [B_G] ---------> [B_Y] ---+\n     ^  lamps: a_green  a_yellow     b_green     b_yellow        |\n     |                                                            |\n     +------------------------------------------------------------+\n\n   timer: countdown, reload = DURATION-1 on every transition\n   hazard: OR-ed into B_G/B_Y expiry conditions only\n   lamps: one-hot Moore decodes of the state register',
    steps: [
      {
        title: 'Write the phase table and hazard rules',
        detail:
          'Four phases with durations; hazard semantics per state (B_G: immediate exit to B_Y; B_Y: immediate exit to A_G; A rows: ignored). Ambiguity here becomes integration bugs later — write every (state, tcnt==0, hazard) row.',
      },
      {
        title: 'Derive the timer width',
        detail:
          'localparam TMAX_M1 = (T_GREEN > T_YELLOW) ? (T_GREEN-1) : (T_YELLOW-1); — size the timer to hold it (or use the module 13-l1 clog2 constant function for full genericity).',
      },
      {
        title: 'Code the two-always FSM with integrated timer',
        detail:
          'Combinational block computes next AND tnext (defaults first); the clocked block captures both; every transition reloads with the NEW phase’s DURATION-1.',
        code:
          "A_G: begin\n    if (tcnt == 4'd0) begin next = A_Y; tnext = T_YELLOW - 1; end\n    else              tnext = tcnt - 4'd1;\nend\n// ... per-phase arms; B rows OR hazard into the expiry condition:\nB_G: begin\n    if (tcnt == 4'd0 || hazard) begin next = B_Y; tnext = T_YELLOW - 1; end\n    else                        tnext = tcnt - 4'd1;\nend",
      },
      {
        title: 'Decode the lamps',
        detail:
          'Four continuous assigns: a_green = (state == A_G); etc. Structurally exclusive — exactly one lamp per road at all times.',
      },
      {
        title: 'Build the residency-tally checker',
        detail:
          'A testbench process samples the lamps at every posedge for a full period, tallying cycles per phase; compare the four tallies against (T_GREEN, T_YELLOW, T_GREEN, T_YELLOW). This — not eyeballing — proves cycle accounting.',
      },
      {
        title: 'Run the boundary suite',
        detail:
          'Reset state; full 24-cycle period (for 10/2); hazard mid-B_G (immediate B_Y, full yellow); hazard during A_G (ignored); mid-operation reset (return to A_G, timer loaded, no dark cycle).',
      },
      {
        title: 'Parameter stress run',
        detail:
          'Repeat with T_GREEN=1, T_YELLOW=1 (every phase one cycle — expiry on the first cycle must still sequence cleanly) and T_GREEN=16 (timer-width boundary).',
      },
    ],
    testPlan: [
      'Reset: A_G lit, a_yellow/b_green/b_yellow clear, timer loaded',
      'Cycle accounting: tallies (10, 2, 10, 2) over 24 cycles, repeating',
      'Lamp sanity: exactly one A-lamp AND one B-lamp high on every sampled cycle',
      'Hazard mid-B_G: B_Y begins next edge with full yellow duration',
      'Hazard mid-A_G: ignored — A_G completes its full duration',
      'Mid-operation reset: from mid-B_G to A_G with loaded timer, no dark cycle',
      'Parameter stress: T_GREEN=1/T_YELLOW=1 cycles cleanly; T_GREEN=16 fits the timer',
    ],
    expectedResults:
      'All tallies exact; lamps never double-lit or dark; hazard behaves per spec on both road sides; parameter stress runs pass without code changes. SUMMARY: PASS across all scenarios.',
    troubleshooting: [
      'Phases last T+1 cycles → reload value is D, not D-1 (the reload cycle counts as the new phase’s first)',
      'Dark cycle after reset → reset value of tcnt not loaded (or loaded to 0 instead of T-1)',
      'Hazard ignored everywhere → hazard missing from the B-row expiry conditions',
      'Hazard breaks A phases → hazard OR-ed into A rows against spec',
      'T_GREEN=16 fails → timer width too small; derive from max duration',
      'Two lamps lit on one road → decode compares against the wrong encodings (check localparam values)',
    ],
    synthesisConsiderations:
      'Binary encoding is right at 4 states (one-hot buys nothing). The timer compare is the only real logic depth — trivial timing at any realistic clock. Lamp outputs drive LEDs off-chip: keep them as clean Moore decodes (they are). Hazard is a single asynchronous-ish input: if it comes from outside the clock domain, it needs the module 09-l3 double-flop synchronizer — note this honestly in the integration notes.',
  },
  {
    id: 'vlog-project-stopwatch',
    title: 'Digital Stopwatch (Start / Pause / Reset)',
    level: 'intermediate',
    summary:
      'A BCD-style stopwatch counting centiseconds with start/pause/reset controls — counters, enable strobes and freeze semantics assembled into a human-usable product.',
    useCase:
      'Timer products of every kind: kitchen timers, sports clocks, event timing, test-equipment interval counters. The start/pause/reset control triplet is the universal human-interface pattern for sequential products.',
    requirements: [
      'Counts centiseconds using an enable strobe derived from the system clock (one clock domain)',
      'BCD digits: two decimal digits (centiseconds 0-99) plus seconds/minutes carry chain (mod-60)',
      'Controls: start (run), pause (freeze EXACTLY where it is), reset (async, clears all digits)',
      'Pause must be true freeze semantics: no digit moves while paused, resume continues',
      'Digit outputs for display decoding (one 4-bit BCD per digit)',
      'Rollover at the maximum (99:59:99): stop or wrap — choose one, document it',
    ],
    learningOutcomes: [
      'Enable-strobe timebase from a counter (module 09-l3/10-l2) in a product context',
      'Freeze semantics: pause implemented by gating enables, never the clock',
      'BCD carry chains (mod-10 digit, mod-60 pairs) as enable cascades',
      'Control FSM (idle/running/paused) driving datapath enables',
    ],
    prerequisites: ['vlog-m10-l2', 'vlog-m09-l3', 'vlog-m11-l2'],
    architecture:
      '   clk -->[strobe gen: 1 pulse per centisecond]--> tick\n\n   tick -->[centisecond digit: mod-10]--tc-->[tens: mod-10]--tc-->[seconds: mod-60]-->[minutes: mod-60]\n\n   controls: start/pause --> [control FSM: IDLE/RUN/PAUSE] --> per-digit enable gates\n   reset_n (async) --> all digits + FSM\n\n   Freeze = gate the tick ENABLE into the digits; the clock never stops.',
    steps: [
      {
        title: 'Define the digit chain and rollover',
        detail:
          'Centiseconds as two mod-10 digits (00-99); seconds and minutes as mod-60 pairs (or BCD tens/ones). Define the terminal behavior at max (stop at 99:59:99 vs wrap — choose, document).',
      },
      {
        title: 'Build the centisecond strobe',
        detail:
          'A counter divides the clock to one pulse per centisecond (e.g. 100 Hz at a 10 kHz clock: count 0..99, tick on the wrap — module 10-l2). The tick is an ENABLE, never a clock.',
      },
      {
        title: 'Build the BCD digits with enable cascades',
        detail:
          'Each digit: if (en && tick... ) count; carry (tc) when the digit wraps. The next digit’s enable = this digit’s tc — module 10-l2’s enable cascade, all on one clock.',
      },
      {
        title: 'Add the control FSM',
        detail:
          'IDLE → (start) → RUN → (pause) → PAUSE → (start) → RUN; reset from anywhere. RUN gates tick into the digits; PAUSE gates it off (freeze exactly); the FSM itself always runs on clk.',
      },
      {
        title: 'Verify',
        detail:
          'Freeze test: run to a known count, pause N cycles, resume — the count continues exactly (no lost or extra ticks). Rollover: 99→00 digit carries. Reset mid-run: all digits zero, FSM to IDLE. Pulse-contract tests for start/pause (module 11-l3’s contract discipline).',
      },
    ],
    testPlan: [
      'Reset: all digits 00:00:00, FSM in IDLE',
      'Run: centiseconds increment at exactly the strobe rate (1 per 100 clocks at 10 kHz)',
      'Digit carries: 09→10 (ones→tens), 59→00 with seconds carry, 59:59→00:00 with minutes carry',
      'Pause: freeze for 1000 cycles — count identical before and after; resume continues',
      'Pause/start pulse contract: held start does not double-trigger the FSM',
      'Reset mid-run: all digits clear, FSM to IDLE, first run starts from zero',
      'Terminal behavior at max: stop or wrap per the documented choice',
    ],
    expectedResults:
      'The stopwatch counts at exactly the strobe rate; every digit boundary carries correctly; pause freezes to the exact count and resumes without loss; reset clears everything from any state. SUMMARY: PASS.',
    troubleshooting: [
      'Counting too fast/slow → strobe divisor wrong (ticks per centisecond = clk_freq × 0.01)',
      'Digits freeze during RUN → enable cascade broken (tc not reaching the next digit’s enable)',
      'Pause loses ticks → pause gates the strobe GENERATOR instead of the digit enables (the generator must keep running, or the phase must be preserved)',
      'Held start re-triggers → control FSM needs edge-detected inputs (module 09-l3 pulses)',
      '59:60 appears → seconds digit is mod-10 instead of mod-60 (or the tens/ones pair carry is wrong)',
    ],
    synthesisConsiderations:
      'All digits are small counters (4-bit) — register-file territory, no BRAM. The strobe counter is the only wide counter. Single clock domain throughout: the tick is data. Display outputs are registered digit decodes (add the seven-segment case-ROM from module 12-l3 at the pin if driving a real display).',
  },
  {
    id: 'vlog-project-sequence-detector',
    title: 'Overlapping Sequence Detector (1011)',
    level: 'beginner',
    summary:
      'The canonical FSM exercise as a full project: Moore and Mealy implementations of the overlapping 1011 detector, with suffix-derivation practice and timing comparison.',
    useCase:
      'Pattern recognition in serial streams: framing detectors, command recognizers, protocol sync words. The suffix-tracking method generalizes to any target string.',
    requirements: [
      'One input bit per clock (x); detect the sequence 1,0,1,1 with overlapping enabled',
      'Moore version: output z=1 one cycle AFTER the completing bit (registered timing)',
      'Mealy version: output z=1 during the completing bit (combinational timing)',
      'Both versions share the transition structure; only the output stage differs',
      'Safe defaults: unknown states recover to S0; complete case with default',
      'Reset (async active-low) returns to S0',
    ],
    learningOutcomes: [
      'The longest-useful-suffix transition derivation method (generalizes to any pattern)',
      'Moore vs Mealy timing, verified side by side on identical traces',
      'Overlapping detection: why S101+x=0 goes to S10, not S0',
      'Registered vs combinational output trade-offs in one design',
    ],
    prerequisites: ['vlog-m11-l1', 'vlog-m11-l2'],
    architecture:
      '   MOORE (5 states):                MEALY (4 states):\n\n   [S0]-x1->[S1]-x0->[S10]-x1->[S101]-x1->[S_OK]   [S0]->[S1]->[S10]->[S101]\n     ^        |x1(self)  |x0->S0   |x0->S10   |          z=1 on S101 + x=1\n     +--x0----+          +--------+----------+          (transition-owned output)\n   S_OK: x1->S1, x0->S10 (suffix seeds)\n   z = (state == S_OK)              z = (state == S101) && x',
    steps: [
      {
        title: 'Derive the transition tables by suffixes',
        detail:
          'For each state and input, the next state is the longest suffix of (progress + x) that is still a prefix of 1011. Fill the Moore 5-row and Mealy 4-row tables before coding.',
      },
      {
        title: 'Code the Moore version (two-always template)',
        detail:
          'Binary localparams, next-state case with defaults, state register with async reset, z = (state == S_OK).',
      },
      {
        title: 'Code the Mealy version',
        detail:
          'Same next-state logic minus S_OK (S101+x=1 → S1); output assign z = (state == S101) && x — combinational, same-cycle.',
      },
      {
        title: 'Verify on shared traces',
        detail:
          'Traces: 1011 (single detection: Mealy z during cycle 4, Moore z during cycle 5), 1011011 (two overlapping detections), 1101011 (detection at the last four bits), 0000 and 1111 (no false detections).',
      },
      {
        title: 'Document the timing difference',
        detail:
          'The one-cycle offset is BY DESIGN: encode each style’s expected timing separately in the testbench (module 11-l1’s comparison table).',
      },
    ],
    testPlan: [
      '1011: Mealy z=1 during cycle 4; Moore z=1 during cycle 5',
      '1011011: exactly two detections (overlapping proof) in both styles',
      '1101011: one detection (bits 4-7)',
      '1111, 0000, 1010: zero detections',
      'Reset mid-stream: returns to S0, no phantom z',
      'Unknown-state recovery: default arm returns to S0 (structural check)',
    ],
    expectedResults:
      'Both implementations detect every 1011 occurrence (including overlaps) with zero false positives; Mealy fires one cycle earlier than Moore on every detection — by design, verified on shared traces.',
    troubleshooting: [
      'Missed overlapping second detection → S101+x=0 goes to S0 instead of S10 (suffix dropped)',
      'Moore z late by two cycles → output accidentally registered (three-always form used unknowingly)',
      'Mealy z glitches → expected (combinational output); register it if the consumer needs clean pulses',
      'False detection on 1111 → S1+x=1 must stay in S1 (suffix "1"), not advance',
      'z stuck after detection → S_OK transitions missing (or Mealy S101+x=1 next-state wrong)',
    ],
    synthesisConsiderations:
      'Both versions are tiny: binary encoding, 3 (Moore) / 2 (Mealy) flip-flops. The Mealy output path (input → z) is combinational and fast; the Moore output is a registered decode. If z drives an off-chip pin, prefer the Moore version or register the Mealy output.',
  },
  {
    id: 'vlog-project-uart-tx',
    title: 'UART Transmitter (8N1, Educational Scope)',
    level: 'advanced',
    summary:
      'A complete UART transmitter: baud-rate generator with oversampled tick, 8N1 framing (start, 8 data LSB-first, stop), busy indication — the module 10-l3 framing logic made real.',
    useCase:
      'Serial debug links, sensor-to-controller links, inter-board communication. UART remains the universal low-cost serial channel; the TX side is the standard first serial-protocol build.',
    requirements: [
      'Parameterized clock frequency and baud rate; baud tick = clk_freq / baud (counter-based strobe, NOT a divided clock)',
      '8N1 frame: 1 start bit (0), 8 data bits LSB-first, 1 stop bit (1); idle high',
      'Frame register {stop, data, start} shifted right with 1-fill (module 10-l3 idiom)',
      'busy output; send requests while busy are rejected (documented) or queued (extension)',
      'Reset (async active-low) returns the line to idle-high',
      'All bit timing from the baud-tick ENABLE — one clock domain',
    ],
    learningOutcomes: [
      'Baud-rate generation as an enable strobe (counter-based, single clock domain)',
      'Framing as a shift-register bit pattern (the frame-register trick at full scale)',
      'Serial-interface verification: bit-order witnesses, frame timing, idle integrity',
      'Interface contracts: busy/reject semantics vs queueing (a real design decision)',
    ],
    prerequisites: ['vlog-m10-l3', 'vlog-m09-l3', 'vlog-m13-l3'],
    architecture:
      '   clk -->[baud counter: 0..DIV-1]--> baud_tick (1 clk every bit period)\n\n   send -->[load frame {1, din, 0}]--> [10-bit shift register]\n                                              | shift right on baud_tick,\n                                              | 1-fill (idle high)\n                                              v\n                                            tx = frame[0] (or 1 when idle)\n\n   bit counter 0..9 on baud_tick; done -> idle\n   busy = active (send rejected while busy, documented policy)',
    steps: [
      {
        title: 'Compute the baud divisor',
        detail:
          'DIV = CLK_FREQ / BAUD (e.g. 50 MHz / 115200 ≈ 434). Parameterize CLK_FREQ and BAUD; the counter counts 0..DIV-1 with a tick on the wrap (module 10-l2 pattern — an enable strobe, never a derived clock).',
      },
      {
        title: 'Build the transmitter FSM',
        detail:
          'IDLE → (send && !busy) load frame {1\'b1, din, 1\'b0}, arm bit counter → SHIFTING: on each baud_tick shift right with 1-fill, count bits → after bit 9, IDLE.',
      },
      {
        title: 'Drive the line',
        detail:
          'assign tx = active ? frame[0] : 1\'b1; — idle high between frames, no glitches low.',
      },
      {
        title: 'Verify frame timing and bit order',
        detail:
          'Witness patterns 0x01 and 0x80 (bit order); measure start-bit width = exactly DIV clocks; verify the 10-bit frame sequence (start, d0..d7, stop) and idle-high between frames; busy deasserts after the stop bit.',
      },
      {
        title: 'Loopback self-test',
        detail:
          'Pair with the module 10-l3 S2P receiver (accumulate {sdata, shreg[7:1]} on baud ticks): send bytes, check the reassembled word equals the sent byte — the honest end-to-end proof.',
      },
      {
        title: 'Document scope honestly',
        detail:
          'This TX assumes a perfect receiver at the same baud. Real UART links add 16x oversampling and majority voting on the RX side (next-course topic); note this in the header.',
      },
    ],
    testPlan: [
      'Idle: tx = 1 from reset, forever until send',
      'Bit order: send 0x01 → data field reads 1,0,0,0,0,0,0,0 (LSB first); send 0x80 → 0,...,0,1',
      'Frame: start(0), 8 data bits, stop(1) — exactly 10 bit periods; each bit exactly DIV clocks',
      'Busy: rises with send, holds through the frame, falls after the stop bit',
      'Reject-while-busy: a second send during a frame is ignored (documented policy)',
      'Back-to-back: frames separated by exactly the idle gap the driver inserts',
      'Loopback: S2P receiver reassembles sent bytes exactly (0x55, 0xAA, random)',
    ],
    expectedResults:
      'Every frame matches 8N1 exactly: correct bit order (witness-verified), exact bit periods, idle-high between frames, busy tracking the frame, rejected overlaps documented. Loopback reassembles every byte. SUMMARY: PASS.',
    troubleshooting: [
      'Bit periods wrong → divisor computation (CLK_FREQ/BAUD) mis-parameterized or the counter width too small',
      'Receiver reads garbage but framing looks right → bit-order mismatch: TX shifts right (LSB-first) so the RX must accumulate {sdata, shreg[7:1]}',
      'Line drags low after frames → zero-fill in the shift register; fill with 1s (idle high)',
      'Second send corrupts the frame → missing send && !active guard',
      'tx glitches between frames → tx not forced to 1 when inactive',
      'Works in sim, fails on a real link → RX-side oversampling/voting absent (documented scope boundary — a real UART RX samples 16x per bit)',
    ],
    synthesisConsiderations:
      'The baud counter is the only wide register (width = clog2(DIV)); derive it with the clog2 constant function. Everything else is a 10-bit shift register and a 4-bit counter. The tx output is registered-adjacent (frame[0] mux) — glitch-free enough for a UART line; a registered tx output stage is a cheap hardening if driving long wires.',
  },
  {
    id: 'vlog-project-fifo',
    title: 'Synchronous FIFO with Full/Empty/Count',
    level: 'advanced',
    summary:
      'The capstone storage block: a parameterized synchronous FIFO with circular pointers, occupancy count, full/empty flags, documented overflow/underflow policy, and the complete boundary-matrix testbench.',
    useCase:
      'Rate matching and buffering everywhere: packet buffers, stream framers, CDC bridges (with the async-pointer extension), DMA staging. The single-clock FIFO is the foundation every fancier variant builds on.',
    requirements: [
      'Parameters: DATA_WIDTH, DEPTH (power of two), ADDR_BITS = clog2(DEPTH), CNT_WIDTH = clog2(DEPTH)+1',
      'Write honored only when !full; read honored only when !empty (ignored otherwise — documented policy)',
      'Registered read: dout valid 1 cycle after rd_en (module 12-l2 BRAM shape)',
      'full = (count == DEPTH); empty = (count == 0); count = occupancy',
      'Simultaneous read+write: count holds, both pointers advance',
      'Natural pointer wrap (no explicit wrap logic — power-of-two depth)',
      'Reset (async active-low): pointers and count cleared; data untouched (unreachable)',
    ],
    learningOutcomes: [
      'Ring-buffer pointer arithmetic and the count-based full/empty disambiguation',
      'The CNT_WIDTH off-by-one (the counter must reach DEPTH)',
      'Simultaneous r/w semantics implemented and verified explicitly',
      'BRAM-shaped memory inference in a real block (module 12-l2 applied)',
      'Boundary-matrix verification as a reusable suite skeleton',
    ],
    prerequisites: ['vlog-m16-l3', 'vlog-m12-l2', 'vlog-m10-l2'],
    architecture:
      '              +-----------------------------------+\n   din ----->|  mem[0 .. DEPTH-1]  (BRAM shape)  |\n   wr_en --->|  write port: mem[wr_ptr]          |\n             |                                   |----> dout (registered)\n   rd_en --->|  read port: mem[rd_ptr]           |\n             +-----------------------------------+\n                    ^wr_ptr          ^rd_ptr\n                      \\                /\n                  [occupancy count] --+--> full  = (cnt == DEPTH)\n                                       +--> empty = (cnt == 0)\n                                       +--> count\n\n   policies: do_wr = wr_en && !full;  do_rd = rd_en && !empty\n   count case on {do_wr, do_rd}: 10 inc, 01 dec, 11/00 hold',
    steps: [
      {
        title: 'Fix the policies and widths',
        detail:
          'do_wr/do_rd gating (ignore-on-boundary policy), ADDR_BITS = clog2(DEPTH), CNT_WIDTH = clog2(DEPTH)+1 (the counter must reach DEPTH — the classic off-by-one).',
      },
      {
        title: 'Build the memory and pointers',
        detail:
          'Array in the module 12-l2 dual-port shape; pointers increment on their events (natural wrap); the registered read samples mem[rd_ptr] BEFORE the pointer moves (nonblocking discipline).',
      },
      {
        title: 'Implement the occupancy case',
        detail:
          'case ({do_wr, do_rd}): 2\'b10 increment, 2\'b01 decrement, default hold — the simultaneous cancellation is explicit code, not an accident.',
        code:
          "case ({do_wr, do_rd})\n    2'b10:   cnt <= cnt + {{(CNT_WIDTH-1){1'b0}}, 1'b1};\n    2'b01:   cnt <= cnt - {{(CNT_WIDTH-1){1'b0}}, 1'b1};\n    default: cnt <= cnt;   // 00 or 11: hold\nendcase",
      },
      {
        title: 'Derive the flags',
        detail:
          'assign full = (cnt == DEPTH); assign empty = (cnt == 0); — registered-accurate, derived from the count.',
      },
      {
        title: 'Run the boundary matrix',
        detail:
          'Reset state; fill to full (count = DEPTH, full = 1); overflow-ignored; drain in FIFO order to empty; underflow-ignored; simultaneous r/w mid-fill (count unchanged, both pointers advance); wrap-crossing refill (order preserved across the pointer wrap).',
      },
      {
        title: 'Data-integrity sweep',
        detail:
          'Write a known sequence (values equal to an index), drain it fully, compare word-by-word with !== — FIFO ORDER is the specification; the sweep proves it across the wrap.',
      },
      {
        title: 'Synthesis notes',
        detail:
          'The registered read maps the array to block RAM; async dout would force distributed RAM. Flags are registered-accurate (one-cycle-old count is fine for same-clock consumers). Note the FWFT variant (dout continuously shows the head) as a documented extension.',
      },
    ],
    testPlan: [
      'Reset: empty=1, full=0, count=0; dout defined (not x)',
      'Fill to full: count reaches DEPTH exactly; full asserts at DEPTH (not DEPTH-1 — the CNT_WIDTH check)',
      'Overflow: wr_en while full → count unchanged, stored data intact',
      'Drain: FIFO order verified word-by-word (values = write index) to empty',
      'Underflow: rd_en while empty → count unchanged, dout holds last value',
      'Simultaneous r/w mid-fill: count unchanged across the cycles; both pointers advance',
      'Wrap crossing: fill, drain 12, refill past the end — order preserved across the wrap',
      'WIDTH/DEPTH override: repeat at DATA_WIDTH=16, DEPTH=8 (parameter-generic proof)',
    ],
    expectedResults:
      'All boundary rows pass; FIFO order holds across the wrap; count is exact through every simultaneous-r/w cycle; full asserts exactly at count == DEPTH. SUMMARY: PASS, and the DEPTH=8/DATA_WIDTH=16 override run passes without code changes.',
    troubleshooting: [
      'full never asserts → CNT_WIDTH = clog2(DEPTH) (one bit short): the count cannot reach DEPTH',
      'count drifts under simultaneous r/w → the {do_wr, do_rd} case missing the hold arm',
      'Reads return the wrong word after a wrap → rd_ptr not advancing (or the read sampling AFTER the pointer update — check assignment order)',
      'dout one cycle late vs the testbench → unmodeled registered-read latency (module 12-l2 contract)',
      'x in dout after reset → dout_r not reset (module 09-l1: reset every state reg)',
      'Writes lost at full → intended? verify the policy documentation matches the code (do_wr gating)',
    ],
    synthesisConsiderations:
      'The registered read maps the array to block RAM (the dual-port shape of module 12-l2); keep the read register inside the same clocked block. DEPTH must be a power of two for the natural pointer wrap — non-power-of-two depths need an explicit wrap compare (documented extension). Flags and count are small comparators. A clock-domain-crossing version (asynchronous pointers with Gray coding) is the standard next step — honestly out of this course’s scope.',
  },
];
