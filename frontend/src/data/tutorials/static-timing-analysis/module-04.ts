import type { TutorialLesson } from '../types';

export const module04Lessons: TutorialLesson[] = [
  {
    id: 'sta-m04-l1',
    title: 'Metastability and the Two-Flop Synchronizer',
    summary:
      'Why a signal sampled near the clock edge can land in an undefined voltage state, what metastability means for timing analysis, and the standard two-flop synchronizer that makes clock-domain crossings survivable — including what STA can and cannot say about it.',
    objectives: [
      'Explain metastability physically: sampling inside the aperture produces an undefined, slowly-resolving output.',
      'State the MTBF relationship qualitatively: resolution time buys exponential reliability improvement.',
      'Write the two-flop synchronizer and explain why each flop is there.',
      'Explain precisely why STA does not (and cannot) check the synchronizer\'s first flop — and what replaces that check.',
    ],
    whyItMatters:
      'Every multi-clock design — which is every real design — contains moments where an asynchronous signal meets a clock edge with no timing relationship. Metastability is not an exotic failure; it is the *default physics* of those meetings, and the two-flop synchronizer is the universal countermeasure. Understanding this deeply connects everything in the course: setup/hold windows define the aperture, slack arithmetic explains the fix\'s exponential payoff, and exception discipline (Module 02) explains how STA treats the crossing. Interviews treat CDC as a seniority marker — this lesson is the marker.',
    prerequisites: [
      'Setup and hold checks (Module 1)',
      'Timing exceptions (Module 2, lesson 3)',
      'Synchronous design and reset patterns (RTL course)',
    ],
    explanation:
      'A flip-flop samples its D input during a small window around the clock edge. If the input changes inside that window — violating setup or hold — the flop\'s internal cross-coupled transistors can rest at an intermediate voltage: neither a clean 0 nor a clean 1. This is **metastability**. The output may sit halfway, oscillate briefly, or take an unbounded time to resolve to a random final value. Nothing about the final value is predictable; only the *probability* of resolution is.\n\nThe key quantitative fact, stated qualitatively: the probability that a metastable state survives a given resolution time `t` decays **exponentially** with `t`. Reliability is usually expressed as mean time between failures:\n\n```\nMTBF ~ exp(t_resolve / tau) / (T_w * f_clk * f_data)\n```\n\nwhere `tau` is a device constant (how quickly the flop resolves), `T_w` the metastability aperture, and `f_clk`, `f_data` the sampling and data-toggle rates. You do not need to compute MTBF by hand; you need the shape: **each additional period of resolution time multiplies MTBF by an enormous factor** (exponentially, since `T/tau` is typically tens to hundreds). One extra clock cycle of resolution — one extra flop — takes a synchronizer from "fails hourly" to "fails once in the age of the universe". That exponential leverage is why the fix is always *more resolution time*, never "tighter timing".\n\nThe standard countermeasure is the **two-flop synchronizer**: the asynchronous signal feeds the D of a first flop clocked by the destination domain; that flop\'s Q feeds a second identical flop; only the second flop\'s output enters the design. The first flop absorbs the metastable event (it may go metastable — that is its job); by the next clock edge, the physics has almost certainly resolved it. The second flop samples a now-stable value and presents a clean, domain-synchronous signal. Both flops should be kept physically close (same slice/region) to minimize the delay — and its skew — between them, preserving the full period as resolution time.\n\nWhat does STA say about all this? **Nothing, by design.** The input to the first sync flop has no timing relationship to the destination clock — there is no meaningful setup/hold check to run — which is why Module 02 taught the targeted `set_false_path -to [get_pins sync_ff0/D]`: the crossing is declared timing-exempt *because it is structurally handled*. The correctness argument moves from timing analysis to **structure**: a CDC review (or a CDC lint tool) verifies that every cross-domain signal passes through a synchronizer, that only single-bit signals (or gray-coded/handshaken groups — next lesson) are synchronized, and that the synchronizer flops are placed well. Timing analysis protects the domain; structure protects the crossing.',
    deepDive:
      '### Why "synchronize harder" is meaningless — and "tighter constraints" is worse\n\nMetastability is not a timing violation you can constrain away: the input signal is asynchronous, so no clock period makes its edges predictable relative to the destination clock. Adding setup margin to the first sync flop changes nothing — the aperture still gets hit eventually at a rate set by f_clk x f_data. The only levers are resolution time (more sync stages: 2 for most rates, 3 for extreme rates or harsh environments) and using flops with small tau (libraries publish metastability-hardened cells for exactly this role). This is also why synchronizer flops are exempt from timing checks but *not* exempt from placement care: the route between sync flop 1 and 2 consumes resolution time if it is long or skewed.\n\n### One bit at a time — the constraint that shapes the next lesson\n\nA synchronizer makes a crossing *survivable*, not *coherent*. If a 4-bit bus crosses through four independent synchronizers, each bit resolves independently — and on the cycle where the source value changes from 0111 to 1000, the destination may sample 1111, 0000, or anything between, because bits settle in different cycles. Multi-bit crossings need structure that guarantees coherence: gray coding (only one bit changes per value change), or a handshake (hold the bus stable until acknowledged), or an async FIFO (dedicated pointer protocol). That is the entire subject of the next lesson — and the single most common CDC bug class in industry: synchronizing a bus bit-by-bit and wondering why the value is occasionally wrong.\n\n### What the false path does NOT exempt\n\nBe precise about scope: the exception covers the asynchronous input to the first sync flop. The sync-1 to sync-2 path, and everything downstream of sync-2, is an ordinary synchronous path with ordinary setup/hold checks. A synchronizer whose second stage fails timing is a broken synchronizer. The Module 02 rule (narrow exceptions) exists so that exactly this boundary — exempt at the entry, fully checked after — stays honest.',
    examples: [
      {
        title: 'The two-flop synchronizer in RTL',
        language: 'verilog',
        // Verilog-2001, async active-low reset, nonblocking in clocked block
        code:
          '// Synchronize a single asynchronous signal into clk_b domain.\n// (Verilog-2001; async-assert/sync-release reset per RTL course style)\nmodule sync2 (\n    input  wire clk,\n    input  wire rst_n,\n    input  wire async_in,   // from another clock domain (or a pin)\n    output wire sync_out\n);\n    reg ff0, ff1;\n\n    always @(posedge clk or negedge rst_n) begin\n        if (!rst_n) begin\n            ff0 <= 1\'b0;\n            ff1 <= 1\'b0;\n        end else begin\n            ff0 <= async_in;   // may go metastable: this is its job\n            ff1 <= ff0;        // samples the (resolved) value one cycle later\n        end\n    end\n\n    assign sync_out = ff1;\nendmodule\n\n// Timing constraint (Module 02 discipline):\n//   set_false_path -to [get_pins ff0_reg/D]   <- the async crossing\n//   ff0->ff1 and ff1->logic: ORDINARY setup/hold checks, always run.',
        explanation: [
          'ff0 takes the metastability hit; the constraint file acknowledges this by cutting exactly its D-pin check and nothing else.',
          'ff1 gets a full clock period of resolution time before it samples — the exponential MTBF lever in action.',
          'Both flops reset asynchronously to a known value, so the domain starts coherent.',
          'The comment restates the exception scope: entry exempt, everything after fully checked — the sentence a reviewer looks for.',
          'Usage rule (next lesson): this pattern is for SINGLE-BIT signals only; buses need gray/handshake/FIFO structure.',
        ],
      },
      {
        title: 'The exponential payoff, visualized qualitatively',
        language: 'text',
        code:
          'MTBF ~ exp(t_resolve / tau) / (T_w * f_clk * f_data)\n\nRelative resolution time (in units of tau):   MTBF shape\n  ----------------------------------------   ----------\n  ~1 tau            : resolution barely starts  hopeless\n  ~10 tau           : occasional survival        fails hourly\n  ~100 tau (1 flop) : e^100 scale factor         fails ~never\n  ~200 tau (2 flops): e^200 scale factor         universe-age MTBF\n\n  Each added clock period of resolution multiplies MTBF by\n  exp(T/tau) — with T/tau in the hundreds, ONE more flop is\n  the difference between a statistic and an irrelevance.\n  (Illustrative orders of magnitude; real numbers come from\n  the foundry library\'s metastability characterization.)',
        explanation: [
          'The exponent is resolution time divided by the device constant tau — the only ratio that matters.',
          'Because T/tau is typically large, additional flops do not improve MTBF additively but exponentially: one more stage multiplies reliability by e^(T/tau).',
          'The honest caveat stands: real MTBF numbers come from library characterization; the lesson teaches the shape, not fabricated values.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The crossing, annotated with what checks what',
        content:
          '   CLK A DOMAIN                NO MAN\'S LAND           CLK B DOMAIN\n\n   signal_a ---+\n               |  (no timing relationship: false_path)\n               +--------------------------> [ff0] --T--> [ff1] --> consumers\n                                           ^  metastable     ^\n                                           |  by design      |\n                                    STRUCTURE checks     ORDINARY\n                                    (CDC review/lint)    setup/hold\n\n   ff0 may go metastable on an aperture hit; ff1 samples one\n   full period later — the resolution window. Everything from\n   ff1 onward is ordinary synchronous logic, fully timed.',
        caption: 'Division of labor: structure protects the crossing (entry), timing analysis protects everything after it. Neither substitutes for the other.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Synchronizing a multi-bit bus with independent per-bit synchronizers.',
        fix: 'Bits resolve in different cycles, so the destination can sample a mix of old and new values. Use the next lesson\'s structures: gray-coded counters, a held-stable bus with handshake, or an async FIFO — never N parallel bit synchronizers for a coherent value.',
      },
      {
        mistake: 'Believing a false path "fixes" a crossing.',
        fix: 'The false path only tells the truth: there is no check to run. The fix is structural — the synchronizer. An unsynchronized crossing with a false path on it is maximally broken: physically vulnerable AND invisible to analysis.',
      },
      {
        mistake: 'Placing synchronizer flops far apart or letting logic creep between them.',
        fix: 'The ff0-to-ff1 route consumes resolution time and adds skew. Keep the pair physically adjacent (FPGA: same slice region; ASIC: constrained placement) and never insert combinational logic between them — that stage is a gift to the physics, not spare logic.',
      },
    ],
    guidedPractice: {
      title: 'Write and constrain a synchronizer',
      brief:
        'Write a two-flop synchronizer for `btn_in` (a mechanical button input, effectively asynchronous) into a 25 MHz domain, with async-assert/sync-release reset. Then write the exact timing exception and the sentence you would put in its comment. Finally, state what ordinary checks still apply inside the module.',
      starterCode:
        '// module sync_btn (...): two flops, nonblocking, async reset\n//\n// exception:\n// set_false_path -to [get_pins ____]\n// comment: "reason: ____; owner: ____"\n//\n// still checked normally: ____ -> ____ path, and everything downstream.',
      expectedBehavior:
        'A sync2-style module with ff0/ff1 on the 25 MHz clock; exception targeting only ff0\'s D pin, with a reason comment naming the asynchronous source; the ff0->ff1 path and all downstream paths remain under ordinary setup/hold analysis.',
      hints: [
        'The button is asynchronous to the clock in exactly the way a cross-domain signal is — same physics, same fix.',
        'The exception names ONE pin. If yours names a clock or a module, re-read Module 02 lesson 3.',
      ],
    },
    practiceExercises: [
      {
        title: 'Three stages?',
        brief:
          'A safety-critical design runs at 200 MHz in an automotive temperature range. Argue for (or against) a third synchronizer flop, using the MTBF shape and the cost paid.',
        expectedBehavior:
          'For: high f_clk and harsh environment raise the event rate and tau, so the exponential lever of one more stage is cheap insurance; the cost is one cycle of additional latency and one flop. Against (weakly): at moderate rates two stages already have universe-scale MTBF. The strong answer names the levers (f_clk, tau, required MTBF target) rather than asserting a universal rule.',
        hints: [
          'What enters the MTBF denominator, and what does the exponent multiply by?',
          'Latency cost is linear; reliability payoff is exponential — the asymmetry IS the argument.',
        ],
      },
      {
        title: 'Spot the broken crossing',
        brief:
          'Review finds: `assign busy_sync = busy_a;` used directly in the clk_b domain, and a constraint `set_false_path -from [get_clocks clk_a] -to [get_clocks clk_b]`. Diagnose both findings and prescribe the two fixes.',
        expectedBehavior:
          'Finding 1: an unsynchronized single-bit crossing — add the two-flop synchronizer. Finding 2: the blanket exception hides this and every other crossing from analysis (the Module 02 bug). Fixes: insert sync2 for busy_a, and replace the blanket cut with a targeted `-to [get_pins .../ff0/D]` per synchronizer.',
        hints: [
          'Which of the two findings is the bug, and which is the bug-hider?',
          'After the fixes, what does the clk_a-to-clk_b timing picture look like? (Answer: checked everywhere except declared synchronizer entries.)',
        ],
      },
    ],
    assessment: {
      title: 'Metastability checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'What physically happens when a flip-flop samples an input that changes inside its setup/hold window?',
          options: [
            'It reliably captures the new value',
            'It reliably captures the old value',
            'Its output may become metastable: an undefined state that resolves to an unpredictable value after an unbounded time',
            'The clock stops',
          ],
          answer: 'Its output may become metastable: an undefined state that resolves to an unpredictable value after an unbounded time',
          explanation:
            'The internal feedback can balance at an intermediate voltage. The final value is effectively random, and the resolution time is unbounded — which is why the fix buys resolution *probability*, not certainty.',
          hint: 'The question is what the transistors do, not what the spec wanted.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'Per the MTBF relationship, adding one more synchronizer stage changes reliability how?',
          options: [
            'Additively — MTBF increases by a fixed amount',
            'Exponentially — MTBF multiplies by roughly exp(T/tau)',
            'Not at all',
            'It depends on the clock period only',
          ],
          answer: 'Exponentially — MTBF multiplies by roughly exp(T/tau)',
          explanation:
            'Resolution time sits in the exponent, and T/tau is typically large, so an extra clock period of resolution multiplies MTBF by an astronomically large factor — the entire reason the two-flop pattern works.',
          hint: 'Where does t_resolve sit in the formula?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'A false-path constraint on a crossing makes the crossing safe.',
          answer: 'false',
          explanation:
            'The false path merely states the truth that no timing check applies. Safety comes from the synchronizer structure; the exception without the structure leaves the crossing physically vulnerable and analytically invisible — the worst of both.',
          hint: 'Constraints inform the tool; they do not rewire silicon.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'What single-word coding scheme changes only one bit per value increment, making multi-bit CDC pointers safe to sample (two words acceptable)?',
          answer: 'gray code',
          explanation:
            'Gray coding guarantees single-bit transitions between adjacent values, so a synchronizer can only ever capture the old or the new pointer — never a mixture. The full treatment is the next lesson.',
          hint: 'Named after its inventor; adjacent codes differ in one bit.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Metastability', definition: 'The undefined intermediate state a flop enters when its input changes inside the aperture; resolves unpredictably.' },
      { term: 'MTBF', definition: 'Mean time between failures of a crossing; grows exponentially with resolution time.' },
      { term: 'Two-flop synchronizer', definition: 'Standard CDC structure: first flop absorbs metastability, second samples the resolved value one period later.' },
      { term: 'Resolution time', definition: 'The time granted for a metastable state to decay — one full clock period between the synchronizer flops.' },
      { term: 'CDC review', definition: 'Structural verification that every crossing passes through an appropriate synchronizer; replaces timing analysis at crossings.' },
    ],
    revisionSummary: [
      'Sampling inside the aperture can produce metastability: undefined output, unpredictable value, unbounded resolution time.',
      'MTBF grows exponentially with resolution time — one more flop multiplies reliability by e^(T/tau).',
      'The two-flop synchronizer: flop 1 takes the hit, flop 2 samples a resolved value; keep them adjacent, no logic between.',
      'STA cannot check the crossing; the targeted false path states that honestly, and CDC structure review takes over.',
      'Synchronizers are for single bits — buses need gray coding, handshakes, or FIFOs (next lesson).',
    ],
    furtherReading: [
      { label: 'Wikipedia — Metastability (electronics)', url: 'https://en.wikipedia.org/wiki/Metastability_(electronics)', kind: 'article' },
      { label: 'Wikipedia — Clock domain crossing', url: 'https://en.wikipedia.org/wiki/Clock_domain_crossing', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'sta-m04-l2',
    title: 'Crossing Buses Safely: Gray Code, Handshakes and Async FIFOs',
    summary:
      'The three standard structures that move coherent multi-bit values between clock domains — gray-coded pointers, request/acknowledge handshakes, and asynchronous FIFOs — and exactly what each guarantees, costs, and requires from the constraint file.',
    objectives: [
      'Explain why per-bit synchronization corrupts multi-bit values, with a concrete bit-transition example.',
      'Describe the gray-code guarantee and where it applies (and where it does not).',
      'Write a two-phase request/acknowledge handshake and state its latency cost.',
      'Explain the async FIFO\'s dual-pointer gray-code architecture and why full/empty are computed in their own domains.',
    ],
    whyItMatters:
      'Single-bit CDC is a solved problem; multi-bit CDC is where designs die. The failure is insidious: a bus crossing through independent synchronizers works for months, then samples a half-old-half-new value on exactly the transition where multiple bits change, corrupting an address or a length field in a way no testbench reliably reproduces. These three structures are the entire professional toolkit for coherent crossings, and knowing when each applies — a pointer, a one-shot transfer, a streaming buffer — is the difference between a CDC review that passes and one that files findings.',
    prerequisites: [
      'Metastability and the two-flop synchronizer (previous lesson)',
      'Timing exceptions (Module 2, lesson 3)',
      'FIFO architecture (Digital Verification course, Module 4)',
    ],
    explanation:
      'Why per-bit synchronization fails, concretely. A 4-bit counter crosses from domain A (through four independent two-flop synchronizers) into domain B. The counter increments from `0111` to `1000`: **all four bits change simultaneously**. Each bit\'s synchronizer independently resolves "old" or "new" — and since resolution is per-bit, domain B can legitimately sample `1111`, `0000`, `0111`, `1000`, or any mixture, for one cycle. If that value is an address, the design reads the wrong register; if it is a FIFO pointer, the design computes nonsense occupancy. The failure rate is low (it needs the aperture hit AND a multi-bit transition), which is precisely why it survives bench testing and ships.\n\n**Gray coding** fixes the "many bits change at once" problem for values that change by steps: a gray-coded counter\'s adjacent values differ in **exactly one bit**. `0111 -> 1011`? No — in gray code, 7 is `0100` and 8 is `1100`: one bit differs. If only one bit can change per transition, a synchronizer can only ever capture the old value or the new value — a mixture is impossible, because every other bit is stable. This is the gray-code guarantee, and its scope is equally specific: it works for **monotonically stepping values** (counters, FIFO pointers). It does nothing for a data bus whose bits all change independently — gray coding a random data word changes nothing.\n\n**The handshake** fixes the "arbitrary data" problem by controlling *when* the bus is stable. Domain A places data on the bus and asserts `req` (synchronized into B); B samples the bus — which has been stable for several cycles — and asserts `ack` (synchronized back into A); A may then change the bus. The synchronizers protect only the single-bit control signals; the data bus is safe because the protocol guarantees it is static during sampling. Cost: latency — a round trip through synchronizers in both directions (several cycles each way in a two-phase protocol, or four in a four-phase one), which is why handshakes suit configuration and one-shot transfers, not streaming data.\n\n**The asynchronous FIFO** is the streaming answer, and it is the crown jewel because it combines the structures: a dual-port memory (both domains access it with their own clocks — RAM cells do not care which edge arrives), and **two pointers in gray code** — write pointer in the A domain, read pointer in the B domain, each synchronized into the *other* domain through a gray-code synchronizer for comparison. Full is computed in the write domain (write pointer versus synchronized read pointer); empty in the read domain (read pointer versus synchronized write pointer). The gray guarantee makes each synchronized pointer safe to compare; the pointer protocol makes the memory access safe without any clock relationship. Constraint-wise, exactly two false paths exist in a correct async FIFO: the two pointer crossings, each targeted at its synchronizer flop — nothing else.',
    deepDive:
      '### Why full/empty live in different domains\n\nA subtlety worth internalizing: the write domain must decide "full" (is there room?) and needs the read pointer to do it — so the read pointer crosses into the write domain. Symmetrically, the read domain needs the write pointer for "empty". Each decision uses a slightly-stale version of the other pointer, and the protocol is designed so staleness is always conservative: the write side may think the FIFO is fuller than it is (missing a recent read), never emptier; so full can assert "late" (safe) but never falsely deassert. When you can explain why stale-pointers-are-conservative is the actual safety argument of every async FIFO, you understand the structure — and you can review one.\n\n### Choosing the structure (the decision list)\n\n- **Single-bit status/flag** -> two-flop synchronizer. \n- **Stepping counter/pointer** -> gray code + synchronizer. \n- **Occasional multi-word transfer, latency tolerable** -> handshake (bus held stable). \n- **Continuous streaming between domains** -> async FIFO. \n- **Same clock, different clock buffers?** -> not a CDC at all — one domain, fix the clocking.\n\nThe last line is its own lesson: a surprising fraction of "CDC problems" are actually one-domain designs with accidental derived clocks (Module 02 lesson 1) — the fix is the clock-enable pattern, not any crossing structure.\n\n### What a CDC lint tool checks (and why reviews still happen)\n\nCDC tools (industry and open-source) verify structure: every crossing has a synchronizer; synchronized groups are gray-stable or handshake-protected; no combinational logic between crossing source and synchronizer input (glitches — combinational hazards — can false-clock a synchronizer, which is why the crossing must be a flop output, not derived logic). Reviews still happen because tools verify patterns, not intent: a synchronizer on a signal that functionally must be coherent with its brother (a two-bit state, say) passes lint and fails hardware. The final reviewer question is always semantic: *is this signal independently meaningful, or part of a group that must move atomically?*',
    examples: [
      {
        title: 'Gray versus binary, the transition that kills buses',
        language: 'text',
        code:
          'Counter 7 -> 8:\n\n  BINARY:  0111 -> 1000     4 bits change at once\n           per-bit synchronizers may sample any mixture:\n           1111, 0111, 1000, 0000 ... for one cycle  (CORRUPTION)\n\n  GRAY:    0100 -> 1100     exactly 1 bit changes\n           synchronizer samples old (0100) or new (1100):\n           both are valid recent values                  (SAFE)\n\n  Gray code construction (reflected): start 0,0; to build\n  the next value flip the bit that gives the smallest new\n  value not yet used. Adjacent codes ALWAYS differ in one bit:\n\n  dec  binary  gray\n   0    000     000\n   1    001     001\n   2    010     011\n   3    011     010\n   4    100     110\n   5    101     111\n   6    110     101\n   7    111     100\n   8   1000    1100   <- still one bit from 7\'s gray code',
        explanation: [
          'The binary 7-to-8 transition flips every bit — the exact case where independent per-bit resolution produces garbage.',
          'The gray 7-to-8 transition flips one bit; a mixture of old and new is impossible because all other bits are stable.',
          'The table shows the reflected construction for 0-7; verify by inspection: every adjacent pair differs in exactly one position.',
          'The scope reminder stands: this protects stepping values. A data bus with independent bits gains nothing from gray coding.',
        ],
      },
      {
        title: 'The handshake, in RTL skeleton',
        language: 'verilog',
        code:
          '// Two-phase (toggle) handshake: A offers data, B acknowledges.\n// Only req/ack cross domains (through sync2 modules); the DATA\n// bus is stable-while-req, so no data synchronization needed.\n\n// ---- Domain A (producer) ----\nreg  req_a;                     // toggles to offer a new word\nreg [15:0] data_bus;            // held stable until ack\nwire ack_sync;                  // ack crossed into A (sync2)\n\nalways @(posedge clk_a or negedge rst_n)\n    if (!rst_n) begin\n        req_a <= 1\'b0;\n    end else if (offer_new && ack_sync == req_a) begin\n        data_bus <= new_word;   // safe: B confirmed last transfer\n        req_a    <= ~req_a;     // toggle = new offer\n    end\n\n// ---- Domain B (consumer) ----\nwire req_sync;                  // req crossed into B (sync2)\nreg  ack_b;\nreg [15:0] captured;\n\nalways @(posedge clk_b or negedge rst_n)\n    if (!rst_n) begin\n        ack_b <= 1\'b0;\n    end else if (req_sync != ack_b) begin\n        captured <= data_bus;   // bus stable for many cycles: safe\n        ack_b    <= ~ack_b;     // toggle = acknowledge\n    end\n\n// LATENCY: one A-to-B sync (2-3 clk_b) + one B-to-A sync\n// (2-3 clk_a) per word. Fine for config; hopeless for streaming.',
        explanation: [
          'The two-phase protocol uses toggle levels instead of pulses: `req_sync != ack_b` means an unanswered offer.',
          'Data crosses with NO synchronizer — its safety is protocol-guaranteed stability, which is the entire trick.',
          'The condition `ack_sync == req_a` on the producer side ensures the previous word was consumed before the bus changes.',
          'The latency comment sets expectations: two synchronizer crossings per transfer; the async FIFO exists because this cost is unacceptable for streams.',
          'Glitch rule honored: req_a/ack_b are flop outputs, never combinational logic — a glitching combinational signal can false-trigger a synchronizer.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Async FIFO: pointers, synchronizers, and where each decision lives',
        content:
          '     WRITE DOMAIN (clk_a)                  READ DOMAIN (clk_b)\n\n  wptr_gray -->[sync2]-------------------> compare (with rptr_gray)\n     ^                                        |\n     |                                   "empty?" decided HERE\n  wptr_bin                                  (rptr vs wptr_sync)\n     |                                        |\n  [write side]                            [read side]\n     |                                        |\n  "full?" decided HERE                    rptr_bin\n  (wptr vs rptr_sync)                        |\n     ^                                        v\n     +------------------[sync2]<-------------rptr_gray\n\n  Dual-port memory: written with clk_a, read with clk_b.\n  Exactly two crossings (the pointers, in gray code);\n  exactly two targeted false paths in the constraints.',
        caption: 'Each pointer is synchronized INTO the opposite domain for comparison; full and empty are computed where the local pointer is exact and the remote one is stale-but-conservative.',
      },
    ],
    tables: [
      {
        caption: 'CDC structure selection',
        headers: ['What crosses', 'Structure', 'Guarantee', 'Cost'],
        rows: [
          ['One status bit', '2-FF synchronizer', 'survivable sampling', '2 cycles latency'],
          ['Stepping counter/pointer', 'Gray code + synchronizer', 'old-or-new, never mixed', 'gray conversion logic'],
          ['Occasional data word(s)', 'Req/ack handshake', 'bus stable while sampled', 'round-trip latency'],
          ['Continuous stream', 'Async FIFO', 'coherent ordered transfer', 'memory + 2 sync + control'],
          ['"Domains" on derived clocks', 'clock enable (not CDC!)', 'single domain restored', 'redesign of clocking'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Synchronizing a multi-bit bus per-bit because each bit "has a synchronizer".',
        fix: 'Each bit is safe; the VALUE is not. Choose by signal semantics: stepping value -> gray; held-stable transfer -> handshake; stream -> async FIFO. Independent-bit data is the only thing per-bit synchronization was ever legitimate for — and it is almost never what a bus is.',
      },
      {
        mistake: 'Feeding a synchronizer from combinational logic instead of a flop output.',
        fix: 'Combinational glitches can momentarily enter the aperture and false-clock the destination domain. CDC rule: the crossing signal must be a register output (the handshake example enforces exactly this).',
      },
      {
        mistake: 'Computing async-FIFO full in the read domain (or empty in the write domain).',
        fix: 'Full belongs to the writer (it has the exact write pointer), empty to the reader. Computing either with the wrong exact/stale pointer pairing breaks the conservative-staleness safety argument and can overflow or underflow the FIFO.',
      },
    ],
    guidedPractice: {
      title: 'Choose and justify the structure',
      brief:
        'For each crossing, choose the structure and justify in one sentence: (a) a `fifo_almost_full` flag from the read domain used in the write domain; (b) a 12-bit ADC sample produced at 1 MHz streaming into a DSP clocked independently; (c) a 32-bit configuration word written by a slow management CPU, read by the main domain; (d) a mod-16 sequence counter exported for diagnostics.',
      starterCode:
        '// (a) ____ : ____\n// (b) ____ : ____\n// (c) ____ : ____\n// (d) ____ : ____',
      expectedBehavior:
        '(a) two-flop synchronizer — single bit, independently meaningful. (b) async FIFO — continuous stream needing coherent multi-bit transfer. (c) req/ack handshake with stable bus — occasional transfer, latency acceptable. (d) gray code + synchronizer — a stepping counter\'s value must not tear.',
      hints: [
        'Ask two questions per crossing: how many bits, and do the bits change together (stepping) or independently (data)?',
        'Streaming versus occasional is the FIFO-versus-handshake decision line.',
      ],
    },
    practiceExercises: [
      {
        title: 'Prove the conservative-staleness claim',
        brief:
          'In an async FIFO, the write domain compares against a synchronized read pointer that may be several reads stale. Show why a stale read pointer can only make the FIFO look FULLER (safe) and never emptier, and why the symmetric claim holds for empty.',
        expectedBehavior:
          'The read pointer only ever moves away from the write pointer (freeing space), so a stale (older) read pointer describes a FIFO with LESS free space than reality: full may assert early, never late. Symmetrically, a stale write pointer describes less data than reality: empty may assert early, never late. Early full/empty costs throughput; late full/empty corrupts data — the asymmetry is the safety argument.',
        hints: [
          'In which direction does each pointer move, and what does "stale" mean relative to that motion?',
          'Early versus late: which one loses throughput, and which one loses data?',
        ],
      },
      {
        title: 'Design review a crossing',
        brief:
          'A team crosses a 3-bit FSM state from domain A to B with three 2-FF synchronizers, "because each bit is synchronized". Write the review finding and the two acceptable fixes.',
        expectedBehavior:
          'Finding: per-bit synchronization tears multi-bit values — on transitions where several state bits change (e.g. 011 -> 100), B can observe a nonexistent state, likely decoding it as an illegal state or taking a spurious transition. Fixes: (1) one-hot the state encoding so exactly one bit changes per transition (turning it into a legal gray-style crossing), or (2) handshake the state word across while stable — the choice depends on whether B can tolerate a one-cycle-old state.',
        hints: [
          'Which encodings change exactly one bit per transition?',
          'Does B need the state the instant it changes, or is one transfer-latency later acceptable?',
        ],
      },
    ],
    assessment: {
      title: 'Multi-bit CDC checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'A 4-bit binary counter crosses domains through four independent 2-FF synchronizers. On which transition is corruption MOST likely to be observed?',
          options: [
            '0000 -> 0001 (one bit changes)',
            '0111 -> 1000 (all four bits change)',
            '1010 -> 1011 (one bit changes)',
            'All transitions are equally safe',
          ],
          answer: '0111 -> 1000 (all four bits change)',
          explanation:
            'Tearing requires multiple bits to change in the same sampling window; 7-to-8 flips every bit, so any per-bit resolution mix is possible — including values that were never assumed.',
          hint: 'Tearing needs disagreement between bits — when do bits disagree most?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What does gray coding guarantee for a crossing value?',
          options: [
            'The value can never be sampled incorrectly',
            'Adjacent values differ in exactly one bit, so a synchronized sample is always the old or the new value — never a mixture',
            'It doubles the bus width',
            'It eliminates the need for synchronizers',
          ],
          answer: 'Adjacent values differ in exactly one bit, so a synchronized sample is always the old or the new value — never a mixture',
          explanation:
            'Gray coding removes the multi-bit-change hazard; the synchronizer still does the crossing work, and the sampled value may be one step stale — which pointer protocols are built to tolerate conservatively.',
          hint: 'The guarantee is about bit transitions, not about sampling correctness.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'In a req/ack handshake, the data bus crosses domains through its own bank of synchronizers.',
          answer: 'false',
          explanation:
            'Only the single-bit req and ack cross through synchronizers. The data bus is unsynchronized and safe because the protocol holds it stable while the receiver samples — that stability guarantee is the entire mechanism.',
          hint: 'Count the synchronizers in the RTL skeleton: two, not eighteen.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In an async FIFO, in which domain is the FULL flag computed (write or read)?',
          answer: 'write',
          explanation:
            'Full is the writer\'s question (is there room?), so it is computed in the write domain using the exact write pointer and the synchronized (stale, conservative) read pointer. Empty is computed symmetrically in the read domain.',
          hint: 'Who needs the answer to act on it?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Tearing', definition: 'The corruption of a multi-bit value sampled mid-transition through per-bit synchronizers.' },
      { term: 'Gray code', definition: 'An ordering where adjacent values differ in exactly one bit; makes stepping values safe to synchronize.' },
      { term: 'Handshake', definition: 'A req/ack protocol that holds a data bus stable during sampling; single-bit controls cross, data does not.' },
      { term: 'Async FIFO', definition: 'Dual-port memory plus gray-coded pointers synchronized across domains; coherent streaming between clocks.' },
      { term: 'Conservative staleness', definition: 'The property that a stale opposite-domain pointer can only over-report fullness/emptiness — losing throughput, never data.' },
    ],
    revisionSummary: [
      'Per-bit synchronization is safe per bit and corrupt for values: tearing happens when multiple bits change together.',
      'Gray code: adjacent values differ in one bit; use for counters and pointers, never for independent data.',
      'Handshake: single-bit controls synchronize, the bus is stable by protocol; costs a round trip per transfer.',
      'Async FIFO: dual-port RAM + gray pointers; full computed in write domain, empty in read; staleness is conservative by construction.',
      'Crossing signals must be flop outputs (no combinational glitches into synchronizers) — the rule CDC linters enforce first.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Gray code', url: 'https://en.wikipedia.org/wiki/Gray_code', kind: 'article' },
      { label: 'Wikipedia — Clock domain crossing', url: 'https://en.wikipedia.org/wiki/Clock_domain_crossing', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'sta-m04-l3',
    title: 'The Constraint-Mistake Hall of Shame (and the FPGA Bridge)',
    summary:
      'The course finale: every constraint mistake that ships broken silicon, consolidated into one reviewable catalogue — missing generated clocks, blanket exceptions, fiction periods, unconstrained I/O — plus the mapping onto FPGA timing reports so the whole course lands in the tool you will actually open first.',
    objectives: [
      'Recognize each major constraint-mistake class from its symptom in reports or in the field.',
      'Trace each mistake to the specific module-lesson that prevents it.',
      'Read an FPGA vendor timing report using the exact vocabulary of this course.',
      'Assemble the personal review checklist you will run on every constraint file you touch.',
    ],
    whyItMatters:
      'Constraint mistakes do not fail loudly — they fail *convincingly*: green reports, passing regressions, and hardware that misbehaves at a customer site. Because the tool faithfully analyzes the world you described, your description is the product. This closing lesson consolidates the entire course into the pattern library of what goes wrong, so that reading a constraint file triggers recognition the way an experienced nurse reads a chart — symptom first, cause second, fix already known.',
    prerequisites: [
      'All previous modules of this course',
    ],
    explanation:
      'The catalogue, each entry in the format you will meet it: **symptom** (what you observe), **cause** (what the constraint file contains), **fix** (the specific discipline from earlier lessons).\n\n**1. The unconstrained divided clock.** Symptom: a clock domain\'s paths appear in no report; "too clean" results. Cause: a `clk_div` signal from a toggle flop with no `create_generated_clock`. Fix (Module 2 L1): declare it with `-source` and `-divide_by` — or better, eliminate the divided clock with a clock enable.\n\n**2. The blanket false path.** Symptom: cross-domain paths all pass; later, intermittent corruption on a bus that was never synchronized. Cause: `set_false_path -from clk_a -to clk_b`. Fix (Module 2 L3, Module 4): target synchronizer input pins only; unsynchronized paths must FAIL review, not pass analysis.\n\n**3. The fiction period.** Symptom: positive slack everywhere; board fails at the real frequency. Cause: `create_clock -period` does not match the spec (the 12.5-for-10 lesson of Module 3 L3). Fix: period changes only in the same commit as the spec change; CI or review compares them.\n\n**4. The missing I/O delays.** Symptom: in2reg and reg2out path counts are zero; an interface dies on the bench. Cause: no `set_input_delay`/`set_output_delay`. Fix (Module 2 L2): every non-clock port gets -max and -min, transcribed from the peer datasheet.\n\n**5. The zeroed uncertainty.** Symptom: margins evaporate between sign-off and silicon. Cause: `set_clock_uncertainty 0` to force a pass. Fix (Module 1 L3): uncertainty is physics (jitter, variation); the number is honest or the margin is fictional.\n\n**6. The naked multicycle.** Symptom: a path meets its relaxed check and fails functionally the one cycle the strobe misfires. Cause: multicycle granted on a software habit instead of an RTL mechanism, or without the N-1 -hold companion. Fix (Module 2 L3): structural guarantee + hold companion + owner/reason comments.\n\n**7. The misaligned corner set.** Symptom: passes typical; fails at temperature extremes or on a different FPGA speed grade. Cause: sign-off run at one corner. Fix (Module 1 L3, Module 3 L3): setup at all slow corners, hold at all fast corners — the checklist, not a preference.\n\nThe **FPGA bridge** closes the course because most engineers open a vendor tool first. The mapping is almost total: the five-section report anatomy is identical; "speed grade -2/-3" plays the corner role (slow grade = the setup-sign-off corner); routing delay dominates arrival where ASIC reports show logic-dominated paths — so the *dominant-line* analysis of Module 3 L2 usually points at placement first; clock resources (PLLs, global buffers) map to generated-clock declarations; unconstrained pins produce the same zero-path silence. Everything transfers. The one habit to carry across: **recompute the slack from the report\'s own lines, every time** — it is the thirty-second ritual that catches every category in this catalogue eventually.',
    deepDive:
      '### Why catalogues beat rules\n\nRules ("always constrain I/O") decay into ritual; catalogues bind symptom to story, and stories are what reviewers actually run in their heads. When you read a constraint file, you are not checking compliance line by line — you are pattern-matching each line against this hall of shame: does this period match the spec table? does this exception name a pin or a clock? is there a generated clock for that divider? The moment a line matches a catalogue entry, you have the question to ask and the lesson that answers it. This is also how you *interview*: "tell me about a constraint bug you caught" is an invitation to recite a catalogue entry with your own war story attached.\n\n### The personal checklist (make it yours)\n\n1. Every clock declared, period matches spec (per-clock audit). \n2. Every generated/divided clock declared with parent and ratio. \n3. Every non-clock port: input or output delay, -max and -min, with datasheet citations. \n4. Every exception: reason, owner, narrowest scope; synchronizer entries only for CDC. \n5. Uncertainty nonzero and justified. \n6. Sign-off corners: setup at all slow, hold at all fast. \n7. Recompute one report\'s slack by hand — the audit that catches them all. \n\nItem 7 is the kicker: the other six audit the *file*; item 7 audits the *analysis*. Together they are the difference between the sentence "the tool said it met timing" and the sentence "we have evidence it meets timing" — which is where this course began, and the only sentence a sign-off may contain.',
    examples: [
      {
        title: 'The hall of shame as a review script',
        language: 'text',
        code:
          'CONSTRAINT REVIEW — run top to bottom, ask the matched question\n\n[clocks]     period == spec table? (entry 3)\n             divider/PLL outputs declared? (entry 1)\n[i/o]        every non-clock port has -max/-min delays? (entry 4)\n[exceptions] every false_path names a PIN not a clock pair? (entry 2)\n             every multicycle has mechanism + N-1 hold + owner? (entry 6)\n[margins]    uncertainty nonzero and cited? (entry 5)\n[corners]    setup@slow, hold@fast, ALL of them? (entry 7)\n[analysis]   one report hand-recomputed? (the ritual)\n\nAny NO -> the catalogue entry IS the finding, with its lesson\nnumber as the reference. Write it down; do not "note it for later".',
        explanation: [
          'Each bracket maps to a catalogue entry, so the reviewer never asks an unanchored question.',
          'The last line is process honesty: findings written during review are findings; findings remembered are rumors.',
          'This script is the take-home artifact of the course — adapt it, keep it in the repo, run it in every timing review.',
        ],
      },
      {
        title: 'An FPGA report, decoded with course vocabulary',
        language: 'text',
        code:
          'From worst path setup report (synthetic example report for teaching):\n\n  Slack (VIOLATED) : -0.185ns (required 6.815ns, arrival 7.000ns)\n  Source:      calc_reg/CK  (sys_clk rise)\n  Destination: out_reg/D    (sys_clk rise)\n  Clock path:  1.200ns (PLL + global buffer)  <- your "clock network"\n  Data path:   5.800ns of which net delay 3.900ns (67%)\n  Clock period: 8.000ns; speed grade -2, slow model\n\nDECODED: setup check, T=8ns, arrival 7.000 vs required 6.815.\nDominant line = net delay (routing) -> placement-first fix\n(Module 3 L2 signature). -0.185 is placement territory, not\narchitecture. Clock path 1.2ns is the FPGA analogue of the\nclock-network line — and its skew story, same as ever.',
        explanation: [
          'Every term in the vendor report has a course name: the decode is mechanical once the vocabulary is owned.',
          'The 67% net delay is the FPGA-typical profile — routing dominance — which routes fixes to placement before logic surgery.',
          'The slack magnitude (-0.185) selects the response size: tool effort and minor restructuring, not pipelining.',
        ],
      },
    ],
    tables: [
      {
        caption: 'The hall of shame, one line each',
        headers: ['#', 'Mistake', 'First symptom', 'Lesson'],
        rows: [
          ['1', 'Unconstrained divided clock', 'domain missing from reports', 'M2 L1'],
          ['2', 'Blanket false path', 'all cross-domain paths pass', 'M2 L3, M4'],
          ['3', 'Fiction clock period', 'green reports, failing board', 'M3 L3'],
          ['4', 'Missing I/O delays', 'zero in2reg/reg2out paths', 'M2 L2'],
          ['5', 'Zeroed uncertainty', 'margins vanish on silicon', 'M1 L3'],
          ['6', 'Naked multicycle', 'meets timing, fails functionally', 'M2 L3'],
          ['7', 'Single-corner sign-off', 'fails at extremes/speed grades', 'M1 L3, M3 L3'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Treating the constraint file as tool plumbing rather than a reviewed deliverable.',
        fix: 'Every report is conditional on it: version it, review it in the same PR as RTL, and run the review script above on every change. The file is the product; the tool is its interpreter.',
      },
      {
        mistake: 'Learning the catalogue but skipping the hand-recompute ritual.',
        fix: 'Items 1-6 audit the file; recomputing one report\'s slack audits the analysis itself. It costs thirty seconds and catches mis-parsed reports, tool bugs, and your own misreadings — the failure class that no file review can reach.',
      },
      {
        mistake: 'Assuming FPGA flows make any of this unnecessary.',
        fix: 'Vendor tools default more aggressively (auto-derived clocks, auto I/O budgets in some flows), which hides the machinery until it misfires. The vocabulary, the five-section anatomy, and the catalogue all apply directly — with routing delay playing the lead role that logic delay plays in ASICs.',
      },
    ],
    guidedPractice: {
      title: 'Run the review script on a real file',
      brief:
        'Take any constraint file you can find (a tutorial example, an open-source FPGA project, or one you write yourself with three deliberate bugs from the catalogue) and run the seven-step script. Record each finding as: entry number, the line that triggered it, and the fix.',
      starterCode:
        '// Findings log:\n// [step] entry# — file line — question asked — fix prescribed\n// 1. ____\n// 2. ____\n// ...\n// 7. hand-recompute result: ____',
      expectedBehavior:
        'A findings log where every finding cites its catalogue entry and fix — the format a timing review can act on. If you planted bugs: all three found, plus possibly real ones you did not plant (that happens).',
      hints: [
        'Do not skip step 7 because steps 1-6 found things — the ritual is independent of the file audit.',
        'A finding without the triggering line quoted is an opinion; quote the line.',
      ],
    },
    practiceExercises: [
      {
        title: 'Write the war story',
        brief:
          'Pick the catalogue entry you find most likely to bite you personally, and write its failure story for your future team: the symptom as a bug report, the investigation in three steps, the root cause, and the process change that prevents recurrence.',
        expectedBehavior:
          'A half-page narrative that a teammate could learn from: symptom (what was observed), mechanism (the physics/arithmetic), root cause (the constraint line), prevention (the checklist item). This is also, verbatim, the strongest interview answer format in timing.',
        hints: [
          'Bug report symptoms are external (intermittent corruption, dead interface); causes are internal (the line in the file).',
          'The prevention step must reference a checklist item, not "be more careful".',
        ],
      },
      {
        title: 'FPGA sign-off, translated',
        brief:
          'You must sign off an FPGA design for a -3 speed grade part. List exactly what you run, what you read in each report, and the sentence you write in the release notes.',
        expectedBehavior:
          'Runs: STA at the -3 slow model for setup (worst), fast model for hold, all clock groups. Reads: worst slack per group, the five-section anatomy of the worst path, dominant lines, clock-network skew. Sentence: "Timing met: setup worst +X ns at slow/-3, hold worst +Y ns at fast/-3, against constraint set vN — I/O per datasheet rev R, exceptions reviewed <date>."',
        hints: [
          'The release-note sentence pattern: verdict + corners + constraint version + evidence pointers.',
          'Worst slack per clock group — plural groups, one number each, no averages.',
        ],
      },
    ],
    assessment: {
      title: 'Final checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'A design\'s reports show every cross-domain path meeting timing with generous slack, but the board intermittently corrupts a status bus. Which catalogue entry is the most likely cause?',
          options: [
            'Entry 5 — zeroed uncertainty',
            'Entry 2 — blanket false path hiding unsynchronized crossings',
            'Entry 7 — single-corner sign-off',
            'Entry 1 — unconstrained divided clock',
          ],
          answer: 'Entry 2 — blanket false path hiding unsynchronized crossings',
          explanation:
            'Generous cross-domain slack is itself the symptom: those paths were probably cut by a blanket exception, so nothing was checked — and an unsynchronized bus corrupts exactly intermittently. The fix is targeted exceptions plus real CDC structure.',
          hint: 'What does "generous slack on paths that have no timing relationship" actually mean?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'bug-identification',
          prompt: 'Which line of this constraint file matches a hall-of-shame entry, and which one?',
          code: 'create_clock -period 8.0 -name sys_clk [get_ports clk]\ncreate_generated_clock -name div2 -source [get_ports clk] \\\n    -divide_by 2 [get_pins div_ff/Q]\nset_false_path -from [get_clocks sys_clk] -to [get_clocks div2]\nset_output_delay -max 2.0 -clock sys_clk [get_ports dout]',
          options: [
            'Line 1 — fiction period',
            'Line 2 — unconstrained generated clock',
            'Line 3 — blanket false path (clock pair, not a synchronizer pin)',
            'Line 4 — missing -min output delay',
          ],
          answer: 'Line 3 — blanket false path (clock pair, not a synchronizer pin)',
          explanation:
            'Line 3 scopes a false path by clock pair — the entry-2 signature. (Line 4 is ALSO incomplete — a real finding — but the question asks for the hall-of-shame match, and clock-pair scoping is the canonical one.)',
          hint: 'Which line matches the exact scope wording of entry 2?',
          difficulty: 'hard',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'In FPGA timing reports, routing (net) delay typically dominates the arrival path, so dominant-line analysis usually points at placement before logic surgery.',
          answer: 'true',
          explanation:
            'Programmable interconnect is slower than ASIC metal, so net delay commonly reaches 50-70% of arrival. The Module 3 L2 fix ordering (placement first for net-dominated paths) applies with extra force on FPGAs.',
          hint: 'Where does an FPGA pay its flexibility penalty in the delay budget?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'What is the seven-letter word for the ritual that closes both this lesson and the course: recomputing a report\'s slack from its own delay lines by hand?',
          answer: 'recompute',
          explanation:
            'Recompute. Thirty seconds, catches mis-parsed reports, tool bugs, and personal misreadings — the audit of the analysis itself, and the habit that upgrades every green report from a claim toward evidence.',
          hint: 'The verb you do to the slack number with your own arithmetic.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Hall of shame', definition: 'The consolidated catalogue of constraint mistakes, each with symptom, cause, and fix.' },
      { term: 'Review script', definition: 'The ordered audit of a constraint file: clocks, I/O, exceptions, margins, corners, recompute.' },
      { term: 'Speed grade', definition: 'FPGA device speed binning; the slow grade plays the ASIC slow-corner role for setup sign-off.' },
      { term: 'Net delay dominance', definition: 'The FPGA-typical profile where routing exceeds logic delay, steering fixes toward placement.' },
      { term: 'Evidence sentence', definition: 'The sign-off claim format: verdict, corners, constraint version, and evidence pointers — never a bare "meets timing".' },
    ],
    revisionSummary: [
      'Seven mistake classes cover the field: unconstrained clocks, blanket exceptions, fiction periods, missing I/O, zeroed uncertainty, naked multicycles, single corners.',
      'Each catalogue entry binds symptom to story to fix — the pattern library a reviewer runs mentally.',
      'FPGA reports map fully onto course vocabulary: speed grades = corners, routing = the dominant arrival line.',
      'The review script audits the file; the recompute ritual audits the analysis; run both.',
      'The course\'s thesis: a green report plus a green checklist is evidence — and "the tool said so" is not.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static timing analysis', url: 'https://en.wikipedia.org/wiki/Static_timing_analysis', kind: 'article' },
      { label: 'Wikipedia — Field-programmable gate array', url: 'https://en.wikipedia.org/wiki/Field-programmable_gate_array', kind: 'article' },
      { label: 'Yosys open synthesis suite documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
    ],
    estimatedMinutes: 40,
  },
];
