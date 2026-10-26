import type { TutorialLesson } from '../types';

export const module01Lessons: TutorialLesson[] = [
  {
    id: 'mcu-m01-l1',
    title: 'MCU vs Microprocessor vs SBC vs FPGA',
    summary:
      'Four devices that all "compute" but differ fundamentally in memory architecture, determinism, boot process and cost — the decision table that starts every embedded project correctly.',
    objectives: [
      'Define each class: microcontroller (MCU), microprocessor (MPU), single-board computer (SBC), FPGA — by memory, boot and peripheral integration.',
      'Pick the right class for a given product need using the decision table.',
      'Explain why MCUs are deterministic in ways SBCs are not (no OS jitter, cycle-bounded peripherals).',
      'Place this course\'s four board families (Uno R3, ESP32, Pico, and where an FPGA would sit) on the map.',
    ],
    whyItMatters:
      'Beginners lose weeks forcing the wrong class of device to do a job: a Linux SBC asked to toggle a pin every 10 µs, or an MCU asked to serve a web page with TLS. The class decision is a 10-minute analysis that shapes the entire project — cost, power, toolchain, and what "real time" will mean. Since your Embedded C course already taught the register-level view, this lesson gives you the selection-level view.',
    prerequisites: [
      'Embedded C fundamentals (Embedded C course)',
      'Basic computer architecture (processor, memory, peripherals)',
    ],
    explanation:
      'A **microcontroller (MCU)** integrates processor, flash (program), SRAM, and peripherals (timers, ADC, UART, I2C, SPI, GPIO) on one chip, running *bare-metal* or a light RTOS — no OS disk, boot in milliseconds. Determinism is the signature: a GPIO toggle or timer interrupt happens at predictable times, because the code runs alone on the silicon.\n\nA **microprocessor (MPU)** is a CPU chip (or package) designed to run a full OS — it expects external RAM, storage and power management, and offers raw performance. A **single-board computer (SBC)** wraps an MPU (or SoC) with RAM, storage, and I/O on a ready-made board — Linux boots in seconds, filesystems, networking and multitasking come free. The cost is jitter: the OS scheduler, caches and background daemons make precise timing a negotiation, not a guarantee.\n\nAn **FPGA** (your FPGA course) is neither processor nor memory but configurable hardware — chosen when you need custom parallel logic or cycle-exact interfaces. In practice, MCUs and FPGAs coexist: the MCU runs the application, the FPGA runs the hard-real-time datapath.\n\n### The class decision, as questions\n\n1. **Does it run an OS-level workload** (networking stacks, filesystems, user interfaces)? -> MPU/SBC.\n2. **Is timing determinism critical** (bit-banged protocols, motor commutation, sampling loops)? -> MCU (or FPGA fabric for the hardest paths).\n3. **Is custom parallel datapath logic needed** that no MCU peripheral provides? -> FPGA, possibly paired with an MCU.\n4. **What is the unit cost and power budget?** MCUs start under a dollar and run on microamps in sleep; SBCs are orders of magnitude above on both.',
    deepDive: '### Determinism, stated precisely\n\n"Real time" means *bounded response time*, not "fast". An MCU with a 16 MHz core toggling a pin in an interrupt has a response bound you can compute from the interrupt latency and code path — microseconds, guaranteed, no cache-line surprises. A Linux SBC toggling the same pin through a userspace driver is subject to scheduler latency (potentially milliseconds) and cannot promise better without real-time kernel work and careful design — and even then, the guarantee is statistical, not architectural. This is why industrial control, motor drives and signal chains live on MCUs (or FPGA fabric) while the dashboard lives on the SBC. The hybrid architecture — SBC supervising, MCU actuating, connected by UART/USB — is the standard industrial answer and appears again in this course\'s Module 5.\n\n### Memory maps shape the programming style\n\nEverything you learned in Embedded C — volatile pointers, register masks, bit manipulation — assumes the MCU model: peripherals are memory-mapped registers, flash holds code in-place, RAM is scarce (KB-scale) and every byte is budgeted. An SBC inverts this: gigabytes of RAM, an MMU with virtual memory, and code loaded from a filesystem. Neither is harder; they are different disciplines, and this course stays rigorously on the MCU side of the line (with the FPGA course having covered the third world: hardware as configuration).',
    examples: [
      {
        title: 'Four jobs, four classes (decision walkthrough)',
        language: 'text',
        code:
          'Job A: coin-operated vending machine controller\n  needs: motor relay timing, coin pulse counting, UI\n  determinism: YES (actuator timing)\n  workload size: small (KB of logic)\n  -> MCU (classic bare-metal choice)\n\nJob B: smart display showing weather + web dashboard\n  needs: TLS, JPEG decode, touch UI\n  workload: OS-class\n  -> SBC (or MPU-based product)\n\nJob C: battery sensor logging every 10 minutes for 2 years\n  needs: deep sleep at microamps, occasional radio\n  -> MCU with sleep modes (MCU-class, power decides)\n\nJob D: 8-channel 2 MHz custom protocol analyzer\n  needs: cycle-exact parallel capture, huge FIFO\n  -> FPGA (or MCU + FPGA hybrid; the capture path is\n     not a software problem at any MCU clock rate)',
        explanation: [
          'Job A is the textbook MCU case: small code, hard actuator timing, integrated peripherals cover it.',
          'Job B fails MCU-class on workload (TLS/UI/filesystem), not on speed — an MCU *can* bit-bang TLS but nobody should.',
          'Job C shows the other MCU axis: average power, not speed, is the spec; sleep-mode microamps decide.',
          'Job D fails on determinism and parallelism: at 2 MHz/channel, cycle-exact capture is a hardware-structure problem — the FPGA course\'s territory.',
          'The pattern: workload class, determinism, and power each eliminate classes independently — check all three.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The four-class map',
        content:
          '                OS-class workload\n                       ^\n                       |\n                 SBC / MPU\n              (Linux, GB RAM,\n               ms-scale jitter)\n                       |\n  custom parallel  ----+---- single-chip simplicity\n  logic needed         |         \n                  FPGA      MCU\n              (configurable (flash+SRAM+peripherals\n               fabric)       on-chip, uA sleep, us\n                             determinism)',
        caption:
          'Two axes sort the classes: OS-class workload vs bare-metal determinism, and software flexibility vs custom hardware structure.',
      },
    ],
    tables: [
      {
        caption: 'Class comparison (order-of-magnitude; verify specifics against vendor documentation)',
        headers: ['Property', 'MCU', 'MPU/SBC', 'FPGA'],
        rows: [
          ['Program storage', 'On-chip flash, in-place', 'External storage + OS boot', 'Configuration flash -> fabric'],
          ['RAM scale', 'KB - a few MB', 'GB', 'Mb-scale blocks'],
          ['Boot time', 'ms', 'seconds (OS)', 'tens-hundreds ms (configuration)'],
          ['Timing determinism', 'us, architecturally bounded', 'ms, scheduler-dependent', 'cycle-exact (hardware)'],
          ['Sleep power', 'uA-class', 'mA-W', 'device-dependent, usually higher'],
          ['Unit cost', '$ < 1 - $10', '$ 10 - $ 100+', '$ 10 - $ 1000+'],
          ['Programming model', 'Bare-metal C / RTOS (this course)', 'OS application development', 'RTL (FPGA course)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Choosing an SBC because "it has more megahertz".',
        fix: 'Megahertz measures throughput, not determinism. For bounded-response tasks (bit-banged buses, control loops, precise sampling), a modest MCU outperforms a fast SBC precisely because it has nothing between your code and the pin.',
      },
      {
        mistake: 'Choosing an MCU for a job that needs a filesystem, TLS and a UI framework.',
        fix: 'Check the workload class first: OS-level software on an MCU is possible but painful (KB-scale RAM, no MMU). If the product is "a computer with some I/O", an SBC is the honest answer — and pair it with an MCU for the timing-critical I/O if needed.',
      },
      {
        mistake: 'Forgetting the FPGA option when peripherals cannot keep up.',
        fix: 'When no MCU peripheral captures or generates the required signal (odd protocols, multi-channel exact sampling), the answer is configurable hardware — even small FPGAs paired with an MCU. The FPGA course\'s Lab series is exactly this competence.',
      },
    ],
    guidedPractice: {
      title: 'Classify five product briefs',
      brief:
        'Classify each as MCU, SBC/MPU, FPGA, or hybrid, with the one decisive criterion: (a) door lock with keypad, servo and 5-year battery; (b) in-store kiosk with video ads; (c) drone flight controller (1 kHz loop, IMU, motor PWM); (d) industrial gateway bridging Modbus to MQTT; (e) 16-channel logic analyzer.',
      starterCode:
        '(a) ____ decisive: ________\n(b) ____ decisive: ________\n(c) ____ decisive: ________\n(d) ____ decisive: ________\n(e) ____ decisive: ________',
      expectedBehavior:
        '(a) MCU — sleep power + simple actuation. (b) SBC — OS-class workload (video/UI). (c) MCU (dedicated flight-controller MCU) — 1 kHz deterministic loop; some designs add FPGA for exotic needs. (d) MCU or hybrid — protocol stacks exist on MCUs; if the stack gets heavy, SBC supervising an MCU. (e) FPGA — cycle-exact multi-channel capture is a hardware-structure problem.',
      hints: [
        'Ask: what breaks first — workload, timing, or power?',
        '(d) is deliberately ambiguous: state your assumption about stack weight.',
        '(e) is the FPGA course\'s Lab 6 problem, multiplied by 16.',
      ],
    },
    practiceExercises: [
      {
        title: 'Determinism arithmetic',
        brief:
          'An MCU interrupts at 16 MHz with a worst-case interrupt latency of 12 cycles and a 30-cycle handler before the pin write. Compute the worst-case pin-response time and compare it to a 1 ms-scale scheduler jitter on an SBC.',
        expectedBehavior:
          'MCU: (12 + 30) / 16 MHz = 42/16e6 ≈ 2.6 µs worst case — architectural, repeatable. SBC: ~1 ms jitter is ~380x worse and *statistical* (no hard bound without RT work). The comparison is the argument for MCUs in control paths.',
        hints: [
          'Cycles ÷ frequency = seconds.',
          'Compare magnitude AND guarantee strength (bounded vs statistical).',
          'The handler-before-write ordering matters: count to the write.',
        ],
      },
      {
        title: 'Hybrid split design',
        brief:
          'A networked LED matrix sign needs: 60 fps pixel streaming with exact 800 kHz timing, plus a web API. Propose the two-chip split and the interface between them.',
        expectedBehavior:
          'SBC (or networked MPU): web API, image storage, scheduling. MCU/FPGA: the 800 kHz exact-timing pixel output (WS2812-class timing is a hardware-timing job — an MCU with a cycle-counted routine or an FPGA/peripheral DMA path). Interface: the SBC sends frame buffers over UART/USB/SPI; the timing side owns the pin.',
        hints: [
          'Which job has the hard timing bound?',
          'The interface must be tolerant of SBC jitter (buffering!).',
          'Frame-level handoff hides the SBC\'s nondeterminism.',
        ],
      },
    ],
    assessment: {
      title: 'Device classes checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What best defines a microcontroller?',
          options: [
            'A very fast CPU with external RAM',
            'Processor, flash, SRAM and peripherals integrated on one chip, running bare-metal or a light RTOS',
            'A chip that executes Linux with a filesystem',
            'A reconfigurable fabric of lookup tables',
          ],
          answer: 'Processor, flash, SRAM and peripherals integrated on one chip, running bare-metal or a light RTOS',
          explanation:
            'The MCU definition is integration plus execution model: everything on-chip, no OS disk, millisecond boot, microamp sleep — determinism and simplicity as the design point.',
          hint: 'Integration plus what runs on it.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A 1 GHz SBC toggling a GPIO from a userspace program is guaranteed faster and more precise than a 16 MHz MCU doing it from an interrupt.',
          answer: 'false',
          explanation:
            'The SBC\'s OS scheduler, caches and background load make response time statistical (ms-scale possible); the MCU\'s latency is architecturally bounded (µs-scale, computable). Throughput is not determinism.',
          hint: 'What sits between the userspace code and the pin?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'A product needs TLS networking, a touch UI and video decode. Best device class?',
          options: ['MCU', 'SBC/MPU', 'Small FPGA', '8-bit AVR'],
          answer: 'SBC/MPU',
          explanation:
            'This is an OS-class workload: filesystems, TLS stacks and UI frameworks expect gigabytes of RAM and an OS. The MCU class is for integrated, deterministic, low-power control — not application-layer software.',
          hint: 'Classify the workload first.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: the property of an MCU that its pin-response time is computable from interrupt latency and code path, unlike an OS-driven system.',
          answer: 'determinism',
          explanation:
            'Determinism — bounded, architecturally guaranteed response times — is the MCU\'s defining advantage in control and timing-critical roles.',
          hint: 'It is the property named throughout this lesson.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'MCU', definition: 'Microcontroller: processor + flash + SRAM + peripherals on one chip, bare-metal or light RTOS.' },
      { term: 'MPU', definition: 'Microprocessor: CPU-class chip designed to run a full OS with external RAM/storage.' },
      { term: 'SBC', definition: 'Single-board computer: MPU/SoC plus RAM, storage and I/O on a ready-made board.' },
      { term: 'Determinism', definition: 'Bounded, architecturally guaranteed response times — the MCU\'s signature property.' },
      { term: 'Hybrid architecture', definition: 'SBC/MPU supervising + MCU (or FPGA) actuating, joined by a buffered link.' },
    ],
    revisionSummary: [
      'MCU = integrated, deterministic, microamp-sleep; SBC = OS-class workload; FPGA = custom parallel logic.',
      'Three elimination questions: workload class, timing determinism, power budget.',
      'Real-time means bounded response, not fast — MCU bounds are computable.',
      'The hybrid SBC-supervises/MCU-actuates pattern is the industrial default.',
      'MCU programming style (volatile registers, KB budgets) follows from the memory map.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Microcontroller', url: 'https://en.wikipedia.org/wiki/Microcontroller', kind: 'article' },
      { label: 'Wikipedia — Single-board computer', url: 'https://en.wikipedia.org/wiki/Single-board_computer', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'mcu-m01-l2',
    title: 'Family Survey: AVR, ESP32, Cortex-M, RP2040',
    summary:
      'The four families this course uses — ATmega328P (Uno R3), ESP32, generic ARM Cortex-M, and RP2040 — compared by core, memory, logic voltage, peripherals and development environment, with the verify-against-official-docs habit built in.',
    objectives: [
      'State each family\'s processor, approximate memory scale, logic voltage and ecosystem — attributed to official documentation.',
      'Explain what "8-bit vs 32-bit" changes for the programmer (register width, address space, arithmetic cost) — and what it does not.',
      'Match each family to its sweet spot: learning/AVR, wireless/ESP32, professional breadth/Cortex-M, value+PIO/RP2040.',
      'Practice the verify-first habit: every spec table here carries a "confirm in official docs" note.',
    ],
    whyItMatters:
      'You will spend this course inside these four ecosystems. Knowing their shapes — core, memory, voltage, tooling — lets you predict what code ports cleanly, what needs rework, and what to check in the datasheet before wiring anything. The survey also sets the course\'s documentation discipline: specs quoted here are attributed, and the first habit of embedded work is confirming them in the vendor\'s own documents.',
    prerequisites: [
      'Device classes (mcu-m01-l1)',
      'Embedded C register-level basics (Embedded C course)',
    ],
    explanation:
      '**AVR / ATmega328P (Arduino Uno R3).** An 8-bit AVR core at 16 MHz, 32 KB flash, 2 KB SRAM, 5 V logic, 14 digital I/O and 6 analog inputs on the Uno R3 (per docs.arduino.cc and Microchip\'s datasheet). The Arduino layer (setup/loop, digitalWrite) plus a vast community make it the classic learning platform; the 8-bit core makes every register-level operation visible and cheap.\n\n**ESP32 (original family).** A dual-core Xtensa LX6 system-on-chip up to 240 MHz, 3.3 V logic, integrated 2.4 GHz Wi-Fi and Bluetooth, ~520 KB SRAM (per docs.espressif.com). Peripherals are plentiful (ADC with known linearity caveats, touch, many GPIO options); the ecosystem splits between Espressif\'s ESP-IDF and the Arduino core for ESP32 (Module 3).\n\n**ARM Cortex-M (generic).** A 32-bit processor *architecture* licensed to dozens of vendors (per developer.arm.com): Thumb/Thumb-2 instruction set, a hardware interrupt controller (NVIC), and a standardized software interface (CMSIS). Profiles matter: M0/M0+ (small, cheap), M3/M4 (richer, DSP/optional FPU on M4). This is the professional default across industry.\n\n**RP2040 (Raspberry Pi Pico).** Raspberry Pi\'s dual Cortex-M0+ at 133 MHz, 264 KB SRAM, external QSPI flash, 3.3 V logic, and its signature **PIO** blocks — tiny programmable I/O state machines (per raspberrypi.com/documentation). The Pico SDK (C/C++) and MicroPython both target it; extraordinary value and clean documentation.\n\n### What 8-bit vs 32-bit really changes\n\nAn 8-bit core moves 8 bits per instruction: 16-bit arithmetic takes multiple operations, and the address space is small — you *see* these costs in generated code. A 32-bit core does native 32-bit arithmetic and addressing. What does *not* change: the register-level programming model (peripherals are still memory-mapped bits), the C language, or the discipline. Module 2 shows the same blink written three ways on the ATmega328P.',
    deepDive: '### Reading the survey table critically\n\nTwo habits make this survey durable rather than trivia. First, **attribution**: every number traces to a vendor document (Arduino docs, Espressif docs, Arm developer site, Raspberry Pi docs) — third-party summaries drift and marketing pages inflate; the vendor doc for *your exact board revision* is the contract. Second, **granularity**: "ESP32 has WiFi" is family-level truth; "which GPIO pins survive deep sleep on my module" is module-level truth with errata — the survey tells you *which document to open*, not what every pin does. That distinction (family facts vs board facts) is this course\'s recurring line between Module 1 (families) and Module 5 (your specific wiring).\n\n### Logic voltage as a first-class column\n\nNotice the voltage column before anything else: ATmega328P boards run 5 V logic; ESP32, RP2040 and most Cortex-M boards run 3.3 V — and their pins are generally *not* 5 V tolerant. Connecting a 5 V output to a 3.3 V input is the single most common beginner hardware mistake, and it is why Module 1 closes with the level-shifting lesson (mcu-m01-l3) and Module 5 with the safety discipline. Voltage compatibility is checked before code, every time.',
    examples: [
      {
        title: 'The family survey table, with attribution column',
        language: 'text',
        code:
          'Family      Processor          Memory (approx)  Logic   Ecosystem\n----------  -----------------  ---------------  ------  -----------------------\nAVR         8-bit AVR, 16 MHz  32 KB flash,     5 V     Arduino API; avr-gcc\n(ATmega328P/                   2 KB SRAM                + datasheet for regs\n Uno R3)                                                [docs.arduino.cc,\n                                                         Microchip datasheet]\n\nESP32       dual Xtensa LX6    ~520 KB SRAM,    3.3 V   ESP-IDF or Arduino\n(original)  up to 240 MHz      flash in module          core; Wi-Fi + BT on-chip\n                                                        [docs.espressif.com]\n\nCortex-M    32-bit ARM,        family-dependent 3.3 V   vendor SDKs + CMSIS;\n(generic)   M0+..M4 profiles   (KB-MB)                  NVIC interrupt model\n                                                        [developer.arm.com]\n\nRP2040      dual Cortex-M0+,   264 KB SRAM,     3.3 V   Pico SDK (C/C++) or\n(Pico)      133 MHz            ext. QSPI flash          MicroPython; PIO blocks\n                                                        [raspberrypi.com/\n                                                         documentation]\n\nNOTE: family-level facts only. Board-level pinouts, module\nvariants and errata live in the vendors\' board documents —\nverify there before wiring anything.',
        explanation: [
          'Each row states the three specs that drive early decisions: processor (what code it runs), memory scale (what fits), and logic voltage (what it can safely touch).',
          'The attribution column is the discipline: family facts from vendor documentation, with the explicit note that board-level details require the board\'s own docs.',
          'AVR at 5 V versus everything else at 3.3 V is the load-bearing row — it drives the level-shifting lesson next.',
          'Memory scales differ by two orders of magnitude (2 KB vs 520 KB vs 264 KB vs MB-class Cortex-M) — which is why the workload-class question from mcu-m01-l1 precedes family choice.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Family sweet spots',
        content:
          '              learning &\n              5V legacy        wireless\n                  \\               /\n               AVR \\           / ESP32\n                    \\         /\n   ---- VALUE+PIO -------+---- PROFESSIONAL BREADTH\n                    /         \\\n               RP2040         Cortex-M\n                  /               \\\n              hobby/            industry\n              education         default',
        caption:
          'Each family owns a niche: AVR for learning and 5 V legacy, ESP32 for wireless, Cortex-M for professional breadth, RP2040 for value and clean design.',
      },
    ],
    tables: [
      {
        caption: 'Peripheral quick-compare (family-level; verify against official docs)',
        headers: ['Peripheral need', 'Uno R3 (ATmega328P)', 'ESP32', 'RP2040'],
        rows: [
          ['Digital I/O count', '14 (board-exposed)', 'many GPIO options', '26 GPIO on Pico'],
          ['ADC', '6 channels, 10-bit', '12-bit (linearity caveats; see docs)', '12-bit'],
          ['PWM', 'hardware timers via analogWrite', 'LED/PWM peripherals', 'PIO or PWM blocks'],
          ['Radio', 'none (add module)', 'Wi-Fi + BT on-chip', 'none (add module)'],
          ['Unique peripheral', 'simplicity itself', 'integration (Wi-Fi/BT)', 'PIO state machines'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Quoting spec numbers from this course (or any summary) without checking the official document when they matter.',
        fix: 'Summaries train recognition; vendor documents decide. Pinouts, electrical limits and module variants live in official docs (docs.arduino.cc, docs.espressif.com, raspberrypi.com/documentation, developer.arm.com) — the survey table itself carries the verify note.',
      },
      {
        mistake: 'Assuming 5 V tolerance because "the board has a 5 V pin".',
        fix: 'A 5 V *supply* pin does not make GPIOs 5 V tolerant: ESP32, RP2040 and most Cortex-M pins are 3.3 V devices. Check the datasheet\'s absolute maximum ratings per pin before any cross-voltage connection.',
      },
      {
        mistake: 'Dismissing the 8-bit AVR as obsolete.',
        fix: 'For its niche — learning register-level thinking, 5 V legacy systems, sub-dollar cost — the ATmega328P remains a superb tool. Architecture choice is fit-for-purpose, not fashion; Module 2 exploits its smallness deliberately.',
      },
    ],
    guidedPractice: {
      title: 'Match family to brief',
      brief:
        'Pick the family (AVR/Uno, ESP32, generic Cortex-M, RP2040) and the one decisive fact: (a) retrofit a 5 V legacy industrial sensor bus; (b) battery soil sensor reporting over Wi-Fi weekly; (c) cost-sensitive educational kit teaching PIO-style custom I/O; (d) safety-adjacent product where vendor LTS and interrupt tooling matter most.',
      starterCode:
        '(a) ______ decisive: ________\n(b) ______ decisive: ________\n(c) ______ decisive: ________\n(d) ______ decisive: ________',
      expectedBehavior:
        '(a) AVR/Uno — 5 V logic matches legacy signaling natively. (b) ESP32 — integrated Wi-Fi plus deep sleep (Module 3). (c) RP2040 — PIO teaches custom I/O structures at kit pricing. (d) Generic Cortex-M — vendor ecosystem, CMSIS portability and interrupt tooling are the professional requirements.',
      hints: [
        'Match the decisive column: voltage, radio, unique peripheral, ecosystem.',
        'Each brief eliminates three families on one fact — find that fact.',
        'No family wins everywhere; that is the point of the survey.',
      ],
    },
    practiceExercises: [
      {
        title: 'Attribution drill',
        brief:
          'You quote "the Uno R3 runs at 16 MHz with 14 digital I/O" in a design doc. Write the two-part citation habit this course requires: which document class proves it, and which facts would need a *different* document (board schematic) to confirm.',
        expectedBehavior:
          'Part 1: family/chip facts (clock, I/O count, memory) — the vendor documentation for the ATmega328P and the official Uno R3 product docs (docs.arduino.cc, Microchip datasheet). Part 2: board facts — which header pin carries which MCU pin, LED connections, voltage regulator limits — the board schematic/pinout for YOUR board revision, not the chip datasheet.',
        hints: [
          'Chip facts vs board facts are different documents.',
          'Clock and I/O counts live with the chip; header mappings live with the board.',
          'Revision numbers matter for board docs.',
        ],
      },
      {
        title: 'Portability prediction',
        brief:
          'Code written for the ATmega328P uses digitalWrite(13, HIGH) and a 16-bit timer. Predict what ports cleanly to an RP2040 and what does not, citing the survey table.',
        expectedBehavior:
          'The *concept* (GPIO write, timer period) ports; the *API* does not — digitalWrite is Arduino-core (available on RP2040 only via the Arduino-Pico core, a different layer), and ATmega328P timer registers (Module 2) are AVR-specific; RP2040 has its own PWM/PIO peripherals and SDK APIs. The survey table\'s ecosystem column is the tell: different vendor SDKs mean different register names and APIs.',
        hints: [
          'Separate concept, API, and register-level layers.',
          'Which ecosystem does digitalWrite belong to?',
          'Portability lives at the concept layer; registers never port.',
        ],
      },
    ],
    assessment: {
      title: 'Family survey checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which family integrates Wi-Fi and Bluetooth on-chip?',
          options: ['ATmega328P (Uno R3)', 'ESP32', 'RP2040', 'Generic Cortex-M0+'],
          answer: 'ESP32',
          explanation:
            'The ESP32 family integrates 2.4 GHz Wi-Fi and Bluetooth on-chip (per docs.espressif.com) — the reason it owns the wireless niche.',
          hint: 'Which survey row mentioned radios?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'The Raspberry Pi Pico\'s RP2040 uses a dual-core Arm Cortex-M0+ at 133 MHz with 264 KB of on-chip SRAM.',
          answer: 'true',
          explanation:
            'RP2040: dual Cortex-M0+ at 133 MHz, 264 KB SRAM, external QSPI flash, 3.3 V logic (per raspberrypi.com/documentation) — plus its PIO blocks.',
          hint: 'It is the second Arm-based row in the survey.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'What is the most important reason the ATmega328P still earns a place in this course?',
          options: [
            'It is the fastest family surveyed',
            'Its simplicity and 8-bit core make register-level behavior visible, and it runs 5 V legacy signaling natively',
            'It has the most memory',
            'It integrates Wi-Fi',
          ],
          answer: 'Its simplicity and 8-bit core make register-level behavior visible, and it runs 5 V legacy signaling natively',
          explanation:
            'Module 2 exploits exactly this: a small, fully-documented 8-bit chip at 5 V is the best classroom for the register-level discipline — and matches 5 V legacy hardware.',
          hint: 'What does Module 2 do with it?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: the standard Arm-provided software interface layer (standardized register names and functions) that makes Cortex-M code portable across vendors.',
          answer: 'CMSIS',
          explanation:
            'CMSIS (Cortex Microcontroller Software Interface Standard) is Arm\'s standardized interface layer for Cortex-M — the portability mechanism across dozens of vendors (per developer.arm.com).',
          hint: 'It was named in the Cortex-M row.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'ATmega328P', definition: '8-bit AVR MCU, 16 MHz on the Uno R3, 5 V logic, 32 KB flash / 2 KB SRAM (per docs.arduino.cc / Microchip).' },
      { term: 'ESP32', definition: 'Dual-core Xtensa LX6 SoC with Wi-Fi/BT, 3.3 V logic (per docs.espressif.com).' },
      { term: 'Cortex-M', definition: 'Arm\'s 32-bit MCU processor profile family with NVIC and CMSIS (per developer.arm.com).' },
      { term: 'RP2040', definition: 'Raspberry Pi\'s dual Cortex-M0+ MCU with PIO blocks and 264 KB SRAM (per raspberrypi.com/documentation).' },
      { term: 'PIO', definition: 'Programmable I/O: tiny RP2040 state machines for custom digital interfaces (Module 4).' },
    ],
    revisionSummary: [
      'Four families, four niches: AVR (learning/5 V), ESP32 (wireless), Cortex-M (professional), RP2040 (value+PIO).',
      '8-bit vs 32-bit changes arithmetic width and address space, not the register-level discipline.',
      'Family facts come from vendor docs; board facts come from board schematics — different documents.',
      'The voltage column decides wiring safety before anything else: 5 V vs 3.3 V is Module 1 Lesson 3.',
      'Every spec quote carries attribution and a verify-against-official-docs note.',
    ],
    furtherReading: [
      { label: 'Arduino documentation', url: 'https://docs.arduino.cc/', kind: 'docs' },
      { label: 'Raspberry Pi Pico documentation', url: 'https://www.raspberrypi.com/documentation/microcontrollers/', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'mcu-m01-l3',
    title: 'The Datasheet-First Method; 5 V vs 3.3 V Logic',
    summary:
      'How to actually read a datasheet — pinout, electrical characteristics, absolute maximum ratings — and the one electrical fact that saves hardware: 5 V and 3.3 V logic do not mix without translation.',
    objectives: [
      'Navigate a datasheet\'s three load-bearing sections: pinout, electrical characteristics, absolute maximum ratings.',
      'Explain why 5 V into a 3.3 V input damages it, and what "not 5 V tolerant" means operationally.',
      'Choose a level-translation method for each direction: 5 V -> 3.3 V (divider/level shifter), 3.3 V -> 5 V (threshold check, shifter if needed).',
      'Build the pre-wiring checklist this course uses in every Module 5 project.',
    ],
    whyItMatters:
      'Code can be reflashed; a fried GPIO cannot. Almost every destroyed first board traces to skipping the datasheet and assuming voltage compatibility. This lesson installs the reading method — the datasheet-first habit — and the voltage arithmetic, both of which Module 5\'s safety checklists reuse verbatim.',
    prerequisites: [
      'Family survey and voltage column (mcu-m01-l2)',
      'Basic circuit quantities (V, I, resistance — voltage dividers)',
    ],
    explanation:
      '### The three sections that matter first\n\nWhen you open a datasheet for wiring decisions, read in this order:\n\n1. **Pinout / pin description**: what each pin does and what its *alternate functions* are. Board-level truth additionally needs the *board\'s* pinout document — the chip pinout says PA5 can be a UART; the board doc says where PA5 went on the header.\n2. **Electrical characteristics**: the operating numbers — VDD range, input high/low thresholds (V_IH/V_IL), output drive, ADC range. These tell you what a logic family *means* by high and low.\n3. **Absolute maximum ratings**: the damage thresholds — voltages that destroy, currents that burn. These are *never* operating targets; they are the fence beyond which damage begins.\n\nThe habit: before wiring anything new, find the two voltage columns (supply, I/O) and the absolute maximum table. Two minutes, every time.\n\n### 5 V vs 3.3 V, concretely\n\nA 5 V logic family (ATmega328P) signals HIGH at ~5 V. A 3.3 V family signals HIGH at ~3.3 V, and its input structure is designed for that domain — most modern 3.3 V parts are **not 5 V tolerant**: a 5 V signal on such an input forward-biases internal protection structures and can inject current into the rail, degrading or destroying the pin. "Not 5 V tolerant" is a per-pin electrical fact stated in the datasheet; assume it applies unless the document says otherwise.\n\nThe fixes are directional:\n\n- **5 V output -> 3.3 V input**: reduce the level. A two-resistor divider (e.g., 10 kΩ top, 20 kΩ bottom gives 5 × 20/30 ≈ 3.33 V) works for one-way signals; a bidirectional level-shifter module or logic IC handles buses.\n- **3.3 V output -> 5 V input**: often works directly — check the 5 V part\'s V_IH: 3.3 V typically exceeds it (a 5 V CMOS V_IH of ~0.7×VDD = 3.5 V would NOT work; TTL-threshold inputs at ~2.0 V would) — the datasheet decides, not optimism.\n\n### The pre-wiring checklist\n\nModule 5\'s projects each run this five-line check before connecting: supply voltage of each side; signal voltage of each side; per-pin current direction and limit; shared ground present; driver needed for anything beyond a GPIO (transistor/relay/H-bridge). It is the distilled datasheet-first method.',
    deepDive: '### Why the divider numbers are what they are\n\nA divider trades level for impedance. 10 kΩ/20 kΩ from 5 V gives 3.33 V — safely above a 3.3 V input\'s V_IH (~0.7×3.3 ≈ 2.31 V class for many parts; the exact number is in the datasheet\'s electrical characteristics) while keeping source impedance modest (~6.7 kΩ) — fine for slow signals, marginal for fast edges (the input capacitance + impedance forms an RC that rounds edges) and wrong for buses that need drive. The engineering habit: compute the output level AND the impedance, then check both against the load\'s requirements — the same reasoning Module 5 applies to LED resistors and transistor gates. And for anything bidirectional or fast, use a proper level-shifter IC/module rather than fighting divider compromises.\n\n### The board-vs-chip pinout trap\n\nChip datasheets document MCU pins (PA5, PB3...); boards expose *headers* wired through regulators, USB chips and sometimes level translation. The trap: naming a header pin by its board label and looking it up in the chip datasheet — or vice versa. The professional chain is: board pinout document (header label -> MCU pin) -> chip datasheet (MCU pin -> electrical behavior). Both documents are needed, in that order, for every wire you connect. This course never quotes a header-to-function mapping without telling you to verify it on your own board\'s documentation.',
    examples: [
      {
        title: 'Voltage translation decisions for the four cross cases',
        language: 'text',
        code:
          'CASE 1: 5 V out (ATmega) -> 3.3 V in (ESP32, NOT 5V tolerant)\n  NEED: drop the level\n  FIX: divider 10k top / 20k bottom\n       Vout = 5 * 20/(10+20) = 3.33 V  OK\n  CHECK: signal speed (impedance ~6.7k: fine for slow signals)\n\nCASE 2: 3.3 V out (ESP32) -> 5 V in (ATmega, CMOS thresholds)\n  CHECK the 5V part\'s V_IH in its datasheet:\n    - if V_IH = 0.7*VDD = 3.5 V  -> 3.3 V is NOT guaranteed high\n      -> FIX: level shifter (or pick a TTL-threshold input)\n    - if V_IH = 2.0 V (TTL-class) -> 3.3 V works directly\n  THE DATASHEET DECIDES, not optimism.\n\nCASE 3: both directions (I2C bus across domains)\n  FIX: bidirectional level-shifter module / proper IC\n  (dividers cannot do bidirectional buses)\n\nCASE 4: same-domain connections (3.3 V <-> 3.3 V)\n  FIX: none — but check current limits (Module 5)',
        explanation: [
          'Case 1 arithmetic shown end-to-end: divider ratio, resulting voltage, and the impedance caveat — each number derived, none asserted.',
          'Case 2 is the honest one: the answer depends on the receiving part\'s V_IH, which is a datasheet fact, not a habit or a rule of thumb.',
          'Case 3 kills the divider-for-everything reflex: buses need bidirectional translators.',
          'Case 4 reminds that same-voltage does not mean same-current — Module 5\'s topic.',
          'The recurring verb is CHECK: every case ends at a datasheet section named in this lesson.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'The 5 V to 3.3 V divider',
        content:
          '  5 V signal\n      |\n     [10k]   R_top\n      |\n      +-----> to 3.3 V input\n      |       V_out = 5 * R_bot/(R_top + R_bot)\n     [20k]           = 5 * 20/30 = 3.33 V\n      |       R_source ~= 10k||20k = 6.7k\n     GND      (check against signal speed + input V_IH)',
        caption:
          'Two resistors translate one-way levels. The output level AND the source impedance are both engineering quantities — check both.',
      },
    ],
    tables: [
      {
        caption: 'Datasheet sections in reading order (wiring decisions)',
        headers: ['Section', 'What it tells you', 'Beginner use'],
        rows: [
          ['Pinout / pin description', 'Pin functions and alternates', 'Where does this signal live?'],
          ['Electrical characteristics', 'VDD range, V_IH/V_IL, drive, ADC range', 'Will this level be read correctly?'],
          ['Absolute maximum ratings', 'Damage thresholds', 'What must NEVER happen (not targets!)'],
          ['Board pinout doc (separate!)', 'Header label -> MCU pin mapping', 'Which physical hole is this?'],
        ],
      },
      {
        caption: 'Voltage domain crossings: the decision table',
        headers: ['Direction', 'Works directly?', 'Translation'],
        rows: [
          ['5 V out -> 3.3 V in (not 5V-tolerant)', 'NO', 'Divider (one-way) or level shifter'],
          ['3.3 V out -> 5 V in', 'Only if V_IH < 3.3 V (check datasheet)', 'Shifter if V_IH too high'],
          ['Bus, bidirectional', '—', 'Level-shifter module/IC'],
          ['Same domain', 'Yes (levels)', 'Check currents (Module 5)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Connecting a 5 V sensor output straight to an ESP32 or RP2040 input.',
        fix: 'Those inputs are not 5 V tolerant (assume so unless the datasheet says otherwise). Insert a divider or level shifter for every 5 V-to-3.3 V one-way signal, and a translator for buses.',
      },
      {
        mistake: 'Reading absolute maximum ratings as safe operating points ("40 mA per pin is allowed").',
        fix: 'Absolute maxima are damage thresholds, not design targets — operating near them degrades reliability. Design to the *recommended* operating figures in electrical characteristics (Module 5 quantifies the LED case), with margin.',
      },
      {
        mistake: 'Looking up a board header pin in the chip datasheet (or the reverse).',
        fix: 'Two documents, in order: the board pinout maps header -> MCU pin; the chip datasheet maps MCU pin -> electrical behavior. Both, every time — and confirm your board\'s revision.',
      },
    ],
    guidedPractice: {
      title: 'Run the pre-wiring checklist',
      brief:
        'You will connect an ATmega328P (5 V) UART TX to an ESP32 UART RX at 9600 baud. Run the course checklist: supply voltages, signal voltages, direction, translation needed (with divider values), and the one extra check for UART signals specifically (speed/impedance).',
      starterCode:
        'Supply: ATmega ____ V, ESP32 ____ V\nSignal: ATmega TX swings 0..____ V into ESP32 RX (domain ____ V)\nTranslation: ______ (values: ____)\nUART-specific check: ________\nShared ground: ______',
      expectedBehavior:
        'Supplies: 5 V vs 3.3 V. Signal: 0-5 V into a 3.3 V, not-5V-tolerant input. Translation: divider, 10k top/20k bottom -> 3.33 V (UART at 9600 baud is slow; ~6.7k source impedance rounds edges negligibly at this rate — state the reasoning). Shared ground: required and connected. The checklist is complete: nothing else about the wire can hurt the pin.',
      hints: [
        'UART is one-way here: a divider is legal (buses need translators, one-way signals do not).',
        'Slow signals forgive impedance; fast ones do not — say which this is.',
        'The checklist has five lines; produce all five.',
      ],
    },
    practiceExercises: [
      {
        title: 'V_IH detective story',
        brief:
          'A 5 V gate IC lists V_IH = 3.5 V. A 3.3 V sensor drives it. Will it work? What if the gate lists V_IH = 2.0 V? State the rule you used.',
        expectedBehavior:
          '3.5 V V_IH: NO — a 3.3 V high does not meet the guaranteed threshold (works only by luck, not by specification). 2.0 V V_IH: YES — 3.3 V exceeds it with margin. The rule: compare the driver\'s guaranteed V_OH against the receiver\'s V_IH from the datasheets — specification against specification, never typicals or optimism.',
        hints: [
          'The question is always V_OH(driver) vs V_IH(receiver).',
          'Guaranteed thresholds, not typical behavior.',
          'When it fails, the fix is a shifter — name the case.',
        ],
      },
      {
        title: 'Divider design with constraints',
        brief:
          'Design a divider for 5 V -> 3.3 V that keeps source impedance below 10 kΩ, and state the two failure modes if you instead chose 100 kΩ/200 kΩ.',
        expectedBehavior:
          '10k/20k gives 3.33 V with 6.7 kΩ source — passes. At 100k/200k: (1) source impedance ~67 kΩ forms an RC with the input capacitance that rounds edges — a 9600-baud UART survives, a 1 MHz signal does not; (2) the input leakage/divider current becomes comparable, shifting the actual level. Both failure modes are impedance facts, checkable in the datasheets.',
        hints: [
          'Keep the ratio 2:1 (bottom:top) for 3.33 V; only the scale is free.',
          'Impedance × input capacitance = edge rounding (RC).',
          'Leakage current through large resistors shifts levels.',
        ],
      },
    ],
    assessment: {
      title: 'Datasheet and voltage checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does "this pin is not 5 V tolerant" mean operationally?',
          options: [
            'The pin cannot output 5 V',
            'A 5 V input signal can inject current through internal protection structures and degrade or destroy the pin',
            'The pin must be powered from 5 V',
            'The pin only works below 5 MHz',
          ],
          answer: 'A 5 V input signal can inject current through internal protection structures and degrade or destroy the pin',
          explanation:
            'Not-5V-tolerant is about inputs: a 5 V high forward-biases protection devices on a 3.3 V rail, injecting current where none was designed — degradation or destruction follows. Assume it applies unless the datasheet states tolerance.',
          hint: 'It is about what you may FEED the pin.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A two-resistor divider (10k top, 20k bottom) converts a 5 V signal to about 3.33 V, suitable for one-way connections into 3.3 V inputs.',
          answer: 'true',
          explanation:
            'V_out = 5 × 20/(10+20) = 3.33 V with ~6.7 kΩ source impedance — correct level for one-way slow signals; bidirectional buses need proper translators instead.',
          hint: 'The divider ratio arithmetic from this lesson.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'A 3.3 V sensor drives a 5 V logic gate. What decides whether it works directly?',
          options: [
            'The sensor\'s supply voltage only',
            'The gate\'s V_IH from its datasheet versus the sensor\'s guaranteed output high level',
            'The wire length',
            'Nothing — 3.3 V always reads as high on 5 V logic',
          ],
          answer: 'The gate\'s V_IH from its datasheet versus the sensor\'s guaranteed output high level',
          explanation:
            'Compare specifications: V_OH(driver) must exceed V_IH(receiver). CMOS-threshold 5 V inputs (V_IH ≈ 0.7×VDD = 3.5 V) fail; TTL-threshold inputs (≈ 2.0 V) pass. The datasheet decides.',
          hint: 'Threshold against threshold — which section lists them?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the datasheet section listing the voltages and currents that DAMAGE the device — never to be used as operating targets.',
          answer: 'absolute maximum',
          explanation:
            'Absolute maximum ratings are damage fences, not design points; design targets come from the electrical characteristics section with margin.',
          hint: 'The section whose numbers you must never aim for.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Absolute maximum ratings', definition: 'Datasheet damage thresholds — fences beyond which degradation begins, never design targets.' },
      { term: 'V_IH / V_IL', definition: 'Guaranteed input high/low thresholds that define what a logic family reads as 1 and 0.' },
      { term: '5 V tolerant', definition: 'A datasheet-stated property that an input survives 5 V signals; assume absent unless stated.' },
      { term: 'Level shifter', definition: 'Circuit/module translating logic levels, required for bidirectional buses across domains.' },
      { term: 'Pre-wiring checklist', definition: 'The five-line course ritual: supplies, signals, currents, ground, driver — before connecting.' },
    ],
    revisionSummary: [
      'Read datasheets in order: pinout, electrical characteristics, absolute maxima — plus the board pinout document.',
      'Most 3.3 V parts are not 5 V tolerant; 5 V outputs need a divider (one-way) or translator (bus).',
      'Reverse direction: compare V_OH(driver) vs V_IH(receiver) from datasheets — never assume.',
      'Dividers trade level for impedance: check both against signal speed and input requirements.',
      'Absolute maxima are damage fences; operating targets live in electrical characteristics.',
    ],
    furtherReading: [
      { label: 'Electronics Tutorials — logic signal voltage levels', url: 'https://www.electronics-tutorials.ws/logic/logic-styles.html', kind: 'article' },
      { label: 'Wikipedia — Logic level', url: 'https://en.wikipedia.org/wiki/Logic_level', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
