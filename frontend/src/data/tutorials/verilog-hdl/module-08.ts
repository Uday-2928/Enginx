import type { TutorialLesson } from '../types';

// Module 08 — Combinational Design
export const module08Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m08-l1',
    title: 'Multiplexers: The Full Design Walkthrough',
    summary:
      'Take one block — the 2:1 mux — through the complete professional flow: spec, truth table, RTL in two styles, testbench, expected results, mistakes, practice; then scale to 4:1.',
    objectives: [
      'Execute the 10-step design workflow on a 2:1 multiplexer.',
      'Implement muxes in dataflow and always styles and verify equivalence.',
      'Build a 4:1 mux from 2:1 stages and as a case statement.',
      'Predict mux outputs for every select/data combination.',
    ],
    whyItMatters:
      'The mux is the most frequent block in any design — every if, every case, every bus switch becomes muxes in silicon. Walking ONE block through the complete design flow (the same flow used for every block in this module) teaches the process, not just the artifact. The linked challenge lets you run your mux on the platform’s real Icarus Verilog evaluator.',
    prerequisites: ['vlog-m05-l3', 'vlog-m06-l2', 'vlog-m07-l3'],
    explanation:
      '**Step 1 — Specification.** A 2:1 multiplexer forwards one of two single-bit sources to one output under a select: when s=0 the output equals a; when s=1 it equals b. Data flows one direction; the select is a control signal; nothing is stored.\n\n**Step 2 — Truth table.**\n\n```\ns | a | b || y\n0 | 0 | 0 || 0      0 | 0 | 1 || 0\n0 | 1 | 0 || 1      0 | 1 | 1 || 1     (s=0: y follows a)\n1 | 0 | 0 || 0      1 | 0 | 1 || 1     (s=1: y follows b)\n1 | 1 | 0 || 0      1 | 1 | 1 || 1\n```\n\n**Step 3 — Equations.** Sum-of-products: y = s\'a + sb (the classic AND-OR form), or directly the conditional expression y = s ? b : a.\n\n**Step 4 — RTL, both styles** (Example 1 below). **Step 5 — Testbench** sweeping all eight rows (Example 2). **Step 6 — Expected results**: y tracks a when s=0 and b when s=1 — the printed table must match the truth table exactly. **Step 7 — Common mistakes** (see below): the && vs & mux, unreplicated selects on buses, and width drift. **Step 8 — Practice**: guided and free exercises, including the linked platform challenge.\n\nScaling to a **4:1 mux** is mechanical: nested conditionals (two mux levels), a case on the select, or three 2:1 cells in a tree. At 8:1 and beyond, the case form stays readable while conditional chains get unwieldy — and a variable part-select `d[sel]` (module 03) collapses the whole structure into one line when the inputs form a vector.',
    deepDive:
      '### Where the muxes actually are\n\nAn if/else chain is a priority mux chain; a case is a wide mux; a variable index is a mux; the conditional operator is a mux. After synthesis, a modest CPU contains thousands of them. Two practical consequences: (1) timing paths through mux trees dominate combinational delay — a 32:1 select path is 5 mux levels deep; (2) coding style changes WHERE muxes appear but not WHETHER they do — you are choosing mux topology, not mux existence. The engineer’s job is picking the topology with the shortest critical path: e.g. selecting early (narrow muxes, more stages) vs selecting late (wide muxes, fewer stages).\n\n### The always @* mux with case\n\nThe case form is the professional default for 4:1 and up:\n\n```\nalways @* begin\n    case (s)\n        2\'b00: y = d[0];\n        2\'b01: y = d[1];\n        2\'b10: y = d[2];\n        2\'b11: y = d[3];\n        default: y = 1\'b0;   // unreachable but mandatory style\n    endcase\nend\n```\n\nEvery arm assigns y; the default keeps the statement complete (module 15). Synthesis produces a 4:1 mux — typically identical to the conditional-operator version. Choose per project convention and stay consistent.\n\n### The bus version, done right\n\nA 2:1 BUS mux (8-bit a, b) must not use the 1-bit AND-OR form: `y = (s & b) | (~s & a)` zero-extends s, masking only bit 0. Either the conditional operator (width-agnostic) or replication: `y = ({8{s}} & b) | ({8{~s}} & a);`. This single line — the replication mask — is one of the most reused idioms in RTL.',
    examples: [
      {
        title: 'The complete 2:1 mux: both RTL styles',
        language: 'verilog',
        code:
          '// mux2_cond.v — STYLE 1: conditional operator (dataflow)\nmodule mux2_cond(\n    input  wire a,     // selected when s = 0\n    input  wire b,     // selected when s = 1\n    input  wire s,\n    output wire y\n);\n    assign y = s ? b : a;\nendmodule\n\n// mux2_ao.v — STYLE 2: AND-OR form (the sum-of-products equation)\nmodule mux2_ao(\n    input  wire a,\n    input  wire b,\n    input  wire s,\n    output wire y\n);\n    // y = s\'a + sb, spelled with bitwise operators (1-bit exact):\n    assign y = (~s & a) | (s & b);\nendmodule\n\n// mux2_always.v — STYLE 3: combinational always with if/else\nmodule mux2_always(\n    input  wire a,\n    input  wire b,\n    input  wire s,\n    output reg  y       // reg: procedural target (still just a mux)\n);\n    always @* begin\n        if (s) y = b;\n        else   y = a;\n    end\nendmodule',
        explanation: [
          'STYLE 1: the canonical dataflow mux — one line, any width, reads as the spec. Preferred default.',
          'STYLE 2: the literal sum-of-products from the truth table: (~s & a) passes a when s=0; (s & b) passes b when s=1; the OR merges the (mutually exclusive) winners.',
          'STYLE 3: procedural form — if/else here is NOT priority logic (two mutually exclusive conditions), so it synthesizes to the same single mux.',
          'All three styles are functionally identical on every truth-table row; y in STYLE 3 is a reg only because the always block assigns it (module 03).',
          'For 8-bit buses: STYLE 1 unchanged; STYLE 2 becomes assign y = ({8{s}} & b) | ({8{~s}} & a);.',
        ],
      },
      {
        title: 'Exhaustive testbench and expected results',
        language: 'verilog',
        code:
          '// tb_mux2.v — SIM-ONLY: sweep all 8 truth-table rows\n`timescale 1ns/1ps\nmodule tb_mux2;\n    reg  a, b, s;\n    wire y;\n    integer i;\n\n    mux2_cond dut (.a(a), .b(b), .s(s), .y(y));\n\n    initial begin\n        for (i = 0; i < 8; i = i + 1) begin\n            {s, a, b} = i[2:0];   // unpack: s is the MSB of the loop vector\n            #1;\n            $display("s=%b a=%b b=%b y=%b", s, a, b, y);\n        end\n        $finish;\n    end\nendmodule',
        explanation: [
          'The loop enumerates i = 0..7; the concatenation unpacks it as {s, a, b} — s gets the most significant bit of each 3-bit pattern.',
          '#1 settles the combinational cloud before each display (the module 01/05 habit).',
          'Expected printed table (derived from y = s ? b : a): s=0 rows show y=a — (0,0,0)→0, (0,0,1)→0, (0,1,0)→1, (0,1,1)→1. s=1 rows show y=b — (1,0,0)→0, (1,0,1)→1, (1,1,0)→0, (1,1,1)→1.',
          'Every row matches the truth table from Step 2 — the workflow closes with verification, not assumption.',
          'Run the linked challenge to execute this module under the platform’s real iverilog evaluator with its own harness.',
        ],
      },
      {
        title: 'The 4:1 mux: three spellings, one circuit',
        language: 'verilog',
        code:
          '// mux4_tree.v — nested conditionals (two mux levels)\nmodule mux4_tree(\n    input  wire [3:0] d,\n    input  wire [1:0] s,\n    output wire       y\n);\n    assign y = s[1] ? (s[0] ? d[3] : d[2])\n                    : (s[0] ? d[1] : d[0]);\nendmodule\n\n// mux4_case.v — the readable professional form\nmodule mux4_case(\n    input  wire [3:0] d,\n    input  wire [1:0] s,\n    output reg        y\n);\n    always @* begin\n        case (s)\n            2\'b00:   y = d[0];\n            2\'b01:   y = d[1];\n            2\'b10:   y = d[2];\n            2\'b11:   y = d[3];\n            default: y = 1\'b0;    // complete by construction\n        endcase\n    end\nendmodule',
        explanation: [
          'Tree form: the outer s[1] picks the pair, the inner s[0] picks within the pair — literally a tree of two 2:1 mux levels.',
          'Case form: one flat statement, one arm per select value, default present. Synthesizes to the same 4:1 mux as the tree.',
          'Selection map (both versions): 00→d[0], 01→d[1], 10→d[2], 11→d[3]. Trace s=2\'b10, d=4\'b0110 → y = d[2] = 1.',
          'Beyond 4:1 the case form stays readable while the conditional chain doubles per level — this is why real designs switch to case (or variable part-select) at width 8.',
          'A vector-input shortcut exists when the sources form one bus: assign y = d[s]; — the variable bit-select of module 03 IS an 4:1 (here 4-bit) mux.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The 2:1 mux and the 4:1 tree',
        content:
          '  2:1 MUX\n              +-----------+\n   a --------| 0         |\n             |          [Y]---- y\n   b --------| 1         |\n             +-----------+\n                   ^\n                   s        (s=0 -> a, s=1 -> b)\n\n  4:1 TREE (what mux4_tree builds)\n\n   d[0] --[mux2]--\\\n   d[1] --[mux2]--+--[mux2]-- y      selects: outer s[1], inner s[0]\n   d[2] --[mux2]--/\n   d[3] --[mux2]-\'',
        caption:
          'Every wide mux is a tree of 2:1 cells; the case statement is the readable source form of the same structure.',
      },
    ],
    tables: [
      {
        caption: '2:1 mux complete truth table (Step 2)',
        headers: ['s', 'a', 'b', 'y'],
        rows: [
          ['0', '0', '0', '0'],
          ['0', '0', '1', '0'],
          ['0', '1', '0', '1'],
          ['0', '1', '1', '1'],
          ['1', '0', '0', '0'],
          ['1', '0', '1', '1'],
          ['1', '1', '0', '0'],
          ['1', '1', '1', '1'],
        ],
      },
      {
        caption: 'Expected testbench output rows (Step 6)',
        headers: ['Printed row', 'Meaning'],
        rows: [
          ['s=0 a=0 b=0 y=0', 's=0: y follows a'],
          ['s=0 a=1 b=0 y=1', 's=0: y follows a'],
          ['s=1 a=0 b=1 y=1', 's=1: y follows b'],
          ['s=1 a=1 b=0 y=0', 's=1: y follows b'],
        ],
      },
      {
        caption: 'mux4 selection map',
        headers: ['s[1:0]', 'y'],
        rows: [
          ['00', 'd[0]'],
          ['01', 'd[1]'],
          ['10', 'd[2]'],
          ['11', 'd[3]'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Building the bus mux as (s & b) | (~s & a) without replicating the select.',
        fix:
          'The 1-bit s masks only bit 0 after zero-extension. Use the conditional operator (width-agnostic) or replicate: ({8{s}} & b) | ({8{~s}} & a).',
      },
      {
        mistake: 'Using logical operators (s && b) in the mux equation.',
        fix:
          '&& collapses each operand to a single true/false bit — the data bits never reach y (module 04’s broken mux). Bitwise operators for data paths, always.',
      },
      {
        mistake: 'Inverting the select convention (writing s ? a : b when the spec says s=1 selects b).',
        fix:
          'The conditional operator selects the TRUE branch on s=1. Fix by matching the spec exactly — and encode the convention in the port comment. A mux with swapped sources passes every "default" test and fails the corner rows: another reason the exhaustive 8-row sweep exists.',
      },
    ],
    guidedPractice: {
      title: 'Run the full workflow yourself',
      brief:
        'Design mux2_bus: an 8-bit 2:1 mux (inputs a[7:0], b[7:0], select s, output y[7:0]) through all steps: spec sentence, 2-row behavioral table (s=0/s=1), RTL in the conditional style, and a testbench that checks (a=8\'h0F, b=8\'hF0) for s=0 and s=1. Give the expected outputs.',
      expectedBehavior:
        'Spec: y = a when s=0 else b. Table: s=0 → y=a; s=1 → y=b. RTL: assign y = s ? b : a; (8-bit sources; the conditional operator handles the width). Expected: s=0 → y=8\'h0F; s=1 → y=8\'hF0. The conditional form needs no replication — one reason it is the default.',
      hints: [
        'The behavioral table is 2 rows, not 512 — buses select wholesale.',
        'No replication needed for the conditional form; that is its advantage.',
      ],
    },
    practiceExercises: [
      {
        title: 'Platform challenge: the 2:1 mux',
        brief:
          'Implement the challenge version of the 2:1 mux (matching the challenge interface) and run it on the platform evaluator; then swap your conditional implementation for the AND-OR one and re-run.',
        expectedBehavior:
          'Both implementations must pass the challenge identically — they are the same truth table. If one passes and the other fails, the likely culprit is the select convention (s ? a : b vs s ? b : a) — recheck the challenge specification.',
        hints: [
          'Read the challenge port names first; match them exactly.',
          'Challenge harnesses test defined select values (0/1) — keep both styles consistent on every defined row.',
        ],
        challengeId: 'hardware-01-2to1-multiplexer',
      },
      {
        title: 'From 8:1 vector to one line',
        brief:
          'Given input wire [7:0] d and input wire [2:0] s, write the one-line 8:1 mux and state what hardware it implies; then write the equivalent case version and confirm the two agree for s=5, d=8\'b1111_0000.',
        expectedBehavior:
          'assign y = d[s]; (variable bit-select = 8:1 mux). Case version: eight arms 3\'b000..3\'b111 mapping y = d[0]..d[7] plus default. For s=5: both give d[5] = 1 (d = 1111_0000 has bits 7..4 set; bit 5 = 1).',
        hints: [
          'Variable bit-selects ARE muxes (module 03).',
          'Count arms: a 3-bit select needs 8 arms + default.',
        ],
      },
    ],
    assessment: {
      title: 'Module 08 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'For mux2 with a=1, b=0, s=1, what is y?',
          code: 'assign y = s ? b : a;   // a=1, b=0, s=1',
          options: ['0', '1', 'x', 'z'],
          answer: '0',
          explanation:
            's=1 selects b: y = b = 0. The true condition picks the expression after the question mark.',
          hint: 's=1 chooses b.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'bug-identification',
          prompt: 'This 8-bit mux compiles but selects wrongly for most bits. What is wrong?',
          code: 'assign y = (s & b) | (~s & a);   // all of a, b are 8-bit; s is 1-bit',
          options: [
            'The 1-bit select zero-extends, masking only bit 0 — the select must be replicated ({8{s}})',
            'The OR should be an XOR',
            'The order of a and b is swapped',
            'Nothing — this is correct for 8-bit data',
          ],
          answer: 'The 1-bit select zero-extends, masking only bit 0 — the select must be replicated ({8{s}})',
          explanation:
            '(s & b) zero-extends s to 8 bits: bits 7:1 are ANDed with 0, so only bit 0 of b can pass. Replicate the select (or use the conditional operator).',
          hint: 'What does zero-extension do to a 1-bit mask?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'Which is NOT a way to express a 4:1 mux in RTL?',
          options: [
            'Nested conditional operators',
            'A case statement on the 2-bit select',
            'A variable part-select d[s]',
            'A clocked always @(posedge clk) block',
          ],
          answer: 'A clocked always @(posedge clk) block',
          explanation:
            'A mux is combinational; wrapping it in a clocked block creates registers, not a mux. The other three are all legitimate mux spellings.',
          hint: 'Does the mux have a clock?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'For mux4_case with s = 2\'b01 and d = 4\'b1000, what is y?',
          code:
            'case (s)\n    2\'b00:   y = d[0];\n    2\'b01:   y = d[1];\n    2\'b10:   y = d[2];\n    2\'b11:   y = d[3];\nendcase   // s=2\'b01, d=4\'b1000',
          options: ['0', '1', 'x', 'z'],
          answer: '0',
          explanation:
            's=01 selects d[1]; d = 1000 has bit 1 = 0. y = 0.',
          hint: 'Which arm matches 01, and what is that bit of d?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the sum-of-products Boolean equation of the 2:1 mux (use s\', a, b, + and juxtaposition).',
          answer: "y = s'a + s*b",
          explanation:
            'The AND-OR form passes a when s=0 (s\'a) and b when s=1 (sb); the terms are mutually exclusive so the OR is safe.',
          hint: 'One product term per select value.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Multiplexer', definition: 'Combinational selector: one of 2^N data sources forwarded under an N-bit select.' },
      { term: 'Select convention', definition: 'Which branch (s=0 or s=1) maps to which source — must match the spec exactly.' },
      { term: 'Mux tree', definition: 'Wide muxes decompose into levels of 2:1 cells; depth = log2(inputs).' },
      { term: 'Replication mask', definition: '({W{s}} & b) | ({W{~s}} & a) — the bitwise bus-mux idiom with a W-bit select mask.' },
      { term: 'Design workflow', definition: 'spec → truth table → equations → RTL (two styles) → testbench → expected results → mistakes → practice.' },
    ],
    revisionSummary: [
      'The 10-step workflow: spec, truth table, equations, RTL (conditional + AND-OR + always), TB sweep, expected rows, mistakes, practice.',
      'Conditional operator is the default mux form — width-agnostic and spec-shaped.',
      'Bus AND-OR muxes need {W{s}} replication; && never appears in data paths.',
      '4:1+: case form stays readable; d[s] collapses vector sources to one line.',
      'Verify with the exhaustive sweep — every row, not just convenient ones.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Multiplexer', url: 'https://en.wikipedia.org/wiki/Multiplexer', kind: 'article' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m08-l2',
    title: 'Decoders, Encoders and Priority Encoders',
    summary:
      'Design the select-and-report family: binary-to-one-hot decoders, plain encoders, and priority encoders — with enable inputs and full verification.',
    objectives: [
      'Build 2:4 and 3:8 decoders with enables in dataflow and case styles.',
      'Implement a 4:2 encoder and explain its invalid-input behavior.',
      'Design a 4:2 priority encoder with if/else and casez styles.',
      'Verify one-hot and priority semantics row by row.',
    ],
    whyItMatters:
      'Decoders turn binary into one-hot (register enables, memory wordlines, chip selects); encoders compress one-hot back to binary (interrupt controllers, event aggregation); priority encoders decide WHO wins when multiple sources fire — the heart of interrupt and arbitration logic. Getting the enable, the invalid-input behavior and the priority order right is where beginners lose points and professionals differentiate.',
    prerequisites: ['vlog-m08-l1', 'vlog-m06-l2'],
    explanation:
      'A **decoder** activates exactly one of 2^N outputs according to an N-bit select, usually gated by an enable: en=0 forces all outputs inactive. It is the mux’s mirror image and the standard way to generate one-hot enables.\n\nA plain **encoder** (N one-hot inputs → binary output) has a specification hole: when MULTIPLE inputs are high, "the" encoding is undefined — a plain encoder’s outputs for multi-hot inputs are meaningless (and often the OR of conflicting patterns). Production designs therefore use a **priority encoder**, which reports the highest-priority active input plus a valid flag: well-defined for every input pattern, including all-zeros (valid=0). The if/else chain (in[3] first) or the casez pattern list expresses priority directly.\n\n**Full walkthrough (decoder 2:4):** spec (one-hot, enabled), truth table (below), equations (y0 = en·s1\'·s0\', y1 = en·s1\'·s0, y2 = en·s1·s0\', y3 = en·s1·s0), RTL (shift idiom and case style), testbench (all 8 en/s combinations), expected results (exactly the table), mistakes (narrow shift literals, missing enable), practice. The encoder gets the same treatment in condensed form.',
    deepDive:
      '### Enable and the cost of forgetting it\n\nWithout an enable, a decoder asserts one output for EVERY select value — often harmless (a mux selector), catastrophic as a register write-enable (a spurious write every cycle). The enable is a single AND per output line: y[i] = dec[i] & en. In the shift idiom the gating is free: `y = en ? (4\'b0001 << s) : 4\'b0000;`. When decoding address ranges for register files, the enable is usually "address in range AND strobe asserted" — module 12 builds exactly this.\n\n### Priority encoder: the two idioms\n\nif/else chain:\n\n```\nvalid = |in;              // reduction: any input at all?\nif      (in[3]) code = 2\'d3;\nelse if (in[2]) code = 2\'d2;\nelse if (in[1]) code = 2\'d1;\nelse if (in[0]) code = 2\'d0;\nelse            code = 2\'d0;   // don\'t-care when valid=0\n```\n\ncasez chain (patterns 1???, 01??, 001?, 0001) with default. Both describe the same hardware; the casez form scales better visually as width grows. Note the deliberate pre-assignment of defaults (valid, code) before the chain — the latch-prevention discipline that module 15 proves necessary.\n\n### Encoder arithmetic shortcut (and its limits)\n\nA one-hot 4-bit input can be "encoded" by a priority tree or — if the input is GUARANTEED one-hot — by simple OR-collapsing: code[1] = in[2] | in[3]; code[0] = in[1] | in[3]. This is the plain encoder: correct only under the one-hot guarantee, silently wrong otherwise (in=0101 gives code=11, meaning 3 — nonsense). Decide consciously: guarantee documented → cheap collapse; no guarantee → priority encoder + valid.',
    examples: [
      {
        title: 'Decoder 2:4 with enable — the full 10-step artifact',
        language: 'verilog',
        code:
          '// decoder2to4.v — both idiomatic styles\nmodule decoder2to4_shift(\n    input  wire [1:0] s,\n    input  wire       en,\n    output wire [3:0] y\n);\n    // Shift idiom: a one at position s, gated by en.\n    assign y = en ? (4\'b0001 << s) : 4\'b0000;\nendmodule\n\nmodule decoder2to4_case(\n    input  wire [1:0] s,\n    input  wire       en,\n    output reg  [3:0] y\n);\n    always @* begin\n        if (!en)\n            y = 4\'b0000;              // disabled: nothing active\n        else begin\n            case (s)\n                2\'b00:   y = 4\'b0001;\n                2\'b01:   y = 4\'b0010;\n                2\'b10:   y = 4\'b0100;\n                default: y = 4\'b1000;   // 2\'b11\n            endcase\n        end\n    end\nendmodule\n\n// tb_decoder2to4.v — SIM-ONLY exhaustive sweep\n`timescale 1ns/1ps\nmodule tb_decoder2to4;\n    reg  [1:0] s;\n    reg        en;\n    wire [3:0] y;\n    integer i;\n\n    decoder2to4_shift dut (.s(s), .en(en), .y(y));\n\n    initial begin\n        for (i = 0; i < 8; i = i + 1) begin\n            {en, s} = i[2:0];    // en is the MSB of the 3-bit pattern\n            #1;\n            $display("en=%b s=%b y=%b", en, s, y);\n        end\n        $finish;\n    end\nendmodule',
        explanation: [
          'Shift style: en=1 places the single 1 at bit position s (the literal width 4 matches y so the one never falls out); en=0 forces all zeros.',
          'Case style: the enable is handled first (all-zeros), then the select picks the one-hot arm. The case covers 00/01/10 with default=11 — complete.',
          'Testbench: 8 rows = all (en, s) combinations; {en, s} = i[2:0] unpacks the loop counter with en as MSB.',
          'Expected rows: en=0 → y=0000 for all four s values; en=1 → y=0001, 0010, 0100, 1000 for s = 00, 01, 10, 11.',
          'One-hot property holds by construction: exactly one bit set per enabled row.',
        ],
      },
      {
        title: 'Encoder and priority encoder with valid output',
        language: 'verilog',
        code:
          '// encoder4to2.v — PLAIN encoder: correct ONLY for one-hot inputs\nmodule encoder4to2(\n    input  wire [3:0] in,     // GUARANTEED one-hot or all-zero\n    output wire [1:0] code\n);\n    // OR-collapse: each code bit ORs the inputs that imply it.\n    assign code[1] = in[2] | in[3];\n    assign code[0] = in[1] | in[3];\nendmodule\n\n// pri_enc4to2.v — PRIORITY encoder: well-defined for ALL inputs\nmodule pri_enc4to2(\n    input  wire [3:0] in,\n    output reg  [1:0] code,\n    output reg        valid\n);\n    always @* begin\n        valid = |in;             // default first: any input at all?\n        code  = 2\'d0;            // default (matters when valid=0)\n        if (in[3])       code = 2\'d3;   // highest priority\n        else if (in[2])  code = 2\'d2;\n        else if (in[1])  code = 2\'d1;\n        else if (in[0])  code = 2\'d0;   // same as default, but explicit\n    end\nendmodule',
        explanation: [
          'Plain encoder: two OR gates. in=0100 → code=10 (2); in=0001 → code=00. For MULTI-HOT inputs the result is meaningless (in=0110 → code[1]=1 via in[2], code[0]=1 via in[1] → 11, which matches no single active input): the one-hot guarantee must be documented at the interface.',
          'Priority encoder: pre-assign valid = |in and code = 0 (latch-prevention defaults), then the if/else chain gives bit 3 top priority.',
          'Verification rows: in=0010 → valid=1, code=01. in=0110 → bits 2 and 1 both set → priority picks 2 → code=10, valid=1. in=0000 → valid=0, code=00. in=1111 → code=11 (bit 3 wins).',
          'The distinguishing row: in=0110 → plain encoder says 11 (both set bits collapse in) while the priority encoder says 10 (bit 2 outranks bit 1). Adjacent-bit multi-hot rows are exactly where the two diverge.',
          'Interface note: plain encoders deserve a comment stating the one-hot contract; priority encoders need no contract — they are total functions.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The select-and-report family',
        content:
          '  DECODER 2:4                ENCODER 4:2              PRIORITY ENC 4:2\n  binary -> one-hot          one-hot -> binary        one-hot + multi-hot -> (code, valid)\n\n   s --+--> y0 = 0001          in0 --\\                  in3 ---(highest)\n       |---> y1 = 0010         in1 --[OR-tree]-- code   in2 --+\n       |---> y2 = 0100         in2 --/                  in1 --+[if/else]\n       +---> y3 = 1000         in3 -\'                   in0 -\'---> code\n        ^                                                |\n        en (gate all)                                    +--> valid = |in\n\n  direction of information flow is the only difference:',
        caption:
          'Decoder spreads one select to N lines; encoders compress N lines back — priority versions stay total (defined for every input).',
      },
    ],
    tables: [
      {
        caption: 'Decoder 2:4 with enable — complete truth table',
        headers: ['en', 's1', 's0', 'y3', 'y2', 'y1', 'y0'],
        rows: [
          ['0', 'x', 'x', '0', '0', '0', '0'],
          ['1', '0', '0', '0', '0', '0', '1'],
          ['1', '0', '1', '0', '0', '1', '0'],
          ['1', '1', '0', '0', '1', '0', '0'],
          ['1', '1', '1', '1', '0', '0', '0'],
        ],
      },
      {
        caption: 'Priority encoder verification (multi-hot rows included)',
        headers: ['in[3:0]', 'code', 'valid', 'Comment'],
        rows: [
          ['0000', '00', '0', 'nothing active'],
          ['0001', '00', '1', 'bit 0 only'],
          ['0110', '10', '1', 'bits 2,1: priority picks 2'],
          ['0101', '10', '1', 'bits 2,0: priority picks 2 (plain encoder would say 11)'],
          ['1111', '11', '1', 'bit 3 outranks all'],
        ],
      },
      {
        caption: 'Plain encoder OR-collapse map (one-hot contract)',
        headers: ['in active', 'code[1] = in2|in3', 'code[0] = in1|in3'],
        rows: [
          ['in0', '0', '0'],
          ['in1', '0', '1'],
          ['in2', '1', '0'],
          ['in3', '1', '1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Decoder shift literal narrower than the output (e.g. 2\'b01 << s for a 4-bit y).',
        fix:
          'The single 1 must be able to reach the highest output position: match the literal width to the output width (4\'b0001 << s for 4 outputs). A narrow literal pushes the one out of existence for high s.',
      },
      {
        mistake: 'Using a plain encoder where multi-hot inputs are possible.',
        fix:
          'OR-collapsing is only correct under a documented one-hot guarantee. If multiple inputs can fire (interrupts, requests), use a priority encoder with a valid flag.',
      },
      {
        mistake: 'Priority encoder without pre-assigned defaults — outputs hold stale values for the all-zeros input.',
        fix:
          'Assign valid (and code) defaults BEFORE the if/casez chain: valid = |in; code = 0;. The chain then only overrides. Without this, in=0000 leaves code holding its previous value — a latch in synthesis.',
      },
    ],
    guidedPractice: {
      title: 'Distinguish plain from priority',
      brief:
        'For in = 4\'b0101 compute both the plain encoder output (code = {in[2]|in[3], in[1]|in[3]}) and the priority encoder (code, valid). Then give one additional input pattern where the two disagree.',
      expectedBehavior:
        'in=0101: plain → code[1] = in[2]|in[3] = 1, code[0] = in[1]|in[3] = 0+0? in[1]=0, in[3]=0 → 0; code = 10. Priority → bit 2 wins → code=10, valid=1 — agree HERE. Disagreement example: in=0011: plain → code[1]=0, code[0]=1 → 01; priority → bit 1 wins → code=01 — also agrees! Try in=1001: plain → code[1]=1, code[0]=1 → 11; priority → bit 3 → 11 — agrees. in=0110: plain → code[1]=1 (in2), code[0]=1 (in1) → 11; priority → 10 — DISAGREE. So in=0110 (also 1010: plain 11, priority 10) is the witness.',
      hints: [
        'Evaluate the OR-collapses bit by bit for the given pattern.',
        'The disagreement needs at least two set bits whose implied codes differ.',
      ],
    },
    practiceExercises: [
      {
        title: 'Scale to 3:8',
        brief:
          'Write decoder3to8 with enable using the shift idiom, and give the expected y for (en,s) = (1,000), (1,101), (0,111).',
        expectedBehavior:
          'assign y = en ? (8\'b0000_0001 << s) : 8\'b0000_0000; — (1,000) → 0000_0001; (1,101) → 0010_0000 (the one at position 5); (0,111) → 0000_0000. The 8-bit literal keeps the one inside the width for all 8 select values.',
        hints: [
          'Literal width = output width = 8.',
          'Position 5 means bit 5: 0010_0000.',
        ],
      },
      {
        title: 'Priority encoder by casez',
        brief:
          'Rewrite pri_enc4to2 using casez with patterns 4\'b1???, 4\'b01??, 4\'b001?, 4\'b0001 and default, keeping the pre-assigned valid/code defaults. Verify rows 0101 and 0000.',
        expectedBehavior:
          'always @* begin valid = |in; code = 2\'d0; casez (in) 4\'b1???: code = 2\'d3; 4\'b01??: code = 2\'d2; 4\'b001?: code = 2\'d1; 4\'b0001: code = 2\'d0; default: ; endcase end — in=0101 matches 01?? → code=10, valid=1; in=0000 matches default → code=00, valid=0.',
        hints: [
          'Patterns ordered broad-first = priority order.',
          'The empty default keeps the pre-assigned defaults.',
        ],
      },
    ],
    assessment: {
      title: 'Module 08 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'For decoder2to4 with en=1, s=2\'b10, what is y?',
          code: 'assign y = en ? (4\'b0001 << s) : 4\'b0000;   // en=1, s=2\'b10',
          options: ["4'b0100", "4'b0010", "4'b1000", "4'b0001"],
          answer: "4'b0100",
          explanation:
            'The single 1 shifts left by s = 2: 0001 << 2 = 0100. One-hot at position 2.',
          hint: 'Shift the one left by the select value.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'When is a plain (OR-collapse) encoder acceptable?',
          options: [
            'Only when the input is guaranteed one-hot (or all-zero) and that contract is documented',
            'Never — priority encoders are always required',
            'Whenever the input is 4 bits or less',
            'When the design is combinational',
          ],
          answer: 'Only when the input is guaranteed one-hot (or all-zero) and that contract is documented',
          explanation:
            'For multi-hot inputs the OR-collapse produces meaningless codes. The guarantee must be real and written at the interface; otherwise use a priority encoder.',
          hint: 'What does the plain encoder assume about its inputs?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'For pri_enc4to2 with in = 4\'b0110, what are code and valid?',
          code:
            'valid = |in;\ncode  = 2\'d0;\nif (in[3])      code = 2\'d3;\nelse if (in[2]) code = 2\'d2;\nelse if (in[1]) code = 2\'d1;\nelse if (in[0]) code = 2\'d0;\n// in = 4\'b0110',
          options: ['code=10, valid=1', 'code=01, valid=1', 'code=11, valid=1', 'code=00, valid=0'],
          answer: 'code=10, valid=1',
          explanation:
            'Bits 2 and 1 are set; the chain checks in[3] (0), then in[2] (1) → code = 2. valid = |in = 1.',
          hint: 'Highest set bit wins.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'This priority encoder misbehaves for one input pattern. Which, and why?',
          code:
            'always @* begin\n    if (in[3])      code = 2\'d3;\n    else if (in[2]) code = 2\'d2;\n    else if (in[1]) code = 2\'d1;\n    else            code = 2\'d0;\n    valid = 1\'b1;\nend',
          options: [
            'valid is forced to 1 always — for in=0000 it must be 0; also no defaults before the chain',
            'The priority order is reversed',
            'code should be 3 bits',
            'The if/else chain needs casez instead',
          ],
          answer: 'valid is forced to 1 always — for in=0000 it must be 0; also no defaults before the chain',
          explanation:
            'valid = 1\'b1 unconditionally reports activity even for the all-zero input. The fix: pre-assign valid = |in and code = 2\'d0 before the chain (the lesson’s pattern).',
          hint: 'What should the outputs be when nothing is active?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the enable-gated equation for output y1 of a 2:4 decoder (use en, s1, s0 with \' for NOT and · for AND).',
          answer: "y1 = en · s1' · s0",
          explanation:
            'y1 is active when enabled, s1 clear, and s0 set — the minterm for select value 01, gated by the enable.',
          hint: 'Which (s1,s0) pattern selects output 1?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Decoder', definition: 'Asserts exactly one of 2^N outputs per select value; enable gates all outputs.' },
      { term: 'One-hot', definition: 'Encoding with exactly one bit set — decoder output form, mux-friendly.' },
      { term: 'Encoder', definition: 'Compresses one-hot inputs to binary; only meaningful under a one-hot guarantee.' },
      { term: 'Priority encoder', definition: 'Reports the highest-priority active input plus valid; total function over all inputs.' },
      { term: 'Valid flag', definition: 'Companion output marking "result is meaningful" — essential when inputs can be all-zero.' },
    ],
    revisionSummary: [
      'Decoder: y = en ? (one_hot << s) : 0, or case arms; literal width = output width.',
      'Enable ANDs into every output line; without it, spurious activations fire every cycle.',
      'Plain encoder = OR-collapse, correct only under a documented one-hot contract.',
      'Priority encoder = defaults first (valid = |in, code = 0), then if/else or casez chain, highest bit first.',
      'Verify with multi-hot rows: they are exactly where plain and priority encoders diverge.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Decoder', url: 'https://en.wikipedia.org/wiki/Decoder', kind: 'article' },
      { label: 'Wikipedia — Encoder', url: 'https://en.wikipedia.org/wiki/Encoder', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m08-l3',
    title: 'Adder/Subtractor, Comparator, ALU Slice and Barrel Shifter',
    summary:
      'Assemble the arithmetic core: a mode-controlled adder/subtractor, flag-generating comparisons, a complete ALU slice, and the barrel shifter.',
    objectives: [
      'Build an adder/subtractor using two’s complement with a mode control.',
      'Derive zero/carry/negative flags from one operation.',
      'Implement a full ALU slice with case-based operation decode.',
      'Describe barrel shifter structure (log2(W) mux stages) and write one.',
    ],
    whyItMatters:
      'This lesson assembles everything from modules 04-08 into the block every processor has: an ALU slice. It is also the flagship example of the course’s workflow — spec, truth/operation table, RTL, testbench, expected results, mistakes, practice — applied to arithmetic where width, signedness and flags interact. The linked ALU project (module 16) and its testbench (module 14) both build directly on this lesson.',
    prerequisites: ['vlog-m08-l1', 'vlog-m05-l2', 'vlog-m04-l1'],
    explanation:
      '**Adder/subtractor.** Two’s complement gives subtraction for free: a - b = a + ~b + 1. One adder serves both operations by conditionally inverting b and injecting the +1 through the carry-in — with mode as the control: `bx = b ^ {W{mode}};` (mode=1 flips every bit), `assign {carry, result} = a + bx + mode;`. When mode=0 this is a plain adder (carry = carry-out); when mode=1 it subtracts (carry=1 means NO borrow for unsigned). One adder, two operations, three flag sources.\n\n**Flags.** From the same operation: zero = ~|result (NOR reduction — result is exactly 0); carry = the adder’s carry-out (meaning "no borrow" in subtract mode for unsigned); negative = result[W-1] (the sign bit, meaningful for signed data). Flags are just taps on hardware that already exists — never compute them with separate logic.\n\n**ALU slice.** An operation selector around the datapath: a case on the opcode choosing add/sub/and/or/xor/shift/compare. The case arms assign one result register (always @*, blocking, default first); flags derive from whichever result was selected. The 10-step treatment below is the course’s reference example.\n\n**Barrel shifter.** A combinational shifter for a VARIABLE amount: W bits arranged in log2(W) stages, stage k shifting by 2^k when control bit k is set. Each stage is a W-wide 2:1 mux — total cost W·log2(W) mux cells, constant delay regardless of shift amount (hence "barrel": everything tumbles at once, unlike a clock-by-clock shift register).',
    deepDive:
      '### The 10-step ALU slice treatment\n\n**1. Spec:** compute one of 8 operations on 4-bit unsigned/signed operands under a 3-bit opcode, producing a 4-bit result plus zero, carry and negative flags. **2. Operation table** (below). **3. Equations:** result per opcode; flags from result/carry. **4. RTL:** case-based always @* (Example 1). **5. Testbench:** task-driven vector loop (module 14 builds the full self-checking version). **6. Expected results:** traced rows for each opcode. **7. Mistakes:** carry computed after truncation, signed slt with unsigned operands, missing default. **8. Practice:** extend ops, parameterize width.\n\n### SLT and signedness discipline\n\nSet-less-than (a < b signed) is the ALU’s signedness trap: `result = (a < b) ? 1 : 0` is only signed if BOTH operands are declared signed (module 03/04). In a mixed design the safe form computes signed comparison explicitly on signed views — and the verification suite MUST include negative-operand rows (e.g. a = -1, b = 0: slt = 1). A slt that passes on non-negative data and fails on negatives is the classic sign-extension bug in disguise.\n\n### Barrel shifter staging\n\nFor W=8 and sh = 3 stages: stage 0 shifts by 1 if sh[0], stage 1 by 2 if sh[1], stage 2 by 4 if sh[2]. Writing it as dataflow per stage (s0 = sh[0] ? {1\'b0, a[7:1]} : a; s1 = sh[1] ? {2\'b00, s0[7:2]} : s0; ...) makes the structure explicit and synthesizes to exactly the mux cascade. A case on sh would produce the same hardware through a different source shape. Rotate adds one twist: OR in the bits that fell off the far end at each stage.',
    examples: [
      {
        title: 'The ALU slice: operation table and RTL (the reference 10-step example)',
        language: 'verilog',
        code:
          '// alu_slice.v — 4-bit ALU slice with flags\nmodule alu_slice(\n    input  wire [2:0] op,      // 000 add, 001 sub, 010 and, 011 or,\n                               // 100 xor, 101 shl, 110 shr, 111 slt\n    input  wire [3:0] a,\n    input  wire [3:0] b,\n    output reg  [3:0] result,\n    output reg        zero,     // result == 0\n    output reg        carry,    // add: carry-out; sub: no-borrow\n    output reg        negative  // result[3] (sign bit)\n);\n    wire [3:0] bx;\n    wire [4:0] sum;       // 5-bit context for the carry\n\n    // Shared add/sub hardware: mode = op[0] for add/sub ops.\n    assign bx  = b ^ {4{op == 3\'b001}};   // invert b only for SUB\n    assign sum = a + bx + (op == 3\'b001); // +1 through the carry-in\n\n    always @* begin\n        result   = 4\'b0000;   // defaults FIRST (module 15 discipline)\n        carry    = 1\'b0;\n        case (op)\n            3\'b000: result = sum[3:0];            // ADD\n            3\'b001: result = sum[3:0];            // SUB (a - b)\n            3\'b010: result = a & b;               // AND\n            3\'b011: result = a | b;               // OR\n            3\'b100: result = a ^ b;               // XOR\n            3\'b101: result = {a[2:0], 1\'b0};      // SHL 1\n            3\'b110: result = {1\'b0, a[3:1]};      // SHR 1 (logical)\n            3\'b111: result = ($signed(a) < $signed(b)) ? 4\'d1 : 4\'d0;  // SLT\n            default: result = 4\'b0000;\n        endcase\n        // Flags derive from the SELECTED result and the shared adder.\n        zero     = ~|result;\n        negative = result[3];\n        carry    = ((op == 3\'b000) || (op == 3\'b001)) ? sum[4] : 1\'b0;\n    end\nendmodule',
        explanation: [
          'Shared arithmetic: bx inverts b only for SUB (the mask {4{cond}} replicates a 1-bit condition to a 4-bit mask — module 04/08 idiom); the (op == 3\'b001) term injects the +1 through the carry-in. sum is 5 bits so the carry survives (module 04 rule).',
          'The case assigns result for every opcode; defaults come first. All flags derive AFTER the case, from the selected result.',
          'SLT uses $signed casts so the comparison is signed regardless of declaration — the module 03 signedness discipline applied.',
          'Flags: zero = ~|result (NOR reduction); negative = result[3]; carry only defined for add/sub (sum[4]), forced 0 for logic/shift ops.',
          'Trace ADD: op=000, a=0111 (7), b=1000 (8): bx=1000, sum = 7+8+0 = 15 = 0_1111 → result=1111, carry=0, zero=0, negative=1 (as signed 4-bit, 1111 = -1 — negative flag set).',
          'Trace SUB: op=001, a=0011 (3), b=0101 (5): bx = 1010, sum = 3+10+1 = 14 = 1_1110 → result=1110 (14 = 3-5 mod 16), carry=1 (no borrow? 3<5 so borrow occurred → carry should be 0!). CAREFUL: for unsigned a-b, borrow occurred when carry-out is 0 — here sum[4]=0, so carry=0 meaning "borrow" — consistent: 3-5 borrows. result 1110 = -2 mod 16 = 14 ✓.',
        ],
      },
      {
        title: 'Testbench sketch and expected results (condensed; module 14 automates it)',
        language: 'verilog',
        code:
          '// tb_alu_slice.v — SIM-ONLY: directed rows per opcode\n`timescale 1ns/1ps\nmodule tb_alu_slice;\n    reg  [2:0] op;\n    reg  [3:0] a, b;\n    wire [3:0] result;\n    wire       zero, carry, negative;\n\n    alu_slice dut (.op(op), .a(a), .b(b), .result(result),\n                   .zero(zero), .carry(carry), .negative(negative));\n\n    task apply_check;\n        input [2:0] t_op;\n        input [3:0] t_a, t_b;\n        begin\n            op = t_op; a = t_a; b = t_b;\n            #1;   // settle\n            $display("op=%b a=%b b=%b -> r=%b z=%b c=%b n=%b",\n                     op, a, b, result, zero, carry, negative);\n        end\n    endtask\n\n    initial begin\n        apply_check(3\'b000, 4\'b0111, 4\'b1000);  // ADD 7+8\n        apply_check(3\'b001, 4\'b0011, 4\'b0101);  // SUB 3-5\n        apply_check(3\'b010, 4\'b1100, 4\'b1010);  // AND\n        apply_check(3\'b111, 4\'b1111, 4\'b0000);  // SLT(-1, 0)\n        apply_check(3\'b101, 4\'b1001, 4\'b0000);  // SHL\n        $finish;\n    end\nendmodule',
        explanation: [
          'The task (module 13 details them) bundles apply-settle-display — one call per test vector, no copy-paste.',
          'Expected rows: ADD 7+8 → r=1111, z=0, c=0, n=1. SUB 3-5 → r=1110, z=0, c=0 (borrow), n=1. AND 1100&1010 → r=1000, z=0, n=1, c=0. SLT(-1<0) → r=0001, z=0, n=0, c=0. SHL 1001 → r=0010, z=0, n=0, c=0.',
          'Each expected row derives from the operation table — deriving them by hand BEFORE simulating is the verification skill; module 14 replaces hand-checking with a reference model that computes expected values automatically.',
          'The SLT row is the signedness witness: a=1111 is -1 signed; unsigned compare would say 15 < 0 = false; the signed compare correctly yields 1.',
          'This sketch is sim-only; the linked ALU project (module 16) runs the full self-checking version on the platform evaluator.',
        ],
      },
      {
        title: 'Barrel shifter: staged construction (shift and rotate)',
        language: 'verilog',
        code:
          '// barrel8.v — 8-bit combinational shifter, 3 mux stages\nmodule barrel8(\n    input  wire [7:0] a,\n    input  wire [2:0] sh,      // shift amount 0..7\n    output wire [7:0] shifted,\n    output wire [7:0] rotated\n);\n    // SHIFT right (logical): each stage shifts by 1, 2 or 4 when its\n    // control bit is set; zeros fill from the left.\n    wire [7:0] s0, s1;\n    assign s0      = sh[0] ? {1\'b0,   a[7:1]}   : a;\n    assign s1      = sh[1] ? {2\'b00, s0[7:2]}  : s0;\n    assign shifted = sh[2] ? {4\'b0000, s1[7:4]} : s1;\n\n    // ROTATE right: the bits that fall off re-enter at the top, per stage.\n    wire [7:0] r0, r1, r2;\n    assign r0      = sh[0] ? {a[0],     a[7:1]}   : a;   // rotate by 1\n    assign r1      = sh[1] ? {r0[1:0],  r0[7:2]}  : r0;  // rotate by 2\n    assign r2      = sh[2] ? {r1[3:0],  r1[7:4]}  : r1;  // rotate by 4\n    assign rotated = r2;\n\nendmodule',
        explanation: [
          'Shift path: three conditional stages, each shifting by 1, 2 or 4 when its control bit is set; zeros fill. Total = shift by sh, one mux level per bit of sh — constant delay.',
          'Trace shifted with a=8\'b1000_0000, sh=3\'b011 (3): s0 (sh[0]=1) → 0100_0000; s1 (sh[1]=1) → 0001_0000; sh[2]=0 → shifted = 0001_0000. 128 >> 3 = 16 ✓.',
          'Rotate path: same staging but the falling bits wrap into the top. Rotate-right-1 of 1000_0000 → 0100_0000; by 2 more → 0001_0000; sh[2]=0 → rotated = 0001_0000.',
          'Cross-check the rotate: with sh=3\'b111 (7), a=1000_0000 → r0=0100_0000, r1=0001_0000, r2={r1[3:0]=0000, r1[7:4]=0001} = 0000_0001 — rotate right 7 equals rotate left 1 ✓.',
          'A case-on-sh version produces equivalent hardware; the staged form makes the log2(W)-depth structure visible — useful when timing analysis points at the shifter.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'ALU slice architecture: shared adder + case select + flag taps',
        content:
          '   a[3:0] ----+----------------------+\n              |                      v\n   b[3:0] --[XOR mask]-- bx ---> [ 5-bit ADDER ] --> sum[4:0]\n              ^  (mode=SUB)          |\n              mode                   |\n                                     v\n   op[2:0] ---> [ CASE SELECT ] -> result[3:0] -> [flag taps]\n                add: sum[3:0]                     zero = ~|result\n                sub: sum[3:0]                     negative = result[3]\n                and/or/xor: a op b                carry = sum[4] (add/sub only)\n                shl/shr/slt: per table',
        caption:
          'One adder serves add AND subtract; the case routes results; flags tap existing hardware. The canonical ALU micro-architecture.',
      },
    ],
    tables: [
      {
        caption: 'ALU slice operation table (Step 2)',
        headers: ['op', 'Name', 'result', 'carry meaning'],
        rows: [
          ['000', 'ADD', 'a + b', 'carry-out of the addition'],
          ['001', 'SUB', 'a - b', '1 = no borrow (unsigned a >= b)'],
          ['010', 'AND', 'a & b', '0 (undefined op)'],
          ['011', 'OR', 'a | b', '0'],
          ['100', 'XOR', 'a ^ b', '0'],
          ['101', 'SHL 1', '{a[2:0], 0}', '0'],
          ['110', 'SHR 1', '{0, a[3:1]}', '0'],
          ['111', 'SLT', '(signed a < signed b) ? 1 : 0', '0'],
        ],
      },
      {
        caption: 'Expected results for the five directed rows (Step 6)',
        headers: ['op', 'a', 'b', 'result', 'zero', 'carry', 'negative'],
        rows: [
          ['000 ADD', '0111', '1000', '1111', '0', '0', '1'],
          ['001 SUB', '0011', '0101', '1110', '0', '0', '1'],
          ['010 AND', '1100', '1010', '1000', '0', '0', '1'],
          ['111 SLT', '1111', '0000', '0001', '0', '0', '0'],
          ['101 SHL', '1001', '0000', '0010', '0', '0', '0'],
        ],
      },
      {
        caption: 'Barrel shifter stage map (W=8)',
        headers: ['Stage', 'Control', 'Shift when active', 'Hardware'],
        rows: [
          ['0', 'sh[0]', 'by 1', 'W 2:1 muxes'],
          ['1', 'sh[1]', 'by 2', 'W 2:1 muxes'],
          ['2', 'sh[2]', 'by 4', 'W 2:1 muxes'],
          ['total', 'sh[2:0]', 'by 0..7', '3 mux levels, constant delay'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Computing the carry from a 4-bit result (carry = result overflow guess) instead of the 5-bit adder context.',
        fix:
          'The carry lives in sum[4] of the 5-bit {carry, result} addition. Never reconstruct flags from a truncated result — keep the wide intermediate and tap it.',
      },
      {
        mistake: 'Writing SLT as (a < b) without ensuring signed operands.',
        fix:
          'If either operand is unsigned the comparison goes unsigned (module 03): -1 (1111) would compare as 15. Use $signed casts or declare operands signed, and include negative-operand rows in verification.',
      },
      {
        mistake: 'Forgetting the +1 (carry-in) in subtract mode.',
        fix:
          'a - b = a + ~b + 1: omitting the +1 computes a + ~b = a - b - 1 — every subtraction off by one. Inject the mode through the adder carry-in: sum = a + bx + mode.',
      },
    ],
    guidedPractice: {
      title: 'Flag detective',
      brief:
        'For the ALU slice, compute result, zero, carry, negative for: (1) op=ADD, a=1111, b=0001; (2) op=SUB, a=0101, b=0101; (3) op=SUB, a=0010, b=1000; (4) op=XOR, a=1010, b=1010.',
      expectedBehavior:
        '(1) 15+1 = 16 = 1_0000 → result=0000, zero=1, carry=1, negative=0. (2) 5-5: bx=1010, sum = 5+10+1 = 16 = 1_0000 → result=0000, zero=1, carry=1 (no borrow), negative=0. (3) 2-8: bx=0111, sum = 2+7+1 = 10 = 0_1010 → result=1010, zero=0, carry=0 (borrow), negative=1. (4) 1010^1010 = 0000 → zero=1, carry=0, negative=0.',
      hints: [
        'Always compute the 5-bit sum first; flags are taps on it and on result.',
        'SUB carry=1 means no borrow (unsigned a >= b).',
      ],
    },
    practiceExercises: [
      {
        title: 'Extend the ALU: shift-by-b',
        brief:
          'Add op=3\'b100 replaced by a variable shifter: result = a shifted logically right by b[2:0] using a barrel-shifter expression or a case on b[2:0]. Update the operation table row and give expected results for a=1000, b=000 (and b=010).',
        expectedBehavior:
          'Replace the XOR arm with SHR-variable: result = a >> b[2:0]; (zero-fill, synthesis builds the mux tree). Table row: 100 → SHR by b. Expected: a=1000, b=000 → result=1000 (shift by 0); b=010 → result=0010 (shift by 2).',
        hints: [
          'a >> b[2:0] is a variable shift — the barrel shifter in one operator.',
          'Shift by 0 must return a unchanged.',
        ],
      },
      {
        title: 'Comparator from the ALU',
        brief:
          'Using the ALU slice in SUB mode, express unsigned gt/eq/lt purely from its outputs. Verify for a=9, b=5 and a=5, b=9.',
        expectedBehavior:
          'eq = zero; gt = carry (no borrow) AND ~zero; lt = ~carry. a=9,b=5: 9-5 = 4 → zero=0, carry=1 → gt=1. a=5,b=9: 5-9 borrows → carry=0 → lt=1 (and zero=0 so gt=0). This is module 05’s comparator — now as a mode of the ALU.',
        hints: [
          'In SUB mode, carry = no-borrow = a >= b.',
          'Equality comes from the zero flag, not the borrow.',
        ],
      },
    ],
    assessment: {
      title: 'Module 08 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'How does one adder perform both addition and subtraction?',
          options: [
            'Invert b and add 1 through the carry-in when in subtract mode (two’s complement)',
            'A second adder wired in reverse',
            'Subtraction is not possible with an adder',
            'The mode bit doubles the clock period',
          ],
          answer: 'Invert b and add 1 through the carry-in when in subtract mode (two’s complement)',
          explanation:
            'a - b = a + ~b + 1: XOR-mask b with mode, and inject mode as the carry-in. One adder, two operations.',
          hint: 'Two’s complement negation is invert-and-add-one.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'In ALU SUB mode with a = 4\'b0101 and b = 4\'b0101, what are result and carry?',
          code:
            'bx  = b ^ {4{1\'b1}};      // invert b\nsum = a + bx + 1;          // 5-bit\n// a=0101, b=0101',
          options: ['result=0000, carry=1', 'result=0000, carry=0', 'result=0001, carry=0', 'result=1111, carry=1'],
          answer: 'result=0000, carry=1',
          explanation:
            '5 + 10 + 1 = 16 = 1_0000: result=0000, carry=1. Carry=1 in subtract mode means no borrow — 5-5 = 0 exactly.',
          hint: 'Compute the 5-bit sum; the top bit is the carry.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'The SLT operation (signed a < b) returns 0 for a = 4\'b1111, b = 4\'b0000 when the comparison is accidentally unsigned. What is the correct signed answer?',
          options: ['1 (because -1 < 0)', '0 (15 > 0 — the unsigned view)', 'x', 'It depends on the carry'],
          answer: '1 (because -1 < 0)',
          explanation:
            '4\'b1111 is -1 as a signed 4-bit value, and -1 < 0 is true → SLT = 1. The unsigned misread (15 < 0 = false) is exactly the signedness trap.',
          hint: 'Interpret 1111 as signed first.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'A barrel shifter’s delay grows linearly with the shift amount.',
          answer: 'false',
          explanation:
            'It is a fixed log2(W)-stage mux cascade — constant delay for any shift amount 0..W-1. (A clock-by-clock shift register would take W cycles; a loop-shift takes sh cycles.)',
          hint: 'How many mux stages does an 8-bit barrel shifter have, regardless of amount?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the flag expression for "result is exactly zero" using a reduction operator.',
          answer: '~|result',
          explanation:
            'The NOR reduction is 1 exactly when every bit of result is 0 — the zero flag in one operator.',
          hint: 'NOR-tree.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Adder/subtractor', definition: 'One adder performing both operations via two’s complement: b XOR mode, mode as carry-in.' },
      { term: 'Flags', definition: 'Status outputs derived from an operation: zero (NOR of result), carry (adder carry-out), negative (sign bit).' },
      { term: 'ALU slice', definition: 'Case-selected arithmetic/logic unit stage: shared adder + operation mux + flag taps.' },
      { term: 'SLT', definition: 'Set-less-than: result = 1 when signed a < signed b; requires signed comparison discipline.' },
      { term: 'Barrel shifter', definition: 'Combinational variable shifter: log2(W) conditional mux stages (by 1, 2, 4, ...), constant delay.' },
    ],
    revisionSummary: [
      'Add/sub in one adder: bx = b ^ {W{mode}}, sum = a + bx + mode (5-bit context keeps the carry).',
      'Flags are taps: zero = ~|result, negative = result[W-1], carry = sum[W] for add/sub.',
      'The ALU slice = shared adder + case select + flag taps; defaults assigned first.',
      'SLT needs genuinely signed comparison; verify with negative-operand rows.',
      'Barrel shifter: log2(W) stages of conditional shift-by-2^k; rotate wraps the fallen bits per stage.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Arithmetic logic unit', url: 'https://en.wikipedia.org/wiki/Arithmetic_logic_unit', kind: 'article' },
      { label: 'Wikipedia — Barrel shifter', url: 'https://en.wikipedia.org/wiki/Barrel_shifter', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
];
