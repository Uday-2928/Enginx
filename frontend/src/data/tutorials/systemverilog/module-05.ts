import type { TutorialLesson } from '../types';

export const module05Lessons: TutorialLesson[] = [
  {
    id: 'sv-m05-l1',
    title: 'Why Constrained-Random Verification',
    summary:
      'The economics of finding bugs: why hand-written directed tests stop scaling, and how declaring legal stimulus ranges and letting the tool generate scenarios changes the game.',
    objectives: [
      'Explain the scaling argument: why directed tests cover a shrinking fraction of the input space as designs grow.',
      'Describe the division of labor: humans constrain what is legal and interesting; the tool enumerates scenarios.',
      'Declare rand fields, write a constraint block, call randomize(), and check its return value.',
      'State honestly which tools support randomization and what this platform can run.',
    ],
    whyItMatters:
      'A 32-bit input bus has 4 billion values per cycle; no team writes that many directed tests. Constrained randomization is the industry answer: you encode what matters (legal ranges, interesting corners, relationships between fields) as declarative constraints, and the solver generates thousands of scenarios you would never have typed. It is the single most leveraged idea in modern verification, and also the one most often used without understanding, which is why this lesson starts with the reasoning, not the syntax.',
    prerequisites: [
      'sv-m04-l1/l2: transactions as classes, the generator role',
      'sv-m01-l1: the tool-support honesty framework',
    ],
    explanation:
      'Directed tests scale linearly with human effort: one test, one scenario, and the scenarios multiply faster than the team. A FIFO with 8-bit data has corners at empty, full, simultaneous push/pop, back-to-back transfers, boundary values — maybe 20 directed tests if you are disciplined. A memory controller with 32-bit addresses, burst lengths, 4 priority levels and 3 opcodes has more meaningful corner combinations than the team can write in a year. And the failure mode is silent: nobody knows which combinations were never tried.\n\nConstrained-random verification (CRV) reverses the division of labor. You write, once, a **model of legal and interesting stimulus** — addr inside the mapped range, len between 1 and 16, op a legal opcode — as declarative **constraints** on `rand` fields of the transaction class. Then `randomize()` asks a solver to pick a new combination satisfying all constraints, every call, differently (seeded). The generator from Module 04 becomes a loop: build transaction, randomize, send. Ten thousand calls produce ten thousand distinct legal scenarios, including combinations no human thought to type — and because the constraint model is shared, they are all *legal*, which keeps the scoreboard checking real behavior rather than undefined behavior.\n\nThe honest framing for this platform: randomization is verification-subset SystemVerilog. **Icarus Verilog does not implement randomize()/constraints, so none of this runs on the platform grader.** It runs on commercial simulators; Verilator supports a growing subset. The skill being built — modeling a stimulus space declaratively — transfers unchanged to any CRV system, including UVM.',
    deepDive:
      '### The solver, briefly\n\nConstraints compile into a system of arithmetic and set relations over the rand fields. `randomize()` hands that system to a constraint solver, which finds values satisfying every constraint simultaneously — and, across calls, varies its choices. You do not write search code; you write properties of the answer. This is the same mental shift as writing a specification instead of an implementation. The practical consequence: constraints must be **satisfiable** — a contradiction (x greater than 5 and x less than 2) makes randomize() fail (returning 0) rather than crash, and an over-constrained model quietly produces the same few values every time, which is a coverage problem wearing a randomization costume.\n\n### What makes a good constraint model\n\nGood models encode three things: **legality** (the DUT will not misbehave just because stimulus is illegal — but you will waste effort debugging undefined behavior), **bias toward corners** (explicit weights or ranges so boundary values — 0, max, max-1 — appear often), and **relationships** (address alignment, command sequences, couplings between fields). Poor models encode the script of a particular test (exact sequences) — that is directed testing wearing random clothes, and it gives up the main benefit. The art of CRV is exactly this modeling skill; the syntax is the easy 10 percent.\n\n### Seeds and reproducibility\n\nEvery randomize() draws from a pseudo-random stream seeded at simulation start. Two runs with the same seed replay identically; different seeds explore differently. Verification plans therefore treat **seeds as test cases**: a regression runs the same environment with hundreds of seeds, and a failing run is reproduced by re-running with its recorded seed. This is why seed control appears again in the Digital Design Verification course — the mechanics are tool flags or $urandom, but the discipline is what matters: never report a failure without its seed.\n\n### Where directed still wins\n\nCRV is not a religion. Smoke tests, debug reproductions, and spec-mandated sequences (an exact error-injection pattern, for instance) remain directed — often written once and kept as regression anchors. The mature pattern: **random for breadth, directed for known corners and reproducibility**, with coverage (lesson 3) measuring whether the random exploration actually reached what matters.',
    examples: [
      {
        title: 'A constrained transaction and the generator loop',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — NOT runnable on this platform.\n// Requires a full SV simulator (commercial; Verilator partial).\ntypedef enum logic [1:0] {OP_RD, OP_WR, OP_BURST, OP_FLUSH} op_t;\n\nclass BusTr;\n  rand op_t         op;\n  rand logic [7:0]  addr;    // 8-bit address space\n  rand logic [15:0] data;\n  rand int unsigned len;\n\n  // The stimulus model: legal + biased toward corners\n  constraint c_op   { op inside {OP_RD, OP_WR, OP_BURST}; }   // never FLUSH\n  constraint c_addr { addr dist { 8\'h00 :/ 20,                // corner bias\n                                  8\'hFF :/ 20,\n                             [8\'h01:8\'hFE] :/ 60 }; }\n  constraint c_len  { len inside {[1:16]};\n                      (op == OP_BURST) -> len inside {[4:16]};\n                      (op != OP_BURST) -> len == 1; }\n\n  function string show();\n    return $sformatf("%s a=%0h d=%0h len=%0d", op.name(), addr, data, len);\n  endfunction\nendclass\n\nmodule gen;\n  initial begin\n    BusTr t = new();\n    repeat (5) begin\n      if (!t.randomize()) $fatal(1, "randomize failed");\n      $display("%s", t.show());  // a different legal scenario each time\n    end\n  end\nendmodule',
        explanation: [
          'rand fields are the randomizable surface; the constraints define the legal, corner-biased stimulus space.',
          'c_op excludes OP_FLUSH from stimulus (say it is DUT-internal only): legality is a constraint, not a hope.',
          'c_addr biases: 0x00 and 0xFF each get 20 percent weight and the middle range 60 percent, so corners appear 40 percent of the time instead of 2/256.',
          'c_len shows a relationship: burst ops take length 4..16, other ops exactly 1.',
          'randomize() returns 1 on success; the idiom of checking and calling $fatal is mandatory practice because unsatisfiable constraints otherwise fail quietly.',
        ],
      },
      {
        title: 'Inline constraints: same class, one-off scenario',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — illustrative on this platform\n// Inline with-blocks specialize ONE randomize() call.\nmodule inline_demo;\n  initial begin\n    BusTr t = new();\n\n    // A directed-ish moment inside random flow: force the corner combo\n    if (!t.randomize() with { op == OP_WR; addr == 8\'hFF; })\n      $fatal(1, "inline randomize failed");\n    $display("corner: %s", t.show());   // WR a=ff d=<random legal>\n\n    // Next call uses the shared model only: back to breadth-first\n    if (!t.randomize()) $fatal(1, "randomize failed");\n    $display("random: %s", t.show());\n  end\nendmodule',
        explanation: [
          'The with-block adds call-scoped constraints on top of the class model — the standard way to steer one scenario without editing the class.',
          'The inline block can only tighten legality; it cannot make the call violate c_op or c_len, because both sets apply together.',
          'The second call shows the default behavior: a fresh legal scenario with no steering.',
          'This mix — breadth by default, aimed shots when a plan item demands it — is exactly how coverage holes get targeted (lesson 3).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Division of labor in constrained-random verification',
        content:
        '   HUMAN writes (once, declarative)        TOOL does (every call)\n   ---------------------------------       -----------------------\n   legal ranges        (inside)            pick values satisfying ALL\n   corner bias         (dist, weights)     constraints simultaneously\n   relationships       (implications)      vary the choice across calls\n   exclusions          (illegal opcodes)   fail loudly (return 0) when\n                                           the model is contradictory\n\n        transaction class              generator loop\n   +---------------------------+   +----------------------+\n   | rand fields               |   | for each iteration:  |\n   | constraint blocks         |-->|   randomize()        |\n   | (the stimulus MODEL)      |   |   send to driver     |\n   +---------------------------+   +----------------------+\n\n   Result: thousands of distinct, legal, corner-biased scenarios\n   from a model you can read in one screen.',
        caption:
          'You own the shape of the space; the solver owns the enumeration. That split is the entire idea.',
      },
    ],
    tables: [
      {
        caption: 'Directed vs constrained-random stimulus',
        headers: ['Property', 'Directed tests', 'Constrained-random'],
        rows: [
          ['Who writes each scenario', 'An engineer, one by one', 'The solver, per randomize() call'],
          ['Coverage of input space', 'Only what was typed', 'Scales with run count and seeds'],
          ['Legality of stimulus', 'By construction', 'Only as good as the constraint model'],
          ['Best at', 'Known corners, exact sequences, reproductions', 'Breadth, unexpected corner combinations'],
          ['Measurable explored-ness', 'No (test list only)', 'Yes — functional coverage (lesson 3)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Ignoring the return value of randomize().',
        fix: 'randomize() returns 0 when constraints are unsatisfiable (or on other failures) and leaves values unchanged; unchecked, the test silently runs degenerate stimulus. Always check it and fail loudly with $fatal or an error counter.',
      },
      {
        mistake: 'Encoding a test script into constraints (fields pinned to specific values everywhere).',
        fix: 'Hardcoded values in constraints rebuild directed testing with worse readability. Constrain relationships and ranges; leave the enumeration to the solver; use inline with-blocks for the rare aimed shot.',
      },
      {
        mistake: 'Assuming random stimulus is automatically good stimulus.',
        fix: 'Unbiased random rarely hits corners (0x00 and 0xFF are 2 of 256 values). Use dist weights, explicit corner sets, and coverage feedback to shape where the solver spends its time.',
      },
    ],
    guidedPractice: {
      title: 'Model a packet stimulus space',
      brief:
        'Write a class PktTr with rand fields: kind (enum {PING, DATA, CTRL}), length (int, 1..64), prio (2 bits). Constrain: CTRL packets have length exactly 1; DATA packets have length 4..64 and prio in {2,3}; PING packets have prio 0. Add a dist so DATA is 70 percent likely.',
      starterCode:
        'typedef enum logic [1:0] {PING, DATA, CTRL} kind_t;\nclass PktTr;\n  // rand fields and constraints here\nendclass',
      expectedBehavior:
        'A correct model: rand kind_t kind; rand int unsigned length; rand logic [1:0] prio; with constraints: length inside {[1:64]}; (kind == CTRL) -> length == 1; (kind == DATA) -> (length inside {[4:64]} && prio inside {2,3}); (kind == PING) -> prio == 0; and kind dist { DATA :/ 70, PING :/ 15, CTRL :/ 15 };',
      hints: [
        'Implication (->) is the tool for relationships between fields.',
        'dist uses :/ weights that sum to 100.',
        'Length legality is a base constraint; kind-specific rules tighten it.',
      ],
    },
    practiceExercises: [
      {
        title: 'Diagnose the degenerate test',
        brief:
          'A test randomizes a transaction whose only address constraint is addr < 4. After 10,000 calls the team concludes that random is useless because it only ever touches 4 addresses. Explain what actually happened and give the two fixes.',
        expectedBehavior:
          'Nothing is wrong with randomization; the model only allows 4 addresses, so the tool did its job perfectly. Fixes: widen the constraint to the real address space, and/or bias toward corners with dist. Stimulus quality is model quality.',
        hints: [
          'Is the complaint about the solver or about the model?',
          'What stimulus space did the constraints define?',
          'Corner bias is one of the fixes.',
        ],
      },
      {
        title: 'Legality or bug?',
        brief:
          'Your random test drives opcodes the spec calls reserved, and the DUT hangs. The team wants to fix the DUT. Explain why the right fix is in the constraint model, and what a separate test could legitimately learn about reserved opcodes.',
        expectedBehavior:
          'Reserved opcodes are undefined behavior by spec: any response (including a hang) is compliant, so there is nothing to check and no bug to fix. The constraint model should exclude them so checks stay meaningful. Robustness against reserved opcodes is a separate plan item: drive them deliberately in a dedicated stress test with explicitly relaxed expectations.',
        hints: [
          'What does the spec require the DUT to do for reserved input?',
          'Undefined behavior cannot be checked, only avoided or probed separately.',
          'Two different goals: meaningful checking vs robustness probing.',
        ],
      },
    ],
    assessment: {
      title: 'Constrained-random checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does randomize() return when the constraint set has no solution?',
          options: [
            '1, with fields left at their previous values',
            '0, leaving the old field values in place',
            'It crashes the simulation',
            'x',
          ],
          answer: '0, leaving the old field values in place',
          explanation:
            'Unsatisfiable constraints make randomize() return 0 without changing the fields. The silent-degenerate risk is why checking the return value is mandatory practice.',
          hint: 'It reports failure through the return value rather than crashing.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which constraint biases stimulus so addresses 0x00 and 0xFF together appear about 40 percent of the time?',
          options: [
            'constraint c { addr inside {[0:255]}; }',
            "constraint c { addr dist { 8'h00 :/ 20, 8'hFF :/ 20, [8'h01:8'hFE] :/ 60 }; }",
            'constraint c { addr > 0; }',
            "constraint c { addr == 8'h00 || addr == 8'hFF; }",
          ],
          answer: "constraint c { addr dist { 8'h00 :/ 20, 8'hFF :/ 20, [8'h01:8'hFE] :/ 60 }; }",
          explanation:
            'dist with :/ weights gives each corner 20 percent and the middle range 60 percent, so corners get 40 percent overall. Option 1 is unbiased; option 3 barely biases; option 4 makes it fully directed.',
          hint: 'Look for the weighting construct, not the range construct.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Constrained-random stimulus in lesson exercises on this platform runs under the Icarus Verilog grader.',
          answer: 'false',
          explanation:
            'Icarus does not implement randomize()/constraints. This material is illustrative on the platform and runnable on commercial simulators or Verilator with partial support.',
          hint: 'Recall the tool-support table from Module 01.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What one-word keyword marks a class property as eligible for randomization?',
          answer: 'rand',
          explanation:
            'rand marks a field as randomizable (randc makes it cycle through values); only rand/randc fields are touched by randomize().',
          hint: 'It is also the name of the technique.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Constrained-random verification (CRV)', definition: 'Generating stimulus by solving declarative constraints over rand fields, thousands of times per run.' },
      { term: 'rand field', definition: 'A class property marked randomizable; randomized only by randomize() calls.' },
      { term: 'Constraint block', definition: 'A named, declarative set of relations the solver must satisfy when randomizing.' },
      { term: 'dist weighting', definition: 'A constraint construct assigning probability weights to values or ranges, used to bias toward corners.' },
      { term: 'Seed', definition: 'The starting value of the random stream; the same seed reproduces a run, different seeds explore differently.' },
    ],
    revisionSummary: [
      'Directed tests do not scale; humans model the space, solvers enumerate it.',
      'Good models: legality (inside), corner bias (dist), relationships (implications).',
      'Always check the randomize() return value; unsatisfiable models fail silently otherwise.',
      'Inline with-blocks aim single calls; the class model stays the shared source of truth.',
      'CRV is verification-subset SV: illustrative on this platform, runnable on full simulators.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Constrained random verification', url: 'https://en.wikipedia.org/wiki/Constrained_random_verification', kind: 'article' },
      { label: 'Accellera — UVM (CRV in practice)', url: 'https://www.accellera.org/downloads/standards/uvm', kind: 'standard' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'sv-m05-l2',
    title: 'Constraint Blocks in Depth: randc, Implication, solve-before',
    summary:
      'The working set of constraint constructs — inside, implication, randc cycling and solve-before ordering — plus the failure modes that make models over-constrained or unsatisfiable.',
    objectives: [
      'Use inside, implication (->) and constraint if/else forms to express relationships between fields.',
      'Explain randc cycling semantics and when cycling beats plain rand.',
      'Describe what solve-before changes and its legitimate narrow use.',
      'Recognize over-constrained and contradictory models from their symptoms.',
    ],
    whyItMatters:
      'The difference between a junior and a senior constraint author is not syntax — it is knowing which construct expresses each kind of relationship, and diagnosing why a model produces degenerate stimulus. These constructs appear in every constraint block you will ever read, and misreading solve-before or randc leads to subtle stimulus bugs that cost days. The constructs are few; the judgment calls are what you are learning.',
    prerequisites: [
      'sv-m05-l1: rand fields, randomize(), dist biasing',
      'sv-m02-l1: enums as typed values',
    ],
    explanation:
      '**inside** expresses set membership: `addr inside {[0:255], 8\'hC0}` — a value from any listed range or set. It is the workhorse for legality; its negation excludes reserved values. **Implication** expresses relationships: `(op == OP_BURST) -> len inside {[4:16]}` — whenever the left side holds, the right side must also hold. Note the asymmetry: implication constrains nothing when the left side is false. For branching models there is constraint if/else: `if (op == OP_WR) { ... } else { ... }`, which is implication with two explicit arms.\n\n**randc** makes a field cycle: repeated randomize() calls walk through all values of its (small) range before repeating. `randc logic [1:0] mode;` yields the four values in some order, then reshuffles. It is the natural tool for "make sure every mode gets exercised per test" — with the hard limit that the enumerated space must be small, so randc on 32-bit fields is impractical.\n\n**solve x before y** biases solver order: `solve len before addr;` asks that len be chosen first, with addr constrained accordingly afterward. Its honest scope is narrow: the classic use is letting a distribution-driving variable (usually one carrying dist weights) settle before dependent fields are picked, improving the realized distribution. It is not a sequencing mechanism, does not create causality between fields, and piling up solve-before lines usually signals a model that should be restructured instead.\n\nSymptoms of a broken model, and their meanings: stimulus identical every call — the model is over-constrained (only one solution exists); randomize() returning 0 — the constraints are contradictory or reference state that cannot be satisfied; a field always at its range edge — an unintended implication is pushing it. Diagnosis is a modeling skill: comment out constraints until the symptom disappears, then rebuild, checking each block with a few randomize() calls and a display of the result.',
    deepDive:
      '### Implication asymmetry and the empty-arm trap\n\n`(op == OP_BURST) -> len inside {[4:16]}` says nothing about len when op is a read. Beginners often intend "and in the other case, len is 1" and forget the second arm, leaving len unconstrained for reads. The fix is either a second implication or constraint if/else, which makes both arms visible. Review habit: for every -> constraint, ask what happens when the condition is false.\n\n### randc budget and interaction with other constraints\n\nrandc guarantees each value appears once per cycle of that field considered in isolation, but other constraints still shape the combinations: a randc mode combined with `mode == 0 -> quiet` still visits every mode, but the pairings are governed by the rest of the model. Keep randc fields small (a few bits), usually one per class, and treat it as an exhaustiveness tool, not a distribution tool.\n\n### Distribution reality and post_randomize\n\nSolvers pick satisfying solutions; they do not promise uniform distributions. dist shapes frequencies explicitly; solve-before changes the order variables are decided in, which changes reachable correlations. The standard pattern for *derived* fields (a checksum, a dependent address) is not a constraint at all but **post_randomize()** — a function the language calls automatically after each successful randomize, where you compute derived fields in procedural code. Recognizing what belongs in constraints (relations the solver must satisfy) versus post_randomize (deterministic derivations) keeps models fast and readable.\n\n### Constraint management as models grow\n\nReal classes accumulate constraints from multiple authors. Blocks compose (all must hold); inline with-blocks add per-call constraints; `constraint_mode(0)` can switch a named block off programmatically for test-specific legality relaxations — use sparingly and log it. The discipline that keeps this manageable: every block has an owner-purpose name (c_addr_legal, c_len_by_op), and the class documents which blocks are core legality versus test-tunable knobs.',
    examples: [
      {
        title: 'Relationships with both arms explicit',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — illustrative on this platform\ntypedef enum logic [1:0] {OP_RD, OP_WR, OP_BURST} op_t;\n\nclass Tr;\n  rand op_t         op;\n  rand logic [7:0]  addr;\n  rand logic [15:0] data;\n  rand int unsigned len;\n\n  constraint c_legal {\n    addr inside {[8\'h00:8\'hFF]};\n    !(addr inside {8\'h00});              // address 0 reserved by spec\n  }\n\n  // Version 1: two implications (asymmetric ->, both arms written)\n  constraint c_len_imp {\n    (op == OP_BURST) -> len inside {[4:16]};\n    (op != OP_BURST) -> len == 1;        // the forgotten arm, written\n  }\n\n  // Version 2: equivalent, with both arms visible at a glance\n  constraint c_len_ifelse {\n    if (op == OP_BURST) { len inside {[4:16]}; }\n    else                { len == 1; }\n  }\nendclass',
        explanation: [
          'c_legal combines membership and exclusion: any address except the reserved 0x00.',
          'Version 1 shows the trap fixed: the second implication covers the false side of the first.',
          'Version 2 is the same model with if/else — reviewers see both arms without inferring them.',
          'Having both constraint blocks in one class would over-constrain nothing here (they are equivalent), but in real code keep one to avoid accidental tightening.',
        ],
      },
      {
        title: 'randc cycling and solve-before in one class',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — illustrative on this platform\nclass ModeTr;\n  randc logic [1:0] mode;      // cycles 0,1,2,3 (small space only)\n  rand logic [7:0]  addr;\n\n  constraint c_addr { addr inside {[8\'h00:8\'hFF]}; }\n\n  // Let the weighted field settle first (classic narrow use):\n  constraint c_order { solve addr before mode; }\n  // addr carries a dist elsewhere; solving it first makes the realized\n  // address distribution match the weights instead of being diluted.\nendclass\n\nmodule cycle_demo;\n  initial begin\n    ModeTr t = new();\n    repeat (4) begin\n      if (!t.randomize()) $fatal(1, "randomize failed");\n      $display("mode=%0d addr=%0h", t.mode, t.addr);\n    end\n    // Across the 4 calls, mode takes each of 0,1,2,3 exactly once,\n    // in a solver-chosen order — the cycling guarantee.\n  end\nendmodule',
        explanation: [
          'randc on a 2-bit field is the right size: 4 values cycle fully before repeating.',
          'The display loop demonstrates the guarantee in the comment: each mode appears exactly once in four calls.',
          'solve addr before mode is the narrow legitimate pattern: the weighted variable decides first.',
          'For a 32-bit randc field the solver would have to enumerate 4 billion values per cycle — why cycling is reserved for small spaces.',
        ],
      },
      {
        title: 'Derived fields with post_randomize instead of constraints',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — illustrative on this platform\nclass AlignedTr;\n  rand logic [7:0]  addr;\n  rand int unsigned len;\n       logic [7:0]  aligned_addr;   // derived, not randomizable\n\n  constraint c_len { len inside {[1:8]}; }\n\n  // Called automatically after each successful randomize():\n  function void post_randomize();\n    aligned_addr = {addr[7:3], 3\'b000};   // round down to an 8-byte boundary\n  endfunction\n\n  function string show();\n    return $sformatf("addr=%0h aligned=%0h len=%0d",\n                     addr, aligned_addr, len);\n  endfunction\nendclass',
        explanation: [
          'aligned_addr is not rand: it is computed from addr, so no constraint is needed and the solver does less work.',
          'post_randomize() is the standard hook for deterministic derivations; the language calls it after every successful randomize().',
          'Trace: addr = 8\'h3D (0011_1101) gives aligned_addr = 8\'h38 (0011_1000) — the low 3 bits cleared.',
          'Rule of thumb: relations the solver must satisfy go in constraints; deterministic derivations go in post_randomize.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Choosing the construct: a decision guide',
        content:
        '   What do you need to express?              Construct\n   ---------------------------------------   ----------------\n   legal values / ranges / exclusions    ->  inside, !(inside)\n   value probabilities (corner bias)     ->  dist with :/ weights\n   if-this-then-that relations           ->  implication (->)\n   two-armed branching relations         ->  constraint if/else\n   exercise every value of a SMALL field ->  randc\n   influence solver decision order       ->  solve A before B  (rare)\n   deterministic derived fields          ->  post_randomize()\n   one-off steering for a single call    ->  randomize() with { ... }\n\n   Symptoms -> meaning:\n   identical stimulus every call  -> over-constrained (one solution)\n   randomize() returns 0          -> contradiction / unsatisfiable\n   field pinned at range edge     -> unintended implication pressure',
        caption:
          'The construct table to reach for when writing or reviewing a constraint block, plus the three diagnostic symptoms.',
      },
    ],
    tables: [
      {
        caption: 'rand vs randc vs derived fields',
        headers: ['Mechanism', 'Behavior across calls', 'Space limit', 'Typical use'],
        rows: [
          ['rand', 'New solver choice each call', 'Any width', 'Addresses, data, lengths'],
          ['randc', 'Cycles through ALL values before repeating', 'Small (few bits)', 'Modes, opcodes, slot IDs'],
          ['derived (post_randomize)', 'Computed from randomized fields', 'None', 'Checksums, aligned addresses'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing a one-arm implication and believing the other case is constrained too.',
        fix: 'Implication constrains only when the condition is true. Either add the second implication or use constraint if/else so both arms are visible and reviewed.',
      },
      {
        mistake: 'Using randc on wide fields (16 or 32 bits) to "increase randomness".',
        fix: 'randc enumerates the whole value set per cycle; wide fields make that astronomically expensive. Use plain rand with dist biasing, and reserve randc for small enumeration fields.',
      },
      {
        mistake: 'Stacking several solve-before lines to force a distribution the model does not actually have.',
        fix: 'solve-before adjusts decision order, not distributions. Put weights in dist, derivations in post_randomize, and if you still need ordering, one well-commented solve-before at most.',
      },
    ],
    guidedPractice: {
      title: 'Repair the one-arm model',
      brief:
        'A teammate wrote only: constraint c { (kind == DATA) -> len inside {[4:64]}; }. State exactly what is unconstrained, then rewrite the block two ways: with a second implication and with constraint if/else.',
      starterCode:
        'constraint c {\n  (kind == DATA) -> len inside {[4:64]};\n  // repair me\n}',
      expectedBehavior:
        'When kind is PING or CTRL, len is completely unconstrained — any value, including absurd ones. Fix 1: add (kind != DATA) -> len == 1; Fix 2: if (kind == DATA) { len inside {[4:64]}; } else { len == 1; }',
      hints: [
        'Ask what the constraint says when kind is CTRL.',
        'The forgotten arm is the else.',
        'Both fixes must produce the same two-arm behavior.',
      ],
    },
    practiceExercises: [
      {
        title: 'Predict the cycling',
        brief:
          'For `randc logic [2:0] slot;` randomize() is called 10 times with no other constraints. What is guaranteed about slots 1..8 and the two extra calls?',
        expectedBehavior:
          'Calls 1..8 contain each value 0..7 exactly once (order solver-chosen). Calls 9 and 10 start the second cycle, so their values repeat values already seen — the guarantee is per cycle of 8, not global uniqueness.',
        hints: [
          'How many values does a 3-bit field have?',
          'The cycle restarts after exhaustion.',
          'Guarantee is coverage per cycle, not uniqueness overall.',
        ],
      },
      {
        title: 'Move the derivation',
        brief:
          'A model constrains a checksum field with a giant constraint block recomputing it from data. Explain the cost, and rewrite the design using post_randomize() in two lines of pseudocode.',
        expectedBehavior:
          'The solver must satisfy checksum == f(data) as part of every search, wasting effort on a field with zero freedom. Rewrite: rand data; checksum (not rand); function void post_randomize(); checksum = compute(data); endfunction — the solver never sees the checksum.',
        hints: [
          'Does the checksum have any freedom left?',
          'Which fields should the solver decide?',
          'post_randomize is called after each successful randomize.',
        ],
      },
    ],
    assessment: {
      title: 'Constraint constructs checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In `constraint c { (op == OP_BURST) -> len inside {[4:16]}; }`, what is constrained about len when op is OP_RD?',
          options: [
            'len must be inside [4:16]',
            'len must be 1',
            'Nothing: implication constrains only when the condition holds',
            'len must be 0',
          ],
          answer: 'Nothing: implication constrains only when the condition holds',
          explanation:
            'Implication is one-armed: the consequent applies only when the antecedent is true. Constraining the other case needs a second implication or constraint if/else.',
          hint: 'Ask what happens when the left side is false.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which field type guarantees that every value appears exactly once before any repeats?',
          options: ['rand', 'randc', 'a dist-weighted rand', 'solve-before rand'],
          answer: 'randc',
          explanation:
            'randc cycles through its entire (small) value space before repeating. rand picks fresh solutions with no coverage guarantee; dist shapes frequencies; solve-before reorders decisions.',
          hint: 'The c stands for cycle.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Stimulus that is identical on every randomize() call usually means the constraint model has exactly one solution.',
          answer: 'true',
          explanation:
            'An over-constrained model with a unique solution makes the solver return the same values every time — directed behavior from a random-looking test.',
          hint: 'Match the symptom to its diagnosis.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Which automatic function is the standard place to compute derived fields (like a checksum) after randomization?',
          answer: 'post_randomize()',
          explanation:
            'post_randomize() is called automatically after each successful randomize(), and is the idiomatic home for deterministic derivations rather than solver constraints.',
          hint: 'Its name says when it runs.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'inside', definition: 'Constraint membership operator over listed values and ranges; negation excludes sets.' },
      { term: 'Implication (->)', definition: 'Constraint relation applying the consequent only when the antecedent holds; one-armed by nature.' },
      { term: 'randc', definition: 'A cycling rand variant that exhausts its small value space before repeating.' },
      { term: 'solve-before', definition: 'A constraint hint reordering solver decisions; narrow legitimate use for weighted leading variables.' },
      { term: 'post_randomize()', definition: 'Function called automatically after each successful randomize(); the home for derived fields.' },
      { term: 'constraint_mode', definition: 'Method to enable/disable named constraint blocks programmatically; use sparingly and log it.' },
    ],
    revisionSummary: [
      'inside for legality, dist for bias, -> for relations, if/else for two arms.',
      'Implication is one-armed: always write or explicitly consider the false side.',
      'randc cycles small fields completely; wide randc is impractical.',
      'solve-before is a rare ordering hint, not a distribution tool; derivations belong in post_randomize.',
      'Symptoms diagnose models: identical stimulus = over-constrained; return 0 = contradiction.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Constrained random verification', url: 'https://en.wikipedia.org/wiki/Constrained_random_verification', kind: 'article' },
      { label: 'Accellera — SystemVerilog standards', url: 'https://www.accellera.org/downloads/standards/systemverilog/', kind: 'standard' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'sv-m05-l3',
    title: 'Functional Coverage: covergroups, bins, cross',
    summary:
      'Measure what your tests actually exercised: covergroups and coverpoints, bins for features and corners, crosses for combinations — and the honest difference between code coverage and functional coverage.',
    objectives: [
      'Declare a covergroup with coverpoints and bins sampling a transaction class.',
      'Explain what a cross measures and why crosses find the bugs bins miss.',
      'Distinguish code coverage (line/toggle/branch) from functional coverage, and state what each can and cannot prove.',
      'Describe the coverage closure loop: measure, find holes, retarget stimulus, repeat.',
    ],
    whyItMatters:
      'Random stimulus without measurement is gambling: you ran ten thousand transactions but nobody can say what was actually exercised. Functional coverage is the instrumentation that turns "we ran a lot" into "we covered the plan": every feature, corner and combination has a named bin, and the report shows exactly which are empty. It is also the vocabulary of every verification conversation — "what is your coverage?" means something precise, and this lesson gives it to you.',
    prerequisites: [
      'sv-m05-l1/l2: rand fields, constraints, the stimulus-model mindset',
      'sv-m04-l2: transactions and the layered testbench',
    ],
    explanation:
      '**Functional coverage** measures whether the scenarios that matter to the *specification* were exercised. You define what matters as **coverpoints** (variables or expressions worth measuring) with **bins** (the named value sets you care about), grouped in a **covergroup**, sampled at moments of interest (usually when a transaction completes).\n\n```\ncovergroup cg_mem @(posedge clk);        // sample event\n  cp_op:   coverpoint tr.op;\n  cp_addr: coverpoint tr.addr {\n    bins low   = {[0:63]};\n    bins high  = {[192:255]};\n    bins zero  = {0};                    // explicit corner bin\n    bins max   = {255};\n  }\n  cp_len:  coverpoint tr.len;\n  x_op_addr: cross cp_op, cp_addr;        // combinations\nendgroup\n```\n\nReading the report, then, is mechanical: each bin shows a hit count; empty bins are your remaining work; a cross shows which *combinations* never occurred — the classic place where bugs hide (a write burst to the maximum address was never tried, even though writes, bursts and the max address were each hit individually). Autobins (a coverpoint with no explicit bins) create one bin per value or per automatic bucket, useful for small fields; explicit bins are better for anything with meaning, because coverage numbers are only as good as the bins encode intent.\n\nKeep the distinction with **code coverage** razor sharp, because they are often confused. Code coverage (line, toggle, branch, expression — measured by tools automatically) tells you which lines of *your code* executed. It says nothing about whether a scenario was meaningful: 100 percent line coverage with weak stimulus means every line ran with trivial values. Functional coverage is written by you, from the plan, and measures scenario space. The mature workflow uses both: code coverage finds dead code and unexecuted branches; functional coverage finds untested features. Neither alone proves anything, and "coverage closure" means both are reviewed against the plan — not that a number hit 100 percent.',
    deepDive:
      '### Sampling: when and what\n\nA covergroup samples on its event (`@(posedge clk)` above) or via an explicit `cg.sample()` call. Sampling per clock is easy but inflates counts with idle cycles; the better discipline for transaction-based environments is sampling at transaction completion (often from the monitor), so bins measure transfers, not clocks. Also know option settings exist (per-instance coverage, weight, comment, goal) — recognize them in professional code; the concept that matters is *sample at meaningful events*.\n\n### Choosing bins: the plan is the spec\n\nBins are the encoding of the verification plan into measurable units, and the quality bar is: each bin corresponds to a plan item someone could name. For an address: the plan says low/high/zero/max — write exactly those four bins, not 256 autobins you will never read. For a FIFO: bins for empty-hit, full-hit, full-while-full (write rejected), empty-while-empty (read rejected), simultaneous push+pop. Crosses encode interaction items: op × address range, priority × length. If a bin exists that no plan item maps to, it is clutter; if a plan item exists with no bin, it is unverifiable — both are review findings.\n\n### The closure loop, honestly\n\nCoverage closure is a loop: (1) run the regression; (2) read the coverage report (functional plus code); (3) identify empty/low bins and classify why — is stimulus not reaching it (fix constraints or add inline-aimed tests), or is the bin actually unreachable (remove it with justification)? (4) rerun; repeat until every bin is either hit or justified-out. Two honesty rules: a hit is not a check — a bin that only says "this happened" verifies nothing by itself; checking is the scoreboard and assertions job. And 100 percent functional coverage means the *model* was exercised, not that the design is correct: bins encode your current understanding of what matters, and bugs have historically lived in the combinations nobody thought to bin. That humility is why the plan is reviewed by designers as well as verifiers.\n\n### Tool honesty\n\nCovergroups are verification-subset SystemVerilog: **not supported by Icarus, so not runnable on this platform**; fully supported commercially, and partially in open-source tooling. UVM wraps covergroups in subscribers/covergroups inside components — same primitives. Code coverage is a tool feature (simulator or synthesis/fpga tools report it) and is equally not a platform feature here. The skill — choosing bins and reading reports — is fully learnable from this lesson and transfers everywhere.',
    examples: [
      {
        title: 'A covergroup over the transaction stream',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — NOT runnable on this platform\n// (requires a full SV simulator). Concept and structure per IEEE 1800.\n\nclass MemTr;                       // from Module 04/05\n  rand logic [1:0] op;             // 0=RD 1=WR 2=BURST 3=FLUSH\n  rand logic [7:0] addr;\n  rand logic [3:0] len;\nendclass\n\ncovergroup cg_mem with function sample(MemTr tr);\n  cp_op: coverpoint tr.op {\n    bins rd    = {2\'d0};\n    bins wr    = {2\'d1};\n    bins burst = {2\'d2};\n    bins flush = {2\'d3};             // illegal to drive, legal to observe?\n  }\n  cp_addr: coverpoint tr.addr {\n    bins zero = {8\'h00};\n    bins low  = {[8\'h01:8\'h3F]};\n    bins high = {[8\'hC0:8\'hFE]};\n    bins max  = {8\'hFF};\n  }\n  cp_len: coverpoint tr.len {\n    bins one  = {1};\n    bins many = {[2:15]};\n    bins full = {15};                // corner: max burst\n  }\n  x_op_addr: cross cp_op, cp_addr;   // 4 x 4 = 16 combination bins\nendgroup\n\n// Sampling at a meaningful event (e.g. from the monitor on commit):\n// cg_mem cg = new(); ... cg.sample(tr);',
        explanation: [
          'with function sample(MemTr tr) lets the monitor call cg.sample(tr) at transaction commit — precise sampling instead of per-clock noise.',
          'cp_op has one bin per opcode: each hit means that operation actually occurred.',
          'cp_addr encodes the plan corners explicitly (zero, low, high, max) rather than 256 unreadable autobins.',
          'cp_len includes the max-burst corner; the bins are ranges because every middle value is equivalent to the plan.',
          'x_op_addr is the payoff: 16 combination bins; an empty (burst, max) bin is a specific, nameable hole — drive exactly that scenario next.',
        ],
      },
      {
        title: 'Reading the report and closing a hole',
        language: 'text',
        code:
        '// Illustrative coverage report for teaching (format varies by tool)\n//\n// COVERGROUP: cg_mem      Coverage: 87.50%\n//   cp_op                 100.00%   rd=4121 wr=3987 burst=1204 flush=0\n//   cp_addr               100.00%   zero=89 low=6021 high=2884 max=77\n//   cp_len                 75.00%   one=4032 many=5901 full=0   <-- HOLE\n//   x_op_addr              62.50%   10/16 hit\n//     EMPTY: (wr,zero) (burst,zero) (burst,low) (burst,high)\n//            (burst,max) (flush,*)\n//\n// Reading it:\n// 1. flush=0: if the plan says FLUSH is DUT-internal, this bin should be\n//    removed with justification, not chased.\n// 2. cp_len full=0: no max-length burst ever occurred. Stimulus hole.\n//    Aim stimulus: randomize() with { len == 15; op == OP_BURST; }\n// 3. Empty cross cells concentrate on burst: bursts never hit zero/low/\n//    high/max. One targeted constraint fixes four cells at once.\n// 4. Rerun, re-read, repeat until every bin is hit or justified-out.',
        explanation: [
          'The report is a to-do list: empty bins are named, specific, next actions — this is why functional coverage is the planning instrument.',
          'flush=0 shows the other closure decision: justify-and-remove bins that model things stimulus should not do.',
          'The empty cross cells all involve burst, so one inline constraint (aimed burst with corner addresses) addresses several holes at once — read crosses before writing new tests.',
          'Percentages summarize; the counts tell the story (max=77 shows corners do occur under biasing, but full=0 shows a real gap).',
        ],
      },
      {
        title: 'Code coverage vs functional coverage: the 100-percent illusion',
        language: 'text',
        code:
        '// Verilog-2001 DUT snippet (runnable logic shown for the argument)\n//\n//   always @(posedge clk) begin\n//     if (we)  mem[waddr] <= wdata;   // line A\n//     if (re)  rdata      <= mem[raddr]; // line B\n//   end\n//\n// Code coverage claim: "100% line coverage" — lines A and B both executed.\n//\n// What was actually exercised (functional view):\n//   - we=1 with waddr=0 only        -> address decoding never varied\n//   - we and re never asserted together -> concurrent read/write UNTESTED\n//   - raddr always == last waddr    -> reading stale addresses UNTESTED\n//\n// Lesson: line coverage proves the lines RAN, not that the BEHAVIOR was\n// explored. Functional coverage (bins for concurrent rw, address sweep,\n// stale reads) is what exposes the holes — and the scoreboard still has\n// to check correctness of each scenario. Neither metric alone suffices.',
        explanation: [
          'Both lines executed (100 percent line coverage), yet two high-value behaviors were never exercised: concurrent read/write and address variation.',
          'This is the standard failure of coverage-by-number: the metric measured the code, the plan cares about behaviors.',
          'The fix is functional bins (simultaneous rw, address sweep) plus the scoreboard checking each scenario — coverage guides, checks prove.',
          'Use code coverage for what it is good at: finding dead code and unexecuted branches after functional coverage is green.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The coverage closure loop',
        content:
        '     +----------------+        +---------------------+\n     | Run regression |------->| Collect coverage    |\n     | (many seeds)   |        | (functional + code) |\n     +----------------+        +----------+----------+\n            ^                              |\n            |                              v\n     +------+---------+         +---------------------+\n     | Fix stimulus:  |         | Find empty/low bins |\n     | constraints,   |<--------| classify: stimulus  |\n     | inline-aimed   |         | hole or bad bin?    |\n     | tests          |         +---------------------+\n     +----------------+\n\n     Exit criterion: every bin is HIT or JUSTIFIED-OUT (documented).\n     Reminder: a hit means EXERCISED, not CHECKED. Checking is the\n     scoreboard/assertions job.',
        caption:
          'Coverage measures, holes retarget stimulus, the loop repeats. Exercised is not the same as checked.',
      },
    ],
    tables: [
      {
        caption: 'Code coverage vs functional coverage',
        headers: ['Property', 'Code coverage', 'Functional coverage'],
        rows: [
          ['Defined by', 'Tool, automatically', 'You, from the verification plan'],
          ['Measures', 'Which lines/toggles/branches executed', 'Which features/corners/combinations occurred'],
          ['100 percent means', 'Every line ran with something', 'Every planned scenario occurred'],
          ['100 percent does NOT mean', 'Behavior explored', 'Design correct (bins encode current understanding)'],
          ['Blind spot', 'Trivial stimulus covers lines', 'Un-binned bugs (things you forgot to measure)'],
          ['Best used for', 'Dead code, missed branches', 'Planning and closure of scenario space'],
        ],
      },
      {
        caption: 'Bin design for a FIFO (plan-to-bin mapping)',
        headers: ['Plan item', 'Coverpoint/bin'],
        rows: [
          ['Push accepted', 'bin push_ok sampled on (push && !full)'],
          ['Push while full (rejected)', 'bin push_full_hit sampled on (push && full)'],
          ['Pop while empty (rejected)', 'bin pop_empty_hit sampled on (pop && empty)'],
          ['Simultaneous push+pop', 'bin rw_same_cycle sampled on (push && pop)'],
          ['Occupancy sweep', 'bins occupancy[] = {[0:DEPTH]} per-level bin'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Treating a covered bin as a checked behavior.',
        fix: 'Coverage says the scenario occurred; only the scoreboard and assertions say it occurred *correctly*. Every plan item needs both a bin and a check.',
      },
      {
        mistake: 'Autobinning everything (256 address bins, 65536 data bins) and declaring coverage meaningless.',
        fix: 'Bins encode plan intent: ranges, corners and named features. Explicit bins with plan-item names make reports actionable; autobins belong only on small enumerations.',
      },
      {
        mistake: 'Chasing 100 percent by deleting hard bins instead of justifying them.',
        fix: 'Unreachable bins are removed with a written justification (spec says internal-only, unreachable by construction) — visible in review. Silent deletion is how plan items vanish.',
      },
    ],
    guidedPractice: {
      title: 'Write the FIFO covergroup bins',
      brief:
        'Given a FIFO with push, pop, full, empty signals and a 4-deep occupancy counter, write (as comments, no full covergroup syntax required) the six bins your plan needs, stating the sampling condition for each.',
      starterCode:
        '// FIFO plan bins:\n// 1. push accepted      when ...\n// 2. ...\n// (complete all six with sampling conditions)',
      expectedBehavior:
        '1. push_ok when push && !full; 2. push_rejected when push && full; 3. pop_ok when pop && !empty; 4. pop_rejected when pop && empty; 5. rw_same_cycle when push && pop; 6. occupancy per level, one bin each for 0..DEPTH sampled on every clock (or on completion events).',
      hints: [
        'Both accepted and rejected cases are plan items.',
        'The simultaneous case is a cross-class corner: one bin, one condition.',
        'Occupancy is a sweep: one bin per level.',
      ],
    },
    practiceExercises: [
      {
        title: 'Audit the bins',
        brief:
          'A teammate reports 100 percent functional coverage with these bins: addr[0], addr[1], ..., addr[255] (autobins) and data autobins. List the three review findings against the bin-design rules from this lesson.',
        expectedBehavior:
          'Findings: (1) autobins measure values, not plan items — no corner/feature semantics, so the report is unreadable and holes are unnameable; (2) data autobins explode the space and none of them map to plan items; (3) no crosses exist, so interaction coverage (op x address, length x address) is unmeasured. Rewrite with named plan bins and crosses.',
        hints: [
          'Can anyone name the plan item that addr[137] measures?',
          'What is missing between op and addr?',
          'Bins encode intent, not raw values.',
        ],
      },
      {
        title: 'Explain the statement',
        brief:
          'A lead says: "We are at 100 percent functional coverage and still found a bug in bring-up. How?" Write 4-6 sentences explaining how this is possible and what it implies about coverage methodology.',
        expectedBehavior:
          'Coverage measures the binned model of expected scenarios, not reality: the bug lived in a scenario nobody thought to bin (an unmodeled interaction or an incorrect understanding). Implications: bins need designer review, crosses need breadth, coverage closure is necessary but not sufficient, and unexplained field failures feed back into new bins (the model of what matters evolves).',
        hints: [
          'Who decided what the bins are?',
          'Is the stimulus space or the bin space the bottleneck here?',
          'What happens to the bin set after such a bug?',
        ],
      },
    ],
    assessment: {
      title: 'Functional coverage checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does a cross of coverpoints measure?',
          options: [
            'The union of all bin values',
            'Whether combinations of individual coverpoint values occurred',
            'The percentage of lines executed',
            'The correlation between clock and reset',
          ],
          answer: 'Whether combinations of individual coverpoint values occurred',
          explanation:
            'A cross bins the joint space (op x address, for example); empty cross cells reveal combination holes that individual 100-percent coverpoints hide.',
          hint: 'Bugs love the corners between two features.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A module reached 100 percent line coverage, yet concurrent read and write were never tested. What explains this?',
          options: [
            'Line coverage tools are broken',
            'Lines execute under trivial stimulus too; line coverage does not measure scenario quality',
            'Concurrent rw requires functional coverage only in UVM',
            'The testbench had an error counter',
          ],
          answer: 'Lines execute under trivial stimulus too; line coverage does not measure scenario quality',
          explanation:
            'Each line only needs to have executed once with anything. Scenario quality — corners, combinations — is what functional coverage models.',
          hint: 'What does it mean for a line to be covered?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A covergroup bin with a nonzero hit count proves the DUT behaved correctly in that scenario.',
          answer: 'false',
          explanation:
            'A hit means the scenario was EXERCISED. Correctness is established by checkers: scoreboard comparisons and assertions. Coverage guides where to check; it does not check.',
          hint: 'Exercised versus checked.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'In the closure loop, name the two allowed final states of any bin.',
          answer: 'Hit or justified-out',
          explanation:
            'Closure means every bin was exercised (hit) or removed with a written justification (justified-out). Silently deleting bins hides plan items.',
          hint: 'One is about occurrence; the other is about documentation.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'covergroup', definition: 'The SystemVerilog construct bundling coverpoints and crosses with a sampling event.' },
      { term: 'coverpoint', definition: 'A measured variable or expression within a covergroup.' },
      { term: 'bin', definition: 'A named set of values whose occurrence is counted; the unit of the coverage report.' },
      { term: 'cross', definition: 'A covergroup item measuring combinations across two or more coverpoints.' },
      { term: 'Functional coverage', definition: 'Plan-driven measurement of which scenarios were exercised; complements code coverage.' },
      { term: 'Coverage closure', definition: 'The loop of running, measuring, retargeting stimulus and justifying bins until all are hit or justified-out.' },
    ],
    revisionSummary: [
      'Covergroups sample at meaningful events; bins encode plan items, crosses encode interactions.',
      'Empty bins are named next actions; the closure loop is measure, classify, retarget, repeat.',
      'Code coverage (line/toggle/branch) measures code execution; functional coverage measures scenario space; neither alone suffices.',
      'A hit is exercised, not checked: scoreboard and assertions still own correctness.',
      'Covergroups are verification-subset SV: not runnable on this platform, standard on commercial simulators.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Functional coverage', url: 'https://en.wikipedia.org/wiki/Functional_coverage', kind: 'article' },
      { label: 'Wikipedia — Code coverage', url: 'https://en.wikipedia.org/wiki/Code_coverage', kind: 'article' },
      { label: 'Accellera — UVM (coverage subscribers)', url: 'https://www.accellera.org/downloads/standards/uvm', kind: 'standard' },
    ],
    estimatedMinutes: 45,
  },
];
