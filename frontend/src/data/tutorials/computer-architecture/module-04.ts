import type { TutorialLesson } from '../types';

export const module04Lessons: TutorialLesson[] = [
  {
    id: 'carc-m04-l1',
    title: 'System Buses: Address, Data, Control',
    summary:
      'How the CPU talks to the rest of the system: the three-bus model, bus transactions, and the arithmetic of address spaces.',
    objectives: [
      'Name the three bus groups and what each carries.',
      'Describe a read and a write transaction step by step.',
      'Compute address-space size from address-bus width.',
      'Explain bus width trade-offs (more wires = more data per transfer, more pins, more cost).',
    ],
    whyItMatters:
      'Every memory access, every peripheral register read, every DMA transfer rides on the buses. Whether you later design an SoC, write firmware that configures peripherals, or debug a board with a logic analyzer, you are watching bus transactions. This lesson gives you the vocabulary and the arithmetic that the rest of the module assumes.',
    prerequisites: [
      'carc-m01 (CPU fundamentals, fetch-decode-execute)',
      'carc-m02 (memory hierarchy)',
    ],
    explanation:
      'A **bus** is a shared set of wires connecting two or more units. The classic system has three groups:\n\n- **Address bus**: carries *where* — one direction, from the initiator (usually the CPU) to memory/peripherals. n wires reach 2^n distinct locations.\n- **Data bus**: carries *what* — bidirectional; its width sets how many bits move per transfer.\n- **Control bus**: carries *when and how* — read/write strobes, chip selects, clock, interrupt lines, ready/wait signals.\n\n### A read transaction, step by step\n\n1. The CPU places the address on the address bus and asserts READ on the control bus.\n2. Address decoding logic (inside each memory or peripheral) compares the address against its assigned range; exactly one device recognises it and asserts its **chip select**.\n3. The selected device drives the data onto the data bus.\n4. The CPU captures the data at the agreed point in the cycle (on a clock edge for synchronous buses; after a READY handshake for asynchronous ones).\n\nA write transaction is the same, except the CPU drives the data and the strobe direction is WRITE. The essential insight: **memory, peripheral registers and device buffers are all just addresses** — the same transaction serves all of them, and only the decode logic distinguishes destinations. That single idea is what makes memory-mapped I/O (next lesson) work.\n\n### Address-space arithmetic\n\nAn n-bit address bus reaches 2^n locations. A 16-bit bus reaches 2^16 = 65,536 bytes = **64 KiB** — the classic 8-bit era. A 20-bit bus (8086) reached 1 MiB; 32-bit reach 4 GiB; 64-bit machines in practice implement 48 or fewer address bits — 2^64 bytes is 16 exabytes, more than any board will ever populate. The gap between architectural and implemented address bits is one of the first things to check when reading a datasheet.',
    deepDive:
      '### Shared wires mean arbitration\n\nBecause the bus is shared, only one unit may drive it at a time — two devices driving opposite values on the same wire is an electrical fault (bus contention). When several units want the bus (CPU, DMA controller, another core), an **arbiter** grants ownership in some priority order. Masters and arbiters are the subject of lesson 3; for now, note that every bus transaction you trace implies someone won the right to drive.\n\n### Buses evolve into networks\n\nAs systems grew, the single shared bus became a bottleneck and physically awkward (long shared wires are slow). Modern SoCs replace the flat bus with **interconnect fabrics** — crossbars and switched networks where multiple pairs of units can talk simultaneously (AMBA AXI on ARM-class SoCs is the canonical example). The three-concern model survives inside the switches: every packet still encodes address, data and control.',
    examples: [
      {
        title: 'Address-space arithmetic',
        language: 'c',
        code: `#include <stdio.h>
#include <stdint.h>

int main(void) {
    uint32_t addrBits = 16;
    uint32_t space = 1u << addrBits;          /* 65536 bytes */
    printf("16-bit address bus -> %u bytes = %u KiB\\n", space, space / 1024);

    printf("32-bit address bus -> 2^32 bytes = 4 GiB\\n");
    printf("20-bit address bus -> 2^20 bytes = 1 MiB\\n");
    (void)space;
    return 0;
}`,
        explanation: [
          '1u << 16 computes 2^16 = 65536 exactly (fits in a uint32_t).',
          '65536 / 1024 = 64, so a 16-bit bus covers 64 KiB — the full memory map of a classic 8-bit microcomputer.',
          '2^20 = 1,048,576 bytes = 1 MiB (the 8086-era boundary), and 2^32 = 4 GiB (the limit a 32-bit pointer can express).',
          'The program prints: 16-bit address bus -> 65536 bytes = 64 KiB / 32-bit address bus -> 2^32 bytes = 4 GiB / 20-bit address bus -> 2^20 bytes = 1 MiB.',
          'The 4 GiB figure is not printed from a computed value — 2^32 does not fit in a uint32_t — it is stated as text, which is itself the lesson about overflow.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The three-bus system and address decoding',
        content:
          '                +------------------+\n                |       CPU        |\n                +--|----|----|----+\n          address |    |    | data (bidirectional)\n            bus   |    |    |  bus\n                  v    v    v\n        ===========================================  control bus\n             |            |             |\n        +---------+  +---------+  +-----------+\n        |  ROM    |  |  RAM    |  |  Periph   |\n        | 0x0000- |  | 0x8000- |  | 0xC000-   |\n        | 0x7FFF  |  | 0xBFFF  |  | 0xFFFF    |\n        +---------+  +---------+  +-----------+\n          decode: each device compares the address\n          with its range and asserts chip select',
        caption:
          'One shared address/data/control infrastructure; address decoding decides which device participates in each transaction. The ranges shown are illustrative.',
      },
    ],
    tables: [
      {
        caption: 'The three bus groups',
        headers: ['Bus', 'Carries', 'Direction'],
        rows: [
          ['Address', 'Location selector (2^n locations for n wires)', 'Initiator -> all devices'],
          ['Data', 'The value read or written', 'Bidirectional'],
          ['Control', 'READ/WRITE strobes, chip selects, clock, ready, interrupts', 'Mixed, per signal'],
        ],
      },
      {
        caption: 'Address-bus width versus space (powers of two worth memorising)',
        headers: ['Width', 'Locations', 'Common label'],
        rows: [
          ['8', '256', '256 bytes'],
          ['16', '65,536', '64 KiB'],
          ['20', '1,048,576', '1 MiB'],
          ['32', '4,294,967,296', '4 GiB'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming the data bus width and address bus width are the same.',
        fix: 'They are independent design choices. An 8-bit data bus with a 16-bit address bus was common (64 KiB of 8-bit locations); a 32-bit data bus may pair with 16 address bits (4 GiB address *range* is not implied).',
      },
      {
        mistake: 'Forgetting that exactly one device may drive the data bus per transaction.',
        fix: 'Address decoding must be exact — overlapping ranges put two tri-state drivers on the same wires. Debug symptom: reading a peripheral returns garbage or bus contention heats the chip.',
      },
      {
        mistake: 'Counting 2^n as the number of bytes addressable by an n-bit bus without checking the addressing unit.',
        fix: 'Some machines address words, not bytes; a 16-bit word-addressed bus with 12 address bits reaches 4096 words = 8 KiB. Always ask what one address means in that system.',
      },
    ],
    guidedPractice: {
      title: 'Design a decode map',
      brief:
        'A toy system has a 16-bit address bus, 8 KiB ROM, 8 KiB RAM and 16 peripheral registers. Propose address ranges for each that tile the space without overlap, and state the chip-select condition for the peripheral block.',
      expectedBehavior:
        'One valid map: ROM 0x0000-0x1FFF (8 KiB), RAM 0x2000-0x3FFF (8 KiB), peripherals 0xFF00-0xFF0F (16 bytes). Peripheral chip select = (addr >= 0xFF00 && addr <= 0xFF0F); any non-overlapping tiling is acceptable if the ranges sum to at most 64 KiB and every range is contiguous.',
      hints: [
        '8 KiB = 2^13, so ROM covers 0x0000-0x1FFF.',
        'Peripherals conventionally sit at the top of the map or at a fixed high window.',
        'Check that no two ranges intersect: sort them and compare neighbours.',
      ],
    },
    practiceExercises: [
      {
        title: 'Transaction trace',
        brief:
          'Write the five steps of a WRITE transaction to peripheral register 0xC004, mirroring the read steps in the lesson, and state which bus group changes role compared to a read.',
        expectedBehavior:
          'CPU drives 0xC004 on the address bus, asserts WRITE, the decoder chip-selects the peripheral, the CPU drives the data value onto the data bus, and the peripheral latches it on the strobe/edge. The data bus changes role: the CPU drives it (during a read, the selected device drives).',
        hints: [
          'Compare step 3 of the read: who sources the data?',
          'The address bus always originates from the initiator in these single-master examples.',
        ],
      },
      {
        title: 'Width trade-off argument',
        brief:
          'A designer must choose between a 32-bit data bus and a 16-bit data bus at twice the clock. For 4-byte transfers, compare cycles per 4-byte access for each option and name one non-performance reason to prefer each.',
        expectedBehavior:
          '32-bit bus: 1 cycle per 4-byte access. 16-bit bus at 2x clock: 2 transfers x half the period = the same total time per 4-byte access in the ideal case. Prefer 32-bit for simpler logic and fewer transactions; prefer 16-bit for fewer pins/pads (package cost, routing) — the real trade is wires versus frequency.',
        hints: [
          'Count transfers needed for one 4-byte word on each bus.',
          'Each data-bus wire is a physical pin on the package.',
        ],
      },
    ],
    assessment: {
      title: 'Buses checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which bus group determines how many distinct locations the system can reach?',
          options: ['Address bus', 'Data bus', 'Control bus', 'Clock distribution'],
          answer: 'Address bus',
          explanation:
            'n address wires give 2^n locations. The data bus sets transfer size, and control signals set timing and direction.',
          hint: 'Location = address.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: 'uint32_t space = 1u << 16;\nprintf("%u KiB", space / 1024);',
          options: ['16 KiB', '64 KiB', '65536 KiB', '1024 KiB'],
          answer: '64 KiB',
          explanation:
            '2^16 = 65536 bytes; 65536 / 1024 = 64. A 16-bit address bus covers 64 KiB.',
          hint: 'First compute 2^16, then divide by 1024.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'During a write transaction, the selected peripheral drives the data bus.',
          answer: 'false',
          explanation:
            'The writer drives the data bus. On a write that is the CPU (or DMA master); on a read it is the selected memory/peripheral. Getting this backwards is the classic bus-contention bug.',
          hint: 'Data always flows from the producer of the value.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'What logic block decides which device responds to a given address (two words)?',
          answer: 'address decoder',
          explanation:
            'Address decoding logic (comparators or range decoders inside each device or a central decoder) asserts exactly one chip select per transaction.',
          hint: 'It turns an address into a chip select.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Bus', definition: 'A shared set of wires carrying address, data or control information between system units.' },
      { term: 'Chip select', definition: 'A control signal that activates exactly one device to participate in a bus transaction.' },
      { term: 'Bus contention', definition: 'Two drivers asserting different values on the same wires — an electrical fault caused by faulty decoding or arbitration.' },
      { term: 'Bus master', definition: 'The unit currently allowed to initiate transactions (drive address and control).' },
      { term: 'Bus arbitration', definition: 'The mechanism that resolves competing masters and grants bus ownership.' },
    ],
    revisionSummary: [
      'Three bus groups: address (where), data (what), control (when/how).',
      'Read: device drives data; write: CPU/master drives data.',
      'n address bits = 2^n locations: 16 bits = 64 KiB, 20 = 1 MiB, 32 = 4 GiB.',
      'Address decoding selects exactly one device; shared buses need arbitration among masters.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Bus (computing)', url: 'https://en.wikipedia.org/wiki/Bus_(computing)', kind: 'article' },
      { label: 'Wikipedia — Memory-mapped I/O and port-mapped I/O', url: 'https://en.wikipedia.org/wiki/Memory-mapped_I/O', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'carc-m04-l2',
    title: 'Memory-Mapped I/O and Polling',
    summary:
      'Treat peripherals as addresses: memory-mapped versus port I/O, the volatile keyword that makes firmware honest, and the polling loop as the simplest device-control strategy.',
    objectives: [
      'Distinguish memory-mapped I/O from port (separate address space) I/O.',
      'Read and write device registers from C using pointers and volatile.',
      'Write a polling loop against a status register and explain its busy-wait cost.',
      'Recognise timers and serial peripherals as collections of memory-mapped registers.',
    ],
    whyItMatters:
      'This is the lesson where architecture meets the firmware you will actually write. Every embedded program you will ever read toggles bits in peripheral registers at fixed addresses. If you understand memory-mapped I/O and volatile, device datasheets become navigable, and the difference between working and silently-optimised-away driver code becomes obvious.',
    prerequisites: [
      'carc-m04-l1 (buses and decoding)',
      'C pointers',
    ],
    explanation:
      '### Two ways to address a device\n\n**Memory-mapped I/O (MMIO)** assigns peripheral registers addresses inside the same address space as RAM and ROM. The CPU needs no new instructions: a load from `0x40000010` reads a UART status register exactly like a load from RAM, and the address decoder routes it to the device instead. **Port I/O** (x86-style PMIO) gives devices a *second*, separate address space reached by special instructions (IN/OUT on x86). MMIO wins on uniformity — all the C pointer machinery and all the addressing modes apply — and is the dominant style on modern SoCs; port I/O survives on the x86 desktop lineage.\n\n### The C view of a device register\n\nA peripheral register is just an address, so C reaches it with a pointer:\n\n```\n#define UART_STATUS (*(volatile uint8_t *)0x40000010)\n```\n\nReading that outward-in: `0x40000010` is the device\'s bus address; the cast makes the compiler treat that number as a pointer to a byte; the dereference turns it into an lvalue you can read and assign; and **volatile** tells the compiler that *every* access must actually happen, in program order, because the value can change outside the program\'s knowledge (the hardware changes it; other code may write it). Without volatile, an optimizer that sees the same register read twice in a loop is entitled to read it once and reuse the value — the loop then never terminates. This is not a style preference; it is correctness.\n\n### Polling: the simplest strategy\n\nTo send a byte over a UART, the program waits until the transmitter is ready, then writes the data register:\n\n```\nwhile ((UART_STATUS & TX_READY) == 0) { }   /* busy-wait */\nUART_DATA = c;\n```\n\nThis is **polling**: the program repeatedly checks the device. It is trivially simple and fine when the wait is short. Its cost is equally simple: while polling, the CPU does nothing else — a 1000-cycle wait is 1000 wasted instructions. Interrupts (next lesson) are the cure for long or unpredictable waits.',
    deepDive:
      '### Reading a peripheral chapter in a datasheet\n\nEvery peripheral chapter in a real datasheet is the same document in different clothes: a register map table (address offset, name, fields, reset value), then per-register bit-field descriptions. A timer is typically COUNT (current value), CTRL (enable, mode, prescaler select) and possibly COMPARE (interrupt threshold). A UART: DATA (transmit/receive holding), STATUS (tx-ready, rx-available, errors), BAUD (divider), CTRL (enable, interrupt enables). Once you see peripherals as *register files at addresses*, module content shifts from memorising devices to reading their maps — a transferable skill across every MCU family.',
    examples: [
      {
        title: 'Polling a memory-mapped UART transmitter',
        language: 'c',
        code: `#include <stdint.h>

/* Illustrative register map: addresses chosen for this lesson. */
#define UART_STATUS  (*(volatile uint8_t *)0x40000010)
#define UART_DATA    (*(volatile uint8_t *)0x40000011)
#define UART_TX_READY 0x01u   /* status bit: transmitter can accept a byte */

void uart_putc(char c) {
    while ((UART_STATUS & UART_TX_READY) == 0u) {
        /* busy-wait: do nothing until the transmitter is ready */
    }
    UART_DATA = (uint8_t)c;
}`,
        explanation: [
          'Both registers are ordinary addresses on the system bus; the address decoder routes them to the UART, not to RAM.',
          '`volatile` on both registers forces the compiler to emit a real load of UART_STATUS on every loop iteration — without it, the empty loop can be optimized into reading once and spinning forever.',
          'The mask `& UART_TX_READY` isolates bit 0; comparing against 0 makes the loop wait while the transmitter is busy.',
          'The write `UART_DATA = c` is a bus write transaction to the device, which then shifts the byte out serially.',
          'Cost model: if the transmitter needs 870 cycles per byte at the chosen baud rate, this loop burns roughly 870 cycles of CPU time per character — acceptable for a debug console, unacceptable for high-throughput transfer (that is what interrupt- or DMA-driven drivers are for).',
        ],
      },
      {
        title: 'A memory-mapped timer used as a delay',
        language: 'c',
        code: `#include <stdint.h>

/* Illustrative timer map on a 1 MHz tick: COUNT increments every 1 us. */
#define TIMER_COUNT (*(volatile uint32_t *)0x40000020)
#define TIMER_CTRL  (*(volatile uint32_t *)0x40000024)
#define TIMER_ENABLE 0x1u

void busy_delay_us(uint32_t us) {
    TIMER_CTRL  = TIMER_ENABLE;   /* start from 0 (assumed on enable) */
    while (TIMER_COUNT < us) {
        /* wait until the hardware counter reaches the target */
    }
    TIMER_CTRL = 0;               /* stop */
}`,
        explanation: [
          'The timer is two memory-mapped registers: one read-only count, one control word — exactly the register-map pattern from the deep dive.',
          'Writing CTRL starts the counter; the hardware increments COUNT every microsecond without CPU involvement.',
          'The polling loop reads COUNT each iteration; because COUNT is volatile, each read is a fresh bus transaction.',
          'busy_delay_us(1000) therefore waits about 1 ms of real time, accurate to the poll granularity, while costing 100% CPU.',
          'Real timers add COMPARE/overflow registers and interrupt outputs — the bridge to lesson 3.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'One address space, two kinds of residents',
        content:
          '  32-bit memory map (illustrative ranges)\n\n  0xFFFFFFFF +------------------+\n             |                  |\n             |   peripherals    |  0x40000000-0x400FFFFF\n             |  (UART, timer,   |  UART_STATUS = 0x40000010\n             |   GPIO, ...)     |  UART_DATA   = 0x40000011\n             |                  |  TIMER_COUNT = 0x40000020\n             +------------------+\n             |       RAM        |\n             +------------------+\n             |       ROM        |\n  0x00000000 +------------------+\n\n  Same loads/stores, same instructions -- the decoder\n  decides whether an address is RAM or a device.',
        caption:
          'In MMIO the peripheral registers live inside the ordinary memory map; firmware reaches them with normal pointer accesses marked volatile. (Ranges illustrative.)',
      },
    ],
    tables: [
      {
        caption: 'Memory-mapped I/O versus port I/O',
        headers: ['Property', 'Memory-mapped (MMIO)', 'Port I/O (PMIO)'],
        rows: [
          ['Address space', 'Shares the memory map', 'Separate I/O space'],
          ['CPU instructions', 'Ordinary load/store', 'Special IN/OUT class'],
          ['C access', 'Pointers + volatile', 'Library helpers or inline asm'],
          ['Addressing modes', 'All of the ISA\'s', 'Usually limited'],
          ['Typical of', 'ARM, RISC-V, most SoCs', 'x86 legacy devices'],
        ],
      },
      {
        caption: 'Anatomy of a typical UART register map (illustrative)',
        headers: ['Offset', 'Register', 'Purpose'],
        rows: [
          ['0x00', 'DATA', 'Transmit/receive holding byte'],
          ['0x01', 'STATUS', 'TX-ready, RX-available, error flags'],
          ['0x02', 'BAUD', 'Clock divider for the bit rate'],
          ['0x03', 'CTRL', 'Enable, interrupt enables'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Omitting volatile on device register accesses.',
        fix: 'Without volatile the optimizer may cache a status read in a register and spin forever, or delete a write it thinks is dead. Rule: every address that hardware can change or act on is volatile.',
      },
      {
        mistake: 'Assuming a pointer write to a peripheral is a normal memory write with cache semantics.',
        fix: 'Device regions must be mapped uncacheable (or written with the right memory attributes); a cached MMIO write may sit in cache and never reach the device, or be reordered. Firmware boot code and MMUs handle this; bare-metal systems rely on the region being non-cached by default.',
      },
      {
        mistake: 'Testing a status bit with == instead of masking.',
        fix: 'Status registers have many bits; unrelated flags may be set. Use `if ((status & FLAG) != 0)`, not `if (status == FLAG)`. The equality form breaks the moment an error bit lights up.',
      },
    ],
    guidedPractice: {
      title: 'Write a receive-once routine',
      brief:
        'Using the illustrative UART map above (STATUS bit 1 = RX_AVAILABLE, DATA at 0x40000011), write a C function char uart_getc(void) that waits until a received byte is available and returns it. Declare the registers correctly.',
      expectedBehavior:
        'Define UART_STATUS and UART_DATA as volatile byte registers; loop while ((UART_STATUS & 0x02u) == 0u); then return (char)UART_DATA. Any correct masking of bit 1 and volatile declarations match.',
      hints: [
        'Copy the structure of uart_putc: define, poll, access.',
        'RX_AVAILABLE is bit 1, so the mask is 0x02.',
        'Reading DATA (on real UARTs) clears the available flag — hardware side effects through ordinary loads.',
      ],
    },
    practiceExercises: [
      {
        title: 'Cost of polling versus doing nothing',
        brief:
          'A program must send 1000 bytes over the UART, each byte taking 870 transmitter cycles. Compute total CPU cycles spent in the polling loops, and what fraction of a 1,000,000-cycle window that represents if transmission is continuous.',
        expectedBehavior:
          '1000 x 870 = 870,000 cycles of busy-waiting; as a fraction of the window, 870,000 / 1,000,000 = 87% of CPU time spent waiting. This motivates interrupts or DMA for sustained transfers.',
        hints: [
          'Each byte\'s wait is the transmitter\'s serialization time.',
          '87% of the CPU is a firmware alarm bell.',
        ],
      },
      {
        title: 'Explain the volatile disaster',
        brief:
          'A colleague writes `while (UART_STATUS == 0) {}` without volatile and reports the program hangs forever. Explain, in three sentences, what the optimizer did and why volatile fixes it.',
        expectedBehavior:
          'The compiler sees no code in the loop change UART_STATUS, so it hoists the read out of the loop (read once, reuse the value). The loop then tests a constant and can never observe the hardware setting the bit. volatile forbids caching and reordering of that access, so every iteration performs a fresh bus read.',
        hints: [
          'Think like an optimizer: prove the value cannot change inside the loop.',
          'The hardware is invisible to the compiler except through volatile.',
        ],
      },
    ],
    assessment: {
      title: 'MMIO checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does the volatile keyword guarantee for a device register access?',
          options: [
            'Every access is actually performed, in program order, with no caching between accesses',
            'The access is atomic against interrupts',
            'The register is writable',
            'The access bypasses the address decoder',
          ],
          answer: 'Every access is actually performed, in program order, with no caching between accesses',
          explanation:
            'volatile suppresses caching, elision and reordering of that access by the compiler. It says nothing about atomicity or hardware behaviour.',
          hint: 'volatile is a promise to the compiler about what it may not optimize.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which access pattern correctly waits for status bit 0 (TX_READY) regardless of other status bits?',
          options: [
            'while ((UART_STATUS & 0x01u) == 0u) { }',
            'while (UART_STATUS == 0x01u) { }',
            'while (UART_STATUS != 0x01u) { }',
            'if (UART_STATUS) UART_DATA = c;',
          ],
          answer: 'while ((UART_STATUS & 0x01u) == 0u) { }',
          explanation:
            'Mask the bit of interest and test it in isolation. The equality forms break when any other status bit (error flags, RX-available) is also set.',
          hint: 'Other bits in the register are not yours to assume.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Port I/O and memory-mapped I/O can coexist in the same processor architecture.',
          answer: 'true',
          explanation:
            'x86 famously has both: ordinary loads for MMIO and IN/OUT for the separate I/O port space. An architecture may offer one or both mechanisms.',
          hint: 'Think of the x86 desktop lineage.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In one word, what is the CPU doing during a polling loop while the device is not ready?',
          answer: 'waiting',
          explanation:
            'Busy-waiting: executing test instructions that change nothing — 100% CPU spent on waiting. Interrupts or DMA recover that time for useful work.',
          hint: 'The loop makes no progress; it just burns cycles.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Memory-mapped I/O', definition: 'Peripheral registers assigned addresses in the ordinary memory map, accessed with normal load/store instructions.' },
      { term: 'Port I/O (PMIO)', definition: 'A separate I/O address space reached by dedicated instructions (x86 IN/OUT).' },
      { term: 'volatile', definition: 'C qualifier forbidding the compiler from caching, eliding or reordering accesses to a variable — mandatory for device registers.' },
      { term: 'Status register', definition: 'A read-mostly device register whose bits report readiness, completion and error conditions.' },
      { term: 'Polling', definition: 'Repeatedly checking a device\'s status in software until it is ready, at the cost of the CPU\'s full attention.' },
    ],
    revisionSummary: [
      'MMIO: devices are addresses; the decoder, not the instruction set, separates RAM from registers.',
      'Device access in C = pointer to fixed address + volatile. No volatile, no guarantee.',
      'Polling is simple and cheap for short waits; expensive (100% CPU) for long ones.',
      'Every peripheral is a register map: STATUS, DATA, CTRL, and rate/config registers.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Memory-mapped I/O', url: 'https://en.wikipedia.org/wiki/Memory-mapped_I/O', kind: 'article' },
      { label: 'All About Circuits — Memory mapped I/O', url: 'https://www.allaboutcircuits.com/technical-articles/learn-about-memory-mapped-io/', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'carc-m04-l3',
    title: 'Interrupts, Arbitration and the Road to Microcontrollers',
    summary:
      'Let devices call the CPU: interrupt vectoring and priority, the ISR contract, single-master versus arbitrated buses, and how these pieces assemble into the microcontroller systems of the dedicated course.',
    objectives: [
      'Describe the interrupt path: device request, vectoring, context save, ISR, return.',
      'Explain vector tables and priority among simultaneous requests.',
      'Quantify the CPU cost of an interrupt-driven design versus polling.',
      'Contrast single-master buses with arbitrated multi-master systems.',
    ],
    whyItMatters:
      'Interrupts are how a 100 MHz microcontroller can juggle a dozen devices while idling at 99% capacity — the trick behind every battery-powered gadget. They are also the doorway into real embedded development: timers firing, serial bytes arriving, buttons being pressed. This lesson completes the architecture course by connecting it to the platform\'s microcontroller course, where these mechanisms are programmed hands-on.',
    prerequisites: [
      'carc-m04-l1 (buses)',
      'carc-m04-l2 (MMIO, polling)',
    ],
    explanation:
      '### The interrupt path\n\nInstead of the CPU polling a device, the device asserts an **interrupt request (IRQ)** line when it needs attention. The CPU finishes the current instruction, saves enough state to resume (return address — and on larger cores, status registers), and jumps to a fixed handler. After the handler runs, execution resumes exactly where it left off:\n\n1. **Request**: the peripheral asserts IRQ (for example, a UART with a received byte).\n2. **Vectoring**: the CPU reads the **vector table** — an array of handler addresses in memory indexed by the interrupt number — and loads the PC from the matching entry.\n3. **Context save**: hardware (and/or the ISR prologue) preserves state the handler will disturb.\n4. **Service**: the ISR does the minimum — read DATA, clear the request, signal the main program.\n5. **Return**: a special return-from-interrupt instruction restores state and resumes the interrupted code.\n\n### Priority and nesting\n\nWhen two devices request simultaneously, a **priority** scheme decides who is served first — usually fixed per line, sometimes programmable. Higher-priority ISRs may **nest** inside lower ones. Design rule: keep ISRs short. A 2-microsecond ISR at 1000 interrupts/second consumes 0.2% of the CPU; the same ISR at 20 microseconds consumes 2% and starts to distort timing.\n\n### Arbitration among masters\n\nLesson 1 introduced the shared bus. With a single master (the CPU), no arbitration is needed. Add a **DMA controller** — a master that moves blocks of data without CPU involvement — and an **arbiter** must grant the bus cycle by cycle. Round-robin or prioritised grant schemes trade fairness against latency; the CPU usually yields only between transfers so its caches and pipelines keep working.',
    deepDive:
      '### The interrupt-versus-polling decision\n\nThe arithmetic is a two-line model. Polling cost per event = poll loop time; interrupt cost per event = ISR entry/exit overhead (tens of cycles on small cores). At low event rates with predictable timing, polling wins on simplicity and jitter; at high or irregular rates, interrupts win because the CPU is freed between events. Real firmware mixes both: a UART at 115200 baud (~11.5 kB/s) is interrupt-driven; a fast ADC streaming into a buffer is served by DMA with an interrupt at buffer-end, not per-sample. This cost model, plus the MMIO register maps of lesson 2, is precisely the toolkit the microcontroller course uses when you program real devices — there you will configure actual vector tables, enable actual IRQ lines in a Nested Vectored Interrupt Controller (NVIC on ARM Cortex-M), and measure ISR latency with a GPIO pin and a scope (techniques from the platform\'s PCB course).',
    examples: [
      {
        title: 'CPU load of an interrupt-driven design',
        language: 'c',
        code: `#include <stdio.h>

int main(void) {
    int irqPerSecond = 1000;
    double isrMicroseconds = 2.0;

    double busyUs = irqPerSecond * isrMicroseconds;   /* us of CPU per second */
    double percent = busyUs / 10000.0;                /* us/s -> % of second */
    printf("ISR time per second: %.0f us -> %.2f%% CPU\\n", busyUs, percent);
    return 0;
}`,
        explanation: [
          '1000 interrupts per second, each consuming 2 microseconds of ISR time, consume 1000 x 2 = 2000 microseconds of CPU per second.',
          'One second is 1,000,000 microseconds, so the fraction is 2000 / 1,000,000 = 0.002 = 0.2%.',
          'The conversion constant: percent = microseconds-per-second / 10,000 (since 1% of a second is 10,000 us).',
          'The program prints: ISR time per second: 2000 us -> 0.20% CPU.',
          'Compare with lesson 2\'s polling example, where continuous UART transmission cost 87% CPU — the same workload drops to under 1% with interrupts.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Interrupt vectoring flow',
        content:
          '  Device (UART rx ready)\n        |  IRQ line assert\n        v\n  +------------------+     index     +------------------+\n  | Interrupt ctrl / |-------------->|  Vector table    |\n  | CPU interrupt    |               | [0] reset        |\n  | logic (priority) |               | [1] timer ISR    |\n  +------------------+               | [2] uart ISR  <-+--- selected\n        |                            +------------------+\n        v  save context, jump\n  +------------------+\n  |    uart ISR      |  read DATA, clear request, flag main loop\n  +------------------+\n        v  return-from-interrupt\n  resume interrupted code',
        caption:
          'The interrupt number indexes the vector table; the fetched address becomes the new PC. The ISR services the device and returns to the interrupted stream. (Structure illustrative.)',
      },
    ],
    tables: [
      {
        caption: 'Polling versus interrupts',
        headers: ['Aspect', 'Polling', 'Interrupts'],
        rows: [
          ['CPU cost during idle device', '100% of the wait loop', '~0; CPU runs other code or sleeps'],
          ['Latency to service', 'Depends on where the check sits in the loop', 'Fixed overhead (entry + vectoring)'],
          ['Complexity', 'Trivial', 'Vector table, ISR contract, priority setup'],
          ['Best fit', 'Short, predictable waits', 'Long, irregular or many concurrent events'],
          ['Power', 'Poor (CPU always running)', 'Good (sleep between events)'],
        ],
      },
      {
        caption: 'Single-master versus arbitrated bus',
        headers: ['Property', 'Single master (CPU only)', 'Multi-master with arbiter'],
        rows: [
          ['Bus ownership', 'Always the CPU', 'Granted per transfer by the arbiter'],
          ['Additional masters', 'None', 'DMA engines, other cores, accelerators'],
          ['Contention risk', 'Only decode faults', 'Resolved by grant/priority policy'],
          ['Typical of', 'Small MCUs', 'SoCs with DMA and multi-core'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing long ISRs that do heavy processing.',
        fix: 'ISR = acknowledge and record; process in the main loop. A long ISR adds latency to every lower-priority interrupt and destroys real-time behaviour. Budget rule: microseconds, not milliseconds.',
      },
      {
        mistake: 'Forgetting to clear the interrupt source inside the ISR.',
        fix: 'Most controllers keep the request asserted until software acknowledges it — the ISR then re-enters forever (an interrupt storm). Read the datasheet: clearing is often a write-1-to-clear bit or an automatic side effect of reading DATA.',
      },
      {
        mistake: 'Sharing data between an ISR and the main loop without protection.',
        fix: 'The main loop can be interrupted mid-update of a multi-byte variable. Use volatile, disable the specific interrupt briefly around critical sections, or design single-writer/lock-free handoff. The platform\'s embedded courses revisit this with real examples.',
      },
    ],
    guidedPractice: {
      title: 'Budget an interrupt workload',
      brief:
        'A system receives 4000 UART interrupts per second with a 1.5 us ISR each, and 500 timer interrupts per second with a 3 us ISR. Compute total CPU percentage consumed, using percent = microseconds-per-second / 10000.',
      expectedBehavior:
        'UART: 4000 x 1.5 = 6000 us/s. Timer: 500 x 3 = 1500 us/s. Total 7500 us/s = 0.75% CPU. The system spends over 99% of its time free for other work or sleep.',
      hints: [
        'Compute each source\'s microseconds-per-second separately, then add.',
        'Divide the total by 10,000 to get percent.',
        'Convert the answer to a sentence: three quarters of one percent.',
      ],
    },
    practiceExercises: [
      {
        title: 'Choose servicing strategy per device',
        brief:
          'For each device on a battery-powered MCU, choose polling, interrupt, or DMA-plus-interrupt and justify in one line: (a) a user button pressed a few times per minute; (b) an ADC streaming 100,000 samples/second into memory; (c) a status register that must be checked every 2 us because no interrupt line exists.',
        expectedBehavior:
          '(a) Interrupt with sleep between events (power matters, rate is tiny). (b) DMA-plus-interrupt: per-sample interrupts at 100 kHz would dominate CPU time; DMA moves the stream and interrupts per buffer. (c) Polling — no request line exists, and a 2 us period leaves no room for ISR overhead anyway.',
        hints: [
          'Ask: does a request signal exist? Ask: what is the event rate?',
          'Per-sample interrupt cost = rate x ISR overhead; compare against 1,000,000 us.',
          'Battery life pushes toward sleeping between events.',
        ],
      },
      {
        title: 'Interrupt storm autopsy',
        brief:
          'A firmware bug report: after enabling the UART receive interrupt, the system slows to a crawl and the debugger shows the UART ISR executing continuously. List the three most probable root causes in priority order, each with the datasheet section you would consult.',
        expectedBehavior:
          '1. The interrupt source was never cleared (missing write-1-to-clear or side-effect read) — consult the UART interrupt/status register description. 2. The ISR re-enables interrupts while the condition persists (level-triggered line still asserted) — consult interrupt controller configuration. 3. Wrong vector/enable mapping causing a spurious line to fire continuously — consult the vector table and IRQ-enable register map. Any well-reasoned ordered list is acceptable.',
        hints: [
          'What keeps a level-triggered request asserted?',
          'Recall the common mistake: acknowledge inside the ISR.',
          'Continuous re-entry means the request never deasserts.',
        ],
      },
    ],
    assessment: {
      title: 'Interrupts and arbitration checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What is the role of the vector table in an interrupt system?',
          options: [
            'It maps each interrupt number to its handler address',
            'It stores the priorities of all peripherals',
            'It buffers pending data bytes from devices',
            'It holds the ISR machine code itself',
          ],
          answer: 'It maps each interrupt number to its handler address',
          explanation:
            'The vector table is an array of addresses indexed by interrupt number; the CPU loads the PC from the matching entry. Priorities live in the interrupt controller; code lives in flash; data lives in the device.',
          hint: 'It is an array of jump targets.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: 'double busyUs = 1000 * 2.0;      /* IRQs/s x ISR us */\nprintf("%.2f%%", busyUs / 10000.0);',
          options: ['0.20%', '2.00%', '20.00%', '0.02%'],
          answer: '0.20%',
          explanation:
            '2000 us of CPU per second is 2000/1,000,000 = 0.002 = 0.20%. The divisor 10,000 converts us-per-second to percent.',
          hint: '1% of a second is 10,000 microseconds.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A DMA controller is an example of a second bus master, which is why arbitrated interconnects exist.',
          answer: 'true',
          explanation:
            'DMA engines initiate their own transfers, competing with the CPU for the bus. The arbiter grants ownership so both never drive simultaneously.',
          hint: 'Who else can place an address on the address bus?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'State the standard two-part design rule for writing an interrupt service routine (two imperative verbs).',
          answer: 'acknowledge and record',
          explanation:
            'Acknowledge (clear the interrupt source so it does not re-fire) and record (save the event or data for the main loop), then return immediately. Processing belongs in the main loop.',
          hint: 'Make the device quiet, make the main loop aware.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Interrupt request (IRQ)', definition: 'A signal asserted by a device to request CPU attention.' },
      { term: 'Vector table', definition: 'An array of handler addresses indexed by interrupt number.' },
      { term: 'ISR (interrupt service routine)', definition: 'The handler executed in response to an interrupt; should acknowledge, record and return quickly.' },
      { term: 'Interrupt priority/nesting', definition: 'Rules deciding which request is served first and whether higher-priority handlers may preempt lower ones.' },
      { term: 'DMA', definition: 'Direct memory access: a bus master that moves data between memory and peripherals without CPU involvement.' },
    ],
    revisionSummary: [
      'Interrupt path: request, vectoring via table, context save, short ISR, return.',
      'CPU load = IRQ rate x ISR time; 1000 x 2 us = 0.2% — interrupts free the CPU compared with polling.',
      'Keep ISRs microsecond-scale: acknowledge and record, process in the main loop.',
      'Multi-master buses (CPU + DMA) need arbitration; single-master MCUs do not.',
      'These mechanisms, plus MMIO register maps, are exactly what the microcontrollers course programs hands-on.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Interrupt', url: 'https://en.wikipedia.org/wiki/Interrupt', kind: 'article' },
      { label: 'Wikipedia — Direct memory access', url: 'https://en.wikipedia.org/wiki/Direct_memory_access', kind: 'article' },
      { label: 'Wikipedia — Bus arbitration', url: 'https://en.wikipedia.org/wiki/Bus_arbitration', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
