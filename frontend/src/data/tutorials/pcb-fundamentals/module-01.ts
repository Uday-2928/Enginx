import type { TutorialLesson } from '../types';

export const module01Lessons: TutorialLesson[] = [
  {
    id: 'pcb-m01-l1',
    title: 'Passive Components: R, C and L',
    summary:
      'The three elements every circuit is built from: resistors with Ohm\'s law worked through, capacitors with the RC time constant computed, and inductors introduced honestly as the trickiest of the three.',
    objectives: [
      'Apply Ohm\'s law to compute current, voltage or resistance in any leg of a circuit.',
      'Compute the RC time constant and the capacitor voltage at 1τ from first principles.',
      'State what an inductor does to current changes and why it complicates layouts.',
      'Read component values from common markings (resistor codes concept, capacitor markings).',
    ],
    whyItMatters:
      'Before any debugging session makes sense, you must know what each part *should* do. Ninety percent of beginner hardware debugging is applying Ohm\'s law and checking a time constant against a scope trace. These three components are also the vocabulary of every schematic you will ever read.',
    prerequisites: [
      'Basic algebra (rearranging simple equations)',
      'Volts, amps, ohms and what each measures',
    ],
    explanation:
      '### Resistors: the predictable one\n\nA resistor obeys **Ohm\'s law** at all times:\n\n```\nV = I x R\n```\n\nWorked example (the LED calculation you will use forever): a 5 V supply, an LED that drops 2.0 V, and a series resistor. The resistor sees 5 - 2 = 3 V. For a target current of 20 mA: R = 3 / 0.02 = **150 Ω**. For a 3.3 V supply and the same LED at 13 mA through 100 Ω: I = (3.3 - 2.0)/100 = **13 mA**. Two numbers, one law — and the same law answers debugging questions in reverse: measuring 3 V across a 150 Ω resistor means 20 mA is flowing, no matter what the LED is doing.\n\n### Capacitors: storing charge in an electric field\n\nA capacitor holds charge Q = C x V and, critically, **resists sudden voltage changes**: its current is proportional to how fast its voltage changes (I = C dV/dt). Fed through a resistor, it charges exponentially with the **time constant**\n\n```\ntau = R x C\n```\n\nafter one tau the voltage has risen to 63.2% of the final value (1 - 1/e = 0.632); after 5 tau it is within 1% (99.3%). Worked example: R = 10 kΩ, C = 100 µF: tau = 10,000 x 100e-6 = **1.0 s**. Charging from 0 V toward 5 V, the capacitor reads about 5 x 0.632 = **3.16 V** after one second. This single calculation explains power-supply ramp times, reset circuits, and why your scope shows exponential curves where you expected ramps.\n\n### Inductors: the mirror image\n\nAn inductor stores energy in a magnetic field and **resists sudden current changes** — its voltage is proportional to how fast current changes (V = L dI/dt). This makes it the dual of the capacitor and the reason motors, relays and long wires kick back voltage spikes (inductive kick) when switched off. Inductors also carry parasitic resistance and capacitance, making real-world behaviour messier than the ideal; this course treats them honestly: essential for filters and power converters, but the first component to suspect when a "simple" circuit rings or spikes.',
    deepDive:
      '### Reading values from real parts\n\nResistors: through-hole parts use colour bands (digit-digit-multiplier-tolerance); the reliable habit is not memorising the colour table but verifying with a multimeter on arrival — bands are small and colour vision varies. Surface-mount parts print a code: "103" means 10 followed by three zeros = 10 kΩ; "4R7" means 4.7 Ω (R is the decimal point). Capacitors: small ceramics print "104" = 10 x 10^4 pF = 100 nF (the ubiquitous decoupling value — module 02), while electrolytics print the value plus a **polarity stripe**: installing one backwards destroys it, sometimes explosively. The one-minute habit of checking markings against the schematic before power-up catches a whole class of assembly errors.',
    examples: [
      {
        title: 'Ohm\'s law and RC arithmetic, worked in code',
        language: 'c',
        code: `#include <stdio.h>

int main(void) {
    /* LED resistor: 5 V rail, LED drops 2.0 V, want 20 mA */
    double vsupply = 5.0, vled = 2.0, itarget = 0.020;
    double r = (vsupply - vled) / itarget;
    printf("R for 20 mA: %.0f ohm\\n", r);

    /* actual current if 150 ohm is used on a 3.3 V rail */
    double i33 = (3.3 - vled) / r;
    printf("current on 3.3 V rail: %.3f A\\n", i33);

    /* RC time constant: 10 kOhm, 100 uF */
    double tau = 10000.0 * 100e-6;
    double v1tau = 5.0 * (1.0 - exp(-1.0));   /* 63.2% after 1 tau */
    printf("tau = %.1f s, V(1 tau) = %.2f V\\n", tau, v1tau);
    return 0;
}`,
        explanation: [
          'R = (5.0 - 2.0)/0.020 = 3.0/0.02 = 150 — the program prints "R for 20 mA: 150 ohm".',
          'On a 3.3 V rail with the same 150 Ω: (3.3 - 2.0)/150 = 0.008667 A ≈ 8.7 mA — the same resistor gives less current at lower voltage, and the printout shows 0.009 A at %.3f.',
          'tau = 10000 x 0.0001 = 1.0 s exactly.',
          'V(1τ) = 5 x (1 - e^-1) = 5 x 0.63212 = 3.16 V — the printout shows 3.16 V.',
          'Expected output, exactly:',
          'R for 20 mA: 150 ohm',
          'current on 3.3 V rail: 0.009 A',
          'tau = 1.0 s, V(1 tau) = 3.16 V',
          'Every line is checkable with mental arithmetic and a known constant (e ≈ 2.71828, e^-1 ≈ 0.36788).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Charging curve of an RC circuit (illustrative)',
        content:
          '  V across C\n  5.0 V -|                         ________ final value\n         |                    ____/\n  3.16 V-|-------- 63.2% ---x        <- 1 tau marks 63.2%\n         |               __/\n         |            _/\n         |         _/\n       0 +--------|---------|---------|--------> time\n         0       1 tau     2 tau    3 tau\n                  (63.2%)  (86.5%)  (95.0%)\n\n  (educational waveform (illustrative) — exponential approach\n   1 - e^(-t/tau), tau = R x C)',
        caption:
          'The exponential charge curve with the tau landmarks marked. After 5 tau the capacitor is within 1% of its final voltage.',
      },
    ],
    tables: [
      {
        caption: 'The three passives at a glance',
        headers: ['Property', 'Resistor (R)', 'Capacitor (C)', 'Inductor (L)'],
        rows: [
          ['Stores', 'Nothing (dissipates as heat)', 'Energy in electric field', 'Energy in magnetic field'],
          ['Law', 'V = I x R', 'I = C dV/dt', 'V = L dI/dt'],
          ['Resists sudden', 'Nothing (proportional always)', 'Voltage changes', 'Current changes'],
          ['Key value', 'Ohms', 'Farads; tau = RC', 'Henries; tau = L/R'],
          ['Common roles', 'Current limit, divider, pull-up', 'Decoupling, timing, coupling', 'Filters, energy storage, chokes'],
        ],
      },
      {
        caption: 'Tau landmarks for charging RC circuits',
        headers: ['Elapsed', 'Fraction of final', 'On a 5 V charge'],
        rows: [
          ['1 tau', '63.2%', '3.16 V'],
          ['2 tau', '86.5%', '4.32 V'],
          ['3 tau', '95.0%', '4.75 V'],
          ['5 tau', '99.3%', '4.97 V'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Computing the LED resistor as R = V_supply / I.',
        fix: 'The resistor only sees the voltage *left over* after the LED: R = (V_supply - V_forward)/I. Using 5/0.02 = 250 Ω over-limits the current design; the LED\'s forward drop is not optional information.',
      },
      {
        mistake: 'Reading "104" on a capacitor as 104 pF.',
        fix: 'Three-digit capacitor codes are digit-digit-exponent in picofarads: 104 = 10 x 10^4 pF = 100 nF = 0.1 µF. Resistors use the same pattern in ohms (103 = 10 kΩ). Check the unit convention before trusting a value.',
      },
      {
        mistake: 'Expecting the capacitor voltage to rise linearly.',
        fix: 'RC charging is exponential, not linear: it moves fast at first and slows as it approaches the supply. On a scope, an exponential approach to a rail is the signature of an RC circuit; a straight line suggests a constant current source instead.',
      },
    ],
    guidedPractice: {
      title: 'Three quick calculations',
      brief:
        '(a) What current flows through a 330 Ω resistor from a 3.3 V rail to an LED dropping 1.8 V? (b) What tau results from 1 kΩ and 10 µF? (c) After 2 tau, what fraction of the final voltage has an RC circuit reached?',
      expectedBehavior:
        '(a) I = (3.3 - 1.8)/330 = 4.5 mA. (b) tau = 1000 x 10e-6 = 0.01 s = 10 ms. (c) 86.5% (1 - e^-2 = 0.8647).',
      hints: [
        'Subtract the LED drop before dividing.',
        'Convert units first: 10 µF = 0.00001 F.',
        'e^-2 ≈ 0.135, so the fraction is 1 - 0.135.',
      ],
    },
    practiceExercises: [
      {
        title: 'Choose the resistor',
        brief:
          'An LED with a 2.0 V forward drop must run at 15 mA from a 5 V rail. Compute the ideal resistor, the nearest standard E12 value, and the actual current with that value.',
        expectedBehavior:
          'R = 3.0/0.015 = 200 Ω ideal. Nearest E12 values are 180 Ω and 220 Ω; choosing 220 Ω gives I = 3.0/220 = 13.6 mA (slightly under target, safe for the LED); 180 Ω gives 16.7 mA (slightly over). Either choice is defensible if stated with the resulting current.',
        hints: [
          'E12 series near 200: ... 150, 180, 220, 270 ...',
          'Under-target current is usually the conservative pick for LEDs.',
        ],
      },
      {
        title: 'Explain the scope trace',
        brief:
          'A pushbutton feeds an RC (10 kΩ to a 3.3 V rail, capacitor to ground) into a microcontroller input. The scope shows the input rising from 0 to 3.3 V over roughly 50 ms after each press. Estimate C if this is a 5-tau settling time, and explain why the designer wanted the delay.',
        expectedBehavior:
          '5 tau = 50 ms -> tau = 10 ms -> C = tau/R = 0.01/10000 = 1 µF. The delay is a debounce: it ignores the few milliseconds of mechanical contact bounce, so the digital input sees one clean edge instead of dozens.',
        hints: [
          'Set 5 tau equal to the observed settling time.',
          'Mechanical switches bounce for milliseconds; RC delays are the classic cheap debounce.',
        ],
      },
    ],
    assessment: {
      title: 'Passives checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A 5 V supply feeds an LED (2.0 V drop) through a 150 Ω resistor. What current flows?',
          options: ['20 mA', '33 mA', '13 mA', '150 mA'],
          answer: '20 mA',
          explanation:
            'The resistor sees 5 - 2 = 3 V; I = 3/150 = 0.02 A = 20 mA.',
          hint: 'Subtract the LED drop first.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What is the time constant of a 10 kΩ resistor charging a 100 µF capacitor?',
          options: ['1.0 s', '10 s', '0.1 s', '1.0 ms'],
          answer: '1.0 s',
          explanation:
            'tau = RC = 10,000 x 0.0001 = 1.0 second. After one second the capacitor is at 63.2% of the supply.',
          hint: 'Convert 100 µF to 0.0001 F, then multiply.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A capacitor fully charges in exactly one time constant.',
          answer: 'false',
          explanation:
            'One tau reaches 63.2%; the approach is exponential and conventionally "complete" after about 5 tau (99.3%). The exponential never mathematically reaches the final value.',
          hint: 'What does 1 - 1/e equal?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'A surface-mount capacitor is marked "104". What is its value in nanofarads (number only)?',
          answer: '100',
          explanation:
            '104 = 10 x 10^4 pF = 100,000 pF = 100 nF = 0.1 µF — the standard decoupling value you will meet everywhere in module 02.',
          hint: 'Digit, digit, exponent, in pF.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Ohm\'s law', definition: 'V = I x R: the defining relation of resistance, valid at every instant for ideal resistors.' },
      { term: 'Time constant (tau)', definition: 'RC (or L/R): the time to reach 63.2% of a step change; ~5 tau for practical completion.' },
      { term: 'Forward voltage', definition: 'The near-constant drop across a conducting diode/LED, subtracted from the supply when sizing series resistors.' },
      { term: 'Inductive kick', definition: 'The voltage spike an inductor produces when its current path is interrupted (V = L di/dt).' },
      { term: 'Component marking code', definition: 'Digit-digit-exponent printing on SMT parts, in pF for capacitors and Ω for resistors.' },
    ],
    revisionSummary: [
      'V = IR everywhere; for LED legs use (Vsupply - Vf)/R for the current.',
      'tau = RC; 63.2% at 1 tau, 86.5% at 2, 95% at 3, 99.3% at 5.',
      'Capacitors resist voltage changes; inductors resist current changes — duals of each other.',
      'Read SMT codes as digit-digit-exponent (104 = 100 nF); verify resistors with a meter.',
    ],
    furtherReading: [
      { label: 'Electronics Tutorials — RC circuits and time constants', url: 'https://www.electronics-tutorials.ws/rc/rc_1.html', kind: 'article' },
      { label: 'All About Circuits — Ohm\'s law', url: 'https://www.allaboutcircuits.com/textbook/direct-current/chpt-2/ohms-law-how-voltage-current-and-resistance-relate/', kind: 'article' },
      { label: 'Wikipedia — RC circuit', url: 'https://en.wikipedia.org/wiki/RC_circuit', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'pcb-m01-l2',
    title: 'Diodes, Transistors and Regulators',
    summary:
      'One-way valves, electronic switches, and the chips that make stable rails: diode drops, transistor switch thinking, and the linear-regulator heat calculation.',
    objectives: [
      'Describe diode conduction, forward drop, and basic rectification.',
      'Explain how BJTs and MOSFETs act as switches, and what the control terminal needs.',
      'Compute linear-regulator dissipation P = (Vin - Vout) x I and judge heatsinking.',
      'Identify ICs, connectors and headers on a schematic.',
    ],
    whyItMatters:
      'Beyond passives, every board mixes semiconductors: diodes steering power, transistors switching loads, and regulator ICs feeding clean voltage rails. The regulator heat calculation in this lesson is the difference between a board that runs and a board that thermally throttles or dies — and it is pure Ohm\'s-law arithmetic.',
    prerequisites: [
      'pcb-m01-l1 (Ohm\'s law, power = V x I)',
    ],
    explanation:
      '### Diodes: one-way valves with a toll\n\nA diode conducts when forward-biased (anode more positive than cathode) and drops a roughly constant **forward voltage** while conducting — about 0.7 V for silicon rectifiers, 0.3 V for Schottky, 1.8-3.2 V for LEDs (colour-dependent). Reverse-biased, it blocks (until the reverse breakdown rating is exceeded). Two canonical uses: **rectification** (four diodes in a bridge turn AC into pulsating DC; the output is the input peak minus two diode drops) and **protection** (a series diode stops reverse-polarity batteries; a flyback diode across a relay coil gives the inductive kick a safe path — module 01 lesson 1\'s inductor hazard, answered).\n\n### Transistors as switches\n\nA **BJT** is controlled by *current* into its base: a small base current allows a much larger collector current (current gain, beta). A **MOSFET** is controlled by *voltage* on its gate: above the threshold voltage, the channel conducts with very low resistance (RDS(on) — milliohms on power parts). For switching thinking: BJT = current-controlled valve (remember the base resistor), MOSFET = voltage-controlled switch (remember the gate needs a defined voltage, and gate capacitance means the driver momentarily supplies charge). The digital courses\' transistor-level intuition starts exactly here.\n\n### Voltage regulators\n\nA **linear regulator** (the classic 7805 pattern) acts like a self-adjusting series resistor: it drops Vin down to Vout and burns the difference as heat:\n\n```\nP_reg = (Vin - Vout) x I_load\n```\n\nWorked example: 12 V in, 5 V out, 100 mA load: P = 7 x 0.1 = **0.7 W** — warm but fine on a small board. The same 5 V output at 500 mA from 12 V: 3.5 W — a genuinely hot part needing copper area or a heatsink. The **switching regulator** (buck converter) instead chops the input through a switch and inductor with 85-95% efficiency, producing far less heat at the cost of switching noise and more design effort (module 02 picks up the noise story).',
    deepDive:
      '### Efficiency arithmetic worth doing every time\n\nThe linear regulator\'s efficiency is just Vout/Vin: 5/12 = 41.7% — the other 58% becomes heat *in the regulator*, regardless of brand or datasheet quality. That percentage framing makes the buck converter\'s value obvious: at 90% efficiency, the same 12-to-5 conversion at 500 mA dissipates roughly (1/0.9 - 1) x 2.5 W ≈ 0.28 W instead of 3.5 W — an order of magnitude less heat. The rule of thumb this produces: linear for small drops and low noise (sensors, analog references), switching for big drops and battery life. Neither is "better"; they occupy different corners of the cost-noise-heat triangle.',
    examples: [
      {
        title: 'Regulator heat and efficiency calculator',
        language: 'c',
        code: `#include <stdio.h>

int main(void) {
    double vin = 12.0, vout = 5.0;

    for (double iload = 0.1; iload <= 0.51; iload += 0.2) {
        double p = (vin - vout) * iload;
        double eff = vout / vin * 100.0;
        printf("I=%.2f A -> P_reg=%.2f W (linear eff %.1f%%)\\n",
               iload, p, eff);
    }

    /* same load on a 90%-efficient buck */
    double pbuck = (vout * 0.5) / 0.9 - vout * 0.5;  /* Pin - Pout */
    printf("buck dissipation at 0.5 A: %.2f W\\n", pbuck);
    return 0;
}`,
        explanation: [
          'First pass: I = 0.1 A -> P = (12-5) x 0.1 = 0.70 W; efficiency printed as 41.7%.',
          'Second pass: I = 0.3 A -> P = 7 x 0.3 = 2.10 W (the loop runs 0.1, 0.3, 0.5).',
          'Third pass: I = 0.5 A -> P = 3.50 W — the numbers from the lesson text.',
          'Expected output, exactly:',
          'I=0.10 A -> P_reg=0.70 W (linear eff 41.7%)',
          'I=0.30 A -> P_reg=2.10 W (linear eff 41.7%)',
          'I=0.50 A -> P_reg=3.50 W (linear eff 41.7%)',
          'buck dissipation at 0.5 A: 0.28 W',
          'The buck line: Pin = Pout/0.9 = 2.5/0.9 = 2.778 W, so dissipation = 2.778 - 2.5 = 0.278 ≈ 0.28 W — ten times less heat than the linear part at the same load.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Linear versus switching conversion (illustrative)',
        content:
          '  LINEAR (7805-style)                    SWITCHING (buck)\n\n  12 V --->[ regulator ]---> 5 V         12 V --[switch]--+--> 5 V\n                 |                                        |\n              heat! 0.7-3.5 W                        [inductor][diode]\n                                                          |\n  P = (Vin-Vout) x I                                   [capacitor]\n  eff = Vout/Vin (41.7% at 12->5)\n                                         eff ~ 85-95%, switching noise present\n  quiet output, simple, hot             efficient, more parts, needs layout care',
        caption:
          'The linear regulator is a controllable dropper resistor; the buck converter trades noise for efficiency by switching energy through an inductor. (Illustrative.)',
      },
    ],
    tables: [
      {
        caption: 'Semiconductor quick reference',
        headers: ['Device', 'Controlled by', 'Typical drop / loss', 'Common roles'],
        rows: [
          ['Silicon diode', 'Conducts when forward-biased', '~0.7 V forward', 'Rectification, reverse protection'],
          ['Schottky diode', 'Same', '~0.3 V forward', 'Low-loss rectification, flyback'],
          ['BJT (NPN)', 'Base current', 'VCE(sat) ~0.2 V when saturated', 'Low-side switch, amplifiers'],
          ['MOSFET (N-ch)', 'Gate voltage', 'I^2 x RDS(on) (milliohms)', 'Power switching, load switches'],
          ['Linear regulator', 'Feedback (internal)', '(Vin - Vout) x I as heat', 'Quiet small rails'],
          ['Buck converter', 'Feedback + switching', '(1/eff - 1) x Pout', 'Efficient big drops'],
        ],
      },
      {
        caption: 'The 12 V-to-5 V conversion at various loads (linear)',
        headers: ['Load current', 'Dissipation', 'Practical verdict'],
        rows: [
          ['100 mA', '0.70 W', 'Fine: SOT-223 package on copper'],
          ['300 mA', '2.10 W', 'Hot: needs copper pours, verified in enclosure'],
          ['500 mA', '3.50 W', 'Reconsider: buck converter or bigger heatsink'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Sizing a regulator by output current alone.',
        fix: 'Linear dissipation depends on the *drop* times the current: 5 V at 500 mA from 12 V is 3.5 W, but from 6 V is 0.5 W. Always run the (Vin - Vout) x I calculation with your actual input rail.',
      },
      {
        mistake: 'Switching a relay or motor without a flyback diode.',
        fix: 'Interrupting inductor current generates a spike of V = L di/dt that can destroy the driving transistor instantly. Place a diode across the coil (cathode to the positive side) so the kick circulates harmlessly.',
      },
      {
        mistake: 'Assuming a MOSFET turns on with "any" gate voltage.',
        fix: 'Datasheet threshold voltage (VGS(th)) is where conduction *barely starts*, often at microamps. Logic-level MOSFETs are specified for full conduction at 3.3/5 V gate drive; standard parts may need 10 V. Match the gate drive to the part, or the switch stays half-on and heats.',
      },
    ],
    guidedPractice: {
      title: 'Two quick designs',
      brief:
        '(a) A 3.3 V microcontroller pin must light a 2.0 V LED at 10 mA through a BJT low-side switch with 0.2 V saturation. Compute the LED resistor. (b) The same load powered from 9 V through a linear regulator dropping to 3.3 V: compute the regulator dissipation at 10 mA.',
      expectedBehavior:
        '(a) R = (3.3 - 2.0 - 0.2)/0.010 = 1.1/0.01 = 110 Ω. (b) P = (9 - 3.3) x 0.01 = 0.057 W — negligible heat at such a light load; the linear choice is fine here.',
      hints: [
        'In (a), the transistor\'s saturation drop also subtracts from the LED budget.',
        'In (b), use P = (Vin - Vout) x I with the *load* current.',
        'Small drops at small currents are where linear regulators shine.',
      ],
    },
    practiceExercises: [
      {
        title: 'Pick the converter',
        brief:
          'A battery project converts 12 V to 5 V at 2 A continuously. Compute linear dissipation and efficiency; compute buck dissipation at 90% efficiency; recommend one and justify in one sentence.',
        expectedBehavior:
          'Linear: P = 7 x 2 = 14 W, efficiency 41.7% — a large heatsink and a hot enclosure, effectively unusable. Buck: Pout = 10 W, Pin = 10/0.9 = 11.1 W, dissipation ≈ 1.1 W — manageable. Recommend the buck; at 14 W of waste heat the linear option fails the thermal design regardless of its other virtues.',
        hints: [
          'Pout = Vout x I; Pin = Pout/eff for the buck.',
          'Dissipation = Pin - Pout in both cases.',
          'Fourteen watts needs serious thermal engineering — that is the argument.',
        ],
      },
      {
        title: 'Flyback diode placement',
        brief:
          'A 5 V relay coil (100 Ω, so 50 mA) is switched by an NPN transistor from a microcontroller pin through a 1 kΩ base resistor. Draw/describe the flyback diode placement and compute the base current, then estimate the required beta (with a 2x safety factor) for the coil current.',
        expectedBehavior:
          'Flyback diode across the coil, cathode to +5 V side, so it conducts when the transistor opens. Base current = (3.3 - 0.7)/1000 = 2.6 mA. Required beta ≈ 2 x (50 mA / 2.6 mA) ≈ 38 — almost any small-signal NPN (beta 100+) suffices, which is why this classic circuit is forgiving.',
        hints: [
          'VBE drop is ~0.7 V: subtract it from the 3.3 V drive.',
          'Beta needed = IC/IB; double it for saturation margin.',
        ],
      },
    ],
    assessment: {
      title: 'Diodes, transistors and regulators checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A linear regulator drops 12 V to 5 V at 100 mA. How much power does it dissipate?',
          options: ['0.7 W', '1.2 W', '0.5 W', '5.0 W'],
          answer: '0.7 W',
          explanation:
            'P = (Vin - Vout) x I = 7 x 0.1 = 0.7 W. The dissipation depends on the *drop*, not the output voltage alone.',
          hint: 'Multiply the dropped volts by the load current.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What does a flyback diode across a relay coil protect?',
          options: [
            'The switching transistor, from the inductive voltage spike',
            'The relay coil, from overcurrent',
            'The power supply, from reverse polarity',
            'The microcontroller pin, from static',
          ],
          answer: 'The switching transistor, from the inductive voltage spike',
          explanation:
            'Opening the coil current makes V = L di/dt generate a large spike; the diode gives that current a circulating path until it decays, clamping the voltage at the transistor safely.',
          hint: 'Which component would see the spike without it?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A MOSFET specified at VGS(th) = 2 V fully turns on when the gate is driven to 2.5 V.',
          answer: 'false',
          explanation:
            'The threshold is where conduction just begins (microamps). Full switching needs the gate drive the datasheet\'s RDS(on) specification states — often 4.5 V or 10 V. Driving at threshold leaves the device half-on and hot.',
          hint: 'Threshold is the start of the curve, not the operating point.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'A buck converter is 90% efficient delivering 5 W. How many watts does it dissipate as heat (one decimal)?',
          answer: '0.6',
          explanation:
            'Pin = 5/0.9 = 5.56 W; dissipation = 5.56 - 5 = 0.56 ≈ 0.6 W. (A linear 12-to-5 conversion at the same 1 A load would dissipate 7 W.)',
          hint: 'Dissipation = Pout x (1/eff - 1).',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Forward voltage (Vf)', definition: 'The near-constant drop across a conducting diode (~0.7 V silicon, ~0.3 V Schottky).' },
      { term: 'Flyback diode', definition: 'A diode across an inductive load giving the interruption spike a safe circulating path.' },
      { term: 'RDS(on)', definition: 'A MOSFET\'s on-state channel resistance; the source of its conduction losses (I^2 R).' },
      { term: 'Linear regulator', definition: 'A series-dropping regulator; dissipates (Vin - Vout) x I as heat, with quiet output.' },
      { term: 'Buck converter', definition: 'A switching step-down converter, 85-95% efficient, using a switch, inductor and diode.' },
    ],
    revisionSummary: [
      'Diodes: 0.7 V (Si) / 0.3 V (Schottky) toll; flyback diodes protect switches from inductors.',
      'BJT = current-controlled; MOSFET = voltage-controlled with real gate-drive requirements.',
      'Linear regulator heat: P = (Vin - Vout) x I; efficiency = Vout/Vin.',
      'Buck converters: dissipation = Pout x (1/eff - 1); pick per the cost-noise-heat triangle.',
    ],
    furtherReading: [
      { label: 'Electronics Tutorials — Diodes and rectifiers', url: 'https://www.electronics-tutorials.ws/diode/diode_1.html', kind: 'article' },
      { label: 'Wikipedia — Linear regulator', url: 'https://en.wikipedia.org/wiki/Linear_regulator', kind: 'article' },
      { label: 'Wikipedia — Buck converter', url: 'https://en.wikipedia.org/wiki/Buck_converter', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'pcb-m01-l3',
    title: 'Reading Schematics',
    summary:
      'The map language of electronics: symbols, nets, junctions and reference designators — with a complete LED-button circuit drawn in ASCII and KiCad as the open-source tool to draw it in.',
    objectives: [
      'Identify standard schematic symbols and reference designator conventions.',
      'Trace nets and understand junction dots versus crossovers.',
      'Read a complete small circuit (LED, resistor, button) from schematic to behaviour.',
      'Start a schematic in KiCad with the correct conventions.',
    ],
    whyItMatters:
      'Schematics are how hardware engineers communicate, document and debug. On any real project the schematic is the ground truth — datasheets describe parts, but the schematic says what *your* circuit does. Being able to read one fluently (and draw one in KiCad) is the entry ticket to every hardware conversation.',
    prerequisites: [
      'pcb-m01-l1 and pcb-m01-l2 (component behaviour)',
    ],
    explanation:
      '### The conventions\n\n- **Reference designators** label every part: R1, R2... for resistors, C1, C2... capacitors, D1 diodes, Q1 transistors, U1, U2... ICs, SW1 switches, J1/J2 connectors, L1 inductors. The designator is the link between schematic, bill of materials and PCB silkscreen — when debugging, you say "voltage at R4" and everyone knows exactly which part.\n- **Nets** are the electrical connections: every wire with the same name is the same node. Named nets (VCC, GND, SDA) replace long wires to keep drawings readable — seeing VCC on five symbols means all five connect.\n- **Junction dots**: a dot where two lines cross means *connected*; no dot means *pass over without touching*. Misreading this is the classic beginner schematic error.\n- **Power symbols** (arrow up = VCC, bar down = GND) scatter the drawing for readability but all names of the same net are one node.\n\n### Reading the worked circuit\n\nThe diagram below shows this course\'s standard example: a pushbutton and an LED on a 5 V rail. Read it left to right: SW1 connects the net BTN_IN to ground when pressed (with R2 as a pull-up holding BTN_IN high otherwise — a proper input needs a defined voltage at all times); R1 limits LED current when the controller drives LED_OUT high. Two independent circuit fragments share only the supply rails. Tracing behaviour before touching hardware ("button pressed -> BTN_IN low -> firmware sees it; LED_OUT high -> 20 mA through D1") is the schematic-reading habit this whole course reinforces.',
    deepDive:
      '### KiCad as the open-source EDA example\n\nKiCad is the reference open-source electronic design suite: schematic editor (Eeschema), PCB layout (Pcbnew), footprint/ symbol libraries and a gerber output flow for manufacturing. The working loop this course models: place symbols from the library, wire them into nets, annotate (assign R1, R2...), run electrical-rules checking (it catches unconnected pins and shorted nets), assign footprints, then push the netlist to the board layout. The discipline that transfers to any tool: designators stay unique, every net gets a name, and the electrical-rules check runs *before* layout begins. KiCad\'s documentation (docs.kicad.org) walks through this exact flow with screenshots; this course stays tool-agnostic in its lessons and points to KiCad as the no-cost way to practise.',
    examples: [
      {
        title: 'LED plus button circuit, fully annotated',
        language: 'text',
        code: `  FRAGMENT 1: button input (BTN_IN)      FRAGMENT 2: LED output (LED_OUT)

   +5 V ---[R2 10k]---+---o BTN_IN       (MCU pin) LED_OUT o
                      |    (MCU input)             |
                    [SW1]                        [R1 150]
                      |                             |
                     GND                          [D1 LED]
                                                    |
                                                   GND

  Nets:   +5V, GND, BTN_IN, LED_OUT (named nets, no long wires)
  Parts:  R2 = 10k (pull-up), SW1 = pushbutton (to GND),
          R1 = 150 ohm (LED current limit), D1 = LED
  Behaviour trace:
    SW1 open  -> BTN_IN held at +5 V by R2 (input reads 1)
    SW1 press -> BTN_IN pulled to GND through SW1 (input reads 0);
                 button current = 5 V / 10k = 0.5 mA (harmless)
    LED_OUT driven high (5 V pin) -> current path pin -> R1 -> D1 -> GND
                 -> I = (5 - 2.0)/150 = 20 mA  (a 3.3 V pin gives
                    (3.3 - 2.0)/150 = 8.7 mA instead)`,
        explanation: [
          'R2 pulls BTN_IN up: without it, the input floats when the button is open — undefined readings, the classic beginner bug.',
          'The two fragments share only the supply rails; each signal (BTN_IN, LED_OUT) is a single named net from schematic to firmware.',
          'Button current through R2 when pressed: 5/10000 = 0.5 mA — deliberately small; the pull-up exists to define voltage, not to waste current.',
          'LED branch: the pin drives high, current flows pin -> R1 -> D1 -> GND; 20 mA with a 5 V pin, 8.7 mA with 3.3 V — both consistent with lesson 1\'s arithmetic.',
          'Every part has a designator and a value on the schematic — that is what makes debugging conversations precise ("R4" not "the resistor near the corner").',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Symbol gallery (ASCII stand-ins)',
        content:
          '  Resistor      Capacitor     Diode          LED\n  --[ R1 ]--    --| |--       -->|--     -->|--  (arrows = light)\n\n  NPN BJT       Pushbutton    Ground         Power\n                o/ o          GND symbol     VCC arrow\n     C\n   B/|\n     |\\ E\n\n  IC (any):     +--------+\n     U1        |        |\n   pin 1 >-----|  logic |-----< last pin\n               +--------+  (pin 1 marked with dot/notch)',
        caption:
          'Schematic symbols reduce to a small vocabulary. The dot-notched IC corner marks pin 1 — the anchor for all pin numbering. (Stylised ASCII stand-ins for the standard symbols.)',
      },
    ],
    tables: [
      {
        caption: 'Reference designator conventions',
        headers: ['Prefix', 'Component', 'Example'],
        rows: [
          ['R', 'Resistor', 'R1, R2, R10'],
          ['C', 'Capacitor', 'C1, C5'],
          ['D', 'Diode / LED / TVS', 'D1, D3'],
          ['Q', 'Transistor (BJT/MOSFET)', 'Q1, Q2'],
          ['U', 'Integrated circuit', 'U1, U3'],
          ['SW', 'Switch', 'SW1'],
          ['J / P', 'Connector / header', 'J1, J2'],
          ['L', 'Inductor / ferrite', 'L1'],
          ['Y', 'Crystal / oscillator', 'Y1'],
        ],
      },
      {
        caption: 'Junction dot rules',
        headers: ['Drawing', 'Meaning'],
        rows: [
          ['Lines meet with a dot', 'Connected (3-way or 4-way junction)'],
          ['Lines cross with no dot', 'Not connected — pass over'],
          ['Same net name on two symbols', 'Connected, regardless of drawing position'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming crossing lines are connected.',
        fix: 'Only junction dots mean connection. If a schematic is ambiguous (some tools draw 4-way crossings without dots), trace the net by name or check the netlist — never guess on a wire you will cut.',
      },
      {
        mistake: 'Reading values without checking units and multipliers.',
        fix: 'A schematic may write "100n", "0.1u" or "104" for the same capacitor. Establish the drawing\'s convention from its title block or BOM, and cross-check against the physical part markings from lesson 1.',
      },
      {
        mistake: 'Tracing behaviour without identifying the input and output points.',
        fix: 'Before analysing, mark where signals enter (connectors, MCU pins) and exit (loads, LEDs). The LED-button circuit reads as two independent fragments precisely because its I/O points are named — do that mentally for every sheet.',
      },
    ],
    guidedPractice: {
      title: 'Annotate and trace',
      brief:
        'For the LED-button circuit: list every part with its designator and role, name all four nets, and state the voltage on BTN_IN when the button is (a) open, (b) pressed.',
      expectedBehavior:
        'Parts: R1 150 Ω LED current limit; R2 10 kΩ pull-up; SW1 button to ground; D1 LED. Nets: +5V, GND, BTN_IN, LED_OUT. BTN_IN: (a) 5 V via pull-up; (b) ~0 V (a small divider effect: SW1 shorts BTN_IN to ground; current 0.5 mA through R2).',
      hints: [
        'Roles come from position: series with LED = limiter; from input to rail = pull-up.',
        'Nets are the labelled connection points.',
        'A pressed button wins against a 10 kΩ pull-up — it is a near-short.',
      ],
    },
    practiceExercises: [
      {
        title: 'Add a part to the schematic',
        brief:
          'The design needs the LED to be driven by the MCU pin directly (no external transistor) and to survive the pin being configured as an input (high-impedance). Describe what to add and where, and compute the resulting LED-off leakage current.',
        expectedBehavior:
          'With the pin as input (high-Z), the LED branch has no defined path; adding nothing, the LED simply floats dimly or off depending on leakage — the robust fix is either a pull-down on LED_OUT or driving the LED from VCC with the pin sinking (active-low). Leakage through a high-Z input is typically microamps; with the pin sinking (active-low design), the LED is *on* when the pin is low — a design choice worth stating explicitly.',
        hints: [
          'High-impedance means no drive: what defines the LED voltage then?',
          'Active-low LED drive (VCC - R1 - LED - pin) is the common robust pattern.',
        ],
      },
      {
        title: 'Start the same circuit in KiCad',
        brief:
          'Following docs.kicad.org\'s getting-started flow, list the ordered steps to capture the LED-button circuit in KiCad: from creating a project to passing ERC. State which step assigns R1/R2/SW1/D1 identifiers.',
        expectedBehavior:
          '1. Create project; 2. Open Eeschema; 3. Place symbols (R, SW_push, LED) from libraries; 4. Wire and add power symbols (VCC/GND); 5. Annotate — this assigns designators R1, R2, SW1, D1; 6. Fill values (150, 10k); 7. Run Electrical Rules Check; 8. Assign footprints. Any correctly ordered flow that includes annotation and ERC is acceptable.',
        hints: [
          'Annotation is the formal name for designator assignment.',
          'ERC runs before footprint assignment in a sane flow.',
        ],
      },
    ],
    assessment: {
      title: 'Schematics checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Two schematic wires cross without a junction dot. What does that mean?',
          options: ['They are not connected', 'They are connected', 'Connected only if same designator', 'The drawing is invalid'],
          answer: 'They are not connected',
          explanation:
            'A junction dot marks connection; a bare crossing means pass-over. This is the single most important convention for reading dense schematics correctly.',
          hint: 'The dot is the contract.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In the LED-button circuit, what is R2\'s purpose?',
          options: [
            'Pull-up defining BTN_IN when the button is open',
            'Limiting the LED current',
            'Protecting the button from overcurrent',
            'Filtering the 5 V rail',
          ],
          answer: 'Pull-up defining BTN_IN when the button is open',
          explanation:
            'R2 ties the input to +5 V so it reads a defined 1 while SW1 is open; pressing the button overpowers the 10 kΩ pull-up and pulls the node to ground. R1 is the LED limiter.',
          hint: 'What would the input read if R2 were missing?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Reference designators on a schematic also identify parts on the physical board silkscreen.',
          answer: 'true',
          explanation:
            'Designators (R1, C5, U3) appear on the PCB silkscreen and in the bill of materials, forming the link between drawing, part list and physical board — the vocabulary of every debug conversation.',
          hint: 'How would you find "R4" on a populated board?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In KiCad, what is the formal name of the step that assigns unique identifiers like R1 and C5 to placed symbols (one word)?',
          answer: 'annotation',
          explanation:
            'Annotate (or annotation) assigns unique reference designators to every symbol. It must run before ERC and layout so nets and parts are unambiguous.',
          hint: 'It "numbers" your parts.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Reference designator', definition: 'The unique label (R1, C5, U2) linking schematic symbol, BOM line and silkscreen.' },
      { term: 'Net', definition: 'A named electrical connection; all points sharing a net name are one node.' },
      { term: 'Junction dot', definition: 'The drawn marker that makes a wire crossing a real connection.' },
      { term: 'Pull-up resistor', definition: 'A resistor from an input to the supply defining its idle level.' },
      { term: 'ERC', definition: 'Electrical Rules Check: automated schematic review catching unconnected pins and shorts.' },
    ],
    revisionSummary: [
      'Designators label parts; nets label connections; dots make connections real.',
      'Every input needs a defined level: pull-ups are not optional.',
      'Trace circuits from I/O points through the parts, computing currents as you go.',
      'KiCad flow: place, wire, annotate (assign designators), values, ERC, footprints.',
    ],
    furtherReading: [
      { label: 'KiCad documentation — Getting started with KiCad', url: 'https://docs.kicad.org/', kind: 'tool' },
      { label: 'Wikipedia — Schematic capture', url: 'https://en.wikipedia.org/wiki/Schematic_capture', kind: 'article' },
      { label: 'Wikipedia — Reference designator', url: 'https://en.wikipedia.org/wiki/Reference_designator', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
