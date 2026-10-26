import type { TutorialLesson } from '../types';

export const module18Lessons: TutorialLesson[] = [
  {
    id: 'embc-m18-l1',
    title: 'Project Walkthrough 1: Interrupt-Driven Event Counter',
    summary:
      'A complete mini-project assembled from modules 03-06: an EXTI-style event ISR that counts, a main loop that consumes batches safely, with the full design-to-test treatment.',
    objectives: [
      'Assemble register, interrupt and shared-data patterns into one coherent driver.',
      'Apply the ownership split: ISR writes the count, main loop snapshots and reports.',
      'Trace the design against a simulated event storm.',
      'Specify the test plan distinguishing host-testable logic from board-only behaviour.',
    ],
    whyItMatters:
      'This is the smallest project that touches every core skill at once — registers, ISRs, volatile, atomicity, non-blocking main loop — and the architecture it teaches (ISR counts, loop consumes) scales unchanged to real products like flow meters, encoders and button boxes.',
    prerequisites: ['embc-m03-l2', 'embc-m06-l1', 'embc-m06-l2', 'embc-m06-l3'],
    explanation:
      '### The requirement, precisely\n\n"Count events arriving on an external interrupt line; every time the main loop runs, report how many events occurred since the last report — never missing one, never double-reporting, never blocking."\n\n### The architecture\n\nThree pieces with one shared datum and a strict ownership split:\n\n1. **ISR (module 06-l1 discipline):** the EXTI-style interrupt fires per event. The ISR does exactly two things: increment the count and set the pending flag. No work, no prints.\n2. **Shared data (module 06-l2 discipline):** `event_count` is `volatile uint32_t` — single-writer (ISR), atomic-read on 32-bit cores; on 8-bit cores the snapshot moves inside a critical section. `event_pending` is a one-byte flag — naturally atomic everywhere.\n3. **Main loop (module 06-l3 discipline):** snapshot-and-clear the pending flag (atomic), read the count difference, report, sleep. The *difference* between consecutive snapshots is what gets reported — reads of the count are safe even while new events arrive, because the count only ever grows.\n\nThe subtle correctness point: the loop reports `count_now − count_last`, computed with unsigned subtraction — correct even if events arrive between the pending check and the count read (they simply belong to the next batch). A torn *count* read is impossible on 32-bit cores and prevented by the critical section on 8-bit ones (module 06-l2\'s table, applied directly).\n\n### What real hardware changes, honestly\n\nOn a real MCU this design maps to: an EXTI/GPIO interrupt configured for the button or sensor edge (vendor manual: which edge, which filter), the ISR name from the vector table, and the same two lines inside. The mock replaces the hardware\'s event source with a function call — everything else, including the ownership rules, is production-shaped. Electrical reality (bounce on a button line — module 04-l3, noise on a long line) is where the board work lives: the counter\'s *software* is testable on host; the event source\'s cleanliness is a board question.',
    deepDive:
      '### Why the count belongs to the ISR, honestly\n\nThe tempting alternative — the ISR only sets a flag and the loop counts "an event" — merges simultaneous events (two events in one loop iteration collapse to one) and puts the increment in the wrong context. The count-in-ISR design records every event; the flag only says "something new to report". The general rule from module 06-l3 applies with a refinement: the ISR owns exactly one datum (the count) and one signal (the flag); the loop owns all interpretation. This split is also what makes the design lock-free on single-core MCUs: each shared variable has exactly one writer.\n\n### Batches, rates and the report deadline, quantitatively\n\nThe loop reports whatever accumulated since last time — so the *report* rate is the loop rate, while the *capture* rate is the interrupt rate. The design stays honest up to the point where the count difference could wrap: at 10 events/s a uint32_t wraps after ~13 years; at 10 Mevents/s (a hardware counter feed) you would widen to 64-bit software accumulation or drain the count per loop iteration (subtract-on-read). Sizing the report period from the counter width is the same budget arithmetic as modules 05-l3 and 15-l1: write down the rate, compute the wrap time, verify it exceeds the product lifetime or add the drain.\n\n### Extending the pattern, honestly\n\nTwo standard extensions appear in products: per-source counters (an event byte: bit per source — the module 06-l3 flag-snapshot, with counts beside it) and timestamped events (the ISR latches a capture-timer value per event — module 05-l2 input capture — into a small ring of timestamps for rate computation). Both keep the same ownership split; both add buffer-sizing questions from module 07-l3. The event-counter here is deliberately minimal so the ownership rules are visible without buffer complexity.',
    examples: [
      {
        title: 'The complete event counter, host-runnable and traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of the interrupt line: on real hardware this is\n * an EXTI/GPIO ISR wired in the vendor startup file; the flag/count\n * rules below are production rules either way. */\nstatic volatile uint32_t event_count   = 0u;  /* written ONLY by the ISR */\nstatic volatile uint8_t  event_pending = 0u;  /* written ONLY by the ISR */\n\nstatic void exti_isr(void) {\n    event_count++;                 /* every event is recorded        */\n    event_pending = 1u;            /* "something new to report"      */\n}\n\nstatic void report_batch(uint32_t *last_reported) {\n    /* Snapshot-and-clear the flag (single byte: atomic everywhere). */\n    if (event_pending == 0u) {\n        return;\n    }\n    event_pending = 0u;\n\n    /* On a 32-bit core this aligned uint32_t read is atomic (m06-l2).\n     * On an 8-bit core, bracket it with the critical-section idiom. */\n    uint32_t now = event_count;\n    uint32_t batch = now - *last_reported;   /* unsigned: wrap-safe  */\n    *last_reported = now;\n\n    printf("batch: %u events (total %u)\\n",\n           (unsigned)batch, (unsigned)now);\n}\n\nint main(void) {\n    uint32_t last_reported = 0u;\n\n    /* Simulated event storm: 3 events, loop, 2 events, loop, loop. */\n    exti_isr(); exti_isr(); exti_isr();\n    report_batch(&last_reported);\n\n    exti_isr(); exti_isr();\n    report_batch(&last_reported);\n\n    report_batch(&last_reported);          /* nothing new: silent    */\n    return 0;\n}',
        explanation: [
          'ISR contract honoured: two lines, no work — every event lands in the count.',
          'First loop pass: three events → count 3, batch = 3 − 0 = 3 → prints `batch: 3 events (total 3)`.',
          'Second pass: two more events → count 5, batch = 5 − 3 = 2 → prints `batch: 2 events (total 5)`.',
          'Third pass: pending is clear → returns silently. No empty reports, no repeats.',
          'Exact output: `batch: 3 events (total 3)` / `batch: 2 events (total 5)`.',
          'The unsigned subtraction makes the batch correct even if an event lands between the pending check and the count read — it simply appears in the next batch.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Ownership map for the event counter',
        content:
          '  EVENT SOURCE          ISR (interrupt context)      MAIN LOOP\n  ------------          -----------------------      ---------\n  wire edge --->  exti_isr:  event_count++   (owner: ISR)\n                             event_pending=1 (owner: ISR)\n\n                                  |  pending flag (1 byte, atomic)\n                                  v\n                             main: snapshot+clear flag\n                                   read count (atomic width)\n                                   batch = now - last\n                                   report; last = now\n\n  RULE: count and flag have exactly ONE writer (the ISR).\n        The loop only reads (snapshot) - no RMW on shared data.',
        caption:
          'The single-writer rule makes the design lock-free on single-core MCUs. Every shared variable\'s writer is named.',
      },
    ],
    tables: [
      {
        caption: 'Design decisions and their module lineage',
        headers: ['Decision', 'Reason', 'From'],
        rows: [
          ['Count in the ISR, flag for the report', 'Never merge events; ISR owns one datum', 'm06-l3'],
          ['volatile on both shared variables', 'Cross-context visibility', 'm02-l3, m06-l2'],
          ['Batch by unsigned difference', 'Correct across wraps and late arrivals', 'm05-l3'],
          ['Pending flag is one byte', 'Atomic everywhere; no critical section needed for it', 'm06-l2'],
          ['No work in the ISR', 'Bounded latency for the next event', 'm06-l1'],
        ],
      },
      {
        caption: 'Test plan',
        headers: ['Test', 'Where', 'Checks'],
        rows: [
          ['Batch arithmetic (3 then 2 events)', 'Host', 'Differences, silent empty pass'],
          ['Wrap behaviour of the difference', 'Host (forced values)', 'Correct batches across 2^32 wrap'],
          ['8-bit-core snapshot in critical section', 'Host (mocked disable/restore)', 'No torn count'],
          ['Real EXTI edge config + bounce', 'Board', 'Vector wiring, edge selection, debounce need'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Incrementing the count in the main loop from a flag instead of in the ISR.',
        fix:
          'Two events in one loop iteration would merge into one count. The ISR records every event; the flag only requests a report.',
      },
      {
        mistake: 'Reading the count into a report without a snapshot discipline on 8-bit cores.',
        fix:
          'A 32-bit read is four byte-reads there (module 06-l2\'s torn read). Bracket the read with the disable/restore idiom, or keep the count 8/16-bit atomic.',
      },
      {
        mistake: 'Doing bounce handling inside this ISR.',
        fix:
          'Bounce is the *source\'s* problem (module 04-l3): debounce in hardware (RC) or in the event consumer — an ISR-side delay loop would violate the short-ISR rule.',
      },
    ],
    guidedPractice: {
      title: 'Extend to per-source counters',
      brief:
        'Two event sources share one ISR port. Extend the design: a flag byte (bit per source, module 06-l3) plus one count per source. Write the ISR and the loop\'s snapshot logic, and state why the counts stay single-writer per source.',
      expectedBehavior:
        'ISR: event_count_a++ or event_count_b++ per source (or a shared port read decides), plus event_flags |= bit. Loop: snapshot flags atomically, for each set bit read that source\'s count difference and report. Each count has exactly one writer (the ISR), each flag bit one setter — the split-ownership rule holds per variable.',
      hints: [
        'One flag byte, one bit per source.',
        'Per-source counts are separate variables — each still single-writer.',
      ],
    },
    practiceExercises: [
      {
        title: 'Host-test the batch logic',
        brief:
          'Write two unit tests for report_batch using the module 17 harness: (a) three events → batch 3; (b) two events arriving between the pending check and the count read (simulated by calling exti_isr mid-report) → the batch shows the earlier count and the next report shows the remainder. Give the expected printed lines.',
        expectedBehavior:
          '(a) `batch: 3 events (total 3)`. (b) With an event arriving mid-report after the count read: batch prints the pre-event total, and the *next* report_batch (pending set by the late event) prints `batch: 1 events (total N+1)` — no event lost, none doubled.',
        hints: [
          'The late event sets pending again — the loop reports it next pass.',
          'Unsigned differences keep the books balanced.',
        ],
      },
      {
        title: 'Board bring-up checklist',
        brief:
          'List, in order, the board bring-up steps for this project on a real MCU: clock, GPIO, EXTI config, NVIC, ISR wiring, and the first measurement that proves events arrive.',
        expectedBehavior:
          'Enable GPIO + SYSCFG/EXTI clocks; configure the pin as input (pull per the source, module 04-l2); map the line to EXTI with the edge (rising/falling per the source); enable the EXTI interrupt in the NVIC with a priority; define the ISR with the exact vector-table name; first measurement: a counter increment printed from the ISR via a flag (or debug probe) to prove edges arrive — before any of the batch logic.',
        hints: [
          'The three-switch checklist from module 06-l1.',
          'Prove the event source first; logic second.',
        ],
      },
    ],
    assessment: {
      title: 'Event counter project checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why does the count increment live in the ISR, not the main loop?',
          options: [
            'Events arriving between loop iterations would be merged and lost',
            'The loop is too slow to count',
            'volatile does not work in loops',
            'The ISR has more RAM',
          ],
          answer: 'Events arriving between loop iterations would be merged and lost',
          explanation:
            'A loop-side count from a flag records "at least one event"; the ISR-side count records every event.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'The batch is computed as:',
          options: [
            'now − last_reported, unsigned',
            'The pending flag value',
            'A fresh count zeroed each report',
            'last_reported − now',
          ],
          answer: 'now − last_reported, unsigned',
          explanation:
            'The unsigned difference is wrap-safe and counts exactly the events since the last report.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'On a 32-bit core, the aligned uint32_t count read needs no critical section.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'Plain aligned 32-bit loads are atomic there (module 06-l2); on 8-bit cores the read must be bracketed.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does the trace print for the second report?',
          code: '/* events: 3, report, 2, report, report */',
          options: ['batch: 2 events (total 5)', 'batch: 5 events (total 5)', 'batch: 2 events (total 2)', 'nothing'],
          answer: 'batch: 2 events (total 5)',
          explanation:
            'The second report covers events 4-5: batch 2, running total 5.',
          hint: 'The batch is the difference from the last report.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'State the single-writer rule as it applies to this design.',
          answer: 'each shared variable (count, pending flag) has exactly one writer context — the ISR — while the main loop only reads/snapshots',
          explanation:
            'Single-writer variables need no RMW protection on single-core MCUs; that is what makes the design lock-free.',
          hint: 'One writer, many readers.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Ownership split', definition: 'ISR writes the shared data; the main loop only snapshots and interprets.' },
      { term: 'Batch reporting', definition: 'Reporting the unsigned difference of a monotonic counter since the last report.' },
      { term: 'EXTI', definition: 'The external interrupt line block (STM32 naming) mapping pin edges to NVIC vectors.' },
    ],
    revisionSummary: [
      'ISR: count++ and flag — nothing else. Loop: snapshot, difference, report.',
      'One writer per shared variable = lock-free on single-core.',
      'Unsigned differences are wrap-safe and late-arrival-safe.',
      'Bounce and noise are source problems (m04); the ISR stays short (m06).',
      'Host-test the batch logic; board-test the event source.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Interrupt handler patterns', url: 'https://en.wikipedia.org/wiki/Interrupt', kind: 'article' },
      { label: 'docs.arduino.cc — attachInterrupt (concept-level real API)', url: 'https://docs.arduino.cc/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m18-l2',
    title: 'Project Walkthrough 2: Layered Multi-Sensor Monitor',
    summary:
      'The capstone bare-metal architecture: a mock ADC sensor driver, a fixed-point conversion layer, the tick scheduler and an alarm policy — assembled exactly per the module 13 layering rules.',
    objectives: [
      'Assemble driver, service and application layers into one program.',
      'Apply the fixed-point conversion chain at the driver boundary only.',
      'Run multiple cadences in one non-blocking scheduler.',
      'Design the alarm policy with hysteresis and range guards.',
    ],
    whyItMatters:
      'This is the architecture 80% of small products actually ship: a few sensors, a few thresholds, a scheduler. Built with the course\'s discipline it is host-testable end to end — and it is the code you will refactor into an RTOS in lesson 3.',
    prerequisites: ['embc-m10-l3', 'embc-m13-l2', 'embc-m05-l3'],
    explanation:
      '### The requirement\n\n"Monitor a temperature sensor (ADC, TMP36-style) every 500 ms and a light sensor (ADC, LDR divider) every 100 ms; raise/clear a HEAT alarm at >45.0/<40.0 °C (hysteresis); keep every conversion testable on host."\n\n### The layers, concretely\n\n- **Driver (adc_sensor.c):** owns the mock ADC registers; exposes `temp_read_x10()` returning calibrated tenths of a degree — the module 10-l3 chain (counts → mV → offset → tenths) plus the range guard, in one function, at the driver boundary. Nothing above sees counts.\n- **Service (scheduler.c):** the module 05-l3 timestamp table; nothing knows what tasks do.\n- **Application (monitor.c):** cadences, thresholds with **hysteresis** (raise at 45.0, clear at 40.0 — the 5-degree gap prevents alarm chatter around the threshold), and the alarm state machine (module 13-l1: enum + switch).\n\n### Why hysteresis, quantitatively\n\nA single threshold at 45.0 makes a sensor hovering at 44.9-45.1 toggle the alarm on every reading — relay chatter, log spam, notification storms. Two thresholds (raise 45.0, clear 40.0) mean the sensor must *travel* 5 degrees to flip the alarm back — noise of ±1 degree cannot chatter. The gap is chosen from the measurement noise (module 10-l2: several × the averaged jitter) — a design number, not a round one.\n\n### What the host tests, honestly\n\nEverything except the mock register itself: the conversion chain (known counts → known tenths), the guard (rail counts → fault), the scheduler (cadence traces), and the alarm machine (threshold crossings, hysteresis chatter suppression). The board adds: real ADC noise and reference error (module 10-l1), and the actual LDR divider range (module 12-l1). The mock ADC register is set by the test (or by a fake "world") — the production-shaped seam from module 03.',
    deepDive:
      '### The conversion boundary, reviewed line by line\n\nThe driver\'s conversion is the module 10-l3 chain with all its discipline: unsigned counts-to-mV (overflow-safe multiply), *signed* tenths from the offset subtraction (negative temperatures!), the range guard returning a fault sentinel, and every constant named with units in a comment. This function is the single place in the codebase where counts become units — a grep for `MOCK_ADC_DR` finds exactly the driver, nothing else. That grep-ability is the layering test: if application code names a register, the boundary leaked; the fix is a driver function, not a bigger exception list.\n\n### Alarm policy as a state machine, honestly\n\nThe alarm is an enum machine: OK → (temp ≥ RAISE) → ALARM → (temp ≤ CLEAR) → OK, with the fault state (driver returned the sentinel) parked separately — a faulted sensor is not "cold", and treating it so would be a lie in the logs. Transition actions set/clear the output once (module 13-l1 entry actions) and log the transition with the temperature that caused it. The machine is host-tested with sequences: crossing up, crossing down, chatter suppression (a sine around 42.5 never toggles), fault injection (sentinel → FAULT state, alarm held safe). The same machine pattern scales to multi-alarm systems by instantiation — one struct per alarm channel.\n\n### The cadence table and the scheduler\'s contract, quantitatively\n\nTasks: light poll 100 ms (fast, cheap — drives a display bar), temperature poll 500 ms (slow, filtered — module 10-l2 moving average of 4 inside the driver or service), alarm check tied to the temperature cadence, status report 5 s. The scheduler (module 05-l3) needs no changes — new tasks are table rows. The loop\'s worst-case iteration is the sum of the worst tasks (a few hundred µs here), far under the 100 ms cadence — headroom recorded per module 13-l3. When the product grows a third sensor, the budget line and the table row appear together; that coupling is the whole discipline.',
    examples: [
      {
        title: 'The layered monitor, host-runnable, core traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* ---------- DRIVER LAYER: adc_sensor.c ---------- */\nstatic volatile uint16_t MOCK_ADC_DR = 250u;   /* educational mock (m03) */\n\n#define ADC_STEPS        1024u\n#define VREF_MV          3300u\n#define SENSOR_OFFSET_MV 500u\n#define TEMP_MIN_C10     (-400)\n#define TEMP_MAX_C10     1250\n#define TEMP_FAULT       (-32768)\n\nstatic int32_t temp_read_x10(void) {\n    uint32_t counts = MOCK_ADC_DR;\n    uint32_t mv = counts * VREF_MV / ADC_STEPS;\n    int32_t c10 = (int32_t)mv - (int32_t)SENSOR_OFFSET_MV;\n    if ((c10 < TEMP_MIN_C10) || (c10 > TEMP_MAX_C10)) {\n        return TEMP_FAULT;                    /* range guard (m10-l3) */\n    }\n    return c10;\n}\n\n/* ---------- APPLICATION LAYER: monitor.c ---------- */\ntypedef enum { ALARM_OK = 0, ALARM_ACTIVE, ALARM_FAULT } alarm_t;\n#define RAISE_C10 450    /* 45.0 C */\n#define CLEAR_C10 400    /* 40.0 C - hysteresis gap */\n\nstatic alarm_t alarm_step(int32_t temp_x10) {\n    static alarm_t state = ALARM_OK;      /* module 13-l1 machine */\n\n    if (temp_x10 == TEMP_FAULT) {\n        if (state != ALARM_FAULT) {\n            printf("[W][alarm] sensor fault -> FAULT\\n");\n            state = ALARM_FAULT;\n        }\n        return state;\n    }\n    switch (state) {\n    case ALARM_OK:\n        if (temp_x10 >= RAISE_C10) {\n            printf("[W][alarm] HEAT ALARM at %d.%d C\\n",\n                   (int)(temp_x10 / 10), (int)(temp_x10 % 10));\n            state = ALARM_ACTIVE;\n        }\n        break;\n    case ALARM_ACTIVE:\n        if (temp_x10 <= CLEAR_C10) {\n            printf("[I][alarm] cleared at %d.%d C\\n",\n                   (int)(temp_x10 / 10), (int)(temp_x10 % 10));\n            state = ALARM_OK;\n        }\n        break;\n    case ALARM_FAULT:\n        /* recovery: any in-range reading restores the machine */\n        state = (temp_x10 >= RAISE_C10) ? ALARM_ACTIVE : ALARM_OK;\n        printf("[I][alarm] sensor recovered\\n");\n        break;\n    default:\n        state = ALARM_OK;\n        break;\n    }\n    return state;\n}\n\n/* ---------- host-side demonstration ---------- */\nint main(void) {\n    /* Scripted sensor: OK day -> heat wave -> still hot -> cooled off.\n     * counts chosen inside the sensor\'s documented span (TMP36-class:\n     * 125 C tops out near 543 counts at 3.3 V / 10 bit). */\n    MOCK_ADC_DR = 250u;  (void)alarm_step(temp_read_x10());  /* 30.5 C: OK      */\n    MOCK_ADC_DR = 543u;  (void)alarm_step(temp_read_x10());  /* 124.9 C: raise  */\n    MOCK_ADC_DR = 500u;  (void)alarm_step(temp_read_x10());  /* 111.1 C: hold   */\n    MOCK_ADC_DR = 200u;  (void)alarm_step(temp_read_x10());  /* 14.4 C: clear   */\n    return 0;\n}',
        explanation: [
          'Driver: 250 counts → 250*3300/1024 = 805 mV → 305 tenths = 30.5 °C; guard passes; alarm machine stays OK (below the 450 raise point) — no print.',
          '543 counts → 1749 mV → 1249 tenths = 124.9 °C ≥ 450 → `[W][alarm] HEAT ALARM at 124.9 C`.',
          '500 counts → 1611 mV → 1111 tenths = 111.1 °C — well above the 400 clear point: the alarm HOLDS with no print (hysteresis: small dips do not clear).',
          '200 counts → 644 mV → 144 tenths = 14.4 °C ≤ 400 → `[I][alarm] cleared at 14.4 C`.',
          'Exact output: `[W][alarm] HEAT ALARM at 124.9 C` / `[I][alarm] cleared at 14.4 C`. The hold at 111.1 °C is the hysteresis working; a sensor hovering near the raise point would never toggle the output.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'Alarm state machine with hysteresis',
        content:
          '                 temp >= 45.0\n        +------+ ----------------> +---------+\n        | OK   |                   | ACTIVE  |\n        +------+ <---------------- +---------+\n                 temp <= 40.0\n\n        any state --sensor fault--> FAULT --in-range reading--> back\n\n  chatter test: a sensor hovering near 42.5 C crosses NEITHER\n  threshold - the 5-degree gap absorbs the noise',
        caption:
          'Two thresholds, one gap sized from the measurement noise. The FAULT state refuses to lie about a broken sensor.',
      },
    ],
    tables: [
      {
        caption: 'Task table (module 05-l3 scheduler)',
        headers: ['Task', 'Cadence', 'Layer', 'Work'],
        rows: [
          ['Light poll', '100 ms', 'driver + app', 'Read LDR divider, update display bar'],
          ['Temperature poll', '500 ms', 'driver', 'temp_read_x10 (averaged)'],
          ['Alarm check', '500 ms, after temp', 'app', 'alarm_step with the new reading'],
          ['Status report', '5 s', 'app', 'one [I] log line'],
        ],
      },
      {
        caption: 'Host test plan',
        headers: ['Test', 'Input', 'Expected'],
        rows: [
          ['Conversion chain', 'counts 250 / 543 / 200', '305 / 1250 / 144 tenths'],
          ['Range guard', 'counts 1023', 'TEMP_FAULT'],
          ['Alarm raise/clear', 'sequence crossing both thresholds', 'two transitions'],
          ['Hysteresis chatter', 'sine around 42.5 °C', 'zero transitions'],
          ['Fault handling', 'sentinel into alarm_step', 'FAULT state, safe hold'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Application code reading MOCK_ADC_DR directly.',
        fix:
          'Counts become units in exactly one function (the driver). If app code names a register, add the driver function instead — grep for register names as the review test.',
      },
      {
        mistake: 'Single-threshold alarm.',
        fix:
          'Threshold chatter is a product defect users see. Two thresholds with a gap sized from measured noise (module 10-l2) is the standard fix.',
      },
      {
        mistake: 'Treating a faulted sensor as a valid (very cold) reading.',
        fix:
          'The sentinel flows into a FAULT state that holds the last safe output and logs — never an implicit "−327.68 °C, heater on!".',
      },
    ],
    guidedPractice: {
      title: 'Add the light sensor channel',
      brief:
        'Add ldr_read_percent() to the driver layer (module 12-l1 divider, counts → percent, no offset), a 100 ms task, and a DARK alarm at <10% with 5% hysteresis. Write the conversion function, the task-table row, and the chatter test you would add.',
      expectedBehavior:
        'Conversion: percent = counts * 100 / 1024 (ratiometric to the same rail — no offset). Task row: {light, 100 ms}. Chatter test: a percent sequence hovering at 12% must produce zero transitions given raise <10 / clear 15 (gap 5) — wait, direction: DARK raises below 10, clears above 15; hovering at 12 sits between — zero transitions.',
      hints: [
        'Ratiometric sensor: no calibration offset needed.',
        'Hysteresis direction inverts for low-threshold alarms.',
      ],
    },
    practiceExercises: [
      {
        title: 'Host-test the conversion',
        brief:
          'Write the three conversion test cases from the table as CHECK-style tests, computing expected tenths by hand first: counts 250, 543, 1023.',
        expectedBehavior:
          '250 → 805 mV → 305 tenths. 543 → 1750 mV (543*3300=1,791,900/1024=1749.9 → 1749 mV) → 1249 tenths (honest: integer division gives 1749 mV, so 1249, not 1250 — the test asserts the *integer* value; document the rounding). 1023 → 3296 mV → 2796 tenths > 1250 → TEMP_FAULT.',
        hints: [
          'Multiply before divide; the integer result is the contract.',
          'The guard fires above 1250 tenths.',
        ],
      },
      {
        title: 'Move a conversion up a layer — and refuse',
        brief:
          'A teammate wants the counts-to-mV math in the alarm state machine "for convenience". Explain, in review comments, which rules this breaks (layering, testability, single-source-of-truth) and what to do instead.',
        expectedBehavior:
          'Breaks: (1) the driver boundary — app names no hardware math, only units; (2) testability — the machine becomes untestable without the mock register; (3) single source of truth — a second conversion diverges from the first at the next change. Instead: the driver exposes whatever unit the app needs (a second function or a struct result); the app stays unit-only.',
        hints: [
          'Convenience that leaks a boundary costs three reviews later.',
          'The driver API grows; the layering does not.',
        ],
      },
    ],
    assessment: {
      title: 'Multi-sensor monitor checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Where does counts-to-degrees conversion live?',
          options: [
            'One function in the driver layer; nothing above sees counts',
            'Every task that needs it',
            'In the alarm state machine',
            'In the scheduler',
          ],
          answer: 'One function in the driver layer; nothing above sees counts',
          explanation:
            'Single source of truth at the boundary — the layering and testability payoff of module 13.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Alarm hysteresis exists to:',
          options: [
            'Prevent threshold chatter from noisy readings',
            'Make the alarm faster',
            'Save RAM',
            'Replace filtering',
          ],
          answer: 'Prevent threshold chatter from noisy readings',
          explanation:
            'The raise/clear gap must exceed the measurement noise for a stable alarm.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A faulted sensor (range-guard hit) enters the alarm machine as a very cold reading.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'The sentinel maps to a FAULT state holding safe outputs — never an implicit extreme value.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'Counts = 543 with the mock chain. What does the driver return?',
          code: 'mv = counts * 3300u / 1024u;\nc10 = (int32_t)mv - 500;',
          options: ['1249', '1250', '125', '-1249'],
          answer: '1249',
          explanation:
            '543 * 3300 = 1,791,900; / 1024 = 1749 mV (integer); − 500 = 1249 tenths. The integer rounding is part of the contract the tests assert.',
          hint: 'Multiply first, then integer-divide, then subtract.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the three layers in this project and one file-typical name for each.',
          answer: 'driver (adc_sensor.c), service (scheduler.c), application (monitor.c)',
          explanation:
            'Dependencies point downward only; the conversion lives in the driver, cadences in the service, policy in the app.',
          hint: 'Registers, cadence, policy.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Driver boundary', definition: 'The line where hardware-specific values (counts) become engineering units.' },
      { term: 'Hysteresis', definition: 'Separate raise/clear thresholds with a gap exceeding the noise — chatter prevention.' },
      { term: 'Fault sentinel', definition: 'An out-of-band return value (TEMP_FAULT) distinguishing sensor faults from valid readings.' },
      { term: 'Cadence table', definition: 'The scheduler\'s task rows: name, period, phase, function.' },
    ],
    revisionSummary: [
      'Driver converts once; app speaks units; grep proves the boundary.',
      'Hysteresis gap sized from measured noise.',
      'Fault sentinel → FAULT state, never an implicit extreme.',
      'The scheduler table grows by rows; the budget grows by lines.',
      'Everything but the mock register is host-testable.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Hysteresis', url: 'https://en.wikipedia.org/wiki/Hysteresis', kind: 'article' },
      { label: 'Wikipedia — Multitier architecture (layering concept)', url: 'https://en.wikipedia.org/wiki/Multitier_architecture', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'embc-m18-l3',
    title: 'Project Walkthrough 3: Producer/Consumer Queue (RTOS Pattern, Host-Runnable)',
    summary:
      'The RTOS producer/consumer pattern, simulated portably: bounded queue, burst-absorbing capacity math, backpressure policy, and what changes when a real kernel takes over.',
    objectives: [
      'Implement the bounded producer/consumer queue pattern in portable C.',
      'Size the queue from burst and drain-rate arithmetic.',
      'Choose and implement the full-queue policy (drop with counter, overwrite, block).',
      'State exactly which parts a real RTOS (e.g. FreeRTOS) replaces and which it keeps.',
    ],
    whyItMatters:
      'Producer/consumer is the shape of every data path — sensor to logger, UART to parser, network to application. Building it once in portable C teaches the capacity and policy thinking that transfers to kernel queues (module 16) unchanged; the simulation here is genuinely useful code, not a toy.',
    prerequisites: ['embc-m07-l3', 'embc-m16-l1', 'embc-m16-l2'],
    explanation:
      '### The pattern\n\nA **producer** generates items faster, sometimes, than the **consumer** processes them; a **bounded queue** absorbs the difference. The consumer drains at its own steady rate; the queue absorbs bursts up to its capacity; beyond capacity, the *policy* decides: drop (with a counted, logged loss), overwrite-oldest (fresh data wins — right for live telemetry), or block the producer (backpressure — right when loss is unacceptable and the producer can wait). Choosing the policy per stream is a design decision (module 16-l3\'s checklist row); the default in telemetry is drop-and-count, because a silent drop is a lie and an unbounded queue is a crash on a timer.\n\n### Sizing from arithmetic, not vibes\n\nCapacity covers the worst-case burst minus what the consumer drains during it: **capacity ≥ burst_size − drain_rate × burst_time**. A logger producing 200-byte records in bursts of 10 with a consumer draining 1 record/ms: a 30 ms burst needs capacity ≥ 10 − 30 = negative → any small queue works (the consumer outruns the burst). A consumer stalled 2 s while a sensor produces 50 B/s needs ≥ 100 B. The module 07-l3 sizing table was this formula; the RTOS queue inherits it verbatim (kernel queues are bounded arrays too).\n\n### The RTOS handover, precisely scoped\n\nThis lesson\'s portable C simulation keeps: the queue structure, the sizing arithmetic, the policy code, the consumer\'s drain loop, and the drop accounting. A real kernel (FreeRTOS named as reference, per module 16) replaces: the head/tail index protection (xQueueSend/xQueueReceive are internally thread-safe — the SPSC discipline of module 07-l3 is subsumed), the blocking waits (the consumer\'s "queue empty" poll becomes a zero-CPU block), and the ISR handoff (xQueueSendFromISR). What it does *not* change: the capacity numbers, the policy, the drain loop\'s shape, and the tests. **Honesty note:** the code below is host-runnable portable C — it simulates the interleaving that a kernel scheduler would provide; on this platform there is no RTOS and none of these API calls exist to call.',
    deepDive:
      '### The drain deadline, from module 14\'s stream thinking\n\nA bounded queue converts the producer\'s burst into a consumer deadline: items waiting longer than capacity/rate are dropped (drop policy) — so the effective processing deadline is capacity/drain_rate per item. That is module 14-l2\'s stream-deadline arithmetic applied to software queues: 16-slot queue, 4 items/s drain → 4 s before the oldest unprocessed item is at risk. The number drives the design: if items must be processed within 1 s, capacity is 4 at that drain rate — or the consumer gets faster, or drops are accepted and counted. Writing the deadline next to the capacity in the design doc is what makes the drop counter interpretable later ("drops began at 14:02 — the consumer stalled").\n\n### Policy interactions with the consumer, honestly\n\nDrop-and-count is simplest but loses data silently unless counted (module 07-l3\'s instrumented drops). Overwrite-oldest keeps freshness but needs a second index operation per drop and can confuse consumers expecting order (the missing item must be *detectable* — a sequence number in each item is the standard fix). Backpressure propagates: the producer blocks, its upstream stalls — correct when the alternative is lying with missing data (billing, safety logs), wrong when the producer is an ISR (ISRs never block — module 16-l2). The policy is per-stream, written down, and tested: each policy changes the consumer\'s contract (sequence gaps vs not), which changes the parser\'s job.\n\n### Testing the pattern on the host, quantitatively\n\nThe portable simulation is exhaustively testable: scripted producer schedules (steady, bursty, pathological) against scripted consumer speeds, asserting — no data loss below capacity, correct drop counts above, sequence-number continuity, FIFO order preserved. The module 17 harness runs hundreds of interleavings in milliseconds. The board adds only the real timing (ISR rates, consumer jitter); the *logic* — the part that silently corrupts when wrong — was already proven. This is the module 17-l3 pyramid applied to the pattern: host tests own the queue semantics; the board owns the rates.',
    examples: [
      {
        title: 'The bounded producer/consumer, host-runnable, fully traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Portable C simulation of the RTOS producer/consumer pattern.\n * On a real kernel, the queue + blocking are xQueueCreate/Send/Receive;\n * the sizing and policy logic below transfers unchanged. */\n#define Q_CAP 4u\n\ntypedef struct {\n    uint8_t  items[Q_CAP];\n    uint8_t  head;      /* producer writes */\n    uint8_t  tail;      /* consumer reads  */\n    uint8_t  count;     /* maintained by whichever side runs (host sim) */\n} pqueue_t;\n\ntypedef enum { POLICY_DROP = 0, POLICY_OVERWRITE } policy_t;\n\nstatic uint32_t drop_count = 0u;\nstatic uint16_t seq_next = 0u;    /* sequence numbers detect gaps */\n\ntypedef struct {\n    uint8_t  value;\n    uint16_t seq;\n} item_t;\n\n/* Producer side (simulated ISR/task). Returns 1 if stored, 0 if dropped. */\nstatic uint8_t pq_send(pqueue_t *q, uint8_t value, policy_t policy) {\n    item_t it;\n    it.value = value;\n    it.seq = seq_next++;\n\n    if (q->count >= Q_CAP) {\n        if (policy == POLICY_DROP) {\n            drop_count++;\n            printf("  [drop seq=%u]\\n", (unsigned)it.seq);\n            return 0u;\n        }\n        /* overwrite-oldest: consume one slot for the producer */\n        q->tail = (uint8_t)((q->tail + 1u) % Q_CAP);\n        q->count--;\n        drop_count++;\n        printf("  [overwrite seq=%u]\\n", (unsigned)it.seq);\n    }\n    q->items[q->head] = it.value;\n    (void)it.seq;                    /* seq would ride in the item on a real queue */\n    q->head = (uint8_t)((q->head + 1u) % Q_CAP);\n    q->count++;\n    return 1u;\n}\n\n/* Consumer side. Returns 1 and the item, or 0 when empty. */\nstatic uint8_t pq_receive(pqueue_t *q, uint8_t *out) {\n    if (q->count == 0u) {\n        return 0u;\n    }\n    *out = q->items[q->tail];\n    q->tail = (uint8_t)((q->tail + 1u) % Q_CAP);\n    q->count--;\n    return 1u;\n}\n\nint main(void) {\n    static pqueue_t q;               /* zeroed: empty */\n    uint8_t v;\n\n    printf("-- burst of 6 into capacity 4 (drop policy) --\\n");\n    for (uint8_t i = 1u; i <= 6u; i++) {\n        (void)pq_send(&q, i, POLICY_DROP);\n    }\n\n    printf("-- consumer drains --\\n");\n    while (pq_receive(&q, &v) != 0u) {\n        printf("  consumed %u\\n", (unsigned)v);\n    }\n    printf("drops=%u\\n", (unsigned)drop_count);\n    return 0;\n}',
        explanation: [
          'The burst of 6 hits capacity 4: items 1-4 stored; item 5 → `[drop seq=4]`; item 6 → `[drop seq=5]` (sequence numbers start at 0 — items carry seq 0..5, so the drops print as seq 4 and 5).',
          'The consumer drains the 4 stored items in FIFO order: `consumed 1` through `consumed 4`.',
          'Exact output: `-- burst of 6 into capacity 4 (drop policy) --` / `  [drop seq=4]` / `  [drop seq=5]` / `-- consumer drains --` / `  consumed 1` / `  consumed 2` / `  consumed 3` / `  consumed 4` / `drops=2`.',
          'The sequence numbers make the loss *detectable* by the consumer (gaps 4,5) — the overwrite-policy deep-dive\'s detectability requirement, built in from the start.',
          'On a real kernel: pq_send becomes xQueueSend (or FromISR), pq_receive becomes xQueueReceive with a block — the count field, index protection and drop policy move into or beside the kernel; capacity and tests transfer.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The pattern and its kernel mapping',
        content:
          '   PRODUCER (ISR or task)         BOUNDED QUEUE          CONSUMER (task)\n   ----------------------         -------------          ---------------\n   produce item  ---- send --->   [ ][x][x][x]  <--- receive --- process\n                                  capacity = Q_CAP\n                                  full policy: drop / overwrite / block\n\n   portable C (this lesson):      indices + count + policy code\n   FreeRTOS equivalent:           xQueueSend / xQueueReceive\n                                  (thread-safe, blocking inside)\n   unchanged across both:         capacity math, policy choice,\n                                  drop counters, drain deadline',
        caption:
          'The simulation and the kernel differ only in who implements the queue\'s thread-safety and blocking — the design numbers transfer.',
      },
    ],
    tables: [
      {
        caption: 'Full-queue policies',
        headers: ['Policy', 'Behaviour', 'Right for', 'Cost'],
        rows: [
          ['Drop + counter', 'New item lost, visible count', 'Telemetry, logs', 'Data gaps (make them detectable)'],
          ['Overwrite-oldest', 'Oldest item lost', 'Live values (latest wins)', 'Sequence handling in consumer'],
          ['Block producer (backpressure)', 'Producer waits', 'Loss-intolerable streams', 'Stalls upstream; never from an ISR'],
        ],
      },
      {
        caption: 'Sizing example: capacity ≥ burst − drain × time',
        headers: ['Scenario', 'Numbers', 'Capacity'],
        rows: [
          ['Logger bursts 10 records; consumer drains 1/ms for 30 ms', '10 − 30 → 0', '4 (small margin)'],
          ['Sensor 50 B/s; consumer stalls 2 s', '100 − 0 → 100', '128'],
          ['Audio 1 kHz; consumer deadlines 4 s', 'per deep dive', '4096 → next power of two'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Unbounded queues "so nothing is lost".',
        fix:
          'Unbounded queues delay the failure until RAM dies (module 15). Bounded + counted drops turn an eventual crash into a logged, sized, diagnosable event.',
      },
      {
        mistake: 'Blocking the producer when it is an ISR.',
        fix:
          'ISRs never block (module 16-l2): from-ISR sends are drop-or-overwrite by nature. Backpressure belongs to task-to-task paths.',
      },
      {
        mistake: 'Dropping without sequence numbers or counters.',
        fix:
          'A silent drop is a lie in the data. Sequence gaps (detectable) plus a drop counter (loggable) keep the stream honest — module 07-l3\'s drop-count discipline.',
      },
    ],
    guidedPractice: {
      title: 'Size and policy a real stream',
      brief:
        'A telemetry link: producer bursts 12 samples every 2 s; the consumer drains 10 samples/s. Choose capacity (power of two) and policy for (a) monitoring data, (b) safety event records that must never be lost. Compute the drop risk for both.',
      expectedBehavior:
        'Steady drain: 20 samples per 2 s vs 12 produced → consumer outruns producer on average; only the 2 s stall risk matters. (a) Monitoring: capacity 4 (pow2), drop policy — a 2 s stall loses up to 24 samples, counted and logged. (b) Safety records: capacity 32 (pow2, holds a 2 s stall of 12... 24 max < 32 ✓), backpressure policy (task producer may block) — zero loss guaranteed unless the stall exceeds 3.2 s (32/10), which the watchdog/monitor detects.',
      hints: [
        'Capacity ≥ burst − drain × time; add stall margin.',
        'ISR producers cannot take the backpressure option.',
      ],
    },
    practiceExercises: [
      {
        title: 'Add sequence-gap detection',
        brief:
          'Extend the consumer: track last_seq and count gaps (drops seen from the consumer side). Trace it on the example run: which gaps does the consumer detect?',
        expectedBehavior:
          'Consumed seqs 0,1,2,3 then queue empty: the consumer never sees 4,5 (dropped) — gap detection at the consumer only fires on *later* items (seq 6 would reveal a gap of 2). In this trace the queue empties, so the drop is visible only via drop_count=2 — the honest lesson: consumer-side gap detection needs subsequent traffic; producer-side counters always work.',
        hints: [
          'Gaps are visible only when a later item arrives.',
          'Producer-side drop counters are unconditional.',
        ],
      },
      {
        title: 'Swap the policy, predict the trace',
        brief:
          'Change the example to POLICY_OVERWRITE and rerun the same burst of 6. Predict the consumed values, the drop count, and which sequence numbers the consumer can detect as missing.',
        expectedBehavior:
          'Items 1-4 stored; item 5 overwrites item 1 (tail advances, count 3→4); item 6 overwrites item 2. Queue holds 3,4,5,6; consumed 3,4,5,6; drops=2 (both overwrites). Consumer sees seqs 2..5 after missing 0,1 — detectable gaps at the front.',
        hints: [
          'Overwrite advances the tail once per dropped item.',
          'The freshest data survives; the oldest is lost.',
        ],
      },
    ],
    assessment: {
      title: 'Producer/consumer checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Queue capacity is sized from:',
          options: [
            'Burst size minus what the consumer drains during the burst (plus stall margin)',
            'A fixed 16 always',
            'The producer\'s mood',
            'Whatever malloc returns',
          ],
          answer: 'Burst size minus what the consumer drains during the burst (plus stall margin)',
          explanation:
            'capacity ≥ burst − drain_rate × time, with margin for worst-case consumer stalls.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which policy is available to an ISR-side producer?',
          options: [
            'Drop or overwrite only — ISRs never block',
            'Backpressure (block until space)',
            'Unbounded growth',
            'None; ISRs cannot send',
          ],
          answer: 'Drop or overwrite only — ISRs never block',
          explanation:
            'Blocking is illegal in interrupt context (module 16-l2); from-ISR sends are lossy by nature.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'When migrating this pattern to FreeRTOS, the capacity arithmetic and drop policy transfer unchanged.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'The kernel replaces the queue\'s thread-safety and blocking; the design numbers and policy logic are yours in both worlds.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'With POLICY_OVERWRITE and the same burst of 6 into capacity 4, what does the consumer drain first?',
          code: '/* overwrite-oldest: tail advances once per displaced item */',
          options: ['3', '1', '4', '6'],
          answer: '3',
          explanation:
            'Items 5 and 6 each overwrite the oldest (1, then 2); the queue ends holding 3,4,5,6 — the first drained is 3.',
          hint: 'Two overwrites remove the two oldest items.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the two mechanisms that keep dropped data honest.',
          answer: 'drop counters (producer side, always) and sequence numbers (gap detection, needs later traffic)',
          explanation:
            'Counter makes loss loggable; sequence numbers make gaps detectable by the consumer when the stream continues.',
          hint: 'One counts, one numbers.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Producer/consumer', definition: 'Decoupled generating and processing sides joined by a bounded queue.' },
      { term: 'Backpressure', definition: 'Blocking the producer on a full queue — only legal between tasks.' },
      { term: 'Overwrite-oldest', definition: 'Full-queue policy that discards the oldest item for the newest.' },
      { term: 'Sequence number', definition: 'A per-item counter making loss detectable as gaps.' },
      { term: 'Drain deadline', definition: 'capacity/drain_rate — how long an item can wait before policy bites.' },
    ],
    revisionSummary: [
      'Bounded queue + chosen policy + counted drops = honest data path.',
      'Capacity from burst/stall arithmetic, powers of two for cheap indexing.',
      'ISR producers: drop/overwrite only; backpressure is task-side.',
      'Sequence numbers make gaps visible; counters make loss loggable.',
      'Kernel migration changes the queue implementation, not the design.',
    ],
    furtherReading: [
      { label: 'FreeRTOS — queue documentation (the kernel form of this pattern)', url: 'https://www.freertos.org/', kind: 'docs' },
      { label: 'Wikipedia — Producer–consumer problem', url: 'https://en.wikipedia.org/wiki/Producer%E2%80%93consumer_problem', kind: 'article' },
      { label: 'Wikipedia — Flow control (data)', url: 'https://en.wikipedia.org/wiki/Flow_control_(data)', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
];
