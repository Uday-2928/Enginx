import type { TutorialLesson } from '../types';

/**
 * Module 09 — RTL Quality & Lint.
 * Lint categories that find real bugs, code that survives review (with a
 * 10-point checklist), and self-checking testbenches with a regression
 * mindset. Sample lint/TB outputs are hand-traced teaching artifacts.
 */
export const module09Lessons: TutorialLesson[] = [
  {
    id: 'rtl-m09-l1',
    title: 'Lint Categories That Find Real Bugs',
    summary:
      'Seven lint categories carry most of the real bug-finding weight: width mismatch, signedness mix, inferred latch, incomplete assignment, unused signals, multiple drivers and dead code. Learn each with its code shape and its consequence.',
    objectives: [
      'Recognize the code shape of each of the seven lint categories on sight.',
      'State the hardware consequence of each category when left unfixed.',
      'Read a lint report as a defect list with severities, and triage it in order.',
      'Distinguish warnings that are findings from warnings that need written waivers.',
    ],
    whyItMatters:
      'Lint is the cheapest verification you will ever run: seconds per run, no testbench, and it catches the bug classes that cause most field failures — truncations, latches, multi-driven buses. But lint only works when its report is trusted: teams that ignore warnings because "they are usually noise" lose the tool entirely, and the real bug arrives buried among a hundred ignored ones. This lesson teaches both halves: what each category means, and how to keep the report clean enough that every remaining warning deserves a read.',
    prerequisites: ['rtl-m03-l1', 'rtl-m03-l2', 'rtl-m04-l2'],
    explanation: [
      '**Width mismatch** flags any assignment where the result width differs from the destination: the classic `wire [7:0] t = a + b;` silently truncates 9 bits of arithmetic into 8. The consequence is a wrap bug that passes small-value testing and corrupts large values in the field. The fix discipline comes from module 04: declare intermediates at the exact grown width, narrow explicitly in one commented line. Lint makes the silent cases visible — every truncation must be either fixed (width added) or justified (a deliberate wrap with a comment the tool can see).',
      '**Signedness mix** flags expressions mixing signed and unsigned operands: `s + u` where s is signed evaluates entirely unsigned (module 04 lesson 2\'s contagion rule). The consequence is values like -2 + 1 = 255 — catastrophically wrong, and often passing tests that never drive negatives. The fix: uniform types per datapath, `$signed()` at genuine boundaries, and the knowledge that bit-selects are always unsigned. This category\'s reports are among the highest value-per-warning in the whole tool.',
      '**Inferred latch** and **incomplete assignment** are cousins: both mean some path through a combinational block leaves an output unassigned. The tool phrases it either as "latch inferred for y" or "y not assigned on all paths" — same defect, same fix (defaults at top, full coverage). The consequence is timing-hostile transparent latches and, worse, code that does not say what the author meant. This is the category module 03 lesson 2 trained you to prevent structurally; lint is the safety net for the days the discipline slips.',
      '**Unused signals** and **dead code** are the hygiene categories with real bug-finding power. An unused signal is often a *connection someone forgot to make* — the `ready_o` nobody wired into the handshake, the status bit computed but never read: the warning points at an unfinished thought. Dead code (unreachable branches, conditions constant at build time) similarly indicates intentions that no longer match the code. The rule: delete or connect — an unused signal never ships with a waiver, because "unused but harmless" is the assumption that hides the missing wire.',
      '**Multiple drivers** is the outright error: two processes or assigns driving the same net. In simulation the values fight; in synthesis the tool errors out or (worse, in some flows) builds short-circuit hardware. The classic source: two engineers adding logic to the same signal, or a signal assigned in both a cloud and a clocked process. The fix is structural — one owner per signal (the module-03 contract) — and the lint error is your earliest and loudest signal that ownership broke.',
      'Reading the **report**: lint output is a defect list with severities — errors (must fix: latches, multi-drivers, width truncations without justification), warnings (fix or waive in writing: style, unused with named reasons), and info. The professional pass: fix all errors, delete or connect everything unused, then judge what remains. A waiver (suppressing a warning for one line) requires a comment stating why — "waived: deliberate modulo counter, wrap per spec T6" — so the next reader knows the warning was seen and answered, not missed.',
    ].join('\n\n'),
    deepDive: [
      'Why does lint find bugs that simulation misses? Because lint reads *structure*, not behaviour: it sees that an assignment truncates regardless of what values the testbench drove, that a path leaves y unassigned regardless of whether the test ever drove sel=0. Simulation verifies the cases you thought of; lint verifies the shape of everything. This is also why lint belongs in the commit loop (run on every change, seconds of cost) rather than before release: a structural defect fixed the day it is typed costs nothing; found at release, it costs a testbench investigation.',
      'The clean-report discipline deserves defense, because it sounds like aesthetics. A report with 200 baseline warnings trains everyone to scan past them — and the day a real truncation warning appears, it is statistically invisible. Every waived or fixed warning is an investment in the signal-to-noise of the next report. Teams that enforce "no new warnings" as a review criterion converge on reports where a single new line is an event; that property, not the clean report itself, is what catches the real bug.',
      'The seven categories map onto the modules of this course deliberately: width and signedness are module 04\'s laws made mechanical; latch and incomplete assignment are module 03\'s templates; unused/dead connect to module 02\'s "every signal has a spec sentence". When you fix a lint finding, the fix should reduce to the module\'s rule — if you find yourself "just suppressing" instead, the finding is pointing at a spec gap, not a style issue. Lint is the course\'s discipline, enforced.',
    ].join('\n\n'),
    examples: [
      {
        title: 'The seven categories in one annotated file',
        language: 'verilog',
        code: [
          '// Each numbered block is one lint category, with the consequence',
          '// in the comment. In real code, fix them; here they teach.',
          'module lint_gallery (',
          '    input  wire       clk, reset_n,',
          '    input  wire [7:0] a, b,',
          '    input  wire       sel, en,',
          '    output reg  [7:0] y,',
          '    output reg  [7:0] q',
          ');',
          '',
          '    wire signed [7:0] s = -8\'d2;',
          '    wire        [7:0] u = 8\'d1;',
          '',
          '    // (1) WIDTH MISMATCH: 8+8 needs 9 bits, destination is 8.',
          '    //     Consequence: silent wrap (250+10 stores 4).',
          '    wire [7:0] trunc_add = a + b;      // W: truncation',
          '',
          '    // (2) SIGNEDNESS MIX: one unsigned operand poisons the sum.',
          '    //     Consequence: -2 + 1 evaluates as 254 + 1 = 255.',
          '    wire [8:0] mixed = s + u;          // W: mixed signed/unsigned',
          '',
          '    // (3) INFERRED LATCH: y unassigned when sel==0.',
          '    //     Consequence: transparent latch, STA-hostile.',
          '    always @* begin',
          '        if (sel) y = a;                // E: latch inferred for y',
          '    end',
          '',
          '    // (4) INCOMPLETE ASSIGNMENT: q unassigned on the reset-less',
          '    //     path... shown here as the combinational cousin:',
          '    //     every path must assign. (Clocked blocks: unassigned =',
          '    //     hold, which is fine.)',
          '',
          '    // (5) UNUSED SIGNAL: computed, never read.',
          '    //     Consequence: often a missing connection (the wire that',
          '    //     was supposed to drive something).',
          '    wire [3:0] orphan = a[7:4] ^ b[7:4];   // W: unused',
          '',
          '    // (6) MULTIPLE DRIVERS: two assigns fight over one net.',
          '    //     Consequence: synthesis error or shorted drivers.',
          '    // wire [7:0] x;   // (imagine declared once)',
          '    // assign x = a | b;   // E: driver 1',
          '    // assign x = b & u;   // E: driver 2',
          '',
          '    // (7) DEAD CODE: unreachable branch.',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n)    q <= 8\'d0;',
          '        else if (en)     q <= a;',
          '        else if (1\'b0)   q <= b;      // W: condition constant false',
          '        // else: hold (clocked -> correct)',
          '    end',
          'endmodule',
        ].join('\n'),
        explanation: [
          '(1) trunc_add: the 9-bit sum (worst 510) truncates to 8 bits — for a=250, b=10 it stores 4. The fix: declare the wire [8:0] and narrow deliberately, or widen the datapath per the spec.',
          '(2) mixed: s is signed, u unsigned, so the expression is unsigned: 254 + 1 = 255 stored, where the signed intent was -1 (9\'h1FF). The fix: $signed at the operand or uniform types.',
          '(3) y: no else branch, no default — the sel==0 path leaves y unassigned and the tool infers a latch. Fix: default at the top or add the else (module 03 lesson 2).',
          '(4) is the same disease in clocked clothing: there, unassigned = hold (legal); the category exists so you check which process type you are in before dismissing an "unassigned" warning.',
          '(5) orphan: computed and dropped. Either a missing connection (why was this XOR never consumed?) or leftover — delete or wire it; never waive silently.',
          '(6) is the error class: two drivers on one net have no well-defined value. One owner per signal, always.',
          '(7) the `1\'b0` branch can never execute: leftover from an edit. Dead code misleads reviewers about intended behaviour; delete it.',
        ],
      },
      {
        title: 'A synthetic lint report, triaged',
        language: 'text',
        code: [
          '================================================================',
          ' SYNTHETIC EXAMPLE REPORT FOR TEACHING - hand-built for this lesson',
          '================================================================',
          ' file: rtl/pit_datapath.v',
          ' E 105  line 42: latch inferred for \'hold_flag\'',
          '                (output not assigned on all paths)',
          ' E 210  line 55: net \'count_d\' driven by 2 processes',
          ' W 301  line 18: bit-width mismatch: a+b (9 bits) -> count_d (8)',
          ' W 310  line 47: mixed signed/unsigned operands in \'+\'',
          ' W 405  line 12: \'tmp3\' declared but never read',
          ' W 410  line 63: unreachable branch (constant condition)',
          '',
          ' TRIAGE ORDER:',
          '  1. E210 (line 55): two processes drive count_d - ownership',
          '     broken. Find both writers; one is probably the bug. FIX.',
          '  2. E105 (line 42): latch on hold_flag - missing default path.',
          '     This is a real timing hazard. FIX (defaults at top).',
          '  3. W301 (line 18): truncation - check against width laws',
          '     (module 04): 8+8 -> 9 bits. Widen or document the wrap.',
          '     FIX or justified waiver with spec reference.',
          '  4. W310 (line 47): mixed signedness - likely the -2+1=255 bug',
          '     in disguise. FIX with $signed or uniform types.',
          '  5. W405 (line 12): unused tmp3 - missing connection or cruft?',
          '     Investigate, then connect or delete. NEVER silent-waive.',
          '  6. W410 (line 63): dead branch - leftover edit. DELETE.',
          '',
          ' EXIT CRITERION: zero E, zero unjustified W; every waiver carries',
          ' a written reason and (where relevant) a spec/test reference.',
        ].join('\n'),
        explanation: [
          'Triage order: errors first (they are structural: broken ownership, timing-hostile latches), then width/signedness warnings (they are field-failure classes), then hygiene (unused/dead).',
          'The two E entries get fixed before anything else because they change what the hardware IS; the W entries get fixed or deliberately waived with written reasons.',
          'W301\'s triage references the module-04 width law — lint findings resolve against the course\'s rules, not ad hoc. "Widen or document the wrap" is exactly the module 04 lesson 2 decision.',
          'W405 gets investigated before deletion: the most valuable unused-signal findings are the forgotten connections — "why was this never consumed?" has caught real integration bugs.',
          'The exit criterion is the team\'s policy made mechanical: this report shape (clean, or every waiver written) is what makes the NEXT report readable.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Where each lint category sits in the flow',
        content: [
          '  RTL typed  ->  LINT (seconds)  ->  SIMULATION (minutes-hours)',
          '                    |                        |',
          '  catches STRUCTURE:          catches BEHAVIOUR of',
          '   width truncation            the cases you stimulated',
          '   signedness mix',
          '   latches / incomplete assigns',
          '   multi-driven nets',
          '   unused / dead code',
          '                    |',
          '                    v',
          '  Fix the same day it is typed: structural defects cost nothing',
          '  early and everything late.',
        ].join('\n'),
        caption:
          'Lint verifies shape (all inputs, structurally); simulation verifies behaviour of chosen cases. They find different bug classes and belong together in the loop.',
      },
    ],
    tables: [
      {
        caption: 'The seven categories: shape, consequence, fix',
        headers: ['Category', 'Code shape', 'Consequence if shipped', 'Fix'],
        rows: [
          ['Width mismatch', 'wire [7:0] t = a + b;', 'Silent wrap for large values', 'Grow to exact width; narrow deliberately'],
          ['Signedness mix', 'signed s + unsigned u', 'Whole expression evaluates unsigned', 'Uniform types / $signed at operands'],
          ['Inferred latch', 'always @* if (sel) y = a;', 'Transparent latch, STA-hostile', 'Defaults at top / full coverage'],
          ['Incomplete assignment', 'output missing on a path', 'Latch (comb) or intent gap', 'Assign every output on every path'],
          ['Unused signal', 'declared, never read', 'Often a missing connection', 'Connect or delete; investigate first'],
          ['Multiple drivers', 'two assigns / processes on one net', 'No defined value; synthesis error', 'One owner per signal'],
          ['Dead code', 'constant-false branches', 'Misleads reviewers about intent', 'Delete; keep history in VCS'],
        ],
      },
      {
        caption: 'Severity policy',
        headers: ['Severity', 'Meaning', 'Policy'],
        rows: [
          ['Error (E)', 'Structural defect (latch, multi-driver)', 'Fix before commit; never waive'],
          ['Warning (W)', 'Likely defect or hygiene (width, unused)', 'Fix, or waive with written reason + spec ref'],
          ['Info', 'Style note', 'Address in module-03 conventions'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Dismissing lint warnings as noise because most look harmless.',
        fix:
          'The noise is the accumulated cost of unaddressed warnings. Fix or waive each one with a written reason, enforce "no new warnings" as a review criterion, and the report returns to being a defect list. The first real truncation warning you ignore as noise is the field bug.',
      },
      {
        mistake: 'Silently suppressing a warning for a line "because it is fine here".',
        fix:
          'Every suppression needs a written reason at the line (and where relevant, a spec/test reference): "waived: deliberate modulo wrap, per spec T6". The reason converts the suppression from hiding to documenting — and the next reader (or the next tool version) can re-evaluate it.',
      },
      {
        mistake: 'Deleting an unused signal without investigating why it is unused.',
        fix:
          'Unused signals are frequently unfinished connections — a status bit nobody wired, a ready nobody consumed. Ask what the signal was FOR (spec, git history, the author) before deleting; the finding may be a missing feature, not cruft.',
      },
    ],
    guidedPractice: {
      title: 'Lint a file by hand',
      brief:
        'Act as the lint tool on this module: list every finding with category, severity and line, then triage in order with fixes. module cfg_mux(input wire [1:0] sel, input wire [7:0] d0,d1,d2, output reg [7:0] y); wire [7:0] t = d0 + d1; always @* begin if (sel == 2\'d0) y = t; else if (sel == 2\'d1) y = d2; end assign y[0] = sel[0]; endmodule',
      starterCode: [
        '// Your triage output:',
        '//   E/W  category  line-ish  what  fix',
        '//   ...',
        '// Then the corrected module (defaults, widths, ownership).',
      ].join('\n'),
      expectedBehavior:
        'Findings: E latch (y unassigned when sel==2\'d2 or 2\'d3); W width (t = d0+d1 is 9 bits into 8); W/E multiple drivers (y driven by both the always block and the assign y[0] — two owners!); W unused (none declared, but note d1 feeds only t). Triage: fix ownership first (the assign y[0] conflicts with the procedural y — probably meant a separate output); add defaults (y = 8\'h00) or full coverage for the two uncovered sel values; widen t to [8:0] and narrow deliberately. Corrected module demonstrates all three fixes with comments citing module 03 and 04 rules.',
      hints: [
        'Two different constructs driving the same output is the multiple-driver class even across assign/procedural styles.',
        'Count the sel values (4) against the branches (2).',
        'The 8+8 addition is the width-law trigger.',
      ],
    },
    practiceExercises: [
      {
        title: 'Waive or fix?',
        brief:
          'For each finding, decide fix vs written waiver and draft the waiver text where applicable: (a) a modulo-16 counter truncating its +1 sum; (b) an unused status bit that the spec says is reserved; (c) a mixed signedness sum in a signed datapath; (d) an inferred latch on a debug-only output.',
        expectedBehavior:
          '(a) WAIVE with reason: "deliberate modulo-16 wrap per spec T12; truncation is the defined behavior" — the wrap is the feature. (b) WAIVE or better, drive it to zero: "reserved bit 7 tied low per register map" — tying is cleaner than leaving unassigned. (c) FIX — signedness mix has no legitimate waiver in a signed datapath; it is the 255-instead-of-minus-1 bug. (d) FIX — latches have no waiver in synchronous design; make the debug output registered or complete the paths.',
        hints: [
          'Waivers are for deliberate, spec-backed behavior; defects never waive.',
          'Reserved bits are usually better tied than waived.',
          'Ask per finding: is this behavior someone decided, or an accident?',
        ],
      },
      {
        title: 'Build the team lint policy',
        brief:
          'Draft a 5-line team lint policy covering: when lint runs, the error policy, the warning policy, the waiver format, and the baseline rule for legacy code. Each line must be mechanically checkable.',
        expectedBehavior:
          'Sample policy: (1) Lint runs on every commit (CI) and locally before push; (2) Errors block merge — no waivers for E-severity; (3) Warnings must be fixed or waived with a same-line comment citing reason and spec/test ID; (4) Waiver format: "// lint-waive: <reason> (spec <ID>)"; (5) Legacy code gets a frozen baseline — zero NEW warnings, existing ones burn down over time. Each line is checkable: CI runs lint and diffs counts; waiver regex greppable; baseline diff is mechanical.',
        hints: [
          'Mechanically checkable means a script could enforce it.',
          'The baseline rule is how teams adopt lint without a month of cleanup first.',
          'The waiver format makes suppressions greppable and reviewable.',
        ],
      },
    ],
    assessment: {
      title: 'Lint categories checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'wire [7:0] t = a + b; with a, b unsigned 8-bit. What does this lint finding mean concretely?',
          options: [
            'Nothing; 8-bit operands produce 8-bit results',
            'The 9-bit arithmetic result (max 510) truncates to 8 bits — silent wrap for large values',
            'a and b must be declared signed',
            'The destination must be 16 bits',
          ],
          answer:
            'The 9-bit arithmetic result (max 510) truncates to 8 bits — silent wrap for large values',
          explanation:
            'N+N addition needs N+1 bits; the 8-bit destination keeps only the low byte. Fix by declaring the intermediate at 9 bits and narrowing deliberately (or widening per spec).',
          hint: 'What is the largest value a+b can produce?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'bug-identification',
          prompt:
            'Which finding is an ERROR that must never be waived?',
          options: [
            'An unused signal that turns out to be a deliberate reserved bit',
            'A deliberate modulo wrap on a counter',
            'Two processes driving the same net',
            'A style note about naming',
          ],
          answer: 'Two processes driving the same net',
          explanation:
            'Multiple drivers have no defined value — the net fights itself in simulation and fails synthesis. Ownership is structural; the other three have legitimate written waivers or fixes.',
          hint: 'Which one makes the hardware itself undefined?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'An unused signal should be waived silently when it appears harmless.',
          answer: 'false',
          explanation:
            'Unused signals are frequently forgotten connections — a status nobody wired, a ready nobody consumed. Investigate first (spec, history), then connect or delete; if genuinely deliberate (reserved), the waiver carries a written reason and a spec reference.',
          hint: 'What is the highest-value thing an unused-signal warning can be?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Name the four categories that indicate likely functional bugs (as opposed to hygiene), and the two that are hygiene.',
          answer:
            'Functional: width mismatch, signedness mix, inferred latch, incomplete assignment (and multiple drivers, which is an outright error); hygiene: unused signals, dead code',
          explanation:
            'The first group changes computed values or creates wrong hardware; the hygiene group misleads and hides unfinished work but does not itself compute wrongly.',
          hint: 'Which categories change what the hardware computes?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'output-prediction',
          prompt:
            'With wire signed [7:0] s = -8\'d2 (8\'hFE) and wire [7:0] u = 8\'d1, what does wire [8:0] mixed = s + u; hold?',
          code: 'wire signed [7:0] s;  // -2\nwire        [7:0] u;  // 1\nwire [8:0] mixed = s + u;   // mixed types!',
          options: ['9\'h1FF (-1)', '9\'h0FF (+255)', '9\'h0FE', 'x'],
          answer: '9\'h0FF (+255)',
          explanation:
            'One unsigned operand makes the whole expression unsigned: s is read as 254, so 254 + 1 = 255 = 9\'h0FF. The signed intent (-1 = 9\'h1FF) was lost at the operator.',
          hint: 'Signedness is decided by the operands, not the destination.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Width mismatch', definition: 'Assignment whose arithmetic result width differs from the destination; silent truncation.' },
      { term: 'Signedness mix', definition: 'An expression mixing signed and unsigned operands; evaluates unsigned throughout.' },
      { term: 'Inferred latch', definition: 'Transparent latch created by an incomplete combinational path.' },
      { term: 'Multiple drivers', definition: 'Two processes or assigns driving one net; no defined value.' },
      { term: 'Dead code', definition: 'Unreachable or constant-condition code that misstates design intent.' },
      { term: 'Lint waiver', definition: 'A suppressed warning carrying a written reason and (where relevant) a spec reference.' },
    ],
    revisionSummary: [
      'Seven categories: width, signedness, latch, incomplete assignment, unused, multi-driver, dead code.',
      'Width and signedness findings are field-failure classes; latch/incomplete are timing-hostile structure; multi-driver is an outright error.',
      'Unused signals often mean missing connections — investigate before deleting.',
      'Triage: errors first, then width/signedness, then hygiene; every waiver carries a written reason + spec ref.',
      'Lint reads structure (all inputs) where simulation reads behaviour (chosen inputs) — both, always.',
      'Clean-report discipline: fix or waive everything, enforce no-new-warnings, keep the report a defect list.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Lint (software)',
        url: 'https://en.wikipedia.org/wiki/Lint_(software)',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Static program analysis',
        url: 'https://en.wikipedia.org/wiki/Static_program_analysis',
        kind: 'article',
      },
    ],
    estimatedMinutes: 50,
  },
  {
    id: 'rtl-m09-l2',
    title: 'Code That Survives Review',
    summary:
      'Review is where designs get better or get rubber-stamped. This lesson packages the maintainability disciplines — interface comments, no magic numbers, structured headers — into a 10-point checklist a reviewer can run mechanically.',
    objectives: [
      'Write module headers and interface comments that answer a reviewer\'s first five questions.',
      'Replace every magic number with a commented localparam tied to its spec source.',
      'Run a 10-point review checklist against a module and produce findings, not opinions.',
      'Distinguish review findings (objective, checkable) from style preferences (team policy).',
    ],
    whyItMatters:
      'Code review is the highest-bandwidth quality gate in RTL: a 30-minute review catches what a week of simulation misses, because reviewers bring fresh eyes and spec knowledge. But review quality depends entirely on the code being reviewable — headers that explain intent, names that carry contracts, numbers that cite their sources. And review itself needs structure: an unstructured "LGTM" rubber-stamps; a checklist produces findings that map to fixes. This lesson is that structure.',
    prerequisites: ['rtl-m03-l3', 'rtl-m09-l1'],
    explanation: [
      '**The header answers the first five questions** a reviewer has: what does this module do (one paragraph)? what are its interfaces (each port with protocol)? what clocking does it assume? what are the reset values? where does the spec live (decision log, register map pointers)? A header that answers these converts review from archaeology to checking. The template is fixed (module 03 lesson 3) and short — eight lines — because the reviewer reads it before every logic line.',
      '**Interface comments are contracts, not descriptions.** "data_i: input data" says nothing; "data_i: sample stream, one sample per cycle when en_i; consumed on en_i edges" is a contract the reviewer can check the logic against and the verifier can test against. The discipline from module 05 lesson 3 applies at every boundary: every command signal gets "assert for exactly one cycle to..."; every status gets "asserted while... / updated on...". Interfaces outlive implementations — software teams, verification teams and future you consume them — so the comment standard at ports is the highest in the file.',
      '**Magic numbers are design facts without homes.** `if (cnt == 12)` — is 12 a period? a timeout? a legacy constant? `localparam CNT_PERIOD = 12; // spec 4.2: interval = 12 cycles (test T14)` turns the number into a named fact with provenance. The test: every literal wider than a bit in comparisons or arithmetic must be a localparam with a comment citing where it comes from. When the spec changes 12 to 10, there is exactly one edit and the comment (and its test) updates with it. Magic numbers are also how specs rot: the number in the code drifts from the number in the document because nothing connects them.',
      '**The 10-point checklist** makes review mechanical where it can be, reserving human judgment for architecture. Its points are checkable by reading (headers present, register list matches, template compliance, no magic numbers, naming respected, no clock in RHS, crossings documented, width/sign discipline, dead code gone, lint clean-or-waived). A reviewer runs it top to bottom in minutes; findings come out as objective statements ("register `mode_q` missing from reset branch — point 3") rather than opinions ("this feels off"). The checklist also protects reviewers: a finding list is defensible and complete; a gut-feel review is neither.',
      '**Findings vs preferences** is the distinction that keeps reviews useful. A finding references a rule (checklist point, spec clause, lint category) and names the fix. A preference ("I would use different indentation") belongs to team policy — settled once in the style guide, not re-litigated per review. Teams that blur the two get defensive authors and inconsistent reviews; teams that separate them get fast, factual reviews and a style guide that actually converges. The checklist\'s points are all findings-class: each maps to a rule this course has already established.',
    ].join('\n\n'),
    deepDive: [
      'The economics of review deserve stating: a finding caught in review costs minutes (author edits, reviewer confirms); the same defect found in simulation costs a debug session; found in the netlist, a re-synthesis cycle; found in the field, a support ticket. Review is also the only gate that checks *intent* — simulation checks what the code does, the reviewer checks what the code should do. That is why the checklist\'s early points (header, register list, spec pointers) matter as much as the technical ones: they let the reviewer check intent at all.',
      'Why a checklist rather than reviewer skill alone? Because review quality is a system property, not a hero property: skilled reviewers have good days and time pressure, and an unstructured review of a 900-line diff reliably degrades to a skim. The checklist distributes attention evenly (the boring middle of a file gets the same scrutiny as the interesting top), makes review speed measurable, and lets teams onboards new reviewers quickly. The best reviewers use checklists precisely because their judgment is then spent where it is scarce — on architecture and corner cases — not on remembering to look for magic numbers.',
      'Comment rot is the failure mode of all this documentation, and the defense is proximity plus testing. Proximity: the comment lives at the port/constant, so the edit that changes behavior passes the comment (and the reviewer\'s checklist point asks: did the comment change with the code?). Testing: constants that cite test IDs create a coupling — change the constant and the named test fails, forcing the comment and spec to be revisited. This is why magic-number localparams cite tests, not just specs: the test is the executable form of the comment.',
    ].join('\n\n'),
    examples: [
      {
        title: 'A module written to pass the checklist',
        language: 'verilog',
        code: [
          '// ------------------------------------------------------------------',
          '// seq_det: detects a 2-sample rising sequence on data_i.',
          '//',
          '// Function : pulses seq_tick_o for one cycle when data_i rises',
          '//            above seq_thresh for 2 consecutive sampled cycles.',
          '// Interfaces: see port comments. tick is a 1-cycle Mealy-style pulse.',
          '// Clocking : single domain, posedge clk. All regs on reset_n.',
          '// Reset    : all registers to 0 (spec regmap v1.0, all-zero row).',
          '// Spec     : seq-det spec v1.2 B3-B5; decision log D4 (threshold',
          '//            as parameter); tests T21-T23.',
          '// ------------------------------------------------------------------',
          'module seq_det #(',
          '    parameter [7:0] SEQ_THRESH = 8\'d200  // spec 4.2: threshold, test T21',
          ') (',
          '    input  wire       clk,',
          '    input  wire       reset_n,        // async, active-low',
          '    input  wire       sample_en_i,    // 1-cycle: sample data_i this edge',
          '    input  wire [7:0] data_i,         // sample stream (valid on en)',
          '    output reg        above_q,        // debug: data above threshold',
          '    output wire       seq_tick_o      // 1-cycle pulse on 2-in-a-row',
          ');',
          '',
          '    reg above_d_q;   // previous sample was above threshold',
          '',
          '    // Cloud: current-sample comparison (named, commented).',
          '    wire above_now = (data_i > SEQ_THRESH);',
          '',
          '    always @(posedge clk or negedge reset_n) begin',
          '        if (!reset_n) begin',
          '            above_q   <= 1\'b0;',
          '            above_d_q <= 1\'b0;',
          '        end else if (sample_en_i) begin',
          '            above_q   <= above_now;',
          '            above_d_q <= above_q;   // shift the "above" history',
          '        end',
          '    end',
          '',
          '    // Mealy-style pulse: both history bits set = 2 consecutive.',
          '    assign seq_tick_o = above_q & above_d_q & sample_en_i;',
          '',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Header (lines 1-9): function in one paragraph, interfaces pointer, clocking, reset policy with its register-map source, spec/decision/test pointers. Reviewer questions 1-5 answered before any logic.',
          'Parameter comment (line 11): the threshold is named, defaulted, and cites spec section AND test — the magic-number rule at parameter level.',
          'Port comments (lines 15-18): every port carries its contract (duration, when consumed, polarity). sample_en_i\'s "1-cycle: sample this edge" is the sentence a verifier turns into a check.',
          'Line 24: the comparison is a named wire (above_now) with a comment — the cloud is stated as a fact, reviewable in isolation.',
          'Lines 26-35: template compliance — one clock, one reset, every register reset (point 3), enables as branches, nonblocking throughout.',
          'Line 38: the output\'s comment states its shape (1-cycle Mealy pulse) so consumers know to treat it as a pulse.',
          'Checklist run: header (1) pass; register list — above_q, above_d_q both reset (3) pass; template (3) pass; magic numbers — SEQ_THRESH named (5) pass; naming — _i/_o/_q/_tick respected (6) pass; no clock in RHS (7) pass; no crossings beyond the ports (8) pass; widths explicit (9) pass; no dead code (10) pass.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'The review flow: checklist, then judgment',
        content: [
          '  DIFF ARRIVES',
          '      |',
          '      v',
          '  10-POINT CHECKLIST (mechanical, minutes)',
          '    1 header   2 register list   3 template   4 lint state',
          '    5 magic numbers   6 naming   7 no clock in RHS',
          '    8 crossings documented   9 width/sign discipline',
          '   10 no dead code',
          '      |  findings: objective, rule-referencing',
          '      v',
          '  HUMAN JUDGMENT (where skill is scarce)',
          '    - architecture matches the spec?',
          '    - corner cases covered?',
          '    - does the code say what the author intended?',
          '      |',
          '      v',
          '  FINDINGS LIST -> fixes -> re-review of fixes only',
        ].join('\n'),
        caption:
          'The checklist absorbs the mechanical half of review so judgment is spent on intent and corners — the parts checklists cannot do.',
      },
    ],
    tables: [
      {
        caption: 'The 10-point RTL review checklist',
        headers: ['#', 'Point', 'Pass condition'],
        rows: [
          ['1', 'Header present and complete', 'Function, interfaces, clocking, reset, spec pointers'],
          ['2', 'Register list matches code', 'Every _q has a reset value and an owner; no undeclared registers'],
          ['3', 'Process templates respected', 'One clock/one reset per block; nonblocking in clocked; defaults in comb'],
          ['4', 'Lint state', 'Zero errors; warnings fixed or waived with written reasons'],
          ['5', 'No magic numbers', 'Every multi-bit literal is a localparam citing spec/test'],
          ['6', 'Naming convention', '_i/_o/_q/_d/_n/_en/_tick used per the project convention'],
          ['7', 'Clock policy', 'clk only in sensitivity lists; enables not gated clocks'],
          ['8', 'Crossings documented', 'Every boundary signal has its one-sentence contract; CDC per lesson m07-l3'],
          ['9', 'Width/sign discipline', 'Explicit widths, sized literals, no mixed signedness'],
          ['10', 'No dead code', 'No unused signals (or named reasons), no unreachable branches'],
        ],
      },
      {
        caption: 'Finding vs preference',
        headers: ['Statement', 'Class', 'Because'],
        rows: [
          ['"mode_q is missing from the reset branch (point 3)"', 'Finding', 'References a rule; names the fix'],
          ['"The FSM could be 3 states instead of 5"', 'Judgment', 'Architecture discussion — needs the spec context'],
          ['"I prefer begin/end on one line"', 'Preference', 'Style-guide material, not per-review'],
          ['"cnt == 12 is a magic number (point 5)"', 'Finding', 'Rule-referencing; fix is a localparam'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Rubber-stamping large diffs under time pressure ("LGTM, looks fine").',
        fix:
          'The checklist converts review from a mood to a procedure: run the ten points, list findings, done. If there is genuinely no time for the checklist, the review is not done — say so and schedule it; a rubber stamp transfers the defect cost to simulation or field with none of the review benefit.',
      },
      {
        mistake: 'Reviewing intent from the code alone (no spec, no decision log open).',
        fix:
          'The checklist\'s first points require the spec pointers — a reviewer cannot check "does the code match the design?" without the design artifacts. Reviews happen with the spec and register map open; the header\'s pointers exist to make that fast.',
      },
      {
        mistake: 'Letting style preferences into findings ("rename this variable", "use different indentation").',
        fix:
          'Preferences go to the style guide once; findings reference rules. Mixing them trains authors to argue and reviewers to skim. If a preference keeps recurring, it graduates to the style guide — then it becomes a checklist point.',
      },
    ],
    guidedPractice: {
      title: 'Run the checklist on a flawed module',
      brief:
        'Run the 10-point checklist on this module and list every finding with its point number and fix: module thing(input clk, rst, input [7:0] d, output reg [7:0] q1); reg [7:0] tmp; always @(posedge clk) begin if (rst) q1 = 0; q1 <= d; tmp = d + 5; end assign open = tmp[3]; endmodule — where `open` is an undeclared implicit net.',
      starterCode: [
        '// Findings (point #, what, fix):',
        '//   ...',
        '// Then the corrected module.',
      ].join('\n'),
      expectedBehavior:
        'Findings: (1) no header; (2) tmp has no reset and no owner statement; (3) blocking = on q1 in a clocked block, mixed with nonblocking — violation; rst polarity: active-high `rst` vs course reset_n (template violation); q1 assigned unconditionally after the reset branch (reset is dead — the if is useless); (5) magic number 5; (6) names (thing, tmp, q1) violate the convention; (9) `open` is an implicit 1-bit net from an undeclared identifier — a typo-class bug lint catches (undeclared net); tmp computed but only bit 3 used with no comment; (10) tmp[3] used, rest unused. Corrected module: header, reset_n, nonblocking only, proper priority (reset vs load), localparam OFFSET = 8\'d5 with comment, named ports (data_i, q_o), declared wires, and a decision about tmp\'s purpose (comment or delete).',
      hints: [
        'The rst-q1 structure is doubly broken: blocking AND a dead reset (the unconditional assign defeats it).',
        '`open` (or any undeclared identifier in Verilog-2001 with default_nettype wire) becomes an implicit net — lint flags it; `default_nettype none prevents the class.',
        'Walk the ten points in order so nothing is skipped.',
      ],
    },
    practiceExercises: [
      {
        title: 'Write the header',
        brief:
          'Write the eight-line header for the PIT datapath module (pit_datapath: 16-bit down-counter with load, decrement enable, zero/one detect status) using the template: function, interfaces, clocking, reset, spec pointers.',
        expectedBehavior:
          'Sample: "pit_datapath: the PIT\'s countdown datapath. Function: holds count_q[15:0]; loads on count_load_i, decrements while run_i and count != 0. Interfaces: count_load_i/run_i (control contract, module 02), tc_tick_o/count_zero_o (status), period bus from control. Clocking: posedge clk only. Reset: count_q to 0x0000 (register list row 1). Spec: PIT spec v1.0 B4-B6, register map COUNT row, decision log D2 (compare-at-1), tests T3-T6." Every sentence is checkable against an artifact — that is what makes it a header rather than prose.',
        hints: [
          'Every sentence should cite or state a checkable fact.',
          'The interface sentences are the contract sentences from module 05.',
          'Spec pointers make the reviewer\'s job possible — name the exact artifacts.',
        ],
      },
      {
        title: 'Classify the review comments',
        brief:
          'Classify each as finding, judgment, or preference, and convert the judgments into actionable forms: (a) "this always block has two clocks"; (b) "consider a 2-stage pipeline here"; (c) "use `always @*` instead of the hand list"; (d) "the corner table row for PERIOD=0 has no test"; (e) "I would have used a case here".',
        expectedBehavior:
          '(a) Finding (template point 3 — one clock per block). (b) Judgment — convert by grounding it: "the module-06 ledger shows fmax 133 vs required 150; a cut would fix it at +1 cycle latency — check the spec budget" (an architecture proposal with evidence). (c) Finding (lint/template: stale-list class). (d) Finding (checklist point 8/verification coverage — every corner row names its test). (e) Preference — style-guide material unless a rule backs it.',
        hints: [
          'Findings cite rules; judgments need evidence attached to become actionable.',
          '(b) is the interesting one: judgments become findings when the evidence (spec numbers) is attached.',
          '(e) is only a finding if the style guide says so.',
        ],
      },
    ],
    assessment: {
      title: 'Review readiness checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'What makes a review comment a "finding" rather than a preference?',
          options: [
            'It is about a large file',
            'It references a rule (checklist point, spec clause, lint category) and names the fix',
            'It comes from a senior engineer',
            'It is about naming',
          ],
          answer: 'It references a rule (checklist point, spec clause, lint category) and names the fix',
          explanation:
            'Findings are objective and rule-backed; preferences are style-guide material. The separation keeps reviews factual and the style guide converging.',
          hint: 'Could the author verify the comment mechanically?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'Which header line does the reviewer need FIRST to check whether the code matches the design?',
          options: [
            'The estimated line count',
            'The spec/decision-log pointers',
            'The author\'s name',
            'The synthesis tool version',
          ],
          answer: 'The spec/decision-log pointers',
          explanation:
            'Checking code-against-design requires the design artifacts; the pointers make them one click away. That is why they are in the header template.',
          hint: 'What does the reviewer compare the code against?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'A magic number with a comment is acceptable; a magic number without one is a checklist finding.',
          answer: 'false',
          explanation:
            'The rule is stronger: multi-bit literals become commented localparams — the named constant IS the comment\'s home, and it gives the number exactly one edit site and one provenance. A bare literal with a nearby comment still has no single edit point.',
          hint: 'Where does the commented number live?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Name four checklist points that a lint tool can check mechanically, and two that genuinely need the human reviewer.',
          answer:
            'Mechanical: lint state (4), magic numbers (5, greppable), naming (6, regex), clock policy (7, clk-in-RHS grep), width/sign (9, lint) — any four; human: header/intent match to spec (1), register list vs spec (2), crossings vs protocol (8) — judgment about intent and architecture',
          explanation:
            'The checklist deliberately splits: machines enforce shape, humans judge intent. Knowing which is which is what makes review time well spent.',
          hint: 'Which points are grep-shaped? Which need the spec open?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt:
            'A reviewer approves a 900-line diff in four minutes with "LGTM". By the checklist, what process failure occurred, and what is the minimum acceptable output?',
          options: [
            'None; fast reviews are efficient reviews',
            'The checklist was not run: minimum output is the ten points assessed with a findings list — even if the finding list is empty',
            'The diff was too small to need a checklist',
            'Only senior engineers may review',
          ],
          answer:
            'The checklist was not run: minimum output is the ten points assessed with a findings list — even if the finding list is empty',
          explanation:
            'Four minutes cannot cover a 900-line diff against ten points plus intent. The checklist\'s value is exactly that its completion is verifiable — an empty findings list from a completed pass is acceptable; a time-pressured stamp is not a review.',
          hint: 'What would the review record look like if done properly?',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Module header', definition: 'The eight-line top comment: function, interfaces, clocking, reset, spec pointers.' },
      { term: 'Interface contract', definition: 'The one-sentence spec per boundary signal (duration, effect, persistence).' },
      { term: 'localparam with provenance', definition: 'A named constant citing its spec section and test — the anti-magic-number form.' },
      { term: 'Review checklist', definition: 'The 10 mechanical points run on every diff before human judgment.' },
      { term: 'Finding', definition: 'A rule-referencing review comment naming its fix.' },
      { term: 'Comment rot', definition: 'Documentation drifting from behavior; defended by proximity and test-cited constants.' },
    ],
    revisionSummary: [
      'Header answers the first five reviewer questions; interface comments are contracts with duration and effect.',
      'Every multi-bit literal is a localparam citing spec and test — one edit site, executable provenance.',
      'The 10-point checklist runs before human judgment; findings reference rules and name fixes.',
      'Judgments become actionable when evidence is attached; preferences go to the style guide.',
      'Review with the spec open; check intent, not just syntax.',
      'Comment rot is defended by proximity (comment at the port/constant) and test-cited constants.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Code review',
        url: 'https://en.wikipedia.org/wiki/Code_review',
        kind: 'article',
      },
      {
        label: 'Wikipedia — Coding conventions',
        url: 'https://en.wikipedia.org/wiki/Coding_conventions',
        kind: 'article',
      },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'rtl-m09-l3',
    title: 'Self-Checking Testbenches and the Regression Mindset',
    summary:
      'A testbench that requires a human to eyeball waveforms verifies nothing twice. Self-checking benches — stimulus, reference model, checker, verdict — turn every simulation into a pass/fail answer and make regression (rerun everything, every change) affordable.',
    objectives: [
      'Structure a self-checking testbench: stimulus generation, reference model, checker, error counting.',
      'Write a complete self-checking TB for a small sequential design and hand-trace its expected transcript.',
      'Explain why the reference model must be written from the spec, not from the DUT.',
      'Apply the regression discipline: full suite on every change, test IDs traceable to spec.',
    ],
    whyItMatters:
      'Verification volume is the difference between "I tried some inputs" and evidence. A self-checking bench runs thousands of cases and prints one line — PASS or the exact failing check — with no human in the loop. That is what makes regression possible: every RTL change re-runs the whole suite in minutes, so defects surface the day they are introduced. The reference-model habit also forces spec precision: writing the model is writing the spec in code, and disagreements between model and DUT are spec questions in disguise.',
    prerequisites: ['rtl-m02-l1', 'rtl-m01-l1', 'rtl-m05-l1'],
    explanation: [
      'The **four parts** of a self-checking bench: (1) **stimulus** — inputs driven on a schedule (directed sequences for corners, plus random for volume); (2) **reference model** — an independent implementation of the spec, ideally the simplest possible expression of the behaviour statements; (3) **checker** — compares DUT outputs against the model on every relevant cycle, counting errors with exact messages (which check, what cycle, expected vs actual); (4) **verdict** — an exit status: errors == 0 means PASS. The defining property: the bench decides pass/fail itself. A bench whose output is "some waveforms" delegates the checking to whoever glances at them — once, imperfectly.',
      'The **reference model\'s independence is the whole point.** Written from the spec\'s behaviour statements (module 02 lesson 1), it shares no code with the DUT and expresses the same rules differently — so a model/DUT disagreement is evidence, not noise. The failure mode to avoid is copying the DUT\'s structure into the model (then both share the same bug and agree perfectly). The practical check: could you hand the model to someone who has never seen the DUT, with only the spec, and have them agree it is a faithful model? If the model needs the DUT\'s source to make sense, it is not independent.',
      '**Timing discipline in benches**: drive stimulus on the opposite clock edge from the DUT\'s sampling (drive at negedge for a posedge-sampling DUT) — this removes races and makes the intended sampling unambiguous. Check on the edge after the expected update (or at the following negedge, when outputs have settled). Non-clock-checked delays (`@(posedge clk)`) instead of raw `#delay` wherever behaviour is cycle-based — raw delays break the moment any timing changes and make benches fragile.',
      '**The regression mindset**: the suite is the unit of verification, not the test. Every RTL change triggers a full-suite run — because changes break distant things (a shared signal renamed, an enable restructured), and the suite is cheap relative to a missed break. The bookkeeping that makes regressions meaningful: every test maps to spec behaviour statements and corner-table rows (the test IDs from module 02), so a passing suite is a claim about the spec\'s coverage, not just "the code ran". A regression report that says "312/312 PASS" with the traceability matrix is the verification artifact that module 11\'s capstone closes with.',
      'What self-checking does **not** replace: coverage thinking. A suite can pass 312 tests and still never drive the corner where the bug lives. Directed tests cover the enumerated corners (from the corner table); constrained-random stimulus sweeps the space between them; coverage metrics (toggle, branch, functional coverpoints) report what was actually exercised. The honest verification loop: write directed tests from the corner table, add random stimulus for volume, check coverage for holes, and add tests where the holes are — with the corner table as the spec-side map of what "covered" means.',
    ].join('\n\n'),
    deepDive: [
      'The reference model for sequential designs mirrors the transfer equation, not the RTL structure. For the accumulator: model_q = clear ? 0 : (en ? model_q + d : model_q) — one line, written from B-statements, with no always-block ceremony. That brevity is the point: the model is the spec\'s math; the DUT is the spec\'s engineering. When they disagree, the interesting question is which one the spec supports — and the resolution is a spec change or a DUT fix, never a "model tweak to match".',
      'Error messages are a verification deliverable in themselves. "MISMATCH" tells the debuger nothing; "cycle 214: sum_o=0x4B expected 0x4C (after en=1 d=0x0F, prev 0x3D)" tells them where to look before opening the waveform. The template: cycle number, DUT value, expected value, and the stimulus context. The effort is one $display format string; the payoff is that most failures are diagnosed from the log alone.',
      'Random stimulus needs determinism to be useful in regression: a random bench that fails once and passes on re-run is a debugging nightmare. The standard mechanism is seeded reproducibility — the seed is printed, and re-running with the same seed replays the exact failure. Modern flows add shrinkage (minimize the failing case automatically), but the seed discipline is the RTL-level habit: every random bench prints its seed first, and the regression system archives seeds of failures. Random without reproducibility is entertainment, not verification.',
    ].join('\n\n'),
    examples: [
      {
        title: 'A complete self-checking bench for the enabled accumulator',
        language: 'verilog',
        code: [
          '`timescale 1ns/1ps',
          '// Self-checking TB for acc_enabled (module 01 lesson 1 practice).',
          '// Stimulus: directed corner sequence. Model: transfer equation.',
          '// Checker: every cycle. Verdict: PASS/FAIL line at end.',
          'module acc_tb;',
          '    localparam integer WIDTH = 8;',
          '',
          '    reg              clk = 1\'b0;',
          '    reg              reset_n = 1\'b0;',
          '    reg              clear = 1\'b0;',
          '    reg              add_en = 1\'b0;',
          '    reg  [WIDTH-1:0] data_i = 8\'h00;',
          '    wire [WIDTH-1:0] sum_o;',
          '',
          '    // DUT (the module-01 enabled accumulator).',
          '    acc_enabled #(.WIDTH(WIDTH)) dut (',
          '        .clk(clk), .reset_n(reset_n), .clear(clear),',
          '        .add_en(add_en), .data_i(data_i), .sum_o(sum_o)',
          '    );',
          '',
          '    always #5 clk = ~clk;    // 10 ns period',
          '',
          '    // Reference model (from spec, not from DUT): one line.',
          '    reg [WIDTH-1:0] model_q;',
          '    // model_q(next) = clear ? 0 : (add_en ? model_q + data_i : model_q)',
          '',
          '    integer errors = 0;',
          '    integer cycle  = 0;',
          '',
          '    // Apply one input set at negedge; check result after the edge.',
          '    task apply_and_check(',
          '        input              en,',
          '        input [WIDTH-1:0]  d,',
          '        input              clr',
          '    );',
          '        reg [WIDTH-1:0] expected;',
          '        begin',
          '            @(negedge clk);            // drive away from the edge',
          '            add_en = en;  data_i = d;  clear = clr;',
          '            cycle = cycle + 1;',
          '            // model update (blocking fine in TB):',
          '            if (clr)      expected = {WIDTH{1\'b0}};',
          '            else if (en)  expected = model_q + d;',
          '            else          expected = model_q;',
          '            @(posedge clk);            // DUT samples here',
          '            @(negedge clk);            // outputs settled now',
          '            if (sum_o !== expected) begin',
          '                errors = errors + 1;',
          '                $display("FAIL cycle %0d: sum_o=%h expected %h (en=%b d=%h clr=%b)",',
          '                         cycle, sum_o, expected, en, d, clr);',
          '            end',
          '            model_q = expected;',
          '        end',
          '    endtask',
          '',
          '    integer i;',
          '    initial begin',
          '        // Reset: hold reset_n low across 2 edges, then release.',
          '        model_q = {WIDTH{1\'b0}};',
          '        @(negedge clk); @(negedge clk);',
          '        reset_n = 1\'b1;',
          '        @(negedge clk);',
          '',
          '        // Directed corner sequence (spec B-statements):',
          '        apply_and_check(1\'b1, 8\'d4,   1\'b0);  // accumulate 4',
          '        apply_and_check(1\'b1, 8\'d250, 1\'b0);  // accumulate 250',
          '        apply_and_check(1\'b0, 8\'d9,   1\'b0);  // hold (en=0)',
          '        apply_and_check(1\'b1, 8\'d9,   1\'b0);  // accumulate 9 (wrap!)',
          '        apply_and_check(1\'b0, 8\'d0,   1\'b1);  // clear',
          '        apply_and_check(1\'b1, 8\'d200, 1\'b0);  // accumulate 200',
          '        // Pseudo-random volume (seeded): 200 cycles.',
          '        for (i = 0; i < 200; i = i + 1) begin',
          '            apply_and_check($random & 1\'b1, $random, 1\'b0);',
          '        end',
          '',
          '        if (errors == 0) $display("TEST PASS (%0d checks)", cycle);',
          '        else             $display("TEST FAIL: %0d mismatches", errors);',
          '        $finish;',
          '    end',
          'endmodule',
        ].join('\n'),
        explanation: [
          'Drive timing: stimulus changes at negedge (task lines 38-40), the DUT samples at the following posedge, and the check runs at the negedge after (line 46) when outputs are stable. No races by construction.',
          'The model (lines 24-25) is the transfer equation written once, from the spec B-statements — no structural resemblance to the DUT\'s always block. Independence check: it fits in one line.',
          'The checker (lines 47-51) compares every cycle, counts errors, and prints the diagnostic triple (cycle, actual, expected, stimulus context) — the message format that diagnoses from the log.',
          'Hand-trace of the directed sequence: after reset model=DUT=0. (1,4): both 4. (1,250): both 254. (0,9): both hold 254. (1,9): 254+9 = 263 wraps to 7 — model and DUT agree on the wrap because BOTH implement modulo arithmetic; the test documents that wrap is the spec\'s policy (module 04). (clear): both 0. (1,200): both 200.',
          'The wrap case is the teaching point: if the DUT had a width bug (e.g. 9-bit sum truncated differently), this test catches it because the model was written from the spec ("8-bit register, wrap"), not from the buggy code.',
          'Predicted transcript (hand-traced, not tool output): "TEST PASS (206 checks)" — 6 directed + 200 random, each counted once by the checker. Any FAIL line names the cycle, the values and the stimulus.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Self-checking bench structure',
        content: [
          '                 STIMULUS (directed corners + seeded random)',
          '                        |',
          '                        v   inputs (drive at negedge)',
          '              +-------------------+',
          '              |       DUT         |---- outputs ----+',
          '              +-------------------+                 |',
          '                                                    v',
          '   SPEC --> REFERENCE MODEL --expected--> CHECKER (every cycle)',
          '   (B-statements)  (independent)          |  compare, count,',
          '                                          |  diagnose on FAIL',
          '                                          v',
          '                                    VERDICT: PASS / FAIL + errors',
          '',
          '  Failure path: checker message -> seed archived -> debug ->',
          '  fix -> FULL SUITE re-run (regression), not just this test.',
        ].join('\n'),
        caption:
          'The bench decides pass/fail itself; the model comes from the spec; regression re-runs everything on every change.',
      },
    ],
    tables: [
      {
        caption: 'Bench components and their disciplines',
        headers: ['Component', 'Discipline', 'Failure if skipped'],
        rows: [
          ['Stimulus', 'Drive at negedge; directed corners + seeded random', 'Races; uncovered space'],
          ['Reference model', 'Written from spec; independent of DUT', 'Model shares DUT bugs; agreement is meaningless'],
          ['Checker', 'Every cycle; diagnostic messages', 'Silent wrongness; log-only debugging'],
          ['Verdict', 'Error count -> PASS/FAIL exit', 'Human must eyeball every run'],
          ['Regression', 'Full suite on every change; seeds archived', 'Distant breakage discovered late'],
        ],
      },
      {
        caption: 'Directed corners in the example bench and their spec sources',
        headers: ['Check', 'Input', 'Expected', 'Spec source'],
        rows: [
          ['Accumulate', 'en=1, d=4', 'sum 4', 'B (accumulate)'],
          ['Accumulate', 'en=1, d=250', 'sum 254', 'B (accumulate)'],
          ['Hold', 'en=0, d=9', 'sum unchanged (254)', 'B (enable semantics)'],
          ['Wrap', 'en=1, d=9 at 254', 'sum 7 (263 mod 256)', 'width policy (module 04)'],
          ['Clear', 'clr=1', 'sum 0', 'B (clear)'],
          ['Random volume', 'seeded 200 cycles', 'model agreement', 'space sweep'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing the reference model by copying the DUT\'s logic "to make sure they match".',
        fix:
          'A model copied from the DUT shares its bugs and verifies nothing — agreement is guaranteed, not earned. Write the model from the spec\'s behaviour statements in its simplest form (one line for the accumulator), and treat every disagreement as evidence.',
      },
      {
        mistake: 'Driving stimulus with raw #delays instead of clock-edge events.',
        fix:
          '#10-style delays break the moment any timing shifts, and they obscure which edge samples what. Drive at negedge and wait on edges (@(posedge clk) / @(negedge clk)); cycle-based benches survive refactor and read as cycle plans.',
      },
      {
        mistake: 'Running only the failing test after a fix ("the suite is slow").',
        fix:
          'The fix may have broken anything — the suite is the verification unit. If the suite is too slow to run fully, that is a bench-engineering problem to fix (partition, parallelism, shorter seeds), not a reason to skip. Regression discipline is what makes the suite an asset instead of a ritual.',
      },
    ],
    guidedPractice: {
      title: 'Self-checking bench for the seq_det module',
      brief:
        'Write the self-checking bench for module 09 lesson 2\'s seq_det (2-consecutive-above-threshold detector with sample_en_i). Model (one line of spec): detect when the current AND previous samples are above SEQ_THRESH on enabled cycles. Directed corners: one above then one below (no tick), two above (tick), three above (two ticks — check no re-arm bug), threshold boundary value (data == SEQ_THRESH is NOT above — strict >). Include the reset phase and the verdict.',
      starterCode: [
        '// Structure (copy the acc_tb pattern):',
        '//   DUT: seq_det (clk, reset_n, sample_en_i, data_i, above_q, seq_tick_o)',
        '//   Model: prev_above_q + curr_above_q (2 bits of state)',
        '//   Directed corners: below-then-below, above-then-below,',
        '//     above-then-above (tick), three-above (two ticks),',
        '//     data == SEQ_THRESH (boundary: NOT above, strict >)',
        '//   Checker on seq_tick_o at enabled cycles.',
      ].join('\n'),
      expectedBehavior:
        'Model: curr = (data_i > SEQ_THRESH); on sample_en_i: tick_expected = curr & prev; prev <= curr. Directed results with SEQ_THRESH=200: (150,150): no tick. (205,150): no tick (205 above, then 150 below). (205,210): tick on the second enabled cycle. (205,210,220): ticks on cycles 2 AND 3 (the shift register re-arms naturally — above_d_q becomes 1 and stays). (200,205): NO tick on either cycle — 200 is not > 200 (boundary semantics check; a >= implementation fails here). The bench counts ticks against expected at each enabled cycle and prints PASS/FAIL.',
      hints: [
        'The model is two bits of state and one comparison — write it before the bench.',
        'The boundary case (data == threshold) is where strict vs non-strict comparison bugs live.',
        'The three-above case catches the classic "no re-arm" bug: does the second tick fire?',
      ],
    },
    practiceExercises: [
      {
        title: 'Diagnose from the log',
        brief:
          'A regression run prints: FAIL cycle 214: sum_o=0x4B expected 0x4C (en=1 d=0x0F clr=0). The previous passing cycle was 213 with sum 0x3D. List the hypotheses in diagnosis order and what distinguishes them.',
        expectedBehavior:
          'Hypotheses: (1) DUT off-by-one in the add (0x3D + 0x0F = 0x4C; DUT produced 0x4B — one low) — check the adder width/carry or a stale operand; (2) model wrong (does the spec say +d or +d-1? unlikely — re-read the B-statement); (3) timing: DUT sampled the PREVIOUS d (0x0E?) — would give 0x4B if prior data was 0x0E: check the drive-vs-sample edge discipline. Distinguishing evidence: the stimulus history (what was d on cycle 213?), a waveform at cycle 214, and re-running with a directed pattern repeating the exact sequence. The log format made all three hypotheses checkable without re-running blind.',
        hints: [
          'Compute the arithmetic: 0x3D + 0x0F = 0x4C exactly.',
          '0x4B is one less: an off-by-one in a carry, or a stale sample.',
          'The message\'s stimulus context is what lets you form hypotheses at all.',
        ],
      },
      {
        title: 'Design the regression suite',
        brief:
          'For the PIT (module 02), list the directed tests with IDs mapped to behaviour statements and corner rows (B1-B12, T3-T9), then state what the random bench sweeps and what coverage question remains after a full pass.',
        expectedBehavior:
          'Directed: T1 reset (B1), T2 basic periodic count (B4-B5), T3 restart-while-running (corner row 2/B2), T4 stop/hold (B3, corner 3), T5 one-shot expiry readback (B7, corner 8), T6 PERIOD=0 (B6, corner 1), T7 tick-vs-W1C coincide (B10, corner 4), T8 PERIOD write while running (B12, corner 5), T9 reset mid-run (B1, corner 6), T10-T12 readback/reserved/W1C-clear (B11, B9). Random: random config/period sequences with the model checking counts and flags each cycle. Remaining coverage question: did the random bench exercise the PERIOD extremes (0, 1, 0xFFFF) and back-to-back W1C timing? — answered by functional coverage counters, not by test count.',
        hints: [
          'Every test cites its B-statement and corner row — traceability is the deliverable.',
          'Random sweeps sequences; directed covers enumerated corners; both needed.',
          '"What did the suite NOT exercise?" is the coverage question — count events, not tests.',
        ],
      },
    ],
    assessment: {
      title: 'Self-checking verification checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt:
            'What is the defining property of a self-checking testbench?',
          options: [
            'It uses no clocks',
            'It decides pass/fail itself via a reference model and checker, printing a verdict',
            'It runs faster than a manual bench',
            'It uses SystemVerilog assertions',
          ],
          answer:
            'It decides pass/fail itself via a reference model and checker, printing a verdict',
          explanation:
            'Stimulus + model + checker + verdict means no human eyeballs required per run — which is what makes regression affordable. Waveform-only benches delegate checking to a glance.',
          hint: 'Who (or what) decides PASS?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt:
            'Why must the reference model be written from the spec rather than from the DUT code?',
          options: [
            'The spec is shorter',
            'A model copied from the DUT shares its bugs, so model/DUT agreement verifies nothing',
            'Simulators require it',
            'The spec has better comments',
          ],
          answer:
            'A model copied from the DUT shares its bugs, so model/DUT agreement verifies nothing',
          explanation:
            'Independence is the mechanism: model and DUT implement the same spec differently, so disagreement is evidence. Shared-source agreement is guaranteed, not informative.',
          hint: 'What would two implementations of the same bug do?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt:
            'Driving testbench stimulus on the same clock edge the DUT samples is safe as long as the delays are small.',
          answer: 'false',
          explanation:
            'Same-edge driving creates simulation races: whether the DUT sees the old or new value depends on event ordering. Drive at the opposite edge (negedge for a posedge DUT) — race-free by construction, and it documents the intended sampling.',
          hint: 'What decides "old or new" in a same-edge drive?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In the accumulator bench, the wrap check drives en=1, d=9 at sum 254 and expects 7. What makes this a valid test of the DUT rather than of the model?',
          answer:
            'The model was written from the spec (8-bit register, modulo wrap per the width policy) independently of the DUT; the check verifies the DUT implements the same spec — if the DUT had a width bug, model and DUT would disagree and the checker would fail',
          explanation:
            'The wrap expectation comes from the spec\'s narrowing policy, not from observed DUT behavior. That independence is what turns the comparison into evidence.',
          hint: 'Where did the expected value 7 come from?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'bug-identification',
          prompt:
            'After fixing a bug found by test T7, an engineer re-runs only T7 (it passes) and moves on. What regression rule was broken and why does it matter?',
          options: [
            'None; the fix is proven by its own test',
            'The full suite must re-run: the fix may have broken distant behavior (shared signals, enables); the suite is the verification unit, not the single test',
            'Only random tests need re-running',
            'T7 should run twice',
          ],
          answer:
            'The full suite must re-run: the fix may have broken distant behavior (shared signals, enables); the suite is the verification unit, not the single test',
          explanation:
            'Changes propagate: a fix in shared logic can invalidate any test. The regression discipline — full suite every change — is what converts the suite from a ritual into the project\'s safety net.',
          hint: 'What else shares the logic the fix touched?',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Self-checking bench', definition: 'Stimulus + reference model + checker + verdict; decides PASS/FAIL with no human per run.' },
      { term: 'Reference model', definition: 'An independent, spec-derived implementation used as the comparison oracle.' },
      { term: 'Directed test', definition: 'A test exercising one enumerated corner or behaviour statement, ID-traced to spec.' },
      { term: 'Regression', definition: 'Re-running the full suite on every change; the suite is the verification unit.' },
      { term: 'Seeded random', definition: 'Random stimulus with a printed, replayable seed — reproducible failures.' },
      { term: 'Coverage hole', definition: 'A spec behaviour or corner no test exercised; found by coverage metrics, not test counts.' },
    ],
    revisionSummary: [
      'Four parts: stimulus (negedge-driven, directed + seeded random), model (spec-written, one-liner for simple specs), checker (every cycle, diagnostic messages), verdict (error count).',
      'Model independence is the mechanism: write it from B-statements, never from DUT structure.',
      'Checker messages: cycle, actual, expected, stimulus context — diagnose from the log.',
      'Traceability: every directed test cites its B-statement/corner row; a passing suite is a spec-coverage claim.',
      'Regression: full suite every change; seeds archived; the suite is the unit.',
      'Coverage thinking: directed covers enumerated corners, random sweeps space, coverage metrics find holes.',
    ],
    furtherReading: [
      {
        label: 'Wikipedia — Testbench',
        url: 'https://en.wikipedia.org/wiki/Testbench',
        kind: 'article',
      },
      {
        label: 'Icarus Verilog documentation (running the benches)',
        url: 'https://steveicarus.github.io/iverilog/',
        kind: 'tool',
      },
    ],
    estimatedMinutes: 55,
  },
];