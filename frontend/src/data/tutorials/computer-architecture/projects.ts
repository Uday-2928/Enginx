import type { TutorialProject } from '../types';

export const projects: TutorialProject[] = [
  {
    id: 'carc-toyisa-sim',
    title: 'Toy-1 Instruction Set Simulator in C',
    level: 'intermediate',
    summary:
      'Build a complete, traceable simulator for the Toy-1 ISA defined in module 01: fetch-decode-execute loop, 16-byte data memory, all eight opcodes, and a cycle-by-cycle trace printer you can check against hand traces from the lessons.',
    useCase:
      'A paper-and-keyboard project (no hardware needed) that makes the fetch-decode-execute cycle tangible. The simulator becomes your reference model: when you later build a Toy-1 datapath in RTL for the pipelining courses, this C program is the golden behaviour you verify against.',
    requirements: [
      'Implement the Toy-1 memory model: separate program image (byte array) and 16-byte data memory.',
      'Implement registers PC (4-bit semantics: mask to 4 bits on increments), IR, AC (8-bit, all arithmetic modulo 256) and a HALT flag.',
      'Decode each instruction byte as opcode = byte >> 4, operand = byte & 0x0F.',
      'Implement all opcodes: HALT, LOAD, STORE, ADD, SUB, LOADI, JMP, JZ.',
      'Print a trace line per cycle: cycle number, PC before fetch, IR, decoded mnemonic, and AC after execute.',
      'Halt cleanly on HALT, and report an error if the PC runs past the program without HALT (runaway detection).',
    ],
    learningOutcomes: [
      'Translating an ISA specification into an executable reference model.',
      'Separating fetch, decode and execute phases cleanly in code.',
      'Reasoning about 8-bit wrap-around arithmetic and 4-bit program-counter semantics.',
      'Producing machine-checkable traces and comparing them to hand-traced expectations.',
    ],
    prerequisites: [
      'carc-m01-l3 (Toy-1 specification and hand traces)',
      'C basics: arrays, switch statements, unsigned types',
    ],
    architecture:
      'A single C file with three sections: state (registers and memories), a fetch-decode-execute function per phase, and a main loop that runs cycles until HALT. Decode is a switch on the opcode nibble. The tracer is a pure function of the pre-cycle state plus the decoded instruction, so it never influences execution.',
    steps: [
      {
        title: 'Define the ISA tables and state',
        detail:
          'Lay down the constants: opcode numbers, a mnemonic table for printing, and a state struct holding pc, ir, ac, halted and the data memory array. Mask pc to 4 bits after every increment so runaway programs wrap instead of crashing.',
      },
      {
        title: 'Implement fetch and decode',
        detail:
          'fetch() copies program[pc] into ir and increments pc (masked). decode() splits the byte: opcode = ir >> 4, operand = ir & 0x0F, and returns a struct used by both execute and the tracer.',
      },
      {
        title: 'Implement execute as a switch',
        detail:
          'One case per opcode. LOAD/ADD/SUB index data[operand] (add a bounds assertion); STORE writes it; LOADI zero-extends the nibble; JMP assigns pc; JZ assigns pc only when ac == 0; HALT sets the halted flag. All arithmetic on ac is done in uint8_t so wrap-around is automatic.',
      },
      {
        title: 'Build the trace printer',
        detail:
          'After each execute, print one line: cycle number, PC before fetch, IR byte, mnemonic+operand, and AC. Keep the format fixed so outputs can be diffed against expected traces.',
        code: `/* trace line format (fixed, for diffing) */
printf("cyc=%u PC=0x%X IR=0x%02X %-8s AC=%u\\n",
       cycle, pcBefore, ir, mnemonic, ac);`,
      },
      {
        title: 'Load and run the module-01 programs',
        detail:
          'Hard-code the two programs from the lessons as byte arrays: the four-instruction sum program (0x53, 0x3C, 0x2D, 0x00) and the countdown loop (0x1E, 0x2F, 0x41, 0x2E, 0x76, 0x60, 0x00) with DATA[0x1]=1, DATA[0xE]=3 preloaded. Diff the simulator trace against your hand traces.',
      },
      {
        title: 'Extend: runaway detection and self-check',
        detail:
          'Add a cycle limit (for example 1000): if the limit is hit without HALT, print an error naming the stuck PC. Then add a --check mode that runs the sum program and asserts the final AC is 8 and DATA[0xD] is 8, exiting non-zero on mismatch.',
      },
    ],
    starterCode: {
      title: 'Simulator skeleton with fetch-decode-execute phases',
      language: 'c',
      code: `#include <stdio.h>
#include <stdint.h>

#define DATA_SIZE 16
#define CYCLE_LIMIT 1000

typedef struct {
    uint8_t pc;      /* 4-bit: keep masked */
    uint8_t ir;
    uint8_t ac;      /* 8-bit: wraps naturally */
    int halted;
    uint8_t data[DATA_SIZE];
} Machine;

static const char *mnemonic(uint8_t op) {
    switch (op) {
        case 0x0: return "HALT";
        case 0x1: return "LOAD";
        case 0x2: return "STORE";
        case 0x3: return "ADD";
        case 0x4: return "SUB";
        case 0x5: return "LOADI";
        case 0x6: return "JMP";
        case 0x7: return "JZ";
        default:  return "???";
    }
}

static void step(Machine *m, const uint8_t *prog, uint32_t progLen, uint32_t cycle) {
    /* TODO fetch: load ir from prog[m->pc], increment pc (mask 0x0F) */

    /* TODO decode: opcode = m->ir >> 4; operand = m->ir & 0x0F; */

    /* TODO execute: switch (opcode) { ... set m->halted on 0x0 } */

    /* TODO trace: printf the cycle line in the fixed format */

    (void)progLen; (void)cycle;
}

int main(void) {
    static const uint8_t sum_prog[] = { 0x53, 0x3C, 0x2D, 0x00 };
    Machine m = { 0 };
    m.data[0xC] = 5;                       /* DATA[0xC] = 5 */

    for (uint32_t cyc = 1; cyc <= CYCLE_LIMIT && !m.halted; cyc++) {
        step(&m, sum_prog, sizeof(sum_prog), cyc);
    }
    printf("final AC=%u DATA[0xD]=%u\\n", m.ac, m.data[0xD]);
    return 0;
}`,
      explanation: [
        'The Machine struct is the entire architectural state; nothing else may influence results.',
        'step() is deliberately phase-structured: fetch, then decode, then execute, then trace — mirroring the lesson cycle exactly.',
        'ac is uint8_t, so 8-bit wrap-around (the SUB overflow case from lesson practice) happens automatically.',
        'The starter main runs the module-01 sum program; completing step() should print final AC=8 DATA[0xD]=8.',
      ],
    },
    testPlan: [
      'Sum program: final AC = 8 and DATA[0xD] = 8 after exactly 4 cycles.',
      'Countdown program: DATA[0xF] holds 3, then 2, then 1 across passes; machine halts with AC = 0.',
      'Trace lines for the first two cycles match the hand trace in carc-m01-l3 exactly (diff test).',
      'Runaway: a program of only JMP 0x0 bytes (0x60 repeated) stops at the cycle limit with a named-PC error, not a crash.',
      'Overflow: LOAD 0x5 / ADD 0x5 with DATA[0x5] = 200 ends with AC = 144 (400 mod 256).',
      'JZ fall-through: JZ with nonzero AC does not jump; the next sequential instruction executes.',
    ],
    expectedResults:
      'A console program that prints a fixed-format trace per cycle for any Toy-1 program, halts on HALT, detects runaway programs, and passes all six test-plan cases. The trace of the sum program is byte-for-byte comparable with the hand trace in module 01, lesson 3.',
    troubleshooting: [
      'Trace shows PC skipping instructions: you are incrementing PC in both fetch and execute — increment only in fetch.',
      'LOAD returns wrong data: check that the operand is used as the data-memory index and that you preloaded DATA[0xC].',
      'Loop program never halts: confirm JZ targets 0x6 (byte 0x76) and that STORE 0xE writes the decremented value back.',
      'AC shows 400 instead of 144: you promoted ac to a wider type; it must be uint8_t.',
      'Trace lines do not match the lesson: lock the printf format first, then compare field by field.',
    ],
  },
];
