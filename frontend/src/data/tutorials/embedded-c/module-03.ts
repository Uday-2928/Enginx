import type { TutorialLesson } from '../types';

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'embc-m03-l1',
    title: 'Memory-Mapped I/O',
    summary:
      'How peripheral registers live at fixed addresses in the same address space as RAM, how C reaches them with pointers, and how peripheral blocks are modelled as structs.',
    objectives: [
      'Explain memory-mapped I/O and contrast it with port-based I/O.',
      'Read a memory map: base address, offsets and register names.',
      'Model a peripheral block as a C struct of volatile members.',
      'Use pointer arithmetic to relate base address, offset and register address.',
    ],
    whyItMatters:
      'Every line of driver code you will ever write starts with the same question: "which address is this register at, and how wide is it?" Memory-mapped I/O is the bridge between the C type system and the physical chip, and it is the reason pointers — not abstraction libraries — are the true native tongue of firmware.',
    prerequisites: ['embc-m01-l2', 'embc-m02-l2', 'embc-m02-l3'],
    explanation:
      'In a memory-mapped system there is one address space. Flash occupies the low addresses, SRAM another region, and every peripheral\'s registers occupy fixed regions of the *same* map. Reading address 0x40010800 might give you a GPIO register; reading 0x40013800 a UART register. The CPU does not know or care that some addresses are RAM and some are hardware windows — the bus routes each access to whichever block owns that range.\n\n### The memory map is the hardware\'s table of contents\n\nA vendor reference manual begins with a memory map: each peripheral gets a **base address**, and each register inside it gets an **offset** from that base. A GPIO block might be at base 0x40010800 with its mode register at offset 0x00 and output register at offset 0x0C. The register\'s absolute address is base + offset. Once you internalise "base + offset = address", any vendor\'s map reads the same way, whatever the actual numbers.\n\n### How C reaches these addresses\n\nC reaches an address by casting an integer to a pointer and dereferencing it — usually hidden inside a macro from the vendor header:\n\n```c\n/* Illustrative real-hardware idiom (vendor headers do exactly this):\n   #define GPIOA_ODR  (*(volatile uint32_t *)0x4001080Cu) */\n```\n\nThat expression says: treat the number 0x4001080C as an address, and access a volatile 32-bit value there. It is completely legal *on the MCU* because that address is real hardware. On your PC the same line is undefined behaviour — address 0x4001080C belongs to nothing — which is exactly why this course\'s runnable examples use **mock registers**: plain `volatile` variables that model the register\'s width, offset structure and behaviour, clearly commented as educational.\n\n### Structs over blocks\n\nBecause a peripheral\'s registers sit at consecutive offsets, firmware models the whole block as a C struct with one member per register, in manual order. A pointer to the block base gives access to every register by name. The struct\'s member order *must* match the reference manual\'s offset table — that correspondence is the entire trick.',
    deepDive:
      '### Why volatile is mandatory here\n\nA peripheral register is memory that changes *by itself*: a status register flips a bit when hardware finishes an operation, an input register changes when the outside world does. The compiler must never cache one read into two (it would miss the change) or merge two writes into one (it would skip a hardware-required sequence). The `volatile` qualifier on the register type enforces both. This is not optional polish: register access without volatile is simply incorrect firmware, and it is the first thing experienced reviewers look for.\n\n### Access width and alignment\n\nRegisters have defined widths — 8, 16 or 32 bits — and the bus enforces access sizes. Writing a 32-bit value to an 8-bit register, or reading a write-only register (some exist, and read garbage), are classic mistakes. Two honest rules: use exactly the width the manual states for each register, and never "read back" a write-only register to check your write — write-only reads are undefined by many peripherals. Where a vendor provides a BSRR-style "set/reset" register that atomically sets or clears bits in one write, prefer it over read-modify-write on the data register — module 04 shows the pattern.\n\n### Reading your first memory map\n\nOpen any vendor reference manual and find the memory map table: columns are typically *address range*, *size*, *peripheral*. Rows are grouped by bus. From there, each peripheral chapter lists its registers with: offset, name, width, reset value, and a bit-field table (bit number, field name, access type R/W/RC_W1 and description). Get comfortable scanning that structure — lesson 3 of this module walks it end to end, and every later module tells you which conceptual register names map onto which real manual sections.',
    examples: [
      {
        title: 'A peripheral block modelled as a struct (host-runnable mock)',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stddef.h>\n#include <stdint.h>\n\n/* Educational mock of a GPIO peripheral block.\n * Member order mirrors a reference manual offset table.\n * REAL HARDWARE: the vendor header defines the same struct and a\n *   #define GPIOA ((gpio_t *)0x40010800u)\n * pointing it at the chip\'s fixed base address. On a host PC that\n * cast is undefined behaviour, so the mock is a plain variable. */\ntypedef struct {\n    volatile uint8_t MODER; /* offset 0x00: direction, 0=output 1=input */\n    volatile uint8_t ODR;   /* offset 0x01: output data latch          */\n    volatile uint8_t IDR;   /* offset 0x02: input sense (read-only)    */\n} gpio_mock_t;\n\nstatic gpio_mock_t MOCK_GPIOA = { 0u, 0u, 0u }; /* reset values all 0 */\n\nint main(void) {\n    /* Show the offsets the struct produced (0,1,2 on mainstream compilers). */\n    printf("MODER offset %zu\\n", offsetof(gpio_mock_t, MODER));\n    printf("ODR   offset %zu\\n", offsetof(gpio_mock_t, ODR));\n    printf("IDR   offset %zu\\n", offsetof(gpio_mock_t, IDR));\n\n    /* Configure pin 3 as output and drive it high — the register dance. */\n    MOCK_GPIOA.MODER &= (uint8_t)~(1u << 3); /* direction bit3 = 0: output */\n    MOCK_GPIOA.ODR   |= (uint8_t)(1u << 3);  /* drive pin 3 high           */\n\n    printf("MODER=0x%02X ODR=0x%02X\\n",\n           (unsigned)MOCK_GPIOA.MODER, (unsigned)MOCK_GPIOA.ODR);\n    return 0;\n}',
        explanation: [
          'The struct has one volatile member per register, ordered exactly as the (mock) offset table: 0x00, 0x01, 0x02.',
          '`offsetof` prints the layout the compiler generated — on all mainstream compilers, 0, 1 and 2 for consecutive same-width members. Vendor structs are designed so their offsets match the manual.',
          'The comment shows the real-hardware form — a struct pointer cast to the fixed base address — and says plainly why the mock does not do that on a PC.',
          'MODER &= ~(1<<3) clears bit 3 (direction = output); ODR |= (1<<3) sets output bit 3.',
          'Exact output: `MODER offset 0` / `ODR   offset 1` / `IDR   offset 2` / `MODER=0x00 ODR=0x08`.',
        ],
      },
      {
        title: 'Base + offset arithmetic on a mock block',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Same mock block, accessed the way real code indexes registers:\n * a base pointer plus a byte offset, like the memory map describes. */\nstatic volatile uint8_t MOCK_GPIOA_BLOCK[3] = { 0x00u, 0x08u, 0xFFu };\n/* offsets:                                        MODER   ODR    IDR */\n\nint main(void) {\n    volatile uint8_t *base = &MOCK_GPIOA_BLOCK[0];\n\n    uint8_t moder = base[0x00];   /* register at offset 0x00 */\n    uint8_t odr   = base[0x01];   /* register at offset 0x01 */\n    uint8_t idr   = base[0x02];   /* register at offset 0x02 */\n\n    printf("via offsets: MODER=0x%02X ODR=0x%02X IDR=0x%02X\\n",\n           (unsigned)moder, (unsigned)odr, (unsigned)idr);\n    return 0;\n}',
        explanation: [
          '`base` points at the block\'s first register, exactly like a struct pointer to a peripheral base on real hardware.',
          'Indexing with the manual\'s offsets (base[0x01]) is the arithmetic version of struct member access — both resolve to base + offset.',
          'The array is volatile-qualified element-wise, so reads are real accesses.',
          'Exact output: `via offsets: MODER=0x00 ODR=0x08 IDR=0xFF`.',
          'A debugger\'s "peripheral registers" window is doing this same trick: base address from the map, offsets from the manual.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'A memory map with peripherals living beside RAM',
        content:
          ' 0x0000 0000 +------------------+\n             | FLASH: code +    |   program, const data\n             |        vectors   |\n 0x0800 0000 +------------------+\n             | SRAM: variables, |   stack grows down here\n             |       stack      |\n 0x2000 0000 +------------------+\n             | ...unused...     |\n 0x4001 0800 +------------------+\n             | GPIOA base       | + 0x00 MODER\n             |  registers       | + 0x04 ODR      <- base + offset\n             |                  | + 0x08 IDR\n 0x4001 1000 +------------------+\n             | GPIOB base       |   next peripheral block\n 0x4001 3800 +------------------+\n             | USART base       |   serial block\n             +------------------+',
        caption:
          'Conceptual memory map (addresses illustrative). Peripherals occupy fixed ranges of the same space as RAM; the vendor manual defines every base and offset for your exact chip.',
      },
    ],
    tables: [
      {
        caption: 'Mock register map for the gpio_mock_t block',
        headers: ['Offset', 'Register', 'Width', 'Access', 'Reset', 'Purpose'],
        rows: [
          ['0x00', 'MODER', '8 bits', 'read/write', '0x00', 'Pin direction: 0 = output, 1 = input'],
          ['0x01', 'ODR', '8 bits', 'read/write', '0x00', 'Output data latch driven onto pins'],
          ['0x02', 'IDR', '8 bits', 'read-only', '0x00', 'Live level sensed on the pins'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Accessing registers through a non-volatile pointer to save typing.',
        fix:
          'The pointed-to type must carry volatile: `volatile uint8_t *`. Without it the compiler may cache, merge or delete accesses — behaviour that passes tests at -O0 and fails in the field at -O2.',
      },
      {
        mistake: 'Assuming struct member offsets you did not verify.',
        fix:
          'Member order defines layout, and padding can appear between differently-sized members. Match the manual\'s offset table exactly, keep member types equal to register widths, and verify with offsetof when in doubt.',
      },
      {
        mistake: 'Reading a write-only register (or an arbitrary host address) "to see what happens".',
        fix:
          'Write-only reads return undefined data on many peripherals, and casting arbitrary integers to pointers is undefined behaviour on a host. Respect the manual\'s access column; use mocks for host experiments.',
      },
    ],
    guidedPractice: {
      title: 'Decode a memory map',
      brief:
        'Given (illustrative) base address 0x4001 0C00 for a timer block and this offset table: 0x00 CR (control), 0x04 PSC (prescaler), 0x08 ARR (auto-reload), 0x0C CNT (counter): write the absolute address of each register, then write the C declaration of a struct modelling the block with correct volatile widths (all 16-bit).',
      expectedBehavior:
        'CR = 0x40010C00, PSC = 0x40010C04, ARR = 0x40010C08, CNT = 0x40010C0C. Struct: typedef struct { volatile uint16_t CR; volatile uint16_t PSC; volatile uint16_t ARR; volatile uint16_t CNT; } tim_mock_t; — member order matches offsets, all volatile, all uint16_t.',
      hints: [
        'Absolute address = base + offset; offsets here are multiples of 4.',
        'Width comes from the manual column, not from "whatever fits".',
      ],
    },
    practiceExercises: [
      {
        title: 'Mock the IDR update',
        brief:
          'Extend the struct mock: simulate the outside world driving pins 0 and 2 high by writing the IDR directly in main, then read IDR through the struct and print it. Explain in one sentence why the write is only a simulation (real IDR is read-only and reflects physical pin levels).',
        expectedBehavior:
          'MOCK_GPIOA.IDR = 0x05; then printing IDR shows 0x05. On real hardware software cannot write IDR: it mirrors physical pin voltage; setting it in the mock stands in for the electrical world changing the pins.',
        hints: [
          'Pins 0 and 2 high = mask 0b101 = 0x05.',
          'The manual lists IDR as read-only; the mock merely lets the host example act as the "world".',
        ],
      },
      {
        title: 'Why volatile on every member?',
        brief:
          'Explain in two or three sentences why each struct member above is individually volatile, and what could go wrong for the polling loop `while ((MOCK_GPIOA.IDR & (1u<<2)) == 0) {}` if the member were plain uint8_t.',
        expectedBehavior:
          'Volatile is a property of the type being accessed; each register is its own hardware location that changes independently. If IDR were plain, an optimizing compiler could read it once outside the loop and spin forever, never seeing the pin change.',
        hints: [
          'Think about which single access the compiler is allowed to hoist.',
          'One qualifier on the struct pointer would also work; per-member is the clearest habit.',
        ],
      },
    ],
    assessment: {
      title: 'Memory-mapped I/O checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Memory-mapped I/O means:',
          options: [
            'Peripheral registers appear at fixed addresses in the same address space as RAM',
            'Registers are stored in a file',
            'Peripherals copy their registers into RAM',
            'RAM is used to simulate the hardware',
          ],
          answer: 'Peripheral registers appear at fixed addresses in the same address space as RAM',
          explanation:
            'One address space holds flash, SRAM and peripheral windows; the bus routes each access to the owning block.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A peripheral base is 0x40020000 and a register is at offset 0x14. Its absolute address is:',
          options: ['0x40020014', '0x40020000', '0x14', '0x4002001E'],
          answer: '0x40020014',
          explanation: 'Absolute address = base + offset = 0x40020000 + 0x14.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'On a host PC, casting an arbitrary number like 0x40010800 to a pointer and dereferencing it is undefined behaviour.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'Host PCs have no hardware at that address; dereferencing it is UB. That is why host examples use mock variables, and why real register macros only work on the MCU.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Why must each member of a register struct be volatile?',
          options: [
            'Hardware can change register contents independently of program flow',
            'It makes access faster',
            'It is required for structs in C',
            'It places the struct in flash',
          ],
          answer: 'Hardware can change register contents independently of program flow',
          explanation:
            'Status and input registers change outside program flow; volatile forbids the compiler from caching or eliding accesses to them.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Which column of a reference-manual register description tells you whether software may read it, write it, or both?',
          answer: 'the access column (R / W / read-write)',
          explanation:
            'The access field (values like R, W, R/W, RC_W1) defines the software-visible permissions; violating it, e.g. reading a write-only register, yields undefined data.',
          hint: 'It sits next to the reset value in the register table.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Memory-mapped I/O', definition: 'Peripheral registers occupying fixed addresses in the CPU\'s normal address space, accessed with ordinary load/store instructions.' },
      { term: 'Base address', definition: 'The first address of a peripheral block; all its registers are at base + their documented offset.' },
      { term: 'Offset', definition: 'The byte distance from a block\'s base to a specific register, listed in the reference manual.' },
      { term: 'Register struct', definition: 'A C struct whose members mirror a peripheral\'s registers in order, width and volatility, pointed at the block base.' },
    ],
    revisionSummary: [
      'One address space: flash, SRAM and peripherals side by side; base + offset locates every register.',
      'The real-hardware idiom is a volatile pointer cast to the fixed address; host examples must use mocks instead.',
      'Model peripheral blocks as structs ordered exactly like the manual\'s offset table.',
      'volatile on every register access is mandatory, not stylistic.',
      'Respect width and access columns: 8/16/32-bit registers, and never read write-only ones.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Memory-mapped I/O', url: 'https://en.wikipedia.org/wiki/Memory-mapped_I/O_and_port-mapped_I/O', kind: 'article' },
      { label: 'cppreference — offsetof', url: 'https://en.cppreference.com/w/c/types/offsetof', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'embc-m03-l2',
    title: 'Read-Modify-Write and the Mask Toolkit',
    summary:
      'Build the four canonical register helpers — set, clear, toggle, test — on a mock register, and understand read-modify-write as a three-step sequence with real hazards.',
    objectives: [
      'Implement set_bit, clear_bit, toggle_bit and test_bit for a volatile register.',
      'Trace a multi-step register manipulation sequence with exact values.',
      'Explain the read-modify-write sequence and why changing one bit must not disturb others.',
      'Recognise when read-modify-write is unsafe (shared flags, some control registers) and prefer dedicated set/reset registers where the hardware provides them.',
    ],
    whyItMatters:
      'These four functions are the HelloWorld of firmware — and the job interview filter. More importantly, read-modify-write is the first place where software timing interacts with hardware state: an interrupt or peripheral changing a register between your read and your write is the seed of the nastiest concurrency bugs, introduced here and conquered in module 06.',
    prerequisites: ['embc-m03-l1', 'embc-m02-l2'],
    explanation:
      'Changing one bit of a register without disturbing the others cannot be done in a single store: a store replaces *all* bits. The only software route is **read-modify-write (RMW)**: read the current value into the CPU, modify the bits of interest with a mask, write the whole thing back.\n\n### The four helpers\n\nFirmware codebases converge on the same four inline helpers, operating on a pointer to the register so they can be reused for every peripheral:\n\n- **set**: `*reg |= (uint8_t)(1u << bit)` — OR can only add 1s, so exactly the target bit is forced high.\n- **clear**: `*reg &= (uint8_t)~(1u << bit)` — the inverted mask has a single 0 at the target bit; AND with 1 preserves everything else.\n- **toggle**: `*reg ^= (uint8_t)(1u << bit)` — XOR flips the bit whatever its state.\n- **test**: `(*reg >> bit) & 1u` — shift the wanted bit down to position 0 and mask.\n\nNote the parameter types: `volatile uint8_t *reg` for the three writers (they must be able to point at volatile registers) and `const volatile uint8_t *` for the tester (reads only, but still volatile).\n\n### Tracing an RMW sequence\n\nBecause RMW has three steps (load, modify, store), each helper call is really three bus transactions on real hardware. That matters when *something else* can change the register between the load and the store — an interrupt handler toggling the same register, or a peripheral clearing its own flag. The classic corruption: you read value 0x08, an interrupt sets bit 7 (register now 0x88), you write back your modified 0x09 — and bit 7 is silently lost. This race is why some registers must not be updated with plain RMW, and why critical sections exist.',
    deepDive:
      '### Why hardware often gives you an alternative\n\nVendors know RMW races are dangerous, so many peripherals offer registers that avoid the read step entirely. The STM32 GPIO BSRR is the textbook case: writing a 1 to the lower half *sets* those pins, writing a 1 to the upper half *clears* them — one store, no read, atomic from the software view. Where such set/reset registers exist, prefer them for output control. Where they do not (many 8-bit parts), RMW inside a critical section is the answer. This lesson\'s mock keeps a plain ODR so you learn the RMW mechanics; the GPIO module revisits the atomic alternative.\n\n### Pointers to volatile, spelled out\n\n`volatile uint8_t *reg` reads as "pointer to volatile uint8_t": the *pointed-to data* is volatile, which is what we want for registers. The pointer variable itself is not volatile. Compare with `uint8_t * volatile reg` — a volatile pointer to non-volatile data — which is almost never what you mean. The `const volatile uint8_t *` combination for the tester is worth reading twice: "software must not write through it, and hardware may change it under our feet".\n\n### Testing bits: two idioms, one meaning\n\n`if (reg & mask)` tests whether *any* masked bit is set, while `((*reg >> bit) & 1u) == 1u` extracts the bit as a 0/1 value. The first is shorter; the second yields a clean boolean-like value you can return from a function or assign into a status byte. Both compile to essentially the same machine code; pick per readability.',
    examples: [
      {
        title: 'The four helpers driving a mock output register, fully traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of an MCU GPIO output data register.\n * Real firmware accesses this via the vendor header (e.g. stm32f1xx.h);\n * the real ODR address and width come from the chip\'s reference manual. */\nstatic volatile uint8_t MOCK_GPIOA_ODR = 0x00u;\n\nstatic void reg_set_bit(volatile uint8_t *reg, uint8_t bit) {\n    *reg |= (uint8_t)(1u << bit);\n}\n\nstatic void reg_clear_bit(volatile uint8_t *reg, uint8_t bit) {\n    *reg &= (uint8_t)~(1u << bit);\n}\n\nstatic void reg_toggle_bit(volatile uint8_t *reg, uint8_t bit) {\n    *reg ^= (uint8_t)(1u << bit);\n}\n\nstatic uint8_t reg_test_bit(const volatile uint8_t *reg, uint8_t bit) {\n    return (uint8_t)((*reg >> bit) & 1u);\n}\n\nint main(void) {\n    printf("start      ODR=0x%02X\\n", (unsigned)MOCK_GPIOA_ODR);\n\n    reg_set_bit(&MOCK_GPIOA_ODR, 3);\n    printf("set b3     ODR=0x%02X\\n", (unsigned)MOCK_GPIOA_ODR);\n\n    reg_set_bit(&MOCK_GPIOA_ODR, 0);\n    printf("set b0     ODR=0x%02X\\n", (unsigned)MOCK_GPIOA_ODR);\n\n    reg_toggle_bit(&MOCK_GPIOA_ODR, 3);\n    printf("toggle b3  ODR=0x%02X\\n", (unsigned)MOCK_GPIOA_ODR);\n\n    printf("test b0    =%u\\n", (unsigned)reg_test_bit(&MOCK_GPIOA_ODR, 0));\n\n    reg_clear_bit(&MOCK_GPIOA_ODR, 0);\n    printf("clear b0   ODR=0x%02X\\n", (unsigned)MOCK_GPIOA_ODR);\n\n    printf("test b4    =%u\\n", (unsigned)reg_test_bit(&MOCK_GPIOA_ODR, 4));\n    return 0;\n}',
        explanation: [
          'start: ODR = 0x00.',
          'set bit 3: 0x00 | 0x08 = 0x08 → prints `set b3     ODR=0x08`.',
          'set bit 0: 0x08 | 0x01 = 0x09 → `set b0     ODR=0x09`.',
          'toggle bit 3: 0x09 ^ 0x08 = 0x01 → `toggle b3  ODR=0x01`.',
          'test bit 0: (0x01 >> 0) & 1 = 1 → `test b0    =1`.',
          'clear bit 0: 0x01 & ~0x01 (0xFE) = 0x00 → `clear b0   ODR=0x00`.',
          'test bit 4: (0x00 >> 4) & 1 = 0 → `test b4    =0`.',
          'Each helper performs one read-modify-write (or a single read for test); the sequence shows masks composing cleanly without ever disturbing neighbouring bits.',
        ],
      },
      {
        title: 'The RMW race, demonstrated deterministically',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nstatic volatile uint8_t MOCK_REG = 0x00u;\n\n/* A simulated interrupt that sets bit 7 (e.g. a hardware event flag). */\nstatic void simulated_isr(void) {\n    MOCK_REG |= (uint8_t)(1u << 7);\n}\n\nint main(void) {\n    /* Main context starts an RMW on bit 0: */\n    uint8_t local = MOCK_REG;        /* step 1: READ  -> local = 0x00   */\n\n    simulated_isr();                 /* ISR runs here: MOCK_REG = 0x80  */\n\n    local |= (uint8_t)(1u << 0);     /* step 2: MODIFY -> local = 0x01  */\n    MOCK_REG = local;                /* step 3: WRITE -> MOCK_REG =0x01 */\n\n    /* Bit 7, set by the ISR, has been silently lost: */\n    printf("MOCK_REG=0x%02X (bit7 lost!)\\n", (unsigned)MOCK_REG);\n    return 0;\n}',
        explanation: [
          'The read lands the register value in the CPU (here a local): 0x00.',
          'The simulated ISR then performs its own RMW, leaving MOCK_REG = 0x80 with bit 7 set.',
          'Main completes its modification and writes back 0x01 — the whole register — erasing bit 7.',
          'Exact output: `MOCK_REG=0x01 (bit7 lost!)`.',
          'This is the fundamental RMW race. On real silicon the same interleaving happens whenever an ISR or the hardware touches the register between your load and store; the fixes (critical sections, atomic set/reset registers, disable-interrupt windows) are module 06 material.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Read-modify-write as three bus transactions',
        content:
          '  SOFTWARE                              HARDWARE REGISTER\n  --------                              -----------------\n  tmp = *reg        ──── load ───────>  [ 0x08 ]  (read)\n  tmp |= 0x01       (inside CPU)        [ 0x08 ]  (unchanged)\n  *reg = tmp        ──── store ───────> [ 0x09 ]  (write)\n\n  If an ISR sets bit 7 between the load and the store:\n\n  tmp = *reg        ──── load ───────>  [ 0x08 ]\n                    ISR: reg |= 0x80 -> [ 0x88 ]\n  tmp |= 0x01       (inside CPU)\n  *reg = tmp        ──── store ───────> [ 0x09 ]   bit 7 LOST',
        caption:
          'RMW is not one atomic operation. The lower trace shows the interleaving that loses the ISR bit — the race this lesson demonstrates and later modules fix.',
      },
    ],
    tables: [
      {
        caption: 'Traced register sequence from the example',
        headers: ['Step', 'Operation', 'Mask', 'Value before', 'Value after'],
        rows: [
          ['1', 'set bit 3', '0x08', '0x00', '0x08'],
          ['2', 'set bit 0', '0x01', '0x08', '0x09'],
          ['3', 'toggle bit 3', '0x08', '0x09', '0x01'],
          ['4', 'test bit 0', '—', '0x01', 'returns 1'],
          ['5', 'clear bit 0', '~0x01 = 0xFE', '0x01', '0x00'],
          ['6', 'test bit 4', '—', '0x00', 'returns 0'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Passing the register by value: `void set_bit(uint8_t reg, uint8_t bit)`.',
        fix:
          'A value parameter is a copy — modifying it changes nothing outside the function. Registers must be passed as pointers: `volatile uint8_t *reg`, called with `&MOCK_GPIOA_ODR`.',
      },
      {
        mistake: 'Writing `*reg &= ~(1 << bit)` without thinking about the width of 1.',
        fix:
          '`1` is a signed int and ~(1 << bit) is then a full-width int; assigning into uint8_t truncates in a way that works but relies on implicit conversion. Be explicit: `(uint8_t)~(1u << bit)` makes the intent and width obvious, and avoids signed-shift pitfalls.',
      },
      {
        mistake: 'Using RMW on a register that other contexts also write, without protection.',
        fix:
          'Plain RMW can lose concurrent changes (see the race example). Either wrap the sequence in a critical section, or use a hardware set/reset register when the peripheral provides one.',
      },
    ],
    guidedPractice: {
      title: 'Implement and trace the mask toolkit',
      brief:
        'Starting from MOCK_GPIOA_ODR = 0x24 (0010 0100), apply: clear bit 5, set bit 1, toggle bit 2, test bit 2. Write the exact value after each step and the test result, then verify with the four helper functions from the example.',
      expectedBehavior:
        '0x24 = 0010 0100. Clear b5: 0000 0100 = 0x04. Set b1: 0000 0110 = 0x06. Toggle b2: 0000 0010 = 0x02. Test b2: (0x02 >> 2) & 1 = 0. Final register 0x02, test result 0.',
      hints: [
        'Write the binary at every step; hex alone hides mistakes.',
        'Toggle flips bit 2 from 1 to 0 here.',
      ],
      challengeId: 'ece-03-gpio-bit-toggle',
    },
    practiceExercises: [
      {
        title: 'Set/reset instead of RMW',
        brief:
          'Add two functions to the mock: `reg_set_mask_atomic(uint8_t mask)` that models a BSRR-style set register by a single assignment `MOCK_GPIOA_SET = mask;`, and explain in two sentences why a single store cannot lose the ISR bit the way RMW did.',
        expectedBehavior:
          'The function body is one store of the mask (e.g. MOCK_GPIOA_SET = 0x01; with the mock treating that as "set those bits"). There is no read step, so an ISR interleaving cannot be overwritten by a stale value — each store only adds effects, never re-states the other bits.',
        hints: [
          'The race needs a read value that can become stale.',
          'What information does a pure-set store simply not carry?',
        ],
      },
      {
        title: 'Mask arithmetic',
        brief:
          'Compute by hand, in hex: (a) mask for bits 0 and 7; (b) mask for the 2-bit field at bits 3..2; (c) ~0x28 expressed as an 8-bit hex constant; (d) 0x5A & 0x33; (e) 0x5A | 0x33.',
        expectedBehavior:
          '(a) 0x81. (b) bits 3..2 => 0b1100 = 0x0C. (c) ~0x28 = 1101 0111 = 0xD7. (d) 0101 1010 & 0011 0011 = 0001 0010 = 0x12. (e) 0101 1010 | 0011 0011 = 0111 1011 = 0x7B.',
        hints: [
          'Convert both operands to 8-bit binary first for (c)-(e).',
          'A field starting at bit s with width w has mask ((2^w - 1) << s).',
        ],
      },
    ],
    assessment: {
      title: 'RMW and masks checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Starting at 0x00: `reg |= (1u<<4); reg ^= (1u<<4);` — final value?',
          options: ['0x00', '0x10', '0x01', '0x11'],
          answer: '0x00',
          explanation:
            'Setting bit 4 gives 0x10; toggling bit 4 flips it back off: 0x10 ^ 0x10 = 0x00.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Why must the writer helpers take `volatile uint8_t *reg` rather than `uint8_t reg`?',
          options: [
            'The function must modify the caller\'s register, and the pointed-to access must be volatile',
            'Pointers are faster than values',
            'uint8_t parameters are illegal in C',
            'It avoids including stdint.h',
          ],
          answer: 'The function must modify the caller\'s register, and the pointed-to access must be volatile',
          explanation:
            'A value parameter is a local copy, so changes would be lost; and register accesses must carry volatile semantics.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'What does the final printf show?',
          code: 'volatile uint8_t r = 0xA5u;\nr &= (uint8_t)~0x0Fu;\nr |= (uint8_t)(1u << 1);\nprintf("0x%02X\\n", (unsigned)r);',
          options: ['0xA2', '0xB2', '0xA1', '0xA0'],
          answer: '0xA2',
          explanation:
            '0xA5 & ~0x0F = 1010 0000 = 0xA0 (low nibble cleared); 0xA0 | 0x02 = 0xA2.',
          hint: 'First keep only the high nibble, then set bit 1.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'An ISR sets bit 7 of a register while the main loop is between the load and store of its own RMW on bit 0. What happens and why?',
          options: [
            'The main loop write-back erases the ISR bit: a lost-update race',
            'Nothing: writes are atomic by definition',
            'The ISR bit wins automatically',
            'The compiler inserts a lock',
          ],
          answer: 'The main loop write-back erases the ISR bit: a lost-update race',
          explanation:
            'RMW reads a stale value and stores the whole register back, discarding the interleaved change. Critical sections or atomic set/reset registers prevent this.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'true-false',
          prompt: 'A read-modify-write on a register is a single atomic hardware operation.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'It is at least two bus accesses (load and store) with computation between; another context can interleave and its changes can be lost.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Read-modify-write (RMW)', definition: 'The load-modify-store sequence required to change part of a register; not atomic.' },
      { term: 'Lost update', definition: 'The race where a stale RMW write-back erases a change another context made between the load and the store.' },
      { term: 'Set/reset register', definition: 'A hardware register (like STM32 BSRR) where a single store atomically sets or clears target bits with no read step.' },
      { term: 'Pointer to volatile', definition: 'A pointer type (volatile uint8_t *) whose pointed-to accesses carry volatile semantics.' },
    ],
    revisionSummary: [
      'RMW = read, modify in CPU, write back; needed for any partial register change.',
      'set |=, clear &= ~mask, toggle ^=, test = (reg >> bit) & 1.',
      'Each RMW is multiple bus transactions and can race with ISRs or hardware.',
      'Prefer hardware set/reset registers or critical sections where races are possible.',
      'Pass registers as pointers to volatile; test functions take const volatile pointers.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Read–modify–write', url: 'https://en.wikipedia.org/wiki/Read%E2%80%93modify%E2%80%93write', kind: 'article' },
      { label: 'Wikipedia — Load–link/store–conditional (atomicity background)', url: 'https://en.wikipedia.org/wiki/Load-link/store-conditional', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m03-l3',
    title: 'Volatile Semantics, Access Widths and Reading a Datasheet',
    summary:
      'Pin down exactly what volatile promises and withholds, why access width matters on the bus, and how to extract a working register sequence from a real vendor reference manual.',
    objectives: [
      'Restate the three things volatile guarantees and the three it does not.',
      'Explain why some registers must be accessed at their exact documented width and in a specific order.',
      'Walk a reference-manual register description: offset, reset value, bit fields, access types.',
      'Complete a mock-register lab: implement the bit toolkit against a field-structured register and decode fields back out.',
    ],
    whyItMatters:
      'The gap between "code that works at -O0 on a dev board" and "code that survives review" is almost always volatile discipline and manual fidelity. This lesson closes module 03 by making you independent: given any reference manual and a blank file, you can now produce a correct, verifiable register layer.',
    prerequisites: ['embc-m03-l1', 'embc-m03-l2', 'embc-m02-l3'],
    explanation:
      'Module 02 introduced volatile as "no caching, no eliding". Now we state the full contract, because register code depends on its precise edges.\n\n### The volatile contract, exactly\n\nvolatile guarantees: (1) every read and write in the source actually happens on the bus, in the number the source shows; (2) accesses are not merged, split or deleted; (3) volatile accesses execute in program order **relative to other volatile accesses**. It does *not* guarantee: (1) atomicity — a 32-bit volatile access on an 8-bit bus is still multiple bus cycles an interrupt can interrupt; (2) mutual exclusion — concurrent RMWs still race (module 03-l2 showed the lost update); (3) ordering of non-volatile accesses around volatile ones, or hardware-level memory barriers. The honest summary for firmware: volatile makes your *intent* visible to the compiler; atomicity and ordering need critical sections, atomic primitives or barriers — topics of module 06.\n\n### Width matters: the bus is not byte-uniform\n\nSome registers only work when accessed at their documented width. A 16-bit timer count register latched as a whole may tear if you read it as two 8-bit halves (some peripherals add shadow latching to make even that safe — only the manual knows). Some FIFO data registers consume an entry on *every* read, so a wide speculative read would swallow two entries. Conversely, some control registers demand a specific write sequence (unlock, write, lock). The rule: the manual\'s width and sequence notes are law; clever "equivalent" accesses are not equivalent.\n\n### Reading a register description like an engineer\n\nEvery reference manual register entry has the same anatomy: a name and offset, a width, a reset value, then a bit-field table. For each field you get: bit range, name, access type (R = readable, W = writable, R/W, and special forms like RC_W1 "read-clear/write-1-to-clear" — the interrupt-flag convention in timers and UARTs), and a one-line meaning. The skill is turning a paragraph of prose requirements into a mask + shift + sequence — the exact arithmetic from lesson 2 — and then verifying each step against the reset value and access column.',
    deepDive:
      '### The lab: from field table to verified code\n\nThis lesson\'s example models a UART-style control register with three documented fields — UE (enable, bit 0), RE (receiver enable, bit 2), TE (transmitter enable, bit 3) — plus a status register with a TXE flag (bit 1, read-only). Building the configuration is field insertion (clear field, OR value); validating it afterwards is field extraction. Doing both in one small program — and printing every intermediate — is the lab that cements modules 02 and 03. The same exercise with your favourite vendor\'s manual in front of you is how professionals actually work.\n\n### Reset values are your unit tests\n\nA register\'s reset value tells you what the hardware guarantees before your code runs. Good firmware starts from the reset state and only flips documented bits; firmware that "works" by poking undocumented magic values is a time bomb on the next chip revision. When debugging a peripheral that misbehaves, dump its registers and compare against the reset values and your intended configuration — a mismatch pinpoints either a bad mask, a wrong offset, or a stray RMW clobbering a field.\n\n### Volatile and const together\n\n`const volatile uint32_t` describes a read-only, hardware-changing location (chip ID, revision register): software may not write it, and reads must not be cached. That combination looks contradictory until you separate the audiences — const constrains *software*, volatile constrains *the compiler*. Ordinary control registers are plain volatile; RAM variables shared with ISRs are volatile but not const; pure lookup tables are const but not volatile.',
    examples: [
      {
        title: 'Lab: configure and decode a field-structured mock control register',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of a UART-style control register, field layout:\n *   bit 0 : UE  (usart enable,    R/W, reset 0)\n *   bit 2 : RE  (receiver enable, R/W, reset 0)\n *   bit 3 : TE  (transmitter en., R/W, reset 0)\n * Real firmware builds this from the vendor header\'s register\n * definitions; the field meanings come from the reference manual. */\nstatic volatile uint8_t MOCK_USART_CR1 = 0x00u;\n\n#define CR1_UE  (1u << 0)\n#define CR1_RE  (1u << 2)\n#define CR1_TE  (1u << 3)\n\nstatic uint8_t cr1_read_field(uint8_t mask, uint8_t shift) {\n    return (uint8_t)((MOCK_USART_CR1 & mask) >> shift);\n}\n\nint main(void) {\n    /* Enable the peripheral with transmitter only: UE | TE. */\n    MOCK_USART_CR1 |= (uint8_t)(CR1_UE | CR1_TE);\n\n    printf("CR1=0x%02X\\n", (unsigned)MOCK_USART_CR1);\n    printf("UE=%u RE=%u TE=%u\\n",\n           (unsigned)cr1_read_field(0x01u, 0),\n           (unsigned)cr1_read_field(0x04u, 2),\n           (unsigned)cr1_read_field(0x08u, 3));\n\n    /* Later: enable the receiver too (another field insert). */\n    MOCK_USART_CR1 |= (uint8_t)CR1_RE;\n    printf("CR1 now=0x%02X\\n", (unsigned)MOCK_USART_CR1);\n    return 0;\n}',
        explanation: [
          'The masks are named for the field bits exactly as a manual would list them; the mock register starts at its reset value 0x00.',
          'First write: 0x00 | (0x01 | 0x08) = 0x09 → prints `CR1=0x09`.',
          'Field decode: UE = (0x09 & 0x01) >> 0 = 1; RE = (0x09 & 0x04) >> 2 = 0; TE = (0x09 & 0x08) >> 3 = 1 → prints `UE=1 RE=0 TE=1`.',
          'Adding RE later: 0x09 | 0x04 = 0x0D → prints `CR1 now=0x0D`. Each OR-insert is safe here because these fields are set-only in this sequence and nothing else writes the register.',
          'The pattern — named bit masks, one field insert per concern, decode to verify — is exactly how a driver configuration layer reads and self-checks.',
        ],
      },
      {
        title: 'Width and sequence: a write-only key register (concept demo)',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of a peripheral that requires a fixed access\n * sequence: write KEY = 0xA5 to unlock, then write the config,\n * then write KEY = 0x5A to lock. Many real peripherals (watchdogs,\n * clock controllers) have such sequences - always from the manual. */\nstatic volatile uint8_t MOCK_KEYREG  = 0x00u;\nstatic volatile uint8_t MOCK_CFGREG  = 0x00u;\nstatic uint8_t          mock_locked  = 1u;\n\nstatic void mock_write_cfg(uint8_t value) {\n    MOCK_KEYREG = 0xA5u;             /* step 1: unlock  */\n    mock_locked = 0u;\n    MOCK_CFGREG = value;             /* step 2: config  */\n    MOCK_KEYREG = 0x5Au;             /* step 3: lock    */\n    mock_locked = 1u;\n}\n\nint main(void) {\n    mock_write_cfg(0x2Du);\n    printf("KEY=0x%02X CFG=0x%02X locked=%u\\n",\n           (unsigned)MOCK_KEYREG, (unsigned)MOCK_CFGREG, (unsigned)mock_locked);\n    return 0;\n}',
        explanation: [
          'The helper encodes the *documented sequence* — unlock, config, lock — as three separate stores; no reads, no reordering, no merging.',
          'Exact output: `KEY=0x5A CFG=0x2D locked=1`.',
          'On real hardware, KEY registers are typically write-only and sequence-checked: a wrong key or a reordered write leaves the peripheral locked (or hard-faults). This is why such code is a single function, never scattered stores.',
          'Note every store is a whole-width assignment of the documented value — access width and sequence follow the (mock) manual exactly.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Anatomy of a reference-manual register description',
        content:
          '  13.4.2  USART control register 1 (USART_CR1)\n          Offset: 0x0C   Reset value: 0x0000   Width: 16 bits\n\n          bit  | 15 ... 4 | 3  | 2  | 1 | 0 |\n          name |   -      | TE | RE | - | UE |\n          access|         | R/W| R/W|   | R/W|\n\n  Reading order:\n   1. name + offset   -> build the C macro/struct member\n   2. reset value     -> what the hardware guarantees first\n   3. width           -> the exact type to use (uint16_t here)\n   4. field table     -> masks and shifts: UE=bit0, RE=bit2, TE=bit3\n   5. access column   -> R/W? write-only? read-clear? (flag semantics!)',
        caption:
          'Structure is near-identical across STM32, ATmega and ESP32 manuals. Steps 1-5 convert any register description into code mechanically.',
      },
    ],
    tables: [
      {
        caption: 'The volatile contract at a glance',
        headers: ['Question', 'Plain variable', 'volatile variable'],
        rows: [
          ['Can the compiler cache a read in a register?', 'Yes', 'No'],
          ['Can it merge or delete redundant writes?', 'Yes', 'No'],
          ['Are volatile-to-volatile accesses ordered?', 'n/a', 'Yes, program order'],
          ['Is a multi-byte access atomic?', 'No', 'No (still not atomic)'],
          ['Does it stop RMW races between contexts?', 'n/a', 'No — needs critical sections/atomics'],
          ['Does it order non-volatile accesses around it?', 'n/a', 'No'],
        ],
      },
      {
        caption: 'Common access-type notations in vendor manuals',
        headers: ['Notation', 'Meaning', 'Firmware consequence'],
        rows: [
          ['R/W', 'Readable and writable', 'Ordinary field insert/extract'],
          ['R', 'Read-only (e.g. IDR, chip ID)', 'Never write; may be const volatile'],
          ['W', 'Write-only (e.g. some data/FIFO regs)', 'Never read back; writes may have side effects'],
          ['RC_W1 / W1C', 'Write 1 to clear (interrupt flags)', 'Clear with |= of the flag mask, never plain store'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reading an interrupt flag register with a plain assignment to "check all flags at once" when the flags are write-1-to-clear.',
        fix:
          'On W1C registers, *reading* is safe but *writing* the whole register would clear every flag whose bit you write as 1. Clear only the intended flag: `reg = (uint8_t)FLAG_MASK;` or `reg |= FLAG_MASK` only if the register is documented write-1-to-clear with reads unaffected — always follow the manual\'s exact clearing idiom.',
      },
      {
        mistake: 'Accessing a 16-bit register as two 8-bit halves because it is convenient.',
        fix:
          'The manual specifies width and any shadow-latching behaviour. Splitting an access can tear values or double-consume FIFO entries. Use the documented width; only rely on split access where the manual explicitly permits it.',
      },
      {
        mistake: 'Believing volatile alone makes an ISR-shared register update safe.',
        fix:
          'volatile guarantees real, ordered accesses — not atomicity or exclusion. Pair it with critical sections, atomic set/reset registers or disable/restore-interrupt windows (module 06).',
      },
    ],
    guidedPractice: {
      title: 'Manual-to-code translation lab',
      brief:
        'Given this (educational) register description — TIMER_CTRL, offset 0x00, width 8, reset 0x00; fields: START bit 0 (R/W), MODE bits 2..1 (R/W, 0=stop 1=one-shot 2=periodic 3=free), IRQEN bit 7 (R/W): write the three mask macros, then write code that configures periodic mode with interrupts enabled and the timer started, and finally decode MODE from the result. State the expected final register value.',
      expectedBehavior:
        'Masks: START=(1u<<0), MODE_MASK=(0x3u<<1)=0x06, IRQEN=(1u<<7). Periodic=2 -> MODE value 2 << 1 = 0x04. Final: 0x04 | 0x80 | 0x01 = 0x85. Decode: (0x85 & 0x06) >> 1 = 2 = periodic.',
      hints: [
        'Field value 2 must be shifted to its position: (2u << 1).',
        'Set the field with clear-then-OR if it might already hold a value; here it starts at reset 0.',
      ],
    },
    practiceExercises: [
      {
        title: 'Design a W1C flag clear',
        brief:
          'A mock status register MOCK_TIM_SR has flags UIE at bit 0 and CCIE at bit 1, documented write-1-to-clear. Write a function clear_flag(uint8_t mask) that clears exactly the given flag without disturbing the other, and state the two candidate implementations (mask-store vs |=) and which one the manual\'s wording justifies.',
        expectedBehavior:
          'For a true W1C register, writing 1 clears and writing 0 leaves unchanged, so both `MOCK_TIM_SR = mask;` and `MOCK_TIM_SR |= mask;` clear only the masked flag — the difference matters only for registers that store written 0s. The manual\'s W1C wording justifies either; a plain store of a full value would be wrong on a plain R/W register.',
        hints: [
          'Key question: what does writing 0 do on this register?',
          'Compare with an ordinary R/W register, where the two differ radically.',
        ],
      },
      {
        title: 'Reset-value audit',
        brief:
          'A colleague\'s driver writes 0x37 directly to the mock CR1 above (bits: 0x37 = 0011 0111) claiming it enables everything. Decode which fields that turns on, note which bit is undocumented (bit 4), and rewrite the line using named masks for UE|RE|TE only.',
        expectedBehavior:
          '0x37 = UE(bit0)=1, RE(bit2)=1, TE(bit3)=1, bit4=1 undocumented, bit5=1 undocumented. Rewritten: `MOCK_USART_CR1 |= (uint8_t)(CR1_UE | CR1_RE | CR1_TE);` producing 0x0D. Magic values hide undocumented writes; named masks keep the configuration auditable against the manual.',
        hints: [
          'Decode each set bit against the field table.',
          'Undocumented bits may control reserved behaviour that changes between chip revisions.',
        ],
      },
    ],
    assessment: {
      title: 'Volatile and datasheet checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which list contains ONLY things volatile actually guarantees?',
          options: [
            'Real accesses, no eliding, volatile-to-volatile program order',
            'Atomicity, exclusion, barriers',
            'Atomicity, real accesses, exclusion',
            'Barriers, exclusion, no eliding',
          ],
          answer: 'Real accesses, no eliding, volatile-to-volatile program order',
          explanation:
            'volatile is purely a compiler contract. Atomicity, exclusion and memory barriers come from other mechanisms.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A register is documented W (write-only). What is wrong with `if (reg & FLAG) ...`?',
          options: [
            'Reading a write-only register returns undefined data',
            'Nothing; reads are always allowed',
            'It sets the flag',
            'It clears all flags',
          ],
          answer: 'Reading a write-only register returns undefined data',
          explanation:
            'The access column is binding: W registers may read as garbage or trigger side effects. Track state in software instead.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'The reset value column tells you what each register contains before your code configures it.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'Reset values are the hardware\'s guaranteed power-on state and the natural baseline for verifying your configuration.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'Using the CR1 lab masks (UE bit0, RE bit2, TE bit3), what is CR1 after `CR1 |= (uint8_t)(CR1_UE | CR1_TE | CR1_RE);` from reset?',
          code: 'MOCK_USART_CR1 |= (uint8_t)(CR1_UE | CR1_RE | CR1_TE);',
          options: ['0x0D', '0x09', '0x07', '0x0F'],
          answer: '0x0D',
          explanation:
            '0x01 | 0x04 | 0x08 = 0x0D (binary 0000 1101). UE, RE and TE all enabled.',
          hint: 'Add the three mask values.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the access type (two words, as used in vendor manuals) for interrupt flag registers that are cleared by writing a 1 to the flag bit.',
          answer: 'write-1-to-clear',
          explanation:
            'Also written W1C or RC_W1 in manuals: writing 1 clears the flag; writing 0 leaves it alone.',
          hint: 'The operation is in the name: write one ... clear.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Volatile contract', definition: 'Real, unelided accesses in program order relative to other volatile accesses — and nothing more.' },
      { term: 'Access width', definition: 'The byte/word size the manual requires for a register access; wrong widths can tear values or trigger side effects.' },
      { term: 'W1C (write-1-to-clear)', definition: 'Flag semantics where writing 1 clears a flag bit and writing 0 leaves it unchanged.' },
      { term: 'Reset value', definition: 'The value a register is guaranteed to hold after reset, before firmware configures it.' },
      { term: 'Bit-field table', definition: 'The per-register table of bit ranges, names, access types and meanings in a reference manual.' },
    ],
    revisionSummary: [
      'volatile = real accesses, no eliding, volatile-order; never atomicity, exclusion or barriers.',
      'Access width and sequence are law; split or widened accesses are not "equivalent".',
      'Manual anatomy: name/offset, reset value, width, field table, access column — mechanical translation to masks.',
      'Name your masks after the manual\'s fields; decode-and-print to verify against reset values.',
      'const volatile suits read-only hardware-set registers; plain volatile suits control registers and ISR-shared flags.',
    ],
    furtherReading: [
      { label: 'cppreference — volatile in C', url: 'https://en.cppreference.com/w/c/language/volatile', kind: 'docs' },
      { label: 'Wikipedia — Memory-mapped I/O', url: 'https://en.wikipedia.org/wiki/Memory-mapped_I/O_and_port-mapped_I/O', kind: 'article' },
      { label: 'developer.arm.com — documentation portal (reference manuals)', url: 'https://developer.arm.com/documentation', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
];
