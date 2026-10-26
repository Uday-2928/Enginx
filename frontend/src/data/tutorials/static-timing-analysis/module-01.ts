import type { TutorialLesson } from '../types';

export const module01Lessons: TutorialLesson[] = [
  {
    id: 'sta-m01-l1',
    title: 'Launch, Capture and the Setup Check',
    summary:
      'The vocabulary every timing conversation assumes: launch and capture edges, data arrival time, data required time, and the setup check — worked end to end with real numbers and zero hand-waving.',
    objectives: [
      'Name the four events of every timing path: launch edge, clock-to-Q, combinational delay, capture edge.',
      'Compute data arrival time and data required time from a path description.',
      'Compute setup slack and explain its sign and units.',
      'Derive the maximum frequency of a path from its delay components.',
    ],
    whyItMatters:
      'Every FPGA build report, every ASIC sign-off and every timing interview question is written in this vocabulary. An engineer who cannot compute slack by hand cannot tell whether a tool report is plausible, cannot sanity-check a constraint, and cannot argue with an over-constrained netlist. The arithmetic is five minutes of math; the five minutes pays back for a career.',
    prerequisites: [
      'Sequential circuits: flip-flops, clocks, propagation delay (Digital Electronics course, Module 8)',
      'RTL clocked processes (Verilog course, Module 9)',
    ],
    explanation:
      'A **timing path** is a specific route data takes: out of one flip-flop, through combinational logic, into another flip-flop. The flop that launches the data is the **launch flop**; the flop that receives it is the **capture flop**. Both are clocked, and the entire question of static timing analysis is: *does the data reliably make it from launch to capture within the window the clock allows?*\n\nThe **setup check** asks the question for two *different* clock edges. The launch flop outputs new data on clock edge *n*; the capture flop samples its input on the next edge, *n+1*, one full clock period later. Data arrival time is when the signal physically arrives at the capture flop\'s D pin:\n\n```\narrival = t_launch_clock + t_cq + t_comb_max\n```\n\nwhere `t_cq` is the clock-to-Q delay of the launch flop and `t_comb_max` is the total combinational delay along the path (worst case). Data required time is the latest arrival the capture flop tolerates:\n\n```\nrequired = t_capture_clock + T - t_setup\n```\n\nwhere `T` is the clock period and `t_setup` is the capture flop\'s setup requirement. **Slack** is the margin:\n\n```\nslack = required - arrival\n```\n\nPositive slack means the path meets timing with room to spare; negative slack means it fails — the data arrives too late to be reliably captured. With zero clock skew (both flops receiving the clock simultaneously), the skew terms cancel and the check reduces to the familiar form: `t_cq + t_comb_max + t_setup <= T`.\n\nWorked example, every number explicit. A 100 MHz system: `T = 10 ns`. Launch flop `t_cq = 0.8 ns`. Combinational logic along the path: `t_comb_max = 7.0 ns`. Capture flop `t_setup = 0.3 ns`. Zero skew. Arrival = 0.8 + 7.0 = **7.8 ns**. Required = 10.0 - 0.3 = **9.7 ns**. Slack = 9.7 - 7.8 = **+1.9 ns** — the path meets timing with 1.9 ns of margin. The same numbers give the path\'s speed limit: the smallest period that still works is `0.8 + 7.0 + 0.3 = 8.1 ns`, so the maximum frequency is `1 / 8.1 ns ≈ 123.5 MHz`. At 100 MHz you have margin; at 130 MHz this exact path fails.',
    deepDive:
      '### Why "static"\n\nThe analysis is called *static* because it never simulates vectors: it enumerates paths and checks each against the clock using worst-case delays from a library (for ASICs) or from fitted routing delays (for FPGAs). One run covers every input sequence, because the delays involved do not depend on the data values — this is also its blind spot: a path that is functionally impossible (never selected by the mux that feeds it) still shows up as a failing path until you constrain it away, which is exactly what timing exceptions (Module 02) are for.\n\n### The critical path is the most negative slack\n\nA design has thousands of paths; STA checks them all and sorts by slack. The **critical path** is the one with the smallest slack — it alone determines the maximum frequency. Speeding up any other path changes nothing, a fact that surprises every newcomer: optimizing a +0.2 ns path while a -0.4 ns path exists leaves the design exactly as slow as before.\n\n### Max delays for setup, always\n\nSetup uses the *slowest* version of every delay (slow silicon, low voltage, high temperature — the "slow corner" in Module 03). The intuition: setup fails when data arrives late, so you must prove it arrives on time even in the worst (slowest) case. Hold, the next lesson, uses the fastest delays for the mirror-image reason.',
    examples: [
      {
        title: 'A path, annotated for setup',
        language: 'text',
        code:
          'Clock: 100 MHz  ->  T = 10.00 ns   (both flops, zero skew)\n\n            t_cq=0.8        t_comb=7.0              t_setup=0.3\n   clk -->[ FF_A ]---[ logic cloud ]--->[ FF_B ]<-- clk\n             \\___________________________/\n                       one clock period later\n\n   Data arrival:    0.8 + 7.0                     =  7.80 ns\n   Data required:   10.0 - 0.3                    =  9.70 ns\n   Setup slack:     9.70 - 7.80                   = +1.90 ns   (MET)\n\n   Path speed limit: T_min = 0.8 + 7.0 + 0.3     =  8.10 ns\n   Fmax = 1 / 8.10 ns                             ~= 123.5 MHz',
        explanation: [
          'The arrival line is purely physical: how long the signal needs to physically travel from Q of FF_A to D of FF_B.',
          'The required line is the clock\'s demand: one period minus the setup window the capture flop needs at its D pin.',
          'Slack compares the two — the only number that matters for pass/fail, and the number every timing report prints.',
          'The Fmax derivation shows what the path could do if you raised the clock; at 123.5 MHz the slack would be exactly zero.',
        ],
      },
      {
        title: 'The same path at a faster clock',
        language: 'text',
        code:
          'Clock: 125 MHz -> T = 8.00 ns, same delays (0.8 / 7.0 / 0.3):\n\n   Data arrival:    7.80 ns\n   Data required:   8.00 - 0.3  = 7.70 ns\n   Setup slack:     7.70 - 7.80 = -0.10 ns   (VIOLATED)\n\n   Reading: the data misses the capture window by 0.10 ns.\n   FF_B samples old or metastable values intermittently —\n   a classic "works on the bench, fails at temperature" bug.',
        explanation: [
          'Nothing about the design changed — only the clock. Timing is always relative to a constraint, never absolute.',
          'A small negative slack is not a small failure: whether the flop captures correctly is a probability, not a guarantee, and it degrades with voltage and temperature.',
          'This is why overclocking "works" in the lab and fails in the field — the margin story is exactly this slack computation.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Setup check timing (educational waveform, illustrative)',
        content:
          'clk      ___     ___     ___     ___\n              \\___/     \\___/     \\___/\n              ^n                    ^n+1\n              |<-------- T -------->|\n\nFF_A.Q    ----+#####################------------\n              |<0.8>|<---- 7.0 ---->|^ 0.3 setup\n              |<------ arrival ---->|required\n\nMargin:  required(9.7) - arrival(7.8) = +1.9 ns slack',
        caption: 'Data launched at edge n must settle before edge n+1 minus the setup window. The gap between arrival and the setup window is the slack.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Adding t_setup instead of subtracting it from the period.',
        fix: 'The capture flop needs its D input stable for t_setup BEFORE the capture edge, so the required time is T - t_setup. Setup makes the deadline earlier, not later.',
      },
      {
        mistake: 'Reporting slack in "ns" without the corner it was computed at.',
        fix: 'A setup number is meaningless without its delay corner (slow/max). The same path can show +1.9 at the typical corner and -0.2 at the slow corner; sign the number with its corner in every sentence you write about it.',
      },
      {
        mistake: 'Treating the longest-delay path as automatically the critical path.',
        fix: 'The critical path is the most negative slack, which also depends on the clock each endpoint uses. A shorter path to a faster clock domain can be the critical one.',
      },
    ],
    guidedPractice: {
      title: 'Compute slack and Fmax for a second path',
      brief:
        'A 50 MHz system (T = 20 ns) has a path with t_cq = 0.9 ns, t_comb_max = 14.2 ns, t_setup = 0.4 ns, zero skew. Compute arrival, required, slack, and the path\'s Fmax. Then determine the fastest standard clock (from 50, 75, 100 MHz) at which it still meets timing.',
      starterCode:
        '// Fill in:\n// arrival  = 0.9 + 14.2            = ____ ns\n// required = 20.0 - 0.4             = ____ ns\n// slack    = ____ - ____            = ____ ns\n// T_min    = 0.9 + 14.2 + 0.4       = ____ ns\n// Fmax     = 1 / T_min              = ____ MHz',
      expectedBehavior:
        'Arrival 15.1 ns, required 19.6 ns, slack +4.5 ns (met). T_min = 15.5 ns → Fmax ≈ 64.5 MHz. Of the standard clocks, 50 MHz passes (slack +4.5) and 75 MHz (T = 13.33 ns) fails: required 12.93 < arrival 15.1, slack -2.17 ns.',
      hints: [
        'At 75 MHz, T = 13.33 ns — recompute required, then slack, and mind the sign.',
        'Fmax is the zero-slack point: exactly T_min, so anything faster gives negative slack.',
      ],
    },
    practiceExercises: [
      {
        title: 'Which of two paths is critical?',
        brief:
          'Path P1 (clock 100 MHz): t_cq 0.8, t_comb 8.4, t_setup 0.3. Path P2 (clock 75 MHz): t_cq 0.9, t_comb 11.8, t_setup 0.4. All zero skew. Compute both slacks and state which path is critical.',
        expectedBehavior:
          'P1: arrival 9.2, required 9.7, slack +0.5. P2: arrival 12.7, required 12.93 (13.33 - 0.4), slack +0.23. P2 is critical — smaller slack despite the slower clock and being "slower" in frequency terms.',
        hints: [
          'Compute each path against its OWN clock — never compare raw delays.',
          'Critical = minimum slack, and negative slack would make it critical and failing.',
        ],
      },
      {
        title: 'Budget a path backwards',
        brief:
          'You are architecting a 125 MHz (T = 8 ns) design. The flop library gives t_cq = 0.7 and t_setup = 0.25. How much combinational delay budget remains for the logic between the flops? Express it and explain what happens to the budget if you then add a second logic level costing 0.5 ns.',
        expectedBehavior:
          'Budget = T - t_cq - t_setup = 8 - 0.7 - 0.25 = 7.05 ns of combinational delay. Any change adds or subtracts from this budget — the architect\'s single most-used number.',
        hints: [
          'Rearrange the zero-slack equation: t_comb_max = T - t_cq - t_setup.',
          'This "delay budget" framing is how leads decide whether a feature fits the clock before any RTL exists.',
        ],
      },
    ],
    assessment: {
      title: 'Setup check checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'A path in a 100 MHz design has t_cq = 0.8 ns, t_comb_max = 9.2 ns, t_setup = 0.3 ns (zero skew). What is the setup slack?',
          options: ['+1.0 ns', '-0.3 ns', '+0.3 ns', '-1.0 ns'],
          answer: '-0.3 ns',
          explanation: 'Arrival = 0.8 + 9.2 = 10.0 ns; required = 10.0 - 0.3 = 9.7 ns; slack = 9.7 - 10.0 = -0.3 ns. The path fails by 0.3 ns.',
          hint: 'Arrival first, required second, subtract in that order.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which delay model does the setup check use?',
          options: [
            'Fastest (min) delays',
            'Slowest (max) delays',
            'Typical delays only',
            'Delays measured during simulation',
          ],
          answer: 'Slowest (max) delays',
          explanation:
            'Setup fails when data arrives late, so the check must prove arrival even under the slowest conditions — slow silicon, low voltage, high temperature. Hold uses fastest delays for the opposite reason.',
          hint: 'Worst case for "too late" is the slowest path.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'If a design\'s critical path has +0.2 ns of slack, speeding up the second-worst path (+0.4 ns slack) by 0.3 ns raises the design\'s maximum frequency.',
          answer: 'false',
          explanation:
            'Fmax is set by the minimum-slack path only. The critical path still has +0.2 ns; improving other paths changes their slack, not the design\'s speed limit.',
          hint: 'Which single path determines the fastest usable clock?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In the slack equation, what delay does "t_cq" name (two to four words)?',
          answer: 'clock-to-Q delay',
          explanation:
            'The time from the clock edge at a flip-flop\'s clock pin until valid data appears at its Q output — the launch flop\'s head start cost in every path.',
          hint: 'It starts at the clock pin and ends at the output pin.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Launch flop', definition: 'The flip-flop whose Q output starts the timing path on clock edge n.' },
      { term: 'Capture flop', definition: 'The flip-flop whose D input ends the path, sampled on the next clock edge.' },
      { term: 'Data arrival time', definition: 'Launch clock + clock-to-Q + maximum combinational delay: when data physically reaches the capture D pin.' },
      { term: 'Data required time', definition: 'Capture clock + period - setup: the latest arrival the capture flop tolerates.' },
      { term: 'Slack', definition: 'Required minus arrival; positive means met, negative means violated.' },
      { term: 'Critical path', definition: 'The path with the minimum slack; it alone bounds the design\'s maximum frequency.' },
    ],
    revisionSummary: [
      'A timing path runs launch flop Q through combinational logic into capture flop D.',
      'Setup: arrival = t_cq + t_comb_max; required = T - t_setup (zero skew); slack = required - arrival.',
      'Setup always uses slowest (max) delays; the corner must be stated with every slack number.',
      'Fmax comes from the zero-slack period: T_min = t_cq + t_comb_max + t_setup.',
      'Only the critical path (minimum slack) sets speed — optimizing other paths changes nothing.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Wikipedia — Flip-flop (electronics)', url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'sta-m01-l2',
    title: 'The Hold Check and Clock Skew',
    summary:
      'The check that breaks boards instead of benchmarks: data racing through a path too fast and corrupting the *same* capture edge, plus the skew arithmetic that trades setup margin for hold margin.',
    objectives: [
      'Explain what the hold check protects against and why it uses the same clock edge, not the next one.',
      'Compute hold slack from min delays, and recompute it under clock skew.',
      'Show quantitatively how positive skew helps setup and hurts hold.',
      'Recognize why hold violations cannot be fixed by slowing the clock.',
    ],
    whyItMatters:
      'Setup failures are convenient: slow the clock and the design works while you fix it. Hold failures are the nightmare class — they are insensitive to frequency, appear as intermittent corruption at full voltage/speed combinations, and often surface only on silicon or specific FPGA speed grades. Interviews ask about hold precisely because it separates engineers who memorized the setup equation from engineers who understand the capture window.',
    prerequisites: [
      'The setup check (previous lesson)',
    ],
    explanation:
      'The **hold check** protects the current capture edge. Data launched by edge *n* must not arrive at the capture flop so fast that it changes while edge *n* is still sampling — the previous data must remain stable for `t_hold` after the capture clock edge. Unlike setup, hold compares events at the *same* edge:\n\n```\nhold slack = (t_cq_min + t_comb_min) - (t_hold + t_skew)\n```\n\nwhere `t_cq_min` and `t_comb_min` are the *fastest* (min-corner) delays and `t_skew = t_capture_clock_arrival - t_launch_clock_arrival` is clock skew. Fastest delays because hold fails when data arrives *early* — you must check the quickest the data could possibly show up. Zero skew reduces the check to `t_cq_min + t_comb_min >= t_hold`, which most libraries satisfy trivially; skew is what makes hold dangerous.\n\nWorked example. Launch flop `t_cq_min = 0.5 ns`, a short path with `t_comb_min = 0.2 ns`, capture flop `t_hold = 0.25 ns`, zero skew. Fastest arrival = 0.5 + 0.2 = 0.7 ns. Hold requires data stable until 0.25 ns after the capture edge. Hold slack = 0.7 - 0.25 = **+0.45 ns** — safe.\n\nNow introduce skew: suppose the capture flop\'s clock arrives **0.6 ns later** than the launch flop\'s clock (`t_skew = +0.6 ns`). The capture edge is later, so the capture flop keeps sampling the *old* data 0.6 ns longer — but the new data arrives 0.7 ns after the launch edge, which is now only 0.7 - 0.6 = 0.1 ns before... careful, in the standard formula: hold slack = (0.5 + 0.2) - (0.25 + 0.6) = 0.7 - 0.85 = **-0.15 ns** — violated. The same skew that *helps* setup (capture later = more time) *hurts* hold by exactly the same amount. This symmetry is the deepest structural fact in STA:\n\n```\nsetup slack gains +t_skew\nhold   slack loses -t_skew\n```\n\nSkew is a transfer of margin from the hold account to the setup account (or vice versa for negative skew). Clock design (tree synthesis, Module 03 of the VLSI course) exists to keep skew small precisely because of this trade.',
    deepDive:
      '### Why hold ignores the clock period\n\nLook at the hold equation: the period T does not appear. Hold compares events at one edge, so slowing the clock from 100 MHz to 10 MHz changes nothing — the race is between two signals arriving after the *same* edge. This is why a hold violation on silicon cannot be worked around with a lower frequency, and why hold must be fixed structurally: add delay into the fast path (buffers), or reduce skew.\n\n### Hold fixes are the opposite of intuition\n\nEvery instinct from setup repair is wrong for hold. Setup: remove logic, pipeline, shorten the path. Hold: *insert* delay — a chain of buffers in the fast path so the quickest possible data still arrives after the hold window closes. On FPGAs the router usually fixes hold automatically by lengthening fast routes; on ASICs, hold buffers are inserted after place-and-route, which is why "hold fixing" appears as a distinct EDA step.\n\n### Where min-delay paths come from\n\nPaths with almost no logic between flops are the classic hold offenders: a register feeding its neighbor directly, a one-bit handshake, a fanout net that reaches a near flop quickly and a far flop slowly (the near one gets early data with late-or-equal clock). When you write RTL with two adjacent always blocks connected by a bare wire, you have authored a candidate hold path — the tools will handle it, but you should recognize it in reports.',
    examples: [
      {
        title: 'Hold arithmetic, three ways',
        language: 'text',
        code:
          'Library: t_cq_min = 0.5, t_hold = 0.25, path t_comb_min = 0.2\n\nCase A: zero skew\n  fastest arrival = 0.5 + 0.2        = 0.70 ns\n  hold requirement = 0.25             = 0.25 ns\n  hold slack = 0.70 - 0.25            = +0.45 ns   (safe)\n\nCase B: capture clock LATE by 0.6 ns (t_skew = +0.6)\n  hold slack = 0.70 - (0.25 + 0.60)   = -0.15 ns   (VIOLATED)\n  setup slack improves by the same +0.6 ns — margin moved\n\nCase C: capture clock EARLY by 0.6 ns (t_skew = -0.6)\n  hold slack = 0.70 - (0.25 - 0.60)   = +1.05 ns   (very safe)\n  setup slack loses 0.6 ns — margin moved back',
        explanation: [
          'Case A is the textbook baseline most libraries pass with room to spare.',
          'Case B is the trap: a placement where the capture flop sits farther from the clock source. Setup reports get *better* and hold silently degrades — always read both reports.',
          'Case C is the mirror: helpful for hold, expensive for setup. No free lunch — skew moves margin between the two checks, it never creates it.',
        ],
      },
      {
        title: 'Recognizing a hold-risky RTL shape',
        language: 'verilog',
        code:
          '// Adjacent registers, no logic between them:\n// a textbook min-delay (hold) path candidate.\nalways @(posedge clk or negedge rst_n) begin\n    if (!rst_n) begin\n        stage1 <= 1\'b0;\n        stage2 <= 1\'b0;\n    end else begin\n        stage1 <= in_bit;   // <-- stage1 -> stage2 has NO logic\n        stage2 <= stage1;\n    end\nend\n\n// The tools will meet hold here by construction, but note:\n//  - the stage1->stage2 path is pure routing (comb delay ~0)\n//  - any clock skew between the two flops eats hold margin\n//  - this shape is also exactly the 2-FF synchronizer of Module 04,\n//    which is why synchronizer flops are kept physically close.',
        explanation: [
          'The stage1-to-stage2 path has essentially zero combinational delay — the minimum possible arrival.',
          'Hold margin is therefore almost entirely `t_cq_min - t_hold - t_skew`: tiny library numbers against whatever skew exists.',
          'Seeing this shape in RTL should trigger a hold-report check, not a panic — placement tools handle ordinary cases.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Hold race with late capture clock (educational waveform, illustrative)',
        content:
          'launch clk   ___     ___\n                 \\___/   \\___/\n                 ^n\nlaunch FF.Q   ---+####-------------------   new data at n+0.7\n\n                       <-- +0.6 skew -->\ncapture clk  ___     ___\n                \\___/   \\___/\n                ^n (late by 0.6)\nhold window   ^^^^\n                |0.25|\nnew data arrives 0.7 after LAUNCH edge = 0.1 after CAPTURE edge\n-> data changes INSIDE the hold window: sampled value corrupts\n   hold slack = 0.7 - (0.25 + 0.6) = -0.15 ns',
        caption: 'Late capture clock delays the sampling edge into the region where the fast new data has already arrived — the race that hold analysis exists to prevent.',
      },
    ],
    tables: [
      {
        caption: 'Setup vs hold — the complete contrast',
        headers: ['Property', 'Setup check', 'Hold check'],
        rows: [
          ['Compares edges', 'launch n to capture n+1', 'launch n to capture n (same edge)'],
          ['Delay model', 'slowest (max) corner', 'fastest (min) corner'],
          ['Clock period matters', 'yes — more period helps', 'no — frequency-blind'],
          ['Effect of +skew', 'slack improves', 'slack degrades'],
          ['Typical fix', 'pipeline, less logic, slower clock', 'insert delay, reduce skew'],
          ['Failure symptom', 'fails at high frequency', 'intermittent corruption at any frequency'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Trying to fix a hold violation by lowering the clock frequency.',
        fix: 'T does not appear in the hold equation. Hold is fixed structurally: add delay to the fast path (buffers on ASIC; the router does it on FPGAs) or reduce the skew. Lowering frequency fixes nothing and wastes time.',
      },
      {
        mistake: 'Reading only the setup (max) report because it lists the critical path.',
        fix: 'Hold reports are separate and equally mandatory. A design that meets setup everywhere and holds nowhere is a brick; run and read both, every build.',
      },
      {
        mistake: 'Assuming t_comb_min is a fixed fraction of t_comb_max on the same path.',
        fix: 'Min and max delays come from different corners (fast/fast vs slow/slow) and different derating; a path can be long at max yet startlingly short at min. Always take both numbers from the library, never by scaling.',
      },
    ],
    guidedPractice: {
      title: 'Find the maximum tolerable skew',
      brief:
        'Using the library numbers from this lesson (t_cq_min = 0.5 ns, t_comb_min = 0.2 ns, t_hold = 0.25 ns), compute the largest capture-late skew that still meets hold with zero margin. Then repeat for a strengthened path with t_comb_min = 0.8 ns and state the new limit.',
      starterCode:
        '// hold slack = (t_cq_min + t_comb_min) - (t_hold + t_skew) >= 0\n// -> t_skew_max = t_cq_min + t_comb_min - t_hold\n//\n// Path A: t_skew_max = 0.5 + 0.2 - 0.25 = ____ ns\n// Path B: t_skew_max = 0.5 + 0.8 - 0.25 = ____ ns',
      expectedBehavior:
        'Path A tolerates at most +0.45 ns of capture-late skew. Path B tolerates +1.05 ns — the extra minimum-path logic buys 0.6 ns of hold robustness, which is exactly why hold-fixing inserts delay.',
      hints: [
        'Set slack to zero and solve for t_skew — the boundary case is where the answer lives.',
        'Note the direction: capture-LATE skew is the harmful kind for hold; capture-early would need the sign flipped.',
      ],
    },
    practiceExercises: [
      {
        title: 'Diagnose a board that corrupts data at low frequency',
        brief:
          'A prototype intermittently corrupts a status byte, at 10 MHz and at 100 MHz alike, always on the same register. Setup slack is +3.1 ns. Write the two most likely causes and the report you would open first.',
        expectedBehavior:
          'A hold violation (frequency-blind corruption is its signature) or an unconstrained clock (both checks missing). Open the hold (min) report for that path first, and verify the clock is actually constrained — a missing constraint makes both checks silently absent.',
        hints: [
          'Which check does not care about frequency at all?',
          'Corruption that follows placement/temperature rather than frequency points at min-delay or skew.',
        ],
      },
      {
        title: 'Skew as a budget transfer',
        brief:
          'A path has setup slack +0.4 ns and hold slack +0.9 ns, both zero-skew. An engineer proposes deliberately delaying the capture clock by 0.8 ns to rescue setup. Recompute both slacks and rule on the proposal.',
        expectedBehavior:
          'Setup becomes +1.2 ns, hold becomes +0.1 ns — both still met, but hold margin is nearly gone and any min-delay drift violates it. The proposal buys setup by spending hold; it is legal only if the hold number stays comfortably positive at the fast corner.',
        hints: [
          'Apply +0.8 to setup and -0.8 to hold; the sum of the two slacks is invariant.',
          'Ask what corner each number was computed at before approving any skew-based fix.',
        ],
      },
    ],
    assessment: {
      title: 'Hold check checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'A design fails hold on one path. Which action can NEVER help?',
          options: [
            'Inserting buffers into the fast path',
            'Reducing clock skew between the two flops',
            'Lowering the clock frequency from 100 MHz to 20 MHz',
            'Moving the two flops closer together on the die',
          ],
          answer: 'Lowering the clock frequency from 100 MHz to 20 MHz',
          explanation:
            'The hold equation contains no clock period — the race is between two arrivals after the same edge. The other three all add minimum-path delay or reduce skew, which are the actual hold fixes.',
          hint: 'Does T appear anywhere in the hold slack formula?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'Compute the hold slack: t_cq_min = 0.6 ns, t_comb_min = 0.15 ns, t_hold = 0.3 ns, capture clock late by 0.5 ns.',
          code: 'hold slack = (t_cq_min + t_comb_min) - (t_hold + t_skew)\n       = (0.6 + 0.15)    - (0.3 + 0.5)',
          options: ['+0.55 ns', '-0.05 ns', '+0.05 ns', '-0.55 ns'],
          answer: '-0.05 ns',
          explanation: '0.75 - 0.80 = -0.05 ns: violated by 50 ps. Small negative hold numbers are the classic intermittent-corruption generator.',
          hint: 'Sum the left side, sum the right side, subtract left minus right.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Positive capture-late clock skew helps setup and hurts hold by the same amount.',
          answer: 'true',
          explanation:
            'Skew moves margin between the two checks without creating any: setup gains exactly what hold loses. This conservation is why clock-tree synthesis aims for low skew rather than exploiting skew.',
          hint: 'Think of skew as a transfer between two accounts.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Hold analysis uses fastest-path delays from which named corner model (one word)?',
          answer: 'min',
          explanation:
            'The min (fast) corner: fast silicon, high voltage, low temperature. Hold fails when data arrives too early, so the earliest possible arrival is what must be checked.',
          hint: 'The opposite of the setup corner, also three letters.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Hold check', definition: 'Proves new data does not disturb the sampling of the previous data at the same clock edge.' },
      { term: 'Clock skew', definition: 'Difference in clock arrival times between capture and launch flops; transfers margin between setup and hold.' },
      { term: 'Min corner', definition: 'The fast delay model (fast silicon, high voltage, low temperature) used for hold analysis.' },
      { term: 'Hold fixing', definition: 'Post-route insertion of delay into fast paths (or skew reduction) to satisfy hold.' },
      { term: 'Min-delay path', definition: 'A path with little or no combinational logic — the classic hold-risk shape.' },
    ],
    revisionSummary: [
      'Hold compares the same edge: slack = (t_cq_min + t_comb_min) - (t_hold + t_skew).',
      'Hold uses fastest (min) delays; it is completely insensitive to clock period.',
      'Capture-late skew helps setup and hurts hold by the same amount — margin transfer, not creation.',
      'Hold fixes are structural: insert delay or reduce skew; never lower the frequency.',
      'Zero-logic register-to-register connections are the classic hold-risk shapes; always read the hold report too.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Wikipedia — Clock skew', url: 'https://en.wikipedia.org/wiki/Clock_skew', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'sta-m01-l3',
    title: 'Uncertainty, Corners and Reset Timing',
    summary:
      'The real-world corrections to the two basic checks: clock uncertainty and jitter, multi-corner analysis (why "slow" and "fast" are each the worst case for a different check), and the recovery/removal checks that govern asynchronous reset release.',
    objectives: [
      'Apply clock uncertainty as a margin that reduces both setup and hold slack.',
      'Explain multi-corner analysis: which corner is worst for setup, which for hold, and why both are always run.',
      'Describe the recovery and removal checks on asynchronous reset pins.',
      'Distinguish jitter (clock-source property) from skew (network property).',
    ],
    whyItMatters:
      'Textbook slack numbers assume a perfect clock network and one delay model — silicon has neither. Uncertainty, jitter and corners are why a path with "+0.1 ns slack" at one corner is a field failure at another, and reset-timing checks (recovery/removal) are why boards that reset cleanly in simulation latch garbage on the bench. These corrections are small numbers with outsized consequences, and every professional report is written with them already applied.',
    prerequisites: [
      'Setup check (lesson 1)',
      'Hold check (lesson 2)',
      'Asynchronous reset patterns (RTL course, Module 7)',
    ],
    explanation:
      '**Clock uncertainty** is a budget line for everything you cannot (yet) model exactly: jitter from the clock source, PLL spread, insertion-delay variation, and estimate error before routing is final. You declare it (or the tool derives part of it) and it is subtracted from the available period — both checks get the haircut:\n\n```\nsetup slack = (T - t_setup - t_uncertainty) - arrival_max\nhold  slack = arrival_min - (t_hold + t_uncertainty)\n```\n\nWorked continuation of lesson 1\'s numbers (T = 10 ns, arrival 7.8 ns, t_setup 0.3 ns, hold arrival 0.7 ns, t_hold 0.25 ns, zero skew): with `t_uncertainty = 0.2 ns`, setup slack drops from +1.9 to **+1.7 ns** and hold slack from +0.45 to **+0.25 ns**. Uncertainty never helps anyone; it exists so that the margin you report is margin you can keep when reality lands. **Jitter** specifically is the clock edge arriving at slightly different times cycle to cycle — a property of the oscillator/PLL, distinct from **skew**, which is a fixed spatial difference between two points in the clock network. Both are usually lumped into the uncertainty number at constraint time.\n\n**Multi-corner analysis** exists because there is no single "worst case". The slow corner (slow silicon, low voltage, high temperature) maximizes delays — worst for *setup*. The fast corner (fast silicon, high voltage, low temperature) minimizes delays — worst for *hold*. A complete analysis runs setup at the slow corner and hold at the fast corner (and on real projects, several combinations of process/voltage/temperature, plus cross-corner paths where launch and capture see different conditions). This is why reports always name their corner: "+1.9 ns at slow corner" and "-0.05 ns at fast corner" are both true statements about the same path — for different checks.\n\n**Recovery and removal** are the setup and hold of asynchronous reset. When reset (say, active-low `rst_n`) is released, the release edge must obey timing at the flop\'s reset pin: **recovery** is the minimum time reset release must precede the clock edge (setup-like); **removal** is the minimum time it must remain asserted after the clock edge (hold-like). A reset that violates recovery/removal can release different flops on different cycles — the design leaves reset in an inconsistent state. This is precisely why the RTL course teaches the reset-synchronizer pattern: async assert, synchronized release guarantees recovery/removal timing by construction, and STA checks the synchronized path instead of a raw asynchronous one.',
    deepDive:
      '### Where the uncertainty number comes from\n\nEarly in a project, before place-and-route, uncertainty covers clock-tree estimation error (a placeholder that shrinks as the tree is built). After routing, on-die variation remains: identical transistors at different positions switch at slightly different speeds, so two flops nominally equidistant from the clock root still see small edge differences. Advanced nodes model this with separate launch/capture derating (OCV — on-chip variation — and its statistical successors); at your level, treat uncertainty as one honest number that stands for all of it, and never set it to zero to make a failing path pass — that is moving the failure into the field.\n\n### Reading a corner name like a sentence\n\n"ss_0.90v_125C" decodes as: slow-slow process, 0.90 V, 125 °C. "ff_1.10v_m40C" is fast-fast, 1.10 V, -40 °C. The first is a setup corner; the second is a hold corner (cold fast silicon is the min-delay nightmare). When a vendor publishes Fmax for an FPGA speed grade, it is the worst setup corner; when a hold fix is validated, it is at the fast corner. If you can decode the corner names, reports stop being intimidating tables and become sentences.\n\n### Why recovery/removal is usually invisible in FPGA flows\n\nFPGA vendor flows insert reset synchronization on global reset networks automatically, and the tools check the synchronized path with ordinary setup/hold. On ASICs, you own the pattern yourself: every asynchronously-reset flop whose reset comes from a synchronizer has its recovery/removal checked on the synchronizer\'s output — which meets timing by construction, closing the loop between the RTL pattern and the timing discipline.',
    examples: [
      {
        title: 'Uncertainty applied to both checks',
        language: 'text',
        code:
          'Path from lesson 1 (T = 10 ns), now with t_uncertainty = 0.2 ns:\n\nSETUP (slow corner):\n  required = 10.0 - 0.3 - 0.2      = 9.50 ns\n  arrival  = 0.8 + 7.0             = 7.80 ns\n  slack    = 9.50 - 7.80           = +1.70 ns   (was +1.90)\n\nHOLD (fast corner, zero skew):\n  arrival_min = 0.5 + 0.2          = 0.70 ns\n  requirement = 0.25 + 0.2         = 0.45 ns\n  slack       = 0.70 - 0.45       = +0.25 ns   (was +0.45)\n\nSame design, same path — 0.2 ns of reality removed from BOTH margins.',
        explanation: [
          'Uncertainty enters setup by shrinking the required time and hold by growing the requirement — a double haircut from one number.',
          'Note the corner labels: each check is quoted at its own worst case; both statements describe the same physical path.',
          'If the hold margin had been +0.15 ns before uncertainty, this design would now fail hold — budgets get consumed silently, which is why they are tracked, not assumed.',
        ],
      },
      {
        title: 'Reset synchronizer: the RTL pattern that recovery/removal exists for',
        language: 'verilog',
        code:
          '// Async assert, sync release: the standard reset conditioner.\n// recovery/removal is then checked on rst_sync, an ordinary\n// synchronous signal that meets setup/hold by construction.\nmodule reset_sync (\n    input  wire clk,\n    input  wire rst_n_async,   // raw reset from pin/PLL\n    output wire rst_n          // use this everywhere downstream\n);\n    reg [1:0] sync_ff;\n    always @(posedge clk or negedge rst_n_async) begin\n        if (!rst_n_async)\n            sync_ff <= 2\'b00;          // async assert: immediate\n        else\n            sync_ff <= {sync_ff[0], 1\'b1}; // sync release: 2 cycles\n    end\n    assign rst_n = sync_ff[1];\nendmodule',
        explanation: [
          'Assertion is asynchronous — both flops clear immediately regardless of the clock, so reset always takes effect.',
          'Release is synchronous — the 1 must shift through two flops, so rst_n rises exactly on a clock edge with ordinary setup/hold, never violating recovery/removal downstream.',
          'The two-flop structure also protects against a metastable release edge, previewing the CDC synchronizer of Module 04.',
          'STA now checks the sync_ff[1] -> downstream-flops paths as normal setup/hold paths; the raw async release is confined to this one small, analyzable structure.',
        ],
      },
    ],
    tables: [
      {
        caption: 'Worst-case corner per check',
        headers: ['Check', 'Worst-case corner', 'Why', 'Typical corner name'],
        rows: [
          ['Setup', 'Slow: slow silicon, low V, high T', 'delays maximal -> latest arrival', 'ss_0.90v_125C'],
          ['Hold', 'Fast: fast silicon, high V, low T', 'delays minimal -> earliest arrival', 'ff_1.10v_m40C'],
          ['Recovery', 'Slow (setup-like)', 'release must not be late vs clk edge', 'slow corner'],
          ['Removal', 'Fast (hold-like)', 'release must not be early vs clk edge', 'fast corner'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Comparing setup slack from one tool run against hold slack from a different corner.',
        fix: 'Slack numbers are corner-qualified facts. Read the corner from the report header before comparing anything; mixing corners produces confident nonsense.',
      },
      {
        mistake: 'Setting clock uncertainty to zero late in the project to make a failing path pass.',
        fix: 'Uncertainty stands for jitter and on-die variation that physics will collect in the field. The honest fixes are the same as any setup failure: restructure, pipeline, or change the constraint only if it was genuinely wrong.',
      },
      {
        mistake: 'Releasing an asynchronous reset straight from a pin into a large flop population.',
        fix: 'That makes recovery/removal a coin flip on every release. Use the async-assert/sync-release conditioner; then STA has an ordinary synchronous path to check and reset releases coherently.',
      },
    ],
    guidedPractice: {
      title: 'Re-slack a path with uncertainty and both corners',
      brief:
        'For the lesson-1 guided path (50 MHz, t_cq = 0.9, t_comb_max = 14.2, t_setup = 0.4; min side: t_cq_min = 0.55, t_comb_min = 0.3, t_hold = 0.28, zero skew), recompute setup and hold slack with t_uncertainty = 0.25 ns, and state which check now has the smaller margin.',
      starterCode:
        '// SETUP (slow): required = 20.0 - 0.4 - 0.25 = ____ ns\n//                arrival  = 0.9 + 14.2        = ____ ns\n//                slack    = ____ ns\n// HOLD  (fast): arrival_min  = 0.55 + 0.3     = ____ ns\n//                requirement = 0.28 + 0.25    = ____ ns\n//                slack      = ____ ns',
      expectedBehavior:
        'Setup: required 19.35, arrival 15.1, slack +4.25 ns. Hold: arrival 0.85, requirement 0.53, slack +0.32 ns. Hold now has the smaller margin — typical for a long setup path with a short min-delay shadow, and the reason hold reports are read even on comfortably-meeting designs.',
      hints: [
        'Uncertainty subtracts from setup\'s required time and adds to hold\'s requirement — opposite directions on the page, same direction in effect.',
        'Compare the two slacks at the end: margin is a pair of numbers, not one.',
      ],
    },
    practiceExercises: [
      {
        title: 'Decode the corner',
        brief:
          'Write one sentence for each corner name explaining which check it threatens and why: (a) ss_0.95v_125C, (b) ff_1.26v_m40C, (c) tt_1.10v_25C.',
        expectedBehavior:
          '(a) Slow-slow, 0.95 V, 125 °C — worst-case slow, threatens setup. (b) Fast-fast, 1.26 V, -40 °C — worst-case fast, threatens hold. (c) Typical at nominal conditions — a sanity/estimation corner, never a sign-off corner for either check.',
        hints: [
          'ss/ff/tt = slow-slow / fast-fast / typical-typical (speed of PMOS and NMOS).',
          'Voltage and temperature push speed in the directions from the table.',
        ],
      },
      {
        title: 'Audit a reset scheme',
        brief:
          'A design routes an active-low reset pin directly to the reset inputs of 4,000 flops. Describe two distinct timing hazards and prescribe the fix with the pattern name.',
        expectedBehavior:
          'Hazards: (1) release violating recovery/removal on some flops — incoherent reset exit; (2) release arriving as a quasi-asynchronous edge that can metastabilize the first-stage flops. Fix: async-assert/sync-release reset synchronizer (two-flop conditioner) so release is an ordinary synchronous edge that STA can check.',
        hints: [
          'Which event, assert or release, has a timing requirement at the flop?',
          'Where have you seen a two-flop conditioner before in this module?',
        ],
      },
    ],
    assessment: {
      title: 'Uncertainty and corners checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Adding 0.3 ns of clock uncertainty to an existing analysis changes setup and hold slack how?',
          options: [
            'Setup improves 0.3, hold worsens 0.3',
            'Both worsen by 0.3 ns',
            'Both improve by 0.3 ns',
            'Only setup worsens, by 0.3 ns',
          ],
          answer: 'Both worsen by 0.3 ns',
          explanation:
            'Uncertainty models edge-position error that can hurt either check in either direction, so it is subtracted from both margins — a symmetric haircut, unlike skew which transfers margin.',
          hint: 'Uncertainty is not skew: no directionality, no transfer.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which corner is the worst case for the HOLD check?',
          options: [
            'Slow silicon, low voltage, high temperature',
            'Fast silicon, high voltage, low temperature',
            'Typical silicon at nominal conditions',
            'Hold is corner-independent',
          ],
          answer: 'Fast silicon, high voltage, low temperature',
          explanation:
            'Hold fails when data arrives too early, and the fast corner minimizes every delay — the earliest possible arrival. The slow corner is setup\'s worst case.',
          hint: 'Min delays come from the max-speed conditions.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'Recovery and removal are the setup-like and hold-like timing requirements on the release of an asynchronous reset.',
          answer: 'true',
          explanation:
            'Recovery: release must precede the clock edge by a minimum time (setup-like). Removal: release must follow the clock edge by a minimum time (hold-like). Violations exit reset incoherently.',
          hint: 'Reset release is itself an edge that needs timing.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Name the RTL pattern that asserts reset asynchronously but releases it synchronously (three words, hyphenated style acceptable).',
          answer: 'reset synchronizer',
          explanation:
            'The reset synchronizer (async-assert/sync-release, two-flop conditioner) converts the problematic release edge into an ordinary clocked edge with normal setup/hold, confining recovery/removal concerns to one small structure.',
          hint: 'Two flops, one clock, releases after two cycles.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Clock uncertainty', definition: 'A margin covering jitter and unmodeled edge-position error; subtracted from both setup and hold slack.' },
      { term: 'Jitter', definition: 'Cycle-to-cycle variation of the clock edge at its source; a time-domain property, distinct from skew.' },
      { term: 'Corner', definition: 'A process/voltage/temperature point at which delays are evaluated; slow corners threaten setup, fast corners threaten hold.' },
      { term: 'Recovery', definition: 'The setup-like requirement on asynchronous reset release versus the clock edge.' },
      { term: 'Removal', definition: 'The hold-like requirement that reset release not occur too soon after the clock edge.' },
    ],
    revisionSummary: [
      'Uncertainty reduces BOTH slacks symmetrically; skew transfers margin between them — different physics, different arithmetic.',
      'Jitter is temporal (source), skew is spatial (network); both usually enter constraints as uncertainty.',
      'Run setup at the slow corner and hold at the fast corner; every slack number is corner-qualified.',
      'Corner names decode: ss/ff/tt + voltage + temperature, and tell you which check they threaten.',
      'Recovery/removal govern async reset release; the reset-synchronizer pattern makes release synchronous and checkable.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Wikipedia — Jitter', url: 'https://en.wikipedia.org/wiki/Jitter', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
