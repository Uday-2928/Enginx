import type { TutorialCourse } from '../types';
import { module01Lessons } from './module-01';
import { module02Lessons } from './module-02';
import { module03Lessons } from './module-03';
import { module04Lessons } from './module-04';
import { module05Lessons } from './module-05';
import { module06Lessons } from './module-06';
import { module07Lessons } from './module-07';
import { module08Lessons } from './module-08';
import { digitalElectronicsProjects } from './projects';

export const course: TutorialCourse = {
  id: 'digital-electronics',
  title: 'Digital Electronics & Logic Design',
  tagline: 'From binary and gates to flip-flops and finite-state machines.',
  description:
    'A ground-up course in digital logic: number systems, Boolean algebra, combinational and sequential building blocks, finite-state machines and hardware timing. Every concept is taught with truth tables, timing reasoning and design practice that later feeds directly into the Verilog, RTL and VLSI tracks.',
  level: 'beginner',
  status: 'published',
  domains: ['ECE'],
  trackTags: ['Digital Design', 'FPGA', 'VLSI'],
  estimatedHours: 24,
  prerequisites: [],
  skills: [
    'Binary and hexadecimal arithmetic',
    "Two's-complement signed arithmetic",
    'Boolean algebra and Karnaugh maps',
    'Combinational circuit design',
    'Sequential circuit design',
    'Finite-state machine modelling',
    'Timing diagram reading and slack analysis',
  ],
  modules: [
    {
      id: 'm01',
      title: 'Introduction to Digital Electronics',
      summary:
        'Why digital systems dominate hardware: discrete voltage levels, noise margins, and the abstraction ladder from transistors to processors.',
      lessons: module01Lessons,
    },
    {
      id: 'm02',
      title: 'Number Systems',
      summary:
        "Binary, octal, decimal and hexadecimal representations, radix conversion, binary arithmetic, signed two's-complement arithmetic and fixed-width values with binary fractions.",
      lessons: module02Lessons,
    },
    {
      id: 'm03',
      title: 'Logic Gates',
      summary:
        'AND, OR, NOT, NAND, NOR, XOR and XNOR behavior, truth tables, universal-gate construction, gate-network tracing and a first structural Verilog module.',
      lessons: module03Lessons,
    },
    {
      id: 'm04',
      title: 'Boolean Algebra & Karnaugh Maps',
      summary:
        "Boolean identities, De Morgan's theorems, sum-of-products and product-of-sums forms, and two-to-four-variable Karnaugh map minimization with don't cares.",
      lessons: module04Lessons,
    },
    {
      id: 'm05',
      title: 'Combinational Circuits',
      summary:
        'Design and analysis of adders, subtractors, multiplexers, decoders, encoders, comparators, parity circuits and the ALU — each with truth table, equations and a Verilog example.',
      lessons: module05Lessons,
    },
    {
      id: 'm06',
      title: 'Sequential Circuits',
      summary:
        'SR and D latches, D/JK/T flip-flops with clocking and reset, registers and shift registers, and ripple versus synchronous counters.',
      lessons: module06Lessons,
    },
    {
      id: 'm07',
      title: 'FSM Fundamentals',
      summary:
        'Moore and Mealy state machines, state diagrams, state tables, state encoding and complete worked designs: a 1011 sequence detector and a traffic-light controller.',
      lessons: module07Lessons,
    },
    {
      id: 'm08',
      title: 'Hardware Timing Basics',
      summary:
        'Clock period and propagation delay, setup and hold windows with worked slack calculations, timing-diagram reading and the timing-closure workflow that bridges to static timing analysis.',
      lessons: module08Lessons,
    },
  ],
  projects: digitalElectronicsProjects,
  resources: [
    { label: 'All About Circuits — Digital textbook (Vol. IV)', url: 'https://www.allaboutcircuits.com/textbook/digital/', kind: 'docs' },
    { label: 'Electronics Tutorials — Logic gates', url: 'https://www.electronics-tutorials.ws/logic/logic-gates.html', kind: 'article' },
    { label: 'Wikipedia — Logic gate', url: 'https://en.wikipedia.org/wiki/Logic_gate', kind: 'article' },
  ],
};
