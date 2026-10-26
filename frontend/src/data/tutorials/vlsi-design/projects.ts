import type { TutorialProject } from '../types';

export const vlsiProjects: TutorialProject[] = [
  {
    id: 'vlsi-proj-datapath4',
    title: 'A 4-bit MAC Datapath Through the Conceptual Flow',
    level: 'advanced',
    summary:
      'A paper project carried out entirely as documents: take a 4-bit multiply-accumulate datapath from specification through RTL, conceptual synthesis, floorplan arithmetic, corner planning and sign-off checklist — producing the artifacts each flow stage would emit, with every number labeled as synthetic.',
    useCase:
      'Consolidating the whole VLSI course into one coherent deliverable: the exercise interviewers approximate when they ask "walk me through what happens to this RTL after you hand it off."',
    requirements: [
      'Write the specification: a 4x4 multiply-accumulate with 8-bit accumulator, synchronous enable, async active-low reset, target 250 MHz at a named (fictional) library.',
      'Write the RTL (Verilog-2001, platform conventions) and a self-checking testbench proving the function.',
      'Produce the conceptual synthesis report: area table, cell histogram, and pre-layout timing estimate — every number derived from stated assumptions, labeled synthetic.',
      'Produce the floorplan arithmetic: core sizing from utilization, macro strategy (if any), and a PDN plan keyed to IR/EM checks.',
      'Produce the corner plan: which corners exist, which checks run at which corner, and the sign-off checklist with explicit non-claims.',
      'Write the honesty statement: which artifacts would be tool-generated in a real flow and which were hand-derived here.',
    ],
    learningOutcomes: [
      'Producing the artifact *shape* of every flow stage without pretending tools ran.',
      'Deriving defensible numbers from stated assumptions (area, utilization, slack arithmetic).',
      'The sign-off discipline: claims bounded to corners, modes and reference models.',
      'The honesty habit: synthetic data labeled, assumptions explicit, nothing fabricated as measured.',
    ],
    prerequisites: [
      'All four VLSI modules (this project integrates them)',
      'Verilog testbenches (Verilog course)',
    ],
    architecture:
      'A tiny but complete design: 4-bit multiplier (combinational), 8-bit accumulator register, enable gate, async reset. Small enough to hand-analyze every stage; complete enough to exercise every flow concept: constraints feed synthesis, area feeds floorplanning, corners feed sign-off.',
    steps: [
      {
        title: 'Specification document',
        detail:
          'One page: function (acc <= acc + a*b on en), interfaces (clk, reset_n, en, a[3:0], b[3:0], acc[7:0]), target clock 250 MHz (4.0 ns), fictional library name and corner list. State explicitly that the library is fictional and figures will be synthetic.',
      },
      {
        title: 'RTL and testbench',
        detail:
          'Write mac4.v per the platform conventions and a self-checking TB: reference model in the TB computes expected acc; drive 20 random (a,b,en) transactions; assert equality every cycle. This is the functional ground truth every later document references.',
        code:
          'module mac4 (\n    input  wire       clk,\n    input  wire       reset_n,     // async active-low\n    input  wire       en,\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    output reg  [7:0] acc\n);\n    wire [7:0] prod = a * b;      // 4x4 -> 8 bits, no overflow\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n)  acc <= 8\'d0;\n        else if (en)   acc <= acc + prod;\n    end\nendmodule',
      },
      {
        title: 'Conceptual synthesis report',
        detail:
          'Hand-derive a defensible estimate: count FFs (8), estimate multiplier as ~3-4 LUT-class logic levels per bit slice (or enumerate full/half adders: a 4x4 array multiplier is ~12 FA + 4 HA class cells), assign (stated) per-cell areas from your fictional .lib table, sum. Timing: estimate the longest path (a/b -> multiplier array -> 8-bit add -> acc FF) in assumed per-stage delays; compute WNS against 4.0 ns. Label every number "derived from stated assumptions, not tool output".',
      },
      {
        title: 'Floorplan arithmetic',
        detail:
          'From your estimated cell area: core sizing at 70% utilization; macro strategy (a real flow might map the accumulator to a compiled RAM — decide and justify); row structure; a one-paragraph PDN plan (ring/straps/rails) with the IR/EM checks named. Show the utilization arithmetic explicitly.',
      },
      {
        title: 'Corner plan and sign-off checklist',
        detail:
          'Name the corners (SS 0.81V/125C, FF 0.99V/-40C, TT reference), assign setup->slow and hold->fast, list MCMM modes (func/test), and write the sign-off checklist including DRC/LVS/antenna and the explicit non-claims (function, constraint correctness, yield).',
      },
      {
        title: 'Honesty statement and review',
        detail:
          'The closing artifact: a table of every document produced, marked "tool-generated in a real flow" vs "hand-derived here from stated assumptions". Peer-review one classmate\'s package by re-checking their arithmetic only — exactly how report reviews work.',
      },
    ],
    starterCode: {
      title: 'Assumption table to seed the conceptual reports',
      language: 'text',
      code:
        '## FICTIONAL LIBRARY ASSUMPTIONS (all invented, labeled synthetic)\n## lib_learn_4bit, 0.90 V nominal\n##   DFF_X1  area 6.0 um2   clk-to-Q 0.12 ns   setup 0.08 ns\n##   FA_X1   area 9.0 um2   delay 0.10 ns (avg, light load)\n##   HA_X1   area 6.5 um2   delay 0.08 ns\n##   NAND2_X1 area 4.2 um2  delay 0.05 ns\n## Corner plan (fictional PVT): SS 0.81V/125C, TT 0.90V/25C, FF 0.99V/-40C\n## Wire assumption (pre-layout): +0.15 ns per logic level (stated estimate)\n##\n## Derive from these; change them ONLY by editing this table\n## so every downstream number stays auditable.',
      explanation: [
        'The table is the single source of truth for every derived number — exactly how real flows treat .lib data, miniaturized.',
        'Delay figures are deliberately simple (per-cell scalars) so path arithmetic is hand-checkable; the real per-corner tables idea is preserved by the corner list.',
        'The wire assumption line models the wireload idea from vlsi-m02-l3: pre-layout timing needs a stated wire model.',
        'Every downstream document must cite this table, and any change to it invalidates downstream numbers — the auditability habit.',
      ],
    },
    testPlan: [
      'TB functional check: 20 random transactions match the reference model every cycle; reset behavior verified mid-stream.',
      'Synthesis arithmetic: area sum recomputed by a peer from the assumption table alone (reproducibility check).',
      'Timing arithmetic: longest-path count of stages x per-stage delay + wire estimate; WNS recomputed independently.',
      'Floorplan: utilization division and keep-out allowance recomputed by peer.',
      'Sign-off checklist: every claim line names its corner/mode/reference; every non-claim present.',
    ],
    expectedResults:
      'A document package (spec, RTL+TB, conceptual synthesis report, floorplan arithmetic, corner plan, honesty statement) that is internally consistent and fully auditable from the assumption table. The testbench itself is runnable in iverilog on this platform; every flow-stage artifact is explicitly synthetic.',
    troubleshooting: [
      'Numbers that cannot be re-derived from the assumption table: a derivation skipped a step — fix the chain, not the reviewer.',
      'Multiplier area guess feels arbitrary: switch to explicit adder-cell enumeration (12 FA + 4 HA class) so the count is structural, not vibes.',
      'Sign-off claims drifting beyond their corners: re-read vlsi-m04-l1 — every number belongs to a named (corner, mode).',
      'Honesty statement incomplete: if any number lacks a "tool-generated vs hand-derived" mark, the package is not done.',
    ],
    hardwareDependencies:
      'This is a paper project: no hardware, no synthesis tools, no fabrication. The RTL and testbench are runnable in iverilog on this platform; every flow-stage artifact is an explicitly synthetic document. Real silicon would require a foundry/MPW route as described in vlsi-m04-l3, which this project does not claim.',
  },
];
