import type { TutorialCourse } from '../types';

import { module01Lessons } from './module-01';
import { module02Lessons } from './module-02';
import { module03Lessons } from './module-03';
import { module04Lessons } from './module-04';
import { module05Lessons } from './module-05';
import { module06Lessons } from './module-06';
import { module07Lessons } from './module-07';
import { module08Lessons } from './module-08';
import { module09Lessons } from './module-09';
import { module10Lessons } from './module-10';
import { module11Lessons } from './module-11';
import { rtlDesignProjects } from './projects';

export const course: TutorialCourse = {
  id: 'rtl-design',
  title: 'RTL Design Methodology',
  tagline: 'Turn specifications into clean, timing-aware register-transfer-level designs.',
  description:
    'A methodology course for register-transfer-level design: translating specifications into architecture, coding standards that survive review, datapath and control partitioning, pipelining, clocking and reset strategy, timing-aware coding, lint-clean RTL and synthesis awareness. The capstone module assembles a complete RTL block end to end.',
  level: 'intermediate',
  status: 'published',
  domains: ['ECE'],
  trackTags: ['VLSI', 'FPGA', 'Digital Design'],
  estimatedHours: 24,
  prerequisites: ['digital-electronics', 'verilog-hdl'],
  skills: [
    'Specification-to-architecture translation',
    'RTL coding standards',
    'Datapath and control partitioning',
    'Pipelining and retiming basics',
    'Clock and reset strategy',
    'Lint-clean, synthesis-aware RTL',
  ],
  modules: [
    {
      id: 'm01',
      title: 'RTL Fundamentals',
      summary:
        'The register-transfer abstraction (registers + clouds + clocked transfers), where RTL sits among behavioural and gate-level descriptions, and the spec-to-verified-RTL design loop.',
      lessons: module01Lessons,
    },
    {
      id: 'm02',
      title: 'Specification to Architecture',
      summary:
        'Reading a specification like a designer, building the block diagram/register map/timing expectations for the running example (a programmable interval timer), and freezing decisions with a decision log.',
      lessons: module02Lessons,
    },
    {
      id: 'm03',
      title: 'RTL Coding Methodology',
      summary:
        'The clocked-process and combinational-process templates, latch avoidance, and the naming/structure/reuse conventions used across the rest of the course.',
      lessons: module03Lessons,
    },
    {
      id: 'm04',
      title: 'Datapath Design',
      summary:
        'Datapath building blocks, width growth / wrap / signedness discipline, saturation, and the resource-sharing vs duplication decision.',
      lessons: module04Lessons,
    },
    {
      id: 'm05',
      title: 'Control Logic',
      summary:
        'The two-process FSM template, Moore vs Mealy outputs, robust state machines with error states, and the control-datapath contract with valid/ready handshakes.',
      lessons: module05Lessons,
    },
    {
      id: 'm06',
      title: 'Pipelining',
      summary:
        'Why pipelines exist (path budgets and register boundaries), building a 2-stage pipeline with latency/throughput accounting, and stalls, backpressure and flushes.',
      lessons: module06Lessons,
    },
    {
      id: 'm07',
      title: 'Clocking & Reset Strategy',
      summary:
        'Reset choices and the hybrid assert/deassert pattern, clock enables vs gated and derived clocks, and CDC concepts: metastability, 2-FF synchronizers, gray code and handshakes.',
      lessons: module07Lessons,
    },
    {
      id: 'm08',
      title: 'Timing-Aware RTL',
      summary:
        'Slack arithmetic and the critical path, reading a timing report, and the RTL fix catalogue: pipelining, tree restructuring, operator balancing, registered outputs.',
      lessons: module08Lessons,
    },
    {
      id: 'm09',
      title: 'RTL Quality & Lint',
      summary:
        'The lint categories that find real bugs, code that survives review (10-point checklist), and self-checking testbenches with a regression mindset.',
      lessons: module09Lessons,
    },
    {
      id: 'm10',
      title: 'Synthesis Awareness',
      summary:
        'What synthesis does with RTL (inference rules, operator mapping, optimization), FSM synthesis and re-encoding, and the honest limits of RTL-time prediction.',
      lessons: module10Lessons,
    },
    {
      id: 'm11',
      title: 'Capstone RTL Project',
      summary:
        'The complete specification-to-verified-RTL walkthrough of the module-02 interval timer: freeze, full RTL, verification and closure.',
      lessons: module11Lessons,
    },
  ],
  projects: rtlDesignProjects,
  resources: [
    {
      label: 'Wikipedia — Register-transfer level',
      url: 'https://en.wikipedia.org/wiki/Register-transfer_level',
      kind: 'article',
    },
    {
      label: 'Yosys open synthesis suite documentation',
      url: 'https://yosyshq.readthedocs.io/',
      kind: 'tool',
    },
    {
      label: 'Wikipedia — Electronic design automation',
      url: 'https://en.wikipedia.org/wiki/Electronic_design_automation',
      kind: 'article',
    },
    {
      label: 'Icarus Verilog documentation',
      url: 'https://steveicarus.github.io/iverilog/',
      kind: 'tool',
    },
  ],
};
