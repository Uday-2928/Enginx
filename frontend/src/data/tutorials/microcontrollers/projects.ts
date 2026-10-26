import type { TutorialProject } from '../types';

export const mcuProjects: TutorialProject[] = [
  {
    id: 'mcu-proj-button-led',
    title: 'Debounced Button-Controlled LED (Toggle + Long-Press)',
    level: 'beginner',
    summary:
      'Input conditioning done properly: a button wired active-low with the internal pull-up, a 30 ms-class debounce, single-press LED toggle and a 1-second long-press blink mode — non-blocking throughout, with the full electrical checklist.',
    useCase:
      'Every interactive device ever: human inputs are bouncy, and clean edge detection is the gateway to menus, modes and confirmations.',
    requirements: [
      'Button between GPIO and GND; INPUT_PULLUP (idle HIGH, pressed LOW — per the Arduino reference).',
      'Debounce: state accepted only after 30 ms of stability (20-50 ms class; make it a named constant).',
      'Short press (< 1 s) toggles the LED; press >= 1 s (while held) enters fast-blink mode until release.',
      'Non-blocking: millis() difference pattern only — no delay() anywhere.',
      'Electrical checklist executed: same-domain voltage, internal pull-up (no external resistor), LED via computed series resistor.',
      'Serial debug line on every accepted state change (raw reading + event + millis() timestamp).',
    ],
    learningOutcomes: [
      'The debounce state machine: edges restart the stability window.',
      'Button event classification (press/long-press/release) from a noisy input.',
      'Non-blocking multi-timer scheduling with millis().',
      'Executing the pre-wiring checklist as a habit.',
    ],
    prerequisites: [
      'mcu-m02-l1 (millis pattern), mcu-m05-l3 (Project 1 is the base)',
      'C Programming course (state machines)',
    ],
    architecture:
      'A sampler loop (every pass) feeds a debounce stage (stability window via millis()), which feeds an event classifier (press start / ongoing / release, with the 1 s threshold), which drives two consumers: the LED toggle (short press) and the blink mode (long press, itself a millis()-scheduled 125 ms toggle).',
    steps: [
      {
        title: 'Wire and document the electrical layer',
        detail:
          'Checklist: button pin-to-GND (INPUT_PULLUP), LED + resistor computed for your board voltage (e.g., (5−2)/0.01 = 300 → 330 Ω on a 5 V board), same-domain, no driver needed. Write the checklist down before wiring — that is the deliverable, not just the wire.',
      },
      {
        title: 'Debounce stage',
        detail:
          'Port the mcu-m05-l3 debouncer: any edge restarts the window; state accepted after DEBOUNCE_MS of stability. Test first with Serial prints of raw vs accepted state.',
      },
      {
        title: 'Event classifier',
        detail:
          'Track press-start millis() on the accepted falling edge; on accepted rising edge, classify: held >= 1000 ms → long-press event, else → toggle event. One classifier function, unit-testable by feeding it synthetic readings in a host-compiled mock (mock-C versions of the logic are host-runnable).',
      },
      {
        title: 'Consumers',
        detail:
          'Toggle consumer: invert LED state on toggle events. Blink consumer: while in long-press mode, toggle the LED every 125 ms via its own millis() timer; exit on release. Verify the two consumers never fight (mode owns the LED; toggle only in normal mode).',
      },
      {
        title: 'Serial verification of the classifier',
        detail:
          'Print press duration and classification for ten presses of each kind; confirm counts and timings match intent. This is the Project-4 UART habit applied as a testbench.',
      },
    ],
    starterCode: {
      title: 'Debounce + classifier skeleton',
      language: 'cpp',
      code:
        '/* Read-and-trace material (no board on this platform);\n   API semantics per docs.arduino.cc. */\nconst int BUTTON = 2;\nconst int LED = 13;\nconst unsigned long DEBOUNCE_MS = 30;\nconst unsigned long LONGPRESS_MS = 1000;\n\nint stableState = HIGH;          // debounced state\nunsigned long lastEdgeMs = 0;\nunsigned long pressStartMs = 0;\nbool pressed = false;\n\n/* returns: 0 none, 1 short-press, 2 long-press(release) */\nint button_update(unsigned long now) {\n    int raw = digitalRead(BUTTON);\n    int event = 0;\n\n    if (raw != stableState && (now - lastEdgeMs) > DEBOUNCE_MS) {\n        stableState = raw;\n        if (stableState == LOW) {          // press accepted\n            pressed = true;\n            pressStartMs = now;\n        } else {                           // release accepted\n            pressed = false;\n            event = (now - pressStartMs >= LONGPRESS_MS) ? 2 : 1;\n        }\n    }\n    /* note: raw != stableState alone does not accept; the window\n       check needs an edge timestamp update — complete this in step 2 */\n    return event;\n}\n\nvoid loop() {\n    unsigned long now = millis();\n    int ev = button_update(now);\n    if (ev == 1) digitalWrite(LED, !digitalRead(LED));\n    /* step 4: long-press blink mode consumer goes here */\n}',
      explanation: [
        'The skeleton fixes the shape — debounced state, edge timestamps, an event-returning update function — and deliberately leaves the edge-timestamp bookkeeping as step 2\'s exercise.',
        'The event classifier returns codes (0/1/2) instead of acting directly: separable logic is testable logic (feed synthetic now/raw pairs on a host).',
        'The comment flags exactly the subtle line beginners get wrong: seeing an edge is not accepting a state — the window decides.',
        'The consumers live in loop(), keeping button_update pure — the same separation the scoreboard testbench used in the FPGA course.',
      ],
    },
    testPlan: [
      'Debounce: with bounce simulated (or observed on hardware via serial), exactly one accepted transition per press.',
      'Short press: LED toggles exactly once per release; ten presses → ten toggles.',
      'Long press: blink mode during hold; release ends it; no toggle on release.',
      'Timing: measured press durations in serial log match the 1 s classification boundary.',
      'Non-blocking: LED blink continues while button is held mid-press (no delay() anywhere — grep the sketch).',
    ],
    expectedResults:
      'On hardware: clean single toggles per press, blink during long holds, no phantom double-events. On this platform: the logic is host-mockable (pure functions on timestamps); the wiring checklist and bounce observation belong to the physical board, as stated.',
    troubleshooting: [
      'Double events per press: window too short for the switch — raise DEBOUNCE_MS within the 20-50 ms class, or count consecutive samples instead.',
      'LED always inverted: the active-low logic got "fixed" — pressed means LOW with INPUT_PULLUP; re-read the wiring notes.',
      'Long-press never triggers: press-start timestamp taken at release instead of press — trace the accepted-edge branches.',
      'Everything freezes during hold: a delay() crept into the blink consumer — return to the millis() pattern.',
    ],
    hardwareDependencies:
      'Physical board required for hardware steps; mock-register C versions host-runnable. Wiring (button, LED resistor), bounce observation and timing measurements happen on the physical board; logic is host-mockable and practiceable in the platform\'s Virtual Hardware Lab where available.',
  },
  {
    id: 'mcu-proj-analog-monitor',
    title: 'Analog Sensor Monitor (LDR Divider + Scaled Logging)',
    level: 'beginner',
    summary:
      'A photoresistor voltage divider read through the ADC with the full scaling chain — counts to volts to a named relative-light unit — logged over UART in parseable lines with raw-plus-units values and a moving-average smoother.',
    useCase:
      'The template for every analog sensor you will ever read: divider front-end, honest scaling, noise-aware logging, and a serial format a spreadsheet (or another program) can ingest.',
    requirements: [
      'LDR in a divider with a fixed resistor (value chosen deliberately, reasoning written down; kΩ-class → sub-mA divider current).',
      'ADC read at 5-10 Hz; conversion chain with named constants: counts (0-1023) → volts (× VREF/1023) → relative units (documented formula).',
      'Moving average over the last 8 samples for the logged value; raw sample also logged.',
      'UART output: CSV-style lines "ms,raw,volts,lux_relative" at a rate within the UART budget (mcu-m02-l3 arithmetic shown).',
      'Electrical checklist: same domain, divider current, ADC range within reference, orientation choice documented (LDR on top = dark reads low, or inverted — state it).',
    ],
    learningOutcomes: [
      'Divider front-end design with deliberate orientation.',
      'The named-conversion scaling chain, with units carried to the end.',
      'Noise handling: moving averages and why raw stays visible.',
      'Log-format discipline: parseable, timestamped, budgeted lines.',
    ],
    prerequisites: [
      'mcu-m02-l3 (scaling chain, serial budget)',
      'mcu-m05-l3 (Project 2 is the base)',
    ],
    architecture:
      'LDR + fixed resistor divider into an ADC pin; loop at 100 ms (millis-scheduled); each pass: analogRead → conversions → push into an 8-slot ring buffer → average → formatted serial line. All conversions live in named functions with the constants derived in comments.',
    steps: [
      {
        title: 'Choose the divider deliberately',
        detail:
          'Pick the fixed resistor near the LDR\'s mid-range resistance (its datasheet curve gives the range; e.g., 10 kΩ for a 1-100 kΩ-class LDR — verify in its datasheet). State the orientation: LDR on top (to VREF) means brighter → node voltage higher → bigger counts. Write the reasoning.',
      },
      {
        title: 'Electrical checklist',
        detail:
          'Same domain (no translation), divider current = VREF/(R_ldr+R_fix) — worst case ~ VREF/R_fix: with 10 kΩ and 5 V → 0.5 mA, trivially safe; ADC input within 0..VREF by construction. Two minutes, written down.',
      },
      {
        title: 'Scaling functions',
        detail:
          'counts_to_volts(c) = c * VREF / 1023.0; volts_to_units(v) = documented relative formula (e.g., normalized brightness = v / VREF). Constants named, derivations commented — the mcu-m02-l3 discipline.',
      },
      {
        title: 'Smoothing and logging',
        detail:
          'Ring buffer of 8 samples, average computed on insertion; line format "ms,raw,volts,rel" printed at 10 Hz — show the UART budget arithmetic (4 bytes × ~20 chars × 10 bits / 9600 baud ≈ 21 ms < 100 ms period: fits, with the margin stated).',
        code:
          'const int N = 8;\nint ring[N];\nint idx = 0;\n\nint push_avg(int v) {\n    ring[idx] = v;\n    idx = (idx + 1) % N;\n    long sum = 0;\n    for (int i = 0; i < N; i++) sum += ring[i];\n    return (int)(sum / N);\n}',
      },
      {
        title: 'Validate against reality',
        detail:
          'Cover the LDR: logged value should move substantially (and monotonically with your documented orientation). Shine light: reverse. If the response is inverted from your documentation, the orientation reasoning was wrong — fix the document, then the wiring (in that order).',
      },
    ],
    testPlan: [
      'Unit checks (host-mockable): counts_to_volts(0)=0, (1023)=VREF, (512)≈VREF/2.',
      'Divider sanity: logged volts never outside 0..VREF; raw within 0..1023.',
      'Smoothing: step response reaches ~7/8 of a step change within 8 samples (show the arithmetic).',
      'UART budget: measured line time (or arithmetic) fits the 100 ms loop with margin.',
      'Physical validation: cover/expose the LDR and confirm monotonic response in the documented direction.',
    ],
    expectedResults:
      'A parseable log stream whose values move correctly and smoothly with light, with all constants traceable to datasheet-derived comments. Host-mockable parts (conversions, averaging) run anywhere; the divider behavior itself is physical-hardware truth, as stated in hardwareDependencies.',
    troubleshooting: [
      'Readings pinned at 0 or 1023: divider wired to the wrong rail or the node shorted — check with the voltage-first method.',
      'Inverted response: orientation reversed from your documentation — fix the doc, then the wiring.',
      'Jittery log: smoothing window too small or a noisy supply reference — widen N; for serious precision, consider the external-ADC route (mcu-m03-l1 caveats).',
      'Garbled serial: baud mismatch or line rate over the UART budget — recompute with the shown arithmetic.',
    ],
    hardwareDependencies:
      'Physical board required for hardware steps; mock-register C versions host-runnable. The divider, its light response and ADC behavior are physical-hardware facts; conversions and averaging are host-mockable and practiceable in the platform\'s Virtual Hardware Lab where available.',
  },
  {
    id: 'mcu-proj-servo-sweep',
    title: 'Servo Sweep Controller (Signal Generator Concept)',
    level: 'intermediate',
    summary:
      'Generate the hobby-servo control signal (50 Hz-class frames, 1-2 ms pulses) from a timer, sweep position with a non-blocking state machine, and power the servo from a dedicated amp-class supply with the full grounding discipline.',
    useCase:
      'Any positional actuation: pan/tilt heads, small gates, pointer mechanisms — and the cleanest introduction to generating precise timing from software.',
    requirements: [
      'Signal per hobby-servo convention (verify your servo\'s datasheet): ~50 Hz frames (20 ms), pulse width 1.0-2.0 ms mapping to the servo\'s rated angle range.',
      'Pulse timing from a hardware timer/interrupt or a precise software path — jitter documented (jitter budget: sub-100 µs class for stable positioning).',
      'Non-blocking sweep state machine: sweep up, dwell, sweep down, dwell — rates as named constants.',
      'Electrical discipline: servo on ITS OWN 5 V amp-class supply; board shares only ground (one point) and the signal wire; stall current documented from the servo datasheet.',
      'Serial interface: \'a\' + number sets angle; \'s\' starts/stops sweep (parseable command line, mcu-m05-l3 Project 4 pattern).',
    ],
    learningOutcomes: [
      'Precise pulse generation: timers, jitter budgets, and why the signal wire carries timing, not power.',
      'Power discipline with numbers: stall current vs supply budget (the arithmetic shown).',
      'Non-blocking actuator choreography (sweep/dwell state machine).',
      'Command-line control over UART: parse, validate, act.',
    ],
    prerequisites: [
      'mcu-m05-l3 (servo project base, power discipline)',
      'mcu-m02-l1 (millis pattern) and mcu-m02-l3 (serial)',
    ],
    architecture:
      'A timer-based servo signal generator (on Arduino-class boards, the Servo library\'s timer mechanism — per docs.arduino.cc; the concept is a periodic 20 ms frame with a compare-matched pulse) fed by a position variable. A sweep state machine updates position at a fixed rate. A serial command parser writes the position variable or toggles the sweep. Power: servo supply separate; grounds star-pointed.',
    steps: [
      {
        title: 'Read the servo datasheet, write the timing table',
        detail:
          'Frame rate (≈50 Hz), pulse range (commonly ~1.0-2.0 ms; some servos ~0.5-2.5 ms — the datasheet decides), angle range (0-180° class), stall current (amp-class). The table is the contract; every constant below derives from it.',
      },
      {
        title: 'Power discipline, with arithmetic',
        detail:
          'Servo supply: 5 V amp-class (≥ stall current with margin). Show the arithmetic: stall 1.2 A vs USB-class ~500 mA (verify per spec/board docs) → deficit 0.7 A → dedicated supply mandatory. Grounds: one star point; signal wire carries timing only.',
      },
      {
        title: 'Signal generation',
        detail:
          'Arduino-class: Servo library (attach, writeMicroseconds — per docs.arduino.cc) which owns a timer; conceptually: every 20 ms frame emits a pulse of the commanded width. Note the jitter budget: positioning stability needs sub-100 µs-class frame consistency — why the timer (not delay loops) owns the pulse.',
      },
      {
        title: 'Sweep state machine',
        detail:
          'States: SWEEP_UP (position += RATE every TICK_MS until max), DWELL (hold DWELL_MS), SWEEP_DOWN, DWELL — all millis()-scheduled, non-blocking; a flag pauses/resumes.',
      },
      {
        title: 'Serial command line',
        detail:
          'Read lines from Serial; "a 90" sets angle (validate range against the timing table), "s" toggles sweep, unknown commands answered with a usage line. Parse, validate, act — and echo what was accepted.',
      },
    ],
    starterCode: {
      title: 'Sweep state machine (signal via Servo library per docs.arduino.cc)',
      language: 'cpp',
      code:
        '/* Read-and-trace material (no board on this platform).\n   Servo API per docs.arduino.cc; timing table from YOUR\n   servo\'s datasheet (verify pulse range + stall current). */\n#include <Servo.h>\n\nServo servo;\nconst int   SERVO_PIN = 9;\nconst int   MIN_US = 1000;    // from servo datasheet timing table\nconst int   MAX_US = 2000;\nconst int   STEP_US_PER_TICK = 10;\nconst unsigned long TICK_MS = 15;   // sweep update rate\nconst unsigned long DWELL_MS = 500;\n\nint posUs = MIN_US;\nint dir = +1;                 // +1 up, -1 down\nint state = 0;                // 0 sweep, 1 dwell\nunsigned long lastTickMs = 0, dwellStartMs = 0;\nbool sweeping = true;\n\nvoid setup() {\n    Serial.begin(115200);\n    servo.attach(SERVO_PIN, MIN_US, MAX_US);\n}\n\nvoid loop() {\n    unsigned long now = millis();\n    if (!sweeping) return;      // serial commands handled elsewhere\n\n    if (state == 0 && (now - lastTickMs) >= TICK_MS) {\n        lastTickMs = now;\n        posUs += dir * STEP_US_PER_TICK;\n        if (posUs >= MAX_US) { posUs = MAX_US; state = 1; dwellStartMs = now; }\n        if (posUs <= MIN_US) { posUs = MIN_US; state = 1; dwellStartMs = now; }\n        servo.writeMicroseconds(posUs);\n    } else if (state == 1 && (now - dwellStartMs) >= DWELL_MS) {\n        state = 0;\n        dir = (posUs >= MAX_US) ? -1 : +1;\n    }\n}',
      explanation: [
        'The timing table (MIN_US/MAX_US/rates) is declared as servo-datasheet-derived constants — the contract-first habit from the electrical side, applied to timing.',
        'servo.attach(pin, MIN, MAX) maps the pulse-range contract onto the library (per docs.arduino.cc); the conceptual point is that a timer owns the 20 ms frame — not delay loops.',
        'The state machine is fully non-blocking: sweep ticks and dwells are millis()-scheduled, and the serial parser (step 5) can interleave freely.',
        'Direction flip happens at dwell exit, using the dwell to reverse — a small choreography detail that avoids instant reversal jerk.',
        'Honest boundary: no board or toolchain here; the sweep logic is host-mockable (pure time/position math), the signal shape and power discipline are physical-board facts.',
      ],
    },
    testPlan: [
      'Timing table: pulse widths at commanded extremes match the servo datasheet (measured on hardware or logic analyzer on the physical board).',
      'Sweep: full travel time = (MAX-MIN)/STEP × TICK_MS — verify by serial timestamps.',
      'Commands: "a 90" sets mid-travel; out-of-range rejected with usage; "s" toggles sweep (pause/resume at current position).',
      'Power: stall test (hold the horn gently) — supply sags only on the servo rail; the board does NOT reset (the whole point).',
      'Jitter: positional stability consistent (no buzzing) — frame consistency within the sub-100 µs-class budget.',
    ],
    expectedResults:
      'A servo sweeping smoothly between documented endpoints, controllable by serial commands, with zero board brownouts during stalls. The state machine and parser are host-mockable; pulse shape and power behavior are physical-hardware verification, as stated.',
    troubleshooting: [
      'Servo buzzes at rest: frame jitter or an under-powered supply — verify supply first (the stall arithmetic), then timing.',
      'Board resets when the servo moves: power sharing violation — re-read step 2; the servo needs its own supply.',
      'Angles reversed or over-traveling: pulse range constants wrong for YOUR servo — re-derive from its datasheet table.',
      'Commands ignored: line ending mismatch (\n vs \r\n) or baud mismatch — print what you received, byte by byte, once.',
    ],
    hardwareDependencies:
      'Physical board required for hardware steps; mock-register C versions host-runnable. Servo pulse shapes, stall behavior and supply discipline are physical-hardware facts; the state machine, parser and timing math are host-mockable and practiceable in the platform\'s Virtual Hardware Lab where available.',
  },
];
