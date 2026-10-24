import type { TutorialCourse } from '../types';

export const course: TutorialCourse = {
  id: 'fpga-design',
  title: 'FPGA Design & Implementation',
  tagline: 'From FPGA fabric to constraints, timing reports and on-board debug.',
  description:
    'A practical FPGA course: the architecture of lookup tables, flip-flops, block RAM and routing; the RTL-to-bitstream flow; writing timing constraints and reading timing reports; guided labs; and on-board debugging with its honest limitations. Lessons assume Verilog knowledge and keep vendor-tool steps generic where tools differ.',
  level: 'intermediate',
  status: 'draft',
  domains: ['ECE'],
  trackTags: ['FPGA'],
  estimatedHours: 20,
  prerequisites: ['digital-electronics', 'verilog-hdl'],
  skills: [
    'FPGA fabric and resource literacy',
    'RTL-to-bitstream build flow',
    'Timing constraint writing',
    'Timing report interpretation',
    'On-chip debug instrumentation',
    'Board-level bring-up discipline',
  ],
  modules: [
    {
      id: 'm01',
      title: 'FPGA Architecture',
      summary: 'LUTs, flip-flops, carry chains, block RAM, DSP slices, clocking resources and I/O blocks — what your RTL becomes on the fabric.',
      lessons: [],
    },
    {
      id: 'm02',
      title: 'RTL-to-Bitstream Flow',
      summary: 'Synthesis, translation, placement, routing and bitstream generation, plus how to read each stage\'s warnings and utilization output.',
      lessons: [],
    },
    {
      id: 'm03',
      title: 'Constraints & Timing Reports',
      summary: 'Clock definitions, input and output delays, false paths, and reading setup and hold slack in static timing reports.',
      lessons: [],
    },
    {
      id: 'm04',
      title: 'Guided FPGA Labs',
      summary: 'Step-by-step labs from blinking an LED through counters, FSMs and a small system, with simulator-first verification habits.',
      lessons: [],
    },
    {
      id: 'm05',
      title: 'On-Board Debug & Limitations',
      summary: 'ILA-style instrumentation, reset and clock bring-up, common board failures and what cannot be debugged without external instruments.',
      lessons: [],
    },
  ],
  projects: [],
  resources: [
    { label: 'Wikipedia — Field-programmable gate array', url: 'https://en.wikipedia.org/wiki/Field-programmable_gate_array', kind: 'article' },
    { label: 'Yosys open synthesis suite documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
    { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
  ],
};
