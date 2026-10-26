import type { TutorialLesson } from '../types';

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'pcb-m02-l1',
    title: 'Power Integrity and Decoupling Capacitors',
    summary:
      'Why every IC wears a 100 nF capacitor: the charge reservoir logic worked out, bulk versus local decoupling, and voltage drop on real rails.',
    objectives: [
      'Explain why supply rails sag during fast current transients.',
      'Size the decoupling story qualitatively: local 100 nF caps plus bulk capacitance.',
      'Compute the charge a capacitor can deliver for a given droop budget.',
      'Compute voltage drop from rail resistance and load current.',
    ],
    whyItMatters:
      'The most common cause of "works until it does not" hardware behaviour — a chip resetting when a motor kicks, an ADC reading noise when a radio transmits — is power integrity. The 100 nF capacitor next to every chip is not a ritual; this lesson computes exactly what it buys and what happens without it.',
    prerequisites: [
      'pcb-m01-l1 (capacitors, I = C dV/dt)',
      'pcb-m01-l2 (regulators, rails)',
    ],
    explanation:
      '### The problem: current arrives late\n\nWhen a microcontroller clocks, it draws a spike of current in nanoseconds. The regulator is metres of trace away and simply cannot respond that fast — wiring inductance and finite regulator bandwidth stand in the way. During the spike, the local rail voltage **sags**; deep enough sags cause resets, glitches and noise coupling. The cure is a **local charge reservoir**: a small capacitor physically next to the IC, supplying the fast transient while the regulator catches up.\n\n### What 100 nF buys, computed\n\nA capacitor can supply charge Q = C x ΔV before its voltage droops by ΔV. For the standard C = 100 nF with an allowed droop of 0.3 V on a 3.3 V rail:\n\n```\nQ = 100e-9 F x 0.3 V = 30 nC\n```\n\nA transient drawing 10 mA can be supplied for t = Q/I = 30e-9 / 0.01 = **3 microseconds** — enormously longer than the nanosecond-scale spikes that matter, which is precisely the point: the local cap bridges the gap until the bulk capacitance and regulator take over. The division of labour:\n\n- **Local decoupling (100 nF ceramic per IC)**: handles the fastest transients; must sit millimetres from the supply pin, or trace inductance defeats it.\n- **Bulk capacitance (10-470 µF per rail region)**: refills the local caps during longer events; sits near the regulator or board entry.\n- **The regulator**: maintains the average.\n\n### Voltage drop on the rail itself\n\nReal rails have resistance. A 5 V supply feeding 0.5 A through 0.1 Ω of total trace and connector resistance drops V = I x R = 0.5 x 0.1 = **50 mV** — usually tolerable, but the same 0.1 Ω at 3 A drops 300 mV, and at the far end of a thin trace that becomes a real difference between "5 V" and "4.7 V at the load". Compute the drop before blaming the regulator.',
    deepDive:
      '### Why placement beats value\n\nDecoupling performance at high frequency is limited by **inductance in series with the capacitor** — the traces and vias, not the capacitance value. Every millimetre of trace adds roughly a nanohenry; at the frequencies of a fast edge, even 5 nH has significant impedance (2πfL grows with f), so a "perfect" 100 nF cap ten centimetres away is a poor decoupler at 100 MHz. Practical consequences: put the capacitor\'s pads directly on the power and ground pins; prefer vias-right-at-the-pad; and if more charge is needed, several smaller caps in parallel (with their lower total inductance) often outperform one big cap. This is why layout review questions about decoupling are always about *where*, rarely about *what value*.',
    examples: [
      {
        title: 'Decoupling budget and rail drop, computed',
        language: 'c',
        code: `#include <stdio.h>

int main(void) {
    /* Local 100 nF cap: charge available before 0.3 V droop */
    double c = 100e-9, droop = 0.3;
    double q = c * droop;                 /* coulombs */
    double i = 0.010;                     /* 10 mA transient */
    double t = q / i;                     /* seconds */
    printf("100nF supplies 10 mA for %.1f us before 0.3 V droop\\n",
           t * 1e6);

    /* Rail drop: 0.1 ohm of path resistance */
    double r = 0.1;
    printf("drop at 0.5 A: %.0f mV\\n", 0.5 * r * 1000.0);
    printf("drop at 3.0 A: %.0f mV\\n", 3.0 * r * 1000.0);
    return 0;
}`,
        explanation: [
          'q = 100e-9 x 0.3 = 30e-9 C = 30 nC.',
          't = 30e-9 / 0.01 = 3e-6 s = 3.0 µs — printed via t x 1e6.',
          'Rail drops: 0.5 x 0.1 = 0.05 V = 50 mV; 3.0 x 0.1 = 0.3 V = 300 mV.',
          'Expected output, exactly:',
          '100nF supplies 10 mA for 3.0 us before 0.3 V droop',
          'drop at 0.5 A: 50 mV',
          'drop at 3.0 A: 300 mV',
          'The three-microsecond figure dwarfs the nanosecond clock spikes that prompted the capacitor — the design margin is the lesson.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The power delivery ladder (illustrative)',
        content:
          '  regulator ---> bulk cap (10-470 uF) ---> [trace] ---> IC pin\n     |               |                                    |\n     |               |                                100 nF cap\n     |               |                                    |\n  slow but strong   medium                  fastest transients served HERE\n  (ms response)     (us response)           (ns response, millimetres away)\n\n  fast current spike timeline:\n   ns spike    <-- 100 nF local cap\n   us event    <-- bulk capacitor\n   dc and slow <-- regulator',
        caption:
          'Each tier of the ladder handles the timescale the tier above cannot reach. Placement (short, wide, low-inductance) is what makes the local tier work.',
      },
    ],
    tables: [
      {
        caption: 'Decoupling roles',
        headers: ['Tier', 'Typical value', 'Placement', 'Handles'],
        rows: [
          ['Local decoupling', '100 nF ceramic per IC', 'Millimetres from the pin', 'Nanosecond switching spikes'],
          ['Regional', '1-10 µF ceramic per functional area', 'Near the cluster', 'Microsecond events'],
          ['Bulk', '10-470 µF per rail', 'At regulator / board entry', 'Millisecond load steps'],
          ['Regulator', '—', '—', 'DC and slow changes'],
        ],
      },
      {
        caption: 'Rail drop versus current through 0.1 Ω of path',
        headers: ['Load', 'Drop', 'Verdict on a 5 V rail'],
        rows: [
          ['0.5 A', '50 mV', 'Fine (1%)'],
          ['1.5 A', '150 mV', 'Watch margins on 3.3 V logic'],
          ['3.0 A', '300 mV', 'Redesign: wider/shorter path or remote sensing'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Placing decoupling caps "somewhere on the rail" to tidy up the layout.',
        fix: 'Inductance between cap and pin defeats the cap at high frequency. The 100 nF must land on or next to the IC\'s power pins — a pretty board with distant decoupling is an unreliable board.',
      },
      {
        mistake: 'Believing bigger is safer: replacing every 100 nF with 10 µF.',
        fix: 'Large ceramic capacitors have more effective inductance and can interact with regulator stability; the standard recipe (local 100 nF plus regional/bulk) exists because each value covers a timescale. Follow the recipe; add deviation only with a reason.',
      },
      {
        mistake: 'Diagnosing a sagging rail by reading the schematic.',
        fix: 'Schematics cannot show trace resistance or missing decoupling. Measure: scope across a chip\'s power pins during the suspect event (module 03) — the trace shows the sag, the droop shape tells you which tier is missing.',
      },
    ],
    guidedPractice: {
      title: 'Two droop scenarios',
      brief:
        '(a) How long can a 1 µF local cap supply 50 mA before drooping 0.5 V? (b) A 3.3 V rail feeds 2 A through 0.05 Ω; what voltage arrives at the load?',
      expectedBehavior:
        '(a) Q = 1e-6 x 0.5 = 0.5 µC; t = 0.5e-6/0.05 = 10 µs. (b) Drop = 2 x 0.05 = 0.1 V, so the load sees 3.2 V.',
      hints: [
        'Q = C x ΔV, then t = Q/I.',
        'Drop = I x R; subtract from the nominal rail.',
      ],
    },
    practiceExercises: [
      {
        title: 'Missing decoupling autopsy',
        brief:
          'A microcontroller board resets whenever a nearby relay switches off. The relay has no flyback diode and the MCU\'s 100 nF decoupling was omitted "because it worked on the breadboard". Explain the failure chain in three sentences and name the two fixes.',
        expectedBehavior:
          'The relay coil\'s inductive kick dumps a spike onto the shared rail; with no local decoupling, the MCU\'s supply pins see the spike directly and the internal regulator/brown-out resets the chip. Fix 1: flyback diode across the coil (source control). Fix 2: fit the 100 nF at the MCU pins plus bulk near the entry (path hardening). On the breadboard, parasitic capacitance and shorter loops accidentally masked the issue.',
        hints: [
          'Where does the coil\'s stored energy go when the switch opens?',
          'Which component was supposed to absorb nanosecond-scale events at the chip?',
        ],
      },
      {
        title: 'Choose bulk capacitance',
        brief:
          'A motor driver draws 2 A pulses lasting 1 ms. The regulator can slew 0.5 A/ms. How much charge do the pulses need beyond the regulator\'s contribution, and what capacitance limits droop to 0.25 V?',
        expectedBehavior:
          'Extra current needed: 2 - 0.5 = 1.5 A for 1 ms -> Q = 1.5 mA... carefully: Q = I x t = 1.5 x 1e-3 = 1.5 mC. C = Q/ΔV = 1.5e-3/0.25 = 6 mF = 6000 µF. In practice the design would slow the pulse rate, raise the allowed droop, or pick a faster regulator — the arithmetic shows why motor drivers get large bulk caps.',
        hints: [
          'Q = I x t with the *net* current the caps must supply.',
          'C = Q/ΔV.',
          'Millifarad answers on a board are a design smell — say so.',
        ],
      },
    ],
    assessment: {
      title: 'Power integrity checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What is the primary reason a 100 nF capacitor must sit millimetres from an IC\'s power pin?',
          options: [
            'Trace inductance defeats the capacitor at high frequencies',
            'The capacitor would overheat further away',
            'Rail resistance destroys the capacitance value',
            'It is a convention with no electrical basis',
          ],
          answer: 'Trace inductance defeats the capacitor at high frequencies',
          explanation:
            'Every millimetre of trace adds inductance in series with the cap; at fast-edge frequencies that inductance dominates the impedance, so the cap must be electrically (not just nominally) at the pin.',
          hint: 'What series parasitic grows with distance?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: 'double q = 100e-9 * 0.3;\nprintf("%.0f nC", q * 1e9);',
          options: ['30 nC', '3 nC', '300 nC', '0 nC'],
          answer: '30 nC',
          explanation:
            'Q = C x ΔV = 100 nF x 0.3 V = 30 nC — the charge a standard decoupling cap delivers for a 0.3 V droop.',
          hint: '100e-9 x 0.3 = 30e-9.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A 5 V rail feeding 3 A through 0.1 Ω of trace delivers about 4.7 V at the load.',
          answer: 'true',
          explanation:
            'Drop = I x R = 3 x 0.1 = 0.3 V; 5 - 0.3 = 4.7 V. At 3 A the rail resistance stops being negligible.',
          hint: 'V = IR on the path, then subtract.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Which tier of the power ladder handles nanosecond-scale current spikes (two words, hyphenated)?',
          answer: 'local decoupling',
          explanation:
            'Local decoupling (100 nF at the pin) supplies the fastest transients; bulk caps and regulators respond too slowly for them.',
          hint: 'The capacitor physically at the chip.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Decoupling capacitor', definition: 'A capacitor placed at an IC\'s supply pins to supply fast current transients locally.' },
      { term: 'Bulk capacitance', definition: 'Larger rail-level capacitance that refills local caps during longer load events.' },
      { term: 'Rail droop/sag', definition: 'Momentary supply-voltage reduction during current transients.' },
      { term: 'Voltage drop', definition: 'I x R loss along supply path resistance; grows with current and thin/long paths.' },
      { term: 'ESL/ESR', definition: 'Equivalent series inductance/resistance of a real capacitor; set its high-frequency behaviour.' },
    ],
    revisionSummary: [
      'Fast current spikes come from the local cap: Q = CΔV, t = Q/I (30 nC, 3 µs for the classic 100 nF).',
      'Ladder: local 100 nF (ns) -> bulk (µs-ms) -> regulator (dc).',
      'Placement (low inductance) beats value at high frequency.',
      'Rail drop = I x R: compute it before suspecting the regulator.',
    ],
    furtherReading: [
      { label: 'Electronics Tutorials — Capacitors in DC circuits', url: 'https://www.electronics-tutorials.ws/capacitor/cap_1.html', kind: 'article' },
      { label: 'All About Circuits — Decoupling capacitors', url: 'https://www.allaboutcircuits.com/technical-articles/decoupling-capacitors/', kind: 'article' },
      { label: 'Wikipedia — Decoupling capacitor', url: 'https://en.wikipedia.org/wiki/Decoupling_capacitor', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'pcb-m02-l2',
    title: 'Grounding: Planes, Stars and Ground Bounce',
    summary:
      'Ground is a conductor, not a symbol: return-current thinking, star versus plane strategies, and why shared ground impedance makes two circuits talk to each other.',
    objectives: [
      'Treat ground as a real conductor with resistance and inductance.',
      'Contrast star grounding with ground planes and say when each fits.',
      'Explain ground bounce and shared-impedance coupling with numbers.',
      'Explain why return currents matter as much as supply currents.',
    ],
    whyItMatters:
      'Half of all "impossible" hardware bugs — noise that follows a cable, channels that click when a display refreshes, ADC readings that depend on what else is running — are shared-impedance grounding problems. The fix is almost never a better component; it is understanding where the current actually returns.',
    prerequisites: [
      'pcb-m02-l1 (rails, drop)',
    ],
    explanation:
      '### Ground is wire too\n\nThe ground symbol invites the fantasy that all ground points are the same point. They are not: ground is copper with **resistance** and, at the frequencies that matter for fast edges, **inductance**. Whenever two circuits share a piece of ground conductor, the current of one modulates the ground voltage of the other. That is **shared-impedance coupling**, and it is the mechanism behind most crosstalk-shaped mysteries.\n\nWorked magnitude: a 2 A motor pulse returns through 0.1 Ω of shared ground path, lifting the "ground" under a sensitive ADC by V = I x R = **0.2 V**. If the ADC\'s ground moved 0.2 V, its reading moved 0.2 V worth of counts — with nothing wrong in the ADC. The current did not ask permission; it took the conductor you gave it.\n\n### Two layout strategies\n\n- **Star grounding**: every circuit\'s ground returns run separately to one point, so no two circuits share a path. Clear and effective at DC and low frequencies, but physically awkward on complex boards (that is a lot of separate wires).\n- **Ground plane**: an unbroken copper layer as the return. Resistance and inductance are minimal, and each return current spreads under its own signal path. The default on any multi-layer PCB; the reason 2-layer designs try to keep a gridded/flooded ground.\n\nThe practical rule: single-board analog+digital systems use a plane, and if they must be split (rare, justified), the split is crossed exactly once at a defined point — not "wherever a trace happened to cross".\n\n### Ground bounce\n\nWhen several outputs switch simultaneously, their combined return current through the ground conductor\'s *inductance* generates a voltage (V = L di/dt) that lifts the local ground of the driver — visibly denting its own output levels and its neighbours\' inputs. This is **ground bounce**: the reason simultaneous switching limits exist in datasheets and why fast buses avoid switching every bit the same direction at once.',
    deepDive:
      '### Follow the loop, not the symbol\n\nEvery current is a loop: out along the supply, through the load, and *back* to the source. The return path is a design object — the plane under a signal trace is its return, and any slot, split or via field that interrupts it forces the current to detour, making a loop antenna out of your signal. The habit this builds: when reviewing a layout, pick the three largest currents (motor, display, radio) and physically trace their return loops. If any loop is large or shares a narrow path with sensitive analog circuitry, you have predicted a noise complaint before it exists. This loop-thinking also explains why cable shields connect at one end for low-frequency noise and both ends for high-frequency shielding — the shield is a return path whether you planned it or not.',
    examples: [
      {
        title: 'Shared-impedance and bounce magnitudes, computed',
        language: 'c',
        code: `#include <stdio.h>

int main(void) {
    /* shared ground path: 0.1 ohm, 2 A motor pulse */
    double r = 0.1, imotor = 2.0;
    printf("shared-path lift: %.2f V\\n", r * imotor);

    /* ground bounce: 10 nH of ground lead, 8 outputs
       switching 20 mA each in 1 ns */
    double l = 10e-9, di = 8 * 0.020, dt = 1e-9;
    double v = l * di / dt;
    printf("bounce from 8 outputs: %.2f V\\n", v);
    return 0;
}`,
        explanation: [
          'Shared path: 0.1 x 2 = 0.20 V — the ADC ground example from the lesson text.',
          'Bounce: di = 8 x 0.020 = 0.16 A over dt = 1 ns; V = L di/dt = 10e-9 x 0.16 / 1e-9 = 1.6 V.',
          'Expected output, exactly:',
          'shared-path lift: 0.20 V',
          'bounce from 8 outputs: 1.60 V',
          'The 1.6 V figure is worst-case arithmetic (real parts spread the edges), but it shows why datasheets limit simultaneous switching — and why ground inductance, not resistance, drives bounce.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Star versus plane grounding (illustrative)',
        content:
          '  STAR (small/low-frequency boards)      PLANE (multilayer default)\n\n            +-- analog gnd                      signal A  signal B\n  star ---->|                                      |         |\n  point     +-- digital gnd                 ===========================\n            |                                GROUND PLANE (unbroken)\n            +-- power gnd                  returns spread UNDER their\n                                                own signals\n  no shared segments; many wires         no shared segments; no extra wires\n  works at dc; awkward at speed          works up to high speed',
        caption:
          'Both strategies achieve the same goal — no two return currents share an impedance — by different means. The plane scales; the star does not.',
      },
    ],
    tables: [
      {
        caption: 'Grounding strategies compared',
        headers: ['Aspect', 'Star grounding', 'Ground plane'],
        rows: [
          ['Mechanism', 'Separate return wires to one point', 'Continuous copper; returns spread locally'],
          ['Works best at', 'DC to low frequency, low part count', 'All frequencies, any complexity'],
          ['Cost', 'Routing effort, many connections', 'An extra layer'],
          ['Failure mode', 'Long return loops radiate', 'Slots/splits force detours'],
          ['Typical use', 'Chassis wiring, small analog boards', 'Multilayer digital/mixed boards'],
        ],
      },
      {
        caption: 'Coupling magnitudes computed in this lesson',
        headers: ['Mechanism', 'Formula', 'Worked value'],
        rows: [
          ['Shared resistive lift', 'V = I x R', '2 A x 0.1 Ω = 0.2 V'],
          ['Ground bounce (inductive)', 'V = L di/dt', '10 nH x 0.16 A / 1 ns = 1.6 V'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Fixing ground noise by "thickening the ground wire" when the problem is a shared path.',
        fix: 'Lower resistance helps proportionally, but the structural fix is separating the paths (star) or giving each current its own plane return. Compute the shared segment\'s lift first; if it is the mechanism, re-route returns.',
      },
      {
        mistake: 'Cutting a ground plane to "keep digital noise away from analog".',
        fix: 'A split plane forces every signal that crosses the split to return the long way around, creating large loop antennas and radiated emissions — usually worse than the shared plane it replaced. Prefer one solid plane and disciplined part placement; split only with a specific, measured reason.',
      },
      {
        mistake: 'Measuring ground-referenced signals with a grounded scope and trusting the absolute value.',
        fix: 'Scope grounds clip to your "ground", which may itself be lifted. For sensitive measurements, measure *differentially* (probe the two nodes), or at least probe the local ground first to know your reference error (module 03 technique).',
      },
    ],
    guidedPractice: {
      title: 'Predict the coupling',
      brief:
        'A 100 mA LED string shares 0.05 Ω of ground path with an ADC front end. Compute the ground lift the ADC sees when the LEDs switch on, and state whether a 12-bit ADC with a 3.3 V reference would notice.',
      expectedBehavior:
        'Lift = 0.1 x 0.05 = 5 mV. One LSB of the ADC is 3.3/4096 ≈ 0.8 mV, so 5 mV is about 6 LSBs — absolutely visible in the readings. The fix is routing the LED return away from the ADC ground.',
      hints: [
        'V = I x R on the shared segment.',
        'LSB = Vref/2^N.',
        'Five millivolts versus 0.8 mV: ratio about 6.',
      ],
    },
    practiceExercises: [
      {
        title: 'Choose the strategy',
        brief:
          'For each system, pick star or plane and justify in one sentence: (a) a chassis-wired tube amplifier (all currents below 100 Hz); (b) a 4-layer mixed-signal board with a 50 MHz bus; (c) a battery pack with high-current cells and a small sense board.',
        expectedBehavior:
          '(a) Star: low frequency, few nodes, wiring-based construction. (b) Plane: multilayer exists for exactly this; returns follow signals. (c) Star at the system level: high-current returns get their own conductor to the common point so the sense board\'s ground is not lifted — the classic Kelvin-sensing instinct.',
        hints: [
          'Frequency and part count push toward planes; discrete wiring and safety separation push toward star.',
          'The question underneath is always: which currents share an impedance?',
        ],
      },
      {
        title: 'Bounce mitigation',
        brief:
          'A bus of 16 outputs switching 20 mA in 1 ns lifts shared ground by the computed mechanism. Give three independent design changes that reduce the bounce, each with a one-line reason.',
        expectedBehavior:
          '1. Slow the edges (series resistors / driver strength): di/dt falls linearly. 2. Stagger output timing (or avoid all-bits-same-direction patterns): peak simultaneous di falls. 3. Lower ground inductance (more ground pins/vias, plane): L falls. Any three of: reduce L, reduce di, increase dt — the formula tells you the levers.',
        hints: [
          'V = L di/dt has three factors; each is a lever.',
          'Series termination from the next lesson also slows edges.',
        ],
      },
    ],
    assessment: {
      title: 'Grounding checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A motor\'s 2 A return shares 0.1 Ω of ground path with an ADC. What offset does the ADC see?',
          options: ['0.2 V', '2.0 V', '20 mV', '0.02 V'],
          answer: '0.2 V',
          explanation:
            'V = I x R = 2 x 0.1 = 0.2 V. The ADC\'s measurements shift by that amount for as long as the current flows — shared-impedance coupling.',
          hint: 'Ohm\'s law on the shared segment.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Why is a ground plane generally better than star grounding on a fast digital board?',
          options: [
            'Returns spread under their own signals with minimal inductance',
            'It looks neater',
            'It increases ground resistance for stability',
            'It eliminates the need for decoupling capacitors',
          ],
          answer: 'Returns spread under their own signals with minimal inductance',
          explanation:
            'A plane gives every return a wide, low-inductance path local to its signal, keeping loop areas small. It does not remove the need for decoupling — that is a different job.',
          hint: 'Where does the return current physically flow?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Ground bounce is driven mainly by the resistance of the ground conductor.',
          answer: 'false',
          explanation:
            'Bounce comes from the inductive term V = L di/dt during fast simultaneous switching; resistance contributes a slower, smaller offset. Fast edges make inductance the dominant term.',
          hint: 'Which term involves the edge rate?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In one or two words: every current forms a loop with its supply — what do we call the path the current takes back to the source?',
          answer: 'return path',
          explanation:
            'The return path is half of every circuit; designing it (plane under the signal, no slots) is as important as the forward path. Undesigned returns detour and radiate.',
          hint: 'It returns.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Shared-impedance coupling', definition: 'Interference caused when two circuits share a ground/supply conductor with nonzero impedance.' },
      { term: 'Star grounding', definition: 'Routing every return separately to one common point to avoid shared segments.' },
      { term: 'Ground plane', definition: 'An unbroken copper layer acting as the low-inductance return for all signals above it.' },
      { term: 'Ground bounce', definition: 'Momentary local ground lifting caused by L di/dt of simultaneous switching currents.' },
      { term: 'Return path', definition: 'The conductor(s) carrying current back to its source; half of every circuit loop.' },
    ],
    revisionSummary: [
      'Ground has R and L; shared paths couple circuits (0.2 V per 2 A per 0.1 Ω).',
      'Star separates paths with wires; planes separate them with physics. Planes scale.',
      'Bounce = L di/dt: cut L, cut di, or slow the edges.',
      'Always trace return loops for the biggest currents — that is where noise is born.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Ground (electricity)', url: 'https://en.wikipedia.org/wiki/Ground_(electricity)', kind: 'article' },
      { label: 'All About Circuits — Grounding and decoupling', url: 'https://www.allaboutcircuits.com/technical-articles/introduction-to-grounding/', kind: 'article' },
      { label: 'Wikipedia — Ground bounce', url: 'https://en.wikipedia.org/wiki/Ground_bounce', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'pcb-m02-l3',
    title: 'Signal Integrity Basics and Prototyping Limits',
    summary:
      'When wires stop being wires: reflections from impedance mismatch, the rise-time-versus-length rule with the arithmetic done, series termination, and why breadboards betray fast circuits.',
    objectives: [
      'State when a trace must be treated as a transmission line (rise time vs round-trip delay).',
      'Explain reflections as impedance mismatch, and the series-termination remedy.',
      'Compute the critical length for a given rise time in FR-4.',
      'Explain breadboard parasitics and choose the right prototyping platform.',
    ],
    whyItMatters:
      'Circuits that simulate perfectly and fail on the bench almost always fail here: a fast edge hits a wire that is no longer "just a wire". Knowing the one inequality that separates wire-thinking from transmission-line thinking — and the cheap series-resistor fix — turns the most frustrating class of hardware bugs into routine engineering.',
    prerequisites: [
      'pcb-m02-l1 and pcb-m02-l2 (parasitics, return paths)',
    ],
    explanation:
      '### When a trace stops being a wire\n\nA logic edge is not instantaneous. While the edge travels down the trace, the input has not yet "seen" it; if the edge can travel to the far end and *back* before the driver has finished rising, reflections from the far end superimpose on the rising edge. The rule:\n\n```\ntreat as transmission line when:  2 x t_propagation > t_rise\n```\n\nIn FR-4, signals travel at roughly v ≈ 15 cm/ns. For a 1 ns edge, the critical length is L > v x t_rise / 2 = 15 x 1 / 2 = **7.5 cm** — traces longer than that need transmission-line thinking. For a slow 10 ns edge (an I2C line, a pushbutton), the critical length is 75 cm: nearly everything on a hobby board is "just a wire". This single calculation tells you which of your nets deserve care.\n\n### Reflections and the series resistor\n\nWhen a fast edge meets a change in impedance (trace → load), part of the wave reflects back. A high-impedance load reflects positively (the voltage overshoots and rings); a low-impedance driver re-reflects it, and the ringing repeats until absorbed. The classic low-cost fix on point-to-point nets is **series termination**: a small resistor (typically 22-75 Ω) at the *driver*, sized roughly to the line\'s characteristic impedance minus the driver\'s own output impedance. The resistor plus driver absorbs the reflected wave at the source, so it never bounces a second time. Cost: slightly slower edges. Benefit: clean single transitions instead of ringing — and, from the grounding lesson, slower edges also cut bounce and emissions.\n\n### Prototyping platforms and their parasitics\n\nA solderless breadboard\'s spring contacts add picofarads of stray capacitance between adjacent rows, series inductance in every jumper, and contact resistance that drifts. For slow circuits (the RC from module 01, an op-amp filter at audio rates) this is invisible; for fast edges (a 50 MHz clock) it is fatal — the same interconnect parasitics that define transmission lines live inside the breadboard, uncontrolled. Perfboard (soldered) is far better; ordering a real PCB from KiCad\'s gerber output (module 01) is cheap enough to be the default for anything with a clock faster than a few MHz.',
    deepDive:
      '### The honest scope of this lesson\n\nSignal integrity is a deep specialisation — full treatment needs S-parameters, IBIS models and field solvers, none of which this course claims to teach. What this lesson does establish is the triage skill: compute 2 x t_prop against t_rise, classify each net as "wire" or "line", and apply the two first-line remedies (slow the edge, series-terminate the driver) before reaching for simulation tools. On a typical hobby board, that triage resolves the great majority of real SI complaints: the 100 MHz line that rings, the reset line that double-triggers, the clock that shows shoulders on the scope. When a problem survives first-line remedies, the honest next step is a proper SI text or tool, not folklore.',
    examples: [
      {
        title: 'Critical length and edge-rate triage',
        language: 'c',
        code: `#include <stdio.h>

int main(void) {
    double v = 15.0;   /* cm per ns in FR-4 (approx) */

    double rises[3] = { 1.0, 5.0, 10.0 };  /* ns edges */
    for (int i = 0; i < 3; i++) {
        double tr = rises[i];
        double crit = v * tr / 2.0;   /* L > v*tr/2 -> line behaviour */
        printf("edge %.0f ns -> critical length %.1f cm\\n", tr, crit);
    }

    /* a 20 cm trace with a 1 ns edge: round trip vs rise */
    double tprop = 20.0 / v;
    printf("20 cm trace: t_prop = %.2f ns, 2x = %.2f ns vs 1 ns edge\\n",
           tprop, 2.0 * tprop);
    return 0;
}`,
        explanation: [
          'Critical length: L = v x t_rise / 2, because the condition is a round trip (2L/v) exceeding the rise time.',
          'Expected output, exactly:',
          'edge 1 ns -> critical length 7.5 cm',
          'edge 5 ns -> critical length 37.5 cm',
          'edge 10 ns -> critical length 75.0 cm',
          'The 20 cm trace: t_prop = 20/15 = 1.33 ns; round trip 2.67 ns — comfortably longer than the 1 ns edge, so this trace is a transmission line and needs termination thought.',
          'The triage table practically writes itself from this program: 1 ns edges (fast clocks, DDR-class signals) care about everything; 10 ns edges (buttons, I2C at 100 kHz) care about almost nothing.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Ringing versus series-terminated edge (illustrative)',
        content:
          '  unterminated long trace            with series resistor at driver\n\n  V                                  V\n  Hi-|        ~~~~~~ ~~-___          Hi-|            ______\n     |      /\\   /\\   /\\                |          /  (one clean edge)\n     |     /  \\ /  \\ /  \\               |         /\n     |    /    v    v    \\              |        /\n  Lo-|___/                 > t      Lo-|______/            > t\n\n  reflections bounce between ends      absorbed at the source; single\n  overshoot, rings, double-clocking    transition reaches the receiver\n\n  (educational waveform (illustrative) — schematic shapes,\n   not measured data)',
        caption:
          'An unterminated line rings; a series resistor at the driver absorbs the reflection and the edge arrives once. The cost is a slightly slower edge.',
      },
    ],
    tables: [
      {
        caption: 'Edge rate versus critical length (FR-4, v ≈ 15 cm/ns)',
        headers: ['Rise time', 'Critical length', 'Typical signals'],
        rows: [
          ['0.5 ns', '3.8 cm', 'Very fast clocks, memory buses'],
          ['1 ns', '7.5 cm', 'Fast MCUs, SPI at tens of MHz'],
          ['5 ns', '37.5 cm', 'Moderate logic edges'],
          ['10 ns', '75.0 cm', 'I2C, buttons, most analog control lines'],
        ],
      },
      {
        caption: 'Prototyping platforms',
        headers: ['Platform', 'Parasitics', 'Good for', 'Bad for'],
        rows: [
          ['Solderless breadboard', 'High: stray C between rows, jumper L, contact R', 'Slow logic, op-amp circuits, bring-up', 'Clocks above a few MHz, low-noise analog, power'],
          ['Perfboard (soldered)', 'Moderate; layout-dependent', 'One-off fixed circuits', 'Fast clocks without care'],
          ['Real PCB (KiCad gerbers)', 'Controlled and designed', 'Everything final', 'Iteration speed (days instead of minutes)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Treating every net as a transmission line "to be safe".',
        fix: 'The inequality 2L/v > t_rise is the classifier. A button net with a 10 ns edge needs no termination at hobby-board lengths; adding resistors everywhere costs board space and edge speed for no benefit. Triage, then treat.',
      },
      {
        mistake: 'Believing a breadboard result transfers to the final PCB.',
        fix: 'Breadboard parasitics (stray capacitance, jumper inductance, contact resistance) are uncontrolled and can be *better* or worse than the PCB. Fast-clock and precision-analog behaviour must be validated on the real layout; treat breadboard success as necessary, not sufficient.',
      },
      {
        mistake: 'Adding series termination at the receiver.',
        fix: 'Series termination belongs at the *driver*, where it absorbs the reflection on its second bounce. A resistor at the receiver simply forms a divider with the line. (Parallel termination at the receiver exists as a different scheme, consuming DC current — a deliberate, separate choice.)',
      },
    ],
    guidedPractice: {
      title: 'Classify three nets',
      brief:
        'A board runs at 3.3 V with 2 ns edges. Classify each net as wire or transmission line and justify: (a) a 4 cm clock trace; (b) a 25 cm ribbon-cable run to a display; (c) a 5 cm reset line.',
      expectedBehavior:
        'Critical length = 15 x 2/2 = 15 cm. (a) 4 cm < 15 cm: wire. (b) 25 cm > 15 cm: transmission line — add series termination or slow the edge. (c) 5 cm: wire, though slow edges on reset lines remain good practice for noise immunity.',
      hints: [
        'Compute the critical length first, then compare each physical length.',
        'Round-trip condition: 2L/v vs t_rise.',
        'Cables count their full length.',
      ],
    },
    practiceExercises: [
      {
        title: 'Design the series termination',
        brief:
          'A 50 Ω characteristic-impedance trace is driven by a part with 20 Ω output impedance. What series resistor value targets source matching, and what is the edge-speed trade-off you accept?',
        expectedBehavior:
          'R_series ≈ 50 - 20 = 30 Ω (nearest standard: 33 Ω). Trade-off: the divider of driver+resistor against the line launches a half-amplitude step that doubles at the far end (reflection from the open receiver) — clean, but edges are slower and receivers sample later in time.',
        hints: [
          'Match total source-side impedance to the line.',
          'The far-end reflection doubles the arriving wave — that is why half-amplitude launches work.',
        ],
      },
      {
        title: 'Breadboard forensics',
        brief:
          'A 16 MHz crystal oscillator circuit works erratically on a breadboard with long jumper wires to the MCU, but the same chip works on a colleague\'s tight perfboard layout. List the three parasitic mechanisms most likely responsible and one measurement (from module 03) that would confirm each.',
        expectedBehavior:
          '1. Jumper inductance + stray capacitance forming an LC with the crystal circuit: poor oscillation start-up — confirm with a scope on the OSC pins showing reduced/erratic amplitude. 2. Long ground return paths (shared impedance): glitches on other outputs during switching — confirm by probing a quiet output while toggling. 3. Contact resistance drift in spring contacts: intermittent resets — confirm by wiggling/monitoring the supply rail with the scope on rolling trigger. Any well-paired mechanism-and-measurement list is acceptable.',
        hints: [
          'Crystal circuits are the most parasitic-sensitive circuits beginners build.',
          'Each mechanism maps to a module-03 instrument.',
        ],
      },
    ],
    assessment: {
      title: 'Signal integrity checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'With signal speed ≈ 15 cm/ns in FR-4, what is the critical length for a 2 ns edge?',
          options: ['15 cm', '7.5 cm', '30 cm', '60 cm'],
          answer: '15 cm',
          explanation:
            'L = v x t_rise/2 = 15 x 2/2 = 15 cm. Traces longer than this see round-trip delays comparable to the edge and reflect.',
          hint: 'Half the distance the edge travels in one rise time.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Series termination works best when placed...',
          options: [
            'At the driver, absorbing the reflection at the source',
            'At the receiver, blocking reflections',
            'In the middle of the trace',
            'On the ground return',
          ],
          answer: 'At the driver, absorbing the reflection at the source',
          explanation:
            'The series resistor combines with the driver output impedance to match the line, damping the reflected wave when it returns to the source. Receiver-side series resistors just divide voltage.',
          hint: 'Absorb the bounce where it comes back to.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'An I2C line (rise times around tens of ns) on a 10 cm board trace needs transmission-line termination.',
          answer: 'false',
          explanation:
            'Critical length for a 10 ns edge is about 75 cm; a 10 cm trace is far below it. The line behaves as a wire; I2C design concerns are pull-up sizing and bus capacitance, not termination.',
          hint: 'Compute 2L/v and compare with the rise time.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In two words: the unwanted voltage wiggle superimposed on a fast edge when it bounces between line ends is called edge ______.',
          answer: 'ringing',
          explanation:
            'Ringing is the repeated reflection between mismatched ends; series termination damps it at the source. (The reflections themselves cause the ringing.)',
          hint: 'The waveform looks like a bell after impact.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Transmission line', definition: 'A conductor long enough (2L/v > t_rise) that reflections matter during an edge.' },
      { term: 'Characteristic impedance', definition: 'The impedance a line presents to a fast edge (typically 50-100 Ω on PCBs).' },
      { term: 'Reflection', definition: 'The portion of a wave sent back when it meets an impedance change.' },
      { term: 'Series termination', definition: 'A resistor at the driver sized to match source impedance to the line, damping reflections.' },
      { term: 'Breadboard parasitics', definition: 'Stray capacitance, inductance and contact resistance inherent to solderless prototyping.' },
    ],
    revisionSummary: [
      'Line behaviour when 2L/v > t_rise; critical length = v x t_rise/2 (7.5 cm for 1 ns edges in FR-4).',
      'Ringing = reflections from mismatch; first fixes: slow the edge, series-terminate the driver.',
      'Slow edges are a gift: less ringing, less bounce, less emission.',
      'Breadboards are for slow circuits; validate fast clocks on soldered layouts or real PCBs.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Signal integrity', url: 'https://en.wikipedia.org/wiki/Signal_integrity', kind: 'article' },
      { label: 'Wikipedia — Transmission line', url: 'https://en.wikipedia.org/wiki/Transmission_line', kind: 'article' },
      { label: 'Electronics Tutorials — Breadboards and prototyping', url: 'https://www.electronics-tutorials.ws/blog/breadboard.html', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
