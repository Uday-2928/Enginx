import type { TutorialLesson } from '../types';

export const module05Lessons: TutorialLesson[] = [
  {
    id: 'cpg-m05-l1',
    title: 'while, do-while and for',
    summary:
      'Own the three loop forms, choose the right one for the job - counted work, condition-driven work, at-least-once work - and write update clauses that terminate exactly when intended.',
    objectives: [
      'Write for, while and do-while loops for the situation each fits best.',
      'Trace a loop by maintaining a table of iteration, variable values and condition.',
      'Place initialization, condition and update correctly in each form.',
      'Predict the total effect of a counted loop without running it.',
    ],
    whyItMatters:
      'Loops are where programs meet time: sampling every millisecond, averaging over a buffer, waiting for a flag. They are also where programs stop meeting time - the off-by-one and the never-terminating condition are the two most common bugs in beginner (and not-so-beginner) C. Firmware inherits a third loop shape: the superloop that runs forever, which this module leads into.',
    prerequisites: ['cpg-m04-l1'],
    explanation:
      'C has three loop forms. They can all express each other; the craft is choosing the one whose *shape matches the problem*, so a reader sees the termination story immediately.\n\n### for: counted work\n\n```\nfor (int i = 0; i < n; i++) { ... }\n```\n\nThe header bundles the three moving parts: **init** (runs once), **condition** (tested before every iteration), **update** (runs after each body). Use it when the iteration count is known or driven by an index: buffers, samples, array walks. Declaring `i` in the header scopes it to the loop - the modern, safe habit.\n\n### while: condition-driven work\n\n```\nwhile ((status & DONE) == 0) { poll(); }\n```\n\nOne condition, tested before each iteration. Use it when the loop count is unknown and the *condition* is the story: waiting for hardware flags, draining a queue, reading until a sentinel. The update happens somewhere in the body, so it is your job to guarantee progress - the classic bug is a body that forgets to change anything the condition reads.\n\n### do-while: at-least-once work\n\n```\ndo { show_menu(); } while (choice != QUIT);\n```\n\nThe condition is tested *after* the body, so the body always runs at least once. That is exactly right for menus, retry prompts and "perform, then ask whether to repeat" flows - and wrong for guard-style checks, where a zero-iteration case must be possible.\n\n### The trace discipline\n\nFor any loop, build a small table: iteration number, the variables the condition reads, the condition value, and what the body changes. Five rows catch almost every off-by-one. This is the same predict-before-run muscle from module 1 - loops are simply where it pays best.',
    deepDive:
      '### The loop invariant: the one-sentence truth\n\nProfessionals describe a loop by its **invariant**: a statement about the variables that is true before every iteration and after the last. For a summation loop `for (i = 0; i < n; i++) total += a[i]`, the invariant is "total holds the sum of a[0..i-1]". The invariant documents what the loop *believes* - and checking it at the boundaries (i = 0: total is the sum of nothing, 0 - correct; after the last iteration i = n: total is the sum of the whole array - correct) proves the loop without running it. This habit scales: a loop whose invariant you cannot state is a loop you do not yet understand, and stating it usually exposes the bug before the first run.\n\n### Why the comma-free header keeps loops honest\n\nThe for header temptingly accepts multiple comma-separated inits and updates: `for (i = 0, j = n - 1; i < j; i++, j--)`. It is legal, occasionally perfect (two-index convergence walks), and a readability hazard in general: the more state lives in the header, the harder termination is to verify. Style guides commonly allow one loop variable and its update in the header, pushing anything else into the body where it can be seen, named and commented. The same reasoning bans modifying the loop variable inside the body - the header then lies about the iteration count.\n\n### Choosing the exit: condition, break, or both\n\nA loop should have exactly one *story* about why it ends. for loops end by exhausting the count; while loops end when the condition clears. When a second exit (error bailout, found-it-early) is needed, `break` is legitimate - but the more exits a loop has, the harder it is to prove what the variables hold afterwards. Firmware style leans on a primary condition plus a timeout variable folded into the same condition: `while (!done && timeout-- > 0)`, so every exit path is visible in one line. Lesson 3 of this module builds exactly that pattern.',
    examples: [
      {
        title: 'A counted accumulation loop',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int total = 0;\n    for (int sample = 1; sample <= 5; sample++) {\n        total += sample * 10;\n        printf("sample %d: total=%d\\n", sample, total);\n    }\n    return 0;\n}',
        explanation: [
          'Init `sample = 1` runs once. The condition `sample <= 5` is tested before each body; the update `sample++` runs after it.',
          'Iterations: sample 1 adds 10 (total 10), 2 adds 20 (30), 3 adds 30 (60), 4 adds 40 (100), 5 adds 50 (150).',
          'When sample becomes 6, the condition fails and the loop ends - the body ran exactly five times, matching the count 1..5.',
          'The printf inside the body makes the loop observable: every intermediate total is printed, which is exactly what your trace table predicted.',
          'Output:\n```\nsample 1: total=10\nsample 2: total=30\nsample 3: total=60\nsample 4: total=100\nsample 5: total=150\n```',
        ],
      },
      {
        title: 'do-while for an at-least-once menu',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int choice;\n\n    do {\n        printf("menu: 1=count 2=quit\\n");\n        /* Simulated user input - a real program would read here. */\n        choice = 2;\n    } while (choice != 2);\n\n    printf("bye\\n");\n    return 0;\n}',
        explanation: [
          'The body runs first: the menu prints, then choice is set. Only then is the condition checked.',
          'Because choice = 2, the condition `choice != 2` is false and the loop ends after exactly one pass - the at-least-once guarantee in action.',
          'A while loop would test before showing the menu, which is wrong for menus: the user must see the options before choosing.',
          'Output:\n```\nmenu: 1=count 2=quit\nbye\n```',
        ],
      },
      {
        title: 'while: the same work, condition-driven',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int remaining = 40;      /* simulated energy budget in mWh */\n    int packets = 0;\n\n    while (remaining >= 10) {\n        remaining -= 10;     /* one packet costs 10 mWh */\n        packets++;\n    }\n\n    printf("packets=%d remaining=%d\\n", packets, remaining);\n    return 0;\n}',
        explanation: [
          'The condition reads the resource; the body consumes it. The count is not known upfront - the budget decides, which is the while story.',
          'Trace: remaining goes 40, 30, 20, 10, then 0 - four decrements, four packets. The next test sees 0 < 10 and stops.',
          'Progress is guaranteed because the body always subtracts 10. Delete that line mentally and you have an infinite loop - the condition would never change.',
          'Output: `packets=4 remaining=0`',
        ],
      },
    ],
    tables: [
      {
        caption: 'Choosing the loop form',
        headers: ['Form', 'Condition checked', 'Fits', 'Typical firmware use'],
        rows: [
          ['for', 'before each iteration', 'known or index-driven count', 'sample buffers, array walks, retry counts'],
          ['while', 'before each iteration', 'unknown count, maybe zero iterations', 'wait-for-flag, drain-queue, sentinel reads'],
          ['do-while', 'after each iteration', 'body must run at least once', 'menus, retry prompts, one-shot poll sequences'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Off-by-one boundaries: `for (int i = 0; i <= n; i++)` for an n-element array.',
        fix:
          'Indexing runs 0..n-1, so the condition is `i < n`. The `<=` form touches a[n] - out of bounds. Trace the last iteration explicitly: which index does the final pass use?',
      },
      {
        mistake: 'A while loop whose body never changes what the condition reads.',
        fix:
          'The condition re-tests the same unchanging values forever - a hang. Every while body must make progress: consume, count down, advance a pointer, or set the flag the condition waits for.',
      },
      {
        mistake: 'A stray semicolon emptying a loop: `for (int i = 0; i < n; i++);` followed by a brace block.',
        fix:
          'The semicolon is an empty body; the loop spins n times doing nothing, then the "body" runs once. Compilers warn under -Wempty-body/-Wall. The habit: write braces immediately, never a bare semicolon after a loop header.',
      },
      {
        mistake: 'Declaring the loop counter outside, then reusing it accidentally: `for (i = ...)` over a stale `i`.',
        fix:
          'Prefer `for (int i = 0; ...)` so the counter is scoped to the loop and cannot leak in or out. When a C89 toolchain forbids it, reset the counter explicitly at the top of every loop.',
      },
    ],
    guidedPractice: {
      title: 'Trace a sampling loop, then write its invariant',
      brief:
        'Predict the printed output of this loop by building a trace table (iteration, i, total, condition) - then run it and compare. Finish by writing the loop invariant in one sentence.\n\n```\nint total = 0;\nfor (int i = 2; i <= 8; i += 2) {\n    total += i;\n    printf("i=%d total=%d\\n", i, total);\n}\n```',
      starterCode:
          '#include <stdio.h>\n\nint main(void) {\n    int total = 0;\n    for (int i = 2; i <= 8; i += 2) {\n        total += i;\n        printf("i=%d total=%d\\n", i, total);\n    }\n    return 0;\n}',
      expectedBehavior:
        'Rows: i=2 total=2; i=4 total=6; i=6 total=12; i=8 total=20. After i=8, i becomes 10, the condition fails. Invariant: "total holds the sum of even values from 2 through i". Four iterations, final total 20.',
      hints: [
        'The update clause is i += 2, so the visited values are 2, 4, 6, 8 - four iterations, not eight.',
        'Add each visited value to the running total in your table before checking the code.',
        'The invariant must be true both before the first iteration (empty sum: total = 0) and after the last.',
      ],
    },
    practiceExercises: [
      {
        title: 'Three forms, one behavior',
        brief:
          'Print the countdown 5, 4, 3, 2, 1, then "liftoff" three times: once with for, once with while, once with do-while. All three versions must produce identical output.',
        expectedBehavior:
          'for: `for (int i = 5; i > 0; i--)`. while: initialize i = 5, test i > 0, decrement in the body. do-while: body prints and decrements, condition `i > 0` tested after - which still works because the first value printed (5) satisfies the post-test. All print 5 4 3 2 1 liftoff (one per line).',
        hints: [
          'The for header carries everything; the while spreads init, test, update across three lines.',
          'For do-while, note the body runs before the first test - with i starting at 5 that is harmless here.',
          'Identical output is the acceptance test - diff the two runs if in doubt.',
        ],
      },
      {
        title: 'Break a loop on purpose, then fix it',
        brief:
          'Write a while loop that is missing its update (an infinite loop), predict what happens, and - WITHOUT running it - list the two things you would check in any loop you inherit: what the condition reads, and where that thing changes. Then restore the update and verify the loop terminates.',
        expectedBehavior:
          'The condition reads a variable the body never modifies, so the loop spins forever. The two-point checklist: (1) enumerate every variable the condition reads; (2) confirm the body changes at least one of them toward termination on every path. Restoring the update (e.g. a decrement or a flag set) terminates the loop.',
        hints: [
          'Never actually run the broken version - close the program from your keyboard/IDE if you do.',
          'Progress can hide in a function call: a body that "polls" must eventually change the polled flag.',
          'This checklist is the single most transferable loop-debugging skill in the course.',
        ],
      },
    ],
    assessment: {
      title: 'Loop forms checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    int total = 0;\n    for (int i = 1; i <= 4; i++) {\n        total += i;\n    }\n    printf("total=%d\\n", total);\n    return 0;\n}',
          options: ['total=4', 'total=10', 'total=6', 'total=24'],
          answer: 'total=10',
          explanation:
            'The loop visits i = 1, 2, 3, 4 and accumulates them: 1 + 2 + 3 + 4 = 10. The condition i <= 4 admits exactly those four values.',
          hint: 'Trace the four iterations and accumulate.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which loop form guarantees its body runs at least once?',
          options: ['for', 'while', 'do-while', 'All three'],
          answer: 'do-while',
          explanation:
            'do-while tests the condition after the body, so one pass is unconditional. for and while test first and can run zero iterations.',
          hint: 'Which form puts the test after the braces?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In `for (int i = 0; i < n; i++)`, the update expression i++ runs before the body on each iteration.',
          answer: 'false',
          explanation:
            'The order is: init, test, body, update, test, body, update... The update runs after each body pass and before the next test.',
          hint: 'Say the sequence out loud: test, body, update, test, body...',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'This loop never ends. Name the defect and the minimal fix.\n\n```\nint retries = 3;\nwhile (retries > 0) {\n    attempt_connect();\n}\n```',
          answer: 'The body never changes retries, so the condition is permanently true - fix by decrementing in the body (retries--) or folding the decrement into the condition (while (retries-- > 0))',
          explanation:
            'A while loop terminates only if its body moves the state the condition reads. With no update, attempt_connect() runs forever - on hardware, that is a hang the watchdog would eventually punish.',
          hint: 'What does the condition read, and does the body touch it?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'A task must show a configuration menu at least once and repeat until the user confirms. Which loop form fits, and why not the alternatives?',
          answer: 'do-while - the body (show menu, read choice) must run before there is anything to test; a while or for would test first and could skip the menu entirely',
          explanation:
            'Post-test loops express "perform, then decide whether to repeat". Menus, retry prompts and one-shot sequences all share that shape.',
          hint: 'When is there no meaningful condition to test before the first pass?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'for loop', definition: 'Counted loop with init, condition and update in one header; the condition is tested before each body.' },
      { term: 'while loop', definition: 'Pre-test loop for condition-driven repetition; may run zero times.' },
      { term: 'do-while loop', definition: 'Post-test loop whose body always executes at least once.' },
      { term: 'Loop invariant', definition: 'A one-sentence statement about the loop variables that is true before every iteration and after termination.' },
      { term: 'Iteration', definition: 'One execution of the loop body.' },
      { term: 'Off-by-one', definition: 'A boundary error where a loop runs one iteration too many or too few, typically from <= versus <.' },
    ],
    revisionSummary: [
      'for = counted work, while = condition-driven work, do-while = at-least-once work.',
      'Execution order for for/while: test before body; do-while tests after - exactly one body run is guaranteed.',
      'Every loop body must change something the condition reads, or the loop hangs.',
      'Trace loops with a table: iteration, condition inputs, condition, body effects.',
      'State the loop invariant in one sentence before trusting a loop.',
      'Declare counters in the for header to scope them; avoid editing them in the body.',
    ],
    furtherReading: [
      { label: 'cppreference - while loop', url: 'https://en.cppreference.com/w/c/language/while', kind: 'docs' },
      { label: 'cppreference - do-while loop', url: 'https://en.cppreference.com/w/c/language/do', kind: 'docs' },
      { label: 'cppreference - for loop', url: 'https://en.cppreference.com/w/c/language/for', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'cpg-m05-l2',
    title: 'break, continue and Loop Termination',
    summary:
      'Exit early with break, skip forward with continue, and learn the termination traps - unsigned countdowns, float counters and nested-loop exits - that turn useful loops into hangs.',
    objectives: [
      'Use break to exit the innermost loop and continue to skip to the next iteration.',
      'Explain why an unsigned countdown with >= 0 never terminates.',
      'Design loops whose termination condition is reachable on every path.',
      'Trace nested loops and predict exactly which loop break and continue affect.',
    ],
    whyItMatters:
      'Search loops (find the first fault), filter loops (sum the valid samples) and cleanup loops all rely on break and continue - and the same lesson holds the most infamous hang in C: counting down through zero with an unsigned type. On a microcontroller a hang is not an error message; it is a dead product and a field recall. Termination analysis is a safety skill.',
    prerequisites: ['cpg-m05-l1'],
    explanation:
      '### break: leave this loop now\n\n`break` terminates the **innermost** enclosing loop (or switch) immediately; execution resumes after the loop. It is the natural tool for search loops - keep scanning until the target appears, then stop:\n\n```\nfor (int i = 0; i < n; i++) {\n    if (data[i] == 0) { first_zero = i; break; }\n}\n```\n\nIn nested loops, break exits only the level it sits in - the outer loop keeps iterating. Escaping two levels needs a flag, a function return, or a restructured condition.\n\n### continue: skip to the next iteration\n\n`continue` abandons the rest of the current body pass and jumps to the loop\'s next step - the update clause in a for, the condition re-test in a while. It is the filter idiom: handle the exceptions up top, let the main logic flow unindented:\n\n```\nfor (int i = 0; i < n; i++) {\n    if (data[i] == 0) { continue; }   /* skip invalid */\n    total += data[i];\n}\n```\n\nBoth statements make loops read as intent ("find", "filter") instead of flag-juggling. The cost is a second exit path - so a loop with break should still have a primary, reachable condition, and the post-loop code must make sense for both exits (a sentinel like first_zero = -1 handles "never found").\n\n### Termination: prove progress on every path\n\nA loop terminates when its condition can become false. Three classic ways to break that promise:\n\n- **The unsigned zero wrap**: `for (unsigned i = 10; i >= 0; i--)` never ends - an unsigned value cannot be negative, so at i = 0 the decrement wraps to the maximum value (4294967295 for 32 bits) and the "countdown" restarts from the top.\n- **The floating-point counter**: `for (float x = 0.0f; x != 1.0f; x += 0.1f)` - 0.1 is not exact in binary (module 2), the accumulated sum lands beside 1.0, and the equality never fires. Count with integers.\n- **The forgotten update**: covered in the previous lesson - the condition reads something the body never changes.',
    deepDive:
      '### The unsigned countdown, bit by bit\n\nWatch `unsigned i = 0; i--` on a 32-bit platform: the value 0 is 0x00000000; decrementing wraps modulo 2^32 (module 2) to 0xFFFFFFFF = 4294967295. A condition `i >= 0` is therefore true forever - the loop is an infinite one whose counter climbs from the top of the range. This bug pattern appears whenever a loop walks backwards over unsigned sizes (loop indices, size_t buffer lengths, timer counts). The professional forms: count a separate number of iterations down (`for (unsigned k = n; k > 0; k--)` with index n - k), use the while idiom `while (i-- > 0)` (tests 0 then wraps - the test happens before the wrap matters), or walk forward. Know the wrap; recognize it in review.\n\n### Sentinel values and post-loop reasoning\n\nA loop that may exit via break leaves a question: did the target appear? The answer needs a variable set on the success path and initialized to a "no" sentinel before the loop (-1 for an index, 0 for a pointer-of-interest later). After the loop, one if distinguishes found from not-found. This tiny pattern - sentinel, search with break, branch on sentinel - is the backbone of parsing, scanning and error-lookup code in every firmware codebase, and it generalizes: the standard library\'s own strchr returns NULL as its sentinel.\n\n### break inside switch inside loop\n\nBecause break also ends a switch, a switch nested in a loop needs care: a break inside the switch exits only the switch, not the loop. The common pattern is deliberate - a command dispatcher inside a superloop uses break per case and lets the loop iterate - but when the *loop* must stop on a case, that case needs its own break after the switch, or a flag the loop condition reads. Miscounting which construct a break belongs to is a classic review catch; when in doubt, count braces.',
    examples: [
      {
        title: 'Find with break, filter with continue',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int readings[6] = {31, 30, 0, 29, 30, 28};\n\n    /* Search: stop at the first zero reading. */\n    int first_zero = -1;                       /* sentinel: not found */\n    for (int i = 0; i < 6; i++) {\n        if (readings[i] == 0) {\n            first_zero = i;\n            break;\n        }\n    }\n\n    /* Filter: accumulate only the valid samples. */\n    int valid_total = 0;\n    for (int i = 0; i < 6; i++) {\n        if (readings[i] == 0) {\n            continue;\n        }\n        valid_total += readings[i];\n    }\n\n    printf("first_zero = %d\\n", first_zero);\n    printf("valid_total = %d\\n", valid_total);\n    return 0;\n}',
        explanation: [
          'The search loop scans 31 (i=0), 30 (i=1), then hits 0 at i=2: it records the index and breaks - indices 3..5 are never examined. That early exit is the point of break.',
          'The sentinel -1 is set before the loop; if no zero existed, the post-loop check would see -1 and the caller would know the search failed.',
          'The filter loop meets 0 at i=2 and continues - skipping only that pass - then accumulates 29, 30, 28 on top of 31 and 30: 31 + 30 + 29 + 30 + 28 = 148.',
          'Output:\n```\nfirst_zero = 2\nvalid_total = 148\n```',
        ],
      },
      {
        title: 'The unsigned countdown hang (understand it - never ship it)',
        language: 'c',
        code:
          '/* DO NOT RUN - this loop never terminates.\n   It is shown as a static analysis exercise.      */\n#include <stdio.h>\n\nint main(void) {\n    /* unsigned countdown: broken */\n    for (unsigned i = 10; i >= 0; i--) {\n        /* i >= 0 is ALWAYS true for unsigned i:\n           at i == 0 the decrement wraps to 4294967295\n           on a 32-bit unsigned int.                  */\n    }\n\n    /* fixed: count iterations, not the index */\n    for (unsigned k = 10; k > 0; k--) {\n        unsigned i = k - 1u;   /* 9, 8, ... 0 */\n        printf("visit %u\\n", i);\n    }\n    return 0;\n}',
        explanation: [
          'The broken loop tests `i >= 0`, which is a tautology for unsigned types - the type cannot hold a negative, so the condition is always satisfied. (With -Wall, GCC may warn that the comparison is always true.)',
          'The failure point is i == 0: the decrement wraps to 4294967295 (module 2\'s modulo arithmetic), and the countdown restarts from the top of the range.',
          'The fix counts k from 10 down to 1 (k > 0 is a meaningful test) and derives each index as k - 1, visiting 9 down to 0 exactly once each.',
          'The program as a whole is shown to be read and reasoned about; the fixed half would print visit 9 through visit 0. The broken half must be commented out before any run.',
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Counting down to zero with `i >= 0` on an unsigned variable.',
        fix:
          'The condition can never be false - unsigned cannot go below 0, and the decrement wraps at zero. Use `i > 0` with a k-1 index, `while (i-- > 0)`, or a signed counter type.',
      },
      {
        mistake: 'Using a float loop counter with an equality condition.',
        fix:
          'Accumulated rounding (module 2) makes the equality unreliable - the counter can step over the target instead of onto it. Count integers and derive the float value inside the body: `float x = i * 0.1f;`.',
      },
      {
        mistake: 'Expecting break inside an inner loop to exit the outer loop too.',
        fix:
          'break leaves only the innermost loop (or switch). To leave two levels, set a flag the outer condition reads, return from a function, or restructure into one loop.',
      },
      {
        mistake: 'Forgetting the sentinel: reading first_zero after a search loop with no "not found" convention.',
        fix:
          'Initialize the result to an impossible real value (-1 for an index) before the loop and branch on it afterwards. Without a sentinel, the variable holds garbage from the last iteration - or nothing at all if the loop never ran.',
      },
    ],
    guidedPractice: {
      title: 'Design a timeout-bounded wait',
      brief:
        'Write a loop that waits for a simulated DONE flag (bit 0 of a byte) for at most 1000 iterations. Use a while with the flag test and a countdown folded into the condition. Print WAITED or TIMEOUT according to the outcome, and trace the last three iterations for the case where the flag arrives at iteration 998.',
      starterCode:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational simulation: an ordinary variable plays\n   the role of a hardware status register. */\nint main(void) {\n    uint8_t status = 0x00;\n    const uint8_t DONE = (uint8_t)(1u << 0);\n\n    int timeout = 1000;\n    int iters = 0;\n\n    /* Simulate the flag arriving on iteration 998. */\n    while (((status & DONE) == 0) && (timeout > 0)) {\n        iters++;\n        if (iters == 998) {\n            status |= DONE;\n        }\n        timeout--;\n    }\n\n    if ((status & DONE) != 0) {\n        printf("WAITED after %d iterations\\n", iters);\n    } else {\n        printf("TIMEOUT after %d iterations\\n", iters);\n    }\n    return 0;\n}',
      expectedBehavior:
        'Iterations 1..997 leave the flag clear; at iteration 998 the body sets DONE; the condition then re-tests, sees the flag, and exits. Output: `WAITED after 998 iterations`. The last three condition evaluations: (clear, timeout 3), (clear, timeout 2) then body sets flag, (set -> exit). Had the flag never come, the loop would exit at timeout 0 after exactly 1000 iterations and print TIMEOUT.',
      hints: [
        'Both exit causes live in one condition: flag set, or budget spent.',
        'After the loop, decide the outcome by re-testing the flag - not by counting.',
        'Check the boundary: what does the loop print if the flag arrives exactly at iteration 1000?',
      ],
    },
    practiceExercises: [
      {
        title: 'Two-level search with a flag',
        brief:
          'A 3x3 grid of ints contains exactly one zero. Find its row and column using nested for loops and a `found` flag: the flag must stop BOTH loops. Print `zero at row R col C`, or `not found` if the grid had no zero (test both cases by changing the grid).',
        expectedBehavior:
          'Structure: outer loop over rows, inner over columns; on finding 0, set found = 1, record row/col, break (inner); the outer loop tests `if (found) { break; }` at its top or bottom. For a grid with the zero at row 1 col 2, output `zero at row 1 col 2`. With no zero, output `not found` - which is why found must start at 0 and be the single authority on the outcome.',
        hints: [
          'The inner break alone would move on to scanning the next row - the outer condition needs the flag.',
          'Initialize found = 0, row = -1, col = -1 before the loops so the not-found path is well-defined.',
          'A cleaner alternative at scale: put the search in a function and return early - preview of module 6.',
        ],
      },
      {
        title: 'Sentinel search on a character buffer',
        brief:
          'Given `char cmd[8] = "SET 5";`, find the index of the first space using a loop with break. Then find the index of the terminator \'\\0\' the same way. Print both indices and explain in one comment what the second index equals (strlen).\n',
        expectedBehavior:
          'The first space sits at index 3 (S, E, T, then space); the terminator sits at index 5. The second loop demonstrates that scanning for \'\\0\' is exactly how strlen works - it counts characters until the sentinel byte.',
        hints: [
          '"SET 5" is S(0) E(1) T(2) space(3) 5(4) \\0(5).',
          'The terminator is a real character you can compare: `if (cmd[i] == \'\\0\')`.',
          'This exercise previews module 7: C strings are arrays with a sentinel, and string length is a search.',
        ],
      },
    ],
    assessment: {
      title: 'break, continue and termination checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    int data[5] = {7, 0, 9, 0, 2};\n    int found = -1;\n    for (int i = 0; i < 5; i++) {\n        if (data[i] == 0) {\n            found = i;\n            break;\n        }\n    }\n    printf("found=%d\\n", found);\n    return 0;\n}',
          options: ['found=1', 'found=3', 'found=-1', 'found=0'],
          answer: 'found=1',
          explanation:
            'The first zero sits at index 1; break stops the scan there, so the later zero at index 3 is never seen. First-match search is break\'s core use.',
          hint: 'break stops at the first match - which index is that?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Why does `for (unsigned i = 10; i >= 0; i--)` never terminate?',
          options: [
            'Because unsigned arithmetic is slower',
            'Because i >= 0 is always true for unsigned i, and the decrement wraps 0 to the maximum value',
            'Because unsigned variables cannot be compared',
            'Because the loop lacks an update clause',
          ],
          answer: 'Because i >= 0 is always true for unsigned i, and the decrement wraps 0 to the maximum value',
          explanation:
            'An unsigned value is never negative, so the condition is a tautology; at i = 0 the decrement wraps modulo 2^32 to 4294967295, restarting the countdown. Count iterations with i > 0 instead.',
          hint: 'Can any unsigned value fail a >= 0 test?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Inside a switch that is nested within a for loop, `break` exits the for loop.',
          answer: 'false',
          explanation:
            'break binds to the innermost loop OR switch. Inside the switch, it exits only the switch; stopping the loop as well needs another break outside the switch or a flag in the loop condition.',
          hint: 'Count the constructs between the break and the loop.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'This filter loop is meant to sum the nonzero samples but prints 0. Find the bug.\n\n```\nint total = 0;\nfor (int i = 0; i < 4; i++) {\n    if (samples[i] != 0) {\n        continue;\n    }\n    total += samples[i];\n}\n```',
          answer: 'The condition is inverted - continue skips the NONZERO samples and only zeros reach the sum - change the test to if (samples[i] == 0) { continue; }',
          explanation:
            'continue skips exactly the cases the if catches, so the accumulator only ever adds zeros. Filter conditions deserve a trace with one valid and one invalid sample before shipping.',
          hint: 'Which samples reach total += with this condition?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'After a search loop with break, how does the code know whether the search succeeded? Describe the pattern in one or two sentences.',
          answer: 'A sentinel variable is initialized to a not-found value (like -1) before the loop and assigned the match position on the success path; after the loop, one branch on the sentinel distinguishes found from not-found',
          explanation:
            'The sentinel gives both exit paths (exhausted condition, break) a well-defined outcome. The same idea appears throughout the standard library - strchr returning NULL is the canonical example.',
          hint: 'What does the variable hold if the loop never found anything?',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'break', definition: 'Exits the innermost enclosing loop or switch immediately.' },
      { term: 'continue', definition: 'Skips the rest of the current iteration and proceeds to the loop\'s next step (update or condition).' },
      { term: 'Sentinel', definition: 'A pre-set "not found" value that makes a search loop\'s outcome unambiguous after either exit path.' },
      { term: 'Timeout', definition: 'A maximum-iteration countdown folded into a wait condition, guaranteeing termination even if the awaited event never comes.' },
      { term: 'Wrap-around hang', definition: 'The infinite loop produced by counting an unsigned variable below zero - the decrement wraps to the type maximum.' },
      { term: 'Nested loop', definition: 'A loop inside another; break and continue act on the innermost level only.' },
    ],
    revisionSummary: [
      'break exits the innermost loop or switch; continue skips to the next iteration step.',
      'Search loops: sentinel before, break on match, branch on the sentinel after.',
      'Filter loops: continue past invalid entries, accumulate the rest unindented.',
      'Never count an unsigned variable to zero with >= 0 - it wraps and loops forever.',
      'Never count floats toward an equality test - rounding lands beside the target.',
      'Fold timeouts into wait conditions so every wait provably terminates.',
    ],
    furtherReading: [
      { label: 'cppreference - break statement', url: 'https://en.cppreference.com/w/c/language/break', kind: 'docs' },
      { label: 'cppreference - continue statement', url: 'https://en.cppreference.com/w/c/language/continue', kind: 'docs' },
      { label: 'Wikipedia - Infinite loop', url: 'https://en.wikipedia.org/wiki/Infinite_loop', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'cpg-m05-l3',
    title: 'Polling Loops and the Shape of Firmware',
    summary:
      'Study the superloop-plus-poll structure that organizes almost all embedded software, implement a bounded poll of a simulated status flag, and understand why busy-waiting costs power and latency.',
    objectives: [
      'Describe the init-plus-superloop structure of bare-metal firmware.',
      'Write a bounded polling loop against a simulated status register with named bit masks.',
      'Explain the costs of busy-waiting (CPU, power, latency) and name the alternatives.',
      'Keep host simulations honest: no hardware claims, clear comments about what is simulated.',
    ],
    whyItMatters:
      'This lesson is the bridge to embedded systems. The loop you write here - check flag, handle event, repeat - is structurally identical to the main loop of a thermostat, a keyboard scanner, or a satellite bus controller. Understanding why polling burns power, and what replaces it (interrupts, sleep states), is exactly the knowledge that separates firmware engineers from application programmers.',
    prerequisites: ['cpg-m05-l1', 'cpg-m03-l4'],
    explanation:
      '### The superloop: firmware\'s main() shape\n\nBare-metal programs have no operating system to return to, so main never ends:\n\n```\nint main(void) {\n    init_clock();\n    init_peripherals();\n\n    for (;;) {                 /* superloop: runs forever */\n        read_inputs();\n        update_state();\n        drive_outputs();\n    }\n}\n```\n\nEverything the product does happens inside that loop, once per revolution. The loop period defines the product\'s responsiveness; code that blocks inside the loop (a long wait, a slow calculation) makes the whole device sluggish. On a host you cannot run forever without annoying the user - so course simulations run a bounded number of loop passes and say so in a comment.\n\n### Polling: asking, repeatedly\n\n**Polling** means checking a status flag in a loop until hardware reports readiness: is the ADC done? Is a byte received? The check is usually `while ((status & FLAG) == 0) { }` - a **busy-wait**, because the CPU spins at full speed doing nothing but re-reading. Three costs follow:\n\n- **Power**: the core burns maximum current while accomplishing nothing - fatal for battery devices.\n- **Latency for other work**: the spin monopolizes the CPU; nothing else runs until the flag arrives.\n- **Hang risk**: if the hardware never sets the flag (a disconnected sensor), the loop waits forever. Hence the bounded poll: a timeout counter folded into the condition, so the wait provably ends.\n\nThe alternatives - interrupts (hardware jumps to your handler on the event) and sleep states (the CPU halts until woken) - are the subject of a dedicated embedded course. What you take from here is the *why*: every wait loop you write on real hardware should either be provably short, bounded by a timeout, or replaced by an interrupt-driven design.',
    deepDive:
      '### volatile: the keyword the simulation hides\n\nThere is one more difference between simulating a flag and reading a real one. A compiler watching `while ((status & FLAG) == 0) {}` may reason: "status is never written in this loop, so the condition cannot change - the loop is pointless" and delete the loop entirely. Real hardware changes the register behind the compiler\'s back, and the C keyword that says so is `volatile`: it forbids the compiler from caching reads or reordering accesses around it. Every memory-mapped register declaration in embedded code is volatile-qualified. The host simulation in this lesson needs no volatile (the variable genuinely does change inside the loop), but you should already know why the real declaration looks like `volatile uint32_t *const STATUS_REG = ...`. The embedded course builds the full picture; here, remember the hazard: optimization can erase loops that watch hardware.\n\n### Bounded polling as a design pattern\n\nThe bounded poll (condition + timeout, then branch on which exit fired) is worth internalizing as a *pattern*, not a snippet: (1) compute the timeout budget from the datasheet\'s worst-case conversion time, with margin; (2) loop on `flag-not-set && budget-not-spent`; (3) after the loop, test the flag to decide success or timeout - never infer from the counter alone; (4) on timeout, take a defined action (return an error code, latch a fault flag, retry with backoff). Products have been recalled because a sensor stall hung the main loop; the four-step pattern turns that hang into a logged, recoverable event. You will reuse it verbatim in the course projects.\n\n### Where the time goes: sampling rate and loop budget\n\nA superloop that must respond within 10 ms cannot contain any step longer than 10 ms - including waits. Budgeting therefore means measuring each step\'s worst case: a 5 ms ADC wait plus a 3 ms transmission leaves 2 ms of slack, and one new feature can blow the budget. Firmware teams track these numbers in comments and review them like memory usage. The skill starts here, on the host: notice that your simulation\'s loop has a per-iteration cost, and ask what happens to a product when the loop body doubles.',
    examples: [
      {
        title: 'A bounded poll of a simulated ADC flag',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational simulation: an ordinary variable plays\n   the role of a hardware status register. This program\n   runs on a host and touches no hardware of any kind. */\nint main(void) {\n    uint8_t adc_status = 0x00;      /* simulated status register  */\n    const uint8_t DONE = (uint8_t)(1u << 0);\n\n    int timeout = 1000;             /* maximum polls, with margin */\n    int polls = 0;\n\n    /* Simulate the conversion finishing after 3 polls.\n       Real hardware would set this bit on its own.       */\n    int fake_conversion_done_at = 3;\n\n    while (((adc_status & DONE) == 0) && (timeout > 0)) {\n        polls++;\n        if (polls == fake_conversion_done_at) {\n            adc_status |= DONE;     /* hardware sets DONE (simulated) */\n        }\n        timeout--;\n    }\n\n    if ((adc_status & DONE) != 0) {\n        uint8_t result = 173;       /* pretend data register holds 173 */\n        printf("done after %d polls, result=%u\\n", polls, (unsigned)result);\n    } else {\n        printf("timeout after %d polls\\n", polls);\n    }\n    return 0;\n}',
        explanation: [
          'The condition encodes both exits: flag-not-set AND budget-left. Either one ending the loop is correct.',
          'Iteration 1: polls=1, flag still clear, timeout drops to 999. Iteration 2: same. Iteration 3: the simulated hardware sets DONE, timeout drops to 997.',
          'The condition re-tests: DONE is set, so the loop exits after exactly 3 polls - the branch on the flag (not on the counter) decides success.',
          'The comment labels the simulation twice: the register is a variable, and the "hardware" write is a line of C. Honesty about simulation is a course rule and a good engineering habit.',
          'Output: `done after 3 polls, result=173`',
        ],
      },
      {
        title: 'A superloop skeleton, host edition',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Host-runnable simulation of the firmware superloop\n   structure. On real hardware this loop never ends; here\n   it runs a fixed number of passes so the demo exits.  */\nint main(void) {\n    uint8_t flags = 0x00;\n    const uint8_t TICK = (uint8_t)(1u << 0);\n    const uint8_t ALARM = (uint8_t)(1u << 1);\n\n    const int PASSES = 5;\n    for (int pass = 1; pass <= PASSES; pass++) {\n        /* 1. read inputs (simulated: set TICK every 2nd pass)  */\n        if (pass % 2 == 0) {\n            flags |= TICK;\n        }\n\n        /* 2. update state */\n        if ((flags & TICK) != 0) {\n            flags &= (uint8_t)~TICK;      /* consume the event  */\n            flags ^= ALARM;               /* toggle on each tick */\n        }\n\n        /* 3. drive outputs (simulated: report)                 */\n        printf("pass %d: flags=0x%02X alarm=%d\\n",\n               pass, (unsigned)flags, (flags & ALARM) != 0);\n    }\n    return 0;\n}',
        explanation: [
          'The three-phase body - read, update, output - is the superloop template; on hardware each phase talks to peripherals instead of variables.',
          'TICK is set on passes 2 and 4, consumed (cleared) inside the update phase - event flags in firmware are typically consumed this way so one event triggers one response.',
          'ALARM toggles on each consumed tick: pass 2 turns it on, pass 4 turns it off. The printed value always reflects the state AFTER the update phase, so pass 2 shows 0x02 and pass 4 shows 0x00 again.',
          'Output:\n```\npass 1: flags=0x00 alarm=0\npass 2: flags=0x02 alarm=1\npass 3: flags=0x00 alarm=0\npass 4: flags=0x00 alarm=0\npass 5: flags=0x00 alarm=0\n```',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Superloop with bounded poll',
        content:
          '        +-----------------------------+\n        |           init              |\n        |  clock, pins, peripherals   |\n        +--------------+--------------+\n                       |\n                       v\n        +-----------------------------+\n   +--->|        superloop            |\n   |    |  1. read inputs             |\n   |    |  2. update state            |\n   |    |  3. drive outputs           |\n   |    +--------------+--------------+\n   |                   |\n   +-------------------+  (forever on hardware)\n\n   inside a step that needs hardware:\n        +-----------------------------+\n        | poll: while(!FLAG && t>0)   |<-- bounded wait\n        |   t--                       |\n        +--------------+--------------+\n                |           |\n            FLAG set     timeout\n                |           |\n                v           v\n          use result    handle fault',
        caption:
          'The firmware program shape: init once, loop forever. Waits inside the loop must be bounded - the timeout arm converts a hang into a handled fault.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Polling without a timeout: `while ((status & DONE) == 0) { }` against hardware that may never respond.',
        fix:
          'Fold a countdown into the condition (`&& timeout-- > 0`) and branch on the flag after the loop to distinguish success from timeout. A disconnected sensor then produces a handled error instead of a dead product.',
      },
      {
        mistake: 'Deciding success by checking the timeout counter instead of the flag.',
        fix:
          'After a bounded poll, re-test the flag itself. The counter tells you the loop ended; only the flag tells you why. Counter-based decisions break the moment a flag arrives exactly as the budget expires.',
      },
      {
        mistake: 'Putting a long blocking wait inside the superloop and wondering why button presses feel late.',
        fix:
          'Every millisecond of blocking delays every other superloop duty. Split long waits into per-pass state steps (a state machine - module 9), or move to interrupt-driven design in the embedded course.',
      },
      {
        mistake: 'Writing a simulation that claims to touch hardware, like printing "reading sensor from SPI bus".',
        fix:
          'Simulations model; they do not claim. Comment every simulated register as simulated, and phrase prose as "models the sequence a driver would follow". The habit keeps host code honest and portable to real targets later.',
      },
    ],
    guidedPractice: {
      title: 'Bounded poll with a timeout arm',
      brief:
        'Modify the worked example so the simulated conversion never completes (delete the line that sets DONE). Predict the output, then verify: which branch runs, after how many polls, and what the timeout variable ends at.',
      starterCode:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational simulation - no hardware involved. */\nint main(void) {\n    uint8_t adc_status = 0x00;\n    const uint8_t DONE = (uint8_t)(1u << 0);\n\n    int timeout = 1000;\n    int polls = 0;\n\n    while (((adc_status & DONE) == 0) && (timeout > 0)) {\n        polls++;\n        timeout--;      /* the flag is never set: timeout path */\n    }\n\n    if ((adc_status & DONE) != 0) {\n        printf("done after %d polls\\n", polls);\n    } else {\n        printf("timeout after %d polls\\n", polls);\n    }\n    return 0;\n}',
      expectedBehavior:
        'The loop runs until timeout reaches 0: exactly 1000 iterations, then the condition fails on the budget arm. The flag test after the loop sees DONE clear, so the timeout branch runs: `timeout after 1000 polls`. The timeout variable ends at 0.',
      hints: [
        'Both condition arms can end the loop - here only the budget one ever fires.',
        'The after-loop decision reads the flag, not the counter - that is what sends control to the timeout branch.',
        'This is the four-step bounded-poll pattern from the deep dive: budget, loop, decide by flag, act.',
      ],
    },
    practiceExercises: [
      {
        title: 'Two-flag startup handshake',
        brief:
          'Simulate a device that must report both POWER_OK (bit 0) and CALIBRATED (bit 1) before use, setting them at "polls" 2 and 5 respectively. Write the bounded poll that waits for BOTH flags (all-bits test from module 3), with a timeout of 100. Print READY or FAULT with the poll count.',
        expectedBehavior:
          'The wait condition uses `(status & (POWER_OK | CALIBRATED)) != (POWER_OK | CALIBRATED)` - the all-bits semantics. The flags arrive at polls 2 and 5, so the loop exits after 5 polls and prints `READY after 5 polls`. A timeout version (flag never set) prints FAULT after 100.',
        hints: [
          'Waiting for several flags means testing mask equality, not just nonzero - module 3\'s all-bits test.',
          'Set POWER_OK and CALIBRATED at their simulated poll numbers inside the loop body.',
          'After the loop, re-test the full mask to decide READY versus FAULT.',
        ],
      },
      {
        title: 'Superloop budget sketch',
        brief:
          'A product must react within 10 ms. Its superloop contains: input read 1 ms, control update 2 ms, output drive 1 ms, and one bounded ADC poll up to 4 ms. Compute the worst-case loop time and slack, then state in a comment what happens if a new feature adds a 3 ms step.',
        expectedBehavior:
          'Worst case = 1 + 2 + 1 + 4 = 8 ms, slack = 2 ms. Adding a 3 ms step makes the worst case 11 ms > 10 ms: the deadline is missed on some passes - the comment must say the design now violates its response budget and needs optimization, a faster poll, or an interrupt-driven ADC.',
        hints: [
          'Worst case means every step takes its maximum, including the poll.',
          'Slack is deadline minus worst case - features consume slack.',
          'Naming the remedy (interrupts, state-machine splitting) is the embedded-course bridge.',
        ],
      },
    ],
    assessment: {
      title: 'Polling and superloop checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational simulation - no hardware. */\nint main(void) {\n    uint8_t st = 0x00;\n    const uint8_t DONE = (uint8_t)(1u << 0);\n    int polls = 0;\n\n    while (((st & DONE) == 0) && (polls < 4)) {\n        polls++;\n        if (polls == 3) {\n            st |= DONE;\n        }\n    }\n    printf("polls=%d done=%d\\n", polls, (st & DONE) != 0);\n    return 0;\n}',
          options: ['polls=3 done=1', 'polls=4 done=1', 'polls=4 done=0', 'polls=3 done=0'],
          answer: 'polls=3 done=1',
          explanation:
            'Poll 3 sets DONE; the condition re-tests, sees the flag, and exits - polls never reaches the budget of 4. The done=1 confirms the flag was set when the loop ended.',
          hint: 'Which condition arm ends the loop, and when?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What is the main cost of a busy-wait poll on a battery-powered device?',
          options: [
            'It wears out flash memory',
            'It burns maximum CPU current while doing no useful work',
            'It corrupts the status register',
            'It prevents the program from compiling',
          ],
          answer: 'It burns maximum CPU current while doing no useful work',
          explanation:
            'A busy-wait keeps the core executing fetch-and-compare instructions at full clock, drawing peak current to accomplish nothing. Sleep states and interrupts are the alternatives.',
          hint: 'What is the CPU doing during each spin iteration?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'After a bounded poll, the correct way to decide success versus timeout is to test whether the timeout counter reached zero.',
          answer: 'false',
          explanation:
            'The counter says the loop ended; only the flag says why. A flag arriving exactly as the budget expires would be misclassified. Re-test the flag after the loop.',
          hint: 'Which variable actually encodes the event you were waiting for?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A teammate writes a host "simulation" whose comments say "reads the SPI flash status register" while the code assigns a plain local variable. What is wrong with this, and what is the honest way to present the same code?',
          answer: 'The comments claim hardware access the program does not perform - simulations must be labeled as models (an ordinary variable standing in for a register), with prose like "models the sequence a driver would follow", so readers never mistake host code for firmware behavior',
          explanation:
            'Honesty about simulation prevents two failures: students believing they have touched hardware, and code comments that would be actively false if pasted into a real driver. Label the model, keep the driver-shaped structure.',
          hint: 'Compare what the comment promises with what the statement does.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the two mechanisms that replace polling on real hardware, and one reason each is preferable.',
          answer: 'Interrupts - the hardware invokes a handler on the event, so no CPU cycles are spent checking; and sleep states - the CPU halts (near-zero power) until woken, instead of spinning',
          explanation:
            'Both move the "wait" out of software: interrupts replace the wait with an event callback, sleep replaces spinning with halted low-power operation. Polling remains reasonable only for very short, bounded waits.',
          hint: 'One is about events, one is about power.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Superloop', definition: 'The never-ending init-plus-for(;;) structure of bare-metal firmware; all product behavior happens inside it.' },
      { term: 'Polling', definition: 'Repeatedly checking a status flag in software until hardware reports readiness.' },
      { term: 'Busy-wait', definition: 'A polling loop that spins at full CPU speed - costly in power and blocking other work.' },
      { term: 'Bounded poll', definition: 'A poll with a timeout folded into its condition, guaranteeing termination and a defined timeout path.' },
      { term: 'volatile', definition: 'The qualifier telling the compiler a value can change outside program flow (hardware), forbidding cached reads and loop deletion.' },
      { term: 'Interrupt', definition: 'A hardware mechanism that invokes a handler on an event - the main alternative to polling, covered in the embedded course.' },
    ],
    revisionSummary: [
      'Firmware shape: init once, superloop forever; host simulations run bounded passes and say so.',
      'Polling checks flags in a loop; busy-waiting costs power, latency and risks a hang.',
      'Bounded poll pattern: budget, loop on flag-and-budget, decide by re-testing the flag, act on timeout.',
      'Waiting for multiple flags uses the all-bits test: (status & mask) == mask.',
      'Real register declarations are volatile - without it the optimizer may delete wait loops.',
      'Long blocking work inside the superloop delays everything else; split it or go interrupt-driven.',
    ],
    furtherReading: [
      { label: 'Wikipedia - Busy waiting', url: 'https://en.wikipedia.org/wiki/Busy_waiting', kind: 'article' },
      { label: 'Wikipedia - Polling (computer science)', url: 'https://en.wikipedia.org/wiki/Polling_(computer_science)', kind: 'article' },
      { label: 'Wikipedia - Interrupt', url: 'https://en.wikipedia.org/wiki/Interrupt', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
