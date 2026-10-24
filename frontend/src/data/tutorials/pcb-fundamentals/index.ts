import type { TutorialCourse } from '../types';

export const course: TutorialCourse = {
  id: 'pcb-fundamentals',
  title: 'PCB & Hardware Debugging',
  tagline: 'Read schematics, respect power and grounding, then measure like an engineer.',
  description:
    'A practical hardware course: identifying components and reading schematics, power distribution, grounding and signal integrity, then measurement and debugging with multimeters, oscilloscopes and logic analyzers. Every technique is framed with its limits — what a measurement can and cannot prove about a circuit.',
  level: 'beginner',
  status: 'draft',
  domains: ['ECE', 'HARDWARE'],
  trackTags: ['Hardware'],
  estimatedHours: 16,
  prerequisites: [],
  skills: [
    'Component identification',
    'Schematic reading',
    'Power distribution basics',
    'Grounding and decoupling practice',
    'Oscilloscope and multimeter use',
    'Systematic hardware debugging',
  ],
  modules: [
    {
      id: 'm01',
      title: 'Components & Schematics',
      summary: 'Passives, diodes, transistors and ICs, reference designators, net names, schematic conventions and reading a real design top-down.',
      lessons: [],
    },
    {
      id: 'm02',
      title: 'Power, Grounding & SI',
      summary: 'Voltage rails and regulators, decoupling capacitors, ground loops, return currents and first-principles signal integrity awareness.',
      lessons: [],
    },
    {
      id: 'm03',
      title: 'Measurement & Debug Tools',
      summary: 'Multimeter modes and limits, oscilloscope probing and triggering, logic analyzers and a repeatable divide-and-conquer debug method.',
      lessons: [],
    },
  ],
  projects: [],
  resources: [
    { label: 'KiCad documentation', url: 'https://docs.kicad.org/', kind: 'tool' },
    { label: 'Wikipedia — Printed circuit board', url: 'https://en.wikipedia.org/wiki/Printed_circuit_board', kind: 'article' },
    { label: 'Wikipedia — Signal integrity', url: 'https://en.wikipedia.org/wiki/Signal_integrity', kind: 'article' },
  ],
};
