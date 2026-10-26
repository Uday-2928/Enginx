import type { TutorialLesson } from '../types';

export const module16Lessons: TutorialLesson[] = [
  {
    id: 'embc-m16-l1',
    title: 'Why an RTOS: Tasks, Scheduling and Priorities',
    summary:
      'What a real-time operating system actually buys you over a superloop — tasks, preemption, priorities and states — taught generically with FreeRTOS as the reference API.',
    objectives: [
      'State what an RTOS adds over a bare-metal superloop, and what it costs.',
      'Define tasks, preemptive scheduling, priorities and the four task states.',
      'Trace a simple preemption timeline between a high-priority and a low-priority task.',
      'Distinguish rate-monotonic-style priority intuition (shorter period, higher priority).',
    ],
    whyItMatters:
      'The RTOS decision is architectural: it converts your hand-rolled scheduler into a kernel with guarantees — and converts your debugging into concurrency debugging. Knowing exactly what you gain and pay makes the choice an engineering decision instead of a fashion one.',
    prerequisites: ['embc-m05-l3', 'embc-m06-l3', 'embc-m13-l1'],
    explanation:
      'Everything the previous modules built — tick scheduler, flag queues, deferred work — is a *hand-made* mini-RTOS. A real-time operating system formalises it: a kernel that owns the CPU, schedules multiple **tasks** (independent threads with their own stacks), and switches between them **preemptively** — a higher-priority task becoming ready interrupts a lower one immediately, without the lower one cooperating.\n\n### What you gain\n\n- **Independent stacks and call trees**: each task is a normal-looking `while(1)` program; no global state machine for who-runs-when.\n- **Preemption with priorities**: a 100 µs sensor task is never late because a display refresh is mid-loop — the kernel switches.\n- **Blocking primitives**: `wait for queue item` sleeps the task at zero CPU cost — the kernel wakes it exactly when data arrives.\n- **A standard toolbox**: queues, semaphores, mutexes, timers — the patterns of modules 06/07 as tested kernel code.\n\n### What you pay\n\nRAM (each task\'s stack is real SRAM — module 15\'s budget grows), flash (the kernel), context-switch time (microseconds), and — the big one — **a new class of bugs**: races, deadlocks and priority problems that only appear under real timing. The superloop\'s comforting property (only one thing runs at a time, in a known order) is traded for responsiveness. Small systems with a handful of periodic jobs frequently do not need the trade; systems with genuinely independent, latency-sensitive activities usually do.\n\n### Tasks and states\n\nEach task has a priority (typically 0 = lowest, up to a config maximum) and cycles through four states: **Running** (on the CPU), **Ready** (could run, waiting for the CPU), **Blocked** (waiting for an event — delay, queue, semaphore; consumes zero CPU), and **Suspended** (parked explicitly). The scheduler always runs the highest-priority Ready task. Two tasks of equal priority either time-slice or run to block, per configuration. Priority assignment has a classic heuristic: shorter period → higher priority (rate-monotonic intuition), with the caveat that long-running CPU hogs need lowering or slicing regardless of their period.\n\n**Honesty note for this course:** the platform you are on does not run an RTOS — every example here is conceptual pseudocode. API names follow FreeRTOS (the open-source reference implementation, and the de-facto standard on small MCUs) purely for concreteness: `xTaskCreate`, `vTaskDelay`, `xQueueSend` are *that* project\'s names; Zephyr, Azure RTOS and vendor kernels name the same concepts differently. The concepts — task, priority, block, queue — are the portable payload.',
    deepDive:
      '### The preemption timeline, quantitatively\n\nConsider: sensor task (priority 3, needs 2 ms every 10 ms), logger task (priority 1, needs 8 ms every 10 ms). On a bare-metal scheduler (module 05-l3) both are slices of one loop — the logger\'s 8 ms chunk delays everything behind it in that iteration. Preemptively: logger starts at t=0; at t=1 the sensor\'s period fires → the kernel switches to sensor (context switch ~µs), sensor runs 2 ms and blocks on its next delay at t=3; the logger resumes exactly where it was and finishes at t=9. The sensor\'s *latency* was ~0 regardless of what the logger was doing — the guarantee the superloop cannot make without restructuring. The cost side: two stacks (worst case each, module 15-l1), switch overhead, and the logger\'s completion is now jittery by ±2 ms — preemption moves latency around, it does not create CPU.\n\n### Choosing priorities without folklore\n\nPriorities encode deadlines, not importance feelings. Rate-monotonic starting point: the 1 ms task outranks the 10 ms task outranks the 100 ms task. Then adjust for three realities: (1) CPU-bound tasks get low priorities or they starve everything (a task that never blocks is an infinite-priority bug); (2) I/O-triggered work often outranks periodic work with the same period (event latency matters more); (3) priority *bands* beat fine-grained levels — most systems work cleanly with 3-5 bands (ISR-deferred, control, I/O, housekeeping). If you cannot explain why task A outranks task B in one sentence, the priority is wrong. And the classic review finding: more than one task at the same priority doing different jobs — either their periods are the same by design (fine, time-sliced) or a priority is missing.\n\n### Kernel services replace your glue, honestly\n\nMapping from this course\'s bare-metal patterns: the module 05-l3 tick scheduler → tasks with `vTaskDelay` (per-task phase comes free); the module 06-l3 flag/queue deferred work → queues and task notifications; the module 07-l3 ring buffer between ISR and consumer → a queue (or the ring buffer *inside* one task when byte-rate is high — queues copy, and copying every byte at 1 Mbps is overhead worth knowing about); the module 13-l3 health gate → per-task health flags fed to the same watchdog. Nothing is conceptually new — it is the same architecture with the bookkeeping delegated to a kernel that (unlike our hand-rolled versions) has been field-tested for decades. FreeRTOS\'s documentation describes each service with its exact semantics (blocking timeouts, ISR-safe variants); reading it after this course is straightforward.',
    examples: [
      {
        title: 'Two tasks with a preemption timeline (conceptual pseudocode)',
        language: 'c',
        code:
          '/* FreeRTOS-style pseudocode - the platform does NOT run an RTOS.\n * This is the shape of the code, for reading, not running. */\n\n/* High priority: 2 ms of work every 10 ms. */\nvoid sensor_task(void *arg) {\n    (void)arg;\n    for (;;) {\n        sample = read_sensor_mock();          /* 2 ms of work        */\n        xQueueSend(sample_queue, &sample, 0); /* never blocks here   */\n        vTaskDelay(10);                       /* block until next period */\n    }\n}\n\n/* Low priority: 8 ms of work every 10 ms. */\nvoid logger_task(void *arg) {\n    (void)arg;\n    for (;;) {\n        write_log_chunk_mock();               /* 8 ms of work        */\n        vTaskDelay(10);\n    }\n}\n\n/* main: create both tasks, start the scheduler. */\nvoid main(void) {\n    sample_queue = xQueueCreate(8, sizeof(uint16_t));\n    xTaskCreate(logger_task, "log",  256, NULL, 1, NULL); /* prio 1 */\n    xTaskCreate(sensor_task, "sens", 256, NULL, 3, NULL); /* prio 3 */\n    vTaskStartScheduler();   /* never returns */\n}\n\n/* TIMELINE (ms), both tasks released at t=0:\n *  t0-2   sensor runs first (prio 3, highest ready), blocks to t10\n *  t2-9   logger runs its 8 ms, blocks\n *  t10    sensor ready again: preempts instantly if logger overran\n *  ...    pattern repeats\n *  sensor latency: ~0 every period, regardless of logger progress. */\n',
        explanation: [
          'Both tasks are plain infinite loops — no state machine deciding who runs; the kernel owns that.',
          'The timeline (correcting the inline comment honestly): at t=0 the scheduler starts the *highest-priority ready* task, so sensor runs t0-2, then logger t2-9 (8 ms), then both block until t=10.',
          'The guarantee: even if the logger overran its slot, the sensor preempts it at t=10 within microseconds — the superloop cannot promise this.',
          'Costs visible in the code: two 256-word stacks (module 15-l1 budget), a queue allocation, and a kernel in flash.',
          'The API names are FreeRTOS\'s; the concepts (create, priority, delay-block, queue) are universal across RTOSes.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Task state transitions',
        content:
          '             +-----------+   preempted or timeslice   +-----------+\n             |  RUNNING  | -------------------------> |  READY    |\n             | (on CPU)  | <------------------------- | (can run, |\n             +-----+-----+   scheduler picks it        |  no CPU)  |\n                   |                                   +-----------+\n                   | waits for event                      ^\n                   v (delay, queue, semaphore)            | event arrives\n             +-----------+                                |\n             |  BLOCKED  | --------------------------------+\n             | (0% CPU)  |\n             +-----------+\n\n  scheduler rule: always run the highest-priority READY task',
        caption:
          'The four states and the only rule that matters. Blocked tasks cost zero CPU — blocking is how RTOS tasks wait properly.',
      },
    ],
    tables: [
      {
        caption: 'Superloop vs RTOS, honestly',
        headers: ['Aspect', 'Bare-metal superloop', 'RTOS'],
        rows: [
          ['Scheduling', 'Your tick scheduler (m05-l3)', 'Kernel, preemptive by priority'],
          ['Latency guarantee', 'Worst-case loop iteration', 'Preemption within microseconds'],
          ['Waiting', 'Flags + timestamps', 'Blocking calls (zero-CPU waits)'],
          ['RAM cost', 'One stack', 'One stack per task + kernel objects'],
          ['Bug classes', 'Shared-data races (m06)', 'Races, deadlocks, priority inversion'],
          ['Fit', 'Few periodic jobs, tight RAM', 'Independent latency-sensitive activities'],
        ],
      },
      {
        caption: 'Task states',
        headers: ['State', 'Meaning', 'CPU cost'],
        rows: [
          ['Running', 'Currently executing', 'All of it'],
          ['Ready', 'Runnable, waiting for CPU', 'Zero'],
          ['Blocked', 'Waiting on event (delay/queue/semaphore)', 'Zero'],
          ['Suspended', 'Explicitly parked', 'Zero until resumed'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assigning priorities by importance-of-feature instead of by deadline.',
        fix:
          'Rate-monotonic intuition: shorter period, higher priority; then adjust for CPU hogs (low priority) and event latency. Every priority needs a one-sentence justification.',
      },
      {
        mistake: 'A task that never blocks at high priority.',
        fix:
          'It starves everything below it forever (and the watchdog sees the rest as hung). Long work gets its own lower priority, or is sliced with vTaskDelay yields.',
      },
      {
        mistake: 'Believing the RTOS removes the module 06 shared-data rules.',
        fix:
          'Tasks race exactly like ISRs did — volatile, atomicity and critical sections all still apply, now with kernel primitives (mutexes, queues) as the tools.',
      },
    ],
    guidedPractice: {
      title: 'Assign priorities to a task set',
      brief:
        'Tasks: motor current loop (500 µs period, 100 µs work), temperature monitor (1 s), UART command parser (event-driven), status LED (2 s), logging writer (bursts of 5 ms, can be late). Assign priorities with one-line justifications and identify the CPU hog risk.',
      expectedBehavior:
        'Current loop highest (shortest period, hard deadline). Command parser next (event latency). Logging writer low (tolerates lateness). Temperature monitor and LED lowest band, periodic. Hog risk: the logging writer\'s 5 ms bursts — if placed above the temperature/LED tasks they delay them by 5 ms; acceptable if those tolerate it, otherwise slice it.',
      hints: [
        'Sort by period first, then adjust for event latency and tolerance.',
        'Anything that can wait 100 ms belongs at the bottom.',
      ],
    },
    practiceExercises: [
      {
        title: 'Draw the timeline',
        brief:
          'For sensor (prio 3, 2 ms work per 10 ms) and logger (prio 1, 8 ms per 10 ms) as in the example: suppose the logger\'s work grows to 11 ms. What happens at t=10, and what is the sensor\'s worst latency?',
        expectedBehavior:
          'The logger (started t=2) would finish at t=13 — the sensor becomes ready at t=10 and preempts it immediately, runs 2 ms (t10-12), the logger resumes t12-13. Sensor worst latency ≈ context-switch time (µs) — the preemption guarantee doing its job.',
        hints: [
          'Preemption happens at the release instant, not at a loop boundary.',
          'Latency = switch time, not the overrun duration.',
        ],
      },
      {
        title: 'Cost audit for a tiny part',
        brief:
          'A 2 KB / 32 KB-flash part proposes four tasks with 128-word stacks each. Estimate the RAM cost and state the verdict versus the module 15-l1 budget method.',
        expectedBehavior:
          '4 × 512 B = 2048 B of task stacks alone = 100% of a 2 KB part before kernel objects and globals. Verdict: an RTOS does not fit this budget — the bare-metal scheduler stands; this is exactly the arithmetic the RAM budget exists to force.',
        hints: [
          'Stacks are per-task (module 15-l1).',
          'Compare against the whole budget, not just the stacks.',
        ],
      },
    ],
    assessment: {
      title: 'RTOS basics checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'The scheduler\'s one rule is:',
          options: [
            'Always run the highest-priority Ready task',
            'Run tasks round-robin always',
            'Run the oldest task first',
            'Run whatever was created first',
          ],
          answer: 'Always run the highest-priority Ready task',
          explanation:
            'Preemptive priority scheduling in one sentence; blocked tasks are not ready and cost zero CPU.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A task waiting on vTaskDelay is in which state, and its CPU cost is:',
          options: ['Blocked; zero', 'Ready; zero', 'Running; full', 'Suspended; full'],
          answer: 'Blocked; zero',
          explanation:
            'Blocking waits (delay, queue, semaphore) park the task at zero CPU until the event.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'An RTOS eliminates the need for volatile and critical sections on shared data.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'Tasks race exactly like ISRs did; the kernel provides primitives (mutexes, queues) — the sharing rules still apply.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Rate-monotonic intuition assigns higher priority to tasks with:',
          options: [
            'Shorter periods',
            'Longer periods',
            'Smaller stack sizes',
            'Later creation',
          ],
          answer: 'Shorter periods',
          explanation:
            'Shorter period ≈ tighter deadline ≈ higher priority, adjusted for CPU hogs and event latency.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the two biggest costs an RTOS adds over a superloop.',
          answer: 'per-task stacks (RAM) and a new class of concurrency bugs (races, deadlocks, priority inversion); kernel flash too',
          explanation:
            'RAM grows per task, and concurrency bugs appear that bare metal\'s single-context ordering avoided.',
          hint: 'One is memory, one is a bug class.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Task', definition: 'An independent thread with its own stack and priority; a plain while(1) program to its author.' },
      { term: 'Preemptive scheduling', definition: 'The kernel switching to a higher-priority Ready task immediately, mid-execution of a lower one.' },
      { term: 'Task states', definition: 'Running / Ready / Blocked / Suspended; blocked tasks cost zero CPU.' },
      { term: 'Context switch', definition: 'Saving one task\'s registers and restoring another\'s — microseconds of overhead per switch.' },
      { term: 'FreeRTOS', definition: 'The open-source reference RTOS used for API names in this course; concepts are portable across kernels.' },
    ],
    revisionSummary: [
      'RTOS = preemptive priority scheduler + blocking primitives + per-task stacks.',
      'Gain: latency guarantees. Pay: RAM, kernel, concurrency bugs.',
      'Blocked tasks are free; a never-blocking high-priority task is a bug.',
      'Priorities encode deadlines (shorter period → higher), not feature importance.',
      'The module 06 sharing rules survive intact — the tools just change.',
    ],
    furtherReading: [
      { label: 'FreeRTOS — RTOS fundamentals and API reference', url: 'https://www.freertos.org/', kind: 'docs' },
      { label: 'Wikipedia — Real-time operating system', url: 'https://en.wikipedia.org/wiki/Real-time_operating_system', kind: 'article' },
      { label: 'Wikipedia — Rate-monotonic scheduling', url: 'https://en.wikipedia.org/wiki/Rate-monotonic_scheduling', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m16-l2',
    title: 'Queues, Semaphores and Mutexes (and Priority Inversion)',
    summary:
      'The kernel\'s three communication tools — queues for data, semaphores for events, mutexes for ownership — plus the priority-inversion story and the from-ISR calling rules.',
    objectives: [
      'Choose correctly between queue, semaphore and mutex for a given interaction.',
      'Explain priority inversion, and how priority inheritance fixes it.',
      'Use the from-ISR API variants and understand why they exist.',
      'Design the ISR-to-task handoff with a binary semaphore or direct task notification.',
    ],
    whyItMatters:
      'These three primitives are 95% of inter-task coordination. Picking the wrong one — a mutex where a semaphore belongs, a queue where a flag suffices — produces deadlocks and priority bugs that are miserable to diagnose; picking them right makes the concurrency almost boring.',
    prerequisites: ['embc-m16-l1', 'embc-m06-l2'],
    explanation:
      'The kernel offers three tools with distinct contracts:\n\n### Queue: data with ownership transfer\n\nA queue copies fixed-size items, thread-safely, with blocking on both ends: senders can wait when full, receivers when empty. It is the module 06-l3 ring buffer as a kernel object — with the kernel doing the index protection. Use it whenever *data* crosses between contexts (samples, commands, events with payloads). Note the cost: each send copies the item — byte streams at high rates often stay in a hand-rolled ring buffer (module 07-l3) guarded by lighter primitives.\n\n### Binary semaphore: an event flag that can block\n\nA semaphore is a take/give counter. A **binary** semaphore (0 or 1) is the "event happened" flag: the ISR gives it, the task takes it and does the work — module 06-l3\'s deferred processing, kernel-style. The difference from a boolean flag: the take can *block* with a timeout, so the task sleeps at zero CPU until the event, and the kernel wakes it exactly then.\n\n### Mutex: ownership-protected resource\n\nA **mutex** is a lock with ownership: only the task that locked it may unlock it, and while held it can carry **priority inheritance** (below). Use it to serialize access to a *resource* — a shared peripheral, a table, a state struct. The contrast that prevents every misuse: **semaphores signal events; mutexes guard resources**. Using a semaphore as a lock breaks the ownership rule (anyone can give it); using a mutex as a signal breaks its task-only API (ISRs cannot take/give mutexes).\n\n### Priority inversion, and the fix\n\nThree tasks: L (low) holds a mutex on the shared resource; H (high) becomes ready and blocks on that mutex; meanwhile M (middle, unrelated to the mutex) is ready — and preempts L *because L\'s priority is lower*. M keeps running while H waits on L, which cannot run to release the lock: the high-priority task is delayed by an unrelated middle one — **priority inversion**. The famous real-world case hit the Mars Pathfinder mission in 1997 (diagnosed remotely by enabling priority inheritance and watchdog logs — a good engineering-story read). The standard fix: **priority inheritance** — while H blocks on the mutex, L temporarily inherits H\'s priority, so M cannot preempt it; L finishes its critical section fast, releases, and drops back. FreeRTOS mutexes do this when the feature is enabled; plain semaphores do not and cannot (no owner).',
    deepDive:
      '### The from-ISR rule, honestly\n\nKernel APIs come in task and ISR variants (`xQueueSend` vs `xQueueSendFromISR`, `xSemaphoreGive` vs `xSemaphoreGiveFromISR`). The reason is concrete: an ISR must not block (module 06-l1), so from-ISR variants never block, and they report — via a "higher priority task woken" flag — whether the give made a higher-priority task ready, so the ISR can request an immediate context switch on exit. Calling the task API from an ISR is undefined behaviour on most kernels; the linter for this mistake is a review rule plus naming discipline (ISRs live at the BSP seam, module 13-l2, where the FromISR suffix is visible). Task **notifications** (FreeRTOS) go further: a lightweight direct-to-task signal that outperforms semaphores for single-wake-up patterns — the modern default for ISR→task.\n\n### Deadlocks: the two-lock trap\n\nTwo tasks, two mutexes, taken in opposite orders: A holds lock 1 and waits for lock 2; B holds lock 2 and waits for lock 1 — both blocked forever. The prevention is boring and absolute: a global lock **ordering** (every code path takes locks in the same documented order), and never holding one lock while blocking on anything slow (I/O, queues with long waits). Some kernels offer timeouts on take (take with 10 ms, recover on failure) — a detection tool, not a design. The review heuristic: draw the lock-order graph once per module; a cycle in the drawing is a deadlock in the field. Related and equally boring: recursive locking (a function that locks calls another that locks the same mutex) — either use recursive mutexes knowingly or restructure so the lock is taken once at the top.\n\n### Choosing the primitive, worked through the course\'s patterns\n\nEach bare-metal pattern from earlier modules maps cleanly: sensor sample ISR → processing task = binary semaphore or task notification (event, no payload) or a queue (payload); UART byte stream → parser = ring buffer (rate) + semaphore (wakeup) or queue-of-chunks; shared config table read/written by three tasks = mutex (resource) with short critical sections; "shutdown requested" broadcast = event group bits or a flag under mutex — never a binary semaphore (a signal is consumed once; a state must be readable many times). The selection is mechanical once the *thing being communicated* is named: data → queue; moment → semaphore/notification; resource → mutex; durable state → flag/event-group. Misassignment is where the bugs live — write the thing-first, then the primitive.',
    examples: [
      {
        title: 'ISR-to-task handoff with a binary semaphore (conceptual pseudocode)',
        language: 'c',
        code:
          '/* FreeRTOS-style pseudocode - conceptual; the platform does not run an RTOS. */\nstatic QueueHandle_t sample_queue;\nstatic SemaphoreHandle_t sample_ready;\n\nvoid uart_rx_isr(void) {\n    uint16_t sample = read_dr_mock();\n    BaseType_t woken = pdFALSE;\n\n    /* FromISR variant: never blocks; reports a woken higher-prio task. */\n    xQueueSendFromISR(sample_queue, &sample, &woken);\n    xSemaphoreGiveFromISR(sample_ready, &woken);\n\n    portYIELD_FROM_ISR(woken);   /* switch now if a higher task is ready */\n}\n\nvoid processor_task(void *arg) {\n    (void)arg;\n    uint16_t sample;\n    for (;;) {\n        /* Block here (0% CPU) until the ISR signals: */\n        if (xSemaphoreTake(sample_ready, portMAX_DELAY) == pdTRUE) {\n            while (xQueueReceive(sample_queue, &sample, 0) == pdTRUE) {\n                process_mock(sample);   /* drain everything queued */\n            }\n        }\n    }\n}\n\nvoid main_mock(void) {\n    sample_queue  = xQueueCreate(16, sizeof(uint16_t));\n    sample_ready  = xSemaphoreCreateBinary();\n    xTaskCreate(processor_task, "proc", 256, NULL, 2, NULL);\n    vTaskStartScheduler();\n}\n',
        explanation: [
          'The ISR does two things: queue the datum (payload) and give the semaphore (moment). Both FromISR variants, both non-blocking.',
          'The task blocks on the semaphore — zero CPU while idle — then drains the queue completely before sleeping again. Bursts of samples cost one wakeup.',
          'portYIELD_FROM_ISR applies the "woken" flag: if the give readied a higher-priority task, the switch happens at ISR exit instead of at the next tick.',
          'Why not a queue with a long block alone? It works — the semaphore-plus-drain shape merely decouples "an event happened" from "the data", which scales better when multiple producers exist. Both are correct; the trade is wake-up granularity.',
          'This is module 06-l3\'s flag-snapshot pattern, with the kernel providing the blocking and the atomicity.',
        ],
      },
      {
        title: 'Priority inversion and inheritance, traced on a timeline',
        language: 'c',
        code:
          '/* Conceptual timeline - three tasks and one shared-resource mutex.\n * Priorities: H=3 (control), M=2 (logging), L=1 (config writer).\n * WITHOUT inheritance:\n *  t0  L locks cfg_mutex, begins 3 ms of writes\n *  t1  H becomes ready, takes cfg_mutex -> BLOCKS (L owns it)\n *  t1  M becomes ready -> RUNS (prio 2 > L\'s 1) for 5 ms\n *  t6  M blocks/done -> L resumes, finishes write, releases at t7\n *  t7  H finally runs. H\'s latency: 6 ms, caused by M - inversion.\n *\n * WITH priority inheritance:\n *  t1  H blocks on the mutex -> L inherits prio 3\n *  t1  M ready but CANNOT preempt L (equal effective priority)\n *  t4  L finishes (1 ms of remaining work at boosted priority),\n *      releases, drops back to prio 1 -> H runs immediately\n *  H\'s latency: 3 ms - bounded by L\'s critical section only.\n *\n * Rule: keep mutex critical sections SHORT; inheritance bounds\n * H\'s wait by the critical section, not by L\'s whole job. */\nstatic void config_write_short(cfg_key_t k, uint32_t v) {\n    /* conceptual: */\n    /* xSemaphoreTake(cfg_mutex, portMAX_DELAY); */\n    cfg_table[k] = v;                     /* ONLY the short section */\n    /* xSemaphoreGive(cfg_mutex); */\n}\n',
        explanation: [
          'The timeline shows the mechanism precisely: without inheritance, H waits 6 ms for a 3 ms critical section — delayed by M, which does not even use the mutex.',
          'With inheritance, L runs at H\'s priority while H waits, so M cannot cut in; H\'s wait is bounded by the critical section itself.',
          'The practical corollary in the code: the critical section contains only the table write (short); I/O and computation stay outside the lock — inheritance bounds H\'s wait by what L holds, so hold as little as possible.',
          'FreeRTOS enables inheritance on mutexes (not on semaphores — no owner). Zephyr and most kernels offer the same under different names.',
          'The Mars Pathfinder incident (1997) is the canonical field case: resets under load, diagnosed as inversion, fixed by enabling inheritance remotely.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Priority inversion with and without inheritance',
        content:
          ' WITHOUT inheritance:                WITH inheritance:\n\n prio 3  H  ....----[BLOCKED------]--[H runs]      H  ....----[BLOCK][-][H]\n prio 2  M          [---M runs 5ms---]             M          [---wait---]\n prio 1  L  [LL]      (resumes t6) [L]              L  [LL==boosted==]\n            ^lock     ^M preempts L!                  ^lock  ^inherits prio 3\n\n H waits 6 ms for a 3 ms section      H waits 3 ms - the section only\n (unrelated M caused the delay)       (M cannot preempt boosted L)',
        caption:
          'Educational timeline (illustrative). Inheritance makes the high task\'s wait bounded by the critical section, not by unrelated middle tasks.',
      },
    ],
    tables: [
      {
        caption: 'Primitive selection guide',
        headers: ['You are communicating...', 'Use', 'Why'],
        rows: [
          ['Data (samples, commands, events with payload)', 'Queue', 'Thread-safe copy with blocking both ends'],
          ['A moment ("data ready", "frame done")', 'Binary semaphore / task notification', 'Wakes a waiter; no payload'],
          ['Exclusive access to a resource', 'Mutex (priority inheritance)', 'Ownership + bounded inversion'],
          ['Durable shared state readable many times', 'Flag/event-group under mutex or atomic', 'Signals are consumed once; state persists'],
          ['Counting resources (N buffers free)', 'Counting semaphore', 'Take/give matches acquire/release'],
        ],
      },
      {
        caption: 'Task-API vs FromISR API',
        headers: ['Context', 'Allowed calls', 'Why'],
        rows: [
          ['Task context', 'Task APIs (may block)', 'Blocking is the point'],
          ['ISR context', 'FromISR APIs only (never block)', 'ISRs must not block; woken-flag drives the switch'],
          ['Mutex in ISR', 'Never', 'Mutexes have task ownership by definition'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using a mutex as a signal or a semaphore as a lock.',
        fix:
          'Mutexes guard resources (ownership, inheritance, task-only); semaphores signal moments. Swapping them produces deadlocks (nobody "releases" a signal) or unbounded inversion (no inheritance on semaphores).',
      },
      {
        mistake: 'Calling task-API functions from an ISR.',
        fix:
          'Undefined behaviour on most kernels. ISRs use only FromISR variants and live at the BSP seam where the naming discipline is visible.',
      },
      {
        mistake: 'Long critical sections under a mutex (I/O inside the lock).',
        fix:
          'Priority inheritance bounds waiters by the critical section\'s length — compute and copy inside, do I/O outside. Every millisecond held is a millisecond added to the highest waiter\'s latency.',
      },
    ],
    guidedPractice: {
      title: 'Choose the primitive for five interactions',
      brief:
        'Pick queue / binary semaphore / mutex / event-group for: (a) ADC ISR delivering 16-bit samples to a filter task; (b) three tasks updating a shared settings table; (c) a "boot complete" state several tasks check; (d) a DMA completion waking one processing task; (e) command frames from UART to a parser.',
      expectedBehavior:
        '(a) Queue (payload). (b) Mutex around short table updates. (c) Event-group bit or flag under mutex (durable state). (d) Task notification or binary semaphore (single wake-up). (e) Queue of frames (payload + ownership transfer) or ring buffer + semaphore at high rates.',
      hints: [
        'Name the thing first: data, moment, resource, or state.',
        'Durable state is the one signals cannot carry.',
      ],
    },
    practiceExercises: [
      {
        title: 'Spot the deadlock',
        brief:
          'Task A: take(net_mutex) then take(log_mutex). Task B: take(log_mutex) then take(net_mutex). Both also block sending on a queue while holding a lock. Identify the two hazards and the fixes.',
        expectedBehavior:
          'Hazards: (1) opposite lock order → classic ABBA deadlock; (2) blocking (queue send) while holding locks → unbounded critical sections. Fixes: one global lock order (both take net then log), and never block on queues while holding a mutex — copy the data out, release, then send.',
        hints: [
          'Draw the lock-order graph; a cycle is a deadlock.',
          'Hold time should be computation only.',
        ],
      },
      {
        title: 'Bounded by the section',
        brief:
          'L holds a mutex and its critical section is 200 µs; its total job is 8 ms. H blocks on the mutex. What is H\'s worst wait WITH inheritance? WITHOUT inheritance, what else determines the wait?',
        expectedBehavior:
          'With inheritance: ≈ 200 µs + switch overhead — bounded by the section. Without: unbounded by the section — it depends on whether a middle-priority task preempts L and for how long (up to L\'s whole 8 ms plus M\'s schedule); that openness is the hazard.',
        hints: [
          'Inheritance promotes L only while H waits.',
          'Without inheritance, M\'s behaviour is the wildcard.',
        ],
      },
    ],
    assessment: {
      title: 'Kernel primitives checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which primitive guards a shared resource with ownership and priority inheritance?',
          options: ['Mutex', 'Binary semaphore', 'Queue', 'Event group'],
          answer: 'Mutex',
          explanation:
            'Mutexes have owners and (when enabled) inheritance; semaphores signal, queues carry data.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'An ISR must use:',
          options: [
            'FromISR API variants that never block',
            'Task APIs with short timeouts',
            'Mutexes taken quickly',
            'No kernel calls at all',
          ],
          answer: 'FromISR API variants that never block',
          explanation:
            'ISRs cannot block; the FromISR variants also report woken higher-priority tasks for the exit switch.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Priority inversion means a high-priority task is delayed by a middle-priority task through a low-priority lock holder.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'M preempts L while H waits on L\'s mutex — inheritance promotes L so M cannot cut in.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Several tasks need to observe a persistent "system armed" state. The right tool is:',
          options: [
            'An event-group bit or a flag under mutex (durable state)',
            'A binary semaphore',
            'A one-shot queue send',
            'A task notification',
          ],
          answer: 'An event-group bit or a flag under mutex (durable state)',
          explanation:
            'Signals and notifications are consumed once; durable state must remain readable by every observer.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'State the one-sentence rule for mutex critical sections that keeps priority inheritance effective.',
          answer: 'keep critical sections short — hold the lock only around the shared-resource access, never around I/O or long computation',
          explanation:
            'Inheritance bounds a high waiter by the section length; every held millisecond is added to the highest-priority waiter\'s latency.',
          hint: 'What does the high task actually wait for?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Queue', definition: 'Kernel FIFO of copied items with blocking send/receive — data with ownership transfer.' },
      { term: 'Binary semaphore', definition: 'Take/give event flag that can block; given from ISRs, taken by tasks.' },
      { term: 'Mutex', definition: 'Owned lock for resource serialization, with priority inheritance where supported.' },
      { term: 'Priority inversion', definition: 'High task delayed by middle task via a low task\'s lock holder — fixed by inheritance.' },
      { term: 'Task notification', definition: 'A lightweight direct-to-task signal; the efficient modern ISR wake-up.' },
      { term: 'FromISR variants', definition: 'Non-blocking kernel API forms legal only in interrupt context.' },
    ],
    revisionSummary: [
      'Data → queue; moment → semaphore/notification; resource → mutex; durable state → flag/event-group.',
      'ISRs use FromISR APIs only; they never block.',
      'Inheritance bounds H\'s wait by L\'s critical section — keep sections short.',
      'Deadlock prevention: one lock order; no blocking while holding.',
      'The module 06 rules survive — the kernel just industrialises the tools.',
    ],
    furtherReading: [
      { label: 'FreeRTOS — queues, semaphores and mutexes documentation', url: 'https://www.freertos.org/', kind: 'docs' },
      { label: 'Wikipedia — Priority inversion', url: 'https://en.wikipedia.org/wiki/Priority_inversion', kind: 'article' },
      { label: 'Wikipedia — Deadlock', url: 'https://en.wikipedia.org/wiki/Deadlock', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m16-l3',
    title: 'Designing with an RTOS: Timers, Events, Watchdogs and When Not To',
    summary:
      'Software timers, event groups, per-task watchdog integration and deadlock avoidance — plus the honest decision criteria for staying bare-metal.',
    objectives: [
      'Use software timers and event groups appropriately.',
      'Integrate the module 13-l3 watchdog with per-task health reporting.',
      'Prevent deadlocks and starvation by design, not by debugging.',
      'Decide honestly between bare-metal and RTOS for a given system.',
    ],
    whyItMatters:
      'The RTOS decision and its failure modes are design-time choices. Teams that skip this lesson debug deadlocks at 2 a.m.; teams that apply it ship. And a large fraction of products are simply better bare-metal — knowing which is worth as much as knowing the APIs.',
    prerequisites: ['embc-m16-l2', 'embc-m13-l3'],
    explanation:
      '### Software timers and event groups\n\n**Software timers** are kernel-managed callbacks that fire after a delay or periodically, executed in a dedicated timer task\'s context — *not* in yours. The contract: timer callbacks must be short and non-blocking (they run in someone else\'s task; blocking there delays every other timer). They replace module 05-l3\'s software-timer table when the count of timers grows or phases must be independent. **Event groups** are sets of named bits a task can wait on in combination ("wait until bits A AND B set") — the multi-producer rendezvous: "configuration loaded AND network up AND calibration done → start". Queues carry sequences; event groups carry *conditions*.\n\n### Watchdogs in an RTOS\n\nModule 13-l3\'s kick-only-when-healthy gate survives intact, with one upgrade: per-task health bits. Each task sets its bit when it completes its cycle; a monitor task (or the tick hook) checks the mask of *required* tasks and kicks only when all are set. A hung task stops setting its bit → the mask goes incomplete → no kick → reset. The advanced version downgrades misbehaving tasks (a task that missed 3 of its last 10 deadlines gets reported, not reset) — health monitoring as a spectrum, logged per module 13-l3\'s scheme. The anti-pattern is unchanged and worth repeating: never kick from a high-priority timer callback that runs no matter what.\n\n### Designing out deadlocks and starvation\n\nThe rules are few and absolute. Lock ordering: one global order, documented; cycles in the lock graph are build-breaking findings. No blocking calls while holding a lock. Lock scopes minimal (module 16-l2). Bounded queues everywhere with a *policy* for full (drop, overwrite-oldest, or backpressure — chosen per stream, logged). And starvation awareness: any task that can run forever at its priority starves the band below — CPU-bound work gets sliced or demoted. None of this is exotic; all of it is reviewable on paper, which is the point: concurrency bugs prevented at design time are the only cheap ones.\n\n### When NOT to use an RTOS, honestly\n\nChoose bare-metal when: the system is a handful of periodic jobs (the module 05-l3 scheduler is smaller, deterministic, and fully understood); RAM cannot afford per-task stacks (module 16-l1\'s audit); timing is simple enough that the loop\'s worst case is fine; or the team is new to concurrency — a superloop\'s bugs are shared-data bugs only, an RTOS adds a second family. Choose an RTOS when: activities are genuinely independent with different latency needs; blocking waits would litter the code; existing middleware (TCP/IP, BLE stacks) expects an RTOS; or the product line will grow into complexity that a hand-rolled scheduler will not survive. Both answers are respectable; the failure is choosing by fashion and discovering the cost in the field.',
    deepDive:
      '### The task decomposition exercise, honestly\n\nThe RTOS design step that matters most is drawing the task list before writing code: one line per task — name, priority, period/trigger, stack estimate, what it owns. The exercise exposes mistakes while they are cheap: two tasks communicating through a shared global (missing queue), a task with no blocking point (hog), a task list that is really one task\'s state machine (over-decomposition — context switches for nothing). Typical small-product decompositions: 4-8 tasks (sensor, control, comms, UI, monitor) with the ISRs feeding queues at the BSP seam (module 13-l2). Fewer than 3 tasks usually means a superloop with extra steps; more than ~10 usually means the boundaries are wrong. The drawing also sizes the RAM budget honestly (module 15-l1) and names the lock set for the deadlock review — one diagram, three reviews enabled.\n\n### Stack sizing per task, honestly\n\nEach task\'s stack is budgeted like module 15-l2 taught: watermark it in tests (FreeRTOS provides uxTaskGetStackHighWaterMark-style introspection), exercise the deepest path per task, add margin. The RTOS-specific twist: the *idle task* and kernel ISRs also consume stack (often configurable), and timer callbacks run on the timer task\'s stack — a blocking callback shows up as that task\'s watermark, a useful diagnostic that the callback contract was violated. Undersized stacks produce the same corruption symptoms as module 15-l2\'s, plus task-level weirdness (a task "crashing" into another\'s data); the fix discipline is identical — measure, margin, document.\n\n### Migrating the course\'s running example, honestly\n\nThe module 18 multi-sensor monitor maps to an RTOS naturally: ADC DMA (module 14) completion notification → processing task; UART RX (module 07) queue → parser task; display/UI task at low priority; monitor task running the health gate. What changes versus bare metal: the tick scheduler table becomes vTaskDelay periods, the flag queues become kernel queues, and the shared config struct gains a mutex. What does NOT change: drivers, layers, error ladders, ring buffers at high rates, and every register-level lesson in this course. That is the honest summary of RTOS adoption — it replaces the *scheduling and signalling* layer only; everything from module 01 to 15 remains the firmware.',
    examples: [
      {
        title: 'Per-task watchdog health gate (conceptual pseudocode)',
        language: 'c',
        code:
          '/* FreeRTOS-style pseudocode - conceptual; not runnable on this platform. */\n#define TASK_CTRL   (1u << 0)\n#define TASK_SENS   (1u << 1)\n#define TASK_COMMS  (1u << 2)\n#define TASKS_REQUIRED (TASK_CTRL | TASK_SENS | TASK_COMMS)\n\nstatic volatile uint32_t health_bits = 0u;   /* set by each task  */\n\n/* Each periodic task reports its heartbeat once per cycle: */\nstatic void report_alive(uint32_t bit) {\n    /* atomic bit-set; OR of a single bit is atomic on 32-bit cores */\n    health_bits |= bit;\n}\n\nvoid ctrl_task(void *arg) {\n    (void)arg;\n    for (;;) {\n        do_control_step_mock();\n        report_alive(TASK_CTRL);\n        vTaskDelay(10);\n    }\n}\n\n/* Monitor task: clears the mask, waits one period, checks completeness. */\nvoid monitor_task(void *arg) {\n    (void)arg;\n    for (;;) {\n        vTaskDelay(50);                        /* one watchdog window */\n        uint32_t seen = health_bits;\n        health_bits = 0u;\n        if ((seen & TASKS_REQUIRED) == TASKS_REQUIRED) {\n            watchdog_kick_mock();              /* all tasks reported */\n        } else {\n            log_mock("[E][wdt] missing bits 0x%lX",\n                     (unsigned long)(TASKS_REQUIRED & ~seen));\n            /* no kick: the hardware watchdog will reset */\n        }\n    }\n}\n',
        explanation: [
          'Each task ORs its bit after a completed cycle; the monitor samples and clears the mask once per window — the module 13-l3 snapshot pattern, kernel-flavoured.',
          'A hung ctrl_task simply never sets its bit: the mask stays incomplete, the monitor logs the *missing bits* (diagnosis for free), and no kick fires → hardware reset.',
          'The bit OR is atomic on a 32-bit aligned core (module 06-l2\'s atomic-width rule) — no lock needed for this one flag.',
          'Exact behavioural trace (conceptual): healthy system → kick every 50 ms; hung sensor task → `[E][wdt] missing bits 0x2` then reset.',
          'The anti-pattern stands: a kick inside ctrl_task itself, or in a timer callback independent of health, would hide a hung task exactly when the watchdog exists to catch it.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'A typical small RTOS decomposition',
        content:
          '  ISRs (BSP seam)          TASKS                          PRIMITIVES\n  ---------------          -----                          ----------\n  ADC DMA done ----+       sensor task (prio 4, 10ms) <-- queue <- ISR\n  UART RX      ----+-->  control task (prio 3, 5ms)  <-- samples\n                       comms/parser (prio 2, event)\n                       UI task      (prio 1, 50ms)\n                       monitor task (prio 5? -> NO: runs periodically,\n                                     checks health, kicks WDT)\n\n  shared: cfg_table under one mutex; log via ring buffer + low task\n  events: event group {cfg_loaded, net_up, cal_done} gates startup',
        caption:
          'Conceptual decomposition sketch (the monitor runs at a moderate priority — it must not be starved, but it also must not preempt control). Every earlier module\'s pattern appears in its kernel form.',
      },
    ],
    tables: [
      {
        caption: 'Bare-metal vs RTOS decision checklist',
        headers: ['Question', 'Lean bare-metal if', 'Lean RTOS if'],
        rows: [
          ['How many independent activities?', '2-4 periodic jobs', 'Many, with different latency needs'],
          ['RAM budget', 'Tight (KB-scale)', 'Comfortable for per-task stacks'],
          ['Blocking waits needed?', 'Rare; flags suffice', 'Everywhere; blocking is natural'],
          ['Middleware', 'None or self-contained', 'Expects an RTOS (TCP/IP, BLE)'],
          ['Team experience', 'New to concurrency', 'Fluent with the primitives'],
          ['Worst-case loop time', 'Meets all deadlines', 'Cannot meet the tightest deadline'],
        ],
      },
      {
        caption: 'RTOS design review checklist',
        headers: ['Check', 'Finds'],
        rows: [
          ['Task table drawn: priority, period, stack, ownership', 'Over/under-decomposition, missing priorities'],
          ['Lock-order graph acyclic', 'Deadlocks'],
          ['Every queue has a full-policy', 'Silent drops or unbounded waits'],
          ['Every task has a blocking point', 'Starvation hogs'],
          ['Health bits per required task', 'Unguarded hangs'],
          ['Timer callbacks short and non-blocking', 'Timer-task starvation'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Blocking inside a software-timer callback.',
        fix:
          'Callbacks run in the shared timer task — blocking there stalls every timer in the system. Callbacks set flags/queues and return.',
      },
      {
        mistake: 'Kicking the watchdog from a callback or ISR that always runs.',
        fix:
          'The kick must be gated on the per-task health mask (the whole point). A guaranteed-path kick disables the watchdog\'s detection exactly when it is needed.',
      },
      {
        mistake: 'Adopting an RTOS because the codebase "feels complex".',
        fix:
          'Complexity of *logic* belongs in state machines and layers (module 13); the RTOS answers a specific question — independent activities with competing deadlines. Audit the decision checklist first.',
      },
    ],
    guidedPractice: {
      title: 'Design the task table',
      brief:
        'Decompose a data logger: 4-channel ADC at 1 kHz (DMA), UART console at 115200, an SD-card write burst every 5 s (200 ms of blocking I/O), a watchdog, and a status LED. Produce the task table (name, priority, trigger, stack hint) and name every primitive used.',
      expectedBehavior:
        'Tasks: sensor (prio 4, DMA-completion event, queue-fed), writer (prio 2, 5 s periodic, owns SD I/O — its blocking is fine at low priority), console/parser (prio 3, UART queue), monitor (prio 2, 100 ms, health mask + kick), UI/LED (prio 1, 100 ms). Primitives: ADC queue, UART queue/ring, cfg mutex, health bits, event group for startup gating. SD blocking stays in the low-priority writer so control latency is untouched.',
      hints: [
        'Blocking work goes to the lowest priority that tolerates it.',
        'The monitor must not be starved by the writer\'s bursts.',
      ],
    },
    practiceExercises: [
      {
        title: 'Pick the timing mechanism',
        brief:
          'For each need, choose vTaskDelay, software timer, or event group: (a) blink an LED every 500 ms forever; (b) one-shot 30 s timeout closing a valve; (c) start logging only after config loaded AND card mounted; (d) a control loop at exactly 5 ms.',
        expectedBehavior:
          '(a) Software timer (periodic, no dedicated task needed). (b) Software timer one-shot (or vTaskDelay in the owning task — timer preferred if the task should stay free). (c) Event group (AND of bits). (d) vTaskDelayExact-style periodic delay in the control task (hardware timer trigger for hard jitter requirements).',
        hints: [
          'Dedicated task vs shared timer-task callback is the trade.',
          'Conditions across producers are event-group territory.',
        ],
      },
      {
        title: 'Audit a bad design',
        brief:
          'A design has: one task at priority 7 that never blocks (polls a flag), a timer callback that acquires a mutex with a 1 s timeout, and two tasks taking locks in opposite orders. List the four defects and their fixes.',
        expectedBehavior:
          'Defects: (1) never-blocking top-priority task starves everything → add a blocking point or demote; (2) blocking (1 s timeout) in a timer callback → callbacks must not block; signal a task instead; (3) opposite lock order → single global order; (4) the 1 s mutex timeout inside shared-callback context also lengthens worst-case timer latency → move the work out. Fixes are all design-time, per the review checklist.',
        hints: [
          'Two of the defects are from this lesson, one from 16-l1, one from 16-l2.',
          'Timer callbacks inherit the timer task\'s constraints.',
        ],
      },
    ],
    assessment: {
      title: 'RTOS design checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Software-timer callbacks execute:',
          options: [
            'In a shared timer task — they must be short and non-blocking',
            'In the creating task\'s context',
            'In ISR context',
            'On their own stacks at their own priorities',
          ],
          answer: 'In a shared timer task — they must be short and non-blocking',
          explanation:
            'One task services all timers; a blocking callback delays every other timer in the system.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Event groups are the right tool when a task must wait for:',
          options: [
            'A combination of conditions (AND/OR of bits)',
            'A stream of data bytes',
            'Exclusive resource access',
            'A single interrupt event',
          ],
          answer: 'A combination of conditions (AND/OR of bits)',
          explanation:
            'Event groups carry conditions from multiple producers; queues carry data sequences.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'With per-task health bits, the watchdog kick happens in the monitor task only when every required task reported its cycle.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'The health mask is the module 13-l3 gate in kernel form; missing bits are logged before the reset.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Which system most honestly stays bare-metal?',
          options: [
            'A 2 KB part with three periodic jobs',
            'A gateway running TCP/IP and BLE stacks',
            'A device with five independent latency-critical activities',
            'A product line expected to triple in features',
          ],
          answer: 'A 2 KB part with three periodic jobs',
          explanation:
            'Per-task stacks alone would exhaust 2 KB; the module 05-l3 scheduler is smaller, deterministic and fully understood at that scale.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the two absolute deadlock-prevention rules.',
          answer: 'one global lock ordering (no cycles), and never block while holding a lock',
          explanation:
            'Acyclic lock graph plus minimal hold scopes eliminate the ABBA deadlock by construction.',
          hint: 'Order and scope.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Software timer', definition: 'Kernel-managed callback firing after a delay/periodically, in the shared timer task.' },
      { term: 'Event group', definition: 'A set of bits tasks can wait on in combination — multi-producer conditions.' },
      { term: 'Health mask', definition: 'Per-task bits proving each required task completed its cycle — the watchdog gate.' },
      { term: 'Lock ordering', definition: 'The single global order in which all code acquires multiple locks; cycles mean deadlock.' },
      { term: 'Full policy', definition: 'The designed behaviour when a queue fills: drop, overwrite-oldest, or backpressure.' },
    ],
    revisionSummary: [
      'Timers for delayed/periodic callbacks (short!); event groups for conditions.',
      'Watchdog = per-task health bits + monitor kick, never a guaranteed-path kick.',
      'Deadlock-proofing: lock order, no blocking under locks, minimal scopes.',
      'Draw the task table before coding; it enables three reviews.',
      'The RTOS replaces scheduling/signalling only — modules 01-15 still apply.',
    ],
    furtherReading: [
      { label: 'FreeRTOS — software timers, event groups, docs', url: 'https://www.freertos.org/', kind: 'docs' },
      { label: 'Wikipedia — Deadlock prevention', url: 'https://en.wikipedia.org/wiki/Deadlock', kind: 'article' },
      { label: 'Wikipedia — Watchdog timer', url: 'https://en.wikipedia.org/wiki/Watchdog_timer', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
