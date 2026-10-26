import type { TutorialLesson } from '../types';

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'sta-m03-l1',
    title: 'Anatomy of a Timing Report',
    summary:
      'Take a synthetic setup report apart line by line — startpoint, clock network, launch flop, the combinational chain, the required path, and the slack line — until every number in any vendor report reads like a sentence.',
    objectives: [
      'Identify the five structural sections of a single-path timing report.',
      'Trace a report\'s delay lines back to the physical path they describe.',
      'Recompute the final slack from the report\'s own numbers as a consistency check.',
      'Distinguish the arrival section (data path) from the required section (clock path).',
    ],
    whyItMatters:
      'The timing report is the shared language of design reviews: leads read slack in seconds, decide architecture changes from path listings, and judge constraint quality from report headers. An engineer who reads reports fluently debugs timing in minutes — asking "which stage dominates this arrival path?" — while a non-fluent reader alternates between panic and blind pipelining. Fluency comes from annotating a handful of reports by hand, which is exactly this lesson.',
    prerequisites: [
      'Setup and hold checks with full arithmetic (Module 1)',
      'Clock constraints (Module 2, lesson 1)',
    ],
    explanation:
      'Every vendor\'s report differs in formatting, but a single-path setup report has the same five sections everywhere:\n\n1. **Header**: corner, clock, path type (max = setup, min = hold), and the path group — the summary you read before anything else, because it qualifies every number below it.\n2. **Arrival section** (the data path): starts at the launch clock edge, walks through clock-network delay to the launch flop\'s clock pin, through clock-to-Q, then every combinational stage and net to the capture flop\'s D pin. Each line shows an incremental delay and a cumulative time; the last cumulative value is the **data arrival time**.\n3. **Required section** (the clock path): starts at the capture clock edge (one period later for setup), walks the capture clock network, then subtracts the setup requirement. The last value is the **data required time**.\n4. **Slack line**: required minus arrival, with MET/VIOLATED.\n5. (Often) **Endpoint metadata**: the capture flop\'s setup number, sometimes the library cell names.\n\nBelow is a synthetic example report — the numbers are internally consistent and hand-checkable, and deliberately small so you can verify every sum. Read it once straight through, then use the guided practice to recompute its slack from scratch.\n\n```\nStartpoint: calc_a_reg/CK  (clocked by sys_clk)\nEndpoint:   acc_reg/D\nPath Group: sys_clk\nPath Type:  max (setup)\nCorner:     slow-slow, 0.90 V, 125 C   (synthetic example report for teaching)\n\n   Delay   Time   Description\n--------------------------------------------------------------\n   0.00    0.00   clock sys_clk (rise edge)             <- launch edge\n   0.35    0.35   clock network delay\n   0.00    0.35   calc_a_reg/CK\n   0.82    1.17   calc_a_reg/Q  <- tcq\n   1.20    2.37   u_add/lo[0]  (adder LSB)\n   2.10    4.47   u_mux/out   (net + mux delay)\n   0.90    5.37   acc_reg/D\n                       data arrival time    5.37\n\n   0.00   10.00   clock sys_clk (rise edge)             <- capture edge\n  -0.35    9.65   clock network delay\n  -0.30    9.35   library setup time\n                       data required time  9.35\n--------------------------------------------------------------\n                       slack (MET)  +3.98\n```\n\nVerify with me: arrival = 0.35 + 0.82 + 1.20 + 2.10 + 0.90 = 5.37. Required = 10.00 - 0.35 - 0.30 = 9.35. Slack = 9.35 - 5.37 = **+3.98 ns**. The report is now just arithmetic you already own from Module 1 — the only new skill is knowing where each number lives.',
    deepDive:
      '### Reading strategy: three passes, seconds each\n\nPass 1 — header: which corner, which clock, setup or hold. A report without a read header is a rumor. Pass 2 — the slack line and the two totals: how bad, and is it arrival-too-long or required-too-short (a required time shrunk by constraint error looks identical to slow logic until you check which side is anomalous). Pass 3 — the dominant lines: which two or three delay lines sum to most of the arrival? In the example, the adder (1.20) and mux+net (2.10) are 61% of the arrival path — that is where a fix would aim.\n\n### The clock network appears twice, deliberately\n\nThe 0.35 ns clock delay appears in the arrival section (getting the launch edge to the launch flop) and, negated, in the required section (getting the capture edge to the capture flop). With a balanced tree they cancel; with skew they differ, and their difference IS the skew from Module 1 — visible right in the report. When someone says "check the clock lines first", they mean: a large difference between the two network-delay lines re-frames the whole path as a skew problem, not a logic problem.\n\n### Why synthetic numbers, honestly\n\nReal reports have dozens of lines per path, cell instance names a paragraph long, and derate annotations. They are the same five sections under noise. This course uses small synthetic reports so every number is checkable by hand — the skill being trained is exactly that hand-check, which you will then apply to real reports to detect tool bugs, bad constraints, and copy-paste analysis errors. Treat "recompute the slack from the lines" as your permanent first reaction to any report.',
    examples: [
      {
        title: 'The same path, min (hold) report',
        language: 'text',
        code:
          'Startpoint: calc_a_reg/CK  (clocked by sys_clk)\nEndpoint:   acc_reg/D\nPath Type:  min (hold)\nCorner:     fast-fast, 1.10 V, -40 C   (synthetic example report for teaching)\n\n   Delay   Time   Description\n--------------------------------------------------------------\n   0.00    0.00   clock sys_clk (rise edge)      <- SAME edge (hold)\n   0.28    0.28   clock network delay (fast corner)\n   0.00    0.28   calc_a_reg/CK\n   0.55    0.83   calc_a_reg/Q  <- tcq min\n   0.30    1.13   u_add/lo[0]  (min delays)\n   0.42    1.55   u_mux/out\n   0.18    1.73   acc_reg/D\n                       data arrival time   1.73\n\n   0.00    0.00   clock sys_clk (rise edge)      <- capture at SAME edge\n   0.28    0.28   clock network delay\n   0.22    0.50   library hold time\n                       data required time  0.50\n--------------------------------------------------------------\n                       slack (MET)  +1.23\n\nCheck: 1.73 - 0.50 = +1.23. Note the capture edge is 0.00,\nnot 10.00 — hold compares the SAME edge, per Module 1.',
        explanation: [
          'The hold report\'s capture edge is at time 0.00, the same edge as launch — the single clearest visual difference between max and min reports.',
          'Every delay is smaller: fast corner, min values. The same physical path, described by the opposite extreme of physics.',
          'The check still recomputes by hand: arrival 1.73 minus required 0.50 equals +1.23.',
          'A pair of reports like these two is what "the path meets timing" actually means — both corners, both checks, two green numbers.',
        ],
      },
      {
        title: 'Dominant-line analysis',
        language: 'text',
        code:
          'From the setup report above, rank the arrival contributors:\n\n   u_mux/out (net + mux)   2.10 ns   39%\n   u_add/lo[0] (adder)     1.20 ns   22%\n   tcq                     0.82 ns   15%\n   acc input net           0.90 ns   17%\n   clock network           0.35 ns    6%\n\n  Two lines = 61% of arrival. Any optimization that does not\n  touch the mux or the adder moves the slack by pennies.\n  THIS ranking is the bridge from report to architecture.',
        explanation: [
          'Sorting delay lines by size converts a wall of numbers into one decision: where to spend effort.',
          'The tcq and clock lines are library/tree properties — essentially fixed; the logic lines are yours.',
          'In real flows the net delays (routing) often dominate; that insight is what pushes fixes toward placement and away from logic surgery.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Report sections mapped onto the physical path',
        content:
          '        ARRIVAL SECTION (data path)                REQUIRED SECTION (clock path)\n\n  sys_clk ---0.35--> [calc_a_reg] --0.82-->\n     ^                 CK        Q                 sys_clk ---(-0.35)--> [acc_reg]\n     |                                          +---1.20-->[adder]--+\n   launch edge                                 |                    |\n   (time 0)                                    +--2.10-->[mux]---0.90--> D\n                                                                     ^\n                                                                  capture edge\n                                                                  (time 10.0)\n\n   arrival accumulates 0 -> 5.37 ; required counts DOWN from 10.0 to 9.35\n   slack = 9.35 - 5.37 = +3.98',
        caption: 'The two report sections walk the two halves of the Module-1 equation: the data path accumulates upward from the launch edge, the clock path counts down from the capture edge.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reading only the slack line and skipping the header.',
        fix: 'The corner and path-type in the header qualify everything below. A +2 slack at the typical corner is not a passing setup number; a min report is not a setup report. Header first, always — it costs one second.',
      },
      {
        mistake: 'Optimizing a stage that is not in the dominant lines.',
        fix: 'Rank the arrival lines first. In the worked example, shortening anything except the mux/adder path moves slack by a fraction of its cost — the ranking is the priority list.',
      },
      {
        mistake: 'Trusting the slack number without recomputing.',
        fix: 'Sum the arrival lines, subtract from required, compare. This thirty-second habit catches mis-parsed reports, tool bugs, and — most often — your own misreading of which section a line belongs to.',
      },
    ],
    guidedPractice: {
      title: 'Recompute a report from scratch',
      brief:
        'Using the setup report above, close the file mentally and reconstruct it: list the five arrival delays from memory of the path (0.35, 0.82, 1.20, 2.10, 0.90), sum them, compute required from the three required-side numbers (10.00, -0.35, -0.30), and derive slack. Then add a new stage of 1.6 ns after the mux and recompute.',
      starterCode:
        '// arrival = ____ + ____ + ____ + ____ + ____ = ____ ns\n// required = ____ - ____ - ____                 = ____ ns\n// slack = ____ - ____                            = ____ ns\n//\n// with a 1.6 ns stage added after the mux:\n// arrival = ____ ; slack = ____',
      expectedBehavior:
        'Arrival 5.37, required 9.35, slack +3.98. With the extra stage: arrival 6.97, slack +2.38 — still met, and the exercise shows exactly how much margin each added stage consumes.',
      hints: [
        'The required section subtracts: clock network and setup come OFF the period.',
        'The added stage lands in the arrival section only — required does not move.',
      ],
    },
    practiceExercises: [
      {
        title: 'Find the skew hiding in a report',
        brief:
          'A setup report shows launch clock network 0.20 ns and capture clock network 0.95 ns on a 8 ns clock. Recompute how much slack the skew consumed, and what the slack would be with balanced trees.',
        expectedBehavior:
          'The 0.75 ns difference is capture-late skew: setup gained 0.75 ns from it, hold lost the same 0.75 ns. With balanced trees the setup slack drops by 0.75 ns (or equivalently, the current setup number is 0.75 ns better than a zero-skew analysis) — and the hold report deserves immediate attention.',
        hints: [
          'Compare the two clock-network lines — their difference is the skew, visible without any other tool.',
          'Which check did that skew quietly spend margin from?',
        ],
      },
      {
        title: 'Turn a report into a fix decision',
        brief:
          'Given: T = 6 ns, arrival 5.8 ns, required 5.5 ns (slack -0.3), dominant lines: net delay 2.4 ns (routing), mux 1.1 ns, tcq 0.7 ns. Choose between (a) pipelining, (b) logic restructuring, (c) placement effort on the net — with a one-sentence justification.',
        expectedBehavior:
          'The routing-dominated profile argues for (c) placement first (cheapest, attacks the 2.4 ns line), with (a) pipelining as the reliable fallback if placement cannot recover 0.3 ns; (b) helps least because the mux is not dominant. The justification names the dominant line — that is the whole skill.',
        hints: [
          'Which line is biggest, and which fix touches that line at lowest cost?',
          'Pipelining always works but costs latency and registers — weigh it after cheaper options.',
        ],
      },
    ],
    assessment: {
      title: 'Report anatomy checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'In a max (setup) report, the required section\'s first line reads "clock sys_clk (rise edge) 10.00". What does 10.00 represent?',
          options: [
            'The capture clock edge, one period after the launch edge at 0.00',
            'The total path delay',
            'The clock period of a different clock',
            'The launch clock edge',
          ],
          answer: 'The capture clock edge, one period after the launch edge at 0.00',
          explanation:
            'Setup checks data launched at edge n against capture at edge n+1. The arrival section starts at 0.00; the required section starts at 10.00 (one period later) and counts down through network delay and setup.',
          hint: 'Setup compares two different edges — where does the second one enter?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'Sum the arrival lines: 0.40 (clock net) + 0.75 (tcq) + 1.10 + 2.30 + 0.80 (logic). What is the data arrival time?',
          code: 'arrival = 0.40 + 0.75 + 1.10 + 2.30 + 0.80',
          options: ['4.65 ns', '5.35 ns', '5.05 ns', '4.35 ns'],
          answer: '5.35 ns',
          explanation: '0.40 + 0.75 = 1.15; + 1.10 = 2.25; + 2.30 = 4.55; + 0.80 = 5.35 ns. The cumulative Time column in a real report does this addition for you — the skill is being able to audit it.',
          hint: 'Add in order; the clock-network line is part of arrival.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'In a min (hold) report, the capture edge line reads 0.00 — the same time as the launch edge.',
          answer: 'true',
          explanation:
            'Hold compares the same clock edge: the question is whether new data corrupts the current capture. The 0.00-versus-10.00 first line is the fastest visual discriminator between hold and setup reports.',
          hint: 'Module 1: which check uses the same edge?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'What two-line quantity in a report reveals clock skew without any other tool (describe as the difference of what)?',
          answer: 'capture clock network delay minus launch clock network delay',
          explanation:
            'The two clock-network lines (one in each section) are the same tree measured at two flops; their difference is the skew that Module 1 defined, printed right in the path listing.',
          hint: 'The clock tree appears twice — once per section.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Path Type max/min', definition: 'Report selector for setup (max) vs hold (min) analysis — the first thing to verify in a header.' },
      { term: 'Data arrival time', definition: 'The cumulative total of the arrival section: launch edge to capture flop\'s D pin.' },
      { term: 'Data required time', definition: 'The countdown total of the required section: capture edge minus network delay minus setup.' },
      { term: 'Dominant lines', definition: 'The two or three delay lines summing to most of the arrival; the priority list for any fix.' },
      { term: 'Path group', definition: 'The clock (or port group) a path is analyzed against; paths are reported per group per corner.' },
    ],
    revisionSummary: [
      'Five sections: header, arrival (data path), required (clock path), slack, endpoint metadata.',
      'Setup reports: arrival counts up from edge n; required counts down from edge n+1 (period later).',
      'Hold reports: both sections start at the same edge — the 0.00-vs-period first line distinguishes them at a glance.',
      'Recompute slack from the lines before trusting it; rank delay lines before choosing a fix.',
      'The two clock-network lines differ by exactly the skew — a whole diagnostic, printed for free.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Yosys open synthesis suite documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'sta-m03-l2',
    title: 'Negative Slack: Causes and Fixes',
    summary:
      'A failing report is a diagnosis waiting to be read: the four cause categories (logic depth, routing/net delay, high fanout, constraint error), how to tell them apart from the report itself, and the fix catalogue for each — with worked numbers.',
    objectives: [
      'Classify a negative-slack path into one of the four cause categories using report evidence.',
      'Apply the fix catalogue: pipelining, logic restructuring, fanout duplication, constraint correction — with the trade-offs of each.',
      'Compute the slack recovery of a pipeline split by hand.',
      'Explain why the first question for any violation is "is the constraint right?"',
    ],
    whyItMatters:
      'Negative slack is where timing work stops being reading and starts being engineering. The four causes have completely different fixes, and applying the wrong one wastes days: pipelining a path whose real problem was a bad constraint adds latency for nothing, while "fixing" a constraint whose real problem was logic depth ships a field failure. The report already contains the evidence — this lesson is the pattern-matching key.',
    prerequisites: [
      'Report anatomy (previous lesson)',
      'Setup/hold arithmetic (Module 1)',
      'RTL pipelining patterns (RTL course, Module 6)',
    ],
    explanation:
      'Take the Module 03 lesson-1 path and make it fail by growing the mux stage from 2.10 to 6.50 ns (a routing-heavy stage). New arrival = 0.35 + 0.82 + 1.20 + 6.50 + 0.90 = **9.77 ns**; required is still 9.35 ns; slack = 9.35 - 9.77 = **-0.42 ns**. The report itself now tells you the story: one line (u_mux/out, 6.50 ns) is 67% of the arrival. **Cause: dominant single stage — routing/net delay.** The fix catalogue:\n\n**Fix 1 — Pipelining** (the reliable hammer). Insert a register stage, splitting the combinational chain. Original chain: 1.20 + 6.50 + 0.90 = 8.60 ns of logic. Split near the middle: stage A = 1.20 + 3.10 = 4.30 ns, stage B = 3.40 + 0.90 = 4.30 ns. New per-stage arrival = 0.35 + 0.82 + 4.30 = 5.47 ns → slack = 9.35 - 5.47 = **+3.88 ns**, comfortably met. Costs: one cycle of latency, extra registers, and a change in interface behavior that software must know about.\n\n**Fix 2 — Logic restructuring** (for depth-dominated paths). If instead the report showed a *chain* of many medium lines (say six stages of 1.4 ns each), the problem is logic depth, and the fix is rebalancing: reorder operations so wide-and-shallow replaces long-and-narrow (an AND-OR chain becomes a balanced tree — the RTL course\'s chain-versus-tree lesson). Recovers delay without latency, but only when the chain is genuinely reassociative.\n\n**Fix 3 — Fanout duplication.** A single net driving 64 loads shows up as a large *net* delay on one line, plus placement-driven detours. Duplicating the driving register (2-4 copies, each driving a subset) shrinks the per-copy net delay. The report signature: one enormous net line attached to a flop output feeding many endpoints.\n\n**Fix 4 — Constraint correction.** Always the FIRST hypothesis, cheapest to check. A path "fails" against a 10 ns clock — but is the clock really 10 ns? Is the path perhaps a legitimate multicycle (Module 02)? Is the endpoint clock mis-constrained, making required artificially tight? Constraint errors produce violations in *categories* (many paths to one clock failing together), while logic problems are usually localized. The rule: a violation you cannot explain physically gets a constraint audit before an RTL change.',
    deepDive:
      '### The diagnosis table, from report evidence to cause\n\n- **One dominant net/routing line** -> routing congestion or distance -> placement effort, then pipeline.\n- **Long chain of similar medium lines** -> logic depth -> restructure (balance the tree).\n- **Huge net delay on a flop driving many endpoints** -> high fanout -> duplicate the register.\n- **Many paths to one clock fail together, small negative slack** -> constraint error -> audit clock period and exceptions.\n- **Only cross-domain paths fail** -> missing/incorrect CDC handling -> RTL synchronizer plus targeted exception (Module 04).\n\nThe signatures are read directly from the ranked delay lines (previous lesson) plus the *breadth* of the failure — one path versus a whole clock group. Breadth is diagnostic gold: logic failures are usually lone paths; constraint failures come in families.\n\n### Fix ordering: cheapest first, always reversible\n\nThe professional order: (1) constraint audit — minutes, no RTL change; (2) placement/routing effort — tool knobs, no RTL change; (3) restructuring — RTL change, no latency; (4) pipelining — RTL change + latency + interface impact; (5) architectural (parallelism, slower clock, protocol renegotiation) — a design decision. Each step costs more than the last, which is why the report evidence matters: it tells you which step the evidence justifies, and every step above 1 requires a sentence of justification in the review.\n\n### Negative slack magnitude calibrates the response\n\n-0.05 ns is placement noise: re-run with better effort. -0.4 ns is a real fix, probably restructuring or one pipeline stage. -3 ns means the architecture does not fit the clock at all — stop optimizing, go back to the budget. Matching response size to slack size is what keeps timing closure from becoming timing whack-a-mole.',
    examples: [
      {
        title: 'The failing report, annotated for diagnosis',
        language: 'text',
        code:
          'Path Type:  max (setup)   Corner: slow-slow (synthetic example report for teaching)\n\n   0.00    0.00   clock sys_clk (rise)\n   0.35    0.35   clock network\n   0.82    1.17   calc_a_reg/Q\n   1.20    2.37   u_add/lo[0]\n   6.50    8.87   u_mux/out   <-- 67% of arrival: dominant line\n   0.90    9.77   acc_reg/D\n                       data arrival time   9.77\n   10.00   10.00   clock sys_clk (rise)\n  -0.35     9.65   clock network\n  -0.30     9.35   setup\n                       data required time  9.35\n                       slack (VIOLATED)  -0.42\n\nDIAGNOSIS: single dominant stage (net+routing on the mux path).\nORDER: (1) constraint audit (2) placement effort on that route\n       (3) pipeline split -> computed recovery: +3.88 ns.',
        explanation: [
          'The ranked lines point at one stage — this is a routing/dominant-stage failure, not a logic-depth failure.',
          'The fix order runs cheapest-first; only after (1) and (2) fail does pipelining get its turn.',
          'The pipeline recovery (+3.88) is precomputed in the fix plan so the review can approve a known outcome, not a hope.',
        ],
      },
      {
        title: 'Pipeline split, the arithmetic of the fix',
        language: 'text',
        code:
          'BEFORE (one 8.60 ns combinational chain, fails by -0.42):\n   Q --[1.20]--[6.50]--[0.90]--> D        arrival 9.77\n\nAFTER (register inserted mid-chain):\n   Q --[1.20]--[3.10]--> D1   stage A: 4.30 ns logic\n                 D1 Q --[3.40]--[0.90]--> D   stage B: 4.30 ns logic\n\n   stage arrival = 0.35 + 0.82 + 4.30 = 5.47 ns\n   stage slack   = 9.35 - 5.47          = +3.88 ns   (both stages)\n\nCOSTS: +1 cycle latency, +register width, interface timing\n       documentation for whoever consumes the result.',
        explanation: [
          'Splitting near the middle balances the two stages — an unbalanced split leaves the worse stage as the new critical path.',
          'The recovery computation uses the same five-line arithmetic as the diagnosis; nothing new is needed.',
          'The costs line is deliberately explicit: pipelining is an interface change, and reviews approve costs, not just benefits.',
        ],
      },
    ],
    tables: [
      {
        caption: 'Cause-to-fix catalogue (the lesson in one table)',
        headers: ['Cause', 'Report signature', 'Fix', 'Cost'],
        rows: [
          ['Constraint error', 'many paths to one clock fail, small negatives', 'audit period/exceptions', 'minutes, no RTL'],
          ['Routing dominance', 'one huge net line', 'placement effort, then pipeline', 'tool time / +latency'],
          ['Logic depth', 'chain of many medium lines', 'restructure to balanced tree', 'RTL change, no latency'],
          ['High fanout', 'huge net on flop feeding many loads', 'duplicate the register', 'area, no latency'],
          ['Architecture mismatch', 'slacks of -ns scale across groups', 're-budget: parallelize or slow clock', 'design decision'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reaching for pipelining before auditing the constraint.',
        fix: 'A constraint audit costs minutes and no RTL; pipelining costs latency and an interface change. Families of small violations to one clock are the classic constraint-error signature — check the clock definition and exceptions first.',
      },
      {
        mistake: 'Fixing a non-dominant line because it is easy.',
        fix: 'Rank the arrival lines; fixes buy slack in proportion to the line they attack. Shortening a 0.3 ns line on a -2 ns path is effort without effect.',
      },
      {
        mistake: 'Treating every -0.05 ns as an architecture crisis (or none of them as one).',
        fix: 'Calibrate: hundred-picosecond negatives are placement territory; half-nanosecond negatives need real fixes; multi-nanosecond negatives mean the clock does not fit the architecture. Response size should track slack size.',
      },
    ],
    guidedPractice: {
      title: 'Diagnose and prescribe',
      brief:
        'A 6 ns clock fails with slack -0.25 ns. The arrival lines: clock net 0.30, tcq 0.70, then SIX logic lines of 0.65 ns each, input net 0.20 (arrival total 5.11; required 5.36... verify the slack). Classify the cause, pick the fix, and compute the balanced-tree recovery if the six stages reassociate into a 3-deep tree of ~0.65-ns pair-merged stages (each tree level merges two inputs in 0.65 ns).',
      starterCode:
        '// verify: arrival = 0.30 + 0.70 + 6*0.65 + 0.20 = ____ ns\n//         required = 6.00 - 0.30 - 0.30 = ____ ns\n//         slack = ____ (should match -0.25 within rounding)\n//\n// tree depth 3 -> logic total = 3 * 0.65 = ____ ns\n// new arrival = 0.30 + 0.70 + ____ + 0.20 = ____ ns\n// new slack  = ____',
      expectedBehavior:
        'Arrival 5.11, required 5.40 (setup 0.30, clock net 0.30) — verify the given slack against your own required-time numbers and note any discrepancy as a constraint-audit flag. Chain-of-six signature = logic depth. Tree fix: 1.95 ns of logic → arrival 3.15 → slack ≈ +2.25 ns, recovered with zero added latency.',
      hints: [
        'Six similar lines in a row is the textbook depth signature — no single dominant stage.',
        'The tree merge only works if the operation reassociates (AND-OR does; subtraction does not) — say which you assumed.',
      ],
    },
    practiceExercises: [
      {
        title: 'Fanout diagnosis',
        brief:
          'A report shows: tcq 0.6, then a single net line of 3.8 ns, then 0.4 ns of logic into each of 40 endpoint flops (the path shown is the worst of 40 nearly identical paths). Prescribe the fix and sketch its RTL/tool form.',
        expectedBehavior:
          'High-fanout signature: one flop driving 40 endpoints through a huge net. Fix: duplicate the source register 4x (each copy driving 10 loads) or let synthesis insert a buffer tree; verify the per-copy net delay shrinks roughly with drive-set size. No latency added.',
        hints: [
          'The 40 nearly-identical failing paths ARE the fanout signature — breadth of failure, not just one line.',
          'max_fanout attributes in synthesis achieve the same thing declaratively.',
        ],
      },
      {
        title: 'The constraint-error family',
        brief:
          'Eighty-three paths to clock `dsp_clk` all fail with slacks between -0.1 and -0.4 ns; logic looks shallow everywhere; the constraint file shows `create_clock -period 7.5` for dsp_clk while the spec says 140 MHz. Diagnose and prescribe.',
        expectedBehavior:
          'Family-of-failures + shallow logic = constraint error. 140 MHz is T = 7.143 ns, so the 7.5 ns constraint is LOOSER than reality — the design "passes" a fiction and fails the real clock. Fix: correct the period to 7.143, then re-close timing honestly (the real violations will be ~0.36 ns worse than reported).',
        hints: [
          'Compute what 140 MHz is in ns — and compare with the constraint\'s claim.',
          'Which direction of error is the dangerous one: too tight or too loose?',
        ],
      },
    ],
    assessment: {
      title: 'Negative slack checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'Eighty paths to one clock fail with small negative slacks; the logic in each is shallow. What is the FIRST thing you do?',
          options: [
            'Pipeline the worst path',
            'Audit the clock constraint for that clock',
            'Duplicate the driving registers',
            'Raise synthesis effort and re-run',
          ],
          answer: 'Audit the clock constraint for that clock',
          explanation:
            'Families of small violations on shallow logic are the classic constraint-error signature (wrong period, missing exception context, or a corner mis-setup). The audit costs minutes and no RTL; the other actions treat a symptom class that usually is not logic at all.',
          hint: 'What does breadth-of-failure tell you about the cause?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt:
            'A 1-cycle path has 8.60 ns of combinational logic (plus tcq 0.82, clock net 0.35, setup 0.30 on a 10 ns clock) failing at -0.42. You pipeline into two balanced 4.30 ns stages. What is the per-stage slack?',
          code: 'stage arrival = 0.35 + 0.82 + 4.30\nstage slack   = (10.00 - 0.35 - 0.30) - stage arrival',
          options: ['+3.88 ns', '+1.94 ns', '-0.42 ns', '+2.53 ns'],
          answer: '+3.88 ns',
          explanation: 'Stage arrival 5.47; required 9.35; slack +3.88. The split converts one -0.42 path into two comfortably-meeting paths, at the cost of one latency cycle.',
          hint: 'Compute the new arrival first; required does not change.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'A negative slack of -3.5 ns on a single path is best addressed by increasing placement effort.',
          answer: 'false',
          explanation:
            'Multi-nanosecond negatives are architectural: the logic does not fit the period, and no placement knob recovers 3.5 ns. The honest response is re-budgeting — pipeline deeply, parallelize, or renegotiate the clock — not tool-effort gambling.',
          hint: 'Match the response size to the slack size.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Name the fix that recovers delay with NO added latency by reassociating a chain into a balanced tree (two words).',
          answer: 'logic restructuring',
          explanation:
            'Restructuring (chain-to-tree balancing) shortens logic depth using the associativity of the operation — unlike pipelining, it costs no cycles, but it only applies where the math reassociates.',
          hint: 'It is the fix for depth-dominated paths.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Dominant line', definition: 'The delay line(s) accounting for most of arrival; determines which fix is worth applying.' },
      { term: 'Pipelining', definition: 'Inserting register stages to split long chains; reliable, costs latency and an interface change.' },
      { term: 'Logic restructuring', definition: 'Reassociating a deep chain into a balanced tree; recovers delay with no latency.' },
      { term: 'Fanout duplication', definition: 'Copying a heavily-loaded register so each copy drives a subset of loads, shrinking net delay.' },
      { term: 'Constraint error', definition: 'A violation family caused by wrong period/exceptions — always the first, cheapest hypothesis.' },
    ],
    revisionSummary: [
      'Diagnose from ranked delay lines plus failure breadth: lone dominant line vs chain vs fanout vs failure family.',
      'Fix order: constraint audit, placement effort, restructuring, pipelining, architecture — cheapest first.',
      'Pipeline recovery is computable beforehand: split the chain, recompute per-stage slack.',
      'Response size must track slack size: -0.05 is placement; -0.5 is a real fix; -3 is architecture.',
      'Families of small violations on shallow logic mean the constraint, not the logic, is the patient.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Yosys open synthesis suite documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'sta-m03-l3',
    title: '"Meets Timing" Is Constraint-Relative — and Other Final Disciplines',
    summary:
      'The sentence every report answers to: meets timing AGAINST WHAT? Multi-corner sign-off, the danger of over-constraining, how FPGA timing reports map onto everything in this course, and the checklist that turns a green report into evidence.',
    objectives: [
      'Explain why "meets timing" is meaningless without the constraint set it was measured against.',
      'Describe what multi-corner sign-off requires: which checks at which corners, and why both extremes are mandatory.',
      'Recognize over-constraining and under-constraining by their symptoms and long-term costs.',
      'Map FPGA vendor timing reports onto the anatomy learned in this module.',
    ],
    whyItMatters:
      'The most expensive timing mistakes are not arithmetic errors — they are category errors: trusting a green report whose constraints were fiction, or "passing" one corner while shipping another. Every silicon respin story and every FPGA board-bring-up war story contains the same sentence: "the tool said it met timing." This lesson is about making that sentence mean something.',
    prerequisites: [
      'Report anatomy and slack arithmetic (Module 3, lessons 1-2)',
      'Constraints and exceptions (Module 2)',
      'Uncertainty and corners (Module 1, lesson 3)',
    ],
    explanation:
      'A timing report is a **conditional statement**: *given these clocks, these I/O delays, these exceptions, at this corner, the paths meet their checks by these margins*. Every green number inherits the truth of its premises. Concretely, take the failing path from the previous lesson (arrival 9.77 ns, real clock 10 ns, slack **-0.42**) and change one line — the constraint:\n\n```\ncreate_clock -period 12.5 -name sys_clk [get_ports clk]   # (fiction)\n```\n\nRequired becomes 12.5 - 0.35 - 0.30 = 11.85 ns; slack becomes 11.85 - 9.77 = **+2.08 ns — MET**. Same netlist, same physical reality, opposite verdict. If the board actually runs 10 ns, this design fails in the field with a report that says +2.08. **The tool checks the design you described, not the design you built.** Under-constraining (period too long, I/O delays missing, exceptions too broad) is the dangerous direction: it produces green reports for broken hardware. Over-constraining (period too short "for margin") is the wasteful direction: real fixes get applied to phantom paths, and worse — teams habituate to red reports and stop reading them, so real violations hide in the noise.\n\n**Multi-corner sign-off** is the discipline that a design is only "done" when every required check passes at every required corner: setup at all slow corners, hold at all fast corners, plus any cross-corner checks the methodology demands. The previous two lessons showed single-corner reports; a sign-off runs the same analysis across the corner set and reports the *worst* number per path. The final discipline: a **timing sign-off checklist** — clocks constrained (audit per-port), I/O constrained (per-port), exceptions reviewed (reason/owner/scope), both check types at all corners, and the constraint file under version control with the same rigor as RTL. A green report plus a green checklist is evidence; either alone is a claim.',
    deepDive:
      '### The constraint file is a product, not a scratchpad\n\nBecause every report is conditional on it, the constraint file is part of the deliverable — versioned, reviewed, diffed, and owned. When the spec\'s clock changes, the constraint changes in the same commit; when an exception is added, the review asks for the reason and owner (Module 02). Teams that treat constraints as tool input rather than product ship exactly the category errors this lesson describes. The audit habit that protects you: for every port and every clock, one constraint line; for every exception, one justifying sentence. Coverage, not cleverness.\n\n### FPGA timing reports: the same anatomy, different accent\n\nVendor FPGA tools (and open flows like nextpnr) print reports with the same five sections: header (corner = device speed grade, plus operating temperature model), arrival walk (routing delays now dominate — often 50-70% of arrival, because programmable interconnect is slower than ASIC metal), required walk, slack. Two dialect differences worth knowing: FPGA tools fold jitter and uncertainty into numbers they label "clock uncertainty" or include in the required path automatically; and FPGA sign-off runs at the device\'s rated speed grades rather than named ss/ff corners — a "-2 speed grade, slow corner" report is the FPGA sentence for what ASIC calls ss. Everything from Modules 1-3 transfers: recompute the slack, rank the lines, diagnose from breadth.\n\n### What timing closure cannot prove\n\nHonesty about scope, one last time: STA proves edge-level timing against your constraint model. It does not prove functional correctness (that is verification), protocol compliance at the system level, power delivery, or signal integrity beyond the model. The RTL Design course\'s capstone verification report and this course\'s timing sign-off are complementary evidence — the project is done when both exist, and neither substitutes for the other.',
    examples: [
      {
        title: 'One netlist, two verdicts',
        language: 'text',
        code:
          'Physical reality: arrival 9.77 ns (fixed netlist, slow corner)\n\nConstraint A (truth):   period 10.0\n   required = 10.0 - 0.35 - 0.30 = 9.65 - wait, use 9.35 form:\n   required = 10.00 - 0.35 - 0.30     = 9.35\n   slack    = 9.35 - 9.77             = -0.42   VIOLATED (honest)\n\nConstraint B (fiction): period 12.5\n   required = 12.50 - 0.35 - 0.30     = 11.85\n   slack    = 11.85 - 9.77            = +2.08   MET (against a lie)\n\nThe hardware ships either way. Only one of these reports\npredicts what the board will do.',
        explanation: [
          'Nothing about the design differs between A and B — only the premise the tool was given.',
          'This is the entire argument for constraint reviews: the report inherits the constraint\'s truth value.',
          'The dangerous errors are always in the direction of optimism: longer period, missing I/O delays, broad exceptions.',
        ],
      },
      {
        title: 'The sign-off checklist (the deliverable of this course)',
        language: 'text',
        code:
          'TIMING SIGN-OFF CHECKLIST\n [ ] Every clock declared; periods match the spec (per-clock audit)\n [ ] Every generated clock declared with correct parent/ratio\n [ ] Every non-clock port has input/output delay, -max AND -min\n [ ] Every exception has: reason comment, owner, narrowest scope\n [ ] Setup analyzed at ALL slow corners   -> worst slack >= 0\n [ ] Hold  analyzed at ALL fast corners   -> worst slack >= 0\n [ ] I/O budgets recomputed and match datasheet derivations\n [ ] Uncertainty/jitter applied and documented (not zeroed)\n [ ] Constraint file versioned and reviewed in the same PR as RTL\n [ ] Report of record archived: tool, version, corners, date, owner\n\nA green report + a green checklist = evidence.\nA green report alone = a claim.',
        explanation: [
          'Each line is a failure class this course has already taught: unconstrained clocks (Module 2 L1), I/O (L2), exceptions (L3), corners (Module 1 L3), report reading (Module 3 L1-2).',
          'The last two lines are process: version control and archived reports are what let a team debug a field return two years later.',
          'The closing sentence is the thesis of the lesson — evidence versus claim.',
        ],
      },
    ],
    tables: [
      {
        caption: 'Under- and over-constraining: symptoms and costs',
        headers: ['Direction', 'Typical symptom', 'Short-term effect', 'Real cost'],
        rows: [
          ['Under (optimistic)', 'green reports, board failures', 'schedule looks great', 'field returns, respins, trust damage'],
          ['Over (pessimistic)', 'chronic red on phantom paths', 'real fixes get made', 'engineers stop reading reports; real violations hide'],
          ['Corner gaps', 'passes typical only', 'fast sign-off', 'fails at temperature/voltage extremes'],
          ['Missing I/O', 'clean pin paths', 'no complaints', 'interface failures the tool never examined'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Quoting "meets timing" without the constraint set, corners, and tool version.',
        fix: 'The sentence is only complete as: "meets timing against constraint-set v14, all sign-off corners, in <tool/version>". If you cannot produce the premises, you do not have the conclusion.',
      },
      {
        mistake: 'Adding margin by silently tightening the clock period "to be safe".',
        fix: 'Margin belongs in the uncertainty/jitter budget, explicitly declared and documented — not in a period that no longer matches the spec, which creates phantom failures and report fatigue.',
      },
      {
        mistake: 'Signing off setup only, or one corner only, because "hold/fast is usually fine".',
        fix: '"Usually fine" is a statistic about other designs, not evidence about yours. Both checks, all sign-off corners — the checklist exists precisely because each skipped line is a shipped failure class.',
      },
    ],
    guidedPractice: {
      title: 'Write the evidence sentence',
      brief:
        'You are handed: a netlist, a constraint file (one create_clock at 8.0 ns, no I/O constraints, one blanket false path), and a report showing setup met at the typical corner only. Using the checklist, list every gap, and write the honest status sentence for the project meeting.',
      starterCode:
        '// Gaps found (fill in from the checklist):\n// 1. ____\n// 2. ____\n// 3. ____\n// 4. ____\n//\n// Status sentence: "The design ____ against ____; it is NOT sign-off\n// complete because ____."',
      expectedBehavior:
        'Gaps: no I/O constraints (all pin paths unanalyzed); blanket exception unaudited; only typical corner (no slow setup / fast hold); uncertainty unverified. Status: "The design meets typical-corner setup against the current constraints; it is not sign-off complete because I/O paths are unanalyzed, hold/fast corners were not run, and the blanket exception is unreviewed."',
      hints: [
        'Walk the checklist top to bottom — each unchecked box is a sentence in the status report.',
        'The honest sentence names what WAS checked as precisely as what was not.',
      ],
    },
    practiceExercises: [
      {
        title: 'FPGA report translation',
        brief:
          'You move from an ASIC flow to an FPGA flow and see "Slack -0.123 ns (required 6.877, arrival 7.000), speed grade -2, slow corner". Decode every element using this course\'s vocabulary and prescribe the next diagnostic step.',
        expectedBehavior:
          'Setup check (required/arrival form), slow speed-grade corner = the FPGA analogue of the ss corner; arrival exceeds required by 0.123 ns. Next step: open the full path, rank the delay lines — expect routing to dominate — and diagnose from the signature (dominant net line suggests placement; a logic chain suggests restructuring; the -0.123 magnitude says placement-effort territory first).',
        hints: [
          'Speed grades are FPGA-speak for corners; "slow" plays the ss role for setup.',
          'The magnitude (-0.123) tells you which response size the problem deserves.',
        ],
      },
      {
        title: 'Constraint-drift post-mortem',
        brief:
          'A board fails at 120 MHz; the constraint file says 8.33 ns; git history shows the spec changed from 120 to 133 MHz six months ago with no constraint change. Write the two-sentence root cause and the two-line process fix.',
        expectedBehavior:
          'Root cause: the constraint still models 120 MHz while the system runs 133 MHz (T = 7.52 ns) — every report since the spec change validated a fiction. Process fix: clock changes require a same-commit constraint change (CI check that constraint periods match the spec table), and the constraint file is reviewed as part of the spec change.',
        hints: [
          'Compute 133 MHz in ns to quantify how much margin was fictional (8.33 - 7.52 ≈ 0.81 ns).',
          'The process fix is about coupling: spec, constraint, and review in one unit of change.',
        ],
      },
    ],
    assessment: {
      title: 'Constraint relativity checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'A design meets timing with +2.08 ns slack against a 12.5 ns clock constraint, but the board runs the clock at 10 ns. What will the hardware do?',
          options: [
            'Work fine — the tool verified it',
            'Fail like the -0.42 ns path it actually is at 10 ns',

            'Work at reduced speed automatically',
            'Cannot be determined from this information',
          ],
          answer: 'Fail like the -0.42 ns path it actually is at 10 ns',
          explanation:
            'The physical arrival (9.77 ns) is fixed; only the premise changed. Against the real 10 ns clock the slack is -0.42 — the +2.08 was measured against a fiction, and physics runs on the real number.',
          hint: 'Which number is physical reality, and which is paperwork?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which direction of constraint error is more dangerous, and why?',
          options: [
            'Over-constraining — it wastes engineering effort',
            'Under-constraining — green reports for broken hardware',
            'Both are equally dangerous',
            'Neither — tools compensate',
          ],
          answer: 'Under-constraining — green reports for broken hardware',
          explanation:
            'Under-constraining hides real failures behind passing reports that ship to the field. Over-constraining wastes effort and can breed report fatigue, but its failures are visible on your desk, not a customer\'s.',
          hint: 'Which error can you discover in the lab, and which only in the field?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'A complete timing sign-off requires setup checks at fast corners and hold checks at slow corners.',
          answer: 'false',
          explanation:
            'It is the reverse: setup at SLOW corners (worst arrival), hold at FAST corners (earliest arrival). Saying it backwards is a classic interview trap — anchor it to the physics of each check.',
          hint: 'Which corner makes data latest? Earliest?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Per the sign-off checklist, what two artifacts together constitute evidence of timing closure (a green report plus what)?',
          answer: 'a green checklist',
          explanation:
            'The completed sign-off checklist — every clock/I/O constrained, exceptions reviewed, all corners run, constraint file versioned — is what upgrades a green report from a claim to evidence.',
          hint: 'The deliverable this lesson builds, item by item.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Constraint-relative', definition: 'Every slack number is conditional on the constraint set; "meets timing" is shorthand for "meets the model".' },
      { term: 'Under-constraining', definition: 'Optimistic constraints (long periods, missing I/O) that produce green reports for failing hardware.' },
      { term: 'Over-constraining', definition: 'Pessimistic constraints creating phantom violations; wastes effort and breeds report blindness.' },
      { term: 'Multi-corner sign-off', definition: 'All checks passing at all required corners: setup at slow, hold at fast, worst numbers reported.' },
      { term: 'Sign-off checklist', definition: 'The per-port, per-clock, per-exception audit that converts a green report into evidence.' },
    ],
    revisionSummary: [
      '"Meets timing" means "meets the constraint model" — the report inherits the truth of its premises.',
      'Under-constraining ships broken hardware with green reports; over-constraining hides real failures in report fatigue.',
      'Sign-off = setup at all slow corners + hold at all fast corners + I/O + exceptions, worst numbers reported.',
      'FPGA reports share the anatomy: speed grades play the corner role; routing dominates arrival.',
      'A green report plus a green checklist is evidence; either alone is a claim.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Wikipedia — Field-programmable gate array', url: 'https://en.wikipedia.org/wiki/Field-programmable_gate_array', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
