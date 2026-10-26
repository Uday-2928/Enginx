import type { TutorialLesson } from '../types';

export const module06Lessons: TutorialLesson[] = [
  {
    id: 'sv-m06-l1',
    title: 'Assertions: Checkers as Statements',
    summary:
      'Write temporal rules the simulator checks for you: immediate assertions for instant conditions, concurrent assertions for behavior across cycles — req/ack windows, onehot grants, stability rules.',
    objectives: [
      'Write an immediate assertion for a same-cycle condition and explain where it belongs.',
      'Write a concurrent assertion with |-> and |=> and predict when each fires.',
      'Express the req-ack-within-3-cycles rule and the onehot rule as properties.',
      'Explain what an assertion failure and a cover property contribute to a verification plan.',
    ],
    whyItMatters:
      'Most protocol bugs are not wrong values — they are wrong *timing relationships*: acknowledged too late, valid dropped early, two grants at once. Scoreboards catch data errors; assertions catch these temporal violations, at the exact cycle and with the exact signal names in the log. Assertions are also the cheapest checking you will ever write: one line of property replaces a page of hand-rolled monitor code, and the same properties document the protocol for the next engineer.',
    prerequisites: [
      'sv-m03-l2: the valid/ready handshake and its stability rule',
      'sv-m04-l2: where checkers sit in a testbench',
    ],
    explanation:
      'An **immediate assertion** is a procedural check, evaluated exactly where it appears, like an if with a complaint: `assert (grant != 3\'b111) else $error("all-granted");`. It belongs inside procedural code — a task, an always block, a class method — and tests a same-instant condition. It is the SystemVerilog upgrade of the error-counter idiom from self-checking testbenches.\n\nA **concurrent assertion** is a statement about *behavior over time*, evaluated by a separate checker process on every clock edge for the whole run: `assert property (@(posedge clk) req |-> ##[1:3] ack);` — "whenever req is high, ack must arrive 1 to 3 cycles later". Concurrent assertions live outside procedural code (module, interface, checker, package scope) and keep checking even when your directed test is not looking. That permanence is their superpower: they watch every cycle of every test.\n\nThe two implication operators differ by one cycle. **Overlapping** `a |-> b` checks b in the *same* cycle a holds. **Non-overlapping** `a |=> b` checks b in the *next* cycle. Delay ranges use ##: `##[1:3]` means 1, 2 or 3 cycles later; `##2` exactly 2 cycles later. System functions extend the vocabulary to common structural rules: `$onehot(x)`, `$onehot0(x)` (at most one bit), `$stable(x)`, `$rose(x)`, `$fell(x)`, and `$past(x, n)` for values n cycles ago.\n\nTool honesty, as everywhere in the verification subset: **SVA is not supported by Icarus, so concurrent assertions in this lesson do not run on the platform grader.** They run on commercial simulators and substantially in Verilator. Immediate assertions (`assert (...) else ...`) are actually plain-verilog-compatible in essence and Icarus supports immediate assert; it is the concurrent `assert property` layer that needs a full simulator. Properties here are written to be standard-correct for a full simulator.',
    deepDive:
      '### Anatomy of a property\n\nA concurrent assertion has layers: the *sequence* (a pattern over cycles: `req ##[1:3] ack`), the *property* (a claim connecting sequences: `req |-> ##[1:3] ack`), and the *directive* (assert property, cover property, assume property). Reading properties fluently means reading the claims in English first: "req implies ack within 3 cycles"; "when valid is high, data is stable until ready". A property that fails reports the exact time and the attempt — in a full simulator, the failing attempt is often displayed as a waveform fragment, which is why assertion failures are the fastest bugs to debug in practice.\n\n### Disable iff: keeping reset out of the logic\n\nAlmost every real property needs `disable iff (rst_n == 0)`: during and just after reset, half-initialized signals violate every temporal rule, and you do not want a hundred false failures. The clause disables evaluation while the reset expression holds. Forgetting it is the most common first-week assertion bug: the property is right, the failures are noise. The complementary discipline: assertions are written for *functional mode*, and the reset period is explicitly carved out.\n\n### assert, cover, assume: three uses of one language\n\nThe same property syntax serves three directives with different meanings. **assert property** — a claim that must hold; a failure is a bug in the design (or in the property). **cover property** — a scenario you want to *observe*; a cover hit confirms the stimulus reached it (this is assertion-flavored functional coverage, and it complements the covergroups of Module 05). **assume property** — a constraint on the environment used in formal verification; in simulation it acts as guidance. Reading a professional testbench, the directive word tells you the intent before the property does.\n\n### Where assertions live and the bind idea (preview)\n\nProperties can sit in the module (next to the code they check), in the interface (checking the protocol at the boundary — often the best place), or in a separate checker module attached with **bind** without touching the DUT source (next lesson). The interface placement matters because it checks every module connected to that interface for free — write the valid-stability property once, and every producer on that bus is policed.',
    examples: [
      {
        title: 'Immediate assertions in a testbench task',
        language: 'systemverilog',
        code:
        '// Immediate assertions: same-instant checks inside procedural code.\n// The assert/else form is Verilog-2001-familiar and Icarus-supported.\ntask automatic send_byte(input logic [7:0] b);\n  assert (busy == 1\'b0)\n    else $error("send_byte called while TX busy");\n\n  // drive the byte (details omitted)\n  ...\n\n  assert (done == 1\'b1)\n    else $error("TX did not finish: b=%02h", b);\nendtask',
        explanation: [
          'Immediate assertions evaluate at the moment the statement executes — preconditions and postconditions of a task, exactly like asserts in software.',
          'The first checks a precondition (TX idle); the second a postcondition (done set).',
          'Failures call $error, which increments the standard error count and prints with time and file/line — better practice than $display for failures.',
          'This form is supported by Icarus, so it is the assertion flavor you can exercise on this platform.',
        ],
      },
      {
        title: 'Concurrent assertions: the req/ack window and onehot',
        language: 'systemverilog',
        code:
        '// SystemVerilog Assertions (SVA) — concurrent layer needs a full SV\n// simulator; illustrative on this platform.\nmodule arb_checker(\n    input logic       clk,\n    input logic       rst_n,\n    input logic       req,\n    input logic [3:0] grant,\n    input logic       ack\n);\n  // Rule 1: every request is acknowledged within 1..3 cycles.\n  a_ack_window: assert property (\n    @(posedge clk) disable iff (!rst_n)\n    req |-> ##[1:3] ack\n  );\n\n  // Rule 2: a grant is onehot (exactly one bit set).\n  a_grant_onehot: assert property (\n    @(posedge clk) disable iff (!rst_n)\n    $onehot(grant)\n  );\n\n  // Rule 3: ack only while a request is outstanding (overlapping |->).\n  a_ack_has_req: assert property (\n    @(posedge clk) disable iff (!rst_n)\n    ack |-> req\n  );\n\n  // Observation (not a claim): did we ever see a 3-cycle-late ack?\n  c_late_ack: cover property (\n    @(posedge clk) disable iff (!rst_n)\n    req ##2 !ack ##1 ack\n  );\nendmodule',
        explanation: [
          'a_ack_window: on any cycle with req=1, ack must be 1 one, two or three cycles later. ##[1:3] is the range; a failure names the exact violating cycle.',
          'a_grant_onehot: $onehot is 1 when exactly one bit is set — checked every cycle, catching simultaneous grants instantly.',
          'a_ack_has_ack uses the overlapping operator |->: ack in the SAME cycle as req (an ack with no outstanding request is a protocol violation).',
          'c_late_ack is a cover, not a claim: it records whether the stimulus ever produced the slow path (req, two idle cycles, ack) — closure evidence for the timing corner.',
          'disable iff (!rst_n) carves out reset so the checkers stay quiet while signals are initializing.',
        ],
      },
      {
        title: 'The valid/ready stability rule as a property',
        language: 'systemverilog',
        code:
        '// SVA — the handshake rule from Module 03, now as a checker.\n// Interface-level placement: every producer on this bus is policed.\ninterface stream_if #(parameter int W = 8)\n                     (input logic clk, input logic rst_n);\n  logic         valid;\n  logic         ready;\n  logic [W-1:0] data;\n\n  // Once valid rises, it stays high with stable data until ready.\n  a_valid_stable: assert property (\n    @(posedge clk) disable iff (!rst_n)\n    valid && !ready |=> valid && $stable(data)\n  );\n\n  // A transfer commits only when both are high (data change only\n  // allowed when a transfer completed the previous cycle).\n  a_no_transfer_on_stall: assert property (\n    @(posedge clk) disable iff (!rst_n)\n    (valid && !ready) |=> (data == $past(data))\n  );\nendinterface',
        explanation: [
          'The antecedent valid && !ready is the stall condition from the Module 03 waveform; the consequent demands valid stays up and data is unchanged next cycle.',
          '$stable(data) compares data now against one cycle ago; $past(data) is the explicit one-cycle-late value — two spellings of the same check intent.',
          'Because the property sits in the interface, every module connected to this bus instance is checked without touching any DUT source.',
          'This is the one-line replacement for the hand-written stability monitor most teams write first.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: '|-> vs |=> and the ##[1:3] window',
        content:
        '         cycle:    1     2     3     4     5\n                   |     |     |     |     |\nclk         ____----____----____----____----\nreq         ____----____________________\nack                     ____----____----\n\n  a_ack_window: req |-> ##[1:3] ack\n    antecedent at cycle 1 (req=1)\n    window: ack may be 1 at cycle 2, 3 or 4\n    here ack=1 at cycle 3 -> PASS (2-cycle delay)\n\n  |->  overlapping: consequent checked SAME cycle as antecedent\n  |=>  non-overlapping: consequent checked NEXT cycle\n       (req |=> ack  ==  req |-> ##1 ack)',
        caption:
          'Educational waveform (illustrative): the antecedent starts the check at cycle 1, and the ##[1:3] window allows cycles 2 through 4.',
      },
    ],
    tables: [
      {
        caption: 'SVA vocabulary used in this lesson',
        headers: ['Operator / function', 'Meaning', 'Example'],
        rows: [
          ['|->', 'Overlapping implication: consequent same cycle', 'ack |-> req'],
          ['|=>', 'Non-overlapping: consequent next cycle', 'valid |=> stable'],
          ['##n / ##[a:b]', 'Cycle delay / delay window', 'req |-> ##[1:3] ack'],
          ['$onehot(x) / $onehot0(x)', 'Exactly one bit set / at most one bit set', '$onehot(grant)'],
          ['$stable(x) / $past(x,n)', 'Unchanged since last cycle / value n cycles ago', '$stable(data)'],
          ['$rose(x) / $fell(x)', 'Rose / fell since last cycle', '$rose(valid)'],
          ['disable iff (expr)', 'Suspend checking while expr holds (reset)', 'disable iff (!rst_n)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing concurrent assertions without disable iff and drowning in failures during reset.',
        fix: 'During reset, signals are uninitialized and every temporal claim is false. Add disable iff (!rst_n) (or the active-low equivalent) to essentially every functional property.',
      },
      {
        mistake: 'Using |-> when the rule is about the next cycle (or vice versa).',
        fix: 'Fix the semantics first: same-cycle checks use |->; next-cycle checks use |=> (or ##1). Then verify on a two-cycle waveform which one you intended.',
      },
      {
        mistake: 'Believing assertions replace the scoreboard.',
        fix: 'Assertions check temporal/protocol rules; the scoreboard checks data correctness against a reference. A design can pass every assertion and return wrong data — both layers are required.',
      },
    ],
    guidedPractice: {
      title: 'Write two properties',
      brief:
        'For a memory bus with start, done and a 4-bit grant vector, write: (a) a concurrent assertion that done must eventually follow start within 10 cycles (window); (b) an assertion that grant is never all-zeros while busy is high (use |-> with a same-cycle check and $onehot0).',
      starterCode:
        '// Signals: clk, rst_n, start, done, busy, grant[3:0]\n// (a) start ... done within [1:10]\n// (b) busy |-> grant not all-zero',
      expectedBehavior:
        '(a) assert property (@(posedge clk) disable iff (!rst_n) start |-> ##[1:10] done); (b) assert property (@(posedge clk) disable iff (!rst_n) busy |-> !$isunknown(grant) && grant != 4\'b0000); — the all-zero case is simply grant == 0; $onehot0(grant) would be a different (at-most-one) rule.',
      hints: [
        '(a) is the ack-window pattern with a wider window.',
        '(b) is a same-cycle overlapping check: busy |-> condition.',
        'The negation of "all zeros" is grant != 4\'b0000.',
      ],
    },
    practiceExercises: [
      {
        title: 'Diagnose the false failures',
        brief:
          'A team adds a valid-stability assertion to a bus. During the first microsecond of every test it fails dozens of times; after reset release it never fails. Identify the missing clause and the corrected property.',
        expectedBehavior:
          'The property lacks disable iff on reset: while rst_n is low (and the first cycle after), valid/data are uninitialized and the stability claim is trivially violated. Corrected: assert property (@(posedge clk) disable iff (!rst_n) valid && !ready |=> valid && $stable(data));',
        hints: [
          'When exactly do the failures stop?',
          'Which clause suspends evaluation during reset?',
          'Half-initialized signals violate every temporal rule.',
        ],
      },
      {
        title: 'Convert a monitor to assertions',
        brief:
          'A hand-written monitor checks three rules with counters and if-statements: (1) never two grants; (2) ack only with req; (3) done within 10 cycles of start. Express all three as concurrent assertions and state one benefit beyond brevity.',
        expectedBehavior:
          '(1) assert property (@(posedge clk) disable iff (!rst_n) $onehot0(grant)); (2) assert property (@(posedge clk) disable iff (!rst_n) ack |-> req); (3) assert property (@(posedge clk) disable iff (!rst_n) start |-> ##[1:10] done); Benefit: they check EVERY cycle of EVERY test including corners the directed stimulus never intended, and failures report the exact cycle.',
        hints: [
          'Two grants means more than one bit: $onehot0.',
          'ack-without-req is an overlapping implication.',
          'The window pattern recurs.',
        ],
      },
    ],
    assessment: {
      title: 'Assertions checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which assertion expresses "if req is high, ack must be high in one of the next three cycles"?',
          options: [
            'req |-> ack',
            'req |=> ##[1:3] ack',
            'req |-> ##[1:3] ack',
            'req ##[1:3] |-> ack',
          ],
          answer: 'req |-> ##[1:3] ack',
          explanation:
            'The overlapping implication starts the check in the same cycle, and ##[1:3] allows ack 1 to 3 cycles later.',
          hint: 'The window operator follows the implication.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What does `$onehot(grant)` evaluate to when grant = 4\'b0100?',
          options: ['0', '1', 'x', 'It is a compile error'],
          answer: '1',
          explanation:
            '$onehot is 1 exactly when exactly one bit is set; 0100 has one bit set, so 1. ($onehot0 would also be 1 here; it differs when grant is all zeros.)',
          hint: 'Count the set bits.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Concurrent assertions (assert property) run on the Icarus Verilog grader used by this platform.',
          answer: 'false',
          explanation:
            'The concurrent SVA layer requires a full SV simulator (commercial, or Verilator with partial support). Immediate assert/else checks are the flavor Icarus supports.',
          hint: 'Recall the design-subset vs verification-subset tool split.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Which clause of a concurrent assertion suspends checking while reset is active?',
          answer: 'disable iff',
          explanation:
            'disable iff (expr) stops evaluation while the expression holds — written as disable iff (!rst_n) for active-low reset.',
          hint: 'It appears right after the clocking event.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Immediate assertion', definition: 'A procedural, same-instant check (assert ... else ...), usable in tasks and always blocks.' },
      { term: 'Concurrent assertion', definition: 'A clocked, run-long checker (assert property) describing temporal behavior.' },
      { term: 'Property', definition: 'A temporal claim connecting sequences with implication operators.' },
      { term: 'disable iff', definition: 'Clause suspending property evaluation while an expression (usually reset) holds.' },
      { term: 'cover property', definition: 'An observation directive: records whether a temporal scenario ever occurred.' },
      { term: '$onehot / $stable / $past', definition: 'Built-in functions for structural (bit-count) and temporal (stability, history) checks.' },
    ],
    revisionSummary: [
      'Immediate = same-instant, procedural, Icarus-friendly; concurrent = clocked, run-long, full-simulator.',
      '|-> same-cycle, |=> next-cycle, ##[a:b] window.',
      '$onehot/$onehot0/$stable/$past cover the common structural and temporal idioms.',
      'Always carve out reset with disable iff.',
      'Assertions check protocol; scoreboards check data; cover property measures scenario occurrence.',
    ],
    furtherReading: [
      { label: 'Wikipedia — SystemVerilog Assertions', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
      { label: 'Accellera — SystemVerilog standards', url: 'https://www.accellera.org/downloads/standards/systemverilog/', kind: 'standard' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'sv-m06-l2',
    title: 'Practical Properties and bind',
    summary:
      'Build a small library of the properties every testbench eventually needs — stability, no-overflow, handshake pairing — and attach them to a DUT without editing it using bind.',
    objectives: [
      'Read and write the five most common property shapes in real codebases.',
      'Explain what bind does and why checking code attached with bind is preferable to editing the DUT.',
      'Write a bind statement for a checker module over a DUT instance.',
      'Describe how property libraries are reused across projects.',
    ],
    whyItMatters:
      'In industrial environments, most assertions are not written inline by designers — they come from **checker modules attached with bind**: protocol checkers supplied with IP, verification IP checkers, and team property libraries. Reading bind statements and checker modules is therefore a daily skill, and writing them lets you add checking to a DUT you are not allowed to modify — the situation you will actually be in with third-party IP.',
    prerequisites: [
      'sv-m06-l1: concurrent assertion syntax and disable iff',
      'sv-m03-l3: interfaces and views (for where checkers attach)',
    ],
    explanation:
      'The **bind** construct takes a module (or interface/checker) and *injects an instance of it into the scope of another module* — without editing that module\'s source. The form:\n\n```\nbind fifo fifo_checker u_chk (.clk(clk), .rst_n(rst_n),\n                               .push(push), .pop(pop),\n                               .full(full), .empty(empty));\n```\n\nreads as: inside every instance named `fifo` (or a specific instance `u_dut.fifo_i`), create `u_chk` of type `fifo_checker`, wired to the named signals of that scope. The checker module is an ordinary module containing concurrent assertions. The DUT file is untouched; the checker is maintained, versioned and reused separately; and the same checker binds onto every instance of the design at once if you bind by module type rather than by instance path.\n\nThe five property shapes that cover most protocol checking in practice:\n\n1. **Stability**: `a && !b |=> $stable(x)` — while a condition persists, a signal must not change.\n2. **Response window**: `req |-> ##[1:N] resp` — every request gets a response in time.\n3. **Pairing**: `resp |-> outstanding` — a response only when a request exists.\n4. **Structural**: `$onehot(vec)`, `$onehot0(vec)` — arbitration and encoding rules.\n5. **No-overflow / no-underflow**: `!(push && full)`, `!(pop && empty)` — the FIFO crimes.\n\nThe reuse story: these shapes parameterize cleanly (widths, windows, active-low vs active-high reset), so teams collect them in a package or checker modules and bind them per project. When you read a commercial VIP datasheet that says "includes SVA checkers", this is the mechanism it means.',
    deepDive:
      '### bind by type vs bind by instance\n\n`bind fifo fifo_checker ...` binds into EVERY instance of module fifo — ideal for a protocol checker that applies everywhere. `bind top.u_dut.u_fifo fifo_checker ...` binds into one specific instance — for a targeted, silicon-specific check. The signal names in the port connection list resolve **in the target scope**, so the checker connects to whatever those names mean inside fifo. This is why bind checkers are so portable: they reference the internal signal names of the target, whatever they happen to be at each site.\n\n### What belongs in a checker module\n\nA good checker module contains: the properties (with parameters for widths and windows), the disable-iff reset, optional cover properties for the interesting protocol corners, and error messages naming the violated rule. It should contain **no stimulus and no state beyond the properties** — it is a monitor with legal opinions, not a driver. This separation is what lets the same checker be bound into unit-level and system-level tests, and into other projects.\n\n### bind vs interfaces vs inline\n\nThree homes for properties, three trade-offs. Inline (in the RTL) is best for designer-owned micro-checks ("this register never clears itself") and travels with the code — but requires editing rights and clutters source. Interface-level (Module 06 lesson 1) checks the protocol at a boundary for all connected modules — best for handshakes. bind is best for third-party IP (you cannot edit it), for checkers sold or shared as IP, and for applying one checker to many instances. In a mature flow, all three coexist, and code review asks "which home does this check belong in?"\n\n### Tool honesty\n\nbind is part of the concurrent SVA layer: **not runnable on this platform\'s Icarus grader** (Icarus supports immediate assertions, not assert property/bind-based checkers). Commercial tools fully support it; Verilator supports much of it. As before, the code is standard-correct and the concepts transfer — you are building the ability to read professional environments.',
    examples: [
      {
        title: 'A FIFO checker module: the five shapes in one place',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — illustrative on this platform\nmodule fifo_checker #(\n    parameter int AW = 4            // address/depth bits, for messages\n)(\n    input logic       clk,\n    input logic       rst_n,\n    input logic       push,\n    input logic       pop,\n    input logic       full,\n    input logic       empty\n);\n  // Shape 5a: no overflow — never push while full.\n  a_no_overflow: assert property (\n    @(posedge clk) disable iff (!rst_n)\n    !(push && full)\n  ) else $error("FIFO overflow: push while full");\n\n  // Shape 5b: no underflow — never pop while empty.\n  a_no_underflow: assert property (\n    @(posedge clk) disable iff (!rst_n)\n    !(pop && empty)\n  ) else $error("FIFO underflow: pop while empty");\n\n  // Shape 2: a push eventually raises full OR is consumed (liveness).\n  // Simplified plan-level check: full must clear within 16 cycles of\n  // being set, assuming pops keep arriving.\n  a_full_clears: assert property (\n    @(posedge clk) disable iff (!rst_n)\n    full && pop |-> ##[1:16] !full\n  ) else $error("FIFO stayed full over 16 pops");\n\n  // Cover: did the test ever hit the full-while-push corner?\n  c_push_full: cover property (\n    @(posedge clk) disable iff (!rst_n)\n    push && full\n  );\nendmodule',
        explanation: [
          'The two crime checks (overflow/underflow) are same-cycle overlapping implications of the simplest kind: a Boolean that must never hold.',
          'a_full_clears is a response-window property: given full and an active pop, the full flag must clear within 16 cycles — a liveness-flavored check tuned to the plan.',
          'c_push_full covers the corner the plan cares about; if it never fires, stimulus never even tried to overflow (which the a_no_overflow check would then never catch).',
          'Custom else $error messages name the violated rule — in a full simulator the failure log becomes self-describing.',
        ],
      },
      {
        title: 'Binding the checker onto the DUT without editing it',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — illustrative on this platform\n// The DUT below is NOT modified by the checking. This file compiles\n// alongside it and the bind attaches the checker into every fifo.\n\nmodule fifo (\n    input  logic       clk,\n    input  logic       rst_n,\n    input  logic       push,\n    input  logic       pop,\n    output logic       full,\n    output logic       empty\n);\n  // ... implementation untouched ...\nendmodule\n\n// Bind by TYPE: every instance of fifo gets the checker.\nbind fifo fifo_checker u_sva_chk (\n    .clk   (clk),\n    .rst_n (rst_n),\n    .push  (push),\n    .pop   (pop),\n    .full  (full),\n    .empty (empty)\n);\n\n// Bind by INSTANCE (alternative, targeted):\n// bind top.u_dut.u_fifo fifo_checker u_sva_chk ( .clk(clk), ... );',
        explanation: [
          'The bind statement lives outside both modules: it names the target scope (fifo), the checker type (fifo_checker), and the connections.',
          'Signal names in the connection resolve inside the target scope — clk here means the clk INSIDE fifo.',
          'Bind by type polices every fifo instance in the design; bind by instance targets one, useful for a specific integration under test.',
          'The DUT source file needed zero edits — the usual situation with licensed IP.',
        ],
      },
      {
        title: 'A parameterized stability checker, reused twice',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — illustrative on this platform\nmodule stable_checker #(\n    parameter int W      = 8,\n    parameter bit ACTIVE_LOW_RESET = 1\n)(\n    input logic           clk,\n    input logic           rst,\n    input logic           hold,\n    input logic [W-1:0]   q\n);\n  // While hold: q must not change.\n  generate if (ACTIVE_LOW_RESET) begin\n    a_stable: assert property (\n      @(posedge clk) disable iff (!rst) hold |=> $stable(q)\n    ) else $error("q changed while hold asserted");\n  end else begin\n    a_stable: assert property (\n      @(posedge clk) disable iff (rst) hold |=> $stable(q)\n    ) else $error("q changed while hold asserted");\n  end endgenerate\nendmodule\n\n// Two bindings of the same library checker:\n// bind regblock stable_checker #(.W(16)) u_stb (.clk(clk), .rst(rst_n),\n//                                             .hold(hold), .q(state_q));\n// bind adc_core stable_checker #(.W(12), .ACTIVE_LOW_RESET(0)) u_stb\n//                                             (.clk(clk), .rst(reset),\n//                                              .hold(freeze), .q(sample_q));',
        explanation: [
          'The checker parameterizes width and reset polarity — the two variations every real library must absorb.',
          'The generate-if selects the disable-iff polarity at elaboration.',
          'Two bind lines apply it to unrelated modules: the property library is shared infrastructure, not per-design code.',
          'This is exactly how commercial VIP ships checkers: parameterized modules plus bind instructions.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'bind: injection without modification',
        content:
        '   checker file (separate)          DUT file (untouched)\n   +------------------+             +---------------------+\n   | module           |   bind      | module fifo         |\n   |  fifo_checker    | ===================> scope of fifo      |\n   |   properties     |  (injected  |   clk, push, pop,   |\n   |   covers         |   instance) |   full, empty ...   |\n   +------------------+             |   +--------------+  |\n                                    |   | u_sva_chk    |  |  <-- checker\n                                    |   | (assertions) |  |      instance\n                                    |   +--------------+  |\n                                    +---------------------+\n\n   bind fifo fifo_checker u_sva_chk (.clk(clk), .push(push), ...);\n        ^target scope       ^connections resolve IN the target\n\n   Three homes for checks: inline (designer-owned), interface\n   (boundary protocol), bind (IP / library / no-edit-rights).',
        caption:
          'bind creates the checker instance inside the target scope; the DUT source never changes.',
      },
    ],
    tables: [
      {
        caption: 'The five property shapes',
        headers: ['Shape', 'Template', 'Catches'],
        rows: [
          ['Stability', 'cond |=> $stable(x)', 'Signals changing while held'],
          ['Response window', 'req |-> ##[1:N] resp', 'Lost or too-late responses'],
          ['Pairing', 'resp |-> outstanding', 'Spurious responses'],
          ['Structural', '$onehot(v) / $onehot0(v)', 'Multi-grant, bad encodings'],
          ['Resource crimes', '!(push && full), !(pop && empty)', 'Overflow, underflow'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming bind connections resolve in the scope where the bind statement is written.',
        fix: 'They resolve in the TARGET scope: clk in the connection list means the clk inside fifo. When a bind fails to see the expected signal, check the names inside the target module.',
      },
      {
        mistake: 'Putting stimulus or time-consuming tasks into a checker module.',
        fix: 'A checker contains properties and covers only. Mixing in stimulus makes it non-reusable and creates multiple-drivers on DUT-facing signals.',
      },
      {
        mistake: 'Binding by type when a specific instance needs a targeted check (or vice versa) and confusing the report output.',
        fix: 'Bind by type for protocol rules that apply everywhere; bind by instance path for integration-specific checks. The instance path form (top.u_dut.u_fifo) names exactly one site.',
      },
    ],
    guidedPractice: {
      title: 'Write a bind for a counter checker',
      brief:
        'Module counter has clk, rst_n, en, and output [7:0] cnt. Write: (a) a checker module with one property — when en is high, cnt must change every cycle (use |=> with $changed); (b) the bind-by-type statement.',
      starterCode:
        'module cnt_checker(\n    input logic       clk,\n    input logic       rst_n,\n    input logic       en,\n    input logic [7:0] cnt\n);\n  // property here\nendmodule\n\n// bind statement here',
      expectedBehavior:
        'Property: a_cnt_moves: assert property (@(posedge clk) disable iff (!rst_n) en |=> $changed(cnt)) else $error("cnt frozen while en"); Bind: bind counter cnt_checker u_cnt_chk (.clk(clk), .rst_n(rst_n), .en(en), .cnt(cnt));',
      hints: [
        '$changed(x) is 1 when x differs from its previous value.',
        'The checker ports mirror the signals it needs.',
        'Bind by type uses the module name, not an instance path.',
      ],
    },
    practiceExercises: [
      {
        title: 'Choose the home for the check',
        brief:
          'For each check, name the best home (inline RTL, interface, bind checker) and one reason: (a) valid must be stable until ready (used by 6 modules); (b) an internal state register must never hold 0xFF (single designer-owned module); (c) protocol checkers shipped with purchased IP.',
        expectedBehavior:
          '(a) interface: one property polices every connected module at the boundary. (b) inline: designer-owned, single-site, travels with the code. (c) bind: you cannot edit licensed IP, and the vendor ships parameterized checker modules plus bind instructions.',
        hints: [
          'Who owns the code? Who may edit it?',
          'How many sites does the rule apply to?',
          'Vendor IP ships as read-only.',
        ],
      },
      {
        title: 'Extend the FIFO checker',
        brief:
          'Add to fifo_checker: (a) a property that full must not deassert unless a pop occurred (within the last cycle, use $past); (b) a cover for back-to-back pops. Write both with disable iff and named messages.',
        expectedBehavior:
          '(a) assert property (@(posedge clk) disable iff (!rst_n) $fell(full) |-> $past(pop)); (b) cover property (@(posedge clk) disable iff (!rst_n) pop && $past(pop)); — (a) says full clears only after a pop; (b) observes whether the stimulus ever popped twice in a row.',
        hints: [
          '$fell(full) is the deassertion event.',
          'The cause must be visible in the previous cycle: $past(pop).',
          'A cover is written like an assert but records occurrence.',
        ],
      },
    ],
    assessment: {
      title: 'Properties and bind checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In `bind fifo fifo_checker u_chk (.clk(clk), .push(push));`, where do the names clk and push resolve?',
          options: [
            'In the scope where the bind statement is written',
            'Inside the fifo module (the target scope)',
            'Inside fifo_checker',
            'At the top level only',
          ],
          answer: 'Inside the fifo module (the target scope)',
          explanation:
            'Bind connections resolve in the target scope, which is what makes one bind apply to every instance of fifo with each instance connecting to its own signals.',
          hint: 'The checker is injected INTO fifo.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which property catches a FIFO overflow (push accepted while full)?',
          options: [
            'assert property (@(posedge clk) push |-> ##[1:2] full);',
            'assert property (@(posedge clk) disable iff (!rst_n) !(push && full));',
            'assert property (@(posedge clk) $onehot(push));',
            'cover property (@(posedge clk) push && full);',
          ],
          answer: 'assert property (@(posedge clk) disable iff (!rst_n) !(push && full));',
          explanation:
            'Overflow is the never-coincident rule: push and full must not both hold. The cover variant only observes; it does not check.',
          hint: 'Which form states something must NEVER happen?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A checker module attached with bind may drive DUT input signals as part of its checking.',
          answer: 'false',
          explanation:
            'Checkers are passive observers with legal opinions: properties and covers only. Driving would make them stimulus, breaking reuse and creating multiple drivers.',
          hint: 'What is the role boundary of a checker?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Write the stability property template: while hold is high, q must be unchanged on the next cycle.',
          answer: 'hold |=> $stable(q)',
          explanation:
            'The non-overlapping implication checks q in the next cycle, and $stable(q) compares against the previous value.',
          hint: 'Non-overlapping operator plus a stability function.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'bind', definition: 'Construct injecting an instance of a checker module into the scope of a target module without editing it.' },
      { term: 'Bind by type', definition: 'Binding via a module name so every instance of that module receives the checker.' },
      { term: 'Bind by instance', definition: 'Binding via a hierarchical path so exactly one instance receives the checker.' },
      { term: 'Checker module', definition: 'A module containing only properties and covers, reusable across designs and projects.' },
      { term: '$changed(x)', definition: 'Built-in that is 1 when x differs from its previous-cycle value.' },
    ],
    revisionSummary: [
      'bind injects checker instances into DUT scopes; DUT source stays untouched.',
      'Connections resolve in the target scope; bind by type for everywhere, by instance for one site.',
      'The five shapes: stability, response window, pairing, structural, resource crimes.',
      'Checkers observe; they never stimulate.',
      'bind/SVA is full-simulator territory: illustrative on this platform.',
    ],
    furtherReading: [
      { label: 'Accellera — SystemVerilog standards (bind/SVA)', url: 'https://www.accellera.org/downloads/standards/systemverilog/', kind: 'standard' },
      { label: 'Wikipedia — SystemVerilog', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'sv-m06-l3',
    title: 'UVM Architecture Overview (Concept-Only)',
    summary:
      'A honest map of the Universal Verification Methodology: tests, environments, agents, drivers, monitors, scoreboards, sequences, the factory and config DB — what each is, and what you cannot run on this platform.',
    objectives: [
      'Name the UVM component hierarchy and map each component to the role it plays from Module 04.',
      'Explain the jobs of the factory and the config DB in one sentence each.',
      'Describe how a UVM test runs: phases, sequences on sequencers, and the agent active/passive split.',
      'State plainly what is required to run UVM and why this lesson is concept-only.',
    ],
    whyItMatters:
      'UVM is the lingua franca of industrial verification: job postings assume it, codebases are built on it, and interviews probe whether you can read it. But UVM is a *methodology library* — hundreds of thousands of lines of class library atop everything you learned in Modules 04 and 05. This lesson gives you the map so that when you meet UVM code, you recognize the architecture instead of drowning in macros. It explicitly does NOT make you a UVM engineer, and it does not pretend you can run it here.',
    prerequisites: [
      'sv-m04-l2/l3: the layered testbench roles and virtual interfaces',
      'sv-m05-l1/l3: constrained randomization and coverage concepts',
    ],
    explanation:
      'Read this first, and treat it as the honesty contract for the whole lesson: **UVM requires a full SystemVerilog simulator plus the UVM class library. This platform runs Icarus Verilog, which supports neither. Nothing in this lesson is runnable here; UVM coverage is concept-only. The goal is recognition — being able to read a UVM environment and name its parts — not authorship.**\n\nUVM is a standardized class library and methodology (from Accellera) that industrializes the layered testbench you already know. The mapping is direct: **uvm_driver** is your driver, **uvm_monitor** your monitor, **uvm_scoreboard** your scoreboard, and **uvm_agent** bundles driver+monitor+sequencer for one interface as the reusable unit. The **uvm_env** contains agents plus scoreboards; the **uvm_test** configures the env, starts stimulus, and decides pass/fail — one test class per verification scenario, selected at run time on the same environment.\n\nThree mechanisms make that reuse real. The **factory** creates components and transactions by type name at run time, so a test can substitute an extended driver ("override") without editing the environment — reuse through replacement. The **config DB** is a string-keyed configuration database: the test sets values (including the all-important virtual interface handle and the agent active/passive flag); components get them during build. It is the industrial form of the set-and-use virtual-interface pattern from Module 04 lesson 3. **Sequences and sequencers** manage stimulus flow: a **uvm_sequence** generates transaction items and hands them to the driver through a **uvm_sequencer**; the driver pulls items with `get_next_item`/`item_done`. This replaces the mailbox plumbing with a standardized handshake that supports arbitration, priorities and multiple sequences.\n\nExecution is phased: build (construct/config), connect (wire ports), run (the actual simulation), then report/final checks. Every component follows the same phase API, so the environment is assembled and torn down uniformly. If you remember nothing else: **UVM = Module 04 architecture + factory for substitution + config DB for wiring + sequences for stimulus + phases for orchestration.**',
    deepDive:
      '### The component map, stated as roles\n\nuvm_test: owns the scenario; selects configuration, starts the sequence, prints the final verdict. uvm_env: the reusable container; one env per DUT boundary under test. uvm_agent: one per interface; in **active** mode contains a driver+sequencer (it drives); in **passive** mode only a monitor (it observes — used for interfaces someone else drives, or monitor-only checking). uvm_driver: pulls sequence items, drives pins via the virtual interface from the config DB. uvm_monitor: observes pins, publishes transactions on an **analysis port** — the typed broadcast replacing mailboxes; any number of subscribers (scoreboard, coverage collector) attach. uvm_scoreboard: subscribes to monitors, checks against a reference model. This is precisely the Module 04 data flow with typed plumbing.\n\n### The factory and overrides, precisely\n\nEvery UVM object is created through the factory: `mem_tr tr = mem_tr::type_id::create("tr");` instead of new(). The indirection lets a test say `set_type_override(orig_t::get_type(), corner_t::get_type());` and every creation site in the environment then produces corner_t — stimulus morphs globally without touching component code. This is why UVM code looks ceremonious: every `create` is a hook for substitution. Understanding this one line demystifies half the apparent complexity.\n\n### Config DB in one honest paragraph\n\n`uvm_config_db#(virtual bus_if)::set(this, "*", "vif", vif);` in the test, and `uvm_config_db#(virtual bus_if)::get(this, "", "vif", vif);` in the driver. Type-parameterized, string-keyed, hierarchical-scoped. It carries the virtual interface (always), the active/passive flag (always), and tunables (counts, weights). If you understood Module 04 lesson 3, you already understand the config DB — it is the same indirection with a lookup service in the middle.\n\n### What learning UVM actually requires, and a realistic path\n\nRunning UVM requires a commercial simulator (Questa/VCS/Xcelium) or a carefully configured open-source path (Verilator does not run UVM; the realistic open-source route is Icarus-free — projects like the open-source UVM ports exist but are not beginner terrain). The realistic path after this course: (1) solidify Modules 04-05 by writing the same layered testbench WITHOUT UVM on a full simulator; (2) then re-express it with UVM classes, following the component map above; (3) work through a UVM reference flow (the Accellera UVM kit ships examples). Every hour spent on the Module 04 architecture is an hour that makes UVM trivial later — the methodology is the same; UVM adds standardization, not new verification ideas.',
    examples: [
      {
        title: 'The UVM component tree of a small environment',
        language: 'text',
        code:
        '// Concept diagram — NOT code, NOT runnable anywhere as-is.\n//\n//  uvm_test (my_test)\n//    |\n//    +-- sets config DB: vif, agent active/passive, stimulus counts\n//    +-- runs sequence via sequencer\n//    +-- prints final PASS/FAIL\n//    |\n//    +-- uvm_env (my_env)\n//          |\n//          +-- uvm_agent (bus_agt, active)\n//          |     +-- uvm_sequencer  (item flow to driver)\n//          |     +-- uvm_driver     (pulls items, drives vif pins)\n//          |     +-- uvm_monitor    (observes vif, analysis port)\n//          |\n//          +-- uvm_scoreboard (subscribes to monitor analysis port,\n//          |                   checks vs reference model)\n//          +-- coverage subscriber (subscribes, samples covergroups)\n//\n//  Data flow: sequence -> sequencer -> driver -> DUT pins;\n//             DUT pins -> monitor -> { scoreboard, coverage }.',
        explanation: [
          'The tree is the Module 04 architecture: generator became sequence+sequencer; the mailboxes became sequencer handshake and analysis ports.',
          'One agent per interface; passive mode drops driver+sequencer and keeps only the monitor.',
          'The test is the only component that knows the scenario; env and agents are scenario-agnostic and reused across tests.',
        ],
      },
      {
        title: 'The four UVM idioms to recognize on sight',
        language: 'systemverilog',
        code:
        '// RECOGNITION sketches — UVM requires a full SV simulator + the UVM\n// library; NOT runnable on this platform. Concept-only per lesson intro.\n\nclass my_driver extends uvm_driver #(bus_tr);\n  `uvm_component_utils(my_driver)              // 1. factory registration\n  virtual bus_if vif;                          // the Module 04 handle\n  function new(string name, uvm_component parent);\n    super.new(name, parent);\n  endfunction\n  task run_phase(uvm_phase phase);             // 2. phased execution\n    forever begin\n      seq_item_port.get_next_item(req);        // 3. sequencer handshake\n      drive_pins(req);                         //    (Module 04 driver body)\n      seq_item_port.item_done();\n    end\n  endtask\nendclass\n\nclass my_test extends uvm_test;\n  `uvm_component_utils(my_test)\n  function void build_phase(uvm_phase phase);  // 4. config DB set/get\n    super.build_phase(phase);\n    uvm_config_db#(virtual bus_if)::set(this, "*", "vif", test_top.u_if);\n  endfunction\n  task run_phase(uvm_phase phase);\n    my_seq seq = my_seq::type_id::create("seq"); // factory creation\n    seq.start(env.agt.sqr);                      // stimulus entry point\n  endtask\nendclass',
        explanation: [
          'Idiom 1, `uvm_component_utils`: registers the class with the factory — every UVM class starts with it.',
          'Idiom 2, phases: build/connect/run/report replace ad-hoc initial blocks; the run_phase body is the same driver loop you wrote in Module 04.',
          'Idiom 3, get_next_item/item_done: the standardized driver handshake with the sequencer — the mailbox get, formalized.',
          'Idiom 4, config_db set/get: the virtual interface travels by string key — Module 04 lesson 3 indirection with a lookup service.',
          'seq.start(env.agt.sqr): a test starts stimulus by running a sequence on the agent sequencer — one line replacing the generator loop.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'UVM execution: phases and item flow',
        content:
        '  PHASES (every component, in order)        ITEM FLOW (stimulus)\n  -------------------------------          -------------------------\n  build     construct, config DB get        uvm_sequence\n  connect   wire TLM ports                  | create items (factory)\n  run       simulate:                       v\n            - test starts sequence    uvm_sequencer\n            - drivers pull items            | get_next_item/item_done\n            - monitors publish              v\n            - scoreboard checks        uvm_driver -> DUT pins\n  report    summarize (objection-based                    |\n            end-of-test)                                  v\n  final     final checks                    DUT pins -> uvm_monitor\n                                                          | analysis port\n                                            +-------------+------------+\n                                            v             v\n                                       uvm_scoreboard  coverage sub\n\n  Components are CLASSES; the hierarchy above is object composition,\n  built at run time by the factory (that is why create() replaces new()).',
        caption:
          'UVM orchestration in one picture: standardized phases over the Module 04 data flow, with factory-created objects and typed connections.',
      },
    ],
    tables: [
      {
        caption: 'Module 04 architecture mapped onto UVM names',
        headers: ['Module 04 role', 'UVM component/class', 'What UVM adds'],
        rows: [
          ['Generator', 'uvm_sequence (+ sequencer)', 'Standardized item handshake, arbitration, virtual sequences'],
          ['Driver', 'uvm_driver', 'run_phase, config DB vif, factory-created items'],
          ['Monitor', 'uvm_monitor', 'analysis port (typed broadcast) instead of a mailbox'],
          ['Scoreboard', 'uvm_scoreboard', 'Subscribes via analysis exports; objection-based end of test'],
          ['Coverage collector', 'subscriber + covergroup', 'Same covergroups, attached as subscribers'],
          ['(test wiring)', 'uvm_test / uvm_env / uvm_agent', 'Reusable container, active/passive agent, run-time test selection'],
          ['(construction)', 'factory + config DB', 'Run-time substitution and string-keyed configuration'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Trying to learn UVM before understanding the plain layered testbench.',
        fix: 'UVM adds standardization on top of the Module 04 architecture, not new verification ideas. Write the mailbox-based environment first on a full simulator; UVM then reads as vocabulary.',
      },
      {
        mistake: 'Assuming UVM code can be run or graded on this platform.',
        fix: 'It cannot: Icarus supports neither the class library nor UVM. Treat every UVM snippet here and in textbooks as recognition material until you have a full simulator.',
      },
      {
        mistake: 'Memorizing macros without the architecture behind them.',
        fix: 'For every macro (uvm_component_utils, uvm_analysis_port) ask which Module 04 mechanism it formalizes. If you cannot answer, revisit Module 04 — the architecture is the knowledge; the macros are spelling.',
      },
    ],
    guidedPractice: {
      title: 'Map a job posting to the architecture',
      brief:
        'A posting reads: "Experience with UVM agents, active/passive configurations, sequences, functional coverage closure, and scoreboards." For each phrase, write the Module 04/05 concept it maps to, in one line each.',
      starterCode:
        '// agents -> ?\n// active/passive -> ?\n// sequences -> ?\n// coverage closure -> ?\n// scoreboards -> ?',
      expectedBehavior:
        'agents -> driver+monitor+sequencer bundle per interface (Module 04 roles). active/passive -> whether the agent drives (active: has driver+sequencer) or only observes (passive: monitor only). sequences -> the generator role with standardized item flow. coverage closure -> Module 05 lesson 3 loop: bins, crosses, retargeting. scoreboards -> reference-model checking role with analysis-port subscription.',
      hints: [
        'Every UVM noun has a Module 04 or 05 ancestor.',
        'Passive agent = monitor only.',
        'Closure is the loop, not the number.',
      ],
    },
    practiceExercises: [
      {
        title: 'Trace a UVM failure message',
        brief:
          'A UVM log shows: "UVM_ERROR @ 45210ns: [a_no_overflow] ... uvm_test_top.env.agt.drv". Name which component printed it, what kind of checker produced it (scoreboard or assertion, and which), and the component path from test to driver.',
        expectedBehavior:
          'Printed from the driver inside the agent inside the env inside the test (path: my_test(top) -> env -> agt -> drv). The name a_no_overflow matches the Module 06 lesson 2 checker style, so it is an SVA property (likely bound near the DUT/interface) — UVM_ERROR is the severity wrapper in the log. Either way the lesson: names and component paths localize failures.',
        hints: [
          'Read the component path backwards.',
          'The bracketed name is a property name.',
          'UVM_ERROR is severity, not source.',
        ],
      },
      {
        title: 'Design before UVM',
        brief:
          'You join a team that has a simulator but no UVM experience. Argue for or against starting with the mailbox-based layered testbench (Module 04) before adopting UVM, in 5-8 sentences, naming exactly what UVM would add later.',
        expectedBehavior:
          'A strong answer argues for Module 04 first: the architecture (roles, transactions, vif) is the transferable skill and is testable immediately; UVM then adds factory substitution, config DB, phased execution, standardized sequencer handshake and analysis ports — infrastructure, not new concepts — and adopting it over an existing layered TB is a refactor, not a rewrite. A minority position (UVM-first) is defensible only if hiring/flow already assume UVM templates.',
        hints: [
          'What does the team need to verify first: scenarios or process?',
          'Which parts of UVM are verification ideas vs plumbing?',
          'Refactor vs rewrite is the frame.',
        ],
      },
    ],
    assessment: {
      title: 'UVM overview checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What is the UVM equivalent of the Module 04 driver + monitor + sequencer bundle for one interface?',
          options: ['uvm_env', 'uvm_agent', 'uvm_test', 'uvm_scoreboard'],
          answer: 'uvm_agent',
          explanation:
            'An agent bundles the components for one interface; in active mode it includes driver+sequencer+monitor, in passive mode only the monitor.',
          hint: 'It is the reusable per-interface unit.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What does the UVM factory primarily enable?',
          options: [
            'Faster simulation',
            'Run-time substitution of component or transaction types without editing the environment',
            'Automatic coverage collection',
            'String-based signal lookup',
          ],
          answer: 'Run-time substitution of component or transaction types without editing the environment',
          explanation:
            'Factory creation (type_id::create) plus type overrides lets a test swap implementations everywhere; string lookup is the config DB job.',
          hint: 'One test reconfigures the whole environment — how?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'This platform can compile and run UVM testbenches in its grader.',
          answer: 'false',
          explanation:
            'UVM requires a full SystemVerilog simulator plus the UVM class library; the platform grader runs Icarus Verilog, which supports neither. UVM here is concept-only.',
          hint: 'Recall the honesty contract at the top of the lesson.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Which UVM mechanism carries the virtual interface handle from the test to the driver?',
          answer: 'config DB',
          explanation:
            'uvm_config_db#(virtual bus_if) set/get is the standard transport for the vif handle (and the active/passive flag) — the industrial form of the Module 04 set-and-use pattern.',
          hint: 'It is a string-keyed database.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'UVM', definition: 'Universal Verification Methodology: an Accellera class library and methodology industrializing the layered testbench.' },
      { term: 'uvm_agent', definition: 'Per-interface bundle: driver+sequencer+monitor (active) or monitor only (passive).' },
      { term: 'uvm_sequence / sequencer', definition: 'The stimulus generator role and its standardized item-flow handshake to the driver.' },
      { term: 'factory', definition: 'Run-time creation service enabling type substitution (overrides) without editing components.' },
      { term: 'config DB', definition: 'String-keyed, typed configuration database carrying virtual interfaces and settings test-to-component.' },
      { term: 'analysis port', definition: 'Typed broadcast connection from monitors to multiple subscribers (scoreboard, coverage).' },
      { term: 'Phases', definition: 'Standardized execution stages (build, connect, run, report) every UVM component follows.' },
    ],
    revisionSummary: [
      'UVM = Module 04 architecture + factory + config DB + sequences + phases.',
      'Agent = per-interface bundle; active drives, passive observes.',
      'Monitors broadcast on analysis ports; scoreboards and coverage subscribe.',
      'Factory create() enables run-time type overrides; config DB carries vif and settings.',
      'Requires full SV simulator + UVM library: NOT runnable on this platform; this lesson builds recognition, not authorship.',
    ],
    furtherReading: [
      { label: 'Accellera — UVM downloads and reference kit', url: 'https://www.accellera.org/downloads/standards/uvm', kind: 'standard' },
      { label: 'Wikipedia — Universal Verification Methodology', url: 'https://en.wikipedia.org/wiki/Universal_Verification_Methodology', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
