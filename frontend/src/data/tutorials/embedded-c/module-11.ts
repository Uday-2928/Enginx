import type { TutorialLesson } from '../types';

export const module11Lessons: TutorialLesson[] = [
  {
    id: 'embc-m11-l1',
    title: 'PWM Concepts: Duty Cycle, Frequency and Period',
    summary:
      'Digital pins pretending to be analog: the three numbers that define a PWM signal, how they relate, and worked timing for real use cases.',
    objectives: [
      'Define duty cycle, frequency and period and their relationship.',
      'Compute on-time and off-time from duty and frequency.',
      'Explain what a load physically experiences from a PWM signal.',
      'Choose frequency by application: LEDs, motors, servos and audio.',
    ],
    whyItMatters:
      'PWM is how digital hardware controls analog-ish things: LED brightness, motor speed, heater power, servo position. The arithmetic is trivial; the judgement (which frequency, which duty range) is the engineering — and getting frequency wrong produces audible whine, flicker or hot transistors.',
    prerequisites: ['embc-m05-l2'],
    explanation:
      '**Pulse-width modulation (PWM)** is a square wave of fixed frequency whose **duty cycle** — the fraction of each period spent high — is the control knob. A 25% duty signal is high for a quarter of every period; 75% is high for three quarters. The average power a load receives tracks the duty cycle: 25% duty at 3.3 V delivers the same *average* voltage as a steady 0.825 V, delivered in pulses instead.\n\n### The three numbers and their arithmetic\n\n- **Frequency (f)**: how many pulses per second. **Period (T) = 1/f**.\n- **Duty (D)**: fraction high, quoted in percent (or as counts/ticks in hardware).\n- **On-time = D * T**, **off-time = (1 − D) * T**.\n\nWorked: 1 kHz at 25% → period 1000 µs, on 250 µs, off 750 µs. At 20 kHz the period is 50 µs — on-times shrink to microseconds, which is why PWM at high frequency demands timer resolution (lesson 2).\n\n### What the load feels\n\nEverything depends on how fast the load reacts compared to the PWM period. An LED responds far slower than 1 ms pulses → your eye integrates → steady dimmer light. A motor\'s inductance smooths current → smooth torque. A heater integrates over seconds. But a buzzer or an audio path reproduces the *switching itself* — which is why PWM frequency must sit above the load\'s response band: LEDs above ~200 Hz (no flicker), motors 15-20 kHz+ (above hearing, quieter), servos *at* 50 Hz because they are designed to measure the pulse (lesson 3). Wrong frequency symptoms: LED flicker at low rates, audible whine on motors at mid rates, hot switching transistors when on-times get very short.\n\n### Duty as a control knob, honestly\n\nDuty-to-output is linear in *average voltage*, but rarely linear in *perception or physics*: LED brightness follows a perceptual (roughly logarithmic) curve, motor torque has stiction and deadbands, fans have startup voltages. Firmware compensates with correction curves (lookup tables or gamma functions) mapping "desired brightness %" to "actual duty %" — a calibration step for outputs, mirroring module 10-l2\'s calibration for inputs.',
    deepDive:
      '### Why not just use a resistor or a linear amplifier?\n\nA series resistor or a linear pass transistor sets brightness/speed by *burning the difference as heat*: 50% power means 50% of the energy becomes warmth in the regulator. PWM switches fully on or fully off — the switch dissipates almost nothing, because a fully-on transistor drops little voltage and a fully-off one passes no current. That efficiency is why everything from phone backlights to electric cars modulates with PWM. The costs: electromagnetic interference from the switching edges (slowing edge rates and shielding are the hardware answers), and the ripple the switching injects into the load (lesson 10-3\'s RC-filter discussion is the same story from the output side).\n\n### Frequency and resolution are enemies\n\nFor a fixed timer clock, raising PWM frequency shrinks the number of distinct duty values: a counter ticking at 1 MHz at 1 kHz PWM has 1000 steps (~10 bits); at 20 kHz only 50 steps (~5.6 bits) — brightness steps become visible and slow servo pulses coarse. The escape is a faster timer clock or a lower frequency; the trade is quantitative and lesson 2 works it. This tension (frequency ↔ resolution) is *the* PWM design decision, and it interacts with the load\'s frequency needs from the main explanation — three constraints, one compromise, written down before coding.',
    examples: [
      {
        title: 'PWM timing calculator, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nstatic void pwm_report(uint32_t freq_hz, uint32_t duty_percent) {\n    uint32_t period_us = 1000000u / freq_hz;\n    uint32_t on_us  = period_us * duty_percent / 100u;\n    uint32_t off_us = period_us - on_us;\n\n    printf("%5u Hz @ %3u%%: T=%uus on=%uus off=%uus\\n",\n           (unsigned)freq_hz, (unsigned)duty_percent,\n           (unsigned)period_us, (unsigned)on_us, (unsigned)off_us);\n}\n\nint main(void) {\n    pwm_report(1000u, 25u);    /* LED dimming, low-ish */\n    pwm_report(1000u, 75u);    /* LED dimming, high    */\n    pwm_report(20000u, 50u);   /* motor range          */\n    pwm_report(50u, 8u);       /* servo pulse region   */\n    return 0;\n}',
        explanation: [
          '1 kHz @ 25%: period 1,000,000/1000 = 1000 us; on = 1000*25/100 = 250 us; off 750 us.',
          '1 kHz @ 75%: on 750, off 250 — the mirror image.',
          '20 kHz @ 50%: period 50 us; on 25, off 25 — on-times already in the microsecond range, foreshadowing the resolution squeeze.',
          '50 Hz @ 8%: period 20,000 us; on = 1600 us — right inside the servo pulse region (1-2 ms) that lesson 3 formalises.',
          'Exact output: ` 1000 Hz @  25%: T=1000us on=250us off=750us` / ` 1000 Hz @  75%: T=1000us on=750us off=250us` / `20000 Hz @  50%: T=50us on=25us off=25us` / `   50 Hz @   8%: T=20000us on=1600us off=18400us`.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Same period, three duty cycles',
        content:
          '  25% duty (period T):        75% duty:              10% duty:\n\n  +------+          +------    +----------+  +---+   +--+     +----\n  |      |          |          |          |  |   |   |  |     |\n--+      +----------+        --+          +--+   +---+  +-----+\n  <on---><--off->            <--on-----><-off>\n  D = 0.25                   D = 0.75               D = 0.10\n\n  average voltage seen by a slow load = D * Vhigh\n  (3.3 V rail: 0.825 V, 2.475 V, 0.33 V)',
        caption:
          'Educational waveform (illustrative). Frequency fixed, duty varied — the average a slow load experiences is duty times the rail voltage.',
      },
    ],
    tables: [
      {
        caption: 'Frequency choices by application',
        headers: ['Application', 'Typical frequency', 'Why'],
        rows: [
          ['LED dimming', '200 Hz - 2 kHz', 'Above flicker fusion; cheaper timers OK'],
          ['DC motor speed', '15-25 kHz', 'Above audible band; smooth current via inductance'],
          ['Servo position', '50 Hz (20 ms)', 'The servo measures the pulse width — spec, not choice'],
          ['Heater / thermal', '1-10 Hz', 'Thermal mass integrates; slow switching loses less'],
        ],
      },
      {
        caption: 'Worked on/off times at 3.3 V',
        headers: ['Frequency', 'Duty', 'On-time', 'Average voltage'],
        rows: [
          ['1 kHz', '25%', '250 us', '0.825 V'],
          ['1 kHz', '75%', '750 us', '2.475 V'],
          ['20 kHz', '50%', '25 us', '1.65 V'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Choosing PWM frequency by habit (e.g. always 1 kHz) regardless of load.',
        fix:
          'Frequency is application physics: flicker for LEDs, audible whine for motors, pulse-measurement for servos. Pick from the load\'s response band, then check resolution survives (lesson 2).',
      },
      {
        mistake: 'Assuming duty % maps linearly to perceived brightness or motor speed.',
        fix:
          'Eyes and motors are nonlinear; add a correction curve (gamma table for LEDs, startup compensation for motors) between intent and duty.',
      },
      {
        mistake: 'Driving a motor or speaker directly from the PWM pin.',
        fix:
          'The pin supplies milliamps; motors and speakers need driver transistors/H-bridges from a power rail (lesson 3 and module 12). PWM *controls* the driver; it does not *power* the load.',
      },
    ],
    guidedPractice: {
      title: 'Timing and average drill',
      brief:
        'For 2 kHz PWM at 40% duty from a 5 V rail: compute period, on-time, off-time, and the average voltage a slow load sees. Then state what changes for a load that responds in microseconds instead.',
      expectedBehavior:
        'Period 500 us; on 200 us; off 300 us; average 2.0 V. A microsecond-fast load does not integrate: it sees the switching itself (spikes at 2 kHz) rather than the average — hence frequency must exceed the load\'s response band.',
      hints: [
        'T = 1/f; on = D*T.',
        'Average = duty * rail for integrating loads only.',
      ],
    },
    practiceExercises: [
      {
        title: 'Heater duty budget',
        brief:
          'A heater needs 6 W average from a 12 V rail feeding a 24 ohm element (P = V²/R at full duty = 6 W). Compute the duty for 3 W average, and the on-time at 10 Hz PWM.',
        expectedBehavior:
          'Power scales with duty: 3 W / 6 W = 50% duty. Period 100 ms → on 50 ms, off 50 ms. (Thermal mass smooths the 10 Hz switching comfortably.)',
        hints: [
          'Average power is linear in duty.',
          'T = 1/10 Hz = 100 ms.',
        ],
      },
      {
        title: 'Symptom diagnosis',
        brief:
          'Match symptoms to causes: (a) LED dimming visibly flickers at the lowest settings; (b) motor whines audibly at mid speed; (c) LED brightness steps look coarse near full brightness.',
        expectedBehavior:
          '(a) PWM frequency too low (below flicker fusion) — raise it. (b) PWM frequency in the audible band — move to 15-25 kHz. (c) Too few duty steps at that frequency — resolution problem: lower frequency or faster timer clock (lesson 2).',
        hints: [
          'Flicker and whine are frequency problems; coarse steps are resolution problems.',
          'Each fix trades against the other constraint.',
        ],
      },
    ],
    assessment: {
      title: 'PWM concepts checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'PWM period and frequency relate as:',
          options: ['T = 1/f', 'T = f', 'T = f/2', 'They are independent'],
          answer: 'T = 1/f',
          explanation: 'Period is the reciprocal of frequency: 1 kHz → 1 ms.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: '30% duty PWM from a 5 V rail delivers an average of:',
          options: ['1.5 V', '3.5 V', '5 V', '0.3 V'],
          answer: '1.5 V',
          explanation: 'Average = duty * rail = 0.3 * 5 V (for a load that integrates).',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Servo control PWM runs at 50 Hz because the servo measures pulse width — the frequency is part of the servo specification.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'Servos decode the 1-2 ms pulse inside a ~20 ms frame; you match their spec rather than choose freely.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does pwm_report(20000, 25) print for on-time?',
          code: 'uint32_t period_us = 1000000u / freq_hz;\nuint32_t on_us = period_us * duty_percent / 100u;  /* f=20000, d=25 */',
          options: ['12', '25', '50', '250'],
          answer: '12',
          explanation:
            'Period = 1,000,000 / 20,000 = 50 us. On-time = 50 * 25 / 100 = 1250 / 100 = 12 us after integer division (the true value 12.5 truncates). Off-time = 50 − 12 = 38 us.',
          hint: 'Multiply first (50 * 25), then integer-divide by 100.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the two symptoms of a PWM frequency that is too low for an LED and too high (in the audible band) for a motor.',
          answer: 'visible flicker (LED) and audible whine (motor)',
          explanation:
            'Below flicker fusion the eye sees pulses; in the 1-15 kHz band motors and their mounts radiate audible sound.',
          hint: 'One your eyes catch, one your ears catch.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Duty cycle', definition: 'Fraction of the period spent high; the PWM control knob.' },
      { term: 'Period', definition: '1/frequency; the repeat interval of the switching waveform.' },
      { term: 'Flicker fusion', definition: 'The eye\'s integration threshold (~100-200 Hz) below which PWM looks like flicker.' },
      { term: 'Correction curve', definition: 'A lookup/function mapping desired output (brightness %, speed %) to actual duty.' },
    ],
    revisionSummary: [
      'T = 1/f; on = D*T; average = D * rail for integrating loads.',
      'Frequency is chosen by the load: LEDs >200 Hz, motors >15 kHz, servos exactly 50 Hz.',
      'Duty-to-perception is nonlinear; correct with curves.',
      'PWM controls drivers; it never powers big loads directly.',
      'Frequency and resolution trade against one fixed timer clock.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Pulse-width modulation', url: 'https://en.wikipedia.org/wiki/Pulse-width_modulation', kind: 'article' },
      { label: 'Wikipedia — Duty cycle', url: 'https://en.wikipedia.org/wiki/Duty_cycle', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'embc-m11-l2',
    title: 'Timer-Based PWM and Its Resolution',
    summary:
      'How the compare machinery of module 05 generates PWM: duty as CCR/(ARR+1), the bits-of-resolution calculation, and the frequency/resolution trade worked numerically.',
    objectives: [
      'Map PWM period and duty onto ARR and CCR values.',
      'Compute duty from counts and counts from duty, exactly.',
      'Compute PWM resolution in bits and the timer clock needed for a target.',
      'Implement a mock PWM LED dimmer with a duty ramp.',
    ],
    whyItMatters:
      'This is where module 05\'s compare channels earn their keep: PWM is nothing but a counter wrap that starts the pulse and a compare match that ends it. Understanding duty = CCR/(ARR+1) lets you configure any vendor\'s PWM peripheral from its block diagram instead of copy-paste.',
    prerequisites: ['embc-m11-l1', 'embc-m05-l2'],
    explanation:
      'A timer generates PWM with two events per period:\n\n- The counter counts 0..ARR, then wraps — the wrap (overflow) drives the pin **high**: the pulse starts.\n- A compare channel matches at CCR and drives the pin **low**: the pulse ends.\n\nThe pin\'s high fraction is exactly **duty = CCR / (ARR + 1)**: it is high from the period start until the compare match. CCR = 0 means the compare fires immediately at the start — a true 0% in this model (endpoint behaviour varies by family, which is why real hardware also offers forced-idle/forced-active output states); CCR = ARR gives (ARR)/(ARR+1) — *almost* 100%, which is why the forced-full-on state exists.\n\n### Resolution in bits\n\nThe number of distinct duty values is ARR + 1, so **resolution ≈ log2(ARR + 1) bits**: 999+1 = 1000 steps ≈ 10 bits; 255+1 = 256 steps = 8 bits. Resolution and frequency are linked by the timer clock: **timer_tick = f_pwm * (ARR + 1)**. To get 8-bit PWM (256 steps) at 20 kHz you need a timer clock of 20,000 * 256 = 5.12 MHz; 10-bit at 20 kHz needs 20.48 MHz; 12-bit at 20 kHz needs 81.92 MHz. When the clock budget fails, you lower frequency, accept fewer bits, or pick a timer with a wider counter.\n\n### Worked configuration\n\n"1 kHz LED PWM with ~10-bit resolution from a 72 MHz clock": steps = 72,000,000 / 1000 = 72,000 available ticks per period — more than 16 bits\' worth. Choose steps = 1000 (ARR = 999, duty resolution 0.1%): the prescaler divides 72 MHz by 72 → 1 MHz tick; each period consumes 1000 ticks. Duty 30% → CCR = 0.30 * 1000 = 300. Every vendor\'s PWM chapter is this arithmetic plus register names (STM32: PSC/ARR/CCRx with preload; ATmega: COM0x bits + OCR0A in fast-PWM mode; ESP32: LEDC duty resolution configuration).',
    deepDive:
      '### Preload and glitch-free updates\n\nChanging CCR mid-period can produce one malformed pulse (duty jumps partway through). Vendors add **preload**: the new CCR is staged in a shadow register and takes effect at the next period boundary — glitch-free updates. Some families make preload optional per channel; enabling it is the default advice unless you specifically need immediate response (motor current-control loops sometimes do, and accept the glitch). This is the same "apply at boundary" idea as timer compare registers in module 05-l2 — and the same manual-reading requirement.\n\n### Multi-channel phase and the LED-canvas case\n\nChannels sharing one counter update on the same boundary, so RGB LEDs driven from three channels change *together* — no colour fringes from staggered updates. That shared-counter phase alignment is why one timer with N channels beats three separate timers for anything that must change coherently. It costs one configuration (all channels on one timer) and the discipline to update all CCRs in the same code path.\n\n### Gamma correction, quantitatively, honestly\n\nPerceived brightness ≈ perceptual power law; a linear duty ramp looks like it "jumps" at the low end and crawls at the top. A common practical fix is a 256-entry gamma table (computed offline or at init) mapping perceptual level → duty count. On an 8-bit-duty PWM the low end is coarse: duty 1/255 ≈ 0.4% may already look "half bright" — the real cure for smooth low-end dimming is *higher resolution* (10-12 bits) plus gamma, which loops back to the frequency/resolution trade of this lesson\'s main text.',
    examples: [
      {
        title: 'Mock PWM dimmer: duty ramp with exact counts, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of a PWM channel: ARR sets the period in ticks,\n * CCR the compare point. Real firmware writes the vendor\'s registers\n * (STM32 TIMx_CCRx, ATmega OCR0x, ESP32 LEDC duty) with the same math. */\nstatic volatile uint16_t MOCK_TIM_ARR = 999u;   /* 1000 ticks/period */\nstatic volatile uint16_t MOCK_TIM_CCR = 0u;\nstatic volatile uint8_t  MOCK_GPIO_ODR = 0u;    /* the PWM output pin */\n\n/* One timer tick; models set-on-start, clear-on-compare (the standard\n * edge-aligned PWM: high from the period start until CCR). */\nstatic void pwm_tick(void) {\n    static uint16_t cnt = 0u;\n    if (cnt == 0u) {\n        MOCK_GPIO_ODR = 1u;              /* period start: pin high */\n    }\n    if (cnt == MOCK_TIM_CCR) {\n        MOCK_GPIO_ODR = 0u;              /* compare match: pin low */\n    }\n    cnt++;\n    if (cnt > MOCK_TIM_ARR) {\n        cnt = 0u;                        /* wrap: next period starts */\n    }\n}\n\nstatic uint32_t duty_from_ccr(uint16_t ccr) {\n    return (uint32_t)ccr * 100u / ((uint32_t)MOCK_TIM_ARR + 1u);\n}\n\nint main(void) {\n    const uint16_t ramp[5] = { 0u, 250u, 500u, 750u, 1000u };\n\n    for (int i = 0; i < 5; i++) {\n        MOCK_TIM_CCR = ramp[i];\n        printf("CCR=%4u -> duty=%3u%%\\n",\n               (unsigned)ramp[i], (unsigned)duty_from_ccr(ramp[i]));\n    }\n\n    /* Verify one period of CCR=250 produces 250 high ticks: */\n    MOCK_TIM_CCR = 250u;\n    uint32_t high = 0u;\n    for (uint32_t t = 0u; t < 1000u; t++) {\n        pwm_tick();\n        high += MOCK_GPIO_ODR;\n    }\n    printf("ticks high in one period: %u\\n", (unsigned)high);\n    return 0;\n}',
        explanation: [
          'duty = CCR/(ARR+1): CCR 0 → 0%; 250 → 25%; 500 → 50%; 750 → 75%; 1000 → 100% (1000*100/1000).',
          'The tick model: the pin is high from the period start (cnt==0) and falls at the compare match (cnt==CCR) — high tick count equals CCR exactly.',
          'The verification loop counts 1000 ticks with CCR = 250: the pin is high for ticks 0..249 → exactly 250 high ticks.',
          'Exact output: `CCR=   0 -> duty=  0%` / `CCR= 250 -> duty= 25%` / `CCR= 500 -> duty= 50%` / `CCR= 750 -> duty= 75%` / `CCR=1000 -> duty=100%` / `ticks high in one period: 250`.',
          'Endpoint note: CCR = 0 clears immediately at the start (true 0% in this model), while CCR = ARR = 999 still holds high for 999 of 1000 ticks (99.9%) — real hardware adds forced-idle/forced-active output states for exact rails.',
        ],
      },
      {
        title: 'Resolution and clock budget calculator',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* bits_needed and timer clock for a target PWM frequency. */\nstatic void pwm_budget(uint32_t f_pwm, uint32_t steps, uint32_t f_bus) {\n    uint32_t tick_needed = f_pwm * steps;          /* timer clock required */\n    uint32_t duty_pct_step = 100u / steps;         /* coarse duty step */\n    printf("%u Hz with %u steps: timer clock %u Hz, duty step ~%u%%\\n",\n           (unsigned)f_pwm, (unsigned)steps,\n           (unsigned)tick_needed, (unsigned)duty_pct_step);\n}\n\nint main(void) {\n    pwm_budget(20000u, 256u,  72000000u);   /* 8-bit motor PWM  */\n    pwm_budget(20000u, 1024u, 72000000u);   /* 10-bit           */\n    pwm_budget(20000u, 4096u, 72000000u);   /* 12-bit           */\n    pwm_budget(1000u,  4096u, 72000000u);   /* 12-bit at 1 kHz  */\n    return 0;\n}',
        explanation: [
          '20 kHz * 256 = 5.12 MHz timer clock — easy for a 72 MHz bus (further divided by prescaler).',
          '20 kHz * 1024 = 20.48 MHz — still available.',
          '20 kHz * 4096 = 81.92 MHz — exceeds the 72 MHz bus: 12-bit at 20 kHz is impossible here; drop to 11 bits (4096→2048: 40.96 MHz) or lower frequency.',
          '1 kHz * 4096 = 4.096 MHz — trivially available: 12-bit LED dimming at 1 kHz is free.',
          'Exact output: `20000 Hz with 256 steps: timer clock 5120000 Hz, duty step ~0%` (integer 100/256 = 0 — showing the per-step duty is finer than a whole percent) / `20000 Hz with 1024 steps: timer clock 20480000 Hz, duty step ~0%` / `20000 Hz with 4096 steps: timer clock 81920000 Hz, duty step ~0%` / `1000 Hz with 4096 steps: timer clock 4096000 Hz, duty step ~0%`. The duty-step column truncating to 0 is itself the lesson: at these resolutions, one step is far below 1%.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'PWM from compare match and wrap',
        content:
          '  CNT\n  ARR --+         +---------+---------+\n        |        /|        /|        /|\n        |       / |       / |       / |\n      0 +------+  +------+  +------+\n              ^CCR=250            ^wrap   ^wrap\n\n  pin    +---------+---------------------------------+\n          ^^^^^^^^^\n          high from period start (wrap)\n                   ^ cleared at compare (CNT==CCR)\n  high fraction = CCR / (ARR+1) = 250/1000 = 25%',
        caption:
          'Educational waveform (illustrative). The overflow starts the pulse, the compare match ends it — duty falls out of the count arithmetic.',
      },
    ],
    tables: [
      {
        caption: 'Timer clock needed: f_pwm × steps',
        headers: ['PWM frequency', '8-bit (256)', '10-bit (1024)', '12-bit (4096)'],
        rows: [
          ['1 kHz', '256 kHz', '1.024 MHz', '4.1 MHz'],
          ['5 kHz', '1.28 MHz', '5.12 MHz', '20.5 MHz'],
          ['20 kHz', '5.12 MHz', '20.5 MHz', '81.9 MHz'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Computing duty as CCR/ARR.',
        fix:
          'The period is ARR+1 ticks (0..ARR inclusive). duty = CCR/(ARR+1). Using ARR skews by one part in a thousand — and compounds when people "fix" it by nudging CCR.',
      },
      {
        mistake: 'Expecting endpoint behaviour to be uniform across families.',
        fix:
          'In the standard edge-aligned model CCR=0 can be a true 0% (compare fires at the start) while CCR=ARR gives ARR/(ARR+1) ≈ 99.9% — and some families produce one-tick pulses at the endpoints instead. Use the hardware\'s forced-idle/forced-active output states for exact rails, or special-case the endpoints in software.',
      },
      {
        mistake: 'Updating CCR mid-period and seeing a glitch pulse.',
        fix:
          'Enable the vendor\'s preload (shadow register applied at period boundary) for glitch-free updates — or accept the one-pulse glitch knowingly in control-loop applications.',
      },
    ],
    guidedPractice: {
      title: 'Configure a PWM channel',
      brief:
        'From a 48 MHz timer clock: configure 2 kHz PWM with ~8-bit resolution. Give the total tick budget per period, choose steps and prescaler, then give CCR for 60% duty and the exact resulting duty.',
      expectedBehavior:
        'Ticks per period available: 48,000,000/2000 = 24,000. Choose 256 steps (8-bit): prescaler divides to 2000*256 = 512 kHz (÷93.75 — pick ÷94 giving 510.6 kHz; period ticks 255.3 → use ARR 254 for 255 steps or accept 256 steps at ~1.996 kHz). Duty 60% → CCR = 0.60*256 = 153 (of 256 steps, exact 59.77%... with ARR=255: CCR=153 → 153/256 = 59.8%). The point: real dividers force small rounding — compute, then document the actual numbers.',
      hints: [
        'Budget = f_pwm * steps first, then see what prescaler produces it.',
        'Real hardware rounds: state the achieved frequency and duty, not just the targets.',
      ],
    },
    practiceExercises: [
      {
        title: 'Invert the polarity',
        brief:
          'Some hardware generates the *inverted* output (set-on-compare, clear-on-wrap). For ARR=999 and CCR=400, what duty does the *high* time have, and which CCR gives the same waveform as the inverted-output duty of 25%?',
        expectedBehavior:
          'Inverted: high from compare to wrap → high fraction = (ARR+1−CCR)/(ARR+1) = 601/1000 = 60.1%. For an inverted output showing 25% high: the low fraction is 25% → CCR = 0.75*1000 = 750.',
        hints: [
          'The high and low fractions sum to 1.',
          'Set point and clear point swap roles.',
        ],
      },
      {
        title: 'Gamma table sketch',
        brief:
          'Explain in 3-4 sentences why a gamma table needs *more* PWM resolution than 8 bits to help smooth low-end dimming, and what low-duty value dominates perceived dimness.',
        expectedBehavior:
          'Perceptual dimness lives in the first few percent of duty; with 256 steps the entire "dim" region is 2-3 counts — a gamma table can only map levels onto counts that already exist. With 12 bits the dim region has ~150 distinct steps, so the curve has somewhere to go. Low-duty granularity dominates perception.',
        hints: [
          'Count how many 8-bit steps fall below 5% duty.',
          'The table maps intent to counts; it cannot create counts.',
        ],
      },
    ],
    assessment: {
      title: 'Timer PWM checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'With ARR = 999 and CCR = 500, the duty is:',
          options: ['50.0%', '50.05%', '49.95%', '500%'],
          answer: '50.0%',
          explanation: 'duty = CCR/(ARR+1) = 500/1000 = 50%.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Timer clock needed for 12-bit PWM (4096 steps) at 5 kHz:',
          options: ['20.48 MHz', '5.12 MHz', '409.6 MHz', '2.05 MHz'],
          answer: '20.48 MHz',
          explanation: 'f_pwm * steps = 5000 * 4096 = 20.48 MHz.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Preload makes a CCR update take effect at the next period boundary, preventing glitch pulses.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'The shadow register applies at the boundary — the standard glitch-free update mechanism.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does the verification loop print?',
          code: 'MOCK_TIM_CCR = 750u;\n/* count high ticks over one 1000-tick period */',
          options: ['750', '751', '749', '1000'],
          answer: '750',
          explanation:
            'With set-on-start/clear-on-compare, the pin is high from count 0 until the compare at 750: exactly 750 ticks of the 1000-tick period.',
          hint: 'High from the period start until CCR — count the ticks.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'State the two hardware events that define the PWM pin\'s transitions.',
          answer: 'counter wrap/overflow starts the pulse; compare match (CNT==CCR) ends it (or the reverse for inverted polarity)',
          explanation:
            'One period, two events, one fraction — that is the entire PWM mechanism.',
          hint: 'One from the compare channel, one from the counter.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'ARR / CCR (PWM context)', definition: 'Period ticks and compare point; duty = CCR/(ARR+1).' },
      { term: 'PWM resolution', definition: 'Distinct duty steps = ARR+1 ≈ log2 bits, bounded by timer clock / f_pwm.' },
      { term: 'Preload (shadow register)', definition: 'Staged CCR updates applied at period boundaries for glitch-free changes.' },
      { term: 'Inverted (active-low) PWM', definition: 'Set-on-wrap, clear-on-compare: high fraction = 1 − duty.' },
    ],
    revisionSummary: [
      'duty = CCR/(ARR+1); period ticks = ARR+1.',
      'Timer clock budget = f_pwm × steps; resolution bits = log2(steps).',
      'Endpoints are approximate; use forced states for true 0/100%.',
      'Preload for glitch-free CCR updates; shared counters keep channels aligned.',
      'Gamma correction needs resolution headroom to help.',
    ],
    furtherReading: [
      { label: 'Wikipedia — RC filter and PWM smoothing (concept)', url: 'https://en.wikipedia.org/wiki/RC_circuit', kind: 'article' },
      { label: 'docs.arduino.cc — analogWrite() PWM defaults on AVR', url: 'https://docs.arduino.cc/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m11-l3',
    title: 'PWM for Servos and Motor Control',
    summary:
      'Position and speed from pulses: the servo 50 Hz/1-2 ms protocol, DC motor control with H-bridges, dead time, and the driver hardware that PWM always needs behind it.',
    objectives: [
      'Generate the servo pulse protocol: 50 Hz frames, 1-2 ms pulses, angle mapping.',
      'Explain H-bridge direction control and PWM speed control.',
      'Explain dead time and why it exists.',
      'State which loads need which drivers, and why pins never drive motors directly.',
    ],
    whyItMatters:
      'Motion is the flagship embedded job — robots, gimbals, drones, printers all reduce to "produce these pulses, drive these bridges safely". The servo protocol is the simplest complete actuator interface in embedded systems, and H-bridge thinking generalises to every power stage.',
    prerequisites: ['embc-m11-l2', 'embc-m12-l2'],
    explanation:
      '### Servos: measuring the pulse\n\nA hobby servo is a self-contained position system: it watches its input pin and rotates the output shaft to an angle encoded in the **pulse width**. The frame is ~50 Hz (20 ms period); inside each frame a high pulse of **1.0 ms ≈ 0°, 1.5 ms ≈ 90° (centre), 2.0 ms ≈ 180°** (per the common 0-180° convention; many servos extend ±). The servo\'s internal electronics do the decoding, driving and feedback — firmware only produces pulses. Configuration (module 11-l2 math): 1 MHz timer tick, period 20,000 ticks (ARR = 19999), pulse = 1000..2000 ticks → `CCR = 1000 + (uint32_t)angle * 1000 / 180`. Note the practical cautions: real servos vary (some want 0.6-2.4 ms), they draw their *stall current* from the supply (never the MCU\'s regulator), and pulse jitter of a few microseconds is visible as twitch — jitter discipline from the tick module applies directly.\n\n### DC motors: H-bridge + PWM\n\nA DC motor\'s speed follows average voltage; its direction follows polarity. An **H-bridge** — four switches arranged in an H around the motor — delivers both: closing one diagonal pair drives current one way, the other diagonal reverses it, and PWM on the enable/modulating switches sets speed. Firmware outputs: two direction pins (or one PWM per leg) plus a PWM speed signal; the bridge handles the power. Symmetric drive (PWM both legs, complementary) enables braking and finer control but demands **dead time**.\n\n### Dead time\n\nWhen one leg\'s high-side switch must turn off before the low-side turns on, a few hundred nanoseconds to microseconds of **dead time** (both off) prevents **shoot-through** — the brief, enormous current that flows if both conduct at once. Hardware bridges embed fixed dead time; discrete stages need timer support (advanced timers output complementary PWM pairs with a dead-time register). Firmware\'s role is choosing the value from the MOSFET datasheet\'s switching times — too short risks shoot-through, too long distorts low-duty control.\n\n### The driver table, honestly\n\nPins supply tens of milliamps at logic voltages. Motors, solenoids and relays need amps. The mapping is fixed: small loads (LEDs, small piezo buzzers) direct with current limiting; medium loads (relays, solenoids, small motors) single-transistor or driver-IC stages with flyback protection; bidirectional motors H-bridges; addressable strips their own protocol drivers. Module 12 wires these; this lesson supplies the control signals.',
    deepDive:
      '### Inside the servo, briefly (and why jitter matters)\n\nA servo is: pulse-width decoder → position setpoint → motor + geartrain + potentiometer feedback → built-in closed loop (a tiny PID). The pulse is a *position command sampled once per frame*; between frames the servo integrates toward the target. Two firmware consequences: updates faster than ~50 Hz add nothing (the loop is rate-limited by the decoder) — but *jitter* of ±10 µs is ±1.8° of position noise, so the timer must be hardware PWM, never bit-banged against a busy loop. This is a full sensor-actuator loop hiding inside a "dumb" peripheral — and it explains why servo twitch is always a firmware timing bug, not a servo defect.\n\n### Drive modes beyond the basics, honestly\n\nH-bridge control has a vocabulary worth recognizing in datasheets: sign-magnitude drive (one pin direction, one PWM speed — simplest), locked-antiphase (one PWM per leg, direction from duty > 50% — centre off), and slow/fast decay (what the motor does during PWM off-time: brake-recirculate vs coast — affects low-speed smoothness). Which modes a bridge supports is hardware; which the firmware uses is a driver-layer decision documented per motor. Motor control at scale (FOC, current sensing, closed-loop speed) is its own discipline — this lesson is the on/off-and-speed foundation, honestly labelled as such.\n\n### Power and wiring realities\n\nMotors inject noise: current spikes on start, brushes sparking, back-EMF on stop. The standard board discipline — separate motor supply, common ground (module 12-l3), flyback diodes, bulk capacitors, keep motor wiring away from analog lines — exists because firmware cannot filter 10-amp spikes out of an ADC reference. When a motor makes a nearby sensor noisy, the fix is usually wiring and decoupling, not code. Knowing this boundary early saves days of blaming firmware for physics.',
    examples: [
      {
        title: 'Servo pulse generator: angle to compare counts, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock: 1 MHz timer tick, 50 Hz frames (20000 ticks).\n * Real firmware: a timer PWM channel per servo (module 11-l2 config);\n * pulse range limits come from the servo\'s datasheet. */\n#define SERVO_TICKS_PERIOD 20000u   /* 20 ms at 1 MHz */\n#define SERVO_PULSE_MIN    1000u    /* 1.0 ms  -> ~0 deg   */\n#define SERVO_PULSE_MAX    2000u    /* 2.0 ms  -> ~180 deg */\n\nstatic volatile uint16_t MOCK_TIM_ARR = (uint16_t)(SERVO_TICKS_PERIOD - 1u);\nstatic volatile uint16_t MOCK_TIM_CCR = 0u;\n\nstatic uint8_t servo_set_angle(uint8_t angle_deg) {\n    if (angle_deg > 180u) {\n        return 0u;                          /* reject out-of-range */\n    }\n    uint32_t pulse = SERVO_PULSE_MIN +\n                     ((uint32_t)angle_deg * (SERVO_PULSE_MAX - SERVO_PULSE_MIN))\n                     / 180u;\n    MOCK_TIM_CCR = (uint16_t)pulse;\n    return 1u;\n}\n\nint main(void) {\n    const uint8_t angles[5] = { 0u, 45u, 90u, 135u, 180u };\n    for (int i = 0; i < 5; i++) {\n        (void)servo_set_angle(angles[i]);\n        printf("%3u deg -> CCR=%4u (%u us pulse)\\n",\n               (unsigned)angles[i], (unsigned)MOCK_TIM_CCR,\n               (unsigned)MOCK_TIM_CCR);\n    }\n    if (servo_set_angle(200u) == 0u) {\n        printf("200 deg rejected\\n");\n    }\n    return 0;\n}',
        explanation: [
          'Pulse = 1000 + angle * 1000/180 microseconds at the 1 MHz tick.',
          '0° → 1000; 45° → 1000 + 250 = 1250; 90° → 1500; 135° → 1750; 180° → 2000.',
          'Angle 200 fails the range guard and the CCR is left untouched — the servo holds its last commanded position rather than getting a nonsense pulse.',
          'Exact output: `  0 deg -> CCR=1000 (1000 us pulse)` / ` 45 deg -> CCR=1250 (1250 us pulse)` / ` 90 deg -> CCR=1500 (1500 us pulse)` / `135 deg -> CCR=1750 (1750 us pulse)` / `180 deg -> CCR=2000 (2000 us pulse)` / `200 deg rejected`.',
          'On hardware this one register write repeats every 20 ms automatically — the PWM peripheral freewheels; the application just sets angles.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Servo frames at three angles',
        content:
          '  0 deg (1.0 ms pulse):\n  +--+--------------------------------------------+\n  |  |                    20 ms frame            |\n\n  90 deg (1.5 ms):\n  +---+-------------------------------------------+\n\n  180 deg (2.0 ms):\n  +----+------------------------------------------+\n\n  pulse width encodes position; frame rate ~50 Hz;\n  jitter of 10 us ~ 1.8 deg of position noise',
        caption:
          'Educational waveform (illustrative). One high pulse per 20 ms frame; the servo\'s internal loop does the rest.',
      },
      {
        kind: 'ascii',
        title: 'H-bridge with PWM speed control',
        content:
          '         +Vs          +Vs\n          |            |\n        [S1]         [S3]\n          |            |\n          +---(M)------+\n          |    motor   |\n        [S2]         [S4]\n          |            |\n         GND          GND\n\n  forward : S1+S4 on (PWM), S2/S3 off\n  reverse : S2+S3 on (PWM), S1/S4 off\n  brake   : S2+S4 on (low-side) or S1+S3 (high-side)\n  coast   : all off\n\n  dead time: never overlap S1<->S2 or S3<->S4 transitions;\n             shoot-through current is limited only by wiring.',
        caption:
          'Conceptual bridge. Firmware supplies direction bits and PWM; the bridge (with dead time) supplies the amps. Module 12 covers the driver parts.',
      },
    ],
    tables: [
      {
        caption: 'Servo pulse-to-angle mapping (1 MHz tick, 1000-2000 us convention)',
        headers: ['Angle', 'Pulse', 'CCR (ticks)'],
        rows: [
          ['0°', '1.0 ms', '1000'],
          ['45°', '1.25 ms', '1250'],
          ['90°', '1.5 ms', '1500'],
          ['135°', '1.75 ms', '1750'],
          ['180°', '2.0 ms', '2000'],
        ],
      },
      {
        caption: 'Load-to-driver mapping (expanded in module 12)',
        headers: ['Load', 'Current scale', 'Driver needed'],
        rows: [
          ['LED indicator', '~10 mA', 'Series resistor only'],
          ['Servo', '0.5-2 A (stall)', 'Own supply + common ground; logic pin direct'],
          ['Small DC motor', '0.1-1 A', 'Single transistor (one direction) or H-bridge'],
          ['Larger motor', '1-30 A', 'Integrated H-bridge / gate drivers + FETs, dead time'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Powering servos or motors from the MCU\'s regulator.',
        fix:
          'Actuators take their stall/surge current from a separate supply with a common ground. Brown-outs from motor starts reset the MCU — the classic "robot reboots when it turns".',
      },
      {
        mistake: 'Bit-banging servo pulses from the superloop.',
        fix:
          'Any loop jitter is position noise (10 us ≈ 1.8°). Servo pulses are hardware-PWM territory — set the angle, let the peripheral repeat.',
      },
      {
        mistake: 'Zero dead time on complementary bridge outputs.',
        fix:
          'Even nanoseconds of overlap cause shoot-through heating and eventual destruction. Use the timer\'s dead-time generator or a bridge with built-in dead time; size it from the switch datasheet.',
      },
    ],
    guidedPractice: {
      title: 'Servo endpoints and jitter budget',
      brief:
        'A servo accepts 0.8-2.2 ms pulses over 0-180°. (a) Recompute CCR for 90° under this range. (b) State the position error if the pulse jitters ±20 us. (c) Give the timer tick rate that makes the pulse step size finer than 1°.',
      expectedBehavior:
        '(a) Span 1400 us: pulse = 800 + 90*1400/180 = 800 + 700 = 1500 us → CCR 1500 at 1 MHz (centre stays 1.5 ms). (b) 1400 us/180° = 7.78 us/° → ±20 us ≈ ±2.6°. (c) Need step < 7.78 us → tick < 7.78 us → faster than ~128.6 kHz; 1 MHz gives 0.14°/tick.',
      hints: [
        'Generalise: pulse = min + angle * (max − min)/180.',
        'Position resolution = range span / 180°.',
      ],
    },
    practiceExercises: [
      {
        title: 'Bridge state table',
        brief:
          'For the H-bridge diagram, write the switch states and motor behaviour for: forward-full, reverse-half (PWM 50% on the modulating pair), brake, coast. Note where dead time applies.',
        expectedBehavior:
          'Forward-full: S1+S4 on. Reverse-half: S2/S3 complementary-PWM at 50% (each on half the time with dead-time gaps), motor sees ±average ≈ 0 with braking character depending on decay mode. Brake: S2+S4 (or S1+S3). Coast: all off. Dead time applies at every S1<->S2 and S3<->S4 transition.',
        hints: [
          'Diagonals conduct for a direction.',
          'Dead time guards each complementary pair.',
        ],
      },
      {
        title: 'Diagnose the rebooting robot',
        brief:
          'A robot MCU resets whenever both motors reverse at full speed. List the top three hardware causes and the firmware-side check that distinguishes a brown-out reset from a code fault.',
        expectedBehavior:
          'Causes: motors sharing the MCU regulator (brown-out), missing bulk capacitance across the motor supply, back-EMF/ground bounce corrupting the reset line. Firmware check: read the reset-cause register at boot and log it — a brown-out/low-power reset flag during motor events is electrical, not a code fault.',
        hints: [
          'Motor stall current is the largest transient in the system.',
          'MCUs record why they last reset.',
        ],
      },
    ],
    assessment: {
      title: 'Servos and motors checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A standard hobby servo expects its position pulse within:',
          options: [
            '1-2 ms every 20 ms frame',
            '1-2 s every minute',
            'A continuous analog voltage',
            'A serial data stream',
          ],
          answer: '1-2 ms every 20 ms frame',
          explanation:
            '50 Hz frames, pulse width encodes angle; the servo decodes internally.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In an H-bridge, "shoot-through" is prevented by:',
          options: [
            'Dead time between complementary switch transitions',
            'Lower PWM frequency',
            'Bigger flyback diodes',
            'Software delays in the superloop',
          ],
          answer: 'Dead time between complementary switch transitions',
          explanation:
            'Both switches of a leg must never conduct together; hardware or timer-generated dead time guarantees the gap.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A GPIO pin can drive a small DC motor directly if the motor is rated for 3.3 V.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'Voltage rating is not current: motors draw hundreds of milliamps to amps and generate back-EMF — a driver stage is always required.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What CCR results from servo_set_angle(135) in the mock?',
          code: 'pulse = 1000 + angle * 1000 / 180;  /* angle = 135 */',
          options: ['1750', '1751', '1500', '1350'],
          answer: '1750',
          explanation: '135 * 1000 = 135,000; / 180 = 750; + 1000 = 1750.',
          hint: 'Compute the scaled term first.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Why is 10 us of pulse jitter equivalent to roughly 1.8 degrees of servo noise under the 1000-2000 us/180° convention?',
          answer: 'the scale is 1000 us per 180 degrees = 5.56 us per degree, so 10 us ≈ 1.8 degrees',
          explanation:
            'Position resolution is pulse-resolution divided by the span: jitter maps directly to angle.',
          hint: 'Divide the span by the pulse range.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Servo pulse protocol', definition: '50 Hz frames with 1-2 ms pulses encoding angle; servo decodes internally.' },
      { term: 'H-bridge', definition: 'Four-switch stage driving a motor bidirectionally from a power rail.' },
      { term: 'Dead time', definition: 'Forced both-off gap between complementary switch transitions; prevents shoot-through.' },
      { term: 'Stall current', definition: 'The motor\'s maximum current draw (rotor blocked) — the surge the supply must survive.' },
    ],
    revisionSummary: [
      'Servo: 50 Hz, 1-2 ms pulses, CCR = min + angle*(max−min)/180.',
      'Jitter is position noise; hardware PWM only.',
      'Motors: direction from the bridge, speed from PWM, power from a separate rail.',
      'Dead time always; sized from switch datasheets.',
      'Reset-cause registers distinguish electrical resets from code faults.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Servo (radio control)', url: 'https://en.wikipedia.org/wiki/Servo_(radio_control)', kind: 'article' },
      { label: 'Wikipedia — H-bridge', url: 'https://en.wikipedia.org/wiki/H-bridge', kind: 'article' },
      { label: 'Wikipedia — MOSFET (switching times behind dead time)', url: 'https://en.wikipedia.org/wiki/MOSFET', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
