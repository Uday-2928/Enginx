import type { TutorialLesson } from '../types';

export const module06Lessons: TutorialLesson[] = [
  {
    id: 'cpg-m06-l1',
    title: 'Declaring, Defining and Calling Functions',
    summary:
      'Split work into functions with prototypes and definitions, understand pass-by-value down to the copied bytes, and learn why the compiler needs to see a declaration first.',
    objectives: [
      'Write function prototypes and definitions, and explain what each contributes to the build.',
      'Trace a call through parameters, body and return value.',
      'Demonstrate pass-by-value: a function cannot modify the caller\'s copy.',
      'Compose small functions into a conversion pipeline with clear data flow.',
    ],
    whyItMatters:
      'Functions are the unit of thought in C: every firmware driver is a handful of them, and code review happens one function at a time. Pass-by-value is the rule that quietly shapes all C API design - it is why output parameters exist, why pointers matter (module 8), and why a function can never corrupt your variables by accident.',
    prerequisites: ['cpg-m05-l1', 'cpg-m02-l1'],
    explanation:
      'A **function** packages a computation behind a name, some inputs (parameters) and one output (the return value).\n\n### Declaration versus definition\n\nA **declaration** (prototype) announces the interface: `int mv_to_celsius(int millivolts);` - name, parameter types, return type, semicolon. A **definition** supplies the body: the same signature followed by `{ ... }`. The compiler needs the declaration *before* a call so it can type-check the arguments; the linker needs the definition somewhere (same file or another) at link time. That split is why headers exist: declarations live in `.h`, definitions in `.c` (lesson 3).\n\n### Calling: what actually happens\n\nWhen `main` calls `clamp(mv_to_celsius(raw), 0, 100)`, the inner call runs first; each call gets its own fresh parameters, runs its body, and hands the return value back to the call site. Arguments are matched **positionally**: first argument to first parameter, and each is converted to the parameter\'s declared type if needed (an implicit narrowing you should usually make explicit with a cast).\n\n### Pass-by-value: copies, always\n\nC copies every argument into the parameter. Assigning to a parameter changes the *copy*; the caller\'s variable is untouched. This is a feature: functions cannot secretly mutate your state. It is also a limitation: to let a function *produce* a change in the caller\'s variables, you pass the address of the variable (a pointer - module 8) instead of the value. Until then, functions communicate results through their return value.',
    deepDive:
      '### The call stack, briefly\n\nEach call creates a **stack frame**: a region holding the parameters, the function\'s local variables, and the return address. Entering the function pushes the frame; returning pops it. Two consequences matter now. First, locals die with the frame - a function\'s variables do not survive between calls (unless static, module 2), and returning a pointer to a local (module 8) points into a popped frame. Second, recursion - calling a function from itself - works by stacking frames; the depth is bounded by stack size, which on an MCU may be a few kilobytes. Lesson 2 makes this concrete with recursion.\n\n### Choosing parameters and returns: the interface design skill\n\nGood function interfaces follow rules you can apply mechanically. Inputs go in parameters; the single most important result comes back as the return value; auxiliary results wait for module 8\'s output parameters. Name functions as verbs with units where relevant: `mv_to_celsius`, `crc16_append`, `clamp_pct`. Keep functions short enough to fit their purpose in one screen - the classic heuristic is "one function, one responsibility", and a function needing "and" in its name is usually two. Small, single-purpose functions get named, tested, reviewed and reused; 200-line functions get feared.\n\n### void in both positions\n\n`void` as the return type means "returns nothing" - such functions exist for their effect (printing, updating a module\'s state) and are called as statements. `void` in the parameter list means "takes nothing" - always write it, because empty parentheses in C mean unspecified parameters and disable checking. A function that takes nothing and returns nothing is a valid unit of work, but ask whether a status return would serve the caller better: even `int` success/failure codes (0 for success, nonzero for the error, the Unix convention) let callers react.',
    examples: [
      {
        title: 'A conversion pipeline of small functions',
        language: 'c',
        code:
          '#include <stdio.h>\n\n/* Educational linear sensor model: 10 mV per degree C. */\nint mv_to_celsius(int millivolts) {\n    return millivolts / 10;\n}\n\nint clamp(int value, int low, int high) {\n    if (value < low) {\n        return low;\n    }\n    if (value > high) {\n        return high;\n    }\n    return value;\n}\n\nint main(void) {\n    int raw_mv = 257;\n    int celsius = clamp(mv_to_celsius(raw_mv), 0, 100);\n\n    printf("raw=%d mv, celsius=%d\\n", raw_mv, celsius);\n    return 0;\n}',
        explanation: [
          'Each function owns one idea: the sensor model (millivolts to degrees) and the clamping rule live in separate, named, testable units.',
          'The call `mv_to_celsius(257)` returns 257 / 10 = 25 (integer division); that value becomes the first argument of clamp.',
          '`clamp(25, 0, 100)`: 25 is not below 0 and not above 100, so the final return hands back 25 unchanged.',
          'Data flows right-to-left through the nested call and left-to-right through the pipeline - reading the line inside-out is the standard skill.',
          'Output: `raw=257 mv, celsius=25`',
        ],
      },
      {
        title: 'Pass-by-value demonstrated',
        language: 'c',
        code:
          '#include <stdio.h>\n\nvoid try_to_modify(int x) {\n    x = 99;                 /* modifies the COPY only */\n}\n\nint main(void) {\n    int a = 5;\n    try_to_modify(a);\n    printf("a = %d\\n", a);\n    return 0;\n}',
        explanation: [
          'The call copies the value 5 into the parameter x - two independent variables that happen to hold the same number at call time.',
          'The body assigns 99 to its own copy; the frame (and the copy) vanish at return.',
          'The caller\'s a still holds 5 - pass-by-value means no leak backward from function to caller.',
          'When a function must change a caller variable, the caller passes the variable\'s address (module 8): the copy is then of the address, and dereferencing reaches the original.',
          'Output: `a = 5`',
        ],
      },
    ],
    tables: [
      {
        caption: 'Declaration vs definition vs call',
        headers: ['', 'Looks like', 'Where it lives', 'What it provides'],
        rows: [
          ['Declaration (prototype)', 'int f(int x);', 'Headers, or top of .c', 'Type information so the compiler can check calls'],
          ['Definition', 'int f(int x) { ... }', 'One .c file, once', 'The machine code; the symbol the linker resolves'],
          ['Call', 'f(3);', 'Anywhere after declaration', 'Executes the body with copied arguments'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Calling a function before the compiler has seen any declaration of it.',
        fix:
          'In C99 and later this is an error (or a dangerous implicit declaration in older dialects). Put prototypes at the top of the file or in a header, above first use - or order definitions so callees appear above callers.',
      },
      {
        mistake: 'Expecting a function to change the caller\'s variable by assigning to its parameter.',
        fix:
          'Parameters are copies (pass-by-value); assignments die with the frame. Return the new value and assign at the call site, or pass an address (module 8) when a true in-place update is needed.',
      },
      {
        mistake: 'Writing `int main()` or `f()` with empty parentheses for a no-argument function.',
        fix:
          'Empty parentheses mean unspecified parameters in C - the compiler stops checking arguments. Write `(void)` explicitly in both prototypes and definitions.',
      },
      {
        mistake: 'One giant function that reads input, computes and prints, then cannot be reused or tested.',
        fix:
          'Split by responsibility: a pure computation function (testable), and a thin main that wires input and output together. The example above separates conversion from clamping from display.',
      },
    ],
    guidedPractice: {
      title: 'Build and trace a two-stage converter',
      brief:
        'Write `int counts_to_mv(int counts)` using the educational model mv = counts * 3300 / 4096, and reuse the clamp function from the example. Then compute and print clamped temperature for counts = 500 and for counts = 5000. Predict both results on paper first.',
      starterCode:
          '#include <stdio.h>\n\nint counts_to_mv(int counts) {\n    return counts * 3300 / 4096;\n}\n\nint mv_to_celsius(int millivolts) {\n    return millivolts / 10;\n}\n\nint clamp(int value, int low, int high) {\n    if (value < low) {\n        return low;\n    }\n    if (value > high) {\n        return high;\n    }\n    return value;\n}\n\nint main(void) {\n    printf("t1=%d\\n", clamp(mv_to_celsius(counts_to_mv(500)), 0, 100));\n    printf("t2=%d\\n", clamp(mv_to_celsius(counts_to_mv(5000)), 0, 100));\n    return 0;\n}',
      expectedBehavior:
        'counts = 500: mv = 500 * 3300 / 4096 = 1650000 / 4096 = 402; celsius = 40; clamped = 40. counts = 5000 (out of range): mv = 16500000 / 4096 = 4028; celsius = 402; clamp raises it? No - clamps it DOWN to 100. Output: t1=40, t2=100.',
      hints: [
        'Work inside-out: counts_to_mv first, then mv_to_celsius, then clamp.',
        '1650000 / 4096: 4096 * 402 = 1646592, remainder 3408 - so 402.',
        'The second input exceeds full scale; the clamp exists exactly to bound such noise.',
      ],
    },
    practiceExercises: [
      {
        title: 'Percent of full scale, as a function',
        brief:
          'Write `int pct_of_full_scale(int sample, int max_sample)` returning 0..100 (integer), with a guard: if max_sample is 0 or negative, return 0. Test it with (512, 4095) and (4095, 4095).',
        expectedBehavior:
          '512 * 100 / 4095 = 51200 / 4095 = 12 (12.5 truncated). 4095 * 100 / 4095 = 100. The guard prevents a division by zero (undefined behavior) for a degenerate max. Outputs: 12 and 100.',
        hints: [
          'Multiply before dividing to keep precision: sample * 100 / max.',
          'The guard runs before any division - a function that can be handed bad arguments must survive them.',
          '4095 * 100 = 409500, well within int range.',
        ],
      },
      {
        title: 'Predict the copies',
        brief:
          'Write a function `void double_it(int v) { v = v * 2; }` and a main that calls it with `n = 7`, then prints n. Predict the output and explain in a comment where the doubled value went. Then write `int doubled(int v) { return v * 2; }` and use it correctly.',
        expectedBehavior:
          'The printout is n = 7: the doubling happened on the parameter copy inside the frame, which was destroyed at return. The corrected version assigns the returned value: `n = doubled(n);` giving 14.',
        hints: [
          'Pass-by-value: the function received 7, not the variable n.',
          'The return value is the sanctioned channel from function back to caller.',
          'The pointer-based in-place version arrives in module 8 - compare the two styles then.',
        ],
      },
    ],
    assessment: {
      title: 'Function basics checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint mv_to_celsius(int millivolts) {\n    return millivolts / 10;\n}\n\nint main(void) {\n    int raw_mv = 257;\n    printf("celsius=%d\\n", mv_to_celsius(raw_mv));\n    return 0;\n}',
          options: ['celsius=25', 'celsius=25.7', 'celsius=26', 'celsius=2'],
          answer: 'celsius=25',
          explanation:
            'The call copies 257 into the parameter; the body computes 257 / 10 = 25 with integer division (truncating toward zero) and returns it.',
          hint: 'Integer division truncates - what is 257 / 10?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What is the difference between a function declaration and a definition?',
          options: [
            'A declaration runs faster',
            'A declaration announces the interface; a definition also supplies the body',
            'They are synonyms',
            'A definition must appear in a header',
          ],
          answer: 'A declaration announces the interface; a definition also supplies the body',
          explanation:
            'The declaration gives the compiler enough type information to check calls; the definition emits the code. A program needs exactly one definition per function but may declare it many times.',
          hint: 'Which one ends with a semicolon and no braces?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'After `void f(int x) { x = 42; }` is called with variable n as the argument, n equals 42.',
          answer: 'false',
          explanation:
            'C passes by value: x is a copy of n, and assigning to the copy leaves the caller\'s variable untouched. Changing caller variables requires passing an address.',
          hint: 'What exactly gets copied at the call?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'This file fails to compile with "implicit declaration of function" (or errors in C99). Explain the defect and give two valid fixes.\n\n```\nint main(void) {\n    printf("%d\\n", helper(3));\n    return 0;\n}\n\nint helper(int v) {\n    return v * 2;\n}\n```',
          answer: 'helper is called above its definition with no prior prototype - fixes: add a prototype (int helper(int v);) above main, or move the definition of helper above main',
          explanation:
            'The compiler reads top to bottom and must know a function\'s signature before checking a call. A prototype at the top (or in a header) is the scalable fix; reordering works for tiny files.',
          hint: 'The compiler has not seen the name helper yet when it reaches the call.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Why should a no-argument function be declared with (void) rather than empty parentheses?',
          answer: 'Empty parentheses mean unspecified parameters in C, which disables argument checking; (void) explicitly promises no parameters so the compiler rejects accidental calls with arguments',
          explanation:
            'The distinction is inherited from pre-standard C. Modern practice always writes (void) in declarations and definitions of parameterless functions.',
          hint: 'What can sneak into a call when the compiler does not know the parameter list?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Prototype', definition: 'A function declaration: name, parameter types and return type without a body, enabling call checking.' },
      { term: 'Definition', definition: 'The full function with its body; exactly one per function across the program.' },
      { term: 'Parameter', definition: 'A named local variable in the function that receives a copy of the corresponding argument.' },
      { term: 'Pass-by-value', definition: 'C\'s argument semantics: every argument is copied into the parameter; the caller\'s variables are unaffected.' },
      { term: 'Return value', definition: 'The single result a function hands back to its call site.' },
      { term: 'Stack frame', definition: 'The per-call memory region holding parameters, locals and the return address; destroyed on return.' },
    ],
    revisionSummary: [
      'Prototypes enable call checking; definitions provide code; each call copies arguments into fresh parameters.',
      'Pass-by-value: functions cannot modify caller variables - results return via the return value.',
      'Read nested calls inside-out; each call is a complete frame created and destroyed.',
      'Declare (void) for no-argument functions - empty parentheses disable checking.',
      'Small single-responsibility functions are testable and reviewable; giants are feared.',
      'Arguments match positionally and convert implicitly to parameter types - make narrowings explicit.',
    ],
    furtherReading: [
      { label: 'cppreference - functions', url: 'https://en.cppreference.com/w/c/language/functions', kind: 'docs' },
      { label: 'Wikipedia - Call stack', url: 'https://en.wikipedia.org/wiki/Call_stack', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'cpg-m06-l2',
    title: 'Scope, Lifetime and Recursion',
    summary:
      'Map which names live where - locals, globals, static locals - then watch recursion build a tower of stack frames and learn why firmware often prefers the iterative form.',
    objectives: [
      'Distinguish block scope, file scope and function-local static storage.',
      'Use a static local as deliberate module state and explain its cost.',
      'Trace a recursive call down to its base case and back up.',
      'Convert a simple recursion to a loop and say when each form wins.',
    ],
    whyItMatters:
      'Name visibility is how C keeps large codebases sane: a variable declared inside a function cannot collide with 50 other files. Recursion, meanwhile, is the elegant expression of self-similar problems - and on a microcontroller with a 4 KB stack it is also a way to crash cleanly in production. Knowing both the mechanism and its budget is the mark of an embedded-ready C programmer.',
    prerequisites: ['cpg-m06-l1', 'cpg-m02-l4'],
    explanation:
      '### Scope: who can see the name\n\n- **Block scope** (the default): a name declared inside `{ ... }` exists from its declaration to that block\'s closing brace. Function parameters are block-scoped to the body.\n- **File scope**: a variable declared outside all functions is visible from its declaration to the end of the file - and, unless marked `static`, to other files that declare it `extern` (lesson 3). Globals are the shared memory of a program: powerful, and exactly how unintended coupling begins.\n- **Function scope** applies only to labels; you will not need it in this course.\n\n### Lifetime: when the storage exists\n\n**Automatic** variables (locals) are created when their block is entered and destroyed at exit - every call gets fresh ones. **Static** objects - globals, and locals declared `static` - live for the whole program run and remember their values across calls. A static local combines file-tight privacy with permanent storage: the classic use is a counter or a handle inside a driver function that no other file can touch by name.\n\n### Recursion: a function that calls itself\n\nA **recursive** function solves a problem by solving a smaller copy of itself. Every recursion needs a **base case** that returns directly, and a **recursive step** that moves toward it. Each pending call waits as a stack frame, so depth costs memory linearly - the frame tower grows, the base case is hit, then the frames resolve on the way back up, combining results. Factorial is the canonical demonstration; tree walks and parsers are the professional uses. On hosts, depth in the thousands is fine; on an MCU, deep recursion overflows the stack silently and catastrophically - which is why firmware style prefers iteration wherever the problem is merely counted, not tree-shaped.',
    deepDive:
      '### Globals: the coupling budget\n\nA global variable is visible (and mutable) everywhere its declaration reaches - and every function that reads or writes it becomes impossible to understand in isolation: its behavior now depends on the order of every other function\'s calls. Professional rules of thumb: globals for genuine, program-wide hardware state (a device handle, a calibrated scale factor), owned by one module, named for the module; everything else passes through parameters. `static` on a file-scope variable (lesson 3) makes it file-private, shrinking the blast radius. When you meet code with 30 mutable globals, you have met the reason these rules exist: any function can break any other, invisibly.\n\n### Static locals: state with a name tag\n\nThe static local from module 2 deserves its design discussion here, next to the alternatives. Compared with a global: it cannot be touched from other functions - a real correctness win. Compared with pass-in/pass-out state: it is invisible at the call site - a real auditability loss, and a reentrancy hazard if two contexts (main loop and an interrupt) call the function. The embedded convention: static locals only for module-owned state, documented at the definition (`/* call counter - not reentrant */`), and never for values a caller might reasonably want to control. If a second caller would need a different counter, the state should be a parameter or a struct.\n\n### Recursion versus iteration: the stack budget\n\nFactorial has a loop form of the same complexity; recursion buys only expression elegance there - and pays stack frames for it. The decision rule: recursion fits *branching* self-similar structures (trees, divide-and-conquer) where an explicit stack of pending work would be clumsier than the call stack; iteration fits *linear* repetitions (counters, sums, scans). Firmware tilts the rule further: with stacks measured in kilobytes and no memory-protection unit on small parts, a recursion depth bug corrupts adjacent memory instead of raising a friendly stack-overflow exception. MISRA-style guidelines often require a statically provable recursion depth or ban recursion outright. Express the idea recursively to understand it; ship the loop when the depth is unbounded.',
    examples: [
      {
        title: 'A static local as a sample counter',
        language: 'c',
        code:
          '#include <stdio.h>\n\n/* Returns a fresh id per call. Static local: lives for the\n   whole run, visible only inside this function.          */\nint next_sample_id(void) {\n    static int id = 0;\n    id++;\n    return id;\n}\n\nint main(void) {\n    printf("id=%d\\n", next_sample_id());\n    printf("id=%d\\n", next_sample_id());\n    printf("id=%d\\n", next_sample_id());\n    return 0;\n}',
        explanation: [
          'The initializer `= 0` runs exactly once, before the first call - not on every entry.',
          'Each call increments the same, permanently-alive variable: 1, then 2, then 3.',
          'An automatic `int id = 0;` would reset to 0 on every call and print 1, 1, 1 - the two storage durations side by side.',
          'No other function can even name this id: the scope is the function body. That privacy is the reason to prefer a static local over a global here.',
          'Output:\n```\nid=1\nid=2\nid=3\n```',
        ],
      },
      {
        title: 'Factorial: recursive and iterative, same result',
        language: 'c',
        code:
          '#include <stdio.h>\n\nlong factorial_recursive(int n) {\n    if (n <= 1) {\n        return 1L;                              /* base case */\n    }\n    return (long)n * factorial_recursive(n - 1); /* step */\n}\n\nlong factorial_iterative(int n) {\n    long result = 1L;\n    for (int i = 2; i <= n; i++) {\n        result *= (long)i;\n    }\n    return result;\n}\n\nint main(void) {\n    printf("5! recursive = %ld\\n", factorial_recursive(5));\n    printf("5! iterative = %ld\\n", factorial_iterative(5));\n    return 0;\n}',
        explanation: [
          'The recursive version: 5! waits on 4!, which waits on 3!, 2!, 1! - five frames stacked. At n = 1 the base case returns 1, and the multiplications resolve upward: 1*2=2, *3=6, *4=24, *5=120.',
          'The base case is what stops the descent; without it (or with a wrong one like n < 1 returning garbage) the stack fills and the program dies.',
          'The iterative version holds one accumulator and no stack tower - same 120, constant memory.',
          '`long` and %ld: 5! = 120 fits in int, but 13! already overflows 32 bits - the wider type defers the cliff (and 21! overflows even 64 bits, a limit worth knowing).',
          'Output:\n```\n5! recursive = 120\n5! iterative = 120\n```',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Recursion as a tower of stack frames',
        content:
          ' call                    deepest point                returning\n ----   --------------------------   ---------------------------\n f(5)   f(5) waits: 5 * f(4)         f(5) = 5 * 24 = 120\n  f(4)  | f(4) waits: 4 * f(3)       | f(4) = 4 * 6 = 24\n   f(3) | | f(3) waits: 3 * f(2)     | | f(3) = 3 * 2 = 6\n    f(2)| | | f(2) waits: 2 * f(1)   | | | f(2) = 2 * 1 = 2\n     f(1)| | | | base: return 1      | | | | (returns 1 upward)\n\n        frames grow DOWN the tower  ->  depth costs memory\n        base case stops growth      ->  without it: stack overflow',
        caption:
          'Each pending call holds a frame with its own n. Depth equals the number of pending calls - on an MCU the tower must fit a stack of a few kilobytes.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Recursion without a reachable base case (or with a step that does not shrink).',
        fix:
          'Every recursive call must move toward the base case; check both: `factorial(n - 1)` shrinks n, and the base `n <= 1` catches it. A step like `factorial(n)` or a base case of `n == -5` never terminates - the stack fills and the program crashes.',
      },
      {
        mistake: 'Reaching for a global variable when a parameter would do.',
        fix:
          'Parameters document the data flow and keep the function testable in isolation. Reserve globals for genuinely program-wide state, and prefer file-local static over extern when the state is module-private.',
      },
      {
        mistake: 'Using a static local as scratch space, then calling the function from two contexts.',
        fix:
          'Static locals are shared across ALL calls - two contexts (main loop plus interrupt) would corrupt each other\'s values. Use automatic locals for per-call data; static locals only for deliberate module state, documented as such.',
      },
      {
        mistake: 'Assuming recursion is "free" because the recursive version is shorter.',
        fix:
          'Depth costs stack: n levels of factorial means n live frames. On small MCUs, deep recursion overflows the stack into other memory. Prefer iteration for linear problems; bound and document recursion depth where it is kept.',
      },
    ],
    guidedPractice: {
      title: 'Trace a recursive countdown',
      brief:
        'Write a recursive function `void countdown(int n)` that prints n and calls itself with n - 1, stopping at 0 (print "liftoff" at 0 and do not recurse). Call countdown(3) from main. Write the exact six output lines by hand first, and state the maximum recursion depth.',
      starterCode:
          '#include <stdio.h>\n\nvoid countdown(int n) {\n    if (n == 0) {\n        printf("liftoff\\n");\n        return;                 /* base case: stop recursing */\n    }\n    printf("n=%d\\n", n);\n    countdown(n - 1);\n}\n\nint main(void) {\n    countdown(3);\n    return 0;\n}',
      expectedBehavior:
        'Output: n=3, n=2, n=1, liftoff (four lines - adjust the count if your version prints differently). The frames stack 3, 2, 1 deep; the base case at n = 0 stops the descent. Maximum depth: 3 pending calls (n = 3, 2, 1 waiting) plus the base frame.',
      hints: [
        'Each print happens BEFORE the recursive call, so the numbers appear in descending order on the way down.',
        'The base case runs when n reaches 0 - no frame for it needs to recurse.',
        'Depth = number of simultaneously pending calls: countdown(3) waits on countdown(2) waits on countdown(1).',
      ],
    },
    practiceExercises: [
      {
        title: 'Sum of digits, two ways',
        brief:
          'Write the sum of decimal digits of n (e.g. 942 -> 15) twice: recursively (base case n == 0 returns 0; step returns n % 10 plus the recursion on n / 10) and iteratively with a while loop. Test with 942 and 7.',
        expectedBehavior:
          '942: 9 + 4 + 2 = 15 (942 % 10 = 2, 94 % 10 = 4, 9 % 10 = 9). 7: just 7. Both versions must agree. The recursion depth is the number of digits - 3 and 1 here, trivially safe.',
        hints: [
          'n % 10 peels the last digit; n / 10 removes it (module 3).',
          'Base case: n == 0 - the moment there are no digits left.',
          'The iterative form uses the same peel-and-remove steps inside a while (n > 0).',
        ],
      },
      {
        title: 'Global versus parameter: feel the difference',
        brief:
          'Write two versions of a function that reports whether a temperature is over the limit: one reading a global `int g_limit`, one taking the limit as a parameter. In comments under each, answer: which version can be tested without setting up global state? Which keeps working if two sensors need different limits?',
        expectedBehavior:
          'The parameter version is testable in isolation (call it with any limit) and supports two sensors with two limits; the global version requires mutating g_limit before each call and breaks with multiple limits. The exercise demonstrates why parameters are the default interface.',
        hints: [
          'Testing a global-dependent function means first arranging the global - coupling.',
          'Two different limits cannot both live in one global at the same moment.',
          'Globals are not banned - they are a budget. Spend them on true program-wide state.',
        ],
      },
    ],
    assessment: {
      title: 'Scope, lifetime and recursion checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint tick(void) {\n    static int count = 0;\n    count++;\n    return count;\n}\n\nint main(void) {\n    tick();\n    tick();\n    printf("%d\\n", tick());\n    return 0;\n}',
          options: ['1', '2', '3', '0'],
          answer: '3',
          explanation:
            'The static local persists across calls: call 1 returns 1, call 2 returns 2, call 3 (the one inside printf) returns 3.',
          hint: 'A static local is initialized once and remembers between calls.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In the recursive factorial `return n * factorial(n - 1);` with base case n <= 1, what stops the recursion?',
          options: [
            'The return statement',
            'The base case returning 1 without recursing',
            'The multiplication',
            'The compiler unrolls it',
          ],
          answer: 'The base case returning 1 without recursing',
          explanation:
            'Each pending frame waits on a smaller call until n <= 1 returns directly. Remove the base case and the calls never stop - the stack fills and the program crashes.',
          hint: 'Which code path does NOT issue another call?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A variable declared inside a function can be referenced by name from another function in the same file.',
          answer: 'false',
          explanation:
            'Locals have block scope confined to their own function. Cross-function access requires parameters, a return, a static (file-scope) variable, or a pointer - never the local\'s name.',
          hint: 'Where does the name exist as a name?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A recursive function `int depth(int n) { return depth(n - 1); }` is called with 100000 on an MCU with a 4 KB stack. What happens and why? Give the two-part fix.',
          answer: 'Stack overflow - each call adds a frame and there is no base case, so 100000 frames vastly exceed 4 KB; fixes are adding a base case and, on small targets, replacing the linear recursion with an iterative loop',
          explanation:
            'Linear recursion costs a frame per step with a depth equal to n. On small stacks that corrupts memory or faults. Iteration holds one accumulator and no tower.',
          hint: 'How much stack does each pending call need, and how many are pending?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'State one legitimate use of a file-scope global and the rule that keeps it safe.',
          answer: 'Genuine program-wide state such as a device handle or a calibration constant - owned by one module, named for the module, and preferably made file-private with static so other files cannot reach it directly',
          explanation:
            'The danger of globals is uncontrolled coupling; confining ownership and visibility keeps the state auditable while still shared where it must be.',
          hint: 'The keyword static changes who can see a file-scope name.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Scope', definition: 'The region of code in which a name can be referenced: block, file (global) or function-local static.' },
      { term: 'Lifetime', definition: 'When storage exists: automatic (per block/call) or static (entire program run).' },
      { term: 'Global variable', definition: 'A file-scope variable visible across functions; shared state that couples everything that touches it.' },
      { term: 'static local', definition: 'A function-local variable with static lifetime: remembers across calls, name invisible outside.' },
      { term: 'Recursion', definition: 'A function calling itself on a smaller problem, stopped by a base case.' },
      { term: 'Base case', definition: 'The recursive function\'s direct-return condition that ends the descent; the guard against stack exhaustion.' },
    ],
    revisionSummary: [
      'Block scope ends at the closing brace; automatic locals die with their block.',
      'static locals live for the whole run, initialized once, visible only in their function.',
      'Globals couple every function that touches them - reserve for true program-wide state, prefer file-local static.',
      'Recursion = base case + shrinking step; each pending call costs a stack frame.',
      'Depth equals stack cost: linear problems become loops; recursion earns its keep on tree-shaped ones.',
      'On small MCUs, deep recursion overflows silently - a correctness issue, not just style.',
    ],
    furtherReading: [
      { label: 'Wikipedia - Recursion (computer science)', url: 'https://en.wikipedia.org/wiki/Recursion_(computer_science)', kind: 'article' },
      { label: 'Wikipedia - Scope (computer programming)', url: 'https://en.wikipedia.org/wiki/Scope_(computer_programming)', kind: 'article' },
      { label: 'cppreference - storage duration', url: 'https://en.cppreference.com/w/c/language/storage_duration', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'cpg-m06-l3',
    title: 'Header Files and Multi-File Modularity',
    summary:
      'Split a program into .h/.c pairs, compile them separately, and let the linker wire the pieces together - the structure every firmware project of more than one file uses.',
    objectives: [
      'Split a module into a header of declarations and a source of definitions.',
      'Build a multi-file program with separate compilation and one link step.',
      'Use #ifndef header guards and explain the redefinition error they prevent.',
      'Decide what belongs in a header: declarations yes, definitions no.',
    ],
    whyItMatters:
      'No real firmware lives in one file: sensor drivers, protocol code and application logic each get a .c and a .h. Separate compilation is also why large projects build fast (only changed files recompile) - and misusing headers produces the duplicate-definition link errors that eat beginners\' afternoons. This lesson is the last prerequisite before reading any real codebase.',
    prerequisites: ['cpg-m06-l1', 'cpg-m01-l1'],
    explanation:
      '### The .h/.c pair\n\nA module is two files with a contract:\n\n- **The header (`temperature.h`)** declares the public interface: function prototypes, type definitions, constants. It says what the module offers.\n- **The source (`temperature.c`)** defines the implementations: the function bodies, the private variables. It says how.\n\nAny file that wants the module includes the header. The declarations let the compiler check calls in *that* file; the definitions exist in exactly one place - temperature.c - and the linker connects them at link time.\n\n### Separate compilation and linking\n\nEach .c compiles independently into its own .o; one final command links them:\n\n```\ngcc -c main.c -o main.o\ngcc -c temperature.c -o temperature.o\ngcc main.o temperature.o -o temp_app\n```\n\nChange temperature.c and only it recompiles - the reason build systems and big projects work. The link step is where cross-file calls become real: main.o contains a call to `mv_to_celsius` with no code for it; temperature.o owns the code; the linker patches the address in.\n\n### Header guards\n\nA header included twice (directly, or through two other headers) is pasted twice - and two copies of the same prototype or type definition is an error. The guard makes the second include a no-op:\n\n```\n#ifndef TEMPERATURE_H\n#define TEMPERATURE_H\n/* ... declarations ... */\n#endif\n```\n\nFirst include defines TEMPERATURE_H; every later include is skipped by the #ifndef. Every header you ever write gets a guard, no exceptions.',
    deepDive:
      '### What belongs in a header - and what poisons it\n\nHeaders are the *contract*: type definitions, function prototypes, constants, and nothing executable. A function body in a header compiles in every file that includes it, and with external linkage that means the linker sees N definitions of the same symbol and refuses (`multiple definition of ...`). Three sanctioned exceptions to memorize: `static` (file-local) functions and variables in a .c only, never headers; `static inline` small functions, which are permitted one definition per translation unit; and macros, which are preprocessor text with no linker presence. When you meet a mysterious multiple-definition error, the first suspect is always a definition hiding in a header.\n\n### extern: sharing a variable without defining it twice\n\nA global variable follows the same split: the .c holds the definition (`int g_calibration = 100;` - memory allocated here), the header holds an `extern` declaration (`extern int g_calibration;` - "it exists, defined elsewhere"). Every includer can then use the variable, and the linker binds them to the one definition. The discipline that keeps this sane: minimize shared globals (module 6 lesson 2), and when they must exist, the extern-in-header pattern keeps exactly one definition. A missing extern turns every includer into a definition - another multiple-definition error with a name you now recognize.\n\n### static on functions: privacy at file scale\n\nMarking a helper `static` confines its linkage to its own .c: other files cannot link to it even if they declare it, and two different files may each have their own static function of the same name without conflict. This is C\'s module-privacy tool - everything a driver keeps internal (register helpers, lookup tables) gets static, and the header exposes only the public face. The convention scales to variables (`static int s_state;` inside the .c). Reviewers read a header as "everything any file may use" - static keeps that promise small and honest.',
    examples: [
      {
        title: 'A two-file module, complete',
        language: 'c',
        code:
          '/* ---------- temperature.h ---------- */\n#ifndef TEMPERATURE_H\n#define TEMPERATURE_H\n\nint mv_to_celsius(int millivolts);\nvoid temperature_print(int celsius);\n\n#endif /* TEMPERATURE_H */\n\n/* ---------- temperature.c ---------- */\n#include <stdio.h>\n#include "temperature.h"\n\nint mv_to_celsius(int millivolts) {\n    return millivolts / 10;   /* educational linear model */\n}\n\nvoid temperature_print(int celsius) {\n    printf("%d C\\n", celsius);\n}\n\n/* ---------- main.c ---------- */\n#include "temperature.h"\n\nint main(void) {\n    temperature_print(mv_to_celsius(250));\n    return 0;\n}',
        explanation: [
          'The header holds only declarations, wrapped in a guard. Quote-includes ("temperature.h") tell the preprocessor to search the project directory first.',
          'temperature.c defines both functions exactly once; main.c includes the header and calls them - the compiler checks the calls against the prototypes.',
          'Build and run:\n```\ngcc -c main.c -o main.o\ngcc -c temperature.c -o temperature.o\ngcc main.o temperature.o -o temp_app\n./temp_app\n```\nThe linker resolves main.o\'s call to mv_to_celsius and temperature_print against temperature.o.',
          'Output: `25 C`',
        ],
      },
      {
        title: 'The duplicate-definition trap, reproduced',
        language: 'text',
        code:
          '/* BROKEN: a definition inside a header.\n\n   bignum.h:\n   ------------------------------\n   #ifndef BIGNUM_H\n   #define BIGNUM_H\n\n   int helper(int v) {      <- BODY in the header\n       return v * 2;\n   }\n\n   #endif\n\n   a.c: #include "bignum.h"   -> defines helper\n   b.c: #include "bignum.h"   -> defines helper AGAIN\n\n   link:\n   gcc a.o b.o -o app\n   b.o: in function \'helper\':\n   b.o:(.text+0x0): multiple definition of \'helper\'\n   a.o:(.text+0x0): first defined here\n   ------------------------------\n\n   FIX: declare in the header, define in one .c:\n   bignum.h:  int helper(int v);\n   bignum.c:  int helper(int v) { return v * 2; }',
        explanation: [
          'Each .c that includes the header compiles its own copy of helper into its .o - two definitions of one external symbol.',
          'The linker refuses at merge time with `multiple definition of \'helper\'` - the diagnostic names the symbol and both offending objects.',
          'The guard does NOT save you here: guards prevent double inclusion within one translation unit, not one definition across the program.',
          'The fix is the header/source split of the first example: one definition, one .o, linker satisfied.',
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Putting function bodies (or initialized globals) in headers.',
        fix:
          'Headers hold declarations. Bodies in headers mean one definition per includer and a multiple-definition link error. Define in the .c; declare in the .h.',
      },
      {
        mistake: 'Writing a header without a guard.',
        fix:
          'Two inclusion paths paste the file twice, and even a prototype duplicated in one translation unit is an error. Add the #ifndef/#define/#endif triplet to every header, named after the file: TEMPERATURE_H.',
      },
      {
        mistake: '#including a .c file (`#include "temperature.c"`).',
        fix:
          'This pastes the definitions into the includer - duplicate definitions at link time plus lost separate compilation. Include headers only; list .c files on the compile/link command.',
      },
      {
        mistake: 'Compiling only main.c and linking: `gcc main.c -o app` against a helper .c.',
        fix:
          'The calls compile fine (headers declare them) but the link step finds no definitions: undefined reference. Every .c that defines a used function must be on the final command (or in the build system).',
      },
    ],
    guidedPractice: {
      title: 'Split the percent converter into a module',
      brief:
        'Take this single-file program and split it into pct.h, pct.c and main.c: the function pct_of_full_scale is the module\'s public face; keep the guard, build all three steps, and run. Predict the outputs (512,4095) and (4095,4095) before running.\n\n```\n#include <stdio.h>\n\nint pct_of_full_scale(int sample, int max_sample) {\n    if (max_sample <= 0) {\n        return 0;\n    }\n    return sample * 100 / max_sample;\n}\n\nint main(void) {\n    printf("p1=%d\\n", pct_of_full_scale(512, 4095));\n    printf("p2=%d\\n", pct_of_full_scale(4095, 4095));\n    return 0;\n}\n```',
      expectedBehavior:
        'pct.h: guard + `int pct_of_full_scale(int sample, int max_sample);`. pct.c: includes pct.h and holds the definition with the guarded division (it needs no stdio.h since it does not print). main.c: includes pct.h AND stdio.h (it calls printf), keeps the two printf calls. Build: gcc -c main.c; gcc -c pct.c; gcc main.o pct.o -o pct_app. Output: p1=12 (51200/4095 = 12.5 truncated), p2=100.',
      hints: [
        'The header gets the prototype and nothing else; the definition moves to pct.c.',
        'main.c does need stdio.h (it calls printf); pct.c does not (it only computes).',
        'Both .c files compile separately; only the link command sees them together.',
      ],
    },
    practiceExercises: [
      {
        title: 'Add a second module and call across',
        brief:
          'Extend the temperature project with `convert.h`/`convert.c` providing `int counts_to_mv(int counts)` (model: counts * 3300 / 4096). Have main.c print mv_to_celsius(counts_to_mv(1023)). Build all files in one command line and state the output.',
        expectedBehavior:
          'counts_to_mv(1023) = 1023 * 3300 / 4096 = 3375900 / 4096 = 824 (4096 * 824 = 3375104, remainder 796); mv_to_celsius(824) = 82. Output: `82 C`. Build: gcc main.c convert.c temperature.c -o app (one command compiles and links all three).',
        hints: [
          'main.c now includes both headers - independent modules, independent interfaces.',
          'The one-command form `gcc main.c temperature.c convert.c -o app` compiles each and links automatically.',
          'Trace the arithmetic: 1023 * 3300 = 3375900; 3375900 / 4096 = 824.49... -> 824.',
        ],
      },
      {
        title: 'Make a helper private with static',
        brief:
          'In convert.c, split the model into a static helper `static int counts_scaled(int counts)` returning counts * 3300, with counts_to_mv calling it and dividing by 4096. Explain in a comment why the helper must NOT appear in convert.h.',
        expectedBehavior:
          'counts_scaled(1023) = 3375900; counts_to_mv returns 824 as before. The comment: static linkage is file-private - putting it in the header would promise other files something they cannot (and should not) link to, and would break the "header = public contract" rule.',
        hints: [
          'static on a function confines the symbol to its own .c.',
          'Headers describe what other files may use; static helpers are implementation detail.',
          'Behavior is unchanged - privacy is about the interface, not the arithmetic.',
        ],
      },
    ],
    assessment: {
      title: 'Headers and modularity checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What does a header file conventionally contain?',
          options: [
            'Function definitions and global variable definitions',
            'Function prototypes, type definitions and constants',
            'Only main()',
            'The linker script',
          ],
          answer: 'Function prototypes, type definitions and constants',
          explanation:
            'The header is the module\'s public contract - what other files may use. Definitions belong in exactly one .c file.',
          hint: 'What does another file need in order to call into this module?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'A project has main.c calling `int helper(int);` declared in util.h and defined in util.c. The build runs:\n\ngcc -c main.c -o main.o\ngcc main.o -o app\n\nWhat happens?',
          code: '/* main.c */\n#include "util.h"\nint main(void) { return helper(2); }\n\n/* util.h */\nint helper(int v);\n\n/* util.c */\nint helper(int v) { return v * 2; }',
          options: [
            'Builds and runs fine, returning 4',
            'Fails at compile time: helper is undeclared',
            'Fails at link time: undefined reference to helper',
            'Fails at link time: multiple definition of helper',
          ],
          answer: 'Fails at link time: undefined reference to helper',
          explanation:
            'main.c compiles against the header declaration, but util.c was never compiled or linked - no object file defines helper, so the linker reports an undefined reference. The fix is compiling util.c and including it in the link.',
          hint: 'Which stage notices that a definition is missing from the object files?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A header guard prevents the same header from being pasted twice into one .c file.',
          answer: 'true',
          explanation:
            'The #ifndef/#define/#endif triplet makes the second inclusion a no-op within a translation unit. It does not prevent duplicate definitions across separate .c files - only the define-once rule does that.',
          hint: 'Guards work per translation unit, not per program.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'Two .c files each include util.h, which contains a function body. The link fails with `multiple definition of \'helper\'`. Why did the header guard not prevent this, and what is the fix?',
          answer: 'Guards prevent double inclusion within ONE .c file, not across files - each of the two .c files compiled its own copy of the body into its .o - fix by moving the body into util.c and leaving only the prototype in util.h',
          explanation:
            'Each translation unit is compiled independently; the guard is irrelevant across them. One definition per program is the rule, satisfied by the .h-declares/.c-defines split.',
          hint: 'How many object files contain the body?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'What does the static keyword on a function in a .c file do, and why does it support good module design?',
          answer: 'It confines the function\'s linkage to its own translation unit - other files cannot call it and name collisions across files are impossible - which keeps the header as an honest, minimal public contract',
          explanation:
            'static is C\'s module privacy: internal helpers stay internal, the public surface is exactly what the header declares.',
          hint: 'Who can no longer link to the function?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Header file', definition: 'A .h file declaring a module\'s public interface: prototypes, types, constants.' },
      { term: 'Source file', definition: 'A .c file defining one module\'s implementation: function bodies and private state.' },
      { term: 'Translation unit', definition: 'One .c file after preprocessing - the unit the compiler works on.' },
      { term: 'Header guard', definition: 'The #ifndef/#define/#endif wrapper making a header idempotent within a translation unit.' },
      { term: 'extern', definition: 'A declaration meaning "this object is defined elsewhere" - how headers share global variables without duplicating them.' },
      { term: 'Internal linkage', definition: 'The static keyword on functions/variables: the symbol is private to its translation unit.' },
    ],
    revisionSummary: [
      'Module = .h (declarations, guarded) + .c (definitions, once).',
      'Each .c compiles separately; one link step binds calls to definitions.',
      'Headers hold prototypes, types, constants - never function bodies or initialized globals.',
      'Header guards stop double inclusion per translation unit, not duplicate definitions per program.',
      'extern declares variables defined elsewhere; static makes functions and variables file-private.',
      'Undefined reference: a definition missing from the link. Multiple definition: a body in a header.',
    ],
    furtherReading: [
      { label: 'cppreference - translation phases and linkage', url: 'https://en.cppreference.com/w/c/language/declarations', kind: 'docs' },
      { label: 'Wikipedia - Header file', url: 'https://en.wikipedia.org/wiki/Include_directive', kind: 'article' },
      { label: 'GCC online documentation', url: 'https://gcc.gnu.org/onlinedocs/', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
];
