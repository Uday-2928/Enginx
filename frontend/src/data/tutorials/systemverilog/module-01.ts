import type { TutorialLesson } from '../types';

export const module01Lessons: TutorialLesson[] = [
  {
    id: 'sv-m01-l1',
    title: 'What SystemVerilog Adds (and What It Costs)',
    summary:
      'Place SystemVerilog on the map: a superset of Verilog-2005 with a design subset and a verification subset, and an honest look at which tools can actually run which parts.',
    objectives: [
      'Explain the relationship between Verilog (IEEE 1364) and SystemVerilog (IEEE 1800) and why SystemVerilog is described as a superset.',
      'Sort the major SystemVerilog features into design-side and verification-side additions.',
      'State honestly which simulator features this platform can grade and which require a full SystemVerilog simulator.',
      'List the first three language features worth adopting when moving a Verilog codebase to SystemVerilog.',
    ],
    whyItMatters:
      'SystemVerilog is the language every modern digital design and verification job posting assumes. But engineers who jump in blind waste months: they write code their tool cannot run, or they learn verification features they cannot practice. Knowing exactly what the language adds, and exactly what your toolchain supports, turns SystemVerilog from a marketing term into a concrete upgrade plan for your Verilog skills.',
    prerequisites: [
      'Completion of the Verilog HDL course on this platform',
      'Familiarity with modules, always blocks, wire and reg',
      'Basic familiarity with testbenches and simulation',
    ],
    explanation:
      'Verilog was standardized as IEEE 1364 and its last major revision is **Verilog-2005**. SystemVerilog began as a set of extensions built on top of that language and was standardized as **IEEE 1800**. Since the 2009 revision, IEEE 1364 has been merged into IEEE 1800: there is now one standard, and SystemVerilog is a **superset** of Verilog-2005. In practice this means every Verilog-2005 module you wrote in the previous course is still legal SystemVerilog (with a handful of well-documented corner cases), and modern tools treat Verilog as the older core of the same language.\n\nThe additions come in two families. The **design subset** makes hardware descriptions shorter and safer: `logic` as a universal single-driver type, `always_comb`, `always_ff` and `always_latch` blocks that state their intent and let the tool check it, `typedef`, `enum` and packed `struct` for structured data, `interface` for bundling related signals, and `package` for sharing declarations across files. The **verification subset** adds things Verilog simply has no equivalent for: classes and objects, constrained-random stimulus generation, functional coverage with `covergroup`, and SystemVerilog Assertions. Neither family is optional knowledge for a modern engineer, but they are used by different people at different times, and the tooling story for them is very different.\n\nThat tooling story deserves straight talk, because this is where most learners get stuck. **The automated grader on this platform runs Icarus Verilog.** Icarus fully supports Verilog-2001 and supports a subset of SystemVerilog — including `logic`, the typed `always_*` blocks, typedefs and much of the package system — but it does **not** implement the class-based OOP testbench features: no classes used as testbench objects, no `randomize()` with constraints, no `covergroup`, and no SystemVerilog Assertions. Commercial simulators (Siemens Questa, Synopsys VCS, Cadence Xcelium) implement the full IEEE 1800 language. Among open-source tools, **Verilator** supports a large and growing subset — including classes — but with its own limitations, and it is a compiled, cycle-based simulator rather than a general event-driven one.\n\nThe practical rule for this course: code labeled **Verilog-2001** runs on this platform as-is. Code labeled **SystemVerilog** that uses only design-subset features usually works on Icarus too, but code that uses classes, constraints or covergroups is **illustrative** — it is written to be correct against the standard so that it runs unchanged on a full simulator, and you should treat it as reading material here rather than something to paste into the grader.',
    deepDive:
      '### Why the two-subset split matters\n\nThe design subset of SystemVerilog is mostly about **catching mistakes at compile time instead of at 3 a.m. in the lab**. An incomplete sensitivity list in Verilog silently produces a mismatch between simulation and synthesis; `always_comb` makes the same mistake a compiler error. A typo in a `localparam` state encoding produces a wrong circuit; an `enum` makes it a type error. This is the same philosophy that took the software world from C to C++ and from dynamic languages to statically typed ones: move errors left, to the earliest moment they can be caught.\n\nThe verification subset is about **scaling effort with design size**. A directed test exercises one scenario per test; a design with 32-bit inputs has more scenarios than any human can enumerate. Classes let you build reusable stimulus and checking machinery; constrained randomization lets the tool enumerate scenarios for you; covergroups measure which ones actually ran. Together they replace the "one test per bug" grind with "thousands of tests per night", which is the only way gate-level-scale designs get verified.\n\n### Version confusion in the wild\n\nJob ads and documentation say SV-3.1a, SystemVerilog-2005, SystemVerilog-2009, SystemVerilog-2012 and SystemVerilog-2017. The historical order is: Accellera SystemVerilog 3.0/3.1a (donated to IEEE), IEEE 1800-2005 (as an extension to IEEE 1364-2005), IEEE 1800-2009 (merged the two standards), IEEE 1800-2012 (the version most tooling targets), and IEEE 1800-2017 (mostly clarification). When a textbook says "SystemVerilog" without a year, it almost always means the 1800-2012 feature set. You do not need to memorize this history; you need to know that when a tool rejects legal-looking code, the likely reason is that the feature arrived in a later revision than the tool supports.\n\n### A note on "superset" honesty\n\nStrictly, a few obscure Verilog-2005 constructs are not bit-for-bit compatible with SystemVerilog (for example, some subtle rules around `define` text macros and default net behaviors). Every real codebase converts cleanly, and every real tool accepts Verilog source in SystemVerilog mode. Treat "superset" as true for all practical purposes, and know that the exceptions are documented in the standard rather than lurking to surprise you.',
    examples: [
      {
        title: 'The same DUT written twice: Verilog-2001 then SystemVerilog',
        language: 'verilog',
        code:
        '// Verilog-2001: 8-bit register with enable and a combinational compare flag\nmodule reg8(\n    input  wire       clk,\n    input  wire       rst_n,\n    input  wire       en,\n    input  wire [7:0] d,\n    output reg  [7:0] q,\n    output wire       is_zero\n);\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n) q <= 8\'h00;\n        else if (en) q <= d;\n    end\n\n    assign is_zero = (q == 8\'h00);\nendmodule',
        explanation: [
          'Standard Verilog-2001: `reg q` because q is assigned procedurally, `wire` for the continuous-assignment output.',
          'The async-reset register uses the classic `posedge clk or negedge rst_n` template with nonblocking assignments.',
          '`is_zero` is combinational, so it is a `wire` driven by one `assign`. This module is completely legal SystemVerilog too.',
        ],
      },
      {
        title: 'The same DUT refactored into SystemVerilog',
        language: 'systemverilog',
        code:
        '// SystemVerilog (IEEE 1800): same hardware, sharper intent\nmodule reg8(\n    input  logic       clk,\n    input  logic       rst_n,\n    input  logic       en,\n    input  logic [7:0] d,\n    output logic [7:0] q,\n    output logic       is_zero\n);\n    always_ff @(posedge clk or negedge rst_n) begin\n        if (!rst_n) q <= 8\'h00;\n        else if (en) q <= d;\n    end\n\n    assign is_zero = (q == 8\'h00);\nendmodule',
        explanation: [
          'Every `wire`/`reg` becomes `logic`: one type for anything driven from a single driver, so you never stop to ask which one applies.',
          '`always_ff` replaces `always @(posedge ...)`: identical synthesis result, but the tool now verifies this block really models flip-flops and rejects blocking assignments inside it.',
          'The net effect on this small module is modest — the payoff grows with design size, as later lessons show.',
          'This design-subset code is the kind Icarus Verilog generally accepts, so it is close to what the platform grader can run.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'SystemVerilog as layered additions on Verilog',
        content:
        '                 +--------------------------------------------+\n                 |      SystemVerilog (IEEE 1800)             |\n                 |                                            |\n                 |  VERIFICATION additions (classes, random-  |\n                 |  ization, covergroups, SVA, DPI)           |\n                 |  -> need a full SV simulator               |\n                 |                                            |\n                 |  DESIGN additions (logic, always_*,        |\n                 |  typedef/enum/struct, interface, package)  |\n                 |  -> improve RTL, widely supported          |\n                 |                                            |\n                 |  +--------------------------------------+  |\n                 |  |   Verilog-2005 core (IEEE 1364)      |  |\n                 |  |   modules, always, wire/reg, assign  |  |\n                 |  +--------------------------------------+  |\n                 +--------------------------------------------+\n\n  Everything in the inner box is legal in the outer box.\n  Tool support thins out as you move outward.',
        caption:
          'A mental model of the language: the Verilog core, the widely-supported design additions, and the verification layer that requires a full simulator.',
      },
    ],
    tables: [
      {
        caption: 'What SystemVerilog adds, split by audience',
        headers: ['Area', 'Feature', 'What it replaces or improves'],
        rows: [
          ['Design', 'logic', 'Replaces the wire/reg decision for single-driver signals'],
          ['Design', 'always_comb / always_ff / always_latch', 'Replaces always @(*) and always @(posedge clk) with checked intent'],
          ['Design', 'typedef, enum, packed struct', 'Replaces localparam state encodings and flat bit vectors'],
          ['Design', 'interface, modport', 'Replaces long repeated port lists for related signals'],
          ['Design', 'package', 'Releases shared types and parameters from include-file hacks'],
          ['Verification', 'class / object handle', 'No Verilog equivalent: reusable stimulus and checker objects'],
          ['Verification', 'rand, constraint, randomize()', 'No Verilog equivalent: legal-scenario generation'],
          ['Verification', 'covergroup, coverpoint, bins, cross', 'No Verilog equivalent: functional coverage measurement'],
          ['Verification', 'assert property (SVA)', 'No Verilog equivalent: temporal checker statements'],
        ],
      },
      {
        caption: 'Honest tool-support picture for SystemVerilog features',
        headers: ['Tool', 'Design subset', 'Classes/OOP', 'Constraints + covergroups', 'SVA'],
        rows: [
          ['Icarus Verilog (this platform grader)', 'Large subset (logic, always_*, typedef/enum, packages)', 'Not usable for testbenches', 'Not supported', 'Not supported'],
          ['Verilator (open source)', 'Broad support', 'Supported with limits', 'Partial and evolving', 'Partial (many properties supported)'],
          ['Commercial (Questa, VCS, Xcelium)', 'Full', 'Full', 'Full', 'Full'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Treating SystemVerilog as a different language you must learn from scratch.',
        fix: 'It is your Verilog plus extensions. Migrate incrementally: rename wire/reg to logic, then adopt the typed always blocks, then typedef/enum, then packages. Each step compiles and simulates like the last one.',
      },
      {
        mistake: 'Pasting class-based testbench code into the platform grader and concluding "SystemVerilog is broken" when it fails.',
        fix: 'Check the language label and the feature used. Classes, randomize() and covergroups need a full SystemVerilog simulator (Questa, VCS, Xcelium, or Verilator with limitations). Icarus, which grades this platform, does not implement them.',
      },
      {
        mistake: 'Assuming all open-source tools have the same SystemVerilog support.',
        fix: 'Icarus and Verilator are different projects with different feature sets, and both trail commercial simulators. Always check the tool manual for the specific construct before blaming your code.',
      },
    ],
    guidedPractice: {
      title: 'Sort the features',
      brief:
        'Without looking at the table, write down each of these features under DESIGN or VERIFICATION: interface, covergroup, always_ff, class, package, constraint, enum, assert property, modport, randomize(). Then check yourself against the table in this lesson.',
      expectedBehavior:
        'Design: interface, always_ff, package, enum, modport. Verification: covergroup, class, constraint, assert property, randomize(). Interfaces sit on the design side even though testbenches also use them.',
      hints: [
        'Ask: does this describe hardware structure, or does it describe simulation-time behavior?',
        'Anything with a runtime object or a temporal check is verification-side.',
        'Interfaces are bundles of signals, so they are design-side even though testbenches connect through them.',
      ],
    },
    practiceExercises: [
      {
        title: 'Migration order planning',
        brief:
          'A teammate has a 5,000-line Verilog-2001 RTL tree and wants SystemVerilog benefits with zero functional risk. Propose an order for adopting: logic, classes, always_ff, packages, covergroups, enums. Justify each step in one sentence.',
        expectedBehavior:
          'A sound order is logic, then always_ff/always_comb, then typedef/enum, then packages (design-side, low risk, tool-supported), and only later classes and covergroups (which need new tooling and testbench architecture).',
        hints: [
          'Low-risk steps are the ones that change declarations, not behavior.',
          'Adopting classes before the toolchain supports them blocks everything downstream.',
          'Packages should exist before enums are shared across many files.',
        ],
      },
      {
        title: 'Tool reality check',
        brief:
          'Write down, from memory, which of these five features you could verify on this platform today: (a) logic-typed RTL, (b) a class-based scoreboard, (c) randomize() with constraints, (d) a covergroup, (e) always_comb RTL. Then confirm against the tool-support table.',
        expectedBehavior:
          'Runnable or largely runnable on Icarus: (a) and (e). Not runnable on this platform: (b), (c), (d) — they require a full SystemVerilog simulator or Verilator with limitations.',
        hints: [
          'The platform grader is Icarus Verilog.',
          'Two of the five are design-subset features.',
          'Anything from the verification subset needs more than Icarus.',
        ],
      },
    ],
    assessment: {
      title: 'SystemVerilog landscape checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which IEEE standard defines SystemVerilog?',
          options: ['IEEE 1364', 'IEEE 1800', 'IEEE 754', 'IEEE 1149.1'],
          answer: 'IEEE 1800',
          explanation:
            'IEEE 1800 defines SystemVerilog. IEEE 1364 was the older Verilog standard, merged into IEEE 1800 with the 2009 revision.',
          hint: 'The 1364 number belongs to classic Verilog.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt:
            'SystemVerilog is a superset of Verilog-2005: essentially every legal Verilog-2005 module is also legal SystemVerilog.',
          answer: 'true',
          explanation:
            'With a handful of documented corner cases, Verilog-2005 source is legal SystemVerilog; the standards were merged in IEEE 1800-2009.',
          hint: 'Think about whether a Verilog module needs modification to compile in SV mode.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Which of these features belongs to the verification subset rather than the design subset?',
          options: ['always_ff', 'interfaces', 'covergroups', 'packed structs'],
          answer: 'covergroups',
          explanation:
            'Covergroups measure which functional scenarios a simulation exercised. They are simulation-only objects and have no hardware meaning; the other three describe hardware structure.',
          hint: 'Which one is something you measure rather than something you synthesize?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Which open-source simulator executes the exercises graded on this platform (two words)?',
          answer: 'Icarus Verilog',
          explanation:
            'The platform grader runs Icarus Verilog. It supports Verilog-2001 well and much of the SystemVerilog design subset, but not classes, constrained randomization, covergroups or SVA.',
          hint: 'It is named after a tree and a hardware description language.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'SystemVerilog (IEEE 1800)', definition: 'The unified HDL standard that contains Verilog-2005 as a subset and adds design and verification extensions.' },
      { term: 'Design subset', definition: 'SystemVerilog features that describe hardware: logic, typed always blocks, typedef/enum/struct, interfaces, packages.' },
      { term: 'Verification subset', definition: 'SystemVerilog features that describe simulation behavior: classes, constrained randomization, covergroups, assertions, DPI.' },
      { term: 'Superset', definition: 'A language that contains another language: all Verilog-2005 programs are (for practical purposes) SystemVerilog programs.' },
      { term: 'Feature subset support', definition: 'The honest fact that each simulator implements some portion of IEEE 1800; always verify support for a specific construct.' },
    ],
    revisionSummary: [
      'SystemVerilog = Verilog-2005 core + design additions + verification additions (IEEE 1800).',
      'Design additions: logic, always_comb/ff/latch, typedef/enum/struct, interface/modport, packages.',
      'Verification additions: classes, rand/constraints, covergroups, SVA — none exist in Verilog.',
      'This platform grades with Icarus Verilog: Verilog-2001 fully, much of the design subset, none of the OOP/coverage/assertion layer.',
      'In-lesson code labeled SystemVerilog with classes or constraints is illustrative; it is standard-correct but needs a full simulator to run.',
    ],
    furtherReading: [
      { label: 'Wikipedia — SystemVerilog', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
      { label: 'Accellera — SystemVerilog standards and downloads', url: 'https://www.accellera.org/downloads/standards/systemverilog/', kind: 'standard' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'sv-m01-l2',
    title: 'logic: Ending the wire/reg Confusion',
    summary:
      'Understand why Verilog needed both wire and reg, why that split causes real bugs, and how the SystemVerilog logic type removes the decision — plus the few places wire is still required.',
    objectives: [
      'Explain what the Verilog wire/reg distinction actually encodes and why it confuses newcomers.',
      'Use logic as the default declaration for single-driver signals in SystemVerilog.',
      'Name the situations where wire (or tri) is still mandatory: multiple drivers, inout ports and bidirectional buses.',
      'Predict which declarations are legal when a signal is driven by a continuous assignment, a procedure, or both.',
    ],
    whyItMatters:
      'Every beginning Verilog engineer hits the same wall: "I changed this wire to reg and now it does not compile" or "why does my reg not become a register?". The wire/reg split does not describe the hardware you want — it describes which language construct drives the signal, which is bookkeeping, not design. SystemVerilog logic removes that bookkeeping for the common case, and knowing the few remaining wire cases is a genuine interview question and a daily-coding skill.',
    prerequisites: [
      'sv-m01-l1: what SystemVerilog is and how this course labels languages',
      'Verilog continuous assignment (assign) versus procedural assignment',
    ],
    explanation:
      'In Verilog, the type you declare is dictated by **how the signal is driven**, not by what the hardware is. A `wire` can only be driven by a continuous assignment (`assign`), a module output port, or a gate primitive. A `reg` can only be assigned from inside a procedure (`always`, `initial`, `task`). The infamous trap is that `reg` says nothing about registers: a reg assigned in an `always @(posedge clk)` block synthesizes to a flip-flop, while the *same* reg assigned in an `always @(*)` block synthesizes to pure combinational logic. The keyword name is simply wrong for the intuition.\n\nThis coupling creates two recurring pains. First, **refactoring churn**: if you rewrite a combinational `assign` as an `always` block, you must also change `wire` to `reg` at the declaration, in a different part of the file. Second, **silent mistakes**: an engineer who "knows registers need reg" declares a signal reg and drives it from an always block that is actually combinational, and nothing warns them.\n\nSystemVerilog introduces **`logic`**, a 4-state variable type. A variable is something you assign values to and that holds the last value written; that is exactly what reg was. The upgrade is that a logic variable may be driven by **one continuous assignment, or by one or more procedural assignments — but not both styles at once, and not by two continuous assignments**. In other words: one driver of any style. For the overwhelmingly common case — a signal with exactly one driver — you can now declare `logic` and never think about wire/reg again. Multi-driver situations (tri-state buses, inout ports) are the real exception and still require net types such as `wire`/`tri`, because multiple drivers need resolution semantics that variables do not have.\n\nOne more honest subtlety: `logic` is 4-state (0, 1, x, z) like reg and wire. SystemVerilog also adds 2-state types (`bit`, `int`, and others) which are faster in simulation but can hide x/z bugs, because an uninitialized 2-state variable silently reads 0. For RTL, stay with `logic`; 2-state types belong in verification code where you control the risk.',
    deepDive:
      '### What the tool checks for you\n\nBecause a logic variable is a *variable*, the compiler enforces the one-driver rule. Two `assign` statements writing the same logic signal is a compile error, not a silent multiple-driver race like it would be on two wires. Assigning a logic variable from an `always` block *and* from an `assign` is also a compile error. This converts a classic debug session ("why does this node oscillate?") into a two-second error message. With `wire`, multiple drivers are legal because wires have resolution functions; with `logic`, legality equals design intent for the common case.\n\n### Ports and the direction/type matrix\n\nFor `input` ports, `logic` and `wire` behave identically because an input port is driven by the caller. For `output` ports, `logic` lets you drive from either an assign or a procedure without changing the declaration, which is exactly the refactor churn we wanted to kill. `output reg` in Verilog becomes plain `output logic`. For `inout` ports you must keep a net type (`wire`/`tri`), because bidirectional transfer fundamentally needs multiple drivers — the caller and callee both can drive.\n\n### The exception list, explicitly\n\nKeep these three rules and you will never pick the wrong type: (1) default to `logic` for every signal you own; (2) use `wire`/`tri` when the node has **two or more drivers** or is **inout**; (3) inside testbench code you may meet 2-state types, but do not bring them back into RTL. Some coding standards still require `wire` for outputs of instantiated modules for readability; that is style, not semantics, since a driven-by-instance output is fine as logic too.\n\n### What logic does not fix\n\nlogic removes the *declaration* decision; it does not remove the *coding-style* decisions. Blocking versus nonblocking assignment and full versus partial if/case statements still determine whether your procedural block synthesizes to flip-flops, latches or gates. Those are the subject of the typed always blocks in Module 03 — logic plus always_ff/always_comb together is where the real safety shows up.',
    examples: [
      {
        title: 'The refactor churn problem in Verilog-2001',
        language: 'verilog',
        code:
        '// Verilog-2001: changing coding style forces a declaration change too\nmodule mux2(\n    input  wire       sel,\n    input  wire [7:0] a,\n    input  wire [7:0] b,\n    output reg  [7:0] y      // reg ONLY because we use always below\n);\n    // Dataflow version (would need: output wire y):\n    //   assign y = sel ? b : a;\n\n    always @(*) begin\n        if (sel) y = b;\n        else     y = a;\n    end\nendmodule',
        explanation: [
          'y is declared `reg` for one reason only: it is assigned inside an always block.',
          'If a teammate switches this module back to the one-line assign, the declaration must become `wire` in the same edit — two coordinated changes for one logical change.',
          'The hardware is identical either way: one 2-to-1 multiplexer. The type system is describing the code structure, not the design.',
        ],
      },
      {
        title: 'One declaration for any single-driver coding style',
        language: 'systemverilog',
        code:
        '// SystemVerilog: logic works for assign OR procedural coding styles\nmodule mux2(\n    input  logic       sel,\n    input  logic [7:0] a,\n    input  logic [7:0] b,\n    output logic [7:0] y\n);\n    // Style A (dataflow):\n    // assign y = sel ? b : a;\n\n    // Style B (procedural):\n    always_comb begin\n        if (sel) y = b;\n        else     y = a;\n    end\nendmodule',
        explanation: [
          'Switching between the assign version and the always_comb version requires no declaration change: y stays `output logic`.',
          '`always_comb` appears here for completeness; Module 03 covers it in depth. The point of this lesson is that y needs no wire/reg decision.',
          'Exactly one driver is active in this module — the legal case for a logic variable.',
        ],
      },
      {
        title: 'Where wire is still required: multiple drivers',
        language: 'systemverilog',
        code:
        '// SystemVerilog: a tri-state bus needs a net type, not a variable\nmodule bus_ex(\n    input  logic       en_a,\n    input  logic [7:0] data_a,\n    input  logic       en_b,\n    input  logic [7:0] data_b,\n    inout  wire  [7:0] bus_io   // bidirectional: must be a net\n);\n    // Two drivers meet on bus_wire, so it must be a resolving net type.\n    wire [7:0] bus_wire = en_a ? data_a : 8\'bZZZZ_ZZZZ;\n\n    // ILLEGAL on a logic variable (compile error in SV tools):\n    // assign bus_wire2 = en_a ? data_a : 8\'hZZ;\n    // assign bus_wire2 = en_b ? data_b : 8\'hZZ;  // two continuous drivers\n\n    assign bus_io = bus_wire;\nendmodule',
        explanation: [
          '`bus_wire` is driven conditionally to Z by design: when en_a is low it releases the bus so the other driver can speak. This resolution behavior is what net types (wire/tri) provide and variables do not.',
          'Declaring a logic signal and driving it from two assign statements is a **compile error** in SystemVerilog — the tool protecting you from an unintended multiple-driver node.',
          'The inout port keeps `wire` because bidirectional ports are inherently multi-driver.',
          'Rule of thumb: if you find yourself writing Z, you are in net-type territory.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Choosing a type: the one-question decision tree',
        content:
        '                  +---------------------------------+\n                  | How many drivers does the node  |\n                  | have (or is it inout)?          |\n                  +----------------+----------------+\n                                   |\n                 exactly ONE driver |  2+ drivers or inout\n                    +---------------+----------------+\n                    |                                |\n                    v                                v\n          +---------------------+          +--------------------+\n          | logic (a variable)  |          | wire / tri (a net) |\n          | assign OR procedure |          | resolving drivers, |\n          | 4-state: 0,1,x,z    |          | Z release, inout   |\n          +---------------------+          +--------------------+\n\n  In Verilog-2001 the ONE-driver case still forces a wire/reg\n  choice based on coding style. In SystemVerilog, logic ends it.',
        caption:
          'The whole wire/reg/logic decision in one picture: count the drivers, not the coding style.',
      },
    ],
    tables: [
      {
        caption: 'wire vs reg vs logic at a glance',
        headers: ['Property', 'wire (Verilog/SV)', 'reg (Verilog)', 'logic (SystemVerilog)'],
        rows: [
          ['Kind of object', 'Net (models a connection)', 'Variable (holds last value)', 'Variable (holds last value)'],
          ['Driven by assign', 'Yes', 'No', 'Yes (single assign only)'],
          ['Driven in a procedure', 'No', 'Yes', 'Yes'],
          ['Both styles at once', 'N/A', 'No', 'No — compile error'],
          ['Two continuous drivers', 'Yes (resolution)', 'No', 'No — compile error'],
          ['Number of states', '4 (0,1,x,z)', '4 (0,1,x,z)', '4 (0,1,x,z)'],
          ['Implies a register', 'No', 'No — name is misleading', 'No'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Declaring a signal logic and driving it from both an assign and an always block.',
        fix: 'A logic variable allows exactly one continuous driver OR procedural assignments, never both. Pick one style for each signal; if the tool reports multiple drivers, that is a real design question about which driver you intended.',
      },
      {
        mistake: 'Using logic for a tri-state or shared bus because "logic is the new wire".',
        fix: 'Multiple drivers need resolution semantics, which only net types (wire, tri) provide. Any node that releases to Z or is driven by more than one source must stay a net type.',
      },
      {
        mistake: 'Choosing 2-state types (bit, int) for RTL signals to make simulation faster.',
        fix: 'Uninitialized 2-state signals read as 0 instead of x, so reset bugs and uninitialized-memory bugs disappear from the simulation instead of being caught. Use logic in RTL; keep 2-state types for testbench bookkeeping.',
      },
    ],
    guidedPractice: {
      title: 'Predict the compiler verdict',
      brief:
        'For each fragment, decide whether it compiles under SystemVerilog rules: (1) logic a; assign a = 1; assign a = 0; (2) logic b; always_comb b = 1; (3) logic c; assign c = 1; always_comb c = 0; (4) wire d; assign d = 1; assign d = 0;',
      expectedBehavior:
        '(1) compile error — two continuous drivers on a variable. (2) legal — procedural assignment, one driver. (3) compile error — variable driven by assign and procedure. (4) legal — wires allow multiple resolving drivers.',
      hints: [
        'The rule is about driver count and style mixing, not about values.',
        'Wires are nets: multiple drivers are their whole purpose.',
        'Variables remember the last write, so simultaneous writers are meaningless and the LRM forbids them.',
      ],
      starterCode:
        '// No simulation needed: reason from the one-driver rule.\n// (1) logic a; assign a = 1\'b1; assign a = 1\'b0;\n// (2) logic b; always_comb b = 1\'b1;\n// (3) logic c; assign c = 1\'b1; always_comb c = 1\'b0;\n// (4) wire  d; assign d = 1\'b1; assign d = 1\'b0;',
    },
    practiceExercises: [
      {
        title: 'Audit a port list',
        brief:
          'Convert this Verilog port list to SystemVerilog, and state in one sentence per port why your choice is safe: input wire clk, input wire [3:0] addr, output reg [7:0] rdata, inout wire dio, output wire irq (irq is driven by one assign).',
        expectedBehavior:
          'clk: input logic. addr: input logic [3:0]. rdata: output logic (procedural or assign both fine). dio: stays wire/inout — bidirectional needs a net. irq: output logic (single assign driver).',
        hints: [
          'Input ports are driven by the caller, so type freedom is the same as for internal single-driver signals.',
          'Only inout forces a net type.',
          'output reg simply becomes output logic.',
        ],
      },
      {
        title: 'Find the illegal declaration',
        brief:
          'A module declares `logic [15:0] data_bus;` and contains: assign data_bus = a; assign data_bus = b; Explain why this compiled in the old Verilog net version of the code but must fail as logic, and give the correct SystemVerilog declaration for a genuine two-driver bus.',
        expectedBehavior:
          'As a wire in Verilog, two drivers resolved continuously and silently picked (or merged) a winner. As a logic variable, two continuous drivers are illegal by rule. The correct declaration is wire [15:0] data_bus; (or tri), keeping resolution semantics.',
        hints: [
          'Ask what the old code did when both drivers were active.',
          'Silent resolution is a feature of nets, not of variables.',
          'The fix is one keyword.',
        ],
      },
    ],
    assessment: {
      title: 'logic vs wire/reg checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What happens when this SystemVerilog fragment is compiled?',
          code: 'logic [3:0] x;\nassign x = 4\'b1010;\nassign x = 4\'b0101;',
          options: ['x becomes 0101 (last write wins)', 'x becomes 1010', 'x becomes xxxx', 'Compile error'],
          answer: 'Compile error',
          explanation:
            'A logic variable cannot have two continuous drivers. SystemVerilog makes this a compile error; on a wire the same code would silently resolve.',
          hint: 'Count the continuous drivers on the variable.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which declaration is still mandatory for an inout port?',
          options: ['logic', 'bit', 'wire (a net type)', 'int'],
          answer: 'wire (a net type)',
          explanation:
            'Bidirectional ports need resolution semantics for multiple drivers, which only net types like wire/tri provide. Variables cannot be inout.',
          hint: 'What property does a shared bus need that a variable lacks?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In Verilog-2001, declaring a signal as reg guarantees that synthesis will create a flip-flop for it.',
          answer: 'false',
          explanation:
            'reg only means the signal is assigned procedurally. Inside always @(*) it becomes combinational logic; inside always @(posedge clk) it becomes a flip-flop. The keyword name is misleading.',
          hint: 'Remember what the mux2 example synthesizes to when coded in an always @(*) block.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'A 4-state variable initialized to x will silently read as 0 if you retyped it as which kind of type?',
          options: ['logic', 'wire', 'a 2-state type such as bit or int', 'tri'],
          answer: 'a 2-state type such as bit or int',
          explanation:
            '2-state types have only 0 and 1; the x of an uninitialized 4-state variable becomes 0, hiding reset and initialization bugs from the simulation.',
          hint: 'How many states does each type family have?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Net', definition: 'A type (wire, tri) modeling a physical connection with driver-resolution semantics; required for multiple drivers and inout.' },
      { term: 'Variable', definition: 'An object that holds the last value assigned to it; reg (Verilog) and logic (SystemVerilog) are 4-state variables.' },
      { term: 'logic', definition: 'SystemVerilog 4-state variable type usable for any single-driver signal regardless of coding style.' },
      { term: '2-state type', definition: 'Types such as bit and int with only 0 and 1 values; faster but hide x/z conditions. Not recommended for RTL.' },
      { term: 'Resolution', definition: 'The process of combining the values driven by multiple drivers on one net, including Z for released drivers.' },
    ],
    revisionSummary: [
      'Verilog wire/reg describes the driving construct, not the hardware; reg does not imply a register.',
      'logic is a 4-state variable type that replaces the wire/reg decision for single-driver signals.',
      'One driver rule for logic: a single assign, or procedural assignments — never both styles, never two assigns.',
      'Multi-driver nodes, tri-state release to Z, and inout ports still require net types (wire/tri).',
      'Keep 4-state logic in RTL; 2-state types turn x into silent 0s and hide bugs.',
    ],
    furtherReading: [
      { label: 'Wikipedia — SystemVerilog (data types section)', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'sv-m01-l3',
    title: 'First Refactor: Verilog Module to SystemVerilog',
    summary:
      'Walk a real refactor end to end: take a Verilog-2001 register file and modernize declarations, always blocks and output style — without changing the synthesized hardware.',
    objectives: [
      'Refactor a Verilog-2001 module into SystemVerilog with a written, checkable invariant: same hardware, clearer code.',
      'Apply logic, always_ff and always_comb in the correct places in one module.',
      'Explain which refactor steps change tool checking and which change nothing at all.',
      'Verify a refactor by comparing simulated behavior before and after.',
    ],
    whyItMatters:
      'Almost nobody writes new Verilog anymore; they maintain old Verilog and extend it in SystemVerilog. The skill of a clean, low-risk migration — refactor, do not redesign — is exactly what teams need when they modernize an RTL tree, and it forces you to understand every construct you are replacing. Do this refactor once carefully and you can do it to any module in minutes.',
    prerequisites: [
      'sv-m01-l2: logic and when wire is still needed',
      'Basic knowledge of always blocks and nonblocking assignment from the Verilog course',
    ],
    explanation:
      'A good refactor obeys one invariant: **the synthesized hardware must not change**. Each edit should be mechanical and individually checkable. We will use this Verilog-2001 module — a 4-entry, 8-bit register file with synchronous write, asynchronous read and a zero flag — as the patient:\n\nThe refactor proceeds in four steps, each of which can be compiled and simulated on its own. **Step 1 — ports and signals:** every `wire` and `reg` becomes `logic`, except anything multi-driver or inout (there are none here). **Step 2 — sequential blocks:** `always @(posedge clk)` becomes `always_ff @(posedge clk)`. The sensitivity list stays; the keyword now tells the tool "this must be flip-flop logic" and it will reject blocking assignments or missing clocking semantics. **Step 3 — combinational blocks:** `always @(*)` becomes `always_comb`, which re-evaluates at time zero, forbids latch-style incompleteness and complains if you assign to a signal driven elsewhere. **Step 4 — leftovers:** `assign` statements can stay exactly as they are; `assign` to a logic variable is legal and idiomatic.\n\nNotice what we did **not** change: the nonblocking `<=` inside the clocked block, the reset structure, the memory array style, or the port order. A refactor that changes behavior is a redesign wearing a disguise. If you keep each step mechanical, any diff review becomes trivial: reviewers check keyword swaps, not algorithm changes.\n\nHow do you *prove* nothing changed? The cheapest strong check is a **regression equivalence test**: run the old module and the new one side by side from the same stimulus and compare outputs every cycle — the self-checking pattern from the Digital Design Verification course, applied to your own refactor. On this platform that testbench itself can be plain Verilog-2001 instantiating both modules; the DUTs being compared can be the pre- and post-refactor files.',
    deepDive:
      '### always_ff catches real mistakes, immediately\n\nThree refactor-related bugs die the moment you write always_ff. First, a blocking assignment (`q = d;`) inside a clocked block — legal Verilog, a classic simulation-mismatch source — is a **compile error** under always_ff, which requires nonblocking assignments. Second, if you accidentally give the block two clocks or a strange edge condition, the tool can flag semantics it cannot map to flip-flops. Third, because always_ff declares "this is a sequential block", any later engineer who edits it inherits the intent for free — the code documents itself.\n\n### always_comb catches the two classics\n\nUnder `always @(*)`, two bugs are silent: an incomplete if/case that infers an unintended latch, and a missing signal in the hand-written sensitivity list. always_comb addresses both: the tool constructs the sensitivity list (no omissions possible), warns when the block could infer a latch (incomplete assignment of every output on every path is what it checks), and forbids the block from writing any variable that has other drivers. On a big refactor, these two checks alone pay for the migration.\n\n### What Icarus supports today, honestly\n\nIcarus Verilog supports `logic`, `always_ff`, `always_comb` and typedefs well enough to run design-subset refactors like this one, though support for some later additions (certain enum/struct corners, interfaces) is partial and version-dependent. So this lesson is one of the few OOP-free lessons whose code is largely platform-runnable. When a construct is not supported by the grader, later lessons will say so explicitly.\n\n### A refactor checklist you can reuse\n\n1. logic for all single-driver signals and ports (leave nets for multi-driver/inout). 2. always_ff for every posedge block, keep nonblocking assignments. 3. always_comb for every @(*) block, then fix any latch warning by completing every assignment path. 4. typedef/enum for magic numbers and state encodings (next lesson). 5. package for shared types (Module 02). 6. Rerun the equivalence testbench; only then move to the next module.',
    examples: [
      {
        title: 'Before: the Verilog-2001 register file',
        language: 'verilog',
        code:
        '// Verilog-2001 original: 4 x 8-bit register file, sync write, async read\nmodule regfile_v(\n    input  wire       clk,\n    input  wire       we,\n    input  wire [1:0] waddr,\n    input  wire [7:0] wdata,\n    input  wire [1:0] raddr,\n    output wire [7:0] rdata,\n    output wire       zero_flag\n);\n    reg [7:0] mem [0:3];\n\n    always @(posedge clk) begin\n        if (we) mem[waddr] <= wdata;\n    end\n\n    assign rdata      = mem[raddr];        // asynchronous read\n    assign zero_flag  = (rdata == 8\'h00);  // combinational compare\nendmodule',
        explanation: [
          'Two always/assign styles coexist: the clocked write block and two continuous assignments for the read path.',
          'mem is an unpacked array of regs — the standard Verilog memory idiom.',
          'Nothing is wrong here; the refactor below changes declarations and block keywords only.',
        ],
      },
      {
        title: 'After: the same register file in SystemVerilog',
        language: 'systemverilog',
        code:
        '// SystemVerilog refactor: identical hardware, checked intent\nmodule regfile_sv(\n    input  logic       clk,\n    input  logic       we,\n    input  logic [1:0] waddr,\n    input  logic [7:0] wdata,\n    input  logic [1:0] raddr,\n    output logic [7:0] rdata,\n    output logic       zero_flag\n);\n    logic [7:0] mem [0:3];\n\n    always_ff @(posedge clk) begin\n        if (we) mem[waddr] <= wdata;\n    end\n\n    assign rdata      = mem[raddr];\n    assign zero_flag  = (rdata == 8\'h00);\nendmodule',
        explanation: [
          'Every wire/reg became logic; the array stays unpacked (mem [0:3]) exactly as before.',
          'always_ff documents and enforces the sequential intent; the nonblocking assignment inside is required and present.',
          'The two assigns are untouched — assign to a logic variable is legal and idiomatic SystemVerilog.',
          'Port-for-port and cycle-for-cycle this module behaves identically to the original.',
        ],
      },
      {
        title: 'Proving equivalence with a plain-Verilog shadow testbench',
        language: 'verilog',
        code:
        '// Verilog-2001 testbench: instantiates BOTH versions and compares\ntimescale 1ns/1ps\nmodule tb_regfile_equiv;\n    reg clk = 0, we = 0;\n    reg  [1:0] waddr = 0, raddr = 0;\n    reg  [7:0] wdata = 0;\n    wire [7:0] rdata_v, rdata_sv;\n    wire       zf_v, zf_sv;\n    integer errors = 0;\n    integer i;\n\n    regfile_v  u_old (.clk(clk), .we(we), .waddr(waddr), .wdata(wdata),\n                      .raddr(raddr), .rdata(rdata_v), .zero_flag(zf_v));\n    regfile_sv u_new (.clk(clk), .we(we), .waddr(waddr), .wdata(wdata),\n                      .raddr(raddr), .rdata(rdata_sv), .zero_flag(zf_sv));\n\n    always #5 clk = ~clk;\n\n    initial begin\n        // write 4 distinct values\n        for (i = 0; i < 4; i = i + 1) begin\n            @(negedge clk); we = 1; waddr = i[1:0]; wdata = 8\'h10 * i + 8\'d3;\n        end\n        @(negedge clk); we = 0;\n        // read all 4 addresses and compare both outputs\n        for (i = 0; i < 4; i = i + 1) begin\n            @(negedge clk); raddr = i[1:0];\n            @(posedge clk); #1;\n            if (rdata_v !== rdata_sv || zf_v !== zf_sv) begin\n                errors = errors + 1;\n                $display("MISMATCH raddr=%0d old=%h/%b new=%h/%b",\n                          raddr, rdata_v, zf_v, rdata_sv, zf_sv);\n            end\n        end\n        if (errors == 0) $display("EQUIVALENCE PASSED");\n        else             $display("EQUIVALENCE FAILED: %0d errors", errors);\n        $finish;\n    end\nendmodule',
        explanation: [
          'Both DUTs receive identical stimulus; their outputs are compared every read. This is the cheapest high-confidence check that a refactor changed no behavior.',
          'Writes happen on negedge so the write data settles before the posedge samples it — standard testbench hygiene.',
          'Reads use negedge changes plus a #1 settle after posedge, avoiding sampling in the middle of a change.',
          'The final PASS/FAIL summary with an error counter is the self-checking pattern; the loop traces 4 writes then 4 reads, and because each written value (16*i+3) is unique, a wrong read address or a broken write must mismatch.',
          'Plain Verilog-2001: this equivalence harness runs on this platform.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Refactor pipeline with a behavior invariant',
        content:
        '  Verilog-2001 original\n        |\n        v\n  [1] wire/reg -> logic .......... no behavior change\n        |\n        v\n  [2] always @(posedge..) -> always_ff ... no behavior change,\n        |                                  adds: blocking-assign ban\n        v\n  [3] always @(*) -> always_comb ... no behavior change,\n        |                             adds: latch + driver checks\n        v\n  [4] typedef/enum/packages (later modules) ... no behavior change\n        |\n        v\n  EQUIVALENCE TEST: old vs new, same stimulus, compare every output\n        |\n        v\n  Refactor complete  (hardware unchanged, checking upgraded)',
        caption:
          'Each step is mechanical and behavior-preserving; the equivalence testbench is the gate between steps.',
      },
    ],
    tables: [
      {
        caption: 'Refactor substitutions and what each one buys you',
        headers: ['Verilog-2001', 'SystemVerilog', 'Hardware change', 'New tool checking'],
        rows: [
          ['input wire / output reg', 'input logic / output logic', 'None', 'One-driver rule enforced'],
          ['always @(posedge clk)', 'always_ff @(posedge clk)', 'None', 'Nonblocking-only, flip-flop semantics enforced'],
          ['always @(*)', 'always_comb', 'None', 'Complete sensitivity list, latch warning, no other drivers'],
          ['localparam state codes', 'typedef enum', 'None', 'Type checking on state values'],
          ['assign y = ...;', 'assign y = ...; (unchanged)', 'None', 'Legal on logic variables'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Changing nonblocking assignments to blocking while converting a block to always_ff.',
        fix: 'always_ff requires nonblocking assignments for the variables it clocks; keep <= exactly as in the original. A refactor must not mix in an assignment-style change — that changes simulation behavior.',
      },
      {
        mistake: 'Refactoring many modules at once and committing before simulating.',
        fix: 'Convert one module, run its equivalence test, commit, then move on. Mechanical steps are only safe when each one is verified; a big-bang conversion turns any failure into a hunt.',
      },
      {
        mistake: 'Fixing an always_comb latch warning by adding a sensitivity-list entry.',
        fix: 'always_comb builds its own sensitivity list, so the warning means an output is not assigned on every path. Fix the code: give every output a value in every branch (a default assignment at the top of the block is the standard idiom).',
      },
    ],
    guidedPractice: {
      title: 'Refactor a 2-bit counter',
      brief:
        'Convert the given Verilog-2001 counter to SystemVerilog: replace declarations with logic, convert the clocked block to always_ff and the flag computation to an assign on a logic output. Keep every assignment operator exactly as it is.',
      starterCode:
        '// Verilog-2001 to convert:\nmodule cnt2(\n    input  wire clk,\n    input  wire rst_n,\n    output reg  [1:0] cnt,\n    output wire       rollover\n);\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n) cnt <= 2\'d0;\n        else        cnt <= cnt + 2\'d1;\n    end\n    assign rollover = &cnt;   // 1 when cnt == 2\'b11\nendmodule',
      expectedBehavior:
        'All four signals become logic; the always block becomes always_ff @(posedge clk or negedge rst_n) with the same nonblocking body; rollover stays an assign on an output logic. Behavior is identical: counts 0,1,2,3 repeating, rollover high when cnt is 3.',
      hints: [
        'The async reset template survives the refactor untouched.',
        '&cnt is the reduction-AND: 1 only when every bit is 1.',
        'Nothing here is multi-driver, so logic is legal on every port.',
      ],
    },
    practiceExercises: [
      {
        title: 'Spot the behavior-changing refactor',
        brief:
          'A teammate "refactors" a Verilog module and also changes `if (we) mem[waddr] <= wdata;` to `if (we) mem[waddr] = wdata;` inside an always_ff block. Identify what breaks: is it a compile error, a synthesis difference, or a simulation mismatch?',
        expectedBehavior:
          'Blocking assignment inside a clocked block is prohibited by the always_ff rules, so a standard-conforming tool reports an error. Even before tooling, blocking in a sequential block is the classic simulation/synthesis mismatch bug.',
        hints: [
          'Re-read the always_ff rules in the deep dive.',
          'The assignment style is not a cosmetic choice in clocked blocks.',
          'Which assignment operator does always_ff demand?',
        ],
      },
      {
        title: 'Design the equivalence test for a FIFO',
        brief:
          'You refactored a small FIFO. Describe (in 4-6 sentences, no code) the shadow testbench you would build to prove equivalence, including when you sample, what you drive, and what you compare.',
        expectedBehavior:
          'A good answer: instantiate old and new FIFOs, drive identical clocks/reset/ops (push/pop with random or sweeping patterns, including full and empty attempts), sample outputs on the same edge with a small settle delay, compare data/flags every cycle, count mismatches, print PASS/FAIL with counts.',
        hints: [
          'Both DUTs must see literally identical inputs every cycle.',
          'Corners matter most: try a pop on empty and a push on full.',
          'One comparison per clock edge with a defined settle time avoids races.',
        ],
      },
    ],
    assessment: {
      title: 'Refactor checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What is the one invariant a mechanical Verilog-to-SystemVerilog refactor must preserve?',
          options: [
            'The synthesized hardware must not change',
            'Line count must decrease',
            'All ports must become packed structs',
            'Every assign must become always_comb',
          ],
          answer: 'The synthesized hardware must not change',
          explanation:
            'A refactor modernizes declarations and adds tool checking. The moment hardware changes it is a redesign and needs full verification, not a mechanical diff review.',
          hint: 'Why can reviewers approve a refactor by skimming the diff?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Inside an always_ff block, which assignment style does the standard require for the clocked variables?',
          options: ['Blocking (=)', 'Nonblocking (<=)', 'Either, consistently', 'Continuous assign only'],
          answer: 'Nonblocking (<=)',
          explanation:
            'always_ff is defined for flip-flop modeling, which means nonblocking assignments; blocking assignments in an always_ff are a compile-time violation.',
          hint: 'Which operator did your original Verilog clocked blocks already use?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'bug-identification',
          prompt: 'After switching always @(*) to always_comb, the tool warns about latch inference. What is the correct fix?',
          code: 'always_comb begin\n    if (sel) y = a;\nend',
          options: [
            'Add a wildcard sensitivity entry',
            'Assign y a default value before the if, so every path assigns y',
            'Change y to wire and use assign',
            'Ignore the warning; always_comb never infers latches',
          ],
          answer: 'Assign y a default value before the if, so every path assigns y',
          explanation:
            'The warning means y is unassigned when sel is 0, which would need memory (a latch). always_comb forbids that intent, so complete the assignments — a default at the top is the standard idiom. Sensitivity lists are irrelevant: always_comb constructs its own.',
          hint: 'What is missing when sel is 0?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Name the testbench pattern that proves a refactor changed no behavior by running old and new versions from identical stimulus (two words).',
          answer: 'equivalence test',
          explanation:
            'An equivalence (shadow) testbench drives both DUTs identically and compares every output; a clean run is strong evidence the refactor was behavior-preserving.',
          hint: 'It compares two implementations for sameness.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Mechanical refactor', definition: 'An edit that swaps constructs without changing behavior, so it can be verified by diff review plus an equivalence test.' },
      { term: 'Equivalence test', definition: 'A testbench that drives two implementations with identical stimulus and compares all outputs, proving behavioral sameness.' },
      { term: 'always_ff', definition: 'SystemVerilog sequential-intent always block: requires nonblocking assignments, checked flip-flop semantics.' },
      { term: 'always_comb', definition: 'SystemVerilog combinational-intent block: automatic sensitivity list, latch warning, no other drivers allowed.' },
      { term: 'Refactor invariant', definition: 'The property that must hold across every refactor step: synthesized hardware unchanged.' },
    ],
    revisionSummary: [
      'Refactor in mechanical steps: logic, then always_ff, then always_comb, then types/packages.',
      'The invariant is unchanged hardware; prove it with an equivalence (shadow) testbench before moving on.',
      'always_ff demands nonblocking assignments and catches blocking-assignment bugs at compile time.',
      'always_comb removes sensitivity-list bugs and flags incomplete assignments (latch intent) for you to fix.',
      'assign on a logic variable is legal and unchanged; only multi-driver/inout signals stay nets.',
    ],
    furtherReading: [
      { label: 'Wikipedia — SystemVerilog', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 45,
  },
];
