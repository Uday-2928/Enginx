import type { TutorialCourse, TutorialModule } from '../types';
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
import { module12Lessons } from './module-12';
import { module13Lessons } from './module-13';
import { module14Lessons } from './module-14';
import { module15Lessons } from './module-15';
import { module16Lessons } from './module-16';
import { verilogHdlProjects } from './projects';

function buildModule(
  id: string,
  title: string,
  summary: string,
  lessons: TutorialModule['lessons'],
): TutorialModule {
  return { id, title, summary, lessons };
}

export const course: TutorialCourse = {
  id: 'verilog-hdl',
  title: 'Complete Verilog HDL',
  tagline: 'Write synthesizable Verilog from your first module to full testbenches.',
  description:
    'A complete journey through Verilog HDL: module structure, data types, operators, continuous and procedural assignments, blocking versus nonblocking semantics, combinational and sequential design, FSMs, memories, parameterized generate blocks, testbenches and the synthesis mistakes that produce accidental latches. Every lesson is written with synthesis and timing consequences in mind.',
  level: 'intermediate',
  status: 'published',
  domains: ['ECE'],
  trackTags: ['FPGA', 'VLSI', 'Digital Design'],
  estimatedHours: 30,
  prerequisites: ['digital-electronics'],
  skills: [
    'Writing synthesizable Verilog modules',
    'Blocking vs nonblocking assignment discipline',
    'Combinational and sequential RTL design',
    'Finite-state machine coding',
    'Testbench writing and simulation',
    'Avoiding latches and synthesis traps',
  ],
  modules: [
    buildModule(
      'm01',
      'Introduction to Verilog',
      'What a hardware description language describes, simulation versus synthesis, design hierarchy and the Verilog tool flow.',
      module01Lessons,
    ),
    buildModule(
      'm02',
      'Module Structure',
      'Module declarations, ports and directions, port styles, instantiation, hierarchical naming and top-level design organization.',
      module02Lessons,
    ),
    buildModule(
      'm03',
      'Data Types & Values',
      'wire and reg, vectors, the four-valued 0/1/x/z system, parameter and localparam, signed arithmetic and memory declarations.',
      module03Lessons,
    ),
    buildModule(
      'm04',
      'Operators',
      'Arithmetic, bitwise, reduction, logical, shift, relational, equality and concatenation operators with width-extension rules.',
      module04Lessons,
    ),
    buildModule(
      'm05',
      'Continuous Assignments',
      'assign statements, dataflow modelling, conditional and multiplication operators in assignments, and combinational always blocks as an alternative.',
      module05Lessons,
    ),
    buildModule(
      'm06',
      'Procedural Blocks',
      'initial and always blocks, sensitivity lists, begin/end sequencing, blocking and nonblocking assignment mechanics.',
      module06Lessons,
    ),
    buildModule(
      'm07',
      'Blocking vs Nonblocking',
      'Simulation semantics of = and <=, race conditions, the synthesis-safe coding rules and why mixing styles in one block creates bugs.',
      module07Lessons,
    ),
    buildModule(
      'm08',
      'Combinational Design',
      'Coding multiplexers, decoders, adders and ALU slices with always @* blocks and avoiding incomplete sensitivity lists.',
      module08Lessons,
    ),
    buildModule(
      'm09',
      'Sequential Design',
      'Flip-flops and registers with always @(posedge clk), synchronous and asynchronous resets, enables and clock-enable patterns.',
      module09Lessons,
    ),
    buildModule(
      'm10',
      'Counters & Registers',
      'Binary, Johnson and ring counters, shift registers, load/clear enables and counter rollover and comparison patterns.',
      module10Lessons,
    ),
    buildModule(
      'm11',
      'Finite-State Machines',
      'Two-process and three-process FSM styles, state encoding, Moore and Mealy outputs, and safe FSM design with default assignments.',
      module11Lessons,
    ),
    buildModule(
      'm12',
      'Memories & Arrays',
      'Register arrays, RAM and ROM modelling, address decoding, initialization and inferring block versus distributed memory.',
      module12Lessons,
    ),
    buildModule(
      'm13',
      'Functions, Tasks, Parameters & Generate',
      'Reusable combinational logic with functions, simulation helpers with tasks, parameterized modules and generate loops and conditionals.',
      module13Lessons,
    ),
    buildModule(
      'm14',
      'Testbenches & Simulation',
      'Stimulus generation, clock and reset generation, self-checking testbenches, $display and waveform-based debugging flow.',
      module14Lessons,
    ),
    buildModule(
      'm15',
      'Latches & Synthesis Mistakes',
      'How incomplete if and case statements infer latches, combinational loops, width mismatches, simulation-synthesis mismatch causes.',
      module15Lessons,
    ),
    buildModule(
      'm16',
      'RTL Projects',
      'Capstone module that assembles counters, FSMs, datapath elements and testbenches into complete, reviewable RTL designs.',
      module16Lessons,
    ),
  ],
  projects: verilogHdlProjects,
  resources: [
    { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    { label: 'Yosys open synthesis suite documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
    { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
  ],
};
