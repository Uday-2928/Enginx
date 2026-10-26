import type { TutorialLesson } from '../types';

export const module10Lessons: TutorialLesson[] = [
  {
    id: 'embc-m10-l1',
    title: 'ADC Fundamentals: Counts, Resolution and Reference Voltage',
    summary:
      'Turn raw converter counts into volts with confidence: resolution, the Vref/2^N step size, worked conversions in both directions, and choosing a reference.',
    objectives: [
      'Explain what an ADC measures and what a "count" is.',
      'Compute step size (LSB) from reference voltage and resolution.',
      'Convert counts to millivolts and back, with integer math that cannot overflow.',
      'Explain the role of the reference voltage and what a bad reference does to every reading.',
    ],
    whyItMatters:
      'Every analog sensor in your product — temperature, light, pressure, battery voltage — enters the MCU through an ADC. The counts-to-units math in this lesson is used daily by every embedded engineer, and doing it wrong (or overflowing it) is a classic silent bug.',
    prerequisites: ['embc-m05-l1', 'embc-m02-l1'],
    explanation:
      'An **analog-to-digital converter (ADC)** measures an input voltage and reports it as an integer number of **counts**. A 10-bit ADC produces counts 0..1023 — 2^10 = 1024 possible values. The mapping between counts and volts is set by the **reference voltage (Vref)**: the converter divides the range 0..Vref into 2^N equal steps, so one step — one **LSB** (least significant bit) — is worth **Vref / 2^N** volts.\n\n### The two formulas\n\n- Counts to volts: **volts = counts * Vref / 2^N** (or millivolts: counts * Vref_mV / 2^N).\n- Volts to counts: **counts = volts * 2^N / Vref**.\n\nIn firmware use integer math with a sensible unit: microvolts or millivolts, not floats. A 10-bit ADC with Vref = 3.3 V has LSB = 3300 mV / 1024 = 3.22 mV; count 620 is 620 * 3300 / 1024 = 1998 mV. Working in millivolts keeps every intermediate inside a uint32_t — the overflow-safe habit from module 05.\n\n### The reference is the ruler\n\nEvery reading is a *ratio* to Vref: if Vref is 1% high, every measurement is 1% low. References come in three flavours: the supply rail (cheap, noisy — the rail wobbles with load), an internal bandgap reference (typically 1.0-2.5 V, a few percent accurate unless calibrated), or an external precision reference (best accuracy, costs a pin and a part). A 12-bit ADC with a 2% rail reference has an effective accuracy far coarser than its 0.8 mV resolution — resolution and accuracy are different claims, and confusing them is the standard beginner error.\n\n### Reading the ADC, mechanically\n\nThe register dance is the module 03 toolkit: select the channel (a mux field in a config register), start a conversion (a bit in a control register), wait for the done flag (status register — or receive the interrupt), read the data register (12-bit reads usually right- or left-justified — the manual says which, and a misread justification shifts your value by 4 bits). Single conversions in a loop are fine for slow signals; continuous scan modes and DMA (module 14) take over for fast ones.',
    deepDive:
      '### Step size versus real accuracy, honestly\n\nA 12-bit converter on a noisy 3.3 V rail: the last 2-3 bits flicker with rail noise and sensor noise, so the *useful* resolution is maybe 10 bits. The fix is not a better ADC — it is a cleaner reference, a quiet analog front-end, and the averaging/calibration of lesson 2. When a datasheet quotes "ENOB" (effective number of bits), it is exactly this concession: the silicon itself admits the low bits are noise. Design to the ENOB, not the headline resolution.\n\n### Input range and attenuation\n\nThe converter only measures 0..Vref (or a configured subset). Signals beyond the rail need a divider or amplifier in front (module 12 covers divider math); signals smaller than an LSB need gain. Some ADCs offer a programmable gain amplifier (PGA) or differential inputs that subtract a reference level — all configured through the same config-register fields. The honest workflow: decide the sensor\'s voltage span, choose Vref/gain/divider so the span fills a good part of the converter\'s range (wasting range wastes resolution), then compute the counts-to-units constant once and put it in one named macro.\n\n### Where ADC chapters differ per vendor, and what does not\n\nSequence registers, sample-time fields, justification bits, calibration routines (some ADCs require a power-on calibration — following the vendor procedure, exactly) — all chip-specific, all in the vendor manual. What transfers universally: the counts/LSB/Vref math of this lesson, the flag-driven read sequence, and the discipline of integer unit math. When you meet the ESP32\'s attenuation settings or the ATmega\'s ADMUX layout, you already know what questions to ask of them.',
    examples: [
      {
        title: 'Counts to millivolts and back, overflow-safe integer math',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of an ADC data register (10-bit converter).\n * Real firmware reads the vendor ADC DR after the done flag; the\n * Vref and resolution constants come from your board design. */\nstatic volatile uint16_t MOCK_ADC_DR = 620u;\n\n#define ADC_BITS      10u\n#define ADC_STEPS     (1u << ADC_BITS)     /* 1024 */\n#define VREF_MV       3300u\n\nstatic uint32_t counts_to_mv(uint16_t counts) {\n    return (uint32_t)counts * VREF_MV / ADC_STEPS;\n}\n\nstatic uint16_t mv_to_counts(uint32_t millivolts) {\n    return (uint16_t)(millivolts * ADC_STEPS / VREF_MV);\n}\n\nint main(void) {\n    uint16_t counts = MOCK_ADC_DR;\n    uint32_t mv = counts_to_mv(counts);\n\n    printf("%u counts = %u mV\\n", (unsigned)counts, (unsigned)mv);\n    printf("2000 mV would read as %u counts\\n",\n           (unsigned)mv_to_counts(2000u));\n\n    /* The overflow trap, demonstrated at the edge: */\n    uint16_t max_counts = (uint16_t)(ADC_STEPS - 1u); /* 1023 */\n    printf("full scale: %u counts = %u mV\\n",\n           (unsigned)max_counts, (unsigned)counts_to_mv(max_counts));\n    return 0;\n}',
        explanation: [
          'counts_to_mv: 620 * 3300 = 2,046,000, / 1024 = 1998 mV. The product fits easily in uint32_t because counts <= 1023 and VREF_MV <= 65535 (max product ~6.7e7 — far below 4.29e9).',
          'mv_to_counts: 2000 * 1024 / 3300 = 2,048,000 / 3300 = 620 (integer division) — the round trip lands back on 620.',
          'Full scale: 1023 * 3300 / 1024 = 3296 mV — one LSB short of Vref, the correct full-scale reading for a straight binary converter.',
          'Exact output: `620 counts = 1998 mV` / `2000 mV would read as 620 counts` / `full scale: 1023 counts = 3296 mV`.',
          'The overflow note: had we computed in nanovolts or with VREF_UV = 3,300,000, the product 1023 * 3.3e6 ≈ 3.4e9 would be near the uint32_t limit — promote to uint64_t when units get big (module 05-l1 showed the same trap).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Counts to voltage staircase (10-bit, Vref 3.3 V)',
        content:
          ' volts\n 3.300 +                                   (Vref)\n       |                              ____ 1023 -> 3296 mV\n       |                         ____|\n 1.998 +------------- ______ 620 -> 1998 mV\n       |        ____|\n       |   ____|\n 0.000 +__|________________________________ counts\n        0      256      512      768     1023\n\n  1 LSB = 3300 mV / 1024 = 3.22 mV\n  count N represents roughly N * 3.22 mV',
        caption:
          'The converter reports which stair the input stands on. Step height is set by Vref and resolution alone — that is the entire conversion math.',
      },
    ],
    tables: [
      {
        caption: 'Step size (1 LSB) by resolution and reference',
        headers: ['Resolution', 'Steps', '1 LSB @ 3.3 V', '1 LSB @ 5.0 V'],
        rows: [
          ['8-bit', '256', '12.9 mV', '19.5 mV'],
          ['10-bit', '1024', '3.22 mV', '4.88 mV'],
          ['12-bit', '4096', '0.806 mV', '1.22 mV'],
          ['16-bit', '65536', '50.3 uV', '76.3 uV'],
        ],
      },
      {
        caption: 'Reference voltage options',
        headers: ['Source', 'Accuracy', 'Noise', 'Use when'],
        rows: [
          ['Supply rail (VDD)', '±1-5% (load-dependent)', 'Highest', 'Rough measurements, ratiometric sensors'],
          ['Internal bandgap', '±1-3% (calibratable)', 'Low', 'Typical on-chip choice'],
          ['External precision ref', '±0.1-0.5%', 'Lowest', 'Measurement products'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Dividing by 2^N − 1 (1023) instead of 2^N (1024).',
        fix:
          'There are 2^N steps; code 1023 is the *top* step, not the number of steps. Using 1023 makes full scale read exactly Vref and skews everything slightly — pick Vref/2^N and document the convention.',
      },
      {
        mistake: 'Doing the conversion in floats with volts units and wondering about precision.',
        fix:
          'Integer millivolt (or microvolt) math is exact, fast (no FPU on many MCUs), and overflow-checkable. Reserve floats for display formatting if at all.',
      },
      {
        mistake: 'Trusting the 12-bit headline number on a noisy rail.',
        fix:
          'Resolution (bits) and accuracy (real correctness) differ. Reference quality, front-end noise and ENOB decide what the low bits mean; averaging and calibration (next lesson) recover the usable precision.',
      },
    ],
    guidedPractice: {
      title: 'Conversion drill',
      brief:
        'A 12-bit ADC, Vref = 2.5 V. (a) Compute 1 LSB in microvolts. (b) Convert count 2048 to millivolts. (c) A 1.111 V signal reads as what count? (d) What full-scale reading does count 4095 give in mV?',
      expectedBehavior:
        '(a) 2,500,000 uV / 4096 = 610 uV. (b) 2048 * 2500 / 4096 = 1250 mV. (c) 1111 * 4096 / 2500 = 4,550,656/2500 = 1820 counts. (d) 4095 * 2500 / 4096 = 2499 mV.',
      hints: [
        'Keep units: uV for (a), mV for (b) and (d).',
        '2^12 = 4096.',
      ],
    },
    practiceExercises: [
      {
        title: 'Wasted resolution audit',
        brief:
          'A sensor outputs 0.0-0.8 V into a 10-bit ADC with Vref 3.3 V. How many effective bits of the converter does the signal use, and what Vref would use the full range? What changes if the sensor is ratiometric to the same 3.3 V rail?',
        expectedBehavior:
          '0.8 V spans 0.8/3.3 = 24% of full scale ≈ 2.1 bits (log2(1/0.24) ≈ 2.06) — about 8 useful bits. Vref = 0.8 V would fill the range. Ratiometric case: if the sensor output scales with the same rail that is Vref, rail error cancels in the ratio — a reason to deliberately keep Vref = rail despite the noise.',
        hints: [
          'Effective bits = log2(span / LSB)... compute span as fraction of range.',
          'Ratiometric means both numerator and denominator move together.',
        ],
      },
      {
        title: 'Justification trap',
        brief:
          'A 12-bit result is left-justified in a 16-bit data register. You read 0x9A40. What is the actual count, and what voltage at Vref 3.3 V? What would reading it as right-justified wrongly give?',
        expectedBehavior:
          'Left-justified: count = 0x9A40 >> 4 = 0x9A4 = 2468. Voltage = 2468 * 3300 / 4096 = 1988 mV. Right-justified misread: 0x9A40 = 39488 — impossible for 12 bits (>4095), the giveaway of a justification mismatch.',
        hints: [
          'Left-justified means the 12 bits occupy the top of the 16-bit word.',
          'A reading above the converter\'s maximum count is self-incriminating.',
        ],
      },
    ],
    assessment: {
      title: 'ADC fundamentals checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A 12-bit ADC with Vref = 3.3 V has a step size of about:',
          options: ['0.806 mV', '3.22 mV', '12.9 mV', '6.6 mV'],
          answer: '0.806 mV',
          explanation: '3300 mV / 4096 = 0.806 mV per count.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Count 512 on a 10-bit ADC with Vref = 3.3 V reads:',
          options: ['1650 mV', '3300 mV', '512 mV', '1024 mV'],
          answer: '1650 mV',
          explanation: '512 * 3300 / 1024 = 1650 mV — exactly half scale.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'If Vref is 2% high, every converted reading is about 2% low.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'ADC results are ratios to Vref; a stretched ruler shrinks every reading proportionally.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does counts_to_mv(1023) return?',
          code: '#define ADC_STEPS 1024u\n#define VREF_MV   3300u\nreturn (uint32_t)counts * VREF_MV / ADC_STEPS;  /* counts = 1023 */',
          options: ['3296', '3300', '3225', '1023'],
          answer: '3296',
          explanation: '1023 * 3300 = 3,375,900; / 1024 = 3296 (integer division) — one LSB below Vref, the correct full-scale code.',
          hint: 'Multiply first, then divide.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'In one phrase: why can a 16-bit ADC on a noisy supply deliver far less than 16 usable bits?',
          answer: 'noise (reference and front-end) dithers the low bits — the effective number of bits (ENOB) is what the signal chain actually resolves',
          explanation:
            'Headline resolution is a count range, not a noise guarantee; averaging and a clean reference recover usable precision.',
          hint: 'The low bits flicker with noise.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Count', definition: 'The ADC\'s integer output: one of 2^N codes.' },
      { term: 'LSB (step size)', definition: 'Vref / 2^N volts — the voltage change represented by one count.' },
      { term: 'Reference voltage (Vref)', definition: 'The full-scale ruler every reading is a ratio against.' },
      { term: 'ENOB', definition: 'Effective number of bits — resolution after real-world noise, as specified by converter datasheets.' },
      { term: 'Justification', definition: 'Where the N-bit result sits in a wider data register (left/right); misreading shifts the value.' },
    ],
    revisionSummary: [
      'volts = counts * Vref / 2^N; counts = volts * 2^N / Vref.',
      'Use integer mV/uV math; watch intermediate overflow.',
      'Full-scale code 2^N − 1 reads just under Vref.',
      'Vref quality scales every reading; rail refs are noisy, ratiometric sensors cancel it.',
      'Check justification and channel config against the vendor manual.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Analog-to-digital converter', url: 'https://en.wikipedia.org/wiki/Analog-to-digital_converter', kind: 'article' },
      { label: 'Wikipedia — Voltage reference', url: 'https://en.wikipedia.org/wiki/Voltage_reference', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'embc-m10-l2',
    title: 'Sampling, Quantization and Noisy Measurements',
    summary:
      'How fast to sample (Nyquist), why the last bit flickers (quantization and noise), and the two standard cleanups: averaging and two-point calibration.',
    objectives: [
      'State the Nyquist criterion and its practical consequence for sensor sampling.',
      'Explain quantization error and its ±0.5 LSB bound.',
      'Implement moving-average and discard-min-max filtering on raw samples.',
      'Apply two-point calibration and reason about when averaging is a lie.',
    ],
    whyItMatters:
      'Raw ADC readings are spiky, and consumers of your data (displays, control loops, logs) judge the whole product by that jitter. Ten lines of filtering and one calibration constant separate amateur-looking firmware from trustworthy measurements.',
    prerequisites: ['embc-m10-l1'],
    explanation:
      'Three separate phenomena make raw readings noisy, and each has its own cure.\n\n### Sampling rate: Nyquist\n\nTo capture a signal that changes as fast as f, you must sample faster than **2f** — the Nyquist criterion. Slower, and fast components fold into false low-frequency "aliases" (the reason wagon wheels spin backwards on video). For *slow sensors* (temperature changes in seconds), this is trivially satisfied by any loop; for audio or vibration work it defines the entire sample budget. Practical rule: sample at 5-10x the highest frequency you care about, and add an anti-alias filter ahead of the ADC when high-frequency junk exists that you do not care about.\n\n### Quantization error\n\nThe converter reports the stair the input stands on, so the reading is always within **±0.5 LSB** of truth — an unavoidable, uniformly-distributed error. It averages out under averaging (which is why averaging buys effective bits when noise dithers the signal across stair boundaries) but it can never be removed from a single reading.\n\n### Real noise\n\nSensor noise, supply noise and coupling add sample-to-sample variation far bigger than 0.5 LSB. Cures, in order of usual deployment: **moving average** (keep the last K samples, report the mean — smooths jitter, costs latency and K samples of memory); **discard-min-max then average** (rejects single-sample spikes, useful when interference is bursty); **median of 3/5** (excellent spike rejection, slightly fiddlier); and oversampling (average 2^2k samples to gain ~k effective bits — the datasheet-supported trick). All are a few lines of C over an array.\n\n### Calibration\n\nManufacturing tolerance means count 155 is not the same voltage on every board. **Two-point calibration** measures two known inputs (0.5 V and 2.5 V, say), computes the actual slope and offset, and converts with the *measured* line instead of the ideal one: `mV = offset_mV + (counts − c1) * (v2_mV − v1_mV) / (c2 − c1)`. One-point calibration (offset only) suffices when the slope is trusted. Store the calibration constants in EEPROM/flash (module 01-2\'s memory roles) and apply them in the driver.',
    deepDive:
      '### When averaging is a lie\n\nAveraging assumes the noise is zero-mean and the *signal is constant* during the window. If the signal is ramping (temperature rising), the average lags truth by roughly half the window\'s worth of change — the smoothing trades bandwidth for stability. Worse, averaging a *faulty* reading (a disconnected sensor reading rail noise, say) produces a very stable wrong number — smoothing can hide a broken wire behind a confident-looking value. Professional practice: filter for display, but run sanity checks (plausible range, rate-of-change limits) on the *raw* samples, and treat "perfectly stable zero" as suspicious.\n\n### Choosing K for a moving average\n\nK samples of averaging reduce white noise by roughly sqrt(K) — 4 samples halve the jitter, 16 quarter it. The cost is latency: the average reflects the last K sample periods, so a step change takes ~K/2 periods to appear. Pick K from the opposite end: how much delay can the application tolerate? A display wants ≤ 100 ms lag; a safety trip wants none (and should use rate-limit checks on raw data instead). Write the budget down — K is a design decision, not a round number.\n\n### Units discipline for the filter chain, honestly\n\nFilter in *counts* or in *millivolts* — consistently — and convert to engineering units exactly once, at the driver boundary. Filtering float temperatures that were converted per-sample wastes CPU and multiplies rounding; filtering integer counts and converting once keeps the chain exact and fast. The module 13 architecture lesson makes this a layering rule: the ADC driver returns calibrated millivolts; nothing above it ever sees counts.',
    examples: [
      {
        title: 'Moving average and min-max discard, fully traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n#define NSAMP 5u\n\nstatic uint32_t average(const uint16_t *s, uint8_t n) {\n    uint32_t sum = 0u;\n    for (uint8_t i = 0u; i < n; i++) {\n        sum += s[i];\n    }\n    return sum / n;\n}\n\nstatic uint32_t average_trim(const uint16_t *s, uint8_t n) {\n    uint16_t mn = 0xFFFFu;\n    uint16_t mx = 0u;\n    uint32_t sum = 0u;\n    for (uint8_t i = 0u; i < n; i++) {\n        if (s[i] < mn) { mn = s[i]; }\n        if (s[i] > mx) { mx = s[i]; }\n        sum += s[i];\n    }\n    return (sum - mn - mx) / (uint32_t)(n - 2u);\n}\n\nint main(void) {\n    const uint16_t samples[NSAMP] = { 512u, 508u, 515u, 509u, 511u };\n\n    printf("raw mean      = %u\\n", (unsigned)average(samples, NSAMP));\n    printf("trimmed mean  = %u\\n", (unsigned)average_trim(samples, NSAMP));\n\n    /* A spike burst the trimmed mean rejects: */\n    const uint16_t spiky[NSAMP] = { 511u, 820u, 510u, 512u, 509u };\n    printf("spiky raw     = %u\\n", (unsigned)average(spiky, NSAMP));\n    printf("spiky trimmed = %u\\n", (unsigned)average_trim(spiky, NSAMP));\n    return 0;\n}',
        explanation: [
          'Raw mean: 512+508+515+509+511 = 2555; /5 = 511.',
          'Trimmed: sum 2555 − min 508 − max 515 = 1532; /3 = 510 (integer division of 1532/3 = 510.67).',
          'Spiky set {511, 820, 510, 512, 509}: raw mean = 2862/5 = 572 — dragged up by the 820 spike.',
          'Spiky trimmed: 2862 − 509 − 820 = 1533; /3 = 511 — the spike vanishes.',
          'Exact output: `raw mean      = 511` / `trimmed mean  = 510` / `spiky raw     = 572` / `spiky trimmed = 511`.',
        ],
      },
      {
        title: 'Two-point calibration, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Calibration measured on this board:\n *   0.500 V read as 155 counts\n *   2.500 V read as 777 counts */\n#define CAL_MV1   500u\n#define CAL_C1    155u\n#define CAL_MV2   2500u\n#define CAL_C2    777u\n\nstatic uint32_t calibrate_counts(uint16_t counts) {\n    uint32_t mv_span = CAL_MV2 - CAL_MV1;       /* 2000 mV      */\n    uint32_t c_span  = CAL_C2 - CAL_C1;         /* 622 counts   */\n    /* linear extrapolation from point 1 */\n    uint32_t delta = (counts >= CAL_C1) ? (counts - CAL_C1) : 0u;\n    return CAL_MV1 + delta * mv_span / c_span;\n}\n\nint main(void) {\n    const uint16_t measured = 512u;\n    printf("512 counts -> %u mV (calibrated)\\n",\n           (unsigned)calibrate_counts(measured));\n\n    /* Compare with the ideal (uncalibrated) 10-bit/3.3V conversion: */\n    printf("ideal would say: %u mV\\n",\n           (unsigned)((uint32_t)measured * 3300u / 1024u));\n    return 0;\n}',
        explanation: [
          'Slope: 2000 mV / 622 counts = 3.215 mV per count (integer math keeps it exact via the deferred division).',
          'measured 512: delta = 512 − 155 = 357; 357 * 2000 = 714,000; / 622 = 1147; + 500 = 1647 mV.',
          'Ideal uncalibrated: 512 * 3300 / 1024 = 1650 mV — 3 mV apart, which is exactly the board-specific error calibration removes (on real boards the gap is often tens of millivolts).',
          'Exact output: `512 counts -> 1647 mV (calibrated)` then `ideal would say: 1650 mV`.',
          'Below CAL_C1 the function clamps delta to 0 — a deliberately simple guard; production code extrapolates linearly both ways and flags out-of-range inputs instead.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Raw, averaged, and a spike',
        content:
          ' counts\n  820 |            *  <- spike (single bad sample)\n  515 |   -   -\n  511 |  - o - o - o - o -   o = moving average (K=5): stable line\n  508 | -\n      +---------------------- samples ->\n\n  raw:    jitter ±4 counts + occasional spikes\n  avg(5): jitter ±1.5 counts, latency ~2.5 samples\n  trim:   spike rejected; step response still delayed',
        caption:
          'Educational sketch (illustrative). Averaging trades latency for stability; trimmed averaging also rejects single-sample spikes.',
      },
    ],
    tables: [
      {
        caption: 'Filter trade-offs',
        headers: ['Method', 'Noise reduction', 'Latency', 'Spikes', 'Memory'],
        rows: [
          ['Average of K', '~sqrt(K)', 'K/2 samples', 'Drags the mean', 'K samples or running sum'],
          ['Trim min/max + average', '~sqrt(K−2)', '~K/2', 'Rejected (1 each end)', 'K samples'],
          ['Median of 3/5', 'moderate', '1-2 samples', 'Rejected fully', '3-5 samples'],
          ['Oversample 4^k, shift k*2', '2^k counts', '4^k samples', 'No', 'Running sum'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Averaging a failing sensor into a stable wrong value.',
        fix:
          'Sanity-check raw samples (range, rate-of-change) before they enter the average, and flag suspicious stability (e.g. zero variance) — smoothing is for noise, not for diagnostics.',
      },
      {
        mistake: 'Calibrating with two points then storing them as floats in RAM.',
        fix:
          'Store calibration constants as integers in flash/EEPROM; apply them with the integer math shown. Constants in RAM vanish at power-off; floats add error and cost.',
      },
      {
        mistake: 'Sampling at exactly 2x the interesting frequency.',
        fix:
          'Nyquist is a minimum, not a target: 2x puts aliases right at the band edge and assumes a perfect anti-alias filter. Use 5-10x plus filtering.',
      },
    ],
    guidedPractice: {
      title: 'Filter and calibrate a batch',
      brief:
        'Samples {300, 305, 302, 900, 301}: compute the raw mean and the trimmed mean. Then, using the calibration points (100 counts = 200 mV, 600 counts = 1200 mV), convert the trimmed mean to millivolts.',
      expectedBehavior:
        'Raw mean: 2108/5 = 421 (spike inflates it). Trimmed: 2108 − 300 − 900 = 908; /3 = 302. Calibration: slope = 1000 mV/500 counts = 2 mV/count; mV = 200 + (302 − 100) * 2 = 200 + 404 = 604 mV.',
      hints: [
        'Identify min and max before subtracting.',
        'Slope = (mV2 − mV1)/(c2 − c1).',
      ],
    },
    practiceExercises: [
      {
        title: 'Pick K from a latency budget',
        brief:
          'A display refreshes every 100 ms and samples arrive every 20 ms. Choose the largest K whose step-response latency stays within one display period, and estimate the noise reduction.',
        expectedBehavior:
          'Latency ≈ K/2 samples = K/2 * 20 ms ≤ 100 ms → K ≤ 10 → K = 8 (power of two for shift-divide). Noise reduction ≈ sqrt(8) ≈ 2.8x.',
        hints: [
          'Latency in samples is about K/2.',
          'Powers of two let you divide by shifting.',
        ],
      },
      {
        title: 'Diagnose suspicious stability',
        brief:
          'A disconnected sensor line reads {1023, 1023, 1023, 1023} — a perfectly stable full-scale value. Design the two checks that catch this, and state why the moving average alone does not.',
        expectedBehavior:
          'Checks: (1) range guard — full-scale rail reading often means an open input (pull-up to rail); (2) variance/stability guard — zero variance over N samples on a real analog signal is abnormal. The moving average reports 1023.0 confidently; it smooths, it never questions.',
        hints: [
          'A broken wire has a signature: a rail, not noise.',
          'Real signals wiggle; perfect flatness is data about the wiring.',
        ],
      },
    ],
    assessment: {
      title: 'Sampling and noise checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'To capture signal content up to 1 kHz reliably, sample at least at:',
          options: ['More than 2 kHz (practically 5-10 kHz)', 'Exactly 1 kHz', '100 Hz', 'Any rate; Nyquist is a myth'],
          answer: 'More than 2 kHz (practically 5-10 kHz)',
          explanation:
            'Nyquist demands > 2x the highest frequency; practical designs use 5-10x plus an anti-alias filter.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Quantization error of a single reading is bounded by:',
          options: ['±0.5 LSB', '±1 LSB', '±2 LSB', 'Unbounded'],
          answer: '±0.5 LSB',
          explanation:
            'The reading names the nearest stair; truth lies within half a step.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Averaging K samples reduces zero-mean noise by roughly sqrt(K).',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'Independent noise sums in quadrature; 16-sample averages quarter the jitter.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does average_trim return for {511, 820, 510, 512, 509}?',
          code: '/* sum - min - max, divided by n-2 */',
          options: ['511', '572', '510', '820'],
          answer: '511',
          explanation:
            'Sum 2862 − max 820 − min 509 = 1533; /3 = 511 — the 820 spike is discarded.',
          hint: 'Remove the largest and smallest, then average the rest.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'What does two-point calibration replace, and with what?',
          answer: 'the ideal counts-to-volts line, with the board-specific measured slope and offset',
          explanation:
            'It converts using two known references measured on this unit, absorbing gain and offset errors of the whole chain.',
          hint: 'One ideal line becomes a measured line.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Nyquist rate', definition: 'Minimum sampling rate of 2x the highest signal frequency to avoid aliasing.' },
      { term: 'Aliasing', definition: 'Undersampled high frequencies appearing as false low frequencies.' },
      { term: 'Quantization error', definition: 'The ±0.5 LSB uncertainty of reporting the nearest step.' },
      { term: 'Moving average', definition: 'Report the mean of the last K samples; trades latency for stability.' },
      { term: 'Two-point calibration', definition: 'Measure two known inputs; convert with the measured slope and offset.' },
    ],
    revisionSummary: [
      'Sample > 2x (practically 5-10x) the highest frequency; filter the rest.',
      '±0.5 LSB is irreducible per reading; averaging beats noise, not quantization.',
      'Average (or trim) integer counts; convert to units once.',
      'Calibration constants live in flash, applied at the driver boundary.',
      'Sanity-check raw data — smoothing can hide faults.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Nyquist–Shannon sampling theorem', url: 'https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem', kind: 'article' },
      { label: 'Wikipedia — Quantization (signal processing)', url: 'https://en.wikipedia.org/wiki/Quantization_(signal_processing)', kind: 'article' },
      { label: 'Wikipedia — Moving average', url: 'https://en.wikipedia.org/wiki/Moving_average', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m10-l3',
    title: 'DAC Outputs and Converting to Engineering Units',
    summary:
      'The reverse direction — counts to voltages with a DAC or filtered PWM — and the complete chain from a raw sensor count to a calibrated temperature reading.',
    objectives: [
      'Compute DAC output voltage from a digital value and Vref.',
      'Explain PWM-plus-RC-filter as a poor man\'s DAC and its limits.',
      'Convert raw sensor counts to engineering units through a complete documented chain.',
      'Build the full path: counts → mV → sensor equation → unit-checked temperature.',
    ],
    whyItMatters:
      'Reading a sensor is half the story; producing analog outputs (audio, control voltages, actuator references) completes it. And the counts-to-degrees chain taught here is the template for every unit conversion in firmware — the place where silent factor-of-10 bugs live.',
    prerequisites: ['embc-m10-l1', 'embc-m10-l2', 'embc-m11-l1'],
    explanation:
      'A **digital-to-analog converter (DAC)** is the ADC\'s mirror: a digital value N over 2^N codes produces **Vout = N * Vref / 2^N** volts (same math, other direction). An 8-bit DAC with Vref 3.3 V: value 128 → 128 * 3300 / 256 = 1650 mV — mid-scale.\n\n### PWM as a DAC\n\nWhere no DAC peripheral exists, a PWM output through an **RC low-pass filter** approximates one: the filter averages the switching waveform, so Vout ≈ duty * Vhigh. A 25% duty PWM at 3.3 V through a filter averages 0.825 V. It is worse than a real DAC — output impedance is high (buffer it), ripple depends on filter cutoff vs PWM frequency, and settling is slow — but for slow control voltages (LED brightness analog feedback, heater setpoints, fan control references) it is free, since the PWM peripheral already exists (module 11). The design rule: PWM frequency at least ~100x the filter cutoff, cutoff at least ~10x below the highest output frequency you need to reproduce.\n\n### The conversion chain, end to end\n\nReal sensors output *something* that is not yet the quantity you want. A classic analog temperature sensor (TMP36-style) outputs 0.5 V at 0 °C plus 10 mV per °C — so the chain is: **counts → millivolts (lesson 1 math) → subtract the 500 mV offset → divide by 10 mV/°C → degrees**. Doing this in integer math: `degC_x10 = (mv − 500)` gives tenths of a degree directly (since 10 mV per °C means 1 mV = 0.1 °C). Every sensor datasheet specifies its transfer function — this lesson\'s discipline is writing the chain as named constants with units in comments, in one place, once.\n\n### Unit-checked outputs\n\nThe final habit: validate the result against the datasheet\'s stated range (−40..125 °C for that sensor class) and flag out-of-range reads. A sensor unplugged from a 3.3 V rail reads full scale; converted blindly that is (3300−500)/10 = 280 °C — out of range, and the flag catches it. The range check is three lines and converts "my product displayed 280 degrees" into "sensor fault logged".',
    deepDive:
      '### DAC specifics worth knowing, honestly\n\nReal DAC peripherals add structure around the formula: they may be buffered (an output op-amp — check whether it rails near 0 V), they settle in microseconds (the datasheet\'s settling time bounds your update rate), and writing them is usually a single register store (module 03 pattern) sometimes doubled for synchronous multi-channel updates. Some MCU families have no DAC at all; some have 8-bit only; the PWM-as-DAC fills the gap with the trade-offs above. As always: the formula and the discipline transfer; the peripheral specifics come from the vendor manual. On the host, all of this is mock registers and arithmetic — the electrical verification (ripple, settling, load regulation) is oscilloscope work on real boards (module 17).\n\n### Integer fixed-point, the embedded style\n\n`degC_x10` is **fixed-point**: an integer holding tenths. This is the embedded standard for unit math — no float library, no rounding surprises, exact comparisons. The rules: decide the fixed scale (x10, x100), keep every intermediate in the same scale, convert scales only at named boundaries, and print with a manual decimal insertion (`printf("%d.%d C", v/10, v%10)` handles negatives carefully — a classic bug; safer to split sign, magnitude, fraction). Negative temperatures exercise this immediately: (mv − 500) goes negative below 0 °C, so the chain must use *signed* int32_t — one more reason the chain lives in one reviewed function.',
    examples: [
      {
        title: 'The complete sensor chain: counts → mV → temperature, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock ADC (10-bit, Vref 3.3 V) + TMP36-style sensor:\n * 500 mV offset, 10 mV per degree C, range -40..+125 C.\n * Real firmware: vendor ADC registers; sensor constants from its\n * datasheet; calibration from module 10-l2 if precision matters. */\nstatic volatile uint16_t MOCK_ADC_DR = 250u;\n\n#define ADC_STEPS  1024u\n#define VREF_MV    3300u\n#define SENSOR_OFFSET_MV 500u\n#define SENSOR_MV_PER_C10 100u  /* 10 mV/degC = 100 mV per 10 degC */\n#define TEMP_MIN_C10   (-400)   /* -40.0 C in tenths */\n#define TEMP_MAX_C10   1250     /* 125.0 C in tenths */\n\n/* Returns temperature in tenths of a degree, or INT32_MIN on fault. */\nstatic int32_t read_temperature_x10(void) {\n    uint32_t counts = MOCK_ADC_DR;\n    uint32_t mv = counts * VREF_MV / ADC_STEPS;\n\n    int32_t c10 = (int32_t)mv - (int32_t)SENSOR_OFFSET_MV;\n    /* mv - 500 IS tenths of a degree (10 mV per degC). */\n\n    if ((c10 < TEMP_MIN_C10) || (c10 > TEMP_MAX_C10)) {\n        return INT32_MIN;            /* range guard: sensor fault? */\n    }\n    return c10;\n}\n\nint main(void) {\n    int32_t t = read_temperature_x10();\n    if (t == INT32_MIN) {\n        printf("sensor fault: out of range\\n");\n    } else {\n        printf("counts=250 -> %u mV -> %d.%d C\\n",\n               (unsigned)(250u * VREF_MV / ADC_STEPS),\n               (int)(t / 10), (int)(t % 10));\n    }\n\n    /* Unplugged sensor: rail reading. */\n    MOCK_ADC_DR = 1023u;\n    t = read_temperature_x10();\n    printf("rail reading -> %s\\n",\n           (t == INT32_MIN) ? "fault flagged" : "trusted??");\n    return 0;\n}',
        explanation: [
          'counts 250: mv = 250 * 3300 / 1024 = 805 mV.',
          'Temperature: 805 − 500 = 305 tenths = 30.5 °C. The offset subtraction produces tenths directly because the sensor is 10 mV/°C.',
          'Range check: 305 is inside −400..1250, so it is returned and printed as `30.5 C`.',
          'Exact output line 1: `counts=250 -> 805 mV -> 30.5 C`.',
          'Rail reading: 1023 → 3296 mV → 2796 tenths = 279.6 °C, outside 125.0 — the guard returns the fault sentinel: output line 2: `rail reading -> fault flagged`.',
          'The signed int32_t matters: below 0 °C, mv − 500 goes negative and an unsigned type would wrap (module 02-l1\'s trap, met in real life).',
        ],
      },
      {
        title: 'DAC value to voltage, and PWM-as-DAC averaging',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* --- real 8-bit DAC mock --- */\nstatic volatile uint8_t MOCK_DAC_DR = 0u;\n#define DAC_STEPS 256u\n#define DAC_VREF_MV 3300u\n\n/* --- PWM-as-DAC model: duty in percent, rail 3.3 V --- */\nstatic uint32_t pwm_dac_mv(uint8_t duty_percent) {\n    return (uint32_t)duty_percent * DAC_VREF_MV / 100u;\n}\n\nint main(void) {\n    MOCK_DAC_DR = 128u;                  /* mid-scale */\n    uint32_t dac_mv = (uint32_t)MOCK_DAC_DR * DAC_VREF_MV / DAC_STEPS;\n    printf("DAC 128/255 -> %u mV\\n", (unsigned)dac_mv);\n\n    printf("PWM 0%%  -> %u mV\\n", (unsigned)pwm_dac_mv(0u));\n    printf("PWM 25%% -> %u mV\\n", (unsigned)pwm_dac_mv(25u));\n    printf("PWM 100%% -> %u mV\\n", (unsigned)pwm_dac_mv(100u));\n    return 0;\n}',
        explanation: [
          'DAC: 128 * 3300 / 256 = 1650 mV — mid-scale, half the rail.',
          'PWM-as-DAC: duty 0% → 0 mV, 25% → 825 mV, 100% → 3300 mV — the filter averages duty * rail.',
          'Exact output: `DAC 128/255 -> 1650 mV` / `PWM 0%  -> 0 mV` / `PWM 25% -> 825 mV` / `PWM 100% -> 3300 mV`.',
          'Note the DAC\'s effective full scale is 255 * 3300 / 256 = 3292 mV (one LSB short), while the PWM average genuinely reaches 3300 mV at 100% — a subtle real difference between the two techniques.',
          'The PWM version\'s real limits (ripple, settling, output impedance) are electrical — verified on hardware with a scope, not in this model.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The measurement chain and the output chain',
        content:
          ' MEASUREMENT (this module):                 OUTPUT (this module):\n\n sensor -> [front end] -> ADC -> counts       value -> DAC -> [buffer] -> pin\n                             |                                   or\n                    counts * Vref/2^N                        value -> PWM -> [RC] -> pin\n                             |                                        duty * Vhigh\n                             v\n                            mV\n                             |\n                    subtract offset, scale  (sensor equation)\n                             v\n                    engineering units + range guard',
        caption:
          'Both chains are arithmetic plus one guard each. The unit math is portable C; the analog behaviour is hardware to verify on a board.',
      },
    ],
    tables: [
      {
        caption: 'Common analog sensor transfer functions (datasheet-style examples)',
        headers: ['Sensor type', 'Transfer function', 'Chain'],
        rows: [
          ['TMP36-style temp', 'V = 0.5 V + 10 mV/°C', 'mV − 500 = tenths of °C'],
          ['Ratiometric potentiometer', 'V = pos * Vref', 'counts * 100 / max = percent'],
          ['LDR divider (module 12)', 'V = Vref * Rfixed/(Rfixed+Rldr)', 'needs calibration curve'],
          ['Thermistor', 'nonlinear (beta equation)', 'lookup table or equation in fixed point'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Converting with unsigned math through the 0 °C point.',
        fix:
          'mv − 500 goes negative below freezing; unsigned subtraction wraps to huge values (module 02). The chain uses int32_t from the subtraction onward.',
      },
      {
        mistake: 'Printing fixed-point values naively: `printf("%d.%d", t/10, t%10)` with negatives.',
        fix:
          'For t = −5 (i.e. −0.5 °C): t/10 = 0 and t%10 = −5, printing "0.-5". Split the sign first: print "-", then magnitude/10 and magnitude%10.',
      },
      {
        mistake: 'Trusting PWM-as-DAC without checking ripple and load.',
        fix:
          'The average is only the DC component; ripple, settling time and output impedance depend on the RC filter and the load. These are scope-verifiable electrical properties — buffer the output for real loads.',
      },
    ],
    guidedPractice: {
      title: 'Full chain drill',
      brief:
        'Mock ADC reads 180 counts (10-bit, 3.3 V). Compute the millivolts, then the TMP36-style temperature in tenths of a degree, and state whether the range guard passes. Then compute the DAC value (8-bit, 3.3 V) that produces the same millivolt output.',
      expectedBehavior:
        'mv = 180 * 3300 / 1024 = 580 mV. Temperature: 580 − 500 = 80 tenths = 8.0 °C — inside −400..1250, guard passes. DAC value: 580 * 256 / 3300 = 148,480/3300 = 44.99 → 45 → outputs 45*3300/256 = 580 mV.',
      hints: [
        'Same two formulas as the examples.',
        'DAC value = mV * 2^N / Vref.',
      ],
    },
    practiceExercises: [
      {
        title: 'Fixed-point printing drill',
        brief:
          'Given c10 values −55 (−5.5 °C), 0 (0.0 °C) and 1257 (125.7 °C): write a print_temperature(c10) that handles negatives correctly, and show the exact output for all three.',
        expectedBehavior:
          'Split sign: if c10 < 0 print "-", work with magnitude. Outputs: `-5.5 C` / `0.0 C` / `125.7 C`. The naive %d.%d on −55 gives "0.-5 C" — the bug this exercise kills.',
        hints: [
          'Compute magnitude = (c10 < 0) ? -c10 : c10.',
          'Print the sign before the magnitude.',
        ],
      },
      {
        title: 'Design a PWM-as-DAC output',
        brief:
          'You need a 0-2 V slow control voltage from a 3.3 V rail. Compute the duty range needed, then choose a PWM frequency and RC cutoff from the design rule (PWM ≥ ~100x cutoff, cutoff ≥ ~10x below your highest output frequency of 10 Hz).',
        expectedBehavior:
          'Duty range: 0%..61% (0.61*3.3 = 2.0 V). Highest output frequency 10 Hz → cutoff ≥ 100 Hz → PWM ≥ 10 kHz. E.g. cutoff 100 Hz, PWM 20 kHz — ripple at 20 kHz through a 100 Hz filter is heavily attenuated.',
        hints: [
          'Duty = target / rail.',
          'Apply the two ratios in order.',
        ],
      },
    ],
    assessment: {
      title: 'DAC and units checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'An 8-bit DAC with Vref 3.3 V, value 64, outputs:',
          options: ['825 mV', '1650 mV', '3300 mV', '64 mV'],
          answer: '825 mV',
          explanation: '64 * 3300 / 256 = 825 mV — quarter scale.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'PWM at 50% duty through an RC filter from a 3.3 V rail averages about:',
          options: ['1.65 V', '3.3 V', '0.825 V', 'It stays switching'],
          answer: '1.65 V',
          explanation:
            'The filter extracts the DC component: duty * rail = 0.5 * 3.3 V.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'For a 10 mV/°C sensor with 500 mV offset, (millivolts − 500) directly gives tenths of a degree.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            '1 °C = 10 mV = 10 tenths, so 1 mV = 0.1 °C = 1 tenth: the subtraction already is the conversion.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does the chain print for MOCK_ADC_DR = 1023?',
          code: 'mv = counts * 3300u / 1024u;\nc10 = (int32_t)mv - 500;\nif (c10 < -400 || c10 > 1250) return INT32_MIN;',
          options: ['sensor fault: out of range', '279.6 C', '2796.0 C', '0.0 C'],
          answer: 'sensor fault: out of range',
          explanation:
            'Rail reading converts to 2796 tenths (279.6 °C), beyond the 125.0 °C guard — flagged as a fault rather than displayed.',
          hint: 'Check the guard bounds.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Why must the temperature chain use a signed type from the offset subtraction onward?',
          answer: 'because readings below 0 °C make (mV − 500) negative, and unsigned math would wrap',
          explanation:
            'The signed/unsigned trap from module 02 appears in every real measurement chain at exactly this point.',
          hint: 'What happens just below freezing?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'DAC', definition: 'Digital-to-analog converter: Vout = value * Vref / 2^N.' },
      { term: 'PWM-as-DAC', definition: 'A PWM output low-pass filtered to its average (duty * rail); free but imperfect.' },
      { term: 'Fixed-point (x10/x100)', definition: 'Integers holding scaled units (tenths/hundredths) — exact, float-free unit math.' },
      { term: 'Range guard', definition: 'The datasheet-range check that converts impossible readings into fault flags.' },
    ],
    revisionSummary: [
      'DAC: Vout = value * Vref / 2^N; full-scale code reads one LSB short.',
      'PWM + RC = average; sized by 100x/10x frequency rules; buffer real loads.',
      'Chain: counts → mV → sensor equation → units, all in one function.',
      'Signed math from the offset subtraction; split signs when printing.',
      'Range-guard every converted result.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Digital-to-analog converter', url: 'https://en.wikipedia.org/wiki/Digital-to-analog_converter', kind: 'article' },
      { label: 'Wikipedia — Low-pass filter (RC averaging concept)', url: 'https://en.wikipedia.org/wiki/Low-pass_filter', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
