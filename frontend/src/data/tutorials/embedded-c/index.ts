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
import { module12Lessons } from './module-12';
import { module13Lessons } from './module-13';
import { module14Lessons } from './module-14';
import { module15Lessons } from './module-15';
import { module16Lessons } from './module-16';
import { module17Lessons } from './module-17';
import { module18Lessons } from './module-18';
import { embeddedCProjects } from './projects';

export const course: TutorialCourse = {
  id: 'embedded-c',
  title: 'Embedded C Programming',
  tagline: 'From memory-mapped registers to RTOS-ready firmware architecture.',
  description:
    'The complete embedded C track: embedded fundamentals, hardware registers, GPIO, timers, interrupts, UART, SPI, I2C, ADC/DAC, PWM, sensors and actuators, firmware architecture, DMA, memory optimization, RTOS fundamentals and firmware debugging. Every lesson reasons from register-level behaviour using clearly-labelled educational mock registers so examples run on any host, and states honestly what requires real hardware and vendor reference manuals. Capstone projects assemble the patterns into complete, reviewable deliverables.',
  level: 'intermediate',
  status: 'published',
  domains: ['ECE', 'HARDWARE'],
  trackTags: ['Embedded Systems', 'Firmware'],
  estimatedHours: 42,
  prerequisites: ['c-programming'],
  skills: [
    'Memory-mapped register programming with volatile discipline',
    'GPIO, timers and interrupt handling',
    'UART, SPI and I2C driver reasoning',
    'ADC, DAC and PWM configuration and conversion math',
    'Non-blocking firmware architecture and state machines',
    'DMA buffer ownership and coherency thinking',
    'RAM budgeting, stack safety and optimization method',
    'RTOS task, queue and mutex reasoning (FreeRTOS concepts)',
    'Host-based unit testing and firmware debugging method',
  ],
  modules: [
    {
      id: 'm01',
      title: 'Embedded Systems Fundamentals',
      summary:
        'What makes a system embedded, microcontroller anatomy, memory roles, datasheets, clocks, reset behavior and the toolchain and startup flow.',
      lessons: module01Lessons,
    },
    {
      id: 'm02',
      title: 'C for Embedded Developers',
      summary:
        'Fixed-width integers and signed pitfalls, bitwise operations for hardware, volatile/const discipline, warnings and undefined behaviour.',
      lessons: module02Lessons,
    },
    {
      id: 'm03',
      title: 'Memory & Hardware Registers',
      summary:
        'Memory-mapped I/O, register blocks as structs, read-modify-write and masks, the exact volatile contract, access widths and reading a reference manual.',
      lessons: module03Lessons,
    },
    {
      id: 'm04',
      title: 'GPIO',
      summary:
        'Digital outputs and LEDs with electrical limits, inputs with pull-up/pull-down design, and debouncing with clean edge events.',
      lessons: module04Lessons,
    },
    {
      id: 'm05',
      title: 'Timers & Counters',
      summary:
        'Prescaler and overflow arithmetic, output compare and input capture, and non-blocking timing with wrapping-safe tick scheduling.',
      lessons: module05Lessons,
    },
    {
      id: 'm06',
      title: 'Interrupts',
      summary:
        'Vectors, flags and the ISR contract, torn reads and lost updates with critical sections, and short handlers with deferred processing.',
      lessons: module06Lessons,
    },
    {
      id: 'm07',
      title: 'UART',
      summary:
        'Frames and baud-rate arithmetic, polled and interrupt-driven drivers with timeouts, and the complete ring-buffer module.',
      lessons: module07Lessons,
    },
    {
      id: 'm08',
      title: 'SPI',
      summary:
        'Signals and the full-duplex shift-register exchange, CPOL/CPHA modes, and CS-bounded transactions against a mock device command set.',
      lessons: module08Lessons,
    },
    {
      id: 'm09',
      title: 'I2C',
      summary:
        'Open-drain signalling and addressing, the register-pointer pattern with repeated starts, clock stretching, stuck-bus recovery and fault diagnosis.',
      lessons: module09Lessons,
    },
    {
      id: 'm10',
      title: 'ADC & DAC',
      summary:
        'Counts, resolution and reference math, sampling and noise with averaging and calibration, DAC outputs and complete sensor conversion chains.',
      lessons: module10Lessons,
    },
    {
      id: 'm11',
      title: 'PWM',
      summary:
        'Duty cycle and frequency concepts, timer-based PWM with resolution budgets, and servo/motor control with drivers and dead time.',
      lessons: module11Lessons,
    },
    {
      id: 'm12',
      title: 'Sensors & Actuators',
      summary:
        'Digital, analog and timing-based sensor interfaces, actuator drivers and flyback protection, signal conditioning and grounding.',
      lessons: module12Lessons,
    },
    {
      id: 'm13',
      title: 'Firmware Architecture',
      summary:
        'Superloops and state machines, layered modules with header contracts, and the failure policy: error ladders, watchdogs and logging.',
      lessons: module13Lessons,
    },
    {
      id: 'm14',
      title: 'DMA & Efficient Data Movement',
      summary:
        'DMA fundamentals and triggers, circular streams with half/full events, and buffer ownership, coherency and error handling.',
      lessons: module14Lessons,
    },
    {
      id: 'm15',
      title: 'Memory & Optimization',
      summary:
        'RAM budgets without malloc, buffer and stack safety with watermarks, and the three optimization games: size, speed and power.',
      lessons: module15Lessons,
    },
    {
      id: 'm16',
      title: 'RTOS Fundamentals',
      summary:
        'Tasks, preemption and priorities, queues/semaphores/mutexes with priority inversion, and designing with software timers, events and watchdogs — taught generically with FreeRTOS as the reference.',
      lessons: module16Lessons,
    },
    {
      id: 'm17',
      title: 'Debugging & Testing Firmware',
      summary:
        'The four observability windows, fault-isolation method with assertions, and host-based unit testing with mock registers and the honest host/board split.',
      lessons: module17Lessons,
    },
    {
      id: 'm18',
      title: 'Embedded C Projects',
      summary:
        'Capstone walkthroughs: an interrupt-driven event counter, a layered multi-sensor monitor, and a host-runnable producer/consumer queue.',
      lessons: module18Lessons,
    },
  ],
  projects: embeddedCProjects,
  resources: [
    { label: 'Wikipedia — Embedded system', url: 'https://en.wikipedia.org/wiki/Embedded_system', kind: 'article' },
    { label: 'FreeRTOS — RTOS concepts and reference', url: 'https://www.freertos.org/', kind: 'docs' },
    { label: 'ESP-IDF programming guide', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/', kind: 'docs' },
    { label: 'Arm developer documentation (Cortex-M reference manuals)', url: 'https://developer.arm.com/documentation', kind: 'docs' },
    { label: 'cppreference — C language and library reference', url: 'https://en.cppreference.com/w/c', kind: 'docs' },
    { label: 'Electronics Tutorials — circuit and signal basics', url: 'https://www.electronics-tutorials.ws/', kind: 'article' },
    { label: 'All About Circuits — textbook and technical articles', url: 'https://www.allaboutcircuits.com/', kind: 'article' },
  ],
};
