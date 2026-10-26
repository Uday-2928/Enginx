import type { TutorialLesson } from '../types';

export const module06Lessons: TutorialLesson[] = [
  {
    id: 'embc-m06-l1',
    title: 'Interrupt Fundamentals and ISR Anatomy',
    summary:
      'What actually happens when hardware interrupts the CPU: vectors, the ISR contract, flag setting and clearing, and the endless-retrigger bug.',
    objectives: [
      'Describe the interrupt path: event -> flag -> vector -> ISR -> return.',
      'Explain the vector table and how the CPU finds your handler.',
      'Write an ISR that clears its interrupt flag correctly.',
      'Diagnose the "interrupt fires forever" bug caused by an uncleared flag.',
    ],
    whyItMatters:
      'Interrupts are how firmware reacts to the world in real time without burning CPU on polling. They are also where the worst bugs live — because the CPU can jump into your code at ANY instruction boundary. Understanding the exact mechanism is safety equipment.',
    prerequisites: ['embc-m05-l1', 'embc-m02-l3'],
    explanation:
      'Normally the CPU executes your instructions in order. An **interrupt** is hardware saying: "stop, run this function NOW, then resume exactly where you were." The CPU saves enough context (return address, and on most cores the rest of the register set is saved by your ISR prologue), fetches the handler address from the **vector table**, and jumps. When the handler returns, execution resumes as if nothing happened — except your code did something in between.\n\n### The path from event to handler\n\n1. A hardware **event** occurs: timer overflow, pin edge, UART byte received.\n2. The peripheral sets its **interrupt flag** in a status register (the same UIF/CCF flags from module 05).\n3. If that flag\'s interrupt is *enabled* in the peripheral and in the interrupt controller (on Cortex-M, the NVIC; on AVR, bits in SREG and per-peripheral mask registers), the controller raises a request to the CPU.\n4. The CPU finishes the current instruction, looks up the vector, and calls your **ISR (interrupt service routine)**.\n5. Your ISR does its work, clears the flag, and returns; the CPU restores context and continues.\n\n### The vector table\n\nThe vector table is an array of handler addresses at a fixed flash location — the same table that supplied the reset handler in module 01. Entry N belongs to interrupt source N (which source maps to which number is chip-specific: the STM32 NVIC vector table, the ATmega interrupt vector list). In startup code the table is populated with your handler names; that wiring is the only "magic" — everything else is the flag discipline.\n\n### The flag contract\n\nMost interrupt flags are **write-1-to-clear** or must be explicitly cleared by the ISR. Clearing is not optional bookkeeping: while the flag remains set and enabled, the controller keeps requesting. An ISR that forgets to clear returns — and is immediately re-entered, forever. The main loop never runs again, the debugger shows the program "stuck" inside the ISR, and the fix is one register write. This is the first bug every embedded engineer personally discovers.',
    deepDive:
      '### What an ISR may and may not do\n\nThe ISR runs on the *interrupted* code\'s stack and time. Rules that follow: no blocking waits (the whole system is frozen behind you); no long loops (same reason); no dynamic allocation or heavy library calls (many are not reentrant); keep it to reading a register, storing a byte, setting a flag. If more work is needed, hand it to the main loop — lesson 3 builds that pattern. A useful budget: if an ISR can execute in a few microseconds, nobody notices it; if it takes milliseconds, every other interrupt and the main loop degrade.\n\n### Enabling and configuring, conceptually\n\nThree switches must all be on for an interrupt to fire: the peripheral\'s own interrupt-enable bit (e.g. the timer\'s UIE — update interrupt enable), the controller-level enable for that source, and (on cores with a global switch like AVR\'s I-bit in SREG or the PRIMASK on Cortex-M) interrupts enabled globally. Forgetting any one produces the classic "my ISR never runs" — and the classic *first* debugging step is checking all three, in that order. Configuration order matters too: enable the flag-clearing path before enabling the interrupt, or a stale flag from earlier register pokes fires the ISR before you expect it.\n\n### Where the vector table really lives, honestly\n\nOn Cortex-M the vector table starts with the initial stack pointer and reset handler, then one entry per exception/peripheral interrupt; the vendor startup file (e.g. startup_stm32f103xb.s) defines the weak default handlers you override by defining a function with the exact name. On AVR the vectors are at fixed flash addresses with jmp instructions. Our examples model the table as a plain C function-pointer array so the *dispatch* is visible and host-runnable; real wiring is vendor startup code, which you should read once in your life to demystify it.',
    examples: [
      {
        title: 'Vector table and flag discipline on a mock interrupt controller',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of interrupt dispatch. Real wiring lives in the\n * vendor startup file and NVIC/peripheral registers; here a function-\n * pointer table and a fake status register make the flow visible. */\ntypedef void (*isr_fn)(void);\n\n#define VECTOR_TIM2 2u\nstatic isr_fn vector_table[4] = { 0, 0, 0, 0 };\n\nstatic volatile uint8_t MOCK_TIM_SR = 0x00u;\n#define TIM_SR_UIF (1u << 0)\n\nstatic volatile uint32_t event_count = 0u;   /* shared with ISR: volatile */\n\nstatic void tim2_isr(void) {\n    MOCK_TIM_SR &= (uint8_t)~TIM_SR_UIF;   /* clear FIRST - mandatory     */\n    event_count++;                          /* minimal work: bookkeeping   */\n}\n\n/* The hardware loop: while the flag is set and enabled, dispatch. */\nstatic void hardware_irq_dispatch(void) {\n    if (((MOCK_TIM_SR & TIM_SR_UIF) != 0u) &&\n        (vector_table[VECTOR_TIM2] != 0)) {\n        vector_table[VECTOR_TIM2]();\n    }\n}\n\nint main(void) {\n    vector_table[VECTOR_TIM2] = tim2_isr;\n\n    /* Hardware raises the event once: */\n    MOCK_TIM_SR |= TIM_SR_UIF;\n    hardware_irq_dispatch();                /* ISR runs, clears the flag  */\n    hardware_irq_dispatch();                /* flag clear -> no second run */\n    printf("with clearing:    events=%u\\n", (unsigned)event_count);\n\n    /* Now the buggy ISR: forgets to clear the flag. */\n    MOCK_TIM_SR |= TIM_SR_UIF;\n    vector_table[VECTOR_TIM2] = 0;          /* pretend no clearing done:  */\n    /* simulate the uncleared-flag world by re-raising manually */\n    MOCK_TIM_SR |= TIM_SR_UIF;\n    hardware_irq_dispatch();\n    hardware_irq_dispatch();\n    printf("after re-raise:   events=%u (uncleared flags retrigger)\\n",\n           (unsigned)event_count);\n    return 0;\n}',
        explanation: [
          'The vector table is a plain array; entry 2 is the timer. Real chips wire this in vendor startup code — same concept, fixed addresses.',
          'First scenario: hardware sets UIF once. The dispatch calls tim2_isr, which clears UIF first, then counts. The second dispatch finds UIF clear and does nothing.',
          'Exact output line 1: `with clearing:    events=1`.',
          'Second scenario models the bug: the flag remains set across dispatches (an ISR that never cleared it would behave identically — the controller re-requests immediately). Each dispatch re-enters the ISR.',
          'Exact output line 2: `after re-raise:   events=3 (uncleared flags retrigger)` — 1 + 2 more, showing the re-entry storm. On silicon this is an infinite loop in interrupt context.',
        ],
      },
      {
        title: 'Polling versus interrupting the same event',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nstatic volatile uint8_t  MOCK_TIM_SR = 0x00u;\nstatic volatile uint32_t work_done   = 0u;\n#define TIM_SR_UIF (1u << 0)\n\nstatic void do_periodic_work(uint32_t tick) {\n    work_done++;\n    printf("period elapsed at sim-tick %u\\n", (unsigned)tick);\n}\n\nint main(void) {\n    /* POLLING: main loop asks the flag on every iteration. */\n    uint32_t sim_tick = 0u;\n    for (sim_tick = 1u; sim_tick <= 6000u; sim_tick++) {\n        if (sim_tick == 1000u) { MOCK_TIM_SR |= TIM_SR_UIF; } /* hw event */\n        if (sim_tick == 3000u) { MOCK_TIM_SR |= TIM_SR_UIF; }\n\n        if ((MOCK_TIM_SR & TIM_SR_UIF) != 0u) {\n            MOCK_TIM_SR &= (uint8_t)~TIM_SR_UIF;\n            do_periodic_work(sim_tick);\n        }\n        /* ... other useful work every iteration ... */\n    }\n    printf("polling handled %u events\\n", (unsigned)work_done);\n    return 0;\n}',
        explanation: [
          'The loop plays the CPU: every iteration it checks the overflow flag. Hardware sets the flag at sim-ticks 1000 and 3000 (the timer overflowed).',
          'Polling responds at the very next loop iteration — tick 1000 and tick 3000 exactly, because the loop runs fast relative to the events.',
          'Exact output: `period elapsed at sim-tick 1000` / `period elapsed at sim-tick 3000` / `polling handled 2 events`.',
          'Polling costs CPU on every iteration (here: 6000 checks) but has zero setup and no concurrency risk. Interrupts invert that: zero cost while idle, but shared-data rules apply (next lesson).',
          'Rule of thumb: poll when events are frequent or setup must be trivial; interrupt when latency matters and events are sparse. Both consume the same flag.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Interrupt dispatch path',
        content:
          ' PERIPHERAL              CONTROLLER (NVIC/SREG)        CPU\n -----------              ----------------------        ---\n event occurs\n   |\n   v\n SR.UIF = 1  ----enable?---> pending bit set\n                              |\n                              v  (priority ok, global enable?)\n                          request ------------------> finish instruction\n                                                        push context\n                                                        read vector[N]\n                                                        call ISR:\n                                                          clear UIF  <--\n                                                          minimal work   |\n                                                        return           |\n                              (request gone)          resume main   ----',
        caption:
          'The three switches (peripheral enable, controller enable, global enable) and the flag-clearing step that ends the request. Miss the clear and the cycle restarts instantly.',
      },
    ],
    tables: [
      {
        caption: 'ISR rules and their reasons',
        headers: ['Rule', 'Reason'],
        rows: [
          ['Clear the interrupt flag', 'Uncleared + enabled flag = endless re-entry'],
          ['Keep it short (microseconds)', 'The whole system is frozen while it runs'],
          ['No blocking waits or long loops', 'Same - and watchdogs starve'],
          ['No malloc/printf/heavy library calls', 'Library code may not be reentrant'],
          ['Mark shared data volatile', 'Main-loop reads must see ISR writes'],
          ['Protect multi-byte/multi-step shared updates', 'The ISR can strike mid-update (next lesson)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Forgetting to clear the interrupt flag inside the ISR.',
        fix:
          'Clear it first, using the family\'s documented idiom (often write-1-to-clear: `SR = FLAG_MASK;`). An uncleared enabled flag re-triggers the ISR the instant it returns.',
      },
      {
        mistake: 'Enabling only some of the three interrupt switches and concluding "interrupts are broken".',
        fix:
          'Check the peripheral enable (UIE-style), the controller enable for that source, and the global enable bit, in that order. Any one off means no dispatch.',
      },
      {
        mistake: 'Doing real work in the ISR: debounce counters, printf, state machines.',
        fix:
          'The ISR records that something happened (flag/queue/counter); the main loop does the work. Lesson 3 shows the exact pattern.',
      },
    ],
    guidedPractice: {
      title: 'Wire a new interrupt source',
      brief:
        'You need an interrupt when the mock UART receives a byte. List, in order, every piece of configuration and every line of the ISR skeleton: the flag to check, the enables to set, the clear idiom, and what the ISR should do with the received byte.',
      expectedBehavior:
        'Enable the UART receive-interrupt bit in the peripheral (e.g. RXNEIE-style), enable the UART vector in the interrupt controller, ensure global interrupts are enabled. ISR: read the data register (which also clears the receive flag on many families), push the byte into a ring buffer or set a flag, return. Never wait or print inside.',
      hints: [
        'Three switches: peripheral, controller, global.',
        'On many UARTs reading the data register IS the flag clear — check the manual\'s wording.',
      ],
    },
    practiceExercises: [
      {
        title: 'Predict the re-trigger storm',
        brief:
          'In the mock, remove the clearing line from tim2_isr. Starting from a single hardware event, how many times does hardware_irq_dispatch() run the ISR if called five times in a row? What would happen on real hardware between two main-loop statements?',
        expectedBehavior:
          'Five times — every dispatch sees UIF still set. On real hardware the controller re-requests immediately after each ISR return, so the CPU never escapes the ISR: the main loop is starved indefinitely until a watchdog reset.',
        hints: [
          'The dispatch condition only tests the flag.',
          'Real silicon keeps requesting while the flag is set and enabled.',
        ],
      },
      {
        title: 'Polling budget',
        brief:
          'A system polls a flag every 100 us in its superloop; the event arrives every 2 s. Compute the fraction of loop iterations that find the flag set, and state one advantage and one cost of switching this to interrupt-driven.',
        expectedBehavior:
          '1 in 20,000 iterations finds the flag set (0.005%). Interrupt-driven advantage: no CPU cost while waiting and near-zero latency. Cost: shared-data discipline (volatile, atomic access), configuration of three enable switches, and a slightly harder debugging story.',
        hints: [
          '2 s / 100 us = 20,000 iterations per event.',
          'The cost list is the rules table above.',
        ],
      },
    ],
    assessment: {
      title: 'Interrupt fundamentals checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Where does the CPU find the address of your ISR?',
          options: [
            'In the vector table at a fixed flash location',
            'In the peripheral\'s data register',
            'The linker invents it at random',
            'In the stack frame',
          ],
          answer: 'In the vector table at a fixed flash location',
          explanation:
            'Each interrupt source has a numbered vector; startup code populates the table with handler addresses.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'An ISR returns without clearing its (enabled) interrupt flag. What happens?',
          options: [
            'It is immediately re-entered, starving the main loop forever',
            'Nothing; flags auto-clear',
            'The interrupt disables itself',
            'The next event is lost',
          ],
          answer: 'It is immediately re-entered, starving the main loop forever',
          explanation:
            'A set + enabled flag keeps requesting; the controller re-dispatches as soon as the ISR returns.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'It is acceptable for an ISR to wait (block) for up to 10 ms if the work is important.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'While the ISR runs, equal-or-lower-priority work is frozen — including other interrupts and the main loop. ISRs record events; work happens in task context.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A shared counter is declared `uint32_t event_count;` (no volatile), incremented in the ISR and read in main\'s while loop. What can go wrong at -O2?',
          options: [
            'main may cache the value in a register and never see the ISR\'s updates',
            'The ISR will not run',
            'The counter becomes atomic',
            'Nothing is wrong',
          ],
          answer: 'main may cache the value in a register and never see the ISR\'s updates',
          explanation:
            'Without volatile the optimizer assumes single-threaded code and can hoist the read out of the loop. (Note volatile fixes visibility, not atomicity — next lesson.)',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the three "switches" that must all be enabled for a peripheral interrupt to reach the CPU.',
          answer: 'peripheral interrupt-enable bit, interrupt controller enable for the source, global interrupt enable',
          explanation:
            'Any one left off means the request never reaches the core — the standard checklist when an ISR never fires.',
          hint: 'Peripheral, controller, core.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'ISR (interrupt service routine)', definition: 'The function hardware calls in response to an event; must be short and flag-disciplined.' },
      { term: 'Vector table', definition: 'The fixed table of handler addresses the CPU uses to dispatch each interrupt source.' },
      { term: 'Interrupt flag', definition: 'The status bit a peripheral sets on an event; it must be cleared by software to end the request.' },
      { term: 'NVIC', definition: 'Arm Cortex-M\'s nested vectored interrupt controller, which enables, prioritises and dispatches interrupts.' },
    ],
    revisionSummary: [
      'Event -> flag -> enables -> vector -> ISR -> clear flag -> resume.',
      'The vector table is data, not magic: vendor startup code fills it.',
      'Uncleared flags re-trigger forever; clearing idioms are family-specific.',
      'ISRs: short, non-blocking, no heavy library calls, volatile shared data.',
      'Polling vs interrupts is a latency/CPU trade-off; both consume the same flags.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Interrupt', url: 'https://en.wikipedia.org/wiki/Interrupt', kind: 'article' },
      { label: 'developer.arm.com — documentation portal (NVIC and exception model)', url: 'https://developer.arm.com/documentation', kind: 'docs' },
      { label: 'Wikipedia — Interrupt vector table', url: 'https://en.wikipedia.org/wiki/Interrupt_vector_table', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m06-l2',
    title: 'Shared Data: Races, Torn Reads and Critical Sections',
    summary:
      'The exact ways ISR/main data sharing breaks — caching, tearing, lost updates — and the standard fixes: volatile, atomic access sizes, and disable/restore critical sections.',
    objectives: [
      'Demonstrate a torn multi-byte read across an interrupt.',
      'Explain which access sizes are atomic on 8-, 16- and 32-bit cores.',
      'Implement a disable/restore critical section and state its rules.',
      'Choose the right fix for each sharing pattern: volatile, atomic size, snapshot-in-critical-section, or double-read validation.',
    ],
    whyItMatters:
      'This is the lesson that prevents the once-a-week unexplained glitch. Interrupt bugs are timing-dependent — they pass every bench test and fail in the field. The patterns here are short, learnable, and cover nearly every ISR-sharing situation in small firmware.',
    prerequisites: ['embc-m06-l1', 'embc-m02-l3', 'embc-m03-l2'],
    explanation:
      'When an ISR and the main loop share a variable, three distinct failure modes exist — and each needs its own fix.\n\n### Failure 1: invisibility (fixed by volatile)\n\nCovered in module 02: without volatile, the compiler may cache the shared value in a register and the main loop never sees ISR updates. Fix: declare ISR-shared variables `volatile`. Necessary, but nowhere near sufficient.\n\n### Failure 2: tearing (fixed by atomic access sizes)\n\nThe CPU cannot read 16 or 32 bits in one go on an 8-bit bus — it performs several byte accesses, and the interrupt can strike *between* them. Reading a 16-bit counter that the ISR just rolled over can return a value that never existed: high byte from before, low byte from after. This is a **torn read**. Volatile does not help — each partial access is faithfully performed; the problem is the *sequence*. Fixes, in order of preference: (1) make the shared value fit in one atomic access (8-bit on an 8-bit core, 32-bit aligned on a 32-bit core); (2) read inside a critical section; (3) read twice and retry if inconsistent (the double-read idiom some vendors use for their own 16-bit timers).\n\n### Failure 3: lost updates (fixed by critical sections — lesson 03-2 revisited)\n\nThe RMW race: main reads, modifies, writes a shared register or variable while the ISR does its own update between the load and store. The ISR\'s change is silently overwritten. Fix: make the sequence indivisible — a **critical section** that disables interrupts around it, or a hardware atomic mechanism (set/reset registers, atomic exchange instructions) when the core provides one.\n\n### The critical section pattern\n\nDisable interrupts, do the minimal shared-data operation, restore — and restore *exactly*, not "enable": the code may run inside another critical section or a context where interrupts were already off, so save the previous state and put it back:\n\n```c\nuint32_t primask = mock_irq_save();  /* disable + return previous state */\n/* ... minimal shared access ... */\nmock_irq_restore(primask);           /* put back exactly what was there */\n```\n\nCritical sections must be *short* (they add latency to every interrupt) and never contain loops or waits.',
    deepDive:
      '### Atomicity by width and alignment\n\nAtomic access is a property of the bus transaction, not of C. On an 8-bit AVR, only 8-bit reads/writes are atomic; uint16_t and uint32_t are multi-access. On a 32-bit Cortex-M, naturally-aligned 32-bit loads/stores are single bus transactions — but an unaligned 16-bit access, or a read-modify-write (even of an aligned 32-bit `x |= 1`), is still composite. The rule: *plain loads and stores* of naturally-aligned, register-width data are atomic; *anything involving computation between read and write* is not, whatever the width.\n\n### The double-read idiom, honestly\n\nVendors of 8/16-bit parts document a lock-free trick for their own timers: read the high byte, read the low byte, re-read the high byte — if the two high reads differ, the counter rolled over underneath you and you retry. It avoids disabling interrupts at the cost of a loop. It works only because the hardware guarantees the *ordering* of those specific register reads (some families latch the high byte on low-byte access — shadow registers). Do not generalise it to arbitrary variables without that hardware guarantee; a critical section is simpler and always correct.\n\n### On 32-bit cores: less to protect, not nothing\n\nMigrating from an 8-bit part, engineers over-protect: on a Cortex-M a single aligned uint32_t flag needs no critical section for a simple read/write handoff. But a *set of* values (counter + timestamp) updated together by the ISR still needs one — the ISR can strike between reading field 1 and field 2, producing a mixed pair. Consistency across *multiple* values always requires either a critical section, a sequence number, or designing the data so one atomic value carries the meaning (e.g. encode both into one 32-bit word).',
    examples: [
      {
        title: 'A torn 16-bit read, demonstrated deterministically',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* A 16-bit event counter on an 8-bit bus: two byte-wide halves.\n * volatile is present (visibility is fine) - the bug is TEARING. */\nstatic volatile uint8_t cnt_hi = 0x01u;\nstatic volatile uint8_t cnt_lo = 0xFFu;   /* true value: 0x01FF = 511 */\n\nstatic uint8_t mock_irq_enabled = 1u;\n\nstatic void simulated_isr(void) {\n    if (mock_irq_enabled != 0u) {\n        cnt_lo++;                       /* 0xFF -> 0x00 with carry */\n        if (cnt_lo == 0u) {\n            cnt_hi++;                   /* 0x01 -> 0x02: true value now 512 */\n        }\n    }\n}\n\nstatic uint16_t read_counter_naive(void) {\n    uint16_t hi = cnt_hi;               /* byte access 1 */\n    simulated_isr();                    /* <-- interrupt strikes HERE    */\n    uint16_t lo = cnt_lo;               /* byte access 2 */\n    return (uint16_t)((hi << 8) | lo);\n}\n\nint main(void) {\n    uint16_t torn = read_counter_naive();\n    printf("naive read = %u (never a real value!)\\n", (unsigned)torn);\n    return 0;\n}',
        explanation: [
          'The counter holds 0x01FF (511). The ISR increments it to 0x0200 (512) — between the two byte reads of the naive function.',
          'The naive read assembles hi = 0x01 (old) with lo = 0x00 (new): 0x0100 = 256 — a value the counter NEVER held.',
          'Exact output: `naive read = 256 (never a real value!)`.',
          'volatile cannot prevent this: every byte access really happened, in order — the sequence just spans the interrupt. This is why volatile is necessary but not sufficient.',
          'The consumer believing 256 might, e.g., compute a negative rate or skip a debounce window. Torn reads are silent, which is what makes them dangerous.',
        ],
      },
      {
        title: 'The fix: critical-section snapshot (and the disable/restore idiom)',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nstatic volatile uint8_t cnt_hi = 0x01u;\nstatic volatile uint8_t cnt_lo = 0xFFu;\nstatic uint8_t mock_irq_enabled = 1u;\n\n/* Mock of the disable/restore idiom (real: PRIMASK save/set/clear on\n * Cortex-M, cli()/sei() with SREG save on AVR - vendor docs define it). */\nstatic uint8_t mock_irq_save(void) {\n    uint8_t was = mock_irq_enabled;\n    mock_irq_enabled = 0u;\n    return was;\n}\nstatic void mock_irq_restore(uint8_t was) {\n    mock_irq_enabled = was;\n}\n\nstatic void simulated_isr(void) {\n    if (mock_irq_enabled != 0u) {\n        cnt_lo++;\n        if (cnt_lo == 0u) { cnt_hi++; }\n    }\n}\n\nstatic uint16_t read_counter_safe(void) {\n    uint8_t was = mock_irq_save();      /* begin critical section */\n    uint16_t hi = cnt_hi;\n    uint16_t lo = cnt_lo;\n    mock_irq_restore(was);              /* end - restores prior state  */\n    return (uint16_t)((hi << 8) | lo);\n}\n\nint main(void) {\n    uint16_t before = read_counter_safe();\n    simulated_isr();                    /* ISR fires outside the section */\n    uint16_t after = read_counter_safe();\n\n    printf("before=%u after=%u\\n", (unsigned)before, (unsigned)after);\n    printf("consistent values only: %u then %u\\n",\n           (unsigned)before, (unsigned)after);\n    return 0;\n}',
        explanation: [
          'read_counter_safe disables the simulated interrupts around the two byte reads, so no increment can interleave.',
          'First call: reads hi=0x01, lo=0xFF → 511 (the true pre-ISR value).',
          'The ISR then runs freely (outside the section): counter becomes 0x0200 = 512.',
          'Second call: reads 512. Both results are values the counter genuinely held — no tearing possible.',
          'Exact output: `before=511 after=512` then `consistent values only: 511 then 512`. Note the restore takes the *saved* state, not "enabled": critical sections nest correctly this way.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Torn read anatomy',
        content:
          ' true counter: 0x01FF (511)      ISR increments: -> 0x0200 (512)\n\n main:  read cnt_hi  = 0x01\n                                     <== ISR strikes: lo 0xFF->0x00,\n                                         hi 0x01->0x02 ==>\n main:  read cnt_lo  = 0x00\n        assemble:     0x01 0x00 = 0x0100 = 256   <-- NEVER EXISTED\n\n values that exist: 511, 512.  value read: 256.   That is tearing.',
        caption:
          'Each byte access is faithful and volatile-compliant; the interrupt between them makes the pair incoherent. Only atomic width or a critical section fixes it.',
      },
    ],
    tables: [
      {
        caption: 'Sharing patterns and their fixes',
        headers: ['Pattern', 'Failure mode', 'Fix'],
        rows: [
          ['Flag written by ISR, polled by main', 'Compiler caching', 'volatile (single byte/word)'],
          ['Multi-byte value updated by ISR', 'Torn read', 'Critical section, or atomic width, or double-read (hw-backed)'],
          ['RMW on shared variable/register', 'Lost update', 'Critical section around the RMW, or hardware set/reset'],
          ['Multiple related values from ISR', 'Mixed pair (inconsistent set)', 'Critical-section snapshot, or sequence/one-word encoding'],
          ['Large data stream from ISR', 'Half-updated buffer', 'Double buffer / queue with ownership handoff (module 14)'],
        ],
      },
      {
        caption: 'What is atomic, by core width',
        headers: ['Core', 'Atomic access', 'Not atomic'],
        rows: [
          ['8-bit (AVR)', 'uint8_t load/store', 'uint16_t, uint32_t, any RMW'],
          ['16-bit', 'aligned 16-bit load/store', 'uint32_t, unaligned, RMW'],
          ['32-bit (Cortex-M)', 'aligned 8/16/32-bit load/store', 'uint64_t, unaligned, any RMW'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Adding volatile and believing the data-race problem is solved.',
        fix:
          'volatile gives visibility only. Tearing and lost updates need atomic sizes or critical sections. Audit each shared variable for all three failure modes.',
      },
      {
        mistake: 'Writing critical sections that re-enable interrupts unconditionally: `irq_enable();` at the end.',
        fix:
          'Save the previous state and restore it. Unconditional enabling breaks nesting (a section inside another section would re-enable too early) and breaks use inside ISRs.',
      },
      {
        mistake: 'Wrapping long work (or a while-loop wait) in a critical section.',
        fix:
          'Only the shared-data access belongs inside. Compute the new value first, then enter the section just for the store — critical-section length directly adds interrupt latency everywhere.',
      },
    ],
    guidedPractice: {
      title: 'Fix a torn timestamp pair',
      brief:
        'An ISR writes two related variables — `volatile uint16_t stamp_hi; volatile uint16_t stamp_lo;` — and main reads both to form a 32-bit timestamp. Write the safe reader (critical-section snapshot), and state which single-variable alternative avoids the section entirely.',
      expectedBehavior:
        'Save IRQ state, read hi, read lo, restore, combine ((uint32_t)hi << 16) | lo. Alternative: have the ISR maintain a single uint32_t — on a 32-bit aligned core one aligned load is atomic, needing only volatile; on 8/16-bit cores even that needs the section.',
      hints: [
        'The failure is a mixed pair: hi from one update, lo from the next.',
        'Atomic width depends on the core - state both cases.',
      ],
    },
    practiceExercises: [
      {
        title: 'Double-read validation',
        brief:
          'Implement `read_counter_retry()` that reads hi, lo, then hi again, retrying while the two hi reads differ (max 4 attempts, then return 0xFFFF as an error). Explain which guarantee this needs from the hardware to be correct.',
        expectedBehavior:
          'Loop: h1 = cnt_hi; l = cnt_lo; h2 = cnt_hi; if (h1 == h2) return (h1<<8)|l; else retry. Correctness needs the reads to be ordered against the increment such that a stable hi implies lo was not crossed mid-read — which holds for a monotonically incrementing counter with the ISR writing lo before hi on carry, and latched shadow reads if the vendor documents them.',
        hints: [
          'The check is "did the high byte change while I looked at the low byte?".',
          'This is the trick vendors document for their own timers - it relies on their specific update order.',
        ],
      },
      {
        title: 'Audit this code',
        brief:
          'Identify every defect: `uint32_t total; void isr(void){ total++; } int main(void){ while(1){ if(total > 100){ total = 0; } } }` — list them with the failure mode each causes.',
        expectedBehavior:
          'Defects: (1) total not volatile — main may never see increments (caching). (2) isr\'s total++ is an RMW: if main also writes (total = 0) an update can be lost (lost update) unless the write is in a critical section. (3) On an 8-bit core even reading total is torn (32-bit multi-access). Fixes: volatile, snapshot-and-clear inside a critical section in main.',
        hints: [
          'Three defect classes: visibility, tearing, lost update.',
          'main writes too - so it is not a read-only consumer.',
        ],
      },
    ],
    assessment: {
      title: 'Shared data checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A torn read produces a value that:',
          options: [
            'Never existed in the variable at any instant',
            'Is always smaller than the true value',
            'Is always larger than the true value',
            'Triggers a hardware fault',
          ],
          answer: 'Never existed in the variable at any instant',
          explanation:
            'High and low parts come from different instants — e.g. 256 between 511 and 512 — so the reader sees an impossible value.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'On an 8-bit AVR, which access is atomic?',
          options: ['uint8_t load', 'uint16_t load', 'uint32_t load', 'uint32_t += 1'],
          answer: 'uint8_t load',
          explanation:
            'Only single-byte accesses are single bus transactions on an 8-bit bus; wider loads and any RMW are composite.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A correct critical section always ends by enabling interrupts.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'It ends by RESTORING the saved state — interrupts may have been off before the section began (nesting, ISR context).',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does the torn read return?',
          code: 'cnt_hi = 0x01; cnt_lo = 0xFF;   /* true value 0x01FF = 511 */\n/* the ISR fires HERE: counter becomes 0x0200 = 512 */\nhi = cnt_hi;    /* byte read 1 (before the ISR) */\nlo = cnt_lo;    /* byte read 2 (after the ISR)  */\nreturn (hi << 8) | lo;',
          options: ['0x0100', '0x01FF', '0x0200', '0x02FF'],
          answer: '0x0100',
          explanation:
            'hi = 0x01 (old high byte) and lo = 0x00 (new low byte, wrapped with the carry) assemble 0x0100 = 256 — a value the counter never held (it was 511, then 512). That impossible value is exactly what tearing means.',
          hint: 'The high byte comes from before the ISR, the low byte from after the carry.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt: 'Main does `shared = shared + 1;` while an ISR also increments `shared`. What is the defect and the standard fix?',
          options: [
            'Lost update - wrap both RMWs in critical sections (or make one side atomic)',
            'Nothing, addition is atomic',
            'volatile fixes it',
            'Use a bigger type',
          ],
          answer: 'Lost update - wrap both RMWs in critical sections (or make one side atomic)',
          explanation:
            'Both sides read-modify-write, so increments interleave and one is lost. Protect every RMW on the shared variable; volatile alone does nothing for this.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Torn read', definition: 'A multi-part read observed mid-update, yielding a value that never existed.' },
      { term: 'Atomic access', definition: 'A bus transaction that cannot be split — plain, aligned loads/stores of register width.' },
      { term: 'Critical section', definition: 'A region with interrupts disabled (state saved/restored) making shared access indivisible.' },
      { term: 'Lost update', definition: 'A concurrent RMW whose write-back erases the other context\'s change.' },
      { term: 'Double-read idiom', definition: 'Re-reading a multi-byte value until consistent; correct only with documented hardware ordering.' },
    ],
    revisionSummary: [
      'Three sharing failures: invisibility (volatile), tearing (atomic width / critical section), lost update (critical section / atomic RMW alternative).',
      'Atomic = plain aligned load/store of register width; RMW is never atomic.',
      'Critical sections: save state, keep short, restore state.',
      'Multiple related values always need a snapshot or an encoding trick.',
      'volatile is necessary, never sufficient.',
    ],
    furtherReading: [
      { label: 'cppreference — volatile in C', url: 'https://en.cppreference.com/w/c/language/volatile', kind: 'docs' },
      { label: 'Wikipedia — Linearizability (what atomic means, conceptually)', url: 'https://en.wikipedia.org/wiki/Linearizability', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'embc-m06-l3',
    title: 'ISR Design: Short Handlers and Deferred Work',
    summary:
      'The production pattern: ISRs that only record events, a main loop that consumes them — plus interrupt priorities, nesting, and the latency thinking that ties it together.',
    objectives: [
      'Restructure work out of an ISR into a deferred main-loop handler.',
      'Implement the flag-snapshot pattern (and its queue variant) safely.',
      'Explain priorities and nesting at a concept level.',
      'Reason about interrupt latency and worst-case timing.',
    ],
    whyItMatters:
      'Almost every real firmware interrupt scheme converges on one shape: tiny ISRs, an event record, and processing in a safe context. Learn it here and you can read any driver — and you are 80% of the way to understanding RTOS task notifications in module 16.',
    prerequisites: ['embc-m06-l1', 'embc-m06-l2'],
    explanation:
      'Lesson 1 gave ISRs one commandment: be short. Lesson 2 showed what sharing data costs. Together they imply the production design: **the ISR only records; the main loop does the work.**\n\n### The flag-snapshot pattern\n\nThe ISR sets one or more event bits in a shared `volatile uint8_t event_flags`. The main loop, once per iteration, takes a *snapshot* inside a critical section (read and clear atomically), then handles the bits outside it:\n\n```c\nmock_irq_save();\nflags = event_flags;\nevent_flags = 0u;\nmock_irq_restore(was);\n/* now handle each bit at leisure - new events may arrive meanwhile,\n   they simply set bits again for the next iteration */\n```\n\nWhy the critical section here? Read-and-clear is two operations; an ISR striking between them would have its flag erased by the pending clear — a lost event. The snapshot makes read+clear indivisible. This is the canonical "deferred processing" pattern of bare-metal firmware.\n\n### When one byte of flags is not enough: the queue\n\nFlags merge repeated events: two UART bytes arriving before the loop runs collapse into one RX flag. When each *occurrence* matters, the ISR pushes data into a **ring buffer** (head index only — it owns the head, the loop owns the tail, and that split ownership makes it lock-free on single-core MCUs). Module 07 builds the full ring buffer; module 18 uses this exact design for an event counter.\n\n### Priorities and nesting, conceptually\n\nInterrupt controllers rank sources by **priority**. When a higher-priority event fires while a lower-priority ISR runs, the CPU **nests**: the low-priority handler is suspended, the high one runs, then the low resumes. This bounds latency for critical sources (a motor overcurrent ISR cannot wait behind a slow UART ISR) but creates new shared-data pairs (two ISRs can now interrupt *each other* — the same critical-section rules apply between them). On Cortex-M the NVIC implements this with numbered priorities and preemption; on simpler cores, nesting may not exist at all and ISRs run to completion regardless of priority. Which model your chip uses is a vendor-manual fact — the design consequences (which work belongs where) are universal.',
    deepDive:
      '### The latency ledger\n\nInterrupt **latency** = time from event to first instruction of your ISR. Its components: controller recognition (fast, constant), completion of the current instruction (bounded), and — the big one — *other interrupts of higher or equal priority already running* (unbounded unless you budget them). Add your ISR\'s own execution time and you have the worst-case reaction time of the system to that event. Firmware engineers write this ledger down for hard real-time requirements: "button event: 10 us + 2 us ISR = 12 us worst case; motor fault: 10 us + 8 us = 18 us". If a number exceeds the requirement, the fixes are: shorten an ISR, raise a priority, or move work out of the interrupt path entirely.\n\n### Choosing what stays in the ISR\n\nThe three things that legitimately live in an ISR: (1) clearing the flag; (2) moving one datum (byte to buffer, count increment, timestamp latch); (3) setting an event flag. Everything else — decoding, printing, decision-making, driving outputs — defers. The exceptions are honest and rare: a hard safety cutoff (kill PWM within microseconds) may do its one register write in the ISR *and* still defer the bookkeeping. When you meet RTOS "give-from-ISR" calls in module 16, recognise them as this same pattern with a scheduler-aware payload.\n\n### A word on nested shared data\n\nOnce two ISRs can nest, your ring buffer indices are shared between *three* contexts (two ISRs + main). The head/tail split still works if every ISR that pushes uses its own buffer — or if pushes are protected by a critical section that also covers the higher ISR\'s push. This is exactly the kind of reasoning a design review expects: list the contexts, list the shared data, list the protection for each pair.',
    examples: [
      {
        title: 'Flag-snapshot deferred processing, fully traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nstatic volatile uint8_t event_flags = 0u;\n#define EV_TIMER (1u << 0)\n#define EV_UART  (1u << 1)\n#define EV_ADC   (1u << 2)\n\nstatic uint8_t mock_irq_enabled = 1u;\nstatic uint8_t mock_irq_save(void) {\n    uint8_t was = mock_irq_enabled; mock_irq_enabled = 0u; return was;\n}\nstatic void mock_irq_restore(uint8_t was) { mock_irq_enabled = was; }\n\n/* ISRs: nothing but a flag set. */\nstatic void timer_isr(void) { event_flags |= EV_TIMER; }\nstatic void uart_isr(void)  { event_flags |= EV_UART;  }\nstatic void adc_isr(void)   { event_flags |= EV_ADC;   }\n\nint main(void) {\n    /* Simulated storm: three interrupts arrive back-to-back. */\n    timer_isr();\n    uart_isr();\n    adc_isr();\n\n    uint8_t flags;\n    uint8_t was = mock_irq_save();\n    flags = event_flags;                 /* snapshot + clear, atomic */\n    event_flags = 0u;\n    mock_irq_restore(was);\n\n    if ((flags & EV_TIMER) != 0u) { printf("deferred: timer bookkeeping\\n"); }\n    if ((flags & EV_UART)  != 0u) { printf("deferred: uart rx process\\n");  }\n    if ((flags & EV_ADC)   != 0u) { printf("deferred: adc filter step\\n");  }\n    return 0;\n}',
        explanation: [
          'Each ISR is a single OR of a flag bit — microseconds of work, no shared-data risk beyond the volatile flag.',
          'The snapshot takes all three bits and clears them in one critical section, so an interrupt striking between read and clear cannot lose an event.',
          'Handling happens outside the section: printf-style work runs with interrupts enabled, so new events keep being recorded.',
          'Exact output: `deferred: timer bookkeeping` / `deferred: uart rx process` / `deferred: adc filter step`.',
          'If a fourth interrupt arrived during handling, its bit would be set for the next loop iteration — no event is lost, none is processed twice.',
        ],
      },
      {
        title: 'Split-ownership byte queue: ISR pushes, loop pops (lock-free)',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n#define Q_SIZE 8u                       /* power of two, one slot sacrificed */\nstatic volatile uint8_t q_buf[Q_SIZE];\nstatic volatile uint8_t q_head = 0u;    /* owned by the producer (ISR)  */\nstatic volatile uint8_t q_tail = 0u;    /* owned by the consumer (loop) */\n\nstatic void queue_push_from_isr(uint8_t b) {\n    uint8_t next = (uint8_t)((q_head + 1u) & (Q_SIZE - 1u));\n    if (next == q_tail) {\n        return;                          /* full: drop (or count drops)  */\n    }\n    q_buf[q_head] = b;\n    q_head = next;                       /* publish last                 */\n}\n\nstatic uint8_t queue_pop(uint8_t *out) {\n    if (q_tail == q_head) {\n        return 0u;                       /* empty */\n    }\n    *out = q_buf[q_tail];\n    q_tail = (uint8_t)((q_tail + 1u) & (Q_SIZE - 1u));\n    return 1u;\n}\n\nint main(void) {\n    uint8_t b;\n\n    queue_push_from_isr(0x41u);          /* ISR events: bytes "A", "B" */\n    queue_push_from_isr(0x42u);\n\n    while (queue_pop(&b) != 0u) {\n        printf("consumed 0x%02X\\n", (unsigned)b);\n    }\n    printf("queue empty, head=%u tail=%u\\n",\n           (unsigned)q_head, (unsigned)q_tail);\n    return 0;\n}',
        explanation: [
          'Ownership split: the ISR alone writes q_head, the loop alone writes q_tail — so neither needs a critical section against the other on a single-core MCU.',
          'Full test: (head + 1) masked equals tail means one slot is kept empty to distinguish full from empty (both would otherwise be head == tail).',
          'Trace: push 0x41 → head 1; push 0x42 → head 2. Pop returns 0x41 then 0x42, tail ends at 2.',
          'Exact output: `consumed 0x41` / `consumed 0x42` / `queue empty, head=2 tail=2`.',
          'Each pushed byte survives — unlike the flag pattern where repeated events merge. Module 07 scales this to a full UART driver; module 18 counts events with the same skeleton.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Deferred processing: ISR records, loop works',
        content:
          '   INTERRUPT CONTEXT                      MAIN (TASK) CONTEXT\n   -----------------                      -------------------\n   timer ISR:  flags |= EV_TIMER  ---+\n   uart  ISR:  flags |= EV_UART   ---+-->  snapshot+clear (critical)\n   adc   ISR:  flags |= EV_ADC    ---+          |\n                                              v\n                                     handle timer / uart / adc\n                                     (long work, IRQs enabled)\n                                              |\n   new events during handling                 v\n   set bits again ---------> next loop iteration picks them up',
        caption:
          'Events cross from interrupt context to task context through one shared flag byte (or a queue for per-event data). Neither side ever blocks.',
      },
    ],
    tables: [
      {
        caption: 'What lives where',
        headers: ['Work', 'ISR', 'Main loop'],
        rows: [
          ['Clear peripheral flag', 'Yes (mandatory)', 'Never'],
          ['Set event flag / push one byte', 'Yes', 'n/a'],
          ['Latch a timestamp', 'Yes (capture hardware ideally)', 'n/a'],
          ['Decode, filter, print', 'No', 'Yes'],
          ['State machines, debouncing logic', 'No', 'Yes'],
          ['Safety cutoff (single register write)', 'Allowed, rare', 'Plus deferred bookkeeping'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Handling events directly in the ISR "because it is simpler".',
        fix:
          'Every microsecond in the ISR is stolen from everything else, and the code inherits ISR restrictions (no blocking, reentrancy). Record-and-defer costs one flag byte and removes all of it.',
      },
      {
        mistake: 'Snapshotting flags without a critical section (read, clear, handle).',
        fix:
          'An ISR between your read and your clear has its event erased. Snapshot read+clear must be atomic; handling stays outside.',
      },
      {
        mistake: 'Forgetting that nesting creates ISR-to-ISR sharing.',
        fix:
          'List every context that touches each shared datum (main, each ISR). If two ISRs can nest and both touch it, it needs the same protection as ISR/main sharing.',
      },
    ],
    guidedPractice: {
      title: 'Design the event plumbing for a keypad',
      brief:
        'Four buttons share one GPIO interrupt (any edge). Design the plumbing: what the ISR does (flag? which data?), what the main loop does, and how a burst of three buttons pressed within one loop iteration is preserved (or deliberately merged) — state your choice and why.',
      expectedBehavior:
        'ISR: set the GPIO event flag (one bit). Main loop: debounces each button (module 04 patterns), then emits key events — into a queue if each press matters, or flags if merged presses are acceptable. In one iteration all three presses get debounced from the current pin states; individual order within the burst is lost unless a queue captures per-pin flags — a per-pin flag byte (one bit per button) preserves all three.',
      hints: [
        'A flag byte has eight bits — one per button preserves identity.',
        'Order within a simultaneous burst may not matter for a keypad; state the assumption.',
      ],
    },
    practiceExercises: [
      {
        title: 'Latency ledger',
        brief:
          'Events: (a) overcurrent fault, requirement: react within 20 us; (b) UART byte, 1 ms tolerance; (c) housekeeping tick, 100 ms tolerance. Priority order the three, and for (a) state what could break the 20 us budget even at top priority.',
        expectedBehavior:
          'Priorities: fault > UART > tick. Budgets: fault 10 us + ISR 5 us = 15 us OK; UART serviced within 1 ms easily; tick deferrable. (a) can break if: a same-or-higher ISR is running (nesting blocked), global interrupts are disabled in a critical section longer than ~10 us, or the ISR itself is too long.',
        hints: [
          'Latency = recognition + current instruction + higher-priority ISRs + your ISR.',
          'Critical sections elsewhere in the system count against every ISR.',
        ],
      },
      {
        title: 'Merge or queue?',
        brief:
          'Two events arrive while the main loop handles a previous one: (a) timer tick; (b) a button press. For each, decide flag-merge vs queue and justify in one sentence.',
        expectedBehavior:
          '(a) Merge — ticks are periodic; collapsing 3 missed ticks into 1 flag is fine (or the scheduler\'s fixed-phase catch-up handles it). (b) Queue or per-pin flags — each press is a distinct user action; merging two presses would drop an input.',
        hints: [
          'Ask: does each occurrence carry independent meaning?',
          'Periodic vs discrete events.',
        ],
      },
    ],
    assessment: {
      title: 'ISR design checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why must the flag snapshot (read + clear) be atomic?',
          options: [
            'An ISR striking between read and clear would have its event erased by the pending clear',
            'printf is not reentrant',
            'It makes the loop faster',
            'Flags are 16-bit',
          ],
          answer: 'An ISR striking between read and clear would have its event erased by the pending clear',
          explanation:
            'Read then clear are two operations; the critical section makes them one, so no event can be lost in the gap.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In the split-ownership ring buffer, who writes q_head and who writes q_tail?',
          options: [
            'Producer (ISR) writes head; consumer (loop) writes tail',
            'Both sides write both indices',
            'The ISR writes both',
            'Nobody: the hardware does',
          ],
          answer: 'Producer (ISR) writes head; consumer (loop) writes tail',
          explanation:
            'Each index has exactly one writer, which makes the queue lock-free on a single-core MCU (with the usual volatile care).',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'With interrupt nesting, two ISRs can share data and need the same protection rules as ISR/main sharing.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'A higher-priority ISR can strike inside a lower one; any data both touch needs atomic or critical-section treatment.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'An ISR for a sensor sets a flag AND runs a 200-step digital filter on the sample. What is wrong and how is it fixed?',
          options: [
            'The filter belongs in the main loop; the ISR should just store the sample and set the flag',
            'The filter should be optimised',
            'The flag should be cleared in main',
            'Nothing is wrong',
          ],
          answer: 'The filter belongs in the main loop; the ISR should just store the sample and set the flag',
          explanation:
            'A 200-step filter is exactly the "real work" that inflates interrupt latency; deferred processing keeps the ISR at flag-plus-store.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the three components of worst-case interrupt latency (event -> ISR first instruction).',
          answer: 'controller recognition, completing the current instruction, and higher/equal-priority interrupts already in progress',
          explanation:
            'The first two are bounded and small; the third dominates and is why ISR length and priority assignment matter.',
          hint: 'One is about the controller, one the CPU pipeline, one other ISRs.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Deferred processing', definition: 'ISRs record events; the main loop performs the actual work with interrupts enabled.' },
      { term: 'Flag snapshot', definition: 'Atomic read-and-clear of the shared event flags inside a critical section.' },
      { term: 'Interrupt nesting', definition: 'A higher-priority interrupt preempting a lower-priority ISR.' },
      { term: 'Interrupt latency', definition: 'Event-to-ISR delay: recognition + instruction completion + higher-priority activity.' },
      { term: 'Split ownership', definition: 'A lock-free design where each shared index/field has exactly one writer context.' },
    ],
    revisionSummary: [
      'ISR = flag + datum; main loop = work. Always.',
      'Snapshot flags atomically; handle outside the critical section.',
      'Per-event data needs a queue; split head/tail ownership for lock-free operation.',
      'Nesting makes ISRs share data with each other too.',
      'Write the latency ledger for anything with a deadline.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Deferred interrupt handling / split operation design', url: 'https://en.wikipedia.org/wiki/Interrupt#Types_of_interrupts', kind: 'article' },
      { label: 'Wikipedia — Interrupt latency', url: 'https://en.wikipedia.org/wiki/Interrupt_latency', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
