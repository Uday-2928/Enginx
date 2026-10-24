import type { TutorialLesson } from '../types';

export const module10Lessons: TutorialLesson[] = [
  {
    id: 'cpg-m10-l1',
    title: 'The Preprocessor: Macros and Header Guards',
    summary:
      'Understand what #include and #define really do - text substitution before compilation - and learn the parenthesization, side-effect and guard rules that make macros safe.',
    objectives: [
      'Explain preprocessing as text manipulation and inspect its output.',
      'Write object-like and function-like macros with correct parenthesization.',
      'Diagnose the double-evaluation and operator-precedence macro pitfalls.',
      'Use #ifndef guards and conditional compilation for build variants.',
    ],
    whyItMatters:
      'The preprocessor runs before the compiler ever sees your code - every #include paste, every macro expansion, every #ifdef branch happens as pure text surgery. Firmware codebases live on this layer: pin definitions per board, feature flags per SKU, register macros in vendor headers. Misunderstand it and you will chase bugs that literally do not exist in your source file.',
    prerequisites: ['cpg-m06-l3', 'cpg-m03-l1'],
    explanation:
      'The **preprocessor** transforms your source text before compilation: directives (lines starting with #) are executed, and what remains - one **translation unit** - is what the compiler actually parses.\n\n### #include: paste\n\n`#include <stdio.h>` pastes the header\'s entire content at that line (angle brackets search system paths; quotes search the project first, then fall back). The guard idiom from module 6 makes headers idempotent. `#include` is why header errors surface as huge cascades: the error may be in the pasted text, not in your file.\n\n### #define: substitute\n\n- **Object-like**: `#define LED_PIN 5` - every later LED_PIN becomes 5. No type, no scope, no storage: pure text.\n- **Function-like**: `#define GOOD_SQUARE(x) ((x) * (x))` - every later GOOD_SQUARE(4) becomes ((4) * (4)). The parameters are textual slots.\n\nMacros have no type checking and evaluate their arguments by substitution - which is where every classic macro bug comes from.\n\n### The two canonical pitfalls\n\n1. **Missing parentheses**: `#define BAD_SQUARE(x) x * x` expands BAD_SQUARE(2 + 3) to `2 + 3 * 2 + 3` = 11, not 25. Precedence rewrites the expression because substitution happens before parsing. Parenthesize every parameter and the whole body.\n2. **Double evaluation**: `#define MAX(a, b) ((a) > (b) ? (a) : (b))` used as `MAX(i++, 5)` increments i **twice** - the argument text appears twice. Side effects belong in statements, not macro arguments.\n\n### Conditional compilation\n\n`#if / #elif / #else / #endif` (and `#ifdef / #ifndef`) include or exclude lines at preprocessing time - the mechanism behind board variants:\n\n```\n#if defined(BOARD_REV_B)\n    #define LED_ACTIVE_LOW 1\n#else\n    #define LED_ACTIVE_LOW 0\n#endif\n```\n\nDecisions here are compile-time facts (a defined macro, a version number) - never runtime values.',
    deepDive:
      '### Seeing the preprocessor output yourself\n\nThe fastest way to own this layer is to watch it work: `gcc -E main.c -o main.i` stops after preprocessing. Open main.i and find your macro already substituted, your includes replaced by thousands of lines of header text, your #ifdef-eliminated branches gone entirely. Compiler errors that point into main.i territory (line 4000 of a 30-line file) suddenly make sense. The same technique debunks folklore: a macro is never "inlined code with types" - it is the pasted text, visible in black and white.\n\n### Macro versus const versus enum: the firmware decision\n\nFor typed constants, module 2 argued const; for state vocabularies, module 9 argued enum. Macros still win in specific niches: values that must participate in #if (constants cannot - preprocessing runs before compilation), register addresses needing casts at every use, and tiny "functions" required to be compile-time constant expressions (array sizes, case labels). The embedded style synthesis: **const for typed values, enum for related integer names, #define for preprocessor-visible values and compile-time expressions** - and function-like macros only when no inline function can do the job (C99 inline functions are type-checked and single-evaluated; prefer them).\n\n### Multi-line macros and do-while(0)\n\nReal macro bodies span lines using a trailing backslash, and statement-shaped macros wrap in `do { ... } while (0)`:\n\n```\n#define LOG_EVENT(code)  \\\n    do { log_write(code); } while (0)\n```\n\nThe do-while(0) trick makes the macro a single statement: it swallows the caller\'s semicolon safely and cannot break an enclosing if/else the way a bare `{ }` body or an unbraced two-statement expansion would. Vendor SDK headers are full of this pattern; now you can read it without flinching.',
    examples: [
      {
        title: 'The precedence trap, expanded and fixed',
        language: 'c',
        code:
          '#include <stdio.h>\n\n#define BAD_SQUARE(x) x * x\n#define GOOD_SQUARE(x) ((x) * (x))\n\nint main(void) {\n    printf("BAD_SQUARE(2+3) = %d\\n", BAD_SQUARE(2 + 3));\n    printf("GOOD_SQUARE(2+3) = %d\\n", GOOD_SQUARE(2 + 3));\n    return 0;\n}',
        explanation: [
          'The preprocessor substitutes text: BAD_SQUARE(2 + 3) becomes `2 + 3 * 2 + 3` in the compiler\'s input.',
          'Precedence computes 3 * 2 first: 2 + 6 + 3 = 11 - the macro returns garbage with no warning at all.',
          'GOOD_SQUARE expands to `((2 + 3) * (2 + 3))` = 25: parameters parenthesized inside the body, and the body itself parenthesized.',
          'The rule that prevents the class: every macro parameter appears in parentheses, and the entire expansion is parenthesized.',
          'Output:\n```\nBAD_SQUARE(2+3) = 11\nGOOD_SQUARE(2+3) = 25\n```',
        ],
      },
      {
        title: 'Conditional compilation for a board variant',
        language: 'c',
        code:
          '#include <stdio.h>\n\n#define LED_PIN 5\n\n#ifndef LED_ACTIVE_LOW\n#define LED_ACTIVE_LOW 0\n#endif\n\nint main(void) {\n#if LED_ACTIVE_LOW\n    printf("LED on = pin %u driven LOW\\n", (unsigned)LED_PIN);\n#else\n    printf("LED on = pin %u driven HIGH\\n", (unsigned)LED_PIN);\n#endif\n    return 0;\n}',
        explanation: [
          'LED_ACTIVE_LOW defaults to 0 when the build has not defined it - a #ifndef guard for a configuration macro (the same guard shape as header protection, applied to a value).',
          'The #if is evaluated at PREPROCESSING time: the false branch is deleted from the translation unit entirely - the compiler never sees it.',
          'Building with `-DLED_ACTIVE_LOW=1` flips the program without touching the source: the mechanism behind board-variant builds.',
          'Note what could NOT do this job: a const int - preprocessing happens before the compiler exists in the pipeline, so #if can only test macros.',
          'Output (default build): `LED on = pin 5 driven HIGH`',
        ],
      },
    ],
    tables: [
      {
        caption: 'Preprocessor directives you will actually use',
        headers: ['Directive', 'Purpose'],
        rows: [
          ['#include <h> / "h"', 'Paste a header (system path / project path first)'],
          ['#define NAME value', 'Object-like macro: textual constant'],
          ['#define F(x) body', 'Function-like macro: textual function'],
          ['#ifndef / #define / #endif', 'Header guard or configuration default'],
          ['#if / #elif / #else / #endif', 'Compile-time inclusion decisions'],
          ['#undef NAME', 'Remove a macro definition'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Function-like macros without parentheses around parameters and body.',
        fix:
          'Substitution happens before parsing, so operator precedence rewrites expanded expressions (BAD_SQUARE(2+3) = 11). Parenthesize every parameter occurrence and the whole body - or better, use a static inline function, which is type-checked.',
      },
      {
        mistake: 'Passing side effects to macros: `MAX(i++, 5)`.',
        fix:
          'The argument text is substituted twice, so i increments twice. Side-effect arguments belong to functions; at minimum, never pass ++/-- or function calls to macro parameters.',
      },
      {
        mistake: 'Forgetting the backslash on multi-line macro bodies (or adding one after the last line).',
        fix:
          'A logical preprocessor line ends at the backslash-newline; without it, line 2 becomes invalid source outside the macro. Nothing follows the final line - the body simply ends.',
      },
      {
        mistake: 'Trying to #if on a const or enum value.',
        fix:
          'Conditional compilation reads only macro definitions - it runs before compilation. Export configuration as macros (or convert const values to macros for that use), and keep #if decisions to compile-time facts.',
      },
    ],
    guidedPractice: {
      title: 'Inspect an expansion with -E',
      brief:
        'Write the BAD/GOOD_SQUARE program, compile with `gcc -E` to a .i file, and locate both expanded printf lines in it. Record exactly what text the compiler receives for each call. Then add a third macro `#define DOUBLE(x) ((x) + (x))` and predict DOUBLE(n++) behavior in a comment - without running it.',
      expectedBehavior:
        'In the .i file the calls appear as printf("BAD_SQUARE(2+3) = %d\\n", 2 + 3 * 2 + 3); and ...((2 + 3) * (2 + 3)); - the substitutions verbatim. DOUBLE(n++) would expand to ((n++) + (n++)): two increments of n in one expression, which is undefined behavior (module 3\'s one-side-effect rule) - the comment must flag it as forbidden, not just stylistically poor.',
      hints: [
        '-E output includes all pasted headers - search near the end of the file for your own lines.',
        'Macro substitution is verbatim: spaces in the argument list are irrelevant, grouping is everything.',
        'The one-side-effect-per-expression rule applies doubly when a macro multiplies the text.',
      ],
    },
    practiceExercises: [
      {
        title: 'Build a safe register macro',
        brief:
          'Write `#define REG8(addr) (*(volatile uint8_t *)(addr))` and explain each cast in a comment: what the volatile does (module 5), what the pointer type fixes, why the outer parentheses matter. Demonstrate with a simulated address in a comment only - do NOT dereference an invented address on the host.',
        expectedBehavior:
          'The comment should explain: (addr) is parenthesized (the precedence rule), cast to volatile uint8_t* (volatile forbids cached reads - module 5; uint8_t fixes the width), and the outer * dereferences - so REG8(0x40000000) both reads and writes the byte at that address when used as a value or assignment target. The demo must stay a comment: dereferencing an invented address on a host is undefined behavior.',
        hints: [
          'This macro is the exact shape of vendor register headers - read the cast inside-out.',
          'volatile tells the optimizer every access is observable - mandatory for real hardware.',
          'On a host, never evaluate it: the educational point is the reading, not the dereference.',
        ],
      },
      {
        title: 'Guard a configuration default',
        brief:
          'Create config.h defining BAUD_RATE only if not already defined (default 115200), include it from main.c which prints the value with %lu through an unsigned long cast. Build once plain, once with -DBAUD_RATE=9600, and record both outputs.',
        expectedBehavior:
          'Plain build prints 115200; -DBAUD_RATE=9600 prints 9600 - the preprocessor default yielded to the build flag because the #ifndef found the name already defined. The cast handles any macro the user passes (a macro has no type; the cast at the use site fixes it).',
        hints: [
          'config.h needs the standard guard shape, but for a value: #ifndef BAUD_RATE / #define BAUD_RATE 115200 / #endif.',
          'Pass -D flags to gcc before the source file.',
          'Which stage makes this work - and why can a const int not participate?',
        ],
      },
    ],
    assessment: {
      title: 'Preprocessor checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\n#define BAD_SQUARE(x) x * x\n#define GOOD_SQUARE(x) ((x) * (x))\n\nint main(void) {\n    printf("%d %d\\n", BAD_SQUARE(2 + 3), GOOD_SQUARE(2 + 3));\n    return 0;\n}',
          options: ['25 25', '11 25', '25 11', '11 11'],
          answer: '11 25',
          explanation:
            'BAD_SQUARE(2 + 3) expands to 2 + 3 * 2 + 3 = 11 (precedence multiplies first); GOOD_SQUARE parenthesizes to ((2 + 3) * (2 + 3)) = 25.',
          hint: 'Substitute the text verbatim, then apply C precedence.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Why is `MAX(i++, 5)` with `#define MAX(a, b) ((a) > (b) ? (a) : (b))` dangerous?',
          options: [
            'Macros cannot take ++ arguments',
            'The argument text substitutes twice, so i increments twice',
            'The ternary operator is illegal in macros',
            'MAX is a reserved name',
          ],
          answer: 'The argument text substitutes twice, so i increments twice',
          explanation:
            'Substitution is textual: a appears twice in the body, so the side effect happens twice - and a double increment inside one expression is undefined behavior anyway. Functions evaluate arguments once.',
          hint: 'Count how many times each parameter appears in the body.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: '#if can test a const int variable like `#if SOME_CONST > 10`.',
          answer: 'false',
          explanation:
            'Preprocessing runs before compilation - const values do not exist yet. Conditional compilation reads only macro definitions. Export configuration as macros when #if must see it.',
          hint: 'Which pipeline stage evaluates #if, and what exists at that point?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A header included by three .c files has no #ifndef guard and contains only prototypes - yet the build fails. With what error, and why?',
          answer: 'Redefinition (or conflicting declaration) errors within the translation units where the header is included twice via different paths - the same prototypes get pasted twice into one .c, and a repeated prototype/type is illegal; the fix is the #ifndef/#define/#endif guard',
          explanation:
            'Guards operate per translation unit: one .c reaching the header through two includes pastes it twice. Duplicate prototypes or typedefs are errors even though nothing was defined.',
          hint: 'What happens when the same file is pasted twice into one compiler input?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the compiler flag that shows the translation unit after preprocessing, and state two things you would look for in its output.',
          answer: 'gcc -E (output conventionally .i) - you would look for macro substitutions verbatim in place (checking grouping) and which #if branches were deleted or kept',
          explanation:
            'Inspecting preprocessed output turns macro folklore into observable text: expansions, paste cascades, and eliminated conditionals are all visible.',
          hint: 'Which pipeline stage comes before compilation, and can gcc stop there?',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Preprocessor', definition: 'The text-manipulation stage before compilation: pastes includes, expands macros, evaluates conditionals.' },
      { term: 'Translation unit', definition: 'One .c file after preprocessing - the complete input the compiler parses.' },
      { term: 'Object-like macro', definition: '#define NAME text - a textual constant with no type, scope or storage.' },
      { term: 'Function-like macro', definition: '#define F(x) body - parameters are textual slots; evaluate-once semantics are NOT provided.' },
      { term: 'do-while(0) wrapper', definition: 'The idiom making multi-statement macros behave as one statement, safe next to if/else.' },
      { term: '-D flag', definition: 'Compiler option defining a macro from the build command - the mechanism of build variants.' },
    ],
    revisionSummary: [
      'Preprocessing is text: includes paste, macros substitute, conditionals delete - before the compiler exists.',
      'Parenthesize every macro parameter and body, or precedence rewrites your expressions.',
      'Macro arguments are substituted, not evaluated once: no side effects in macro arguments.',
      '#if reads macros only - configuration that must drive conditionals is #define, never const.',
      'gcc -E shows the truth: inspect the translation unit when macro behavior surprises.',
      'do-while(0) wraps statement macros; backslash continues lines; guards protect headers and defaults.',
    ],
    furtherReading: [
      { label: 'cppreference - preprocessor directives', url: 'https://en.cppreference.com/w/c/preprocessor', kind: 'docs' },
      { label: 'Wikipedia - C preprocessor', url: 'https://en.wikipedia.org/wiki/C_preprocessor', kind: 'article' },
      { label: 'GCC online docs - preprocessing', url: 'https://gcc.gnu.org/onlinedocs/cpp/', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'cpg-m10-l2',
    title: 'From Source to Binary: Compile, Assemble, Link',
    summary:
      'Walk the full pipeline into object files, sections and symbol resolution; understand static vs dynamic libraries; and read the memory map that firmware loaders and linker scripts control.',
    objectives: [
      'Describe each pipeline stage\'s input and output, and run them separately.',
      'Explain object file sections (.text, .data, .bss) and where each lives on an MCU.',
      'Distinguish static linking (copy into the binary) from dynamic linking (bind at load).',
      'Attribute the classic build errors to their stage: syntax, undefined reference, multiple definition.',
    ],
    whyItMatters:
      'Module 1 sketched the pipeline; now you own it. Sections and the memory map are the vocabulary of every firmware project: linker scripts place .text in flash and .data in RAM with a copy-down at startup, and "why is my binary 400 KB" questions are answered by section awareness. Debugging link errors - the most common multi-file failure - requires exactly this model.',
    prerequisites: ['cpg-m10-l1', 'cpg-m06-l3', 'cpg-m01-l1'],
    explanation:
      '### The pipeline, stage by stage\n\n- **Preprocess**: main.c + headers -> main.i (pure C, macros gone).\n- **Compile**: main.i -> main.s (assembly for the target CPU).\n- **Assemble**: main.s -> main.o (binary object file: machine code + symbol tables).\n- **Link**: all .o files + libraries -> one executable. The linker merges sections, assigns final addresses, and resolves every undefined symbol against a definition somewhere.\n\ngcc drives all four with one command; `-c`, `-S`, `-E` stop it early (module 1). Build systems (make, CMake, and IDE builds) exist to rerun exactly the stale stages.\n\n### Sections: where bytes end up\n\nEach object file organizes its bytes into **sections**:\n\n- `.text` - executable code (and often string literals). On an MCU: flash.\n- `.data` - initialized globals (`int g = 42;`). On an MCU: stored in flash, copied to RAM at startup.\n- `.bss` - zero-initialized globals (`int g;` or `= 0`). Stored nowhere - RAM is just zeroed at startup. A 10 KB .bss costs zero flash bytes.\n- (plus `.rodata` for constants on many toolchains, debug sections, and relocation records.)\n\nThe **linker script** (firmware\'s build file) assigns sections to memory regions: .text at flash origin, .data/.bss in RAM. `size app` on a host prints text/data/bss - the same report firmware teams read as "flash used / RAM used".\n\n### Static and dynamic libraries\n\nA **static library** (.a) is a bundle of object files: the linker copies the needed members into the executable - self-contained binary, larger, no runtime dependency. A **dynamic library** (.so / .dll) is referenced, not copied: the executable records the dependency and the loader binds it at program start - smaller binaries, shared code across processes, but a runtime search path and version compatibility to manage. Embedded firmware almost always static-links (no filesystem to find .so files, deterministic image); PCs and Linux servers default to dynamic for the shared-memory and update benefits.',
    deepDive:
      '### Symbol resolution in detail\n\nEach object file lists **defined** symbols (its functions, its globals) and **undefined** symbols (what it calls but does not own). The linker walks all inputs: every undefined name must find exactly one definition. Three failure signatures map to three causes: *undefined reference* - nobody defined it (missing .c in the link, missing library with -l); *multiple definition* - two definitions (a body in a header, a global defined in two files); *undefined reference to a known library function* - the library was not listed, or listed after the object that needs it (linker order matters: dependencies after dependents). When you can classify the message before reading the fix, link errors stop being scary.\n\n### The startup copy-down: where .data really comes from\n\nOn a PC the OS loader maps the executable\'s segments into memory - .data arrives from the file automatically. On bare metal, nobody loads anything: the **startup code** (crt0 or the vendor\'s startup.s) runs before main and copies .data\'s initial values from flash to RAM, then zeroes .bss. This invisible ceremony explains two firmware phenomena: initialized globals consume BOTH flash (initial values) and RAM (live values), and a corrupted copy-down makes every initialized global garbage at once. When a firmware manual says "RAM = .data + .bss + stack + heap", you now know exactly what each region is and who prepares it.\n\n### Why build systems exist: the dependency graph\n\nOne gcc command recompiles everything - fine at 3 files, painful at 300. Build tools (make, CMake, ninja) encode the dependency graph: main.o depends on main.c and mylib.h; changing mylib.h rebuilds exactly the .c files that include it, then relinks. The skill worth taking early: when a build misbehaves after editing a header, the usual suspects are stale objects (clean rebuild) or a missing dependency edge. Firmware IDEs wrap the same machinery; understanding the .o level is what lets you diagnose when the wrapper reports something cryptic.',
    examples: [
      {
        title: 'Sections, observed from C',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint initialized_global = 42;      /* .data: stored in the binary */\nint zeroed_global;                /* .bss:  zero-filled at load  */\nstatic int hidden_counter = 0;    /* .data: file-private         */\n\nint main(void) {\n    static int call_count = 0;    /* .data: function-private     */\n    int local = 0;                /* stack: created per call     */\n\n    zeroed_global = 7;\n    call_count++;\n\n    printf("initialized_global=%d\\n", initialized_global);\n    printf("zeroed_global=%d\\n", zeroed_global);\n    printf("hidden_counter=%d\\n", hidden_counter);\n    printf("call_count=%d\\n", call_count);\n    printf("local=%d\\n", local);\n    return 0;\n}',
        explanation: [
          'Each declaration names its home: initialized globals in .data (their initial values are stored in the binary), zeroed/empty globals in .bss (zero-filled at startup, no binary cost), locals on the stack.',
          'static changes LINKAGE (visibility), not section: hidden_counter is .data but unreachable from other files.',
          'call_count proves static locals live in static storage: it would survive between calls (here one call), unlike local.',
          'Output:\n```\ninitialized_global=42\nzeroed_global=7\nhidden_counter=0\ncall_count=1\nlocal=0\n```',
        ],
      },
      {
        title: 'The multi-file build, command by command',
        language: 'text',
        code:
          '# project: main.c + temperature.c (module 6)\n\n# 1. compile each file separately (syntax + code generation)\ngcc -Wall -Wextra -c main.c -o main.o\ngcc -Wall -Wextra -c temperature.c -o temperature.o\n\n# 2. link the objects into one executable\ngcc main.o temperature.o -o temp_app\n\n# 3. inspect the sections of the result\nsize temp_app\n#    text    data     bss     dec     hex\n#    2244     592      16    2852     b24\n\n# the one-command shortcut (compiles + links):\ngcc -Wall -Wextra main.c temperature.c -o temp_app',
        explanation: [
          'Compilation happens per translation unit: each gcc -c knows nothing of the other file - only headers (declarations) connect them at that stage.',
          'The link command is where the files meet: main.o\'s undefined mv_to_celsius resolves against temperature.o\'s definition.',
          '`size` prints the section totals: text (code + rodata), data (initialized globals), bss (zeroed globals). The firmware equivalents are the flash/RAM usage figures in every build log.',
          'The one-command form chains all stages; separate commands are for rebuilds (only stale .o files redo) and for troubleshooting which stage failed.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Sections to memory regions (firmware view)',
        content:
          '   FLASH (non-volatile)              RAM (volatile)\n   +------------------+              +------------------+\n   | .text  code      |              | .data  live copy |<-- copied from\n   | .rodata literals |              | .bss   zeros     |<-- zeroed at\n   | .data INIT values|---copied --->| heap  (malloc)   |    startup\n   | vector table     |              |   |              |\n   +------------------+              |   v stack        |\n                                     +------------------+\n\n   host executable: the loader maps the same sections;\n   firmware: the linker script fixes the addresses and\n   the startup code performs the copy-down and zeroing.',
        caption:
          'Initialized globals cost flash AND ram; bss costs only RAM. The linker script decides placement; startup code prepares RAM before main runs.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Linking without the defining .c: `gcc main.c -o app` when main.c calls functions in temperature.c.',
        fix:
          'Undefined reference at link time. Every needed object or library belongs on the final command: gcc main.c temperature.c -o app. With libraries, order matters: the library follows the objects that use it.',
      },
      {
        mistake: 'Defining the same global in a header (or in two .c files).',
        fix:
          'Multiple definition at link time. The header gets `extern int g;` (a declaration); exactly one .c defines `int g = 0;`. Or better: make it static and file-private.',
      },
      {
        mistake: 'Reading a build log\'s "RAM used" as just .data + .bss and forgetting the stack.',
        fix:
          'Firmware RAM = .data + .bss + stack + heap (if any). The stack size is set in the linker script; overflowing it corrupts neighbors silently (module 8). Budget all four regions.',
      },
      {
        mistake: 'Assuming a dynamic library\'s absence is a compile-time error.',
        fix:
          'Dynamic linking binds at LOAD time: the build succeeds and the program fails at startup with a loader message (or worse, at the first call). Static linking surfaces everything at build time - one reason firmware prefers it.',
      },
    ],
    guidedPractice: {
      title: 'Run the pipeline in stages and inspect it',
      brief:
        'Take any working two-file project from module 6 and: (1) compile both files to .o separately; (2) link them; (3) run `size` on the result and record text/data/bss; (4) add a 1000-element global array `int big[1000];` and re-run size - which section grew, and by how many bytes?',
      expectedBehavior:
        'The array has no initializer, so it lands in .bss: data stays, bss grows by 4000 bytes (1000 * 4), and the executable file barely grows - bss is not stored, just zeroed at load. With `int big[1000] = {1};` instead, .data grows by about 4000 and the file itself grows too - initial values must be stored.',
      hints: [
        'Empty-brace versus no brace decides .bss versus .data - the initializer\'s presence is the switch.',
        'The file size and the bss number are independent: bss is a runtime promise, not stored bytes.',
        'On hosts, `size app` needs binutils (usually bundled with gcc); the numbers mirror firmware RAM/flash reports.',
      ],
    },
    practiceExercises: [
      {
        title: 'Classify three link failures',
        brief:
          'Match each error to its cause and fix: (a) `undefined reference to \'crc16\'` linking main.o and crc.o; (b) `undefined reference to \'sqrt\'` linking a program that includes math.h and calls sqrt; (c) `multiple definition of \'g_table\'` across two .o files.',
        expectedBehavior:
          '(a) crc.o defines crc16 but was not on the link command - add it (or check for a typo in the name). (b) math.h declares sqrt, but the math LIBRARY was not linked - add -lm after the objects. (c) two objects define the same symbol - find the duplicate (a header definition or two file-scope copies), keep one definition (or make one static).',
        hints: [
          'Undefined means "no definition found"; multiple means "too many".',
          'A declaration in a header satisfies the compiler but not the linker - which case is that?',
          'Library order: gcc main.o -lm - the library after the code that needs it.',
        ],
      },
      {
        title: 'Static vs dynamic, argued',
        brief:
          'In comments, decide the linking style for: (a) a pacemaker firmware image; (b) a Linux server command-line tool updated weekly; (c) a bootloader of 16 KB. One sentence each, naming the deciding property.',
        expectedBehavior:
          '(a) static - a self-contained, verified image with no runtime dependencies; updates require reflashing anyway. (b) dynamic - security fixes in shared libraries apply without rebuilding every tool; size shared across binaries. (c) static (and probably no libc at all) - the 16 KB budget cannot carry loader machinery or copy in library code it never uses.',
        hints: [
          'The deciding axes: update mechanism, image size, determinism, runtime environment.',
          'Embedded almost always static: no package manager on the device.',
          'A bootloader usually avoids even the standard library - the extreme of the static philosophy.',
        ],
      },
    ],
    assessment: {
      title: 'Build pipeline checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which section holds `int g_count;` (declared at file scope, never initialized)?',
          options: ['.text', '.data', '.bss', 'the stack'],
          answer: '.bss',
          explanation:
            'Globals without initializers (or initialized to 0) go to .bss: RAM zero-filled at startup, costing zero bytes in the binary itself.',
          hint: 'Which section is defined by "fill with zeros at load", not by stored values?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'A program has `int init_g = 5;` and `int zero_g;` at file scope, and main assigns zero_g = 9 before printing both. What does it print?',
          code: '#include <stdio.h>\n\nint init_g = 5;\nint zero_g;\n\nint main(void) {\n    zero_g = 9;\n    printf("%d %d\\n", init_g, zero_g);\n    return 0;\n}',
          options: ['5 0', '5 9', '0 9', 'garbage garbage'],
          answer: '5 9',
          explanation:
            'init_g starts at its stored initializer (5, from .data); zero_g is zero-filled at startup (.bss) then assigned 9. Both prints reflect runtime state: 5 and 9.',
          hint: 'Zero-fill happens at startup - before main.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A static library\'s code is copied into the executable at link time.',
          answer: 'true',
          explanation:
            'Static archives (.a) contribute their needed members to the binary - self-contained results, larger images. Dynamic libraries are referenced and bound at load time instead.',
          hint: 'Static versus dynamic is about WHEN and WHETHER the code joins the binary.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'Two .c files include a header containing `int g_mode = 1;`. The compile of each file succeeds; the link fails. Name the error, the cause, and the correct header content.',
          answer: 'Multiple definition of g_mode - each translation unit compiled its own definition into its .o - the header should declare only: extern int g_mode; with the single definition int g_mode = 1; living in one .c file',
          explanation:
            'Headers are pasted into every includer; a definition there multiplies. The extern declaration in the header plus one definition in a source file is the split.',
          hint: 'How many object files contain the definition?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'On a bare-metal MCU, who moves .data initial values from flash to RAM, and when?',
          answer: 'The startup code (crt0/vendor startup) runs before main: it copies .data initial values from flash to RAM and zeroes .bss, so that C globals already hold their declared state when main begins',
          explanation:
            'There is no OS loader on bare metal; the copy-down and zeroing are explicit first instructions, configured by the linker script.',
          hint: 'On a PC the OS loader does it - who plays that role without an OS?',
          difficulty: 'hard',
        },
      ],
    },
    keyTerms: [
      { term: 'Section', definition: 'A categorized byte region: .text (code), .data (initialized globals), .bss (zeroed globals), .rodata (constants).' },
      { term: 'Linker script', definition: 'The build file assigning sections to memory regions - flash and RAM addresses on an MCU.' },
      { term: 'Symbol resolution', definition: 'The linker matching every undefined symbol to exactly one definition across all inputs.' },
      { term: 'Static library', definition: 'A .a archive of object files copied into the executable at link time.' },
      { term: 'Dynamic library', definition: 'A .so/.dll referenced at link time and bound at load time - shared code, runtime dependency.' },
      { term: 'Startup code', definition: 'The code before main that copies .data and zeroes .bss on bare-metal targets.' },
    ],
    revisionSummary: [
      'Pipeline: preprocess -> compile -> assemble -> link; -E/-S/-c stop at each stage.',
      'Sections: .text to flash, .data to RAM (copy-down from flash), .bss zero-filled - no binary cost.',
      'size app prints the section totals: the firmware flash/RAM report in miniature.',
      'Undefined reference = missing definition in the link; multiple definition = duplicated global; library order matters.',
      'Static linking copies code in (deterministic, bigger); dynamic binds at load (shared, runtime-dependent).',
      'Bare metal: linker script places sections; startup code prepares RAM before main.',
    ],
    furtherReading: [
      { label: 'Wikipedia - Object file', url: 'https://en.wikipedia.org/wiki/Object_file', kind: 'article' },
      { label: 'Wikipedia - Static library', url: 'https://en.wikipedia.org/wiki/Static_library', kind: 'article' },
      { label: 'Wikipedia - Dynamic linker', url: 'https://en.wikipedia.org/wiki/Dynamic_linker', kind: 'article' },
      { label: 'Wikipedia - Linker (computing)', url: 'https://en.wikipedia.org/wiki/Linker_(computing)', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'cpg-m10-l3',
    title: 'Debugging: Warnings, Tools and Undefined Behavior',
    summary:
      'Adopt the warnings-as-errors mindset, practice printf debugging and assert, learn the debugger\'s core moves, and build a checklist for the undefined-behavior gallery.',
    objectives: [
      'Build with -Wall -Wextra and triage every warning as a defect.',
      'Instrument code with deliberate printf traces and assert contracts.',
      'Name the debugger\'s core moves: breakpoints, stepping, watching variables.',
      'Recognize the major undefined-behavior patterns and apply a systematic debug method.',
    ],
    whyItMatters:
      'C hands you the knife and no bandages: the difference between a two-minute fix and a two-day hunt is method. Professionals debug by hypothesis - form a theory, instrument it, confirm or eliminate - and they let the compiler and sanitizers do the drudgery first. This lesson packages those habits before the embedded course multiplies the stakes on real hardware.',
    prerequisites: ['cpg-m10-l2', 'cpg-m01-l3', 'cpg-m08-l4'],
    explanation:
      '### Warnings first: the cheapest debugging is prevention\n\n`gcc -Wall -Wextra` reports suspicious constructs before any run: unused variables, implicit conversions losing bits, printf specifier mismatches, comparisons that are always true. `-Werror` promotes them to build failures - the professional default, because a warning that ships is a latent bug. Module 1\'s cascade rule still governs: fix the first diagnostic, rebuild, repeat.\n\n### printf debugging: instrumented observation\n\nThe universal technique: print the state at the boundaries of suspicion.\n\n```\nint clamp(int value, int low, int high) {\n    printf("[clamp] in=%d low=%d high=%d\\n", value, low, high);\n    ...\n}\n```\n\nDone deliberately it becomes a trace: unique tags per site ([clamp], [rx]), values AND identity (which call is this?), and a version that compiles out (a LOG macro behind #if DEBUG from lesson 1) so production ships silent. printf debugging\'s weakness is its blind spot - it shows only what you thought to print, and it disturbs timing (on hardware, a UART print changes the very race you are chasing).\n\n### The debugger: breakpoints, stepping, watches\n\nA debugger (gdb via `gdb ./app`, or your IDE\'s panel) runs the program under control: **breakpoints** stop execution at a line; **step over/into** advances by statement or into calls; **print/watch** reads variable values and live-tracks expressions; **backtrace** shows the call chain that led here. The workflow replaces printf\'s shotgun with a rifle: break at the first suspicious line, inspect actual state, step forward watching the moment the variable becomes wrong. That moment - not the symptom - is the bug\'s address.\n\n### The undefined-behavior gallery\n\nPatterns that compile, sometimes work, and betray you unpredictably: uninitialized reads (module 2), out-of-bounds indexing (module 7), signed overflow (module 2), use-after-free and leaks (module 8), invalid pointer arithmetic (module 8), data races. Their signature: symptoms move when unrelated code changes - the bug is not where it appears. Host tools turn them loud: `gcc -fsanitize=address,undefined` (crash reports at the violation) and valgrind (leak and access audits). On targets without sanitizers, the checklist below substitutes.',
    deepDive:
      '### The hypothesis method, step by step\n\n1. **Reproduce** - find the smallest input that triggers it; a bug you cannot trigger, you cannot verify fixed.\n2. **Characterize** - what exactly is wrong (wrong value? wrong time? crash where)? State it as a sentence.\n3. **Hypothesize** - one mechanism that would produce the symptom: "the flag is never cleared", "the index runs one too far".\n4. **Predict** - what would the variables hold if the hypothesis were true?\n5. **Instrument** - assert, breakpoint, or print the prediction.\n6. **Confirm or eliminate**, then move one step earlier in the code and repeat.\n\nThe discipline that separates this from flailing: ONE hypothesis per pass, and predictions written down before looking. Debuggers make the loop fast; method makes it converge. The embedded course adds the hardware twist: with limited breakpoints and timing-sensitive bugs, the printf/breakpoint choice itself becomes part of the hypothesis.\n\n### assert: contracts that check themselves\n\n`assert(cond)` (from <assert.h>) aborts with file, line and the condition text when cond is false:\n\n```\nint average(const int *data, int n) {\n    assert(data != NULL);\n    assert(n > 0);\n    ...\n}\n```\n\nAsserts document and enforce preconditions for free - and they compile to nothing when NDEBUG is defined (release builds), which is exactly their contract: check what MUST hold if the code is correct, and handle (not assert) what can legitimately happen (a bad input from a wire is an error code, not an assertion). A common firmware split: assert for internal invariants (impossible states, pointer contracts), error returns for external inputs (user data, sensor values).\n\n### Writing the bug down: the repro-first habit\n\nEvery real team\'s bug tracker expects a reproduction case, and writing it is half the debugging: a 10-line main that triggers the fault in isolation has already excluded the other 2000 lines. The habit scales down to this course: when your program misbehaves, extract the smallest failing loop or function into a fresh file, run it under -fsanitize=address,undefined, and read the first report line. Most course-size bugs die at that step; the ones that survive have taught you precisely where they live.',
    examples: [
      {
        title: 'assert as a function contract',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <assert.h>\n\nint average(const int *data, int n) {\n    assert(data != NULL);        /* internal contract: caller passes a real array  */\n    assert(n > 0);               /* internal contract: averaging nothing is a bug  */\n\n    int total = 0;\n    for (int i = 0; i < n; i++) {\n        total += data[i];\n    }\n    return total / n;\n}\n\nint main(void) {\n    int readings[3] = {10, 20, 30};\n    printf("average = %d\\n", average(readings, 3));\n    return 0;\n}',
        explanation: [
          'The asserts state the preconditions in the function itself: a NULL array or zero count is a CALLER bug, and the abort names file, line and condition the moment it happens.',
          'With the contracts satisfied, the computation runs: 10 + 20 + 30 = 60, 60 / 3 = 20.',
          'In a release build (-DNDEBUG) the asserts vanish; the error-path design (module 8\'s status returns) covers the inputs users can actually send.',
          'Output: `average = 20`',
        ],
      },
      {
        title: 'A printf trace through two calls',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint clamp(int value, int low, int high) {\n    printf("[clamp] in=%d low=%d high=%d\\n", value, low, high);\n    if (value < low) {\n        printf("[clamp] raised to low\\n");\n        return low;\n    }\n    if (value > high) {\n        printf("[clamp] capped at high\\n");\n        return high;\n    }\n    printf("[clamp] unchanged\\n");\n    return value;\n}\n\nint main(void) {\n    int a = clamp(120, 0, 100);\n    int b = clamp(-5, 0, 100);\n    printf("a=%d b=%d\\n", a, b);\n    return 0;\n}',
        explanation: [
          'Every call prints its inputs with a unique tag ([clamp]) - when several functions trace, the tags make the interleaved log readable.',
          'First call: in=120 exceeds high, so the cap branch fires and returns 100. Second call: in=-5 sits below low, raised to 0.',
          'The final line correlates the traces with the results: a=100 b=0 - you can now verify each return against its trace without stepping through a debugger.',
          'In production, the same lines would hide behind a LOG macro compiled out with #if DEBUG (lesson 1) - traces are scaffolding, not furniture.',
          'Output:\n```\n[clamp] in=120 low=0 high=100\n[clamp] capped at high\n[clamp] in=-5 low=0 high=100\n[clamp] raised to low\na=100 b=0\n```',
        ],
      },
    ],
    tables: [
      {
        caption: 'The undefined-behavior gallery and its detectors',
        headers: ['Pattern', 'Typical origin', 'Host detector'],
        rows: [
          ['Uninitialized read', 'Missing initializer (module 2)', '-Wall (use-uninitialized warnings), valgrind'],
          ['Out-of-bounds access', 'Wrong loop bound, bad index (module 7)', '-fsanitize=address'],
          ['Signed overflow', 'Unplanned arithmetic (module 2)', '-fsanitize=undefined'],
          ['Use-after-free / double free', 'Pointer lifecycle (module 8)', '-fsanitize=address'],
          ['Invalid pointer arithmetic', 'Decay/subtraction misuse (module 8)', '-fsanitize=undefined'],
          ['Dangling pointer to local', 'Returning locals (module 8)', '-Wall return-local-addr, ASan'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Debugging by changing random things and rerunning ("shotgun debugging").',
        fix:
          'One hypothesis per pass, with a written prediction and an instrument that tests it. Random edits destroy the repro you rely on and can introduce new bugs into the search.',
      },
      {
        mistake: 'Leaving debug prints in shipped code (or asserting on bad user input).',
        fix:
          'Gate traces behind #if DEBUG and compile them out for release; assert only internal invariants, and return error codes for anything external (wire data, user input) that can legitimately be wrong.',
      },
      {
        mistake: 'Trusting a program that "works on my machine" over a sanitizer report.',
        fix:
          'Undefined behavior can work on one compiler and corrupt on another - passing today is not evidence. Host CI should run the suite under -fsanitize=address,undefined; treat any report as a bug even when output looks right.',
      },
      {
        mistake: 'Reading the crash site as the bug site.',
        fix:
          'The segfault lands where corruption becomes fatal, not where it began. Walk the backtrace backwards, and check the variables feeding the crash line for how they became invalid (the gallery table maps symptoms to origins).',
      },
    ],
    guidedPractice: {
      title: 'Debug a seeded bug by hypothesis',
      brief:
        'This program should print the average of the array\'s first n elements but prints a wrong number. Follow the method: (1) characterize from the output, (2) hypothesize, (3) add ONE assert or printf to test it, (4) fix, (5) state the fix in one sentence.\n\n```\n#include <stdio.h>\n\nint avg_n(const int *data, int n) {\n    int total = 0;\n    for (int i = 0; i <= n; i++) {\n        total += data[i];\n    }\n    return total / n;\n}\n\nint main(void) {\n    int readings[4] = {10, 20, 30, 40};\n    printf("avg=%d\\n", avg_n(readings, 4));\n    return 0;\n}\n```',
      expectedBehavior:
        'The loop bound i <= n touches readings[4] - out of bounds (module 7). A print of i and data[i] in the last iteration (or assert(i < n) inside the loop) exposes it. Fix: `for (int i = 0; i < n; i++)`. Correct output: avg=25 (100 / 4). The wrong output depends on the garbage byte after the array - the moving-symptom signature of UB.',
      hints: [
        'The computed total is too high or varies between runs - a read past the end fits that exactly.',
        'Instrument the loop: print i and data[i] each pass and watch iteration 4.',
        'After fixing, rebuild with -fsanitize=address and confirm the report is gone.',
      ],
    },
    practiceExercises: [
      {
        title: 'Sanitizer sweep of your own code',
        brief:
          'Take your three longest programs from modules 7-9, rebuild each with `gcc -Wall -Wextra -fsanitize=address,undefined`, and run. Record every warning and sanitizer report, fix them, and rerun until clean. Note which issues were real bugs versus style.',
        expectedBehavior:
          'A clean sweep: no warnings, no ASan/UBSan reports. Expected catches include missing initializers, off-by-one bounds, and printf specifier mismatches. The reflection: which of the caught items would have failed silently on a plain build?',
        hints: [
          'Read the FIRST report fully - sanitizers stop at the first violation, and fixing it reveals the next.',
          'ASan reports include an allocation/free stack trace - follow it to the owning code.',
          'Keep the flags in your normal build command; they are cheap on hosts.',
        ],
      },
      {
        title: 'Write the repro, not the theory',
        brief:
          'A teammate reports: "sometimes the sensor average comes out negative". Write a 15-line-or-less standalone program that reproduces a plausible cause (an uninitialized accumulator or a signed/unsigned comparison gone wrong), demonstrates the wrong output, and includes the assert that would have caught it. Label which line is the bug in a comment.',
        expectedBehavior:
          'A minimal program - e.g. `int total; for (...) total += data[i];` without the initializer, averaging values whose sum should be positive - printing a garbage/negative total non-deterministically, with `assert(total == 100)` (or an initialized total) flagging it. The comment marks the uninitialized declaration as the defect.',
        hints: [
          'The repro isolates ONE mechanism - resist importing the whole driver.',
          'Uninitialized locals (module 2) and signed/unsigned comparisons (module 2) both produce "sometimes wrong" averages.',
          'The assert states the invariant the correct code maintains - it fails at the exact statement that violated it.',
        ],
      },
    ],
    assessment: {
      title: 'Debugging checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which compile flags represent the professional baseline for a C project?',
          options: [
            'No flags - default behavior is fastest',
            '-Wall -Wextra (ideally with -Werror)',
            '-O3 only',
            '-std=c89',
          ],
          answer: '-Wall -Wextra (ideally with -Werror)',
          explanation:
            'Warnings are free static analysis; -Wall -Wextra enables the high-value set, and -Werror keeps any warning from being ignored into the codebase. Optimization and standard selection are separate decisions.',
          hint: 'Which flags turn suspicious code into build messages?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n#include <assert.h>\n\nint average(const int *data, int n) {\n    assert(n > 0);\n    int total = 0;\n    for (int i = 0; i < n; i++) {\n        total += data[i];\n    }\n    return total / n;\n}\n\nint main(void) {\n    int readings[3] = {10, 20, 30};\n    printf("avg=%d\\n", average(readings, 3));\n    return 0;\n}',
          options: ['avg=20', 'avg=60', 'avg=30', 'the assert aborts the program'],
          answer: 'avg=20',
          explanation:
            'The contract holds (n = 3 > 0), so execution continues: total 60, average 60 / 3 = 20. The assert fires only on violation.',
          hint: 'Does the asserted condition hold here?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A crash during free() usually means the bug is in the free call itself.',
          answer: 'false',
          explanation:
            'Crash sites are where corruption becomes visible, not where it began - a double free or heap corruption typically originates lines (or functions) earlier. Follow the backtrace and audit the pointer lifecycle feeding the call.',
          hint: 'Where does corruption START versus where does it LAND?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A firmware average sometimes returns a huge negative number, only in release builds. Identify the most probable gallery entry and explain why the build type changes the symptom.',
          answer: 'Uninitialized read (or another UB pattern) - debug builds may zero memory the release build reuses differently, so garbage values differ; undefined behavior\'s symptom shifts with codegen, which is the moving-symptom signature - fix the missing initializer, not the build flags',
          explanation:
            'Debug vs release changes memory contents and optimization; UB exploits neither reliably. The fix is removing the undefined behavior, after which both builds agree.',
          hint: 'Which construct has a value that differs between builds by definition?',
          difficulty: 'hard',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'List the six steps of the hypothesis debugging method in order.',
          answer: 'Reproduce (smallest trigger), characterize (state exactly what is wrong), hypothesize (one mechanism), predict (what variables would hold), instrument (assert/print/breakpoint the prediction), confirm-or-eliminate and step earlier',
          explanation:
            'The method converges because each pass tests exactly one mechanism against a written prediction - the opposite of shotgun debugging.',
          hint: 'First make it happen reliably; last, decide what the instrument told you.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'printf debugging', definition: 'Instrumenting suspected paths with tagged state prints; compile-out-able via a LOG macro.' },
      { term: 'assert', definition: 'Aborts with file/line/condition on a violated internal contract; removed by NDEBUG in release builds.' },
      { term: 'Breakpoint', definition: 'A debugger stop at a line; with stepping and watches, replaces shotgun prints with targeted inspection.' },
      { term: 'Backtrace', definition: 'The debugger\'s call-chain report at a stop - how a crash site is traced back to its origin.' },
      { term: 'Sanitizer', definition: 'Compiler-instrumented checking (-fsanitize=address,undefined) that aborts with a report at the UB violation.' },
      { term: 'Shotgun debugging', definition: 'Random change-and-rerun attempts - the anti-pattern the hypothesis method replaces.' },
    ],
    revisionSummary: [
      'Build with -Wall -Wextra; promote to -Werror so warnings cannot ship.',
      'Instrument deliberately: unique tags, inputs plus results, compiled out for release.',
      'assert enforces internal invariants; external inputs get error returns, not aborts.',
      'Debugger workflow: break, inspect, step, watch - aim at the moment the value goes wrong.',
      'UB symptom signature: it moves when unrelated code changes - fix the pattern, not the symptom.',
      'Hypothesis method: reproduce, characterize, hypothesize, predict, instrument, confirm/eliminate.',
    ],
    furtherReading: [
      { label: 'GCC - Warning Options', url: 'https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html', kind: 'docs' },
      { label: 'cppreference - assert', url: 'https://en.cppreference.com/w/c/error/assert', kind: 'docs' },
      { label: 'Wikipedia - Undefined behavior', url: 'https://en.wikipedia.org/wiki/Undefined_behavior', kind: 'article' },
      { label: 'Wikipedia - Debugging', url: 'https://en.wikipedia.org/wiki/Debugging', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
