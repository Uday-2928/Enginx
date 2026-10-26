import type { TutorialLesson } from '../types';

export const module01Lessons: TutorialLesson[] = [
  {
    id: 'dsp-m01-l1',
    title: 'Continuous and Discrete Signals',
    summary:
      'From x(t) to x[n]: what sampling means mathematically and mechanically, and how to generate and inspect discrete signals in GNU Octave.',
    objectives: [
      'Distinguish continuous-time x(t) from discrete-time x[n] notation and meaning.',
      'Explain uniform sampling as evaluation at t = n/fs.',
      'Generate basic discrete signals (sine, impulse-like, step) in Octave.',
      'Read a stem-style printout of samples and reason about the underlying waveform.',
    ],
    whyItMatters:
      'Every digital system you will ever build — audio codec, motor controller, software-defined radio — lives entirely in the discrete world. The notation x[n] is the native language of filters, FFTs and fixed-point code later in this course, and the Octave workflow here is the same one used to verify real DSP algorithms on the MATLAB-compatible track.',
    prerequisites: [
      'Basic trigonometry (sine waves, frequency, radians)',
      'Willingness to read small Octave scripts',
    ],
    explanation:
      'A **continuous-time signal** x(t) has a value at every real instant of time — a microphone voltage, for example. A **discrete-time signal** x[n] exists only at integer sample indices n = 0, 1, 2, ... — the numbers a converter produces. Sampling bridges them: measure x(t) every T seconds, where T is the **sampling period** and its reciprocal fs = 1/T is the **sampling rate**. The n-th sample is x[n] = x(nT) = x(n/fs).\n\nA sinusoid makes this concrete. Continuous: x(t) = sin(2πft). Sampled at rate fs:\n\n```\nx[n] = sin(2π f n / fs)\n```\n\nOnly the *ratio* f/fs enters the discrete world. A 1 kHz tone at 8 kHz sampling and a 2 kHz tone at 16 kHz sampling produce the **same sequence** — the discrete signal only knows it completes one cycle every 8 samples. This innocent-looking fact becomes profound in the next lesson: frequencies are only distinguishable up to the sampling rate.\n\n### Getting hands-on in Octave\n\nThe course executes its examples on **GNU Octave via the platform evaluator** (MATLAB-compatible syntax; no plotting — the evaluator returns text, so we print). Two habits from day one: use a small, fixed set of samples so every number can be hand-checked, and print with explicit formats (`fprintf`) so the output is deterministic and traceable.',
    deepDive:
      '### Indexing: math is 0-based, Octave is 1-based\n\nDSP mathematics numbers samples from n = 0, because n = 0 is where systems *start* (the impulse response is defined by its values from n = 0 onward). Octave arrays start at index 1. The bridge is a constant one-liner: element `n(k)` of a vector built as `n = 0:N-1` sits at Octave position `k = n + 1`. Every script in this course builds `n` explicitly first, precisely so this mapping stays visible and printouts can be labelled with the mathematical index, not the storage index. Mixing the two up produces off-by-one bugs that are invisible in plots and glaring in printed traces — one more reason this course prints everything.',
    examples: [
      {
        title: 'Generate and print one cycle of a sampled sine (GNU Octave)',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
fs = 8;                  % sampling rate: 8 samples per second
n = 0:7;                 % sample indices 0..7 (exactly one 1 Hz cycle)
x = sin(2*pi*1*n/fs);    % x[n] = sin(2*pi*1*n/8)

for k = 1:8
  fprintf('n=%d x=%.3f\\n', n(k), x(k));
end`,
        explanation: [
          'fs = 8 and the tone is 1 Hz, so the ratio f/fs = 1/8: the sequence completes exactly one cycle in eight samples.',
          'n = 0:7 builds the mathematical index vector; n(k) maps Octave position k to sample index n = k-1.',
          'The angle at sample n is 2*pi*n/8: 0, pi/4, pi/2, 3pi/4, pi, 5pi/4, 3pi/2, 7pi/4 — the eight familiar points around the circle.',
          'Expected output, exactly:',
          'n=0 x=0.000',
          'n=1 x=0.707',
          'n=2 x=1.000',
          'n=3 x=0.707',
          'n=4 x=0.000',
          'n=5 x=-0.707',
          'n=6 x=-1.000',
          'n=7 x=-0.707',
          'The n=4 entry prints 0.000 because sin(pi) is not exactly zero in floating point (about 1.2e-16); %.3f rounds it to zero — a tiny foretaste of the numerical-honesty theme of this course.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Continuous sine and its samples (illustrative)',
        content:
          '  x(t)\n  1.0 |        ***\n      |      *   *\n      |     *     *\n  0.0 |----*-------*--------> t\n      |   *         *\n      |  *           *\n -1.0 | *             ***\n\n  x[n], fs = 8 (one cycle, samples at t = n/8):\n\n  1.0 |            o\n      |   o        |       o\n      |            |\n  0.0 |--o---------+---------o---> n\n      |  0                   4\n      |            o\n -1.0 |            o (n=6)\n\n  samples: 0.000, 0.707, 1.000, 0.707, 0.000, -0.707, -1.000, -0.707\n\n  (educational waveform (illustrative) — hand-plotted from the\n   printed values above)',
        caption:
          'Sampling turns a curve into a list of numbers. The list is the signal as far as any digital system is concerned; everything else is interpolation.',
      },
    ],
    tables: [
      {
        caption: 'Continuous versus discrete vocabulary',
        headers: ['Concept', 'Continuous', 'Discrete'],
        rows: [
          ['Time variable', 't (real number, seconds)', 'n (integer, sample count)'],
          ['Frequency', 'f in Hz', 'f/fs in cycles/sample (normalised)'],
          ['Value at...', 'every t', 'only n = 0, 1, 2, ...'],
          ['Written as', 'x(t)', 'x[n] — brackets signal discretetime'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing sin(2*pi*f*n) and expecting Hz to mean anything.',
        fix: 'The discrete sine needs the sampling rate in the denominator: sin(2*pi*f*n/fs). Without fs, f is silently in *cycles per sample*, which almost never matches the intended physical frequency.',
      },
      {
        mistake: 'Looping from k = 1 while claiming to evaluate sample n = 1.',
        fix: 'Decide which index you are printing. In this course, loops run over Octave positions k = 1..N while the printed label is n = k-1. Keep the mapping in exactly one place (the fprintf label) to avoid off-by-one confusion.',
      },
      {
        mistake: 'Trusting plotted curves without checking numbers.',
        fix: 'The evaluator in this course returns text, and real DSP debugging is the same: print the first eight samples and verify them by hand before you trust any picture.',
      },
    ],
    guidedPractice: {
      title: 'Generate a half-amplitude, 2 Hz sequence',
      brief:
        'Modify the example to produce x[n] = 0.5*sin(2*pi*2*n/8) for n = 0..7 and predict the eight printed values before running it (this is a paper exercise — trace each angle).',
      expectedBehavior:
        'Angles 2*pi*2*n/8 = pi*n/4 × 2 = pi*n/2: 0, pi/2, pi, 3pi/2, 2pi, ... so the sine takes values 0, 1, 0, -1, 0, 1, 0, -1. After the 0.5 factor the output lines are n=0 x=0.000 / n=1 x=0.500 / n=2 x=0.000 / n=3 x=-0.500 / n=4 x=0.000 / n=5 x=0.500 / n=6 x=0.000 / n=7 x=-0.500. Two cycles in eight samples, as 2 Hz at fs = 8 demands.',
      hints: [
        'Compute the angle at each n first: pi*n/2.',
        'sin(pi/2) = 1, sin(pi) = 0, sin(3pi/2) = -1 — the pattern repeats every 4 samples.',
        'The frequency doubled relative to the example, so the period halved: 4 samples per cycle.',
      ],
    },
    practiceExercises: [
      {
        title: 'Same sequence, two physical stories',
        brief:
          'A 1 kHz tone sampled at 8 kHz and a 2 kHz tone sampled at 16 kHz: show by computing f/fs for each that they produce identical sequences, and state how many samples one cycle occupies.',
        expectedBehavior:
          'Both ratios are 1000/8000 = 2000/16000 = 0.125 cycles/sample, so both complete one cycle every 8 samples. The sequences are identical; the physical interpretations differ.',
        hints: [
          'The sequence only knows the ratio f/fs.',
          '0.125 cycles/sample means 8 samples per cycle.',
        ],
      },
      {
        title: 'Print with the storage index',
        brief:
          'Rewrite the example\'s loop so the printout labels samples by Octave position k instead of mathematical n. Which values shift position in the output?',
        expectedBehavior:
          'The values appear in the same order, but the labels change: the line reading n=0 becomes k=1, and so on. No value moves — only the indexing convention in the label. This exercise is exactly how off-by-one bugs are caught in review.',
        hints: [
          'Replace n(k) with k in the fprintf argument list.',
          'The first sample is still 0.000 — it is now labelled k=1.',
        ],
      },
    ],
    assessment: {
      title: 'Signals checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A discrete signal x[n] is sampled at fs = 10 Hz. What does x[3] represent?',
          options: [
            'The value of x(t) at t = 0.3 s',
            'The value of x(t) at t = 3 s',
            'The third harmonic of the signal',
            'The value 3 samples after the end',
          ],
          answer: 'The value of x(t) at t = 0.3 s',
          explanation:
            'Sample n corresponds to time t = n/fs = 3/10 = 0.3 s. Index n counts samples; fs converts to seconds.',
          hint: 't = n/fs.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which Octave expression correctly generates x[n] = sin(2*pi*f*n/fs) for n = 0..N-1?',
          options: [
            'x = sin(2*pi*f*(0:N-1)/fs);',
            'x = sin(2*pi*f*(1:N)/fs);',
            'x = sin(2*pi*f*(0:N-1));',
            'x = sin(2*pi*f/fs*(0:N-1)*fs);',
          ],
          answer: 'x = sin(2*pi*f*(0:N-1)/fs);',
          explanation:
            'The sample indices must start at 0 and each angle must include the fs denominator. Option 2 evaluates the wrong instants (t = 1/fs .. N/fs); option 3 drops fs entirely.',
          hint: 'Two things must be right: the indices and the division by fs.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A 1 Hz tone sampled at 8 Hz and a 7 Hz tone sampled at 8 Hz produce different sequences.',
          answer: 'false',
          explanation:
            'Both have f/fs of 1/8 and 7/8. sin(2*pi*7*n/8) equals sin(2*pi*1*n/8) at every integer n (the 7 Hz angle is the 1 Hz angle reflected), so the sequences match — a first glimpse of aliasing, covered next lesson.',
          hint: 'Compute both angles at n = 1: 2*pi/8 and 14*pi/8. What is sin at each?',
          difficulty: 'hard',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In Octave, if the vector n = 0:7 and you print n(k) inside a for loop over k, what mathematical index does the loop position k = 5 correspond to (number only)?',
          answer: '4',
          explanation:
            'Octave is 1-based; k = 5 accesses the fifth element of n, which is 4. The mapping n = k - 1 is the constant bridge between the two conventions.',
          hint: 'n = 0:7 has 4 as its fifth element.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Continuous-time signal', definition: 'A signal x(t) defined at every instant of time.' },
      { term: 'Discrete-time signal', definition: 'A sequence x[n] defined only at integer sample indices.' },
      { term: 'Sampling period / rate', definition: 'T seconds between samples; fs = 1/T samples per second.' },
      { term: 'Normalised frequency', definition: 'f/fs in cycles per sample — the only frequency information a discrete sequence contains.' },
    ],
    revisionSummary: [
      'Sampling: x[n] = x(nT) = x(n/fs); only the ratio f/fs survives into the discrete world.',
      'Same ratio, same sequence — different physical tones can share one discrete signal.',
      'Octave is 1-based; DSP math is 0-based; print labels keep the mapping honest.',
      'Print small, deterministic sequences and hand-verify before trusting anything bigger.',
    ],
    furtherReading: [
      { label: 'The Scientist and Engineer\'s Guide to DSP — Chapter 2 (statistics and signals)', url: 'https://www.dspguide.com/ch2.htm', kind: 'docs' },
      { label: 'GNU Octave documentation', url: 'https://docs.octave.org/latest/', kind: 'tool' },
      { label: 'Wikipedia — Discrete-time signal', url: 'https://en.wikipedia.org/wiki/Discrete-time_signal', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'dsp-m01-l2',
    title: 'The Sampling Theorem and Aliasing',
    summary:
      'Why fs > 2fmax is non-negotiable, how a 120 Hz tone at fs = 100 Hz disguises itself as 20 Hz, and what anti-aliasing filters are for.',
    objectives: [
      'State the Nyquist criterion and define the Nyquist frequency.',
      'Compute the alias frequency of an out-of-band tone by folding.',
      'Explain why aliasing is irreversible after sampling.',
      'Describe the role and placement of an anti-aliasing filter.',
    ],
    whyItMatters:
      'Aliasing is the most expensive silent failure in DSP: the data arrives, looks plausible, and is wrong forever. Every audio whine when a fan spins, every false vibration frequency in a rotating machine, every "+3 kHz ghost" in an SDR waterfall is this lesson. The fold-and-check arithmetic takes one minute to learn and saves entire redesigns.',
    prerequisites: [
      'dsp-m01-l1 (x[n], normalised frequency)',
    ],
    explanation:
      '### The theorem\n\nThe **Nyquist-Shannon sampling theorem**: a signal containing no frequency above fmax can be reconstructed exactly from samples taken at\n\n```\nfs > 2 fmax\n```\n\nThe threshold fs/2 is the **Nyquist frequency** — the highest frequency the sampled data can unambiguously represent. Sampling at 48 kHz captures audio up to 24 kHz; at 100 Hz, only content below 50 Hz.\n\n### What happens above Nyquist: folding\n\nSample a tone above fs/2 and it does not vanish — it reappears at a *lower* frequency, indistinguishable from a genuine tone there. The arithmetic is folding about multiples of fs/2 (equivalently, about fs):\n\n```\nf_alias = | f - k * fs |   for the integer k that lands the result in [0, fs/2]\n```\n\nWorked example from the lesson title: **fs = 100 Hz, tone at 120 Hz**. Take k = 1: |120 - 100| = **20 Hz**. The sampled sequence of a 120 Hz tone at 100 Hz sampling is *identical* to the sequence of a true 20 Hz tone — sample for sample. Two more checks: a 70 Hz tone folds to |70 - 100| = 30 Hz; a 160 Hz tone gives |160 - 100| = 60, which is still above 50, so fold again about 100: |100 - 60|... more cleanly, 160 mod 100 = 60, and 60 folds to 100 - 60 = **40 Hz**.\n\n### After sampling, the damage is done\n\nThe 20 Hz component in the sampled data *is* a 20 Hz component as far as any digital system can tell — no downstream filter can remove it without removing real 20 Hz content too. The only cure is **before** the converter: an **anti-aliasing filter** (analog, low-pass, cutoff at or below fs/2) strips out frequencies that would fold. Oversampling (fs much greater than 2 fmax) relaxes the filter\'s steepness requirement, which is one reason audio converters run at 48-192 kHz for 20 kHz audio.',
    deepDive:
      '### Aliasing in the frequency domain, in one picture\n\nSampling multiplies the signal\'s spectrum by a comb of impulses spaced fs apart; in the frequency domain that *convolves* the spectrum with copies of itself at every multiple of fs. Each copy is a mirror image, and they overlap whenever the signal has content above fs/2 — the overlap region is where a high frequency and a low frequency claim the same sample values. The folding formula is just the arithmetic of locating the nearest copy. This picture also explains the fix: keep the copies from overlapping by limiting the baseband width (the anti-alias filter), or push the copies apart by raising fs.',
    examples: [
      {
        title: 'Folding table for fs = 100 Hz (GNU Octave)',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
fs = 100;
tones = [20 45 70 120 160 230];

for k = 1:length(tones)
  f = tones(k);
  g = mod(f, fs);              % reduce modulo fs
  if g > fs/2
    g = fs - g;                % fold about fs/2
  end
  fprintf('%6.0f Hz tone -> appears at %5.0f Hz\\n', f, g);
end`,
        explanation: [
          'mod(f, fs) reduces the tone into 0..fs; if the remainder exceeds fs/2 it folds to fs - remainder.',
          '20 Hz: mod = 20, below 50, stays 20.',
          '45 Hz: stays 45 (just under Nyquist).',
          '70 Hz: mod = 70, above 50, folds to 100 - 70 = 30.',
          '120 Hz: mod = 20, stays 20 — the headline example, computed mechanically.',
          '160 Hz: mod = 60, folds to 100 - 60 = 40.',
          '230 Hz: mod = 30, stays 30.',
          'Expected output, exactly:',
          '    20 Hz tone -> appears at    20 Hz',
          '    45 Hz tone -> appears at    45 Hz',
          '    70 Hz tone -> appears at    30 Hz',
          '   120 Hz tone -> appears at    20 Hz',
          '   160 Hz tone -> appears at    40 Hz',
          '   230 Hz tone -> appears at    30 Hz',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Folding map for fs = 100 Hz (illustrative)',
        content:
          '  true frequency axis:\n\n   0        50         100       150       200\n   |---------|----------|---------|---------|\n   [ baseband ]  fold 1   [  fold 2  ]\n   (heard truly) (mirrored) (mirrored)\n\n   120 Hz  ---- fold about 100 ---->  20 Hz\n    70 Hz  ---- fold about 100 ---->  30 Hz\n   160 Hz  ---- fold about 100 ---->  40 Hz\n   230 Hz  ---- fold about 200/100 -> 30 Hz\n\n  (educational waveform (illustrative) — every region above\n   fs/2 lands somewhere in 0..fs/2, disguised)',
        caption:
          'Each interval of width fs/2 above Nyquist mirrors back into the baseband. The disguises are exact: no digital processing can tell them from true tones.',
      },
    ],
    tables: [
      {
        caption: 'Alias arithmetic for fs = 100 Hz',
        headers: ['True tone (Hz)', 'mod 100', 'Folded alias (Hz)'],
        rows: [
          ['20', '20', '20 (true)'],
          ['45', '45', '45 (true, near Nyquist)'],
          ['70', '70 > 50', '30'],
          ['120', '20', '20'],
          ['160', '60 > 50', '40'],
          ['230', '30', '30'],
        ],
      },
      {
        caption: 'Common sampling rates and their Nyquist limits',
        headers: ['Application', 'fs', 'Nyquist frequency'],
        rows: [
          ['Telephony (narrowband)', '8 kHz', '4 kHz'],
          ['CD audio', '44.1 kHz', '22.05 kHz'],
          ['Studio audio', '48 kHz', '24 kHz'],
          ['Mains-power monitoring (50/60 Hz systems)', '1 kHz', '500 Hz'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Sampling at exactly fs = 2 fmax and expecting clean capture.',
        fix: 'The theorem needs fs strictly greater than 2 fmax, and real signals are not single tones. A component exactly at fs/2 has ambiguous phase (its samples can be all zeros), so practice keeps a margin: fs comfortably above 2 fmax plus a real filter\'s transition band.',
      },
      {
        mistake: 'Folding about fs instead of fs/2, or stopping after one fold.',
        fix: 'Reduce mod fs first, then fold once about fs/2: if the remainder r exceeds fs/2, the alias is fs - r. The 160 Hz example needs the second step (60 -> 40); stopping early is a classic slip.',
      },
      {
        mistake: 'Trying to fix aliasing in software after conversion.',
        fix: 'The alias is mathematically identical to a true tone in-band; no digital filter can separate them. Only an analog anti-aliasing filter before the ADC (or a higher fs) prevents it. If your data is already aliased, the information is gone.',
      },
    ],
    guidedPractice: {
      title: 'Folding drill and challenge link',
      brief:
        'For fs = 200 Hz, compute the alias of each tone: 90, 150, 310, 400 Hz. Then try the platform challenge ece-matlab-01-sampling, which tests exactly this alias-frequency reasoning.',
      expectedBehavior:
        '90 Hz: below 100, true. 150 Hz: mod 200 = 150 > 100, folds to 200 - 150 = 50 Hz. 310 Hz: mod 200 = 110 > 100, folds to 200 - 110 = 90 Hz. 400 Hz: mod 200 = 0, appears at 0 Hz (DC).',
      hints: [
        'Nyquist for fs = 200 is 100 Hz; fold anything above it.',
        'Reduce mod fs first: 310 -> 110, then fold: 200 - 110 = 90.',
        'A tone exactly at a multiple of fs samples to a constant: alias at DC.',
      ],
      challengeId: 'ece-matlab-01-sampling',
    },
    practiceExercises: [
      {
        title: 'Design the capture chain',
        brief:
          'A vibration sensor can output components up to 800 Hz, and you must capture up to 200 Hz faithfully. Choose fs, state the Nyquist frequency, and explain what the anti-aliasing filter must pass and block.',
        expectedBehavior:
          'Any fs > 400 Hz satisfies the theorem; a practical choice like 1 kHz gives Nyquist 500 Hz, margin for the filter transition band, and room for the 200-800 Hz components to be filtered before folding. The filter must pass 0-200 Hz and attenuate everything that would fold into 0-200 Hz after sampling — with fs = 1 kHz that means strong attenuation above 800 Hz.',
        hints: [
          'The theorem sets the minimum fs; the filter\'s transition band sets the practical fs.',
          'Ask which unwanted frequencies would fold into the band you care about.',
        ],
      },
      {
        title: 'Whodunit: find the true tone',
        brief:
          'Sampled at 8 kHz, your data shows a strong 3 kHz component. List every true tone below 16 kHz that could have produced it, using the folding formula.',
        expectedBehavior:
          'Candidates fold to 3 kHz: 3 kHz itself; 13 kHz (|13 - 16| = 3, folding about fs = 8? — correctly: 13 mod 8 = 5, folds to 8 - 5 = 3); 5 kHz would fold to 3 (8 - 5 = 3); 11 kHz (11 mod 8 = 3). So: 3, 5, 11, 13 kHz all alias to 3 kHz at fs = 8 kHz.',
        hints: [
          'Work mod 8 first, then fold about 4.',
          '3 mod 8 = 3; 5 mod 8 = 5 -> 8-5 = 3; 11 mod 8 = 3; 13 mod 8 = 5 -> 3.',
          'This ambiguity is why the anti-alias filter must have removed all of them but one.',
        ],
      },
    ],
    assessment: {
      title: 'Sampling and aliasing checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A 120 Hz tone is sampled at fs = 100 Hz. At what frequency does it appear in the sampled data?',
          options: ['20 Hz', '120 Hz', '50 Hz', '80 Hz'],
          answer: '20 Hz',
          explanation:
            '120 mod 100 = 20, which is below Nyquist (50), so the alias is 20 Hz. The sampled sequence is identical to that of a true 20 Hz tone.',
          hint: '|120 - 100|.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'The Nyquist frequency of a system sampled at 48 kHz is...',
          options: ['24 kHz', '48 kHz', '96 kHz', '20 kHz'],
          answer: '24 kHz',
          explanation:
            'The Nyquist frequency is fs/2 = 24 kHz — the highest frequency the samples can represent without aliasing.',
          hint: 'Half the sampling rate.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A strong 30 Hz alias in already-sampled data can be removed with a digital low-pass filter set just above 20 Hz, leaving genuine 10-20 Hz content intact.',
          answer: 'false',
          explanation:
            'The alias IS a genuine-looking 30 Hz component in the data; a low-pass that keeps 10-20 Hz and removes 30 Hz might be harmless here, but if genuine content also lived at 30 Hz it would be destroyed too — the alias and the true tone are indistinguishable. The only real fix was before sampling.',
          hint: 'Ask what makes the 30 Hz samples different from real 30 Hz content.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does this Octave loop print for f = 160 with fs = 100?',
          code: 'g = mod(160, 100);\nif g > 50\n  g = 100 - g;\nend\nfprintf("%d", g);',
          options: ['60', '40', '160', '10'],
          answer: '40',
          explanation:
            'mod(160, 100) = 60, which exceeds fs/2 = 50, so it folds: 100 - 60 = 40 Hz.',
          hint: 'Two steps: reduce, then fold.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Nyquist frequency', definition: 'fs/2 — the highest frequency unambiguously representable at sampling rate fs.' },
      { term: 'Sampling theorem', definition: 'A signal band-limited below fmax is exactly recoverable from samples taken at fs > 2 fmax.' },
      { term: 'Aliasing', definition: 'The appearance of out-of-band frequencies at folded, in-band positions after sampling.' },
      { term: 'Anti-aliasing filter', definition: 'An analog low-pass filter before the ADC that removes frequencies above fs/2.' },
      { term: 'Folding', definition: 'The arithmetic mapping f to its alias: reduce mod fs, reflect about fs/2.' },
    ],
    revisionSummary: [
      'fs > 2 fmax or the content above fs/2 folds back as an impostor.',
      'Alias = reduce mod fs, then fold about fs/2: 120 Hz at fs = 100 becomes 20 Hz.',
      'Aliasing is irreversible after sampling; filter analog-ly before the converter.',
      'Oversampling widens the guard band and relaxes the anti-alias filter.',
    ],
    furtherReading: [
      { label: 'The Scientist and Engineer\'s Guide to DSP — Sampling theorem chapter', url: 'https://www.dspguide.com/ch3.htm', kind: 'docs' },
      { label: 'Wikipedia — Nyquist-Shannon sampling theorem', url: 'https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem', kind: 'article' },
      { label: 'Wikipedia — Aliasing', url: 'https://en.wikipedia.org/wiki/Aliasing', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'dsp-m01-l3',
    title: 'Quantization: Bits, Steps and SNR',
    summary:
      'The second half of digitization: mapping amplitudes to a finite set of levels, the 6.02N + 1.76 dB rule, and a toy 3-bit converter traced sample by sample.',
    objectives: [
      'Define quantization step size and compute it from full-scale range and bit depth.',
      'Compute quantization SNR with the rule SNR ≈ 6.02N + 1.76 dB.',
      'Explain why the error behaves like additive noise for busy signals.',
      'Trace a toy quantizer in Octave and verify every rounded value by hand.',
    ],
    whyItMatters:
      'Sampling answers "when do we measure"; quantization answers "how finely". Together they fix the dynamic range and noise floor of every digital system. The 6 dB-per-bit rule is quoted in every datasheet and interview; knowing where it comes from — and seeing a real quantizer make its errors — turns it from a magic number into a tool.',
    prerequisites: [
      'dsp-m01-l1 (discrete signals)',
      'Binary numbers',
    ],
    explanation:
      'An ADC with N bits maps every input amplitude to one of 2^N discrete levels. The spacing between levels, the **step size** (or LSB size), is\n\n```\ndelta = (Vmax - Vmin) / 2^N\n```\n\nFor a 0-3.3 V input and 10 bits: delta = 3.3/1024 = 0.00322 V ≈ 3.2 mV. Any input is rounded to the nearest level, so each sample carries an error between -delta/2 and +delta/2.\n\n### The 6 dB rule\n\nFor a full-scale sine wave, the quantization error acts like uniform random noise with variance delta^2/12. Working through signal power versus noise power gives the famous design rule:\n\n```\nSNR ≈ 6.02 N + 1.76 dB\n```\n\nN = 8: 6.02 x 8 + 1.76 = 49.92 ≈ 50 dB. N = 12: 74.0 dB. N = 16: 98.08 ≈ 98 dB. **Each bit buys about 6 dB** of signal-to-noise ratio, i.e. 4x more noise-free dynamic range. This is why a 16-bit audio format quotes ~96-98 dB dynamic range, and why adding one ADC bit costs exponentially more silicon.\n\n### What the error is (and is not)\n\nFor a busy signal — music, vibration, communications waveforms — the rounding errors hop around quickly and behave like white noise added to the signal; all the standard SNR machinery applies. For slow or DC-like inputs, the error becomes signal-dependent (it can stick at one value and act as distortion instead of noise). Datasheet SNR figures assume the busy-signal model, stated at a specific input amplitude — usually a full-scale sine.',
    deepDive:
      '### Where the 1.76 dB comes from\n\nSignal power of a full-scale sine: peak amplitude A = delta x 2^(N-1), so power = A^2/2. Noise power: error uniform over ±delta/2 has variance delta^2/12. The ratio:\n\n```\nSNR = (A^2/2) / (delta^2/12) = (12/2) x (2^(N-1))^2 = 1.5 x 4^N\n```\n\nIn decibels: 10 log10(1.5) + 10 N log10(4) = 1.76 + 6.02 N. The 6.02 is 10 log10(4) — the "4x per bit" — and the 1.76 is the sine-shape and rounding-distribution correction. Deriving it once is worth more than memorising it: you now know the formula\'s assumptions (full-scale sine, uniform error, no dither) and can predict how the number moves when an input is backed off 6 dB (SNR drops by 6, since the noise stays put and the signal shrinks).',
    examples: [
      {
        title: 'A toy 3-bit quantizer, traced (GNU Octave)',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
N = 3;                       % toy 3-bit converter
levels = 2^N;                % 8 levels
fs = 8;
n = 0:7;
x = 0.5*sin(2*pi*1*n/fs) + 0.5;    % 0..1 sine fits the 0..1 range
xq = round(x * (levels-1)) / (levels-1);
err = x - xq;
for k = 1:8
  fprintf('x=%.3f xq=%.3f err=%+.3f\\n', x(k), xq(k), err(k));
end`,
        explanation: [
          'The 0..1 input range is scaled to 0..7 (levels-1 = 7), rounded to integers, then scaled back: a mid-rise quantizer with step 1/7 ≈ 0.143.',
          'Trace of the eight inputs x = 0.500, 0.854, 1.000, 0.854, 0.500, 0.146, 0.000, 0.146 (0.5 plus/minus a 0.5-amplitude sine).',
          'Multiplied by 7: 3.5, 5.97, 7.0, 5.97, 3.5, 1.03, 0.0, 1.03 — rounded: 4, 6, 7, 6, 4, 1, 0, 1.',
          'Divided by 7: xq = 0.571, 0.857, 1.000, 0.857, 0.571, 0.143, 0.000, 0.143.',
          'Expected output, exactly:',
          'x=0.500 xq=0.571 err=-0.071',
          'x=0.854 xq=0.857 err=-0.004',
          'x=1.000 xq=1.000 err=+0.000',
          'x=0.854 xq=0.857 err=-0.004',
          'x=0.500 xq=0.571 err=-0.071',
          'x=0.146 xq=0.143 err=+0.004',
          'x=0.000 xq=0.000 err=+0.000',
          'x=0.146 xq=0.143 err=+0.004',
          'Every error lies within ±half a step (±0.071 here — and note -0.071 is exactly half of 1/7); the samples crossing a rounding boundary (x=0.5) take the largest errors.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Quantization staircase (illustrative)',
        content:
          '  x\n  1.0 |                       ____\n      |                   ____|\n  6/7 |- - - - - - - - - xq level - - - - -\n      |            ____|      x inside a step\n  5/7 |- - - - - - xq - - - - - - - - - - -\n      |        ____|   o = input\n  4/7 |- - - xq - - - - - - - - - - - - - -\n      |    o(0.500 lands here, err -0.071)\n  3/7 |- - - - - - - - - - - - - - - - - -\n      +--------------------------------------> n\n        step = 1/7 = 0.143   max error = 1/2 step',
        caption:
          'The quantizer is a staircase: each input is snapped to the nearest tread. The worst case (an input exactly between two levels) costs half a step. (Educational waveform (illustrative).)',
      },
    ],
    tables: [
      {
        caption: 'Bits versus quantization SNR (full-scale sine rule)',
        headers: ['N (bits)', 'SNR = 6.02N + 1.76 dB', 'Step size on 3.3 V range'],
        rows: [
          ['8', '49.9 dB', '12.9 mV'],
          ['10', '62.0 dB', '3.22 mV'],
          ['12', '74.0 dB', '0.81 mV'],
          ['16', '98.1 dB', '50 µV'],
        ],
      },
      {
        caption: 'Step-size arithmetic for the 3.3 V range',
        headers: ['Quantity', 'Formula', 'N = 10 value'],
        rows: [
          ['Levels', '2^N', '1024'],
          ['Step (LSB)', '3.3 / 2^N', '3.3/1024 = 3.22 mV'],
          ['Max rounding error', '± step/2', '±1.61 mV'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Quoting the 6.02N + 1.76 dB figure for any input level.',
        fix: 'The rule assumes a *full-scale* sine. Back the input off by 6 dB and SNR falls by 6 dB (noise fixed, signal smaller). Datasheets state input amplitude alongside SNR for exactly this reason.',
      },
      {
        mistake: 'Counting levels as 2^N - 1 when computing step size.',
        fix: 'The span is divided by the number of *intervals*, not the number of code points: a 3-bit converter spans 8 codes but 7 intervals in a 0-to-max counting scheme. Check the datasheet convention (some quote full-scale as 2^N LSBs) — the important thing is knowing which convention you are using and staying consistent.',
      },
      {
        mistake: 'Expecting more bits to fix aliasing or clipping.',
        fix: 'Quantization noise, aliasing and clipping are three separate error sources. Bits attack only the first. A clipped sample is distorted no matter how finely it was rounded; an aliased tone is wrong no matter how many bits it carries.',
      },
    ],
    guidedPractice: {
      title: 'Step size and SNR drill',
      brief:
        'A 12-bit ADC spans ±2.5 V (5 V total). Compute the step size, the maximum rounding error, and the quantization SNR for a full-scale sine input.',
      expectedBehavior:
        'Step = 5/4096 = 1.22 mV; max error ±0.61 mV; SNR = 6.02 x 12 + 1.76 = 74.0 dB.',
      hints: [
        '2^12 = 4096 levels across 5 V.',
        'Max error is half a step.',
        '6.02 x 12 = 72.24; add 1.76.',
      ],
    },
    practiceExercises: [
      {
        title: 'Bits for a target SNR',
        brief:
          'An audio design needs at least 84 dB of quantization SNR. Using the 6.02N + 1.76 rule, find the minimum N, then compute the SNR actually delivered by that N.',
        expectedBehavior:
          '6.02N + 1.76 >= 84 -> N >= 82.24/6.02 = 13.66, so N = 14 bits, delivering 6.02 x 14 + 1.76 = 86.04 dB. Thirteen bits (79.99 dB) falls short.',
        hints: [
          'Solve the inequality for N, then round up to an integer.',
          'Check the integer below to confirm it fails.',
        ],
      },
      {
        title: 'Compare the toy quantizer to the rule',
        brief:
          'For the 3-bit toy example, the effective SNR of the traced error sequence will differ from the 19.8 dB the formula predicts (6.02 x 3 + 1.76). Explain in two or three sentences why a tiny, slowly varying, hand-picked 8-sample signal is exactly the case where the formula\'s assumptions break.',
        expectedBehavior:
          'The formula assumes a full-scale, busy signal and uniform, uncorrelated error. The toy input is not full-scale (peaks at 1.0 but spends time mid-range), has only 8 samples (no meaningful statistics), and its errors are deterministic and signal-dependent (repeated -0.071 and +0.004 values, i.e. distortion-like, not noise-like). Formula assumptions fail; the exercise is to recognise why.',
        hints: [
          'List the formula\'s assumptions: full-scale, busy, uniform error.',
          'Count how many of the 8 errors repeat exactly.',
        ],
      },
    ],
    assessment: {
      title: 'Quantization checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Using SNR ≈ 6.02N + 1.76 dB, what is the quantization SNR of a 12-bit ADC with a full-scale sine input?',
          options: ['74.0 dB', '62.0 dB', '86.0 dB', '49.9 dB'],
          answer: '74.0 dB',
          explanation:
            '6.02 x 12 = 72.24, plus 1.76 = 74.0 dB. Roughly 6 dB per bit plus the 1.76 dB shape constant.',
          hint: '6.02 x 12, then add 1.76.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A 10-bit ADC spans 0-3.3 V. What is its step size?',
          options: ['3.22 mV', '32.2 mV', '0.322 mV', '3.3 mV'],
          answer: '3.22 mV',
          explanation:
            '3.3 V / 2^10 = 3.3/1024 = 0.00322 V = 3.22 mV per level.',
          hint: 'Divide the range by 1024.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Increasing the sampling rate reduces quantization noise for a fixed bit depth and input.',
          answer: 'false',
          explanation:
            'Step size — hence quantization noise — depends on bit depth and voltage range, not on fs. Higher fs widens the anti-alias margin and spreads the same noise over more bandwidth (which oversampling systems exploit with digital filtering, but the raw per-sample noise is unchanged).',
          hint: 'Which quantity in the SNR formula involves fs?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'In the toy 3-bit quantizer example, what error does the code print for the sample x = 0.500?',
          code: 'xq = round(x * 7) / 7;   % x = 0.500',
          options: ['-0.071', '+0.071', '0.000', '-0.143'],
          answer: '-0.071',
          explanation:
            'round(0.5 x 7) = round(3.5) = 4 (half away from zero), so xq = 4/7 = 0.571 and err = 0.500 - 0.571 = -0.071 — exactly half a step.',
          hint: 'Compute 3.5 rounded, then convert back to volts of the 0..1 range.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Quantization', definition: 'Mapping a continuous amplitude onto a finite set of 2^N levels.' },
      { term: 'Step size (LSB)', definition: 'The amplitude spacing between adjacent levels: range / 2^N (per the converter\'s convention).' },
      { term: 'Quantization error/noise', definition: 'The difference between input and quantized value; bounded by ± half a step, noise-like for busy signals.' },
      { term: 'Dynamic range', definition: 'The ratio of largest to smallest usable signal, ≈ 6.02N dB for an N-bit quantizer.' },
    ],
    revisionSummary: [
      'Step = range / 2^N; max rounding error = half a step.',
      'SNR ≈ 6.02N + 1.76 dB for a full-scale sine: 6 dB per bit.',
      'Assumptions matter: full-scale, busy inputs; backed-off or slow signals behave worse or distort.',
      'Bits fix quantization noise only — aliasing and clipping need other cures.',
    ],
    furtherReading: [
      { label: 'The Scientist and Engineer\'s Guide to DSP — Analog-to-digital conversion', url: 'https://www.dspguide.com/ch3.htm', kind: 'docs' },
      { label: 'Wikipedia — Quantization (signal processing)', url: 'https://en.wikipedia.org/wiki/Quantization_(signal_processing)', kind: 'article' },
      { label: 'Wikipedia — Signal-to-quantization-noise ratio', url: 'https://en.wikipedia.org/wiki/Signal-to-quantization-noise_ratio', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
