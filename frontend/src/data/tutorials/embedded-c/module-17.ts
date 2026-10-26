import type { TutorialLesson } from '../types';

export const module17Lessons: TutorialLesson[] = [
  {
    id: 'embc-m17-l1',
    title: 'Observability: Logs, Debugger, Logic Analyzer and Scope',
    summary:
      'The four windows into a running system — serial logs, the in-circuit debugger, the logic analyzer and the oscilloscope — and when each one is the right tool.',
    objectives: [
      'Build a leveled, timestamped logging facility with compile-time filtering.',
      'Use debugger capabilities conceptually: breakpoints, stepping, watch windows, peripheral register views.',
      'Choose between logic analyzer and oscilloscope for a given symptom.',
      'Combine tools in the right order: logs to find, debugger to inspect, analyzer/scope to verify the wire.',
    ],
    whyItMatters:
      'Embedded debugging is mostly *observability engineering*: on a board with no screen, the question is always "how do I see inside?" — and the answer is planned at design time, not improvised during the 2 a.m. failure.',
    prerequisites: ['embc-m07-l2', 'embc-m13-l3'],
    explanation:
      '### Window 1: serial logs (the workhorse)\n\nModule 13-l3 defined the strategy (levels, events, timestamps, ring buffer); this lesson adds the practice: logs find *which* subsystem misbehaves. A `[E][i2c] nack dev=48` line narrows a "device randomly fails" report to one driver in one read. The debugging rhythm is: reproduce, read the last log lines, form one hypothesis, add the minimal extra log or test, repeat. Logs cost flash and CPU — budgeted, filtered, and removable per build (module 15-l3).\n\n### Window 2: the in-circuit debugger\n\nThe debug probe (SWD/JTAG) gives what no log can: a frozen snapshot. **Breakpoints** halt the CPU at a line or address; **stepping** walks statements; **watch windows** show variables live or on-change; **peripheral register views** decode the vendor\'s registers by name (the module 03 memory map, rendered human); the **call stack window** shows how you got here; **watchpoints** (data breakpoints) halt when a variable *changes* — the surgical tool for "who corrupts this variable?" (a stack overflow or stray pointer is found in minutes). Two honest limits: breakpoints change timing (polling loops and race bugs behave differently under halt — Heisenbugs resist), and some failures (brown-outs, EMI) vanish in the debugger\'s kinder electrical environment. Free-running logging catches what halting cannot.\n\n### Windows 3 and 4: the wires\n\nA **logic analyzer** records many digital channels over time and decodes protocols (UART, SPI, I2C) — the tool for "is the byte actually on the wire?", for protocol-level debugging (module 08\'s shifted streams, module 09\'s NACKs become visible), and for timing relationships between signals. An **oscilloscope** shows analog truth — rise times, ringing, noise, voltage levels — the tool for "is the *signal* healthy?" (module 12-l3\'s noise characterization). The split: logic-level questions → analyzer; analog-quality questions → scope. Cheap USB analyzers and scopes cover most embedded work; the skill is knowing which question you are asking.\n\n### The order of battle\n\nLogs first (cheap, always available, finds the subsystem) → debugger second (freezes the state, inspects the variables) → analyzer/scope third (verifies what the hardware actually did). Going straight to the scope without logs often means staring at a beautiful capture of the wrong thing; staying in logs forever means guessing at state the debugger would have shown instantly.',
    deepDive:
      '### printf-style debugging, honestly\n\nDespite the debugger\'s power, log-driven debugging dominates real firmware work — because concurrency bugs and hardware interactions *move* under a halted CPU. The professional hybrid: strategic permanent logs (events, errors — always compiled in), temporary diagnostic logs added during investigation (removed when done, or gated behind a debug level), and the debugger for state inspection once the logs have localized the problem. The failure mode to avoid: log spam that changes timing enough to hide the bug (a ring-buffer overflow from your own diagnostics is a classic). When logs themselves perturb, the next step is the binary-search style of lesson 2 — halve the logging, see if the bug reappears.\n\n### Peripheral register views and the module 03 payoff\n\nEvery serious debugger renders the chip\'s peripheral registers symbolically: click GPIOA, see MODER/ODR/IDR decoded bit by bit, with reset values marked. This is the module 03 memory map made interactive — and it is the fastest peripheral-confusion diagnostic there is: compare the register panel against what the manual says your configuration should produce. A direction bit you thought you set, an interrupt enable still clear, a status flag stuck — all visible without adding a line of code. The habit: when a peripheral "does nothing", open the register view *first*, before touching code, and diff reality against the manual\'s expected configuration.\n\n### Timing measurement with the tools you already have\n\nThe scope/analyzer pair also measures (module 15-l3\'s GPIO-toggle method): toggle a spare pin at function entry/exit, and the analyzer shows the pulse-width histogram over thousands of invocations — worst case, average, and outliers, all without touching the timing code again. For software-only timing, the Cortex-M DWT cycle counter (module 15-l3) reads cycles without pins. The analyzer\'s advantage: it sees *between* the sections too — the gap between "processing done" and "next DMA event" is exactly the stream-deadline margin of module 14-l2, measured directly.',
    examples: [
      {
        title: 'A leveled, filtered logging facility, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n#define LOG_LEVEL_ERROR 1u\n#define LOG_LEVEL_WARN  2u\n#define LOG_LEVEL_INFO  3u\n#define LOG_LEVEL_DEBUG 4u\n\n#ifndef COMPILE_LOG_LEVEL\n#define COMPILE_LOG_LEVEL LOG_LEVEL_INFO   /* set per build type */\n#endif\n\n#if COMPILE_LOG_LEVEL >= LOG_LEVEL_ERROR\n#define LOG_E(msg) printf("[E] %s\\n", msg)\n#else\n#define LOG_E(msg) ((void)0)\n#endif\n\n#if COMPILE_LOG_LEVEL >= LOG_LEVEL_WARN\n#define LOG_W(msg) printf("[W] %s\\n", msg)\n#else\n#define LOG_W(msg) ((void)0)\n#endif\n\n#if COMPILE_LOG_LEVEL >= LOG_LEVEL_INFO\n#define LOG_I(msg) printf("[I] %s\\n", msg)\n#else\n#define LOG_I(msg) ((void)0)\n#endif\n\nint main(void) {\n    LOG_I("boot: sensors probed, 3 found");\n    LOG_W("i2c retry 1 on dev 0x48");\n    LOG_E("sensor 0x5A absent: degrading");\n    LOG_I("boot complete (degraded mode)");\n    return 0;\n}',
        explanation: [
          'With COMPILE_LOG_LEVEL = INFO (3): all three levels print.',
          'Exact output: `[I] boot: sensors probed, 3 found` / `[W] i2c retry 1 on dev 0x48` / `[E] sensor 0x5A absent: degrading` / `[I] boot complete (degraded mode)`.',
          'Set COMPILE_LOG_LEVEL to ERROR (1) and the build compiles the [W]/[I] calls to `((void)0)` — zero flash cost (module 15-l3\'s size lever), with [E] always present.',
          'The levels encode permanence: [E]/[W] are the permanent instrumentation of module 13-l3; [I]/[D] are the investigation scaffolding this lesson adds and removes.',
          'On a real board printf maps onto the UART TX path of module 07 — same calls, different sink.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The debugging funnel',
        content:
          '  symptom report\n        |\n        v\n  LOGS: which subsystem, which event pattern?   (running system)\n        |\n        v\n  DEBUGGER: freeze, inspect state, watch variables (halted system)\n        |\n        v\n  ANALYZER/SCOPE: verify the wire, measure the timing  (real signals)\n        |\n        v\n  hypothesis -> minimal change -> retest -> regression test (lesson 3)',
        caption:
          'Tools in order of cost and invasiveness. Logs localize; the debugger inspects; the analyzer verifies the physical layer.',
      },
    ],
    tables: [
      {
        caption: 'Tool selection guide',
        headers: ['Question you are asking', 'Tool', 'Why'],
        rows: [
          ['Which subsystem fails? How often?', 'Serial logs', 'Runs free; statistics over time'],
          ['What was the state when it failed?', 'Debugger (breakpoint/watch)', 'Frozen, complete state'],
          ['Who writes this variable?', 'Watchpoint (data breakpoint)', 'Halts at the writer'],
          ['Is the byte on the wire? Is the frame shaped right?', 'Logic analyzer', 'Protocol decode, multi-signal timing'],
          ['Is the signal level/timing electrically healthy?', 'Oscilloscope', 'Analog truth: edges, noise, levels'],
          ['How long does this section take (µs)?', 'GPIO toggle + analyzer, or cycle counter', 'Non-invasive timing'],
        ],
      },
      {
        caption: 'Debugger capabilities and their embedded limits',
        headers: ['Capability', 'Use', 'Limit'],
        rows: [
          ['Breakpoints / stepping', 'Freeze and walk code', 'Changes timing; races hide'],
          ['Watch windows', 'Live variable/struct values', 'Sampled, not continuous'],
          ['Watchpoints', 'Halt on memory write', 'Hardware-limited count (often 1-8)'],
          ['Peripheral register view', 'Decoded chip registers', 'Names are vendor-pack specific'],
          ['Call stack view', 'Path to the breakpoint', 'Needs frame pointers/symbols'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Starting at the oscilloscope with no logs and no hypothesis.',
        fix:
          'Logs localize the subsystem first; the scope then answers a *specific* question about that subsystem\'s signals. Funnel, not lottery.',
      },
      {
        mistake: 'Debugging a race bug with breakpoints and concluding "it fixed itself".',
        fix:
          'Halting changes timing — races vanish under the debugger. Instrument with logs/counters that run free, and use watchpoints only to identify the writer once you know the variable.',
      },
      {
        mistake: 'Leaving investigation logs (and their flash cost) in the shipping build.',
        fix:
          'Temporary logs go behind the debug level and come out with the investigation; permanent instrumentation is the designed [E]/[W] set of module 13-l3.',
      },
    ],
    guidedPractice: {
      title: 'Plan the investigation',
      brief:
        'Symptom: "the sensor reading freezes at 0 every few hours; power-cycling fixes it". Plan the investigation: which tool first, what you log, what you would look for in the debugger if the freeze happens on the bench, and what the analyzer would verify if the I2C bus is suspected.',
      expectedBehavior:
        'Logs first: [E] on every NACK/timeout with device and sequence numbers; log read attempts and results with timestamps. Bench-freeze: debugger shows the driver state machine state, the last status/error latch, and a watchpoint on the result variable to find who zeroes it. Analyzer: capture SDA/SCL at the failure — look for SDA stuck low (module 09-l3), missing clock pulses (stretching), or a missing STOP.',
      hints: [
        'Funnel order: logs -> debugger -> analyzer.',
        'The module 09-l3 symptom table maps directly onto the analyzer capture.',
      ],
    },
    practiceExercises: [
      {
        title: 'Design the log line',
        brief:
          'Design the permanent log line set for the UART RX path (module 07): overrun events, framing errors, ring-buffer drops, and recovery events. Include fields that make rate questions answerable later.',
        expectedBehavior:
          'Lines like `[E][uart] overrun` / `[E][uart] framing` / `[W][uart] rx drop n=4` (cumulative count or per-event) / `[I][uart] rx recovered`. Rate questions need timestamps (module 13-l3) and monotonic counters (drops since boot) — the fields that let a field report say "drops began after 14:02, 3 per minute".',
        hints: [
          'Events plus counters, both with timestamps.',
          'The decoder map lives on the host (module 13-l3).',
        ],
      },
      {
        title: 'Choose the window',
        brief:
          'Match each symptom to its first tool: (a) a variable in .bss changes between two reads; (b) the I2C occasionally NACKs; (c) PWM output looks dimmer than expected; (d) boot takes 300 ms longer than measured.',
        expectedBehavior:
          '(a) Watchpoint on the variable (find the writer) — then suspect stack overflow (module 15-l2). (b) Logic analyzer on the bus at the failure. (c) Oscilloscope/analyzer on the PWM pin (duty, level, frequency). (d) Logs with boot-stage timestamps, then GPIO+analyzer per stage (module 15-l3).',
        hints: [
          'Software-state questions → debugger; wire questions → analyzer; analog questions → scope.',
          'Timing questions → instrumented pins or timestamps.',
        ],
      },
    ],
    assessment: {
      title: 'Observability checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'The first tool for a "sometimes the sensor fails" report is:',
          options: [
            'Serial logs of errors and events with timestamps',
            'An oscilloscope on random pins',
            'A full rewrite of the driver',
            'Turning off optimization',
          ],
          answer: 'Serial logs of errors and events with timestamps',
          explanation:
            'Logs run free, localize the subsystem, and accumulate statistics — the funnel starts there.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A watchpoint (data breakpoint) is the tool for:',
          options: [
            'Finding who writes a variable',
            'Measuring a PWM duty cycle',
            'Decoding I2C traffic',
            'Formatting logs',
          ],
          answer: 'Finding who writes a variable',
          explanation:
            'It halts the CPU at the instruction that modifies the watched address.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Race bugs are best hunted with breakpoints and single-stepping.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'Halting changes timing — races hide. Free-running logs/counters and watchpoints (once localized) are the tools.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Which tool answers "is the I2C SDA line stuck low during the failure"?',
          options: ['Logic analyzer', 'Serial log', 'Watch window', 'Map file'],
          answer: 'Logic analyzer',
          explanation:
            'It is a wire-level question: capture SDA/SCL around the failure and look (module 09-l3\'s symptom table).',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the debugging funnel stages in order.',
          answer: 'logs (localize), debugger (inspect state), logic analyzer / oscilloscope (verify the wire), then hypothesis-test-regression',
          explanation:
            'Cheap and non-invasive first; frozen state second; physical layer third; then the lesson-2 methodology takes over.',
          hint: 'Running, halted, wired.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Breakpoint / watchpoint', definition: 'Debug halt on code location / on data access — the latter finds writers.' },
      { term: 'Peripheral register view', definition: 'Debugger panel decoding chip registers by name against the manual.' },
      { term: 'Logic analyzer', definition: 'Multi-channel digital recorder with protocol decode — wire-level truth.' },
      { term: 'Oscilloscope', definition: 'Analog waveform viewer — signal-quality truth (levels, edges, noise).' },
      { term: 'Heisenbug', definition: 'A defect that changes or vanishes under observation (e.g. when halted in the debugger).' },
    ],
    revisionSummary: [
      'Four windows: logs, debugger, analyzer, scope — funnel in that order.',
      'Watchpoints find writers; register views diff configuration against the manual.',
      'Halting changes timing: races need free-running instrumentation.',
      'Analyzer = digital/protocol; scope = analog quality.',
      'Permanent logs are designed (13-l3); investigation logs are temporary.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Logic analyzer', url: 'https://en.wikipedia.org/wiki/Logic_analyzer', kind: 'article' },
      { label: 'Wikipedia — Oscilloscope', url: 'https://en.wikipedia.org/wiki/Oscilloscope', kind: 'article' },
      { label: 'Wikipedia — Debugger', url: 'https://en.wikipedia.org/wiki/Debugger', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m17-l2',
    title: 'Fault Isolation, Assertions and Reproducible Failures',
    summary:
      'A method instead of poking: reproduce, isolate, hypothesize, verify — with assertions as tripwires, bisected variables, and field failures made reproducible on the bench.',
    objectives: [
      'Apply the five-step fault-isolation method to a firmware defect.',
      'Use assertions as executable invariants, and know where they live (debug) vs go (release).',
      'Reduce a field failure to a minimal reproducible bench case.',
      'Add the regression test that keeps the bug dead.',
    ],
    whyItMatters:
      'Engineers with a method find bugs in hours; engineers without one poke for days and "fix" things that were not broken. The method is short, learnable, and the difference is visible in any code review of a debugging session.',
    prerequisites: ['embc-m17-l1'],
    explanation:
      '### The five steps\n\n1. **Reproduce** — reliably, on your bench. Until you can, you are guessing; the whole art of the next three steps is making this possible (below).\n2. **Isolate** — shrink the system: fewer tasks, fewer peripherals, smaller input. Binary-search the *conditions*: does it fail with logging off? with the motor disconnected? with the shorter message?\n3. **Hypothesize** — one sentence, falsifiable: "the ring buffer overflows when the log line arrives during a DMA completion".\n4. **Verify** — an experiment that could *disprove* it: an assert, a counter, a captured trace. A hypothesis that cannot be disproven is a guess.\n5. **Fix and lock** — the minimal fix, plus the regression test (lesson 3) so this exact bug cannot return.\n\nThe discipline that makes step 1 possible on bugs that "happen in the field": record everything the firmware knows (module 13-l3\'s logs, error latches, reset causes) so a field unit tells you the conditions; then reproduce those conditions — same input sequence, same timing stress, same temperature if it matters. Hardware stress tools are legitimate isolators: reduced supply voltage (a bench supply at 3.0 V), a fan on the crystal (frequency drift), RF noise from an unshielded lamp — embarrassing, effective, and standard practice.\n\n### Assertions: executable invariants\n\nAn **assert** states a condition that must hold if the code is correct — `assert(rb != NULL)`, `assert(head < RB_SIZE)` — and aborts (or logs-and-resets) when it does not. Two deployments: development asserts compiled in (they catch contract violations *at the source*, with file and line), and release behavior decided explicitly — many embedded teams map assert-failure to the module 13-l3 ladder (log + safe state + reset) rather than removing the check entirely, because a violated invariant is already a corrupted-system condition. Assertions document the module contracts (module 13-l2) in code that cannot rot. What asserts are *not*: input validation — untrusted input must be handled with return codes, not trusted to be sane enough to assert about.\n\n### Bisecting like an engineer\n\nWhen the failure window is unclear, bisect *variables*, not just code: build date (which commit introduced it — git bisect), configuration (which feature flag), timing (which delay value flips it), data (which message length). Each bisect halves the search space; five good bisections cut 32 candidates to one. The trap is changing two variables at once — every experiment changes exactly one thing, and the result is written down (the lab notebook habit scales: your commit history plus a short findings note *is* the notebook).',
    deepDive:
      '### The reproducibility ladder, honestly\n\nFrom hardest to easiest: field-only (no repro — instrument more, log more, wait); field-simulated (same input replay on bench — record UART traffic and replay it); stress-reproduced (load, low voltage, thermal); always-reproducible (a test case). Each field bug should be *walked down* this ladder as far as possible, because every step down multiplies how fast the fix can be verified — an always-reproducible bug becomes a unit test (lesson 3) that runs forever. When a bug cannot be walked below "stress-reproduced", the fix verification is statistical (run N hours, compare failure rates) and the report says so honestly, rather than claiming a fix that was never seen to work.\n\n### Assertions and fault handling, honestly\n\nThe release-mode assert debate has a concrete embedded answer: an assert firing means an *invariant of the system* is broken — continuing means corrupted data or unsafe outputs. So embedded release behavior is: capture the failure (which assert, which task, key variables) into a persistent location or a final log burst, drive outputs safe (module 12-l2), and reset deliberately (module 13-l3). That is strictly better than both naive choices: continuing (corruption grows) and silent removal via NDEBUG (invariant checks vanish). The development assert stays cheap; the release path is a designed feature. Some kernels/RTOSes provide assert hooks exactly for this; FreeRTOS\'s configASSERT is the reference example — a user-supplied function that receives the failed condition and can log before stopping.\n\n### Writing it down: the defect report that engineers actually reuse\n\nA reproducible defect report has: environment (build hash, board revision, power), the exact input sequence, observed vs expected (with logs), and the minimal repro steps. The discipline is not bureaucracy — it is what makes step 1 possible for the *next* person, and what your own future self needs after three weeks of other work. On teams, the report plus the regression test is the complete lifecycle: report → repro → fix → test → close, with the test name referencing the report id (module 17-l3\'s suite does exactly this).',
    examples: [
      {
        title: 'Assertions as invariants in the ring buffer, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n#include <assert.h>\n\n#define RB_SIZE 8u\n#define RB_MASK (RB_SIZE - 1u)\n\ntypedef struct {\n    uint8_t          buf[RB_SIZE];\n    volatile uint8_t head;\n    volatile uint8_t tail;\n} ringbuf_t;\n\n/* Development invariant check: both indices always in range. */\nstatic void rb_check_invariants(const ringbuf_t *rb) {\n    assert(rb->head < RB_SIZE);\n    assert(rb->tail < RB_SIZE);\n}\n\nstatic uint8_t rb_put(ringbuf_t *rb, uint8_t b) {\n    rb_check_invariants(rb);\n    uint8_t next = (uint8_t)((rb->head + 1u) & RB_MASK);\n    if (next == rb->tail) {\n        return 0u;\n    }\n    rb->buf[rb->head] = b;\n    rb->head = next;\n    rb_check_invariants(rb);\n    return 1u;\n}\n\nstatic uint8_t rb_get(ringbuf_t *rb, uint8_t *out) {\n    rb_check_invariants(rb);\n    if (rb->tail == rb->head) {\n        return 0u;\n    }\n    *out = rb->buf[rb->tail];\n    rb->tail = (uint8_t)((rb->tail + 1u) & RB_MASK);\n    return 1u;\n}\n\nint main(void) {\n    static ringbuf_t rb;\n    uint8_t b;\n\n    (void)rb_put(&rb, 0x41u);\n    (void)rb_get(&rb, &b);\n    printf("put/get round trip: 0x%02X\\n", (unsigned)b);\n\n    /* A deliberate corruption to show what an assert catches:\n     * (in real code this would be a wild pointer or an ISR race) */\n    /* rb.head = 200;  rb_check_invariants(&rb); -- would abort here */\n    printf("invariants held throughout\\n");\n    return 0;\n}',
        explanation: [
          'Every put/get brackets its work with the invariant check: both indices must be in range — if a wild write or a race ever corrupts them, the assert names the file and line at the moment of detection, not three operations later.',
          'Trace: put 0x41 succeeds (head 0→1), get returns 0x41 (tail 0→1). Both invariant checks pass.',
          'Exact output: `put/get round trip: 0x41` then `invariants held throughout`.',
          'The commented corruption line shows the catch: head = 200 violates head < 8 and the assert would abort with the location — turning "mysterious buffer weirdness" into an immediate, located failure.',
          'Deployment: compiled in for development; in release, mapped to the log-safe-state-reset path (deep dive) rather than deleted.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Bisection of conditions',
        content:
          '  32 candidate conditions\n        |\n        +-- logging OFF: still fails?      -> 16 left\n        +-- motor disconnected: fails?     -> 8 left\n        +-- short message only: fails?     -> 4 left\n        +-- lower supply 3.3->3.0 V: fails? -> 2 left\n        +-- slower tick: fails?            -> 1 left\n\n  every experiment changes exactly ONE variable;\n  every result is written down next to the question.',
        caption:
          'Each bisect halves the space; five questions isolate one condition. The discipline is single-variable experiments, recorded.',
      },
    ],
    tables: [
      {
        caption: 'Reproducibility ladder',
        headers: ['Rung', 'Quality', 'Verification possible'],
        rows: [
          ['Field-only', 'No repro', 'Statistical only (failure rate before/after)'],
          ['Field-simulated (input replay)', 'Same inputs on bench', 'Deterministic for those inputs'],
          ['Stress-reproduced (voltage/thermal/load)', 'Reliable trigger', 'Repeatable bench runs'],
          ['Always-reproducible (test case)', 'One command', 'Full regression test (lesson 3)'],
        ],
      },
      {
        caption: 'Assert vs error-code decision',
        headers: ['Condition', 'Mechanism', 'Why'],
        rows: [
          ['Internal invariant (never false if code is correct)', 'assert', 'Catches contract violations at the source'],
          ['Untrusted input from the wire', 'Return code', 'Expected to happen; must be handled, not crashed'],
          ['Resource exhaustion (queue full)', 'Return code + policy', 'A designed-for condition'],
          ['Corrupted system state', 'Assert → safe state → reset', 'Continuing is already unsafe'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Changing two variables per experiment.',
        fix:
          'One variable per experiment, result written down. Two changed variables produce four possible explanations — the opposite of isolation.',
      },
      {
        mistake: 'Using assert for untrusted input.',
        fix:
          'Input from the wire is *expected* to be wrong sometimes: validate with return codes. Asserts are for internal invariants that indicate bugs.',
      },
      {
        mistake: 'Declaring a fix verified because the bench happened to pass once.',
        fix:
          'Verification matches the reproducibility rung: an always-reproducible bug needs the regression test; a stress-only bug needs N hours of stress runs with the rate reported honestly.',
      },
    ],
    guidedPractice: {
      title: 'Run the method on paper',
      brief:
        'Defect: "the motor occasionally runs 2 s after the stop command". Write the five steps concretely: what you log first, three bisect experiments (one variable each), one falsifiable hypothesis, the verifying experiment, and the regression test.',
      expectedBehavior:
        'Logs: every motor command with timestamp + motor state transitions. Bisects: (1) with logging off — still late? (2) with PWM changes removed, stop only — still late? (3) with the watchdog interval changed — correlates? Hypothesis: "the stop is processed by the low-priority log task, delayed by burst writes". Verify: timestamp stop-command receipt vs motor-pin edge on the analyzer. Test: a unit test asserting the stop path runs within one tick (lesson 3 harness).',
      hints: [
        'Each bisect changes one thing and predicts the outcome in advance.',
        'The hypothesis names a mechanism — that is what makes it falsifiable.',
      ],
    },
    practiceExercises: [
      {
        title: 'Design the assert set',
        brief:
          'For a UART driver (module 07): list four legitimate asserts (internal invariants) and two conditions that must be return codes instead. Justify the split.',
        expectedBehavior:
          'Asserts: head/tail in range; the module was initialized; queue indices never cross (head-tail mod ≤ cap); the ISR enqueue never called from task context (if the API forbids it). Return codes: RX overrun (wire reality), timeout on TXE wait (link reality). The split: internal inconsistencies = bugs (assert); environment conditions = designed-for (codes).',
        hints: [
          'Invariants are things only a *bug* can violate.',
          'Wire and link conditions happen in normal operation.',
        ],
      },
      {
        title: 'Walk the ladder',
        brief:
          'A field unit logs "[E][wdt] missing bits 0x2" (module 16-l3) once a week. Propose how to walk this failure down the reproducibility ladder: what extra logging to add, what to replay, what to stress.',
        expectedBehavior:
          'Add: which task\'s bit was missing (per-task counters), the last N queue depths, and a soft-warn version that logs near-misses (bit late but present). Replay: record the unit\'s UART traffic and command sequence, replay on the bench. Stress: CPU load (max-rate logging), low supply, hot environment — the module 16-l1 starvation suspects first.',
        hints: [
          'The log already names the missing bit — instrument around that task.',
          'Each ladder step down speeds verification.',
        ],
      },
    ],
    assessment: {
      title: 'Fault isolation checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'The five fault-isolation steps, in order:',
          options: [
            'Reproduce, isolate, hypothesize, verify, fix+regression',
            'Guess, change code, test, repeat, ship',
            'Add logs, rewrite, pray, document',
            'Isolate, reproduce, fix, verify, hypothesize',
          ],
          answer: 'Reproduce, isolate, hypothesize, verify, fix+regression',
          explanation:
            'Reproduction first (everything else depends on it); a falsifiable hypothesis before any fix.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A good hypothesis is:',
          options: [
            'Falsifiable — an experiment could disprove it',
            'As broad as possible',
            'Written after the fix',
            'Always about hardware',
          ],
          answer: 'Falsifiable — an experiment could disprove it',
          explanation:
            'The verify step needs an outcome that can say "no"; unfalsifiable stories are unfalsifiable forever.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In release builds, assert checks should always be compiled out via NDEBUG with no replacement.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'A violated invariant means corrupted state: the embedded release path is log + safe state + reset, not silence.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Untrusted input from a UART frame should be handled with:',
          options: [
            'Return codes and validation',
            'assert(input_is_valid)',
            'No check; the peer is trusted',
            'A watchdog reset',
          ],
          answer: 'Return codes and validation',
          explanation:
            'Bad input is an expected condition, not a bug — asserts are for internal invariants.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'What closes the loop after a fix ships?',
          answer: 'a regression test derived from the reproducible case (plus the recorded defect report)',
          explanation:
            'The test keeps the exact bug dead forever; the report documents conditions for the next person.',
          hint: 'Lesson 3\'s harness exists for this.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Fault isolation', definition: 'The reproduce → isolate → hypothesize → verify → fix+regression method.' },
      { term: 'Assertion', definition: 'An executable internal invariant; failure indicates a bug, handled per the release policy.' },
      { term: 'Bisection', definition: 'Single-variable experiments that halve the condition space.' },
      { term: 'Regression test', definition: 'The test derived from a fixed bug\'s repro, run forever after.' },
      { term: 'Reproducibility ladder', definition: 'Field-only → replayed → stress → always-reproducible.' },
    ],
    revisionSummary: [
      'Method: reproduce, isolate, hypothesize, verify, fix+regression.',
      'One variable per experiment; results recorded.',
      'Asserts for invariants (release: log+safe+reset), codes for expected failures.',
      'Walk field bugs down the reproducibility ladder as far as possible.',
      'Verification honesty matches the reproducibility rung.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Debugging', url: 'https://en.wikipedia.org/wiki/Debugging', kind: 'article' },
      { label: 'Wikipedia — Assertion (software development)', url: 'https://en.wikipedia.org/wiki/Assertion_(software_development)', kind: 'article' },
      { label: 'Wikipedia — Heisenbug', url: 'https://en.wikipedia.org/wiki/Heisenbug', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m17-l3',
    title: 'Host-Based Unit Testing: Mocks Make Firmware Testable',
    summary:
      'Run your firmware logic on your PC: the mock-register strategy, a tiny test harness, and a worked test suite for the ring buffer — plus the honest split of what can and cannot be tested without a board.',
    objectives: [
      'Explain which firmware layers are host-testable and why (the layering payoff).',
      'Build a minimal CHECK-style test harness with failure counts.',
      'Write and trace a unit-test suite for the ring buffer, including wraparound.',
      'Classify tests: host unit tests, integration on board, and hardware-in-the-loop.',
    ],
    whyItMatters:
      'The layering discipline of module 13 and the mock registers of module 03 were built for this lesson: pure C logic — ring buffers, parsers, state machines, filters — runs on your PC in milliseconds, gets tested exhaustively, and never touches a board. Teams that do this ship fewer board-debugging weeks.',
    prerequisites: ['embc-m07-l3', 'embc-m13-l2', 'embc-m17-l2'],
    explanation:
      '### Why host testing works here, specifically\n\nA unit test needs the code under test to run with *controlled* inputs and *observable* outputs. The course\'s structure delivered exactly that: drivers speak to mock registers (module 03), services are pure C (ring buffers, filters), and the application logic is separated from I/O by the module boundaries (module 13-l2). On the host, the mock register is just a variable you set; the "ISR" is a function you call; the tick is a number you pass. Nothing about the *logic* knows it is being tested.\n\n### The minimal harness\n\nYou need almost nothing: a CHECK macro that evaluates a condition, prints file/line on failure, counts failures, and a summary line. Frameworks (Unity, CppUTest, CMock) add fixtures and mock expectations — worth adopting when the suite grows — but the pattern this lesson builds is the honest core: many small test functions, each arranging one condition, acting once, and asserting one or two outcomes, with names that read as specifications (`test_rb_full_rejects_8th_put`).\n\n### What is host-testable, honestly\n\n**Host:** all pure logic — ring buffers, parsers, protocol state machines, filters (fixed-point!), schedulers, timeout logic (with a mock tick), error ladders. **Board-only (integration):** register sequences against real peripherals, timing behaviour, electrical interactions, DMA/cache behaviour, debouncing physics. **Hardware-in-the-loop (HIL):** the board running real firmware driven by a host that injects inputs and checks outputs — the bridge for tests that need real timing but repeatable control. The planning rule: every logic bug found on a board is a host-test gap — the parser bug that took a board week should have been a 5-line hostile-corpus case (module 15-l2).',
    deepDive:
      '### Designing code for testability, honestly\n\nThe testable style is barely different from the good style this course already teaches: no hidden globals for state that tests must reset (pass state in), no direct register writes above the driver layer (module 13-l2), timing comes in as parameters (the `now` parameter of module 05-l3\'s scheduler — trivially mockable), and ISRs delegate to callable functions. Where code predates the discipline, the refactor is mechanical and lesson-tested: extract the logic, inject the dependencies, and the first test usually finds a latent bug immediately (the count of "it failed its first test" is a feature of the method, not a scandal).\n\n### What the mocks should fake — and what they must not claim\n\nA mock register fakes the *register semantics* this course defined: bits, widths, flag behavior. It cannot fake silicon timing, errata, or electrical behaviour — and it must not pretend to. That is why every mock in this course says "educational mock" and points at the vendor manual for the real thing: the host tests verify your *logic against your model* of the hardware; the board tests verify your *model against the hardware*. Both matter; neither substitutes for the other. The classic gap: code correct against the model but wrong on the chip (a flag that clears on read, a shadow register) — found by integration tests on the board, prevented by reading the manual twice.\n\n### The CI loop for firmware, honestly\n\nThe suite runs on every commit (host), the integration tests run on a bench board nightly or per-release, and HIL runs the hardware-dependent set when the farm exists. Failure discipline follows module 17-l2: a red build blocks merge; a flaky test is quarantined and fixed (flaky tests destroy the suite\'s value faster than any bug); coverage is a *map of untested risk*, not a target — the number that matters is which modules have hostile-corpus and wraparound tests, not a percentage. This is the same CI discipline as module 02-l3\'s warning-as-errors builds: the machine holds the line so reviews can spend attention on design.',
    examples: [
      {
        title: 'A tiny harness and the ring-buffer suite, fully traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n#include <string.h>\n\n/* ---- minimal harness ---- */\nstatic int tests_run = 0;\nstatic int tests_failed = 0;\n\n#define CHECK(cond) do { \\\n    if (!(cond)) { \\\n        printf("  FAIL: %s\\n", #cond); \\\n        tests_failed++; \\\n    } \\\n} while (0)\n\n#define RUN_TEST(fn) do { \\\n    tests_run++; \\\n    printf("%s:\\n", #fn); \\\n    fn(); \\\n} while (0)\n\n/* ---- code under test: the module 07-l3 ring buffer ---- */\n#define RB_SIZE 8u\n#define RB_MASK (RB_SIZE - 1u)\ntypedef struct {\n    uint8_t          buf[RB_SIZE];\n    volatile uint8_t head;\n    volatile uint8_t tail;\n} ringbuf_t;\n\nstatic uint8_t rb_put(ringbuf_t *rb, uint8_t b) {\n    uint8_t next = (uint8_t)((rb->head + 1u) & RB_MASK);\n    if (next == rb->tail) { return 0u; }\n    rb->buf[rb->head] = b;\n    rb->head = next;\n    return 1u;\n}\n\nstatic uint8_t rb_get(ringbuf_t *rb, uint8_t *out) {\n    if (rb->tail == rb->head) { return 0u; }\n    *out = rb->buf[rb->tail];\n    rb->tail = (uint8_t)((rb->tail + 1u) & RB_MASK);\n    return 1u;\n}\n\nstatic uint8_t rb_count(const ringbuf_t *rb) {\n    return (uint8_t)((rb->head - rb->tail) & RB_MASK);\n}\n\nstatic void rb_reset(ringbuf_t *rb) {\n    memset(rb, 0, sizeof(*rb));\n}\n\n/* ---- tests ---- */\nstatic void test_fifo_order(void) {\n    ringbuf_t rb; rb_reset(&rb);\n    uint8_t b;\n    CHECK(rb_put(&rb, 1u) == 1u);\n    CHECK(rb_put(&rb, 2u) == 1u);\n    CHECK(rb_put(&rb, 3u) == 1u);\n    CHECK(rb_get(&rb, &b) == 1u && b == 1u);\n    CHECK(rb_get(&rb, &b) == 1u && b == 2u);\n    CHECK(rb_get(&rb, &b) == 1u && b == 3u);\n    CHECK(rb_get(&rb, &b) == 0u);          /* empty now */\n}\n\nstatic void test_full_rejects(void) {\n    ringbuf_t rb; rb_reset(&rb);\n    uint32_t accepted = 0u;\n    for (uint8_t i = 0u; i < 9u; i++) {\n        accepted += rb_put(&rb, i);\n    }\n    CHECK(accepted == 7u);                 /* capacity = SIZE-1 */\n    CHECK(rb_count(&rb) == 7u);\n}\n\nstatic void test_wraparound(void) {\n    ringbuf_t rb; rb_reset(&rb);\n    uint8_t b;\n    for (uint8_t i = 0u; i < 7u; i++) { (void)rb_put(&rb, i); }\n    for (uint8_t i = 0u; i < 7u; i++) { (void)rb_get(&rb, &b); }\n    CHECK(rb_count(&rb) == 0u);\n    CHECK(rb_put(&rb, 0xAAu) == 1u);       /* indices wrapped to 7 */\n    CHECK(rb_get(&rb, &b) == 1u && b == 0xAAu);\n    CHECK(rb_count(&rb) == 0u);\n}\n\nstatic void test_count_across_wrap(void) {\n    ringbuf_t rb; rb_reset(&rb);\n    uint8_t b = 0u;\n    CHECK(rb_put(&rb, 1u) == 1u);\n    CHECK(rb_put(&rb, 2u) == 1u);\n    CHECK(rb_get(&rb, &b) == 1u && b == 1u);\n    CHECK(rb_count(&rb) == 1u);\n}\n\nint main(void) {\n    RUN_TEST(test_fifo_order);\n    RUN_TEST(test_full_rejects);\n    RUN_TEST(test_wraparound);\n    RUN_TEST(test_count_across_wrap);\n\n    printf("tests: %d, failed: %d -> %s\\n",\n           tests_run, tests_failed,\n           (tests_failed == 0) ? "ALL PASSED" : "SUITE FAILED");\n    return (tests_failed == 0) ? 0 : 1;\n}',
        explanation: [
          'The harness is two macros: CHECK counts failures with the condition as text; RUN_TEST names and counts each test. `return tests_failed == 0 ? 0 : 1` makes the executable CI-ready.',
          'test_fifo_order: three puts then three gets return 1,2,3 in order, then empty. All CHECKs pass — no FAIL lines print.',
          'test_full_rejects: 9 puts accept 7 (capacity 8−1) and count reports 7 — the reserved-slot rule verified.',
          'test_wraparound: fill 7, drain 7 (indices both land on 7), then one more put/get works — the wrap itself is the test.',
          'test_count_across_wrap: put 1,2 then get (returns 1) leaves count 1 — the modular difference arithmetic verified at a non-trivial state.',
          'Exact output: each test name line, no FAIL lines, then `tests: 4, failed: 0 -> ALL PASSED`.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'What runs where',
        content:
          '  HOST (PC, milliseconds)              BOARD (integration)\n  -------------------------            -------------------\n  ring buffers, parsers,               register sequences vs\n  state machines, filters              real peripherals\n  schedulers (mock tick),              timing behaviour\n  timeout logic (mock tick),           debounce physics\n  error ladders                        DMA/cache behaviour\n  hostile corpora                      electrical interactions\n\n  HIL (hardware-in-the-loop):\n    host drives board inputs, checks outputs - repeatable timing\n\n  RULE: every logic bug found on a board = a missing host test',
        caption:
          'The honest split. Host tests own the logic; board tests own the silicon; HIL bridges with repeatable control.',
      },
    ],
    tables: [
      {
        caption: 'Test pyramid for firmware',
        headers: ['Level', 'Runs on', 'Speed', 'Owns'],
        rows: [
          ['Unit', 'Host, every commit', 'Milliseconds', 'Logic: buffers, parsers, machines, filters'],
          ['Integration', 'Bench board, nightly/release', 'Seconds-minutes', 'Register sequences, timing, model-vs-silicon'],
          ['HIL', 'Board + host driver', 'Minutes', 'Repeatable end-to-end scenarios'],
          ['Field/soak', 'Real units', 'Days-weeks', 'Rates, thermal, drift — statistical'],
        ],
      },
      {
        caption: 'Host-testable vs board-only (from this course)',
        headers: ['Module topic', 'Host-testable part', 'Board-only part'],
        rows: [
          ['Ring buffer (m07)', 'All logic incl. wraparound', '—'],
          ['UART driver (m07)', 'Parse, timeout logic, line discipline', 'Baud errors, overrun physics'],
          ['Debounce (m04)', 'State machines on sample arrays', 'Real bounce waveforms'],
          ['Registers (m03)', 'Mask logic on mocks', 'Actual addresses, width rules, errata'],
          ['DMA (m14)', 'Ownership state machines', 'Coherency, alignment faults'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Testing logic only on the board because "that is where it runs".',
        fix:
          'Layered code with mocks runs everywhere the C compiler does. Board time is for silicon truth, not for discovering parser bugs a corpus test would catch in milliseconds.',
      },
      {
        mistake: 'Mocks that claim more than register semantics (fake timing, fake errata).',
        fix:
          'Mocks model what the manual documents; the board verifies the model. Say so in the mock\'s header comment — the honesty rule from module 01.',
      },
      {
        mistake: 'Keeping flaky tests green by re-running them.',
        fix:
          'A flaky test is quarantined the day it flakes and fixed or deleted. Re-running-until-green trains the team to ignore the suite — the fastest way to lose it.',
      },
    ],
    guidedPractice: {
      title: 'Write two more tests',
      brief:
        'Extend the suite: (a) test_empty_get_returns_zero — get on a fresh buffer; (b) test_interleaved — alternate put/get while checking counts. State the exact final harness line for a fully passing run of 6 tests.',
      expectedBehavior:
        '(a) Fresh buffer: rb_get returns 0 — CHECK passes. (b) put,put,get,put pattern with count checks after each step (2,1,2). Final line: `tests: 6, failed: 0 -> ALL PASSED`.',
      hints: [
        'Each test resets its own buffer (memset) — tests must not share state.',
        'Count checks go after every mutation.',
      ],
    },
    practiceExercises: [
      {
        title: 'Host-test the debouncer',
        brief:
          'Design the host test suite for the module 04-l3 consecutive-sample debouncer: list four test cases with their sample arrays and expected edge outputs.',
        expectedBehavior:
          'Cases: clean press (1,1,1 → edge at 3rd), bounce burst (1,0,1,0,1,1,1 → exactly one edge, last), release edges (1,1,1,0,0,0 → press then release), slow press (1,1,0,1,1,1 → one edge). All run on plain sample arrays — no hardware.',
        hints: [
          'The debouncer consumes a sample per call — arrays are the input.',
          'Edges are the observable; count them.',
        ],
      },
      {
        title: 'Find the boundary of the mock',
        brief:
          'Your UART driver passes all host tests but drops bytes on the board at high baud. Explain the split of causes (logic vs model vs silicon), what the host tests could not see, and the board-side check to run first.',
        expectedBehavior:
          'Logic bugs (parser/index errors) would likely show on host — so suspect model/silicon: the mock cannot represent real overrun timing (bytes arriving faster than the ISR drains, module 07-l2). Board check first: count overrun flags and drop counts while looping back at max rate; then compare drain latency (analyzer) against the one-byte time.',
        hints: [
          'Host tests verify logic against the model.',
          'Timing and electrical reality live only on the board.',
        ],
      },
    ],
    assessment: {
      title: 'Host testing checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which firmware layer is most host-testable?',
          options: [
            'Services and application logic (pure C, mocked boundaries)',
            'Vendor startup code',
            'Register access macros',
            'Clock configuration',
          ],
          answer: 'Services and application logic (pure C, mocked boundaries)',
          explanation:
            'Pure logic with controlled inputs runs anywhere; register and timing behaviour needs the board.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'The minimal test harness needs:',
          options: [
            'A CHECK macro with failure counting and a summary exit code',
            'A full RTOS simulator',
            'The real board attached',
            'Hardware breakpoints',
          ],
          answer: 'A CHECK macro with failure counting and a summary exit code',
          explanation:
            'That is the whole core; frameworks add fixtures and mocks when the suite grows.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A parser bug found during board debugging indicates a missing hostile-corpus host test.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'Per the rule: every logic bug found on a board is a host-test gap — parsers are fully host-testable.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does the suite print for test_full_rejects?',
          code: '/* 9 puts into an 8-slot reserved-slot ring buffer */\nCHECK(accepted == 7u);',
          options: ['accepted == 7 passes (no FAIL line)', 'accepted == 8 fails', 'accepted == 9 fails', 'Nothing prints'],
          answer: 'accepted == 7 passes (no FAIL line)',
          explanation:
            'Capacity is SIZE−1 = 7; the 8th and 9th puts are rejected — the reserved-slot rule verified by test.',
          hint: 'One slot is always reserved.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the three levels of the firmware test pyramid and what each owns.',
          answer: 'unit (host, logic), integration (board, registers/timing/model-vs-silicon), HIL (repeatable end-to-end scenarios); field/soak covers rates and drift statistically',
          explanation:
            'Each level owns a different truth; the host level is where logic bugs are cheapest to find.',
          hint: 'Host, board, board+driver.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Mock register', definition: 'A host-side variable standing in for hardware register semantics — the module 03 device made testable.' },
      { term: 'CHECK macro', definition: 'Minimal assertion with file/condition reporting and failure counting.' },
      { term: 'Unit test', definition: 'A fast, isolated host test of one behaviour, named as a specification.' },
      { term: 'Hardware-in-the-loop (HIL)', definition: 'Board running real firmware driven and observed by a host for repeatable scenarios.' },
      { term: 'Flaky test', definition: 'A test with nondeterministic results — quarantined and fixed, never re-run-until-green.' },
    ],
    revisionSummary: [
      'Layering + mocks = firmware logic on the host, in milliseconds.',
      'Harness: CHECK + counter + exit code; suites are specifications.',
      'Ring buffers, parsers, machines, filters: fully host-testable.',
      'Board tests verify the model against silicon; both truths matter.',
      'Every board-found logic bug is a missing host test.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Unit testing', url: 'https://en.wikipedia.org/wiki/Unit_testing', kind: 'article' },
      { label: 'Wikipedia — Hardware-in-the-loop simulation', url: 'https://en.wikipedia.org/wiki/Hardware-in-the-loop_simulation', kind: 'article' },
      { label: 'Wikipedia — Test-driven development (concept)', url: 'https://en.wikipedia.org/wiki/Test-driven_development', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
