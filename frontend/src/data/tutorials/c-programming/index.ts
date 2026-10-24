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
import { cProgrammingProjects } from './projects';

export const course: TutorialCourse = {
  id: 'c-programming',
  title: 'C Programming for Electronics Engineers',
  tagline: 'Master the C that firmware and hardware engineers actually write.',
  description:
    'A complete C programming foundation aimed at electronics and hardware engineers: syntax, types, bitwise operators, control flow, functions, arrays, pointers, structs and the build process. The course keeps memory, registers and representation visible everywhere so the skills transfer directly to embedded and firmware work. Host-executable simulations are clearly labeled as such; nothing claims to drive hardware.',
  level: 'beginner',
  status: 'published',
  domains: ['ECE', 'HARDWARE'],
  trackTags: ['Embedded', 'Firmware'],
  estimatedHours: 32,
  prerequisites: [],
  skills: [
    'C syntax and program structure',
    'Integer representation and bitwise operations',
    'Pointers and memory reasoning',
    'Arrays, strings and structs',
    'Reading compiler and linker errors',
    'Debugging small C programs',
  ],
  modules: [
    {
      id: 'm01',
      title: 'Programming Fundamentals',
      summary:
        'What a C program is, the edit-compile-run cycle, main(), standard input/output and a first mental model of memory.',
      lessons: module01Lessons,
    },
    {
      id: 'm02',
      title: 'Variables & Data Types',
      summary:
        'Integer widths and signedness, fixed-width types from stdint.h, characters, floats, declarations, initialization and type conversion rules.',
      lessons: module02Lessons,
    },
    {
      id: 'm03',
      title: 'Operators & Bitwise Mastery',
      summary:
        'Arithmetic, relational and logical operators alongside AND, OR, XOR, shifts and masks — the toolkit register-level C depends on.',
      lessons: module03Lessons,
    },
    {
      id: 'm04',
      title: 'Decision-Making',
      summary:
        'if/else chains, switch statements, conditional expressions, comparison pitfalls and writing branch logic that reads clearly.',
      lessons: module04Lessons,
    },
    {
      id: 'm05',
      title: 'Loops',
      summary:
        'while, do-while and for loops, loop invariants, break and continue, and bounding loops the way safety-critical firmware requires.',
      lessons: module05Lessons,
    },
    {
      id: 'm06',
      title: 'Functions',
      summary:
        'Prototypes, parameters and return values, pass-by-value semantics, scope and lifetime, and decomposing problems into small functions.',
      lessons: module06Lessons,
    },
    {
      id: 'm07',
      title: 'Arrays & Strings',
      summary:
        'Array declaration and indexing, decay to pointers, null-terminated strings, the standard string library and out-of-bounds discipline.',
      lessons: module07Lessons,
    },
    {
      id: 'm08',
      title: 'Pointers & Memory',
      summary:
        'Address-of and dereference, pointer arithmetic, pointers and arrays, dynamic allocation, stack versus heap and common pointer bugs.',
      lessons: module08Lessons,
    },
    {
      id: 'm09',
      title: 'Structures, Unions & Enums',
      summary:
        'Grouping data with structs, overlaying representations with unions, named constants with enums and typedef for readable hardware code.',
      lessons: module09Lessons,
    },
    {
      id: 'm10',
      title: 'Build Process & Debugging',
      summary:
        'Preprocessor, compilation, assembly, linking and loading; compiler warnings, debugger basics and a repeatable method for finding C bugs.',
      lessons: module10Lessons,
    },
  ],
  projects: cProgrammingProjects,
  resources: [
    { label: 'cppreference — C language reference', url: 'https://en.cppreference.com/w/c/language', kind: 'docs' },
    { label: 'cppreference — C standard library', url: 'https://en.cppreference.com/w/c/header', kind: 'docs' },
    { label: 'GCC online documentation', url: 'https://gcc.gnu.org/onlinedocs/', kind: 'docs' },
    { label: 'GCC — Warning Options', url: 'https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html', kind: 'docs' },
    { label: 'Wikipedia — C (programming language)', url: 'https://en.wikipedia.org/wiki/C_(programming_language)', kind: 'article' },
    { label: 'Wikipedia — Bitwise operation', url: 'https://en.wikipedia.org/wiki/Bitwise_operation', kind: 'article' },
    { label: 'Wikipedia — Pointer (computer programming)', url: 'https://en.wikipedia.org/wiki/Pointer_(computer_programming)', kind: 'article' },
    { label: 'Wikipedia — Endianness', url: 'https://en.wikipedia.org/wiki/Endianness', kind: 'article' },
  ],
};
