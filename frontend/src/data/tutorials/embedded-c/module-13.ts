import type { TutorialLesson } from '../types';

export const module13Lessons: TutorialLesson[] = [
  {
    id: 'embc-m13-l1',
    title: 'Superloops, State Machines and Event-Driven Design',
    summary:
      'The two structures behind almost all bare-metal firmware: the non-blocking superloop and the enum-plus-switch state machine, composed into event-driven designs.',
    objectives: [
      'Structure a superloop that never blocks and does work only when due.',
      'Implement state machines with enum states, a switch, and tick-based transitions.',
      'Distinguish level-driven from event-driven firmware and choose per subsystem.',
      'Compose multiple independent state machines in one loop.',
    ],
    whyItMatters:
      'Given a blank main.c, these patterns are what you write. They are also the vocabulary for reading others\' firmware — and for judging it: a blocking call inside a superloop or a hidden state in three booleans are instant review findings.',
    prerequisites: ['embc-m05-l3', 'embc-m04-l3'],
    explanation:
      'The **superloop** is bare metal\'s entire scheduling mechanism: `for(;;) { service everything that is due; }`. Module 05-l3 supplied the non-blocking skeleton; architecture adds the discipline that *nothing inside ever waits*. Each subsystem is a function that checks its own inputs and returns immediately. The loop\'s worst-case iteration time is the sum of the worst cases of its callees — a number you can measure and defend, unlike the unbounded delays of a blocking design.\n\n### State machines: enum + switch\n\nAny subsystem with modes (a traffic light, a door, a communication handshake) becomes a **finite state machine (FSM)**: states are an `enum`, transitions live in one `switch`, and the only variables are the current state and per-state timers/counters. The payoff is reviewability: every behaviour is visible in one function, impossible states are unrepresentable, and adding a state touches one place. Contrast the alternative — four booleans whose sixteen combinations include five that make no sense — and the FSM pays for its ceremony immediately.\n\n### Levels versus events\n\nA **level-driven** subsystem reads current conditions every iteration (button state, temperature level). An **event-driven** one reacts to *transitions* — events queued by ISRs (module 06-l3) or produced by other subsystems. Most firmware is a mix: level-driven control loops plus event-driven user interface. The architecture decision is per-subsystem, recorded in the design: "button = event-driven (edges), heater = level-driven (thermostat)".\n\n### Composing\n\nMultiple FSMs coexist in one loop, each with its own cadence (module 05-l3 scheduler). They communicate through *data* (a shared state struct owned by one writer) or *events* (a queue). What they never do is call each other\'s internals — module boundaries (lesson 2) keep each machine testable and swappable.',
    deepDive:
      '### The enum-state discipline, honestly\n\nRules that keep FSMs maintainable: one function per machine (`light_step(uint32_t now)`); transitions only inside the switch; entry actions executed on transition (set outputs once, not every iteration); a defined *initial* state; and for anything safety-adjacent, an explicit invalid-state handler that drives outputs safe and logs. A subtle C point: enum values are ints — comparisons and switch are fine, but do not rely on the underlying numbering outside the machine; the enum names *are* the interface. Missed-entry-action bugs (outputs set on transition instead of in-state entry) produce flicker and are the most common FSM defect in review.\n\n### Hierarchical and orthogonal machines\n\nTwo extensions appear in larger firmware. **Hierarchical** states nest (an "error" state that overrides everything) — implementable with a guard checked before the normal switch. **Orthogonal** machines run side by side (a button FSM and a display FSM), which the superloop gives you for free. Full statechart formalisms (with history states and transitions between levels) exist in the literature and in commercial frameworks; for small firmware, a handful of flat machines with a documented priority rule ("error machine wins") delivers 90% of the benefit. Recognise the vocabulary so datasheets and framework docs read cleanly — then keep your implementation boring, because boring FSMs debug well.\n\n### Event contracts between machines\n\nWhen machine A signals machine B, the contract is: what event, what payload, what ordering guarantees. The cheapest reliable contract is a single-producer queue of small events (module 07-l3\'s ring buffer with event structs); the cheapest unreliable one is a shared boolean (racy — module 06-l2). Decide per producer-consumer pair, write it in the header, and the system stays reviewable as it grows. The module 18 producer/consumer project exercises exactly this contract in testable isolation.',
    examples: [
      {
        title: 'Traffic-light FSM on ticks, fully traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\ntypedef enum {\n    LIGHT_RED = 0,\n    LIGHT_GREEN,\n    LIGHT_YELLOW,\n    LIGHT_COUNT\n} light_state_t;\n\nstatic const char *light_name(light_state_t s) {\n    switch (s) {\n    case LIGHT_RED:    return "RED";\n    case LIGHT_GREEN:  return "GREEN";\n    case LIGHT_YELLOW: return "YELLOW";\n    default:           return "?";\n    }\n}\n\n/* per-state durations in ticks (seconds here) */\nstatic const uint32_t light_duration[LIGHT_COUNT] = { 3u, 3u, 1u };\n\nstatic light_state_t light_current = LIGHT_RED; /* defined initial state */\nstatic uint32_t      light_time_in_state = 0u;\n\nstatic void light_step(uint32_t now) {\n    light_time_in_state++;\n    if (light_time_in_state < light_duration[light_current]) {\n        return;\n    }\n    /* transition + entry action (state time resets) */\n    light_time_in_state = 0u;\n    switch (light_current) {\n    case LIGHT_RED:    light_current = LIGHT_GREEN;  break;\n    case LIGHT_GREEN:  light_current = LIGHT_YELLOW; break;\n    case LIGHT_YELLOW: light_current = LIGHT_RED;    break;\n    default:           light_current = LIGHT_RED;    break; /* invalid guard */\n    }\n    printf("[t=%us] -> %s\\n", (unsigned)now, light_name(light_current));\n}\n\nint main(void) {\n    printf("[t=0s] start in %s\\n", light_name(light_current));\n    for (uint32_t sec = 1u; sec <= 8u; sec++) {\n        light_step(sec);\n    }\n    return 0;\n}',
        explanation: [
          'Start in RED. Durations: RED 3, GREEN 3, YELLOW 1.',
          'Tick 1, 2: still RED (1 < 3, 2 < 3). Tick 3: 3 >= 3 → transition to GREEN, print.',
          'Ticks 4, 5: GREEN holds; tick 6: 3 >= 3 → YELLOW, print.',
          'Tick 7: 1 >= 1 → RED, print. Ticks 8: RED holds (1 < 3).',
          'Exact output: `[t=0s] start in RED` / `[t=3s] -> GREEN` / `[t=6s] -> YELLOW` / `[t=7s] -> RED`.',
          'Entry actions (time reset) happen exactly at transitions; the default case guards an impossible state — cheap insurance the compiler cannot check away.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'Traffic-light state machine',
        content:
          '          +------+  3s   +-------+   3s   +--------+\n          | RED  | ----> | GREEN | -----> | YELLOW |\n          +------+       +-------+        +--------+\n             ^                                 |\n             |               1s                |\n             +---------------------------------+',
        caption:
          'Three states, timed transitions, one entry point. The whole behaviour fits in the diagram — and in one switch statement.',
      },
    ],
    tables: [
      {
        caption: 'Level-driven vs event-driven per subsystem',
        headers: ['Subsystem', 'Style', 'Reason'],
        rows: [
          ['Thermostat control', 'Level', 'Acts on current temperature each cycle'],
          ['Button interface', 'Event', 'Edges matter, not held levels'],
          ['UART command parser', 'Event', 'Reacts to received bytes (queued)'],
          ['Display refresh', 'Level (periodic)', 'Repaints current data every tick'],
        ],
      },
      {
        caption: 'FSM review checklist',
        headers: ['Check', 'Why'],
        rows: [
          ['One enum, one switch, one step function', 'Whole behaviour visible in one place'],
          ['Defined initial state', 'No accidental dependence on zero-values'],
          ['Entry actions on transition only', 'Prevents per-iteration output flicker'],
          ['Invalid-state guard drives safe', 'Enum misuse or corruption recovers safely'],
          ['State + timers only as state', 'No hidden booleans duplicating state'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Blocking inside a state (delay_ms in a state handler).',
        fix:
          'States own time via tick counters (the example); blocking freezes every other machine in the loop. The module 05-l3 timestamp pattern is the tool.',
      },
      {
        mistake: 'Encoding state in several booleans.',
        fix:
          'One enum state. Multi-boolean encodings admit nonsense combinations and scatter transitions across the file — unreviewable and untestable.',
      },
      {
        mistake: 'Performing output side effects on every iteration of a state.',
        fix:
          'Execute entry actions once, at the transition. Repeating them every tick causes flicker (outputs) or spam (logs), and hides real state changes in noise.',
      },
    ],
    guidedPractice: {
      title: 'Build a door FSM',
      brief:
        'Model a motorized door: states CLOSED, OPENING, OPEN, CLOSING; a button event toggles between CLOSED and OPEN via the moving states (5 s to travel, block events while moving); an obstacle sensor in OPENING/CLOSING reverses direction. Write the enum, durations/events, and trace: button press, 5 s, button press, 2 s, obstacle, 5 s.',
      expectedBehavior:
        'CLOSED --press--> OPENING (5s) --> OPEN --press--> CLOSING (2s) --obstacle--> OPENING (5s) --> OPEN. Ignored presses during motion. Trace prints: -> OPENING, -> OPEN, -> CLOSING, -> OPENING, -> OPEN.',
      hints: [
        'Events (button/obstacle) arrive between ticks — model them as flags consumed in the step function.',
        'Transitions out of moving states are time-based; direction is data per state.',
      ],
    },
    practiceExercises: [
      {
        title: 'Refactor booleans to a state',
        brief:
          'This state encoding is broken: `bool heater_on; bool door_open; bool alarm_armed;` — three booleans for one thermostat-alarm subsystem with only four legal combinations. Identify the illegal combinations and rewrite as an enum with exactly the legal states.',
        expectedBehavior:
          'Legal: heater off+armed, heater off+disarmed, heater on+door open, heater on+alarm sounding — depending on the domain intent; the point is enumerating the 4 legal of 8 possible and deleting the rest. Enum: {IDLE, ARMED, HEATING, ALARM} with transitions documented.',
        hints: [
          '8 combinations, fewer legal — list which are nonsense.',
          'The enum names are the design documentation.',
        ],
      },
      {
        title: 'Two machines, one loop',
        brief:
          'Compose the traffic-light FSM (1 s cadence) and a button FSM (10 ms cadence) in one superloop with the module 05-l3 scheduler. Write the task table and state which machine runs more often and why that asymmetry is correct.',
        expectedBehavior:
          'Tasks: {button, 10 ms}, {light, 1000 ms}. The button runs 100x more often — input responsiveness must exceed human perception, while the light\'s cadence is its own physics. Cadence is a per-machine property, set by the machine\'s timing needs, not the loop\'s.',
        hints: [
          'The scheduler table maps cadence to need.',
          'Both machines stay non-blocking — that is what lets them share the loop.',
        ],
      },
    ],
    assessment: {
      title: 'Architecture patterns checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'The cardinal rule of a superloop is:',
          options: [
            'Nothing inside ever blocks',
            'Loop as fast as possible',
            'Each iteration must be identical',
            'No function calls inside',
          ],
          answer: 'Nothing inside ever blocks',
          explanation:
            'Blocking freezes all subsystems; non-blocking service functions keep the loop\'s worst-case time bounded.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In the traffic-light FSM, the transition to GREEN happens when:',
          options: [
            'time_in_state >= duration[RED]',
            'A button is pressed',
            'The timer interrupt fires',
            'time_in_state == 0',
          ],
          answer: 'time_in_state >= duration[RED]',
          explanation:
            'Each state holds for its duration; the step function compares and transitions.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Entry actions (like resetting outputs) should run on every loop iteration while a state is active.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'They run once, at the transition. Repeating them every iteration causes flicker and log spam.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does the trace print at t=7?',
          code: '/* durations: RED 3, GREEN 3, YELLOW 1; started in RED at t=0 */',
          options: ['-> RED', '-> GREEN', '-> YELLOW', 'nothing'],
          answer: '-> RED',
          explanation:
            'YELLOW holds 1 s (entered at t=6), so at t=7 it transitions to RED.',
          hint: 'YELLOW has the shortest duration.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the two interaction styles for subsystems and one example of each.',
          answer: 'level-driven (thermostat reading temperature each cycle) and event-driven (button edge events)',
          explanation:
            'Levels act on current conditions; events react to transitions. Most firmware mixes both, per subsystem.',
          hint: 'Conditions versus transitions.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Superloop', definition: 'The non-blocking for(;;) loop that services all subsystems; the bare-metal scheduler.' },
      { term: 'Finite state machine (FSM)', definition: 'Enum states + one switch of transitions + per-state data; the unit of subsystem behaviour.' },
      { term: 'Entry action', definition: 'Output/state changes executed once, at the transition into a state.' },
      { term: 'Event-driven', definition: 'Subsystems reacting to queued transitions rather than polling conditions.' },
    ],
    revisionSummary: [
      'Superloop: never block; worst-case iteration time is measurable.',
      'FSM: enum + switch + tick timers; entry actions on transition.',
      'Level vs event style chosen per subsystem, documented.',
      'Machines share data through owned structs and queues, never internals.',
      'Invalid-state guards drive safe.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Finite-state machine', url: 'https://en.wikipedia.org/wiki/Finite-state_machine', kind: 'article' },
      { label: 'Wikipedia — Event loop', url: 'https://en.wikipedia.org/wiki/Event_loop', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m13-l2',
    title: 'Layering, Module Boundaries and Headers',
    summary:
      'BSP, drivers, services, application: the dependency direction that keeps firmware portable and testable, plus header/source discipline that makes boundaries real.',
    objectives: [
      'Name the standard firmware layers and the one-directional dependency rule.',
      'Restructure a naive main into layered modules.',
      'Design a module API: header contract, opaque internals, init/step pattern.',
      'Use static and storage choices to enforce boundaries.',
    ],
    whyItMatters:
      'Layering is what lets firmware survive its second chip, its second developer and its first test suite. It is also the difference between code you can unit-test on a host (module 17) and code welded to hardware.',
    prerequisites: ['embc-m13-l1'],
    explanation:
      'Firmware layering assigns every file a stratum, with dependencies pointing **only downward**:\n\n- **BSP / platform layer**: vendor headers, startup, clock config, register definitions — everything chip-specific.\n- **Driver layer**: one module per peripheral *function* (led.c, button.c, uart.c, adc.c) — speaks registers downward, offers intent-revealing APIs upward (`led_set(true)`, not `GPIOA->ODR |= 8`).\n- **Service layer**: hardware-independent reusable logic — ring buffers, filters, schedulers, protocol parsers.\n- **Application layer**: product behaviour — state machines composing the drivers and services.\n\nThe rule that makes this more than a folder layout: a lower layer must never `#include` a higher one, and driver headers must not leak register names upward. When a driver header shows `uint32_t gpio_base`, the boundary has leaked; when it shows `led_init(uint8_t pin)`, the boundary holds.\n\n### The header as contract\n\nA module\'s .h is its public promise: the types it owns, the functions it offers, and the preconditions (call `x_init()` before `x_step()`). Everything else is `static` in the .c. A clean header documents: purpose (2 lines), ownership (who calls init/step, from which context — ISR or main), thread/ISR-safety contract (module 07-l3\'s SPSC note is exactly this), and error semantics. If a reviewer needs to read the .c to know how to use the module, the header failed.\n\n### The init/step pattern\n\nModules expose two standard entries: `x_init()` (configure hardware once; safe-state everything) and `x_step()` (non-blocking service, called by the scheduler at the module\'s cadence). ISRs, where the hardware demands them, live in the BSP/driver boundary and feed the module through its queue — never through back-calls into the application. This uniform shape is what makes the scheduler table of module 05-l3 and the unit tests of module 17 possible: every module is constructed and driven the same way.',
    deepDive:
      '### The worked restructure, honestly\n\nThe classic naive main: forty lines of register pokes, magic numbers, and business logic interleaved — it works, and it is untestable and unportable. The restructure in the example is deliberately mechanical: extract the register pokes into a driver (unchanged behaviour), extract the policy into the app (unchanged behaviour), and let the scheduler own time. Each extraction is separately verifiable — the same refactor discipline as any codebase, with one embedded addition: the *hardware* interaction is exactly the part you stub in tests, so the boundary you draw in the refactor is the boundary your tests will mock. Refactoring and testability are the same activity at different times.\n\n### static, const and the C tools for boundaries\n\nC has no packages; `static` is the boundary: file-scoped functions and data cannot be reached from outside, so the header is provably the whole API. `const` data goes to flash (module 02-l3); `static const` tables inside a .c are private to the module. Header hygiene completes it: include guards (or `#pragma once`), no variable definitions in headers (declarations with `extern` if truly needed — usually not), and no `#include` in headers that a forward declaration could replace (compile-time hygiene keeps builds fast and dependencies honest). These are boring rules with outsized consequences: every "why does touching this file rebuild everything" mystery starts with a header hygiene violation.\n\n### Build-time configuration, honestly\n\nProduct variants (with/without display, different sensor) are handled at compile time: a config header with `#define`s, per-variant build flags, and modules that compile out cleanly. The discipline: variant code selects *configuration values*, not divergent logic paths where possible — five `#ifdef`s in one file is maintenance debt; five config values in one table is a product line. Where logic must diverge, isolate it behind the module API so the application never sees the variant. This is also the honest limit of layering: chip *errata* workarounds live in the BSP with a comment naming the erratum — pretending the hardware is uniform helps nobody.',
    examples: [
      {
        title: 'Naive main versus the layered restructure',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* ---- NAIVE main (for contrast, kept tiny): ----\n * volatile uint8_t *ODR = ...; *ODR |= (1<<3); delay_loop(500000);\n * *ODR &= ~(1<<3); delay_loop(500000); ... business logic mixed with\n * register pokes, blocking delays, untestable, unportable.\n * ---- LAYERED version below: ---- */\n\n/* --- driver layer: led.c (hardware specifics quarantined here) --- */\nstatic volatile uint8_t MOCK_GPIOA_ODR = 0x00u; /* BSP stand-in */\n#define LED_PIN 3u\n\nstatic void led_init(void) {\n    MOCK_GPIOA_ODR &= (uint8_t)~(1u << LED_PIN);       /* safe state */\n}\nstatic void led_set(uint8_t on) {\n    if (on != 0u) { MOCK_GPIOA_ODR |= (uint8_t)(1u << LED_PIN); }\n    else          { MOCK_GPIOA_ODR &= (uint8_t)~(1u << LED_PIN); }\n}\nstatic uint8_t led_state(void) {\n    return (uint8_t)((MOCK_GPIOA_ODR >> LED_PIN) & 1u);\n}\n\n/* --- application layer: blink policy (pure logic, host-testable) --- */\ntypedef struct {\n    uint32_t period;      /* ticks between toggles */\n    uint32_t last_toggle;\n    uint8_t  on;\n} blink_t;\n\nstatic void blink_init(blink_t *b, uint32_t period) {\n    b->period = period;\n    b->last_toggle = 0u;\n    b->on = 0u;\n}\nstatic void blink_step(blink_t *b, uint32_t now) {\n    if ((uint32_t)(now - b->last_toggle) >= b->period) {\n        b->last_toggle += b->period;   /* fixed phase (m05-l3) */\n        b->on = (uint8_t)(b->on == 0u);\n        led_set(b->on);                /* one downward call   */\n    }\n}\n\nint main(void) {\n    static blink_t blink;\n    led_init();\n    blink_init(&blink, 500u);\n\n    for (uint32_t t = 0u; t <= 1100u; t++) {\n        blink_step(&blink, t);\n    }\n    printf("final LED state: %u\\n", (unsigned)led_state());\n    return 0;\n}',
        explanation: [
          'The driver owns every register detail; the application owns policy and speaks intent (`led_set`). Neither knows the other\'s internals.',
          'blink_step is pure logic over a timestamp — it runs unchanged on a host in unit tests (module 17), because the only hardware call is the one-line led_set boundary.',
          'Trace: with last_run starting at 0, toggles land at t = 500 (on) and t = 1000 (off) — the first fires when the counter reaches the period. At t = 1100 the LED is OFF.',
          'Exact output: `final LED state: 0`.',
          'Dependency direction: app -> driver -> registers. Nothing points upward; the mock ODR sits at the BSP seam where a vendor header would sit.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Layer stack and dependency direction',
        content:
          '  +---------------------------+\n  | APPLICATION                |  state machines, product logic\n  |  (blink.c, ui.c)           |\n  +-------------|-------------+\n                | calls down only\n  +-------------v-------------+\n  | SERVICES                   |  ringbuf, filters, scheduler\n  +-------------|-------------+\n                |\n  +-------------v-------------+\n  | DRIVERS                    |  led, button, uart, adc\n  +-------------|-------------+\n                |\n  +-------------v-------------+\n  | BSP / PLATFORM             |  vendor headers, startup, registers\n  +---------------------------+\n\n  NEVER: an upward #include, a register name above the drivers,',
        caption:
          'Dependencies point down only. Each seam (app/driver, driver/BSP) is exactly where test mocks attach.',
      },
    ],
    tables: [
      {
        caption: 'Module API design checklist',
        headers: ['Element', 'Standard'],
        rows: [
          ['Lifecycle', 'x_init() once; x_step() non-blocking at a cadence'],
          ['Context contract', 'Documented per function: main-loop only, ISR-safe, or SPSC'],
          ['Error semantics', 'Return codes from module 13-l3; no silent failures'],
          ['Header contents', 'Purpose, ownership, API, contracts — no internals'],
          ['statics', 'All internal functions/data static in the .c'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Application code reaching into registers "just this once".',
        fix:
          'Every register poke above the driver layer is a portability and testability leak. Add the one function the app needs to the driver instead — the exception becomes the norm otherwise.',
      },
      {
        mistake: 'Headers full of implementation: variables defined, includes stacked, macros leaked.',
        fix:
          'Headers are contracts: types and function declarations only, minimal includes, guards present. Implementation lives in the .c behind static.',
      },
      {
        mistake: 'Drivers calling upward (driver knows about the application).',
        fix:
          'Downward calls only; upward communication is data (queues/flags) or callbacks registered explicitly by the app. Implicit back-calls make layers untestable in isolation.',
      },
    ],
    guidedPractice: {
      title: 'Extract a driver from naive code',
      brief:
        'Given a naive block: `if (PINB & (1<<2)) { counter++; if (counter > 5) PORTB |= (1<<4); }` — design the two modules (button driver, indicator app) with their headers\' function lists, and state which side owns the debounce and which owns the threshold.',
      expectedBehavior:
        'button driver: button_init(), button_step() (owns sampling + debounce, emits pressed events), button_pressed_event(). Indicator app: indicator_init(), indicator_step(event) — owns the >5 threshold policy. Registers appear only in the driver; the app sees events.',
      hints: [
        'Hardware interaction stays below the seam; policy above.',
        'Name the event the driver emits.',
      ],
    },
    practiceExercises: [
      {
        title: 'Audit a header',
        brief:
          'Critique this header: `#include "stm32f1xx.h"\nuint32_t counter;\nvoid ui_step(void) { GPIOA->ODR |= 1; }` — list every violation and rewrite it as a proper contract.',
        expectedBehavior:
          'Violations: chip header included (leaks vendor types), variable *defined* in a header (linker error risk), function *defined* in a header (should be declared), register access in the public surface, no guards, no purpose/contract docs. Rewrite: include guard; void ui_init(void); void ui_step(void); doc comment stating cadence and context; all implementation in ui.c behind static.',
        hints: [
          'A header declares; it does not define or reach into hardware.',
          'Guards and docs are part of the contract.',
        ],
      },
      {
        title: 'Where does this code go?',
        brief:
          'Place each in a layer and justify: (a) startup_stm32f1.c vector table; (b) a PIDs controller for motor speed; (c) the ADC reading function; (d) "if battery < 3.0 V enter low-power mode" product rule; (e) the ring buffer.',
        expectedBehavior:
          '(a) BSP. (b) service (hardware-independent algorithm) — parameterised by measurements. (c) driver. (d) application. (e) service.',
        hints: [
          'Ask: does it name registers (BSP), a peripheral function (driver), a reusable algorithm (service), or product behaviour (app)?',
          'The PID is reusable regardless of motor — that is the service test.',
        ],
      },
    ],
    assessment: {
      title: 'Layering checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'The core dependency rule of firmware layering is:',
          options: [
            'Dependencies point downward only',
            'Every layer includes every other',
            'Application includes vendor headers directly',
            'Drivers call the application when events occur',
          ],
          answer: 'Dependencies point downward only',
          explanation:
            'Upward communication is data/queues, never includes or back-calls — that is what keeps layers testable and portable.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'The standard module lifecycle pair is:',
          options: ['x_init() and x_step()', 'x_open() and x_close()', 'x_malloc() and x_free()', 'x_start() and x_end()'],
          answer: 'x_init() and x_step()',
          explanation:
            'Init once (safe states), step non-blocking at a cadence — the uniform shape the scheduler and tests rely on.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A driver header may expose register macros so the application can optimise access.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'Register details stay below the driver boundary; exposure leaks portability and breaks host-testability.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'In the layered example, what is the LED state after t=1100?',
          code: '/* last_run starts at 0: toggles at t=500 (on) and t=1000 (off); starts OFF */',
          options: ['OFF (0)', 'ON (1)', 'Undefined', 'Blinking'],
          answer: 'OFF (0)',
          explanation:
            'The difference starts at 0, so the first toggle lands at t=500 (on) and the second at t=1000 (off) — two toggles leave it OFF at t=1100.',
          hint: 'Count the toggles up to 1100; the first fires at the first full period.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Which C keyword makes a module\'s internals unreachable from other files, and where do they live instead?',
          answer: 'static — internal functions and data live in the .c file, file-scoped',
          explanation:
            'static is C\'s boundary mechanism; the header then provably contains the whole public API.',
          hint: 'One keyword, file scope.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Layering', definition: 'BSP -> drivers -> services -> application with downward-only dependencies.' },
      { term: 'Module boundary', definition: 'The header contract plus static internals — the seam tests mock and ports replace.' },
      { term: 'init/step pattern', definition: 'One-time initialisation and a non-blocking periodic service call per module.' },
      { term: 'Include guard', definition: 'The macro (or #pragma once) preventing double inclusion of a header.' },
    ],
    revisionSummary: [
      'Four layers, downward dependencies, headers as contracts.',
      'init/step shapes every module; ISRs feed queues at the BSP seam.',
      'static enforces boundaries the compiler can check.',
      'Variant handling = config values, not scattered #ifdefs.',
      'The refactor boundary is the future mock boundary.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Multitier architecture (layering concept)', url: 'https://en.wikipedia.org/wiki/Multitier_architecture', kind: 'article' },
      { label: 'Wikipedia — Information hiding', url: 'https://en.wikipedia.org/wiki/Information_hiding', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m13-l3',
    title: 'Error Handling, Watchdogs and Logging Strategy',
    summary:
      'Return codes that callers actually check, a watchdog that detects real hangs, and logging that survives the journey from flash-sized budget to serial console.',
    objectives: [
      'Design a module error model: status enums, error propagation, and fault logging.',
      'Explain watchdog operation and implement the kick-only-when-healthy pattern.',
      'Choose a logging strategy within flash/RAM/CPU budgets.',
      'Tie errors, watchdogs and logging into one coherent failure policy.',
    ],
    whyItMatters:
      'The difference between firmware that works and firmware you can operate is the failure policy: what happens when the sensor hangs, the buffer overflows, or the CPU locks. Watchdogs and error handling are not features — they are the product\'s survival reflexes.',
    prerequisites: ['embc-m13-l2', 'embc-m05-l3'],
    explanation:
      '### Error model: statuses, not hope\n\nEvery module function that can fail returns a **status** — typically an enum (`OK`, `ERR_TIMEOUT`, `ERR_NACK`, `ERR_BUSY`, `ERR_RANGE`) or 0/negative ints by C convention. Callers *propagate or handle* — never ignore. The discipline: drivers report *what happened* (timeout, NACK, range), services decide *policy* (retry, degrade, escalate), and the application decides *severity* (log and continue, enter safe state, reset). Mixed-up layers produce the classic mess: a driver deciding to reboot. Two standard refinements: per-module error counters (for diagnostics), and a "last error" latch in a status struct for post-mortem reading over the console.\n\n### The watchdog, properly used\n\nA **watchdog timer (WDT)** counts down continuously; firmware must *kick* (refresh) it before it expires or the chip resets. The naive use — kick in the superloop or, worse, a timer ISR — detects only total CPU death. The professional use: kick **only when health checks pass**. The health checks are the system\'s own heartbeat assertions: every scheduled task ran this cycle, every driver reports no latched fatal error, and no safety interlock is violated. A system stuck in an infinite loop skips its kick and resets; a system whose sensor driver hung (returning timeouts) skips its kick *because the check failed* — the watchdog then resets a system that was running-but-broken, which is the point.\n\n### Logging within a budget\n\nEmbedded logging has three costs: **flash** (format strings and code), **CPU** (formatting and transmit time), and **bandwidth** (UART bytes). The standard strategy: short static level-tagged messages (`"[E][i2c] nack 0x48\\n"`), a severity scheme (E/W/I/D) compiled in by level, formatting with a small integer-only formatter (not full printf — it drags in megabytes on small parts), and asynchronous emission through a ring buffer (module 07-l3) so logging never blocks the loop. Log *events and transitions*, not per-iteration values; per-iteration spam both floods the link and — worse — hides the transitions that matter.',
    deepDive:
      '### Watchdog timing arithmetic, honestly\n\nTwo timeouts interact: the watchdog period must exceed the worst-case main-loop iteration (plus margin) — if the loop legitimately takes 50 ms worst case, a 20 ms watchdog resets healthy systems under load. Set the WDT from the *measured* worst-case iteration (module 05-l3 gives you the instrumentation), with 2-4x margin, and document it. Windowed watchdogs (some families) additionally reject kicks that arrive *too early* — detecting runaway loops that kick frantically — which forces the kick code to be genuinely scheduled. On Cortex-M there is also the independent watchdog (IWDG, runs from its own low-speed oscillator — survives clock failures) versus the window watchdog (WWDG, bus-clocked — catches clock problems too); which one, and its clock source, is vendor-manual material with real safety consequences.\n\n### Safe states and the reset ladder\n\nWhen a fatal error is detected, firmware has a ladder of responses: (1) log and retry (transient faults); (2) degrade (disable the failed feature, keep the rest); (3) enter safe state (outputs off, heaters off — module 12-l2\'s contract) then reset; (4) reset and, on boot, *check why* (the reset-cause register distinguishes watchdog from power-on from software reset — module 11-l3 used it to diagnose brown-outs). The ladder is written down per failure mode in the design: "I2C sensor dead → degrade, log, no reset"; "scheduler overrun → safe state, reset". Consistency here is what makes field failures diagnosable: every reset has a recorded cause, every error a path.\n\n### Log formatting and the console, honestly\n\nA tiny formatter (integers, hex, fixed-point strings) covers 95% of embedded logs at a fraction of printf\'s cost; module 10-l3\'s fixed-point discipline feeds it directly. Log *identifiers* over prose where flash is tight (`"E i2c nack dev=48 err=1"`) and keep a decoder map on the host side — the trade is flash versus readability, made consciously per product. Never log from inside an ISR (reentrancy); ISRs set flags/counters that the loop logs. And every log line gets a monotonic timestamp (module 05-l3\'s tick) — untimed logs make rate and ordering questions unanswerable in the field.',
    examples: [
      {
        title: 'Kick-only-when-healthy watchdog pattern, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of a watchdog. Real kick = one register write\n * (vendor-specific: IWDG key sequence on STM32, WDTCSR on ATmega);\n * the pattern below is what makes the kick meaningful. */\nstatic uint32_t mock_wdt_count = 0u;\nstatic uint32_t mock_wdt_kicks = 0u;\nstatic uint32_t mock_wdt_resets = 0u;\n\n#define TASK_BUTTON  (1u << 0)\n#define TASK_SENSOR  (1u << 1)\n#define TASK_LOG     (1u << 2)\n#define TASKS_REQUIRED (TASK_BUTTON | TASK_SENSOR | TASK_LOG)\n\nstatic void watchdog_kick(void) {\n    mock_wdt_kicks++;\n    mock_wdt_count = 0u;              /* reload the counter */\n}\n\n/* Called once per loop: refresh ONLY if every required task ran. */\nstatic void watchdog_service(uint8_t ran_mask) {\n    mock_wdt_count++;\n    if ((ran_mask & TASKS_REQUIRED) == TASKS_REQUIRED) {\n        watchdog_kick();\n    } else {\n        printf("  health check FAILED (ran=0x%X): no kick\\n",\n               (unsigned)ran_mask);\n        if (mock_wdt_count >= 3u) {\n            mock_wdt_resets++;\n            printf("  WATCHDOG RESET\\n");\n            mock_wdt_count = 0u;\n        }\n    }\n}\n\nint main(void) {\n    printf("loop 1: all tasks ran\\n");\n    watchdog_service((uint8_t)(TASK_BUTTON | TASK_SENSOR | TASK_LOG));\n\n    printf("loop 2: sensor driver hung\\n");\n    watchdog_service((uint8_t)(TASK_BUTTON | TASK_LOG));\n\n    printf("loop 3: still hung\\n");\n    watchdog_service((uint8_t)(TASK_BUTTON | TASK_LOG));\n\n    printf("loop 4: still hung\\n");\n    watchdog_service((uint8_t)(TASK_BUTTON | TASK_LOG));\n\n    printf("kicks=%u resets=%u\\n",\n           (unsigned)mock_wdt_kicks, (unsigned)mock_wdt_resets);\n    return 0;\n}',
        explanation: [
          'Loop 1: all three task bits set → kick fires, counter reloads.',
          'Loops 2-4: the sensor bit is missing → health check fails → no kick; the mock watchdog counts toward expiry.',
          'At loop 4 the counter reaches 3 → simulated reset.',
          'Exact output: `loop 1: all tasks ran` / `loop 2: sensor driver hung` / `  health check FAILED (ran=0x5): no kick` / `loop 3: still hung` / `  health check FAILED (ran=0x5): no kick` / `loop 4: still hung` / `  health check FAILED (ran=0x5): no kick` / `  WATCHDOG RESET` / `kicks=1 resets=1`.',
          'Compare with the naive design (kick every loop unconditionally): it would have kicked through all four loops and never reset — the hung sensor would have gone undetected forever. The health mask is the entire difference.',
        ],
      },
      {
        title: 'Status propagation up the layers, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\ntypedef enum {\n    ST_OK = 0,\n    ST_TIMEOUT,\n    ST_NACK,\n    ST_RANGE\n} status_t;\n\nstatic const char *status_name(status_t s) {\n    switch (s) {\n    case ST_OK:      return "OK";\n    case ST_TIMEOUT: return "TIMEOUT";\n    case ST_NACK:    return "NACK";\n    default:         return "RANGE";\n    }\n}\n\n/* driver layer: reports what happened */\nstatic status_t sensor_read_mock(uint8_t device_present) {\n    return (device_present != 0u) ? ST_OK : ST_NACK;\n}\n\n/* service layer: policy - retry once */\nstatic status_t sensor_read_retried(uint8_t device_present, uint8_t *attempts) {\n    status_t s = sensor_read_mock(device_present);\n    *attempts = 1u;\n    if (s != ST_OK) {\n        s = sensor_read_mock(device_present);\n        (*attempts)++;\n    }\n    return s;\n}\n\n/* application layer: severity decision */\nstatic void sensor_task(uint8_t device_present) {\n    uint8_t attempts = 0u;\n    status_t s = sensor_read_retried(device_present, &attempts);\n    if (s == ST_OK) {\n        printf("[I][sensor] read ok after %u attempt(s)\\n", (unsigned)attempts);\n    } else {\n        printf("[E][sensor] %s after %u attempts: degrading (no reset)\\n",\n               status_name(s), (unsigned)attempts);\n    }\n}\n\nint main(void) {\n    sensor_task(1u);\n    sensor_task(0u);\n    return 0;\n}',
        explanation: [
          'Driver reports the fact (NACK); the service applies policy (one retry); the application decides severity (log, degrade, no reset) — each layer its own job.',
          'Present device: first attempt OK → `[I][sensor] read ok after 1 attempt(s)`.',
          'Absent device: attempt 1 NACKs, retry NACKs again → `[E][sensor] NACK after 2 attempts: degrading (no reset)`.',
          'Exact output: `[I][sensor] read ok after 1 attempt(s)` / `[E][sensor] NACK after 2 attempts: degrading (no reset)`.',
          'The severity decision (degrade vs reset) lives in the app per the design\'s failure ladder — and the watchdog\'s health mask (first example) reads the outcome of exactly these statuses.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Failure policy flow',
        content:
          '  fault detected (status != OK)\n          |\n          v\n  transient? --yes--> retry (bounded) --> ok? -> continue\n          | no                            |\n          v                               v\n  feature critical? --no--> degrade: disable feature, log, continue\n          | yes\n          v\n  enter safe state (outputs off) -> log -> deliberate reset\n          |\n          v\n  boot: read reset-cause register -> log cause -> recovery init',
        caption:
          'The reset ladder: retry, degrade, safe-state+reset, then a recorded cause at boot. Every failure has a defined path — improvisation at 3 a.m. is not a policy.',
      },
    ],
    tables: [
      {
        caption: 'Logging severity scheme',
        headers: ['Level', 'Use for', 'Compiled in when'],
        rows: [
          ['[E] error', 'Failures, watchdog events, faults', 'Always'],
          ['[W] warning', 'Retries, degraded modes, near-limits', 'Always'],
          ['[I] info', 'State transitions, boot milestones', 'Debug + field builds'],
          ['[D] debug', 'Per-iteration values, diagnostics', 'Debug builds only'],
        ],
      },
      {
        caption: 'Watchdog configuration inputs',
        headers: ['Input', 'Source', 'Typical value'],
        rows: [
          ['Worst-case loop time', 'Measured (module 05-l3 instrumentation)', 'e.g. 12 ms'],
          ['Margin factor', 'Design decision', '2-4x'],
          ['Watchdog period', 'Vendor register + clock', 'e.g. 25-50 ms'],
          ['Health checks', 'Scheduler ran-mask + driver latches', 'Per system'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Kicking the watchdog from a timer ISR.',
        fix:
          'An ISR keeps firing even when the main loop is dead — the kick becomes meaningless. Kick from the main loop\'s health gate (or a dedicated supervised path), where "still healthy" is actually checked.',
      },
      {
        mistake: 'Ignoring return codes "until it works".',
        fix:
          'Every status is propagated or handled; compilers warn on ignored returns (-Wunused-result) and reviewers reject silent drops. One ignored NACK becomes a field unit that "sometimes shows wrong temperature".',
      },
      {
        mistake: 'Logging raw values every loop iteration.',
        fix:
          'Log events and transitions with timestamps; sample values only on change or at a low cadence. Flooded links hide the very transitions that diagnose faults.',
      },
    ],
    guidedPractice: {
      title: 'Design the failure policy for four faults',
      brief:
        'Write the ladder entry (retry/degrade/safe-reset) for: (a) I2C temperature sensor NACKs persistently; (b) watchdog reset observed at boot; (c) button driver sees no edges for 10 minutes; (d) motor overcurrent fault latched. Include what is logged at each.',
      expectedBehavior:
        '(a) degrade: hold last-known/guarded temperature, [W] log each NACK batch, no reset. (b) boot: log cause from reset register, run recovery init (module 09-l3), [W] "recovering from WDT reset". (c) likely unplugged: [W] once, keep polling (level-driven input), no reset. (d) safety fault: safe state immediately (outputs off), [E] log with cause, deliberate reset per policy.',
      hints: [
        'Criticality decides the ladder rung, not annoyance.',
        'Boot-time cause reading closes the loop (module 11-l3).',
      ],
    },
    practiceExercises: [
      {
        title: 'Choose the watchdog period',
        brief:
          'Measured worst-case loop: 12 ms; margin policy: 3x. Give the watchdog period and state what a 15 ms watchdog would do during a legitimate worst-case loop.',
        expectedBehavior:
          'Period = 3 * 12 = 36 ms (round to a vendor-supported value, e.g. 40 ms). A 15 ms watchdog resets healthy systems whenever the loop takes its legitimate worst case — a "random" reset bug born in configuration, not code.',
        hints: [
          'Margin multiplies the measured value.',
          'The reset-cause log would show WDT — with no code fault.',
        ],
      },
      {
        title: 'Design the log line format',
        brief:
          'Design a compact log format for: an I2C NACK with device address and attempt number; a watchdog reset with cause. Write both lines and the host-side decoder entry each needs.',
        expectedBehavior:
          'Example: `[E][i2c] nack dev=48 try=2` and `[E][wdt] reset cause=wdg`. Decoder map: i2c+nack → "sensor bus device not acknowledging", wdt+cause=wdg → "watchdog timeout — hung main loop or failed health check". Identifiers over prose when flash is tight; the decoder carries readability.',
        hints: [
          'Short tags, machine-parseable fields.',
          'The decoder map lives on the host, not in flash.',
        ],
      },
    ],
    assessment: {
      title: 'Error handling checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'The professional watchdog pattern kicks:',
          options: [
            'Only when health checks pass in the main loop',
            'From a timer ISR, every ms',
            'At boot only',
            'Never - resets are bad',
          ],
          answer: 'Only when health checks pass in the main loop',
          explanation:
            'The health gate makes the watchdog detect running-but-broken systems, not just dead CPUs.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which layer decides whether a failed sensor means "degrade" or "reset"?',
          options: [
            'Application (severity policy)',
            'Driver (it saw the error)',
            'The watchdog',
            'The compiler',
          ],
          answer: 'Application (severity policy)',
          explanation:
            'Drivers report facts, services apply retry policy, the application decides severity per the failure ladder.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'The watchdog period should be shorter than the worst-case main-loop iteration.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'It must exceed it with margin (2-4x), or healthy systems reset under legitimate load.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'In the watchdog example, how many kicks occur when the sensor task is hung for 4 loops?',
          code: '/* required = button|sensor|log; sensor bit missing in all 4 loops */',
          options: ['0', '1', '4', '3'],
          answer: '0',
          explanation:
            'The health mask is never complete, so no loop kicks; the mock reset fires at count 3.',
          hint: 'Check the mask condition per loop.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the four rungs of the failure ladder in order.',
          answer: 'retry (bounded), degrade (disable feature), safe state + reset, boot-time cause analysis',
          explanation:
            'Each failure mode maps to a rung by criticality; every reset is explained at boot from the reset-cause register.',
          hint: 'Retry, degrade, reset, diagnose.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Status enum', definition: 'A module\'s error vocabulary (OK, TIMEOUT, NACK...) returned from every fallible call.' },
      { term: 'Watchdog timer (WDT)', definition: 'Hardware countdown that resets the chip unless refreshed — the hang detector.' },
      { term: 'Health gate', definition: 'The check set (tasks ran, no latched faults) that must pass before the watchdog kick.' },
      { term: 'Failure ladder', definition: 'The documented response sequence: retry, degrade, safe-state+reset, boot diagnosis.' },
      { term: 'Reset-cause register', definition: 'Vendor register recording why the chip last reset (power-on, watchdog, software).' },
    ],
    revisionSummary: [
      'Statuses propagate or are handled — never ignored.',
      'Kick the watchdog only through the health gate.',
      'WDT period = measured worst case × 2-4 margin.',
      'Log events with timestamps and levels; format cheaply; never from ISRs.',
      'Every reset has a recorded, boot-time-readable cause.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Watchdog timer', url: 'https://en.wikipedia.org/wiki/Watchdog_timer', kind: 'article' },
      { label: 'Wikipedia — Error detection and correction (concepts)', url: 'https://en.wikipedia.org/wiki/Error_detection_and_correction', kind: 'article' },
      { label: 'www.freertos.org — RTOS concepts (fault handling context)', url: 'https://www.freertos.org/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
];
