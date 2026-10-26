import type { TutorialLesson } from '../types';

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'mcu-m02-l1',
    title: 'The Uno R3 and the Arduino Layer',
    summary:
      'What the Uno R3 physically is (ATmega328P at 16 MHz, 5 V), what the Arduino runtime gives you (setup/loop, pin API, USB serial), and a blink with the timing deliberately computed.',
    objectives: [
      'Describe the Uno R3 platform: ATmega328P, 16 MHz, 5 V logic, USB-serial bridge — attributed to official Arduino documentation.',
      'Explain the Arduino program model: setup/loop, pin abstraction, and what the runtime does before your first line.',
      'Write a blink whose delay arithmetic is derived from the API contract, not copied.',
      'State honestly what the abstraction hides (clock selection, pin mapping, startup code) and where the next lesson goes.',
    ],
    whyItMatters:
      'The Uno R3 is where most of the world starts, and starting well means knowing what the friendly API is doing on your behalf. The Arduino layer is genuinely good engineering — but "it just works" is not a skill. This lesson pairs the API view with the hardware view so that when Module 2 Lesson 2 pulls the abstraction back, nothing feels like magic.',
    prerequisites: [
      'Device classes and determinism (mcu-m01-l1)',
      'Family survey: ATmega328P row (mcu-m01-l2)',
      'Embedded C fundamentals (Embedded C course)',
    ],
    explanation:
      'The **Arduino Uno R3** is a board built around Microchip\'s **ATmega328P**: an 8-bit AVR running at **16 MHz** from the board\'s crystal, with **5 V logic**, 14 digital I/O pins, 6 analog inputs, 32 KB flash and 2 KB SRAM (board and chip facts per docs.arduino.cc and the Microchip ATmega328P datasheet — verify against both for your board). A second small MCU on the board bridges USB to the ATmega\'s hardware UART, which is why `Serial` appears as a COM port with no extra hardware.\n\n### The Arduino program model\n\nAn Arduino sketch defines two functions: `setup()` (runs once after reset) and `loop()` (runs forever after it). You never write a `main()` — the runtime supplies it, and before your `setup()` runs it has already: initialized the C runtime (zeroed globals), configured the USB-serial bridge, and mapped the core\'s pin registers. On top of that sit the pin APIs — `pinMode`, `digitalWrite`, `digitalRead`, `analogRead`, `analogWrite` — each a small library function that computes which MCU register and bit your *board pin number* corresponds to and performs the read-modify-write. The pin number abstraction is a *board* fact (Uno pin 13 maps to a specific ATmega port bit, per the official Uno documentation) — that mapping is exactly what Lesson 2 opens up.\n\n### Blink with computed timing\n\nThe canonical first program is a blink: `digitalWrite(pin, HIGH); delay(500); ...`. The API contract says `delay(ms)` blocks for approximately the given milliseconds (per the Arduino language reference) — so 500 ms high + 500 ms low is a 1 Hz LED. What the *hardware* does during `delay()` is nothing: the core spins on a software timer. That fact — the CPU is *busy* while blinking — is the seed of the `millis()` non-blocking pattern this module develops and Module 5\'s projects use.',
    deepDive: '### What the abstraction is actually costing (and why it is still worth it)\n\nA `digitalWrite` call does: validate the pin, look up the port/bit from a table, decide smask/cmask, and do a two-branch read-modify-write of the port register — a handful of instructions plus call overhead, executed every call (this shape is visible in the open Arduino core source). For a human-speed LED, the microseconds are invisible — the abstraction is pure win. For a 200 kHz bit-banged bus, those same microseconds are fatal, which is why the register-level lesson exists. The engineering judgment is per-signal: API everywhere timing allows, registers where timing demands, and *documented wrappers* where the two meet. Note the honest limitation: this platform has no physical board and no AVR toolchain, so all sketches here are presented as annotated code to read and trace, not programs this environment executes — running them is the reader\'s step on real hardware.\n\n### Where 5 V shows up in code\n\nThe Uno\'s 5 V logic means: HIGH ≈ 5 V, and every output can source/sink current *per the ATmega328P datasheet limits* (Module 5 gives the order-of-magnitude and the verify-first habit). It also means the Uno drives 5 V sensors directly but must NOT feed 5 V signals into the 3.3 V boards of Modules 3-4 — the translation rules from mcu-m01-l3 apply the moment you mix families.',
    examples: [
      {
        title: 'Blink, with the timing derived and the non-blocking twin',
        language: 'cpp',
        code:
          '// ---- Version A: blocking blink (the classic) ----\n// API facts per docs.arduino.cc language reference:\n//   pinMode(pin, OUTPUT) configures the pin as an output\n//   digitalWrite(pin, v) sets it HIGH/LOW\n//   delay(ms) blocks ~ms milliseconds\nconst int ledPin = 13;          // board pin with onboard LED (Uno docs)\n\nvoid setup() {\n    pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n    digitalWrite(ledPin, HIGH);\n    delay(500);                 // high 0.5 s\n    digitalWrite(ledPin, LOW);\n    delay(500);                 // low 0.5 s -> 1 Hz blink\n}\n\n// ---- Version B: non-blocking blink with millis() ----\nconst unsigned long INTERVAL = 500;   // ms per half-period\nunsigned long lastToggle = 0;\nbool ledState = LOW;\n\nvoid setup() {\n    pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n    unsigned long now = millis();          // ms since power-up\n    if (now - lastToggle >= INTERVAL) {\n        lastToggle = now;                  // or += INTERVAL to avoid drift\n        ledState = (ledState == LOW) ? HIGH : LOW;\n        digitalWrite(ledPin, ledState);\n    }\n    // loop returns immediately: other work runs here\n}',
        explanation: [
          'Version A\'s timing is derived from the API contract: delay(500) twice = 1000 ms period = 1 Hz. Nothing was copied; the 1 Hz claim follows from the documented semantics of delay().',
          'Version A\'s cost: during delay() the core executes a busy-wait — it cannot respond to inputs, read sensors, or do anything else. Fine for one LED; fatal for two.',
          'Version B uses millis() (ms since power-up, per the reference) and a comparison: the LED toggles whenever 500 ms elapsed, and loop() returns immediately — the standard pattern for "blink plus real work".',
          'The `now - lastToggle` subtraction with unsigned arithmetic is deliberately overflow-safe (millis() wraps ~49 days on a 16 MHz AVR; the difference form survives it).',
          'Honest note: these sketches are read-and-trace material on this platform — no board, no toolchain here. On hardware, verify pin 13 maps to your board\'s LED in the official Uno documentation.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'What happens between power and your loop()',
        content:
          ' power-on reset\n      |\n      v\n runtime startup (hidden main):        <- what the abstraction hides\n   - C runtime init (zero .bss, copy .data)\n   - clock source already running (16 MHz crystal)\n   - USB-serial bridge MCU independent of your code\n      |\n      v\n setup()   (once)\n      |\n      v\n loop()    (forever)                    <- all YOUR code lives here',
        caption:
          'The Arduino runtime owns startup; your two functions own everything after. Lesson 2 opens the hidden box.',
      },
    ],
    tables: [
      {
        caption: 'The Arduino pin API vs what it touches (board/chip facts per official docs)',
        headers: ['API call', 'What it does', 'Hidden work'],
        rows: [
          ['pinMode(p, OUTPUT)', 'Configure pin direction', 'Board-pin -> port/bit lookup; register write'],
          ['digitalWrite(p, v)', 'Set pin high/low', 'Read-modify-write of port register'],
          ['digitalRead(p)', 'Read pin level', 'Port-pin register read, masked'],
          ['analogRead(A0..)', 'Start + poll ADC conversion', 'ADC mux select, start, wait, scale to 0-1023'],
          ['analogWrite(p, v)', 'Configure/update PWM duty', 'Timer peripheral setup (see Lesson 3)'],
          ['delay(ms) / millis()', 'Block ms / ms since boot', 'A timer tick counter underneath'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using delay() in a program that must also respond to inputs.',
        fix: 'delay() blocks the entire core. Any program with more than one timing need uses the millis() comparison pattern (Version B) — blink, debounce and sensor polling all coexist then. Module 5\'s projects are built this way.',
      },
      {
        mistake: 'Assuming board pin numbers are the same across boards.',
        fix: 'Pin numbers are board facts: Uno pin 13 is the onboard LED per the Uno docs, but the same number means a different MCU pin on other boards. Verify pin maps in the official board documentation for YOUR board.',
      },
      {
        mistake: 'Believing the sketch is "the whole program".',
        fix: 'The runtime supplies main(), runtime init and clock configuration — your two functions run inside a prepared environment. Lesson 2 opens this box so the abstraction stays an informed choice, not a mystery.',
      },
    ],
    guidedPractice: {
      title: 'Derive the timing, then de-block it',
      brief:
        '(a) A blocking blink uses delay(250)/delay(750). Compute the frequency and duty cycle. (b) Convert it to the millis() pattern with asymmetric intervals, keeping identical timing. (c) State what new capability the conversion buys.',
      starterCode:
        '(a) period = ______ ms, frequency = ______ Hz, duty = ____ %\n(b) INTERVAL_HIGH = ____ ; INTERVAL_LOW = ____\n(c) new capability: ________',
      expectedBehavior:
        '(a) Period 1000 ms → 1 Hz; high fraction 250/1000 = 25% duty. (b) Two intervals: on for 250 ms, off for 750 ms — the millis() comparison picks the interval by current state. (c) loop() returns immediately, so inputs/sensors/second LEDs can be serviced concurrently — the blocking version could not.',
      hints: [
        'Frequency = 1000/period_ms.',
        'Duty = high time / period.',
        'The conversion changes WHEN digitalWrite is called, not the wire waveform.',
      ],
    },
    practiceExercises: [
      {
        title: 'Three-LED scheduler',
        brief:
          'Extend Version B to blink three LEDs with periods 300/500/700 ms using one shared millis() pattern. State why this is impossible with the blocking style.',
        expectedBehavior:
          'Each LED keeps its own lastToggle and interval; every loop() pass checks all three comparisons. Blocking style cannot: each delay() would serialize the whole program, and no independent three-period schedule exists inside nested delays.',
        hints: [
          'One lastToggle per LED, one comparison per pass.',
          'The loop period (fast) must be far shorter than the shortest interval.',
          'Blocking serializes; comparison scheduling interleaves.',
        ],
      },
      {
        title: 'Overflow reasoning',
        brief:
          'millis() on the Uno returns unsigned long (32-bit) milliseconds since boot — it wraps after ~49.7 days. Explain why `now - lastToggle >= INTERVAL` survives the wrap while `now > lastToggle + INTERVAL` does not.',
        expectedBehavior:
          'Unsigned subtraction is defined modulo 2^32: if now wrapped past 0 while lastToggle is huge, now − lastToggle still yields the small correct elapsed value. The addition form overflows lastToggle + INTERVAL past the wrap point, breaking the comparison. The difference form is the idiom — this is C unsigned arithmetic doing real engineering work.',
        hints: [
          'Unsigned arithmetic wraps consistently under subtraction.',
          'Try it with tiny numbers and a wrap at 10.',
          'The idiom difference-form is standard in embedded code.',
        ],
      },
    ],
    assessment: {
      title: 'Uno and Arduino layer checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Per official documentation, what characterizes the Arduino Uno R3 platform?',
          options: [
            'ATmega328P at 16 MHz, 5 V logic, USB via a bridge chip',
            'Dual-core 240 MHz, 3.3 V logic, Wi-Fi on-chip',
            'Dual Cortex-M0+ with PIO state machines',
            'A Linux-capable SoC with GB-scale RAM',
          ],
          answer: 'ATmega328P at 16 MHz, 5 V logic, USB via a bridge chip',
          explanation:
            'The Uno R3: ATmega328P, 16 MHz, 5 V, 14 digital I/O, 6 analog inputs, USB-serial bridge (per docs.arduino.cc and the Microchip datasheet). The other rows describe ESP32, RP2040 and SBC-class devices.',
          hint: 'Which family survey row is this?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'During delay(500), the ATmega328P CPU is executing a busy-wait and cannot do other work.',
          answer: 'true',
          explanation:
            'delay() blocks: the core spins on a timer comparison until the interval elapses. Any program needing concurrent timing uses the millis() comparison pattern instead.',
          hint: 'What is the CPU doing during those 500 ms?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Why is `now - lastToggle >= INTERVAL` preferred over `now > lastToggle + INTERVAL` for millis() scheduling?',
          options: [
            'It compiles smaller',
            'Unsigned subtraction is overflow-safe when millis() wraps, while the addition form breaks at the wrap',
            'It is more readable',
            'millis() returns signed values',
          ],
          answer: 'Unsigned subtraction is overflow-safe when millis() wraps, while the addition form breaks at the wrap',
          explanation:
            'Unsigned arithmetic wraps consistently under subtraction, so the difference form survives the ~49.7-day wrap of a 32-bit ms counter; the addition form overflows and miscompares.',
          hint: 'What happens at the wrap boundary in each form?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the Arduino API functions that set pin direction and drive a pin high/low (the pair this lesson uses for blink).',
          answer: 'pinMode digitalWrite',
          explanation:
            'pinMode(pin, OUTPUT) then digitalWrite(pin, HIGH/LOW) — the two calls behind every Arduino digital output (per docs.arduino.cc). (Order given as asked: pinMode/digitalWrite.)',
          hint: 'One configures, one drives.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Uno R3', definition: 'Arduino board: ATmega328P, 16 MHz, 5 V logic, USB-serial bridge (per docs.arduino.cc).' },
      { term: 'setup / loop', definition: 'The Arduino program model: init once, then run forever inside a runtime-supplied main.' },
      { term: 'Pin abstraction', definition: 'Board pin numbers translated to MCU port/bit by library code at every call.' },
      { term: 'millis() pattern', definition: 'Non-blocking scheduling via unsigned difference comparisons against ms-since-boot.' },
      { term: 'Blocking delay', definition: 'Busy-wait that occupies the core; the thing the millis() pattern replaces.' },
    ],
    revisionSummary: [
      'Uno R3 = ATmega328P @ 16 MHz, 5 V, USB bridge — verify board facts in official Arduino docs.',
      'Runtime owns startup (runtime init, clock, USB); you own setup() and loop().',
      'delay() blocks the core; the millis() difference-comparison pattern schedules without blocking.',
      'Board pin numbers are board facts; MCU port/bit mappings live under the API (next lesson).',
      'All sketches here are read-and-trace material — no board or toolchain on this platform.',
    ],
    furtherReading: [
      { label: 'Arduino language reference', url: 'https://docs.arduino.cc/language-reference/', kind: 'docs' },
      { label: 'Arduino Uno R3 product documentation', url: 'https://docs.arduino.cc/hardware/uno-rev3/', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'mcu-m02-l2',
    title: 'Registers Under the Abstraction',
    summary:
      'The same blink without the library: ATmega328P port registers (DDRB, PORTB) and bit manipulation — taught with a mock-register C illustration, clearly labeled, pointing to the official datasheet for the real addresses and bit names.',
    objectives: [
      'Explain the AVR port model: DDRx (direction), PORTx (output level), PINx (input) — names per the ATmega328P datasheet.',
      'Write the register-level blink using bit-set/clear idioms on named registers (mock illustration).',
      'State why direct register access is faster than digitalWrite and by roughly what class of factor.',
      'Identify honestly what this lesson cannot do here: run AVR code — the real version needs the AVR toolchain and avr-libc headers.',
    ],
    whyItMatters:
      'The library is a choice; the register is the reality. Reading ATmega port registers turns the pin abstraction inside out, makes timing-critical code possible, and — more than anything — teaches the transferable skill: every MCU you will ever use is memory-mapped bits, and the bit-set/clear idioms here are the same ones on ESP32, RP2040 and every Cortex-M. The mock-C format is deliberate: this platform has no AVR toolchain, so we practice the *reasoning* with named registers and verify names against the datasheet.',
    prerequisites: [
      'Arduino layer (mcu-m02-l1)',
      'Bitwise operators and masks (C Programming course)',
      'Datasheet-first method (mcu-m01-l3)',
    ],
    explanation:
      'On the ATmega328P, GPIO is organized into ports — B and C and D — of up to 8 bits each. Three registers per port (names per the ATmega328P datasheet; addresses and exact bit names to be verified there):\n\n- **DDRx** (Data Direction): one bit per pin; 1 = output, 0 = input.\n- **PORTx**: for output pins, the driven level; for input pins, the pull-up enable.\n- **PINx**: reads the physical pin level (inputs); writing 1 toggles output pins (a documented AVR convenience).\n\nThe Arduino pin number is a *board* mapping onto these — the Uno\'s onboard LED lives on port B, bit 5 (PB5, per the official Uno documentation/schematic). So the library\'s `digitalWrite(13, HIGH)` ends its journey as a single bit-set in PORTB.\n\n### The bit idioms\n\nAll register work is three idioms on a byte:\n\n- **Set a bit**: `REG |= (1 << BIT);` — read-modify-write leaving others untouched.\n- **Clear a bit**: `REG &= ~(1 << BIT);`\n- **Toggle a bit**: `REG ^= (1 << BIT);`\n\n`1 << BIT` builds a one-hot mask; the compound operators apply it selectively. These four lines are the whole "magic" of register programming — and they are identical in spirit on every MCU you will meet (peripheral differs, idiom does not).\n\n### Honesty box (read this)\n\nThe register *names* DDRB/PORTB/PINB and bit name PB5 are real ATmega328P datasheet names, and the Uno-LED-on-PB5 mapping is per the official Uno documentation. But this lesson\'s C is a **mock illustration**: it cannot compile here (no avr-libc `<avr/io.h>`, no AVR toolchain, no board), and the addresses it would reference are deliberately not quoted — the datasheet\'s register summary is the authority for those. What transfers from this lesson is the model and the idioms; the running version is your step on real hardware.',
    deepDive: '### Why the speed difference is a class, not a constant\n\n`digitalWrite(13, HIGH)` executes: call overhead, pin validation, table lookup of port/bit, a branch on the desired value, and the register write — many instructions at 16 MHz. The register idiom compiles to a single SBI/CBI-class instruction (set/clear bit in I/O space) — one or two cycles. Per call that is roughly two orders of magnitude, which is invisible at blink rates and decisive at bit-banged rates: a tight register-level loop can toggle tens-to-hundreds of kHz; the API version cannot. The datasheet\'s instruction set summary and the compiler\'s listing are how you verify the count — a measurement habit, not folklore.\n\n### Read-modify-write and the shared-register caution\n\n`REG |= mask` is three operations (read, modify, write). Between the read and the write, an interrupt could modify the same register — and your write would undo it (a lost update). In single-threaded setup code this never matters; inside ISRs or main-loop shared registers, use the AVR\'s atomic set/clear instructions (SBI/CBI, which the compiler emits for single-bit idioms on I/O registers) or guard the region. This is the embedded-C course\'s concurrency lesson arriving at the register level, and it recurs on every MCU family.',
    examples: [
      {
        title: 'Register-level blink (mock illustration, names per ATmega328P datasheet)',
        language: 'c',
        code:
          '/* =============================================================\n   MOCK REGISTER ILLUSTRATION — read-and-trace material.\n   NOT runnable on this platform: a real version needs the AVR\n   toolchain and #include <avr/io.h>, which define these names\n   from the ATmega328P datasheet. Verify ALL register names,\n   bit names and addresses in the official datasheet.\n   ============================================================= */\n\n/* Per the official Uno documentation, the onboard LED is on\n   AVR port B, bit 5 (PB5). */\n#define LED_BIT 5\n\nvoid setup_led(void)\n{\n    /* DDRB: data-direction register, port B.\n       Set bit 5 -> PB5 becomes an output. */\n    DDRB |= (1 << LED_BIT);\n}\n\nvoid led_toggle(void)\n{\n    /* PORTB: output register, port B.\n       XOR flips exactly bit 5, leaving bits 0-4 untouched. */\n    PORTB ^= (1 << LED_BIT);\n}\n\n/* Non-blocking scheduler as in mcu-m02-l1, register flavor:\n   a timer-provided millisecond tick replaces millis(); its\n   setup (timer prescaler, interrupt) is a datasheet exercise. */\nvoid loop_tick(unsigned long ms)\n{\n    static unsigned long last = 0;\n    if (ms - last >= 500) {\n        last = ms;\n        led_toggle();\n    }\n}',
        explanation: [
          'The mock header states its own status honestly: names are datasheet-real, the program is illustrative, the runnable version needs the AVR toolchain — exactly the platform\'s no-hardware/no-toolchain reality.',
          'DDRB |= (1 << 5): the set idiom — read DDRB, OR in a one-hot mask for bit 5, write back. Bits 0-4 (other port B pins) are untouched.',
          'PORTB ^= (1 << 5): the toggle idiom — XOR flips exactly the LED bit each call; 500 ms between calls gives 1 Hz.',
          'The comment chain traces the abstraction in reverse: digitalWrite(13, ...) -> board map -> PB5 -> PORTB bit 5 — the same journey the library makes at runtime, done once here by hand.',
          'What is deliberately NOT here: register addresses, the timer setup for the ms tick, and any claim this compiled or ran — the datasheet and a real toolchain own those.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'One port, three registers',
        content:
          '  PORT B (8 pins, PB0..PB7)\n\n  DDRB  : [b7 b6 b5 b4 b3 b2 b1 b0]   1=output 0=input\n  PORTB : [b7 b6 b5 b4 b3 b2 b1 b0]   output level / pullup\n  PINB  : [b7 b6 b5 b4 b3 b2 b1 b0]   physical pin read\n\n  Uno onboard LED -> PB5 (per official Uno docs)\n\n  digitalWrite(13,HIGH)  ~=  PORTB |= (1<<5)\n  digitalWrite(13,LOW)   ~=  PORTB &= ~(1<<5)\n  toggle                 ~=  PORTB ^=  (1<<5)',
        caption:
          'Three registers per port; every library pin call bottoms out in one of these bit operations. (Names per the ATmega328P datasheet.)',
      },
    ],
    tables: [
      {
        caption: 'The three bit idioms (the whole toolkit)',
        headers: ['Intent', 'Idiom', 'Effect on other bits'],
        rows: [
          ['Set bit n', 'REG |= (1 << n)', 'unchanged'],
          ['Clear bit n', 'REG &= ~(1 << n)', 'unchanged'],
          ['Toggle bit n', 'REG ^= (1 << n)', 'unchanged'],
          ['Test bit n', 'if (REG & (1 << n))', 'none (read only)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing a whole byte to a port register (PORTB = 0xFF) in shared code.',
        fix: 'Whole-byte writes clobber every other pin on the port — including pins other code configured. Use the read-modify-write idioms (`|=`, `&= ~`) except during deliberate full-port initialization.',
      },
      {
        mistake: 'Assuming the mock registers here are a runnable program.',
        fix: 'This platform has no AVR toolchain or headers; the real version needs avr-libc (`<avr/io.h>`) and a compiler targeting AVR — and register/bit names must be verified in the ATmega328P datasheet before use. The lesson transfers the model, not a build.',
      },
      {
        mistake: 'Forgetting read-modify-write is not atomic when interrupts share the register.',
        fix: 'An interrupt between the read and write loses your update (or undoes the ISR\'s). In ISR-shared registers use the compiler-emitted atomic bit instructions (SBI/CBI class on AVR) or guard the region — the concurrency discipline from Embedded C, applied.',
      },
    ],
    guidedPractice: {
      title: 'Extend the mock to two LEDs',
      brief:
        'The Uno documentation maps another LED-capable pin to port B, bit 4 (PB4) in our mock. Write setup and toggle code for BOTH PB5 and PB4 independently, then trace both bytes of PORTB through: start 0x00, toggle PB5, toggle PB4, toggle PB5.',
      starterCode:
        'void setup_two_leds(void) {\n    DDRB |= __________________________;\n}\n\nvoid led5_toggle(void) { PORTB ^= (1 << 5); }\nvoid led4_toggle(void) { ______________________; }\n\nPORTB trace:\n  start:    0b____0000  (0x00)\n  after 5:  0b001_0000  = 0x__\n  after 4:  0b0011_0000  = 0x__\n  after 5:  0b____0000  = 0x__',
      expectedBehavior:
        'Setup: DDRB |= (1<<5) | (1<<4) sets both directions in one read-modify-write. led4_toggle: PORTB ^= (1 << 4). Trace: 0x00 → 0x20 (bit5) → 0x30 (bits5+4) → 0x10 (bit4 only). Each toggle flips exactly its bit — the XOR idiom’s promise.',
      hints: [
        'Two masks OR together for the combined direction setup.',
        'Binary for the trace: bit5 = 0x20, bit4 = 0x10.',
        'XOR toggles; OR only sets — the trace shows the difference.',
      ],
    },
    practiceExercises: [
      {
        title: 'Input pin with pull-up (mock)',
        brief:
          'A button sits between PB0 and GND. Using the mock registers, write the setup that makes PB0 an input WITH pull-up enabled, and the read that returns 1 when the button is pressed. State which datasheet section confirms the pull-up semantics.',
        expectedBehavior:
          'Setup: DDRB &= ~(1 << 0); PORTB |= (1 << 0);  (direction input, pull-up on — per the ATmega328P datasheet’s port description: PORTx bit enables pull-up when DDRx bit is 0). Read: pressed = !(PINB & (1 << 0));  — pressed pulls the pin LOW (active-low button to GND). Section: the datasheet’s I/O port description.',
        hints: [
          'Clear the DDR bit for input; set the PORT bit for pull-up.',
          'Button to GND reads 0 when pressed — active low.',
          'PINx reads the physical pin; PORTx does not.',
        ],
      },
      {
        title: 'Instruction-count estimate',
        brief:
          'Estimate the cycle class of `digitalWrite(13, HIGH)` vs `PORTB |= (1<<5)` on a 16 MHz AVR, from the layered description in this lesson (call, validation, lookup, branch, write vs single bit-set instruction). State the use-case boundary this creates.',
        expectedBehavior:
          'digitalWrite: several-to-dozens of cycles (call + validation + lookup + branch + write); register idiom: ~1-2 cycles (compiler emits an SBI-class bit-set). Order of magnitude ~10x-50x per operation. Boundary: invisible for human-rate outputs; decisive for software-timed buses above ~100 kHz-class — where registers (or hardware peripherals) are mandatory.',
        hints: [
          'Count the layers, not exact cycles.',
          'SBI/CBI-class instructions are single-cycle bit ops on I/O space.',
          'The boundary is a rate class, not a fixed number.',
        ],
      },
    ],
    assessment: {
      title: 'Register-level checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'On the ATmega328P, which register pair configures a pin as output and drives it high (names per the datasheet)?',
          options: [
            'PINx to configure, PORTx to read',
            'DDRx to set direction (1 = output), PORTx to set the level',
            'PORTx to set direction, PINx to set the level',
            'Only PORTx is needed for both',
          ],
          answer: 'DDRx to set direction (1 = output), PORTx to set the level',
          explanation:
            'DDRx is the data-direction register (bit 1 = output), PORTx drives output level (and enables pull-ups on inputs), PINx reads physical pin state — the datasheet’s port model.',
          hint: 'Direction first, then level.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'This lesson’s register-level C can be compiled and run on this platform.',
          answer: 'false',
          explanation:
            'It is a mock illustration: the real version needs the AVR toolchain and avr-libc headers, plus a physical board. The lesson transfers the register model and bit idioms; running is the reader’s hardware step.',
          hint: 'Check the honesty box at the top of the example.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'PORTB starts at 0b00000000. After `PORTB ^= (1 << 5); PORTB |= (1 << 4); PORTB ^= (1 << 5);` what is PORTB?',
          code: 'PORTB ^= (1 << 5);\nPORTB |= (1 << 4);\nPORTB ^= (1 << 5);',
          options: ['0b00010000', '0b00110000', '0b00100000', '0b00000000'],
          answer: '0b00010000',
          explanation:
            'XOR sets bit 5 (0x20); OR sets bit 4 (→ 0x30); XOR again clears bit 5 (→ 0x10). XOR toggles; OR only sets — exactly the difference the trace shows.',
          hint: 'Track each bit separately: bit5 flips twice, bit4 set once.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the class of single-cycle AVR instructions (set/clear bit in I/O register) that the compiler emits for simple bit idioms — and the reason register access beats the library by an order of magnitude.',
          answer: 'SBI CBI',
          explanation:
            'SBI/CBI (set/clear bit in I/O register) are single-instruction atomic bit operations — the register idiom compiles to these, versus the library’s multi-instruction call path. (Also accept "bit-set/bit-clear".)',
          hint: 'Two three-letter mnemonics from the AVR instruction set.',
          difficulty: 'hard',
        },
      ],
    },
    keyTerms: [
      { term: 'DDRx', definition: 'Port data-direction register: 1 = output, 0 = input (ATmega328P datasheet naming).' },
      { term: 'PORTx', definition: 'Port output register: driven level on outputs, pull-up enable on inputs.' },
      { term: 'PINx', definition: 'Port input register: reads the physical pin levels.' },
      { term: 'Bit idiom', definition: 'The set/clear/toggle/test mask patterns (|=, &= ~, ^=, &) — universal across MCUs.' },
      { term: 'Mock register C', definition: 'This lesson’s labeled illustration: datasheet-real names, deliberately not compiled here.' },
    ],
    revisionSummary: [
      'Ports have three registers: DDRx (direction), PORTx (level/pull-up), PINx (read).',
      'The Uno LED maps to PB5 (official Uno docs); digitalWrite(13) bottoms out as a PORTB bit op.',
      'Four idioms — set, clear, toggle, test — are the entire register toolkit, portable in spirit to every MCU.',
      'Register access beats the API by an order-of-magnitude class (SBI/CBI vs multi-instruction call).',
      'Mock honesty: names real, program illustrative; the datasheet owns addresses, the toolchain owns builds.',
    ],
    furtherReading: [
      { label: 'ATmega328P product page (Microchip)', url: 'https://www.microchip.com/en-us/product/atmega328p', kind: 'docs' },
      { label: 'Arduino Uno R3 documentation', url: 'https://docs.arduino.cc/hardware/uno-rev3/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'mcu-m02-l3',
    title: 'PWM, ADC and Serial Debug',
    summary:
      'The three workhorse analog-ish APIs: analogWrite (PWM via hardware timers), analogRead (the 10-bit ADC), and Serial printing — with the timing and scaling arithmetic done properly and the hidden configuration named.',
    objectives: [
      'Explain analogWrite as timer-driven PWM: duty scaling (0-255), and the pin-dependent frequency classes on the Uno (~490/980 Hz, per Arduino reference).',
      'Compute the ADC reading arithmetic: 10-bit (0-1023) mapping of a 0-5 V input, and what resolution that is in volts.',
      'Use Serial prints as the primary debugging instrument on this platform — and know their cost.',
      'Name the hidden configuration each API performs (timer setup, ADC mux/start) that Lesson 2\'s register view makes visible.',
    ],
    whyItMatters:
      'Dimming an LED, reading a sensor, and finding out why either fails — these three APIs are 80% of beginner Arduino work. Doing the scaling arithmetic deliberately (what does 137 mean in volts? what current does duty 200 actually produce?) is the difference between an engineer and a snippet-copier. And Serial debugging — printf-style observation — is the technique you will keep using long after the libraries change.',
    prerequisites: [
      'Arduino layer (mcu-m02-l1)',
      'Register model (mcu-m02-l2)',
      'Number systems and scaling (C Programming course)',
    ],
    explanation:
      '### analogWrite: PWM from a hardware timer\n\n`analogWrite(pin, value)` does not produce an analog voltage — it configures a hardware **timer** to toggle the pin with a duty cycle of value/255 (per the Arduino language reference). On the Uno, most pins PWM at about **490 Hz**; pins 5 and 6 run at about **980 Hz** (timer0-based), per the same reference — the pin-dependent frequency is a board-firmware fact worth knowing because it decides whether a LED (fine) or an audio filter (not fine) sits on the other end. The lesson from the FPGA course transfers: duty encodes the level; frequency must clear the load’s flicker/ripple needs.\n\n### analogRead: the 10-bit ADC\n\n`analogRead(A0..A5)` performs one ADC conversion on the selected channel and returns **0-1023** (10 bits) spanning the analog reference — by default the 5 V supply (per the reference). The scaling arithmetic: volts = reading × 5.0 / 1023.0, i.e., ≈ 4.9 mV per step. Two consequences: sensor circuits are designed so their *interesting* range uses most of 0-5 V (Module 5’s divider work), and precision beyond ~5 mV does not exist on this ADC — if a datasheet promises 1 mV resolution, this is not the instrument.\n\n### Serial: the oscilloscope of software\n\n`Serial.begin(9600)` opens the hardware UART at the chosen baud (via the USB bridge, this appears as a COM port); `Serial.print/println` format and transmit. Printing is how you observe variables with no debugger attached: print state, timestamps, sensor readings. The cost is real — formatting and transmission take milliseconds at 9600 baud — so prints go where rates allow, and timing-critical sections stay print-free (or print *after* the event, with timestamps).',
    deepDive: '### What each API hides (register view recap)\nanalogWrite hides: timer mode selection (fast PWM), prescaler (which sets the ~490/980 Hz class), compare-match value (your 0-255), and pin-to-timer routing — several register writes, done once per pin. analogRead hides: ADC clock prescaler, mux channel selection, start-conversion bit, and the busy-wait for completion (~100 µs class per the reference’s guidance) — the reason analogRead is *not* instant. Serial hides: UART baud-rate register math (from the 16 MHz clock), buffer management, and the transmit interrupt. The register lesson (mcu-m02-l2) is what makes these hidden layers *readable* when you eventually open avr-libc or the core source — the API is the summary; the datasheet is the detail.\n\n### The scaling habit: units to the end\n\nEvery analog number crosses three representations: raw ADC counts (0-1023), engineering units (volts, °C, lux), and actuator commands (PWM 0-255). The engineering discipline is a named conversion per hop, with the constants derived from datasheets (ADC range, sensor curve) and checked by unit analysis — never a magic constant in the middle. Module 5’s sensor project builds exactly this chain for a photoresistor divider, and the servo project adds a fourth hop: microseconds.',
    examples: [
      {
        title: 'Sensor to PWM with named conversions (read-and-trace material)',
        language: 'cpp',
        code:
          '/* Read-and-trace material: no board/toolchain on this platform.\n   API semantics per docs.arduino.cc language reference. */\nconst int SENSOR_PIN = A0;   // analog input\nconst int LED_PIN    = 9;    // PWM-capable pin (Uno docs)\nconst float VREF     = 5.0;  // ADC reference = supply (default)\n\nvoid setup() {\n    Serial.begin(9600);          // open debug UART\n}\n\nvoid loop() {\n    /* Hop 1: counts -> volts. 10-bit ADC spans VREF. */\n    int counts = analogRead(SENSOR_PIN);            // 0..1023\n    float volts = counts * VREF / 1023.0;           // 0..5.0 V\n\n    /* Hop 2: volts -> LED brightness decision (here: direct map\n       to PWM duty). Duty is 0..255 per analogWrite contract. */\n    int duty = (int)(volts * 255.0 / VREF);         // 0..255\n    analogWrite(LED_PIN, duty);\n\n    /* Debug: print with units, plus the raw counts. */\n    Serial.print(\"counts=\"); Serial.print(counts);\n    Serial.print(\" volts=\"); Serial.print(volts, 3);\n    Serial.print(\" duty=\"); Serial.println(duty);\n\n    delay(200);   // slow loop: prints are cheap here\n}',
        explanation: [
          'Hop 1 is the ADC contract made arithmetic: counts × VREF / 1023.0 — the 1023 (not 1024) follows the reference’s 0-1023 span; the comment says so.',
          'Hop 2 maps volts to the PWM duty range with the same ratio — proportional dimming from the sensor voltage; the units cancel (V/V), which the comment shows.',
          'The print line includes raw counts AND engineering units — debugging always keeps the raw value visible so conversion bugs cannot hide behind a wrong constant.',
          'The 200 ms loop makes the ~millisecond Serial cost acceptable; at faster rates the print would dominate (the deep-dive point, applied).',
          'LED_PIN 9 is a ~490 Hz-class PWM pin on the Uno (pins 5/6 are the ~980 Hz class) — the pin-dependent frequency fact, used not just quoted.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The analog data path with its three representations',
        content:
          '  sensor voltage      ADC counts         PWM duty\n  0..5 V      -->     0..1023     -->    0..255\n  (analog)            (analogRead)       (analogWrite)\n      |                   |                  |\n      +-- conversion 1: x5.0/1023 --+        |\n      +-------------- conversion 2: x255/5 --+\n\n  Serial.print = the observation tap on every hop\n  (raw counts AND units, always both)',
        caption:
          'Three representations, two named conversions, one observation tap — the scaling discipline in one picture.',
      },
    ],
    tables: [
      {
        caption: 'The three APIs: contract, hidden work, cost',
        headers: ['API', 'Contract (per Arduino reference)', 'Hidden work', 'Cost'],
        rows: [
          ['analogWrite', 'Duty = value/255 on a PWM pin', 'Timer mode/prescaler/compare setup', 'Light after setup'],
          ['analogRead', 'Returns 0-1023 for 0..VREF', 'Mux select, start, wait (~100 us class)', 'Not instant; budget it'],
          ['Serial.print', 'Formats and transmits over UART', 'Baud registers, buffers, interrupts', 'ms-class at 9600 baud'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Calling analogWrite "analog output" and expecting a steady voltage from it.',
        fix: 'It is PWM: a fast square wave whose *average* is proportional to duty. LEDs and motors integrate it happily; audio or analog inputs need filtering. The frequency class (~490/980 Hz on the Uno, per the reference) is part of the contract.',
      },
      {
        mistake: 'Dividing by 1024 (or 255) in the ADC conversion.',
        fix: 'The 10-bit ADC spans 0-1023 inclusive across VREF: divide by 1023.0 for volts. Off-by-one divisors are the classic scaling bug — and the reason the raw counts are printed alongside the converted value.',
      },
      {
        mistake: 'Printing inside a timing-critical loop and wondering why timing broke.',
        fix: 'Serial formatting/transmission costs milliseconds at 9600 baud. Print at loop rates that tolerate it, or print summaries/after-the-fact with timestamps; keep hard-timing sections print-free.',
      },
    ],
    guidedPractice: {
      title: 'Scaling arithmetic drill',
      brief:
        'A sensor circuit outputs 2.5 V into A0 (5 V reference). (a) Compute the expected analogRead value. (b) Compute the duty for proportional LED brightness. (c) The reading jitters between 512 and 515 — convert that jitter to millivolts and state what ADC property it reflects.',
      starterCode:
        '(a) counts = 2.5 * 1023 / 5.0 = ______\n(b) duty = 2.5 * 255 / 5.0 = ______\n(c) jitter = ____ counts = ______ mV; reflects: ________',
      expectedBehavior:
        '(a) 2.5 × 1023/5 = 511.5 → ~512 counts (quantization: nearest step). (b) 2.5 × 255/5 = 127.5 → ~128. (c) 3 counts ≈ 3 × 4.9 mV ≈ 15 mV of jitter — reflecting the ADC’s ~4.9 mV/step resolution plus noise; sub-step precision does not exist on this instrument.',
      hints: [
        'Both conversions are the same ratio in different ranges — check the units cancel.',
        'Quantization: a continuous voltage lands on the nearest step.',
        'Convert counts to mV with the per-step size.',
      ],
    },
    practiceExercises: [
      {
        title: 'PWM frequency audit',
        brief:
          'You drive an LED from pin 9 (~490 Hz class) and it looks smooth; a colleague drives a small speaker from the same pin and hears a whine. Explain both observations with the PWM frequency, and name the fix for the speaker case.',
        expectedBehavior:
          '490 Hz is far above eye flicker fusion (~50-90 Hz) — the eye integrates; smooth. But 490 Hz is inside audible range — the speaker reproduces the PWM carrier as a whine. Fix: raise the PWM frequency (different timer/pin with a higher class) or filter the output (low-pass) — the duty/frequency trade from the FPGA course, reappearing.',
        hints: [
          'Eye bandwidth vs ear bandwidth — two different integrators.',
          'The carrier is audible if the transducer can reproduce it.',
          'Fixes: faster PWM or filtering — name both.',
        ],
      },
      {
        title: 'Serial timing budget',
        brief:
          'A line of 40 characters at 9600 baud 8N1 (10 bits/byte) takes how long to transmit? If your control loop must run at 100 Hz, is a print every loop viable? What do you change?',
        expectedBehavior:
          '40 bytes × 10 bits / 9600 baud = 400/9600 ≈ 41.7 ms per line. At 100 Hz (10 ms budget) a per-loop print is impossible — the print dominates. Change: print every Nth loop (e.g., every 10th), raise the baud rate, or shorten lines — and keep timestamps so reduced-rate logs stay meaningful.',
        hints: [
          '8N1 means 10 bits per byte on the wire.',
          'Bits ÷ baud = seconds.',
          'Compare print time to the loop budget, not to zero.',
        ],
      },
    ],
    assessment: {
      title: 'PWM, ADC, serial checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does analogWrite(pin, 128) actually produce on the Uno?',
          options: [
            'A steady 2.5 V output',
            'A ~490 Hz-class PWM square wave at ~50% duty (pin 5/6: ~980 Hz class)',
            'A 10-bit ADC sample',
            'A 2.5 V DAC reference',
          ],
          answer: 'A ~490 Hz-class PWM square wave at ~50% duty (pin 5/6: ~980 Hz class)',
          explanation:
            'analogWrite configures a hardware timer for PWM: duty = value/255. The Uno’s frequency classes are ~490 Hz on most pins and ~980 Hz on pins 5/6 (per the Arduino reference) — a PWM output, not analog.',
          hint: 'It is a timer behavior, not a voltage.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'On a 5 V-referenced Uno ADC, one LSB corresponds to roughly 4.9 mV.',
          answer: 'true',
          explanation:
            '10 bits span 0-1023 across 5 V: 5.0/1023 ≈ 4.89 mV per step — the resolution limit of this instrument.',
          hint: 'Divide the range by the step count.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'A 3.0 V signal on A0 reads what (5 V reference, 10-bit ADC)?',
          options: ['≈ 307', '≈ 512', '≈ 614', '≈ 768'],
          answer: '≈ 614',
          explanation:
            'counts = 3.0 × 1023 / 5.0 = 613.8 → ~614. The scaling arithmetic, applied once more.',
          hint: 'counts = volts × 1023 / VREF.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Three words: the logging habit of printing raw ADC counts alongside converted engineering units, so conversion bugs cannot hide.',
          answer: 'raw plus units',
          explanation:
            'Always print both raw and converted values (this lesson’s "raw plus units" habit): a wrong constant then shows up as a discrepancy instead of plausible-looking nonsense. (Accept "raw and units".)',
          hint: 'The debug print in the example shows both.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'analogWrite', definition: 'Timer-driven PWM output, duty = value/255; ~490/980 Hz classes on the Uno (per reference).' },
      { term: 'analogRead', definition: 'One 10-bit ADC conversion, 0-1023 across the analog reference.' },
      { term: 'LSB size', definition: 'Voltage per ADC step: VREF/1023 ≈ 4.9 mV on a 5 V Uno — the instrument’s resolution.' },
      { term: 'Serial debug', definition: 'Printing state over UART as the primary software observation tool — with its timing cost respected.' },
      { term: 'Scaling hop', definition: 'One named conversion between representations (counts/volts/duty/us) with derived constants.' },
    ],
    revisionSummary: [
      'analogWrite = PWM duty; frequency is pin/timer-dependent (~490/980 Hz Uno classes).',
      'analogRead = 10-bit, 0-1023, ~4.9 mV/LSB at 5 V reference; ~100 µs-class per call.',
      'Serial prints are the debugger of last resort — millisecond-costly, so budget them.',
      'Scaling hops are named conversions with derived constants; print raw plus units.',
      'Every API hides register configuration — Lesson 2’s model is what makes the hiding readable.',
    ],
    furtherReading: [
      { label: 'Arduino analogWrite reference', url: 'https://docs.arduino.cc/language-reference/en/functions/analog-io/analogWrite/', kind: 'docs' },
      { label: 'Arduino analogRead reference', url: 'https://docs.arduino.cc/language-reference/en/functions/analog-io/analogRead/', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
];
