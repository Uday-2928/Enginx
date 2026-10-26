import type { TutorialLesson } from '../types';

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'fpga-m02-l1',
    title: 'The Build Pipeline: RTL to Bitstream',
    summary:
      'Walk the six stages that turn Verilog into a working chip configuration — RTL elaboration, synthesis, technology mapping, place and route, bitstream generation — and what decision each stage makes.',
    objectives: [
      'List the stages from RTL to bitstream and name the input and output artifact of each.',
      'Explain what "technology mapping to LUTs" decides and why the same RTL maps differently on different devices.',
      'Describe what placement and routing optimize and why they are the slow, iterative stages.',
      'Relate each pipeline stage to the warnings a beginner actually sees in tool logs.',
    ],
    whyItMatters:
      'When your build fails — and it will — the error message names a stage. Engineers who know that "elaboration" means your RTL had a structural contradiction, while "routing" means the design physically does not fit, fix problems in minutes instead of flailing. This pipeline is also the shared skeleton of the ASIC flow (VLSI course), so learning it here pays off twice.',
    prerequisites: [
      'LUTs, FFs and block resources (fpga-m01-l3)',
      'Verilog synthesis-friendly coding (RTL Design course)',
    ],
    explanation:
      'The FPGA build pipeline is a sequence of increasingly *physical* decisions. Each stage takes an abstract description and commits it a little further toward silicon:\n\n**1. Elaboration.** The tools read your Verilog, expand parameters and generate-for loops, and build the design hierarchy in memory. This is where typos, unconnected ports, and width mismatches surface. Output: an elaborated netlist of modules and wires — still technology-independent.\n\n**2. Synthesis (logic optimization).** Your always-blocks and assigns are translated into generic Boolean logic and optimized: constant propagation, dead-code elimination, duplicate register merging. Unreachable states of your FSM are pruned here. Output: a netlist of registers and generic logic functions.\n\n**3. Technology mapping.** The generic logic is cut into the *target device\'s* primitives: K-input LUTs, carry chains, BRAMs, DSPs. This is the stage where the device family matters — the same RTL becomes 4-input LUTs on one family and 6-input LUTs on another, with different area and timing results. Output: a mapped netlist of actual device cells.\n\n**4. Placement.** Every mapped cell is assigned a physical site on the die. The placer groups connected cells to shorten wires, because wire delay — not gate delay — usually dominates timing on modern FPGAs.\n\n**5. Routing.** The programmable switch network is configured to connect the placed cells, under timing, congestion and fanout constraints. Routing is NP-hard in practice and is typically the longest build step.\n\n**6. Bitstream generation.** The placed-and-routed database is serialized into the device-specific configuration image. From here it goes to programming hardware or a flash programmer.\n\n### What each stage decides\n\nA useful summary: elaboration decides whether your design *exists*; synthesis decides what it *is* logically; mapping decides what it *costs* in device resources; place-and-route decides whether it *fits and meets timing* physically; bitstream generation decides nothing — it just records.',
    deepDive:
      '### Wire delay dominates, hence placement matters\n\nOn a modern FPGA, a signal crossing the die spends far more time in programmable routing than in the LUT itself. A LUT delay may be well under a nanosecond; a long route can be several. That is why two functionally identical RTL files can meet 50 MHz or miss 20 MHz depending on how registers were placed, and why the standard fix for failing paths (pipeline registers — Module 3) works: extra register stages chop long *routes* into shorter ones. It is also why placement is timing-driven: the tool literally reads your timing constraints to decide where cells go.\n\n### Where the iterations happen\n\nOnly place-and-route results are final. Synthesis estimates are optimistic because they cannot know wire lengths; a design can pass synthesis with huge slack and fail routing. Professional habit: never declare victory before a routed timing report. On this platform there is no router to run — we practice by simulating RTL and by reading *synthetic* reports (clearly labeled), which is honest preparation for reading real ones in a vendor or open-source tool.',
    examples: [
      {
        title: 'One small design through the six stages',
        language: 'text',
        code:
          'RTL (2 files, 1 counter + 1 decoder)\n  |\n  v  ELABORATION\nelaborated netlist: 2 modules, 25-bit reg, 16 combinational outputs\n  |                     (error seen here: "port width mismatch")\n  v  SYNTHESIS\noptimized logic: 25 FFs, adder, 16 AND terms  (device-independent)\n  |\n  v  TECHNOLOGY MAPPING (iCE40-class, 4-input LUTs)\n~30 LUT4s + 25 FFs + carry chain + 1 outputmux per LED pin\n  |                     (error seen here: "cannot infer BRAM")\n  v  PLACEMENT\n30 LUTs + 25 FFs assigned die sites near the I/O used\n  |\n  v  ROUTING\nswitch network configured; longest path: counter MSB -> LED decode\n  |\n  v  BITSTREAM\ndesign.bit -- program flash --> board shows counter on LEDs',
        explanation: [
          'Elaboration catches *structural* RTL errors: widths, missing ports, generate loops gone wrong.',
          'Synthesis output is deliberately device-independent — the same netlist could feed any mapper.',
          'Mapping is the first stage where the device family changes the answer (LUT size, BRAM/DSP availability).',
          'Placement groups cells to shorten the critical route; here the counter and decoder land near the LED pins.',
          'Routing is where physical reality has the final word: congestion or a bad placement shows up as timing failures here.',
          'The bitstream itself makes no decisions — it is the serialized record of all previous decisions.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The FPGA build pipeline',
        content:
          ' Verilog RTL + constraints\n        |\n        v\n  [ELABORATION]  hierarchy, parameters, structure errors\n        |\n        v\n  [SYNTHESIS]    generic logic optimization (device-independent)\n        |\n        v\n  [TECH MAPPING] to LUTs / carry / BRAM / DSP (device-specific)\n        |\n        v\n  [PLACEMENT]    assign cells to die sites (timing-driven)\n        |\n        v\n  [ROUTING]      configure switch network (slowest, final say)\n        |\n        v\n  [BITSTREAM]    serialize configuration image\n        |\n        v\n  program device / flash',
        caption:
          'Each arrow commits the design further toward silicon; each stage\'s errors are a distinct class with distinct fixes.',
      },
    ],
    tables: [
      {
        caption: 'Stage-by-stage decisions and failure classes',
        headers: ['Stage', 'Input', 'Output', 'Decides', 'Typical beginner error'],
        rows: [
          ['Elaboration', 'RTL files', 'Elaborated hierarchy netlist', 'Does the design exist structurally?', 'Port/width mismatch, missing module'],
          ['Synthesis', 'Elaborated netlist', 'Optimized generic netlist', 'What logic is needed?', 'Inferred latch warning ignored'],
          ['Tech mapping', 'Generic netlist', 'Device-cell netlist', 'What LUTs/BRAM/DSPs does it cost?', 'Memory did not map to BRAM'],
          ['Placement', 'Mapped netlist', 'Cell locations', 'Where do cells sit?', 'Crowded region from bad floorplan assumptions'],
          ['Routing', 'Placed design', 'Routed design', 'Can all wires connect and meet timing?', 'Timing violated on long routes'],
          ['Bitstream', 'Routed design', '.bit/.bin image', 'Nothing (serialization)', 'Wrong-device image rejected'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Declaring the design done because synthesis reported success.',
        fix: 'Synthesis success only means the logic exists and mapped to cells. Only a routed, timing-clean report means the design meets its clock on real wire delays. Gate all conclusions on post-route timing analysis.',
      },
      {
        mistake: 'Fixing a routing-stage timing failure by rewriting the FSM encoding first.',
        fix: 'Diagnose before editing: routing failures usually mean long routes or congestion. The first tool is the timing report path listing (Module 3); the first fix is usually pipelining or register retiming, not exotic encodings.',
      },
      {
        mistake: 'Treating build time as an annoyance and skipping rebuilds between unrelated edits.',
        fix: 'Rebuild per logical change and archive each result. When a routed design stops working, the diff between two builds is the evidence; without it you are debugging from memory.',
      },
    ],
    guidedPractice: {
      title: 'Route the error to its stage',
      brief:
        'Assign each symptom to the pipeline stage that owns it: (a) "formal port \'rdy\' not found in module"; (b) "utilization: BRAM 118%, routing may fail"; (c) "setup violated on path ff[24] -> led_o, slack -2.1 ns"; (d) "cyclic dependency in generate block"; (e) "bitstream device id mismatch".',
      starterCode:
        'Stages: elaboration / synthesis / tech mapping / placement / routing / bitstream\n\n(a) ______  (b) ______  (c) ______  (d) ______  (e) ______',
      expectedBehavior:
        '(a) elaboration — structural RTL error. (b) tech mapping — resource over-use discovered when mapping memories. (c) routing — physical timing failure after place-and-route. (d) elaboration — elaboration evaluates generate constructs. (e) bitstream — the image targets the wrong device.',
      hints: [
        'Errors about names, ports and generate loops are structural.',
        'Utilization percentages exist from mapping onward; placement feasibility warnings come next.',
        'Negative slack on a named path is a post-route (or at least post-place) number.',
      ],
    },
    practiceExercises: [
      {
        title: 'Explain the estimate gap',
        brief:
          'In 3-4 sentences: why can synthesis report "Fmax 90 MHz" while post-route timing shows the same design failing 50 MHz?',
        expectedBehavior:
          'A correct answer: synthesis timing is estimated from logic delays with generic/optimistic wire models; routing adds real programmable-switch delays that can exceed logic delay, so post-route paths are longer. The number that matters is the post-route one.',
        hints: [
          'What does synthesis not know? Wire lengths.',
          'Which delay dominates on modern fabric?',
          'Which stage\'s report is the contract?',
        ],
      },
      {
        title: 'Pipeline the failure away',
        brief:
          'A 16-bit add-then-compare path from input pins to an output register fails timing after routing with a long wire in the middle. Propose the standard RTL-level fix and explain why it works.',
        expectedBehavior:
          'Add a pipeline register stage (register the adder output, compare in the next cycle, or register inputs near the pins). This splits one long logic-plus-wire path into two shorter paths, each meeting setup; latency increases by one cycle.',
        hints: [
          'Long paths are cut by registers.',
          'The cost of pipelining is latency, not throughput.',
          'Keep the async reset convention: negedge reset_n.',
        ],
      },
    ],
    assessment: {
      title: 'Build pipeline checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In which stage does the device family (e.g., 4-input vs 6-input LUTs) first change the result?',
          options: ['Elaboration', 'Synthesis', 'Technology mapping', 'Bitstream generation'],
          answer: 'Technology mapping',
          explanation:
            'Elaboration and synthesis are device-independent; mapping cuts generic logic into the target family\'s primitives (LUT size, carry chains, BRAM/DSP availability), so the device first matters there.',
          hint: 'Which stage\'s whole job is "become device cells"?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'On modern FPGAs, wire delay through programmable routing often exceeds the delay of the logic elements themselves.',
          answer: 'true',
          explanation:
            'Programmable interconnect is generic and comparatively slow; long routes dominate many critical paths. This is why placement is timing-driven and why pipelining is the standard fix.',
          hint: 'Think about what the placer is optimizing.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'A build log shows "port \'rdy\' not found in module uart_tx". Which stage failed?',
          options: ['Elaboration', 'Routing', 'Bitstream generation', 'Placement'],
          answer: 'Elaboration',
          explanation:
            'Structural errors — missing ports, width mismatches, bad generate loops — are elaboration errors, caught before any optimization or device work happens.',
          hint: 'Structural = before logic is even optimized.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One word: which pipeline stage serializes the placed-and-routed design into the configuration image?',
          answer: 'bitstream',
          explanation:
            'Bitstream generation records all prior decisions into the device-specific image; it makes no engineering decisions itself.',
          hint: 'It names the output artifact too.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Elaboration', definition: 'Stage that expands parameters/generates and builds the design hierarchy from RTL.' },
      { term: 'Technology mapping', definition: 'Cutting generic logic into target-device primitives (LUTs, carry, BRAM, DSP).' },
      { term: 'Placement', definition: 'Assigning each mapped cell to a physical site, optimizing for wire delay and congestion.' },
      { term: 'Routing', definition: 'Configuring the programmable switch network to connect placed cells under timing constraints.' },
      { term: 'Post-route timing', definition: 'Timing analysis performed after routing with real wire delays — the report that counts.' },
    ],
    revisionSummary: [
      'Pipeline: elaboration -> synthesis -> tech mapping -> placement -> routing -> bitstream.',
      'Elaboration catches structural RTL errors; synthesis optimizes logic device-independently.',
      'Mapping is where the device family changes the answer; P&R is where physical reality votes.',
      'Wire delay dominates on fabric — placement is timing-driven and pipelining cuts long paths.',
      'Only post-route timing reports are conclusive; synthesis numbers are estimates.',
    ],
    furtherReading: [
      { label: 'Yosys open synthesis suite documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
      { label: 'Wikipedia — Logic synthesis', url: 'https://en.wikipedia.org/wiki/Logic_synthesis', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'fpga-m02-l2',
    title: 'Vendor-Independent RTL vs Vendor-Specific Everything Else',
    summary:
      'Which parts of a design are portable RTL, which are deliberately device-specific (IP, primitives, constraints), and how open-source flows (Yosys + nextpnr) and vendor suites organize the same pipeline.',
    objectives: [
      'Classify design artifacts as portable RTL, vendor IP/primitives, or constraints — and keep them separated by discipline.',
      'Explain what vendor primitives and IP cores provide and the portability price of using them.',
      'Sketch how the open-source Yosys + nextpnr flow covers iCE40 and ECP5 families and where it stops.',
      'Describe what vendor suites add beyond the open-source flow (device families, IP catalogs, advanced timing tools) without endorsing any specific tool.',
    ],
    whyItMatters:
      'RTL you own is an asset that outlives boards, vendors and tool licenses; code that is welded to one vendor\'s primitives is not. The same portability discipline is what makes ASIC prototyping (m01-l2) possible at all. And for learners without tool licenses, the open-source flow is a real, complete pipeline on real devices — knowing its shape and limits tells you what you can practice today.',
    prerequisites: [
      'The build pipeline (fpga-m02-l1)',
      'Fabric resources (fpga-m01-l3)',
    ],
    explanation:
      'A complete FPGA design has three kinds of content, and the professional habit is keeping them in separate files:\n\n**Portable RTL** — your modules, FSMs, datapaths, written in plain Verilog/VHDL with the platform conventions (async active-low `reset_n`, nonblocking in clocked blocks, synchronous memories when BRAM is wanted). This is the 80-90% of a design that should compile on any vendor\'s synthesizer. Nothing here should name a device, a primitive, or a pin.\n\n**Vendor-specific primitives and IP** — instantiations of hard blocks and vendor libraries: PLL primitives, I/O DDR primitives, vendor FIFO/PCIe/Memory-controller IP. These exist because hard blocks out-perform anything synthesizable from LUTs, but each instantiation welds the design to one vendor (often one family). The discipline is to wrap each primitive in a small local wrapper module so the rest of the design depends on your interface, not the vendor\'s.\n\n**Constraints** — pin locations, I/O standards, clock definitions, timing exceptions (Module 3). Constraint syntax is vendor-specific by nature (XDC for Xilinx-style flows, LPF/SDC variants for Lattice and others): the *concepts* port, the syntax does not.\n\n### The open-source flow, honestly\n\nFor two Lattice device families — iCE40 and ECP5 — a complete open-source pipeline exists: **Yosys** performs elaboration, synthesis and technology mapping; **nextpnr-ice40 / nextpnr-ecp5** perform placement, routing and timing analysis; **icepack/ecppack** produce bitstreams. For these families the flow is genuinely end-to-end: RTL in, bitstream out, with real timing reports. Outside those families, open tooling is partial or research-grade, and the vendor suites (Xilinx Vivado, Intel Quartus, Lattice Radiant, Gowin IDE) remain the only practical route — their value is device coverage, mature timing engines, IP catalogs and debug cores, not a different pipeline shape: the six stages from Lesson 1 are identical.\n\nOn this platform we run no synthesis tools at all; every build-flow exercise here is conceptual or simulated in iverilog. The skill being trained — separating portable RTL from device-specific glue — is exercised with plain Verilog only, which is exactly why it transfers.',
    deepDive:
      '### Wrappers: one file of pain per vendor\n\nThe standard pattern: `pll_50to100.v` contains the vendor primitive and nothing else; every other module instantiates `pll_50to100` generically. Port the design to a new family and you rewrite a handful of wrapper bodies, not the design. The same pattern applies to FIFOs, RAMs with special features, and debug cores. Cost of the discipline: trivial. Cost of skipping it: a design where "port" means "rewrite", because vendor calls are smeared through every file.\n\n### What synthesis can infer vs what it cannot\n\nModern synthesizers (Yosys included) *infer* common structures from plain RTL: flip-flops with enables and resets, synchronous memories to BRAM, simple adders to carry chains. They cannot infer things that need hard blocks with configuration interfaces — PLLs, transceivers, DDR I/O — which is precisely why those exist as primitives/IP. Knowing the boundary tells you where vendor contact is unavoidable and where it is a choice. Note also a real limitation worth honesty: inference quality differs between tools, so a memory that cleanly hits BRAM in one synthesizer may need style adjustments in another — another reason to check utilization reports after *every* synthesizer change.',
    examples: [
      {
        title: 'Portable RTL with a wrapped vendor PLL',
        language: 'verilog',
        code:
          '//-----------------------------------------------------------------------------\n// pll_50_to_100.v — VENDOR WRAPPER (the ONLY file that may name a primitive)\n// Body is family-specific; here it is a documented placeholder because a real\n// body requires a vendor primitive. Every other module uses this interface.\n//-----------------------------------------------------------------------------\nmodule pll_50_to_100 (\n    input  wire clk_50m,     // 50 MHz input from board oscillator\n    input  wire reset_n,\n    output wire clk_100m,    // 100 MHz system clock\n    output wire locked       // 1 when PLL has locked\n);\n    // REAL FLOW: instantiate the vendor PLL primitive here with\n    // CLKIN=50 MHz, CLKOUT=100 MHz, and a lock output.\n    // THIS PLATFORM: no vendor tools, so the wrapper documents intent.\n    assign clk_100m = clk_50m;   // placeholder: identity (teaching only)\n    assign locked   = ~reset_n;  // placeholder: never used unreset\nendmodule\n\n//-----------------------------------------------------------------------------\n// top.v — 100% PORTABLE: no vendor names appear\n//-----------------------------------------------------------------------------\nmodule top (\n    input  wire clk_50m,\n    input  wire reset_n,\n    output reg  [7:0] count\n);\n    wire clk_sys, pll_locked;\n\n    pll_50_to_100 u_pll (\n        .clk_50m  (clk_50m),\n        .reset_n  (reset_n),\n        .clk_100m (clk_sys),\n        .locked   (pll_locked)\n    );\n\n    // Hold the design in reset until the PLL reports locked.\n    wire rst_sync_n = reset_n & pll_locked;\n\n    always @(posedge clk_sys or negedge rst_sync_n) begin\n        if (!rst_sync_n)\n            count <= 8\'d0;\n        else\n            count <= count + 1\'b1;\n    end\nendmodule',
        explanation: [
          'File 1 is the only vendor-touched file: its comment block states exactly what the real primitive instantiation does, and the body is an explicitly labeled placeholder — honest, since this platform has no vendor tools.',
          'File 2 (`top`) contains zero vendor vocabulary; it would elaborate unchanged against a real wrapper on a real family.',
          'The wrapper interface exposes `locked`, and `top` combines it with the external reset: `rst_sync_n = reset_n & pll_locked` so the design waits for a stable clock — a real-world habit.',
          'Clocking choice in one place: changing 100 MHz to 75 MHz is a wrapper edit, not a design edit.',
          'This is the portability discipline in miniature: one file of pain per vendor, portable RTL everywhere else.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The same six stages, two tool worlds',
        content:
          '        OPEN-SOURCE (iCE40/ECP5)         VENDOR SUITES (generic shape)\n        -------------------------        -----------------------------\nRTL --> Yosys: elaborate+synth+map  RTL--> suite synthesizer: elab+synth+map\n        |                                 |\n        v                                 v\n        nextpnr-ice40/ecp5:              suite place & route engine\n          place, route, timing            (+ timing-driven options)\n        |                                 |\n        v                                 v\n        icepack/ecppack -> bitstream     suite bitstream generator\n                                          + IP catalog, debug cores,\n                                            many device families',
        caption:
          'One pipeline shape, two implementations. Open-source covers specific Lattice families end-to-end; vendor suites trade openness for device breadth and mature timing/IP tooling.',
      },
      {
        kind: 'block',
        title: 'Design file taxonomy',
        content:
          '  src/\n    top.v ................ portable RTL (no vendor names)\n    uart.v ............... portable RTL\n    debouncer.v .......... portable RTL\n    pll_50_to_100.v ...... VENDOR WRAPPER (only vendor-naming file)\n    fifo_2clk.v .......... VENDOR WRAPPER (if hard FIFO used)\n  constraints/\n    pins.xdc ............. vendor-specific (pins, I/O standards)\n    clocks.xdc ........... vendor-specific (create_clock, exceptions)',
        caption:
          'The separation discipline: a port rewrites the wrapper bodies and constraint syntax; the RTL column moves untouched.',
      },
    ],
    tables: [
      {
        caption: 'Portable vs vendor-specific content',
        headers: ['Artifact', 'Class', 'Portability', 'Rule'],
        rows: [
          ['FSMs, datapaths, UARTs', 'Portable RTL', 'Full', 'No device/pin/primitive names'],
          ['Synchronous memories', 'Portable RTL (inferred)', 'Full', 'Sync read to encourage BRAM'],
          ['PLL, DDR I/O, transceivers', 'Vendor primitive/IP', 'None', 'Wrap in local module'],
          ['Vendor FIFO / PCIe / memory ctrl IP', 'Vendor IP', 'Low', 'Wrap; isolate interface'],
          ['Pin locations, I/O standards', 'Constraints', 'Syntax-specific', 'One file per board'],
          ['Clock definitions, exceptions', 'Constraints', 'Concept portable', 'Keep separate from RTL'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Instantiating vendor primitives directly in functional modules ("just this once").',
        fix: 'Wrap every vendor contact point. The first unwrapped primitive is never the last, and unwrapped vendor calls turn a portable design into a single-family design in one sprint.',
      },
      {
        mistake: 'Assuming "open-source flow" means "all FPGAs".',
        fix: 'The complete open-source pipeline (Yosys + nextpnr + packers) covers specific families — iCE40 and ECP5 are the flagship cases. Other families have partial or experimental support. Check current tool documentation rather than assuming coverage.',
      },
      {
        mistake: 'Embedding pin numbers and I/O standards as Verilog attributes in functional RTL.',
        fix: 'Keep pin/I/O information in constraint files. Attributes scattered through RTL make the design board-specific and unusable on the next board, even with the same device.',
      },
    ],
    guidedPractice: {
      title: 'Sort the design files',
      brief:
        'Classify each artifact as PORTABLE RTL, VENDOR WRAPPER, or CONSTRAINT, and state which file it belongs in: (a) a create_clock command for 50 MHz; (b) a Moore FSM for a garage door; (c) instantiation of a vendor DDR input primitive; (d) a synchronous-read coefficient ROM; (e) a pin location + LVCMOS33 standard for an LED.',
      starterCode:
        '(a) class: ____ file: ____\n(b) class: ____ file: ____\n(c) class: ____ file: ____\n(d) class: ____ file: ____\n(e) class: ____ file: ____',
      expectedBehavior:
        '(a) constraint, clocks file. (b) portable RTL, functional source. (c) vendor wrapper, dedicated file. (d) portable RTL, functional source (sync read -> BRAM). (e) constraint, pins file.',
      hints: [
        'Does the artifact describe *behavior* or *physical attachment*?',
        'Anything naming a pin or I/O standard is a constraint.',
        'Anything naming a vendor primitive gets its own wrapper file.',
      ],
    },
    practiceExercises: [
      {
        title: 'Design the wrapper interface',
        brief:
          'Specify the port list and semantics of a wrapper for a dual-clock FIFO so that the rest of a design never sees the vendor FIFO IP. Include what happens on reset and full/empty behavior.',
        expectedBehavior:
          'A generic interface: wr_clk, rd_clk, rst_n, wr_en, wr_data[WD-1:0], full, rd_en, rd_data[RD-1:0], empty (plus optional count). Semantics: full/empty are registered flags per clock domain, rst_n resets pointers in both domains. The body may instantiate vendor IP; the interface stays vendor-free.',
        hints: [
          'Write the interface you would want to instantiate ten times.',
          'Decide reset polarity for your wrappers and keep it consistent (platform: active-low _n).',
          'Optional data-count ports are nice but optional — mark them so.',
        ],
      },
      {
        title: 'Open-source flow fact check',
        brief:
          'From the Yosys/nextpnr documentation conceptually covered here, write a 5-line summary: which device families have a complete open flow, which tools own which pipeline stage, and what a vendor suite adds beyond it.',
        expectedBehavior:
          'Complete end-to-end open flow: iCE40 and ECP5 (Yosys: elaboration/synthesis/mapping; nextpnr-ice40/ecp5: place/route/timing; icepack/ecppack: bitstream). Vendor suites add broader device families, mature timing closure engines, IP catalogs and debug instrumentation. Coverage claims should defer to current documentation.',
        hints: [
          'Two Lattice families are the flagship open targets.',
          'Map each tool to the six-stage pipeline from m02-l1.',
          'Honesty requirement: say "per current documentation" for coverage claims.',
        ],
      },
    ],
    assessment: {
      title: 'Portability checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which artifact is legitimately vendor-specific and should live in a wrapper file?',
          options: [
            'The traffic-light FSM next-state logic',
            'A synchronous-read coefficient ROM',
            'A PLL primitive converting 50 MHz to 100 MHz',
            'The top-level port declarations',
          ],
          answer: 'A PLL primitive converting 50 MHz to 100 MHz',
          explanation:
            'PLLs are hard blocks with configuration interfaces that cannot be inferred from RTL, so they are instantiated as vendor primitives — wrapped in a dedicated file. FSMs, ROMs with sync reads and port declarations are portable RTL.',
          hint: 'Which one cannot be inferred from plain Verilog?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'The open-source tool chain of Yosys plus nextpnr can produce a working bitstream for any commercial FPGA family.',
          answer: 'false',
          explanation:
            'The complete open flow targets specific families — iCE40 and ECP5 are the flagship cases. Other families have partial or research-grade support. Coverage claims belong to current tool documentation.',
          hint: 'Think families, not universality.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'What is the main benefit of wrapping each vendor primitive in its own module?',
          options: [
            'It makes the primitive run faster',
            'It reduces bitstream size',
            'The rest of the design depends only on your interface, so ports rewrite wrappers, not the design',
            'Vendor primitives require a wrapper to compile at all',
          ],
          answer: 'The rest of the design depends only on your interface, so ports rewrite wrappers, not the design',
          explanation:
            'Wrappers localize vendor contact into a few files. Porting to a new family or tool then means rewriting wrapper bodies and constraints while portable RTL moves unchanged.',
          hint: 'The benefit is organizational, not electrical.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Two words: what kind of file should own pin locations and I/O standards, as opposed to functional Verilog?',
          answer: 'constraint file',
          explanation:
            'Pin locations, I/O standards, clock definitions and timing exceptions live in vendor-specific constraint files (XDC/LPF-style), keeping functional RTL board-independent.',
          hint: 'Module 3 is entirely about these files.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Portable RTL', definition: 'Device-independent Verilog/VHDL that any synthesizer can process — no vendor names, pins or primitives.' },
      { term: 'Vendor primitive', definition: 'A hard-block instantiation (PLL, DDR I/O) provided by the device vendor and not inferable from RTL.' },
      { term: 'Wrapper', definition: 'A local module that contains all vendor-specific instantiation behind a portable interface.' },
      { term: 'Yosys', definition: 'Open-source synthesis suite: elaboration, optimization and technology mapping for supported families.' },
      { term: 'nextpnr', definition: 'Open-source placement, routing and timing tool for iCE40 and ECP5 (nextpnr-ice40 / nextpnr-ecp5).' },
    ],
    revisionSummary: [
      'Three content classes: portable RTL, wrapped vendor primitives/IP, constraints — keep them in separate files.',
      'Only vendor contact points (PLL, DDR, hard IP) are unavoidable; everything inferable should stay portable.',
      'Open-source end-to-end flow exists for iCE40 and ECP5: Yosys (synth/map) + nextpnr (P&R/timing) + packers.',
      'Vendor suites add device breadth, mature timing engines and IP — the pipeline shape is the same.',
      'Inference quality differs between tools; re-check utilization after any synthesizer change.',
    ],
    furtherReading: [
      { label: 'Yosys documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
      { label: 'Wikipedia — Field-programmable gate array', url: 'https://en.wikipedia.org/wiki/Field-programmable_gate_array', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'fpga-m02-l3',
    title: 'Utilization: RTL Estimates vs Post-Place Reality',
    summary:
      'Read a resource utilization report end to end — LUTs, FFs, BRAM, DSP, I/O — understand why pre-synthesis estimates drift from final placed results, and learn the habits that keep estimates honest.',
    objectives: [
      'Read a utilization report: usage, capacity, percentage, and the "of N" phrasing.',
      'Explain the estimate chain: RTL-level estimation, post-synthesis, post-place — and why each step revises the previous number.',
      'Predict which RTL constructs move each resource column (registers vs LUTs vs BRAM vs DSPs).',
      'Apply utilization hygiene: check after synthesis, re-check after mapping, flag any resource above ~80% as a risk.',
    ],
    whyItMatters:
      'Utilization is the first feedback loop in FPGA development — it answers "does this even fit?" and "did that memory become a BRAM or an accident?" weeks before timing matters. Misreading it leads to two classic project failures: discovering at routing time that the device is full, and shipping a design whose memories silently consumed 10x the expected LUTs.',
    prerequisites: [
      'Fabric resources (fpga-m01-l3)',
      'The build pipeline (fpga-m02-l1)',
    ],
    explanation:
      'A utilization report is a budget table: for each resource class, how many of the device\'s blocks your design consumes. A typical shaped row reads `LUTs: 1,240 / 7,680 (16%)` — usage / capacity / percentage. The classes are the ones from Lesson m01-l3: logic (LUTs, FFs, carry), memory (BRAM blocks, sometimes split RAMB36/RAMB18-style), arithmetic (DSPs), clocking (PLLs/MMCMs), and I/O.\n\n### The estimate chain, and why numbers move\n\nYou will meet the same design\'s utilization three times, and the numbers will not agree:\n\n**1. RTL-level estimation** — mental or script-based: count registers from your `reg` declarations, assume one LUT per few levels of logic. Useful for sanity ("a 25-bit counter is not 5000 LUTs"), wrong in detail because it ignores sharing and optimization.\n\n**2. Post-synthesis** — the synthesizer reports what it mapped. Accurate for FFs and usually for BRAM/DSP inference; LUT counts are *estimates* because placement and further opt still pending, and different synthesizers infer differently.\n\n**3. Post-place (and post-route)** — the final truth after physical optimization: duplicate registers added for timing, unused logic pruned further, or resources repacked. This is the number that governs feasibility.\n\nThe drift is usually *downward* for over-specified RTL (shared logic, pruned constants) and *upward* when timing-driven optimization duplicates cells. A 10-20% swing between synthesis and post-place is normal for small designs; a 2x swing means the RTL style is fighting the tools.\n\n### Reading the report like an engineer\n\nThree habits: (1) **compare columns against your RTL inventory** — you wrote 3 memories and 2 multiplies; the report should show 3 BRAMs and 2+ DSPs, and if memories appear as thousands of LUTs, inference failed; (2) **watch the percentage, not just the count** — above roughly 80% on any class, routing gets hard and timing closure suffers; (3) **re-check after every meaningful RTL change**, because inference is style-sensitive.',
    deepDive:
      '### Why the same memory can cost 1 BRAM or 5,000 LUTs\n\nTake a 1024 x 8 lookup table. Coded with a synchronous read (`q <= rom[addr];` in a clocked block), it maps to one small BRAM. Coded with an asynchronous read (`assign q = rom[addr];`), BRAM is architecturally unavailable — the tool must build the table from LUTs/FFs, which at 8kbit can consume thousands of LUTs and all of them slow. Nothing in the code *looks* wrong; the utilization report is the only witness. This single example is why utilization review is a functional review, not an administrative one.\n\n### A synthetic report, dissected\n\nThe report below is a **synthetic example for teaching** — built to be internally consistent, not measured on real hardware. Device class is a small iCE40-style part (4-input LUTs, ~7.7k logic cells), a real and widely documented family, but these numbers are illustrative. Walk it with the three habits: FF count matches a design with a 25-bit counter, a baud generator and pipeline registers; 1 BRAM matches the one synchronous-read ROM; the I/O count matches 1 clock + 4 switches + 1 LED set. If your RTL inventory does not reconcile like this, inference or reset style needs review.',
    examples: [
      {
        title: 'Synthetic utilization report (teaching example, not a real tool run)',
        language: 'text',
        code:
          '== SYNTHETIC UTILIZATION REPORT (illustrative, for teaching) ==\nDevice: small iCE40-class part, 4-input LUTs, ~7,680 logic cells\n\nResource            Used / Capacity     Percent   Comment\n------------------  ------------------  -------   ------------------\nLogic cells (LUT4+FF)  1,132 / 7,680      14.7%   counter+decode+UART\n  - as LUTs              904\n  - as FFs               821            (some cells LUT-only or FF-only)\nBRAM blocks (4kbit)      1 / 32           3.1%   1k x 8 sync-read ROM\nDSP blocks               0 / 0            n/a    (family has none)\nPLL / clock mgmt         0 / 1            0.0%   running on raw osc clock\nI/O pins                11 / 36          30.6%   clk,4 sw,6 led\nMax fanout node         rst_n (821)               -> consider buffering\n\nReconciliation vs RTL inventory:\n  RTL declares: 25-bit counter + 8-bit baud div + 16 pipeline regs\n             -> expects ~50 FFs in datapath; report shows 821 FFs\n             -> excess: UART shifter, debouncers, fsm state regs\n             -> plausible; verify each block\'s FF count in submodule report\n  RTL declares: 1 ROM (sync read)      -> report: 1 BRAM  OK\n  RTL declares: 6 LED outputs          -> report: 6 I/O     OK',
        explanation: [
          'The header states the device class and that this is synthetic — mirror this honesty in any report you present on this platform.',
          'Resource rows use Used/Capacity/Percent: the "of N" shape you will see in every real tool.',
          'The LUT/FF split shows cells used as one or the other — real fabrics let a cell contribute either or both.',
          'The fanout line is a real report feature: a reset driving 821 loads is normal but worth noting; high-fanout nodes often need buffering.',
          'The reconciliation section is the habit to internalize: RTL inventory vs report, line by line, with discrepancies explained or investigated.',
        ],
      },
      {
        title: 'RTL whose utilization tells on it',
        language: 'verilog',
        code:
          '// Version A: async read -> NOT BRAM-able\nmodule lut_rom_bad (\n    input  wire [9:0] addr,\n    output wire [7:0] q\n);\n    reg [7:0] rom [0:1023];\n    // contents initialized elsewhere or by $readmemh in TB only\n    assign q = rom[addr];        // asynchronous read\nendmodule\n\n// Version B: sync read -> BRAM-able\nmodule lut_rom_good (\n    input  wire        clk,\n    input  wire [9:0] addr,\n    output reg  [7:0] q\n);\n    reg [7:0] rom [0:1023];\n    always @(posedge clk)\n        q <= rom[addr];          // synchronous read\nendmodule',
        explanation: [
          'Version A\'s `assign q = rom[addr];` demands the data in the same combinational cycle — block RAM cannot do that, so synthesis builds the whole 8 kbit table from LUTs and FFs: thousands of logic cells for one small ROM.',
          'Version B registers the read by one cycle — exactly what BRAM does natively — so the same data consumes one BRAM block.',
          'The functional difference is a one-cycle latency on `q`; if the consumer pipeline tolerates that, Version B is nearly free while Version A is ruinous.',
          'You cannot tell which version a design used by reading the code aloud — the utilization report is the arbiter. This is why the report belongs in every design review.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The estimate chain',
        content:
          ' RTL mental estimate  -->  post-synthesis  -->  post-place/route\n (register count,      (inference truth:    (final truth: physical\n  rough LUT guess)      BRAM? DSP? LUTs      optimization, duplication,\n        |                estimated)           repacking)\n        v                     v                     v\n   sanity check          inference check       feasibility check\n   ("25-bit counter       ("did my ROM hit      ("does it FIT and\n    is not 5k LUTs")       a BRAM?")             route under 80%?")',
        caption:
          'Three snapshots, three purposes. Decisions gate on the third; inference problems are caught at the second; the first just catches gross errors early.',
      },
    ],
    tables: [
      {
        caption: 'RTL constructs vs the utilization column they move',
        headers: ['RTL construct', 'Moves this column', 'Watch out for'],
        rows: [
          ['reg [W-1:0] in clocked block', 'FFs', 'Wide buses add up fast (a 32-bit pipe stage = 32 FFs)'],
          ['Synchronous-read memory', 'BRAM', 'Async read silently falls back to LUTs'],
          ['Variable multiply / MAC', 'DSPs', 'Small or constant multiplies may stay in LUTs instead'],
          ['Wide combinational expressions', 'LUTs', 'Flattened to truth tables; structure rarely survives'],
          ['Reset nets with huge fanout', 'Routing pressure', 'Consider sync reset for large fanout or buffered trees'],
          ['Unconstrained top-level ports', 'I/O', 'Every port needs a pin — and pins are finite'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reading the post-synthesis LUT count as final.',
        fix: 'Treat synthesis LUT numbers as estimates; only post-place numbers are contracts. Plan device headroom (below ~80%) against the post-place figure, and expect timing-driven optimization to move counts.',
      },
      {
        mistake: 'Never comparing the report against the RTL inventory.',
        fix: 'For every synthesis run, reconcile: expected FFs from declared registers, expected BRAM count from declared memories, expected DSPs from multiplies. Unexplained excess is an inference or style bug discovered cheaply.',
      },
      {
        mistake: 'Assuming a memory "obviously" becomes BRAM because it is big.',
        fix: 'Only synchronous-read patterns map to BRAM. Verify the BRAM row explicitly; an async-read 32 kbit table disguised as LUT logic is a classic silent disaster.',
      },
    ],
    guidedPractice: {
      title: 'Reconcile a synthetic report',
      brief:
        'A synthetic post-synthesis report for a design shows: 4,200 LUTs, 1,900 FFs, 0 BRAMs, 2 DSPs. The RTL inventory: two 512x16 sync-read memories, one 16x16 MAC, a 32-bit pipeline, one UART. Name the two discrepancies and their likely causes.',
      starterCode:
        'RTL inventory:\n  2 memories (512x16, sync read) -> expect 2 BRAMs, got ____\n  1 MAC (16x16)                  -> expect >=1 DSP,  got 2 (ok?)\n  32-bit pipeline                -> expect ~32+ FFs\n  UART                           -> small\n\nDiscrepancy 1: ____________\nDiscrepancy 2: ____________',
      expectedBehavior:
        'Discrepancy 1: 0 BRAMs where 2 sync-read memories are declared — likely the reads are actually asynchronous in code, or the tool failed to infer; inspect read style. Discrepancy 2: 4,200 LUTs is high for this inventory — consistent with memories implemented in LUT logic; confirm by fixing read style and re-running.',
      hints: [
        'Sync-read memories must appear as BRAMs; zero is a red flag.',
        'Large LUT counts with small logic inventory usually mean memories in LUTs.',
        '2 DSPs for 1 MAC is explainable (pipelined/retimed multiply) — not the bug to chase first.',
      ],
    },
    practiceExercises: [
      {
        title: 'Estimate before you build',
        brief:
          'For this RTL fragment, produce the estimate chain by hand: expected FFs, expected BRAMs, expected DSPs.\n\nreg [15:0] hist [0:255];  // written and read synchronously\nalways @(posedge clk) begin\n  if (we) hist[wa] <= wd;\n  rq <= hist[ra];\nend\nassign prod = a * b;  // a,b are 12-bit registers\nreg [23:0] acc;        // accumulates prod',
        expectedBehavior:
          'FFs: 256x16 = 4,096 bits live in BRAM (not FFs) because the read is synchronous; visible FFs are acc (24) plus inputs/outputs. BRAM: 1 (256x16 = 4 kbit fits one small block; capacity class depends on family). DSPs: 1 for the 12x12 multiply. LUTs: minor — control plus accumulator adds.',
        hints: [
          'Memory bits stored in BRAM do not appear as FFs.',
          'One multiply -> one DSP request.',
          'The accumulator is ordinary registered logic: LUTs + FFs.',
        ],
      },
      {
        title: 'Headroom policy',
        brief:
          'Write a one-paragraph team policy: at what utilization percentage per resource class does a design trigger escalation, and why the threshold differs for LUTs vs I/O pins.',
        expectedBehavior:
          'A defensible policy: logic resources (LUT/FF/BRAM/DSP) escalate near 80-85% because routing and timing degrade non-linearly as fabric fills; I/O escalates at 100% because pins cannot be over-subscribed at all (no rerouting freedom), so pin budget is checked at the very first estimate.',
        hints: [
          'Routing freedom shrinks as occupancy grows — why does timing get worse?',
          'Pins have no "congestion" grey zone: a pin is used or it is not.',
          'Different thresholds per resource are the point, not a single magic number.',
        ],
      },
    ],
    assessment: {
      title: 'Utilization checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A report line reads "BRAM: 1 / 32 (3%)". What does this mean?',
          options: [
            'One BRAM bit is used out of 32 bits',
            'One BRAM block is used out of the device\'s 32 blocks',
            'The design needs 32 BRAMs but only 1 is placed',
            'One percent of the BRAM is reserved for the tool',
          ],
          answer: "One BRAM block is used out of the device's 32 blocks",
          explanation:
            'Utilization rows are Used/Capacity/Percent in whole resource blocks: one block RAM in use, thirty-two available on the device, about three percent of the memory resource consumed.',
          hint: 'The "of N" phrasing compares usage to device capacity.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A 1024 x 8 memory with an asynchronous read will typically map to a block RAM.',
          answer: 'false',
          explanation:
            'Block RAM requires synchronous reads. An async-read array is implemented from LUTs/FFs instead — often thousands of logic cells for a small table. Register the read to get BRAM.',
          hint: 'Recall which access pattern BRAM supports.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Which utilization snapshot is the contract for "does it fit and meet timing"?',
          options: ['RTL mental estimate', 'Post-synthesis', 'Post-place/post-route', 'The file sizes of the sources'],
          answer: 'Post-place/post-route',
          explanation:
            'Only after placement and routing are physical optimization, duplication and real wire delays known. Post-synthesis numbers (especially LUTs) remain estimates.',
          hint: 'Which stage has the final say in the pipeline?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'One number: above roughly what percent utilization of logic resources do most teams expect routing/timing trouble to begin?',
          answer: '80',
          explanation:
            'Around 80 percent (teams vary, 80-85 is the common band), routing congestion and timing degradation grow steeply, so that threshold triggers escalation and headroom planning.',
          hint: 'It is the round two-digit threshold named in this lesson.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Utilization report', definition: 'Per-resource table of Used/Capacity/Percent for LUTs, FFs, BRAM, DSP, PLL, I/O.' },
      { term: 'Inference', definition: 'Synthesis recognizing RTL patterns (FFs, BRAM, DSP) and mapping them to hard resources automatically.' },
      { term: 'Fanout', definition: 'Number of loads driven by one net; very high fanout nets (resets) pressure routing.' },
      { term: 'Headroom', definition: 'Deliberate unused capacity (often keeping logic under ~80%) to preserve routability and timing.' },
      { term: 'Reconciliation', definition: 'Comparing report numbers against the RTL inventory to catch inference or style bugs.' },
    ],
    revisionSummary: [
      'Utilization rows are Used/Capacity/Percent per resource class.',
      'Estimate chain: RTL guess -> post-synthesis (inference truth) -> post-place (final truth).',
      'Sync-read memories map to BRAM; async reads silently become LUT logic.',
      'Reconcile every report against the RTL inventory; unexplained excess is a bug found cheaply.',
      'Keep logic classes under ~80%; I/O is all-or-nothing and is budgeted first.',
    ],
    furtherReading: [
      { label: 'Yosys documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
      { label: 'Wikipedia — Field-programmable gate array', url: 'https://en.wikipedia.org/wiki/Field-programmable_gate_array', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
