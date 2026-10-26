import type { TutorialProject } from '../types';

export const digitalVerificationProjects: TutorialProject[] = [
  {
    id: 'dver-proj-fifo-verification',
    title: 'FIFO Verification: From Plan to Passing Regression',
    level: 'intermediate',
    summary:
      'Take a synchronous FIFO from a written specification through a full verification cycle: plan with a corner matrix, self-checking reference-model testbench, seeded random regression, and a verification report that states exactly what was proven.',
    useCase:
      'The exact workflow a junior verification engineer is handed on day one: here is a block, here is the spec, give me evidence it works. FIFO verification is also the most common practical interview exercise in the industry.',
    requirements: [
      'A synchronous FIFO DUT (write your own from the Verilog course, or use the RTL Design course FIFO project) with WIDTH and DEPTH parameters',
      'A written spec stating flag timing (registered or combinational), simultaneous read+write behavior at full and empty, and reset semantics',
      'A self-checking testbench with a spec-written reference model',
      'Directed tests for every row of the corner matrix',
      'A seeded random regression of at least 500 stimulus cycles with flags checked every cycle and ordering checked at every read',
      'Reproducibility: seed accepted from the command line and printed with every failure message',
    ],
    learningOutcomes: [
      'Convert a block specification into a corner matrix and then into directed tests',
      'Build a cycle-aligned reference model and scoreboard in portable Verilog-2001',
      'Run a reproducible random regression with per-failure diagnostic output',
      'Write a verification report that separates proven claims from untested assumptions',
    ],
    prerequisites: [
      'Modules 1-4 of this course',
      'Verilog testbench construction (Verilog course, Modules 14 and 16)',
    ],
    architecture:
      'Single testbench module: parameterized DUT instance; reference model (array + head/tail/count) updated on the same clock with the spec accept/reject rules; a flags comparator running every cycle; an ordering check inside the read path; a stimulus generator with directed mode and seeded-random mode selected by a plusarg; a final PASS/FAIL summary with error count and seed.\n\nThe reference model is the heart: it is written from the spec before the DUT is read, and every checker compares against it. Failures print time, expected, actual and seed — a failure message is a debug plan, not just a flag.',
    steps: [
      {
        title: 'Write the spec (or extract it)',
        detail:
          'One page: parameters, port list, flag timing convention, accept/reject rules for the four boundary cases, ordering guarantee, reset behavior. Any sentence you cannot write is a spec gap — file it and pick the answer explicitly.',
      },
      {
        title: 'Build the corner matrix',
        detail:
          'The state x operation table from Module 04 lesson 1. Each row gets a name that becomes both the directed test name and a coverage point.',
      },
      {
        title: 'Implement the reference model and flags checker',
        detail:
          'Array + indices + count, updated at posedge with the accept rules; flags compared every cycle with !==. Drive at negedge, check after posedge.',
      },
      {
        title: 'Implement directed tests, one per matrix row',
        detail:
          'Each test sets up its state precisely (fill to full, drain to empty, park at partial), performs the operation, and checks flags plus contents/order. One failure message format everywhere: time, expected, actual.',
      },
      {
        title: 'Add the seeded random generator',
        detail:
          'Per cycle, random wen/ren/data from $random(seed) with the seed read via $value$plusargs. Run 500+ cycles; the model and checkers already do the work.',
      },
      {
        title: 'Run the regression and write the report',
        detail:
          'Run at least three seeds. For each failure: minimize, diagnose, fix or file. The report lists: what was verified (matrix rows hit, seeds run), what was found, what remains untested (be explicit — e.g. "low-power modes out of scope").',
      },
    ],
    testPlan: [
      'Reset test: flags empty after reset, contents cleared',
      'Fill-to-full test: full asserts exactly at the last accepted write',
      'Drain-to-empty test: empty asserts exactly at the last accepted read; ordering holds',
      'Rejected write at full: contents and count unchanged',
      'Rejected read at empty: no state change',
      'Simultaneous read+write at full and at empty: per the spec sentences',
      'Wrap stress: pointers wrap at least three times under random stimulus',
      'Reset mid-stream: recovery to empty, next operations correct',
      'Random regression: 3 seeds x 500+ cycles, zero flag or ordering mismatches',
    ],
    expectedResults:
      'Every directed test passes; the random regression reports zero errors for every seed; failures during development were minimized and each one produced either an RTL fix or a spec clarification. The final report states the evidence honestly — including which corners were deliberately left untested.',
    troubleshooting: [
      {
        title: 'Checker fires only in random mode',
        detail:
          'Almost always a TB race or a flag-timing assumption. Re-check that stimulus drives at negedge and the model uses the spec flag convention; a failure that appears only under random stimulus is often a legitimate boundary interleaving your directed tests never produced — minimize it before assuming a TB bug.',
      },
      {
        title: 'Model and DUT disagree permanently from cycle 1',
        detail:
          'Parameter mismatch or reset semantics mismatch: confirm the DUT instance parameters match the model dimensions and that both leave reset in the same state.',
      },
      {
        title: 'Random test hangs',
        detail:
          'A wait condition that can never be satisfied (e.g. waiting for empty while the generator keeps writing). Bound every wait with a timeout that fails the test with a message — a hang is a finding, not a lost terminal.',
      },
    ],
  },
  {
    id: 'dver-proj-register-suite',
    title: 'Register Block Verification Suite',
    level: 'intermediate',
    summary:
      'Build a reusable, table-driven register verification suite — reset sweep, access-type checks (RW, RO, W1C), bit isolation, and unmapped-address probes — that you can point at any register block and run in one command.',
    useCase:
      'Register maps change constantly during a project, and re-verifying them by hand is where escapes happen. A table-driven suite means adding a register is one table row, and the whole interface contract re-verifies itself in every nightly regression.',
    requirements: [
      'A register-block DUT with a simple bus interface (write enable + address + data, read enable + address + data) and at least: two RW registers, one RO status register, one W1C register, and one unmapped address hole',
      'A register table in the testbench listing address, width, access type and reset value per field',
      'Checker tasks per access type, driven entirely from the table — zero register-specific code in the suite body',
      'Bit-isolation sequences for every multi-field register',
      'A single PASS/FAIL verdict with per-register result lines',
    ],
    learningOutcomes: [
      'Design table-driven verification so new registers cost one table row',
      'Enforce the full access-type contract including W1C write-zero-preserves semantics',
      'Probe unmapped-address behavior against a spec sentence rather than an accident',
      'Package a suite that a team can drop into any regression',
    ],
    prerequisites: [
      'Module 04 lesson 2 (register verification patterns)',
      'Verilog tasks and arrays (Verilog course)',
    ],
    architecture:
      'Three layers: (1) bus tasks that encapsulate the protocol timing once; (2) checker tasks per access type (check_rw with walking-1s, check_ro with ignored writes, check_w1c with backdoor-driven status, check_reset sweep, check_unmapped); (3) the register table plus a driver loop that walks the table and dispatches the right checker per row. The table is the only file region a spec change touches.',
    steps: [
      {
        title: 'Write the register table',
        detail:
          'Arrays of address, mask, access type and reset value, transcribed from the spec. Keep the spec and the table side by side in review so drift is caught.',
      },
      {
        title: 'Implement the bus tasks',
        detail:
          'bus_write and bus_read with the DUT\'s exact protocol timing (wait states, ready) — all later code uses these and never touches the wires again.',
      },
      {
        title: 'Implement the per-type checkers',
        detail:
          'Walking-1s readback for RW; write-and-verify-unchanged for RO (with backdoor forcing of the status source); the full W1C sub-check set including write-zero-preserves and neighbor isolation; the reset sweep; the unmapped probe.',
      },
      {
        title: 'Drive everything from the table',
        detail:
          'One loop: for each register, dispatch by access type, then run bit isolation between field pairs of multi-field registers. Print one PASS line per register.',
      },
      {
        title: 'Stress the W1C re-assert corner',
        detail:
          'For each W1C field: force the event, clear it, force it again immediately, verify the second event is not lost (or matches the spec\'s stated behavior).',
      },
      {
        title: 'Summarize and integrate',
        detail:
          'Final verdict line with error count; hook the suite into the same regression infrastructure as the FIFO project so both run nightly.',
      },
    ],
    testPlan: [
      'Reset sweep: every readable register returns its documented reset value',
      'RW walking-1s readback on every RW field',
      'RO: all-ones and all-zeros writes leave the value unchanged',
      'W1C: write-zero preserves; single-bit clears surgically; neighbor fields undisturbed',
      'W1C re-assert: event arriving immediately after clear is not lost',
      'Bit isolation: program field A, write field B, re-read A — unchanged',
      'Unmapped addresses: probed per the spec sentence (file the gap if the spec is silent)',
    ],
    expectedResults:
      'One PASS line per register and a final TEST PASS with zero errors. Seeded bugs (a W1C that clears on any write, a decode that aliases an unmapped address onto CTRL) each flip the verdict with a message naming the address and access type.',
    troubleshooting: [
      {
        title: 'RO check fails although the register is correct',
        detail:
          'The status source was not forced to a known state before the write attempts — a RO register reflects its source, so "unchanged" is only checkable against a driven value. Force the source first.',
      },
      {
        title: 'Reads return x on unmapped addresses',
        detail:
          'An undriven decode path. That is a finding (the spec must define the behavior), not a testbench bug — file it, then encode whichever behavior the spec chooses.',
      },
      {
        title: 'Bit isolation fails on one field pair only',
        detail:
          'Look for a shared mask or decode term covering both fields in the RTL; reproduce with the smallest sequence (program A, one write to B) before reporting — the minimal case is the bug report.',
      },
    ],
  },
];
