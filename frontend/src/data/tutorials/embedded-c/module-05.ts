import type { TutorialLesson } from '../types';

export const module05Lessons: TutorialLesson[] = [
  {
    id: 'embc-m05-l1',
    title: 'Timer Basics: Clocks, Prescalers and Overflow',
    summary:
      'How a peripheral counts clock pulses for you: prescaler and auto-reload arithmetic worked end to end, plus the overflow flag that turns counting into timing.',
    objectives: [
      'Explain the three-stage model: input clock -> prescaler -> counter -> overflow.',
      'Compute tick frequency and overflow rate from clock, prescaler and reload values.',
      'Choose prescaler/reload pairs for a target period.',
      'Simulate a timer on a mock and handle its overflow flag.',
    ],
    whyItMatters:
      'Every "do this every 10 ms", every PWM period, every baud rate and every measurement of time in firmware rests on this arithmetic. It is pure number work — no vendor-specific magic — and getting fluent in it is what separates people who copy timer code from people who write it.',
    prerequisites: ['embc-m01-l2', 'embc-m02-l1'],
    explanation:
      'A hardware timer is a counter wired to a clock. Every incoming clock pulse increments the counter register; firmware reads the count, gets interrupted on overflow, or reacts at chosen count values. The timer counts *perfectly* — no loop overhead, no jitter — because silicon, not software, does the counting.\n\n### The three-stage model\n\n1. **Input clock**: usually a divided peripheral-bus clock (module 01-2 clock tree). Say 72 MHz.\n2. **Prescaler**: divides the input by a programmable factor. Most families define it as "divide by PSC + 1" so a register value of 0 means no division. 72 MHz with PSC = 7199 gives 72,000,000 / 7200 = exactly 10,000 Hz — the counter now ticks at 10 kHz.\n3. **Counter with auto-reload**: the counter counts 0, 1, 2, ... up to the reload value (ARR — auto-reload register), then wraps to 0 and raises the **overflow flag** (UIF, update interrupt flag). With ARR = 9999, the cycle takes 10,000 counter ticks = exactly 1 second at 10 kHz.\n\nThe two formulas you will use forever: **tick frequency = f_clk / (PSC + 1)** and **overflow frequency = tick_frequency / (ARR + 1)**. Overflow period is the reciprocal. Note the +1s — they exist so "no division" and "count of 1" are representable, and forgetting them is the classic factor-of-error in timer code.\n\n### From timing requirement to register values\n\nWork backwards from the requirement. "Blink at 2 Hz" means overflow every 0.5 s. Pick a prescaler that puts the tick in a comfortable range (a 16-bit counter caps ARR at 65535, so overflow period <= 65536 ticks): at 72 MHz, PSC = 7199 (10 kHz tick) allows periods up to 6.5535 s. Then ARR = 0.5 s * 10,000 − 1 = 4999. Both registers are just numbers; the skill is keeping units straight (Hz, ms, counts) and minding the +1s.\n\n### The overflow flag\n\nWhen the counter wraps, hardware sets a bit in the timer\'s status register — UIF. Firmware learns "a period elapsed" either by polling that bit (and clearing it, usually by writing 0 or by write-1-to-clear depending on the family — the manual\'s access column decides) or by enabling the update **interrupt** (module 06). One non-negotiable: if you clear the flag wrong — or forget — you will see either no periodic events or an endless storm of them.',
    deepDive:
      '### Why the prescaler is not "just a divider"\n\nThe prescaler buys *range*. A 16-bit counter at full 72 MHz overflows every 0.9 ms — far too fast for seconds-scale timing, and interrupts at that rate would starve the CPU. Dividing first stretches the same 65536 counts over seconds or minutes. The trade-off is resolution: a 10 kHz tick can only hit multiples of 0.1 ms. Choose the coarsest tick that still meets your finest timing need — every division step makes the ARR math land on rounder numbers and the interrupt rate lower.\n\n### Names across families, honestly\n\nThe model is universal; the names are vendor-specific. STM32 timers expose PSC, ARR, CNT and the UIF bit in TIMx_SR. The ATmega328P (Arduino Uno chip) has 8-bit Timer0 and 16-bit Timer1 with prescaler select bits in TCCR0B/TCCR1B, counters TCNT0/TCNT1 and overflow flags TOV0/TOV1 in TIFR. The ESP32 has generic-purpose timer groups with divider and alarm registers configured through its SDK. The arithmetic in this lesson applies to all of them unchanged; the exact register names, widths and flag-clearing conventions come from each vendor\'s reference manual — always check, never guess.\n\n### Overflow as an event source\n\nThe overflow (update) event is the heartbeat of most firmware: a 1 ms overflow interrupt increments the system tick that the scheduler in lesson 3 uses. That is why this lesson\'s flag matters even in interrupt-driven designs — the ISR is simply the "auto-handler" of the same UIF bit you polled here. Timer interrupts also have quirks worth previewing: they can nest with other interrupts, and forgetting to clear UIF inside the ISR re-triggers it immediately (module 06-l1 shows the endless-interrupt bug).',
    examples: [
      {
        title: 'A mock timer with prescaler, reload and overflow flag, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of a hardware timer. Register names follow the\n * generic model (PSC, ARR, CNT, SR); real firmware uses the vendor\n * header, and the flag-clearing convention comes from the manual. */\nstatic volatile uint16_t MOCK_TIM_PSC = 9u;    /* divide by PSC+1 = 10 */\nstatic volatile uint16_t MOCK_TIM_ARR = 99u;   /* count 0..99, then wrap */\nstatic volatile uint16_t MOCK_TIM_CNT = 0u;\nstatic volatile uint8_t  MOCK_TIM_SR  = 0x00u;\n#define TIM_SR_UIF (1u << 0)\n\nstatic uint32_t div_countdown = 0u; /* models the prescaler stage */\n\n/* One input clock pulse arrives. Returns 1 if the counter overflowed. */\nstatic uint8_t mock_timer_tick(void) {\n    if (div_countdown == 0u) {\n        div_countdown = (uint32_t)MOCK_TIM_PSC + 1u;\n    }\n    div_countdown--;\n    if (div_countdown != 0u) {\n        return 0u;                      /* prescaler still counting */\n    }\n    MOCK_TIM_CNT++;                     /* one counter step */\n    if (MOCK_TIM_CNT > MOCK_TIM_ARR) {\n        MOCK_TIM_CNT = 0u;\n        MOCK_TIM_SR |= TIM_SR_UIF;      /* overflow: set update flag */\n        return 1u;\n    }\n    return 0u;\n}\n\nint main(void) {\n    uint32_t overflows = 0u;\n    for (uint32_t t = 1u; t <= 2500u; t++) {\n        if (mock_timer_tick() != 0u) {\n            overflows++;\n            MOCK_TIM_SR &= (uint8_t)~TIM_SR_UIF; /* service the flag */\n            printf("overflow %u at input tick %u\\n",\n                   (unsigned)overflows, (unsigned)t);\n        }\n    }\n    printf("final CNT=%u\\n", (unsigned)MOCK_TIM_CNT);\n    return 0;\n}',
        explanation: [
          'Configuration: input 1 MHz (small numbers for a short simulation), PSC = 9 → counter steps at 1 MHz / 10 = 100 kHz, ARR = 99 → overflow every 100 steps = every 1000 input ticks = 1 ms.',
          'The prescaler stage counts down from PSC+1; when it expires, the counter gains one step. First step lands on input tick 10, then every 10 ticks.',
          'The 100th step lands on tick 1000 → overflow 1. The 200th lands on tick 2000 → overflow 2. A third would land on tick 3000 — past the loop end.',
          'Exact output: `overflow 1 at input tick 1000` / `overflow 2 at input tick 2000` / `final CNT=50`. After the 2000th tick the counter gains 50 more steps (ticks 2010..2500), so CNT = 50.',
          'The main loop services UIF by clearing it after each overflow — on real hardware the clearing idiom (plain write 0 vs write-1-to-clear) is family-specific and lives in the manual.',
        ],
      },
      {
        title: 'Sizing registers for a 2 Hz blink (worked calculation)',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Requirement: overflow every 0.5 s from a 72 MHz input clock.\n * tick_freq  = f_clk / (PSC + 1)\n * overflow_t = (ARR + 1) / tick_freq\n * Choose PSC = 7199  ->  tick = 72e6 / 7200 = 10,000 Hz (0.1 ms)\n * Then ARR + 1 = 0.5 s * 10,000 Hz = 5,000  ->  ARR = 4999. */\n#define TIM_IN_FREQ_HZ  72000000u\n#define TIM_PSC         7199u\n#define TIM_ARR         4999u\n\nint main(void) {\n    uint32_t tick_hz = TIM_IN_FREQ_HZ / (TIM_PSC + 1u);\n    /* overflow period in microseconds: (ARR+1) * 1e6 / tick_hz */\n    uint32_t period_us = (uint32_t)((uint64_t)(TIM_ARR + 1u) * 1000000u\n                                    / tick_hz);\n\n    printf("tick frequency : %u Hz\\n", (unsigned)tick_hz);\n    printf("overflow period: %u us\\n", (unsigned)period_us);\n    return 0;\n}',
        explanation: [
          'tick_hz = 72,000,000 / 7200 = 10,000 Hz.',
          'period_us = 5000 * 1,000,000 / 10,000 = 500,000 us = 0.5 s.',
          'Exact output: `tick frequency : 10000 Hz` / `overflow period: 500000 us`.',
          'The 64-bit intermediate `(uint64_t)(TIM_ARR+1) * 1000000u` prevents a 32-bit overflow during the multiply (5000 * 1e6 = 5e9 exceeds uint32_t\'s 4.29e9 limit) — a realistic embedded math trap handled explicitly.',
          'The comment block shows the derivation order you should follow on paper first: requirement -> tick frequency -> ARR. The final registers are PSC = 7199, ARR = 4999.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Counter ramp and overflow events',
        content:
          '  CNT\n  ARR+1 --+          +----------+          +----------\n          |         /|         /|         /|\n          |        / |        / |        / |\n          |       /  |       /  |       /  |\n        0 +------+   +------+   +------+   +----> input ticks\n                     ^          ^          ^\n                    UIF        UIF        UIF      (overflow)\n  overflow period = (ARR+1) * (PSC+1) / f_clk',
        caption:
          'Educational waveform (illustrative). The counter ramps 0..ARR, wraps to 0, and raises the UIF flag at every wrap — the heartbeat most firmware runs on.',
      },
    ],
    tables: [
      {
        caption: 'Worked prescaler/reload combinations for a 72 MHz input clock',
        headers: ['PSC', 'Tick frequency', 'ARR', 'Overflow period'],
        rows: [
          ['0', '72 MHz', '7199', '72,000,000/7200 ticks = 100 us'],
          ['71', '1 MHz', '999', '1000 ticks = 1 ms'],
          ['7199', '10 kHz', '99', '100 ticks = 10 ms'],
          ['7199', '10 kHz', '9999', '10,000 ticks = 1 s'],
          ['7199', '10 kHz', '4999', '5,000 ticks = 0.5 s (2 Hz blink)'],
        ],
      },
      {
        caption: 'Timer register vocabulary across families (concept mapping)',
        headers: ['Generic name', 'STM32 style', 'ATmega328P style', 'Role'],
        rows: [
          ['Prescaler', 'PSC', 'prescaler bits in TCCRnB', 'Divide input clock'],
          ['Counter', 'CNT', 'TCNTn', 'The running count'],
          ['Auto-reload / top', 'ARR', 'OCRA (in CTC mode)', 'Where the count wraps'],
          ['Overflow flag', 'UIF in TIMx_SR', 'TOVn in TIFR', 'Period-elapsed status'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Forgetting the +1: dividing by PSC instead of PSC + 1.',
        fix:
          'Both the prescaler and the reload use "value + 1" semantics on most families. Write the two formulas as comments above the configuration and sanity-check by units: tick = f/(PSC+1), period = (ARR+1)/tick.',
      },
      {
        mistake: 'Overflowing your own arithmetic: computing (ARR+1) * 1e6 in 32 bits.',
        fix:
          'Promote to uint64_t for intermediate products, or rearrange the algebra to keep intermediates small. Silent wraparound in timing math produces periods that are wrong by whole factors.',
      },
      {
        mistake: 'Polling the overflow flag without clearing it, so every later check sees "just overflowed".',
        fix:
          'Clear the flag after acting on it, using the family\'s documented idiom (some are write-0-to-clear, some write-1-to-clear — the manual\'s access column decides). Module 06 shows the same requirement inside ISRs.',
      },
    ],
    guidedPractice: {
      title: 'Design a 10 ms heartbeat',
      brief:
        'From a 72 MHz input clock, choose PSC and ARR for a 10 ms overflow period. Show both formulas with numbers, then state the overflow frequency and how many overflows occur in 2 seconds.',
      expectedBehavior:
        'PSC = 7199 → tick = 10 kHz. (ARR+1) = 0.01 s * 10,000 = 100 → ARR = 99. Overflow frequency 100 Hz; 2 seconds = 200 overflows.',
      hints: [
        'Pick the tick first (10 kHz keeps ARR well inside 16 bits).',
        'overflow frequency = 1 / period.',
      ],
    },
    practiceExercises: [
      {
        title: 'Reverse-engineer a configuration',
        brief:
          'A timer has f_clk = 16 MHz, PSC = 63, ARR = 249. Compute the tick frequency, the overflow period and overflow frequency, then say what periodic task period this produces.',
        expectedBehavior:
          'tick = 16e6 / 64 = 250 kHz. Overflow every 250 counts → 250,000/250 = 1000 Hz = 1 ms period. This is the classic 1 kHz system-tick configuration.',
        hints: [
          'Divide by (PSC+1) = 64.',
          'Overflow frequency = tick / (ARR+1).',
        ],
      },
      {
        title: 'Extend the mock for a longer period',
        brief:
          'Change the mock configuration so an overflow happens every 5000 input ticks with the same 10-step prescaler, and predict the exact printf output for the same 2500-tick loop (which overflows, at which ticks, final CNT).',
        expectedBehavior:
          'ARR = 499. Steps every 10 ticks; overflow every 500 steps = 5000 input ticks — none within 2500 ticks, so NO overflow lines print and CNT ends at 250 (steps at ticks 10..2500 = 250 steps).',
        hints: [
          'Overflow period in steps = ARR + 1.',
          'Compare 5000 input ticks against the loop bound 2500.',
        ],
      },
    ],
    assessment: {
      title: 'Timer basics checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'With f_clk = 72 MHz and PSC = 7199, the counter tick frequency is:',
          options: ['10 kHz', '72 kHz', '100 Hz', '7200 Hz'],
          answer: '10 kHz',
          explanation: 'tick = f_clk / (PSC + 1) = 72,000,000 / 7200 = 10,000 Hz.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'With a 10 kHz tick and ARR = 9999, the overflow period is:',
          options: ['1 s', '0.1 s', '10 s', '1 ms'],
          answer: '1 s',
          explanation: 'Overflow every ARR+1 = 10,000 ticks; 10,000 / 10,000 Hz = 1 s.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'The prescaler makes the counter itself run faster so that ARR can be smaller.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'The prescaler divides the input clock, slowing the counter tick — it extends the reachable period range, at the cost of resolution.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'In the mock example (PSC = 9, ARR = 99, 1 MHz input), what does the loop print for t up to 1500?',
          code: 'for (uint32_t t = 1u; t <= 1500u; t++) {\n    if (mock_timer_tick() != 0u) {\n        overflows++;\n        printf("overflow %u at input tick %u\\n", (unsigned)overflows, (unsigned)t);\n    }\n}',
          options: [
            'overflow 1 at input tick 1000',
            'overflow 1 at input tick 999',
            'overflow 2 at input tick 1500',
            'nothing',
          ],
          answer: 'overflow 1 at input tick 1000',
          explanation:
            'Counter steps land on multiples of 10 ticks; the 100th step is tick 1000, where CNT would exceed 99 and wraps — the first and only overflow within 1500 ticks.',
          hint: 'First step is at tick 10, and each overflow needs 100 steps.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the two register values you must choose to set a timer overflow period, and the formula linking them to the period.',
          answer: 'PSC (prescaler) and ARR (auto-reload); period = (PSC+1)*(ARR+1)/f_clk',
          explanation:
            'The prescaler sets the tick rate and the reload sets the counts per period; together period = (PSC+1)(ARR+1)/f_clk (family semantics permitting).',
          hint: 'One divides the clock, one counts the ticks.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Prescaler', definition: 'A clock divider in front of the counter; divides by PSC+1 on most families.' },
      { term: 'Auto-reload register (ARR)', definition: 'The value the counter counts up to before wrapping; sets counts per period.' },
      { term: 'Overflow / update event', definition: 'The counter wrap that raises the UIF flag (or fires the update interrupt).' },
      { term: 'Tick', definition: 'One step of the prescaled counter: tick frequency = f_clk / (PSC + 1).' },
    ],
    revisionSummary: [
      'Timer = input clock -> prescaler (÷ PSC+1) -> counter -> overflow at ARR.',
      'tick = f/(PSC+1); overflow period = (ARR+1)/tick; both +1s matter.',
      'Prescaler buys range; 16-bit counters cap (ARR+1) at 65536.',
      'Service and clear the overflow flag by the family\'s documented idiom.',
      'Names differ per vendor (STM32 PSC/ARR/CNT, ATmega TCNT/OCRA, ESP32 divider/alarm) — the math is identical.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Programmable interval timer (concept)', url: 'https://en.wikipedia.org/wiki/Programmable_interval_timer', kind: 'article' },
      { label: 'Wikipedia — Prescaler', url: 'https://en.wikipedia.org/wiki/Prescaler', kind: 'article' },
      { label: 'docs.arduino.cc — millis() and timer concepts on AVR', url: 'https://docs.arduino.cc/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m05-l2',
    title: 'Output Compare and Input Capture',
    summary:
      'Beyond overflow: compare registers that fire at exact counts (waveform generation, PWM\'s ancestor) and capture registers that timestamp external edges.',
    objectives: [
      'Explain output compare: a compare value, a match event, and an optional pin action.',
      'Generate a fixed-frequency square wave by toggling a pin on every compare match.',
      'Explain input capture: latching the counter on an external edge to measure time.',
      'Relate compare/capture to PWM (module 11) and pulse measurement (module 12).',
    ],
    whyItMatters:
      'Overflow gives you a heartbeat; compare gives you *placement* — an event at an exact point in the cycle. Compare match is the mechanism behind PWM and precise pulse generation; input capture is how firmware measures external pulses to the tick. Together they turn the timer from a clock into an instrument.',
    prerequisites: ['embc-m05-l1'],
    explanation:
      'A compare channel watches the running counter and raises an event when CNT reaches a programmed value (CCR — capture/compare register). Nothing about this needs software timing: silicon does the watching every tick.\n\n### Output compare\n\nThree typical actions on a match: (1) set a status flag (CCF) for polling/interrupt; (2) drive an output pin — force high, force low, or **toggle**; (3) nothing visible, just the event. Toggle mode is the cleanest to understand: with the counter auto-reloading at ARR, a compare at CCR toggles the pin once per period, producing a square wave of frequency tick/(ARR+1). Choosing CCR merely shifts *when in the cycle* the toggle happens.\n\nFor asymmetric waveforms you use the compare event to change the pin and a second event (or the overflow) to change it back — one compare point plus the overflow gives two edges per cycle, and the ratio between them is a duty cycle. That construction, generalised, **is** PWM: module 11 builds it properly.\n\n### Input capture\n\nInput capture is the mirror image: an *external* edge on a pin freezes the current counter value into the capture register (and sets a flag). Firmware reads the latched count and knows exactly when the edge happened, to the tick. Capture two successive rising edges and subtract: that is the signal\'s period to tick resolution. Capture rising and falling: that is a pulse width. This is how an ultrasonic ranger\'s echo pulse (module 12) becomes a distance, and how an infrared receiver decodes its bit timings.\n\n### Flags and clearing, again\n\nCompare and capture events set their own flags in the status register, with the same clearing discipline as UIF. A compare flag left set will fire the interrupt again immediately; a capture flag left set means the *next* capture overwrites the register before you read it — a lost measurement. Read-then-clear, in the order the manual documents.',
    deepDive:
      '### Resolution and the capture-measurement floor\n\nEvery time measurement inherits the tick resolution. A 10 kHz tick measures durations to ±0.1 ms — useless for a 2.5 µs servo pulse. Capture applications run the counter *fast* (often PSC = 0 or 1, hundreds of kHz to MHz) and accept a shorter maximum measurable window (16-bit counter at 1 MHz overflows in 65.5 ms). The design loop is the same as lesson 1 but inverted: choose the tick from the *resolution* requirement, then confirm the counter does not overflow mid-measurement (or handle overflow chaining in software — extending capture to 32 bits by counting overflows, a standard technique).\n\n### One timer, several channels\n\nReal timers have multiple compare channels sharing one counter: channel 1 compares against CCR1, channel 2 against CCR2, and so on. One 10 kHz-counter can therefore generate a heartbeat flag, a 100 Hz square wave, and a second edge at a different phase — all from one peripheral, all phase-locked because they share the counter. This sharing is exactly how multi-channel LED dimmers and multi-servo outputs work with a single timer (module 11-3 uses the idea for servos).\n\n### When to use compare interrupts vs the pin hardware\n\nRouting the compare action to the pin (toggle/set/clear) is faster and jitter-free compared with an ISR that flips a GPIO: the hardware reacts in the same clock cycle as the match, while an ISR reacts after latency that varies with whatever else is running (and with interrupt nesting). The rule of thumb: if a *pin* must change at an exact instant, make the timer do it; reserve compare interrupts for events the pin hardware cannot express (queueing work, updating buffers).',
    examples: [
      {
        title: 'Square wave from a mock compare channel, counted and traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock: one compare channel driving a pin in toggle mode.\n * Real timers implement this in silicon (STM32 OC toggle mode, ATmega\n * COM0x0 toggle bits); the register names come from the vendor manual. */\nstatic volatile uint16_t MOCK_TIM_CNT = 0u;\nstatic volatile uint16_t MOCK_TIM_ARR = 999u;  /* period: 1000 steps  */\nstatic volatile uint16_t MOCK_TIM_CCR = 499u;  /* match at step 500   */\nstatic volatile uint8_t  MOCK_TIM_SR  = 0x00u;\n#define TIM_SR_CCF (1u << 1)\n\nstatic volatile uint8_t MOCK_GPIOA_ODR = 0x00u; /* bit 0 is the pin   */\n\nstatic uint8_t mock_compare_step(void) {\n    MOCK_TIM_CNT++;\n    if (MOCK_TIM_CNT == MOCK_TIM_CCR) {\n        /* match: flag, then toggle pin later - model both effects */\n        MOCK_TIM_SR |= TIM_SR_CCF;\n    }\n    if (MOCK_TIM_CNT > MOCK_TIM_ARR) {\n        MOCK_TIM_CNT = 0u;              /* overflow: restart period */\n        MOCK_GPIOA_ODR ^= 0x01u;        /* toggle on every wrap     */\n        return 1u;\n    }\n    return 0u;\n}\n\nint main(void) {\n    uint32_t toggles = 0u;\n    for (uint32_t t = 1u; t <= 10000u; t++) {\n        toggles += mock_compare_step();\n    }\n    printf("toggles=%u final pin=%u CCF=%u\\n",\n           (unsigned)toggles, (unsigned)(MOCK_GPIOA_ODR & 1u),\n           (unsigned)((MOCK_TIM_SR & TIM_SR_CCF) ? 1u : 0u));\n    return 0;\n}',
        explanation: [
          'Period = ARR+1 = 1000 steps; the pin toggles on every overflow (wrap), so the output is a square wave with period 1000 ticks.',
          '10,000 ticks = 10 periods = 20 toggles. After 20 toggles the pin (which started 0) is back to 0.',
          'The compare at CCR = 499 fires once per period (10 times), setting CCF — demonstrating flag + pin action coexisting.',
          'Exact output: `toggles=20 final pin=0 CCF=1`.',
          'Design mapping: with a 10 kHz tick this square wave is 10 Hz. Toggle-on-wrap is the simplest possible waveform generator; asymmetric edges (real PWM) come next in module 11.',
        ],
      },
      {
        title: 'Input capture: measuring a pulse width on the mock',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of input capture: an external edge latches CNT\n * into the capture register. Real parts latch in silicon on the edge;\n * here the simulation calls capture_edge() at the edge instants. */\nstatic volatile uint16_t MOCK_TIM_CNT  = 0u;\nstatic volatile uint16_t MOCK_TIM_CCR  = 0u;   /* latched edge time */\nstatic volatile uint8_t  MOCK_TIM_SR   = 0x00u;\n#define TIM_SR_CAPF (1u << 2)\n\nstatic void capture_edge(void) {\n    MOCK_TIM_CCR = MOCK_TIM_CNT;      /* hardware latches the count  */\n    MOCK_TIM_SR |= TIM_SR_CAPF;       /* and sets the capture flag   */\n}\n\nint main(void) {\n    uint16_t rising_time  = 0u;\n    uint16_t falling_time = 0u;\n\n    /* Simulated echo pulse: rises at tick 3000, falls at tick 5800. */\n    for (uint32_t t = 1u; t <= 6000u; t++) {\n        MOCK_TIM_CNT = (uint16_t)(t & 0xFFFFu); /* counter runs free */\n        if (t == 3000u) { capture_edge(); rising_time  = MOCK_TIM_CCR; }\n        if (t == 5800u) { capture_edge(); falling_time = MOCK_TIM_CCR; }\n    }\n\n    uint16_t pulse_ticks = (uint16_t)(falling_time - rising_time);\n    printf("pulse = %u ticks = %u us\\n",\n           (unsigned)pulse_ticks, (unsigned)pulse_ticks);\n    return 0;\n}',
        explanation: [
          'The counter runs free (free-running 16-bit count of the tick number here); the capture simply latches CNT at the edge instants.',
          'Rising edge latches 3000; falling edge latches 5800.',
          'Pulse width = 5800 − 3000 = 2800 ticks, computed with unsigned subtraction — correct even across the counter\'s wrap, which is why capture math uses differences.',
          'Exact output: `pulse = 2800 ticks = 2800 us` (1 tick = 1 µs in this simulation).',
          'Real usage: an ultrasonic sensor echo of 2800 µs is ~48 cm with the standard cm ≈ µs/58 rule — module 12 completes that chain.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Compare match and toggle output',
        content:
          '  CNT\n  ARR --+          +----------+          +---------\n        |         /|         /|         /|\n        |        / |        / |        /|\n      0 +-------+  +-------+  +-------+\n                 ^CCF       ^CCF      ^CCF      compare flag each period\n\n  pin (toggle on overflow):\n          ------+----------+----------+------\n                |          |          |\n                +----------+          +----> square wave\n                <--- ARR+1 ticks --->\n                period = (ARR+1) ticks',
        caption:
          'Educational waveform (illustrative). The compare channel raises CCF every period at CCR; toggling the pin on the overflow produces a square wave whose period is the timer period.',
      },
    ],
    tables: [
      {
        caption: 'Compare actions on match',
        headers: ['Action', 'Effect', 'Typical use'],
        rows: [
          ['Set flag (CCF)', 'Status bit / interrupt', 'Software pacing, callbacks'],
          ['Toggle pin', 'Pin flips each match', 'Square waves, carrier generation'],
          ['Force set/clear pin', 'Pin pinned at match point', 'One-shot pulses, asymmetric edges'],
          ['Capture (input side)', 'CNT latched on external edge', 'Period and pulse-width measurement'],
        ],
      },
      {
        caption: 'Measurement resolution versus window (16-bit counter)',
        headers: ['Tick', 'Resolution', 'Max window before wrap'],
        rows: [
          ['1 kHz', '1 ms', '65.5 s'],
          ['100 kHz', '10 us', '655 ms'],
          ['1 MHz', '1 us', '65.5 ms'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Measuring pulses by polling the pin in software instead of using capture.',
        fix:
          'Polling misses edges whenever other code runs and has loop-jitter. Capture latches the count in silicon at the exact edge — jitter-free to the tick.',
      },
      {
        mistake: 'Subtracting capture timestamps with signed panic about wraparound.',
        fix:
          'Unsigned subtraction (later − earlier) is correct across counter wrap by modular arithmetic — as long as the interval itself is shorter than the counter range. Keep timestamps unsigned and subtract.',
      },
      {
        mistake: 'Changing CCR mid-period and expecting instant effect.',
        fix:
          'Many families latch compare values at the update event (period boundary) precisely to avoid glitchy partial periods. Know whether your target applies CCR immediately or preloads it at overflow — the manual\'s "preload" note decides.',
      },
    ],
    guidedPractice: {
      title: 'Design a 2 kHz square wave',
      brief:
        'From a 1 MHz tick: (a) choose ARR so toggle-on-overflow yields 2 kHz; (b) state the toggle rate and the number of toggles in 0.25 s; (c) with a second channel comparing at CCR = 249, what is the phase relationship of the two events?',
      expectedBehavior:
        '(a) Output period = 500 us → 500 ticks → ARR = 499. (b) Toggle rate 2 kHz → 500 toggles in 0.25 s. (c) The compare fires 250 ticks into the 500-tick period — exactly the mid-point, i.e. 90 degrees of the square wave cycle apart from the overflow edge.',
      hints: [
        'Square wave period = timer period when toggling once per cycle.',
        'Phase = CCR position within the (ARR+1)-tick period.',
      ],
    },
    practiceExercises: [
      {
        title: 'Extend capture to 32 bits',
        brief:
          'A 1 MHz 16-bit counter overflows in 65.5 ms; an echo can last longer. Describe in 3-4 sentences the standard software extension: counting overflows alongside capture, and how to combine them into a 32-bit timestamp.',
        expectedBehavior:
          'Keep an overflow counter incremented in the overflow interrupt. On each capture, build the timestamp as (overflow_count << 16) | captured_value, taking care at the race window: if the capture flag and overflow flag arrive together, check the flag order documented by the vendor and adjust the overflow count accordingly (typically if capture happened just after wrap but before the ISR ran, decrement). The 32-bit result measures up to ~71 minutes at 1 MHz.',
        hints: [
          'The capture register only holds the low 16 bits.',
          'The subtle case is an edge that lands between the wrap and the ISR reading the flags.',
        ],
      },
      {
        title: 'Trace the compare mock with a different CCR',
        brief:
          'Change CCR to 249 in the square-wave example. Without running: how many times does CCF get set in 10,000 ticks, and does the pin output change at all? Justify both.',
        expectedBehavior:
          'CCF is set once per period regardless of CCR value (as long as CCR <= ARR): 10 times. The pin output is unchanged — it toggles on overflow, and CCR only moves when within the period the flag fires.',
        hints: [
          'The toggle is wired to the wrap, not the match.',
          'Count periods, not ticks.',
        ],
      },
    ],
    assessment: {
      title: 'Compare and capture checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Output compare with toggle action, period ARR+1 = 500 ticks, tick 1 MHz. Output frequency?',
          options: ['1 kHz', '2 kHz', '500 Hz', '4 kHz'],
          answer: '1 kHz',
          explanation:
            'Toggling once per period makes the pin\'s full cycle two timer periods: 500 us toggle interval → 1 ms wave period → 1 kHz.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Input capture measures an interval by:',
          options: [
            'Latching the counter value on an external edge',
            'Counting CPU loop iterations',
            'Reading the prescaler',
            'Sampling the pin at 1 Hz',
          ],
          answer: 'Latching the counter value on an external edge',
          explanation:
            'The capture hardware freezes CNT at the edge instant; differences between latched values are the measured time.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Unsigned subtraction of two capture timestamps gives the correct interval even across a counter overflow.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'Modular arithmetic makes later − earlier correct modulo 2^N, provided the true interval is shorter than the counter range.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'In the square-wave mock (ARR=999, toggle on wrap, 10,000 ticks), how many toggles occur and what is the final pin level?',
          code: '/* ARR=999, CCR=499, 10000 ticks */',
          options: ['20 toggles, pin 0', '10 toggles, pin 1', '20 toggles, pin 1', '10 toggles, pin 0'],
          answer: '20 toggles, pin 0',
          explanation:
            '10 periods, 2 toggles per period (one per wrap) = 20; an even number of toggles returns the pin to its start level 0.',
          hint: 'Toggles per period is two? Check the code: one toggle per wrap.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Why should a pin that must transition at an exact instant be driven by the timer hardware rather than from a compare interrupt ISR?',
          answer: 'the hardware reacts on the match cycle, while an ISR has variable latency (interrupt latency/jitter)',
          explanation:
            'Pin actions execute in the same clock cycle as the match; ISR-driven pins inherit interrupt latency that varies with nesting and other code.',
          hint: 'Compare the hardware path against interrupt latency.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Output compare', definition: 'A channel that raises an event (flag and/or pin action) when CNT reaches CCR.' },
      { term: 'Input capture', definition: 'A channel that latches CNT into CCR when an external edge arrives — a hardware timestamp.' },
      { term: 'Toggle mode', definition: 'Compare action that flips an output pin, generating a square wave at tick/(ARR+1) per toggle.' },
      { term: 'Overflow chaining', definition: 'Extending effective capture range past 16 bits by counting overflows in software.' },
    ],
    revisionSummary: [
      'Compare = event at CNT == CCR: flag, pin toggle, or pin force.',
      'Toggle-per-period gives a square wave of period (ARR+1) ticks.',
      'Capture = hardware timestamp of external edges; subtract unsigned across wraps.',
      'Resolution vs window: fast ticks measure finely but briefly (16-bit range).',
      'Multi-channel timers share one counter — phase-locked events for free.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Programmable interval timer (concept)', url: 'https://en.wikipedia.org/wiki/Programmable_interval_timer', kind: 'article' },
      { label: 'Wikipedia — Pulse-width modulation (preview of module 11)', url: 'https://en.wikipedia.org/wiki/Pulse-width_modulation', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m05-l3',
    title: 'Non-Blocking Timing: Ticks, Software Timers and Delays',
    summary:
      'Replace delay() loops with a system tick: cooperative scheduling by timestamp comparison, wrapping-safe elapsed-time checks, and why busy-wait is the last resort.',
    objectives: [
      'Explain why blocking delays are harmful in firmware.',
      'Build a system tick from a periodic timer and schedule tasks by timestamp.',
      'Use wrapping-safe elapsed-time comparison with unsigned subtraction.',
      'Implement a tiny cooperative scheduler on a mock tick source.',
    ],
    whyItMatters:
      'The jump from blinking-with-delay() to real firmware is the jump to non-blocking time. A tick-driven scheduler keeps LEDs blinking, buttons debouncing and sensors reading *simultaneously* — and the same timestamp idiom scales up to RTOS delayed tasks in module 16.',
    prerequisites: ['embc-m05-l1'],
    explanation:
      'The beginner pattern — `led_on(); delay_ms(500); led_off(); delay_ms(500);` — has three fatal defects: nothing else runs during the delay, the delay is only as accurate as a busy loop, and scaling to five tasks with five delays produces unreadable interlocked code. The fix is to invert control: a timer overflow (lesson 1) ticks a counter 1000 times a second, and *every* timing decision becomes a comparison of timestamps.\n\n### The system tick\n\nOne timer overflow every 1 ms increments `g_ticks` (usually in the interrupt; module 06 formalises it). `g_ticks` is `volatile uint32_t` — shared with the ISR, hence volatile; and it *will* wrap after about 49.7 days at 1 kHz. The trick that makes wrapping harmless: never compare absolute ticks, always compare **differences**. "Has 500 ms passed since start?" is `(uint32_t)(g_ticks - start) >= 500` — and unsigned modular subtraction gives the right answer even when g_ticks wraps in between, provided the interval is shorter than 2^31 ticks (the margin that keeps the difference unambiguous).\n\n### Scheduling by timestamp\n\nEach periodic task keeps `uint32_t last_run`. Every loop iteration asks: `if ((uint32_t)(g_ticks - last_run) >= PERIOD) { last_run += PERIOD; run_task(); }`. Tasks with different periods coexist naturally — LED at 500 ms, sensor poll at 20 ms, log at 5000 ms — all in one non-blocking loop. This is a **cooperative scheduler**: the simplest thing that is not delay(), and the direct ancestor of the superloop architectures in module 13.\n\n### Busy-wait: the honest exception\n\nSometimes you genuinely must spin — waiting a few microseconds for a peripheral flag between two register writes (the "delay" some interfaces require). Busy-wait is acceptable *only* when bounded, short (microseconds), and documented, because it burns CPU and blocks everything. Anything above ~1 ms belongs on the tick.',
    deepDive:
      '### last_run += PERIOD versus last_run = g_ticks\n\nTwo scheduling disciplines hide in that one line. `last_run += PERIOD` (fixed-phase) keeps the average rate exact — if a task runs late once, it runs immediately again to catch up — but a starved task can accumulate a backlog of periods. `last_run = g_ticks` (slippage allowed) simply restarts the interval after each run: rates can drift under load, but no burst catch-up ever occurs. Drivers prefer slippage; control loops and logging prefer fixed phase. Knowing which behaviour you chose is the difference between "the log catches up" and "the log runs forever late".\n\n### The 49.7-day bug and how the idiom defeats it\n\nA naive `if (g_ticks > start + 500)` breaks when g_ticks wraps: the addition overflows into small numbers and the condition goes false for weeks. The difference form `(uint32_t)(g_ticks - start) >= 500` stays correct because subtraction in unsigned modular arithmetic is exactly the "distance since" — wrap cancels out. This is worth internalising as *the* embedded timestamp idiom; you will meet it again in ring-buffer indices (module 07) and sequence numbers in communication protocols.\n\n### Where the tick comes from, honestly\n\nOn real hardware the tick is one timer configured for 1 ms overflow with its interrupt enabled (the RTC or a dedicated SysTick on ARM Cortex-M — vendor documentation names the exact peripheral and its priority). Our examples simulate the ISR by calling `mock_tick_isr()` from a loop so everything runs on a host; on silicon the same functions are called by the real interrupt. The scheduler code itself is identical in both worlds — that separation is the point.',
    examples: [
      {
        title: 'Tick-driven cooperative scheduler, fully traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nstatic volatile uint32_t g_ticks = 0u;   /* 1 kHz system tick (ISR-owned) */\n\nstatic void mock_tick_isr(void) {\n    g_ticks++;                            /* what the real timer ISR does */\n}\n\ntypedef void (*task_fn)(uint32_t now);\n\ntypedef struct {\n    uint32_t period;\n    uint32_t last_run;\n    task_fn  run;\n    const char *name;\n} task_t;\n\nstatic void task_led(uint32_t now)  { (void)now;\n    printf("[%6u ms] LED toggle\\n", (unsigned)now); }\nstatic void task_sensor(uint32_t now) { (void)now;\n    printf("[%6u ms] sensor poll\\n", (unsigned)now); }\n\nstatic task_t tasks[2] = {\n    { 500u, 0u, task_led,    "led"    },\n    { 200u, 0u, task_sensor, "sensor" },\n};\n\nint main(void) {\n    /* Simulate 1.1 seconds of ticks; the scheduler runs between them. */\n    for (uint32_t ms = 0u; ms <= 1100u; ms++) {\n        for (uint32_t i = 0u; i < 2u; i++) {\n            if ((uint32_t)(g_ticks - tasks[i].last_run) >= tasks[i].period) {\n                tasks[i].last_run += tasks[i].period; /* fixed-phase */\n                tasks[i].run(g_ticks);\n            }\n        }\n        mock_tick_isr();\n    }\n    return 0;\n}',
        explanation: [
          '`g_ticks` increments once per simulated millisecond — the stand-in for the real timer interrupt.',
          'The scheduler checks each task with the wrapping-safe difference `(g_ticks - last_run) >= period`. With `last_run` starting at 0, the first dispatch of a task lands when the counter reaches its period — the fixed-phase grid.',
          'Trace: sensor (200 ms) runs at ticks 200, 400, 600, 800, 1000; LED (500 ms) runs at 500 and 1000. At tick 1000 both are due — LED dispatches first (task index 0), then the sensor.',
          'Exact output lines: `[   200 ms] sensor poll`, `[   400 ms] sensor poll`, `[   500 ms] LED toggle`, `[   500 ms] sensor poll`, `[   600 ms] sensor poll`, `[   800 ms] sensor poll`, `[  1000 ms] LED toggle`, `[  1000 ms] sensor poll`.',
          'Both tasks ran to their own clocks in one loop with zero blocking calls — the property that makes the pattern scale.',
        ],
      },
      {
        title: 'Wrapping-safe timeout check demonstrated',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    /* Simulate the tick counter near its 2^32 wrap:\n     * the task started 300 ticks before the wrap; we are now\n     * 100 ticks PAST the wrap, so 400 ticks have truly elapsed. */\n    uint32_t start = 4294966996u;   /* = 2^32 - 300 */\n    uint32_t now   = 100u;\n    const uint32_t timeout = 150u;\n\n    /* WRONG: absolute comparison. start + timeout stays a huge number. */\n    uint8_t  wrong   = (uint8_t)(now > (start + timeout));\n\n    /* RIGHT: difference form - unsigned modular subtraction. */\n    uint32_t elapsed = (uint32_t)(now - start);\n    uint8_t  right   = (uint8_t)(elapsed >= timeout);\n\n    printf("wrong=%u right=%u elapsed=%u\\n",\n           (unsigned)wrong, (unsigned)right, (unsigned)elapsed);\n    return 0;\n}',
        explanation: [
          'Setup: start = 4,294,966,996 is exactly 300 ticks before the uint32_t wrap (2^32 = 4,294,967,296). now = 100 is 100 ticks after it. True elapsed time = 300 + 100 = 400 ticks, long past the 150-tick timeout.',
          'WRONG form: start + timeout = 4,294,967,146 — a huge number, so now (100) is never greater than it: wrong = 0. The timeout silently never fires, for as long as the counter is on the far side of the wrap.',
          'RIGHT form: (uint32_t)(now - start) = (100 - 4294966996) mod 2^32 = 100 + 4,294,967,296 - 4,294,966,996 = 400 — the true elapsed distance. 400 >= 150, so right = 1.',
          'Exact output: `wrong=0 right=1 elapsed=400`.',
          'The difference idiom is the standard embedded timestamp pattern: it measures true distance across any single wrap, as long as the real interval is well under 2^31 ticks.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Blocking delay versus tick scheduling',
        content:
          ' BLOCKING (delay_ms):                       TICK-DRIVEN (cooperative):\n\n time ->                                    time ->\n [LED wait 500ms      ....nothing....]      [tick]--(diff>=500?)--LED\n [sensor waits for LED to finish]          [tick]--(diff>=200?)--sensor\n                                           [tick]-- other work ANY time\n\n one thing at a time;                       all tasks progress at their\n jitter accumulates;                        own period; loop is always\n loop is unresponsive                       ready for new work',
        caption:
          'The tick inverts control: tasks never wait, they are polled. The same shape scales to module 13 architectures and module 16 RTOS delayed tasks.',
      },
    ],
    tables: [
      {
        caption: 'Timing techniques compared',
        headers: ['Technique', 'Blocking?', 'Accuracy', 'Use for'],
        rows: [
          ['Busy-wait cycles', 'Yes', 'Poor (loop overhead, interrupts)', 'Microsecond register waits only'],
          ['delay_ms on a tick', 'Yes', 'Tick-exact but freezes everything', 'Never (except init sequences)'],
          ['Timestamp difference', 'No', 'Tick-exact, wrap-safe', 'Periodic tasks, timeouts'],
          ['Timer output hardware', 'No', 'Cycle-exact', 'Pin waveforms (PWM, pulses)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Comparing timestamps absolutely: `if (g_ticks > start + 500)`.',
        fix:
          'The addition overflows at the tick wrap and the condition dies for weeks. Always subtract: `if ((uint32_t)(g_ticks - start) >= 500)`.',
      },
      {
        mistake: 'Making g_ticks a plain uint32_t.',
        fix:
          'It is written by the ISR and read everywhere — it must be volatile, and on 8/16-bit targets 32-bit reads of it are non-atomic (module 06 fixes that with a critical section or 64-bit-by-construction access patterns).',
      },
      {
        mistake: 'Mixing units: periods in ms compared against ticks that are not milliseconds.',
        fix:
          'Define the tick rate once (a TICK_HZ macro), derive all periods from it (ms_to_ticks(x) = x * TICK_HZ / 1000), and never write raw tick numbers in task code.',
      },
    ],
    guidedPractice: {
      title: 'Add a third task',
      brief:
        'Extend the scheduler with a log task of period 3000 ms and predict exactly which ticks in 0..3500 it fires at, given that last_run starts at 0 (first dispatch when the counter reaches the period).',
      expectedBehavior:
        'Fires at tick 3000 only within 0..3500 (the difference reaches 3000 there; next would be 6000). Fixed-phase: last_run advances 0 → 3000.',
      hints: [
        'The condition is true at tick 0 because last_run starts there.',
        'Fixed-phase adds the period each time.',
      ],
    },
    practiceExercises: [
      {
        title: 'Timeout with error path',
        brief:
          'Write `wait_for_flag(volatile uint8_t *flag, uint32_t timeout_ticks)` that polls a flag but gives up after timeout_ticks and returns 0 on success, 1 on timeout — using the difference idiom. Then state why the same function without a timeout is dangerous in production.',
        expectedBehavior:
          'Record start = g_ticks; loop while flag not set: if (g_ticks - start >= timeout) return 1. Return 0 when the flag appears. Without a timeout, a stuck peripheral (or a never-arriving event) hangs the entire system — every real wait needs a bounded escape.',
        hints: [
          'The loop condition tests two things: flag set, or time expired.',
          'g_ticks must be declared before use — assume the tick ISR exists.',
        ],
      },
      {
        title: 'Fixed phase versus slippage',
        brief:
          'A log task (period 1000) is starved for 4500 ms, then the loop frees up. With `last_run += PERIOD`, how many log lines burst out, and at which ticks (starting last_run = 0, g_ticks now 4500)? What changes with `last_run = g_ticks`?',
        expectedBehavior:
          'Fixed-phase: the condition is true for elapsed 4500 >= 1000; each run advances last_run by 1000, so it fires at ticks 1000, 2000, 3000, 4000 — four back-to-back catch-up runs (then last_run = 5000, next due at 5000). With slippage: one run at 4500 and the next at 5500 — one line, no burst.',
        hints: [
          'The while-style catch-up runs repeatedly until elapsed < period.',
          'Slippage throws away the backlog deliberately.',
        ],
      },
    ],
    assessment: {
      title: 'Non-blocking timing checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why is `(uint32_t)(now - start) >= duration` preferred over `now >= start + duration`?',
          options: [
            'The difference form stays correct when the tick counter wraps',
            'It compiles to fewer instructions',
            'It works with signed types',
            'It avoids reading the counter twice',
          ],
          answer: 'The difference form stays correct when the tick counter wraps',
          explanation:
            'Unsigned modular subtraction measures true elapsed distance; absolute comparison breaks when the addition overflows at the wrap.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A 1 kHz system tick wraps its uint32_t counter after roughly:',
          options: ['49.7 days', '49.7 hours', '4.97 days', '1 year'],
          answer: '49.7 days',
          explanation: '2^32 ms = 4,294,967,296 ms ≈ 49.7 days — the origin of the famous "49-day bug" in tick arithmetic done wrong.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A busy-wait delay is an acceptable tool for microsecond-scale register sequencing waits.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'Bounded microsecond spins are sometimes required by interface timing; anything above ~1 ms belongs on the tick scheduler.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'With fixed-phase scheduling and last_run = 0, at which ticks does a 250 ms task run during 0..900 ms?',
          code: 'if ((uint32_t)(g_ticks - t.last_run) >= t.period) {\n    t.last_run += t.period;   /* fixed phase */\n    run();\n}',
          options: ['250, 500, 750', '0, 250, 500, 750', '250, 500, 750, 900', '0, 900'],
          answer: '250, 500, 750',
          explanation:
            'The difference starts at 0, so the first dispatch lands when g_ticks reaches 250; each run advances last_run by 250. At tick 900 elapsed is 150 < 250, so the next run waits until 1000.',
          hint: 'Fixed phase keeps the schedule grid; with last_run = 0 the grid starts at the first period.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'What two properties must the shared tick variable g_ticks have in C?',
          answer: 'volatile and a fixed-width unsigned type (uint32_t), written by the timer ISR',
          explanation:
            'volatile because an ISR modifies it outside program flow; unsigned fixed-width because the difference idiom depends on modular arithmetic.',
          hint: 'One is a qualifier, one is a type family.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'System tick', definition: 'A periodic counter (usually 1 kHz from a timer interrupt) that all software timing references.' },
      { term: 'Cooperative scheduler', definition: 'A loop that polls each task\'s timestamp and runs it when its period has elapsed; tasks never block.' },
      { term: 'Wrapping-safe comparison', definition: 'Testing elapsed time as unsigned (now − start) >= duration so counter wrap cannot break the check.' },
      { term: 'Fixed-phase scheduling', definition: 'Advancing last_run by the period so the average rate is exact, with catch-up bursts after starvation.' },
    ],
    revisionSummary: [
      'One tick, many tasks: schedule by timestamp difference, never by delay().',
      'The difference idiom is wrap-safe for intervals shorter than 2^31 ticks.',
      'Fixed-phase keeps exact rates; slippage avoids bursts — choose deliberately.',
      'g_ticks is volatile, ISR-owned, unsigned.',
      'Busy-wait only for bounded microsecond waits.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Cooperative scheduling', url: 'https://en.wikipedia.org/wiki/Cooperative_multitasking', kind: 'article' },
      { label: 'Wikipedia — System time / monotonic time concept', url: 'https://en.wikipedia.org/wiki/Monotonic_function', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
