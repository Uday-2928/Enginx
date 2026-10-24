import type { TutorialLesson } from '../types';

export const module01Lessons: TutorialLesson[] = [
  {
    id: 'embc-m01-l1',
    title: 'What Is an Embedded System?',
    summary:
      'Define embedded systems, contrast microcontrollers with general-purpose processors, and understand firmware and the constraints that shape embedded C code.',
    objectives: [
      'Define an embedded system and identify examples in everyday devices.',
      'Contrast a microcontroller (MCU) with a general-purpose microprocessor in terms of integration, memory and determinism.',
      'Explain what firmware is and where it lives on the chip.',
      'Describe the constraints — real-time behaviour, memory, power and cost — that make embedded C different from desktop C.',
    ],
    whyItMatters:
      'Embedded systems outnumber every other kind of computer combined — they hide inside washing machines, cars, medical pumps and keyboards. Writing C for them is a different discipline: you have kilobytes instead of gigabytes, and a late response is often as bad as no response. Understanding what makes these systems different is the foundation for every lesson that follows.',
    prerequisites: [],
    explanation:
      'An **embedded system** is a computer built into a larger device to perform a dedicated job, usually with real-time and resource constraints. A desktop PC runs thousands of unrelated programs; a motor controller runs exactly one program, forever, and must respond to its sensors within milliseconds. The word *embedded* refers to the computer being buried inside a product the user never programs.\n\n### Microcontroller versus microprocessor\n\nA **microprocessor** (the CPU in a laptop) is a powerful but bare computation engine — it needs external RAM, storage and controller chips. A **microcontroller** (MCU) packs a CPU core, flash memory for the program, SRAM for variables, and peripherals (timers, serial ports, analog converters) onto a single chip, sometimes a few millimetres across. Examples you will meet in this course, by concept if not by hardware: the STMicroelectronics STM32 family (32-bit ARM Cortex-M cores), the Microchip ATmega328P (8-bit AVR core, the chip on classic Arduino Uno boards) and the Espressif ESP32 (dual-core with Wi-Fi). Check each vendor\'s documentation for their exact register maps — we never assume them in code.\n\n### Firmware\n\nThe program stored inside an MCU is called **firmware** — literally software that is firm, meaning it is written into non-volatile flash memory and survives power cycles. Firmware usually starts running within microseconds of reset and typically never exits: there is no "end of program", just an endless loop or a sleep state.\n\n### The constraints that shape everything\n\nEmbedded C differs from desktop C because of four constraints. **Time**: many systems must react within deadlines (real-time behaviour). **Memory**: an MCU may have only a few kilobytes of RAM — a single forgotten buffer can be fatal. **Power**: devices run on batteries for years, so every idle microamp matters. **Cost and trust**: the chip may sell for under a dollar and must run unattended for a decade, so code must be defensive and predictable.',
    deepDive:
      '### Hard, soft and no real time\n\nA **hard real-time** deadline means a late response is a failure — an airbag igniter must fire within milliseconds, full stop. A **soft real-time** deadline means late responses degrade quality but do not break the system — a dropped audio sample in a toy is a glitch, not a disaster. Most simple embedded work is closer to *deterministic* than strictly real-time: you want predictable, bounded behaviour more than raw speed. That is why later lessons favour polling flags, tick counters and interrupts over unpredictable techniques like dynamic memory allocation.\n\n### Bare metal versus hosted\n\n**Bare-metal** firmware runs directly on the hardware with no operating system: your `main()` *is* the system, and every peripheral interaction goes through hardware registers. The alternative is running on top of a real-time operating system (RTOS) or a full OS like Linux. This course teaches bare-metal first because it exposes exactly what an RTOS later hides from you.\n\n### How you actually learn this without a lab\n\nEvery concept in this course — GPIO, timers, UART, interrupts — can be understood from registers and timing alone. We use clearly labelled **educational mock registers**: plain C variables marked `volatile` that stand in for hardware addresses. They let every example run on your laptop, while the prose tells you honestly what changes on real silicon. When a topic genuinely requires hardware (electrical limits, debouncing physics), we say so explicitly.',
    examples: [
      {
        title: 'A tiny embedded program: read a sensor register, decide, act',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of an on-chip temperature sensor register.\n * A real MCU reads its sensor through an ADC peripheral; the exact\n * register comes from the vendor\'s reference manual. */\nvolatile uint8_t MOCK_SENSOR_COUNTS = 51; /* raw 8-bit ADC count, 0..255 */\n\nint main(void) {\n    uint8_t counts = (uint8_t)MOCK_SENSOR_COUNTS;\n\n    /* Assume an 8-bit ADC with Vref = 2.56 V and a sensor that\n     * outputs 10 mV per degree C. volts = counts * Vref / 255. */\n    float volts = (float)counts * 2.56f / 255.0f;\n    float deg_c = volts / 0.01f;\n\n    printf("counts=%u volts=%.2f temp=%.1f C\\n",\n           (unsigned)counts, volts, deg_c);\n\n    if (deg_c > 40.0f) {\n        printf("FAN ON\\n");\n    } else {\n        printf("FAN OFF\\n");\n    }\n    return 0;\n}',
        explanation: [
          '`MOCK_SENSOR_COUNTS` models one hardware register as a `volatile uint8_t`. The comment states clearly that a real system reads its vendor-specific ADC register instead.',
          'Reading it once into a local gives a consistent snapshot; on real hardware the value can change between two reads.',
          'The conversion `counts * Vref / 255` turns a raw count into volts — the same arithmetic you will formalise in the ADC module.',
          'Trace with 51: `volts = 51 * 2.56 / 255 = 0.512`, printed as `0.51`; `deg_c = 0.512 / 0.01 = 51.2`, printed as `51.2`.',
          'Output: `counts=51 volts=0.51 temp=51.2 C` then `FAN ON`, because 51.2 exceeds the 40 degree threshold. This read-decide-act pattern is the skeleton of most firmware.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'General-purpose computer versus microcontroller',
        content:
          'GENERAL-PURPOSE SYSTEM (multi-chip)            MICROCONTROLLER (single chip)\n\n +-----------+   +-----------+                +---------------------------+\n |   CPU     |   |  RAM chip |                |  +------+  +------+       |\n +-----------+   +-----------+                |  | CPU  |  | Flash|       |\n      |               |                        |  | core |  | 32KB |       |\n +-----------+   +-----------+                |  +------+  +------+       |\n | Disk/SSD  |   | GPU/chips |                |  +------+  +------+       |\n +-----------+   +-----------+                |  | SRAM |  | GPIO |       |\n   many chips, GBs of RAM,                    |  +------+  +------+       |\n   OS picks what runs, when                   |  +------+  +------+       |\n                                              |  | Timers| | UART |       |\n                                              |  +------+  +------+       |\n                                              |  one chip, KBs of RAM,    |\n                                              |  one firmware program     |\n                                              +---------------------------+',
        caption:
          'A microcontroller integrates CPU, memory and peripherals on one die. Its program (firmware) is the only software that runs.',
      },
    ],
    tables: [
      {
        caption: 'Desktop C versus embedded C',
        headers: ['Aspect', 'Desktop C', 'Embedded C'],
        rows: [
          ['Memory', 'Gigabytes of RAM, virtual memory', 'Kilobytes of RAM, flat physical addresses'],
          ['Storage', 'Fast disk, filesystem', 'On-chip flash holding the program itself'],
          ['Termination', 'Program exits to the OS', 'Never exits; infinite loop or sleep'],
          ['Timing', 'Best effort', 'Often real-time with deadlines'],
          ['Hardware access', 'Through the OS', 'Directly through registers'],
          ['Debug output', 'Console, files', 'Usually one UART or an in-circuit debugger'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming embedded code can use malloc, printf-style streams and filesystems freely.',
        fix:
          'Many MCUs have a few kilobytes of RAM and no OS. Dynamic allocation fragments a tiny heap over months of uptime; heavy libraries may not fit in flash at all. Embedded code uses fixed-size buffers and explicit resource ownership — habits this course builds from lesson one.',
      },
      {
        mistake: 'Thinking "fast code" and "correct embedded code" are the same goal.',
        fix:
          'The goal is *predictable* code: bounded time, bounded memory, no surprises. A slightly slower polling loop that always meets its deadline beats a faster design with occasional unbounded pauses.',
      },
      {
        mistake: 'Copying register values from a random online tutorial for a real chip without checking the vendor documentation.',
        fix:
          'Register maps differ between chip families and even revisions. Always verify against the vendor\'s reference manual for your exact part number. This course teaches the *method* using mocks so the habit of consulting the manual becomes automatic.',
      },
    ],
    guidedPractice: {
      title: 'Classify real devices',
      brief:
        'List five devices near you that contain embedded systems. For each, note: what is the dedicated task, does it likely use an MCU or a full processor, does it have hard or soft timing requirements, and what sensors or actuators can you identify?',
      expectedBehavior:
        'A written table with five rows. Example row: microwave oven — task: run magnetron and timer; MCU; soft real-time for display, hard safety interlocks; sensors: door switch, keypad; actuators: magnetron relay, display, buzzer.',
      hints: [
        'Good candidates: keyboard, mouse, TV remote, washing machine, car key fob.',
        'Anything with a single fixed purpose and no general OS is a strong candidate.',
        'Look for the sensors (buttons, light barriers) and actuators (motors, buzzers, displays).',
      ],
    },
    practiceExercises: [
      {
        title: 'Rewrite the decision threshold',
        brief:
          'Modify the example program so the fan turns on above 30 degrees and add a second message `FAN CRITICAL` when the temperature exceeds 50 degrees. Verify by mentally tracing with counts = 40 and counts = 61.',
        expectedBehavior:
          'counts=40 gives volts 0.4016 (prints 0.40), temp 40.2 C, so FAN ON but not critical. counts=61 gives volts 0.6124 (prints 0.61), temp 61.2 C, so FAN CRITICAL.',
        hints: [
          'Order the if/else tests from most severe to least, or use two independent if statements carefully.',
          'Remember 40 degrees needs FAN ON but not CRITICAL — a chained else-if handles that.',
        ],
      },
      {
        title: 'Contrast two designs in prose',
        brief:
          'A vending machine controller must (a) light the display immediately when a coin is inserted, and (b) log sales totals once per hour. State which requirement is real-time and why, and which constraint (time, memory, power, cost) dominates for a vending machine.',
        expectedBehavior:
          'The coin-to-display reaction is real-time (users perceive delay; the machine must not accept money silently). Hourly logging is not timing-critical. Cost and unattended reliability dominate: the chip is high-volume, cheap, and must never hang with coins inside.',
        hints: [
          'Ask: does a human or another machine notice if this is late?',
          'High-volume consumer products usually make cost the dominant constraint.',
        ],
      },
    ],
    assessment: {
      title: 'Embedded fundamentals checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What best defines an embedded system?',
          options: [
            'A computer dedicated to one task inside a larger device',
            'A fast desktop processor',
            'Any program written in C',
            'A system that cannot be programmed',
          ],
          answer: 'A computer dedicated to one task inside a larger device',
          explanation:
            'Embedded systems run one dedicated program inside a product, typically under real-time and resource constraints.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which component set is integrated onto a single microcontroller chip?',
          options: [
            'CPU core, flash, SRAM and peripherals',
            'CPU core only',
            'Peripherals only, with external CPU',
            'GPU, disk controller and network card',
          ],
          answer: 'CPU core, flash, SRAM and peripherals',
          explanation:
            'Integration of CPU, non-volatile program memory, RAM and peripherals on one die is the defining trait of an MCU.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Firmware is called "firm" because it is stored in non-volatile memory and survives power cycles.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'Firmware lives in flash (non-volatile) memory, so it persists without power and starts again at every reset.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'Using the example program, what is the printed temperature line for MOCK_SENSOR_COUNTS = 26?',
          code: 'float volts = (float)counts * 2.56f / 255.0f;\nfloat deg_c = volts / 0.01f;\nprintf("counts=%u volts=%.2f temp=%.1f C\\n", (unsigned)counts, volts, deg_c);',
          options: [
            'counts=26 volts=0.26 temp=26.1 C',
            'counts=26 volts=0.26 temp=26.0 C',
            'counts=26 volts=2.56 temp=256.0 C',
            'counts=26 volts=0.13 temp=13.0 C',
          ],
          answer: 'counts=26 volts=0.26 temp=26.1 C',
          explanation:
            'volts = 26 * 2.56 / 255 = 66.56 / 255 = 0.26102..., printed with %.2f as 0.26. Then deg_c = 0.26102... / 0.01 = 26.102..., printed with %.1f as 26.1. The %.1f rounding of 26.102 is 26.1, not 26.0.',
          hint: 'Compute 26 * 2.56 = 66.56 first, then divide by 255, then divide by 0.01.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt:
            'Name the four engineering constraints (one or two words each) that the lesson says shape embedded C: time, memory, and which two others?',
          answer: 'power and cost',
          explanation:
            'The four constraints are time (real-time behaviour), memory, power and cost/trust. Two must still be handled well even when the other two are met.',
          hint: 'Think about a battery-powered device that sells for one dollar.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Embedded system', definition: 'A computer dedicated to one task, built into a larger device and usually constrained by timing, memory, power and cost.' },
      { term: 'Microcontroller (MCU)', definition: 'A single chip integrating a CPU core, flash memory, SRAM and peripherals such as timers, UARTs and ADCs.' },
      { term: 'Firmware', definition: 'The program stored in an MCU\'s non-volatile flash memory; it starts at reset and normally never exits.' },
      { term: 'Bare metal', definition: 'Firmware running directly on hardware with no operating system; the application talks to registers itself.' },
      { term: 'Real-time', definition: 'A correctness requirement involving response time: hard deadlines must never be missed, soft deadlines may occasionally slip.' },
    ],
    revisionSummary: [
      'Embedded = dedicated task, inside a product, under time/memory/power/cost constraints.',
      'MCU integrates CPU + flash + SRAM + peripherals on one chip; microprocessors need external support chips.',
      'Firmware lives in flash, runs from reset, and never exits.',
      'Bare metal means no OS: your main loop and ISRs are the whole system.',
      'This course uses educational mock registers so every example runs on a host; real hardware requires vendor reference manuals.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Embedded system', url: 'https://en.wikipedia.org/wiki/Embedded_system', kind: 'article' },
      { label: 'Wikipedia — Microcontroller', url: 'https://en.wikipedia.org/wiki/Microcontroller', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'embc-m01-l2',
    title: 'Anatomy of a Microcontroller',
    summary:
      'Explore the blocks inside an MCU — CPU core, buses, flash, SRAM and peripherals — and learn the memory roles and clock tree that everything else builds on.',
    objectives: [
      'Draw the major blocks of a typical MCU and describe how the bus connects them.',
      'State the distinct roles of flash, SRAM and (where present) EEPROM.',
      'Explain what a peripheral is and why it is accessed through registers.',
      'Describe the clock tree at a concept level: oscillator, PLL and peripheral clocks.',
    ],
    whyItMatters:
      'Every register you ever write, every timing calculation you ever make, depends on knowing which block you are talking to and what clock drives it. Data sheets describe peripherals relative to this anatomy; without the map in your head, reference manuals are just noise.',
    prerequisites: ['embc-m01-l1'],
    explanation:
      'A microcontroller is a system-on-chip: several specialised blocks connected by internal buses, all running from one clock system. Understanding the blocks — and which memory serves which purpose — turns a 1000-page reference manual into a navigable map.\n\n### The CPU core\n\nThe core executes your compiled instructions. On small MCUs it is often an ARM Cortex-M (32-bit, used across the STM32, nRF and many other families) or an 8-bit AVR core (the ATmega328P on classic Arduino Uno boards). The core\'s exact instruction set differs per vendor and family — what stays conceptually identical is that the core reads instructions from flash, keeps working variables in SRAM, and talks to peripherals through registers.\n\n### Memories and their roles\n\n**Flash** is non-volatile program memory: it holds the firmware image plus constant data (`const` tables, strings) and survives power loss. It is read quickly but writing it is slow, block-based and special-purpose — firmware never writes its own code casually. **SRAM** is fast volatile working memory: variables, the stack and peripheral buffers live here, and it is wiped at every reset. Some MCUs also offer a small **EEPROM** for settings that must survive power yet be updated at runtime (calibration values, user preferences) — where EEPROM is absent, firmware typically emulates it in a reserved flash sector.\n\n### Peripherals: the self-working helpers\n\nA **peripheral** is a hardware module that does a specialised job — counting clock pulses (timers), shifting bytes out on a wire (UART, SPI), measuring voltages (ADC) or wiggling pins (GPIO). Peripherals run *in parallel with the CPU*: you configure them through registers, they keep working autonomously, and they signal completion through status flags and interrupts. This parallelism is why embedded C spends so much effort on status bits, flags and interrupt handling.',
    deepDive:
      '### The bus matrix\n\nBlocks talk over one or more internal buses. Conceptually there is a fast core bus (flash, SRAM, the interrupt controller) and slower peripheral buses (GPIO, timers, serial ports), and on many families they sit at different speeds. The practical consequence: reading a peripheral register can take several core clock cycles, which matters when you reach the optimization module. Another consequence is that peripherals are grouped by bus in the memory map, which is why register addresses cluster (for example, all of a family\'s GPIO ports consecutive).\n\n### The clock tree\n\nEverything digital marches to a clock. A typical MCU clock system looks like: a slow but precise crystal oscillator (or an internal RC oscillator, fast but less accurate) feeds a **phase-locked loop (PLL)** that multiplies it to the core frequency (say 8 MHz crystal times 9 = 72 MHz); divider networks then derive slower clocks for buses and peripherals. Two honest facts you will reuse constantly: timers usually run from a divided bus clock (that is what the prescaler math in the timer module divides), and UART baud rates depend on a clock whose accuracy directly causes framing errors — an internal RC oscillator can drift a few percent, which is marginal for high baud rates.\n\n### Reset behaviour\n\nAt reset, the core fetches its first instruction (or first stack pointer value, on Cortex-M) from a fixed flash address — the start of the **vector table**. Registers have defined **reset values** listed in the reference manual; a peripheral you never configure still has a known state. Reading the "reset value" column of a register description is one of the fastest ways to understand what a peripheral does before your code touches it.',
    examples: [
      {
        title: 'Registers are just memory at chosen addresses (illustrated with host-safe mocks)',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock: two neighbouring "registers" as plain variables.\n * On real hardware these would be FIXED ADDRESSES in the memory map,\n * defined by the vendor header, e.g. (illustrative, NOT host-runnable):\n *   #define MOCK_GPIOA_ODR (*(volatile uint32_t *)0x4001080Cu)\n * Dereferencing an arbitrary integer address on your PC is undefined\n * behaviour, so the host example uses variables instead. */\nvolatile uint32_t MOCK_GPIOA_ODR = 0; /* output data register  */\nvolatile uint32_t MOCK_GPIOA_IDR = 5; /* input data register   */\n\nint main(void) {\n    printf("ODR lives at %p\\n", (void *)&MOCK_GPIOA_ODR);\n    printf("IDR lives at %p\\n", (void *)&MOCK_GPIOA_IDR);\n    printf("ODR=%u IDR=%u\\n",\n           (unsigned)MOCK_GPIOA_ODR, (unsigned)MOCK_GPIOA_IDR);\n    return 0;\n}',
        explanation: [
          'The two mocks model neighbouring registers; on real silicon each sits at an address fixed by the vendor, and the commented `#define` shows the classic C idiom for naming such an address.',
          'The comment explicitly warns that casting an arbitrary integer to a pointer is undefined behaviour on a host PC — that is why the runnable mock uses variables.',
          '`%p` prints an address; the cast to `(void *)` is the correct argument type for `%p`.',
          'Actual addresses differ every run on a PC — on an MCU they would be constants from the data sheet. The point: a register is memory you can read and write like a variable, but whose *address and meaning* are fixed by the hardware.',
          'Expected output shape: two address lines (values machine-dependent) followed by `ODR=0 IDR=5`.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Simplified MCU block diagram',
        content:
          '                         +--------------------+\n     crystal 8 MHz ----->|  Clock: OSC -> PLL |---- 72 MHz core clock\n                         +---------+----------+\n                                   |\n  +-----------+   +---------+   +--+---------+   +-----------+\n  | CPU core  |---| Bus     |---| Flash 64K  |   | SRAM 20K  |\n  | (Cortex-M)|   | matrix  |   +------------+   +-----------+\n  +-----------+   +--+------+---+--------+---------+--------+\n                     |           |        |         |        |\n                +----+---+  +----+---+ +--+--+  +---+--+  +--+---+\n                |  GPIO  |  | Timer  | | UART|  | SPI  |  | ADC  |\n                +--------+  +--------+ +-----+  +------+  +------+\n                  pins...     count     serial   chips    volts\n                            & compare   link     link     in\n\n  Each peripheral exposes a small set of REGISTERS on the bus.',
        caption:
          'One clock feeds all blocks; the CPU reaches each peripheral through its registers. Structure is similar across STM32, ATmega and ESP32 families even though addresses differ.',
      },
    ],
    tables: [
      {
        caption: 'Memory roles inside an MCU',
        headers: ['Memory', 'Volatile?', 'Typical role', 'Written at runtime?'],
        rows: [
          ['Flash', 'No', 'Firmware image, const tables, strings', 'Only by a bootloader/programmer, block-wise'],
          ['SRAM', 'Yes (wiped at reset)', 'Variables, stack, buffers', 'Constantly, by running code'],
          ['EEPROM (where present)', 'No', 'Settings, calibration data', 'Yes, byte-wise, slowly, limited endurance'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming SRAM contents survive a reset or power cycle.',
        fix:
          'SRAM is volatile: reset wipes or reinitialises it (startup code zeroes .bss and copies .data — shown in the next lesson). Anything that must survive goes to EEPROM or a flash-emulated storage area.',
      },
      {
        mistake: 'Confusing the core clock with a peripheral clock.',
        fix:
          'The core may run at 72 MHz while a peripheral bus runs at 36 MHz and a timer ticks even slower after its own prescaler. Timing calculations must always use the clock that actually feeds the peripheral, as documented in the vendor manual.',
      },
      {
        mistake: 'Treating "register" as a CPU register (like r0 or eax).',
        fix:
          'In embedded C, "register" almost always means a *peripheral register*: one memory-mapped word of configuration or status in a hardware block. CPU registers are never manipulated directly from C.',
      },
    ],
    guidedPractice: {
      title: 'Map a program to MCU resources',
      brief:
        'Consider a firmware program with: a 2 KB `const` font table, a 40-byte sensor history buffer, a 200-byte call stack at the deepest point, and a user setting the product remembers across power cycles. Decide where each item lives (flash, SRAM, EEPROM) and justify each answer.',
      expectedBehavior:
        'Font table: flash (const, never changes). History buffer and stack: SRAM (change constantly, volatile). User setting: EEPROM or emulated-EEPROM flash (must survive power, updated occasionally).',
      hints: [
        'Ask two questions: does it change at runtime, and must it survive power loss?',
        'Const data is placed in flash by the toolchain automatically.',
      ],
    },
    practiceExercises: [
      {
        title: 'Clock chain arithmetic',
        brief:
          'An MCU has an 8 MHz crystal, a PLL that multiplies by 9, a peripheral bus divider of 2, and a timer that divides its bus clock by 2. What frequency does the timer input tick at?',
        expectedBehavior:
          'Core: 8 MHz * 9 = 72 MHz. Bus: 72/2 = 36 MHz. Timer input: 36/2 = 18 MHz. Each stage divides or multiplies the previous stage.',
        hints: [
          'Work through the chain in order: crystal, PLL, bus divider, peripheral divider.',
          'Keep units: MHz in every stage makes mistakes obvious.',
        ],
      },
      {
        title: 'Explain the parallelism',
        brief:
          'In two or three sentences, explain why configuring a timer once and letting it count "by itself" is more efficient than a software loop that increments a counter variable — and name the mechanism by which the timer tells the CPU it overflowed.',
        expectedBehavior:
          'The hardware timer counts autonomously in parallel with the CPU, so the CPU is free for other work and the count is exact regardless of loop timing. The timer signals overflow via a status flag and/or an interrupt request.',
        hints: [
          'Compare "CPU cycles per count" for hardware versus a software loop.',
          'Two notification mechanisms exist: polling a flag, or receiving an interrupt.',
        ],
      },
    ],
    assessment: {
      title: 'MCU anatomy checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Where do non-const runtime variables live?',
          options: ['SRAM', 'Flash', 'EEPROM', 'PLL'],
          answer: 'SRAM',
          explanation:
            'Runtime variables live in SRAM; flash holds code and constants; EEPROM (where present) holds settings that must survive power.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What is a peripheral register?',
          options: [
            'A memory-mapped word of hardware configuration or status',
            'A CPU register like r0',
            'A variable in SRAM',
            'A file on the host PC',
          ],
          answer: 'A memory-mapped word of hardware configuration or status',
          explanation:
            'Peripheral registers are fixed addresses on the internal bus through which software configures and reads hardware blocks.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'After configuring a timer, the CPU must execute an instruction for every tick the timer counts.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'Timers count autonomously from their clock input; the CPU only configures them and later reads the count or services the overflow interrupt.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Which column of a vendor register description tells you what the peripheral contains immediately after reset, before your code runs?',
          answer: 'the reset value',
          explanation:
            'Every register in a reference manual lists a reset value — the state the hardware guarantees before configuration.',
          hint: 'It is listed per-register in the reference manual.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Bus matrix', definition: 'The internal interconnect through which the CPU core reaches flash, SRAM and peripheral registers.' },
      { term: 'Peripheral', definition: 'A specialised hardware block (GPIO, timer, UART, ADC) that works in parallel with the CPU and is controlled via registers.' },
      { term: 'Memory-mapped I/O', definition: 'The scheme in which peripheral registers appear at fixed addresses in the same address space as RAM and flash.' },
      { term: 'Clock tree', definition: 'The oscillator, PLL and divider network that distributes derived clock frequencies to the core, buses and peripherals.' },
      { term: 'Vector table', definition: 'The fixed flash-resident table of addresses the hardware uses to find startup code and interrupt handlers.' },
    ],
    revisionSummary: [
      'MCU = core + bus + flash (code/consts) + SRAM (variables/stack) + peripherals.',
      'Peripherals run in parallel with the CPU and are driven through registers.',
      'EEPROM or flash emulation stores settings that must survive power.',
      'The clock tree multiplies and divides one source into every block clock; timing math must use the right one.',
      'Reset values in the vendor manual define each register\'s pre-configuration state.',
    ],
    furtherReading: [
      { label: 'Wikipedia — System on a chip', url: 'https://en.wikipedia.org/wiki/System_on_a_chip', kind: 'article' },
      { label: 'developer.arm.com — Arm Cortex-M processors', url: 'https://developer.arm.com/Processors/Cortex-M', kind: 'docs' },
      { label: 'Wikipedia — Clock signal', url: 'https://en.wikipedia.org/wiki/Clock_signal', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'embc-m01-l3',
    title: 'Toolchain, Startup and the Bare-Metal Mindset',
    summary:
      'Follow your C file from cross-compilation to flashed image, see what really happens between reset and main(), and adopt the defensive habits of bare-metal programming.',
    objectives: [
      'Describe each toolchain stage: preprocessor, compiler, assembler, linker, programmer.',
      'Explain why embedded development uses a cross-compiler.',
      'Outline the startup sequence: vector table, reset handler, .data copy, .bss zeroing, main.',
      'Adopt three bare-metal habits: no unbounded allocation, no exits, defensive initialisation.',
    ],
    whyItMatters:
      'When your board hangs before printing anything, the bug is usually in the invisible path between reset and main. Engineers who understand the startup sequence debug it in minutes; everyone else reads forums. This lesson also sets the ground rules for all the code style in the rest of the course.',
    prerequisites: ['embc-m01-l1', 'embc-m01-l2'],
    explanation:
      'On a PC, `gcc hello.c` produces an executable the local operating system knows how to load. Embedded builds are different: your code targets a *different* CPU, has no OS to load it, and no filesystem or console. The pipeline that bridges this gap is the **toolchain**.\n\n### From source to image\n\n1. The **preprocessor** expands `#include` and macros into one big translation unit.\n2. The **cross-compiler** translates C into assembly for the *target* CPU (for example ARM Thumb-2 for an STM32, or AVR instructions for an ATmega328P) — not for your PC. That is what *cross* means: the compiler runs on one architecture and emits code for another.\n3. The **assembler** turns that assembly into an object file; the **linker** merges object files and library archives, places each section at a concrete flash/RAM address using a **linker script**, and fixes up all addresses. The output (ELF, then typically a raw .bin or Intel .hex) is the firmware image.\n4. A **programmer/debugger probe** writes the image into flash over SWD, JTAG or a bootloader.\n\n### What happens before main()\n\nWhen power arrives, the hardware does a tiny, fixed thing: it loads the initial stack pointer and the reset handler address from the **vector table** at the start of flash (on Cortex-M), or simply jumps to address zero (on AVR). From there, C runtime **startup code** — written by the vendor or toolchain, usually invisible to you — prepares the C environment: copy the initial values of initialised globals from flash into RAM (the `.data` section), zero the remaining globals (`.bss`), optionally run C++ constructors, and finally call your `main()`. Nothing guarantees RAM started zeroed — that guarantee exists *because* startup code makes it true.\n\n### The bare-metal mindset\n\nThree habits follow directly. **Never exit**: there is nowhere to exit to; `main` ends in an infinite loop. **Never allocate unbounded memory**: no malloc-based growth, fixed-size buffers only. **Assume nothing about hardware state beyond documented reset values**: initialise every peripheral you use, every time.',
    deepDive:
      '### Why the linker script matters\n\nThe linker script is the document that maps sections to memory: `.text` (code) and `.rodata` (constants) go to flash; `.data` (initialised globals) gets a load address in flash and a run address in SRAM; `.bss` (zero-initialised globals) occupies SRAM only; the stack and (rarely) heap take what is left. When you later see a "firmware too big for flash" or "stack collides with variables" error, it is the linker enforcing this map. Most vendors ship a default linker script per chip, so you rarely edit it early on — but you should always know how much flash and RAM your build consumed, which the linker reports in its map file.\n\n### Watchdogs and the first moments\n\nIf a watchdog timer is enabled very early (or left running from a previous boot), your startup code must not spend too long before the first kick. A slow .data copy over a large buffer can reboot-loop a board whose watchdog is impatient — a real-world bug class worth knowing about before you meet watchdogs formally in the architecture module.\n\n### Where printf goes\n\nDesktop C writes printf to a console provided by the OS. Bare metal has no OS, so `printf` has no destination until you supply one — typically a character-by-character transmit routine over the UART (module 07) retargeted into the C library. That is why embedded logs arrive over a serial port, and why we build logging habits carefully rather than sprinkling printf everywhere.',
    examples: [
      {
        title: 'What startup code does, simulated in host-runnable C',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Host-side simulation of the reset-to-main sequence.\n * flash_image stands in for the .data initial values stored in flash.\n * ram_data / ram_bss stand in for SRAM, which powers up with garbage. */\nstatic uint32_t flash_image[2] = { 7u, 42u }; /* .data initialisers    */\nstatic uint32_t ram_data[2]    = { 0u, 0u };  /* .data run location   */\nstatic uint32_t ram_bss[3]     = { 0u, 0u, 0u }; /* .bss (to zero)    */\n\nstatic void mock_reset_startup(void) {\n    /* Startup step 1: copy .data initial values from flash to RAM. */\n    for (uint32_t i = 0u; i < 2u; i++) {\n        ram_data[i] = flash_image[i];\n    }\n    /* Startup step 2: zero .bss. */\n    for (uint32_t i = 0u; i < 3u; i++) {\n        ram_bss[i] = 0u;\n    }\n}\n\nint main(void) {\n    /* Pretend SRAM powered up with garbage: */\n    ram_data[0] = 99u;\n    ram_bss[0]  = 77u;\n    ram_bss[1]  = 123u;\n\n    mock_reset_startup();\n\n    printf("data=%u %u bss=%u %u %u\\n",\n           (unsigned)ram_data[0], (unsigned)ram_data[1],\n           (unsigned)ram_bss[0],  (unsigned)ram_bss[1],\n           (unsigned)ram_bss[2]);\n    return 0;\n}',
        explanation: [
          'The mock overwrites the arrays with garbage values first, modelling the fact that real SRAM powers up in an unknown state.',
          '`mock_reset_startup` performs the two jobs real startup code does: pull `.data` initial values from flash, and clear `.bss`.',
          'Trace: `ram_data` becomes `{7, 42}` and `ram_bss` becomes `{0, 0, 0}` regardless of the garbage written before.',
          'Output: `data=7 42 bss=0 0 0` — the C-language guarantee that globals start at their declared values is implemented by this code, not by magic.',
          'On real hardware this runs before `main` and you never see it; when a global "randomly" holds a non-zero value, a startup or linker-map bug is a prime suspect.',
        ],
      },
      {
        title: 'The never-exiting main (bare-metal skeleton)',
        language: 'c',
        code:
          '#include <stdint.h>\n\n/* Bare-metal skeleton. On a host this would spin forever, so it is\n * shown as the *shape* of real firmware rather than a runnable demo. */\nstatic volatile uint32_t system_ticks = 0u;\n\nint main(void) {\n    /* 1. Initialise every peripheral used (vendor-specific calls). */\n    /* clock_init(); gpio_init(); timer_init(); uart_init(); */\n\n    for (;;) {                       /* 2. The superloop: never exits. */\n        if (system_ticks >= 1000u) {\n            system_ticks = 0u;\n            /* periodic job: blink LED, poll sensors, ... */\n        }\n        /* 3. Idle work or sleep here; an interrupt increments ticks. */\n    }\n    /* return 0; -- unreachable: there is no OS to return to. */\n}',
        explanation: [
          '`main` initialises hardware once, then loops forever — the **superloop** pattern that most small firmware uses.',
          '`system_ticks` is `volatile` because a (future) timer interrupt will modify it while this loop watches it; the full rules arrive in the interrupt modules.',
          'There is no `return` from `main`: on real hardware nothing exists to return to.',
          'On a host this program never terminates — it is presented as the shape of real firmware, not a runnable demo.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Toolchain and startup pipeline',
        content:
          'BUILD TIME\n  main.c ──preprocess──> .i ──cross-compile──> .s ──assemble──> .o ─┐\n  drivers.c ──────────────────────────────────────────────> .o ─┤\n  libgpio.a ─────────────────────────────────────────────────────┤\n                                                                 v\n                              linker + linker script ──> firmware.elf\n                                                          └─> .bin/.hex\n\nFLASH TIME\n  debugger probe ──SWD/JTAG──> flash memory\n\nRUN TIME (every power-up)\n  reset ──> vector table ──> reset handler ──> copy .data\n        ──> zero .bss ──> call main() ──> superloop forever',
        caption:
          'The build pipeline produces an image for the *target* CPU; the startup sequence prepares the C environment before main() runs.',
      },
    ],
    tables: [
      {
        caption: 'Sections in a typical firmware image',
        headers: ['Section', 'Lives in', 'Contains', 'Startup action'],
        rows: [
          ['.text', 'Flash', 'Compiled code', 'None — executes in place'],
          ['.rodata', 'Flash', 'const data, string literals', 'None — read in place'],
          ['.data', 'Flash (initials) + SRAM (copy)', 'Initialised globals', 'Copied flash -> SRAM'],
          ['.bss', 'SRAM', 'Zero-initialised globals', 'Zeroed'],
          ['stack', 'SRAM (top)', 'Local variables, call frames', 'Stack pointer loaded from vector table'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Returning from main or calling exit() in bare-metal firmware.',
        fix:
          'There is no OS to return to. End main with an infinite loop; if a fatal error occurs, enter a safe state, log, and loop or reset deliberately.',
      },
      {
        mistake: 'Believing a global variable is zero "because C says so" without understanding who zeroes it.',
        fix:
          'C guarantees it only because startup code zeroes .bss before main. If you use a custom startup or run code before it, the guarantee can vanish. Know that the guarantee has a mechanism.',
      },
      {
        mistake: 'Ignoring linker output ("it compiled, so it fits").',
        fix:
          'Compilation success says nothing about fitting in flash or RAM — only the link does, and even then stack usage is not fully checked. Read the size summary and map file; overflow bugs appear at runtime otherwise.',
      },
    ],
    guidedPractice: {
      title: 'Trace the boot sequence on paper',
      brief:
        'Write the ordered list of events from power-on to the first line of your superloop, for a Cortex-M style MCU, including the two RAM operations startup performs and where each operation reads from and writes to.',
      expectedBehavior:
        'Power on -> hardware loads initial stack pointer and reset address from the vector table -> reset handler runs -> copy .data initial values from flash to SRAM -> zero .bss in SRAM -> call main -> peripheral init -> superloop. RAM ops: .data copy (flash to SRAM) and .bss zeroing (in SRAM).',
      hints: [
        'The vector table supplies two values before any of your code runs.',
        'Only two memory housekeeping steps happen between reset and main.',
      ],
    },
    practiceExercises: [
      {
        title: 'Predict the mock startup output',
        brief:
          'In the mock startup example, change flash_image to {5, 6} and the fake garbage writes to ram_bss[2] = 200. Predict the exact printed line before running or tracing.',
        expectedBehavior:
          'data=5 6 bss=0 0 0 — startup overwrites both the .data copy and all .bss garbage, so every traced value matches the flash image or zero.',
        hints: [
          'The garbage writes happen before startup, so they are all erased.',
          'flash_image only has two entries; ram_bss is entirely zeroed.',
        ],
      },
      {
        title: 'Identify the toolchain stage',
        brief:
          'Match each symptom to a stage: (a) "undefined reference to uart_send", (b) "region FLASH overflowed by 312 bytes", (c) a macro expanding wrongly. Explain which tool reads the linker script and what it decides.',
        expectedBehavior:
          '(a) linker — a symbol no object file defines. (b) linker — the image does not fit the region declared in the linker script. (c) preprocessor. The linker reads the linker script and decides where each section and symbol is placed in flash and SRAM.',
        hints: [
          'Missing symbols and region overflow are both link-time errors.',
          'Macro expansion happens before compilation begins.',
        ],
      },
    ],
    assessment: {
      title: 'Toolchain and startup checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What makes a compiler a *cross*-compiler?',
          options: [
            'It runs on one CPU architecture and emits code for another',
            'It compiles across multiple files at once',
            'It needs a network connection',
            'It only compiles C, not C++',
          ],
          answer: 'It runs on one CPU architecture and emits code for another',
          explanation:
            'Cross-compilation targets a different architecture than the build machine — e.g. an x86 laptop building ARM Cortex-M firmware.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which startup step guarantees that an uninitialised global reads as zero in main()?',
          options: [
            'Zeroing the .bss section',
            'The flash being erased',
            'The CPU cache being flushed',
            'The watchdog timer',
          ],
          answer: 'Zeroing the .bss section',
          explanation:
            'Startup code zeroes .bss (uninitialised/zero-initialised globals) in SRAM; SRAM itself powers up with arbitrary contents.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'On real hardware, the first values the CPU fetches after reset come from the vector table.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'On Cortex-M the initial stack pointer and reset handler address come from the vector table; other cores similarly jump to a fixed flash address.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Where is a `const` lookup table placed by the linker?',
          options: ['Flash (.rodata)', 'SRAM (.data)', 'EEPROM', 'The stack'],
          answer: 'Flash (.rodata)',
          explanation:
            'Const data is read-only, so the linker places it in flash alongside the code, saving precious SRAM.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt: 'A teammate writes bare-metal firmware whose main() ends with `return 0;` after printing an error. What is wrong and what should they do instead?',
          options: [
            'main must never return; enter a safe infinite loop (or deliberate reset) after fatal errors',
            'Nothing; returning is fine because C requires it',
            'They should call exit(1) instead',
            'They should print more before returning',
          ],
          answer: 'main must never return; enter a safe infinite loop (or deliberate reset) after fatal errors',
          explanation:
            'With no OS there is nothing to return to; the CPU would run off into undefined code. A controlled infinite loop or reset keeps the system in a known state.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Cross-compiler', definition: 'A compiler that runs on one architecture and emits machine code for another (the target MCU).' },
      { term: 'Linker script', definition: 'The input that tells the linker where each section (.text, .data, .bss, stack) is placed in flash and RAM.' },
      { term: 'Vector table', definition: 'A fixed table at the start of flash holding the initial stack pointer and handler addresses, used at reset and for interrupts.' },
      { term: 'Startup code', definition: 'The invisible C-runtime routine that copies .data, zeroes .bss and calls main before any application code runs.' },
      { term: 'Superloop', definition: 'The never-exiting for(;;) loop that constitutes the whole program flow of bare-metal firmware.' },
    ],
    revisionSummary: [
      'Pipeline: preprocess -> cross-compile -> assemble -> link (with linker script) -> flash via probe.',
      'Startup: vector table -> reset handler -> copy .data -> zero .bss -> main.',
      'Globals start at their values because startup code makes it so, not automatically.',
      'Bare metal rules: never exit, fixed memory only, initialise everything you use.',
      'Logs need a destination you build — usually the UART from module 07.',
    ],
    furtherReading: [
      { label: 'Wikipedia — GNU toolchain (concept of cross-compilation)', url: 'https://en.wikipedia.org/wiki/GNU_toolchain', kind: 'article' },
      { label: 'Wikipedia — Linker (computing)', url: 'https://en.wikipedia.org/wiki/Linker_(computing)', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
