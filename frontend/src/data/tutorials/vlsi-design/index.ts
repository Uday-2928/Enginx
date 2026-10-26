import type { TutorialCourse } from '../types';
import { module01Lessons } from './module-01';
import { module02Lessons } from './module-02';
import { module03Lessons } from './module-03';
import { module04Lessons } from './module-04';
import { vlsiProjects } from './projects';

export const course: TutorialCourse = {
  id: 'vlsi-design',
  title: 'VLSI & ASIC Design Flow',
  tagline: 'CMOS fundamentals through synthesis, physical design and sign-off.',
  description:
    'An end-to-end ASIC literacy course: CMOS device and gate fundamentals, synthesis and technology libraries, the physical design flow from floorplanning through routing, and verification and sign-off concepts. Each stage explains its inputs, outputs and quality gates so the flow reads as a connected pipeline rather than isolated buzzwords.',
  level: 'advanced',
  status: 'published',
  domains: ['ECE'],
  trackTags: ['VLSI'],
  estimatedHours: 24,
  prerequisites: ['digital-electronics', 'verilog-hdl'],
  skills: [
    'CMOS gate and device fundamentals',
    'Logic synthesis concepts',
    'Technology library literacy',
    'Physical design flow stages',
    'Verification and sign-off vocabulary',
    'Open-source flow awareness',
  ],
  modules: [
    {
      id: 'm01',
      title: 'IC & CMOS Fundamentals',
      summary: 'MOSFET switch behavior, CMOS logic construction, inverter characteristics, power components and standard cells.',
      lessons: module01Lessons,
    },
    {
      id: 'm02',
      title: 'Synthesis & Technology Libraries',
      summary: 'RTL to netlist, library cells and timing models, constraints driving synthesis, and reading area and timing results.',
      lessons: module02Lessons,
    },
    {
      id: 'm03',
      title: 'Physical Design Flow',
      summary: 'Floorplanning, power planning, placement, clock tree synthesis, routing and physical verification in the standard flow order.',
      lessons: module03Lessons,
    },
    {
      id: 'm04',
      title: 'Verification & Sign-off',
      summary: 'Simulation, static timing, formal equivalence, DRC and LVS roles in sign-off, and how tapeout readiness is actually judged.',
      lessons: module04Lessons,
    },
  ],
  projects: vlsiProjects,
  resources: [
    { label: 'Wikipedia — Very-large-scale integration', url: 'https://en.wikipedia.org/wiki/Very_Large_Scale_Integration', kind: 'article' },
    { label: 'Yosys open synthesis suite documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
    { label: 'OpenROAD flow', url: 'https://theopenroadproject.org/', kind: 'tool' },
  ],
};
