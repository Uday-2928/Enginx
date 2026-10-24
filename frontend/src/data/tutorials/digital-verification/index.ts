import type { TutorialCourse } from '../types';

export const course: TutorialCourse = {
  id: 'digital-verification',
  title: 'Digital Design Verification',
  tagline: 'Find bugs on purpose: plans, self-checking testbenches, coverage and regressions.',
  description:
    'A practical verification course for digital designs: writing a verification plan from a specification, building self-checking testbenches, measuring coverage and running regressions, then applying the whole process to real designs such as FIFOs, arbiters and FSMs. The tone is honest about what coverage proves and what it does not.',
  level: 'intermediate',
  status: 'draft',
  domains: ['ECE'],
  trackTags: ['Verification'],
  estimatedHours: 20,
  prerequisites: ['digital-electronics', 'verilog-hdl'],
  skills: [
    'Verification planning from specs',
    'Self-checking testbench construction',
    'Stimulus generation strategy',
    'Code and functional coverage analysis',
    'Regression running and triage',
    'Bug reproduction and reporting',
  ],
  modules: [
    {
      id: 'm01',
      title: 'Verification Planning',
      summary: 'Turning a specification into features, checkers and test names, prioritizing risk and writing a plan you can actually finish.',
      lessons: [],
    },
    {
      id: 'm02',
      title: 'Self-Checking Testbenches',
      summary: 'Reference models, scoreboards, assertion-style checks, stimulus generation and building testbenches that fail loudly and correctly.',
      lessons: [],
    },
    {
      id: 'm03',
      title: 'Coverage & Regressions',
      summary: 'Code versus functional coverage, writing meaningful covergroups, closure strategy and structuring nightly regression and triage flow.',
      lessons: [],
    },
    {
      id: 'm04',
      title: 'Verifying Real Designs',
      summary: 'Applied verification walkthroughs of a FIFO, an arbiter and an FSM-heavy design, from plan to passing regression.',
      lessons: [],
    },
  ],
  projects: [],
  resources: [
    { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    { label: 'Wikipedia — Code coverage', url: 'https://en.wikipedia.org/wiki/Code_coverage', kind: 'article' },
    { label: 'Accellera UVM downloads', url: 'https://www.accellera.org/downloads/standards/uvm', kind: 'standard' },
  ],
};
