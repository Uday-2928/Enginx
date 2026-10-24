import type { TutorialLesson } from '../types';

/**
 * Module 07 — Clocking & Reset Strategy.
 * Reset choices (sync/async, hybrid assert/deassert), clock enables vs gated
 * and derived clocks, and clock-domain-crossing concepts: metastability,
 * 2-FF synchronizers, and why multi-bit buses need handshakes or gray code.
 * Unsafe CDC is presented only as an anti-pattern, never as practice.
 */

export const module07Lessons: TutorialLesson[] = [
  {
    id: 'rtl-m07-l1',
    title: 'Reset Strategy: Sync, Async, and the Hybrid Pattern',
    summary:
      'Synchronous and asynchronous resets trade different hazards. The industry-standard resolution — asynchronous assertion, synchronized deassertion via a reset synchronizer — gets both right, and is the course default.',
    objectives: [
      'Compare synchronous and asynchronous resets across assertion, release, area and timing effects.',
      'Implement the reset synchronizer (async assert, sync deassert) and trace its release timing.',
      'Explain recovery and removal checks in concept terms and where they apply.',
      'Choose a reset strategy for a block and document it as part of the register list.',
    ],
    whyItMatters:
      'Reset is the one signal that touches every flip-flop, so reset strategy errors are design-wide: an unsynchronized release can corrupt random registers after power-up (a bug that reproduces once a month), a clockless async assertion is the only thing that works before clocks start, and the wrong choice silently doubles area in reset routing. The hybrid pattern resolves the trade-off so cleanly that most design houses mandate it — making it the correct default until a spec forces otherwise.',
    prerequisites: ['rtl-m03-l1', 'rtl-m06-l1'],
    explanation: [
      'A **synchronous reset** is data: `always @(posedge clk) if (!reset_n) q <= 0; else q <= d;`. The reset is just another input to the D-path mux, so assertion requires an active clock, and release is inherently synchronized — the register can only sample the reset on a clean clock edge. Its costs: if the clock is not running (power-up, clock failure), the design cannot be reset; the reset signal fans into the logic cone of every register (adding delay to every data path that can be reset); and a reset pulse shorter than a cycle is simply missed.',
      'An **asynchronous reset** is an edge: `always @(posedge clk or negedge reset_n) if (!reset_n) q <= 0; else q <= d;`. The reset drives the flip-flop\'s dedicated asynchronous clear pin, so assertion is immediate and clock-independent — the only way to force a known state before clocks exist, and the only cheap way to reset deep logic whose clock is not yet stable. Its hazard is the **release**: if reset_n rises arbitrarily close to a clock edge, some registers may see it before the edge (and sample data) while others see it after (and stay reset for a cycle) — recovery/removal violations that produce inconsistent initial state across the design. This hazard is why async reset is never used "bare" in production.',
      'The **hybrid pattern — asynchronous assertion, synchronous deassertion** — takes each side\'s strength. The board/system reset asserts asynchronously (instant, clock-independent). A tiny **reset synchronizer** per clock domain qualifies the *release*: the deassertion travels through two flip-flops clocked by the domain\'s clock, so every register in the domain sees reset release on the same, clean clock edge. You get clockless assertion for free and a synchronized, edge-aligned release — the best of both. The synchronizer is three lines of RTL and belongs at the top of every clock domain.',
      '**Recovery and removal** are the checks that formalize the release hazard: recovery is the time an async reset must be *deasserted before* the clock edge (like setup, for leaving reset), removal the time it must stay *asserted after* the edge (like hold). Timing tools check them on any path into an async reset pin — which is precisely the path the synchronizer domesticates: its first flip-flop may itself go metastable if the external release lands badly, but the second flip-flop gives one full cycle of settle time before the (now clean) reset_n_sync fans out. The synchronizer\'s own flops are exempted from the functional reset fanout — they are reset only by the raw asynchronous input.',
      'Strategy is a **per-domain, documented decision**: the register list (module 02) states for each domain the reset source (raw pin or synchronizer output), polarity (active-low reset_n in this course), and which registers reset (all, by default; explicit exceptions only). The default for every module in this course is the hybrid pattern. Deviations are deliberate: a purely synchronous reset when the spec demands glitch filtering on the reset line; an unsynchronized local reset only for specialized cells (like the synchronizer itself) with a written justification.',
    ].join('\n\n'),
    deepDive: [
      'Why does the synchronizer use two flip-flops and not one? Because the first flip-flop samples an asynchronous event (the external reset release) and can go metastable — its output hovering between levels for an unbounded (but statistically short) time. The second flip-flop samples it one full clock later, giving the metastability a cycle to resolve to a solid level. One more flip-flop adds another cycle of settle margin (and one cycle of release latency — reset release arrives one cycle later per stage); high-reliability designs use three. The general shape — sample an async event, wait, sample again — is exactly the 2-FF synchronizer of lesson 3; reset is simply the most common thing synchronized.',
      'The assertion path stays asynchronous by design, which has a consequence worth internalizing: reset *assertion* timing is not analyzed as a data path at all (it goes to clear pins), but the *assertion* must still reach every register — which makes reset routing a physical-design matter (trees, buffers, and eventually reset ordering between domains). At RTL time the honest scope is: choose the pattern, wire the synchronizer, and record which registers reset. Everything about trees and skew belongs to the backend, and the RTL job is to not make that job harder (e.g., no local resets invented per-module that fragment the tree).',
      'Reset ordering between domains is a system-level corner worth naming even at concept level: if domain A\'s logic watches domain B\'s outputs, and B comes out of reset later than A (different synchronizer latencies, different clock frequencies), A may consume B\'s not-yet-reset outputs. The design answers are release-order control (reset one domain, then the next, in the spec\'s order) and handshake-on-release (A waits for a B-valid signal). At minimum, the spec must say whether simultaneous release is required — a cross-domain corner that is invisible in single-domain thinking and embarrassing at integration.',
    ].join('\n\n'),
    examples: [
      {
        title: 'The reset synchronizer (async assert, sync deassert)',
        language: 'verilog',
        code: [
          '// Reset synchronizer: one per clock domain.',
          '//   ASSERTION: asynchronous (immediate, needs no clock).',
          '//   RELEASE:   synchronized to clk (all downstream registers',
          '//              leave reset on the same clean clock edge).',
          'module reset_sync (',
          '    input  wire clk,             // destination-domain clock',
          '    input  wire reset_n_in,      // raw system reset, async, active-low',
          '    output wire reset_n_out      // synchronized release, same polarity',
          ');',
          '    reg sync_meta_q;   // may go metastable on a bad release edge',
          '    reg sync_q;        // one cycle of settle margin',
          '',
          '    always @(posedge clk or negedge reset_n_in) begin',
          '        if (!reset_n_in) begin',
          '            sync_meta_q <= 1\'b0;    // async assert: both flops drop',
          '            sync_q      <= 1\'b0;    // immediately, no clock needed',
          '        end else begin',
          '            sync_meta_q <= 1\'b1;    // release: walk a 1 through',
          '            sync_q      <= sync_meta_q;',
          '        end',
          '    end',
          '',
          '    assign reset_n_out = sync_q;',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Line 12: the sensitivity list has the RAW reset (reset_n_in), not the synchronized one — these flops are the boundary between the async world and the domain, and only they may be reset asynchronously.',
          'Assertion trace: reset_n_in drops at any instant -> both flops clear immediately (async clear pins), so reset_n_out = 0 within the flip-flop\'s clear delay, whether or not the clock is running.',
          'Release trace: reset_n_in rises between edges. Edge 1: sync_meta_q <= 1 (it may be metastable if the release was too close to this edge — that is its job). Edge 2: sync_q <= 1 — reset_n_out rises on a clean clock edge, two edges after the release attempt, and every downstream register sees the same rising edge.',
          'The two flops are the entire cost of the pattern; the one-cycle release latency is almost always acceptable and is part of the domain\'s documented reset timing.',
          'Usage: instantiate one reset_sync per clock domain; the domain\'s functional registers all use reset_n_out in their standard template. The raw reset_n_in is used ONLY inside synchronizers.',
        ],
      },
      {
        title: 'The same register, all three reset styles, side by side',
        language: 'verilog',
        code: [
          '// (a) ASYNC reset (raw, used only where the spec demands it):',
          'always @(posedge clk or negedge reset_n) begin',
          '    if (!reset_n) acc_q <= 8\'d0;',
          '    else          acc_q <= acc_q + data_i;',
          'end',
          '// Assertion: immediate. Release: UNSYNCED -> recovery/removal risk.',
          '',
          '// (b) SYNC reset (reset is data):',
          'always @(posedge clk) begin',
          '    if (!reset_n) acc_q <= 8\'d0;',
          '    else          acc_q <= acc_q + data_i;',
          'end',
          '// Release: clean. Assertion: needs a running clock; reset sits',
          '// in every data path (bigger muxes, longer paths).',
          '',
          '// (c) HYBRID, the course default: async assert, sync release.',
          '//     Functional logic consumes reset_n_out of a reset_sync.',
          'reset_sync u_rst (',
          '    .clk         (clk),',
          '    .reset_n_in  (board_reset_n),',
          '    .reset_n_out (reset_n)',
          ');',
          'always @(posedge clk or negedge reset_n) begin',
          '    if (!reset_n)    acc_q <= 8\'d0;   // looks like (a), but reset_n',
          '    else             acc_q <= acc_q + data_i;  // is domain-synchronized',
          'end',
        ].join('\n'),
        explanation: [
          '(a) is what the template looks like everywhere in this course — the point of this lesson is that its reset_n is, in production, the OUTPUT of a reset_sync, so the release is synchronized even though the code reads as plain async.',
          '(b) shows the sync-reset costs concretely: the reset feeds the D mux (data path), so every resettable register\'s path grows; and with the clock stopped, nothing resets.',
          '(c) is the standard composition: the RTL text is unchanged from (a); the *reset source* changes. That is the whole deployment story of the hybrid pattern — the module template stays identical, the top level adds one synchronizer per domain.',
          'The register-list discipline (module 02) records the choice per domain: source = board_reset_n through reset_sync, polarity active-low, all registers reset.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Reset synchronizer release timing',
        content: [
          '              _______________',
          'reset_n_in __/               \\_________________  <- raw, async edges',
          '                     (release between edges)',
          '',
          '           __    __    __    __    __    __    __',
          'clk     __|  |__|  |__|  |__|  |__|  |__|  |__|  |__',
          '              e0    e1    e2    e3    e4',
          '',
          '                ______________________',
          'sync_meta_q __/                        \\______  <- set at e1',
          '                      ______________________',
          'sync_q      ________/                       \\__  <- set at e2',
          '',
          'reset_n_out (== sync_q) rises at e2: a clean clock edge,',
          'two edges after the raw release. Every downstream register',
          'leaves reset on this same edge -> consistent initial state.',
          '',
          'Assertion (not shown): reset_n_in low -> sync_q low at once,',
          'no clock required (async clear pins).',
        ].join('\n'),
        caption:
          'educational waveform (illustrative): assertion is immediate and clock-independent; release walks through two flops and arrives on a clean clock edge.',
      },
      {
        kind: 'block',
        title: 'Domain reset architecture',
        content: [
          '                       board_reset_n (raw, async)',
          '                            |',
          '            +---------------+---------------+',
          '            |                               |',
          '      +-----+------+                  +-----+------+',
          '      | reset_sync |                  | reset_sync |',
          '      | (clk A)    |                  | (clk B)    |',
          '      +-----+------+                  +-----+------+',
          '            | reset_n_A                      | reset_n_B',
          '      [domain A registers]            [domain B registers]',
          '         (all use reset_n_A)            (all use reset_n_B)',
          '',
          '  Rules:',
          '   - one synchronizer per clock domain',
          '   - functional registers NEVER see the raw reset',
          '   - raw reset reaches ONLY synchronizer flops',
          '   - release order between domains: a spec decision (m07-l1',
          '     deep dive) — document it',
        ].join('\n'),
        caption:
          'The hybrid pattern deployed: raw async reset at the boundary, synchronized release per domain, one template for all functional registers.',
      },
    ],
    tables: [
      {
        caption: 'Synchronous vs asynchronous reset',
        headers: ['Property', 'Synchronous reset', 'Asynchronous reset (raw)'],
        rows: [
          ['Assertion', 'Needs a running clock', 'Immediate, clock-independent'],
          ['Release', 'Inherently synchronized', 'Unsynchronized: recovery/removal hazard'],
          ['Data-path impact', 'Reset muxes in every data path', 'None (dedicated clear pin)'],
          ['Glitch filtering', 'Filters short pulses', 'Any pulse asserts reset'],
          ['Works before clocks start', 'No', 'Yes'],
          ['Area (reset routing)', 'Grows with logic cone', 'Dedicated pin routing (tree)'],
          ['Production usage', 'By spec demand', 'Always via a reset synchronizer'],
        ],
      },
      {
        caption: 'The hybrid pattern (course default) at a glance',
        headers: ['Aspect', 'Choice', 'Why'],
        rows: [
          ['Assertion', 'Asynchronous', 'Works with no clock; instant'],
          ['Deassertion', 'Synchronized (2 FFs per domain)', 'Same clean edge for every register; no recovery hazard'],
          ['Cost', '2 FFs + 1 cycle release latency per domain', 'Trivial vs the failure it prevents'],
          ['RTL template', 'Unchanged (async style)', 'Only the reset source differs'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using a raw asynchronous reset on all functional registers with no synchronizer.',
        fix:
          'The release lands at a different clock phase relative to every register\'s routing — some registers leave reset a cycle early, some late, some metastable. The hybrid pattern costs two flops per domain and removes the entire failure class. Raw reset is only for the synchronizer\'s own flops.',
      },
      {
        mistake: 'Synchronizing the reset but keeping different reset sources per module (some raw, some synchronized).',
        fix:
          'Modules released from different reset edges have inconsistent initial state relative to each other — the corruption reappears as "random" boot failures. One synchronizer per domain, one reset_n per domain, every functional register on it. Local resets need a written reason in the decision log.',
      },
      {
        mistake: 'Resetting a synchronizer\'s flops from its own synchronized output (circular reset).',
        fix:
          'reset_sync\'s flops take the RAW reset in their sensitivity list and reset branch. A synchronizer reset by its own output cannot guarantee recovery when that output is stuck (the classic bootstrap deadlock). Raw in, synchronized out — no exceptions.',
      },
    ],
    guidedPractice: {
      title: 'Three-stage synchronizer and release latency',
      brief:
        'Modify reset_sync to use three flops (sync_meta_q, sync_mid_q, sync_q). Trace the release timeline (raw release between edges e0 and e1): at which edge does reset_n_out rise? State what the third flop buys and what it costs, and when a design would justify it.',
      starterCode: [
        '// Three-stage reset synchronizer:',
        '//   always @(posedge clk or negedge reset_n_in)',
        '//     if (!reset_n_in) begin meta<=0; mid<=0; out_flop<=0; end',
        '//     else begin meta<=1; mid<=meta; out_flop<=mid; end',
        '// assign reset_n_out = out_flop;',
        '// Trace release: raw release between e0 and e1.',
      ].join('\n'),
      expectedBehavior:
        'Edge e1: meta <= 1. Edge e2: mid <= 1. Edge e3: out_flop <= 1 -> reset_n_out rises at e3, three edges after the raw release. The third flop buys another full cycle of metastability settle time (and further isolates the fanout point from the metastable flop). Cost: one more flop and one more cycle of release latency. Justification: high-reliability/radiation environments, or very fast clocks where one cycle of settle time leaves insufficient MTBF margin.',
      hints: [
        'The 1 walks one flop per edge; count the edges to the output flop.',
        'Settle margin is measured in cycles of the destination clock.',
        'Latency budget: reset release delay is part of boot timing specs.',
      ],
    },
    practiceExercises: [
      {
        title: 'Choose and document the reset',
        brief:
          'A new block has two clock domains: clk_sys (100 MHz, always running before use) and clk_adc (a sampling clock that starts after system boot). Write the reset architecture decision: synchronizer per domain, reset sources, and the release-order requirement between domains (which must come out of reset first, and how the other side knows).',
        expectedBehavior:
          'Both domains get their own reset_sync instance (one per clock). clk_sys releases from board_reset_n directly; clk_adc\'s release is additionally gated by a system-ready signal so the ADC domain leaves reset only after clk_sys is up and its outputs are valid (release-order control). The clk_sys side sees an adc_ready_toggle (lesson 3\'s synchronizer) before using ADC data — "how the other side knows" is a synchronized handshake flag, not a hope. Documented in the decision log: D-reset-1 (per-domain sync), D-reset-2 (release order sys before adc), D-reset-3 (adc_ready handshake).',
        hints: [
          'One synchronizer per domain is the floor; gating adds release order.',
          'Cross-domain knowledge always crosses through a synchronizer.',
          'Every decision gets a row in the log, not just a comment.',
        ],
      },
      {
        title: 'Diagnose the boot bug',
        brief:
          'A design boots correctly 99% of the time; occasionally one datapath register starts nonzero despite a reset branch. The register uses raw async reset like every other. Suggest the two most likely root causes and the artifact each would show up in.',
        expectedBehavior:
          '(1) Unsynchronized reset release: the raw reset_n deassertion lands at different times relative to the clock at different registers (routing skew); this register\'s release violates recovery — shown in timing as a recovery/removal violation, or in simulation only with realistic (asynchronous) reset timing. (2) The register\'s reset branch exists but the value is corrupted between release and first use by an unreset upstream register (x or stale) — shown by tracing the datapath\'s first-value provenance. Fix for (1): reset synchronizer (hybrid pattern); for (2): complete the reset audit. Both are found by the boot-corner test in the verification plan.',
        hints: [
          'The failure is boot-specific and rare — what is special about boot?',
          'Raw async release timing vs clock phase is the classic suspect.',
          'A register can be correctly reset and still start "wrong" if its first sampled value comes from unreset logic.',
        ],
      },
    ],
    assessment: {
      title: 'Reset strategy checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'What is the hybrid reset pattern?',
          options: [
            'Synchronous assertion, asynchronous release',
            'Asynchronous assertion, synchronous release via a reset synchronizer',
            'Half the registers async, half sync',
            'Two resets combined with AND',
          ],
          answer: 'Asynchronous assertion, synchronous release via a reset synchronizer',
          explanation:
            'Assertion keeps the async benefits (clock-independent, immediate); release passes through two flops so all registers leave reset on the same clean edge. It is the course default and most production flows\' mandate.',
          hint: 'Each half of the reset event uses the style that handles it best.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'In the reset synchronizer, which flops may legally take the RAW reset?',
          options: [
            'All functional registers in the domain',
            'Only the synchronizer\'s own flops',
            'The synchronizer\'s second flop only',
            'None; the raw reset is unused',
          ],
          answer: 'Only the synchronizer\'s own flops',
          explanation:
            'Functional registers consume the synchronized output. The synchronizer flops themselves are the boundary: they are reset by the raw async input and would deadlock if reset by their own output.',
          hint: 'What would happen if the synchronizer reset from its own output?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'A synchronous reset requires a running clock to assert.',
          answer: 'true',
          explanation:
            'The sync reset is data sampled at the clock edge; no edge, no reset. That is exactly why designs that must be resettable before clocks start (or whose clocks may fail) use async assertion.',
          hint: 'Where does the sync reset enter the flip-flop?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Name the two timing checks that guard an asynchronous reset release, and say in one line what each requires.',
          answer:
            'Recovery: the deassertion must happen early enough before the clock edge (setup-like); removal: the assertion must persist long enough after the edge (hold-like)',
          explanation:
            'They are the async-reset analogues of setup/hold, applied at the clear pin. The reset synchronizer\'s second flop is what turns a potentially violating release into a clean, edge-aligned one.',
          hint: 'One is about leaving reset, one about entering it.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt:
            'A design occasionally boots with inconsistent state across modules. Inspection shows each module instantiated its own reset_sync, but module B\'s reset comes from module A\'s synchronizer output (chained), while module C uses its own. What is wrong?',
          options: [
            'Nothing; chaining synchronizers is the recommended hierarchy',
            'Modules B and C leave reset on different clock edges relative to each other; every functional register in a domain must share ONE synchronizer output (with release order handled explicitly if needed)',
            'The synchronizers need three flops',
            'The raw reset is too fast',
          ],
          answer:
            'Modules B and C leave reset on different clock edges relative to each other; every functional register in a domain must share ONE synchronizer output (with release order handled explicitly if needed)',
          explanation:
            'One domain, one synchronizer, one release edge. Chained or parallel synchronizers shift release timing between consumers; if cross-module ordering matters, it is a designed release-order mechanism, not an accident of reset sourcing.',
          hint: 'Which registers must see the same release edge?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Synchronous reset', definition: 'Reset as data, sampled at the clock edge; needs a running clock, release inherently clean.' },
      { term: 'Asynchronous reset', definition: 'Reset to the flip-flop clear pin; immediate assertion, unqualified release hazard.' },
      { term: 'Reset synchronizer', definition: 'Two (or three) flops that present reset release to a domain on a clean clock edge.' },
      { term: 'Hybrid pattern', definition: 'Async assertion + synchronized deassertion; the course and industry default.' },
      { term: 'Recovery / removal', definition: 'Setup/hold-like checks on the async reset release/assertion relative to the clock edge.' },
      { term: 'Release order', definition: 'The designed sequence in which multiple domains leave reset; a spec decision.' },
    ],
    revisionSummary: [
      'Sync reset: release clean, assertion needs a clock, reset lives in every data path.',
      'Async reset: assertion instant and clock-free, release hazardous (recovery/removal).',
      'Hybrid default: async assert + 2-FF reset synchronizer per domain; functional registers never see the raw reset.',
      'The synchronizer\'s flops are the only ones reset by the raw signal.',
      'Release latency = synchronizer depth (1 cycle per extra flop); third flops for high-reliability.',
      'Multi-domain: one synchronizer per domain plus a documented release order and, where needed, a release handshake.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Power-on reset',
        url: 'https://en.wikipedia.org/wiki/Power-on_reset',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Flip-flop (electronics)',
        url: 'https://en.wikipedia.org/wiki/Flip-flop_(electronics)',
        kind: 'article',
      },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'rtl-m07-l2',
    title: 'Clock Enables, Gated Clocks, and Derived Clocks',
    summary:
      'Run logic slower without creating a second clock: the clock-enable pattern is the safe idiom; hand-built gated and divided clocks are the classic disasters. This lesson draws the line firmly and shows what each anti-pattern costs.',
    objectives: [
      'Implement clock enables for slower-rate logic and multi-cycle operations.',
      'Explain why hand-typed gated clocks break skew, timing and CDC analysis.',
      'Recognize derived (divided) clocks as hidden CDC and replace them with enables.',
      'Identify the legitimate tool-managed exception (integrated clock-gating cells) and its owner.',
    ],
    whyItMatters:
      'Almost every design needs some logic to run slower than the master clock — a 1 kHz debounce in a 100 MHz system, a once-per-frame update in a pixel pipeline. The enable pattern does this inside one clean clock domain. The alternative — gating or dividing the clock itself — creates skew, unanalyzable timing, and hidden cross-domain paths, and it is the single most common self-inflicted wound in student and hobbyist RTL. Knowing exactly why the anti-patterns fail is what makes the enable habit stick.',
    prerequisites: ['rtl-m07-l1', 'rtl-m03-l1'],
    explanation: [
      'The **clock enable (CE) pattern** keeps one clock and qualifies the data: a small divider register produces a single-cycle enable tick at the slower rate, and consumer registers use `else if (en)` — the enable mux idiom from module 03. The slow logic still clocks on every edge; it just transfers on fewer of them. Everything stays in one clock domain: one clock tree, uniform timing analysis, no CDC anywhere. The cost per consumer register is one mux input — essentially free compared to any alternative.',
      'A **gated clock** (`assign gclk = clk & en;`) attempts the same thing by chopping the clock itself. The failures are structural. **Glitches**: `en` changing near a clk edge produces runt pulses on gclk — a clock that asserts at the wrong times, double-capturing or missing captures unpredictably. **Skew**: the AND gate sits in the clock path of everything downstream, adding delay that the clock tree did not budget; two gated branches with different enable loads skew against each other. **Analysis**: every register on gclk is effectively in a new clock domain with an unspecified relationship to clk — cross-path timing between gated and ungated logic is now a CDC problem nobody designed. The idiom is unsafe even when it appears to work in simulation.',
      'A **derived clock** (`assign clk_div2 = div_q[0];` used as a register clock) is a gated clock with extra steps and is worse: the divided clock comes out of a flip-flop — its edges are data-transition-timed, its tree is nonexistent (registers clocked by a Q output get whatever routing delay that net has), and every path between the divided domain and the main domain is a true CDC with an unmanaged relationship. Meanwhile the **enable version of the same divide-by-2** is three lines, stays in one domain, and timing tools handle every path natively. There is no behaviour the divided clock achieves that the enable does not, except being harder to analyze.',
      'The **legitimate exception** exists and belongs to the physical world: **integrated clock-gating cells (ICGs)** — library primitives that latch the enable cleanly against the clock and gate with zero glitch — inserted by **power tools during synthesis**, not hand-typed by designers. They save real clock-tree power (gating the tree, not just the data). The division of labour matters: the RTL writes enables (`else if (en)`), the tool recognizes enable-idle patterns and swaps in ICGs where power analysis says so. A designer who hand-gates is doing the tool\'s job with worse primitives and no analysis.',
      'The **decision record** for this lesson is short but mandatory: one clock per domain; slower-rate logic via enables; enables generated by explicit counters or FSM states, named (`tick_1k`, `frame_en`); no clock signal appears in any assign or any right-hand side anywhere in design code — the mechanical lint check that enforces the whole policy. When a spec genuinely requires a second clock (a real interface clock from outside), it arrives as a new domain with the full CDC treatment of lesson 3 — never as a locally divided copy of an existing one.',
    ].join('\n\n'),
    deepDive: [
      'The enable-tick generator deserves a template of its own because it is a frequent hang-up. A modulo-N counter produces a one-cycle tick every N cycles: `div_q <= (div_q == N-1) ? 0 : div_q + 1; tick = (div_q == N-1);` — the tick is combinational from the counter and high for exactly one clock. Consumers sample on it. Two traps: the tick must be registered (or provably glitch-free — a counter compare is, but lint prefers registered enables for fanout), and consumers must not accumulate across missed ticks unless the spec says so (a once-per-1k-tick update that skips when the tick collides with another enable is a priority-structure question, module 03 lesson 1).',
      'Why is a glitch on a clock so much worse than a glitch on data? Because every register samples the clock edge — a data glitch corrupts one value if it survives to setup; a clock glitch *is* an extra clock edge, capturing whatever happens to be on every D input at that instant. And clock glitches recur: the enable timing that created one will create more. This asymmetry is the deep reason clock signals are sacred: they are the one signal class whose errors replicate across the entire design in a single event.',
      'Multi-rate pipelines (a 100 MHz datapath with a 25 MHz control plane) are the legitimate use case for enables at scale, and they have one design rule worth stating: choose the rate relationship as a power of two with an explicit tick generator per rate, and make each rate\'s registers a clearly bounded set (naming convention: `_slow_q` or a rate suffix) so reviews can verify that no fast-path register accidentally uses a slow enable (that would be a functional bug — data changing at the wrong rate) and no slow register uses a fast enable (harmless but confusing). The clock-domain map of the architecture artifact lists rates, not clocks.',
    ].join('\n\n'),
    examples: [
      {
        title: 'The enable pattern: a 1-of-4 tick and its consumers',
        language: 'verilog',
        code: [
          '// One clock domain (clk). Slower-rate logic via clock enables.',
          'module ce_div4 (',
          '    input  wire       clk,',
          '    input  wire       reset_n,',
          '    input  wire [7:0] data_i,',
          '    output reg  [7:0] slow_q,      // updates every 4th cycle',
          '    output wire       tick4_o      // 1-cycle enable, every 4 cycles',
          ');',
          '    // Rate generator: modulo-4 counter + compare.',
          '    reg [1:0] div_q;',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) div_q <= 2\'d0;',
          '        else          div_q <= (div_q == 2\'d3) ? 2\'d0 : div_q + 2\'d1;',
          '    end',
          '    assign tick4_o = (div_q == 2\'d3);   // high exactly 1 cycle in 4',
          '',
          '    // Consumer: enable-gated register (module 03 template).',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n)  slow_q <= 8\'d0;',
          '        else if (tick4_o) slow_q <= data_i;   // transfers on 1 of 4 edges',
          '    end',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Lines 11-14: the rate generator is an ordinary counter in the ordinary domain. div_q wraps 0,1,2,3; the compare produces a one-cycle tick.',
          'Line 15: `tick4_o` is high on exactly the cycles where div_q==3 — trace: div 0,1,2,3(tick),0,1,2,3(tick)... one tick every 4 cycles, aligned to the counter.',
          'Lines 18-22: the consumer is the standard template with the enable as a branch. The register still clocks on every edge (same tree, same timing analysis); it transfers on 1 of 4.',
          'Trace: data_i changes every cycle; slow_q samples it only on tick cycles — slow_q holds for 4 cycles, updating to the data value present at the tick edge. Effectively a 4-cycle-rate snapshot.',
          'Contrast the anti-pattern `assign gclk4 = clk & tick4_o;` feeding slow_q\'s clock: that creates a glitch-prone, skewed, unanalyzable second domain. The enable version has none of those costs, and synthesis can later swap the pattern for an ICG cell if power analysis wants it.',
        ],
      },
      {
        title: 'The gated-clock and divided-clock anti-patterns, dissected',
        language: 'verilog',
        code: [
          '// ANTI-PATTERN 1: hand-typed gated clock.',
          'assign gclk = clk & en;           // NEVER in design RTL',
          'always @(posedge gclk) slow_q <= data_i;',
          '//   - en changing near a clk edge -> runt pulses on gclk:',
          '//     unintended extra (or partial) clock edges',
          '//   - the AND sits in the clock path: added skew, unbudgeted',
          '//   - every gclk register is a new, unmanaged clock domain',
          '',
          '// ANTI-PATTERN 2: divided clock from a register Q.',
          'always @(posedge clk or negedge reset_n)',
          '    if (!reset_n) div_q <= 1\'b0; else div_q <= ~div_q;',
          'assign clk_div2 = div_q;          // NEVER as a clock',
          'always @(posedge clk_div2) slow2_q <= data_i;',
          '//   - clk_div2 edges are data-timed (a register Q), no tree,',
          '//     routing-delay skew to each consumer',
          '//   - every path clk_div2-domain <-> clk-domain is CDC, undesigned',
          '',
          '// THE SAME FUNCTIONALITY, SAFE (compare with example 1):',
          '//   reg div_q;  toggle every cycle;  wire tick2 = div_q;',
          '//   always @(posedge clk or negedge reset_n)',
          '//       if (!reset_n) slow2_q <= 8\'d0;',
          '//       else if (tick2) slow2_q <= data_i;   // same "rate", one domain',
        ].join('\n'),
        explanation: [
          'Anti-pattern 1: the AND gate is in the clock path. When en rises 0.2 ns before a clk edge, gclk sees a narrow pulse — registers capture mid-transition values. When en is loaded differently in different branches, the clock skew between them is whatever the routing gave, unbudgeted.',
          'Anti-pattern 2: the divided clock\'s edges depend on a data transition (the toggle flop\'s Q). Timing tools see registers clocked by a data signal: paths into that domain are cross-domain, paths out are cross-domain, and nothing about the relationship is specified or verified.',
          'The safe version at the bottom produces the same effective rate with an enable: one domain, one tree, native analysis — and if the power tool wants to gate, it inserts a proper ICG cell that latches en against clk (glitch-free) and reports it.',
          'The mechanical rule that catches all of this in review and lint: the token clk appears in design RTL only inside `posedge clk` sensitivity lists. Any clk in an assign, an if, or a right-hand side is a finding.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'One domain with enables vs a hand-divided clock forest',
        content: [
          '  SAFE: one clock, enables                  UNSAFE: derived clocks',
          '',
          '      clk ---------------------------------+   clk --> [toggle FF] --> clk_div2 --> [regs]',
          '        |                                   |              (data-timed edges,',
          '   +----+----+----+                         |               no tree, skew)',
          '   |    |    |    |                         |',
          '  [reg][reg][reg][reg]   all one domain     clk --> [AND en] --> gclk --> [regs]',
          '   ^en  ^en       (CE muxes on D)           (glitchy, skewed,',
          '   tick gen (counter)                        new unmanaged domain)',
          '',
          '  Every path analyzable as single-clock     Every crossing = undesigned CDC',
        ].join('\n'),
        caption:
          'The enable pattern keeps one analyzable domain; gated and derived clocks silently create several — each with the full CDC cost and none of the design.',
      },
      {
        kind: 'waveform',
        title: 'Enable tick vs gated clock (the runt-pulse hazard)',
        content: [
          '         __    __    __    __    __    __    __',
          'clk   __|  |__|  |__|  |__|  |__|  |__|  |__|  |__',
          '',
          'en     ____/‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾__________',
          '             ^en rises just before an edge',
          '',
          'gclk   ____/‾‾/‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾__________',
          '            ^^ runt pulse: a partial clock edge!',
          '',
          'tick   ____________/‾‾‾\\__________________',
          '                    (clean 1-cycle enable)',
          '',
          'Registers on gclk may capture at the runt (undefined data);',
          'registers on clk with the enable sample cleanly at e_next.',
        ].join('\n'),
        caption:
          'educational waveform (illustrative): the gated clock emits a runt pulse when en changes near an edge; the enable tick is a clean, single-cycle data signal.',
      },
    ],
    tables: [
      {
        caption: 'Rate reduction options compared',
        headers: ['Option', 'Clock domains', 'Glitch risk', 'Analysis', 'Verdict'],
        rows: [
          ['Clock enable (CE)', 'One', 'None (data signal)', 'Native single-clock STA', 'The idiom — always'],
          ['Hand-typed gated clock', 'Unmanaged extra', 'Runt pulses', 'Broken (skew + CDC)', 'Never in design RTL'],
          ['Register-Q divided clock', 'Unmanaged extra', 'Edges are data-timed', 'Broken (CDC everywhere)', 'Never in design RTL'],
          ['Tool-inserted ICG cell', 'One (transparent)', 'None (glitch-free latch)', 'Tool-managed and reported', 'Tool\'s job during synthesis'],
        ],
      },
      {
        caption: 'The clock-policy rules (mechanically checkable)',
        headers: ['Rule', 'Check'],
        rows: [
          ['clk appears only in sensitivity lists', 'Grep design RTL: no clk in assigns/RHS'],
          ['Slower rates via enables from named tick generators', 'Every _en has a generating counter/FSM row'],
          ['A genuinely new clock arrives as a new domain', 'CDC discipline (lesson 3), never a local divide'],
          ['One synchronizer + one reset per domain', 'Module 07 lesson 1 artifacts'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Gating the clock to save power or implement a slow mode.',
        fix:
          'Hand-typed clock gating produces runt pulses and unbudgeted skew, and turns every crossing into undesigned CDC. Write the enable; the synthesis tool inserts proper ICG cells where power analysis justifies them, glitch-free and reported.',
      },
      {
        mistake: 'Generating clk_div2 from a toggle register and clocking a submodule with it.',
        fix:
          'That submodule is a new clock domain with a data-timed clock: skew per consumer, every crossing a CDC. The same rate is achieved with an enable tick; the same code shape, one domain, native timing.',
      },
      {
        mistake: 'Using a fast register with a slow enable for a datapath that needs per-cycle operation (or vice versa, by accident).',
        fix:
          'Enable-rate mismatches are functional bugs: a datapath register that transfers only every 4th cycle silently rate-limits the whole path. The architecture\'s rate map (which registers run at which rate) makes the mismatch reviewable — check enables against it in review.',
      },
    ],
    guidedPractice: {
      title: 'Debounce at 1 kHz inside a 100 MHz domain',
      brief:
        'Design the enable structure for a button debouncer that samples every 1 ms in a 100 MHz system (100,000 cycles per ms). Write the rate generator (note the counter width: ceil(log2(100000)) = 17 bits), the tick, and the sampling register. Then answer: why is this dramatically better than dividing the clock by 100,000, and what does the 17-bit counter cost?',
      starterCode: [
        '// 100 MHz clk, 1 ms sample period = 100_000 cycles.',
        '// TODO: 17-bit counter, terminal compare, tick, sample register.',
        '// Questions: counter width? what does the tick align to?',
        '// why not a divided clock? counter cost?',
      ].join('\n'),
      expectedBehavior:
        'reg [16:0] div_q counts 0..99999; wire tick_1ms = (div_q == 17\'d99999); consumer: else if (tick_1ms) sample_q <= btn_raw_i;. The counter costs 17 FFs and a 17-bit compare — trivial. The divided-clock alternative would clock the sampler from a data-timed signal: a 1-in-100000-rate domain whose every crossing is CDC, with the compare logic in the clock path. The enable version: one domain, one compare in a data path, the debouncer logic unchanged from module 01\'s template.',
      hints: [
        'ceil(log2 100000) = 17 bits; the terminal value is 99_999.',
        'The tick is one clk cycle wide — a data signal, not a clock.',
        'Compare the FF cost of the counter against the CDC cost of the alternative.',
      ],
    },
    practiceExercises: [
      {
        title: 'Lint the clock policy',
        brief:
          'For each line, say whether it violates the clock policy: (a) assign clk_en = tick4_o & mode_i; (b) always @(posedge clk) if (en) q <= d; (c) assign slow_clk = clk & run; (d) wire next = en ? d : q; used as q\'s D input.',
        expectedBehavior:
          '(a) OK — an enable ANDed with another enable is still data. (b) OK — the canonical CE idiom. (c) VIOLATION — clk in an assign: a gated clock. (d) OK — an enable expressed as a mux on D (identical hardware to (b)). The checkable rule: clk (any clock) only ever appears inside posedge sensitivity lists.',
        hints: [
          'The violated rule is about the clock signal\'s appearances, not about enables.',
          '(d) and (b) are the same hardware written differently.',
          '(c) is the anti-pattern this lesson dissects.',
        ],
      },
      {
        title: 'Two-rate block design',
        brief:
          'A block computes at 100 MHz but its config registers update at 10 MHz (software writes them over a slow bus). Design the enable structure: rate generator, which registers are slow, and how the fast datapath reads the (mostly static) config safely. What hazard would a naive design have?',
        expectedBehavior:
          'One 10 MHz tick generator (divide-by-10 counter, 4 bits). Config registers use the slow enable (they hold between ticks — fine, they change rarely). Fast datapath reads config combinationally — safe because config is quasi-static: it changes at most once per 10 ticks, and the datapath consumes it many cycles per change. The naive hazard: a fast-path computation straddling a config update edge reads half-old, half-new config (e.g. old base with new mask). The spec-level answer: define a coherence rule — config updates take effect at a defined boundary (e.g. only when the datapath is idle, or double-buffered with a commit tick).',
        hints: [
          'Divide-by-10: 4-bit counter, terminal 9.',
          'Quasi-static config is the reason enables work here at all.',
          'The hazard is coherence across the update edge, not speed.',
        ],
      },
    ],
    assessment: {
      title: 'Clock enables checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'What does the clock-enable pattern use to run logic at a slower rate?',
          options: [
            'A divided clock signal',
            'An enable branch on registers clocked by the full-rate clock',
            'A slower crystal',
            'A PLL',
          ],
          answer: 'An enable branch on registers clocked by the full-rate clock',
          explanation:
            'else if (en) keeps one clock domain: the register clocks every cycle but transfers on enabled ones. Same tree, native timing, no CDC.',
          hint: 'The clock never changes; what gates the transfer?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'What is the runt-pulse hazard of assign gclk = clk & en?',
          options: [
            'gclk stops permanently when en glitches',
            'en changing near a clk edge produces a partial pulse that registers may capture as a spurious clock edge',
            'gclk is slower than intended',
            'The AND gate doubles power',
          ],
          answer:
            'en changing near a clk edge produces a partial pulse that registers may capture as a spurious clock edge',
          explanation:
            'The AND has no qualification of en against the clock; a transition that lands close to an edge slices it into a narrow pulse. Every register on gclk sees a possible extra, mid-level edge — a data-corrupting event that recurs whenever en timing repeats.',
          hint: 'What does the AND output when en transitions mid-edge?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'Clocking a register with the Q output of a toggle flip-flop (a divided clock) is acceptable as long as both clocks come from the same original clock.',
          answer: 'false',
          explanation:
            'The divided clock\'s edges are data-timed, its routing is not a clock tree, and every path between the two "domains" is a genuine CDC with an unmanaged relationship. The same rate via an enable stays in one domain with native analysis.',
          hint: 'Does sharing an ancestor make two clocks synchronous?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'State the mechanical clock-policy rule that lint (or a reviewer) can check, and name the tool-managed exception to hand-gating.',
          answer:
            'The clock signal appears in design RTL only inside posedge sensitivity lists (never in assigns or right-hand sides); the exception is tool-inserted integrated clock-gating (ICG) cells during synthesis',
          explanation:
            'The rule catches every gated/derived clock mechanically. ICG cells are glitch-free library primitives inserted by power tools — a synthesis-time, analyzed decision, not an RTL construct.',
          hint: 'Where may the token clk legally appear?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt:
            'A design divides its 100 MHz clock by 4 in a toggle chain and clocks a "slow" accumulator with clk_div4. Simulations pass. What is wrong with shipping this?',
          options: [
            'Nothing; simulation proves the design',
            'clk_div4 is a data-timed clock: no tree, per-consumer skew, and every path to/from the accumulator is an unmanaged CDC — simulation of ideal clocks hides all of it',
            'The accumulator will be too slow',
            'Divide-by-4 requires a PLL',
          ],
          answer:
            'clk_div4 is a data-timed clock: no tree, per-consumer skew, and every path to/from the accumulator is an unmanaged CDC — simulation of ideal clocks hides all of it',
          explanation:
            'Simulation models clocks as ideal edges; the physical problems (skew, CDC, unanalyzable paths) appear only in timing analysis and silicon. The enable version of the same accumulator has none of these costs.',
          hint: 'What does an ideal-clock simulation NOT model?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Clock enable (CE)', definition: 'A single-cycle enable branch letting registers transfer on a subset of clock edges, within one domain.' },
      { term: 'Gated clock', definition: 'A clock chopped by logic (clk & en); glitch-prone, skewed, CDC-creating. Never hand-typed.' },
      { term: 'Derived clock', definition: 'A clock produced from a register output or divider logic; data-timed edges, no tree.' },
      { term: 'ICG cell', definition: 'Integrated clock-gating cell: glitch-free library gate inserted by power tools during synthesis.' },
      { term: 'Tick generator', definition: 'A modulo counter + compare producing a one-cycle enable at a slower rate.' },
      { term: 'Quasi-static signal', definition: 'A signal that changes rarely (config) and can be read at a faster rate safely.' },
    ],
    revisionSummary: [
      'Slower logic = enable branches + tick generators; one domain, native analysis, nearly free.',
      'Gated clocks: runt pulses, unbudgeted skew, hidden CDC. Divided clocks: data-timed edges, no tree, same costs.',
      'The rule: clk appears only in posedge sensitivity lists in design RTL.',
      'ICG cells are the legitimate gating — inserted by tools in synthesis, not by designers in RTL.',
      'A real second clock arrives as a new domain with full CDC treatment, never as a local divide.',
      'Multi-rate designs document their rate map; enable-rate mismatches are functional bugs.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Clock gating',
        url: 'https://en.wikipedia.org/wiki/Clock_gating',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Clock signal',
        url: 'https://en.wikipedia.org/wiki/Clock_signal',
        kind: 'article',
      },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'rtl-m07-l3',
    title: 'Clock Domain Crossing: Metastability and Synchronizers',
    summary:
      'Signals crossing between clock domains can be sampled mid-transition, producing metastability. Single bits are tamed by 2-FF synchronizers; multi-bit buses are NOT — they need handshakes or gray code. This lesson draws the line and bans the unsafe patterns by name.',
    objectives: [
      'Explain metastability and why no circuit eliminates it — only makes it improbable.',
      'Implement the 2-FF synchronizer for single-bit level crossings and state its limits.',
      'Explain why multi-bit buses must not cross through parallel synchronizers.',
      'Apply the safe bus-crossing patterns: gray-coded counters and the toggle handshake.',
    ],
    whyItMatters:
      'Any system with more than one clock — which is most of them — lives or dies by CDC discipline. Metastability failures are the worst class in hardware: rare, unreproducible in simulation, and catastrophic when they land (a corrupted address, a half-updated command). The rules in this lesson are not style: they are the difference between a multi-clock design that runs for years and one that crashes on a Tuesday. Just as important is knowing what is NOT safe — parallel synchronizers on a bus look plausible and are flatly wrong.',
    prerequisites: ['rtl-m07-l1', 'rtl-m07-l2'],
    explanation: [
      '**Metastability** is what happens when a flip-flop samples a changing input too close to its clock edge: the output can settle to an invalid intermediate level, or hover, for an unbounded time before resolving. No circuit prevents it — sampling an asynchronous event against a clock has an irreducible probability window — but its **MTBF (mean time between failures)** grows exponentially with the settle time allowed before the next stage samples. That exponential is the entire engineering basis of synchronizers: give the potentially-metastable value one (or more) full clock cycles to resolve before anything consumes it, and the failure rate becomes negligible. One cycle of waiting is cheap; a corrupted address is not.',
      'The **2-FF synchronizer** is the standard cell for single-bit *level* signals: the async input feeds flop 1 (which may go metastable), flop 2 samples flop 1 a full cycle later (by which time it has resolved with overwhelming probability), and consumers use only flop 2\'s output. Cost: two flops and one cycle of latency. Limits, stated honestly: it synchronizes a **single bit**; it adds up to ~1.5 cycles of uncertainty in *when* the level arrives (fine for levels, fatal for pulses into faster domains); and it says nothing about multiple related bits staying coherent — that is the next paragraph\'s problem.',
      'The **multi-bit bus prohibition** is the lesson\'s hardest rule. Synchronizing each bit of a bus through its own 2-FF chain does NOT work: the bits resolve at slightly different times, so the receiving domain can sample a word that is half-old, half-new — a value that never existed on the sending side (imagine a 2-bit count crossing as it goes 01 -> 10: the receiver might catch 11 or 00). No amount of flops fixes coherence; coherence needs a *protocol*. The two standard protocols: **gray coding** (only for counters that move ±1 per change — adjacent gray codes differ in exactly one bit, so a mid-transition sample is either the old or the new value, never a chimera) and the **toggle handshake** (send a 1-bit toggle through a synchronizer; the data bus itself crosses with NO synchronizer, guaranteed stable while the toggle confirms the receiver has consumed the previous word).',
      '**Pulses need extra care**: a 1-cycle pulse from a fast domain into a slow one can finish before the slow domain samples anything — the synchronizer never sees it. The standard fix is the **toggle**: convert the pulse to a level change (toggle a flip-flop), synchronize the level, and regenerate the pulse in the destination by XORing consecutive synchronized samples. Level signals into faster domains are fine with a plain 2-FF sync (the level persists). The decision table is short: level -> 2-FF sync; fast-to-slow pulse -> toggle + detect; counter -> gray code; arbitrary multi-bit word -> handshake with data-held-stable. Everything else — bus through parallel syncs, unsynchronized bus "because it usually works" — is banned outright.',
      'The honest boundaries of the lesson: real designs also use asynchronous FIFOs (dual-port RAM with gray-coded pointers — the gray-code idea scaled up) and dedicated CDC cells/tools; static CDC verification tools exist precisely because the discipline above is easy to get subtly wrong at scale, and they check every crossing against a declared protocol. This course\'s scope is the concepts and the small patterns — enough to design clean crossings and, critically, enough to *recognize and refuse* the unsafe ones in review.',
    ].join('\n\n'),
    deepDive: [
      'Why does gray coding work only for ±1 counters? Because its safety argument is "adjacent values differ in exactly one bit": if the counter is sampled mid-change, the receiver gets either the old or the new encoding — both were real values. Any multi-bit jump (say 011 -> 100 in binary, three bits changing) breaks the argument: a mid-change sample can catch any mixture. This is why gray-coded pointers appear in asynchronous FIFOs (pointers increment by 1) and nowhere else. A general data bus has arbitrary transitions, so gray coding does not apply — handshakes do.',
      'The toggle handshake\'s essential discipline is that the sender must hold the data stable until the receiver acknowledges (or, in the simpler "quad-rate" variant, until enough time has passed that the receiver must have sampled). The usual failure is a sender that updates the data bus and toggles in the same cycle it changed the data: the receiver, mid-synchronizing the previous toggle, samples the new data before its own handshake completes. The pattern that works: data changes -> toggle changes on a LATER edge (data stable before the toggle) -> receiver, on seeing the synchronized toggle change, samples the bus. One toggle per word, data-then-toggle order, is the protocol.',
      'Metastability in simulation is invisible by default: simulators model flip-flops as ideal samplers, so a setup violation on an async input simply resolves instantly to one value — usually the "right" one. This is why CDC bugs almost never reproduce in RTL simulation and why (a) gate-level or specialized CDC-aware simulation exists, (b) static CDC tools are standard in industry flows, and (c) the RTL-level defense is absolute discipline rather than testing. A reviewer\'s CDC reflex — every crossing named, every crossing matched to a protocol — is the practical safety net.',
    ].join('\n\n'),
    examples: [
      {
        title: 'The 2-FF synchronizer and its correct uses',
        language: 'verilog',
        code: [
          '// 2-FF synchronizer: the ONLY sanctioned way for a single-bit',
          '// LEVEL to enter a new clock domain.',
          'module sync_2ff (',
          '    input  wire clk_dst,',
          '    input  wire reset_n,          // dst-domain reset (synchronized)',
          '    input  wire d_async_i,        // from another domain: a LEVEL',
          '    output wire q_sync_o',
          ');',
          '    reg meta_q;    // may go metastable: never consumed directly',
          '    reg sync_q;    // sampled one full cycle later',
          '',
          '    always @(posedge clk_dst or negedge reset_n) begin',
          '        if (!reset_n) begin',
          '            meta_q <= 1\'b0;',
          '            sync_q <= 1\'b0;',
          '        end else begin',
          '            meta_q <= d_async_i;',
          '            sync_q <= meta_q;',
          '        end',
          '    end',
          '',
          '    assign q_sync_o = sync_q;',
          'endmodule',
          '',
          '// Level use (safe): a slow-domain busy flag into a fast domain.',
          '// Pulse use (UNSAFE through this module alone): a 1-cycle pulse',
          '//   from a FAST domain can vanish before a SLOW domain samples.',
          '//   Use the toggle pattern (next example) for pulses.',
          '// Multi-bit use (BANNED): two sync_2ff instances on a bus do NOT',
          '//   preserve coherence - bits resolve independently.',
        ].join('\n'),
        explanation: [
          'meta_q is the sacrificial stage: it samples the async input and may hover. Nothing else in the design may read meta_q — consumers see sync_q only, one settle-cycle later.',
          'MTBF intuition: the failure window is the fraction of a cycle during which the input changes; one full cycle of settle makes the residual failure probability exponentially small. More stages (3-FF) buy more margin for high-reliability designs.',
          'Latency accounting: the level arrives at sync_q 2-3 destination-clock edges after it changed — an uncertainty the consumer\'s spec must tolerate (levels tolerate it; deadlines do not).',
          'The comment block is the discipline made explicit: levels yes, pulses through a toggle, buses never.',
          'Reset note: reset_n here is the destination domain\'s synchronized reset (module 07 lesson 1) — synchronizers are reset like any other domain register, from their own domain.',
        ],
      },
      {
        title: 'Safe multi-bit crossing: gray-coded pointer and toggle handshake',
        language: 'verilog',
        code: [
          '// PATTERN A: gray-coded counter crossing (counter changes by +-1).',
          '// Sender domain: keep BOTH binary and gray forms.',
          'reg [3:0] wr_bin_q;              // used locally (addresses etc.)',
          'reg [3:0] wr_gray_q;',
          'wire [3:0] bin_next = wr_bin_q + 4\'d1;',
          'wire [3:0] gray_next = bin_next ^ (bin_next >> 1);  // bin->gray',
          'always @(posedge clk_src or negedge reset_src)',
          '    if (!reset_src) begin',
          '        wr_bin_q  <= 4\'d0;   // gray(0) = 0: matched reset values',
          '        wr_gray_q <= 4\'d0;',
          '    end else begin',
          '        wr_bin_q  <= bin_next;',
          '        wr_gray_q <= gray_next;   // crosses via sync_2ff chain',
          '    end',
          '// Receiver domain: sync_2ff each gray bit (safe: adjacent gray',
          '// codes differ in ONE bit), then gray->binary locally:',
          '//   bin = gray ^ (gray >> 1) ^ (gray >> 2) ^ (gray >> 3);',
          '',
          '// PATTERN B: toggle handshake for arbitrary data words.',
          '// Sender:',
          '//   1. put the word on the bus FIRST',
          '//   2. one cycle later, TOGGLE tgl_q',
          '// Receiver: sync tgl (2FF); on a detected change, sample the bus',
          '//   (the bus itself has NO synchronizer - it was stable while the',
          '//    toggle traveled). Sender must hold the bus until the next',
          '//   word (or until an ack toggle returns, for paced transfers).',
        ].join('\n'),
        explanation: [
          'Gray conversion (bin -> gray) is the XOR-with-shift idiom on line 6; the inverse (gray -> bin) is the running XOR on the comment line. Both are pure wiring — free.',
          'Why the gray pointer is safe: successive values 0000, 0001, 0011, 0010, 0110... differ in exactly one bit. A receiver sampling mid-change catches old or new — both real values. A binary pointer would present mixtures (0111 -> 1000 could be read as 1111).',
          'Reset values match (0 <-> 0): both sides start in agreement, so the receiver\'s first comparison is meaningful.',
          'Pattern B\'s order is the protocol: data stable, THEN toggle. The bus crosses raw (no per-bit synchronizers — coherence comes from stability, not from flops), and the toggle\'s synchronized change is the receiver\'s "sample now" signal.',
          'The banned pattern, for contrast: two sync_2ff instances on data[1:0] as it changes 01 -> 10. Bit 0 resolves at edge k, bit 1 at edge k+1; the receiver sees 11 or 00 — values the sender never held. No number of flops fixes this; only the protocol does.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The CDC decision table as a map',
        content: [
          '  SIGNAL CROSSING A CLOCK BOUNDARY?',
          '         |',
          '         v',
          '  Is it a single bit?',
          '   |-- YES --> Is it a level (persists)?',
          '   |             |-- YES --> sync_2ff (2 FFs, dst clock)  [OK]',
          '   |             |-- NO (pulse, fast->slow)',
          '   |                        --> toggle FF + sync_2ff + edge',
          '   |                            detect in dst          [OK]',
          '   |-- NO (multi-bit) --> Is it a +-1 counter?',
          '                         |-- YES --> gray code + sync_2ff [OK]',
          '                         |-- NO  --> toggle handshake:',
          '                                     data stable, then toggle',
          '                                     [OK]',
          '  BANNED (never):',
          '   - bus through parallel sync_2ff chains',
          '   - unsynchronized bus "it usually works"',
          '   - synchronizing a fast pulse into a slow domain directly',
          '   - consuming the meta_q (first) flop of any synchronizer',
        ].join('\n'),
        caption:
          'Every crossing gets one protocol from the table; anything not on the map is a design defect, not a judgement call.',
      },
      {
        kind: 'waveform',
        title: 'Why parallel bus synchronizers fail (the chimera sample)',
        content: [
          '  Sender domain: data[1:0] changes 01 -> 10 (both bits toggle)',
          '',
          '  data[1]  ____/‾‾‾‾‾‾‾‾‾‾‾‾‾     (0 -> 1)',
          '  data[0]  ‾‾‾‾\\__________        (1 -> 0)',
          '               ^same intended edge',
          '',
          '  Each bit through its own sync_2ff (dst clock):',
          '  sync_q[1] ________/‾‾‾‾‾‾‾‾    resolves at dst edge k',
          '  sync_q[0] ‾‾‾‾‾‾‾‾‾‾‾\\______   resolves at dst edge k+1',
          '',
          '  Receiver sees, at dst edge k:   data = 11   <- NEVER EXISTED',
          '  at dst edge k+1:                data = 10',
          '',
          '  The receiver consumed a chimera word. No amount of flops fixes',
          '  coherence; only gray coding (1-bit changes) or a handshake',
          '  (data held stable) does.',
        ].join('\n'),
        caption:
          'educational waveform (illustrative): per-bit synchronizers skew independently, so the receiver can sample a half-old, half-new word that never existed.',
      },
    ],
    tables: [
      {
        caption: 'CDC protocol selection table',
        headers: ['Signal type', 'Pattern', 'Key requirement'],
        rows: [
          ['Single-bit level', '2-FF synchronizer', 'Consumer tolerates 2-3 cycle arrival uncertainty'],
          ['Single-bit pulse, fast->slow', 'Toggle + edge detect', 'Sender holds toggle until next event'],
          ['Single-bit pulse, slow->fast', '2-FF sync (level is long enough)', 'Pulse wider than dst period'],
          ['Counter (changes +-1)', 'Gray code + per-bit sync', 'Strictly ±1 steps; matched resets'],
          ['Arbitrary multi-bit word', 'Toggle handshake', 'Data stable before toggle; held until consumed'],
          ['Streams', 'Asynchronous FIFO (gray pointers)', 'Full design pattern; gray pointers as above'],
        ],
      },
      {
        caption: 'Banned patterns and the failure each produces',
        headers: ['Banned pattern', 'Failure mode'],
        rows: [
          ['Parallel sync_2ff on a bus', 'Chimera words: half-old, half-new'],
          ['Unsynchronized bus crossing', 'Metastability + chimera, unreproducible in sim'],
          ['Direct fast->slow pulse sync', 'Pulse vanishes between slow samples'],
          ['Reading meta_q directly', 'Consuming a metastable level'],
          ['Sender toggles and changes data same cycle', 'Receiver samples the bus mid-change'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Synchronizing each bit of a multi-bit bus with its own 2-FF chain.',
        fix:
          'Bits resolve independently: the receiver samples chimera words that never existed. Coherence needs a protocol — gray code (±1 counters) or toggle handshake (data held stable). CDC tools flag this pattern precisely because it is the most common well-intentioned CDC error.',
      },
      {
        mistake: 'Sending a fast-domain single-cycle pulse straight into a slow domain through a 2-FF synchronizer.',
        fix:
          'The pulse (one fast cycle) can end between two slow edges: the slow domain never samples it — the event silently vanishes. Convert to a toggle level, synchronize the level, and regenerate the pulse by edge detection in the destination.',
      },
      {
        mistake: 'Treating a crossing as safe because "the sender changes this signal rarely".',
        fix:
          'Rare is not never, and the failure is catastrophic and unreproducible. Every crossing — however slow — gets a protocol from the decision table and an entry in the CDC list that static tools and reviewers check. "Rarely crosses unsafely" is how field failures are born.',
      },
    ],
    guidedPractice: {
      title: 'Route four crossings',
      brief:
        'A system has domains A (100 MHz) and B (25 MHz). Route each crossing with the correct protocol and state its requirement: (1) A sends a 1-cycle start pulse to B; (2) B sends a level busy flag to A; (3) A sends a 4-bit phase counter (increments by 1 every 64 cycles) to B; (4) A sends a 16-bit configuration word to B, updated rarely.',
      starterCode: [
        '// Crossings:',
        '//  1. A->B 1-cycle pulse (fast->slow):',
        '//  2. B->A level busy:',
        '//  3. A->B 4-bit +-1 counter:',
        '//  4. A->B 16-bit config word (rare updates):',
        '// For each: protocol + the requirement that makes it safe.',
      ].join('\n'),
      expectedBehavior:
        '(1) Toggle pattern: pulse toggles tgl_q in A; sync into B; edge-detect regenerates the pulse (requirement: A holds the toggle until the next event). (2) Plain sync_2ff into A (requirement: A tolerates 2-3 cycle arrival uncertainty — a busy flag does). (3) Gray code the counter, sync each gray bit into B, gray->bin locally (requirement: strictly +1 steps; matched resets). (4) Toggle handshake: write the word, hold it stable, then toggle; B samples on synchronized toggle change (requirement: A holds the word until the next update — for "rarely updated" config this is naturally satisfied, but it must be stated, not assumed).',
      hints: [
        'Match each signal to the decision table, then state the pattern\'s requirement as a checkable sentence.',
        'The config word\'s "rarely" must become a protocol fact (held until next update), not an assumption.',
        'The pulse crossing is the one most often done wrong — fast-to-slow is the dangerous direction.',
      ],
    },
    practiceExercises: [
      {
        title: 'Audit the crossing list',
        brief:
          'A review finds these four crossings. Classify each safe/unsafe and fix the unsafe ones: (a) 8-bit status byte, each bit through sync_2ff; (b) a done_tick pulse from a 200 MHz domain into a 50 MHz domain via sync_2ff; (c) a FIFO write pointer gray-coded and synced; (d) an enable level from a slow domain into a fast one via sync_2ff.',
        expectedBehavior:
          '(a) UNSAFE — chimera bytes; fix with a toggle handshake (or recognize it as a counter if it increments by 1). (b) UNSAFE — a 1-cycle 200 MHz pulse can vanish between 50 MHz samples; fix with toggle + edge detect. (c) SAFE — gray + sync is the standard, given ±1 increments and matched resets. (d) SAFE — a level into a faster domain persists long enough for the 2-FF sync.',
        hints: [
          'Ask per crossing: single bit or bus? level or pulse? counter or word?',
          '(b) is the classic vanishing pulse: direction and rates matter.',
          'Safe crossings still need their requirement sentences in the CDC list.',
        ],
      },
      {
        title: 'Gray code round trip',
        brief:
          'Convert binary 0-7 to gray, list the sequence, and verify the one-bit-change property between consecutive values. Then show the binary sequence 0-7 and identify exactly which consecutive pairs would produce chimeras if sampled mid-change (bits changing).',
        expectedBehavior:
          'Gray: 000, 001, 011, 010, 110, 111, 101, 100 — every consecutive pair differs in exactly one bit (check each). Binary: 000, 001, 010, 011, 100, 101, 110, 111 — the 011->100 transition changes all three bits (a mid-change sample could read 010, 001, 111, 000 — all chimeras), and 001->010, 101->110 change two bits. Only gray makes the mid-change sample safe for counters.',
        hints: [
          'gray = bin ^ (bin >> 1); compute each row.',
          'Count differing bits per consecutive pair in both sequences.',
          'The worst binary transition (011->100) is the 7->8 boundary FIFO pointers hit constantly.',
        ],
      },
    ],
    assessment: {
      title: 'CDC checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'What does the second flip-flop of a 2-FF synchronizer buy?',
          options: [
            'It eliminates metastability entirely',
            'One full clock cycle of settle time for the possibly-metastable first flop, making residual failure probability exponentially small',
            'It doubles the clock frequency',
            'It filters glitches on the clock',
          ],
          answer:
            'One full clock cycle of settle time for the possibly-metastable first flop, making residual failure probability exponentially small',
          explanation:
            'Metastability is not preventable when sampling async events; it is made improbable by giving the first flop\'s output a cycle to resolve before it is consumed. That is the whole mechanism — and MTBF grows exponentially with settle time.',
          hint: 'Nothing eliminates metastability; what reduces its consequence?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'Why is per-bit synchronization of a multi-bit bus unsafe?',
          options: [
            'The synchronizers use too much area',
            'Bits resolve at slightly different times, so the receiver can sample a half-old, half-new word that never existed',
            'It adds too much latency',
            'It only works for active-low signals',
          ],
          answer:
            'Bits resolve at slightly different times, so the receiver can sample a half-old, half-new word that never existed',
          explanation:
            'Coherence, not metastability, is the failure: each bit\'s chain resolves independently, so mid-change samples are chimeras. Gray coding (one-bit changes) or a handshake (data stable) restores coherence.',
          hint: 'The 01 -> 10 transition is the classic demonstration.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'A 1-cycle pulse from a 200 MHz domain can be reliably transferred into a 25 MHz domain using a plain 2-FF synchronizer.',
          answer: 'false',
          explanation:
            'The pulse lasts 5 ns; the slow domain samples every 40 ns — the pulse can begin and end entirely between samples and the event vanishes. The fix is the toggle pattern: level change, sync, edge detect.',
          hint: 'Compare the pulse width with the destination sampling period.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'State the two protocols for multi-bit crossings and the signal class each applies to.',
          answer:
            'Gray coding for counters that change by exactly +-1 per step (adjacent codes differ in one bit, so mid-change samples are always real values); toggle handshake for arbitrary words (data held stable, then a synchronized toggle signals the receiver to sample)',
          explanation:
            'Gray\'s safety argument needs ±1 movement; arbitrary buses break it, so they use the data-then-toggle protocol instead.',
          hint: 'One works because changes are tiny; the other because changes are held.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt:
            'A receiver samples a gray-coded pointer and reads a value one step behind the sender. The team proposes "fixing" it by synchronizing the binary pointer instead. What is wrong with that proposal?',
          options: [
            'Nothing; binary is simpler',
            'The one-step lag is inherent to synchronization and harmless if consumed correctly; the binary pointer changes multiple bits per step, reintroducing chimera samples — the original problem, now worse',
            'Gray codes need more flops',
            'The receiver should sample faster',
          ],
          answer:
            'The one-step lag is inherent to synchronization and harmless if consumed correctly; the binary pointer changes multiple bits per step, reintroducing chimera samples — the original problem, now worse',
          explanation:
            'Synchronizers always add arrival uncertainty; consumers of pointers must be designed for it (e.g. FIFO occupancy computed with conservative lags). Switching to binary trades a benign, known lag for the chimera failure the gray code existed to prevent.',
          hint: 'What property does the binary pointer lose?',
          difficulty: 'hard',
        },
      ],
    },
    keyTerms: [
      { term: 'Metastability', definition: 'A flip-flop resolving late (or hovering) after sampling a changing input near the clock edge; unpreventable, made improbable.' },
      { term: 'MTBF', definition: 'Mean time between metastability-induced failures; grows exponentially with allowed settle time.' },
      { term: '2-FF synchronizer', definition: 'Two flops in the destination domain: sample, settle one cycle, consume. For single-bit levels.' },
      { term: 'Toggle handshake', definition: 'Multi-bit crossing protocol: data stable, then a synchronized toggle; receiver samples on the toggle change.' },
      { term: 'Gray code', definition: 'An encoding where consecutive values differ in exactly one bit; safe for ±1 counter crossings.' },
      { term: 'CDC list', definition: 'The reviewed inventory of every clock crossing with its protocol — what static CDC tools verify.' },
    ],
    revisionSummary: [
      'Metastability is unpreventable but made exponentially improbable by one cycle of settle time — the 2-FF synchronizer.',
      'meta_q (first flop) is never consumed; consumers see sync_q.',
      'Buses never cross through parallel synchronizers — chimeras. Protocols: gray code (±1 counters), toggle handshake (words).',
      'Fast-to-slow pulses vanish: convert to toggle levels and edge-detect in the destination.',
      'Handshake order: data stable FIRST, then toggle; sender holds until consumed.',
      'Every crossing gets a named protocol and a CDC-list entry; simulation will not catch the failures.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Metastability (electronics)',
        url: 'https://en.wikipedia.org/wiki/Metastability_(electronics)',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Clock domain crossing',
        url: 'https://en.wikipedia.org/wiki/Clock_domain_crossing',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Gray code',
        url: 'https://en.wikipedia.org/wiki/Gray_code',
        kind: 'article',
      },
    ],
    estimatedMinutes: 55,
  },
];
