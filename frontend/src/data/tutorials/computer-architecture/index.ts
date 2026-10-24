import type { TutorialCourse } from '../types';

export const course: TutorialCourse = {
  id: 'computer-architecture',
  title: 'Computer Architecture & Microprocessors',
  tagline: 'Instruction sets, caches, pipelines and buses — how processors really run code.',
  description:
    'A computer architecture course for hardware and software engineers: instruction set fundamentals, the memory hierarchy and caches, pipelining hazards and instruction-level parallelism, and interfacing with buses and peripherals. Concepts are tied back to RTL thinking so the material connects with the digital design tracks.',
  level: 'intermediate',
  status: 'draft',
  domains: ['ECE', 'CSE'],
  trackTags: ['Architecture'],
  estimatedHours: 24,
  prerequisites: [],
  skills: [
    'Instruction set and ISA literacy',
    'Datapath and control reasoning',
    'Cache organization and analysis',
    'Pipeline hazard analysis',
    'Memory hierarchy performance math',
    'Bus and I/O interfacing concepts',
  ],
  modules: [
    {
      id: 'm01',
      title: 'CPU Fundamentals',
      summary: 'Instructions, registers and addressing modes, the fetch-decode-execute cycle, single-cycle datapath and control unit basics.',
      lessons: [],
    },
    {
      id: 'm02',
      title: 'Memory Hierarchy & Cache',
      summary: 'Locality, cache organization, mapping policies, replacement, write policies and cache performance calculations.',
      lessons: [],
    },
    {
      id: 'm03',
      title: 'Pipelining & Instruction-Level Parallelism',
      summary: 'The classic five-stage pipeline, data and control hazards, forwarding and stalls, superscalar ideas and branch prediction basics.',
      lessons: [],
    },
    {
      id: 'm04',
      title: 'Interfacing & Buses',
      summary: 'Bus protocols, memory-mapped I/O, interrupts versus polling, DMA and the interface between CPU cores and the outside world.',
      lessons: [],
    },
  ],
  projects: [],
  resources: [
    { label: 'Wikipedia — Computer architecture', url: 'https://en.wikipedia.org/wiki/Computer_architecture', kind: 'article' },
    { label: 'Wikipedia — CPU cache', url: 'https://en.wikipedia.org/wiki/CPU_cache', kind: 'article' },
    { label: 'Wikipedia — Instruction pipelining', url: 'https://en.wikipedia.org/wiki/Instruction_pipelining', kind: 'article' },
  ],
};
