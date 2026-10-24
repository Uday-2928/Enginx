import type { TutorialLesson } from '../types';

/**
 * Module 05 — Control Logic.
 * FSM coding style (two-always template), Moore vs Mealy, state encoding,
 * robustness (defaults, illegal states, error states), and the valid/ready
 * handshake that joins control to datapath and module to module.
 */

export const module05Lessons: TutorialLesson[] = [
  {
    id: 'rtl-m05-l1',
    title: 'FSM Coding Style for RTL',
    summary:
      'The two-process template — one clocked state register, one combinational next-state/output cloud — with defaults, Moore outputs and explicit transitions. Plus the encoding question: binary, one-hot, and when you actually care.',
    objectives: [
      'Write the two-process FSM template: state register process plus combinational next-state process with default hold and default-case recovery.',
      'Distinguish Moore and Mealy outputs in RTL terms and predict their timing consequences.',
      'Compare binary and one-hot state encodings and choose between them deliberately.',
      'Trace a burst-controller FSM cycle by cycle from its state diagram.',
    ],
    whyItMatters:
      'Control is where designs become hard to review, so control needs a fixed shape. The two-process template gives every FSM in a codebase the same skeleton — reviewers check transitions against the state diagram instead of re-deriving the logic; lint checks the defaults; synthesis extracts clean state registers. Teams that let every engineer invent a personal FSM style accumulate designs where "what states exist?" is itself a research question. The template is also the direct transcription of the state diagram your architecture artifact already contains: states become localparams, arcs become case rows.',
    prerequisites: ['rtl-m03-l1', 'rtl-m03-l2', 'rtl-m01-l1'],
    explanation: [
      'The **two-process template** splits the FSM by the register/cloud rule from module 01. Process one is the **state register**: `always @(posedge clk or negedge reset_n)` assigning `st_q <= st_d` and nothing else. Process two is the **next-state and output cloud**: `always @*` computing `st_d` from `st_q` and the inputs, and the outputs. The cloud has two defaults written before the case: `st_d = st_q;` (hold — an FSM with no reason to move stays put) and the Moore output defaults (usually 0). The case itself covers every state and ends with `default: st_d = ST_IDLE;` — the illegal-state recovery row. Every transition is then one explicit line inside one case row, and the case reads as the state diagram.',
      '**Moore versus Mealy** is about what outputs read. A **Moore output** is a function of state only: `req_o = (st_q == ST_REQ)`, glitch-free relative to inputs, but it changes only when the state register changes — one cycle of response latency. A **Mealy output** also reads inputs: `done_tick = (st_q == ST_DATA) && data_valid_i && last_beat`, responding in the same cycle the input arrives — faster, but it is a combinational path from input to output, so it can glitch and it participates directly in timing. The RTL habit: Moore outputs for signals other modules register or act on (requests, enables); Mealy for same-cycle event pulses that are consumed immediately (ticks, last-beat flags) — and if a Mealy output crosses to another clock domain, register it first (module 07).',
      '**State encoding** assigns the localparam values. **Binary** packs states into ceil(log2 N) flip-flops: 4 states in 2 bits — minimum area, but next-state decode must compare compound values, and an illegal encoding (2\'d3 in a 3-state machine) is reachable via corruption. **One-hot** spends one flip-flop per state: 4 states in 4 bits, only two bits differ between adjacent states, decode is trivial (`st_q[REQ]`), and FPGA fabrics (LUT-based) often run one-hot faster. The designer\'s rule: write the FSM with named localparams and *any* encoding — the meaning never changes; let the choice be explicit and justified (binary for many-state ASIC FSMs where FFs cost, one-hot for FPGA timing), and remember synthesis tools may re-encode anyway (module 10). What you must never do is write FSM logic that depends on the encoding\'s numeric accidents (e.g. "IDLE to WAIT is just +1").',
      'The template pays off in **traceability**. Because every arc is a case row, a reviewer diffs the RTL against the state diagram arc by arc; because outputs are defaulted, an unreachable state cannot invent an asserted output; because the state register is its own process, timing tools see exactly one register bank for the state. And when the FSM changes — a new state, a new arc — the edit is one localparam, one case row, and the defaults already handle the coverage. This is what "control that survives review" means structurally.',
    ].join('\n\n'),
    deepDive: [
      'Why is the default `st_d = st_q;` (hold) rather than `st_d = ST_IDLE;` (jump home)? The two choices encode different failure philosophies, and you should pick knowingly. Hold-default says: "any state not explicitly exited stays" — transitions are opt-in, and forgetting an exit condition leaves the FSM stuck (visible in simulation as a hang, which is loud). Idle-default says: "any unhandled situation recovers to IDLE" — self-healing, but it can mask a missing transition as a mysterious early return to IDLE. The course template uses hold-default plus a `default:` case row that recovers to IDLE for *illegal encodings* — stuck-on-missing-arc stays loud, corruption recovers silently. For safety-critical control you would instead route illegal encodings into an explicit ERROR state (next lesson).',
      'The Mealy-vs-Moore choice interacts with pipelining more than beginners expect. A Mealy output is an extra combinational path *from an input to an output* — in a chain of modules, Mealy outputs compose into long input-to-output paths that defeat pipelining: the pipeline register you inserted does not help if the module\'s output bypasses it combinationally. The discipline: inside a module, use Mealy for same-cycle events; at module boundaries, prefer registered (Moore-style) outputs, and if a same-cycle event must cross, register it and accept the cycle — the valid/ready machinery of lesson 3 exists precisely to make that one-cycle delay safe.',
      'One-hot worth a closer look because its benefit is misstated often. The flip-flop count goes UP (N vs log2 N) — one-hot is not an area optimization; it is a *decode* optimization: next-state and output logic compare one bit instead of a compound value, which in LUT-based FPGAs maps to shallow, fast logic. In ASIC standard-cell flows, binary encoding with well-optimized decode often wins on both area and power; synthesis tools there may re-encode one-hot RTL down to binary. Write the encoding that reads best with named localparams, record the choice in the decision log, and let synthesis\'s re-encoding (if any) be checked, not assumed.',
    ].join('\n\n'),
    examples: [
      {
        title: 'A burst-read controller in the two-process template',
        language: 'verilog',
        code: [
          '// Burst controller: on start, request the bus (req_o), wait for',
          '// grant, consume BEATS data beats (data_valid_i), pulse done.',
          '// Moore output: req_o. Mealy-style pulse: done_tick.',
          'module burst_ctrl #(',
          '    parameter integer BEATS = 2',
          ') (',
          '    input  wire clk,',
          '    input  wire reset_n,',
          '    input  wire start_i,       // 1-cycle pulse',
          '    input  wire gnt_i,         // bus grant (level)',
          '    input  wire data_valid_i,  // a data beat is present',
          '    output reg  req_o,         // Moore: bus request',
          '    output wire done_tick      // Mealy: last beat accepted',
          ');',
          '    localparam [1:0] ST_IDLE = 2\'d0;',
          '    localparam [1:0] ST_REQ  = 2\'d1;',
          '    localparam [1:0] ST_DATA = 2\'d2;',
          '',
          '    reg [1:0] st_q;',
          '    reg       cnt_q;              // counts beats 0..BEATS-1 (BEATS=2)',
          '',
          '    wire last_beat = (cnt_q == 1\'b1);   // BEATS-1 for BEATS=2',
          '',
          '    // ---- process 1: state + counter registers ----',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) begin',
          '            st_q  <= ST_IDLE;',
          '            cnt_q <= 1\'b0;',
          '        end else begin',
          '            st_q <= st_d;',
          '            if (st_q == ST_DATA && data_valid_i) begin',
          '                if (last_beat) cnt_q <= 1\'b0;',
          '                else           cnt_q <= cnt_q + 1\'b1;',
          '            end else if (st_q == ST_IDLE) begin',
          '                cnt_q <= 1\'b0;',
          '            end',
          '        end',
          '    end',
          '',
          '    // ---- process 2: next state + outputs (combinational) ----',
          '    always @* begin',
          '        st_d  = st_q;             // default: hold',
          '        req_o = 1\'b0;             // default: Moore outputs low',
          '        case (st_q)',
          '            ST_IDLE: begin',
          '                if (start_i) st_d = ST_REQ;',
          '            end',
          '            ST_REQ: begin',
          '                req_o = 1\'b1;     // Moore: asserted whole state',
          '                if (gnt_i) st_d = ST_DATA;',
          '            end',
          '            ST_DATA: begin',
          '                if (data_valid_i && last_beat) st_d = ST_IDLE;',
          '            end',
          '            default: st_d = ST_IDLE;  // illegal encoding: recover',
          '        endcase',
          '    end',
          '',
          '    assign done_tick = (st_q == ST_DATA) && data_valid_i && last_beat;',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Lines 15-17: states as named localparams, binary encoding, 2 bits. Nothing in the logic depends on the numeric values — re-encoding would not break a single line.',
          'Lines 25-38: process 1, registers only. st_q takes st_d unconditionally; cnt_q advances only on accepted beats and resets in IDLE. Reset covers both registers (module 03 rule).',
          'Lines 41-57: process 2, the cloud. Two defaults first: hold state, Moore outputs low. The case rows are the state diagram\'s arcs, one line each.',
          'Line 49: req_o is Moore — asserted exactly while st_q is ST_REQ, independent of gnt_i timing. A consumer can register req_o safely.',
          'Line 59: done_tick is Mealy — it rises in the same cycle the last beat presents (st DATA + valid + last_beat). Fast, but it is a combinational input-to-output path: consumers should treat it as a pulse and not register chains of it.',
          'Cycle trace (BEATS=2): c0: IDLE, start_i=1 -> st_d=REQ. c1: REQ, req_o=1. gnt_i=1 during c2 -> st_d=DATA. c3: DATA, data_valid_i=1, cnt=0 (not last) -> cnt->1. c4: DATA, cnt=1, data_valid_i=1 -> last_beat: done_tick=1 this cycle, st_d=IDLE, cnt->0. c5: IDLE, done_tick=0. Total: req for 2 cycles, 2 beats consumed at c3/c4, one-cycle done pulse.',
        ],
      },
      {
        title: 'The same FSM one-hot, and why it changes nothing',
        language: 'verilog',
        code: [
          '// One-hot variant of burst_ctrl. Only the localparams and the',
          '// st_q width change; every transition line is identical.',
          'module burst_ctrl_oh #(',
          '    parameter integer BEATS = 2',
          ') (',
          '    input  wire clk, reset_n, start_i, gnt_i, data_valid_i,',
          '    output reg  req_o,',
          '    output wire done_tick',
          ');',
          '    localparam [2:0] ST_IDLE = 3\'b001;   // one-hot: exactly one bit set',
          '    localparam [2:0] ST_REQ  = 3\'b010;',
          '    localparam [2:0] ST_DATA = 3\'b100;',
          '',
          '    reg [2:0] st_q;',
          '    reg       cnt_q;',
          '    wire      last_beat = (cnt_q == 1\'b1);',
          '',
          '    reg [2:0] st_d;',
          '',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) begin',
          '            st_q <= ST_IDLE;  cnt_q <= 1\'b0;',
          '        end else begin',
          '            st_q <= st_d;',
          '            cnt_q <= (st_q == ST_DATA && data_valid_i && !last_beat)',
          '                     ? 1\'b1 :',
          '                     (st_q == ST_IDLE) ? 1\'b0 : cnt_q;',
          '        end',
          '    end',
          '',
          '    always @* begin',
          '        st_d  = st_q;',
          '        req_o = 1\'b0;',
          '        case (1\'b1)               // one-hot idiom: case on the hot bit',
          '            st_q[0]: if (start_i)                 st_d = ST_REQ;',
          '            st_q[1]: begin req_o = 1\'b1;',
          '                           if (gnt_i)             st_d = ST_DATA; end',
          '            st_q[2]: if (data_valid_i && last_beat) st_d = ST_IDLE;',
          '            default:                              st_d = ST_IDLE;',
          '        endcase',
          '    end',
          '',
          '    assign done_tick = (st_q == ST_DATA) && data_valid_i && last_beat;',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Line 15-17: one-hot values — exactly one bit set per state, 3 bits for 3 states (vs 2 for binary). The illegal encodings are now every value with 0 or >1 bits set: seven of eight. The default row recovers from all of them.',
          'The case (1\'b1) idiom selects the row whose expression equals 1 — i.e. the state whose bit is hot. Each row\'s condition is a single-bit test: the decode simplification that makes one-hot fast on LUT fabrics.',
          'Every transition condition (start_i, gnt_i, data_valid_i && last_beat) is character-for-character the binary version\'s. That is the payoff of named localparams: encoding is a header decision, not a logic rewrite.',
          'Cost accounting: 3 FFs vs 2 (one extra flip-flop), decode shallower. On an FPGA the shallow decode usually wins on fmax; in an ASIC the extra FF and routing may not. Record the choice; do not re-litigate per module.',
          'Note the reset loads ST_IDLE = 3\'b001 — a defined, single-hot value. Resetting one-hot state to all-zeros would itself be an illegal encoding: a subtle reset bug this variant makes visible.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'burst_ctrl state diagram',
        content: [
          '                start_i',
          '        +------------------+',
          '        v                  |',
          '   +--------+   start_i   +--------+   gnt_i    +---------+',
          '   | ST_IDLE | ----------> | ST_REQ | ---------> | ST_DATA |',
          '   +--------+             +--------+            +---------+',
          '        ^                      (req_o=1)          | valid &',
          '        |                                         | last_beat',
          '        +-----------------------------------------+',
          '',
          '  Outputs:  req_o      = Moore  (st == ST_REQ)',
          '            done_tick  = Mealy  (st == ST_DATA & valid & last_beat)',
          '',
          '  Arcs are one case row each; every state exits explicitly or',
          '  holds; illegal encodings recover to ST_IDLE via default.',
        ].join('\n'),
        caption:
          'The state diagram and the RTL case statement are the same artifact in two notations: each arc is exactly one case row in process 2.',
      },
    ],
    tables: [
      {
        caption: 'Moore vs Mealy outputs in RTL terms',
        headers: ['Property', 'Moore (state only)', 'Mealy (state + input)'],
        rows: [
          ['RTL form', 'assign o = (st_q == ST_X);', 'assign o = (st_q == ST_X) & in_i;'],
          ['Response time', 'Next cycle (state must change)', 'Same cycle as input'],
          ['Glitches', 'None from inputs', 'Yes: combinational input path'],
          ['Timing impact', 'Registered-style output', 'Input-to-output path in STA'],
          ['Use for', 'Requests, enables, cross-module signals', 'Same-cycle event pulses'],
          ['Across clock domains', 'Still register at boundary', 'Must register at boundary'],
        ],
      },
      {
        caption: 'Binary vs one-hot encoding',
        headers: ['Property', 'Binary', 'One-hot'],
        rows: [
          ['Flip-flops (N states)', 'ceil(log2 N)', 'N'],
          ['Illegal encodings', 'Up to 2^log2N - N', '2^N - N (most values)'],
          ['Decode logic', 'Compound compares', 'Single-bit tests'],
          ['FPGA timing', 'Deeper LUT chains', 'Shallow, usually faster'],
          ['ASIC area/power', 'Usually better', 'More FFs and routing'],
          ['Synthesis may re-encode?', 'Yes', 'Yes — check, do not assume'],
        ],
      },
      {
        caption: 'The two-process FSM template checklist',
        headers: ['Element', 'Rule'],
        rows: [
          ['State register', 'Own process, clocked template, reset to the reset state (e.g. ST_IDLE)'],
          ['Next-state cloud', 'always @*, blocking assigns, st_d'],
          ['Default #1', 'st_d = st_q (hold) — before the case'],
          ['Default #2', 'Every Moore output defaulted before the case'],
          ['Case coverage', 'One row per state, each exit explicit or hold'],
          ['default row', 'st_d = ST_IDLE (or ST_ERROR): illegal encodings recover'],
          ['Outputs', 'Moore by default; Mealy only for same-cycle pulses, documented'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing the FSM as one giant clocked block with the next-state logic inline (nested case inside always @(posedge clk)).',
        fix:
          'It can synthesize correctly, but it buries the state diagram inside sequential code, mixes transfer and decision (blocking/nonblocking traps), and defeats the review flow (arc-by-arc diffing). Two processes, always: register process + cloud. The state diagram stays readable in the code.',
      },
      {
        mistake: 'Relying on the default to mean "stay" and then never writing the default case row.',
        fix:
          'Two different defaults: st_d = st_q before the case (per-cycle hold) and default: inside the case (illegal-encoding recovery). Omitting the second leaves illegal encodings holding in place — corruption sticks forever. Both lines are part of the template; lint checks for them.',
      },
      {
        mistake: 'Making every output Mealy "because it is faster", including module-boundary signals.',
        fix:
          'Mealy outputs are combinational input-to-output paths: they glitch, they extend STA paths, and they compose badly across modules (pipelining cannot cut what bypasses registers). Moore for anything another module registers; Mealy only for same-cycle event pulses, with the choice visible in the output\'s name and comment.',
      },
    ],
    guidedPractice: {
      title: 'Extend the FSM: timeout in ST_REQ',
      brief:
        'Add a timeout: if the grant never arrives within 8 cycles of entering ST_REQ, drop req_o, pulse a req_to_tick (Mealy), and return to IDLE. Decide: new state or counter in ST_REQ? Implement with the template, keeping both defaults intact, and give the full cycle trace for a grant that arrives exactly on cycle 8 (boundary case).',
      starterCode: [
        '// Extend burst_ctrl:',
        '//   - 3-bit timeout counter, cleared on entering ST_REQ',
        '//   - if timeout expires: pulse req_to_tick, go ST_IDLE',
        '//   - gnt and timeout on the same edge: which wins? Decide and',
        '//     document (hint: a granted request is a success; prefer gnt).',
      ].join('\n'),
      expectedBehavior:
        'Counter-in-ST_REQ is the better choice: no new state, the timeout is a property of waiting, and the state diagram stays 3-state. Implementation: tmo_q[2:0] cleared in IDLE, incremented in ST_REQ; in ST_REQ: if (gnt_i) go DATA (gnt wins the tie, documented), else if (tmo expired) go IDLE. req_to_tick = (st_q==ST_REQ) && !gnt_i && tmo_expired (Mealy). Boundary trace: enter REQ at c1, tmo counts c2..c9 (value 0..7 at the 8th wait cycle); gnt exactly at c9: gnt wins -> DATA at c10, no timeout pulse. If gnt at c10: timeout fired at c9 -> IDLE at c10, done; the late gnt at c10 is ignored by the FSM (documented: stale grant).',
      hints: [
        'A timeout is a property of the wait, not a place — resist adding a state.',
        'Priority inside ST_REQ: gnt beats timeout (a granted request is a success).',
        'The stale-grant case (gnt after timeout) needs a spec sentence, like every corner.',
      ],
    },
    practiceExercises: [
      {
        title: 'Draw the case rows',
        brief:
          'A traffic-light controller states: ST_NSG (north-south green), ST_NSY (ns yellow), ST_EWG, ST_EWY. Arcs: timer expiry moves NSG->NSY->EWG->EWY->NSG; a pedestrian request during NSG shortens to NSY. Write the two-process skeleton: localparams, defaults, and the case rows only (no register process needed). Which outputs are Moore?',
        expectedBehavior:
          'Four localparams (2-bit binary), defaults st_d = st_q and all lamps 0, case rows: NSG: lamps; if (timer || ped_req) -> NSY. NSY: if (timer) -> EWG. EWG: if (timer) -> EWY. EWY: if (timer) -> NSG. default -> NSG. All lamp outputs are Moore (functions of state only) — a Mealy output here (lamps reacting to ped_req combinationally) would glitch the lights. The pedestrian input affects only the *transition*, which is the clean way inputs enter Moore machines.',
        hints: [
          'Inputs belong in transition conditions, not in Moore output expressions.',
          'The timer expiry is presumably a level; decide and comment.',
          'default recovers to NSG — justify why that state is the safe home.',
        ],
      },
      {
        title: 'Encoding audit',
        brief:
          'A 7-state ASIC FSM is written one-hot with a case (1\'b1) idiom; the team is moving it to a 0.18 um standard-cell flow where the tool re-encodes to binary. List what must be checked before trusting the re-encode, and which lines of the RTL are guaranteed unaffected.',
        expectedBehavior:
          'Check: (1) reset value loads a legal one-hot state (the tool must map it to the binary reset encoding); (2) the default row still exists after re-encode (tool must add its own recovery or prove full coverage); (3) any hierarchical debug references to state bit positions break (waveform scripts, assertions naming st_q[2]); (4) timing of the new decode verified. Guaranteed unaffected: every transition condition and every output expression written against named localparams — that was the point of not encoding numerically. If any line referenced st_q bit positions directly, re-encoding breaks it.',
        hints: [
          'Re-encoding changes the values, not the graph — what in the RTL reads values?',
          'Reset is an encoding-bearing statement (ST_IDLE = one specific pattern).',
          'Debug infrastructure (waveform decoders) counts as a consumer.',
        ],
      },
    ],
    assessment: {
      title: 'FSM style checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'In the two-process template, what are the two defaults written at the top of the combinational process?',
          options: [
            'st_d = 0 and all outputs = 0',
            'st_d = st_q (hold) and every Moore output at its inactive value',
            'st_d = ST_IDLE and outputs = x',
            'st_d = ST_ERROR and outputs unchanged',
          ],
          answer: 'st_d = st_q (hold) and every Moore output at its inactive value',
          explanation:
            'Hold-default keeps unexited states stuck (loud in simulation rather than silently jumping home), and output defaults guarantee no state can invent an asserted output. The default case row inside the case handles illegal encodings separately.',
          hint: 'Two different "defaults": per-cycle hold and per-case recovery.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt:
            'In burst_ctrl (BEATS=2), the FSM is in ST_DATA with cnt_q=1 and data_valid_i=1 this cycle. What is done_tick this cycle?',
          code: 'assign done_tick = (st_q == ST_DATA) && data_valid_i && last_beat;\nwire last_beat = (cnt_q == 1\'b1);',
          options: ['0', '1', 'x', 'It pulses next cycle'],
          answer: '1',
          explanation:
            'All three terms hold: state is ST_DATA, the beat is valid, and cnt_q==1 is the last beat (BEATS-1). done_tick is Mealy, so it rises in this same cycle — and st_d goes to ST_IDLE for the next.',
          hint: 'Mealy outputs respond in the same cycle as the input.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'One-hot encoding reduces the number of flip-flops an FSM needs.',
          answer: 'false',
          explanation:
            'One-hot increases FF count (N vs ceil(log2 N)); its benefit is shallower decode (single-bit tests), which often improves timing on LUT-based FPGAs. It is a timing/decode optimization, not an area one.',
          hint: 'Count the bits: 4 states binary vs one-hot.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt:
            'A colleague\'s FSM resets with st_q <= 3\'b000 while using one-hot localparams ST_IDLE=3\'b001, ST_REQ=3\'b010, ST_DATA=3\'b100. What is wrong?',
          options: [
            'Nothing; 000 is a valid one-hot value',
            '000 is an illegal one-hot encoding (no bit set); the FSM starts in the default-recovery path every boot until an arc rescues it — reset must load a legal state such as ST_IDLE',
            'One-hot FSMs must reset to 3\'b111',
            'The localparams are in the wrong order',
          ],
          answer:
            '000 is an illegal one-hot encoding (no bit set); the FSM starts in the default-recovery path every boot until an arc rescues it — reset must load a legal state such as ST_IDLE',
          explanation:
            'Reset values are encoding-bearing: with one-hot localparams, a legal state pattern (exactly one bit set) must be loaded. All-zeros is an illegal encoding and lands the FSM in the default row at boot — a subtle, clock-zero bug.',
          hint: 'Which values does the case\'s default row catch?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt:
            'Classify each output of burst_ctrl as Moore or Mealy and justify in one line each: req_o, done_tick.',
          answer:
            'req_o is Moore (function of state only: st_q == ST_REQ, registered-style, glitch-free from inputs); done_tick is Mealy (also reads data_valid_i and last_beat, so it responds in the same cycle the last beat appears)',
          explanation:
            'The classification is purely structural: does the output expression read an input? req_o does not; done_tick does. The timing consequences follow: req_o is safe to register in a consumer; done_tick is a same-cycle pulse.',
          hint: 'Read the output expressions: which mention an input?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Two-process template', definition: 'FSM style: one clocked state-register process plus one combinational next-state/output process.' },
      { term: 'Moore output', definition: 'FSM output that is a function of state only; registered-style timing, glitch-free from inputs.' },
      { term: 'Mealy output', definition: 'FSM output that also reads inputs; same-cycle response but a combinational input-to-output path.' },
      { term: 'State encoding', definition: 'The assignment of localparam values to states: binary (packed) or one-hot (one bit per state).' },
      { term: 'Hold default', definition: 'st_d = st_q before the case: states stay until an explicit arc moves them.' },
      { term: 'Illegal-state recovery', definition: 'The case\'s default row redirecting undefined encodings to a safe state.' },
    ],
    revisionSummary: [
      'Two processes: state register (st_q <= st_d) + cloud (st_d, outputs). The case reads as the state diagram.',
      'Defaults: hold (st_d = st_q) and Moore outputs inactive, before the case; default case row recovers illegal encodings.',
      'Moore = state only (safe, next-cycle); Mealy = state + input (same-cycle, combinational path). Moore at module boundaries.',
      'Binary packs states (area); one-hot spends FFs for shallow decode (FPGA timing). Write named localparams; encoding is a header decision.',
      'One-hot reset must load a legal one-hot state (exactly one bit set) — all-zeros is illegal.',
      'Never let logic depend on encoding numerics; re-encoding by synthesis must be checked, not assumed.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Finite-state machine',
        url: 'https://en.wikipedia.org/wiki/Finite-state_machine',
        kind: 'article',
      },
      {
        label: 'Wikipedia — One-hot',
        url: 'https://en.wikipedia.org/wiki/One-hot',
        kind: 'article',
      },
    ],
    estimatedMinutes: 55,
  },
  {
    id: 'rtl-m05-l2',
    title: 'Robust FSMs: Defaults, Illegal States, and Error Handling',
    summary:
      'Real control must survive the inputs you did not plan for: protocol violations, x-contaminated state, and corrupted encodings. This lesson adds error states, input validation and recovery policy to the template — and shows when a sticky error beats silent recovery.',
    objectives: [
      'Add an explicit ERROR state with sticky error flags and a documented recovery policy.',
      'Validate protocol inputs at state boundaries and define behaviour for violations.',
      'Explain how illegal encodings arise (reset, corruption, x-propagation) and how the default row plus safe synthesis options address each.',
      'Choose between silent recovery and sticky error reporting using the observability rule.',
    ],
    whyItMatters:
      'A FSM that only handles the happy path works in the demo and fails in the field. The inputs that arrive in the wrong state, the grant that shows up after a timeout, the single-event flip that corrupts the state register — these are not exotic: they are Tuesday. The difference between a design that hangs mysteriously in the lab and one that reports a diagnosable error is whether anyone spent an hour defining error behaviour in the spec. This lesson is that hour.',
    prerequisites: ['rtl-m05-l1'],
    explanation: [
      '**Input validation at state boundaries.** Every input that arrives in a state where it is meaningless is a protocol event worth defining. In burst_ctrl: what if gnt_i asserts while in ST_IDLE (a grant with no request)? What if start_i pulses during ST_DATA? The naive FSM ignores both silently — which is fine only if the surrounding system guarantees they cannot happen, and "cannot happen" needs an owner. The robust pattern: detect the violation combinationally (`gnt_bad = (st_q == ST_IDLE) && gnt_i;`), and route it to a defined behaviour: ignore-with-flag, or error-state transition. Ignoring is legitimate when the violation is harmless; the flag is not optional either way — an unobserved violation is indistinguishable from a bug hunt that found nothing.',
      '**The ERROR state.** For violations that make continuing unsafe, add `ST_ERROR`: entered on violation, exited only by reset or an explicit clear command. The ERROR state\'s outputs are the *safe* configuration: requests dropped, data paths idle, and — critically — a sticky error flag (`err_q`) set on entry. Sticky matters: the violation may last one cycle while software polls once per second; a combinational error output would be missed. The FSM\'s structure documents the policy: recovery is never automatic from ERROR (a machine that self-clears its error without the cause being addressed repeats the violation), and the error cause is captured in a cause register when there is more than one violation source.',
      '**Illegal encodings: where they come from.** Three origins, three defenses. (1) **Reset gaps**: if the reset released while the clock was not yet stable, or reset is asynchronous and released unsynchronized, registers can come up in odd patterns — defended by the reset discipline of module 07. (2) **X-contamination in simulation**: an unreset register starts x, x propagates through the case, and the FSM "moves" to x-states that exist in simulation only — defended by complete reset (module 03) and by lint\'s incomplete-assignment checks. (3) **Physical corruption** (single-event effects, or electrical noise): the only defense that works is recovery logic — the default case row, or the tool\'s "safe FSM" option which adds detection-and-repair circuits around the state register. The default row is thus not pedantry; it is the software-visible piece of a hardware reliability story.',
      '**Silent recovery versus sticky error** is an observability decision, and the rule is: **recover silently only when the recovered behaviour is observably identical to correct behaviour; otherwise flag.** Recovering from a corrupted encoding to ST_IDLE is fine when the system\'s next transaction re-establishes all context anyway. Ignoring a protocol violation (grant-without-request) silently is *not* fine when that violation indicates a broken peer — the system will now fail later, further from the cause. When in doubt, flag: an error flag that turns out benign costs one software read; a silent failure that costs a week of debugging costs the error flag\'s weight in gold.',
      'The verification payoff closes the loop: every error path you define in the FSM is a test in the plan. `gnt_bad` -> test: assert grant in IDLE, expect error flag, expect no bus request. ST_ERROR entry -> test: force violation, poll error, issue clear, expect normal operation. The corner-case table of module 02 grows rows for each violation, and the FSM template grows case rows to match. Robustness is not extra code; it is the same template with the spec\'s "what if" rows filled in.',
    ].join('\n\n'),
    deepDive: [
      'The ERROR state design has a subtle trap worth naming: the error *entry* condition must be a combinational detect, but the error *exit* must be registered and explicit. If ERROR exits on the absence of the violation (violation gone -> leave ERROR), the FSM oscillates: violation for one cycle, ERROR for one cycle, back, repeat — a chattering error that software sees as occasional flags and hardware sees as constant disruption. The sticky pattern (stay in ERROR until clear_cmd) makes the state a latch-for-cause: entry once, stay until acknowledged. The template handles both; choose deliberately and document.',
      'Cause capture scales the pattern: when several violations share one ERROR state, register a cause code at entry (`cause_q <= CAUSE_GNT_NO_REQ;`). Two bits of cause register turn "an error happened" into "this error happened", which is the difference between a lab session and a bug ticket that closes itself. The cost is trivial (one small register); the discipline it enforces is that every violation source is enumerated in the spec — you cannot assign cause codes to violations you did not think of, which is exactly the forcing function you want.',
      'Safe-FSM synthesis options deserve an honest paragraph. Tools offer to add recovery circuits (detect illegal encodings, force a known state). This is genuinely useful for reliability-critical designs, but it is *redundancy you are buying*, and it changes the netlist beyond what your RTL describes — timing, area, and formal-equivalence checks all see the augmented machine. The course position: write the default row yourself (it costs one line and documents intent), reserve tool safe-FSM modes for designs with actual SEU requirements, and record the choice in the decision log so the augmented netlist does not surprise the verification team.',
    ].join('\n\n'),
    examples: [
      {
        title: 'burst_ctrl hardened: violation detect, ERROR state, sticky flags',
        language: 'verilog',
        code: [
          '// Hardened burst_ctrl:',
          '//  - ST_ERROR on protocol violations (gnt without req)',
          '//  - sticky err_q + 1-bit cause code',
          '//  - exit from ERROR only via clear_err_i',
          '//  - start during DATA: ignored with a flag (harmless class)',
          'module burst_ctrl_safe (',
          '    input  wire clk, reset_n, start_i, gnt_i, data_valid_i,',
          '    input  wire clear_err_i,    // software acknowledges error',
          '    output reg  req_o,',
          '    output wire done_tick,',
          '    output wire err_o,          // sticky error level',
          '    output wire cause_o         // 0 = gnt-without-request',
          ');',
          '    localparam [2:0] ST_IDLE  = 3\'b001;   // one-hot',
          '    localparam [2:0] ST_REQ   = 3\'b010;',
          '    localparam [2:0] ST_DATA  = 3\'b100;',
          '    localparam [2:0] ST_ERROR = 3\'b000;   // (see note: use a 4th bit',
          '                                          //  in real code; 000 kept',
          '                                          //  here for brevity)',
          '',
          '    reg [2:0] st_q;',
          '    reg       cnt_q;',
          '    reg       err_q;',
          '    reg       cause_q;',
          '    reg       ign_q;      // "start during DATA ignored" flag',
          '',
          '    wire last_beat = (cnt_q == 1\'b1);',
          '    wire gnt_bad   = (st_q == ST_IDLE) && gnt_i;  // protocol violation',
          '    wire start_ign = (st_q == ST_DATA) && start_i; // harmless class',
          '',
          '    reg [2:0] st_d;',
          '',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) begin',
          '            st_q <= ST_IDLE;  cnt_q <= 1\'b0;',
          '            err_q <= 1\'b0;    cause_q <= 1\'b0;   ign_q <= 1\'b0;',
          '        end else begin',
          '            st_q <= st_d;',
          '            // sticky flags: set on event, cleared only by software',
          '            if (gnt_bad)  begin err_q <= 1\'b1; cause_q <= 1\'b0; end',
          '            if (start_ign)            ign_q  <= 1\'b1;',
          '            if (clear_err_i) begin',
          '                err_q <= 1\'b0;  cause_q <= 1\'b0;  ign_q <= 1\'b0;',
          '            end',
          '            cnt_q <= (st_q == ST_DATA && data_valid_i && !last_beat)',
          '                     ? 1\'b1 : (st_q == ST_IDLE) ? 1\'b0 : cnt_q;',
          '        end',
          '    end',
          '',
          '    always @* begin',
          '        st_d  = st_q;',
          '        req_o = 1\'b0;',
          '        case (1\'b1)',
          '            st_q[0]: begin                       // ST_IDLE',
          '                if (gnt_bad)          st_d = ST_ERROR;',
          '                else if (start_i)     st_d = ST_REQ;',
          '            end',
          '            st_q[1]: begin                       // ST_REQ',
          '                req_o = 1\'b1;',
          '                if (gnt_i)            st_d = ST_DATA;',
          '            end',
          '            st_q[2]:                             // ST_DATA',
          '                if (data_valid_i && last_beat) st_d = ST_IDLE;',
          '            default: st_d = ST_ERROR;            // illegal encoding',
          '        endcase',
          '        // ERROR exits ONLY on clear: no arc leaves ST_ERROR here.',
          '    end',
          '',
          '    assign done_tick = (st_q == ST_DATA) && data_valid_i && last_beat;',
          '    assign err_o     = err_q;',
          '    assign cause_o   = cause_q;',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Lines 25-27: violation detection lives combinationally next to the states that define "meaningless" — gnt_bad is only defined relative to ST_IDLE. Detects are per-violation, named, and reusable by both the FSM and the flags.',
          'Lines 44-48: the sticky flag block. err_q sets on the violation cycle and clears ONLY on clear_err_i — software acknowledges, hardware never forgets on its own. The harmless class (start during DATA) gets its own flag (ign_q) rather than an error: the two severities are separated.',
          'Lines 61-63: gnt_bad takes priority over start_i in IDLE — a violation is never masked by a legitimate command. The FSM enters ST_ERROR and the state has no outgoing arc: exits are flag-clear only (per the comment), implemented as: no case row leaves ERROR, so st_d holds there.',
          'The default row now targets ST_ERROR, not ST_IDLE — corrupted encodings are errors to report, not states to quietly resume from. Policy choice, recorded.',
          'Note on line 20: a 3-bit one-hot machine has only 3 legal values; ST_ERROR as 3\'b000 is illegal — the real design uses a 4th bit (ST_ERROR = 4\'b1000). The abbreviated form here is marked so the reader sees the issue rather than absorbing it as a pattern.',
          'Verification rows this hardening creates: gnt in IDLE -> err=1, cause=0, req stays 0; clear -> err=0, normal start accepted; start during DATA -> ign flag only, operation unaffected; corrupt st_q (via TB force) -> ERROR entered, err=1.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'Hardened FSM with ERROR state and violation detects',
        content: [
          '                          start_i (valid)',
          '        +-------------------+',
          '        v                   |',
          '   +--------+  start_i   +--------+  gnt_i  +---------+',
          '   | ST_IDLE | --------> | ST_REQ | ------> | ST_DATA |',
          '   +--------+           +--------+         +---------+',
          '        |  ^                (req_o=1)          |  valid &',
          ' gnt_bad|  | clear_err_i                       |  last_beat',
          ' (viol.)|  | (software only)                    v',
          '        v  |                                  ST_IDLE',
          '   +---------+',
          '   | ST_ERROR |   outputs: req=0, sticky err_q=1,',
          '   +---------+             cause_q = violation class',
          '',
          '  Violation classes:',
          '   gnt_bad (ST_IDLE & gnt_i)   -> ERROR, sticky',
          '   start during DATA           -> ignored + flag (harmless)',
          '   illegal st_q encoding       -> ERROR (default row)',
        ].join('\n'),
        caption:
          'ERROR has exactly one entry class per violation and one exit: explicit software clear. Sticky flags decouple a 1-cycle hardware event from slow software polling.',
      },
    ],
    tables: [
      {
        caption: 'Violation response policy classes',
        headers: ['Violation class', 'Example', 'Response', 'Rationale'],
        rows: [
          ['Harmless but notable', 'start during active burst', 'Ignore + status flag', 'Operation unaffected; observability preserved'],
          ['Unsafe to continue', 'grant without request', 'ERROR state + sticky err', 'Peer may be broken; safe state until acknowledged'],
          ['Corrupted state', 'illegal one-hot encoding', 'ERROR (default row)', 'State no longer meaningful; report, do not guess'],
          ['Transient, self-correcting', 'single-cycle glitch on input', 'Debounce/filter upstream', 'FSM should not see raw glitches'],
        ],
      },
      {
        caption: 'Illegal-encoding origins and defenses',
        headers: ['Origin', 'Symptom', 'Defense'],
        rows: [
          ['Reset gap / unsynced release', 'Odd state after boot', 'Reset synchronizer (module 07), complete reset'],
          ['X-contamination (simulation)', 'x-states in waveforms', 'Reset every register; lint incomplete-assignment'],
          ['Physical bit corruption', 'Field failures, no simulation repro', 'Default case row; tool safe-FSM option if required'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Making ST_ERROR exit automatically when the violation disappears.',
        fix:
          'Automatic exit chatters (violation, ERROR, back, repeat) and re-runs the unsafe sequence the state exists to prevent. Sticky-by-design: enter ERROR on the violation, exit only on explicit clear (reset or software acknowledge). The exit arc exists only if you write it — so do not write it.',
      },
      {
        mistake: 'Ignoring protocol violations completely because "the system should never do that".',
        fix:
          '"Should never" needs an owner: if the peer is verified to never violate, a detection flag costs nothing and proves the assumption in the field; if the peer is not verified, silent ignoring hides its bugs until they surface as your failures. Detect, classify (harmless flag vs error state), and record the decision.',
      },
      {
        mistake: 'Treating x-states in simulation as a tool artifact and moving on.',
        fix:
          'An x in the state register means some register lacks a defined value — usually a missing reset branch or an incomplete assignment. Chase every x to its source before first release: x-propagation in the FSM masks real transitions and makes later waveforms unreadable. Reset completeness (module 03) is the vaccine.',
      },
    ],
    guidedPractice: {
      title: 'Policy design: classify and wire the violations',
      brief:
        'burst_ctrl_safe gains a new input: early_done_i (the data source pulses done before the last beat). Classify it (harmless / unsafe / corrupt) and choose the response; then implement: the detect, the flag or error wiring, and the case-row changes. Also decide and document: does early_done during ST_DATA abort the burst (drop remaining beats) or is it a violation?',
      starterCode: [
        '// New input: early_done_i (pulses from the data source)',
        '// Appears in: ST_DATA (meaningless there?) and other states.',
        '// Questions to answer in code comments:',
        '//   1. Classification and why',
        '//   2. Detect expression(s)',
        '//   3. Flag vs ERROR, and which state transitions change',
        '//   4. The ST_DATA policy: abort vs violation',
      ].join('\n'),
      expectedBehavior:
        'Defensible resolution: early_done during ST_DATA means the source finished early — the remaining beats will never come; the burst cannot complete, so this is "unsafe to continue" for THIS transaction but recoverable: abort the burst (jump to IDLE), pulse a short_tick status flag, do NOT enter ERROR (the FSM itself is fine; the transaction failed). early_done in other states: harmless — ignore with the same flag? No: flag it as a violation of the source protocol (early_done outside DATA is meaningless) — separate detect, ign-style flag. The lesson: one input can produce two violation classes depending on state, and each gets its own detect and its own policy.',
      hints: [
        'Classify per (input, state) pair, not per input.',
        'Transaction failure and FSM failure are different severities.',
        'Every detect you add must appear in the verification rows.',
      ],
    },
    practiceExercises: [
      {
        title: 'Chatter diagnosis',
        brief:
          'A colleague\'s ERROR state exits "when the violation is gone". The field symptom: err_o flickers high roughly every other cycle during a persistent peer fault. Explain the oscillation cycle-by-cycle, then fix the state machine (one arc to delete) and the flag policy.',
        expectedBehavior:
          'Cycle trace: c0 violation present -> enter ERROR (err_q=1). c1 in ERROR, violation absent (FSM dropped req, so the peer\'s bad grant stopped) -> exit arc fires -> IDLE. c2 IDLE: FSM re-issues... (start_i still pending) -> REQ -> peer grants wrongly again -> c3 violation -> ERROR. Period ~4 cycles: the FSM repeatedly re-attempts the sequence that triggers the fault. Fix: delete the violation-absent exit arc from ERROR (sticky until clear_err_i); software then sees one stable error, and the FSM stops re-triggering the peer.',
        hints: [
          'What does the FSM do immediately after leaving ERROR?',
          'The FSM\'s own recovery re-creates the violation precondition.',
          'Sticky exit = software handshake, not state observation.',
        ],
      },
      {
        title: 'Cause codes',
        brief:
          'The hardened FSM now has three violation sources (gnt_bad, early_done-outside-DATA, illegal encoding). Add a 2-bit cause_q with localparam codes, written at ERROR entry, cleared with the error. Write the localparams, the entry-side wiring, and the software-facing register row (access, reset) for the combined err/cause register.',
        expectedBehavior:
          'localparam [1:0] CAUSE_GNT = 2\'d0, CAUSE_EARLY = 2\'d1, CAUSE_STATE = 2\'d2, CAUSE_NONE = 2\'d3 (reset value). Entry wiring: if (gnt_bad) begin err_q<=1; cause_q<=CAUSE_GNT; end etc. — each violation writes its own code; illegal-encoding entry (default row) sets CAUSE_STATE via a registered side-path since the cloud cannot write registers (the detect must be registered: err_q/cause_q update in the clocked block from the same combinational detects the cloud uses). Register row: 0x0 ERR: [0] ERR (R, sticky), [2:1] CAUSE (R), write-1-to-bit0 clears (W1C), reset 0x0. Consistent with the PIT\'s W1C convention.',
        hints: [
          'Cause capture happens in the CLOCKED block (registers!), triggered by the same detects the cloud uses.',
          'Reset value CAUSE_NONE distinguishes "no error yet" from "first cause".',
          'The software-facing register should follow the W1C convention from module 02.',
        ],
      },
    ],
    assessment: {
      title: 'Robust FSM checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'Why must the ERROR state\'s exit be an explicit clear rather than "violation gone"?',
          options: [
            'It saves a register',
            'Automatic exit chatters (re-entering the sequence that caused the fault) and prevents software from observing a stable error',
            'The default case row forbids exits from ERROR',
            'Sticky errors use less combinational logic',
          ],
          answer:
            'Automatic exit chatters (re-entering the sequence that caused the fault) and prevents software from observing a stable error',
          explanation:
            'Leaving ERROR as soon as the violation disappears sends the FSM straight back into the sequence that triggers the fault — oscillation — while software (polling slowly) may never see the error at all. Sticky-until-clear fixes both.',
          hint: 'Trace two cycles after an automatic exit.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'In the hardened FSM, the default case row targets ST_ERROR instead of ST_IDLE. What policy does that encode?',
          options: [
            'Corrupted state encodings are reported as errors, not quietly resumed from',
            'The FSM should power up in ERROR',
            'ST_IDLE is deprecated',
            'Simulation x-states are promoted to errors',
          ],
          answer:
            'Corrupted state encodings are reported as errors, not quietly resumed from',
          explanation:
            'An illegal encoding means the state register no longer holds a meaningful value; the machine cannot know where it was, so it reports (sticky err + cause) and waits for software. Quiet resumption would hide a hardware reliability event.',
          hint: 'What does an illegal encoding tell you about the state register?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'Every protocol violation should escalate to the ERROR state.',
          answer: 'false',
          explanation:
            'Violations are classified: harmless-but-notable (ignore + flag), unsafe-to-continue (ERROR + sticky), corrupted state (ERROR via default). Escalating harmless events buries real errors in noise; the classification is a spec decision made per (input, state) pair.',
          hint: 'Revisit the response-policy table.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt:
            'A simulation shows the FSM "in a state that does not exist" (waveform displays st_q = 3\'bxxx) after reset is released. What is the most likely root cause?',
          options: [
            'The one-hot encoding is too narrow',
            'A register (state or supporting) lacks a reset assignment, so x contaminates the state at simulation start',
            'The default case row is missing',
            'The FSM uses blocking assignments',
          ],
          answer:
            'A register (state or supporting) lacks a reset assignment, so x contaminates the state at simulation start',
          explanation:
            'X in the state register after reset means some register started undefined — the classic missing-reset-branch signature. The default row cannot help (x matches no one-hot row cleanly); fix the reset completeness first, then verify the default row for physical corruption.',
          hint: 'Where does x come from, mechanically?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt:
            'State the observability rule for choosing silent recovery versus sticky error reporting.',
          answer:
            'Recover silently only when the recovered behaviour is observably identical to correct behaviour; otherwise flag (sticky) — a benign error flag costs one software read, a silent failure costs a debugging week',
          explanation:
            'The rule prices both mistakes: over-flagging annoys, under-flagging hides. Since flags are cheap and silence is expensive when wrong, when in doubt, flag.',
          hint: 'Compare the cost of a spurious flag with the cost of a hidden failure.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Protocol violation', definition: 'An input arriving in a state where it is meaningless; detected combinationally and classified.' },
      { term: 'ERROR state', definition: 'A safe state entered on unsafe violations; no automatic exit, sticky error flag set on entry.' },
      { term: 'Sticky error flag', definition: 'Error register set on violation, cleared only by explicit software acknowledge (W1C-style).' },
      { term: 'Cause code', definition: 'A small register capturing which violation triggered the error, written at entry.' },
      { term: 'Safe FSM', definition: 'Synthesis option adding hardware detection/repair of illegal state encodings; a deliberate redundancy purchase.' },
      { term: 'X-contamination', definition: 'Undefined values propagating from unreset registers; simulation-only but masking real transitions.' },
    ],
    revisionSummary: [
      'Classify every (input, state) violation: harmless (flag), unsafe (ERROR + sticky), corrupt (default row -> ERROR).',
      'ERROR sticky-by-design: entry on violation, exit only on explicit clear; automatic exit chatters.',
      'Cause codes turn "an error happened" into "this error happened" — one small register, huge debug value.',
      'Illegal encodings arise from reset gaps, x-contamination and physical corruption; defenses: reset discipline, lint, default row.',
      'One input can carry two violation classes depending on state — detect per (input, state) pair.',
      'Every defined error path is a verification row; robustness is spec completion, not extra code.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Finite-state machine',
        url: 'https://en.wikipedia.org/wiki/Finite-state_machine',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Fail-safe',
        url: 'https://en.wikipedia.org/wiki/Fail-safe',
        kind: 'article',
      },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'rtl-m05-l3',
    title: 'Control-Datapath Interaction and valid/ready Handshakes',
    summary:
      'Control commands the datapath through a named contract and reads back status; modules talk to each other through valid/ready. This lesson formalizes both: the contract discipline, the handshake rules, and a full-rate register slice with backpressure traced cycle by cycle.',
    objectives: [
      'Define and enforce a control-datapath contract: named commands, named status, no hidden crossings.',
      'State the four valid/ready rules and explain why valid must never wait for ready.',
      'Implement a full-rate valid/ready register slice and predict its behaviour under backpressure.',
      'Trace transfers, stalls and simultaneous drain/load cycles on a handshake waveform.',
    ],
    whyItMatters:
      'Between every datapath and its controller, and between every pair of modules, lives a protocol — and most integration bugs are protocol bugs: a command asserted one cycle early, a status read before it updates, a valid that drops while the receiver was busy. The control-datapath contract and the valid/ready handshake are the two standard answers. Learn them once here and every later module (pipelining, the capstone) is an application; skip them and every integration becomes a waveform-archaeology session.',
    prerequisites: ['rtl-m05-l1', 'rtl-m04-l1'],
    explanation: [
      '**The control-datapath contract** generalizes what the PIT did in module 02: the controller (FSM) owns decisions, the datapath owns data, and the boundary is a *named, closed* signal list. Direction 1, control to datapath: commands — `count_load`, `acc_clear`, `mux_sel` — each named for what it makes the datapath do on that edge. Direction 2, datapath to control: status — `tc_tick`, `count_zero`, `acc_overflow` — each named for what it observed. Three prohibitions make the contract real: control does not duplicate datapath registers (one source of truth, module 02); datapath does not read control\'s state registers except through the contract signals; and no signal crosses the boundary without being in the contract list. When a review finds a fifteenth unnamed wire between control and datapath, the partition is wrong — refactor, do not annotate.',
      '**The valid/ready handshake** is the standard two-signal transfer between modules. The producer asserts `valid` when data is present; the consumer asserts `ready` when it can accept; a **transfer occurs on any cycle where both are high**, and both sides agree on that definition. The rules that make it race-free: (1) `valid` must not depend combinationally on `ready` (a producer that only raises valid when it sees ready creates a combinational loop through the consumer and deadlocks two such modules back-to-back); (2) once `valid` is high, the producer must hold it — and hold the data stable — until the transfer cycle; (3) `ready` may rise and fall freely; (4) if the producer has nothing to send, valid is low and ready is irrelevant. These four rules are the whole protocol — everything else (credits, skid buffers) is throughput engineering on top.',
      'Rule 1 deserves its emphasis because it is the one beginners break. "Assert valid when ready" feels polite, but chain two such producers and neither raises valid until the other does: deadlock at time zero. The correct producer raises valid whenever data exists, and simply *waits* if ready is low — the waiting is the protocol working. The tell in review: any expression computing valid that reads ready is a bug (or at best a documented exception in a loop-free path).',
      '**Backpressure is the handshake working, not failing.** When a consumer deasserts ready, producers hold; data does not vanish, it waits. The waveform habit: mark transfer cycles (valid && ready) explicitly, and check the two invariants — no transfer without valid-and-ready together, no valid dropped before its transfer. A register slice (next example) demonstrates both: it accepts when empty, holds under backpressure, and drains on ready.',
      'The **full-rate register slice** is the smallest useful handshake citizen and the seed of every pipeline stage in module 06: one register holding the beat, `ready_o = !full_q`, `valid_o = full_q`, accepting whenever the slot is free *or* draining this cycle. The subtle full-rate trick: when full and draining while the producer offers a new beat, the register reloads the same edge — the outgoing transfer and the incoming capture happen on one clock edge, which is what keeps sustained throughput at one beat per cycle despite the storage of only one beat.',
    ].join('\n\n'),
    deepDive: [
      'Why is one register enough for full rate? Follow the worst case: full with beat X, consumer ready, producer offering Y. This edge: the consumer samples data_o = X (transfer out), and the register loads Y (transfer in). Both events share the edge because "empty next cycle" and "captured this edge" are the same assignment: full_q <= load, where load = valid_i && (!full_q || ready_i). The only cost is that during that edge the downstream saw X while Y was already arriving — invisible to both sides because each side\'s view is consistent at the edge. A slice with zero registers (pure combinational passthrough, ready_o = ready_i) would be faster but creates combinational ready chains across modules — the very paths that break timing and deadlock loops. One register buys independence.',
      'The contract discipline scales to interrupt-driven and status-polled control, not just FSM commands. The PIT\'s cfg bus is a contract (decode is the command side, rdata the status side); the burst controller\'s req/gnt/valid is a contract; the ERROR flags of lesson 2 are status. The general form: for every command signal, a one-sentence spec ("assert for exactly one cycle to..."); for every status signal, a one-sentence spec ("asserted while...", "updated on..."). That sentence pair is what the verifier turns into checks and the integrator turns into glue. A signal without its sentence is a future support ticket.',
      'Handshake composition has one more property worth knowing before module 06: valid/ready slices chain. Connect N slices and you have an N-deep elastic FIFO with per-stage backpressure; the transfer rate under sustained load remains one beat per cycle (each stage\'s drain/load overlaps), and latency is N cycles. The pipeline lesson formalizes this as throughput/latency accounting — but the mechanical truth is already here: stages are slices, backpressure propagates backward one stage per cycle, and bubbles (cycles with valid low) propagate forward. Every stall/flush mechanism in real pipelines is bookkeeping on these two wave types.',
    ].join('\n\n'),
    examples: [
      {
        title: 'A full-rate valid/ready register slice',
        language: 'verilog',
        code: [
          '// One-beat elastic register: the unit of pipeline construction.',
          '// Rules obeyed: valid_i independent of ready_o; valid held until',
          '// transfer; ready_o free-running; transfer == valid_o && ready_i.',
          'module vr_slice #(',
          '    parameter integer WIDTH = 8',
          ') (',
          '    input  wire             clk,',
          '    input  wire             reset_n,',
          '    // producer side',
          '    input  wire             valid_i,',
          '    input  wire [WIDTH-1:0] data_i,',
          '    output wire             ready_o,     // !full',
          '    // consumer side',
          '    output wire             valid_o,     // full',
          '    output wire [WIDTH-1:0] data_o,',
          '    input  wire             ready_i',
          ');',
          '    reg       full_q;',
          '    reg [WIDTH-1:0] data_q;',
          '',
          '    // Accept when slot free, or when draining this very edge.',
          '    wire load = valid_i && (!full_q || ready_i);',
          '',
          '    assign ready_o = !full_q;',
          '    assign valid_o = full_q;',
          '    assign data_o  = data_q;',
          '',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) begin',
          '            full_q <= 1\'b0;',
          '            data_q <= {WIDTH{1\'b0}};',
          '        end else begin',
          '            full_q <= load;',
          '            if (load) data_q <= data_i;   // capture (may replace',
          '        end                               //  a draining beat)',
          '    end',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Line 22: the load condition is the heart. Slot free (!full_q) -> accept; slot full but draining this edge (ready_i) -> accept and replace. When full and NOT draining: load = 0, beat held — backpressure upstream via ready_o = 0.',
          'Lines 24-26: the two sides of the register. The producer sees ready_o (can I give?); the consumer sees valid_o/data_o (is something here?). Neither side sees the other\'s signal combinationally — the register decouples them, which is what kills combinational ready/valid chains.',
          'Lines 28-36: full_q <= load is the entire state update; data_q captures only on load. The simultaneous drain-and-reload case is handled by the same two lines: the old beat transfers at the edge (it was visible all cycle) and the new beat lands.',
          'Trace A (steady flow, no stalls): c0: valid_i=1 (d1), empty -> load, ready_o=1. c1: full, valid_o=1 (d1 out if ready_i=1); valid_i=1 (d2) -> load (drain+reload). c2: full (d2)... one beat per cycle sustained, latency 1.',
          'Trace B (backpressure): c1: full (d1), ready_i=0, valid_i=1 (d2 offered) -> load=0: d1 held, ready_o=0, producer must hold d2 (rule 2). c2: ready_i=1 -> d1 transfers out AND d2 loads in one edge. No loss, no duplication.',
          'Trace C (idle gap): valid_i=0 for cycles while empty -> load=0, full stays 0, valid_o=0: consumer sees an idle gap, which is legal (valid low simply means nothing this cycle).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'vr_slice under backpressure (traces A and B)',
        content: [
          '         __    __    __    __    __    __    __',
          'clk   __|  |__|  |__|  |__|  |__|  |__|  |__|  |__',
          '        c0    c1    c2    c3    c4    c5',
          '',
          'valid_i ==/‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\\___/‾‾‾‾',
          'data_i  ===X==d1====X==d2==============X==d3=',
          'ready_o ==/‾‾‾\\________________________/‾‾‾‾',
          '            (c1: full -> ready drops)',
          '',
          'ready_i ______/‾‾‾‾‾‾‾‾‾‾\\___________/‾‾‾‾‾‾',
          '              (stall c2-c3)   (accept again c5)',
          '',
          'valid_o ________/‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾/‾‾‾‾‾‾‾',
          'data_o  =======X==d1======X==d1====X==d2===',
          '                           ^held through',
          '                            the stall',
          '',
          'Transfers (valid_o & ready_i): c2 (d1), c5 (d2)',
          'd2 waited at the input (valid_i held, rule 2);',
          'c2 drained d1 and loaded d2 on the same edge.',
        ].join('\n'),
        caption:
          'educational waveform (illustrative): the stall (ready_i low) freezes data_o at d1; the producer holds d2; the recovery edge does drain-and-reload in one clock.',
      },
      {
        kind: 'block',
        title: 'Control-datapath contract, generalized',
        content: [
          '            +------------------+    commands   +----------------+',
          '   inputs ->|     CONTROL      | ------------> |    DATAPATH    |',
          '   (FSM)    |  st_q, flags     |  (load, sel,  |  data regs,    |',
          '            |                  |   clear, en)  |  operators     |',
          '            |                  | <------------ |                |',
          '            +------------------+    status     +----------------+',
          '                                       (tick, zero, overflow)',
          '',
          '  Contract rules:',
          '   1. Every crossing signal is in the named list (closed set)',
          '   2. Control never duplicates datapath state (one source of truth)',
          '   3. Datapath never reads control state registers directly',
          '   4. Every command: "assert for exactly one cycle to ..."',
          '   5. Every status: "asserted while ... / updated on ..."',
        ].join('\n'),
        caption:
          'The boundary is a named, closed, documented signal set. An unnamed fifteenth wire is a partition failure, not a wiring detail.',
      },
    ],
    tables: [
      {
        caption: 'The valid/ready rules and their failure modes',
        headers: ['Rule', 'Statement', 'If broken'],
        rows: [
          ['1', 'valid must not depend combinationally on ready', 'Combinational loop; deadlock between two polite modules'],
          ['2', 'valid held (with data stable) until the transfer cycle', 'Lost or corrupted beats under backpressure'],
          ['3', 'ready may rise/fall freely each cycle', '(This is a freedom, not a constraint — consumers rely on it)'],
          ['4', 'Transfer exactly when valid && ready, both sides agree', 'Double-consumption or skipped beats'],
        ],
      },
      {
        caption: 'vr_slice cycle behaviours',
        headers: ['full_q', 'valid_i', 'ready_i', 'Action this edge', 'Transfer out?'],
        rows: [
          ['0', '1', 'x', 'load beat', 'no (was empty)'],
          ['1', 'x', '0', 'hold; ready_o=0 (backpressure)', 'no'],
          ['1', '1', '1', 'drain + reload same edge', 'yes'],
          ['1', '0', '1', 'drain', 'yes'],
          ['0', '0', 'x', 'idle', 'no'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Computing valid as valid = have_data && ready (the "polite producer").',
        fix:
          'This builds a combinational dependency of valid on ready — a loop through any consumer whose ready depends on valid, and instant deadlock between two polite modules back-to-back. Correct: valid = have_data alone; wait for ready. The waiting IS the protocol.',
      },
      {
        mistake: 'Dropping valid (or changing data) when ready does not arrive on the first cycle.',
        fix:
          'Rule 2: once valid is up, it and the data are held until the transfer. A producer that withdraws an offer because the consumer hesitated loses beats silently under load — the exact scenario the handshake exists to make impossible. Test with a consumer that stalls randomly.',
      },
      {
        mistake: 'Letting the control block read datapath registers directly "just this once" for a quick status check.',
        fix:
          'Direct reads outside the contract work until the datapath is refactored or retimed — then the hidden crossing breaks silently. Every status the control needs becomes a named contract signal (count_zero, tc_tick) with its one-sentence spec. The contract list is the design\'s promise to its own future.',
      },
    ],
    guidedPractice: {
      title: 'Build a two-deep elastic buffer',
      brief:
        'Chain two vr_slice instances (WIDTH=8) producer-to-consumer. State the total latency from producer valid to consumer data, the sustained throughput, and what happens when the consumer stalls for 3 cycles while the producer offers 4 beats — which beat is where after the stall, and how many were lost?',
      starterCode: [
        '// Compose:',
        '//   vr_slice #(.WIDTH(8)) s0 (.valid_i(p_valid), .data_i(p_data),',
        '//                            .ready_o(p_ready), ...);',
        '//   vr_slice #(.WIDTH(8)) s1 (.valid_i(s0_valid), ...);',
        '// Producer: p_valid/p_data/p_ready  Consumer: c_ready',
        '// Questions: latency? sustained throughput? 4 beats vs 3-cycle',
        '// stall: where does each beat land, what is lost?',
      ].join('\n'),
      expectedBehavior:
        'Latency: 2 cycles (one register per slice). Sustained throughput: 1 beat/cycle (each slice drain-reloads). 4 beats (d1..d4) with a 3-cycle stall: d1 sits in s1 at the stall start (transfers on stall cycle 1 if c_ready high at that edge... precisely: assume consumer stalls from cycle k: d1 transfers at k, d2 is in s1 held, d3 in s0 held, d4 at producer input held — three beats parked in the two-deep structure, none lost. When ready returns: drain-refill chain, one beat per cycle, all four delivered. Loss is impossible by rule 2 — that is the point of the exercise: verify you can account for every beat.',
      hints: [
        'Draw the two registers and walk each beat cycle by cycle.',
        'Each slice parks exactly one beat; the producer parks the rest.',
        'Nothing is ever lost if both sides obey the rules — prove it with the trace.',
      ],
    },
    practiceExercises: [
      {
        title: 'Protocol violation hunt',
        brief:
          'A producer module computes valid_o = have_data & ready_i (it read the consumer\'s ready through the boundary). Two instances are chained A->B. Describe the behaviour at time zero and after reset release, then fix the producer with a one-line change.',
        expectedBehavior:
          'At time zero neither has data: A.valid = have_data_A & B.ready; B.ready may depend (through its slice) on A\'s ready... with both sides politely waiting on the other\'s offer, a cycle where both have_data and both read the other\'s valid/ready computes to 0 on both sides simultaneously and can persist — a combinatorial standoff (and a genuine combinational loop if ready is also derived from valid). Fix: valid_o = have_data; (drop the ready term). The producer then waits; the handshake converges in one cycle.',
        hints: [
          'Rule 1 exists precisely for this: valid must not read ready.',
          'Substitute both sides\' expressions into each other and look for the fixed point.',
          'The fix makes the producer "impolite" — which is the protocol requirement.',
        ],
      },
      {
        title: 'Contract writing',
        brief:
          'Write the one-sentence spec for each signal of a checksum-accumulator pair: cmd_acc_clear, cmd_acc_load, st_acc_done_tick, st_acc_overflow. Then list which are commands and which status, and which direction each crosses.',
        expectedBehavior:
          'cmd_acc_clear (control->datapath): "Assert for exactly one cycle to zero the accumulator on the next edge." cmd_acc_load (control->datapath): "Assert with acc_en to add data_i this edge." st_acc_done_tick (datapath->control): "One-cycle pulse when the terminal count is reached this edge." st_acc_overflow (datapath->control): "Asserted while the accumulator holds a saturated value; updates on the edge that saturates." Commands are one-cycle pulses per convention; status declares its persistence (pulse vs level) — the persistence sentence is what lets control code it correctly.',
        hints: [
          'Command sentences specify duration (one cycle) and effect (which edge).',
          'Status sentences must say pulse or level — the control logic differs.',
          'Direction follows ownership: who causes it vs who observes it.',
        ],
      },
    ],
    assessment: {
      title: 'Handshake and contract checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'When exactly does a valid/ready transfer occur?',
          options: [
            'On any cycle where valid is high',
            'On any cycle where ready is high',
            'On any cycle where both valid and ready are high',
            'On the cycle after both have been high once',
          ],
          answer: 'On any cycle where both valid and ready are high',
          explanation:
            'Both sides must agree on the transfer instant, and valid&&ready is the only definition both can evaluate consistently. Everything else (holding, backpressure) exists to make this one rule safe.',
          hint: 'One condition, evaluated identically by both parties.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'bug-identification',
          prompt:
            'Which line breaks a valid/ready rule?',
          code: [
            'assign ready_o = !full_q;',
            'assign valid_o = have_data & ready_i;   // line A',
            'always @(posedge clk)',
            '    if (valid_o && ready_i) have_data <= 1\'b0;  // line B',
          ].join('\n'),
          options: [
            'Line A: valid must not depend combinationally on ready (rule 1)',
            'Line B: clearing have_data must wait one more cycle',
            'Line A is fine because ready_i is an input',
            'Both lines are correct',
          ],
          answer: 'Line A: valid must not depend combinationally on ready (rule 1)',
          explanation:
            'valid_o reads ready_i combinationally — the polite-producer bug. Chained politely, modules deadlock; chained with a ready-derived-from-valid consumer, it is a combinational loop. Line B is a correct clearing of the flag after a transfer.',
          hint: 'Which expression reads the other side\'s signal?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt:
            'In vr_slice: full_q=1 (holding d1), ready_i=1, valid_i=1 (d2 offered). What does the consumer see this cycle, and what does data_q hold next cycle?',
          code: 'wire load = valid_i && (!full_q || ready_i);',
          options: [
            'Consumer sees d1; data_q holds d2 next cycle (drain + reload)',
            'Consumer sees d2; d1 is lost',
            'Consumer sees d1; d2 is lost',
            'Nothing transfers this cycle',
          ],
          answer: 'Consumer sees d1; data_q holds d2 next cycle (drain + reload)',
          explanation:
            'load=1 via the ready_i term: the visible beat d1 transfers at the edge while data_q captures d2. That same-edge drain-and-reload is what sustains one beat per cycle.',
          hint: 'The consumer sees what was visible DURING the cycle.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt:
            'In a control-datapath partition, the control block may keep its own copy of the datapath counter to avoid extra status wires.',
          answer: 'false',
          explanation:
            'Two registers holding one value is two sources of truth; they will disagree after the first corner case. Control reads status signals derived from the datapath\'s registers (zero detects, ticks) — the contract exists to keep exactly this from happening.',
          hint: 'What happens when the copy and the original update on different conditions?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt:
            'A consumer stalls for 3 cycles while a producer offers 4 beats through two chained vr_slices. How many beats are lost, and why?',
          answer: 'None — valid is held until transfer (rule 2) and each slice parks one beat, so all four beats wait in the chain and drain one per cycle once ready returns',
          explanation:
            'Backpressure propagates backward: held beats park in slice registers and the producer holds its current offer. Loss is only possible by breaking rule 2 (withdrawing valid) or rule 1 (ready-dependent valid).',
          hint: 'Count the parking spots: two registers plus the producer\'s held beat.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Control-datapath contract', definition: 'The named, closed signal list crossing the partition, each with a one-sentence spec.' },
      { term: 'valid/ready handshake', definition: 'Two-signal transfer protocol: transfer exactly on cycles where both are high.' },
      { term: 'Backpressure', definition: 'A consumer deasserting ready, causing producers to hold valid and data.' },
      { term: 'Register slice', definition: 'A one-beat elastic register (vr_slice): the unit of pipeline construction.' },
      { term: 'Full rate', definition: 'Sustained one-transfer-per-cycle operation, achieved by same-edge drain-and-reload.' },
      { term: 'Skid buffer', definition: 'A deeper elastic buffer that keeps full rate when backpressure starts mid-stream.' },
    ],
    revisionSummary: [
      'Contract: named commands and status, closed list, no duplicated state, no hidden crossings; every signal gets a one-sentence spec.',
      'valid/ready: transfer = valid && ready; valid independent of ready (rule 1); valid+data held until transfer (rule 2).',
      'The polite producer (valid reading ready) deadlocks and loops — valid = have_data, full stop.',
      'vr_slice: ready_o = !full, load = valid_i && (!full || ready_i); same-edge drain-and-reload gives full rate.',
      'Backpressure parks one beat per slice and holds the producer — nothing is lost when the rules hold.',
      'Chained slices = elastic pipeline: latency N, throughput 1/cycle — the mechanical base of module 06.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Pipeline (computing)',
        url: 'https://en.wikipedia.org/wiki/Pipeline_(computing)',
        kind: 'article',
      },
      {
        label: 'Wikipedia — First-in, first-out (computing and electronics)',
        url: 'https://en.wikipedia.org/wiki/FIFO_(computing_and_electronics)',
        kind: 'article',
      },
    ],
    estimatedMinutes: 55,
  },
];
