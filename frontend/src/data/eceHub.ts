import type { EceLevel, EcePreferences, User } from '../types';

export type EceHubSection =
  | 'dashboard'
  | 'roadmaps'
  | 'tutorials'
  | 'fundamentals'
  | 'vlsi'
  | 'embedded'
  | 'digital'
  | 'analog'
  | 'semiconductor'
  | 'verilog'
  | 'fpga'
  | 'verification'
  | 'physical-design'
  | 'pcb'
  | 'signals'
  | 'dsp'
  | 'communications'
  | 'rf'
  | 'antennas'
  | 'electromagnetics'
  | 'control'
  | 'instrumentation'
  | 'iot'
  | 'debugging'
  | 'playground'
  | 'calculations'
  | 'labs'
  | 'virtual-lab'
  | 'challenges'
  | 'assessments'
  | 'contests'
  | 'interviews'
  | 'resources'
  | 'careers'
  | 'skills'
  | 'portfolio'
  | 'community'
  | 'bookmarks'
  | 'settings';

export interface EceNavItem {
  id: EceHubSection;
  label: string;
  group: 'workspace' | 'disciplines' | 'practice' | 'career' | 'account';
  icon: string;
  description: string;
}

export const ECE_NAV_ITEMS: EceNavItem[] = [
  { id: 'dashboard', label: 'ECE Dashboard', group: 'workspace', icon: 'dashboard', description: 'Your next lesson, challenge and verified progress.' },
  { id: 'roadmaps', label: 'Learning roadmaps', group: 'workspace', icon: 'roadmap', description: 'Dependency-aware learning paths.' },
  { id: 'tutorials', label: 'Engineering Tutorials', group: 'workspace', icon: 'graduation', description: 'Assessment-gated course lessons with durable completion.' },
  { id: 'fundamentals', label: 'Hardware fundamentals', group: 'workspace', icon: 'logic', description: 'Electrical basics, digital signals, binary and logic gates.' },
  { id: 'vlsi', label: 'VLSI engineering', group: 'disciplines', icon: 'chip', description: 'RTL, verification, timing and physical design.' },
  { id: 'embedded', label: 'Embedded systems', group: 'disciplines', icon: 'cpu', description: 'C, peripherals, protocols and real-time systems.' },
  { id: 'digital', label: 'Digital electronics', group: 'disciplines', icon: 'logic', description: 'Boolean logic, timing and state machines.' },
  { id: 'analog', label: 'Analog electronics', group: 'disciplines', icon: 'wave', description: 'Devices, amplifiers, filters and power.' },
  { id: 'semiconductor', label: 'Semiconductor devices', group: 'disciplines', icon: 'layers', description: 'PN junctions, MOSFETs and CMOS foundations.' },
  { id: 'verilog', label: 'Verilog & SystemVerilog', group: 'disciplines', icon: 'code', description: 'Synthesizable HDL and verification practice.' },
  { id: 'fpga', label: 'FPGA development', group: 'disciplines', icon: 'board', description: 'Constraints, resources and hardware flow.' },
  { id: 'verification', label: 'Design verification', group: 'disciplines', icon: 'check', description: 'Testbenches, assertions and coverage.' },
  { id: 'physical-design', label: 'Physical design', group: 'disciplines', icon: 'layout', description: 'Floorplan, placement, CTS and routing concepts.' },
  { id: 'pcb', label: 'PCB design', group: 'disciplines', icon: 'board', description: 'Schematic, layout, DRC and manufacturing outputs.' },
  { id: 'signals', label: 'Signals & systems', group: 'disciplines', icon: 'wave', description: 'LTI systems, transforms and sampling.' },
  { id: 'dsp', label: 'Digital signal processing', group: 'disciplines', icon: 'signal', description: 'DFT, FFT, filters and fixed-point thinking.' },
  { id: 'communications', label: 'Communications', group: 'disciplines', icon: 'radio', description: 'Modulation, BER, noise and channel models.' },
  { id: 'rf', label: 'RF & microwave', group: 'disciplines', icon: 'antenna', description: 'Transmission lines, matching and S-parameters.' },
  { id: 'antennas', label: 'Antennas & propagation', group: 'disciplines', icon: 'antenna', description: 'Radiation, link budgets and propagation.' },
  { id: 'electromagnetics', label: 'Electromagnetics', group: 'disciplines', icon: 'field', description: 'Fields, waves and Maxwell foundations.' },
  { id: 'control', label: 'Control systems', group: 'disciplines', icon: 'control', description: 'Stability, response, PID and state space.' },
  { id: 'instrumentation', label: 'Instrumentation & sensors', group: 'disciplines', icon: 'sensor', description: 'Measurement, calibration and acquisition.' },
  { id: 'iot', label: 'IoT & connected devices', group: 'disciplines', icon: 'network', description: 'Telemetry, identity, power and recovery.' },
  { id: 'debugging', label: 'Hardware debugging', group: 'practice', icon: 'debug', description: 'Use logs, scopes and probes with discipline.' },
  { id: 'playground', label: 'Logic gate playground', group: 'practice', icon: 'logic', description: 'Simulate supported two-state gates and a half adder.' },
  { id: 'calculations', label: 'Engineering calculations', group: 'practice', icon: 'calculator', description: 'Unit-aware calculators with explicit assumptions.' },
  { id: 'labs', label: 'Projects & virtual labs', group: 'practice', icon: 'lab', description: 'Guided experiments with honest limitations.' },
  { id: 'virtual-lab', label: 'Virtual Hardware Lab', group: 'practice', icon: 'hardware-lab', description: 'Build circuits, connect pins and run a supported hardware simulation.' },
  { id: 'challenges', label: 'Practice challenges', group: 'practice', icon: 'code', description: 'Open the real evaluated challenge workspace.' },
  { id: 'assessments', label: 'Assessments & exams', group: 'practice', icon: 'assessment', description: 'Revision queues and measurable checks.' },
  { id: 'contests', label: 'Contests & leaderboards', group: 'practice', icon: 'trophy', description: 'Verified results only; no invented rankings.' },
  { id: 'interviews', label: 'Interview preparation', group: 'career', icon: 'interview', description: 'Role-specific technical revision.' },
  { id: 'resources', label: 'Resources & documentation', group: 'career', icon: 'library', description: 'Official tools, datasheets and references.' },
  { id: 'careers', label: 'Career roadmaps', group: 'career', icon: 'career', description: 'Roles, prerequisites and portfolio milestones.' },
  { id: 'skills', label: 'My skills & progress', group: 'account', icon: 'skills', description: 'Backend-confirmed learning evidence.' },
  { id: 'portfolio', label: 'Project portfolio', group: 'account', icon: 'portfolio', description: 'Collect demonstrable engineering work.' },
  { id: 'community', label: 'Discussion community', group: 'account', icon: 'community', description: 'A future discussion surface, clearly marked.' },
  { id: 'bookmarks', label: 'Bookmarks & revision', group: 'account', icon: 'bookmark', description: 'Keep a focused revision queue.' },
  { id: 'settings', label: 'ECE profile settings', group: 'account', icon: 'settings', description: 'Change preferences and career signals.' },
];

export interface EceSubject {
  id: string;
  section: EceHubSection;
  title: string;
  eyebrow: string;
  description: string;
  level: 'Foundation' | 'Intermediate' | 'Advanced';
  lessons: number;
  estimatedHours: number;
  prerequisites: string[];
  challengeIds: string[];
  nextSkill: string;
  toolStatus: 'available' | 'partial' | 'unavailable';
}

export const ECE_SUBJECTS: EceSubject[] = [
  {
    id: 'hardware-fundamentals', section: 'fundamentals', title: 'Hardware fundamentals and logic gates', eyebrow: 'Start here',
    description: 'Move from safe low-voltage electrical vocabulary through digital thresholds, binary representation, logic gates and a verified half-adder model.', level: 'Foundation', lessons: 11, estimatedHours: 8,
    prerequisites: [], challengeIds: ['ece-04-half-adder'], nextSkill: 'Verilog gate primitives', toolStatus: 'available',
  },
  {
    id: 'digital-foundations', section: 'digital', title: 'Digital electronics foundations', eyebrow: 'Start here',
    description: 'Move from truth tables and Boolean algebra to timing-aware sequential logic.', level: 'Foundation', lessons: 8, estimatedHours: 6,
    prerequisites: ['Binary arithmetic'], challengeIds: ['ece-01-ripple-carry-adder', 'ece-02-d-flip-flop'], nextSkill: 'Verilog RTL', toolStatus: 'available',
  },
  {
    id: 'embedded-c', section: 'embedded', title: 'C for embedded systems', eyebrow: 'Firmware core',
    description: 'Build the bitwise, memory and state-machine habits used in real firmware.', level: 'Foundation', lessons: 10, estimatedHours: 8,
    prerequisites: ['C fundamentals'], challengeIds: ['ece-03-gpio-bit-toggle'], nextSkill: 'Microcontroller peripherals', toolStatus: 'available',
  },
  {
    id: 'verilog-rtl', section: 'verilog', title: 'Synthesizable Verilog HDL', eyebrow: 'RTL design',
    description: 'Write readable modules, choose assignment semantics and avoid accidental latches.', level: 'Intermediate', lessons: 12, estimatedHours: 10,
    prerequisites: ['Digital electronics foundations'], challengeIds: ['ece-01-ripple-carry-adder', 'ece-02-d-flip-flop'], nextSkill: 'Simulation and testbenches', toolStatus: 'partial',
  },
  {
    id: 'verification', section: 'verification', title: 'HDL simulation & testbenches', eyebrow: 'Prove behavior',
    description: 'Use stimulus, checkers, waveform reasoning and assertions to find design bugs.', level: 'Intermediate', lessons: 9, estimatedHours: 8,
    prerequisites: ['Synthesizable Verilog HDL'], challengeIds: [], nextSkill: 'SystemVerilog assertions', toolStatus: 'partial',
  },
  {
    id: 'vlsi-foundations', section: 'vlsi', title: 'VLSI design foundations', eyebrow: 'Silicon path',
    description: 'Connect logic, CMOS devices, power, timing and the RTL-to-layout flow.', level: 'Intermediate', lessons: 14, estimatedHours: 14,
    prerequisites: ['Digital electronics foundations', 'Semiconductor devices'], challengeIds: [], nextSkill: 'Timing and synthesis', toolStatus: 'partial',
  },
  {
    id: 'microcontrollers', section: 'embedded', title: 'Microcontroller peripherals', eyebrow: 'Bare metal',
    description: 'Understand GPIO, timers, interrupts, ADC, PWM and memory-mapped registers.', level: 'Intermediate', lessons: 12, estimatedHours: 12,
    prerequisites: ['C for embedded systems'], challengeIds: [], nextSkill: 'UART, SPI and I2C', toolStatus: 'partial',
  },
  {
    id: 'protocols', section: 'embedded', title: 'UART, SPI & I2C', eyebrow: 'Connected firmware',
    description: 'Read framing, transactions, timing and failure recovery from protocol traces.', level: 'Intermediate', lessons: 10, estimatedHours: 10,
    prerequisites: ['Microcontroller peripherals'], challengeIds: [], nextSkill: 'Driver architecture', toolStatus: 'partial',
  },
  {
    id: 'signals-systems', section: 'signals', title: 'Signals and systems', eyebrow: 'Mathematical base',
    description: 'Work from signal properties and convolution to transforms, sampling and stability.', level: 'Foundation', lessons: 11, estimatedHours: 12,
    prerequisites: ['Calculus and complex numbers'], challengeIds: ['ece-matlab-01-sampling', 'ece-matlab-02-convolution'], nextSkill: 'DSP foundations', toolStatus: 'available',
  },
  {
    id: 'communications', section: 'communications', title: 'Analog & digital communications', eyebrow: 'Communication chain',
    description: 'Compare modulation families, noise, SNR, BER and channel-capacity assumptions.', level: 'Intermediate', lessons: 12, estimatedHours: 14,
    prerequisites: ['Signals and systems'], challengeIds: ['ece-matlab-04-bpsk-symbols'], nextSkill: 'RF fundamentals', toolStatus: 'available',
  },
  {
    id: 'dsp-foundations', section: 'dsp', title: 'DSP foundations', eyebrow: 'Signal computation',
    description: 'Explore DFT, FFT, FIR/IIR filters, spectral analysis and fixed-point tradeoffs.', level: 'Intermediate', lessons: 10, estimatedHours: 12,
    prerequisites: ['Signals and systems'], challengeIds: ['ece-matlab-03-fft-spectrum'], nextSkill: 'Real-time signal processing', toolStatus: 'available',
  },
  {
    id: 'control-systems', section: 'control', title: 'Control systems', eyebrow: 'Feedback engineering',
    description: 'Read transfer functions, reason about stability and tune a PID with explicit limits.', level: 'Intermediate', lessons: 10, estimatedHours: 12,
    prerequisites: ['Signals and systems'], challengeIds: [], nextSkill: 'Instrumentation', toolStatus: 'available',
  },
  {
    id: 'pcb-foundations', section: 'pcb', title: 'PCB design foundations', eyebrow: 'Build hardware',
    description: 'Move from a checked schematic through placement, routing, power integrity and fabrication outputs.', level: 'Foundation', lessons: 8, estimatedHours: 8,
    prerequisites: ['Circuit analysis'], challengeIds: [], nextSkill: 'Hardware debugging', toolStatus: 'partial',
  },
  {
    id: 'semiconductor-devices', section: 'semiconductor', title: 'Semiconductor devices', eyebrow: 'Device physics',
    description: 'Build intuition for PN junctions, MOSFET operation, CMOS and fabrication vocabulary.', level: 'Foundation', lessons: 9, estimatedHours: 9,
    prerequisites: ['Electronics fundamentals'], challengeIds: [], nextSkill: 'CMOS logic and VLSI', toolStatus: 'available',
  },
  {
    id: 'instrumentation', section: 'instrumentation', title: 'Instrumentation & sensors', eyebrow: 'Measure reality',
    description: 'Select sensors, condition signals, quantify error and design repeatable acquisition steps.', level: 'Intermediate', lessons: 9, estimatedHours: 9,
    prerequisites: ['Analog electronics'], challengeIds: [], nextSkill: 'IoT telemetry', toolStatus: 'partial',
  },
  {
    id: 'rf-antenna', section: 'rf', title: 'RF, antennas & propagation', eyebrow: 'High-frequency systems',
    description: 'Use link budgets, transmission-line models and antenna parameters without hiding assumptions.', level: 'Advanced', lessons: 11, estimatedHours: 14,
    prerequisites: ['Electromagnetics', 'Signals and systems'], challengeIds: [], nextSkill: 'RF measurement practice', toolStatus: 'unavailable',
  },
];

export interface EceRoadmapNode {
  id: string;
  phase: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  prerequisites: string[];
  challengeId?: string;
  subjectId: string;
  evidence: string;
}

export interface EceRoadmap {
  id: string;
  title: string;
  role: string;
  description: string;
  phases: string[];
  nodes: EceRoadmapNode[];
}

export const ECE_ROADMAPS: EceRoadmap[] = [
  {
    id: 'vlsi-engineer',
    title: 'VLSI design engineer',
    role: 'RTL design, verification and physical implementation',
    description: 'A dependency-aware route from logic foundations through HDL, verification, synthesis, timing and physical-design literacy.',
    phases: ['Foundations', 'RTL design', 'Verification', 'Synthesis & timing', 'Physical design'],
    nodes: [
      { id: 'vlsi-digital', phase: 'Foundations', title: 'Digital logic and timing', description: 'Truth tables, minimization, state and setup/hold vocabulary.', estimatedMinutes: 360, prerequisites: [], subjectId: 'digital-foundations', challengeId: 'ece-01-ripple-carry-adder', evidence: 'Pass a combinational or sequential challenge.' },
      { id: 'vlsi-devices', phase: 'Foundations', title: 'Semiconductor and CMOS foundations', description: 'PN junctions, MOSFET behavior, CMOS inverter and power assumptions.', estimatedMinutes: 540, prerequisites: [], subjectId: 'semiconductor-devices', evidence: 'Complete the device calculation checkpoint.' },
      { id: 'vlsi-verilog', phase: 'RTL design', title: 'Synthesizable Verilog', description: 'Modules, ports, combinational/sequential blocks and parameterization.', estimatedMinutes: 600, prerequisites: ['vlsi-digital'], subjectId: 'verilog-rtl', challengeId: 'ece-02-d-flip-flop', evidence: 'Submit an RTL module to the configured evaluator.' },
      { id: 'vlsi-verification', phase: 'Verification', title: 'Testbenches and assertions', description: 'Stimulus, checkers, race avoidance, waveforms and assertion intent.', estimatedMinutes: 480, prerequisites: ['vlsi-verilog'], subjectId: 'verification', evidence: 'Explain a failed test and identify its first divergent cycle.' },
      { id: 'vlsi-synthesis', phase: 'Synthesis & timing', title: 'Synthesis and static timing', description: 'Netlists, constraints, critical paths and area/timing tradeoffs.', estimatedMinutes: 600, prerequisites: ['vlsi-verilog'], subjectId: 'vlsi-foundations', evidence: 'Complete a timing-path calculation with stated assumptions.' },
      { id: 'vlsi-physical', phase: 'Physical design', title: 'RTL-to-layout literacy', description: 'Floorplanning, power planning, placement, CTS, routing and DRC concepts.', estimatedMinutes: 720, prerequisites: ['vlsi-synthesis'], subjectId: 'vlsi-foundations', evidence: 'Review an open-source flow requirement checklist.' },
    ],
  },
  {
    id: 'embedded-firmware',
    title: 'Embedded firmware engineer',
    role: 'Bare-metal C, peripherals, protocols and real-time reliability',
    description: 'Build the firmware habits that connect C reasoning to registers, timing, drivers, protocols and RTOS design.',
    phases: ['C & electronics', 'Microcontrollers', 'Drivers', 'Protocols', 'Reliability & RTOS'],
    nodes: [
      { id: 'embedded-c', phase: 'C & electronics', title: 'C, memory and bitwise logic', description: 'Pointers, integer widths, volatile, memory layout and bit manipulation.', estimatedMinutes: 480, prerequisites: [], subjectId: 'embedded-c', challengeId: 'ece-03-gpio-bit-toggle', evidence: 'Pass the GPIO register challenge.' },
      { id: 'embedded-mcu', phase: 'Microcontrollers', title: 'Microcontroller architecture', description: 'Memory maps, reset, clocks, buses, datasheets and startup flow.', estimatedMinutes: 420, prerequisites: ['embedded-c'], subjectId: 'microcontrollers', evidence: 'Annotate a supplied memory map.' },
      { id: 'embedded-peripherals', phase: 'Microcontrollers', title: 'GPIO, timers and interrupts', description: 'Register configuration, interrupt safety, PWM and watchdogs.', estimatedMinutes: 600, prerequisites: ['embedded-mcu'], subjectId: 'microcontrollers', evidence: 'Debug a register configuration exercise.' },
      { id: 'embedded-drivers', phase: 'Drivers', title: 'Reusable peripheral drivers', description: 'Interfaces, timeouts, buffers, error handling and testable drivers.', estimatedMinutes: 540, prerequisites: ['embedded-peripherals'], subjectId: 'microcontrollers', evidence: 'Write a driver contract and failure table.' },
      { id: 'embedded-protocols', phase: 'Protocols', title: 'UART, SPI and I2C', description: 'Frame formats, transaction timing, checksums and recovery paths.', estimatedMinutes: 600, prerequisites: ['embedded-drivers'], subjectId: 'protocols', evidence: 'Decode a protocol trace and explain the retry condition.' },
      { id: 'embedded-rtos', phase: 'Reliability & RTOS', title: 'Real-time systems and RTOS', description: 'Tasks, priorities, queues, mutexes, deadlocks and timing budgets.', estimatedMinutes: 720, prerequisites: ['embedded-protocols'], subjectId: 'embedded-c', evidence: 'Pass a software-only producer/consumer test.' },
    ],
  },
  {
    id: 'ece-systems',
    title: 'ECE systems generalist',
    role: 'Signals, communications, control and instrumentation',
    description: 'A systems route for students connecting mathematical models to measured and communicated signals.',
    phases: ['Signals', 'DSP', 'Communications', 'Control', 'Instrumentation'],
    nodes: [
      { id: 'systems-signals', phase: 'Signals', title: 'Signals and systems', description: 'Convolution, transforms, sampling and stability.', estimatedMinutes: 720, prerequisites: [], subjectId: 'signals-systems', evidence: 'Solve a sampling or convolution checkpoint.' },
      { id: 'systems-dsp', phase: 'DSP', title: 'DSP foundations', description: 'DFT/FFT, filters, spectra and implementation limits.', estimatedMinutes: 720, prerequisites: ['systems-signals'], subjectId: 'dsp-foundations', evidence: 'Interpret a spectrum and identify the bin spacing.' },
      { id: 'systems-comms', phase: 'Communications', title: 'Modulation and BER', description: 'Analog/digital modulation, noise, detection and link assumptions.', estimatedMinutes: 840, prerequisites: ['systems-signals'], subjectId: 'communications', evidence: 'Complete a modulation comparison exercise.' },
      { id: 'systems-control', phase: 'Control', title: 'Control systems', description: 'Transfer functions, stability and PID response.', estimatedMinutes: 720, prerequisites: ['systems-signals'], subjectId: 'control-systems', evidence: 'Calculate a closed-loop response with assumptions.' },
      { id: 'systems-instrumentation', phase: 'Instrumentation', title: 'Sensors and measurement', description: 'Signal conditioning, calibration, ADCs and error budgets.', estimatedMinutes: 540, prerequisites: ['systems-control'], subjectId: 'instrumentation', evidence: 'Build a measurement error budget.' },
    ],
  },
];

export interface EceQuickTool {
  id: string;
  title: string;
  description: string;
  status: 'ready' | 'guided' | 'unavailable';
  section: EceHubSection;
}

export const ECE_QUICK_TOOLS: EceQuickTool[] = [
  { id: 'verilog-playground', title: 'Verilog Playground', description: 'Open the configured HDL challenge workspace.', status: 'guided', section: 'verilog' },
  { id: 'embedded-c-practice', title: 'Embedded C Practice', description: 'Work through real C challenges using the evaluator when available.', status: 'guided', section: 'embedded' },
  { id: 'digital-logic-lab', title: 'Digital Logic Lab', description: 'Simulate supported gates, generate truth tables and inspect a half adder.', status: 'ready', section: 'playground' },
  { id: 'circuit-analysis', title: 'Circuit Analysis', description: 'Unit-aware Ohm, divider and RC calculations.', status: 'ready', section: 'calculations' },
  { id: 'signal-lab', title: 'Signal Processing Lab', description: 'Work through explicit sampling and FFT calculations.', status: 'ready', section: 'dsp' },
  { id: 'matlab-signal-lab', title: 'MATLAB Signals Lab', description: 'Explore sampled signals, convolution, spectra and modulation with MATLAB-compatible starter code.', status: 'ready', section: 'signals' },
  { id: 'communication-lab', title: 'Communications Lab', description: 'Compare modulation and link-budget assumptions.', status: 'guided', section: 'communications' },
  { id: 'engineering-calculator', title: 'Engineering Calculator', description: 'Small calculators with formulas, units and reset.', status: 'ready', section: 'calculations' },
  { id: 'project-lab', title: 'Project Lab', description: 'Choose a scoped project with a real evaluation rubric.', status: 'ready', section: 'labs' },
];

export interface EceProject {
  id: string;
  title: string;
  track: 'VLSI' | 'Embedded' | 'Core ECE';
  level: 'Starter' | 'Intermediate' | 'Advanced';
  summary: string;
  prerequisites: string[];
  deliverables: string[];
  hardwareAlternative: string;
  evaluator: 'backend' | 'manual' | 'unavailable';
}

export const ECE_PROJECTS: EceProject[] = [
  { id: 'rtl-logic-library', title: 'Synthesizable RTL logic library', track: 'VLSI', level: 'Starter', summary: 'Build and document reusable gates, adders, muxes and a small register bank.', prerequisites: ['Digital logic', 'Verilog modules'], deliverables: ['RTL source', 'Self-checking testbench', 'Timing notes'], hardwareAlternative: 'Simulation-only; no FPGA board required.', evaluator: 'backend' },
  { id: 'verification-fifo', title: 'Self-checking synchronous FIFO', track: 'VLSI', level: 'Intermediate', summary: 'Design a FIFO and verify full, empty, reset and simultaneous read/write behavior.', prerequisites: ['Sequential RTL', 'Testbench structure'], deliverables: ['RTL', 'Assertions', 'Failure analysis'], hardwareAlternative: 'Run the testbench in the configured evaluator when available.', evaluator: 'backend' },
  { id: 'firmware-logger', title: 'Fault-tolerant sensor data logger', track: 'Embedded', level: 'Intermediate', summary: 'Design a sensor acquisition state machine with buffering, timeout and recovery behavior.', prerequisites: ['C', 'Timers', 'UART or I2C'], deliverables: ['Firmware or pure-C model', 'Protocol notes', 'Fault table'], hardwareAlternative: 'Use a host-side simulator and recorded sensor frames.', evaluator: 'manual' },
  { id: 'protocol-analyzer', title: 'UART/SPI/I2C protocol analyzer', track: 'Embedded', level: 'Starter', summary: 'Decode frames, detect malformed packets and report actionable errors.', prerequisites: ['Bitwise C', 'Protocol framing'], deliverables: ['Parser', 'Fixtures', 'Failure report'], hardwareAlternative: 'No hardware required; use supplied traces.', evaluator: 'backend' },
  { id: 'fft-analyzer', title: 'FFT-based signal analyzer', track: 'Core ECE', level: 'Intermediate', summary: 'Calculate bin spacing, identify dominant components and explain windowing assumptions.', prerequisites: ['Signals', 'DFT/FFT'], deliverables: ['Analysis notebook or report', 'Plots', 'Assumption log'], hardwareAlternative: 'Software-only project.', evaluator: 'manual' },
  { id: 'link-budget', title: 'Communication link-budget calculator', track: 'Core ECE', level: 'Starter', summary: 'Build a transparent link budget with dB arithmetic and margin checks.', prerequisites: ['Logarithms', 'Propagation basics'], deliverables: ['Calculator', 'Worked example', 'Limitations'], hardwareAlternative: 'Software-only project.', evaluator: 'manual' },
];

export interface EceLab {
  id: string;
  title: string;
  mode: 'calculation' | 'code' | 'guided';
  teaches: string;
  inputs: string;
  observation: string;
  limitation: string;
}

export const ECE_LABS: EceLab[] = [
  { id: 'logic-lab', title: 'Truth-table and logic lab', mode: 'calculation', teaches: 'Combinational reasoning, supported gate simulation and Boolean minimization.', inputs: 'Input switches, gate connections, truth-table rows and selected starter circuits.', observation: 'The two-state circuit model evaluates every supported connection and exposes the generated table.', limitation: 'It does not model voltage, propagation delay, noise, X/Z values or physical electrical faults.' },
  { id: 'hdl-lab', title: 'Verilog compile and test lab', mode: 'code', teaches: 'RTL syntax, testbench intent and result interpretation.', inputs: 'Verilog source, linked challenge test cases and submission.', observation: 'Backend verdict and test results are shown when the evaluator responds.', limitation: 'Waveform viewing and arbitrary testbench editing are not available in this release.' },
  { id: 'firmware-lab', title: 'Embedded register lab', mode: 'code', teaches: 'Bit masks, register fields and defensive peripheral logic.', inputs: 'Pure-C function, register values and unit-test fixtures.', observation: 'The C evaluator result is evidence for the supplied software model only.', limitation: 'It does not flash a physical board or prove electrical timing.' },
  { id: 'sampling-lab', title: 'MATLAB-compatible sampling and FFT lab', mode: 'code', teaches: 'Sampling condition, bin spacing, aliasing and MATLAB-compatible plots.', inputs: 'Sample rate, signal frequency, duration and MATLAB-compatible starter code.', observation: 'A deterministic browser model shows the time signal and magnitude spectrum; the linked evaluator can use GNU Octave when configured.', limitation: 'The browser does not execute MATLAB, and GNU Octave availability is reported by the evaluator rather than assumed.' },
  { id: 'matlab-signal-lab', title: 'MATLAB-compatible signal systems lab', mode: 'code', teaches: 'Connect Signals & Systems, DSP and Communication Systems concepts through small MATLAB-compatible experiments.', inputs: 'A saved lab state, signal parameters, plots and linked code challenges.', observation: 'The browser model updates plots immediately and the code workspace preserves the existing submission flow.', limitation: 'No physical acquisition, RF channel measurement, proprietary MATLAB runtime or MATLAB language server is claimed.' },
  { id: 'control-lab', title: 'Control response worksheet', mode: 'guided', teaches: 'Closed-loop reasoning, stability and PID tradeoffs.', inputs: 'Plant assumptions, controller gains and time-step notes.', observation: 'The worksheet records calculations; it does not claim a full control simulator.', limitation: 'No external control-systems engine is configured.' },
];

export interface EceResource {
  title: string;
  provider: string;
  subject: string;
  url: string;
  note: string;
}

export const ECE_RESOURCES: EceResource[] = [
  { title: 'Icarus Verilog documentation', provider: 'Icarus Verilog', subject: 'HDL simulation', url: 'https://steveicarus.github.io/iverilog/', note: 'Use for supported compile/simulation concepts; local availability is reported by the evaluator.' },
  { title: 'Yosys documentation', provider: 'YosysHQ', subject: 'RTL synthesis', url: 'https://yosyshq.readthedocs.io/', note: 'Reference for open-source synthesis concepts; no signoff flow is implied.' },
  { title: 'KiCad documentation', provider: 'KiCad', subject: 'PCB design', url: 'https://docs.kicad.org/', note: 'Official documentation for schematic and PCB workflows.' },
  { title: 'Zephyr documentation', provider: 'Zephyr Project', subject: 'RTOS', url: 'https://docs.zephyrproject.org/latest/', note: 'Use when a supported local toolchain is available.' },
  { title: 'ESP-IDF programming guide', provider: 'Espressif', subject: 'Embedded and IoT', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/', note: 'Vendor documentation for ESP32-class development.' },
  { title: 'Arduino language reference', provider: 'Arduino', subject: 'Embedded foundations', url: 'https://docs.arduino.cc/language-reference/', note: 'Useful for introductory board APIs; hardware behavior still needs a board.' },
];

export const DEFAULT_ECE_PREFERENCES: EcePreferences = {
  current_year: null,
  current_semester: null,
  electronics_level: 'new',
  c_programming_level: 'new',
  mathematics_level: 'new',
  digital_electronics_level: 'new',
  simulation_experience: 'new',
  weekly_hours: null,
  preferred_learning_mode: 'mixed',
  career_interests: ['VLSI RTL design'],
  target_roles: ['RTL Design Engineer'],
  available_hardware: ['No hardware yet'],
};

export const ECE_LEVELS: Array<{ value: EceLevel; label: string }> = [
  { value: 'new', label: 'New to this' },
  { value: 'working', label: 'I can practise it' },
  { value: 'confident', label: 'Confident' },
];

export const ECE_INTERESTS = [
  'VLSI RTL design', 'Design verification', 'Physical design', 'Analog IC design', 'FPGA engineering',
  'Embedded firmware', 'Embedded Linux', 'IoT', 'Automotive embedded systems', 'Communication systems',
  'DSP', 'RF engineering', 'PCB design', 'Instrumentation', 'Control systems', 'Robotics', 'Research and postgraduate preparation',
];

export const ECE_ROLES = [
  'RTL Design Engineer', 'Design Verification Engineer', 'Physical Design Engineer', 'Analog IC Design Engineer',
  'FPGA Design Engineer', 'Embedded Firmware Engineer', 'Embedded Linux Engineer', 'IoT Engineer', 'RF Engineer',
];

export const ECE_HARDWARE = [
  'No hardware yet', 'Arduino-compatible board', 'ESP32', 'STM32', 'Other microcontroller board',
  'FPGA board', 'Breadboard and basic components', 'Debugger, oscilloscope or logic analyzer', 'College laboratory access',
];

export function preferencesForUser(user: User | null): EcePreferences {
  const stored = user?.ece_preferences;
  return {
    ...DEFAULT_ECE_PREFERENCES,
    ...(stored || {}),
    career_interests: stored?.career_interests?.length ? stored.career_interests : DEFAULT_ECE_PREFERENCES.career_interests,
    target_roles: stored?.target_roles?.length ? stored.target_roles : DEFAULT_ECE_PREFERENCES.target_roles,
    available_hardware: stored?.available_hardware?.length ? stored.available_hardware : DEFAULT_ECE_PREFERENCES.available_hardware,
  };
}
