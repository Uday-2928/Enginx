import type { TutorialLesson } from '../types';

/**
 * Module 02 — Specification to Architecture.
 * Uses ONE running example throughout: a programmable interval timer (PIT)
 * with start/stop, period configuration, one-shot and periodic modes, and a
 * terminal-count interrupt. The capstone (module 11) implements this block.
 */

/**
 * The requirements document used across lessons 1-3. Kept as a comment block
 * here so the lesson code samples stay focused on process, not on re-reading.
 *
 * PIT REQUIREMENTS (customer draft, v0)
 *  R1: Generate a terminal-count (TC) event after a programmable interval.
 *  R2: The interval is programmed in clock cycles via a 16-bit period value.
 *  R3: Software can start and stop the timer.
 *  R4: One-shot mode (one event per start) and periodic mode (auto-reload).
 *  R5: The TC event raises a maskable interrupt request.
 *  R6: Software can observe the current count and acknowledge the event.
 *  R7: Single clock domain; reset by the system reset (active low).
 */

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'rtl-m02-l1',
    title: 'Reading a Specification Like a Designer',
    summary:
      'Requirements arrive as prose and leave as observable behaviour. Using the interval timer requirements, this lesson turns every sentence into testable statements, exposes the ambiguities a designer must resolve, and fixes the interface list.',
    objectives: [
      'Convert prose requirements into numbered, testable behaviour statements.',
      'Identify every input and output of a block, with width, direction and protocol, from a requirements document.',
      'Recognize the standard ambiguity classes (start semantics, event acknowledgement, corner values) and write the design questions that resolve them.',
      'State clock and reset requirements before any architecture work begins.',
    ],
    whyItMatters:
      'Every downstream artifact inherits the reading of the specification you form in the first hour. Misread a word like "start" or "fires" here and you will build the wrong hardware cleanly, verify it successfully against the wrong reading, and discover the truth in review or on the bench. Reading a spec like a designer means interrogating it: turning each sentence into something a testbench could check, and refusing to proceed on sentences no test could ever check. This lesson walks that interrogation on a real block you will carry through to the capstone.',
    prerequisites: ['rtl-m01-l3'],
    explanation: [
      'The running example for this module (and the capstone) is a **programmable interval timer (PIT)**: a small peripheral that counts down a software-programmed interval and raises an interrupt when it expires. The customer draft arrives as seven requirements (R1-R7 in the module header comment). It sounds complete. It is not — and the first design skill is seeing exactly where it is silent.',
      'The conversion method: for each requirement, write the **observable behaviour** — who does what, to which signal, on which cycle, with which values. R1 "generate a TC event after a programmable interval" becomes: "TC is a flag readable at CTRL bit 8; it sets on the cycle when the counter reaches its terminal value; the interval is P cycles for period value P." Every noun in the original (event, interval) must resolve to a signal, a register field or a cycle count. Any noun that cannot resolve is an ambiguity, and each one gets written down as an explicit question.',
      'Ambiguities cluster into recurring classes, and the PIT draft hits all of them. **Start semantics:** does writing START reload the counter, or continue from the current value? What if the timer is already running? **Event semantics:** is the TC event a single-cycle pulse or a sticky level? How does software acknowledge it — write-one-to-clear (W1C), write-any, or read-to-clear? **Corner values:** what does period 0 mean? What does the count register read at the moment of expiry? **Interface mechanics:** how wide is the config bus, is a read same-cycle or registered, what happens on a write to a reserved address? None of these questions is pedantic — each one changes registers, control logic or testbench checks.',
      'The resolutions become **spec v1.0**, the versioned contract. For the PIT: writing CTRL.ENABLE=1 always (re)starts — the counter reloads from PERIOD and runs; writing ENABLE=0 stops and *preserves* the count. TC is a **sticky flag** cleared by W1C (software cannot lose an event by reading at the wrong moment, which read-to-clear risks). The interrupt is a **level**: irq_o stays high while TC is set and IRQ_EN is set — levels are friendlier to interrupt controllers than pulses. Period 0 is defined as "timer runs but never fires" (no wraparound surprises). These five decisions are the difference between a spec you can build from and a wish list.',
      'Finally, fix the **frame**: interfaces and environment. The PIT is a config-bus slave: inputs cfg_wr (a one-cycle write strobe), cfg_addr[1:0], cfg_wdata[15:0], cfg_rd, and output cfg_rdata[15:0]; plus irq_o as a single level output to the interrupt controller. Clock: one clock domain, all state clocked on posedge clk. Reset: asynchronous, active-low reset_n, returning every register to a defined value (config cleared, count zero, TC clear, irq low). Note what is deliberately *absent*: no external count input, no cascading, no DMA request — a designer also records what the block does **not** do, because scope creep enters through the gaps.',
    ].join('\n\n'),
    deepDive: [
      'Why write behaviour statements rather than trust prose? Because a testbench is a mechanization of the behaviour statements, not of the prose. "The timer fires periodically" cannot be automated; "with PERIOD=P (P>=1), TC sets exactly P cycles after each ENABLE write and again every P cycles thereafter" can be reduced to a loop of checks in twenty lines. The act of writing behaviour statements is therefore also the act of writing the future test plan — module 11\'s verification plan for the PIT will map one-to-one onto the statements frozen here.',
      'The ambiguity classes generalize beyond timers. Start semantics questions appear in every block with an enable (does enable reinitialize state?). Event semantics questions appear in every block with an interrupt or handshake (pulse vs level, W1C vs read-to-clear). Corner-value questions appear wherever a register can hold an extreme (period 0, period max, count 0). When you meet a new block, run the four classes as a checklist and you will reliably surface the questions the customer did not think to answer — before they cost a redesign.',
      'A note on *who* resolves ambiguities: the designer proposes, the customer (or system architect) disposes. The deliverable is not a silent guess but a question list with proposed answers, reviewed and signed off. In this course the proposed answers become spec v1.0 directly; in industry the sign-off step is where you discover that "obviously START should not reload" was not obvious to the author of R3. An ambiguity resolved by one person silently is an ambiguity resolved wrongly with high probability.',
    ].join('\n\n'),
    examples: [
      {
        title: 'PIT requirements converted to testable behaviour statements (spec v1.0, behaviour section)',
        language: 'text',
        code: [
          'PIT SPEC v1.0 — BEHAVIOUR STATEMENTS (B1..B12)',
          '',
          'B1  RESET:  while reset_n=0: count=0, CTRL readback=0, TC=0, irq_o=0.',
          'B2  START:  cfg_wr to CTRL with wdata[0]=1: count loads PERIOD at the',
          '            next edge; timer runs. Applies also when already running',
          '            (restart) and when stopped.',
          'B3  STOP:   cfg_wr to CTRL with wdata[0]=0: timer stops; count HOLDS.',
          'B4  RUN:    while running and count!=0: count decrements 1 per cycle.',
          'B5  TICK:   when running and count==1, the cycle that follows loads',
          '            count to 0 (one-shot) or to PERIOD (periodic); the TC flag',
          '            sets on that same edge. So with PERIOD=P (P>=1), the first',
          '            TC is exactly P cycles after the START write, and',
          '            subsequent TCs are every P cycles (periodic).',
          'B6  PERIOD=0: timer runs, count stays 0, no TC ever (defined no-op).',
          'B7  MODE:   CTRL[1]: 1 = periodic (auto-reload), 0 = one-shot (stops',
          '            after firing, count rests at 0).',
          'B8  IRQ:    irq_o = TC & IRQ_EN, level output.',
          'B9  ACK:    TC clears on W1C: cfg_wr to CTRL with wdata[8]=1.',
          'B10 PRIORITY: if a hardware tick and a W1C clear land on the same',
          '            edge, the SET wins (the event is never lost).',
          'B11 READS:  0x0 CTRL {TC[8],IRQ_EN[2],MODE[1],RUN[0]}, 0x1 PERIOD,',
          '            0x2 COUNT, 0x3 reserved -> reads 16\'h0000.',
          'B12 WRITES: to reserved 0x3 are ignored; PERIOD may be written any',
          '            time; a PERIOD write does NOT affect a running count.',
        ].join('\n'),
        explanation: [
          'B2 resolves start semantics completely: START means load-and-go, in all three situations (stopped, running, restarting). There is no case left undefined.',
          'B5 is the heart of the spec: it fixes the off-by-one. "P cycles after the START write" is a claim a testbench asserts with an exact cycle count — the kind of sentence R1 could never produce.',
          'B6 turns period 0 from a potential wraparound bug into a defined no-op. A corner case with defined behaviour is a test; undefined, it is a future erratum.',
          'B8-B10 fix the event machinery: level IRQ, W1C acknowledge, and a priority rule for the one edge case (tick vs clear coincidence) that unmanaged will become a rare, unreproducible simulation-vs-review disagreement.',
          'B11-B12 pin the interface mechanics, including the reserved address and the rule that PERIOD writes do not disturb a running count — both are questions a reviewer would otherwise ask in month two.',
        ],
      },
      {
        title: 'The designer question list for the PIT draft (deliverable: questions with proposed answers)',
        language: 'text',
        code: [
          'OPEN QUESTIONS on PIT draft v0 (each blocks architecture work)',
          '',
          'Q1  START semantics: reload or resume? Does START while running',
          '    restart the interval?            PROPOSED: always reload (B2).',
          'Q2  Event shape: pulse or sticky flag? Ack mechanism?',
          '                                     PROPOSED: sticky + W1C (B5,B9).',
          'Q3  IRQ shape: level or pulse? What clears it?',
          '                                     PROPOSED: level = TC & IRQ_EN (B8).',
          'Q4  PERIOD=0 meaning?                PROPOSED: runs, never fires (B6).',
          'Q5  Does STOP clear the count?       PROPOSED: no, hold (B3).',
          'Q6  Count width and readback value at expiry (one-shot)?',
          '                                     PROPOSED: 16-bit; reads 0 (B5,B7).',
          'Q7  Read timing on cfg bus: same-cycle or 1-cycle latency?',
          '                                     PROPOSED: same-cycle (B11).',
          'Q8  Writes to reserved address?      PROPOSED: ignored (B12).',
          'Q9  Reset: polarity, sync/async, what resets?',
          '                                     PROPOSED: async active-low,',
          '                                     everything (B1).',
          'Q10 Does a PERIOD write disturb a running count?',
          '                                     PROPOSED: no (B12).',
        ].join('\n'),
        explanation: [
          'Ten questions from seven requirements: that ratio is normal. The requirements say *what*; only the question list reaches *under what conditions, with which side effects, in which cycle*.',
          'Each question carries a proposed answer, so a reviewer approves or overrides in minutes — the sign-off step that turns proposals into spec v1.0.',
          'Note the pattern in the proposals: every one chooses the *simplest defined behaviour* (hold, no-op, set-wins) unless a requirement forces otherwise. Simple defined behaviour is easy to implement, easy to test and easy to explain; cleverness is spent only where the requirements demand it.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'PIT as a black box: interfaces before internals',
        content: [
          '                +---------------------------+',
          '                |                           |',
          '   clk -------->|  programmable interval    |',
          '   reset_n ---->|  timer (PIT)              |----> irq_o  (level)',
          '                |                           |',
          '   cfg_wr  ---->|  config-bus SLAVE         |',
          '   cfg_rd  ---->|  addr[1:0], wdata[15:0]   |',
          '   cfg_addr --->|  rdata[15:0]              |',
          '   cfg_wdata -->|                           |',
          '                |                           |',
          '                +---------------------------+',
          '                    cfg_rdata <-------------',
          '',
          '  Every arrow: name, width, direction, protocol. The black box',
          '  has no other contact with the world — that is the interface list.',
        ].join('\n'),
        caption:
          'The first architecture sketch is the box with its arrows. Internals are forbidden until every arrow is named, sized and given a protocol.',
      },
    ],
    tables: [
      {
        caption: 'PIT interface list (from the frame decisions)',
        headers: ['Signal', 'Dir', 'Width', 'Protocol / meaning'],
        rows: [
          ['clk', 'in', '1', 'System clock; all state on posedge'],
          ['reset_n', 'in', '1', 'Asynchronous, active-low, full reset'],
          ['cfg_wr', 'in', '1', '1-cycle write strobe, qualified with cfg_addr'],
          ['cfg_rd', 'in', '1', '1-cycle read strobe (same-cycle rdata)'],
          ['cfg_addr', 'in', '2', 'Register address 0x0-0x3'],
          ['cfg_wdata', 'in', '16', 'Write data'],
          ['cfg_rdata', 'out', '16', 'Combinational read data for cfg_addr'],
          ['irq_o', 'out', '1', 'Level-high IRQ = TC & IRQ_EN'],
        ],
      },
      {
        caption: 'Ambiguity classes and where the PIT draft hit them',
        headers: ['Class', 'Generic question', 'PIT instance'],
        rows: [
          ['Start semantics', 'Does enable reinitialize or resume state?', 'Q1: START reloads, restart allowed'],
          ['Event semantics', 'Pulse or level? How acknowledged?', 'Q2/Q3: sticky TC + W1C; level IRQ'],
          ['Corner values', 'Defined behaviour at extremes?', 'Q4/Q6: PERIOD=0 no-op; count reads 0'],
          ['Interface mechanics', 'Strobes, reserved space, read latency', 'Q7/Q8: same-cycle reads; 0x3 ignored'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Reading a requirements document once and starting the block diagram immediately.',
        fix:
          'First pass: convert every requirement to observable behaviour statements (B1, B2, ...). Second pass: hunt the four ambiguity classes. Only then draw. The block diagram drawn from un-interrogated prose encodes assumptions you will defend for months because they are now "the design".',
      },
      {
        mistake: 'Resolving ambiguities silently in your head while coding.',
        fix:
          'Write the question list with proposed answers and get them acknowledged (customer, architect, or your own review log in a solo project). A silent resolution is indistinguishable from a mistake, and unverifiable against the spec — reviewers will flag it, correctly, as a defect of process even when the choice was reasonable.',
      },
      {
        mistake: 'Leaving corner values (0, max, simultaneous events) to be decided during verification.',
        fix:
          'Corners are spec items, not testbench discoveries. PERIOD=0, restart-while-running and tick-vs-clear coincide are each one sentence in spec v1.0 — and each becomes one clean test in the plan, rather than a late change rippling through control logic.',
      },
    ],
    guidedPractice: {
      title: 'Interrogate a new requirement set',
      brief:
        'A second requirement arrives: "R8: The PIT shall support a free-running mode that never stops." Convert R8 into behaviour-statement drafts, then list the questions it forces (mode encoding vs existing MODE bit, interaction with STOP, interaction with PERIOD=0, readback), each with a proposed answer.',
      starterCode: [
        '// Draft behaviour statements for R8:',
        '//   B13  ...(you write: what runs, what it ignores)',
        '//   B14  ...(you write: STOP interaction)',
        '// Questions:',
        '//   Q11 ...(encoding)',
        '//   Q12 ...(interaction with one-shot/periodic)',
        '//   Q13 ...(interaction with STOP)',
        '//   Q14 ...(interaction with PERIOD=0)',
      ].join('\n'),
      expectedBehavior:
        'Sample resolution: B13 free-running = periodic mode with the STOP command ignored; B14 readback shows RUN=1 always once started. Q11: reuse MODE=periodic plus a new CTRL[3] FREE bit (no new register). Q12: FREE overrides one-shot stop-at-terminal-count. Q13: STOP writes ignored while FREE=1 (documented). Q14: PERIOD=0 under FREE still never fires (B6 stands). Every answer is one sentence and each is testable — the point of the exercise is the questions, not the particular choices.',
      hints: [
        'Ask how R8 interacts with EVERY existing behaviour statement B1-B12, not just the obvious ones.',
        'Encoding question first: does free-running need a new register field?',
        'The hardest interactions are usually with STOP and with corner values.',
      ],
    },
    practiceExercises: [
      {
        title: 'Nouns to signals',
        brief:
          'Take requirement R5 ("the TC event raises a maskable interrupt request") and list every noun and verb in it, resolving each to a signal, register field, or cycle statement. Mark any that cannot resolve without a question.',
        expectedBehavior:
          '"TC event" -> sticky flag CTRL[8] plus the tick instant (B5); "raises" -> irq_o asserted level (B8); "maskable" -> IRQ_EN field CTRL[2], irq_o = TC & IRQ_EN; "interrupt request" -> the irq_o output, level, to the interrupt controller. Nothing here is unresolvable — but note "maskable" silently assumed a mask register exists: that assumption is exactly the kind of thing the resolution must state explicitly (and R6\'s acknowledgement question interacts with it).',
        hints: [
          'Every noun must become a signal or field; every verb a cycle statement.',
          '"Maskable" hides an assumption about a register that R1 never mentioned.',
          'Check the interaction: can software mask an event it has not acknowledged yet?',
        ],
      },
      {
        title: 'Scope boundary statement',
        brief:
          'Write the "what the PIT does NOT do" paragraph for spec v1.0: five exclusions with one-sentence rationale each. Then state which exclusion would be the first a colleague would challenge, and what spec sentence would settle it.',
        expectedBehavior:
          'Sample exclusions: no external clock/count inputs (count is internal only); no cascading of multiple timers; no DMA request output; no capture/timestamp function; no wake-up from low-power states beyond the level IRQ. The likely challenge is the DMA request ("timers usually have one") — settled by the spec sentence: " irq_o is the only event output; DMA support is deferred to PIT v2 and out of scope for v1." Exclusions are one-sentence, positive statements of deferral, not apologies.',
        hints: [
          'Exclusions come from imagining the adjacent features users will ask for.',
          'Each exclusion should say why it is out of scope (deferred, not forgotten).',
          'The contested exclusion is the one closest to an existing signal — irq_o makes DMA the natural challenge.',
        ],
      },
    ],
    assessment: {
      title: 'Specification reading checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'What makes a behaviour statement (like B5) better than its source requirement (like R1) for design work?',
          options: [
            'It is shorter',
            'It resolves signals, values and cycle counts, so a testbench can check it mechanically',
            'It uses more formal language',
            'It removes the need for a register map',
          ],
          answer:
            'It resolves signals, values and cycle counts, so a testbench can check it mechanically',
          explanation:
            'Behaviour statements name concrete signals, values and cycles — the granularity a testbench asserts. Requirements state intent; behaviour statements state checkable facts.',
          hint: 'Could software assert this sentence in a simulation?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'The PIT spec chooses a sticky TC flag cleared by W1C rather than read-to-clear. What failure mode does W1C avoid?',
          options: [
            'Software reading the count register would clear events prematurely',
            'A software read between the event and the acknowledgement would lose the event',
            'W1C uses fewer register bits',
            'Level IRQs are impossible with read-to-clear',
          ],
          answer:
            'A software read between the event and the acknowledgement would lose the event',
          explanation:
            'Read-to-clear couples observation to acknowledgement: any diagnostic read of CTRL silently swallows the pending event. W1C lets software read freely and acknowledge deliberately.',
          hint: 'Who else might read the CTRL register besides the IRQ handler?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'Defining PERIOD=0 as "timer runs but never fires" is over-specification; corner values should be left undefined so the implementer can choose.',
          answer: 'false',
          explanation:
            'Undefined behaviour at a corner value is a bug factory: the implementer, the testbench author and the reviewer each choose a different behaviour silently. A defined no-op is one sentence now and one test later.',
          hint: 'How many readings can "undefined" support?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Name the four ambiguity classes this lesson uses as a spec-interrogation checklist.',
          answer:
            'start semantics; event semantics; corner values; interface mechanics',
          explanation:
            'Start semantics (does enable reinitialize?), event semantics (pulse/level/acknowledge), corner values (extremes and coincidences), interface mechanics (strobes, reserved space, read latency).',
          hint: 'Think: enabling, events, extremes, wires.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt:
            'A teammate proposes: "irq_o = TC & IRQ_EN, and TC clears whenever software reads CTRL." What is wrong with this proposal?',
          code: 'irq_o = tc_q & irq_en_q;  // tc_q cleared on every cfg_rd of 0x0',
          options: [
            'Nothing; read-to-clear is the standard',
            'Any read of CTRL (including a status poll) clears the pending event, so software can lose interrupts by polling',
            'It makes irq_o combinational, which is illegal',
            'W1C and read-to-clear cannot coexist',
          ],
          answer:
            'Any read of CTRL (including a status poll) clears the pending event, so software can lose interrupts by polling',
          explanation:
            'Observation and acknowledgement are different software actions and must use different mechanisms. Read-to-clear merges them, so a harmless status poll destroys the event record. That is why the spec chose W1C.',
          hint: 'Consider a polling loop that checks the TC bit repeatedly.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      {
        term: 'Behaviour statement',
        definition:
          'A numbered, testable restatement of a requirement naming signals, values and cycles (B1, B2, ...).',
      },
      {
        term: 'Sticky flag',
        definition:
          'A status bit that holds its asserted state until software explicitly clears it.',
      },
      {
        term: 'W1C (write-one-to-clear)',
        definition:
          'Acknowledgement convention: writing 1 to a status bit clears it; writing 0 leaves it unchanged.',
      },
      {
        term: 'Level interrupt',
        definition:
          'An IRQ output that stays asserted while the condition (flag AND enable) holds.',
      },
      {
        term: 'Scope boundary',
        definition:
          'The explicit statement of what a block does not do, recorded in the spec to block scope creep.',
      },
    ],
    revisionSummary: [
      'Convert every requirement to observable behaviour statements before drawing anything.',
      'Interrogate with the four ambiguity classes: start semantics, event semantics, corner values, interface mechanics.',
      'Resolutions are proposals with sign-off, recorded as versioned spec (v1.0) — never silent choices.',
      'The PIT frame: config-bus slave (wr/rd strobes, addr[1:0], 16-bit data), level irq_o, one clock, async active-low reset.',
      'Start = load-and-go (restart allowed); stop = hold; PERIOD=0 = defined no-op; TC = sticky + W1C; set wins over clear.',
      'Record what the block does NOT do — scope boundaries are spec content.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Hardware programming interface (interrupt concepts)',
        url: 'https://en.wikipedia.org/wiki/Interrupt',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Specification (technical standard)',
        url: 'https://en.wikipedia.org/wiki/Specification_(technical_standard)',
        kind: 'article',
      },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'rtl-m02-l2',
    title: 'Block Diagram, Register Map and Timing Expectations',
    summary:
      'With the spec frozen, the architecture artifact gets built: partition datapath from control, draw the block diagram with named registers, write the register map, and pin the timing expectations as a cycle table and waveform for the P=3 case.',
    objectives: [
      'Partition a small block into datapath and control with a written contract between them.',
      'Draw a block diagram in which every register is named, sized and owned by exactly one block.',
      'Write a register map with access modes, reset values and read-only fields.',
      'Produce a cycle-accurate timing expectation table and waveform for the spec\'s headline sequence.',
    ],
    whyItMatters:
      'This lesson produces the artifacts the RTL will transcribe — the register list and the partition are the two decisions that determine how cleanly the design codes, verifies and times. Skimp here and coding becomes invention, which is where designs go wrong. The register map in particular outlives the RTL: software teams, verification teams and documentation all consume it, and every field you define now is a field you never have to argue about later.',
    prerequisites: ['rtl-m01-l3', 'rtl-m02-l1'],
    explanation: [
      '**Partition first.** The PIT splits cleanly. The **datapath** is the 16-bit down-counter: the register `count_q[15:0]`, the decrementer, the reload path from `period_q`, and the zero/one detects. The **control** is everything else: the config registers (`mode_q`, `irq_en_q`, `period_q` storage), the run state (`st_q`), the sticky TC flag (`tc_q`), the config-write decode, and the level IRQ gate. The **contract between them** is three signals: `run` (control tells datapath the timer is active), `count_load` (control commands a reload), and `tc_tick` (datapath tells control the counter hit 1 while running). Three wires — that is the whole interface, and its smallness is the sign the partition is right.',
      '**Draw the block diagram with registers inside.** A useful architecture diagram names every register, not just the boxes: PIT contains `count_q[15:0]` (datapath), `period_q[15:0]`, `mode_q`, `irq_en_q`, `tc_q`, `st_q` (control). Six registers total — that is the design\'s entire state, and it is now enumerable, which means reset values and readback behaviour are enumerable too. A diagram that hides registers inside grey boxes has deferred the real work.',
      '**Write the register map.** Each row: address, name, access, fields with bit ranges, reset value. The PIT map: CTRL (0x0, R/W with a W1C field at bit 8 and read-only RUN at bit 0), PERIOD (0x1, R/W, reset 0x0000), COUNT (0x2, read-only, live counter value), 0x3 reserved (reads 0x0000, writes ignored). Two fields need care in the access column: CTRL mixes plain R/W fields (MODE, IRQ_EN), a read-only status view (RUN), and a W1C field (TC) — real register maps do mix these, and the access column is what keeps software writers from guessing wrong.',
      '**Pin the timing expectations with a cycle table.** The spec\'s headline claim (B5) deserves its own artifact: the cycle-by-cycle trace for PERIOD=3, periodic, IRQ enabled. Writing it as a table before coding does two things: it validates B5 (you discover whether your reading of the spec produces the claimed cycle counts), and it becomes the waveform the testbench will assert. This is the moment off-by-one errors surface — while they are still a table edit.',
      '**The register list doubles as the reset plan.** Each row gets a reset value: `count_q` -> 0, `period_q` -> 0x0000, `mode_q` -> 0 (one-shot), `irq_en_q` -> 0 (interrupts off after reset), `tc_q` -> 0, `st_q` -> IDLE. Every register in the design has a defined reset value, and a reviewer can check the reset column against spec B1 in seconds. When this table and the register map agree, the architecture artifact is complete and the freeze checklist (next lesson) is mostly done.',
    ].join('\n\n'),
    deepDive: [
      'Why is `tc_tick` a datapath-to-control signal rather than control computing the compare itself? Because the compare (`count_q == 1`) reads a datapath register. If control recomputed it from a copy, you would have two registers holding the count — a partition bug (module 05 treats this systematically: control reads datapath *status*; datapath never reads control\'s state registers except through the defined contract). Here the contract is: datapath exposes `count_zero` and `tc_tick` as status; control owns all decision registers. Copying state across the partition "to make things easier" is how designs grow two sources of truth.',
      'The combinational read mux (`cfg_rdata` selected by `cfg_addr`) is an architecture decision worth recording now, not in the RTL: same-cycle reads keep software simple (a read is one bus transaction, no waiting state) and cost one 16-bit 4:1 mux. A registered read would add a read-pipeline register and one cycle of latency on every access — better for timing on very wide buses, unnecessary here. Lesson 3 records it in the decision log with this rationale, so that when someone later asks "why is rdata combinational?", the answer is a document, not folklore.',
      'Notice the timing table exposes a subtlety B5 implied but the table makes undeniable: the counter never *displays* the value 0 in periodic mode (it reloads on the same edge that would show 0), while in one-shot mode it rests at 0. COUNT readback therefore behaves differently by mode — exactly the kind of fact software teams need and the kind that never appears in prose specs. The register map\'s COUNT row should say "0..P while running; rests at 0 in one-shot after expiry; holds on STOP".',
    ].join('\n\n'),
    examples: [
      {
        title: 'PIT architecture: partition contract and register list',
        language: 'text',
        code: [
          'PIT ARCHITECTURE v1.0',
          '',
          'PARTITION',
          '  datapath: count_q[15:0], decrementer, reload mux, zero/one detect',
          '  control : period_q[15:0], mode_q, irq_en_q, tc_q, st_q (IDLE/RUN),',
          '            cfg write decode, read mux, irq gate',
          '  CONTRACT (all signals, both directions):',
          '    control -> datapath: run, count_load (reload PERIOD this edge)',
          '    datapath -> control: tc_tick (running and count==1),',
          '                         count_zero (count==0)',
          '',
          'REGISTER LIST (name, width, reset, owner)',
          '  count_q   16   16\'h0000   datapath   live down-counter',
          '  period_q  16   16\'h0000   control    PERIOD storage',
          '  mode_q     1    1\'b0      control    0=one-shot, 1=periodic',
          '  irq_en_q   1    1\'b0      control    IRQ mask',
          '  tc_q       1    1\'b0      control    sticky TC flag (W1C)',
          '  st_q       1    ST_IDLE   control    run state',
          '',
          'TIMING EXPECTATION: PERIOD=3, MODE=periodic, IRQ_EN=1',
          '  cyc :   0     1     2     3     4     5     6     7',
          '  bus :  WR    -     -     -     -     -     -     -',
          '         EN=1,MODE=1,IRQ_EN=1',
          '  cnt :   -     3     2     1     3     2     1     3',
          '  tick:   -     -     -    [1]    -     -    [1]    -',
          '  TC  :   -     -     -     -     1     1     1     1',
          '  irq :   -     -     -     -     1     1     1     1',
          '  (TC = tc_q, registered one cycle after tick; irq = TC & IRQ_EN;',
          '   TC stays 1 until W1C)',
        ].join('\n'),
        explanation: [
          'The contract is exactly three wires plus the shared clock/reset. `count_load` is asserted by control when the START write decodes; `tc_tick` and `count_zero` are datapath status. Everything else is internal to one side.',
          'Six registers, each with width, reset value and owner. This list is what the clocked processes in module 11 will transcribe one-for-one — no register is invented during coding.',
          'The cycle table validates B5\'s claim: START write in cycle 0, count shows 3,2,1, and the tick appears in cycle 3 — exactly P cycles after the write. Second tick in cycle 6: interval P=3. The table and the spec agree.',
          'TC (tc_q) is high from cycle 4: it is the registered flag, one cycle behind the tick. irq_o rises with it (IRQ_EN=1). Software sees the level, not the tick — the distinction between internal event and observable event is now explicit.',
          'Note count at cycles 3->4: shows 1 then 3. In periodic mode COUNT never displays 0 — the reload shares the edge with the would-be zero. The register map notes this.',
        ],
      },
      {
        title: 'PIT register map (software-facing artifact)',
        language: 'text',
        code: [
          'PIT REGISTER MAP v1.0          reset values in [brackets]',
          '',
          'ADDR  NAME    ACCESS  FIELDS',
          '0x0   CTRL    R/W     [0]  ENABLE  W: 1=start/restart, 0=stop',
          '                      R : reflects run state (read-only view)',
          '                      [1]  MODE    0=one-shot [0], 1=periodic',
          '                      [2]  IRQ_EN  IRQ mask [0]',
          '                      [8]  TC      sticky terminal-count flag [0]',
          '                            read: event pending',
          '                            write: 1 clears (W1C); hardware set',
          '                            wins if a tick coincides',
          '                      [7:3],[15:9] reserved, read 0',
          '0x1   PERIOD  R/W     [15:0] period P in cycles [0x0000]',
          '                      P=0: timer runs but never fires',
          '                      writing PERIOD does not affect a running count',
          '0x2   COUNT   R       [15:0] live counter [0x0000]',
          '                      0..P while running (never shows 0 in',
          '                      periodic mode); rests at 0 after one-shot',
          '                      expiry; holds on STOP',
          '0x3   ---     RESERVED reads 0x0000; writes ignored',
        ].join('\n'),
        explanation: [
          'Every field carries: bit position, access mode, meaning, reset value, and the corner-case sentence where one exists. Software teams can write drivers from this alone.',
          'CTRL deliberately documents the read/write asymmetry per field: ENABLE reads back as run state (a read-only view), TC is W1C. Mixed-access registers are common; undocumented mixed access is a support ticket factory.',
          'The COUNT row encodes the mode-dependent readback discovered in the cycle table — architecture artifacts cross-check each other.',
          'Reserved space is explicit with defined read/write behaviour (B11/B12), so verification can assert it and software cannot accidentally depend on it.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'PIT block diagram with named registers',
        content: [
          '                        PIT',
          '  cfg_wr ----+--------------------------+',
          '  cfg_addr ->|  CONTROL                 |',
          '  cfg_wdata->|  [decode]                |',
          '             |   |        period_q[15:0]|---- reload value',
          '             |   v        mode_q, irq_en_q,',
          '             |  st_q (IDLE/RUN)  tc_q   |',
          '             |      |        ^    |     |      +-------------+',
          '             |      | run    |    |     |      |  DATAPATH   |',
          '             |      | count_load  |     |      | count_q[15:0]',
          '             |      +--------|----|-----|----->|   |  ^      |',
          '             |               |    |     |      |   v  |      |',
          '             |               |    |     |      |  -1 / reload   ',
          '             |               |    |     |      |  zero/one det  ',
          '             |               |    |     |<-----|-- tc_tick      ',
          '             |               |    |     |<-----|-- count_zero   ',
          '             |  [read mux]   |    |     |      +-------------+',
          '  cfg_rdata <-+             |    |     |',
          '                             |    |     |',
          '             irq_o <---------+    +-----+   (tc_q & irq_en_q)',
        ].join('\n'),
        caption:
          'Every register named and owned; the control-datapath contract is the three-wire bundle (run, count_load in; tc_tick, count_zero out).',
      },
      {
        kind: 'waveform',
        title: 'PIT headline sequence: PERIOD=3, periodic, IRQ_EN=1',
        content: [
          '         __    __    __    __    __    __    __    __',
          'clk   __|  |__|  |__|  |__|  |__|  |__|  |__|  |__|  |__',
          '        c0    c1    c2    c3    c4    c5    c6    c7',
          '',
          'cfg_wr ===X==______________________________',
          'addr    ==X==0==============================',
          'wdata   ==X==EN|MODE|IRQ_EN==============',
          '',
          'count   =====X==3=====X==2=====X==1=====X==3=====X==2==',
          '                       (decrements each cycle while running)',
          '',
          'tick    _______________________/‾‾‾____________________',
          '                               ^c3 (count==1 & run)',
          'tc_q    ______________________________/‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾',
          '                                      ^c4: registered flag',
          'irq_o   ______________________________/‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾',
          '                                      (tc_q & irq_en_q)',
          '',
          'Claims from B5 verified: first tick at c3 = P cycles after the',
          'c0 write; next tick at c6 (interval P); irq is a LEVEL from c4.',
        ].join('\n'),
        caption:
          'educational waveform (illustrative): the cycle table of the architecture artifact drawn as a waveform; the testbench will assert exactly these edges.',
      },
    ],
    tables: [
      {
        caption: 'PIT register map summary',
        headers: ['Addr', 'Name', 'Access', 'Fields', 'Reset'],
        rows: [
          ['0x0', 'CTRL', 'R/W (+W1C field)', '[0] ENABLE/RUN, [1] MODE, [2] IRQ_EN, [8] TC (W1C)', '0x0000'],
          ['0x1', 'PERIOD', 'R/W', '[15:0] period P (P=0: never fires)', '0x0000'],
          ['0x2', 'COUNT', 'R', '[15:0] live counter', '0x0000'],
          ['0x3', 'reserved', '—', 'reads 0x0000, writes ignored', '—'],
        ],
      },
      {
        caption: 'Control-datapath contract',
        headers: ['Signal', 'From -> To', 'Width', 'Meaning'],
        rows: [
          ['run', 'control -> datapath', '1', 'Timer active (st_q == RUN)'],
          ['count_load', 'control -> datapath', '1', 'Reload count_q from period_q this edge'],
          ['tc_tick', 'datapath -> control', '1', 'Running and count_q == 1 (fires this edge)'],
          ['count_zero', 'datapath -> control', '1', 'count_q == 0 (hold condition)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Drawing grey boxes ("control", "datapath") without naming the registers inside.',
        fix:
          'Name and size every register on the diagram and in the register list. The register list is the deliverable; boxes without registers cannot be reset-checked, cannot be readback-checked, and let duplicates hide (two owners for one state).',
      },
      {
        mistake: 'Letting control recompute datapath status from its own copy of the data.',
        fix:
          'One register, one owner. Control reads datapath status (tc_tick, count_zero); it never keeps a second copy of the counter. The three-wire contract exists precisely so nobody "helpfully" adds a parallel copy of count in the control block.',
      },
      {
        mistake: 'Leaving timing expectations as prose ("a few cycles later").',
        fix:
          'Write the cycle table for the headline sequence with exact cycle numbers, and draw the matching waveform. Off-by-one errors are visible in a table at architecture time and nearly invisible in prose; after coding, they are simulation bugs.',
      },
    ],
    guidedPractice: {
      title: 'Extend the architecture for the W1C-clear readback corner',
      brief:
        'Software writes CTRL with bit8=1 (clear TC) in the same cycle the hardware tick fires (count_q==1, running, periodic). Using the contract and register list, determine what tc_q becomes, what count_q becomes, and what software reads of TC one cycle later — then write the cycle-table rows that document the coincidence.',
      starterCode: [
        '// Coincidence table: PERIOD=3, periodic, tick at c3,',
        '// software writes CTRL wdata[8]=1 also in c3',
        '  cyc :   2     3     4     5',
        '  cnt :   2     1     ?     ?',
        '  SWWR:   -    W1C    -     -',
        '  tick:   -    [1]    -     -',
        '  TC  :   -     ?     ?     ?',
      ].join('\n'),
      expectedBehavior:
        'Per B10, the hardware set wins: tc_q becomes 1 at the c3->c4 edge (the event is not lost). count_q reloads to 3 (periodic). Software reading CTRL in c5 sees TC=1 and must issue another W1C. The table rows: cnt = 3 at c4; TC = 1 at c4 onward until the next W1C. The architecture already supports this — the exercise is proving the artifacts answer the question without touching RTL.',
      hints: [
        'B10 was written precisely for this edge: set priority over clear.',
        'The tick and the W1C are independent decode events; both act on tc_q at the same edge.',
        'The reload is unaffected by the W1C — count_load and tc_clr are different fields.',
      ],
    },
    practiceExercises: [
      {
        title: 'Register map for a second timer',
        brief:
          'A watchdog cousin of the PIT needs: a service register (write to restart the countdown), a timeout flag with W1C, an IRQ mask, and a period register. Write its four-row register map with access modes and reset values, reusing PIT conventions.',
        expectedBehavior:
          '0x0 CTRL: [0] IRQ_EN [0], [8] TOUT sticky W1C [0], [15] ENABLE [0]; 0x1 PERIOD R/W [0x0000]; 0x2 SRVC write-only (any write services; reads 0x0000); 0x3 COUNT R. Conventions reused: W1C for the sticky flag, mask in CTRL, reserved read-as-zero elsewhere, reset column for every row. The mapping of one artifact style onto a sibling block is the sign the conventions are load-bearing.',
        hints: [
          'Keep CTRL bit roles consistent with the PIT where the meaning matches.',
          'A write-only register still needs a defined read value.',
          'Every row: access mode AND reset value.',
        ],
      },
      {
        title: 'Cycle table for one-shot',
        brief:
          'Write the cycle table (cyc, bus, cnt, tick, TC, irq, run) for PERIOD=3, MODE=one-shot (periodic=0), IRQ_EN=1, START written at cycle 0, for cycles 0 through 6. Verify it against B5 and B7.',
        expectedBehavior:
          'c0: WR EN=1 (MODE=0). c1-2: cnt 3, 2. c3: cnt=1, tick. c4: cnt=0, run=0 (one-shot stops), TC=1, irq=1. c5-6: cnt rests at 0, run stays 0, TC/irq stay asserted until W1C. Checks: first tick P cycles after write (B5); one-shot stops with count resting at 0 (B7); COUNT reads 0 after expiry (B6-adjacent, register map note).',
        hints: [
          'One-shot differs from periodic only at the tick: no reload, and the FSM leaves RUN.',
          'TC and irq are registered/level — they persist after run drops.',
          'The final count value after the tick edge is 0 (decrement of 1), not a reload.',
        ],
      },
    ],
    assessment: {
      title: 'Architecture artifacts checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'In the PIT partition, why does the control block receive tc_tick from the datapath instead of computing the compare itself?',
          options: [
            'Control has no comparators available',
            'The count register is owned by the datapath; duplicating it in control would create two sources of truth',
            'It reduces the register map size',
            'The config bus cannot carry comparison results',
          ],
          answer:
            'The count register is owned by the datapath; duplicating it in control would create two sources of truth',
          explanation:
            'One register, one owner. Control consumes status wires; it must not keep a parallel copy of datapath state that can drift out of sync.',
          hint: 'What happens if two registers ever disagree?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt:
            'Using the timing expectation table (PERIOD=3, periodic, IRQ_EN=1, START at cycle 0), what does irq_o show at cycle 4?',
          options: ['0', '1', 'x', 'It toggles'],
          answer: '1',
          explanation:
            'The tick occurs at cycle 3, so the sticky TC flag is 1 from cycle 4; with IRQ_EN=1, irq_o = TC & IRQ_EN = 1 — and it stays 1 until software issues the W1C.',
          hint: 'TC is registered: it appears one cycle after the tick.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'In periodic mode, the COUNT register can be observed reading 0.',
          answer: 'false',
          explanation:
            'The reload shares the edge with the would-be zero: count shows 1, then 3 (for P=3). Only one-shot mode lets COUNT rest at 0. The register map documents this mode-dependent readback.',
          hint: 'What loads into count_q on the tick edge in periodic mode?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Name the three wires of the PIT control-datapath contract and their directions.',
          answer:
            'run and count_load from control to datapath; tc_tick (and count_zero) from datapath to control',
          explanation:
            'Control commands (run, count_load); datapath status (tc_tick, count_zero). Four named wires total when the zero status is counted — the lesson\'s "three-wire bundle" counts run, count_load and tc_tick; count_zero rides along as the hold-detect status.',
          hint: 'Two commands downstream, status upstream.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt:
            'A reviewer asks why cfg_rdata is combinational. Where should the answer live?',
          options: [
            'In the RTL comments only',
            'In the decision log recorded during architecture, with the trade-off (same-cycle reads vs a read-latency register)',
            'In the testbench',
            'Nowhere; it is obvious',
          ],
          answer:
            'In the decision log recorded during architecture, with the trade-off (same-cycle reads vs a read-latency register)',
          explanation:
            'Architecture decisions with alternatives considered belong in the decision record, so future engineers inherit the rationale rather than rediscovering or reversing it.',
          hint: 'Module 02 lesson 3 formalizes exactly this artifact.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      {
        term: 'Partition contract',
        definition:
          'The complete set of signals crossing the datapath/control boundary — nothing else may cross.',
      },
      {
        term: 'Register map',
        definition:
          'Software-facing table of addresses, fields, access modes and reset values.',
      },
      {
        term: 'Register list',
        definition:
          'Every register in the design with name, width, reset value and owning block — the coding stage transcribes it.',
      },
      {
        term: 'Timing expectation',
        definition:
          'A cycle-numbered table (and matching waveform) asserting exactly when observable events occur.',
      },
      {
        term: 'Single source of truth',
        definition:
          'Each piece of state lives in exactly one register, owned by one block; others read status wires.',
      },
    ],
    revisionSummary: [
      'Partition first, and freeze the contract: PIT = counter datapath + config/flag control, joined by run, count_load, tc_tick, count_zero.',
      'Name and size every register on the diagram; six registers hold the PIT\'s entire state.',
      'Register map rows carry address, access (including W1C and read-only views), reset value and corner-case sentences.',
      'Timing expectations are cycle tables: START at c0 -> first tick at cP; TC/irq registered one cycle later, level until W1C.',
      'COUNT readback differs by mode (never 0 in periodic; rests at 0 in one-shot) — found by the table, documented in the map.',
      'Every register has a defined reset value; the reset column cross-checks spec B1.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Register-transfer level',
        url: 'https://en.wikipedia.org/wiki/Register-transfer_level',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Interrupt',
        url: 'https://en.wikipedia.org/wiki/Interrupt',
        kind: 'article',
      },
    ],
    estimatedMinutes: 55,
  },
  {
    id: 'rtl-m02-l3',
    title: 'Micro-Architecture Decisions and the Freeze',
    summary:
      'Architecture is a sequence of decisions, each with alternatives and a rationale. This lesson writes the PIT decision log, works the corner-case table, and defines the freeze checklist that lets coding begin.',
    objectives: [
      'Record micro-architecture decisions with options considered, choice and rationale.',
      'Enumerate corner cases in a table where each row pairs a corner with its defined behaviour and its verifying test.',
      'Apply a freeze checklist that gates the transition from architecture to coding.',
      'Justify why decision records outlive individual engineers and tool versions.',
    ],
    whyItMatters:
      'The difference between an architecture that reviews well and one that codes well is decision hygiene. Every non-obvious choice — reload on the same edge, set-wins-on-coincide, combinational read data — was chosen against alternatives; if the reasoning lives only in the designer\'s head, every future engineer must re-derive it or silently reverse it. Decision logs are cheap to write and are the artifact that makes a design maintainable by people who were not in the room.',
    prerequisites: ['rtl-m02-l1', 'rtl-m02-l2'],
    explanation: [
      'A **decision record** is one row: the question, the options considered, the choice, the rationale, and (optionally) the revisit condition. The PIT produces eight load-bearing decisions, and none of them is "obvious": D1 count down (not up) with reload-at-one; D2 tick compare against 1 (not zero) so the reload shares the terminal edge; D3 sticky TC + W1C with set-priority; D4 START always reloads; D5 stop preserves count; D6 PERIOD=0 is a defined no-op; D7 combinational read data; D8 mode stored as a config bit rather than a separate FSM per mode. Each has at least one rejected alternative whose rejection reason is worth more than the choice itself — rejected alternatives are how reviewers detect that you actually thought, and how future maintainers avoid re-litigating settled ground.',
      'The **corner-case table** pairs every corner with its defined behaviour and its future test ID. The PIT corners: PERIOD=0 (runs, never fires; test T6), START-while-running (restart, count reloads; T3), STOP-while-running (hold count; T4), tick-vs-W1C coincide (set wins; T7), PERIOD written while running (no effect on current countdown; T8), reset mid-run (all state to reset values; T9). Two properties make this table work: every corner was discoverable from the spec (not invented during verification), and every row names its test — corners without tests are corners without definitions.',
      'The **freeze checklist** gates the transition to coding. For the PIT: (1) every requirement R1-R7 maps to at least one behaviour statement; (2) every behaviour statement maps to at least one planned test; (3) the register list names every register with width and reset value; (4) the partition contract is a closed signal list; (5) the corner-case table has no "TBD"; (6) the decision log has no unanswered question. Six checks, each binary, each checkable by a reviewer in minutes. When all six pass, the architecture is frozen: further changes go through change records, not silent edits.',
      '**Why the paperwork pays.** The decision log is the only artifact that answers "why is the counter reloaded on the same edge instead of counting through zero?" in year three, after the original designer has moved on and the person adding a feature is staring at code whose shape looks arbitrary. Freeze checklists prevent the most expensive failure mode in small teams: coding an unfinished architecture out of schedule pressure, then spending the saved days debugging the consequences. The checklist is not bureaucracy; it is the accumulated scar tissue of projects that skipped it.',
      'One more habit completes the lesson: **decisions have revisit conditions**. D7 (combinational read data) carries "revisit if the config bus grows past 32 bits or the fanout timing fails" — the conditions under which the choice should be re-opened. A decision without a revisit condition reads as eternal law; a decision with one reads as engineering, which is what it is. This is also the honest answer to "what if the requirements change?" — the log shows exactly which rows a new requirement touches.',
    ].join('\n\n'),
    deepDive: [
      'D2 deserves a paragraph because it is the lesson\'s subtlest decision: the tick fires when `count == 1`, not when `count == 0`. Option A (compare at zero) forces the counter to spend a visible cycle at 0 before reloading — COUNT readback shows 0 in periodic mode, and the interval becomes P+1 unless a separate skip-zero mechanism is added. Option B (compare at one) merges the decrement-to-zero and the reload into one edge: the counter never shows 0 in periodic mode, and the interval is exactly P. Option B was chosen; the cost is that one-shot mode must still drive the counter to 0 on the final tick (the reload mux selects 0 when stopping). Every reader of the RTL will at some point wonder why the compare is against 1 — the decision log is what turns that confusion into a two-minute read.',
      'D4 (START always reloads) interacted with D5 (stop preserves count) more than the requirements suggested. If START resumed rather than reloaded, "restart the interval" would need a second command, and software could not re-synchronize a drifted timer without STOP-then-START. Reload-on-start makes the START write idempotent from software\'s view and removes a whole class of "timer is mid-interval" states that tests would otherwise have to enumerate. Note the reasoning is about *software-visible simplicity*, not gate count — micro-architecture decisions at interfaces are made for the block\'s users.',
      'The freeze checklist\'s six checks encode a dependency order worth noticing: requirements -> behaviours -> tests is one chain; registers -> reset -> readback is another; the partition contract and decision log sit under both. A "TBD" anywhere breaks all chains passing through it, which is why the checklist is binary per row: "mostly frozen" architectures produce exactly the designs where coding invents structure, and the invention is never reviewed as architecture because everyone believes the architecture stage already happened.',
    ].join('\n\n'),
    examples: [
      {
        title: 'PIT decision log v1.0',
        language: 'text',
        code: [
          'PIT DECISION LOG v1.0',
          '',
          'ID  QUESTION                    OPTIONS            CHOSEN + WHY',
          'D1  Count direction             up / down          DOWN: expiry at a',
          '                                                   known low value;',
          '                                                   compare vs 1 is a',
          '                                                   cheap detect',
          'D2  Terminal compare            ==0 / ==1          ==1: reload shares',
          '                                                   the terminal edge;',
          '                                                   interval = exactly P;',
          '                                                   periodic COUNT never',
          '                                                   shows 0',
          'D3  Event + ack                 pulse / sticky+W1C /  sticky+W1C, SET',
          '                                read-to-clear      wins on coincide:',
          '                                                   events never lost',
          'D4  START semantics             reload / resume    RELOAD: software can',
          '                                                   re-sync any time;',
          '                                                   idempotent',
          'D5  STOP semantics              clear / hold       HOLD: resume-and-',
          '                                                   stop useful; clear',
          '                                                   loses position',
          'D6  PERIOD=0                    undefined / no-op  NO-OP (runs, never',
          '                                                   fires): no wraparound',
          '                                                   surprises',
          'D7  Read data path              combinational /    COMBINATIONAL: 1-cycle',
          '                                registered         reads, one 4:1 mux;',
          '                                read               revisit if bus >32b or',
          '                                                   fanout timing fails',
          'D8  Mode representation         one FSM per mode / MODE as config bit',
          '                                mode bit in one    inside one FSM: fewer',
          '                                FSM                states, one code path',
        ].join('\n'),
        explanation: [
          'Eight rows, each with the rejected option still visible. D2\'s row carries the interval claim ("exactly P") — the single most misunderstood property of countdown timers — as its rationale.',
          'D7 has a revisit condition: the decision is engineering, not law, and the log says exactly when to re-open it.',
          'D3\'s rationale ("events never lost") is a software-visible promise — the log records promises, not just structures.',
          'D8\'s rejected option (one FSM per mode) is the design that doubles control logic and doubles tests; recording that prevents a well-meaning refactor from reintroducing it.',
        ],
      },
      {
        title: 'PIT corner-case table with test mapping',
        language: 'text',
        code: [
          'PIT CORNER-CASE TABLE v1.0',
          '',
          'CORNER                        DEFINED BEHAVIOUR        TEST',
          'PERIOD=0, START               runs, never fires,       T6',
          '                              count stays 0',
          'START while running           restart: count reloads   T3',
          '                              from PERIOD this edge',
          'STOP while running            run drops, count holds   T4',
          '                              at current value',
          'tick and W1C same edge        SET wins (B10); event    T7',
          '                              not lost; SW re-acks',
          'PERIOD write while running    current countdown        T8',
          '                              unaffected; next reload',
          '                              uses new PERIOD',
          'reset while running           all regs to reset vals;  T9',
          '                              irq drops immediately',
          'one-shot expiry readback      COUNT rests at 0; RUN=0; T5',
          '                              TC set until W1C',
        ].join('\n'),
        explanation: [
          'Every corner was derivable from spec v1.0\'s behaviour statements — none was discovered during coding. That is the test of a complete spec: corners come from the ambiguity hunt, not from the debug log.',
          'Each row names its test (T3..T9). The corner table IS the seed of the verification plan; module 11\'s test list will match it row for row.',
          'The one-shot row documents readback state (COUNT rests at 0, RUN=0) — observable behaviour, not just internal behaviour.',
          'Reset-mid-run matters because irq_o is registered-adjacent logic: the test asserts irq drops without waiting for a clock edge (async reset path).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Decision flow: from behaviour statements to frozen architecture',
        content: [
          '  R1..R7 (requirements)',
          '     |  interrogation (lesson 1)',
          '     v',
          '  B1..B12 (behaviour statements)          <-- ambiguities resolved',
          '     |                                    <-- here, with sign-off',
          '     v',
          '  D1..D8 (decision log)    C1..C8 (corner table + tests)',
          '     \\                        /',
          '      v                      v',
          '  FREEZE CHECKLIST (6 binary checks)',
          '     |  all pass',
          '     v',
          '  ARCHITECTURE FROZEN  -->  RTL coding may begin (module 03/11)',
          '',
          '  Any later change: change record first, artifacts updated in',
          '  dependency order, THEN code. The loop from m01-l3 still governs.',
        ].join('\n'),
        caption:
          'Freeze is a gate, not a mood: six binary checks, then changes require records. The corner table seeds the verification plan.',
      },
    ],
    tables: [
      {
        caption: 'The freeze checklist (PIT v1.0)',
        headers: ['#', 'Check', 'Status gate'],
        rows: [
          ['1', 'Every requirement maps to >=1 behaviour statement', 'R->B coverage complete'],
          ['2', 'Every behaviour statement maps to >=1 planned test', 'B->T coverage complete'],
          ['3', 'Register list complete: name, width, reset value, owner', 'No unnamed state'],
          ['4', 'Partition contract is a closed signal list', 'No implicit crossings'],
          ['5', 'Corner-case table has no TBD rows', 'All corners defined'],
          ['6', 'Decision log has no open questions', 'All alternatives resolved'],
        ],
      },
      {
        caption: 'Decision record fields',
        headers: ['Field', 'Content', 'PIT example (D2)'],
        rows: [
          ['Question', 'The design question, stated neutrally', 'Compare against 0 or 1 for terminal count?'],
          ['Options', 'Alternatives actually considered', 'compare==0 with visible zero cycle; compare==1 with shared reload edge'],
          ['Choice', 'What was selected', 'Compare == 1'],
          ['Rationale', 'Why, in terms of observable behaviour', 'Interval is exactly P; periodic COUNT never shows 0'],
          ['Revisit condition', 'When to re-open the decision', 'If a visible zero cycle is ever required by software'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Recording only the chosen option ("TC is sticky") without the alternatives and rationale.',
        fix:
          'Write the rejected options with one-line rejection reasons. The alternatives are what let a reviewer check the reasoning, and what stop a future maintainer from re-proposing the rejected design as an improvement.',
      },
      {
        mistake: 'Treating the freeze as schedule theatre: "we are frozen" while TBDs remain in the corner table.',
        fix:
          'The checklist is binary. A single TBD means not frozen — and the honest responses are either to resolve it now (an hour of thinking beats a week of debugging) or to consciously de-scope that corner with a recorded decision. Silent TBDs surface as simulation "discoveries" at the worst time.',
      },
      {
        mistake: 'Amending the architecture during coding without a change record.',
        fix:
          'Coding will reveal genuine gaps; that is normal. The discipline is: stop, write the change record (what, why, which artifacts change), update spec/architecture/log in dependency order, then continue coding. Unrecorded amendments rot the documents and, worse, train the team to stop trusting them.',
      },
    ],
    guidedPractice: {
      title: 'Decision record for a new requirement',
      brief:
        'Requirement R8 (free-running mode, from lesson 1\'s exercise) passed review. Write the decision record for its encoding (D9): question, at least two options, your choice, rationale in software-visible terms, and a revisit condition. Then add its corner rows (FREE + STOP write; FREE + PERIOD=0) to the corner table with test IDs.',
      starterCode: [
        '// D9  QUESTION: how is free-running mode encoded and how does',
        '//               it interact with STOP?',
        '//     OPTIONS:  (a) ...',
        '//               (b) ...',
        '//               (c) ...',
        '//     CHOSEN:   ...',
        '//     RATIONALE (software-visible): ...',
        '//     REVISIT:  ...',
        '// CORNER ROWS:',
        '//   FREE=1 + STOP write    -> ...   (test T10)',
        '//   FREE=1 + PERIOD=0      -> ...   (test T11)',
      ].join('\n'),
      expectedBehavior:
        'A strong record: options (a) new CTRL[3] FREE bit overriding STOP and one-shot expiry; (b) separate FREE register with priority over CTRL; (c) treat free-running as periodic with a MAX period value. Chosen: (a), rationale — one register, one code path, STOP-ignored is documentable and testable; revisit — if a third mode arrives, replace the bit with a MODE[1:0] field (recorded as the migration path). Corners: FREE+STOP -> write ignored, timer keeps running (T10); FREE+PERIOD=0 -> B6 stands, never fires (T11).',
      hints: [
        'Options should differ in software-visible behaviour, not just in encoding.',
        'The revisit condition usually names the requirement that would force a redesign.',
        'Corners are pairwise interactions of the new feature with existing defined behaviour.',
      ],
    },
    practiceExercises: [
      {
        title: 'Challenge a decision',
        brief:
          'A reviewer proposes changing D2 to compare-at-zero ("it is more intuitive"). Write the two-paragraph response: what observable behaviour changes (interval, COUNT readback, reload mechanics), and under what conditions you would accept the change.',
        expectedBehavior:
          'Response: the change makes the interval P+1 (the counter spends a visible cycle at 0 before reload) unless a skip-zero path is added, breaks B5\'s "exactly P cycles" promise and every existing timing test; COUNT readback in periodic mode would show 0, changing software-visible behaviour; the reload mux must handle a separate skip-zero mechanism. Accept only with a spec change record (B5 revision, register map COUNT row, re-derivation of T3/T5/T6) — i.e., treat it as the architecture change it is, not a code tweak.',
        hints: [
          'Find every artifact that references the interval claim: spec B5, decision log D2, corner tests.',
          'The reviewer\'s instinct is not wrong — intuition has value; the question is what the change costs in promises.',
          'Acceptance criteria should be procedural (change record) as well as technical.',
        ],
      },
      {
        title: 'Audit an unfrozen architecture',
        brief:
          'A peer\'s block (a PWM generator) is "ready to code". Its artifacts: a block diagram with two grey boxes, a register map with three rows but no reset column, and a note "corners handled in TB". Identify every freeze-checklist failure and the minimal artifact that fixes each.',
        expectedBehavior:
          'Failures: (1) no register list — fix by naming registers inside the boxes with widths; (2) no reset column — add reset value per register row (map and list must agree); (3) no behaviour statements — cannot check requirement coverage; (4) no corner table — "handled in TB" is the definition of undefined; (5) no partition contract — grey boxes hide the signal list; (6) no decision log — open questions unknown. Minimal fixes: one register list, one reset column, one behaviour-statement pass, one corner table with TBDs resolved, one contract signal list, one decision log.',
        hints: [
          'Run the six checks mechanically; each fail names its missing artifact.',
          '"Corners handled in TB" inverts the dependency — tests derive from defined corners.',
          'Grey boxes are the diagram-level symptom of a missing register list.',
        ],
      },
    ],
    assessment: {
      title: 'Decisions and freeze checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'Why does PIT decision D2 compare against 1 rather than 0 for the terminal count?',
          options: [
            'Comparators against 1 use fewer gates',
            'The reload then shares the terminal edge, making the interval exactly P cycles',
            'Zero comparison is illegal in Verilog',
            'It avoids resetting the counter',
          ],
          answer:
            'The reload then shares the terminal edge, making the interval exactly P cycles',
          explanation:
            'Compare-at-1 lets the decrement-to-zero and the reload happen on the same edge: COUNT never shows 0 in periodic mode and the interval is exactly P. Compare-at-0 would add a visible zero cycle (interval P+1).',
          hint: 'The rationale is a cycle-count promise, not a gate count.',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt:
            'A corner-case row whose behaviour is defined but whose test is not yet named can pass the freeze checklist.',
          answer: 'false',
          explanation:
            'Check 5 requires no TBDs, and an unnamed test is a TBD in disguise: the corner table doubles as the seed of the verification plan, so every row carries its test ID.',
          hint: 'Defined-but-untested corners are how corners get redefined silently.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'short-answer',
          prompt:
            'State the PIT\'s set-priority rule for the tick-versus-W1C coincidence and the reason it was chosen.',
          answer:
            'The hardware set wins: if a tick and a software W1C clear land on the same edge, TC ends up set; chosen so terminal-count events are never lost',
          explanation:
            'D3/B10: events are the block\'s whole purpose, so the tie favours keeping the event; software simply re-acknowledges. Losing an event silently is a far worse failure than one extra software write.',
          hint: 'Which error would software rather see?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt:
            'During coding, a designer discovers the read mux needs an extra field and quietly adds it to the RTL. Which freeze-discipline rule was broken, and what was the correct sequence?',
          options: [
            'None; coding stage owns such details',
            'A change record first, then artifact updates (spec, register map, decision log), then the RTL edit',
            'The testbench should have been updated first',
            'Read muxes are exempt from the register map',
          ],
          answer:
            'A change record first, then artifact updates (spec, register map, decision log), then the RTL edit',
          explanation:
            'A new readable field changes the register map and the spec (B11) — software-visible artifacts. The discipline is record, update artifacts in dependency order, then code; otherwise documents and design diverge.',
          hint: 'Who else consumes the register map?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'multiple-choice',
          prompt:
            'Which entry belongs in a decision record\'s "revisit condition" field?',
          options: [
            'The date the decision was made',
            'The name of the person who approved it',
            'The concrete future conditions under which the choice should be re-opened',
            'The line numbers of the affected RTL',
          ],
          answer:
            'The concrete future conditions under which the choice should be re-opened',
          explanation:
            'Revisit conditions (e.g. "if the config bus exceeds 32 bits") turn decisions from folklore into engineering: they say when the trade-off should be re-evaluated, not just what was chosen.',
          hint: 'The field answers "when should we think about this again?"',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      {
        term: 'Decision record',
        definition:
          'Question, options considered, choice, rationale and revisit condition for one architecture decision.',
      },
      {
        term: 'Corner-case table',
        definition:
          'Table pairing each boundary condition with its defined behaviour and its verifying test ID.',
      },
      {
        term: 'Freeze checklist',
        definition:
          'Binary checks gating the architecture-to-coding transition; a single fail means not frozen.',
      },
      {
        term: 'Change record',
        definition:
          'The documented amendment that must precede any post-freeze artifact change.',
      },
      {
        term: 'Revisit condition',
        definition:
          'The stated future circumstance under which a settled decision should be re-evaluated.',
      },
    ],
    revisionSummary: [
      'Architecture = decisions with alternatives: the PIT froze D1-D8, each with rejected options and rationale.',
      'D2 is the subtle one: compare-at-1 shares the reload edge; interval is exactly P; periodic COUNT never shows 0.',
      'The corner table pairs corners with defined behaviour AND test IDs; it seeds the verification plan.',
      'Freeze = six binary checks (R->B, B->T coverage, register list, contract, corners, decisions). One TBD = not frozen.',
      'Post-freeze changes go through change records with artifacts updated in dependency order.',
      'Decisions carry revisit conditions — engineering, not law.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Design flow (EDA)',
        url: 'https://en.wikipedia.org/wiki/Design_flow_(EDA)',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Architecture description',
        url: 'https://en.wikipedia.org/wiki/Architecture_description',
        kind: 'article',
      },
    ],
    estimatedMinutes: 50,
  },
];
