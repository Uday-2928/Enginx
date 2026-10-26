import type { TutorialLesson } from '../types';

export const module01Lessons: TutorialLesson[] = [
  {
    id: 'dver-m01-l1',
    title: 'Functional Correctness and the Spec as Source of Truth',
    summary:
      'Define what verification is actually proving: behavior matches the specification — not that the code looks right, runs fast, or passes one test.',
    objectives: [
      'State the definition of functional correctness and explain why it is spec-relative.',
      'Distinguish the three artifact levels: spec, RTL and testbench, and name the direction information flows.',
      'Classify a symptom as a spec ambiguity, an RTL bug or a testbench bug.',
      'Explain why "it simulated fine" is not evidence, and what would be.',
    ],
    whyItMatters:
      'Every verification skill you build — plans, checkers, coverage — exists to produce one thing: defensible evidence that the design matches its specification. Engineers who skip this foundation write testbenches that confirm their own assumptions, and the bugs that ship are precisely the ones nobody thought to check against the spec. Interviews probe this directly: "how do you know it works?" is a question about evidence, not optimism.',
    prerequisites: [
      'Completion of the Verilog HDL course',
      'Basic understanding of what a testbench does',
    ],
    explanation:
      '**Functional correctness** is a claim about behavior: for every input the design can legally receive, the outputs match what the specification requires. Three words in that sentence carry the whole discipline. *Every input* is why coverage exists (you cannot try them all — you must argue you covered what matters). *Legally* is why stimulus modeling matters (undefined behavior is uncheckable). *What the specification requires* is the deepest one: correctness is relative to a written spec, not to the designer intent in your head.\n\nThis yields the working separation of the whole course. The **specification** says what the design must do (a FIFO with depth 8 must return reads in FIFO order; a read while empty must not corrupt state). The **RTL** claims to implement it. The **testbench** is the machinery that produces *evidence* about the claim. A mismatch can originate in any layer: the RTL can be wrong (a bug), the spec can be ambiguous or self-contradictory (a spec bug — resolved by writing it down, not by silently picking an interpretation), and the testbench itself can be wrong (checking the wrong thing — the most dangerous, because it manufactures false confidence).\n\nThe practical consequence is a habit: when a simulation fails, the first question is not "what is broken?" but "**what is the source of truth here?**" Trace the failing behavior to a spec line. If the spec says one thing and the RTL does another, file an RTL bug. If the spec is silent or contradictory, file a spec bug — do not debug against your intuition. If the RTL matches the spec and the testbench complains, the testbench is wrong, and you must fix it *loudly* (a testbench bug quietly suppressed teaches the team to ignore failures).',
    deepDive:
      '### Why "it simulated fine" is not evidence\n\nA simulation is one trajectory through an enormous space. Passing means: the scenarios actually generated, checked by the checkers actually written, produced no observed mismatch. It is evidence, but only about the scenarios and checks that existed. The professional questions that turn "it passed" into evidence: What was the stimulus strategy? What was checked, against what reference? What was measured as covered? What is known NOT covered? A testbench with no checker proves literally nothing — a smoke test that runs without hanging has value, but it is not correctness evidence, and calling it that in a review is a process failure.\n\n### The three bug classes and their different costs\n\nRTL bugs are the expected finds: fix, re-simulate, update the testbench if the corner was untested. Spec bugs are the expensive, valuable finds: an ambiguity discovered in bring-up costs a design change; the same ambiguity discovered while writing the plan costs an email. This is why verification planning (next lesson) starts with reading the spec adversarially — verifiers are the spec QA team. Testbench bugs are the insidious class: a checker that never fires can look identical to a design that never fails. The standard defenses: negative testing (inject a known error and confirm the checker catches it), and review of checkers as seriously as review of RTL.\n\n### Specification forms you will actually meet\n\nPerfect prose specs are rare. You will work from: register maps (tables — highly checkable: reset values, access types), protocol documents (timing rules — checkable by assertions), block diagrams plus text (functional intent — checkable by reference models), and the worst case, code-that-is-the-spec (a previous implementation to be re-implemented — then "correctness" means equivalence, and equivalence checking is the tool). Part of verification skill is *extracting checkable statements* from whatever form the spec takes: every sentence of the form "when X, the design must Y" is a future test case and a future checker. Collect them as you read; that collection is the raw material of the verification plan.',
    examples: [
      {
        title: 'One spec sentence becomes checks and tests',
        language: 'text',
        code:
        '// Spec excerpt (typical register-block wording):\n//\n//   "CTRL register (0x00): bit0=ENABLE, bit1=MODE.\n//    Reset value 0x01. Writing 1 to bit2 (CLR) clears the status\n//    register (0x04). All other bits read as zero."\n//\n// Extracted checkable statements (the raw material of a plan):\n//   S1. After reset, reading 0x00 returns 0x01.\n//   S2. Writing bit0=1 starts the function (observable via behavior).\n//   S3. Bits [7:3] are read-as-zero regardless of what was written.\n//   S4. Writing 1 to bit2 clears register 0x04.\n//   S5. Writing 0 to bit2 does NOT clear register 0x04.\n//   S6. Writing 1 to bit2 leaves bit2 itself reading as 0 (self-clearing).\n//\n// Each S-number becomes: one or more tests + one checker.\n// S5 and S6 exist because the spec sentence implies them; a verifier\n// reads spec sentences adversarially and writes down the implications.',
        explanation: [
          'The spec sentence is not yet verification; the S-list is. Each item is checkable: a stimulus action plus an expected response.',
          'S3 and S5/S6 are the items a casual reader misses — read-as-zero fields and self-clearing bits are classic bug sources.',
          'The mapping S-number -> test -> checker is the skeleton of the verification plan (next lesson).',
        ],
      },
      {
        title: 'Tracing a failure to its source of truth',
        language: 'text',
        code:
        '// Scenario: self-checking TB fails with:\n//   "MISMATCH addr=0x0F expected=0x80 got=0x00"\n//\n// The trace:\n//   1. What does the SPEC say about address 0x0F? -> "STATUS register,\n//      read-only, bit7 = DONE flag."\n//   2. What does the TB expect? -> 0x80 (DONE set). Why did the TB\n//      expect DONE? Because it saw the DONE condition in the DUT inputs.\n//   3. What does the RTL do? -> returns 0x00.\n//\n// Classification:\n//   (a) RTL never sets DONE under this condition -> RTL bug (or spec\n//       says DONE only under a different condition: re-read the spec).\n//   (b) Spec says DONE requires condition C, stimulus lacked C -> the\n//       TB stimulus was wrong, not the DUT: testbench bug.\n//   (c) Spec says DONE on condition C, RTL says condition D -> spec/RTL\n//       disagreement discovered: file against the spec, get a ruling,\n//       THEN fix whichever side loses.\n//\n// Rule: the ruling comes from the written spec, never from which\n// behavior seems more reasonable at 2 a.m.',
        explanation: [
          'The failure trace starts at the spec, not at the waveform: which written statement governs this behavior?',
          'All three outcomes are legitimate; two of them mean the DUT is innocent. Verification is not prosecution of the RTL, it is triangulation among spec, RTL and TB.',
          'The 2 a.m. rule is memorable because intuition-based rulings are how ambiguous specs fossilize into permanent undocumented behavior.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Spec, RTL, testbench: who is judge, who is judged',
        content:
        '        +------------------+\n        |   SPECIFICATION  |  <- source of truth (written, reviewed)\n        +------------------+\n                |  says what must happen\n                v\n        +------------------+        +---------------------+\n        |       RTL        | <----- |     TESTBENCH       |\n        |  (the accused)   |  pins  | stimulus + checkers |\n        +------------------+        +---------------------+\n                                            |\n                                            | evidence\n                                            v\n                                   PASS / FAIL + coverage\n\n  A failure means one of:\n    1. RTL  != spec          -> RTL bug\n    2. spec ambiguous/wrong -> spec bug (get a written ruling)\n    3. TB mis-checks        -> testbench bug (fix loudly, add negative test)\n\n  Checking ALWAYS targets the spec, never the RTL reading of itself.',
        caption:
          'The triangulation picture: correctness is a three-way agreement, and every disagreement has exactly one of three resolutions.',
      },
    ],
    tables: [
      {
        caption: 'The three artifacts and what each one is allowed to claim',
        headers: ['Artifact', 'Role', 'Allowed claim', 'Cannot claim'],
        rows: [
          ['Specification', 'Source of truth', 'What the design must do', 'That the design does it'],
          ['RTL', 'Implementation', 'Claims to match the spec', 'That it does (its opinion is not evidence)'],
          ['Testbench', 'Evidence machine', 'Observed behavior vs spec-derived expectations', 'Coverage of untested scenarios'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Debugging a failure against the waveform before checking what the spec says.',
        fix: 'Find the governing spec sentence first. It decides whether you are looking at an RTL bug, a spec bug, or a testbench bug — three completely different next actions.',
      },
      {
        mistake: 'Resolving a spec ambiguity by choosing the interpretation that makes the RTL pass.',
        fix: 'Ambiguities are spec bugs. Get a written ruling (update the spec), then verify against the ruling. Interpretation-by-convenience fossilizes undocumented behavior.',
      },
      {
        mistake: 'Treating a passing smoke test as correctness evidence.',
        fix: 'A pass is evidence only of the scenarios and checks that existed. State the stimulus strategy, the checks and the coverage alongside any pass claim.',
      },
    ],
    guidedPractice: {
      title: 'Extract the checkable statements',
      brief:
        'Given the spec sentence "TX asserts DONE one bit-time after the last data bit; DONE clears automatically when the next transmission starts", write the S-list of checkable statements (aim for 4-6), including at least one negative check (something that must NOT happen).',
      starterCode:
        '// S1. ...\n// S2. ...\n// ...',
      expectedBehavior:
        'A strong S-list: S1 DONE rises exactly one bit-time after the last data bit; S2 DONE remains asserted until the next start; S3 DONE clears at (or within one cycle of) the next start; S4 (negative) DONE does not re-assert by itself while idle; S5 (negative) DONE does not clear mid-transmission; plus a check that a new transmission works immediately after DONE clears.',
      hints: [
        'One sentence usually implies both a positive and a negative statement.',
        'Timing words (after, until, within) become window or delay checks.',
        'Automatic clearing is the self-clearing-bit pattern from the example.',
      ],
    },
    practiceExercises: [
      {
        title: 'Classify the failure',
        brief:
          'For each, classify spec bug / RTL bug / testbench bug and name the next action: (a) TB expects little-endian byte order, spec never states byte order; (b) spec says active-high enable, RTL implements active-low; (c) TB reference model has a fixed off-by-one in its length field.',
        expectedBehavior:
          '(a) Spec bug: file to get byte order written down, then align RTL and TB to the ruling. (b) RTL bug (assuming the spec is unambiguous): fix RTL or file with the spec sentence attached. (c) Testbench bug: fix the model, then prove the fix with a negative test (inject the old error and confirm the checker now catches it).',
        hints: [
          'Ask which artifact disagrees with which.',
          'Silence in the spec is a spec defect, not a freedom.',
          'A wrong checker manufactures both false passes and false fails.',
        ],
      },
      {
        title: 'Evidence inventory',
        brief:
          'A teammate reports "the FIFO block is verified, 200 tests passed". List the five questions you would ask before accepting the claim.',
        expectedBehavior:
          '1) What was the stimulus strategy (directed, random, seeds)? 2) What was checked, and against what reference? 3) What coverage was measured (code and functional), and what are the holes? 4) What is known NOT verified (explicitly out of scope)? 5) Were any checker changes or waivers applied, and are they documented?',
        hints: [
          'A pass claim has five load-bearing words: scenarios, checks, reference, coverage, scope.',
          'Waivers silently delete plan items.',
          'Which question catches a no-checker testbench?',
        ],
      },
    ],
    assessment: {
      title: 'Spec as source of truth checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A simulation mismatch occurs. Per this lesson, what is the FIRST question to answer?',
          options: [
            'Which signal toggled wrong in the waveform',
            'What does the specification say this behavior should be',
            'Who wrote the failing module',
            'How to make the test pass',
          ],
          answer: 'What does the specification say this behavior should be',
          explanation:
            'The spec decides whether this is an RTL bug, a spec bug, or a testbench bug — three different next actions. Waveform debugging comes after classification.',
          hint: 'Correctness is defined relative to something.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'The spec is silent about byte order; the testbench assumed little-endian and fails against the RTL which uses big-endian. Classify it.',
          options: ['RTL bug', 'Testbench bug', 'Spec bug (ambiguity)', 'No bug: either order is fine'],
          answer: 'Spec bug (ambiguity)',
          explanation:
            'Silence in a spec is a spec defect. The resolution is a written ruling that updates the spec; then RTL and TB are aligned to it. Silently picking a side fossilizes undocumented behavior.',
          hint: 'Neither artifact can be judged against a missing rule.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A testbench that drives stimulus but contains no checkers can still provide correctness evidence if enough scenarios are run.',
          answer: 'false',
          explanation:
            'Without checks, nothing is compared against expectations; the run only proves the design did not crash on those scenarios. Evidence requires observation plus comparison.',
          hint: 'What turns an observation into evidence?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What is the one-phrase source of truth every check must target (three words)?',
          answer: 'the specification',
          explanation:
            'Checks compare observed behavior against spec-derived expectations. The RTL cannot judge itself and the TB is not allowed an independent opinion.',
          hint: 'It is the title of this lesson.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Functional correctness', definition: 'Behavior matching the specification for all legal inputs; spec-relative by definition.' },
      { term: 'Specification', definition: 'The written statement of required behavior; the only source of truth for checking.' },
      { term: 'RTL bug', definition: 'A mismatch where the implementation disagrees with an unambiguous spec.' },
      { term: 'Spec bug', definition: 'An ambiguity, contradiction or omission in the specification, resolved by a written ruling.' },
      { term: 'Testbench bug', definition: 'A checker or stimulus defect that manufactures false confidence or false failures.' },
    ],
    revisionSummary: [
      'Correctness = RTL behavior matching the written spec, for legal inputs.',
      'Failures classify three ways: RTL bug, spec bug, testbench bug — the spec decides.',
      'Spec ambiguities are filed and ruled on in writing, never resolved by convenience.',
      'A pass is evidence only about existing scenarios and existing checks.',
      'Read specs adversarially: every "when X, must Y" sentence is a future test and checker.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Functional verification', url: 'https://en.wikipedia.org/wiki/Functional_verification', kind: 'article' },
      { label: 'Wikipedia — Specification (technical standard)', url: 'https://en.wikipedia.org/wiki/Specification_(technical_standard)', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'dver-m01-l2',
    title: 'From Requirements to a Verification Plan',
    summary:
      'Turn a specification into the working document of a verification project: features, scenarios, checks and tests — organized in a table you can actually finish.',
    objectives: [
      'Derive features from a spec and decompose each feature into scenarios.',
      'Build the plan table: feature x scenario x check x test, with priority.',
      'Decide the checking method per scenario: reference model, invariant, or assertion.',
      'Estimate and cut: how to make a plan finishable under real time pressure.',
    ],
    whyItMatters:
      'The verification plan is the contract that turns "test it until it looks done" into a scoped, reviewable, finishable project. It is also the document your lead reads to judge progress and the document that survives you when someone else inherits the block. Almost every overrun in verification traces back to a missing or mushy plan; almost every clean tape-out story starts with "the plan had 120 items and we closed 118 with two justified waivers".',
    prerequisites: [
      'dver-m01-l1: the spec as source of truth and the S-list technique',
      'Basic familiarity with the DUT block you are verifying',
    ],
    explanation:
      'A **verification plan** answers four questions for every piece of required behavior: What feature is this? What scenarios exercise it? What check proves it correct? What test(s) produce the scenario? The classic organization is a table:\n\n**ID | Feature | Scenario | Check (how) | Test (what runs) | Priority**\n\nDeriving it is a top-down walk. Start from the spec (or the S-list from lesson 1) and enumerate **features** — the independently valuable capabilities: for a FIFO, push/pop functionality, full/empty flags, reset behavior, concurrent operation. For each feature, enumerate **scenarios**: the situations in which the feature must behave — a push into a full FIFO, a pop from an empty FIFO, push and pop in the same cycle, a mid-operation reset. Scenarios are where beginners under-plan: they plan the feature working, not the feature being *abused*.\n\nEach scenario needs a named **check**: a reference-model comparison (state-equivalent model), an invariant (FIFO order never violated; occupancy count matches pointers), or an assertion (protocol rules like no push-while-full). The check choice is a design decision in the plan, not an afterthought in the testbench — because the check determines what the testbench must contain.\n\nFinally, **prioritize**: P0 = correctness-critical scenarios (data integrity, reset), P1 = protocol and corner cases, P2 = robustness and performance-flavored checks. The plan must be *finishable*: when time runs short — and it always does — you cut P2 items with a documented waiver, never P0 items silently. That is the difference between a plan and a wish list.',
    deepDive:
      '### Scenario enumeration techniques that find the corners\n\nThree reliable generators of scenarios. **Boundary enumeration**: for every numeric parameter (depth, width, burst length), plan the cases at 0, 1, max-1, max, and the rejects beyond (push to a full FIFO). **Interaction enumeration**: for every pair of features that can be active simultaneously, plan the simultaneous case (write while read; reset while both; back-to-back transfers). **Fault enumeration**: for every input the spec calls illegal or edge-behavioral, plan what the design must do (reject it? flag it? ignore it?). Most shipped bugs live in interaction and fault scenarios, which are exactly the ones that feel "obviously fine" and get skipped.\n\n### Choosing the check: model, invariant, or assertion\n\nA **reference model** (a small behavioral copy of the intended function) is the strongest check for data-path correctness: every observation is compared against predicted behavior. It costs the most to build and must itself be trusted — keep it simple and review it like RTL. An **invariant** is a rule that must always hold (order preserved; occupancy equals pointer difference; grant implies request) — cheap, powerful, and blind to *which* correct value occurred, so it complements rather than replaces models. An **assertion** encodes temporal protocol rules at the boundary. Mature testbenches use all three, and the plan names which per scenario, because reviewers evaluate the checking strategy, not just the test list.\n\n### What makes a plan finishable\n\nReal plans have a scope-cutting property: items are ordered by risk-adjusted value (probability of catching a bug times severity). P0 items are the data-integrity spine; P1 covers corners; P2 is robustness, statistics, and nice-to-have instrumentation. When schedule pressure arrives, P2 gets waived in writing (with reviewer sign-off), P1 gets triaged item by item, and P0 never moves. The plan also tracks status per item (not started / in test / passing / waived), because "the plan" that lives in a spreadsheet nobody updates is theater. Estimate effort per item honestly: a reference-model check for one feature can cost more than ten assertion checks; put the model on the critical path early or it never lands.\n\n### The plan is reviewed, not just written\n\nA verification plan gets the same treatment as RTL: a review with the designer and an architect, where the standard questions are: Which spec sentences have no plan item? Which plan items have no spec sentence (invented behavior — remove or get it speced)? Is any check circular (the TB checking the DUT against a model derived FROM the DUT)? Are reset and error paths covered? A plan that survives that review is the actual scope of the project; everything else is aspiration.',
    examples: [
      {
        title: 'The plan table for a 4-bit counter with load and enable',
        language: 'text',
        code:
        '// DUT: cnt4 — 4-bit up counter, active-high en (count), ld (load\n// d[3:0]), synchronous active-high rst. Output: q[3:0], rollover (1\n// when q wraps from 15 to 0).\n//\n// ID | Feature      | Scenario                        | Check                    | Test            | Pri\n// ---+--------------+---------------------------------+--------------------------+-----------------+----\n// V1 | counting     | free-runs 0..15..0 twice        | ref model q == (q+1)&F   | t_count         | P0\n// V2 | counting     | en=0 holds value across cycles  | q stable while en=0      | t_count         | P0\n// V3 | load         | ld=1 loads d regardless of en   | q == d on next posedge   | t_load          | P0\n// V4 | load         | ld wins over en same cycle      | q == d (not q+1)         | t_load          | P1\n// V5 | rollover     | wrap 15 -> 0 sets rollover 1cy  | rollover pulse exactly   | t_count         | P1\n// V6 | reset        | rst=1 forces q=0 next cycle     | q == 0                   | t_reset         | P0\n// V7 | reset        | rst mid-count, then count on    | clean restart, no glitch | t_reset_mid     | P0\n// V8 | interaction  | rst=1 while ld=1 and en=1       | reset wins               | t_reset_mid     | P1\n// V9 | fault        | ld and en toggle every cycle    | no illegal q (never x)   | t_rand          | P2\n//\n// Notes:\n//  - V4/V8 are INTERACTION scenarios: the ones casual plans skip.\n//  - V7 is the mid-operation reset from the next module.\n//  - The check column names the mechanism: reference model (V1),\n//    invariant-style comparison (V2), direct expectation (V3,V6).',
        explanation: [
          'Every row is one verifiable claim: feature, concrete scenario, named check, runnable test, priority.',
          'The ref model in V1 is two lines of TB code ((q+1) & 4\'hF) — showing that a reference model need not be heavy to be powerful.',
          'Priorities encode the cut order: under pressure, V9 is waived in writing; V1/V3/V6/V7 never move.',
          'Nine items cover this block; a real plan for a UART or FIFO has 30-80 rows with the same shape.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Spec to plan: the derivation pipeline',
        content:
        '  SPEC (sentences, tables, timing rules)\n     |  adversarial reading (lesson 1 S-list)\n     v\n  FEATURES  (independently valuable capabilities)\n     |  boundary / interaction / fault enumeration\n     v\n  SCENARIOS (concrete situations, including abuse)\n     |  choose per scenario\n     v\n  CHECKS    (reference model | invariant | assertion)\n     |  bundle scenarios into runnable units\n     v\n  TESTS     (t_count, t_load, t_reset_mid, ...)\n     |  risk-adjust\n     v\n  PRIORITIES P0 > P1 > P2      +  STATUS tracking + WAIVER log\n\n  Finishable under pressure: waive P2 in writing, triage P1,\n  never move P0.',
        caption:
          'Each arrow is a decomposition step you can review; the plan table is the final artifact with six columns.',
      },
    ],
    tables: [
      {
        caption: 'Checking methods: when each one wins',
        headers: ['Method', 'Strength', 'Blind spot', 'Typical cost'],
        rows: [
          ['Reference model', 'Predicts exact expected values', 'Model bugs; drift from spec', 'High (build + review)'],
          ['Invariant', 'Always-on rules, cheap', 'Does not predict values', 'Low'],
          ['Assertion (SVA-style)', 'Temporal/protocol rules at boundary', 'Data correctness', 'Low-medium'],
          ['Directed golden values', 'Trivial to write per case', 'Only what was hand-computed', 'Low per case, scales badly'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Planning only the happy path: feature-works scenarios without abuse scenarios.',
        fix: 'Run the three enumerators on every feature: boundaries (0, 1, max, beyond), interactions (every simulatable pair), faults (every illegal input). Most real bugs live in the second and third lists.',
      },
      {
        mistake: 'Writing test names in the plan without naming the check.',
        fix: 'A test is only a stimulus schedule; the check is the evidence. Decide per scenario whether the proof is a model comparison, an invariant or an assertion, and put that word in the table.',
      },
      {
        mistake: 'A plan with everything at the same priority.',
        fix: 'Three tiers minimum (P0 correctness spine, P1 corners, P2 robustness). Uniform priority means the plan cannot be cut — so when time runs out, the cutting happens arbitrarily, and usually silently.',
      },
    ],
    guidedPractice: {
      title: 'Plan a gray-code converter',
      brief:
        'DUT: bin2gray — converts 4-bit binary in to 4-bit Gray code out, combinational. Write the plan table (5-7 rows) with ID, feature, scenario, check, test, priority. Hint: Gray code property — adjacent binary values map to outputs differing in exactly one bit.',
      starterCode:
        '// ID | Feature | Scenario | Check | Test | Pri\n// ----+---------+----------+-------+------+----',
      expectedBehavior:
        'A strong table: V1 exhaustive mapping (check: g == bin ^ (bin >> 1) for all 16 inputs, P0); V2 adjacency invariant (consecutive inputs differ in exactly one output bit, P0/P1); V3 boundary values 0 and 15 (golden 0000 and 1000, P1); V4 x-propagation (input x must not silently become 0 — check with !==, P2); V5 stability (same input, same output across repeated evaluations, P2).',
      hints: [
        'For a combinational block the exhaustive check IS affordable: 16 cases.',
        'The adjacency property is the invariant-style check.',
        'Gray for binary b is b XOR (b >> 1); 15 maps to 1000.',
      ],
    },
    practiceExercises: [
      {
        title: 'Find the missing rows',
        brief:
          'A teammate plans a FIFO with exactly three rows: push works, pop works, flags work. Name at least six missing scenarios and classify each as boundary, interaction, or fault.',
        expectedBehavior:
          'Push while full (boundary/fault), pop while empty (boundary/fault), push+pop same cycle (interaction), reset while non-empty then re-verify order (interaction), wrap-around of pointers at depth boundary (boundary), data order across many pushes (invariant check row), simultaneous push while full with pop in flight (interaction), occupancy count vs pointers (invariant).',
        hints: [
          'Enumerate pairs of features first.',
          'What happens at the depth boundary?',
          'What must the design do for illegal requests?',
        ],
      },
      {
        title: 'Make the cut',
        brief:
          'Your plan has 40 items: 8 P0, 20 P1, 12 P2. Schedule allows closing 24. Which items move, what must be documented, and what can never be cut? Write the ruling as your lead would.',
        expectedBehavior:
          'Close all 8 P0 plus 16 of the P1 chosen by risk (interaction and fault scenarios first). Waive the 12 P2 and the remaining 4 P1 with written justification and reviewer sign-off; each waived item gets a why and a known-risk note. Nothing P0 is cut; silent cuts are forbidden.',
        hints: [
          'The cut order is P2, then P1 by risk, never P0.',
          'A waiver is a document, not a shrug.',
          'Interaction and fault scenarios outrank redundant happy-path variants.',
        ],
      },
    ],
    assessment: {
      title: 'Verification planning checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which column of the plan table states HOW the scenario is proven correct?',
          options: ['Feature', 'Scenario', 'Check', 'Test'],
          answer: 'Check',
          explanation:
            'The check column names the evidence mechanism (reference model, invariant, assertion). The test column names what runs; the check names what proves.',
          hint: 'Tests run; checks prove.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which scenario class do shipped bugs most often trace back to?',
          options: [
            'Happy-path feature scenarios',
            'Interaction and fault scenarios',
            'Performance scenarios',
            'Coding-style scenarios',
          ],
          answer: 'Interaction and fault scenarios',
          explanation:
            'Features working in isolation is the easiest part to test; bugs concentrate where two features are active together or where inputs are edge/illegal.',
          hint: 'Which ones feel obviously fine and get skipped?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'When schedule pressure arrives, P0 plan items may be waived if the designer verbally agrees.',
          answer: 'false',
          explanation:
            'P0 is the correctness spine and never moves. Waivers apply to lower-priority items, are written, and carry reviewer sign-off; verbal agreements leave no record.',
          hint: 'What is the cut order and its documentation rule?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Name the check method that compares observed behavior against a small behavioral copy of the intended function (two words).',
          answer: 'reference model',
          explanation:
            'The reference model predicts exact expected values; it is the strongest data-correctness check and must itself be reviewed like RTL.',
          hint: 'It is the strongest check for data-path correctness.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Verification plan', definition: 'The table mapping features to scenarios, checks, tests and priorities; the scope contract of the project.' },
      { term: 'Scenario', definition: 'A concrete situation (including abuse and corner cases) in which a feature must behave per spec.' },
      { term: 'Reference model', definition: 'A small behavioral implementation of the intended function used to predict expected outputs.' },
      { term: 'Invariant', definition: 'A rule that must hold at all times (order, occupancy, grant-implies-request).' },
      { term: 'Waiver', definition: 'A documented, signed-off decision not to execute a plan item, with justification and risk note.' },
    ],
    revisionSummary: [
      'Plan = feature x scenario x check x test x priority, derived top-down from the spec.',
      'Enumerate with boundaries, interactions and faults; abuse scenarios matter most.',
      'Choose the check per scenario: reference model, invariant, or assertion.',
      'Three priority tiers make the plan cuttable: waive P2 in writing, never cut P0.',
      'The plan is reviewed like RTL and tracked item by item.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Functional verification', url: 'https://en.wikipedia.org/wiki/Functional_verification', kind: 'article' },
      { label: 'Wikipedia — Design specification', url: 'https://en.wikipedia.org/wiki/Design_specification', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'dver-m01-l3',
    title: 'Directed vs Randomized, and the Cost of Finding Bugs Late',
    summary:
      'The strategy decision behind every plan: when hand-written directed tests win, when constrained-random wins, and why the price of a bug multiplies at every stage it escapes.',
    objectives: [
      'Compare directed and randomized stimulus on coverage-per-effort, debuggability and reproducibility.',
      'Choose a stimulus strategy per plan feature and justify the mix.',
      'Sketch the cost-of-bug-late curve and name the stages.',
      'Explain what a complete evidence story looks like when the plan is done.',
    ],
    whyItMatters:
      'Teams argue about directed versus random like a religion; working verification engineers treat it as an engineering trade-off with a per-feature answer. The same engineers know that stimulus strategy is only half the economics — the other half is WHEN a bug is found, because a bug found by the testbench costs an hour and the same bug found in silicon can cost a respin. Both halves belong in your head when you scope a plan.',
    prerequisites: [
      'dver-m01-l2: the plan table and priority tiers',
      'dver-m01-l1: evidence and coverage thinking',
    ],
    explanation:
      '**Directed tests** are hand-written scenarios with hand-known expected results: reset the counter, load 9, count 3 times, expect 12. They are debuggable (you know exactly what was intended), reproducible (no seed), and perfect for spec-mandated sequences and known corners. They scale badly: writing 10,000 of them by hand is impossible, and the coverage of the un-written space is unknown.\n\n**Randomized stimulus** (constrained-random from the SystemVerilog course) generates thousands of legal scenarios from a constraint model. It finds combination corners no human scheduled — the back-to-back transfer with a mid-packet reset — and its explored-ness is *measurable* with functional coverage. It costs more up front (model, scoreboards, infrastructure) and its failures can be harder to interpret (which scenario, exactly, produced this?). Seeds give reproducibility when the environment records them.\n\nThe professional mix is not either-or: **directed for the spine and the known corners (P0 smoke and spec sequences), randomized for breadth over the legal space (P1 interactions), targeted directed or inline-constrained runs to close specific coverage holes (the closure loop)**. The choice is made per plan feature: a register interface is mostly directed (finite, enumerable); an arbiter under load is mostly random (combinatorial); a spec-mandated error sequence is directed because the spec says exactly what to send.\n\nThe second axis is time-to-find. A bug found by your testbench on day 3 costs: a debug session, an RTL fix, a re-run. The same bug found by a colleague integrating your block costs their time plus a suspicious look. Found in silicon: respin, schedule slip, millions. The curve is exponential in stage, and its engineering translation is: **verification effort is cheapest where it is earliest** — plans and checkers are cheap insurance against the expensive end of the curve. This is also why bug triage (Module 03) keeps statistics on which stage catches what: a verification environment that only catches bugs the synthesis lint tool would have caught is mis-aimed.',
    deepDive:
      '### Choosing per feature: a decision table you can defend\n\nWalk each plan feature and ask: is the scenario space enumerable and spec-fixed (directed), combinatorial with meaningful corners (random), or a mandated sequence (directed)? A register block: directed, with a generated sweep for width corners. An arbiter: random with invariant checks plus directed fairness corners. A UART TX: directed for the frame format (finite), random for back-to-back timing and inter-byte gaps. A FIFO: random for occupancy dynamics plus directed corners at full/empty. Writing these choices INTO the plan table (a stimulus column) makes the strategy reviewable instead of tribal.\n\n### The cost curve, stage by stage\n\nStages in order of escalating cost: (1) code review / lint — minutes per bug; (2) unit simulation with the block testbench — an hour or two (debug is local, waveforms small); (3) system simulation — the bug now hides among other blocks, debug takes a day and needs cross-team coordination; (4) emulation/prototyping — reproduction is slow and instrumentation limited; (5) silicon bring-up — physical probing only, pressure maximal; (6) field — recalls, respins, reputation. Classic industry wisdom puts later stages at 10x-100x per stage; the exact multiple matters less than the shape: monotonic, steep, and front-loaded prevention is always the cheap side. Practically: invest in block-level self-checking (Module 02) precisely because stage-2 finds are nearly free.\n\n### Evidence of correctness: what "done" sounds like\n\nWhen the plan closes, the claim is a paragraph, not a feeling: all P0 items passing with named checks; functional coverage at X percent with N bins justified-out (waivers listed); code coverage reviewed with dead code explained; M seeds of the random regression green over K nights; the bug list for this block closed with root causes mapped back to plan items (each escaped bug produced a new plan item so the hole cannot recur). That last item — bugs improving the plan — is the mature-loop marker: every escape (a bug found at a later stage) is a coverage hole made visible, and it must end as a new plan row, not just a fixed line of RTL.\n\n### Where the platform fits honestly\n\nEverything in Modules 02-04 of this course is buildable on this platform: the graded exercises run Icarus Verilog, and the self-checking patterns there are plain Verilog-2001. Constrained-random stimulus itself is verification-subset SV (not runnable here — see the SystemVerilog course honesty notes), but the *strategy* is tool-neutral, and seed discipline and directed coverage work identically on Icarus.',
    examples: [
      {
        title: 'The same FIFO corner, two strategies',
        language: 'text',
        code:
        '// Plan item V7: "push and pop in the same cycle, occupancy stays put"\n//\n// DIRECTED version (pseudo):\n//   push(x01); push(x02); push(x03); push(x04);   // fill 4/4\n//   push(x05); pop();                              // same-cycle exchange\n//   check: occupancy still 4, output == x01 (FIFO order intact),\n//          x05 not yet visible, no flag glitch this cycle.\n//   Pros: exact, readable, reproducible. Cons: one configuration tested;\n//   empty/full/boundary combos of same-cycle rw need more directed rows.\n//\n// RANDOMIZED version:\n//   constraint: push/pop legal; per-call random; occupancy sweep bins;\n//   invariant checks: order preserved, occupancy == ptr diff,\n//                     never push-while-full, never pop-while-empty.\n//   Pros: sweeps every occupancy x push/pop pattern over 10k calls,\n//   finds flag-timing corners no one scheduled. Cons: needs the\n//   invariant checkers + coverage bins + seeds to be worth anything.\n//\n// PLAN DECISION: random for breadth (V7-random), plus ONE directed\n// golden test at exactly occupancy=4 with simultaneous rw (V7-directed)\n// as the readable regression anchor both strategies must agree on.',
        explanation: [
          'The directed row is trivially debuggable: five operations, hand-checkable — it becomes the regression anchor humans trust.',
          'The random rows need invariant checkers and coverage bins to produce evidence; without them, "random passed" says little.',
          'The plan records the mix explicitly: breadth by random, anchor by directed — a per-item decision, reviewable.',
        ],
      },
      {
        title: 'Cost-of-bug-late: one bug, four stages',
        language: 'text',
        code:
        '// Bug: FIFO read pointer updates on push instead of pop (spec: on pop).\n//\n// Stage 1 — block testbench (self-checking TB, day 3):\n//   Scoreboard mismatch on 2nd read. Debug: one file, one wave.\n//   Cost: ~1-2 hours. Found by: reference model check.\n//\n// Stage 3 — system integration (week 6):\n//   Symptom: audio stream plays samples out of order, intermittently.\n//   Debug: which block? FIFO? DMA? codec? Cross-team waveforms.\n//   Cost: days, plus two meetings about whose bug it is.\n//\n// Stage 4 — FPGA prototype (week 10):\n//   Reproduce with slow signal probing; rebuild bitstream per trial.\n//   Cost: 1-2 weeks of iteration latency.\n//\n// Stage 6 — silicon / field:\n//   Respin (mask cost + schedule), or field update, support tickets.\n//   Cost: months + reputation.\n//\n// The same bug. The only variable is WHEN the checker ran.',
        explanation: [
          'The bug is identical at every stage; the cost multiplier comes from localization difficulty and iteration latency.',
          'Stage-1 detection is cheap precisely because the block testbench has a reference model and full visibility.',
          'Every escape also costs trust: later-stage bugs make teammates re-verify your work, which is the real organizational tax.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Cost of a bug by the stage that finds it',
        content:
        '  stage    1         2         3         4        5        6\n         review    unit TB   system    proto    bring-up  field\n        +--------+---------+---------+--------+--------+--------+\n  cost  | minutes|  hours  |  days   | weeks  | months | recall |\n        +--------+---------+---------+--------+--------+--------+\n             ^\n             |  cheapestHERE — invest in block-level self-checking\n\n  strategy split (per plan feature):\n  +-------------------+-------------------------------------------+\n  | enumerable/spec-  | DIRECTED  (registers, frame formats,      |\n  | fixed scenarios   | mandated sequences, repro anchors)        |\n  +-------------------+-------------------------------------------+\n  | combinatorial     | RANDOMIZED (arbiters, FIFO dynamics,      |\n  | legal space       | bus traffic) + coverage + invariants      |\n  +-------------------+-------------------------------------------+\n  | closure of holes  | AIMED runs (directed or inline-constrained)|\n  +-------------------+-------------------------------------------+',
        caption:
          'Two economic pictures in one: when a bug is found decides its price; where the space is combinatorial decides the stimulus strategy.',
      },
    ],
    tables: [
      {
        caption: 'Directed vs randomized: the trade-off honestly stated',
        headers: ['Property', 'Directed', 'Constrained-random'],
        rows: [
          ['Coverage per engineering hour (large spaces)', 'Low', 'High'],
          ['Coverage per engineering hour (small enumerable spaces)', 'High', 'Overkill'],
          ['Debuggability of a failure', 'Trivial (intent known)', 'Needs logs, seeds, minimization'],
          ['Reproducibility', 'Inherent', 'Via recorded seeds'],
          ['Measured explored-ness', 'No (implicit in test list)', 'Yes (functional coverage)'],
          ['Finds', 'What you predicted', 'What you did not predict'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Picking one stimulus strategy for the whole project and defending it as identity.',
        fix: 'Decide per plan feature: enumerable spaces are directed, combinatorial spaces are random, holes are closed with aimed runs. Write the choice into the plan stimulus column.',
      },
      {
        mistake: 'Running random stimulus without invariant checks or coverage and calling it verification.',
        fix: 'Random stimulus needs three things to be evidence: legality constraints, checkers (invariants/models), and coverage bins measuring what occurred. Without all three it is noise generation.',
      },
      {
        mistake: 'Treating a late-stage bug as only an RTL fix.',
        fix: 'Every escaped bug is also a coverage hole: add the new scenario as a plan item, add its bin, and re-run. Fixing the line without fixing the hole guarantees recurrence.',
      },
    ],
    guidedPractice: {
      title: 'Assign strategies per feature',
      brief:
        'For each plan feature, choose directed / random / aimed-closure and justify in one line: (a) register readback of 8 registers with known reset values; (b) arbiter fairness under 4 masters with random request patterns; (c) UART TX frame format; (d) a coverage report shows (burst, max-address) never hit.',
      starterCode:
        '// (a) strategy: ...\n// (b) strategy: ...\n// (c) strategy: ...\n// (d) strategy: ...',
      expectedBehavior:
        '(a) Directed: 8 enumerable checks plus generated sweep. (b) Random with invariant checks (grant implies request; fairness window) and directed fairness corners as anchors. (c) Directed: the frame format is spec-fixed and finite. (d) Aimed closure: inline-constrained or directed burst at max address until the bin hits, then keep it in regression.',
      hints: [
        'Ask: is the scenario space enumerable from the spec?',
        'Invariants + random is the standard arbiter recipe.',
        'Empty coverage bins are aimed-run jobs.',
      ],
    },
    practiceExercises: [
      {
        title: 'Read the curve backwards',
        brief:
          'A block ships and a field bug appears that its unit testbench would have caught in minutes. Name the two process failures and the two artifacts whose absence allowed it.',
        expectedBehavior:
          'Failures: the plan item either did not exist (spec sentence never planned) or existed but was waived/not executed; and no escape-feedback loop turned the field bug into a new plan item. Missing artifacts: the plan status record (item not closed) and the escape-driven plan update (post-mortem row + coverage bin).',
        hints: [
          'Either the hole was never planned, or it was planned and skipped.',
          'What should happen after ANY late bug is found?',
          'Waivers are documents; where was this one?',
        ],
      },
      {
        title: 'Defend the mix in review',
        brief:
          'Your lead asks: "Why is the UART TX plan 70 percent directed when the course taught randomization?" Write the 4-6 sentence defense, using the enumerability argument and naming where random DOES apply to this block.',
        expectedBehavior:
          'Frame format, baud divisors and error injection are spec-fixed and enumerable: directed tests are cheaper and more debuggable than a solver. Random applies to the timing envelope: random inter-byte gaps, back-to-back bytes, random data content over many seeds, with coverage bins for gap sizes and a scoreboard for frame correctness. The mix is per-feature, not ideological.',
        hints: [
          'What is enumerable in a UART TX?',
          'What is combinatorial in a UART TX?',
          'Seeds still matter for the random parts.',
        ],
      },
    ],
    assessment: {
      title: 'Strategy and cost checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'For which plan feature is constrained-random stimulus clearly the right primary strategy?',
          options: [
            'Register reset-value readback (8 registers)',
            'Arbiter behavior under four masters with random request patterns',
            'UART start-bit framing (spec-fixed)',
            'A mandated error-injection sequence',
          ],
          answer: 'Arbiter behavior under four masters with random request patterns',
          explanation:
            'The arbiter scenario space is combinatorial with meaningful interaction corners — random with invariants wins. The others are enumerable/spec-fixed: directed.',
          hint: 'Where is the space combinatorial?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'The dominant reason a bug found at silicon costs orders of magnitude more than the same bug at unit simulation is:',
          options: [
            'Silicon is faster than simulation',
            'Localization is hard, iteration is slow, and consequences (respin/field) are organizational',
            'Bugs mutate in silicon',
            'Testbenches are slower in silicon',
          ],
          answer: 'Localization is hard, iteration is slow, and consequences (respin/field) are organizational',
          explanation:
            'The bug is identical; the multiplier comes from debugging visibility, rebuild latency and organizational impact at later stages.',
          hint: 'What actually changes between stages?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A random regression that passed for 10,000 transactions with no checkers attached is meaningful verification evidence.',
          answer: 'false',
          explanation:
            'Without checks nothing was verified; stimulus alone produces observations, not evidence. It needs legality constraints, checkers and coverage to mean anything.',
          hint: 'Evidence = observation plus comparison.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What must happen to the plan after a bug escapes to a later stage (two words: what kind of item is added)?',
          answer: 'new plan item',
          explanation:
            'Every escape reveals a coverage hole; the mature loop adds a plan item (and a coverage bin) so the hole cannot silently recur.',
          hint: 'The bug improved something more than the RTL.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Directed test', definition: 'A hand-written scenario with hand-known expected results; debuggable and reproducible by construction.' },
      { term: 'Constrained-random stimulus', definition: 'Solver-generated legal scenarios from a constraint model; scales breadth, needs checkers and coverage.' },
      { term: 'Aimed closure run', definition: 'A directed or inline-constrained run targeted at a specific uncovered coverage bin.' },
      { term: 'Cost-of-bug-late curve', definition: 'The exponential escalation of fix cost across review, unit, system, prototype, silicon and field stages.' },
      { term: 'Escape', definition: 'A bug that reached a later stage than the testbench; each escape must become a new plan item.' },
    ],
    revisionSummary: [
      'Directed: enumerable, spec-fixed, debuggable. Random: combinatorial spaces, with invariants and coverage.',
      'The professional mix: directed spine + random breadth + aimed closure of holes.',
      'Bug cost escalates per stage because localization and iteration get harder, not because bugs change.',
      'Invest first in block-level self-checking: stage-2 finds are the cheapest.',
      'Every escape feeds back as a new plan item and bin.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Constrained random verification', url: 'https://en.wikipedia.org/wiki/Constrained_random_verification', kind: 'article' },
      { label: 'Wikipedia — Functional verification', url: 'https://en.wikipedia.org/wiki/Functional_verification', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
];
