import type { TutorialLesson } from '../types';

export const module07Lessons: TutorialLesson[] = [
  {
    id: 'cpg-m07-l1',
    title: 'One-Dimensional Arrays',
    summary:
      'Store batches of samples in contiguous memory, index them safely, and compute min/max/average - while respecting the fact that C will not stop you from stepping past the end.',
    objectives: [
      'Declare, initialize and index 1D arrays of fixed size.',
      'Use sizeof to derive element counts and understand when it fails.',
      'Write the min/max/average scan as a single pass.',
      'Explain why out-of-bounds indexing is undefined behavior and design loops that cannot do it.',
    ],
    whyItMatters:
      'Arrays are the firmware data structure: ADC sample buffers, UART receive rings, lookup tables in flash. C gives you raw, unchecked indexing - the speed you want and the foot-gun you must respect. The single-pass statistics scan in this lesson is also the skeleton of the first course project.',
    prerequisites: ['cpg-m05-l1', 'cpg-m02-l3'],
    explanation:
      'An **array** is a fixed number of elements of one type, stored side by side in memory:\n\n```\nint samples[5] = {120, 90, 200, 75, 115};\n```\n\n### Indexing starts at zero\n\n`samples[0]` is the first element, `samples[4]` the last. The size in brackets at declaration is the *count*, while the index runs 0..count-1 - the source of every off-by-one in existence. There is no bounds checking: `samples[5]` compiles and reads whatever bytes sit after the array (or corrupts them, on a write). The behavior is undefined - possibly garbage, possibly a crash, possibly nothing visible today and a heap of trouble tomorrow. The discipline that prevents the whole class: index only with loop bounds of `i < n`, and never hard-code an index you have not traced.\n\n### Initialization rules\n\nAn initializer list fills elements in order. With fewer values than elements, the **rest are zero**: `int buf[8] = {1, 2};` gives {1, 2, 0, 0, 0, 0, 0, 0} - and `= {0}` is the idiom for a zero-filled array. With no initializer, a local array holds garbage (same rule as scalars). The size may be omitted when the initializer determines it: `int taps[] = {1, -1};` is a 2-element array.\n\n### sizeof and element counts\n\n`sizeof samples` is the total bytes (5 * 4 = 20 for int on typical targets); `sizeof samples[0]` is one element; the element count is `sizeof samples / sizeof samples[0]`. This works **only where the array is declared** - inside the same scope that owns the real array. Passed to a function, the array name decays to a pointer and sizeof returns pointer size (module 8); that is why C functions always take the length alongside the array.',
    deepDive:
      '### Why arrays are fast: the address formula\n\nElement i lives at `base + i * sizeof(element)` - one multiply and one add, which is why array indexing compiles to a couple of instructions and why C costs nothing per access. The same formula explains the layout: element 0 sits at the base, element 1 exactly one element-width later, and the whole array occupies size * sizeof(element) contiguous bytes. Firmware cares about the consequences: a uint8_t buffer of 256 entries is exactly 256 bytes (which fits a page), and a cache line - or an MCU flash prefetch - fetches several neighbors of whatever you touch, so sequential scans are the fastest pattern available. Module 8 re-derives all of this with pointers; the mental model to keep is "index is an offset in element units".\n\n### Buffers in embedded systems\n\nReal firmware arrays come with sizing rules. A sample buffer must hold the worst-case burst between reads, not the average. A string buffer must hold the longest message plus its terminator (lesson 3). Ring buffers add head/tail indices and modulo arithmetic (module 3\'s %) to reuse a fixed array forever - zero dynamic allocation, deterministic memory, which is exactly what safety-oriented embedded standards demand. When you size an array, write the reasoning next to it: `#define SAMPLE_BUFFER 64 /* 64 ms at 1 kHz sampling */` - the comment is the specification that survives refactoring.\n\n### Array parameters: the length travels separately\n\nBecause arrays decay to pointers when passed, a function receiving `int data[]` receives only an address. Every array-taking function therefore takes the length too - `int sum(const int *data, int n)` - and trusts nothing about the size. (The `const` there promises the function will not modify the caller\'s data - module 8 formalizes it.) This convention is universal in C APIs you will use: memcpy(dst, src, n), read(fd, buf, count) - the length always rides along.',
    examples: [
      {
        title: 'Single-pass min, max and average',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int samples[5] = {120, 90, 200, 75, 115};\n    int n = 5;\n\n    int min = samples[0];\n    int max = samples[0];\n    int total = 0;\n\n    for (int i = 0; i < n; i++) {\n        if (samples[i] < min) {\n            min = samples[i];\n        }\n        if (samples[i] > max) {\n            max = samples[i];\n        }\n        total += samples[i];\n    }\n\n    printf("n=%d min=%d max=%d avg=%d\\n", n, min, max, total / n);\n    return 0;\n}',
        explanation: [
          'The array is declared with an initializer; n names the element count so every bound derives from one place.',
          'Seeding min and max with samples[0] (not 0!) matters: 0 would report a false minimum for all-positive data.',
          'One pass does all three statistics: compare low, compare high, accumulate. i runs 0..4 - the `i < n` bound touches exactly the five real elements.',
          'The sum is 120 + 90 + 200 + 75 + 115 = 600; the average 600 / 5 = 120 in integer arithmetic (no fraction here - but module 4 covered the truncation trap when there is one).',
          'Output: `n=5 min=75 max=200 avg=120`',
        ],
      },
      {
        title: 'Initializer rules and sizeof, observed',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int partial[8] = {1, 2};          /* rest zero-filled */\n    int zeroed[4] = {0};              /* all zero         */\n    int implicit[] = {10, 20, 30};    /* size 3 from list */\n\n    printf("partial: %d %d %d\\n", partial[0], partial[1], partial[7]);\n    printf("zeroed: %d %d\\n", zeroed[0], zeroed[3]);\n    printf("implicit count = %zu\\n", sizeof(implicit) / sizeof(implicit[0]));\n    printf("implicit bytes = %zu\\n", sizeof(implicit));\n    return 0;\n}',
        explanation: [
          'partial[1] is 2 and partial[7] is 0: values beyond the initializer list are zero-initialized by the standard.',
          '`{0}` zero-fills the whole array - the standard buffer-initializing idiom.',
          'The compiler counted implicit[] from its list: 3 elements. sizeof(implicit) is 3 * 4 = 12 bytes; dividing by sizeof(implicit[0]) = 4 recovers the count 3.',
          '%zu is the correct specifier for size_t (the type of sizeof) - module 10 returns to why specifier mismatches are bugs.',
          'Output:\n```\npartial: 1 2 0\nzeroed: 0 0\nimplicit count = 3\nimplicit bytes = 12\n```',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'A 5-element int array in memory',
        content:
          '   index:      0       1       2       3       4\n             +-------+-------+-------+-------+-------+\n   samples   |  120  |   90  |  200  |   75  |  115  |\n             +-------+-------+-------+-------+-------+\n   address   base   base+4  base+8  base+12 base+16      (4-byte int)\n\n   element i address = base + i * 4\n   total size        = 5 * 4 = 20 bytes\n   valid indices     = 0 .. 4     (samples[5] is OUT OF BOUNDS)',
        caption:
          'Elements sit side by side; the index is an offset in element units. C performs no bounds check - the guard is your loop condition.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Looping to `i <= n` and touching samples[n].',
        fix:
          'Valid indices are 0..n-1; the condition is `i < n`. samples[n] is out of bounds - undefined behavior, reading (or worse, writing) memory past the array.',
      },
      {
        mistake: 'Seeding min (or max) with 0 instead of the first element.',
        fix:
          'For all-positive data, min stays 0 and reports a false result. Seed both statistics with samples[0] and scan from i = 1 (or scan from 0 - harmless redundancy).',
      },
      {
        mistake: 'Trusting sizeof(arr) inside a function that received the array as a parameter.',
        fix:
          'The parameter is a pointer; sizeof gives pointer size (typically 8), not the array size. Pass the element count alongside and use it for bounds.',
      },
      {
        mistake: 'Sizing an array to the average case and overflowing it in a burst.',
        fix:
          'Size for the worst case with margin, define it as a named constant with its reasoning in a comment, and never write an index computed from unvalidated input.',
      },
    ],
    guidedPractice: {
      title: 'Extend the scan: second highest',
      brief:
        'Modify the min/max/average example to also find the second-largest value (assume at least 2 elements, duplicates allowed). Predict the result for the sample data {120, 90, 200, 75, 115} - the second largest is 120 - then implement and verify.',
      starterCode:
          '#include <stdio.h>\n\nint main(void) {\n    int samples[5] = {120, 90, 200, 75, 115};\n    int n = 5;\n\n    int largest = samples[0] > samples[1] ? samples[0] : samples[1];\n    int second  = samples[0] > samples[1] ? samples[1] : samples[0];\n\n    for (int i = 2; i < n; i++) {\n        if (samples[i] > largest) {\n            second = largest;\n            largest = samples[i];\n        } else if (samples[i] > second) {\n            second = samples[i];\n        }\n    }\n\n    printf("largest=%d second=%d\\n", largest, second);\n    return 0;\n}',
      expectedBehavior:
        'Seed: largest=120, second=90. i=2: 200 > 120 -> second=120, largest=200. i=3: 75 no. i=4: 115 > second(120)? No. Output: `largest=200 second=120`. The trick is updating second BEFORE largest when a new champion arrives.',
      hints: [
        'Seed both from the first two elements, ordered.',
        'A new largest demotes the old largest to second - update that path first.',
        'Trace each of the five elements through the two branches before running.',
      ],
    },
    practiceExercises: [
      {
        title: 'Running average of the last N',
        brief:
          'Given a 10-element array of samples, compute and print the average of each window of 3 consecutive elements (windows starting at indices 0..7), using integer division. State how many windows exist for n elements.',
        expectedBehavior:
          'For samples {10, 20, 30, 40, 50, 60, 70, 80, 90, 100}: windows average 20, 30, 40, 50, 60, 70, 80, 90 (e.g. first = (10+20+30)/3 = 20). For n elements with window w there are n - w + 1 windows (8 here): the loop bound `i <= n - w` encodes exactly the out-of-bounds discipline.',
        hints: [
          'The inner sum runs i..i+2 - check the maximum index touched: i + 2 must stay < n.',
          'Deriving the loop bound on paper first is the whole exercise: i goes 0..7.',
          'Integer division truncates; all these windows divide evenly.',
        ],
      },
      {
        title: 'Count threshold crossings',
        brief:
          'Given a sample array, count how many elements exceed 100 AND how many rising crossings there are (element i-1 <= 100 and element i > 100) - print both. Use {50, 120, 90, 130, 140, 80} and predict before running.',
        expectedBehavior:
          'Over 100: 120, 130, 140 -> 3. Rising crossings: at index 1 (50->120) and index 3 (90->130) -> 2. The crossing test needs i >= 1 (element 0 has no predecessor) - start the loop at 1.',
        hints: [
          'Two independent counters in one pass.',
          'A crossing compares element i with element i - 1: the loop must start at index 1.',
          'Predict the two numbers by hand before running - that is the tracing habit.',
        ],
      },
    ],
    assessment: {
      title: '1D arrays checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    int samples[5] = {120, 90, 200, 75, 115};\n    int max = samples[0];\n    for (int i = 1; i < 5; i++) {\n        if (samples[i] > max) {\n            max = samples[i];\n        }\n    }\n    printf("max=%d\\n", max);\n    return 0;\n}',
          options: ['max=120', 'max=200', 'max=75', 'max=5'],
          answer: 'max=200',
          explanation:
            'The scan seeds max with element 0 (120) and walks i = 1..4; 200 at index 2 beats it, and nothing later is larger.',
          hint: 'Follow the champion: which element displaces the seed?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'After `int buf[6] = {9, 8};`, what is buf[4]?',
          options: ['garbage', '9', '0', 'undefined behavior to read'],
          answer: '0',
          explanation:
            'With an initializer list present, elements beyond the listed values are zero-initialized by the standard. (It would be garbage only with NO initializer at all.)',
          hint: 'An initializer list - even a short one - zeroes the remainder.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Reading samples[n] for an n-element array is a compile-time error.',
          answer: 'false',
          explanation:
            'C performs no bounds checking: the access compiles and its behavior at runtime is undefined - it may read adjacent memory harmlessly, crash, or corrupt state. The guard is your loop condition.',
          hint: 'Who checks the index - the compiler or you?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A function computes `int count = sizeof(data) / sizeof(data[0]);` from its parameter `void process(int data[])` called with a 10-element array, then loops using count. What goes wrong on a typical 64-bit host?',
          answer: 'Inside the function data is a pointer, so sizeof(data) is 8 (pointer size) and the computed count is 2 (8 / 4) - the loop processes only the first 2 elements - fix by passing the element count as a parameter',
          explanation:
            'Arrays decay to pointers when passed; sizeof sees the pointer, not the original array. The length must travel as its own argument - the universal C API convention.',
          hint: 'What type does the parameter really have inside the function?',
          difficulty: 'hard',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Why does the min/max scan seed both statistics with samples[0] instead of 0?',
          answer: 'Zero is not a neutral seed: for all-positive data it would remain the false minimum (or for all-negative data the false maximum), so the statistics must start from an actual element of the data',
          explanation:
            'Seeding with a real element makes the scan correct for any value range; seeding with 0 quietly assumes the data contains values on both sides of zero.',
          hint: 'Feed the scan an array of all 5s and check each seeding choice.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Array', definition: 'A fixed-size, contiguous sequence of same-type elements addressed by index from 0.' },
      { term: 'Index', definition: 'The zero-based element offset; valid range is 0..count-1.' },
      { term: 'Out-of-bounds', definition: 'Access outside 0..count-1 - compiles fine, undefined behavior at runtime.' },
      { term: 'sizeof', definition: 'The byte size of a type or object; divided by the element size it yields the element count - in the declaring scope only.' },
      { term: 'Array decay', definition: 'The conversion of an array name to a pointer when passed to functions; the length does not travel with it.' },
      { term: 'Zero-initializer', definition: 'The = {0} idiom that sets every element to zero - the standard buffer initialization.' },
    ],
    revisionSummary: [
      'Arrays are contiguous same-type elements; index runs 0..count-1 with no runtime checks.',
      'Initializer lists zero-fill the remainder; {0} is the all-zero idiom; no initializer means garbage.',
      'sizeof(arr)/sizeof(arr[0]) counts elements in the declaring scope only - parameters decay to pointers.',
      'Seed statistics with real elements, not 0; scan with i < n bounds.',
      'One pass can compute min, max and total together.',
      'Size buffers for the worst case and document the sizing in a comment.',
    ],
    furtherReading: [
      { label: 'cppreference - array declaration', url: 'https://en.cppreference.com/w/c/language/array', kind: 'docs' },
      { label: 'Wikipedia - Array data type', url: 'https://en.wikipedia.org/wiki/Array_data_type', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'cpg-m07-l2',
    title: 'Two-Dimensional Arrays',
    summary:
      'Model grids - keypads, day-by-slot tables, image lines - with 2D arrays, learn row-major storage, and handle the swap-a-row-with-a-column mistakes before they happen.',
    objectives: [
      'Declare, initialize and index 2D arrays with [row][col] syntax.',
      'Explain row-major storage and compute an element\'s linear offset.',
      'Walk a grid with nested loops, keeping the bounds straight.',
      'Flatten 2D indexing manually with row * COLS + col.',
    ],
    whyItMatters:
      'Sensor logs are tables (day x hour), keypads are matrices (row x column), small displays are pixel grids. Two-dimensional arrays express all of them directly - and the row-major memory model underneath is the same one used by image buffers, matrix libraries and DMA engines throughout embedded work.',
    prerequisites: ['cpg-m07-l1'],
    explanation:
      'A 2D array is an array of arrays: `int temps[3][7]` is 3 rows of 7 ints. The initializer nests braces row by row:\n\n```\nint temps[3][7] = {\n    {21, 22, 20, 19, 21, 23, 22},   /* row 0 */\n    {24, 25, 24, 23, 25, 26, 25},   /* row 1 */\n    {18, 17, 18, 19, 18, 17, 18}    /* row 2 */\n};\n```\n\nAccess is `temps[row][col]` - row first, always. The bounds discipline doubles: rows 0..2, columns 0..6, and swapped indices compile fine while reading the wrong cells. Nested loops walk the grid; the conventional order is row-major (outer over rows, inner over columns) because that is also the memory order - sequential access, the fastest pattern.\n\n### Row-major storage\n\nC stores 2D arrays **row by row**: row 0\'s seven elements occupy the first 28 bytes (7 * 4), then row 1, then row 2. The linear offset of `temps[r][c]` is `r * 7 + c` elements. This single fact explains three practical things: why `temps[r][c]` and `temps[c][r]` are different cells, why flattening a grid into a 1D array uses `r * COLS + c` (the standard trick in image code and matrix drivers), and why passing a 2D array to a function requires the column count (`int (*data)[7]` or `int data[][7]`) - the compiler needs COLS to compute addresses.',
    deepDive:
      '### The offset formula as a working tool\n\n`addr(r, c) = base + (r * COLS + c) * sizeof(element)`. Work one: temps[1][5] with COLS = 7 is (1*7 + 5) * 4 = 48 bytes past the base. Firmware uses this everywhere: display code maps a pixel (x, y) to a framebuffer byte; EEPROM layouts map (page, offset) to an address; keypad scanners map (row, column) to a pin pair. When a spec says "the value is stored at linear index 23 in a 7-wide table", you now divide: 23 / 7 = row 3, 23 % 7 = column 2. Row-major + integer division/remainder is the complete mapping toolkit in both directions.\n\n### Passing 2D arrays to functions\n\nThe decay rule from 1D arrays generalizes: `temps` decays to a pointer to its first *row* (type `int (*)[7]`), so the function signature must carry the column count: `void print_grid(const int data[][7], int rows)` or the equivalent `int (*data)[7]`. The compiler then knows each row step advances 7 elements. The row count still rides as a parameter because only the caller knows it. Passing `int **` is a different structure entirely (an array of pointers) and does not accept a true 2D array - a classic porting bug. This course keeps the flat rule: true 2D arrays pass with the column count; dynamically-sized matrices use the flattened r * COLS + c form.\n\n### Initialization edge cases\n\nMissing inner braces: `int a[2][3] = {1, 2, 3, 4, 5, 6};` is legal - values fill row-major, giving rows {1,2,3} and {4,5,6} - but the braced form documents intent and lets the compiler catch a short row. As with 1D arrays, any omitted elements are zero-filled, and `= {0}` zeroes the whole grid. Partial rows (`{21, 22}` for a 7-wide row) zero-fill the row\'s tail - useful for sparsely populated lookup tables, dangerous when the zeros are silently wrong data.',
    examples: [
      {
        title: 'Finding the hottest cell in a week grid',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    /* rows: measurement slots; cols: 7 days */\n    int temps[3][7] = {\n        {21, 22, 20, 19, 21, 23, 22},\n        {24, 25, 24, 23, 25, 26, 25},\n        {18, 17, 18, 19, 18, 17, 18}\n    };\n\n    int hottest_row = 0;\n    int hottest_col = 0;\n\n    for (int r = 0; r < 3; r++) {\n        for (int c = 0; c < 7; c++) {\n            if (temps[r][c] > temps[hottest_row][hottest_col]) {\n                hottest_row = r;\n                hottest_col = c;\n            }\n        }\n    }\n\n    printf("hottest = %d at row %d, col %d\\n",\n           temps[hottest_row][hottest_col], hottest_row, hottest_col);\n    return 0;\n}',
        explanation: [
          'The champion pattern from 1D arrays extends: seed with cell (0,0), compare every cell, remember the winner\'s coordinates.',
          'The nested loops visit all 21 cells in row-major order: r = 0 scans all seven columns, then r = 1, then r = 2.',
          'The maximum is 26, sitting in row 1 (the midday slot), column 5. Scanning order does not matter for the result - only the strict > comparison does (first maximal cell wins ties).',
          'Output: `hottest = 26 at row 1, col 5`',
        ],
      },
      {
        title: 'Flattened indexing: the r * COLS + c identity',
        language: 'c',
        code:
          '#include <stdio.h>\n\n#define ROWS 3\n#define COLS 7\n\nint main(void) {\n    int flat[ROWS * COLS];\n    int grid[ROWS][COLS];\n\n    /* fill via the flat view */\n    for (int i = 0; i < ROWS * COLS; i++) {\n        flat[i] = i * 10;\n    }\n\n    /* copy flat -> grid two ways: double index and manual offset */\n    for (int r = 0; r < ROWS; r++) {\n        for (int c = 0; c < COLS; c++) {\n            grid[r][c] = flat[r * COLS + c];\n        }\n    }\n\n    printf("grid[1][5] = %d\\n", grid[1][5]);\n    printf("flat[12]   = %d\\n", flat[1 * COLS + 5]);\n    return 0;\n}',
        explanation: [
          'flat[i] = i * 10 means flat[12] holds 120 - and grid[1][5] maps to the same cell because 1 * 7 + 5 = 12.',
          'The line `grid[r][c] = flat[r * COLS + c];` is the whole lesson: both views address the same layout, and the manual offset is what low-level drivers and image code use.',
          'Verifying the identity on one cell (here row 1, col 5) is the sanity check that COLS is right - a wrong COLS scrambles rows silently.',
          'Output:\n```\ngrid[1][5] = 120\nflat[12]   = 120\n```',
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Swapping row and column indices: `temps[day][slot]` on a slot-by-day array.',
        fix:
          'The first index is always the declared first dimension. Sketch the grid with its axes before writing accessors, and test one known cell (a value you placed deliberately) to catch a transpose early.',
      },
      {
        mistake: 'Using the row count for the inner loop: `for (c = 0; c < ROWS; c++)` inside the column loop.',
        fix:
          'Each dimension has its own bound: outer rows loop to ROWS, inner columns loop to COLS. Name the constants (not magic 3 and 7) so the wrong one is visible.',
      },
      {
        mistake: 'Passing a 2D array to a function as `int **data`.',
        fix:
          'A true 2D array is one contiguous block, not an array of pointers. Use `const int data[][COLS]` (column count required) or flatten to 1D with r * COLS + c.',
      },
      {
        mistake: 'Assuming braces can be omitted safely: `int a[2][3] = {1, 2, 3, 4};`.',
        fix:
          'It compiles - values fill row-major and the rest zero-fill - but the row structure is invisible and a short list is silently accepted. Always brace per row; the compiler then checks counts.',
      },
    ],
    guidedPractice: {
      title: 'Row and column sums of a grid',
      brief:
        'For the 3x7 temps grid, compute each row\'s sum (3 numbers) and each column\'s sum (7 numbers). Write the two loops, predict the row sums on paper (row 0: 21+22+20+19+21+23+22 = 148), then verify.',
      starterCode:
          '#include <stdio.h>\n\n#define ROWS 3\n#define COLS 7\n\nint main(void) {\n    int temps[ROWS][COLS] = {\n        {21, 22, 20, 19, 21, 23, 22},\n        {24, 25, 24, 23, 25, 26, 25},\n        {18, 17, 18, 19, 18, 17, 18}\n    };\n\n    for (int r = 0; r < ROWS; r++) {\n        int row_sum = 0;\n        for (int c = 0; c < COLS; c++) {\n            row_sum += temps[r][c];\n        }\n        printf("row %d sum = %d\\n", r, row_sum);\n    }\n\n    for (int c = 0; c < COLS; c++) {\n        int col_sum = 0;\n        for (int r = 0; r < ROWS; r++) {\n            col_sum += temps[r][c];\n        }\n        printf("col %d sum = %d\\n", c, col_sum);\n    }\n    return 0;\n}',
      expectedBehavior:
        'Row sums: 148, 172, 125. Column sums: 63, 64, 62, 61, 64, 66, 65. Note the loop order flips between the two passes: summing a column walks DOWN the rows with the column index fixed - and that inner loop over r accesses memory with a stride of COLS elements, the cache-unfriendly direction worth knowing about.',
      hints: [
        'Row sum: outer loop over r, inner over c, accumulator reset per row.',
        'Column sum: swap the loop roles - outer over c, inner over r.',
        'Check one column by hand: col 0 is 21 + 24 + 18 = 63.',
      ],
    },
    practiceExercises: [
      {
        title: 'Keypad matrix lookup',
        brief:
          'Model a 4x4 matrix keypad as `char keys[4][4]` with rows 1-4 and columns 1-4 holding the characters 1-9, then *, 0, #, A-D in phone layout. Write a function-style lookup: given row and column (0-based), print the key. Test keys[3][1] (row 3, col 1).',
        expectedBehavior:
          'Layout rows: {1,2,3,A}, {4,5,6,B}, {7,8,9,C}, {*,0,#,D}. keys[3][1] is 0. The exercise cements [row][col] order and the "first index first" rule.',
        hints: [
          'Initialize with four braced rows of four chars each.',
          'Row 3, col 1: fourth row, second entry - the * 0 # D row, second element.',
          'Print a char with %c.',
        ],
      },
      {
        title: 'Transpose a square grid',
        brief:
          'Transpose a 3x3 grid in place (grid[i][j] and grid[j][i] swap). Do it with a loop where the inner index starts at the outer index plus one, so each pair swaps exactly once. Verify by printing before and after.',
        expectedBehavior:
          'The pattern: `for (int i = 0; i < 3; i++) { for (int j = i + 1; j < 3; j++) { swap cells } }`. Starting j at i+1 visits each unordered pair once - starting at 0 would swap everything twice and restore the original, the classic transpose bug.',
        hints: [
          'The diagonal (i == j) never moves.',
          'Trace the three swaps for a 3x3: (0,1), (0,2), (1,2).',
          'Swapping twice returns the grid to its start - the j = i + 1 start is the fix.',
        ],
      },
    ],
    assessment: {
      title: '2D arrays checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    int g[2][3] = {\n        {1, 2, 3},\n        {4, 5, 6}\n    };\n    printf("%d %d\\n", g[1][0], g[0][2]);\n    return 0;\n}',
          options: ['4 3', '3 4', '2 6', '4 2'],
          answer: '4 3',
          explanation:
            'g[1][0] is row 1, column 0 - the value 4. g[0][2] is row 0, column 2 - the value 3. First index is the row.',
          hint: 'Row first, then column - read the initializer as rows.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In a 4-column 2D array, which linear (flattened) index corresponds to element [2][3]?',
          options: ['10', '11', '9', '23'],
          answer: '11',
          explanation:
            'The offset is r * COLS + c = 2 * 4 + 3 = 11. Row-major order stores complete rows one after another.',
          hint: 'Each row contributes COLS elements before the next row starts.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'C stores 2D arrays column by column (column-major).',
          answer: 'false',
          explanation:
            'C is row-major: the rightmost index varies fastest, so row 0 lies contiguously first. (Some numerical languages like Fortran are column-major - a classic porting trap.)',
          hint: 'Which index changes fastest as you walk the linear memory?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A function receives a 2D array declared `int data[][COLS]` but the author wrote the parameter as `int **data` and calls it with a true 2D array. What breaks?',
          answer: 'int** means an array of pointers, but a true 2D array is one contiguous block whose rows the compiler locates with row * COLS - passing it as int** misinterprets the first row\'s bytes as pointer values, producing garbage accesses',
          explanation:
            'The two layouts are incompatible. Correct signatures carry the column count: int data[][COLS] or int (*data)[COLS].',
          hint: 'How does the compiler compute the address of data[1][0]?',
          difficulty: 'hard',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'You must invert the mapping "linear index -> (row, col)" for a 7-column table. Give the two formulas.',
          answer: 'row = index / COLS and col = index % COLS (with COLS = 7)',
          explanation:
            'Division counts whole rows traversed; the remainder is the offset within the row. These two formulas, with row-major storage, cover every grid flattening in both directions.',
          hint: 'One uses integer division, the other the remainder.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: '2D array', definition: 'An array of arrays: type name[ROWS][COLS], indexed [row][col].' },
      { term: 'Row-major order', definition: 'C\'s storage layout: complete rows stored contiguously; the last index varies fastest.' },
      { term: 'Flattened index', definition: 'The 1D position of a grid cell: row * COLS + col - the bridge between grids and linear buffers.' },
      { term: 'Stride', definition: 'The element distance between consecutive accesses; column-wise walking on a row-major grid has a stride of COLS.' },
      { term: 'Decayed row pointer', definition: 'What a 2D array becomes when passed: a pointer to its first row (type int (*)[COLS]).' },
      { term: 'Transpose', definition: 'Swapping a grid across its diagonal: [i][j] exchanges with [j][i].' },
    ],
    revisionSummary: [
      '[row][col] - the first index is the outer dimension; initializer braces nest per row.',
      'Row-major storage: addr(r,c) offset = r * COLS + c elements; flattening and unflattening use it in both directions.',
      'Nested loops: outer bound ROWS, inner bound COLS - name both, never swap them.',
      '2D array parameters carry the column count: int data[][COLS]; int** is a different structure.',
      'Row sums walk contiguous memory; column sums stride - same result, different access pattern.',
      'Omitted initializer elements zero-fill; brace each row so the compiler checks counts.',
    ],
    furtherReading: [
      { label: 'cppreference - multidimensional arrays', url: 'https://en.cppreference.com/w/c/language/array', kind: 'docs' },
      { label: 'Wikipedia - Row- and column-major order', url: 'https://en.wikipedia.org/wiki/Row-_and_column-major_order', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'cpg-m07-l3',
    title: 'Character Arrays and C Strings',
    summary:
      'Meet the null-terminated string - C\'s convention for text - and learn the sizeof-versus-strlen distinction, buffer sizing, and exactly why an unterminated char array is a landmine.',
    objectives: [
      'Declare strings as char arrays with correct size for content plus terminator.',
      'Explain the null terminator and what functions do when it is missing.',
      'Distinguish sizeof (allocation) from strlen (content length).',
      'Modify strings element-wise and keep them terminated.',
    ],
    whyItMatters:
      'Every protocol, every AT command, every log line is a C string. The null terminator is invisible, uncounted, and responsible for a large share of embedded crashes - a UART handler that forgets one byte of room writes into the next variable and the product misbehaves in ways that look like hardware faults. This lesson is defensive equipment.',
    prerequisites: ['cpg-m07-l1', 'cpg-m02-l4'],
    explanation:
      'C has no string type. A **string** is a convention: a char array whose text runs to a terminator byte, the **null character** `\'\\0\'` (code 0). Every library function that reads a string - printf with %s, strlen, strcmp - walks bytes until it reaches that zero.\n\n```\nchar name[8] = "MSP430";\n```\n\nstores seven meaningful bytes: M, S, P, 4, 3, 0 and the terminator. The declaration size (8) is the buffer; the string length (6) is the content. The rule that sizes buffers: **capacity = longest content + 1**.\n\n### Two measurements, two questions\n\n- `sizeof(name)` answers "how big is the buffer?" - 8 here, a compile-time constant.\n- `strlen(name)` answers "how many characters before the terminator?" - 6, computed by scanning at runtime.\n\nConfusing them overflows buffers: sizing a copy destination by strlen forgets the terminator byte.\n\n### What a missing terminator does\n\nAn array like `{ \'O\', \'K\', \'!\' }` with no \'\\0\' is not a string - it is three chars. Passing it to printf("%s") makes the function walk past the array into neighboring memory, printing garbage until it luckily finds a zero - undefined behavior. The fix is either declaring a real string literal ("OK!") or appending the terminator explicitly.',
    deepDive:
      '### Why the terminator design, and its price\n\nStoring the length at the front (as Pascal did) costs a fixed two bytes and bounds every scan - but it caps the length and complicates slicing. C\'s terminator approach makes strings just arrays: any char pointer into the middle of a buffer is a valid string start, functions need no length bookkeeping, and literals are zero-cost. The price is the entire family of bugs this lesson covers: overflow (writing past the terminator), missing terminator (reading past the end), and off-by-one (no room for the zero). The safety rules follow directly: always size for content + 1, prefer length-bounded APIs (lesson 4), and never trust a char array you did not terminate yourself.\n\n### Literals and the arrays behind them\n\nA string literal like "STM32" is an anonymous read-only array of 6 bytes - five chars plus terminator - that the compiler places in constant storage. `const char *p = "STM32";` points at it (writing through p is undefined); `char a[] = "STM32";` instead copies the 6 bytes into a modifiable local array sized automatically to 6. The distinction matters on embedded targets: literals typically live in flash (free RAM - use const char* for fixed tables), while char arrays live in RAM and can be rewritten. Module 8 puts pointer and array side by side; for now, the rule: literal for fixed text, array for building text.\n\n### Escape sequences and the invisible bytes\n\nTerminator aside, strings carry other invisible bytes: \'\\n\' newline, \'\\t\' tab, \'\\r\' carriage return (terminal protocols end lines with "\\r\\n"), \'\\\\\' a literal backslash, \\"\' a quote inside a quoted string, and \'\\x41\' or \'\\101\' for byte values in hex or octal. A line like printf("OK\\n") is therefore the 4-byte sequence O, K, newline, terminator. Knowing the byte count of a format string is a real skill on firmware: log buffers are sized in bytes, and "just a few chars" that are actually 30 bytes with escapes is how log buffers overflow.',
    examples: [
      {
        title: 'Buffer vs content: sizeof and strlen',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    char name[8] = "MSP430";\n\n    printf("name = %s\\n", name);\n    printf("strlen = %zu\\n", strlen(name));\n    printf("sizeof = %zu\\n", sizeof(name));\n\n    name[0] = \'m\';\n    printf("name = %s\\n", name);\n    return 0;\n}',
        explanation: [
          'The literal "MSP430" copies 7 bytes into the 8-byte buffer: six characters plus the terminator; one byte of spare room remains.',
          'strlen walks to the terminator: 6. sizeof is the declaration size: 8. Two different questions - buffer capacity vs current content.',
          'Element assignment rewrites byte 0; the rest of the string and its terminator are untouched, so printing shows mSP430.',
          'The array is modifiable because it is a char array, not a literal pointer - the deep-dive distinction.',
          'Output:\n```\nname = MSP430\nstrlen = 6\nsizeof = 8\nname = mSP430\n```',
        ],
      },
      {
        title: 'Terminating by hand and the unterminated landmine',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    /* A safe char array built by hand: always leave room\n       for the terminator and WRITE it.                    */\n    char buf[6];\n    buf[0] = \'O\';\n    buf[1] = \'K\';\n    buf[2] = \'!\';\n    buf[3] = \'\\0\';\n\n    printf("buf = %s (strlen %zu)\\n", buf, strlen(buf));\n\n    /* NOT a string: no terminator in sight.\n       Printing this with %s would be undefined behavior. */\n    char broken[3] = { \'N\', \'O\', \'!\' };\n    printf("broken has sizeof %zu - do NOT print it with %%s\\n",\n           sizeof(broken));\n    return 0;\n}',
        explanation: [
          'buf is filled element by element and terminated explicitly at index 3; strlen reports 3 and %s prints OK! safely.',
          'The terminator is a real character literal, \'\\0\', whose value is 0 - writing it is what MAKES the array a string.',
          'broken holds three chars and no zero: sizeof is 3, and passing it to %s would scan into neighboring memory - the comment marks it as do-not-print.',
          'The size rule visible in both: content + 1. buf sized 6 holds up to 5 chars; a 3-byte array never holds a 3-char string.',
          'Output:\n```\nbuf = OK! (strlen 3)\nbroken has sizeof 3 - do NOT print it with %s\n```',
        ],
      },
    ],
    tables: [
      {
        caption: 'sizeof vs strlen',
        headers: ['', 'sizeof(name)', 'strlen(name)'],
        rows: [
          ['Question answered', 'How many bytes is the buffer?', 'How many chars before the terminator?'],
          ['When computed', 'Compile time', 'Runtime (scans the string)'],
          ['Includes terminator', 'Yes', 'No'],
          ['Requires <string.h>', 'No', 'Yes'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Sizing a buffer to the text length and forgetting the terminator: `char id[5] = "STM32";`.',
        fix:
          'A 5-character string needs 6 bytes. The compiler catches literal overflow ("initializer-string too long") but not runtime-built strings - so size every buffer as longest_content + 1 and comment the rule.',
      },
      {
        mistake: 'Printing a char array that was never terminated with %s.',
        fix:
          '%s scans until a zero byte - past your array into adjacent memory. Build strings with literals, or write the \'\\0\' yourself; when in doubt, terminate the last byte of the buffer before use.',
      },
      {
        mistake: 'Using sizeof where strlen is meant (or vice versa) when sizing a copy.',
        fix:
          'A destination must be at least strlen(src) + 1. sizeof(src) is only right when src is the declared array in scope; for pointers it gives pointer size. Lesson 4 shows the snprintf pattern that sidesteps the decision.',
      },
      {
        mistake: 'Comparing strings with == : `if (cmd == "RESET")`.',
        fix:
          'That compares addresses (module 8), not text - and for two different arrays it is always false. Use strcmp(cmd, "RESET") == 0, next lesson.',
      },
    ],
    guidedPractice: {
      title: 'Build a string from digits, terminated',
      brief:
        'Convert the sample values 12, 7 and 340 into a printable string "12/7/340" by hand-building a char buffer: write digits with an offset trick (\'0\' + value for single digits, tens/ones decomposition for 12 and 340), insert \'/\' separators, terminate, then print with %s and verify with strlen (expected 8).',
      starterCode:
          '#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    char buf[9];\n    int pos = 0;\n\n    /* 12 */\n    buf[pos++] = (char)(\'0\' + 12 / 10);\n    buf[pos++] = (char)(\'0\' + 12 % 10);\n    buf[pos++] = \'/\';\n    /* 7 */\n    buf[pos++] = (char)(\'0\' + 7);\n    buf[pos++] = \'/\';\n    /* 340 */\n    buf[pos++] = (char)(\'0\' + 340 / 100);\n    buf[pos++] = (char)(\'0\' + 340 / 10 % 10);\n    buf[pos++] = (char)(\'0\' + 340 % 10);\n    buf[pos] = \'\\0\';\n\n    printf("buf = %s (strlen %zu, sizeof %zu)\\n", buf, strlen(buf), sizeof(buf));\n    return 0;\n}',
      expectedBehavior:
        'Digits: 1,2,/,7,/,3,4,0 then terminator - buf = "12/7/340", strlen 8, sizeof 9. The sizing rule held: 8 characters of content + 1 terminator = 9 bytes exactly.',
      hints: [
        'Digit at tens place: value / 10 % 10; hundreds: value / 100.',
        'The pos++ idiom writes the byte and advances - the hand-rolled cursor.',
        'Count the bytes before declaring the buffer: 8 content + 1 terminator.',
      ],
    },
    practiceExercises: [
      {
        title: 'Count characters without strlen',
        brief:
          'Write your own `int my_strlen(const char *s)` that walks the array counting characters until it reaches \'\\0\'. Verify it against the library strlen on "MSP430" (6), "" (0) and "a b" (3 - the space counts).',
        expectedBehavior:
          'The loop `while (s[i] != \'\\0\') i++;` returns 6, 0 and 3 respectively. The empty string shows the terminator sitting at index 0 - one byte, zero characters.',
        hints: [
          'The terminator is the only stop condition - that IS the string convention.',
          'The parameter syntax const char *s is the pointer form of an array parameter - module 8 explains it fully.',
          'The space character is a real character; only \'\\0\' ends the count.',
        ],
      },
      {
        title: 'Uppercase converter in place',
        brief:
          'Write a loop that converts a char array to uppercase in place: for each character from a to z, subtract 32 (or add the difference \'a\' - \'A\'). Stop at the terminator. Test on "misp430" -> "MISP430", and be careful NOT to lowercase-convert non-letters.',
        expectedBehavior:
          'Scan until \'\\0\'; convert only bytes in the range \'a\'..\'z\' (c - \'a\' + \'A\'); others (digits, punctuation) pass through. "misp430" becomes "MISP430" with the 4 and 3 untouched.',
        hints: [
          'The conversion works because letters are contiguous in ASCII: a is 97, A is 65, difference 32.',
          'Guard the conversion with `if (c >= \'a\' && c <= \'z\')` - digits would otherwise become garbage.',
          'The scan stop condition is the terminator - never a fixed length.',
        ],
      },
    ],
    assessment: {
      title: 'C strings checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    char name[8] = "MSP430";\n    printf("%zu %zu\\n", strlen(name), sizeof(name));\n    return 0;\n}',
          options: ['8 8', '6 8', '6 6', '7 8'],
          answer: '6 8',
          explanation:
            'strlen counts the six characters before the terminator; sizeof reports the declared 8-byte buffer. Two questions, two numbers.',
          hint: 'Content versus allocation - which includes the terminator?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What ends a C string?',
          options: ['A newline character', 'A zero byte (\\'\\0\\')', 'The array size', 'A space'],
          answer: 'A zero byte (\'\\0\')',
          explanation:
            'The null terminator, value 0, marks the end. Every string function scans to it; its absence sends them walking through neighboring memory.',
          hint: 'It is invisible when printed and one byte long.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A buffer intended to hold a 10-character string must be at least 11 bytes.',
          answer: 'true',
          explanation:
            'Capacity = content + terminator. A 10-byte buffer holds at most a 9-character string - the off-by-one that turns into a buffer overflow.',
          hint: 'The terminator needs a byte of its own.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'This prints garbage (or crashes) on some runs. Identify the defect.\n\n```\nchar msg[3];\nmsg[0] = \'H\';\nmsg[1] = \'I\';\nmsg[2] = \'!\';\nprintf("%s\\n", msg);\n```',
          answer: 'The array has no null terminator - %s scans past the three bytes into adjacent memory - fix by sizing msg[4] and setting msg[3] = \'\\0\' (or using the literal "HI!")',
          explanation:
            'A char array without a terminator is not a string; printf with %s reads until it happens to find a zero byte. The fix is one byte of room plus the terminator write.',
          hint: 'What does %s search for, and is it present in msg?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Why does `if (cmd == "RESET")` fail to compare command text, and what is the correct test?',
          answer: '== compares pointer values (the addresses of the two arrays), not their contents - the correct test is strcmp(cmd, "RESET") == 0',
          explanation:
            'The array name decays to an address; two separately stored arrays live at different addresses even when their bytes match. Text comparison is strcmp\'s job.',
          hint: 'What exactly is stored in the variable cmd?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'C string', definition: 'A char array terminated by a zero byte; the convention all C text functions rely on.' },
      { term: 'Null terminator', definition: 'The \'\\0\' byte (value 0) marking string end - required, uncounted by strlen.' },
      { term: 'strlen', definition: 'The runtime count of characters before the terminator; needs <string.h>.' },
      { term: 'sizeof', definition: 'The compile-time byte size of the buffer - allocation, not content.' },
      { term: 'String literal', definition: '"text" in source: a read-only array of chars plus terminator, usually placed in flash.' },
      { term: 'Escape sequence', definition: 'A backslash pair encoding an invisible byte: \\n newline, \\t tab, \\r return, \\\\ backslash, \\0 terminator.' },
    ],
    revisionSummary: [
      'A C string is chars plus a \'\\0\'; every string function scans to that byte.',
      'Buffer capacity = longest content + 1. Always.',
      'strlen = content length (runtime scan); sizeof = allocation size (compile time).',
      'Hand-built strings must write the terminator explicitly - one byte, or nothing works.',
      'Literals live in read-only storage (prefer const char*); char arrays are the modifiable copies.',
      'Comparing text requires strcmp; == compares addresses.',
    ],
    furtherReading: [
      { label: 'Wikipedia - Null-terminated string', url: 'https://en.wikipedia.org/wiki/Null-terminated_string', kind: 'article' },
      { label: 'cppreference - character strings', url: 'https://en.cppreference.com/w/c/string/byte', kind: 'docs' },
      { label: 'Wikipedia - ASCII', url: 'https://en.wikipedia.org/wiki/ASCII', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'cpg-m07-l4',
    title: 'Working with Strings Safely',
    summary:
      'Use strlen, strcmp, and the length-bounded snprintf to build, compare and copy text without overflows - including truncation detection and a small command dispatcher.',
    objectives: [
      'Compare strings with strcmp and read its three-way result.',
      'Copy with snprintf, respect the buffer size, and detect truncation from the return value.',
      'Explain why strcpy and unchecked sprintf are banned in safety-oriented code.',
      'Build a command dispatcher that parses fixed-size command buffers safely.',
    ],
    whyItMatters:
      'String handling is where C code historically gets exploited and where firmware gets flaky: one unchecked strcpy into a small buffer and a long serial line becomes memory corruption. The bounded API discipline here - know the destination size, check the return - is both a security practice and a correctness practice.',
    prerequisites: ['cpg-m07-l3'],
    explanation:
      '### The workhorse functions (<string.h>, <stdio.h>)\n\n- `strlen(s)` - length before the terminator (lesson 3).\n- `strcmp(a, b)` - three-way compare: negative when a sorts before b, 0 when equal, positive after. Tests use `== 0`; never reuse the returned value as a boolean in reverse.\n- `snprintf(dst, sizeof(dst), "...", ...)` - printf with a built-in ceiling: writes at most size-1 characters plus a guaranteed terminator, and **returns the length it would have written** had the buffer been infinite. That return is the truncation detector: if it is >= sizeof(dst), text was cut.\n\n### The unsafe tools and why they persist\n\n`sprintf` has no ceiling - a long input overflows the destination. `strcpy` copies until the terminator with no knowledge of the destination size. `strncpy` was meant as the fix but has a famous trap: when it truncates, it may NOT terminate - the copied array is then not a string, and later use overflows. Modern practice: snprintf for formatted and plain copies alike (passing "%s" and the source), strlen for measurement, strcmp for comparison. Datasheet-level rule for firmware: no strcpy, no sprintf, no strcat in new code.\n\n### A safe copy, spelled out\n\n```\nchar device_id[8];\nint written = snprintf(device_id, sizeof(device_id), "%s", input);\nif (written < 0 || written >= (int)sizeof(device_id)) {\n    /* truncated or error - handle it */\n}\n```\n\nThree things happen: bounded write, guaranteed terminator, and an honest report of the ideal length. Truncation is not hidden - the caller decides whether to retry with a bigger buffer, reject the input, or accept the cut.',
    deepDive:
      '### The strncpy trap in detail\n\n`strncpy(dst, src, n)` copies at most n bytes - but if src is longer than n, the destination receives n bytes and NO terminator; if src is shorter, it pads with zeros to n. Both behaviors surprise someone: the first produces a non-string (a later printf or strcat overflows), the second wastes cycles filling a buffer that snprintf would leave alone. The portable safe copy that does terminate:\n\n```\ndst[n - 1] = \'\\0\';\nstrncpy(dst, src, n - 1);\n```\n\n- but even this wastes padding time, and the truncation is silent unless you check strlen(src) first. snprintf(dst, n, "%s", src) does bounded copy, guaranteed termination and truncation reporting in one call - which is why it is the recommended default and why strncpy is on many embedded style-guide ban lists.\n\n### Command parsing on a serial line: the firmware pattern\n\nA UART command interface is the classic embedded string problem, and its safe shape is always the same: (1) receive into a fixed buffer with a hard cap (the receiver function takes the buffer size); (2) terminate explicitly after the last received byte; (3) compare with strcmp against known commands - never pointer comparisons; (4) parse numeric arguments by converting digits (module 2\'s subtract-\'0\' trick) or with strtol; (5) reject anything that does not parse. No dynamic allocation, no unbounded copies - every step has a size ceiling chosen by you. The example below builds the comparison half; the embedded course adds the UART half.\n\n### Fixed-width text tables in flash\n\nA different string discipline appears in menus and protocols: fixed-width fields ("SET ", "RST ", 4 chars each, padded with spaces). Fixed widths make buffers trivially safe (index arithmetic instead of lengths) and parsing positional (cmd[0..3] is always the opcode) - the style used by binary protocols and legacy instrument interfaces (SCPI aside). When you control both ends, fixed fields beat general text parsing for determinism; when you do not, bounded parsing with snprintf and strcmp is the safe general answer.',
    examples: [
      {
        title: 'Bounded copy with truncation detection',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    char device_id[8];\n    const char *input = "STM32F401";   /* 9 characters */\n\n    int written = snprintf(device_id, sizeof(device_id), "%s", input);\n\n    printf("buffer = [%s]\\n", device_id);\n    printf("written = %d, buffer size = %d\\n",\n           written, (int)sizeof(device_id));\n\n    if (written >= (int)sizeof(device_id)) {\n        printf("TRUNCATED - needed %d bytes\\n", written + 1);\n    }\n    return 0;\n}',
        explanation: [
          'snprintf copies at most size-1 = 7 characters ("STM32F4") and terminates the 8th byte - the buffer is always a valid string afterwards.',
          'The return value is the length snprintf WOULD have written: 9. Since 9 >= 8, truncation is detected - the code reports it instead of hoping.',
          'The needed-bytes message computes 9 + 1 = 10: nine characters plus the terminator. A correct buffer for the full name would be 10 bytes.',
          'Compare with strcpy: same operation, zero knowledge of the 8-byte limit, silent overflow.',
          'Output:\n```\nbuffer = [STM32F4]\nwritten = 9, buffer size = 8\nTRUNCATED - needed 10 bytes\n```',
        ],
      },
      {
        title: 'Command comparison with strcmp',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    const char *cmd = "ON";\n\n    if (strcmp(cmd, "ON") == 0) {\n        printf("lamp is on\\n");\n    } else if (strcmp(cmd, "OFF") == 0) {\n        printf("lamp is off\\n");\n    } else if (strcmp(cmd, "TOGGLE") == 0) {\n        printf("lamp toggled\\n");\n    } else {\n        printf("unknown command\\n");\n    }\n    return 0;\n}',
        explanation: [
          'strcmp walks both strings byte by byte and returns 0 only on an exact match including terminators - "ON" matches "ON" and not "ONX" (which is longer).',
          'The three-way result also orders strings (negative/positive), which is why sort routines love it - but command dispatch only asks the == 0 question.',
          'The else arm catches unknown commands - the string equivalent of switch\'s default.',
          'Output: `lamp is on`',
        ],
      },
    ],
    tables: [
      {
        caption: 'String functions: safe versus hazardous',
        headers: ['Function', 'Bounded?', 'Terminates?', 'Use'],
        rows: [
          ['strlen(s)', 'n/a (read-only)', 'n/a', 'Measure content length'],
          ['strcmp(a, b)', 'n/a (read-only)', 'n/a', 'Compare: 0 means equal'],
          ['snprintf(dst, n, ...)', 'Yes (n)', 'Always', 'Copies and formatting - the default'],
          ['strcpy(dst, src)', 'No', 'Yes if it fits', 'Banned in firmware style guides'],
          ['sprintf(dst, ...)', 'No', 'Yes if it fits', 'Banned - no size ceiling at all'],
          ['strncpy(dst, src, n)', 'Yes (n)', 'NOT always (the trap)', 'Avoid; use snprintf instead'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using strcpy or sprintf with fixed-size buffers.',
        fix:
          'Neither knows the destination size; a long input overflows into neighboring memory. Replace with snprintf(dst, sizeof(dst), ...) and check its return for truncation.',
      },
      {
        mistake: 'Trusting strncpy to terminate.',
        fix:
          'When the source fills the count, strncpy omits the terminator - the result is not a string, and the next string operation overflows. Use snprintf(dst, n, "%s", src), which always terminates and reports truncation.',
      },
      {
        mistake: 'Ignoring snprintf\'s return value.',
        fix:
          'The return is the would-be length: >= size means text was cut. Silent truncation corrupts protocol frames (a shortened checksum line, a clipped command). Log it, handle it, or size the buffer properly.',
      },
      {
        mistake: 'Reversing the strcmp test: `if (strcmp(a, b))` meaning equal.',
        fix:
          'strcmp returns 0 on equality - a value that is false in C. `if (strcmp(a, b))` therefore runs when the strings DIFFER. The unambiguous spellings: `== 0` for equal, `!= 0` for different.',
      },
    ],
    guidedPractice: {
      title: 'Safe command buffer dispatcher',
      brief:
        'Copy a received command word into a fixed 8-byte buffer with snprintf, detect truncation, then dispatch on "START", "STOP" and unknown. Test with "STOP" and with "RESTARTNOW". Predict both outputs first.',
      starterCode:
          '#include <stdio.h>\n#include <string.h>\n\nstatic void dispatch(const char *raw) {\n    char cmd[8];\n    int written = snprintf(cmd, sizeof(cmd), "%s", raw);\n\n    if (written < 0 || written >= (int)sizeof(cmd)) {\n        printf("cmd too long (%d)\\n", written);\n        return;\n    }\n\n    if (strcmp(cmd, "START") == 0) {\n        printf("starting\\n");\n    } else if (strcmp(cmd, "STOP") == 0) {\n        printf("stopping\\n");\n    } else {\n        printf("unknown: [%s]\\n", cmd);\n    }\n}\n\nint main(void) {\n    dispatch("STOP");\n    dispatch("RESTARTNOW");\n    return 0;\n}',
      expectedBehavior:
        'dispatch("STOP"): fits (4 chars + terminator in 8 bytes), prints `stopping`. dispatch("RESTARTNOW"): needs 10 bytes, snprintf writes 7 chars + terminator and returns 10 >= 8, so the truncation branch prints `cmd too long (10)`. No overflow ever occurs, and the truncated text is never mistaken for a valid command.',
      hints: [
        'The return value counts what WOULD be written - compare it against the buffer size, not against strlen.',
        'The truncation branch is also a security boundary: oversized input never becomes a command.',
        'Trace the two calls by hand: which branch does each take?',
      ],
    },
    practiceExercises: [
      {
        title: 'Build a frame line with snprintf',
        brief:
          'Use one snprintf to build the line `[T=%d mv=%d]` inside a 24-byte buffer for T = 1234 and mv = 3300, print it, and state the total length including the terminator.',
        expectedBehavior:
          'The formatted text is `[T=1234 mv=3300]` - 16 characters - needing 17 bytes; it fits in 24, snprintf returns 16, and the buffer holds the 16 chars plus terminator. Output: `[T=1234 mv=3300]`.',
        hints: [
          'Count the literal brackets, letters and spaces separately from the numbers.',
          'snprintf returns 16 here - and 16 < 24, so no truncation branch fires.',
          'A tighter buffer (say 16 bytes) would truncate - compute the worst case before sizing.',
        ],
      },
      {
        title: 'strcmp arithmetic, observed',
        brief:
          'Print the return of strcmp for the pairs ("ABC","ABC"), ("ABC","ABD"), ("ABD","ABC") and ("ABC","AB"). Use %d. Then explain in one comment how the sign encodes lexicographic order.',
        expectedBehavior:
          'Returns 0, negative (typically -1 on the D vs C byte), positive, and positive (the terminator 0 vs C makes "ABC" sort before "AB"). The sign is the order; only == 0 means equality.',
        hints: [
          'The comparison stops at the first differing byte (or both terminators).',
          'D (68) > C (67), so ("ABC","ABD") is negative - a sorts before b means negative.',
          'A shorter string that is a prefix sorts first: its terminator (0) is less than any character.',
        ],
      },
    ],
    assessment: {
      title: 'Safe string handling checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    char buf[8];\n    int written = snprintf(buf, sizeof(buf), "%s", "STM32F401");\n    printf("[%s] %d\\n", buf, written);\n    return 0;\n}',
          options: ['[STM32F401] 9', '[STM32F4] 9', '[STM32F4] 7', '[STM32F40] 8'],
          answer: '[STM32F4] 9',
          explanation:
            'The buffer fits 7 characters plus the terminator, so it holds STM32F4; the return value is the would-be length 9 - truncation detected, not hidden.',
          hint: 'What does snprintf return when the text does not fit?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which function is the recommended default for copying a string into a fixed buffer?',
          options: ['strcpy', 'sprintf', 'strncpy', 'snprintf'],
          answer: 'snprintf',
          explanation:
            'snprintf is bounded by the destination size, always terminates, and reports the would-be length so truncation is detectable. strcpy and sprintf are unbounded; strncpy may not terminate.',
          hint: 'Which one takes the buffer size AND guarantees the terminator?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'When strncpy truncates its source, the destination is guaranteed to be a valid C string.',
          answer: 'false',
          explanation:
            'Exactly the trap: on truncation strncpy copies the counted bytes WITHOUT the terminator. The result is a non-string whose next use overflows. snprintf avoids the whole problem.',
          hint: 'What byte does strncpy omit when it runs out of count?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'This dispatcher never matches. Find the bug.\n\n```\nchar cmd[8];\n/* ... cmd receives "START" ... */\nif (strcmp(cmd, "START")) {\n    printf("starting\\n");\n}\n```',
          answer: 'strcmp returns 0 on equality, and 0 is false in C - the branch runs only when the strings DIFFER - fix the test to strcmp(cmd, "START") == 0',
          explanation:
            'The three-way return encodes order, not truth. The == 0 spelling says "equal" and cannot be misread by the next maintainer.',
          hint: 'What value does a successful comparison return, and how does if read it?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'A 16-byte buffer receives commands from a serial line. State the two properties snprintf guarantees that strcpy does not, and why the second matters for a dispatcher.',
          answer: 'A hard size ceiling (no more than 15 chars written) and a guaranteed terminator - the terminator matters because every later strcmp/printf walks to it, and strcpy\'s unbounded copy on a long serial line overflows adjacent memory',
          explanation:
            'Bounding the write prevents corruption; guaranteed termination keeps the buffer a valid string. The return value adds truncation detection, letting the dispatcher reject oversized input cleanly.',
          hint: 'Think about what happens with a 30-byte input line.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'strcmp', definition: 'Three-way byte comparison: 0 equal, negative/positive for lexicographic order.' },
      { term: 'snprintf', definition: 'Bounded, always-terminating formatted write; returns the would-be length for truncation detection.' },
      { term: 'Truncation', definition: 'Content longer than the destination; detected when snprintf\'s return >= the buffer size.' },
      { term: 'strncpy trap', definition: 'strncpy omits the terminator when it truncates, producing a non-string.' },
      { term: 'Command dispatcher', definition: 'The strcmp-chain pattern mapping received text to actions, with a default arm for unknown input.' },
      { term: 'Fixed-width field', definition: 'Protocol text of a constant size, parsed positionally - the deterministic alternative to general parsing.' },
    ],
    revisionSummary: [
      'Default tools: strlen to measure, strcmp == 0 to compare, snprintf to copy and format.',
      'strcpy, sprintf and strcat have no destination bound - banned in firmware style.',
      'strncpy may not terminate on truncation; snprintf always terminates and reports the would-be length.',
      'Truncation check: written >= sizeof(buffer) means text was cut - handle it explicitly.',
      'Command dispatch: bounded receive, terminate, strcmp chain, unknown-command arm.',
      'size every text buffer for the worst-case formatted length, not the hope.',
    ],
    furtherReading: [
      { label: 'cppreference - snprintf', url: 'https://en.cppreference.com/w/c/io/fprintf', kind: 'docs' },
      { label: 'cppreference - string functions', url: 'https://en.cppreference.com/w/c/string/byte', kind: 'docs' },
      { label: 'Wikipedia - Buffer overflow', url: 'https://en.wikipedia.org/wiki/Buffer_overflow', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
