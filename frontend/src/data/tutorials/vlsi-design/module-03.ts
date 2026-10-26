import type { TutorialLesson } from '../types';

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'vlsi-m03-l1',
    title: 'Floorplanning and Power Planning',
    summary:
      'The first physical decisions: die vs core, utilization targets, row structure, macro placement, pin placement — and the power distribution network (rings, straps, rails) that keeps every cell powered with acceptable IR drop.',
    objectives: [
      'Define die, core, rows/sites, and compute utilization from cell area and core area.',
      'Place macros and pins deliberately: adjacency to consumers, pin access, channel planning.',
      'Describe the power distribution network: rings, straps, standard-cell rails, and why IR drop and electromigration constrain it.',
      'Explain why floorplanning errors are the most expensive physical-design mistakes to discover late.',
    ],
    whyItMatters:
      'Floorplanning sets the geometry every later stage inherits. A bad macro placement produces routing congestion no router can fully repair; an under-built power network produces IR-drop failures that appear only at sign-off. Floorplanning is where seconds of decision buy — or cost — weeks: it is the highest-leverage, least-automatable stage of the flow.',
    prerequisites: [
      'Standard cells and rows (vlsi-m01-l3)',
      'Synthesis output: netlist with area (vlsi-m02-l3)',
    ],
    explanation:
      'Physical design begins with geometry. The **die** is the whole chip rectangle (including pad ring / I/O area); the **core** is the region where standard cells may live. **Utilization** = total cell area ÷ core area; typical targets are 60-80% — the headroom is not waste but the space routing needs. Over 85% or so, routing becomes the bottleneck and timing closure suffers; the 80% rule from the FPGA course reappears here for the same reason (congestion grows nonlinearly).\n\nThe core is tiled into **rows** (also called cell sites): horizontal strips of fixed height matching the standard cells\' height, with alternating power rails (VDD/GND) so every cell placed in a row connects to power automatically. Cells "legalize" onto row/site grid positions.\n\n**Macro placement**: large fixed blocks — RAMs, PLLs, analog IP — are placed first, because everything else must route around them. Deliberate placement puts each macro near its consumers (a memory near the datapath that reads it), leaves **pin access** channels on the correct sides, and avoids slicing the core into unroutable corridors. Macros are essentially obstacles with opinions.\n\n**Pin placement**: block I/O pins (and pad ring connections) are assigned to die edges to shorten top-level routes and avoid crossing the die.\n\n### Power planning\n\nEvery cell needs robust VDD/GND. The **power distribution network (PDN)** is built as: a **core ring** around the die periphery, vertical/horizontal **straps** spanning the core on upper metal layers, and the per-row **rails** that standard cells snap into. The network is sized by two failure modes: **IR drop** (current through finite-resistance rails lowers local VDD, slowing nearby cells — timing becomes location-dependent) and **electromigration** (high current density physically displaces metal atoms over time, permanently voiding wires — a reliability lifetime limit). Both are checked with specialized analysis against current estimates.',
    deepDive: '### Why floorplan mistakes are the expensive kind\n\nMost physical-design stages are re-runnable in hours: placement, CTS, routing can all be regenerated. The floorplan is different because everything downstream *conditions* on it: a macro moved by 200 µm invalidates placement, clock trees, buffered routes and extraction. The economics of experience: an extra day spent on floorplan review (macro adjacency, channel widths, strap density, pin plan) routinely saves weeks of late-stage congestion fighting. Symptoms of a bad floorplan are distinctive — routability "hot spots", timing paths that no amount of cell upgrading can fix because the wire delay dominates, power straps that starve a corner of the die — and all of them are cheaper to prevent than to cure.\n\n### Utilization, honestly framed\n\n"Target utilization 70%" is a starting heuristic, not a law. The right number depends on what the design contains: macro-heavy designs need lower effective utilization around each macro (keep-out zones and pin channels consume area invisibly); routing-layer-rich modern processes tolerate higher utilization. The honest practice: floorplan, run a trial place-and-route early ("smoke test"), and let congestion maps — not intuition — adjust the number.',
    examples: [
      {
        title: 'A floorplan in numbers (conceptual worked example)',
        language: 'text',
        code:
          'SYNTHESIS INPUTS (from vlsi-m02-l3 synthetic report):\n  total cell area = 35,390 um2   (includes one 21,000 um2 RAM macro)\n\nFLOORPLAN DECISIONS:\n  target utilization (std cells) : 70%\n  std-cell area                  = 35,390 - 21,000 = 14,390 um2\n  core area needed               = 14,390 / 0.70 ~= 20,557 um2\n                                   (e.g., ~143 x 143 um)\n  + macro keep-out + pin channels -> final core ~ 165 x 165 um\n\nMACRO PLACEMENT:\n  RAM 512x32: left-center; its 32 data pins face the MAC datapath;\n  read/write control faces the sequencer; top edge kept clear for\n  the clock-tree spine and a horizontal strap channel.\n\nPOWER NETWORK:\n  core ring: 2 metals, both rails\n  vertical straps: every ~40 um on top metal (M9)\n  horizontal straps: every ~50 um on M8\n  row rails: standard M1 rails at row pitch\n  checks queued: IR drop < spec, EM current density < spec\n\nDIE: adds pad ring / I/O area around the core (size set by\n     pin count and pad pitch, not by the core).',
        explanation: [
          'Utilization arithmetic: only the standard-cell area participates in the 70% target; the macro is placed, not tiled — which is why core sizing separates the two areas.',
          'The keep-out and channel allowances are the honest gap between the naive 20,557 µm² and the final 165×165 core: geometry needs room for access, not just area.',
          'Macro placement is expressed as *intent* — pins facing consumers, edges reserved — because that intent is what placement and routing will exploit or miss.',
          'The PDN description names all three tiers (ring, straps, rails) and the two checks (IR drop, electromigration) that size them; both checks are real sign-off analyses.',
          'The die is sized by I/O, not logic: pad count and pitch can dominate a small design\'s die — a classic beginner surprise.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Floorplan anatomy',
        content:
          ' +--------------------------------------------------+ \n |  PAD RING (I/O cells around the die edge)         |\n |  +--------------------------------------------+  |\n |  | CORE RING (VDD/GND straps)                 |  |\n |  |  +--------------------------------------+  |  |\n |  |  | ROWS: |||||||||||||||||||||||||||||  |  |  |\n |  |  |       ||||||  +--------+  ||||||||||  |  |  |\n |  |  |       ||||||  | MACRO  |  ||||||||||  |  |  |\n |  |  |       ||||||  | (RAM)  |  ||||||||||  |  |  |\n |  |  |       ||||||  +--------+  ||||||||||  |  |  |\n |  |  |       (std cells legalize onto sites)   |  |  |\n |  |  +--------------------------------------+  |  |\n |  +--------------------------------------------+  |\n +--------------------------------------------------+\n vertical straps (top metal) cross the core; row rails (M1)\n feed every cell automatically.',
        caption:
          'Three nested regions — die, core, rows — plus the macro as a planned obstacle and the power network as a three-tier grid.',
      },
    ],
    tables: [
      {
        caption: 'Floorplanning decisions and their downstream victims',
        headers: ['Decision', 'Made by', 'Fails later as'],
        rows: [
          ['Core size / utilization', 'Floorplan', 'Congestion, unroutable hot spots'],
          ['Macro placement + keep-outs', 'Floorplan + designer intent', 'Wire-dominant timing, blocked channels'],
          ['Pin/pad plan', 'Floorplan + system', 'Top-level detours, pin-access failures'],
          ['PDN density', 'Power planning', 'IR-drop timing loss, EM lifetime failures'],
          ['Row structure', 'Library (fixed height)', '— (inherited, not chosen)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Chasing 90% utilization to "save die area".',
        fix: 'Above roughly the mid-80s%, routing and timing degrade nonlinearly; the saved area is repaid with congestion closures that cost weeks. Start at 60-80% and let an early trial route move the number with evidence.',
      },
      {
        mistake: 'Placing macros by symmetry ("it looks organized") instead of by dataflow.',
        fix: 'Macro value is adjacency: pins facing their consumers, keep-outs honored, channels on used edges. Symmetric placement that doubles a bus\'s wire length guarantees wire-dominant paths that no cell upgrade can fix.',
      },
      {
        mistake: 'Treating the power network as "whatever default the tool builds".',
        fix: 'Strap density and width are engineering choices sized by current: a corner-starved PDN shows up as IR-drop timing loss or electromigration failures at sign-off — far from where the mistake was made. Review the PDN with the power estimates, not with defaults.',
      },
    ],
    guidedPractice: {
      title: 'Size the core',
      brief:
        'A design synthesizes to 22,000 µm² of standard cells and 3 macros totaling 18,000 µm². Target 70% std-cell utilization; each macro needs a 5 µm keep-out on all sides (macros are 60×40, 50×50, and 40×30 µm). Estimate the core area, including keep-out allowance, and state the utilization the macros alone consume.',
      starterCode:
        'std cells: 22,000 -> core at 70% = ______ um2\nmacro areas: ______ um2 total\nkeep-out allowance: ______ um2 (approximate)\ncore estimate: ______ um2',
      expectedBehavior:
        'Std-cell core at 70%: 22,000/0.70 ≈ 31,429 µm². Macro footprint 18,000 µm²; keep-outs add roughly perimeter×5 per macro (≈ (200+180+140)×5 ≈ 2,600 µm²). Combined need ≈ 31,429 + 18,000 + 2,600 ≈ 52,000 µm². Macros alone consume 18,000/52,000 ≈ 35% of the core. The lesson: keep-outs and channel allowances are real area, and macro-heavy designs push effective utilization well above the std-cell target.',
      hints: [
        'Only std cells divide by the utilization target.',
        'Keep-out ≈ 5 µm × macro perimeter, summed.',
        'Report both utilizations: cells-only and total.',
      ],
    },
    practiceExercises: [
      {
        title: 'IR drop reasoning',
        brief:
          'A die corner shows 60 mV of IR drop (local VDD 0.84 V on a 0.90 V rail). Cells there slow down. Explain in 3-4 sentences why this becomes a *timing* problem and not just a power problem, and name the two fixes (one in the PDN, one in the flow).',
        expectedBehavior:
          'Cell delay tables assume nominal VDD; lower local supply slows every nearby gate, so paths in that corner lose margin — timing becomes location-dependent and sign-off STA (with voltage-drop aware analysis) fails those paths. Fixes: PDN — densify/widen straps toward the corner (more metal, less resistance); flow — reduce current (clock gating, lower activity) or add margin via the corner/voltage-drop analysis in sign-off.',
        hints: [
          'Delay tables are indexed by voltage corner — lower V, slower cell.',
          'The failure appears in STA, far from the power domain.',
          'Both a physical fix and an activity fix are legitimate.',
        ],
      },
      {
        title: 'Macro adjacency review',
        brief:
          'A RAM macro feeding a datapath was placed with its data pins facing away from the datapath, "because the keep-out fit better there". Write the 3-bullet review you would give: the routing consequence, the timing consequence, and the correct placement principle.',
        expectedBehavior:
          'Routing: the 32-bit bus wraps around the macro or crosses channels — length, congestion, possible DRC pressure. Timing: wire delay dominates those paths and cell upgrades cannot recover it; the bus may miss timing or need extra pipeline stages (latency change). Principle: place macros by dataflow adjacency — pins facing consumers, keep-outs on unused edges, channels where traffic flows.',
        hints: [
          'Wire delay is real delay — where does it dominate?',
          'Bus length is a per-bit multiplier.',
          'The principle sentence is the deliverable.',
        ],
      },
    ],
    assessment: {
      title: 'Floorplanning checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Utilization is defined as:',
          options: [
            'die area ÷ core area',
            'total standard-cell area ÷ core area',
            'routed wire length ÷ core area',
            'macro area ÷ die area',
          ],
          answer: 'total standard-cell area ÷ core area',
          explanation:
            'Utilization measures how densely the placeable cells fill the core (60-80% typical). Macros are placed obstacles, not tiled cells, and pads live outside the core entirely.',
          hint: 'Cells ÷ space where cells may go.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Core power rings, straps and row rails together form the power distribution network, sized against IR-drop and electromigration limits.',
          answer: 'true',
          explanation:
            'The PDN has three tiers — ring, straps (upper metals), rails (per row) — and is sized by current: IR drop (voltage loss slows cells) and electromigration (current-density lifetime limit) are the checks.',
          hint: 'Three tiers, two failure modes.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Why are macro placement mistakes the most expensive physical-design errors?',
          options: [
            'Macros cannot be moved after fabrication',
            'Everything downstream conditions on the floorplan, so moving a macro invalidates placement, CTS, routing and extraction',
            'Macros have no timing models',
            'Routers refuse to route around macros',
          ],
          answer: 'Everything downstream conditions on the floorplan, so moving a macro invalidates placement, CTS, routing and extraction',
          explanation:
            'Later stages are re-runnable in hours; the floorplan is the geometry they all inherit. Late macro moves re-price the whole flow — hence the extra review here.',
          hint: 'Which stage do all others take as input geometry?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One number: the typical standard-cell utilization band (percent) that leaves routing headroom on a digital core.',
          answer: '70',
          explanation:
            'The common band is 60-80%, with ~70% the canonical starting target; the honest method is an early trial route and congestion-map evidence, not the heuristic alone.',
          hint: 'The round number cited in this lesson.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Die / core', definition: 'Die = whole chip incl. pad ring; core = region where standard cells are placed.' },
      { term: 'Utilization', definition: 'Std-cell area ÷ core area; 60-80% typical, congestion grows nonlinearly above.' },
      { term: 'Row / site', definition: 'Horizontal cell grid in the core with alternating power rails; cells legalize onto sites.' },
      { term: 'PDN', definition: 'Power distribution network: ring + straps + rails delivering VDD/GND to every cell.' },
      { term: 'Electromigration', definition: 'Metal atom displacement under high current density — a wire lifetime/reliability limit.' },
    ],
    revisionSummary: [
      'Die ⊃ core ⊃ rows; utilization = cells/core, target 60-80% with evidence from a trial route.',
      'Macros are planned obstacles: dataflow adjacency, keep-outs, pin access, channels.',
      'PDN = ring + straps + rails, sized against IR drop (timing loss) and electromigration (lifetime).',
      'Floorplan errors are the expensive kind: everything downstream inherits the geometry.',
      'Die size is often pad-limited, not logic-limited — check the pin count first.',
    ],
    furtherReading: [
      { label: 'OpenROAD project', url: 'https://theopenroadproject.org/', kind: 'tool' },
      { label: 'Wikipedia — Very Large Scale Integration', url: 'https://en.wikipedia.org/wiki/Very_Large_Scale_Integration', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'vlsi-m03-l2',
    title: 'Placement and Clock Tree Synthesis',
    summary:
      'Placing millions of cells on the row grid to minimize wirelength and congestion, then building the clock distribution network — why clocks are special, what skew is, and how buffers balance a tree.',
    objectives: [
      'Describe placement: global (wirelength/congestion/timing optimization) and legalization (row/site snapping).',
      'Explain why the clock is distributed differently from data: single source, many loads, arrival order matters.',
      'Define clock skew and insertion delay; state why zero-skew is not quite the goal (useful skew).',
      'Trace what clock tree synthesis changes in the timing picture (ideal clock -> propagated clock).',
    ],
    whyItMatters:
      'Placement decides most of a design\'s wire delay — the dominant delay term — before routing exists. CTS turns the clock from an idealized assumption into a physical object with real delays, and its quality determines whether millions of flip-flops act in concert or as a smear. Together they are the stage where timing closure is genuinely won or lost.',
    prerequisites: [
      'Floorplan geometry (vlsi-m03-l1)',
      'Liberty timing model and wireload estimates (vlsi-m02-l2, vlsi-m02-l3)',
      'Clock constraints (fpga-m03-l2)',
    ],
    explanation:
      '**Placement** assigns every standard cell to a row/site position. It runs in two phases: **global placement** optimizes cell positions continuously to minimize a cost — total wirelength (proxy for delay), congestion (routability), and timing (paths near their constraint get shorter wires); **legalization** snaps cells onto the exact grid without overlaps. Modern placers are timing-driven: they read the SDC and the netlist\'s slack estimates, pulling critical-path cells closer. The output is placed geometry — the first time your design has physical locations — and wire estimates become genuinely distance-based rather than statistical.\n\n### Why clocks are special\n\nData signals are local: one source, a few loads, arrival time is a per-path property. The **clock** is one source feeding *every* flip-flop on the die — millions of loads. Two things make it un-routable like ordinary data: (1) raw routing would produce arrival-time differences across the die of potentially whole nanoseconds; (2) its capacitive load is enormous, so it needs buffers anyway.\n\n**Clock skew** is the arrival-time difference of the clock at two flip-flops. Skew changes effective timing: if the capture FF\'s clock arrives *late* relative to the launch FF, the path gains time (helps setup); arrive *early* and the path loses (hold risk). **Insertion delay** is the source-to-FF delay itself, which must be kept bounded for clock-tree power and latency-sensitive interfaces.\n\n**Clock tree synthesis (CTS)** builds the distribution network: a tree (or mesh) of **clock buffers/inverters** — chains that drive progressively larger loads stage by stage, structured so all leaves (FF clock pins) receive the clock at nearly the same time. Balance is the job; skew targets are typically tens of picoseconds on modern designs.\n\nAfter CTS, the timing engine stops treating the clock as ideal: it **propagates** the real tree, with per-FF arrival times, and every setup/hold check re-computes against actual clock edges — a new, more truthful (and usually slightly worse) timing picture.',
    deepDive: '### Useful skew: spending arrival order deliberately\n\nZero skew sounds ideal but is not the optimum: if a path from FF-A to FF-B is failing setup by 80 ps, delaying the clock at B by (up to) 80 ps grants the path that time — borrowing from B\'s other paths, which must have the slack. Deliberately shaped skew is called **useful skew**, and CTS engines support skew targets per sink to exploit it. The honest caveat: useful skew reallocates a finite budget; it fixes a path by spending its neighbors\' margin, so it is a closer\'s tool used with full-path visibility, not a substitute for fixing genuinely long paths.\n\n### Pre-CTS vs post-CTS timing, and why the number moves\n\nBefore CTS, tools model the clock as ideal: zero skew, perfect edges at every FF. Setup checks even get "ideal clock" optimism (no insertion delay on either side). Post-CTS, two effects move numbers: real insertion delay appears at both launch and capture (largely common-mode — partially cancels), and *skew* appears as a difference term (never cancels). A design with comfortable pre-CTS slack can land close to zero post-CTS — which is normal and planned for, not a tool failure. The flow\'s response is to close most of the remaining margin in post-CTS optimization (sizing, VT swaps, small buffer moves), leaving the final word to post-route STA (next lesson).',
    examples: [
      {
        title: 'Skew arithmetic on two registers (worked, conceptual)',
        language: 'text',
        code:
          'Setup check with real (propagated) clocks:\n\n  FF_A (launch) clock arrives at  t_a = 2.410 ns after source\n  FF_B (capture) clock arrives at t_b = 2.445 ns after source\n\n  skew (A->B) = t_b - t_a = +35 ps   (capture clock LATER)\n\n  effective setup budget for path A->B\n    = period + skew - setup_time\n    = 4000 ps + 35 ps - 30 ps\n    = 4005 ps\n\n  (if the tree had been built the other way, skew = -35 ps:\n   budget = 4000 - 35 - 30 = 3935 ps — 70 ps worse)\n\nHold check is the mirror: LATE capture clock is the RISK\n(hold budget = min_delay - skew...), which is why hold is\nre-verified after CTS with the real tree.',
        explanation: [
          'Skew is signed and directional: capture-later (+) helps setup, capture-earlier (−) hurts it. Same sign relationship, inverted, for hold — late capture clock is the hold hazard.',
          'The arithmetic shows the magnitude: ±35 ps of skew moves a 4 ns path\'s budget by 70 ps of swing between the two build directions — a few percent, which is exactly the scale at which closure is won.',
          'The setup formula (period + skew − setup) makes the "borrowing" of useful skew visible: the budget is literally the period plus the arrival difference.',
          'The hold note anticipates the sign flip: after CTS, hold violations caused by positive skew are found and fixed by delay insertion — a real post-CTS task.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Clock tree structure and skew',
        content:
          '            clk source (port or PLL)\n                   |\n              [CLKBUF root]\n              /             \\\n        [CLKBUF]         [CLKBUF]\n         /    \\           /    \\\n      [BUF]  [BUF]     [BUF]  [BUF]\n       /|\\     /|\\       /|\\    /|\\\n      FFs     FFs       FFs     FFs      <- leaves: all sinks\n\n  goal: every leaf within skew target (tens of ps)\n        insertion delay bounded (power, latency)\n        stages sized so no buffer is slew-starved',
        caption:
          'A balanced buffered tree: each stage drives a bounded load, and the branching equalizes path lengths to every leaf.',
      },
    ],
    tables: [
      {
        caption: 'Placement and CTS: stage outputs and what they change',
        headers: ['Stage', 'Optimizes', 'Output', 'Timing model change'],
        rows: [
          ['Global placement', 'Wirelength, congestion, timing', 'Continuous cell positions', 'Distance-based wire estimates'],
          ['Legalization', 'No overlaps on rows/sites', 'Legal placed design', 'None (snapping only)'],
          ['CTS', 'Clock skew, insertion delay, slew', 'Buffered clock tree', 'Ideal clock -> propagated clock'],
        ],
      },
      {
        caption: 'Skew effects on checks (signed, direction A->B)',
        headers: ['Capture clock at B is...', 'Setup effect', 'Hold effect'],
        rows: [
          ['Later (+skew)', 'Helps (budget grows by skew)', 'Hurts (data must stay longer)'],
          ['Earlier (−skew)', 'Hurts (budget shrinks)', 'Helps'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Judging placement by wirelength alone.',
        fix: 'Wirelength is a proxy: congestion (routability) and critical-path timing are explicit placer objectives. A minimal-wirelength placement that stacks high-fanout nets into one corridor loses more at routing than it saved.',
      },
      {
        mistake: 'Assuming post-CTS timing degradation means CTS "failed".',
        fix: 'The number moves because the model became truthful: real insertion delay and skew replace ideal-clock assumptions. Compare pre/post-CTS expecting a small loss; investigate only losses beyond the design\'s planned margin.',
      },
      {
        mistake: 'Fixing hold violations discovered after CTS by slowing the clock.',
        fix: 'Hold is frequency-independent (the FPGA course established this); the fixes are structural — delay insertion on the too-fast path, or fixing the skew that caused it. Slowing the clock only wastes power while the hold bug ships.',
      },
    ],
    guidedPractice: {
      title: 'Compute the post-CTS budget',
      brief:
        'Period 2.0 ns; FF setup 25 ps; launch clock arrival 1.180 ns; capture arrival 1.205 ns; data path delay 1.640 ns. Compute skew (with sign), the setup budget, and the slack. Then state which direction of skew would have helped more.',
      starterCode:
        'skew    = capture - launch = ______ ps\nbudget  = period + skew - t_su = ______ ps\nslack   = budget - data delay = ______ ps\nhelpful skew direction: capture clock ______ (earlier/later)',
      expectedBehavior:
        'Skew = 1205 − 1180 = +25 ps. Budget = 2000 + 25 − 25 = 2000 ps. Slack = 2000 − 1640 = +360 ps. Later capture clock helps setup (larger skew → bigger budget); earlier capture hurts. For this path, a later-capture skew would have added budget directly.',
      hints: [
        'Skew is the capture-minus-launch difference.',
        'Setup budget = period + skew − setup time (the useful-skew formula).',
        'Keep units consistent (ps).',
      ],
    },
    practiceExercises: [
      {
        title: 'CTS stage sizing reasoning',
        brief:
          'A clock net drives 40,000 FFs, each with ~2 fF pin cap. Explain in 3-4 sentences why a single buffer cannot drive this, and how a 3-level tree reduces the per-stage load.',
        expectedBehavior:
          'Total pin load ≈ 40,000 × 2 fF = 80 pF — orders of magnitude beyond any buffer\'s sane drive (slew would be destroyed; max_capacitance violated). A tree splits the load: root drives a few second-level buffers (each ~10s of fF), which drive third-level buffers, each of which drives a few hundred FFs (~1 pF-class) — every stage drives a bounded, table-legal load, at the cost of insertion delay and buffer area/power.',
        hints: [
          'Compute the total load first; compare to a cell\'s max_capacitance.',
          'Each tree level divides the load among siblings.',
          'The cost side: insertion delay and clock buffer power.',
        ],
      },
      {
        title: 'Useful-skew ethics',
        brief:
          'CTS offers useful skew: delaying FF-B\'s clock 80 ps fixes a failing setup path A->B. Write the 3-condition checklist that must hold before accepting this fix.',
        expectedBehavior:
          'Checklist: (1) every OTHER path ending at B has >= 80 ps of setup slack to give (their capture got later too); (2) paths FROM B (B as launch) still meet hold with the later launch (launch-later helps hold FROM B, but check B\'s other roles); (3) the whole analysis is on the propagated clock with the final tree — useful skew is only as good as the tree it is measured on, and post-route re-verification is mandatory.',
        hints: [
          'Skew is a reallocation: name who pays.',
          'A FF is both capture and launch — check both roles.',
          'The tree must be the final one for the numbers to be true.',
        ],
      },
    ],
    assessment: {
      title: 'Placement and CTS checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does legalization add after global placement?',
          options: [
            'Buffer insertion on long nets',
            'Snapping cells to exact row/site positions without overlaps',
            'Clock tree construction',
            'Parasitic extraction',
          ],
          answer: 'Snapping cells to exact row/site positions without overlaps',
          explanation:
            'Global placement optimizes continuous positions for wirelength/congestion/timing; legalization makes them legal: on-grid, overlap-free, ready for CTS and routing.',
          hint: 'What makes a placement physically manufacturable?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'If the capture flip-flop\'s clock arrives later than the launch flip-flop\'s, the setup budget of the path between them increases.',
          answer: 'true',
          explanation:
            'Setup budget = period + skew − setup time. A later capture clock (positive skew) extends the budget — the basis of useful skew; the same condition is the hold risk.',
          hint: 'Later capture = more time before the sampling edge.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'After CTS, the timing engine switches the clock model from ideal to propagated. What changes in the analysis?',
          options: [
            'Nothing — the clock was always propagated',
            'Each FF uses its real clock arrival time; skew and insertion delay enter every check',
            'Only the clock pin capacitances are re-read',
            'Setup checks stop being performed until routing',
          ],
          answer: 'Each FF uses its real clock arrival time; skew and insertion delay enter every check',
          explanation:
            'Pre-CTS ideal clocks assume perfect simultaneous edges; post-CTS propagation uses the real buffered tree, adding skew (difference) and insertion delay (common) to every setup/hold computation.',
          hint: 'What does the tree physically add that the ideal model lacked?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the arrival-time difference of the clock at two flip-flops, which CTS minimizes within tens of picoseconds.',
          answer: 'clock skew',
          explanation:
            'Clock skew is the per-FF clock arrival difference; CTS balances the buffered tree to keep it within target, or shapes it deliberately (useful skew).',
          hint: 'It is what the tree tries to balance.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Global placement', definition: 'Continuous-position optimization of all cells for wirelength, congestion and timing.' },
      { term: 'Legalization', definition: 'Snapping placed cells onto the row/site grid, overlap-free.' },
      { term: 'Clock tree synthesis (CTS)', definition: 'Building the buffered clock distribution network to meet skew and insertion-delay targets.' },
      { term: 'Clock skew', definition: 'Arrival-time difference of the clock between two FFs; signed, directional in its timing effects.' },
      { term: 'Insertion delay', definition: 'Clock delay from source to a FF, bounded for power and latency reasons.' },
    ],
    revisionSummary: [
      'Placement = global optimization + legalization; timing-driven, and it sets the real wire-delay picture.',
      'Clocks are special: one source, millions of loads, arrival order matters.',
      'Skew signed: later capture helps setup / hurts hold; the opposite for earlier.',
      'CTS balances buffered trees (tens-of-ps skew, bounded insertion delay); post-CTS the clock propagates for real.',
      'Useful skew reallocates margin — accept it only with full-path visibility and post-route re-checks.',
    ],
    furtherReading: [
      { label: 'OpenROAD project', url: 'https://theopenroadproject.org/', kind: 'tool' },
      { label: 'Wikipedia — Clock signal', url: 'https://en.wikipedia.org/wiki/Clock_signal', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlsi-m03-l3',
    title: 'Routing, Extraction and the Full Flow',
    summary:
      'Global and detailed routing, parasitic extraction into RC, physical-only cells — and the complete spec-to-sign-off flow as one diagram you can reproduce from memory.',
    objectives: [
      'Distinguish global routing (track assignment) from detailed routing (actual wires, DRC-clean).',
      'Explain parasitic extraction: what RC is computed, what SPEF carries, and why post-route STA is the contract.',
      'Name the physical-only cells (tap, filler, decap, endcap) and each one\'s job.',
      'Reproduce the full flow: spec -> RTL -> verify -> synthesis -> floorplan -> place -> CTS -> route -> extract -> sign-off.',
    ],
    whyItMatters:
      'Routing is where the design finally becomes wires — and wires are the delay, noise and reliability story of a modern chip. Extraction converts those wires into RC that the timing engine finally trusts. And the full-flow diagram is the course\'s skeleton: every interview question about "what does the flow look like" is this lesson, and every stage\'s lesson so far hangs on one of its boxes.',
    prerequisites: [
      'Placement and CTS (vlsi-m03-l2)',
      'Floorplan and PDN (vlsi-m03-l1)',
      'Liberty timing (vlsi-m02-l2)',
    ],
    explanation:
      '**Routing** configures the metal layers into actual wires. Two phases: **global routing** assigns each net to routing regions/tracks on each metal layer (coarse, congestion-aware — it decides *where* each net travels); **detailed routing** realizes the wires on those tracks, honoring width/spacing/via rules — DRC-clean by construction where it succeeds. Modern processes offer 10-15 metal layers; routers stack them: thin, dense lower layers for pin access; thick, wide upper layers for power and long hauls (the PDN lives up there from Module 3 Lesson 1).\n\n**Parasitic extraction** computes the resistance and capacitance of every routed wire segment (R from geometry and layer resistivity, C from neighbor coupling and ground planes) and writes it into a **SPEF** file (Standard Parasitic Exchange Format). STA then annotates the netlist with real RC: delay and slew now include interconnect — the last major unknown disappears. **Post-route STA is the sign-off-grade timing analysis**, with crosstalk (aggressor noise) analysis as its companion.\n\n**Physical-only cells** complete the layout with devices that carry no logic:\n- **Tap cells** (well/substrate taps): periodic contacts biasing the transistor wells — required by spacing rules; the router\'s sneakiest DRC error source when missing.\n- **Filler cells**: fill row gaps for metal density rules and diffusion continuity.\n- **Decap cells**: switch capacitance near high-activity blocks, smoothing local supply droop.\n- **Endcap/boundary cells**: terminate row ends per library rules.\n\n### The full flow, one diagram\n\nEverything in this course assembles into the canonical pipeline — reproduced below and worth memorizing in both directions (what feeds each box, what each box emits).',
    deepDive: '### Why extraction changes the timing picture qualitatively\n\nPre-route delay is cells + estimated wires; post-route delay is cells + *measured* RC — including coupling capacitance to neighbors. Two consequences. (1) Crosstalk: an aggressor switching can speed up (capacitive Miller effect on a falling victim) or slow down (noise injection) a victim path — sign-off analyzes worst-case alignment (Signal Integrity / crosstalk delta-delay), not just standalone RC delay. (2) Correlation: extraction models (2.5D, field-solver spot checks) trade accuracy for runtime; sign-off flows use calibrated models, and honest engineers quote timing numbers with the extraction method attached.\n\n### The flow as a loop, not a ladder\n\nThe diagram reads top-to-bottom as a happy path, but production is iterative: post-route STA finds a violation -> return to placement (re-place a region) or CTS (re-balance) or synthesis (re-map with tightened constraints) -> re-route. Iteration loops *upward only as far as needed* — an ECO (engineering change order) may touch a few cells without re-running the world. The skill is choosing the smallest loop that fixes the violation: full re-flows for structural problems, local ECOs for the last few picoseconds.',
    examples: [
      {
        title: 'THE FULL FLOW: spec to sign-off (memorize this)',
        language: 'text',
        code:
          '  SPEC (architecture, interfaces, power/cost targets)\n     |\n     v\n  RTL DESIGN  (Verilog/VHDL: what the chip computes)\n     |\n     v\n  RTL VERIFICATION  (simulation, coverage, formal)\n     |                                   \\\n     |                                    (loop back on bugs)\n     v\n  LOGIC SYNTHESIS  (RTL + constraints + .lib -> netlist)\n     |          [equivalence check: RTL vs netlist]\n     v\n  FLOORPLANNING  (die/core, macros, pins, PDN)\n     |\n     v\n  PLACEMENT  (global + legalize cells onto rows)\n     |\n     v\n  CLOCK TREE SYNTHESIS  (balanced buffered clock; real clock)\n     |\n     v\n  ROUTING  (global tracks -> detailed DRC-clean wires)\n     |\n     v\n  PARASITIC EXTRACTION  (RC -> SPEF; crosstalk models)\n     |\n     v\n  SIGN-OFF  (post-route STA multi-corner, SI;\n             DRC, LVS, antenna; power/EM checks)\n     |\n     v\n  TAPE-OUT  (GDS to foundry -> masks -> silicon)\n\n  Iteration: any sign-off failure loops UPWARD to the\n  smallest sufficient stage (ECO at place/CTS/route,\n  re-synthesis for structural issues).',
        explanation: [
          'Each box consumes the previous box\'s artifact: spec -> RTL -> verified RTL -> netlist -> floorplan -> placed design -> clocked design -> routed design -> RC-annotated design -> signed-off GDS.',
          'Verification appears twice, deliberately: before synthesis (functional) and after (equivalence check proves the netlist matches the RTL — Module 4).',
          'The side loop on RTL verification is where most project time actually goes — the sign-off loop at the bottom is where most schedule risk lives.',
          'The iteration note is the flow\'s honest part: real chips loop; the art is the smallest sufficient loop.',
          'Every stage maps to a lesson: synthesis (Module 2), floorplan/place/CTS/route/extract (this module), sign-off (Module 4) — the diagram is the course table of contents in pipeline form.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Routing layers and the extraction handoff',
        content:
          '  M11 ===== wide, thick: PDN straps, clock trunks\n  M10 =====\n  M9  =====\n   ...  signal routes: alternate preferred directions\n  M2  -----\n  M1  -- pin access, row rails\n\n  routed geometry --[extraction]--> RC per net (SPEF)\n                                        |\n                                        v\n                        post-route STA: cells + REAL wires\n                        = sign-off-grade numbers',
        caption:
          'Layers are specialized: dense and thin below, fat and sparse above. Extraction converts geometry into the RC the timer finally believes.',
      },
    ],
    tables: [
      {
        caption: 'Physical-only cells and their jobs',
        headers: ['Cell', 'Job', 'If missing'],
        rows: [
          ['Tap (well/substrate)', 'Bias the transistor wells at rule-mandated spacing', 'DRC/latch-up exposure'],
          ['Filler', 'Row gaps: density and diffusion continuity', 'Density DRC fails'],
          ['Decap', 'Local switching capacitance against supply droop', 'Local IR droop spikes'],
          ['Endcap/boundary', 'Terminate row ends per library rules', 'Row-boundary DRC fails'],
        ],
      },
      {
        caption: 'The ten flow boxes and their artifacts',
        headers: ['Stage', 'Input', 'Output artifact'],
        rows: [
          ['Spec', 'Product requirements', 'Architecture + interfaces'],
          ['RTL design', 'Spec', 'Verilog/VHDL'],
          ['RTL verification', 'RTL + testbench plan', 'Verified RTL + coverage'],
          ['Synthesis', 'RTL + SDC + .lib', 'Netlist (+equiv check)'],
          ['Floorplan', 'Netlist + physical intent', 'Die/core/macros/PDN plan'],
          ['Placement', 'Floorplan + netlist', 'Placed legal design'],
          ['CTS', 'Placed design + clock spec', 'Propagated clock tree'],
          ['Routing', 'CTS design + tech rules', 'DRC-clean routed wires'],
          ['Extraction', 'Routed geometry', 'RC (SPEF)'],
          ['Sign-off', 'Routed + RC + corners', 'Clean reports -> tape-out GDS'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Believing post-synthesis timing ("MET estimated") and skipping the physical-design loop discipline.',
        fix: 'The flow is iterative by design: post-route STA with real RC is the contract. Plan the schedule around at least one full loop of route -> analyze -> fix, and treat "first-pass clean" as a pleasant anomaly, not an expectation.',
      },
      {
        mistake: 'Confusing global and detailed routing roles.',
        fix: 'Global routing chooses regions/tracks (where); detailed routing draws legal wires (how). Congestion problems discovered in detailed routing are diagnosed — and usually fixed — in the global assignment, which is why congestion maps live at the global stage.',
      },
      {
        mistake: 'Deleting physical-only cells to "clean up" an ECO diff.',
        fix: 'Tap, filler, decap and endcap cells carry rule compliance, not logic. Removing them (or hand-editing around them) trades invisible DRC/latch-up/droop exposure for a tidier diff — always let the tools re-insert them after structural changes.',
      },
    ],
    guidedPractice: {
      title: 'Run the flow backward',
      brief:
        'For each artifact, name the stage that produces it and the stage that consumes it next: (a) SPEF; (b) propagated clock tree; (c) legalized placement; (d) netlist; (e) signed-off GDS.',
      starterCode:
        '(a) produced by ______, consumed by ______\n(b) produced by ______, consumed by ______\n(c) produced by ______, consumed by ______\n(d) produced by ______, consumed by ______\n(e) produced by ______, consumed by ______',
      expectedBehavior:
        '(a) extraction -> sign-off STA (and SI). (b) CTS -> post-CTS optimization/sign-off STA. (c) placement legalization -> CTS (and routing prep). (d) synthesis -> floorplanning/placement and equivalence checking. (e) sign-off -> foundry (tape-out); nothing downstream inside the flow.',
      hints: [
        'Each stage emits exactly the artifact the next stage consumes.',
        'SPEF is the extraction product; ask who needs RC.',
        'GDS leaves the flow — to the foundry.',
      ],
    },
    practiceExercises: [
      {
        title: 'Choose the smallest loop',
        brief:
          'Sign-off reports: (a) one hold violation on one path; (b) a 2 ns setup miss across an entire block because its clock constraint was wrong. For each, name the smallest sufficient loop and why a bigger one wastes time.',
        expectedBehavior:
          '(a) Local ECO: delay insertion on that path (or minimal CTS touch if skew-caused) then re-route locally and re-verify — no full re-flow. (b) The constraint itself is wrong: re-synthesize/re-implement the block with the corrected clock (the netlist was optimized against fiction); a local ECO cannot fix a wrong requirement.',
        hints: [
          'Fixes should match the cause\'s altitude: cell-level vs constraint-level.',
          'Full re-flows are for structural/wrong-spec problems.',
          'Say what each loop re-runs and re-verifies.',
        ],
      },
      {
        title: 'Crosstalk scenario',
        brief:
          'A victim path passes STA with +15 ps slack. Extraction shows a 25 ps crosstalk delta-delay when its neighbor (aggressor) switches oppositely. Will sign-off pass? State the analysis that catches this and the standard fixes.',
        expectedBehavior:
          'No: worst-case alignment (aggressor switching against the victim) eats 25 ps of the 15 ps margin — SI-aware STA (crosstalk delta-delay/noise analysis) catches it; plain RC-delay STA does not. Fixes: spacing/increase distance to the aggressor, shielding (ground line between), driver upsizing, or routing the aggressor elsewhere — router-level SI-aware options.',
        hints: [
          'Compare the delta against the remaining slack.',
          'Which analysis adds the delta term?',
          'Fixes are geometric (spacing/shield) or electrical (drive).',
        ],
      },
    ],
    assessment: {
      title: 'Routing and full flow checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does parasitic extraction add to the timing picture?',
          options: [
            'Nothing — timing was already complete after CTS',
            'Per-net resistance and capacitance (from real routed geometry), enabling post-route STA',
            'Only the power network\'s resistance',
            'Cell delay tables recalculated at the routed locations',
          ],
          answer: 'Per-net resistance and capacitance (from real routed geometry), enabling post-route STA',
          explanation:
            'Extraction computes RC from the routed wires (written as SPEF), which STA annotates onto the netlist — interconnect delay becomes measured, making post-route analysis the contract.',
          hint: 'What did pre-route timing have to estimate?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Tap cells carry no logic but are required — they bias transistor wells at rule-mandated spacing.',
          answer: 'true',
          explanation:
            'Physical-only cells (tap, filler, decap, endcap) exist for rule compliance and robustness: wells biased, density met, droop damped, rows terminated. Missing taps are a classic DRC/latch-up failure.',
          hint: 'Which cells carry zero logic and full rules?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'In the full flow, what does CTS receive and what does it emit?',
          options: [
            'Receives the netlist; emits the placed design',
            'Receives the placed design; emits a propagated (buffered) clock tree',
            'Receives SPEF; emits DRC-clean routes',
            'Receives GDS; emits masks',
          ],
          answer: 'Receives the placed design; emits a propagated (buffered) clock tree',
          explanation:
            'CTS runs after placement: it inserts/balances clock buffers so the clock becomes a real propagated object with bounded skew and insertion delay.',
          hint: 'CTS sits between which two stages?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: the final flow artifact — the complete layout database handed to the foundry for mask making.',
          answer: 'GDS',
          explanation:
            'GDS (GDSII) is the geometry database produced after sign-off and delivered to the foundry — tape-out. (Accept "GDSII".)',
          hint: 'It names the format, and it is what tape-out sends.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Global routing', definition: 'Coarse track/region assignment of nets, congestion-aware.' },
      { term: 'Detailed routing', definition: 'Actual DRC-clean wire realization on the assigned tracks.' },
      { term: 'Parasitic extraction', definition: 'Computing per-net R and C from routed geometry, output as SPEF.' },
      { term: 'SPEF', definition: 'Standard Parasitic Exchange Format — the RC database consumed by sign-off STA.' },
      { term: 'Physical-only cells', definition: 'Tap, filler, decap, endcap cells: rule compliance and robustness, no logic.' },
    ],
    revisionSummary: [
      'Routing = global (where) + detailed (legal wires); upper metals carry power and long hauls.',
      'Extraction turns geometry into RC (SPEF); post-route STA is the sign-off-grade number.',
      'Crosstalk (SI) analysis adds worst-case aggressor effects on top of RC delay.',
      'Physical-only cells: taps (wells), fillers (density), decaps (droop), endcaps (row ends).',
      'The flow: spec -> RTL -> verify -> synthesize -> floorplan -> place -> CTS -> route -> extract -> sign-off -> tape-out; iterate upward via the smallest sufficient loop.',
    ],
    furtherReading: [
      { label: 'OpenROAD project', url: 'https://theopenroadproject.org/', kind: 'tool' },
      { label: 'Wikipedia — Electronic design automation', url: 'https://en.wikipedia.org/wiki/Electronic_design_automation', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
