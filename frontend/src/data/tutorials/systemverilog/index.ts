import type { TutorialCourse } from '../types';

export const course: TutorialCourse = {
  id: 'systemverilog',
  title: 'SystemVerilog for Design & Verification',
  tagline: 'Modern types, OOP testbenches, constrained randomization, SVA and UVM.',
  description:
    'The bridge from Verilog to modern SystemVerilog: structured data types, interfaces, object-oriented testbench fundamentals, constrained-random stimulus, functional coverage, SystemVerilog Assertions and a grounded overview of the UVM methodology. Concepts are introduced honestly — what the standard provides versus what a tool environment must support.',
  level: 'advanced',
  status: 'draft',
  domains: ['ECE'],
  trackTags: ['Verification', 'VLSI'],
  estimatedHours: 26,
  prerequisites: ['digital-electronics', 'verilog-hdl'],
  skills: [
    'SystemVerilog data types and structs',
    'Interfaces and modports',
    'Class-based testbench construction',
    'Constrained-random stimulus',
    'Functional coverage modelling',
    'SystemVerilog Assertions basics',
  ],
  modules: [
    {
      id: 'm01',
      title: 'From Verilog to SystemVerilog',
      summary: 'What SystemVerilog adds over Verilog, design versus verification subsets, tool and standard versions and migrating existing RTL.',
      lessons: [],
    },
    {
      id: 'm02',
      title: 'Data Types & Structured Design',
      summary: 'logic, typedefs, enums, structs, packed and unpacked arrays, casting and always_ff/always_comb for clearer intent.',
      lessons: [],
    },
    {
      id: 'm03',
      title: 'Procedural Blocks & Interfaces',
      summary: 'always_comb, always_ff and always_latch semantics, interface bundles, modports and connecting testbenches through interfaces.',
      lessons: [],
    },
    {
      id: 'm04',
      title: 'OOP Testbench Fundamentals',
      summary: 'Classes, objects, inheritance and polymorphism, transactions, drivers and monitors, and the structure of a layered testbench.',
      lessons: [],
    },
    {
      id: 'm05',
      title: 'Constrained-Random & Coverage Concepts',
      summary: 'randomize() and constraints, constraint solving basics, coverage groups and bins, and closing coverage with directed tests.',
      lessons: [],
    },
    {
      id: 'm06',
      title: 'Assertions & UVM Overview',
      summary: 'Immediate and concurrent assertions, sequences and properties, and an honest map of UVM components without claiming a full UVM course.',
      lessons: [],
    },
  ],
  projects: [],
  resources: [
    { label: 'Accellera SystemVerilog and UVM downloads', url: 'https://www.accellera.org/downloads/standards/uvm', kind: 'standard' },
    { label: 'Wikipedia — SystemVerilog', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
    { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
  ],
};
