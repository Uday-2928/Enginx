import type { TutorialLesson } from '../types';

/**
 * Module 10 — Synthesis Awareness.
 * What synthesis does with RTL (register/memory inference, operator mapping,
 * combinational optimization), FSM synthesis and re-encoding, the area /
 * timing / power levers, and the honest limits of RTL-time prediction.
 */

export const module10Lessons: TutorialLesson[] = [
  {
    id: 'rtl-m10-l1',
    title: 'What Synthesis Does With Your RTL',
    summary:
      'Synthesis translates RTL into a netlist of cells: registers from clocked processes, memories from array patterns, operators from library blocks, and free optimization across combinational clouds. Knowing the translation rules turns the tool from an oracle into a predictable compiler.',
    objectives: [
      'State the register inference rules: which process shapes become flip-flops, enables, sync and async resets.',
      'Recognize the memory-inference patterns (RAM, distributed RAM, ROM) and what breaks them into flip-flops.',
      'Describe how operators map to hardware (carry chains, DSP blocks) and how width drives cost.',
      'Explain combinational optimization (constant propagation, common subexpressions) and what it may change.',
    ],
    whyItMatters:
      'Every RTL designer works with a synthesis tool, but designers who know the inference rules write code the tool translates predictably — and recognize immediately when a tool result signals that the RTL said something unintended. The difference shows up as: registers that appear where none were intended (a accidental clocked process), memories that become 2048 flip-flops instead of one block RAM (a broken inference pattern), and multiplications that exhaust the DSP supply (a width decision made carelessly). Synthesis awareness is reading the tool\'s translation back into your source.',
    prerequisites: ['rtl-m03-l1', 'rtl-m04-l1', 'rtl-m03-l2'],
    explanation: [
      '**Register inference** follows from the process template directly. A process sensitive to `posedge clk` (with or without the async reset edge) infers flip-flops — one per bit assigned. The branch structure becomes the flip-flop\'s control pins: an `else if (en)` branch is an enable (a mux on D; the cell is a flip-flop-with-enable); `if (!reset_n)` inside the clocked body with a sync-style process is a synchronous reset (a mux on D); `negedge reset_n` in the sensitivity list with the reset-first body is an asynchronous reset (the dedicated clear/preset pin). The inference is exact — which is why module 03\'s template maps one-to-one onto real cells, and why a process that accidentally assigns a signal under `posedge clk` creates a register the designer never planned.',
      '**Memory inference** recognizes array patterns. The shape `reg [7:0] mem[0:255];` with a single synchronous write (`if (we) mem[addr] <= din;`) and a synchronous read (`rdata <= mem[raddr];` in a clocked process) is the textbook block-RAM pattern: tools map it to the FPGA\'s dedicated memory columns (or ASIC single-port RAM macros). Distributed RAM (LUT memory) typically comes from small arrays or read-asynchronous patterns (`assign rdata = mem[raddr];` with a clocked write). A ROM emerges from an array written only by constant initialization or a constant case. The inference is brittle by design: a second write port, a write-enable per byte done wrong, an reset on the memory array (block RAMs have no resettable contents!) — any of these silently converts the memory into discrete flip-flops, exploding area. The rule: write the canonical pattern for the memory you mean, and check the synthesis report\'s resource counts to confirm the inference happened.',
      '**Operator mapping** turns expressions into library structures. `a + b` becomes a carry-chain adder (roughly linear area and delay in width — module 08\'s worksheets); `a * b` maps to a dedicated multiplier — a DSP block on FPGAs (each usually 18x25 bits or similar; an 8x8 fits one DSP with room to spare, a 17x17 fills one) or an ASIC multiplier cell; comparisons become their own structures; constant shifts become wiring. Two consequences matter at RTL time: width drives cost (a 16x16 multiply is ~4x the area of an 8x8 — module 04\'s width laws are also resource laws), and operand shapes matter (a multiply by a constant 2^k is a shift — wiring — while a multiply by a variable needs the full block).',
      '**Combinational optimization** rewrites your clouds within their function: constant propagation folds signals that are provably fixed; common subexpression elimination shares the adder computed twice (the unpipelined macc in module 06 that evaluated `a*b+c` for both outputs gets one shared chain); dead-branch elimination removes logic no select can reach; and don\'t-care optimization exploits states or inputs that cannot occur (an FSM\'s illegal encodings give the tool freedom it uses to shrink next-state logic). The honest framing: the tool optimizes *within the function your RTL defines* — it will not add pipeline registers, share operators across mutually-exclusive events you did not structure, or fix an architecture. Everything structural is still yours; everything Boolean is the tool\'s.',
    ].join('\n\n'),
    deepDive: [
      'Why does memory inference break so easily? Because block RAM is a *fixed-function* cell: it supports specific port configurations (one or two ports, synchronous or one-async read, optional byte enables) and no reset of contents. The inference matcher requires your RTL to fit one of those shapes exactly — a read-during-write behavior the pattern does not specify, a per-bit reset, a third port — and the matcher falls back to flip-flops rather than change your semantics. This is one of the few places where writing "non-obvious" RTL is correct: the canonical block-RAM template with its no-reset array and matched port timing is a form the tool requires, and deviating from it silently costs thousands of flip-flops. The synthesis report\'s memory/RAM section is the confirmation step.',
      'Constant propagation has a verification subtlety worth naming: when a parameter or unused input makes part of a cloud constant, the tool deletes that logic — and the deleted logic no longer appears in timing or coverage. A design parameterized with WIDTH=8 will synthesize smaller and faster than WIDTH=32, and tests that passed at 8 say little about 32. This is the synthesis-side reason module 03\'s parameter discipline demands documented ranges and per-configuration testing: each configuration is a different netlist, and the tool\'s optimizations are per-netlist facts.',
      'What synthesis does NOT do is as important as what it does, because the boundary is exactly the designer\'s job description. It does not retime unless told (module 08\'s retiming note); it does not choose pipelining depth (module 06); it does not invent handshake protocols or reset strategies (modules 05 and 07); it shares operators only when your enable structure proves exclusivity (module 04 lesson 3). A useful mental model: synthesis is a *faithful, optimizing translator* from your structure to cells — every architectural property in the netlist was in the RTL, for better or worse.',
    ].join('\n\n'),
    examples: [
      {
        title: 'Three inference patterns and what they become',
        language: 'verilog',
        code: [
          '// (a) REGISTER with enable and async reset -> FF-with-enable cell.',
          'reg [7:0] acc_q;',
          'always @(posedge clk or negedge reset_n) begin',
          '    if (!reset_n)   acc_q <= 8\'d0;      // async clear pin',
          '    else if (en)    acc_q <= acc_q + din; // enable mux + adder on D',
          '    // else: hold (enable low)',
          'end',
          '// Netlist: 8 FF-with-enable + one 8-bit adder. Nothing else.',
          '',
          '// (b) BLOCK RAM pattern (canonical form - copy exactly).',
          'reg [7:0] mem [0:255];       // 256 x 8',
          'reg [7:0] rdata_q;',
          'always @(posedge clk) begin',
          '    if (we)                  // single synchronous write port',
          '        mem[waddr] <= din;   // NOTE: no reset of mem contents!',
          '    rdata_q <= mem[raddr];   // synchronous read port',
          'end',
          '// Netlist: one 256x8 block RAM (inference report confirms).',
          '// BREAKS (becomes 2048 FFs): reset on mem, a third port,',
          '// per-bit write masks done non-canonically, async write.',
          '',
          '// (c) ROM from a constant case.',
          'reg [7:0] lut;',
          'always @* begin',
          '    case (addr[1:0])',
          '        2\'d0:    lut = 8\'h0F;',
          '        2\'d1:    lut = 8\'h3C;',
          '        2\'d2:    lut = 8\'h55;',
          '        default: lut = 8\'hAA;',
          '    endcase',
          'end',
          '// Netlist: a small LUT structure (constants folded, no memory',
          '// needed at this size). Larger constant tables DO map to ROM.',
        ].join('\n'),
        explanation: [
          '(a) maps branch-by-branch: reset branch to the async clear pin, enable branch to the enable mux, the add to a carry chain. The inference is exact and checkable in the report\'s register count (8 FFs).',
          '(b) is the canonical block-RAM form: exactly one synchronous write port, one synchronous read port, no array reset. The comment marks the counter-intuitive part — the memory contents are NOT reset; spec your design so that does not matter (valid flags outside the array, or read-valid tracking).',
          '(b) also demonstrates the brittleness: add `if (!reset_n) mem[...]` or an async write and the tool falls back to flip-flops — the resource report (RAM: 1 vs Registers: +2048) is the tell.',
          '(c) shows small constant tables collapsing into logic: with only four constants, a LUT cloud is smaller than any ROM macro. Scale the table up (a 256-entry sine LUT) and the same pattern maps to ROM/block-RAM. The tool picks per size; the report tells you which.',
          'The verification habit all three share: read the synthesis report\'s resource summary and match it against expectation (registers, RAMs, DSPs, LUTs). Mismatches are inference failures — always semantic bugs in waiting.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The synthesis translation map',
        content: [
          '  RTL CONSTRUCT                  ->  NETLIST OBJECT',
          '  ---------------------------------------------------------',
          '  clocked process, N bits        ->  N flip-flops',
          '  + else-if (en) branch          ->  enable mux / FF-enable pin',
          '  + if (!reset_n) in clocked     ->  sync reset (D mux)',
          '  + negedge reset_n in list      ->  async clear pin',
          '  array + sync wr + sync rd      ->  block RAM',
          '  array + sync wr + async rd     ->  distributed RAM (LUTs)',
          '  constant table / case          ->  LUT cloud or ROM',
          '  a + b                          ->  carry-chain adder',
          '  a * b                          ->  DSP block / multiplier cell',
          '  a >> 2 (constant)              ->  wiring',
          '  a >> s (variable)              ->  barrel shifter (mux tree)',
          '  a == b / a > b                 ->  compare structure',
          '',
          '  THEN, within each cloud: constant folding, common-subexpression',
          '  sharing, dead-branch removal, don\'t-care optimization.',
        ].join('\n'),
        caption:
          'The inference rules are predictable: read your RTL structurally and you can name the cells before synthesis runs — and spot the constructs that will NOT map the way you intended.',
      },
    ],
    tables: [
      {
        caption: 'Register inference: branch shapes to pins',
        headers: ['RTL shape', 'Infers', 'Check in report'],
        rows: [
          ['always @(posedge clk), assign q in body', 'Flip-flops', 'Register count = assigned bits'],
          ['else if (en) branch', 'Enable (FF-enable cell or D mux)', 'Enable usage in register report'],
          ['if (!reset_n) inside clocked body (no list edge)', 'Synchronous reset', 'Reset exists as data mux'],
          ['negedge reset_n in sensitivity + reset branch', 'Asynchronous reset pin', 'Reset mapped to control pins'],
          ['Signal assigned under posedge accidentally', 'Unintended register', 'Unexpected register count — investigate'],
        ],
      },
      {
        caption: 'What breaks block-RAM inference',
        headers: ['Deviation', 'Result'],
        rows: [
          ['Reset of the array contents', 'Fallback to flip-flops (BRAM has no content reset)'],
          ['Third port / second write port', 'Fallback, or two RAMs if the pattern splits cleanly'],
          ['Asynchronous write', 'Fallback to registers/LUT memory'],
          ['Read-during-write semantics not matched to the cell', 'Fallback or behavior mismatch — check the report'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Adding a reset to a memory array "for consistency" with the rest of the design.',
        fix:
          'Block RAM contents cannot be reset — the inference falls back to thousands of flip-flops. Design around it: keep valid/empty tracking in registers outside the array, and initialize contents by writing (or accept X-init in simulation with documented first-read semantics).',
      },
      {
        mistake: 'Assuming the tool will fix structure: "synthesis will pipeline it / share it / balance it".',
        fix:
          'Synthesis optimizes within your structure; it does not add pipeline registers, choose sharing across events you did not structure, or redesign handshakes. Structural properties come from the RTL — modules 04-08 exist because the tool will faithfully translate whatever structure you wrote.',
      },
      {
        mistake: 'Never reading the synthesis report\'s resource summary.',
        fix:
          'The resource summary is the cheapest architectural check available: register counts vs your register list, RAM/DSP counts vs your arrays and multiplies. A mismatch is an inference failure or an unintended register — find it before timing or simulation buries it.',
      },
    ],
    guidedPractice: {
      title: 'Predict the netlist, then verify against the report structure',
      brief:
        'For this fragment, predict the netlist contents (registers, RAMs, adders, DSPs): reg [15:0] hist[0:63]; always @(posedge clk) begin if (!reset_n) begin idx_q <= 0; sum_q <= 0; end else begin if (we) hist[idx_q] <= din; sum_q <= sum_q + {8\'b0, hist[idx_q]}; if (idx_q == 6\'d63) idx_q <= 0; else idx_q <= idx_q + 1; end end. Then name the inference hazard in it and the fix.',
      starterCode: [
        '// Your prediction:',
        '//   Registers: ... (count bits)',
        '//   RAMs: ...   Adders: ...   DSPs: ...',
        '// Hazard: ...',
        '// Fix: ...',
      ].join('\n'),
      expectedBehavior:
        'Prediction: registers idx_q (6) + sum_q (16) = 22 FFs plus enable muxes; one 16-bit adder (the accumulate; the 8-bit zero-extended din rides into it); NO RAM — the hazard: hist has a reset-path structure? No: the actual hazard is that hist has NO reset (good) but the design has a second hazard — the read mem[raddr] and write mem[waddr] use the SAME address (idx_q) — single-port usage, fine — the true inference hazard shown here: if a designer "helpfully" adds a reset for hist to match idx_q/sum_q, the 64x16 array becomes 1024 flip-flops. Fix: keep the array reset-free (canonical BRAM pattern), track validity outside the array if needed. Registers: 6+16; one 16-bit adder; zero DSPs; one 64x16 RAM.',
      hints: [
        'Count assigned bits under the clocked process for the register prediction.',
        'The accumulate is the only arithmetic operator; din is zero-extended into it.',
        'The hazard question is about the array and the reset habit.',
      ],
    },
    practiceExercises: [
      {
        title: 'Width-to-resource arithmetic',
        brief:
          'A design multiplies two 12-bit values and accumulates 64 products into a 20-bit register. Estimate resources on an FPGA where one DSP covers up to 18x18, and on the register/adder side. Then state how the count changes if the inputs are 8-bit instead.',
        expectedBehavior:
          'Multiply: 12x12 fits one DSP (<= 18x18) — 1 DSP. Accumulate: 20-bit adder (carry chain), 20 FFs for the accumulator. If inputs are 8-bit: product fits an 8x8 (still one DSP — DSPs are not fractionally allocated, so no DSP savings unless the tool maps 8x8 into LUTs, which it may for small sizes); accumulator width by module 04 laws: 16 + 6 = 22 bits for 64 products of max 65025 (sum max 4.16M < 2^22 ≈ 4.19M) — so 22 FFs. Teaching point: DSP granularity means width reduction below the DSP boundary may save zero DSPs while still saving adder/FF width.',
        hints: [
          'DSP allocation is per-block, not per-bit: 12x12 and 8x8 both fit one.',
          'Accumulator width: N + ceil(log2 M) with N = product width.',
          'Check 64 x 65025 against 2^22.',
        ],
      },
      {
        title: 'Optimization visibility',
        brief:
          'A cloud computes y = (a & MASK_CONST) + (a & MASK_CONST); where MASK_CONST is a parameter fixed at 8\'h0F. What does constant propagation and CSE do to the netlist, and what does that imply for testing the WIDTH-parameterized version of this module?',
        expectedBehavior:
          'MASK_CONST=8\'h0F is a constant: both masks fold to constant-AND (wiring per bit), CSE merges the two identical terms, and the whole cloud collapses to a 4-bit adder on the low nibble (y = a[3:0] + a[3:0], one adder + duplicated wiring). Implication: the synthesized netlist for this parameter value contains none of the "real" structure — tests run against this configuration verify almost nothing about the general case. Per-configuration testing (module 03) is mandatory; a passing WIDTH=8 test says nothing about WIDTH=32 where the mask is a real bus-wide AND plus a full adder.',
        hints: [
          'Constants fold; identical subexpressions share.',
          'What is left of the AND when the mask is constant?',
          'Parameterized verification: each configuration is a different netlist.',
        ],
      },
    ],
    assessment: {
      title: 'Synthesis inference checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'What does an else if (en) branch inside a clocked process synthesize to?',
          options: [
            'A gated clock',
            'An enable: a mux on the flip-flop D input (or an FF-enable cell)',
            'A second register bank',
            'A latch',
          ],
          answer: 'An enable: a mux on the flip-flop D input (or an FF-enable cell)',
          explanation:
            'The enable is D-path logic — the register clocks every cycle and reloads its own value when en is low. This is the module-03 idiom, mapped exactly.',
          hint: 'Which pin of the flip-flop does the branch affect?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'A 256x8 array gets a reset branch added "for consistency". What is the likely synthesis result?',
          options: [
            'The block RAM resets its contents',
            'The array infers as 2048 individual flip-flops — block RAM cannot reset contents',
            'Nothing changes; resets are free',
            'The tool errors out',
          ],
          answer:
            'The array infers as 2048 individual flip-flops — block RAM cannot reset contents',
          explanation:
            'Content-resettable memory does not exist in block-RAM cells, so the inference matcher falls back to flip-flops. The resource report (RAM count vs register count) exposes it immediately.',
          hint: 'What does the BRAM cell support?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'Synthesis will insert a pipeline register into a slow combinational cloud if the timing report shows it is needed.',
          answer: 'false',
          explanation:
            'Synthesis optimizes within the structure you wrote; pipeline insertion is retiming (opt-in) or an RTL decision (module 06). Structural properties — registers, handshakes, reset — come from the source.',
          hint: 'Is the tool a faithful translator or an architect?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Name the four resource classes a synthesis report\'s summary lets you cross-check against your RTL, and give one expectation match for each.',
          answer:
            'Registers (one FF per assigned bit — check against the register list), block RAM (one per canonical array pattern), DSP/multiplier blocks (one per multiply above LUT-mapping size), LUT/logic cells (clouds, muxes, small operators)',
          explanation:
            'The cross-check is the cheapest architectural audit: expected-vs-reported per class, and a mismatch is an inference failure or an unintended register.',
          hint: 'Count, arrays, multiplies, clouds.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'output-prediction',
          prompt:
            'A cloud computes assign y = a * b + a * b; with a, b 8-bit. After common-subexpression elimination, how many multiplies does the netlist contain?',
          code: 'assign y = a * b + a * b;',
          options: ['2 (one per written multiply)', '1 (CSE shares the product)', '0 (folded to a shift)', '4'],
          answer: '1 (CSE shares the product)',
          explanation:
            'a*b appears twice as an identical subexpression: the tool computes it once and feeds both the doubling adder\'s inputs (or uses a shift for the x2). The RTL says two multiplies; the netlist has one — optimization within the function.',
          hint: 'Identical subexpressions are computed once.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Register inference', definition: 'The exact mapping from clocked-process shapes to flip-flops and their control pins.' },
      { term: 'Block RAM inference', definition: 'The canonical array pattern (sync write, sync read, no reset) mapping to memory cells.' },
      { term: 'Distributed RAM', definition: 'LUT-based memory for small arrays or async-read patterns.' },
      { term: 'DSP block', definition: 'Dedicated FPGA multiplier primitive; one per multiply above LUT-mapping size.' },
      { term: 'Constant propagation', definition: 'Folding provably-constant signals, deleting the logic they fix.' },
      { term: 'Common subexpression elimination', definition: 'Sharing one computation for identical repeated subexpressions.' },
      { term: 'Don\'t-care optimization', definition: 'Exploiting unreachable states/inputs to shrink logic.' },
    ],
    revisionSummary: [
      'Clocked process = registers; branch structure = pins: enable mux, sync reset mux, async clear pin.',
      'Memory inference is canonical-pattern-based and brittle: no array reset, matched ports, or it becomes flip-flops.',
      'Operators map by class and width: carry chains, DSP blocks, wiring for constant shifts; width is a resource decision.',
      'Clouds get Boolean optimization: folding, CSE, dead branches, don\'t-cares — never structural change.',
      'Read the resource summary against your register list and arrays; mismatches are inference failures.',
      'Per-configuration testing: parameters create different netlists with different optimizations.',
    ],
    furtherReading: [
      {
        label: 'Yosys open synthesis suite documentation',
        url: 'https://yosyshq.readthedocs.io/',
        kind: 'tool',
      },
      {
        label: 'Wikipedia — Logic synthesis',
        url: 'https://en.wikipedia.org/wiki/Logic_synthesis',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Field-programmable gate array',
        url: 'https://en.wikipedia.org/wiki/Field-programmable_gate_array',
        kind: 'article',
      },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'rtl-m10-l2',
    title: 'FSM Synthesis and Re-encoding',
    summary:
      'Synthesis recognizes your FSM, may re-encode its states, optimizes outputs against don\'t-cares, and offers safe-mode recovery logic. Know what the tool does to your state machine, what it preserves, and how to write FSMs that re-encode safely.',
    objectives: [
      'Describe FSM extraction: how the tool identifies state registers and next-state logic.',
      'Explain re-encoding (binary/one-hot/gray) and what RTL property makes it safe.',
      'Predict output optimization and unreachable-state removal effects.',
      'Decide when to use tool safe-FSM modes and what they add to the netlist.',
    ],
    whyItMatters:
      'FSMs are the most tool-transformed structure in a typical design: the state encoding you wrote may not be the one in the netlist, unreachable states you left in may be gone, and safe-mode may have added logic you never typed. A designer who does not know this wastes days debugging "missing" state bits in waveforms, or ships an FSM whose illegal-state recovery silently vanished in re-encoding. This lesson closes the loop between module 05\'s RTL style and the netlist that actually ships.',
    prerequisites: ['rtl-m05-l1', 'rtl-m05-l2', 'rtl-m10-l1'],
    explanation: [
      '**FSM extraction** is the tool recognizing the two-process shape: a register whose next-value function is a case over its own current value — the template from module 05. Once recognized, the tool treats the state register as a state machine rather than generic registers: it enumerates the reachable states, builds the state transition graph, and applies FSM-specific optimizations (encoding choice, output minimization, unreachable-state pruning). This is a direct payoff of the template: hand-rolled FSM shapes that mix state and non-state registers in one process often fail extraction and get treated as random logic — correct, but opaque to the FSM-aware optimizations.',
      '**Re-encoding** is the tool\'s right to choose different state bit patterns than your localparams. You wrote binary (ST_IDLE=2\'d00...); the tool may emit one-hot (for FPGA timing) or a gray-ish ordering (for power on dense transitions), or add/remove state bits entirely. What makes this SAFE is exactly the module-05 discipline: no logic may depend on the encoding\'s numeric values (no "next state = state + 1", no bit-position tests like st_q[2]), every state is a named localparam, reset loads a named state, and the default case row handles whatever values exist after re-encoding. Violate any of those and re-encoding changes behaviour — which is why the review checklist flags encoding-dependent logic as a finding.',
      '**Output and transition optimization** exploits the FSM\'s structure: outputs that are identical in two states may be merged (the tool proves the merge from the transition graph); unreachable states (never entered from reset through any arc) are pruned, and their output contributions deleted; don\'t-care next-states for illegal encodings let the tool choose transitions that minimize logic — unless you wrote a default row, which pins the illegal-encoding behavior (your ST_ERROR entry) and the tool honors it. The practical reading: after synthesis, the state register may have a different bit count than your RTL — the report states the chosen encoding; waveform viewers may need a decode file to show state names.',
      '**Safe-FSM modes** add hardware recovery: detection of illegal encodings (all-zeros or multi-hot for one-hot machines) and forced return to a reset state, sometimes with fault outputs. This is the tool implementing module 05 lesson 2\'s default-row philosophy with dedicated logic — valuable for reliability-critical designs (SEU environments), redundant for designs whose default row already handles it in RTL. The trade-offs: extra area and timing paths, and a netlist that no longer formally corresponds one-to-one to your RTL (affects equivalence checking setup). The course position stands: write the default row yourself; engage safe-mode when the reliability spec demands hardware-level recovery, and record the choice.',
    ].join('\n\n'),
    deepDive: [
      'The reachability analysis behind unreachable-state pruning is worth trusting but verifying: the tool computes states reachable from the RESET state through the transition graph. If your reset value is wrong (module 05\'s one-hot-reset lesson) or if an arc exists only under a condition the tool\'s static analysis cannot prove (an input assumed constant), pruning may remove a state your verification drives — and simulation of the netlist then differs from RTL. The defense is the reset-value discipline and checking the report\'s "states removed" line against your state diagram; a pruned state you intended to reach is a reset or arc bug.',
      'Why does the tool prefer one-hot on FPGAs and binary on ASICs? Because the cost model differs: FPGA logic is LUT-based, where a k-input function costs one LUT regardless of complexity — so one-hot\'s simple bit-decodes (k=1-2 inputs) map to minimal LUT chains, while the extra flip-flops are nearly free (FFs are abundant in every slice). ASIC standard cells price every flip-flop and every gate, so binary\'s fewer state bits usually win despite deeper decode. The tool\'s default follows its target; your job is to write encoding-independent RTL so the choice is the tool\'s to optimize, and to record any override you make.',
      'Equivalence checking (formal verification that netlist ≡ RTL) treats FSM re-encoding as an internal transformation it must see through — modern tools handle it, but safe-mode additions and aggressive output merging can exceed what the equivalence tool\'s model matches, requiring waivers. The workflow implication: if you use safe-mode or suspect aggressive FSM optimization, run the equivalence check early in the flow (not at the end) so waiver scope is known while RTL changes are still cheap. This is the synthesis-aware version of module 02\'s change-record discipline.',
    ].join('\n\n'),
    examples: [
      {
        title: 'An encoding-independent FSM and its two possible netlists',
        language: 'verilog',
        code: [
          '// Written binary; re-encoding-safe by construction.',
          'module ctrl_fsm (',
          '    input  wire clk, reset_n, start_i, done_i,',
          '    output reg  busy_o',
          ');',
          '    localparam [1:0] ST_IDLE = 2\'d0,',
          '                     ST_RUN  = 2\'d1,',
          '                     ST_FLUSH= 2\'d2;',
          '',
          '    reg [1:0] st_q;',
          '    reg [1:0] st_d;',
          '',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) st_q <= ST_IDLE;   // named reset state',
          '        else          st_q <= st_d;',
          '    end',
          '',
          '    always @* begin',
          '        st_d   = st_q;         // hold default',
          '        busy_o = 1\'b0;         // output default',
          '        case (st_q)',
          '            ST_IDLE:   if (start_i) st_d = ST_RUN;',
          '            ST_RUN:    begin',
          '                busy_o = 1\'b1;',
          '                if (done_i) st_d = ST_FLUSH;',
          '            end',
          '            ST_FLUSH:  if (!done_i) st_d = ST_IDLE;',
          '            default:   st_d = ST_IDLE;  // pins illegal-encoding behavior',
          '        endcase',
          '    end',
          'endmodule',
          '',
          '// NETLIST A (ASIC, binary kept): 2 state FFs, decode compares 2-bit',
          '//   values; default row\'s logic covers the one unused code (2\'d3).',
          '// NETLIST B (FPGA, one-hot chosen): 3 state FFs, bit-test decodes;',
          '//   the default row\'s logic covers 5 illegal patterns. The report',
          '//   states the encoding; waveform tools need a decode map for',
          '//   state names.',
          '// BOTH preserve: transitions, Moore/Melaly outputs, reset state,',
          '//   illegal-encoding behavior (via the default row).',
        ].join('\n'),
        explanation: [
          'The RTL contains no encoding-dependent logic: no arithmetic on st_q, no bit-position tests, named localparams throughout, named reset state, default row present. Both netlists are behaviour-identical to the RTL.',
          'Netlist A keeps 2 bits: the unused 2\'d3 pattern is handled by the default row\'s (small) logic. Netlist B spends 3 FFs for shallow decodes — the FPGA cost model. Same FSM, different bits.',
          'The busy_o default matters to the optimizer: with outputs defaulted, the tool can freely restructure the output logic per state; without defaults (module 05 lesson 1), output logic carries unintended asserted-behavior constraints into the optimization.',
          'The default row is what makes re-encoding SAFE rather than merely possible: whatever bit patterns the tool invents, the illegal ones still route to ST_IDLE. Remove the row and re-encoding silently changes illegal-encoding behaviour from "recover" to "undefined".',
          'Debugging note: after one-hot re-encoding, st_q is 3 bits and waveforms show bit patterns, not names. Tools accept state-decode files; ask for the encoding from the synthesis report.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'Same graph, two encodings',
        content: [
          '  RTL (what you wrote)         NETLIST (what ships)',
          '  -----------------------      -----------------------------',
          '  ST_IDLE = 2\'d00  ---+',
          '  ST_RUN  = 2\'d01  ---+--->  ASIC: 2 FFs, binary 00/01/10',
          '  ST_FLUSH= 2\'d10  ---+            (illegal 11 -> IDLE, via',
          '                                   your default row logic)',
          '                          --->  FPGA: 3 FFs, one-hot 001/010/100',
          '                                   (5 illegal patterns -> IDLE,',
          '                                    via your default row logic)',
          '',
          '  PRESERVED under re-encoding: the transition graph, outputs,',
          '  reset state, illegal-encoding policy. NOT preserved: bit',
          '  patterns, state-bit count, numeric relationships.',
          '',
          '  Write encoding-independent RTL and the choice is the tool\'s;',
          '  write encoding-dependent RTL and re-encoding is a bug source.',
        ].join('\n'),
        caption:
          'The state graph is the semantic content; the encoding is a tool decision. Encoding-independent RTL keeps those separate.',
      },
    ],
    tables: [
      {
        caption: 'FSM synthesis transforms',
        headers: ['Transform', 'What it does', 'What makes it safe'],
        rows: [
          ['Extraction', 'Recognizes state register + next-state case', 'Two-process template'],
          ['Re-encoding', 'Chooses bit patterns (binary/one-hot/gray)', 'No numeric/bit dependencies; named states; named reset'],
          ['Unreachable-state pruning', 'Removes states never entered from reset', 'Correct reset value; arcs under provable conditions'],
          ['Output minimization', 'Merges identical outputs; uses don\'t-cares', 'Defaulted outputs (module 05)'],
          ['Illegal-state handling', 'Default-row logic, or safe-mode hardware', 'Default row written in RTL; safe-mode only if spec demands'],
        ],
      },
      {
        caption: 'Tool default encodings by target',
        headers: ['Target', 'Usual default', 'Why'],
        rows: [
          ['FPGA', 'One-hot', 'LUT decode is shallow; FFs abundant'],
          ['ASIC', 'Binary (or tool-chosen)', 'Every FF and gate costs; decode is cheaper than bits'],
          ['Low-power flows', 'Gray-ish orderings', 'Minimize transitions on dense arcs'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Debugging waveforms expecting the RTL\'s state bit patterns after synthesis.',
        fix:
          'The netlist\'s encoding may differ (re-encoding): check the synthesis report\'s FSM section for the chosen encoding and state count, and load the state-decode map into the waveform tool. The transitions and names are preserved; the bit patterns are not.',
      },
      {
        mistake: 'Writing FSM logic that depends on encoding numerics (st_next = st_q + 1; or st_q[2] tests).',
        fix:
          'This is the one construction that makes re-encoding change behaviour. Named localparams, explicit arcs, bit-position-free outputs — the module-05 template. The review checklist flags numeric state dependencies as findings precisely because the tool will re-encode.',
      },
      {
        mistake: 'Leaving the default row out "because all states are covered" and assuming the tool handles illegal encodings.',
        fix:
          'All-covered is true in the RTL\'s encoding; after re-encoding, new illegal patterns exist whose handling is defined ONLY by your default row. The default row is not decoration — it is the illegal-encoding policy, and safe-FSM modes supplement (not replace) it.',
      },
    ],
    guidedPractice: {
      title: 'Audit for re-encoding safety',
      brief:
        'Three FSM fragments: (a) case with named localparams, default row, reset to ST_IDLE; (b) state transitions via st_q <= st_q + 2\'d1 with wrap; (c) output computed as (st_q == 2\'b10). For each: is it re-encoding-safe? If not, which re-encoding breaks it, and what is the fix?',
      starterCode: [
        '// (a) safe / unsafe? why?',
        '// (b) safe / unsafe? which re-encoding breaks it?',
        '// (c) safe / unsafe? fix?',
      ].join('\n'),
      expectedBehavior:
        '(a) SAFE — the model example: named states, default row, named reset; any encoding works. (b) UNSAFE — st_q + 1 assumes an numeric ordering; one-hot re-encoding breaks it entirely (001 + 1 = 010 is a different state than the graph intended; 100 + 1 wraps to 000 = illegal). Fix: explicit arcs per the state diagram; if the sequence IS the spec (a counting FSM), it is a counter, not an FSM — use a counter. (c) SAFE-ish but fragile — comparing against 2\'b10 is a numeric dependency that happens to work if encoding is unchanged; the safe form is (st_q == ST_FLUSH) with the named localparam. Fix it anyway: named comparisons survive every tool decision.',
      hints: [
        'Ask per fragment: does any line read the state\'s bit pattern rather than its identity?',
        '(b) is the classic "I have a sequence so I\'ll do arithmetic" — decide if it is a counter or an FSM.',
        '(c) works today and breaks at the worst time — after a target change.',
      ],
    },
    practiceExercises: [
      {
        title: 'Read the FSM report section',
        brief:
          'A synthesis report states: "FSM \'st_q\' detected: 5 states, encoding: one-hot, 5 FFs, 2 unreachable states removed, safe_fsm: off". List the four facts to verify against your RTL and the artifact each check uses.',
        expectedBehavior:
          'Verify: (1) state count 5 vs your state diagram (all 5 reachable? the diagram from module 02/05 is the artifact); (2) the 2 removed states — were they deliberately unreachable (diagram) or pruned-by-bug (reset value/arc check)?; (3) one-hot with 5 FFs — waveform decode map needed, and your reset value must be a legal one-hot (template check); (4) safe_fsm off — your default row IS the illegal-encoding policy (module 05 lesson 2), confirm it exists in the RTL. Each check maps to: state diagram, state diagram + reset template, synthesis decode file, RTL default row.',
        hints: [
          'Removed states: intended or accidental? The diagram knows.',
          'One-hot means the reset value question from module 05 applies.',
          'Safe-mode off means the RTL default row carries the policy.',
        ],
      },
      {
        title: 'Safe-mode decision',
        brief:
          'A design will fly in a radiation environment (single-event upsets possible). Write the decision record row for FSM robustness: options (RTL default row only / tool safe-mode / triple-modular redundancy on state), choice, rationale, and what each costs.',
        expectedBehavior:
          'Options: (1) RTL default row — recovers via case logic, but a single-bit flip to an illegal encoding is caught only when the case evaluates; detection latency varies; zero extra area. (2) Tool safe-mode — dedicated detect-and-repair logic on the state register, immediate recovery, small area/timing cost, netlist equivalence waiver needed. (3) TMR (voter on three state copies) — strongest (corrects in-flight, no state loss), highest cost (3x FFs + voters), typically reserved for the most critical FSMs. Reasonable choice: safe-mode on all FSMs, TMR on the boot/critical-control FSM, default rows kept everywhere as the behavioral baseline. Costs stated; rationale references the SEU requirement; the record notes the equivalence-checking waiver.',
        hints: [
          'The reliability requirement picks the tier; cost states the price.',
          'Default rows remain the baseline regardless of tier.',
          'Safe-mode changes the netlist — the equivalence flow must know.',
        ],
      },
    ],
    assessment: {
      title: 'FSM synthesis checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'What property of your RTL makes FSM re-encoding safe?',
          options: [
            'Using binary encoding in the localparams',
            'No logic depending on encoding numerics: named states, explicit arcs, named reset, default row',
            'Using one-hot in the localparams',
            'Keeping the FSM in one always block',
          ],
          answer:
            'No logic depending on encoding numerics: named states, explicit arcs, named reset, default row',
          explanation:
            'Re-encoding changes bit patterns; only encoding-independent logic survives unchanged. Arithmetic on state, bit-position tests, and numeric comparisons all break under re-encoding.',
          hint: 'What does re-encoding actually change?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'Why do FPGA tools default to one-hot FSM encoding while ASIC flows often prefer binary?',
          options: [
            'One-hot uses fewer flip-flops',
            'LUT-based decode makes one-hot\'s shallow decodes fast and FFs are cheap on FPGAs; ASICs price every FF and gate, so packed binary wins',
            'One-hot is required by the Verilog standard',
            'Binary cannot be synthesized',
          ],
          answer:
            'LUT-based decode makes one-hot\'s shallow decodes fast and FFs are cheap on FPGAs; ASICs price every FF and gate, so packed binary wins',
          explanation:
            'The cost models differ: FPGA slices have abundant FFs and LUT-priced logic; ASIC cells price everything. The tool\'s default follows its target\'s economics.',
          hint: 'What is cheap on an FPGA and expensive on an ASIC?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'After synthesis reports "2 unreachable states removed", this is always a sign your RTL had a bug.',
          answer: 'false',
          explanation:
            'States can be legitimately unreachable (error states reserved for future use, states your architecture document marks unreachable). It is a finding only if your state diagram intended them reachable — then the reset value or an arc is wrong. Verify against the diagram, not against alarm.',
          hint: 'Reachable from RESET through real arcs — says who?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'What does tool safe-FSM mode add to the netlist, and what is this course\'s baseline position on it?',
          answer:
            'Dedicated hardware detection of illegal state encodings with forced return to a reset state (sometimes fault outputs); the baseline is to write the RTL default row yourself and engage safe-mode only when the reliability spec (e.g. SEU environments) demands hardware-level recovery',
          explanation:
            'Safe-mode is a redundancy purchase with area/timing costs and equivalence-checking implications. The RTL default row is the free baseline; the tool option is a deliberate, recorded decision.',
          hint: 'It implements module 05 lesson 2\'s policy in hardware.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt:
            'After switching FPGA families, a design\'s FSM misbehaves: the sequence "ST_A then ST_B then ST_C" now jumps states. The RTL contains st_d = st_q + 2\'d1 for its sequence. What happened?',
          options: [
            'The new FPGA is faster, so states are skipped',
            'The new tool re-encoded the FSM; st_q + 1 assumed a numeric ordering that no longer matches the state graph — arithmetic on state is encoding-dependent and breaks under re-encoding',
            'The reset value changed',
            'The states were pruned',
          ],
          answer:
            'The new tool re-encoded the FSM; st_q + 1 assumed a numeric ordering that no longer matches the state graph — arithmetic on state is encoding-dependent and breaks under re-encoding',
          explanation:
            'st_q + 1 worked only because the old tool happened to keep binary order. Re-encoding (new tool, new target) invalidates the numeric assumption. Fix: explicit arcs for the sequence, or a counter if a sequence is genuinely all the FSM is.',
          hint: 'Which line read the encoding rather than the state identity?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'FSM extraction', definition: 'The tool recognizing state-register + next-state-case structure and treating it as a state machine.' },
      { term: 'Re-encoding', definition: 'The tool choosing different state bit patterns than the RTL localparams.' },
      { term: 'Unreachable-state pruning', definition: 'Removing states not reachable from reset through the transition graph.' },
      { term: 'Output minimization', definition: 'Merging identical outputs and exploiting don\'t-cares in output logic.' },
      { term: 'Safe-FSM mode', definition: 'Tool-added hardware detection/repair of illegal encodings; a reliability purchase.' },
      { term: 'State decode map', definition: 'The encoding-to-name mapping used by waveform tools after re-encoding.' },
    ],
    revisionSummary: [
      'The two-process template enables FSM extraction; hand-rolled shapes lose the FSM-aware optimizations.',
      'Re-encoding changes bit patterns, not behaviour — if the RTL is encoding-independent (named states, explicit arcs, named reset, default row).',
      'Unreachable-state pruning: verify against the state diagram; removed-by-bug means reset or arc defects.',
      'Defaulted outputs let output optimization work; non-defaulted outputs constrain it wrongly.',
      'FPGA tools default one-hot, ASIC tools binary — write encoding-independent RTL and record overrides.',
      'Safe-FSM modes are a reliability purchase on top of the RTL default row, not a replacement.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Finite-state machine',
        url: 'https://en.wikipedia.org/wiki/Finite-state_machine',
        kind: 'article',
      },
      {
        label: 'Wikipedia — One-hot',
        url: 'https://en.wikipedia.org/wiki/One-hot',
        kind: 'article',
      },
      {
        label: 'Yosys open synthesis suite documentation',
        url: 'https://yosyshq.readthedocs.io/',
        kind: 'tool',
      },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'rtl-m10-l3',
    title: 'Area, Timing, Power Levers — and Honest Limits',
    summary:
      'The designer\'s three levers (sharing vs duplicating, pipelining vs serializing, encoding and width choices) trade against each other. This lesson tabulates them, then draws the honest line between what RTL-time analysis can predict and what only the netlist and silicon know.',
    objectives: [
      'Tabulate the area/timing/power levers and their interactions.',
      'State what RTL-time estimation can and cannot predict, and why.',
      'Distinguish semantic guarantees (language-defined) from synthesizer-dependent outcomes.',
      'Read a netlist as the synthesis product and describe the equivalence-checking step.',
    ],
    whyItMatters:
      'Design reviews routinely ask for numbers — "how much area?", "will it meet 200 MHz?", "what is the power?" — and the honest engineer needs to know which of those questions are answerable at RTL time and which are not. Overclaiming produces schedules built on fiction; underclaiming forfeits the real information RTL analysis does have. This lesson is the calibrated boundary, plus the lever table that turns the boundary into decisions.',
    prerequisites: ['rtl-m10-l1', 'rtl-m04-l3', 'rtl-m08-l1'],
    explanation: [
      '**The levers and their interactions.** Area, timing and power respond to overlapping knobs, and every lever moves at least two of them. Sharing an operator saves area and (usually) power but adds mux delay to the timing path (module 04 lesson 3). Pipelining buys timing and throughput with area (registers) and latency (module 06). Width reduction saves everything (module 04 lesson 2: width is a resource law) but changes the spec-visible precision. Encoding choices (one-hot vs binary) trade FFs against decode depth (module 10 lesson 2). Clock enables save power at near-zero cost (module 07 lesson 2). The table is the design review\'s shared vocabulary: every proposal is a lever-pull with named consequences on the other axes.',
      '**What RTL-time estimation CAN predict**: structure (which registers, arrays, operators exist — module 10 lesson 1\'s inference rules are deterministic); relative costs (a 16x16 multiply dwarfs an 8-bit compare; depth 3 chains beat depth 5); cycle behaviour (latency, throughput — the netlist preserves it exactly); and resource-class counts (DSPs, RAMs) well enough to catch inference failures. This is genuinely powerful: most architectural mistakes are visible in these numbers before any tool runs.',
      '**What RTL-time estimation CANNOT predict, honestly**: exact gate counts (Boolean optimization reshapes clouds); **wire delay** (placement-dependent; on modern nodes it can dominate — two identical RTL structures time differently by placement); real power (activity factors, clock tree, leakage — none visible in RTL); and final fmax (library cells, fanout, routing all intervene between your depth count and the timing report). The discipline: quote estimates as estimates with their basis ("structure suggests this path is multiply-dominated; expect the multiply to set fmax"), never as guarantees ("this will meet 200 MHz"). The first synthesis run converts estimates into data; before that, they are hypotheses.',
      '**Semantic vs synthesizer-dependent** is the trust boundary. **Semantic guarantees** come from the language definition and hold for any correct tool: nonblocking assignments transfer at the edge; operators compute exact arithmetic per their widths; case/if behaviour follows the code; the register/cloud split of module 03 produces the cycle behaviour you wrote. **Synthesizer-dependent outcomes** are quality decisions: state encodings, resource sharing, mapping choices, retiming, optimization aggressiveness — the tool may vary them by version, target, and constraints. The design rule: functionality must live entirely in the semantic zone; the synthesizer-dependent zone is for quality only. A design whose correctness depends on a tool sharing an operator is broken by construction.',
      '**The netlist** is the synthesis product: a list of cells (from the library: FFs, gates, adders, RAMs, DSPs) and the nets connecting them, with no placement yet. It is the object timing analysis runs on, the object equivalence checking compares against your RTL (formal proof that the transformation preserved function — the tool\'s promise made checkable), and the input to place-and-route. Reading a netlist directly is a specialist skill, but knowing what it contains explains the flow\'s shape: RTL (intent) -> netlist (structure) -> placed design (physics), with a verification point at each arrow.',
    ].join('\n\n'),
    deepDive: [
      'Why can\'t RTL-time analysis predict wire delay? Because wires do not exist yet: their lengths come from placement, which comes after synthesis, which balances against congestion, floorplan, and physical constraints. On modern process nodes a cross-die net can cost more delay than the logic on either end — meaning the "same" RTL can close at one floorplan and fail at another. This is the deep reason timing closure is iterative (report -> fix -> re-run): each iteration feeds physical reality back into the estimate. The RTL designer\'s contribution is keeping logic depth low and structure local so the placement has room to succeed.',
      'Power\'s invisibility at RTL deserves one concrete illustration: two designs with identical RTL structure can differ 3x in power purely from clock-tree size and switching activity — a datapath clocked every cycle vs the same datapath with a clock enable that idles it 90% of the time (module 07 lesson 2). The RTL lever (enables, operand isolation, memory banking) is real, but its magnitude is a power-tool answer, not a rule-of-thumb. Quote power levers as directions ("enables will cut idle power substantially"), never as percentages.',
      'The levers interact across modules, which is why architecture reviews trade them explicitly: a resource-sharing decision (module 04) changes the critical path (module 08), which changes the pipelining need (module 06), which changes the register count and reset structure (module 03/07). The decision log (module 02 lesson 3) is where these cross-module trades get recorded — with the revisit conditions that let a later constraint change (a new frequency target, a new power budget) re-open exactly the affected rows without re-litigating the whole architecture.',
    ].join('\n\n'),
    examples: [
      {
        title: 'The lever trade table, applied to one block',
        language: 'text',
        code: [
          'BLOCK: 8-sample FIR filter, target: 200 MHz, area-conscious.',
          '',
          '  LEVER PULL              AREA      TIMING          POWER',
          '  -----------------------------------------------------------',
          '  Share the one           -1 adder  +mux delay on   slightly -',
          '  multiplier across       -1 mult   the shared path (less logic)',
          '  even/odd taps                     (risk: critical)',
          '',
          '  Pipeline the MAC        +2 banks  worst path      slightly +',
          '  (2 cuts)                          9ns -> ~4.5ns   (more FFs',
          '                                    -> meets 200MHz  clocked)',
          '                                  latency +2',
          '',
          '  Reduce coefficient      -bits     shorter mults   -',
          '  width 16 -> 12                    and adds        (less sw)',
          '  (spec decision!)',
          '',
          '  Clock-enable the        ~0        ~0              big - when',
          '  filter between frames                             idle',
          '',
          '  READING: no single pull achieves the target; the combination',
          '  (share + pipeline) trades area against timing, and the width',
          '  question goes back to the SPEC (precision vs area), not to the',
          '  tool. Every row records its cross-axis cost in the decision log.',
        ].join('\n'),
        explanation: [
          'Each row is one lever with its three-axis consequences — the shared-multiplier pull shows the classic timing-for-area trade, flagged with its risk (the mux may land on the critical path).',
          'The pipeline row achieves the frequency target but names its latency cost — the module-06 ledger, in review-table form.',
          'The width row is deliberately marked as a SPEC decision: precision is user-visible, so the lever belongs to the spec conversation, not to the designer\'s discretion.',
          'The enable row is the free power lever (module 07): near-zero area/timing cost for idle-power savings.',
          'The lesson: closures come from combinations of pulls, recorded with their cross-axis costs — never from one magic knob.',
        ],
      },
      {
        title: 'Semantic vs synthesizer-dependent: the guarantee table',
        language: 'text',
        code: [
          'GUARANTEED BY THE LANGUAGE (semantic - any correct tool):',
          '  - nonblocking assignments transfer at the clock edge',
          '  - operator arithmetic is exact for the declared widths',
          '  - case/if selection follows the code (incl. priority)',
          '  - the cycle behaviour of the module-03 templates',
          '  - reset branch semantics (async vs sync as written)',
          '',
          'SYNTHESIZER-DEPENDENT (quality decisions - varies by tool/version):',
          '  - state encoding (may re-encode; default row keeps policy)',
          '  - operator sharing (only where YOUR structure proves it)',
          '  - cell mapping choices (LUT structures, adder topologies)',
          '  - retiming (only if enabled), ICG insertion (power tool)',
          '  - Boolean optimization details (folding, CSE, don\'t-cares)',
          '',
          '  DESIGN RULE: functionality must live entirely in the semantic',
          '  zone. If correctness depends on a synthesizer-dependent choice',
          '  (e.g. "the tool will surely share that adder"), the design is',
          '  broken by construction.',
        ].join('\n'),
        explanation: [
          'The semantic zone is where correctness lives: these behaviors are the language\'s promise, and verification targets them.',
          'The synthesizer-dependent zone is where quality lives: the tool optimizes, and the designer verifies the results (resource report, timing report) without depending on any particular choice.',
          'The design rule is the audit question for every "the tool will handle it" argument in review: does any FUNCTIONALITY depend on that handling? If yes, it is a defect — make it structural (module 04 lesson 3: share explicitly) or verify it as a checked assumption with a written waiver.',
          'This table also explains tool-upgrade risk: semantic behavior never changes; synthesizer-dependent choices can — which is why re-encoding (lesson 2) and re-mapping appear in upgrade checklists.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The flow and its verification points',
        content: [
          '  RTL (intent, cycle behaviour)         [designer authors]',
          '      |  synthesis',
          '      v',
          '  NETLIST (cells + nets, no placement)  [equiv check vs RTL]',
          '      |  timing analysis (STA)          [setup/hold on netlist]',
          '      v',
          '  PLACED & ROUTED (physics: wires real) [post-layout timing,',
          '      |                                  power, DRC/LVS]',
          '      v',
          '  SILICON',
          '',
          '  RTL-time knowledge: structure, relative cost, cycle behaviour.',
          '  Netlist-time knowledge: gate counts, pre-placement timing.',
          '  Post-layout knowledge: real wire delay, real power.',
          '',
          '  Quote accordingly: estimates before the first run, data after.',
        ].join('\n'),
        caption:
          'Each flow stage knows more than the last; the honest engineer quotes the knowledge level of the stage they are in.',
      },
    ],
    tables: [
      {
        caption: 'The lever table (summary)',
        headers: ['Lever', 'Area', 'Timing', 'Power', 'Module'],
        rows: [
          ['Share operator (mux + 1)', 'Saves', 'Costs (mux on path)', 'Usually saves', 'm04-l3'],
          ['Duplicate operator', 'Costs', 'Helps (independent paths)', 'Usually costs', 'm04-l3'],
          ['Pipeline cut', 'Costs (regs)', 'Helps (splits path); latency cost', 'Slightly costs', 'm06'],
          ['Serialize (time-mux)', 'Saves', 'Costs (halved throughput)', 'Saves', 'm04-l3'],
          ['Reduce width', 'Saves', 'Helps', 'Saves', 'm04-l2 (spec decision!)'],
          ['One-hot vs binary encoding', 'Costs FFs / saves decode', 'Helps (FPGA)', '~neutral', 'm10-l2'],
          ['Clock enables / ICG', '~neutral', '~neutral', 'Big savings when idle', 'm07-l2'],
        ],
      },
      {
        caption: 'Predictability by stage',
        headers: ['Question', 'RTL time', 'After synthesis', 'After P&R'],
        rows: [
          ['Structure (regs, RAMs, DSPs)', 'Yes (inference rules)', 'Confirmed by report', 'Confirmed'],
          ['Cycle behaviour (latency, throughput)', 'Yes, exact', 'Preserved', 'Preserved'],
          ['Relative path costs', 'Rough (depth)', 'Good (real cells)', 'Best'],
          ['Exact fmax', 'No', 'Pre-placement estimate', 'Yes'],
          ['Gate count', 'No', 'Yes', 'Yes'],
          ['Wire delay', 'No', 'Estimated', 'Yes'],
          ['Power', 'No', 'Estimate', 'Best (activity-aware)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Quoting RTL-time estimates as commitments ("this will meet 200 MHz and use 12k gates").',
        fix:
          'Before the first synthesis run, estimates are hypotheses with stated bases ("multiply-dominated path; expect ~5-6 ns stage delay"). Convert to commitments only from reports — and label which stage produced them (pre- vs post-layout). Overclaiming is a schedule risk; the vocabulary discipline ("estimated") is the guard.',
      },
      {
        mistake: 'Making correctness depend on a synthesizer-dependent choice.',
        fix:
          'If the design works only because the tool shares an operator, keeps an encoding, or times an optimization a certain way, it is broken by construction. Functionality lives in the semantic zone (module 03 templates, explicit structure); the tool\'s zone is quality only — audited via reports, never assumed.',
      },
      {
        mistake: 'Treating the levers as independent ("pipeline AND share AND shrink — all free wins").',
        fix:
          'Every lever moves at least two axes, and pulls interact (sharing adds mux delay that the pipeline cut then must recover; width changes are spec decisions). Pull levers one at a time with the trade table, record each in the decision log with its cross-axis cost, and re-run timing/resource after each.',
      },
    ],
    guidedPractice: {
      title: 'The honest status report',
      brief:
        'Write the status paragraph for a design review, given: RTL complete, no synthesis run yet; structure = 2 multiplies (8x8), 1 block RAM (512x16), ~600 registers; cycle plan = 3-stage pipeline, latency 3, throughput 1/cycle; target 150 MHz. What CAN you claim, what must you NOT claim, and what is the plan to convert estimates into data?',
      starterCode: [
        '// STATUS PARAGRAPH:',
        '//   Can claim: ...',
        '//   Cannot claim: ...',
        '//   Plan: ...',
      ].join('\n'),
      expectedBehavior:
        'Can claim: structure and resource classes (2 DSPs expected for the multiplies, 1 RAM, ~600 FFs per the register list); exact cycle behaviour (latency 3, throughput 1/cycle — semantic); relative path costs (multiply-dominated; depth analysis suggests the multiply-add chain is critical). Cannot claim: fmax ("estimated multiply-dominated path ~5-6 ns — plausible for 150 MHz, unverified"), gate count, power. Plan: first synthesis run this week to convert estimates (resource counts vs inference expectations; WNS from the report), then the module-08 worksheet against real numbers; power only after placement, quoted as direction until then.',
      hints: [
        'Structure and cycle behaviour are semantic — claim them.',
        'Frequency, gates, power are stage-dependent — quote as estimates with basis.',
        'The plan names the exact next artifact (first synthesis report).',
      ],
    },
    practiceExercises: [
      {
        title: 'Cross-axis audit',
        brief:
          'A colleague proposes: "save area by sharing the two 16-bit adders, and recover timing by adding a pipeline stage, and reduce power by narrowing the datapath to 12 bits." Identify every cross-axis interaction and re-order the pulls sensibly, noting which is a spec decision.',
        expectedBehavior:
          'Interactions: sharing adds mux delay to both consumers\' paths — the timing problem grows before the pipeline fix; the width cut changes the multiplies/adds AND is a spec decision (precision is user-visible — module 04 lesson 2), so it must be resolved first because it changes the size of everything downstream. Sensible order: (1) resolve width with the spec owner (changes all subsequent arithmetic); (2) pull sharing (area) with its timing cost noted; (3) re-run timing; (4) pipeline cut sized to the measured deficit (not pre-emptively). Each pull recorded with cross-axis costs; the width row marked spec-owned.',
        hints: [
          'The spec-owned lever goes first — it changes the problem size.',
          'Sharing worsens the timing that pipelining then fixes: sequence matters.',
          'Never pre-emptively pipeline; size the cut from a report.',
        ],
      },
      {
        title: 'Guarantee or choice?',
        brief:
          'Classify as semantic guarantee or synthesizer-dependent: (a) a 16-bit adder computes the exact sum; (b) the FSM ships one-hot; (c) nonblocking transfers commit at the edge; (d) the two identical multiplies share one DSP; (e) the case statement picks the matching row; (f) a barrel shifter becomes LUT stages vs DSP-adjacent logic.',
        expectedBehavior:
          'Semantic: (a) operator exactness, (c) nonblocking semantics, (e) case behavior. Synthesizer-dependent: (b) encoding, (d) resource sharing, (f) mapping choice. The design rule check: (d) is fine as a quality outcome but must not be load-bearing — if the design needs the sharing for area targets, structure it explicitly and verify; if it needs it for CORRECTNESS, it is a defect.',
        hints: [
          'Language promise vs quality decision.',
          '(d) is the audit case: sharing as quality (fine) vs sharing as correctness (defect).',
          '(f) mapping never changes function — only cost.',
        ],
      },
    ],
    assessment: {
      title: 'Levers and limits checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'Which claim is honest at RTL time, before any synthesis run?',
          options: [
            'The design meets 200 MHz',
            'The cycle plan is latency 3, throughput 1/cycle, and the multiply is expected to dominate the critical path',
            'The design uses exactly 12,400 gates',
            'Power is 40 mW',
          ],
          answer:
            'The cycle plan is latency 3, throughput 1/cycle, and the multiply is expected to dominate the critical path',
          explanation:
            'Cycle behaviour is semantic (exact); structure and relative costs are inference-rule-based (solid estimates). fmax, gate counts and power require the netlist and physics.',
          hint: 'Which knowledge exists before cells and wires exist?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'Sharing an operator across two consumers (module 04) pulls which levers?',
          options: [
            'Area down, timing risk up (mux on the path), power usually down',
            'Area up, timing down, power up',
            'Area down, timing down, power down — no trade',
            'Area neutral, timing neutral, power down',
          ],
          answer: 'Area down, timing risk up (mux on the path), power usually down',
          explanation:
            'The sharing mux sits on the data path (timing cost) while removing an operator (area, usually power). Every lever moves at least two axes.',
          hint: 'Follow one consumer\'s path through the shared design.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'Nonblocking assignment semantics are a synthesizer-dependent outcome that tools may implement differently.',
          answer: 'false',
          explanation:
            'Nonblocking transfer-at-the-edge is language semantics — guaranteed for any correct tool. The synthesizer-dependent zone is quality choices: encodings, sharing, mapping, optimization details.',
          hint: 'Which zone does the module-03 template live in?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Why can wire delay not be predicted at RTL time, and what is the flow\'s answer to that gap?',
          answer:
            'Wires do not exist until placement — their lengths depend on floorplan, congestion and routing; the flow answers with iteration: synthesis -> timing report -> RTL/backend fixes -> re-run, with post-layout timing as the final data',
          explanation:
            'Wire delay can dominate on modern nodes, making RTL-time fmax claims impossible in principle. The iterative closure loop is the institutional answer; low depth and local structure are the RTL-level mitigations.',
          hint: 'What determines a wire\'s delay, and when does that information exist?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt:
            'A design\'s area target is met only because the tool happened to share two adders. The team ships it. What is wrong?',
          options: [
            'Nothing; the tool did its job',
            'Correctness/requirements must not depend on synthesizer-dependent choices; if the sharing is needed, structure it explicitly (module 04) and verify — or the next tool version may silently drop it',
            'Adders cannot be shared',
            'The area target should have been higher',
          ],
          answer:
            'Correctness/requirements must not depend on synthesizer-dependent choices; if the sharing is needed, structure it explicitly (module 04) and verify — or the next tool version may silently drop it',
          explanation:
            'Sharing is a quality choice the tool may change at any version or constraint tweak. Requirements that depend on it need the structure written explicitly in the RTL, with the resource report as the check.',
          hint: 'Which zone does the requirement live in?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Lever', definition: 'A design knob (share, pipeline, width, encoding, enable) moving at least two of area/timing/power.' },
      { term: 'Semantic guarantee', definition: 'Language-defined behaviour any correct tool must preserve.' },
      { term: 'Synthesizer-dependent', definition: 'Quality outcomes (encoding, sharing, mapping) that vary by tool, version and constraints.' },
      { term: 'Netlist', definition: 'The synthesis product: library cells and nets, pre-placement; input to STA and equivalence checking.' },
      { term: 'Equivalence checking', definition: 'Formal proof that netlist function equals RTL function.' },
      { term: 'Wire delay', definition: 'Placement-dependent interconnect delay; unpredictable at RTL time, dominant on modern nodes.' },
    ],
    revisionSummary: [
      'Levers trade across axes: sharing (area vs timing), pipelining (timing vs latency/area), width (everything vs spec precision), enables (free power).',
      'RTL time predicts: structure, cycle behaviour (exact), relative costs. Not: fmax, gate counts, wire delay, power.',
      'Semantic zone holds correctness; synthesizer-dependent zone holds quality. Never let functionality depend on the latter.',
      'Netlist = cells + nets; STA runs on it; equivalence checking proves it equals the RTL.',
      'Flow knowledge grows by stage: RTL (intent) -> netlist (structure) -> placed (physics); quote accordingly.',
      'Cross-module lever pulls are recorded in the decision log with revisit conditions.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Logic synthesis',
        url: 'https://en.wikipedia.org/wiki/Logic_synthesis',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Netlist',
        url: 'https://en.wikipedia.org/wiki/Netlist',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Place and route',
        url: 'https://en.wikipedia.org/wiki/Place_and_route',
        kind: 'article',
      },
      {
        label: 'Yosys open synthesis suite documentation',
        url: 'https://yosyshq.readthedocs.io/',
        kind: 'tool',
      },
    ],
    estimatedMinutes: 45,
  },
];
