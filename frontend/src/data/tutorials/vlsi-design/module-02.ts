import type { TutorialLesson } from '../types';

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'vlsi-m02-l1',
    title: 'Logic Synthesis: Inputs, Engine, Outputs',
    summary:
      'The synthesis contract: RTL plus constraints plus a technology library go in; an optimized, mapped netlist comes out — and every step of the transformation is structural and auditable, not magic.',
    objectives: [
      'Name the three synthesis inputs (RTL, constraints, .lib) and what each contributes to the result.',
      'Describe the engine\'s stages: elaboration, generic optimization, technology mapping.',
      'Explain what a netlist is and why it is the contract consumed by all downstream tools.',
      'Distinguish what synthesis is free to change (structure) from what it must preserve (behavior).',
    ],
    whyItMatters:
      'Synthesis is where your RTL stops being text and becomes a concrete bill of materials — named cells from a real library, with real area, timing and power. Every later tool (place-and-route, STA, equivalence checking, DRC) consumes its output. Engineers who think of synthesis as a compiler black box debug it badly; engineers who know the transformation stages can read its reports and steer it with constraints — which is the professional skill.',
    prerequisites: [
      'Standard cells and Liberty views (vlsi-m01-l3)',
      'RTL coding and FSM style (RTL Design course)',
      'FPGA synthesis intuition (fpga-m02-l1) — same ideas, different target',
    ],
    explanation:
      '**Synthesis** transforms a behavioral description into a structural one. Its three inputs, each essential:\n\n- **RTL** (Verilog/VHDL): *what* the design computes — registers, datapaths, FSMs.\n- **Constraints** (SDC-style): *how well and how fast* — clock definitions and periods, I/O timing, exceptions, load assumptions. Without constraints the tool optimizes for nothing in particular.\n- **Technology library (.lib)**: *what it can be built from* — the cells, their timing arcs, areas, powers and drive variants (vlsi-m01-l3).\n\nThe engine works in three stages. **Elaboration** expands parameters, generate loops and hierarchy into a flat-ish design graph. **Generic optimization** rewrites the logic as Boolean networks: constant folding, dead-code elimination, common-substructure sharing, register retiming across combinational logic, FSM state encoding choices — all *behavior-preserving* on the clocked semantics. **Technology mapping** replaces generic nodes with concrete library cells (NAND2_X2, DFF_X1...), choosing cells and drives to satisfy timing constraints at minimal area/power. The output is the **netlist**: a list of instances (cells) and nets (connections), annotated with the library it came from.\n\n### What the engine may and may not do\n\nThe contract: behavior at the clocked boundaries must be preserved — same register outputs for same input sequences (timing aside). Structure is negotiable: it may flatten your hierarchy, retime registers, re-encode your FSM states, share arithmetic, and convert your elegant mux into an AOI complex. Two consequences: (1) equivalence checking exists precisely to *prove* the RTL and netlist behave identically (Module 4); (2) debugging the netlist requires care — its structure is the tool\'s, not yours. Synthesis is structural optimization under constraints, never creative reinterpretation.',
    deepDive: '### Mapping is choice under cost, not translation\n\nA 3-input AND is implementable as AND3_X1, as NAND3+INV, as AOI21+tie, at several drive variants — different area, pin capacitance and delay. Mapping evaluates these against the *constraint context*: a cell on a critical path earns a faster (bigger) variant; a cell with slack earns the cheapest. The same RTL with different constraints or a different .lib yields a different netlist — that is not inconsistency, it is the system working: constraints define "good", the library defines "possible", and the engine searches between them. This is also why netlists are not portable across libraries: they name cells that exist only in their source .lib.\n\n### Retiming deserves special respect\n\nGeneric optimization may move registers across combinational logic — your carefully placed pipeline register can migrate several gates in either direction, because for clocked behavior it is equivalent. Retiming is legitimate and valuable (it balances pipeline stages automatically), but it changes *which* gate delays sit in *which* cycle: testbenches that peek at intermediate registers, or SVA properties written on internal register boundaries, can break. The discipline: constrain and verify behavior at the module boundary; treat internal register placement as the tool\'s to optimize.',
    examples: [
      {
        title: 'One small module through synthesis, stage by stage (conceptual trace)',
        language: 'verilog',
        code:
          '// RTL input:\nmodule acc #(\n    parameter integer W = 8\n) (\n    input  wire             clk,\n    input  wire             reset_n,     // async active-low\n    input  wire             en,\n    input  wire [W-1:0]     step,\n    output reg  [W-1:0]     sum\n);\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n)    sum <= {W{1\'b0}};\n        else if (en)     sum <= sum + step;\n    end\nendmodule\n\n// STAGE 1 ELABORATION (W=8): graph = 8-bit adder, 8 FFs,\n//   enable mux, async reset network. Parameters resolved.\n// STAGE 2 GENERIC OPT:\n//   - enable mux folded into FF clock-enable (library DFF has CE pin)\n//   - reset wired to FF reset pins\n//   - adder structure shared/canonical\n// STAGE 3 TECH MAPPING (library cells):\n//   8x DFFRX1 (FF with async reset + enable)\n//   adder: 8x full-adder cells (FA_X1) or carry-chain equivalents\n//   -> netlist: instances + nets, .lib = lib_svt, area = N um2',
        explanation: [
          'Elaboration resolves the parameter: W=8 becomes concrete widths — the tool never deals in generics after this stage.',
          'Generic optimization recognized that "enable mux feeding D" is exactly the library FF\'s clock-enable pin — using it removes a mux level. This is mapping intelligence, not magic: the .lib described the pin, the engine matched the pattern.',
          'Technology mapping emits named cells with concrete properties: eight DFFRX1 (reset+enable FFs) and an adder of FA_X1 cells — the netlist a router can place and STA can time.',
          'Note what was preserved: clocked behavior (sum increments by step when en). Note what was not: your mux is gone — it lives inside the FF pins now. Equivalence checking (Module 4) proves this is the same behavior.',
          'Change the .lib or the constraints and the mapping can legitimately differ — the netlist belongs to its (RTL, constraints, library) triple.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The synthesis contract',
        content:
          '   RTL (.v/.sv)          CONSTRAINTS (SDC)      LIBRARY (.lib)\n   what it computes      how fast / which loads cells + timing + area\n        \\                     |                      /\n         \\                    |                     /\n          v                   v                    v\n        +---------------------------------------------+\n        |            SYNTHESIS ENGINE                 |\n        |  1. elaboration      (resolve params/generates)\n        |  2. generic optimization (fold, share, retime)\n        |  3. technology mapping   (cells + drives under cost)\n        +---------------------------------------------+\n                            |\n                            v\n                    NETLIST (cells + nets)\n                    + constraint file + reports\n                            |\n             consumed by: P&R, STA, equivalence, ATPG',
        caption:
          'Three inputs define the search space; the netlist is the single artifact every downstream tool trusts.',
      },
    ],
    tables: [
      {
        caption: 'What synthesis may change vs must preserve',
        headers: ['Aspect', 'Status', 'Consequence'],
        rows: [
          ['Clocked behavior at boundaries', 'Preserved', 'Equivalence checking can prove it'],
          ['Hierarchy', 'Negotiable', 'Flattened/merged — debug at boundaries'],
          ['Register placement', 'Negotiable (retiming)', 'Internal test points can move'],
          ['FSM encoding', 'Negotiable', 'Do not depend on your state values'],
          ['Combinational structure', 'Negotiable', 'Your mux may become an AOI cell'],
          ['Named cells', 'New (from .lib)', 'Netlist is library-specific'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Running synthesis without constraints "to see the area first".',
        fix: 'Unconstrained synthesis optimizes against a fictional default and reports timing nobody specified. The area you see is not the constrained area — critical paths get cheap cells and the report says nothing about your clock. Constrain first, even roughly.',
      },
      {
        mistake: 'Hand-editing the netlist to "fix" a problem.',
        fix: 'The netlist is generated: any edit is lost at the next synthesis run and breaks equivalence-check provenance. Fix at the source — RTL, constraints, or library selection — and re-run.',
      },
      {
        mistake: 'Writing testbench assertions on internal registers, then blaming synthesis when retiming moves them.',
        fix: 'Observe and constrain at module boundaries. If an internal point must be stable for verification, hold it with a keep/dont-touch attribute *deliberately and documented* — the exception, not the habit.',
      },
    ],
    guidedPractice: {
      title: 'Predict the transformation',
      brief:
        'For the acc module example: (a) which single library feature let the enable mux disappear? (b) if the library had no FF-with-enable, what would the netlist contain instead? (c) if constraints demand a faster clock, name one legitimate mapping change.',
      starterCode:
        '(a) library feature: ________\n(b) without it: ________\n(c) faster-clock mapping: ________',
      expectedBehavior:
        '(a) The DFF\'s clock-enable (CE) pin described in the .lib. (b) An explicit feedback mux before the FF\'s D pin (mux + plain DFF) — one extra level of logic. (c) Higher-drive cells on the adder path (FA_X2/X4), or retiming to rebalance, or LVT (faster) cell variants — at area/power cost.',
      hints: [
        'The .lib describes pins, not just truth tables.',
        'Think what the mux was implementing and where else it could live.',
        'Timing-driven mapping = paying area/power for speed, selectively.',
      ],
    },
    practiceExercises: [
      {
        title: 'Equivalence intuition',
        brief:
          'After synthesis, an internal register moved two gates upstream by retiming. A colleague calls this a bug. In 3-4 sentences, argue whether it is, and state which sign-off tool proves the answer.',
        expectedBehavior:
          'Not a bug: retiming preserves clocked behavior at the boundaries — same output sequence for same input sequence. It changes internal intermediate values at specific cycles, which only matters if something observes them. Logical equivalence checking formally proves RTL vs netlist behavioral equivalence; that is the tool that settles the argument.',
        hints: [
          'What is the observable contract of a clocked module?',
          'Who could see the difference — and is that observer part of the contract?',
          'Module 4 names the proof tool; recall its name.',
        ],
      },
      {
        title: 'Library swap impact memo',
        brief:
          'A design synthesized against lib_svt must move to a new process whose library lacks the AOI21 cell. List what changes in the flow outputs and one risk to check.',
        expectedBehavior:
          'The mapper substitutes an equivalent structure (e.g., NAND/NOR/INV tree) for every AOI21: area/power/timing all shift; the netlist names new cells; constraints stay valid but timing results must be re-analyzed. Risk: paths that used the AOI\'s single-stage speed now have two stages — check setup slack on formerly critical paths.',
        hints: [
          'Cells are vocabulary; a smaller vocabulary means longer sentences.',
          'Which report reveals the timing effect?',
          'The RTL is untouched — the netlist and its numbers are not.',
        ],
      },
    ],
    assessment: {
      title: 'Synthesis contract checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which set correctly lists the three synthesis inputs?',
          options: [
            'RTL, constraints, technology library (.lib)',
            'RTL, testbench, GDS',
            'Netlist, LEF, DEF',
            'SDC, SPEF, GDS',
          ],
          answer: 'RTL, constraints, technology library (.lib)',
          explanation:
            'Synthesis consumes what to build (RTL), how well (constraints), and what to build from (.lib). Its output is the mapped netlist consumed by all downstream tools.',
          hint: 'What/how/with-what.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Synthesis is free to retime registers across combinational logic as long as clocked behavior at the module boundary is preserved.',
          answer: 'true',
          explanation:
            'Retiming is a legitimate behavior-preserving transform: boundary sequences are identical even though internal intermediate values move. This is why observations and assertions belong at boundaries.',
          hint: 'What does the module\'s external observer actually see?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'The same RTL synthesized with tighter clock constraints and the same library will most likely produce:',
          options: [
            'A bit-identical netlist; constraints only affect reports',
            'A different netlist: higher-drive/faster cells on critical paths, at area/power cost',
            'A netlist with different functionality',
            'No netlist until constraints are relaxed',
          ],
          answer: 'A different netlist: higher-drive/faster cells on critical paths, at area/power cost',
          explanation:
            'Constraints define the optimization target; mapping is choice under cost. Tighter timing shifts cell/drive selection on critical paths — same behavior, different structure.',
          hint: 'Recall that mapping is choice, not translation.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: the synthesis output artifact — a list of named cell instances and the nets connecting them — consumed by place-and-route, STA and equivalence checking.',
          answer: 'netlist',
          explanation:
            'The gate-level netlist is the contract: it names concrete cells from one library, which is what makes every downstream analysis concrete.',
          hint: 'It is named for what it lists.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Elaboration', definition: 'Synthesis stage resolving parameters/generates into a concrete design graph.' },
      { term: 'Generic optimization', definition: 'Behavior-preserving Boolean-level rewriting: folding, sharing, retiming, encoding.' },
      { term: 'Technology mapping', definition: 'Replacing generic logic with concrete library cells under timing/area/power cost.' },
      { term: 'Netlist', definition: 'The structural output: named cell instances and nets; the input contract of every downstream tool.' },
      { term: 'Retiming', definition: 'Moving registers across combinational logic while preserving boundary behavior.' },
    ],
    revisionSummary: [
      'Synthesis = RTL (what) + constraints (how well) + .lib (from what) -> netlist.',
      'Stages: elaboration -> generic optimization -> technology mapping; all structural, behavior-preserving at boundaries.',
      'Mapping is choice under cost: same logic, different cells depending on constraints and library.',
      'Hierarchy, register placement and encodings are negotiable — observe at boundaries.',
      'Never edit the netlist; fix RTL/constraints and re-run; equivalence checking proves behavior.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Logic synthesis', url: 'https://en.wikipedia.org/wiki/Logic_synthesis', kind: 'article' },
      { label: 'Yosys documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlsi-m02-l2',
    title: 'Inside a Technology Library (.lib)',
    summary:
      'What the Liberty file actually contains — timing arcs and lookup tables, capacitance, area, power — and how synthesis and STA read cell behavior from it without ever seeing a transistor.',
    objectives: [
      'Enumerate the contents of a .lib cell entry: area, pin capacitance, timing arcs, delay/load lookup tables, power tables.',
      'Explain the NLDM model: delay as a function of input transition and output load.',
      'Describe setup/hold constraint arcs and why they are library data, not tool assumptions.',
      'Distinguish VT flavors (HVT/SVT/LVT) and the speed-vs-leakage trade they encode.',
    ],
    whyItMatters:
      'Every timing number you will ever quote comes from these tables. When a report says a path has 0.4 ns of slack, that number is the sum of lookups into cell tables against load and transition conditions — not a measurement. Reading a .lib entry fluently means you can sanity-check tool output, understand why one cell was chosen, and reason about library-level power trade-offs (VT flavors) like a backend engineer.',
    prerequisites: [
      'Standard cell views (vlsi-m01-l3)',
      'Synthesis contract (vlsi-m02-l1)',
    ],
    explanation:
      'A **technology library** is the foundry-vendor\'s characterized description of every cell: for each cell, its physical and electrical personality, measured/extracted from transistor-level simulation of the actual layout. The dominant format is **Liberty (.lib)**. A cell entry contains:\n\n- **Area**: layout footprint (µm²) — the currency of utilization reports.\n- **Pin capacitance**: each input\'s load presented to its driver.\n- **Timing arcs**: for every input→output path of the cell, delay and transition (slew) *as functions* — not constants.\n- **Constraint arcs** (on FFs): setup and hold requirements vs clock/data slew.\n- **Power tables**: internal and switching energy per transition.\n- **Attributes**: drive variant, VT flavor, function (for equivalence checking).\n\n### The NLDM idea\n\nCell delay is not one number: it depends on *how sharp the input edge is* (input transition/slew) and *how heavy the load* (output capacitance). The **Non-Linear Delay Model** stores a 2-D table per arc — rows = input slew, columns = output load — and tools interpolate. Your delay therefore depends on your neighborhood: a NAND2_X1 driving a heavy bus is slower than the same cell driving a light one. STA chains this along every path: each cell\'s load is the sum of its fanout pins\' capacitances, each input slew is the previous cell\'s output slew.\n\n### Constraint arcs are library data\n\nA flip-flop\'s setup requirement depends on its data and clock slews — so the .lib stores *tables* for setup and hold too. When STA computes slack, the "required" side of a path comes from these tables. The library is the single source of truth for what cells can do; tools only add wiring (Module 3: after routing, wire RC joins the model).\n\n### VT flavors: the speed-vs-leakage dial\n\nLibraries ship each cell in threshold flavors — **HVT** (high threshold: slow, low leakage), **SVT** (standard), **LVT** (low threshold: fast, leaky). Synthesis/optimization uses LVT on critical paths and HVT elsewhere, trading leakage for speed *per instance*. This is one of the two main levers of timing closure at fixed geometry (the other is drive strength), and the reason a modern netlist names flavors explicitly.',
    deepDive: '### Where the tables come from — and their honest limits\n\nLibrary characterization runs transistor-level (SPICE-class) simulation of each cell across the corner grid: supply voltage, temperature, process skew, slew, load. That is why a .lib is per-corner: `lib_sslow.lib`, `lib_sfast.lib`... one per PVT point. Two limits follow. (1) Interpolation: your exact slew/load is almost never a table entry — tools interpolate, accurate within the table\'s domain and questionable outside it (garbage-in garbage-out for wild slews). (2) The library knows the cell, not the wire: interconnect RC enters only after extraction (Module 3), which is why pre-route timing is an estimate and post-route timing is the contract.\n\n### Reading a cell entry, structurally\n\nA NAND2 entry reads as: `cell (NAND2_X1) { area : 4.2; pin(A) { capacitance : 0.0018; } ... timing () { related_pin : "A"; cell_rise(rise_trans) { values("...2-D table...") } } }` — area scalar, per-pin caps, per-arc tables. The table axes (input slew, output load) are declared once in the library header; every arc\'s values grid conforms. When a report quotes a cell delay, you can in principle reconstruct it: find the arc, take the row/column for the actual slew/load, interpolate. Reports exist so you do not have to — but knowing you *could* is what makes them checkable rather than oracular.',
    examples: [
      {
        title: 'A Liberty cell entry, structurally annotated (illustrative values)',
        language: 'text',
        code:
          '## ILLUSTRATIVE .lib fragment for teaching — values are invented,\n## structure is real Liberty style.\nlibrary (lib_svt_0p90v_125c) {\n  nom_voltage    : 0.90;\n  nom_temperature: 125;\n  time_unit      : "1ns";\n  capacitive_load_unit (1, pf);\n\n  cell (NAND2_X1) {\n    area : 4.2;                       # um2 — utilization currency\n\n    pin (A) {\n      direction : input;\n      capacitance : 0.0018;           # pf load this pin presents\n    }\n    pin (B) { direction : input; capacitance : 0.0019; }\n\n    pin (Y) {\n      direction : output;\n      function : "!(A & B)";          # for equivalence checking\n      max_capacitance : 0.20;         # load limit (slew sanity)\n\n      timing () {                     # ARC A -> Y, rise\n        related_pin : "A";\n        cell_rise (delay_template_7x7) {\n          index_1("0.01 0.02 0.04 0.08 0.16 0.32 0.64");  # input slew ns\n          index_2("0.002 0.005 0.01 0.02 0.04 0.08 0.16");# load pf\n          values("0.021 0.024 ... ");  # 7x7 grid; tool interpolates\n        }\n        # cell_fall, rise_transition, fall_transition similarly\n      }\n    }\n  }\n}\n\n## Note the header: this .lib is ONE CORNER (0.90 V, 125 C).\n## A real flow ships one library file per PVT corner.',
        explanation: [
          'Header pins the corner: voltage and temperature are declared because every table in the file is measured there — a different corner means a different file.',
          'Area is a scalar: utilization reports sum these numbers; nothing else in the flow invents area.',
          'Pin capacitance is what a driver "feels": STA sums fanout caps to compute each cell\'s load, then looks up delay in the arc table.',
          'The arc table is 2-D (input slew × output load) — delay is a lookup+interpolation, never a constant. max_capacitance guards slew sanity: overload the cell and the tool flags it.',
          'The function string exists for equivalence checking — the tool can prove the cell implements NOT(A AND B) without transistors.',
          'Honest labels: the numbers are invented for teaching; the structure and semantics are real Liberty conventions.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'How one delay number is produced',
        content:
          ' driver cell            load = sum of fanout pin caps\n   |                              |\n   | output slew  ----------------+ (from previous stage)\n   v                              v\n [ .lib arc table ]  rows: input slew  cols: load\n        |\n        v\n  lookup + interpolation  ->  cell delay + new output slew\n        |\n        v\n  feeds the NEXT stage\'s input slew — chained down the path',
        caption:
          'Delay is contextual: the same cell is fast or slow depending on its neighborhood. STA chains these lookups along every path.',
      },
    ],
    tables: [
      {
        caption: 'VT flavors: the speed-vs-leakage dial',
        headers: ['Flavor', 'Threshold', 'Speed', 'Leakage', 'Typical use'],
        rows: [
          ['HVT', 'High', 'Slowest', 'Lowest', 'Non-critical paths, low-power blocks'],
          ['SVT', 'Standard', 'Middle', 'Middle', 'Default bulk of the design'],
          ['LVT', 'Low', 'Fastest', 'Highest', 'Critical paths only — spend leakage where needed'],
        ],
      },
      {
        caption: 'What the .lib knows vs what it does not',
        headers: ['Known by .lib', 'NOT known by .lib'],
        rows: [
          ['Cell delay/slew vs slew+load', 'Wire resistance/capacitance (extraction, Module 3)'],
          ['Setup/hold vs slews', 'Actual placed neighbors and routes'],
          ['Area, pin caps, function', 'Total design power (needs activity + wires)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Treating a cell\'s delay as a fixed property ("NAND2_X1 is 0.05 ns").',
        fix: 'Delay is a 2-D lookup: input slew × output load. The same cell varies several-fold across realistic neighborhoods. When comparing cells, hold load and slew constant — otherwise you compare table rows, not cells.',
      },
      {
        mistake: 'Using one corner\'s library file and calling the result "timing closed".',
        fix: 'A .lib is valid at its declared PVT point. Sign-off requires the multi-corner picture (slow corner for setup, fast for hold — Module 4). A single-corner pass is an estimate, not closure.',
      },
      {
        mistake: 'Choosing LVT everywhere because the paths are "probably tight".',
        fix: 'LVT multiplies leakage across every instance it touches; spending it on non-critical paths burns power for nothing. The flow reports critical paths — spend LVT (and drive) there, guided by reports.',
      },
    ],
    guidedPractice: {
      title: 'Reconstruct a delay lookup',
      brief:
        'A NAND2_X1 drives a load of 0.02 pF; its input slew is 0.04 ns. From the fragment\'s table axes (index_1 slews 0.01..0.64, index_2 loads 0.002..0.16), identify the exact table cell hit (no interpolation needed), and state what changes if the load doubles to 0.04 pF.',
      starterCode:
        'slew = 0.04 ns -> row ______\nload = 0.02 pf -> column ______\ndelay = values[row][col]\nload 0.04 pf -> column ______ (same row)',
      expectedBehavior:
        'Row = 0.04 (exact axis entry), column = 0.02 (exact entry) → direct lookup. At 0.04 pF the column moves one to the right — same row, larger delay per the table\'s monotonic trend (more load → slower output). Both are pure lookups; interpolation only enters for off-axis values.',
      hints: [
        'index_1 is slew (rows), index_2 is load (columns).',
        'Exact axis matches need no interpolation.',
        'Delay grows monotonically with load — the direction of movement in the table.',
      ],
    },
    practiceExercises: [
      {
        title: 'VT budget reasoning',
        brief:
          'A chip is leakage-limited: 70% of instances are already SVT, 20% LVT on critical paths, 10% HVT. The power team demands leakage halved; the timing team forbids new violations. Propose a compliant strategy and name its risk.',
        expectedBehavior:
          'Convert non-critical SVT instances (with slack) to HVT — leakage drops without touching timing-critical cells. Risk: slack shrinks on converted paths; any path that later becomes critical (voltage drop, crosstalk) was optimized away from — re-run STA after conversion and keep margin.',
        hints: [
          'Leakage lives where LVT/SVT live; convert where slack exists.',
          'Never touch LVT-critical instances.',
          'Every conversion spends slack — that is the currency.',
        ],
      },
      {
        title: 'Corner arithmetic sanity',
        brief:
          'A cell arc reads 0.08 ns at the fast corner (0.99 V, −40 C) and 0.14 ns at the slow corner (0.90 V, 125 C). A path chains 12 such delays. Compute the path\'s cell-delay component at both corners and state which corner each of setup and hold checks uses.',
        expectedBehavior:
          'Fast: 12 × 0.08 = 0.96 ns; slow: 12 × 0.14 = 1.68 ns. Setup is checked at the slow corner (longest delays must fit the period); hold at the fast corner (shortest delays must not be TOO short). Plus wire delay, which extraction adds later.',
        hints: [
          'Multiply per-cell by the count for the component.',
          'Slow corner = worst-case slowness → setup.',
          'Fast corner = worst-case speed → hold.',
        ],
      },
    ],
    assessment: {
      title: 'Technology library checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In the NLDM model, a cell\'s delay is stored as a function of which two variables?',
          options: [
            'Supply voltage and temperature',
            'Input transition (slew) and output load capacitance',
            'Area and drive strength',
            'Fanout count and net length',
          ],
          answer: 'Input transition (slew) and output load capacitance',
          explanation:
            'Each timing arc stores a 2-D table indexed by input slew and output load; tools interpolate. Corner effects come from using the corner\'s library file, not from axes inside the table.',
          hint: 'What two things about its neighborhood change a gate\'s speed?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A .lib file describes cell behavior at all process, voltage and temperature conditions in one file.',
          answer: 'false',
          explanation:
            'A .lib is characterized and valid at one PVT corner (declared in its header). Multi-corner sign-off uses one file per corner — slow for setup, fast for hold.',
          hint: 'Check the library header in the example fragment.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Why does the library offer the same gate in HVT/SVT/LVT flavors?',
          options: [
            'To change the gate\'s truth table',
            'To trade speed against leakage per instance',
            'To support different package pinouts',
            'To comply with different Verilog standards',
          ],
          answer: 'To trade speed against leakage per instance',
          explanation:
            'Lower threshold = faster but leakier. Flavors let optimization spend leakage only where timing demands it — a per-instance power/speed dial.',
          hint: 'Recall which flavor belongs on critical paths.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the library quantity each input pin presents to its driver, which STA sums across fanout to compute a stage\'s load.',
          answer: 'pin capacitance',
          explanation:
            'Pin (input) capacitance is the load contribution of each connection; the driver\'s arc table is then indexed by that summed load and its input slew.',
          hint: 'It is listed per pin in the .lib entry.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Liberty (.lib)', definition: 'Library format carrying per-cell area, pin caps, timing/power tables and functions per corner.' },
      { term: 'NLDM', definition: 'Non-linear delay model: 2-D delay tables indexed by input slew and output load.' },
      { term: 'Timing arc', definition: 'An input-to-output (or clock-to-Q, or setup/hold) characterized path of a cell.' },
      { term: 'VT flavor', definition: 'Threshold variant (HVT/SVT/LVT) trading speed against leakage per cell instance.' },
      { term: 'Corner', definition: 'A PVT operating point (process, voltage, temperature) with its own characterized library files.' },
    ],
    revisionSummary: [
      '.lib = area + pin caps + timing arcs (slew×load tables) + setup/hold arcs + power, per corner.',
      'Delay is a lookup: neighborhood (slew, load) decides speed; STA chains lookups down paths.',
      'Setup/hold requirements are library tables too — required-side data, not tool folklore.',
      'VT flavors and drive strengths are the two per-instance levers of timing closure.',
      'The .lib knows cells, not wires — interconnect arrives only after extraction (Module 3).',
    ],
    furtherReading: [
      { label: 'Wikipedia — Standard cell', url: 'https://en.wikipedia.org/wiki/Standard_cell', kind: 'article' },
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlsi-m02-l3',
    title: 'Constraints in Synthesis and Reading the Reports',
    summary:
      'How SDC-style constraints steer synthesis, what timing-driven mapping actually trades, and how to read a synthesis report — area, cell counts, and timing summary — from a synthetic teaching example.',
    objectives: [
      'Read the core constraint set: clock definition/period, I/O delays, load and drive assumptions, exceptions.',
      'Explain timing-driven synthesis: critical-path identification, cell/drive/VT upgrading, and the area cost curve.',
      'Read a synthesis report: area summary, cell histogram, and per-clock timing — from a synthetic, labeled example.',
      'Set realistic expectations: synthesis timing is pre-layout estimate; physical design re-opens the question.',
    ],
    whyItMatters:
      'Constraints are how you talk to synthesis; reports are how it talks back. The pair forms the feedback loop of digital implementation: poorly written constraints produce confidently wrong netlists; unread reports hide problems until physical design, where they cost 10x more to fix. This lesson closes Module 2 by making the loop concrete and honest about what synthesis numbers can and cannot promise.',
    prerequisites: [
      'Synthesis contract (vlsi-m02-l1)',
      'Liberty timing model (vlsi-m02-l2)',
      'FPGA constraint concepts (fpga-m03-l2) — same vocabulary, ASIC context',
    ],
    explanation:
      '### The constraint set that matters for synthesis\n\n- **Clock definition**: `create_clock -period 4.0` (250 MHz) — the master requirement. Everything else is relative to it.\n- **I/O delays**: how much of the period is spent outside the chip (to/from other devices) — carves the internal budget.\n- **Loads and drives**: external capacitance on outputs, drive of external drivers on inputs — makes boundary timing real.\n- **Exceptions**: false paths (async crossings) and multicycle paths — deliberately excluded checks, always justified.\n- **Design rules**: max transition, max capacitance, max fanout — sanity limits the tool enforces while mapping.\n\n### Timing-driven synthesis, structurally\n\nAfter generic optimization, the engine evaluates paths against constraints: paths with negative slack are **critical**; the engine upgrades them — higher drive cells, faster VT flavors, restructuring into fewer stages — and re-checks. Each upgrade spends area and/or power. The result is a cost curve: meeting 250 MHz might cost 20% more area than 200 MHz, nonlinearly. Timing-driven synthesis is this search, automated, with your constraints as the objective.\n\n### Reading the report (synthetic example)\n\nThe report below is a **synthetic teaching example** — internally consistent, not a real tool run. Read it in three passes: area (did it fit the budget?), cell histogram (any surprises — e.g., thousands of tiny inverters suggests a structural problem), and timing (worst slack per clock; anything negative will be re-attacked in physical design). The honest framing: synthesis timing uses *estimated* wireloads (no placement yet), so its slack is optimistic-to-plausible, never final. The number that ships is the post-route number from Module 3.',
    deepDive: '### Why synthesis timing is a structured estimate, not a lie\n\nBefore placement, wire lengths do not exist. Tools bridge the gap with **wireload models** — statistical capacitance vs fanout curves for the target technology — or, in modern flows, by running a fast placement pass to estimate real distances. Either way, the report\'s timing assumes *something* about wires; the assumption is documented in the report. The professional reading: synthesis slack of +0.5 ns on a 4 ns clock is "probably closable"; −0.5 ns is "definitely in trouble — fix the RTL or the constraint now", because physical design typically *costs* margin, not grants it. Treat synthesis slack as a leading indicator with a sign, not a measurement.\n\n### The area story behind the histogram\n\nA cell histogram (count per cell type) is a design X-ray. Healthy datapath-dominated designs show FFs and adder-class cells prominent; a design dominated by thousands of X1 inverters usually means long nets or poor input slew assumptions; heavy MUX-class presence may mean control-heavy logic or an encoding choice worth revisiting. The histogram is also where synthesis "costs" appear: timing-driven upgrades show up as X2/X4 and LVT cells clustered on the paths your constraints prioritized. If your critical paths are NOT where the expensive cells are, your constraints are pointing the engine at the wrong targets.',
    examples: [
      {
        title: 'Synthetic synthesis report (teaching example, not a real tool run)',
        language: 'text',
        code:
          '== SYNTHETIC SYNTHESIS REPORT (illustrative, for teaching) ==\nDesign: dsp_mac4     Library: lib_svt_0p90v_125c (slow corner)\nConstraints: clk 4.0 ns (250 MHz); in_delay 0.8; out_delay 0.6\n\n--- Area ---------------------------------------------------------\n  Combinational area : 12,480 um2\n  Buffer/Inverter    :  1,910 um2\n  Macro (1 RAM 512x32): 21,000 um2  (fixed block from library)\n  Total cell area    : 35,390 um2\n\n--- Cell histogram (top rows) ------------------------------------\n  DFFRX1        128   (4 x 32-bit pipeline registers)\n  FA_X1          96   (4 MAC datapaths)\n  MUX2_X1        84\n  NAND2_X1      310\n  AOI21_X1       58   (timing-critical sum trees, upgraded)\n  CLKBUF_X4      12\n\n--- Timing summary (pre-layout, wireload estimate) ---------------\n  Clock  Period  WNS(ns)  TNS(ns)   Fmax(MHz)  Status\n  clk    4.000   +0.31    0.00      269.5      MET (estimated)\n\n  Worst path: mac[3].acc_reg[14] <- add_out_reg[13]\n              setup arrival 3.69 ns vs required 4.00 ns\n\n--- Warnings actually worth reading ------------------------------\n  [WARN] 2 nets exceed max_transition (slew) — buffer insertion queued\n  [WARN] 6 unresolved multicycle mentions in exceptions review\n\nHonest status line: MET (estimated) — pre-layout, wireload model,\nphysical design may still fail this path; re-analysis after P&R.',
        explanation: [
          'Header binds the report to its (design, library, constraints) triple — a report without its constraint context is unreadable, so the header restates the clock and I/O assumptions.',
          'Area pass: total vs budget is the feasibility question; the macro\'s fixed area (21,000 of 35,390) shows why floorplanning (Module 3) plans around macros first.',
          'Histogram pass: FFs and FA cells match a MAC datapath; AOI21 presence on sum trees shows timing-driven upgrades landing on the arithmetic — consistent with the constraints. If the expensive cells were NOT on the MAC paths, constraints would be misaimed.',
          'Timing pass: WNS (worst negative slack) +0.31 ns, TNS (total negative slack) 0.00, Fmax 269.5 MHz vs 250 required — met, with the wireload caveat stated in the status line.',
          'The warnings section is deliberately included: two slew violations queued for buffering and six exception mentions to review are exactly the items a human must own before physical design.',
          'Every number here is synthetic and labeled as such; the reading procedure is the real skill.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The constraint-driven optimization loop',
        content:
          '  constraints (clock, I/O, exceptions, max_*)\n              |\n              v\n   generic-optimized logic\n              |\              paths evaluated against\n              | \\            period + I/O budget\n              |  +--> critical path list\n              |            |\n              |            v\n              |   upgrade: drive / VT / restructure\n              |            |        (spends area, power)\n              +------------+\n        until WNS >= 0 or effort budget exhausted\n              |\n              v\n      report: area + histogram + timing (estimated)',
        caption:
          'Timing-driven synthesis is a loop, not a pass: constraints set the target, upgrades spend cost, reports show where the money went.',
      },
    ],
    tables: [
      {
        caption: 'Reading a synthesis report: three passes',
        headers: ['Pass', 'Question it answers', 'Red flags'],
        rows: [
          ['Area', 'Does it fit the budget?', 'Total > budget; macro share unexamined'],
          ['Cell histogram', 'Is the structure what you intended?', 'Expense not on critical paths; inverter/buffer storms'],
          ['Timing', 'Will this close? (estimated)', 'WNS < 0; slack concentrated at I/O boundaries; unread warnings'],
        ],
      },
      {
        caption: 'Constraint items and their effects on the netlist',
        headers: ['Constraint', 'Steers', 'If missing'],
        rows: [
          ['create_clock period', 'All path budgets', 'No meaningful timing optimization'],
          ['set_input/output_delay', 'Boundary budgets', 'I/O paths ignored or wrong'],
          ['set_load / set_driving_cell', 'Boundary reality', 'Optimistic I/O timing'],
          ['false_path / multicycle', 'Excluded checks', 'Over-constrained, bloated netlist'],
          ['max_transition / max_cap', 'Structural sanity', 'Slew nightmares surface in P&R'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Celebrating synthesis timing as closure.',
        fix: 'Pre-layout timing rests on wireload estimates; physical design re-opens every number. Treat MET (estimated) as "worth proceeding", never as "done" — the shipped number is post-route.',
      },
      {
        mistake: 'Writing false paths to make WNS go positive.',
        fix: 'Exceptions remove checks; they do not speed up silicon. Only structure that is genuinely untimed (proper synchronizers, enable-gated buses) may be excepted, with justification in the constraints file.',
      },
      {
        mistake: 'Ignoring the cell histogram because "area is under budget".',
        fix: 'A fitting design can still be structurally wrong: buffers/inverters exploding, expensive cells on non-critical paths, or unexpected mux storms all predict P&R trouble. The histogram is the cheapest structural review you will ever run.',
      },
    ],
    guidedPractice: {
      title: 'Diagnose from a synthetic report line',
      brief:
        'Report line: "clk 4.000 ns, WNS −0.42 ns, TNS −1.68 ns, Fmax 227.3 MHz". Compute how many failing endpoints TNS implies at minimum, state Fmax consistency with WNS (1/(4.0+0.42)), and name the two levers you would pull before touching RTL.',
      starterCode:
        'WNS = -0.42 ns\nmin # failing endpoints = ______\nFmax check: 1/(4.000+0.42) = ______ MHz\nLever 1 (constraints): ________\nLever 2 (mapping): ________',
      expectedBehavior:
        'At least ceil(1.68/0.42) = 4 failing endpoints. Fmax = 1/4.42 ns ≈ 226.2 MHz — consistent with 227.3 up to rounding of the underlying slack (the point: Fmax and WNS must agree, and they do). Levers: (1) verify the constraint is real (is 250 MHz actually required? wrong period = wrong problem); (2) timing-driven upgrades — higher drive/LVT on that path, or structural RTL fix if the path is a known monster.',
      hints: [
        'TNS sums negative slack over endpoints; divide by WNS for the minimum count.',
        'Fmax = 1/(period + |WNS|) when WNS is negative.',
        'Cheapest levers first: constraint truth, then mapping; RTL last.',
      ],
    },
    practiceExercises: [
      {
        title: 'Area budget memo',
        brief:
          'Your synthesis report totals 35,390 µm² with a 21,000 µm² macro. The floorplan target utilization is 70% of a 60,000 µm² core. Does the design fit with placement headroom? Show the arithmetic and one sentence on why macros complicate the answer.',
        expectedBehavior:
          'Cell area 35,390 in a 60,000 core = 59% — nominally under the 70% target. But macros are rigid: placement must fit 14,390 µm² of cells *around* the macro footprint and keep pin access clear, so effective utilization near the macro is higher than the global number suggests. Fit is plausible; routing congestion near the macro is the risk to check.',
        hints: [
          'Utilization = cell area / core area.',
          'Macros are obstacles, not just area — pins and channels matter.',
          'The global percentage hides local congestion.',
        ],
      },
      {
        title: 'Exception review',
        brief:
          'A colleague added `set_false_path -from [all_inputs] -to [all_registers]` because "inputs are asynchronous anyway". Explain in 3-4 sentences why this is dangerous and write the defensible alternative.',
        expectedBehavior:
          'This removes setup/hold checks on every input path — real timing bugs inside the chip become invisible while the report improves. Defensible: constrain inputs with real set_input_delay (they are synchronous to some clock — verify with the system architect); except only genuinely async pins, each justified, ideally routed through synchronizers (Module 4 CDC).',
        hints: [
          'What does the exception delete, exactly?',
          '"Asynchronous anyway" is a claim about the system — verify or falsify it.',
          'Async inputs get synchronizers, not blanket exceptions.',
        ],
      },
    ],
    assessment: {
      title: 'Constraints and reports checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does WNS mean in a synthesis timing summary?',
          options: [
            'Weighted net slack',
            'Worst negative slack — the largest timing violation across all endpoints',
            'Wireload-normalized slack',
            'Width-to-spacing noise summary',
          ],
          answer: 'Worst negative slack — the largest timing violation across all endpoints',
          explanation:
            'WNS is the most negative (or least positive) slack across all endpoints: the single worst path. TNS sums negative slack over all failing endpoints.',
          hint: 'Worst vs total — two different summaries.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A synthesis report showing "MET (estimated)" guarantees the design will pass timing after place-and-route.',
          answer: 'false',
          explanation:
            'Pre-layout timing uses wireload estimates (or quick placement) for wires that do not exist yet. Physical design re-opens the question; only post-route analysis is the contract.',
          hint: 'What did the tool assume about the wires?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Timing-driven synthesis upgrades a critical path by switching cells. What does this typically cost?',
          options: [
            'Nothing — better cells are free',
            'Area and/or power (bigger drives, leakier VT flavors)',
            'Functionality of the path',
            'Register count in the design',
          ],
          answer: 'Area and/or power (bigger drives, leakier VT flavors)',
          explanation:
            'Upgrades buy speed with area (X2/X4 drives) and leakage (LVT flavors). The engine spends cost selectively where constraints say it matters.',
          hint: 'There is no free speed in mapping.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: the statistical pre-layout model that estimates wire capacitance from fanout so synthesis can produce timing numbers before placement exists.',
          answer: 'wireload model',
          explanation:
            'Wireload models (or quick-placement estimates in modern flows) bridge the missing-geometry gap; their assumptions are why synthesis timing is an estimate.',
          hint: 'It models the wires the tool cannot see yet.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'WNS', definition: 'Worst negative slack: the single worst timing violation across all endpoints.' },
      { term: 'TNS', definition: 'Total negative slack: the sum of negative slack over all failing endpoints.' },
      { term: 'Wireload model', definition: 'Pre-layout statistical estimate of wire capacitance vs fanout, enabling early timing numbers.' },
      { term: 'Timing-driven synthesis', definition: 'Mapping/optimization loop that upgrades critical paths using drive, VT and structure under constraints.' },
      { term: 'Cell histogram', definition: 'Per-cell-type instance counts in a synthesis report — a structural X-ray of the netlist.' },
    ],
    revisionSummary: [
      'Constraint set: clock, I/O delays, loads/drives, exceptions, design rules — each steers a specific optimization.',
      'Timing-driven mapping buys speed with area/leakage, selectively on critical paths.',
      'Read reports in three passes: area (fit), histogram (structure), timing (estimate with sign).',
      'Synthesis timing is a wireload-estimated indicator — MET (estimated) ≠ closed; post-route is the contract.',
      'Exceptions delete checks; add only with structural justification and keep them reviewed.',
    ],
    furtherReading: [
      { label: 'Yosys documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
      { label: 'Wikipedia — Logic synthesis', url: 'https://en.wikipedia.org/wiki/Logic_synthesis', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
