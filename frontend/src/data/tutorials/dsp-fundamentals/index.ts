import type { TutorialCourse } from '../types';

export const course: TutorialCourse = {
  id: 'dsp-fundamentals',
  title: 'Digital Signal Processing',
  tagline: 'Sampling, difference equations, convolution, the DFT/FFT and fixed-point reality.',
  description:
    'A foundations-first DSP course: discrete signals and sampling, difference equations and filter behavior, convolution and the DFT/FFT, and fixed-point implementation concerns. Lessons keep the math explicit with MATLAB-compatible and Octave-friendly examples, and connect directly to the platform\'s MATLAB signal challenges.',
  level: 'intermediate',
  status: 'draft',
  domains: ['ECE'],
  trackTags: ['Signals'],
  estimatedHours: 22,
  prerequisites: [],
  skills: [
    'Sampling and aliasing analysis',
    'Difference equation reasoning',
    'FIR and IIR filter concepts',
    'Convolution computation',
    'DFT and FFT interpretation',
    'Fixed-point arithmetic tradeoffs',
  ],
  modules: [
    {
      id: 'm01',
      title: 'Signals & Sampling',
      summary: 'Discrete-time signals, the sampling theorem, aliasing and folding, quantization and reconstructing the underlying story from samples.',
      lessons: [],
    },
    {
      id: 'm02',
      title: 'Difference Equations & Filters',
      summary: 'LTI systems via difference equations, impulse response, FIR and IIR structures, stability and reading filter specifications.',
      lessons: [],
    },
    {
      id: 'm03',
      title: 'Convolution & DFT/FFT',
      summary: 'Linear convolution mechanics, circular convolution, the DFT, FFT bin spacing and interpreting magnitude spectra correctly.',
      lessons: [],
    },
    {
      id: 'm04',
      title: 'Fixed-Point & Implementation',
      summary: 'Fixed-point number systems, quantization error, coefficient sensitivity, overflow behavior and moving an algorithm from floats to fixed point.',
      lessons: [],
    },
  ],
  projects: [],
  resources: [
    { label: 'The Scientist and Engineer\'s Guide to DSP', url: 'https://www.dspguide.com/', kind: 'docs' },
    { label: 'Wikipedia — Digital signal processing', url: 'https://en.wikipedia.org/wiki/Digital_signal_processing', kind: 'article' },
    { label: 'GNU Octave documentation', url: 'https://docs.octave.org/latest/', kind: 'tool' },
  ],
};
