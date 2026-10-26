import type { TutorialLesson } from '../types';

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'pcb-m03-l1',
    title: 'The Multimeter and the Bench Supply',
    summary:
      'The two instruments on every bench: when a meter\'s voltage, continuity and current modes each apply — and how current limiting turns a bench supply into a safety net.',
    objectives: [
      'Choose the correct meter mode (DC volts, continuity, current) for a given question.',
      'Measure voltage in parallel and current in series, and explain why the mistake is dangerous.',
      'Use a bench supply\'s current limit as both protection and a diagnostic tool.',
      'Interpret meter readings in the broken-LED circuit to localise a fault.',
    ],
    whyItMatters:
      'The multimeter is the first and last instrument in every debug session: it confirms the supply, finds the short, and verifies the repair. The current-limited bench supply is the quiet hero — it turns potential board-destroying faults into visible, diagnosable symptoms. Both skills are assumed silently by every hardware tutorial on the internet; this lesson makes them explicit.',
    prerequisites: [
      'pcb-m01-l1 (Ohm\'s law)',
      'pcb-m02-l2 (ground as a reference)',
    ],
    explanation:
      '### The meter, mode by mode\n\n- **DC volts**: the default mode. The meter is placed *in parallel* (across the two points) and draws essentially no current. Use it for: rail voltages at a chip pin, voltage across a resistor (then divide by resistance for current), checking a battery.\n- **Continuity (beeper)**: for unpowered circuits only — it injects its own tiny current to test whether two points are electrically joined. Use it for: broken traces, solder joints, connector pins, "is this really ground?". Using continuity on a powered board gives meaningless readings.\n- **Current**: the meter becomes a near-short (a low shunt) and must be placed *in series* with the current path. Forgetting to move the probe back to the voltage jack and probing across a supply puts that near-short across the rail — a dead short through the meter. This is the single most common way beginners blow meter fuses; the habit that prevents it is speaking the mode aloud before probing: "volts, parallel; amps, series".\n\n### The bench supply as a safety net\n\nSet the supply to the target voltage, then set the **current limit** slightly above the board\'s expected draw. Two outcomes, both useful: normal operation (CV — constant voltage, current below limit), or a fault (CC — constant current, voltage sags). The CC mode *is* the diagnosis: a board that draws its full limit current at 0 V has a hard short; a board that draws limit current only at full voltage has a partial fault. The limit turns "release the smoke" into a measurable symptom — and the meter built into the supply is often the fastest current readout on the bench.',
    deepDive:
      '### What the meter cannot tell you\n\nA DCM averages: on the PWM signal from module 03\'s next lesson, it reads the mean (duty x amplitude), never the switching. It samples slowly: a microsecond glitch, a brownout during a motor start, or an oscillation simply never appears. And its current mode perturbs small circuits: inserting a 0.1 Ω shunt is fine for a 500 mA rail, but on a microamp sensor line the burden voltage shifts the reading. The professional pattern is meter-then-scope: the meter answers "what is the DC story", the scope answers "what happens over time". Knowing which questions the meter *cannot* answer is as valuable as knowing its modes — and it is the exact boundary that motivates lesson 2.',
    examples: [
      {
        title: 'Localising a fault in the LED circuit, measurement by measurement',
        language: 'text',
        code: `Circuit under test (from module 01): 5 V rail -> R1 (150 ohm) -> D1 (LED, 2.0 V) -> GND

HEALTHY reference readings:
  rail to GND ............... 5.00 V
  across R1 ................. 3.0 V   (=> I = 3.0/150 = 20 mA)
  across D1 ................. 2.0 V
  LED lights.

FAULT CASE A:  LED open (burnt out)
  rail to GND ............... 5.00 V   (rail fine)
  across R1 ................. 0.0 V    (no current: I x R = 0)
  across D1 ................. 5.0 V    (the whole rail lands here)
  verdict: R1 has 5 V available but 0 V across it -> no current ->
  the only series element that can block is open: D1.

FAULT CASE B:  R1 open (bad joint)
  rail to GND ............... 5.00 V
  across R1 ................. 5.0 V    (all of it: no current flows)
  across D1 ................. 0.0 V
  verdict: the full supply appears across the *open* element,
  which is R1. Same total symptom, different localisation:
  the element with the full 5 V across it is the open one.

FAULT CASE C:  LED shorted
  across R1 ................. 5.0 V    (I = 5/150 = 33 mA)
  across D1 ................. 0.0 V    (short)
  verdict: current flows (R1 has voltage AND current), but the
  LED shows 0 V instead of ~2 V: it is shorted or backwards.`,
        explanation: [
          'The method: measure rail first (is the supply alive?), then walk down the current path element by element.',
          'Key principle: in a series circuit with no current, the FULL supply voltage appears across the open element — that is how you find an open without removing anything.',
          'Key principle: an element with voltage across it AND current through it is conducting; if its voltage is wrong (0 V instead of 2 V), it is the faulty element.',
          'Case A vs B shows why you must measure *across each element*, not just "somewhere": both faults give a dark LED, but the voltage pattern distinguishes them in two probes.',
          'Continuity mode (board unpowered) confirms the verdict: an open D1 beeps nothing across it in diode mode; a good LED shows a forward drop in diode test.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Meter placement: volts parallel, amps series (illustrative)',
        content:
          '  VOLTAGE (parallel):                CURRENT (series):\n\n   +5 V ---[R1]---+---[D1]--- GND    +5 V --[R1]--+--[A meter]--+--[D1]-- GND\n                  |                                                  |\n              (V meter)                                        meter completes\n              across D1                                        the current path\n\n  Continuity (powered OFF): beeps when two points are joined.',
        caption:
          'The meter is a high impedance in volts mode and a near-short in amps mode. The placement follows from the instrument, never the other way round. (Illustrative.)',
      },
    ],
    tables: [
      {
        caption: 'Meter mode selection',
        headers: ['Question', 'Mode', 'Placement', 'Caution'],
        rows: [
          ['What voltage is here?', 'DC volts', 'Parallel (across the points)', 'None — high impedance'],
          ['Are these two points joined?', 'Continuity', 'Across, board powered OFF', 'Meaningless on live circuits'],
          ['How much current flows?', 'DC amps', 'Series (break the path)', 'Never parallel to a supply'],
          ['Is this diode/LED good?', 'Diode test', 'Across, unpowered', 'In-circuit readings can mislead'],
        ],
      },
      {
        caption: 'Bench supply states and their meaning',
        headers: ['Mode shown', 'Meaning', 'Likely story'],
        rows: [
          ['CV, low current', 'Constant voltage, normal draw', 'Board healthy (verify against expected draw)'],
          ['CC at 0 V', 'Hard short: limit current at near-zero volts', 'Short on the board — find it (thermal, sniff, divide)'],
          ['CC at full voltage', 'Draw exceeds the limit while running', 'Partial fault or undersized limit setting'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Leaving the meter in current mode and probing across a supply.',
        fix: 'The ammeter is a near-short: across a rail it shorts it through the meter fuse. Ritual: say the mode and placement out loud before every probe, and return the leads to the voltage jack the moment current measurement ends.',
      },
      {
        mistake: 'Using continuity mode on a powered board.',
        fix: 'Continuity injects its own test current; powered circuits fight it and the beeper reports nonsense (or the meter suffers). Power down, discharge capacitors if large, then beep.',
      },
      {
        mistake: 'Setting the bench limit to maximum "so it definitely runs".',
        fix: 'The limit is your safety net and your first diagnostic. Set it just above the expected current draw; a fault then shows as CC instead of as heat, smoke and collateral damage.',
      },
    ],
    guidedPractice: {
      title: 'Read the measurements, name the fault',
      brief:
        'The LED circuit measures: rail 5.0 V, across R1 3.0 V, across D1 2.0 V — but the LED stays dark. Name the most likely fault and the one measurement that would confirm it.',
      expectedBehavior:
        'The voltages are exactly the healthy pattern (20 mA is flowing through R1), so the electrical path is fine — the LED element conducts but emits nothing: most likely the LED is the wrong colour/type (e.g. an IR LED, invisible) or damaged while still conducting. Confirm by measuring the same points with a phone camera (IR glows visibly on camera) or swapping D1.',
      hints: [
        'Compare against the healthy reference pattern from the lesson.',
        'If the pattern is healthy, the fault is not in the series DC path.',
        'What kind of LED conducts at 2.0 V but emits nothing you can see?',
      ],
    },
    practiceExercises: [
      {
        title: 'Set the bench for first power-up',
        brief:
          'A new board is expected to draw 80 mA at 5 V. Set out the bench supply procedure for first power-up, including the limit you would choose and what you would conclude from a CC-at-0 V result.',
        expectedBehavior:
          'Voltage 5.0 V; current limit ~100-120 mA (25-50% above expectation). Power on: expect CV at 5 V and 80 mA. CC at ~0 V means a hard short — power off, inspect for solder bridges (especially on IC power pins), check capacitor orientation, then retest at a lower limit.',
        hints: [
          'Limits slightly above expectation: enough for capacitors to charge, low enough to prevent damage.',
          'CC at 0 V is the signature of a short, not of a hungry board.',
        ],
      },
      {
        title: 'The burden-voltage trap',
        brief:
          'You measure the current of a 3 V coin-cell sensor node by inserting the meter in series; the node browns out and behaves erratically. Explain the mechanism in two sentences and give two better approaches.',
        expectedBehavior:
          'The meter\'s shunt plus leads add burden voltage; a coin cell already sags under load, and the extra drop pushes the node below its brown-out threshold. Better: measure with the bench supply\'s readout at a safe limit, or use a dedicated current probe / sense resistor with a millivolt meter (0.1 Ω x 10 mA is only 1 mV of burden).',
        hints: [
          'The meter is not invisible in series mode.',
          'Batteries under load have their own sag budget.',
        ],
      },
    ],
    assessment: {
      title: 'Meter and supply checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'How is a multimeter connected to measure voltage?',
          options: [
            'In parallel, across the two points of interest',
            'In series, breaking the current path',
            'Either, depending on the voltage',
            'Through the current jack only',
          ],
          answer: 'In parallel, across the two points of interest',
          explanation:
            'Volts mode is high-impedance: it samples the difference between two points without loading the circuit. Series connection is for current mode only.',
          hint: 'Volts parallel, amps series.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In a dark series circuit (5 V rail, R1, D1), which element has the full 5 V across it?',
          options: [
            'The open (faulty) element',
            'Always the resistor',
            'Always the LED',
            'None: voltages are zero without current',
          ],
          answer: 'The open (faulty) element',
          explanation:
            'With zero current, no healthy element drops voltage (V = IR = 0), so the entire supply appears across the break. This localises an open circuit in two probes.',
          hint: 'What does V = I x R give for I = 0?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A bench supply showing CC with output voltage near zero indicates the board is drawing less than expected.',
          answer: 'false',
          explanation:
            'CC at near-zero volts is the signature of a hard short: the supply delivers its limit current while the voltage collapses. Healthy boards run in CV.',
          hint: 'What load makes voltage sag to zero while current flows?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In one or two words: the unwanted voltage drop a meter adds when measuring current in series is called ______ voltage.',
          answer: 'burden',
          explanation:
            'Burden voltage is the drop across the meter\'s shunt and leads — significant on low-voltage, battery-powered circuits, where it can brown out the device under test.',
          hint: 'The meter burdens the circuit.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Parallel measurement', definition: 'Meter across two points (volts mode); high impedance, no current diverted.' },
      { term: 'Series measurement', definition: 'Meter inserted in the current path (amps mode); the meter becomes part of the circuit.' },
      { term: 'Burden voltage', definition: 'The voltage dropped by a current-mode meter\'s shunt and leads.' },
      { term: 'Current limit (CC/CV)', definition: 'Bench supply behaviour: constant voltage up to the limit, constant current beyond it.' },
      { term: 'Diode test', definition: 'Meter mode reporting a junction\'s forward drop; the quick LED/rectifier health check.' },
    ],
    revisionSummary: [
      'Volts in parallel, amps in series, continuity on dead circuits only.',
      'No current => full supply voltage across the open element: the two-probe open-circuit finder.',
      'Bench supply: set the limit just above expected draw; CC is a symptom, not a nuisance.',
      'A healthy-looking voltage pattern with a dark LED points at the LED itself, not the path.',
    ],
    furtherReading: [
      { label: 'Electronics Tutorials — Using a multimeter', url: 'https://www.electronics-tutorials.ws/blog/multimeter.html', kind: 'article' },
      { label: 'All About Circuits — Using the multimeter', url: 'https://www.allaboutcircuits.com/textbook/direct-current/chpt-3/meter-check-of-a-diode/', kind: 'article' },
      { label: 'Wikipedia — Multimeter', url: 'https://en.wikipedia.org/wiki/Multimeter', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'pcb-m03-l2',
    title: 'The Oscilloscope and Function Generator',
    summary:
      'Seeing over time: probes, triggering and scale knobs, then applying them to a PWM signal and a switching-regulator ripple — plus the function generator that feeds known signals in.',
    objectives: [
      'Set up a scope probe, compensate it, and explain 1x versus 10x.',
      'Describe triggering and why a stable trigger is the scope\'s core trick.',
      'Measure a PWM signal (frequency, duty, average) and regulator ripple, reading ASCII scope traces.',
      'Use a function generator to inject a known test signal.',
    ],
    whyItMatters:
      'The scope is the only instrument that shows *what happened over time* — which is where all real hardware behaviour lives. Glitches, sag, ringing, noise: the meter is blind to all of them. This lesson builds the minimum fluent scope technique, using the PWM and ripple measurements you will repeat in every embedded project.',
    prerequisites: [
      'pcb-m03-l1 (meter modes, ground reference)',
      'pcb-m01-l1 (RC time constants — for understanding probe loading)',
    ],
    explanation:
      '### The three knobs that matter\n\n- **Vertical scale** (volts per division): zooms the height. Set so the signal fills most of the screen without clipping.\n- **Horizontal scale** (seconds per division): zooms time. A 1 kHz PWM needs milliseconds across the screen; a 50 MHz clock needs nanoseconds.\n- **Trigger**: the scope redraws only when the input crosses your chosen level in your chosen direction — that is what makes a repeating waveform stand still on screen instead of smearing. No stable trigger, no usable trace: this is the knob beginners fight, and "trigger on a rising edge at mid-amplitude" is the default that works 90% of the time.\n\n### Probes\n\nA 10x probe divides the signal by ten in exchange for much lower loading on the circuit (roughly 10 MΩ input instead of 1 MΩ, and less capacitance). Set the scope to match (10x) or every reading is off by ten. Compensation: the probe has a trimmer capacitor; on the scope\'s built-in square wave, adjust for flat tops — an under/over-compensated probe rounds or overshoots *every* measurement you make with it.\n\n### Two canonical measurements\n\n**PWM** (pulse-width modulation): a square-ish wave whose information is in the duty cycle. From the trace below: period 1 ms (1 kHz), high time 0.5 ms (50% duty), amplitude 3.3 V. The DMM from lesson 1 would read the average: 0.5 x 3.3 = 1.65 V — consistent, but blind to the switching; the scope sees everything.\n\n**Ripple**: a switching regulator\'s output is DC plus a small sawtooth at its switching frequency. The technique: AC coupling (removes the DC so the small wiggle can be amplified on screen), generous vertical sensitivity, and honest probe grounding (short ground lead — a long loop picks up switching fields and fakes ripple).',
    deepDive:
      '### Reading a scope like an instrument, not a picture\n\nThree habits separate users from operators. First, always confirm the ground reference: touch the probe tip to the ground clip — the trace should sit exactly on your assumed zero; if it does not, your ground path (or the scope\'s offset setting) is lying. Second, distrust single acquisitions: run the trigger and watch for *variations* between traces — a glitch that appears one frame in fifty is real hardware behaviour, and the scope\'s persistence mode makes it visible. Third, match the probe to the question: 10x for most points, but for low-level ripple use the shortest ground connection possible (a spring-style tip if available), because every centimetre of ground lead is an antenna for exactly the switching fields you are measuring. These habits cost minutes and save the classic "the scope shows noise everywhere" false alarm.',
    examples: [
      {
        title: 'PWM signal, measured on a scope (ASCII trace)',
        language: 'text',
        code: `Scope setup: 1 V/div vertical, 0.2 ms/div horizontal,
trigger rising edge at 1.6 V, DC coupled, 10x probe.

  3.3 V +   ___       ___       ___
        |  |   |     |   |     |   |
        |  |   |     |   |     |   |
      0 +__|   |_____|   |_____|   |_____
        |
        +---|---|---|---|---|---|---|---> t
        0  0.2 0.4 0.6 0.8 1.0 1.2 1.4  ms

Readings from the trace:
  period    = 1.0 ms  -> frequency = 1/0.001 = 1 kHz
  high time = 0.5 ms  -> duty = 0.5 ms / 1.0 ms = 50%
  amplitude = 3.3 V   (tops of the pulses)
  average (what a DMM would show) = duty x V = 0.5 x 3.3 = 1.65 V`,
        explanation: [
          'Each horizontal division is 0.2 ms; count divisions between rising edges: 5 divisions = 1.0 ms period.',
          'Duty cycle is the ratio of high time to period: 2.5 divisions high / 5 divisions = 50%.',
          'The top of the pulse sits 3.3 divisions above zero at 1 V/div = 3.3 V.',
          'The DMM agreement check: 0.5 x 3.3 = 1.65 V — cross-instrument consistency is a habit worth building.',
          'The stable trace exists because the trigger fires on each rising edge at 1.6 V (mid-amplitude); without it, each sweep would start at a random point of the waveform.',
        ],
      },
      {
        title: 'Switching-regulator ripple, measured with AC coupling (ASCII trace)',
        language: 'text',
        code: `Scope setup: 20 mV/div vertical, AC coupled (DC removed),
5 us/div horizontal, 10x probe with SHORT ground spring.

  +40 mV +      ___           ___
        |      /   \\         /   \\
        |     /     \\       /     \\
        |    /       \\     /       \\
      0 +---/---------\\---/---------\\---
        |               \\_/
  -40 mV +
        +---|---|---|---|---|---|---> t
        0   5  10  15  20  25  30  us

Readings:
  ripple frequency = 1 / 10 us = 100 kHz (switching frequency)
  ripple amplitude = about 80 mV peak-to-peak (4 divisions x 20 mV)
  DC level (switch scope to DC coupling): 5.00 V`,
        explanation: [
          'AC coupling removes the 5 V DC so the ±40 mV wiggle fills the screen — with DC coupling the same wiggle would be a hairline on top of the rail.',
          'One ripple cycle spans 2 divisions = 10 µs: 100 kHz, the converter\'s switching frequency.',
          'Amplitude: 4 divisions at 20 mV/div = 80 mV peak-to-peak — compare against the datasheet\'s ripple spec.',
          'The short ground spring matters: a long clip lead loop picks up the converter\'s switching field and would fabricate extra "ripple".',
          'Expected behaviour note: this is an illustrative teaching trace; a real measurement depends entirely on the converter, load and layout.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Scope signal path (illustrative)',
        content:
          '  probe (10x) ---> vertical amp ---> ADC ---> display\n       |                               ^\n       |                               |\n  circuit under test            trigger circuit <-- decides when to sweep\n       |                               ^\n       +-- ground clip ---- scope ground\n\n  Trigger = the metronome: same edge, same level, every sweep\n  => waveform stands still.',
        caption:
          'The trigger decides when each sweep starts; everything else on the scope is presentation. (Illustrative block diagram.)',
      },
    ],
    tables: [
      {
        caption: 'Scope setup recipes',
        headers: ['Measurement', 'Coupling', 'Vertical', 'Trigger', 'Probe'],
        rows: [
          ['PWM timing', 'DC', 'Amplitude per div', 'Rising edge, mid-level', '10x'],
          ['Regulator ripple', 'AC', '10-50 mV/div', 'Edge or free-run', '10x, short ground'],
          ['Logic glitch hunt', 'DC', 'TTL levels', 'Pulse-width/glitch trigger if available', '10x'],
          ['Startup transient', 'DC', 'Amplitude per div', 'Single-shot on rising edge', '10x'],
        ],
      },
      {
        caption: 'Meter versus scope on the same signals',
        headers: ['Signal', 'DMM shows', 'Scope shows'],
        rows: [
          ['3.3 V rail, healthy', '3.30 V', 'flat line'],
          ['PWM at 50% duty', '1.65 V (average)', 'the square wave, duty, edges'],
          ['Rail with 80 mV ripple', '5.00 V (average)', 'the 100 kHz sawtooth'],
          ['Glitch 1 us wide', 'nothing', 'the glitch, if triggered right'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reading amplitudes with the probe set to 1x while the scope says 10x (or vice versa).',
        fix: 'The scope multiplies by the *assumed* attenuation. Mismatched settings give exactly 10x errors. Ritual: check the probe switch and the scope channel setting together, every session.',
      },
      {
        mistake: 'Measuring ripple with a long ground clip lead.',
        fix: 'The clip-lead loop picks up magnetic switching fields and injects them into the measurement — you measure your probe, not the board. Use the shortest ground possible and confirm by moving the probe around (real ripple stays put relative to the converter).',
      },
      {
        mistake: 'Leaving the trigger on "auto" with a badly-set level and concluding the signal is unstable.',
        fix: 'If the trace drifts or doubles, the trigger level/direction is wrong, not the circuit. Set the level to mid-amplitude, pick the correct slope, and only then interpret the waveform.',
      },
    ],
    guidedPractice: {
      title: 'Read a new trace',
      brief:
        'A PWM trace at 0.1 ms/div shows a high time of 3 divisions and a period of 8 divisions, amplitude 3 divisions at 1 V/div. Compute frequency, duty cycle, amplitude and the DMM average.',
      expectedBehavior:
        'Period = 0.8 ms -> 1.25 kHz. Duty = 3/8 = 37.5%. Amplitude = 3 V. DMM average = 0.375 x 3 = 1.125 V.',
      hints: [
        'Period = divisions x time/div; frequency = 1/period.',
        'Duty = high divisions / total divisions.',
        'Average = duty x amplitude.',
      ],
    },
    practiceExercises: [
      {
        title: 'Design the ripple measurement',
        brief:
          'You must measure the ripple of a 12 V rail from a converter switching at 500 kHz, expecting under 50 mV p-p. Specify coupling, vertical scale, horizontal scale, trigger and grounding, and explain each choice in one line.',
        expectedBehavior:
          'AC coupling (remove 12 V DC so mV/div is usable); 10 mV/div (50 mV fills 5 divisions); 2 us/div (one switching cycle = 2 us spans a division-width); trigger on edge or free-run (ripple is repetitive); shortest ground connection (switching fields). Confirm with DC coupling that the rail sits at 12.0 V.',
        hints: [
          'Coupling first: it decides whether mV/div is meaningful.',
          'Horizontal scale: show 2-3 cycles.',
          'Ground lead length was lesson-critical for exactly this measurement.',
        ],
      },
      {
        title: 'Trigger autopsy',
        brief:
          'A colleague says "the scope shows the clock signal doubling and sliding sideways — the oscillator must be broken." State the two most likely scope-setup causes and the checks, before any conclusion about the oscillator.',
        expectedBehavior:
          '1. Trigger level outside the signal swing or wrong slope: the sweep starts at random points, doubling/sliding the trace — set mid-level rising edge. 2. Timebase mismatched (e.g. aliasing-like visual wrap at slow settings relative to a fast clock): adjust sec/div until 2-3 cycles fit. Only with both corrected and the doubling persisting does the oscillator hypothesis earn scope evidence.',
        hints: [
          'Sliding/doubled traces are trigger symptoms before they are circuit symptoms.',
          'Count cycles per screen: too many or too few both lie.',
        ],
      },
    ],
    assessment: {
      title: 'Oscilloscope checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What makes a repeating waveform stand still on the scope screen?',
          options: [
            'The trigger starting each sweep at the same point',
            'The vertical scale being set correctly',
            'AC coupling',
            'A 10x probe',
          ],
          answer: 'The trigger starting each sweep at the same point',
          explanation:
            'The trigger fires each sweep when the signal crosses the set level in the set direction, aligning every sweep identically. Scale and coupling affect presentation, not stability.',
          hint: 'It decides when each sweep begins.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A PWM trace shows 5 divisions per period at 0.2 ms/div and 2.5 divisions high. Frequency and duty?',
          options: ['1 kHz, 50%', '2 kHz, 25%', '1 kHz, 25%', '2.5 kHz, 50%'],
          answer: '1 kHz, 50%',
          explanation:
            'Period = 5 x 0.2 ms = 1 ms -> 1 kHz. Duty = 2.5/5 = 50%.',
          hint: 'Period first, then the ratio.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'AC coupling is the right choice for measuring small ripple on a 5 V rail.',
          answer: 'true',
          explanation:
            'AC coupling removes the 5 V DC so the millivolt-scale wiggle can be displayed at sensitive vertical scales; DC coupling would pin the trace at the rail.',
          hint: 'What blocks the DC?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'A DMM across the 50% duty, 3.3 V PWM signal from this lesson reads what voltage (number only, in volts)?',
          answer: '1.65',
          explanation:
            'The meter averages: 0.5 x 3.3 = 1.65 V. Consistent with the scope but blind to the switching — the two instruments answer different questions.',
          hint: 'Multiply duty by amplitude.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Trigger', definition: 'The condition (level, slope) that starts each scope sweep, stabilising the display.' },
      { term: 'Vertical/horizontal scale', definition: 'Volts and seconds per screen division: the scope\'s zoom controls.' },
      { term: '10x probe', definition: 'A dividing probe trading signal amplitude for much lower circuit loading.' },
      { term: 'AC coupling', definition: 'A series capacitor removing DC so small AC details can be displayed at sensitive scales.' },
      { term: 'Duty cycle', definition: 'Fraction of the period a PWM output spends high; its information content.' },
      { term: 'Function generator', definition: 'An instrument producing known waveforms (sine/square/sweep) for injecting test signals.' },
    ],
    revisionSummary: [
      'Trigger = stability. Mid-level rising edge first, then interpret.',
      'PWM: period, duty, amplitude from divisions; DMM cross-checks the average (duty x V).',
      'Ripple: AC coupling, sensitive vertical, short ground — and distrust long clip leads.',
      'Match probe attenuation to scope setting; compensate on the built-in square wave.',
    ],
    furtherReading: [
      { label: 'Electronics Tutorials — Oscilloscopes', url: 'https://www.electronics-tutorials.ws/oscillator/oscilloscope-tutorial.html', kind: 'article' },
      { label: 'All About Circuits — Oscilloscope basics', url: 'https://www.allaboutcircuits.com/textbook/', kind: 'article' },
      { label: 'Wikipedia — Oscilloscope', url: 'https://en.wikipedia.org/wiki/Oscilloscope', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'pcb-m03-l3',
    title: 'Logic Analyzers, Systematic Debug and ESD',
    summary:
      'Many channels, decoded protocols: when the logic analyzer beats the scope; a divide-and-conquer debug method demonstrated end to end; and the ESD handling rules that keep boards alive.',
    objectives: [
      'Choose between oscilloscope and logic analyzer for a given problem.',
      'Run a structured symptom-hypothesis-test debug loop on a broken circuit.',
      'Decode a simple digital transaction conceptually (UART-style) from LA data.',
      'Apply ESD-safe handling to protect boards during debug.',
    ],
    whyItMatters:
      'Real debugging is a method, not inspiration. The divide-and-conquer loop in this lesson is the same one used on spacecraft and hobby boards alike, and the logic analyzer is its favourite tool for digital systems: sixteen channels of truth about what the firmware actually said. ESD awareness is the quiet difference between debugging a board and killing it.',
    prerequisites: [
      'pcb-m03-l1 and pcb-m03-l2 (meter, scope, bench supply)',
      'pcb-m01-l3 (the LED-button circuit)',
    ],
    explanation:
      '### Scope versus logic analyzer\n\nA **logic analyzer** records many digital channels (8-16-32+) at once, storing logic levels over time and — on modern tools — **decoding protocols** (UART, I2C, SPI) into human-readable bytes. It answers "what did the digital system *say*". The scope answers "what did the *voltage* do" — edges, levels, ringing, glitches below the logic threshold. The selection rule: digital sequencing questions (why is the display not responding — what is on the I2C bus?) go to the logic analyzer; analog-quality questions (is that I2C clock edge clean? is the 3.3 V rail sagging?) go to the scope. Complex problems use both: LA for the conversation, scope for the waveforms.\n\n### The systematic debug loop\n\n1. **Symptom**: state it precisely and minimally ("LED D1 never lights when SW1 is pressed" — not "the board is broken").\n2. **Hypothesis**: a specific, falsifiable claim ("D1 is installed backwards").\n3. **Test**: the cheapest measurement that splits the hypothesis space ("voltage across D1 when pressed").\n4. **Halve, repeat**: each test should divide the remaining possibilities roughly in half (supply path vs signal path; then transmitter vs receiver; then...).\n5. **Fix and verify**: repair, then re-run the original symptom check — and note the root cause in the project log.\n\nThe worked example below runs this loop on the module-01 LED-button circuit with a specific measurement trail that localises the fault in five probes.',
    deepDive:
      '### ESD: the invisible debug hazard\n\nElectrostatic discharge — the body comfortably charged to thousands of volts — degrades or kills IC inputs silently: a board can "work" after a zap and fail in the field weeks later. The handling rules are cheap and absolute: work on a grounded mat with a wrist strap to the same ground; touch the chassis/ground point before handling loose boards; store and transport boards in conductive bags; never slide boards across synthetic surfaces; keep loose ICs in conductive foam until they are soldered. On the bench this costs seconds; the failure mode it prevents — the intermittent, appearing-weeks-later field failure — costs days. Note the honest scope of the claim: ESD damage is usually *latent* and statistical, which is precisely why the discipline matters even when "nothing bad has happened yet".',
    examples: [
      {
        title: 'Divide-and-conquer on the LED-button circuit, five probes',
        language: 'text',
        code: `SYMPTOM: pressing SW1 does not light D1 (LED-button circuit, module 01).
         Firmware is confirmed running (blinking heartbeat LED works).

Probe 1 (meter, DC V): 5 V rail at the regulator output = 5.02 V
  -> supply alive. Halves the space: not a power problem.

Probe 2 (meter, DC V): voltage at BTN_IN with SW1 open  = 5.01 V
  -> pull-up R2 works; the input node is defined.
  Press and hold: BTN_IN reads 0.02 V
  -> button and its ground path are FINE.
  Halves again: the input side is innocent.

Probe 3 (meter, DC V): LED_OUT pin when firmware should drive = 0.05 V
  -> hmm: firmware *intends* LED_OUT high (firmware log says so).
  Hypothesis: firmware drives the WRONG pin (config bug), or the
  pin is stuck. Test: LED_OUT is bit 3 of port B; blink bit 3
  directly in a loop...

Probe 4 (scope): LED_OUT toggles cleanly 0 <-> 3.3 V at 2 Hz
  in the direct-blink test.
  -> the pin works. Halves again: firmware mapping was wrong
  (it was driving port B bit 4; the LED sits on bit 3).

Probe 5 (logic analyzer on the port header): after fixing the
  firmware bit, LA shows LED_OUT asserted exactly when the
  press flag is set; scope confirms the LED anode rises to
  2.9 V under load.

FIX: firmware now drives PB3. VERIFY: symptom gone (D1 lights
on press). LOG: root cause = wrong bit mapping in board.h.`,
        explanation: [
          'Each probe is chosen to cut the remaining hypothesis space roughly in half: supply -> input path -> output pin -> firmware mapping -> final verification.',
          'Probe 3\'s surprise (pin low while firmware claims high) is the pivotal measurement: it splits "electronics broken" from "firmware lying", and the direct-blink test (probe 4) settles it.',
          'The logic analyzer (probe 5) earns its place at the end: multiple channels show the *causal* relationship (press flag -> output assert), which one scope channel cannot.',
          'Note the pattern: no component was replaced until a measurement justified it. Shotgun part-swapping is the anti-pattern this loop exists to prevent.',
          'The verify step re-runs the original symptom check, and the log records the root cause — both steps are skipped exactly when the same bug returns next month.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Logic analyzer view of a UART byte (illustrative decode)',
        content:
          '  ch0: TX line          ___      ___ ___ ___ ___ ___\n                        |  |    |               |   |\n                     ___|  |____|               |   |_____\n\n  LA decode (8N1, 9600 baud):\n    start bit (low) -> 8 data bits LSB-first -> stop bit (high)\n    sampled byte: 0x53  ("S")\n\n  16 channels show the whole conversation at once:\n    ch0 TX, ch1 RX, ch2 chip-select, ch3-6 SPI, ch7-8 I2C...\n  (educational waveform (illustrative) — schematic bit pattern)',
        caption:
          'The analyzer timestamps every edge on every channel and decodes protocols into bytes — the digital system\'s own story of what it said.',
      },
      {
        kind: 'block',
        title: 'The debug loop',
        content:
          '  +-----------+     +-------------+     +----------+\n  |  SYMPTOM  | --> |  HYPOTHESIS | --> |   TEST   |\n  | (precise) |     | (specific)  |     | (cheapest|\n  +-----------+     +-------------+     |  halving)|\n        ^                               +----+-----+\n        |                                    |\n        |        +-------------+             v\n        +--------| VERIFY/FIX  | <---- halves the space?\n                 | + log cause |       no -> next hypothesis\n                 +-------------+       yes -> fix and verify',
        caption:
          'Debug as a halving search: precise symptom, falsifiable hypothesis, cheapest test. The log turns one debugging session into permanent knowledge.',
      },
    ],
    tables: [
      {
        caption: 'Scope versus logic analyzer',
        headers: ['Question', 'Instrument', 'Why'],
        rows: [
          ['Is the clock edge clean?', 'Scope', 'Analog quality: levels, ringing, glitches'],
          ['What byte did the MCU send?', 'Logic analyzer', 'Many channels, timing, protocol decode'],
          ['Is the 3.3 V rail sagging?', 'Scope', 'mV resolution over time'],
          ['Are all 8 data lines sequenced right?', 'Logic analyzer', '8+ channels simultaneously'],
          ['Why does the display not respond?', 'Both', 'LA: is the bus talking? Scope: are the edges sane?'],
        ],
      },
      {
        caption: 'ESD-safe bench checklist',
        headers: ['Item', 'Rule'],
        rows: [
          ['Mat + wrist strap', 'Grounded to the same point; strap on skin, not clothing'],
          ['Before touching boards', 'Discharge yourself to the common ground point'],
          ['Storage', 'Conductive bags or bins, never loose in drawers'],
          ['Clothing/surfaces', 'Keep synthetics away from open boards'],
          ['Loose ICs', 'Conductive foam or rails until soldered'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Debugging by part-swapping.',
        fix: 'Swapping without a measurement destroys the evidence and teaches nothing. Every substitution must be justified by a probe result that halves the hypothesis space; otherwise you are gambling with your own time.',
      },
      {
        mistake: 'Using a logic analyzer to judge analog quality.',
        fix: 'An LA thresholds everything: a 2.9 V "high" and a 3.3 V high are identical to it. Edge quality, sag and noise are scope questions — the threshold view literally cannot see them.',
      },
      {
        mistake: 'Handling boards by the edge connectors and components without a strap because "it worked last time".',
        fix: 'ESD damage is latent and statistical — one unzapped board proves nothing about the next. The strap costs two seconds and removes the entire class of risk; wear it whenever handling unprotected boards.',
      },
    ],
    guidedPractice: {
      title: 'Plan the debug session',
      brief:
        'A sensor board reports garbage I2C data occasionally. Write the first three probes of a divide-and-conquer plan, choosing instrument (scope or LA) for each, and state what outcome would halve the space.',
      expectedBehavior:
        '1. Scope on SDA/SCL: are the edges clean and levels valid? (Analog quality vs digital logic split.) 2. LA with I2C decode: is the data corrupted on the wire, or correct on the wire and corrupted in software? (Bus vs firmware split.) 3. Scope with long-record/single-shot on the corrupting event: is there a glitch coinciding with the error? Each outcome either points downstream (software) or upstream (electronics), halving the space.',
      hints: [
        'Split analog quality from digital correctness first.',
        'Then split the wire from the firmware.',
        'Name the decision each probe outcome forces.',
      ],
    },
    practiceExercises: [
      {
        title: 'Protocol decode by hand',
        brief:
          'A UART 8N1 line (idle high) shows: low for 104 us, then high, low, high, low, low, high, high, high (each 104 us), then high. Decode the byte (LSB first) and the bit rate.',
        expectedBehavior:
          'Bit rate = 1/104 us ≈ 9600 baud. Data bits LSB first: 1,0,1,0,0,1,1,1 -> byte = 0x2A + ... compute: bit0=1, bit1=0, bit2=1, bit3=0, bit4=0, bit5=1, bit6=1, bit7=1 -> value = 1 + 4 + 32 + 64 + 128 = 229 = 0xE5. The frame: start, 0xE5, stop.',
        hints: [
          '104 us per bit at 9600 baud (1/9600 = 104.2 us).',
          'LSB first: the first data bit is bit 0 (weight 1).',
          'Sum the weights of the high bits.',
        ],
      },
      {
        title: 'ESD incident review',
        brief:
          'A board returns from a student\'s desk with "occasionally the ADC reads 0". Inspection shows no visible damage; the ADC input reads 0 only after handling. Explain (a) the most likely mechanism, (b) why visual inspection misses it, and (c) the two-step verification.',
        expectedBehavior:
          '(a) An ESD event likely degraded the ADC input protection (partially damaged input stage/pad protection), leaving it conducting or clamping low under some conditions. (b) Damage is microscopic/latent — junction-level, invisible. (c) Verify by substituting the ADC (or testing the input on a known-good socketed part) and by reviewing the handling environment (strap, mat, bag). The lesson: replace the handling discipline, not just the part.',
        hints: [
          'ESD damage is latent and invisible.',
          'Which component sat at the exposed connector?',
        ],
      },
    ],
    assessment: {
      title: 'Debug methods checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'You must find out what bytes an MCU is sending on an SPI bus. Which instrument fits best?',
          options: ['Logic analyzer with SPI decode', 'Oscilloscope on one wire', 'Multimeter in DC volts', 'Bench supply readout'],
          answer: 'Logic analyzer with SPI decode',
          explanation:
            'The question is digital sequencing over multiple channels — the LA\'s specialty. The scope can show one wire\'s analog quality but cannot reasonably capture and decode a full multi-line transaction.',
          hint: 'How many channels does the question need?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In the five-probe LED debug, what made probe 4 (direct-blink the pin) decisive?',
          options: [
            'It split "pin/electronics fine" from "firmware mapping wrong"',
            'It measured the LED current directly',
            'It replaced the need for the LA',
            'It changed the symptom',
          ],
          answer: 'It split "pin/electronics fine" from "firmware mapping wrong"',
          explanation:
            'By bypassing the suspect firmware path and driving the pin directly, the test isolated the hardware\'s capability from the software\'s claim — the halving measurement of the session.',
          hint: 'Which two hypotheses did the blink test separate?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A logic analyzer can verify that a signal\'s high level is 3.3 V rather than 2.9 V.',
          answer: 'false',
          explanation:
            'The LA thresholds everything above/below a logic level; both voltages read as "high". Amplitude questions belong to the scope.',
          hint: 'What does the LA store per sample?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In two words: the handling discipline (mat, strap, conductive bags) that prevents latent zap damage to ICs is called ______ protection.',
          answer: 'ESD',
          explanation:
            'Electrostatic discharge protection: grounded mat and wrist strap, conductive storage, and discharge-before-touch. The damage it prevents is invisible and delayed — which is why the discipline is absolute.',
          hint: 'Three letters.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Logic analyzer', definition: 'A many-channel instrument recording digital levels over time, with protocol decode.' },
      { term: 'Protocol decode', definition: 'The LA\'s translation of raw channel transitions into human-readable bus transactions.' },
      { term: 'Divide-and-conquer debugging', definition: 'Choosing each measurement to halve the remaining hypothesis space.' },
      { term: 'ESD', definition: 'Electrostatic discharge; handling rules (strap, mat, conductive storage) prevent latent IC damage.' },
      { term: 'Root cause', definition: 'The underlying fault whose fix permanently removes the symptom — the required entry in a debug log.' },
    ],
    revisionSummary: [
      'LA for digital conversations (many channels, decode); scope for analog quality.',
      'Debug loop: precise symptom -> falsifiable hypothesis -> cheapest halving test -> verify and log.',
      'Never swap parts without a measurement justifying it.',
      'ESD discipline: strap, mat, conductive bags — the damage it prevents is invisible until later.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Logic analyzer', url: 'https://en.wikipedia.org/wiki/Logic_analyzer', kind: 'article' },
      { label: 'Wikipedia — Electrostatic discharge', url: 'https://en.wikipedia.org/wiki/Electrostatic_discharge', kind: 'article' },
      { label: 'All About Circuits — Debugging techniques', url: 'https://www.allaboutcircuits.com/textbook/', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
