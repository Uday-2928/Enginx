import type { TutorialLesson } from '../types';

export const module04Lessons: TutorialLesson[] = [
  {
    id: 'de-m04-l01',
    title: "Boolean Algebra: Identities and De Morgan's Theorems",
    summary:
      'The laws that let you rewrite logic instead of rewiring it: the full identity toolkit, algebraic simplification step by step, and the two De Morgan theorems that move inversions.',
    objectives: [
      'Apply the identity, null, idempotent, complement, absorption and distributive laws to simplify expressions.',
      "State and apply both of De Morgan's theorems in gate terms.",
      'Simplify multi-term expressions algebraically, justifying each step with a named law.',
      'Verify any claimed identity by exhaustive evaluation over all input combinations.',
    ],
    whyItMatters:
      'Every minimized circuit in this course — and every timing-critical path you will optimize in RTL — starts as algebra. De Morgan alone explains bubble pushing, NAND/NOR conversions and active-low conventions. Because Boolean algebra has only two values, a proof is *exhaustive and finite*: you can verify every identity on this page with a 4-row loop, a habit that makes these laws facts rather than memorized strings.',
    prerequisites: ['de-m03-l01'],
    explanation:
      'Boolean algebra is ordinary algebra reduced to two values, 0 and 1, with three operations: OR (+), AND (*, written as juxtaposition) and NOT (\'). Some laws match arithmetic intuition; others do not. The complete working set:\n\n### The core laws\n\n- **Identity**: `a + 0 = a`; `a * 1 = a`\n- **Null (annihilator)**: `a + 1 = 1`; `a * 0 = 0`\n- **Idempotent**: `a + a = a`; `a * a = a`\n- **Complement**: `a + a\' = 1`; `a * a\' = 0`\n- **Involution**: `(a\')\' = a`\n- **Commutative / Associative**: order and grouping are free, as in arithmetic.\n- **Distributive**: `a(b + c) = ab + ac` *and* the one arithmetic does not have: `a + bc = (a + b)(a + c)`.\n- **Absorption**: `a + ab = a` and `a(a + b) = a`. This is the great simplifier: a term that is "covered" by another vanishes.\n\n### De Morgan\'s theorems\n\n1. `(ab)\' = a\' + b\'` — the complement of an AND is the OR of the complements.\n2. `(a + b)\' = a\'b\'` — the complement of an OR is the AND of the complements.\n\nIn gate language: a NAND is an OR with bubbled inputs; a NOR is an AND with bubbled inputs. General form: break the bar, change the sign — complementing a whole expression lets you swap AND<->OR and complement each variable.\n\n### Algebraic simplification, justified step by step\n\n```\ny = ab + ab\'\n  = a(b + b\')     distributive\n  = a * 1         complement\n  = a             identity\n```\n\n```\ny = a + a\'b\n  = (a + a\')(a + b)   distributive (the OR form)\n  = 1 * (a + b)       complement\n  = a + b             identity\n```\n\nBoth results cut gates: `ab + ab\'` is one AND with a tied input instead of three gates, and `a + a\'b` drops the inverter entirely. That is the point of the algebra: same truth table, fewer gates, shorter depth.',
    deepDive:
      '### The consensus theorem\n\nOne more identity earns its own name: `ab + a\'c + bc = ab + a\'c`. The term `bc` is the *consensus* of the other two and is redundant — whenever bc = 1, either ab or a\'c is already 1 (check with a=1: then ab covers it; a=0: a\'c covers it). Hardware engineers use this constantly when two logic paths "both provide" a condition; the overlap term can be deleted without changing behavior. It also explains why removing a redundant gate cannot break a two-level circuit even though the removed term\'s inputs stay connected.\n\n### Duality\n\nEvery Boolean identity has a **dual**: swap + with * and 0 with 1, and you get another true identity. The dual of `a + 0 = a` is `a * 1 = a`; the dual of absorption `a + ab = a` is `a(a+b) = a`. Learning to flip between a theorem and its dual halves what you must memorize — and the SOP/POS symmetry of the next lesson is duality in action.\n\n### Proofs you can trust\n\nA Boolean identity is verified by **perfect induction**: evaluate both sides on all 2^n input rows. For two variables that is 4 rows; for three, 8. This is why exhaustive C loops can *prove* (not merely test) logic identities, and it previews the verification method for every combinational block in Modules 5-7: enumerate everything, compare everything.',
    examples: [
      {
        title: 'Proving an identity by exhaustive sweep',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    /* Claim 1: a + a\'b = a + b          (absorption variant)\n       Claim 2: (ab)\'     = a\' + b\'      (De Morgan)   */\n    int claim1_ok = 1;\n    int claim2_ok = 1;\n\n    for (int a = 0; a <= 1; a++) {\n        for (int b = 0; b <= 1; b++) {\n            int na = !a;\n            int nb = !b;\n\n            int lhs1 = a | (na & b);\n            int rhs1 = a | b;\n            if (lhs1 != rhs1) claim1_ok = 0;\n\n            int lhs2 = !(a & b);\n            int rhs2 = na | nb;\n            if (lhs2 != rhs2) claim2_ok = 0;\n        }\n    }\n    printf("a + a\'b = a + b on all 4 rows: %s\\n", claim1_ok ? "PROVEN" : "disproved");\n    printf("(ab)\' = a\' + b\' on all 4 rows: %s\\n", claim2_ok ? "PROVEN" : "disproved");\n    return 0;\n}',
        explanation: [
          'The nested loops enumerate all four (a,b) rows — the complete domain, which is what makes the check a *proof* (perfect induction).',
          'Claim 1 uses the distributive law\'s OR form in disguise; the sweep shows both sides agree on 00, 01, 10, 11.',
          'Claim 2 is De Morgan #1; note the C `!(a & b)` models the NAND\'s complementing bar exactly.',
          'If any row disagreed, the identity would be *disproved* — a single counterexample kills a universal claim, on paper or in code.',
          'Extending to three variables only means adding one loop and 8 rows: the method scales by powers of two.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'De Morgan as a gate transformation',
        content:
          '  Identity:  (a*b)\' = a\' + b\'\n\n     before:                        after:\n     a ---|     \\                   a --o--|     \\\n          | NAND|--o-- y  ==         |OR |---- y\n     b ---|     /                   b --o--|     /\n\n  Identity:  (a+b)\' = a\' * b\'\n\n     a ---|     \\                   a --o--|     \\\n          | NOR |---- y   ==         |AND|---- y\n     b ---|     /                   b --o--|     /\n\n  Procedure ("break the bar, change the sign"):\n    1. complement (break) the whole expression bar\n    2. swap AND <-> OR\n    3. complement each variable',
        caption:
          'Each De Morgan identity is a legal redrawing: the truth tables of the left and right sides are identical.',
      },
    ],
    tables: [
      {
        caption: 'Boolean algebra working laws (each with its dual)',
        headers: ['Name', 'OR form', 'AND form (dual)'],
        rows: [
          ['Identity', 'a + 0 = a', 'a * 1 = a'],
          ['Null', 'a + 1 = 1', 'a * 0 = 0'],
          ['Idempotent', 'a + a = a', 'a * a = a'],
          ['Complement', "a + a' = 1", "a * a' = 0"],
          ['Absorption', 'a + ab = a', 'a(a + b) = a'],
          ['Distributive', 'a(b + c) = ab + ac', 'a + bc = (a + b)(a + c)'],
          ["De Morgan 1", "(ab)' = a' + b'", "(a + b)' = a'b'  (De Morgan 2)"],
        ],
      },
      {
        caption: 'Verification rows for (ab)\' = a\' + b\'',
        headers: ['a', 'b', 'ab', "(ab)'", "a'", "b'", "a' + b'"],
        rows: [
          ['0', '0', '0', '1', '1', '1', '1'],
          ['0', '1', '0', '1', '1', '0', '1'],
          ['1', '0', '0', '1', '0', '1', '1'],
          ['1', '1', '1', '0', '0', '0', '0'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Distributing over AND as if it were arithmetic: writing (a + b)(a + c) = a + bc and not knowing why.',
        fix:
          'This one is *true* in Boolean algebra (check all 8 rows for three variables) but has no arithmetic analog. Prove it once by perfect induction and add it to your toolkit as the OR-distributive law.',
      },
      {
        mistake: "Cancelling terms across De Morgan's bar incorrectly, e.g. treating (ab)' as a'b'.",
        fix:
          'The bar complements the *whole* product and forces the operation to flip: (ab)\' = a\' + b\'. The wrong version a\'b\' equals (a + b)\'. When in doubt, evaluate one row: (a,b)=(1,0) gives (ab)\'=1 but a\'b\'=0.',
      },
      {
        mistake: 'Simplifying by deleting terms that "look redundant" without a named law.',
        fix:
          'Every deletion must be justified: absorption, complement, consensus, or a K-map (next lessons). Deleting a term that is not redundant changes the truth table on rows you did not check — always re-verify the simplified expression against the original on all rows.',
      },
    ],
    guidedPractice: {
      title: 'Simplify with named steps',
      brief:
        'Simplify y = a(a + b) + a\'b\' step by step, naming the law at each line, then verify your result against the original with a 2-variable sweep.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    for (int a = 0; a <= 1; a++)\n        for (int b = 0; b <= 1; b++) {\n            int orig = (a & (a | b)) | ((!a) & (!b));\n            int simp = a | (!b);        /* your claimed simplification */\n            printf("a=%d b=%d  orig=%d  simp=%d  %s\\n",\n                   a, b, orig, simp, orig == simp ? "ok" : "MISMATCH");\n        }\n    return 0;\n}',
      expectedBehavior:
        'Steps: y = a(a+b) + a\'b\' = a + a\'b\' (absorption) = (a + a\')(a + b\') (OR-distributive) = 1*(a + b\') (complement) = a + b\' (identity). The sweep prints ok on all four rows: 00 -> 0|1=1, 01 -> 0|0=0, 10 -> 1|1=1, 11 -> 1|1=1 — matching the original (0,0,1,1).',
      hints: [
        'Apply absorption to the first term group first.',
        'The remaining a\'b\' invites the OR-distributive law: x + yz = (x+y)(x+z) with x=a, y=a\', z=b\'.',
        'Any mismatch in the sweep means one algebra step was illegal — find it by re-deriving each line.',
      ],
    },
    practiceExercises: [
      {
        title: 'Consensus in action',
        brief:
          "Simplify f = ab + a'c + bc using the consensus theorem, then verify with an 8-row sweep in C that the 3-term and 2-term forms agree.",
        expectedBehavior:
          "f = ab + a'c (the bc term is the consensus and is redundant: when bc=1, if a=1 then ab=1; if a=0 then a'c=1). The sweep must print agreement on all 8 rows.",
        hints: [
          "Split the check on a: with a=1, bc implies ab; with a=0, bc implies a'c.",
          'The C pattern is two nested loops (a, b) plus c, comparing `f_full` and `f_short` row by row.',
          'A redundant term costs a real gate in hardware — finding it is a genuine saving.',
        ],
      },
      {
        title: 'De Morgan conversion drill',
        brief:
          "Rewrite each expression without any bar over a group (push all complements onto single variables): (a) (a + b)'; (b) (ab' + c)'; (c) ((a + b')c)'.",
        expectedBehavior:
          "(a) a'b'. (b) (ab' + c)' = (ab')' * c' = (a' + b) c'. (c) ((a + b')c)' = (a + b')' + c' = a' b + c'.",
        hints: [
          'Break the outer bar first, flipping the top-level operation.',
          'Then break any remaining inner bars one at a time.',
          'Check (b) with the row a=1, b=0, c=0: original (1*1 + 0)\' = 0; your form (a\' + b)c\' = (0 + 0)*1 = 0 — agree.',
        ],
      },
    ],
    assessment: {
      title: 'Boolean algebra checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does a + a\' simplify to?',
          options: ['1', '0', 'a', "a'"],
          answer: '1',
          explanation: 'The complement law: a variable ORed with its inverse is always 1.',
          hint: 'One of a or a\' is always 1.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'short-answer',
          prompt: "Simplify ab + ab' to its minimal form. (Use * for AND and ' for NOT.)",
          answer: 'a',
          explanation: "ab + ab' = a(b + b') = a * 1 = a — distributive, complement, identity.",
          hint: 'Factor a out first.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'What does the sweep print for the row a=1, b=0 when comparing (ab)\' with a\' + b\'?',
          code: 'int lhs2 = !(a & b);\nint rhs2 = (!a) | (!b);\nprintf("%d %d", lhs2, rhs2);',
          options: ['1 1', '0 0', '1 0', '0 1'],
          answer: '1 1',
          explanation: 'ab = 0 so (ab)\' = 1; a\' + b\' = 0 + 1 = 1. The row agrees — as all four rows do, proving De Morgan.',
          hint: 'Evaluate ab first.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'According to absorption, the term ab can be deleted from y = a + ab without changing y.',
          answer: 'true',
          explanation: 'a + ab = a: whenever ab is 1, a is already 1, so the OR is unchanged. This is the absorption law.',
          hint: 'Can ab be 1 while a is 0?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: "Write De Morgan's second theorem in symbols for two variables: the complement of (a + b). (Use ' for NOT.)",
          answer: "a'b'",
          explanation: "(a + b)' = a' * b' — complement the OR by ANDing the complements.",
          hint: 'Break the bar and change the sign.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Absorption', definition: 'a + ab = a: a term covered by another term is redundant and can be deleted.' },
      { term: 'De Morgan\'s theorems', definition: "(ab)' = a' + b' and (a + b)' = a'b': complementing flips AND to OR and complements each variable." },
      { term: 'Duality', definition: 'Every Boolean identity remains true when + and * (and 0 and 1) are swapped.' },
      { term: 'Consensus theorem', definition: "ab + a'c + bc = ab + a'c: the consensus term bc is redundant." },
      { term: 'Perfect induction', definition: 'Proving a Boolean identity by evaluating both sides on every input combination.' },
    ],
    revisionSummary: [
      'Master eight laws: identity, null, idempotent, complement, involution, commutative/associative, distributive (both forms), absorption.',
      "De Morgan: break the bar, change the sign — NAND = bubbled OR, NOR = bubbled AND.",
      'Absorption and consensus are the workhorses for deleting redundant terms.',
      "a + a'b = a + b: the inverter disappears — one of the most used simplifications.",
      'Every identity is provable by exhaustive evaluation; write the loop, trust the result.',
      'Simplification = same truth table, fewer gates, shorter depth.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Boolean algebra', url: 'https://en.wikipedia.org/wiki/Boolean_algebra', kind: 'article' },
      { label: "Electronics Tutorials — De Morgan's theorems", url: 'https://www.electronics-tutorials.ws/boolean/demorgan.html', kind: 'article' },
      { label: 'All About Circuits — Boolean algebra', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-7/boolean-relationships-on-venn-diagrams/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'de-m04-l02',
    title: 'SOP, POS, Minterms and Maxterms',
    summary:
      'Canonical forms: reading any truth table as a sum of minterms (SOP) or a product of maxterms (POS), the sigma/pi notation, and converting between the two.',
    objectives: [
      'Number minterms and maxterms from the binary value of the input row.',
      'Write a function directly from its truth table as canonical SOP and as canonical POS.',
      'Convert between Σm(...) and ΠM(...) listings using the complement relation.',
      'Explain why canonical forms are not minimal and what the next lessons do about it.',
    ],
    whyItMatters:
      'Canonical forms are the mechanical bridge from a truth table (what the customer asked for) to logic (what you build). Every design flow in Modules 5-7 begins here: truth table -> minterm list -> minimized expression -> gates. The notation Σm and ΠM is also the shared language of datasheets and exam papers.',
    prerequisites: ['de-m04-l01'],
    explanation:
      'Given any truth table, two standard shapes capture it exactly:\n\n- **Sum of products (SOP)**: OR of AND terms. Each AND term (a **minterm**) is 1 on exactly one input row.\n- **Product of sums (POS)**: AND of OR terms. Each OR term (a **maxterm**) is 0 on exactly one input row.\n\n### Minterms: one row, one product\n\nFor inputs a, b, c, the minterm m_i corresponds to row i (i written in binary as c b a or a b c — pick an order and keep it; here we use a as the MSB):\n\n```\nrow 0 (a=0,b=0,c=0):  m0 = a\'b\'c\'\nrow 1 (a=0,b=0,c=1):  m1 = a\'b\'c\nrow 2 (a=0,b=1,c=0):  m2 = a\'bc\'\n...\nrow 7 (a=1,b=1,c=1):  m7 = abc\n```\n\nEach variable appears once, complemented if the row bit is 0, uncomplemented if 1. The minterm evaluates to 1 *only* on its own row.\n\n**Canonical SOP** = OR of the minterms of every row where f = 1. Example: f = Σm(1, 4, 7) means\n\n```\nf = a\'b\'c + ab\'c\' + abc\n```\n\n### Maxterms: one row, one sum\n\nThe maxterm M_i is the *complement pattern*: each variable uncomplemented if the row bit is 0, complemented if 1, so that M_i = 0 exactly on row i. **Canonical POS** = AND of the maxterms of every row where f = 0.\n\nFor the same f = 1 on rows 1, 4, 7, the zero rows are 0, 2, 3, 5, 6:\n\n```\nf = M0 * M2 * M3 * M5 * M6\n  = (a+b+c)(a+b\'+c)(a+b\'+c\')(a\'+b+c)(a\'+b\'+c)\n```\n\n### The complement relation\n\nBecause minterms of f are maxterms of f\', the lists are complementary:\n\n```\nf  = Σm(1, 4, 7)      (7 minterm indices; here 3)\nf\' = Σm(0, 2, 3, 5, 6)   (the remaining rows)\nf  = ΠM(0, 2, 3, 5, 6)   (same numbers, as maxterms)\n```\n\nSo converting SOP to POS needs no algebra: complement the *index list* and swap the letter. (The Σ-Π relation for n variables: Σm(A) = ΠM(complement of A).)\n\n### Canonical is correct but fat\n\nBoth canonical forms above implement the truth table exactly, but neither is minimal: the SOP has three 3-input ANDs; algebra (or a K-map, next lesson) may collapse several minterms into one smaller term. Canonical forms are the *starting inventory*; minimization is the game that follows.',
    deepDive:
      '### Two-level logic and why it matters for speed\n\nCanonical SOP is a **two-level** network: one AND layer (one gate per minterm) feeding one OR. Two levels mean short, predictable depth — fast and regular — at the cost of many wide gates. Minimized expressions sometimes need three or more levels but fewer gates. Synthesis tools juggle exactly this trade-off (gate count vs depth) under your timing constraints from Module 8. PLA/PAL devices in the VLSI track are literally programmable two-level AND-OR fabrics, which is why the canonical form is more than an exercise.\n\n### Don\'t-care rows enter here\n\nSome inputs combinations can never occur (a BCD input never sees 10-15) or their response is unobserved. Those rows are **don\'t cares**, written d(...) in the minterm list. They are gold for minimization: the next lessons let a K-map group a 1 with a don\'t care (but never with a 0). Formally: f = Σm(ones) + d(dontcares), and you choose the d values that shrink the logic. Watch for them in Module 4 lesson 4 and in the decoder/BCD designs of Module 5.',
    examples: [
      {
        title: 'From truth table to canonical SOP, mechanically',
        language: 'text',
        code:
          'Function f(a,b,c), with a as MSB:\n\n   row  a b c | f\n    0    0 0 0 | 0\n    1    0 0 1 | 1   <- m1 = a\'b\'c\n    2    0 1 0 | 0\n    3    0 1 1 | 0\n    4    1 0 0 | 1   <- m4 = ab\'c\'\n    5    1 0 1 | 0\n    6    1 1 0 | 0\n    7    1 1 1 | 1   <- m7 = abc\n\n  canonical SOP:  f = m1 + m4 + m7\n                  f = a\'b\'c + ab\'c\' + abc\n\n  rule for building each minterm:\n     row bit = 1 -> variable as-is\n     row bit = 0 -> variable complemented\n\n  canonical POS (rows where f=0: 0,2,3,5,6):\n     f = (a+b+c)(a+b\'+c)(a+b\'+c\')(a\'+b+c)(a\'+b\'+c)\n\n  rule for maxterms:\n     row bit = 0 -> variable as-is\n     row bit = 1 -> variable complemented   (opposite of minterms!)',
        explanation: [
          'Row numbers come from reading (a b c) as a binary number — declare the bit order before starting, or minterm indices become meaningless.',
          'Each minterm contains all three variables exactly once; that is what makes it canonical.',
          'The maxterm rule is the mirror image: 0-bits keep the variable, 1-bits complement it, because the maxterm must evaluate to 0 on its row.',
          'The final POS multiplies five maxterms — legal, correct, and obviously begging for minimization, which the K-map lessons deliver.',
        ],
      },
      {
        title: 'Generating a canonical SOP in C from a truth array',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    /* f indexed by row number (a b c as binary, a = MSB) */\n    int f[8] = {0, 1, 0, 0, 1, 0, 0, 1};   /* ones on rows 1, 4, 7 */\n\n    printf("f = ");\n    int first = 1;\n    for (int m = 0; m < 8; m++) {\n        if (!f[m]) continue;\n        if (!first) printf(" + ");\n        /* print the minterm: complement each variable whose row bit is 0 */\n        int a = (m >> 2) & 1, b = (m >> 1) & 1, c = m & 1;\n        if (a) printf("a"); else printf("a\'");\n        if (b) printf("b"); else printf("b\'");\n        if (c) printf("c"); else printf("c\'");\n        first = 0;\n    }\n    printf("\\n");\n    return 0;\n}',
        explanation: [
          'The array is the truth table itself; the loop visits exactly the rows where f = 1.',
          'For each minterm, each variable is printed plain if its row bit is 1 and complemented if 0 — the minterm rule in three lines.',
          'This prints a\'b\'c + ab\'c\' + abc for rows 1, 4, 7, matching the hand-derived canonical SOP.',
          'The mechanism (index = row bits, bit = complement decision) is the same one a decoder-based implementation uses in hardware: Module 5 shows a decoder whose AND layer *is* the minterm generator.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Minterms and maxterms: complementary views of row 5',
        content:
          '  row 5 means a=1, b=0, c=1\n\n  MINTERM m5 (is 1 exactly on this row):\n     m5 = a b\' c          -> 1*1*1 = 1 here; 0 on every other row\n\n  MAXTERM M5 (is 0 exactly on this row):\n     M5 = a\' + b + c\'     -> 0+0+0 = 0 here; 1 on every other row\n\n  relationship:\n     m5 = (M5)\'\n     M5 = (m5)\'\n\n  building rule (memorize the mirror):\n     minterm:  bit=1 -> plain variable,  bit=0 -> complemented\n     maxterm:  bit=0 -> plain variable,  bit=1 -> complemented',
        caption:
          'Row 5 in both views: the minterm fires on the row, the maxterm dies on the row.',
      },
    ],
    tables: [
      {
        caption: 'All minterms and maxterms of three variables',
        headers: ['Row', 'a', 'b', 'c', 'Minterm', 'Maxterm'],
        rows: [
          ['0', '0', '0', '0', "m0 = a'b'c'", 'M0 = a+b+c'],
          ['1', '0', '0', '1', "m1 = a'b'c", "M1 = a+b+c'"],
          ['2', '0', '1', '0', "m2 = a'bc'", "M2 = a+b'+c"],
          ['3', '0', '1', '1', "m3 = a'bc", "M3 = a+b'+c'"],
          ['4', '1', '0', '0', "m4 = ab'c'", "M4 = a'+b+c"],
          ['5', '1', '0', '1', "m5 = ab'c", "M5 = a'+b+c'"],
          ['6', '1', '1', '0', 'm6 = abc\'', "M6 = a'+b'+c"],
          ['7', '1', '1', '1', 'm7 = abc', "M7 = a'+b'+c'"],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using the minterm complement rule for maxterms.',
        fix:
          'The rules are mirror images: minterm 1-bit -> plain variable; maxterm 0-bit -> plain variable. Muddle them and your POS implements f\' instead of f. Quick self-test: a maxterm must evaluate to 0 on its own row.',
      },
      {
        mistake: 'Assuming a different variable order when comparing minterm lists.',
        fix:
          'Index lists are meaningless without a declared bit order (which variable is the MSB). State it once per problem — here we use (a, b, c) with a as MSB — and never silently reorder.',
      },
      {
        mistake: 'Stopping at the canonical form as if it were the answer.',
        fix:
          'Canonical SOP/POS is the raw material, rarely the implementation. It guarantees correctness; minimization (algebra or K-maps) guarantees economy. Deliver the minimized form.',
      },
    ],
    guidedPractice: {
      title: 'Two forms from one truth table',
      brief:
        'A function f(a,b,c) is 1 on rows 2, 5 and 6. Write (a) the canonical SOP with minterm notation and in variables; (b) the canonical POS listing only the maxterm indices; (c) state the minterm list of f\'.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    int f[8] = {0};\n    f[2] = 1; f[5] = 1; f[6] = 1;   /* given ones */\n\n    printf("SOP minterms: ");\n    for (int m = 0; m < 8; m++)\n        if (f[m]) printf("m%d ", m);\n    printf("\\nPOS maxterms (f=0 rows): ");\n    for (int m = 0; m < 8; m++)\n        if (!f[m]) printf("M%d ", m);\n    printf("\\nf\' minterms = f=0 rows:    ");\n    for (int m = 0; m < 8; m++)\n        if (!f[m]) printf("m%d ", m);\n    printf("\\n");\n    return 0;\n}',
      expectedBehavior:
        "(a) f = m2 + m5 + m6 = a'bc' + ab'c + abc'. (b) f = ΠM(0, 1, 3, 4, 7) — the five rows where f = 0. (c) f' = Σm(0, 1, 3, 4, 7): the same index list as the POS, because minterms of f' are exactly the rows where f is 0.",
      hints: [
        'Row 2 = 010 -> a\'bc\'; row 5 = 101 -> ab\'c; row 6 = 110 -> abc\'.',
        'The POS list is simply the rows the SOP list misses.',
        'The program prints the three lists; its third line is the answer to (c).',
      ],
    },
    practiceExercises: [
      {
        title: 'Minterm inventory from an expression',
        brief:
          "Express g = ab + c as a sum of minterms for (a,b,c). First expand algebraically so every term contains all three variables, then list the minterm indices.",
        expectedBehavior:
          "ab = ab(c + c') = abc + abc'; c = (a + a')(b + b')c = abc + ab'c + a'bc + a'b'c. Union: g = Σm(1, 3, 5, 7) (a'b'c, a'bc, ab'c, abc). Check: g=1 whenever c=1, plus rows 6,7 (ab) — and indeed 6,7 have c=0... wait: rows with ab: 6 (110) and 7 (111); 7 is already counted. So g = Σm(1,3,5,6,7). Corrected: the union is {1,3,5,6,7}.",
        hints: [
          'Expand each term by multiplying by (x + x\') for each missing variable.',
          'Collect the union of row indices, removing duplicates.',
          'Verify with the original expression: c=1 gives rows 1,3,5,7; ab=1 gives rows 6,7 — union {1,3,5,6,7}.',
        ],
      },
      {
        title: 'POS by hand for a small function',
        brief:
          'For h(a,b) = 1 only on row 01 (a=0,b=1): write h as one minterm and as one maxterm product, then verify both forms on all 4 rows.',
        expectedBehavior:
          "h = m1 = a'b (SOP). h = ΠM(0, 2, 3) = (a + b)(a' + b)(a' + b'). Verification: row 01 -> m1=1; POS: (0+1)(1+1)(1+0) = 1*1*1 = 1. Rows 00, 10, 11 give 0 in both forms.",
        hints: [
          'One row of ones -> exactly one minterm.',
          'Three rows of zeros -> three maxterms ANDed.',
          'The maxterm for row 0 (00) keeps both variables plain: (a + b).',
        ],
      },
    ],
    assessment: {
      title: 'Canonical forms checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'short-answer',
          prompt: 'For variables (a,b,c) with a as MSB, write minterm m5 in variables. (Use \' for NOT, no spaces.)',
          answer: "ab'c",
          explanation: "Row 5 = 101: a=1 (plain), b=0 (complemented), c=1 (plain) -> ab'c.",
          hint: 'Bit 1 -> plain variable, bit 0 -> complemented.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'If f = Σm(1, 4, 7), what is f\'?',
          options: ['Σm(0, 2, 3, 5, 6)', 'Σm(1, 4, 7)', 'ΠM(0, 2, 3, 5, 6)', 'Σm(2, 4, 6)'],
          answer: 'Σm(0, 2, 3, 5, 6)',
          explanation: "f' is 1 exactly where f is 0 — the complementary row set.",
          hint: 'Which rows does the minterm list not cover?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In a maxterm, a variable appears complemented when its row bit is 1.',
          answer: 'true',
          explanation: 'Maxterm rule: 0-bit -> plain, 1-bit -> complemented — the mirror of the minterm rule, so the maxterm evaluates to 0 on its row.',
          hint: 'The maxterm must die on its own row.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'How many rows (and therefore how many potential minterms) does a 4-variable function have? (Number.)',
          answer: '16',
          explanation: '2^4 = 16 rows; a canonical SOP can have up to 16 minterms.',
          hint: '2^n.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'Why is canonical SOP described as "two-level logic"?',
          options: [
            'Every path from input to output passes through one AND then one OR',
            'It uses exactly two gates',
            'It works only for two variables',
            'It has two outputs',
          ],
          answer: 'Every path from input to output passes through one AND then one OR',
          explanation: 'The AND layer forms minterms; the single OR collects them. Two levels of gates — short depth, many wide gates.',
          hint: 'Count the layers of gates an input signal traverses.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Minterm', definition: 'An AND term containing every variable once, 1 on exactly one truth-table row; m_i for row i.' },
      { term: 'Maxterm', definition: 'An OR term containing every variable once, 0 on exactly one row; M_i for row i.' },
      { term: 'Sum of products (SOP)', definition: 'OR of AND terms; canonical when every term is a minterm.' },
      { term: 'Product of sums (POS)', definition: 'AND of OR terms; canonical when every term is a maxterm.' },
      { term: "Don't care", definition: 'A truth-table row whose output is unspecified; usable (but not required) in minimization.' },
      { term: 'Two-level logic', definition: 'A network with exactly two layers of gates (e.g. AND-OR); canonical SOP/POS structure.' },
    ],
    revisionSummary: [
      'Minterm rule: 1-bit -> plain, 0-bit -> complemented. Maxterm rule: the mirror.',
      "Canonical SOP = Σm(rows where f=1); canonical POS = ΠM(rows where f=0).",
      "Σm(A) and ΠM(complement of A) describe the same function; f' swaps the lists.",
      'Every canonical term contains ALL variables — that is what makes it canonical.',
      'Canonical forms are correct but rarely minimal; minimization comes next.',
      'Declare the variable order (which input is the MSB) before using minterm numbers.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Canonical normal form (Boolean algebra)', url: 'https://en.wikipedia.org/wiki/Canonical_normal_form', kind: 'article' },
      { label: 'Electronics Tutorials — Sum of products and product of sums', url: 'https://www.electronics-tutorials.ws/boolean/sum-of-products-and-product-of-sums.html', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'de-m04-l03',
    title: 'Karnaugh Maps: 2 and 3 Variables',
    summary:
      'The visual minimizer: gray-code cell ordering, adjacency (including wrap-around), grouping rules, and worked 2- and 3-variable minimizations.',
    objectives: [
      'Draw a correctly ordered 2- and 3-variable K-map and place every 1.',
      'Group adjacent 1s in powers of two (1, 2, 4, 8) and read each group as a product term.',
      'Use wrap-around adjacency across map edges.',
      'Choose a minimal cover: fewest groups, each as large as possible.',
    ],
    whyItMatters:
      'K-maps turn minimization from algebraic archaeology into a picture you can scan in seconds. The same skill, scaled up, is what logic compilers do with Quine-McCluskey and espresso heuristics. Every gate you save in Module 5\'s datapath blocks is a K-map win, and "find the biggest rectangles" reappears in FPGA resource budgeting.',
    prerequisites: ['de-m04-l02'],
    explanation:
      'A **Karnaugh map** (K-map) is the truth table redrawn so that physically adjacent cells differ in exactly one input bit — the rows are ordered in **Gray code** (00, 01, 11, 10), not binary. Why that matters: if two adjacent rows differ in one variable, their minterms combine and that variable drops out (`ab + ab\' = a`). The map makes every such pairing visible as two neighboring cells.\n\n### Layout and grouping rules\n\nA 3-variable map (a = row, bc = columns in Gray order):\n\n```\n            bc=00  bc=01  bc=11  bc=10\n      a=0  |  m0  |  m1  |  m3  |  m2  |\n      a=1  |  m4  |  m5  |  m7  |  m6  |\n```\n\nRules for grouping 1s:\n\n1. Groups must be rectangles of 1, 2, 4, 8, ... cells (powers of two).\n2. Groups may **wrap around** the edges (left-right and top-bottom are adjacent).\n3. Groups may overlap; overlapping is normal and helpful.\n4. Make each group **as large as possible**; use **as few groups as possible**.\n5. Every 1 must be in at least one group; don\'t cares may join groups but need no coverage.\n\nReading a group: keep only the variables that are *constant* across the group; drop the ones that change. A 1-cell group keeps all variables (a full minterm); a 2-group drops one variable; a 4-group drops two; an 8-group drops three.\n\n### Worked 3-variable minimization\n\nf = Σm(1, 3, 5, 7):\n\n```\n            bc=00  bc=01  bc=11  bc=10\n      a=0  |   0  |   1  |   1  |   0  |\n      a=1  |   0  |   1  |   1  |   0  |\n```\n\nThe four 1s form one 4-group spanning both rows in columns 01 and 11: across it, a changes (drop a), b stays 0... wait — columns 01 and 11 have b=0 and b=1, c=1 in both. Constants: c = 1. So **f = c**. One wire. The canonical SOP would have been four 3-input ANDs; the map saw it instantly.\n\nSecond example, f = Σm(1, 3, 5, 6, 7):\n\n```\n            bc=00  bc=01  bc=11  bc=10\n      a=0  |   0  |   1  |   1  |   0  |\n      a=1  |   0  |   1  |   1  |   1  |\n```\n\n- Group A: the four cells (0,1),(0,3),(1,1),(1,3) -> c.\n- Group B: m7 + m6 (row a=1, columns 11 and 10) -> ab (a=1, b=1, c changes).\n\n**f = c + ab**. Three gates instead of five 3-input ANDs plus a 5-input OR.\n\n### Wrap-around\n\nIn f = Σm(0, 2, 4, 6) the 1s sit in columns 00 and 10 of both rows — the *outer* columns. They are adjacent through the left/right edge wrap: one 4-group with c = 0 constant -> **f = c\'**.',
    deepDive:
      '### Why Gray ordering is the whole trick\n\nAdjacent Gray-code cells differ in exactly one bit, which is precisely the condition for x·y + x·y\' = x. In binary-ordered columns (00, 01, 10, 11), the pair 01-10 differs in two bits and cannot merge — the map would hide half the simplifications. Gray order guarantees that *every* 2^k rectangle on the map is a legal group whose term keeps only the constant variables. The same Gray-code idea returns in Module 8 for state encodings that minimize switching, and in rotary encoders.\n\n### Minimal cover as a covering problem\n\nChoosing groups is a set-cover problem: find fewest largest rectangles touching all 1s. Two symptoms of a non-minimal cover: a group whose every 1 is already covered by others (delete it), and two half-sized groups that could merge into one (enlarge). Prime implicants — groups that cannot grow — are the candidates; essential prime implicants (covering a 1 that nothing else covers) must be in every answer. For 5+ variables, maps become layered and error-prone, which is when tabular methods (Quine-McCluskey) or tool-based logic optimization take over — the exact boundary between this course and EDA practice.',
    examples: [
      {
        title: 'A 3-variable minimization checked by exhaustive sweep',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    /* f = SUM m(1,3,5,7); claimed minimal form: f = c */\n    int ones[8] = {0, 1, 0, 1, 0, 1, 0, 1};\n\n    int ok = 1;\n    for (int m = 0; m < 8; m++) {\n        int a = (m >> 2) & 1;\n        int b = (m >> 1) & 1;\n        int c = m & 1;\n\n        int canonical = ones[m];\n        int minimized = c;              /* the K-map result */\n        if (canonical != minimized) ok = 0;\n\n        printf("row %d (%d%d%d): f=%d  minimized=%d\\n",\n               m, a, b, c, canonical, minimized);\n    }\n    printf("f = c matches on all 8 rows: %s\\n", ok ? "YES" : "NO");\n    return 0;\n}',
        explanation: [
          'The `ones` array is the specification from the minterm list; `minimized` is the K-map\'s answer, one wire wide.',
          'Every row must agree — the same perfect-induction proof style as Lesson 1, now applied to a *minimized* form.',
          'Looking down the printed column pairs: f = 1 exactly when c = 1, which is the visual conclusion the 4-group encoded.',
          'Swap in the second example (minterms 1,3,5,6,7, minimal c + ab) and re-run: the harness barely changes — reuse your verification rigs.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Grouping anatomy on a 3-variable map',
        content:
          '  f = SUM m(1,3,5,6,7)\n\n              bc=00   bc=01   bc=11   bc=10\n          +-------+-------+-------+-------+\n    a=0   |   0   |   1   |   1   |   0   |   m0  m1  m3  m2\n          +-------+-------+-------+-------+\n    a=1   |   0   |   1   |   1   |   1   |   m4  m5  m7  m6\n          +-------+-------+-------+-------+\n\n    group A (4 cells: m1,m3,m5,m7)  -> columns 01 & 11 both rows\n         a changes (drop), b changes (drop), c=1 stays  ->  term c\n\n    group B (2 cells: m7,m6)        -> row a=1, columns 11 & 10\n         a=1 stays, b=1 stays, c changes (drop)         ->  term ab\n\n    result:  f = c + ab\n\n    wrap-around reminder: column 00 and column 10 are adjacent\n    (left edge touches right edge).',
        caption:
          'Two groups, two terms: the 4-group keeps only c, the 2-group keeps ab.',
      },
    ],
    tables: [
      {
        caption: 'Group size vs term width (3 variables)',
        headers: ['Group size', 'Variables dropped', 'Variables kept', 'Example term'],
        rows: [
          ['1 cell', '0', '3 (all)', "a'bc'"],
          ['2 cells', '1', '2', "bc'"],
          ['4 cells', '2', '1', 'c'],
          ['8 cells', '3', '0 (constant 1)', '1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing the columns in binary order (00, 01, 10, 11).',
        fix:
          'K-map columns (and rows) must be in Gray order: 00, 01, 11, 10. Binary order breaks adjacency and hides mergeable pairs. Check your header before placing a single 1.',
      },
      {
        mistake: 'Grouping cells that merely look adjacent in binary order, like m2 (010) with m5 (101).',
        fix:
          'Two cells are groupable only if their row numbers differ in exactly one bit. 010 vs 101 differ in three — never groupable. Convert to map coordinates and check visually.',
      },
      {
        mistake: 'Forgetting edge wrap-around, leaving four corner 1s as four separate terms.',
        fix:
          'Left-right edges and top-bottom edges are adjacent (the map is a torus). Four corners of a 4-variable map form one legal 4-group. Before finalizing, always re-scan the borders for missed wraps.',
      },
    ],
    guidedPractice: {
      title: 'Minimize a 3-variable function end to end',
      brief:
        'f(a,b,c) = Σm(0, 1, 4, 5). Draw the map (a as row), find the groups, write the minimal SOP, and state how many gates the 2-level implementation needs versus the canonical form.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    /* f = SUM m(0,1,4,5); your claimed minimal form goes here */\n    int ones[8] = {1, 1, 0, 0, 1, 1, 0, 0};\n    int ok = 1;\n    for (int m = 0; m < 8; m++) {\n        int b = (m >> 1) & 1;   /* inspect the map: which variable is constant? */\n        int minimized = !b;     /* TODO replace with your K-map result */\n        if (ones[m] != minimized) ok = 0;\n    }\n    printf("minimized form matches: %s\\n", ok ? "YES" : "NO");\n    return 0;\n}',
      expectedBehavior:
        'Map: rows a=0 and a=1, columns bc = 00 and 01 all contain 1 (m0,m1,m4,m5). One 4-group: a changes (drop), c changes (drop), b = 0 constant -> f = b\'. Canonical needs four 3-input ANDs + 4-input OR; minimal needs one inverter. The verification loop prints YES.',
      hints: [
        'Rows 0,1,4,5 in binary: 000, 001, 100, 101 — b=0 in every one.',
        'The whole map is just the b=0 half: one variable of logic.',
        'Replace the TODO with your term and confirm the loop prints YES.',
      ],
    },
    practiceExercises: [
      {
        title: 'Corners and wrap-around',
        brief:
          'g(a,b,c) = Σm(0, 2, 4, 6). Draw the map, use edge wrap-around, and give the minimal SOP. Then verify with an 8-row sweep.',
        expectedBehavior: "The 1s occupy columns 00 and 10 in both rows; wrapping left-right merges them into one 4-group with c=0 constant -> g = c'. All even rows are 1: the sweep of g = !c prints agreement.",
        hints: [
          'Rows 0,2,4,6 are exactly the rows with c=0.',
          'Columns 00 and 10 touch through the wrap.',
          'One 4-group, one variable kept, one inverter built.',
        ],
      },
      {
        title: 'Two covers, pick the minimal',
        brief:
          "h(a,b,c) = Σm(2, 3, 6, 7). Two students propose: (i) two 2-groups -> a'c' terms... write the minimal SOP yourself, state the group sizes, and explain why h is independent of a.",
        expectedBehavior:
          "Rows 2,3,6,7 = 010, 011, 110, 111: b=1 in all, a and c vary freely -> h = b. One 4-group; a is dropped because the group spans both a rows; c is dropped because the group spans both c columns. Any answer with more than one group (e.g. two 2-groups) is legal but not minimal.",
        hints: [
          'List the four rows in binary and look for the constant column.',
          'A 4-group drops two variables.',
          'Independence from a means rows with a=0 and a=1 behave identically — check the minterm list.',
        ],
      },
    ],
    assessment: {
      title: 'K-maps (2-3 variables) checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why are K-map columns ordered 00, 01, 11, 10?',
          options: [
            'So adjacent cells differ in exactly one variable, making minterms mergeable',
            'To fit more cells per row',
            'It is the binary order of the row numbers',
            'Random — any order works',
          ],
          answer: 'So adjacent cells differ in exactly one variable, making minterms mergeable',
          explanation:
            'Gray-code ordering guarantees neighbors differ in one bit, so each adjacency is a legal application of ab + ab\' = a.',
          hint: 'What property must two merged minterms have?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'short-answer',
          prompt: 'A 4-cell group on a 3-variable map keeps how many variables in its term? (Number.)',
          answer: '1',
          explanation: 'A 4-group drops 3 - 1 = 2 variables (it spans two values of two variables), keeping only the constant one.',
          hint: 'Each doubling of group size drops one variable.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'For f = Σm(1,3,5,7), what does the single 4-group read as?',
          options: ['c', "c'", 'b', 'a'],
          answer: 'c',
          explanation: 'The 1s occupy columns 01 and 11 (both c=1) across both rows; a and b both change and are dropped; c stays 1.',
          hint: 'Which column bit is constant in columns 01 and 11?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'Two cells whose row numbers differ in exactly one bit can always be grouped together on the K-map.',
          answer: 'true',
          explanation:
            'One-bit difference is exactly the adjacency condition; on the map they end up physically adjacent (possibly through a wrap-around edge).',
          hint: 'Count the differing bits.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'For h = Σm(2,3,6,7), the minimal SOP is:',
          options: ['b', "b'", 'a + c', 'bc'],
          answer: 'b',
          explanation: 'All four minterms have b=1 with a and c varying — one 4-group keeping only b.',
          hint: 'Write the four row numbers in binary and compare columns.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Karnaugh map', definition: 'A truth table arranged so adjacent cells differ in one variable, enabling visual minimization.' },
      { term: 'Gray code', definition: 'An ordering of binary values where successive entries differ in exactly one bit; the K-map\'s axis order.' },
      { term: 'Adjacency (wrap-around)', definition: 'Edge cells of the map are neighbors across the boundary; the map is logically a torus.' },
      { term: 'Group (implicant)', definition: 'A rectangle of 2^k adjacent 1s read as a product of the constant variables.' },
      { term: 'Minimal cover', definition: 'A set of groups covering all 1s with the fewest, largest groups.' },
      { term: 'Prime implicant', definition: 'A group that cannot be enlarged; essential if it alone covers some 1.' },
    ],
    revisionSummary: [
      'Draw axes in Gray order: 00, 01, 11, 10 — before anything else.',
      'Groups: rectangles of 1, 2, 4, 8 cells; wrap-around edges count; overlap allowed.',
      'Read a group by dropping every variable that changes; keep constants.',
      'Minimality: fewest groups, each largest; delete redundant groups.',
      'One-bit row difference = groupable; two or more = never.',
      'Verify every minimized result against the original with an exhaustive sweep.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Karnaugh map', url: 'https://en.wikipedia.org/wiki/Karnaugh_map', kind: 'article' },
      { label: 'Electronics Tutorials — Karnaugh maps', url: 'https://www.electronics-tutorials.ws/boolean/karnaugh-maps.html', kind: 'article' },
      { label: 'All About Circuits — Karnaugh maps', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-8/introduction-to-karnaugh-mapping/', kind: 'docs' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'de-m04-l04',
    title: "Four-Variable K-Maps, Don't Cares, and Worked Minimizations",
    summary:
      'The full 4-variable map, minimal SOP and POS from the same map, don\'t-care exploitation on a realistic BCD problem, and two complete worked designs from specification to gates.',
    objectives: [
      'Construct and read a 4-variable K-map including wrap-around groups.',
      'Exploit don\'t cares to shrink logic without ever covering a 0.',
      'Extract a minimal POS from the zeros of the map.',
      'Carry two real functions (XNOR pattern, BCD threshold) from minterm list to minimal gates.',
    ],
    whyItMatters:
      'Four inputs is the sweet spot where K-maps remain visual but the savings become dramatic — and it is the largest map most engineers ever draw by hand. The don\'t-care technique here is used verbatim in Module 5\'s BCD displays and decoder designs, and the habit of checking both SOP and POS often halves a circuit.',
    prerequisites: ['de-m04-l03'],
    explanation:
      'A 4-variable map has both axes in Gray order:\n\n```\n              cd=00   cd=01   cd=11   cd=10\n        ab=00 |  m0   |  m1   |  m3   |  m2  |\n        ab=01 |  m4   |  m5   |  m7   |  m6  |\n        ab=11 |  m12  |  m13  |  m15  |  m14 |\n        ab=10 |  m8   |  m9   |  m11  |  m10 |\n```\n\nAll the 3-variable rules hold, plus: rows 00 and 10 are adjacent (top-bottom wrap), and 16 cells mean groups up to 8 (drop 3 variables) and 16 (constant 1).\n\n### Worked example 1: the XNOR pattern\n\nf = Σm(0, 2, 5, 7, 8, 10, 13, 15):\n\n```\n              cd=00   cd=01   cd=11   cd=10\n        ab=00 |   1   |   0   |   0   |   1  |\n        ab=01 |   0   |   1   |   1   |   0  |\n        ab=11 |   0   |   1   |   1   |   0  |\n        ab=10 |   1   |   0   |   0   |   1  |\n```\n\n- Group A: the four *corners* (m0, m2, m8, m10) — top-bottom wrap plus left-right wrap — constants b=0, d=0 -> term `b\'d\'`.\n- Group B: the central 4 (m5, m7, m13, m15) — constants b=1, d=1 -> term `bd`.\n\n**f = b\'d\' + bd**, which is b XNOR d: the function depends only on whether b and d match. Eight minterms, two 2-input terms, four gates.\n\n### Don\'t cares\n\nA **don\'t care** cell (written X or d) is a row that cannot occur or is never observed. In grouping, you *may* treat it as 1 (if it enlarges a group) or as 0 (if it would force a useless group) — but you must never leave a real 1 uncovered and never cover a real 0.\n\nRealistic case: inputs are BCD digits (0000-1001), so rows 10-15 (1010-1111) never occur. Design f = 1 when the digit is 5 or more:\n\n```\n  f = Σm(5,6,7,8,9) + d(10,11,12,13,14,15)\n\n              cd=00   cd=01   cd=11   cd=10\n        ab=00 |   0   |   0   |   0   |   0  |\n        ab=01 |   0   |   1   |   1   |   1  |   m5 m7 m6\n        ab=11 |   X   |   X   |   X   |   X  |\n        ab=10 |   1   |   1   |   X   |   X  |   m8 m9, then d d\n```\n\n- The whole bottom half (rows ab=11 and ab=10) is 1s and Xs -> one 8-group -> term `a`.\n- m5, m7 + Xs at m13, m15 -> `bd`.\n- m6, m7 + Xs at m14, m15 -> `bc`.\n\n**f = a + bd + bc**. Without the don\'t cares the best cover would need extra literals; the Xs absorbed three groups into the map\'s free real estate.\n\n### Minimal POS from the zeros\n\nThe same map minimized over the *0s* gives a product of sums: group the zeros (Xs may join), read each group as a sum term (complement the constants), AND the terms. POS wins when zeros are sparse — the dual of SOP logic. Compare both covers on any design; the loser still costs you a full inverter layer if you pick it blindly.',
    deepDive:
      '### SOP vs POS: read the sparsity\n\nA rule of thumb with proof behind it: if fewer than half the cells are 1, SOP usually wins; if fewer than half are 0, POS usually wins. The reason is group economics — each term covers 2^k cells, and you want few terms. Datasheets frequently specify active-low outputs precisely so the POS form (few zeros) becomes the cheap implementation. When a later course asks for "cheapest implementation", the honest first step is drawing the map and counting, not guessing.\n\n### Beyond four variables\n\nFive-variable maps are two 16-cell layers (one per value of the fifth variable) with vertical adjacency between layers; six variables make four layers. Past that, the Quine-McCluskey algorithm (tabular, exhaustive, exact) and heuristic tools like espresso do the same covering problem programmatically. Synthesis tools run these inside seconds on functions of hundreds of variables — but their *quality metric* (literal count, then depth) is exactly what you are learning to see by hand. Manual skill on 4 variables is what lets you sanity-check a tool result, and interviewers know it.',
    examples: [
      {
        title: 'Verifying the BCD threshold function including don\'t cares',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    /* f = 1 for BCD digits 5..9; rows 10..15 are don\'t cares.\n       Claimed minimal form: f = a + b*d + b*c */\n    int ok = 1;\n    for (int m = 0; m < 16; m++) {\n        int a = (m >> 3) & 1;\n        int b = (m >> 2) & 1;\n        int c = (m >> 1) & 1;\n        int d = m & 1;\n\n        int f_min = a | (b & d) | (b & c);\n\n        if (m < 10) {\n            int f_spec = (m >= 5) ? 1 : 0;   /* the actual requirement */\n            if (f_min != f_spec) {\n                ok = 0;\n                printf("MISMATCH at %d: min=%d spec=%d\\n", m, f_min, f_spec);\n            }\n        }\n        /* rows 10..15: don\'t cares — any behavior accepted */\n    }\n    printf("f = a + bd + bc satisfies the spec on all valid rows: %s\\n",\n           ok ? "YES" : "NO");\n    return 0;\n}',
        explanation: [
          'The loop checks only rows 0-9, because the spec only *defines* rows 0-9 — exactly how don\'t cares work in verification, too.',
          'For each valid digit, `f_spec` is the requirement (5 or more) and `f_min` is the K-map result with its X-assisted groups.',
          'Spot-check the boundary rows: digit 4 (0100): a=0, bd=0, bc=0 -> 0, correct; digit 5 (0101): bd=1 -> 1, correct.',
          'Rows 10-15 are skipped without complaint: the implementation may output anything there, and the 8-group on `a` quietly relies on that freedom.',
          'If the input could ever leave BCD range, this circuit would misbehave on those rows — an assumption that must be documented, which the comment does.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'The two worked 4-variable maps side by side',
        content:
          '  EXAMPLE 1: f = SUM m(0,2,5,7,8,10,13,15)          XNOR pattern\n\n                cd=00   cd=01   cd=11   cd=10\n          ab=00 |   1   |   0   |   0   |   1  |   corners: m0 m2\n          ab=01 |   0   |   1   |   1   |   0  |\n          ab=11 |   0   |   1   |   1   |   0  |\n          ab=10 |   1   |   0   |   0   |   1  |   corners: m8 m10\n\n          group A = 4 corners (wraps both edges)   -> b\'d\'\n          group B = center 4 (m5,m7,m13,m15)       -> bd\n          f = b\'d\' + bd   =   b XNOR d\n\n  EXAMPLE 2: f = SUM m(5,6,7,8,9) + d(10..15)       BCD >= 5\n\n                cd=00   cd=01   cd=11   cd=10\n          ab=00 |   0   |   0   |   0   |   0  |\n          ab=01 |   0   |   1   |   1   |   1  |   m5 m7 m6\n          ab=11 |   X   |   X   |   X   |   X  |\n          ab=10 |   1   |   1   |   X   |   X  |   m8 m9 + d d\n\n          8-group (both bottom rows, all columns) -> a\n          4-group (m5,m7,m13,m15)                 -> bd\n          4-group (m6,m7,m14,m15)                 -> bc\n          f = a + bd + bc',
        caption:
          'Wrap-around groups in example 1; don\'t-care absorption in example 2.',
      },
    ],
    tables: [
      {
        caption: "Truth table for the BCD >= 5 function (f and don't cares)",
        headers: ['Digit', 'a b c d', 'f'],
        rows: [
          ['0', '0000', '0'],
          ['1', '0001', '0'],
          ['2', '0010', '0'],
          ['3', '0011', '0'],
          ['4', '0100', '0'],
          ['5', '0101', '1'],
          ['6', '0110', '1'],
          ['7', '0111', '1'],
          ['8', '1000', '1'],
          ['9', '1001', '1'],
          ['10-15', '1010..1111', "X (don't care)"],
        ],
      },
      {
        caption: 'Minimal cover summary for both examples',
        headers: ['Function', 'Groups', 'Minimal SOP', 'Gate estimate (2-level)'],
        rows: [
          ['XNOR pattern', '2 four-groups (corners via wrap, center)', "b'd' + bd", '2 AND + 1 OR + 2 inverters'],
          ['BCD >= 5', '1 eight-group + 2 four-groups (X-assisted)', 'a + bd + bc', '3 AND + 2 OR + 1 inverter'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Covering a don\'t care with its own dedicated group.',
        fix:
          'Don\'t cares need no coverage — they are not real 1s. Adding a group *just* for an X adds gates for behavior nobody specified. Use Xs only to enlarge groups that already contain real 1s.',
      },
      {
        mistake: 'Treating the row order 00, 01, 10, 11 as correct for 4-variable rows.',
        fix:
          'Both axes must be Gray: 00, 01, 11, 10. The ab axis especially tempts errors because 10 sits *below* 11. Write the header carefully and double-check that neighboring row labels differ in one bit.',
      },
      {
        mistake: 'Forgetting top-bottom wrap in 4-variable maps (rows 00 and 10).',
        fix:
          'Row ab=00 and row ab=10 are adjacent (they differ only in a). The corner-group in example 1 depends on it — without wrap you would pay four 2-groups instead of one 4-group.',
      },
    ],
    guidedPractice: {
      title: 'A complete 4-variable design with a don\'t care',
      brief:
        'A 4-bit value is guaranteed to be even (LSB d = 0 always), making all odd rows don\'t cares. Design g = 1 when the value is 8 or more: g = Σm(8,10,12,14) + d(1,3,5,7,9,11,13,15). Minimize and verify.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    int ok = 1;\n    for (int m = 0; m < 16; m += 2) {   /* even values only are valid */\n        int a = (m >> 3) & 1;\n        int g_min = a;                   /* TODO: your K-map result */\n        int g_spec = (m >= 8) ? 1 : 0;\n        if (g_min != g_spec) ok = 0;\n    }\n    printf("result matches on all even rows: %s\\n", ok ? "YES" : "NO");\n    return 0;\n}',
      expectedBehavior:
        "On even rows, d=0 kills both bd and bc terms, and odd rows are don't cares, so the 8-group of all a=1 cells gives g = a. The loop prints YES: for even m, a = (m >= 8). One wire implements the whole comparator because the don't cares absorbed everything else.",
      hints: [
        'Fill the map: 1s at rows 8,10,12,14 (a=1, d=0); Xs on every odd row.',
        'Can the a=1 half become one group even though two of its cells are 1s and two are... check which cells are X vs 1 on even rows.',
        'Replace the TODO with a and confirm.',
      ],
    },
    practiceExercises: [
      {
        title: 'Minimal POS practice',
        brief:
          "For p(a,b,c,d) = Σm(0, 1, 4, 5) (zeros elsewhere, no don't cares): find the minimal SOP, then the minimal POS by grouping zeros, and state which is cheaper.",
        expectedBehavior:
          "SOP: the 1s (rows 0,1,4,5) form one 4-group with a=0 and c=0 constant -> p = a'c' (one term, two literals). POS: group the zeros as an 8-group (rows 8-15, a=1) giving the sum term (a'), and a 4-group (rows 2,3,6,7, a=0 and c=1) giving the sum term (a + c'); so p = a'(a + c'). The SOP is cheaper here: one AND gate plus two inverters versus two gates plus an inverter.",
        hints: [
          'Mark the map first; the 1s cluster in the top-left block (a=0, c=0).',
          'For POS, group the zeros in as few, as large rectangles as possible and complement the read-off constants.',
          'Count total literals of both answers before deciding the winner.',
        ],
      },
      {
        title: 'Seven-segment slice',
        brief:
          "One segment of a 7-segment BCD display is on for digits 0, 2, 6, 8 and off otherwise; rows 10-15 are don't cares. Write the minterm + don't-care list and minimize for that segment.",
        expectedBehavior:
          "e-type segment: f = Σm(0,2,6,8) + d(10,11,12,13,14,15). A good cover: m0, m2, m8, m10(X) -> b'd'; m2, m6 + m14(X), m10(X) -> cd'; giving f = b'd' + cd'. Any cover of 0,2,6,8 using at most two groups with X assistance is acceptable if it never covers a 0.",
        hints: [
          'Place 1s at 0, 2, 6, 8 and Xs at 10-15 before grouping.',
          'm10 is an X adjacent to both m2 and m8 — use it twice.',
          'Count literals: your cover should beat the canonical 4 minterms by a wide margin.',
        ],
      },
    ],
    assessment: {
      title: '4-variable K-maps checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'The four corner cells of a 4-variable map (m0, m2, m8, m10) form how many legal groups at minimum?',
          options: ['One 4-group (using both edge wraps)', 'Two 2-groups', 'Four 1-groups', 'They cannot be grouped'],
          answer: 'One 4-group (using both edge wraps)',
          explanation:
            'Corners pair across left-right and top-bottom wraps simultaneously; all four differ only in b and d, giving b\'d\'.',
          hint: 'The map folds into a torus.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: "A don't-care cell must be included in at least one group.",
          answer: 'false',
          explanation:
            "Don't cares are optional: include an X only when it enlarges a group covering real 1s. Xs never require coverage.",
          hint: 'Who observes that row\'s output?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'short-answer',
          prompt: 'Write the minimal SOP found for f = Σm(0,2,5,7,8,10,13,15). (Use \' for NOT, + for OR, no spaces.)',
          answer: "b'd'+bd",
          explanation: 'Corners give b\'d\'; the center 4-group gives bd; together they express b XNOR d.',
          hint: 'Two 4-groups: corners and center.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'Using the BCD >= 5 implementation f = a + bd + bc, what is f for input 0111 (digit 7)?',
          code: 'int f = a | (b & d) | (b & c);   // a=0 b=1 c=1 d=1',
          options: ['0', '1', 'x', 'undefined'],
          answer: '1',
          explanation: 'a=0, but bd = 1*1 = 1 (and bc = 1), so f = 1 — digit 7 is indeed >= 5.',
          hint: 'Evaluate bd first.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'When is a minimal POS likely cheaper than a minimal SOP?',
          options: [
            'When the map has few 0s',
            'When the map has few 1s',
            'When there are no don\'t cares',
            'POS is always cheaper',
          ],
          answer: 'When the map has few 0s',
          explanation:
            'POS groups the zeros; sparse zeros mean few, large groups. SOP groups ones; sparse ones favor SOP.',
          hint: 'Each form groups one of the two symbols.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: "Don't care (X)", definition: 'A truth-table row that can never occur or is never observed; free to treat as 1 or 0 during grouping.' },
      { term: 'Wrap-around group', definition: 'A group that crosses map edges because opposite edges are adjacent.' },
      { term: 'Minimal SOP', definition: 'The fewest-largest-groups cover of the 1s, read as OR of product terms.' },
      { term: 'Minimal POS', definition: 'The fewest-largest-groups cover of the 0s, read as AND of sum terms.' },
      { term: 'Quine-McCluskey', definition: 'The tabular, exhaustive minimization algorithm used for many-variable functions and by tools.' },
    ],
    revisionSummary: [
      '4-variable layout: both axes Gray (00, 01, 11, 10); rows 00 and 10 wrap.',
      'Corner groups use two wraps at once — always scan the borders twice.',
      "Don't cares: usable, never required; never cover a 0; document the assumption they encode.",
      'BCD >= 5 with Xs: f = a + bd + bc — the Xs collapsed a 6-gate problem to 3 terms.',
      'Check POS (group the zeros) whenever zeros look sparser than ones.',
      'Beyond 4 variables: layered maps or Quine-McCluskey; the hand skill is your tool sanity check.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Karnaugh map', url: 'https://en.wikipedia.org/wiki/Karnaugh_map', kind: 'article' },
      { label: 'Wikipedia — Quine-McCluskey algorithm', url: 'https://en.wikipedia.org/wiki/Quine%E2%80%93McCluskey_algorithm', kind: 'article' },
      { label: 'All About Circuits — Larger 5 & 6-variable Karnaugh maps', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-8/larger-5-6-variable-karnaugh-maps/', kind: 'docs' },
    ],
    estimatedMinutes: 50,
  },
];
