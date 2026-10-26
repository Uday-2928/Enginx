import type { TutorialCourse } from '../types';

import { module01Lessons } from './module-01';
import { module02Lessons } from './module-02';
import { module03Lessons } from './module-03';
import { module04Lessons } from './module-04';
import { staticTimingAnalysisProjects } from './projects';

export const course: TutorialCourse = {
  id: 'static-timing-analysis',
  title: 'Static Timing Analysis',
  tagline: 'Setup and hold, constraints, exceptions and reading real timing reports.',
  description:
    'A focused course on static timing analysis: launch and capture paths, setup and hold checks, slack arithmetic, clock and I/O constraints, timing exceptions, report interpretation and clock-domain crossing hazards. Every example uses hand-checkable numbers and synthetic reports clearly labeled as teaching artifacts, so the skill you build is the one that matters: given a timing report and the constraints, you can explain every number in it.',
  level: 'advanced',
  status: 'published',
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
      summary: 'Launch and capture edges, data and clock paths, setup and hold windows, slack equations, uncertainty, corners and reset timing.',
      lessons: module01Lessons,
    },
    {
      id: 'm02',
      title: 'Constraints & Exceptions',
      summary: 'Clock definitions, generated clocks, input and output delays, and when multicycle, false-path exceptions are justified — and when they are catastrophic.',
      lessons: module02Lessons,
    },
    {
      id: 'm03',
      title: 'Reading Timing Reports',
      summary: 'Path anatomy, per-stage delays, slack attribution, negative-slack diagnosis and fixes, and why "meets timing" is constraint-relative.',
      lessons: module03Lessons,
    },
    {
      id: 'm04',
      title: 'CDC & Common Mistakes',
      summary: 'Metastability, two-flop synchronizers, gray code, handshakes and async FIFOs, plus the constraint-mistake catalogue and the FPGA report bridge.',
      lessons: module04Lessons,
    },
  ],
  projects: staticTimingAnalysisProjects,
  resources: [
    { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
    { label: 'Wikipedia — Clock domain crossing', url: 'https://en.wikipedia.org/wiki/Clock_domain_crossing', kind: 'article' },
    { label: 'Yosys open synthesis suite documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
  ],
};
