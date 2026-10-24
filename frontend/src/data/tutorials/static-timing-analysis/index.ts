import type { TutorialCourse } from '../types';

export const course: TutorialCourse = {
  id: 'static-timing-analysis',
  title: 'Static Timing Analysis',
  tagline: 'Setup and hold, constraints, exceptions and reading real timing reports.',
  description:
    'A focused course on static timing analysis: launch and capture paths, setup and hold checks, slack arithmetic, clock and I/O constraints, timing exceptions, report interpretation and clock-domain crossing hazards. The goal is independence: given a timing report and the constraints, you can explain every number in it.',
  level: 'advanced',
  status: 'draft',
  domains: ['ECE'],
  trackTags: ['VLSI', 'FPGA'],
  estimatedHours: 16,
  prerequisites: ['digital-electronics', 'verilog-hdl'],
  skills: [
    'Setup and hold check reasoning',
    'Slack and critical path arithmetic',
    'SDC-style constraint literacy',
    'Timing exception usage',
    'Timing report interpretation',
    'CDC hazard awareness',
  ],
  modules: [
    {
      id: 'm01',
      title: 'Timing Terminology & Setup/Hold',
      summary: 'Launch and capture edges, data and clock paths, setup and hold windows, slack equations and worst-case corners.',
      lessons: [],
    },
    {
      id: 'm02',
      title: 'Constraints & Exceptions',
      summary: 'Clock definitions, generated clocks, input and output delays, and when multicycle, false-path and max-delay exceptions are justified.',
      lessons: [],
    },
    {
      id: 'm03',
      title: 'Reading Timing Reports',
      summary: 'Path summaries, per-stage delays, clock skew lines, slack attribution and turning a failing report into an RTL or constraint fix.',
      lessons: [],
    },
    {
      id: 'm04',
      title: 'CDC & Common Mistakes',
      summary: 'Metastability, two-flop synchronizers, handshake and async FIFO crossing patterns, and constraint mistakes that hide real failures.',
      lessons: [],
    },
  ],
  projects: [],
  resources: [
    { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
    { label: 'Wikipedia — Clock domain crossing', url: 'https://en.wikipedia.org/wiki/Clock_domain_crossing', kind: 'article' },
    { label: 'Yosys open synthesis suite documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
  ],
};
