import type { TutorialProject } from '../types';

export const cProgrammingProjects: TutorialProject[] = [
  {
    id: 'cpg-proj-sensor-processor',
    title: 'Sensor Data Processor',
    level: 'beginner',
    summary:
      'A complete host-side C program that computes min, max and average over a fixed set of ADC samples using arrays, functions and a clean single-pass design.',
    useCase:
      'The reporting stage of every data-logging product: a batch of raw samples arrives (from a file, a UART burst or a test fixture), and the system must produce summary statistics. Here the samples are fixed data in the program - pure, portable C with no hardware claims - so the logic itself is what you practice.',
    requirements: [
      'Hold 16 ADC samples (0..4095 range) in a fixed int array, declared with a named size constant.',
      'Compute minimum, maximum and integer average using three single-purpose functions.',
      'Print a formatted report: sample count, min, max, average - each on its own labeled line.',
      'All functions take the array as a const pointer plus an explicit length (no reliance on sizeof).',
      'Every magic number appears as a named constant; build with -Wall -Wextra and produce zero warnings.',
    ],
    learningOutcomes: [
      'Decompose a statistics computation into independent, testable functions.',
      'Pass arrays through const-pointer-plus-length interfaces consistently.',
      'Write one-pass min/max/sum scans with correct seeding.',
      'Format a readable report with printf, including the integer-division average.',
    ],
    prerequisites: [
      'cpg-m01-l2',
      'cpg-m02-l1',
      'cpg-m06-l1',
      'cpg-m07-l1',
    ],
    architecture:
      'Four functions over one fixed array. main owns the data and the report; three pure functions each scan once: find_min, find_max and compute_total. The functions receive (const int *data, int n) so they never depend on the array\'s declaration scope and cannot modify the samples. main derives the average from the total, keeping division policy (truncation) in one place. The program is a single .c file at this stage; the natural extension exercise splits it into stats.h/stats.c.',
    steps: [
      {
        title: 'Define the data and the size constant',
        detail:
          'Declare the sample set with a named count so every loop bound derives from one definition. The samples below are a fixed, realistic-looking batch - the program computes over exactly these.',
        code:
          '#include <stdio.h>\n\n#define SAMPLE_COUNT 16\n\nint main(void) {\n    int samples[SAMPLE_COUNT] = {\n        512, 498, 530, 475, 520, 510, 489, 535,\n        502, 476, 518, 531, 495, 507, 522, 480\n    };\n\n    printf("dataset ready: %d samples\\n", SAMPLE_COUNT);\n    return 0;\n}',
      },
      {
        title: 'Add the three scan functions',
        detail:
          'Each function takes the protected input array and its length, seeds from the first element (never from 0), and scans with an i < n bound. compute_total returns the sum; the average policy stays in main.',
        code:
          'static int find_min(const int *data, int n) {\n    int min = data[0];\n    for (int i = 1; i < n; i++) {\n        if (data[i] < min) {\n            min = data[i];\n        }\n    }\n    return min;\n}\n\nstatic int find_max(const int *data, int n) {\n    int max = data[0];\n    for (int i = 1; i < n; i++) {\n        if (data[i] > max) {\n            max = data[i];\n        }\n    }\n    return max;\n}\n\nstatic int compute_total(const int *data, int n) {\n    int total = 0;\n    for (int i = 0; i < n; i++) {\n        total += data[i];\n    }\n    return total;\n}',
      },
      {
        title: 'Wire the report in main',
        detail:
          'Call the three functions, compute the average once (one named division with a comment on truncation), and print the four report lines.',
        code:
          'int main(void) {\n    int samples[SAMPLE_COUNT] = {\n        512, 498, 530, 475, 520, 510, 489, 535,\n        502, 476, 518, 531, 495, 507, 522, 480\n    };\n\n    int min = find_min(samples, SAMPLE_COUNT);\n    int max = find_max(samples, SAMPLE_COUNT);\n    int total = compute_total(samples, SAMPLE_COUNT);\n\n    /* integer division: the average truncates by design */\n    int average = total / SAMPLE_COUNT;\n\n    printf("samples : %d\\n", SAMPLE_COUNT);\n    printf("min     : %d\\n", min);\n    printf("max     : %d\\n", max);\n    printf("average : %d\\n", average);\n    return 0;\n}',
      },
      {
        title: 'Build strict and verify against a hand trace',
        detail:
          'Compile with gcc -Wall -Wextra -Werror sensor.c -o sensor. Before running, hand-trace: sum the 16 samples on paper (they total 8100), then compare min, max and 8100 / 16 = 506 against the program output.',
      },
    ],
    starterCode: {
      title: 'Project scaffold',
      language: 'c',
      code:
        '#include <stdio.h>\n\n#define SAMPLE_COUNT 16\n\n/* TODO: find_min, find_max, compute_total (const int *data, int n) */\n\nint main(void) {\n    int samples[SAMPLE_COUNT] = {\n        512, 498, 530, 475, 520, 510, 489, 535,\n        502, 476, 518, 531, 495, 507, 522, 480\n    };\n\n    /* TODO: report: samples / min / max / average */\n\n    return 0;\n}',
      explanation: [
        'The scaffold fixes the data and the size constant; the three functions and the report are yours to fill.',
        'Keep the (const int *data, int n) signature exactly - it is the interface contract this project trains.',
        'Seed statistics from samples[0], loop with i < n, and divide once in main.',
      ],
    },
    testPlan: [
      'Hand-trace check: the 16 samples sum to 8100; average 8100 / 16 = 506 (truncated from 506.25); min 475; max 535. Program output must match all four numbers.',
      'Warning gate: gcc -Wall -Wextra -Werror compiles with no diagnostics.',
      'Extension test A: change one sample to 4095 - max must become 4095 and the average rise accordingly; verify the sum by hand.',
      'Extension test B: set all 16 samples to the same value v - min, max and average must all equal v (the all-equal case catches seeding bugs).',
      'Extension test C: negative-capable variant - allow samples below zero in a copy of the program and confirm min finds negatives (seeding still correct).',
    ],
    expectedResults:
      'The exact report for the given dataset:\nsamples : 16\nmin     : 475\nmax     : 535\naverage : 506\nBuilding with -Wall -Wextra -Werror succeeds silently, and every hand-traced extension dataset matches the program output.',
    troubleshooting: [
      'Average is off by a fraction of a percent: integer division truncates 506.25 to 506 by design - if you need rounding, decide the policy explicitly (add n/2 before dividing) and document it.',
      'min reports 0: you seeded from 0 instead of data[0], or the loop bound is wrong - re-read the seeding rule from module 7.',
      'sizeof(data) gives 8 inside a function: arrays decay to pointers - the length must arrive as the n parameter.',
      'Compiler warns about unused variable: a scan result was computed but never printed - wire it into the report or remove it.',
    ],
    hardwareDependencies:
      'None. The program is pure host C with fixed sample data; it models the reporting stage only and makes no claim about any sensor or bus.',
  },
  {
    id: 'cpg-proj-digital-counter',
    title: 'Digital Counter with Wrap and Flags',
    level: 'beginner',
    summary:
      'A menu-driven counter with modulo wrap-around, pause state and mask-based status flags - the control core of a panel meter, driven by a scripted press sequence so it runs on any host.',
    useCase:
      'Counters wrap (a 4-digit panel meter rolls 9999 to 0), pause, and report status through flag bits. This project builds that logic in portable C: a simulated session replays button presses through the menu loop, so the wrap, pause and flag behavior is fully testable without any hardware.',
    requirements: [
      'A uint8_t counter that increments modulo COUNT_MAX (wrap at the top).',
      'A flags byte with two named bit flags: OVERFLOW (set once per wrap) and PAUSED (blocks incrementing).',
      'A menu: press 1 = count (when not paused), 2 = pause/resume toggle, 3 = report, 4 = quit.',
      'A scripted press sequence drives the session - clearly commented as simulated input, no hardware claims.',
      'Every state change prints an observable line; the final report shows count and flags in hex.',
    ],
    learningOutcomes: [
      'Implement modulo wrap-around with % on an unsigned type.',
      'Apply set/clear/toggle/test idioms to a real flag register (simulated).',
      'Structure a menu loop with a primary termination condition.',
      'Trace a scripted session and verify every printed line against the state model.',
    ],
    prerequisites: [
      'cpg-m03-l4',
      'cpg-m05-l1',
      'cpg-m05-l2',
      'cpg-m02-l3',
    ],
    architecture:
      'A single main owns all state: the counter (uint8_t), the flags byte, and the scripted press list. The loop reads one press per iteration and dispatches with if/else on the command (a switch is the natural extension exercise). Wrap is (count + 1) % COUNT_MAX; the OVERFLOW flag is set exactly when the wrap fires. Pause is a toggle that gates the count branch. All state transitions print, so the transcript is the test evidence.',
    steps: [
      {
        title: 'Declare state and masks',
        detail:
          'The counter, the flag constants, and the scripted session. The comments say plainly that the presses simulate user input and the flags model a status register - no hardware anywhere.',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n#define COUNT_MAX 5   /* small on purpose so the wrap is easy to reach */\n\nint main(void) {\n    uint8_t count = 0;\n    uint8_t flags = 0x00;   /* simulated status flags */\n\n    const uint8_t FLAG_OVERFLOW = (uint8_t)(1u << 0);\n    const uint8_t FLAG_PAUSED   = (uint8_t)(1u << 1);\n\n    /* Scripted button session (simulated input):\n       count, count, pause, count, resume, count, count, count, report */\n    int presses[9] = { 1, 1, 2, 1, 2, 1, 1, 1, 3 };\n    const int PRESS_COUNT = 9;\n\n    /* session loop goes here */\n    return 0;\n}',
      },
      {
        title: 'Dispatch each press',
        detail:
          'One loop iteration per press: command 1 counts unless paused (printing the blocked message), command 2 toggles the pause flag and announces the new state, command 3 reports count and flags.',
        code:
          'for (int i = 0; i < PRESS_COUNT; i++) {\n    int press = presses[i];\n\n    if (press == 1) {\n        if ((flags & FLAG_PAUSED) != 0) {\n            printf("paused - press 2 to resume\\n");\n        } else {\n            count = (uint8_t)((count + 1u) % COUNT_MAX);\n            printf("count = %u\\n", (unsigned)count);\n            if (count == 0) {\n                flags |= FLAG_OVERFLOW;\n                printf("wrapped: overflow flag set\\n");\n            }\n        }\n    } else if (press == 2) {\n        flags ^= FLAG_PAUSED;\n        if ((flags & FLAG_PAUSED) != 0) {\n            printf("paused\\n");\n        } else {\n            printf("resumed\\n");\n        }\n    } else if (press == 3) {\n        printf("count = %u flags = 0x%02X\\n",\n               (unsigned)count, (unsigned)flags);\n    }\n}\nprintf("bye\\n");',
      },
      {
        title: 'Trace the whole session on paper first',
        detail:
          'Before running, write the 10-line transcript: counts 1, 2; pause; blocked count; resume; counts 3, 4, then the wrap to 0 with the flag set; the report showing count 0 and flags 0x01; bye. Every line you predicted must appear in the run.',
      },
    ],
    starterCode: {
      title: 'Counter scaffold',
      language: 'c',
      code:
        '#include <stdio.h>\n#include <stdint.h>\n\n#define COUNT_MAX 5\n\nint main(void) {\n    uint8_t count = 0;\n    uint8_t flags = 0x00;   /* simulated status flags */\n\n    const uint8_t FLAG_OVERFLOW = (uint8_t)(1u << 0);\n    const uint8_t FLAG_PAUSED   = (uint8_t)(1u << 1);\n\n    /* TODO: scripted presses {1,1,2,1,2,1,1,1,3} through the\n       session loop: count (respecting pause), pause toggle,\n       report. Print every transition. */\n\n    return 0;\n}',
      explanation: [
        'COUNT_MAX is deliberately 5 so the wrap happens inside the 9-press script.',
        'Both flag constants come from bit shifts with names - the module 3 discipline.',
        'The session loop is the only TODO: dispatch on the press value, print every transition.',
      ],
    },
    testPlan: [
      'Full transcript match: the run must produce exactly - count = 1 / count = 2 / paused / paused - press 2 to resume / resumed / count = 3 / count = 4 / count = 0 / wrapped: overflow flag set / count = 0 flags = 0x01 / bye.',
      'Wrap arithmetic: with COUNT_MAX = 5, four consecutive counts from 0 must reach 0 again on the fifth (0->1->2->3->4->0).',
      'Pause gating: a count press while FLAG_PAUSED is set must NOT change count and must print the blocked message.',
      'Flag isolation: after resume, the report must show flags = 0x01 (PAUSED cleared, OVERFLOW untouched) - the toggle must not disturb other bits.',
      'Boundary variant: change COUNT_MAX to 10 and the script to fifteen 1s - the wrap must fire exactly once, on the tenth count.',
    ],
    expectedResults:
      'The scripted session produces the transcript above ending in `count = 0 flags = 0x01` and `bye`. The overflow flag is set exactly once per wrap, the pause toggle never disturbs it, and every printed number matches the state model traced by hand.',
    troubleshooting: [
      'The counter skips 0 or never wraps: the modulo is missing or applied to the wrong operand - the update must be (count + 1u) % COUNT_MAX.',
      'Pause toggle also clears the overflow flag: you assigned flags = FLAG_PAUSED (or 0) instead of toggling with ^= - flags are read-modify-write, never assignment.',
      'count prints 4294967295 or negative: the %u got an int, or the increment overflowed without the cast - keep the (uint8_t) store cast and the (unsigned) print casts.',
      'The blocked message prints when not paused: the test reads the wrong bit - (flags & FLAG_PAUSED) != 0, tested against the pause mask only.',
    ],
    hardwareDependencies:
      'None on purpose: the button presses are simulated script data and the flags byte is an ordinary variable modeling a status register. The comments in the code say so explicitly. Wiring this to real GPIO/buttons is the embedded course\'s job.',
  },
  {
    id: 'cpg-proj-event-state-machine',
    title: 'Embedded-Style Event State Machine',
    level: 'intermediate',
    summary:
      'An enum-driven state machine inside a superloop skeleton - the structure of nearly all firmware - running in portable C on a host with a scripted event queue and a clearly labeled simulation.',
    useCase:
      'Sensor monitors, chargers and protocol handlers are all event-driven state machines inside a forever loop. This project builds that structure honestly: the events come from a scripted queue and the superloop runs a bounded number of passes on the host, but every construct - enum states, switch dispatch, event consumption - is exactly what ships on a microcontroller.',
    requirements: [
      'Two enums: State (IDLE, MEASURE, EVALUATE, ALERT) and Event (TICK, SAMPLE_READY, FAULT).',
      'A switch-on-state transition function: pure - takes state and event, returns the next state, prints nothing itself.',
      'A superloop that pulls one event per pass, applies the transition, and logs pass, event and resulting state.',
      'The ALERT state requires two consecutive TICK events before releasing to IDLE (a dwell requirement).',
      'Portability rule: no hardware claims anywhere - the simulation boundary is documented in comments at the top.',
    ],
    learningOutcomes: [
      'Design transition logic as a pure function of (state, event) - the testable core.',
      'Drive an enum-based switch table from a loop and keep transitions centralized.',
      'Implement a dwell/timeout requirement (two ticks) inside a state.',
      'Keep firmware structure honest in a host simulation: bounded passes, scripted events, labeled boundaries.',
    ],
    prerequisites: [
      'cpg-m09-l3',
      'cpg-m04-l2',
      'cpg-m05-l3',
      'cpg-m06-l1',
    ],
    architecture:
      'Three layers with one dependency direction: (1) a pure transition function transition(State, Event) -> State containing all switch logic; (2) an event source - a scripted array standing in for hardware events; (3) the superloop in main, which pulls, transitions, and logs. The dwell requirement (ALERT releases only on the second TICK) is state the loop tracks in a counter and passes into the decision. Because transition() is pure, it can be unit-tested over the whole (state, event) grid without any loop at all - that testability is the design lesson.',
    steps: [
      {
        title: 'Define the vocabulary types',
        detail:
          'States and events as enums, plus the names table for readable logs. The simulation disclaimer goes at the top of the file, not buried.',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* HOST-RUNNABLE SIMULATION of an embedded event loop:\n   events come from a scripted array and the superloop\n   runs a fixed number of passes. No hardware is touched. */\n\ntypedef enum {\n    EV_TICK = 0,\n    EV_SAMPLE_READY,\n    EV_FAULT\n} Event;\n\ntypedef enum {\n    ST_IDLE = 0,\n    ST_MEASURE,\n    ST_EVALUATE,\n    ST_ALERT\n} State;\n\nstatic const char *state_name(State s) {\n    switch (s) {\n    case ST_IDLE:     return "IDLE";\n    case ST_MEASURE:  return "MEASURE";\n    case ST_EVALUATE: return "EVALUATE";\n    case ST_ALERT:    return "ALERT";\n    default:          return "?";\n    }\n}',
      },
      {
        title: 'Write the pure transition function',
        detail:
          'All rules live here: IDLE takes SAMPLE_READY to MEASURE or FAULT to ALERT; MEASURE advances on any event; EVALUATE returns to IDLE unless a FAULT arrives; ALERT holds and is released by a tick when the dwell counter is spent. The dwell count is passed in as a parameter so the function stays pure.',
        code:
          'static State transition(State s, Event ev, unsigned alert_ticks) {\n    switch (s) {\n    case ST_IDLE:\n        if (ev == EV_SAMPLE_READY) {\n            return ST_MEASURE;\n        }\n        if (ev == EV_FAULT) {\n            return ST_ALERT;\n        }\n        return ST_IDLE;\n\n    case ST_MEASURE:\n        /* sample captured: evaluation follows regardless of event */\n        return ST_EVALUATE;\n\n    case ST_EVALUATE:\n        return (ev == EV_FAULT) ? ST_ALERT : ST_IDLE;\n\n    case ST_ALERT:\n        /* release after two consecutive ticks */\n        if (ev == EV_TICK && alert_ticks >= 2u) {\n            return ST_IDLE;\n        }\n        return ST_ALERT;\n\n    default:\n        return ST_IDLE;\n    }\n}',
      },
      {
        title: 'Run the superloop over a scripted queue',
        detail:
          'The queue covers the full story: measure cycle, fault entry, dwell, release, idle. The alert tick counter resets on entry and increments on each tick spent alerting.',
        code:
          'int main(void) {\n    State state = ST_IDLE;\n\n    Event queue[7] = {\n        EV_SAMPLE_READY, EV_TICK, EV_SAMPLE_READY,\n        EV_FAULT, EV_TICK, EV_TICK, EV_TICK\n    };\n    const int QUEUE_LEN = 7;\n\n    unsigned alert_ticks = 0u;\n\n    for (int i = 0; i < QUEUE_LEN; i++) {\n        Event ev = queue[i];\n\n        if (state == ST_ALERT && ev == EV_TICK) {\n            alert_ticks++;\n        } else if (state != ST_ALERT) {\n            alert_ticks = 0u;\n        }\n\n        State next = transition(state, ev, alert_ticks);\n        if (state == ST_ALERT && next == ST_IDLE) {\n            alert_ticks = 0u;\n        }\n        state = next;\n\n        printf("pass %d: event=%d state=%s\\n",\n               i, (int)ev, state_name(state));\n    }\n    return 0;\n}',
      },
      {
        title: 'Verify the transcript against the state model',
        detail:
          'Seven passes must produce: MEASURE, EVALUATE, IDLE, ALERT, ALERT, IDLE, IDLE. Then unit-test transition() separately: loop over every state x every event and print the grid - the whole design review in 16 lines of output.',
      },
    ],
    starterCode: {
      title: 'State machine scaffold',
      language: 'c',
      code:
        '#include <stdio.h>\n#include <stdint.h>\n\n/* HOST-RUNNABLE SIMULATION - see project description. */\n\ntypedef enum { EV_TICK = 0, EV_SAMPLE_READY, EV_FAULT } Event;\ntypedef enum { ST_IDLE = 0, ST_MEASURE, ST_EVALUATE, ST_ALERT } State;\n\n/* TODO: state_name() and the pure transition(State, Event, unsigned)\n   function, then a superloop over the scripted queue:\n   {SAMPLE_READY, TICK, SAMPLE_READY, FAULT, TICK, TICK, TICK}\n   with the ALERT dwell requirement (two ticks). */\n\nint main(void) {\n    /* TODO */\n    return 0;\n}',
      explanation: [
        'Both enums are yours to flesh out exactly as specified - the names are the design.',
        'transition() must print nothing and read nothing global: state, event and dwell count in, next state out.',
        'The superloop owns logging and the tick counter; the transition function owns the rules.',
      ],
    },
    testPlan: [
      'Transcript match: the scripted run prints pass 0..6 with states MEASURE, EVALUATE, IDLE, ALERT, ALERT, IDLE, IDLE.',
      'Dwell boundary: in ALERT, the FIRST tick must not release (pass 4 stays ALERT) and the SECOND must (pass 5 goes IDLE).',
      'Purity check: comment out main\'s body and add a grid test printing transition(s, e, 2) for all 4x3 combinations - every cell must match the written rules, independent of the loop.',
      'Fault priority: EV_FAULT during EVALUATE must go to ALERT (not IDLE) - visible in a grid test cell.',
      'Unknown-state guard: a default arm returning ST_IDLE keeps a corrupted state enum recoverable (test by casting (State)99).',
    ],
    expectedResults:
      'The scripted session logs:\npass 0: event=1 state=MEASURE\npass 1: event=0 state=EVALUATE\npass 2: event=1 state=IDLE\npass 3: event=2 state=ALERT\npass 4: event=0 state=ALERT\npass 5: event=0 state=IDLE\npass 6: event=0 state=IDLE\nThe pure transition grid matches the written rules for all 12 (state, event) combinations.',
    troubleshooting: [
      'ALERT releases on the first tick: the dwell counter increments after the transition instead of before, or resets inside the alert case - count the tick BEFORE calling transition, and reset only on entry/exit.',
      'MEASURE hangs: the MEASURE case forgot its unconditional advance to EVALUATE - this state advances on ANY event.',
      'State prints as ?: state_name hit its default - a cast went out of range or a case was misspelled; check the enum coverage.',
      'Transitions differ between loop and grid test: state leaked through a global or the dwell counter is read inside transition() - the function must take every input as a parameter.',
    ],
    hardwareDependencies:
      'None. The event queue is a scripted array and the superloop is bounded to the queue length - the file header states this is a host-runnable simulation of firmware structure. Mapping the queue to real interrupts/timers is the embedded course\'s territory.',
  },
  {
    id: 'cpg-proj-bitmask-register-sim',
    title: 'Bit-Mask Register Simulator',
    level: 'beginner',
    summary:
      'A byte-wide register model with set/clear/toggle/test API functions, flag names from a datasheet-style table, and a scripted operation transcript - the peripheral-driver core in portable C.',
    useCase:
      'Every peripheral driver is four operations on registers: set, clear, toggle, test. This project packages them behind a clean API on a simulated byte register - struct plus functions, named flag constants, printed state after every operation. The API shape (SimReg with reg_set/reg_clear/reg_toggle/reg_test) is the shape you will recognize instantly in real vendor code.',
    requirements: [
      'A SimReg type holding one uint8_t, documented as an educational stand-in for a hardware register.',
      'Four API functions taking a pointer: reg_set, reg_clear, reg_toggle (mutators) and reg_test (read-only, const parameter).',
      'Named flag constants POWER, TIMER, SERIAL at bits 0-2, defined once from bit numbers.',
      'A scripted sequence exercising all four functions, printing the register in hex after each mutation.',
      'The test function returns int 0/1 and is usable directly in if conditions.',
    ],
    learningOutcomes: [
      'Implement the four register idioms behind pointer-based APIs.',
      'Use const to separate read-only queries from mutating commands in one API.',
      'Derive flag constants from datasheet bit numbers exactly once.',
      'Design a transcript-based test: every operation prints, so the log is the evidence.',
    ],
    prerequisites: [
      'cpg-m03-l4',
      'cpg-m08-l1',
      'cpg-m08-l3',
      'cpg-m09-l1',
    ],
    architecture:
      'A struct-plus-functions API: SimReg wraps one byte; the three mutators take SimReg* and apply |=, &= ~mask and ^= respectively (each a read-modify-write on the wrapped byte); reg_test takes const SimReg* and returns (bits & mask) != 0. Flag constants are file-scope named masks derived from bit numbers 0-2. main scripts the sequence: power up, start timer, enable serial, query each flag, stop the timer, disable serial - printing hex state at each step so the transcript verifies every idiom.',
    steps: [
      {
        title: 'Define the type, the flags and the API',
        detail:
          'The struct is deliberately minimal and its comment says what it is and is not. The four functions are the whole API surface.',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational stand-in for a hardware register:\n   an ordinary C struct in host memory. No hardware\n   is read or written anywhere in this program.    */\ntypedef struct {\n    uint8_t bits;\n} SimReg;\n\nstatic void reg_set(SimReg *r, uint8_t mask) {\n    r->bits = (uint8_t)(r->bits | mask);\n}\n\nstatic void reg_clear(SimReg *r, uint8_t mask) {\n    r->bits = (uint8_t)(r->bits & (uint8_t)~mask);\n}\n\nstatic void reg_toggle(SimReg *r, uint8_t mask) {\n    r->bits = (uint8_t)(r->bits ^ mask);\n}\n\nstatic int reg_test(const SimReg *r, uint8_t mask) {\n    return (r->bits & mask) != 0;\n}',
      },
      {
        title: 'Name the flags and script the sequence',
        detail:
          'Flags from bit numbers, exactly once. The script: set POWER, set TIMER, toggle SERIAL on, query, then stop the timer and toggle SERIAL off, querying again.',
        code:
          'int main(void) {\n    const uint8_t POWER  = (uint8_t)(1u << 0);   /* 0x01 */\n    const uint8_t TIMER  = (uint8_t)(1u << 1);   /* 0x02 */\n    const uint8_t SERIAL = (uint8_t)(1u << 2);   /* 0x04 */\n\n    SimReg reg;\n    reg.bits = 0x00;\n\n    reg_set(&reg, POWER);\n    reg_set(&reg, TIMER);\n    reg_toggle(&reg, SERIAL);\n    printf("reg = 0x%02X\\n", (unsigned)reg.bits);\n\n    if (reg_test(&reg, POWER)) {\n        printf("POWER is on\\n");\n    }\n    if (reg_test(&reg, SERIAL)) {\n        printf("SERIAL is on\\n");\n    }\n\n    reg_clear(&reg, TIMER);\n    reg_toggle(&reg, SERIAL);\n    printf("reg = 0x%02X\\n", (unsigned)reg.bits);\n    return 0;\n}',
      },
      {
        title: 'Verify by hand-trace, then extend',
        detail:
          'Trace the two printed states (0x07 after the first block, 0x01 after the second) before running. Then extend the API with reg_write(reg, mask, value) - the clear-then-set field writer from module 3 - and test it by setting a 2-bit MODE field at bits 4-5 to value 2 while other flags stay live.',
      },
    ],
    starterCode: {
      title: 'Register simulator scaffold',
      language: 'c',
      code:
        '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational stand-in for a hardware register. */\ntypedef struct {\n    uint8_t bits;\n} SimReg;\n\n/* TODO: reg_set, reg_clear, reg_toggle (SimReg *r, uint8_t mask)\n   and reg_test (const SimReg *r, uint8_t mask) returning 0/1. */\n\nint main(void) {\n    const uint8_t POWER  = (uint8_t)(1u << 0);\n    const uint8_t TIMER  = (uint8_t)(1u << 1);\n    const uint8_t SERIAL = (uint8_t)(1u << 2);\n\n    SimReg reg;\n    reg.bits = 0x00;\n\n    /* TODO: set POWER + TIMER, toggle SERIAL on, print,\n       test POWER and SERIAL, clear TIMER, toggle SERIAL off, print. */\n\n    return 0;\n}',
      explanation: [
        'The four functions are the entire API: three mutators on SimReg* and one const query.',
        'Each mutator is one idiom with the width cast - keep them one line each.',
        'The main script prints after every mutation so the transcript doubles as the test log.',
      ],
    },
    testPlan: [
      'Transcript match: after the first block reg = 0x07 with both POWER is on and SERIAL is on printed; after the second block reg = 0x01 (timer cleared, serial toggled off, power untouched).',
      'Toggle round-trip: reg_toggle applied twice to any mask returns the register to its prior value - add a temporary third print to prove it.',
      'Const enforcement: attempt reg_test(&reg, ...) then write r->bits inside reg_test - the compiler must reject it (the const is doing its job); revert after confirming.',
      'Multi-bit mask: reg_test(&reg, 0x03) on the 0x07 state returns 1 (any-bits semantics); reg_test with mask 0x08 returns 0.',
      'Extension check: reg_write(reg, 0x30, 2) on a 0x01 register produces 0x21 - the MODE field set to 2 with bit 0 preserved.',
    ],
    expectedResults:
      'The run prints:\nreg = 0x07\nPOWER is on\nSERIAL is on\nreg = 0x01\nwith reg_test behaving per any-bits semantics for multi-bit masks, and the const on reg_test preventing any accidental mutation at compile time.',
    troubleshooting: [
      'Clear wipes the whole register: you wrote r->bits &= mask instead of &= (uint8_t)~mask - AND keeps the masked bits, the complement is what clears.',
      'reg_test crashes or misbehaves: the const parameter was dropped or the dereference syntax inverted - queries take const SimReg* and read r->bits only.',
      '0x100 appears in a printf: the width cast is missing after the operation - every result stored to uint8_t gets the (uint8_t) cast (module 3 promotion rules).',
      'Toggling did nothing: the mask was 0x00 - check the flag constant definitions against the bit table (1u << n).',
    ],
    hardwareDependencies:
      'None. SimReg is an ordinary struct and every comment labels it an educational stand-in; no register addresses are dereferenced anywhere. The identical API mapped onto volatile hardware addresses is the embedded course\'s first driver exercise.',
  },
];
