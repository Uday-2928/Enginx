import type { TutorialCourse } from '../types';

export const course: TutorialCourse = {
  id: 'communication-systems',
  title: 'Communication Systems',
  tagline: 'From signals and noise to modulation and error-control coding.',
  description:
    'A communication systems course: the signal chain from source to receiver, sampling and noise fundamentals, analog and digital modulation families, and error detection and correction. Lessons use explicit link assumptions and MATLAB-compatible examples, connecting directly to the platform\'s communications challenges.',
  level: 'intermediate',
  status: 'draft',
  domains: ['ECE'],
  trackTags: ['Signals'],
  estimatedHours: 20,
  prerequisites: [],
  skills: [
    'Signal and noise vocabulary',
    'Sampling and SNR reasoning',
    'Analog modulation analysis',
    'Digital modulation and constellation literacy',
    'BER thinking',
    'Error detection and correction basics',
  ],
  modules: [
    {
      id: 'm01',
      title: 'Signals, Sampling & Noise',
      summary: 'The communication chain, bandwidth and sampling, noise sources, SNR and dB arithmetic and the channel as a system.',
      lessons: [],
    },
    {
      id: 'm02',
      title: 'Modulation',
      summary: 'Amplitude, frequency and phase modulation, then digital schemes — ASK, FSK, PSK and QAM — with constellations and detection intuition.',
      lessons: [],
    },
    {
      id: 'm03',
      title: 'Error Detection & Correction',
      summary: 'Parity, checksums and CRCs, block code ideas, Hamming distance and minimum-distance decoding, and the retransmit-versus-correct tradeoff.',
      lessons: [],
    },
  ],
  projects: [],
  resources: [
    { label: 'Wikipedia — Modulation', url: 'https://en.wikipedia.org/wiki/Modulation', kind: 'article' },
    { label: 'Wikipedia — Error detection and correction', url: 'https://en.wikipedia.org/wiki/Error_detection_and_correction', kind: 'article' },
    { label: 'GNU Octave documentation', url: 'https://docs.octave.org/latest/', kind: 'tool' },
  ],
};
