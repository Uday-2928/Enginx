import type { TutorialLesson } from '../types';

export const module01Lessons: TutorialLesson[] = [
  {
    id: 'vlsi-m01-l1',
    title: 'What VLSI Is — and Moore\'s Law, Honestly',
    summary:
      'Define very-large-scale integration, trace the scaling era that made billion-transistor chips possible, and learn the honest modern picture: Dennard scaling\'s end, marketing node names, and the debates about scaling\'s future.',
    objectives: [
      'Define VLSI and place modern designs (billions of transistors) in its historical ladder SSI -> MSI -> LSI -> VLSI.',
      'State Moore\'s law precisely (transistor density doubling roughly every two years) and distinguish it from Dennard scaling.',
      'Explain why frequency stopped climbing around the mid-2000s and what the industry did instead (multicore).',
      'Debunk node-name marketing honestly: modern "3 nm"/"5 nm" names are marketing labels, not physical gate dimensions.',
    ],
    whyItMatters:
      'Every course concept you will meet — libraries, corners, DRC decks — exists because chips integrate billions of devices that no human can manage by hand. Knowing the scaling story tells you *why the flow is the way it is*: synthesis, physical automation and sign-off are the answers to a scale problem. It also inoculates you against the two beginner failure modes: treating Moore\'s law as a physical law, and dismissing it entirely.',
    prerequisites: [
      'Digital logic and CMOS gate behavior (Digital Electronics course)',
      'Basic semiconductor vocabulary (doping, oxide)',
    ],
    explanation:
      '**VLSI** — very-large-scale integration — is the practice of designing integrated circuits containing hundreds of thousands to billions of transistors on one die. The historical ladder: SSI (tens of gates, 1960s), MSI (hundreds), LSI (thousands, 1970s), VLSI (100,000+ and everything since; the term stuck even as counts passed billions). At this scale, no human draws transistors: design is layered abstraction — architecture, RTL, logic, physical — with each layer automated and verified against the one below. This course walks that stack.\n\n**Moore\'s law** is an *economic observation*, not a physical law: in 1965 Gordon Moore noted the number of components per chip was doubling about yearly; he revised the pace in 1975 to roughly every two years, and the industry tracked it for five decades. What made it real was **Dennard scaling** (1974): as transistors shrank, they also got faster and *more power-efficient per unit area* — so each generation was smaller, quicker and cooler per operation. That combination is what broke.\n\nAround the mid-2000s, Dennard scaling ended: shrinking further no longer reduced power proportionally because leakage and other effects grew, and supply voltage could not keep dropping. Clock frequencies, which had climbed from megahertz to roughly 3-4 GHz, plateaued — the industry pivoted to **multicore** designs (more processors per die at the same frequency) rather than faster single cores. That pivot is why your software courses teach parallelism, and it happened because of device physics, not marketing.\n\n### The honest modern picture\n\nTwo things are simultaneously true. First, transistor density still improved for years after Dennard scaling ended — via FinFETs, better materials and clever design — so "Moore\'s law is dead" has been declared prematurely many times. Second, the *cost* per transistor has stopped falling reliably in leading nodes, which is the economically meaningful version of the debate. And node names stopped meaning anything physical years ago: today\'s "5 nm" or "3 nm" process names are marketing labels — the actual smallest features are far larger. Engineers compare nodes by real metrics: density (transistors/mm²), performance, power and cost per function.',
    deepDive:
      '### The power wall, quantified in one line\n\nDynamic power is P ≈ α·C·V²·f — activity, capacitance, supply voltage squared, and frequency. Dennard scaling worked because V fell with feature size, and V² falls fast. When V stalled around ~1 V for leakage reasons, the V² lever jammed: pushing f (or fitting more switching capacitance) now raises power nearly linearly. Chips hit a thermal ceiling of what a package could dissipate — that, not a lack of ideas, is why frequency plateaued and power became a first-class design axis (and why the power-intent concepts of Module 4 exist).\n\n### Abstraction is the real invention\n\nThe durable lesson of the VLSI era is not any device physics: it is the *stack*. A GPU team designs in C++/RTL; synthesis turns RTL into standard cells; place-and-route turns cells into geometry; verification checks every transform. Each layer hides ~1000x complexity from the one above. Moore\'s law supplied the transistor budget; the abstraction stack is what turned that budget into working systems. Every lesson in this course is one floor of that stack, and the FPGA flow you learned is the same stack with reconfigurable fabric at the bottom.',
    examples: [
      {
        title: 'The scaling story as a factual timeline',
        language: 'text',
        code:
          '1965  Moore\'s observation: components/chip doubling ~yearly\n1971  Intel 4004: ~2,300 transistors (LSI era)\n1974  Dennard scaling: smaller = faster AND power-efficient\n1980s VLSI mainstream: 100k+ transistors; standard-cell flows mature\n1990s frequency race: clocks climb steadily with each node\n~2004-2006  Dennard scaling ends -> power wall;\n      frequency plateaus around 3-4 GHz;\n      industry pivots to multicore\n2010s FinFETs, then gate-all-around research;\n      node names decouple from physical dimensions\n2020s density still improves slowly; cost-per-transistor\n      flat/rising at leading nodes; "end of Moore\'s law"\n      debates continue in economic terms\n\nNote: transistor counts are order-of-magnitude public figures;\nverify any specific chip against vendor publications.',
        explanation: [
          'The timeline separates the three distinct claims that get conflated: Moore\'s observation (density doubling), Dennard scaling (power efficiency with shrink), and the frequency race (a consequence that ended).',
          'The 4004 figure (~2,300 transistors) is a widely cited public number — used here as an anchor, with the note that specific figures deserve verification.',
          'The mid-2000s plateau is the load-bearing event: it explains multicore software, the rise of power as a design constraint, and the existence of low-power design flows in this course.',
          'The modern rows model honest engineering speech: density improved, economics changed, claims stay verifiable.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The two scalings and the wall between them',
        content:
          '  DENSITY (Moore):      transistors/chip doubles ~every 2 years\n                        [continued for decades]\n\n  EFFICIENCY (Dennard): shrink -> V drops -> power/area falls\n                        [ended ~mid-2000s: leakage + V floor]\n\n  CONSEQUENCE:          frequency plateaus (power wall)\n                        -> multicore era\n                        -> power = first-class design constraint\n                        -> VLSI flow gains low-power stages\n                           (Module 4: power intent)',
        caption:
          'Moore and Dennard are different claims. The end of the second reshaped the industry more visibly than anything since.',
      },
    ],
    tables: [
      {
        caption: 'Integration-scale ladder',
        headers: ['Era', 'Scale', 'Typical design method'],
        rows: [
          ['SSI (1960s)', 'Tens of gates', 'Hand-drawn gates'],
          ['MSI (late 1960s)', 'Hundreds of gates', 'Hand-drawn + early tools'],
          ['LSI (1970s)', 'Thousands', 'Structured design, first automation'],
          ['VLSI (1980s-present)', '100k -> billions', 'RTL + synthesis + physical automation + sign-off'],
        ],
      },
      {
        caption: 'Node-name honesty check (conceptual)',
        headers: ['Claim to avoid', 'Why it is wrong', 'What to compare instead'],
        rows: [
          ['"7 nm gate length"', 'Node names are marketing; features are larger', 'Density: transistors/mm²'],
          ['"smaller node always faster"', 'Library design and corner matter as much', 'Realized frequency at equal power'],
          ['"smaller node always cheaper"', 'Cost per transistor can rise at leading nodes', 'Cost per function at your volume'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Treating Moore\'s law as a law of physics that guarantees future progress.',
        fix: 'It is an economic observation that held for decades because enormous engineering made it hold. Treat density history as data, and forward-looking claims as projections — ideally with cost-per-transistor attached, since that is the economically binding metric.',
      },
      {
        mistake: 'Using node names ("a 3 nm design") as if they were physical dimensions.',
        fix: 'Node names are brand labels. Compare processes with density, performance, power and cost metrics from the foundry\'s actual documentation; never derive feature sizes from names.',
      },
      {
        mistake: 'Explaining the multicore pivot as a software fashion.',
        fix: 'Multicore happened because Dennard scaling ended and single-core frequency hit a power wall — a hardware physics event. The software-parallelism era is downstream of a device-physics fact, which is exactly why this course begins there.',
      },
    ],
    guidedPractice: {
      title: 'Separate the three claims',
      brief:
        'Classify each statement as Moore (density), Dennard (efficiency), or the frequency race: (a) "chips doubled their transistor counts about every two years for decades"; (b) "shrinking made each gate faster and lower-power at the same time"; (c) "clocks stalled near 3-4 GHz because power could not keep rising"; (d) "CPU vendors began shipping more cores instead of higher clocks."',
      starterCode:
        '(a) ____  (b) ____  (c) ____  (d) ____',
      expectedBehavior:
        '(a) Moore. (b) Dennard. (c) The frequency race ended by the power wall — its end is the observable; (d) the industry response to (c). Note (c) and (d) are consequences, not the two "laws" themselves.',
      hints: [
        'Two of the four are named scalings; the other two are events and responses.',
        'The power wall connects (b) ending to (c) happening.',
        'Moore counts transistors; Dennard scales voltage and power.',
      ],
    },
    practiceExercises: [
      {
        title: 'Dynamic power arithmetic',
        brief:
          'Using P ≈ αCV²f: a block at V=1.0 V, f=1 GHz, C=5 nF effective switching capacitance, α=0.1. Compute P. Then recompute at V=0.7 V (same f, C) and state the saving percentage.',
        expectedBehavior:
          'P = 0.1 × 5e-9 × 1.0² × 1e9 = 0.5 W. At V=0.7: 0.1 × 5e-9 × 0.49 × 1e9 = 0.245 W — a 51% saving from a 30% voltage drop, showing why V was the favorite lever until it jammed.',
        hints: [
          'V² is the powerful term: (0.7/1.0)² = 0.49.',
          'Watch units: F × V² × Hz = watts.',
          'The 51% saving is the quantitative shape of Dennard scaling\'s benefit.',
        ],
      },
      {
        title: 'Node comparison memo',
        brief:
          'Your team must choose between two processes for a new chip. Write a 4-bullet memo listing the metrics you would actually compare (with one sentence each on why the node name is not on the list).',
        expectedBehavior:
          'Bullets: density (transistors/mm² — what fits per die cost), performance at target power (frequency at a power envelope), power at target performance, cost per function at volume (wafer cost ÷ good dies × yield). Node name excluded: it is a marketing label with no fixed physical meaning.',
        hints: [
          'Every metric must be measurable from foundry/EDA data, not from names.',
          'Yield connects density to cost — mention it.',
          'The memo should read like engineering, not like a slide.',
        ],
      },
    ],
    assessment: {
      title: 'VLSI and scaling checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which statement describes Dennard scaling?',
          options: [
            'Transistor counts double roughly every two years',
            'Shrinking transistors made them faster and more power-efficient per area, historically',
            'Node names track physical gate lengths',
            'Clock frequencies double every generation',
          ],
          answer: 'Shrinking transistors made them faster and more power-efficient per area, historically',
          explanation:
            'Dennard scaling is the voltage/power observation: as devices shrank, supply voltage fell and power per area stayed flat, giving both speed and efficiency. It ended in the mid-2000s.',
          hint: 'It is about power and voltage, not counts.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A modern "3 nm" process name means its smallest physical feature is 3 nanometers.',
          answer: 'false',
          explanation:
            'Node names became marketing labels years ago; actual features are far larger. Engineers compare density, performance, power and cost per function instead.',
          hint: 'What did the marketing teams do to the numbers?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'What directly caused CPU clock frequencies to plateau around the mid-2000s?',
          options: [
            'Moore\'s law ended, so no more transistors were available',
            'Dennard scaling ended: supply voltage could not keep falling, so power hit thermal limits',
            'Software stopped needing more speed',
            'Photolithography could not print smaller features at all',
          ],
          answer: 'Dennard scaling ended: supply voltage could not keep falling, so power hit thermal limits',
          explanation:
            'With V² no longer falling, higher frequency raised power beyond what packages could cool. Density kept improving; the power wall, not a transistor shortage, ended the frequency race.',
          hint: 'Recall P ≈ αCV²f and which term jammed.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: the era-defining industry response to the end of Dennard scaling — putting multiple processors on one die instead of raising one core\'s clock.',
          answer: 'multicore',
          explanation:
            'Multicore (multi-core processors) is the standard answer: more cores at constant frequency rather than higher frequency.',
          hint: 'It names how many cores.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'VLSI', definition: 'Very-large-scale integration: designing ICs from hundreds of thousands to billions of transistors via layered abstraction.' },
      { term: 'Moore\'s law', definition: 'Economic observation: transistor density per chip doubled roughly every two years for decades.' },
      { term: 'Dennard scaling', definition: 'Historical regime where shrinking devices reduced voltage and power per area, enabling both speed and efficiency.' },
      { term: 'Power wall', definition: 'The thermal limit reached when Dennard scaling ended; ended the single-core frequency race.' },
      { term: 'Node name', definition: 'Marketing label for a process generation; not a physical dimension.' },
    ],
    revisionSummary: [
      'VLSI = billions of devices managed through an abstraction stack: architecture -> RTL -> logic -> physical.',
      'Moore (density doubling) and Dennard (power efficiency with shrink) are different claims; the second ended ~mid-2000s.',
      'The power wall (P ≈ αCV²f with V jammed) plateaued frequency and created the multicore era.',
      'Node names are marketing; compare density, performance, power and cost per function.',
      'Every flow stage in this course exists to manage scale that no human can hand-manage.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Moore\'s law', url: 'https://en.wikipedia.org/wiki/Moore%27s_law', kind: 'article' },
      { label: 'Wikipedia — Dennard scaling', url: 'https://en.wikipedia.org/wiki/Dennard_scaling', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'vlsi-m01-l2',
    title: 'The MOSFET as a Switch and the CMOS Inverter',
    summary:
      'How a gate voltage controls a channel: NMOS vs PMOS conduction and their strong/weak levels, then the CMOS inverter as the pairing that consumes near-zero static power.',
    objectives: [
      'Model the MOSFET as a voltage-controlled switch with the correct strength asymmetries: NMOS passes strong 0, PMOS passes strong 1.',
      'Draw and trace a CMOS inverter for both input levels, identifying the pull-up (PMOS) and pull-down (NMOS) networks.',
      'Explain why static CMOS consumes near-zero DC current (only leakage) and where dynamic power goes.',
      'Explain why this switch model — not amplifier detail — is all digital VLSI needs.',
    ],
    whyItMatters:
      'Every gate in every chip you will ever design reduces to this: NMOS pulls down, PMOS pulls up, and the two networks never conduct simultaneously. Get this switch model right and the standard cells, libraries and power discussions of the rest of the course become obvious. Get it subtly wrong (the strong/weak asymmetry) and you will not understand why NAND is preferred over NOR — a classic interview question this lesson sets up.',
    prerequisites: [
      'Voltage, current and basic circuit intuition',
      'Digital gate truth tables (Digital Electronics course)',
      'VLSI scale and power concepts (vlsi-m01-l1)',
    ],
    explanation:
      'A **MOSFET** (metal-oxide-semiconductor field-effect transistor) is a voltage-controlled switch with three terminals that matter for digital design: **gate** (the control), **source** and **drain** (the switched path). The gate is insulated — no DC gate current — and the gate voltage creates or removes a conducting **channel** between source and drain.\n\nTwo polarities exist, and their asymmetry is the whole game:\n\n- **NMOS**: channel conducts when the gate is HIGH (relative to the source). It connects its output strongly to the *low* rail: an NMOS pulling down delivers a clean, strong 0. It is poor at passing a high level (the output tops out a threshold voltage below the gate — a degraded, weak 1).\n- **PMOS**: the complement. It conducts when the gate is LOW and connects strongly to the *high* rail (strong 1), but poorly passes a low (weak 0).\n\nDigital CMOS never asks either device to do its weak job. Every gate has a **pull-up network (PUN) of PMOS** connecting the output to VDD, and a **pull-down network (PDN) of NMOS** connecting it to GND — structured so that for *every* input combination exactly one network conducts and the other is off.\n\n### The CMOS inverter\n\nThe smallest CMOS gate: one PMOS (source to VDD) and one NMOS (source to GND), gates tied together as the input, drains tied as the output. Input HIGH → NMOS on, PMOS off → output pulled to 0. Input LOW → PMOS on, NMOS off → output pulled to 1. In steady state, one device is always fully off, so the DC current from VDD to GND is essentially **zero — only leakage flows**. This near-zero static power is the property that made CMOS the technology of VLSI.\n\nPower is consumed when the output *switches*: charging/discharging load capacitance (**dynamic power**, P ≈ αCV²f from Lesson 1) plus a brief transient **short-circuit current** while both devices partially conduct during the input transition. Static power is leakage — tiny per gate, but multiplied by billions of gates it became the end-of-Dennard story.',
    deepDive: '### Why the weak levels forbid certain circuits\n\nThe strong/weak asymmetry is not trivia; it forbids naive designs. An NMOS-only pass network chaining "1"s degrades the level at every hop — a few gates down the chain the "1" is unrecognizable. CMOS static gates solve it by construction: NMOS only ever discharges to GND (strong 0), PMOS only ever charges to VDD (strong 1), and the full rail level is restored at every gate output. This "level restoration" is the reason static CMOS is *composable* — you can chain millions of gates without signal quality decaying. Transmission-gate circuits (which pass both levels well by using NMOS and PMOS in parallel) exist precisely where pass-through behavior is wanted, and they are the exception that proves the rule.\n\n### From switch model to library reality\n\nReal device behavior (saturation regions, subthreshold leakage, velocity saturation) matters to library designers — but consumers of standard cells never see it. The abstraction boundary is the Liberty file (Module 2): the cell\'s switch-level truth is pre-digested into delay and power tables. Your job as a digital designer is to keep the two networks complementary (a job synthesis checks structurally) — the transistor physics is already paid for inside each cell.',
    examples: [
      {
        title: 'Tracing the CMOS inverter and NAND2 pull networks',
        language: 'text',
        code:
          'CMOS INVERTER:\n\n        VDD\n         |\n     +---+\n     |  PMOS  (conducts when IN=0)\n     |  |\nIN --+--+----+---- OUT\n        |    |\n        |  NMOS  (conducts when IN=1)\n        |  |\n     +--+\n        |\n        GND\n\n  IN=0 -> PMOS on,  NMOS off -> OUT=VDD (strong 1)\n  IN=1 -> PMOS off, NMOS on  -> OUT=0   (strong 0)\n  Steady state: exactly one device on -> I_dc ~= leakage only\n\nNAND2 NETWORKS (why series/parallel placement is forced):\n\n  PUN: two PMOS in PARALLEL  (either input low -> strong 1)\n  PDN: two NMOS in SERIES    (both inputs high -> strong 0)\n\n  a=0: either PMOS pulls OUT to 1  (strong: PMOS passes 1)\n  a=1,b=1: both series NMOS pull OUT to 0 (strong: NMOS passes 0)\n  Series NMOS is GOOD because a 0 is being passed;\n  the mirror image (NOR) puts PMOS in series — the weak case.',
        explanation: [
          'Inverter trace: both input rows show exactly one conducting device and the output at a full rail — no degraded levels, no static path from VDD to GND.',
          'The gate is insulated: control costs no DC current; only the output node\'s capacitance is charged and discharged during switching.',
          'NAND2 structure is forced by the strength rule: NMOS (strong-0 passers) go in series for the pull-down because they are discharging to GND; PMOS (strong-1 passers) go in parallel for the pull-up.',
          'The last line previews Lesson 3: swapping the roles (NOR) puts series PMOS in the pull-up — slower, because PMOS mobility is lower — which is why libraries favor NAND.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The strength asymmetry that shapes all CMOS',
        content:
          '            passes STRONG      passes WEAK\n  NMOS        0 (to GND)       1 (degraded)\n  PMOS        1 (to VDD)       0 (degraded)\n\n  RULE: never make a device pass its weak level.\n  -> NMOS forms the pull-DOWN network\n  -> PMOS forms the pull-UP network\n  -> every output is a full rail level (level restoration)',
        caption:
          'One asymmetry, one rule, and the entire static-CMOS gate architecture follows.',
      },
    ],
    tables: [
      {
        caption: 'NMOS vs PMOS switch behavior (digital model)',
        headers: ['Property', 'NMOS', 'PMOS'],
        rows: [
          ['Conducts when gate is', 'HIGH (1)', 'LOW (0)'],
          ['Connects output strongly to', 'GND (strong 0)', 'VDD (strong 1)'],
          ['Weak at passing', '1 (degraded high)', '0 (degraded low)'],
          ['Role in static CMOS', 'Pull-down network', 'Pull-up network'],
          ['Carrier', 'Electrons', 'Holes (lower mobility -> larger/weaker)'],
        ],
      },
      {
        caption: 'Where CMOS power goes',
        headers: ['Component', 'When it flows', 'Scale'],
        rows: [
          ['Static (leakage)', 'Always, when powered', 'Tiny per gate; billions of gates made it the end-of-Dennard issue'],
          ['Dynamic (switching)', 'Each output transition: αCV²f', 'Dominant at activity'],
          ['Short-circuit', 'Brief overlap during input transitions', 'Minor if edges are kept sharp'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Swapping the roles: PMOS pull-down, NMOS pull-up.',
        fix: 'Each device would then pass its weak level — outputs degrade and static current paths appear. Memorize the rule by the strong column: NMOS→0 (down), PMOS→1 (up); the network names follow.',
      },
      {
        mistake: 'Saying "CMOS uses no power".',
        fix: 'CMOS uses near-zero *static* power. Dynamic switching power (αCV²f) is real and dominant at activity, short-circuit current flows during transitions, and leakage multiplied by billions of gates is a first-order design constraint — the entire low-power flow exists because of these.',
      },
      {
        mistake: 'Assuming gate current flows into the gate like a BJT base.',
        fix: 'The MOS gate is insulated by an oxide: DC gate current is essentially zero. Control is by field, not by current — which is why fan-out in digital CMOS is capacitive (you charge other gates\' gates), not current-limited the way bipolar logic was.',
      },
    ],
    guidedPractice: {
      title: 'Trace a complementary network',
      brief:
        'A gate has PUN = two PMOS in series, PDN = two NMOS in parallel (this is NOR2). Trace all four input rows: which devices conduct, what value reaches OUT, and whether any row leaves the output at a degraded level.',
      starterCode:
        'Rows (a,b): 00 / 01 / 10 / 11\n  (0,0): PUN state = ______  PDN state = ______  OUT = ____\n  (0,1): PUN state = ______  PDN state = ______  OUT = ____\n  (1,0): PUN state = ______  PDN state = ______  OUT = ____\n  (1,1): PUN state = ______  PDN state = ______  OUT = ____',
      expectedBehavior:
        '(0,0): both PMOS on (series conducts) → OUT=strong 1; NMOS both off. (0,1): series PUN broken (one PMOS off); parallel PDN conducts via the b-NMOS → OUT=0 (strong, NMOS to GND). (1,0): symmetric → OUT=0. (1,1): PUN off, both NMOS conduct → OUT=0. NOR truth table; every output is a full rail level because each network does only its strong job.',
      hints: [
        'Series PMOS conducts only when BOTH gates are low.',
        'Parallel NMOS conducts when EITHER gate is high.',
        'Check each row: exactly one network active, output at a rail.',
      ],
    },
    practiceExercises: [
      {
        title: 'Design the networks for AND',
        brief:
          'AND is NOT(NAND). Starting from NAND2\'s networks, describe what an AND2 standard cell adds, and state the cost (device count and one extra stage of delay).',
        expectedBehavior:
          'AND2 = NAND2 + inverter (2 more transistors: 6 total vs 4). The inverter restores the level and provides the output buffer stage; cost is one extra stage of delay and 50% more devices — the reason synthesis prefers building ANDs as NAND+INV from the library.',
        hints: [
          'A bubble at the output of NAND is the difference.',
          'An inverter is one PMOS + one NMOS.',
          'Count: 4 (NAND) + 2 (INV) = 6.',
        ],
      },
      {
        title: 'Static power claim audit',
        brief:
          'A colleague claims a billion-transistor chip "draws zero current when idle because CMOS is zero-power." Write the two-sentence correction naming the actual current components when the clock is stopped.',
        expectedBehavior:
          'Even stopped, the chip draws leakage current (subthreshold and gate leakage) — billions of devices multiply tiny per-device leakage into a real number, which is why power gating and multi-VT libraries exist. Switching power drops to near zero with the clock, but static power never is zero; "near-zero static power" refers to ideal-switch CMOS, not a real leading-edge process.',
        hints: [
          'Distinguish switching power (activity-based) from leakage (always).',
          'Recall the end-of-Dennard story: leakage grew with shrink.',
          'Power gating (Module 4) is the industry answer — mention it.',
        ],
      },
    ],
    assessment: {
      title: 'MOSFET and inverter checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In static CMOS, why does the pull-down network use NMOS and the pull-up network use PMOS?',
          options: [
            'NMOS is cheaper to manufacture',
            'NMOS passes a strong 0 (to GND) and PMOS passes a strong 1 (to VDD) — each device does only its strong job',
            'PMOS cannot conduct at all in digital circuits',
            'It is a convention with no electrical reason',
          ],
          answer: 'NMOS passes a strong 0 (to GND) and PMOS passes a strong 1 (to VDD) — each device does only its strong job',
          explanation:
            'NMOS degrades high levels and PMOS degrades low levels. Restricting each network to its strong level guarantees full-rail outputs and level restoration at every gate.',
          hint: 'Which level does each device pass strongly?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'In a static CMOS inverter with a constant input, current flows steadily from VDD to GND through both transistors.',
          answer: 'false',
          explanation:
            'Exactly one device is fully off for any constant input, so no DC path exists from VDD to GND; steady current is leakage only. Current flows mainly during output transitions (dynamic and short-circuit).',
          hint: 'Trace both input levels: can both devices conduct at once in steady state?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'An NMOS pass transistor is used to carry a logic 1 through a chain of four such devices. What happens to the level?',
          options: [
            'It stays at full VDD',
            'It degrades at each hop — the high level is weak for NMOS',
            'It strengthens with each hop',
            'It becomes a strong 0',
          ],
          answer: 'It degrades at each hop — the high level is weak for NMOS',
          explanation:
            'NMOS passes a degraded high (roughly a threshold below the gate). Chained hops compound the degradation — this is exactly why static CMOS never asks NMOS to pass 1s.',
          hint: 'Check the weak column of the strength table.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the dominant CMOS power component, proportional to activity, capacitance, voltage squared and frequency.',
          answer: 'dynamic power',
          explanation:
            'Dynamic power P ≈ αCV²f is consumed charging and discharging load capacitance on every output transition — the dominant component at activity, and the V² term explains why voltage scaling was so valuable.',
          hint: 'It is what the αCV²f formula computes.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'MOSFET', definition: 'Voltage-controlled switch: insulated gate controls a channel between source and drain.' },
      { term: 'Pull-up network (PUN)', definition: 'PMOS network connecting the gate output to VDD.' },
      { term: 'Pull-down network (PDN)', definition: 'NMOS network connecting the gate output to GND.' },
      { term: 'Level restoration', definition: 'Property of static CMOS: every gate output is a full-rail level, so degradation never compounds.' },
      { term: 'Leakage', definition: 'The small steady current that remains in static CMOS; multiplied across billions of devices it is a first-order constraint.' },
    ],
    revisionSummary: [
      'NMOS conducts on gate-high and passes strong 0; PMOS conducts on gate-low and passes strong 1.',
      'Static CMOS: PUN (PMOS) + PDN (NMOS), complementary — exactly one conducts per input row.',
      'Static power ≈ leakage only; dynamic power αCV²f dominates at activity; short-circuit is transient.',
      'Never make a device pass its weak level — the rule that dictates series/parallel placement in every gate.',
      'Digital designers consume transistor physics through libraries; the switch model is the boundary.',
    ],
    furtherReading: [
      { label: 'Wikipedia — MOSFET', url: 'https://en.wikipedia.org/wiki/MOSFET', kind: 'article' },
      { label: 'Wikipedia — CMOS', url: 'https://en.wikipedia.org/wiki/CMOS', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlsi-m01-l3',
    title: 'CMOS NAND/NOR, Standard Cells and Boolean-to-Transistors',
    summary:
      'Build the workhorse gates from switch networks, see why libraries prefer NAND, and meet the standard cell — the library unit with drives, views and fixed geometry that synthesis actually consumes.',
    objectives: [
      'Derive the 2-input NAND and NOR switch networks and prove each from its truth table.',
      'Explain why NAND-based cells dominate libraries (series NMOS vs series PMOS mobility).',
      'Describe a standard cell: fixed row height, drive strengths (X1/X2/X4), multiple views (Liberty, LEF, GDS, Verilog).',
      'Turn a Boolean expression into a transistor-level sketch using the complementary-network recipe.',
    ],
    whyItMatters:
      'The standard cell is the currency of the entire ASIC flow: synthesis "technology maps" your RTL into exactly these cells, physical design places them in rows, and sign-off checks them against rules. Understanding what a cell *is* — one layout, many views, many drive strengths — demystifies what synthesis hands you and why two functionally identical netlists can differ in area, speed and power.',
    prerequisites: [
      'MOSFET strong/weak rule and inverter (vlsi-m01-l2)',
      'Boolean algebra and De Morgan identities (Digital Electronics course)',
    ],
    explanation:
      '### NAND2 and NOR2 from the recipe\n\nThe recipe for any static CMOS gate: build the PDN (NMOS) so it conducts exactly for the input rows where the output is 0, and the PUN (PMOS) as its logical complement (series ↔ parallel swap). For **NAND2** (out = ¬(a·b)): output is 0 only when a=1 AND b=1, so the PDN is two NMOS **in series** (both must conduct); the PUN is two PMOS **in parallel** (either low input conducts, pulling high). For **NOR2** (out = ¬(a+b)): output is 0 when either input is 1, so the PDN is two NMOS **in parallel**; the PUN is two PMOS **in series**.\n\n### Why NAND wins\n\nSeries stacks conduct through their carrier\'s mobility: NMOS series stacks carry electrons (fast); PMOS series stacks carry holes (roughly 2-3× lower mobility). NOR2\'s series PMOS pull-up is therefore the slow path, requiring oversized PMOS to match NAND\'s rise time — more area, more input capacitance. Libraries consequently offer NAND-rich families, and synthesis converts AND/OR structures into NAND/NOR-plus-inverter implementations (De Morgan identities) because the cells are simply better.\n\n### The standard cell\n\nA **standard cell** is a pre-designed gate with:\n- **Fixed geometry**: all cells in a library share one row height (power rails top and bottom), so thousands of cells tile into rows on the die.\n- **Drive strengths**: the same NAND exists as X1, X2, X4... — bigger transistors, more drive, more area and input capacitance. Synthesis picks the smallest drive that meets timing.\n- **Multiple views**: one design, several files — **Liberty (.lib)** for timing/power/area (synthesis and STA), **LEF** for physical footprint/pin locations (place and route), **GDS** for actual geometry (tape-out), **Verilog** for functional simulation.\n\nThe cell is the abstraction contract: digital designers reason about function and timing tables; the transistor design inside is done once, by the library team, per process.',
    deepDive: '### From Boolean function to transistors: the full recipe on AND-OR-INVERT\n\nTake f = ¬(a·b + c). Output is 0 when (a AND b) OR c is true → the PDN must conduct for rows where a·b=1 or c=1: that is (a-series-b) **in parallel with** c — three NMOS. The PUN is the dual: swap series/parallel — (a-parallel-b) **in series with** c, three PMOS. Verify two rows carefully, remembering that PMOS conducts on a 0 input. Row (a,b,c)=(1,1,0): the a-b series NMOS pair conducts → f=0 ✓; PUN: PMOS a is off (a=1), so the a∥b pair is broken and the series PUN is dead ✓ — exactly one network on. Row (a,b,c)=(0,c=0, any b): PDN off (a=0 kills the series pair; c=0 kills the c branch); PUN: PMOS a on makes the a∥b pair conduct, and PMOS c on completes the series path → f=1 ✓. The recipe is mechanical once you trust series=AND, parallel=OR within each network — with the polarity flipped between networks.\n\n### Views exist because tools do different jobs\n\nThe same NAND X1 is: a truth-table-plus-delay-tables to synthesis, a rectangle with pin coordinates to the router, polygons to the foundry, and a Verilog module to the simulator. Keeping the views consistent is itself a sign-off step (LVS — Module 4 — proves the GDS matches the schematic/netlist). When you hear "cell library", think "one design, N synchronized views", and you will understand why library releases are versioned events.',
    examples: [
      {
        title: 'NAND2 complete: networks, truth proof, and the NOR contrast',
        language: 'text',
        code:
          'NAND2: out = NOT(a AND b)\n\n            VDD\n       +-----+-----+\n       |           |\n     PMOS_a     PMOS_b      (parallel: either a=0 or b=0\n       |           |        gives a strong-1 pull-up)\n       +-----+-----+\n             +---- out\n             |\n        NMOS_a\n             |            (series: BOTH a=1 and b=1\n        NMOS_b               gives a strong-0 pull-down)\n             |\n            GND\n\n  Proof rows:\n  (a,b)=(0,0): PUN both on -> out=1   PDN off      OK\n  (0,1): PUN a-side on      -> out=1   PDN off      OK\n  (1,0): PUN b-side on      -> out=1   PDN off      OK\n  (1,1): PUN off, PDN chain -> out=0  (strong 0)   OK\n  Each row: exactly one network conducts.\n\n  NOR2 mirror: PDN parallel NMOS, PUN series PMOS\n  -> series PMOS = hole mobility -> slower pull-up\n  -> libraries favor NAND; synthesis maps OR-AND\n     trees toward NAND/NOR+INV accordingly.',
        explanation: [
          'The PUN/PDN placement is forced by the strength rule from Lesson 2: NMOS discharges to GND (series when both inputs must agree), PMOS charges to VDD (parallel when either suffices).',
          'All four rows show exactly one conducting network — the complementary property that guarantees zero static current and full-rail outputs.',
          'The NOR contrast is quantitative, not aesthetic: series PMOS stacks are slower because hole mobility is lower, so equal-performance NOR cells are larger.',
          'The final lines connect to Module 2: synthesis "technology mapping" is literally choosing among these cells (and their drive variants) to meet timing at least area.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'One standard cell, many views',
        content:
          '            NAND2_X1 (one physical design)\n                    |\n   +--------+-------+--------+-----------+\n   |        |       |        |           |\n .lib     LEF     GDS     Verilog     (SPICE/CDL)\n timing   physical layout   functional  reference\n power    footprint model   sim model   for LVS\n area     pin locations\n   |        |       |        |           |\n synthesis  P&R   tape-out  simulation  sign-off',
        caption:
          'The library team designs once; every tool consumes its own view. Consistency across views is itself verified (LVS, Module 4).',
      },
    ],
    tables: [
      {
        caption: 'Gate recipes (static CMOS)',
        headers: ['Gate', 'PDN (NMOS)', 'PUN (PMOS)', 'Output-0 rows'],
        rows: [
          ['INV', '1 NMOS series(=itself)', '1 PMOS', 'in=1'],
          ['NAND2', '2 NMOS series', '2 PMOS parallel', '11'],
          ['NOR2', '2 NMOS parallel', '2 PMOS series', '10, 01, 11'],
          ['AOI21 f=¬(ab+c)', '(a-ser-b) ∥ c', '(a-par-b) ser c', 'ab=1 or c=1'],
        ],
      },
      {
        caption: 'Standard cell views and their consumers',
        headers: ['View', 'Contains', 'Consumed by'],
        rows: [
          ['Liberty (.lib)', 'Timing arcs, power tables, area, pin caps', 'Synthesis, STA'],
          ['LEF', 'Footprint, pin positions, obstructions', 'Placement, routing'],
          ['GDS', 'Full layout geometry', 'Tape-out, DRC/LVS'],
          ['Verilog model', 'Functional behavior', 'Simulation, equivalence checking'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Building the PUN as the PDN\'s mirror image without swapping series/parallel.',
        fix: 'The networks are *duals*: series becomes parallel and vice versa (a NAND\'s series NMOS pair maps to parallel PMOS). Verify with one row from each output value — if both networks ever conduct, the structure is wrong.',
      },
      {
        mistake: 'Treating drive strengths (X1/X2/X4) as different logic.',
        fix: 'Same truth table, same function — only transistor sizes (drive, area, input capacitance) differ. Synthesis chooses drive per instance to meet timing at least area; do not "upgrade drives" by hand before checking timing reports.',
      },
      {
        mistake: 'Thinking synthesis output is "gates" generically rather than named library cells.',
        fix: 'A synthesized netlist instantiates specific cells (e.g., NAND2_X2) from one .lib with concrete areas and timing. That specificity is what makes area/timing/power reports meaningful — and what ties the design to one library (one process).',
      },
    ],
    guidedPractice: {
      title: 'Sketch AOI21 from the recipe',
      brief:
        'For f = ¬(a·b + c): state which input rows make f=0, draw (describe) the PDN, derive the PUN as its dual, and verify two rows — one f=0 and one f=1 — checking that exactly one network conducts.',
      starterCode:
        'f = 0 rows: ____________________\nPDN: a-b ______, that pair ______ c   (series/parallel?)\nPUN: a-b ______, that pair ______ c   (dual swap)\nVerify (1,1,0): PDN ______, PUN ______, f = ____\nVerify (0,1,1): PDN ______, PUN ______, f = ____',
      expectedBehavior:
        'f=0 rows: (a·b)=1 with any c, plus c=1 rows. PDN: (a series b) in parallel with c-NMOS. PUN (dual): (a parallel b) in series with c-PMOS. Verify (1,1,0): a-b series conducts → f=0; PUN off (a/b PMOS off) ✓. Verify (0,1,1): PDN conducts via c → f=0; PUN: a∥b off (a=0 → PMOS a on! careful: a=0 turns PMOS a ON, so a∥b ON; c=1 → PMOS c OFF → series PUN OFF) ✓ exactly one network on, f=0 ✓.',
      hints: [
        'Series = AND within a network; parallel = OR. Polarity flips between networks.',
        'PMOS conducts on input 0 — recheck each device per row.',
        'A correct structure never has both networks on in any row.',
      ],
    },
    practiceExercises: [
      {
        title: 'Drive-strength selection reasoning',
        brief:
          'A path misses timing; synthesis had chosen NAND2_X1 in the middle. Explain what changing to NAND2_X4 does to the path (input capacitance of downstream? drive of this stage?) and why synthesis did not do it itself at default effort.',
        expectedBehavior:
          'X4 drives harder (faster output transition into the same load) but presents larger input capacitance to the previous stage (possibly slowing it) and costs area/power. Synthesis balances this globally across all paths; at default effort it may prioritize other paths or area. The lesson: drive choice is a trade, not an upgrade — and is what timing-driven synthesis automates.',
        hints: [
          'Bigger drive helps downstream; bigger input cap hurts upstream.',
          'Area and power are not free — the tool optimizes them too.',
          'This is exactly the "mapping is structural, not magic" theme of Module 2.',
        ],
      },
      {
        title: 'View consistency audit',
        brief:
          'A library bug makes the LEF pin location of NAND2_X1 wrong by one track (the GDS and .lib are correct). Which flow stages misbehave, and which sign-off step is designed to catch layout/netlist mismatches?',
        expectedBehavior:
          'Placement and routing misbehave (routers connect to the wrong coordinates; pins may be unreachable or misaligned with wires). DRC may pass while connectivity is broken; LVS proves layout-vs-netlist equivalence — but the LEF/GDS mismatch specifically surfaces at P&R and final connectivity checks; the meta-lesson is that view consistency is a library QA problem before it is a design problem.',
        hints: [
          'Which view does the router read?',
          'What does LVS compare against what?',
          'Note who owns the bug: the library, not your design.',
        ],
      },
    ],
    assessment: {
      title: 'Cells and gates checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In a 2-input NAND, how are the NMOS and PMOS arranged, and why?',
          options: [
            'NMOS parallel, PMOS series — because NMOS is faster',
            'NMOS series, PMOS parallel — the output is 0 only when both inputs are 1, and each network does its strong job',
            'Both series — to minimize device count',
            'Both parallel — to maximize drive',
          ],
          answer: 'NMOS series, PMOS parallel — the output is 0 only when both inputs are 1, and each network does its strong job',
          explanation:
            'NAND out=0 requires both inputs high → series NMOS (discharging to GND, strong 0). The PUN is the dual: parallel PMOS, where either low input gives the strong-1 pull-up.',
          hint: 'Start from the rows where the output is 0.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Libraries favor NAND over NOR partly because NOR\'s series PMOS pull-up is slowed by the lower mobility of holes.',
          answer: 'true',
          explanation:
            'Series stacks inherit their carrier\'s mobility: NOR\'s series PMOS carries holes (~2-3× slower than electrons), so matching NAND performance requires oversized PMOS — more area and capacitance. NAND-centric libraries follow.',
          hint: 'Which device\'s series stack ends up in each gate?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'A synthesized netlist instantiates "NAND2_X2" from library lib_svt. What does the X2 designate?',
          options: [
            'A two-input XOR variant',
            'A drive-strength variant of the NAND2: larger transistors, more drive, more area and input capacitance',
            'A two-finger layout of the same cell with identical properties',
            'The second version of the cell in library revisions',
          ],
          answer: 'A drive-strength variant of the NAND2: larger transistors, more drive, more area and input capacitance',
          explanation:
            'Drive suffixes (X1, X2, X4...) size the same logic for more drive at the cost of area and input load. Synthesis picks the smallest drive meeting timing.',
          hint: 'Same truth table; what differs is electrical muscle.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: the library view (file format) that carries timing arcs, power tables and area for synthesis and STA.',
          answer: 'Liberty',
          explanation:
            'The Liberty (.lib) view is the timing/power/area contract consumed by synthesis and static timing analysis. LEF carries the physical view; GDS the geometry; Verilog the functional model.',
          hint: 'It is named as the ".lib" view in this lesson.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Standard cell', definition: 'Pre-designed gate with fixed row height, characterized views (.lib/LEF/GDS/Verilog) and drive variants.' },
      { term: 'Drive strength', definition: 'Size variant of a cell (X1/X2/X4): more drive with more area and input capacitance.' },
      { term: 'Dual network', definition: 'The PUN derived from the PDN by swapping series/parallel (and vice versa).' },
      { term: 'AOI/OAI complex gate', definition: 'And-OR / OR-AND-invert cells implementing multi-level Boolean functions in one stage.' },
      { term: 'Technology mapping', definition: 'Synthesis step choosing concrete library cells (and drives) to implement the optimized logic.' },
    ],
    revisionSummary: [
      'Recipe: PDN conducts on output-0 rows; PUN is its series/parallel dual.',
      'NAND2: series NMOS + parallel PMOS; NOR2 mirrors it and pays in series-PMOS (hole mobility).',
      'Standard cell = one design, many synchronized views; .lib for timing, LEF for P&R, GDS for tape-out, Verilog for sim.',
      'Drive variants trade drive against area/input-capacitance; synthesis automates the choice.',
      'Synthesis output is named cells from one library — that is what makes reports meaningful.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Standard cell', url: 'https://en.wikipedia.org/wiki/Standard_cell', kind: 'article' },
      { label: 'Wikipedia — NAND gate', url: 'https://en.wikipedia.org/wiki/NAND_gate', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
