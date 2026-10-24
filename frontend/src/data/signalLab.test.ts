import { describe, expect, it } from 'vitest';
import { aliasFrequency, discreteConvolution, dftMagnitude, runSignalExperiment } from './signalLab';
import { INITIAL_CHALLENGES } from './challenges';

describe('Signals & Systems lab models', () => {
  it('folds frequencies into the first Nyquist zone', () => {
    expect(aliasFrequency(8000, 1000)).toBe(1000);
    expect(aliasFrequency(8000, 7000)).toBe(1000);
    expect(aliasFrequency(8000, 5000)).toBe(3000);
  });

  it('computes finite discrete convolution without dropping the tail', () => {
    expect(discreteConvolution([1, 2, 1], [1, -1, 2])).toEqual([1, 1, 1, 3, 2]);
  });

  it('places a one-bin sinusoid peak at the configured frequency', () => {
    const spectrum = dftMagnitude(Array.from({ length: 64 }, (_, index) => Math.sin(2 * Math.PI * 8 * index / 64)), 6400);
    const peak = spectrum.reduce((best, point) => point.y > best.y ? point : best, spectrum[0]);
    expect(peak.x).toBe(800);
  });

  it('returns an inspectable result for the MATLAB-compatible browser model', () => {
    const result = runSignalExperiment({
      module: 'signals',
      experiment: 'sine',
      sampleRate: 8000,
      frequency: 1000,
      amplitude: 1,
      durationMs: 8,
      carrierFrequency: 10000,
      modulationIndex: 0.7,
      noiseDb: 12,
    });
    expect(result.signal.length).toBeGreaterThan(8);
    expect(result.spectrum.length).toBeGreaterThan(4);
    expect(result.matlabCode).toContain('fft');
  });

  it('ships verified MATLAB-compatible records for Signals, DSP and Communications', () => {
    const matlabChallenges = INITIAL_CHALLENGES.filter((challenge) => challenge.discipline === 'ece-matlab');

    expect(matlabChallenges).toHaveLength(4);
    expect(new Set(matlabChallenges.map((challenge) => challenge.signalDomain))).toEqual(new Set(['signals', 'dsp', 'communications']));

    matlabChallenges.forEach((challenge) => {
      expect(challenge.language).toBe('matlab');
      expect(challenge.starterVerified).toBe(true);
      expect(challenge.starter_code).toMatch(/^function\s+\w+/);
      expect(challenge.topic).toMatch(/Signals|DSP|Communication/);
      expect(challenge.tags.length).toBeGreaterThan(2);
      expect(challenge.execution).toMatchObject({
        runtime: 'gnu-octave',
        runtimeAvailable: false,
        status: 'not-run',
        toolboxAvailability: 'not-required',
      });
    });
  });
});
