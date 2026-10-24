import type { TutorialLesson } from '../types';

export const module07Lessons: TutorialLesson[] = [
  {
    id: 'de-m07-l01',
    title: 'Finite-State Machines: States, Diagrams, and Transition Tables',
    summary:
      'The design language of sequential control: what makes a machine finite-state, drawing state diagrams, writing state/transition tables, and the reset-to-initial-state rule that makes FSMs verifiable.',
    objectives: [
      'Define an FSM formally: states, inputs, outputs, transition function, initial state.',
      'Draw a state diagram from a written behavior specification and vice versa.',
      'Write the transition table (and Moore output table) that a diagram represents.',
      'Trace an input sequence through an FSM step by step, edge by edge.',
    ],
    whyItMatters:
      'Every controller you will ever design — bus arbiters, protocol handlers, traffic lights, vending machines, CPU control units — is an FSM. The state diagram is the *contract* between you and your reviewer; the transition table is the contract between you and the gates. This module turns behavior written in English into hardware you can verify, using the flip-flops of Module 6 as the storage.',
    prerequisites: ['de-m06-l02'],
    explanation:
      '### What an FSM is\n\nA **finite-state machine** is a system with:\n\n1. A **finite set of states** — each summarizing all the relevant history in one symbol.\n2. **Inputs** — events observed each clock cycle.\n3. A **transition function** — next state = f(current state, inputs).\n4. **Outputs** — either from the state alone or from state plus inputs (the Moore/Mealy split, next lesson).\n5. A **known initial state** — established by reset.\n\n"Finite" is the point: the machine cannot remember an unbounded past, only which of its states it is in. Designing an FSM is deciding what the *relevant* history is and naming it with as few states as possible.\n\n### From English to diagram\n\nSpecification: "a light turns on when a button is pressed and stays on until a second press". States: OFF, ON. Transitions:\n\n```\n  +------+   button    +------+\n  | OFF  | ----------> | ON   |\n  |  z=0 |             | z=1  |\n  +------+ <---------- +------+\n             button\n```\n\nOne arrow per (state, input) combination — completeness is not optional: if an input arrives and no arrow leaves the state, the machine has a hole that synthesis will fill with something arbitrary. The output z is written *inside* each state box (Moore style).\n\n### From diagram to transition table\n\nThe table is the same information in the form gates consume:\n\n```\n state | input=0 next | input=1 next | z\n OFF   | OFF          | ON           | 0\n ON    | ON           | OFF          | 1\n```\n\nEvery row lists the next state for *each* input value. After encoding states as bit patterns (next lessons), each "next" column becomes a Boolean function of current-state bits and inputs — K-maps from Module 4 do the rest.\n\n### Tracing: the acceptance test\n\nRun a sequence through the table one edge per step. For the machine above with input stream 0,1,0,1:\n\n```\nstep:   start  1     2     3     4\nstate:  OFF    ON    OFF   OFF?  ...\n```\n\nCareful — step 3 sees input 0 in state ON: no arrow for (ON, 0)? There is: ON --0--> ON (stay). Full trace: OFF -1-> ON -0-> ON -1-> OFF... every input combination must be decidable. If you cannot complete a trace, the diagram is incomplete — that is the single most common FSM design error, and reviewers (and verification engineers) hunt exactly for it.',
    deepDive:
      '### Why reset is part of the specification\n\nAn FSM with no defined initial state is untestable: its first output depends on garbage in the state flip-flops. Hardware answers with **reset** (async or sync, Module 6) forcing a named home state. In verification the reset sequence is also how simulation begins; in formal methods it is the starting point of all proofs. Treat "reset -> home state" as an explicit arrow in every diagram you draw — including self-loops that return to home on error, which give machines a recovery path.\n\n### State explosion and abstraction\n\nReal controllers can need hundreds of states. The defense is hierarchy: sub-machines with clean interfaces, and *data* kept in registers/counters while the FSM keeps only *status* (idle/busy/done). A classic mistake is encoding a counter value as FSM states ("state 0, state 1, ... state 255") — that is a counter (Module 6 lesson 4), not a state machine. The skill of separating control states from datapath values is what makes the processor course\'s control units readable.',
    examples: [
      {
        title: 'A two-state FSM modeled and traced in C',
        language: 'c',
        code:
          '#include <stdio.h>\n\n/* FSM: output 1 whenever the last TWO input bits were both 1.\n   States: S0 = no useful history, S1 = last bit was 1,\n           S11 = last two bits were 11 (output active). */\nint main(void) {\n    const char *bits = "01101110";\n    int state = 0;                    /* reset -> S0 */\n\n    for (int i = 0; bits[i] != \'\\0\'; i++) {\n        int in = bits[i] - \'0\';\n\n        /* transition function: one row per (state, input) */\n        int next;\n        if (state == 0)      next = in ? 1 : 0;\n        else if (state == 1) next = in ? 2 : 0;\n        else                 next = in ? 2 : 0;   /* from S11 */\n\n        state = next;                     /* clock edge: commit */\n        printf("input %d -> state %d, output %d\\n",\n               in, state, state == 2);\n    }\n    return 0;\n}',
        explanation: [
          'Three states capture exactly the history that matters: nothing, one trailing 1, two trailing 1s. Anything longer (111) still maps to S11 — the machine *forgets* gracefully.',
          'The if/else chain is the transition table in executable form: every (state, input) pair is covered — completeness by construction.',
          '`state = next` models the clock edge; the output is read *after* committing, i.e., it is a function of the (new) state — a Moore output.',
          'Tracing 01101110 prints outputs 0,0,1,0,0,1,1,0: the two 11 occurrences are caught, including the overlap at the 111 run.',
          'Changing the spec ("exactly two") would change one transition — FSMs localize spec changes to specific arrows.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'The two-state light controller (Moore)',
        content:
          '            button=1\n   +--------------------------------+\n   |                                v\n +------+    button=1          +------+\n | OFF  | -------------------> | ON   |\n | z=0  | <------------------- | z=1  |\n +------+    button=1          +------+\n\n  (self-loops omitted: OFF --button=0--> OFF,  ON --button=0--> ON)\n  every (state, input) pair has an arrow: the diagram is COMPLETE\n  reset: -> OFF',
        caption:
          'States as boxes with outputs inside (Moore); arrows labeled with the input that causes the transition.',
      },
    ],
    tables: [
      {
        caption: 'Transition table for the light controller',
        headers: ['Current state', 'input=0 -> next', 'input=1 -> next', 'Output z (Moore)'],
        rows: [
          ['OFF', 'OFF', 'ON', '0'],
          ['ON', 'ON', 'OFF', '1'],
        ],
      },
      {
        caption: 'Transition table for the 11-detector',
        headers: ['Current state', 'in=0 -> next', 'in=1 -> next', 'Output (Moore)'],
        rows: [
          ['S0 (nothing)', 'S0', 'S1', '0'],
          ['S1 (last=1)', 'S0', 'S11', '0'],
          ['S11 (last=11)', 'S0', 'S11', '1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Leaving (state, input) combinations without a defined next state.',
        fix:
          'After drawing, check every row of the transition table has an entry for every input value — add self-loops where behavior is "ignore". Synthesis will not warn you; it will silently build something.',
      },
      {
        mistake: 'Creating a state for every count value instead of using a counter.',
        fix:
          'States encode *control* situations, not data. If you can write "state = n" with n from a counter, use a counter plus one or two status states. FSMs stay small; datapaths stay wide.',
      },
      {
        mistake: 'Forgetting the reset/home state in the diagram.',
        fix:
          'Draw an explicit reset arrow into the home state (or state it as a global rule). Every trace, every testbench, and every formal proof begins there.',
      },
    ],
    guidedPractice: {
      title: 'Specify and trace a vending-machine FSM',
      brief:
        'A machine accepts one coin at a time: two coins release the product (output dispense=1 for that cycle) and return to idle. Define the states, draw (or describe) the complete diagram with self-loops, write the transition table, and trace the input stream coin: 1,1,1,1.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    /* states: 0 = IDLE (0 coins), 1 = ONE (1 coin) */\n    const int coins[4] = {1, 1, 1, 1};\n    int state = 0;\n    for (int i = 0; i < 4; i++) {\n        int dispense = 0;\n        if (state == 0 && coins[i]) state = 1;\n        else if (state == 1 && coins[i]) { state = 0; dispense = 1; }\n        /* coin=0: self-loop in both states */\n        printf("coin %d -> state %d, dispense %d\\n", coins[i], state, dispense);\n    }\n    return 0;\n}',
      expectedBehavior:
        'States: IDLE (0 coins held) and ONE (1 coin held). Arrows: IDLE -coin=1-> ONE; IDLE -coin=0-> IDLE; ONE -coin=1-> IDLE with dispense=1 (Mealy-style output on the arrow, or a DONE state in Moore style); ONE -coin=0-> ONE. Trace of 1,1,1,1: dispenses after coin 2 and after coin 4 — two products for four coins.',
      hints: [
        'Output-on-arrow (Mealy) is natural here; a Moore version needs an extra DONE state that self-clears.',
        'Do not forget the coin=0 self-loops — they are the completeness rows.',
        'After each dispense the machine must be back in IDLE, ready for the next sale.',
      ],
    },
    practiceExercises: [
      {
        title: 'Diagram to table, and back',
        brief:
          'A 3-state FSM: IDLE --go--> RUN --done--> DONE --(auto, next cycle)--> IDLE, with all other inputs as self-loops. Write the transition table with inputs (go, done) and state which rows are self-loops.',
        expectedBehavior:
          'Rows: IDLE: go=1 -> RUN, else IDLE. RUN: done=1 -> DONE, else RUN. DONE: always -> IDLE next cycle (unconditional transition). Self-loops: IDLE (go=0), RUN (done=0). Note DONE has no input condition — an arrow with no label condition means "take it regardless".',
        hints: [
          'Two input bits give four combinations per state; enumerate them.',
          'An unlabeled arrow is shorthand for "for every input".',
          'A Moore output table would attach an output value to each state — decide what DONE should assert.',
        ],
      },
      {
        title: 'State minimization by inspection',
        brief:
          'A student\'s FSM for the 11-detector has four states: S0, S1, S11, S111 (defined as "three or more 1s"). Show S111 is redundant: give its transition rows and argue they match S11\'s.',
        expectedBehavior:
          'S111: in=0 -> S0; in=1 -> S111; output 1. S11: in=0 -> S0; in=1 -> S11; output 1. Every (input) row behaves identically and outputs match, so no trace can distinguish them — S111 merges into S11 (states are *equivalent*). Two states suffice beyond S11: the machine only needs to know "at least two trailing 1s".',
        hints: [
          'Two states are equivalent if every input sends them to equivalent states with equal outputs.',
          'Once merged, re-check the machine still passes the original traces.',
          'This is the manual version of the partition-refinement minimization algorithms in logic tools.',
        ],
      },
    ],
    assessment: {
      title: 'FSM basics checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which of these is NOT a required part of an FSM specification?',
          options: [
            'An unbounded memory of all past inputs',
            'A finite set of states',
            'A defined initial state after reset',
            'A next state for every (state, input) combination',
          ],
          answer: 'An unbounded memory of all past inputs',
          explanation:
            'FSMs summarize history into a finite state; unbounded memory is exactly what they avoid. The other three are mandatory.',
          hint: '"Finite" is doing work in the name.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Every (state, input) combination must have a defined next state.',
          answer: 'true',
          explanation:
            'Missing rows become undefined hardware behavior — synthesis fills them arbitrarily and verification cannot cover them.',
          hint: 'What happens when an input arrives with no arrow?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'In the C 11-detector trace of input 01101110, what is the output at the step that processes the third bit (the second 1)?',
          code: 'if (state == 0)      next = in ? 1 : 0;\nelse if (state == 1) next = in ? 2 : 0;\nelse                 next = in ? 2 : 0;\nstate = next;\nprintf("output %d", state == 2);',
          options: ['0', '1', 'x', 'it depends on earlier bits only'],
          answer: '1',
          explanation: 'After 0,1 the state is S1; the second 1 transitions S1 -> S11, whose Moore output is 1.',
          hint: 'Track the state before each step: S0 -> S1 -> ?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What single design element guarantees the FSM starts in its home state at power-up? (One word.)',
          answer: 'reset',
          explanation: 'Reset forces the state flip-flops to the encoded home state, making traces and tests start from a known point.',
          hint: 'Module 6 built two flavors of it.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'A designer creates 256 states named "count 0" through "count 255". What is the better structure?',
          options: [
            'An 8-bit counter plus one or two FSM status states',
            'More states — 512 for safety',
            'A wider FSM with 65536 states',
            'Removing the counter entirely',
          ],
          answer: 'An 8-bit counter plus one or two FSM status states',
          explanation:
            'Counting is a datapath job for a counter (Module 6); the FSM should hold only control status like idle/running/done. Separating control from datapath keeps both verifiable.',
          hint: 'Control states and data values are different currencies.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Finite-state machine', definition: 'A system with finite states, inputs, a next-state function, outputs, and a defined initial state.' },
      { term: 'State', definition: 'A symbol summarizing all history relevant to future behavior.' },
      { term: 'Transition table', definition: 'Next state for every (state, input) combination — the gate-level form of the diagram.' },
      { term: 'State diagram', definition: 'States as nodes, input-labeled arrows as transitions; the human-readable contract.' },
      { term: 'Home state', definition: 'The state entered on reset; the starting point of every trace and proof.' },
      { term: 'Self-loop', definition: 'A transition returning to the same state; the standard way to "ignore" an input.' },
    ],
    revisionSummary: [
      'FSM = finite states + inputs + transition function + outputs + reset home state.',
      'Diagrams are for people; transition tables are for gates; both must be complete.',
      'Trace acceptance: walk the table edge by edge; if any step is undecidable, the diagram has a hole.',
      'States hold control status, never unbounded counts — use counters for data.',
      'Reset arrows are part of the specification.',
      'Equivalent states (same rows, same outputs) merge — manual minimization in miniature.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Finite-state machine', url: 'https://en.wikipedia.org/wiki/Finite-state_machine', kind: 'article' },
      { label: 'All About Circuits — Synchronous state machines', url: 'https://www.allaboutcircuits.com/textbook/digital/chpt-11/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'de-m07-l02',
    title: 'Moore vs Mealy: One Problem, Two Machines',
    summary:
      'The two output conventions: Moore machines (outputs from state only) versus Mealy machines (outputs from state and input), built side by side on the same "detect 11" problem, with the timing consequences of each.',
    objectives: [
      'State the Moore and Mealy output rules precisely.',
      'Build Moore and Mealy versions of the same detector and compare state counts.',
      'Predict output timing differences from a waveform viewpoint.',
      'Choose between the styles for a given requirement (glitch-safety vs responsiveness).',
    ],
    whyItMatters:
      'The Moore/Mealy choice changes state count, output timing and glitch behavior — and interviewers love it because it tests whether you understand *when* outputs happen, not just what they are. The registered-Moore pattern also connects directly to the timing lessons: Moore outputs that are register outputs are clean, Mealy outputs are combinational functions of fast inputs and must be re-timed before leaving the chip.',
    prerequisites: ['de-m07-l01'],
    explanation:
      '### The two rules\n\n- **Moore**: output = g(state). The output can change only when the state changes — i.e., only just after a clock edge. Written inside the state bubble.\n- **Mealy**: output = g(state, input). The output can change as soon as the *input* changes — potentially mid-cycle, before any clock edge. Written on the transition arrows.\n\nSame machine skeleton (states + transitions); only the output convention differs, and that difference propagates into state count, latency and glitch immunity.\n\n### One problem, both ways: detect two consecutive 1s\n\n**Moore** (3 states) — the output needs a state of its own because only "I have seen 11" may assert it:\n\n```\n        1                1\n  S0 -------> S1 -------> S11(z=1)\n   ^  \\       |  \\          |\n   0   \\--0-- +   \\--0--    | 1 (stay)\n   |                 0      v\n   +---------------------- S11? no: S11 -0-> S0, S11 -1-> S11\n```\n\nCleaner:\n\n```\n  S0(z=0) --1--> S1(z=0) --1--> S11(z=1)\n  S0 --0--> S0        S1 --0--> S0\n  S11 --0--> S0       S11 --1--> S11\n```\n\n**Mealy** (2 states) — the output rides the arrow that completes the pair:\n\n```\n  A --1/z=0--> B        B --1/z=1--> B     (second 1 asserts z immediately)\n  A --0/z=0--> A        B --0/z=0--> A\n```\n\nState B means "the last bit was 1"; the arrow B -1-> B *is* the detection and asserts z=1 *during that cycle*, combinational with the input.\n\n### What differs at the waveform level\n\nSame input stream 0,1,1,0 sampled at edges E1..E4:\n\n- **Mealy z**: asserts 1 during the cycle *after E3 is sampled*... precisely: z = (state==B && in==1), combinational — it goes high as soon as the input at cycle 3 reads 1 while in state B, and it can ripple with input wiggles.\n- **Moore z**: enters state S11 at edge E3\'s commit; z rises shortly after E3 (clock-to-Q) and is rock stable until the next state change.\n\nMealy reacts one cycle *earlier* in value terms (no extra state to pass through) but its output is combinational — glitches possible if the input glitches. Moore costs a state (and one cycle of latency for that path) but its output can be a registered, glitch-free signal.',
    deepDive:
      '### Equivalence and conversion\n\nFor any Mealy machine there is an equivalent Moore machine (split each state by input values — state count can grow up to |inputs| x) and vice versa. They recognize the same sequences; they differ in *when* outputs assert relative to edges. In practice: Moore for outputs that other clocked logic consumes (clean, registered), Mealy for fast response paths where one cycle of latency matters (and the output will be re-sampled immediately anyway).\n\n### The registered-output hybrid you will actually write\n\nModern RTL style: design a Mealy-style next-state function but *register* the outputs: z comes from a flop updated with the Mealy expression at each edge. You get Mealy\'s compact next-state logic with Moore\'s clean output timing, at the cost of one output flop and one cycle of latency. This "Moore machine with Mealy-derived registered outputs" is the default template in the Verilog course\'s FSM coding guidelines (three always blocks: state register, next-state comb, output comb or registered outputs).',
    examples: [
      {
        title: 'Moore 11-detector in Verilog (two always blocks + output)',
        language: 'verilog',
        code:
          'module detect11_moore(\n    input  wire clk,\n    input  wire rst_n,\n    input  wire din,\n    output reg  dout        // Moore: function of state only\n);\n    localparam S0  = 2\'d0,   // nothing useful\n               S1  = 2\'d1,   // last bit was 1\n               S11 = 2\'d2;   // last two bits were 11\n\n    reg [1:0] state, next;\n\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n) state <= S0;\n        else        state <= next;\n    end\n\n    always @(*) begin\n        case (state)\n            S0:      next = din ? S1  : S0;\n            S1:      next = din ? S11 : S0;\n            default: next = din ? S11 : S0;   // S11\n        endcase\n    end\n\n    always @(*) dout = (state == S11);\nendmodule',
        explanation: [
          'Three blocks: state register (sequential), next-state logic (combinational case), output logic (combinational function of state only).',
          'The case covers all states with a default — no inferred latches; every (state, input) row exists.',
          '`dout` depends only on `state`, so it changes only just after clock edges: glitch-free for downstream clocked logic.',
          'Encoding S0/S1/S11 as 2\'d values keeps the state register 2 bits wide; state encoding trade-offs come later in this module.',
          'Reset lands in S0 — the home state — so traces start deterministically.',
        ],
      },
      {
        title: 'Mealy 11-detector: one fewer state, faster assertion',
        language: 'verilog',
        code:
          'module detect11_mealy(\n    input  wire clk,\n    input  wire rst_n,\n    input  wire din,\n    output reg  dout        // Mealy: function of state AND input\n);\n    localparam A = 1\'b0,    // nothing useful\n               B = 1\'b1;    // last bit was 1\n\n    reg state, next;\n\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n) state <= A;\n        else        state <= next;\n    end\n\n    always @(*) begin\n        next = A;                       // default: back to A\n        if (state == A && din) next = B;\n        if (state == B)        next = din ? B : A;\n\n        dout = (state == B) && din;     // assertion rides the input\n    end\nendmodule',
        explanation: [
          'Two states suffice because the *arrow* B -1-> B carries the output — the detection is a function of (state, input), not a stored state.',
          'The default-then-override structure keeps every row defined and lint-clean.',
          '`dout` mixes state and the raw input: it can change mid-cycle when din changes. Fast, but combinational — re-register it before it leaves the chip or crosses to another clock.',
          'Compare ports: both modules expose identical interfaces; swapping Moore for Mealy changes only internals and output timing.',
          'Simulation check with input 0,1,1,0: Moore asserts dout one edge after the second 1 is sampled; Mealy asserts in the same cycle the second 1 is present.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'The same detector both ways',
        content:
          '  MOORE (3 states; output in bubbles)     MEALY (2 states; output on arrows)\n\n     1            1                        1/z=0         1/z=1\n  +------+    +------+    +------+       +------+    +------+\n  |  S0  |--> |  S1  |--> |  S11 |       |  A   |--->|  B   |\n  | z=0  |    | z=0  |    | z=1  |       | z=-  |<---| z=-  |\n  +------+    +------+    +------+       +------+0/z0+------+\n     ^0          ^0          ^0            ^           ^\n     +-----------+-----------+            +--0/z=0----+\n     (all zeros return to S0)             (1/z=1 self-loop on B)\n\n  output timing (input 0,1,1,0, edges E1..E4):\n    Moore: z rises just after the edge COMMITTING S11\n    Mealy: z rises combinationally when (B,1) is present',
        caption:
          'Same recognition behavior, different output discipline: Moore stores the result in a state, Mealy computes it on the wire.',
      },
    ],
    tables: [
      {
        caption: 'Moore transition + output table (11-detector)',
        headers: ['State', 'in=0 -> next', 'in=1 -> next', 'z'],
        rows: [
          ['S0', 'S0', 'S1', '0'],
          ['S1', 'S0', 'S11', '0'],
          ['S11', 'S0', 'S11', '1'],
        ],
      },
      {
        caption: 'Mealy transition + output table (11-detector)',
        headers: ['State', 'in=0 -> next / z', 'in=1 -> next / z'],
        rows: [
          ['A', 'A / 0', 'B / 0'],
          ['B', 'A / 0', 'B / 1'],
        ],
      },
      {
        caption: 'Style comparison',
        headers: ['Property', 'Moore', 'Mealy'],
        rows: [
          ['Output depends on', 'State only', 'State + input'],
          ['Output changes', 'Only after clock edges', 'Whenever inputs change'],
          ['States (this problem)', '3', '2'],
          ['Glitch safety', 'High (can be registered)', 'Low (combinational path)'],
          ['Response latency', 'One extra edge on that path', 'Immediate (same cycle)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing a Moore output as a function of the input "just this once".',
        fix:
          'The moment output = f(state, input), the machine is Mealy — fine, but then say so and handle the timing consequences. Mixing conventions unannounced is how review defects happen.',
      },
      {
        mistake: 'Letting a Mealy output drive another clocked block directly.',
        fix:
          'A mid-cycle-changing signal into a flop violates the clean single-update model and invites sampling different values across the design. Register Mealy outputs (one flop) or route them only to combinational logic that is itself registered at the same edge.',
      },
      {
        mistake: 'Assuming Mealy is "always faster" so always better.',
        fix:
          'Mealy saves a cycle only on that specific output path and pays in glitch exposure and analysis complexity. The registered-Moore (or registered-Mealy) template is the robust default; use raw Mealy outputs deliberately.',
      },
    ],
    guidedPractice: {
      title: 'Convert the Moore machine to Mealy (and back)',
      brief:
        'Convert the 3-state Moore 11-detector into a 2-state Mealy machine (write its transition/output table), then convert your Mealy back to Moore and confirm you recover 3 states.',
      starterCode:
        '/* Fill in:\n   Mealy table:\n     state | in=0 -> next/z | in=1 -> next/z\n     A     |                |\n     B     |                |\n\n   Moore recovery:\n     A  splits into states with z=0 only\n     B  splits into: B0 (in was 0, z=0) and B1 (in was 1, z=?)\n   Count the resulting Moore states: ?\n*/',
      expectedBehavior:
        'Mealy: A: in=0 -> A/0, in=1 -> B/0. B: in=0 -> A/0, in=1 -> B/1. Recovering Moore: state A and state B each split by the output value they would produce — A (z=0), B-with-input-0 (z=0) and B-with-input-1 (z=1) merge into S0, S1, S11: three states, matching the original. The conversions are inverses.',
      hints: [
        'A Mealy output on arrow (B,1) becomes the Moore state entered *after* that arrow.',
        'Each distinct output value of a Mealy state needs its own Moore state.',
        'Round-tripping is a good self-check: Moore -> Mealy -> Moore must return the same machine (up to renaming).',
      ],
    },
    practiceExercises: [
      {
        title: 'Registered-Mealy template',
        brief:
          'Starting from the Mealy module, add one output register so dout becomes a registered signal: state the extra flop, the new output timing relative to edges, and what latency is added.',
        expectedBehavior:
          'Add `reg dout_r;` updated at posedge clk with `dout_r <= (state == B) && din;` and drive the port from dout_r. The output now changes only just after edges (Moore-like cleanliness) and asserts one cycle later than the raw Mealy signal — one cycle of added latency for glitch immunity.',
        hints: [
          'The registered expression is exactly the old combinational dout.',
          'Registered outputs can no longer glitch mid-cycle.',
          'This hybrid is the recommended FSM output style in most RTL guidelines.',
        ],
      },
      {
        title: 'Choose the style',
        brief:
          'Two requirements: (a) an interrupt request to a CPU that must assert within one cycle of a pattern; (b) a slow status LED reflecting the machine state. Choose Moore or Mealy (or registered variant) for each and justify in one sentence each.',
        expectedBehavior:
          '(a) Mealy (or registered-Mealy if the CPU samples synchronously anyway): minimum latency to the pattern; the CPU samples it at its own edge, so a registered Mealy output is usually the right compromise. (b) Moore: human-visible, glitch-free, latency irrelevant — a plain Moore output (or even a slow divided state indicator) is ideal.',
        hints: [
          'Ask: who consumes the output, and do they sample it at an edge?',
          'Glitches visible to humans or asynchronous consumers are bugs; glitches re-sampled at edges often vanish.',
          'Latency requirements push toward Mealy; robustness pushes toward Moore.',
        ],
      },
    ],
    assessment: {
      title: 'Moore vs Mealy checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A machine\'s output can change in the middle of a clock cycle when an input changes. Which style is it?',
          options: ['Mealy', 'Moore', 'Neither is possible', 'Both, always'],
          answer: 'Mealy',
          explanation: 'Mealy outputs are functions of state AND input, so they follow input changes combinationally, mid-cycle.',
          hint: 'Which convention reads the raw input in the output equation?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'Every Mealy machine has an equivalent Moore machine (possibly with more states).',
          answer: 'true',
          explanation: 'Splitting each Mealy state by output value yields an equivalent Moore machine; the recognition behavior is identical.',
          hint: 'Outputs can be promoted into states.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'In the Mealy 11-detector, with state=B and din=1, what is dout?',
          code: 'dout = (state == B) && din;',
          options: ['0', '1', 'x', 'registered value'],
          answer: '1',
          explanation: 'The (B,1) combination is exactly the detection: dout asserts combinationally in that cycle.',
          hint: 'Evaluate the expression literally.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What single component converts a Mealy output into a glitch-free registered output? (One word.)',
          answer: 'flip-flop',
          explanation: 'One flop clocking the Mealy expression re-times it to edges, adding a cycle of latency but removing mid-cycle glitches.',
          hint: 'Module 6\'s standard cell.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'For the 11-detector, why does the Moore version need 3 states while Mealy needs 2?',
          options: [
            'Moore must dedicate a state to carrying the z=1 output',
            'Mealy forgot a state',
            'Moore counts differently',
            'The difference is a typo',
          ],
          answer: 'Moore must dedicate a state to carrying the z=1 output',
          explanation:
            'A Moore output can only live in a state, so "having detected 11" becomes its own state; Mealy hangs the output on the detecting arrow instead.',
          hint: 'Where does each style store its output?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Moore machine', definition: 'FSM whose outputs are functions of state only; outputs change just after clock edges.' },
      { term: 'Mealy machine', definition: 'FSM whose outputs are functions of state and input; outputs follow inputs combinationally.' },
      { term: 'Registered output', definition: 'An output passed through a flip-flop before leaving the block: glitch-free, one cycle of latency.' },
      { term: 'Output latency', definition: 'The delay between the recognizing edge and the output asserting; differs between styles.' },
      { term: 'State splitting', definition: 'Converting Mealy to Moore by creating one state per (state, output) pair.' },
    ],
    revisionSummary: [
      'Moore: z = g(state), changes only after edges; Mealy: z = g(state, in), changes with inputs.',
      'Same problem: Moore 3 states, Mealy 2 — outputs in states vs outputs on arrows.',
      'Mealy is faster but combinational; Moore is cleaner and registrable.',
      'Registered-Mealy / Moore-with-registered-outputs is the robust RTL default.',
      'The styles are interconvertible; state count moves with the output convention.',
      'Know who consumes the output before choosing the style.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Moore machine', url: 'https://en.wikipedia.org/wiki/Moore_machine', kind: 'article' },
      { label: 'Wikipedia — Mealy machine', url: 'https://en.wikipedia.org/wiki/Mealy_machine', kind: 'article' },
      { label: 'Electronics Tutorials — Sequential logic FSMs', url: 'https://www.electronics-tutorials.ws/sequential/seq_2.html', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'de-m07-l03',
    title: 'Worked Design: The 1011 Sequence Detector',
    summary:
      'A complete FSM design from specification to Verilog: deriving states for overlapping sequence detection, the full transition table, state encoding, and the canonical three-block RTL implementation.',
    objectives: [
      'Derive minimal states for detecting a bit sequence with overlap handling.',
      'Write the complete transition table including all "fallback" transitions.',
      'Encode states and justify the choice (binary vs one-hot).',
      'Implement the machine in synthesizable Verilog with the three-block template.',
    ],
    whyItMatters:
      'Sequence detectors are the canonical FSM interview and exam problem because they exercise every skill at once: state derivation, completeness, overlap reasoning, encoding and RTL structure. The same machinery recognizes framing patterns in serial protocols and opcodes in decoders. Finishing this lesson means you can take any "detect X" specification to working RTL unaided.',
    prerequisites: ['de-m07-l02'],
    explanation:
      '### Specification\n\nDetect the serial pattern **1011**, overlapped: the input is one bit per clock; assert `detect` for one cycle whenever the last four bits were 1011 — and overlapping matches count (the tail of one match may start the next).\n\n### Deriving states: what history matters?\n\nThe machine only needs to remember the *longest suffix of the input so far that is a prefix of 1011*:\n\n- Nothing useful -> **S0**\n- "1" -> **S1**\n- "10" -> **S10**\n- "101" -> **S101**\n- "1011" -> **S1011** (match; Moore output 1 here)\n\nFive states. The overlap question is answered entirely by the *fallback* transitions — where does the machine go on an input that does not extend the match?\n\n### The transition table (derive each row carefully)\n\n```\n state    meaning     in=0 ->      in=1 ->\n S0       (empty)     S0           S1\n S1       "1"         S10          S1      ("11" still ends in "1")\n S10      "10"        S0           S101    ("100" has no useful suffix)\n S101     "101"       S10          S1011   ("1010" ends with "10"!) \n S1011    "1011"      S10          S1      ("10110" ends "10"; "10111" ends "1")\n```\n\nThe instructive rows: from S101, a 0 gives "1010" — the longest suffix that is a prefix of 1011 is "10", so we fall back to S10, not S0. From S1011, a 1 gives "10111" whose useful suffix is "1" (S1); a 0 gives "10110" with suffix "10" (S10). Miss a fallback and the machine misses *overlapping* matches like 1011011 (two matches, one state apart).\n\n### Encoding and output\n\nFive states need 3 bits binary (or 5 bits one-hot). Binary keeps registers small; one-hot (Module 7 lesson 4 covers the trade) simplifies decode. Take binary: S0=000, S1=001, S10=010, S101=011, S1011=100. Output: Moore, `detect = (state == S1011)`.\n\n### The three-block RTL template\n\n1. **State register**: clocked, with reset to S0 (async active-low, per Module 6 convention).\n2. **Next-state logic**: combinational case over state, assigning next for every input value — default arm included.\n3. **Output logic**: Moore, combinational from state (or registered for a clean output).\n\nThis template is the shape every synthesizable FSM takes; memorize it once and the Verilog course\'s state machines all read the same.',
    deepDive:
      '### Overlap handling as suffix reasoning\n\nThe general rule for "detect pattern P" machines: on each input, move to the longest suffix of (remembered suffix + new bit) that is a prefix of P. That is the KMP failure-function idea from string algorithms wearing hardware clothes. You can compute fallbacks mechanically (write all suffixes, check each against prefixes) instead of guessing — worth doing for longer patterns where intuition starts missing rows. A missed fallback never shows up in short test vectors; it fails exactly when real streams contain near-misses, which is why the transition table review matters more than the diagram\'s happy path.\n\n### Non-overlapping variants\n\nIf the spec said non-overlapping (after a match, restart cleanly), only the S1011 row changes: both inputs would go to S0. Small wording changes in the specification move exactly one table row — another reason the table, not the diagram, is the artifact of record. In verification terms: overlapping and non-overlapping variants agree on every input without a second match close behind, so a testbench must include back-to-back patterns (1011011...) to tell them apart.',
    examples: [
      {
        title: 'The complete 1011 detector in Verilog',
        language: 'verilog',
        code:
          'module detect_1011(\n    input  wire clk,\n    input  wire rst_n,\n    input  wire bit_in,\n    output wire detect\n);\n    localparam S0    = 3\'d0,   // no useful suffix\n               S1    = 3\'d1,   // seen "1"\n               S10   = 3\'d2,   // seen "10"\n               S101  = 3\'d3,   // seen "101"\n               S1011 = 3\'d4;   // seen "1011" -> match\n\n    reg [2:0] state, next_state;\n\n    // 1. state register\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n)\n            state <= S0;\n        else\n            state <= next_state;\n    end\n\n    // 2. next-state logic (complete: every state, every input)\n    always @(*) begin\n        case (state)\n            S0:    next_state = bit_in ? S1    : S0;\n            S1:    next_state = bit_in ? S1    : S10;\n            S10:   next_state = bit_in ? S101  : S0;\n            S101:  next_state = bit_in ? S1011 : S10;\n            S1011: next_state = bit_in ? S1    : S10;\n            default: next_state = S0;\n        endcase\n    end\n\n    // 3. Moore output\n    assign detect = (state == S1011);\nendmodule',
        explanation: [
          'Block 1 is the Module 6 flip-flop pattern with async reset to the home state S0.',
          'Block 2 covers all five states plus a default arm; every ternary covers both input values — no holes, no inferred latches.',
          'The fallback rows (S101 -0-> S10 and S1011 -0-> S10, S1011 -1-> S1) are what make overlapping detection work.',
          'Block 3 is a pure decode of the state register: `detect` is high exactly while state == S1011, i.e., for the one cycle after the fourth matching bit is sampled.',
          'Encoding 000..100 is binary; the unused encodings 101-110 are unreachable — synthesis treats them as don\'t cares and the default arm guards them anyway.',
        ],
      },
      {
        title: 'Tracing 1011011 through the machine (overlap proof)',
        language: 'text',
        code:
          'input stream: 1 0 1 1 0 1 1   (sampled at edges 1..7)\n\n edge  in  state(before) -> state(after)   detect(after)\n  1    1   S0      -> S1                  0\n  2    0   S1      -> S10                 0\n  3    1   S10     -> S101                0\n  4    1   S101    -> S1011               1   <-- match "1011" (bits 1-4)\n  5    0   S1011   -> S10                 0   (fallback: "10" suffix)\n  6    1   S10     -> S101                0\n  7    1   S101    -> S1011               1   <-- match (bits 4-7, OVERLAP!)\n\n two matches, one shared bit (bit 4).\n A machine with a wrong fallback (S1011 -0-> S0) would MISS\n the second match: trace would go S0 -> S1 -> S10 -> S101... too late.',
        explanation: [
          'Each row is one clock edge: input sampled, state committed, output decoded from the new state.',
          'The edge-5 fallback to S10 is the overlap workhorse — it keeps the "10" context alive.',
          'Edge 7 lands on S1011 again: the shared middle bit of the two matches.',
          'The final comment shows the failure mode of a broken fallback: exactly the bug that survives naive test vectors.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: '1011 detector state diagram (Moore)',
        content:
          '                 1           0            1\n   +------+   +------+    +------+    +------+\n   |  S0  |-->|  S1  |--->|  S10 |--> | S101 |---+\n   +------+   +------+    +------+    +------+   |\n      ^  ^        ^          ^            ^       v 1\n      |0 |1       |0         |0(->S0)     |0   +--------+\n      |  +--------+          |            |    | S1011  |\n      +---------------------+------------+--->| z=1    |\n                                                 +--------+\n\n  full arrow list (complete):\n    S0    -0-> S0     -1-> S1\n    S1    -0-> S10    -1-> S1\n    S10   -0-> S0     -1-> S101\n    S101  -0-> S10    -1-> S1011\n    S1011 -0-> S10    -1-> S1\n  reset -> S0     output z=1 only in S1011',
        caption:
          'Five states; the arrows back from S101 and S1011 carry the overlap logic.',
      },
    ],
    tables: [
      {
        caption: 'Complete transition table (5 states, binary-encoded)',
        headers: ['State', 'Encoding', 'in=0 -> next', 'in=1 -> next', 'detect'],
        rows: [
          ['S0', '000', 'S0 (000)', 'S1 (001)', '0'],
          ['S1', '001', 'S10 (010)', 'S1 (001)', '0'],
          ['S10', '010', 'S0 (000)', 'S101 (011)', '0'],
          ['S101', '011', 'S10 (010)', 'S1011 (100)', '0'],
          ['S1011', '100', 'S10 (010)', 'S1 (001)', '1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Sending S1011 -0-> S0 instead of S10.',
        fix:
          'After a match, "10110" still ends in the useful suffix "10". A restart-to-S0 fallback silently breaks overlapping detection — test with 1011011, not just 1011.',
      },
      {
        mistake: 'Asserting detect combinationally from (state, bit_in) without saying so.',
        fix:
          'That turns the Moore machine into a Mealy one with different timing (the output would lead the state). If you want the cycle-aligned Moore pulse, decode state only; if you want earlier Mealy assertion, document it.',
      },
      {
        mistake: 'Leaving the default case out of the next-state block.',
        fix:
          'Unused encodings (101..110 here) are unreachable in theory, but simulation and formal tools still traverse them. A default arm makes unreachable-state behavior defined — cheap insurance, and lint tools demand it.',
      },
    ],
    guidedPractice: {
      title: 'Adapt to detect 110 (with overlap)',
      brief:
        'Design the Moore FSM detecting serial 110 with overlapping matches: list the states (longest suffix that is a prefix of 110), write the complete transition table, and trace input 110110.',
      starterCode:
        '#include <stdio.h>\n\nint main(void) {\n    /* TODO: fill the transition function for your states.\n       Suggested states: G0 (empty), G1 ("1"), G11 ("11"), G110 (match). */\n    const char *bits = "110110";\n    int state = 0;   /* 0=G0, 1=G1, 2=G11, 3=G110 */\n    for (int i = 0; bits[i]; i++) {\n        int in = bits[i] - \'0\';\n        int next = state;\n        if (state == 0) next = in ? 1 : 0;\n        else if (state == 1) next = in ? 2 : 0;\n        else if (state == 2) next = in ? 2 : 3;   /* 1 stays (11..1), 0 -> match */\n        else                 next = in ? 1 : 0;   /* after match: "1101"->G1, "1100"->G0 */\n        state = next;\n        printf("in %d -> state %d, detect %d\\n", in, state, state == 3);\n    }\n    return 0;\n}',
      expectedBehavior:
        'States: G0 (empty), G1 ("1"), G11 ("11"), G110 ("110", detect=1). Table: G0: 0->G0, 1->G1. G1: 0->G0, 1->G11. G11: 0->G110, 1->G11. G110: 0->G0 ("1100" has no useful suffix), 1->G1 ("1101" ends in "1"). Trace 110110: match at bit 3 and again at bit 6 — the second match uses the fallback G110 -1-> G1.',

      hints: [
        'Prefixes of 110: "", "1", "11", "110".',
        'From G110 with input 1: the stream ends "1101" — longest suffix that is a prefix is "1" -> G1.',
        'From G11 with input 1: "111" ends in "11" -> stay in G11.',
      ],
    },
    practiceExercises: [
      {
        title: 'One-hot this machine',
        brief:
          'Re-encode the 1011 detector one-hot (5 bits, one per state) and write the next-state equations for state bits S0..S1011 in terms of the one-hot bits and bit_in. State the register cost vs binary encoding.',
        expectedBehavior:
          'One-hot: next(S1) = (S0 & bit_in) | (S1 & bit_in) | (S1011 & bit_in); next(S10) = (S1 & ~bit_in) | (S101 & ~bit_in) | (S1011 & ~bit_in); next(S101) = S10 & bit_in; next(S1011) = S101 & bit_in; next(S0) = (S0 & ~bit_in) | (S10 & ~bit_in). Cost: 5 flops and wide simple AND-OR terms vs 3 flops and case-decode logic — classic FPGA preference (abundant flops, cheap decode).',
        hints: [
          'One equation per next-state bit; each is an OR of (current state AND input condition).',
          'Read the transitions straight off the table.',
          'Count flops both ways: 5 vs 3.',
        ],
      },
      {
        title: 'Non-overlapping variant',
        brief:
          'Modify the 1011 machine for NON-overlapping detection (after a match, forget everything). State exactly which table row(s) change and trace 1011011 under the new rules.',
        expectedBehavior:
          "Only S1011's row changes: both inputs -> S0 (clean restart). Trace 1011011: match at bit 4 (detect=1), then from S0: bits 5-7 = 0,1,1 reach S101 — not enough for a second match. One match total, versus two in the overlapping version.",
        hints: [
          'Non-overlap means no suffix is remembered after a match.',
          'Compare the two traces line by line; they diverge only after the first match.',
          'This is why testbenches need back-to-back patterns to catch the variant confusion.',
        ],
      },
    ],
    assessment: {
      title: 'Sequence detector checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'How many states does the overlapping 1011 Moore detector need?',
          options: ['5', '4', '8', '16'],
          answer: '5',
          explanation: 'One state per useful prefix of 1011: empty, "1", "10", "101", "1011".',
          hint: 'Count the prefixes including the empty one.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In state S101 (having seen "101"), the input is 0. Which state follows, and why?',
          options: [
            'S10 — "1010" ends with the useful suffix "10"',
            'S0 — the partial match failed completely',
            'S1011 — any input completes the pattern',
            'S1 — "1010" ends with "1"... which is also a prefix',
          ],
          answer: 'S10 — "1010" ends with the useful suffix "10"',
          explanation: 'Fallbacks go to the LONGEST suffix that is a prefix of 1011; for "1010" that is "10" (two chars beat one).',
          hint: 'Compare candidate suffixes "0", "10", "010", "1010".',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'With a correct overlapping 1011 detector, the input stream 1011011 produces two detect pulses.',
          answer: 'true',
          explanation: 'Matches at bits 1-4 and 4-7, sharing the middle 1; the fallbacks keep both detectable.',
          hint: 'Where does the second match start?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'In the three-block RTL template, which block contains the flip-flops? (One or two words.)',
          answer: 'state register',
          explanation: 'The state register block is the only clocked process; next-state and output logic are combinational.',
          hint: 'The sequential one.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'output-prediction',
          prompt: 'Using the encoded machine (S1011 = 100), what is detect after the edge that processes the 4th bit of input 1011?',
          code: 'assign detect = (state == S1011);   // S1011 = 3\'d100',
          options: ['0', '1', 'x', 'it stays high forever'],
          answer: '1',
          explanation: 'After four matching bits the state register holds S1011, so the decode asserts for that cycle.',
          hint: 'Which state does the machine commit at that edge?',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Sequence detector', definition: 'An FSM asserting an output when a chosen bit pattern completes in a serial stream.' },
      { term: 'Overlapping detection', definition: 'Matches allowed to share bits; requires fallback transitions to the longest useful suffix.' },
      { term: 'Fallback transition', definition: 'The transition taken when the input breaks the current partial match; goes to the longest suffix that is still a prefix.' },
      { term: 'Three-block template', definition: 'RTL FSM structure: state register, combinational next-state logic, output logic.' },
      { term: 'Unreachable state', definition: 'An encoding the machine can never enter; still needs defined behavior via default arms.' },
    ],
    revisionSummary: [
      'States = longest suffix of input that is a prefix of the pattern.',
      'Fallbacks decide overlap behavior; compute them mechanically, not by intuition.',
      'Five states for 1011 (Moore, overlapping); binary encoding 3 bits.',
      'Three-block template: state register / next-state case / output decode.',
      'Test with back-to-back patterns (1011011) — short vectors hide fallback bugs.',
      'Non-overlapping variant changes exactly one row: the match state\'s exits.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Finite-state machine', url: 'https://en.wikipedia.org/wiki/Finite-state_machine', kind: 'article' },
      { label: 'Wikipedia — Knuth-Morris-Pratt algorithm (the suffix idea)', url: 'https://en.wikipedia.org/wiki/Knuth%E2%80%93Morris%E2%80%93Pratt_algorithm', kind: 'article' },
    ],
    estimatedMinutes: 55,
  },
  {
    id: 'de-m07-l04',
    title: 'Worked Design: Traffic-Light Controller, and State Encoding Trade-offs',
    summary:
      'A timer-driven Moore controller for a two-road intersection, complete with Verilog, plus the state encoding decision: binary, one-hot, and Gray encodings and when each wins.',
    objectives: [
      'Design a multi-output Moore FSM from a timing specification.',
      'Handle timed transitions (timer done input) and safe output patterns.',
      'Compare binary, one-hot and Gray state encodings quantitatively.',
      'Complete the FSM design flow: spec -> diagram -> table -> encoding -> RTL -> check.',
    ],
    whyItMatters:
      'The traffic light is the classic "control FSM with timed states" — the same shape as bus arbiters, memory controllers and protocol sequencers. The encoding discussion is a genuine engineering economics decision you will make in every FPGA project, and the completed design flow here is the checklist the Verilog course\'s projects expect you to follow unaided.',
    prerequisites: ['de-m07-l03'],
    explanation:
      '### Specification\n\nTwo roads cross. Main road gets a long green; side road gets a shorter one. Each green is followed by a yellow before the other road goes. A timer signals `timer_done` when the current phase\'s time has elapsed.\n\nSafety requirements encoded directly in the outputs: **never two greens at once**; yellow always precedes a switch. Outputs: `light_main` and `light_side`, each one of {green, yellow, red}.\n\n### States (Moore — outputs live in states)\n\n```\nMAIN_GREEN  : main=green, side=red\nMAIN_YELLOW : main=yellow, side=red\nSIDE_GREEN  : main=red, side=green\nSIDE_YELLOW : main=red, side=yellow\n```\n\nTransitions, all on timer_done:\n\n```\nMAIN_GREEN  -timer_done-> MAIN_YELLOW   (stay otherwise)\nMAIN_YELLOW -timer_done-> SIDE_GREEN\nSIDE_GREEN  -timer_done-> SIDE_YELLOW   (stay otherwise)\nSIDE_YELLOW -timer_done-> MAIN_GREEN\n```\n\nA clean ring of four states — the "stay" self-loops handle the waiting, the timer input paces the cycle. No (state, input) combination is undefined: states without a timer_done simply self-loop.\n\n### Encoding: the trade you will make in every project\n\n```\nEncoding | Flops | Next-state logic        | Where it wins\n---------+-------+-------------------------+----------------------------------\nBinary   | 2     | decode 2 bits + mux     | ASICs, small state counts\nOne-hot  | 4     | trivial AND-OR per bit  | FPGAs (flops cheap, routing dear)\nGray     | 2     | same as binary          | low power, CDC counters\n```\n\nSynthesis tools re-encode automatically *if you let them* — but manual choice matters when outputs decode directly from state bits or when timing is tight. Note this design\'s outputs are wide (two 2-bit light fields); choosing an encoding that makes light decode trivial (e.g., outputs = state bits themselves with careful assignment) can remove the entire output logic layer.\n\n### The completed design flow (your checklist)\n\n1. Write the spec (inputs, outputs, timing, safety rules).\n2. Choose Moore vs Mealy (outputs consumed by real-world LEDs -> Moore).\n3. Draw the state diagram; verify completeness (every state x input).\n4. Write the transition table; verify the safety invariants (never two greens) against the *outputs of every state*.\n5. Encode states.\n6. Write the three-block RTL.\n7. Trace at least one full cycle plus one reset mid-cycle.',
    deepDive:
      '### Timer as an input vs counter as a datapath\n\nNotice what did NOT become states: the timer\'s countdown values. The timer is a datapath counter (Module 6) producing one control bit (`timer_done`); the FSM has four states, not forty. This control/datapath split is the professional structure: control FSMs stay tiny and verifiable, datapaths do the counting. When you meet memory controllers, the same split appears as "FSM issues commands; counter tracks refresh intervals".\n\n### Safety analysis as a verification habit\n\n"The lights must never both be green" is an *invariant* — true in every state, every cycle. With outputs decoded from state, proving it means checking four states once, statically. Had the design used Mealy outputs computed from (state, timer_done), the invariant would need checking over every input combination too — more surface for bugs. This is why safety-critical controllers default to Moore with registered outputs, and why formal tools check invariants rather than trace sequences. You will meet invariants again as assertions (SVA) in the verification parts of the Verilog track.',
    examples: [
      {
        title: 'Traffic-light controller in Verilog (three-block template)',
        language: 'verilog',
        code:
          'module traffic_light(\n    input  wire clk,\n    input  wire rst_n,\n    input  wire timer_done,\n    output reg  [1:0] light_main,   // 01=green 10=yellow 11=red\n    output reg  [1:0] light_side\n);\n    localparam MAIN_G  = 2\'d0,\n               MAIN_Y  = 2\'d1,\n               SIDE_G  = 2\'d2,\n               SIDE_Y  = 2\'d3;\n\n    reg [1:0] state, next_state;\n\n    // 1. state register\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n) state <= MAIN_G;\n        else        state <= next_state;\n    end\n\n    // 2. next-state: timer paces the ring\n    always @(*) begin\n        case (state)\n            MAIN_G:  next_state = timer_done ? MAIN_Y  : MAIN_G;\n            MAIN_Y:  next_state = timer_done ? SIDE_G  : MAIN_Y;\n            SIDE_G:  next_state = timer_done ? SIDE_Y  : SIDE_G;\n            SIDE_Y:  next_state = timer_done ? MAIN_G  : SIDE_Y;\n            default: next_state = MAIN_G;\n        endcase\n    end\n\n    // 3. Moore outputs: safe by construction (never two greens)\n    always @(*) begin\n        light_main = 2\'b11;             // default red\n        light_side = 2\'b11;\n        case (state)\n            MAIN_G:  begin light_main = 2\'b01; end\n            MAIN_Y:  begin light_main = 2\'b10; end\n            SIDE_G:  begin light_side = 2\'b01; end\n            SIDE_Y:  begin light_side = 2\'b10; end\n        endcase\n    end\nendmodule',
        explanation: [
          'State register with async reset landing in MAIN_G — the home state the spec names.',
          'The next-state case is a complete ring: every state covers both timer_done values via the ternary.',
          'Outputs default to red (safe) and only the active road\'s field is overridden: no combination of state bits can produce two greens — the invariant is structural.',
          'All three blocks follow the template from the previous lesson; the only new element is the timer input pacing the transitions.',
          'The binary encoding uses 2 flops; a one-hot version would use 4 with simpler next-state terms — the trade discussed in the lesson.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'Traffic-light controller ring',
        content:
          '            timer_done            timer_done\n   +------------+    +-------------+\n   | MAIN_GREEN |--> | MAIN_YELLOW |\n   | m=G, s=R   |    | m=Y, s=R    |\n   +------------+    +-------------+\n          ^    timer_done   |\n          |                 v\n   +------------+    +-------------+\n   | SIDE_YELLOW|<-- | SIDE_GREEN  |\n   | m=R, s=Y   |    | m=R, s=G    |\n   +------------+    +-------------+\n          timer_done\n\n   (in every state: timer_done=0 -> stay; safety invariant:\n    exactly one green or zero greens across both roads, in all 4 states)\n   reset -> MAIN_GREEN',
        caption:
          'A four-state ring paced by timer_done; outputs are decoded per state and structurally safe.',
      },
    ],
    tables: [
      {
        caption: 'Transition table with outputs (binary encoding)',
        headers: ['State', 'Enc', 'timer_done=0 -> next', 'timer_done=1 -> next', 'light_main', 'light_side'],
        rows: [
          ['MAIN_GREEN', '00', 'MAIN_GREEN', 'MAIN_YELLOW', 'green (01)', 'red (11)'],
          ['MAIN_YELLOW', '01', 'MAIN_YELLOW', 'SIDE_GREEN', 'yellow (10)', 'red (11)'],
          ['SIDE_GREEN', '10', 'SIDE_GREEN', 'SIDE_YELLOW', 'red (11)', 'green (01)'],
          ['SIDE_YELLOW', '11', 'SIDE_YELLOW', 'MAIN_GREEN', 'red (11)', 'yellow (10)'],
        ],
      },
      {
        caption: 'State encoding comparison for this design',
        headers: ['Encoding', 'State flops', 'Next-state logic', 'Comment'],
        rows: [
          ['Binary 00/01/10/11', '2', 'Decode 2 bits + timer mux', 'Compact; fine at this size'],
          ['One-hot', '4', 'One AND-OR per next bit', 'FPGA-friendly; trivial decode'],
          ['Gray ring 00/01/11/10', '2', 'Same as binary', 'Only 1 bit flips per transition: lower switching noise'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Encoding the timer countdown as FSM states.',
        fix:
          'Counting belongs to a counter datapath; the FSM consumes only timer_done. Forty states of "tick 1, tick 2..." are a counter pretending to be control logic.',
      },
      {
        mistake: 'Making both greens reachable through a missing yellow.',
        fix:
          'The yellow states are the safety feature. Any direct green-to-green arrow violates the invariant — check every state\'s outputs against the safety rule after the table is complete.',
      },
      {
        mistake: 'Letting outputs default to green instead of red.',
        fix:
          'Default-red means an unreachable or reset glitch state fails *safe* (all red), not dangerous. Encode safety into defaults, not just into the four legal states.',
      },
    ],
    guidedPractice: {
      title: 'Add a pedestrian button',
      brief:
        'Extend the controller: when a pedestrian presses a button (input ped), the *side* road\'s next green shortens (the side green state transitions to SIDE_YELLOW on timer_done OR ped while in SIDE_GREEN). Update the diagram, the transition table row, and state which safety property could be violated if ped were also honored during MAIN_GREEN.',
      starterCode:
        '/* Updated SIDE_GREEN row to complete:\n   SIDE_GREEN: next = (timer_done | ped) ? SIDE_YELLOW : SIDE_GREEN;\n\n   Question: why must ped be IGNORED during MAIN_GREEN?\n*/',
      expectedBehavior:
        'Diagram: SIDE_GREEN gains a second exit arrow (ped) to SIDE_YELLOW; the other rows are unchanged. Table row: SIDE_GREEN: next = (timer_done | ped) ? SIDE_YELLOW : SIDE_GREEN. Honoring ped during MAIN_GREEN would cut main-road green short only when the side road is *not* green — actually the danger: ped during MAIN_GREEN transitioning to SIDE_GREEN via shortened main yellow is safe, but if ped directly forced MAIN_GREEN -> SIDE_GREEN (skipping yellow), the main road would switch from green with no yellow — violating "yellow precedes every switch". The invariant to protect: every green ends in yellow.',
      hints: [
        'Only the SIDE_GREEN row changes; the ring stays a ring.',
        'OR-ing ped with timer_done keeps the state\'s exit single-purpose.',
        'Safety invariants: "no two greens" AND "every green ends in yellow" — test any change against both.',
      ],
    },
    practiceExercises: [
      {
        title: 'One-hot rewrite of the traffic FSM',
        brief:
          'Encode the four states one-hot (MG=0001, MY=0010, SG=0100, SY=1000) and write the next-state equation for the MY bit only, in terms of the four state bits and timer_done.',
        expectedBehavior:
          'next(MY) = (MG & timer_done) | (MY & ~timer_done). One line: MY is entered from MAIN_GREEN on timer_done and holds otherwise. Each next bit in one-hot style is such a small OR-of-ANDs — the reason FPGA synthesis defaults to one-hot.',
        hints: [
          'MY is next in exactly two cases: coming from MG with timer_done, or staying in MY without it.',
          'One equation per bit; no decoding of multi-bit patterns needed.',
          'Count the flops: 4 vs 2.',
        ],
      },
      {
        title: 'Gray-encoded ring check',
        brief:
          'Re-encode the ring in Gray order (MG=00, MY=01, SY=11, SG=10) and verify: (a) each transition flips exactly one state bit; (b) the output decode still needs at most 2 inputs per light field.',
        expectedBehavior:
          '(a) 00->01 (bit0), 01->11 (bit1), 11->10 (bit0), 10->00 (bit1): one flip per transition — half the switching activity of binary ring order (which needed two flips on 11->00). (b) main green = (state==00) etc.: each decode is a 2-input compare. Gray buys lower dynamic power and glitch-free multi-bit state observation.',
        hints: [
          'Order the ring so neighbors differ in one bit.',
          'Compare bit-flip counts: binary ring 00->01->10->11->00 has one double-flip transition.',
          'Decode cost is unchanged — Gray\'s win is transitions, not logic size.',
        ],
      },
    ],
    assessment: {
      title: 'Traffic controller and encoding checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why are the yellow states non-negotiable in this design?',
          options: [
            'They enforce "yellow precedes every switch", the safety invariant',
            'They make the state count even',
            'They reduce register usage',
            'They are required by the timer',
          ],
          answer: 'They enforce "yellow precedes every switch", the safety invariant',
          explanation: 'Removing a yellow would create a direct green-to-green path — exactly the danger the controller exists to prevent.',
          hint: 'What rule would an arrow from green to green break?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'One-hot encoding uses more flip-flops but simpler next-state decode than binary.',
          answer: 'true',
          explanation: 'n flops for n states vs log2(n), but each next-state bit is a shallow OR of ANDs — the FPGA trade.',
          hint: 'Registers vs logic depth.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'With state = MAIN_YELLOW and timer_done = 1, what are light_main and light_side in the reference module?',
          code: 'MAIN_Y:  begin light_main = 2\'b10; light_side = 2\'b11; end',
          options: ['main yellow, side red', 'main green, side red', 'main red, side green', 'main yellow, side yellow'],
          answer: 'main yellow, side red',
          explanation: 'In MAIN_YELLOW the module drives light_main = 10 (yellow) and leaves light_side at its default red.',
          hint: 'Read the output case row.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What datapath block produces the timer_done input? (One word.)',
          answer: 'counter',
          explanation: 'A counter (Module 6) counts clock cycles of the phase duration and asserts timer_done at the end — control/datapath split.',
          hint: 'Counting is datapath work.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt: 'What is the practical benefit of a Gray-encoded state ring?',
          options: [
            'Exactly one state bit flips per transition, reducing switching power and multi-bit observation glitches',
            'It uses fewer flops than binary',
            'It eliminates the need for reset',
            'It makes outputs Mealy',
          ],
          answer: 'Exactly one state bit flips per transition, reducing switching power and multi-bit observation glitches',
          explanation:
            'Gray sequencing changes one bit at a time; binary ring order includes transitions where several bits flip at once.',
          hint: 'Count bit flips per transition in both orders.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Timed state', definition: 'A state held until a timer input (from a datapath counter) releases it.' },
      { term: 'Invariant', definition: 'A property true in every state every cycle (e.g., never two greens); checked statically or with assertions.' },
      { term: 'Binary encoding', definition: 'States numbered in base 2: log2(n) flops, decoded logic.' },
      { term: 'One-hot encoding', definition: 'One flop per state: shallow next-state logic, the FPGA default.' },
      { term: 'Gray encoding', definition: 'Successive states differ in one bit: minimal switching, useful for low power and CDC counters.' },
      { term: 'Control/datapath split', definition: 'FSM holds control status; counters and registers hold data values.' },
    ],
    revisionSummary: [
      'Traffic controller = 4-state Moore ring paced by timer_done.',
      'Safety lives in structure: default-red outputs, yellow before every switch.',
      'Encoding choice: binary (compact), one-hot (shallow logic, FPGA), Gray (one flip per move).',
      'Timers are datapath counters — never encode time as states.',
      'The 7-step design flow (spec -> diagram -> table -> encode -> RTL -> trace) is the reusable checklist.',
      'Check invariants against every state\'s outputs, not just the happy path.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Moore machine', url: 'https://en.wikipedia.org/wiki/Moore_machine', kind: 'article' },
      { label: 'Wikipedia — One-hot', url: 'https://en.wikipedia.org/wiki/One-hot', kind: 'article' },
      { label: 'Wikipedia — Gray code', url: 'https://en.wikipedia.org/wiki/Gray_code', kind: 'article' },
    ],
    estimatedMinutes: 55,
  },
];
