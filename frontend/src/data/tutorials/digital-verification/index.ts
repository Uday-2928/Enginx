import type { TutorialCourse } from '../types';

import { module01Lessons } from './module-01';
import { module02Lessons } from './module-02';
import { module03Lessons } from './module-03';
import { module04Lessons } from './module-04';
import { digitalVerificationProjects } from './projects';

export const course: TutorialCourse = {
  id: 'digital-verification',
  title: 'Digital Design Verification',
  tagline: 'Find bugs on purpose: plans, self-checking testbenches, coverage and regressions.',
  description:
    'A practical verification course for digital designs: writing a verification plan from a specification, building self-checking testbenches, measuring coverage and running regressions, then applying the whole process to real designs such as FIFOs, register blocks and UART transmitters. The tone is honest about what coverage proves and what it does not. Testbench code is portable Verilog-2001 that runs on Icarus Verilog, the same simulator the platform grader uses.',
  level: 'intermediate',
  status: 'published',
  domains: ['ECE'],
  trackTags: ['Verification'],
  estimatedHours: 20,
  prerequisites: ['digital-electronics', 'verilog-hdl'],
  skills: [
    'Verification planning from specs',
    'Self-checking testbench construction',
    'Reference models and scoreboards',
    'Register-interface verification',
    'Code and functional coverage analysis',
    'Regression running and triage',
  ],
  modules: [
    {
      id: 'm01',
      title: 'Verification Planning',
      summary: 'Turning a specification into features, checkers and test names, prioritizing risk and writing a plan you can actually finish.',
      lessons: module01Lessons,
    },
    {
      id: 'm02',
      title: 'Self-Checking Testbenches',
      summary: 'Reference models, scoreboards, assertion-style checks, stimulus generation and building testbenches that fail loudly and correctly.',
      lessons: module02Lessons,
    },
    {
      id: 'm03',
      title: 'Coverage & Regressions',
      summary: 'Code versus functional coverage, writing meaningful covergroups, closure strategy and structuring nightly regression and triage flow.',
      lessons: module03Lessons,
    },
    {
      id: 'm04',
      title: 'Verifying Real Designs',
      summary: 'Applied verification walkthroughs of a synchronous FIFO, a register block and a UART transmitter, plus parameter-sweep verification.',
      lessons: module04Lessons,
    },
  ],
  projects: digitalVerificationProjects,
  resources: [
    { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    { label: 'Wikipedia — Code coverage', url: 'https://en.wikipedia.org/wiki/Code_coverage', kind: 'article' },
    { label: 'Accellera UVM downloads', url: 'https://www.accellera.org/downloads/standards/uvm', kind: 'standard' },
  ],
};
