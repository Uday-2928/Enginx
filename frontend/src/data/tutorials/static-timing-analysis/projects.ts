import type { TutorialProject } from '../types';

export const staticTimingAnalysisProjects: TutorialProject[] = [
  {
    id: 'sta-proj-timing-audit',
    title: 'Timing Audit: Constraint Pack and Report Forensics',
    level: 'advanced',
    summary:
      'A paper-and-arithmetic project that cements the whole course: write a complete constraint set for a small two-domain design, hand-compute the expected slacks, then diagnose three synthetic failing reports using the cause-to-fix catalogue.',
    useCase:
      'Exactly the exercise to prepare for timing interviews and for your first real sign-off review: constraint authorship, slack arithmetic without a tool, and report diagnosis — the three skills every timing interview probes.',
    requirements: [
      'A design description you can hold in your head: one primary 100 MHz clock, a divide-by-4 internal clock, one 8-bit input bus from a peer chip (datasheet numbers given), one registered output bus, one two-flop synchronizer crossing into a second 66 MHz clock domain',
      'A complete constraint set written from the description: clocks, generated clock, I/O delays (-max and -min with citations), and exactly one targeted exception',
      'Hand-computed expected setup and hold slacks for two named paths',
      'Diagnosis of three synthetic reports (provided in the steps) using the Module 3 cause-to-fix catalogue',
      'A sign-off checklist completed honestly, with every unchecked box explained',
    ],
    learningOutcomes: [
      'Author a complete, reviewable constraint set from a design description',
      'Predict slacks by hand well enough to catch tool or constraint errors',
      'Diagnose failing reports into cause categories and prescribe fixes with sizes matched to slack sizes',
      'Produce an evidence-grade sign-off statement',
    ],
    prerequisites: [
      'Modules 1-4 of this course',
      'Clock-enable and synchronizer RTL patterns (Verilog and RTL courses)',
    ],
    architecture:
      'The design under audit: a small datapath with three timing worlds. World 1: the 100 MHz domain containing an input-register stage and an accumulator. World 2: the divide-by-4 strobed logic (clock-enable form — the project asks why that choice simplifies the constraints). World 3: a 66 MHz domain receiving a single-bit event through a two-flop synchronizer. The constraint pack must make all three worlds fully analyzed with exactly one exception (the synchronizer entry); every other path — including all cross-domain paths except the declared one — must remain checked.',
    steps: [
      {
        title: 'Write the constraint pack',
        detail:
          'Clocks first (100 MHz primary; decide and justify clock-enable versus generated-clock for the divide-by-4), then I/O delays from the given peer datasheet numbers (tCO 2.8-4.5 ns, tSU 0.4 ns, tH 0.2 ns, traces 0.3 ns), then the single targeted exception with a reason/owner comment block. No blanket anything.',
      },
      {
        title: 'Hand-compute two slacks',
        detail:
          'Path A: input pin through 3.1 ns of logic to the first register (use t_setup 0.30). Path B: accumulator register through 5.6 ns of logic to the output pin register. State arrival, required, slack at both the slow (setup) and fast (hold, with t_hold 0.25 and min delays of your own reasonable choosing) corners. These are your predictions — any later tool run must reproduce them or you investigate the difference.',
      },
      {
        title: 'Diagnose report one',
        detail:
          'Synthetic report: 140 paths to clk_66 all fail with slacks -0.08 to -0.35 ns; logic shallow; constraint file shows create_clock -period 15.0 for clk_66 while the spec says 66.67 MHz equivalent. Identify the catalogue entry, quantify the fiction, and write the corrected constraint line plus the honest post-fix expectation.',
      },
      {
        title: 'Diagnose report two',
        detail:
          'Synthetic report: single path, slack -0.62 ns, arrival lines dominated by one 4.9 ns net delay feeding 22 endpoint flops from one register. Identify the cause category, prescribe the ordered fixes (placement/fanout first), and compute the expected recovery if the net delay halves.',
      },
      {
        title: 'Diagnose report three',
        detail:
          'Synthetic report: the synchronizer\'s ff0-to-ff1 path shows slack -0.11 ns after someone inserted a comparator between the two sync flops "for efficiency". Explain why this is a structure violation (not a timing problem to constrain away), and prescribe the RTL fix plus the review sentence that prevents recurrence.',
      },
      {
        title: 'Write the evidence statement',
        detail:
          'Complete the sign-off checklist against your own constraint pack and diagnoses; write the release-note sentence in the course\'s format: verdict, corners, constraint version, evidence pointers — and the explicit list of what was NOT analyzed.',
      },
    ],
    testPlan: [
      'Constraint pack review script (Module 4 L3) run line by line with findings logged',
      'Hand-computed slacks for paths A and B, both corners, arithmetic shown',
      'Report one: catalogue entry identified, corrected constraint written, post-fix slack predicted',
      'Report two: cause category, ordered fixes, recovery computed',
      'Report three: structure violation identified, RTL fix prescribed',
      'Sign-off checklist completed with every unchecked box explained',
    ],
    expectedResults:
      'A seven-artifact audit: the constraint pack, two hand-computed slack derivations, three report diagnoses with fixes and predictions, and an honest evidence statement. Every number in every artifact recomputable by a reader in under a minute — the definition of audit-grade work. (This project is deliberately tool-free: if you later run a real STA tool on the equivalent RTL, your hand numbers and the tool\'s must reconcile to within the uncertainty budget, or one of them is wrong — finding which is the real exam.)',
    troubleshooting: [
      {
        title: 'My hand slack and the concept of "required" disagree with my expectation',
        detail:
          'Re-derive required from first principles: capture edge (period for setup, zero for hold), minus clock network, minus setup (setup report) or plus hold (hold report). Most disagreements are the clock-network line being forgotten on one side.',
      },
      {
        title: 'I cannot decide clock-enable versus generated clock for the divide-by-4',
        detail:
          'Both are defensible; the project grades the justification. Clock-enable: one clock, fewer constraints, ordinary checks — the default answer per Module 2 L1. Generated clock: only if the divided clock feeds something you cannot express as an enable (IP block requiring a true clock).',
      },
      {
        title: 'Report three keeps looking like a timing problem to me',
        detail:
          'Ask what the ff0-to-ff1 path IS: resolution time for metastability. Any logic inserted there consumes the exponential MTBF lever (Module 4 L1). No constraint restores it; only removing the logic does. That is why the fix is structural.',
      },
    ],
  },
];
