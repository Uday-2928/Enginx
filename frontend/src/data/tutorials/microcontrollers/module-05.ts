import type { TutorialLesson } from '../types';

export const module05Lessons: TutorialLesson[] = [
  {
    id: 'mcu-m05-l1',
    title: 'Current, Voltage and Driving Loads',
    summary:
      'What a GPIO pin may source and sink (order-of-magnitude, verify-first), why direct loads exceed it, and the driver toolbox: resistive LED math, low-side transistor switch, logic-level MOSFET, relay module and H-bridge — with flyback diodes and common ground as law.',
    objectives: [
      'Apply the verify-first current habit: order-of-magnitude per-pin limits (tens of mA), with the exact figure from each datasheet.',
      'Compute an LED resistor from supply, forward voltage and target current — at 5 V and 3.3 V.',
      'Draw the low-side switch: GPIO -> resistor -> transistor/MOSFET -> load, and explain why low-side is conventional.',
      'State the two laws of this module: inductive loads get flyback diodes, and everything shares a common ground.',
    ],
    whyItMatters:
      'This is the lesson that keeps hardware alive. A GPIO is a logic signal, not a power supply — the moment a load wants real current (a motor, a relay, even a bright LED string), a driver stage is mandatory. Every burned board in beginner history traces to skipping this: over-current pins, inductive kickback, or missing grounds. The patterns here are small, standard, and reusable for a career.',
    prerequisites: [
      'Datasheet-first method and absolute maxima (mcu-m01-l3)',
      '5 V vs 3.3 V rules (mcu-m01-l3)',
      'Ohm\'s law and power basics (electronics fundamentals)',
    ],
    explanation:
      '### The verify-first current habit\n\nGPIO pins handle **tens of milliamps at most** — the order of magnitude is stable across families, the exact numbers are not. As documented examples (verify against each official datasheet): Microchip\'s ATmega328P datasheet lists ~40 mA absolute maximum per pin with ~20 mA the sensible design target; Raspberry Pi\'s RP2040 offers programmable drive of 2/4/8/12 mA (its datasheet); Espressif\'s ESP32 datasheet lists ~40 mA absolute-class per GPIO. The habit: **design to the recommended figure with margin, verify in the datasheet, never design to absolute maxima**. Also mind the *total*: pins collectively share a ground/VDD budget — a port driving eight LEDs at 20 mA each is a 160 mA question for the package and the regulator, not eight independent yeses.\n\n### The LED resistor, done honestly\n\nA LED is a diode: its forward voltage V_f (~2 V red, ~3 V blue/white — from the LED\'s datasheet) is roughly fixed, so the resistor sets the current: **R = (V_supply − V_f) / I**. At 5 V, red, 10 mA: R = (5−2)/0.01 = 300 Ω → use 330 Ω (standard value, ~9 mA). At 3.3 V, same LED: R = (3.3−2)/0.01 = 130 Ω → 150 Ω. Notice the 3.3 V case has less headroom — blue/white LEDs (V_f ≈ 3.0-3.2 V) barely light from 3.3 V through a resistor; the supply budget is a design input, not a detail.\n\n### The driver toolbox\n\nWhen the load wants more than a pin gives (or sits at another voltage), put a driver between:\n\n- **Low-side NPN transistor or logic-level N-MOSFET**: the pin drives the base/gate through a resistor; the load connects from supply to the transistor\'s collector/drain; the emitter/source goes to ground. Switching the *low* side is conventional because N-type devices switch ground-referenced loads best and the logic level means "load off" is a clean 0 V at the load.\n- **"Logic-level" MOSFET**: an N-MOSFET specified to enhance fully at your logic voltage (gate threshold specs matter — a part needing 10 V on the gate never turns on from 3.3 V; check V_GS(th) and the R_DS(on)-vs-V_GS curve in its datasheet).\n- **Relay module**: the coil is driven by a transistor stage inside the module (boards expose logic-input + V + GND); relays switch mains-class loads galvanically isolated — but the coil is *inductive*: flyback diode mandatory (modules include it; bare coils do not).\n- **H-bridge**: for DC motor *direction* — four switches arranged so polarity reverses; driven by two GPIO direction pins plus a PWM speed pin. Never wire a motor to a GPIO directly, ever.\n\n### The two laws\n\n1. **Inductive loads (relay coils, motors, solenoids) get a flyback diode** across the coil, oriented to conduct when the switch opens — collapsing magnetic fields otherwise produce voltage spikes that kill transistors and pins.\n2. **Everything shares a common ground**: the MCU\'s ground and the external supply\'s ground must be connected (one point) or no driver or input signal means anything — "it doesn\'t work" with a second supply is almost always this.',
    deepDive: '### Why low-side switching dominates, and when high-side is needed\n\nN-channel devices (BJT or MOSFET) are better switches than P-channel: faster, cheaper, lower resistance for the same size — so switching the ground side of the load lets you use the better device with ground-referenced logic. The cost: the load\'s "high" side is permanently at supply, so a *shorted load wire* connects to supply regardless of the switch — safety designs sometimes mandate high-side switching (P-MOSFET or high-side driver IC) so a ground fault turns things off. Know the convention, know why it exists, and know when the safety argument reverses it. Similarly, a driver\'s "on" resistance (R_DS(on)) must be small against the load\'s current — a MOSFET dropping 1 V at 2 A dissipates 2 W, which is a heatsink conversation, not a detail.\n\n### Ground loops and the one-point rule\n\n"Common ground" done badly becomes "ground loop": multiple ground paths carrying load current, with the MCU\'s ground reference bouncing (a motor pulling 2 A through a thin shared wire lifts "ground" by ohms × amps at exactly the pins you are reading). The discipline: route *load* current and *signal* current on separate wires that meet at one point (star ground); keep high-current returns off the signal ground path. This is why relay/motor modules expose separate logic and power connectors — the module boundary is the star point. The symptom of getting this wrong is characteristic: systems that work until the load switches, then glitch or reset — ground bounce modulating the logic itself.',
    examples: [
      {
        title: 'Three loads, three drivers, one checklist (worked, verify-first)',
        language: 'text',
        code:
          'LOAD 1: red LED @ 10 mA from a 3.3 V GPIO\n  R = (3.3 - 2.0) / 0.010 = 130 ohm -> use 150 ohm (~8.7 mA)\n  CHECK: 8.7 mA << pin\'s recommended drive (datasheet figure)\n  -> direct GPIO + resistor is fine. No driver needed.\n\nLOAD 2: 12 V / 500 mA relay coil from a 3.3 V board\n  DIRECT GPIO: NO — voltage AND current both out of range.\n  DRIVER: logic-level N-MOSFET low-side:\n     GPIO --[100R]-- gate\n     drain -> coil- ; coil+ -> +12 V\n     source -> GND (common with MCU ground!)\n     FLYBACK DIODE across coil (cathode to +12 V)\n  CHECKS: MOSFET V_GS fully-enhanced at 3.3 V (logic-level!)\n          diode current rating >= coil current\n          one-point ground between 12 V supply and MCU\n\nLOAD 3: small DC motor, reversible, ~1 A\n  DIRECT or single transistor: NO (no reversal; current too high)\n  DRIVER: H-bridge module:\n     IN1/IN2 <- two GPIOs (direction)\n     EN/PWM  <- one PWM GPIO (speed)\n     motor power from ITS supply; logic from MCU\n     grounds common (one point)\n  CHECKS: bridge current rating, flyback built in (modules: yes),\n          PWM frequency per module docs, common ground.',
        explanation: [
          'Load 1 shows the full LED arithmetic at 3.3 V including the standard-value round-down and the datasheet check — the verify-first habit in miniature.',
          'Load 2 shows the low-side MOSFET template with every terminal named, plus the three checks that beginners skip: gate drive spec, diode rating, common ground.',
          'Load 3 shows the H-bridge pattern and the module boundary: motor power and logic power meet at ONE ground point.',
          'Every case ends in CHECKS — the lesson\'s structure: pattern first, verification always.',
          'All figures are illustrative order-of-magnitude values; the exact numbers come from each part\'s datasheet — the module\'s standing rule.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'The low-side switch template',
        content:
          '   +V_load (12 V, say)\n        |\n    [LOAD: coil/motor/LED-string]\n        |\n        +---- collector / drain\n        |\n   GPIO --[R]-- base / gate\n        |       (driver transistor/MOSFET)\n        +---- emitter / source\n        |\n       GND  <--- common ground with MCU (ONE point)\n\n   + flyback diode ACROSS inductive loads:\n        coil+ ----|>|---- coil-   (cathode toward +V)\n        (conducts when switch opens:\n         collapse current loops safely)',
        caption:
          'One template covers relays, motors and LED strings: pin -> resistor -> transistor/MOSFET -> load, flyback for inductance, one common ground.',
      },
    ],
    tables: [
      {
        caption: 'Load-driver selection table',
        headers: ['Load', 'Direct GPIO?', 'Driver', 'Mandatory extras'],
        rows: [
          ['Indicator LED @ <10 mA', 'Yes (with resistor)', 'none', 'series resistor (computed)'],
          ['LED string / bright lamp', 'No', 'transistor / MOSFET low-side', 'resistor, flyback if inductive'],
          ['Relay coil', 'Never directly', 'transistor stage or relay module', 'flyback diode (module: included)'],
          ['DC motor, one direction', 'Never', 'MOSFET low-side', 'flyback, common ground'],
          ['DC motor, reversible', 'Never', 'H-bridge module', 'common ground, PWM pin'],
        ],
      },
      {
        caption: 'Per-pin current: the verify-first table (order-of-magnitude — exact figures per datasheet)',
        headers: ['Family', 'Pin current class', 'Design target', 'Verify in'],
        rows: [
          ['ATmega328P (Uno)', '~40 mA absolute max class', '~20 mA with margin', 'Microchip ATmega328P datasheet'],
          ['ESP32', '~40 mA absolute-class per GPIO', 'lower, with margin', 'Espressif ESP32 datasheet'],
          ['RP2040', 'programmable 2/4/8/12 mA', 'chosen drive class', 'Raspberry Pi RP2040 datasheet'],
          ['Generic Cortex-M', 'mA-class to tens of mA', 'per datasheet', 'vendor electrical characteristics'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Driving a motor or relay coil directly from a GPIO pin.',
        fix: 'A GPIO is a logic signal, not a power stage: current and often voltage are both out of range, and inductive kickback destroys pins. Use the driver toolbox — transistor/MOSFET, relay module, or H-bridge — with the checks each pattern names.',
      },
      {
        mistake: 'Omitting the flyback diode across a relay or motor coil.',
        fix: 'Opening an inductive circuit generates a voltage spike (V = L·di/dt) that avalanches through the switching device. The diode gives the collapsing field a safe loop; relay modules include one, bare coils do not.',
      },
      {
        mistake: 'Powering a load from a second supply without connecting grounds.',
        fix: 'No common reference means the driver\'s gate/base voltage is undefined relative to its source/emitter — nothing works, or works randomly. One-point common ground between supplies is law (and keep load current off the signal ground path).',
      },
    ],
    guidedPractice: {
      title: 'Design the driver, run the checks',
      brief:
        'A 3.3 V board must switch a 24 V / 300 mA indicator lamp. Choose the driver topology, specify every component (with reasoning), and run the full check list: gate drive, current ratings, flyback need, grounding. State what would fail if the lamp were instead a 24 V relay coil.',
      starterCode:
        'topology: ________\ncomponents: ________\nchecks: gate ______ ; current ______ ; flyback ______ ; ground ______\nrelay-coil difference: ________',
      expectedBehavior:
        'Topology: low-side logic-level N-MOSFET (24 V load needs no GPIO voltage exposure). Components: series gate resistor (~100 Ω class), MOSFET rated ≥ 24 V and ≥ 300 mA with R_DS(on) specified at 3.3 V V_GS (dissipation = I²R must be trivial — check), flyback diode if inductive, common ground between 24 V supply and MCU. Checks all pass by selection, not hope. Relay-coil difference: the coil IS inductive — flyback becomes mandatory (not optional), and the diode must carry the coil current. Same topology, one component promoted to mandatory.',
      hints: [
        'The GPIO never touches 24 V in a low-side design — say why.',
        'R_DS(on) must be specified AT your gate drive voltage.',
        'Lamp = resistive; coil = inductive — flyback follows the load type.',
      ],
    },
    practiceExercises: [
      {
        title: 'LED resistor at both voltages',
        brief:
          'A blue LED (V_f ≈ 3.1 V) is to run at 5 mA. Compute R for a 5 V supply and for a 3.3 V supply. State which case is fragile and why, and what you would check in the LED\'s datasheet.',
        expectedBehavior:
          '5 V: R = (5−3.1)/0.005 = 380 Ω → 390 Ω standard (~4.9 mA). 3.3 V: R = (3.3−3.1)/0.005 = 40 Ω → 47 Ω (~4.3 mA) — fragile: 0.2 V of headroom means V_f tolerance and temperature swing the current wildly. Datasheet checks: V_f distribution (binning) and the I-vs-V curve. Moral: 3.3 V rails barely support blue/white LEDs through resistors; prefer lower-V_f colors or a driver.',
        hints: [
          'Same formula both cases; compare the headroom.',
          'Small headroom = high sensitivity to V_f spread.',
          'The LED datasheet\'s V_f binning is the relevant section.',
        ],
      },
      {
        title: 'Ground-bounce diagnosis',
        brief:
          'A motor driver shares one long ground wire with the MCU; when the motor starts, the MCU resets. Explain the mechanism (return current × wire resistance lifting ground) and give the two-line fix.',
        expectedBehavior:
          'Mechanism: motor return current (amps) through shared wire resistance lifts the "ground" at the MCU by V = I×R; the MCU\'s supply/reference bounces below the reset threshold or its inputs misread — reset or garbage. Fix: separate high-current return path back to the supply (its own wire), star-pointing grounds at the supply; plus a beefier ground conductor. The one-point rule, applied to a real failure.',
        hints: [
          'V = I × R on the shared path — compute the bounce class.',
          'Reset circuits watch supply/reference voltage.',
          'Star ground at the SOURCE, not at the board.',
        ],
      },
    ],
    assessment: {
      title: 'Loads and drivers checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Per the verify-first habit, what is the right relationship to GPIO pin-current figures?',
          options: [
            'Design to the absolute maximum listed in the datasheet',
            'Design to the recommended figure with margin; verify the exact number in the part\'s datasheet; mind the package-wide total',
            'All GPIOs can source 100 mA — it is a universal standard',
            'Current limits do not apply to outputs, only inputs',
          ],
          answer: 'Design to the recommended figure with margin; verify the exact number in the part\'s datasheet; mind the package-wide total',
          explanation:
            'Order of magnitude is tens of mA; exact figures (e.g., ~40 mA abs-max class on ATmega328P/ESP32, programmable 2-12 mA on RP2040) live in each datasheet. Design below recommended limits and watch the per-package total too.',
          hint: 'Absolute maxima are fences, not targets — and totals matter.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A flyback diode across a relay coil is optional if the driving transistor is rated for high voltage.',
          answer: 'false',
          explanation:
            'The diode is not about steady voltage but the switching transient: opening the coil produces a spike that avalanches through the switch each time. The diode is mandatory for inductive loads, always.',
          hint: 'V = L·di/dt at the moment of opening.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'A "logic-level" MOSFET matters because:',
          options: [
            'It understands UART logic',
            'Its gate is specified to enhance fully at logic voltages (3.3/5 V) — ordinary MOSFETs may need 10 V gate drive',
            'It has no body diode',
            'It works without a gate resistor',
          ],
          answer: 'Its gate is specified to enhance fully at logic voltages (3.3/5 V) — ordinary MOSFETs may need 10 V gate drive',
          explanation:
            'R_DS(on) is specified vs V_GS: a standard MOSFET at 3.3 V gate may be barely on (hot, slow, lossy). Logic-level parts specify low-voltage gate drive — checked in the part\'s datasheet curves.',
          hint: 'The gate must be satisfied, not just nudged.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the non-negotiable electrical connection between the MCU supply and any external load supply, without which nothing works.',
          answer: 'common ground',
          explanation:
            'Signals and switch states are voltages relative to ground; two unconnected grounds have no shared reference. One-point common ground is law in every driver circuit.',
          hint: 'It is the second "law" of this lesson.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Low-side switch', definition: 'Driver between load and ground (N-type device); the conventional GPIO load-switching topology.' },
      { term: 'Logic-level MOSFET', definition: 'N-MOSFET specified to enhance fully at logic gate voltages — check R_DS(on) vs V_GS in its datasheet.' },
      { term: 'Flyback diode', definition: 'Diode across an inductive load giving the collapse current a safe loop; mandatory.' },
      { term: 'H-bridge', definition: 'Four-switch stage reversing DC motor polarity; direction pins + PWM speed pin.' },
      { term: 'Star ground', definition: 'Single-point common ground where load and signal returns meet — prevents ground bounce.' },
    ],
    revisionSummary: [
      'GPIO current: tens of mA class; exact figures per datasheet; design below recommended; watch package totals.',
      'LED math: R = (V_supply − V_f)/I; standard-value round; headroom warning at 3.3 V for high-V_f LEDs.',
      'Driver toolbox: low-side transistor/MOSFET (default), relay module (isolation), H-bridge (direction).',
      'Two laws: flyback diodes on inductance; common (one-point) ground between all supplies.',
      'Load returns and signal returns take separate paths to the star point — or ground bounce debugs you.',
    ],
    furtherReading: [
      { label: 'All About Circuits — textbook (semiconductor switching chapters)', url: 'https://www.allaboutcircuits.com/textbook/', kind: 'article' },
      { label: 'Electronics Tutorials — transistor as a switch', url: 'https://www.electronics-tutorials.ws/transistor/tran_4.html', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'mcu-m05-l2',
    title: 'Level Shifters, External Power and Isolation',
    summary:
      'The wiring discipline for mixed-voltage, mixed-supply systems: translator selection per signal class, powering loads from their own supplies safely, and galvanic isolation (optocouplers, relay contacts) for genuinely hostile environments.',
    objectives: [
      'Select level translation per signal class: divider (one-way slow), shifter module (bidirectional buses), TXB-class/direction-controlled ICs (fast one-way groups).',
      'Wire external power correctly: separate supplies, one-point common ground, current path discipline, and the board\'s regulator limits (powered from USB vs barrel).',
      'Explain galvanic isolation: what optocouplers and relay contacts actually protect, and when isolation is required rather than nice.',
      'Assemble the complete pre-wiring checklist (voltage, current, ground, driver, isolation) that this course\'s projects execute.',
    ],
    whyItMatters:
      'Modules 1-5\'s electrical facts converge here into a wiring discipline: 3.3 V boards talking to 5 V sensors, motors on their own supplies, and the occasional machine-floor input that can carry real voltage. The patterns are small and learnable — and the difference between a hobby project and a product that survives contact with the real world is almost entirely this lesson.',
    prerequisites: [
      'Voltage domain rules (mcu-m01-l3)',
      'Driver toolbox and grounding (mcu-m05-l1)',
    ],
    explanation:
      '### Translation, chosen per signal class\n\n- **One-way, slow** (sensor output -> ADC, button -> input): a two-resistor **divider** (mcu-m01-l3 arithmetic) — cheap, adequate, direction-fixed.\n- **Bidirectional buses** (I2C across 3.3/5 V): a **bidirectional level-shifter module** (the common BSS138-based boards, or dedicated ICs) — dividers cannot do bidirectional, full stop.\n- **Fast one-way groups** (SPI/parallel at MHz rates): proper **translator ICs** (direction-controlled families like 74LVC-class buffers or auto-direction translators) — dividers\' impedance rounds edges (RC with input capacitance); spec-class parts keep edges sharp.\n\nThe selection question is always the same three: direction? speed? number of signals?\n\n### External power, correctly\n\nLoads get their own supply (motor battery, 12 V brick, 24 V rail). The rules from mcu-m05-l1 apply — one-point common ground, load returns separated from logic returns — plus two new ones: **do not back-power the board** (a supply feeding the board\'s 3.3 V rail through a GPIO clamp when the board is off is a classic killer — check for paths from external power through sensors into unpowered pins); and **respect the board\'s regulator budget**: powering sensors and radios from the board\'s own 3.3 V regulator is fine until the total (module datasheets + measurement) exceeds what the regulator and its input source (USB, per its spec) can deliver — the board schematic and regulator datasheet are the authority.\n\n### Isolation: when grounds must not touch\n\nSome environments make common ground dangerous: machine-floor signals with their own ground potentials, mains-adjacent equipment, long lines picking up surges. **Galvanic isolation** severs the copper: **optocouplers** (LED + photodetector in one package: signal crosses as light) for digital inputs/outputs, **relay contacts** (mcu-m05-l1) for loads, isolated DC-DC modules for power. The protection is real but paid for: extra components, drive current for the internal LED, and slower edges. The rule of thumb: isolate anything whose ground you do not control — sensors wired across a building, anything near mains, and long field buses; keep hobby-bench grounds common and save the parts.',
    deepDive: '### Back-powering: the invisible killer, traced\n\nA board is OFF (USB unplugged). Its 3.3 V rail is at 0 V. A sensor, powered from an always-on 5 V supply, pushes its output high — through the divider, into the board\'s GPIO input, through the pin\'s internal protection diode, into the unpowered 3.3 V rail. The board is now being powered *through its own input protection*, backward, at whatever current the sensor can supply: brownout-dance boots, corrupted state, or a cooked trace. The defenses: power domains that switch together (sensor supply gated by the board), isolation where domains must differ, and the checklist line "with the board OFF, does any external source find a path to its rails?" — answer it with the schematic, not with luck.\n\n### Isolation specification literacy\n\nIsolation parts are specified: working voltage (continuous), isolation voltage (tested withstand — higher, momentary), creepage/clearance (physical distances on the package/board), and transient immunity for digital isolators. Reading them is the same verify-first habit: "1 kV isolation" on the package is a tested withstand, not a working rating, and mains-adjacent designs follow safety-standard distances (creepage/clearance tables) — a domain where the standard, not intuition, decides. For this course\'s scope: name the specification classes, use certified modules at the bench, and route mains-adjacent work to proper designs and people.',
    examples: [
      {
        title: 'Mixed-voltage build, wired correctly end to end',
        language: 'text',
        code:
          'SYSTEM: 3.3 V board (ESP32-class) + 5 V I2C sensor + 12 V lamp\n\n POWER TREE:\n   12 V brick -> lamp driver (MOSFET low-side, mcu-m05-l1)\n   5 V supply -> sensor VCC            (separate supply OK)\n   USB 5 V    -> board regulator -> 3.3 V board\n   GROUNDS: all three meet at ONE point (star) at the supplies\n\n SIGNALS:\n   sensor SDA/SCL (5 V) <-> board I2C (3.3 V)\n     -> BIDIRECTIONAL shifter module (BSS138-class)\n        (dividers cannot do bidirectional — no divider!)\n   board GPIO -> MOSFET gate (lamp): same-logic-level drive,\n     gate resistor; 12 V never touches the board\n\n CHECKLIST (this lesson\'s artifact):\n  [x] every crossing translated per class (dir/speed/count)\n  [x] no back-power path (board OFF -> no source reaches rails)\n  [x] one-point ground; load returns separate from logic\n  [x] regulator budget: board 3.3 V loads summed < regulator/\n      USB spec (verified in board schematic + measurements)\n  [x] nothing hostile (mains/field) without isolation',
        explanation: [
          'The power tree separates three supplies and names the star point — mcu-m05-l1\'s law made structural.',
          'The I2C crossing deliberately rejects the divider with the reason (bidirectional) — the per-class selection rule doing its job.',
          'The lamp path shows the 12 V domain touching NOTHING but the MOSFET drain — the board lives entirely at 3.3 V.',
          'The checklist is the lesson\'s deliverable: five lines, each referencing a rule from this or the previous lesson — and each checkable, not vibes.',
          'The back-power line is checkable by schematic review: trace every external source to see if any reaches board rails when the board is off.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Isolation barrier anatomy',
        content:
          '  SAFE SIDE                    BARRIER              FIELD SIDE\n  ---------------             -----------          ---------------\n  MCU GPIO --[R]-- LED ====| light |== phototransistor -- field input\n  (3.3 V domain)           |-------|                  (foreign ground)\n                           optocoupler\n\n  MCU pin  ----[relay coil]--== contacts ==-- load (mains-class)\n                           |---------|\n                            relay\n\n  grounds: NOT connected across the barrier. That is the point.',
        caption:
          'Signals cross as light or as magnetic contact; copper does not. The foreign ground can bounce, surge or float — nothing crosses.',
      },
    ],
    tables: [
      {
        caption: 'Translation selection table',
        headers: ['Signal class', 'Translator', 'Why'],
        rows: [
          ['One-way, slow (DC-100 kHz class)', 'Resistor divider', 'Cheap; impedance fine at low speed'],
          ['Bidirectional bus (I2C)', 'BSS138-class module / IC', 'Dividers cannot be bidirectional'],
          ['Fast one-way groups (SPI/parallel)', '74LVC-class buffer / translator IC', 'Edges must stay sharp (divider RC)'],
          ['Foreign/hostile ground', 'Optocoupler / digital isolator', 'Galvanic isolation, not translation'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using a resistor divider on an I2C bus crossing voltage domains.',
        fix: 'Dividers are one-way and impedance-heavy: bidirectional open-drain I2C needs a proper two-way translator (BSS138-class modules exist precisely for this). Match the translator to the signal class, every time.',
      },
      {
        mistake: 'Letting an always-powered sensor back-power the unpowered board through its GPIO.',
        fix: 'Input protection diodes conduct into the board\'s rails — phantom powering, brownout boots, damage. Gate the sensor\'s supply with the board\'s, or isolate. Check the OFF state with the schematic.',
      },
      {
        mistake: 'Connecting grounds across an isolation barrier "so it will work".',
        fix: 'The barrier is the protection: joining grounds reintroduces the foreign potential you paid to exclude. Isolated sides need isolated power (isolated DC-DC or local supply) — isolation is all-or-nothing.',
      },
    ],
    guidedPractice: {
      title: 'Wire the mixed system, find the trap',
      brief:
        'A 3.3 V board reads a 5 V pushbutton (simple switch), drives a 5 V servo (its own 5 V 2 A supply), and monitors a 24 V machine-floor signal. For each connection: translator/driver choice and the checklist line that governs it. Then find the trap in "the servo can share the board\'s USB 5 V".',
      starterCode:
        'button: translator ______ ; checklist line ______\nservo: power ______ ; signal ______ ; ground ______\n24 V signal: interface ______ ; because ________\ntrap in "servo from USB 5 V": ________',
      expectedBehavior:
        'Button: 5 V -> 3.3 V input — divider (one-way, slow); checklist: translation class + not-5V-tolerant rule. Servo: power from ITS 2 A supply with common ground to the board; signal line is 3.3 V PWM into the servo (servos generally accept 3.3 V-class logic — verify the servo docs); ground: star point. 24 V machine signal: optocoupler/isolated input — foreign ground, isolation required (the field-side rule). Trap: USB 5 V is rated ~500 mA (per USB spec class; verify) — a 2 A servo stall browns out the board; servo gets its own supply.',
      hints: [
        'Three signal classes, three translators — direction/speed/ground decide.',
        'Field signals bring their own ground — that is the isolation trigger.',
        'Check the USB power budget arithmetic before sharing.',
      ],
    },
    practiceExercises: [
      {
        title: 'Back-power audit',
        brief:
          'Board OFF (unplugged); an I2C sensor remains powered at 3.3 V from another device on the bus. Trace the two back-power paths into the board, and give the two standard defenses.',
        expectedBehavior:
          'Paths: (1) through the bus pull-ups (3.3 V sensor supply holds SDA/SCL high -> into board pins -> protection diodes -> board 3.3 V rail); (2) through any sensor output held high into board inputs. Defenses: power the sensor from the board\'s rail (domains live and die together) or isolate the bus; at minimum, series resistors limit the phantom current (a mitigation, not a fix). The audit method: with the board off, trace every external source to board pins.',
        hints: [
          'Pull-ups are power sources when their domain is alive.',
          'Protection diodes conduct INTO the rail — that is the path.',
          'Shared-domain powering is the clean fix.',
        ],
      },
      {
        title: 'Isolation spec reading',
        brief:
          'An optocoupler datasheet lists: CTR (current transfer ratio) 50% min, V_ISO 3750 Vrms, and a max LED current of 50 mA. For a 3.3 V GPIO driving the LED through 330 Ω at a 5 V-side phototransistor pull-up, compute the LED current and check CTR sufficiency for 5 mA output — and state which figure is the tested-withstand (not working) rating.',
        expectedBehavior:
          'LED current ≈ (3.3 − ~1.2 V_f)/330 ≈ 6.4 mA. Output available ≈ CTR × I_LED = 0.5 × 6.4 ≈ 3.2 mA < 5 mA required — insufficient; fix: lower LED resistor (respecting 50 mA max), higher-CTR part, or lighter pull-up (larger resistor → less current needed). V_ISO 3750 Vrms is the tested withstand — the working voltage rating is a separate, lower figure (the literacy point).',
        hints: [
          'CTR = output current / input current — apply it.',
          'V_f of an optocoupler LED is ~1.2 V class.',
          'Withstand vs working — the classic spec-reading trap.',
        ],
      },
    ],
    assessment: {
      title: 'Translation, power, isolation checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which translator belongs on a 3.3 V <-> 5 V I2C bus?',
          options: [
            'A 10k/20k resistor divider per line',
            'A bidirectional level-shifter module (BSS138-class) or dedicated I2C translator',
            'Nothing — I2C is voltage-agnostic',
            'A diode clamp only',
          ],
          answer: 'A bidirectional level-shifter module (BSS138-class) or dedicated I2C translator',
          explanation:
            'I2C is bidirectional open-drain: dividers are one-way and cannot work. Match translators to signal class — direction is the first question.',
          hint: 'Can current flow both ways on that line?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'With the board unpowered, an external sensor held HIGH on a GPIO can back-power the board through the pin\'s protection diodes.',
          answer: 'true',
          explanation:
            'Protection diodes conduct into the (unpowered) rail, phantom-powering the board backward — brownouts, corrupted state, damage. Power domains should live and die together, or be isolated.',
          hint: 'Where does the sensor\'s high level find a path?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'What does galvanic isolation actually protect against?',
          options: [
            'Static electricity only',
            'Foreign ground potentials, surges and fault currents on the other side — because no copper crosses the barrier',
            'Voltage drops in long cables',
            'Radio interference',
          ],
          answer: 'Foreign ground potentials, surges and fault currents on the other side — because no copper crosses the barrier',
          explanation:
            'Optocouplers/relays cross signals as light or magnetic contact: the foreign side\'s ground can bounce, surge or float without reaching your MCU. Use it whenever you do not control the other side\'s ground.',
          hint: 'What physically crosses the barrier?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the single connection every multi-supply system requires between supplies — done at one point, with load returns kept separate.',
          answer: 'common ground',
          explanation:
            'One-point (star) common ground: reference for all signals, without load current running through signal returns. The mcu-m05-l1 law, restated as system wiring.',
          hint: 'The law from the previous lesson, systemized.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Level shifter module', definition: 'BSS138-class bidirectional translator for buses crossing voltage domains.' },
      { term: 'Back-powering', definition: 'External sources feeding an unpowered board through protection diodes — traced by schematic, prevented by domain gating.' },
      { term: 'Regulator budget', definition: 'The board\'s 3.3 V regulator and input source (USB-class) current limit — sum your loads against it.' },
      { term: 'Optocoupler', definition: 'LED+photodetector in one package: signals cross as light, galvanically isolated.' },
      { term: 'Creepage / clearance', definition: 'Safety-standard surface/air distances across isolation barriers — standard-defined, not intuitive.' },
    ],
    revisionSummary: [
      'Translation per class: divider (one-way slow), BSS138-class (bidirectional bus), LVC-class ICs (fast groups), optocoupler (foreign ground).',
      'External supplies: own power for loads, one-point ground, no back-power paths (check the OFF state).',
      'Regulator budgets are datasheet facts summed against real loads — USB-class inputs have spec limits.',
      'Isolation severs copper: use when the other ground is not yours; isolated sides need isolated power.',
      'The five-line checklist (voltage, current, ground, driver, isolation) precedes every wiring session.',
    ],
    furtherReading: [
      { label: 'All About Circuits — textbook', url: 'https://www.allaboutcircuits.com/textbook/', kind: 'article' },
      { label: 'Electronics Tutorials — optocoupler', url: 'https://www.electronics-tutorials.ws/blog/optocoupler.html', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'mcu-m05-l3',
    title: 'Guided Safe Interfacing Projects',
    summary:
      'Four projects — debounced button+LED, photoresistor voltage-diver ADC monitor, servo on a dedicated supply, UART-to-PC link — each with the safety checklist executed and an honest note on what needs the physical board (and where the platform\'s Virtual Hardware Lab fits).',
    objectives: [
      'Build the button+LED project with software debounce (20-50 ms class) and the millis() pattern — and explain why debounce exists.',
      'Wire the photoresistor divider with the scaling chain from mcu-m02-l3: counts -> volts -> engineering units.',
      'Specify the servo project\'s power discipline: dedicated 5 V supply, common ground, 50 Hz pulse-timing signal (per hobby-servo convention — verify your servo\'s docs).',
      'State for each project exactly which steps need the physical board, and practice them safely in the platform\'s Virtual Hardware Lab where available.',
    ],
    whyItMatters:
      'This is the course\'s hands-on finale: four projects that together cover input conditioning, analog measurement, power discipline and communication — the four skills of real interfacing. Each is built with its checklist executed, so the habits (voltage, current, ground, driver) become reflexes. And each is honest about its boundary: this platform has no physical hardware, so the code and reasoning are fully practiced here, the soldering and measuring are yours.',
    prerequisites: [
      'Driver toolbox (mcu-m05-l1)',
      'Translation and power rules (mcu-m05-l2)',
      'Arduino API and millis() pattern (mcu-m02-l1)',
      'ADC scaling chain (mcu-m02-l3)',
    ],
    explanation:
      '### Project 1: debounced button + LED\n\nMechanical switches **bounce**: the contacts literally vibrate for milliseconds on each press, producing many edges (verified by anyone who has counted button presses on an oscilloscope — the phenomenon is physical, documented in every embedded text). The fix is software debounce: on the first edge, record the time (`millis()`); accept a state change only after the signal has been stable for the debounce window (**20-50 ms class** — per your switch\'s behavior; it is a measurement, not a constant). The millis() pattern from mcu-m02-l1 makes it non-blocking. Checklist: input mode with pull-up (mcu-m02-l2 idioms), no external resistor needed for internal pull-up (per the board docs), 5 V/3.3 V domain check trivially same-domain.\n\n### Project 2: photoresistor (LDR) voltage divider -> ADC\n\nAn LDR\'s resistance falls with light. Wire it as the **top** element of a divider (LDR from 3.3 V/5 V to the ADC node, fixed resistor from node to ground — or the reverse, which inverts the curve; choose deliberately), read with `analogRead`, and convert through the named chain: counts -> volts -> (with your fixed resistor\'s value and the LDR\'s datasheet curve) approximate light level. The scaling discipline from mcu-m02-l3 — raw counts printed alongside units — is the whole debugging strategy. Checklist: divider current (kΩ values → sub-mA, trivially safe), ADC input range within reference, same-domain.\n\n### Project 3: servo on a dedicated supply\n\nA hobby servo takes **PWM at ~50 Hz**: a 1-2 ms pulse inside a 20 ms frame positions the shaft (per hobby-servo convention — your servo\'s datasheet may differ, verify). Servos **stall at amps** — the reason the project\'s electrical content is power: the servo runs from its **own 5 V supply capable of amps**, the control signal comes from the GPIO, and **grounds are common (one point)**. Sharing the board\'s USB-class 5 V browns out the board on every stall (the mcu-m05-l2 trap, made real). Checklist: dedicated supply, common ground, signal never carries servo current, PWM timing per the servo\'s docs.\n\n### Project 4: UART-to-PC link\n\n`Serial.begin(115200)` (or 9600) opens the link through the board\'s USB bridge (Uno) or native USB (many other boards); print the sensor data from Projects 1-2 with timestamps. The project\'s content is *discipline*: readable, parseable lines (CSV-ish), raw-plus-units values (mcu-m02-l3), and rates that respect the UART budget (mcu-m02-l3 arithmetic). This is the observation channel for every other project. Checklist: baud match on both ends, line rate within bits/baud budget, no prints inside timing-critical sections.',
    deepDive: '### Where the Virtual Hardware Lab fits — and where it ends\n\nThis platform\'s Virtual Hardware Lab provides simulated boards (arduino-uno-r3, esp32-devkit-v1, raspberry-pi-4b, raspberry-pi-pico) — a safe place to practice the *software* side: pin APIs, timing patterns, serial output, without any electrical risk. The honest boundary: simulation does not model bounce, divider tolerances, servo stall currents or ground paths — the electrical half of these projects exists only on physical hardware with a multimeter in hand. The recommended rhythm: build and verify logic in the Virtual Hardware Lab, then execute the wiring checklists on real hardware with the datasheets open. Neither half replaces the other; together they are the course\'s method.\n\n### Debounce mathematics, briefly\n\nA bouncy contact produces edge clusters; the debounce window must exceed the bounce duration (switch-dependent, ms-class) but stay under the fastest intended press rate (~5-10 presses/second class for humans → 100-200 ms period). 20-50 ms sits comfortably between. Two refinements production code adds: **state-machine debounce** (count consecutive stable samples instead of timestamps — immune to millis() edge cases) and **per-button records** for multiple buttons. The project uses the timestamp version for clarity; the refinement is the next exercise.',
    examples: [
      {
        title: 'Project 1 code: debounced button + LED (read-and-trace; board needed to run)',
        language: 'cpp',
        code:
          '/* Read-and-trace material (no board on this platform).\n   API semantics per docs.arduino.cc; wiring per checklist. */\nconst int BUTTON = 2;    // to GND when pressed (input pull-up)\nconst int LED    = 13;   // onboard LED (per Uno docs)\nconst unsigned long DEBOUNCE_MS = 30;   // 20-50 ms class\n\nint lastReading = HIGH;      // pull-up: idle HIGH, pressed LOW\nint ledState = LOW;\nunsigned long lastChangeMs = 0;\n\nvoid setup() {\n    pinMode(BUTTON, INPUT_PULLUP);\n    pinMode(LED, OUTPUT);\n}\n\nvoid loop() {\n    int reading = digitalRead(BUTTON);\n\n    if (reading != lastReading) {\n        lastChangeMs = millis();     // edge seen: restart the window\n    }\n\n    if ((millis() - lastChangeMs) > DEBOUNCE_MS\n        && reading != ledState) {\n        ledState = reading;          // stable AND changed: accept\n        digitalWrite(LED, ledState == LOW ? HIGH : LOW);\n    }\n\n    lastReading = reading;\n}',
        explanation: [
          'Wiring (checklist line by line): button between pin and GND; INPUT_PULLUP uses the internal pull-up (per the Arduino reference) so idle reads HIGH, pressed LOW — active-low, no external resistor.',
          'Debounce mechanism: ANY edge restarts the stability window; only after DEBOUNCE_MS of silence is the new state accepted and mirrored to the LED. Bounce (edge clusters) keeps restarting the window and is thereby ignored.',
          'The millis() difference form (mcu-m02-l1) keeps it non-blocking and wrap-safe — the same pattern that schedules blinks here debounces buttons.',
          'The inverted logic (pressed = LOW) is stated twice so nobody "fixes" it into a permanently-on LED.',
          'Honest boundary: the *reasoning* is fully verifiable here; the *bounce itself* is a physical phenomenon you confirm on hardware (or by counting edges with the Serial print you will add in Project 4).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Button bounce vs debounced acceptance (educational waveform, illustrative)',
        content:
          'raw pin:   ────\\_/\\_/\\_/￣￣￣￣￣￣￣￣￣￣\\_/￣￣\\_/\\___\n              ^press  (bounce cluster)        ^release (bounce)\n\naccepted:  ──────────────────\\_____________/───────────────\n                          ^ 30 ms after last edge\n\nrule: any edge restarts the window; accept after silence',
        caption:
          'The raw signal bounces for ms-class; the debounced state changes once, 30 ms after the last bounce. Illustrative, not measured.',
      },
      {
        kind: 'ascii',
        title: 'Servo power discipline',
        content:
          '   servo 5 V 2 A supply ----+---- servo V+\n                            |\n   board USB 5 V -----------+---- board (own regulator path)\n                            |\n   GNDs meet at ONE point --+---- servo GND, board GND\n                            |\n   board GPIO --------------- servo SIGNAL (timing only,\n                             no servo current on this wire)\n\n   WRONG: servo V+ from the board\'s 5 V pin\n          (stall current browns out the board)',
        caption:
          'The servo\'s amps live on its supply; the board contributes only the timing signal; grounds meet once.',
      },
    ],
    tables: [
      {
        caption: 'The four projects: electrical checklist summary',
        headers: ['Project', 'Voltage check', 'Current check', 'Ground/driver check'],
        rows: [
          ['Button + LED', 'same domain', 'pull-up input; LED via resistor', 'internal pull-up (docs)'],
          ['LDR divider', 'same domain', 'kΩ divider: sub-mA', 'none needed'],
          ['Servo', 'servo supply 5 V class', 'stall amps on ITS supply', 'common ground; GPIO = signal only'],
          ['UART to PC', 'via USB (board-managed)', 'none (logic)', 'USB bridge handles it'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Skipping debounce because "it worked when I tested it".',
        fix: 'Bounce is intermittent and load/board-dependent — passing once proves nothing. The debounce window (20-50 ms class) is cheap insurance; its absence shows up later as phantom double-presses in the field.',
      },
      {
        mistake: 'Powering a servo (or any motor-class load) from the board\'s 5 V pin.',
        fix: 'Stall currents are amp-class; the board\'s regulator and USB input are not. Dedicated supply + common ground — the mcu-m05-l2 discipline, executed in this project.',
      },
      {
        mistake: 'Trusting LDR readings as absolute lux values.',
        fix: 'LDRs are slow, temperature- and history-dependent sensors with broad tolerance — read them as *relative* light trends unless you calibrate against a reference. The scaling chain gives honest relative units; absolute claims need calibration data.',
      },
    ],
    guidedPractice: {
      title: 'Execute the full checklist on a new project',
      brief:
        'New brief: a 3.3 V board reads a 5 V PIR motion sensor (output: 3.3 V high when motion, per its datasheet) and switches a 12 V LED strip (500 mA) on for 10 s. Produce the complete wiring plan with the five-line checklist (voltage, current, ground, driver, isolation) and the software shape (debounce the PIR? why/why not; the 10 s timer pattern).',
      starterCode:
        'PIR signal: domain ____ -> ____ ; translation? ______\nLED strip: driver ______ ; flyback? ______ ; supply ______\nGrounds: ________\nDebounce PIR? ____ because ________\n10 s timer pattern: ________',
      expectedBehavior:
        'PIR: 3.3 V output into 3.3 V input — same domain, no translation (verify the sensor datasheet’s output level; many PIR modules are 3.3 V-logic friendly). LED strip: low-side logic-level MOSFET driver, 12 V on its own supply, strip is resistive-ish (LEDs) so flyback not strictly required (verify strip driver docs), grounds common at one point. Debounce: PIR outputs are already latched/timed by the module (its docs specify a hold time) — no software debounce needed, but a stability check is polite. Timer: millis() pattern — motion timestamped, strip off when 10 s elapse since last motion (retriggering behavior specified deliberately).',
      hints: [
        'Read the PIR datasheet’s output stage before translating anything.',
        'Resistive vs inductive decides flyback — LEDs are diodes, not coils.',
        'Retriggering is a design decision: state yours explicitly.',
      ],
    },
    practiceExercises: [
      {
        title: 'State-machine debounce refinement',
        brief:
          'Upgrade the timestamp debounce to a sample-count version: sample every 5 ms, accept a change after 6 consecutive identical samples. State the effective debounce window and one advantage over timestamps.',
        expectedBehavior:
          'Window = 6 × 5 ms = 30 ms (same class). Advantage: counting consecutive samples is immune to the millis() wrap edge cases and to missed timestamps; it also integrates naturally into a fixed-rate scheduler (the RTOS/loop-rate style). Trade: requires a periodic sampler (timer or fast loop).',
        hints: [
          'Window = samples × sample period.',
          'What edge cases did the unsigned-difference form have?',
          'Fixed-rate sampling is the production idiom.',
        ],
      },
      {
        title: 'Servo stall arithmetic',
        brief:
          'A servo stalls at 1.2 A at 5 V. (a) What current does the board\'s USB-class input (assume ~500 mA budget, verify per USB spec/board docs) face if the servo shares it? (b) Compute the divider: how much remains for the board itself? (c) State the failure mode and the fix.',
        expectedBehavior:
          '(a) 1.2 A demanded from a ~500 mA budget — 700 mA in deficit. (b) Nothing remains; the source sags. (c) Brownout: the board resets (or the USB port faults) every servo stall — intermittent, load-correlated resets. Fix: dedicated servo supply (amp-class), common ground, GPIO signal only — the project’s discipline, now with numbers.',
        hints: [
          'Stall current is the servo’s worst case — design for it.',
          'Compare demand to the source budget.',
          'Brownouts are load-correlated — that correlation is the clue.',
        ],
      },
    ],
    assessment: {
      title: 'Guided projects checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why does the debounced button project use INPUT_PULLUP with the button wired to GND?',
          options: [
            'It is faster to read',
            'The internal pull-up idles the pin HIGH (per the Arduino reference); pressing pulls it LOW — active-low, no external resistor needed',
            'Pull-ups increase ADC accuracy',
            'LOW means pressed in all wiring styles',
          ],
          answer: 'The internal pull-up idles the pin HIGH (per the Arduino reference); pressing pulls it LOW — active-low, no external resistor needed',
          explanation:
            'INPUT_PULLUP enables the internal pull-up: idle HIGH, pressed (shorted to GND) LOW. The inverted logic is deliberate and stated in the code — a classic source of "my LED is backwards" confusion.',
          hint: 'What does the pin read when the button is NOT pressed?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'The servo project powers the servo from its own amp-class 5 V supply and shares only ground and the timing signal with the board.',
          answer: 'true',
          explanation:
            'Servo stall currents are amp-class; the board’s regulator/USB budget cannot serve them. Dedicated supply + one-point common ground + GPIO-as-signal-only is the discipline.',
          hint: 'Where do the amps come from, and where do they NOT go?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'What timing does a hobby servo expect (per the common convention — verify your servo\'s docs)?',
          options: [
            'A DC voltage 0-5 V sets the angle',
            'A ~50 Hz pulse train: 1-2 ms pulse width within a 20 ms frame positions the shaft',
            'A 2 kHz square wave whose frequency sets the angle',
            'A single long pulse at power-up',
          ],
          answer: 'A ~50 Hz pulse train: 1-2 ms pulse width within a 20 ms frame positions the shaft',
          explanation:
            'Hobby-servo convention: 50 Hz frames (20 ms), 1-2 ms pulses (often ~0.5-2.5 ms depending on the servo — its datasheet decides). The pulse WIDTH carries the position.',
          hint: 'Width within a frame — not frequency, not DC.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Three words: the platform resource this course recommends for practicing these projects\' software side safely, with the electrical half left to real hardware.',
          answer: 'Virtual Hardware Lab',
          explanation:
            'The platform’s Virtual Hardware Lab (simulated arduino-uno-r3, esp32-devkit-v1, raspberry-pi-4b, raspberry-pi-pico) hosts the software practice; bounce, stall currents and grounding exist only on physical hardware — the two halves complement.',
          hint: 'It was named in the deep dive of this lesson.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Switch bounce', definition: 'Mechanical contact vibration producing edge clusters for ms-class after each transition.' },
      { term: 'Debounce window', definition: 'Stability period (20-50 ms class) a signal must hold before its state change is accepted.' },
      { term: 'Voltage divider (sensor)', definition: 'Sensor resistance + fixed resistor producing an ADC-readable level; choose orientation deliberately.' },
      { term: 'Servo frame', definition: '~50 Hz timing pattern: 1-2 ms pulse in 20 ms; pulse width = position (verify per servo).' },
      { term: 'Stall current', definition: 'A motor\'s current when prevented from turning — the worst-case number power design must survive.' },
    ],
    revisionSummary: [
      'Button: INPUT_PULLUP, active-low, debounce window 20-50 ms class, millis()/sampler pattern.',
      'LDR: divider orientation is a design choice; scaling chain counts -> volts -> units; raw plus units printed.',
      'Servo: dedicated amp-class supply, common ground, GPIO signal only; 50 Hz/1-2 ms convention (verify per servo).',
      'UART: parseable lines, raw plus units, rate within the bits/baud budget.',
      'Virtual Hardware Lab for safe software practice; electrical verification belongs to real hardware with datasheets open.',
    ],
    furtherReading: [
      { label: 'Arduino documentation', url: 'https://docs.arduino.cc/', kind: 'docs' },
      { label: 'All About Circuits — textbook', url: 'https://www.allaboutcircuits.com/textbook/', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
];
