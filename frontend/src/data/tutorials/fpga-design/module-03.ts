import type { TutorialLesson } from '../types';

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'fpga-m03-l1',
    title: 'Pin Constraints and I/O Planning',
    summary:
      'Tell the tools which physical pin carries which port: constraint-file concepts, XDC/LPF syntax sketches (labeled vendor-specific), I/O standards, and the planning pass that must precede any build.',
    objectives: [
      'Explain why RTL alone cannot place signals on pins, and what a pin constraint commits.',
      'Read and write the two essential pin-constraint ingredients: LOCATE (package pin) and IOSTANDARD (electrical standard).',
      'Plan I/O before building: bank voltages, pin types, and direction, using the board documentation as source of truth.',
      'Recognize the classic constraint failures: wrong pin, wrong standard, unconstrained port silently floating.',
    ],
    whyItMatters:
      'Every FPGA lab in Module 4 ends at real pins: a switch feeds a port, an LED drains one. The bitstream cannot guess that `led[0]` is package pin "D8" — someone must say so, in a constraint file, correctly, or the design drives a pin that goes nowhere (or worse, into something else). Misconstrained I/O is the single most common first-board failure, and the fix is a planning habit, not intelligence.',
    prerequisites: [
      'I/O blocks (fpga-m01-l3)',
      'Build pipeline stages (fpga-m02-l1)',
    ],
    explanation:
      'Your Verilog declares a port named `led[0]`. The fabric, after routing, can drive *any* I/O block on the die — the tools have no idea that on *your* board, the LED you want is soldered to a specific package ball. A **pin constraint** is the statement that binds a logical port to a physical pin. A complete pin constraint has two parts:\n\n**Location**: which package pin (a name like "A1", "D8", or a ball number from the device datasheet). This comes from your *board\'s* documentation — schematic or pinout table — never from the FPGA datasheet alone, because the board designer chose where to route each FPGA pin.\n\n**I/O standard**: the electrical behavior of that pin — for example `LVCMOS33` (3.3 V single-ended CMOS) or `LVCMOS15` (1.5 V), plus optional drive strength and pull-up/pull-down settings. The standard must match what the board actually wires to that pin and which I/O bank powers it; a wrong standard can mean a dead signal or, in bad cases, electrical stress.\n\n### Constraint syntax exists per tool, concepts per universe\n\nThe two dominant syntax shapes you will encounter: **XDC** (Xilinx-style flows), where constraints are Tcl commands over design objects, and **LPF** (Lattice preference files), where they are declarations. The concepts — locate + standard + electrical attributes — are identical. On this platform there are no vendor tools, so we show *syntax sketches* clearly labeled vendor-specific, and we practice the transferable skill: reading a board pinout and producing a complete, checked constraint table.\n\n### The planning pass\n\nBefore any build: list every top-level port; for each, find the board pin from the board documentation; note the I/O standard implied by the board\'s supply for that bank; record direction. That table *is* your constraints file, checked once, trusted forever. Every FPGA lab in this course begins with that table.',
    deepDive: '### Where the pin table comes from\n\nBoard vendors publish a schematic and a pin-assignment table mapping board features (LED0, SW1, header J4 pin 3) to FPGA package pins and I/O standards. This is the authority — not the FPGA datasheet (which lists which pins *can* do what) and not blog posts (which describe *their* board). The professional sequence is: board doc -> pin table -> constraint file, and any discrepancy between a tutorial and your board is resolved in favor of *your* board\'s documentation. Board revisions change pins silently; a pin table from the wrong revision is a classic multi-hour hunt.\n\n### Banks and why standards cannot be mixed freely\n\nFPGA I/O pins are grouped into **banks**, each powered by its own supply rail (VCCO). All pins in one bank must use standards compatible with that rail — you cannot run LVCMOS33 and LVCMOS15 side by side in the same bank. This is why the planning pass notes the bank for each pin: a design that scatters 3.3 V and 1.5 V signals carelessly may be electrically infeasible no matter what the constraint file says. Input-only pins also support additional standards (e.g., some differential or higher-voltage input standards) — another reason the standard column comes from the board doc, not from habit.',
    examples: [
      {
        title: 'Pin constraint sketches — vendor-specific syntax, teaching labels',
        language: 'text',
        code:
          '## ------------------------------------------------------------------\n## SKETCH ONLY: two vendor syntax families, shown for shape recognition.\n## Pin names/standards are placeholders; real values come from YOUR\n## board documentation. Do not copy pin names into a real design.\n## ------------------------------------------------------------------\n\n## --- XDC-style (Tcl commands over design objects) ---\nset_property -dict { PACKAGE_PIN "P_LED0" IOSTANDARD LVCMOS33 } [get_ports {led[0]}]\nset_property -dict { PACKAGE_PIN "P_SW0"  IOSTANDARD LVCMOS33 } [get_ports {sw[0]}]\nset_property -dict { PACKAGE_PIN "P_CLK"  IOSTANDARD LVCMOS33 } [get_ports {clk_50m}]\n\n## --- LPF-style (declarations) ---\nLOCATE COMP "led[0]" SITE "P_LED0" ;\nIOBUF COMP "led[0]" IOSTANDARD=LVCMOS33 DRIVE=8 ;\nLOCATE COMP "sw[0]" SITE "P_SW0" ;\nIOBUF COMP "sw[0]" IOSTANDARD=LVCMOS33 PULLUP=ON ;\n\n## --- The real artifact this lesson trains: the planning table ---\n## Port     Direction  Board feature   Package pin (from board doc)  Standard   Bank\n## clk_50m  in         osc X1          (look up)                     LVCMOS33   (look up)\n## sw[3:0]  in         SW0..SW3        (look up)                     LVCMOS33   (look up)\n## led[5:0] out        LED0..LED5      (look up)                     LVCMOS33   (look up)',
        explanation: [
          'Both syntaxes commit exactly two facts per pin: WHERE (package pin) and HOW (electrical standard, plus options like drive or pull).',
          'The XDC form is a Tcl command binding a property dictionary to a port object; the LPF form is a flat declaration per component. Neither is "better" — they are different tools\' dialects of the same statement.',
          'The uppercase placeholder pin names ("P_LED0") are deliberate: inventing real-looking pin names would teach the wrong habit, since real values are board-specific.',
          'The planning table at the bottom is the tool-independent artifact this course requires for every lab: port, direction, board feature, pin from the board doc, standard, bank.',
          'Drive strength (DRIVE=8 means 8 mA-class output drive) and pull resistors (PULLUP for idle-high buttons) are the common electrical options; their exact spelling varies by tool.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'From board feature to bitstream pin',
        content:
          '  Board schematic            Planning table          Constraint file          Bitstream\n  -------------               ---------------         ----------------         ---------\n  "LED0 net connects   -->   led[0] out, pin X,  --> LOCATE/PACKAGE_PIN --> I/O block at\n   to FPGA ball X,          LVCMOS33, bank 2         + IOSTANDARD             pin X, 3.3V CMOS\n   3.3V bank"                                                                 drive set',
        caption:
          'Authority flows left to right: board documentation constrains the plan; the plan becomes the constraint file; the tool just obeys.',
      },
    ],
    tables: [
      {
        caption: 'Common single-ended I/O standards (verify your board before use)',
        headers: ['Standard', 'VCCO rail', 'Typical use', 'Notes'],
        rows: [
          ['LVCMOS33', '3.3 V', 'Generic hobby/dev-board I/O', 'Most common on small dev boards'],
          ['LVCMOS15', '1.5 V', 'DDR-class and misc low-voltage I/O', 'Bank rail must be 1.5 V'],
          ['LVCMOS18', '1.8 V', 'Low-power peripherals', 'Check bank compatibility'],
          ['SSTL / DDR families', 'per class', 'Memory interfaces', 'Termination requirements apply'],
          ['LVDS (differential pairs)', '2.5 V-class per family', 'High-speed serial-ish links', 'Paired pins, input-side preference'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Copying pin numbers from a tutorial or another board.',
        fix: 'Pin assignments are board facts, not family facts. Two boards with the identical FPGA can wire LEDs to entirely different balls. Always derive pins from your board\'s documentation, at the revision you actually hold.',
      },
      {
        mistake: 'Leaving a port unconstrained and assuming the tool will pick "a sensible pin".',
        fix: 'Most flows either error out or assign an arbitrary pin — arbitrary meaning the signal may land on an unconnected ball or something electrically live on your board. Constrain every top-level port, every time, and treat "unconstrained port" warnings as errors.',
      },
      {
        mistake: 'Setting an I/O standard the bank cannot support (e.g., LVCMOS15 on a 3.3 V-banked pin).',
        fix: 'Check the bank\'s VCCO on the board schematic before choosing a standard. The standard must match both the board wiring and the bank rail; if your plan needs mixed rails in one bank, the plan is wrong, not the constraint file.',
      },
    ],
    guidedPractice: {
      title: 'Build the planning table',
      brief:
        'A board documentation excerpt says: "User LEDs D1-D4 connect to FPGA pins 14, 15, 16, 17 (bank 0, VCCO = 3.3 V). User switches SW1-SW2 to pins 28, 29 (bank 1, VCCO = 3.3 V). 50 MHz oscillator to pin 43 (bank 0)." Produce the complete planning table for a top design with ports clk_50m, sw[1:0], led[3:0], including direction and standard for each.',
      starterCode:
        'Port     | Dir | Board feature | Pin | Standard | Bank\n---------|-----|---------------|-----|----------|-----\nclk_50m  |     |               |     |          |\nsw[0]    |     |               |     |          |\nsw[1]    |     |               |     |          |\nled[0]   |     |               |     |          |\nled[1]   |     |               |     |          |\nled[2]   |     |               |     |          |\nled[3]   |     |               |     |          |',
      expectedBehavior:
        'clk_50m: in, osc, 43, LVCMOS33, bank 0. sw[0]: in, SW1, 28, LVCMOS33, bank 1. sw[1]: in, SW2, 29, LVCMOS33, bank 1. led[0..3]: out, D1..D4, pins 14/15/16/17, LVCMOS33, bank 0. Every bank is 3.3 V so LVCMOS33 is compatible everywhere — the bank check passes.',
      hints: [
        'Map board features to ports in order; keep the sw/led indices consistent with your RTL.',
        'The standard must be compatible with the bank\'s VCCO — verify per row.',
        'Direction comes from the RTL, not the board.',
      ],
    },
    practiceExercises: [
      {
        title: 'Catch the constraint bug',
        brief:
          'A design defines ports sw[2:0] but the constraint file locates only sw[0] and sw[1]. Describe two possible outcomes at build time and the correct preventive habit.',
        expectedBehavior:
          'Outcomes: the flow errors on the unconstrained port, or it auto-assigns an arbitrary pin so sw[2] reads some random ball (possibly tied, floating, or connected to something else on the board). Prevention: constrain every port of every top-level design and treat unconstrained-port warnings as build-blocking errors.',
        hints: [
          'What does the tool know about "the third switch" without a constraint?',
          'Silent misbehavior is worse than a loud error — which outcome is the dangerous one?',
          'The habit is a completeness check on the planning table.',
        ],
      },
      {
        title: 'Bank conflict diagnosis',
        brief:
          'A colleague constraints one pin as LVCMOS15 and its neighbors as LVCMOS33 in the same bank, then reports "impossible I/O configuration". Explain the electrical reason and give two legitimate resolutions.',
        expectedBehavior:
          'A bank is powered by one VCCO rail; mixed 1.5 V and 3.3 V single-ended standards in one bank are not simultaneously legal. Resolutions: (1) move one signal group to a differently-powered bank (if the board routes it there), (2) change the design/board interface so all signals in that bank share one standard. The fix is a board-level or plan-level change, not a constraint-file hack.',
        hints: [
          'One bank = one VCCO supply rail.',
          'The tool is enforcing an electrical fact, not being pedantic.',
          'Both resolutions involve moving signals or unifying standards.',
        ],
      },
    ],
    assessment: {
      title: 'Pin constraints checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which two facts does a complete pin constraint commit for a top-level port?',
          options: [
            'Module name and instance name',
            'Package pin location and I/O standard',
            'Clock frequency and reset polarity',
            'Fanout and drive frequency',
          ],
          answer: 'Package pin location and I/O standard',
          explanation:
            'A pin constraint says WHERE the signal physically lands (package pin, from the board documentation) and HOW it behaves electrically (standard like LVCMOS33, plus optional drive/pull settings).',
          hint: 'Location plus electrical behavior.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Pin assignments can safely be copied from any tutorial that uses the same FPGA device family.',
          answer: 'false',
          explanation:
            'Pins are wired by the board designer, not determined by the device. Two boards with the same FPGA route LEDs, switches and clocks to different balls; only your board\'s documentation (at your revision) is authoritative.',
          hint: 'Same chip, different board, different wires.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Why can\'t one bank contain both an LVCMOS33 output and an LVCMOS15 output?',
          options: [
            'Because tools cannot parse two standards per bank',
            'Because a bank is powered by a single VCCO rail that both standards must match',
            'Because LVCMOS15 is input-only',
            'Because the bitstream would grow too large',
          ],
          answer: 'Because a bank is powered by a single VCCO rail that both standards must match',
          explanation:
            'All I/O in a bank share one supply rail. Mixing standards that assume different rails is electrically infeasible, so tools reject it. The fix is re-planning which signals live in which bank.',
          hint: 'It is a supply-rail fact, not a software rule.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: what is the name of the tool-independent table this course requires before writing any constraints — listing port, direction, board feature, pin, standard and bank?',
          answer: 'planning table',
          explanation:
            'The planning (I/O planning) table is produced from the board documentation before the constraint file; the constraint file is then just its syntactic transcription.',
          hint: 'It was named as "the planning pass" artifact.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Pin constraint', definition: 'Statement binding a logical port to a physical package pin (LOCATE/PACKAGE_PIN).' },
      { term: 'I/O standard', definition: 'Electrical behavior of an I/O pin (e.g., LVCMOS33), including drive/pull options.' },
      { term: 'I/O bank', definition: 'Group of I/O pins sharing one VCCO supply rail; standards within a bank must match it.' },
      { term: 'XDC / LPF', definition: 'Two vendor constraint-syntax families: Tcl-command style vs declaration style.' },
      { term: 'Planning table', definition: 'Port/direction/board-feature/pin/standard/bank table derived from board docs before constraining.' },
    ],
    revisionSummary: [
      'RTL ports mean nothing electrically until constrained to a pin and a standard.',
      'Pin values come from board documentation at your board revision — never from tutorials or the FPGA datasheet.',
      'One bank, one VCCO; mixed standards in a bank are electrically impossible.',
      'Constrain every top-level port; unconstrained-port warnings are errors in disguise.',
      'The planning table is the portable skill; XDC/LPF syntax is per-tool detail.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Field-programmable gate array', url: 'https://en.wikipedia.org/wiki/Field-programmable_gate_array', kind: 'article' },
      { label: 'Wikipedia — CMOS', url: 'https://en.wikipedia.org/wiki/CMOS', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'fpga-m03-l2',
    title: 'Clock Constraints: create_clock and the Timing Model',
    summary:
      'Define a clock so the tools can time every path against it: what create_clock commits, the setup/hold checking model it enables, and how input/output delays extend the model past the chip boundary.',
    objectives: [
      'Explain why timing analysis cannot begin until at least one clock is defined.',
      'Write the create_clock concept: period, name, and the port it applies to.',
      'Trace a setup check and a hold check on a register-to-register path with periods and margins.',
      'Describe input and output delays as the way off-chip timing enters the analysis.',
    ],
    whyItMatters:
      'Constraints are instructions to the timing engine. Without create_clock, the tools may not analyze your design\'s timing at all — placement proceeds blind, and your first timing report is a shrug. With it, every register-to-register path is automatically checked against your specification. This one line of constraint is the difference between "it compiled" and "it is verified at speed".',
    prerequisites: [
      'Setup/hold intuition from RTL methodology',
      'Pin constraints (fpga-m03-l1)',
    ],
    explanation:
      'Static timing analysis (Module 3\'s engine, and the VLSI course\'s sign-off tool) needs to know **what the clock is supposed to be** before it can check any path. That specification is the clock constraint. In XDC-style syntax its shape is:\n\n```\ncreate_clock -period 20.000 -name sys_clk [get_ports clk_50m]\n```\n\nRead it as: "the signal arriving at port `clk_50m` is a clock named `sys_clk` with period 20.000 ns (i.e., 50 MHz)." From this single declaration the tools derive: the clock\'s edges, which registers are clocked by it, and therefore every register-to-register path that must be checked.\n\n### The two checks every path gets\n\n**Setup check**: data launched by one clock edge must arrive at the destination flip-flop *before the next edge*, minus the flip-flop\'s setup time. Slack = required time − arrival time; positive slack means passing. This check guards against paths that are *too slow*.\n\n**Hold check**: data launched by an edge must not arrive at the destination *too quickly* — it must still be stable when the same edge\'s hold window at the destination has passed. Hold failures are caused by paths that are *too fast* (short paths), and unlike setup failures they cannot be fixed by slowing the clock.\n\nBoth checks happen automatically, per path, once clocks exist. The frequency you constrain is a specification you are asking the tools to *prove*, not a knob that makes the design faster: constraining 50 MHz makes the tools optimize and verify for 50 MHz.\n\n### Extending past the chip: I/O delays\n\nRegister-to-register paths are fully inside your design. Paths that start or end at pins also involve off-chip devices — a switch, an external ADC — with their own delays. **Input delay** states how long after the clock edge the external signal is valid at the pin; **output delay** states how much setup the external device needs relative to the clock. With those numbers (from the external device\'s datasheet and board trace delays), the tools extend the same setup/hold machinery across the chip boundary.',
    deepDive:
      '### What the tools do with your period\n\nThe constrained period is a target, and place-and-route is timing-driven by it: the placer reads it, and the router checks against it. Reporting then expresses results two ways: **slack** per path (required − arrival) and **Fmax**, the fastest clock the design could support (`1 / longest path`). If you constrain 20.000 ns and the critical path is 15.21 ns, the report shows slack +4.790 ns and Fmax ≈ 65.75 MHz. The habits this induces are Lesson m03-l3\'s subject. One more subtlety: constraining *slower than the board\'s oscillator* does not make a sloppy design safe — it only asks for less; the physical path delay is what it is.\n\n### Exceptions: false paths and multicycle paths, named honestly\n\nSome paths should not be timed at all: asynchronous crossings (properly structured with synchronizers — Module 5), configuration or test registers, or paths that legitimately take several clock cycles (a slow enable-gated bus). Constraints exist for these — false-path and multicycle exceptions — and they are powerful: a wrong exception *removes a check that would have caught a bug*. The beginner rule: add exceptions only when you can explain the circuit structure that makes them safe. On this platform we teach them conceptually and never require them for the Module 4 labs, which are single-clock designs.',
    examples: [
      {
        title: 'A minimal, honest constraint sketch (vendor-specific syntax)',
        language: 'text',
        code:
          '## SKETCH: XDC-style. Concepts port; exact syntax is tool-specific.\n## Board fact (from board docs): 50 MHz oscillator on pin P_CLK.\n\n## 1. The clock: name, period, port.\ncreate_clock -period 20.000 -name sys_clk [get_ports clk_50m]\n\n## 2. I/O electrical facts (from lesson m03-l1).\nset_property -dict { PACKAGE_PIN "P_LED0" IOSTANDARD LVCMOS33 } [get_ports {led[0]}]\n\n## 3. Off-chip timing, when the external device datasheet justifies it:\n##    switch -> FPGA: external device settles t_SWITCH ns after edge\nset_input_delay -clock sys_clk 10.000 [get_ports {sw[*]}]\n##    FPGA -> external LED register: external device needs t_SU ns\nset_output_delay -clock sys_clk 2.000 [get_ports {led[*]}]\n\n## What this file is NOT: it contains NO false paths or multicycle\n## exceptions -- Module 4 labs are single-clock and need none.',
        explanation: [
          'The create_clock line is the load-bearing one: period 20.000 ns = 50 MHz, name sys_clk, applied to the clock input port. Everything the timing engine does hangs off it.',
          'Pin/standard lines are Module 3 Lesson 1 content, shown to keep the whole constraint picture in one frame.',
          'Input delay 10.000 ns says: relative to a sys_clk edge, the external switch signal is not valid at the pin until 10 ns after — the tool then checks FPGA-internal setup against the remaining budget.',
          'Output delay 2.000 ns says: whatever the LED (or an external register) needs as setup after the edge; the tool back-this-out from the FPGA\'s allowed clock-to-out time.',
          'The explicit "no exceptions" note is the honesty habit: exceptions are added by engineers who can justify them, and this design needs none.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Setup and hold checks on one register-to-register path (educational waveform, illustrative)',
        content:
          'clk        |--|----|----|----|----|-->   (period T)\n              edge N     edge N+1\n\nFF1.Q   ------x\\\\____/\\\\^^^^^^--------------------   data changes at edge N\n                     \\\\__ arrival after CLK->Q + logic + route\nFF2.D                    ^^^^^^^^^^^^^^^^------   must be STABLE here\n                          <-- setup window -->\n                          before edge N+1\n\nSETUP:  arrival <= (N+1) - t_su        slack = required - arrival\nHOLD:   arrival >= (N)   + t_h         checks the data does not\n                                       change too soon (too-fast path)',
        caption:
          'Setup guards against slow paths (compare against the NEXT edge); hold guards against too-fast paths (compare against the SAME edge). Illustrative waveform — not a measured trace.',
      },
    ],
    tables: [
      {
        caption: 'The constraint vocabulary for clocks and I/O',
        headers: ['Constraint', 'Commits', 'Typical source of the number', 'Risk if wrong'],
        rows: [
          ['create_clock -period P', 'Clock name, period, port', 'Board oscillator frequency', 'No/incorrect timing analysis'],
          ['set_input_delay', 'External validity time after edge', 'External device datasheet + board', 'I/O paths unchecked or wrongly checked'],
          ['set_output_delay', 'External setup need after edge', 'External device datasheet + board', 'Same, for outputs'],
          ['set_false_path (advanced)', 'Path excluded from timing', 'Justified asynchronous structure', 'Silently unchecked real path'],
          ['set_multicycle_path (advanced)', 'Path allowed N cycles', 'Enable-gated multi-cycle logic', 'Over-constrained or under-checked logic'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming the tools "know" the board oscillator frequency and will time accordingly.',
        fix: 'The tools know nothing until told. Without create_clock (or a recognized auto-derived clock), most flows do not meaningfully time your design. Declare the clock with the board\'s real period, always.',
      },
      {
        mistake: 'Constraining a faster clock to "make the tool try harder".',
        fix: 'The constraint is a specification to verify, not a motivational target. Over-constraining distorts place-and-route (effort spent on the wrong paths) and makes reports lie about margins. Constrain the true board frequency; fix real paths with real RTL changes.',
      },
      {
        mistake: 'Adding false-path exceptions to make failing paths disappear.',
        fix: 'An exception deletes a check; it does not fix hardware. Use exceptions only for structures that are genuinely untimed (proper two-FF synchronizers, async signals) and can explain why. On this platform\'s labs, no exceptions are needed — treat a need for one as a design smell to investigate.',
      },
    ],
    guidedPractice: {
      title: 'Compute the slack',
      brief:
        'A design is constrained with create_clock -period 20.000 (50 MHz). Post-route analysis finds the critical register-to-register path has CLK-to-Q 1.10 ns, logic+route 12.85 ns, destination setup 0.26 ns. Compute arrival, required, slack, and Fmax, then state pass/fail at 50 MHz.',
      starterCode:
        'period      = 20.000 ns\nCLK->Q      = 1.10 ns\nlogic+route = 12.85 ns\nt_su        = 0.26 ns\n\narrival  = ______ ns\nrequired = ______ ns\nslack    = ______ ns\nFmax     = ______ MHz\nverdict  = ______',
      expectedBehavior:
        'arrival = 1.10 + 12.85 + 0.26 = 14.21 ns (CLK-to-Q + path + setup is the standard arrival accounting). required = 20.000 ns. slack = 20.000 − 14.21 = +5.79 ns. Fmax = 1 / 14.21 ns ≈ 70.4 MHz. Verdict: PASS at 50 MHz with comfortable margin.',
      hints: [
        'Arrival accumulates clock-to-out, path, and the destination setup time.',
        'Required is simply the constrained period for a single-cycle path.',
        'Fmax = 1 / arrival; keep full precision until the final MHz rounding.',
      ],
    },
    practiceExercises: [
      {
        title: 'Write the clock constraint',
        brief:
          'Your board documentation says the oscillator is 12 MHz. Write the create_clock sketch (vendor-labeled) and state the period in ns. Then state what two things the tool can now check that it could not before.',
        expectedBehavior:
          'create_clock -period 83.333 -name sys_clk [get_ports clk_12m] (1000/12 = 83.333 ns, rounded per tool convention). Now enabled: (1) setup checks on all register-to-register paths of that clock domain, (2) hold checks on the same paths — plus I/O timing once input/output delays exist.',
        hints: [
          'Period ns = 1000 / frequency MHz.',
          'The two checks are the slow-path and fast-path guards.',
          'Name the clock after its role, not its number, so reports read well.',
        ],
      },
      {
        title: 'Hold failure intuition',
        brief:
          'A path fails hold but passes setup with huge margin. Explain in 2-3 sentences why lowering the clock frequency will not fix it, and what class of fix will.',
        expectedBehavior:
          'Hold is checked against the SAME edge (too-fast path), so the required window does not stretch with the period; slowing the clock changes nothing for hold. Fixes shorten-or-delay the fast path structurally: adding delay/lengthening the route, or restructuring so the fast path includes a register — never a frequency change.',
        hints: [
          'Which check compares against the same edge?',
          'Setup scales with period; hold does not.',
          'The fix must make the path slower or register it.',
        ],
      },
    ],
    assessment: {
      title: 'Clock constraints checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does "create_clock -period 20.000 -name sys_clk [get_ports clk_50m]" declare?',
          options: [
            'That clk_50m toggles at 20 MHz',
            'That clk_50m is a clock named sys_clk with a 20 ns period (50 MHz), enabling path checks against it',
            'That the design should be optimized to run above 50 MHz',
            'That clk_50m must be assigned to pin 20',
          ],
          answer: 'That clk_50m is a clock named sys_clk with a 20 ns period (50 MHz), enabling path checks against it',
          explanation:
            'The command names the clock, gives its period (20 ns = 50 MHz), and binds it to the input port. The timing engine then checks every path in that domain\'s setup/hold against the specification.',
          hint: '20 ns period means what frequency?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A hold-time violation can be fixed by lowering the clock frequency.',
          answer: 'false',
          explanation:
            'Hold is checked against the same clock edge and does not scale with period. Fixes are structural: adding path delay or registering/restructuring the too-fast path.',
          hint: 'One check stretches with the period; the other does not.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Which constraint brings OFF-chip timing (an external device\'s setup requirement) into the analysis?',
          options: ['create_clock', 'set_output_delay', 'set_property DRIVE', 'create_generated_clock'],
          answer: 'set_output_delay',
          explanation:
            'Output delay specifies how much time after the clock edge the external receiver needs, letting the tool check the FPGA\'s clock-to-out paths against it. Input delay does the same for signals arriving from outside.',
          hint: 'The constraint about what happens after your output leaves the chip.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: the timing-analysis quantity defined as "required time minus arrival time" for a path.',
          answer: 'slack',
          explanation:
            'Slack is the margin: positive means the path meets timing with room to spare, negative means a violation.',
          hint: 'It is what timing reports list per path.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'create_clock', definition: 'Constraint declaring a port as a clock with a period; enables setup/hold analysis in that domain.' },
      { term: 'Setup check', definition: 'Verifies data launched at one edge arrives before the next edge minus setup time (slow-path guard).' },
      { term: 'Hold check', definition: 'Verifies data does not arrive too soon after the launching edge (fast-path guard).' },
      { term: 'Input/output delay', definition: 'Constraints describing external device timing at chip boundaries, extending checks off-chip.' },
      { term: 'Timing exception', definition: 'False-path or multicycle constraint excluding or relaxing checks on justified paths.' },
    ],
    revisionSummary: [
      'No clock constraint, no meaningful timing analysis — create_clock is the enabling declaration.',
      'Setup compares against the NEXT edge (slow paths); hold compares against the SAME edge (fast paths).',
      'Constrain the true board frequency; over-constraining distorts optimization and reports.',
      'Input/output delays extend the model to off-chip devices using their datasheets.',
      'Exceptions remove checks — add only with structural justification; single-clock labs need none.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Wikipedia — Clock signal', url: 'https://en.wikipedia.org/wiki/Clock_signal', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'fpga-m03-l3',
    title: 'Reading Timing Reports and Timing Closure Habits',
    summary:
      'Dissect a full timing report — summary, per-path slack, Fmax — from a synthetic teaching example, then learn the beginner timing-closure loop: find the worst path, read its structure, apply the standard fixes in order.',
    objectives: [
      'Read a timing report: clock summary, worst slack per clock, Fmax, and the critical path listing.',
      'Interpret a path listing: source register, destination register, and the delay components in between.',
      'Apply the standard closure fixes in order of cost: report the truth, pipeline, register I/O, simplify logic, only then restructure.',
      'Build the habit of gating all claims on the post-route timing report, never on synthesis estimates.',
    ],
    whyItMatters:
      'Timing closure is the daily work of FPGA engineering: meet the clock with margin, repeatably, without heroic hacks. Every lab in Module 4 will hand you a design whose timing is comfortable — real projects are not. The engineer who can read a report and run the fix loop calmly is measurably more valuable than one who edits RTL at random until warnings stop.',
    prerequisites: [
      'Setup/hold model (fpga-m03-l2)',
      'Build pipeline and wire-delay dominance (fpga-m02-l1)',
    ],
    explanation:
      'A timing report has three layers, top to bottom:\n\n**1. Summary**: per clock, the worst slack and the derived Fmax. This answers "do I meet timing?" in one line. Positive worst slack on every clock = met.\n\n**2. Per-path listings**: the report expands the worst paths (usually the top 10) with source register, destination register, arrival/required times, and the delay breakdown (clock-to-Q, logic, routing, setup). This answers "why is the worst path the worst?".\n\n**3. Details**: per-segment numbers, sometimes with a schematic of the path. This is where you find the surprising wire hop or the accidental 32-bit comparator.\n\n### Reading example (synthetic, for teaching)\n\nThe example below is **synthetic for teaching** — internally consistent, not a real tool run. Walk it in order: summary first (all clocks pass), then the single worst path, then ask the three diagnostic questions: What are source and destination? Is the delay mostly logic or mostly routing? Is there an obvious register stage missing?\n\n### The closure loop, in cost order\n\n1. **Trust the post-route report** — not synthesis estimates, not vibes.\n2. **Read the worst path fully** before editing anything. Most paths announce their fix.\n3. **Pipeline it**: add a register stage splitting one long path into two short ones (cost: one cycle of latency; benefit: usually large).\n4. **Register I/O near the pins**: input and output registers let the tool control pin timing precisely.\n5. **Simplify the logic on the path**: narrower comparisons, one-hot FSM states, fewer levels of logic between registers.\n6. **Only then restructure** (different encoding, different algorithm) — the expensive option beginners reach for first.\n\nNote what is *absent* from this list: editing the constraint. The constraint states intent; closure changes the design.',
    deepDive:
      '### Why wire delay makes path structure readable\n\nBecause routing often dominates, the path listing\'s route-vs-logic split tells you the fix. A path with 2 ns of logic and 12 ns of routing is a *placement/distance* problem: pipeline near the midpoint, or reduce physical span by restructuring fan-in. A path with 14 ns of logic is a *levels-of-logic* problem: reduce the Boolean depth (e.g., replace a comparator-plus-mux chain with a narrower compare). This diagnostic split is the single most valuable sentence in a timing report.\n\n### Fmax is per clock, not global\n\nA design with two clocks reports two Fmax values. Fmax = 1 / (longest path\'s arrival) for that domain; it is the fastest period that domain could satisfy today. Reports usually show required Fmax (your constraint) versus achieved Fmax; the gap is your margin. Two honesty notes: Fmax changes when the tool version, device speed grade, or placement seed changes — quote it with context; and Fmax says nothing about hold (hold is frequency-independent) — a design can have great Fmax and failing hold.',
    examples: [
      {
        title: 'Synthetic timing report (teaching example, not a real tool run)',
        language: 'text',
        code:
          '== SYNTHETIC TIMING REPORT (illustrative, for teaching) ==\n\n--- Summary per clock -------------------------------------------------\nClock     Period(ns)  Fmax(MHz)  Achieved-path(ns)  Worst slack(ns)  Status\nsys_clk   20.000      65.75      15.21              +4.790           PASS\n\n  Fmax derivation: 1 / 15.21 ns = 65.75 MHz  (achieved)\n  Requirement:     1 / 20.000 ns = 50.0 MHz  (constrained)\n\n--- Worst path (path 1 of 10 shown) -----------------------------------\nSource:      count_reg[24]        (FF, clocked by sys_clk)\nDestination: seg_reg[6]          (FF, clocked by sys_clk)\nDelay components:\n  clock-to-Q ................ 1.10 ns\n  logic (LUT levels) ........ 3.05 ns\n  routing ................... 10.51 ns   <-- dominant\n  destination setup ......... 0.55 ns\n  arrival total ............. 15.21 ns\n  required .................. 20.00 ns\n  SLACK ..................... +4.790 ns  PASS\n\n--- Diagnostic read ---------------------------------------------------\nQ1 source/dest?  counter MSB -> display-register bit: plausible critical\n                 span across die (counter block to pin-near display regs).\nQ2 logic vs wire?  10.51 ns routing vs 3.05 ns logic -> DISTANCE problem.\nQ3 standard fix?  pipeline the segment-decode stage (register the decode\n                  output before the final display register), or reduce\n                  physical span. NOT an encoding change; NOT a constraint edit.',
        explanation: [
          'The summary row is the whole verdict: constrained 20.000 ns, longest arrival 15.21 ns, so slack +4.790 ns and achieved Fmax 65.75 MHz — passing with ~24% margin.',
          'Fmax math is explicit: 1/15.21 ns = 65.75 MHz. Achieved Fmax above required Fmax means pass; below means fail.',
          'The path listing names source and destination FFs and splits delays: the 10.51 ns routing versus 3.05 ns logic split is the diagnostic payload — this is a distance problem.',
          'The diagnostic block models the habit: three questions, answered in order, producing a specific, cheap fix (pipeline the decode stage) rather than a rewrite.',
          'Everything above is synthetic and labeled as such — the numbers are internally consistent (20.000 − 15.210 = 4.790; 1 / 15.21 ns = 65.75 MHz) but invented for teaching.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The timing-closure loop',
        content:
          '        +-----------------------------+\n        | post-route timing report    |\n        +--------------+--------------+\n                       |\n              worst slack >= 0?\n                 yes |     | no\n                     |     v\n              (done) |  read worst path fully\n                     |     |\n                     |     v\n                     |  delay split: logic-heavy or route-heavy?\n                     |     |            |\n                     |     v            v\n                     |  fewer levels   shorten span:\n                     |  of logic       pipeline stage /\n                     |                 register I/O\n                     |     |            |\n                     |     +-----+------+\n                     |           v\n                     |     rebuild, re-report\n                     +-----------+   (loop until pass)',
        caption:
          'Closure is a loop with a fixed entry (the post-route report) and ordered fixes from cheapest to most invasive. Constraint edits are not in the loop.',
      },
    ],
    tables: [
      {
        caption: 'Timing report fields and what to do with them',
        headers: ['Field', 'Meaning', 'Healthy value', 'Action if unhealthy'],
        rows: [
          ['Worst slack', 'required − arrival for the worst path', '>= 0 (margin 10-20% is comfortable)', 'Run the closure loop'],
          ['Fmax (achieved)', '1 / longest arrival in that domain', 'Above required frequency', 'Same as negative slack'],
          ['Required period', 'Your create_clock specification', 'True board frequency', 'Fix constraint if it is wrong (rarely the case)'],
          ['Delay split (logic vs routing)', 'Where the path spends its time', 'n/a (diagnostic)', 'Logic-heavy: fewer levels. Route-heavy: pipeline/relocate'],
          ['Source/destination', 'Path endpoints', 'n/a (diagnostic)', 'Unexpected endpoints reveal real bugs first'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Quoting Fmax without context (tool, device, speed grade, seed).',
        fix: 'Fmax is a property of one build, not of the RTL. Always report it as "Fmax ≈ 65.8 MHz on device X, speed grade Y, tool version Z". Vague Fmax claims are how teams fool themselves between tool updates.',
      },
      {
        mistake: 'Fixing timing by loosening the constraint after a failure.',
        fix: 'Relaxing the constraint deletes the requirement rather than meeting it; the hardware path delay is unchanged. Constrain the board\'s real frequency and close timing in the design. The only legitimate constraint edit is correcting a genuinely wrong specification.',
      },
      {
        mistake: 'Reading only the summary and skipping the path listing.',
        fix: 'The summary says pass/fail; the path listing says why. Even passing designs deserve a worst-path read — the top path reveals your design\'s physical structure and often a lurking fragility (huge fanout, accidental wide comparator) worth fixing before it bites.',
      },
    ],
    guidedPractice: {
      title: 'Diagnose two failing paths',
      brief:
        'Path A: source fsm_state[1] to dest led_o_reg, delays: logic 12.9 ns, routing 2.4 ns. Path B: source mem_q[31] to dest acc_reg[7], delays: logic 2.8 ns, routing 14.6 ns. Both fail at 50 MHz. For each: classify (logic-heavy or route-heavy), give the standard first fix, and name one alternative.',
      starterCode:
        'Path A: logic 12.9 / routing 2.4\n  class: ____________\n  first fix: ____________\n  alternative: ____________\n\nPath B: logic 2.8 / routing 14.6\n  class: ____________\n  first fix: ____________\n  alternative: ____________',
      expectedBehavior:
        'Path A: logic-heavy -> reduce levels of logic (simplify the FSM output logic, narrow comparisons, or one-hot encoding as alternative). Path B: route-heavy -> pipeline the path (register mem_q or the accumulator input) or reduce physical span by grouping related registers; alternative: retime the memory output.',
      hints: [
        'Compare the two delay components in each path; the bigger one names the class.',
        'Logic-heavy means too many gates between registers; route-heavy means too much distance.',
        'Both standard fixes add latency of one cycle — say so when reporting to a team.',
      ],
    },
    practiceExercises: [
      {
        title: 'Margin arithmetic',
        brief:
          'A report shows achieved Fmax 58.1 MHz against a required 50 MHz. Compute the margin as a percentage. Then compute the arrival time of the critical path and its slack against a 20 ns period.',
        expectedBehavior:
          'Margin = (58.1 − 50.0)/50.0 = 16.2%. Critical path arrival = 1/58.1 MHz = 17.21 ns. Slack vs 20 ns = 20.000 − 17.21 = +2.79 ns.',
        hints: [
          'Margin compares achieved to required frequency.',
          'Arrival is the reciprocal of achieved Fmax.',
          'Slack = period − arrival; keep units in ns.',
        ],
      },
      {
        title: 'Closure plan for a lab design',
        brief:
          'A seven-segment controller (Module 4 lab) fails timing at 50 MHz; the worst path runs from the 16-bit scan counter through the segment decoder to the output register, with routing dominant. Write a 4-step closure plan in cost order, including what you would verify after each step.',
        expectedBehavior:
          '(1) Re-read the report and confirm route-heavy split. (2) Pipeline: register the segment-decode output (one-cycle latency is fine for a display). (3) Rebuild and verify the new report: worst path moved, slack positive, utilization changed by ~8-16 FFs. (4) Only if still failing, reduce physical span (place display registers near decode logic via hierarchy) — never touch the clock constraint.',
        hints: [
          'The scan counter and output pins are physically far apart — distance is the suspect.',
          'A one-cycle display latency is invisible to humans; state that explicitly.',
          'Each step ends with a rebuilt post-route report — closure is evidence-driven.',
        ],
      },
    ],
    assessment: {
      title: 'Timing reports checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A timing report shows worst slack −1.30 ns on your 20 ns clock. What does this mean?',
          options: [
            'The design fails 50 MHz; the longest path is 1.30 ns over budget (arrival ≈ 21.30 ns)',
            'The design passes with 1.30 ns of margin',
            'The clock is 1.30 ns early',
            'The report contains an error; slack cannot be negative',
          ],
          answer: 'The design fails 50 MHz; the longest path is 1.30 ns over budget (arrival ≈ 21.30 ns)',
          explanation:
            'Negative slack is a violation: required (20.00 ns) minus arrival gives −1.30, so arrival ≈ 21.30 ns and achieved Fmax ≈ 46.9 MHz. The design misses the constrained frequency.',
          hint: 'Negative slack = over budget, not a bookkeeping quirk.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A path whose delay is mostly routing is best fixed by reducing levels of logic.',
          answer: 'false',
          explanation:
            'Route-heavy paths are distance problems: the standard fixes are pipelining (split the span with a register) or shortening physical distance. Logic-level simplification addresses logic-heavy paths.',
          hint: 'Match the fix to the dominant delay component.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Which number pair do you compare to decide pass/fail at your required frequency?',
          options: [
            'Achieved Fmax vs required Fmax',
            'LUT count vs device capacity',
            'Hold slack vs setup slack',
            'Bitstream size vs flash size',
          ],
          answer: 'Achieved Fmax vs required Fmax',
          explanation:
            'Passing means the achieved Fmax (1/longest arrival) meets or exceeds the constrained frequency — equivalently, worst slack is non-negative. Resource counts answer feasibility, not timing.',
          hint: 'Frequency against frequency.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: the per-path report quantity computed as required time minus arrival time.',
          answer: 'slack',
          explanation:
            'Slack is the timing margin per path; the summary reports the worst one per clock. Positive slack passes, negative fails.',
          hint: 'The same quantity you met in the clock-constraints lesson.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Worst slack', definition: 'The minimum (required − arrival) across all paths of a clock — the summary verdict.' },
      { term: 'Fmax (achieved)', definition: '1 / longest path arrival; the fastest clock the current build could satisfy.' },
      { term: 'Delay split', definition: 'A path\'s division into logic delay versus routing delay — the key diagnostic.' },
      { term: 'Pipelining', definition: 'Adding a register stage to split a long path into shorter ones, costing one cycle of latency.' },
      { term: 'Timing closure loop', definition: 'Report -> read worst path -> diagnose logic/route -> apply ordered fixes -> rebuild -> re-report.' },
    ],
    revisionSummary: [
      'Reports read top-down: summary (verdict), path listing (why), details (where exactly).',
      'Slack = required − arrival; Fmax = 1/arrival; pass means achieved Fmax >= required.',
      'Route-heavy paths get pipelining or shorter spans; logic-heavy paths get fewer levels of logic.',
      'Fixes in cost order: pipeline, register I/O, simplify logic, then restructure — never loosen constraints.',
      'Quote Fmax with tool/device context; only post-route reports are evidence.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Wikipedia — Electronic design automation', url: 'https://en.wikipedia.org/wiki/Electronic_design_automation', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
