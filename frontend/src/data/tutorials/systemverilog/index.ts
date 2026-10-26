import type { TutorialCourse } from '../types';

import { module01Lessons } from './module-01';
import { module02Lessons } from './module-02';
import { module03Lessons } from './module-03';
import { module04Lessons } from './module-04';
import { module05Lessons } from './module-05';
import { module06Lessons } from './module-06';
import { projects } from './projects';

export const course: TutorialCourse = {
  id: 'systemverilog',
  title: 'SystemVerilog for Design & Verification',
  tagline: 'Modern types, OOP testbenches, constrained randomization, SVA and UVM.',
  description:
    'The bridge from Verilog to modern SystemVerilog: structured data types, interfaces, object-oriented testbench fundamentals, constrained-random stimulus, functional coverage, SystemVerilog Assertions and a grounded overview of the UVM methodology. Concepts are introduced honestly — what the standard provides versus what a tool environment must support, including what the EnginX grader (Icarus Verilog) can and cannot run.',
  level: 'advanced',
  status: 'published',
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
      lessons: module01Lessons,
    },
    {
      id: 'm02',
      title: 'Data Types & Structured Design',
      summary: 'logic, typedefs, enums, structs, packed and unpacked arrays, casting and packages for clearer intent and shared types.',
      lessons: module02Lessons,
    },
    {
      id: 'm03',
      title: 'Procedural Blocks & Interfaces',
      summary: 'always_comb, always_ff and always_latch semantics, interface bundles, modports and connecting testbenches through interfaces.',
      lessons: module03Lessons,
    },
    {
      id: 'm04',
      title: 'OOP Testbench Fundamentals',
      summary: 'Classes, objects, inheritance-ready handles, transactions, drivers and monitors, virtual interfaces and the structure of a layered testbench.',
      lessons: module04Lessons,
    },
    {
      id: 'm05',
      title: 'Constrained-Random & Coverage Concepts',
      summary: 'randomize() and constraints, constraint solving basics, coverage groups and bins, and closing coverage with directed tests.',
      lessons: module05Lessons,
    },
    {
      id: 'm06',
      title: 'Assertions & UVM Overview',
      summary: 'Immediate and concurrent assertions, sequences and properties, bind, and an honest map of UVM components without claiming a full UVM course.',
      lessons: module06Lessons,
    },
  ],
  projects,
  resources: [
    { label: 'Accellera SystemVerilog and UVM downloads', url: 'https://www.accellera.org/downloads/standards/uvm', kind: 'standard' },
    { label: 'Wikipedia — SystemVerilog', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
    { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
  ],
};
