import type { TutorialLesson } from '../types';

export const module04Lessons: TutorialLesson[] = [
  {
    id: 'mcu-m04-l1',
    title: 'Cortex-M Profile: Register Bank, NVIC and CMSIS',
    summary:
      'The professional 32-bit default: the Arm Cortex-M register bank (R0-R15, banked stack pointers), the NVIC\'s vectored nested interrupts, and CMSIS — the standardization layer that makes vendor code readable (per developer.arm.com).',
    objectives: [
      'Name the Cortex-M register bank: R0-R12 general-purpose, R13 SP (banked MSP/PSP), R14 LR, R15 PC, and xPSR flags.',
      'Explain the NVIC: vectored interrupts, priority-based nesting, and why latency is deterministic.',
      'Describe CMSIS and what it standardizes across dozens of vendors (per developer.arm.com).',
      'Contrast the Cortex-M interrupt model with the AVR\'s, and state what it changes for ISR code.',
    ],
    whyItMatters:
      'Cortex-M is what most of the industry\'s 32-bit embedded runs on — from wearables to cars. Its register bank, hardware-stacked interrupt context, and NVIC are the reason ISR code looks the same on a $0.50 chip and a $50 one, and CMSIS is the reason vendor code is learnable at all. After this lesson, the RP2040 (next lesson) is a special case you already understand.',
    prerequisites: [
      'AVR register model (mcu-m02-l2) — for contrast',
      'Embedded C: functions, stacks, interrupts (Embedded C course)',
    ],
    explanation:
      'The **Cortex-M** is Arm\'s microcontroller processor profile: 32-bit, Thumb/Thumb-2 instruction set, built for deterministic interrupt-driven C (facts per developer.arm.com). Its register bank:\n\n- **R0-R12**: general-purpose registers (the C compiler\'s working variables).\n- **R13 = SP, the stack pointer — banked**: MSP (main stack pointer, used by reset/interrupt-class code) and PSP (process stack pointer, used by RTOS tasks). Banking is what lets an RTOS give each task its own stack while interrupts stay on a private one.\n- **R14 = LR** (link register — return address), **R15 = PC** (program counter).\n- **xPSR**: the status flags (condition codes, interrupt state).\n\n### NVIC: vectored, nested, deterministic\n\nThe **Nested Vectored Interrupt Controller** is part of the processor, not a bolt-on peripheral. **Vectored**: each interrupt source has its own handler address in a vector table — no shared dispatch. **Nested**: a higher-priority interrupt preempts a lower one, automatically. **Deterministic**: entry latency is a small, documented cycle count because the hardware stacks the caller state (xPSR, PC, LR, R12, R0-R3) *for you* before the C handler runs — your ISRs are plain C functions with standard names.\n\n### CMSIS: the portability layer\n\n**CMSIS** (Cortex Microcontroller Software Interface Standard) is Arm\'s standardized header/Function layer (per developer.arm.com): core register names, NVIC functions, SysTick setup, and intrinsic operations — identical names across every vendor\'s Cortex-M chip. Vendor libraries add their own peripheral registers on top. The practical effect: `NVIC_EnableIRQ(IRQn)` means the same thing everywhere, and reading one Cortex-M vendor\'s code prepares you for all of them.',
    deepDive: '### What hardware-stacking changes about your ISR code\n\nOn the AVR (Module 2), ISR entry/exit is compiler-managed but simpler in shape; the Cortex-M hardware stacks R0-R3, R12, LR, PC and xPSR *before* your C function runs, and unstacks after — so a Cortex-M ISR is literally a normal C function with no special prologue, callable-safe by construction. Two consequences worth owning: (1) ISR latency is bounded and documented (a cycle-class figure in Arm\'s documentation — verify per core), which is the determinism claim from mcu-m01-l1 made architectural; (2) priorities are real — a mis-set priority inverts your system\'s assumptions silently, so NVIC priority assignments belong in your design review, not in scattered init code. The RTOS connection: MSP/PSP banking is *why* FreeRTOS-class kernels port to every Cortex-M unchanged.\n\n### Why the same architecture spans $0.50 to $50\n\nArm licenses the architecture; vendors (ST, NXP, Nordic, Raspberry Pi, dozens more) build chips around it with different peripherals, memory and process. The core contract — register bank, NVIC, CMSIS — stays fixed while the wrapper varies. For you this means: learn the core once (this lesson), learn peripheral maps per vendor (datasheets), and your skills compound across the industry instead of resetting per chip — the professional logic behind the family survey\'s "professional breadth" column.',
    examples: [
      {
        title: 'Cortex-M vs AVR interrupt models, side by side (family-level shapes)',
        language: 'text',
        code:
          'AVR (ATmega328P, per Microchip datasheet):\n  - fixed vector table, shared ISR entry overhead\n  - single stack pointer (SP) for everything\n  - priorities: fixed interrupt priority order\n  - ISR: compiler-generated save/restore of used regs\n\nCortex-M (per developer.arm.com):\n  - vector table of per-IRQ handler addresses (vectored)\n  - BANKED SPs: MSP (kernel/ISR) + PSP (RTOS tasks)\n  - NVIC: programmable priorities, hardware nesting\n  - hardware stacks R0-R3, R12, LR, PC, xPSR on entry\n    -> ISR is a PLAIN C FUNCTION\n  - deterministic entry latency (cycle-class, per core docs)\n\nWhat this changes for you:\n  - ISR code: write normal C; no register-save ceremony\n  - RTOS: possible on every Cortex-M (PSP banking)\n  - priorities: a design artifact you must own deliberately',
        explanation: [
          'The AVR column is the Module 2 baseline: fixed priorities, single stack, compiler ceremony.',
          'The Cortex-M column names the three upgrades: vectored table, banked stack pointers, hardware context stacking — each mapped to its practical consequence.',
          '"ISR is a plain C function" is the headline: the hardware does the ABI work, which is why Cortex-M ISRs read like ordinary code.',
          'The closing rows turn architecture into practice: priorities are now a design responsibility, and RTOS portability is structural.',
          'Family-level shapes per Arm documentation; exact latency cycles and per-core details verify against developer.arm.com for your core.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Cortex-M interrupt entry (hardware-stacked context)',
        content:
          ' main code running (PSP or MSP)\n      |\n   IRQ asserted, NVIC arbitrates by priority\n      |\n      v\n  HW auto-stacks: xPSR, PC, LR, R12, R0-R3\n      |                            (8 registers, hardware)\n      v\n  switch to MSP; vector fetch\n      |\n      v\n  your C handler runs (plain function)\n      |\n      v\n  HW auto-unstacks; resume exactly where interrupted\n\n  higher-priority IRQ may preempt the handler (nesting)',
        caption:
          'The hardware owns the calling convention at interrupt boundaries: bounded latency in, seamless resume out.',
      },
    ],
    tables: [
      {
        caption: 'The Cortex-M register bank (per developer.arm.com)',
        headers: ['Register', 'Role', 'Note'],
        rows: [
          ['R0-R12', 'General purpose', 'Compiler working set; R0-R3 pass arguments'],
          ['R13 (SP)', 'Stack pointer — BANKED', 'MSP for kernel/ISRs; PSP for RTOS tasks'],
          ['R14 (LR)', 'Link register', 'Return address'],
          ['R15 (PC)', 'Program counter', 'Execution pointer'],
          ['xPSR', 'Program status', 'Flags + interrupt/exception state'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Adding register-save ceremony to Cortex-M ISRs "to be safe".',
        fix: 'The hardware stacks the caller-saved context for you; extra manual saves are dead weight. Write ISRs as plain C functions — the determinism claim depends on the hardware path staying lean.',
      },
      {
        mistake: 'Leaving NVIC priorities at defaults and assuming "it will nest correctly".',
        fix: 'Priorities are design data: which interrupt may preempt which is a system decision (motor faults above logging, etc.). Assign and document them deliberately — silent priority inversions are debuggers\' favorite mysteries.',
      },
      {
        mistake: 'Assuming CMSIS gives you peripheral registers.',
        fix: 'CMSIS standardizes the CORE (NVIC, SysTick, intrinsics); peripheral register maps remain vendor-specific (their headers/datasheets). The layering — CMSIS core + vendor peripherals — is the literacy that makes vendor code navigable.',
      },
    ],
    guidedPractice: {
      title: 'Interrupt priority design',
      brief:
        'A Cortex-M system runs: motor fault detect (must react in <50 µs), UART logging (can wait), and a 1 kHz control loop (must run on time). Assign relative NVIC priorities and justify each; state the failure mode if logging outranks the control loop.',
      starterCode:
        'highest: ________ because ________\nmiddle : ________ because ________\nlowest : ________ because ________\nif logging outranks control: ________',
      expectedBehavior:
        'Highest: motor fault (hard safety bound, shortest handler). Middle: 1 kHz control loop (period-critical, bounded work). Lowest: logging (latency-tolerant, bursty, can buffer). If logging outranks control: a burst of log traffic delays control iterations — the loop misses its 1 ms deadline with no hardware complaint; the failure is subtle and periodic, exactly the kind priority review prevents.',
      hints: [
        'Rank by deadline hardness and handler length.',
        'Buffering converts latency-tolerant sources into lowest priority.',
        'The failure mode is missed deadlines, not crashes — subtler.',
      ],
    },
    practiceExercises: [
      {
        title: 'Banked SP reasoning',
        brief:
          'Explain in 3-4 sentences why an RTOS needs the PSP bank: what breaks if tasks and ISRs share one stack pointer.',
        expectedBehavior:
          'Each task needs its own stack (its call history, locals); ISRs need a guaranteed stack regardless of which task was preempted. With one SP, the RTOS must switch SP values on every context switch anyway, and ISR frames would interleave with task frames dangerously. Banking gives tasks the PSP and interrupts a private MSP: context switch = swap PSP; interrupts always land on solid ground — which is why RTOS ports to Cortex-M are clean.',
        hints: [
          'Tasks have independent call stacks — who guarantees the ISR\'s?',
          'The switch operation becomes trivial with banking.',
          'Reliability of ISR entry is the deep reason.',
        ],
      },
      {
        title: 'CMSIS layering audit',
        brief:
          'You read vendor code using: (a) NVIC_EnableIRQ(); (b) a peripheral register macro GPIOA_BSRR; (c) __disable_irq(). Classify each as CMSIS-core or vendor-specific, and state where you would verify each.',
        expectedBehavior:
          '(a) CMSIS-core (NVIC function — per developer.arm.com; same everywhere). (c) CMSIS-core intrinsic (core interrupt mask). (b) Vendor-specific peripheral register (ST-class naming) — verified in that vendor\'s reference manual/header. The layering audit is the skill: core names port; peripheral names do not.',
        hints: [
          'Does the name touch the core (NVIC, masks) or a peripheral?',
          'The vendor prefix in the name is the tell.',
          'Two different documents verify the two classes.',
        ],
      },
    ],
    assessment: {
      title: 'Cortex-M checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does the Cortex-M hardware do at interrupt entry?',
          options: [
            'Nothing — the compiler adds save/restore code',
            'Auto-stacks xPSR, PC, LR, R12 and R0-R3, then vectors to the handler — your ISR is a plain C function',
            'Disables all further interrupts until you re-enable them',
            'Switches the program counter to a shared dispatcher',
          ],
          answer: 'Auto-stacks xPSR, PC, LR, R12 and R0-R3, then vectors to the handler — your ISR is a plain C function',
          explanation:
            'The Cortex-M hardware performs the ABI work: eight registers stacked before the handler, unstacked after. Deterministic entry, seamless resume, plain-C ISRs (per developer.arm.com).',
          hint: 'Who owns the calling convention at IRQ boundaries?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'R13 is a single stack pointer shared by tasks and interrupts on all Cortex-M chips.',
          answer: 'false',
          explanation:
            'R13 is banked: MSP (main — kernel/ISR world) and PSP (process — RTOS tasks). Banking is the structural reason RTOSes port cleanly to Cortex-M.',
          hint: 'Which register was described as "banked"?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'What does CMSIS standardize?',
          options: [
            'Vendor peripheral register maps',
            'The Cortex-M core interface: NVIC functions, SysTick, core intrinsics — identical across vendors',
            'The C standard library',
            'Arduino APIs',
          ],
          answer: 'The Cortex-M core interface: NVIC functions, SysTick, core intrinsics — identical across vendors',
          explanation:
            'CMSIS covers the core (per developer.arm.com); peripheral maps remain vendor-specific. Layering: CMSIS core + vendor peripherals = portable skills, vendor datasheets.',
          hint: 'Core versus wrapper — which half is Arm\'s?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: the Cortex-M interrupt controller — vectored, nested, priority-arbitrated, part of the processor core itself.',
          answer: 'NVIC',
          explanation:
            'The Nested Vectored Interrupt Controller: per-IRQ vectors, programmable priorities with hardware nesting, deterministic entry. (Acronym accepted as the answer.)',
          hint: 'The four-letter acronym named throughout.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Register bank', definition: 'R0-R12 general, R13 SP (banked MSP/PSP), R14 LR, R15 PC, xPSR (per developer.arm.com).' },
      { term: 'NVIC', definition: 'Nested Vectored Interrupt Controller: per-IRQ vectors, programmable priorities, hardware nesting.' },
      { term: 'MSP / PSP', definition: 'Banked stack pointers: main (kernel/ISR) and process (RTOS tasks).' },
      { term: 'CMSIS', definition: 'Arm\'s standardized Cortex-M core interface layer — portable names across vendors.' },
      { term: 'Vectored interrupt', definition: 'Per-source handler addresses in a vector table — no shared dispatch.' },
    ],
    revisionSummary: [
      'Register bank: R0-R12, banked R13 (MSP/PSP), LR, PC, xPSR.',
      'NVIC: vectored + nested + deterministic; priorities are design data you own.',
      'Hardware context stacking makes ISRs plain C functions — no ceremony, bounded latency.',
      'CMSIS standardizes the core interface; peripherals stay vendor-specific (two documents to read).',
      'One architecture, many vendors: core skills compound across the industry.',
    ],
    furtherReading: [
      { label: 'Arm Cortex-M processor documentation', url: 'https://developer.arm.com/documentation', kind: 'docs' },
      { label: 'Arm developer — CMSIS', url: 'https://developer.arm.com/documentation/102264/latest', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'mcu-m04-l2',
    title: 'Raspberry Pi Pico and RP2040',
    summary:
      'The RP2040\'s clean design: dual Cortex-M0+ at 133 MHz, 264 KB SRAM, external QSPI flash, 3.3 V — plus PIO, its signature programmable-I/O state machines, and the Pico SDK vs MicroPython choice (per raspberrypi.com/documentation).',
    objectives: [
      'State the RP2040\'s architecture — dual Cortex-M0+ @133 MHz, 264 KB SRAM, external QSPI flash, 3.3 V — attributed to official documentation.',
      'Explain the PIO concept: small programmable state machines that implement custom digital interfaces in hardware-time.',
      'Compare the Pico SDK (C/C++) and MicroPython environments honestly.',
      'Describe BOOTSEL and the drag-and-drop programming model as board-level facts.',
    ],
    whyItMatters:
      'The RP2040 is the best-documented value MCU in the hobbyist-professional overlap, and PIO is a genuinely novel peripheral: instead of hoping a vendor peripheral matches your protocol, you *write* the I/O machine. Understanding PIO conceptually bridges this course and the FPGA course — it is a tiny configurable-logic block hiding inside a microcontroller, and it solves exactly the timing-critical bit-banging problems Module 2 hit.',
    prerequisites: [
      'Cortex-M profile (mcu-m04-l1)',
      'Bit-banging limits from the AVR lessons (mcu-m02-l2)',
    ],
    explanation:
      'The **RP2040** is Raspberry Pi\'s first microcontroller: **dual Cortex-M0+ cores at 133 MHz**, **264 KB SRAM**, flash connected externally via QSPI (boot code in ROM), **3.3 V logic**, rich peripherals, and — the differentiator — **PIO** (per raspberrypi.com/documentation). The Raspberry Pi Pico board exposes 26 GPIO, a USB port, and the **BOOTSEL** button: hold it while plugging in and the board mounts as a USB drive — drop a UF2 firmware file on it and it reprograms. No programmer hardware, no driver dance (board-level facts per the official documentation — verify pin maps there).\n\n### PIO in one paragraph\n\n**PIO** is two blocks of four **state machines**, each running a tiny program (a 9-instruction instruction set) from shared instruction memory, with direct access to GPIOs and FIFOs to the cores. A PIO program *is* your protocol: precise timing, shift registers, clock generation — executed in hardware-time, immune to software jitter. WS2812-class LEDs (the notorious 800 kHz ±150 ns timing), VGA-ish video tricks, and custom buses that no vendor peripheral speaks are PIO\'s home turf. The conceptual bridge: PIO is to MCU peripherals what the FPGA fabric is to fixed hardware — a small programmable structure where timing-critical I/O becomes *described* rather than *cycle-counted* (the FPGA course\'s vocabulary, miniaturized).',
    deepDive: '### SDK vs MicroPython: the honest trade\n\n**Pico SDK (C/C++)**: full performance, direct PIO programming, deterministic timing, the professional path — at the cost of a toolchain and C discipline. **MicroPython**: interactive, immediate, wonderful for learning and glue logic — at the cost of interpreter overhead (timing-critical loops are Python-speed) and a smaller feature reach. The decision is the same shape as Module 3\'s framework lesson: what does the timing require, and who is writing? A defensible hybrid exists and is common: MicroPython for the application, a compiled PIO program (loaded from either environment) owning the fast I/O — the layered solution again: hard timing in the lower layer, logic in the upper.\n\n### External flash and the boot story\n\nRP2040 keeps flash *off-chip* (QSPI), which is why the boot ROM exists: on normal power-up it runs from ROM, checks flash, and launches your image; with BOOTSEL held it presents USB mass storage instead. One engineering consequence: code executes from flash via a cache (XIP), so hot loops belong in SRAM when timing matters (the SDK\'s placement features handle this) — a small architecture fact with real timing consequences, and a nice contrast with the ATmega328P\'s in-place flash from Module 2.',
    examples: [
      {
        title: 'Why PIO exists: the WS2812 timing problem',
        language: 'text',
        code:
          'THE PROBLEM (WS2812-class LED protocol, per vendor specs):\n  one bit = a pulse: "1" = high ~800 ns, low ~450 ns\n                     "0" = high ~400 ns, low ~850 ns\n  tolerance: ~+/-150 ns. 24-32 bits per LED, hundreds of LEDs.\n\nSOFTWARE (Module 2 register style) on ANY core:\n  interrupt latency + cache misses + loop overhead\n  -> +/-150 ns is not meetable reliably in C. Period.\n\nPIO SOLUTION (conceptual):\n  a state machine runs a tiny program:\n    out pins, 1       ; drive next bit from FIFO\n    set pins, 1  [T1] ; high for T1 cycles\n    set pins, 0  [T2] ; low for T2 cycles\n  cycles counted by the SM clock -> nanosecond-accurate,\n  immune to what the C core is doing; FIFOs decouple the\n  software feed from the wire timing.\n\nTHE BRIDGE: this is a 9-instruction FPGA-in-miniature —\n  timing-critical I/O described as hardware structure,\n  exactly the FPGA course\'s answer, embedded in an MCU.',
        explanation: [
          'The problem statement quantifies why software fails: ±150 ns tolerance vs interrupt/cache jitter of the same order — a category error, not an effort problem.',
          'The PIO sketch shows the *shape* (drive bit, timed high, timed low) with the honest note that real syntax lives in the Raspberry Pi documentation.',
          'The FIFO decoupling is the architectural insight: software feeds bits at its own pace; the wire timing belongs to the state machine.',
          'The bridge line connects to the FPGA course deliberately: described hardware timing vs cycle-counted software — the same lesson at two scales.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'RP2040 system shape',
        content:
          '  +--------------------------------------------+\n  | CORE0 (your app)      CORE1 (app/RTOS/idle) |\n  |        264 KB SRAM (shared, banked)          |\n  |----------------------------------------------|\n  | PIO: 2 blocks x 4 state machines             |\n  |   tiny programs -> GPIOs, hardware timing    |\n  |----------------------------------------------|\n  | ROM boot -> QSPI flash (external, XIP cache) |\n  | 3.3 V I/O | BOOTSEL: USB mass-storage flash  |\n  +--------------------------------------------+\n  (family facts per raspberrypi.com/documentation;\n   Pico board adds regulators + 26 GPIO header)',
        caption:
          'Two Cortex-M0+ cores, shared SRAM, the PIO blocks as the signature peripheral, and a boot ROM that enables drag-and-drop programming.',
      },
    ],
    tables: [
      {
        caption: 'Pico SDK vs MicroPython (verify current capabilities in official docs)',
        headers: ['Dimension', 'Pico SDK (C/C++)', 'MicroPython'],
        rows: [
          ['Timing determinism', 'Full; PIO + SRAM placement', 'Interpreter overhead; PIO still available'],
          ['PIO programming', 'Native (C + PIO asm)', 'Supported (load prebuilt PIO)'],
          ['Learning curve', 'Toolchain + C discipline', 'Minutes to first blink'],
          ['Best fit', 'Products, timing-critical', 'Learning, glue, quick prototypes'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming PIO is "just another PWM peripheral".',
        fix: 'PIO is programmable: you write the state machine that *defines* the interface, including ones no vendor peripheral implements. That is its entire point — and why it belongs in the FPGA-course conversation, not the PWM row.',
      },
      {
        mistake: 'Expecting hot flash-resident loops to meet tight timing without checking XIP cache behavior.',
        fix: 'Code executes from external flash through a cache; misses cost microseconds-class stalls. Place timing-critical loops in SRAM (SDK features exist for this) — a small architecture fact with real consequences.',
      },
      {
        mistake: 'Wiring 5 V signals to Pico GPIOs.',
        fix: 'RP2040 is 3.3 V and not 5 V tolerant (mcu-m01-l3 rules, applied again). Dividers/shifters before the wire; the pre-wiring checklist never retires.',
      },
    ],
    guidedPractice: {
      title: 'Choose the environment and the mechanism',
      brief:
        'Two jobs on a Pico: (a) a classroom learns blink, buttons and reading a temperature sensor in one session; (b) a product drives 300 WS2812 LEDs with perfect color timing. For each: SDK or MicroPython, and software loop or PIO — with the decisive reason.',
      starterCode:
        '(a) environment: ______ mechanism: ______ reason: ________\n(b) environment: ______ mechanism: ______ reason: ________',
      expectedBehavior:
        '(a) MicroPython + plain GPIO — learning velocity is the goal; nothing here is timing-critical. (b) Pico SDK + PIO — the ±150 ns-class WS2812 timing is a hardware-time job (the lesson’s problem statement); software loops cannot meet it reliably, and the SDK owns native PIO authoring. The hybrid note: even in MicroPython, prebuilt PIO could own the LEDs — layering by timing need.',
      hints: [
        'Ask what the timing tolerance is before choosing the mechanism.',
        '(a) has no hard timing at all — velocity decides.',
        '(b) is literally this lesson’s worked problem.',
      ],
    },
    practiceExercises: [
      {
        title: 'PIO concept transfer',
        brief:
          'You learned FPGA Lab 6 (UART TX) with a bit-period counter in Verilog. Describe how a PIO state machine implements the same job, naming the equivalents: bit period (set x delays), shift register (out instruction), frame (program loop).',
        expectedBehavior:
          'PIO equivalents: the SM clock × set-x delay counts = the bit period (the DIV counter becomes side-set/delay fields); the `out` instruction shifts from the FIFO into pins = the shifter; the program wraps per bit, and a side-set/drive sequence handles start/stop framing. Same structure as the Verilog TX: hardware timing, software only feeds data — the transfer shows the concepts (bit periods, framing, FIFO decoupling) are architecture-independent.',
        hints: [
          'Map each Verilog construct to a PIO instruction class.',
          'Delays are counted in SM cycles — the DIV equivalent.',
          'The FIFO plays the testbench/data-feed role.',
        ],
      },
      {
        title: 'BOOTSEL flow explanation',
        brief:
          'Explain the BOOTSEL programming flow as board-level fact: what the boot ROM does with the button held vs released, and what file type lands on the mounted drive.',
        expectedBehavior:
          'Released: ROM checks QSPI flash, launches the valid image (normal boot). Held: ROM boots to USB mode presenting mass storage; you drag a UF2-format firmware file; the ROM flashes it and reboots. Consequence: no programmer hardware for standard use — a board-level convenience fact per the official Pico documentation (verify details there).',
        hints: [
          'Two boot paths: flash check vs USB mass storage.',
          'UF2 is the file format — a USB-friendly container.',
          'Board facts live in the official board documentation.',
        ],
      },
    ],
    assessment: {
      title: 'RP2040 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Per official documentation, what is the RP2040\'s architecture?',
          options: [
            'Dual Cortex-M0+ at 133 MHz, 264 KB SRAM, external QSPI flash, 3.3 V',
            'Dual Xtensa LX6 with Wi-Fi',
            '8-bit AVR at 16 MHz with 2 KB SRAM',
            'Single Cortex-M4 with internal 1 MB flash',
          ],
          answer: 'Dual Cortex-M0+ at 133 MHz, 264 KB SRAM, external QSPI flash, 3.3 V',
          explanation:
            'RP2040: two Cortex-M0+ cores at 133 MHz, 264 KB on-chip SRAM, flash off-chip via QSPI, 3.3 V I/O (per raspberrypi.com/documentation).',
          hint: 'The Arm-based family-survey row.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'PIO state machines execute tiny programs with cycle-accurate timing, making them immune to software jitter for wire-level protocols.',
          answer: 'true',
          explanation:
            'PIO runs 9-instruction-class programs in dedicated state machines: timing comes from counted cycles, FIFOs decouple the software feed — the answer to protocols software timing cannot meet.',
          hint: 'What owns the nanosecond-level timing?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Why can\'t a C software loop reliably drive WS2812-class LEDs (±150 ns pulse tolerance)?',
          options: [
            'C is too slow as a language',
            'Interrupt latency, cache/flash stalls and loop overhead produce jitter of the same order as the tolerance',
            'The GPIO hardware cannot switch that fast',
            'USB interference corrupts the timing',
          ],
          answer: 'Interrupt latency, cache/flash stalls and loop overhead produce jitter of the same order as the tolerance',
          explanation:
            'The tolerance is nanosecond-class; software timing on a cached, interrupt-driven core jitters at the same scale — a category mismatch. PIO (or hardware peripherals) owns wire timing.',
          hint: 'Compare the tolerance to the jitter sources.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: the Pico board button that, when held at power-up, presents the board as a USB mass-storage device for drag-and-drop firmware.',
          answer: 'BOOTSEL',
          explanation:
            'BOOTSEL selects the boot ROM’s USB-mass-storage path — UF2 files drop onto the mounted drive. A board-level fact per the official Pico documentation.',
          hint: 'The button named in the boot story.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'RP2040', definition: 'Dual Cortex-M0+ @133 MHz, 264 KB SRAM, external QSPI flash, 3.3 V (per official docs).' },
      { term: 'PIO', definition: 'Programmable I/O: 2 blocks × 4 state machines implementing custom digital interfaces in hardware time.' },
      { term: 'XIP', definition: 'Execute-in-place: code runs from external flash through a cache — hot loops belong in SRAM.' },
      { term: 'BOOTSEL', definition: 'Board button selecting the boot ROM’s USB mass-storage programming path (UF2).' },
      { term: 'UF2', definition: 'USB Flashing Format: the drag-and-drop firmware container for Pico-class boards.' },
    ],
    revisionSummary: [
      'RP2040: dual M0+ at 133 MHz, 264 KB SRAM, external flash with XIP cache, 3.3 V.',
      'PIO = tiny programmable state machines: wire timing in hardware, software just feeds FIFOs.',
      'Software loops cannot meet nanosecond-class protocols — that is a category fact, not an effort problem.',
      'SDK vs MicroPython: determinism vs velocity; hybrid (PIO below, Python above) is common.',
      'BOOTSEL/UF2 makes programming programmerless — verify board details in official docs.',
    ],
    furtherReading: [
      { label: 'Raspberry Pi Pico documentation', url: 'https://www.raspberrypi.com/documentation/microcontrollers/', kind: 'docs' },
      { label: 'RP2040 datasheet (Raspberry Pi)', url: 'https://www.raspberrypi.com/documentation/microcontrollers/rp2040.html', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'mcu-m04-l3',
    title: 'Bare-Metal Cortex-M Blink, Conceptually',
    summary:
      'What "no SDK" means: startup code, clock configuration, and GPIO setup as a concept-level pseudocode walkthrough — explicitly labeled not-runnable, with the map of what a vendor SDK does for you.',
    objectives: [
      'Describe the boot sequence from reset vector to main(): vector table, reset handler, runtime init, clock setup.',
      'Write the concept-level pseudocode chain: enable GPIO clock -> configure mode -> drive the pin — naming what each step addresses.',
      'Explain why "enable the peripheral clock first" is Cortex-M orthodoxy (and the classic bare-metal bug).',
      'Map each pseudocode step to what a vendor SDK/startup file supplies, so SDK users know what they are skipping.',
    ],
    whyItMatters:
      'Every embedded engineer eventually meets bare metal: a board that does nothing because three registers were never written. This lesson is the anatomy of those registers — taught as pseudocode precisely because real code is vendor-specific and this platform runs nothing. After it, SDK magic (startup files, SystemInit) becomes visible machinery instead of incantation, and the Module 2 lesson\'s "what the runtime hides" repeats at a deeper level.',
    prerequisites: [
      'Cortex-M register bank and NVIC (mcu-m04-l1)',
      'AVR register model (mcu-m02-l2) — the parallel',
      'Datasheet-first method (mcu-m01-l3)',
    ],
    explanation:
      'Bare metal means your code is the first thing that runs. On a Cortex-M, power-up lands at the **reset vector**: the CPU fetches the initial stack pointer and the reset handler address from the **vector table** (in flash), and jumps. Your (or the SDK\'s) reset handler then:\n\n1. **Runtime init**: copy initialized data from flash to RAM, zero the BSS (uninitialized globals) — the C environment contract.\n2. **Clock setup**: configure the clock tree (crystal, PLLs, dividers) to the target frequency. Before this, the chip runs from a safe internal reset clock.\n3. **Copy the stack pointer, call main().**\n\nOnly now does application code run — and the first application-level job for a blink is GPIO, which on Cortex-M class devices has a gate in front of it: **peripheral clocks**. Most peripherals sit behind a clock-enable register (vendor-specific naming); an unclocked peripheral ignores every write silently. "Enable the peripheral clock first" is the orthodoxy — and the classic bare-metal bug is blinking at a register that is gated off.\n\nThe GPIO configure step sets: mode (output), output type, speed class, and initial level — vendor register names vary (a vendor BSRR-class set/reset register is common for atomic writes); the *sequence* is universal.\n\n### The honesty label\n\nReal register names, addresses, and clock-tree registers are vendor-specific and must come from that vendor\'s reference manual — this lesson deliberately uses pseudocode and generic names. Nothing here compiles or runs on this platform; the runnable versions are SDK projects on real hardware, and the SDK-supplied pieces are mapped at the end so you know exactly what you skipped.',
    deepDive: '### What the vendor SDK\'s startup file actually does\n\nWhen an SDK project "just blinks", its startup file performed: the vector table (including your handler names), the reset handler, data/BSS init, clock-tree configuration (often a SystemInit() with the vendor\'s register sequence), and the call into main(). The pseudocode chain of this lesson is that file, read slowly. Two debugging consequences: (1) a "dead" board with valid code usually died in this hidden layer — wrong clock config or a HardFault before main (a vector-table/checksum issue); (2) linker scripts belong to this layer too — flash/RAM addresses and section placement are decisions, not defaults, and mis-sized regions fail at link time by design.\n\n### The blink loop in bare metal: no runtime, no API\n\nWith SDK removed, the delay is yours: a calibrated busy-wait loop (fragile — compiler may optimize it away without volatile; cycle counts depend on the clock you configured), or better, the SysTick timer (part of the Cortex-M core, CMSIS-standardized — the portable way to count time). The lesson\'s blink pseudocode uses SysTick deliberately: it is the first CMSIS name worth meeting in bare metal, and it demonstrates the layering — core services are standard (CMSIS), everything else is vendor. The FPGA course\'s counter-blink returns here in software form: same problem (make time), different medium.',
    examples: [
      {
        title: 'Bare-metal Cortex-M blink: concept pseudocode (NOT runnable — teaching form)',
        language: 'c',
        code:
          '/* =============================================================\n   CONCEPT PSEUDOCODE — generic names, no vendor registers.\n   NOT compilable, NOT runnable on this platform. Real versions:\n   vendor reference manual for register names + SDK for startup.\n   ============================================================= */\n\n/* 1. RESET (hardware): SP and reset-pc loaded from the\n      vector table; reset handler runs. */\n\nvoid Reset_Handler(void)\n{\n    /* 2. Runtime init (the C environment contract) */\n    copy_data_flash_to_ram();\n    zero_bss();\n\n    /* 3. Clock tree to target frequency (vendor registers).\n       Until this: safe internal reset clock. */\n    clock_configure(CRYSTAL, PLL, TARGET_MHZ);\n\n    /* 4. Call the application. */\n    main();\n}\n\nint main(void)\n{\n    /* 5. ENABLE THE GPIO PERIPHERAL CLOCK FIRST.\n       Unclocked peripherals ignore all writes silently. */\n    RCC_GPIOA_ENABLE();                 /* vendor-specific gate */\n\n    /* 6. Configure the pin: output mode, initial low. */\n    GPIOA_MODE(5, OUTPUT);\n    GPIOA_WRITE(5, LOW);\n\n    /* 7. SysTick: the CMSIS-standard core timer for time. */\n    systick_configure_1ms();\n\n    for (;;) {\n        GPIOA_TOGGLE(5);                /* vendor set/reset reg */\n        delay_ms_via_systick(500);      /* 1 Hz blink, non-busy */\n    }\n}',
        explanation: [
          'The header label is the honesty contract: concept pseudocode, generic names, not runnable — real names come from the vendor reference manual, real startup from the SDK.',
          'Steps 1-4 are the boot chain from this lesson’s explanation: vector table -> reset handler -> runtime init -> clock tree -> main(). The SDK’s startup file performs exactly these.',
          'Step 5 is the orthodoxy called out in capital emphasis: the peripheral clock gate precedes any GPIO register write — the classic bare-metal bug is skipping it.',
          'Step 6 names the *sequence* (mode, initial level) in generic terms; vendor naming varies (BSRR-class atomic set/reset registers are common) — deliberately not quoted.',
          'Step 7 chooses SysTick over a busy-wait: the CMSIS-standard core timer — portable by design (mcu-m04-l1’s layering, applied), and the non-busy delay echoes Module 2’s millis() pattern.',
          'The comment chain maps every step to its SDK supplier — the lesson’s stated goal of making SDK magic visible.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'From power to blink: the full bare-metal chain',
        content:
          ' POWER\n   |\n   v\n vector table (flash): initial SP + reset handler\n   |\n   v\n reset handler: data/BSS init -> clock tree -> main()\n   |                        (SDK startup file does this)\n   v\n main(): peripheral clock gate -> GPIO config -> SysTick\n   |\n   v\n loop: toggle pin, wait via SysTick  <-- the blink\n\n Vendor SDK supplies: vector table, startup, clock code,\n linker script, CMSIS headers. You supply: the loop.',
        caption:
          'The SDK-hidden layer, unfolded. Bare metal is knowing this chain well enough to debug it when it breaks.',
      },
    ],
    tables: [
      {
        caption: 'Pseudocode step -> who supplies it in a real SDK project',
        headers: ['Step', 'Supplier in SDK flow', 'Where to verify'],
        rows: [
          ['Vector table + reset handler', 'Startup file (vendor/CMSIS)', 'Vendor SDK sources'],
          ['data/BSS init', 'Startup file (C contract)', 'Toolchain docs'],
          ['Clock tree config', 'SystemInit() / vendor HAL', 'Vendor reference manual'],
          ['Peripheral clock gates', 'Your code (or HAL init)', 'Vendor reference manual'],
          ['GPIO mode/level', 'Your code (or HAL)', 'Vendor reference manual'],
          ['SysTick / time', 'CMSIS core functions', 'developer.arm.com'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing GPIO registers without enabling the peripheral clock first.',
        fix: 'Unclocked peripherals silently ignore writes — the #1 bare-metal bug. The orthodoxy: clock gate, then configure, then drive; the vendor reference manual lists the gate register.',
      },
      {
        mistake: 'Writing a delay loop without volatile and trusting the compiler to keep it.',
        fix: 'An empty loop with no volatile side effects may be optimized to nothing. Use volatile counters, or — properly — SysTick-based delays (CMSIS-standard). Time made by software must survive optimization.',
      },
      {
        mistake: 'Believing this pseudocode is portable to any Cortex-M chip by find-and-replace.',
        fix: 'The *sequence* is universal; the names and addresses are vendor-specific by design. Real ports happen against the vendor reference manual — this lesson teaches the shape and the SDK mapping, deliberately in generic form.',
      },
    ],
    guidedPractice: {
      title: 'Debug the dead board (conceptual)',
      brief:
        'A bare-metal Cortex-M board shows no blink. State the first three things to verify, in order, using this lesson’s chain: (a) is the vector table/reset handler sound? (b) is the clock tree configured (or does main even run)? (c) is the GPIO peripheral clock enabled? For each, name the symptom class that would point there.',
      starterCode:
        '(a) check: ______ symptom class: ________\n(b) check: ______ symptom class: ________\n(c) check: ______ symptom class: ________',
      expectedBehavior:
        '(a) Verify reset/vector integrity (correct table, valid image) — symptom: nothing at all, debugger can\'t even halt at main (a pre-main death/HardFault). (b) Verify clock config and that main() actually executes (debugger breakpoint, or a heartbeat before GPIO) — symptom: main never reached or runs at wrong speed (delays wildly off). (c) Verify the GPIO clock gate before register writes — symptom: main runs, everything else works, only the GPIO ignores writes.',
      hints: [
        'Debug in boot order — the chain gives the order.',
        'A debugger breakpoint at main() is the fastest (b) probe.',
        '(c)’s signature is: code runs, one peripheral deaf.',
      ],
    },
    practiceExercises: [
      {
        title: 'Startup file reading plan',
        brief:
          'You open a vendor SDK project and find startup_vendor.s and system_vendor.c. Map each file to this lesson’s chain steps, and state which step the linker script governs.',
        expectedBehavior:
          'startup_vendor.s: vector table + reset handler + the calls into data/BSS init and SystemInit (steps 1-3’s shell). system_vendor.c: clock-tree configuration (step 3’s body). Linker script: *where* sections live — flash/RAM addresses and placement (the geography all of this assumes); mis-sized regions fail at link time.',
        hints: [
          'One file is structure (table + entry), one is clock body.',
          'The linker script is the map, not the code.',
          'Match each to the numbered chain steps.',
        ],
      },
      {
        title: 'SysTick vs busy-wait',
        brief:
          'Compare a calibrated busy-wait delay against a SysTick delay on three axes: portability, robustness to compiler optimization, and behavior under interrupts.',
        expectedBehavior:
          'Portability: busy-wait is clock-config-dependent (cycles = f(configured clock)); SysTick is CMSIS-standard across Cortex-M. Robustness: busy-wait needs volatile to survive optimization; SysTick counts hardware ticks. Under interrupts: busy-wait stretches by ISR time (timing lies); SysTick measures real elapsed time. Conclusion: SysTick wins all three — the portable, honest time source.',
        hints: [
          'What does the delay actually measure in each case?',
          'Compiler optimization and ISRs both perturb busy-waits.',
          'CMSIS-standard = the portability axis.',
        ],
      },
    ],
    assessment: {
      title: 'Bare-metal blink checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In the bare-metal boot chain, what runs between power-on and main()?',
          options: [
            'Nothing — main() is the entry point',
            'Vector-table fetch, reset handler, runtime init (data/BSS), clock-tree configuration',
            'Only the C library constructors',
            'The bootloader OS',
          ],
          answer: 'Vector-table fetch, reset handler, runtime init (data/BSS), clock-tree configuration',
          explanation:
            'The chain: vector table gives SP + reset handler; the handler does data/BSS init and clock setup, then calls main(). The SDK’s startup file + SystemInit perform exactly this.',
          hint: 'The chain this lesson unfolded step by step.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A GPIO peripheral that is still clock-gated will silently ignore all register writes.',
          answer: 'true',
          explanation:
            'Most Cortex-M-class peripherals sit behind clock-enable gates; an unclocked peripheral receives nothing — the classic first bare-metal bug, hence "enable the clock first" orthodoxy.',
          hint: 'What does the lesson’s step 5 emphasize?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Why does this lesson choose SysTick over a calibrated busy-wait for the blink delay?',
          options: [
            'SysTick is faster',
            'SysTick is the CMSIS-standard core timer: portable across Cortex-M, optimization-proof, and measures real elapsed time even across interrupts',
            'Busy-wait loops are illegal in C',
            'SysTick uses less power',
          ],
          answer: 'SysTick is the CMSIS-standard core timer: portable across Cortex-M, optimization-proof, and measures real elapsed time even across interrupts',
          explanation:
            'Busy-waits are clock-dependent, optimization-fragile (need volatile), and stretch under interrupts. SysTick counts hardware ticks — the honest time source, standardized by CMSIS.',
          hint: 'Three axes: portability, optimization, interrupts.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the vendor-provided code file pair region that places sections in flash/RAM and is consulted before any of this chain runs — the geography of the image.',
          answer: 'linker script',
          explanation:
            'The linker script defines flash/RAM addresses and section placement — the geography the vector table and runtime init assume. Wrong sizes fail at link time by design.',
          hint: 'It decides where everything lives.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Vector table', definition: 'Flash-resident table of initial SP + handler addresses; the first thing fetched at reset.' },
      { term: 'Reset handler', definition: 'First code: runtime init + clock setup + call to main.' },
      { term: 'Peripheral clock gate', definition: 'Vendor register enabling a peripheral’s clock; must precede its configuration.' },
      { term: 'SysTick', definition: 'The Cortex-M core’s CMSIS-standard timer — the portable bare-metal time source.' },
      { term: 'Linker script', definition: 'Section-to-address placement rules: flash/RAM geography of the image.' },
    ],
    revisionSummary: [
      'Boot chain: vector table -> reset handler -> data/BSS init -> clock tree -> main().',
      'Peripheral clock gates precede configuration — the classic bare-metal bug is skipping them.',
      'SysTick (CMSIS) beats busy-waits on portability, optimization-robustness and interrupt honesty.',
      'The SDK startup file + SystemInit + linker script supply the hidden layer — now you can read them.',
      'Pseudocode honesty: sequences universal, names vendor-specific; verify in the reference manual.',
    ],
    furtherReading: [
      { label: 'Arm Cortex-M documentation', url: 'https://developer.arm.com/documentation', kind: 'docs' },
      { label: 'Raspberry Pi Pico C/C++ SDK documentation', url: 'https://www.raspberrypi.com/documentation/microcontrollers/', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
];
