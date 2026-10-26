import type { TutorialProject } from '../types';

/**
 * Capstone projects for the Embedded C Programming course.
 * Every project runs on educational mock registers (host-runnable);
 * `hardwareDependencies` states honestly what needs a real board.
 */
export const embeddedCProjects: TutorialProject[] = [
  {
    id: 'embc-proj-led-sequencer',
    title: 'Non-Blocking LED Sequencer',
    level: 'beginner',
    summary:
      'Drive a 4-LED chase pattern from a tick scheduler with zero blocking calls — the module 05-l3 timestamp discipline made tangible.',
    useCase:
      'Status panels on industrial devices: a four-LED pattern communicates boot, running and fault states without ever stalling the main loop. The same scheduler skeleton scales to any periodic indication.',
    requirements: [
      'Four LEDs on mock GPIO pins 0-3 of a mock output register (module 04 mock conventions).',
      'A 1 ms system tick (simulated ISR incrementing a volatile counter).',
      'Chase pattern advancing one LED every 250 ms, wrapping 0 -> 3 -> 0.',
      'A blink-all fault pattern selectable at runtime (every LED toggling at 2 Hz).',
      'Zero blocking delays anywhere: every timing decision is a timestamp difference.',
    ],
    learningOutcomes: [
      'Apply the wrapping-safe elapsed-time idiom (module 05-l3) to a real pattern generator.',
      'Drive multiple output bits with clean mask operations (module 03-l2).',
      'Structure a superloop whose worst-case iteration is bounded and measurable.',
      'Hide output polarity and pin mapping inside one driver function (module 04-l1).',
    ],
    prerequisites: ['embc-m04-l1', 'embc-m05-l3'],
    architecture:
      'Driver layer: led.c owning the mock ODR and pin mapping (led_init, led_write_mask). Application layer: sequencer state (current LED index, last-advance timestamp, mode). Scheduler: the module 05-l3 timestamp check per task. The tick source is a simulated ISR for host runs; on a board it is a timer overflow interrupt (module 05-l1).',
    steps: [
      {
        title: 'Define the mock registers and the LED driver',
        detail:
          'Declare MOCK_GPIOA_ODR as volatile uint8_t and write led_init (clear all four pins) plus led_write_mask(uint8_t mask) that writes the low nibble in one assignment.',
        code:
          '#include <stdint.h>\n\nstatic volatile uint8_t MOCK_GPIOA_ODR = 0x00u;  /* educational mock */\n#define LED_MASK_ALL 0x0Fu\n\nstatic void led_init(void) {\n    MOCK_GPIOA_ODR &= (uint8_t)~LED_MASK_ALL;    /* all off, safe state */\n}\nstatic void led_write_mask(uint8_t mask) {\n    MOCK_GPIOA_ODR = (uint8_t)((MOCK_GPIOA_ODR & (uint8_t)~LED_MASK_ALL)\n                               | (uint8_t)(mask & LED_MASK_ALL));\n}',
      },
      {
        title: 'Add the tick source',
        detail:
          'Declare `static volatile uint32_t g_ticks;` and a mock_tick_isr() that increments it. On a board this is the timer overflow ISR from module 05-l1; the volatile discipline is identical either way.',
      },
      {
        title: 'Write the sequencer step function',
        detail:
          'sequencer_step(uint32_t now): if (now - last_advance) >= 250, shift the lit LED one position (masks 0x01, 0x02, 0x04, 0x08, wrapping), update last_advance with fixed-phase arithmetic, and call led_write_mask. A mode enum selects chase vs fault-blink (all LEDs toggling every 250 ms).',
      },
      {
        title: 'Wire the superloop and verify the trace',
        detail:
          'Loop simulated ticks 0..2000 calling sequencer_step(g_ticks) then mock_tick_isr(). With fixed-phase scheduling (last_advance starting at 0), advances land at ticks 250, 500, ..., 2000 (8 advances) and the lit mask cycles through all four positions, repeating every 1000 ms.',
      },
      {
        title: 'Add the fault mode and a mode-switch input',
        detail:
          'A plain volatile flag (set "from an ISR" in the simulation) switches the pattern to fault blink. Note the module 06-l2 rules: the flag is volatile, single-writer, one byte — no critical section needed for this design.',
      },
      {
        title: 'Prove non-blockingness',
        detail:
          'Add an iteration counter and a second dummy task in the same loop; confirm both progress every iteration even during pattern advances. On a board, measure the loop worst case with the module 15-l3 GPIO-toggle method.',
      },
    ],
    starterCode: {
      title: 'Sequencer skeleton',
      language: 'c',
      code:
        '#include <stdio.h>\n#include <stdint.h>\n\nstatic volatile uint8_t  MOCK_GPIOA_ODR = 0x00u; /* educational mock   */\nstatic volatile uint32_t g_ticks        = 0u;    /* 1 kHz tick (ISR)   */\n#define LED_MASK_ALL 0x0Fu\n\nstatic void mock_tick_isr(void) { g_ticks++; }\n\nstatic void led_write_mask(uint8_t mask) {\n    MOCK_GPIOA_ODR = (uint8_t)((MOCK_GPIOA_ODR & (uint8_t)~LED_MASK_ALL)\n                               | (uint8_t)(mask & LED_MASK_ALL));\n}\n\nstatic uint8_t chase_mask = 0x01u;\nstatic uint32_t last_advance = 0u;\n\nstatic void sequencer_step(uint32_t now) {\n    if ((uint32_t)(now - last_advance) >= 250u) {\n        last_advance += 250u;                 /* fixed phase (m05-l3) */\n        led_write_mask(chase_mask);\n        printf("[t=%u ms] mask=0x%X\\n", (unsigned)now, (unsigned)chase_mask);\n        /* FIX ME: this wrap dies after 0x08 - send the pattern back to 0x01 */\n        chase_mask = (uint8_t)((chase_mask << 1) & LED_MASK_ALL);\n    }\n}\n\nint main(void) {\n    for (uint32_t t = 0u; t <= 1000u; t++) {\n        sequencer_step(g_ticks);\n        mock_tick_isr();\n    }\n    return 0;\n}',
      explanation: [
        'The skeleton compiles and runs; the advance happens after the display, so the printed mask sequence shows the *current* LED at each advance tick.',
        'As given, the FIX ME line is a real bug: after 0x08 the shift-and-mask yields 0x00 and the chase dies. The fix is `(chase_mask == 0x08u) ? 0x01u : (uint8_t)(chase_mask << 1)`.',
        'Trace WITH the fix: with last_advance starting at 0, advances land at ticks 250, 500, 750, 1000 and the printed masks are 0x1, 0x2, 0x4, 0x8 — the chase wraps correctly. Trace WITHOUT the fix (as given): 0x1, 0x2, 0x4, 0x8, 0x0, 0x0, ... — the exercise.',
        'Everything else (timestamp idiom, fixed-phase advance, volatile tick) is final; build on it rather than rewriting.',
      ],
    },
    testPlan: [
      'Trace/print check: advances land exactly on multiples of 250 ms with fixed-phase scheduling.',
      'Wrap check: the lit LED cycles 0x01 -> 0x02 -> 0x04 -> 0x08 -> 0x01 without skipping or doubling.',
      'Fixed-phase catch-up check: artificially starve the loop for 600 ms of ticks; the sequencer advances the accumulated periods (module 05-l3 behaviour) rather than once.',
      'Polarity isolation check: flip LED_ACTIVE_LEVEL in one macro; main code unchanged.',
      'Board-only: real LED visibility (current-limiting resistors, module 04-l1) and the tick sourced from an actual timer ISR.',
    ],
    expectedResults:
      'A four-LED chase at 4 Hz pattern rate with zero blocking calls, switching to a 2 Hz fault blink on demand. On the host the printed mask sequence is deterministic and matches the trace; on a board the pattern is visibly smooth (250 ms steps) with the loop free for other work.',
    troubleshooting: [
      'Pattern jumps two steps after a stall: fixed-phase catch-up (last_advance += period) — intended behaviour; switch to slippage (last_advance = now) if a burst is undesirable.',
      'All LEDs dim/glow together: mask OR-ed instead of assigned — led_write_mask must clear the old bits (single composed assignment).',
      'Nothing advances: the tick variable missing volatile (module 02-l3) or the difference comparison inverted.',
      'On hardware only: chase visibly flickers — the tick is software-loop derived instead of timer-derived.',
    ],
    hardwareDependencies:
      'Host: fully runnable with mock registers (no hardware needed). Board: four LEDs with ~200-330 ohm series resistors on a real port, and a hardware timer tick to replace the simulated ISR — verify polarity and current limits per module 04-l1.',
    challengeId: 'ece-03-gpio-bit-toggle',
  },
  {
    id: 'embc-proj-uart-echo',
    title: 'UART Echo Terminal with Ring Buffer',
    level: 'intermediate',
    summary:
      'Interrupt-style UART RX into a ring buffer, with a line-assembling echo and timeout discipline — the module 07 driver made complete.',
    useCase:
      'The command console every product ships with: typed lines arrive over UART, are echoed for terminal usability, and are handed to a parser line by line. This project is the bring-up milestone for any new board.',
    requirements: [
      'Mock UART with TXE/RXNE flags and DR (module 07-l2 conventions) plus a simulated "wire" feeding bytes.',
      'RX path: byte-ready event pushes into an 8-byte ring buffer (module 07-l3), with a drop counter.',
      'Line assembly: echo each printable byte; on CR or LF emit the assembled line to a handler.',
      'Backspace (0x08) edits the pending line.',
      'Bounded waits everywhere: no unbounded TXE/RXNE polling.',
    ],
    learningOutcomes: [
      'Combine status-flag discipline with ring-buffer handoff (module 07-l2/l3).',
      'Implement line discipline (echo, CR/LF, backspace) as pure host-testable logic.',
      'Instrument drops and errors so silence never hides data loss.',
      'Apply the timeout idiom to both UART directions.',
    ],
    prerequisites: ['embc-m07-l2', 'embc-m07-l3'],
    architecture:
      'uart.c driver: flag-based getc/putc with bounded waits, RX ring buffer, drop counter. lineedit.c service: pure functions consuming bytes and emitting lines (echo decisions included — host-testable). app: prints completed lines. The simulated ISR calls uart_rx_push() per wire byte; the loop drains the ring through the line editor.',
    steps: [
      {
        title: 'Port the ring buffer and add the drop counter',
        detail:
          'Take the module 07-l3 ringbuf_t; add `volatile uint32_t drops;` incremented on failed puts. The counter is the honesty mechanism — drops are visible, never silent.',
      },
      {
        title: 'Write the RX and TX primitives',
        detail:
          'uart_rx_push (the simulated ISR side: three lines, O(1)), uart_getc (drains the ring), uart_putc_polled with a bounded guard counter (module 07-l2 pattern).',
      },
      {
        title: 'Implement the line editor as pure logic',
        detail:
          'lineedit_feed(uint8_t c) appends printable bytes to a static line buffer (bounds-checked, module 15-l2), echoes via uart_putc, handles 0x08 by erasing, and on \\r or \\n calls the handler with the completed line and resets. No global state beyond the line buffer — every decision is a pure function of (c, current line).',
      },
      {
        title: 'Simulate a session and trace it',
        detail:
          'Feed the wire: "HI\\r" then "AB\\bC\\r". Expected: echo of H,I,CR/LF, line "HI" handled; echo A,B, backspace erases B, C, line "AC" handled. Then overflow the ring deliberately (20 bytes with a stalled consumer) and read the drop counter.',
      },
      {
        title: 'Add the RX timeout warning',
        detail:
          'If the ring holds data but nothing arrives for 1 s of ticks, log [W] and flush the partial line — the module 05-l3 timestamp idiom applied to line assembly.',
      },
      {
        title: 'Board bring-up sequence',
        detail:
          'On real hardware: configure pins and baud first (module 07-l1), prove one-way TX with a constant byte, then RX echo, then lines. Each stage has a visible pass condition — the classic bring-up ladder.',
      },
    ],
    testPlan: [
      'Host: line editor unit tests — plain line, CR vs LF, backspace at position 0 (no-op), line longer than the buffer (reject or wrap policy), empty line on double Enter.',
      'Host: ring buffer wraparound and drop-counter tests (module 17-l3 harness).',
      'Host: overflow session — 20-byte burst with stalled consumer → drops counted, buffer never corrupted.',
      'Board: loopback at 9600 baud (typed characters echo), then 115200 with a paste burst — overrun/drop counters stay consistent with bytes received.',
    ],
    expectedResults:
      'Typed lines echo cleanly, edit correctly with backspace, and reach the handler as complete strings; forced overflows increment the drop counter without corrupting the buffer; the board version passes the bring-up ladder stage by stage.',
    troubleshooting: [
      'Double characters echoed: both the wire and the echo path push to the ring — echo belongs to the line editor only.',
      'Garbage at high baud: clock-source error budget exceeded (module 07-l1) — check the divider arithmetic and the clock source.',
      'Stuck after cable pull: an unbounded wait survived — audit every flag wait for the bounded-guard pattern.',
      'Line handler sees fragments: CR handling missing on \\r\\n pairs — treat LF after CR as already-consumed.',
    ],
    hardwareDependencies:
      'Host: fully runnable (mock UART + simulated wire). Board: a real UART peripheral with correct pin mux and baud config, a USB-serial bridge, and a terminal; verify the baud error budget per module 07-l1.',
  },
  {
    id: 'embc-proj-ringbuffer-module',
    title: 'Portable Ring-Buffer Module (Unit-Tested)',
    level: 'beginner',
    summary:
      'A production-shaped ringbuf.c/ringbuf.h pair with the full module 17-l3 test suite — the reusable data structure and the testing habit in one deliverable.',
    useCase:
      'The module every firmware codebase contains: UART RX, log buffering, event queues, ADC handoff. Building it once, properly, with tests, means every future driver starts from proven code.',
    requirements: [
      'ringbuf.h: opaque-capable API — rb_init, rb_put, rb_get, rb_count, rb_peek, rb_flush, with the SPSC contract documented.',
      'Fixed size via RB_SIZE macro (power of two, compile-time check), reserved-slot full detection.',
      'Drop counter optional per instance.',
      'Full unit-test suite runnable on any host C99 compiler.',
      'No dynamic allocation anywhere.',
    ],
    learningOutcomes: [
      'Write a header-as-contract module with documented context rules (module 13-l2).',
      'Verify wraparound, capacity and count arithmetic exhaustively on host (module 17-l3).',
      'Use compile-time assertions to lock design invariants (power-of-two size).',
      'Document the concurrency contract as part of the API.',
    ],
    prerequisites: ['embc-m07-l3', 'embc-m17-l3'],
    architecture:
      'Single module: ringbuf.h declares the struct and API plus the contract comment ("exactly one producer, one consumer; or protect externally"). ringbuf.c holds the implementation with all helpers static. tests/test_ringbuf.c is the module 17-l3 harness suite. A tiny static assert (array-index trick or _Static_assert in C11) enforces the power-of-two size at build time.',
    steps: [
      {
        title: 'Write the header with its contract',
        detail:
          'Purpose (2 lines), the API, the SPSC contract, and the size rule. If the contract needs the .c to understand, the header failed (module 13-l2).',
      },
      {
        title: 'Implement put/get/count/peek/flush',
        detail:
          'The module 07-l3 code plus rb_peek (read at tail without advancing) and rb_flush (tail = head). Order-of-operations discipline: data first, publish index last.',
      },
      {
        title: 'Add the compile-time size check',
        detail:
          'C11: `_Static_assert((RB_SIZE & (RB_SIZE - 1u)) == 0, "RB_SIZE must be a power of two");` — or the negative-array typedef trick for C99. The build now rejects misconfiguration before any test runs.',
      },
      {
        title: 'Write the test suite',
        detail:
          'The module 17-l3 suite plus: peek does not consume (two identical peeks), flush empties in one call, count correctness across a full wrap, drop counter increments on policy. Each test resets its own instance — tests never share state.',
      },
      {
        title: 'Property-style stress test',
        detail:
          'A randomized long run: pushes and pops driven by a fixed-seed pseudo-random sequence, with a shadow model (a simple array queue) verifying contents match at every step. Fixed seed keeps failures reproducible (module 17-l2).',
      },
      {
        title: 'Reuse audit',
        detail:
          'Drop the module into the UART project (embc-proj-uart-echo) unchanged — if the driver needed edits, the API was wrong; fix the module, not the caller.',
      },
    ],
    testPlan: [
      'Unit: FIFO order, full rejection at SIZE−1, empty rejection, count across wrap.',
      'Unit: peek non-destructive (twice), flush makes count 0 and allows reuse.',
      'Unit: drop counter on policy paths.',
      'Stress: fixed-seed random interleave vs shadow model over 10,000 operations.',
      'Board (optional): the module drives a real UART RX ISR without modification — the board validates the SPSC contract, not the logic.',
    ],
    expectedResults:
      'A reusable, allocation-free ring buffer whose behaviour is pinned by a fast host suite (runs in milliseconds, every commit), with the SPSC contract documented and build-enforced size invariants.',
    troubleshooting: [
      'Count wrong after wrap: the (head − tail) & MASK arithmetic applied to a non-power-of-two size — the static assert exists for this.',
      'Consumer reads garbage under load: the producer published head before writing data (order-of-operations violation).',
      'Test suite flakes: shared static buffer between tests — every test must reset its own instance.',
      'Two producers corrupt indices: the SPSC contract was violated — wrap externally with a critical section (module 06-l2) or use per-producer buffers.',
    ],
    hardwareDependencies:
      'Host: fully runnable and fully testable — no hardware needed at all. Board: optional; only exercises the concurrency contract in a real ISR context.',
  },
  {
    id: 'embc-proj-timer-scheduler',
    title: 'Cooperative Timer Event Scheduler',
    level: 'intermediate',
    summary:
      'A reusable tick-callback scheduler: fixed-phase periodic tasks, one-shot events with cancel, and the health reporting that feeds a watchdog — the module 05-l3/13-l3 skeleton as a product component.',
    useCase:
      'The beating heart of every bare-metal product: sensor polls, display refreshes, watchdog health, and one-shot timeouts (a valve closing after 30 s) living in one table-driven scheduler.',
    requirements: [
      'Task table: function, period, phase, last-run timestamp, health bit.',
      'Fixed-phase periodic dispatch plus one-shot events with optional cancel.',
      'Health mask set per completed task cycle; a monitor function reports missing bits.',
      'Measured worst-case iteration accounting (the budget input for the watchdog period, module 13-l3).',
      'All dispatch logic pure C against an injected tick value.',
    ],
    learningOutcomes: [
      'Generalize the module 05-l3 pattern into a table-driven component.',
      'Implement one-shot vs periodic scheduling and cancellation cleanly.',
      'Integrate watchdog health reporting at the scheduler level (module 13-l3).',
      'Measure and document loop worst-case time as a design artifact.',
    ],
    prerequisites: ['embc-m05-l3', 'embc-m13-l3'],
    architecture:
      'scheduler.h: task descriptor (callback, context pointer, period, flags, last_run, health bit), sched_init, sched_task_add (or a static table), sched_one_shot(delay, callback), sched_step(now). The step function walks the table (small N: linear scan is honest and cache-friendly), dispatches due tasks, sets health bits. monitor_check() returns missing health bits; the watchdog gate consumes it.',
    steps: [
      {
        title: 'Define the task descriptor and table',
        detail:
          'Static table sized at build time (module 15-l1: no allocation). Fields: callback, period_ticks, last_run, flags (PERIODIC/ONE_SHOT/DONE), health_bit, name for logs.',
      },
      {
        title: 'Implement the dispatch step',
        detail:
          'For each entry: if (now − last_run) >= period → call, set health bit, then advance last_run by period (fixed phase) or mark DONE (one-shot). Cancellation clears the entry.',
      },
      {
        title: 'Add one-shot events',
        detail:
          'sched_one_shot stores delay as a period with the ONE_SHOT flag; after firing the slot frees. Cancel finds the slot by callback/id and clears it — document that firing a cancelled-in-callback event is prevented by the DONE check order.',
      },
      {
        title: 'Wire the health mask and monitor',
        detail:
          'Each dispatch ORs the task\'s bit; monitor_check(now) clears and returns the mask of missing required tasks (module 13-l3). The main loop kicks the watchdog only when the mask is complete.',
      },
      {
        title: 'Measure the loop',
        detail:
          'Instrument the step function with the GPIO-toggle + counter method (module 15-l3); record worst-case dispatch time with N tasks. The number goes in the header as the scheduler\'s contract and sizes the watchdog period.',
      },
      {
        title: 'Stress and trace',
        detail:
          'Simulate 60 simulated seconds with three periodic tasks (10/100/1000 ms) and two one-shots (fire, cancel-before-fire). Verify: dispatch ticks land on the expected grid, one-shot fires exactly once, cancelled one-shot never fires, missing-bit report appears when a task\'s callback is stubbed to fail.',
      },
    ],
    testPlan: [
      'Host: dispatch grid — a 100 ms task fires at exactly 100, 200, 300 ... (fixed phase from last_run = 0) across a wrapped tick counter.',
      'Host: one-shot fires once; cancellation before and after firing behaves as documented.',
      'Host: health mask — a failing task produces the missing-bit report, others keep running.',
      'Host: wraparound — run the simulated tick across the 2^32 boundary with the difference idiom; dispatch stays correct.',
      'Board: real timer ISR drives the same table; watchdog reset observed when a task is deliberately hung.',
    ],
    expectedResults:
      'A table-driven scheduler where adding a task is one table row, one-shots and cancellation work, health reporting feeds the watchdog, and the loop\'s worst case is a measured, documented number.',
    troubleshooting: [
      'Task runs late under load: its priority in the table order — earlier rows dispatch first; order by deadline sensitivity or shorten the blocking task.',
      'One-shot fires twice: the DONE flag check missing before dispatch.',
      'Watchdog resets healthy systems: health bits not set by every required task, or the monitor window shorter than the slowest period.',
      'Catch-up storm after a stall: fixed-phase accumulation — switch that task to slippage (last_run = now) if bursts are unacceptable (module 05-l3).',
    ],
    hardwareDependencies:
      'Host: fully runnable with the simulated tick. Board: one hardware timer overflow ISR for the tick and a real watchdog register — both thin replacements for the mocks, per module 05-l1/13-l3.',
  },
  {
    id: 'embc-proj-pwm-fader',
    title: 'PWM LED Fader',
    level: 'intermediate',
    summary:
      'A smooth breathing/fading LED driven through a mock PWM channel: duty ramps, gamma correction, and the frequency/resolution trade made visible in numbers.',
    useCase:
      'Status and ambient lighting in consumer devices — the "breathing" power LED, button glow, brightness that feels engineered rather than linear-harsh.',
    requirements: [
      'Mock PWM channel: ARR=999 (1000-step period), CCR duty register, module 11-l2 semantics.',
      'Breathing profile: duty ramping 0 → 100 → 0% over a configurable period (default 4 s).',
      'Gamma-corrected variant: a 32-entry correction table mapping perceptual level to duty counts.',
      'Configurable fade rate without rederiving constants (TICK_HZ-based conversions).',
      'Worst-case iteration and update jitter reported.',
    ],
    learningOutcomes: [
      'Map duty intent to CCR counts exactly (module 11-l2 arithmetic).',
      'Quantify and correct the duty-to-perception nonlinearity with a gamma table.',
      'Keep PWM updates glitch-free by design (period-boundary updates, module 11-l2 preload concept).',
      'Do the frequency/resolution trade on paper before configuring (module 11-l2 budget).',
    ],
    prerequisites: ['embc-m11-l1', 'embc-m11-l2'],
    architecture:
      'pwm.c driver: owns the mock ARR/CCR and exposes pwm_set_duty_x100 (hundredths of a percent → counts, one conversion point). fader.c service: a phase accumulator advanced per tick, mapping phase → level through the gamma table → duty. app: configures period and starts the cycle. On a board the mock registers become a real timer PWM channel; the phase logic is unchanged.',
    steps: [
      {
        title: 'Build the mock PWM channel',
        detail:
          'ARR=999, CCR volatile uint16_t; a pwm_tick() that models set-on-compare/clear-on-wrap so tests can count high ticks per period (module 11-l2\'s verification loop).',
      },
      {
        title: 'Implement the duty conversion',
        detail:
          'duty_x100 (0..10000) → CCR = duty_x100 * (ARR+1) / 10000, with 64-bit intermediate (10000 * 1000 = 10^7 fits uint32_t, but the habit protects the next size up — module 05-l1).',
      },
      {
        title: 'Create the breathing profile',
        detail:
          'Phase counter 0..period_ticks; level = triangle wave of phase; apply gamma table (32 entries computed at init: level^(1/2.2) style curve) → duty. The table is `static const` (flash, module 02-l3).',
      },
      {
        title: 'Verify the fade visually and numerically',
        detail:
          'Host: print duty every 100 ms of simulated ticks — a smooth 0→10000→0 ramp over 4 s (400 steps each way). Board: the LED breathes without visible steps; if steps show, resolution is the constraint (module 11-l2 budget: 1000 steps at the chosen frequency).',
      },
      {
        title: 'Make the fade rate configurable',
        detail:
          'All timing from TICK_HZ macros: period_ms → phase increment per tick = (2 * LEVELS * 1000) / period_ms. Changing 4 s to 2 s is one config line.',
      },
      {
        title: 'Measure update jitter',
        detail:
          'Log the tick at which each duty update lands; updates must land every tick exactly (the ramp is per-tick). On a board, duty updates belong at period boundaries — note the module 11-l2 preload discussion in the driver comment.',
      },
    ],
    testPlan: [
      'Host: duty conversion — 0, 2500, 5000, 10000 (x100) → CCR 0, 250, 500, 1000.',
      'Host: ramp monotonicity — the printed duty sequence never decreases mid-rise (triangle), and the period matches the config exactly.',
      'Host: gamma table — endpoints fixed (0 → 0, max → max), monotonic between.',
      'Host: high-tick verification — CCR=250 yields exactly 250 high ticks per 1000-tick period (module 11-l2 verification loop).',
      'Board: visual smoothness (no visible steps at 4 s fade), and a scope on the pin showing the expected duty ramp and frequency.',
    ],
    expectedResults:
      'A LED that breathes smoothly over the configured period with perceptually even brightness; all conversions deterministic and test-covered; the frequency/resolution budget documented in the driver header.',
    troubleshooting: [
      'Visible brightness steps: PWM resolution too low for the fade length — raise steps (lower frequency) or add a faster timer clock (module 11-l2 budget).',
      'Fade too harsh at the low end: gamma table missing or endpoints wrong — low duty dominates perception (module 11-l1).',
      'Flicker on board: PWM frequency under the flicker-fusion band — raise it and re-verify resolution survived.',
      'Ramp not smooth on host: phase increment rounding — integer truncation per tick loses rate; keep a residual accumulator.',
    ],
    hardwareDependencies:
      'Host: fully runnable (mock PWM + printed duty traces). Board: one PWM-capable pin driving an LED through a current-limiting resistor; a real timer channel configured per module 11-l2 with the documented budget; scope verification of duty and frequency.',
  },
  {
    id: 'embc-proj-sensor-logger',
    title: 'Multi-Sensor Data Logger',
    level: 'advanced',
    summary:
      'The full stack in one deliverable: mock ADC drivers, fixed-point conversion at the boundary, buffered logging with counted drops, alarms with hysteresis, and a host test suite — the course\'s capstone architecture.',
    useCase:
      'Environmental monitoring products: temperature and light sampled on different cadences, thresholds driving alarms, and a log stream that stays honest under load. This is the module 18-l2 walkthrough expanded to a complete, reviewable deliverable.',
    requirements: [
      'Two ADC channels (temperature TMP36-style, light LDR divider) on mock registers (modules 10/12).',
      'Driver-boundary conversions to engineering units (tenths of °C, percent) with range guards.',
      'Cadences: light 100 ms, temperature 500 ms (4-sample moving average), status log 5 s.',
      'HEAT alarm (raise 45.0 / clear 40.0 °C) and DARK alarm (<10% / >15%) with hysteresis (module 18-l2).',
      'Log stream through a ring buffer with drop counter and sequence numbers (module 07-l3 / 18-l3).',
      'Watchdog health gate over all scheduled tasks (module 13-l3).',
      'Host test suite covering conversions, alarms, scheduler and buffer.',
    ],
    learningOutcomes: [
      'Assemble drivers, services and application per the module 13 layering rules in one coherent program.',
      'Keep unit conversion single-sourced and grep-verifiable.',
      'Design alarm and drop policies from measured noise and worst-case stalls.',
      'Run the complete test pyramid: host suite, integration checklist, board bring-up plan.',
    ],
    prerequisites: ['embc-m18-l2', 'embc-m13-l3', 'embc-m10-l3', 'embc-m07-l3'],
    architecture:
      'Drivers: adc_sensor.c (temperature chain, module 10-l3), adc_light.c (divider percent, module 12-l1) — each owns its mock register. Services: scheduler.c (module 05-l3 table), logbuf.c (ring buffer with seq + drops), filter (4-sample moving average). Application: monitor.c (cadences, alarm machines with hysteresis, health gate wiring). The log consumer prints on the host; on a board it drains to UART (module 07).',
    steps: [
      {
        title: 'Build the two drivers with their conversions',
        detail:
          'temp_read_x10 exactly per module 18-l2 (chain + guard + fault sentinel). light_read_percent: counts * 100 / 1024, no offset (ratiometric). Grep check: mock register names appear only in these two files.',
      },
      {
        title: 'Add the filter and cadence table',
        detail:
          'Moving average of 4 temperature samples inside the driver/service boundary; scheduler rows for light (100 ms), temperature (500 ms), alarm check (after temp), status (5 s).',
      },
      {
        title: 'Implement the alarm machines',
        detail:
          'Two instances of the module 18-l2 alarm machine (one struct each) — HEAT and DARK with their hysteresis gaps. Fault sentinels map to FAULT states, never to extreme readings.',
      },
      {
        title: 'Wire the logging path',
        detail:
          'log_write(level, code, value_x10) formats a compact line into the ring buffer with a sequence number (module 18-l3); the consumer drains and prints. Drops counted; the consumer detects gaps from sequence numbers.',
      },
      {
        title: 'Add the health gate',
        detail:
          'Each scheduled task sets its bit per completed cycle; a monitor check kicks the mock watchdog only when all required bits are present (module 13-l3). Log missing bits before simulated resets.',
      },
      {
        title: 'Run the storm tests',
        detail:
          'Scripted "world": temperature ramping through both thresholds, a light channel going dark, then the ADC returning rail counts (unplugged sensor). Verify: two alarm transitions per threshold crossing, zero chatter, FAULT handling, log stream with correct sequences and counted drops.',
      },
    ],
    testPlan: [
      'Host: conversion suites for both channels (module 18-l2 test table, plus the honest 543 → 1749 mV → 1249 tenths rounding case).',
      'Host: alarm machines — crossings both directions, chatter sequences around 42.5 °C and 12% produce zero transitions, fault sentinel → FAULT → recovery.',
      'Host: scheduler grid across a wrapped tick counter; all cadences land on their grid.',
      'Host: log buffer — FIFO order, sequence continuity, drop counting under a scripted stall, consumer gap detection.',
      'Host: health gate — a stubbed failing task yields the missing-bit report and no kick.',
      'Board (integration): real ADC noise floor measured, real LDR divider range verified (module 12-l1), alarms exercised with a heat source and a covered sensor; log drain over UART at 115200.',
    ],
    expectedResults:
      'A complete monitor that samples two sensors on independent cadences, raises and clears two hysteresis alarms correctly, logs every transition with sequence-numbered lines, counts drops under load, and reports its own health — with the entire logic suite passing on host in milliseconds.',
    troubleshooting: [
      'Alarm chatter around a threshold: hysteresis gap smaller than the measured noise — re-measure the noise (module 10-l2) and widen the gap.',
      'Log drops during alarm bursts: consumer slower than burst rate — raise consumer cadence or capacity per the module 18-l3 sizing formula, never unbounded.',
      'Temperature reads fault after motor starts: grounding/reference contamination (module 12-l3) — layout issue, not code.',
      'Health gate reports a task constantly: its cadence is slower than the monitor window — align window to the slowest required period.',
      'Watchdog resets under logging load: worst-case loop exceeded the WDT period — re-measure (module 15-l3) and resize with margin.',
    ],
    hardwareDependencies:
      'Host: fully runnable and fully testable — mock ADCs, simulated time, printed logs; no hardware required. Board: two analog inputs (a TMP36-class sensor and an LDR divider), a real ADC configured per the vendor manual (channel, sample time, reference — module 10-l1), UART for log drain, and a real watchdog; timing behaviour and analog noise are the board-owned truths (module 17-l3 split).',
  },
];
