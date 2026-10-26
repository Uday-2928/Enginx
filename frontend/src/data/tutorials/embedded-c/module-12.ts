import type { TutorialLesson } from '../types';

export const module12Lessons: TutorialLesson[] = [
  {
    id: 'embc-m12-l1',
    title: 'Sensor Interfaces: Digital, Analog and Timing-Based',
    summary:
      'Read the three sensor archetypes — switch/ digital outputs, analog voltages, and pulse-timed signals — through buttons, LDR dividers and ultrasonic ranging.',
    objectives: [
      'Classify sensors by interface: digital state, analog voltage, timing-encoded.',
      'Wire and read an LDR voltage divider and compute its output range.',
      'Explain ultrasonic ranging (trigger/echo) and the time-to-distance conversion.',
      'Choose the right module technique for each interface (GPIO, ADC, input capture).',
    ],
    whyItMatters:
      'Sensors are the product\'s senses, and nearly all of them reduce to the three interfaces in this lesson. Recognising which archetype a datasheet describes tells you immediately which peripheral drives it — and which lessons of this course to apply.',
    prerequisites: ['embc-m04-l2', 'embc-m10-l1', 'embc-m05-l2'],
    explanation:
      'Strip away the marketing and every sensor presents one of three electrical contracts:\n\n### 1. Digital state (GPIO)\n\nThe output is a logic level: PIR motion detectors, magnetic door switches, tilt balls, limit switches, and one-wire style protocols aside, plain "event happened" lines. Reading is module 04: pull resistor, debounced edge detect. Check the datasheet\'s output type — open-collector outputs need a pull-up and are active-low; push-pull outputs drive both levels.\n\n### 2. Analog voltage (ADC)\n\nThe output is a voltage proportional to the quantity: temperature ICs (10 mV/°C style), potentiometers, light-dependent resistors in a divider, microphone DC levels. Reading is module 10: counts → mV → sensor equation, filtered and calibrated. The engineering lives in the *front end* — dividers, filters, gain — which lesson 3 covers.\n\n### 3. Timing-encoded (timer)\n\nThe information is in pulse *widths* or *counts*, not levels: ultrasonic rangers (echo pulse length = distance), infrared receivers (carrier bursts), flow meters (pulses per litre), encoders (quadrature counts). Reading is module 05: input capture measures the pulse to the tick; counting interrupts or timer-encoder mode tracks edges. These sensors offload precision to the timer hardware — firmware just reads numbers.\n\n### The LDR divider, worked\n\nA light-dependent resistor has no polarity and no amplifier: pair it with a fixed resistor into a **voltage divider** and measure the midpoint. With the LDR on the bottom (to ground) and R_fixed = 10k from 3.3 V: bright light (LDR ≈ 1k) gives 3.3 * 1/(10+1) = 0.30 V; darkness (LDR ≈ 100k) gives 3.3 * 100/110 = 3.0 V. The divider converts resistance to voltage for free — at the cost of a nonlinear (but calibratable) response.\n\n### Ultrasonic ranging, worked\n\nAn HC-SR04-class ranger: firmware pulses TRIG for 10 µs; the module emits an ultrasonic burst and raises ECHO for the round-trip time of the reflection. Distance = sound speed * time / 2 = 343 m/s * t / 2 ≈ **t_us / 58 cm**. An echo of 5800 µs is a target 100 cm away. Input capture (module 05-l2) measures ECHO precisely; a timeout matters because "no echo" (nothing in range) shows up as ECHO never rising.',
    deepDive:
      '### Datasheet anatomy of a sensor, honestly\n\nReal sensor datasheets front-load exactly the facts that map to this lesson: supply voltage and current, **output type** (push-pull/open-collector, analog ratiometric or absolute, digital protocol), the **transfer function** (a graph or equation — the "sensor equation" of module 10-l3), response time, and accuracy/ repeatability specs. The translation step is always: "what does one wire do as a function of the world?" — a level, a voltage, or a timing. When the transfer is ratiometric (scales with supply), powering the sensor from the ADC\'s reference cancels supply error (module 10-l1\'s ratiometric note); when it is absolute, reference quality matters. These front-page facts decide the firmware architecture before a line of code exists.\n\n### Sampling strategies per archetype\n\nDigital states want *fast, debounced* sampling — 10 ms tick debouncers (module 04-l3) with edge events. Analog channels want *averaged* sampling at modest rates (module 10-l2: temperature rarely needs more than 10 Hz). Timing sensors want the *timer* to do the work: capture hardware never misses an edge that software polling would. A multi-sensor product therefore schedules three different cadences in one loop — exactly the architecture project in module 18-l2 builds. The per-archetype cadence is worth deciding at design time and writing down; "sample everything in one loop at one rate" is the classic rookie architecture that breaks on the first fast sensor.\n\n### Sensor errors are specifications, honestly\n\nAccuracy (closeness to truth), repeatability (same input, same output), hysteresis (different rising vs falling response), and drift (changes over months) are all *specified* per sensor. Firmware cannot fix a sensor\'s accuracy — but it can and should expose the specified tolerances in its status data (a "reading confidence" field or at least the datasheet error in the log), and use repeatability (often much better than accuracy) for relative measurements like thresholds. The honest claim in your product docs is the sensor\'s spec plus your calibration, never the ADC\'s resolution.',
    examples: [
      {
        title: 'Divider and ultrasonic conversions, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Voltage divider output for a bottom-mounted sensor resistor. */\nstatic uint32_t divider_mv(uint32_t vin_mv, uint32_t r_fixed_ohm,\n                           uint32_t r_sensor_ohm) {\n    return vin_mv * r_sensor_ohm / (r_fixed_ohm + r_sensor_ohm);\n}\n\n/* HC-SR04-style echo width to distance (speed of sound 343 m/s). */\nstatic uint32_t echo_to_cm(uint32_t echo_us) {\n    /* 343 m/s = 0.0343 cm/us one-way; /2 for the round trip:\n     * cm = echo_us * 0.0343 / 2 = echo_us / 58.3 */\n    return echo_us / 58u;\n}\n\nint main(void) {\n    printf("LDR bright (1k):   %u mV\\n",\n           (unsigned)divider_mv(3300u, 10000u, 1000u));\n    printf("LDR mid   (10k):   %u mV\\n",\n           (unsigned)divider_mv(3300u, 10000u, 10000u));\n    printf("LDR dark  (100k):  %u mV\\n",\n           (unsigned)divider_mv(3300u, 10000u, 100000u));\n\n    printf("echo 5800 us -> %u cm\\n", (unsigned)echo_to_cm(5800u));\n    printf("echo  232 us -> %u cm\\n", (unsigned)echo_to_cm(232u));\n    return 0;\n}',
        explanation: [
          'Bright: 3300 * 1000 / 11000 = 300 mV. Mid: 3300 * 10000 / 20000 = 1650 mV (half-way, equal resistors). Dark: 3300 * 100000 / 110000 = 3000 mV.',
          'The full 0.3-3.0 V span uses ~90% of a 3.3 V ADC range — a well-chosen divider (module 10-l1\'s "fill the range" rule).',
          'Echo 5800 us → 5800/58 = 100 cm. Echo 232 us → 4 cm.',
          'Exact output: `LDR bright (1k):   300 mV` / `LDR mid   (10k):   1650 mV` / `LDR dark  (100k):  3000 mV` / `echo 5800 us -> 100 cm` / `echo  232 us -> 4 cm`.',
          'The integer divisor 58 vs the exact 58.3: at 100 cm the error is ~0.5 cm — fine for ranging; document the approximation where it matters.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'The three sensor interfaces',
        content:
          ' DIGITAL          ANALOG                TIMING\n\n  sensor out       Vref                  TRIG <--- 10us pulse (MCU)\n     |             |                                     |\n    [pull-up]   [Rfixed 10k]                        ECHO ---> pulse width\n     |             +--- ADC pin                       |       = round trip\n     v             |                                  v\n  GPIO pin      LDR (to GND)                    input capture\n  (debounce)    (divider)                       (us/58 = cm)\n\n  examples:       examples:              examples:\n  PIR, reed,      temp IC, LDR,          HC-SR04, IR receiver,\n  limit switch    potentiometer          flow meter, encoder',
        caption:
          'Every sensor maps to one of these readout styles — and each style maps to one peripheral technique taught in earlier modules.',
      },
    ],
    tables: [
      {
        caption: 'Interface-to-technique map',
        headers: ['Interface', 'Peripheral', 'Key techniques from this course'],
        rows: [
          ['Digital state', 'GPIO', 'Pull-ups, debounce, edge events (m04)'],
          ['Analog voltage', 'ADC', 'Counts->units, filtering, calibration (m10)'],
          ['Pulse timing', 'Timer capture', 'Tick-exact widths, wrap-safe differences (m05)'],
          ['Frequency/count', 'Timer counter', 'Pulse counting over a gate window'],
        ],
      },
      {
        caption: 'Divider design quick reference (3.3 V rail)',
        headers: ['Sensor resistance range', 'Good Rfixed', 'Output span'],
        rows: [
          ['1k - 100k (LDR)', '10k', '0.30 - 3.00 V'],
          ['5k - 50k', '10k', '1.1 - 2.75 V'],
          ['1k - 10k', '2.2k', '0.55 - 2.71 V'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reading a pulse-timed sensor by polling the pin in software.',
        fix:
          'Polling misses edges under load and has loop jitter. Input capture timestamps edges in silicon (module 05-l2) — use it, or accept documented, generous tolerance.',
      },
      {
        mistake: 'Forgetting the pull-up on an open-collector sensor output.',
        fix:
          'Open-collector outputs float without a pull; the reading is noise. Check the datasheet\'s output type before wiring, same rule as buttons (module 04-l2).',
      },
      {
        mistake: 'Powering analog sensors from a switching or motor-contaminated rail.',
        fix:
          'The sensor\'s supply is its signal\'s reference. Feed sensitive analog sensors from a clean rail (or exploit ratiometric design deliberately), and keep them off the motor rail (lesson 3 grounding).',
      },
    ],
    guidedPractice: {
      title: 'Design the readout for three sensors',
      brief:
        'For each, name the interface, the peripheral, and one firmware technique: (a) a magnetic door switch; (b) an NTC thermistor in a divider; (c) a water flow meter emitting 1 pulse per 2.2 mL.',
      expectedBehavior:
        '(a) Digital/GPIO — pull-up + debounce + edge event. (b) Analog/ADC — divider sizing, counts→mV→temperature (calibration curve for the NTC nonlinearity). (c) Timing/counter — count pulses per gate window (e.g. pulses over 1 s → mL/s), or capture intervals; wrap-safe arithmetic.',
      hints: [
        'Match each to the three archetypes first.',
        'The firmware technique list comes from earlier modules — cite them.',
      ],
    },
    practiceExercises: [
      {
        title: 'Choose Rfixed',
        brief:
          'A sensor varies 2k (condition A) to 20k (condition B). Pick Rfixed from {1k, 4.7k, 47k} to maximise the output span on a 3.3 V ADC, and compute the span.',
        expectedBehavior:
          'Rfixed ≈ geometric mean of the extremes (~6.3k) is optimal: 4.7k. Span: A: 3300*2000/6700 = 985 mV; B: 3300*20000/24700 = 2672 mV → span 1687 mV. 1k gives 660-2820 (2160 mV span!) — actually compute honestly: with 1k: A: 3300*2000/3000 = 2200; B: 3300*20000/21000 = 3143 → span 943. With 47k: A: 3300*2000/49000 = 135; B: 3300*20000/67000 = 985 → span 850. So 4.7k wins (1687 mV) — the geometric-mean rule verified.',
        hints: [
          'Compute the span for each candidate — do not trust the rule, verify it.',
          'Span = V(B) − V(A).',
        ],
      },
      {
        title: 'Range and timeout for the ranger',
        brief:
          'The HC-SR04 class has a max range of ~4 m and a recommended measurement interval ≥ 60 ms. Compute the max echo width, and design the timeout for "no target" detection, plus what a 116 µs echo means.',
        expectedBehavior:
          '400 cm * 58 = 23,200 us max echo. Timeout ≈ 30 ms (covers 5 m and margin); no echo within timeout = nothing in range — report "no target", not zero distance. 116 us → 2 cm.',
        hints: [
          'Max echo = max distance * 58.',
          'Distinguish "no echo" from "echo of zero" in your API.',
        ],
      },
    ],
    assessment: {
      title: 'Sensor interfaces checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'An LDR in a voltage divider is read by:',
          options: ['ADC', 'GPIO', 'Input capture', 'UART'],
          answer: 'ADC',
          explanation:
            'The divider produces an analog voltage — the ADC chain of module 10 applies.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'An echo pulse of 2900 µs corresponds to a distance of about:',
          options: ['50 cm', '29 cm', '100 cm', '580 cm'],
          answer: '50 cm',
          explanation: 'cm ≈ us / 58: 2900/58 = 50.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'An open-collector sensor output works without any pull-up resistor.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'It can only pull low; without a pull-up the line floats — the same rule as buttons.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does divider_mv print for the mid case?',
          code: 'divider_mv(3300u, 10000u, 10000u)\n/* vin * r_sensor / (r_fixed + r_sensor) */',
          options: ['1650', '3300', '1100', '825'],
          answer: '1650',
          explanation:
            '3300 * 10000 / 20000 = 1650 mV — equal resistors halve the voltage.',
          hint: 'The two resistors are equal.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Which module technique measures an echo pulse to the tick, and which module technique debounces a door switch?',
          answer: 'timer input capture (m05) and the debounce state machine on a periodic tick (m04)',
          explanation:
            'Timing-encoded inputs belong to capture hardware; digital states to debounced GPIO sampling.',
          hint: 'One is a timer feature, one is a GPIO pattern.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Voltage divider', definition: 'Rfixed + sensor resistor converting resistance to a measurable voltage.' },
      { term: 'Open collector', definition: 'An output that only pulls low; needs a pull-up to define its high level.' },
      { term: 'Echo ranging', definition: 'Distance from round-trip pulse time: cm ≈ echo_us / 58 for 343 m/s sound.' },
      { term: 'Ratiometric sensor', definition: 'A sensor whose output scales with its supply — pairs with the same Vref to cancel supply error.' },
    ],
    revisionSummary: [
      'Three archetypes: digital state, analog voltage, timing-encoded.',
      'Dividers convert resistance to voltage; size Rfixed near the sensor\'s geometric middle.',
      'Ultrasonic: distance = echo_us/58; no echo means no target (timeout!).',
      'Interface decides the peripheral: GPIO, ADC or capture.',
      'Sensor supply quality is signal quality unless ratiometric.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Photoresistor (LDR)', url: 'https://en.wikipedia.org/wiki/Photoresistor', kind: 'article' },
      { label: 'Wikipedia — Ultrasonic transducer / sonar ranging', url: 'https://en.wikipedia.org/wiki/Ultrasonic_transducer', kind: 'article' },
      { label: 'Wikipedia — Voltage divider', url: 'https://en.wikipedia.org/wiki/Voltage_divider', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m12-l2',
    title: 'Actuators and Their Drivers',
    summary:
      'LEDs are the exception — everything else needs a driver: relays and flyback diodes, buzzers, transistor stages, and the table that decides what a pin may touch.',
    objectives: [
      'State the per-pin current limit and classify loads as direct-drive or driver-required.',
      'Drive a relay through a transistor with a flyback diode, and explain why the diode is not optional.',
      'Distinguish buzzer types (passive vs active, piezo vs magnetic) and their drive needs.',
      'Implement active-low and active-high driver outputs consistently on a mock ODR.',
    ],
    whyItMatters:
      'Connecting a relay or motor straight to a pin is the classic way to destroy an MCU — silently, sometimes weeks later. The driver decisions in this lesson are the boundary between firmware and electronics that every embedded engineer must own.',
    prerequisites: ['embc-m04-l1', 'embc-m11-l3'],
    explanation:
      'A GPIO pin manages ~20 mA and 3.3 V. That budget covers indicator LEDs and almost nothing else. Every real actuator (relays, solenoids, motors, heaters, lamps, sounders with coils) is driven by a **transistor stage or driver IC** between the pin and the load, powered from a supply rail that can deliver the current.\n\n### The relay and the flyback diode\n\nA relay is a coil: current through it makes an electromagnet close a switch — perfect for isolating the MCU from mains or high-current loads. The coil is also an inductor: when the driver turns off, the collapsing magnetic field generates a voltage spike (hundreds of volts, reverse-polarity) that will punch through the driver transistor or the MCU pin. The **flyback diode** across the coil gives that current a recirculation path and clamps the spike. It is not an optional reliability nicety — without it, the driver dies, sometimes slowly, sometimes taking the port with it.\n\n### Buzzer taxonomy\n\n**Active** buzzers contain an oscillator: DC in, tone out — drive like an LED (with a transistor if current demands). **Passive** buzzers/piezos need a driven waveform: PWM at the desired frequency (module 11) — this is also how melodies are played. Piezo elements are capacitive and low-current (often direct-drive, louder with a transistor); magnetic buzzers are coils — current and flyback rules like relays.\n\n### Polarity and the drive pattern, in code\n\nDriver stages are commonly **active-low** (the pin pulls the transistor\'s base low through a resistor to turn PNP/high-side stages on, or sinks an NPN-driven LED chain) or active-high. Whatever the wiring, firmware normalises: `actuator_set(bool on)` writes the correct level, and the rest of the code speaks logical on/off — the same one-place-polarity discipline as module 04. Driver outputs, like any shared output, prefer atomic set/reset registers when the family provides them (module 03-l2), because safety-relevant outputs are exactly the ones that get toggled from ISRs.',
    deepDive:
      '### Sizing a transistor stage, honestly (concept level)\n\nThe pin drives the transistor\'s control terminal; the transistor switches the load. Three numbers decide the part: load current (transistor\'s collector/drain rating with margin), logic drive available from the pin (a plain BJT needs base current ≈ load current / gain — a 500 mA relay with gain 100 wants 5 mA of base current, fine; a MOSFET wants voltage, and 3.3 V gates mean "logic-level" FETs), and switching speed (irrelevant for relays, central for PWM\'d motors). Logic-level MOSFETs with a gate resistor are the modern default; the firmware-visible consequence is only the polarity and speed — but knowing why "any transistor" does not work prevents the classic under-driven-BJT-that-overheats failure.\n\n### Isolation and why relays (and opto-isolators) exist\n\nA relay\'s contacts are mechanically isolated from its coil: no electrical connection between the MCU domain and the switched circuit — that is why they dominate mains switching. Where isolation without moving parts is needed, **opto-isolators** (an LED and a phototransistor in one package) pass signals across a light gap; they are the standard interface for isolated inputs (mains zero-cross detection) and isolated driver inputs. Isolation changes firmware nothing at the logic level (it is still a GPIO write) — but it changes *what the PCB designer needs from you*: which side is which, and the creepage/clearance rules that keep the isolation real. Firmware\'s contribution is naming these boundaries in the driver API instead of burying them.\n\n### Safety-relevant outputs: the firmware contract\n\nWhen an output controls something hazardous (a heater, a pump, a lock), firmware owes it explicit engineering: (1) defined state at reset (the driver must fail *off* — check the driver stage\'s behaviour with the pin floating and at reset-default levels); (2) polarity normalised in one function; (3) changes through atomic output registers when shared with ISRs; (4) a watchdog-connected path — a hung CPU must not leave a heater on (module 13-l3 ties the watchdog to safe-state transitions). These four are the difference between a demo and a product.',
    examples: [
      {
        title: 'Relay driver on a mock ODR, with the safety contract',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock. Real wiring: MCU pin -> gate/base resistor ->\n * logic-level MOSFET/BJT -> relay coil -> supply, WITH a flyback\n * diode across the coil. Never the coil directly on the pin. */\nstatic volatile uint8_t MOCK_GPIOB_ODR = 0x00u;\n#define RELAY_PIN 5u\n#define RELAY_ACTIVE_LEVEL 1u   /* this stage: pin high = relay on */\n\nstatic void relay_init(void) {\n    /* Drive to the OFF level before anything else: defined at reset. */\n    if (RELAY_ACTIVE_LEVEL != 0u) {\n        MOCK_GPIOB_ODR &= (uint8_t)~(1u << RELAY_PIN);\n    } else {\n        MOCK_GPIOB_ODR |= (uint8_t)(1u << RELAY_PIN);\n    }\n}\n\nstatic void relay_set(uint8_t on) {\n    uint8_t pin_level = (uint8_t)((on != 0u) ? RELAY_ACTIVE_LEVEL\n                                             : (uint8_t)(RELAY_ACTIVE_LEVEL == 0u));\n    if (pin_level != 0u) {\n        MOCK_GPIOB_ODR |= (uint8_t)(1u << RELAY_PIN);\n    } else {\n        MOCK_GPIOB_ODR &= (uint8_t)~(1u << RELAY_PIN);\n    }\n}\n\nint main(void) {\n    relay_init();\n    printf("after init: pin=%u (relay OFF)\\n",\n           (unsigned)((MOCK_GPIOB_ODR >> RELAY_PIN) & 1u));\n\n    relay_set(1u);\n    printf("relay_set(1): pin=%u (relay ON)\\n",\n           (unsigned)((MOCK_GPIOB_ODR >> RELAY_PIN) & 1u));\n\n    relay_set(0u);\n    printf("relay_set(0): pin=%u (relay OFF)\\n",\n           (unsigned)((MOCK_GPIOB_ODR >> RELAY_PIN) & 1u));\n    return 0;\n}',
        explanation: [
          'relay_init drives the OFF level first — the reset-defined-state rule from the safety contract.',
          'relay_set normalises polarity: callers pass logical on/off; the wiring detail (RELAY_ACTIVE_LEVEL) lives in one macro.',
          'Trace: init → pin 0; set(1) → pin 1; set(0) → pin 0.',
          'Exact output: `after init: pin=0 (relay OFF)` / `relay_set(1): pin=1 (relay ON)` / `relay_set(0): pin=0 (relay OFF)`.',
          'The flyback diode is not in the C — it is across the coil on the PCB. The comment states the wiring so the code and the schematic agree; a code review that cannot see the diode should ask.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Transistor-driven relay with flyback diode',
        content:
          '   +12V -------+---------+\n               |         |\n             [COIL]   [D| flyback]\n               |         |   (cathode to +12V)\n               +----+----+\n                    |\n                 [drain]\n              Q1 (logic-level\n                 MOSFET)\n                 [source]\n                    |\n                   GND\n                    ^\n                    | gate\n                    |\n              [gate resistor]\n                    |\n              MCU PWM/GPIO pin\n\n  on : pin high -> Q1 conducts -> coil energised -> contacts close\n  off: pin low  -> Q1 stops -> coil current recirculates through D\n       (the diode clamps the inductive spike - never omit it)',
        caption:
          'Educational schematic sketch. The pin commands; the transistor switches; the diode protects. Firmware writes the pin; the parts do the work.',
      },
    ],
    tables: [
      {
        caption: 'What a pin can drive directly (the decision table)',
        headers: ['Load', 'Current scale', 'Driver?', 'Notes'],
        rows: [
          ['Indicator LED', '2-15 mA', 'No (resistor only)', 'Per-pin limit, module 04'],
          ['Piezo buzzer (passive)', '<5 mA', 'Often direct', 'PWM the tone; louder with a driver'],
          ['Active buzzer', '5-30 mA', 'Check / transistor', 'DC in, tone out'],
          ['Magnetic buzzer / small solenoid', '20-200 mA', 'Transistor + flyback', 'Coil rules'],
          ['Relay coil', '30-100 mA (coil)', 'Transistor + flyback', 'Contacts isolate the real load'],
          ['DC motor', '0.1-30 A', 'Transistor/H-bridge', 'Separate supply, module 11-l3'],
          ['Heater / lamp strip', '>1 A', 'FET/SSR stage', 'Thermal + wiring design'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Omitting the flyback diode "because the transistor is rated for it".',
        fix:
          'The spike is hundreds of volts at the instant of turn-off; no small-signal driver survives repeated hits. Always fit the diode across inductive loads, cathode to +.',
      },
      {
        mistake: 'Leaving driver outputs floating at reset.',
        fix:
          'Configure and drive the OFF level as the first act on the pin, and check the driver stage\'s behaviour with a floating input (add a pull-down/up on the gate if needed). Products must power up in a safe state.',
      },
      {
        mistake: 'Scattered 1s and 0s for an active-low driver across the codebase.',
        fix:
          'Normalise polarity in one function (actuator_set(on)) exactly like module 04\'s LED pattern; the wiring lives in one macro next to the pin definition.',
      },
    ],
    guidedPractice: {
      title: 'Classify and plan five loads',
      brief:
        'For each load, state driver requirement, current-limiting, supply, and polarity convention to document: (a) status LED on 3.3 V; (b) 5 V relay coil 70 mA; (c) passive piezo playing a melody; (d) 12 V fan 150 mA; (e) solenoid lock 800 mA.',
      expectedBehavior:
        '(a) direct + resistor (~130 ohm from (3.3-2)/0.01), 3.3 V, document active level. (b) transistor + flyback, 5 V (or 12 V coil variant), common ground. (c) direct or small driver, PWM tone (module 11), 3.3 V. (d) transistor/MOSFET + flyback (motor), 12 V supply, common ground. (e) logic-level MOSFET + flyback, separate supply able to surge, defined-off at reset, watchdog tie-in (safety load).',
      hints: [
        'Every coil gets a flyback; every motor gets a driver.',
        'Safety loads add the reset-state and watchdog contract.',
      ],
    },
    practiceExercises: [
      {
        title: 'Flyback failure mode',
        brief:
          'Explain in 3-4 sentences what happens at turn-off of a relay coil without a flyback diode, in terms of inductor behaviour (V = L * di/dt), and why the failure can appear weeks later.',
        expectedBehavior:
          'Opening the circuit forces di/dt to be near-instantaneous; V = L*di/dt generates a large reverse spike that avalanches the driver transistor. Each event degrades it slightly (or punches the pin\'s protection structures); the cumulative damage surfaces as an intermittent failure long after commissioning — the classic "worked at the bench" story.',
        hints: [
          'Inductors resist current *change*.',
          'Degradation is cumulative, not instantaneous.',
        ],
      },
      {
        title: 'Two relays, atomic updates',
        brief:
          'Two relays share a port ODR and one is driven from a timer ISR (safety cutoff). Rewrite relay_set to use a BSRR-style atomic set/reset mock (module 03-l2 pattern) and state why the RMW version is unsafe here.',
        expectedBehavior:
          'Write to the set register for on, the reset register for off — single stores, no read. The RMW version can lose the ISR\'s emergency-off update (module 03-l2\'s lost-update race) — on a safety output that is exactly the failure you cannot tolerate.',
        hints: [
          'Atomic set/reset = one store each.',
          'Review the lost-update trace from module 03.',
        ],
      },
    ],
    assessment: {
      title: 'Actuators checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'The flyback diode across a relay coil:',
          options: [
            'Clamps the inductive spike at turn-off',
            'Makes the relay faster',
            'Limits the on current',
            'Isolates the contacts',
          ],
          answer: 'Clamps the inductive spike at turn-off',
          explanation:
            'It recirculates coil current when the driver opens, preventing the voltage spike that destroys drivers.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which load can a pin typically drive directly?',
          options: ['Indicator LED with resistor', 'Relay coil', 'DC motor', 'Solenoid'],
          answer: 'Indicator LED with resistor',
          explanation:
            'LEDs fit the ~20 mA pin budget; everything else needs a driver stage.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A passive buzzer produces sound from DC; an active buzzer needs a driven tone waveform.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'It is the reverse: active buzzers self-oscillate from DC; passive ones need PWM at the tone frequency.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'After relay_init() in the example (active-high stage), what is the pin level?',
          code: '#define RELAY_ACTIVE_LEVEL 1u\n/* init drives the OFF level first */',
          options: ['0', '1', 'floating', 'undefined'],
          answer: '0',
          explanation:
            'The safety contract: init drives the OFF level (the inverse of the active level) before anything else.',
          hint: 'OFF is the inverse of the active level.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the four parts of the firmware safety contract for hazardous outputs.',
          answer: 'defined safe state at reset, normalised polarity in one function, atomic output updates when shared, watchdog-connected safe-state path',
          explanation:
            'Reset state, polarity discipline, atomicity, and watchdog tie-in — the difference between a demo and a product.',
          hint: 'Reset, polarity, atomicity, watchdog.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Flyback diode', definition: 'Diode across an inductive load giving turn-off current a safe recirculation path.' },
      { term: 'Driver stage', definition: 'Transistor/IC between pin and load that supplies the real current.' },
      { term: 'Active / passive buzzer', definition: 'Self-oscillating (DC in, tone out) vs needs-a-driven-waveform sounders.' },
      { term: 'Opto-isolator', definition: 'LED + phototransistor package passing signals with no electrical connection.' },
      { term: 'Safe state', definition: 'The output level a load must take at reset and on fault (usually off).' },
    ],
    revisionSummary: [
      'Pins are logic devices; drivers are power devices — never confuse them.',
      'Coils (relays, solenoids, magnetic buzzers) always get flyback diodes.',
      'Active buzzers take DC; passive ones take PWM.',
      'Normalise polarity in one function; drive OFF first at init.',
      'Hazardous outputs get the four-part safety contract.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Relay', url: 'https://en.wikipedia.org/wiki/Relay', kind: 'article' },
      { label: 'Wikipedia — Flyback diode', url: 'https://en.wikipedia.org/wiki/Flyback_diode', kind: 'article' },
      { label: 'Wikipedia — Bipolar junction transistor (driver stages)', url: 'https://en.wikipedia.org/wiki/Bipolar_junction_transistor', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m12-l3',
    title: 'Signal Conditioning and Grounding',
    summary:
      'Shape signals before the ADC and keep the ground reference honest: divider sizing recap, RC filters with the cutoff formula, common ground discipline, and isolation boundaries.',
    objectives: [
      'Compute an RC filter\'s cutoff frequency and match it to signal and noise bands.',
      'Apply the common-ground rule across multiple supplies.',
      'Explain ground bounce and why motor currents corrupt ADC readings.',
      'Describe isolation boundaries and what firmware must document about them.',
    ],
    whyItMatters:
      'When "the ADC reads garbage" or "the sensor works alone but not in the product", the cause is almost always conditioning or grounding — the analog hygiene that no amount of firmware cleverness can replace, but that firmware must understand to debug.',
    prerequisites: ['embc-m12-l1', 'embc-m10-l2'],
    explanation:
      'Between the raw physical world and the ADC pin sits the **signal chain**: dividers (scale the range), filters (band-limit the noise), buffers (protect impedances). Two formulas cover most of it.\n\n### The RC low-pass filter\n\nA series resistor R into a capacitor C to ground passes DC and attenuates high frequencies; the boundary is the **cutoff frequency f_c = 1 / (2πRC)**. Below f_c signals pass nearly untouched; above, each filter pole attenuates ~6 dB/octave (voltage halves each doubling). Worked: R = 10k, C = 1 µF → f_c = 1/(2π * 10,000 * 0.000001) = 15.9 Hz — perfect for a slow temperature channel (kills everything above ~16 Hz including most coupling noise), useless for audio. Choosing RC is matching three bands: your signal (pass it), your noise (attenuate it), your sampling rate (anti-alias, module 10-l2).\n\n### Common ground: the one-reference rule\n\nVoltages are *differences*; every measurement and every driver references its ground. When a board has multiple supplies (3.3 V MCU, 5 V sensors, 12 V motors), all grounds must connect — **one common ground** — or signals have no defined reference (the "works alone, fails connected" classic). But connecting is not enough: return currents share copper. A motor drawing 2 A through a thin ground trace raises that trace\'s voltage momentarily (**ground bounce**); an ADC referenced to the bounced ground reads it as signal. Hence the layout rule firmware engineers must know: star grounds / solid ground planes, motor returns on their own path, analog references kept away from power returns.\n\n### Isolation boundaries\n\nWhere circuits must not share ground at all — mains sensing, medical, industrial 0-10 V inputs — **isolation** (opto-isolators, isolation amplifiers, isolated supplies) creates two independent domains. Firmware sees only a logic signal across the boundary, but owns the documentation: which signals cross, in which direction, and that nothing else ( grounds, unsanctioned wires) crosses. The module 12-l2 relay is the same concept actuating.',
    deepDive:
      '### Debugging a noisy measurement, the real sequence\n\nWhen readings jitter beyond the sensor spec: (1) scope or average — is it broadband noise, mains hum (50/60 Hz bumps at 10 ms spacing), or motor-correlated? The *shape* of the noise identifies its source. (2) Check the reference: measure Vref and the sensor supply — a sagging reference moves everything together. (3) Follow the grounds: measure voltage between the ADC\'s ground and the sensor\'s ground while the motor runs — anything above millivolts is a layout problem, not code. (4) Only then consider firmware mitigations: heavier filtering (which reduces bandwidth), synchronized sampling (sample away from PWM edges — many ADCs trigger off timer events exactly for this), or moving the sensor\'s supply. This sequence — characterise, check reference, check ground, then mitigate — is the analog counterpart of module 17\'s fault-isolation method.\n\n### Buffering and impedance, honestly\n\nThe RC filter and divider have output impedance; the ADC\'s sample-and-hold draws a gulp of charge at each conversion. If the source impedance is too high (big R, or a sensor with weak drive), the reading sags — the datasheet specifies the maximum source impedance for the sample time you use. The fixes: smaller resistors (at the cost of current), an op-amp buffer (unity gain, low output impedance), or longer sample times in the ADC configuration. Firmware rarely fixes this — but it must know it exists, because the symptom (readings depend on what *else* the ADC scans) is baffling without the concept. Multi-channel scanning makes channel-to-channel crosstalk via the sample capacitor another known effect: reading a quiet channel right after a rail-level channel can inherit residue; inserting a dummy read or reordering channels is the standard workaround.',
    examples: [
      {
        title: 'Filter design calculator and a multi-supply ground map, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* f_c = 1 / (2*pi*R*C). With R in kohm and C in microfarads:\n * R*C = R_k * C_u * 1e-3 (ohm*farad), so\n * f_c [Hz] = 1000 / (2*pi * R_k * C_u) = 159.155 / (R_k * C_u).\n * Integer helper: 159155 / (R_k * C_u * 1000). */\nstatic uint32_t fc_hz(uint32_t r_kohm, uint32_t c_uf) {\n    return 159155u / (r_kohm * c_uf * 1000u);\n}\n\nint main(void) {\n    printf("10k + 1uF  -> f_c = %u Hz\\n", (unsigned)fc_hz(10u, 1u));\n    printf("1k  + 1uF  -> f_c = %u Hz\\n", (unsigned)fc_hz(1u, 1u));\n    printf("4k7 + 10uF -> f_c = %u Hz\\n", (unsigned)fc_hz(5u, 10u));\n\n    /* Ground map: what connects to what. */\n    printf("grounds: 3V3-GND, 5V-GND, 12V-GND all tied at ONE star point\\n");\n    printf("motor return: own trace to the star, never through the ADC ground\\n");\n    return 0;\n}',
        explanation: [
          '10k + 1 µF: 159155 / (10 * 1 * 1000) = 159155 / 10000 = 15 Hz — the classic slow-sensor filter (exact value 15.9 Hz).',
          '1k + 1 µF: 159155 / 1000 = 159 Hz — general sensing band. 4k7 + 10 µF: 159155 / 50000 = 3 Hz (exact 3.18 Hz) — thermal-range filtering.',
          'Exact output: `10k + 1uF  -> f_c = 15 Hz` / `1k  + 1uF  -> f_c = 159 Hz` / `4k7 + 10uF -> f_c = 3 Hz` / `grounds: 3V3-GND, 5V-GND, 12V-GND all tied at ONE star point` / `motor return: own trace to the star, never through the ADC ground`.',
          'The unit trap this helper encodes: the memorable constant is 159.155 only when R is in kohm AND C in µF — using it with different units (or forgetting the 1000) errs by exactly 1000x, which is why every analog constant ships with its unit derivation in the comment and one hand-check against 1/(2πRC).',
          'Ground map text: one star point ties all supply grounds; motor returns get their own path — the firmware-visible summary of the layout discipline.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Ground star and bounce',
        content:
          '            STAR GROUND POINT\n            |     |      |\n        3.3V GND  5V GND  12V GND\n            |     |      |\n         ADC/MCU  sensors  motor driver\n            |            |\n         analog      motor current loop\n         ground      (own thick trace)\n\n  BOUNCE: motor draws 2A through a shared thin trace:\n    V(trace) = I * R_trace = 2A * 0.1 ohm = 0.2 V lift\n    -> ADC referenced to that trace sees 0.2 V of "signal"\n\n  RULE: motor returns never share copper with analog grounds',
        caption:
          'Conceptual grounding map. One star ties the domains together; heavy currents keep their own path home — or their IR drop becomes fake signal.',
      },
    ],
    tables: [
      {
        caption: 'RC filter examples (f_c = 1/2πRC)',
        headers: ['R', 'C', 'f_c', 'Suited for'],
        rows: [
          ['10k', '1 µF', '15.9 Hz', 'Temperature, slow pots'],
          ['10k', '100 nF', '159 Hz', 'Pushbuttons, general sensing'],
          ['1k', '100 nF', '1.59 kHz', 'Audio-ish bandwidth, LED feedback'],
          ['100', '1 nF', '1.59 MHz', 'Digital line snubbing (not measurement)'],
        ],
      },
      {
        caption: 'Noise shape to source',
        headers: ['Observation', 'Likely source'],
        rows: [
          ['Spikes at PWM period spacing', 'Power/supply coupling from PWM load'],
          ['Slow sine-ish wobble at 50/60 Hz', 'Mains pickup — shield/filter'],
          ['Random broadband jitter', 'Reference noise, high source impedance'],
          ['Correlated with motor speed', 'Ground bounce / supply sag — layout issue'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Separate grounds for "clean" and "dirty" supplies that never reconnect.',
        fix:
          'They must tie at exactly one point (star) or signals between domains have no reference and parts see undefined levels. Separation means routing discipline, not disconnection.',
      },
      {
        mistake: 'Believing firmware filtering can fix ground bounce.',
        fix:
          'Bounce corrupts the *reference*, so even "filtered" readings carry the error. Filter after fixing layout; mitigate in firmware only what layout cannot.',
      },
      {
        mistake: 'Shipping analog constants without a hand check.',
        fix:
          'Every constant (like the f_c helper\'s 159155) gets its unit derivation in the comment and one hand-calculation check against 1/(2πRC). A unit slip in that constant errs by exactly 1000x — the kind of bug that passes compilation and every casual glance.',
      },
    ],
    guidedPractice: {
      title: 'Design the conditioning chain',
      brief:
        'A temperature channel: sensor 0-1 V output, 3.3 V ADC, mains-hum environment, sampling at 100 Hz, display updates 2 Hz. Choose: divider needed? RC cutoff? K for the moving average? Justify each against the three bands (signal, noise, sampling).',
      expectedBehavior:
        'No divider (0-1 V fits, or add gain later — document the 30% range usage). RC: signal is < 1 Hz; hum at 50/60 Hz; sampling 100 Hz → f_c ~5-10 Hz (e.g. 16k + 1 µF ≈ 10 Hz) attenuates hum and acts as anti-alias for anything near 50 Hz. K: display latency ≤ 500 ms = 50 samples at 10 ms → K = 32 (power of two) ≈ sqrt(32) ≈ 5.7x noise reduction.',
      hints: [
        'Order the bands: signal < noise < sampling.',
        'Latency budget caps K (module 10-l2).',
      ],
    },
    practiceExercises: [
      {
        title: 'Quantify the bounce',
        brief:
          'A shared ground trace measures 50 milliohm. Motor currents: 0.5 A idle, 5 A stall. Compute the bounce voltage in both cases and state whether a 12-bit ADC at 3.3 V (0.8 mV/LSB) notices.',
        expectedBehavior:
          '0.5 A → 25 mV (≈ 31 LSB — very visible); 5 A → 250 mV (≈ 312 LSB — massive). Both dwarf the 0.8 mV resolution: shared-return motor currents are unmissable on a 12-bit ADC.',
        hints: [
          'V = I * R.',
          'Compare against the LSB size.',
        ],
      },
      {
        title: 'Trigger-synchronized sampling',
        brief:
          'Explain in 3-4 sentences why sampling the ADC from a timer trigger (rather than free-running) reduces PWM-coupled noise, and what property of the noise source makes it work.',
        expectedBehavior:
          'PWM noise is periodic and coherent with the timer. Triggering the ADC at a fixed phase relative to the PWM (e.g. mid off-time) samples at the same noise phase every time — the noise becomes a constant offset instead of jitter, removable by calibration or by choosing a quiet phase. It works because the noise is deterministic relative to the timer, not random.',
        hints: [
          'The enemy is jitter, not offset.',
          'Coherent noise can be placed in time.',
        ],
      },
    ],
    assessment: {
      title: 'Conditioning and grounding checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'An RC filter with R = 10k, C = 1 µF has a cutoff of about:',
          options: ['15.9 Hz', '159 Hz', '1.59 kHz', '15.9 kHz'],
          answer: '15.9 Hz',
          explanation: 'f_c = 1/(2πRC) = 1/(2π * 10^4 * 10^-6) ≈ 15.9 Hz.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Multiple supply grounds on one board must be:',
          options: [
            'Tied together at one common point',
            'Kept completely separate forever',
            'Connected through a resistor',
            'Left to the enclosure screw',
          ],
          answer: 'Tied together at one common point',
          explanation:
            'Signals between domains need one shared reference; the star point provides it while keeping heavy currents off analog returns.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Ground bounce from a motor corrupts ADC readings because the ADC measures voltage relative to its ground.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'The measurement reference itself moves with the motor current — the error is real signal to the ADC.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'A 2 A motor current flows through 0.1 ohm of shared trace. What does an ADC referenced to that trace see?',
          code: 'V_bounce = I * R = 2.0 * 0.1',
          options: ['0.2 V of false signal', '2 V of false signal', 'Nothing', '0.02 V'],
          answer: '0.2 V of false signal',
          explanation:
            'V = IR = 0.2 V lifted — hundreds of LSBs on a 3.3 V ADC.',
          hint: 'Ohm\'s law on the shared trace.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the four steps of the noisy-measurement debug sequence.',
          answer: 'characterise the noise shape, check the reference, check the grounds, then apply firmware/hardware mitigation',
          explanation:
            'Identify before mitigating: the noise shape names its source; reference and ground checks come before code changes.',
          hint: 'Look, reference, ground, mitigate.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'RC low-pass filter', definition: 'R into C to ground; cutoff f_c = 1/(2πRC); −6 dB per octave above.' },
      { term: 'Common ground', definition: 'All supply grounds tied at one star point so every signal shares one reference.' },
      { term: 'Ground bounce', definition: 'Voltage lift on a shared return from high currents — fake signal to anything referenced to it.' },
      { term: 'Isolation boundary', definition: 'A deliberate no-shared-ground interface (opto, relay, isolated amplifier) between domains.' },
      { term: 'Trigger-synchronized sampling', definition: 'ADC conversions timed by a timer so coherent noise lands at a fixed phase.' },
    ],
    revisionSummary: [
      'f_c = 1/2πRC; match signal, noise and sampling bands.',
      'One star ground; motor returns on their own path.',
      'Bounce = I*R on shared copper — visible at 12 bits.',
      'Characterise noise before filtering; scope beats guessing.',
      'Hand-check every analog constant against 1/(2πRC); unit slips err by 1000x.',
    ],
    furtherReading: [
      { label: 'Wikipedia — RC circuit', url: 'https://en.wikipedia.org/wiki/RC_circuit', kind: 'article' },
      { label: 'Wikipedia — Ground (electricity)', url: 'https://en.wikipedia.org/wiki/Ground_(electricity)', kind: 'article' },
      { label: 'Wikipedia — Ground loop', url: 'https://en.wikipedia.org/wiki/Ground_loop_(electricity)', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
