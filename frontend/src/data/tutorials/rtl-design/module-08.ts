import type { TutorialLesson } from '../types';

/**
 * Module 08 — Timing-Aware RTL.
 * Setup/hold/tcq in RTL terms, slack arithmetic, reading a (synthetic) timing
 * report, and the RTL-level fixes: pipelining, restructuring, operator
 * balancing, registered outputs, high-fanout awareness.
 */

export const module08Lessons: TutorialLesson[] = [
  {
    id: 'rtl-m08-l1',
    title: 'Timing Fundamentals: Slack and the Critical Path',
    summary:
      'Every register-to-register path must fit in the clock period. This lesson makes the arithmetic precise — arrival, required, slack — with worked numbers, and connects hold checks, logic depth and constraint files to the RTL you write.',
    objectives: [
      'Compute arrival time, required time and slack for a register-to-register path from component delays.',
      'Interpret positive and negative slack and state the two ways each is produced.',
      'Explain the hold check and why hold fixes differ fundamentally from setup fixes.',
      'Read a create_clock constraint and connect the clock period to every path budget.',
    ],
    whyItMatters:
      'Timing closure is where RTL meets physics, and the vocabulary — slack, critical path, levels of logic — is the language of every timing review meeting. A designer who can compute "this path is 12 ns against a 10 ns clock, so I need to remove 2 ns, and the multiply is 5 of those ns" can negotiate architecture changes with evidence; a designer who just knows "it failed timing" cannot. This lesson is the arithmetic; lesson 2 reads real reports; lesson 3 spends the slack.',
    prerequisites: ['rtl-m06-l1', 'rtl-m04-l1'],
    explanation: [
      '**Setup check arithmetic.** For a path from launch register to capture register: `arrival = tcq + logic delay + net delay`; `required = clock period - tsu`; `slack = required - arrival`. Worked example with a 10 ns clock: tcq 0.9 ns, combinational logic 9.4 ns, net (wire) delay 1.2 ns, tsu 0.5 ns. Arrival = 0.9 + 9.4 + 1.2 = 11.5 ns. Required = 10.0 - 0.5 = 9.5 ns. Slack = 9.5 - 11.5 = **-2.0 ns** — the path is 2 ns too slow, and the design\'s fastest safe clock from this path alone is 1/(11.5 + 0.5) = 83 MHz. Positive slack (say +1.5 ns) means the path has 1.5 ns of margin — slack you may spend (sharing an adder, adding a mux) or bank.',
      'The **critical path** is the path with the most negative (or least positive) slack, and it alone sets fmax: fixing a 12 ns path when the next-worst is 9.5 ns moves fmax only to 1/10.0... precisely, the design runs at the worst path\'s period, so improvement comes from the top of the slack-sorted list, one path at a time. Timing reports sort by slack for exactly this reason, and the RTL response is prioritized the same way: the most negative path gets the first restructuring effort.',
      'The **hold check** is the mirror image and has a different physics: data launched by edge N must not arrive at the capture register so fast that it overwrites the value being captured at that same edge N. Hold slack = arrival(minimum) - hold time; if it goes negative, the capture register grabs next-cycle data in the same edge. The critical asymmetry: **setup violations are fixed by slowing data down (pipelining, restructuring); hold violations are fixed by slowing data down in TIME, not in logic** — buffers and routing delay, a backend fix. RTL engineers essentially never fix hold; but they must recognize the report entry so a hold violation is not misdiagnosed as a logic problem (and so nobody "fixes" it by pipelining, which does nothing for hold).',
      '**Constraints connect the spec to the checks.** A constraint like `create_clock -period 10.0 [get_ports clk]` declares the clock and its 10 ns period; every register-to-register path is then budgeted against it automatically by static timing analysis (STA) — no simulation, pure graph arithmetic over the netlist with library delays. STA is exhaustive in a way simulation cannot be: it checks every path through every input combination, including the ones your testbench never generated. This is why timing violations on paths that "work in simulation" are real: simulation sampled a few combinations; STA proves all of them.',
      '**Logic depth** is the designer\'s forward-looking proxy for arrival time: the number of serial gate/levels in a path. Without library data you cannot compute nanoseconds, but you can count serial operators — the chain `a+b+c+d` has depth 3 (three serial adders), the tree `(a+b)+(c+d)` has depth 2. Delay tracks depth roughly linearly within a logic family, so "this path has 14 levels of logic" in a report points back to roughly 14 serial operator stages in the RTL cloud — and lesson 3\'s restructuring techniques are all depth-reduction moves. The habit: for paths you suspect are critical, count depth at architecture time; the report will confirm.',
    ].join('\n\n'),
    deepDive: [
      'Net delay deserves its place in the arithmetic because it is the RTL-invisible term: at 10 ns periods and older process nodes, logic dominates; at 1 ns periods on modern nodes, **wire delay can exceed logic delay** on long nets — meaning two functionally identical RTL structures can time differently based on placement. This is the honest limit of RTL-time estimation (module 10 returns to it): depth counting predicts logic delay well and wire delay not at all. The professional consequence: treat first-pass timing reports as the ground truth for placement-sensitive paths, and treat RTL-time estimates as relative guidance only.',
      'Clock skew modifies both checks and is worth one precise sentence: skew is the arrival-time difference of the same clock edge at launch and capture registers. Positive skew (capture clock arrives late) *helps* setup (the capture register waits longer) and *hurts* hold (data can outrun the delayed edge); negative skew does the reverse. The backend spends clock-tree effort balancing skew to near zero so the designer\'s arithmetic above stays valid; when a report shows "clock uncertainty" or "skew" lines, they are adjusting arrival/required by exactly these nanoseconds.',
      'Multi-cycle paths are the legitimate exception to the one-period budget: a path whose result is only consumed every K cycles can be declared multicycle in constraints, and STA budgets it K periods. This is the constraint-level version of the clock-enable (module 07 lesson 2) — a slow enable means the path genuinely has K cycles. The discipline: the constraint must match the RTL\'s actual enable structure (the enable really does gate capture for K cycles), or the waiver hides a real violation. Constraints are spec statements about time; like all spec statements, they are checked against the design, not assumed.',
    ].join('\n\n'),
    examples: [
      {
        title: 'Full slack arithmetic on three paths',
        language: 'text',
        code: [
          'SLACK WORKSHEET   clock: create_clock -period 10.0 [get_ports clk]',
          '',
          '  Component delays (illustrative):',
          '    tcq = 0.9 ns    tsu = 0.5 ns',
          '',
          '  PATH 1: reg -> [8x8 multiply 5.0] -> [16-bit add 3.0] -> [mux 0.6] -> reg',
          '    logic = 5.0 + 3.0 + 0.6 = 8.6    net = 1.0',
          '    arrival = 0.9 + 8.6 + 1.0 = 10.5 ns',
          '    required = 10.0 - 0.5 = 9.5 ns',
          '    slack = 9.5 - 10.5 = -1.0 ns   VIOLATION',
          '',
          '  PATH 2: reg -> [8-bit add 1.2] -> [2-bit compare 0.8] -> reg',
          '    logic = 2.0    net = 0.4',
          '    arrival = 0.9 + 2.0 + 0.4 = 3.3 ns',
          '    slack = 9.5 - 3.3 = +6.2 ns   healthy margin',
          '',
          '  PATH 3: reg -> [barrel shift 3.5] -> [mux 0.6] -> reg',
          '    arrival = 0.9 + 4.1 + 0.6 = 5.6 ns',
          '    slack = 9.5 - 5.6 = +3.9 ns   margin',
          '',
          '  READING: fmax is set by PATH 1 (period 10.5+0.5 = 11 ns ->',
          '  ~91 MHz). The fix budget is 1.0 ns of logic or net delay, or',
          '  a pipeline cut (lesson 3). PATHS 2 and 3 have slack to spend.',
        ].join('\n'),
        explanation: [
          'Path 1 shows the full pipeline of the arithmetic: component delays sum to arrival; the constraint period minus tsu is required; slack is their difference. Negative by 1.0 ns.',
          'Path 2 and 3 quantify margin: +6.2 ns means this path could absorb five more serial adders before becoming critical — the freedom that resource sharing (module 04 lesson 3) spends.',
          'The fmax derivation: the worst path\'s arrival + tsu is the minimum period (11.0 ns), so ~91 MHz until path 1 is fixed.',
          'The worksheet is exactly how to prepare for a timing review: know the worst path, its slack, and where its nanoseconds live (5.0 of the 8.6 are the multiply) before the report arrives.',
          'All figures are illustrative teaching numbers; real ones come from the target library and place-and-route.',
        ],
      },
      {
        title: 'Setup vs hold: the two checks in one timeline',
        language: 'text',
        code: [
          'SETUP CHECK (edge N+1 must capture THIS edge N\'s data):',
          '',
          '  clk      __|‾|____|‾|____|‾|__',
          '              N      N+1',
          '  data at',
          '  capture:  ---[launched at N: tcq+logic+net]------[must settle',
          '                                                   tsu BEFORE N+1]',
          '  FAIL if:  arrival > period - tsu   ->  slack < 0',
          '  FIX:      shorten the path (pipeline, restructure) or lengthen',
          '            the period (lower the spec frequency)',
          '',
          'HOLD CHECK (edge N must NOT capture edge N+1\'s data):',
          '',
          '  FAIL if:  data changes too FAST after N: arrival(min) < hold',
          '            time of the capture register',
          '  FIX:      add delay IN TIME (buffers/routing - backend job).',
          '            Pipelining does NOT help hold; lowering frequency',
          '            does NOT help hold.',
        ].join('\n'),
        explanation: [
          'Setup is about being slow enough to be stable but fast enough to arrive: one period budget, exactly the arithmetic of the worksheet.',
          'Hold is about being not-too-fast: the concern is data racing through a short path in the SAME edge. Note the fix asymmetry: setup fixes are RTL restructuring; hold fixes are backend delay insertion.',
          'A designer\'s practical hold knowledge: hold violations reported by STA are backend-fixable and usually automatically fixed; your job is to not misread them as logic bugs.',
          'Both checks run for every register pair on every path — exhaustively — which is why STA, not simulation, is the timing authority.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Setup check on a 10 ns clock (the -2.0 ns example)',
        content: [
          '             10 ns period',
          '  |<-------------------------->|',
          '  clk    __|‾‾|________|‾‾|________|‾‾|__',
          '        launch N              capture N+1',
          '',
          '  data                    arrival = tcq + logic + net',
          '  at       ------[0.9][ 9.4 logic ][1.2 net]------',
          '  cap reg                                ^ 11.5 ns after launch',
          '  needed:  stable 0.5 ns (tsu) BEFORE N+1 -> required 9.5 ns',
          '',
          '             arrival 11.5  >  required 9.5',
          '             slack = 9.5 - 11.5 = -2.0 ns  VIOLATION',
          '',
          '  The data lands 2.0 ns too late: the capture register samples',
          '  the OLD value. Classic symptoms: off-by-one-cycle data,',
          '  intermittent failures at temperature/voltage corners.',
        ].join('\n'),
        caption:
          'educational waveform (illustrative): the arrival point lands 2 ns past the required point; the capture register misses the new data and keeps the old.',
      },
    ],
    tables: [
      {
        caption: 'Timing vocabulary for the RTL designer',
        headers: ['Term', 'Definition', 'Who controls it'],
        rows: [
          ['tcq (clock-to-Q)', 'Launch register output settling delay', 'Library'],
          ['tsu / thold', 'Setup / hold requirement at capture register', 'Library'],
          ['Logic delay', 'Combinational cloud delay (depth-driven)', 'RTL designer'],
          ['Net delay', 'Wire delay between cells', 'Placement (backend)'],
          ['Arrival / required', 'When data lands / when it must land', 'Sum of the above'],
          ['Slack', 'required - arrival; negative = violation', 'Everyone, jointly'],
          ['Critical path', 'Worst-slack path; sets fmax', 'RTL restructuring'],
          ['Logic depth', 'Serial gate levels in a path', 'RTL designer'],
        ],
      },
      {
        caption: 'Setup vs hold at a glance',
        headers: ['Property', 'Setup check', 'Hold check'],
        rows: [
          ['Concern', 'Data too SLOW for next edge', 'Data too FAST for same edge'],
          ['Budget', 'One clock period', 'Hold time (~100 ps scale)'],
          ['RTL fix', 'Pipeline / restructure / balance', 'None (backend delay insertion)'],
          ['Frequency fix', 'Lower the period requirement helps', 'Independent of frequency'],
          ['Typical owner', 'RTL + synthesis iteration', 'Backend, usually automated'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Treating "it passed in simulation" as evidence against a timing violation.',
        fix:
          'Simulation evaluates the paths your stimulus exercised, with ideal timing; STA evaluates every path with real delays. A setup violation produces wrong data only when the path is exercised near the timing corner — rare in a testbench, guaranteed eventually in the field. STA is the authority; simulation is functional evidence only.',
      },
      {
        mistake: 'Fixing a hold violation by pipelining or restructuring logic.',
        fix:
          'Hold is about same-edge data racing, not about period budgets: adding a pipeline stage does nothing (the fast path is still fast). Hold fixes add routing/buffer delay — backend work. Recognize the report entry (slack near zero, "hold" in the check type) and route it to the right owner.',
      },
      {
        mistake: 'Estimating path delay without the register overheads (tcq + tsu ≈ 1.4 ns in the worksheet).',
        fix:
          'The cloud\'s delay is not the path\'s delay: tcq and tsu ride on every register-to-register hop, and net delay adds more. A 9.0 ns cloud against a 10 ns clock is already failing. Budget with the overheads from the start; they are why "just fits" designs do not.',
      },
    ],
    guidedPractice: {
      title: 'Slack worksheet from components',
      brief:
        'Clock = 8.0 ns (create_clock -period 8.0). tcq = 0.8, tsu = 0.4. Path: reg -> [12-bit add 2.5] -> [12-bit add 2.5] -> [12-bit compare 2.2] -> reg, net delay 0.9 total. Compute arrival, required, slack, fmax, and the logic-depth count. Then state how much logic delay the design must remove to reach +0.5 ns of margin.',
      starterCode: [
        '// period 8.0, tcq 0.8, tsu 0.4',
        '// logic: add 2.5 + add 2.5 + cmp 2.2, net 0.9',
        '// arrival = ?   required = ?   slack = ?',
        '// fmax = ?      logic depth = ?',
        '// delay to remove for +0.5 margin = ?',
      ].join('\n'),
      expectedBehavior:
        'Logic = 7.2; arrival = 0.8 + 7.2 + 0.9 = 8.9 ns. Required = 8.0 - 0.4 = 7.6 ns. Slack = 7.6 - 8.9 = -1.3 ns. fmax = 1/(8.9 + 0.4) = 107.5 MHz. Logic depth = 3 serial operators. To reach +0.5: required slack +0.5 means arrival <= 7.1 ns, so remove 8.9 - 7.1 = 1.8 ns of logic/net delay — e.g. a pipeline cut after the second add (splits 7.2 into ~5.0/2.2 + overheads) or restructuring (lesson 3).',
      hints: [
        'Sum logic, add tcq and net for arrival; period minus tsu for required.',
        'fmax uses arrival + tsu as the minimum period.',
        'The margin question: set slack = +0.5 and solve for the arrival budget.',
      ],
    },
    practiceExercises: [
      {
        title: 'Slack-sorted priorities',
        brief:
          'A design has five failing paths: -1.8, -1.2, -0.9, -0.4 and +0.1 ns slack. The target clock is fixed. In what order do you attack them, and when do you stop? What does the +0.1 ns path tell you?',
        expectedBehavior:
          'Attack in slack order: -1.8 first (it sets fmax), then re-run timing — fixing it may change the critical path entirely (the -1.2 becomes the new worst, or restructuring upstream changed everything). Iterate until the worst slack is >= 0 (or the target is met). Stop when the worst path meets the target; the -0.4 need not be touched if fixing the top two shifted the graph. The +0.1 ns path is the new critical path in waiting: it is passing, but any perturbation (a fix upstream, a placement change) can make it the next violation — worth a note, not necessarily work.',
        hints: [
          'Fixes change the path graph — re-sort after each fix.',
          'The target is worst-slack >= 0, not all paths equal.',
          '+0.1 ns is a warning label, not a task.',
        ],
      },
      {
        title: 'Multicycle legitimacy check',
        brief:
          'A colleague declares a path multicycle-by-2 because "the consumer reads the register every other cycle via an enable". What must be true in the RTL for this constraint to be sound, and how do you verify it?',
        expectedBehavior:
          'The capture register must genuinely not sample on the intermediate cycle: the enable gating that register\'s D-path must be high exactly every 2nd cycle, for every input scenario — not just typically. Verify: (1) read the enable generation (a modulo-2 counter or FSM state with an exact period), (2) confirm the enable gates the CAPTURE register (not just the source of the data), (3) check no other consumer samples the register on the off cycle. If the enable has any exception path (e.g. a clear that samples early), the constraint hides a real violation.',
        hints: [
          'Multicycle means the hardware genuinely has 2 periods — not that it usually does.',
          'Which register\'s enable must be checked: source or destination?',
          'Exception paths (clears, bypass muxes) are where multicycle waivers hide violations.',
        ],
      },
    ],
    assessment: {
      title: 'Timing fundamentals checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'Clock period 10 ns; tcq 0.9; logic 9.4; net 1.2; tsu 0.5. What is the slack?',
          options: ['+1.0 ns', '-2.0 ns', '-1.2 ns', '+2.0 ns'],
          answer: '-2.0 ns',
          explanation:
            'Arrival = 0.9 + 9.4 + 1.2 = 11.5; required = 10.0 - 0.5 = 9.5; slack = 9.5 - 11.5 = -2.0 ns. The path needs 2 ns removed (or the period lengthened).',
          hint: 'Arrival sums three terms; required is period minus tsu.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'Which single number determines a design\'s fmax?',
          options: [
            'The average path delay',
            'The worst (most negative slack) register-to-register path',
            'The clock tree depth',
            'The total gate count',
          ],
          answer: 'The worst (most negative slack) register-to-register path',
          explanation:
            'Every path must fit the period, so the slowest one sets it. This is why timing reports sort by slack and why fixes target the top of the list.',
          hint: 'All paths must pass; which one binds?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'A hold violation can be fixed by adding a pipeline stage to the offending path.',
          answer: 'false',
          explanation:
            'Hold is a same-edge data-racing check, independent of the clock period and of logic depth changes. It is fixed by adding delay in time (buffers/routing — backend work). Pipelining addresses setup only.',
          hint: 'Does the hold check even involve the clock period?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'What does create_clock -period 8.0 [get_ports clk] declare, and what does STA then do with it?',
          answer:
            'It declares a clock of 8 ns period on port clk; STA budgets every register-to-register path against that period (arrival vs required, setup and hold), exhaustively over the netlist',
          explanation:
            'Constraints turn the spec\'s frequency into per-path budgets. STA is static: no simulation, graph arithmetic over all paths with library and net delays.',
          hint: 'One statement, then every path inherits a budget.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'output-prediction',
          prompt:
            'A path has arrival 6.5 ns, required 7.6 ns. It is restructured and the new logic is 1.4 ns shallower (net unchanged). What is the new slack?',
          code: '// before: arrival 6.5, required 7.6\n// after:  logic reduced by 1.4 ns, net and registers unchanged',
          options: ['+1.1 ns', '+2.5 ns', '-1.1 ns', '+1.4 ns'],
          answer: '+2.5 ns',
          explanation:
            'Old slack = 7.6 - 6.5 = +1.1. Removing 1.4 ns of logic lowers arrival to 5.1: new slack = 7.6 - 5.1 = +2.5 ns.',
          hint: 'Slack improves by exactly the removed delay.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Slack', definition: 'required time minus arrival time; negative means a setup violation.' },
      { term: 'Arrival time', definition: 'tcq + logic delay + net delay — when data actually lands at the capture register.' },
      { term: 'Required time', definition: 'Clock period minus tsu — when data must be stable by.' },
      { term: 'Critical path', definition: 'The worst-slack path; it alone sets fmax.' },
      { term: 'Logic depth', definition: 'Serial gate/operator levels in a path; the RTL-time proxy for logic delay.' },
      { term: 'Hold check', definition: 'Same-edge data-racing check; fixed by backend delay, not by RTL restructuring.' },
      { term: 'create_clock', definition: 'The SDC constraint declaring a clock and period; every path is budgeted against it.' },
      { term: 'Multicycle path', definition: 'A constraint granting K periods to paths genuinely captured every K cycles via enables.' },
    ],
    revisionSummary: [
      'Arithmetic: arrival = tcq + logic + net; required = period - tsu; slack = required - arrival.',
      'fmax = 1/(worst arrival + tsu); the critical path alone binds — fix in slack order, re-run, repeat.',
      'Register overheads (~1.4 ns here) ride on every hop; budget them before declaring a cloud "fits".',
      'Setup fixes: pipeline, restructure, balance (RTL). Hold fixes: backend delay insertion. Never confuse them.',
      'STA is exhaustive (all paths, real delays) and authoritative over simulation.',
      'Logic depth is the RTL-time proxy: count serial operators to predict which paths will be critical.',
      'Multicycle constraints must match real enable structure — a waiver hiding a violation is a bug.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Static timing analysis',
        url: 'https://en.wikipedia.org/wiki/Static_timing_analysis',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Flip-flop (electronics): setup/hold',
        url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)',
        kind: 'article',
      },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'rtl-m08-l2',
    title: 'Reading a Timing Report',
    summary:
      'The timing report is the ground truth of where your design stands: clock definitions, path-by-path arrival/required/slack, levels of logic and fanout. This lesson annotates a synthetic report line by line and turns it into an ordered action list.',
    objectives: [
      'Identify every field of a standard path timing report and what each contributes to slack.',
      'Trace a reported path back to its RTL source using start/end points and levels of logic.',
      'Extract an ordered action list from a report (which path, which fix, expected gain).',
      'Distinguish setup sections from hold sections and route each to the right owner.',
    ],
    whyItMatters:
      'Timing reports arrive as hundreds of pages; the skill is extracting the twenty lines that matter and converting them into RTL actions. Engineers who cannot read reports treat timing closure as trial and error — pipeline something, hope, re-run. Engineers who can read them turn each report into a precise diagnosis: this path, this much over, dominated by this operator, fixed by this restructuring, expected gain this much. That is the difference between closing timing in two iterations and in twenty.',
    prerequisites: ['rtl-m08-l1', 'rtl-m06-l1'],
    explanation: [
      'A report has a standard anatomy. The **header** declares the clock (create_clock -period 10.0), the corner (process/voltage/temperature — the delay numbers are corner-specific), and the summary table: worst slack, number of violating paths, total negative slack (TNS). The **path sections** follow, sorted worst-first, each tracing one register-to-register path: Startpoint (the launch register), Endpoint (the capture register), then the delay accounting — data arrival time (the sum of cell and net delays along the path, one line per element), data required time (period minus tsu, adjusted for uncertainty), and slack. The numbers reproduce the lesson-1 arithmetic exactly — the report is the worksheet, computed by the tool with real delays.',
      '**From path to RTL** is the detective step. The Startpoint/Endpoint names give you the registers — in synthesis-friendly flows these are your named signals (count_q_reg[7], state_reg[1]). The **levels of logic** count tells you how deep the cloud is (14 levels: expect a long operator chain in your source). The path\'s element list names the cells — multipliers, carry chains, muxes — which map back to your operators. With the endpoint register known, ask: what combinational function produces this register\'s D input? That cone is the failing cloud; the element delays tell you which operator inside it eats the time.',
      '**Fanout** appears in the report as a property of high-load nets: a signal driving 200 cells has its driver\'s delay and the net\'s delay inflated, and the report may flag it explicitly (high fanout net). RTL\'s contribution to fanout: a control signal computed late and fanning wide (an enable decoded from a comparison feeding 200 registers) is both deep and wide — the worst shape. The fixes are structural: register the control signal early (making it a shallow, wide-driving register output, which the backend can replicate), or split the decode. RTL cannot fix fanout directly (that is buffer trees, a backend job), but it can stop creating pathological shapes.',
      '**The action list** is the report\'s product. For each of the top paths: the slack (how much to recover), the endpoint (which register to attack), the dominant element (which operator to cut or restructure), and levels of logic (whether depth or placement is the suspect). Lesson 3 supplies the fix catalogue — pipeline cut, tree restructuring, operator balancing, registered output — and each fix\'s expected gain is estimated from the arithmetic: removing a 3.0 ns adder from a serial chain recovers ~3.0 ns; a pipeline cut recovers the whole cloud minus the new register overhead. The report turns trial-and-error into budgeted engineering.',
      'Honesty note for this course: the report in the example is **synthetic** — constructed for teaching with plausible numbers — and the figures vary enormously between tools, libraries and corners. What transfers between every tool is the structure: header, worst-slack summary, path detail with arrival/required/slack, and the start/end/levels/fanout fields. Learn the structure once and every vendor\'s report reads the same.',
    ].join('\n\n'),
    deepDive: [
      'Total negative slack (TNS) and worst negative slack (WNS) are the summary metrics that project managers quote, and each tells a different story: WNS says how far the single worst path is over (your restructuring target), TNS sums all violating paths (the volume of work). A design with WNS -0.1 and TNS -0.1 is one small fix from closure; WNS -2.0 with TNS -40 means many paths share the problem — usually one systemic cause (a global signal computed late and fanning everywhere, or a target frequency set too high for the architecture\'s natural depth). Read TNS before choosing between a spot fix and an architectural one.',
      'The corner question — which corner is this report from? — matters because paths can pass at the fast corner (best-case silicon, tight for hold) and fail at the slow corner (worst-case silicon, tight for setup). Setup is analyzed at slow corners, hold at fast ones; a complete report set covers both. When someone quotes "timing is clean", the follow-up is always: at which corner, setup and hold both? A designer reading a single-corner report is reading half the story.',
      'Report-driven RTL archaeology has one more trick worth knowing: the path\'s *endpoint register* is usually more informative than its startpoint, because the endpoint\'s D-input cone is the failing cloud, while there may be many startpoints feeding it. When several worst paths share an endpoint, that register\'s inputs are the redesign target — one restructuring fixes all of them. Conversely, worst paths sharing a startpoint often mean one overloaded register\'s output fans into too much logic — a fanout/registering problem. Group the top paths by shared endpoints and startpoints before writing any code; the grouping usually reveals that five "different" problems are one.',
    ].join('\n\n'),
    examples: [
      {
        title: 'Annotated synthetic timing report (worst path)',
        language: 'text',
        code: [
          '==================================================================',
          '  SYNTHETIC EXAMPLE REPORT FOR TEACHING - figures are illustrative',
          '==================================================================',
          '  Report   : setup timing, worst 3 paths',
          '  Corner   : slow (1.0V, 125C)         <- setup runs at slow corner',
          '  Clock    : clk, period 10.000 (create_clock)',
          '  Summary  : WNS = -2.03   TNS = -4.71   violating paths: 3',
          '',
          '------------------------------------------------------------------',
          '  PATH 1   slack = -2.03',
          '------------------------------------------------------------------',
          '  Startpoint : sum_q_reg[15]           (rising edge, clk)',
          '  Endpoint   : max_hold_q_reg[7]       (rising edge, clk)',
          '',
          '  Delay element                     delay    arrival',
          '  ------------------------------------------------------',
          '  sum_q_reg[15]/CK -> Q             0.90     0.90     <- tcq',
          '  net (fanout 42)                   0.75     1.65',
          '  U234 adder_carry[14]              0.85     2.50',
          '  U241 adder_carry[13]              0.80     3.30',
          '  ... (12 more adder cells)                  7.90',
          '  U310 cmp_gt cell                  1.10     9.00     <- compare',
          '  U318 mux2 (max select)            0.55     9.55     <- mux',
          '  net (fanout 8)                    0.40     9.95',
          '  ------------------------------------------------------',
          '  data arrival time                          9.95',
          '  data required time                         7.92   (10.0 -',
          '                                              uncertainty 0.5',
          '                                              - tsu 0.5 -',
          '                                              library adj.)',
          '  ------------------------------------------------------',
          '  SLACK                               9.95 - 7.92 = -2.03',
          '',
          '  levels of logic : 16      <- deep chain suspect',
          '  high fanout     : net from sum_q (42 loads)',
          '',
          '  READING: adder chain (12 serial cells) + compare + mux, one',
          '  cloud, 16 levels. Endpoint = max_hold_q: the max-hold update',
          '  path. Fix budget: 2.03 ns. Candidates: cut after the adder',
          '  (pipeline, lesson 3) or restructure the compare.',
        ].join('\n'),
        explanation: [
          'The header sets the ground truth: slow corner (setup), 10 ns clock, WNS -2.03 (how far the worst path is over), TNS -4.71 (three paths share ~4.7 ns of total violation — a small, focused problem, not a systemic one).',
          'Startpoint sum_q_reg[15] / Endpoint max_hold_q_reg[7]: the path runs from the sum accumulator into the max-hold register — i.e. the cloud computing the max-hold update reads the 16-bit sum. In RTL terms: (sum > max_hold) ? sample : max_hold, where sum is 16 bits.',
          'The delay column is the lesson-1 arithmetic made physical: 0.90 tcq, then net, then a chain of adder cells (the 16-bit compare against a 16-bit value costs a carry chain — 12 cells), then the compare cell, then the select mux, then net. The dominant cost: the adder/compare chain (~7.5 of the 9.95 ns).',
          'levels of logic 16 confirms a deep serial cloud; high fanout 42 on the sum net adds 0.75 ns of routing — notable, not dominant here.',
          'The action list writes itself: (1) the max-hold compare reads a 16-bit adder output — precompute the comparison against the REGISTERED sum (one cycle earlier) or pipeline-cut after the adder; (2) expected recovery: cutting the adder from the path recovers ~7 ns, far more than the needed 2.03 — a single register restores comfortable margin.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Report anatomy: from summary to action',
        content: [
          '  +--------------------------------------------------+',
          '  | HEADER: corner, clock/period, WNS, TNS, #viol    |',
          '  |   WNS small, TNS small  -> focused spot fixes    |',
          '  |   WNS big, TNS huge     -> systemic (arch/depth) |',
          '  +--------------------------------------------------+',
          '                        | sorted worst-first',
          '                        v',
          '  +--------------------------------------------------+',
          '  | PATH: Startpoint -> Endpoint                     |',
          '  |   element-by-element arrival (tcq, nets, cells)  |',
          '  |   arrival vs required -> slack                   |',
          '  |   levels of logic, fanout notes                  |',
          '  +--------------------------------------------------+',
          '                        | for each top path',
          '                        v',
          '  +--------------------------------------------------+',
          '  | ACTION: endpoint register -> failing D-cone      |',
          '  |   dominant element -> which operator to cut      |',
          '  |   slack -> fix budget    levels -> depth/placement|',
          '  +--------------------------------------------------+',
        ].join('\n'),
        caption:
          'The report is read top-down as a funnel: summary tells you the scale, each path names its registers and costs, the action list converts them to RTL changes.',
      },
    ],
    tables: [
      {
        caption: 'Report fields and their use',
        headers: ['Field', 'Meaning', 'RTL action it drives'],
        rows: [
          ['WNS', 'Worst negative slack', 'The fix budget for the top path'],
          ['TNS', 'Sum of all violating slacks', 'Spot fix vs systemic redesign decision'],
          ['Startpoint / Endpoint', 'Launch / capture registers', 'Names the failing D-cone (endpoint first)'],
          ['Element delays', 'Per-cell and net delays on the path', 'Identifies the dominant operator'],
          ['levels of logic', 'Serial depth of the cloud', 'Deep = restructure; shallow = placement/fanout'],
          ['fanout', 'Loads on a net', 'Wide + deep = register the signal early'],
          ['Corner', 'PVT conditions of the delays', 'Setup: slow corner; hold: fast corner'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Fixing paths in report order without regrouping by endpoint.',
        fix:
          'Five worst paths sharing an endpoint are one problem; fixing the shared D-cone resolves all five at once. Group top paths by endpoint (and secondarily startpoint) before writing any code — otherwise you do five restructurings for one defect.',
      },
      {
        mistake: 'Ignoring the corner line and comparing numbers across reports from different corners.',
        fix:
          'Setup numbers come from the slow corner, hold from the fast; delays differ by 2x or more between corners. Compare only same-corner, same-check reports, or your "improvement" is a corner change, not a fix.',
      },
      {
        mistake: 'Attacking the fanout number because it is printed prominently.',
        fix:
          'Fanout contributes what its net line says — often a fraction of a nanosecond — while the logic cells contribute most of the arrival. Fix logic depth first (restructuring), and let the backend\'s buffer trees handle pure fanout. Register early if the signal is both deep and wide; do not chase the net delay with RTL tricks.',
      },
    ],
    guidedPractice: {
      title: 'Write the action list from a report excerpt',
      brief:
        'From this excerpt, write the ordered action list: report shows PATH 1 slack -1.4 (endpoint filter_acc_q_reg, elements: 0.9 tcq, net 0.5, 10 adder cells 6.8, mux 0.5, net 0.3, levels 14, fanout 90 on the enable net), PATH 2 slack -0.6 (same endpoint, 8 adder cells), PATH 3 slack -0.5 (endpoint ctrl_state_reg, mux chain 4.2). Clock 10 ns, required 9.0.',
      starterCode: [
        '// For each path: which register cone, dominant operator,',
        '// fix candidate (pipeline cut / restructure / register early),',
        '// expected recovery vs the needed amount.',
      ].join('\n'),
      expectedBehavior:
        'Paths 1 and 2 share the endpoint filter_acc_q: one cone (a 16-bit accumulator fed by an adder chain) — fix once, both improve. Action 1: pipeline-cut the adder chain before the accumulator (recovery ~6 ns vs needed 1.4 — generous). Action 2 (after re-run): the fanout-90 enable net on the same cone: register the enable decode early (shallow wide register) — modest recovery, mostly robustness. Path 3 is a different cone (control state next-value mux chain, 4.2 ns over by 0.5): flatten the priority chain or one-hot the mux — small restructuring. Stop condition: re-run timing after action 1; paths 2 and 3 may already pass (TNS was only -2.5 total).',
      hints: [
        'Shared endpoints first: one fix, multiple paths.',
        'Compare expected recovery against the needed amount — big cuts overshoot, which is fine.',
        'Re-run timing between actions; the graph shifts.',
      ],
    },
    practiceExercises: [
      {
        title: 'Diagnose from shapes',
        brief:
          'Three report profiles: (a) WNS -0.2, TNS -0.2, one path, levels 6; (b) WNS -1.9, TNS -38, 22 paths, all levels 12-18; (c) WNS -0.3, TNS -0.4, paths all ending at one endpoint, fanout 150+. For each: spot fix or systemic, and the likely RTL cause.',
        expectedBehavior:
          '(a) One shallow path barely over: spot fix — probably a placement/net issue or one operator swap; check the endpoint cone for a cheap restructure. (b) Systemic: deep paths everywhere — the architecture\'s natural depth exceeds the period; the fix is architectural (pipelining strategy, target renegotiation), not path-by-path. (c) One overloaded endpoint with high fanout: register the shared control signal feeding it early, or restructure that cone; also a backend replication candidate. The WNS/TNS ratio is the diagnosis key.',
        hints: [
          'WNS vs TNS: one path vs many.',
          'Levels of logic separate depth problems from placement problems.',
          'Shared endpoints + high fanout = a wide control signal computed too late.',
        ],
      },
      {
        title: 'Report to RTL cross-reference',
        brief:
          'A path runs state_reg[1] -> ctrl_req_o_reg through: tcq 0.9, net 0.6, mux2 0.5, mux2 0.5, mux2 0.5, mux2 0.5, net 0.4; slack -0.9, levels 5. The RTL next-state cloud is an if/else-if chain of four conditions. Name the structural cause and two fixes, with expected recoveries.',
        expectedBehavior:
          'Cause: the if/else-if chain synthesized as a serial 4-deep priority mux (4 x 0.5 = 2.0 ns of muxes) — a priority chain where the conditions may not need priority. Fix 1: restructure to parallel one-hot detection (compute each condition independently, select with a wide mux or AND-OR) — recovers most of the chain depth (~1.5 ns). Fix 2: precompute the conditions one cycle earlier (register the decodes) if the FSM\'s inputs are stable — recovers the whole mux chain (~2.0 ns) at the cost of one cycle latency on those inputs. Also note levels=5 with 4 muxes: nearly all depth is the chain.',
        hints: [
          'Serial same-size elements in the report = an if/else chain in the RTL.',
          'Priority is often accidental — check whether the conditions are mutually exclusive.',
          'Precomputing moves the delay one cycle back: only valid if inputs allow.',
        ],
      },
    ],
    assessment: {
      title: 'Timing report checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'A report shows WNS -2.0 and TNS -4.8 with 3 violating paths. What does this tell you?',
          options: [
            'A systemic redesign is needed',
            'A small, focused problem: ~3 paths share about 4.8 ns of violation — regroup by endpoint and fix the cones',
            'The clock constraint is wrong',
            'The design cannot meet any frequency',
          ],
          answer:
            'A small, focused problem: ~3 paths share about 4.8 ns of violation — regroup by endpoint and fix the cones',
          explanation:
            'WNS is the depth of the worst problem; TNS is the volume. Small WNS/TNS with few paths = spot fixes; huge TNS across many deep paths = systemic. Here: focused.',
          hint: 'One path or many? That decides spot vs systemic.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'In a path report, which field most directly tells you WHICH combinational cloud to attack?',
          options: [
            'The slack value',
            'The Endpoint register (its D-input cone is the failing cloud)',
            'The clock period',
            'The report date',
          ],
          answer: 'The Endpoint register (its D-input cone is the failing cloud)',
          explanation:
            'The failing logic is whatever computes the endpoint\'s D input. Startpoints matter less (many signals may feed one cone); grouping by endpoint usually reveals that several paths are one problem.',
          hint: 'Where does the too-slow data need to arrive?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'Levels of logic = 4 with four 0.5 ns mux elements suggests an if/else-if priority chain in the RTL that may be restructurable.',
          answer: 'true',
          explanation:
            'Serial same-size elements are the synthesis shape of a priority chain. If the conditions are mutually exclusive, a parallel one-hot structure or precomputed decodes removes the chain depth — a classic lesson-3 fix.',
          hint: 'What RTL construct becomes a serial mux chain?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Which corner is a setup report analyzed at, and which check runs at the opposite corner?',
          answer:
            'Setup at the slow corner (worst-case silicon, slowest delays); hold at the fast corner',
          explanation:
            'Slow silicon makes paths slowest (setup risk); fast silicon makes data fastest (hold risk). A complete closure covers both corners.',
          hint: 'Which corner makes data late, which makes it early?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt:
            'An engineer sees "fanout 90" flagged on the enable net of a failing path and spends a day restructuring the enable decoder. The path is still failing. What did they likely miss?',
          options: [
            'Nothing; fanout is always the dominant cost',
            'The element delay table shows the net contributing little (e.g. 0.5 ns) while the logic cells carry most of the arrival — the depth (levels of logic, adder chain) was the real problem',
            'The report was from the wrong corner',
            'Fanout cannot be reported',
          ],
          answer:
            'The element delay table shows the net contributing little (e.g. 0.5 ns) while the logic cells carry most of the arrival — the depth (levels of logic, adder chain) was the real problem',
          explanation:
            'The per-element delays are the evidence: sum them and see where the nanoseconds live. Fanout flags are prominent but often minor contributors; pure fanout is a backend buffer-tree job anyway.',
          hint: 'Read the delay column, not the flags.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'WNS', definition: 'Worst negative slack — how far the single worst path is over budget.' },
      { term: 'TNS', definition: 'Total negative slack — the summed violation volume; small = spot fixes, huge = systemic.' },
      { term: 'Startpoint / Endpoint', definition: 'Launch and capture registers of a reported path; the endpoint names the failing cone.' },
      { term: 'Element delay table', definition: 'Per-cell and per-net delays summing to arrival; the evidence for the dominant operator.' },
      { term: 'Levels of logic', definition: 'Serial depth of the path\'s cloud; distinguishes depth problems from placement ones.' },
      { term: 'Corner', definition: 'Process/voltage/temperature condition of the delays; setup: slow corner, hold: fast corner.' },
    ],
    revisionSummary: [
      'Report anatomy: header (corner, clock, WNS/TNS) -> worst-first paths -> per-element delays -> slack.',
      'Group top paths by endpoint before fixing: shared endpoints are one cone, one fix.',
      'The element delay table, not the flags, says where the nanoseconds live.',
      'Serial same-size muxes = if/else chains = restructurable; deep adder chains = pipeline candidates.',
      'Fanout is usually a minor term and a backend job; RTL\'s job is not to create deep+wide shapes.',
      'Setup: slow corner; hold: fast corner. Compare same-corner reports only.',
      'The synthetic report here teaches structure; vendor formats differ, the fields do not.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Static timing analysis',
        url: 'https://en.wikipedia.org/wiki/Static_timing_analysis',
        kind: 'article',
      },
      {
        label: 'Yosys open synthesis suite documentation',
        url: 'https://yosyshq.readthedocs.io/',
        kind: 'tool',
      },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'rtl-m08-l3',
    title: 'Fixing Violations in RTL',
    summary:
      'The fix catalogue, in priority order: pipeline cuts, tree restructuring of chains, operator balancing, precomputed decodes, registered outputs. Each fix is a depth-reduction move with a predictable gain and a stated cost.',
    objectives: [
      'Apply the chain-to-tree transformation to reductions and comparisons, with depth arithmetic.',
      'Choose between pipelining and restructuring using the slack budget and latency constraints.',
      'Use precomputed (registered) decodes and one-hot selection to flatten priority chains.',
      'Estimate each fix\'s gain before spending an iteration on it.',
    ],
    whyItMatters:
      'Timing closure iterations are expensive — each synthesis-and-report cycle is hours — and unprincipled fixing burns them fast. The fix catalogue turns closure into arithmetic: the report says the path is 2 ns over and dominated by a serial adder chain; the tree transformation turns depth 3 into depth 2, recovering one adder delay (~2 ns) in one move. Designers with the catalogue close timing in a handful of iterations; designers without it, in dozens.',
    prerequisites: ['rtl-m08-l2', 'rtl-m06-l1', 'rtl-m04-l1'],
    explanation: [
      '**Chain to tree** is the first move for reductions. A serial sum `((a+b)+c)+d` has depth 3 (each adder waits for the previous); the balanced tree `(a+b)+(c+d)` has depth 2 — one adder delay recovered, plus better placement freedom. The same applies to max/min chains (comparators), AND/OR reductions, and any associative operator. The gain arithmetic: recover (old depth - new depth) x operator delay; in the lesson-1 worksheet terms, a 2 ns adder in a depth-3-to-2 conversion recovers ~2 ns. The cost: none functionally (associativity is exact for unsigned; for signed/overflow-sensitive sums the tree changes intermediate rounding — check), just different parentheses in the source.',
      '**Pipeline cuts** are the heavy tool when restructuring cannot recover enough: a register at the cut point splits the cloud, recovering (removed segment delay - ~1.4 ns register overhead) per the lesson-1 arithmetic. Cuts cost latency and valid-line plumbing (module 06), so the decision rule: restructure first (free), cut when the budget exceeds what depth reduction can give, and never cut without the latency budget check from the spec. When both are possible, prefer the tree: no latency cost, no verification cost.',
      '**Precomputed decodes** flatten priority chains: an if/else-if mux chain is depth-N in muxes; computing each condition in parallel (one-hot style) and selecting with one wide mux (or an AND-OR sum) is depth-2. Even better when inputs are stable early: register the decode one cycle earlier, removing the whole chain from the path. Both moves require checking the semantics — is the priority real (overlapping conditions where order matters) or accidental (mutually exclusive conditions where the chain is just an artifact of coding style)? Module 05\'s FSM template with defaulted outputs often makes the priority accidental, and one-hot rewrites are safe.',
      '**Registered outputs and early registering** serve two paths at once: registering a module\'s outputs removes the output cloud from the consumer\'s budget (module 05\'s boundary rule), and registering wide fanout control signals early gives the backend a clean, replicable register to buffer from. The rule of thumb for what to register early: signals that are (a) computed from deep logic and (b) fan out widely — the deep+wide combination is the pathological shape. The cost is a cycle of latency on that signal, which for enables and decodes is almost always acceptable.',
      '**Operator-level replacements** complete the catalogue: replace a variable shift with a constant shift when the amount is fixed (barrel shifter to wiring); replace a divide-by-constant with a shift/multiply-by-reciprocal sequence; replace a wide comparator against a constant with a reduced compare on the relevant bits (comparing against 2^k needs only the upper bits); balance mixed operators so the big one (multiply) is not serial with another big one. Each is a one-line RTL change with a depth or operator-class win — the "operator balancing" of the title. The discipline is estimating first: write the expected gain next to each candidate fix, spend the iteration on the biggest expected-gain-per-risk, and verify with the next report.',
    ].join('\n\n'),
    deepDive: [
      'Why does the tree version of an unsigned sum stay exact while a signed/overflow-truncating sum needs care? Because addition is associative over infinite-precision integers, and unsigned wrapping is compatible with any grouping (mod 2^N arithmetic is associative). Signed overflow with saturation, or sums with intermediate rounding, are NOT associative: the tree changes which intermediates saturate/round, changing results. The rule: associativity holds exactly for wrapping unsigned arithmetic; every other narrowing policy makes the grouping a spec item. This is a module-04 lesson-2 concept returning as a timing-fix constraint.',
      'The gain-vs-risk table is how professionals sequence fixes. Restructuring (tree, one-hot): low risk (semantics preserved after the associativity check), moderate gain (one operator per depth level removed). Precomputed decodes: low risk if inputs are stable, high gain (whole chains removed), small latency cost. Pipeline cuts: highest gain (any budget reachable with enough cuts), highest cost (latency, valid plumbing, verification rows). Operator replacements: case-by-case, often large (barrel-to-constant is infinite gain — wiring). The sequencing: replacements and trees first (cheap), precomputes next, cuts last. An iteration spent on a low-gain fix first is an iteration wasted.',
      'One caution completes the lesson: restructuring for timing can defeat lint and review if done aggressively — a fully one-hot, pre-decoded cloud is harder to read than the if/else chain it replaced. The mitigation is the module-03 discipline: name the intermediates (cond_a, cond_b, sel_one_hot), comment the timing intent ("tree form: depth 2 vs 3; semantics unchanged — unsigned wrap"), and keep the original expression in a comment so the reviewer can diff the semantics. Timing-motivated code needs its rationale in the source even more than ordinary code, because its shape looks gratuitous to everyone who was not in the timing review.',
    ].join('\n\n'),
    examples: [
      {
        title: 'Chain to tree: a four-input adder and a max-of-four',
        language: 'verilog',
        code: [
          '// BEFORE: serial chains (depth 3 each).',
          '//   wire [17:0] sum_chain = ((a + b) + c) + d;      // 3 adders',
          '//   wire [7:0]  max_chain = (a>b) ? ((c>d) ? ((m01>m23)...) : ...);',
          '//   Verilog\'s left-to-right default builds the chain unless you',
          '//   parenthesize. Timing report: levels 3+ per operator group.',
          '',
          '// AFTER: balanced trees (depth 2). Semantics: exact for unsigned',
          '// wrap; grouping is a spec item for saturating/rounded sums.',
          'module tree_forms (',
          '    input  wire [15:0] a, b, c, d,',
          '    output wire [17:0] sum_o,      // max sum 4*65535 = 262140 < 2^18',
          '    input  wire [7:0]  p, q, r, s,',
          '    output wire [7:0]  max_o',
          ');',
          '    // Adder tree: two parallel adds, then one final add. Depth 2.',
          '    wire [16:0] sum_ab = {1\'b0, a} + {1\'b0, b};',
          '    wire [16:0] sum_cd = {1\'b0, c} + {1\'b0, d};',
          '    wire [17:0] sum_t  = {1\'b0, sum_ab} + {1\'b0, sum_cd};',
          '    assign sum_o = sum_t;',
          '',
          '    // Comparator tree: two parallel compares+muxes, one final. Depth 2.',
          '    wire [7:0] max_pq = (p > q) ? p : q;',
          '    wire [7:0] max_rs = (r > s) ? r : s;',
          '    assign max_o    = (max_pq > max_rs) ? max_pq : max_rs;',
          'endmodule',
        ].join('\n'),
        explanation: [
          'The adder tree: sum_ab and sum_cd compute in parallel (depth 1), the final add consumes both (depth 2). Serial chain depth was 3. With ~2.0 ns adders: chain ≈ 6.0 ns of logic, tree ≈ 4.0 ns — 2 ns recovered, exactly a depth level.',
          'Width discipline holds through the transformation (module 04 lesson 2): 16+16 -> 17 bits per pair; 17+17 -> 18 bits total; max 262140 fits 2^18-1 = 262143.',
          'The comparator tree: same shape with compare+mux as the operator. Chain depth 3 -> tree depth 2.',
          'The comment on grouping matters for signed/saturating sums: unsigned wrap is associative, so this transformation is exact here. A saturating sum would need the spec consulted before regrouping.',
          'What changed in the source: only parentheses and named intermediates. That is the characteristic of a good timing fix — reviewable as a semantic no-op.',
        ],
      },
      {
        title: 'Flattening a priority chain: one-hot selection',
        language: 'verilog',
        code: [
          '// BEFORE: if/else-if chain -> serial 4-deep priority mux.',
          '//   always @* begin',
          '//       if      (mode == 2\'d0) y = add_res;    // depends on deep add',
          '//       else if (mode == 2\'d1) y = sub_res;',
          '//       else if (mode == 2\'d2) y = cmp_res;',
          '//       else                   y = pass_res;',
          '//   end',
          '//   Report shape: 4 serial mux elements, each ~0.5 ns.',
          '',
          '// AFTER: one-hot decode + AND-OR select. Depth 2 (decode, select).',
          '//   Conditions are mutually exclusive (mode is a 2-bit one-value',
          '//   field): priority is accidental, so the rewrite is exact.',
          'module mux_flat (',
          '    input  wire [1:0]  mode,',
          '    input  wire [15:0] add_res, sub_res, cmp_res, pass_res,',
          '    output wire [15:0] y_o',
          ');',
          '    wire sel0 = (mode == 2\'d0);   // decode in parallel (depth 1)',
          '    wire sel1 = (mode == 2\'d1);',
          '    wire sel2 = (mode == 2\'d2);',
          '    wire sel3 = (mode == 2\'d3);   // == 2\'b11',
          '',
          '    // One-hot AND-OR: at most one sel is true, so OR of the',
          '    // masked operands selects exactly one source. Depth 2.',
          '    assign y_o = ({16{sel0}} & add_res) |',
          '                 ({16{sel1}} & sub_res) |',
          '                 ({16{sel2}} & cmp_res) |',
          '                 ({16{sel3}} & pass_res);',
          'endmodule',
        ].join('\n'),
        explanation: [
          'The chain\'s cost: each else-if adds a mux stage in series — 4 x 0.5 = 2.0 ns, PLUS the first source\'s own deep logic (add_res) feeding the top of the chain.',
          'The rewrite decodes all four conditions in parallel (each is a 2-bit compare — shallow) and selects with one AND-OR level. Depth: 2 instead of 4. Recovery ~1.0-1.5 ns from the mux chain alone.',
          'The legality comment is the load-bearing one: the four conditions are mutually exclusive (mode holds exactly one value), so priority is accidental. If conditions could overlap (e.g. flag-based enables), the AND-OR rewrite would OR multiple sources — wrong. Check before flattening.',
          'The {16{sel}} replication is the one-hot AND idiom: sel gates its operand bit-wise. Verilog-2001 legal, synthesis-friendly, and lint-transparent (explicit widths).',
          'If the sources themselves are deep (add_res), the next move is registering the sources or the mode (precompute), not more mux flattening — the report after this fix will say which.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The fix catalogue: what each move buys',
        content: [
          '  REPORT SAYS: path X ns over, dominated by ...   ->  FIX',
          '  ------------------------------------------------+--------------------',
          '  serial chain of same operator (adds, cmps)      | tree (depth -1',
          '                                                  | per regroup)',
          '  serial mux chain from if/else (accidental prio) | one-hot AND-OR',
          '  deep condition decodes feeding a mux chain      | precompute',
          '                                                  | (register decodes)',
          '  one huge operator (mul) serial with another     | pipeline cut after',
          '                                                  | the huge operator',
          '  variable shift with a constant amount           | constant shift',
          '  compare against 2^k constant                    | compare upper bits',
          '  deep+wide control signal fanning out            | register it early',
          '',
          '  SEQUENCE: cheap restructurings first, precomputes next,',
          '  pipeline cuts last (they cost latency). Estimate gain before',
          '  spending the iteration; verify with the next report.',
        ].join('\n'),
        caption:
          'Every fix is a depth-reduction or operator-replacement move with a predictable gain; the catalogue plus the report turns closure into arithmetic.',
      },
    ],
    tables: [
      {
        caption: 'Fix catalogue with gain and cost',
        headers: ['Fix', 'Expected gain', 'Cost / risk'],
        rows: [
          ['Chain -> tree', '~1 operator delay per depth level removed', 'None for unsigned wrap; grouping is a spec item for saturating sums'],
          ['Priority chain -> one-hot AND-OR', '~0.5 ns per mux level flattened', 'Requires genuinely exclusive conditions'],
          ['Precomputed (registered) decodes', 'Removes whole decode chains from the path', '1 cycle latency on the decoded inputs'],
          ['Pipeline cut (module 06)', 'Recovers cut segment minus ~1.4 ns overhead', 'Latency, valid plumbing, verification rows'],
          ['Variable -> constant shift', 'Removes barrel shifter entirely', 'Only when the amount is genuinely fixed'],
          ['Registered outputs', 'Removes output cloud from consumer budget', '1 cycle latency at the boundary'],
          ['Early registering of wide/deep controls', 'Backend-replicable driver; path split', '1 cycle latency on the control'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Applying the tree transformation to a saturating or rounded accumulation without checking the spec.',
        fix:
          'Unsigned wrap is associative, so trees are exact there; saturation and intermediate rounding are not — regrouping changes which intermediates clamp/round, changing results. Before regrouping any narrowed arithmetic, re-read the width/narrowing decision (module 04 lesson 2) and re-derive or re-specify.',
      },
      {
        mistake: 'Flattening a priority chain whose priority is real (overlapping conditions).',
        fix:
          'The AND-OR rewrite ORs masked operands: overlapping conditions would merge sources — a functional bug. Check exclusivity first (from the spec, not from hope); keep real priorities as chains (or encode them into a one-hot selector upstream), and comment the exclusivity proof at the rewrite.',
      },
      {
        mistake: 'Pipelining as the first response to every violation.',
        fix:
          'Cuts cost latency, valid plumbing and verification rows — spend them when restructuring cannot reach the budget. The sequence is: operator replacements, trees, one-hot flattens, precomputes, and only then cuts. A cut that could have been a tree is latency and verification cost bought for nothing.',
      },
    ],
    guidedPractice: {
      title: 'Close a -2.0 ns path with the catalogue',
      brief:
        'From lesson 2\'s synthetic report: path sum_q -> max_hold_q, slack -2.03, dominated by a 12-cell adder/compare chain (16-bit sum compared against max_hold) followed by a select mux; levels 16; latency budget: the max-hold may lag the sum by one cycle (spec allows). Choose and justify the fix, estimate the recovery, and write the RTL change. Then state what you would do instead if the spec demanded same-cycle max tracking.',
      starterCode: [
        '// Path: sum_q(16b) -> compare vs max_hold_q -> mux -> max_hold_q',
        '// slack -2.03, levels 16, adder chain dominates.',
        '// Latency budget: max may lag sum by 1 cycle.',
        '// Q1: chosen fix + recovery estimate',
        '// Q2: RTL change',
        '// Q3: alternative if same-cycle required',
      ].join('\n'),
      expectedBehavior:
        'Chosen fix: precompute — register the comparison basis: add a stage where sum_q\'s comparison runs against max_hold a cycle late... concretely: pipeline-cut the path by registering sum_q once more (sum_r_q) before the compare/mux cloud, i.e. compute max from the one-cycle-old sum. Recovery: removes the adder chain (the sum generation) from the max path entirely — several ns, far beyond the needed 2.03. Cost: max lags sum by one cycle — explicitly allowed. RTL: add reg [15:0] sum_r_q; sum_r_q <= sum_q; and compute max_d from sum_r_q. If same-cycle were required: restructure instead — the compare itself against a constant-structured value, or register the max_hold side, or negotiate: same-cycle max of a 16-bit accumulated sum needs the add+compare in one period (the original problem); the honest answer is a spec conversation with the arithmetic shown.',
      hints: [
        'The compare consumes a deeply-computed value: separating compute from compare is the natural cut.',
        'The spec\'s latency allowance decides between cut and restructure — read it first.',
        'Estimate recovery as the removed segment minus register overhead (~1.4 ns).',
      ],
    },
    practiceExercises: [
      {
        title: 'Fix selection drill',
        brief:
          'Match each report shape to the first fix you would try, with a one-line gain estimate: (a) 6 serial 16-bit adders, slack -3.2, no latency budget; (b) 4 serial muxes from mutually exclusive selects, slack -0.9; (c) compare against 16\'h8000 in the critical path; (d) barrel shifter with shamt_q tied to constant 2 via a register.',
        expectedBehavior:
          '(a) Tree the adders: depth 6 -> 3, recovering ~3 adder delays (~6 ns) — more than the needed 3.2; no latency cost. (b) One-hot AND-OR: flatten 4 mux levels to 2 (~1.0 ns). (c) Compare against 2^15 = 0x8000 is a sign-bit test: replace with checking bit 15 only (~wiring, removes the whole compare). (d) The shift amount is constant in practice: replace the barrel shifter with the constant shift >> 2 (pure wiring — infinite gain); if the constancy is truly guaranteed, delete shamt_q.',
        hints: [
          '(c): what is special about powers of two in binary?',
          '(d): ask why the constant lives in a register at all.',
          'Order by gain-per-risk; verify the next report.',
        ],
      },
      {
        title: 'Semantic check before the tree',
        brief:
          'A saturating accumulator (module 04 lesson 2) is added into a 4-input tree for timing. The designer reports results changed by ±1 LSB occasionally. Explain the mechanism, and give the two legitimate resolutions.',
        expectedBehavior:
          'Mechanism: saturation is not associative — the tree saturates at intermediate nodes ((a+b) may clamp before adding c+d), while the chain saturated only at the end; values near the boundary clamp differently, hence occasional ±1 LSB differences. Resolutions: (1) keep the chain on the saturating stage and tree only the pre-saturation full-width adds (tree in exact arithmetic, saturate once at the end) — usually free since the clamp is shallow; (2) if the tree is mandatory for timing, re-specify the rounding/saturation semantics (the spec change route, with the ±1 LSB consequence documented for consumers).',
        hints: [
          'Where does the clamp happen in each grouping?',
          'Tree the exact arithmetic; narrow once, deliberately.',
          'Spec changes are legitimate when documented — surprises are not.',
        ],
      },
    ],
    assessment: {
      title: 'Timing fixes checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'A serial 3-adder chain (2.0 ns per adder) is tree-formed. Expected recovery?',
          options: ['~2.0 ns', '~4.0 ns', '~6.0 ns', '0 ns'],
          answer: '~2.0 ns',
          explanation:
            'Depth 3 -> depth 2 removes one serial adder from the path: one adder delay, ~2.0 ns. (The full 6.0 ns is the whole chain; a pipeline cut would remove more but costs latency.)',
          hint: 'Count the depth levels removed, multiply by operator delay.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'Before rewriting an if/else-if mux chain as a one-hot AND-OR, what must be verified?',
          options: [
            'That the muxes are the same size',
            'That the conditions are mutually exclusive (priority is accidental, not real)',
            'That the sources are registered',
            'That the chain has at least 4 levels',
          ],
          answer:
            'That the conditions are mutually exclusive (priority is accidental, not real)',
          explanation:
            'The AND-OR form ORs masked operands; overlapping conditions would merge sources — a functional bug. Real priorities stay as chains (or get re-encoded upstream).',
          hint: 'What happens if two sel terms are ever true together?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'Comparing a 16-bit unsigned value against the constant 16\'h8000 can be replaced by testing a single bit.',
          answer: 'true',
          explanation:
            '0x8000 is 2^15: x >= 2^15 (unsigned) is exactly x[15] == 1. The compare collapses to one bit test — wiring. Constant-power-of-two compares are free wins in the fix catalogue.',
          hint: 'What does the top bit mean for unsigned values above 2^15?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Order these fixes by the recommended sequence and justify the ordering: pipeline cut, chain-to-tree, precomputed decodes, variable-to-constant shift.',
          answer:
            'Variable-to-constant shift (free, removes an operator entirely), chain-to-tree (cheap, semantic-preserving for exact arithmetic), precomputed decodes (cheap, small latency on decodes), pipeline cut last (largest gain but costs latency, valid plumbing and verification rows)',
          explanation:
            'Sequence by gain-per-cost: free transformations first, structural-but-free next, latency-carrying cuts last. Each spent iteration is expensive; spend the cheapest fixes before the costly ones.',
          hint: 'What does each fix cost in latency and verification?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt:
            'A designer tree-forms a 4-input sum whose result feeds a saturating clamp, and the verification suite now fails near the saturation boundary. What happened?',
          options: [
            'The tree has a wiring bug',
            'Saturation is not associative: intermediate nodes clamp in the tree but not in the chain, so boundary values differ by design — regrouping narrowed arithmetic needs a spec check',
            'The width growth was computed wrong',
            'Verification suites cannot test saturation',
          ],
          answer:
            'Saturation is not associative: intermediate nodes clamp in the tree but not in the chain, so boundary values differ by design — regrouping narrowed arithmetic needs a spec check',
          explanation:
            'Unsigned wrap is associative (trees exact); saturation/rounding is not. The fixes: tree only the exact full-width arithmetic and clamp once, or re-specify with documented behavior change.',
          hint: 'Which intermediate values get clamped in each grouping?',
          difficulty: 'hard',
        },
      ],
    },
    keyTerms: [
      { term: 'Chain-to-tree', definition: 'Regrouping an associative operator chain into a balanced tree; one depth level per regroup.' },
      { term: 'One-hot AND-OR select', definition: 'Parallel decode + masked-OR selection; flattens priority mux chains.' },
      { term: 'Precomputed decode', definition: 'Registering condition decodes one cycle early, removing them from the consuming path.' },
      { term: 'Operator balancing', definition: 'Reordering/replacing operators so large ones are not serial (and constants become wiring).' },
      { term: 'Early registering', definition: 'Placing a register on a deep+wide control signal to split paths and enable backend replication.' },
      { term: 'Associativity', definition: 'Property making regrouping exact; holds for unsigned wrap, NOT for saturation/rounding.' },
    ],
    revisionSummary: [
      'Catalogue: trees (free), one-hot flattens (check exclusivity), precomputed decodes (1-cycle), pipeline cuts (latency), operator replacements (case-by-case).',
      'Gain arithmetic: depth levels removed x operator delay; cuts recover segment minus ~1.4 ns overhead.',
      'Priority must be accidental before flattening; real priorities stay chains.',
      'Associativity: unsigned wrap yes, saturation/rounding no — regrouping narrowed arithmetic is a spec event.',
      'Constant shifts and power-of-two compares collapse to wiring; find them in every critical path.',
      'Sequence cheap-to-expensive; estimate gain before spending an iteration; verify with the next report.',
      'Comment timing-motivated restructurings with their rationale and the original expression.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Static timing analysis',
        url: 'https://en.wikipedia.org/wiki/Static_timing_analysis',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Adder (electronics)',
        url: 'https://en.wikipedia.org/wiki/Adder_(electronics)',
        kind: 'article',
      },
    ],
    estimatedMinutes: 55,
  },
];
