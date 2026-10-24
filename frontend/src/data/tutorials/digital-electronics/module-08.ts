import type { TutorialLesson } from '../types';

export const module08Lessons: TutorialLesson[] = [
  {
    id: 'de-m08-l01',
    title: 'Clocks, Period, Frequency, and Propagation Delay',
    summary:
      'The vocabulary of hardware time: clock period and frequency, edges and duty cycle, propagation delay through gates and registers, and how combinational depth sets the pace of a design.',
    objectives: [
      'Convert freely between clock period and frequency (f = 1/T) with units.',
      'Define rise/fall edges, duty cycle and clock-to-Q delay.',
      'Trace a signal path through flip-flops and combinational logic accumulating delays.',
      'Explain why deeper combinational logic lowers the maximum clock frequency.',
    ],
    whyItMatters:
      'Everything in Modules 6-7 assumed "one value per edge" — this lesson supplies the physics behind that assumption. Period, frequency and propagation delay are the units of every FPGA timing report, every datasheet and every clock-domain discussion you will ever have. Master them here and the setup/hold analysis of the next lesson becomes arithmetic.',
    prerequisites: ['de-m06-l02'],
    explanation:
      '### The clock: the metronome of synchronous design\n\nA **clock** is a periodic square wave. Its **period** T is the time between identical edges (usually rising edges), measured in nanoseconds; its **frequency** f is the reciprocal:\n\n```\nf = 1 / T        T = 1 / f\n\n10 ns   <-> 100 MHz\n5 ns    <-> 200 MHz\n1 ns    <-> 1 GHz\n```\n\nSynchronous design promises: between any two consecutive rising edges, all logic settles; at each edge, all flip-flops sample together. The whole discipline of the next two lessons is making that promise keepable.\n\n### Edges and duty cycle\n\n- **Rising edge** (0 -> 1) and **falling edge** (1 -> 0): flops trigger on one of them; Verilog\'s `posedge`/`negedge` name the choice.\n- **Duty cycle**: fraction of the period spent high. 50/50 is typical for clocks; a 60/40 clock changes when setup windows sit, which matters at high speed. Slow-edge or skewed-duty clocks are analog-domain problems that digital designers must still specify against.\n\n### Propagation delay: nothing is instantaneous\n\n**Propagation delay** t_pd is the time from an input change to the corresponding settled output change. It exists for every gate (charge moving through transistors takes time) and for every flip-flop in two flavors:\n\n- **t_cq (clock-to-Q)**: from the active clock edge to Q being valid — typically a fraction of a nanosecond to about a nanosecond on modern silicon.\n- Combinational t_pd per gate: smaller, but it *sums along paths*.\n\nA path\'s total delay is the sum of its series elements:\n\n```\npath delay = t_cq(launch flop) + sum of combinational gate delays\n```\n\n### Depth is destiny\n\nBecause gate delays add in series, the *deepest* combinational path between two flip-flops determines how fast the clock may run. A 2-gate path and a 20-gate path between registers obey the same rule but differ by an order of magnitude in cost. This is the quantitative backing for two habits taught earlier: minimizing logic (Module 4) and pipelining (Module 6, registers inserted to split deep logic). When a design "does not meet timing", the fix is almost always: shorten the longest path.',
    deepDive:
      '### Why delay varies: PVT\n\nA gate\'s delay is not a constant — it shifts with **process** (manufacturing lot), **voltage** and **temperature** (PVT). Fast corners make paths quicker (good for setup, dangerous for hold); slow corners make them slower (setup risk). Timing tools therefore check setup at the slow corner and hold at the fast corner. This is why datasheets quote min/typ/max delays and why a "0.8 ns" clock-to-Q in a homework problem is really a distribution with tails — Module 8 lesson 2 uses the worst-case numbers deliberately.\n\n### Units and orders of magnitude\n\nDevelopers think in milliseconds; hardware engineers live in nanoseconds and picoseconds: 1 ns = 1000 ps; 1 GHz clock = 1 ns period; a modern gate delay is on the order of tens of picoseconds. Mental anchors: light travels about 15 cm per ns; a 3 GHz processor cycle is ~0.33 ns. Keeping one such anchor prevents unit slips (MHz vs ns) that produce answers wrong by a factor of a million — the most common homework and interview error in timing questions.',
    examples: [
      {
        title: 'Period/frequency conversions and a path-delay ledger',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    /* f = 1/T conversions across common design points */\n    double periods_ns[4] = {10.0, 5.0, 2.0, 1.0};\n    for (int i = 0; i < 4; i++) {\n        double f_mhz = 1000.0 / periods_ns[i];\n        printf("T = %5.1f ns  ->  f = %7.1f MHz\\n", periods_ns[i], f_mhz);\n    }\n\n    /* Accumulate a register-to-register path delay */\n    double t_cq        = 0.8;   /* clock-to-Q of the launching flop  */\n    double gates[4]    = {0.5, 0.6, 0.4, 0.5};  /* 4 gates in series */\n    double path = t_cq;\n    for (int i = 0; i < 4; i++) path += gates[i];\n    printf("path delay = %.2f ns -> max safe period > %.2f ns\\n",\n           path, path);\n    return 0;\n}',
        explanation: [
          'Each conversion divides 1000 (ns-per-microsecond bridge) by the period in ns to get MHz: 10 ns -> 100 MHz, 1 ns -> 1000 MHz.',
          'The path ledger starts with clock-to-Q (the launch cost every register path pays) and adds each series gate in order.',
          'Total path = 0.8 + 0.5 + 0.6 + 0.4 + 0.5 = 2.8 ns; the clock period must exceed this for the data to be *available* — the next lesson adds the setup requirement on top.',
          'Doubling depth to 8 gates would raise the path to ~4.8 ns and cut the maximum frequency by nearly half: depth is expensive linearly.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Clock anatomy and a delay through one gate',
        content:
          'educational waveform (illustrative)\n\n          |<------ T (period) ------>|\n          |<-- t_high -->|<-- t_low ->|\n\n  clk   ___     _______     _______\n          \\___/       \\___/\n           ^ rising edge   ^ next rising edge\n\n  a single gate\'s delay (t_pd):\n\n  in     ____/^^^^\\_______________\n\n  out    ________/^^^^^^^^\\_____     out changes t_pd AFTER in settles\n                  ^--- t_pd ---^\n\n  duty cycle = t_high / T   (50% here)',
        caption:
          'educational waveform (illustrative). Period, edges, duty cycle — and a gate output following its input by t_pd.',
      },
      {
        kind: 'block',
        title: 'A register-to-register path and its delay ledger',
        content:
          '   clk ----+--------------+--------------+\n           |              |              |\n        +--+---+   (comb logic)   +--+---+\n        | FF1  |==>[g1]==>[g2]==>[g3]==| FF2  |\n        +------+   +--------------+  +------+\n\n   delay ledger along the path:\n      t_cq(FF1)          0.8 ns\n      g1                 0.5 ns\n      g2                 0.6 ns\n      g3                 0.4 ns\n      --------------------------------\n      data arrives at FF2.D after 2.3 ns (plus FF2\'s setup, next lesson)\n\n   the LONGEST such path in the design sets the minimum clock period.',
        caption:
          'Every register-to-register path is a ledger; the longest ledger is the critical path.',
      },
    ],
    tables: [
      {
        caption: 'Clock quick-reference',
        headers: ['Period', 'Frequency', 'Edges per second (rising)'],
        rows: [
          ['1 ns', '1 GHz', '1 x 10^9'],
          ['2 ns', '500 MHz', '5 x 10^8'],
          ['5 ns', '200 MHz', '2 x 10^8'],
          ['10 ns', '100 MHz', '1 x 10^8'],
          ['20 ns', '50 MHz', '5 x 10^7'],
        ],
      },
      {
        caption: 'Delay types introduced in this lesson',
        headers: ['Symbol', 'Name', 'Measured between'],
        rows: [
          ['T', 'Clock period', 'Consecutive same-polarity clock edges'],
          ['t_cq', 'Clock-to-Q', 'Clock edge -> flip-flop Q valid'],
          ['t_pd', 'Propagation delay', 'Gate input change -> gate output settled'],
          ['duty', 'Duty cycle', 'Fraction of period the clock is high'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Confusing MHz and ns (or writing "the 100 ns clock" for a 100 MHz clock).',
        fix:
          'Frequency and period are reciprocals: 100 MHz = 10 ns. Always write units with numbers, and sanity-check by direction: higher frequency = shorter period.',
      },
      {
        mistake: 'Counting only gate delays and forgetting clock-to-Q in a path.',
        fix:
          'Every register-to-register path starts with t_cq of the launching flop. Omitting it understates the path by roughly one gate — and timing tools will not forgive the difference.',
      },
      {
        mistake: 'Assuming the fastest path matters for setup.',
        fix:
          'Setup analysis uses the SLOWEST (longest) path between the two flops; the fastest path matters for hold (next lesson). Mixing the two corners is the classic timing-analysis error.',
      },
    ],
    guidedPractice: {
      title: 'Ledger a two-flop path and size the clock',
      brief:
        'A path has t_cq = 0.6 ns and three gates of 0.4, 0.9 and 0.5 ns. (a) Compute the total delay to FF2\'s D pin. (b) If the design must run at 250 MHz, what is the period, and does the data path alone fit? (c) What single gate would you attack first to speed the path up?',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    double t_cq = 0.6;\n    double gates[3] = {0.4, 0.9, 0.5};\n    double path = t_cq;\n    for (int i = 0; i < 3; i++) path += gates[i];\n\n    double f_mhz = 250.0;\n    double period_ns = 1000.0 / f_mhz;\n\n    printf("path delay  = %.2f ns\\n", path);\n    printf("period      = %.2f ns\\n", period_ns);\n    printf("path alone fits? %s\\n", path < period_ns ? "yes" : "NO");\n    return 0;\n}',
      expectedBehavior:
        '(a) 0.6 + 0.4 + 0.9 + 0.5 = 2.4 ns. (b) 250 MHz -> 4 ns period; the 2.4 ns data path fits (the setup requirement still has to be added next lesson). (c) The 0.9 ns gate — the largest single term; halving it saves 0.45 ns, the best return on effort.',
      hints: [
        'Sum the ledger in order: launch cost first, then each series gate.',
        'Period from frequency: T = 1000/f(MHz) in ns.',
        'Optimization targets the biggest single contributor first.',
      ],
    },
    practiceExercises: [
      {
        title: 'Frequency ladder',
        brief:
          'Convert: (a) 125 MHz to period; (b) 8 ns to frequency; (c) 0.5 ns to frequency. Then state how many rising edges occur in 1 microsecond at 125 MHz.',
        expectedBehavior:
          '(a) T = 1000/125 = 8 ns. (b) f = 1000/8 = 125 MHz. (c) 2 GHz. At 125 MHz, 1 microsecond holds 125 edges.',
        hints: [
          'f(MHz) = 1000 / T(ns), and back.',
          'Edges per microsecond = frequency in MHz x 1 (microsecond holds that many microseconds\' worth of cycles).',
          'Watch the GHz boundary: 1000 MHz = 1 GHz.',
        ],
      },
      {
        title: 'Pipelining arithmetic',
        brief:
          'A path is t_cq 0.8 ns + gates totalling 7.2 ns. At 100 MHz (10 ns) it meets timing. The clock requirement rises to 200 MHz. Show (with numbers) how inserting one register splitting the logic into two equal halves restores feasibility.',
        expectedBehavior:
          'Original path = 8.0 ns > 5 ns (200 MHz period): fails. Split into two ~4.0 ns stages (0.8 + 3.2 each): each stage fits inside 5 ns with 1 ns slack. Latency becomes 2 cycles; throughput stays one item per cycle. That is pipelining: trading latency for clock feasibility.',
        hints: [
          'Split the 7.2 ns of gates into two 3.6 ns halves; each stage adds its own t_cq.',
          'Compare each stage against the new 5 ns period.',
          'Distinguish latency (cycles per item) from throughput (items per cycle).',
        ],
      },
    ],
    assessment: {
      title: 'Clocks and delay checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'short-answer',
          prompt: 'What is the period of a 250 MHz clock? (Answer in ns.)',
          answer: '4',
          explanation: 'T = 1000/250 = 4 ns.',
          hint: 'T = 1000/f(MHz).',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which quantity is NOT part of a register-to-register path\'s setup ledger?',
          options: [
            'The holding flop\'s hold time (that belongs to the hold check)',
            'Clock-to-Q of the launching flop',
            'Delays of the combinational gates in series',
            'Setup time of the capturing flop (added in the setup check)',
          ],
          answer: 'The holding flop\'s hold time (that belongs to the hold check)',
          explanation:
            'Hold time belongs to the hold analysis (next lesson); the setup ledger carries clock-to-Q, gate delays and the capture flop\'s setup.',
          hint: 'Setup and hold are two different checks.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Deeper combinational logic between two flip-flops raises the maximum achievable clock frequency.',
          answer: 'false',
          explanation: 'Depth adds series delay, raising the minimum period — i.e., lowering the maximum frequency. Pipelining splits depth.',
          hint: 'What happens to the delay ledger as you add series gates?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does the program print for the path delay?',
          code: 'double t_cq = 0.8;\ndouble gates[4] = {0.5, 0.6, 0.4, 0.5};\ndouble path = t_cq;\nfor (int i = 0; i < 4; i++) path += gates[i];\nprintf("path = %.2f ns", path);',
          options: ['2.80 ns', '2.00 ns', '2.30 ns', '3.30 ns'],
          answer: '2.80 ns',
          explanation: '0.8 + 0.5 + 0.6 + 0.4 + 0.5 = 2.8 ns: launch cost plus four series gates.',
          hint: 'Add all five terms.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'At which manufacturing corner is the setup check performed, and why?',
          options: [
            'Slow corner (longest delays) — worst case for data arriving in time',
            'Fast corner — shortest delays are most dangerous',
            'Typical corner — averages are safest',
            'No corner matters for setup',
          ],
          answer: 'Slow corner (longest delays) — worst case for data arriving in time',
          explanation:
            'Setup asks "did data arrive before the deadline?"; the slow corner maximizes lateness. Hold is checked at the fast corner (next lesson).',
          hint: 'Which corner makes data latest?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Clock period (T)', definition: 'Time between consecutive identical clock edges; the reciprocal of frequency.' },
      { term: 'Frequency (f)', definition: 'Cycles per second, f = 1/T; 100 MHz = 10 ns period.' },
      { term: 'Duty cycle', definition: 'Fraction of the period the clock spends high; 50% is typical.' },
      { term: 'Propagation delay (t_pd)', definition: 'Input-change to settled-output time for a gate; sums in series along paths.' },
      { term: 'Clock-to-Q (t_cq)', definition: 'Delay from the active clock edge to the flip-flop output being valid; the launch cost of every path.' },
      { term: 'Critical path', definition: 'The longest register-to-register path; it sets the design\'s minimum clock period.' },
      { term: 'PVT', definition: 'Process, voltage, temperature — the environmental axes delay varies over; setup checks the slow corner.' },
    ],
    revisionSummary: [
      'f = 1/T; 100 MHz = 10 ns; memorize the ladder 1 ns/1 GHz up to 20 ns/50 MHz.',
      'Edges trigger flops (posedge/negedge); duty cycle describes the high fraction.',
      'Path delay = t_cq(launch) + sum(series gate delays).',
      'The longest register-to-register path (critical path) caps the clock; depth is the enemy.',
      'Setup checks the slow PVT corner; hold checks the fast corner.',
      'Pipelining inserts registers to split depth, trading latency for frequency.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Clock signal', url: 'https://en.wikipedia.org/wiki/Clock_signal', kind: 'article' },
      { label: 'Wikipedia — Propagation delay', url: 'https://en.wikipedia.org/wiki/Propagation_delay', kind: 'article' },
      { label: 'All About Circuits — Clock and timing basics', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-10/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'de-m08-l02',
    title: 'Setup Time, Hold Time, and Slack',
    summary:
      'The two timing checks that govern every synchronous design: the setup window before the capturing edge, the hold window after it, and how slack quantifies the margin — with fully worked numeric examples.',
    objectives: [
      'Define setup time, hold time and clock-to-Q, and draw the sampling window around a clock edge.',
      'Compute setup slack and hold slack from path numbers.',
      'Derive maximum clock frequency from the setup equation.',
      'Explain why slowing the clock fixes setup but never hold violations.',
    ],
    whyItMatters:
      'Setup and hold are THE two checks every timing tool in every flow performs billions of times. Interviewers ask for the slack equations verbatim; the RTL course\'s timing-closure exercises assume you can compute them by hand. This lesson gives you the numbers, the waveform reading, and the intuition for which knob fixes which failure.',
    prerequisites: ['de-m08-l01'],
    explanation:
      '### The sampling window\n\nA flip-flop does not sample instantaneously — its internal latches need the data to *hold still* around the edge:\n\n- **Setup time (t_su)**: data must be stable this long *before* the active edge.\n- **Hold time (t_h)**: data must remain stable this long *after* the active edge.\n\n```\n              |<-- t_su -->|^edge^<-- t_h -->|\n  D        xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n                       (must not change in the window)\n  clk      ________/^^^^^^^^\\_____\n                        ^ capturing edge\n```\n\nViolate setup and the flop may capture a *transitioning* value (or go metastable, Module 6 lesson 1). Violate hold and the *new* value races into the old flop before it finished capturing. Different diseases, different cures.\n\n### The setup check (the slow-corner check)\n\nData launched at edge E0 must reach the next flop before edge E1 minus setup:\n\n```\nsetup:  t_cq + t_pd(max) + t_su <= T\n\nsetup slack = T - (t_cq + t_pd_max + t_su)   >= 0 required\n\nf_max = 1 / (t_cq + t_pd_max + t_su)\n```\n\nWorked numbers: T = 10 ns, t_cq = 0.8 ns, t_pd(max) = 8.0 ns, t_su = 0.5 ns.\n\n- Budget used = 0.8 + 8.0 + 0.5 = 9.3 ns\n- **Setup slack = 10.0 - 9.3 = +0.7 ns** — met, and f_max = 1/9.3 ns = 107.5 MHz.\n\nShrink the clock to 9 ns and slack becomes -0.3 ns: violated. The fixes, in order of preference: shorten the logic path (K-map work, pipelining), or accept a slower clock.\n\n### The hold check (the fast-corner check)\n\nThe *new* value launched at edge E1 must not overtake the *old* value still being captured. Both signals travel through the same logic; the race is between t_cq+pd(min) of the new data and t_h of the capturing flop:\n\n```\nhold:   t_cq + t_pd(min) >= t_h\n\nhold slack = t_cq + t_pd_min - t_h   >= 0 required\n```\n\nWorked numbers: t_cq = 0.8 ns, t_pd(min) = 0.3 ns, t_h = 0.5 ns.\n\n- **Hold slack = 0.8 + 0.3 - 0.5 = +0.6 ns** — met.\n\nNote what is absent: **the clock period appears nowhere**. Hold violations are same-edge races; slowing the clock cannot fix them. That is why hold fixing (buffer insertion to add delay, or hold-safe cell choices) is a physical-design job, while setup fixing is usually a designer\'s job (shorten logic).',
    deepDive:
      '### Where skew fits\n\nClock **skew** is the arrival-time difference of the same edge at two flops. Capturing-edge arriving *late* (positive skew toward the capture flop) buys setup margin (the deadline moves out) but eats hold margin (the old data has more time to race through). Every slack equation has a skew term in the full version: setup slack = T - t_cq - t_pd - t_su + t_skew(capture later); hold slack = t_cq + t_pd_min - t_h - t_skew. Tools balance both — one reason designers avoid skew-sensitive hand-routed clocks.\n\n### Metastability connects the two checks\n\nA setup violation does not always produce a wrong value — it produces an *undefined-resolution* event (Module 6\'s metastability). Synchronizers (two flops in series on async inputs) work by giving a full clock period for any metastable value to resolve before it is used: they deliberately spend a cycle of latency to buy resolution time. Hold violations, by contrast, are deterministic capture errors — no waiting helps; the data is simply wrong.',
    examples: [
      {
        title: 'A complete slack calculator with pass/fail verdicts',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    double t_clk    = 10.0;   /* clock period, ns                  */\n    double t_cq     = 0.8;    /* clock-to-Q, launching flop        */\n    double t_pd_max = 8.0;    /* worst-case combinational delay    */\n    double t_pd_min = 0.3;    /* best-case combinational delay     */\n    double t_su     = 0.5;    /* setup time, capturing flop        */\n    double t_h      = 0.4;    /* hold time, capturing flop         */\n\n    double setup_slack = t_clk - (t_cq + t_pd_max + t_su);\n    double hold_slack  = (t_cq + t_pd_min) - t_h;\n    double f_max_mhz   = 1000.0 / (t_cq + t_pd_max + t_su);\n\n    printf("setup slack = %+.2f ns  (%s)\\n",\n           setup_slack, setup_slack >= 0 ? "MET" : "VIOLATED");\n    printf("hold  slack = %+.2f ns  (%s)\\n",\n           hold_slack, hold_slack >= 0 ? "MET" : "VIOLATED");\n    printf("f_max       = %.1f MHz\\n", f_max_mhz);\n    return 0;\n}',
        explanation: [
          'Setup ledger: 0.8 + 8.0 + 0.5 = 9.3 ns against a 10 ns period -> slack +0.7 ns, MET.',
          'Hold ledger: (0.8 + 0.3) - 0.4 = +0.7 ns, MET — and notice t_clk is unused: hold is period-independent.',
          'f_max = 1000/9.3 = 107.5 MHz: the fastest clock this path can ever support regardless of the current 10 ns choice.',
          'Change t_pd_max to 9.2 in your head: setup slack = -0.5 (VIOLATED) while hold slack is unchanged — the two checks are independent.',
          'This little program is the mental model of what a static timing analyzer does billions of times per run.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'The setup/hold window at the capturing flop',
        content:
          'educational waveform (illustrative)\n\n                        capture edge\n                             v\n  clk     ______/^^^^^^^^^^^^\\____________/^^^^\n\n                       |<-- t_su -->||<- t_h ->|\n  D     ~~~~~~XXXXXXXXXXXXXXXXXXXXXXXXXX~~~~~~\n                    data must be STILL through this window\n\n  q     __________________/^^^^^^^^^^^^^            q becomes valid\n                          ^-- t_cq after the edge\n\n  timeline of one setup-met cycle (numbers from the example):\n     0.0 ns  edge E0 launches data (FF1)\n     0.8 ns  FF1.Q valid (t_cq)\n     8.8 ns  data final at FF2.D (0.8 + 8.0)\n     9.5 ns  deadline (10.0 - 0.5 setup)  -> slack +0.7 ns\n    10.0 ns  edge E1 captures',
        caption:
          'educational waveform (illustrative). Data must be stable from t_su before the edge until t_h after it; q emerges t_cq later.',
      },
      {
        kind: 'block',
        title: 'Working path vs violating path (setup)',
        content:
          '  WORKING (t_pd_max = 8.0 ns):          VIOLATING (t_pd_max = 9.2 ns):\n\n   E0 launch                             E0 launch\n   0.8   t_cq                            0.8   t_cq\n   8.8   data ready  (0.8+8.0)           10.0  data ready (0.8+9.2)\n   9.5   deadline    (10.0-0.5)          9.5   deadline\n   +0.7  SETUP SLACK  -> MET             -0.5  SETUP SLACK -> FAIL\n                                         (data still moving at the edge)\n\n  fixes for the violating case:\n    1. shorter logic (K-map, re-encode)\n    2. pipeline: insert a register, halve the logic\n    3. slower clock (last resort)\n  hold slack is UNAFFECTED by all three — different disease.',
        caption:
          'The same arithmetic with a longer combinational path flips the verdict; the cure list is the designer\'s timing-closure toolkit.',
      },
    ],
    tables: [
      {
        caption: 'The two checks side by side',
        headers: ['Property', 'Setup check', 'Hold check'],
        rows: [
          ['Question asked', 'Did data arrive before the deadline?', 'Is new data not too early?'],
          ['Equation', 't_cq + t_pd_max + t_su <= T', 't_cq + t_pd_min >= t_h'],
          ['Slack', 'T - (t_cq + t_pd_max + t_su)', 't_cq + t_pd_min - t_h'],
          ['PVT corner used', 'Slow (max delays)', 'Fast (min delays)'],
          ['Depends on clock period?', 'Yes', 'No'],
          ['Fix by slowing clock?', 'Yes', 'No'],
          ['Typical fix', 'Shorten logic / pipeline / slow clock', 'Add delay buffers (physical design)'],
        ],
      },
      {
        caption: 'Worked example numbers',
        headers: ['Quantity', 'Value', 'Used in'],
        rows: [
          ['T', '10.0 ns', 'setup'],
          ['t_cq', '0.8 ns', 'both'],
          ['t_pd (max)', '8.0 ns', 'setup'],
          ['t_pd (min)', '0.3 ns', 'hold'],
          ['t_su', '0.5 ns', 'setup'],
          ['t_h', '0.4 ns', 'hold'],
          ['Setup slack', '+0.7 ns (MET)', '10.0 - 9.3'],
          ['Hold slack', '+0.7 ns (MET)', '1.1 - 0.4'],
          ['f_max', '107.5 MHz', '1 / 9.3 ns'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Adding setup time into the hold check (or vice versa).',
        fix:
          'The two checks use disjoint terms: setup = t_cq + t_pd_max + t_su vs T; hold = t_cq + t_pd_min vs t_h. If T appears in your hold equation, you have merged two different questions.',
      },
      {
        mistake: 'Trying to fix a hold violation by lowering the clock frequency.',
        fix:
          'Hold is a same-edge race with no T in it; slowing the clock changes nothing. Hold fixes are delay insertion or cell choices — or preventing the fast path structurally.',
      },
      {
        mistake: 'Reporting a negative slack as "met with margin".',
        fix:
          'Sign discipline: positive slack = margin remaining; negative = violation of that many ns. Timing reports live and die by the sign, and so do design reviews.',
      },
    ],
    guidedPractice: {
      title: 'Two paths, two verdicts',
      brief:
        'Design point: T = 8 ns, t_cq = 0.7 ns, t_su = 0.4 ns, t_h = 0.3 ns. Path A has t_pd_max = 6.5 ns and t_pd_min = 0.4 ns; path B has t_pd_max = 7.2 ns and t_pd_min = 0.2 ns. Compute both slacks for both paths, state f_max for each, and identify any violation plus its proper fix.',
      starterCode:
        '#include <stdio.h>\n\nvoid check(const char *name, double T, double tcq, double su,\n           double th, double pdmax, double pdmin) {\n    double s_slack = T - (tcq + pdmax + su);\n    double h_slack = (tcq + pdmin) - th;\n    double fmax = 1000.0 / (tcq + pdmax + su);\n    printf("%s: setup %+.2f (%s), hold %+.2f (%s), fmax %.1f MHz\\n",\n           name, s_slack, s_slack >= 0 ? "MET" : "FAIL",\n           h_slack, h_slack >= 0 ? "MET" : "FAIL", fmax);\n}\n\nint main(void) {\n    check("A", 8.0, 0.7, 0.4, 0.3, 6.5, 0.4);\n    check("B", 8.0, 0.7, 0.4, 0.3, 7.2, 0.2);\n    return 0;\n}',
      expectedBehavior:
        'Path A: setup = 8 - (0.7+6.5+0.4) = +0.4 MET; hold = (0.7+0.4) - 0.3 = +0.8 MET; f_max = 1000/7.6 = 131.6 MHz. Path B: setup = 8 - (0.7+7.2+0.4) = -0.3 FAIL; hold = (0.7+0.2) - 0.3 = +0.6 MET; f_max = 1000/8.3 = 120.5 MHz. Fix B by shortening its logic ~0.4 ns (or pipelining); slowing the clock to <= 120 MHz would also work for setup but is not the preferred cure.',
      hints: [
        'Apply the two equations mechanically; slack sign gives the verdict.',
        'f_max uses the setup ledger only.',
        'A negative setup slack names how many ns of logic you must remove (or period you must add).',
      ],
    },
    practiceExercises: [
      {
        title: 'Frequency hunting',
        brief:
          'A path has t_cq = 0.5 ns, t_pd_max = 4.3 ns, t_su = 0.2 ns. What is f_max? If the design targets 250 MHz, compute the setup slack and state whether pipelining is required.',
        expectedBehavior:
          'f_max = 1000/5.0 = 200 MHz. At 250 MHz (4 ns), setup slack = 4 - 5 = -1 ns: violated. The path simply cannot run at 250 MHz unsplit — one register is required regardless of logic tweaks.',
        hints: [
          'f_max = 1/(t_cq + t_pd_max + t_su).',
          'Negative slack at the target frequency means the target is infeasible for this path as-is.',
          'The shortfall (1 ns) exceeds any plausible gate-tweaking gain — restructure.',
        ],
      },
      {
        title: 'Hold forensics',
        brief:
          'A shift register bit feeds the next flop through a *wire only* (t_pd_min = t_pd_max = 0.1 ns). With t_cq = 0.8 ns and t_h = 0.5 ns, compute hold slack. Then explain why shift registers and scan chains are the classic hold-risk structures.',
        expectedBehavior:
          'Hold slack = (0.8 + 0.1) - 0.5 = +0.4 ns: met, but thin. Shift registers chain flops through near-zero logic, so hold margin is small by construction; process/voltage variation at the fast corner can erode it. Physical design inserts small delay buffers on such paths — the standard hold fix.',
        hints: [
          'Use t_pd_min = 0.1 (the wire).',
          'Small combinational delay = small numerator in the hold equation.',
          'The fix adds delay, never removes the flop.',
        ],
      },
    ],
    assessment: {
      title: 'Setup and hold checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Data must be stable from t_su BEFORE the capturing edge until:',
          options: ['t_h after the edge', 't_cq after the edge', 'the next edge', 'T/2 after the edge'],
          answer: 't_h after the edge',
          explanation: 'The sampling window spans setup before the edge through hold after it; both must be honored.',
          hint: 'Two margins bracket the edge.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'short-answer',
          prompt: 'With T = 10 ns, t_cq = 0.8 ns, t_pd_max = 8.0 ns, t_su = 0.5 ns: compute the setup slack in ns.',
          answer: '+0.7',
          explanation: '10 - (0.8 + 8.0 + 0.5) = +0.7 ns — met, with 0.7 ns of margin.',
          hint: 'Sum the ledger, subtract from T.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Why can a hold violation not be fixed by slowing the clock?',
          options: [
            'The hold equation contains no clock-period term; it is a same-edge race',
            'Slower clocks make hold worse',
            'Hold only matters at reset',
            'It can — slower clocks always help',
          ],
          answer: 'The hold equation contains no clock-period term; it is a same-edge race',
          explanation:
            'Hold compares the fast new data against t_h of the same edge; T does not appear, so frequency changes are irrelevant.',
          hint: 'Look for T in the hold inequality.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'Setup analysis uses worst-case (slow-corner) delays; hold analysis uses best-case (fast-corner) delays.',
          answer: 'true',
          explanation: 'Setup fears late data (slow corner); hold fears early data (fast corner). Tools check each at its own corner.',
          hint: 'Which corner makes each failure mode most likely?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'output-prediction',
          prompt: 'What does the calculator print for f_max with t_cq = 0.8, t_pd_max = 8.0, t_su = 0.5?',
          code: 'double f_max_mhz = 1000.0 / (t_cq + t_pd_max + t_su);',
          options: ['107.5 MHz', '100.0 MHz', '125.0 MHz', '93.0 MHz'],
          answer: '107.5 MHz',
          explanation: '1000 / 9.3 = 107.53 MHz — the ceiling this path imposes regardless of the current 10 ns clock.',
          hint: 'f = 1000 / (sum in ns).',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Setup time (t_su)', definition: 'How long data must be stable before the capturing edge.' },
      { term: 'Hold time (t_h)', definition: 'How long data must remain stable after the capturing edge.' },
      { term: 'Setup slack', definition: 'T - (t_cq + t_pd_max + t_su); positive = margin, negative = violation.' },
      { term: 'Hold slack', definition: '(t_cq + t_pd_min) - t_h; period-independent.' },
      { term: 'f_max', definition: '1 / (t_cq + t_pd_max + t_su): the fastest clock the critical path supports.' },
      { term: 'Clock skew', definition: 'Arrival-time difference of one edge at two flops; helps setup, hurts hold (or vice versa).' },
    ],
    revisionSummary: [
      'Sampling window: stable t_su before the edge through t_h after it.',
      'Setup: t_cq + t_pd_max + t_su <= T; slack = T - that sum.',
      'Hold: t_cq + t_pd_min >= t_h; no T anywhere.',
      'Slow the clock to fix setup; only delay insertion fixes hold.',
      'Setup at the slow corner, hold at the fast corner.',
      'f_max = 1/(t_cq + t_pd_max + t_su) — the critical path\'s ceiling.',
      'Negative slack is a violation magnitude, never "extra time used".',
    ],
    furtherReading: [
      { label: 'Wikipedia — Flip-flop (electronics): timing parameters', url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)', kind: 'article' },
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Electronics Tutorials — Flip-flop timing', url: 'https://www.electronics-tutorials.ws/sequential/seq_1.html', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'de-m08-l03',
    title: 'Reading Timing Diagrams and Why Timing Closure Matters',
    summary:
      'Putting it together: reading multi-signal timing diagrams, working vs violating paths on a waveform, the timing-closure workflow, and the bridge to static timing analysis (STA) in later courses.',
    objectives: [
      'Read clocked timing diagrams: sample points, valid windows, delay annotations.',
      'Distinguish working and violating behavior on a waveform of the same circuit.',
      'Explain the timing-closure workflow: constrain, analyze, fix, re-check.',
      'Describe what a static timing analyzer computes and why it replaced exhaustive simulation.',
    ],
    whyItMatters:
      'This lesson is the bridge between this course and the professional toolchain: STA, constraints (SDC), and timing reports in the RTL and FPGA tracks. After it, phrases like "critical path", "WNS", "hold fix" and "meet timing at 100 MHz" are operations you understand, not jargon — and every waveform in a datasheet becomes readable.',
    prerequisites: ['de-m08-l02'],
    explanation:
      '### Reading a clocked timing diagram\n\nTiming diagrams pack five kinds of information; learn to see each:\n\n1. **Edges**: vertical alignment tells you what happened simultaneously.\n2. **Valid windows**: shaded or bracketed regions where a signal is guaranteed stable.\n3. **Delay arrows**: horizontal annotations (t_cq, t_pd, t_su, t_h) between transitions.\n4. **Causality**: which signal\'s transition *caused* another\'s (output follows input by t_pd).\n5. **The sampling instant**: for every flop, the value *at* the edge is what matters — everything between edges is context.\n\nA working diagram shows data transitions happening safely away from every sampling window. A violating diagram shows a transition *inside* a window — the capture is undefined.\n\n### Working vs violating, on one circuit\n\nTake FF1 -> logic -> FF2 with T = 10 ns, t_cq = 0.8, t_su = 0.5 (deadline 9.5 ns after launch):\n\n```\nWORKING (t_pd = 8.0):                VIOLATING (t_pd = 9.2):\n\n  data ready at  8.8 ns               data ready at 10.0 ns\n  deadline       9.5 ns               deadline       9.5 ns\n  slack         +0.7  OK              slack         -0.7  FAIL\n\n  at E1, FF2 captures the NEW value   at E1, the data is still MOVING:\n  cleanly.                            FF2 captures a mid-transition voltage\n                                      -> metastable or wrong value.\n```\n\nThe waveforms differ by one thing: where the data transition lands relative to E1. Everything in static timing analysis is a systematic hunt for that condition on every path, at every corner.\n\n### The timing-closure workflow\n\n1. **Constrain**: declare the clock (period, ports), input/output delays, exceptions. (SDC files in real flows.)\n2. **Analyze**: STA walks every register-to-register path, computing setup slack at the slow corner and hold slack at the fast corner — no simulation vectors needed; it is exhaustive by construction.\n3. **Fix negatives**: WNS (worst negative setup slack) paths get re-designed: logic reduction (Module 4), retiming, pipelining (Module 6); hold fixes get delay buffers (physical design).\n4. **Re-check**: repeat until all slacks are positive at target frequency — that is *closure*.\n\n### Why STA replaced simulation for timing\n\nSimulating every input sequence to *catch* a timing violation needs vectors for every path and every corner — impossible in practice; you only find what your vectors touch. STA instead *computes* worst cases over the whole graph: it proves every path meets setup/hold at every corner, or hands you the failing paths sorted by slack. That shift from sampling to proving is one of the great ideas of EDA, and the slack arithmetic you did by hand last lesson is literally what it automates.',
    deepDive:
      '### What "WNS" and "TNS" mean on a report\n\nA timing summary reports **WNS** (worst negative slack — the single worst path\'s margin; positive WNS means all paths pass) and **TNS** (total negative slack — the sum over failing paths, a measure of how widespread the problem is). A design with WNS = +0.05 ns is closed but fragile; a PVT or voltage shift can flip it. Healthy targets leave margin (e.g., 10% of the period) for exactly that drift — which is why experienced engineers close at 108 MHz to ship 100 MHz.\n\n### The glitches connection\n\nModule 3\'s decode glitches and Module 5\'s mux select races were qualitative; timing closure makes them quantitative: a glitch is harmless exactly when it settles a full (t_cq + t_pd + t_su) before the next sampling edge. Synchronous design does not eliminate glitches — it *quarantines* them between registers. Every hazard you met earlier is tolerable precisely because the flops of Module 6 and the checks of this lesson bound the damage.',
    examples: [
      {
        title: 'A readable multi-signal timing diagram (annotated text waveform)',
        language: 'text',
        code:
          'educational waveform (illustrative)\n\n   Two flops FF1 -> [2 gates] -> FF2, T = 10 ns,\n   t_cq = 0.8, t_pd = 8.0 (total 8.8), t_su = 0.5.\n\n            E0        E1        E2\n   clk   ___/^^\\_____/^^\\_____/^^\\_____\n\n   FF1.Q ____/^^^^^^^^^^^^^^^^^^^^^^^^^   (changed at E0 + 0.8 ns)\n\n   FF2.D ________________/^^^^^^^^^^^^^   (settles at E0 + 8.8 ns)\n                       ^ valid well before E1 - 0.5 = 9.5 ns\n\n   FF2.Q ____________________/^^^^^^^^^   (changes at E1 + 0.8 ns)\n\n   reading checklist:\n     1. mark every clock edge\n     2. shift each FF1.Q change by t_cq\n     3. shift by the logic delay (t_pd)\n     4. compare against E1 - t_su\n     5. FF2.Q follows one full cycle later: (E1 + t_cq)',
        explanation: [
          'Line 1: edges are the only instants the design *uses*; everything else is preparation.',
          'Lines 2-3: each stage shifts its signal by its own delay — causality is a chain of horizontal offsets.',
          'The validity check is the comparison at step 4: 8.8 < 9.5, so the capture at E1 is safe.',
          'FF2.Q changing at E1 + t_cq shows the one-cycle pipeline latency: data enters at E0, leaves the second flop after E1.',
          'With t_pd = 9.2 the same drawing would show FF2.D still transitioning at 10.0 ns — the diagram form of negative slack.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The timing-closure loop',
        content:
          '   +------------+     +------------------+     +---------------------+\n   | constrain  | --> | analyze (STA):   | --> | fix: shorten logic, |\n   | clock, I/O |     | setup @ slow     |     | pipeline, retime,   |\n   | delays     |     | hold  @ fast     |     | hold buffers        |\n   +------------+     +------------------+     +---------------------+\n          ^                  |     all slack >= 0         |\n          |                  v                            |\n          |            +------------------+               |\n          +----------- |  YES: CLOSED     |              |\n          (re-check)   |  ship at target  |<-------------+\n                       +------------------+\n\n   metrics: WNS = worst negative slack (one number)\n            TNS = total negative slack (how widespread)',
        caption:
          'Closure is a loop: constrain, analyze, fix, repeat — until every path passes at the target frequency.',
      },
    ],
    tables: [
      {
        caption: 'Reading checklist for any timing diagram',
        headers: ['Step', 'What to look for', 'The question it answers'],
        rows: [
          ['1. Edges', 'Vertical alignment of clock transitions', 'When is everything sampled?'],
          ['2. Delays', 'Horizontal arrows (t_cq, t_pd)', 'When does each signal become valid?'],
          ['3. Windows', 'Setup/hold brackets around edges', 'When must data be still?'],
          ['4. Comparisons', 'Data-ready time vs deadline', 'Is the capture safe (slack sign)?'],
          ['5. Latency', 'Q changes one cycle after capture', 'How many cycles does the path take?'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reading a timing diagram from the output backwards.',
        fix:
          'Always read forward: edge -> t_cq -> logic -> setup check. Reverse reading hides causality and makes delays look like they "happen before" their cause.',
      },
      {
        mistake: 'Assuming a passed testbench means timing is fine.',
        fix:
          'Functional simulation (with unit delays or none) says nothing about slack. Only STA proves timing; testbenches prove function. The two verifications answer different questions.',
      },
      {
        mistake: 'Chasing WNS to exactly 0.00 ns and declaring victory.',
        fix:
          'Zero margin flips with any PVT drift. Close with margin (e.g., aim for WNS > +10% of the period) so silicon variance, voltage droop and temperature do not re-open the violation.',
      },
    ],
    guidedPractice: {
      title: 'Close a two-path design',
      brief:
        'Design: T = 10 ns; t_cq = 0.8; t_su = 0.5; t_h = 0.4; t_pd_min = 0.2. Path A: t_pd_max = 7.4 ns; path B: t_pd_max = 9.0 ns. (a) Compute setup and hold slack for both. (b) Identify WNS. (c) Propose the minimal fix to close at 10 ns and state the new WNS after halving path B with a pipeline register (split its logic 4.5/4.5).',
      starterCode:
        '#include <stdio.h>\n\nvoid path(const char *name, double pdmax) {\n    double T = 10.0, tcq = 0.8, su = 0.5;\n    double s = T - (tcq + pdmax + su);\n    printf("%s: setup slack %+.2f ns (%s)\\n",\n           name, s, s >= 0 ? "MET" : "FAIL");\n}\n\nint main(void) {\n    path("A (7.4 ns logic)", 7.4);\n    path("B (9.0 ns logic)", 9.0);\n    path("B stage1 (4.5)",   4.5);\n    path("B stage2 (4.5)",   4.5);\n    return 0;\n}',
      expectedBehavior:
        '(a) Path A setup = 10 - (0.8+7.4+0.5) = +1.3 MET; path B setup = 10 - 10.3 = -0.3 FAIL; hold both = (0.8+0.2) - 0.4 = +0.6 MET. (b) WNS = -0.3 ns (path B). (c) Pipeline B: stages of 0.8+4.5+0.5 = 5.8 ns each -> slack +4.2 per stage; new design WNS = +1.3 (path A becomes the critical path). Latency of B increases by one cycle.',
      hints: [
        'Slack arithmetic is per-path; the design verdict takes the worst.',
        'After fixing B, the worst path may change — recompute WNS over all paths.',
        'Pipelining adds a cycle of latency to that path only.',
      ],
    },
    practiceExercises: [
      {
        title: 'STA by hand on a three-path design',
        brief:
          'Paths (same t_cq 0.7, t_su 0.4, T = 6.67 ns i.e. 150 MHz): P1 t_pd = 4.9, P2 t_pd = 5.3, P3 t_pd = 5.9. Compute all setup slacks, name the critical path, and state the design f_max.',
        expectedBehavior:
          'Ledgers: P1 = 0.7+4.9+0.4 = 6.0 -> slack +0.67; P2 = 6.4 -> +0.27; P3 = 7.0 -> -0.33 FAIL. Critical path = P3; f_max = 1000/7.0 = 142.9 MHz. To close at 150 MHz, P3 must shrink by >0.33 ns.',
        hints: [
          'Compute each ledger, then take the minimum slack.',
          'f_max comes from the worst ledger.',
          'The shortfall (0.33 ns) tells you how much logic to remove.',
        ],
      },
      {
        title: 'Explain the bridge',
        brief:
          'In five sentences, explain to a software colleague why static timing analysis is exhaustive while simulation-based verification is not, and what each one guarantees.',
        expectedBehavior:
          'STA enumerates every register-to-register path structurally and computes the worst-case delay with closed-form inequalities — coverage is complete by construction, for timing only. Simulation executes chosen stimulus, so it proves function only for the vectors applied and cannot see slow corners. STA guarantees "no path violates setup/hold at these corners"; simulation guarantees "behavior matches the spec on what was tested". Both are required: STA for schedule (time), simulation/simulation-coverage for logic. Neither replaces the other.',
        hints: [
          'Exhaustive over what dimension? (paths/corners vs input sequences)',
          'What does each sign off on?',
          'The design flow runs both, deliberately.',
        ],
      },
    ],
    assessment: {
      title: 'Timing diagrams and closure checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'On a timing diagram, a data transition falling INSIDE the setup/hold window of the capturing edge means:',
          options: [
            'The capture is unreliable: setup (or hold) violation',
            'The flop will capture faster',
            'Nothing — windows are advisory',
            'The clock must be faster',
          ],
          answer: 'The capture is unreliable: setup (or hold) violation',
          explanation: 'Transitions inside the sampling window mean the flop may see a moving value: metastability or wrong data.',
          hint: 'What does the window exist to prevent?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'short-answer',
          prompt: 'What does the abbreviation WNS stand for? (Three words.)',
          answer: 'worst negative slack',
          explanation:
            'WNS is the worst (most negative) setup slack across all paths; WNS > 0 means every path meets setup with at least that much margin.',
          hint: 'It is one number summarizing the whole design.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A testbench that passes with zero-delay simulation proves the design meets timing.',
          answer: 'false',
          explanation:
            'Functional simulation has no real delays; only static timing analysis (or annotated gate-level simulation at the corners) speaks to setup/hold.',
          hint: 'Which check contains T, t_cq, t_su at all?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'In the guided-practice program, what verdict does path B print?',
          code: 'path("B (9.0 ns logic)", 9.0);   /* T=10, tcq=0.8, su=0.5 */',
          options: ['FAIL (-0.30 ns)', 'MET (+0.30 ns)', 'MET (+0.70 ns)', 'FAIL (-0.70 ns)'],
          answer: 'FAIL (-0.30 ns)',
          explanation: '10 - (0.8 + 9.0 + 0.5) = -0.3 ns: the data misses the deadline by 0.3 ns.',
          hint: 'Sum the three ledger terms and subtract from 10.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'Why do engineers close timing with margin (e.g., WNS > +10% of the period)?',
          options: [
            'PVT and voltage drift can erode a zero-margin design after sign-off',
            'Tools require positive WNS to run',
            'Margin makes the chip smaller',
            'Zero WNS is mathematically impossible',
          ],
          answer: 'PVT and voltage drift can erode a zero-margin design after sign-off',
          explanation:
            'Delays shift with process, voltage and temperature; a design closed exactly at 0 can violate in the field. Margin absorbs realistic drift.',
          hint: 'Silicon is not a spreadsheet.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Timing diagram', definition: 'Waveform view showing signal transitions, delays, and sampling windows over time.' },
      { term: 'Valid window', definition: 'The interval during which a signal is guaranteed stable for capture.' },
      { term: 'Timing closure', definition: 'The iterative process of making every path meet setup and hold at the target frequency.' },
      { term: 'Static timing analysis (STA)', definition: 'Exhaustive, simulation-free computation of path delays and slacks across all paths and corners.' },
      { term: 'WNS / TNS', definition: 'Worst negative slack (single worst path) and total negative slack (sum over failing paths).' },
      { term: 'SDC constraints', definition: 'The constraint file format declaring clocks, I/O delays and exceptions to the timing tool.' },
    ],
    revisionSummary: [
      'Read diagrams forward: edge -> t_cq -> logic -> setup deadline.',
      'Transitions inside the sampling window = violation; outside = safe.',
      'Closure loop: constrain (SDC) -> STA (setup slow, hold fast) -> fix -> re-check.',
      'WNS summarizes the whole design; TNS shows how widespread failures are.',
      'Synchronous design quarantines glitches between registers; timing checks bound them.',
      'Simulation proves function on tested vectors; STA proves timing on all paths. Both are required.',
      'Close with margin — silicon drifts after sign-off.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Wikipedia — Timing closure', url: 'https://en.wikipedia.org/wiki/Timing_closure', kind: 'article' },
      { label: 'Wikipedia — Design Constraints (SDC)', url: 'https://en.wikipedia.org/wiki/Synopsys_Design_Constraints', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
];
