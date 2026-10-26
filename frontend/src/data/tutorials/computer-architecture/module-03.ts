import type { TutorialLesson } from '../types';

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'carc-m03-l1',
    title: 'Why Pipelining: The Quantitative Laundry Analogy',
    summary:
      'Overlap instruction stages like overlapping laundry loads: the five-stage pipeline, throughput arithmetic, and why the ideal speedup equals the number of stages.',
    objectives: [
      'Explain pipelining as overlapping the stages of successive tasks.',
      'Compute sequential versus pipelined completion time for N tasks and K stages.',
      'Name the five classic pipeline stages (IF, ID, EX, MEM, WB) and what each does.',
      'Show that pipelined execution improves throughput, not the latency of a single instruction.',
    ],
    whyItMatters:
      'Pipelining is the single most important performance idea in processor design — every modern CPU is a deep pipeline (or several). Its arithmetic is simple enough to do on a napkin, which makes it the perfect first quantitative tool: by the end of this lesson you can predict a speedup from stage counts and instruction counts, and you know exactly why the ideal is never quite reached.',
    prerequisites: [
      'carc-m01-l3 (fetch-decode-execute cycle)',
    ],
    explanation:
      '### The laundry analogy, made quantitative\n\nDoing laundry has three stages, each 30 minutes: wash, dry, fold. Four sequential loads take 4 x 3 x 30 = **360 minutes**. But the washer, dryer and folding table can all work at once: while load 2 washes, load 1 dries. Pipelined, the schedule is: load 1 finishes its three stages at minute 90, and then one load completes every 30 minutes. Total for four loads: 3 x 30 + 3 x 30 = **180 minutes** — half the time, with no new equipment.\n\nFor N tasks and K stages of t minutes each:\n\n```\nsequential time = N x K x t\npipelined time  = K x t + (N - 1) x t\nspeedup         = N x K / (K + N - 1)  ->  K as N grows\n```\n\nThe speedup approaches the number of stages K. Pipelining does not make any single load finish sooner — load 1 still takes 90 minutes. It makes *finished loads per hour* three times higher. **Throughput, not latency.**\n\n### The five-stage instruction pipeline\n\nThe same trick applies to instructions, whose fetch-decode-execute journey decomposes into five classic stages:\n\n- **IF** — instruction fetch: read the instruction at PC from memory.\n- **ID** — instruction decode: interpret opcode/operands, read registers.\n- **EX** — execute: ALU operation or address calculation.\n- **MEM** — memory access: load or store data (no-op for pure ALU instructions).\n- **WB** — write back: deposit the result into the destination register.\n\nWith each stage taking one cycle, five instructions in flight at once retire one per cycle in the ideal case — a fivefold throughput gain over a machine that finishes each instruction before starting the next. The stage *latches* between stages carry each instruction\'s state forward, exactly like laundry baskets between machines.',
    deepDive:
      '### Where the ideal leaks\n\nThe formula K x t + (N-1) x t assumes every stage is perfectly balanceable and every instruction uses every stage. Reality: stages cannot always be split evenly (the slowest stage sets the clock), some instructions skip MEM, memory access is far slower than a cycle (hence caches, module 02), and dependencies between instructions force stalls — the subject of the next lesson. A real five-stage pipeline runs close to, but never exactly at, one instruction per cycle. Deeper pipelines (14-20 stages in modern designs) push ideal speedup higher but pay more per stall, which is why pipeline depth is a genuine engineering trade-off rather than "more is better".\n\n### Throughput, visualised\n\nThe cycle diagram below shows the standard way pipeline schedules are drawn: instructions on rows, clock cycles on columns, one stage per cell. Once the pipe fills, the diagonal pattern repeats every cycle. Learn to read these diagrams fluently — every hazard analysis in the next lesson is drawn this way.',
    examples: [
      {
        title: 'Pipeline speedup calculation',
        language: 'c',
        code: `#include <stdio.h>

int main(void) {
    int stages = 5;
    double stageTime = 1.0;      /* ns per stage */
    int n = 1000;                /* instructions */

    double serial    = n * stages * stageTime;
    double pipelined = (stages + (n - 1)) * stageTime;
    printf("serial    = %.0f ns\\n", serial);
    printf("pipelined = %.0f ns\\n", pipelined);
    printf("speedup   = %.2f\\n", serial / pipelined);
    return 0;
}`,
        explanation: [
          'Serial execution: each of the 1000 instructions occupies all 5 stages alone: 1000 x 5 x 1 ns = 5000 ns.',
          'Pipelined: the first instruction fills the pipe (5 cycles), then one instruction completes per cycle for the remaining 999: 5 + 999 = 1004 ns.',
          'Speedup = 5000 / 1004 = 4.98 — nearly the ideal 5x, because n is large compared to K.',
          'The program prints: serial = 5000 ns / pipelined = 1004 ns / speedup = 4.98.',
          'With n = 10 instead, speedup would be 50 / 14 = 3.57 — short programs pay the fill cost.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Five-stage pipeline schedule, no stalls',
        content:
          '          cycle:  1    2    3    4    5    6    7    8    9\n  I1 (add)        IF   ID   EX   MEM  WB\n  I2 (sub)             IF   ID   EX   MEM  WB\n  I3 (load)                 IF   ID   EX   MEM  WB\n  I4 (xor)                       IF   ID   EX   MEM  WB\n  I5 (or)                             IF   ID   EX   MEM  WB\n\n  After cycle 5 one instruction completes every cycle.\n  Each column shows five instructions in flight, one per stage.',
        caption:
          'The classic pipeline diagram: instructions advance one stage per cycle, filling the machine like loads filling a laundry room.',
      },
      {
        kind: 'block',
        title: 'Stage-by-stage responsibility',
        content:
          '  +----+   +----+   +----+   +-----+   +----+\n  | IF |-->| ID |-->| EX |-->| MEM |-->| WB |\n  +----+   +----+   +----+   +-----+   +----+\n   fetch    decode   ALU /    data      write\n   at PC    + reg    address  cache     result\n            read     op                 to reg',
        caption:
          'Each stage is one slice of the fetch-decode-execute cycle. Stage latches between them carry the instruction\'s state forward every cycle.',
      },
    ],
    tables: [
      {
        caption: 'Laundry pipeline: 4 loads, 3 stages of 30 minutes',
        headers: ['Minute', 'Washer', 'Dryer', 'Folding table'],
        rows: [
          ['0-30', 'load 1', 'idle', 'idle'],
          ['30-60', 'load 2', 'load 1', 'idle'],
          ['60-90', 'load 3', 'load 2', 'load 1'],
          ['90-120', 'load 4', 'load 3', 'load 2'],
          ['120-150', 'idle', 'load 4', 'load 3'],
          ['150-180', 'idle', 'idle', 'load 4'],
        ],
      },
      {
        caption: 'Sequential versus pipelined totals',
        headers: ['Approach', 'Formula', 'Time for 4 loads', 'Time for N loads'],
        rows: [
          ['Sequential', 'N x K x t', '4 x 90 = 360 min', 'N x 90 min'],
          ['Pipelined', 'K x t + (N-1) x t', '90 + 3 x 30 = 180 min', '90 + (N-1) x 30 min'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Saying pipelining makes each instruction run faster.',
        fix: 'A single instruction still passes through all five stages — its latency is unchanged (or slightly worse, due to latch overhead). Pipelining raises throughput: more instructions finish per second.',
      },
      {
        mistake: 'Using the ideal speedup formula for tiny instruction counts.',
        fix: 'Speedup = N x K / (K + N - 1) only approaches K for large N. For N = K = 5 it is 25/9 = 2.78, not 5. The fill and drain of the pipe dominate short bursts.',
      },
      {
        mistake: 'Assuming all instructions use all stages.',
        fix: 'Pure ALU instructions idle in MEM; stores do nothing in WB. Real pipelines still reserve the stage (structural simplicity), which is fine as long as no other instruction needs that stage at that moment.',
      },
    ],
    guidedPractice: {
      title: 'Schedule a three-stage toy pipeline',
      brief:
        'A toy CPU has stages F (fetch), D (decode), E (execute), one cycle each. Draw (or tabulate) the schedule for 6 instructions, then compute the total cycles and the speedup versus sequential execution of 6 x 3 = 18 cycles.',
      expectedBehavior:
        'Pipelined total = K + (N-1) = 3 + 5 = 8 cycles. Speedup = 18 / 8 = 2.25. Instruction i enters F at cycle i and retires at cycle i + 2.',
      hints: [
        'The first instruction retires at cycle K = 3.',
        'After that, one retires per cycle: instructions 4, 5, 6 retire at cycles 6, 7, 8.',
        'Speedup = 18 / 8.',
      ],
    },
    practiceExercises: [
      {
        title: 'Deeper is not free',
        brief:
          'Compare a 5-stage pipeline and a 20-stage pipeline, each with 1 ns stages, running 1000 instructions with no stalls. Compute both completion times and the speedup of deep over shallow. Then state one reason a designer might still choose the shallow pipe.',
        expectedBehavior:
          '5-stage: 5 + 999 = 1004 ns. 20-stage: 20 + 999 = 1019 ns. Speedup = 1004 / 1019 = 0.985 — with only 1000 ideal instructions the deeper pipe is actually slightly *slower* (more fill cost, more latches). Reasons for shallow: fewer stall penalties per hazard (next lesson), less power per latch, simpler design.',
        hints: [
          'Use completion = K + (N - 1) cycles for both.',
          'The deep pipeline only wins when stalls are rare AND N is very large.',
        ],
      },
      {
        title: 'Balance the stages',
        brief:
          'A pipeline has stages of 2, 2, 8 and 1 ns. What is its clock period and throughput? If the 8 ns stage can be split into two 4 ns stages, recompute. Comment on the change.',
        expectedBehavior:
          'Unbalanced: clock = 8 ns, one instruction every 8 ns regardless of the fast stages. Split: clock = 4 ns, throughput doubles to one per 4 ns (with 5 stages, fill cost 20 ns). Balancing stages matters more than adding stages.',
        hints: [
          'A pipeline runs at the speed of its slowest stage.',
          'Splitting the bottleneck stage raises the clock; everything else was already waiting on it.',
        ],
      },
    ],
    assessment: {
      title: 'Pipelining fundamentals checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What is the correct order of the five classic pipeline stages?',
          options: [
            'IF, ID, EX, MEM, WB',
            'IF, EX, ID, WB, MEM',
            'ID, IF, MEM, EX, WB',
            'IF, ID, MEM, EX, WB',
          ],
          answer: 'IF, ID, EX, MEM, WB',
          explanation:
            'Fetch, decode (with register read), execute, memory access, write back. Memory access follows execute because the address is computed in EX.',
          hint: 'You cannot decode what you have not fetched, or use memory before computing its address.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: 'int stages = 5;\nint n = 1000;\ndouble serial = n * stages;\ndouble pipelined = stages + (n - 1);\nprintf("speedup = %.2f", serial / pipelined);',
          options: ['speedup = 5.00', 'speedup = 4.98', 'speedup = 0.20', 'speedup = 2.50'],
          answer: 'speedup = 4.98',
          explanation:
            'serial = 5000, pipelined = 5 + 999 = 1004, and 5000 / 1004 = 4.9801..., which prints as 4.98. Slightly under the ideal 5 because of pipe fill.',
          hint: 'Compute 5 + 999 first.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In a pipelined machine, the first instruction of a program completes faster than it would in an equivalent non-pipelined machine.',
          answer: 'false',
          explanation:
            'The first instruction experiences the full pipeline depth — its latency is unchanged or slightly worse (latch overhead). Pipelining improves the *rate* at which subsequent instructions complete.',
          hint: 'Think about the very first laundry load: does it finish sooner because the dryer was free?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Four laundry loads, three stages of 30 minutes: how many minutes does the pipelined schedule take in total (number only)?',
          answer: '180',
          explanation:
            'Fill (3 x 30 = 90) plus three more loads at 30 minutes each = 90 + 90 = 180 minutes, versus 360 sequentially — speedup 2.0.',
          hint: 'First load takes K x t; every subsequent load adds one stage time.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Pipeline', definition: 'An arrangement where multiple instructions occupy different execution stages simultaneously, raising throughput.' },
      { term: 'Stage latch', definition: 'A register between pipeline stages that carries an instruction\'s state to the next stage each cycle.' },
      { term: 'Throughput', definition: 'Instructions completed per unit time — the quantity pipelining improves.' },
      { term: 'Latency', definition: 'Time for one instruction to travel start to finish — essentially unchanged by pipelining.' },
      { term: 'Fill/drain', definition: 'The startup and shutdown periods when the pipeline is not yet (or no longer) full.' },
    ],
    revisionSummary: [
      'Pipelining overlaps stages of successive instructions: throughput up, latency unchanged.',
      'Time = K x t (fill) + (N-1) x t; speedup approaches K for large N.',
      'Five classic stages: IF, ID, EX, MEM, WB.',
      'Ideal speedup assumes balanced stages, full-stage instructions, and no hazards — the next lesson removes those assumptions.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Instruction pipelining', url: 'https://en.wikipedia.org/wiki/Instruction_pipelining', kind: 'article' },
      { label: 'Wikipedia — Pipeline (computing)', url: 'https://en.wikipedia.org/wiki/Pipeline_(computing)', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'carc-m03-l2',
    title: 'Hazards: Structural, Data and Control',
    summary:
      'What breaks the perfect pipeline: resource clashes, dependencies between instructions (RAW and forwarding), and branches that redirect fetch — plus stalls, bubbles and the cycle diagrams to analyse them.',
    objectives: [
      'Define structural, data (RAW/WAR/WAW) and control hazards.',
      'Trace a RAW dependency with and without forwarding and count the stall cycles.',
      'Draw and read pipeline diagrams containing bubbles.',
      'Explain why load-use dependencies cost one cycle even with forwarding.',
    ],
    whyItMatters:
      'Hazards are where pipeline theory meets reality: the speedup you computed last lesson shrinks by exactly the number of bubbles you fail to eliminate. Forwarding, stalls and branch handling are the mechanisms every real CPU uses, and reading pipeline diagrams is a skill you will reuse in RTL design, performance profiling and interviews.',
    prerequisites: [
      'carc-m03-l1 (five-stage pipeline, cycle diagrams)',
      'carc-m01-l2 (registers and flags)',
    ],
    explanation:
      'A **hazard** is any situation where the next instruction cannot enter its next stage in the following cycle. There are three families:\n\n### Structural hazards\n\nTwo instructions need the same hardware resource in the same cycle — for example, one fetching an instruction while another accesses data memory, with only one memory port. Classic five-stage designs avoid this by splitting instruction and data access (separate I-cache and D-cache). Structural hazards are solved with *more hardware* or *stalling*.\n\n### Data hazards\n\nAn instruction needs a result that a previous instruction has not finished producing. The important case is **read-after-write (RAW)**: the consumer reads a register before the producer writes it.\n\n```\nI1: ADD R1, R2, R3     ; R1 written in WB (cycle 5)\nI2: SUB R4, R1, R5     ; needs R1 in EX (cycle 4)\n```\n\nWithout help, I2 must **stall** until I1\'s WB. If the register file supports writing in the first half of a cycle and reading in the second half, I2 can read R1 in its ID stage in cycle 5 — costing **two bubbles**. The fix is **forwarding** (bypassing): wire I1\'s EX/MEM result register straight into the ALU inputs, so I2\'s EX in cycle 4 receives R1 without waiting for WB. With forwarding, this sequence has **zero stalls**. One dependency still cannot be forwarded in time: **load-use**, where I2 needs data that I1 is still fetching from memory in MEM (cycle 4) — I2\'s EX is also cycle 4, one cycle too early, so **one bubble is unavoidable** (and compilers schedule independent instructions into that slot).\n\n(WAR and WAW hazards — writing in the wrong order — do not occur in the simple in-order five-stage design; they appear in out-of-order machines.)\n\n### Control hazards\n\nFetch does not know the next instruction\'s address until a branch resolves in EX. Meanwhile fetch has speculatively fetched sequential instructions. If the branch is taken, those fetched instructions are wrong and must be squashed — **flushed** — wasting their cycles. The simplest policy, *predict not-taken*, keeps fetching sequentially and only pays on taken branches. Modern predictors (next lesson) guess direction *and* target.',
    deepDive:
      '### Reading a stall diagram\n\nBubbles are drawn as gaps (—) in an instruction\'s row: the instruction sits in ID, unable to advance. Each bubble is one lost issue slot — the machine cycles through it doing nothing useful. Count bubbles, not confusion: the entire discipline of hazard analysis is *counting lost slots*, then eliminating them by reordering code (compilers), forwarding paths (hardware) or prediction (both).',
    examples: [
      {
        title: 'RAW dependency: two stalls without forwarding, zero with',
        language: 'text',
        code: `Program:
  I1: ADD R1, R2, R3
  I2: SUB R4, R1, R5     (RAW on R1)

WITHOUT forwarding (register file: write first half, read second half):

  cycle:        1    2    3    4    5    6    7
  I1            IF   ID   EX   MEM  WB
  I2                 IF   ID   --   --   EX   MEM  WB
                            ^^^^^^ two bubbles:
                            I2 waits in ID until R1 is written (cyc 5)

  Lost slots: 2

WITH forwarding (EX/MEM result bypassed to ALU input):

  cycle:        1    2    3    4    5
  I1            IF   ID   EX   MEM  WB
  I2                 IF   ID   EX   MEM  WB
                                 ^
                                 I2's EX uses I1's result
                                 forwarded from EX/MEM latch: 0 stalls

LOAD-USE (one bubble even with forwarding):

  cycle:        1    2    3    4    5    6
  I1: lw R1,0(R2) IF  ID   EX   MEM  WB
  I2: add R3,R1,R4        IF   ID   --   EX   MEM  WB
                                        ^
                            R1 leaves memory at end of MEM (cyc 4),
                            but I2's EX is already cyc 4 -> 1 bubble`,
        explanation: [
          'Without forwarding, I2 sits in decode for two cycles: the register file can only forward a write in the same cycle (write first half, read second half), so I2 reads R1 in cycle 5 and executes in cycle 6.',
          'With forwarding, I1\'s ALU result exists at the end of cycle 3 in the EX/MEM latch; a bypass mux feeds it to I2\'s ALU input during cycle 4 — no wait for WB.',
          'Load-use is different: I1\'s data does not exist until the end of MEM (cycle 4), the same cycle I2 wants it in EX, so the earliest usable forward arrives one cycle late — one bubble, even with full forwarding.',
          'Every bubble is a lost throughput slot: the ideal one-instruction-per-cycle drops to one per 1.x cycles proportional to the bubble frequency.',
          'Compilers hide load-use slots by filling them with an independent instruction (instruction scheduling).',
        ],
      },
      {
        title: 'Counting RAW stalls in a five-instruction stream',
        language: 'c',
        code: `#include <stdio.h>
#include <stdint.h>

int main(void) {
    /* Instruction stream: dest regs and source regs (toy encoding) */
    /* format: {dest, src1, src2}; 0xFF means "no register" */
    const uint8_t prog[5][3] = {
        { 1, 2, 3 },    /* I0: R1 <- R2 op R3 */
        { 4, 1, 5 },    /* I1: R4 <- R1 op R5   (RAW on R1) */
        { 6, 4, 1 },    /* I2: R6 <- R4 op R1   (RAW on R4) */
        { 7, 6, 0 },    /* I3: R7 <- R6 op R0   (RAW on R6) */
        { 8, 7, 2 }     /* I4: R8 <- R7 op R2   (RAW on R7) */
    };
    int stalls = 0;
    for (int i = 1; i < 5; i++) {
        for (int s = 1; s < 3; s++) {
            if (prog[i][s] == prog[i - 1][0]) {
                printf("I%d depends on I%d (R%u): 1 stall without forwarding\\n",
                       i, i - 1, prog[i][s]);
                stalls++;
            }
        }
    }
    printf("total load-free RAW stalls: %d\\n", stalls);
    return 0;
}`,
        explanation: [
          'Each instruction is described by destination and source register numbers — the minimum needed to detect RAW hazards.',
          'The detector compares each instruction\'s sources against the *previous* instruction\'s destination: a back-to-back dependency costs one slot without forwarding (two with the no-bypass register file).',
          'I1 uses R1 (I0\'s destination), I2 uses R4 (I1\'s), I3 uses R6 (I2\'s), I4 uses R7 (I3\'s): four dependencies.',
          'I2\'s second source R1 does not match I1\'s destination R4 — by the time I2 executes, I0\'s write is visible, so no extra stall (this simple one-back model).',
          'The program prints four dependency lines and: total load-free RAW stalls: 4.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Forwarding path around the ALU',
        content:
          '        +--------------------------------------+\n        |           EX/MEM pipeline latch      |\n        |   (I1\'s ALU result, end of cycle 3)  |\n        +------|----------------|---------------+\n               |                |\n               v                v\n          +--mux--+        +--mux--+\n   ID/EX--|bypass |  regs--|bypass |--> ALU --> I2 result\n          +-------+        +-------+\n            ^  forwarding unit: compares destination/source\n               register numbers each cycle and selects the\n               youngest matching result',
        caption:
          'Forwarding is just multiplexers plus a comparator: if the instruction in EX needs a register produced by the instruction in MEM, feed it directly from the latch instead of the register file.',
      },
    ],
    tables: [
      {
        caption: 'Hazard families and standard remedies',
        headers: ['Hazard', 'Cause', 'Classic remedy'],
        rows: [
          ['Structural', 'Two instructions need one resource in one cycle', 'Duplicate the resource (split I/D caches) or stall'],
          ['Data: RAW', 'Consumer reads a register before producer writes it', 'Forwarding; stall when forwarding cannot arrive in time (load-use)'],
          ['Data: WAR/WAW', 'Out-of-order writes/read ordering', 'Not present in simple in-order 5-stage; handled by renaming in OoO cores'],
          ['Control', 'Next fetch address unknown until branch resolves', 'Predict (not-taken or learned), flush on mispredict'],
        ],
      },
      {
        caption: 'Stall costs for back-to-back dependent ALU work (5-stage, with forwarding)',
        headers: ['Pattern', 'Bubbles', 'Why'],
        rows: [
          ['ALU result used by next ALU instruction', '0', 'EX/MEM forward arrives exactly at consumer EX'],
          ['Load result used by next instruction', '1', 'Data ready end of MEM; consumer EX is one cycle too early'],
          ['Load result used two instructions later', '0', 'The intervening instruction fills the slot'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Believing forwarding eliminates all data hazards.',
        fix: 'Forwarding eliminates *ALU-to-ALU* RAW stalls. Load-use still costs one bubble because the data physically does not exist until after MEM. The load-use stall is a latency fact, not a wiring choice.',
      },
      {
        mistake: 'Drawing the dependent instruction\'s EX in the same cycle as the producer\'s MEM and calling it forwarded.',
        fix: 'A value forwarded *from* MEM is available at the *end* of that cycle; the consumer\'s EX must be the following cycle. Check the latch boundaries in your diagram — forwarding moves values from the output of stage N to the input of stage N+1.',
      },
      {
        mistake: 'Treating a taken branch\'s fetched-but-wrong instructions as executed.',
        fix: 'They are squashed (flushed): their results are discarded and no state is written. The cost is only the lost issue slots — two in the classic 5-stage if the branch resolves in EX.',
      },
    ],
    guidedPractice: {
      title: 'Analyse a three-instruction sequence',
      brief:
        'Given: I1: lw R1, 0(R2); I2: add R3, R1, R4; I3: sub R5, R3, R6 — draw the 5-stage pipeline diagram with forwarding, count the bubbles, and state which dependency causes each.',
      expectedBehavior:
        'Two bubbles total. I2 stalls one cycle (load-use on R1 from I1). I3 stalls one cycle (RAW on R3 from I2, which itself was delayed). The dependent chain serialises: each bubble pushes the next instruction back.',
      hints: [
        'Draw I1-I3 as rows first, then insert bubbles from the load-use rule.',
        'I3\'s dependency is ALU-to-ALU (forwardable) — its stall comes from I2\'s delay, not from I2\'s result being unavailable.',
        'Count cycles until each EX: I2 EX in cycle 5, I3 EX in cycle 7.',
      ],
    },
    practiceExercises: [
      {
        title: 'Schedule around the load-use slot',
        brief:
          'Rewrite the order of: lw R1, 0(R2); add R3, R1, R4; or R5, R6, R7 — so that the sequence has zero bubbles with forwarding. Justify with the diagram rule you used.',
        expectedBehavior:
          'Place the independent or R5, R6, R7 between the load and its user: lw R1, 0(R2); or R5, R6, R7; add R3, R1, R4. The or occupies the slot where add would have bubbled; add\'s EX now lands one cycle after the load\'s MEM, so the forward works with zero stalls.',
        hints: [
          'The load-use bubble can be filled by any instruction that does not depend on the load.',
          'Check that moving the or earlier does not create a new dependency (it reads only R6, R7).',
        ],
      },
      {
        title: 'CPI with a stall mix',
        brief:
          'A program\'s dynamic mix: 25% loads, and half of the loads are immediately followed by an instruction using the loaded value. With forwarding, compute the CPI (base 1.0). Then recompute if the compiler removes half of those load-use pairs by scheduling.',
        expectedBehavior:
          'Load-use frequency = 0.25 x 0.5 = 12.5% of instructions, each costing 1 bubble: CPI = 1 + 0.125 = 1.125. After scheduling removes half: 0.0625 x 1 = CPI = 1.0625 — about a 5.6% speedup from instruction scheduling alone.',
        hints: [
          'Only the immediate-use pairs stall; uses two instructions later do not.',
          'CPI = 1 + bubbles per instruction, summed over the mix.',
        ],
      },
    ],
    assessment: {
      title: 'Hazards checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In the sequence ADD R1,R2,R3 followed immediately by SUB R4,R1,R5, what kind of hazard is the dependency on R1?',
          options: ['RAW (read after write)', 'WAR (write after read)', 'WAW (write after write)', 'Structural'],
          answer: 'RAW (read after write)',
          explanation:
            'The consumer (SUB) reads R1 before the producer (ADD) has written it — a true data dependency, the canonical RAW hazard.',
          hint: 'Which comes first in program order: the read or the write of R1?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt:
            'With full forwarding in the classic 5-stage pipeline, how many bubbles does lw R1, 0(R2) followed immediately by add R3, R1, R4 take?',
          code: 'I1: lw  R1, 0(R2)\nI2: add R3, R1, R4   /* full forwarding hardware */',
          options: ['0', '1', '2', '3'],
          answer: '1',
          explanation:
            'Load-use: the loaded value leaves memory at the end of MEM, one cycle after I2\'s EX would need it. One bubble is unavoidable; the MEM-to-EX forward serves it after the stall.',
          hint: 'Forwarding cannot send a value backwards in time.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Instructions squashed by a flushed branch may write their results to registers if the flush happens one cycle later.',
          answer: 'false',
          explanation:
            'Flushed instructions are cancelled entirely — no register or memory writes. That is exactly what makes speculation safe: the wrong-path instructions leave no trace except lost cycles.',
          hint: 'What would happen to program correctness if wrong-path instructions could write state?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'What hardware mechanism eliminates the two-bubble penalty for a back-to-back ALU-to-ALU RAW dependency (one word)?',
          answer: 'forwarding',
          explanation:
            'Forwarding (bypassing) routes the producer\'s result from the EX/MEM latch directly to the consumer\'s ALU input, removing the wait for the register-file write-back.',
          hint: 'It bypasses the register file entirely.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Hazard', definition: 'Any condition preventing the next instruction from executing in its designated cycle.' },
      { term: 'RAW hazard', definition: 'Read-after-write: an instruction needs a value the previous instruction has not yet written.' },
      { term: 'Forwarding (bypassing)', definition: 'Routing a producer\'s result directly from a pipeline latch to a consumer\'s ALU input, avoiding the wait for write-back.' },
      { term: 'Bubble (stall)', definition: 'A lost pipeline slot where an instruction cannot advance; drawn as a gap in the schedule.' },
      { term: 'Flush', definition: 'Discarding wrongly fetched (speculative) instructions after a branch misprediction.' },
      { term: 'Load-use hazard', definition: 'A RAW dependency on a load\'s data that costs one bubble even with forwarding.' },
    ],
    revisionSummary: [
      'Three hazard families: structural (resources), data (RAW true deps), control (branches).',
      'Back-to-back ALU RAW: 2 bubbles without forwarding, 0 with; load-use: 1 bubble regardless.',
      'Bubbles = lost issue slots; count them to quantify any pipeline analysis.',
      'Compilers schedule around load-use slots; hardware forwards around register dependencies.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Hazard (computer architecture)', url: 'https://en.wikipedia.org/wiki/Hazard_(computer_architecture)', kind: 'article' },
      { label: 'Wikipedia — Classic RISC pipeline', url: 'https://en.wikipedia.org/wiki/Classic_RISC_pipeline', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'carc-m03-l3',
    title: 'Branch Prediction, Superscalar ILP and the Road to RTL',
    summary:
      'Stop paying for branches: prediction concepts and their CPI arithmetic, squeezing past one instruction per cycle with superscalar issue, and how this maps onto building a pipelined CPU in RTL.',
    objectives: [
      'Explain why control hazards cost more in deep pipelines.',
      'Compute the CPI contribution of branch mispredictions from frequency, mispredict rate and flush cost.',
      'Describe static and dynamic branch prediction at a concept level.',
      'Define superscalar issue and ILP, and connect the pipeline model to RTL implementation.',
    ],
    whyItMatters:
      'Branches are 15-25% of typical instruction streams, and a misprediction in a deep pipeline throws away a dozen or more cycles of work. Branch prediction is one of the highest-leverage mechanisms in all of computer engineering — the difference between a 1.04 CPI and a 1.5 CPI machine. Understanding it, plus the superscalar idea, completes the story of how real CPUs exceed the one-instruction-per-cycle ceiling.',
    prerequisites: [
      'carc-m03-l2 (hazards, flushes)',
    ],
    explanation:
      '### The cost of guessing wrong\n\nWhen a branch resolves in EX (cycle 3), the two instructions already fetched (cycles 1-2) are wrong if the branch was taken. Flush cost: **two lost slots**. In deeper pipelines the branch resolves later, and the flush cost grows — a 14-stage machine may throw away 10+ slots per misprediction. This is why prediction matters more as pipelines deepen.\n\nThe CPI contribution is simple arithmetic:\n\n```\nCPI = 1 + branch_frequency x mispredict_rate x flush_cost\n```\n\nWith 20% branches, a 10% mispredict rate and a 2-cycle flush: CPI = 1 + 0.2 x 0.1 x 2 = **1.04**. Double the mispredict rate to 20% (a naive always-wrong predictor): CPI = 1.08. A bad predictor in a deeper machine with 12-slot flushes: CPI = 1 + 0.2 x 0.2 x 12 = 1.48 — half the machine\'s throughput gone on guesses.\n\n### Predictors, from static to dynamic\n\n- **Static**: decide at design/compile time — predict not-taken, predict backward-taken (loops iterate many times), or let the compiler hint. Zero hardware, mediocre accuracy.\n- **Dynamic, 1-bit/2-bit counters**: remember what this branch did last time. A 2-bit saturating counter tolerates one anomalous exit of a loop before flipping its prediction — the classic design.\n- **Correlating / tournament / TAGE-class predictors**: index large tables by branch address *and* recent history, capturing patterns like "every fourth iteration exits". Real predictors exceed 95% accuracy; the concept — learn per-branch behaviour in a table — is what all of them share.\n\n### Going past one per cycle: superscalar\n\nA pipeline overlap *stages*; a **superscalar** machine *replicates* the whole pipeline (multiple fetch, decode and ALU units) and issues 2-6 instructions per cycle in parallel. The limit is **instruction-level parallelism (ILP)** — how many independent instructions the stream actually contains. Dependencies serialize: no machine can multiply two numbers that depend on each other in the same cycle. Superscalar issue turns the CPI formula upside down: ideal CPI below 1 (e.g., 0.5 for 2-wide), with hazards and dependencies pushing it back up.',
    deepDive:
      '### From this course to the RTL course\n\nEverything in this module is directly buildable, and the platform\'s RTL pipelining course does build it. The correspondence: the five stages become five Verilogalways-block groups separated by pipeline registers; forwarding becomes two comparators and two muxes at the ALU inputs; the branch flush becomes a PC-mux select and an enable that turns the two wrong-path latches into no-ops; the 2-bit predictor becomes a small register file indexed by PC bits. When you write that RTL, the CPI arithmetic of this lesson becomes your verification plan: inject a dependency, count the bubble, assert the stall signal. Concept first, gates second — that ordering is why architecture is taught before digital design projects, not after.',
    examples: [
      {
        title: 'Branch misprediction CPI calculator',
        language: 'c',
        code: `#include <stdio.h>

int main(void) {
    double branchFreq     = 0.20;   /* 20% of instructions are branches */
    double mispredictRate = 0.10;   /* 10% of branches mispredicted */
    double flushCost      = 2.0;    /* wasted fetch+decode slots */

    double cpi = 1.0 + branchFreq * mispredictRate * flushCost;
    printf("CPI = %.2f\\n", cpi);

    /* deeper pipe: branch resolves late, flush costs 12 slots */
    flushCost = 12.0;
    mispredictRate = 0.20;
    cpi = 1.0 + branchFreq * mispredictRate * flushCost;
    printf("deep pipe, naive predictor: CPI = %.2f\\n", cpi);
    return 0;
}`,
        explanation: [
          'First case: 0.20 x 0.10 x 2 = 0.04, so CPI = 1.04 — the machine runs at 96% of ideal throughput.',
          'Second case: 0.20 x 0.20 x 12 = 0.48, so CPI = 1.48 — a deep pipeline with a poor predictor loses a third of its speed.',
          'The program prints: CPI = 1.04 / deep pipe, naive predictor: CPI = 1.48.',
          'The same branch frequency hurts more as pipelines deepen — which is precisely why predictor accuracy improved from ~70% (static) to >95% (modern dynamic) over CPU history.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Two-bit saturating counter behaviour',
        content:
          '   state 00 (strongly not-taken)\n      | taken -> 01                ^ not-taken -> 00\n      v                            |\n   state 01 (weakly not-taken) <---+\n      | taken -> 10                ^ not-taken -> 00\n      v                            |\n   state 10 (weakly taken)   <-----+\n      | taken -> 11                ^ not-taken -> 01\n      v                            |\n   state 11 (strongly taken) <-----+\n\n   A loop branch (taken 99 times, not-taken once):\n   lives in 10/11 and mispredicts only the final exit.',
        caption:
          'A 2-bit counter changes its mind only after two consecutive disagreements, so one unusual outcome does not flip the prediction. (Illustrative state diagram.)',
      },
      {
        kind: 'block',
        title: 'Superscalar issue: two instructions per cycle',
        content:
          '  cycle:        1     2     3     4     5\n  slot A:  I1: IF    ID    EX    MEM   WB\n  slot B:  I2: IF    ID    EX    MEM   WB\n  slot A:        I3:IF   I3:ID I3:EX ...\n  slot B:        I4:IF   I4:ID I4:EX ...\n\n  Two fetch/decode/execute lanes issue in parallel.\n  Only independent instruction pairs fill both slots:\n  if I4 depends on I3, slot B idles that cycle.',
        caption:
          'A 2-wide superscalar machine retires up to two instructions per cycle; dependencies and misses knock it back down. (Illustrative.)',
      },
    ],
    tables: [
      {
        caption: 'Predictor families at a glance',
        headers: ['Predictor', 'Idea', 'Typical accuracy (order of magnitude)'],
        rows: [
          ['Static (not-taken)', 'Always predict fall-through', '~60-70%'],
          ['Static (BTFN)', 'Backward taken (loops), forward not-taken', '~75-85%'],
          ['2-bit counter', 'Per-branch 2-bit saturating state', '~85-93%'],
          ['Correlating/history-based', 'Index tables by PC + recent outcomes', '~90-97%'],
          ['Modern hybrid (TAGE-class)', 'Multiple history lengths, tournament', '>95%'],
        ],
      },
      {
        caption: 'CPI contributions computed in this lesson',
        headers: ['Machine', 'Branch freq', 'Mispredict', 'Flush cost', 'CPI'],
        rows: [
          ['5-stage, good predictor', '0.20', '0.10', '2', '1.04'],
          ['5-stage, weak predictor', '0.20', '0.20', '2', '1.08'],
          ['Deep pipe, weak predictor', '0.20', '0.20', '12', '1.48'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Confusing the branch frequency with the mispredict rate.',
        fix: 'Frequency is how *often branches appear*; mispredict rate is how *often the guess is wrong*. They multiply: rare branches with terrible predictors still cost little.',
      },
      {
        mistake: 'Assuming superscalar means a deeper pipeline.',
        fix: 'Depth = more stages in one pipeline (latency structure). Width = several instructions per cycle through replicated hardware. They are independent axes, usually combined.',
      },
      {
        mistake: 'Expecting a 2-wide machine to double performance.',
        fix: 'Width only helps when independent instructions are available (ILP) and no lanes stall. Real code delivers maybe 60-80% of nominal width on average — dependencies, cache misses and branches all thin the stream.',
      },
    ],
    guidedPractice: {
      title: 'Pick the predictor upgrade',
      brief:
        'A 5-stage machine has 20% branches, 15% mispredict rate, 2-slot flush (CPI = 1 + 0.2 x 0.15 x 2 = 1.06). A 2-bit predictor cuts mispredicts to 5%. Compute the new CPI and the percentage speedup versus 1.06.',
      expectedBehavior:
        'CPI = 1 + 0.2 x 0.05 x 2 = 1.02. Speedup = 1.06 / 1.02 = 1.039, about a 3.9% throughput gain from prediction alone.',
      hints: [
        'Recompute the product 0.2 x 0.05 x 2 = 0.02.',
        'Speedup = old CPI / new CPI.',
        'Compare: the predictor bought more than most other single hardware changes could.',
      ],
    },
    practiceExercises: [
      {
        title: 'Design the flush budget',
        brief:
          'You are choosing pipeline depth for a machine where the branch unit could resolve in stage 5 (flush 4) or stage 8 (flush 7). With 20% branches and a 5% mispredict rate, compute both CPIs and state which resolution point you would pick if both cost the same elsewhere.',
        expectedBehavior:
          'Stage 5: CPI = 1 + 0.2 x 0.05 x 4 = 1.04. Stage 8: CPI = 1 + 0.2 x 0.05 x 7 = 1.07. Pick stage-5 resolution: 2.9% better throughput at equal cost.',
        hints: [
          'Flush cost is roughly the number of stages between fetch and resolution.',
          'Earlier resolution may require extra hardware — the "costs the same" assumption isolates the CPI effect.',
        ],
      },
      {
        title: 'Width versus dependence',
        brief:
          'A 2-wide machine executes this stream: I1: add R1,R2,R3; I2: add R4,R5,R6; I3: sub R7,R1,R4; I4: xor R8,R9,R10. Pair instructions into issue cycles, assuming results are forwarded within the same cycle pair is NOT allowed — issue pairs must be independent. How many cycles to issue all four, and what achieved width results?',
        expectedBehavior:
          'Cycle 1: I1 + I2 (independent). Cycle 2: I3 depends on I1 and I2; only I4 can pair with it, so cycle 2 issues I3 + I4 only if I3\'s sources are ready — with same-cycle forwarding disallowed and I1/I2 just issued, I3 must wait; a conservative in-order answer is cycle 2: I4 alone (width 1), cycle 3: I3 (width 1). Total 3 cycles, average width 4/3 = 1.33, versus ideal 2.0.',
        hints: [
          'List each instruction\'s sources and check them against the two immediately preceding issue slots.',
          'Achieved width = instructions issued / cycles taken.',
        ],
      },
    ],
    assessment: {
      title: 'Prediction and ILP checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why do deeper pipelines make branch mispredictions more expensive?',
          options: [
            'Branches become more frequent',
            'More speculative instructions are in flight when a branch resolves, so more slots are flushed',
            'Deeper pipelines have lower clock rates',
            'Register files get smaller',
          ],
          answer: 'More speculative instructions are in flight when a branch resolves, so more slots are flushed',
          explanation:
            'The flush cost equals the number of issue slots between fetch and branch resolution. Deeper pipes resolve later in stage count, wasting more fetched work per mispredict.',
          hint: 'Count how many instructions enter the pipe while one is still travelling to EX.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: 'double cpi = 1.0 + 0.20 * 0.10 * 2.0;\nprintf("CPI = %.2f", cpi);',
          options: ['CPI = 1.04', 'CPI = 1.20', 'CPI = 1.40', 'CPI = 0.04'],
          answer: 'CPI = 1.04',
          explanation:
            '0.20 x 0.10 x 2 = 0.04 penalty over the base 1.0: CPI = 1.04. The machine keeps 96% of its ideal throughput.',
          hint: 'Multiply the three factors, then add 1.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A superscalar machine with 4 issue lanes always completes 4 instructions per cycle.',
          answer: 'false',
          explanation:
            'The 4 lanes are a *maximum*. Dependencies, cache misses and mispredictions leave lanes idle; real sustained issue is well below nominal width.',
          hint: 'What if every instruction needs the previous one\'s result?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Which predictor feature lets a 2-bit counter survive a single unusual branch outcome without changing its steady-state prediction? (Two words, e.g. "saturating ____".)',
          answer: 'saturating state',
          explanation:
            'The counter saturates at strongly-taken/strongly-not-taken states; a single contrary outcome moves it only one step, so one anomaly does not flip the prediction — unlike a 1-bit scheme.',
          hint: 'It takes two consecutive disagreements to cross the middle.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Branch prediction', definition: 'Guessing a branch\'s direction (and target) before it resolves, so fetch can continue speculatively.' },
      { term: 'Flush cost', definition: 'The number of pipeline slots wasted when speculation turns out wrong.' },
      { term: 'Superscalar', definition: 'An architecture that issues multiple instructions per cycle through replicated execution hardware.' },
      { term: 'ILP (instruction-level parallelism)', definition: 'The degree to which instructions in a stream are independent and can execute simultaneously.' },
      { term: '2-bit saturating counter', definition: 'A per-branch predictor state machine that requires two consecutive contrary outcomes to flip its prediction.' },
    ],
    revisionSummary: [
      'CPI = 1 + branch_freq x mispredict_rate x flush_cost — compute it for any pipeline.',
      'Deeper pipelines raise flush cost, making predictor accuracy more valuable.',
      'Predictors: static, 2-bit counters, history-based tables; modern accuracy exceeds 95%.',
      'Superscalar = width (replicated lanes), limited by ILP; pipeline = depth. Modern CPUs use both.',
      'Every mechanism here maps directly onto RTL: muxes, comparators, small tables.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Branch predictor', url: 'https://en.wikipedia.org/wiki/Branch_predictor', kind: 'article' },
      { label: 'Wikipedia — Superscalar processor', url: 'https://en.wikipedia.org/wiki/Superscalar_processor', kind: 'article' },
      { label: 'Wikipedia — Instruction-level parallelism', url: 'https://en.wikipedia.org/wiki/Instruction-level_parallelism', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
