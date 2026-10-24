import type { TutorialLesson } from '../types';

export const module01Lessons: TutorialLesson[] = [
  {
    id: 'cpg-m01-l1',
    title: 'What Is a Program? From Source to Executable',
    summary:
      'Define what a program really is, follow a C source file through the compile and link stages, and understand what the compiler and linker each contribute.',
    objectives: [
      'Describe a program as a sequence of machine instructions stored in memory and executed one at a time.',
      'Name the stages that turn a .c file into a runnable executable: preprocessing, compilation, assembly and linking.',
      'Explain the division of labor between the compiler (translation and checking) and the linker (symbol resolution).',
      'Explain why C, rather than a scripting language, dominates embedded and firmware work.',
    ],
    whyItMatters:
      'Every microcontroller you will ever program - an STM32, an AVR, an RP2040 - executes machine code fetched from flash, nothing else. C is the language the industry chose because it compiles down to small, predictable, hardware-faithful machine code with almost no hidden runtime. If you understand what the toolchain does between your keyboard and the chip, compiler errors stop being noise and become directions.',
    prerequisites: [],
    explanation:
      'A **program** is a sequence of machine instructions - add this, compare that, jump somewhere else - stored in memory and executed by a processor one at a time. You do not write machine instructions directly. You write **source code**: text, in this case C, that a program called a **compiler** translates into machine code.\n\n### The journey of a .c file\n\nBetween `main.c` and a runnable executable sit four stages, all usually invoked by one `gcc` command:\n\n- **Preprocessing** - a text manipulation pass that pastes in header files and expands `#define` macros. Output is still C.\n- **Compilation** - the real translation: C becomes assembly language for the target processor. This is also where most error checking happens: syntax errors, unknown names, type mistakes.\n- **Assembly** - the assembler turns assembly text into an **object file** (`.o`), a binary container of machine code plus a bookkeeping table of symbols the code needs but does not own.\n- **Linking** - the **linker** merges one or more object files (plus prebuilt libraries), matches every symbol a file needs against a symbol some file provides, and lays out one final **executable**.\n\nThe split between compiler and linker explains the two big families of build errors. `error: expected \';\'` comes from the compiler while translating one file. `undefined reference to \'read_sensor\'` comes from the linker when no object file ever provided a function someone promised.\n\n### Why C owns embedded\n\nPython and JavaScript need an interpreter and megabytes of runtime; a Cortex-M0 has 16 KB of flash and no operating system. C offers three things embedded work cannot live without: direct memory access through pointers (you can read and write a hardware register address), a tiny runtime (your program starts almost at the metal), and predictable translation (you can usually guess what machine code a line produces). That predictability is why this course keeps asking how big a value is and where it lives.',
    deepDive:
      '### What the linker actually resolves\n\nEvery object file carries two symbol lists: **defined** symbols (functions and variables it owns) and **undefined** symbols (names it uses but does not own). The linker walks both lists across all inputs. A name needed twice is fine - many files can call `printf`. A name needed but never defined is a link error. A name defined twice by two object files is also an error: the linker cannot choose. This is why you never put a function body in a header included by several `.c` files - each include makes another definition.\n\n### The edit-compile-run cycle\n\nDevelopment loops through: edit source, recompile, run, observe. Two habits matter from day one. First, recompile after every edit - the executable on disk is stale the moment you touch the source, and running a stale binary while debugging new code wastes hours. Second, treat the first compiler error as the real one: later errors are frequently avalanches caused by the first, so fix from the top of the list down and rebuild often.\n\n### Executables and firmware differ only in loading\n\nOn a PC the operating system loads the executable into memory and starts it. On a microcontroller the executable image is flashed into non-volatile memory, and the reset vector points the CPU at its first instruction. The artifact is the same kind of thing - linked machine code - so everything you learn here about the build pipeline transfers directly to the embedded course.',
    examples: [
      {
        title: 'A first C program, line by line',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, signals!\\n");\n    return 0;\n}',
        explanation: [
          '`#include <stdio.h>` - preprocessor directive. Before compilation, the contents of the standard header `stdio.h` are pasted here. It declares `printf`, which is why the compiler knows how to check your call.',
          '`int main(void)` - every C program starts at a function named `main`. The leading `int` is the return type; the `(void)` list means it accepts no arguments.',
          '`{` and `}` - braces delimit the function body. Everything between them belongs to `main`.',
          '`printf("Hello, signals!\\n");` - a statement calling the standard library. `\\n` is an escape sequence for a newline, so the output ends with a line break. The semicolon terminates the statement - forgetting it is the classic first-day error.',
          '`return 0;` - returns a status code to the environment: 0 conventionally means success.',
          'Running the compiled executable prints exactly one line: `Hello, signals!`',
        ],
      },
      {
        title: 'The build pipeline as commands',
        language: 'text',
        code:
          '# one gcc command does all four stages:\ngcc main.c -o hello\n\n# the same thing, stage by stage:\ngcc -E main.c -o main.i    # preprocess only\ngcc -S main.i -o main.s    # compile to assembly\ngcc -c main.s -o main.o    # assemble to object file\ngcc main.o -o hello        # link to executable',
        explanation: [
          'Line 2 is what you will type 95% of the time: one command, four stages, one executable named `hello`.',
          '`-E` stops after preprocessing. Inspecting `main.i` shows exactly what `#include` pasted in - a great way to demystify headers.',
          '`-S` stops after compilation. `main.s` is human-readable assembly for your target CPU.',
          '`-c` stops after assembly, leaving `main.o`. Object files are what multi-file projects link together.',
          'The final command runs only the linker, joining object files into the executable. In firmware projects this same stage produces the `.elf`/`.bin` image that gets flashed.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'From source code to executable',
        content:
          '  main.c        main.i         main.s        main.o      hello (executable)\n    |              |              |             |             |\n    v              v              v             v             v\n  +-----------+ +---------+ +------------+ +----------+ +---------------+\n  |PREPROCESS | |COMPILE  | |ASSEMBLE    | |LINK      | | run by OS /   |\n  |(#include, | |(C ->    | |(assembly ->| |(merge .o | | flashed to    |\n  | #define)  | | asm)    | | machine    | | files,   | | MCU flash     |\n  |           | |         | | code)      | | resolve  | |               |\n  |           | |         | |            | | symbols) | |               |\n  +-----------+ +---------+ +------------+ +----------+ +---------------+\n     text          text          binary        binary        binary\n\n  Compiler proper = COMPILE + ASSEMBLE   (works on ONE file at a time)\n  Linker          = LINK                (works on ALL files together)',
        caption:
          'The four build stages. Preprocessing, compilation and assembly each see exactly one translation unit; only the linker sees the whole program.',
      },
    ],
    commonMistakes: [
      {
        mistake:
          'Editing the source file but running the old executable, then wondering why the change had no effect.',
        fix:
          'Rebuild after every edit before you run. In the command line that means re-running `gcc ... -o hello` each time; in an IDE, rebuilding is usually part of Run. When behavior does not match the code on screen, your first hypothesis should be a stale binary.',
      },
      {
        mistake:
          'Expecting the compiler to catch logic errors, such as dividing by the wrong variable.',
        fix:
          'The compiler only enforces the language rules: syntax, declared names, type consistency. It has no idea that averaging over `n-1` instead of `n` is wrong. Logic errors are found by tracing, testing and debugging - which is why this course keeps demanding you predict output before running anything.',
      },
      {
        mistake:
          'Thinking the compiler runs the program, as an interpreter does.',
        fix:
          'A compiler translates source into machine code ahead of time and produces a file; an interpreter executes source directly, line by line, at run time. C is compiled: nothing happens until you run the produced executable. That separation is exactly why compile-time and run-time errors feel different.',
      },
    ],
    guidedPractice: {
      title: 'Map errors to build stages',
      brief:
        'For each symptom below, decide which stage produced it - preprocessing, compilation, assembly, linking or runtime - before looking at the answer in expectedBehavior.\n\n1. `gcc` prints `main.c:4:1: error: unknown type name \'unit8_t\'`\n2. `gcc` prints `undefined reference to \'crc16\'`\n3. The program compiles and runs but prints the wrong average.\n4. `gcc` prints `crc.h: No such file or directory`',
      expectedBehavior:
        '1 is a compilation error (a mistyped type name - the fix is `uint8_t` from <stdint.h>). 2 is a link error (nothing defined crc16; add the missing .c to the build). 3 is a logic error, invisible to the toolchain (fix the algorithm). 4 is a preprocessing error (the header file was not found; fix the #include path).',
      hints: [
        'Preprocessing errors are about files and directives; compilation errors are about the C language itself.',
        'Anything with the phrase `undefined reference` belongs to the linker.',
        'If the program built and ran, the toolchain succeeded - the bug is yours, not the compiler.',
      ],
    },
    practiceExercises: [
      {
        title: 'Build the same program two ways',
        brief:
          'Type in the Hello program from the example, build it once with the one-line `gcc` command and once stage by stage (-E, -S, -c, link). Open `main.i` and `main.s` and skim them.',
        expectedBehavior:
          'All routes produce a working executable printing `Hello, signals!`. The .i file contains stdio.h contents plus your one printf; the .s file contains assembly including a call to printf.',
        hints: [
          'If gcc is missing, install a compiler suite: MinGW-w64 on Windows, build-essential on Debian/Ubuntu, Xcode command line tools on macOS.',
          'Name intermediate files explicitly with -o so you can inspect them.',
          'Finding printf in the assembly shows the call; the printf implementation itself lives in the prebuilt C library that the linker attaches.',
        ],
      },
      {
        title: 'Explain the two error families in your own words',
        brief:
          'Write two sentences: one defining what a compiler does, one defining what a linker does. Then classify: (a) misspelled variable name, (b) called function that was declared but never defined, (c) forgetting a closing brace.',
        expectedBehavior:
          'Compiler: translates one C file into machine code and enforces language rules. Linker: combines object files and resolves cross-file symbol references. (a) compile-time, (b) link-time, (c) compile-time.',
        hints: [
          'One file at a time versus all files together is the key asymmetry.',
          'Declared but not defined is the classic linker scenario.',
          'A missing brace leaves the parser inside a construct, so parsing fails - compilation stage.',
        ],
      },
    ],
    assessment: {
      title: 'Fundamentals checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which tool combines object files and resolves cross-file function references to produce an executable?',
          options: ['Preprocessor', 'Compiler', 'Assembler', 'Linker'],
          answer: 'Linker',
          explanation:
            'The linker merges object files and libraries and resolves every undefined symbol against a definition elsewhere. The compiler and assembler each work on a single file.',
          hint: 'It is also the stage that reports `undefined reference`.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'The CPU executes your C source code directly.',
          answer: 'false',
          explanation:
            'The CPU executes machine code. C source is translated to machine code by the toolchain; the source file itself is never executed.',
          hint: 'What does the linker emit, and what does the processor fetch?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'What exactly does this program print when built and run?',
          code: '#include <stdio.h>\n\nint main(void) {\n    printf("A%dB\\n", 2 + 3);\n    return 0;\n}',
          options: ['A2+3B', 'A5B', 'A23B', 'AB5'],
          answer: 'A5B',
          explanation:
            'printf replaces %d with the evaluated argument 2 + 3, which is 5, and \\n ends the line. The literal text around it - A and B - is printed unchanged.',
          hint: 'The expression in the argument list is evaluated before printing.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'You add a call to a function declared in a header but forget to add its .c file to the build. At which stage does the build fail, and what is the error called?',
          answer: 'Link stage - undefined reference',
          explanation:
            'Compilation of the calling file succeeds because the header declared the function. The linker then finds no definition anywhere in the object files and reports an undefined reference.',
          hint: 'Declaration satisfied the compiler; definition is the job of some object file.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Source code', definition: 'Human-readable program text, in this course C, that the toolchain translates into machine code.' },
      { term: 'Compiler', definition: 'The tool that translates C into target-specific machine code while enforcing the language rules; operates on one file at a time.' },
      { term: 'Object file', definition: 'A binary (.o) containing machine code plus tables of defined and undefined symbols, produced by the assembler.' },
      { term: 'Linker', definition: 'The tool that combines object files and libraries, resolves symbol references, and emits the final executable.' },
      { term: 'Executable', definition: 'The linked, loadable machine-code image the CPU (or operating system) runs.' },
      { term: 'Toolchain', definition: 'The chained set of build tools - preprocessor, compiler, assembler, linker - usually driven by one gcc command.' },
    ],
    revisionSummary: [
      'A program is machine instructions in memory; C source is text that must be compiled and linked first.',
      'Four stages: preprocess (paste headers, expand macros), compile (C to assembly), assemble (to .o), link (merge and resolve symbols).',
      'The compiler works on one translation unit at a time; the linker is the only stage that sees the whole program.',
      'Compile errors mean the language rules were broken; link errors mean a promised symbol was never defined.',
      'C dominates embedded work because of direct memory access, minimal runtime and predictable translation.',
      'Always rebuild before running after an edit - stale executables are a top time-waster.',
    ],
    furtherReading: [
      { label: 'Wikipedia - C (programming language)', url: 'https://en.wikipedia.org/wiki/C_(programming_language)', kind: 'article' },
      { label: 'Wikipedia - Linker (computing)', url: 'https://en.wikipedia.org/wiki/Linker_(computing)', kind: 'article' },
      { label: 'GCC online documentation', url: 'https://gcc.gnu.org/onlinedocs/', kind: 'docs' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'cpg-m01-l2',
    title: 'Anatomy of a C Program: main, Headers and Statements',
    summary:
      'Dissect a complete C program piece by piece - includes, main, declarations, statements, comments - and learn the formatting conventions professionals use.',
    objectives: [
      'Identify every structural element of a small C program and state what each contributes.',
      'Write correct comments with both // and /* */ and know when each style fits.',
      'Translate a simple engineering formula into a working main() with well-chosen variable names.',
      'Predict the exact printed output of a small program by tracing its statements.',
    ],
    whyItMatters:
      'Firmware codebases are read far more often than they are written - by teammates, reviewers, and by you six months later. Recognizing program anatomy at a glance, and writing comments where they add information rather than noise, is what makes a 2000-line driver navigable instead of frightening.',
    prerequisites: ['cpg-m01-l1'],
    explanation:
      'Every C program you write shares the same skeleton. Learn it once and every codebase you open becomes familiar.\n\n### The skeleton\n\n```\n#include <stdio.h>        <- preprocessor directives, at the top\n\nint main(void) {          <- entry point: execution starts here\n    declarations;         <- create variables\n    statements;           <- do the work, one semicolon-terminated step at a time\n    return 0;             <- report success to the environment\n}\n```\n\n**Headers** (`#include <stdio.h>`) bring in declarations of library functions so the compiler can check your calls. Angle brackets `<...>` mean a system header; quotes `"..."` mean a header of your own - a distinction that becomes structural in the modules on functions and the build process.\n\n**main** is the entry point. The portable signature is `int main(void)`, returning an `int` status. When `main` returns, the program ends; the returned value reaches the operating system, where scripts and CI systems test it (0 means success).\n\n**Statements** are the executable steps: assignments, function calls, control-flow constructs. Each ends with a semicolon. Execution flows top to bottom through the block unless a control statement says otherwise - a property you will exploit for traces throughout this course.\n\n### Comments\n\nC has two comment forms. `// line comment` runs to the end of the line - use it to explain a non-obvious step. `/* block comment */` spans any number of lines - use it for file headers and to describe contracts. Comments should record *why*: the reader can already see *what* the code does.',
    deepDive:
      '### Whitespace is free, so spend it\n\nThe compiler ignores indentation and blank lines entirely - `int x;int y;` compiles the same as two tidy lines. But humans parse by layout. Professional style: one statement per line, four spaces of indentation per block, braces aligned with the construct that opened them, and a blank line between logical groups. Pick a consistent style (many embedded teams standardize on a published style guide) and let the discipline carry into every file you touch.\n\n### Why (void) matters\n\n`int main(void)` and `int main()` look identical but mean different things in C: an empty parameter list declares "unspecified arguments", while `(void)` explicitly promises "no arguments". Writing `(void)` lets the compiler catch accidental calls with arguments - a small rigor that scales. The same habit applies to every no-argument function you write.\n\n### Exit status in practice\n\n`return 0` from main is not decoration. On any host system, `echo $?` (Linux/macOS) or `echo %ERRORLEVEL%` (Windows cmd) shows the returned value after your program exits. Build scripts and test harnesses run your programs and branch on that status. Firmware on bare metal has no OS to return to - there the equivalent is falling into an infinite loop after setup, but during this course everything runs on a host, so the status code is a real, observable contract.',
    examples: [
      {
        title: 'An ADC reading converted to volts',
        language: 'c',
        code:
          '#include <stdio.h>\n\n/* Convert a 10-bit ADC sample to a voltage using\n   an educational linear model: 0..1023 counts maps\n   to 0..3.30 V. This program models the sensor in\n   plain integers - it does not touch any hardware. */\nint main(void) {\n    int adc_counts = 1023;                 /* raw sample          */\n    int volts_x100;                        /* voltage in hundredths */\n\n    volts_x100 = (adc_counts * 330) / 1023;\n\n    printf("ADC counts: %d\\n", adc_counts);\n    printf("Voltage: %d.%02d V\\n", volts_x100 / 100, volts_x100 % 100);\n    return 0;\n}',
        explanation: [
          'The block comment at the top states the model and its assumptions - exactly the "why" comments are for.',
          '`int adc_counts = 1023;` is a declaration with an initializer: it creates an integer variable and gives it its first value in one step.',
          '`volts_x100` is declared first and assigned later, showing that declaration and assignment are separate steps.',
          '`(adc_counts * 330) / 1023` computes 1023 * 330 = 337590, then 337590 / 1023 = 330. The parentheses document intent even though `*` already binds before `/`.',
          'Working in hundredths of a volt (330 means 3.30 V) avoids floating point entirely - a common and excellent embedded habit.',
          '`%d.%02d` prints the integer part 3 and the fractional part 30 padded to two digits, so the output is `Voltage: 3.30 V`.',
          'Complete output:\n```\nADC counts: 1023\nVoltage: 3.30 V\n```',
        ],
      },
      {
        title: 'Comment styles and where they help',
        language: 'c',
        code:
          '#include <stdio.h>\n\n/* rc_filter.c - educational single-pole low-pass model.\n   y[n] = y[n-1] + (x[n] - y[n-1]) / 4          */\n\nint main(void) {\n    int y = 0;          // filtered output\n    int x = 100;        // new input sample\n\n    // Shift the output one quarter of the way\n    // toward the input each iteration.\n    y = y + (x - y) / 4;\n\n    printf("y = %d\\n", y);\n    return 0;\n}',
        explanation: [
          'The block comment documents the algorithm and flags it as an educational model.',
          'Line comments label each variable so a reader never wonders what x and y mean.',
          'The step comment explains the intent (a quarter-step toward the input), not the C mechanics.',
          'Tracing: (100 - 0) / 4 = 25, so y = 0 + 25 = 25. The program prints `y = 25`.',
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Forgetting the semicolon at the end of a statement.',
        fix:
          'Every simple statement ends with `;`. The compiler usually points at the following line - read the error as "the previous statement was never terminated" and look one line up. Note that braces `{ }` and preprocessor directives such as `#include` do not take semicolons.',
      },
      {
        mistake: 'Writing `void main()` or omitting the return type.',
        fix:
          'The portable entry point is `int main(void)` with `return 0;`. `void main` happens to work on some hobbyist compilers but is not standard C and will be rejected or flagged on professional toolchains.',
      },
      {
        mistake: 'Commenting every line with a restatement of the code, like `/* add 1 to i */` above `i++;`.',
        fix:
          'Comments that repeat the code rot: when the code changes, they lie. Comment intent and constraints (`/* counts must fit in 10 bits per datasheet */`), not mechanics. A good test: if the comment would be obvious to someone who knows C, delete it.',
      },
    ],
    guidedPractice: {
      title: 'Extend the voltage program',
      brief:
        'Starting from the ADC example, add a second variable `adc_counts2 = 512` and print its voltage the same way. Before running, write down the two output lines you expect.',
      starterCode:
          '#include <stdio.h>\n\nint main(void) {\n    int adc_counts = 1023;\n    int volts_x100;\n\n    volts_x100 = (adc_counts * 330) / 1023;\n    printf("ADC counts: %d\\n", adc_counts);\n    printf("Voltage: %d.%02d V\\n", volts_x100 / 100, volts_x100 % 100);\n\n    /* TODO: add adc_counts2 = 512 and print its voltage */\n\n    return 0;\n}',
      expectedBehavior:
        'With adc_counts2 = 512: 512 * 330 = 168960, 168960 / 1023 = 165 (integer division), so the extra output is `ADC counts: 512` and `Voltage: 1.65 V`. If you predicted 1.66 you forgot that integer division truncates.',
      hints: [
        'Declare the second variable next to the first, initialize it, then repeat the two-step pattern.',
        'You need a second pair of variables (or reuse volts_x100 after printing) - decide deliberately.',
        '512 is not full scale: 512 * 330 = 168960, and 1023 does not divide that evenly. Integer division rounds toward zero.',
      ],
    },
    practiceExercises: [
      {
        title: 'Celsius to Fahrenheit, integer edition',
        brief:
          'Write a program with `int celsius = 25;` that computes Fahrenheit as `(celsius * 9) / 5 + 32` and prints both values on one line using a single printf call.',
        expectedBehavior:
          'With celsius = 25 the computation is 25 * 9 = 225, 225 / 5 = 45, 45 + 32 = 77. Output: `celsius=25 fahrenheit=77` (your label text may differ, the numbers must match).',
        hints: [
          'One printf can take two %d placeholders, filled left to right from the argument list.',
          'Multiply before dividing: (25 * 9) / 5 would be wrong as 25 * (9 / 5).',
          'Keep everything in int - no floating point needed for whole degrees.',
        ],
      },
      {
        title: 'Document a formula for the next engineer',
        brief:
          'Take your Celsius program and add (1) a block comment stating the conversion formula and its valid input range, and (2) a line comment explaining why the multiplication happens before the division.',
        expectedBehavior:
          'The block comment states something like "F = C * 9/5 + 32, valid for C in -40..125". The line comment explains that dividing 9/5 first would yield 1 in integer arithmetic, losing precision.',
        hints: [
          'State the assumption, not the syntax - what would a reader need to know to modify the code safely?',
          'Try writing 9 / 5 as its own experiment to see the integer-division trap firsthand.',
          'A comment that prevents one future bug has already paid for itself.',
        ],
      },
    ],
    assessment: {
      title: 'Program anatomy checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which line is the correct, portable entry point of a C program?',
          options: ['void main()', 'int main(void)', 'function main()', 'start()'],
          answer: 'int main(void)',
          explanation:
            'Standard C defines main as returning int and taking either (void) or (int argc, char *argv[]). The (void) form explicitly declares that it accepts no arguments.',
          hint: 'Two things are specified: the return type and the parameter list.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    int counts = 300;\n    int half = counts / 2;\n    printf("half=%d\\n", half);\n    return 0;\n}',
          options: ['half=150', 'half=300/2', 'half=150.0', 'half='],
          answer: 'half=150',
          explanation:
            'The initializer runs first (300), then 300 / 2 = 150 in integer division, and printf substitutes it for %d. The label half= is literal text.',
          hint: 'Trace the two statements in order, then fill the placeholder.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'The line `#include <stdio.h>` ends with a semicolon.',
          answer: 'false',
          explanation:
            'Preprocessor directives are not C statements; they are one-line instructions to the preprocessor and take no semicolon. Adding one can cause confusing errors downstream.',
          hint: 'Only statements inside the function body end with semicolons.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'This program fails to compile. What is wrong and what error would you expect?',
          code: '#include <stdio.h>\n\nint main(void) {\n    printf("up\\n")\n    return 0;\n}',
          answer: 'Missing semicolon after the printf call - the compiler reports an error such as expected \';\' before return',
          explanation:
            'The printf statement was never terminated. GCC points at the line after the offence with a message like `error: expected \';\' before \'return\'`. The fix is the missing semicolon at the end of the printf line.',
          hint: 'Look at what separates the two statements in the body.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt:
            'In one sentence: what is the difference between a comment that says what and a comment that says why, and which one belongs in code?',
          answer: 'What-comments restate the code and rot quickly; why-comments record intent, constraints and assumptions, and those are the ones worth writing.',
          explanation:
            'Readers can already see what the code does; the durable information is the reasoning behind choices, ranges, and trade-offs. A what-comment that drifts out of date is worse than none.',
          hint: 'Which kind becomes false when the code is edited?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Header', definition: 'A file of declarations pulled in by #include; <angle brackets> select system headers, "quotes" select project headers.' },
      { term: 'Entry point', definition: 'The function where execution begins; in C it is main, and returning from it ends the program.' },
      { term: 'Statement', definition: 'One executable step of a program, terminated by a semicolon.' },
      { term: 'Declaration', definition: 'Code that introduces a name and its type, e.g. int x; creating a variable.' },
      { term: 'Initializer', definition: 'The value supplied at declaration, as in int x = 5; which creates and sets x in one step.' },
      { term: 'Block comment', definition: 'A /* ... */ comment spanning any number of lines, used for file and function documentation.' },
    ],
    revisionSummary: [
      'Every program has the same skeleton: includes, main, declarations, statements, return 0.',
      'Execution flows top to bottom through main; returning from main ends the program with a status code.',
      'Two comment forms: // to end of line, /* ... */ across lines - comment why, not what.',
      'Whitespace and indentation are ignored by the compiler but carry the structure for human readers.',
      'Integer division truncates; computing in scaled integers (hundredths of a volt) avoids floating point.',
      'Predict output by tracing statements in order before ever running the program.',
    ],
    furtherReading: [
      { label: 'cppreference - C language structure', url: 'https://en.cppreference.com/w/c/language', kind: 'docs' },
      { label: 'Wikipedia - Entry point (main)', url: 'https://en.wikipedia.org/wiki/Entry_point', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'cpg-m01-l3',
    title: 'Compile-Time Errors vs Runtime Errors',
    summary:
      'Learn the three failure families - compile errors, link errors and runtime bugs - read real diagnostics, and adopt a repeatable method for fixing the first error first.',
    objectives: [
      'Classify any build or execution failure as a compile-time, link-time or runtime problem.',
      'Read a gcc diagnostic: file, line, severity (warning vs error), and message.',
      'Explain why one compile error often triggers a cascade of follow-on errors.',
      'Recognize the runtime danger that compiles and runs perfectly: silent wrong answers from logic bugs.',
    ],
    whyItMatters:
      'On a bench, the difference between a five-minute fix and a five-hour hunt is usually the ability to read a diagnostic instead of staring at it. Firmware engineers live in this loop - and on embedded targets an unhandled runtime bug can reboot a satellite, so the discipline of classifying failures starts here, on the host, where crashes are cheap.',
    prerequisites: ['cpg-m01-l1', 'cpg-m01-l2'],
    explanation:
      'Failures come in three families, and each has its own personality. Knowing the family tells you where to look and what tool to use.\n\n### Compile-time errors\n\nThe compiler parses and type-checks each file. Violations - a missing semicolon, an undeclared name, passing a string to a function expecting an int - stop the build before any executable exists. These are the *friendliest* errors: they name a file and a line, and the fix is usually local. A key habit: **fix the first error, then rebuild**. When the parser derails on line 4, everything after can cascade into five bogus errors; the bottom of the list is often noise.\n\n### Link-time errors\n\nThe build compiled every file but the linker cannot resolve a symbol: typically `undefined reference to \'x\'` (a function was declared and called but never defined, or its .c file was not added to the build) or `multiple definition of \'x\'` (the same symbol was defined in two places - often because a body was put in a header). No line numbers here, just symbols: you must think about *files*, not lines.\n\n### Runtime errors\n\nThe program built and started, then went wrong. The spectrum runs from loud (crash with a message like `Segmentation fault`) to silent (the program prints a plausible but wrong number and exits 0). The silent ones are the killers, and they are exactly what careful tracing in this course trains you to catch before running.\n\n### Warnings: the amber light\n\nA **warning** means: this compiles, but the compiler suspects a mistake - a suspicious conversion, an unused variable, a comparison that is always false. Professionals compile with warnings turned up (`gcc -Wall -Wextra`) and treat each one as a bug report. The `0.05 == 0.05`-style surprises of later modules are all things the compiler will happily warn about - if you ask.',
    deepDive:
      '### Reading a gcc diagnostic like an engineer\n\nA gcc error is structured: `file:line:column: severity: message`. Example: `main.c:5:12: error: expected \';\' before \'return\'`. Read the severity first (warning = suspicious, error = build stops), then go to the exact line, then read the message as a description of what the parser *wanted*. GCC also prints the offending source line with a caret under the exact column - that caret is the most information-dense character on your screen.\n\n### Why errors cascade\n\nThe compiler is a single left-to-right reading of your text. A missing brace on line 10 can make every function after it look like it is nested inside main, generating dozens of "errors" that vanish when the brace is fixed. This is why experienced engineers never work a 30-error list bottom-up: fix the top, rebuild, and watch the list collapse.\n\n### Undefined behavior: the third rail\n\nSome runtime bugs are not merely wrong but *undefined*: reading an uninitialized variable, indexing past an array end, signed integer overflow. The C standard promises nothing for such programs - not "garbage", not "crash", but literally any behavior, including appearing to work. Compilers optimize assuming you never do these things, so UB can be silently optimized into nothing. Later modules flag every UB trap explicitly; from this lesson on, treat any UB pattern as a build-breaking bug even though the build does not break.',
    examples: [
      {
        title: 'A compile-time error and its diagnostic',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int counts = 10\n    printf("counts=%d\\n", counts);\n    return 0;\n}',
        explanation: [
          'The declaration `int counts = 10` was never terminated with a semicolon.',
          'GCC responds with something like: `m01.c:4:19: error: expected \';\' before \'printf\'` - file, line 4, column, severity, message.',
          'The caret points where the parser gave up, one line *after* the real mistake: the semicolon belongs on the end of line 4.',
          'Lesson: when an error points at a perfectly good line, the bug is usually at the end of the previous line.',
        ],
      },
      {
        title: 'A link-time error: declared but never defined',
        language: 'text',
        code:
          '/* sensor.h  (a header, included by main.c) */\nint read_sensor(void);\n\n/* main.c */\n#include <stdio.h>\n#include "sensor.h"\n\nint main(void) {\n    printf("sensor=%d\\n", read_sensor());\n    return 0;\n}\n\n/* The function read_sensor is DECLARED in the header\n   but DEFINED nowhere - no .c file implements it.  */',
        explanation: [
          'Compilation succeeds: the header declared the function, so the compiler happily type-checks the call in main.c.',
          'At link time the linker collects object files looking for a definition of read_sensor, finds none, and fails with `undefined reference to \'read_sensor\'`.',
          'Notice the diagnostic names a symbol, not a line - the missing thing is absent, so there is no line to point at.',
          'The fix: implement the function in sensor.c and add sensor.c to the build command.',
        ],
      },
      {
        title: 'A runtime logic bug: wrong answer, clean exit',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int total = 7;\n    int n = 2;\n\n    int average = total / n;   /* logic bug: integer division */\n\n    printf("average = %d\\n", average);\n    return 0;\n}',
        explanation: [
          'This compiles with no warnings and runs to completion - nothing in the toolchain flags it.',
          'The output is `average = 3`, not 3.5: integer division 7 / 2 truncates toward zero.',
          'The bug lives in the model, not the syntax: total/n with int operands is defined as integer division.',
          'Silent runtime errors are found by tracing expected vs actual output - the discipline every assessment in this course drills.',
        ],
      },
    ],
    tables: [
      {
        caption: 'The three failure families',
        headers: ['Family', 'When it strikes', 'Typical message', 'Where to look'],
        rows: [
          ['Compile-time', 'During compilation of each .c file', 'error: expected \';\' before ...', 'The named file and line (often the line before the caret)'],
          ['Link-time', 'When merging object files', 'undefined reference to \'f\' / multiple definition of \'f\'', 'Symbols across files: missing .c in the build, or duplicate definitions'],
          ['Runtime', 'While the program executes', 'Segmentation fault, or silent wrong output', 'Program logic; reproduce, then trace inputs to outputs'],
        ],
      },
      {
        caption: 'Warning vs error',
        headers: ['', 'Warning', 'Error'],
        rows: [
          ['Build continues?', 'Yes - an executable is still produced', 'No - the stage fails'],
          ['Meaning', 'Legal C, but suspicious: probable bug', 'Not legal C; the program cannot be built'],
          ['Professional response', 'Treat as a bug report; build with -Wall -Wextra', 'Fix before anything else'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Fixing the last error in the list instead of the first.',
        fix:
          'Work top-down: correct the first diagnostic, rebuild immediately, and re-read the (usually shorter) list. Cascades evaporate when their root cause is fixed; bottom-up fixing chases ghosts the root cause created.',
      },
      {
        mistake: 'Ignoring warnings because the program "still built".',
        fix:
          'Build with `gcc -Wall -Wextra -o app main.c` and treat every warning as a defect. Warnings catch entire bug classes for free - uninitialized variables, wrong printf specifiers, unused results. Professionals push further with -Werror, which promotes warnings to errors so a warning can never reach the repo.',
      },
      {
        mistake: 'Assuming a program that runs without crashing is correct.',
        fix:
          'A clean exit says nothing about correctness. Verify output against a hand-traced expectation on a known input (like the 7/2 example above). "It compiled" is evidence about syntax, not semantics.',
      },
    ],
    guidedPractice: {
      title: 'Triage five build failures',
      brief:
        'Classify each report as compile-time, link-time or runtime, and name the stage: (1) `error: unknown type name \'uinit8_t\'`; (2) `undefined reference to \'crc_update\'`; (3) program prints `sum=120` but the true sum is 121; (4) `multiple definition of \'g_count\'`; (5) `Segmentation fault (core dumped)`.',
      expectedBehavior:
        '(1) compile-time - typo in a type name during compilation. (2) link-time - a declared function has no definition. (3) runtime, silent logic bug - the toolchain did its job. (4) link-time - the same symbol is defined twice. (5) runtime, loud failure - invalid memory access during execution.',
      hints: [
        'Anything naming a file and line with "error:" before the build produced an executable is compile-time.',
        '`undefined reference` and `multiple definition` are linker vocabulary.',
        'If an executable ran and produced output, only runtime remains as the family.',
      ],
    },
    practiceExercises: [
      {
        title: 'Reproduce a cascade',
        brief:
          'Delete one semicolon from a working 20-line program and build it. Count the reported errors. Restore the semicolon and build again. Record what the error list looked like before and after.',
        expectedBehavior:
          'One missing semicolon typically produces 1-3 errors, often pointing at lines after the real bug; after the fix the build is clean. This demonstrates fix-first-rebuild-often.',
        hints: [
          'The parser recovers at the next semicolon, so damage is usually localized but misleading.',
          'Notice that no error message ever says "missing semicolon" outright - it says what the parser expected instead.',
          'This is why the first error is the most trustworthy one on the list.',
        ],
      },
      {
        title: 'Turn the warnings up',
        brief:
          'Compile a small program of yours with plain `gcc`, then with `gcc -Wall -Wextra`. If any warnings appear, read each one, fix the code, and rebuild until both configurations are silent.',
        expectedBehavior:
          'The -Wall -Wextra build surfaces real issues (unused variables, suspicious conversions, wrong printf specifiers) that the default build hides; after fixes both builds are clean and behavior is unchanged or corrected.',
        hints: [
          'If there were no warnings, deliberately introduce one: declare a variable and never use it.',
          'Read the warning text as a description of a suspicious pattern, then decide: bug or justified?',
          'Justified cases get a comment or a cleaner formulation - never a blanket ignore.',
        ],
      },
    ],
    assessment: {
      title: 'Errors and diagnostics checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'You call a function declared in a header, but no .c file in the build defines it. Where does the build fail?',
          options: ['Preprocessing', 'Compilation', 'Linking', 'It builds and the call is skipped'],
          answer: 'Linking',
          explanation:
            'The declaration satisfied the compiler during compilation of the calling file. Only the linker - which sees all object files - can discover that no definition exists, and it reports an undefined reference.',
          hint: 'Which stage is the first one that sees more than one file?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'A program that compiles without warnings is guaranteed to produce correct output.',
          answer: 'false',
          explanation:
            'Warnings cover only patterns the compiler finds suspicious. Logic errors - wrong formula, truncated integer division, wrong loop bound - compile cleanly and silently. Correctness is established by tracing and testing.',
          hint: 'Recall the 7 / 2 average example.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'What does this program print when built and run?',
          code: '#include <stdio.h>\n\nint main(void) {\n    int total = 9;\n    int n = 4;\n    printf("avg=%d\\n", total / n);\n    return 0;\n}',
          options: ['avg=2.25', 'avg=2', 'avg=3', 'avg=2.5'],
          answer: 'avg=2',
          explanation:
            'Both operands are int, so / performs integer division: 9 / 4 = 2, truncating the 0.25. The %d placeholder cannot print fractions anyway.',
          hint: 'Integer division truncates toward zero.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A teammate reports 14 compile errors, all pointing into code they did not touch today. What is the most probable root cause and the first action to take?',
          answer: 'A single error early in the file cascading into follow-on errors - fix the first listed error, rebuild, and re-read the shortened list',
          explanation:
            'One structural break (missing brace or semicolon) derails parsing for everything after it, manufacturing bogus errors. The top of the list is the most trustworthy diagnostic; fix it, rebuild, repeat.',
          hint: 'Compilers read top to bottom; one derailment poisons the rest.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'What does the -Wall flag do, and why do professionals build with it (or even -Werror)?',
          answer: 'It enables a broad set of compiler warnings so suspicious code is reported during the build; professionals use it (and -Werror to escalate warnings to build failures) because warnings catch whole classes of bugs for free',
          explanation:
            'Warnings are automated code review performed on every build. -Werror enforces the discipline by making a warning-capable build fail, so no warning can be ignored into the repository.',
          hint: 'A warning is the compiler saying: this is legal, but I suspect it is not what you meant.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Compile-time error', definition: 'A violation of language rules detected by the compiler while translating a source file; no executable is produced.' },
      { term: 'Link-time error', definition: 'A symbol-resolution failure at linking, typically an undefined or multiply defined symbol.' },
      { term: 'Runtime error', definition: 'A failure while the program executes, from loud crashes to silent wrong answers.' },
      { term: 'Diagnostic', definition: 'The structured compiler or linker message: file, line, severity, and description.' },
      { term: 'Warning', definition: 'A build message marking legal-but-suspicious code; the build still produces an executable.' },
      { term: 'Undefined behavior', definition: 'Code the C standard does not constrain at all - the compiler may assume it never happens; treat it as a critical bug.' },
    ],
    revisionSummary: [
      'Three failure families: compile-time (language rules), link-time (symbol resolution), runtime (execution).',
      'Read diagnostics as file:line:severity:message, and fix the first error before reading the rest.',
      'One structural mistake cascades into many bogus errors - fix top-down and rebuild.',
      'undefined reference means something was declared and used but never defined.',
      'Warnings are free bug reports: build with -Wall -Wextra and treat every one as a defect.',
      'Compiling and running cleanly proves syntax only; correctness comes from tracing and testing.',
    ],
    furtherReading: [
      { label: 'GCC - Warning Options', url: 'https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html', kind: 'docs' },
      { label: 'Wikipedia - Segmentation fault', url: 'https://en.wikipedia.org/wiki/Segmentation_fault', kind: 'article' },
      { label: 'Wikipedia - Undefined behavior', url: 'https://en.wikipedia.org/wiki/Undefined_behavior', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
