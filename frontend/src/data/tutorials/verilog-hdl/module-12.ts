import type { TutorialLesson } from '../types';

// Module 12 — Memories & Arrays
export const module12Lessons: TutorialLesson[] = [
  {
    id: 'vlog-m12-l1',
    title: 'Declaring and Addressing Memories',
    summary:
      'Move from single registers to arrays: memory declarations, address decoding, write enables, and the read-modify-write rules that shape RAM code.',
    objectives: [
      'Declare memory arrays (reg [7:0] mem [0:255]) and explain both dimensions.',
      'Implement a parameterized RAM write port with byte-level and word-level enables.',
      'Explain why you cannot bit-select inside a memory word in one Verilog-2001 expression.',
      'Compute address widths and decode ranges correctly.',
    ],
    whyItMatters:
      'Memories are where designs stop being toy circuits: register files, FIFO buffers, frame buffers, lookup tables. Array syntax looks deceptively like software arrays, but every access becomes address decoding, word-line enables and sense paths in hardware — and the tool’s inference decisions (block RAM vs registers) hinge on writing EXACTLY the patterns this lesson teaches.',
    prerequisites: ['vlog-m03-l2', 'vlog-m09-l1'],
    explanation:
      'A memory is an **array of vectors**:\n\n```\nreg [7:0] mem [0:255];   // 256 words, each 8 bits wide\n```\n\nRead the declaration inside-out: `mem` has 256 entries (address range [0:255]); each entry is an 8-bit `reg [7:0]`. The FIRST range in the declaration is the word width; the SECOND is the depth. Address math: a depth of D needs ceil(log2(D)) address bits — 256 words → 8 address bits, and addr 8\'hFF selects word 255.\n\nWriting one word is a clocked statement guarded by a write enable:\n\n```\nalways @(posedge clk)\n    if (we) mem[addr] <= din;    // one word per cycle\n```\n\nReading is `mem[addr]` — either asynchronously (`assign dout = mem[addr];`) or registered in the clocked block (module 12-l2 compares the two). One Verilog-2001 restriction to respect: you cannot bit-select INSIDE a memory word in a single expression — `mem[addr][3]` is illegal; assign the word to a temporary vector first, then slice it. (SystemVerilog relaxes this.)\n\n**Write granularity:** word writes are the default; byte-enables (write only some bytes of a wide word) are expressed per-byte: `if (we[1]) mem[addr][15:8] <= din[15:8];` — legal because each byte lane is its own assignment (note this is a part-select OF a word, which is allowed as an assignment TARGET; the restriction above is about reading a bit-slice in an expression).',
    deepDive:
      '### What the array becomes in hardware\n\nThree fates, chosen by the tool from your code shape: (1) **flip-flops + muxes** — small arrays (a few dozen words) with async read become register banks with address muxes; (2) **block RAM** — larger arrays written in the clocked pattern below with registered (synchronous) reads map to dedicated FPGA RAM columns; (3) **LUTRAM/distributed RAM** — small-to-medium arrays with async reads map into LUT storage. The sizes and shapes that qualify are vendor-specific — the portable discipline is writing the canonical patterns and letting the tool choose; module 12-l2 makes the pattern differences explicit.\n\n### Address decoding beyond the memory\n\nA memory-mapped system selects WHICH memory (or register) an address addresses: comparators on high address bits generate per-block enables (`ram_cs = (addr[7:5] == 3\'b001);`), and the low bits index inside. This is module 08’s decoder wearing a system hat; register files in CPUs are exactly a multi-port memory with read decoders and write enable. Port arithmetic: N address bits → 2^N words; a mismatch (9-bit addr on a 256-word array) silently addresses beyond the array — out-of-range reads return x in simulation (module 03) and map to undefined hardware in synthesis.\n\n### Multi-dimensional arrays\n\nVerilog-2001 allows arrays of vectors but not true multi-dimensional arrays (arrays of arrays need SystemVerilog). Emulate 2-D structures (e.g. a 4x4 tile of bytes) by flattening: index = row*COLS + col into a single array — the address math is your responsibility and your bug surface. State the flattening convention in comments.',
    examples: [
      {
        title: 'A parameterized single-port RAM with word and byte writes',
        language: 'verilog',
        code:
          '// ram_sp.v — single-port RAM: word writes or byte-lane writes\nmodule ram_sp #(\n    parameter DEPTH = 256,          // words\n    parameter WIDTH = 8,            // bits per word\n    parameter ABITS = 8             // ceil(log2(DEPTH)) = 8 for 256\n)(\n    input  wire             clk,\n    input  wire             we,        // word write enable\n    input  wire [WIDTH/8-1:0] be,      // byte enables (1 lane per byte)\n    input  wire [ABITS-1:0] addr,\n    input  wire [WIDTH-1:0] din,\n    output wire [WIDTH-1:0] dout       // async read of the addressed word\n);\n    reg [WIDTH-1:0] mem [0:DEPTH-1];   // WIDTH x DEPTH array\n\n    integer i;\n    always @(posedge clk) begin\n        if (we) begin\n            // WORD write when all byte lanes enabled:\n            if (&be)\n                mem[addr] <= din;\n            else begin\n                // BYTE-LANE writes: one assignment per byte lane.\n                // (Assignment to a part-select of a word is legal;\n                //  reading a bit-slice of mem in an expression is not.)\n                for (i = 0; i < WIDTH/8; i = i + 1) begin\n                    if (be[i])\n                        mem[addr][i*8 +: 8] <= din[i*8 +: 8];\n                end\n            end\n        end\n    end\n\n    assign dout = mem[addr];           // asynchronous read\n\nendmodule',
        explanation: [
          'The declaration order: reg [WIDTH-1:0] mem [0:DEPTH-1] — width first (per-word), depth second (how many words).',
          'Word write: mem[addr] <= din under we — one word per clock, the canonical RAM write pattern.',
          'Byte enables: the loop unrolls (module 06-l3) into per-lane guarded writes using indexed part-selects mem[addr][i*8 +: 8] as ASSIGNMENT TARGETS.',
          'The comment marks the one expression rule: mem[addr][3] as a READ is illegal in Verilog-2001 — copy the word to a temp vector first.',
          'Async read (assign dout = mem[addr]) makes this distributed/LUTRAM-shaped on FPGAs — module 12-l2 contrasts the registered-read version that maps to block RAM.',
        ],
      },
      {
        title: 'Address decoding for a memory-mapped register file',
        language: 'verilog',
        code:
          '// regfile_map.v — 4 registers + 4-word RAM behind one address bus\nmodule regfile_map(\n    input  wire       clk,\n    input  wire       reset_n,\n    input  wire       we,\n    input  wire [2:0] addr,       // 8 addresses: 0-3 regs, 4-7 RAM\n    input  wire [7:0] din,\n    output reg  [7:0] dout\n);\n    // Address map: 0-3 = control registers, 4-7 = RAM (4 words).\n    // The RAM window starts at address 4, where addr[1:0] = 0 --\n    // so addr[1:0] indexes the RAM DIRECTLY (aligned decode).\n    reg [7:0] ctrl0, ctrl1, ctrl2, ctrl3;\n    reg [7:0] ram [0:3];\n\n    wire reg_cs = ~addr[2];      // addresses 0-3\n    wire ram_cs =  addr[2];      // addresses 4-7\n\n    always @(posedge clk or negedge reset_n) begin\n        if (!reset_n) begin\n            ctrl0 <= 8\'h00;  ctrl1 <= 8\'h00;\n            ctrl2 <= 8\'h00;  ctrl3 <= 8\'h00;\n        end else if (we && reg_cs) begin\n            case (addr[1:0])               // low bits pick the register\n                2\'d0: ctrl0 <= din;\n                2\'d1: ctrl1 <= din;\n                2\'d2: ctrl2 <= din;\n                default: ctrl3 <= din;\n            endcase\n        end\n    end\n\n    always @(posedge clk) begin\n        if (we && ram_cs)\n            ram[addr[1:0]] <= din;         // offset inside the RAM window\n    end\n\n    // Read mux: registers or RAM (async read path for simplicity).\n    always @* begin\n        if (reg_cs)\n            case (addr[1:0])\n                2\'d0: dout = ctrl0;\n                2\'d1: dout = ctrl1;\n                2\'d2: dout = ctrl2;\n                default: dout = ctrl3;\n            endcase\n        else\n            dout = ram[addr[1:0]];\n    end\n\nendmodule',
        explanation: [
          'The chip-select comparators (addr[2]) are the system-level decoder: they route writes and reads to the right storage.',
          'Register writes use a case on the low address bits — module 08’s decoder as a register select.',
          'RAM indexing uses addr[1:0]: the window is ALIGNED (its first word sits at address 4, where addr[1:0] = 0), so the low bits index the RAM directly with no subtraction. Misaligned windows force offset arithmetic — a classic bug source; align windows to the index-field granularity.',
          'The read mux (always @*) selects the source: registers decode combinationally; the RAM read is the async array access.',
          'This is the skeleton of every memory-mapped peripheral: decode, per-block enables, offset indexing, read mux.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Anatomy of a memory access',
        content:
          '             +------------------------------------------+\n   addr ---->| [address decoder]                        |\n             |   word line N asserted                   |\n   din  ---->| [write driver, gated by we]              |--> mem[N] (8 FFs\n   we   ---->|                                          |    or a BRAM row)\n             | [read mux: 256:1, selects mem[addr]] ----|--> dout\n             +------------------------------------------+\n\n   256 words x 8 bits:\n     - write: 8 data pins + 256 word-enable lines (decoded from 8 addr bits)\n     - read:  256:1 multiplexer tree per output bit (async read)\n              or one register stage (sync read, module 12-l2)',
        caption:
          'Every array access is decoder + enables + a wide mux (or a BRAM column) — the array syntax is shorthand for this structure.',
      },
    ],
    tables: [
      {
        caption: 'Memory declaration reading order',
        headers: ['Declaration part', 'Meaning', 'Example (reg [7:0] mem [0:255])'],
        rows: [
          ['reg [7:0]', 'Word width (bits per entry)', '8-bit words'],
          ['[0:255]', 'Depth (number of entries)', '256 words'],
          ['Address width needed', 'ceil(log2(depth))', '8 bits (0..255)'],
          ['Total bits', 'width x depth', '2048 bits'],
        ],
      },
      {
        caption: 'Array access rules in Verilog-2001',
        headers: ['Operation', 'Legal?', 'Form'],
        rows: [
          ['Read a whole word', 'Yes', 'dout = mem[addr];'],
          ['Read bits INSIDE a word (expression)', 'No', 'copy to temp: word = mem[addr]; bit = word[3];'],
          ['Write a whole word', 'Yes', 'mem[addr] <= din;'],
          ['Write a part-select of a word', 'Yes', 'mem[addr][7:4] <= din[7:4];'],
          ['Out-of-range index', 'Compiles', 'x in simulation; undefined in hardware'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Swapping width and depth: reg [0:255] mem [7:0].',
        fix:
          'The first range is the word width, the second the depth. The swapped form makes 256 one-bit words indexed by a 3-bit address — silently the wrong memory. Read declarations inside-out and comment the dimensions.',
      },
      {
        mistake: 'Bit-selecting a memory word in an expression: if (mem[addr][3]).',
        fix:
          'Verilog-2001 forbids it (SystemVerilog allows it). Use a temporary: word = mem[addr]; if (word[3]) — or restructure to compare whole words.',
      },
      {
        mistake: 'Under-sizing the address bus for the depth (9-bit addr for a 256-word array), or decoding with raw addr instead of the offset bits.',
        fix:
          'Address width = ceil(log2(depth)). In memory-mapped designs, index with the OFFSET bits (addr[4:2] above) — raw full-width indices walk out of the array range and return x.',
      },
    ],
    guidedPractice: {
      title: 'Address arithmetic drill',
      brief:
        'A memory-mapped system: registers at addresses 0-3, an aligned RAM window of 4 words at addresses 4-7 (indexed by addr[1:0]). (1) How many total address bits? (2) What raw address reaches ram[2]? (3) What does addr = 3\'b101 select?',
      expectedBehavior:
        '(1) 8 addresses → 3 bits. (2) ram[2] ↔ address 4 + 2 = 6 (addr[1:0] = 2, addr[2] = 1). (3) addr = 101: addr[2]=1 → RAM window; addr[1:0] = 01 → ram[1].',
      hints: [
        'Aligned window: raw address = 4 + index; index = addr[1:0].',
        'ceil(log2(8)) = 3.',
      ],
    },
    practiceExercises: [
      {
        title: 'Read-before-write visibility',
        brief:
          'For ram_sp: after writing mem[5] <= 8\'hAB at edge n, what does dout show (a) immediately after edge n, (b) one time step later? Explain in terms of the async read path.',
        expectedBehavior:
          'The read is asynchronous: dout = mem[addr] combinationally follows the array. Once the write lands (just after edge n, via the nonblocking update), dout shows AB within the same time step (after the NBA region). There is no read latency — unlike the sync-read version in module 12-l2, where dout updates one clock AFTER the address is presented.',
        hints: [
          'Async read = a mux on the array; no clock in the read path.',
          'The write update lands in the NBA region of edge n.',
        ],
      },
      {
        title: 'Flattened 2-D tile',
        brief:
          'Model a 4x4 tile of 4-bit pixels as a single array (flattened index = row*4 + col). Write the declaration and the write logic for pixel (row, col) <= val, and state the total array depth.',
        expectedBehavior:
          'reg [3:0] pix [0:15]; — write: pix[row*4 + col] <= val; (row/col are 2-bit). Depth 16. The multiplication is by a constant 4 → wiring (a shift by 2), not a multiplier.',
        hints: [
          'Flattening: linear index = row * COLS + col.',
          'Constant multiply by 4 = slice/shift, free in hardware.',
        ],
      },
    ],
    assessment: {
      title: 'Module 12 Lesson 1 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In `reg [15:0] mem [0:63];`, what are the word width and depth?',
          options: ['16-bit words, 64 entries', '64-bit words, 16 entries', '16 entries of 64 words', '8-bit words, 128 entries'],
          answer: '16-bit words, 64 entries',
          explanation:
            'The first range [15:0] is the per-word width; the second [0:63] is the depth. Read memory declarations inside-out.',
          hint: 'Width first, depth second.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which expression is ILLEGAL in Verilog-2001?',
          options: [
            'assign w = mem[addr];',
            'mem[addr][7:4] <= din[7:4]; (as an assignment target)',
            'assign b = mem[addr][3]; (bit-select read in an expression)',
            'mem[addr] <= din;',
          ],
          answer: 'assign b = mem[addr][3]; (bit-select read in an expression)',
          explanation:
            'Reading bits inside a memory word in one expression is not allowed in Verilog-2001 — copy the word to a temporary first. Part-selects as assignment TARGETS are legal.',
          hint: 'The restriction is on reading, not writing.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'A 256-word memory is written with we=1, addr=8\'h1F, din=8\'h5A. What does mem[31] hold after the edge?',
          code:
            'always @(posedge clk)\n    if (we) mem[addr] <= din;\n// addr = 8\'h1F, din = 8\'h5A',
          options: ["8'h5A", "8'h00", 'x', "8'h1F"],
          answer: "8'h5A",
          explanation:
            '8\'h1F = 31: the write targets word 31, loading 5A. Address and data are independent — mem[31] = 0x5A.',
          hint: 'Hex 1F is decimal 31.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'An address bus 1 bit wider than ceil(log2(depth)) silently creates extra addressing that reads x in simulation.',
          answer: 'true',
          explanation:
            'Indices beyond the declared depth return x in simulation and map to undefined hardware in synthesis. Size the address exactly (or explicitly mask/decode it).',
          hint: 'What does an out-of-range index return in simulation?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'How many address bits does a 1024-word memory require (number)?',
          answer: '10',
          explanation:
            '2^10 = 1024 → 10 address bits. The general rule: ceil(log2(depth)).',
          hint: '2^? = 1024.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Memory array', definition: 'reg [W-1:0] mem [0:D-1]: D words of W bits; width first, depth second.' },
      { term: 'Address width', definition: 'ceil(log2(depth)) bits; undersized or oversized addressing creates out-of-range access.' },
      { term: 'Write enable', definition: 'The guard (we) on the clocked word write; byte enables give per-lane granularity.' },
      { term: 'Memory-mapped decode', definition: 'Chip-select comparators route an address bus to registers or RAM; offsets index inside each block.' },
      { term: 'Word line', definition: 'The decoded select for one memory entry — the physical meaning of mem[addr].' },
    ],
    revisionSummary: [
      'Declaration: reg [WIDTH-1:0] mem [0:DEPTH-1] — width first, depth second; address bits = ceil(log2 depth).',
      'Write: clocked mem[addr] <= din under we; byte enables via per-lane part-select assignments.',
      'Verilog-2001: no bit-select READ inside a memory word in expressions — use a temporary.',
      'Memory-mapped systems: chip-select comparators + offset indexing + read mux.',
      'Out-of-range access: x in simulation, undefined in hardware — size addresses exactly.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Register file', url: 'https://en.wikipedia.org/wiki/Register_file', kind: 'article' },
      { label: 'Wikipedia — Verilog', url: 'https://en.wikipedia.org/wiki/Verilog', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m12-l2',
    title: 'Synchronous vs Asynchronous Reads: Inferring BRAM',
    summary:
      'The single coding difference that decides whether your array becomes a fast block RAM or a LUT-based memory — registered reads vs combinational reads.',
    objectives: [
      'Write async-read and sync-read RAM versions of the same array.',
      'Explain why registered reads infer block RAM and async reads infer distributed RAM.',
      'Implement read-first and write-first collision behavior.',
      'Choose the right read style per system requirement.',
    ],
    whyItMatters:
      'This lesson carries the most consequential "pattern matters" message of the memory module: a one-line difference (clocked vs continuous read) changes which physical resource your array maps to — and with it, the speed, area and timing of the whole design. FPGA vendors document exactly these patterns; engineers who write them deliberately get free performance, and engineers who do not get mystery timing failures.',
    prerequisites: ['vlog-m12-l1', 'vlog-m09-l1'],
    explanation:
      '**Asynchronous read** — the address goes straight to a read mux:\n\n```\nassign dout = mem[addr];          // data valid in the SAME cycle as addr\n```\n\nThe output changes combinationally with the address. Hardware cost: a D:1 mux per output bit (D = depth) — fine for small D, prohibitively deep for large D. FPGA mapping: **distributed RAM** (storage in LUTs), limited in size.\n\n**Synchronous read** — the address is registered into a read pipeline:\n\n```\nalways @(posedge clk) begin\n    if (we) mem[addr] <= din;\n    dout <= mem[addr];             // read REGISTERED: data one clock later\nend\n```\n\nThe output is a flop stage after the array — matching exactly how **block RAM** hard macros behave (address in at the edge, data out one cycle later). This is THE inference pattern for BRAM: clocked read, clocked write. The price is one cycle of read latency; the reward is dedicated fast, dense, scalable memory.\n\n**Collision behavior** (same address read and written in one cycle) has two conventions: **write-first** (the read sees the NEW data) and **read-first** (the read sees the OLD data). In the registered pattern above, the read samples mem[addr] BEFORE the write lands — read-first by construction. Write-first needs the read value selected with the write: dout <= we ? din : mem[addr]; (when the addresses match — a comparison your code makes explicit).',
    deepDive:
      '### The latency contract changes the system design\n\nSync-read RAM exposes a 1-cycle latency: the consumer must pipeline its address, or accept stale-by-one-cycle data. Design consequences: address generation runs one stage ahead of data consumption (classic in line buffers and FIFOs); testbenches must check data one edge after the address; and a "RAM looks wrong" bug is often just unmodeled latency. Async-read RAM behaves like a big mux — same-cycle — but depth is limited and timing paths run from address through the whole mux to the consumer. Choose per pipeline structure, not habit.\n\n### Block RAM macro reality (honest, vendor-shaped)\n\nReal FPGA block RAMs come in fixed granularities (e.g. 36Kb columns with byte enables, cascadeable), support one or two TRUE ports, and expose options (output register for 2-cycle/hi-speed mode, init files, byte writes). Your RTL pattern SELECTS the macro; the vendor’s synthesis guide is the contract. Portable RTL says: "clocked read, clocked write, don’t read and write the same port in ways the pattern does not define" — then each tool maps it. Deviations (e.g. a read that also uses the write clock differently) silently fall back to LUTRAM or registers — the "mystery memory" that wastes a BRAM column or blows timing.\n\n### Two-port variants\n\nDual-port (one write port + one read port, independent addresses) is the standard register-file/FIFO-buffer shape: same inference pattern per port (clocked), separate address buses. True dual-port (both ports read/write) exists in hardware but collision semantics become a spec item (port A writes while port B reads the same address: which value? — the vendor macro defines it; your testbench must pin the expected behavior). Course scope: single-port and simple dual-port patterns.',
    examples: [
      {
        title: 'The two read styles, side by side (same 64x8 array)',
        language: 'verilog',
        code:
          '// ram_async.v — ASYNC read: same-cycle data (distributed-RAM shape)\nmodule ram_async(\n    input  wire       clk,\n    input  wire       we,\n    input  wire [5:0] addr,\n    input  wire [7:0] din,\n    output wire [7:0] dout\n);\n    reg [7:0] mem [0:63];\n\n    always @(posedge clk)\n        if (we) mem[addr] <= din;\n\n    assign dout = mem[addr];      // combinational: valid THIS cycle\n\nendmodule\n\n// ram_sync.v — SYNC read: 1-cycle latency (BLOCK-RAM shape)\nmodule ram_sync(\n    input  wire       clk,\n    input  wire       we,\n    input  wire [5:0] addr,\n    input  wire [7:0] din,\n    output reg  [7:0] dout\n);\n    reg [7:0] mem [0:63];\n\n    always @(posedge clk) begin\n        if (we)\n            mem[addr] <= din;\n        dout <= mem[addr];        // registered read: data NEXT cycle\n    end\n\nendmodule',
        explanation: [
          'ram_async: dout is a 64:1 mux over the array — addr changes propagate combinationally. Small-depth friendly; deep arrays make slow mux trees.',
          'ram_sync: the read is a register stage — exactly the block RAM macro’s behavior (address in at edge n, data out after edge n+1). This one-line difference is the BRAM inference trigger.',
          'Latency contract: ram_sync returns the addressed data one clock AFTER addr is presented; ram_async returns it immediately. Testbenches check at different edges.',
          'Collision (we=1 reading the same address): ram_sync samples mem[addr] before the write lands → read-first (OLD data). Write-first needs dout <= we ? din : mem[addr];.',
          'Both modules are synthesizable; the tool picks distributed RAM vs block RAM from the pattern — that decision belongs to the tool, your job is the pattern.',
        ],
      },
      {
        title: 'Dual-port RAM: independent write and read addresses',
        language: 'verilog',
        code:
          '// ram_dp.v — simple dual port: write port + read port (BRAM shape)\nmodule ram_dp(\n    input  wire       clk,\n    input  wire       we,\n    input  wire [5:0] waddr,\n    input  wire [7:0] din,\n    input  wire [5:0] raddr,\n    output reg  [7:0] dout\n);\n    reg [7:0] mem [0:63];\n\n    always @(posedge clk) begin\n        if (we)\n            mem[waddr] <= din;     // port A: write\n        dout <= mem[raddr];        // port B: registered read\n    end\n\nendmodule',
        explanation: [
          'Two independent addresses: writes go where waddr points while reads stream from raddr — the shape of FIFO buffers, line buffers and register files.',
          'Both operations live in ONE clocked block (single writer discipline, module 07): the array has one clocked process; the two "ports" are just two statements.',
          'This pattern infers a simple dual-port block RAM on FPGA tools — one of the highest-value patterns in the language.',
          'Cross-port collision (reading the word being written THIS cycle): the registered read samples the OLD value (read-first). If your system needs the new value, add the we/waddr match selection.',
          'Trace: write 0xAB to word 3 at edge n while raddr=3: after edge n, mem[3]=AB; dout (registered from the OLD mem[3]) updates after n with the pre-write value; at edge n+1 dout captures AB.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Async read mux vs sync read register (BRAM shape)',
        content:
          '  ASYNC READ (distributed RAM shape)\n\n   addr --+-->[64:1 mux per bit]--> dout   (same cycle)\n          |    ^\n   din/we-+----+--> array (written at edges)\n\n  SYNC READ (block RAM shape)\n\n   addr ------>[array]--(mux)-->[read REG]--> dout  (next cycle)\n   din/we  --------\'           ^\n                               clk\n\n  The read register is what the physical BRAM macro looks like —\n  matching it lets the tool map your array onto the real resource.',
        caption:
          'One registered stage on the read path is the difference between a deep mux and a block RAM mapping.',
      },
    ],
    tables: [
      {
        caption: 'Async vs sync read comparison',
        headers: ['Aspect', 'Async read', 'Sync read'],
        rows: [
          ['Read latency', '0 cycles (same-cycle data)', '1 cycle'],
          ['Hardware', 'Depth-wide mux per bit', 'Read register after array'],
          ['FPGA mapping', 'Distributed/LUTRAM (small depth)', 'Block RAM (any depth)'],
          ['Timing path', 'addr → mux → consumer', 'addr → BRAM → reg (pipeline-friendly)'],
          ['Collision default', 'n/a (combinational read)', 'read-first (old data) in this pattern'],
        ],
      },
      {
        caption: 'Collision behavior selection',
        headers: ['Desired behavior', 'Code'],
        rows: [
          ['Read-first (old data)', 'dout <= mem[addr];'],
          ['Write-first (new data)', 'dout <= we ? din : mem[addr]; (same-address cycle)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing the sync-read RAM but checking dout at the SAME edge as the address in the testbench.',
        fix:
          'Sync read has 1-cycle latency: present addr at edge n, check dout after edge n+1. Unmodeled latency is the top "my RAM is broken" false alarm.',
      },
      {
        mistake: 'Expecting a huge async-read array (e.g. 4096 words) to map to block RAM.',
        fix:
          'Async read forces a 4096:1 mux — it maps to distributed RAM/registers or simply fails resource targets. If depth is large, use the registered-read pattern; restructure the pipeline to absorb the 1-cycle latency.',
      },
      {
        mistake: 'Assuming write-first behavior without coding it.',
        fix:
          'The canonical registered pattern is read-first (old data on same-address collision). If the spec needs new data, add the explicit selection: dout <= we ? din : mem[addr]; and test the collision case.',
      },
    ],
    guidedPractice: {
      title: 'Latency trace',
      brief:
        'For ram_sync (64x8): the testbench sets addr=5 just before edge n1, with we=0 the whole time and mem[5]=0x77 pre-existing. Give dout after edges n1, n2 and n3. Then repeat for ram_async.',
      expectedBehavior:
        'ram_sync: the read register samples mem[5]=0x77 at edge n1 (addr already 5 going into the edge) → after n1: dout=0x77; after n2 and n3: still 0x77. The latency contract: data appears one edge after the address is stable going into an edge. ram_async: dout=0x77 immediately after addr changes — combinational, no edge involved.',
      hints: [
        'The read register samples the array at every edge using the CURRENT addr.',
        'Async read has no register in the path: data follows addr combinationally.',
      ],
    },
    practiceExercises: [
      {
        title: 'Write-first variant',
        brief:
          'Modify ram_sync to write-first behavior (a same-address read in the write cycle returns the NEW data), then trace: mem[2]=0x11, write 0x22 to addr 2 with a simultaneous read of addr 2.',
        expectedBehavior:
          'dout <= we ? din : mem[addr]; (for the collision case where raddr==waddr; single-port version: dout <= we ? din : mem[addr]). Trace: during the write cycle, dout captures din=0x22 (new data) instead of 0x11. Without the mux, the canonical pattern returns 0x11 (read-first).',
        hints: [
          'The write data is already available — select it when we is high.',
          'In a single-port RAM, we=1 implies the read address equals the write address.',
        ],
      },
      {
        title: 'Line buffer for image rows',
        brief:
          'A video design needs a 640-word line buffer: written left-to-right, then read left-to-right NEXT frame. Choose async or sync read, justify, and state the inference.',
        expectedBehavior:
          'Either works functionally; sync read (BRAM shape) is the right resource choice for 640 words (a 640:1 async mux would be huge and slow). Structure: write during the active line; read one line-time later — the 1-cycle latency is negligible against the 640-cycle line. Inference: block RAM (registered read pattern).',
        hints: [
          'Depth 640: what does a 640:1 mux cost?',
          'The consumer already runs a line behind — 1 more cycle is free.',
        ],
      },
    ],
    assessment: {
      title: 'Module 12 Lesson 2 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which read style matches the physical block RAM macro and enables BRAM inference?',
          options: [
            'Registered (synchronous) read: dout <= mem[addr]; inside the clocked block',
            'Combinational read: assign dout = mem[addr];',
            'Both equally',
            'Neither — BRAM needs vendor primitives',
          ],
          answer: 'Registered (synchronous) read: dout <= mem[addr]; inside the clocked block',
          explanation:
            'The registered read mirrors the BRAM macro’s address-in/data-out-next-cycle behavior — the pattern vendors document for inference. Combinational reads map to distributed RAM (or muxes).',
          hint: 'What does the hard macro’s timing look like?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'ram_sync with we=0, mem[7]=0x33, addr presented at edge n. What is dout after edge n+1?',
          code:
            'always @(posedge clk) begin\n    if (we) mem[addr] <= din;\n    dout <= mem[addr];\nend\n// addr=7 stable, mem[7]=0x33',
          options: ["8'h33", "8'h00", 'x', 'undefined until the next write'],
          answer: "8'h33",
          explanation:
            'The read register captured mem[7] at the edge (addr stable) — 1-cycle latency: data valid after edge n+1.',
          hint: 'The read register samples at the first edge with addr stable.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'multiple-choice',
          prompt: 'In the canonical registered pattern, a same-address write+read in one cycle returns...',
          options: ['the OLD data (read-first)', 'the NEW data (write-first)', 'x', 'undefined'],
          answer: 'the OLD data (read-first)',
          explanation:
            'The read register samples mem[addr] BEFORE the write lands (nonblocking updates apply together; the read sampled the pre-write array). Write-first needs the explicit we ? din : mem[addr] selection.',
          hint: 'When does the read sample relative to the write update?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'true-false',
          prompt: 'A 4096-word async-read array is a good candidate for FPGA block RAM.',
          answer: 'false',
          explanation:
            'Async read builds a 4096:1 mux per bit — distributed RAM/register territory, slow at depth. Registered reads are the block-RAM pattern for large depths.',
          hint: 'How deep is the read mux?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'How many cycles of read latency does the registered-read RAM add (number)?',
          answer: '1',
          explanation:
            'One read-register stage: address presented before edge n → data after edge n. Pipelines and testbenches must model this contract.',
          hint: 'One register stage.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Asynchronous read', definition: 'Combinational array read (same-cycle data); maps to distributed RAM; mux depth scales with array depth.' },
      { term: 'Synchronous read', definition: 'Registered array read (1-cycle latency); the block RAM inference pattern.' },
      { term: 'Block RAM (BRAM)', definition: 'Dedicated FPGA memory macros: fast, dense, clocked ports; selected by the registered-read pattern.' },
      { term: 'Distributed RAM', definition: 'LUT-based storage for small arrays with combinational reads.' },
      { term: 'Read-first / write-first', definition: 'Same-address collision conventions: old data vs new data returned by the read.' },
    ],
    revisionSummary: [
      'assign dout = mem[addr] = async read = big mux = distributed RAM shape.',
      'dout <= mem[addr] in the clocked block = sync read = BRAM shape; 1-cycle latency contract.',
      'Canonical collision behavior is read-first; write-first is an explicit mux selection.',
      'Dual-port pattern: one clocked block, separate write/read addresses — the FIFO/register-file shape.',
      'Model the latency in the pipeline AND the testbench — unmodeled latency masquerades as RAM bugs.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Static random-access memory', url: 'https://en.wikipedia.org/wiki/Static_random-access_memory', kind: 'article' },
      { label: 'Yosys documentation', url: 'https://yosyshq.readthedocs.io/', kind: 'tool' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'vlog-m12-l3',
    title: 'ROMs, Initialization and Portability',
    summary:
      'Build constant-memory lookup tables: case-based ROMs, $readmemh initialization (simulation vs FPGA realities), and the portability rules for memory RTL.',
    objectives: [
      'Implement a combinational ROM with case decoding.',
      'Initialize arrays with $readmemh in simulation — honestly labeled.',
      'Explain FPGA memory initialization options vs ASIC realities.',
      'State the portability checklist for memory RTL.',
    ],
    whyItMatters:
      'Lookup tables — sine tables, character generators, coefficient ROMs for filters, microcode — are memories that never change. Getting initialization right is where simulation and hardware diverge most sharply: $readmemh "just works" in simulation, works differently per FPGA flow, and does nothing in ASIC. Knowing exactly which world each construct belongs to is the honesty skill this course keeps practicing.',
    prerequisites: ['vlog-m12-l2'],
    explanation:
      'A **ROM** is a memory with no write port. Two RTL forms:\n\n1. **Case-decoded (combinational):** the address indexes a case statement returning constants — pure combinational logic; the synthesizer builds a decoder (or maps small ones to LUTs).\n2. **Array + initialization:** declare the array and load constants once ($readmemh in simulation; FPGA flows often accept initial-block or file-based BRAM init). No write port exists.\n\n**$readmemh("file.hex", mem);** loads an array from a text file of hex words — a simulation workhorse for test vectors and ROM images. HONEST LABELING: in portable/ASIC RTL it is simulation-only. FPGA flows commonly extend synthesis to accept $readmemh/initial values for block RAM initialization (because configuration streams can load BRAM contents), but that is a vendor capability, not a Verilog-2001 guarantee — this course marks every such use and keeps the portable path case-decoded ROMs or explicit reset-time loads.\n\n**Portability checklist for memory RTL:** declare width/depth explicitly; write with the canonical clocked pattern; read with the style you intend (async/sync, module 12-l2); initialize via case-ROMs for portability or labeled $readmemh for simulation; never rely on array contents at power-up without an init story (ASIC arrays power up unknown); document collision semantics when ports can collide.',
    deepDive:
      '### The case ROM as the portable answer\n\n```\nalways @* begin\n    case (addr)\n        4\'d0: q = 8\'h7E;   // e.g. a sin table entry\n        4\'d1: q = 8\'h22;\n        ...\n        default: q = 8\'h00;\n    endcase\nend\n```\n\nThis synthesizes everywhere, to logic (small) or to BRAM-with-init (large, at the tool’s discretion). Its cost is verbosity for big tables — which is exactly when you switch to $readmemh and accept the labeled portability boundary, or generate the case code with a script (professional practice: scripts emit case-ROMs from data files, keeping the RTL portable).\n\n### What actually loads FPGA memories\n\nThree mechanisms, in increasing portability: (1) initial blocks / declaration initializers — accepted by most FPGA synthesizers for BRAM/LUTRAM init; rejected or ignored in ASIC flows; (2) $readmemh in an initial block — the same class, common for BRAM init from .hex/.mem files; (3) vendor attributes/cores (e.g. explicit RAM primitives with INIT parameters) — fully supported but vendor-specific. ASIC reality: no mechanism — on-chip arrays power up unknown and rely on reset/write-before-read discipline or dedicated NVM. The course rule stands: label every initialization line with its world (sim-only / FPGA-specific).',
    examples: [
      {
        title: 'Case-decoded ROM (portable) — a 16-entry sine-style table',
        language: 'verilog',
        code:
          '// rom_case.v — combinational ROM, 16 x 8, portable RTL\nmodule rom_case(\n    input  wire [3:0] addr,\n    output reg  [7:0] q\n);\n    always @* begin\n        case (addr)\n            4\'d0:  q = 8\'h80;   // table midpoint\n            4\'d1:  q = 8\'hB1;\n            4\'d2:  q = 8\'hDB;\n            4\'d3:  q = 8\'hF6;\n            4\'d4:  q = 8\'hFF;\n            4\'d5:  q = 8\'hF6;\n            4\'d6:  q = 8\'hDB;\n            4\'d7:  q = 8\'hB1;\n            4\'d8:  q = 8\'h80;\n            4\'d9:  q = 8\'h4F;\n            4\'d10: q = 8\'h25;\n            4\'d11: q = 8\'h0A;\n            4\'d12: q = 8\'h01;\n            4\'d13: q = 8\'h0A;\n            4\'d14: q = 8\'h25;\n            4\'d15: q = 8\'h4F;\n            default: q = 8\'h00;  // unreachable (4 bits) but mandatory style\n        endcase\n    end\nendmodule',
        explanation: [
          'Pure combinational: q follows addr with no clock — a 16:1 mux in hardware (or LUT mapping at the tool’s discretion).',
          'The table values form a quarter-wave-style pattern (peaks at addr 4, trough at 12) — real tables come from scripts or spreadsheets, pasted in as case items.',
          'default exists even though a 4-bit address cannot miss: template consistency (module 06-l2).',
          'This is the PORTABLE form: valid Verilog-2001, synthesizes identically in any tool, no file dependencies.',
          'Trace: addr=4 → q=8\'hFF; addr=12 → q=8\'h01.',
        ],
      },
      {
        title: 'Array ROM with $readmemh (labeled: simulation; FPGA init is vendor-specific)',
        language: 'verilog',
        code:
          '// rom_mem.v — array ROM with file init\n// PORTABILITY LABEL: $readmemh in an initial block is SIM-ONLY in\n// portable RTL. FPGA flows often accept it for BRAM init; ASIC does not.\nmodule rom_mem(\n    input  wire       clk,\n    input  wire [4:0] addr,\n    output reg  [7:0] q\n);\n    reg [7:0] rom [0:31];\n\n    // SIM/FPGA-INIT ONLY (labeled): load 32 words from rom_init.hex\n    initial begin\n        $readmemh("rom_init.hex", rom);\n    end\n\n    always @(posedge clk) begin\n        q <= rom[addr];        // registered read: BRAM shape (module 12-l2)\n    end\n\nendmodule\n\n// rom_init.hex (text file, one word per line):\n// 80\n// B1\n// DB\n// ...\n// (32 lines total; comments with // are permitted in the file)',
        explanation: [
          'No write port exists: the array is loaded once by $readmemh and only read afterwards — the ROM discipline.',
          'The registered read gives the BRAM-shaped timing: addr presented before edge n → q valid after edge n (module 12-l2 latency contract).',
          'PORTABILITY LABEL in the header: $readmemh/initial is simulation-standard; FPGA synthesis tools commonly accept it for memory init; ASIC flows do not. For a fully portable table, use the case-ROM form.',
          'The hex file lists one word per line; comments (//) and underscores are allowed. A missing/short file leaves unloaded entries x in simulation — the tool warns; treat it as an error.',
          'Trace (assuming the file loaded the case-ROM values above): addr=4 presented before an edge → q = 8\'hFF one cycle later.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Initialization worlds: sim, FPGA, ASIC',
        content:
          '  +----------------+-------------------------------------------+\n  | World          | How array contents exist at power-up      |\n  +----------------+-------------------------------------------+\n  | Simulation     | $readmemh / initial blocks (always work)  |\n  | FPGA           | bitstream loads BRAM: initial/$readmemh   |\n  |                | accepted by most vendor synth flows       |\n  | ASIC           | NOTHING — arrays power up unknown;        |\n  |                | use case-ROM logic or write-before-read   |\n  +----------------+-------------------------------------------+\n\n  Portable RTL: case-decoded ROMs (logic) or explicit reset loading.\n  Labeled convenience: $readmemh (sim; FPGA init per vendor docs).',
        caption:
          'The same array declaration means different things in different worlds — label every initialization line with its world.',
      },
    ],
    tables: [
      {
        caption: 'ROM implementation choices',
        headers: ['Form', 'Init mechanism', 'Portable?', 'Best for'],
        rows: [
          ['Case-decoded', 'constants in the case', 'Yes — fully', 'Small/medium tables, any target'],
          ['Array + $readmemh', 'hex file via initial', 'Sim; FPGA init per vendor', 'Large tables, simulation benches'],
          ['Array + vendor core', 'tool-specific attributes/IP', 'No — vendor-specific', 'Production FPGA flows'],
        ],
      },
      {
        caption: 'Memory RTL portability checklist',
        headers: ['Item', 'Portable form'],
        rows: [
          ['Declaration', 'Explicit width/depth; comment the dimensions'],
          ['Write', 'Clocked mem[addr] <= din under we'],
          ['Read', 'Chosen style (async/sync) with latency documented'],
          ['Init', 'case-ROM (portable) or labeled $readmemh (sim/FPGA)'],
          ['Power-up', 'Never assume contents without an init story'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Treating $readmemh as a portable synthesis construct in ASIC-targeted RTL.',
        fix:
          'It is simulation-standard; FPGA BRAM-init support is a vendor extension. Mark it (comment label) and keep the portable path (case-ROM) for logic that must synthesize everywhere.',
      },
      {
        mistake: 'Reading a ROM entry before the file loaded (or with a wrong path), getting x and debugging "the ROM is broken".',
        fix:
          'The simulator errors/warns on missing files; a SHORT file leaves later entries x. Check the load (file exists, line count = depth) and add a testbench assertion that no ROM word is x.',
      },
      {
        mistake: 'Assuming ASIC memory powers up with your init values.',
        fix:
          'ASIC arrays have no init mechanism: contents are unknown at power-up. Provide reset/write-before-read discipline or use logic-ROMs for true constants.',
      },
    ],
    guidedPractice: {
      title: 'Portability triage',
      brief:
        'For each design, choose the ROM form and justify: (1) a 256-entry sine table in an ASIC filter; (2) a 16-entry ASCII hex-digit map in a portable FPGA/ASIC library; (3) a 4096-entry coefficient table in an FPGA product, loaded per build.',
      expectedBehavior:
        '(1) Case-ROM is impractical at 256 entries by hand — generate the case code by script (portable), or accept vendor-specific init with a label; ASIC reality: no file init. (2) Case-ROM — small, portable, no files. (3) Array + $readmemh/initial (FPGA init, labeled) — per-build data is exactly what file-init is for.',
      hints: [
        'Portability requirement? target? size?',
        'Scripts can generate case-ROMs — file-free AND portable.',
      ],
    },
    practiceExercises: [
      {
        title: 'Seven-segment ROM from module 06',
        brief:
          'Re-express the module 06 seg7 decoder as an explicit case-ROM statement about its hardware (what does it synthesize to?), and give q for digit=9.',
        expectedBehavior:
          'The seg7 case IS a case-ROM: a 16:1 mux (or LUT mapping) with constant data. digit=9 hits default → q = 7\'b0000001 (per that lesson’s table).',
        hints: [
          'Case-decoded ROMs and case decoders are the same construct — only the intent differs.',
          'Check the module 06 table for the default row.',
        ],
      },
      {
        title: 'ROM x-scan assertion',
        brief:
          'Write a testbench snippet (sim-only, labeled) that after loading a 32-entry ROM checks every word for x and reports the first bad index.',
        expectedBehavior:
          'SIM-ONLY: initial begin : scan integer i; #1; for (i = 0; i < 32; i = i + 1) if (^rom[i] === 1\'bx) begin $display("ROM word %0d is x", i); disable scan; end end — the block is NAMED (: scan) so disable can stop at the first bad word; the ^reduction === 1\'bx test detects any unknown bit. initial, #, $display and the loop are all sim-only.',
        hints: [
          'A word is fully known iff its XOR-reduction is 0 or 1 (not x).',
          'Label the block: initial + $display = simulation-only.',
        ],
      },
    ],
    assessment: {
      title: 'Module 12 Lesson 3 checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which ROM form is fully portable across simulation and both FPGA and ASIC synthesis?',
          options: [
            'Case-decoded combinational ROM',
            'Array with $readmemh in an initial block',
            'Vendor RAM core with INIT parameters',
            'Register file with hardcoded values',
          ],
          answer: 'Case-decoded combinational ROM',
          explanation:
            'Constants in a case are plain Verilog-2001: every simulator and synthesizer handles them. File-based init is sim-standard and vendor-dependent for synthesis.',
          hint: 'Which form has no file or tool dependencies?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'true-false',
          prompt: 'In ASIC design, on-chip arrays can be initialized at power-up with $readmemh.',
          answer: 'false',
          explanation:
            '$readmemh is a simulation construct; ASIC silicon has no such mechanism — arrays power up unknown. ASIC designs use logic-ROMs or write-before-read discipline.',
          hint: 'Is there any hardware that loads your hex file?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'output-prediction',
          prompt: 'rom_mem (registered read): addr=4 presented before edge n; the loaded table has 8\'hFF at word 4. What is q after edge n?',
          code:
            'always @(posedge clk)\n    q <= rom[addr];\n// addr=4 stable; rom[4]=8\'hFF',
          options: ["8'hFF", "8'h00", 'x', 'previous q'],
          answer: "8'hFF",
          explanation:
            'Registered read: the edge captures rom[addr] = FF; q updates just after edge n. (Before that edge, q held its old value — the 1-cycle latency contract.)',
          hint: 'The read register samples at the edge.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'A $readmemh file contains only 20 lines for a 32-entry ROM. What do entries 20-31 hold in simulation?',
          options: ['x (never loaded)', '0', 'The first entry repeated', 'A compile error'],
          answer: 'x (never loaded)',
          explanation:
            'Only listed entries load; the rest stay uninitialized (x). A short file is a verification hazard — scan for x after loading.',
          hint: 'What were those entries before the load?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Write the one-line ROM read for a case-free array ROM with registered output (statement only).',
          answer: 'q <= rom[addr];',
          explanation:
            'The registered array read inside a clocked block — the ROM version of the module 12-l2 sync-read pattern (and the BRAM inference shape).',
          hint: 'Nonblocking, inside always @(posedge clk).',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'ROM', definition: 'Read-only memory: constant contents, no write port; case-decoded or initialized array.' },
      { term: '$readmemh', definition: 'Simulation system task loading an array from a hex text file; FPGA-init capable per vendor; not ASIC.' },
      { term: 'Case-ROM', definition: 'Combinational case statement returning constants — the fully portable ROM form.' },
      { term: 'Memory initialization worlds', definition: 'Sim (files always work), FPGA (bitstream-loaded init), ASIC (nothing — unknown at power-up).' },
      { term: 'Portability label', definition: 'A comment marking constructs that live outside portable RTL (sim-only, FPGA-specific).' },
    ],
    revisionSummary: [
      'Case-ROMs are the portable constant-memory form; array+file init is labeled sim/FPGA-only.',
      '$readmemh loads one hex word per line; short files leave x — scan after loading.',
      'Registered array reads give the BRAM-shaped ROM with a 1-cycle latency contract.',
      'ASIC arrays power up unknown: no init mechanism exists in silicon.',
      'Label every init line with its world — the honesty habit this course enforces.',
    ],
    furtherReading: [
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
      { label: 'Wikipedia — Read-only memory', url: 'https://en.wikipedia.org/wiki/Read-only_memory', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
