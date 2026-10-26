import type { TutorialLesson } from '../types';

export const module15Lessons: TutorialLesson[] = [
  {
    id: 'embc-m15-l1',
    title: 'RAM Budgets: Stack, Heap, Globals and the malloc Question',
    summary:
      'Living inside kilobytes: where every RAM byte goes, why static allocation dominates embedded design, and how to build and defend a memory budget.',
    objectives: [
      'Account for every RAM consumer: globals, stack, heap, DMA buffers.',
      'Build a RAM budget from a design and check it against the chip.',
      'Explain heap fragmentation and why most firmware bans malloc.',
      'Choose storage (static, stack, const-flash) per data lifetime.',
    ],
    whyItMatters:
      'A desktop program that leaks memory degrades; a firmware program that overflows RAM corrupts a register or resets mysteriously at 3 a.m. The budget habit — every byte allocated at design time — is the single most defensive act in embedded engineering.',
    prerequisites: ['embc-m01-l3', 'embc-m02-l3'],
    explanation:
      'An MCU\'s SRAM is a fixed pond, and everything drinks from it: **globals and statics** (allocated at link time, listed in the map file), the **stack** (every call frame and local array, deepest at the worst call chain), the **heap** (only if you use malloc), and **DMA/shared buffers** (module 14). The budget discipline writes all of them down with numbers before coding starts — and the map file verifies the statics later.\n\n### Storage follows lifetime\n\nThree lifetimes, three homes. Data that lives forever (configuration, buffers, state) is `static`/global — link-time allocated, zero surprises. Data that lives within one call is local — stack, fine for scalars and small arrays, dangerous for big ones. Data that never changes is `const` — flash, costing **zero** RAM (module 02-l3). The rule that falls out: *if you cannot say which lifetime it has, it should not exist yet*.\n\n### The malloc question\n\nDesktop intuition says allocate as needed. Embedded reality: a heap of a few kilobytes fragmenting over months of allocate/free cycles eventually refuses a request that "should" fit — at an unpredictable time, in the field. The responses, in order of industry frequency: (1) ban malloc entirely — every buffer is static, sized at design time (the dominant practice for small firmware); (2) allocate once at init, never free (pools — acceptable); (3) real-time allocators with bounded fragmentation (RTOS-specific, module 16). Ban-first is not religion; it is the acknowledgement that a fragmented 4 KB heap is a reliability defect you cannot test your way out of.\n\n### Stack sizing: the honest uncertainty\n\nThe stack is the one region without a link-time size: it grows as deep as the worst call chain + ISRs + worst local arrays. Under-sizing overflows into whatever the linker placed next (often .bss — corrupting globals silently, module 01-l3\'s startup model). Lesson 2 covers measurement (watermarking); the budgeting rule meanwhile: reserve a generous, *documented* stack region, never "whatever is left".',
    deepDive:
      '### Reading the map file, honestly\n\nThe linker\'s map file is the budget\'s ground truth for statics: every symbol, its section (.data/.bss/.rodata), its size, and the section totals at the end. The check that catches most oversights: total .data + .bss + (reserved stack) ≤ SRAM, and .text + .rodata ≤ flash. Two subtleties worth knowing: (1) `static` locals inside functions live in .data/.bss like globals — they count; (2) unused-but-non-static functions in other translation units still link in unless the linker does garbage collection (--gc-sections) — dead code costs real bytes on small parts. The map file also exposes accidental RAM hogs: a forgotten 2 KB scratch buffer shows up as a single .bss line, immediately actionable.\n\n### Heap alternatives that keep flexibility, honestly\n\nBanning malloc does not mean banning dynamic *behaviour*. The standard patterns: **fixed pools** (N pre-allocated blocks of one size — O(1) alloc/free via a free-list, no fragmentation possible); **slab/arena allocation** (a region reset wholesale — perfect for per-request buffers in servers, per-frame in DSP); **static worst-case sizing** (a buffer sized for the largest legal message — the most common and simplest). Each removes a different pain: pools remove fragmentation, arenas remove per-object frees, worst-case sizing removes allocation entirely. What they all share: capacity decisions made at design time, where they can be *reasoned about* — versus malloc\'s "hope the field is kind".\n\n### Flash budgets get the same treatment\n\nFlash fills too: code (.text) plus constants (.rodata) plus the vector table plus (often) a reserved bootloader region. The same budget discipline applies, with one firmware-specific trap: string literals and printf-format strings are .rodata — a chatty log (module 13-l3) can cost kilobytes. `-Os` (size optimization), dead-code elimination and the identifier-based logging of module 13-l3 are the levers; the map file measures the result.',
    examples: [
      {
        title: 'A RAM budget, computed and defended in code',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Static allocations (link-time). The map file confirms these. */\nstatic uint8_t  rx_buf[256];      /* UART RX ring (m07-l3)      */\nstatic uint8_t  log_buf[128];     /* log line assembly          */\nstatic uint32_t history[64];      /* 64 x 4 B sensor history    */\n\n#define RAM_SIZE     2048u        /* this (small) chip\'s SRAM   */\n#define STACK_RESERVE 512u        /* documented stack budget    */\n#define HEAP_SIZE    0u           /* no malloc in this design   */\n\nint main(void) {\n    uint32_t globals = (uint32_t)sizeof(rx_buf) + (uint32_t)sizeof(log_buf)\n                     + (uint32_t)sizeof(history);\n    uint32_t used  = globals + STACK_RESERVE + HEAP_SIZE;\n    uint32_t spare = RAM_SIZE - used;\n\n    printf("globals : %u B (rx 256, log 128, history %u)\\n",\n           (unsigned)globals, (unsigned)sizeof(history));\n    printf("stack   : %u B (documented)\\n", (unsigned)STACK_RESERVE);\n    printf("heap    : %u B (banned)\\n", (unsigned)HEAP_SIZE);\n    printf("used    : %u / %u B\\n", (unsigned)used, (unsigned)RAM_SIZE);\n    printf("spare   : %u B (%u%% headroom)\\n",\n           (unsigned)spare, (unsigned)(spare * 100u / RAM_SIZE));\n    return 0;\n}',
        explanation: [
          'globals: 256 + 128 + 64*4 = 256 + 128 + 256 = 640 bytes.',
          'used = 640 + 512 + 0 = 1152; spare = 2048 − 1152 = 896.',
          'Exact output: `globals : 640 B (rx 256, log 128, history 256)` / `stack   : 512 B (documented)` / `heap    : 0 B (banned)` / `used    : 1152 / 2048 B` / `spare   : 896 B (43% headroom)`.',
          'The 43% headroom is not waste — it is the margin that absorbs the next feature, a deeper ISR nesting, and the stack watermark\'s error bar (lesson 2). Budgets that start at 95% full are forecasts of failure.',
          'Every line of the budget has a named owner; when a new buffer appears, the budget line appears with it — or the review rejects the buffer.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'RAM pond and its drinkers',
        content:
          ' SRAM 2 KB\n +------------------------------+  high addresses\n | STACK (grows down)   512 B   |  <- deepest call chain + ISRs\n |          v v v               |\n |           ~ spare ~  896 B   |  <- margin (feature growth, safety)\n |          ^ ^ ^               |\n | HEAP (banned)         0 B    |\n | .bss/.data (globals) 640 B   |  <- rx, log, history\n +------------------------------+  low addresses\n\n FLASH (separate):\n   vectors | .text (code) | .rodata (const tables, strings)',
        caption:
          'The budget as a map. Stack and globals grow toward each other; the spare region is engineered margin, not accident.',
      },
    ],
    tables: [
      {
        caption: 'Storage decision table',
        headers: ['Data', 'Lifetime', 'Storage', 'Cost check'],
        rows: [
          ['Configuration, buffers, state', 'Forever', 'static/global', 'Map file .data/.bss'],
          ['Fonts, tables, strings', 'Never changes', 'static const (flash)', 'Map file .rodata'],
          ['Scalars and small locals', 'One call', 'Stack', 'Call depth analysis'],
          ['Large per-call buffers', 'One call', 'Make them static (careful: no reentrancy) or shrink the call', 'Never put on stack'],
          ['Runtime-sized requests', '—', 'Fixed pool or worst-case static', 'Design-time sizing'],
        ],
      },
      {
        caption: 'malloc alternatives',
        headers: ['Pattern', 'Removes', 'Cost'],
        rows: [
          ['Full ban (static sizing)', 'All heap risk', 'Design-time capacity decisions'],
          ['Init-only allocation (pools)', 'Fragmentation', 'Fixed block counts'],
          ['Arena/slab reset', 'Per-object frees', 'Wholesale region reset'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Large local arrays: `uint8_t frame[1024];` inside a function.',
        fix:
          'One call can blow a small stack. Big buffers become static (with reentrancy noted) or the design shrinks them — check the call depth they sit at (ISR-local arrays are the worst case).',
      },
      {
        mistake: 'malloc/free in periodic code paths.',
        fix:
          'Repeated alloc/free fragments a tiny heap until an allocation fails months in. Use static buffers or init-time pools; if dynamic sizing is truly required, use a bounded pool with failure handling.',
      },
      {
        mistake: 'Treating "it links" as "it fits".',
        fix:
          'The link succeeds while the stack overlaps .bss silently on many setups. Read the map totals, reserve the stack explicitly, and watermark it (lesson 2).',
      },
    ],
    guidedPractice: {
      title: 'Budget a real design',
      brief:
        'Design the RAM budget for: UART RX ring 128 B, log ring 256 B, two ADC DMA halves of 128 samples × 2 B each, a 32-entry × 4 B calibration table (const), documented stack 768 B, on a 4 KB part. Compute used, spare, and the percent headroom.',
      expectedBehavior:
        'RAM: 128 + 256 + 512 (DMA) + 768 = 1664 B; calibration table is const → flash, 0 RAM. Spare = 4096 − 1664 = 2432 B = 59% headroom. The const table saving RAM is the storage-decision rule paying off.',
      hints: [
        'const data does not drink from the RAM pond.',
        'DMA halves are two separate allocations (m14-l2).',
      ],
    },
    practiceExercises: [
      {
        title: 'Audit these declarations',
        brief:
          'For a 2 KB part, classify each as fine, wasteful, or dangerous, with fixes: (a) `char greeting[] = "Hello, world!";` as a global; (b) `static const uint8_t font[512];`; (c) `uint8_t scratch[512];` local in an ISR; (d) `malloc(64)` once at init.',
        expectedBehavior:
          '(a) Wasteful: non-const global copies 14 B to RAM — make it `static const char[]` (flash). (b) Fine: flash, no RAM. (c) Dangerous: 512 B local in an ISR may alone exceed/overflow the stack — make it static (accepting ISR reentrancy constraints) or shrink. (d) Acceptable once-at-init pool usage, but a 64 B static buffer is simpler; the ban is on repeated alloc/free cycles.',
        hints: [
          'Const-ness and lifetime decide the home.',
          'ISR locals sit on top of every nested frame.',
        ],
      },
      {
        title: 'Fragmentation narrative',
        brief:
          'Explain in 4-5 sentences how a 1 KB heap with alternating malloc(64)/malloc(32)/free cycles ends up unable to satisfy malloc(96) despite 200 free bytes existing — and which static pattern eliminates the risk.',
        expectedBehavior:
          'Freed blocks interleave: the 200 free bytes exist as scattered ~32/64 B holes with no contiguous 96 B run (external fragmentation). A worst-case static 96 B buffer (or a fixed 96 B pool) removes the allocator from the reliability equation entirely.',
        hints: [
          'Free memory must be *contiguous* to satisfy a request.',
          'The fix moves the size decision to design time.',
        ],
      },
    ],
    assessment: {
      title: 'RAM budget checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A `static const` lookup table consumes:',
          options: ['Flash (.rodata), zero RAM', 'SRAM (.data)', 'Stack', 'EEPROM'],
          answer: 'Flash (.rodata), zero RAM',
          explanation:
            'const data is read-only and placed in flash — the storage-decision rule for immutable tables.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Why do most small-firmware teams ban malloc?',
          options: [
            'Heap fragmentation makes allocation unreliable over months of uptime',
            'malloc is slow by definition',
            'The C standard forbids it',
            'Linkers refuse heap code',
          ],
          answer: 'Heap fragmentation makes allocation unreliable over months of uptime',
          explanation:
            'Tiny heaps fragment until a "should-fit" request fails in the field — untestable, unacceptable.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Static local variables inside functions are allocated on the stack.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'They live in .data/.bss like globals — link-time allocated, and they appear in the map file.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What spare does the budget example compute?',
          code: 'globals 640 B, stack 512 B, heap 0, RAM 2048 B',
          options: ['896 B', '1408 B', '512 B', '2048 B'],
          answer: '896 B',
          explanation: '2048 − (640 + 512 + 0) = 896 B (43% headroom).',
          hint: 'Subtract all three consumers.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the four RAM consumers a firmware budget must account for.',
          answer: 'globals/statics (.data/.bss), stack, heap (if any), DMA/shared buffers',
          explanation:
            'Every byte belongs to one of the four; unowned bytes are the ones that overflow.',
          hint: 'One grows down, three are link-time or design-time.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'RAM budget', definition: 'The design-time accounting of every SRAM consumer against the chip\'s capacity.' },
      { term: 'Map file', definition: 'The linker\'s symbol-by-symbol placement report — ground truth for statics.' },
      { term: 'External fragmentation', definition: 'Free heap bytes scattered in holes too small to satisfy requests.' },
      { term: 'Fixed pool', definition: 'Pre-allocated same-size blocks with O(1) alloc/free — fragmentation-proof.' },
    ],
    revisionSummary: [
      'Lifetime decides storage: forever=static, one-call=stack, never-changes=const/flash.',
      'Budget: globals + stack + heap + DMA buffers, with documented margin.',
      'Ban malloc by default; pools and worst-case sizing replace it.',
      'Verify with the map file; reserve the stack explicitly.',
      'Headroom is engineered margin, not waste.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Memory fragmentation', url: 'https://en.wikipedia.org/wiki/Fragmentation_(computing)', kind: 'article' },
      { label: 'Wikipedia — Static memory allocation', url: 'https://en.wikipedia.org/wiki/Static_memory_allocation', kind: 'article' },
      { label: 'cppreference — storage-class specifiers (static)', url: 'https://en.cppreference.com/w/c/language/storage_duration', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m15-l2',
    title: 'Buffer Safety and Stack Overflow',
    summary:
      'The two ways small systems die: buffers that write past their ends and stacks that grow into globals — plus the bounds-check, watermark and canary defences.',
    objectives: [
      'Write bounds-checked copies and parse functions that cannot overflow.',
      'Explain how stack overflow corrupts adjacent memory and why it is intermittent.',
      'Estimate stack usage by watermark filling and worst-case call-chain reasoning.',
      'Recognise the compiler and library facilities that help (and their limits).',
    ],
    whyItMatters:
      'Buffer overflows and stack overflows are the classic embedded failure pair: both corrupt silently, both appear as "random" resets, and both are entirely preventable with habits this lesson makes mechanical.',
    prerequisites: ['embc-m15-l1', 'embc-m07-l3'],
    explanation:
      '### Bounds checking is a design activity\n\nEvery buffer in firmware has a declared size; every write to it knows the size. The pattern is absolute: functions that fill buffers take the size and check it *before* copying — the module 07-l3 ring buffer is the exemplar (put refuses when full; nothing ever writes out of bounds). Parsing is the same discipline reading instead of writing: bounded reads, explicit length fields, and rejection of anything inconsistent. The C standard library\'s famously dangerous functions (`strcpy`, `sprintf`, `strcat` — no destination size) are banned by embedded coding standards in favour of sized variants (`snprintf`, `memcpy` with explicit lengths you just verified). The habit that makes it stick: the size travels *with* the buffer (a small struct or macro beside the declaration), never as a magic number at the use site.\n\n### Stack overflow: the physics\n\nThe stack grows downward from the top of RAM toward .bss/.data. Deep call chains, nested ISRs, and one large local array can push the stack pointer past its region into globals — which then get corrupted by ordinary pushes. Symptoms are maddening: variables change "by themselves", corruption patterns shift with unrelated code changes, resets happen under specific load. It is intermittent because the overflow depth depends on *the exact call path taken* — one rarely-taken error path with a big local is enough.\n\n### Measurement: watermarking\n\nYou cannot reason your way to an exact stack bound on a real codebase (function pointers and recursion break static analysis), so you measure: at startup, **fill the stack region with a known pattern** (0xA5 is traditional); after representative (and deliberately worst-case) operation, scan upward for the first byte the pattern survived on — the distance between that byte and the stack limit is the *high-water mark*. Add margin (30-50%) for untested paths and ISRs, and the watermark becomes the stack budget\'s evidence. Two adjacent defences: **stack canaries** (a guard value checked periodically — detection after the fact) and MPU stack regions (some MCUs fault immediately on overflow — detection at the moment, if the MPU is configured).',
    deepDive:
      '### Parsing untrusted input, the embedded threat model\n\nInputs arrive over UART, I2C, BLE — channels an attacker or a faulty peer controls. The parser\'s contract: never trust a length field (clamp to the buffer\'s real capacity), never index without bounds (module 02-l3\'s UB table), and treat state as finite (a state machine with an explicit "resync on garbage" path — module 13-l1). The classic failure: a length field of 200 fed into a 128-byte buffer by a trusting memcpy. The professional structure: read header → validate all fields against capacities → *then* copy with verified sizes. Test it with the hostile corpus (module 17-l3): zero-length, max-length, off-by-one lengths, garbage — parsing code that has not met a hostile corpus is unparsed.\n\n### Recursion and function pointers: the static-analysis killers\n\nTools can bound stack depth only when the call graph is closed: no recursion (or provably bounded), no calls through function pointers they cannot resolve. Embedded style honours this: recursion is banned in most standards (MISRA-style rules), callback tables are registered through narrow, documented points, and ISRs are kept leaf-shaped (module 06). The pragmatic consequence for the watermark: exercise the *deepest legitimate path* deliberately in testing — trigger the error handler that calls the logger inside an ISR, run the radio stack during a display flush — because the watermark only reports what actually ran.\n\n### The checklist that prevents the pair, honestly\n\nBuffer side: sized variants only (snprintf, memcpy with verified lengths), sizes travel with buffers, ring buffers for all streams, hostile-corpus tests for parsers. Stack side: no recursion, no big locals (static with reentrancy notes instead — module 15-l1), ISRs leaf-shaped, watermark measured on worst-case tests, MPU region if available. Neither side needs heroics; both need the boring discipline applied at every review. The compiler helps at the edges (stack-usage warnings on some toolchains, _FORTIFY-style checks where ported) — but the reviewer\'s eye remains the primary tool, which is why the patterns are taught as review-checkable rules rather than tool invocations.',
    examples: [
      {
        title: 'Bounds-checked copy and parse, with hostile inputs traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n#include <string.h>\n\n#define NAME_CAP 8u   /* capacity INCLUDING the terminator */\n\n/* Safe store: refuses anything that would not fit with its NUL. */\nstatic uint8_t name_store(char *dst, uint32_t cap, const char *src,\n                          uint32_t src_len) {\n    if (src_len >= cap) {\n        return 0u;                       /* would not fit: reject, not truncate silently */\n    }\n    memcpy(dst, src, src_len);\n    dst[src_len] = \'\\0\';\n    return 1u;\n}\n\n/* Bounded parse of a frame {len, payload...} into a fixed buffer. */\nstatic uint8_t parse_frame(const uint8_t *raw, uint32_t raw_len,\n                           uint8_t *out, uint32_t out_cap,\n                           uint32_t *payload_len) {\n    if (raw_len < 1u) {\n        return 0u;                       /* no header */\n    }\n    uint32_t declared = raw[0];\n    if (declared > out_cap || declared > (raw_len - 1u)) {\n        return 0u;                       /* hostile or corrupt length */\n    }\n    memcpy(out, &raw[1], declared);\n    *payload_len = declared;\n    return 1u;\n}\n\nint main(void) {\n    char name[NAME_CAP];\n\n    printf("store HELLO: %u\\n", (unsigned)name_store(name, NAME_CAP, "HELLO", 5u));\n    printf("name = \'%s\'\\n", name);\n\n    /* Exactly fits (7 chars + NUL in 8): */\n    printf("store LONGEST: %u\\n", (unsigned)name_store(name, NAME_CAP, "LONGEST", 7u));\n\n    /* One byte too many: rejected. */\n    printf("store TOO LONG: %u\\n", (unsigned)name_store(name, NAME_CAP, "TOOLONG!", 8u));\n\n    /* Hostile frame: declares 200 bytes into an 8-byte buffer. */\n    const uint8_t hostile[4] = { 200u, 1u, 2u, 3u };\n    uint8_t payload[8];\n    uint32_t plen = 0u;\n    printf("hostile frame: %u\\n",\n           (unsigned)parse_frame(hostile, 4u, payload, 8u, &plen));\n\n    /* Honest frame: declares 3, has 3. */\n    const uint8_t honest[4] = { 3u, 10u, 20u, 30u };\n    printf("honest frame: %u len=%u\\n",\n           (unsigned)parse_frame(honest, 4u, payload, 8u, &plen),\n           (unsigned)plen);\n    return 0;\n}',
        explanation: [
          'store HELLO: 5 < 8 → copies and NULs; prints 1, then `name = \'HELLO\'`.',
          'store LONGEST: 7 < 8 → fits exactly with the terminator → 1.',
          'store TOO LONG: 8 >= 8 → rejected → 0. No truncation, no overflow: the caller sees the refusal.',
          'Hostile frame: declared 200 > out_cap 8 → rejected → 0. The length field is never trusted.',
          'Honest frame: declared 3 ≤ 8 and ≤ 3 available → accepted, payload = {10,20,30}, len = 3.',
          'Exact output: `store HELLO: 1` / `name = \'HELLO\'` / `store LONGEST: 1` / `store TOO LONG: 0` / `hostile frame: 0` / `honest frame: 1 len=3`.',
        ],
      },
      {
        title: 'Stack watermark measurement, simulated and traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n#define STACK_SIZE 64u\n#define STACK_PATTERN 0xA5u\n\nstatic uint8_t mock_stack[STACK_SIZE];\n\nstatic void stack_watermark_init(void) {\n    for (uint32_t i = 0u; i < STACK_SIZE; i++) {\n        mock_stack[i] = STACK_PATTERN;\n    }\n}\n\n/* Simulated call chain "grows" the stack by writing n bytes at the end. */\nstatic void simulate_call_chain(uint32_t n) {\n    for (uint32_t i = 0u; i < n; i++) {\n        mock_stack[STACK_SIZE - 1u - i] = 0x11u;   /* overwritten by frames */\n    }\n}\n\n/* Scan for the highest untouched byte -> high-water mark. */\nstatic uint32_t stack_high_water(void) {\n    uint32_t used = 0u;\n    while ((used < STACK_SIZE) &&\n           (mock_stack[STACK_SIZE - 1u - used] != STACK_PATTERN)) {\n        used++;\n    }\n    return used;\n}\n\nint main(void) {\n    stack_watermark_init();\n    simulate_call_chain(20u);\n    printf("after 20 B chain: high water = %u / %u\\n",\n           (unsigned)stack_high_water(), (unsigned)STACK_SIZE);\n\n    simulate_call_chain(12u);\n    printf("after +12 B more: high water = %u / %u\\n",\n           (unsigned)stack_high_water(), (unsigned)STACK_SIZE);\n    return 0;\n}',
        explanation: [
          'The whole stack starts patterned (0xA5). The simulated call chain overwrites the top 20 bytes.',
          'stack_high_water scans from the top until it finds pattern: 20 bytes overwritten → high water 20.',
          'A deeper chain (12 more bytes) overwrites 32 total → high water 32 — the *maximum* so far, since the scan finds the deepest reach.',
          'Exact output: `after 20 B chain: high water = 20 / 64` / `after +12 B more: high water = 32 / 64`.',
          'On real firmware the fill runs at boot (startup code) and the scan runs on demand or periodically; budget = high water × 1.3-1.5, checked against the reserved region (lesson 1).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Stack overflow into .bss',
        content:
          ' high RAM\n +----------------+\n | STACK (grows)  |  <- SP after deep calls\n |   v v v        |\n |  !OVERFLOW!    |  <- SP past the boundary\n +----------------+  <-- stack region end\n | .bss globals   |  <- now being corrupted by pushes\n | rx_buf, state  |\n +----------------+\n low RAM\n\n symptoms: globals change "by themselves"; corruption moves when\n unrelated code changes; resets under specific load paths.',
        caption:
          'The overflow is silent and intermittent — it corrupts whatever the linker happened to place below the stack, which changes with every build.',
      },
    ],
    tables: [
      {
        caption: 'Banned and preferred functions (embedded coding standards)',
        headers: ['Banned', 'Why', 'Preferred'],
        rows: [
          ['strcpy / strcat', 'No destination bound', 'snprintf / strncat with verified sizes'],
          ['sprintf', 'Unbounded formatting', 'snprintf'],
          ['gets', 'Impossible to bound', 'fgets with size (or custom line reader)'],
          ['memcpy(dst, src, n) with unchecked n', 'n from untrusted input', 'Validate n against both capacities first'],
        ],
      },
      {
        caption: 'Stack defences compared',
        headers: ['Defence', 'Detects', 'When'],
        rows: [
          ['Watermark (pattern fill + scan)', 'Deepest reach so far', 'After worst-case tests'],
          ['Stack canary (guard value)', 'Overflow after it happened', 'Periodic check'],
          ['MPU stack region', 'Overflow at the moment it happens', 'If the MCU has an MPU, configured'],
          ['Static call-depth analysis', 'Potential depth pre-build', 'Recursion-free, pointer-free call graphs only'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Trusting a length field from the wire.',
        fix:
          'Clamp every declared length against the buffer\'s real capacity and the bytes actually received *before* any copy — the parse_frame pattern.',
      },
      {
        mistake: 'Testing stack usage only in the happy path.',
        fix:
          'The watermark reports what ran. Deliberately drive the deepest legitimate path (error handler in an ISR, stacked features running together) or the number is a floor, not a bound.',
      },
      {
        mistake: 'Fixing an overflow by enlarging the stack without freeing anything.',
        fix:
          'On small parts the stack eats the margin that protects against... itself. Find the big locals or deep chains; resizing is the last resort with the budget updated.',
      },
    ],
    guidedPractice: {
      title: 'Harden a vulnerable function',
      brief:
        'Harden: `void set_name(char *in) { char buf[16]; strcpy(buf, in); save(buf); }` — list the three defects and rewrite with bounds. Then trace your version with a 30-character input.',
      expectedBehavior:
        'Defects: unbounded strcpy (overflow), stack buffer of 16 B (stack pressure), no length contract on the API. Rewrite: name_store-style `set_name(const char *in, uint32_t len)` with cap 16 (15 chars + NUL), reject len >= 16; 30-char input → rejected, saved name unchanged.',
      hints: [
        'Bound, ownership, contract — one each.',
        'The rejection must be visible to the caller (return code).',
      ],
    },
    practiceExercises: [
      {
        title: 'Watermark arithmetic',
        brief:
          'A 1 KB stack shows a high-water mark of 610 B after worst-case tests. State the recommended reserved size with 1.4x margin, and what a 640 B reserve would mean.',
        expectedBehavior:
          'Reserve ≈ 610 × 1.4 ≈ 854 → round up to 896 B or 1 KB. A 640 B reserve is already smaller than the measured usage: the system has already overflowed in those tests — the globals below the stack were being corrupted.',
        hints: [
          'Margin multiplies the measurement.',
          'A reserve below the high-water mark is an overflow that already happened.',
        ],
      },
      {
        title: 'Hostile corpus for a parser',
        brief:
          'Design a hostile-corpus test list (8 entries) for the parse_frame function: lengths, truncations, and boundary values. State the expected verdict for each.',
        expectedBehavior:
          'Entries: empty input (reject), header-only (declared > available → reject), declared 0 (accept, len 0), declared = cap (accept, exact fit), declared = cap+1 (reject), declared > raw bytes (reject), payload bytes mutated (accept but value-checked upstream), declared max uint8 (reject). Each verdict follows from the two clamp checks.',
        hints: [
          'Boundaries: 0, cap−1, cap, cap+1.',
          'Two independent clamps: capacity and availability.',
        ],
      },
    ],
    assessment: {
      title: 'Buffer and stack safety checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'The core rule for any function that fills a buffer:',
          options: [
            'Take the capacity and check it before writing',
            'Trust the caller',
            'Use strcpy for speed',
            'Zero the buffer after writing',
          ],
          answer: 'Take the capacity and check it before writing',
          explanation:
            'The size travels with the buffer and is checked before every write — the ring buffer and name_store pattern.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Stack overflow typically corrupts:',
          options: [
            'Whatever the linker placed adjacent (often .bss globals)',
            'Only the return address',
            'Flash contents',
            'Nothing; the CPU faults first on most small MCUs',
          ],
          answer: 'Whatever the linker placed adjacent (often .bss globals)',
          explanation:
            'Without an MPU region, pushes walk silently into globals — the intermittent-corruption signature.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'The stack watermark (pattern fill + scan) bounds stack usage even for call paths that never ran.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'It measures what actually executed; untested deep paths are why the 1.3-1.5x margin exists.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does parse_frame return for {len=200, 1, 2, 3} into an 8-byte buffer?',
          code: 'declared = raw[0];              /* 200 */\nif (declared > out_cap || declared > (raw_len - 1u)) return 0u;',
          options: ['0 (rejected)', '1 (accepted)', 'It overflows', 'Undefined'],
          answer: '0 (rejected)',
          explanation:
            '200 > out_cap 8 → the first clamp rejects before any copy.',
          hint: 'The capacity clamp fires first.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name three defences against stack overflow and what each detects.',
          answer: 'watermark (deepest reach), canary (overflow after the fact), MPU region (overflow at the moment)',
          explanation:
            'Measurement, detection-after, detection-at — in increasing immediacy; all three complement the design rules (no recursion, small locals).',
          hint: 'Measure, detect late, detect now.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Bounds check', definition: 'Verifying index/length against capacity before every buffer access.' },
      { term: 'Stack watermark', definition: 'Pattern-filled stack scanned after worst-case runs to find the deepest reach.' },
      { term: 'Stack canary', definition: 'A guard value adjacent to the stack, checked to detect overflow after the fact.' },
      { term: 'Hostile corpus', definition: 'The test input set of malformed, extreme and adversarial values for parsers.' },
      { term: 'MPU region', definition: 'A hardware memory-protection region that can fault on stack overflow immediately.' },
    ],
    revisionSummary: [
      'Sizes travel with buffers; check before every write; sized library functions only.',
      'Parse: clamp declared lengths against capacity AND availability.',
      'Stack overflow corrupts neighbours silently; watermark + margin is the evidence.',
      'No recursion; ISRs stay leaf-shaped; big locals become statics.',
      'Test the deepest paths deliberately — watermarks only see what ran.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Buffer overflow', url: 'https://en.wikipedia.org/wiki/Buffer_overflow', kind: 'article' },
      { label: 'Wikipedia — Stack buffer overflow / stack smashing', url: 'https://en.wikipedia.org/wiki/Stack_buffer_overflow', kind: 'article' },
      { label: 'Wikipedia — Memory protection unit concept', url: 'https://en.wikipedia.org/wiki/Memory_protection_unit', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m15-l3',
    title: 'Optimization: Size, Speed, Volatile Traps and Low Power',
    summary:
      'Measure before optimizing: what -O levels change, the volatile interactions that break naive timing code, integer fixed-point over floats, and low-power design concepts.',
    objectives: [
      'Describe what optimization levels change and why volatile code behaves differently at -O2.',
      'Measure before optimizing: map file, cycle measurement, and profiling limits on MCU.',
      'Replace float math with fixed-point where the domain allows.',
      'Explain low-power techniques at concept level: sleep modes, clock gating, tick suppression.',
    ],
    whyItMatters:
      '"Optimization" in embedded is three different games — smaller flash, faster loops, fewer microamps — with different tools and different traps. The volatile-at--O2 trap alone breaks a large share of first firmware attempts; the low-power mindset decides whether the product ships on a coin cell or a wall wart.',
    prerequisites: ['embc-m02-l3', 'embc-m05-l3'],
    explanation:
      '### The three games and the first rule\n\n**Size** (fit in flash): `-Os`, dead-code elimination, smaller libc, log slimming. **Speed** (meet deadlines): `-O2`, algorithm choice, fixed-point math, moving work to DMA/timers. **Power** (survive on batteries): sleep modes, clock gating, slower clocks, and — mostly — *spending more time asleep*. The first rule for all three: **measure before optimizing**. The map file sizes the code; cycle counters / DWT timers / logic analyzers time the loops; a current meter (or the vendor\'s power figures) sizes the power problem. Optimizing without numbers is how firmware gets slower, bigger and buggier simultaneously.\n\n### What -O changes — and the volatile trap\n\nAt `-O0` the compiler translates almost literally; at `-O2` it caches variables in registers, reorders, merges and *deletes* code it believes cannot matter. That last power is why module 02-l3\'s lesson matters concretely: a polling loop on a non-volatile hardware flag compiles to a hang at `-O2` (the read is hoisted), while the same code works at `-O0` — producing the classic "works in debug, dead in release" report. The fix is not turning optimization off; it is the volatile discipline from modules 02/03 plus code that has no UB (module 02: UB lets the optimizer assume anything).\n\n### Fixed-point over floats\n\nMost small MCUs have no FPU; float math becomes library calls costing hundreds of cycles. Where the domain allows (module 10-l3\'s x10/x100 units), integers are exact and fast: a filter with coefficients as fractions of 256 (`y = (a*x) >> 8`) replaces the float version at a fraction of the cost. Use floats where the domain genuinely needs them (rarely, in small systems) and isolate them at a boundary.\n\n### Low power at concept level\n\nThe hierarchy: (1) **sleep when idle** — the CPU stops in a sleep mode until an interrupt (the vendor\'s WFI/WFE instructions); deep modes stop more of the chip and wake slower. (2) **clock gating** — unclocked peripherals draw ~nothing; the module 04 clock-enable discipline is a power feature too. (3) **slower clocks** when speed is not needed (frequency scales power). (4) **tick suppression** — the 1 kHz systick that never stops can wake the core 1000×/s for nothing; variable tick rates or event-driven wakeup stretch battery life dramatically. The design consequence lands on module 05-l3\'s scheduler: a loop that sleeps until the next due task is the power-efficient superloop.',
    deepDive:
      '### Measuring execution time, honestly\n\nOptions, cheapest first: a GPIO toggled around the code (watch it on a scope/logic analyzer — crude, external, always available); the core\'s cycle counter (ARM DWT->CYCCNT on Cortex-M3+ — cycle-exact); a spare timer counting the section (module 05); or cycle-accurate simulation in the IDE. Each measures *this build* — optimization level, inlining and cache state change the numbers, so measurements are reported with their build config. What you cannot get: a portable profiler like desktop tools; embedded profiling is targeted instrumentation, placed at the sections the design says are hot, removed or compiled-out for release. The discipline: a measurement note per optimized section (before/after, build flags, method) — so the next engineer knows it was measured, not vibed.\n\n### Reading optimization warnings, honestly\n\nAt higher optimization the compiler diagnoses more aggressively: "variable set but not used" (dead stores it deleted), "maybe-uninitialized" (a real bug path it traced further than -O0 did), strict-aliasing violations (type-punned pointer games it now reorders). These warnings are findings, not noise — a codebase should build warning-clean at the *shipping* level, not just at -O0. The corollary habit: CI builds at the shipping -O level with -Werror (module 02-l3), so the debug/release divergence the volatile trap creates cannot silently enter the tree.\n\n### Power numbers and the honest budget\n\nA battery budget is current × time against capacity: a 200 mAh cell and a 20 µA average gives ~1.1 years; the same cell at 2 mA average gives 4 days. The average is dominated by the duty cycle between sleep current (µA) and active current (mA): sleeping 99% of the time at 5 µA with 1 mA active yields ~15 µA. That arithmetic is why architecture choices (event-driven wakeup, tick suppression, sensor duty-cycling) dwarf micro-optimizations — and why the module 05-l3 scheduler is the power architecture\'s foundation. Vendor datasheets give per-mode currents; the meter gives truth; the budget makes the trade-offs visible before the hardware is chosen.',
    examples: [
      {
        title: 'Fixed-point versus float filter, same result, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Two-tap moving filter: y = 0.5*x1 + 0.25*x2\n * Fixed-point: coefficients as fractions of 256 (a1=128, a2=64). */\nstatic int32_t filter_fixed(int32_t x1, int32_t x2) {\n    return (128 * x1 + 64 * x2) >> 8;\n}\n\nstatic float filter_float(float x1, float x2) {\n    return 0.5f * x1 + 0.25f * x2;\n}\n\nint main(void) {\n    int32_t fx = filter_fixed(100, 50);\n    float   ff = filter_float(100.0f, 50.0f);\n\n    printf("fixed: %d\\n", (int)fx);\n    printf("float: %.1f\\n", (double)ff);\n    printf("agreement within 1 LSB: %s\\n",\n           ((fx - (int32_t)ff) <= 1 && ((int32_t)ff - fx) <= 1) ? "yes" : "no");\n    return 0;\n}',
        explanation: [
          'fixed: (128*100 + 64*50) >> 8 = (12800 + 3200) >> 8 = 16000 >> 8 = 62 (integer, exact value 62.5 truncated).',
          'float: 0.5*100 + 0.25*50 = 62.5 → prints `62.5`.',
          'Agreement check: 62 vs 62 → `yes`.',
          'Exact output: `fixed: 62` / `float: 62.5` / `agreement within 1 LSB: yes`.',
          'The 0.5 LSB rounding difference is the honest cost of fixed point; the gain (no FPU library calls, exact comparisons, deterministic timing) is why firmware defaults to it where the domain allows.',
        ],
      },
      {
        title: 'Low-power superloop skeleton (sleep-until-due)',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nstatic volatile uint32_t g_ticks = 0u;      /* timer ISR (mocked)     */\nstatic uint32_t idle_iterations = 0u;       /* power accountant (mock) */\n\nstatic void mock_tick_isr(void) { g_ticks++; }\n\nstatic void mock_sleep_until_next(void) {\n    /* Real: WFI/WFE or stop-mode entry until the next timer match.\n     * Mock: count the idle iterations the CPU did NOT burn. */\n    idle_iterations++;\n}\n\nint main(void) {\n    uint32_t last_job = 0u;\n    const uint32_t job_period = 100u;       /* job every 100 ms */\n\n    for (uint32_t t = 0u; t <= 1000u; t++) {\n        if ((uint32_t)(g_ticks - last_job) >= job_period) {\n            last_job += job_period;\n            printf("[t=%u ms] job ran\\n", (unsigned)g_ticks);\n        } else {\n            mock_sleep_until_next();        /* idle: no work is due  */\n        }\n        mock_tick_isr();\n    }\n    printf("idle (slept) iterations: %u\\n", (unsigned)idle_iterations);\n    return 0;\n}',
        explanation: [
          'The job runs whenever the wrapping-safe difference reaches 100: since g_ticks starts at 0 and last_job at 0, the first firing is at tick 100 — then 200, 300, ..., 1000: ten job lines `[t=N ms] job ran`.',
          'Every other iteration (1001 total ticks, 10 job runs) counts as sleep — 991 idle iterations. On real hardware those are WFI cycles at microamps instead of busy-loop cycles at milliamps.',
          'Exact final line: `idle (slept) iterations: 991`.',
          'The structure is the power architecture: timestamp scheduler (module 05-l3) + sleep-until-due. Changing job_period or adding tasks changes nothing structural.',
          'Honesty note: real sleep entry/exit latency and peripheral wake sources are vendor-specific (stop vs sleep modes, wake timers) — the manual decides which mode fits the latency budget.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Power duty cycle and average current',
        content:
          ' current\n  5 mA |    +-+      +-+      +-+     active bursts (job + radio)\n       |    | |      | |      | |\n  5 uA |----+ +------+ +------+ +----  sleep between jobs\n       +----+------------------------------ time\n             10 ms active per 100 ms period\n\n  average ≈ 0.1 * 5 mA + 0.9 * 5 uA ≈ 504 uA\n  -> duty cycle dominates the budget; sleep quality second;\n     micro-optimizations a distant third',
        caption:
          'Conceptual power profile. The average is set by the duty cycle first — which is an architecture decision, not a code tweak.',
      },
    ],
    tables: [
      {
        caption: 'Optimization levers by goal',
        headers: ['Goal', 'Primary levers', 'Measure with'],
        rows: [
          ['Smaller flash', '-Os, drop unused libs, slim logs, --gc-sections', 'Map file totals'],
          ['Faster sections', 'Algorithm, fixed-point, DMA/timers offload, -O2', 'Cycle counter / GPIO+scope'],
          ['Lower power', 'Sleep-until-due, clock gating, tick suppression, sensor duty-cycling', 'Current meter + budget'],
        ],
      },
      {
        caption: 'Compiler optimization levels (typical GCC)',
        headers: ['Level', 'Behaviour', 'Embedded use'],
        rows: [
          ['-O0', 'Near-literal translation, best debuggability', 'Debug sessions only'],
          ['-O2', 'Aggressive speed optimization', 'Shipping default (with warning-clean discipline)'],
          ['-Os', 'Optimize for size', 'Flash-constrained builds'],
          ['-O3', 'More aggressive (unrolling, vectorizing)', 'Rare in firmware; measure'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Debugging at -O0, shipping at -O2, and meeting the volatile trap in the field.',
        fix:
          'CI builds and tests run at the shipping optimization level with warnings as errors; volatile discipline (modules 02/03) is non-negotiable for anything hardware or ISRs touch.',
      },
      {
        mistake: 'Optimizing the wrong section because it "looks slow".',
        fix:
          'Measure first (cycle counter, GPIO+scope), optimize what the numbers name, and record before/after with the build config.',
      },
      {
        mistake: 'Float math everywhere on an FPU-less core.',
        fix:
          'Fixed-point with documented scales (module 10-l3) for the hot paths; floats only where the domain truly needs them, isolated at a boundary.',
      },
    ],
    guidedPractice: {
      title: 'Build the power budget',
      brief:
        'A sensor node: sleeps at 4 µA, wakes every 10 s for 20 ms of work at 8 mA. Compute the average current and the runtime on a 200 mAh cell. Then state which single change (halve active time, double the period, or 2x better sleep current) saves the most.',
      expectedBehavior:
          'Duty = 0.020 s / 10 s = 0.002. Average = 0.002*8000 uA + 0.998*4 uA ≈ 16.0 + 4.0 = 20 uA. Runtime = 200 mAh / 0.020 mA = 10,000 h ≈ 1.14 years. Halving active time halves the duty: avg ≈ 8 + 4 = 12 uA. Doubling the period to 20 s also halves the duty: ≈ 12 uA — the two tie. Improving sleep current 2x (4 → 2 uA) gives ≈ 16 + 2 = 18 uA — the weakest gain here. Conclusion: duty-cycle changes dominate while the active term leads; once duty is small, sleep current becomes the next lever.',
      hints: [
        'Average = duty × active + (1 − duty) × sleep.',
        'Runtime = capacity / average.',
      ],
    },
    practiceExercises: [
      {
        title: 'Fixed-point conversion drill',
        brief:
          'Convert y = 0.75*x to fixed point with a 256 scale, compute for x = 200, and state the exact result and the rounded integer. Then explain when the 1-LSB rounding matters.',
        expectedBehavior:
          '0.75*256 = 192 → y = (192*200) >> 8 = 38400 >> 8 = 150 (exact: 0.75*200 = 150.0 → exact here). Rounding matters when results accumulate (filters drift without rounding policy) or when thresholds sit at half-LSB boundaries — document the rounding rule (truncate vs round-to-nearest) per algorithm.',
        hints: [
          'Coefficient = fraction × 256.',
          'Shift right by 8 after the multiply.',
        ],
      },
      {
        title: 'Measure a section',
        brief:
          'Describe the GPIO-toggle + logic-analyzer measurement of a 2 ms filtering routine: setup, what the analyzer shows, and two reasons the number might differ from a cycle-counter measurement on the same build.',
        expectedBehavior:
          'Setup: GPIO high at entry, low at exit; analyzer measures the high pulse per invocation. It shows the wall-clock duration including any interrupts that preempt. Cycle counter measures CPU cycles of the section only (no preemption, no bus-wait differences in the same way). Differences: interrupts stretching the pulse; flash wait states/bus contention affecting cycles vs time; different clock frequencies between the two time bases.',
        hints: [
          'Wall clock vs CPU cycles are different currencies.',
          'Preemption and wait states separate them.',
        ],
      },
    ],
    assessment: {
      title: 'Optimization checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A polling loop on a non-volatile hardware flag works at -O0 but hangs at -O2. The cause is:',
          options: [
            'The compiler hoisted the flag read out of the loop',
            'A broken linker script',
            'Stack overflow',
            'The hardware stopped',
          ],
          answer: 'The compiler hoisted the flag read out of the loop',
          explanation:
            'Without volatile the optimizer assumes no external writer; the read is cached and the loop never exits. The fix is volatile discipline, not -O0.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'The first step of any optimization task is:',
          options: [
            'Measure (map file, cycle counter, current meter)',
            'Enable -O3',
            'Rewrite in assembly',
            'Add more cache',
          ],
          answer: 'Measure (map file, cycle counter, current meter)',
          explanation:
            'Each goal has its instrument; optimizing without numbers optimizes the wrong thing.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'On an FPU-less MCU, fixed-point integer math is both faster and deterministic compared to float math.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'Floats become library calls (hundreds of cycles); fixed point is exact, fast and timing-deterministic.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does filter_fixed(100, 50) return?',
          code: 'return (128 * 100 + 64 * 50) >> 8;',
          options: ['62', '63', '62.5', '15000'],
          answer: '62',
          explanation:
            '(12800 + 3200) >> 8 = 16000 >> 8 = 62 (the exact 62.5 truncated by the shift).',
          hint: '16000 / 256.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the three embedded optimization games and one instrument for each.',
          answer: 'size (map file), speed (cycle counter / GPIO+scope), power (current meter)',
          explanation:
            'Different goals, different evidence; measure before and after, with the build config recorded.',
          hint: 'Flash, time, microamps.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Fixed-point math', definition: 'Integer arithmetic with a documented scale (x256, x10); float-free and deterministic.' },
      { term: 'Sleep mode / WFI', definition: 'CPU stopped until interrupt; the dominant power lever on battery devices.' },
      { term: 'Clock gating', definition: 'Removing clocks from unused peripherals — near-zero their draw.' },
      { term: 'Tick suppression', definition: 'Stretching or event-driving the system tick so the core wakes less often.' },
      { term: 'Duty cycle (power)', definition: 'Fraction of time active; dominates average current on battery devices.' },
    ],
    revisionSummary: [
      'Three games: size, speed, power — each with its own instrument.',
      '-O2 changes semantics for non-volatile shared data; ship-level CI catches it.',
      'Fixed-point with documented scales replaces floats on FPU-less cores.',
      'Sleep-until-due + clock gating + tick suppression is the power architecture.',
      'Measure, optimize, record — in that order.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Optimizing compiler', url: 'https://en.wikipedia.org/wiki/Optimizing_compiler', kind: 'article' },
      { label: 'cppreference — volatile in C', url: 'https://en.cppreference.com/w/c/language/volatile', kind: 'docs' },
      { label: 'Wikipedia — Dynamic power management (concept)', url: 'https://en.wikipedia.org/wiki/Power_management', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
