import type { TutorialLesson } from '../types';

export const module04Lessons: TutorialLesson[] = [
  {
    id: 'embc-m04-l1',
    title: 'Digital Outputs: Driving Pins and LEDs',
    summary:
      'Configure pins as outputs, drive them through an output data register, choose active-high versus active-low wiring, and respect the electrical limits of a pin.',
    objectives: [
      'Configure a pin\'s direction and drive it high or low through mock direction and output registers.',
      'Distinguish active-high from active-low outputs and wire/LED logic accordingly.',
      'Calculate a current-limiting resistor for an LED from supply, forward voltage and target current.',
      'State the per-pin and total current limits of a typical MCU and why loads like motors and relays need drivers.',
    ],
    whyItMatters:
      'Blinking an LED is embedded programming\'s "hello world" — but doing it correctly requires direction registers, masks, RMW discipline and basic electronics all at once. Master this and every other peripheral is just a bigger register map.',
    prerequisites: ['embc-m03-l1', 'embc-m03-l2'],
    explanation:
      'A GPIO (general-purpose input/output) pin is a software-controlled switch to the outside world. As an **output**, firmware chooses whether the pin drives a high voltage (logic 1, near the supply rail) or a low voltage (logic 0, near ground). Two registers do the work: a **direction/mode register** that selects output vs input per pin, and an **output data register (ODR)** that holds the level for each pin.\n\n### The configuration dance\n\nDriving a pin follows a fixed sequence, and the order matters: (1) enable the pin\'s peripheral clock if your MCU family gates them (a real STM32 requirement — an unclocked peripheral silently ignores every write); (2) configure the direction register so the chosen bit is an output; (3) write the level. On our mock this is `MOCK_GPIOA_MODER &= ~(1u << 3);` (bit 3 = output) followed by `MOCK_GPIOA_ODR |= (1u << 3);` (drive high). Every register operation is the mask toolkit from module 03 — GPIO is where it starts paying rent.\n\n### Active-high versus active-low\n\nAn **active-high** LED circuit lights when the pin drives 1. An **active-low** circuit is wired from the supply rail into the pin and lights when the pin drives 0 — common because many MCUs sink current better than they source it, and because a reset pin defaulting to inputs leaves the LED *off* rather than stuck on. Firmware expresses this as a polarity convention: `led_on()` writes the *asserted* level (1 for active-high, 0 for active-low), hiding the wiring inside one function.\n\n### Electrical limits: pins are not power supplies\n\nA typical MCU pin is rated for roughly 20-25 mA absolute maximum, with a chip-wide budget of perhaps 100-150 mA — and "absolute maximum" means the point where damage begins, not a design target. An indicator LED wants 5-20 mA, so a **series resistor** is mandatory: without it, the pin, the LED or both cook. Anything beyond small LEDs — motors, relays, buzzers with coils, light strips — must be driven through a transistor or driver chip supplied from a separate power rail, never straight from the pin. Module 12 covers those driver circuits in depth.',
    deepDive:
      '### The resistor calculation, worked\n\nAn LED is a diode: its forward voltage Vf (about 2.0 V for red, 3.0 V for blue) is roughly fixed once conducting, so the resistor must absorb the remainder and set the current: **R = (Vsupply − Vf) / I**. A red LED on a 5 V rail at 15 mA: R = (5.0 − 2.0) / 0.015 = 200 ohm — the classic value. A blue LED on 3.3 V at 5 mA: R = (3.3 − 3.0) / 0.005 = 60 ohm. Note how small that second resistor is: blue/white LEDs on a 3.3 V rail have almost no headroom, so tiny supply wobbles change brightness a lot — a practical reason to prefer red/green indicators on 3.3 V boards or to use larger currents deliberately.\n\n### Atomic output updates: the BSRR idea\n\nLesson 03-2 showed the RMW race on a shared register. Many vendors answer with an **atomic set/reset register** (STM32\'s BSRR is the archetype): writing a 1 in the lower half sets those pins, writing a 1 in the upper half clears them, in one store with no read. On real hardware this eliminates the lost-update problem when an interrupt and main code both drive pins. Our mock models the classic ODR for teaching the RMW mechanics; in production code on such a family you would use the set/reset register for shared outputs.\n\n### Reading the electrical page of a data sheet\n\nThe "electrical characteristics" section lists per-pin source/sink current, total current, and pin voltage limits relative to the supply (never exceed VDD + 0.3 V on most families). Two practical rules follow: bank pins into an LED bar and you may exhaust the *port* budget before any single pin exceeds its own limit; and driving a pin above its rail through an external pull-up to 5 V on a 3.3 V-only part violates the voltage limit even though the current is tiny.',
    examples: [
      {
        title: 'Blinking an LED through mock direction and output registers',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of a GPIO block for an MCU. Real firmware uses the\n * vendor header (e.g. stm32f1xx.h GPIOA / ATmega328P PORTB); addresses,\n * widths and extra config fields come from that chip\'s reference manual. */\nstatic volatile uint8_t MOCK_GPIOA_MODER = 0x00u; /* 0=output 1=input per pin */\nstatic volatile uint8_t MOCK_GPIOA_ODR   = 0x00u; /* output levels           */\n\n#define LED_PIN 3u\n\nstatic void led_init(void) {\n    /* Pin as output: clear the direction bit (mock convention: 0 = out). */\n    MOCK_GPIOA_MODER &= (uint8_t)~(1u << LED_PIN);\n    MOCK_GPIOA_ODR   &= (uint8_t)~(1u << LED_PIN); /* start OFF */\n}\n\nstatic void led_write(uint8_t on) {\n    if (on) {\n        MOCK_GPIOA_ODR |= (uint8_t)(1u << LED_PIN);   /* set   */\n    } else {\n        MOCK_GPIOA_ODR &= (uint8_t)~(1u << LED_PIN);  /* clear */\n    }\n}\n\nint main(void) {\n    led_init();\n    printf("init: MODER=0x%02X ODR=0x%02X\\n",\n           (unsigned)MOCK_GPIOA_MODER, (unsigned)MOCK_GPIOA_ODR);\n\n    for (int i = 0; i < 4; i++) {\n        led_write((uint8_t)(i & 1u));  /* 0,1,0,1 */\n        printf("blink %d: LED %s (ODR=0x%02X)\\n", i,\n               ((MOCK_GPIOA_ODR & (1u << LED_PIN)) != 0u) ? "ON " : "OFF",\n               (unsigned)MOCK_GPIOA_ODR);\n    }\n    return 0;\n}',
        explanation: [
          '`led_init` clears the direction bit (output) and the output latch (off) — configuration before use, always.',
          'The loop drives levels 0,1,0,1 by masking `i & 1`, a compact way to alternate.',
          'Trace: blink 0 → OFF (ODR=0x00); blink 1 → ON (ODR=0x08); blink 2 → OFF; blink 3 → ON (ODR=0x08).',
          'Exact output: `init: MODER=0x00 ODR=0x00` then `blink 0: LED OFF (ODR=0x00)`, `blink 1: LED ON  (ODR=0x08)`, `blink 2: LED OFF (ODR=0x00)`, `blink 3: LED ON  (ODR=0x08)`.',
          'Note the polarity is hidden inside led_write: swapping to an active-low LED means inverting the two lines in one place, not touching main.',
        ],
      },
      {
        title: 'Active-low output and the atomic set/reset mock',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Mock of an STM32-style atomic set/reset register (BSRR concept):\n * writing a 1 in the low half SETS those pins, a 1 in the high half\n * CLEARS them - one store, no read-modify-write. */\nstatic volatile uint16_t MOCK_GPIOA_BSRR = 0x0000u;\nstatic volatile uint8_t  MOCK_GPIOA_ODR  = 0x00u; /* resulting pin levels */\n\nstatic void mock_commit_bsrr(void) {\n    /* Hardware semantics: apply set bits, then reset bits, atomically. */\n    MOCK_GPIOA_ODR = (uint8_t)((MOCK_GPIOA_ODR | (MOCK_GPIOA_BSRR & 0xFFu))\n                               & (uint8_t)~(uint8_t)(MOCK_GPIOA_BSRR >> 8));\n    MOCK_GPIOA_BSRR = 0x0000u;\n}\n\nint main(void) {\n    /* Active-low LED on pin 2: ON means drive the pin LOW (clear it). */\n    MOCK_GPIOA_BSRR = (uint16_t)(1u << (2u + 8u)); /* reset half: pin2 low */\n    mock_commit_bsrr();\n    printf("LED ON  : pin2=%u\\n", (unsigned)((MOCK_GPIOA_ODR >> 2) & 1u));\n\n    MOCK_GPIOA_BSRR = (uint16_t)(1u << 2);         /* set half: pin2 high  */\n    mock_commit_bsrr();\n    printf("LED OFF : pin2=%u\\n", (unsigned)((MOCK_GPIOA_ODR >> 2) & 1u));\n    return 0;\n}',
        explanation: [
          'The BSRR mock takes a single 16-bit store: low byte sets pins, high byte clears them — the real register\'s semantics, simplified to one port.',
          '`mock_commit_bsrr` models what the hardware does on the write: OR in the set bits, AND out the reset bits, atomically from software\'s view.',
          'First action: reset bit 2 (pin low). For the active-low LED that means ON. Prints `LED ON  : pin2=0`.',
          'Second action: set bit 2 (pin high) → LED OFF. Prints `LED OFF : pin2=1`.',
          'No read of ODR by the driver code, so no RMW race: this is the production pattern for shared outputs on families that offer it.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Active-high and active-low LED wiring',
        content:
          ' ACTIVE-HIGH (pin sources current)     ACTIVE-LOW (pin sinks current)\n\n   VDD (5V/3.3V)                          VDD (5V/3.3V)\n      |                                      |\n     [R] 220 ohm                            [R] 220 ohm\n      |                                      |\n      |+ LED                                 +-----|<|---- MCU pin (drives 0 = ON)\n      |  Vf                                  |     LED\n   MCU pin (drives 1 = ON)                   (pin low: current flows\n      |                                       VDD -> R -> LED -> pin -> GND)\n     GND\n\n   Pin 1 -> LED lights                    Pin 0 -> LED lights',
        caption:
          'Educational schematic sketches. Either way the series resistor sets the current; polarity decides which pin level means "on".',
      },
    ],
    tables: [
      {
        caption: 'LED series resistor examples, R = (Vsupply − Vf) / I',
        headers: ['Supply', 'LED colour (Vf)', 'Target current', 'Resistor'],
        rows: [
          ['5.0 V', 'red (2.0 V)', '15 mA', '(5.0-2.0)/0.015 = 200 ohm'],
          ['3.3 V', 'red (2.0 V)', '10 mA', '(3.3-2.0)/0.010 = 130 ohm'],
          ['3.3 V', 'blue (3.0 V)', '5 mA', '(3.3-3.0)/0.005 = 60 ohm (little headroom)'],
          ['5.0 V', 'green (2.2 V)', '10 mA', '(5.0-2.2)/0.010 = 280 ohm'],
        ],
      },
      {
        caption: 'What a pin can and cannot drive',
        headers: ['Load', 'Direct from pin?', 'Why / what instead'],
        rows: [
          ['Indicator LED (5-15 mA)', 'Yes, with series resistor', 'Within per-pin current limit'],
          ['LED strip / high-brightness', 'No', 'Transistor or LED driver from supply rail'],
          ['Relay coil', 'No', 'Transistor driver + flyback diode (module 12)'],
          ['DC motor', 'No', 'H-bridge driver chip; pins only carry logic signals'],
          ['Buzzer (passive, coil)', 'Check datasheet', 'Small piezos often OK; coil types need a driver'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Connecting an LED without a series resistor "just for a second".',
        fix:
          'Without the resistor current is limited only by the pin\'s transistors and the LED — enough to damage either instantly. Always size R = (Vs − Vf)/I first.',
      },
      {
        mistake: 'Writing the ODR bit before configuring the direction register.',
        fix:
          'On real families the direction/config write must precede driving the pin (and the peripheral clock must be enabled first on clock-gated families). Follow config-then-drive; the mock enforces nothing, real silicon punishes the order.',
      },
      {
        mistake: 'Inverting polarity late: code full of scattered 1s/0s for an active-low LED.',
        fix:
          'Wrap polarity in one function (led_write(on)) or a macro; the rest of the code speaks in logical on/off. Retrofitting polarity across scattered ODR writes is where active-low bugs are born.',
      },
    ],
    guidedPractice: {
      title: 'Configure and blink, then polarise',
      brief:
        'Using the mock registers: (1) configure pin 5 as output and blink it three times (on-off-on), printing ODR after each write; (2) then state which single function you would change for an active-low LED on the same pin and what the ON level becomes.',
      expectedBehavior:
        'MODER bit5 cleared; ODR sequence: 0x20 (on), 0x00 (off), 0x20 (on). For active-low, led_write inverts: ON drives the pin low (ODR bit5 = 0), OFF drives high.',
      hints: [
        'Pin 5 mask = 1u << 5 = 0x20.',
        'Keep main() calling led_write(on) with logical values; polarity lives in one function.',
      ],
    },
    practiceExercises: [
      {
        title: 'Resistor sizing drill',
        brief:
          'Size the series resistor: (a) amber LED Vf 2.1 V on 5 V at 10 mA; (b) red LED on 3.3 V at 5 mA; (c) state what happens with no resistor at all.',
        expectedBehavior:
          '(a) (5.0-2.1)/0.010 = 290 ohm. (b) (3.3-2.0)/0.005 = 260 ohm. (c) Current is bounded only by pin transistor characteristics and the LED; it exceeds ratings and can destroy the pin or LED.',
        hints: [
          'R = (Vs − Vf)/I, with I in amperes.',
          'Convert mA to A: 10 mA = 0.010 A.',
        ],
      },
      {
        title: 'Two LEDs, one register',
        brief:
          'Using the ODR mock, write a function that turns LED A (pin 1) on and LED B (pin 4) off in ONE assignment, starting from an unknown ODR state. Show the C and explain why a single assignment (rather than two RMW helpers) has no intermediate state.',
        expectedBehavior:
          'Something like: `MOCK_GPIOA_ODR = (uint8_t)((MOCK_GPIOA_ODR | 0x02u) & (uint8_t)~0x10u);` — a composed read-modify-write in one C statement. One assignment means the register transitions directly from old to new value with no window where A is on and B has not yet been handled (though it is still an RMW — the atomic alternative is the BSRR-style register from the example).',
        hints: [
          'Combine set mask 0x02 and clear mask ~0x10 into one expression.',
          'Distinguish "one C statement" from "atomic on the bus" — the BSRR mock shows the truly atomic form.',
        ],
      },
    ],
    assessment: {
      title: 'GPIO outputs checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A red LED (Vf = 2.0 V) on a 5 V rail at 15 mA needs which series resistor?',
          options: ['200 ohm', '33 ohm', '500 ohm', 'None'],
          answer: '200 ohm',
          explanation: 'R = (5.0 − 2.0) / 0.015 = 3.0 / 0.015 = 200 ohm.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'An active-low LED lights when the pin drives:',
          options: ['0 (low)', '1 (high)', 'high-impedance', 'either'],
          answer: '0 (low)',
          explanation:
            'Active-low wiring runs from the rail through the LED into the pin; sinking current (pin low) completes the circuit.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A small DC motor can be driven directly from a GPIO pin if you only need low speed.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'Motors draw far more than a pin\'s 20-ish mA limit and generate back-EMF; they need a driver stage (transistor or H-bridge) from a separate supply.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'Starting ODR = 0x00, what does this print?',
          code: 'MOCK_GPIOA_ODR |= (uint8_t)(1u << 3);\nMOCK_GPIOA_ODR &= (uint8_t)~(1u << 0);\nMOCK_GPIOA_ODR |= (uint8_t)(1u << 1);\nprintf("0x%02X\\n", (unsigned)MOCK_GPIOA_ODR);',
          options: ['0x0A', '0x0B', '0x09', '0x03'],
          answer: '0x0A',
          explanation:
            'Set bit 3: 0x08. Clear bit 0 (already 0): 0x08. Set bit 1: 0x08 | 0x02 = 0x0A.',
          hint: 'Track the byte after each statement.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'On clock-gated MCU families such as STM32, which step must precede writing GPIO configuration registers, or the writes silently do nothing?',
          answer: 'enabling the GPIO peripheral clock (e.g. via the RCC register)',
          explanation:
            'The peripheral\'s interface clock must be enabled (RCC AHB/APB enable bits) before its registers respond.',
          hint: 'Think of the peripheral as power-gated until told otherwise.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'GPIO', definition: 'General-purpose input/output: a pin whose direction and level firmware controls through registers.' },
      { term: 'ODR (output data register)', definition: 'The register holding the driven level of each output pin.' },
      { term: 'Active-low', definition: 'A circuit where the asserted ("on") state is the low voltage level.' },
      { term: 'Current-limiting resistor', definition: 'The series resistor that sets LED current: R = (Vs − Vf) / I.' },
      { term: 'Set/reset register (BSRR-style)', definition: 'An atomic single-store register that sets or clears pins, avoiding read-modify-write races.' },
    ],
    revisionSummary: [
      'Sequence: enable clock (family-dependent) -> direction -> drive level.',
      'Direction and ODR are masks: &= ~pin for output/off, |= pin for on.',
      'Active-low means on = 0; hide polarity in one function.',
      'R = (Vs − Vf)/I; pins are rated ~20 mA each with a chip-wide budget.',
      'Motors, relays and strips need driver circuits — never direct pin drive.',
    ],
    furtherReading: [
      { label: 'Electronics Tutorials — Light emitting diodes', url: 'https://www.electronics-tutorials.ws/diode/diode_8.html', kind: 'article' },
      { label: 'Wikipedia — Series and parallel circuits', url: 'https://en.wikipedia.org/wiki/Series_and_parallel_circuits', kind: 'article' },
      { label: 'docs.arduino.cc — Digital pins / built-in LED basics', url: 'https://docs.arduino.cc/', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'embc-m04-l2',
    title: 'Digital Inputs and Pull-Up/Pull-Down Resistors',
    summary:
      'Read pin levels through an input register, understand why floating inputs are useless, and pick internal or external pull resistors for buttons and switches.',
    objectives: [
      'Read a pin\'s level through an input data register (IDR) with masks.',
      'Explain what a floating input reads and why pull resistors fix it.',
      'Choose pull-up versus pull-down (internal or external) for a button circuit.',
      'Wire and read an active-low push button with debounce-ready state in the mock.',
    ],
    whyItMatters:
      'Every human interface — buttons, switches, limit sensors, encoders — enters firmware as a digital input. The pull-resistor concept also explains I2C wiring and open-drain buses later in the course, so this is one of those lessons that pays off three times.',
    prerequisites: ['embc-m04-l1', 'embc-m03-l2'],
    explanation:
      'As an **input**, a pin does not drive anything: it senses whether the voltage at the pad is above or below the logic threshold and presents the result as a bit in the **input data register (IDR)**. Reading pin 2 is one masked read: `(MOCK_GPIOA_IDR >> 2) & 1u`.\n\n### The floating input problem\n\nWhat does an input read when *nothing* is connected? Nothing reliable. The pin is a tiny antenna; it drifts with mains hum, your hand, the moon. Such a **floating** input reads random 0s and 1s. The fix is a **pull resistor**: a large-value resistor (typically 10k-100k ohm, often built into the MCU as an "internal pull-up/down" you enable in the config register) that gently biases the pin to a known level while allowing a switch to overpower it.\n\n### Pull-up with a button to ground\n\nThe standard button circuit: one side of the button to the pin, other side to ground, **pull-up** enabled. Released, the pull-up wins and the pin reads 1. Pressed, the button shorts the pin to ground and it reads 0 (a few tenths of a milliamp flows through the pull-up — negligible). So the button is **active-low**: pressed = 0. Firmware reads `pressed = ((MOCK_GPIOA_IDR & BUTTON_MASK) == 0u);` — note the inverted logic, the number one cause of "my button works backwards" bugs.\n\n### When to use external resistors\n\nInternal pull-ups are convenient but weak and imprecise (tens of k ohm, varying chip to chip). Three situations demand external resistors: buses with real speed or length requirements (I2C specifies its pull-up values — module 09); long wires or noisy environments where a stronger (smaller-value) pull is needed; and level-shifting or rail choices the internal pull cannot reach (pulling to a voltage different from the MCU supply).',
    deepDive:
      '### Pull-down and active-high designs\n\nThe mirror-image circuit — button to VDD, pull-down on the pin — gives an **active-high** button (pressed = 1). Both work; the trade-offs are practical. Active-low is the more common convention in real products: it survives a broken wire as "pressed" rather than "stuck released"... actually more precisely, an open circuit reads the pull level (released), which is usually the safer failure; and many MCUs historically had stronger internal pull-ups. Choose a convention per product and document it in the driver header.\n\n### Input configuration details that bite\n\nOn real families, input pins have more knobs than "input": schmitt-trigger enable, filter settings, and on some parts analog function stealing the pad. Two behaviours worth knowing cold: (1) an input pin configured as output still damages things if externally driven against it — never fight another driver; (2) **unused pins** should not be left floating either — vendors recommend configuring unused pads as inputs with pull-ups (or outputs driving low) to reduce current draw and noise susceptibility. Both facts come straight from vendor application notes, and both are invisible in our mocks.\n\n### Reading inputs efficiently and correctly\n\nAn input read is a plain register read, but structure it well: read once into a local, extract the masked bit, and pass logical (active-normalised) values upward. That one-read discipline matters when you later add debouncing — the raw sample must be a single instant in time, not two reads of a changing pin. Module 04-l3 builds the debounce state machine on exactly this sample function.',
    examples: [
      {
        title: 'Reading an active-low button through a mock IDR',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of a GPIO input data register. Real firmware reads\n * the vendor\'s IDR (e.g. GPIOA->IDR on STM32, PINB on ATmega328P);\n * pull configuration bits live in the family\'s mode/pull registers. */\nstatic volatile uint8_t MOCK_GPIOA_IDR = 0x04u; /* pull-up holds pin2 high */\n\n#define BUTTON_PIN  2u\n#define BUTTON_MASK (uint8_t)(1u << BUTTON_PIN)\n\n/* Normalised read: returns 1 when pressed (active-low), 0 when released. */\nstatic uint8_t button_pressed(void) {\n    uint8_t raw = (uint8_t)(MOCK_GPIOA_IDR & BUTTON_MASK);\n    return (uint8_t)(raw == 0u);   /* pressed = pin driven LOW */\n}\n\nint main(void) {\n    /* The "world" changes the pin: released, pressed, released. */\n    const uint8_t samples[3] = { 0x04u, 0x00u, 0x04u };\n\n    for (int i = 0; i < 3; i++) {\n        MOCK_GPIOA_IDR = samples[i];\n        printf("IDR=0x%02X -> %s\\n", (unsigned)MOCK_GPIOA_IDR,\n               button_pressed() ? "PRESSED" : "released");\n    }\n    return 0;\n}',
        explanation: [
          'With a pull-up, the released pin reads 1 (0x04 has bit 2 set) and a pressed button grounds it to 0.',
          '`button_pressed` normalises polarity once: pressed means the masked bits are 0.',
          'Trace: IDR=0x04 → released; IDR=0x00 → PRESSED; IDR=0x04 → released.',
          'Exact output: `IDR=0x04 -> released` / `IDR=0x00 -> PRESSED` / `IDR=0x04 -> released`.',
          'The "world" writes the mock IDR only because this is a host simulation; on real hardware the pad voltage sets IDR and software never writes it.',
        ],
      },
      {
        title: 'Pull-resistor arithmetic: why the values work',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Host-side calculation of the two button states\' voltage divider.\n * Circuit: 3.3 V -- [50k internal pull-up] --+-- pin\n *                                            |\n *                                     [switch to GND]\n * (Switch closed = ~0 ohm to ground, pressed.) */\nint main(void) {\n    const float vdd = 3.3f;\n    const float r_pull = 50000.0f;  /* internal pull-up, ohms (typical) */\n\n    /* Released: no other path - pin sits at the pull-up rail. */\n    float v_released = vdd;\n\n    /* Pressed: divider of pull-up against ~10 ohm of switch/contact\n     * resistance; V_pin = Vdd * R_contact / (R_pull + R_contact). */\n    const float r_contact = 10.0f;\n    float v_pressed = vdd * r_contact / (r_pull + r_contact);\n\n    printf("released: %.2f V (logic 1)\\n", v_released);\n    printf("pressed : %.3f V (logic 0)\\n", v_pressed);\n    printf("pull-up current when pressed: %.0f uA\\n",\n           vdd / r_pull * 1e6f);\n    return 0;\n}',
        explanation: [
          'Released: the pull-up alone defines the node — full 3.3 V, a clean logic 1.',
          'Pressed: the switch forms a divider with the pull-up. v_pressed = 3.3 * 10 / 50010 ≈ 0.00066 V — deep inside the logic-0 range.',
          'Exact output: `released: 3.30 V (logic 1)` / `pressed : 0.001 V (logic 0)` / `pull-up current when pressed: 66 uA`.',
          '66 microamps is why the button does not "load" anything: the pull-up is weak by design, just strong enough to hold the pin against leakage and noise.',
          'The same divider math explains I2C pull-up sizing in module 09 — there the resistor must also charge the bus capacitance fast enough for the clock rate.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Button with internal pull-up (active-low)',
        content:
          '            MCU\n          +------------------+\n   VDD ---| internal pull-up |\n          |                  |\n          |             pin2 +----+---- button ---- GND\n          |                  |    |\n          |             IDR bit2  (reads 1 released, 0 pressed)\n          +------------------+\n\n  released:  pull-up wins          IDR bit2 = 1\n  pressed :  switch shorts to GND  IDR bit2 = 0   (active-low!)',
        caption:
          'The internal pull-up (enabled via the family\'s config register) biases the pin; the button only ever pulls it down. Firmware inverts the sense once, in one place.',
      },
    ],
    tables: [
      {
        caption: 'Pull configuration choices',
        headers: ['Scenario', 'Choice', 'Reason'],
        rows: [
          ['Button to ground, short traces', 'Internal pull-up', 'Zero extra parts; ~10-50k is fine'],
          ['Button to ground, long/noisy wires', 'External 4.7k-10k pull-up', 'Stronger bias resists coupled noise'],
          ['Button to VDD (active-high)', 'Pull-down (internal or external)', 'Mirror of the pull-up circuit'],
          ['I2C bus lines', 'External pull-ups (per spec calc)', 'Speed and capacitance need defined values'],
          ['Unused pins', 'Input + internal pull-up (or output low)', 'Avoids floating noise and leakage current'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reading a button with no pull resistor at all.',
        fix:
          'The pin floats and reads random noise. Always enable a pull (or wire an external one); the released state must be an electrically *defined* level.',
      },
      {
        mistake: 'Getting active-low backwards: treating 1 as pressed.',
        fix:
          'Normalise in one function: `pressed = (raw == 0)` for pull-up-to-ground wiring. If the button seems inverted, check the wiring and this line before anything else.',
      },
      {
        mistake: 'Sampling the pin twice in one decision (reading IDR for the level and again for edge detection).',
        fix:
          'The pin can change between reads. Sample once into a local, then do all logic on the sample — this also makes the debounce state machine in lesson 3 correct.',
      },
    ],
    guidedPractice: {
      title: 'Wire it and read it on paper',
      brief:
        'A switch connects pin 4 to ground with an internal pull-up. (a) What does IDR bit 4 read when released and when pressed? (b) Write the one-line normalised read. (c) The pull-up is 40k on a 3.3 V rail: compute the current through it while the button is held pressed.',
      expectedBehavior:
        '(a) released = 1, pressed = 0. (b) `pressed = ((MOCK_GPIOA_IDR & (1u<<4)) == 0u);` (c) I = 3.3 / 40000 = 82.5 uA.',
      hints: [
        'Pull-up defines the released state; the switch defines the pressed state.',
        'Ohm\'s law with the full rail voltage across the pull-up when pressed.',
      ],
    },
    practiceExercises: [
      {
        title: 'Active-high variant',
        brief:
          'Redesign for an active-high button: state which terminal goes where and what the pull becomes, then write the normalised read line. In which single place did the polarity change?',
        expectedBehavior:
          'Button connects pin to VDD; the pin needs a pull-down (internal or external). Read: `pressed = ((MOCK_GPIOA_IDR & (1u<<4)) != 0u);`. Only the comparison in the normalisation function changed — the design goal of hiding polarity in one place.',
        hints: [
          'The pin must be defined when the button is open — that defines the pull direction.',
          'Pressed now drives the pin high instead of low.',
        ],
      },
      {
        title: 'Diagnose a floating input',
        brief:
          'A teammate\'s button works only when they touch the board. State the most likely circuit defect, the fix, and which register bit (conceptually) they forgot to configure.',
        expectedBehavior:
          'The input is floating — no pull resistor — so body capacitance and mains hum dominate the reading, and touching the board biases it. Fix: enable the internal pull-up (or add an external one). The forgotten configuration is the pull-up/pull-down selection bits in the pin\'s mode/pull config registers.',
        hints: [
          '"Works when I touch it" is the classic floating-input symptom.',
          'The fix is a configuration bit, not a code rewrite.',
        ],
      },
    ],
    assessment: {
      title: 'Digital inputs checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'An input pin with nothing connected and no pull enabled will read:',
          options: [
            'Unpredictably — it floats and picks up noise',
            'Steadily 0',
            'Steadily 1',
            'Exactly VDD/2',
          ],
          answer: 'Unpredictably — it floats and picks up noise',
          explanation:
            'A floating input has no defined level; leakage and coupled noise move it around the logic threshold.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Standard button-to-ground circuit with pull-up: the pin reads 0 when the button is...',
          options: ['pressed', 'released', 'never', 'only half-pressed'],
          answer: 'pressed',
          explanation:
            'Pressing shorts the pin to ground, overwhelming the pull-up — that is what makes the button active-low.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A 50k internal pull-up with a pressed button draws roughly 66 microamps from a 3.3 V rail.',
          options: ['true', 'false'],
          answer: 'true',
          explanation: 'I = V/R = 3.3 / 50000 = 66 uA — negligible, which is the point of a weak pull.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does button_pressed() return for each sample?',
          code: '/* active-low button on bit 2 */\n#define BUTTON_MASK (uint8_t)(1u << 2)\nstatic uint8_t button_pressed(void) {\n    return (uint8_t)((MOCK_GPIOA_IDR & BUTTON_MASK) == 0u);\n}\n/* MOCK_GPIOA_IDR takes values 0x00, 0xFF, 0x04 */',
          options: ['1, 0, 0', '0, 1, 1', '1, 1, 0', '0, 0, 1'],
          answer: '1, 0, 0',
          explanation:
            '0x00: bit2=0 → pressed (1). 0xFF: bit2=1 → released (0). 0x04: bit2=1 → released (0).',
          hint: 'Pressed means the masked bit is 0.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name two situations where an external pull resistor is required instead of the internal one.',
          answer: 'I2C/fast buses (speed/capacitance) and long or noisy lines needing a stronger pull; also pulling to a different rail than the MCU supply',
          explanation:
            'Internal pulls are weak and imprecise, tied to the MCU rail; buses, harsh environments and level-shifting need external components sized for the job.',
          hint: 'Think about speed, noise, and voltage rails.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'IDR (input data register)', definition: 'The register whose bits mirror the sensed level on each input pin.' },
      { term: 'Floating input', definition: 'An input with no defined bias; its reading is noise, not signal.' },
      { term: 'Pull-up / pull-down', definition: 'A weak resistor (internal or external) biasing an input to 1 or 0 when nothing else drives it.' },
      { term: 'Active-low button', definition: 'The standard pull-up + switch-to-ground circuit: pressed reads 0.' },
    ],
    revisionSummary: [
      'Input = masked read of IDR; sample once per decision.',
      'No pull = no signal: pull-ups/downs define the released state.',
      'Pull-up + button to ground = active-low (pressed = 0).',
      'I = V/R through the pull when pressed — microamps, by design.',
      'External pulls for speed, noise or different rails; internal pulls for simple buttons.',
    ],
    furtherReading: [
      { label: 'Electronics Tutorials — Pull-up and pull-down resistors', url: 'https://www.electronics-tutorials.ws/logic/pull-up-and-pull-down-resistors.html', kind: 'article' },
      { label: 'Wikipedia — Switch (contact bounce and input circuits)', url: 'https://en.wikipedia.org/wiki/Switch', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'embc-m04-l3',
    title: 'Debouncing and Input Design Patterns',
    summary:
      'See why mechanical contacts bounce, then build the two standard software debouncers — consecutive-sample counter and integrator — plus a clean edge-detection layer.',
    objectives: [
      'Explain contact bounce and why firmware must filter it.',
      'Implement a consecutive-sample debounce state machine on a mock IDR.',
      'Implement an integrator-style debouncer and compare the trade-offs.',
      'Add edge detection (pressed vs released events) on top of debounced state.',
    ],
    whyItMatters:
      'An unaudited "pressed" event firing five times per click will restart your device, double-order a coffee or eject a payload. Debouncing is the first firmware state machine most engineers write, and it teaches a pattern — filter the world, then emit clean events — reused by every sensor interface that follows.',
    prerequisites: ['embc-m04-l2'],
    explanation:
      'Mechanical switches do not close cleanly. The contacts spring apart microscopically for 1-20 milliseconds, producing a burst of transitions before settling. Firmware sampling the pin during that burst sees several press-release events — **bounce**. The cure is nearly always software: sample the pin at a fixed rate and only accept a state change after it has held steady.\n\n### Debouncer 1: consecutive samples\n\nThe classic: require N consecutive samples equal to the *opposite* of the current debounced state before switching. One disagreeing sample resets the counter. With sampling at 5-10 ms intervals and N = 3-5, a bounce burst cannot hold a single level long enough to flip the state, while a real press (held hundreds of ms) flips it reliably. This is a tiny state machine: state = debounced level, counter = consecutive disagreement count.\n\n### Debouncer 2: integrator\n\nThe alternative keeps a saturating counter per button: increment while the raw sample disagrees with the debounced state, decrement (or reset) while it agrees, and switch when the counter hits a threshold. It tolerates one noisy sample mid-press without losing progress on slow interfaces, at the cost of slightly more state. Both patterns are everywhere; consecutive-samples is easier to trace, integrator is more forgiving of sporadic glitches.\n\n### Events, not levels\n\nApplications rarely want "state of the button"; they want "the moment it was pressed". So the input layer has three stages: **sample** (raw IDR read), **debounce** (stable state), **edge detect** (compare debounced state with previous — emit PRESSED on 1→0 for active-low, RELEASED on 0→1). Keeping the stages separate makes each testable on a host — the same habit the testing module exploits.',
    deepDive:
      '### Choosing the sampling rate and N\n\nSampling at 1 kHz with N = 3 gives ~3 ms of required stability — too fast for a poor switch. Sampling at 100 Hz (every 10 ms) with N = 4 gives ~40 ms — sluggish but bulletproof for a finger press. Human presses last 80-300 ms, so a debounce window of 10-50 ms is the usual design point: fast enough to feel instant, slow enough to swallow the burst. Bounce duration is a property of the *switch* (its size, spring, cleanliness), not the MCU — read the switch datasheet when the window matters.\n\n### Hardware alternatives, honestly\n\nAn RC filter (resistor + capacitor on the pin) or a dedicated latch/SR circuit can debounce in hardware. They cost parts and board area; software debouncing costs a few bytes and a periodic sample — which you usually already have (a timer tick from module 05). That is why firmware debouncing dominates in products. One honest caveat: a software debouncer cannot fix bounce on a line that also feeds a hardware interrupt directly — the interrupt fires during the burst regardless, so interrupt-driven inputs combine with either RC filtering or careful edge configuration, covered in the interrupt module.\n\n### The pattern generalises\n\nSample → filter → edge-detect is the universal input pipeline: the same three stages debounce encoders, filter ADC thresholds (module 10), and gate alarm inputs. Build it once as a small module — `input_sample()`, `input_debounce_step()`, `input_event()` — and every future input is configuration, not new code.',
    examples: [
      {
        title: 'Consecutive-sample debouncer with edge events, fully traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of a GPIO input register (active-low button, bit 2). */\nstatic volatile uint8_t MOCK_GPIOA_IDR = 0x04u;\n\n#define BUTTON_MASK (uint8_t)(1u << 2)\n#define STABLE_N    3u   /* consecutive agreeing samples to accept a change */\n\nstatic uint8_t debounced  = 0u; /* debounced PRESSED flag: 0 = not pressed */\nstatic uint8_t run_length = 0u; /* consecutive disagreeing samples */\n\n/* Call at a fixed tick (e.g. every 10 ms). Returns 1 on a press edge. */\nstatic uint8_t debounce_step(void) {\n    uint8_t raw = (uint8_t)(((MOCK_GPIOA_IDR & BUTTON_MASK) == 0u) ? 1u : 0u);\n    /* raw is normalised: 1 = pressed */\n    uint8_t edge = 0u;\n\n    if (raw == debounced) {\n        run_length = 0u;\n    } else {\n        run_length++;\n        if (run_length >= STABLE_N) {\n            debounced  = raw;\n            run_length = 0u;\n            edge = raw;    /* press edge when raw == 1 */\n        }\n    }\n    return edge;\n}\n\nint main(void) {\n    /* Sample sequence: idle, bounce burst, stable press. */\n    const uint8_t idr_samples[8] = {\n        0x04u, 0x04u,              /* released, released            */\n        0x00u, 0x04u, 0x00u,       /* bounce: low, high, low        */\n        0x00u, 0x00u, 0x00u        /* stable pressed                */\n    };\n\n    for (int i = 0; i < 8; i++) {\n        MOCK_GPIOA_IDR = idr_samples[i];\n        if (debounce_step() != 0u) {\n            printf("tick %d: PRESS event\\n", i);\n        }\n    }\n    return 0;\n}',
        explanation: [
          'Raw samples are normalised to pressed=1: 0x00 → 1, 0x04 → 0. `debounced` stores the same normalised flag, starting at 0 (not pressed).',
          'Trace (i, raw, effect): i0 raw0 agree → run 0; i1 raw0 agree → run 0; i2 raw1 disagree → run 1; i3 raw0 agree → run 0; i4 raw1 → run 1; i5 raw1 → run 2; i6 raw1 → run 3 = STABLE_N → debounced flips to 1, PRESS edge; i7 raw1 agree → run 0.',
          'Exact output: a single line `tick 6: PRESS event`. The bounce burst (ticks 2-4) never reached three consecutive agreeing samples, so it produced no edge.',
          'The debounced state after the sequence is pressed=1, and one clean event was emitted — exactly the contract an application layer wants.',
        ],
      },
      {
        title: 'Integrator debouncer (saturating counter)',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nstatic volatile uint8_t MOCK_GPIOA_IDR = 0x04u;\n#define BUTTON_MASK (uint8_t)(1u << 2)\n#define INTEG_MAX   5u\n\nstatic uint8_t debounced = 0u;   /* debounced PRESSED flag: 1 = pressed */\nstatic uint8_t integ     = 0u;   /* saturating counter */\n\nstatic void debounce_integrator_step(void) {\n    uint8_t raw = (uint8_t)(((MOCK_GPIOA_IDR & BUTTON_MASK) == 0u) ? 1u : 0u);\n\n    if (raw != debounced) {\n        if (integ < INTEG_MAX) {\n            integ++;\n        }\n        if (integ >= INTEG_MAX) {\n            debounced = raw;   /* switch after sustained disagreement */\n            integ = 0u;\n        }\n    } else {\n        integ = 0u;            /* agreement resets the counter */\n    }\n}\n\nint main(void) {\n    /* Same bounce pattern as before: 2 idle, 3 bounce, 3 pressed. */\n    const uint8_t idr_samples[8] = {\n        0x04u, 0x04u, 0x00u, 0x04u, 0x00u, 0x00u, 0x00u, 0x00u\n    };\n    for (int i = 0; i < 8; i++) {\n        MOCK_GPIOA_IDR = idr_samples[i];\n        debounce_integrator_step();\n        printf("tick %d: integ=%u state=%s\\n", i, (unsigned)integ,\n               debounced ? "pressed" : "released");\n    }\n    return 0;\n}',
        explanation: [
          'The integrator counts disagreement up toward INTEG_MAX; any agreeing sample zeroes it. `debounced` is the pressed flag starting at 0.',
          'Trace: ticks 0-1 raw 0 agrees with state 0 → integ stays 0. Tick 2: raw 1 disagrees → integ 1. Tick 3: raw 0 agrees → integ 0. Tick 4: raw 1 → integ 1. Tick 5: → 2. Tick 6: → 3. Tick 7: → 4 — still below INTEG_MAX 5, so no switch yet.',
          'Exact output lines: `tick 0: integ=0 state=released` / `tick 1: integ=0 state=released` / `tick 2: integ=1 state=released` / `tick 3: integ=0 state=released` / `tick 4: integ=1 state=released` / `tick 5: integ=2 state=released` / `tick 6: integ=3 state=released` / `tick 7: integ=4 state=released`.',
          'The press has not been accepted after 8 ticks because the bounce kept resetting the counter and INTEG_MAX is 5 — a deliberate contrast with debouncer 1 (threshold 3). Smaller INTEG_MAX or fewer bounces switches sooner.',
          'Design takeaway: the integrator is *stricter about interruptions* here because agreeing samples reset progress; the consecutive-sample counter behaves identically in this trace. Their difference shows up with sporadic noise, not clean bounce.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Contact bounce versus debounced state',
        content:
          '  pin voltage\n  (idle high)  1 ----+ +-+ +---+ +------+-------------------\n                | | | |   | |      |\n                0 +-+-+ +---+-+    press (held low)\n                 <---- bounce ~5 ms ---->\n\n  sample every 10 ms:    t0   t1   t2   t3   t4   t5   t6   t7\n  raw (pressed=1):        0    0    1    0    1    1    1    1\n  debounced (N=3):        0    0    0    0    0    0    0    1\n                                                   ^^^^^ PRESS edge\n                                                        (after 3 stable)',
        caption:
          'Educational waveform (illustrative). The contact chatters for a few milliseconds; the debouncer accepts the change only after consecutive stable samples, emitting one clean press edge.',
      },
    ],
    tables: [
      {
        caption: 'Debouncer trade-offs',
        headers: ['Approach', 'State per button', 'Behaviour on sporadic glitch', 'Typical use'],
        rows: [
          ['Consecutive samples', '1 state bit + 1 counter', 'Glitch resets the run — no false flip', 'Buttons, limit switches'],
          ['Integrator (saturating counter)', '1 state bit + 1 counter', 'Glitch costs one decrement, progress survives (design-dependent)', 'Noisy industrial inputs'],
          ['RC filter + plain read', '0 (hardware)', 'Handles bounce in hardware; needs parts', 'Interrupt-fed inputs'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Debouncing with a blocking delay inside the button read (`wait 20 ms then read again`).',
        fix:
          'Blocking delays freeze everything else in the superloop. Debounce against a periodic tick instead — the patterns here are called once per tick and never block. Module 05 supplies the tick.',
      },
      {
        mistake: 'Debouncing the *event* instead of the *state*: printing "pressed" on every stable sample.',
        fix:
          'The debouncer maintains state; the edge detector compares state to previous and emits an event exactly once per transition. Mixing the two floods the application with repeats.',
      },
      {
        mistake: 'Sampling too slowly to catch short presses.',
        fix:
          'A press shorter than one sample period can vanish. With 10 ms sampling, presses down to ~20 ms are reliably seen after debouncing; if the input is a fast encoder, it needs different handling (timer input capture, module 05), not a slower debounce.',
      },
    ],
    guidedPractice: {
      title: 'Trace the debouncer by hand',
      brief:
        'For the consecutive-sample debouncer (STABLE_N = 3, start released, active-low): given raw normalised samples 1,1,0,1,1,1 — write the debounced state and run_length after each sample, and state which tick emits the press edge.',
      expectedBehavior:
        'State encoding: pressed flag starts at 0 (released). raw 1: run 1, state 0. raw 1: run 2. raw 0: agrees with state 0 → run 0. raw 1: run 1. raw 1: run 2. raw 1: run 3 → state flips to 1 (pressed), edge at the 6th sample.',
      hints: [
        'Agreement zeroes the counter; disagreement increments it.',
        'The edge fires when the counter reaches N and the state actually flips.',
      ],
    },
    practiceExercises: [
      {
        title: 'Add release edges',
        brief:
          'Extend debounce_step to also report release edges (return 2 for release, 1 for press, 0 for none), and trace it on samples: pressed-stable (raw 1 x4) then raw 0 x3.',
        expectedBehavior:
          'After 3 pressed samples (edge 1 at the third), the three raw-0 samples produce a release edge (return 2) at the third of them. Events: 0,0,1,0,0,2 — one press, one release, no repeats.',
        hints: [
          'The edge value must distinguish directions: use the new raw value (1=press, 0=release) as the event code.',
          'Callers translate 1/2 into the application meaning.',
        ],
      },
      {
        title: 'Pick the design parameters',
        brief:
          'A product uses a 10 ms tick. Choose and justify: (a) STABLE_N for a snappy 30 ms debounce window; (b) the same for a rugged 50 ms window on a harsh factory floor; (c) one sentence on why you would not debounce an encoder\'s A/B quadrature lines this way.',
        expectedBehavior:
          '(a) N = 3 (3 x 10 ms = 30 ms). (b) N = 5 (50 ms). (c) Quadrature depends on counting *every* transition direction in order — a debouncer that deletes transitions destroys the count; encoders use timer encoder mode or dedicated decoding.',
        hints: [
          'Window = N x tick period.',
          'Debouncing removes transitions — ask what a quadrature signal IS.',
        ],
      },
    ],
    assessment: {
      title: 'Debouncing checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Contact bounce lasts typically:',
          options: ['1-20 milliseconds', '1-20 microseconds', '1-2 seconds', 'It does not occur'],
          answer: '1-20 milliseconds',
          explanation:
            'Mechanical contacts chatter for a few milliseconds — long enough to span many firmware samples, short enough that software filtering is cheap.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'With STABLE_N = 4, how many consecutive disagreeing samples must arrive before the debounced state changes?',
          options: ['4', '3', '1', '5'],
          answer: '4',
          explanation:
            'The counter must reach N; the Nth consecutive disagreeing sample flips the state and emits the edge.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A blocking 20 ms delay inside the button-reading function is the preferred debouncing technique.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'It stalls the entire loop. Debounce against a periodic tick — non-blocking by construction.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'Using the traced debouncer (STABLE_N = 3), how many PRESS events do the raw samples 1,0,1,0,1,1,1 produce?',
          code: '/* raw = normalised pressed level, one sample per tick */\n/* samples: 1,0,1,0,1,1,1 */',
          options: ['1', '3', '2', '0'],
          answer: '1',
          explanation:
            'Runs of disagreement: 1,1,1 (ticks 0-1 and 4-6 with resets between) — only the final run of three (ticks 4,5,6) reaches N=3, flipping state once: exactly one press edge.',
          hint: 'Count consecutive agreements with the *new* level, reset on any disagreement.',
          difficulty: 'hard',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the three stages of the standard input pipeline taught in this lesson.',
          answer: 'sample, debounce, edge detect',
          explanation:
            'Raw read once per tick, filter into a stable state, then compare with the previous state to emit clean pressed/released events.',
          hint: 'Each stage feeds the next; events come from the last.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Contact bounce', definition: 'The millisecond-scale burst of make/break transitions when mechanical contacts close or open.' },
      { term: 'Debouncer', definition: 'A state machine that accepts a level change only after it has held stable for N samples.' },
      { term: 'Edge detection', definition: 'Comparing the debounced state with its previous value to emit exactly one event per transition.' },
      { term: 'Integrator debouncer', definition: 'A saturating counter that requires sustained disagreement before switching state.' },
    ],
    revisionSummary: [
      'Bounce is real, millisecond-scale, and filtered in software against a periodic tick.',
      'Consecutive-sample debouncer: N agreeing samples flip the state; disagreement resets.',
      'Integrator variant trades a counter for glitch tolerance.',
      'Emit events from state transitions, never from raw samples.',
      'Sample → debounce → edge-detect generalises to every noisy digital input.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Switch (contact bounce)', url: 'https://en.wikipedia.org/wiki/Switch', kind: 'article' },
      { label: 'Electronics Tutorials — input/output interfacing', url: 'https://www.electronics-tutorials.ws/', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
