import type { TutorialLesson } from '../types';

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'dsp-m03-l1',
    title: 'Convolution, Computed by Hand',
    summary:
      'The multiply-shift-add engine behind every LTI system: the flip-slide-sum mechanics, every output tap worked out, and confirmation in Octave.',
    objectives: [
      'State the convolution sum and its output-length rule (Nx + Nh - 1).',
      'Compute a full convolution of two short sequences by hand, tap by tap.',
      'Connect each output tap back to the superposition picture from module 02.',
      'Verify a hand convolution with the Octave conv function.',
    ],
    whyItMatters:
      'Convolution is what filters *do*: every FIR tap, every IIR recursion, every matched detector and every audio effect reduces to this sum. Being able to compute one by hand — all taps, no calculator — is the difference between using filters and understanding them, and it is exactly what the platform\'s convolution challenge asks you to demonstrate.',
    prerequisites: [
      'dsp-m02-l2 (impulse response, superposition)',
    ],
    explanation:
      'The **convolution** of input x with impulse response h is\n\n```\ny[n] = SUM_k  x[k] * h[n-k]\n```\n\nVerbally: to get output sample n, flip h left-for-right, slide it so it sits at position n, multiply overlapping samples, and add them up. The output length is **length(x) + length(h) - 1** — after the last input sample, the impulse response still rings for Nh - 1 more samples.\n\n### Worked example, every tap\n\nTake x = [1, 2, 1] and h = [1, 2, 1] (h reversed is also [1, 2, 1] — a palindrome, which makes the arithmetic pleasant but changes nothing about the method). Output length: 3 + 3 - 1 = 5.\n\n```\nn=0:  x0*h0                    = 1*1            = 1\nn=1:  x0*h1 + x1*h0            = 1*2 + 2*1      = 4\nn=2:  x0*h2 + x1*h1 + x2*h0    = 1*1 + 2*2 + 1*1 = 6\nn=3:  x1*h2 + x2*h1            = 2*1 + 1*2      = 4\nn=4:  x2*h2                    = 1*1            = 1\n\ny = [1, 4, 6, 4, 1]\n```\n\nRead the structure: the output grows as the impulse response slides *into* the input (1, 4), peaks when fully overlapped (6), and shrinks as it slides *out* (4, 1). For a length-M moving average against a step, this same sliding picture produced the ramps of the last lesson — convolution is the general form of that trace.',
    deepDive:
      '### Where convolution appears, three ways\n\nFirst, as *definition*: the input-output law of every LTI system (module 02\'s superposition, written as a sum). Second, as *algorithm*: FIR hardware is a convolution machine — each clock cycle computes one output tap by multiply-accumulating against a delay line; GPUs and FFT routines are tuned around it. Third, as *analysis tool*: multiplying spectra corresponds to convolving in time (and vice versa), which is why windowing (a time-domain multiply) smears the spectrum (a frequency-domain convolution) — the seed of the leakage discussion two lessons ahead. When you meet circular convolution in the challenge track: conv(x, h) computed by the DFT wraps around instead of extending, and zero-padding to length Nx + Nh - 1 makes the wrapped version equal the linear one — that padding rule exists precisely because of the length law above.',
    examples: [
      {
        title: 'Convolution tap table and Octave verification',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
x = [1 2 1];
h = [1 2 1];
y = conv(x, h);          % linear convolution, length 5

fprintf('length(y) = %d\\n', length(y));
for k = 1:length(y)
  fprintf('y[%d] = %.0f\\n', k - 1, y(k));
end`,
        explanation: [
          'conv() implements the linear convolution sum; its output length is length(x) + length(h) - 1 = 5, printed as length(y) = 5.',
          'The values are the hand-computed taps: 1, 4, 6, 4, 1.',
          'Expected output, exactly:',
          'length(y) = 5',
          'y[0] = 1',
          'y[1] = 4',
          'y[2] = 6',
          'y[3] = 4',
          'y[4] = 1',
          'The %.0f format is safe here because every tap is an exact small integer — always hand-verify the values you expect before trusting a format choice.',
          'Energy check: the peak tap (6) is the fully-overlapped sum 1*1 + 2*2 + 1*1, and the sequence is symmetric because both inputs are palindromes.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Flip, slide, overlap: the n = 2 output tap',
        content:
          '  x:            1   2   1\n  h flipped:    1   2   1   (palindrome, so flip is invisible here)\n\n  slide so flipped h starts at position n = 2:\n\n  index:        0   1   2   3   4\n  x:            1   2   1\n  h[n-k]:               1   2   1   <- flipped h, slid to n=2\n  products:             1   4   1\n\n  y[2] = 1 + 4 + 1 = 6\n\n  Fully overlapped -> the largest tap (6) of this example.',
        caption:
          'Each output tap is one alignment of the flipped impulse response against the input. Slide by slide, the products sweep out the whole output.',
      },
    ],
    tables: [
      {
        caption: 'Every tap of x * h for x = [1, 2, 1], h = [1, 2, 1]',
        headers: ['n', 'Terms (x[k] * h[n-k])', 'Sum'],
        rows: [
          ['0', '1*1', '1'],
          ['1', '1*2 + 2*1', '4'],
          ['2', '1*1 + 2*2 + 1*1', '6'],
          ['3', '2*1 + 1*2', '4'],
          ['4', '1*1', '1'],
        ],
      },
      {
        caption: 'Convolution facts worth memorising',
        headers: ['Fact', 'Statement'],
        rows: [
          ['Output length', 'Nx + Nh - 1'],
          ['Commutativity', 'x * h = h * x (input and filter swap freely)'],
          ['With an impulse', 'x * delta = x (convolution with delta copies the signal)'],
          ['Cascade', 'filtering twice = convolving the two impulse responses first'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Producing an output of length max(Nx, Nh) instead of Nx + Nh - 1.',
        fix: 'The tail rings on: after the last input sample, Nh - 1 further outputs are still nonzero (here taps n = 3 and 4 come entirely from the input having ended). If your output is the wrong length, re-check the slide range.',
      },
      {
        mistake: 'Forgetting to flip h, then treating x*h as a plain dot product slide.',
        fix: 'For symmetric (palindrome) h like this example the flip is invisible — which makes the error dangerous: it hides until you meet an asymmetric h. Always perform the flip explicitly, then verify on a known asymmetric case (e.g. h = [1, 2]).',
      },
      {
        mistake: 'Mixing up the index roles: n is the output position, k the input position.',
        fix: 'In y[n] = SUM_k x[k] h[n-k], n is fixed for one output tap while k sweeps. Writing h[n+k] or sweeping n inside the sum are the classic transcription errors — re-derive one tap fully (n = 2 above) to reset the mental model.',
      },
    ],
    guidedPractice: {
      title: 'Convolve an asymmetric pair, all taps',
      brief:
        'Compute y = x * h for x = [1, 2] and h = [1, 2, 3] by hand: list all 4 output taps with their product terms. Then verify with conv([1 2], [1 2 3]) in Octave (predict its output first).',
      expectedBehavior:
        'Length 2 + 3 - 1 = 4. y[0] = 1*1 = 1; y[1] = 1*2 + 2*1 = 4; y[2] = 1*3 + 2*2 = 7; y[3] = 2*3 = 6. y = [1, 4, 7, 6]. The flip matters visibly here: conv gives the same [1 4 7 6].',
      hints: [
        'Flip h first: h = [1, 2, 3] reversed is [3, 2, 1].',
        'Slide the flipped h across the two input samples; tap n = 2 catches x0*h2 + x1*h1 = 1*3 + 2*2 = 7.',
        'The first and last taps always have a single product term.',
      ],
    },
    practiceExercises: [
      {
        title: 'Moving average as convolution',
        brief:
          'Using convolution, compute the M = 4 moving average (h = [0.25, 0.25, 0.25, 0.25]) of x = [8, 8, 8, 8, 0, 0, 0, 0]. Note the output has 8 + 4 - 1 = 11 taps; compare the first 8 with the lesson-2 trace and explain the extra 3.',
        expectedBehavior:
          'Taps 0-7 reproduce 2, 4, 6, 8, 6, 4, 2, 0. Taps 8-10 are 0, 0, 0 here (the input ended four samples of zeros ago and h is only four long), so nothing new appears — but the *length* is 11, matching the length law. With a nonzero tail of x they would be nonzero.',
        hints: [
          'Each tap sums four products of 0.25 times overlapping x values.',
          'After tap 7, both sequences contribute only zeros.',
          'The length law always adds Nh - 1 extra positions, meaningful or not.',
        ],
      },
      {
        title: 'Cascade of two filters',
        brief:
          'Two filters run in series: h1 = [1, 1] then h2 = [1, 1]. Using the cascade fact (convolve the impulse responses), find the combined impulse response and its length, and state what operation the cascade performs on an input.',
        expectedBehavior:
          'h = h1 * h2 = [1, 2, 1] (length 3): taps 1*1 = 1; 1*1 + 1*1 = 2; 1*1 = 1. The cascade is a length-3 weighted moving average — smoothing twice with [1,1] equals one pass of the triangle [1,2,1] (which is also 2, 4, 6, 4, 2 scaled: the lesson example, normalised by 4).',
        hints: [
          'Convolve the two length-2 sequences: 2 + 2 - 1 = 3 taps.',
          'Middle tap: two ways to reach it, 1*1 + 1*1 = 2.',
          'Compare with [1, 2, 1]/4 — the binomial smoothing kernel.',
        ],
      },
    ],
    assessment: {
      title: 'Convolution checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Convolving a length-3 sequence with a length-3 sequence yields an output of length...',
          options: ['5', '6', '3', '9'],
          answer: '5',
          explanation:
            'Nx + Nh - 1 = 3 + 3 - 1 = 5. The tail of h adds Nh - 1 positions beyond the input.',
          hint: 'Add the lengths, subtract one.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does this Octave code print?',
          code: 'y = conv([1 2 1], [1 2 1]);\nfprintf("%d", y(3));',
          options: ['6', '4', '1', '2'],
          answer: '6',
          explanation:
            'y = [1, 4, 6, 4, 1]; y(3) is the third element (Octave 1-based), the fully-overlapped tap 1*1 + 2*2 + 1*1 = 6.',
          hint: 'Mind the 1-based indexing: y(3) is tap n = 2.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Convolution with the unit impulse δ = [1, 0, 0, ...] leaves a sequence unchanged.',
          answer: 'true',
          explanation:
            'x * delta = x: the impulse response [1] shifted by every input sample rebuilds the input exactly. This identity is why the impulse response fully characterises an LTI system.',
          hint: 'Only one product term is nonzero per tap.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'For x = [1, 2] and h = [1, 2, 3], what is the middle... specifically the y[2] tap (number only)?',
          answer: '7',
          explanation:
            'y[2] = x0*h2 + x1*h1 = 1*3 + 2*2 = 7. The full output is [1, 4, 7, 6].',
          hint: 'Two product terms: 1*3 and 2*2.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Convolution sum', definition: 'y[n] = SUM_k x[k] h[n-k]: the input-output law of LTI systems.' },
      { term: 'Linear convolution', definition: 'The plain sum, producing length Nx + Nh - 1 output (as opposed to circular convolution inside the DFT).' },
      { term: 'Tap', definition: 'One output sample of the convolution — one alignment of flipped h against x.' },
      { term: 'Zero-padding', definition: 'Extending sequences with zeros (to Nx + Nh - 1) so circular DFT convolution equals linear convolution.' },
    ],
    revisionSummary: [
      'Flip h, slide, multiply, add — one output tap per alignment.',
      'Output length Nx + Nh - 1; end taps have single product terms.',
      'x * delta = x; cascades convolve their impulse responses.',
      'Octave conv() verifies hand computations; hand computation verifies conv().',
    ],
    furtherReading: [
      { label: 'The Scientist and Engineer\'s Guide to DSP — Convolution', url: 'https://www.dspguide.com/ch6.htm', kind: 'docs' },
      { label: 'Wikipedia — Convolution', url: 'https://en.wikipedia.org/wiki/Convolution', kind: 'article' },
      { label: 'GNU Octave documentation — conv', url: 'https://docs.octave.org/latest/', kind: 'tool' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'dsp-m03-l2',
    title: 'The DFT: Bins and Frequency Resolution',
    summary:
      'Turn N samples into N complex amplitudes: what a DFT bin is, how bin spacing is set by fs/N, and a fully hand-checkable 8-point example.',
    objectives: [
      'State what the DFT computes and what each bin represents.',
      'Compute bin spacing (fs/N) and the frequency of any bin.',
      'Predict when a tone lands exactly on a bin and when it leaks between bins.',
      'Interpret a magnitude spectrum printed by Octave\'s fft for a real signal.',
    ],
    whyItMatters:
      'The DFT is how digital systems *see* frequency: spectrum analysers, audio EQs, vibration monitors, OFDM receivers — all are DFTs at heart. Reading a magnitude spectrum correctly (which bin, what Hz, why the energy spread) is a daily skill in signal work, and the platform\'s FFT challenge is built on exactly this interpretation.',
    prerequisites: [
      'dsp-m01-l2 (sampling, Nyquist)',
      'Comfort with complex numbers at the level of magnitude and angle',
    ],
    explanation:
      'The **Discrete Fourier Transform** converts N samples x[0..N-1] into N complex numbers:\n\n```\nX[k] = SUM_{n=0}^{N-1} x[n] * e^(-j 2 pi k n / N),   k = 0..N-1\n```\n\nEach k is a **bin**: the DFT correlates the input against a complex exponential completing exactly k cycles over the window. Bin k corresponds to frequency\n\n```\nf_k = k * fs / N\n```\n\nThe **bin spacing** is fs/N — the resolution the transform can offer. Bin 0 is DC; bins 1..N/2-1 are positive frequencies; for real inputs the upper half mirrors the lower (X[N-k] = conj(X[k])), which is why magnitude plots show only the first half.\n\n### Worked bin arithmetic\n\nfs = 100 Hz, N = 100 samples: spacing = 100/100 = **1 Hz**; bin 7 is 7 Hz. A 5 Hz tone lands exactly on bin 5, so its energy appears in one bin. Now fs = 200, N = 100: spacing = 2 Hz; bin frequencies are 0, 2, 4, ... A 7 Hz tone falls between bins 3 (6 Hz) and 4 (8 Hz) — no bin matches, and the energy *spreads* across several bins. That spread is **spectral leakage** (next lesson): the DFT assumes its window contains whole cycles, and a mismatch smears energy. The fix at acquisition time is choosing fs/N so tones of interest land on bins; the fix in analysis is windowing.',
    deepDive:
      '### Two symmetries you will use constantly\n\nFor real-valued x: X[N-k] = conj(X[k]). Practical consequences: the magnitude spectrum is symmetric about N/2, so half the bins are redundant; a real cosine at bin k shows up as peaks at k AND N-k with half the amplitude each (a cosine is half of two rotating phasors — the 8-point example below shows exactly 4 and 4); and any "energy" appearing in the upper half of a real signal\'s spectrum is the mirror of lower-half content, never independent information. The second symmetry: shifting a signal in time multiplies X[k] by a phase ramp e^(-j2pi k n0/N) — magnitudes are unchanged. So magnitude spectra answer "what frequencies and how much", while phases carry "when" — which is why magnitude-only plots dominate practice and why a magnitude plot can never be un-done to recover the waveform.',
    examples: [
      {
        title: 'An 8-point DFT you can check by hand (GNU Octave)',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
% One cycle of a cosine in 8 samples: tone at bin 1 (fs = 8, f = 1 Hz)
n = 0:7;
x = cos(2*pi*1*n/8);
X = fft(x);
for k = 1:8
  fprintf('|X[%d]| = %.1f\\n', k - 1, abs(X(k)));
end`,
        explanation: [
          'The tone frequency f = 1 Hz with fs = 8 and N = 8 puts it exactly on bin 1 (f_N = 1 x 8/8 = 1 Hz).',
          'A real cosine is two half-amplitude phasors, so the energy splits between bin 1 and its mirror bin 7 = N - 1, each of magnitude N/2 = 4.',
          'All other bins are exactly zero for this perfectly periodic window (up to floating-point dust far below the print precision).',
          'Expected output, exactly:',
          '|X[0]| = 0.0',
          '|X[1]| = 4.0',
          '|X[2]| = 0.0',
          '|X[3]| = 0.0',
          '|X[4]| = 0.0',
          '|X[5]| = 0.0',
          '|X[6]| = 0.0',
          '|X[7]| = 4.0',
          'Hand check of bin 1 without the FFT: X[1] = SUM cos(2 pi n/8) e^(-j 2 pi n/8) = (1/2) SUM (1 + e^(-j 2 pi (2n)/8)) = 8/2 + 0 = 4, since the second sum runs over whole cycles and cancels.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Bin frequencies for fs = 100, N = 100 (spacing 1 Hz)',
        content:
          '  bin:    0     1     2     3   ...   49 | 50  ...  98    99\n  Hz:     0     1     2     3   ...   49 | 50  ...  98    99\n                                          ^\n                                     Nyquist (fs/2)\n\n  real signal => upper half mirrors lower half:\n     |X[99]| = |X[1]|,  |X[98]| = |X[2]|, ...\n\n  a 5 Hz tone (fs=100, N=100): exactly bin 5 (plus mirror bin 95)\n  a 7 Hz tone (fs=200, N=100): between bins 3 (6 Hz) and 4 (8 Hz)\n                               -> energy leaks across bins',
        caption:
          'Bin k sits at k x fs/N. For real signals the spectrum is mirror-symmetric about the Nyquist bin. (Illustrative.)',
      },
    ],
    tables: [
      {
        caption: 'Bin arithmetic examples',
        headers: ['fs', 'N', 'Bin spacing fs/N', 'Bin 3 is', 'Tone on a bin?'],
        rows: [
          ['100 Hz', '100', '1 Hz', '3 Hz', '5 Hz: yes (bin 5)'],
          ['200 Hz', '100', '2 Hz', '6 Hz', '7 Hz: no (bins 3-4)'],
          ['1000 Hz', '256', '3.906 Hz', '11.72 Hz', '50 Hz: no (12.8)'],
          ['1000 Hz', '500', '2 Hz', '6 Hz', '50 Hz: yes (bin 25)'],
        ],
      },
      {
        caption: 'DFT bin roles for a real-valued input',
        headers: ['Bin', 'Frequency', 'Content'],
        rows: [
          ['0', '0 (DC)', 'Mean of the samples'],
          ['1 .. N/2-1', 'k x fs/N', 'Positive frequencies'],
          ['N/2', 'fs/2 (Nyquist)', 'Highest representable frequency'],
          ['N/2+1 .. N-1', 'k x fs/N', 'Mirrors of bins N-k (conjugates)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Labelling bin k as k Hz regardless of fs and N.',
        fix: 'Bin k is k x fs/N Hz. A "bin 5" at fs = 100, N = 100 is 5 Hz; at fs = 1000, N = 100 it is 50 Hz. The printed x-axis of any FFT plot encodes fs/N — check it before interpreting.',
      },
      {
        mistake: 'Reading energy in the upper half of a real-signal spectrum as separate content.',
        fix: 'For real x, bins above N/2 mirror the lower half. Half the output is redundant; interpret only bins 0..N/2 (and expect the Nyquist bin to be real-valued).',
      },
      {
        mistake: 'Expecting a tone slightly off-bin to appear cleanly at the nearest bin.',
        fix: 'Off-bin tones spread energy across *many* neighbouring bins (leakage) and their apparent peak can shift. Interpolation methods exist, but the first-line cure is choosing fs/N so the tone is on-bin, or windowing (next lesson).',
      },
    ],
    guidedPractice: {
      title: 'Bin drill and challenge link',
      brief:
        'For fs = 500 Hz and N = 250: compute the bin spacing, the frequency of bin 30, which bin a 40 Hz tone lands on, and the mirror bin of that tone. Then attempt the platform challenge ece-matlab-03-fft-spectrum, which tests bin-spacing interpretation.',
      expectedBehavior:
        'Spacing = 500/250 = 2 Hz. Bin 30 = 60 Hz. A 40 Hz tone sits on bin 20 (40/2 = 20); its mirror is bin 250 - 20 = 230.',
      hints: [
        'Spacing first: fs/N.',
        'Bin index = frequency / spacing.',
        'Mirror bin = N - k.',
      ],
      challengeId: 'ece-matlab-03-fft-spectrum',
    },
    practiceExercises: [
      {
        title: 'Choose N for on-bin tones',
        brief:
          'You sample at fs = 1000 Hz and care about tones at 50 Hz and 120 Hz. Find the smallest N of the form 2^m such that both tones land exactly on bins, and state those bin numbers.',
        expectedBehavior:
          'Need fs/N dividing both 50 and 120: spacing g = 1000/N must divide gcd(50, 120) = 10, so N >= 100. Powers of two: N = 128 gives spacing 7.8125 Hz (50/7.8125 not an integer — fails). N = 256: 3.906 Hz — fails. Smallest power of two with spacing dividing 10 Hz... 1000/N must be a divisor of 10: N = 100, 200, 500, 1000 — none are powers of two, so NO power-of-two N works for both; the practical answer is to pick N = 1000 (spacing 1 Hz, bins 50 and 120) or accept leakage/windowing. This trap — powers of two versus on-bin tones — is the exercise.',
        hints: [
          'On-bin requires f / (fs/N) to be an integer: N x f / fs integer for both tones.',
          'Check N x 50/1000 = N/20 and N x 120/1000 = 3N/25 — both must be integers.',
          'gcd(20, 25) = 5, so N must be a multiple of 5: no power of two qualifies.',
        ],
      },
      {
        title: 'Read a printed spectrum',
        brief:
          'An Octave run prints |X[0]| = 2.0, |X[1]| = 48.0, |X[2]| = 1.0 for fs = 600, N = 600 (bins shown to k = 2 only). State the frequency and approximate amplitude of the dominant component, and what the 2.0 at bin 0 measures.',
        expectedBehavior:
          'Bin 1 = 600/600 = 1 Hz; a magnitude of 48 for a single-bin tone means amplitude 2 x 48/600 = 0.16 (real cosine split across mirror bins). Bin 0 magnitude 2.0 = DC: the signal\'s mean is 2.0/600 ≈ 0.0033. The exercise is converting magnitudes to amplitudes: amplitude = 2|X[k]|/N.',
        hints: [
          'Bin frequency = k fs/N.',
          'For an on-bin cosine, |X[k]| = A N / 2; invert for A.',
          'Bin 0 is the sum of all samples = N times the mean.',
        ],
      },
    ],
    assessment: {
      title: 'DFT checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'With fs = 200 Hz and N = 100, what is the DFT bin spacing?',
          options: ['2 Hz', '1 Hz', '0.5 Hz', '200 Hz'],
          answer: '2 Hz',
          explanation:
            'Spacing = fs/N = 200/100 = 2 Hz. Bin 3 is 6 Hz; bin 50 is the 100 Hz Nyquist bin.',
          hint: 'fs divided by N.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In the 8-point cosine example (one full cycle), why does bin 7 show magnitude 4.0?',
          options: [
            'It is the mirror of bin 1 for a real signal',
            'The tone also exists at 7 Hz',
            'Numerical error accumulated',
            'The DFT double-counts energy',
          ],
          answer: 'It is the mirror of bin 1 for a real signal',
          explanation:
            'A real cosine equals half of two counter-rotating phasors, so its DFT has conjugate peaks at k = 1 and k = N - 1 = 7, each N/2 = 4. No new frequency information lives there.',
          hint: 'X[N-k] = conj(X[k]) for real inputs.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Doubling N (with fs fixed) halves the bin spacing, doubling frequency resolution.',
          answer: 'true',
          explanation:
            'Spacing = fs/N: doubling N halves it. (Resolution in the sense of distinguishing tones also involves observation time — N/fs seconds — which is the same statement in different clothes.)',
          hint: 'Look at the formula.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'For fs = 1000 Hz and N = 500, a 50 Hz tone lands exactly on which bin (number only)?',
          answer: '25',
          explanation:
            'Bin = f / (fs/N) = 50 / 2 = 25. Its mirror is bin 475.',
          hint: 'Divide the frequency by the bin spacing.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'DFT (Discrete Fourier Transform)', definition: 'Maps N samples to N complex bins via correlation with complex exponentials.' },
      { term: 'Bin', definition: 'One DFT output index k, corresponding to frequency k x fs/N.' },
      { term: 'Bin spacing', definition: 'fs/N Hz — the frequency grid the transform analyses.' },
      { term: 'Conjugate symmetry', definition: 'For real inputs, X[N-k] = conj(X[k]): the upper half of the spectrum mirrors the lower.' },
      { term: 'Spectral leakage', definition: 'Energy from an off-bin tone spreading across neighbouring bins.' },
    ],
    revisionSummary: [
      'Bin k = k x fs/N; spacing = fs/N; bin 0 = DC.',
      'Real signals: spectrum mirrors about N/2; only half the bins are informative.',
      'On-bin tones concentrate in one bin (plus mirror); off-bin tones leak.',
      'Amplitude from magnitude: A = 2|X[k]|/N for an on-bin real tone.',
    ],
    furtherReading: [
      { label: 'The Scientist and Engineer\'s Guide to DSP — DFT chapter', url: 'https://www.dspguide.com/ch8.htm', kind: 'docs' },
      { label: 'Wikipedia — Discrete Fourier transform', url: 'https://en.wikipedia.org/wiki/Discrete_Fourier_transform', kind: 'article' },
      { label: 'GNU Octave documentation — fft', url: 'https://docs.octave.org/latest/', kind: 'tool' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'dsp-m03-l3',
    title: 'The FFT: Complexity, Leakage and Windows',
    summary:
      'Why the FFT is the DFT done intelligently: the N log N arithmetic, what leakage looks like in printed spectra, and how windowing trades smearing for sidelobes.',
    objectives: [
      'Explain the divide-and-conquer idea behind the FFT at concept level.',
      'Compute and compare DFT (N^2) versus FFT (N log N) operation counts.',
      'Recognise spectral leakage in a magnitude plot and explain its cause.',
      'Describe what windowing changes: mainlobe width versus sidelobe height.',
    ],
    whyItMatters:
      'The FFT is routinely called the most important algorithm of the twentieth century, and the reason is arithmetic you can verify in a table: a million-op transform becomes ten-thousand-op. Combined with leakage awareness, it turns "run fft and stare" into competent spectral analysis — the skill the platform\'s FFT challenge measures.',
    prerequisites: [
      'dsp-m03-l2 (bins, spacing, on-bin versus off-bin)',
    ],
    explanation:
      '### N squared versus N log N\n\nComputing the DFT definition directly needs, for each of N bins, a sum over N samples: N^2 complex multiply-adds. The **FFT** (Fast Fourier Transform) exploits symmetry in the twiddle factors e^(-j2pi kn/N): an N-point transform splits into two N/2-point transforms (even and odd samples) plus N combining multiplies. Repeating the split gives\n\n```\ncomplex ops  ~  N log2(N)      versus      N^2 for the direct DFT\n```\n\nThe table below shows the payoff widening relentlessly with size: at N = 4096 the FFT does about 1/341 of the work. Same exact result (up to rounding), radically different cost — which is why every "DFT" you run is really an FFT.\n\n### Leakage, revisited\n\nLast lesson: a tone exactly on a bin occupies that bin; a tone between bins smears across neighbours. Quantitatively, a truncated sine acts as if multiplied by a rectangular window of length N, and the DFT of that window (a **sinc** shape) is what gets stamped around every tone: a tall **mainlobe** a couple of bins wide plus sidelobes falling off slowly. A tone off-bin is sampled off the sinc\'s peak, so energy appears in many bins. **Windowing** pre-multiplies the data with a taper (Hann, Hamming, Blackman...) whose transform has low sidelobes: leakage into far bins drops dramatically, at the price of a wider mainlobe — slightly worse ability to separate two nearby tones. There is no free lunch; windows trade one smearing for another, and the choice is a documented engineering decision.',
    deepDive:
      '### The doubling recursion, counted\n\nOne FFT stage: two half-size transforms (cost 2 x T(N/2)) plus N/2 butterflies (each one complex multiply + add). With T(1) = 0-ish, unrolling: T(N) = N/2 x log2(N) butterflies. For N = 1024: 512 x 10 = 5120 butterflies, each a multiply and two adds — order 10^4 operations against the direct DFT\'s 10^6. Each halving of the problem is one log2(N) step; the "log" in N log N is literally the number of halvings. This is also why FFT sizes are traditionally powers of two (maximal halving) even though mixed-radix FFTs exist for other N.',
    examples: [
      {
        title: 'DFT versus FFT operation counts',
        language: 'c',
        code: `#include <stdio.h>
#include <math.h>

int main(void) {
    int sizes[5] = { 8, 64, 256, 1024, 4096 };
    for (int i = 0; i < 5; i++) {
        double N = sizes[i];
        double dft = N * N;
        double fft = N * log2(N);
        printf("N=%5.0f  DFT ops=%10.0f  FFT ops=%8.0f  ratio=%6.1f\\n",
               N, dft, fft, dft / fft);
    }
    return 0;
}`,
        explanation: [
          'dft = N^2 and fft = N log2(N) are the standard order-of-magnitude counts (constants ignored, as usual in complexity talk).',
          'The table printed by the program:',
          'N=    8  DFT ops=        64  FFT ops=      24  ratio=   2.7',
          'N=   64  DFT ops=      4096  FFT ops=     384  ratio=  10.7',
          'N=  256  DFT ops=     65536  FFT ops=    2048  ratio=  32.0',
          'N= 1024  DFT ops=   1048576  FFT ops=   10240  ratio= 102.4',
          'N= 4096  DFT ops=  16777216  FFT ops=   49152  ratio= 341.3',
          'Arithmetic spot-checks: 8 x 3 = 24; 64 x 6 = 384; 1024 x 10 = 10240; 4096 x 12 = 49152; 16777216/49152 = 341.33.',
          'The ratio column is the entire business case for the FFT: it grows without bound as N increases.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'On-bin tone versus off-bin leakage (illustrative magnitude spectra)',
        content:
          '  on-bin tone (7 Hz, spacing 1 Hz)      off-bin tone (7.5 Hz, spacing 1 Hz)\n\n  |X|                                   |X|\n   ^                                        ^\n 8 |                    *                8 |        *  *\n   |                    *                   |       *    *\n 4 |                    *                4 |      *      *\n   |                    *                  |     *        *\n 0 +--3---4---5---6---7---8---9-> bin  0 +--3---4---5---6---7---8---9-> bin\n                          7                         6.5? 7.5? spread\n\n  one tall bin (+ mirror)               energy smeared across many bins\n  (educational waveform (illustrative) — schematic magnitudes,\n   not computed values)',
        caption:
          'On-bin: one crisp peak. Off-bin: the sinc-shaped window transform stamps side energy across neighbours. Windowing narrows the skirts at the cost of a wider peak.',
      },
    ],
    tables: [
      {
        caption: 'DFT versus FFT operation counts (computed in the example)',
        headers: ['N', 'Direct DFT ~ N^2', 'FFT ~ N log2 N', 'Speedup'],
        rows: [
          ['8', '64', '24', '2.7x'],
          ['64', '4,096', '384', '10.7x'],
          ['256', '65,536', '2,048', '32x'],
          ['1,024', '1,048,576', '10,240', '102.4x'],
          ['4,096', '16,777,216', '49,152', '341.3x'],
        ],
      },
      {
        caption: 'Window trade-off summary (standard, qualitative)',
        headers: ['Window', 'Mainlobe width', 'Sidelobe level', 'Typical use'],
        rows: [
          ['Rectangular (none)', 'Narrowest', 'Highest (-13 dB)', 'Tones exactly on-bin'],
          ['Hann', 'Wider', 'Much lower (-31 dB)', 'General-purpose spectral analysis'],
          ['Hamming', 'Wider', 'Lower (-41 dB)', 'Communications spectral estimates'],
          ['Blackman', 'Widest of these', 'Very low (-57 dB)', 'High dynamic-range measurements'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Believing the FFT is an approximation of the DFT.',
        fix: 'The FFT computes the exact same mathematical transform — identical results up to floating-point rounding. Only the computation order differs.',
      },
      {
        mistake: 'Zero-padding a short record and calling the result "higher resolution".',
        fix: 'Padding interpolates the spectrum on a finer grid (denser bins) but adds no information: two tones closer than 1/T (T = real observation time) remain unresolvable. Resolution is fs/N over *real* samples; padding only smooths the picture.',
      },
      {
        mistake: 'Applying a window by default to on-bin power measurements.',
        fix: 'Windows spread each tone\'s energy over more bins, so a tone exactly on-bin loses its crisp single-bin reading and total-bin sums must be handled carefully. For amplitude of known, on-bin tones the rectangular window is the right choice; taper for everything else.',
      },
    ],
    guidedPractice: {
      title: 'Pick the transform size',
      brief:
        'A microcontroller must compute a 512-sample spectrum every frame. The direct DFT takes about 512^2 = 262144 complex multiply-adds. Compute the FFT count (N log2 N) and the speedup. Then, at 10 ns per complex multiply-add, compute frame time for both.',
      expectedBehavior:
        'FFT: 512 x 9 = 4608 ops. Speedup = 262144/4608 = 56.9x. Direct DFT frame time = 262144 x 10 ns = 2.62 ms; FFT = 4608 x 10 ns = 46.1 us. At a 100 Hz frame rate (10 ms budget) the direct DFT is feasible but wasteful; the FFT leaves nearly all the budget free.',
      hints: [
        'log2(512) = 9.',
        '262144/4608: divide both by 512 first (512/9 = 56.9).',
        'Frame time = ops x 10 ns; convert to ms by dividing microseconds by 1000.',
      ],
    },
    practiceExercises: [
      {
        title: 'Diagnose a leaked spectrum',
        brief:
          'A colleague samples at 1 kHz with N = 1000 and reports "the spectrum shows energy at 250 Hz and smaller lumps at 249, 251, 248, 252...". Explain the observation in two sentences and propose one change (data-side or analysis-side) to sharpen it.',
        expectedBehavior:
          'The tone is on-bin (250 = 250 x 1 Hz spacing), so the dominant peak is crisp; the skirts are the window\'s sidelobes (rectangular window) or a slightly off-true tone/noise floor. Fixes: apply a Hann window to push sidelobes down (accepting a wider mainlobe), verify the tone frequency against fs/N, or increase N for narrower mainlobes. Any correct cause-and-fix pairing is acceptable.',
        hints: [
          'Check on-bin: 250 x N/fs = 250 x 1 = 250 — integer.',
          'Skirts around an on-bin peak are the window transform, not extra tones.',
          'Windowing trades mainlobe width for sidelobe height.',
        ],
      },
      {
        title: 'Halving the workload',
        brief:
          'An FFT of N = 4096 takes 49152 ops (from the table). If the application only needs the first 512 bins... argue whether a smaller transform of the same record could produce them, and compute the ops for a 4096-point FFT versus 8 cascaded 512-point FFTs covering the same record.',
        expectedBehavior:
          'A standard FFT computes all bins; bin-limited algorithms exist but complicate the code. The simple comparison: 4096-point FFT = 49152 ops; eight 512-point transforms = 8 x (512 x 9) = 36864 ops — but those cover eight *separate* 512-sample records, not one 4096-sample record, so they give different (shorter-window, coarser-resolution) spectra. The exercise: recognise that comparing operation counts is meaningless unless the transforms compute the same thing.',
        hints: [
          'What observation time does each option analyse?',
          'Bin spacing of a 512-point record at the same fs is 8x coarser.',
        ],
      },
    ],
    assessment: {
      title: 'FFT checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'The FFT achieves its speedup by...',
          options: [
            'Exploiting symmetry to reuse half-size transform results',
            'Approximating the DFT with fewer terms',
            'Filtering the input first',
            'Computing only the first half of the bins',
          ],
          answer: 'Exploiting symmetry to reuse half-size transform results',
          explanation:
            'The FFT recursively splits an N-point DFT into two N/2-point DFTs plus O(N) combining work, reusing the periodicity of the twiddle factors. The result is exact, not approximate.',
          hint: 'Divide and conquer over the twiddle-factor pattern.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What ratio does this code print for N = 256?',
          code: 'double N = 256;\ndouble ratio = (N * N) / (N * log2(N));\nprintf("%.1f", ratio);',
          options: ['32.0', '16.0', '256.0', '8.0'],
          answer: '32.0',
          explanation:
            'N^2 = 65536, N log2 N = 256 x 8 = 2048, and 65536/2048 = 32.0.',
          hint: 'log2(256) = 8.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Zero-padding a 512-sample record to 4096 samples before the FFT improves the ability to resolve two tones 2 Hz apart at fs = 1 kHz.',
          answer: 'false',
          explanation:
            'True resolution is set by the real observation time (1/T = 1 Hz here — actually 1/0.512 s ≈ 1.95 Hz, so 2 Hz separation is marginal with the real data). Padding interpolates the spectrum more densely but creates no new information; the tones resolve or not based on the 512 real samples.',
          hint: 'What does the added data consist of?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Windowing trades lower spectral sidelobes for a wider what (one word)?',
          answer: 'mainlobe',
          explanation:
            'Tapered windows push sidelobes down (less far-bin leakage) while widening the mainlobe (slightly worse separation of nearby tones). The table in this lesson summarises the classic options.',
          hint: 'The central peak of each tone\'s spectral stamp.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'FFT', definition: 'Fast Fourier Transform: an exact O(N log N) algorithm for computing the DFT by recursive halving.' },
      { term: 'Twiddle factor', definition: 'The complex factor e^(-j2pi kn/N) whose symmetry the FFT exploits.' },
      { term: 'Spectral leakage', definition: 'The sinc-shaped smearing of a tone\'s energy across bins caused by window truncation.' },
      { term: 'Windowing', definition: 'Pre-multiplying data by a taper (Hann, Hamming, ...) to trade mainlobe width for sidelobe height.' },
      { term: 'Mainlobe / sidelobe', definition: 'The central peak and the surrounding ripples of a window\'s spectral transform.' },
    ],
    revisionSummary: [
      'Direct DFT ~ N^2 ops; FFT ~ N log2 N; the ratio grows with N (102x at N = 1024).',
      'The FFT result is exact — only the computation order differs.',
      'Off-bin tones leak; the smear shape is the window transform (sinc for rectangular).',
      'Windows trade mainlobe width for sidelobe height; choose per measurement goal.',
      'Zero-padding densifies the grid but never adds resolution.',
    ],
    furtherReading: [
      { label: 'The Scientist and Engineer\'s Guide to DSP — FFT chapter', url: 'https://www.dspguide.com/ch12.htm', kind: 'docs' },
      { label: 'Wikipedia — Fast Fourier transform', url: 'https://en.wikipedia.org/wiki/Fast_Fourier_transform', kind: 'article' },
      { label: 'Wikipedia — Window function', url: 'https://en.wikipedia.org/wiki/Window_function', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
