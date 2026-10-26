import type { TutorialLesson } from '../types';

export const module01Lessons: TutorialLesson[] = [
  {
    id: 'carc-m01-l1',
    title: 'What a CPU Actually Does',
    summary:
      'Strip a processor down to its essence: a machine that reads instructions from memory and changes state, one small step at a time.',
    objectives: [
      'Define what a CPU is in terms of memory, state and instructions.',
      'Explain why a program is just bytes in memory, indistinguishable from data until fetched.',
      'Compare a general-purpose CPU with a microcontroller at the system level.',
      'Describe the trade-off between flexibility (software) and specialisation (hardware).',
    ],
    whyItMatters:
      'Everything from a washing machine to a datacenter server reduces to the same trick: a machine that repeatedly reads a number from memory, interprets it as an instruction, and does something small. If you understand that loop, processors stop being magic and start being designable — which is the whole point of this course.',
    prerequisites: [
      'Binary and hexadecimal number representation',
      'Basic idea of memory as an array of addressable bytes',
    ],
    explanation:
      'A **central processing unit (CPU)** is a machine with three essential ingredients: a **memory** that holds both a program and data, a small amount of fast internal **state** (registers), and a repeating **control process** that reads an instruction from memory and carries it out. Nothing more. A modern CPU is this same loop, made enormously fast and decorated with caches, pipelines and branch predictors — topics this course builds up to.\n\n### The program is data\n\nThe single most important idea in computing is the **stored-program concept**: instructions live in the same kind of memory as data, encoded as plain binary numbers. An instruction that says *add 5 to the accumulator* might literally be the byte `0x53`. The CPU does not see structure in memory — it sees bytes. Structure appears only because the CPU *interprets* certain bytes as instructions. This is why a compiler output, a disassembly listing and a hex dump of the same binary all describe the same thing at different levels of meaning.\n\n### State: the registers\n\nInside the CPU, a handful of named storage cells called **registers** hold the values the machine is actively working on. There is a **program counter (PC)** that says which instruction comes next, an **instruction register (IR)** that holds the instruction currently being executed, and a set of working registers (on simple machines, a single **accumulator**) that hold operands and results. Everything else — variables, buffers, stacks — lives in the big, slower main memory outside.\n\n### Small steps, done very fast\n\nEach instruction does something tiny: move a byte, add two numbers, compare, jump. A useful program is thousands or millions of these steps. The CPU wins by doing them fast — a 1 GHz processor retires roughly one simple instruction per nanosecond in the ideal case. Hardware speed, not instruction cleverness, is what makes software practical.\n\n### Microcontrollers versus general-purpose CPUs\n\nA **microcontroller (MCU)** is a complete computer on one chip: CPU core, a little RAM, flash memory for the program, and peripherals such as timers, serial ports and analog inputs, all on a single die. A general-purpose CPU (desktop or server class) is a much faster core that relies on external DRAM, big caches and an operating system. The table below summarises the design split; module 04 returns to the peripherals and module 03 to why the fast core needs pipelines at all.',
    deepDive:
      '### Flexibility versus specialisation\n\nA CPU is the most *flexible* machine you can build: change the bytes in memory and it becomes a different machine. The price is overhead — fetch, decode and general-purpose structures that exist even when a task does not need them. A dedicated hardware block (a video decoder, a CRC engine) does one job with far less energy per operation but cannot be reprogrammed. Almost every real system mixes both: a CPU for control and the awkward parts, fixed hardware for the hot inner loops. This trade-off is the reason accelerators, DSPs and GPUs exist alongside cores.\n\n### Where this course connects to RTL\n\nIf you have written Verilog for a finite state machine, you already understand a CPU at the small scale: the control unit *is* a state machine, and the datapath *is* registers plus combinational logic. The platform\'s RTL courses show you how to build single-cycle and pipelined toy CPUs from gates up. This course deliberately stays one level above — instruction sets, caches, hazards, buses — so that when you meet an RTL processor design you already know *why* each piece is there.',
    examples: [
      {
        title: 'Reading toy machine code as bytes',
        language: 'c',
        code: `#include <stdio.h>
#include <stdint.h>

/* Toy-1 machine code: AC = 3 + DATA[0xC]; DATA[0xD] = AC; halt */
int main(void) {
    uint8_t program[4] = { 0x53, 0x3C, 0x2D, 0x00 };
    const char *mnemonic[4] = { "LOADI 3", "ADD 0xC", "STORE 0xD", "HALT" };

    for (int i = 0; i < 4; i++) {
        printf("0x%02X  opcode=%X operand=%X  %s\\n",
               program[i], program[i] >> 4, program[i] & 0x0F, mnemonic[i]);
    }
    return 0;
}`,
        explanation: [
          'The array holds four bytes of a toy instruction set defined fully in lesson 3: the upper 4 bits of each byte are the opcode, the lower 4 bits the operand.',
          'Bytes 0x53, 0x3C, 0x2D and 0x00 are just numbers — nothing in the array knows it is a program.',
          '`program[i] >> 4` extracts the opcode nibble and `program[i] & 0x0F` the operand nibble, which is exactly the decode step a CPU performs.',
          'The printed listing is:',
          '0x53  opcode=5 operand=3  LOADI 3',
          '0x3C  opcode=3 operand=C  ADD 0xC',
          '0x2D  opcode=2 operand=D  STORE 0xD',
          '0x00  opcode=0 operand=0  HALT',
          'The point: an instruction stream and a data array are the same bytes; only the interpretation differs.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Minimal computer: CPU, memory, buses',
        content:
          '   +---------------------------------------+\n   |                 CPU                   |\n   |  +---------+  +----+  +-------------+ |\n   |  |   PC    |  | IR |  | Registers / |\n   |  +---------+  +----+  | Accumulator | |\n   |                       +-------------+ |\n   |          +------------------+         |\n   |          |   Control unit   |         |\n   |          +------------------+         |\n   +-----|------------------|----------|----+\n         | address          | control  | data\n         v                  v          v\n   +---------------------------------------------------+\n   |                Main memory                        |\n   |  [ program bytes ]  [ data bytes ]  [ stack ]     |\n   +---------------------------------------------------+',
        caption:
          'The CPU holds only small, fast state; the program and data live in main memory and travel over the buses. The control unit drives the fetch-decode-execute loop.',
      },
    ],
    tables: [
      {
        caption: 'General-purpose CPU versus microcontroller (typical design points)',
        headers: ['Aspect', 'General-purpose CPU', 'Microcontroller (MCU)'],
        rows: [
          ['Integration', 'Core only; RAM/cache/peripherals external', 'CPU + RAM + flash + peripherals on one chip'],
          ['Clock rate', 'GHz class', 'kHz to low hundreds of MHz'],
          ['Memory size', 'GiB of DRAM', 'KiB of SRAM, KiB-MiB of flash'],
          ['Software', 'OS, arbitrary applications', 'Bare-metal firmware or small RTOS'],
          ['Optimised for', 'Throughput on varied workloads', 'Determinism, cost, power per task'],
          ['Typical use', 'Laptops, servers, phones (app core)', 'Appliances, sensors, motor control'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Thinking the CPU executes C code or assembly text directly.',
        fix: 'The CPU executes only encoded binary instructions (machine code). Assembly is human-readable text for those encodings; C is compiled into them. There is no interpreter inside the hardware.',
      },
      {
        mistake: 'Assuming program memory and data memory are physically different because they hold different things.',
        fix: 'In a von Neumann machine they are the same memory; the CPU only knows whether it is fetching (using the address in PC) or loading/storing data. Some microcontrollers use Harvard-style separate memories for speed and safety, but the *concept* of stored programs does not require it.',
      },
      {
        mistake: 'Confusing a microcontroller with a small CPU.',
        fix: 'A microcontroller is a *system* (CPU plus memory plus peripherals) on one chip; a CPU is one component. When a datasheet says 32-bit MCU, the 32 bits describe the core, not the whole chip.',
      },
    ],
    guidedPractice: {
      title: 'Decode three unknown bytes',
      brief:
        'Given the Toy-1 encoding (upper nibble opcode, lower nibble operand) and the opcode table from lesson 3 (1=LOAD, 2=STORE, 3=ADD, 5=LOADI, 0=HALT), decode the bytes 0x1E, 0x3E and 0x20 by hand, writing opcode, operand and mnemonic for each.',
      expectedBehavior:
        '0x1E is LOAD 0xE (opcode 1, operand E); 0x3E is ADD 0xE; 0x20 is STORE 0. Together they compute DATA[0] = DATA[0] + DATA[0xE].',
      hints: [
        'Split each byte: upper nibble is the opcode, lower nibble the operand.',
        '0x1E: upper = 1 (LOAD), lower = E, so the operand is data address 0xE.',
        'The three instructions form one C statement: DATA[0] += DATA[0xE].',
      ],
    },
    practiceExercises: [
      {
        title: 'Encode your own instruction',
        brief:
          'Write the two Toy-1 bytes for: LOADI 7 followed by STORE 0xF. Then write the equivalent C statement, assuming AC holds the value afterwards.',
        expectedBehavior:
          '0x57 then 0x2F. In C: DATA[0xF] = 7; (the LOADI puts 7 in AC, the STORE writes AC to address 0xF).',
        hints: [
          'LOADI has opcode 5, STORE has opcode 2.',
          'Encode the operand as the low nibble: 7 and F.',
        ],
      },
      {
        title: 'Classify the system',
        brief:
          'For each of the following, argue CPU or MCU: (a) the chip in a keyboard scanning keys at 100 Hz; (b) the processor running a desktop OS; (c) the chip controlling a drone motor. Name one deciding factor for each.',
        expectedBehavior:
          '(a) MCU: tiny deterministic firmware task, cost and power dominate. (b) CPU: needs caches, large memory, OS support. (c) MCU (or MCU plus dedicated ESC hardware): hard real-time loop, low latency, no OS needed. Any well-argued factor is acceptable.',
        hints: [
          'Ask: does the workload need gigabytes of memory or an OS?',
          'Ask: is the job one fixed loop, or arbitrary software?',
        ],
      },
    ],
    assessment: {
      title: 'CPU fundamentals checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which register holds the address of the next instruction to fetch?',
          options: ['Program counter (PC)', 'Instruction register (IR)', 'Accumulator (AC)', 'Stack pointer'],
          answer: 'Program counter (PC)',
          explanation:
            'The PC points at the next instruction. The IR holds the instruction *after* it is fetched; the accumulator holds arithmetic results.',
          hint: 'It counts through program memory one instruction at a time.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'In a stored-program computer, an instruction and a data byte are the same kind of object: a binary number in memory.',
          answer: 'true',
          explanation:
            'Both are just bytes. The CPU treats a byte as an instruction only when it fetches it using the PC — that interpretation is what makes code code.',
          hint: 'This is why buffer overflows can hijack execution.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'What best describes a microcontroller?',
          options: [
            'A complete computer system: CPU, memory and peripherals on one chip',
            'A CPU core with large external DRAM',
            'A programmable logic device without a CPU',
            'An analog signal processor',
          ],
          answer: 'A complete computer system: CPU, memory and peripherals on one chip',
          explanation:
            'MCUs integrate the core, SRAM, flash and peripherals (timers, UARTs, ADCs) on a single die, trading raw speed for integration, cost and determinism.',
          hint: 'Think single chip, single package, whole system.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Name the small, fast storage locations inside the CPU that hold values being actively worked on (one word, plural).',
          answer: 'registers',
          explanation:
            'Registers are the CPU-internal storage cells: PC, IR, accumulator or general-purpose registers. Everything slower is outside the core.',
          hint: 'They are also the variables you see in a processor register-file diagram.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'CPU', definition: 'The unit that fetches instructions from memory, decodes them and executes them using internal registers and an ALU.' },
      { term: 'Stored-program concept', definition: 'Instructions are encoded as data bytes in memory; the CPU interprets them via the fetch-decode-execute loop.' },
      { term: 'Microcontroller (MCU)', definition: 'A single chip integrating a CPU core, memory (SRAM/flash) and peripherals, aimed at embedded control.' },
      { term: 'Accumulator', definition: 'A single working register (on simple ISAs) that implicitly receives the results of arithmetic instructions.' },
    ],
    revisionSummary: [
      'A CPU = memory + registers (PC, IR, working registers) + the fetch-decode-execute loop.',
      'Programs are bytes; interpretation by the CPU makes them instructions.',
      'MCUs integrate everything on one chip for embedded control; general CPUs maximise throughput with external memory.',
      'The flexibility-versus-specialisation trade-off explains why systems pair CPUs with fixed-function hardware.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Central processing unit', url: 'https://en.wikipedia.org/wiki/Central_processing_unit', kind: 'article' },
      { label: 'Wikipedia — Microcontroller', url: 'https://en.wikipedia.org/wiki/Microcontroller', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'carc-m01-l2',
    title: 'Registers and the ALU',
    summary:
      'Meet the working parts of the datapath: the PC, IR and accumulator-style registers, and the arithmetic logic unit that does the actual computing.',
    objectives: [
      'Identify the special-purpose registers (PC, IR) and explain their roles in the instruction cycle.',
      'Contrast accumulator architectures with general-purpose register architectures.',
      'List the operation classes an ALU implements: arithmetic, logic, shifts and status flags.',
      'Predict ALU results and flag settings (carry, zero, negative) for 8-bit operands.',
    ],
    whyItMatters:
      'Every instruction a CPU runs ends its journey in the ALU and in registers. When you later read datasheets, write firmware, or build a toy CPU in RTL, the questions that recur are always the same: which register does the instruction touch, what does the ALU compute, and which flags did it set? Getting fluent here makes every later architecture topic — caches, pipelines, interrupts — concrete instead of abstract.',
    prerequisites: [
      'Two’s complement representation for 8-bit signed values',
      'Bitwise operators in C (&, |, ^, <<, >>)',
    ],
    explanation:
      'The **datapath** is the part of the CPU that does the work: registers to hold values, the **arithmetic logic unit (ALU)** to transform them, and wires to move results. The control unit tells the datapath what to do each cycle.\n\n### The special-purpose registers\n\nTwo registers coordinate the instruction cycle itself. The **program counter (PC)** holds the address of the next instruction to fetch; after most instructions it simply increments, and jump instructions overwrite it. The **instruction register (IR)** holds the instruction currently being decoded and executed — the CPU needs a private copy because the memory bus is busy doing other things while the instruction runs.\n\n### Accumulator versus general-purpose registers\n\nThe simplest working design has one arithmetic register, the **accumulator (AC)**: one operand and the result both live there implicitly, as in `ADD 0xC` meaning `AC = AC + DATA[0xC]`. Accumulator machines have short instructions but force everything through one register, creating a traffic bottleneck. **General-purpose register (GPR)** machines — like ARM, RISC-V and x86 — have 8, 16 or 32 named registers, and instructions name their own operands: `ADD R1, R2, R3`. More register names mean longer encodings, but far fewer trips to memory. Modern designs are GPR; you will meet the accumulator again in this course only because it makes the mechanics of execution easiest to see.\n\n### What the ALU computes\n\nAn ALU takes two operand words and a select signal, and produces a result plus **status flags**. Its operation set falls into four classes:\n\n- **Arithmetic**: add, subtract, increment, compare (a subtract whose result is discarded).\n- **Logic**: AND, OR, XOR, NOT — the bitwise gates from digital electronics.\n- **Shifts**: move bits left or right; a left shift by one doubles an unsigned value, a right shift by one halves it.\n- **Status**: the ALU also outputs flags — **carry** (unsigned overflow out of the top bit), **zero** (result is all zeros), **negative** (top bit set in two’s complement).\n\nFlags matter because conditional behaviour is built on them: a `jump if zero` tests the Z flag; multi-word addition chains the C flag into the next word.',
    deepDive:
      '### Flags and unsigned versus signed\n\nThe same ALU hardware serves signed and unsigned arithmetic; only the *interpretation* of the flags differs. For 8-bit values: adding 0x50 + 0x50 gives 0xA0 with carry clear, but 0xA0 is negative in two’s complement — signed overflow, which dedicated hardware detects by checking that the operands and result disagree in sign. Unsigned code instead watches the C flag. High-level languages hide this, which is exactly why C distinguishes `uint8_t` from `int8_t`: the type tells the compiler which flag logic to generate.\n\n### Why shifts are almost free\n\nIn hardware, a shift by a fixed amount is just wiring — no logic delay at all — so compilers replace multiply/divide by powers of two with shifts. `x << 3` is eight times x; `x >> 2` is x divided by four for unsigned types. This is one of the first optimisations to check for when reading disassembly, and one of the reasons powers of two appear everywhere in systems code (buffer sizes, cache line sizes, hash tables).',
    examples: [
      {
        title: 'ALU operations and expected results on 8-bit operands',
        language: 'c',
        code: `#include <stdio.h>
#include <stdint.h>

int main(void) {
    uint8_t a = 0x3C;   /* 60  = 0011 1100 */
    uint8_t b = 0x0A;   /* 10  = 0000 1010 */

    uint8_t sum  = (uint8_t)(a + b);   /* 70  */
    uint8_t diff = (uint8_t)(a - b);   /* 50  */
    uint8_t andv = a & b;              /* 8   */
    uint8_t orv  = a | b;              /* 62  */
    uint8_t xorv = a ^ b;              /* 54  */
    uint8_t shl  = (uint8_t)(a << 1);  /* 120 */
    uint8_t shr  = (uint8_t)(a >> 2);  /* 15  */

    printf("sum=%u diff=%u\\n", sum, diff);
    printf("and=%u or=%u xor=%u\\n", andv, orv, xorv);
    printf("shl=%u shr=%u\\n", shl, shr);
    return 0;
}`,
        explanation: [
          'a = 0x3C = 0011 1100 and b = 0x0A = 0000 1010 in binary; align the columns and follow each operation bit by bit.',
          'sum: 60 + 10 = 70, no carry out of bit 7, so the C flag would be 0.',
          'and: 0011 1100 & 0000 1010 = 0000 1000 = 8 — bits set in *both* operands only.',
          'or: 0011 1100 | 0000 1010 = 0011 1110 = 62; xor: 0011 1100 ^ 0000 1010 = 0011 0110 = 54.',
          'shl: shifting 0011 1100 left by one gives 0111 1000 = 120 — doubles the value, bit 6 shifts into bit 7.',
          'shr: shifting right by two gives 0000 1111 = 15 — 60 / 4, with the two low bits discarded.',
          'The program prints: sum=70 diff=50 / and=8 or=62 xor=54 / shl=120 shr=15.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Accumulator datapath with ALU and flags',
        content:
          '              +-----------------------------------+\n              |               ALU                 |\n   DATA bus --+-- operand A          operand B ---+--- from AC\n              |        (selected by control)      |\n              +---- result ---> back to AC        |\n              +---- flags:  C (carry)             |\n                           Z (zero)              |\n                           N (negative)          |\n\n   PC --[address]--> program memory --[instruction]--> IR --> control unit',
        caption:
          'The ALU reads operands (one usually from the accumulator), returns the result to a register, and updates status flags. The PC/IR/control side drives which operation runs each cycle.',
      },
    ],
    tables: [
      {
        caption: 'Accumulator versus general-purpose register architecture',
        headers: ['Property', 'Accumulator (AC)', 'General-purpose registers (GPR)'],
        rows: [
          ['Instruction operands', 'Implicit: AC plus one memory operand', 'Explicit: register names in the instruction'],
          ['Encoding size', 'Short (few bits needed)', 'Longer (register fields for each operand)'],
          ['Memory traffic', 'High — most operations touch memory', 'Low — intermediates stay in registers'],
          ['Compiler freedom', 'Low — one working register', 'High — allocator picks registers'],
          ['Modern examples', 'Toy ISAs, 8051-style cores', 'ARM, RISC-V, x86'],
        ],
      },
      {
        caption: 'Common ALU flag rules for 8-bit unsigned operands',
        headers: ['Flag', 'Set when', 'Typical use'],
        rows: [
          ['C (carry)', 'Addition carries out of bit 7, or subtraction borrows', 'Multi-word arithmetic, unsigned comparisons'],
          ['Z (zero)', 'Result is 0x00', 'Equality tests, loop counters reaching zero'],
          ['N (negative)', 'Bit 7 of the result is 1 (two’s complement sign)', 'Signed comparisons'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Confusing the PC and the IR.',
        fix: 'The PC is an *address* — where the next instruction lives. The IR is an *instruction* — the one being executed right now. Fetch moves a copy from memory[PC] into the IR and then bumps the PC.',
      },
      {
        mistake: 'Expecting a shift on a signed negative value to behave like division.',
        fix: 'For signed types, right-shifting a negative number is implementation-defined in C (usually arithmetic shift, filling with 1s) and rounds toward negative infinity, not toward zero: -5 >> 1 is -3, not -2. Use division when you need that exact semantic.',
      },
      {
        mistake: 'Reading a carry flag as an error.',
        fix: 'Carry is normal, planned behaviour: 8-bit hardware adds 16-bit values as two 8-bit additions, piping the first carry into the second (add-with-carry). It only signals a problem if you *expected* the result to fit in 8 bits.',
      },
    ],
    guidedPractice: {
      title: 'Predict the flags',
      brief:
        'An 8-bit ALU computes 0x7F + 0x01. Give the 8-bit result and the state of the C, Z and N flags. Then repeat for 0x00 - 0x01.',
      expectedBehavior:
        '0x7F + 0x01 = 0x80: C=0 (no carry out of bit 7), Z=0, N=1 (bit 7 set). 0x00 - 0x01 = 0xFF: C=1 (borrow), Z=0, N=1.',
      hints: [
        'Add in binary: 0111 1111 + 0000 0001 = 1000 0000.',
        'Subtraction in hardware is add-the-two’s-complement; a borrow appears as C=1 in most ISAs.',
        'Z means every bit of the result is zero — check bit by bit.',
      ],
    },
    practiceExercises: [
      {
        title: 'Replace multiplication with shifts',
        brief:
          'Rewrite `x * 8` and `y / 4` for unsigned 16-bit values using only shift operators, then verify with x = 100 and y = 90 that both forms agree.',
        expectedBehavior:
          'x << 3 gives 800 for x = 100 (100 * 8 = 800); y >> 2 gives 22 for y = 90 — note 90/4 = 22.5 and the shift truncates to 22, exactly like unsigned integer division.',
        hints: [
          'Shifting left by n multiplies by 2^n.',
          'Unsigned right shift by n divides by 2^n and discards the remainder.',
        ],
      },
      {
        title: 'Why a compare instruction exists',
        brief:
          'A CPU has no dedicated less-than instruction. Using the subtract-with-flags behaviour described above, explain how `jump if carry set` after `SUB R1, R2` (computes R1 - R2, keeps flags only) implements the unsigned test R1 < R2.',
        expectedBehavior:
          'R1 - R2 generates a borrow (C=1) exactly when R1 < R2 for unsigned operands, so branching on C tests less-than without storing the difference.',
        hints: [
          'Try 5 - 7 and 7 - 5 in 8-bit two’s complement and watch the borrow.',
          'The ALU result is thrown away; only the flags survive.',
        ],
      },
    ],
    assessment: {
      title: 'Registers and ALU checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In an accumulator ISA, what does the instruction ADD 0xC most plausibly mean?',
          options: [
            'AC = AC + DATA[0xC]',
            'DATA[0xC] = DATA[0xC] + AC',
            'R1 = R1 + DATA[0xC]',
            'AC = AC + 0xC',
          ],
          answer: 'AC = AC + DATA[0xC]',
          explanation:
            'Accumulator instructions implicitly use AC as one operand and the destination; the explicit operand is a memory address (or immediate, for LOADI-style opcodes).',
          hint: 'One operand and the result are always the accumulator.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does this C program print?',
          code: 'uint8_t a = 0x3C, b = 0x0A;\nprintf("%u", a & b);',
          options: ['8', '62', '54', '46'],
          answer: '8',
          explanation:
            '0x3C = 0011 1100, 0x0A = 0000 1010. The AND keeps only bits set in both: 0000 1000 = 8.',
          hint: 'Line up the two binary values and keep the shared 1-bits.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'For unsigned 8-bit operands, a left shift by one always produces the same result as multiplying by two, including when the value overflows 8 bits.',
          answer: 'false',
          explanation:
            'The shifted bit pattern matches multiplication by two *modulo 256* — the overflowing bit is simply lost from the byte (and appears as a carry). So as a stored 8-bit result the two agree, but the mathematical product does not fit; the claim as stated about the mathematical value is false.',
          hint: 'Try 200 << 1 in a uint8_t and compare with 400.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'After computing 0x7F + 0x01 in an 8-bit ALU, which flags are set?',
          options: ['N only', 'C and Z', 'N and Z', 'C only'],
          answer: 'N only',
          explanation:
            '0x7F + 0x01 = 0x80: no carry out of bit 7 (C=0), result is not zero (Z=0), but bit 7 is set so the two’s complement sign bit N=1. This is the classic case where the unsigned and signed views disagree.',
          hint: 'Write 0x7F and 0x01 in binary and add them by hand.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Datapath', definition: 'The registers, ALU and interconnect inside the CPU that transform data, as directed by the control unit.' },
      { term: 'Program counter (PC)', definition: 'Register holding the address of the next instruction to fetch.' },
      { term: 'Instruction register (IR)', definition: 'Register holding the instruction currently being decoded and executed.' },
      { term: 'ALU', definition: 'Combinational hardware that computes arithmetic, logic and shift operations and produces status flags.' },
      { term: 'Status flags', definition: 'Single-bit outputs of the ALU (C, Z, N, V) that record properties of the last result and drive conditional instructions.' },
    ],
    revisionSummary: [
      'PC = address of next instruction; IR = instruction being executed.',
      'Accumulator machines funnel all arithmetic through one register; GPR machines name their operands and cut memory traffic.',
      'ALU classes: arithmetic, bitwise logic, shifts, plus flag outputs (C, Z, N).',
      'Shifts by powers of two replace multiply/divide for unsigned values; flags are the foundation of every conditional.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Arithmetic logic unit', url: 'https://en.wikipedia.org/wiki/Arithmetic_logic_unit', kind: 'article' },
      { label: 'Wikipedia — Processor register', url: 'https://en.wikipedia.org/wiki/Processor_register', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'carc-m01-l3',
    title: 'Fetch-Decode-Execute on a Toy ISA',
    summary:
      'Define a complete toy instruction set (4-bit opcodes, 8-bit data), then trace a four-instruction program through the fetch-decode-execute cycle — and place the design on the RISC/CISC spectrum.',
    objectives: [
      'Define the components of the fetch-decode-execute cycle precisely.',
      'Read a full instruction set specification and hand-assemble programs for it.',
      'Trace a program cycle by cycle, tracking PC, IR, AC and memory state.',
      'Contrast RISC and CISC design philosophies with concrete examples.',
    ],
    whyItMatters:
      'The fetch-decode-execute cycle is the heartbeat of every processor ever built. Practising it on a tiny ISA you can hold in your head is the equivalent of scales for a musician: later, when a datasheet describes a real instruction set, or an RTL course asks you to build a datapath, you will already know exactly what happens in each cycle and why.',
    prerequisites: [
      'carc-m01-l1 (what a CPU is)',
      'carc-m01-l2 (PC, IR, accumulator, ALU flags)',
    ],
    explanation:
      'Here is the complete specification of **Toy-1**, a teaching ISA used throughout this course.\n\n### Toy-1 specification\n\n- Instructions are 8 bits wide: **upper nibble = 4-bit opcode, lower nibble = 4-bit operand**.\n- Program memory and data memory are separate. Data memory holds 16 bytes at addresses 0x0-0xF; all data is 8-bit.\n- Registers: **PC** (4-bit), **IR** (8-bit), **AC** (8-bit accumulator), **HALT** flag.\n\n| Opcode | Mnemonic | Meaning |\n|---|---|---|\n| 0x0 | HALT | stop the clock |\n| 0x1 | LOAD a | AC ← DATA[a] |\n| 0x2 | STORE a | DATA[a] ← AC |\n| 0x3 | ADD a | AC ← AC + DATA[a] (mod 256) |\n| 0x4 | SUB a | AC ← AC − DATA[a] (mod 256) |\n| 0x5 | LOADI i | AC ← i (the low nibble, zero-extended) |\n| 0x6 | JMP a | PC ← a |\n| 0x7 | JZ a | if AC == 0 then PC ← a |\n\n### The cycle\n\nEvery step of every processor — Toy-1 or a modern x86 — repeats the same three phases:\n\n1. **Fetch**: read the byte at `MEM_PROG[PC]` into the IR, then increment the PC (so it points at the next instruction).\n2. **Decode**: split the IR into opcode (upper nibble) and operand (lower nibble); the control unit selects the datapath action.\n3. **Execute**: perform the operation — moving data, arithmetic in the ALU, or overwriting the PC for jumps.\n\n### A complete four-instruction trace\n\nProgram: compute `DATA[0xD] = 3 + DATA[0xC]`, where `DATA[0xC]` is preloaded with 5.\n\n```\nADDR  BYTE  MEANING\n0x0   0x53  LOADI 3     AC <- 3\n0x1   0x3C  ADD 0xC     AC <- AC + DATA[0xC]\n0x2   0x2D  STORE 0xD   DATA[0xD] <- AC\n0x3   0x00  HALT\n```\n\nThe cycle-by-cycle state table is in the diagram below. Note the rhythm: the PC advances during *fetch*, before the instruction even knows what it is — which is exactly why jump instructions work by overwriting the PC during *execute*.\n\n### RISC versus CISC\n\nToy-1 is deliberately **RISC-flavoured**: few opcodes, fixed 8-bit encoding, one memory-access pattern per instruction. **CISC** designs (x86 being the survivor) pack more work into each instruction — variable-length encodings, many addressing modes, instructions that load, compute and store in one step. The table below compares the philosophies; neither won outright — modern x86 CPUs decode CISC instructions into RISC-like micro-operations internally.',
    deepDive:
      '### Why the PC increments during fetch\n\nIncrementing the PC in the fetch phase, rather than after execute, lets the fetch of the *next* instruction begin as early as possible. In a single-cycle machine it makes no difference; in a pipelined machine (module 03) it is essential — fetch is always working one step ahead. Jumps then repair the PC during execute if the control flow changes. This ordering is one of those details that seems arbitrary until you build the pipeline and discover it was designed in from day one.\n\n### Conditional branches make programs programs\n\nWithout JZ (and its siblings) a program is a fixed straight line — the machine would need one instruction per behaviour. The ability to *repeat* instructions under data-dependent control is what turns a calculator into a computer. Toy-1 is Turing-complete in the practical sense: with a jump and conditional jump you can write loops, and loops give you iteration over arbitrarily long data.\n\n### Where real ISAs diverge\n\nReal designs add: more registers with register-file addressing, byte/halfword/word operand sizes, addressing modes (register+offset, indexed), condition codes or condition registers, and — critically — variable-length instructions for code density. When you later study the platform\'s RTL pipelining course, you will see why RISC\'s fixed encoding makes the fetch and decode stages so much simpler to build in hardware.',
    examples: [
      {
        title: 'Cycle-by-cycle trace of the Toy-1 program',
        language: 'text',
        code: `Initial state: PC=0x0, IR=0x00, AC=0, DATA[0xC]=5, DATA[0xD]=0, HALT=0

Cycle 1
  FETCH:   IR <- MEM_PROG[0x0] = 0x53 ; PC <- 0x1
  DECODE:  opcode 5 = LOADI, operand 3
  EXECUTE: AC <- 3
  State:   PC=0x1  IR=0x53  AC=3   DATA[0xD]=0

Cycle 2
  FETCH:   IR <- MEM_PROG[0x1] = 0x3C ; PC <- 0x2
  DECODE:  opcode 3 = ADD, operand 0xC
  EXECUTE: AC <- 3 + DATA[0xC] = 3 + 5 = 8
  State:   PC=0x2  IR=0x3C  AC=8   DATA[0xD]=0

Cycle 3
  FETCH:   IR <- MEM_PROG[0x2] = 0x2D ; PC <- 0x3
  DECODE:  opcode 2 = STORE, operand 0xD
  EXECUTE: DATA[0xD] <- 8
  State:   PC=0x3  IR=0x2D  AC=8   DATA[0xD]=8

Cycle 4
  FETCH:   IR <- MEM_PROG[0x3] = 0x00 ; PC <- 0x4
  DECODE:  opcode 0 = HALT
  EXECUTE: HALT flag <- 1 ; clock stops
  Final:   AC=8, DATA[0xD]=8  (3 + 5, as intended)`,
        explanation: [
          'Each cycle is strictly fetch, then decode, then execute — the same three phases forever.',
          'The PC increments during fetch in every cycle, which is why it is already one ahead during execute.',
          'Cycle 2 reads operand data (DATA[0xC] = 5) from *data* memory during execute; the program bytes came from *program* memory during fetch (Harvard split).',
          'Cycle 3 writes 8 into DATA[0xD]; AC is unchanged — STORE reads the accumulator, it does not clear it.',
          'Cycle 4 halts: the PC has advanced to 0x4, but no further fetch occurs once the HALT flag is set.',
        ],
      },
      {
        title: 'A loop in Toy-1: countdown from 3',
        language: 'text',
        code: `Goal: DATA[0xE] starts at 3; store each countdown value into
DATA[0xF], stopping when the counter reaches 0.
Toy-1 has no "subtract immediate", so a scratch cell DATA[0x1]
(preloaded with 1) supplies the decrement.

Initial data: DATA[0x1]=1, DATA[0xE]=3

ADDR  BYTE  MEANING
0x0   0x1E  LOAD 0xE     AC <- DATA[0xE]      (loop start)
0x1   0x2F  STORE 0xF    DATA[0xF] <- AC
0x2   0x41  SUB 0x1      AC <- AC - DATA[0x1]
0x3   0x2E  STORE 0xE    DATA[0xE] <- AC
0x4   0x76  JZ 0x6       if AC == 0, jump to HALT
0x5   0x60  JMP 0x0      otherwise repeat
0x6   0x00  HALT

Execution trace (state after each STORE 0xF):
  pass 1: AC=3 -> DATA[0xF]=3 ; SUB -> 2 ; JZ fails ; JMP 0x0
  pass 2: AC=2 -> DATA[0xF]=2 ; SUB -> 1 ; JZ fails ; JMP 0x0
  pass 3: AC=1 -> DATA[0xF]=1 ; SUB -> 0 ; JZ taken -> HALT`,
        explanation: [
          'Each pass loads the counter, stores a copy in DATA[0xF], decrements it, writes it back, and tests for zero.',
          'Because STORE 0xF happens *before* the subtraction, the stored values are 3, 2, 1 — zero itself is never stored. Moving STORE 0xF after the JZ would store 0 as well.',
          'JZ 0x6 only exits when AC reaches 0; on every other pass it falls through to JMP 0x0, which restarts the loop.',
          'Conditional-exit plus unconditional-repeat is the universal assembly loop pattern; every higher-level for and while loop compiles to this shape.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'Fetch-decode-execute state cycle',
        content:
          '        +---------------------------------------------+\n        |                                             |\n        v                                             |\n   +--------+      +--------+      +-----------+      |\n   | FETCH  | ---> | DECODE | ---> | EXECUTE   |      |\n   | IR<-M[P|      | split  |      | ALU / mem |      |\n   | PC++   |      | opcode |      | or PC<-a  |------+\n   +--------+      +--------+      +-----------+\n        HALT flag set in EXECUTE ends the loop.',
        caption:
          'The control unit cycles through fetch, decode and execute indefinitely. The PC advances during fetch; jumps redirect it during execute.',
      },
    ],
    tables: [
      {
        caption: 'RISC versus CISC design philosophy',
        headers: ['Aspect', 'RISC', 'CISC'],
        rows: [
          ['Instruction length', 'Fixed (fast, simple fetch)', 'Variable (dense, complex fetch)'],
          ['Work per instruction', 'One simple operation', 'Several operations possible'],
          ['Memory access', 'Only in dedicated LOAD/STORE', 'Many instructions may access memory'],
          ['Register set', 'Large, uniform general-purpose', 'Often specialised, fewer uniform regs'],
          ['Addressing modes', 'Few', 'Many'],
          ['Decode hardware', 'Simple, pipeline-friendly', 'Complex, often microcoded'],
          ['Code size', 'Larger (more instructions)', 'Smaller per operation'],
          ['Examples', 'RISC-V, MIPS, classic ARM', 'x86, VAX, 68k'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Executing the instruction during the same cycle it is decoded, and advancing the PC twice.',
        fix: 'Each phase happens once per cycle: fetch (IR + PC update), decode (interpret IR), execute (act). If your trace shows the PC skipping an instruction, you probably incremented it in both fetch and execute.',
      },
      {
        mistake: 'Forgetting that JZ only jumps when the condition holds.',
        fix: 'A conditional branch that fails simply falls through to the next sequential instruction. In the loop example above, JZ 0x6 does nothing while AC is nonzero, and JMP 0x0 does the looping.',
      },
      {
        mistake: 'Treating the operand nibble as a value for LOAD/ADD/STORE but as an address for LOADI.',
        fix: 'Check the opcode table: LOADI embeds the *value* (0-15) in the instruction; LOAD/STORE/ADD/SUB/JMP/JZ use the nibble as a *memory address*. Mixing these up produces off-by-something errors that hand-traces catch immediately.',
      },
    ],
    guidedPractice: {
      title: 'Trace a two-instruction fragment',
      brief:
        'Starting from AC=0, PC=0x0, DATA[0x2]=7: trace the program bytes 0x12 (LOAD 0x2), 0x3C (ADD 0xC) with DATA[0xC]=9. Give PC, IR and AC after each phase of each cycle, and the final AC.',
      expectedBehavior:
        'Cycle 1: fetch 0x12, PC->0x1, decode LOAD 0x2, execute AC<-7. Cycle 2: fetch 0x3C, PC->0x2, decode ADD 0xC, execute AC<-7+9=16 (0x10). Final AC = 16.',
      hints: [
        'Fetch always copies MEM_PROG[PC] into IR and bumps PC first.',
        'ADD reads its operand from data memory during execute.',
        '16 decimal is 0x10 — AC is 8-bit, so this still fits with no carry.',
      ],
    },
    practiceExercises: [
      {
        title: 'Hand-assemble a sum',
        brief:
          'Write a Toy-1 program (bytes + mnemonics) that computes DATA[0xF] = DATA[0x8] + DATA[0x9], then trace it cycle by cycle assuming DATA[0x8]=20 and DATA[0x9]=22.',
        expectedBehavior:
          '0x18 (LOAD 0x8), 0x39 (ADD 0x9), 0x2F (STORE 0xF), 0x00 (HALT). Trace: AC becomes 20, then 42, then DATA[0xF]=42; four cycles total.',
        hints: [
          'LOAD has opcode 1 — the byte is (1 << 4) | address.',
          '42 = 20 + 22 fits in 8 bits; verify no carry out of bit 7.',
        ],
      },
      {
        title: 'Find the bug in a traced program',
        brief:
          'A classmate claims this program doubles DATA[0x5]: bytes 0x15, 0x35, 0x25 (LOAD 0x5, ADD 0x5, STORE 0x5) — but they claim the trace shows AC = 2 * DATA[0x5] only if DATA[0x5] < 128. Hand-trace with DATA[0x5] = 200 and state the exact final AC and flag behaviour.',
        expectedBehavior:
          'First ADD gives AC = 400, but AC is 8-bit: 400 mod 256 = 144 (0x90). The stored result is 144, not 400 — silent overflow, which is the bug. The program is correct only for DATA[0x5] <= 127.',
        hints: [
          '400 in binary needs 9 bits; the 8-bit AC keeps only the low 8.',
          '400 - 256 = 144; check 144 in binary is 1001 0000 (negative in two’s complement).',
        ],
      },
    ],
    assessment: {
      title: 'Fetch-decode-execute checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In the Toy-1 fetch phase, what happens?',
          options: [
            'IR <- MEM_PROG[PC], then PC increments',
            'PC <- MEM_PROG[IR], then IR increments',
            'AC <- MEM_DATA[PC]',
            'The ALU computes and the PC resets to 0',
          ],
          answer: 'IR <- MEM_PROG[PC], then PC increments',
          explanation:
            'Fetch copies the instruction byte at the PC into the IR and advances the PC so it points at the next instruction. Decode and execute then work from the IR.',
          hint: 'Fetch moves an instruction, not data, and it prepares the next fetch.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt:
            'Starting with AC = 3, what is AC after executing the single instruction byte 0x41, given DATA[0x1] = 1?',
          code: 'IR = 0x41   /* Toy-1 */',
          options: ['2', '4', '65', '0'],
          answer: '2',
          explanation:
            '0x41 decodes as opcode 4 (SUB) with operand 0x1, so AC <- AC - DATA[0x1] = 3 - 1 = 2.',
          hint: 'Opcode 4 is SUB and the operand is an address into data memory.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Which statement about RISC designs is correct?',
          options: [
            'Fixed-length instructions with simple, pipeline-friendly decode',
            'Variable-length instructions with many addressing modes',
            'Most instructions may both access memory and compute',
            'Code is always denser than CISC for the same task',
          ],
          answer: 'Fixed-length instructions with simple, pipeline-friendly decode',
          explanation:
            'RISC favours fixed encoding, load/store memory access and simple decode — which is what makes it pleasant to pipeline. CISC owns variable length, rich addressing modes and higher code density.',
          hint: 'The R in RISC refers to what the *hardware* does per instruction.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In the Toy-1 loop example, which instruction performs the actual repetition, and what is its byte encoding when jumping to address 0x0? (Give the byte in 0xNN form.)',
          answer: '0x60',
          explanation:
            'JMP 0x0 overwrites the PC with 0 during execute, restarting the loop; JMP has opcode 6 and operand 0x0, so the byte is 0x60.',
          hint: 'The unconditional jump is what closes the loop; JZ only exits it.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Fetch-decode-execute cycle', definition: 'The repeating three-phase process by which a CPU runs a program: fetch instruction at PC, decode it, execute it.' },
      { term: 'ISA (instruction set architecture)', definition: 'The contract between hardware and software: opcodes, operand encoding, registers and memory model.' },
      { term: 'Opcode / operand', definition: 'The opcode field selects the operation; the operand field supplies the address or immediate value it acts on.' },
      { term: 'RISC / CISC', definition: 'Two ISA design philosophies: simple fixed-format instructions (RISC) versus rich, variable, multi-operation instructions (CISC).' },
    ],
    revisionSummary: [
      'Every CPU runs the same loop: fetch (IR <- MEM_PROG[PC], PC++), decode, execute.',
      'Toy-1: 8-bit instructions, 4-bit opcode + 4-bit operand, separate program/data memory, 8-bit AC.',
      'Hand-traces catch overflow, wrong-operand and wrong-jump-target bugs immediately — always trace.',
      'RISC = fixed encoding, load/store, simple decode; CISC = variable encoding, rich modes, dense code.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Instruction cycle', url: 'https://en.wikipedia.org/wiki/Instruction_cycle', kind: 'article' },
      { label: 'Wikipedia — Reduced instruction set computer', url: 'https://en.wikipedia.org/wiki/Reduced_instruction_set_computer', kind: 'article' },
      { label: 'Wikipedia — Complex instruction set computer', url: 'https://en.wikipedia.org/wiki/Complex_instruction_set_computer', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
];
