import type { TutorialLesson } from '../types';

export const module14Lessons: TutorialLesson[] = [
  {
    id: 'embc-m14-l1',
    title: 'DMA Fundamentals: Moving Data Without the CPU',
    summary:
      'What direct memory access is, when it beats CPU copies, how channels and triggers work, and the programming shape every DMA driver follows.',
    objectives: [
      'Explain DMA and name its directions: peripheral-to-memory, memory-to-peripheral, memory-to-memory.',
      'Decide when DMA wins versus a CPU copy loop.',
      'Describe channels, triggers, counters and completion flags.',
      'Write the start/poll-or-interrupt/consume structure of a DMA transfer.',
    ],
    whyItMatters:
      'Once data rates grow — multi-channel ADC, audio, network, large displays — CPU copies become the bottleneck and jitter source. DMA moves the bytes in hardware while the CPU does actual work; it is also the first peripheral whose biggest dangers are architectural (ownership, coherency) rather than logical.',
    prerequisites: ['embc-m06-l3', 'embc-m05-l1'],
    explanation:
      '**Direct memory access (DMA)** is a small engine inside the MCU that copies data between addresses on its own: the CPU programs a descriptor — source address, destination address, count, direction — and starts it. The DMA then performs each transfer on a **trigger** (a peripheral event: ADC conversion done, UART byte received, timer tick) or as fast as the bus allows, and raises a **completion flag/interrupt** when the count reaches zero. The CPU never touches the data unless it wants to.\n\n### The three directions\n\n**Peripheral-to-memory** drains a peripheral into RAM (the ADC scan of module 10, a UART RX stream). **Memory-to-peripheral** feeds one (the same UART\'s TX, a display). **Memory-to-memory** copies RAM blocks (pixel blits, buffer reshuffling). The mechanics are identical; what changes is the trigger and the per-transfer width (byte/halfword/word).\n\n### When DMA wins — and when it does not\n\nDMA wins when the data volume or rate is nontrivial: N bytes per event where the CPU loop would cost N × (fetch+store+loop) cycles, or where *latency jitter* matters (an ISR per byte makes worst-case timing worse — DMA absorbs bursts without CPU involvement). DMA loses when the transfer is a handful of bytes once in a while: configuring the descriptor costs more than copying 4 bytes. Rule of thumb: per-event data above ~4-8 bytes, or sustained streams — DMA; the rest — plain code.\n\n### The programming shape\n\nEvery DMA driver follows the same choreography: (1) configure the channel once (source/dest, width, count mode — single or circular); (2) enable and let the trigger drive transfers; (3) consume data on completion interrupts or flags — never by polling addresses blindly; (4) handle error events. The CPU\'s job shrinks to buffer *ownership* management — which lesson 3 formalises, because touching a buffer the DMA is writing is the classic corruption source.',
    deepDive:
      '### Channels, priorities and bus bandwidth, honestly\n\nA DMA engine has several **channels** (often 4-16), each programmable independently, with hardware **priorities** arbitrating when two channels want the bus at once. Channels map to trigger multiplexers: "channel 1 triggered by ADC1 end-of-conversion" is a routing decision in a vendor-specific DMAMUX-style block. The bandwidth reality: DMA and CPU share the bus matrix, so a fast DMA stream steals cycles from executing code — flash wait states and bus arbitration determine how visible this is (the module 01-l2 bus matrix returns). A chatty DMA can measurably slow interrupt latency; another reason to size transfers, not just enable them.\n\n### Sizing the transfer: counts, widths, bursts\n\nThree descriptor fields do the real work: **count** (how many items), **width** (byte/halfword/word — match the peripheral\'s natural size), and **burst** (how many items per bus grant — bigger bursts are more efficient but hold the bus longer). Getting width wrong is the classic silent corruption: a byte-wide UART FIFO drained with word-wide DMA reads garbage or overruns the FIFO. The vendor manual\'s per-peripheral DMA chapter specifies width, burst and FIFO-threshold expectations — this is one chapter where guessing is genuinely dangerous, and where the mock in the example deliberately stays width-neutral.\n\n### What DMA changes architecturally\n\nWith DMA, the firmware\'s relationship to data shifts from "I fetch each item" to "I own buffers and swap them". That shift demands: fixed buffer pools (module 15\'s no-malloc discipline), explicit ownership states (lesson 3), completion-driven processing (deferred work, module 06-l3), and coherency thinking on cached cores (lesson 3). The benefit is equally structural: CPU load becomes independent of data rate — a 1 Mbps stream costs the same CPU as a 1 kbps one, as long as buffers are drained in time.',
    examples: [
      {
        title: 'CPU copy versus DMA-shaped copy, structured and traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational simulation of the DMA *structure* on a host.\n * Real DMA is a hardware engine configured via vendor registers;\n * this model makes the CPU-time accounting visible. */\nstatic uint32_t mock_cpu_cycles = 0u;   /* cost accountant           */\nstatic uint32_t mock_dma_cycles = 0u;   /* cycles the DMA engine \"burns\" */\n\n/* CPU copy: every byte costs the CPU fetch+store+loop work. */\nstatic void cpu_copy(const uint8_t *src, uint8_t *dst, uint32_t n) {\n    for (uint32_t i = 0u; i < n; i++) {\n        dst[i] = src[i];\n        mock_cpu_cycles += 4u;          /* read+write+loop+overhead (model) */\n    }\n}\n\n/* DMA-shaped copy: CPU programs once, then is free. */\ntypedef struct {\n    const uint8_t *src;\n    uint8_t       *dst;\n    uint32_t      remaining;\n    uint8_t       active;\n} dma_desc_t;\n\nstatic dma_desc_t dma;\n\nstatic void dma_start(const uint8_t *src, uint8_t *dst, uint32_t n) {\n    dma.src = src; dma.dst = dst; dma.remaining = n; dma.active = 1u;\n    mock_cpu_cycles += 8u;              /* descriptor programming (model) */\n}\n\n/* Called by the simulated bus: moves one item per call. Returns 1 on done. */\nstatic uint8_t dma_engine_tick(void) {\n    if ((dma.active == 0u) || (dma.remaining == 0u)) {\n        return 0u;\n    }\n    dma.dst[0] = dma.src[0];\n    dma.dst++; dma.src++;\n    dma.remaining--;\n    mock_dma_cycles += 2u;              /* DMA cost, NOT CPU cost */\n    return (uint8_t)(dma.remaining == 0u);\n}\n\nint main(void) {\n    static const uint8_t src[16] = {\n        1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16\n    };\n    static uint8_t dst_a[16];\n    static uint8_t dst_b[16];\n\n    cpu_copy(src, dst_a, 16u);\n    printf("cpu copy: %u bytes, cpu cycles=%u\\n", 16u, (unsigned)mock_cpu_cycles);\n\n    uint32_t cpu_before = mock_cpu_cycles;\n    dma_start(src, dst_b, 16u);\n    while (dma_engine_tick() == 0u) {\n        /* CPU is FREE here: could run control loops, comms, sleep. */\n    }\n    printf("dma copy: cpu cycles=%u (delta %u), dma cycles=%u\\n",\n           (unsigned)mock_cpu_cycles,\n           (unsigned)(mock_cpu_cycles - cpu_before),\n           (unsigned)mock_dma_cycles);\n    printf("dst_a[3]=%u dst_b[3]=%u\\n", (unsigned)dst_a[3], (unsigned)dst_b[3]);\n    return 0;\n}',
        explanation: [
          'CPU copy of 16 bytes: 16 × 4 = 64 CPU cycles in the model — every byte is CPU work.',
          'DMA-shaped copy: the CPU spends 8 cycles programming the descriptor and then *zero* while the engine ticks; the engine burns its own 32 "DMA cycles" off the CPU\'s books.',
          'Exact output: `cpu copy: 16 bytes, cpu cycles=64` / `dma copy: cpu cycles=72 (delta 8), dma cycles=32` / `dst_a[3]=4 dst_b[3]=4`.',
          'Both destinations hold identical data — the copy is correct; what changed is *who pays*, and that the CPU was free during the transfer.',
          'Honesty note: this is a structural model, not a bus simulator — real cycle counts depend on the chip\'s bus matrix, width and bursts. The architectural point (CPU freed, ownership introduced) transfers exactly.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'DMA data paths and the trigger',
        content:
          '              BUS MATRIX\n   +--------+  copies   +--------+\n   |  RAM   | <-------  |  DMA   | ---- completion IRQ\n   +--------+  per      +--------+         to CPU\n       ^       trigger          ^\n       |       |                | programs descriptor\n   +---+---+   |          +-----+-----+\n   | ADC   |---+          |   CPU     |  (free for real work)\n   +-------+  end-of-     +-----------+\n              conversion\n\n  descriptor: { src, dst, count, width, mode(single|circular) }\n  flow: program -> enable -> transfers on triggers -> completion IRQ',
        caption:
          'Conceptual DMA structure. The CPU programs once; triggers drive each item; completion interrupts return control — the ownership game begins.',
      },
    ],
    tables: [
      {
        caption: 'DMA versus CPU copy decision',
        headers: ['Situation', 'Choice', 'Reason'],
        rows: [
          ['4-byte register buffer, occasional', 'CPU copy', 'Descriptor setup costs more than the copy'],
          ['ADC scanning 4 channels at 10 kHz', 'DMA (circular)', '40k samples/s would dominate the CPU'],
          ['UART console line at 115200', 'Either', 'Buffered IRQ per byte is fine at this rate'],
          ['Display framebuffer push', 'DMA (m2p)', 'Tens of KB per frame; CPU must not stall'],
        ],
      },
      {
        caption: 'DMA descriptor fields (generic names)',
        headers: ['Field', 'Meaning', 'Typical mistake'],
        rows: [
          ['Source / destination', 'Addresses (peripheral data reg or RAM)', 'Wrong peripheral register address'],
          ['Count', 'Items to move (or 0 = endless in circular)', 'Off-by-one on count'],
          ['Width', 'byte / halfword / word', 'Mismatched to the peripheral FIFO size'],
          ['Mode', 'single-shot or circular', 'Single-shot where a stream was needed'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Wrong transfer width for the peripheral.',
        fix:
          'The vendor manual states each peripheral\'s DMA width (a UART DR is one byte; an ADC DR may be halfword). Wrong widths corrupt data or overrun FIFOs — check the per-peripheral DMA chapter, always.',
      },
      {
        mistake: 'Polling the DMA\'s current-count register as the "done" signal.',
        fix:
          'Use the completion flag/interrupt the hardware provides. Polling counters races with the engine and burns the CPU you were trying to free.',
      },
      {
        mistake: 'Enabling DMA for tiny transfers.',
        fix:
          'Descriptor setup is real cost. Below a handful of bytes per event, a CPU copy is simpler and faster — DMA is for volume and streams.',
      },
    ],
    guidedPractice: {
      title: 'Choose and structure a DMA design',
      brief:
        'A system samples 3 ADC channels at 1 kHz (12-bit each), logs over UART at 115200, and drives an LED matrix (512 bytes per frame at 60 Hz). For each: DMA or not, direction, and the completion handling you would write.',
      expectedBehavior:
        'ADC: DMA peripheral-to-memory, circular, completion (or half/full) interrupt feeding a processing buffer swap — 3000 samples/s justifies it. UART log: either; at this rate IRQ-per-byte with the module 07 ring buffer is acceptable; DMA TX if logs grow. LED matrix: DMA memory-to-peripheral, per-frame restart (single-shot at 60 Hz) with completion IRQ chaining the next frame.',
      hints: [
        'Apply the per-event size and rate rule.',
        'Circular for continuous streams; single-shot for framed pushes.',
      ],
    },
    practiceExercises: [
      {
        title: 'Count the CPU savings',
        brief:
          'Using the model\'s costs (CPU copy 4 cycles/byte; DMA setup 8 cycles + engine 2/byte): a 512-byte framebuffer push repeated at 60 Hz — compute CPU cycles per second for both approaches.',
        expectedBehavior:
          'CPU copy: 512 × 4 × 60 = 122,880 cycles/s. DMA: (8 + engine-offloaded) × 60 = 480 CPU cycles/s (the engine\'s 512×2×60 = 61,440 cycles come out of bus bandwidth, not CPU). ~99.6% CPU saving in the model.',
        hints: [
          'CPU pays setup only; the engine pays per byte.',
          'Bus bandwidth is a separate budget (deep dive).',
        ],
      },
      {
        title: 'Trigger taxonomy',
        brief:
          'Name the trigger you would wire for: (a) UART RX DMA; (b) periodic ADC scanning without per-sample interrupts; (c) memory-to-memory pixel conversion. One line each.',
        expectedBehavior:
          '(a) UART RX-not-empty event. (b) Timer trigger firing the ADC (and ADC end-of-conversion chaining the DMA) — one interrupt per scan block instead of per sample. (c) No peripheral trigger: memory-to-memory runs as fast as the bus allows (or a software request).',
        hints: [
          'Peripherals announce data-ready events; timers can create them.',
          'Memory-to-memory needs no external event.',
        ],
      },
    ],
    assessment: {
      title: 'DMA fundamentals checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'DMA is best described as:',
          options: [
            'A hardware engine that copies data between addresses without CPU involvement per item',
            'A faster CPU core',
            'A type of interrupt',
            'A cache',
          ],
          answer: 'A hardware engine that copies data between addresses without CPU involvement per item',
          explanation:
            'The CPU programs a descriptor; the engine performs transfers on triggers and reports completion.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'For which task is DMA clearly the wrong tool?',
          options: [
            'Copying 4 bytes once per second',
            'ADC scan of 4 channels at 10 kHz',
            'Streaming a 100 KB framebuffer',
            'UART RX at 1 Mbps',
          ],
          answer: 'Copying 4 bytes once per second',
          explanation:
            'Descriptor setup dominates tiny, rare transfers — a CPU copy is simpler and cheaper.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'DMA transfers consume bus bandwidth that the CPU would otherwise use.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'DMA and CPU share the bus matrix; heavy DMA streams affect CPU performance and interrupt latency.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'In the model, what CPU-cycle delta does dma_start report for a 512-byte transfer?',
          code: 'static void dma_start(...) {\n    /* ... */\n    mock_cpu_cycles += 8u;   /* descriptor programming */\n}',
          options: ['8', '2048', '512', '0'],
          answer: '8',
          explanation:
            'The CPU pays the 8-cycle setup; the per-item cost falls on the engine (and the bus), not the CPU.',
          hint: 'Look at which counter dma_start increments.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the three DMA transfer directions.',
          answer: 'peripheral-to-memory, memory-to-peripheral, memory-to-memory',
          explanation:
            'Same engine mechanics; the direction (and trigger) differ per use.',
          hint: 'Two involve peripherals, one does not.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'DMA', definition: 'Direct memory access: a hardware copy engine driven by descriptors and triggers.' },
      { term: 'Channel', definition: 'One independently programmable DMA stream with its own trigger and priority.' },
      { term: 'Trigger', definition: 'The event (peripheral flag, timer, software request) that causes each transfer.' },
      { term: 'Descriptor', definition: 'The programmed transfer: source, destination, count, width, mode.' },
    ],
    revisionSummary: [
      'DMA = descriptors + triggers + completion events; CPU freed per item.',
      'Wins for volume/streams; loses for tiny rare transfers.',
      'Width and burst come from the vendor\'s per-peripheral chapter — never guessed.',
      'Completion flags/interrupts are the done signal, not counter polling.',
      'DMA shifts firmware to buffer ownership (lesson 3).',
    ],
    furtherReading: [
      { label: 'Wikipedia — Direct memory access', url: 'https://en.wikipedia.org/wiki/Direct_memory_access', kind: 'article' },
      { label: 'docs.espressif.com — ESP-IDF DMA concepts', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/dma.html', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m14-l2',
    title: 'Circular DMA, Buffers and Completion Handling',
    summary:
      'Continuous streams without per-item interrupts: circular DMA modes, half/full completion events, buffer swapping, and the consume-side discipline.',
    objectives: [
      'Explain circular DMA mode and its ring-buffer resemblance.',
      'Use half-transfer and full-transfer events to pipeline processing.',
      'Implement the double-buffer (ping-pong) swap pattern.',
      'Keep the consume side correct: indices, wrap-safe arithmetic, drain deadlines.',
    ],
    whyItMatters:
      'ADC scan streams, audio and comms all run as circular DMA. The half/full-event pipeline is the pattern behind every "CPU load independent of sample rate" design — and getting the consume side wrong is how streams silently corrupt.',
    prerequisites: ['embc-m14-l1', 'embc-m07-l3'],
    explanation:
      '**Circular DMA** reuses a fixed buffer endlessly: the count reloads to the start when it reaches the end, and the engine keeps writing (or reading) forever. It is a hardware ring buffer whose *producer index is the DMA\'s internal counter* — and like the software ring buffer of module 07-l3, correctness lives in how the consumer tracks its position.\n\n### Half and full events\n\nBecause the engine never "completes" a circular transfer, hardware provides **half-transfer** and **transfer-complete** events — raised when the counter crosses the buffer\'s midpoint and end. The classic pipeline: buffer of N samples split into two halves; while the CPU processes the first half (between half-event and full-event), the DMA fills the second — true double-buffering from one buffer. Processing therefore has a full half-buffer period of deadline; missing it overwrites data (the engine does not wait).\n\n### Ping-pong buffers\n\nWhere the hardware supports **double-buffer mode** (two descriptors the engine alternates between), or software builds it from two single-shot transfers, the swap pattern applies: DMA fills buffer A while the CPU owns buffer B; on completion, roles swap. Ownership is explicit — the CPU never reads the buffer currently owned by DMA (lesson 3). Ping-pong costs two buffers instead of one but removes all index arithmetic on the consume side.\n\n### The consume side\n\nWith half/full events the consumer processes *whole halves* at the event — no indices to track, no torn reads (the DMA will not touch the half being processed until the next event). Where finer granularity is needed (process as soon as possible rather than in halves), the consumer reads the DMA\'s current-count register to locate the write position — with the wrap-safe difference arithmetic of module 07 and one subtlety: the count register is a *moving target*, so the read must be latched once and treated as advisory. Both styles exist in real drivers; half/full event processing is the default because it needs no latching games.',
    deepDive:
      '### Deadline arithmetic, quantitatively, honestly\n\nHalf-event pipeline deadlines are simple division: buffer 256 samples at 10 kHz → half = 128 samples = 12.8 ms of processing budget per event. The budget must cover the *worst case* processing (module 13-l3\'s measured numbers), because an overrun does not error — it silently processes stale data while the engine overwrites. That silence is why stream drivers always carry two counters for the field: samples processed and samples *missed* (detectable as events arriving closer than the processing time). Missed-sample counters turn "occasional crackle" into a logged, diagnosable budget failure — the same visibility discipline as ring-buffer drop counts (module 07-l3).\n\n### Buffer sizing versus latency, again\n\nCircular buffer depth is a latency commitment: 256 samples at 10 kHz is 25.6 ms of buffered audio — fine for control, fatal for low-latency audio. The sizing triangle: depth (latency) × rate (throughput) must cover worst-case processing stalls (module 07-l3\'s sizing rule, transplanted to hardware). For ADC monitoring, depth is usually chosen in powers of two (half/full events align); for audio, by the latency budget. Either way the number is written down with its derivation — undocumented buffer depths are the "magic constants" of stream firmware.\n\n### Where hardware half/full events are absent, honestly\n\nNot every DMA provides half-transfer events (and some circular modes only interrupt at wrap). The portable fallback: interrupt on transfer-complete (wrap) only, and process the whole buffer per wrap — same pattern, coarser latency (full buffer period). Or run single-shot transfers with the CPU restarting each (the software ping-pong of the main text) at the cost of one interrupt per buffer — perfectly acceptable at low rates. Which mechanisms exist is a vendor-manual fact; the ownership-and-deadline reasoning is identical across all of them.',
    examples: [
      {
        title: 'Circular ADC DMA with half/full processing, fully traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational simulation of circular DMA + half/full events.\n * Real hardware: the ADC triggers the DMA; HT/TC flags arrive as\n * interrupts. Structure and ownership rules are identical. */\n#define BUF_N 8u\n\nstatic uint16_t adc_buf[BUF_N];\nstatic volatile uint8_t  dma_write_pos = 0u;   /* engine\'s position (model) */\nstatic volatile uint8_t  half_flag = 0u;\nstatic volatile uint8_t  full_flag = 0u;\n\nstatic uint16_t sample_source = 100u;          /* "the world" */\n\n/* One ADC conversion lands in the circular buffer. */\nstatic void dma_adc_tick(void) {\n    adc_buf[dma_write_pos] = sample_source++;\n    dma_write_pos = (uint8_t)((dma_write_pos + 1u) & (BUF_N - 1u));\n    if (dma_write_pos == (uint8_t)(BUF_N / 2u)) {\n        half_flag = 1u;                        /* first half complete   */\n    }\n    if (dma_write_pos == 0u) {\n        full_flag = 1u;                        /* second half complete  */\n    }\n}\n\n/* Consumer: on HT process [0..N/2), on TC process [N/2..N). */\nstatic void consumer_step(void) {\n    if (half_flag != 0u) {\n        half_flag = 0u;\n        printf("HT: process samples[0..%u): first=%u\\n",\n               (unsigned)(BUF_N / 2u), (unsigned)adc_buf[0]);\n    }\n    if (full_flag != 0u) {\n        full_flag = 0u;\n        printf("TC: process samples[%u..%u): first=%u\\n",\n               (unsigned)(BUF_N / 2u), (unsigned)BUF_N,\n               (unsigned)adc_buf[BUF_N / 2u]);\n    }\n}\n\nint main(void) {\n    for (uint32_t t = 0u; t < 16u; t++) {\n        dma_adc_tick();\n        consumer_step();   /* consumer runs fast - never misses an event */\n    }\n    return 0;\n}',
        explanation: [
          'Samples 100..115 arrive one per tick, wrapping through the 8-slot buffer.',
          'At tick 4 (write_pos wraps to 4 = N/2): HT fires → consumer processes samples 0..3 (first = 100).',
          'At tick 8 (write_pos wraps to 0): TC fires → processes 4..7 (first = 104). Tick 12: HT again (first = 108); tick 16: TC (first = 112).',
          'Exact output: `HT: process samples[0..4): first=100` / `TC: process samples[4..8): first=104` / `HT: process samples[0..4): first=108` / `TC: process samples[4..8): first=112`.',
          'While the consumer processes a half, the engine fills the *other* half — the pipeline guarantee. The consumer here is instantaneous; a real one must beat the half-buffer deadline (deep dive).',
        ],
      },
      {
        title: 'Ping-pong ownership swap, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\ntypedef enum { OWNER_DMA = 0, OWNER_CPU } owner_t;\n\ntypedef struct {\n    uint16_t data[4];\n    owner_t  owner;\n} frame_t;\n\nstatic frame_t frames[2];\nstatic uint8_t dma_frame = 0u;      /* index the engine fills   */\nstatic uint32_t sample_source = 0u;\n\nstatic void dma_fill_step(void) {\n    frame_t *f = &frames[dma_frame];\n    for (uint8_t i = 0u; i < 4u; i++) {\n        f->data[i] = (uint16_t)(sample_source + i);\n    }\n    sample_source += 4u;\n}\n\nstatic void dma_complete(void) {\n    frames[dma_frame].owner = OWNER_CPU;   /* hand the frame over  */\n    dma_frame = (uint8_t)(1u - dma_frame);  /* engine moves to other */\n    frames[dma_frame].owner = OWNER_DMA;\n}\n\nint main(void) {\n    frames[0].owner = OWNER_DMA;\n    frames[1].owner = OWNER_CPU;\n\n    for (uint32_t round = 0u; round < 2u; round++) {\n        dma_fill_step();\n        dma_complete();\n\n        /* CPU processes the frame it now owns: */\n        uint8_t cpu_idx = (uint8_t)(1u - dma_frame);\n        printf("round %u: cpu owns frame %u, first=%u\\n",\n               (unsigned)round, (unsigned)cpu_idx,\n               (unsigned)frames[cpu_idx].data[0]);\n    }\n    return 0;\n}',
        explanation: [
          'Round 0: engine fills frame 0 (samples 0..3), hands it to the CPU, moves to frame 1. CPU processes frame 0: first = 0.',
          'Round 1: engine fills frame 1 (samples 4..7), hands it over, moves back to frame 0. CPU processes frame 1: first = 4.',
          'Exact output: `round 0: cpu owns frame 0, first=0` / `round 1: cpu owns frame 1, first=4`.',
          'The owner enum is the entire safety mechanism: the CPU only ever reads frames[cpu_idx] after dma_complete flipped ownership — touching the DMA\'s frame mid-fill is the corruption this pattern exists to prevent.',
          'With real double-buffer hardware, dma_complete is the completion interrupt; with single-shot hardware, it is the ISR that re-arms the next descriptor.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Half/full pipeline on one circular buffer',
        content:
          '  time  engine writes              consumer processes\n  ----  --------------              ------------------\n   t0   fills [0..N/2)              (idle)\n   t1   HT event! fills [N/2..N)    processes [0..N/2)   <- safe: engine\n                                                              is elsewhere\n   t2   TC event! fills [0..N/2)    processes [N/2..N)   <- safe again\n   t3   HT event! ...               ...\n\n  deadline per half = (N/2) samples / sample rate\n  miss it -> engine overwrites data you have not processed',
        caption:
          'Educational sketch (illustrative). The buffer is its own double buffer; the events are the baton passes.',
      },
    ],
    tables: [
      {
        caption: 'Stream-handling patterns compared',
        headers: ['Pattern', 'Buffers', 'Latency', 'Index care', 'Hardware need'],
        rows: [
          ['Half/full events', '1', 'N/2 samples', 'None (whole halves)', 'HT/TC events'],
          ['Ping-pong (hw double-buffer)', '2', 'N samples', 'None', 'Dual-address mode'],
          ['Ping-pong (software re-arm)', '2', 'N samples', 'None', 'Any single-shot DMA'],
          ['Count-register tracking', '1', ' finest', 'Latched reads + wrap math', 'Readable count'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Processing a half after its deadline and trusting the stale data.',
        fix:
          'Deadline = half buffer / sample rate; measure worst-case processing against it (module 13-l3) and count missed events in the field. Overruns are silent — instrumentation is mandatory.',
      },
      {
        mistake: 'Reading the DMA\'s current-count register repeatedly as if it were stable.',
        fix:
          'Latch it once per decision and treat it as advisory; the engine moves between your reads. For strict correctness prefer half/full event processing.',
      },
      {
        mistake: 'Forgetting that circular mode never "completes".',
        fix:
          'Circular streams signal progress via HT/TC events, not transfer-complete. Code waiting for a circular DMA\'s completion waits forever.',
      },
    ],
    guidedPractice: {
      title: 'Size a half/full pipeline',
      brief:
        'A 4-channel ADC scans at 8 kHz; the processing (filtering all channels) takes worst-case 3 ms. Choose the buffer sample count (power of two, aligned to the 4-channel scan) and verify the half-event deadline beats the processing time. State the latency introduced.',
      expectedBehavior:
        'Samples arrive 8000/s; per half-buffer of N/2 samples the deadline is (N/2)/8000 s ≥ 3 ms → N ≥ 48 → choose N = 64 (16 scans). Deadline = 32/8000 = 4 ms > 3 ms ✓ (margin thin — note it and measure). Latency = one half buffer = 4 ms.',
      hints: [
        'Deadline = (N/2) / rate.',
        'Powers of two keep the halves aligned.',
      ],
    },
    practiceExercises: [
      {
        title: 'Detect the overrun',
        brief:
          'Write the missed-event detector: timestamps of HT events arrive; if two consecutive events are closer than the processing worst case, increment a miss counter. Trace it with events spaced 4, 4, 3, 4 ms against a 3 ms processing time.',
        expectedBehavior:
          'Events at 4, 4, 3, 4 ms gaps: all gaps ≥ 3 ms except... 3 ms gap equals the processing time — borderline: the consumer finished exactly as the next event arrived. Strictly, gap < processing time = miss; 3 ms is not < 3 ms, so zero misses with a hair-thin margin. The detector\'s value: in the field, any gap under 3 ms logs a miss instead of crackling silently.',
        hints: [
          'Miss condition: gap < worst-case processing.',
          'Borderline gaps deserve margin in the real design.',
        ],
      },
      {
        title: 'Convert to ping-pong',
        brief:
          'Rewrite the half/full consumer as software ping-pong with two 4-sample frames: state what the completion ISR does and how many interrupts per 8 samples occur in each scheme.',
        expectedBehavior:
          'Ping-pong ISR: on completion, flip the owner of the finished frame, re-arm the DMA on the other. Interrupts: half/full gives 2 per 8 samples (HT+TC); ping-pong gives 2 per 8 samples too (one completion per 4-sample frame ×2) — equal count, but ping-pong pays two buffers for simpler (frame-granular) ownership.',
        hints: [
          'Count events per buffer worth of data in each scheme.',
          'Ownership flip is the ISR\'s whole job.',
        ],
      },
    ],
    assessment: {
      title: 'Circular DMA checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In circular DMA mode, progress is signalled by:',
          options: [
            'Half-transfer and transfer-complete events',
            'A transfer-complete only at startup',
            'Nothing; you must poll addresses',
            'An error flag',
          ],
          answer: 'Half-transfer and transfer-complete events',
          explanation:
            'Circular mode never completes; HT/TC events mark the crossings.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'The half-event processing deadline for N samples at rate R is:',
          options: ['(N/2) / R', 'N / R', '2N / R', 'R / N'],
          answer: '(N/2) / R',
          explanation:
            'Half the buffer must be processed before the engine wraps back into it.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In half/full processing, the DMA will pause if the CPU has not finished the previous half.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'The engine never waits; a missed deadline means unprocessed data is overwritten — silently.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'In the traced simulation, which first-sample value does the SECOND HT event report?',
          code: '/* BUF_N=8, samples 100.. sequential, HT at write_pos==4 */',
          options: ['108', '100', '104', '112'],
          answer: '108',
          explanation:
            'Second HT fires at tick 12; buffer slot 0 then holds sample 108 (the wrap re-filled it with 104..111 in slots 4..7 then 108..111 in 0..3).',
          hint: 'Count 4-sample batches from 100.',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'What is the CPU forbidden to do while a buffer has OWNER_DMA?',
          answer: 'read or write it — the DMA owns it exclusively until the completion/ownership flip',
          explanation:
            'Touching an in-flight buffer is the classic DMA corruption; ownership states (lesson 3) exist to prevent it.',
          hint: 'One word: access.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Circular DMA', definition: 'A DMA mode that reloads its count at buffer end, streaming forever.' },
      { term: 'Half-transfer (HT) / transfer-complete (TC)', definition: 'The midpoint and end crossing events that drive pipelined processing.' },
      { term: 'Ping-pong', definition: 'Two buffers with swapped ownership: engine fills one while the CPU processes the other.' },
      { term: 'Stream deadline', definition: 'The time a half (or buffer) of data takes to be overwritten — the processing budget.' },
    ],
    revisionSummary: [
      'Circular DMA = hardware ring buffer; HT/TC are the baton passes.',
      'Deadline = (N/2)/rate; measure processing against it; count misses.',
      'Ping-pong trades a buffer for index-free ownership.',
      'Count-register reads are advisory; latch once.',
      'Overruns are silent — instrument them.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Circular buffer', url: 'https://en.wikipedia.org/wiki/Circular_buffer', kind: 'article' },
      { label: 'docs.espressif.com — ESP-IDF DMA buffers and alignment', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/dma.html', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m14-l3',
    title: 'Coherency, Ownership and DMA Error Handling',
    summary:
      'The architecture-level DMA rules: who owns which buffer when, cache coherency on cores that have caches, and the error paths every DMA driver needs.',
    objectives: [
      'State the ownership contract for DMA buffers and enforce it in code.',
      'Explain cache coherency issues and the clean/invalidate responses — labelled as architecture-specific.',
      'List the DMA error events and write the error-handling ladder for a stream.',
      'Apply alignment and placement rules that real DMA hardware imposes.',
    ],
    whyItMatters:
      'DMA bugs are the nastiest in firmware: intermittent, data-shaped, and invisible to logic review because the CPU is not involved in the failure. Ownership discipline and coherency awareness are the difference between a stream that works in the demo and one that works for years.',
    prerequisites: ['embc-m14-l2', 'embc-m06-l2'],
    explanation:
      '### Ownership: the contract that prevents corruption\n\nA buffer under DMA has exactly one owner at any instant — the engine or the CPU. The rules: the CPU never reads a buffer the engine is writing, never writes one the engine is reading, and only touches buffers after the ownership flip (completion event) hands them over. Enforcement is structural: an owner field per buffer (module 14-l2\'s ping-pong), asserts on misuse in debug builds, and a review rule that any pointer escaping the ownership region is a finding. Most "occasional corrupted sample" bugs are ownership violations, not electrical problems.\n\n### Cache coherency — where architectures diverge (labelled)\n\n**Architecture-specific:** cores *without* data caches (classic Cortex-M0/M3/M4, most small MCUs) make this section moot: the DMA and CPU see the same memory. Cores *with* caches (Cortex-M7 with its optional data cache, ESP32, application-class parts) introduce the trap: the CPU reads memory *through* its cache, the DMA writes memory *directly*. A CPU read may return a stale cached line instead of the DMA\'s fresh data; conversely, CPU-written data may sit dirty in cache while the DMA reads stale RAM. The standard responses, where the architecture supports them: **invalidate** the buffer\'s cache lines before reading DMA-written data (forcing fresh fetches), and **clean** (write back) dirty lines before starting a DMA that reads CPU-written data — or sidestep both by placing DMA buffers in a non-cacheable region the vendor\'s MPU/region configuration provides. The exact operations are vendor/architecture-specific (ARM\'s cache maintenance APIs, ESP-IDF\'s documented requirements); the *concept* — two agents, one memory, one of them bypassing the cache — is the portable part. Check your chip\'s documentation: on many small MCUs there is simply nothing to do.\n\n### Error events and the stream ladder\n\nDMA engines report: **transfer error** (bus fault during a transfer — bad address, peripheral gone), **overrun/underrun** (peripheral FIFO overflowed or starved — the consumer/producer missed the deadline), and direction-specific events. The stream ladder (module 13-l3\'s pattern, applied): log the error with the channel and count, stop the stream, re-initialise the channel (descriptor + buffers), and restart — bounded retries, then degrade the feature. A stream that silently keeps running after an error is worse than one that stops: its data is wrong with no indication.\n\n### Alignment and placement rules\n\nReal DMA hardware imposes physical constraints the mocks ignore: buffers often must be **aligned** to the transfer width (word transfers to word-aligned addresses), sometimes size-constrained, and — on cached or MMU-ed parts — placed in DMA-capable regions (some RAM areas are not reachable by every DMA channel). The vendor manual states the rules per engine; violating them yields transfer errors or silent misbehaviour. Firmware\'s habit: alignment macros on every DMA buffer declaration and a compile-time assert on sizes, so violations fail at build time, not in the field.',
    deepDive:
      '### A worked coherency failure, honestly (architecture-specific)\n\nOn a cached core: the CPU writes a 32-byte command buffer, starts a memory-to-peripheral DMA, and — because the writes sat dirty in cache — the DMA reads the *previous* contents from RAM. The peripheral receives plausible garbage; no fault is raised anywhere. The fixes in the vendor\'s vocabulary: clean the buffer\'s cache lines after writing (ARM cache-maintenance call), mark the region non-cacheable, or (some peripherals) use a hardware FIFO/coherency path. The debugging signature is worth knowing: coherency bugs vanish with `-O0`, or when the buffer is small enough to fit cache anyway, or when an unrelated printf (touching the same lines) flushes them — *timing-dependent wrong data with correct code structure* is the coherency fingerprint. Again: only on cores with caches; the majority of small MCUs in this course\'s examples are immune, and the honest engineering response is to know which world your chip lives in.\n\n### Ownership across ISRs and tasks\n\nOwnership flips are themselves shared-state transitions: a completion ISR flips OWNER_DMA to OWNER_CPU while the application may be *deciding* whether to submit a new buffer. On bare metal, the flip is a single store (atomic — module 06-l2) and the application checks ownership inside its normal flow; on an RTOS (module 16) the flip becomes a notification. The subtle case is the *stop* path: aborting a stream mid-transfer requires stopping the channel first, then re-owning the buffer — touching a buffer while the engine is mid-abort is a documented race in some peripherals. The rule that survives all vendors: the channel is stopped/quiesced before any buffer it touched is reused, with the vendor manual\'s abort sequence followed exactly.\n\n### Error handling as a state machine, honestly\n\nProduction stream drivers are small state machines: IDLE → RUNNING → (on error) FAULTED → REINIT → RUNNING, with a bounded retry count from FAULTED before degrading the feature (module 13-l3 ladder). The states matter because error *storms* (a peripheral unplugged mid-stream) otherwise thrash the reinit path thousands of times per second, flooding logs and CPU. Backoff the retries (exponential or stepped), cap them, degrade with a clear [E] log, and give the recovery a trigger (device present detection, user command). The same shape — with different triggers — applies to the I2C recovery of module 09-l3: bounded, logged, degrading, never silent.',
    examples: [
      {
        title: 'Ownership state machine for a two-buffer stream, traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\ntypedef enum { BUF_DMA = 0, BUF_CPU } buf_owner_t;\n\ntypedef struct {\n    uint16_t    data[4];\n    buf_owner_t owner;\n} buf_t;\n\nstatic buf_t bufs[2];\nstatic uint8_t dma_idx = 0u;\nstatic uint32_t fill_source = 0u;\n\nstatic void dma_fill(buf_t *b) {\n    /* engine writes ONLY buffers marked BUF_DMA (assert in debug). */\n    for (uint8_t i = 0u; i < 4u; i++) {\n        b->data[i] = (uint16_t)(fill_source++);\n    }\n}\n\nstatic void dma_complete_isr(void) {\n    bufs[dma_idx].owner = BUF_CPU;             /* hand over          */\n    dma_idx = (uint8_t)(1u - dma_idx);\n    dma_fill(&bufs[dma_idx]);                  /* engine re-arms     */\n    bufs[dma_idx].owner = BUF_DMA;\n}\n\nstatic uint8_t cpu_try_consume(buf_t **out) {\n    for (uint8_t i = 0u; i < 2u; i++) {\n        if (bufs[i].owner == BUF_CPU) {\n            *out = &bufs[i];\n            return 1u;                          /* ownership verified */\n        }\n    }\n    return 0u;                                  /* nothing ready      */\n}\n\nint main(void) {\n    bufs[0].owner = BUF_DMA;\n    bufs[1].owner = BUF_CPU;\n    bufs[1].data[0] = 0xFFFFu;   /* stale marker: nothing filled yet */\n\n    buf_t *b = 0;\n    if (cpu_try_consume(&b) != 0u) {\n        printf("consume frame first=%u\\n", (unsigned)b->data[0]);\n        b->owner = BUF_DMA;                      /* requeue for engine */\n    }\n\n    dma_complete_isr();\n    if (cpu_try_consume(&b) != 0u) {\n        printf("consume frame first=%u\\n", (unsigned)b->data[0]);\n    }\n    return 0;\n}',
        explanation: [
          'Initially frame 1 is stale (0xFFFF) but CPU-owned — consume reads it: `consume frame first=65535` (the startup transient, honestly shown).',
          'dma_complete_isr hands frame 0 to the CPU (first = 0), re-arms the engine on frame 1.',
          'Second consume: frame 0, first = 0.',
          'Exact output: `consume frame first=65535` / `consume frame first=0`.',
          'Every access is guarded by the owner check — cpu_try_consume returns buffers only in BUF_CPU state. This is the shape production stream drivers take (with RTOS notifications replacing the polling in module 16).',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'Buffer ownership states',
        content:
          '                    completion event\n      +----------+  ----------------->  +----------+\n      | BUF_DMA  |                      | BUF_CPU  |\n      | (engine  |  <-----------------  | (CPU may |  CPU reads /\n      |  fills)  |   requeue by CPU     |  access) |  processes\n      +----------+                      +----------+\n\n  RULES:\n   - engine writes only BUF_DMA buffers\n   - CPU touches only BUF_CPU buffers\n   - the flip is atomic (single store / ISR)\n   - on abort: stop channel FIRST, then re-own',
        caption:
          'The ownership contract as a two-state machine. Every DMA bug of the "occasionally corrupt" variety lives in a violation of these arrows.',
      },
    ],
    tables: [
      {
        caption: 'Coherency responsibilities by core type (architecture-specific)',
        headers: ['Core class', 'Data cache?', 'DMA buffer duties'],
        rows: [
          ['Cortex-M0/M3/M4, most 8-bit', 'No', 'None — same memory view'],
          ['Cortex-M7 (D-cache enabled)', 'Yes', 'Invalidate before CPU read; clean before DMA read; or non-cacheable region'],
          ['ESP32 (cached RAM)', 'Yes', 'Follow vendor alignment/cache rules; use documented DMA-capable memory'],
        ],
      },
      {
        caption: 'DMA error events and responses',
        headers: ['Event', 'Meaning', 'Response'],
        rows: [
          ['Transfer error', 'Bus fault during transfer', 'Stop channel, log, reinit, bounded retry'],
          ['Overrun/underrun', 'FIFO overflowed/starved — deadline missed', 'Count misses, widen buffer or speed consumer'],
          ['Aborted stream', 'Software stop mid-transfer', 'Stop channel fully, then re-own buffers'],
          ['Error storm', 'Errors faster than recovery', 'Backoff, cap retries, degrade + [E] log'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming cache coherency rules (either having or lacking them) without checking the chip.',
        fix:
          'Know your core\'s world: no data cache means nothing to do; with a cache, follow the vendor\'s clean/invalidate or non-cacheable-region guidance. Both wrong assumptions produce field-only failures.',
      },
      {
        mistake: 'Reusing a buffer the moment the code path "looks done" instead of on ownership flip.',
        fix:
          'Reuse follows the ownership state machine, not code intuition — especially on the abort path, where the channel must be quiesced first.',
      },
      {
        mistake: 'Restarting a failed stream in a tight loop.',
        fix:
          'Error storms need backoff and a cap, then degrade with a visible log (module 13-l3). A thrashing reinit loop masks the original fault and starves everything else.',
      },
    ],
    guidedPractice: {
      title: 'Write the stream error handler',
      brief:
        'For a UART RX DMA stream: write the FAULTED-state handler (log with channel and error count, stop channel, reinit descriptor and buffers, bounded 3 retries with backoff, then degrade). State what the health gate (module 13-l3) reports while FAULTED.',
      expectedBehavior:
        'Handler: [E] log (channel, error code, count), stop channel (vendor abort sequence), re-init descriptor/buffers with alignment checks, restart; retries capped at 3 with increasing delay; then degrade: log [E] "uart rx degraded", health gate reports the latched fault so the watchdog/monitoring sees it.',
      hints: [
        'The ladder from module 13-l3, specialised to streams.',
        'The health gate must see the degraded state — never hide it.',
      ],
    },
    practiceExercises: [
      {
        title: 'Classify the failure',
        brief:
          'Symptoms on a cached-core board: DMA-written ADC data is correct after a cold boot but occasionally one buffer stale; adding a printf in the processing loop makes it vanish. Diagnose with reasoning, and name the fix family.',
        expectedBehavior:
          'Cache coherency: the CPU sometimes reads stale cached lines instead of the DMA\'s fresh RAM data; the printf perturbs cache state (evicting/flushing lines), the classic coherency fingerprint. Fix family: invalidate buffer lines before CPU reads, or place buffers in a non-cacheable region — per the vendor\'s cache-maintenance API.',
        hints: [
          'Timing-dependent, structure-correct, printf-sensitive = coherency.',
          'Two agents, one memory, one bypassing the cache.',
        ],
      },
      {
        title: 'Alignment audit',
        brief:
          'A word-wide DMA requires word alignment. Which of these buffer declarations are safe, and why: `uint8_t buf[64];` (used via cast), `uint32_t buf[16];`, `uint16_t buf[32];`?',
        expectedBehavior:
          '`uint32_t buf[16]` is safe (natural word alignment guaranteed). `uint8_t buf[64]` cast to uint32_t* is NOT guaranteed aligned — undefined behaviour risk; wrap in an alignment attribute or use the properly-typed array. `uint16_t buf[32]` is halfword-aligned; word-wide access through it needs a word-alignment guarantee (often fine by array placement, but not guaranteed by the standard) — use uint32_t typed storage for word streams.',
        hints: [
          'Alignment follows the declared type.',
          'Casting char arrays to wider types is the classic alignment violation.',
        ],
      },
    ],
    assessment: {
      title: 'Ownership and coherency checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'The CPU may access a DMA buffer only when:',
          options: [
            'Ownership has flipped to the CPU via the completion path',
            'The DMA looks idle',
            'The buffer is small',
            'Interrupts are disabled',
          ],
          answer: 'Ownership has flipped to the CPU via the completion path',
          explanation:
            'The owner state machine is the contract; "looks idle" is exactly the race that corrupts streams.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'On a cached core, before the CPU reads a DMA-written buffer it must typically:',
          options: [
            'Invalidate the buffer\'s cache lines (or use a non-cacheable region)',
            'Do nothing; caches are always coherent with DMA',
            'Reboot the DMA',
            'Double the buffer size',
          ],
          answer: 'Invalidate the buffer\'s cache lines (or use a non-cacheable region)',
          explanation:
            'Without invalidation the CPU may read stale cached lines. (Architecture-specific: cores without data caches need nothing.)',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'On a Cortex-M4 (no data cache), DMA buffers need no cache maintenance.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'Without a data cache, CPU and DMA share the same memory view — the coherency section is moot there.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does the first consume print in the ownership example?',
          code: 'bufs[1].data[0] = 0xFFFFu;  /* stale marker */\n/* cpu_try_consume finds bufs[1].owner == BUF_CPU */',
          options: ['65535', '0', '1', 'Nothing'],
          answer: '65535',
          explanation:
            'Frame 1 is CPU-owned but never yet filled — the stale marker prints, honestly showing the startup transient.',
          hint: 'Which frame is CPU-owned at startup, and what is in it?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the two cache-maintenance operations relevant to DMA.',
          answer: 'clean (write back CPU-written data before a DMA read) and invalidate (discard cached lines before a CPU read of DMA-written data)',
          explanation:
            'Clean makes the DMA see CPU writes; invalidate makes the CPU see DMA writes. Architecture-specific — check the vendor documentation.',
          hint: 'One pushes CPU data out; one pulls fresh data in.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Buffer ownership', definition: 'The exclusive-access contract between DMA engine and CPU, flipped at completion.' },
      { term: 'Cache coherency', definition: 'The consistency problem when a cached CPU and a bypassing DMA share memory (architecture-specific).' },
      { term: 'Clean / invalidate', definition: 'Cache write-back and discard operations used to synchronise cached CPUs with DMA.' },
      { term: 'Error storm', definition: 'Failures recurring faster than recovery — handled with backoff, caps and degradation.' },
      { term: 'Alignment requirement', definition: 'The DMA\'s need for buffers aligned (and sometimes placed) per its transfer width.' },
    ],
    revisionSummary: [
      'Ownership state machine guards every access; abort = stop channel first.',
      'Coherency is architecture-specific: no cache = no duty; cache = clean/invalidate or non-cacheable regions.',
      'Transfer errors get the ladder: stop, log, reinit, bounded backoff, degrade.',
      'Overruns are deadline failures — count them.',
      'Align and type DMA buffers properly; check the vendor rules.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Cache coherence', url: 'https://en.wikipedia.org/wiki/Cache_coherence', kind: 'article' },
      { label: 'developer.arm.com — documentation portal (cache maintenance)', url: 'https://developer.arm.com/documentation', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
];
