import type { TutorialLesson } from '../types';

export const module05Lessons: TutorialLesson[] = [
  {
    id: 'fpga-m05-l1',
    title: 'On-Chip Debug Instrumentation: ILA and Virtual I/O',
    summary:
      'How engineers see inside a running FPGA: logic analyzer cores (ILA) that sample internal signals into on-chip RAM, virtual I/O that drives and watches signals without re-synthesis, and the honest limits of each.',
    objectives: [
      'Explain what an integrated logic analyzer (ILA) core is, what it costs, and when to reach for it.',
      'Describe the trigger/capture model: trigger conditions, sample depth, and pre/post-trigger windows.',
      'Explain virtual I/O (VIO): runtime inputs and outputs without re-synthesis.',
      'State what on-chip instrumentation cannot do, and why simulation-first remains the primary method on this platform.',
    ],
    whyItMatters:
      'Once a design is on a chip, its internal wires stop existing as probe-able nets — you cannot attach an oscilloscope to bit 12 of an internal counter. ILA-style cores are the industry answer, and knowing their model (trigger, capture, cost) makes you effective on real boards. Equally important is honesty about their limits: they consume fabric, they can perturb timing, and they are never a substitute for a failing simulation.',
    prerequisites: [
      'Simulation and testbenches (Verilog course)',
      'Block RAM resource (fpga-m01-l3)',
      'Build pipeline (fpga-m02-l1)',
    ],
    explanation:
      'Inside a configured FPGA, internal signals are just configuration-driven wires — physically unreachable. On-chip debug cores solve this by building a small instrument **into your design** before the build:\n\nAn **integrated logic analyzer (ILA)** core is added to your design connected to the signals you want to observe. It continuously samples those signals into block RAM (the **capture buffer**, typically a few kilobits deep). A **trigger condition** — e.g., "start == 1 && state == GREEN" — arms it, and when the condition matches, the buffer freezes and streams to the host over the programming cable. You then inspect waveforms in a GUI, exactly like a simulation viewer, except the data is from real silicon at real speed.\n\nA **virtual I/O (VIO)** core is a smaller cousin: it exposes runtime *inputs* (buttons you click in the GUI become registers in your design) and runtime *outputs* (probe values you read back). It answers "what if I wiggle this input?" without re-synthesis — invaluable for bring-up.\n\nBoth cost real resources: sample buffers eat BRAM, probes add routing, and — critically — **instrumentation can change timing**. A design that fails timing may pass once the ILA is attached (the placer works around the added logic), or a passing design can fail. The professional rule: debug with instrumentation, *sign off* without it.\n\n### The platform honesty statement\n\nThis platform has no FPGA, no cable, and no vendor debug cores — so ILA/VIO here are taught as *concepts* you will meet on a real board, never as something these labs run. Your debug instrument on this platform is the testbench, and Module 4\'s labs exercised it deliberately. The skill transfers: reading an ILA capture is reading a waveform you already know how to read; the new parts are triggering and the resource cost.',
    deepDive:
      '### Triggering is the whole game\n\nA capture buffer holds only a few thousand samples — a microsecond or two at 100 MHz. Finding a once-per-minute event by re-arming manually is hopeless; triggers make it automatic. You specify a boolean condition on probed signals (and optionally a delay: capture N samples *before* the trigger, so you see the causes leading up to it). Choosing the trigger is the debug skill: too loose (anything matching) wastes captures; too tight (a condition that never occurs) never fires. When you cannot name a trigger, you usually do not understand the failure yet — go back to simulation.\n\n### Sample depth vs signals vs clock\n\nBuffer memory = depth × width. Probing 64 signals at 4096 deep eats 64 × 4096 = 256 kbit of BRAM — multiple blocks on a small device. This is why you probe selectively (a handful of signals around the suspect block), and why an ILA on a clock domain much faster than the interesting event (sampling a 1 Hz signal at 100 MHz) wastes nearly the whole buffer on silence — downsample or trigger on an edge instead.',
    examples: [
      {
        title: 'What an ILA hookup looks like conceptually (illustrative, not runnable here)',
        language: 'text',
        code:
          '## CONCEPTUAL sketch — real flows instantiate a vendor ILA IP and\n## auto-generate connections from a GUI/netlist marking step.\n\n  +-----------+     probes (inside design)      +--------------+\n  | your RTL  | --- state[1:0], sec_left[3:0] -->| ILA core     |\n  | traffic_  | --- tick                        |  depth: 1024 |\n  | light     |                                 |  triggers on |\n  +-----------+                                 |  state==GREEN|\n        ^                                       +------+-------+\n        | runtime stimulus (VIO)                       |\n        +-------- sec_left preset, force_red <---------+\n                                                       | JTAG\n                                                 host GUI waveform view\n\nTypical bring-up session:\n  1. probe: state, sec_left, tick\n  2. trigger: tick==1 && state==YELLOW   (catch the short state)\n  3. capture: 256 samples pre-trigger, 768 post\n  4. read: did YELLOW really last 3 ticks? did red ever glitch?',
        explanation: [
          'The ILA core is a real design component: probes route internal signals into a BRAM-backed capture buffer inside the same chip.',
          'Trigger here is a boolean on probed signals plus pre/post-trigger sizing — the core must be able to *retain* pre-trigger samples, which is why capture is continuously running before the trigger.',
          'The VIO side shows the other half of bring-up: injecting stimulus (force states, preset counters) at runtime without a rebuild.',
          'Everything above is a concept sketch: this platform provides no ILA IP, no JTAG, no GUI — on this platform the equivalent verification is the testbench from Module 4, which is why the labs were written simulation-first.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'ILA capture model around a trigger',
        content:
          ' sample --> [ ring buffer: keeps last N pre-trigger samples ]\n                          |\n                 trigger condition true?\n                          |\n                 yes: keep capturing M post-trigger samples\n                          |\n                 freeze buffer ----> upload to host (JTAG)\n\n  viewed waveform:  [ pre-trigger 25% ][ trigger ][ post 75% ]',
        caption:
          'The core samples continuously; the trigger only decides WHEN to stop and upload. Pre-trigger capture is what lets you see causes, not just effects.',
      },
    ],
    tables: [
      {
        caption: 'On-chip instrumentation vs simulation vs external scopes',
        headers: ['Method', 'Sees', 'Cost / limit', 'Best for'],
        rows: [
          ['Simulation (testbench)', 'Every signal, full history, exhaustive control', 'No physical effects; needs stimulus', 'Functional truth — first resort, always'],
          ['ILA core', 'Selected internal signals at speed, real silicon', 'BRAM + routing cost; perturbs timing; shallow window', 'Physical-only failures: timing, real stimulus, board interactions'],
          ['VIO core', 'Runtime inputs/outputs, no re-synthesis', 'Small resource cost; manual, not logged', 'Bring-up wiggle tests, forcing states'],
          ['External scope/logic analyzer', 'Pins only (unless ball accessible)', 'Cannot see internal nodes at all', 'Board-level electrical problems, I/O timing'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Attaching an ILA to every signal "to be safe".',
        fix: 'Buffers are shallow and BRAM is finite: probe the minimal set around the suspect block. A 64-signal 4096-deep capture is hundreds of kilobits — often more than the design under test. Probe with a hypothesis, not with fear.',
      },
      {
        mistake: 'Believing results from an instrumented build when signing off timing.',
        fix: 'Instrumentation adds logic and changes placement; the instrumented build is not the shipped build. Debug with ILA, remove it, rebuild, and confirm timing and function on the clean build.',
      },
      {
        mistake: 'Using an ILA to hunt a bug that already fails in simulation.',
        fix: 'Simulation sees everything and is reproducible; hardware capture is shallow and one-shot. If the bug reproduces in simulation, fix it there. The ILA is for behaviors that only exist on hardware — real stimulus, CDC, electrical interactions.',
      },
    ],
    guidedPractice: {
      title: 'Plan an ILA session',
      brief:
        'A traffic-light design on a real board shows lamps stuck on RED; simulation with a shrunk tick passes. Plan the ILA session: which 3-4 signals to probe, a trigger condition that will catch the transition logic acting, capture sizing, and what observation would falsify which hypothesis (stuck FSM vs dead tick vs reset held).',
      starterCode:
        'Signals available: clk, reset_n, tick, state[1:0], sec_left[3:0]\nProbe: ______________________\nTrigger: ____________________\nDepth / pre-trigger: ________\nHypothesis A (dead tick): falsified if ______\nHypothesis B (FSM stuck): falsified if ______\nHypothesis C (reset held): falsified if ______',
      expectedBehavior:
        'Probe: tick, state[1:0], sec_left[3:0], reset_n. Trigger: tick==1 (one capture per second) or sec_left decreasing. Depth 512 with ~256 pre-trigger. Dead tick falsified if tick pulses are absent from a capture window. FSM stuck falsified if state stays 00 across many ticks with sec_left decrementing (or reaching 1 without transition). Reset held falsified if reset_n reads 1 while sec_left decrements.',
      hints: [
        'Probe the smallest set that distinguishes your hypotheses — every hypothesis needs a witness signal.',
        'A per-second trigger fills the buffer with useful seconds, not silence.',
        'Pre-trigger samples show what happened BEFORE the anomaly — size them generously.',
      ],
    },
    practiceExercises: [
      {
        title: 'Buffer budget arithmetic',
        brief:
          'Your device has 32 BRAM blocks of 4 kbit each; your design already uses 20. You want to probe 16 signals. Compute the maximum sample depth available for the ILA if it may use at most 4 blocks, then state the real-time window at a 100 MHz sample clock.',
        expectedBehavior:
          '4 blocks × 4096 bit = 16,384 bits; at 16-bit width → 1024 samples deep. Window at 100 MHz = 1024 × 10 ns = 10.24 µs. Conclusion: shallow — triggers must be precise, or sample a slower enable.',
        hints: [
          'Bits = blocks × 4096; depth = bits / probe width.',
          'Window = depth / sample rate.',
          '10 µs is far too short to catch a 1 Hz event by luck — hence triggers.',
        ],
      },
      {
        title: 'VIO bring-up script',
        brief:
          'Your UART loopback (Lab 6) is on a real board and the RX never pulses valid. Write a 5-step VIO+ILA bring-up sequence that first tests the TX alone, then the RX path, using runtime stimulus.',
        expectedBehavior:
          'Sensible sequence: (1) VIO-force start=0, observe tx idles high. (2) VIO-pulse start with data=0x55; ILA triggers on start==1, probes tx — verify the 10-bit frame shape. (3) If TX frame good, check loopback wiring (VIO read tx while watching rx probe — in a real jumpered board, verify with scope at the pin). (4) ILA on rx_ff2 and valid with trigger on falling rx_ff2 — confirm start detection. (5) Compare captured rx samples against the TX capture bit-for-bit.',
        hints: [
          'Test one direction at a time — that is the entire point of loopback.',
          'The TX frame shape on a capture is your ground truth for the RX.',
          'Trigger on the start edge for the RX capture, like the mid-start logic does.',
        ],
      },
    ],
    assessment: {
      title: 'On-chip debug checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does an ILA core use to store captured samples before upload?',
          options: [
            'The host PC\'s RAM',
            'On-chip block RAM configured as a capture buffer',
            'External DDR memory on the board',
            'The configuration flash',
          ],
          answer: "On-chip block RAM configured as a capture buffer",
          explanation:
            'The ILA continuously samples probed signals into on-chip BRAM; after a trigger freezes the buffer, samples upload to the host over the debug cable. Depth is therefore bounded by BRAM.',
          hint: 'The buffer lives inside the same chip as the design.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A build that includes an ILA core is the right build for final timing sign-off.',
          answer: 'false',
          explanation:
            'Instrumentation adds logic and routing that can change placement and timing in either direction. Debug with the ILA; then rebuild clean and sign off on the un-instrumented build.',
          hint: 'The shipped build is the one that must be verified.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'You must catch an event that happens roughly once per minute. Why is a plain capture window hopeless without a trigger?',
          options: [
            'Because ILAs cannot sample faster than 1 kHz',
            'Because buffers hold only a short window (microseconds), so blind capture almost always misses the event',
            'Because triggers are required to start the sample clock',
            'Because once-per-minute events are slower than the upload rate',
          ],
          answer: 'Because buffers hold only a short window (microseconds), so blind capture almost always misses the event',
          explanation:
            'A 1024-deep buffer at 100 MHz covers ~10 µs — a one-in-sixty-seconds event is essentially never inside a blind window. The trigger arms capture on the event itself.',
          hint: 'Do the window arithmetic from the buffer budget.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the runtime debug core that lets you drive inputs and observe outputs from the host GUI without re-synthesis.',
          answer: 'virtual I/O',
          explanation:
            'Virtual I/O (VIO) cores expose runtime-controllable inputs and readback outputs — the bring-up complement to the ILA\'s passive capture.',
          hint: 'It is named for inputs/outputs, virtually.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'ILA', definition: 'Integrated logic analyzer core: probes internal signals into an on-chip BRAM capture buffer with hardware triggering.' },
      { term: 'VIO', definition: 'Virtual I/O core: runtime inputs and output readback from the host, without re-synthesis.' },
      { term: 'Capture depth', definition: 'Samples the buffer holds = BRAM bits / probe width; bounds the observable time window.' },
      { term: 'Trigger condition', definition: 'Boolean expression on probed signals that freezes and uploads the capture.' },
      { term: 'Pre-trigger capture', definition: 'Samples retained before the trigger fired, showing the causes leading to the event.' },
    ],
    revisionSummary: [
      'Internal signals are unreachable from outside; ILA cores build the analyzer into the design.',
      'Model: continuous sampling into BRAM -> trigger freezes -> upload over the debug cable.',
      'VIO drives/observes at runtime — bring-up wiggle tests without rebuilds.',
      'Instrumentation costs BRAM and can change timing: debug with it, sign off without it.',
      'On this platform there is no ILA/VIO hardware — the testbench is your instrument, by design.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Logic analyzer', url: 'https://en.wikipedia.org/wiki/Logic_analyzer', kind: 'article' },
      { label: 'Wikipedia — Field-programmable gate array', url: 'https://en.wikipedia.org/wiki/Field-programmable_gate_array', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'fpga-m05-l2',
    title: 'First-Board Failure Modes',
    summary:
      'The failure catalogue every beginner hits on their first real board: wrong or missing pin constraints, reset polarity mismatches, undriven and floating inputs, and clock problems — with a triage order that finds each one fast.',
    objectives: [
      'Triage a dead board in a fixed order: configuration, constraints, reset, clock, then RTL.',
      'Recognize the signature of each classic failure: wrong pin (silent), wrong reset polarity (permanently held or never reset), undriven input (x-pessimism differences), unconstrained port.',
      'Explain why simulation cannot catch constraint errors — by construction.',
      'Build the bring-up checklist habit that separates one-hour fixes from weekend hunts.',
    ],
    whyItMatters:
      'Your first real board will not work, and the cause will almost never be the interesting part of your RTL. It will be a pin, a polarity, a strap, or a file that was never loaded. Teams lose days to these because beginners debug the design when they should debug the *contract* between design and board. A triage order turns that weekend into an afternoon.',
    prerequisites: [
      'Pin constraints and planning tables (fpga-m03-l1)',
      'Clock constraints (fpga-m03-l2)',
      'Configuration concept (fpga-m01-l1)',
    ],
    explanation:
      '### The triage order\n\nWhen a board misbehaves, work outward from most-fatal to most-subtle. Each stage can completely mask everything after it, so order matters:\n\n1. **Configuration**: did the bitstream actually load? (done LED, configuration-complete status, or a JTAG probe). A board with no design loaded looks exactly like a board with a broken design.\n2. **Pin constraints**: does every top-level port have a constraint, and does each constraint match the *board documentation* (not a tutorial)? Wrong pins are silent — the design runs perfectly on wires that go nowhere.\n3. **Reset polarity**: is `reset_n` actually high in operation? An active-low reset wired to an active-high signal holds the design in reset forever — everything else will look dead.\n4. **Clock**: is the oscillator running, and does the create_clock period match reality? (Module 3 Lesson 2.)\n5. **I/O standards and banks**: LVCMOS33 on a 1.8 V bank or vice versa produces dead or damaged signaling.\n6. **RTL**: only now is the design itself the suspect — and by then, simulation has usually already validated it.\n\n### The signatures\n\n- **Wrong pin**: everything passes in simulation; on the board, outputs do nothing but the tool reports a clean build. Nothing in software can catch it — only the planning table can.\n- **Undriven input**: an unconstrained, unconnected input reads as a constant or floats; simulation shows `x` and your design ignores it, but synthesis may constant-fold your logic around whatever value it assumes. The signature is a design that works until some input "randomly" matters.\n- **Reset polarity flip**: the design never leaves reset (all outputs frozen at reset values) or never applies reset (FSM starts in an arbitrary state).\n- **Wrong clock constraint**: timing passes against the wrong number — the design "meets" a clock it is not actually running at.',
    deepDive:
      '### Why constraint errors are invisible to simulation\n\nSimulation executes your RTL against a testbench; it has no model of the package, the board, or the constraints file. A design with every LED on the wrong pin is *functionally identical* in simulation to a correct one. This is by construction — and it is why this course\'s labs force the planning-table habit even though this platform has no hardware: the table is the only artifact that can be checked against the board documentation *before* a build, and reviewing it takes minutes.\n\n### The undriven-input subtlety\n\nIn simulation, an undriven input is `x` (unknown); your FSM may never enter the state that depends on it, so tests pass. In synthesis, undefined inputs are resolved by the tool (often tied off or optimized through), and on the board the pin floats to whatever its environment couples into it. The result is a design whose behavior differs between the three worlds *legitimately* — the fix is not cleverer debugging but declaring every input: constrained to a pin, or tied in RTL with a named constant so the choice is visible and deliberate.',
    examples: [
      {
        title: 'The bring-up checklist as an executable triage script',
        language: 'text',
        code:
          '## FIRST-BOARD TRIAGE (run in order; stop at the first failure)\n## [1] Configuration\n##     - programming tool reports the device and "done"\n##     - if not: check bitstream device id, flash contents, mode straps\n## [2] Constraints completeness\n##     - every top-level port has a pin + IOSTANDARD\n##     - each value matches THE BOARD DOC at your board revision\n##     - zero "unconstrained port" warnings tolerated\n## [3] Reset\n##     - measure/observe reset_n net in operation: is it HIGH when running?\n##     - polarity in RTL (_n suffix) matches the board driver?\n## [4] Clock\n##     - oscillator frequency on board doc == create_clock period?\n##     - clock present at the constrained pin (scope/ILA on a clock pin)\n## [5] I/O electrical\n##     - IOSTANDARD vs bank VCCO per pin (m03-l1 bank rule)\n## [6] RTL\n##     - only after 1-5 pass; simulation should already have covered this\n\n## Worked example of the order saving an evening:\n##   Symptom: LEDs dead, build clean, simulation passes.\n##   [1] passes (done LED on).\n##   [2] finds led[2] constrained to the pin documented for led[5]\n##       in a copied tutorial constraint file. Total cost: 4 minutes.',
        explanation: [
          'The checklist is ordered by masking power: each unchecked item makes later ones untestable, which is why the order is fixed.',
          'Step 2 is the highest-frequency failure for beginners — copied constraint files — and the cheapest to check.',
          'The worked example shows the payoff pattern: the symptom ("LEDs dead") suggests RTL, but the triage order surfaces a copied-pin error in minutes.',
          'Nothing in the checklist requires synthesizing anything on this platform: steps 1, 2, 5 are documentation checks you can practice on any board datasheet today.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Failure signatures vs their layer',
        content:
          ' Layer          Failure                 Signature\n -------------  ----------------------  ---------------------------------\n Configuration  blank/wrong bitstream   board totally inert, done LED off\n Constraints    wrong pin / missing     clean build, silent outputs,\n                                        "unconstrained" warnings ignored\n Reset          polarity flip           frozen at reset values OR\n                                        random start state\n Clock          wrong period/pin        timing "passes" against fiction;\n                                        dead or unstable design\n I/O electrical std/bank mismatch       dead or marginal signaling\n RTL            actual logic bug        (should already be caught by TB)',
        caption:
          'Triage matches symptom to layer before touching RTL — the design is the LAST suspect, not the first.',
      },
    ],
    tables: [
      {
        caption: 'Classic first-board failures and their fastest checks',
        headers: ['Failure', 'Typical cause', 'Fastest check', 'Fix'],
        rows: [
          ['Board inert', 'Blank flash / wrong-device bitstream', 'Programming tool "done" status', 'Reprogram with correct image'],
          ['Silent outputs', 'Pins copied from another board', 'Planning table vs board doc', 'Re-derive constraints from your board'],
          ['Design frozen', 'reset_n held low / polarity flipped', 'Observe reset_n net in operation', 'Fix driver or RTL polarity consistently'],
          ['Random start state', 'No reset applied in operation', 'Check reset path reachability', 'Constrain/drive reset; keep async reset in RTL'],
          ['Timing fiction', 'create_clock period ≠ oscillator', 'Constraint vs board doc', 'Correct the clock constraint'],
          ['Dead I/O', 'IOSTANDARD vs bank VCCO mismatch', 'Bank check in planning table', 'Re-plan banks/standards'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Starting triage by editing RTL.',
        fix: 'RTL is the last suspect because simulation already validates it. Constraint, reset and clock layers cannot be seen by simulation, so they must be checked first — the triage order encodes this.',
      },
      {
        mistake: 'Ignoring "unconstrained port" and similar warnings because the build succeeded.',
        fix: 'A build can succeed with floating pins; the failure appears only at the board, where it costs the most time. Treat every such warning as a build blocker from day one.',
      },
      {
        mistake: 'Mixing reset conventions between modules (some reset on low, some on high).',
        fix: 'Pick the platform convention (async active-low reset_n), apply it in every module, and have the checklist verify the board driver matches it. Mixed polarities produce designs that are half-reset — the worst debugging state there is.',
      },
    ],
    guidedPractice: {
      title: 'Run the triage on three symptoms',
      brief:
        'For each symptom, name the first triage layer to check and the single most diagnostic observation: (a) board completely inert, no done LED; (b) build clean, simulation passes, one LED never lights while others work; (c) design outputs frozen at reset values although the done LED is on.',
      starterCode:
        '(a) layer: ____ observation: ____\n(b) layer: ____ observation: ____\n(c) layer: ____ observation: ____',
      expectedBehavior:
        '(a) Configuration layer — programming tool/device ID and done status. (b) Constraints layer — that LED\'s pin entry in the planning table vs board doc (likely wrong or missing pin). (c) Reset layer — observe reset_n in operation (held low, or polarity flip between driver and RTL).',
      hints: [
        '(a): nothing ran — check the loading layer before anything else.',
        '(b): one output dead with a clean build smells like a pin, not logic.',
        '(c): "frozen at reset values" is the reset layer\'s signature.',
      ],
    },
    practiceExercises: [
      {
        title: 'Undriven input hunt',
        brief:
          'A design has ports sw[3:0]; the constraint file locates only sw[1:0]. Describe the three different behaviors this design could show in (i) simulation, (ii) synthesis, (iii) on the board — and write the one-line policy that prevents the whole class of bugs.',
        expectedBehavior:
          '(i) Simulation: sw[3:2] are x; logic depending on them never resolves, tests may pass by never exercising them. (ii) Synthesis: tool ties or optimizes the undefined inputs — the netlist may differ from your intent. (iii) Board: the pins float to environment-dependent values — random behavior. Policy: every top-level port constrained to a pin; zero unconstrained-port warnings tolerated.',
        hints: [
          'The three worlds resolve "undefined" differently — that is the whole lesson.',
          'Simulation x-pessimism protects you; the board does not.',
          'The policy is one sentence about completeness.',
        ],
      },
      {
        title: 'Reset audit',
        brief:
          'A board drives its "reset button" net high when pressed. Your RTL uses `always @(posedge clk or negedge reset_n)`. State exactly what the design does at power-up and while the button is pressed, and give the two legitimate fixes (board-side and RTL-side).',
        expectedBehavior:
          'Power-up: reset_n floats or sits at board default — unknown reset state. Button pressed: net goes HIGH = inactive for an active-low reset, so pressing does nothing; but if the board default idles the net low, the design is permanently held in reset. Fixes: (board) rewire or use a different active-low reset source; (RTL) invert at the top level with a named signal — e.g., drive reset_n from a synchronized inversion — and document the polarity decision in the planning table.',
        hints: [
          'negedge reset_n asserts reset when the net FALLS to 0.',
          'What does a button that asserts high do to an active-low input?',
          'Whichever side you fix, the polarity must be consistent and documented.',
        ],
      },
    ],
    assessment: {
      title: 'First-board failures checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A design builds cleanly and passes simulation, but on the board one LED never lights while the others work. What do you check first?',
          options: [
            'Rewrite the LED-driving RTL module',
            'The constraint file entry for that specific LED against the board documentation',
            'The configuration flash contents',
            'The I/O bank VCCO of the whole design',
          ],
          answer: 'The constraint file entry for that specific LED against the board documentation',
          explanation:
            'One dead output with a clean build and passing simulation is the signature of a pin-level error — wrong or missing pin constraint. RTL is untouched until constraint-layer checks pass.',
          hint: 'One signal wrong = a per-signal mapping problem.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Simulation can catch a pin constraint error if the testbench is written carefully enough.',
          answer: 'false',
          explanation:
            'Simulation has no model of the package, board or constraints file — it executes RTL only. Constraint errors are invisible to simulation by construction; only documentation checks and (on real hardware) observation catch them.',
          hint: 'What artifact would the simulator even read?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'A board\'s reset button drives its net HIGH when pressed. Your RTL resets on negedge reset_n. What happens when the button is pressed?',
          options: [
            'The design resets',
            'Nothing — a high level is the inactive state for an active-low reset',
            'The design resets on release',
            'The design enters an undefined state permanently',
          ],
          answer: 'Nothing — a high level is the inactive state for an active-low reset',
          explanation:
            'negedge reset_n asserts reset when the net falls to 0. A button driving high is logically inactive for an active-low reset — a polarity mismatch between the board driver and the RTL convention.',
          hint: 'What level does the _n suffix expect for "not resetting"?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: the first triage layer to check when a board is completely inert with no done indication.',
          answer: 'configuration',
          explanation:
            'If the bitstream never loaded, nothing else can work — configuration is checked before constraints, reset, clock or RTL.',
          hint: 'Did the design ever get into the chip?',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Triage order', definition: 'Fixed debug sequence: configuration -> constraints -> reset -> clock -> I/O electrical -> RTL.' },
      { term: 'Floating input', definition: 'An unconstrained, undriven input pin whose board-level value is environment-dependent.' },
      { term: 'Reset polarity', definition: 'Whether a reset is active low (_n) or active high; board driver and RTL must agree.' },
      { term: 'Bring-up', definition: 'The first controlled powering and testing of a board with a new design.' },
      { term: 'Planning-table review', definition: 'Checking every constraint against board documentation before building — the only pre-hardware catch for pin errors.' },
    ],
    revisionSummary: [
      'Triage order: configuration, constraints, reset, clock, I/O electrical, RTL — fixed, because each layer masks the next.',
      'Constraint errors are invisible to simulation by construction; the planning table is the pre-hardware catch.',
      'Reset polarity mismatches freeze designs or randomize starts; one convention, everywhere, documented.',
      'Undriven inputs resolve differently in simulation (x), synthesis (tie/optimize) and board (float) — declare or constrain every input.',
      'A clean build and a passing simulation prove nothing about pins — that is the whole point of this lesson.',
    ],
    furtherReading: [
      { label: 'Wikipedia — JTAG', url: 'https://en.wikipedia.org/wiki/JTAG', kind: 'article' },
      { label: 'All About Circuits — textbook', url: 'https://www.allaboutcircuits.com/textbook/', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'fpga-m05-l3',
    title: '"Works in Simulation, Fails on Board"',
    summary:
      'The three honest categories behind the most-quoted complaint in FPGA: clock-domain crossings, initialization/reset assumptions, and constraint gaps — plus power and I/O budget basics for keeping the board alive.',
    objectives: [
      'Classify sim-passes/board-fails failures into CDC, initialization, and constraint categories — and name the standard fix for each.',
      'Design the safe single-bit crossing (2-FF synchronizer) and state why multi-bit buses need different treatment.',
      'Explain why X-based simulation optimism hides missing reset and initialization behavior.',
      'Do the order-of-magnitude power and I/O budget check that keeps a small board within its rails.',
    ],
    whyItMatters:
      'Every FPGA engineer eventually ships a design that passed every simulation and still misbehaves on silicon. The difference between a three-day mystery and a three-hour fix is whether you can classify the failure on sight. This lesson compresses the standard classes into patterns you can recognize — and tells you honestly which of them this platform can and cannot teach by simulation.',
    prerequisites: [
      '2-FF synchronizer introduction (fpga-m04-l3)',
      'Reset discipline (RTL Design course)',
      'Triage order (fpga-m05-l2)',
    ],
    explanation:
      '"It worked in simulation" is not a contradiction — it means the failure lives in a physics or contract layer that simulation does not model. Nearly all such failures fall into three classes:\n\n**1. Clock-domain crossings (CDC).** Two clocks (or an asynchronous input) exchanging data without a synchronizer. Simulation with idealized clocks may never show the metastable capture, or shows it so rarely the test passes. Standard fixes: 2-FF synchronizers for single bits; for multi-bit buses, handshake or asynchronous FIFO structures — never a per-bit synchronizer on a bus (bits arrive skewed). Recognition rule: any signal changing domain without an obvious synchronizer is suspect.\n\n**2. Initialization and reset assumptions.** Simulation can start every register at a known value (or x, if you are strict); silicon starts wherever power-up physics leaves it. Registers without reset or explicit initialization come up in arbitrary states — the FSM starts in state 3 of 4 and the design is "broken". Fix: reset every stateful element (platform convention: async active-low reset_n) or deliberately initialize via the FPGA\'s defined register init values, and verify reset *reachability* on the board (fpga-m05-l2).\n\n**3. Constraint gaps.** Missing create_clock (untimed logic), missing pin constraints (floating I/O), missing input/output delays (unchecked I/O timing), or wrong periods. The design was never *verified* against the real contract — the tool was never asked. Fix: the constraint checklist from Module 3, reviewed against board docs.\n\n### Power and I/O budgets, order-of-magnitude\n\nTwo board-keeping checks, both honest "verify against the datasheet" habits: **I/O budget** — every pin driven respects its standard\'s drive capability and the bank rail (a whole digit of LEDs summed on one pin was the Module 4 warning); **power budget** — estimate fabric + I/O power roughly (small designs on small boards are typically milliwatt-to-sub-watt scale; check the actual tool estimate on a real flow), and confirm the board\'s regulator rating covers it. Neither check requires a tool on this platform; both are documentation arithmetic you can practice.',
    deepDive:
      '### Why the 2-FF synchronizer works, and why buses break it\n\nA metastable capture is a flip-flop caught between levels; left alone it may resolve late and differently on different reads. The second flip-flop gives the first a full clock cycle to resolve before anyone consumes its output — not a proof of correctness, but it drives failure probability to negligible per-year rates at typical clock rates (the quantitative study is MTBF analysis, beyond this course\'s scope — stated honestly). A multi-bit bus through per-bit synchronizers fails differently: each bit resolves independently, so the bus can present a value that never existed (bit skew across the boundary). The safe patterns are: hold the bus stable and cross a "data valid" pulse (handshake), or use an asynchronous FIFO with independent read/write clocks. The UART RX from Lab 6 is the single-bit case done right: rx is synchronized, and the byte is assembled entirely in the receive clock\'s domain.\n\n### Simulation optimism, stated precisely\n\nTwo mechanics hide board-only failures. First, gate-level netlist simulation (if you ever run it) models X-pessimism differently than RTL simulation — RTL can silently propagate a 0 where hardware has a metastable or uninitialized value. Second, simulation clocks are perfect periodic sources with zero skew; real clock trees and board oscillators are not. The honest workflow therefore keeps a category called "board-only risks" in your head at all times — CDC list, reset reachability, constraint completeness — and treats simulation pass as *necessary but not sufficient*.',
    examples: [
      {
        title: 'The unsafe crossing and its two safe alternatives (single bit vs bus)',
        language: 'verilog',
        code:
          '// -----------------------------------------------------------------\n// UNSAFE: multi-bit bus crossed with per-bit synchronizers.\n// DO NOT SHIP — bits skew; the bus can present impossible values.\n// -----------------------------------------------------------------\nmodule bus_cross_bad (\n    input  wire       clk_a,          // source domain\n    input  wire [7:0] data_a,\n    input  wire       clk_b,          // destination domain\n    output reg  [7:0] data_b\n);\n    reg [7:0] sync1, sync2;\n    always @(posedge clk_b) begin\n        sync1  <= data_a;             // each bit independently!\n        sync2  <= sync1;\n    end\n    always @(posedge clk_b)\n        data_b <= sync2;\nendmodule\n\n// -----------------------------------------------------------------\n// SAFE for a single bit: 2-FF synchronizer (Lab 6\'s rx input).\n// -----------------------------------------------------------------\nmodule bit_cross_good (\n    input  wire clk_a,\n    input  wire pulse_a,             // single-bit event in domain a\n    input  wire clk_b,\n    output wire pulse_b            // event in domain b\n);\n    (* ASYNC_REG = "TRUE" *) reg s1, s2;  // attribute spelling is vendor-specific\n    always @(posedge clk_b) begin\n        s1 <= pulse_a;                // may go metastable ONCE\n        s2 <= s1;                     // one full cycle to resolve\n    end\n    assign pulse_b = s2;\nendmodule\n\n// For the 8-bit bus the safe patterns are a handshake (toggle +\n// data-stable window) or an asynchronous FIFO — structures, not\n// per-bit hacks. Both are standard library-level designs.',
        explanation: [
          'bus_cross_bad is the classic mistake: eight independent synchronizers can capture eight bits at eight different instants, so data_b can hold a value that was never driven — silently, rarely, and never in a short simulation.',
          'bit_cross_good is the correct single-bit pattern: two flip-flops in the destination domain, the first allowed to resolve metastably during one full clock period before s2 samples it.',
          'The ASYNC_REG attribute comment says explicitly that spelling is vendor-specific — this platform teaches the structure, not tool flags.',
          'The honest closing note names the real bus solutions (handshake, async FIFO) as the next structures to learn; per-bit synchronization of buses is never the answer.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The three classes of sim-passes/board-fails',
        content:
          '            "works in simulation, fails on board"\n                          |\n      +-------------------+--------------------+\n      |                   |                    |\n     CDC             INITIALIZATION        CONSTRAINTS\n      |                   |                    |\n unsynced crossing   no reset / init     missing create_clock\n async input         on some register    missing pin constraint\n      |                   |              missing I/O delays\n 2-FF sync (bit)     reset every FF      constraint checklist\n handshake / AFIFO   (async active-low   vs board doc\n (bus)               reset_n) + check\n                     reset reachability',
        caption:
          'Classification is the debug skill: each class has a signature and a standard fix. Most "mysteries" are one of these three wearing a costume.',
      },
    ],
    tables: [
      {
        caption: 'Failure class signatures and standard fixes',
        headers: ['Class', 'Board symptom', 'Why sim passed', 'Standard fix'],
        rows: [
          ['CDC (bit)', 'Rare, irreproducible glitches; worse when hot or at frequency', 'Metastability not modeled (or too rare to hit)', '2-FF synchronizer in destination domain'],
          ['CDC (bus)', 'Impossible values appearing (not just shifted)', 'Bits sampled coherently by idealized clock model', 'Handshake or async FIFO; never per-bit sync'],
          ['Initialization', 'FSM starts in arbitrary state; works after a manual reset', 'Registers start known/x per sim semantics', 'Reset all stateful elements; verify reset reachability'],
          ['Constraints', 'Design "meets timing" but misbehaves; silent outputs', 'Simulator never reads constraints', 'Complete constraints vs board docs; treat warnings as errors'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Synchronizing a multi-bit bus bit-by-bit because the single-bit fix "obviously generalizes".',
        fix: 'It does not: per-bit sync skews the bus into impossible values. Single bits get 2-FF synchronizers; buses get handshakes or asynchronous FIFOs. Know which case you are in before writing the crossing.',
      },
      {
        mistake: 'Relying on FPGA register init values instead of reset, then wondering why behavior differs between flows.',
        fix: 'Init values are real on many families but are a configuration-time feature some flows handle differently. For anything stateful, use the platform reset convention (async active-low reset_n) and treat init as an extra, not a substitute.',
      },
      {
        mistake: 'Treating a passing simulation as sufficient verification for sign-off.',
        fix: 'Simulation is necessary, not sufficient: keep a written "board-only risks" list (CDC inventory, reset reachability, constraint completeness, I/O budget) and retire each item explicitly before declaring a design done.',
      },
    ],
    guidedPractice: {
      title: 'Classify and fix three board failures',
      brief:
        'For each board failure, name its class (CDC / initialization / constraints) and the standard fix: (a) an FSM sometimes starts in an invalid encoding until the reset button is pressed; (b) a counter driven from an external async sensor line occasionally jumps by 2; (c) a design passes a 40 MHz constraint check although the board oscillator is 50 MHz, and real behavior is marginal.',
      starterCode:
        '(a) class: ______ fix: ______\n(b) class: ______ fix: ______\n(c) class: ______ fix: ______',
      expectedBehavior:
        '(a) Initialization — FSM state register lacks reset (or reset not reachable at power-up); fix: async reset on state register, verify reset path on board. (b) CDC — async sensor sampled directly; fix: 2-FF synchronizer before the counter (single bit). (c) Constraints — create_clock period does not match the real oscillator; fix: constrain 20.000 ns (50 MHz) and re-run timing against reality.',
      hints: [
        'Invalid start state screams "no reset reached".',
        'Occasional single-event corruption from an external line is the CDC signature.',
        'The design cannot have been verified against a clock it was not told about.',
      ],
    },
    practiceExercises: [
      {
        title: 'Power and I/O budget drill',
        brief:
          'A small board supplies 3.3 V at 1 A to the FPGA bank. Your design drives 12 LEDs at up to 8 mA each (per the I/O standard\'s drive setting, to be verified against the device datasheet). Compute the worst-case I/O current, the remaining budget, and state the documentation you would check to make the numbers real.',
        expectedBehavior:
          '12 × 8 mA = 96 mA worst-case I/O current; 1 A supply leaves ~904 mA for fabric and everything else on that rail — comfortable at order-of-magnitude level. Real numbers need: the device datasheet\'s per-pin drive and per-bank current limits, the board schematic\'s regulator rating, and (on a real flow) the tool\'s power estimate.',
        hints: [
          'Worst case = all outputs high at max drive, simultaneously.',
          'Compare against the rail\'s supply capacity, not the pin limit alone.',
          'Name the documents — the arithmetic is the easy half; attribution is the habit.',
        ],
      },
      {
        title: 'Crossing inventory',
        brief:
          'A design has: (1) an async pushbutton into a debouncer clocked at 50 MHz; (2) an 8-bit result passed from a 50 MHz datapath to a 100 MHz DSP block; (3) a 1 Hz tick consumed by a 1 kHz process. For each, state whether a crossing exists and the safe structure.',
        expectedBehavior:
          '(1) Single-bit async input → 2-FF synchronizer (the debouncer should sample the synchronized line). (2) Multi-bit bus between real clock domains → handshake or asynchronous FIFO; never per-bit sync. (3) Both derived from the same base clock (synchronous enables) → not a true crossing; a simple enable/tick handshake within one domain suffices.',
        hints: [
          'A crossing needs two unrelated clocks or an async source.',
          'Derived clocks from the same PLL/base are usually same-domain with enables.',
          'Single bit vs bus determines the structure.',
        ],
      },
    ],
    assessment: {
      title: 'Sim-vs-board checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'An 8-bit result must cross from a 50 MHz domain to an unrelated 100 MHz domain. What is the safe structure?',
          options: [
            'Eight 2-FF synchronizers, one per bit',
            'One 9-FF synchronizer for the bus plus a parity bit',
            'A handshake or an asynchronous FIFO',
            'Route the bus through block RAM with no control',
          ],
          answer: 'A handshake or an asynchronous FIFO',
          explanation:
            'Per-bit synchronizers skew the bus into values that never existed. Buses cross via structures that move the whole value coherently: a handshake (data held stable while a valid bit crosses) or an asynchronous FIFO.',
          hint: 'What goes wrong when bits cross independently?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A design that passes every simulation is therefore verified against its pin constraints and clock specification.',
          answer: 'false',
          explanation:
            'Simulators execute RTL; they do not read constraint files or board documentation. Constraint completeness is checked by review against the board docs, never by simulation.',
          hint: 'Which artifacts does the simulator actually consume?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Why does the second flip-flop in a 2-FF synchronizer help?',
          options: [
            'It eliminates metastability at the first flip-flop',
            'It gives the first flip-flop a full clock cycle to resolve before its value is used',
            'It doubles the sampling frequency',
            'It prevents the input from changing',
          ],
          answer: 'It gives the first flip-flop a full clock cycle to resolve before its value is used',
          explanation:
            'The first FF may capture metastably; the second samples it one clock later, by which time the first has (with overwhelming probability) resolved to a valid level. It reduces the risk to negligible rates; it is not an absolute guarantee.',
          hint: 'Metastability resolves with time — what does one clock cycle buy?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word for the category of failures caused by registers coming up in arbitrary states because reset never reaches them.',
          answer: 'initialization',
          explanation:
            'Initialization failures: stateful elements without reset (or with unreachable reset) start in arbitrary states on silicon even though simulation began from known values.',
          hint: 'It is about the state registers\' starting values.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'CDC', definition: 'Clock-domain crossing: a signal moved between unrelated clocks (or from an async source) without proper synchronization.' },
      { term: 'Metastability', definition: 'A flip-flop captured between valid levels; resolves unpredictably unless given time.' },
      { term: 'Asynchronous FIFO', definition: 'Dual-port memory with independent read/write clocks — the standard safe bus crossing.' },
      { term: 'Reset reachability', definition: 'Whether reset actually reaches and releases every stateful element in real operation.' },
      { term: 'I/O budget', definition: 'Sum of per-pin drive currents checked against bank and regulator limits, verified from datasheets.' },
    ],
    revisionSummary: [
      'Sim-passes/board-fails falls into three classes: CDC, initialization, constraints — each with a signature and standard fix.',
      'Single bits cross with 2-FF synchronizers; buses cross with handshakes or async FIFOs, never per-bit sync.',
      'Reset every stateful element with the platform convention and verify reset reachability on the board.',
      'Simulation is necessary but not sufficient — keep and retire a written board-only risk list.',
      'I/O and power budgets are documentation arithmetic (drive limits, bank rails, regulator rating) — practice them without tools.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Metastability (electronics)', url: 'https://en.wikipedia.org/wiki/Metastability_(electronics)', kind: 'article' },
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
