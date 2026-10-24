import type { TutorialLesson } from '../types';

/**
 * Module 06 — Pipelining.
 * Why pipelines exist (combinational delay, register boundaries), building a
 * 2-stage pipeline (latency vs throughput, worked numbers), and stalls,
 * backpressure and flushes in a valid/ready pipeline.
 */

export const module06Lessons: TutorialLesson[] = [
  {
    id: 'rtl-m06-l1',
    title: 'Why Pipelines Exist: Delay and Register Boundaries',
    summary:
      'Every path between two registers must finish within one clock period. Combinational clouds add up; registers reset the budget. Pipelining is the deliberate insertion of registers to split slow clouds — the single highest-leverage timing tool an RTL designer owns.',
    objectives: [
      'State the path budget: clock-to-Q + combinational delay + setup <= clock period, and compute fmax from path delay.',
      'Explain why a register resets the timing budget and what that costs (latency) and buys (frequency).',
      'Identify candidate register boundaries in an unpipelined cloud (operator outputs).',
      'Predict the frequency effect of adding logic to a path before synthesis says so.',
    ],
    whyItMatters:
      'The difference between a design that meets 100 MHz and one that meets 250 MHz is usually not clever gates — it is where the registers are. Since frequency targets arrive from requirements (a video block at pixel rate, a PCIe block at lane rate), the ability to look at a combinational cloud and see "this path is 12 ns; the target needs registers at these two operator boundaries" is the core planning skill of timing-aware RTL. Module 08 formalizes the analysis with timing reports; this lesson builds the physical intuition that makes those reports actionable.',
    prerequisites: ['rtl-m01-l1', 'rtl-m04-l1'],
    explanation: [
      'The **path budget** is one inequality. For any path from a register output, through combinational logic, to another register input: `clock-to-Q + logic delay + setup <= clock period`. The register\'s clock-to-Q (tcq) is the time its output settles after the edge (~0.3 ns in modern flows); setup (tsu) is how long data must be stable before the next edge (~0.2 ns); the middle is your cloud. Worked example: tcq 0.3 + multiply 5.0 + add 2.0 + tsu 0.2 = 7.5 ns of required period, so the fastest safe clock is 1/7.5ns ≈ **133 MHz**. Add one 16-bit compare (1.5 ns) downstream of the add and the same design needs 9.0 ns — **111 MHz**. Nothing "broke"; the cloud just got longer than the budget.',
      'A **register resets the budget**. Insert a register between the multiply and the add: the multiply path is now tcq + 5.0 + tsu = 5.5 ns (181 MHz), the add path is tcq + 2.0 + tsu = 2.5 ns (400 MHz), and the whole design runs at the slower of the two — **181 MHz**. The register is the reason: each stage\'s cloud only has to finish within its own cycle, because the result is *stored* and the next stage starts fresh. That is the entire mechanism of pipelining — pay one flip-flop bank and one cycle of latency, buy a shorter worst-case path.',
      'The **cost side is honest**: latency and area. The pipelined multiply-add above delivers its first result 2 cycles after its input instead of 1, and it holds two extra register banks (the product and its valid bit). For streams where results are consumed continuously, latency is usually irrelevant and throughput — one result per cycle regardless of pipeline depth, once full — is what matters. For control paths where the result feeds a decision, latency is a spec item. This is why pipelining decisions live in the architecture artifact (module 02), not in the code: they change the cycle plan.',
      '**Finding the boundaries** is a datapath skill from module 04: candidate cut points are operator outputs, because that is where delay naturally accumulates. The multiply-add has one obvious boundary (after the multiply, before the add). A wide reduction (sum of 8 values) has a tree of boundaries (module 08\'s tree restructuring). The heuristic: compute the delay of each serial block (adders ~ linear in width, multiplies dominating, compares adder-like), lay them end to end, and place registers wherever the running total crosses the period budget. You will not have exact gate delays at RTL time — but relative sizes ("multiply is big, compare is small") are enough to place boundaries that synthesis confirms.',
      'Two companion truths complete the picture. First, **frequency is set by the worst path, not the average**: one 12 ns path in a design of 2 ns paths caps the design at 83 MHz. Pipelining effort therefore goes to the critical path(s), which is why timing reports (module 08) rank paths. Second, **more registers mean more state to reset, enable and verify** — each cut point adds a valid-delay bit and reset entries. Pipelining is cheap but not free; the discipline of module 03 keeps the added registers from becoming the bug source.',
    ].join('\n\n'),
    deepDive: [
      'The 133 MHz calculation deserves scrutiny because it is a *planning* number, not a guarantee. The 5.0 ns multiply is an estimate from block-delay tables or experience; the real synthesized value depends on the standard cells chosen, the fanout, and — critically — **wire delay**, which at RTL time is unknown (module 10 returns to this honest limit). The professional use of these numbers: relative placement (multiply dominates, compare is minor) and rough budgeting (we need roughly 2 stages, not 4). Absolute claims ("this will meet 200 MHz") are synthesis results, and the discipline is to say "estimated" until the tool has spoken.',
      'Why does the *slowest* stage set the frequency rather than the sum? Because the stages run in parallel — every cycle, all stages work simultaneously on different beats. The multiply stage works on beat N while the add stage finishes beat N-1. Each stage needs its own period; the clock must satisfy the slowest. This parallelism is also why pipelining preserves throughput: the "assembly line" advances every cycle, and once filled, one finished product emerges per cycle — regardless of how many stations it passed through.',
      'Retiming is the formal version of boundary-moving: a synthesis transformation that moves registers across combinational logic (without changing behaviour) to balance stage delays. It is worth knowing that it exists, because it explains a synthesis result that otherwise looks like an error — your carefully placed register appears to have moved. Designers who need control over stage boundaries (for latency guarantees in control paths) disable retiming on those paths; designers of pure throughput datapaths often let the tool balance for them. Either way, the decision is recorded, not accidental.',
    ].join('\n\n'),
    examples: [
      {
        title: 'Budget arithmetic on a growing cloud',
        language: 'text',
        code: [
          'PATH BUDGET WORKSHEET (illustrative delay figures)',
          '',
          '  tcq (clock-to-Q)     = 0.3 ns',
          '  tsu (setup)          = 0.2 ns',
          '  8x8 multiply         ~ 5.0 ns',
          '  16-bit add           ~ 2.0 ns',
          '  16-bit compare       ~ 1.5 ns',
          '',
          'DESIGN A: y = cmp( a*b + c )           (one cloud)',
          '  path = 0.3 + 5.0 + 2.0 + 1.5 + 0.2 = 9.0 ns',
          '  fmax = 1 / 9.0ns = 111 MHz',
          '',
          'DESIGN B: register between multiply and add',
          '  stage 1: 0.3 + 5.0 + 0.2 = 5.5 ns  -> 181 MHz',
          '  stage 2: 0.3 + 2.0 + 1.5 + 0.2 = 4.0 ns -> 250 MHz',
          '  fmax = min = 181 MHz   (stage 1 now critical)',
          '',
          'DESIGN C: registers after multiply, after add, after compare',
          '  stage 1: 5.5 ns (181 MHz)   stage 2: 2.5 ns (400 MHz)',
          '  stage 3: 0.3+1.5+0.2 = 2.0 ns (500 MHz)',
          '  fmax = 181 MHz  -- stage 1 still critical; a third register',
          '  buys NOTHING until the multiply itself is pipelined or reduced',
          '',
          'LESSON: registers only help when they split the CRITICAL path;',
          '  balance stages or stop adding them.',
        ].join('\n'),
        explanation: [
          'Design A is the naive cloud: everything serial, one budget, 111 MHz.',
          'Design B cuts after the multiply — the biggest block — and the new critical path is stage 1 (5.5 ns). The design improved 111 -> 181 MHz for one register bank.',
          'Design C adds a third register after the compare, but the multiply stage still needs 5.5 ns, so fmax is unchanged. This is the classic over-pipelining lesson: registers on non-critical paths are pure cost (FFs, latency, valid plumbing).',
          'The next improvement in C would be attacking the multiply itself (a smaller multiplier, or a 2-stage multiply) — logic restructuring, module 08.',
          'All figures are illustrative estimates for teaching the arithmetic; real numbers come from synthesis and the target library.',
        ],
      },
      {
        title: 'Seeing the boundary in RTL: the unpipelined cloud vs the cut version',
        language: 'verilog',
        code: [
          '// UNPIPELINED: one register, one giant cloud, one budget.',
          'module macc_unpipelined (',
          '    input  wire        clk, reset_n,',
          '    input  wire [7:0]  a_i, b_i, c_i,',
          '    output reg  [15:0] y_o,          // result + compare flag',
          '    output reg         gt_o',
          ');',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) begin',
          '            y_o  <= 16\'d0;',
          '            gt_o <= 1\'b0;',
          '        end else begin',
          '            y_o  <= a_i * b_i + {8\'b0, c_i};   // mul + add, one path',
          '            gt_o <= (a_i * b_i + {8\'b0, c_i}) > 16\'d1000; // + compare',
          '        end',
          '    end',
          'endmodule',
          '',
          '// CUT VERSION: register after the multiply (Design B boundary).',
          'module macc_cut (',
          '    input  wire        clk, reset_n,',
          '    input  wire        valid_i,',
          '    input  wire [7:0]  a_i, b_i, c_i,',
          '    output wire        valid_o,',
          '    output wire [15:0] y_o,',
          '    output wire        gt_o',
          ');',
          '    reg        v1_q;',
          '    reg [15:0] p_q;      // stage-1 result: the product',
          '    reg [15:0] c_q;      // stage-1 carried operand',
          '    reg        v2_q;',
          '    reg [15:0] y_q;',
          '',
          '    // Stage 1 cloud: multiply only. Budget: 5.5 ns.',
          '    wire [15:0] product = a_i * b_i;',
          '',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) begin',
          '            v1_q <= 1\'b0;  p_q <= 16\'d0;  c_q <= 16\'d0;',
          '            v2_q <= 1\'b0;  y_q <= 16\'d0;',
          '        end else begin',
          '            v1_q <= valid_i;      // valid travels WITH the data',
          '            p_q  <= product;',
          '            c_q  <= {8\'b0, c_i};',
          '',
          '            v2_q <= v1_q;         // stage 2: add + compare only',
          '            y_q  <= p_q + c_q;',
          '        end',
          '    end',
          '',
          '    assign valid_o = v2_q;',
          '    assign y_o     = y_q;',
          '    assign gt_o    = (p_q + c_q) > 16\'d1000;  // Mealy-style: same stage',
          'endmodule',
        ].join('\n'),
        explanation: [
          'The unpipelined version evaluates the multiply twice (once for y_o, once for gt_o — synthesis will share the adder, but the *path* is mul+add+compare serial: 9.0 ns).',
          'The cut version registers the product (p_q) and the carried operand (c_q) at the boundary. Stage 1\'s cloud is the multiply alone; stage 2\'s is add + compare (4.0 ns). Each path now fits a shorter period.',
          'The valid bit (v1_q, v2_q) travels with the data — the delay-line idiom from module 03\'s delay_line example. Without it, the consumer cannot know which output cycles are real.',
          'gt_o stays combinational in stage 2 (Mealy-style within the module, module 05 lesson 1): it responds in the same cycle as y_q\'s data. Register it too if the consumer is another module and one more cycle of latency is acceptable.',
          'Trace: input (a=10,b=20,c=5,valid=1) at c0 -> edge: p=200, c=5, v1=1 -> edge: y=205, v2=1. y_o/valid_o show 205 two cycles after the input. Results for consecutive inputs appear one per cycle (throughput preserved), latency now 2.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Register boundaries: one budget vs three',
        content: [
          '  UNPIPELINED (Design A): one 9.0 ns path, one budget',
          '  [FF]--0.3--( multiply 5.0 )--( add 2.0 )--( cmp 1.5 )--0.2--[FF]',
          '   |<--------------------- 9.0 ns ----------------------------->|',
          '   fmax = 111 MHz                       latency: 1 cycle',
          '',
          '  CUT (Design B): three short paths, three budgets',
          '  [FF]--0.3--( multiply 5.0 )--0.2--[FF]--0.3--( add )--( cmp )--0.2--[FF]',
          '   |<------ 5.5 ns ------->|            |<------ 4.0 ns ------->|',
          '   fmax = min(181, 250) = 181 MHz       latency: 2 cycles',
          '',
          '  Stages run in PARALLEL on different beats:',
          '   cycle:    1        2        3        4',
          '   stage1:  beat1    beat2    beat3    beat4',
          '   stage2:   -      beat1    beat2    beat3',
          '   done:              -      beat1    beat2   <- one per cycle, once full',
        ].join('\n'),
        caption:
          'The register splits one long budget into short ones; the assembly line then advances every cycle. Frequency follows the slowest remaining stage.',
      },
      {
        kind: 'waveform',
        title: 'Unpipelined vs pipelined result timing (valid streams)',
        content: [
          '  UNPIPELINED: 1-cycle latency, results limited by 9 ns period',
          '  clk    __|‾|__|‾|__|‾|__|‾|__',
          '  valid  __/‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾    (in)',
          '  y_o    ==X==r1====X==r2====X==r3',
          '             ^1 cycle after each input; inputs must be',
          '              spaced >= 9 ns',
          '',
          '  PIPELINED (2 stages): 2-cycle latency, inputs every 5.5 ns',
          '  clk    __|‾|__|‾|__|‾|__|‾|__|‾|__',
          '  valid  __/‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾ (in)',
          '  v_o    =====X===/‾‾‾‾‾‾‾‾‾‾‾‾‾‾   (out: valid delayed 2)',
          '  y_o    =====X===X===r1====X==r2===',
          '                      ^r1 appears 2 cycles after input 1,',
          '                       then r2 follows 1 cycle later',
          '',
          '  Same results, same order, one extra cycle of first-result',
          '  delay; inputs may now arrive every cycle at 181 MHz.',
        ].join('\n'),
        caption:
          'educational waveform (illustrative): pipelining trades one cycle of first-result latency for a shorter required period between inputs.',
      },
    ],
    tables: [
      {
        caption: 'Illustrative path budget worksheet (teaching figures)',
        headers: ['Element', 'Delay', 'Note'],
        rows: [
          ['Clock-to-Q (tcq)', '~0.3 ns', 'Register output settling'],
          ['8x8 multiply', '~5.0 ns', 'Dominant block — cut here first'],
          ['16-bit add', '~2.0 ns', 'Carry chain, roughly linear in width'],
          ['16-bit compare', '~1.5 ns', 'Adder-like'],
          ['Setup (tsu)', '~0.2 ns', 'Register input requirement'],
          ['Design A total', '9.0 ns', '111 MHz'],
          ['Design B worst stage', '5.5 ns', '181 MHz — one register bank bought 63%'],
        ],
      },
      {
        caption: 'What a register boundary costs and buys',
        headers: ['Effect', 'Direction', 'Amount here'],
        rows: [
          ['Frequency', 'Buys', 'min-stage period: 9.0 -> 5.5 ns'],
          ['Latency', 'Costs', '+1 cycle (1 -> 2)'],
          ['Area', 'Costs', '2 register banks (16-bit x2 + valid bits)'],
          ['Verification', 'Costs', 'Valid delay line; reset entries; corner cycles'],
          ['Throughput', 'Unchanged', '1 result/cycle either way (once full)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Estimating frequency by summing block delays and reporting it as a guarantee ("this is 133 MHz design").',
        fix:
          'The worksheet is a planning estimate: real delays depend on library, fanout and wire delay (unknown at RTL time). Say "estimated critical path ~9 ns" and verify with synthesis. The numbers\' legitimate use is relative: which block dominates, where boundaries belong.',
      },
      {
        mistake: 'Adding pipeline registers to non-critical stages because "more pipelining is better".',
        fix:
          'Registers only help when they split the critical path (Design C lesson). Extra registers on already-fast paths add latency, FFs, valid plumbing and reset entries for zero frequency gain. Find the worst path first (worksheet, then timing report in module 08), cut there.',
      },
      {
        mistake: 'Pipelining the datapath but letting the valid signal arrive at full speed without a matching delay line.',
        fix:
          'The consumer cannot tell which output cycles are real without a valid delayed by exactly the same number of stages. Every pipeline cut adds one valid register in parallel with the data registers — the v1_q/v2_q pattern. Missing valid delay is a silent wrong-data bug that looks like sporadic corruption.',
      },
    ],
    guidedPractice: {
      title: 'Budget a four-block cloud',
      brief:
        'A cloud computes y = shift(a*b, k) + d where the multiply is 5.0 ns, the barrel shift 3.0 ns, the add 2.0 ns, tcq 0.3, tsu 0.2. (a) Compute the unpipelined fmax. (b) Place the minimum number of register boundaries to reach 200 MHz (period 5.0 ns), and show each stage\'s budget. (c) State the new latency and what the valid delay line needs.',
      starterCode: [
        '// Delays: tcq 0.3, mul 5.0, barrel shift 3.0, add 2.0, tsu 0.2',
        '// (a) fmax_unpipelined = ?',
        '// (b) boundaries to reach 5.0 ns period: where?',
        '// (c) latency = ? valid delay stages = ?',
      ].join('\n'),
      expectedBehavior:
        '(a) 0.3+5.0+3.0+2.0+0.2 = 10.5 ns -> 95 MHz. (b) 200 MHz needs every stage <= 5.0: cut after the multiply (stage 1: 0.3+5.0+0.2 = 5.5 — still over!) so also cut after the shift: stage 1 = 5.5 ns fails -> the multiply+0.6 overhead already exceeds 5.0, so 200 MHz requires attacking the multiply itself (smaller multiplier or 2-stage multiply); with boundaries after mul and after shift, stages are 5.5/3.5/2.5 -> fmax 181 MHz, not 200. The honest answer: this cloud cannot reach 200 MHz by boundary placement alone — the multiply must be restructured. (c) With 2 cuts: latency 3 cycles, valid delayed by 2 stages (plus output register convention).',
      hints: [
        'The tcq+tsu overhead (0.6 ns) rides on every stage — a 5.0 ns budget leaves 4.4 ns for logic.',
        'Check each stage against 5.0 ns; the failing stage sets fmax.',
        'When boundary placement cannot reach the target, the next tool is logic restructuring (module 08) — say so.',
      ],
    },
    practiceExercises: [
      {
        title: 'Critical path ranking',
        brief:
          'Rank these blocks by expected delay growth with width, then identify the best first cut point in a cloud that chains all four: 8-bit add, 32-bit multiply, 1-bit AND, 64-bit add.',
        expectedBehavior:
          'Ranking (delay vs width): 32-bit multiply (dominant, superlinear structure), 64-bit add (long carry chain), 8-bit add (short chain), 1-bit AND (negligible). Best first cut: after the 32-bit multiply — it isolates the dominant block, leaving the adds and the AND in a short second stage. Cutting between the two adds instead would leave mul+64-bit add serial in one stage: barely an improvement.',
        hints: [
          'Multiply dominates at comparable widths; carry chains scale linearly.',
          'A cut is only useful if it separates a big block from the rest.',
          'The 1-bit AND is wiring — never a boundary candidate.',
        ],
      },
      {
        title: 'Latency spec check',
        brief:
          'A control-loop spec says "the correction output must reflect an error sampled at most 2 cycles earlier". The datapath engineer pipelines the correction path into 4 stages. Is this a violation? What are the two legitimate resolutions?',
        expectedBehavior:
          'Yes — 4 stages means the output reflects an error sampled 4 cycles earlier, violating the freshness requirement regardless of frequency. Resolutions: (1) re-pipeline to <= 2 stages (restructure logic to fit the budget in 2); (2) renegotiate the spec with evidence — show that the loop\'s stability margin tolerates 4-cycle-old error, and record the spec change. What is NOT acceptable: shipping 4 stages and hoping, or silently redefining "cycle" in the spec.',
        hints: [
          'Latency is a spec item, not just a performance number.',
          'One resolution changes hardware, the other changes the spec — both go through artifacts.',
          'Freshness requirements are why control paths often stay unpipelined.',
        ],
      },
    ],
    assessment: {
      title: 'Pipeline motivation checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'With tcq = 0.3 ns, a 5.0 ns multiply, a 2.0 ns add, and tsu = 0.2 ns, what is the fmax of the unpipelined multiply-add?',
          options: ['143 MHz', '133 MHz', '182 MHz', '200 MHz'],
          answer: '133 MHz',
          explanation:
            'Path = 0.3 + 5.0 + 2.0 + 0.2 = 7.5 ns; fmax = 1/7.5 ns ≈ 133 MHz. (182 MHz would be the 5.5 ns pipelined stage-1 figure.)',
          hint: 'Sum the four terms, then invert.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'After inserting a register between the multiply and the add (previous question\'s design), what sets the new fmax?',
          options: [
            'The add path (2.5 ns)',
            'The multiply stage (5.5 ns) — the slowest remaining stage',
            'The sum of both stages (8.0 ns)',
            'The valid delay line',
          ],
          answer: 'The multiply stage (5.5 ns) — the slowest remaining stage',
          explanation:
            'Stages run in parallel on different beats; the clock must satisfy the slowest stage: tcq + mul + tsu = 5.5 ns -> 181 MHz. Stages never sum — that is the parallelism pipelining creates.',
          hint: 'Do stages add, or run concurrently?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'Adding a third pipeline register after the compare in Design B (multiply | add+compare) raises fmax further.',
          answer: 'false',
          explanation:
            'The critical path is the multiply stage (5.5 ns); a register after the compare leaves it untouched. Registers on non-critical paths cost area, latency and valid plumbing without changing fmax.',
          hint: 'Which stage would the new register actually shorten?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'State the path budget inequality with all three terms, and name the two register parameters in it.',
          answer:
            'clock-to-Q + combinational logic delay + setup <= clock period; the register parameters are tcq (clock-to-Q) and tsu (setup)',
          explanation:
            'Every register-to-register path must fit the period. tcq and tsu are properties of the register (and library); the logic delay is the designer\'s part — the part pipelining shrinks.',
          hint: 'What happens at the start and end of every path?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'output-prediction',
          prompt:
            'In macc_cut, an input (a=3,b=4,c=1,valid=1) arrives at cycle 0. At which cycle does valid_o first assert for this beat?',
          code: 'v1_q <= valid_i;   p_q <= a_i*b_i;   // stage 1\nv2_q <= v1_q;      y_q <= p_q + c_q; // stage 2\nassign valid_o = v2_q;',
          options: ['cycle 1', 'cycle 2', 'cycle 3', 'valid_o never asserts'],
          answer: 'cycle 2',
          explanation:
            'v1_q takes the input valid at the cycle-1 edge; v2_q takes v1_q at the cycle-2 edge. valid_o = v2_q is high from cycle 2 — a 2-cycle latency, matching the two stages.',
          hint: 'Count the valid registers the beat passes through.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Path budget', definition: 'tcq + logic delay + tsu <= clock period — the constraint every register-to-register path must satisfy.' },
      { term: 'Critical path', definition: 'The slowest register-to-register path; it alone sets fmax.' },
      { term: 'Register boundary', definition: 'A deliberately placed register splitting a long combinational path into stages.' },
      { term: 'Throughput', definition: 'Results per cycle in steady state; 1/cycle for a full pipeline regardless of depth.' },
      { term: 'Latency', definition: 'Cycles from input to its result; grows by one per pipeline stage.' },
      { term: 'Valid delay line', definition: 'Valid bits registered in parallel with pipelined data, so consumers know which outputs are real.' },
      { term: 'Retiming', definition: 'Synthesis transformation moving registers across logic to balance stage delays.' },
    ],
    revisionSummary: [
      'Budget: tcq + logic + tsu <= period; fmax = 1 / worst path.',
      'A register resets the budget: buy 1 cycle latency + FFs, buy frequency on the cut path.',
      'Stages run in parallel — fmax = slowest stage, never the sum.',
      'Cut at operator outputs, biggest block first; registers on non-critical paths are pure cost.',
      'Every cut adds a valid register — the delay line travels with the data.',
      'Worksheet numbers are estimates: relative placement is reliable, absolute frequency is a synthesis claim.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Pipeline (computing)',
        url: 'https://en.wikipedia.org/wiki/Pipeline_(computing)',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Clock signal',
        url: 'https://en.wikipedia.org/wiki/Clock_signal',
        kind: 'article',
      },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'rtl-m06-l2',
    title: 'Building a 2-Stage Pipeline: Latency vs Throughput',
    summary:
      'A complete worked pipeline: y = (a*b)+c on 8-bit inputs, split into a multiply stage and an add stage, with a valid delay line, registered outputs, and the full latency/throughput accounting that decides whether the transformation paid.',
    objectives: [
      'Implement a 2-stage pipelined multiply-add with stage registers and a valid delay line.',
      'Account for latency and throughput precisely, including the fill and drain cycles.',
      'Verify beat integrity: every input beat produces exactly one output beat, in order.',
      'Decide when pipelining pays using the latency/throughput/frequency triple.',
    ],
    whyItMatters:
      'Pipelining is the most frequently applied performance transformation in RTL, and it is also the most frequently applied *incorrectly* — valid lines that lag the data, beats that double or vanish across the boundary, latency claims that ignore fill cycles. Building one complete pipeline by hand, tracing every beat, is how the pattern becomes trustworthy: after this lesson, the 2-stage shape is a known quantity you can extend, and module 06 lesson 3 will add stalling to it.',
    prerequisites: ['rtl-m06-l1', 'rtl-m05-l3'],
    explanation: [
      'The design: inputs a_i, b_i, c_i (8-bit each) with a valid_i; output y_o = a*b + c (16-bit) with valid_o. Stage 1 computes the product and registers it along with c (extended to 16 bits) and the valid bit. Stage 2 adds and registers the result with the delayed valid. Two register banks, two clouds, one valid delay line of length 2. The stage registers are exactly the Design B boundary from lesson 1; the only new machinery is the bookkeeping that makes the stream *traceable*: which output corresponds to which input.',
      '**Latency accounting** counts register banks from input port to output port: a beat entering at cycle 0 lands in stage-1 registers at edge 1, in stage-2 (output) registers at edge 2, so valid_o asserts for it in cycle 2 — latency 2. **Throughput accounting** asks how often new inputs may enter: every cycle, because each edge both captures a new beat into stage 1 and advances the previous beats — once the pipeline is full (after 2 cycles), one result emerges per cycle. The fill phase (cycles 0-1) produces nothing; the drain phase after the last input takes 2 more cycles to flush. For long streams, fill/drain are amortized noise; for short bursts of N beats, effective throughput is N/(N+2) — pipelines favor sustained streams.',
      '**Beat integrity** is the correctness property: inputs B1, B2, B3 must produce outputs R1, R2, R3 in order, exactly once each. The mechanism is mechanical — data and valid move through the same registers in lockstep, and since there is no reordering logic, order is preserved by construction. What breaks integrity in practice is bookkeeping drift: a valid line registered one fewer time than the data (outputs assert a cycle early — the consumer reads garbage), or a valid line that does not gate the output register (results computed from stale stage-1 data appear as real). The discipline: register data and valid in the same always block, same branch, same conditions — they are one beat, traveling together.',
      'Registered outputs at the module boundary complete the design: y_o and valid_o are driven from registers, so the consumer sees clean, timing-friendly signals (module 05 lesson 1\'s Moore-at-boundaries rule). The cost is that latency counts the output register — a 2-stage pipeline with registered output has 2 cycles of latency, where a combinational-output version would have 1.5-ish cycles (the output cloud is not registered) — but unregistered outputs leak the stage-2 cloud into the consumer\'s timing budget, which is exactly the coupling the handshake and boundary rules exist to prevent. Register the boundary; count the latency honestly.',
      'The decision question — **does pipelining pay?** — has a three-part answer. Frequency: the worst path drops from 7.5 ns (unpipelined) to 5.5 ns (multiply stage), a 36% frequency gain. Throughput: unchanged at 1/cycle (both designs sustain one result per cycle when clocked at their respective fmax — but the pipelined one delivers more results per second because its cycle is shorter: 181M results/s vs 133M). Latency: worse, 1 -> 2 cycles. So pipelining pays when the consumer is a stream (frequency/throughput matter, latency does not) and does not pay when the consumer needs the result immediately (control loops with freshness budgets). Write all three numbers in the decision record; frequency alone is half the story.',
    ].join('\n\n'),
    deepDive: [
      'The valid delay line generalizes to any depth: N stages means N valid registers in lockstep with the data. It is worth noticing that valid is just a 1-bit datapath signal — it obeys every datapath rule (registered with the data, reset to 0, no shortcuts). Teams that treat valid as "control" and pipeline it differently from data create the classic mismatch: data arrives one cycle before its valid, or vice versa. The unified rule — the beat is (data, valid), registered together — is also exactly how the handshake slice of module 05 and the stall logic of lesson 3 extend without surprises.',
      'Fill and drain interact with reset and with flushes. After reset, the pipeline is empty: valid_o stays low for `depth` cycles even if valid_i asserts immediately — the fill phase is visible on valid_o, and a well-behaved consumer simply waits. Drain at end-of-stream is the mirror: after the last input, valid_o remains high for `depth` cycles as the tail beats emerge. A flush (lesson 3) is a forced, partial drain: valid bits are cleared mid-stream, discarding beats. All three behaviors are visible in the valid line alone — which is why waveform debugging of pipelines starts at valid, not at data.',
      'A note on where the multiply actually went: at 8 bits, a synthesizer maps `a_i * b_i` to DSP blocks (FPGA) or a built multiplier (ASIC library) whose internal structure may itself be pipelined — a "1-cycle multiply" in RTL can become a 2- or 3-cycle DSP macro with latency, silently shifting your beat alignment (module 10 covers the mapping). The lesson\'s pipeline is built from *registered boundaries you placed*; if a tool-inserted internal pipeline changes the multiply\'s latency, the valid line must be lengthened to match. The general defense: confirm the stage register\'s sources are single-cycle clouds, and verify beat integrity in simulation with an input pattern that exposes off-by-one latency (a beat, a gap, a beat).',
    ].join('\n\n'),
    examples: [
      {
        title: 'The complete 2-stage pipelined multiply-add',
        language: 'verilog',
        code: [
          '// 2-stage pipeline: y = a*b + c, 8-bit in, 16-bit out.',
          '// Stage 1: multiply.  Stage 2: add.  Valid travels in lockstep.',
          '// Module 04 width laws: 8x8 -> 16 bits; 16+16 -> 16 (c extended).',
          'module mac_pipe2 (',
          '    input  wire        clk,',
          '    input  wire        reset_n,',
          '    input  wire        valid_i,',
          '    input  wire [7:0]  a_i, b_i, c_i,',
          '    output wire        valid_o,',
          '    output wire [15:0] y_o',
          ');',
          '    // ---- stage 1 registers: product + carried operand + valid ----',
          '    reg        v1_q;',
          '    reg [15:0] p_q;      // a*b  (stage-1 cloud is the multiply)',
          '    reg [15:0] c_q;      // c carried to stage 2',
          '',
          '    // ---- stage 2 (output) registers: sum + valid ----',
          '    reg        v2_q;',
          '    reg [15:0] y_q;',
          '',
          '    // Stage-1 cloud (single-cycle by design).',
          '    wire [15:0] product = a_i * b_i;',
          '',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) begin',
          '            v1_q <= 1\'b0;  p_q <= 16\'d0;  c_q <= 16\'d0;',
          '            v2_q <= 1\'b0;  y_q <= 16\'d0;',
          '        end else begin',
          '            v1_q <= valid_i;             // valid moves WITH data',
          '            p_q  <= product;',
          '            c_q  <= {8\'b0, c_i};         // zero-extend (unsigned)',
          '',
          '            v2_q <= v1_q;                // stage 2: add only',
          '            y_q  <= p_q + c_q;',
          '        end',
          '    end',
          '',
          '    // Registered module boundary.',
          '    assign valid_o = v2_q;',
          '    assign y_o     = y_q;',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Lines 12-19: two register banks, declared and grouped by stage. The stage-1 bank (v1_q, p_q, c_q) is the cut from lesson 1; the stage-2 bank (v2_q, y_q) is the registered module boundary.',
          'Line 22: the stage-1 cloud is exactly one multiply — the block that set the 7.5 ns path. Its 5.5 ns budget is the design\'s fmax.',
          'Lines 29-31: the beat (data + valid) is registered in one always block, one branch: v1_q <= valid_i alongside p_q and c_q. Beat integrity is structural, not hoped for.',
          'Lines 33-34: stage 2\'s cloud is one 16-bit add; its output registers are the boundary. c_q was already extended at stage 1, so the add runs at full 16-bit width — no truncation.',
          'Full trace, two beats back to back: beat1 (10,20,5) at c0, beat2 (3,4,1) at c1. Edge c0->c1: p=200, c=5, v1=1. Edge c1->c2: y=205, v2=1 (valid_o high in c2: beat1 out); simultaneously p=12, c=1, v1=1 for beat2. Edge c2->c3: y=13, v2=1 (beat2 out). One result per cycle from c2 on; latency 2; order preserved (205 then 13).',
          'Fill/drain: valid_o is low in c0-c1 (fill) and stays high for 2 cycles after the last input (drain). For a 100-beat stream: 100 results in 102 cycles — pipelines pay on sustained streams.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'mac_pipe2 structure with beat tracking',
        content: [
          '                stage 1                    stage 2',
          '  a_i --+                                   ',
          '  b_i --+--[ multiply 5.0ns ]--( p_q )---[ add 2.0ns ]--( y_q )--> y_o',
          '  c_i ------------[ zero-ext ]----( c_q )---------+              ',
          '  valid_i ------------------------( v1_q )-------( v2_q )------> valid_o',
          '        |                                          ',
          '        +-- one cloud: 5.5 ns budget --+-- one cloud: 2.5 ns budget',
          '',
          '  Beat path:  (a,b,c,valid) -> {p_q,c_q,v1_q} -> {y_q,v2_q} -> (y,valid)',
          '  Registers:  p_q+c_q+v1_q = 33 (stage 1) + y_q+v2_q = 17 (stage 2)',
          '              total 50 FFs',
          '  Latency:    2 cycles   Throughput: 1 beat/cycle (when full)',
        ].join('\n'),
        caption:
          'The pipeline as hardware: two clouds, two register banks, one valid line in lockstep. Every beat follows the same register path — order preserved by construction.',
      },
      {
        kind: 'waveform',
        title: 'mac_pipe2 beat trace (two back-to-back beats)',
        content: [
          '         __    __    __    __    __    __',
          'clk   __|  |__|  |__|  |__|  |__|  |__|  |__',
          '        c0    c1    c2    c3    c4',
          '',
          'valid_i ==/‾‾‾‾‾‾‾‾‾‾/‾‾‾\\____________',
          'a,b,c   ==X==10,20,5=X==3,4,1=======',
          '',
          'v1_q    =====X===/‾‾‾‾‾‾‾‾‾‾\\_______',
          'p_q     =====X==200====X==12======',
          'c_q     =====X===5=====X===1======',
          '',
          'v2_q    ==========X===/‾‾‾‾‾‾‾‾‾\\__',
          'y_q     ==========X==205====X==13=',
          '                       ^beat1 out  ^beat2 out',
          '',
          '  Fill: c0-c1 (v2_q low).  Results: c2 (205), c3 (13).',
          '  Latency 2, throughput 1/cycle, order kept.',
        ].join('\n'),
        caption:
          'educational waveform (illustrative): the valid line mirrors the data with a 2-register delay; each output beat is traceable to exactly one input beat.',
      },
    ],
    tables: [
      {
        caption: 'Latency/throughput ledger: unpipelined vs 2-stage',
        headers: ['Metric', 'Unpipelined', '2-stage pipelined'],
        rows: [
          ['Worst path', '7.5 ns (mul+add+regs)', '5.5 ns (mul stage)'],
          ['fmax', '133 MHz', '181 MHz'],
          ['Latency (cycles)', '1', '2'],
          ['Throughput (steady)', '1/cycle', '1/cycle'],
          ['Results per second at fmax', '133 M', '181 M'],
          ['Registers', '17 (y_o 16 + gt_o 1)', '50 (33 stage-1 + 17 stage-2)'],
          ['100-beat burst time', '100 cycles at 7.5 ns = 750 ns', '102 cycles at 5.5 ns = 561 ns'],
        ],
      },
      {
        caption: 'Beat integrity checklist for any pipeline',
        headers: ['Check', 'How'],
        rows: [
          ['Valid delayed exactly as many stages as data', 'Count valid registers vs data register banks'],
          ['Valid registered in same block/branch as data', 'Read the always block: one condition for the beat'],
          ['Outputs registered at the boundary', 'valid_o/y_o driven from _q'],
          ['Order preserved', 'No reordering logic; single register path'],
          ['Exactly-once', 'No conditional capture on one side only'],
          ['Reset empties the pipe', 'All valid bits reset to 0'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Registering the data through N stages but the valid through N-1 (or gating valid off during fill).',
        fix:
          'The consumer then reads data one cycle before (or after) its valid — wrong-data bugs that show as sporadic corruption. Count registers on both sides; the valid line must be the exact same depth, registered in the same always blocks under the same conditions.',
      },
      {
        mistake: 'Claiming throughput 1/cycle including the fill cycles for short bursts.',
        fix:
          'An N-beat burst through a depth-D pipeline takes N+D cycles: effective throughput N/(N+D). For sustained streams D is amortized; for short control bursts it dominates. State burst numbers with fill/drain included when the use case is bursty.',
      },
      {
        mistake: 'Leaving the output cloud unregistered to "save a cycle of latency".',
        fix:
          'The unregistered output pushes the stage-2 cloud into the consumer\'s timing budget — the coupling that module boundaries exist to prevent. Register the boundary and count the latency; if that cycle matters, the spec conversation (module 02) is where it is resolved.',
      },
    ],
    guidedPractice: {
      title: 'Extend to 3 stages and account honestly',
      brief:
        'Add a third stage to mac_pipe2: stage 3 applies a >> 2 normalize (y_norm = y_q >> 2) with its own valid register, outputting y3_o/valid3_o. Update the valid line, give the new latency/throughput/fmax worksheet (using lesson 1\'s figures: mul 5.0, add 2.0, shift ~0 wiring), and state the fill/drain cost for a 10-beat burst.',
      starterCode: [
        '// Add to mac_pipe2:',
        '//   stage 3: v3_q <= v2_q;  y3_q <= y_q >> 2;   (constant shift:',
        '//   pure wiring, 0 ns logic). New outputs: valid3_o, y3_o.',
        '// Worksheet: stage budgets, fmax, latency, 10-beat burst time.',
      ].join('\n'),
      expectedBehavior:
        'Stage 3 adds one register bank (v3_q, y3_q[15:2 used]); cloud is wiring (~0 ns), budget = 0.3+0.2 = 0.5 ns. Stage budgets: 5.5 / 2.5 / 0.5 -> fmax still 181 MHz (multiply stage). Latency: 3 cycles. Throughput: still 1/cycle. 10-beat burst: 10+3 = 13 cycles. The teaching point: stage 3 improved NOTHING (shift is free) — it is pure cost, the Design-C lesson applied; a real design would not cut there unless a future stage needed the boundary.',
      hints: [
        'A constant shift is wiring — its "cloud" is zero; the register still costs latency.',
        'Recompute fmax as the min over all three stages.',
        'Fill/drain: depth = number of register banks the beat crosses.',
      ],
    },
    practiceExercises: [
      {
        title: 'Beat audit',
        brief:
          'A colleague\'s pipeline shows y_o = 205 one cycle BEFORE valid_o asserts. Inspect this code and identify the defect: always @(posedge clk) begin y_q <= p_q + c_q; if (v1_q) v2_q <= 1\'b1; end — with v2_q never cleared elsewhere except reset.',
        expectedBehavior:
          'Two defects. (1) v2_q only ever sets — after the first real beat, valid_o stays high forever, so every output cycle (including bubbles) looks real: the consumer reads stale/garbage y_q during gaps. (2) The conditional capture (if (v1_q)) breaks the beat-integrity rule that data and valid register under the same conditions; the correct form is v2_q <= v1_q; unconditionally. Symptoms: results that never update after the first, or "new" outputs the consumer believes are beats.',
        hints: [
          'What happens to v2_q on a cycle where v1_q is 0?',
          'Compare with the reference pattern: v2_q <= v1_q; y_q <= p_q + c_q; both unconditional.',
          'Valid bits are datapath: they clear when the beat moves on.',
        ],
      },
      {
        title: 'Does it pay? Write the decision',
        brief:
          'For mac_pipe2 vs the unpipelined version, write the decision-record row: frequency, throughput, latency, area, and the verdict for two use cases — (a) a video pixel stream at 150 MHz pixel rate, (b) a control loop whose correction must reflect a 1-cycle-old error.',
        expectedBehavior:
          '(a) Stream: unpipelined caps at 133 MHz < 150 required; pipelined reaches 181 MHz — pipelining PAYS, latency irrelevant to a pixel stream. (b) Control loop: freshness spec demands 1-cycle-old error; pipelined latency is 2 — pipelining FAILS the spec regardless of frequency; either keep the unpipelined version (7.5 ns path — check it meets the loop\'s clock) or renegotiate the freshness requirement with evidence. Same transformation, opposite verdicts — the record must show all three numbers plus the use-case reasoning.',
        hints: [
          'Frequency is a requirement-driven number: compare against the target, not against "faster".',
          'Latency budgets kill pipelines that frequency numbers would justify.',
          'A verdict row always names the use case, never just the transformation.',
        ],
      },
    ],
    assessment: {
      title: '2-stage pipeline checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt:
            'In mac_pipe2, beat1 = (10,20,5) enters at c0 and beat2 = (3,4,1) at c1. What does y_o show at cycle 3?',
          code: 'p_q <= a_i * b_i;  c_q <= {8\'b0, c_i};  v1_q <= valid_i;\ny_q <= p_q + c_q;  v2_q <= v1_q;',
          options: ['205', '13', '200', '0'],
          answer: '13',
          explanation:
            'Edge c1->c2: y_q = 200+5 = 205 (beat1). Edge c2->c3: y_q = 12+1 = 13 (beat2). At cycle 3, y_o = 13 and valid_o is high (v2_q followed v1_q). One result per cycle, in order.',
          hint: 'Compute what each edge captures, cycle by cycle.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'What is the latency of a 100-beat burst through mac_pipe2, counted in cycles from first input to last output?',
          options: ['100', '101', '102', '200'],
          answer: '102',
          explanation:
            'N beats + depth D: the pipeline is full after 2 cycles, then produces one result per cycle for the remaining beats: 2 fill + 100 outputs = 102 cycles total. Effective burst throughput = 100/102.',
          hint: 'Fill cycles produce nothing; count them.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'The valid delay line must be registered exactly as many times as the data path, in the same always blocks under the same conditions.',
          answer: 'true',
          explanation:
            'Data and valid are one beat. Any depth or condition mismatch makes outputs assert early/late relative to their data — the classic silent corruption. Same block, same branch, same conditions.',
          hint: 'What does the consumer key on?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Give the three numbers a pipelining decision record must contain, and say which use-case property makes latency the deciding one.',
          answer:
            'Frequency (fmax), throughput (results per second), latency (cycles); latency decides when the consumer needs results within a freshness budget (control loops), while frequency/throughput decide for streams',
          explanation:
            'Pipelining trades latency for frequency at constant throughput; whether that trade pays depends entirely on whether the consumer is a stream or a freshness-constrained control path.',
          hint: 'Lesson 1\'s worksheet plus one cycle count.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt:
            'A pipeline\'s outputs are intermittently stale: y_o holds an old result while valid_o pulses. The stage-2 code is: always @(posedge clk) if (v1_q) begin y_q <= p_q + c_q; v2_q <= 1\'b1; end. What is wrong?',
          options: [
            'Nothing; gating both with v1_q is correct',
            'y_q only updates when v1_q is high, so after a bubble the old y_q re-presents with v2_q still set (v2_q never clears) — stale data presented as fresh',
            'p_q should be cleared when v1_q is low',
            'v2_q should be combinational',
          ],
          answer:
            'y_q only updates when v1_q is high, so after a bubble the old y_q re-presents with v2_q still set (v2_q never clears) — stale data presented as fresh',
          explanation:
            'The conditional capture desynchronizes the beat: during bubbles y_q freezes but v2_q stays high (it never clears), so the consumer accepts the old value again. Correct pattern: unconditional v2_q <= v1_q; y_q <= p_q + c_q; — valid drops naturally during bubbles.',
          hint: 'Trace a bubble cycle: what does the consumer see?',
          difficulty: 'hard',
        },
      ],
    },
    keyTerms: [
      { term: 'Beat', definition: 'The (data, valid) pair traveling together through the pipeline; the unit of integrity.' },
      { term: 'Stage register', definition: 'The register bank at a pipeline boundary holding one stage\'s results.' },
      { term: 'Fill phase', definition: 'The first `depth` cycles after reset or stream start, during which no outputs emerge.' },
      { term: 'Drain phase', definition: 'The `depth` cycles after the last input during which tail beats emerge.' },
      { term: 'Effective burst throughput', definition: 'N/(N+D) for N beats through depth D — the honest burst number.' },
      { term: 'Registered boundary', definition: 'Module outputs driven from registers; consumer timing independent of the producer\'s clouds.' },
    ],
    revisionSummary: [
      'Stage 1: multiply (5.5 ns budget); stage 2: add (2.5 ns); valid travels in lockstep — one beat, one path.',
      'Latency = register banks crossed (2); throughput = 1/cycle when full; burst of N takes N+D cycles.',
      'Beat integrity: same always block, same branch, same conditions for data and valid; outputs registered.',
      'Pipelining decision = (frequency, throughput, latency) triple vs use case; streams pay, freshness-limited control does not.',
      'The valid line is datapath: reset to 0, no conditional capture games.',
      'Tool-inserted internal pipelines (DSP macros) can shift beat timing — verify with a beat-gap-beat pattern.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Pipeline (computing)',
        url: 'https://en.wikipedia.org/wiki/Pipeline_(computing)',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Instruction pipelining (concepts transfer directly)',
        url: 'https://en.wikipedia.org/wiki/Instruction_pipelining',
        kind: 'article',
      },
    ],
    estimatedMinutes: 55,
  },
  {
    id: 'rtl-m06-l3',
    title: 'Stalls, Backpressure, and Flushes',
    summary:
      'Real consumers stall and real streams need cancelling. This lesson adds per-stage valid/ready to the pipeline, traces a stall cycle by cycle, propagates bubbles, and implements flushes — the last machinery a production pipeline needs.',
    objectives: [
      'Build a 2-stage pipeline with per-stage valid/ready handshake and no data loss under stalls.',
      'Trace stall and bubble propagation through a pipeline cycle by cycle.',
      'Implement a flush that discards in-flight beats safely.',
      'Explain why global stalls are a simplified tool and when per-stage handshakes are required.',
    ],
    whyItMatters:
      'Lesson 2\'s pipeline assumes the consumer always accepts — which is true of almost no real system. Memories stall, buses arbitrate, software is late. The machinery that keeps a pipeline correct under arbitrary stall patterns is per-stage valid/ready (module 05 lesson 3, applied per stage), and the machinery that discards wrong-path work is the flush. Almost every mysterious "pipeline hangs after a while" or "loses a beat under load" bug is one of these two mechanisms implemented half-way; this lesson builds both completely.',
    prerequisites: ['rtl-m06-l2', 'rtl-m05-l3'],
    explanation: [
      '**Per-stage handshakes** wrap every pipeline stage in the slice contract from module 05: each stage has a `full` bit (its valid), accepts when it can, and drains when its consumer accepts. Stage k\'s ready is: not full, or (full and stage k+1 accepting). Data advances only when the producing side offers and the consuming side accepts — and because acceptance is per-stage, a stall anywhere freezes everything upstream while everything downstream keeps draining. The rule that makes it loss-free: **the beat registers update only on acceptance**, never unconditionally.',
      '**A stall in slow motion**: stage 2 is full, the consumer drops ready. Stage 2 holds (its full bit stays, its data stays). Stage 1, full too, now sees its consumer (stage 2) not accepting, so stage 1 holds. The producer sees stage 1 not accepting (ready_o low) and holds valid_i and data. One ready deassertion froze the entire upstream in the same edge — backpressure propagating backward. When ready returns: stage 2 drains (consumer accepts), stage 1 refills stage 2 and accepts a new beat from the producer, all on the same edge — the drain-and-reload overlap from the slice, one stage at a time. Throughput recovers to 1/cycle immediately.',
      '**Bubbles** are the inverse: gaps in the input stream (valid_i low) travel forward. A bubble in stage 1 moves to stage 2 when stage 1 drains, and so on — valid bits go low stage by stage, one per cycle. Bubbles cost throughput (a gap in the input is a gap in the output, one cycle per stage later) but cost nothing else; the pipeline needs no special bubble hardware, only the discipline that valid travels with data. Performance-minded designs reduce bubble *creation* (supply valid every cycle); the pipeline itself neither creates nor destroys them.',
      '**Flushes** discard in-flight beats: on flush_i, every stage\'s valid bit clears (data can stay stale; it will be overwritten before it is valid again). Flush is the mechanism behind branch mispredicts, exception recovery and channel resets. Two rules make it safe: flush must clear ALL valid bits in the same edge (a partial flush leaves one stage\'s stale beat appearing real downstream), and flush must win over acceptance in the register enable priority (`if (flush) v <= 0; else if (accept) ...`). The data registers do not need clearing — correctness lives in the valid bits, which is also why flushed pipelines resume at full rate immediately (no refill wait beyond normal fill).',
      '**Global stalls** (one stall_i gating every stage\'s enable) are the simplified alternative: correct when all stages stall together, trivially simple, but they throw away the throughput of stages that could have kept working and they need careful valid bookkeeping at the boundary. Use them for small designs and for teaching; use per-stage handshakes whenever any stage has an independent consumer — which in practice means everything connected to a bus or memory. The course pattern: build global-stall versions to learn, replace with per-stage slices for production, and keep the slice (module 05) as the standard cell of the craft.',
    ].join('\n\n'),
    deepDive: [
      'Why does a stall freeze the whole upstream in one edge, while recovery drains stage by stage? Follow the ready chain: stage 2 not accepting makes stage 1\'s ready low, which makes the producer\'s ready low — the ready signal is computed combinationally from the consumer side backward, so a stall is *instantly* visible everywhere upstream. Valid and data, in contrast, travel forward through registers — one stage per cycle. This asymmetry (ready backward-combinational, data forward-registered) is exactly what rule 1 of the handshake (valid independent of ready) protects: the combinational ready chain stays loop-free because valid never feeds it. A ready chain that reads valid anywhere is the classic pipeline deadlock.',
      'Flush-and-refill accounting matters for real performance numbers. A flush discards `depth` beats worth of work (everything in flight) and the pipeline refills from the first new beat — total cost depth+1 cycles of lost throughput per flush event. This is why branch predictors exist (avoid the flush), why exceptions are expensive, and why flushing "just to be safe" in a design that flushes often dominates its power/performance budget. The design-level question is always: how often does the flush event occur? Once per configuration: free. Every few cycles: redesign the control so it does not.',
      'The per-stage slice composes to arbitrary depth mechanically — N stages = N slices chained — which is why the pattern scales in industry from 2-stage toy pipelines to 20-stage machines. What does NOT scale by composition is the *ready chain delay*: at depth N, the backward ready computation is N gates of combinational logic, and at some depth it becomes its own critical path (production designs pipeline the ready chain itself with credit-based schemes — counter-based "I have room for K more" instead of instantaneous ready). Know that the limit exists; you will meet it, named credits, in any high-performance interconnect.',
    ].join('\n\n'),
    examples: [
      {
        title: 'The 2-stage pipeline with per-stage handshake and flush',
        language: 'verilog',
        code: [
          '// mac_pipe2 with handshakes: per-stage valid/ready, no loss under',
          '// arbitrary stall patterns, plus a flush input.',
          '// Stage 1: multiply. Stage 2: add. Both stages: slice rules.',
          'module mac_pipe2_hs (',
          '    input  wire        clk,',
          '    input  wire        reset_n,',
          '    input  wire        flush_i,     // discard in-flight beats',
          '    // producer side',
          '    input  wire        valid_i,',
          '    input  wire [7:0]  a_i, b_i, c_i,',
          '    output wire        ready_o,',
          '    // consumer side',
          '    output wire        valid_o,',
          '    output wire [15:0] y_o,',
          '    input  wire        ready_i',
          ');',
          '    // Stage state.',
          '    reg        s1_full_q, s2_full_q;',
          '    reg [15:0] s1_p_q, s1_c_q;      // stage-1 beat payload',
          '    reg [15:0] s2_y_q;              // stage-2 beat payload',
          '',
          '    // Acceptance: a stage accepts if free, or draining this edge.',
          '    wire s2_accept = !s2_full_q || ready_i;',
          '    wire s1_accept = !s1_full_q || s2_accept;',
          '',
          '    wire s1_load = valid_i  && s1_accept;   // producer offers + room',
          '    wire s2_load = s1_full_q && s2_accept;  // s1 beats move forward',
          '',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) begin',
          '            s1_full_q <= 1\'b0;  s2_full_q <= 1\'b0;',
          '            s1_p_q <= 16\'d0;  s1_c_q <= 16\'d0;  s2_y_q <= 16\'d0;',
          '        end else if (flush_i) begin',
          '            s1_full_q <= 1\'b0;         // flush wins over everything:',
          '            s2_full_q <= 1\'b0;         // all valids clear in ONE edge',
          '        end else begin',
          '            s2_full_q <= s2_load;',
          '            if (s2_load) s2_y_q <= s1_p_q + s1_c_q;',
          '',
          '            s1_full_q <= s1_load;',
          '            if (s1_load) begin',
          '                s1_p_q <= a_i * b_i;',
          '                s1_c_q <= {8\'b0, c_i};',
          '            end',
          '        end',
          '    end',
          '',
          '    assign ready_o = s1_accept;',
          '    assign valid_o = s2_full_q;',
          '    assign y_o     = s2_y_q;',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Lines 21-22: acceptance is the slice rule generalized — a stage accepts when free or when it drains this edge. s1_accept reads s2_accept: the ready chain flows backward, combinationally, from the consumer.',
          'Lines 24-25: load conditions are offer AND acceptance, per stage. Registers update only when their stage loads — the loss-free guarantee.',
          'Lines 30-34: the flush branch clears both valid bits in one edge and takes priority over the load logic (else-if). Data registers keep stale values; correctness lives in the full bits.',
          'Stall trace (both stages full, ready_i drops): s2_accept=0, s1_accept=0, both loads 0: nothing updates; ready_o=0 holds the producer; valid_o=1 with s2_y_q stable. Consumer sees the held beat every cycle until it accepts.',
          'Recovery trace (ready_i rises after the stall): s2_accept=1 -> s2_load=1 (s2 drains: y transfers out) and s1_load = valid_i && 1 (s1 reloads from producer). Same edge: s2 refills from s1\'s beat while s1 accepts the next. Throughput back to 1/cycle instantly.',
          'Bubble trace (s2 full, consumer accepts, s1 empty, valid_i=0): s2_load = s1_full(0) && 1 = 0 -> s2 drains and its full bit clears; nothing refills. The bubble moved forward one stage. A stream gap reappears at the output one cycle per stage of depth later.',
          'Flush trace (flush_i for one cycle with beats in flight): both full bits clear; valid_o drops that cycle; ready_o = s1_accept = !0 || ... = 1 (stage empty, accepting). The next legitimate beat fills from scratch — no refill penalty beyond normal fill.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Stall, recovery, and flush on mac_pipe2_hs',
        content: [
          '         __    __    __    __    __    __    __    __    __',
          'clk   __|  |__|  |__|  |__|  |__|  |__|  |__|  |__|  |__|  |__',
          '        c0    c1    c2    c3    c4    c5    c6    c7    c8',
          '',
          'valid_i ==/‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\\___/‾‾‾',
          'ready_o ==/‾‾‾‾‾‾‾‾‾‾\\_______________/‾‾‾‾‾/‾‾‾‾‾‾‾',
          '          (c2: s2 full+s1 full, no drain -> stall)',
          'ready_i __________/‾‾‾\\_______________/‾‾‾‾‾‾‾‾‾‾‾',
          '                  (c3 accepts)  (c6 accepts again)',
          'flush  ______________________________/‾‾‾\\________',
          '                                     (c6: one-cycle flush)',
          '',
          'valid_o ________/‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\\____________',
          'y_o     =======X==r1=========X==r1==X===========',
          '                (held through stall c2-c5)  ^flush cleared',
          '',
          '  c0: beat1 loads s1. c1: beat1 -> s2 (r1 at output), beat2 -> s1.',
          '  c2-c5: stall. s2 holds r1; s1 holds beat2; producer holds beat3.',
          '  c6: flush_i: valids clear (r1 discarded); ready_o high.',
          '  c7: new beat loads; pipeline refills normally.',
        ].join('\n'),
        caption:
          'educational waveform (illustrative): the stall freezes data_o with valid_o high (held beat); the flush clears all valid bits in one edge and the producer refills immediately.',
      },
    ],
    tables: [
      {
        caption: 'Per-stage events and their effects (both stages full unless noted)',
        headers: ['Event this cycle', 's2 does', 's1 does', 'Producer sees'],
        rows: [
          ['ready_i=1 (drain)', 'transfers beat out', 'refills s2, accepts new beat', 'ready_o=1: may offer'],
          ['ready_i=0 (stall)', 'holds beat, valid_o=1', 'holds beat', 'ready_o=0: must hold valid/data'],
          ['valid_i=0 gap', 'drains if ready_i, bubble enters', 'bubble enters from producer', 'ready_o=1: gap accepted'],
          ['flush_i=1', 'valid cleared (beat discarded)', 'valid cleared', 'ready_o=1 next cycle'],
        ],
      },
      {
        caption: 'Global stall vs per-stage handshake',
        headers: ['Property', 'Global stall_i', 'Per-stage valid/ready'],
        rows: [
          ['Correctness under stalls', 'Correct (all stages freeze together)', 'Correct, per-stage'],
          ['Throughput under partial work', 'All-or-nothing: one stalled consumer freezes all', 'Downstream keeps draining during upstream stalls'],
          ['Complexity', 'One enable per register', 'Accept chains per stage'],
          ['Use when', 'Small blocks, one consumer domain', 'Any stage with an independent consumer; production default'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Gating the compute clouds but not the valid bits during a stall (or vice versa).',
        fix:
          'Stage state is the beat: valid and data must freeze together. Gate them with the same acceptance condition in the same always block. A valid that keeps advancing while data freezes presents stale beats as fresh — the corruption pattern from lesson 2\'s beat audit, now under stall conditions.',
      },
      {
        mistake: 'Clearing only some stages\' valid bits on flush.',
        fix:
          'A partial flush leaves the unflushed stage\'s stale beat looking real: it drains to the consumer as a genuine result. Flush clears every valid bit in the pipeline in one edge — one condition, all stages — and takes priority over acceptance in the enable structure.',
      },
      {
        mistake: 'Deriving a stage\'s ready from upstream valid ("I am ready only when you have something").',
        fix:
          'Ready must reflect only the stage\'s own capacity (free, or draining). Valid-dependent ready creates the combinational loop through the upstream stage\'s valid, and two such stages back-to-back deadlock — the module-05 rule 1 violation, now inside the pipeline. Ready = !full || downstream_accept.',
      },
    ],
    guidedPractice: {
      title: 'Three-stage handshake pipeline by composition',
      brief:
        'Chain three mac-style stages (or three vr_slices with a compute between) into a 3-deep pipeline. Derive the accept chain (s3_accept from ready_i; s2_accept from s3_accept; s1_accept from s2_accept; ready_o from s1_accept), state the ready-chain gate depth, and trace a 1-cycle stall at the consumer: which stages hold at which cycle, and how many cycles until a new beat reaches the output after recovery?',
      starterCode: [
        '// Stage acceptance (depth 3):',
        '//   s3_accept = !s3_full || ready_i;',
        '//   s2_accept = !s2_full || s3_accept;',
        '//   s1_accept = !s1_full || s2_accept;',
        '//   ready_o   = s1_accept;',
        '// Trace: all full, ready_i low for 1 cycle, then high.',
        '// Question: hold pattern, recovery, beat arrival latency.',
      ].join('\n'),
      expectedBehavior:
        'Hold: during the stall all three stages are full and nothing drains, so all accepts are 0 — everything freezes the same edge. Recovery: s3 drains (consumer accepts) while s2 refills it and s1 refills s2, producer refills s1 — all one edge (if the producer offers). A new beat offered at recovery reaches the output 3 cycles later (3 stages). Ready-chain depth: 2 levels of OR gates between ready_i and ready_o at depth 3 (grows linearly with depth — the credit-based schemes exist for when this becomes critical).',
      hints: [
        'Accept chains flow backward; loads flow forward; both resolve in the same edge.',
        'A new beat\'s arrival latency equals the pipeline depth (it must cross all stages).',
        'Count the gate levels in the accept chain as a function of depth.',
      ],
    },
    practiceExercises: [
      {
        title: 'Flush correctness audit',
        brief:
          'A colleague flushes by clearing s2_full_q only ("the visible stage"), reasoning that s1\'s beat will overwrite s2 anyway. Show the defect with a trace (flush at c0, s1 full with beat B, s2 full with beat A), then give the correct flush and the consumer-visible difference.',
        expectedBehavior:
          'Defect trace: c0 flush clears s2 only. c1: s2_full=0, but s1 still holds B and s1_accept is now 1 (s2 free) -> B moves to s2 at the c1 edge and presents as a REAL result — but B belonged to the cancelled work (e.g. a mispredicted path). The consumer receives a beat that should have been discarded. Correct flush clears both full bits in one edge: nothing in flight survives; the first post-flush beat is genuinely new.',
        hints: [
          'What is still in flight after a partial flush?',
          'Flush semantics: cancel ALL in-flight beats, not just the visible one.',
          'The consumer cannot distinguish stale-correct-looking beats from real ones — only the valid bits can.',
        ],
      },
      {
        title: 'Throughput under a duty-cycled consumer',
        brief:
          'A consumer accepts 1 cycle in 4 (ready_i high every 4th cycle). Compute mac_pipe2_hs\'s sustained output rate and the average queue depth needed in the two stages, then state what happens to beats when the pipeline is full and the producer keeps offering.',
        expectedBehavior:
          'Steady state: output rate = consumer rate = 1 beat per 4 cycles (the pipeline cannot exceed its slowest consumer). The two stages park 2 beats; the producer must hold the rest (its own backpressure). No beats are lost — the handshake holds them. Average occupancy: both stages full most of the time (they fill immediately after each drain and wait). The design-level follow-up: if the producer cannot hold beats, the pipeline needs deeper buffering (FIFO) — a sizing question, not a correctness one.',
        hints: [
          'Throughput is bounded by the consumer in steady state.',
          'Parked beats live in stage registers and the producer\'s held valid.',
          'When parking is not enough, the fix is buffering depth, not handshake changes.',
        ],
      },
    ],
    assessment: {
      title: 'Stall and flush checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'When a full pipeline\'s consumer drops ready, what freezes and how fast?',
          options: [
            'Only the last stage; upstream keeps running into it',
            'Everything upstream, in the same edge — the ready chain is combinational and flows backward',
            'Everything, after one cycle per stage',
            'Nothing; beats are dropped instead',
          ],
          answer:
            'Everything upstream, in the same edge — the ready chain is combinational and flows backward',
          explanation:
            'Ready is computed backward through the accept chain, so a stall is instantly visible to all upstream stages and the producer. Valid/data flow forward through registers; ready flows backward through combinational logic.',
          hint: 'Ready is not registered — how far does it reach?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt:
            'In mac_pipe2_hs: s2_full_q=1 (holding result r), ready_i=1, s1_full_q=0, valid_i=0. What does s2_full_q become at the edge?',
          code: 'wire s2_accept = !s2_full_q || ready_i;   // = 1\nwire s2_load   = s1_full_q && s2_accept;  // = 0\ns2_full_q <= s2_load;',
          options: ['1 (r stays)', '0 (r drains, bubble enters)', 'x', 'It toggles'],
          answer: '0 (r drains, bubble enters)',
          explanation:
            's2 transfers r to the consumer (ready_i=1) but nothing refills it (s1 empty, no input), so its full bit clears: the input gap has become an output gap one stage later — bubble propagation.',
          hint: 's2_load is 0; the full bit follows the load.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'bug-identification',
          prompt:
            'Which flush implementation is correct?',
          options: [
            'if (flush_i) s2_full_q <= 1\'b0;   // clear the output stage',
            'if (flush_i) begin s1_full_q <= 1\'b0; s2_full_q <= 1\'b0; end placed with priority over the load logic',
            'if (flush_i) y_q <= 16\'d0;          // clear the data',
            'if (flush_i) ready_i <= 1\'b0;       // block the consumer',
          ],
          answer:
            'if (flush_i) begin s1_full_q <= 1\'b0; s2_full_q <= 1\'b0; end placed with priority over the load logic',
          explanation:
            'Flush cancels all in-flight beats by clearing every valid bit in one edge, with priority over acceptance. Clearing data is unnecessary (correctness lives in valid bits); clearing one stage leaves beats in flight; blocking the consumer does not discard anything.',
          hint: 'What defines a beat as real?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt:
            'After a flush, a pipeline needs several cycles of refill before it can accept new work at full rate.',
          answer: 'false',
          explanation:
            'Flush empties the valid bits; the stages are all "free", so ready_o is high immediately and the first new beat propagates at normal fill speed. The cost of a flush is the discarded in-flight work plus normal fill — there is no extra recovery mode.',
          hint: 'Compare the post-flush state with the post-reset state.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt:
            'State the condition that makes a stage accept a new beat, and the priority between flush and acceptance in the register enables.',
          answer:
            'A stage accepts when it is free (!full) or when it is draining this edge (its consumer accepts); flush has priority — if flush_i is high, all valid bits clear and load logic is skipped',
          explanation:
            'Acceptance = !full || downstream_accept is the slice rule generalized; flush-over-accept guarantees a flush edge discards everything without racing a simultaneous load.',
          hint: 'Two conditions, one priority decision.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Per-stage handshake', definition: 'Each pipeline stage wrapped in valid/ready slice rules; acceptance computed per stage.' },
      { term: 'Accept chain', definition: 'The backward combinational chain: stage k accepts if free or if stage k+1 accepts.' },
      { term: 'Bubble', definition: 'A gap (invalid beat) propagating forward one stage per cycle; costs throughput, nothing else.' },
      { term: 'Flush', definition: 'One-edge clearing of all pipeline valid bits, discarding in-flight beats; priority over acceptance.' },
      { term: 'Global stall', definition: 'A single stall signal gating every stage\'s enable; simple, correct, throughput-blunt.' },
      { term: 'Credit-based flow control', definition: 'Counter-based room signalling replacing long ready chains in deep pipelines.' },
    ],
    revisionSummary: [
      'Per-stage rules: registers update only on acceptance; accept = !full || downstream accepts; ready chain flows backward combinationally.',
      'Stall freezes all upstream in one edge; recovery drain-and-reloads stage by stage, back to 1/cycle instantly.',
      'Bubbles propagate forward one stage per cycle; the pipeline neither creates nor destroys them.',
      'Flush clears ALL valid bits in one edge, priority over loads; data registers stay stale harmlessly; no refill penalty.',
      'Global stalls are the teaching version; per-stage slices are the production pattern.',
      'Deep pipelines eventually need credit-based flow control when the ready chain becomes critical.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Pipeline (computing)',
        url: 'https://en.wikipedia.org/wiki/Pipeline_(computing)',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Classic RISC pipeline (stall/flush in practice)',
        url: 'https://en.wikipedia.org/wiki/Classic_RISC_pipeline',
        kind: 'article',
      },
    ],
    estimatedMinutes: 55,
  },
];
