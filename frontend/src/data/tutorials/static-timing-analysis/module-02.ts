import type { TutorialLesson } from '../types';

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'sta-m02-l1',
    title: 'Defining Clocks: create_clock and Generated Clocks',
    summary:
      'Timing analysis is impossible against an undefined clock: how the primary clock is declared, what duty cycle and waveform mean, and why every internally divided or gated clock must be declared as a generated clock rather than left as an unconstrained mystery.',
    objectives: [
      'Write a create_clock constraint for a primary input clock and explain every argument.',
      'Explain what STA does with a design whose clock is unconstrained (the honest answer: almost nothing useful).',
      'Declare a divide-by-2 internal clock as a generated clock and compute its derived period.',
      'Recognize the danger of ripple clocks created in RTL versus proper clock enables.',
    ],
    whyItMatters:
      'The clock definition is the single most consequential line in a constraint file: every setup and hold number in every report is computed against it. An unconstrained or wrongly-constrained clock makes the tool either report nothing (silent, dangerous) or report against a fiction (loud, misleading). And the most common real-world constraint bug — an internal divided clock that was never declared — makes the fastest logic in the design effectively invisible to analysis.',
    prerequisites: [
      'Setup and hold checks (Module 1)',
      'Clock dividers in RTL (Verilog course, Module 9)',
    ],
    explanation:
      'Constraints are how you tell the tool what the world looks like. The first and most important one defines the clock. In SDC style (the constraint syntax used by most ASIC tools and echoed by FPGA tools):\n\n```\ncreate_clock -period 10.0 -name sys_clk -waveform {0 5} [get_ports clk]\n```\n\nReading it piece by piece: `-period 10.0` is the period in nanoseconds (100 MHz); `-name sys_clk` names the clock for every later reference; `-waveform {0 5}` lists the rise and fall edge times within the period (defaults to `{0 period/2}` — 50% duty — so this example is explicit about the default); `[get_ports clk]` attaches the clock to the design\'s clock input port. From this one line, the tool derives every launch and capture edge used by both checks.\n\n**What if the clock is not constrained?** Then paths clocked by it are simply not analyzed — no setup numbers, no hold numbers, no warnings you would notice in a big log. The design "meets timing" in the same sense an ungraded exam "passes". The first debugging step for any suspiciously clean report is to verify that every clock in the design is constrained; unconstrained clocks are the most common cause of timing that looks too good.\n\n**Generated clocks.** Real designs create internal clocks: a toggle flip-flop dividing the system clock by two is the classic. The divided signal is a real clock edge source for the flops it drives, and it must be declared with its relationship to the parent:\n\n```\ncreate_generated_clock -name div2_clk \\\n    -source [get_ports clk] -divide_by 2 [get_pins div_ff/Q]\n```\n\nThis tells the tool: edges on `div2_clk` are derived 2:1 from `sys_clk`, so its period is 20 ns, and — crucially — the tool can still analyze paths *between* the two domains correctly, because it knows the exact phase relationship. An undeclared divided clock is analyzed as ordinary data: the flops it clocks are unconstrained (invisible), and cross-domain paths get nonsense checks.\n\nWorked numbers: a 50 MHz board clock (`T = 20 ns`) is divided by 2 in RTL. The generated clock has period 40 ns (25 MHz). Paths inside the divided domain are checked against 40 ns minus the divider\'s insertion effects; paths from the fast domain into the slow domain are checked against the known 2:1 phase alignment, so the tool uses the worst-case edge spacing rather than assuming anything.',
    deepDive:
      '### Why "divide in RTL" is usually the wrong design anyway\n\nA ripple divider (a toggle flop whose Q clocks other flops) creates a clock with skew relative to the parent and poor drive. The RTL-correct pattern from the Verilog course is to keep ONE clock and generate a **clock enable** (a one-cycle-in-N pulse that gates the flop inputs), so all flops stay on the well-balanced primary clock tree. When you see `always @(posedge divided_clk)` in RTL, treat it as a design review finding: it should usually be `always @(posedge clk)` with an enable. Generated-clock constraints then become necessary mostly for hard IP blocks and true multi-clock architectures, not for slow logic.\n\n### Duty cycle and the -waveform list\n\nFor most designs the default 50% duty is right. Duty matters for paths that launch on the rising edge and capture on the falling edge (DDR-style interfaces), where the *half*-period is the actual budget — the waveform argument `{0 2.5}` on a 10 ns clock declares a 25%/75% duty and tightens every rise-to-fall path to 2.5 ns. If a datasheet specifies a minimum high or low time, encode it here rather than in a comment.\n\n### Virtual clocks (a preview of I/O timing)\n\nYou will also meet `create_clock` without a port attachment — a *virtual clock*, existing only as a timing reference for external logic. It is the anchor that input/output delays (next lesson) hang from: the tool cannot see the board, so you describe the outside world relative to a virtual clock that models the system the chip will live in.',
    examples: [
      {
        title: 'A minimal, complete clock constraint set',
        language: 'text',
        code:
          '# SDC-style constraint file (syntax follows the industry-standard\n# Synopsys design-constraint format; every vendor tool uses a variant)\n\n# 1. Primary clock: 100 MHz from the board\ncreate_clock -period 10.0 -name sys_clk -waveform {0 5} [get_ports clk]\n\n# 2. Internal divide-by-2 from a toggle flop\ncreate_generated_clock -name div2_clk \\\\\n    -source [get_ports clk] -divide_by 2 [get_pins div_ff/Q]\n\n# Resulting analysis domains:\n#   sys_clk  : all flops on clk          (10.0 ns checks)\n#   div2_clk : flops clocked by div_ff/Q (20.0 ns checks)\n#   cross-domain paths: analyzed against the known 2:1\n#   phase relationship (worst-case edge spacing)',
        explanation: [
          'Line 1 is the anchor: period, name, waveform, attachment point. Every number in every report derives from it.',
          'Line 2 declares the divided clock with its parent (-source) and ratio (-divide_by 2), so the tool derives its 20 ns period AND the phase relationship.',
          'The comment block is the mental model to carry: three kinds of analysis result from two constraint lines.',
          'The backslash is SDC line continuation — a syntax detail that saves you an hour of wondering why the tool sees an incomplete command.',
        ],
      },
      {
        title: 'The ripple-clock RTL anti-pattern and its fix',
        language: 'verilog',
        code:
          '// ANTI-PATTERN: ripple divider clocking real flops\nreg clk_div2;\nalways @(posedge clk or negedge rst_n)\n    if (!rst_n) clk_div2 <= 1\'b0;\n    else        clk_div2 <= ~clk_div2;\n\nalways @(posedge clk_div2)         // <- flops on a derived clock:\n    counter <= counter + 1\'b1;     //    skew, weak tree, needs a\n                                   //    generated-clock constraint\n\n// PREFERRED: one clock, one enable\nreg       tick;\nreg [1:0] phase;\nalways @(posedge clk or negedge rst_n)\n    if (!rst_n) begin phase <= 2\'b0; tick <= 1\'b0; end\n    else begin\n        phase <= phase + 1\'b1;\n        tick  <= (phase == 2\'b11);   // assert 1 cycle in 4\n    end\n\nalways @(posedge clk or negedge rst_n)\n    if (!rst_n)       counter <= 8\'h00;\n    else if (tick)    counter <= counter + 1\'b1;  // same clk tree',
        explanation: [
          'The anti-pattern puts real flops on a signal generated by a single flop — skew and drive problems, and timing analysis now depends on a generated-clock constraint being written.',
          'The preferred form keeps every flop on the primary clock and slows the *update rate* with an enable: same architectural behavior, clean clock tree, ordinary setup/hold checks.',
          'The enable path (tick) is itself a normal timing path — no special constraints, no exceptions, nothing to forget.',
          'Rule of thumb: if you can express it as an enable, you should; generated clocks are for when you genuinely cannot (IP, external pins, real multi-clock designs).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Parent and divide-by-2 generated clock (educational waveform, illustrative)',
        content:
          'sys_clk   __    __    __    __    __    __\n             |__|  |__|  |__|  |__|  |__|  |__|\n          0  5   10   15   20   25   30\n\ndiv2_clk  ________          ____________\n          |      |__________|          |____\n          0                 20                40\n\n  div2 period = 2 x 10 = 20 ns; edges land on every\n  other rising edge of sys_clk, phase-locked by -source.',
        caption: 'A generated clock inherits its phase from the parent: the tool knows div2 edges coincide with every second sys_clk edge, which is what makes cross-domain checks meaningful.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Leaving an internal divided clock undeclared because "it is slow, it will pass".',
        fix: 'Unconstrained means unanalyzed, not passed. Declare it as a generated clock; then the tool proves it passes — and catches the cross-domain paths you forgot existed.',
      },
      {
        mistake: 'Constraining a divided clock as a second independent create_clock.',
        fix: 'Two independent clocks have an unknown phase relationship, so the tool either ignores cross paths or assumes worst-case-everything. The generated-clock form declares the true parentage and the exact phase relation.',
      },
      {
        mistake: 'Writing clock frequencies in comments while the constraint says a different number.',
        fix: 'The tool reads only the constraint. Whenever the spec\'s frequency changes, change the constraint in the same commit and grep the constraint file during review — drift here invalidates every report generated since.',
      },
    ],
    guidedPractice: {
      title: 'Constrain a two-domain design',
      brief:
        'A design takes a 25 MHz board clock, divides it by 4 with a two-stage toggle divider, and runs a UART on the divided clock. Write the two constraint lines (primary + generated), state both periods, and compute the bit-period budget for 9600 baud on the divided clock.',
      starterCode:
        '# Primary:\ncreate_clock -period ____ -name sys_clk [get_ports clk]\n\n# Generated (divide by 4 via two toggle flops; -edges or -divide_by):\ncreate_generated_clock -name div4_clk \\\\\n    -source [get_ports clk] -divide_by ____ [get_pins div_ff2/Q]\n\n# sys_clk period = ____ ns;  div4_clk period = ____ ns\n# 9600 baud bit period on div4 = 1/9600 s = ____ us = ____ ns\n# -> bit period / div4 period = ____ clocks per bit (roughly)',
      expectedBehavior:
        'Primary period 40.0 ns (25 MHz); generated divide-by-4 period 160.0 ns (6.25 MHz). A 9600-baud bit period is 104.17 us = 104,167 ns ≈ 651 cycles of div4_clk — the oversampling arithmetic of the UART RTL, now checkable against a correctly declared clock.',
      hints: [
        'period(ns) = 1000 / frequency(MHz): 25 MHz → 40 ns exactly.',
        'A bit period of 104.17 us means the divisor logic must count about 651 divided-clock cycles — compare with your RTL\'s divisor constant.',
      ],
    },
    practiceExercises: [
      {
        title: 'Audit for unconstrained clocks',
        brief:
          'Given a report summary showing 3,142 analyzed paths and a design estimate of 8,000 flops, describe the audit you would run and the two most likely causes of the gap.',
        expectedBehavior:
          'Compare flop count with analyzed-path expectations, then inspect the constraint file for: (1) an undeclared internal clock (its domain contributes zero paths), and (2) paths cut by blanket exceptions (Module 02 lesson 3). Also confirm the tool version loaded the constraint file at all.',
        hints: [
          'Unanalyzed paths do not fail — they vanish. What makes paths vanish besides unconstrained clocks?',
          'A path count far below the flop count is a red flag in either direction: too few analyzed or too many cut.',
        ],
      },
      {
        title: 'From anti-pattern to enable',
        brief:
          'Take the ripple-clock anti-pattern code and rewrite it with a clock enable for a divide-by-8 rate. Then state which constraint lines the design now needs.',
        expectedBehavior:
          'A 3-bit phase counter producing a 1-in-8 enable, all flops on the primary clock; the constraint file now needs only the single create_clock — the generated-clock line disappears entirely.',
        hints: [
          'The enable asserts once per 8 cycles: compare the phase counter against its terminal value.',
          'Fewer clocks, fewer constraints, fewer review items — simplicity you can measure.',
        ],
      },
    ],
    assessment: {
      title: 'Clock definition checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'A design\'s internal divide-by-2 clock is not declared at all. What do the timing reports show for flops clocked by it?',
          options: [
            'Failing setup numbers',
            'Passing setup numbers with tiny slack',
            'No setup or hold results for those paths at all',
            'Hold results only',
          ],
          answer: 'No setup or hold results for those paths at all',
          explanation:
            'Unconstrained clocks are unanalyzed: those paths simply do not appear in the reports, which is far more dangerous than a visible failure — nothing prompts a fix.',
          hint: 'What can the tool check a path against if no clock is defined?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'In `create_clock -period 20.0 -name sys_clk [get_ports clk]`, what is the clock frequency?',
          options: ['20 MHz', '50 MHz', '200 MHz', '2 MHz'],
          answer: '50 MHz',
          explanation: 'Period 20 ns → frequency = 1000/20 MHz = 50 MHz. The period-to-frequency flip (and the ns/MHz unit pairing) is worth practicing until it is automatic.',
          hint: 'f(MHz) = 1000 / T(ns).',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'Declaring a divided clock as an independent second create_clock (rather than a generated clock) preserves the correct phase relationship for cross-domain paths.',
          answer: 'false',
          explanation:
            'Independent clocks have no declared phase relation, so cross paths are treated as unrelated (ignored or worst-cased incorrectly). The generated-clock form is what encodes the true 2:1 alignment.',
          hint: 'What does -source buy you besides the period?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'What is the RTL-level alternative to clocking slow logic with a divided clock (two words)?',
          answer: 'clock enable',
          explanation:
            'Keep all flops on the primary clock and gate the update with a 1-in-N enable pulse: same behavior, no derived clock tree, no generated-clock constraint needed.',
          hint: 'The Verilog course taught it alongside counters.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'create_clock', definition: 'Defines a primary clock: period, name, waveform, attachment port — the anchor for all analysis.' },
      { term: 'Generated clock', definition: 'An internally derived clock declared with its parent source and ratio/divide factor, preserving phase relationships.' },
      { term: 'Waveform', definition: 'The rise/fall edge times within one period; encodes duty cycle for half-period paths.' },
      { term: 'Unconstrained clock', definition: 'A clock with no definition: its paths appear in no report — analysis by omission.' },
      { term: 'Clock enable', definition: 'The RTL alternative to divided clocks: one primary clock, updates gated by a 1-in-N pulse.' },
    ],
    revisionSummary: [
      'create_clock defines period, name, waveform and attachment; every report number derives from it.',
      'Unconstrained clocks produce no checks at all — "too clean" reports are audited for them first.',
      'Divided clocks must be declared as generated clocks with -source and ratio, preserving phase for cross-domain checks.',
      'Prefer clock enables over RTL divided clocks whenever possible: one clock tree, ordinary constraints.',
      'Virtual clocks (no port) exist to anchor I/O timing — the subject of the next lesson.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Yosys open synthesis suite documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'sta-m02-l2',
    title: 'Input and Output Delay: Constraining the Board',
    summary:
      'The tool cannot see the PCB. Input and output delays are how you describe the outside world — the external logic\'s launch/capture behavior at each pin — so that the first and last millimetres of every path are actually timed.',
    objectives: [
      'Explain what set_input_delay and set_output_delay model, and why both -max and -min variants are needed.',
      'Compute the internal logic budget left by given I/O delays.',
      'Write I/O constraints against a virtual clock for a system-synchronous interface.',
      'Recognize the symptom of unconstrained I/O: paths to/from pins missing from reports.',
    ],
    whyItMatters:
      'The most common category of "it passed timing and failed on the board" is unconstrained or fictionally-constrained I/O. The tool happily reports zero-margin for pins it knows nothing about — meaning it checked nothing — and the interface that dies is the one connected to someone else\'s chip with real delays on both sides of the connector. I/O constraints are five minutes of arithmetic that make the pins real to the analyzer.',
    prerequisites: [
      'Clock constraints (previous lesson)',
      'Setup and hold checks (Module 1)',
    ],
    explanation:
      'A path does not start at your input pin — it starts in a flip-flop *inside the external device*, which launches data with its own clock-to-Q and its own board trace delay before the signal reaches your pin. `set_input_delay` describes that outside portion:\n\n```\nset_input_delay -max 4.0 -clock sys_clk [get_ports data_in*]\nset_input_delay -min 1.0 -clock sys_clk [get_ports data_in*]\n```\n\nThe `-max 4.0` says: after the clock edge (of the system clock shared with the external device), data can take up to 4.0 ns to appear at my pin. The `-min 1.0` says: it will not appear sooner than 1.0 ns. Everything after the pin is the tool\'s job. The internal budget for setup is then:\n\n```\nbudget = T - t_input_max - t_setup\n       = 10.0 - 4.0 - 0.3 = 5.7 ns   (for a 10 ns clock)\n```\n\nSo the internal combinational logic between the input pin and the first capture flop must be faster than 5.7 ns. For hold, the min number works the same way: the earliest the outside world can change the pin is 1.0 ns after the edge, and your internal minimum delay to the first flop must satisfy the hold check against that.\n\n`set_output_delay` mirrors it for pins driving the board:\n\n```\nset_output_delay -max 3.0 -clock sys_clk [get_ports data_out*]\nset_output_delay -min 0.5 -clock sys_clk [get_ports data_out*]\n```\n\n`-max 3.0` says: the receiving device plus board trace needs 3.0 ns of the period after my pin before its capture edge. Your internal path must therefore arrive at the pin by `T - 3.0 = 7.0 ns` (minus its setup). Where do these numbers come from? From the *other* chip\'s datasheet: its tCO (clock-to-output) and tSU/tH, plus the trace flight time — I/O constraints are transcribed from datasheets, never invented.\n\n**System-synchronous versus source-synchronous**, in one paragraph: when both chips share one clock (system-synchronous), the constraints above are correct and the skew between the two chips\' clock arrivals is folded into the delays. When the sending chip *also sends* a clock alongside the data (source-synchronous, like DDR memory interfaces), that forwarded clock gets its own create_clock/generated-clock treatment and the delays are relative to it. At this level, learn the system-synchronous form perfectly; recognize the other by name.',
    deepDive:
      '### Virtual clocks keep the model honest\n\nI/O delays need a clock to be relative to. When the board clock enters your chip on a dedicated pin, you can reference it directly; but many flows declare a `create_clock` with no port — a virtual clock — as the common timebase for external logic, then attach all input/output delays to it. The advantage: the virtual clock carries the external system\'s uncertainty (and can model clock skew between chips) without polluting your internal clock network definition. Both styles are correct; be consistent and document which you chose.\n\n### Why unconstrained I/O is silent\n\nA port with no input/output delay is an open timing question the tool resolves by *not asking*: paths from input pins to the first flop, and from the last flop to output pins, are skipped. The reports look clean because the questions were never posed. The audit is mechanical: for every port in the netlist (excluding clocks and power), an input delay (inputs) or output delay (outputs) must exist. Most teams generate this list from the top-level pin table so a new pin cannot appear unconstrained unnoticed.\n\n### The budget mindset\n\nI/O timing is budget accounting: the period is a pie, and every participant eats a slice — external launch (tCO + trace), your internal logic, capture setup, and clock relationships. The datasheet numbers you cannot change; your slice is the RTL and the routing. When an interface fails I/O timing, the question is always "whose slice grew, and can the pie be re-cut?" — faster protocol (smaller pie), better placement (smaller trace slice), or pipelining the pin-facing logic (smaller internal slice).',
    examples: [
      {
        title: 'A complete I/O constraint set with the budget arithmetic',
        language: 'text',
        code:
          '# System-synchronous interface, 10 ns clock shared with the peer.\n# Peer datasheet: tCO(max) = 3.6 ns, tCO(min) = 0.9 ns,\n#                 tSU = 0.4 ns, tH = 0.2 ns\n# Board trace: 0.4 ns each way (from the board stackup)\n\ncreate_clock -period 10.0 -name sys_clk [get_ports clk]\n\nset_input_delay  -max 4.0 -clock sys_clk [get_ports data_in*]\n#   = 3.6 tCO + 0.4 trace\nset_input_delay  -min 1.3 -clock sys_clk [get_ports data_in*]\n#   = 0.9 tCO + 0.4 trace\n\nset_output_delay -max 3.8 -clock sys_clk [get_ports data_out*]\n#   = 0.4 trace + 0.4 tSU(peer) + 3.0 ns of peer-internal path\n#     (from the peer\'s datasheet/accompanying app note)\nset_output_delay -min 0.6 -clock sys_clk [get_ports data_out*]\n#   = 0.4 trace + 0.2 tH(peer)\n\n# INTERNAL BUDGETS (t_setup = 0.3, t_hold = 0.25 for your flops):\n# input side setup:  10.0 - 4.0 - 0.3      = 5.7 ns of internal logic\n# output side setup: 10.0 - 3.8 - 0.3      = 5.9 ns of internal logic',
        explanation: [
          'Every delay traces to a datasheet number plus a trace number — nothing is invented; the comments ARE the derivation, and reviewers check them.',
          'The -min numbers use the peer\'s fastest launch (tCO min), because hold analysis needs the earliest possible arrival.',
          'The output -max includes the peer\'s own internal path requirement (3.0 ns here) when the datasheet/app note states it — sometimes only tSU is given, and then the delay is trace + tSU.',
          'The final budgets (5.7 / 5.9 ns) are the numbers your RTL architects design against — pins are not free.',
        ],
      },
      {
        title: 'What unconstrained I/O looks like in a report',
        language: 'text',
        code:
          '# Path summary excerpt:\n#   reg2reg paths analyzed : 4,208   (setup + hold, all corners)\n#   in2reg paths analyzed  : 0       <-- input pins unconstrained\n#   reg2out paths analyzed : 0       <-- output pins unconstrained\n#   in2out paths analyzed  : 0\n#\n# The tool reports "All user specified timing constraints are met"\n# because it checked everything it was TOLD about. The pins were\n# never mentioned, so no question about them was ever asked.',
        explanation: [
          'The zero counts are the symptom: not failures, absences.',
          'The green summary sentence is technically true and practically misleading — this is why path-category counts belong in every timing review, not just worst slack.',
          'The fix is the mechanical audit: every non-clock port must appear in an input_delay or output_delay constraint.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'What input delay represents',
        content:
          '   PEER CHIP                          YOUR CHIP\n  +----------+   trace    +---------------------------+\n  | FF -->pad|---0.4ns--->|pin--> logic --> FF        |\n  +----^-----+            +-----------------^---------+\n       | sys_clk (shared, 10 ns)                  sys_clk\n       |\n   tCO 0.9..3.6\n\n  input delay  = tCO + trace  = 1.3 .. 4.0 ns\n  YOUR budget  = 10.0 - 4.0 - t_setup = 5.7 ns of internal logic',
        caption: 'The input path starts inside the peer chip. Input delay hands the tool the peer\'s launch numbers so your internal slice can be checked against the real budget.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Setting input/output delay to zero "because the pin is nearby".',
        fix: 'Zero delay claims the outside world launches with clock-to-Q of zero — physically impossible. Even a rough estimate beats zero, and the peer datasheet gives the real number in minutes.',
      },
      {
        mistake: 'Constraining only -max and forgetting the -min (hold) side of I/O.',
        fix: 'Each pin needs both: -max feeds the setup check, -min feeds the hold check at the boundary. A pin with only -max is half-checked and can corrupt data on exactly the fast corner.',
      },
      {
        mistake: 'Inventing I/O delays to make a failing interface pass.',
        fix: 'I/O delays are transcriptions from datasheets and stackups. If the interface cannot meet its real numbers, the fix is architectural (pipeline the boundary, re-cut the budget) — not editing the fiction until it agrees.',
      },
    ],
    guidedPractice: {
      title: 'Budget an input interface',
      brief:
        'A 60 MHz system (T = 16.67 ns... use 16.7) receives 8 bits from a peer with tCO(max) = 5.2 ns, tCO(min) = 1.1 ns; trace 0.3 ns; your flops: t_setup 0.35, t_hold 0.3. Write the four constraint lines and compute your internal setup budget.',
      starterCode:
        '# set_input_delay -max ____ -clock sys_clk [get_ports data_in*]\n# set_input_delay -min ____ -clock sys_clk [get_ports data_in*]\n#\n# internal setup budget = 16.7 - ____ - 0.35 = ____ ns',
      expectedBehavior:
        '-max = 5.2 + 0.3 = 5.5; -min = 1.1 + 0.3 = 1.4. Internal setup budget = 16.7 - 5.5 - 0.35 ≈ 10.85 ns. The slow peer eats a third of the period before your logic even starts — exactly the insight the exercise exists for.',
      hints: [
        'Both delays are peer-plus-trace: add, do not multiply or average.',
        'The budget shrinks by the -max number and your setup — the min number plays no part in the setup side.',
      ],
    },
    practiceExercises: [
      {
        title: 'Constrain a simple bus interface completely',
        brief:
          'A design has: clk in, 8-bit data_in, 8-bit data_out, and a frame sync input. Write the full constraint file (clock, all I/O delays with -max/-min) from a peer datasheet you invent *realistically* (state your numbers), and compute both internal budgets.',
        expectedBehavior:
          'A five-constraint file where every number cites its source; budgets computed for both directions; the frame sync treated as data (input delay), not as a clock.',
        hints: [
          'Realistic tCO values are 1-6 ns; tSU/tH are 0.1-0.5 ns; traces 0.1-0.5 ns per inch of FR4 roughly — pick and defend.',
          'Ask yourself for each pin: is this a clock, or data relative to a clock? Only clocks get create_clock.',
        ],
      },
      {
        title: 'Re-cut a failing budget',
        brief:
          'Your output-side internal budget is 2.1 ns and the logic needs 3.4 ns. List three legitimate recourses in order of preference, and one illegitimate one you refuse.',
        expectedBehavior:
          'Legitimate: pipeline the output path (register the last stage), reduce the peer-side slice by renegotiating timing/budget (rarely available), or lower the interface frequency. Illegitimate: shrinking the output-delay constraint without a datasheet basis.',
        hints: [
          'The cheapest fix is nearly always a register stage you control.',
          'Which number in the budget is *your* silicon, and which is someone else\'s promise?',
        ],
      },
    ],
    assessment: {
      title: 'I/O constraints checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'set_input_delay -max 4.0 means, precisely:',
          options: [
            'The input pin may be unstable for 4.0 ns after the clock edge',
            'External logic presents valid data at the pin no later than 4.0 ns after the reference clock edge',
            'Your internal logic has 4.0 ns of delay',
            'The input must be held 4.0 ns before the clock edge',
          ],
          answer: 'External logic presents valid data at the pin no later than 4.0 ns after the reference clock edge',
          explanation:
            'Input delay models the outside portion of the path: the peer\'s clock-to-output plus trace. Your internal budget is what REMAINS after it — 4.0 ns is spent before your silicon begins.',
          hint: 'Whose delay is being described, and on which side of the pin?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt:
            'T = 10 ns, set_output_delay -max = 3.0, your last flop has t_setup equivalent... the internal path (flop to pin) is checked to arrive by what time?',
          code: 'internal arrival budget = T - output_delay_max\n                          = 10.0 - 3.0',
          options: ['3.0 ns', '7.0 ns', '10.0 ns', '13.0 ns'],
          answer: '7.0 ns',
          explanation:
            'The peer needs its 3.0 ns slice of the period after your pin; whatever remains (7.0 ns, before even counting clock relationships) is the latest your internal path may take to reach the pin.',
          hint: 'The pie gets eaten from both ends.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'A design with no input or output delay constraints will report setup violations on all pin paths.',
          answer: 'false',
          explanation:
            'It reports nothing for those paths — they are not analyzed. Silence, not failure, is the danger of unconstrained I/O; the audit is per-port coverage, not per-path slack.',
          hint: 'What does the tool do with a question it was never asked?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'What document is the authoritative source for a peer chip\'s tCO and setup/hold numbers (one word)?',
          answer: 'datasheet',
          explanation:
            'I/O delays are transcriptions of the peer\'s datasheet numbers plus board trace delays. Constraints inherit their authority from their sources — cite them in comments.',
          hint: 'The PDF you keep meaning to read section 6 of.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Input delay', definition: 'The external portion of an input path (peer tCO + trace), declared with -max for setup and -min for hold.' },
      { term: 'Output delay', definition: 'The external portion of an output path (trace + peer setup + peer internal budget), likewise -max/-min.' },
      { term: 'Virtual clock', definition: 'A clock with no port attachment, used as the timebase for external logic in I/O constraints.' },
      { term: 'System-synchronous', definition: 'Interface style where both chips share one clock; the default model for basic I/O constraints.' },
      { term: 'I/O budget', definition: 'The internal logic allowance left after external delays: T - external_max - setup for each pin path.' },
    ],
    revisionSummary: [
      'Input/output delays describe the board-side portion of pin paths; the tool times only what it is told about.',
      'Every pin needs -max (setup) and -min (hold) variants; datasheet + trace are the only legitimate sources.',
      'Internal budget = T - external_max - t_setup; pins consume period before your logic starts.',
      'Unconstrained I/O shows as zero analyzed in2reg/reg2out paths — audit per-port, not per-slack.',
      'System-synchronous shares a clock; source-synchronous forwards one — learn the first perfectly, recognize the second.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Wikipedia — Source synchronous', url: 'https://en.wikipedia.org/wiki/Source_synchronous', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'sta-m02-l3',
    title: 'Timing Exceptions: False Paths and Multicycle Paths',
    summary:
      'The most powerful and most dangerous lines in a constraint file: set_false_path and set_multicycle_path — what they legitimately fix, the bug story they caused when misused, and the review discipline that keeps them honest.',
    objectives: [
      'State what a timing exception does: removes or relaxes a specific check the tool would otherwise perform.',
      'Write a targeted false path for a clock-domain crossing through a synchronizer — and explain why the blanket form is a bug.',
      'Apply a multicycle path to a genuinely multi-cycle interface and name the hold-check adjustment it implies.',
      'Apply the review discipline: every exception cites a reason, an owner, and a scope as narrow as possible.',
    ],
    whyItMatters:
      'Exceptions are the only constraints that can make a failing design "pass" without changing a single gate. That power makes them the most abused line in timing: every year, silicon fails because someone quieted a real path with a false path or a too-generous multicycle. Interviews and code reviews probe exception discipline precisely because it is where timing knowledge meets engineering ethics: the tool obeys you; correctness is your responsibility.',
    prerequisites: [
      'Clock constraints and generated clocks (lesson 1)',
      'Setup and hold checks (Module 1)',
    ],
    explanation:
      'A **timing exception** tells the tool: *do not check this path the default way*. The two workhorses:\n\n```\nset_false_path -from [get_clocks clk_a] -to [get_clocks clk_b]\nset_multicycle_path 4 -setup -from [get_pins ...] -to [get_pins ...]\n```\n\n`set_false_path` removes the check entirely for the matched paths. `set_multicycle_path` relaxes it: the `4 -setup` above allows the data four clock periods instead of one to reach its capture flop.\n\n**The legitimate uses.** False paths are correct for paths that are *functionally impossible or timing-irrelevant*: the classic is a signal crossing from clock domain A into domain B **through a two-flop synchronizer** — the timing at the synchronizer\'s first flop is meaningless by design (you expect metastability and resolve it), so the check is cut *for that crossing specifically*, and the synchronizer\'s own output path is timed normally. Another: test-mode-only structures, or registers written only during configuration while the functional clock is stopped.\n\nMulticycle paths are correct when the *architecture guarantees* multiple cycles: a divide-by-4 strobe that updates a register once every four cycles gives the data path four periods of real, spec-guaranteed time. The constraint is a *description of the architecture*, not a wish.\n\n**The bug story.** A team had a failing path between `clk_a` (48 MHz) and `clk_b` (100 MHz) domains. An engineer, under schedule pressure, added:\n\n```\nset_false_path -from [get_clocks clk_a] -to [get_clocks clk_b]\n```\n\nTiming went green. The path that was failing was, in fact, a *synchronized handshake* — req toggling through a proper synchronizer — but the blanket exception cut **every** clk_a-to-clk_b path, including a status bus that crossed domains with no synchronizer at all. The status bus was sampled mid-transition; on silicon, the block intermittently read a half-updated status word and locked up. The post-mortem sentence that should hang above every constraint file: *the exception silenced the messenger, not the problem.* The correct constraint was:\n\n```\nset_false_path -to [get_pins sync_ff_a/D]   # only the sync input\n```\n\ncutting exactly the crossing that is safe by construction and leaving every other cross-domain path checked (where it would have caught the unsynchronized bus).\n\n**Multicycle arithmetic and the hold adjustment.** `set_multicycle_path 4 -setup` moves the setup capture edge from n+1 to n+4. By default, the hold check moves with it in a way that is usually too generous; the standard companion is `-hold` (e.g. `set_multicycle_path 3 -hold`) to keep the hold check anchored at the launch edge — the classic pattern is "N -setup" with "N-1 -hold". The exact numbers depend on the tool\'s default edge arithmetic, which is why the discipline below requires the writer to state, in a comment, which edges each check now uses.',
    deepDive:
      '### Why exceptions must be narrow: precedence and accumulation\n\nExceptions compose: a path matched by multiple constraints follows the most specific/last-applied one (rules vary by tool), and a blanket `-from clk_a -to clk_b` silently absorbs every later path added between those domains for the life of the project. New RTL plus old blanket exception equals unanalyzed paths nobody remembers cutting. Target the smallest object that covers the real situation: a pin (`sync_ff_a/D`), a cell, a specific register pair — never a clock pair when a pin will do.\n\n### The exception review discipline\n\nTreat every exception like a code change with a paper trail:\n\n1. **Reason** — a comment stating the architectural justification (synchronizer, guaranteed strobe, test-only).\n2. **Owner** — a name that will answer the question in bring-up.\n3. **Scope** — the narrowest object list that covers the reason.\n4. **Review** — exceptions are diffed in every timing review, exactly like RTL. A constraint file is code.\n\nThe smell test for a multicycle: can you point to the *hardware mechanism* (strobe, handshake state) that guarantees the extra cycles for EVERY value the path carries? If the guarantee is "software usually updates it slowly", that is not a mechanism — it is a hope with a constraint attached.\n\n### What exceptions are NOT for\n\nNot for: paths that fail and you believe they should pass ("it worked on the last chip"); paths that are slow but functional (use a real fix); quieting a noisy report (narrow the constraint or fix the analysis); or anything you cannot explain in one sentence to a reviewer. If the sentence does not exist, the exception does not get written.',
    examples: [
      {
        title: 'The wrong way, then the right way',
        language: 'text',
        code:
          '# BUG (blanket cut — silences every a->b path):\nset_false_path -from [get_clocks clk_a] -to [get_clocks clk_b]\n\n# CORRECT (cut only the synchronizer input crossing):\n#   reason: 2-FF synchronizer input; metastability expected and\n#           resolved by construction (see RTL sync2ff_a)\n#   owner:  J. Engineer, reviewed 2026-10-12\nset_false_path -to [get_pins sync2ff_a/ff0/D]\nset_false_path -to [get_pins sync2ff_a/ff1/D]\n\n# EFFECT:\n#   - the synchronized crossings: unanalyzed BY DESIGN (correct)\n#   - every other clk_a -> clk_b path: still checked\n#     -> an unsynchronized status bus would FAIL timing review\n#        instead of shipping silently broken',
        explanation: [
          'The blanket form is one line shorter and categorically more dangerous: it cuts paths that do not exist yet at write time.',
          'The targeted form names the synchronizer flops themselves — the pin-level objects where the crossing actually happens.',
          'The comment block is not decoration; it is the review artifact that makes the exception auditable a year later.',
          'Note the asymmetry of outcomes: both forms make today\'s report green; only one keeps tomorrow\'s bugs visible.',
        ],
      },
      {
        title: 'A legitimate multicycle, with its hold companion',
        language: 'text',
        code:
          '# Architecture: a divide-by-4 strobe loads config_reg exactly once\n# every 4 cycles; the datapath into it has 4 guaranteed periods.\n#\n#   reason: update strobe asserts 1-in-4 cycles (RTL: cfg_strobe)\n#   owner:  design lead, reviewed 2026-10-12\n#   edges:  setup capture moves n+1 -> n+4; hold anchored at launch\nset_multicycle_path 4 -setup \\\\\n    -from [get_pins calc_ff*/Q] -to [get_pins config_reg*/D]\nset_multicycle_path 3 -hold \\\\\n    -from [get_pins calc_ff*/Q] -to [get_pins config_reg*/D]\n\n# Sanity check the claim in RTL: does cfg_strobe really gate the load\n# for EVERY operating mode? If any mode loads every cycle, this\n# exception is a latent field failure.',
        explanation: [
          'The setup exception grants four periods; the hold companion (N-1 = 3) keeps the hold check from floating to a far edge — the standard pairing.',
          'The sanity-check comment is the process working: the constraint is only as good as the RTL guarantee, and the guarantee must be re-checked when the RTL changes.',
          'If the strobe is later removed during a refactor, this exception must be deleted in the same commit — put it on the review checklist.',
        ],
      },
    ],
    tables: [
      {
        caption: 'Exception legitimacy at a glance',
        headers: ['Situation', 'Correct action', 'Why'],
        rows: [
          ['Signal crosses domains via 2-FF synchronizer', 'false_path to the sync flop\'s D pins', 'Metastability expected; resolved by structure'],
          ['Path updated by a 1-in-N strobe (RTL guarantee)', 'multicycle N -setup, (N-1) -hold', 'Architecture grants N real periods'],
          ['Test-mode-only mux paths', 'false_path with -through or conditional scope', 'Never exercised in functional mode'],
          ['Path fails and you believe it should pass', 'investigate; fix or re-derive constraint', 'Exceptions are not optimism switches'],
          ['Unsynchronized crossing "that is slow anyway"', 'add a synchronizer in RTL', 'No constraint makes an unsafe crossing safe'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Blanket false paths between clock domains instead of targeting synchronizer inputs.',
        fix: 'Cut the sync flop\'s D pin, not the clock pair. The blanket form is how unsynchronized buses ship broken while reports stay green — it is the single most damaging line in constraint history.',
      },
      {
        mistake: 'Granting a multicycle without the hold companion.',
        fix: 'The -setup move can drag the hold check to an edge that no longer represents the real risk. Pair N -setup with N-1 -hold unless you can state, edge by edge, why the default hold is already right.',
      },
      {
        mistake: 'Exceptions without owners, reasons, or expiry awareness.',
        fix: 'Every exception carries a comment (reason), a name (owner), and appears in the timing-review diff. Constraint files are code — review them like code.',
      },
    ],
    guidedPractice: {
      title: 'Write the narrow exception',
      brief:
        'A design has clk_a and clk_b domains. Crossings: (1) a pulse through 2-FF sync chain `sA`; (2) an 8-bit status bus going straight from a clk_a register into a clk_b register with no synchronizer. Path (2) fails setup. Write the exception for (1), and prescribe the action for (2).',
      starterCode:
        '# For crossing (1) — the synchronized one:\n# set_false_path -to [get_pins ____/____/D]\n#\n# For crossing (2) — the unsynchronized bus:\n# action: ____',
      expectedBehavior:
        'Exception targets sA\'s first (and optionally second) flop D pins only. Crossing (2) gets RTL work: a proper CDC structure (synchronizer/handshake per Module 04) — never a false path, because no constraint makes an unsynchronized multi-bit crossing safe.',
      hints: [
        'Which object is smaller: the clock pair, or one flop\'s D pin?',
        'Ask what a false path on (2) would do to the failure you can currently SEE.',
      ],
    },
    practiceExercises: [
      {
        title: 'Audit an inherited constraint file',
        brief:
          'You join a project and find: one blanket clk_a-to-clk_b false path; one 16-cycle multicycle on a "slow config bus"; no comments anywhere. List the exact questions you ask and the artifacts you demand before trusting either line.',
        expectedBehavior:
          'For the blanket cut: which crossings existed then vs now; where are the synchronizers; re-check every cross-domain path once narrowed. For the multicycle: the RTL mechanism guaranteeing 16 cycles in every mode; the hold companion\'s existence; who owns it. Demand: comments, owners, and a diff history of the constraint file.',
        hints: [
          'A constraint without a comment is a claim without an argument.',
          'Both lines "work" — the audit question is what they might be hiding.',
        ],
      },
      {
        title: 'Multicycle arithmetic on paper',
        brief:
          'A 50 MHz clock (T = 20 ns), a datapath needing 62 ns, strobed every 4 cycles. Compute: default setup budget, multicycle-4 budget, and whether the path meets timing after the correct exception pair. Also state the hold companion line.',
        expectedBehavior:
          'Default budget ≈ 20 - setup ≈ 19.6 ns (fails vs 62). Multicycle-4 budget ≈ 4 x 20 - setup ≈ 79.6 ns — meets with ~17.6 ns margin. Companion: set_multicycle_path 3 -hold on the same -from/-to.',
        hints: [
          'The multicycle multiplies the period available, not the delay.',
          'Remember the N-1 -hold pairing, and be ready to say why in one sentence.',
        ],
      },
    ],
    assessment: {
      title: 'Timing exceptions checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'What is the essential difference between set_false_path and set_multicycle_path?',
          options: [
            'False path removes the check; multicycle relaxes it to N periods',
            'False path is for hold; multicycle is for setup',
            'Multicycle removes the check for N cycles',
            'They are synonyms from different tool vendors',
          ],
          answer: 'False path removes the check; multicycle relaxes it to N periods',
          explanation:
            'False path = no check at all for matched paths. Multicycle = still checked, against a longer, architecture-guaranteed window. One deletes the question; the other answers it differently.',
          hint: 'Which one still produces a slack number?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'bug-identification',
          prompt:
            'What is wrong with this constraint, given the design has a 2-FF synchronizer `syncA` for the crossing and several OTHER clk_a-to-clk_b paths?',
          code: 'set_false_path -from [get_clocks clk_a] -to [get_clocks clk_b]',
          options: [
            'Nothing — this is the standard CDC constraint',
            'It cuts every cross-domain path, including unsynchronized ones, instead of just the synchronizer input',
            'The -from/-to order is reversed',
            'It should be a multicycle path instead',
          ],
          answer: 'It cuts every cross-domain path, including unsynchronized ones, instead of just the synchronizer input',
          explanation:
            'The correct target is the sync flop\'s D pin. The blanket clock-pair form makes the whole domain pair invisible to analysis — green reports, red silicon, and the classic post-mortem.',
          hint: 'Count the paths this line matches, not the one the author meant.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'A multicycle path constraint is legitimate when software *usually* writes the register slowly, even if hardware allows faster writes.',
          answer: 'false',
          explanation:
            'The guarantee must be structural — an RTL mechanism (strobe, handshake) that holds for every mode and every value. "Software usually" is a hope, not a mechanism, and hopes do not survive integration.',
          hint: 'What enforces the guarantee when the software changes?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In the standard pairing, an N -setup multicycle is accompanied by what -hold value (expression in terms of N)?',
          answer: 'N-1',
          explanation:
            'The N-1 -hold companion keeps the hold check anchored at the launch edge when the setup capture edge moves to n+N — the default hold arithmetic otherwise drifts with the relaxed setup.',
          hint: 'One less than the setup multiplier.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Timing exception', definition: 'A constraint that removes (false path) or relaxes (multicycle) a specific timing check.' },
      { term: 'False path', definition: 'Removes the check for matched paths — legitimate only for structurally timing-irrelevant crossings.' },
      { term: 'Multicycle path', definition: 'Grants N periods for setup (with an N-1 hold companion) when the architecture guarantees them.' },
      { term: 'Blanket exception', definition: 'A clock-pair-scoped exception that silently covers future paths; the canonical constraint bug.' },
      { term: 'Exception review', definition: 'Discipline treating exceptions as code: reason, owner, narrow scope, diffed at every review.' },
    ],
    revisionSummary: [
      'Exceptions make failing designs pass without changing hardware — the most powerful and most abused constraint lines.',
      'False paths target synchronizer input pins (or test-only structures), never blanket clock pairs.',
      'Multicycle N -setup pairs with N-1 -hold, and requires an RTL mechanism guaranteeing N cycles in every mode.',
      'Every exception carries a reason, an owner, and the narrowest scope that covers it; constraint files are reviewed like code.',
      'No exception makes an unsafe crossing safe — that fix belongs in RTL (Module 04).',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Wikipedia — Clock domain crossing', url: 'https://en.wikipedia.org/wiki/Clock_domain_crossing', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
