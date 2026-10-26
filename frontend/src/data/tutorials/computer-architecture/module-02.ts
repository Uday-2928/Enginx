import type { TutorialLesson } from '../types';

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'carc-m02-l1',
    title: 'The Memory Hierarchy and Locality',
    summary:
      'Why processors do not talk to DRAM directly: the register-to-disk pyramid, the latency and size orders of magnitude behind it, and the locality principle that makes the whole trick work.',
    objectives: [
      'Name the levels of the memory hierarchy and their typical latency and size orders of magnitude.',
      'Explain why a fast CPU paired only with DRAM would waste most of its cycles waiting.',
      'Define temporal and spatial locality and recognise both in real code.',
      'Reason about why a small fast cache can serve most accesses.',
    ],
    whyItMatters:
      'Processor speed and memory speed have diverged by hundreds of cycles. Every performance question you will ever ask about real code — why row-major loops beat column-major, why structure-of-arrays can beat array-of-structures, why cache misses dominate profiles — reduces to the memory hierarchy and locality. This module gives you the mental model and the arithmetic.',
    prerequisites: [
      'carc-m01 (CPU fundamentals)',
      'Comfort with powers of two and unit prefixes (KiB, MiB, GiB)',
    ],
    explanation:
      'There is no single memory technology that is simultaneously large, fast and cheap. Fast memory (SRAM) is bulky and expensive per byte; dense memory (DRAM) is slow; disks are vast but glacial. Computer systems solve this with a **hierarchy**: a small amount of the fastest memory close to the CPU, backed by progressively larger, slower, cheaper levels.\n\n### The levels, by the numbers\n\nThe table below gives typical orders of magnitude (exact figures vary by generation — treat them as ballparks, not specifications). The striking fact is the *ratio*: main memory is roughly 100-1000 times slower to reach than the registers, and disk is another 1000-100000 times slower than DRAM. If every memory access took a DRAM round trip, a CPU capable of one instruction per cycle would sit idle for ~100 cycles after each load.\n\n### The bet: locality\n\nThe hierarchy only pays off because programs do not touch memory uniformly. They exhibit **locality of reference**, in two forms:\n\n- **Temporal locality**: if an item was referenced recently, it will likely be referenced again soon (loop counters, hot variables, frequently called functions).\n- **Spatial locality**: if an item was referenced, its neighbours will likely be referenced soon (sequential array scans, consecutive instructions in a loop body).\n\nA **cache** is a small SRAM buffer that keeps recently used data close to the CPU and bets that locality will make future accesses hit it. The bet is extraordinary: real workloads routinely serve 90-99% of accesses from a cache a thousand times smaller than main memory. The next two lessons make *how* the cache works and *how well* it works precise.',
    deepDive:
      '### The memory wall in one calculation\n\nSuppose a program executes one instruction per cycle, and 20% of instructions are loads/stores that all miss to DRAM at 100 extra cycles. The average cycles per instruction becomes 1 + 0.2 × 100 = 21 — the CPU runs at 1/21st of its potential. This gap (the *memory wall*) is why caches, prefetchers and out-of-order cores exist: they all attack that 0.2 × 100 term, either by raising the hit rate or by overlapping the wait with other work.\n\n### Locality is a property of your code, not just the hardware\n\nHardware engineers size caches; software engineers *feed* them. Consider summing a 2D array: the row-major loop `for r: for c: sum += a[r][c]` walks memory in order (excellent spatial locality, because C stores rows consecutively), while swapping the loops strides across rows and touches a new cache line for every element. Same arithmetic, same instruction count — dramatically different cache behaviour. Profilers count these misses; now you know what they are counting.',
    examples: [
      {
        title: 'Two loops, same math, opposite locality',
        language: 'c',
        code: `#include <stdio.h>
#include <stdint.h>

#define ROWS 4
#define COLS 4

int main(void) {
    uint8_t grid[ROWS][COLS];   /* stored row by row in memory */

    for (int r = 0; r < ROWS; r++)
        for (int c = 0; c < COLS; c++)
            grid[r][c] = (uint8_t)(r * COLS + c);

    /* Version A: row-major walk — addresses increase by 1 each step */
    uint32_t sumA = 0;
    for (int r = 0; r < ROWS; r++)
        for (int c = 0; c < COLS; c++)
            sumA += grid[r][c];

    /* Version B: column-major walk — addresses jump by COLS each step */
    uint32_t sumB = 0;
    for (int c = 0; c < COLS; c++)
        for (int r = 0; r < ROWS; r++)
            sumB += grid[r][c];

    printf("sumA=%u sumB=%u equal=%d\\n", sumA, sumB, sumA == sumB);
    return 0;
}`,
        explanation: [
          'Both loops compute the identical sum — the access *order* differs, not the arithmetic.',
          'In version A, successive accesses grid[0][0], grid[0][1], grid[0][2]... are consecutive bytes: after the first access brings a block into the cache, the next several accesses hit it (spatial locality).',
          'In version B, successive accesses grid[0][0], grid[1][0], grid[2][0]... are COLS = 4 bytes apart; with small test data this still fits in cache, but with a large array each access lands in a different block and every miss pays the full DRAM latency.',
          'The grid values: row r holds r*4 + c for c = 0..3, so the sum is (0+1+2+3) + (4+5+6+7) + (8+9+10+11) + (12+13+14+15) = 6 + 22 + 38 + 54 = 120.',
          'The program prints: sumA=120 sumB=120 equal=1 — identical results, and on real-sized arrays, very different runtimes.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The memory pyramid',
        content:
          '              /\\\n             /  \\\n            /    \\\n           / REG  \\\n          /--------\\\n         /   L2     \\\n        /     L3      \\\n       /      DRAM      \\\n      /   SSD / DISK      \\\n     +-----------------------+\n\n  fastest, smallest, costliest per byte (top to bottom):\n  registers: < 1 ns,          bytes\n  L1 cache:  ~1-4 cycles,     tens of KiB\n  L2 cache:  ~10 cycles,      hundreds of KiB\n  L3 cache:  ~30-50 cycles,   MiB\n  DRAM:      ~100 ns,         GiB\n  SSD:       ~100 us,         GiB-TiB\n  (latencies are typical orders of magnitude,\n   not guarantees — hardware generations vary)',
        caption:
          'Each level down is larger and slower by orders of magnitude. Caches bet that locality keeps the working set in the top few levels.',
      },
    ],
    tables: [
      {
        caption: 'Memory hierarchy levels (typical orders of magnitude, not specifications)',
        headers: ['Level', 'Typical latency', 'Typical size', 'Managed by'],
        rows: [
          ['Registers', 'sub-ns (0 extra cycles)', 'tens of bytes (16-32 registers)', 'compiler'],
          ['L1 cache', '1-4 cycles', 'tens of KiB', 'hardware'],
          ['L2 cache', '~10 cycles', 'hundreds of KiB', 'hardware'],
          ['L3 cache', '~30-50 cycles', 'MiB', 'hardware'],
          ['Main memory (DRAM)', '~100 ns', 'GiB', 'OS + hardware'],
          ['SSD storage', '~100 microseconds', 'hundreds of GiB', 'OS / driver'],
          ['Hard disk', '~5-10 ms', 'TiB', 'OS'],
        ],
      },
      {
        caption: 'The two kinds of locality',
        headers: ['Kind', 'Definition', 'Typical sources'],
        rows: [
          ['Temporal', 'Recently used items will be used again soon', 'Loop counters, hot variables, reused functions'],
          ['Spatial', 'Items near a used item will be used soon', 'Sequential array scans, consecutive instructions, struct fields'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Memorising exact cache sizes or latencies as if they were constants.',
        fix: 'Values differ by CPU generation and configuration. What transfers is the *ratio* structure — each level is roughly 10-100x bigger and slower than the one above — and the design consequences.',
      },
      {
        mistake: 'Believing a bigger cache is always faster.',
        fix: 'Capacity comes with search time and wire delay: L2 is larger but strictly slower than L1. Size and speed trade off; that is the entire reason there is more than one level.',
      },
      {
        mistake: 'Assuming the compiler reorders array loops to fix locality.',
        fix: 'Compilers can transform loops, but only when provenance and aliasing are provably safe. Writing locality-friendly loops (walking memory in order) is a programmer responsibility in practice.',
      },
    ],
    guidedPractice: {
      title: 'Classify the locality',
      brief:
        'For each access pattern, state whether it shows temporal locality, spatial locality, both, or neither, with one sentence of justification: (a) a loop summing a[0]..a[999] once; (b) a function called 500 times per second; (c) a one-shot random shuffle over a huge array; (d) repeatedly reading the same struct field inside a loop.',
      expectedBehavior:
        '(a) spatial (sequential walk, no reuse of individual elements); (b) temporal (same instructions reused); (c) neither (no order, no reuse); (d) both — temporal on the same address each iteration and spatial if neighbouring fields are touched later.',
      hints: [
        'Temporal = same address again soon. Spatial = neighbouring address soon.',
        'A single sequential scan of each element exactly once is pure spatial locality.',
        'Random access with no reuse defeats both forms.',
      ],
    },
    practiceExercises: [
      {
        title: 'Quantify the memory wall',
        brief:
          'A program issues one memory access per instruction. With a 100% cache hit rate it runs 1 instruction per cycle. Recompute the average cycles per instruction when the hit rate is 99% and misses cost 100 extra cycles, then for 90%.',
        expectedBehavior:
          'CPI = 1 + miss_rate x 100: at 99%, 1 + 0.01 x 100 = 2.0 cycles per instruction (2x slower); at 90%, 1 + 0.1 x 100 = 11.0 (11x slower). The lesson: the last few percent of hit rate dominate.',
        hints: [
          'Each miss adds 100 cycles of waiting to that instruction.',
          'A miss rate of 1% means one extra 100-cycle wait per 100 accesses.',
        ],
      },
      {
        title: 'Spot the locality in your own code',
        brief:
          'Take any loop you have written recently. List every array or variable it touches and classify each as temporal, spatial, both, or neither across the whole loop execution.',
        expectedBehavior:
          'Any defensible classification with justification. Typically: the loop variable and accumulator show temporal locality; array walks show spatial locality; rarely-accessed branches show neither.',
        hints: [
          'Instructions themselves have locality too — loop bodies are fetched repeatedly.',
          'Struct-of-arrays versus array-of-structs changes which fields share a block.',
        ],
      },
    ],
    assessment: {
      title: 'Memory hierarchy checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which ordering correctly lists levels from fastest to slowest?',
          options: [
            'Registers, L1, L2, DRAM, disk',
            'L1, registers, DRAM, L2, disk',
            'Registers, DRAM, L1, L2, disk',
            'L1, L2, registers, disk, DRAM',
          ],
          answer: 'Registers, L1, L2, DRAM, disk',
          explanation:
            'The hierarchy is strictly ordered by speed: registers (part of the CPU), then cache levels L1/L2/L3, then DRAM, then disk. Each level down trades latency for capacity.',
          hint: 'The closer to the ALU, the faster.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Summing a large row-major 2D array column by column (inner loop over rows) is slow primarily because...',
          options: [
            'it performs more additions',
            'each access lands in a different cache block, defeating spatial locality',
            'column sums overflow',
            'the compiler cannot compute the loop bounds',
          ],
          answer: 'each access lands in a different cache block, defeating spatial locality',
          explanation:
            'The arithmetic is identical; the access pattern strides across rows, so consecutive inner-loop touches are far apart in memory and each one likely misses the cache.',
          hint: 'Compare the stride between consecutive inner-loop accesses in each loop order.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A cache larger than the program’s entire working set guarantees zero misses after the first pass through the data.',
          answer: 'false',
          explanation:
            'Even with ample capacity, the *first* access to each block must miss (compulsory misses), and conflict or mapping effects (next lesson) can evict data early. Capacity is necessary but not sufficient.',
          hint: 'Where does the data live the very first time it is used?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'A loop counter is read and incremented on every iteration. Which form of locality does this exhibit (one word)?',
          answer: 'temporal',
          explanation:
            'The same address is reused every iteration — the definition of temporal locality. It is why loop counters live in registers or stay resident in cache.',
          hint: 'Same address, over and over.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Memory hierarchy', definition: 'The layered arrangement of storage (registers, caches, DRAM, disk) trading speed against size and cost.' },
      { term: 'Cache', definition: 'A small, fast buffer that keeps recently used memory blocks close to the CPU.' },
      { term: 'Temporal locality', definition: 'The tendency of programs to reuse the same data or instructions soon after using them.' },
      { term: 'Spatial locality', definition: 'The tendency of programs to use data whose addresses are near recently used addresses.' },
      { term: 'Memory wall', definition: 'The growing processor-to-DRAM speed gap that makes cache design and locality critical.' },
    ],
    revisionSummary: [
      'No memory technology is big, fast and cheap at once — hence the hierarchy.',
      'DRAM is ~100x slower than L1; disk is ~1000x slower than DRAM. Ratios, not exact numbers, are the lesson.',
      'Locality (temporal + spatial) is what makes a small cache effective.',
      'Access order matters as much as access count: walk memory sequentially when you can.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Memory hierarchy', url: 'https://en.wikipedia.org/wiki/Memory_hierarchy', kind: 'article' },
      { label: 'Wikipedia — Locality of reference', url: 'https://en.wikipedia.org/wiki/Locality_of_reference', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'carc-m02-l2',
    title: 'Direct-Mapped Caches: Index, Tag, Offset',
    summary:
      'Open the cache and do the address arithmetic by hand: blocks, lines, index and tag fields, hit and miss decisions, and why two addresses can fight over one line.',
    objectives: [
      'Decompose a byte address into tag, index and offset fields for a direct-mapped cache.',
      'Decide hit or miss for a given access sequence and track line contents.',
      'Compute the field widths from cache size and block size.',
      'Explain conflict misses and construct a thrashing example.',
    ],
    whyItMatters:
      'Cache behaviour is not mysterious once you can do the address split on paper. Every interview question of the form "how many misses does this loop take?", every performance bug caused by power-of-two array strides, and every cache-line diagram in a profiler becomes arithmetic you can verify yourself.',
    prerequisites: [
      'carc-m02-l1 (hierarchy and locality)',
      'Binary/hexadecimal bit extraction',
    ],
    explanation:
      'A **direct-mapped cache** holds a fixed number of **lines** (also called blocks). Each line stores a chunk of main memory — say 16 bytes — plus a **tag** recording *which* memory chunk it currently holds, and a **valid bit** saying whether it holds anything at all.\n\n### Dividing the address\n\nWith a 256-byte cache of 16-byte lines there are 256/16 = **16 lines**. A byte address is split into three fields:\n\n- **Offset** (low 4 bits): which byte *within* the 16-byte line — 16 positions need 4 bits.\n- **Index** (next 4 bits): which of the 16 lines — 16 lines need 4 bits.\n- **Tag** (all remaining upper bits): which memory block this line is holding.\n\nThe lookup is mechanical: use the index to select one line, compare its tag against the address tag, and check the valid bit. **Hit** = valid AND tag matches; then the offset selects the byte. **Miss** = fetch the whole 16-byte block from memory, overwrite the line (direct-mapped allows no choice — the index dictates the line), store the new tag.\n\n### A worked access sequence\n\nUsing a 16-bit address space: take address `0x02A7` = binary `0010 1010 0111`. Offset = `0111` = 7; index = `1010` = 10; tag = `0010 0000`... carefully: the upper 8 bits are `0x02`. So the access reads byte 7 of block `0x02`, using line 10. If line 10 is valid with tag `0x02` — hit. If it holds tag `0x06` (as it would after touching `0x06A0`, which has the same index) — miss, and the old block is evicted. Two addresses with different tags but the same index **fight over one line**; alternating between them misses every time. This is a **conflict miss**, and it is the direct-mapped design\'s signature weakness.',
    deepDive:
      '### Field widths, generally\n\nFor a byte-addressed direct-mapped cache: offset bits = log2(block size), index bits = log2(number of lines), tag bits = address bits minus the other two. A 64 KiB cache (2^16 bytes) with 64-byte blocks (2^6) and 32-bit addresses has 6 offset bits, 16 − 6 = 10 index bits (1024 lines), and 32 − 16 = 16 tag bits. Practise this decomposition until it is reflexive — it is the single most-reused calculation in cache analysis.\n\n### Why power-of-two strides thrash\n\nIf an array\'s stride between consecutive accesses is exactly the cache size times an integer (or a multiple of the number of lines × line size... more precisely, when two hot addresses map to the same index), each access evicts the other. A classic pathology: two arrays whose base addresses differ by exactly the cache size share every index. Real allocators avoid aligning hot objects to cache-size boundaries for this reason, and hardware offers *set-associative* caches (a few lines per index) as the fix — conceptually a direct-mapped cache where each index holds N tags checked in parallel.',
    examples: [
      {
        title: 'Computing tag, index, offset in C',
        language: 'c',
        code: `#include <stdio.h>
#include <stdint.h>

int main(void) {
    /* 256-byte direct-mapped cache, 16-byte lines -> 16 lines */
    /* 16-bit byte addresses: 8-bit tag, 4-bit index, 4-bit offset */
    uint16_t addrs[3] = { 0x02A7, 0x02A0, 0x06A0 };

    for (int i = 0; i < 3; i++) {
        uint16_t a = addrs[i];
        uint8_t offset = a & 0x0F;            /* bits 3..0  */
        uint8_t index  = (a >> 4) & 0x0F;     /* bits 7..4  */
        uint8_t tag    = a >> 8;              /* bits 15..8 */
        printf("addr=0x%04X tag=0x%02X index=%u offset=%u\\n",
               a, tag, index, offset);
    }
    return 0;
}`,
        explanation: [
          'The masks implement the field split: the low 4 bits are the offset, the next 4 bits (after shifting right by 4) are the index, and everything above is the tag.',
          'For 0x02A7 = 0010 1010 0111: offset = 0111 = 7, index = 1010 = 10, tag = 0x02.',
          'For 0x02A0: offset = 0, index = 10, tag = 0x02 — the same block as 0x02A7, seven bytes earlier in the line.',
          'For 0x06A0: offset = 0, index = 10, tag = 0x06 — same line as the first two, different block: a conflict.',
          'The program prints: addr=0x02A7 tag=0x02 index=10 offset=7 / addr=0x02A0 tag=0x02 index=10 offset=0 / addr=0x06A0 tag=0x06 index=10 offset=0.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Address split and cache lookup for 0x02A7',
        content:
          '  16-bit address 0x02A7 = 0010 1010 0111\n\n  +-------------+----------+----------+\n  | tag (8 bit) | idx(4 b) | off(4 b) |\n  |  0000 0010  |   1010   |   0111   |\n  |   = 0x02    |  = 10    |  = 7     |\n  +-------------+----------+----------+\n         |            |          |\n         |            v          |\n         |      select line 10   |\n         v                       v\n  compare with line-10 tag   pick byte 7\n\n  line 10: valid=1, tag=0x02, data = bytes 0x02A0..0x02AF\n           -> tag match -> HIT, return data[7]',
        caption:
          'The index selects the line, the tag confirms the identity of the block, and the offset selects the byte inside it. All three fields come from the same address.',
      },
      {
        kind: 'waveform',
        title: 'Access sequence and hit/miss timeline (illustrative)',
        content:
          '  access:   0x02A0   0x02A4   0x02A8   0x06A0   0x02A0   0x06A0\n  block:    tag 02   tag 02   tag 02   tag 06   tag 02   tag 06\n  index:      0xA      0xA      0xA      0xA      0xA      0xA\n  result:    MISS      HIT      HIT     MISS     MISS     MISS\n             ^ first touch of block 02      ^ 0x06 evicted 02  ^ back again\n\n  (educational waveform (illustrative) — one access per slot on a\n   single line; the alternating pattern misses every time)',
        caption:
          'Four accesses to one block: miss once, then hit. Alternating between two blocks that share an index evicts on every access — a conflict-miss thrash.',
      },
    ],
    tables: [
      {
        caption: 'Cache geometry arithmetic for the worked example',
        headers: ['Quantity', 'Value', 'Derivation'],
        rows: [
          ['Cache size', '256 bytes', 'given'],
          ['Line (block) size', '16 bytes', 'given'],
          ['Number of lines', '16', '256 / 16'],
          ['Offset bits', '4', 'log2(16) = 4 bytes-in-line'],
          ['Index bits', '4', 'log2(16) = 4 line select'],
          ['Tag bits (16-bit addr)', '8', '16 - 4 - 4'],
          ['Address space covered', '64 KiB', '2^16 bytes, tag x index x offset'],
        ],
      },
      {
        caption: 'The three compulsory questions of every access',
        headers: ['Field', 'Answers', 'Width'],
        rows: [
          ['Index', 'Which line could hold it?', 'log2(lines)'],
          ['Tag', 'Is it really this block?', 'address bits - index - offset'],
          ['Offset', 'Which byte in the line?', 'log2(block size)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Swapping the index and offset fields.',
        fix: 'Offset is always the *lowest* bits (byte within the line); index sits above it. Memory check: offsets must be able to count 0..15 inside a 16-byte line, so they need the 4 least-significant bits.',
      },
      {
        mistake: 'Computing the tag from the line number instead of the address.',
        fix: 'The tag is the *address* bits above the index — it identifies which block occupies the line. Two different blocks (different tags) can occupy the same line at different times.',
      },
      {
        mistake: 'Assuming a hit requires the offset to match.',
        fix: 'The offset plays no part in hit/miss: any byte of a resident block hits. Hit = valid bit set AND stored tag equals address tag. The offset only picks the byte afterwards.',
      },
    ],
    guidedPractice: {
      title: 'Split three addresses',
      brief:
        'For the 256-byte, 16-line, 16-byte-line cache with 16-bit addresses, split 0x0113, 0x011F and 0x8110 into tag, index and offset. Then say which of the three can ever reside in the cache simultaneously.',
      expectedBehavior:
        '0x0113: tag 0x01, index 1, offset 3. 0x011F: tag 0x01, index 1, offset F — same block as 0x0113 (offsets 3 and 15 both lie in bytes 0x010..0x011F). 0x8110: tag 0x81, index 1, offset 0 — same line, different block. 0x0113 and 0x011F share a line at the same time; 0x8110 evicts them.',
      hints: [
        'Mask the low nibble for the offset, the next nibble for the index.',
        'Blocks are 16-byte aligned: 0x0110-0x011F is one block.',
        'Same index + different tag = fight over the line.',
      ],
    },
    practiceExercises: [
      {
        title: 'Different geometry, same drill',
        brief:
          'A 32-bit machine has a 64 KiB direct-mapped cache with 64-byte lines. How many lines are there, and how wide are the offset, index and tag fields? Decompose address 0x12345678.',
        expectedBehavior:
          '1024 lines (64 KiB / 64 B); offset = 6 bits, index = 10 bits, tag = 16 bits. 0x12345678 = 0001 0010 0011 0100 0101 0110 0111 1000: offset = 0b111000 = 0x38, index = the 10 bits above the offset = 0b0101011001 = 0x159 (345), tag = 0x1234 (upper 16 bits). Verify by recombining: 0x1234 << 16 | 0x159 << 6 | 0x38 = 0x12340000 + 0x5640 + 0x38 = 0x12345678.',
        hints: [
          'log2(64) = 6 offset bits; log2(1024) = 10 index bits.',
          'Recombine the fields to check: tag << 16 | index << 6 | offset must reproduce the address.',
        ],
      },
      {
        title: 'Count the misses',
        brief:
          'In the 256-byte/16-line/16-byte-line cache (all lines initially invalid), a program reads addresses 0x0030, 0x0034, 0x0070, 0x0038 in order. Give hit/miss for each and the final contents (tag) of every line touched.',
        expectedBehavior:
          '0x0030: index 3, tag 0x00 — MISS. 0x0034: index 3, tag 0x00 — HIT. 0x0070: index 7, tag 0x00 — MISS. 0x0038: index 3, tag 0x00 — HIT. Final: line 3 holds tag 0x00, line 7 holds tag 0x00. Two misses, two hits.',
        hints: [
          '0x0030 >> 4 = 0x3, so index 3; 0x0070 >> 4 = 0x7.',
          'The offset never affects hit/miss.',
          'Different indexes never evict each other in a direct-mapped cache.',
        ],
      },
    ],
    assessment: {
      title: 'Direct-mapped cache checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A cache has 64-byte lines. How many bits of the address form the offset field?',
          options: ['4', '5', '6', '8'],
          answer: '6',
          explanation:
            'The offset must address every byte in a line: 2^6 = 64, so 6 bits. Offset width = log2(block size), always.',
          hint: 'How many bits does it take to count 0 to 63?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt:
            'In the 256-byte / 16-line / 16-byte-line cache, address 0x0342 arrives. What index does it use?',
          code: 'index = (addr >> 4) & 0x0F;   /* addr = 0x0342 */',
          options: ['2', '4', '3', '0x34'],
          answer: '4',
          explanation:
            '0x0342 >> 4 = 0x034, and 0x034 & 0x0F = 4. The index is the nibble just above the offset: 0x...4 2 — index 4, offset 2, tag 0x03.',
          hint: 'Write 0x0342 in binary and take bits 7..4.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In a direct-mapped cache, a miss always evicts the line’s current contents because the index allows only one candidate line.',
          answer: 'true',
          explanation:
            'Direct-mapped means exactly one line per index. If the needed block maps there and the tags differ, the old block must be overwritten — there is no choice to make. (Set-associative caches relax this by holding N candidates per index.)',
          hint: 'The name says it: directly mapped, one place to live.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Two hot variables sit exactly 256 bytes apart (the whole cache size) and are used alternately. What is this pathology called, and what is its effect on the hit rate? (Two words, hyphenated.)',
          answer: 'conflict miss',
          explanation:
            'Their addresses differ by a multiple of the cache size, so every access has the same index and a different tag — each access evicts the other, and the hit rate collapses to zero despite ample total capacity.',
          hint: 'They conflict over the same line, every single access.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Line (block)', definition: 'The fixed-size unit (e.g. 16 or 64 bytes) that moves between memory and cache as a whole.' },
      { term: 'Index', definition: 'The address bits that select which cache line is examined.' },
      { term: 'Tag', definition: 'The stored address bits that identify which memory block currently occupies a line.' },
      { term: 'Valid bit', definition: 'Per-line bit indicating the line holds fetched (meaningful) data.' },
      { term: 'Conflict miss', definition: 'A miss caused by two frequently used blocks mapping to the same line and evicting each other.' },
    ],
    revisionSummary: [
      'Address = tag | index | offset, from the top down.',
      'Offset bits = log2(line size); index bits = log2(lines); tag = the rest.',
      'Hit = valid AND tag match; the offset then selects the byte.',
      'Direct-mapped caches have no replacement choice — same index, different tag = eviction (conflict miss).',
    ],
    furtherReading: [
      { label: 'Wikipedia — CPU cache', url: 'https://en.wikipedia.org/wiki/CPU_cache', kind: 'article' },
      { label: 'All About Circuits — Cache memory basics', url: 'https://www.allaboutcircuits.com/technical-articles/introduction-to-cache-memory/', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'carc-m02-l3',
    title: 'Write Policies and Cache Performance',
    summary:
      'Finish the cache story: what happens on writes (write-through versus write-back), why several cache levels stack up, and the effective-access-time arithmetic that ties it all to a number.',
    objectives: [
      'Contrast write-through and write-back policies and their traffic/complexity trade-offs.',
      'Explain why multilevel caches exist and compute an average memory access time across levels.',
      'Compute effective access time from hit rate, hit time and miss penalty — and show how sensitive it is to the miss rate.',
      'Apply the AMAT formula to reason about design changes.',
    ],
    whyItMatters:
      'The AMAT equation is one of the most used formulas in computer engineering: it turns hit rates and penalties into a single number you can optimise. It also explains the architecture you see in every CPU datasheet — separate write policies, three cache levels, and why the last 1% of hit rate is worth millions of dollars of engineering.',
    prerequisites: [
      'carc-m02-l2 (index/tag/offset mechanics)',
      'Weighted averages',
    ],
    explanation:
      '### What happens when the CPU writes?\n\nReads are the easy case. A **write hit** must keep the cache and memory consistent, and there are two classic policies:\n\n- **Write-through**: every write goes to the cache *and* to memory immediately. Memory always holds current data (simple, good for coherence and DMA), but every write pays memory latency or needs a write buffer to hide it.\n- **Write-back**: the write updates only the cache; the line is marked **dirty**, and memory is updated later, when the line is evicted. This batches writes and is much faster for write-heavy code, but the cache must now track dirtiness and memory can be stale — a real complication when another device (DMA, another core) reads memory directly.\n\n(On a write *miss*, designs either allocate the line — write-allocate, matching write-back — or write straight to memory — no-write-allocate, common with write-through.)\n\n### Stacking levels\n\nOne cache cannot be simultaneously tiny-and-fast and huge-and-complete, so systems use **multilevel caches**: L1 small and fast (checked first), L2 bigger and slower as backup, L3 bigger still, then DRAM. Each level is optimised for its role: L1 for latency, L3 for capacity.\n\n### The arithmetic: effective access time\n\nThe **average memory access time (AMAT)** combines the levels:\n\n```\nAMAT = hit_time + miss_rate x miss_penalty\n```\n\nWorked example: L1 hits in 1 cycle; on a miss, main memory supplies the data in 100 additional cycles. At a 95% hit rate: AMAT = 1 + 0.05 x 100 = **6.0 cycles**. Raise the hit rate to 99%: AMAT = 1 + 0.01 x 100 = **2.0 cycles**. Five percentage points of hit rate made the machine three times faster — because the miss *rate* multiplies the miss *penalty*. The full weighted form (counting the L1 lookup inside the miss) gives 0.95 x 1 + 0.05 x 101 = 6.0 and 0.99 x 1 + 0.01 x 101 = 2.0: same answers under this bookkeeping, since the miss penalty here is defined *on top of* the lookup.',
    deepDive:
      '### A two-level AMAT\n\nWith an L2, the L1 miss penalty is no longer flat: the miss is served by L2 (fast, usually) or by memory (slow, rarely). Using local miss rates at each level:\n\n```\nAMAT = L1_hit_time\n     + L1_miss_rate x ( L2_hit_time + L2_miss_rate x mem_time )\n```\n\nNumbers: L1 hits 1 cycle with 95% hit rate; L2 hits in 12 cycles with a local hit rate of 80%; memory costs 100 cycles. Per L1 miss: 12 + 0.2 x 100 = 32 cycles. AMAT = 1 + 0.05 x 32 = **2.6 cycles** — dramatically better than the 6.0 of the single-level case, which is exactly why L2/L3 exist.\n\n### Why the last percent is priceless\n\nNote the derivative: near a 95% hit rate, each additional percentage point saves 0.01 x 100 = 1 cycle of AMAT — a 17% speedup. The same point at 99.9% is worth only 0.1 cycles. This convex sensitivity is why architects spend on prefetchers, bigger L3s and smarter replacement *only* when miss rates are still meaningfully large, and why profiling tools report cache miss *rates* rather than raw miss counts.',
    examples: [
      {
        title: 'AMAT calculator',
        language: 'c',
        code: `#include <stdio.h>

int main(void) {
    /* L1: 1-cycle hit; miss penalty 100 cycles on top of the lookup */
    double hitRates[2] = { 0.95, 0.99 };

    for (int i = 0; i < 2; i++) {
        double h = hitRates[i];
        double amat = h * 1.0 + (1.0 - h) * 101.0;  /* miss = 1 + 100 */
        printf("hit rate %.0f%% -> AMAT = %.2f cycles\\n", h * 100.0, amat);
    }
    return 0;
}`,
        explanation: [
          'The weighted form charges every access the L1 lookup: hits cost 1 cycle, misses cost 1 + 100 = 101 cycles.',
          'For h = 0.95: 0.95 x 1 + 0.05 x 101 = 0.95 + 5.05 = 6.00.',
          'For h = 0.99: 0.99 x 1 + 0.01 x 101 = 0.99 + 1.01 = 2.00.',
          'The program prints: hit rate 95% -> AMAT = 6.00 cycles / hit rate 99% -> AMAT = 2.00 cycles.',
          'Equivalently, AMAT = hit_time + miss_rate x miss_penalty = 1 + 0.05 x 100 = 6.0 — both forms agree because the penalty is defined on top of the lookup.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Two-level lookup with the numbers from the deep dive',
        content:
          '  CPU access\n     |\n     v\n  +--------+  hit (95%)  --> 1 cycle --> done\n  |   L1   |\n  +--------+  miss (5%)\n     |\n     v\n  +--------+  hit (80% of misses) --> +12 cycles\n  |   L2   |\n  +--------+  miss (20% of misses)\n     |\n     v\n  +----------+  +100 cycles\n  |  memory  |\n  +----------+\n\n  per-miss cost  = 12 + 0.2 x 100 = 32 cycles\n  AMAT           = 1 + 0.05 x 32   = 2.6 cycles',
        caption:
          'Each level intercepts most of the traffic the level above could not serve. The numbers are the worked example from the text — follow them through the tree.',
      },
    ],
    tables: [
      {
        caption: 'Write-through versus write-back',
        headers: ['Property', 'Write-through', 'Write-back'],
        rows: [
          ['On write hit', 'Update cache AND memory', 'Update cache only; mark line dirty'],
          ['Memory contents', 'Always current', 'Stale until eviction of dirty lines'],
          ['Write traffic to memory', 'Every write', 'Once per dirty line eviction'],
          ['Extra hardware', 'Write buffer to hide latency', 'Dirty bits per line'],
          ['DMA/MP coherency', 'Simple (memory is current)', 'Must flush dirty lines first'],
          ['Typical pairing', 'no-write-allocate', 'write-allocate'],
        ],
      },
      {
        caption: 'AMAT results used in this lesson (same 1-cycle L1, 100-cycle memory)',
        headers: ['Hit rate', 'Miss rate', 'AMAT', 'Relative speed vs 95%'],
        rows: [
          ['95%', '5%', '6.0 cycles', '1.0x (baseline)'],
          ['99%', '1%', '2.0 cycles', '3.0x faster'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Applying the miss penalty twice, or not at all, in the weighted-average form.',
        fix: 'Pick one bookkeeping style and stay consistent: either AMAT = hit_time + miss_rate x miss_penalty (penalty excludes the lookup), or the weighted form with miss cost = hit_time + penalty. Both give the same answer; mixing them double-counts.',
      },
      {
        mistake: 'Using a level’s miss rate where a *local* miss rate is required.',
        fix: 'In multilevel AMAT, each level’s rate is the fraction of accesses *reaching* that level that miss there (local rate), not the fraction of all CPU accesses (global rate). The L2 sees only 5% of accesses in the worked example.',
      },
      {
        mistake: 'Assuming write-back is always better.',
        fix: 'Write-back wins on write traffic, but write-through keeps memory current, which simplifies cache coherence and direct memory access by other devices. Small embedded systems with DMA-heavy peripherals often prefer write-through for its predictability.',
      },
    ],
    guidedPractice: {
      title: 'Compute AMAT for a new configuration',
      brief:
        'An L1 hits in 2 cycles with a 90% hit rate; misses cost 50 cycles on top of the lookup. Compute the AMAT. Then an engineer doubles the hit rate improvement analysis: what AMAT would a 96% hit rate give, and how many cycles per access does the 6-point improvement save?',
      expectedBehavior:
        'At 90%: 2 + 0.10 x 50 = 7.0 cycles. At 96%: 2 + 0.04 x 50 = 4.0 cycles. Saving: 3.0 cycles per access — a 43% reduction, from six points of hit rate.',
      hints: [
        'Use AMAT = hit_time + miss_rate x miss_penalty.',
        'Miss rate is 1 - hit rate: 0.10 then 0.04.',
        'The saving is the difference of the two AMATs, not the AMAT itself.',
      ],
    },
    practiceExercises: [
      {
        title: 'Three levels by hand',
        brief:
          'L1: 1-cycle hit, 90% hit rate. L2: 10-cycle hit, local hit rate 60%. Memory: 100 cycles. Compute the AMAT, then repeat with the L2 local hit rate improved to 80% and state the saving.',
        expectedBehavior:
          'Per L1 miss: 10 + 0.4 x 100 = 50 cycles; AMAT = 1 + 0.1 x 50 = 6.0 cycles. With 80%: per-miss = 10 + 0.2 x 100 = 30; AMAT = 1 + 0.1 x 30 = 4.0 cycles. Saving: 2.0 cycles per access.',
        hints: [
          'Work inside-out: cost per L1 miss first, then wrap with the L1 miss rate.',
          'Local L2 miss rate = 1 - 0.60 = 0.40, then 0.20.',
        ],
      },
      {
        title: 'Choose a write policy',
        brief:
          'A data-logging MCU writes sensor samples to a buffer that a DMA controller periodically reads out over memory. Argue which write policy fits and why, in three or four sentences.',
        expectedBehavior:
          'Write-through (or write-back with explicit flushing before each DMA transfer). The DMA reads memory directly, so stale cache lines would feed it old data; write-through keeps memory current at the cost of more write traffic, which is acceptable at sensor rates. Any answer that identifies the coherency hazard and mitigates it is correct.',
        hints: [
          'Who else reads memory besides the CPU?',
          'What does a dirty line mean for a device that never looks at the cache?',
        ],
      },
    ],
    assessment: {
      title: 'Write policies and performance checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which policy updates main memory on every write, keeping it always current?',
          options: ['Write-through', 'Write-back', 'Write-allocate only', 'Copy-on-write'],
          answer: 'Write-through',
          explanation:
            'Write-through writes to cache and memory together, so memory never lags. Write-back defers the memory update until eviction of a dirty line.',
          hint: 'The name describes where the write goes — through to memory.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: 'double h = 0.99;\ndouble amat = h * 1.0 + (1.0 - h) * 101.0;\nprintf("AMAT = %.2f", amat);',
          options: ['AMAT = 2.00', 'AMAT = 1.01', 'AMAT = 1.99', 'AMAT = 6.00'],
          answer: 'AMAT = 2.00',
          explanation:
            '0.99 x 1 + 0.01 x 101 = 0.99 + 1.01 = 2.00. With a 100-cycle penalty, each 1% of misses costs ~1 cycle of average access time.',
          hint: 'Split it: 0.99 + 0.01 x 101.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In the two-level AMAT formula, the L2 hit rate used is the fraction of *all* CPU accesses that hit in L2.',
          answer: 'false',
          explanation:
            'It is the *local* rate — the fraction of accesses that reach L2 (i.e., missed L1) and then hit there. Using the global rate mixes populations and produces wrong AMATs.',
          hint: 'L2 only ever sees the accesses L1 missed.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'A dirty bit is associated with which cache policy, and what does it cause to happen at eviction time? (One policy name; one action.)',
          answer: 'write-back',
          explanation:
            'Write-back marks modified lines dirty; at eviction a dirty line must be written back to memory before the line is reused, while a clean line is simply dropped.',
          hint: 'Which policy defers writes, and therefore needs to remember which lines were modified?',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Write-through', definition: 'Write policy that updates the cache and main memory on every write.' },
      { term: 'Write-back', definition: 'Write policy that updates only the cache, marking the line dirty; memory is updated on eviction.' },
      { term: 'Dirty bit', definition: 'Per-line flag indicating the line holds writes not yet reflected in memory.' },
      { term: 'AMAT', definition: 'Average memory access time: hit time plus miss rate times miss penalty (extended per level for multilevel caches).' },
      { term: 'Miss penalty', definition: 'The additional time to obtain data from the next level when a miss occurs.' },
    ],
    revisionSummary: [
      'Write-through: simple, current memory, more traffic. Write-back: less traffic, dirty bits, stale memory until eviction.',
      'Multilevel caches trade a small fast L1 against bigger slower L2/L3.',
      'AMAT = hit_time + miss_rate x miss_penalty; at 95%/1c/100c it is 6.0 cycles, at 99% it is 2.0.',
      'Use local miss rates per level: AMAT = L1t + mr1 x (L2t + mr2 x mem).',
    ],
    furtherReading: [
      { label: 'Wikipedia — Cache (computing)', url: 'https://en.wikipedia.org/wiki/Cache_(computing)', kind: 'article' },
      { label: 'Wikipedia — CPU cache (write policies section)', url: 'https://en.wikipedia.org/wiki/CPU_cache', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
