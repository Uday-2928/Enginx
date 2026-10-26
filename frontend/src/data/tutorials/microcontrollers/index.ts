import type { TutorialCourse } from '../types';
import { module01Lessons } from './module-01';
import { module02Lessons } from './module-02';
import { module03Lessons } from './module-03';
import { module04Lessons } from './module-04';
import { module05Lessons } from './module-05';
import { mcuProjects } from './projects';

export const course: TutorialCourse = {
  id: 'microcontrollers',
  title: 'Microcontrollers & Hardware Interfacing',
  tagline: 'AVR, ESP32, Cortex-M and RP2040 — boards, peripherals and safe interfacing.',
  description:
    'A board-aware microcontroller course: comparing architectures and boards, then working through Arduino-compatible AVR, ESP32, ARM Cortex-M and RP2040 ecosystems, and finishing with safe interfacing projects. Vendor documentation is used directly, and every project states its hardware requirements and safe software-only alternatives.',
  level: 'intermediate',
  status: 'published',
  domains: ['ECE', 'HARDWARE'],
  trackTags: ['Embedded Systems'],
  estimatedHours: 26,
  prerequisites: ['c-programming', 'embedded-c'],
  skills: [
    'Board and architecture selection',
    'Arduino-compatible AVR workflow',
    'ESP32 and ESP-IDF basics',
    'ARM Cortex-M and RP2040 literacy',
    'Peripheral interfacing practice',
    'Electrical safety limits for interfacing',
  ],
  modules: [
    {
      id: 'm01',
      title: 'Boards & Architectures',
      summary: 'Microcontroller families compared by core, memory, peripherals and ecosystem, plus how to read a board pinout and datasheet.',
      lessons: module01Lessons,
    },
    {
      id: 'm02',
      title: 'Arduino-Compatible AVR',
      summary: 'The AVR core, Arduino runtime anatomy, digital and analog APIs versus direct registers, and where the abstraction hides timing.',
      lessons: module02Lessons,
    },
    {
      id: 'm03',
      title: 'ESP32',
      summary: 'Dual-core Xtensa architecture, Wi-Fi and Bluetooth capabilities, ESP-IDF versus Arduino frameworks and power management modes.',
      lessons: module03Lessons,
    },
    {
      id: 'm04',
      title: 'ARM Cortex-M & RP2040',
      summary: 'Cortex-M exception model, NVIC and CMSIS, the RP2040 dual Cortex-M0+ design, PIO and the Pico SDK development flow.',
      lessons: module04Lessons,
    },
    {
      id: 'm05',
      title: 'Safe Interfacing Projects',
      summary: 'Voltage and current limits, driving LEDs, relays and motors safely, level shifting, and guided projects with explicit hardware requirements.',
      lessons: module05Lessons,
    },
  ],
  projects: mcuProjects,
  resources: [
    { label: 'Arduino language reference', url: 'https://docs.arduino.cc/language-reference/', kind: 'docs' },
    { label: 'ESP-IDF programming guide', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/', kind: 'docs' },
    { label: 'Raspberry Pi Pico documentation', url: 'https://www.raspberrypi.com/documentation/microcontrollers/', kind: 'docs' },
  ],
};
