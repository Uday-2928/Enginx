import type { TutorialLesson } from '../types';

export const module04Lessons: TutorialLesson[] = [
  {
    id: 'vlsi-m04-l1',
    title: 'Static Timing Analysis Sign-off: Multi-Corner',
    summary:
      'How STA proves timing without simulation: path enumeration, setup at the slow corner, hold at the fast corner, and the multi-corner multi-mode discipline that makes a sign-off claim honest.',
    objectives: [
      'Explain what STA checks (every path, exhaustively) and what it cannot check (function, asynchronous behavior).',
      'Assign corners to checks: setup at slow PVT, hold at fast PVT — and justify both assignments.',
      'Describe multi-corner multi-mode (MCMM): several operating points, each with its own constraints and libraries.',
      'Read a synthetic sign-off timing summary and state what a clean sign-off requires.',
    ],
    whyItMatters:
      'Simulation can never prove timing: it exercises a subset of paths at one abstract speed. STA is the tool that examines *every* path against *every* constraint at real PVT corners — it is the timing half of "the chip will work". Sign-off is the discipline of closing STA across all corners plus physical verification (next lesson), and understanding what each check costs is what separates sign-off literacy from report-glancing.',
    prerequisites: [
      'Liberty timing model and corners (vlsi-m02-l2)',
      'Post-CTS propagated clocks and post-route RC (vlsi-m03-l2, vlsi-m03-l3)',
      'Setup/hold fundamentals (fpga-m03-l2)',
    ],
    explanation:
      '**Static timing analysis** decomposes the design into every timing path — register-to-register, input-to-register, register-to-output, and through-memory paths — and computes each path\'s arrival and required times from the Liberty tables and the extracted RC. It is *static* because no stimulus is applied: the analysis covers all paths unconditionally. Its strengths and limits are the same fact: it sees everything about timing and nothing about function — STA cannot catch a wrong FSM, only a slow or too-fast one.\n\n### Why checks split across corners\n\nSilicon varies: transistors come out faster or slower (process), supply varies, temperature varies. Flows define **corners** — extreme combinations — with one library per corner (vlsi-m02-l2). The two checks need opposite extremes:\n\n- **Setup** (slow-path check) is worst when everything is *slow*: **slow corner** (slow process, low voltage, high temperature). The longest path must still fit the period.\n- **Hold** (fast-path check) is worst when everything is *fast*: **fast corner** (fast process, high voltage, low temperature). The shortest path must still be long enough.\n\nThis asymmetry is why one-corner sign-off is meaningless: a design clean at the slow corner can fail hold at the fast corner, and neither number predicts the other.\n\n### MCMM: modes matter too\n\nReal chips run in **modes** — functional, test, low-power sleep — with different clocks and constraints per mode. **Multi-corner multi-mode (MCMM)** sign-off crosses corners with modes, each (corner, mode) pair carrying its libraries, constraints and analysis. The cost is runtime and engineering attention; the alternative — missing a mode-specific path — is a silicon bug that only appears in the field\'s rare mode.',
    deepDive: '### OCV and the honesty margin within one die\n\nA single corner assumes the whole die is uniformly slow or uniformly fast — but local variation means one path can launch from a fast region and capture in a slow one. **On-chip variation (OCV)** analysis derates each path\'s launch/capture and data delays pessimistically in the harmful direction (advanced OCV / POCV refine this with statistically-derived variation tables). The beginner takeaway: sign-off numbers include systematic pessimism by design; engineers do not "recover" OCV margin casually, because the pessimism is buying probability, not padding.\n\n### What "clean" means, and what it does not\n\nA clean sign-off means: setup slack ≥ 0 at every slow-corner/mode pair, hold slack ≥ 0 at every fast-corner/mode pair, max transition/capacitance rules met, clock trees within skew targets, SI (crosstalk) checks passed, IR/EM within limits — with the extracted RC of the *final* route. It does not mean: functional correctness (that is verification\'s claim), yield (that is the foundry\'s process), or that the constraints were right (garbage-in caveat — sign-off proves the design meets *its constraints*; constraint review is a human duty).',
    examples: [
      {
        title: 'Synthetic multi-corner sign-off summary (teaching example, not a real tool run)',
        language: 'text',
        code:
          '== SYNTHETIC SIGN-OFF TIMING SUMMARY (illustrative) ==\nDesign: dsp_mac4  Route: final   RC: SPEF (field-solver calibrated)\n\nCorner/mode            Setup WNS   Setup TNS   Hold WNS   Status\n---------------------  ---------   ---------   --------   ------\nSS 0.81V 125C func     +0.11 ns    0.00        n/a        PASS\nSS 0.81V 125C test     +0.04 ns    0.00        n/a        PASS\nFF 0.99V -40C func     n/a         n/a         +0.06 ns   PASS\nFF 0.99V -40C test     n/a         n/a         +0.03 ns   PASS\nTT 0.90V  25C func     +0.52 ns    0.00        +0.31 ns   PASS (reference)\n\nRules: max_transition PASS, max_capacitance PASS\nClock: skew <= 23 ps all corners (target 30 ps)\nSI:    crosstalk delta-delay included, worst victim margin +0.02 ns\n\nSIGN-OFF VERDICT: clean across all (corner, mode) pairs analyzed.\nClaims this DOES make: timing at these corners/modes with final RC.\nClaims it does NOT make: functional correctness (verification),\nconstraint correctness (human review), yield (foundry).',
        explanation: [
          'The corner names carry their PVT explicitly (SS/FF/TT process × voltage × temperature) — every number in a row is valid only in its row\'s corner.',
          'Setup columns exist only at slow corners and hold columns only at fast corners — the asymmetry from the lesson, made structural by the report\'s n/a cells.',
          'Modes (func/test) appear as separate rows: test-mode paths can fail independently of functional-mode paths, which is exactly why MCMM exists.',
          'The rules, skew and SI lines are part of the verdict — a "clean" timing summary with failing max_transition is not clean.',
          'The final two lines model honest claiming: sign-off timing is a specific, bounded claim — the two explicit non-claims (function, constraints) point to the human responsibilities this course keeps assigning.',
          'All numbers are synthetic and labeled; the reading discipline is the skill.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Corner assignment logic',
        content:
          '   SLOW corner (SS, low V, high T)      FAST corner (FF, high V, low T)\n   everything SLOWEST                   everything FASTEST\n        |                                     |\n   worst-case LONG paths               worst-case SHORT paths\n        |                                     |\n   SETUP check:                        HOLD check:\n   must fit the period                 must not be TOO short\n        |                                     |\n   fail = too slow chip                fail = chip broken at any speed\n\n  One library file per corner; one STA run per (corner, mode).',
        caption:
          'The two checks demand opposite extremes — which is why corners exist and why single-corner sign-off proves nothing about the other extreme.',
      },
    ],
    tables: [
      {
        caption: 'The sign-off checklist (timing half)',
        headers: ['Check', 'Corner(s)', 'Pass condition'],
        rows: [
          ['Setup', 'Slow (SS-class), each mode', 'WNS >= 0 (slack margin per project)'],
          ['Hold', 'Fast (FF-class), each mode', 'WNS >= 0 — hold is frequency-independent'],
          ['Max transition / capacitance', 'All used corners', 'No violations (slew sanity)'],
          ['Clock skew / insertion', 'All corners', 'Within targets'],
          ['SI / crosstalk', 'Worst-case alignments', 'Noise and delta-delay within margin'],
          ['IR drop / EM', 'Power analysis corners', 'Within voltage and current-density limits'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Signing off setup at the slow corner and skipping hold entirely.',
        fix: 'Hold is checked at the FAST corner and is frequency-independent — a hold failure breaks the chip at any clock speed and cannot be fixed in the field. Both extremes, always: slow for setup, fast for hold.',
      },
      {
        mistake: 'Treating sign-off STA as a functional verification.',
        fix: 'STA sees timing, not behavior: a wrong FSM passes STA if it is fast enough. Functional claims come from simulation/formal (this module, lesson 3); the two verdicts are separate and both required.',
      },
      {
        mistake: 'Quoting slack without naming its corner and mode.',
        fix: 'Slack without context is meaningless: +0.11 ns at SS/125 C/func is a different universe from +0.11 ns at TT/25 C. Every timing claim names (design, corner, mode, RC extraction) — the synthetic report\'s header discipline.',
      },
    ],
    guidedPractice: {
      title: 'Corner triage',
      brief:
        'Three findings arrive: (a) setup WNS −0.05 ns at SS/125 C/test mode only; (b) hold WNS −0.03 ns at FF/−40 C; (c) max_transition violated on 4 nets at TT. For each: which check owns it, is frequency reduction a fix, and name the standard repair.',
      starterCode:
        '(a) check: ______  freq fix? ____  repair: ________\n(b) check: ______  freq fix? ____  repair: ________\n(c) check: ______  freq fix? ____  repair: ________',
      expectedBehavior:
        '(a) Setup at slow/test — freq fix technically yes (slows the period) but rarely acceptable; repair: drive/VT upgrade or ECO on that path. (b) Hold at fast — freq fix NO (hold is frequency-independent); repair: delay insertion on the too-fast path. (c) Design-rule check, not a path check — freq fix irrelevant; repair: buffer/driver sizing (queued automatically at P&R usually).',
      hints: [
        'Hold never bends to frequency.',
        'Match the repair to the check\'s physics: delay for hold, speed for setup, sizing for slew.',
        'Mode-only failures still need mode-specific fixes — test logic is real logic.',
      ],
    },
    practiceExercises: [
      {
        title: 'OCV reasoning',
        brief:
          'A path passes with +20 ps slack without OCV; with OCV derating applied, launch data path is derated +3%, capture path −3%. Explain in 3-4 sentences why OCV makes numbers worse and why engineers accept the pessimism.',
        expectedBehavior:
          'OCV models within-die variation: the launch side may be fast while the capture side is slow, so each path element is derated in its harmful direction — setup arrival grows, required shrinks. Engineers accept it because local variation is real silicon statistics; the pessimism buys probability that the path holds across the process spread. Recovering OCV margin casually re-spends that probability.',
        hints: [
          'One die is not uniform — what if launch is fast, capture slow?',
          'Derating is directional: each term moves against you.',
          'The pessimism is purchased statistics, not padding.',
        ],
      },
      {
        title: 'Sign-off claim drafting',
        brief:
          'Write the 5-line "what we can claim" memo for a design that passed the full checklist: timing, DRC, LVS, equivalence — and 3 lines of explicit non-claims.',
        expectedBehavior:
          'Claims: meets timing at stated corners/modes with final RC; meets all physical design rules (DRC); layout matches netlist (LVS); netlist is functionally equivalent to RTL (formal); power/EM within limits. Non-claims: specification correctness (constraints could be wrong), verification completeness (coverage gaps remain possible), manufacturing yield beyond process control.',
        hints: [
          'Each claim is bounded: name the corners, the reference model, the rules deck.',
          'Non-claims point to humans and statistics: spec, coverage, yield.',
          'The memo format forces the honesty this course keeps practicing.',
        ],
      },
    ],
    assessment: {
      title: 'STA sign-off checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why is setup checked at the slow corner and hold at the fast corner?',
          options: [
            'Convention with no physical basis',
            'Setup fails when paths are too SLOW (worst at slow PVT); hold fails when paths are too FAST (worst at fast PVT)',
            'Setup is more important than hold',
            'Fast corners have no setup checks because clocks cannot run there',
          ],
          answer: 'Setup fails when paths are too SLOW (worst at slow PVT); hold fails when paths are too FAST (worst at fast PVT)',
          explanation:
            'Each check is worst-cased at its own extreme: slow process/voltage/temperature maximizes path delay (setup risk), fast minimizes it (hold risk). One-corner analysis leaves the other extreme unchecked.',
          hint: 'Which extreme makes each failure mode likeliest?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A clean sign-off STA report proves the design\'s functionality is correct.',
          answer: 'false',
          explanation:
            'STA is timing-only and stimulus-free: it proves every path meets its constraints at the analyzed corners/modes. Functional correctness comes from simulation and formal verification — a separate verdict.',
          hint: 'What does STA never read — stimulus or expected outputs?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'What makes hold violations uniquely dangerous compared to setup violations?',
          options: [
            'They are harder to detect in reports',
            'They are frequency-independent — lowering the clock does not fix them, and the chip fails at any speed',
            'They only occur at high temperature',
            'They can be fixed by raising the voltage',
          ],
          answer: 'They are frequency-independent — lowering the clock does not fix them, and the chip fails at any speed',
          explanation:
            'Hold is a same-edge check: the required window does not stretch with the period. A hold-failing design is broken at every frequency; fixes are structural (delay insertion), not schedule-friendly.',
          hint: 'Recall the FPGA course\'s identical conclusion.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Three words (or the common acronym): the sign-off discipline that analyzes every (corner, mode) pair, each with its own libraries and constraints.',
          answer: 'multi-corner multi-mode',
          explanation:
            'MCMM crosses PVT corners with operating modes; each pair gets its own libraries, constraints and STA run. (Acronym "MCMM" also accepted.)',
          hint: 'Corners crossed with modes — the flow\'s standard name.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Static timing analysis', definition: 'Exhaustive, stimulus-free timing analysis of every path against constraints.' },
      { term: 'Corner', definition: 'Extreme PVT operating point (process/voltage/temperature) with its own characterized libraries.' },
      { term: 'MCMM', definition: 'Multi-corner multi-mode sign-off: separate analysis per (corner, mode) pair.' },
      { term: 'OCV', definition: 'On-chip variation: derating that models within-die variation pessimistically per path element.' },
      { term: 'Sign-off', definition: 'The final verified state: timing (MCMM), physical (DRC/LVS), power/EM — all clean on final RC.' },
    ],
    revisionSummary: [
      'STA checks every path, statically; it sees timing, never function.',
      'Setup at slow corner (worst-long), hold at fast corner (worst-short); both, always.',
      'MCMM crosses corners with modes — test mode can fail independently of functional mode.',
      'OCV pessimism buys within-die probability; do not casually recover it.',
      'Every slack claim names corner, mode and RC extraction — contextless numbers are noise.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'OpenROAD project', url: 'https://theopenroadproject.org/', kind: 'tool' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlsi-m04-l2',
    title: 'Physical Verification: DRC, LVS and Antenna',
    summary:
      'The geometry-level gate before tape-out: design-rule checking against the foundry deck, layout-versus-schematic proof that the drawing is the netlist, and antenna rules protecting thin oxides during manufacture.',
    objectives: [
      'Define DRC: what rule categories it checks (width, spacing, enclosure, density) and against what authority (the foundry deck).',
      'Define LVS: what it compares (extracted layout netlist vs schematic/netlist) and why equivalence is binary.',
      'Explain the antenna effect: how plasma etching charges unconnected metal and damages gates; the standard fixes (jumpers, diodes).',
      'State the relationship between these checks and tape-out readiness.',
    ],
    whyItMatters:
      'Timing can be "mostly right"; geometry cannot. A single spacing violation can short two nets and kill the die; one disconnected well tap can latch up the chip. DRC and LVS are binary gates — clean or not clean — and foundries refuse GDS that fails them. This lesson is short because the concepts are crisp, and crisp is what sign-off needs.',
    prerequisites: [
      'Routing and physical-only cells (vlsi-m03-l3)',
      'Standard cell views: GDS vs netlist (vlsi-m01-l3)',
      'MOSFET structure (vlsi-m01-l2)',
    ],
    explanation:
      '**Design rule checking (DRC)** verifies the layout geometry against the foundry\'s rule deck — hundreds to thousands of quantitative rules that encode what the process can reliably print: minimum wire width and spacing per layer, via enclosure, well spacing, metal density windows (too little metal causes etch problems; too much causes planarization problems), and orientation/overlap rules for specific structures. The deck is the authority: "it looks fine" is not an argument against a rule. DRC is run hierarchically (cell-level then top-level) because rule checking at billion-polygon scale is a compute problem of its own.\n\n**Layout versus schematic (LVS)** proves the layout *is* the design: from the GDS polygons, tools extract the electrical netlist (which devices exist, how they connect) and compare it — devices, connectivity, and sizes within tolerance — against the reference netlist (the schematic / post-synthesis netlist). LVS is binary: match or mismatch. A mismatch means the drawn chip and the verified design are different chips; there is no "close enough". This closes the loop the course opened in Module 1: one cell design, many views — LVS is the view-consistency proof.\n\n**Antenna rules** protect gates during manufacturing. When metal layers are etched in plasma, exposed conductor *collects charge*; a long metal wire connected to a transistor gate (but not yet connected to any diffusion, at that layer\'s processing step) can accumulate enough charge to force current through the thin gate oxide — damaging the transistor permanently. Antenna rules bound the ratio of metal area (collector) to gate area (protected) per layer. Fixes are structural: **jumpers** (route the wire up to a higher layer and back, breaking the exposed length at the critical step) or **antenna diodes** (small diffusion diodes near the gate to bleed the charge safely).',
    deepDive: '### Density rules: the counterintuitive one\n\nBeginners expect "keep metal apart" rules and are surprised by density windows — rules requiring a *minimum* amount of metal per area. The reason is manufacturing: chemical-mechanical polishing (planarization) and etch rates behave badly on sparse or dense extremes — empty regions polish unevenly, ultra-dense regions etch differently. Hence fillers (vlsi-m03-l3) exist by rule, not preference. The general lesson: every "weird" rule encodes a manufacturing physics story; reading rule decks is reading the process\'s autobiography.\n\n### Why foundries refuse to ignore a failed DRC\n\nThe rule deck is the foundry\'s statistical warranty: yield and reliability claims hold only for layouts inside the rules. A tape-out with waivers on marginal rules shifts risk onto the designer — sometimes acceptably (a one-off research chip), never silently. Professional practice documents every waiver with its justification and owner, because an undocumented waiver is a landmine for the next revision.',
    examples: [
      {
        title: 'The three checks as a sign-off triad (worked reading)',
        language: 'text',
        code:
          '== SYNTHETIC PHYSICAL VERIFICATION SUMMARY (illustrative) ==\n\nDRC (deck: foundry X 28nm rev 3.1):\n  total violations : 0   (waivers: 0)\n  checks run       : width, spacing, enclosure, via, density,\n                     antenna (see below), well/substrate\n\nLVS:\n  devices compared : 48,112 vs 48,112       MATCH\n  nets compared    : 21,907  vs 21,907      MATCH\n  device sizes     : within tolerance       MATCH\n  verdict          : LVS CLEAN\n\nANTENNA (per-layer ratios, worst 5 reported):\n  M3  ratio 142 (limit 400)   OK\n  M4  ratio 380 (limit 400)   OK   <- was 610, fixed by jumper\n  M5  ratio 210 (limit 400)   OK\n  ...\n  fixes used  : 1 jumper (M4), 0 antenna diodes\n\nVERDICT: DRC clean + LVS clean + antenna clean = tape-out ready\n(remaining sign-off: timing per vlsi-m04-l1, power/EM).',
        explanation: [
          'DRC reports against a named deck revision — rules are versioned like libraries, and the summary says which authority was obeyed.',
          'LVS reports device and net COUNTS as evidence, then the binary verdict: the extracted-from-polygons chip equals the reference netlist exactly.',
          'Antenna reporting shows the failure mode and its fix concretely: M4 at ratio 610 over limit 400 was repaired with a jumper (break the exposed length at the critical step) and re-checked to 380.',
          'The triad verdict line ties this lesson to the flow: DRC + LVS + antenna clean makes the geometry tape-out ready; timing (vlsi-m04-l1) and power checks complete sign-off.',
          'All numbers synthetic and labeled; the reading discipline — named deck, counts, per-rule limits — is the transferable part.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The antenna effect in one picture',
        content:
          '  DURING METAL ETCH (plasma):\n\n    long M4 wire (not yet connected to diffusion)\n    ================================\\\n                                      \\ (collects charge)\n                                       |\n                                    [GATE] <- thin oxide:\n                                             charge forces current\n                                             through it -> damage\n\n  FIX 1: jumper — break the exposed length:\n    ========== up to M6 ==========\n              |            (M4 segment at risk is short)\n  FIX 2: antenna diode near the gate — bleeds charge to diffusion',
        caption:
          'Charge collects on unconnected metal during etch; the gate oxide is the victim. Jumpers and diodes are the two standard repairs.',
      },
    ],
    tables: [
      {
        caption: 'DRC rule categories and their manufacturing reasons',
        headers: ['Rule class', 'Example', 'Why it exists'],
        rows: [
          ['Width/spacing', 'min M1 width 0.06 um, spacing 0.06 um', 'Printability (lithography, etch)'],
          ['Enclosure/overlap', 'via must be enclosed by metal on all sides', 'Contact reliability'],
          ['Density windows', 'metal fill per 100x100 um within 20-80%', 'Polishing/etch uniformity'],
          ['Well/substrate', 'tap spacing, well distance', 'Latch-up prevention, bias integrity'],
          ['Antenna', 'metal-area/gate-area ratio per layer', 'Gate-oxide charge protection'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Treating DRC as "the tool being picky" and waiving violations casually.',
        fix: 'Each rule encodes manufacturing physics the foundry\'s yield warranty depends on. Waivers are documented exceptions with owners and justification — never noise to click through.',
      },
      {
        mistake: 'Assuming LVS is a formality because "synthesis built it".',
        fix: 'LVS compares the final drawn polygons — after P&R edits, ECOs, fillers and routing fixes — against the netlist. Any hand-edit or tool bug in between breaks it; that is precisely why the check exists and is run at the end.',
      },
      {
        mistake: 'Fixing an antenna violation by deleting the wire\'s upper layer.',
        fix: 'Deletion changes connectivity and will fail LVS. The repairs are jumpering (reroute through a higher layer to break the exposed run) or adding an antenna diode — both preserve the netlist, which LVS then confirms.',
      },
    ],
    guidedPractice: {
      title: 'Triage three physical verification findings',
      brief:
        'For each finding, name the check that owns it and the standard fix: (a) two M2 wires 0.04 µm apart where the deck requires 0.06 µm; (b) extracted layout shows a NAND2 with its B input tied to GND while the netlist has it on a signal; (c) M5 antenna ratio 720 against a 400 limit on a long clock trunk.',
      starterCode:
        '(a) check: ______ fix: ______\n(b) check: ______ fix: ______\n(c) check: ______ fix: ______',
      expectedBehavior:
        '(a) DRC spacing — reroute/spread the wires to legal spacing (router fix). (b) LVS mismatch — find where the polygon/net diverged (routing short or ECO error) and repair so layout matches netlist; never "fix" by editing the netlist to match a bug. (c) Antenna — insert a jumper (break the exposed run via a higher layer) or add an antenna diode near the driven gates, then re-run the ratio check.',
      hints: [
        '(a) is geometry-only; (b) is connectivity; (c) is manufacturing-step charge.',
        'LVS is binary: the layout must come to the netlist, not vice versa.',
        'Antenna fixes preserve connectivity — that is what distinguishes them from deletion.',
      ],
    },
    practiceExercises: [
      {
        title: 'Density window reasoning',
        brief:
          'A sparse die region fails the metal density rule (12% metal where 20-80% is required). Explain why the fix is filler metal (and what kind), and why simply routing useless wires there would be wrong.',
        expectedBehavior:
          'Fillers — dummy metal shapes unconnected to any net, added per the fill engine — raise density to the window while staying electrically inert (they add some coupling cap, which extraction and SI analysis must re-run for). Routing real but useless wires changes connectivity, complicates LVS/congestion, and misleads every downstream consumer — fill is the purpose-built mechanism.',
        hints: [
          'Density is about geometry statistics, not connectivity.',
          'Dummy shapes must stay electrically inert — who re-checks their coupling?',
          'Purpose-built tools exist for purpose-built problems.',
        ],
      },
      {
        title: 'Waiver discipline memo',
        brief:
          'A one-off research chip has one DRC spacing violation that would cost a two-day re-route to fix; the team considers waiving it. Write the 4-item waiver record that makes this defensible — and the one case where waiving would be indefensible.',
        expectedBehavior:
          'Record: rule ID and deck revision; exact location/extent; justification (why risk is accepted for this product\'s volume/lifetime); owner and re-review trigger for the next revision. Indefensible: waiving on a high-volume or reliability-critical product where the rule\'s failure mode (shorts, latch-up) compounds across millions of units.',
        hints: [
          'A waiver transfers risk — name who accepts it.',
          'Volume changes the risk arithmetic, not the rule.',
          'Undocumented waivers are landmines for the next revision.',
        ],
      },
    ],
    assessment: {
      title: 'Physical verification checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What authority does DRC check the layout against?',
          options: [
            'The synthesis netlist',
            'The foundry\'s rule deck — quantitative manufacturing rules for the process',
            'The Liberty file',
            'The SDC constraints',
          ],
          answer: "The foundry's rule deck — quantitative manufacturing rules for the process",
          explanation:
            'DRC verifies geometry (width, spacing, enclosure, density, antenna, wells) against the process\'s rule deck — the foundry\'s printable/reliable envelope, versioned like any other contract document.',
          hint: 'Who warrants that the chip can be built?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'LVS compares the netlist extracted from the layout polygons against the reference netlist — devices and connectivity must match exactly.',
          answer: 'true',
          explanation:
            'LVS extracts the electrical netlist from the drawn geometry and proves it equals the reference (schematic/synthesis netlist): device types/counts, connectivity, and sizes within tolerance. Verdict is binary.',
          hint: 'Which two netlists meet in LVS?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Why do antenna rules exist?',
          options: [
            'To improve wireless performance of the chip',
            'Plasma etching charges unconnected metal; the collected charge can force current through and damage thin gate oxides',
            'To reduce metal density in upper layers',
            'To prevent electromigration in clock trunks',
          ],
          answer: 'Plasma etching charges unconnected metal; the collected charge can force current through and damage thin gate oxides',
          explanation:
            'During etch, exposed conductors collect charge; a long wire attached to a gate but not yet to diffusion can dump that charge through the gate oxide. Rules bound the metal/gate area ratio; jumpers and diodes fix violations.',
          hint: 'It happens during manufacturing, to the gate oxide.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the DRC rule class requiring a minimum and maximum amount of metal per area, satisfied by filler shapes.',
          answer: 'density rules',
          explanation:
            'Density windows keep polishing and etch uniform across the die; too-sparse regions get dummy-metal fill (electrically inert), too-dense regions get thinned by the router.',
          hint: 'It is about how much metal per area, not how close.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'DRC', definition: 'Design rule check: geometry vs the foundry deck — width, spacing, enclosure, density, wells, antenna.' },
      { term: 'LVS', definition: 'Layout versus schematic: extracted-from-polygons netlist must equal the reference netlist, exactly.' },
      { term: 'Antenna rule', definition: 'Bound on metal-area/gate-area ratio per layer to prevent etch-charge gate-oxide damage.' },
      { term: 'Jumper', definition: 'Antenna fix: reroute a segment through a higher layer, breaking the exposed run at the critical step.' },
      { term: 'Waiver', definition: 'A documented, owned exception to a specific rule — a risk transfer, never a default.' },
    ],
    revisionSummary: [
      'DRC: geometry vs foundry deck; every rule encodes manufacturing physics.',
      'LVS: binary proof that the drawn chip IS the verified netlist.',
      'Antenna: etch-charge vs gate oxide; fixes are jumpers or diodes, never deletion.',
      'Density windows are why filler cells exist — geometry statistics, not connectivity.',
      'DRC + LVS + antenna clean = geometry tape-out ready; timing and power sign-off complete the verdict.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Design rule checking', url: 'https://en.wikipedia.org/wiki/Design_rule_checking', kind: 'article' },
      { label: 'Wikipedia — Layout versus schematic', url: 'https://en.wikipedia.org/wiki/Layout_versus_schematic', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'vlsi-m04-l3',
    title: 'Verification Strategy, Power Intent, Open-Source EDA and Tape-Out Reality',
    summary:
      'The closing survey: why verification dominates ASIC effort (and UVM), low-power design intent (domains, isolation, UPF), the honest open-source-vs-commercial EDA map, and what tape-out and MPW shuttles actually are.',
    objectives: [
      'Explain why verification consumes the majority of ASIC project effort and name its pillars (simulation, formal, emulation, coverage).',
      'Describe power-intent concepts: power domains, isolation, level shifters, retention, and the UPF/CPF description layer.',
      'Map the EDA landscape honestly: what OpenROAD/Yosys-class open flows can and cannot do versus commercial suites.',
      'Describe tape-out and MPW shuttles (Tiny Tapeout-style) as the realistic path a learner\'s design reaches silicon.',
    ],
    whyItMatters:
      'This lesson is the map you will actually navigate by: projects live and die in verification; low-power intent shapes netlists from synthesis onward; and "how would I ever get a chip made?" has a concrete, current answer via open tools and shuttle programs. It also draws the honesty line this course has repeated — what is conceptual here versus what is real in industry — one last time, with specifics.',
    prerequisites: [
      'Sign-off timing and physical verification (vlsi-m04-l1, vlsi-m04-l2)',
      'The full flow (vlsi-m03-l3)',
      'CDC basics (fpga-m05-l3)',
    ],
    explanation:
      '### Verification dominates, on purpose\n\nA mask set is unpatchable: every functional bug that reaches silicon is permanent. The industry\'s response is to spend more engineering effort on verification than on design — commonly cited at well over half of project effort, and often much more on large SoCs. The pillars: **simulation** with constrained-random stimulus and self-checking environments (UVM — Universal Verification Methodology — is the standard framework for structuring these); **formal verification** (model checking, equivalence checking) proving properties or transform-equality exhaustively; **emulation/prototyping** putting the RTL on huge reconfigurable hardware to run real software at near-real speed; and **coverage metrics** (code, functional, assertion) measuring what was actually exercised. The discipline is closing coverage and failing nothing — not "ran some tests".\n\n### Power intent: telling the flow about the power architecture\n\nModern chips power regions down when idle. This is described in a **power intent** format — UPF (Universal Power Format) or CPF — that tells the flow: which **power domains** exist, which are switchable; where **isolation cells** clamp outputs of off-domains; where **level shifters** bridge voltage differences; which registers need **retention** (state saved through power-down); and where **power switches** gate the supply. The flow then *inserts* these structures and verifies them (power-aware simulation, UPF checks). Power intent is architecture expressed as data — one more abstraction layer that every tool consumes.' +
      '\n\n' +
      '### The EDA landscape, honestly\n\nCommercial suites (Synopsys, Cadence, Siemens EDA) own the leading edge: deepest node support, sign-off-grade STA/physical verification, formal power analysis. **Open-source EDA** is real and growing: Yosys (synthesis), OpenROAD (automated RTL-to-GDS: floorplan through route), OpenSTA (timing), KLayout (viewing/geometry scripting). Openflows have produced genuine tape-outs — chiefly through accessible shuttle programs on mature/older nodes — and are excellent for *learning the flow honestly*. The honest boundary: node coverage, characterization quality, capacity on multi-billion-gate designs, and sign-off acceptance at leading foundries remain commercial-tool territory. Learning the flow open-source is not a downgrade of understanding; it is a different (more transparent) instrument for the same concepts this course teaches.\n\n### Tape-out and shuttles\n\n**Tape-out** is the handoff of final GDS to the foundry, which builds masks (a dominant cost) and fabricates. A **multi-project wafer (MPW) shuttle** amortizes mask cost across many designs sharing a wafer — the historical university path, now industrialized by community programs (Tiny Tapeout is the well-known small-design format; availability and nodes change, so check current programs). For a learner, the realistic path is: open flow (Yosys+OpenROAD) -> MPW shuttle on an accessible node -> real silicon back in weeks-to-months at modest cost. Everything conceptual in this course becomes physical there — which is the honest, hopeful note to close on.',
    deepDive: '### Coverage closure is the actual finish line\n\n"Verification is done" has a technical meaning: coverage goals met (every line, FSM arc, functional scenario, and assertion exercised) with zero open failures, across regressions large enough to be statistically boring. Coverage is what converts "we tested a lot" into an auditable claim — and its gaps are prioritized by risk, not by count: an unexercised arbitration corner matters more than a thousand redundant FIFO tests. The same honesty standard appears on the power side: power-aware verification (UPF-aware simulation) must *show* the off-domains actually clamp and restore — intent files without verification are wishes.\n\n### Choosing your instrument: the course\'s final honesty statement\n\nThis course taught the flow conceptually — no netlists were synthesized, no layouts routed, nothing taped out, and every report shown was labeled synthetic. That was the honest way to learn the *shape*. The recommended next steps, in order: (1) run the open flow (Yosys + OpenROAD) on a small design to make every stage concrete; (2) target an MPW-style shuttle if you want silicon; (3) treat commercial tool experience as an employer-provided skill later — the concepts transfer wholesale, and this course\'s vocabulary is the transferable part.',
    examples: [
      {
        title: 'A learner\'s realistic path from this course to real silicon',
        language: 'text',
        code:
          'STEP 0 (this course): concepts — flow, corners, DRC/LVS, power intent.\n        No tools were run here; every report was synthetic and labeled.\n\nSTEP 1: open flow, small design (e.g., a UART or the MAC from m02)\n  RTL -> Yosys (synthesis, .lib from an open PDK)\n      -> OpenROAD (floorplan, place, CTS, route)\n      -> OpenSTA (multi-corner-ish timing) + KLayout (view/DRC scripts)\n  OUTPUT: a real GDS you can look at. Honest scale: small designs,\n  mature nodes, learning-grade sign-off.\n\nSTEP 2: MPW shuttle (e.g., Tiny Tapeout-style program)\n  - many designs share one wafer -> mask cost shared\n  - fixed footprint/tile format -> your design gets a tile\n  - foundry builds masks, fab runs, boards come back\n  - check CURRENT programs/nodes/costs — they change\n\nSTEP 3 (employment): commercial tools at a company\n  - same flow shape, industrial depth: sign-off STA, DRC decks,\n    formal power, huge capacity\n  - what transfers 100%: the vocabulary and mental model\n    from this course.',
        explanation: [
          'Step 0 restates the course honesty: conceptual learning, synthetic reports, nothing fabricated claimed.',
          'Step 1 names real open tools per stage (Yosys, OpenROAD, OpenSTA, KLayout) and states the honest scale: learning-grade sign-off on accessible nodes, not leading-edge production.',
          'Step 2 explains the MPW economics in two lines (shared mask cost, tiled format) and explicitly tells the learner to check current program details — availability is time-sensitive.',
          'Step 3 closes the loop: commercial depth is real and employer-scale, and the transferable asset is the mental model this course built.',
          'The example is a plan, not a claim: nothing here says the platform ran any of it.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Power intent: what the UPF describes',
        content:
          '        +---------------------------+   always-on domain\n        |  PMC, clocks, retention   |\n        +-------------+-------------+\n                      |  isolation + level shifter\n        +-------------v-------------+\n        |  SWITCHABLE DOMAIN        |  power switch (header/footer)\n        |  [ logic that sleeps ]    |\n        +---------------------------+\n\n  UPF declares: domains, switchable?, supplies, isolation\n  strategy, level-shifter strategy, retention registers.\n  The flow INSERTS these cells; verification PROVES the\n  off-domain clamps and restores.',
        caption:
          'Power intent is architecture as data: a file describing domains and strategies, which the flow implements and verification proves.',
      },
    ],
    tables: [
      {
        caption: 'Verification pillars and what each proves',
        headers: ['Pillar', 'Method', 'Proves'],
        rows: [
          ['Simulation + UVM', 'Constrained-random, self-checking TBs, regressions', 'Stimulated behaviors are correct (bounded by stimulus)'],
          ['Formal', 'Exhaustive property/model checking, equivalence', 'Properties hold for ALL inputs (unbounded proof)'],
          ['Emulation / prototyping', 'RTL on reconfigurable hardware at speed', 'Real software runs; system-level bugs surface'],
          ['Coverage', 'Code/functional/assertion metrics', 'What was exercised — the auditability of "done"'],
        ],
      },
      {
        caption: 'Open vs commercial EDA, honestly',
        headers: ['Dimension', 'Open (Yosys/OpenROAD/OpenSTA/KLayout)', 'Commercial suites'],
        rows: [
          ['Flow coverage', 'RTL->GDS real on accessible nodes', 'Full leading-edge, all stages'],
          ['Sign-off grade', 'Learning-grade; check per foundry', 'Foundry-accepted sign-off'],
          ['Capacity', 'Small/mid designs', 'Multi-billion-gate SoCs'],
          ['Cost/transparency', 'Free, scriptable, transparent', 'Licensed, deep support'],
          ['Best use for a learner', 'Make every stage concrete', 'Later, employer-provided'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Planning verification as "write tests after the RTL works".',
        fix: 'Verification is co-designed: testbench architecture, stimulus strategy and coverage plan exist before RTL stabilizes, because the mask is unpatchable. Budget verification as the majority effort — the industry does, for good reason.',
      },
      {
        mistake: 'Treating a UPF file as documentation only.',
        fix: 'Power intent is executable flow data: tools insert isolation, switches, retention from it, and power-aware verification must prove clamp/restore behavior. An unverified UPF is a wish, not a design.',
      },
      {
        mistake: 'Claiming open-source tools "cannot make real chips" or, oppositely, that they are ready for leading-edge sign-off.',
        fix: 'Both claims fail honesty: open flows have produced real tape-outs (chiefly via shuttles on accessible nodes) while leading-edge sign-off remains commercial-tool territory. State the scope — node, grade, capacity — with every comparison.',
      },
    ],
    guidedPractice: {
      title: 'Plan verification for a small SoC block',
      brief:
        'You must verify a SPI peripheral (modes 0-3, FIFOs, interrupt logic). Draft the verification plan skeleton: 4 UVM-style components, 2 properties suited to formal (not simulation), and the 3 coverage metrics you would close.',
      starterCode:
        'UVM components: 1) ______  2) ______  3) ______  4) ______\nFormal properties: 1) ______  2) ______\nCoverage: 1) ______  2) ______  3) ______',
      expectedBehavior:
        'Components: driver (SPI master stimulus per mode), monitor (protocol checker on the wire), scoreboard (expected-vs-actual data model), sequencer/tests (constrained-random mode/FIFO scenarios). Formal properties: FIFO never overflows when writes are throttled per spec; CS deassertion always ends a frame cleanly (no partial-word states reachable). Coverage: code (line/branch), functional (mode × FIFO states × interrupt cases), assertion coverage (each protocol assertion fired at least once).',
      hints: [
        'UVM roles: stimulate, observe, predict, orchestrate.',
        'Formal loves small, local, forever-properties — pick those.',
        'Coverage is the audit: name metrics, not vibes.',
      ],
    },
    practiceExercises: [
      {
        title: 'Power intent audit',
        brief:
          'A switchable domain feeds an always-on block. The UPF declares isolation but no level shifters; both domains run at the same rail. Is anything missing? Now suppose the switchable domain drops to 0.7 V. What changes?',
        expectedBehavior:
          'Same rail: isolation suffices (clamp the off-domain\'s outputs so the always-on side never floats) — nothing missing, assuming retention is not needed. At 0.7 V: level shifters become REQUIRED on every crossing (0.7 V logic cannot reliably drive 0.9 V inputs), plus power-aware verification of both structures, plus timing analysis at the reduced-rail corner for the domain.',
        hints: [
          'Isolation solves the float; level shifting solves the voltage mismatch — different problems.',
          'Check both directions of every crossing.',
          'Lower rails also change timing corners for that domain.',
        ],
      },
      {
        title: 'Tool-choice memo',
        brief:
          'Your team must pick an instrument for (a) teaching the flow to new grads, (b) a 20-billion-gate SoC tape-out. Write the recommendation per case with one honesty sentence each about scope.',
        expectedBehavior:
          '(a) Open flow (Yosys + OpenROAD + OpenSTA + KLayout): transparent, free, every stage visible — honest scope: accessible nodes, learning-grade sign-off, small/mid designs. (b) Commercial suite: foundry-accepted sign-off, leading-node libraries, capacity — honest scope: licensed cost and opacity; the flow shape is the same one the grads already learned.',
        hints: [
          'Match the instrument to the decision, not to ideology.',
          'Both honesty sentences should name scope limits.',
          'Note that (a)\'s skills transfer to (b) — that is the pedagogical point.',
        ],
      },
    ],
    assessment: {
      title: 'Verification, power and tape-out checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why does verification dominate ASIC project effort?',
          options: [
            'Verification tools are slower than synthesis tools',
            'A mask set cannot be patched — every functional bug reaching silicon is permanent, so bugs must be prevented pre-tape-out',
            'Verilog is harder to write than to verify',
            'Foundries require verification reports by law',
          ],
          answer: 'A mask set cannot be patched — every functional bug reaching silicon is permanent, so bugs must be prevented pre-tape-out',
          explanation:
            'Silicon is unpatchable, so effort shifts upstream: simulation (UVM), formal, emulation and coverage collectively spend more engineering than design itself on serious projects.',
          hint: 'Recall what makes tape-out the point of no return.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A UPF power-intent file is documentation only; the tools discover isolation and level-shifter needs on their own.',
          answer: 'false',
          explanation:
            'UPF/CPF is executable flow data: tools insert isolation cells, power switches, level shifters and retention from it, and power-aware verification proves the strategy. Without the file, the flow does not know the architecture.',
          hint: 'Who tells the flow where the domains are?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'What is an MPW (multi-project wafer) shuttle?',
          options: [
            'A verification service that emulates multiple designs at once',
            'A fabrication run where many designs share one wafer and its mask cost',
            'A commercial EDA license tier for startups',
            'A test chip the foundry builds to calibrate new nodes',
          ],
          answer: 'A fabrication run where many designs share one wafer and its mask cost',
          explanation:
            'MPW shuttles amortize mask cost across many small designs — the realistic, affordable path for learners and low-volume projects to reach real silicon (community programs like Tiny Tapeout industrialize it; check current offerings).',
          hint: 'Sharing is the entire economic point.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: the open-source, end-to-end RTL-to-GDS physical implementation platform named in this course.',
          answer: 'OpenROAD',
          explanation:
            'OpenROAD automates floorplanning through routing on open PDKs, paired with Yosys (synthesis) and OpenSTA (timing) — the transparent instrument for making every flow stage concrete.',
          hint: 'It was cited in the physical-design lessons too.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'UVM', definition: 'Universal Verification Methodology: the standard framework for structured, reusable simulation environments.' },
      { term: 'Functional coverage', definition: 'Metrics of which scenarios/behaviors were exercised — the auditable definition of verification progress.' },
      { term: 'UPF', definition: 'Universal Power Format: the power-intent description (domains, isolation, retention) consumed by the whole flow.' },
      { term: 'Power domain', definition: 'A region of logic sharing controllable supplies — always-on or switchable.' },
      { term: 'MPW shuttle', definition: 'Multi-project wafer run: many designs share mask/fab cost — the accessible path to real silicon.' },
    ],
    revisionSummary: [
      'Verification dominates effort because silicon is unpatchable; pillars: simulation/UVM, formal, emulation, coverage.',
      'Coverage closure is the finish line — auditable exercise, prioritized by risk.',
      'Power intent (UPF/CPF) declares domains, isolation, level shifters, retention; flow inserts, verification proves.',
      'Open EDA (Yosys, OpenROAD, OpenSTA, KLayout) is real and end-to-end on accessible nodes; leading-edge sign-off stays commercial.',
      'Tape-out hands GDS to the foundry; MPW shuttles are the honest learner path to physical silicon.',
    ],
    furtherReading: [
      { label: 'OpenROAD project', url: 'https://theopenroadproject.org/', kind: 'tool' },
      { label: 'Wikipedia — Universal Verification Methodology', url: 'https://en.wikipedia.org/wiki/Universal_Verification_Methodology', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
