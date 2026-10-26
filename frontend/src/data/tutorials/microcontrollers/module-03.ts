import type { TutorialLesson } from '../types';

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'mcu-m03-l1',
    title: 'ESP32 Family Overview',
    summary:
      'The wireless workhorse: dual-core Xtensa LX6, Wi-Fi/Bluetooth integration, 3.3 V logic, rich peripherals — including the ADC\'s honest linearity caveats and what they mean for sensor work.',
    objectives: [
      'State the original ESP32\'s headline specs — dual-core LX6 to 240 MHz, ~520 KB SRAM, Wi-Fi/BT, 3.3 V — attributed to docs.espressif.com.',
      'Explain why integration (radio on-chip) reshapes product design versus bolt-on radio modules.',
      'Describe the ADC caveats honestly: nonlinearity, attenuation ranges, and the verify-in-datasheet discipline.',
      'Place the ESP32 against the AVR from Module 2: what it buys, what it costs (complexity, voltage, power).',
    ],
    whyItMatters:
      'The ESP32 is the default answer to "make it wireless" — and its convenience hides real engineering decisions: which framework, which ADC settings, which sleep mode. Knowing the family\'s true shape (including its ADC\'s documented imperfections) prevents the two classic mistakes: treating it as a bigger Uno, and trusting analog readings it cannot accurately deliver.',
    prerequisites: [
      'Family survey: ESP32 row (mcu-m01-l2)',
      'Logic voltage rules (mcu-m01-l3)',
      'AVR baseline from Module 2',
    ],
    explanation:
      'The **ESP32** (original family) is Espressif\'s wireless SoC: **dual-core Xtensa LX6** processors up to **240 MHz**, roughly **520 KB SRAM**, flash on the module, **3.3 V logic**, and integrated **2.4 GHz Wi-Fi and Bluetooth** (per docs.espressif.com). Peripherals are generous: many GPIO options (exact counts and which pins are safe to use are *module-level* facts — check your module\'s documentation), multiple UARTs, I2C, SPI, touch sensing, and ADCs.\n\n### What integration changes\n\nA radio on-chip is not just convenience — it changes the product\'s center of gravity. Certifications (FCC/CE-class radio approvals) come with the module; antenna design is done; the network stack (TCP/IP, TLS, BLE) runs as firmware libraries. The engineering cost is complexity: more clocks, more power states, a real SDK with an RTOS underneath (Module 3 Lesson 2), and a boot process with more failure modes. Compared to the ATmega328P\'s 2 KB SRAM, the ESP32\'s ~520 KB and dual cores make TLS-class workloads *possible* — that is the honest gap between the families.\n\n### The ADC caveats, stated plainly\n\nThe ESP32\'s ADCs are 12-bit (0-4095) but are documented to have **nonlinearity**, especially near the rail extremes, and their input range is configured by **attenuation** settings (which trade range against resolution — exact valid ranges per the datasheet and ESP-IDF docs). The engineering consequences: for *precise* analog measurement, either calibrate against known references, keep readings mid-range, or add an external ADC — do not promise datasheet-grade accuracy from a reading you have not characterized. This is the "verify against official docs" habit at its most consequential: the caveat is *in* Espressif\'s documentation, and quoting the ADC as 12-bit-perfect ignores it.',
    deepDive: '### Dual cores change the programming model\n\nTwo cores mean real concurrency choices: pin the radio/network stack to one core and your application loop to the other (the ESP-IDF default arrangement for Wi-Fi applications), or run per-core tasks explicitly. With an RTOS (FreeRTOS in ESP-IDF), "loop()" becomes one task among several with priorities — a genuine step up in programming model from the AVR\'s single-threaded loop. The transferable skill from your Embedded C course (volatile, shared state, critical sections) becomes *mandatory* here: two cores sharing data need real synchronization, not hope. This is also why Module 3 Lesson 2 exists — the framework lesson is really a concurrency lesson.\n\n### The 3.3 V world, again\n\nEverything from mcu-m01-l3 applies with force: ESP32 I/O is 3.3 V and not 5 V tolerant; 5 V sensors need dividers/shifters; the board\'s 5 V USB input feeds onboard regulators down to 3.3 V — the 5 V pin is a supply, not a signaling level. One extra ESP32-specific caution: **strapping pins** (a small set of GPIOs sampled at boot to select boot/operating mode) misbehave if external hardware holds them at the wrong level during reset — the datasheet and module documentation identify them; the pre-wiring checklist (Module 5) gains a line: "is this a strapping pin?"',
    examples: [
      {
        title: 'ESP32 vs ATmega328P: the honest comparison',
        language: 'text',
        code:
          'Dimension          ATmega328P (Uno)      ESP32 (original family)\n-----------------  --------------------  --------------------------\nCore               8-bit AVR, 16 MHz     dual Xtensa LX6, to 240 MHz\nSRAM               2 KB                  ~520 KB\nRadio              none                  Wi-Fi 2.4 GHz + BT on-chip\nLogic voltage      5 V                   3.3 V (not 5V tolerant)\nProgramming model  bare-metal loop       RTOS tasks (ESP-IDF) or\n                                         Arduino-style layer\nADC                10-bit, simple        12-bit w/ documented\n                                         nonlinearity + attenuation\nBoot complexity    ms, single image      bootloader + partitions +\n                                         radio init (more failure\n                                         modes, more capability)\nPower              uA sleep, simple      deep sleep uA-class (see\n                                         lesson 3) + radio budgets\n[Sources: docs.arduino.cc; Microchip ATmega328P datasheet;\n docs.espressif.com. Family-level facts — verify module-level\n details in your module\'s documentation.]',
        explanation: [
          'The comparison is dimension-by-dimension with the honest rows included: boot complexity and programming model are *costs*, not just capability wins.',
          'The ADC row carries the caveat explicitly — 12-bit is the count, not the accuracy promise.',
          'Voltage row connects to mcu-m01-l3: mixing these families needs translation, always.',
          'The source lines model attribution: chip-family docs, with the module-level verify note as the closing habit.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'ESP32 system shape',
        content:
          '   +--------------------------------------------------+\n   |  CORE0: radio/network stack (Wi-Fi/BT firmware)   |\n   |  CORE1: your application tasks (RTOS)             |\n   |--------------------------------------------------|\n   |  peripherals: UARTs, I2C, SPI, PWM, touch, ADC*   |\n   |  *ADC: 12-bit, attenuation ranges, documented     |\n   |   nonlinearity near rails — calibrate/verify      |\n   |--------------------------------------------------|\n   |  3.3 V I/O (NOT 5V tolerant) | strapping pins!    |\n   +--------------------------------------------------+\n   module adds: flash, antenna, regulator (board facts)',
        caption:
          'Dual cores with a division of labor, rich peripherals with one honest asterisk, and 3.3 V I/O with strapping-pin caution. Family shape per docs.espressif.com.',
      },
    ],
    tables: [
      {
        caption: 'ESP32 headline facts (family-level; verify against official docs)',
        headers: ['Property', 'Value', 'Engineering consequence'],
        rows: [
          ['Processor', 'Dual-core Xtensa LX6, to 240 MHz', 'Real concurrency; RTOS task model'],
          ['SRAM', '~520 KB', 'TLS/TLS-class stacks fit; buffers affordable'],
          ['Radio', 'Wi-Fi 2.4 GHz + Bluetooth', 'Certified module; network stack in firmware'],
          ['Logic voltage', '3.3 V, not 5V tolerant', 'Translation for 5 V signals (mcu-m01-l3)'],
          ['ADC', '12-bit, attenuation settings', 'Documented nonlinearity — calibrate or external ADC'],
          ['Boot', 'Bootloader + partition scheme', 'More failure modes; strapping pins matter'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Trusting an ESP32 ADC reading as lab-grade because "it is 12-bit".',
        fix: 'Espressif documents ADC nonlinearity and attenuation trade-offs. For honest analog work: characterize/calibrate your readings, keep signals mid-range, or use an external ADC. The bit count is not the accuracy spec.',
      },
      {
        mistake: 'Feeding 5 V sensor outputs directly into ESP32 inputs.',
        fix: '3.3 V and not 5 V tolerant (mcu-m01-l3 rules): dividers for one-way signals, translators for buses — before the first wire, per the pre-wiring checklist.',
      },
      {
        mistake: 'Wiring arbitrary GPIOs without checking strapping pins.',
        fix: 'A few GPIOs are sampled at boot to select boot/mode behavior; external pull-ups/downs on them can brick the boot. Identify strapping pins from the module documentation before assigning them to your circuit.',
      },
    ],
    guidedPractice: {
      title: 'Choose the instrument for the measurement',
      brief:
        'You must measure a battery voltage (0-4.2 V) to ±10 mV. Options: (a) ESP32 ADC, (b) external calibrated ADC over I2C, (c)Uno 10-bit ADC at 5 V. For each, state its realistic accuracy from this lesson and pick one, defending with the caveat rules.',
      starterCode:
        '(a) ESP32 ADC: realistic accuracy ______ ; caveat: ________\n(b) external ADC: ______ ; cost: ________\n(c) Uno: ______ ; range problem: ________\nchoice: ____ because ________',
      expectedBehavior:
        '(a) ESP32 ADC: 12-bit count but documented nonlinearity/attenuation — uncalibrated readings will not honestly hit ±10 mV; with calibration, borderline. (b) External calibrated ADC: meets ±10 mV by design — the right instrument; cost is a part and I2C wiring. (c) Uno: 10-bit at 5 V ≈ 4.9 mV/LSB nominal, but 4.2 V exceeds... no wait, 4.2 < 5 V so in range — but ±10 mV wants better than ~1 LSB and the supply-referenced ADC inherits regulator noise. Choice: (b) — the requirement is a precision spec, and precision is bought with the right instrument, not hope.',
      hints: [
        'A precision requirement is an instrument-specification question.',
        'Bit counts ≠ accuracy — this lesson’s central caveat.',
        'Also check range: does the signal fit the reference?',
      ],
    },
    practiceExercises: [
      {
        title: 'Strapping-pin incident review',
        brief:
          'A board fails to boot after a sensor was wired to a GPIO that happens to be a strapping pin pulled to the wrong level. Write the 3-step review: what happened at reset, why the firmware never ran, and the prevention line added to the pre-wiring checklist.',
        expectedBehavior:
          'Review: (1) at reset, the boot ROM samples strapping pins to select boot mode/operating configuration; (2) the sensor held the pin at a level selecting an invalid/undesired mode, so the expected firmware never started (board appears dead though silicon is fine); (3) prevention: "check strapping-pin status of every GPIO before assigning it" joins the Module 5 checklist — a documentation check, like voltage, before wiring.',
        hints: [
          'Boot-time sampling happens before any of your code.',
          '"Appears dead" ≠ broken silicon — it is a configuration deadlock.',
          'The fix is a checklist line, not a rewire.',
        ],
      },
      {
        title: 'Dual-core task split',
        brief:
          'An ESP32 product samples a sensor every 10 ms and streams over Wi-Fi. Propose the two-core split, name the shared-data hazard, and state the synchronization primitive class that fixes it.',
        expectedBehavior:
          'Split: radio/network stack on its core (ESP-IDF default), application task (sample + handoff) on the other. Hazard: the sampling task and network task share the stream buffer — concurrent read/write can tear data. Fix: RTOS synchronization — a mutex/queue (thread-safe queue preferred: the producer never blocks on the consumer). This is Embedded C concurrency, promoted to mandatory by the second core.',
        hints: [
          'One core already owns the stack by default — put your work elsewhere.',
          'Shared mutable state across cores/threads is the hazard.',
          'Queues decouple rates; mutexes guard sections — prefer queues here.',
        ],
      },
    ],
    assessment: {
      title: 'ESP32 overview checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Per docs.espressif.com, what characterizes the original ESP32?',
          options: [
            '8-bit AVR with Wi-Fi add-on',
            'Dual-core Xtensa LX6 up to 240 MHz, ~520 KB SRAM, Wi-Fi + Bluetooth, 3.3 V logic',
            'Dual Cortex-M0+ with PIO',
            'A 5 V-tolerant single-core chip',
          ],
          answer: 'Dual-core Xtensa LX6 up to 240 MHz, ~520 KB SRAM, Wi-Fi + Bluetooth, 3.3 V logic',
          explanation:
            'The original ESP32 family headline: dual LX6 cores, ~520 KB SRAM, integrated 2.4 GHz radio, 3.3 V I/O (family-level facts per Espressif docs).',
          hint: 'Which survey row, expanded.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'The ESP32 ADC\'s 12-bit resolution means its readings are linear and lab-grade across the full range by default.',
          answer: 'false',
          explanation:
            'Espressif documents ADC nonlinearity (notably near the rails) and attenuation trade-offs. Honest analog work on the ESP32 calibrates, stays mid-range, or uses an external ADC.',
          hint: 'What does the vendor documentation itself say about the ADC?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'What are strapping pins and why do they matter?',
          options: [
            'Pins for connecting external straps of wire',
            'GPIOs sampled at boot to select boot/operating mode — wrong external levels can prevent boot',
            'Pins that survive deep sleep only',
            'The JTAG pins',
          ],
          answer: 'GPIOs sampled at boot to select boot/operating mode — wrong external levels can prevent boot',
          explanation:
            'The boot ROM samples specific GPIOs before any user code runs; external hardware holding them wrong makes the board appear dead. They are identified in the datasheet/module docs — a pre-wiring checklist item.',
          hint: 'They act before your firmware exists.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the programming model ESP-IDF brings (compared to the AVR bare-metal loop) that the second core makes necessary.',
          answer: 'RTOS tasks',
          explanation:
            'ESP-IDF runs FreeRTOS: your application is one or more tasks with priorities across two cores — real concurrency with real synchronization duties (mutexes/queues for shared data).',
          hint: 'What runs instead of a single loop().',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Xtensa LX6', definition: 'Espressif\'s 32-bit processor core; the original ESP32 has two, up to 240 MHz.' },
      { term: 'Attenuation', definition: 'ADC input-range setting trading measurable range against resolution.' },
      { term: 'Strapping pins', definition: 'GPIOs sampled by the boot ROM to select boot/operating mode.' },
      { term: 'Partition scheme', definition: 'Flash layout (bootloader/app/data regions) that ESP32 firmware builds on.' },
      { term: 'FreeRTOS', definition: 'The RTOS underneath ESP-IDF: tasks, queues, mutexes — the ESP32 programming model.' },
    ],
    revisionSummary: [
      'ESP32 = dual LX6 + radio on-chip + ~520 KB SRAM at 3.3 V — capability with complexity.',
      'Integration changes products: certified radio, network stack in firmware, RTOS underneath.',
      'ADC: 12-bit count, documented nonlinearity — calibrate, stay mid-range, or use an external ADC.',
      '3.3 V not-5V-tolerant rules and strapping-pin checks join the pre-wiring ritual.',
      'Two cores make concurrency discipline mandatory, not optional.',
    ],
    furtherReading: [
      { label: 'ESP32 datasheet (Espressif)', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/adc.html', kind: 'docs' },
      { label: 'ESP-IDF programming guide', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'mcu-m03-l2',
    title: 'Frameworks: ESP-IDF vs Arduino Core, and Peripheral Patterns',
    summary:
      'The two ways to program an ESP32 — Espressif\'s ESP-IDF and the Arduino core for ESP32 — and the GPIO/UART/I2C patterns each exposes, attributed to official documentation, with the abstraction trade made explicit.',
    objectives: [
      'Distinguish ESP-IDF (native SDK, FreeRTOS, full peripheral access) from the Arduino core for ESP32 (familiar API over IDF).',
      'Show the same GPIO/UART job at both API levels (family-level patterns, attributed).',
      'Explain when each framework is the right choice (honest trade: familiarity vs capability).',
      'Identify what neither framework removes: voltage rules, strapping pins, and datasheet verification.',
    ],
    whyItMatters:
      'The ESP32 ecosystem\'s first fork in the road is the framework choice, and beginners burn weeks choosing by fashion instead of by fit. IDF gives the full machine (tasks, full peripheral configuration, power management); the Arduino core gives velocity and a familiar API — *running on top of IDF*. Knowing both exist, and what each hides, is the literacy that makes ESP32 code readable either way.',
    prerequisites: [
      'ESP32 overview (mcu-m03-l1)',
      'Arduino API model (mcu-m02-l1)',
    ],
    explanation:
      '**ESP-IDF** is Espressif\'s official development framework: C, FreeRTOS underneath, full peripheral APIs, power-management and radio control, its build system and partition tools (per docs.espressif.com). It is the layer where every ESP32 capability is first-class — including the ones the Arduino layer does not expose.\n\nThe **Arduino core for ESP32** is a community-maintained port of the Arduino API *on top of* ESP-IDF: `pinMode`, `digitalWrite`, `Serial`, plus ESP32-specific Arduino classes. The program model feels like Module 2 — setup/loop — but underneath, the RTOS runs and loop() is a task. Velocity is the benefit; reach is the cost: some IDF capabilities (fine-grained power management, certain peripheral configurations) require dropping to IDF anyway.\n\nThe decision rule: **team and lifecycle first**. Learning, prototypes, and Arduino-familiar teams: Arduino core, honestly labeled as IDF underneath. Products needing power tuning, OTA update architecture, or full peripheral control: ESP-IDF. Mixed teams genuinely do both — Arduino core for app logic, IDF components for the hard parts — because they share one reality underneath.\n\n### Peripheral patterns at both levels (family-level shapes)\n\n- **GPIO**: Arduino — `pinMode`/`digitalWrite`; IDF — `gpio_config`/`gpio_set_level` with explicit struct configuration. Same register underneath; different ceremony.\n- **UART**: Arduino — `Serial.begin(baud)` and prints; IDF — `uart_driver_install`/`uart_write_bytes` with queues and events. The IDF shape reveals what `Serial` manages: driver, buffers, events.\n- **I2C**: Arduino — `Wire.begin`, `beginTransmission`, `endTransmission`; IDF — `i2c_master_*` driver with configuration of frequency/pins. Either way, the bus is 3.3 V with pull-ups — electrical facts no framework changes.',
    deepDive: '### What the framework choice never changes\n\nThree facts survive every API: (1) **3.3 V, not 5 V tolerant** — electrical rules are silicon, not software; (2) **strapping pins** — boot behavior is hardware; (3) **the RTOS underneath** — even Arduino-style code shares the machine with Wi-Fi tasks, so long busy-waits in loop() starve the radio stack in ways the Uno never experienced. That third one deserves emphasis: an Arduino-core ESP32 sketch with a delay-free tight loop can degrade Wi-Fi responsiveness, because loop() is a task *beside* the network task, not the whole machine. The framework changes the syntax; the system is the same system.\n\n### Portability honesty between frameworks\n\nCode written to the Arduino core runs (mostly) unchanged on ESP32 and on AVR — that is the layer\'s purpose. Code written to IDF runs on ESP32 variants but not on AVR at all. The register code from Module 2 Lesson 2 runs on neither: AVR registers are AVR-only. The portability gradient is real: Arduino API > IDF > raw registers — and each step down buys control with portability. This mirrors the FPGA course\'s wrapper discipline: isolate the vendor layer so the portable core stays clean.',
    examples: [
      {
        title: 'The same GPIO+UART job at both API levels (family-level shapes)',
        language: 'c',
        code:
          '/* FAMILY-LEVEL PATTERNS for teaching: exact function signatures,\n   config structs and return codes live in the official docs\n   (docs.espressif.com / Arduino reference). Read-and-trace only:\n   no ESP32 toolchain on this platform. */\n\n/* ---- Arduino core flavor (IDF underneath) ----\nconst int BUTTON = 4;\nconst int LED    = 2;\n\nvoid setup() {\n    pinMode(BUTTON, INPUT_PULLUP);\n    pinMode(LED, OUTPUT);\n    Serial.begin(115200);\n}\n\nvoid loop() {\n    int pressed = (digitalRead(BUTTON) == LOW);\n    digitalWrite(LED, pressed ? HIGH : LOW);\n    if (pressed) Serial.println(\"button\");\n    delay(10);\n}\n\n/* ---- ESP-IDF flavor (native, FreeRTOS task shape) ----\nvoid app_main(void) {\n    /* gpio: configure button input w/ pull-up, LED output */\n    gpio_config(&button_cfg);   /* struct: pin, mode, pull */\n    gpio_config(&led_cfg);\n    uart_driver_install(UART_NUM, ...);   /* driver + buffers */\n\n    for (;;) {\n        int pressed = (gpio_get_level(BUTTON) == 0);\n        gpio_set_level(LED, pressed);\n        if (pressed) uart_write_bytes(UART_NUM, \"button\\n\", 7);\n        vTaskDelay(pdMS_TO_TICKS(10));   /* yield to other tasks */\n    }\n} */',
        explanation: [
          'Both flavors implement the identical job: read an active-low button, mirror to an LED, report over UART — the comparison is purely API ceremony.',
          'Arduino flavor: three familiar calls per peripheral; the RTOS and driver setup are implicit. Honest label: this is IDF underneath, with loop() as a task.',
          'IDF flavor: configuration structs and an explicit driver install — more ceremony, more control; vTaskDelay yields to the RTOS scheduler (the Arduino delay does the same underneath).',
          'The comments carry the honesty: exact signatures live in official docs; nothing here was compiled — read-and-trace.',
          'The electrical layer is identical in both: pull-ups, 3.3 V levels, and the same silicon — frameworks do not touch physics.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The ESP32 software stack',
        content:
          '  +---------------------------+  +---------------------------+\n  |  Arduino-core sketch      |  |  ESP-IDF application      |\n  |  setup()/loop() API       |  |  app_main + tasks         |\n  +------------+--------------+  +-------------+-------------+\n               |   (is a thin layer)           | (native)\n               v                               v\n        +------------------------------------------------+\n        |            ESP-IDF: drivers + FreeRTOS         |\n        +------------------------------------------------+\n        |              ROM/bootloader + silicon          |\n        +------------------------------------------------+\n  Both roads end in the same machine; they differ in ceremony\n  and in which capabilities are first-class.',
        caption:
          'The Arduino core is a portability layer over IDF, not an alternative machine. Framework choice trades familiarity against first-class reach.',
      },
    ],
    tables: [
      {
        caption: 'Framework selection guide',
        headers: ['Situation', 'Choose', 'Why'],
        rows: [
          ['Learning, prototypes, Arduino-experienced team', 'Arduino core', 'Velocity; familiar API (IDF underneath)'],
          ['Product needing power tuning / OTA architecture', 'ESP-IDF', 'Full first-class control (per docs.espressif.com)'],
          ['Mixed team', 'Both', 'Arduino core for app logic; IDF components for hard parts'],
          ['Any framework', 'Docs anyway', 'Voltage/strapping/RTOS facts survive all APIs'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Believing the Arduino core replaces ESP-IDF rather than wrapping it.',
        fix: 'The core is a layer over IDF (same docs, same drivers). Errors reported at IDF level reach Arduino-core sketches; capabilities missing from the core are an IDF call away. Knowing the stack makes both errors debuggable.',
      },
      {
        mistake: 'Writing tight delay-free loops in an Arduino-core ESP32 sketch.',
        fix: 'loop() is a task beside the Wi-Fi stack; a CPU-hogging loop starves it (unlike the AVR, where your loop WAS the machine). Yield with delay()/vTaskDelay, or lower the loop\'s priority — the RTOS is underneath either way.',
      },
      {
        mistake: 'Quoting exact IDF function signatures from memory in real code.',
        fix: 'APIs evolve across IDF releases; signatures, config structs and return codes belong to the official docs for the IDF version in use. This lesson teaches shapes and decisions; the docs supply the exact calls.',
      },
    ],
    guidedPractice: {
      title: 'Pick the framework, defend it',
      brief:
        'Three projects: (a) a weekend prototype logging temperature to Serial; (b) a battery product needing 10-year-class sleep currents and OTA updates; (c) a classroom where students already know digitalWrite. For each, choose Arduino core or ESP-IDF with the one decisive reason from this lesson.',
      starterCode:
        '(a) ______ decisive: ________\n(b) ______ decisive: ________\n(c) ______ decisive: ________',
      expectedBehavior:
        '(a) Arduino core — velocity; Serial logging is its home turf. (b) ESP-IDF — power management and OTA architecture are first-class IDF capabilities the Arduino core does not fully expose. (c) Arduino core — team familiarity is the decisive column in the selection table; the RTOS underneath still applies.',
      hints: [
        'The selection table has two hard rows: power/OTA -> IDF; familiarity/velocity -> core.',
        '(b) is the honest IDF case — say which capability decides.',
        '(c) is not about capability at all — it is about the team.',
      ],
    },
    practiceExercises: [
      {
        title: 'Starving-the-stack diagnosis',
        brief:
          'An Arduino-core ESP32 sketch toggles a pin in a delay-free while(1) loop; Wi-Fi connections start dropping. Explain the mechanism (loop() as a task; RTOS starvation) and the two-line fix.',
        expectedBehavior:
          'Mechanism: loop() is one task among several; the Wi-Fi stack runs its own higher-priority work but a tight no-yield loop consumes its core\'s time slices, degrading stack servicing. Fix: yield periodically — delay(1)/vTaskDelay in the loop, or restructure to event-driven waits. The lesson: the RTOS underneath is shared, whatever the API.',
        hints: [
          'Where does the Wi-Fi task run while your loop never yields?',
          'Cooperative yielding is the minimum fix.',
          'The Uno never had this problem — say why.',
        ],
      },
      {
        title: 'Portability gradient',
        brief:
          'Rank for portability: (1) an Arduino-core sketch using only digitalWrite/Serial; (2) an IDF app using uart_write_bytes; (3) Module 2\'s PORTB register code. State what each runs on and the control-vs-portability principle.',
        expectedBehavior:
          'Portability: (1) runs on any Arduino core target (AVR, ESP32, RP2040-via-core); (2) runs on ESP32-class targets only; (3) runs on ATmega328P-class AVRs only. Principle: each step down the stack buys control/insight and pays portability — which is why real code isolates register/vendor layers behind portable interfaces (the FPGA wrapper discipline, recurring).',
        hints: [
          'Which layer exists on the most targets?',
          'Registers bind to a chip family, APIs to an ecosystem.',
          'The wrapper pattern reconciles the trade.',
        ],
      },
    ],
    assessment: {
      title: 'Frameworks checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What is the relationship between the Arduino core for ESP32 and ESP-IDF?',
          options: [
            'Independent alternatives with no shared code',
            'The Arduino core is a layer on top of ESP-IDF, exposing a familiar API',
            'ESP-IDF is a subset of the Arduino core',
            'They target different ESP32 chips',
          ],
          answer: 'The Arduino core is a layer on top of ESP-IDF, exposing a familiar API',
          explanation:
            'The Arduino core for ESP32 implements the Arduino API over ESP-IDF — same machine underneath, familiar ceremony above. Errors and capabilities ultimately belong to IDF.',
          hint: 'Which one sits lower in the stack diagram?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'In an Arduino-core ESP32 sketch, loop() is a FreeRTOS task that must yield so the Wi-Fi stack can run.',
          answer: 'true',
          explanation:
            'The RTOS is underneath either framework: loop() is a task beside the radio stack. Tight delay-free loops starve it — unlike the AVR, where loop() was the whole machine.',
          hint: 'What else is running on that core?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'A battery product needs deep-sleep tuning and OTA updates. Which framework and why?',
          options: [
            'Arduino core — faster to write',
            'ESP-IDF — power management and OTA architecture are first-class IDF capabilities',
            'Either — they are equivalent for power',
            'Neither — the AVR is better for batteries',
          ],
          answer: 'ESP-IDF — power management and OTA architecture are first-class IDF capabilities',
          explanation:
            'The selection rule is lifecycle capability: when the product needs full power tuning and update architecture, the native framework exposes them first-class (per docs.espressif.com).',
          hint: 'Which selection-table row mentions OTA?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: what `Serial.begin(baud)` corresponds to at IDF level — an installed UART driver with buffers and events (the hidden machinery behind the print).',
          answer: 'uart driver',
          explanation:
            'Serial wraps an installed UART driver (uart_driver_install-class IDF machinery): buffers, events and baud configuration. The Arduino call is the friendly summary of that layer.',
          hint: 'What does the IDF flavor install that Serial hides?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'ESP-IDF', definition: 'Espressif\'s native framework: FreeRTOS, full peripheral and power APIs (per docs.espressif.com).' },
      { term: 'Arduino core (ESP32)', definition: 'Community port of the Arduino API over ESP-IDF — velocity layer, same machine.' },
      { term: 'app_main', definition: 'IDF\'s entry point; from there the application creates tasks (or behaves loop-like).' },
      { term: 'vTaskDelay', definition: 'RTOS yield/sleep that lets other tasks run — the cooperative necessity under both frameworks.' },
      { term: 'Portability gradient', definition: 'Arduino API > IDF > raw registers: each layer down buys control, pays portability.' },
    ],
    revisionSummary: [
      'Arduino core = familiarity over IDF; IDF = first-class everything; same machine underneath.',
      'Choose by lifecycle: velocity/learning -> core; power/OTA/architecture -> IDF; mixed teams mix.',
      'loop() is a task: yield or starve the radio stack — the RTOS survives every API choice.',
      'Frameworks change ceremony, never physics: 3.3 V rules, strapping pins, datasheet verification persist.',
      'Portability gradient: API > framework > registers; isolate the low layers behind wrappers.',
    ],
    furtherReading: [
      { label: 'ESP-IDF programming guide', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/', kind: 'docs' },
      { label: 'Arduino core for ESP32 (Espressif docs index)', url: 'https://docs.espressif.com/', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'mcu-m03-l3',
    title: 'Power Modes and Choosing ESP32',
    summary:
      'ESP32 power management as a design discipline: active/modem-sleep/light-sleep/deep-sleep in order-of-magnitude terms, the wake sources that make duty-cycled products possible, and the honest decision framework for when ESP32 is — and is not — the answer.',
    objectives: [
      'Name the ESP32 power modes and their order-of-magnitude currents, attributed to Espressif documentation as "verify exact figures per datasheet".',
      'Explain deep sleep: what survives (RTC memory, wake sources), what is lost (RAM state), and the design pattern it enables.',
      'Compute a battery-life estimate for a duty-cycled sensor using active/sleep currents and duty ratio.',
      'State the decision framework: when ESP32 wins (wireless + moderate duty), when a smaller MCU or SBC wins.',
    ],
    whyItMatters:
      'Wireless products live or die on the sleep budget: a sensor reporting hourly either sleeps at microamps or dies in a week. The ESP32\'s deep-sleep mode — CPU and radio off, RTC memory and wake sources alive — is the mechanism behind every battery Wi-Fi sensor on the market. Computing the battery math yourself, with honest figures, is the difference between a product and a demo.',
    prerequisites: [
      'ESP32 overview (mcu-m03-l1)',
      'Determinism and power columns from mcu-m01-l1/l2',
    ],
    explanation:
      'The ESP32 offers a ladder of power modes (order-of-magnitude figures; **verify exact values against the datasheet for your chip and module**):\n\n- **Active**: everything running — hundreds of mA-class when the radio transmits, tens of mA idle-active (radio on).\n- **Modem sleep**: CPU active, radio off between uses — tens of mA class; keeps Wi-Fi associable.\n- **Light sleep**: CPU paused, RAM/ peripherals retained — mA-to-sub-mA class; wakes in ms.\n- **Deep sleep**: CPU, most RAM and radio powered off; **RTC memory and RTC peripherals stay**, current drops to the **µA class** (the datasheet\'s headline deep-sleep figure is in the ~10 µA range for the chip, with module-level extras). Wake sources: timer, touch, certain GPIOs, ULP.\n\nDeep sleep *loses* ordinary RAM — the design pattern is: wake -> do the work (sample, transmit) -> store the tiny state you need in RTC memory -> enter deep sleep with a timer wake. The chip reboots on wake, reads RTC memory, and continues. Duty-cycled products (report-every-hour sensors) are built exactly like this.\n\n### The battery arithmetic\n\nAverage current = duty_active × I_active + (1 − duty_active) × I_sleep. A sensor active 5 s per hour (duty 5/3600 ≈ 0.0014) at ~100 mA active and ~10 µA sleep gives: average ≈ 0.0014 × 100 mA + 0.9986 × 0.01 mA ≈ 0.15 mA. A 2000 mAh battery then lasts ≈ 13,000 hours ≈ 18 months. That arithmetic — not hope — is the product decision, and every term (active time! active current! sleep current! battery capacity!) is a datasheet or measurement fact, not a wish.',
    deepDive: '### Where the µA promise leaks away\n\nThe headline deep-sleep current is the *chip*; boards add regulators (quiescent current), LEDs (a power indicator LED can draw more than the entire sleep budget!), pull-ups, and the radio module\'s extras. The honest method: measure the assembled board in deep sleep, not the datasheet chip — a 10 µA chip on a board with a 1 mA quiescent regulator sleeps at 1 mA, a 100x miss. Module 5\'s checklist gains its power line here: "verify the assembled board\'s sleep current by measurement." This is also why products use purpose-built modules/power trees rather than dev boards: dev boards optimize for convenience, not microamps.\n\n### The decision framework\n\nESP32 wins when: wireless is required, duty cycling fits (seconds of work per minutes-to-hours of sleep), and the workload needs its memory/processing (TLS, buffering). A smaller MCU wins when: no radio is needed (an ATmega-class or small Cortex-M at sub-µA sleep beats ESP32 sleep), or the job is trivially small. An SBC wins when: the workload is OS-class (cameras, rich UIs) and power is wall-powered. The middle case — "wireless but always-on streaming" — is ESP32 active-mode with its real power cost, or an external radio with a smarter duty cycle. Every branch of this framework is testable with the battery arithmetic above.',
    examples: [
      {
        title: 'Battery arithmetic, fully shown (illustrative figures, verify per datasheet)',
        language: 'text',
        code:
          'PRODUCT: soil sensor, reports over Wi-Fi hourly\nFIGURES (illustrative; verify against datasheet + measurement):\n  active current (sample + Wi-Fi TX): ~100 mA\n  active time per report:            ~5 s\n  deep-sleep current (ASSEMBLED BOARD, measured): ~0.05 mA\n    (chip ~10 uA class + regulator/module extras — measured!)\n  battery: 2000 mAh Li-ion\n\nDUTY:\n  active fraction = 5 s / 3600 s = 0.00139\n\nAVERAGE CURRENT:\n  I_avg = 0.00139*100 mA + (1-0.00139)*0.05 mA\n        = 0.139 mA + 0.050 mA\n        = 0.189 mA\n\nLIFETIME:\n  t = 2000 mAh / 0.189 mA = 10,582 h = 14.6 months\n\nSENSITIVITY (the honest part):\n  sleep current 0.5 mA instead -> I_avg = 0.64 mA -> 4.3 months\n  The SLEEP term dominates at low duty: measure it, do not guess it.',
        explanation: [
          'Every figure is labeled: illustrative, verify-against-datasheet, and — the key habit — the sleep current is the *assembled board* measurement, not the chip headline.',
          'The duty calculation is shown in full so the arithmetic is auditable: fraction, weighted sum, lifetime division.',
          'The sensitivity line is the engineering lesson: at 0.14% duty, a 10x worse sleep current cuts life by 3x — sleep current dominates, so measurement effort belongs there.',
          'The Wi-Fi transmit term (~100 mA class) justifies keeping active time short: 5 s, not 5 minutes — protocol choice (connect, publish, disconnect) is a power decision.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The deep-sleep product cycle',
        content:
          '  wake (timer/touch/GPIO)\n      |\n      v\n  read RTC-memory state, sensor sample\n      |\n      v\n  connect radio, transmit, disconnect   <- the expensive seconds\n      |\n      v\n  update RTC-memory counters\n      |\n      v\n  enter deep sleep (uA-class)  <--------- most of the product\'s life\n      |\n      +---- timer expires ----> (back to wake)\n\n  Ordinary RAM: LOST each cycle. RTC memory: survives.',
        caption:
          'Wake-work-sleep: the state lives in RTC memory, the seconds of radio are the budget, the sleep is the product.',
      },
    ],
    tables: [
      {
        caption: 'ESP32 power-mode ladder (order-of-magnitude; verify per datasheet/module)',
        headers: ['Mode', 'CPU', 'RAM', 'Radio', 'Current class', 'Wake time'],
        rows: [
          ['Active', 'running', 'yes', 'on', 'tens-hundreds mA', '—'],
          ['Modem sleep', 'running', 'yes', 'off between use', 'tens mA', '—'],
          ['Light sleep', 'paused', 'retained', 'off', 'mA to sub-mA', 'ms'],
          ['Deep sleep', 'off', 'lost (RTC kept)', 'off', '~uA class', 'ms-class via RTC boot'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Quoting the chip\'s ~10 µA deep-sleep figure as the product\'s sleep current.',
        fix: 'Measure the assembled board: regulators, LEDs, module extras routinely dominate. A single indicator LED can exceed the whole sleep budget — the honest figure is a measurement with the final hardware.',
      },
      {
        mistake: 'Expecting ordinary RAM variables to survive deep sleep.',
        fix: 'Deep sleep powers down SRAM; only RTC memory persists. Persist exactly the small state you need (counters, calibration) in RTC memory and treat every wake as a boot — the design pattern, not a bug workaround.',
      },
      {
        mistake: 'Designing "always-on Wi-Fi" for a battery product because the radio is integrated.',
        fix: 'Run the battery arithmetic: always-on tens-to-hundreds of mA kills any battery in days. Duty-cycle the connection (connect/publish/disconnect) and let deep sleep own the idle time — or choose a wired/smaller-MCU design if the use case allows.',
      },
    ],
    guidedPractice: {
      title: 'Redesign the duty cycle',
      brief:
        'The soil sensor (figures from the example) must now report every 6 hours. Recompute average current and lifetime. Then state which term you would attack first if the requirement is 5 years, and why.',
      starterCode:
        'duty = 5 s / 21600 s = ______\nI_avg = duty*100 mA + (1-duty)*0.05 mA = ______ mA\nlifetime = 2000 mAh / I_avg = ______ months\nfirst term to attack: ______ because ________',
      expectedBehavior:
        'Duty = 2.31e-4. I_avg = 0.0231 + 0.04999 ≈ 0.073 mA. Lifetime = 2000/0.073 ≈ 27,400 h ≈ 37 months. For 5 years (60 months), the sleep term now dominates (0.050 of 0.073 mA) — attack the assembled-board sleep current (regulator, LEDs, module choice), not the active time. At this duty, active time is nearly irrelevant.',
      hints: [
        'Recompute the duty with 21,600 s.',
        'Compare the two weighted terms — which is bigger now?',
        'The dominant term is where engineering effort pays.',
      ],
    },
    practiceExercises: [
      {
        title: 'Sleep-budget detective',
        brief:
          'A board sleeps at 300 µA although the chip datasheet says ~10 µA. List four board-level suspects, ranked by likelihood, and the measurement that confirms each.',
        expectedBehavior:
          'Suspects: (1) power indicator LED (a 1-10 mA-class miss would be worse — check if any LED is alive); (2) regulator quiescent current (check its datasheet — 10-100 µA class is common); (3) external pull-ups to a rail through the sensor divider (leakage path); (4) module extras/flash standby (check module docs). Measurement: current measurement of the assembled board in deep sleep, then isolate by removing/disabling components one at a time.',
        hints: [
          'Anything connected to a rail can leak in sleep.',
          'LEDs are the classic 100x suspect.',
          'The confirm step is always: measure, then bisect.',
        ],
      },
      {
        title: 'Family power comparison',
        brief:
          'Same hourly-report product, no radio needed (a wire exists). Compare ESP32 deep-sleep (~50 µA board) vs an ATmega328P power-down (µA-class, per datasheet; verify) vs a small Cortex-M (sub-µA class, per vendor docs; verify). Which wins and what does ESP32 still offer?',
        expectedBehavior:
          'Without radio duty, the small Cortex-M wins on sleep class (sub-µA claimed per vendor docs — verify), ATmega next, ESP32 last (~50 µA board figure). ESP32 still offers: headroom for future wireless, richer peripherals, TLS if a network appears — but the honest answer for a wired, sleepy product is the small MCU: pay only for what the product needs.',
        hints: [
          'The decision framework\'s first branch: is wireless required?',
          'Sleep current classes order the families.',
          '"Headroom" is a legitimate but paid-for argument.',
        ],
      },
    ],
    assessment: {
      title: 'Power modes checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does ESP32 deep sleep retain?',
          options: [
            'Everything — it is just a pause',
            'RTC memory and wake sources only; ordinary SRAM and CPU state are lost',
            'Only the radio connection',
            'The full SRAM but not the CPU',
          ],
          answer: 'RTC memory and wake sources only; ordinary SRAM and CPU state are lost',
          explanation:
            'Deep sleep powers down CPU, most SRAM and the radio; RTC-domain memory and configured wake sources survive, and wake reboots the chip — the wake-work-sleep pattern is built on this contract.',
          hint: 'What tiny memory domain stays powered?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'For a 0.14%-duty wireless sensor, the assembled board\'s deep-sleep current dominates battery life more than the active transmit current does.',
          answer: 'true',
          explanation:
            'Average current = duty×active + (1−duty)×sleep; at 0.14% duty the sleep term is ~99.9% of the time. The example showed sleep current changes of 10x swinging lifetime by 3x — measure the assembled board.',
          hint: 'Weight each current by its time fraction.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Which wake source pattern matches "report every hour on a battery"?',
          options: [
            'GPIO wake on a button',
            'RTC timer wake — wake, work, publish, sleep, repeat',
            'Touch wake',
            'Stay in modem sleep and poll',
          ],
          answer: 'RTC timer wake — wake, work, publish, sleep, repeat',
          explanation:
            'Timer wake from deep sleep is the duty-cycled sensor pattern: the RTC counts the hour in µA-class sleep, then the chip reboots into its work sequence.',
          hint: 'What wakes a chip whose CPU is off?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the design discipline of computing average current as duty-weighted active and sleep contributions before choosing a battery.',
          answer: 'battery arithmetic',
          explanation:
            'Battery arithmetic: I_avg = duty×I_active + (1−duty)×I_sleep; lifetime = capacity/I_avg — every term a datasheet or measurement fact, never a wish.',
          hint: 'It is the named calculation of this lesson.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Deep sleep', definition: 'ESP32 mode: CPU/SRAM/radio off, RTC memory and wake sources alive, uA-class current.' },
      { term: 'Wake source', definition: 'Configured event that ends deep sleep: RTC timer, touch, certain GPIOs, ULP.' },
      { term: 'RTC memory', definition: 'The always-powered memory domain that survives deep sleep — where duty-cycled state lives.' },
      { term: 'Duty cycling', definition: 'Sleeping most of the time and working briefly; the wireless-battery product pattern.' },
      { term: 'Quiescent current', definition: 'A regulator/board\'s own idle consumption — the classic sleeper-budget leak.' },
    ],
    revisionSummary: [
      'Power ladder: active (mA-hundreds) -> modem sleep -> light sleep (retained) -> deep sleep (uA, RTC only).',
      'Deep-sleep contract: RAM lost, RTC memory survives, wake reboots — design around wake-work-sleep.',
      'Battery arithmetic is mandatory: duty-weighted currents, lifetime = capacity/average; sensitivity analysis names the dominant term.',
      'Measure the assembled board\'s sleep current — chip headlines leak away in regulators, LEDs and modules.',
      'Decision framework: wireless + duty fits -> ESP32; no radio + sleepy -> smaller MCU; OS-class -> SBC.',
    ],
    furtherReading: [
      { label: 'ESP-IDF sleep modes documentation', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/sleep_modes.html', kind: 'docs' },
      { label: 'ESP-IDF programming guide', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
];
