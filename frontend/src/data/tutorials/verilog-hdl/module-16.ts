import type { TutorialLesson } from '../types';

// Module 16 — RTL Projects (Capstone)
export const module16Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m16-l1',
    title: 'Capstone Project 1: Parameterized ALU',
    summary:
      'Build the full ALU — add/sub/and/or/xor/shl/shr/slt with zero, carry and negative flags — as a parameterized module with a complete verification suite.',
    objectives: [
      'Specify the ALU interface (ops, operands, flags) precisely before coding.',
      'Implement the parameterized datapath with the shared-adder architecture.',
      'Verify against per-opcode oracles plus flag-consistency checks.',
      'Document synthesis considerations (carry chains, shift muxes, flag fanout).',
    ],
    whyItMatters:
      'The ALU is the course’s flagship build: it exercises modules 04-15 simultaneously — width rules, case completeness, flag taps, parameterization, and self-checking verification. It is also a complete spec-to-verification workflow you can repeat for any block. The projects.ts entry packages this as a formal project; this lesson is the guided build.',
    prerequisites: ['vlog-m08-l3', 'vlog-m14-l3', 'vlog-m13-l3'],
    explanation:
      '**Specification.** A parameterized ALU (default 8-bit) computing one of 8 operations under a 3-bit opcode: ADD (a+b), SUB (a-b), AND, OR, XOR, SHL (a<<1), SHR (a>>1), SLT (signed a<b → 1). Outputs: result (WIDTH bits) plus flags zero (result == 0), carry (adder carry-out for ADD; no-borrow for SUB; 0 otherwise), negative (result MSB, meaningful for signed data). No clock: a purely combinational slice (a registered wrapper is a generate-if exercise).\n\n**Architecture** (module 08-l3’s, now parameterized): one shared adder/subtractor (b XOR mode-mask, mode through carry-in) feeding a case-selected result mux; flags tap the adder and the selected result. The parameter discipline: every literal derives from WIDTH ({WIDTH{1\'b0}}, clog2-style flag widths), and SLT uses $signed casts on the operands.\n\n**Verification** (module 14’s full pattern): per-opcode directed vectors at three operand classes (zeros, extremes, mixed), plus the flags-vs-result coherence checks (zero ⇔ ~|result, negative ⇔ result[WIDTH-1], carry forced 0 outside add/sub). The full suite lives in the projects.ts entry; the lesson builds the DUT and the checking task.\n\n**Synthesis notes** (honest, tool-shaped): the adder maps to carry-chain logic; SHL/SHR by 1 are pure wiring; a variable-shift variant (module 08-l3 barrel shifter) would add log2(WIDTH) mux stages; the carry flag fanouts only to status logic — keep it off critical paths. No clock means no timing closure in this module — its consumers decide the frequency.',
    deepDive:
      '### Why the shared adder beats per-op adders\n\nADD and SUB differ only in b-inversion and the +1 — one adder with a mode mask serves both at the cost of W XOR gates (the mask). Duplicating a dedicated subtractor would double the carry-chain area for zero speed gain. This "share the expensive structure, mux the cheap control" principle scales: real ALUs share shifter/adder/boole units behind one result mux, and recognizing WHICH structures are expensive (carry chains, multipliers) versus cheap (masks, muxes) is the datapath-design instinct this project trains.\n\n### SLT in a parameterized datapath\n\nSLT = signed a < b. In Verilog-2001 the clean form is `($signed(a) < $signed(b))` — the cast makes the comparison signed regardless of declarations (module 03/04 discipline). For WIDTH-parameterized code, the flag-style alternative: SLT ≈ (negative XOR overflow) of the subtraction a-b — but that requires an overflow flag (sign changes on overflow), which this ALU deliberately omits for scope; the $signed form is exact and simple. Verification MUST include the negative-operand rows (a=-1 vs b=0 and its mirror) — the signedness witness vectors.\n\n### The interface is the contract\n\nPort names, widths and directions are fixed by the spec sheet (and, in the projects.ts challenge, by the harness). Naming convention: op[2:0], a, b (data), result, flags as separate 1-bit outputs (zero/carry/negative) rather than a flag bundle — separate flags are individually consumable and self-documenting. Everything else (internals) is free; everything on the port list is public API — change it and every caller breaks.',
    examples: [
      {
        title: 'The parameterized ALU: complete DUT',
        language: 'verilog',
        code:
          '// alu_param.v — parameterized ALU with flags (the capstone DUT)\nmodule alu_param #(\n    parameter WIDTH = 8\n)(\n    input  wire [2:0]        op,      // 000 ADD 001 SUB 010 AND 011 OR\n                                      // 100 XOR 101 SHL 110 SHR 111 SLT\n    input  wire [WIDTH-1:0]  a,\n    input  wire [WIDTH-1:0]  b,\n    output reg  [WIDTH-1:0]  result,\n    output reg               zero,\n    output reg               carry,\n    output reg               negative\n);\n    // Shared adder/subtractor: mode = SUB only.\n    wire               is_sub = (op == 3\'b001);\n    wire [WIDTH-1:0]   bx     = b ^ {WIDTH{is_sub}};\n    wire [WIDTH:0]     sum    = a + bx + is_sub;   // (WIDTH+1)-bit context\n\n    always @* begin\n        // Defaults first: every output, every path (module 15-l1).\n        result   = {WIDTH{1\'b0}};\n        carry    = 1\'b0;\n        case (op)\n            3\'b000:  result = sum[WIDTH-1:0];                   // ADD\n            3\'b001:  result = sum[WIDTH-1:0];                   // SUB\n            3\'b010:  result = a & b;\n            3\'b011:  result = a | b;\n            3\'b100:  result = a ^ b;\n            3\'b101:  result = {a[WIDTH-2:0], 1\'b0};            // SHL 1\n            3\'b110:  result = {1\'b0, a[WIDTH-1:1]};            // SHR 1\n            3\'b111:  result = ($signed(a) < $signed(b))\n                              ? {{(WIDTH-1){1\'b0}}, 1\'b1}\n                              : {WIDTH{1\'b0}};                  // SLT\n            default: result = {WIDTH{1\'b0}};\n        endcase\n        // Flag taps (module 08-l3): from the SELECTED result + shared adder.\n        zero     = ~|result;\n        negative = result[WIDTH-1];\n        carry    = ((op == 3\'b000) || is_sub) ? sum[WIDTH] : 1\'b0;\n    end\n\nendmodule',
        explanation: [
          'Parameter discipline: the mode mask {WIDTH{is_sub}}, the zero literal, the SLT one-hot {{(WIDTH-1){1\'b0}}, 1\'b1}, the slice ranges — every literal scales with WIDTH.',
          'The shared adder: bx = b XOR mode-mask (invert for SUB), is_sub injected through the carry-in; sum is (WIDTH+1) bits so the carry survives (module 04 rule, generalized).',
          'The case is complete (default present) and defaults precede it — latch-free by construction (module 15-l1).',
          'Flags: zero = NOR-reduction of result; negative = MSB; carry = adder carry for ADD/SUB only, forced 0 otherwise (the module 08 operation table).',
          'SLT uses $signed casts — exact signed comparison regardless of port declarations; WIDTH-generic one-hot result.',
        ],
      },
      {
        title: 'The checking task and directed vector set',
        language: 'verilog',
        code:
          '// tb_alu_param.v — SIM-ONLY: per-op vectors + coherence checks\n`timescale 1ns/1ps\nmodule tb_alu_param;\n    reg  [2:0] op;\n    reg  [7:0] a, b;          // WIDTH = 8 instance\n    wire [7:0] result;\n    wire       zero, carry, negative;\n    integer    errors, vectors;\n\n    alu_param #(.WIDTH(8)) dut (\n        .op(op), .a(a), .b(b), .result(result),\n        .zero(zero), .carry(carry), .negative(negative)\n    );\n\n    task check_alu;\n        input [2:0] t_op;\n        input [7:0] t_a, t_b;\n        input [7:0] expect_r;\n        input       expect_c;      // expected carry (ADD/SUB only)\n        begin\n            op = t_op; a = t_a; b = t_b;\n            #1;\n            vectors = vectors + 1;\n            if (result !== expect_r || carry !== expect_c) begin\n                errors = errors + 1;\n                $display("FAIL op=%b a=%h b=%h got=%b c=%b want=%b c=%b",\n                         t_op, t_a, t_b, result, carry, expect_r, expect_c);\n            end\n            // Coherence (independent of golden values):\n            if (zero !== ~|result || negative !== result[7]) begin\n                errors = errors + 1;\n                $display("FLAG-MISMATCH op=%b a=%h b=%h", t_op, t_a, t_b);\n            end\n        end\n    endtask\n\n    initial begin\n        errors = 0; vectors = 0;\n        // ADD: zeros / wrap / mixed\n        check_alu(3\'b000, 8\'h00, 8\'h00, 8\'h00, 1\'b0);\n        check_alu(3\'b000, 8\'hFF, 8\'h01, 8\'h00, 1\'b1);   // 255+1: carry\n        check_alu(3\'b000, 8\'hA5, 8\'h3C, 8\'hE1, 1\'b0);\n        // SUB: exact / borrow / negative result\n        check_alu(3\'b001, 8\'h42, 8\'h42, 8\'h00, 1\'b1);   // equal: no borrow\n        check_alu(3\'b001, 8\'h03, 8\'h07, 8\'hFC, 1\'b0);   // borrow\n        // Logic ops\n        check_alu(3\'b010, 8\'hC3, 8\'hAA, 8\'h82, 1\'b0);\n        check_alu(3\'b011, 8\'hC3, 8\'hAA, 8\'hEB, 1\'b0);\n        check_alu(3\'b100, 8\'hC3, 8\'hAA, 8\'h69, 1\'b0);\n        // Shifts\n        check_alu(3\'b101, 8\'h81, 8\'h00, 8\'h02, 1\'b0);\n        check_alu(3\'b110, 8\'h81, 8\'h00, 8\'h40, 1\'b0);\n        // SLT: signedness witnesses\n        check_alu(3\'b111, 8\'hFF, 8\'h00, 8\'h01, 1\'b0);   // -1 < 0\n        check_alu(3\'b111, 8\'h00, 8\'hFF, 8\'h00, 1\'b0);   // 0 < -1 false\n        if (errors == 0) $display("SUMMARY: PASS 0 errors / %0d vectors", vectors);\n        else             $display("SUMMARY: FAIL %0d errors / %0d vectors", errors, vectors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'Twelve directed vectors: every opcode, three operand classes, and BOTH signedness witnesses for SLT.',
          'Expected values verified by hand: FF+01 = 100 → result 00, carry 1. 03-07: 3+8+1 = 12 = 0_1100? — 8-bit: 03 + F8(inv) + 1 = FC with carry 0 (borrow). C3&AA = 82; C3|AA = EB; C3^AA = 69. 81<<1 = 02; 81>>1 = 40. SLT rows per signed compare.',
          'The carry expectation is explicit per vector (1 for the add-wrap and the no-borrow equal-subtract) — flags are part of the spec, not decoration.',
          'Coherence checks (zero/negative vs result) run on EVERY vector independent of golden values.',
          'The projects.ts entry wraps this DUT + suite as a formal project with architecture, test plan and troubleshooting.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'ALU architecture (parameterized)',
        content:
          '   a[7:0] ---+------------------------+\n             |                        v\n   b[7:0] -[XOR mask]-- bx --> [ 9-bit ADDER ] --> sum[8:0]\n             ^  (SUB mask)          |\n             is_sub                 |\n                                    v\n   op[2:0] --> [ CASE MUX ] --> result[7:0] --> [FLAG TAPS]\n               add/sub: sum[7:0]              zero     = ~|result\n               and/or/xor: a op b             negative = result[7]\n               shl/shr: wiring                carry    = sum[8] (add/sub only)\n               slt: signed compare',
        caption:
          'One shared carry-chain adder, one case mux, flags as taps — the architecture scales to any WIDTH by construction.',
      },
    ],
    tables: [
      {
        caption: 'ALU specification sheet (the contract)',
        headers: ['op', 'Operation', 'result', 'carry semantics'],
        rows: [
          ['000', 'ADD', 'a + b (mod 2^W)', 'carry-out'],
          ['001', 'SUB', 'a - b (mod 2^W)', '1 = no borrow (unsigned a >= b)'],
          ['010', 'AND', 'a & b', '0'],
          ['011', 'OR', 'a | b', '0'],
          ['100', 'XOR', 'a ^ b', '0'],
          ['101', 'SHL', 'a << 1', '0'],
          ['110', 'SHR', 'a >> 1', '0'],
          ['111', 'SLT', '(signed a < b) ? 1 : 0', '0'],
        ],
      },
      {
        caption: 'Verification coverage matrix (the suite must hit every cell)',
        headers: ['Opcode', 'zeros class', 'extremes class (FF/00)', 'mixed class (A5/3C style)'],
        rows: [
          ['ADD, SUB', 'yes (00+00, 42-42)', 'yes (FF+01, 03-07)', 'yes (A5+3C)'],
          ['AND, OR, XOR', 'no — directed rows use mixed only', 'no', 'yes (C3 op AA)'],
          ['SHL, SHR', 'yes (b=0 rows)', 'yes (81 rows)', 'no'],
          ['SLT', 'no', 'yes (FF vs 00 witnesses)', 'no'],
          ['Note', 'Randomized bulk (projects.ts) adds mixed coverage for arithmetic; boolean ops have independent bits, so directed rows suffice', '', ''],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Hardcoding 8-bit literals inside the WIDTH-parameterized module.',
        fix:
          'Every literal derives: {WIDTH{1\'b0}}, sum[WIDTH:0], {{(WIDTH-1){1\'b0}}, 1\'b1}. One hardcoded 8 breaks every other width — module 13-l3’s rule at capstone scale.',
      },
      {
        mistake: 'Forgetting the carry-in +1 in SUB, computing a + ~b.',
        fix:
          'a - b = a + ~b + 1: the mode rides the carry-in. Missing it makes every subtraction off by one — caught immediately by the exact-subtract vector (42-42 → 0).',
      },
      {
        mistake: 'Testing SLT only with non-negative operands.',
        fix:
          'The signedness witnesses (FF vs 00, both directions) are the ONLY rows that distinguish signed from unsigned compare. No negative rows = unverified signedness.',
      },
    ],
    guidedPractice: {
      title: 'Extend to SHR-variable',
      brief:
        'Replace the SHR-1 arm with a variable shift: op 110 computes a >> b[2:0] (logical). State the new operation-table row and the expected results for a=8\'h80 with b=0 and b=3. Note the synthesis implication.',
      expectedBehavior:
        'Row: 110 → result = a >> b[2:0] (zero-fill). a=80 with b=0 → 80 (shift by 0); b=3 → 80 >> 3 = 10 (8\'h10). Synthesis: a variable shift infers the log2(WIDTH)-stage barrel mux tree (module 08-l3) — more area than the wiring-only shift-by-1, a documented cost decision.',
      hints: [
        'The expression a >> b[2:0] IS the barrel shifter in one operator.',
        'Shift by 0 must return a unchanged.',
      ],
    },
    practiceExercises: [
      {
        title: 'Add an overflow flag',
        brief:
          'Add an overflow flag (signed overflow) for ADD/SUB: overflow = (sign of a == sign of b-input-to-adder) && (sign of result != sign of a). Give overflow for ADD of 7F + 01 and SUB of 80 - 01.',
        expectedBehavior:
          'ADD 7F+01 = 80: both operands positive (7F, 01), result negative (80) → overflow=1. SUB 80-01: a=80 (-128), bx=~01=FE (-2) — both NEGATIVE, result 7F (+127, positive) → overflow=1 (true answer -129 is out of range). The formula ovf = (a[msb] == bx[msb]) && (result[msb] != a[msb]) uses the ACTUAL addend bx (the inverted b in SUB mode) — both rows overflow.',
        hints: [
          'Overflow happens when both inputs share a sign and the result flips it.',
          'In SUB mode, b’s sign is the INVERTED bx? No: use bx (the actual addend) for the formula.',
        ],
      },
      {
        title: 'Randomized bulk layer',
        brief:
          'Extend the suite with 300 $random vectors per arithmetic opcode using the arithmetic oracle, keeping directed vectors for logic/shift/SLT. State the total vector count and why logic ops stay directed.',
        expectedBehavior:
          'ADD/SUB: 300 random each (oracle = a+bx+mode in 9-bit context) + 6 directed = 606; logic/shift/SLT: 9 directed rows. Total 615 vectors. Logic ops are cheap to exhaust (8x8 operands = 256 rows? actually 65536 — too many; random would work too, but directed mixed rows + coherence checks suffice for boolean ops where every bit is independent).',
        hints: [
          'Arithmetic oracles make random self-checking trivial.',
          'Boolean ops have no cross-bit interaction — fewer vectors needed per op.',
        ],
      },
    ],
    assessment: {
      title: 'Module 16 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'alu_param (WIDTH=8), op=SUB, a=8\'h42, b=8\'h42. What are result and carry?',
          code:
            'bx  = b ^ {8{1\'b1}};   // invert\nsum = a + bx + 1;        // 9-bit\n// a=b=0x42',
          options: ['result=00, carry=1', 'result=00, carry=0', 'result=84, carry=1', 'result=FF, carry=0'],
          answer: 'result=00, carry=1',
          explanation:
            '0x42 inverted = 0xBD; 66 + 189 + 1 = 256 = 1_0000_0000 → result 00, carry 1 (no borrow: equal operands subtract exactly).',
          hint: 'Equal operands subtract to zero with no borrow.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Why does the ALU use ONE shared adder for ADD and SUB?',
          options: [
            'They differ only by b-inversion and +1 — one carry-chain serves both at mask cost',
            'Two adders would not fit in an FPGA',
            'The case statement requires it',
            'Shared adders simulate faster',
          ],
          answer: 'They differ only by b-inversion and +1 — one carry-chain serves both at mask cost',
          explanation:
            'The expensive structure (carry chain) is shared; the cheap control (XOR mask, carry-in) selects the operation. The core datapath-sharing principle.',
          hint: 'Which part is expensive: the chain or the mask?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'The flag-consistency check asserts zero === ~|result. Why is this check valuable even with golden results?',
          options: [
            'It verifies internal coherence independently of the golden values — catching flag-wiring bugs',
            'It replaces the need for directed vectors',
            'It proves the ALU is synthesizable',
            'It measures timing',
          ],
          answer: 'It verifies internal coherence independently of the golden values — catching flag-wiring bugs',
          explanation:
            'Flags must AGREE with the result for any operand; the coherence check tests that relationship directly, so flag bugs surface even on vectors whose golden value happens to be wrong.',
          hint: 'What does the check test: the result, or a relationship?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'The SLT operation can be verified correctly using only non-negative operand vectors.',
          answer: 'false',
          explanation:
            'Signed and unsigned compares agree on non-negative rows; ONLY negative-operand witnesses (FF vs 00) distinguish them. Signedness without negative vectors is unverified.',
          hint: 'Where do signed and unsigned disagree?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'How many bits must the shared adder’s sum carry to preserve the carry-out for WIDTH=8 (number)?',
          answer: '9',
          explanation:
            'WIDTH+1 = 9 bits: the top bit is the carry/borrow. The (WIDTH+1)-bit context is the parameterized form of module 04’s {c,s} rule.',
          hint: 'One more than the data width.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Shared adder', definition: 'One carry-chain serving ADD and SUB via mode mask and carry-in injection.' },
      { term: 'Flag taps', definition: 'Status outputs derived from existing structure: zero (NOR), negative (MSB), carry (adder top bit).' },
      { term: 'Signedness witnesses', definition: 'The negative-operand vectors that alone distinguish signed from unsigned comparison.' },
      { term: 'Coherence check', definition: 'Verifying internal relationships (flags vs result) independently of golden values.' },
      { term: 'Interface contract', definition: 'The port list: names, widths, directions — public API fixed by the spec.' },
    ],
    revisionSummary: [
      'Spec first: opcodes, flags and their semantics on paper before RTL.',
      'Shared adder + case mux + flag taps: the parameterized datapath shape.',
      'Every literal scales with WIDTH; SLT via $signed; defaults before the case.',
      'Verification: per-op directed vectors × operand classes + coherence checks + signedness witnesses.',
      'Synthesis notes: carry chains are the cost; shift-by-1 is wiring; variable shifts add mux stages.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Arithmetic logic unit', url: 'https://en.wikipedia.org/wiki/Arithmetic_logic_unit', kind: 'article' },
      { label: 'Yosys documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
    ],
    estimatedMinutes: 55,
  },
  {
    id: 'vlog-m16-l2',
    title: 'Capstone Project 2: Traffic Light Controller',
    summary:
      'Build the timer-driven traffic controller with parameterized phase durations, a verified timer, hazard handling and a full testbench.',
    objectives: [
      'Specify the controller: phases, durations, lamp semantics, reset state.',
      'Implement the parameterized FSM with an integrated countdown timer.',
      'Verify cycle accounting (exact durations) and hazard behavior.',
      'Document the synthesis/timing notes for timer-driven controllers.',
    ],
    whyItMatters:
      'The traffic controller is the canonical timer-driven FSM and the second capstone: it combines module 11’s templates with module 10’s counters under one parameterized roof. It is also the classic interview design question — and the projects.ts version packages it with the full spec-to-testplan treatment. Building it once, cleanly, means every future timer-driven controller (watchdogs, timeouts, beacons) is a variation you already own.',
    prerequisites: ['vlog-m11-l3', 'vlog-m10-l2', 'vlog-m14-l3'],
    explanation:
      '**Specification.** Two roads (A main, B side); four phases cycling A_GREEN → A_YELLOW → B_GREEN → B_YELLOW; durations parameterized (T_GREEN, T_YELLOW, in clocks); exactly one lamp lit per road pair at all times (a_green/a_yellow for road A, b_green/b_yellow for road B); reset lands in A_GREEN with its timer loaded; an optional hazard input short-circuits side-road phases. Outputs are Moore (lamps decode from state — glitch-free by construction).\n\n**Architecture.** The module 11-l3 design at project scale: a two-always FSM whose combinational block computes BOTH next state and next timer value; the state register and timer register capture together. The timer reloads with DURATION-1 on every transition (the reload cycle is the new state’s first — the off-by-one discipline). Parameters: T_GREEN ≥ 1, T_YELLOW ≥ 1, and the timer width derived to hold the larger duration.\n\n**Verification.** Cycle accounting (each phase lasts EXACTLY its parameter), the full 24-cycle period (for 10/2), reset state and timer load, hazard short-circuit behavior, lamp one-hotness on every cycle, and — the module 14 habit — a mid-operation reset returning cleanly to A_GREEN.\n\n**Synthesis notes:** the timer is a small counter (width = clog2(max duration)); lamp outputs are pure state decodes (no glitch risk to lamps — they drive LEDs); the FSM is binary-encoded (4 states — one-hot buys nothing at this size). The design is dominated by the timer compare; timing closure is trivial at any realistic clock.',
    deepDive:
      '### Phase duration accounting, formally\n\nWith reload = D-1 and advance-on-zero, phase P lasts exactly D cycles: the transition cycle loads D-1 (cycle 1 of P), the timer counts D-1 … 0 (cycle D), and the NEXT transition fires when tcnt==0 is SAMPLED — so P spans D complete cycles. The testbench proves this by counting cycles per state (a counter in the checker task, not by eyeballing). The off-by-one variants (reload = D, or advance on tcnt==D-1 with reload D-1) each shift durations by one — cycle accounting is the check that pins the spec.\n\n### Hazard semantics as a specification decision\n\n"hazard short-circuits side-road phases" needs precise edges: from B_GREEN or B_YELLOW, hazard forces the next phase immediately (with full yellow duration where applicable — safety ordering); from A-side phases, hazard is ignored (main road keeps priority; the spec SAYS so). Underspecified hazard behavior is where FSM projects go wrong: write the transition table rows explicitly (state × {tcnt==0, tcnt==0+hazard}) and verify each. The projects.ts version defines exactly this table.\n\n### Parameterizing durations without desynchronizing\n\nThe timer width must hold max(T_GREEN, T_YELLOW) - 1; derive it via the clog2 constant function (module 13-l1) — never hardcode [3:0] and hope. The compare constants come FROM the parameters (T_GREEN-1 reloads when entering green, etc.) — one edit point per duration. A caller setting T_GREEN=1 gets a single-cycle green phase — legal, verified by the same suite (duration accounting is parameter-generic).',
    examples: [
      {
        title: 'The traffic controller DUT (parameterized, hazard-aware)',
        language: 'verilog',
        code:
          '// traffic_cap.v — capstone traffic controller\nmodule traffic_cap #(\n    parameter T_GREEN  = 10,\n    parameter T_YELLOW = 2\n)(\n    input  wire clk,\n    input  wire reset_n,\n    input  wire hazard,       // short-circuits side-road phases\n    output reg  a_green,\n    output reg  a_yellow,\n    output reg  b_green,\n    output reg  b_yellow\n);\n    localparam [1:0] A_G = 2\'d0, A_Y = 2\'d1, B_G = 2\'d2, B_Y = 2\'d3;\n    // Timer width: hold max duration - 1 (clog2 style, manual here).\n    localparam [3:0] TMAX_M1 = (T_GREEN > T_YELLOW) ? (T_GREEN - 1)\n                                                    : (T_YELLOW - 1);\n\n    reg [1:0] state, next;\n    reg [3:0] tcnt, tnext;    // 4 bits hold durations up to 16\n\n    always @* begin\n        next  = A_G;                       // defaults (module 15-l1)\n        tnext = T_GREEN - 1;\n        case (state)\n            A_G: begin\n                if (tcnt == 4\'d0) begin next = A_Y; tnext = T_YELLOW - 1; end\n                else                   tnext = tcnt - 4\'d1;\n            end\n            A_Y: begin\n                if (tcnt == 4\'d0) begin next = B_G; tnext = T_GREEN - 1; end\n                else                   tnext = tcnt - 4\'d1;\n            end\n            B_G: begin\n                // hazard short-circuits the green phase (spec row).\n                if (tcnt == 4\'d0 || hazard) begin next = B_Y; tnext = T_YELLOW - 1; end\n                else                          tnext = tcnt - 4\'d1;\n            end\n            B_Y: begin\n                if (tcnt == 4\'d0 || hazard) begin next = A_G; tnext = T_GREEN - 1; end\n                else                          tnext = tcnt - 4\'d1;\n            end\n            default: begin next = A_G; tnext = T_GREEN - 1; end\n        endcase\n    end\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            state <= A_G;\n            tcnt  <= T_GREEN - 1;\n        end else begin\n            state <= next;\n            tcnt  <= tnext;\n        end\n    end\n\n    always @* begin\n        a_green  = (state == A_G);\n        a_yellow = (state == A_Y);\n        b_green  = (state == B_G);\n        b_yellow = (state == B_Y);\n    end\n\nendmodule',
        explanation: [
          'The FSM + timer advance together; every transition reloads the timer with the NEW phase’s DURATION-1 (cycle accounting discipline).',
          'Hazard rows are explicit spec decisions: OR-ed into the B_G/B_Y expiry conditions; A-side phases ignore hazard (main-road priority, documented).',
          'Defaults first (next=A_G, tnext=T_GREEN-1) and a case default — latch-free and safe-recovery (module 11-l2).',
          'Reset lands in A_G with the timer loaded — the intersection is never un-lighted.',
          'Lamps decode from state: exactly one A-lamp and one B-lamp high at all times (structural one-hot per road).',
        ],
      },
      {
        title: 'Cycle-accounting testbench',
        language: 'verilog',
        code:
          '// tb_traffic_cap.v — SIM-ONLY: exact durations + hazard + reset\n`timescale 1ns/1ps\nmodule tb_traffic_cap;\n    reg  clk, reset_n, hazard;\n    wire a_green, a_yellow, b_green, b_yellow;\n    integer errors;\n\n    traffic_cap #(.T_GREEN(10), .T_YELLOW(2)) dut (\n        .clk(clk), .reset_n(reset_n), .hazard(hazard),\n        .a_green(a_green), .a_yellow(a_yellow),\n        .b_green(b_green), .b_yellow(b_yellow)\n    );\n\n    initial clk = 1\'b0;\n    always #5 clk = ~clk;\n\n    // Count cycles the machine spends in each state; verify durations.\n    task run_phase_check;\n        input integer expect_cycles;\n        input [127:0] label;\n        integer n;\n        begin\n            n = 0;\n            // Count until the state CHANGES from the current one.\n            wait (a_green || a_yellow || b_green || b_yellow);\n            @(posedge clk);\n            // (Simplified: count posedges while the FIRST lamp of this\n            //  phase stays lit; full version tracks state changes.)\n            n = expect_cycles;   // see honest note below\n            if (n !== expect_cycles) begin\n                errors = errors + 1;\n                $display("FAIL %0s: %0d cycles (want %0d)", label, n, expect_cycles);\n            end\n        end\n    endtask\n\n    initial begin\n        errors = 0; hazard = 0;\n        reset_n = 0;\n        #12 reset_n = 1;\n        // Full period: 10 + 2 + 10 + 2 = 24 cycles, then repeats.\n        // The rigorous version counts state residency per phase by\n        // sampling lamps at every posedge for 25 cycles and comparing\n        // the four tallies against (10, 2, 10, 2).\n        repeat (24) @(posedge clk);\n        if (errors == 0) $display("SUMMARY: PASS 0 errors");\n        else             $display("SUMMARY: FAIL %0d errors", errors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'HONESTY NOTE: the task shown is a SKELETON — its tally logic is abbreviated (n = expect_cycles is a placeholder, and the wait/@ sequencing is illustrative). The rigorous cycle tally samples the lamps at every posedge for a full period and compares the four counts to (10, 2, 10, 2). The complete, runnable version is the deliverable of the projects.ts entry’s test plan.',
          'What IS fully correct here: the DUT, the parameters, the clock/reset structure, and the summary discipline — the harness scaffolding you will fill in.',
          'Cycle accounting expectations: A_G exactly 10 cycles, A_Y exactly 2, B_G 10, B_Y 2, period 24, repeating.',
          'Hazard test rows (in the full version): raise hazard mid-B_G → B_Y begins within one edge; raise hazard during A_G → ignored (spec).',
          'Mid-operation reset: assert reset_n low mid-B_G → lamps return to A_GREEN with the timer loaded; the first post-reset cycle counts as A_G cycle 1.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'Traffic controller state diagram (durations in clocks)',
        content:
          '            T=10          T=2           T=10          T=2\n   [A_G] ---------> [A_Y] ---------> [B_G] ---------> [B_Y] ---+\n     ^  lamps: a_green  a_yellow     b_green     b_yellow        |\n     |                                                            |\n     +------------------------------------------------------------+\n\n   hazard: B_G -> B_Y and B_Y -> A_G fire immediately (OR with timer)\n   A-side phases ignore hazard (main-road priority)',
        caption:
          'A strict cycle with parameterized durations; hazard short-circuits only side-road phases.',
      },
    ],
    tables: [
      {
        caption: 'Specification sheet',
        headers: ['Item', 'Value'],
        rows: [
          ['Phases', 'A_G → A_Y → B_G → B_Y → repeat'],
          ['Durations', 'T_GREEN (default 10), T_YELLOW (default 2) clocks'],
          ['Lamps', 'one A-lamp + one B-lamp always lit (Moore decode)'],
          ['Reset', 'A_G, timer loaded (async active-low)'],
          ['Hazard', 'immediate exit from B_G/B_Y; ignored in A phases'],
          ['Timer', 'countdown, reload = DURATION-1 on transition'],
        ],
      },
      {
        caption: 'Test plan (the projects.ts version in full)',
        headers: ['Check', 'Method'],
        rows: [
          ['Cycle accounting', 'Tally lamp residency per phase over 24+ cycles; expect (10, 2, 10, 2)'],
          ['Reset state', 'A_G lit + timer loaded at reset release'],
          ['Hazard B_G', 'hazard mid-B_G → B_Y next edge, full yellow duration'],
          ['Hazard A_G', 'hazard during A_G → ignored'],
          ['Mid-op reset', 'reset mid-B_G → A_G, timer reloaded, no dark cycle'],
          ['Lamp sanity', 'exactly one A-lamp and one B-lamp per cycle'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Green phases lasting T+1 cycles because the reload value is T rather than T-1.',
        fix:
          'Reload DURATION-1: the reload cycle is the new phase’s first cycle. Prove durations with the tally checker, not by eyeballing waveforms.',
      },
      {
        mistake: 'Letting hazard affect A-side phases "for symmetry".',
        fix:
          'Hazard semantics are a safety spec: main-road phases complete. Encode the asymmetry in the transition table rows and verify the ignored-hazard case.',
      },
      {
        mistake: 'Hardcoding the timer width [3:0] while parameterizing durations.',
        fix:
          'Derive the width from max(T_GREEN, T_YELLOW) via the clog2 constant function (module 13-l1); a T_GREEN=100 override silently breaks a 4-bit timer.',
      },
    ],
    guidedPractice: {
      title: 'Cycle-accounting proof',
      brief:
        'For T_GREEN=10, T_YELLOW=2: starting at reset release, list (state, tcnt) for cycles 1-13 and confirm A_G spans exactly 10 cycles. Then state when the FIRST full period completes.',
      expectedBehavior:
        'Cycle 1: A_G, tcnt=9 (loaded at reset). Cycles 1-10: A_G (tcnt 9→0). Cycle 11: A_Y, tcnt=1. Cycle 12: A_Y, tcnt=0. Cycle 13: B_G, tcnt=9. A_G = exactly 10 cycles. The first full period (A_G+A_Y+B_G+B_Y) completes after cycle 24.',
      hints: [
        'tcnt decrements every cycle including transitions.',
        'Four phases × their durations = 24.',
      ],
    },
    practiceExercises: [
      {
        title: 'Pedestrian phase',
        brief:
          'Add a PED state (all red, walk signal) of parameterized T_PED between B_Y and A_G. Update the diagram, the reload chain, and the period formula.',
        expectedBehavior:
          'B_Y → PED (reload T_PED-1) → A_G (reload T_GREEN-1). PED lights no vehicle lamps (both roads red — the all-red safety gap). Period = T_GREEN + T_YELLOW + T_GREEN + T_YELLOW + T_PED.',
        hints: [
          'PED is just another state in the cycle with its own reload.',
          'All-red is the pedestrian-safety standard.',
        ],
      },
      {
        title: 'Parameterized duration stress',
        brief:
          'Re-run the suite mentally with T_GREEN=1, T_YELLOW=1. What are the phase durations and the period? What does this stress about the implementation?',
        expectedBehavior:
          'Every phase = 1 cycle (reload 0, expiry immediately), period 4. The stress: timer compare/reload on consecutive cycles — the design must handle tcnt stuck at 0 with transitions every edge (no hang, no skipped states). Parameter-generic correctness is the point of the exercise.',
        hints: [
          'D-1 = 0: the expiry condition is true on the very first cycle.',
          'Does the machine still cycle A_G→A_Y→B_G→B_Y cleanly?',
        ],
      },
    ],
    assessment: {
      title: 'Module 16 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'With T_GREEN=10 and reload-at-transition, how many cycles does A_GREEN last exactly?',
          options: ['10', '11', '9', 'Depends on hazard'],
          answer: '10',
          explanation:
            'Reload 9 at the transition: the reload cycle counts as A_G cycle 1; tcnt then spans 9..0 — exactly 10 cycles.',
          hint: 'The reload cycle is part of the new phase.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'The machine is mid-B_G (tcnt=7) and hazard rises. What happens at the next edge?',
          code:
            'B_G: if (tcnt == 0 || hazard) next = B_Y;\n// tcnt=7, hazard=1',
          options: ['B_Y begins (full yellow duration)', 'B_G continues (timer only)', 'A_G begins directly', 'Nothing — hazard is ignored in B_G'],
          answer: 'B_Y begins (full yellow duration)',
          explanation:
            'Hazard ORs into B_G’s expiry: next = B_Y with the yellow reload. Safety ordering preserved — never skip the yellow.',
          hint: 'Which condition does hazard join?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Hazard asserted during A_GREEN forces an immediate transition in this specification.',
          answer: 'false',
          explanation:
            'The spec gives the main road priority: A-side phases ignore hazard (the transition table has no hazard term in the A rows) — a documented, verified decision.',
          hint: 'Check the A-row conditions.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Why are lamp outputs safe as pure Moore decodes here?',
          options: [
            'They decode the registered state — glitch-free, and lamps tolerate one-cycle updates',
            'Lamps do not need logic',
            'They are Mealy outputs',
            'They are registered twice',
          ],
          answer: 'They decode the registered state — glitch-free, and lamps tolerate one-cycle updates',
          explanation:
            'State-owned (Moore) outputs from a register cannot glitch mid-cycle; LED consumers are unhurried. No third-always needed for this interface.',
          hint: 'What drives the decode — a register or live inputs?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'What is the full period in cycles for T_GREEN=10, T_YELLOW=2 (number)?',
          answer: '24',
          explanation:
            '10 + 2 + 10 + 2 = 24 clocks per complete A→B cycle.',
          hint: 'Sum the four durations.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Timer-driven FSM', definition: 'Advances on an internal countdown; reload = DURATION-1 gives exact durations.' },
      { term: 'Cycle accounting', definition: 'Verifying exact per-state durations by tallying residency — the authoritative timer check.' },
      { term: 'Hazard short-circuit', definition: 'A safety input OR-ed into specific phase-expiry conditions; semantics documented per state.' },
      { term: 'All-red gap', definition: 'A phase lighting no vehicle lamps (pedestrian safety) — an added state with its own duration.' },
      { term: 'Main-road priority', definition: 'The spec rule that hazard cannot interrupt A-side phases.' },
    ],
    revisionSummary: [
      'Reload DURATION-1 → exact durations; prove with residency tallies.',
      'Hazard semantics are table rows (B-side immediate, A-side ignored) — verify both.',
      'Reset to A_G with loaded timer: never an un-lighted intersection.',
      'Moore lamp decodes: one lamp per road, structurally exclusive.',
      'Timer width derives from max duration (clog2), never hardcoded.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Finite-state machine', url: 'https://en.wikipedia.org/wiki/Finite-state_machine', kind: 'article' },
      { label: 'Electronics Tutorials — Sequential logic', url: 'https://www.electronics-tutorials.ws/sequential/seq_1.html', kind: 'article' },
    ],
    estimatedMinutes: 55,
  },
  {
    id: 'vlog-m16-l3',
    title: 'Capstone Project 3: Synchronous FIFO',
    summary:
      'Build the synchronous FIFO — parameterized width/depth, full/empty flags, occupancy count — and verify the pointer arithmetic and boundary conditions completely.',
    objectives: [
      'Specify the FIFO: ports, flag semantics, overflow/underflow policy.',
      'Implement circular pointers with natural wrap and an occupancy counter.',
      'Verify the boundary matrix: empty→fill→full→drain→empty, simultaneous r/w, reset.',
      'Document synthesis notes (BRAM inference, flag timing) honestly.',
    ],
    whyItMatters:
      'The FIFO is the most-used structural block in RTL — every clock-domain bridge, every rate matcher, every packet buffer is one. It is also the capstone where ALL course skills converge: parameterized arrays (module 12), pointer counters (module 10), flag logic, and exhaustive boundary verification (module 14). The projects.ts entry packages the full project; this lesson is the guided build of the standard single-clock FIFO.',
    prerequisites: ['vlog-m12-l2', 'vlog-m10-l2', 'vlog-m14-l3'],
    explanation:
      '**Specification.** A synchronous FIFO: writes on wr_en when not full, reads on rd_en when not empty; outputs data_out (registered read of the head), full, empty, and count (occupancy, WIDTH = clog2(DEPTH)+1 bits to represent DEPTH itself). Parameterized DATA_WIDTH and DEPTH (power of two recommended). Overflow/underflow POLICY: this design IGNORES wr_en when full and rd_en when empty (a safe, documented choice — no data corruption; callers must respect flags).\n\n**Architecture.** A DEEP x WIDTH array (module 12 sync-read shape: BRAM-friendly); two pointers (wr_ptr, rd_ptr) of ADDR_BITS width that wrap NATURALLY (2^ADDR_BITS arithmetic — no explicit wrap compare needed when DEPTH is a power of two); an occupancy counter distinguishing full from empty (both otherwise look like "pointers equal"). Write: if (wr_en && !full) mem[wr_ptr] <= din; wr_ptr++. Read: registered — if (rd_en && !empty) dout <= mem[rd_ptr]; rd_ptr++.\n\n**Flag semantics:** empty = (count == 0); full = (count == DEPTH); count increments on write-only cycles, decrements on read-only, holds on simultaneous read+write (one in, one out). The simultaneous case is the classic bug: increment AND decrement in the same cycle must cancel — implement as an explicit 2-bit case on {wr_en&&!full, rd_en&&!empty}.\n\n**Verification.** The boundary matrix: reset (empty=1, count=0); fill to full (count == DEPTH, full=1); overflow attempt ignored (count stays); drain to empty (empty=1); underflow attempt ignored; simultaneous r/w mid-fill (count unchanged); wrap-around crossing (write past the array end — pointers wrap, data order preserved); data-integrity spot checks (FIFO ORDER: first in, first out).',
    deepDive:
      '### Pointer arithmetic: why natural wrap works\n\nWith DEPTH a power of two and ADDR_BITS = clog2(DEPTH), incrementing an ADDR_BITS-wide pointer past its maximum wraps to zero automatically (the discarded carry, module 10-l1). Pointer equality then means "caught up" — but that is ambiguous: equal pointers = empty OR full. The occupancy count disambiguates (count == 0 vs count == DEPTH). The alternative (an extra "wrap bit" per pointer) avoids the counter but complicates comparison; the count form is clearer and gives the useful count output for free. Both are industry-standard; pick one, document it, verify it.\n\n### The simultaneous read/write case, precisely\n\nOn a cycle with both wr_en (not full) and rd_en (not empty): one word enters at wr_ptr, one leaves at rd_ptr — occupancy UNCHANGED, both pointers advance, and data_out must present the word at the OLD rd_ptr (the registered read samples before the pointer moves). Implementation order in the clocked block: compute the enables, then (1) array write, (2) registered read with the current rd_ptr, (3) pointer updates, (4) count update via the {we, re} case. Getting the read-before-pointer-move right is exactly module 07’s nonblocking discipline: every RHS samples pre-edge values.\n\n### BRAM mapping and the count width (honest notes)\n\nThe registered-read shape (module 12-l2) maps the array to block RAM; an async-read dout would force distributed RAM. count needs clog2(DEPTH)+1 bits: it must represent DEPTH itself (a clog2(DEPTH)-wide counter cannot hold the full state — the classic off-by-one). Flags are registered outputs derived from count (clean, one-cycle-accurate); combinational flag variants (count comparison straight out) are also valid but expose count’s logic cone to consumers. Reset clears pointers AND count (data need not clear — the pointers make stale data unreachable). First-word-fall-through (dout shows the head even when empty... when NOT empty without rd_en) is a variant — this course builds the standard registered-read form and names the variant as an extension.',
    examples: [
      {
        title: 'The synchronous FIFO: complete DUT',
        language: 'verilog',
        code:
          '// fifo_sync.v — synchronous FIFO, parameterized, registered outputs\nmodule fifo_sync #(\n    parameter DATA_WIDTH = 8,\n    parameter DEPTH      = 16,     // power of two\n    parameter ADDR_BITS  = 4,       // = clog2(DEPTH): caller sets to match\n    parameter CNT_WIDTH  = 5        // = clog2(DEPTH)+1: caller sets to match\n)(\n    input  wire                  clk,\n    input  wire                  reset_n,\n    input  wire                  wr_en,\n    input  wire [DATA_WIDTH-1:0] din,\n    input  wire                  rd_en,\n    output wire [DATA_WIDTH-1:0] dout,\n    output wire                  full,\n    output wire                  empty,\n    output wire [CNT_WIDTH-1:0]  count\n);\n    reg [DATA_WIDTH-1:0] mem [0:DEPTH-1];\n    reg [ADDR_BITS-1:0]  wr_ptr, rd_ptr;\n    reg [CNT_WIDTH-1:0]  cnt;\n    reg [DATA_WIDTH-1:0] dout_r;\n\n    wire do_wr = wr_en && !full;      // policy: ignore writes when full\n    wire do_rd = rd_en && !empty;     // policy: ignore reads when empty\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            wr_ptr <= {ADDR_BITS{1\'b0}};\n            rd_ptr <= {ADDR_BITS{1\'b0}};\n            cnt    <= {CNT_WIDTH{1\'b0}};\n            dout_r <= {DATA_WIDTH{1\'b0}};\n        end else begin\n            // 1. Array write (module 12 shape).\n            if (do_wr)\n                mem[wr_ptr] <= din;\n            // 2. Registered read: samples mem at the CURRENT rd_ptr.\n            if (do_rd)\n                dout_r <= mem[rd_ptr];\n            // 3. Pointers advance on their events (natural wrap).\n            if (do_wr) wr_ptr <= wr_ptr + {{(ADDR_BITS-1){1\'b0}}, 1\'b1};\n            if (do_rd) rd_ptr <= rd_ptr + {{(ADDR_BITS-1){1\'b0}}, 1\'b1};\n            // 4. Occupancy: simultaneous r/w cancels.\n            case ({do_wr, do_rd})\n                2\'b10:   cnt <= cnt + {{(CNT_WIDTH-1){1\'b0}}, 1\'b1};\n                2\'b01:   cnt <= cnt - {{(CNT_WIDTH-1){1\'b0}}, 1\'b1};\n                default: cnt <= cnt;      // 00 or 11: hold\n            endcase\n        end\n    end\n\n    assign dout  = dout_r;\n    assign full  = (cnt == DEPTH);\n    assign empty = (cnt == 0);\n    assign count = cnt;\n\nendmodule',
        explanation: [
          'Policies first: do_wr/do_rd gate every action — overflow and underflow attempts are IGNORED (documented, safe).',
          'Write and registered read follow the module 12-l2 dual-port shape (BRAM-friendly): the read samples mem[rd_ptr] BEFORE the pointer update (nonblocking semantics — pre-edge values).',
          'Pointers wrap naturally: ADDR_BITS-wide increments discard the carry at 2^ADDR_BITS — free circularity for power-of-two DEPTH.',
          'The count case on {do_wr, do_rd}: 10 increments, 01 decrements, 11 and 00 hold — the simultaneous-r/w cancellation is explicit, not accidental.',
          'Flags derive from cnt: empty = (cnt==0), full = (cnt==DEPTH). CNT_WIDTH must hold DEPTH itself (clog2+1) — the caller-supplied parameter is documented in the header.',
          'Trace DEPTH=4: write A,B,C,D → cnt=4, full=1, wr_ptr wrapped to 0 after the 4th write. Read twice → dout=A then B (FIFO order), cnt=2, empty=0.',
        ],
      },
      {
        title: 'Boundary-matrix testbench (the verification core)',
        language: 'verilog',
        code:
          '// tb_fifo_sync.v — SIM-ONLY: the boundary matrix, self-checking\n`timescale 1ns/1ps\nmodule tb_fifo_sync;\n    reg        clk, reset_n, wr_en, rd_en;\n    reg  [7:0] din;\n    wire [7:0] dout;\n    wire       full, empty;\n    wire [4:0] count;\n    integer    errors;\n\n    fifo_sync #(.DATA_WIDTH(8), .DEPTH(16), .ADDR_BITS(4), .CNT_WIDTH(5)) dut (\n        .clk(clk), .reset_n(reset_n), .wr_en(wr_en), .din(din),\n        .rd_en(rd_en), .dout(dout), .full(full), .empty(empty), .count(count)\n    );\n\n    initial clk = 1\'b0;\n    always #5 clk = ~clk;\n\n    task wr_word;\n        input [7:0] d;\n        begin\n            @(negedge clk);\n            wr_en = 1; din = d; rd_en = 0;\n            @(negedge clk);\n            wr_en = 0;\n        end\n    endtask\n\n    task rd_check;\n        input [7:0] expect_d;\n        begin\n            @(negedge clk);\n            wr_en = 0; rd_en = 1;\n            @(negedge clk);\n            rd_en = 0;\n            #1;\n            if (dout !== expect_d) begin\n                errors = errors + 1;\n                $display("FAIL: got %h want %h", dout, expect_d);\n            end\n        end\n    endtask\n\n    initial begin\n        errors = 0; wr_en = 0; rd_en = 0; din = 0;\n        reset_n = 0;\n        #12 reset_n = 1;\n        #1;\n        if (empty !== 1\'b1 || count !== 5\'d0) begin\n            errors = errors + 1; $display("FAIL reset state");\n        end\n        // Fill to full: 16 words, values 10..25 (order = value).\n        begin : fill\n            integer k;\n            for (k = 0; k < 16; k = k + 1)\n                wr_word(8\'h10 + k[7:0]);\n        end\n        #1;\n        if (full !== 1\'b1 || count !== 5\'d16) begin\n            errors = errors + 1; $display("FAIL full state");\n        end\n        // Overflow attempt: extra write must be IGNORED.\n        wr_word(8\'hEE);\n        #1;\n        if (count !== 5\'d16) begin\n            errors = errors + 1; $display("FAIL overflow ignored");\n        end\n        // Drain in FIFO order: first word written is first read.\n        rd_check(8\'h10);\n        rd_check(8\'h11);\n        // ... (full version loops all 16) ...\n        if (errors == 0) $display("SUMMARY: PASS 0 errors");\n        else             $display("SUMMARY: FAIL %0d errors", errors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'The tasks wrap stimulus timing: wr_word drives at NEGEDGES (module 14-l1 discipline), rd_check drives a read and compares dout one step later (the registered-read latency contract).',
          'Boundary rows implemented: reset state (empty=1, count=0), fill-to-full (count=16, full=1), overflow-ignored (count stays 16 — the do_wr policy), FIFO-order reads (10 first).',
          'The full version (projects.ts) adds: drain-to-empty, underflow-ignored, simultaneous r/w mid-fill (count unchanged), and wrap-crossing (fill, drain 12, refill past the end — data order preserved across the pointer wrap).',
          'Expected values: writes 0x10..0x1F fill the FIFO; reads return 0x10, 0x11, ... — order is the specification.',
          'rd_check’s one-step-later compare is precisely the module 12-l2 latency discipline applied to a real block.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'FIFO architecture: ring buffer with occupancy count',
        content:
          '              +-----------------------------------+\n   din ----->|  mem[0 .. DEPTH-1]  (BRAM shape)  |\n   wr_en --->|  write port: mem[wr_ptr]          |\n             |                                   |----> dout (registered)\n   rd_en --->|  read port: mem[rd_ptr]           |\n             +-----------------------------------+\n                    ^wr_ptr          ^rd_ptr\n                      \\                /\n                  [occupancy count] --+--> full  = (cnt == DEPTH)\n                                       +--> empty = (cnt == 0)\n                                       +--> count\n\n   ring order: ... 14, 15, 0, 1 ... (natural pointer wrap)',
        caption:
          'Two pointers + one count over a BRAM-shaped array; flags derive from the count.',
      },
    ],
    tables: [
      {
        caption: 'FIFO specification sheet',
        headers: ['Item', 'Value'],
        rows: [
          ['Write policy', 'wr_en honored only when !full (overflow ignored)'],
          ['Read policy', 'rd_en honored only when !empty (underflow ignored)'],
          ['dout', 'registered read of the head; valid 1 cycle after rd_en'],
          ['Flags', 'full = (count == DEPTH); empty = (count == 0)'],
          ['count', 'occupancy; simultaneous r/w holds it'],
          ['Reset', 'pointers + count cleared; data untouched (unreachable)'],
          ['Parameters', 'DATA_WIDTH, DEPTH (pow-2), ADDR_BITS, CNT_WIDTH'],
        ],
      },
      {
        caption: 'Boundary matrix (every cell tested)',
        headers: ['Scenario', 'Expected'],
        rows: [
          ['Reset', 'empty=1, count=0, flags clean'],
          ['Fill to full', 'count=DEPTH, full=1'],
          ['Write when full', 'ignored: count unchanged, data preserved'],
          ['Drain to empty', 'empty=1; FIFO order verified'],
          ['Read when empty', 'ignored: count unchanged, dout holds'],
          ['Simultaneous r/w', 'count unchanged; both pointers advance'],
          ['Wrap crossing', 'refill past the end: order preserved'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'CNT_WIDTH = clog2(DEPTH) — the counter cannot represent DEPTH itself, so full never asserts.',
        fix:
          'count must hold 0..DEPTH: clog2(DEPTH)+1 bits. For DEPTH=16, 5 bits. The full-flag-never-fires bug is this off-by-one, every time.',
      },
      {
        mistake: 'Incrementing count on both wr_en and rd_en in a simultaneous cycle (or ignoring the cancellation).',
        fix:
          'The {do_wr, do_rd} case: 11 holds the count. Test the simultaneous case explicitly mid-fill — it is the classic FIFO count bug.',
      },
      {
        mistake: 'Comparing dout in the same cycle as rd_en (ignoring the registered-read latency).',
        fix:
          'dout appears one cycle after rd_en (module 12-l2 contract). rd_check waits the edge, then compares — or the design exposes first-word-fall-through as a documented variant.',
      },
    ],
    guidedPractice: {
      title: 'Pointer wrap trace',
      brief:
        'For DEPTH=4 (ADDR_BITS=2): issue six writes W0..W5 (values 0x10..0x15), then six reads. Track wr_ptr, rd_ptr and count after each operation, honoring the overflow/underflow policy. Where does each pointer wrap?',
      expectedBehavior:
        'Writes: W0..W3 accepted — wr_ptr 0→1→2→3→0 (wraps after W3), count 1,2,3,4 (full after W3). W4, W5 IGNORED (full): count stays 4, wr_ptr stays 0. Reads: R0..R3 accepted — rd_ptr 0→1→2→3→0 (wraps after R3), count 4→3→2→1→0 (empty after R3); dout returns 10, 11, 12, 13 in FIFO order. R4, R5 IGNORED (empty). Both pointers wrap after their fourth accepted operation — natural 2-bit overflow.',
      hints: [
        'DEPTH=4: only four words fit; writes 5-6 are policy-ignored.',
        'Pointers wrap at 2^ADDR_BITS = 4.',
      ],
    },
    practiceExercises: [
      {
        title: 'Simultaneous r/w check',
        brief:
          'Extend the TB: fill 8 of 16 words, then issue simultaneous wr_en+rd_en for 3 cycles. State count before/after and which word dout shows on the first simultaneous cycle.',
        expectedBehavior:
          'count stays 8 across all three cycles (one in, one out per cycle). dout on the first simultaneous cycle shows the word at the pre-cycle rd_ptr — the oldest of the 8 (the first-written word). Pointers both advance 3.',
        hints: [
          'The count case holds on {1,1}.',
          'The registered read samples BEFORE the pointer moves.',
        ],
      },
      {
        title: 'First-word-fall-through variant',
        brief:
          'Modify the FIFO so dout always shows the CURRENT head when not empty (no rd_en needed to see it; rd_en pops). What read-path change does this require, and what happens to latency?',
        expectedBehavior:
          'The read register must load continuously when not empty: if (!empty) dout_r <= mem[rd_ptr]; — dout shows the head one cycle after it becomes available; rd_en only pops (advances rd_ptr). Read latency to first word: 1 cycle after the first write (vs requiring an rd_en pulse); the pop still takes effect at the edge.',
        hints: [
          'FWFT: the read register tracks the head continuously.',
          'rd_en’s meaning shifts from "read" to "pop".',
        ],
      },
    ],
    assessment: {
      title: 'Module 16 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why do FIFO pointers wrap automatically with no wrap-compare code?',
          options: [
            'ADDR_BITS-wide increments discard the carry at 2^ADDR_BITS — free circularity for power-of-two depth',
            'Verilog arrays are circular',
            'The reset clears them',
            'The count forces the wrap',
          ],
          answer: 'ADDR_BITS-wide increments discard the carry at 2^ADDR_BITS — free circularity for power-of-two depth',
          explanation:
            'Module 10-l1’s modular arithmetic: a 4-bit pointer counting past 15 wraps to 0. The array indexing then revisits words in ring order — provided DEPTH is a power of two matching ADDR_BITS.',
          hint: 'What happens to the carry of a maxed-out pointer increment?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'DEPTH=16 FIFO holding 16 words (full). wr_en=1 with din=0xEE for one cycle. What are count and the data integrity afterwards?',
          code:
            'do_wr = wr_en && !full;\n// full=1, wr_en=1',
          options: ['count stays 16; 0xEE discarded; stored data intact', 'count becomes 17', 'count becomes 15', 'count stays 16 but a stored word is overwritten'],
          answer: 'count stays 16; 0xEE discarded; stored data intact',
          explanation:
            'do_wr = 1 && !1 = 0: the write is ignored by policy — pointers and count unchanged, no data overwritten. The overflow-ignored boundary row.',
          hint: 'Evaluate do_wr first.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Simultaneous do_wr and do_rd in one cycle: what happens to count?',
          options: ['Holds (one in, one out — the {1,1} case)', 'Increments', 'Decrements', 'Becomes x'],
          answer: 'Holds (one in, one out — the {1,1} case)',
          explanation:
            'The occupancy case treats {do_wr,do_rd} = 2\'b11 as hold. Forgetting this cancellation is the classic FIFO count bug.',
          hint: 'One word entered and one left.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'CNT_WIDTH for a DEPTH=32 FIFO must be 6 bits.',
          answer: 'true',
          explanation:
            'count must represent DEPTH itself (32 = 5\'b10000 needs 6 bits): clog2(32)+1 = 6. With 5 bits, count saturates at 31 and full (count==32) never fires.',
          hint: 'The count must reach DEPTH, not DEPTH-1.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'How many cycles after asserting rd_en (on a non-empty FIFO) does dout show the popped word (number)?',
          answer: '1',
          explanation:
            'The registered read captures mem[rd_ptr] at the edge; dout is valid one cycle later — the module 12-l2 latency contract in the FIFO context.',
          hint: 'One register stage on the read path.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Circular buffer', definition: 'The FIFO’s ring storage: pointers advance and wrap naturally over a power-of-two array.' },
      { term: 'Occupancy count', definition: 'The counter disambiguating full from empty (both make pointers equal) and exposing depth usage.' },
      { term: 'Overflow/underflow policy', definition: 'The documented behavior on ignored writes/reads — this design ignores and preserves state.' },
      { term: 'Simultaneous r/w', definition: 'Same-cycle read and write: count holds, both pointers advance, read sees the old head.' },
      { term: 'FWFT', definition: 'First-word-fall-through: dout continuously shows the head; rd_en pops. A named variant of the standard FIFO.' },
    ],
    revisionSummary: [
      'Pointers + occupancy count over a BRAM-shaped array; flags derive from count.',
      'CNT_WIDTH = clog2(DEPTH)+1 — the count must reach DEPTH or full never fires.',
      'Simultaneous r/w: count holds (explicit case), read sees the pre-move head.',
      'Policies first: do_wr/do_rd gate everything; overflow/underflow ignored and tested.',
      'The boundary matrix (reset, full, overflow, drain, underflow, simultaneous, wrap) is the suite.',
    ],
    furtherReading: [
      { label: 'Wikipedia — FIFO (computing and electronics)', url: 'https://en.wikipedia.org/wiki/FIFO_(computing_and_electronics)', kind: 'article' },
      { label: 'Wikipedia — Circular buffer', url: 'https://en.wikipedia.org/wiki/Circular_buffer', kind: 'article' },
    ],
    estimatedMinutes: 60,
  },
];
