import type { TutorialProject } from '../types';

export const projects: TutorialProject[] = [
  {
    id: 'dsp-octave-minilab-series',
    title: 'Octave Mini-Lab Series: Four Verified Signal Experiments',
    level: 'beginner',
    summary:
      'A guided path through the four linked MATLAB-track challenges — sampling/aliasing, convolution, FFT bin spacing and BPSK symbols — each prepared with a hand-computed prediction, run on GNU Octave via the platform evaluator, and verified against your prediction.',
    useCase:
      'Turns the course\'s worked examples into a repeatable laboratory habit: predict on paper, run the smallest possible deterministic script, diff the printed numbers against your prediction, and only then scale up. This is precisely how production DSP algorithms are validated — reference model first, always.',
    requirements: [
      'For each of the four challenges, write a hand-computed prediction of the expected numbers before running anything.',
      'Keep every script deterministic and print-based (disp/fprintf, fixed loops, no plotting) so the evaluator\'s text output is checkable line by line.',
      'Record, for each lab: the prediction, the printed output, and a one-line verdict (match / mismatch and why).',
      'Use GNU Octave with MATLAB-compatible syntax; every claimed output must be hand-traceable at the small sizes used here.',
      'Finish with a short reflection connecting each lab to its course lesson.',
    ],
    learningOutcomes: [
      'Predict-then-verify discipline for numerical code.',
      'Alias-frequency folding arithmetic (ece-matlab-01-sampling).',
      'Convolution tap-by-tap computation (ece-matlab-02-convolution).',
      'FFT bin spacing and on-bin tone interpretation (ece-matlab-03-fft-spectrum).',
      'BPSK symbol mapping and threshold detection (ece-matlab-04-bpsk-symbols).',
    ],
    prerequisites: [
      'dsp-m01-l1 (generating sequences in Octave)',
      'dsp-m01-l2 (aliasing), dsp-m03-l1 (convolution), dsp-m03-l2 (bins)',
      'Module com-m02-l2 (BPSK mapping) or equivalent for the fourth lab',
    ],
    architecture:
      'Four independent Octave scripts, one per lab, each under 25 lines: a setup block (parameters small enough to hand-check), a computation block using only core functions (mod, conv, fft, elementary arithmetic), and a print block with fixed-format fprintf lines. The labs share a common header comment template documenting fs, N and the prediction to check against.',
    steps: [
      {
        title: 'Lab 1 — aliasing: predict, then fold',
        detail:
          'For fs = 100 Hz, hand-compute the alias of 120 Hz (20 Hz), 70 Hz (30 Hz) and 160 Hz (40 Hz) using reduce-mod-then-fold. Then write a 10-line Octave loop over the tone list that prints each alias using the mod/reflect formula, and diff against your predictions. Run the platform challenge ece-matlab-01-sampling to confirm the reasoning in a different framing.',
        code: `% Lab 1 sketch: folding table for fs = 100 (predict first!)
fs = 100;
tones = [20 45 70 120 160 230];
for k = 1:length(tones)
  g = mod(tones(k), fs);
  if g > fs/2, g = fs - g; end
  fprintf('%3d Hz -> %3d Hz\\n', tones(k), g);
end`,
      },
      {
        title: 'Lab 2 — convolution: every tap by hand',
        detail:
          'Hand-compute conv([1 2 1], [1 2 1]) = [1 4 6 4 1] with a full tap table, then an asymmetric pair conv([1 2], [1 2 3]) = [1 4 7 6]. Verify both with Octave conv() and the platform challenge ece-matlab-02-convolution. Your prediction sheet should show one product term list per output tap.',
      },
      {
        title: 'Lab 3 — FFT bins: spacing and the mirror',
        detail:
          'Predict the 8-point magnitude spectrum of one cycle of a cosine (bins 1 and 7 at magnitude 4, rest zero). Run the Octave fft print loop from lesson dsp-m03-l2, then compute bin spacing for fs = 500, N = 250 (2 Hz) and locate a 40 Hz tone (bin 20, mirror 230). Confirm interpretation with ece-matlab-03-fft-spectrum.',
      },
      {
        title: 'Lab 4 — BPSK: map, detect, count errors',
        detail:
          'Map bits [0 1 1 0 1 0 0 1] to BPSK symbols (+1, -1, -1, +1, -1, +1, +1, -1) with s = 1 - 2*bits, detect with a threshold at zero, and print per-symbol lines. Noiseless, the bit-error count is exactly 0; state what threshold rule you would keep if small noise were added. Confirm with ece-matlab-04-bpsk-symbols.',
        code: `% Lab 4 sketch: noiseless BPSK round trip (predict symbols first)
bits = [0 1 1 0 1 0 0 1];
s = 1 - 2*bits;            % 0 -> +1, 1 -> -1
bits_hat = s < 0;          % threshold detector at 0
for k = 1:8
  fprintf('bit=%d symbol=%+d detected=%d\\n', bits(k), s(k), bits_hat(k));
end
fprintf('bit errors: %d\\n', sum(bits ~= bits_hat));`,
      },
      {
        title: 'Wrap-up — the prediction ledger',
        detail:
          'Collect the four labs into one table: lab, prediction, printed result, verdict, lesson link. Any mismatch gets a written cause (indexing convention, folding slip, on-bin assumption) — the ledger is the deliverable, not the scripts.',
      },
    ],
    testPlan: [
      'Lab 1 prints 20, 45, 30, 20, 40, 30 for the tone list [20 45 70 120 160 230].',
      'Lab 2 prints [1 4 6 4 1] and [1 4 7 6] for the two conv pairs.',
      'Lab 3 prints |X[0]| = 0.0, |X[1]| = 4.0, |X[7]| = 4.0 and 0.0 elsewhere for the 8-point cosine.',
      'Lab 4 prints 8 symbol lines with detected == bit in every row and bit errors: 0.',
      'Every lab\'s prediction sheet is dated before the run (the discipline is the test).',
    ],
    expectedResults:
      'Four short deterministic Octave scripts, each verified against a hand-computed prediction, plus one ledger table linking labs to lessons and the four platform challenges. All labs pass with zero unexplained mismatches; explained mismatches are documented with causes.',
    troubleshooting: [
      'Lab 1 gives 60 instead of 40 for 160 Hz: you folded once (mod = 60) but forgot the second fold (fs - 60).',
      'Lab 2 gives [1 2 1] instead of [1 4 6 4 1]: the tap table summed products for only one alignment; re-check the slide range Nx + Nh - 1.',
      'Lab 3 shows nonzero dust in the zero bins: floating-point residue below print precision; print with fewer decimals or verify magnitudes are below 1e-10.',
      'Lab 4 shows detected mismatches: the threshold compares against 0, not 0.5 — BPSK symbols are ±1.',
      'A lab prints column-wise values instead of rows: Octave disp prints vectors vertically; use fprintf loops as in the lessons.',
    ],
  },
];
