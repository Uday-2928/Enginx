import { describe, expect, it } from 'vitest';
import { INITIAL_CHALLENGES } from './challenges';
import { CHALLENGE_FILTER_OPTIONS, filterChallenges } from './challengeFilters';

describe('challenge explorer filters', () => {
  it('keeps MATLAB aggregate and ECE Signals/DSP/Communications filters distinct', () => {
    expect(CHALLENGE_FILTER_OPTIONS.map((option) => option.id)).toEqual(expect.arrayContaining([
      'ece-matlab',
      'ece-signals',
      'ece-dsp',
      'ece-communications',
    ]));

    expect(filterChallenges(INITIAL_CHALLENGES, 'ece-matlab')).toHaveLength(4);
    expect(filterChallenges(INITIAL_CHALLENGES, 'ece-signals').map((challenge) => challenge.id)).toEqual(['ece-matlab-01-sampling']);
    expect(filterChallenges(INITIAL_CHALLENGES, 'ece-dsp').map((challenge) => challenge.id)).toEqual([
      'ece-matlab-02-convolution',
      'ece-matlab-03-fft-spectrum',
    ]);
    expect(filterChallenges(INITIAL_CHALLENGES, 'ece-communications').map((challenge) => challenge.id)).toEqual(['ece-matlab-04-bpsk-symbols']);
  });

  it('does not change the existing C, Verilog or Embedded C tracks', () => {
    expect(filterChallenges(INITIAL_CHALLENGES, 'cse').every((challenge) => challenge.discipline === 'cse')).toBe(true);
    expect(filterChallenges(INITIAL_CHALLENGES, 'ece-verilog').length).toBeGreaterThan(0);
    expect(filterChallenges(INITIAL_CHALLENGES, 'ece-embedded').length).toBeGreaterThan(0);
  });
});
