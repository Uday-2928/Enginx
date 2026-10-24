import type { TutorialLesson } from '../types';

export const module04Lessons: TutorialLesson[] = [
  {
    id: 'cpg-m04-l1',
    title: 'if, else and Branch Chains',
    summary:
      'Route execution with if/else, build readable else-if ladders for sensor thresholds, and keep nesting shallow enough that the code still says what it does.',
    objectives: [
      'Write if/else if/else chains that classify a value into exactly one band.',
      'Explain how evaluation order through a chain creates priority, and order tests accordingly.',
      'Nest branches deliberately and prefer guard clauses over deep pyramids.',
      'Trace a nested branch structure by hand for a given input.',
    ],
    whyItMatters:
      'Decision-making is where firmware meets its specification: over-voltage shuts down, a threshold latches a fault, a state advances only on the right combination of flags. Most field bugs in small controllers are branch bugs - a boundary tested with the wrong operator, a branch placed in the wrong order, a nested condition nobody can read anymore.',
    prerequisites: ['cpg-m03-l1'],
    explanation:
      'The `if` statement runs a block only when a condition is true (nonzero):\n\n```\nif (battery_mv >= 4200) {\n    /* full */\n} else if (battery_mv >= 3400) {\n    /* nominal */\n} else {\n    /* low or worse */\n}\n```\n\n### The chain is evaluated top-down, first match wins\n\nThe conditions are tested in order. The first one that evaluates true runs its block and **skips the entire rest of the chain**. That ordering is not just implementation detail - it *is* your specification: the first true condition wins, so later, overlapping tests never get a chance. In the example above, a 4300 mV battery matches the first test and never reaches the nominal test, even though it also satisfies it. Write chains from most specific to most general, and the ranges become unambiguous without repeating both bounds in every condition.\n\n### Nesting\n\nAny branch body can contain more `if`s - that is how you express compound decisions ("if the sample is valid AND the sensor is powered, then check whether it exceeds the limit"). Each nesting level adds a binding between conditions: deep pyramids like if-inside-if-inside-if (four levels is already painful) are where boundary bugs hide. The two cures: combine conditions with `&&` when they are truly one decision, and use **guard clauses** - early returns or continues that dispose of invalid cases at the top so the main logic sits unindented.\n\n### The condition itself\n\nAnything that evaluates to nonzero counts as true - `if (count)` means `if (count != 0)`, and both spellings are common; pick one convention per codebase. Comparisons produce 0 or 1 (module 3), and `&&`/`||` combine them. The condition is evaluated fresh each time the if is reached - there is no memory of the previous decision, which is exactly why state machines (module 9) keep their state in a variable.',
    deepDive:
      '### Boundaries: the off-by-one home turf\n\nEvery threshold has two edges, and `>` versus `>=` decides which side of the line a boundary value lands on. A 12-bit ADC full-scale reading of 4095 with a test `if (sample > 4095)` never fires - full scale is reachable; `>= 4096` is equally dead. The professional habit: for every threshold in the specification, name a test value exactly ON the boundary and trace which branch it takes. Firmware that is wrong by one count at the boundary ships for years before anyone notices - except in the industries where it grounds an aircraft.\n\n### Hysteresis: branches with memory\n\nA naive two-threshold branch chatters at the boundary: a battery at 3399/3400 mV flips between LOW and NOMINAL every sample, toggling a relay a thousand times. Real systems add **hysteresis** - different thresholds for entering and leaving a state (turn on below 3300, turn off above 3500). The branch then needs to know the previous state, so the condition reads a variable: `if (!heater_on && temp < 3300) { heater_on = 1; } else if (heater_on && temp > 3500) { heater_on = 0; }`. That is a two-state machine in embryo - module 9 builds the full version - and it shows how decision logic and state variables cooperate.\n\n### Reading nested code as a decision table\n\nWhen you inherit a deeply nested branch structure, flatten it into a decision table on paper: one row per path from top to bottom, listing the conditions that guard the path and its effect. Tables expose dead branches (impossible condition combinations), overlapping branches (two paths reachable for the same input - a spec violation), and missing else handling. Refactoring then targets structure, not guesswork: merge conditions, hoist guards, replace the pyramid with a chain or - when values are discrete - a switch, next lesson.',
    examples: [
      {
        title: 'A four-band battery classifier',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int battery_mv = 3700;\n\n    if (battery_mv >= 4200) {\n        printf("state: FULL\\n");\n    } else if (battery_mv >= 3400) {\n        printf("state: NOMINAL\\n");\n    } else if (battery_mv >= 3000) {\n        printf("state: LOW\\n");\n    } else {\n        printf("state: CRITICAL\\n");\n    }\n    return 0;\n}',
        explanation: [
          'The tests run top-down: 3700 fails `>= 4200`, passes `>= 3400`, and the chain stops there - exactly one branch runs.',
          'Because the chain stops at the first match, later conditions do not need to re-test the upper bound: `>= 3400` implicitly means "below 4200 but at least 3400".',
          'The final `else` catches everything the chain rejected - here, anything under 3000. Omitting it leaves a silent dead zone where nothing prints; with state classification that dead zone is a bug.',
          'Boundary discipline: 4200 exactly takes the FULL branch (the operator is >=). If the spec says 4200 is nominal, the operator must become >.',
          'Output: `state: NOMINAL`',
        ],
      },
      {
        title: 'Guard clauses instead of a pyramid',
        language: 'c',
        code:
          '#include <stdio.h>\n\n/* Educational linear sensor model: 10 mV per degree. */\nstatic int mv_to_degrees(int millivolts) {\n    return millivolts / 10;\n}\n\nint main(void) {\n    int sensor_ok = 1;\n    int millivolts = -30;\n\n    if (!sensor_ok) {\n        printf("check sensor\\n");\n        return 1;                        /* guard: bail out early   */\n    }\n    if (millivolts < 0) {\n        printf("implausible reading\\n");\n        return 1;                        /* guard: bail out early   */\n    }\n\n    int degrees = mv_to_degrees(millivolts);\n    if (degrees > 50) {\n        printf("over-temperature: %d C\\n", degrees);\n    } else {\n        printf("temperature ok: %d C\\n", degrees);\n    }\n    return 0;\n}',
        explanation: [
          'The two guards sit at the top and return immediately, so the reader reaches the main logic with an empty working memory - no mental stack of "we are inside not-okay and inside plausible".',
          'The equivalent pyramid would nest the whole temperature block inside two levels of else - same behavior, four extra indents, harder to extend.',
          'The main decision is a plain two-way branch on the computed value; tracing it needs only the two boundaries 50 and 0.',
          'Output (millivolts = -30): the second guard fires - `implausible reading` - and the program exits with status 1.',
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Re-testing both bounds in every rung of a chain: `else if (v >= 3400 && v < 4200)`.',
        fix:
          'The chain already guarantees the earlier tests failed, so `v < 4200` is redundant noise that invites drift when a bound changes. Rely on chain order; state the reasoning in a comment if the ranges are non-obvious.',
      },
      {
        mistake: 'Placing the general test before the specific one: `if (v >= 100) {...} else if (v >= 1000) {...}` - the second branch is dead code.',
        fix:
          'Order from most specific to most general. Here every value >= 1000 matches the first rung, so the >= 1000 branch can never execute. A trace of a 2000 input exposes it instantly.',
      },
      {
        mistake: 'The dangling else: an else attaching to the nearest unmatched if, not the one the indentation suggests.',
        fix:
          '`if (a) if (b) f(); else g();` runs g() when a is true and b is FALSE - probably not the intent. Always brace both bodies, even one-liners; the braces make the binding visible and kill the ambiguity.',
      },
      {
        mistake: 'Using `=` in the condition: `if (mode = 3)`.',
        fix:
          'This assigns 3 to mode and evaluates 3 (true) - the branch always runs and the variable is clobbered. Compile with -Wall ("suggest parentheses around assignment used as truth value") and treat that warning as an error.',
      },
    ],
    guidedPractice: {
      title: 'Classify ADC samples into bands',
      brief:
        'A 12-bit converter reads 0..4095. Write a chain that prints UNDERFLOW for negative values, OVERFLOW for values above 4095, DARK for 0..999, MID for 1000..2999 and BRIGHT for 3000..4095. Run it for inputs -5, 0, 999, 1000, 2999, 3000, 4095 and 5000 and record each result.',
      starterCode:
          '#include <stdio.h>\n\nvoid classify(int sample) {\n    if (sample < 0) {\n        printf("UNDERFLOW\\n");\n    } else if (sample > 4095) {\n        printf("OVERFLOW\\n");\n    } else if (sample < 1000) {\n        printf("DARK\\n");\n    } else if (sample < 3000) {\n        printf("MID\\n");\n    } else {\n        printf("BRIGHT\\n");\n    }\n}\n\nint main(void) {\n    int inputs[8] = { -5, 0, 999, 1000, 2999, 3000, 4095, 5000 };\n    for (int i = 0; i < 8; i++) {\n        printf("sample %5d -> ", inputs[i]);\n        classify(inputs[i]);\n    }\n    return 0;\n}',
      expectedBehavior:
        '-5 UNDERFLOW; 0 DARK; 999 DARK; 1000 MID; 2999 MID; 3000 BRIGHT; 4095 BRIGHT; 5000 OVERFLOW. Note the validity checks come first so physical impossibilities never reach the banding logic, and each boundary value (999/1000, 2999/3000, 4095) was tested explicitly.',
      hints: [
        'Guard the physically impossible inputs before classifying bands - the chain order encodes that priority.',
        'Within valid range, tests can use single bounds: the earlier rungs already excluded lower values.',
        'Boundary values are the test cases that matter: 999 vs 1000 and 2999 vs 3000 must split correctly.',
      ],
    },
    practiceExercises: [
      {
        title: 'Over-temperature with hysteresis',
        brief:
          'A fan turns on when temperature exceeds 60 and turns off when it drops below 50. Write a branch that maintains a `fan_on` variable across calls to a `void control_fan(int temp_c)` function, printing the new state only on a change. Simulate three calls: 65, 55, 45.',
        expectedBehavior:
          'Call 65: fan_on was 0, 65 > 60 -> on, prints "fan ON". Call 55: 55 is between 50 and 60 -> no change, prints nothing (that silence is the hysteresis band). Call 45: fan_on was 1, 45 < 50 -> off, prints "fan OFF". A naive single-threshold version would have toggled at 55.',
        hints: [
          'The state variable must persist between calls - a static local inside the function does it.',
          'Enter condition: !fan_on && temp > 60. Exit condition: fan_on && temp < 50.',
          'Between the thresholds, do nothing - that dead band is the whole point of hysteresis.',
        ],
      },
      {
        title: 'Flatten a pyramid into a table',
        brief:
          'Rebuild this nested logic as a decision table, then rewrite it as a flat chain:\n\n```\nif (power_good) {\n    if (mode == 1) {\n        if (temp > 80) { shutdown(); }\n}\n}\n```\n\nList every input combination (power_good 0/1, mode 1/other, temp <= 80/> 80) and its outcome, then simplify.',
        expectedBehavior:
          'The table has 8 combinations; exactly one (good power, mode 1, temp > 80) calls shutdown, everything else does nothing. The flat rewrite: `if (power_good && mode == 1 && temp > 80) { shutdown(); }` - one condition, no nesting, identical behavior. The exercise shows most pyramids are conjunctions in disguise.',
        hints: [
          'A path requires ALL conditions on the way down to hold - that is conjunction.',
          'Write the eight rows; count how many produce the same result.',
          '&& of the three conditions is exactly the single surviving path.',
        ],
      },
    ],
    assessment: {
      title: 'Branching checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    int v = 3700;\n    if (v >= 4200) {\n        printf("FULL\\n");\n    } else if (v >= 3400) {\n        printf("NOMINAL\\n");\n    } else {\n        printf("LOW\\n");\n    }\n    return 0;\n}',
          options: ['FULL', 'NOMINAL', 'LOW', 'FULL then NOMINAL'],
          answer: 'NOMINAL',
          explanation:
            '3700 fails the first test and passes the second; the chain stops at the first true condition, so only NOMINAL prints.',
          hint: 'First match wins and skips the rest.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In the chain `if (v >= 100) {A} else if (v >= 1000) {B}`, when does branch B run?',
          options: ['For v >= 1000', 'For 100 <= v < 1000', 'Never', 'For every v'],
          answer: 'Never',
          explanation:
            'Every value satisfying v >= 1000 also satisfies v >= 100, so the first rung consumes it. The second rung is unreachable dead code - order tests from specific to general.',
          hint: 'Does any value reach the second test with the first test false?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In `if (a) if (b) x(); else y();`, the else binds to the outer if.',
          answer: 'false',
          explanation:
            'An else binds to the nearest unmatched if - here the inner `if (b)`. y() runs when a is true and b is false. Braces on both bodies remove the ambiguity entirely.',
          hint: 'The compiler does not read indentation.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A limit checker uses `if (sample > 4095) { fault(); }` for a 12-bit ADC whose maximum reading is 4095. The fault never fires even at full scale. Explain and fix.',
          answer: 'The maximum reading 4095 does not satisfy > 4095, so the test can never be true for valid data - fix the boundary per the specification, e.g. test values above the legal range only for genuinely out-of-range data, or clamp/flag at >= the intended limit',
          explanation:
            'An off-by-one at the boundary: > excludes exactly the value the author meant to catch. Every threshold needs a boundary-value test on both sides of the line.',
          hint: 'Trace the exact maximum value through the comparison.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Why does a thermostat need two thresholds (on below 20, off above 22) instead of one at 21?',
          answer: 'With one threshold the output chatters - toggling on every sample that straddles the line - while two thresholds create a dead band (hysteresis) where the state holds, preventing rapid switching wear and noise',
          explanation:
            'Hysteresis turns a memoryless comparison into a stateful decision: enter the state at one threshold, leave it at the other, and values in between change nothing.',
          hint: 'What happens to a signal that sits exactly at the single threshold?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'else-if chain', definition: 'A sequence of tests evaluated top-down where the first true condition runs and all remaining rungs are skipped.' },
      { term: 'Guard clause', definition: 'An early return or early exit that disposes of an invalid case at the top of a function, keeping main logic unindented.' },
      { term: 'Dangling else', definition: 'The rule that an else binds to the nearest unmatched if; avoided by bracing every body.' },
      { term: 'Boundary value', definition: 'A test input exactly at a threshold, where > versus >= decides the outcome.' },
      { term: 'Hysteresis', definition: 'Two different thresholds for entering and leaving a state, creating a dead band that prevents chatter.' },
      { term: 'Dead branch', definition: 'Code that can never execute because an earlier branch always consumes its inputs.' },
    ],
    revisionSummary: [
      'else-if chains evaluate top-down; first match wins and the rest is skipped.',
      'Order chain rungs from most specific to most general, or later rungs become dead code.',
      'Guard clauses flatten pyramids: dispose of invalid cases early, keep main logic shallow.',
      'Every threshold gets a boundary-value test; > versus >= is a specification decision.',
      'Hysteresis (two thresholds + state) stops boundary chatter in control outputs.',
      'Always brace if and else bodies - it prevents the dangling-else misbinding.',
    ],
    furtherReading: [
      { label: 'cppreference - if statement', url: 'https://en.cppreference.com/w/c/language/if', kind: 'docs' },
      { label: 'Wikipedia - Dead code', url: 'https://en.wikipedia.org/wiki/Dead_code', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'cpg-m04-l2',
    title: 'switch, Cases and Fall-Through',
    summary:
      'Dispatch on discrete values with switch, control fall-through deliberately, and know when a switch beats an if-else chain - and when it cannot be used at all.',
    objectives: [
      'Write switch statements with correct break placement and a default arm.',
      'Trace deliberate fall-through and use it to share code between cases.',
      'Explain why case labels must be compile-time integer constants.',
      'Choose between switch and else-if chains for a given decision problem.',
    ],
    whyItMatters:
      'Protocol commands, error codes, state machine states - embedded code is full of decisions on a small set of discrete values, and switch is the purpose-built tool: it reads as a table, and compilers turn it into a jump table that can outperform a chain of tests. Deliberate fall-through is also the idiom behind some famous fast code - and behind thousands of accidental bugs, which is why you must own both sides of it.',
    prerequisites: ['cpg-m04-l1'],
    explanation:
      '`switch` jumps to the case whose constant matches the controlling expression, then executes forward until a `break` (or the end of the block):\n\n```\nswitch (code) {\ncase 0:\n    printf("OK\\n");\n    break;\ncase 1:\n    printf("RETRY\\n");\n    break;\ndefault:\n    printf("UNKNOWN\\n");\n    break;\n}\n```\n\n### The rules that matter\n\n- The controlling expression and all case labels must be **integer** types. You cannot switch on a string or a float - strings are compared with `strcmp` (module 7), floats rarely take discrete values anyway.\n- Case labels must be **compile-time constants**: literals, enum constants, or constant expressions. A variable case is a compile error.\n- Without `break`, execution **falls through** into the next case\'s body - the language semantics, not a mistake. Falling through into `case 2` from `case 1` is how you make several values share one body.\n- `default` runs when nothing matched. Include it even when you believe all values are covered: it documents the catch-all and catches corruption (a truncated wire value, a bit-flipped flag).\n\n### Fall-through: feature and hazard\n\n`case 1: case 2: body;` is deliberate fall-through - empty case bodies stacking two labels onto one implementation. Accidental fall-through - a body missing its `break` - executes the next case\'s code silently, and it is common enough that GCC warns (-Wimplicit-fallthrough under -Wextra) and C23 added [[fallthrough]] to mark the intentional ones. The convention that keeps teams sane: *empty* fall-through (stacked labels) freely; *non-empty* fall-through rarely, with a loud comment `/* fall through */`.',
    deepDive:
      '### What the compiler builds\n\nFor dense case values (0, 1, 2, 3...) the compiler emits a **jump table**: an array of code addresses indexed by the controlling value, making dispatch one load-and-jump regardless of case count - a switch of 50 cases costs the same as one of 5. For sparse values it degenerates to a binary search tree of comparisons. This is why refactoring a 20-rung else-if chain of constants into a switch can be a genuine optimization on small MCUs, not just cosmetics. It is also why the cases must be constants: a jump table needs its indices at compile time.\n\n### Switch and state machines\n\nThe switch-on-state pattern is the backbone of embedded event handling: one switch per event type, cases per state (or vice versa). Every case is a compile-time-checked integer - enum constants fit perfectly (module 9), and the compiler warns when a switch over an enum omits one of its values (-Wswitch), turning "add a new state" into a compile-error-driven checklist. You will build exactly this structure in the course project: an event loop that switches on state, transitions in the case bodies, and never falls through by accident.\n\n### Declarations inside a switch\n\nCases share one block scope, so a declaration after a label lands in the same scope for every case - and jumping over an initialization is an error (`case 1: int x = 3;` before `default:` makes the default path skip the initializer). The standard workarounds: declare variables before the switch, or give the case its own braces `case 1: { int x = 3; ... } break;`. When you see `switch (x) { case 1: {` the braces are doing scope work, not decoration.',
    examples: [
      {
        title: 'Error-code decoder with grouped cases',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int code = 2;\n\n    switch (code) {\n    case 0:\n        printf("OK\\n");\n        break;\n    case 1:\n    case 2:\n        printf("RECOVERABLE\\n");\n        break;\n    case 3:\n        printf("FATAL\\n");\n        break;\n    default:\n        printf("UNKNOWN\\n");\n        break;\n    }\n    return 0;\n}',
        explanation: [
          'The controlling value 2 jumps directly to `case 2`. The body above it (`case 1:`) is empty, so both labels share the one printf - deliberate fall-through by stacking.',
          'The `break` after RECOVERABLE ends the switch; without it, execution would continue into the FATAL body - the classic accidental fall-through.',
          '`default` catches any code outside 0..3, covering protocol corruption or uninitialized variables.',
          'Output: `RECOVERABLE`',
        ],
      },
      {
        title: 'Deliberate fall-through: escalating alarm levels',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int level = 2;\n\n    switch (level) {\n    case 3:\n        printf("shutdown\\n");   /* fall through */\n    case 2:\n        printf("alarm\\n");      /* fall through */\n    case 1:\n        printf("log\\n");\n        break;\n    default:\n        printf("idle\\n");\n        break;\n    }\n    return 0;\n}',
        explanation: [
          'Level 3 performs ALL actions (shutdown, alarm, log); level 2 skips only the shutdown; level 1 only logs. Higher levels include every action of lower levels.',
          'The `/* fall through */` comments are the convention marking intentional execution-drop - reviewers and GCC\'s -Wimplicit-fallthrough look for exactly this.',
          'Tracing level = 2: enter at case 2, print alarm, fall into case 1, print log, break.',
          'Output:\n```\nalarm\nlog\n```',
        ],
      },
      {
        title: 'When switch cannot be used',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    const char *cmd = "RESET";\n    int battery_mv = 3700;\n\n    /* Strings: dispatch with strcmp, not switch. */\n    if (strcmp(cmd, "RESET") == 0) {\n        printf("cmd = reset\\n");\n    } else if (strcmp(cmd, "START") == 0) {\n        printf("cmd = start\\n");\n    }\n\n    /* Ranges: a chain, not a switch. */\n    if (battery_mv >= 4200) {\n        printf("battery = full\\n");\n    } else if (battery_mv >= 3400) {\n        printf("battery = nominal\\n");\n    } else {\n        printf("battery = low\\n");\n    }\n    return 0;\n}',
        explanation: [
          '`switch (cmd)` would not compile: the controlling expression must be an integer. Command dispatch on strings uses the strcmp chain (module 7 covers strcmp).',
          'Range decisions like battery bands do not map to discrete labels - the else-if chain is the right shape. A switch over 4096 possible ADC values would be absurd.',
          'Switch shines exactly when the values are few, discrete and known at compile time: opcodes, error codes, states.',
          'Output:\n```\ncmd = reset\nbattery = nominal\n```',
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Forgetting a break and silently executing the next case.',
        fix:
          'Execution continues into the next case body without one. Mark every intentional drop with `/* fall through */`, keep drops to stacked empty labels where possible, and build with -Wextra so GCC flags unmarked fall-through.',
      },
      {
        mistake: 'Using a non-constant or floating/string case label: `case voltage:` or `case 3.3:`.',
        fix:
          'Labels must be compile-time integer constants - enum constants and literal expressions like `1u << 3` qualify; variables do not. Ranges go to if/else chains, strings to strcmp, floats to tolerance comparisons.',
      },
      {
        mistake: 'Omitting default because "the enum covers everything".',
        fix:
          'Corruption, truncation and uninitialized memory produce values outside your enum. A default that logs or latches a fault converts silent misbehavior into a diagnosable event - and with -Wswitch the compiler already tells you which enum values lack cases.',
      },
      {
        mistake: 'Declaring and initializing a variable directly under a case label that other cases jump over.',
        fix:
          'A jump into a scope skipping an initialization is an error. Wrap the case body in braces `case 1: { ... } break;` or declare variables before the switch.',
      },
    ],
    guidedPractice: {
      title: 'Decode UART commands with grouped cases',
      brief:
        'A host sends single-character commands: \'S\' starts, \'P\' and \'H\' both pause (hold), \'R\' resets, anything else is an error beep. Write the switch, run it for cmd = \'H\' and cmd = \'X\', and predict both outputs first.',
      starterCode:
          '#include <stdio.h>\n\nvoid handle(char cmd) {\n    switch (cmd) {\n    case \'S\':\n        printf("start\\n");\n        break;\n    case \'P\':\n    case \'H\':\n        printf("pause\\n");\n        break;\n    case \'R\':\n        printf("reset\\n");\n        break;\n    default:\n        printf("beep\\n");\n        break;\n    }\n}\n\nint main(void) {\n    handle(\'H\');\n    handle(\'X\');\n    return 0;\n}',
      expectedBehavior:
        'handle(\'H\') prints `pause` (the stacked labels \'P\' and \'H\' share one body). handle(\'X\') prints `beep` via default. Character constants are integer constants, so they are legal case labels.',
      hints: [
        'Char literals like \'H\' are integer constants - perfect case labels.',
        'Stack the two pause labels with empty bodies: case \'P\': case \'H\':.',
        'The default arm is the error beep - it also catches corrupted serial bytes.',
      ],
    },
    practiceExercises: [
      {
        title: 'Menu dispatcher',
        brief:
          'Write `void menu(int choice)` that switches on 1 (print "measure"), 2 (print "dump"), 3 (print "clear"), and default (print "invalid"). Call it with 2, 3, 7 and 1. Predict all four lines, then verify.',
        expectedBehavior:
          'Outputs in call order: dump, clear, invalid, measure. The default arm handles 7. Each case needs its own break - removing the one after case 2 would make choice 2 also print clear, an accidental fall-through worth seeing once.',
        hints: [
          'Predict before running - that is the tracing muscle this course builds.',
          'Temporarily delete a break and observe the fall-through; then restore it.',
          'Keep the default last (convention, not requirement) with a break of its own.',
        ],
      },
      {
        title: 'Convert a chain to a switch and back',
        brief:
          'This chain classifies error codes: rewrite it as a switch with grouped cases for 1 and 4 (both "RETRY") and a default ("BAD"), then state in one sentence when you would prefer each form.\n\n```\nif (code == 0)      { printf("OK\\n"); }\nelse if (code == 1) { printf("RETRY\\n"); }\nelse if (code == 4) { printf("RETRY\\n"); }\nelse                { printf("BAD\\n"); }\n```',
        expectedBehavior:
          'Switch version: case 0 prints OK/break; case 1: case 4: stacked labels print RETRY/break; default prints BAD/break. Preference: switch for many discrete compile-time constants (readability plus jump-table dispatch); chains for ranges, strings or non-constant tests.',
        hints: [
          'Group the two RETRY codes with stacked empty labels.',
          'Both forms must behave identically for code = 0, 1, 4 and 9 - verify by hand.',
          'The tiebreaker is usually the shape of the values: discrete constants versus ranges.',
        ],
      },
    ],
    assessment: {
      title: 'switch checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    int code = 2;\n    switch (code) {\n    case 1:\n    case 2:\n        printf("RECOVERABLE\\n");\n        break;\n    case 3:\n        printf("FATAL\\n");\n        break;\n    default:\n        printf("UNKNOWN\\n");\n        break;\n    }\n    return 0;\n}',
          options: ['RECOVERABLE', 'UNKNOWN', 'FATAL', 'RECOVERABLE then FATAL'],
          answer: 'RECOVERABLE',
          explanation:
            'Value 2 jumps to case 2, whose body prints RECOVERABLE; the break ends the switch. Case 1 is an empty stacked label sharing the same body.',
          hint: 'Where does the matching label sit, and where is the first break?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which case label is legal?',
          options: ['case x + 1:', 'case 1u << 3:', 'case 3.3:', 'case "OK":'],
          answer: 'case 1u << 3:',
          explanation:
            'Case labels must be compile-time integer constant expressions. A bit-shift of unsigned literals qualifies; variables, floats and strings do not.',
          hint: 'The compiler must be able to compute the label before the program runs.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'If no case matches and there is no default, execution continues with the statement after the switch block.',
          answer: 'true',
          explanation:
            'A switch with no match and no default does nothing and falls out of the block - which is why a default arm is the professional safety net: it converts unmatched values into explicit handling.',
          hint: 'What does the controlling value do when it finds no label and no default?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A handler is missing its break:\n\n```\nswitch (err) {\ncase 1:\n    log_retry();\ncase 2:\n    reboot();\n    break;\n}\n```\n\nWhat happens for err = 1, and what are the two professional fixes?',
          answer: 'For err = 1 the code logs the retry and then falls through into reboot() - an accidental fall-through; fixes are adding the missing break (or marking any intentional drop with a fall-through comment / [[fallthrough]]) and building with -Wextra so the compiler flags it',
          explanation:
            'Execution after a case body continues into the next case unless a break intervenes. GCC -Wimplicit-fallthrough (under -Wextra) reports unmarked drops, and the /* fall through */ comment documents the rare intended ones.',
          hint: 'Trace execution after log_retry() - what stops it?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Give one decision problem suited to switch and one that is not, with the reason for each.',
          answer: 'Suited: dispatching on an error code or state enum - few discrete compile-time integer constants, readable as a table, jump-table dispatch. Not suited: classifying a sensor value into ranges or dispatching on a string - labels must be integer constants, so ranges need if/else chains and strings need strcmp',
          explanation:
            'The constraint is integer compile-time constants and exact equality. Range logic and string comparison violate it structurally, not just stylistically.',
          hint: 'What two properties must the controlling values have?',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'switch', definition: 'A multi-way branch on integer values; control jumps to the matching constant label.' },
      { term: 'Case label', definition: 'A compile-time integer constant marking an entry point of the switch body.' },
      { term: 'Fall-through', definition: 'Execution continuing from one case body into the next when no break intervenes - deliberate when marked, a bug when accidental.' },
      { term: 'break', definition: 'The statement that exits the switch block after a case body.' },
      { term: 'default', definition: 'The catch-all arm executed when no case matches; the professional place to handle corrupt values.' },
      { term: 'Jump table', definition: 'A compiler-generated array of code addresses indexed by the switch value, giving constant-time dispatch for dense cases.' },
    ],
    revisionSummary: [
      'switch dispatches on integer expressions against compile-time constant labels; first match enters, break exits.',
      'Stacked empty labels (case 1: case 2:) are the clean way to share a body.',
      'Missing breaks cause silent fall-through - mark intentional drops and build with -Wextra.',
      'default handles values outside all cases: corruption, truncation, uninitialized data.',
      'Strings dispatch with strcmp and ranges with else-if chains - switch cannot express either.',
      'Dense constant cases compile to a jump table; a long constant chain is a switch candidate.',
    ],
    furtherReading: [
      { label: 'cppreference - switch statement', url: 'https://en.cppreference.com/w/c/language/switch', kind: 'docs' },
      { label: 'Wikipedia - Switch statement', url: 'https://en.wikipedia.org/wiki/Switch_statement', kind: 'article' },
      { label: 'Wikipedia - Duff\'s device', url: 'https://en.wikipedia.org/wiki/Duff%27s_device', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'cpg-m04-l3',
    title: 'The Conditional Operator and Boolean Logic',
    summary:
      'Compact decisions with ? :, lean on short-circuit && and || as control flow, and combine conditions with De Morgan without losing the plot.',
    objectives: [
      'Write and read conditional expressions, choosing them only where they clarify.',
      'Use short-circuit evaluation to guard division, dereferences and side-effectful calls.',
      'Apply De Morgan\'s laws to negate compound conditions correctly.',
      'Recognize and eliminate assignment-in-condition bugs.',
    ],
    whyItMatters:
      'Boolean algebra is the grammar of every driver: "sample valid AND not stale AND (threshold exceeded OR force flag set)". Engineers who manipulate such conditions fluently write shorter, flatter code - and engineers who do not write the inverted conditions backwards, which is how inverted-enable bugs reach production boards.',
    prerequisites: ['cpg-m04-l1', 'cpg-m03-l1'],
    explanation:
      '### The conditional operator ? :\n\n`condition ? value_if_true : value_if_false` is an *expression* - it produces a value, so it can sit on the right side of an assignment or inside a printf argument:\n\n```\nint average = (used > 0) ? (total / used) : 0;\n```\n\nThis reads "if used is positive, total/used, otherwise 0" - and note the guard falls out naturally: the division cannot run with used == 0 because the false arm supplies the value instead. Use the ternary for *choosing between two values*; the moment it nests (`a ? b : c ? d : e`) or carries side effects, promote it back to if/else. Readability outranks compactness.\n\n### Short-circuit as control flow\n\nModule 3 introduced the semantics; here is the design use. `&&` and `||` are sequencing operators: `a && b` evaluates a, and only then b; `a || b` evaluates b only if a failed. That makes them the right tool for three jobs:\n\n- **Guards**: `if (n != 0 && total / n > limit)` - the division is unreachable when n is 0.\n- **Defaults**: `if (primary_failed || use_backup)` - evaluate the cheap or primary check first.\n- **Ordering**: put the cheap test left of the expensive one: `if (is_valid(&s) && is_calibrated(&s))`.\n\n### Negating compound conditions: De Morgan\n\nTo invert a compound test, negate each part and swap the connective:\n\n- `!(a && b)` == `!a || !b`\n- `!(a || b)` == `!a && !b`\n\nThe everyday use: "proceed unless any guard fails" - `if (!(valid && calibrated)) reject();` becomes `if (!valid || !calibrated) reject();`, which reads directly: reject when anything is wrong. Misapplying the law (negating the parts but keeping the connective) produces conditions that are subtly, dangerously wrong - always re-derive with a truth table when stakes are high.',
    deepDive:
      '### Assignment in condition: why it survives and how to kill it\n\n`if (x = 5)` is legal C: assignment is an expression, it yields 5, nonzero is true. Compilers warn only because the pattern is *usually* a typo for ==. The deliberate uses (like `while ((c = next_char()) != EOF)`) are idiomatic but rare, and modern style prefers keeping conditions side-effect-free. Project-level defense: `-Werror` on the specific warning, plus the Yoda-comparison habit `5 == x` for raw constants, which turns the typo into a compile error. The reason this bug matters in firmware: `if (enable = 0)` does not just skip the branch - it *writes 0 into your enable flag*, changing hardware state on a condition check.\n\n### Truth tables as a design tool\n\nWhen a condition involves three or more variables, write the truth table before writing the C. Eight rows expose conditions that are always true (a tautology - delete the test), always false (dead code - delete it), and minimize the expression. Example: `a && (a || b)` collapses to `a` by absorption - the b test is redundant, and every redundant test is a future contradiction waiting for a refactor that updates one copy and not the other. Hardware engineers already know this discipline from Karnaugh maps; the same algebra governs C conditions, bit for bit.\n\n### Sequencing guarantees and the exceptions\n\nOnly `&&`, `||`, the comma operator and `?:` fix evaluation order. `f() + g()` may call either first; `arr[i] = i++` is undefined. The consequence for conditions: any side effect you need before a comparison must happen in a prior statement or on the left of a short-circuit - never assume "it reads left to right so it runs left to right" outside the four sequencing operators. This single rule eliminates a whole family of "works on my compiler" bugs.',
    examples: [
      {
        title: 'Ternary for a safe average',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int samples[4] = {12, 0, 250, 80};\n    int total = 0;\n    int used = 0;\n\n    for (int i = 0; i < 4; i++) {\n        if (samples[i] == 0) {\n            continue;   /* skip invalid readings */\n        }\n        total += samples[i];\n        used++;\n    }\n\n    int average = (used > 0) ? (total / used) : 0;\n    printf("used=%d total=%d average=%d\\n", used, total, average);\n    return 0;\n}',
        explanation: [
          'The loop skips zero readings (continue jumps to the next iteration - module 5 details it), accumulating 12 + 250 + 80 = 342 into total and counting 3 used samples.',
          'The ternary chooses between the real average and the fallback: used is 3, so the true arm runs and average = 342 / 3 = 114.',
          'Had all readings been invalid, used would be 0 and the ternary would supply 0 - no division by zero, no special-case if. The guard is structural.',
          'Output: `used=3 total=342 average=114`',
        ],
      },
      {
        title: 'Guarded condition chain for a measurement',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int sensor_ok = 1;\n    int calibrated = 0;\n    int reading = 812;\n    int limit = 800;\n\n    if (sensor_ok && calibrated && reading > limit) {\n        printf("ALARM: reading %d over limit %d\\n", reading, limit);\n    } else if (!sensor_ok || !calibrated) {\n        printf("CHECK SETUP\\n");\n    } else {\n        printf("nominal: %d\\n", reading);\n    }\n    return 0;\n}',
        explanation: [
          'The alarm condition requires all three: sensor_ok (1) passes, but `calibrated` is 0, so `&&` short-circuits and the alarm is skipped - correct, an uncalibrated sensor must not raise alarms.',
          'The second test negates the setup conditions with De Morgan: !sensor_ok || !calibrated is !(sensor_ok && calibrated). Here it is true (calibrated is 0), so CHECK SETUP prints.',
          'Note the cheap tests sit leftmost; reading > limit (the comparison that might touch data) evaluates only when the setup is proven good.',
          'Output: `CHECK SETUP`',
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing `if (x = 5)` instead of `if (x == 5)`.',
        fix:
          'Assignment yields the assigned value: the condition becomes 5 (true) and x is clobbered - in firmware that can mean writing a hardware enable line as a side effect of a check. Build with -Wall and treat the warning as an error; consider `5 == x` for constants.',
      },
      {
        mistake: 'Negating a compound condition partwise without swapping the connective: thinking !(a && b) is !a && !b.',
        fix:
          'De Morgan: !(a && b) is !a || !b; !(a || b) is !a && !b. Verify with one falsifying row: a=1, b=0 makes a && b false so !(...) is 1, but !a && !b is 0 && 1 = 0 - the misnegation disagrees.',
      },
      {
        mistake: 'Nesting ternaries for multi-way choice: `level > 2 ? "hi" : level > 1 ? "mid" : "lo"`.',
        fix:
          'Chained ternaries read right-to-left through two colons and hide the boundary logic. Use an else-if chain or switch for three or more outcomes; reserve ? : for a genuine two-value pick.',
      },
      {
        mistake: 'Assuming every sub-expression of a condition runs, like `if (validate(s) && s.count > 0)` expecting validate() to always run when the left side is false.',
        fix:
          'Only the operators && || ?: and comma sequence their operands. Anything else may evaluate in either order. If validate() must run for its side effect, call it as its own statement first, then test a stored result.',
      },
    ],
    guidedPractice: {
      title: 'Rewrite, negate, verify',
      brief:
        'Given `int press_ok = 0; int within_range = 1; int repeats = 0;` decide and print whether a button event is accepted: accept requires press_ok AND within_range AND NOT repeats. (1) Write the accept condition. (2) Write the reject condition two ways - the plain negation and the De Morgan form - and confirm they agree. (3) Print the outcome with the ternary operator in one printf.',
      starterCode:
          '#include <stdio.h>\n\nint main(void) {\n    int press_ok = 0;\n    int within_range = 1;\n    int repeats = 0;\n\n    int accept = press_ok && within_range && !repeats;\n    int reject_a = !(press_ok && within_range && !repeats);\n    int reject_b = !press_ok || !within_range || repeats;\n\n    printf("accept=%d reject_a=%d reject_b=%d\\n", accept, reject_a, reject_b);\n    printf("result: %s\\n", accept ? "ACCEPT" : "REJECT");\n    return 0;\n}',
      expectedBehavior:
        'accept = 0 && 1 && 1 = 0. reject_a = !(0) = 1. reject_b = 1 || 0 || 0 = 1 - the two negations agree, demonstrating De Morgan for a three-term conjunction. Output: `accept=0 reject_a=1 reject_b=1` then `result: REJECT`.',
      hints: [
        'Short-circuiting stops the && chain at the first false term - press_ok fails, the rest is not evaluated.',
        'De Morgan over three terms: !(a && b && c) = !a || !b || !c.',
        '%s with a ternary choosing two string literals is a common, readable idiom.',
      ],
    },
    practiceExercises: [
      {
        title: 'Ternary or if? Refactor both ways',
        brief:
          'Rewrite `const char *s = (v > 100) ? "high" : "ok";` as an if/else, then convert `if (n == 0) { return -1; } else { return total / n; }` into a return-with-ternary. State which form you find clearer for each and why, in one sentence apiece.',
        expectedBehavior:
          'First: `const char *s; if (v > 100) { s = "high"; } else { s = "ok"; }` - the ternary was already the compact form. Second: `return (n == 0) ? -1 : total / n;` - the ternary folds the guard and value into one line. Defensible positions: ternary for value selection, if/else when either arm has statements or side effects.',
        hints: [
          'The dividing line: expressions produce values, statements perform actions.',
          'A ternary whose arms contain function calls with side effects is a smell.',
          'Clarity is judged by the next reader, not by line count.',
        ],
      },
      {
        title: 'Build a three-input alarm table',
        brief:
          'For inputs overtemp, undervolt and comm_lost, design an alarm condition that fires when (overtemp AND undervolt) OR comm_lost. Write the C condition, list all eight input rows with the output, and then write the no-alarm condition as a single De Morgan simplification of the negation.',
        expectedBehavior:
          'Alarm: `(overtemp && undervolt) || comm_lost`. It fires for rows: (1,1,0), (1,1,1), (0,0,1), (1,0,1), (0,1,1). No-alarm: `!(...)` = `(!overtemp || !undervolt) && !comm_lost` - derived by distributing the negation over the outer OR, then the inner AND. Rows without alarm: (0,0,0), (1,0,0), (0,1,0).',
        hints: [
          'Parenthesize the AND group first - && binds tighter than || anyway, but the parentheses document the grouping.',
          'Negate step by step: !(A || B) = !A && !B, with A = overtemp && undervolt.',
          'Check the eight-row table against the simplified expression for one arbitrary row to confirm.',
        ],
      },
    ],
    assessment: {
      title: 'Conditional operator and boolean logic checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    int used = 3;\n    int total = 342;\n    int average = (used > 0) ? (total / used) : 0;\n    printf("average=%d\\n", average);\n    return 0;\n}',
          options: ['average=0', 'average=114', 'average=342', 'average=113'],
          answer: 'average=114',
          explanation:
            'used > 0 is true, so the ternary evaluates total / used = 342 / 3 = 114. Had used been 0, the false arm would have supplied 0 and no division would run.',
          hint: 'Which arm of the ternary runs, and what does that arm compute?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: '!(valid && calibrated) is equivalent to which expression?',
          options: ['!valid && !calibrated', '!valid || !calibrated', 'valid || calibrated', '!(valid || calibrated)'],
          answer: '!valid || !calibrated',
          explanation:
            'De Morgan\'s law: negating an AND swaps it to an OR of the negations. The first option is the classic misnegation - it is true only when BOTH fail, instead of when EITHER fails.',
          hint: 'Negate each part, then swap the connective.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In `if (count != 0 && total / count > 10)`, total / count is never evaluated when count is 0.',
          answer: 'true',
          explanation:
            '&& short-circuits: the false left operand means the right operand is not evaluated at all, which is exactly why this pattern safely guards division by zero.',
          hint: 'Short-circuiting is a language guarantee, not an optimization.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A driver checks `if (enable = 0) { disable_hw(); }`. Describe everything that goes wrong when enable was 1.',
          answer: 'The = assigns 0 to enable, the condition evaluates to 0 (false) so disable_hw() never runs, and the enable flag is silently cleared as a side effect of the check - a compound logic and state bug',
          explanation:
            'Assignment-in-condition both inverts the intended test (it tests the assigned value, not the comparison) and corrupts the variable - in firmware that can clear a hardware enable line. -Wall flags it; -Werror keeps it out.',
          hint: 'What does an assignment expression evaluate to, and what did it change?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'code-completion',
          prompt: 'Complete the ternary so the string is "DC" when the reading is above 512 and "AC" otherwise:\n\n```\nconst char *kind = (reading > 512) ? ______ : ______;\n```',
          answer: '"DC"',
          explanation:
            'The completed line is `const char *kind = (reading > 512) ? "DC" : "AC";` - the true arm holds the string literal "DC". The answer accepted here is the true-arm literal; the full line shows both.',
          hint: 'The true arm sits between ? and :.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Conditional operator', definition: 'The ternary ? : - an expression that yields its second or third operand depending on the first.' },
      { term: 'Short-circuit evaluation', definition: '&& and || skip the right operand when the left decides the outcome; a sequencing guarantee you can build guards on.' },
      { term: 'De Morgan\'s laws', definition: '!(a && b) == !a || !b and !(a || b) == !a && !b - the correct way to negate compound conditions.' },
      { term: 'Guard', definition: 'A condition pattern where the left operand makes the right operand safe (nonzero divisor, valid pointer).' },
      { term: 'Assignment-in-condition', definition: 'The if (x = 5) bug: assignment as expression evaluates true and mutates the variable.' },
      { term: 'Truth table', definition: 'The complete input-to-output listing of a boolean expression, used to verify and minimize conditions.' },
    ],
    revisionSummary: [
      '? : chooses between two values; if/else performs actions - nest ternaries never, side effects never.',
      'Short-circuit && || are control flow: guards for division and dereferences, cheap tests leftmost.',
      'De Morgan: !(a && b) = !a || !b; !(a || b) = !a && !b - verify a misnegation with one falsifying row.',
      'if (x = 5) assigns instead of comparing - -Wall catches it, -Werror bans it.',
      'For three or more variables, write the truth table first: it exposes tautologies and dead tests.',
      'Only &&, ||, ?: and comma guarantee operand order - side effects go in their own statements.',
    ],
    furtherReading: [
      { label: 'cppreference - logical operators', url: 'https://en.cppreference.com/w/c/language/operator_logical', kind: 'docs' },
      { label: 'Wikipedia - De Morgan\'s laws', url: 'https://en.wikipedia.org/wiki/De_Morgan%27s_laws', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
];
