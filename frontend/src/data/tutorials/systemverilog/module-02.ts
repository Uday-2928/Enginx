import type { TutorialLesson } from '../types';

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'sv-m02-l1',
    title: 'typedef and enum: State Machines Without Magic Numbers',
    summary:
      'Give names to bit patterns: typedef creates your own types, enum makes state encodings self-documenting and type-checked, and the two together delete a whole family of RTL bugs.',
    objectives: [
      'Replace localparam state encodings with a typedef enum and explain what new error the tool can now catch.',
      'Choose an explicit base and width for an enum (logic [1:0]) instead of relying on the default int.',
      'Explain why assigning a non-enum value to an enum variable requires a cast, and why that restriction is a feature.',
      'Read and write a two-process FSM in SystemVerilog using enum states.',
    ],
    whyItMatters:
      'State machines are where Verilog code becomes unreadable: every branch compares a register against a bare number, and a typo in one localparam can silently alias two states. Enums make states real values with real names and real type checking. This is the single highest-value design-subset feature for day-to-day RTL work, and it is also the vocabulary you need before classes and constraints make sense later in this course.',
    prerequisites: [
      'sv-m01-l2: logic as the default signal type',
      'The FSM coding style from the Verilog course (state register + next-state logic)',
    ],
    explanation:
      '**typedef** declares a name for an existing type: `typedef logic [7:0] byte_t;` makes `byte_t` a synonym you can use in ports, signals and struct fields. By itself it is pure readability — same bits, better code reviews. Its real power arrives when combined with **enum**.\n\nAn **enum** declares a named set of constants and a variable type whose values are restricted to that set. Compare the two ways to write a UART state machine. Verilog-2001:\n\n```\nlocalparam IDLE = 2\'d0, START = 2\'d1, DATA = 2\'d2, STOP = 2\'d3;\nreg [1:0] state, next;\n```\n\nNothing stops `state = 2\'d3 + 2\'d1;` (wrapping to IDLE by accident) or a comparison against a typo like `STARt`. SystemVerilog:\n\n```\ntypedef enum logic [1:0] {IDLE, START, DATA, STOP} uart_state_t;\nuart_state_t state, next;\n```\n\nNow state and next can hold only those four named values. Assigning an arbitrary 2-bit value — for example from an un-cast expression — is a type error in a standard-conforming tool, and `$display("%s", state.name())` prints the state name in waveforms and logs. Two details matter for RTL correctness. **First, always give an explicit base:** `enum logic [1:0] {...}` makes the encoding a 4-state 2-bit vector; a bare `enum {A, B}` uses the 2-state `int` type, which silently converts x to 0 and can hide reset bugs. **Second, out-of-range values need an explicit cast:** if reset must force a defined state, assign a named state like IDLE; if you truly must force a bit pattern (a fault-injection test, for instance), write `state = uart_state_t\'(2\'b01);` and reviewers can see the escape hatch.\n\nThe standard coding pattern is the same two-process FSM you already know: a sequential process that does `state <= next;` and a combinational process that computes `next` from `state` and inputs — but now written with `always_ff` and `always_comb`, and with readable state names in every branch.',
    deepDive:
      '### What the type checker actually buys you\n\nThe concrete bug enum prevents: two engineers add states independently. Engineer A appends `ERR = 4` to a localparam list; engineer B has meanwhile added their own `ERR = 4` meaning something else, or reorders the list and shifts every following encoding. With localparams the tool is silent. With an enum in one typedef, the states live in exactly one declaration, duplicate names are compile errors, and any code path that tries to shove a raw integer into the state register is flagged. Simulation waveforms display the symbolic name (`DATA` instead of `2`), which turns debugging from table-lookup into reading.\n\n### Encoding choices still matter\n\nenum is about names; synthesis still cares about the encoding. `enum logic [1:0] {S0, S1, S2, S3}` gives binary encoding 00, 01, 10, 11. For a 4-state machine with heavy safety requirements you might still want one-hot encoding, which you can request explicitly: `enum logic [3:0] {S0 = 4\'b0001, S1 = 4\'b0010, S2 = 4\'b0100, S3 = 4\'b1000}`. Named values with explicit assignments give you one-hot with all the type safety. Some synthesis tools re-encode states on their own; if yours does, the enum base width is a floor, not a promise.\n\n### Enum methods and the details worth knowing\n\nEvery enum variable carries built-in methods: `.name()` returns the label string, `.num()` the element count, and `.next`/`.prev` step through values (returning the default first value when running off the end). The default first value of any enum is its first label with value 0 — so if your reset state is not first, say so explicitly in the declaration (`{RUN = 1, IDLE = 0, ...}`) or better, order the declaration so the reset state is first. Also note enum variables compare with `==` exactly as you expect against named values; what is *forbidden* is silently mixing enum types — comparing a uart_state_t against a different enum is a type error, which is precisely the aliasing bug class this feature exists to kill.\n\n### Tool support honesty\n\ntypedef and enum are core design-subset features and are supported by all three tool families in our honesty table (Icarus with some limitations on corners such as enum method usage in all contexts, Verilator, commercial). If the platform grader rejects a specific enum corner, the concept still stands and the construct will run on a full simulator; check the Icarus manual for the exact release you are using.',
    examples: [
      {
        title: 'Before: localparam FSM with the classic aliasing risk',
        language: 'verilog',
        code:
        '// Verilog-2001: FSM via localparam — legal, but untyped\nmodule fsm_v(\n    input  wire clk,\n    input  wire rst_n,\n    input  wire go,\n    input  wire done,\n    output reg  busy\n);\n    localparam IDLE  = 2\'d0,\n               LOAD  = 2\'d1,\n               RUN   = 2\'d2,\n               FLUSH = 2\'d3;\n\n    reg [1:0] state, next;\n\n    always @(posedge clk or negedge rst_n)\n        if (!rst_n) state <= IDLE;\n        else        state <= next;\n\n    always @(*) begin\n        next  = state;            // default: stay\n        busy  = (state != IDLE);\n        case (state)\n            IDLE:  if (go)   next = LOAD;\n            LOAD:  next = RUN;\n            RUN:   if (done) next = FLUSH;\n            FLUSH: next = IDLE;\n            default: next = IDLE;   // 2-bit reg can hold 0..3, so this\n        endcase                     // catches nothing that enum would\n    end\nendmodule',
        explanation: [
          'state is a bare 2-bit reg: any 2-bit value is assignable, including values produced by arithmetic accidents.',
          'The four localparams live in the module; a second FSM in the same file cannot reuse the names without renaming.',
          'Waveforms show raw numbers (0..3), so every debug session starts with a lookup table.',
        ],
      },
      {
        title: 'After: the same FSM with a typed enum',
        language: 'systemverilog',
        code:
        '// SystemVerilog: typed states — same hardware, checked intent\ntypedef enum logic [1:0] {IDLE, LOAD, RUN, FLUSH} fsm_state_t;\n\nmodule fsm_sv(\n    input  logic clk,\n    input  logic rst_n,\n    input  logic go,\n    input  logic done,\n    output logic busy\n);\n    fsm_state_t state, next;\n\n    always_ff @(posedge clk or negedge rst_n)\n        if (!rst_n) state <= IDLE;      // named state, no cast needed\n        else        state <= next;\n\n    always_comb begin\n        next = state;                   // default: stay\n        busy = (state != IDLE);\n        case (state)\n            IDLE:  if (go)   next = LOAD;\n            LOAD:  next = RUN;\n            RUN:   if (done) next = FLUSH;\n            FLUSH: next = IDLE;\n        endcase\n    end\nendmodule',
        explanation: [
          '`typedef enum logic [1:0] {...} fsm_state_t;` declares the type once, outside the module, so other modules and the testbench can reuse it.',
          'state and next are fsm_state_t: assigning a raw 2-bit expression to them is a type error unless you cast it explicitly.',
          'The explicit base `logic [1:0]` keeps the encoding 4-state and 2 bits wide; a bare enum would default to 2-state int.',
          'IDLE is the first label, so its value is 0 and it is the natural reset target; the case is now complete with no unreachable default needed.',
          'Waveform viewers and $display("%s", state.name()) print IDLE/LOAD/RUN/FLUSH instead of 0..3.',
        ],
      },
      {
        title: 'The cast: legal escape hatch when you need raw values',
        language: 'systemverilog',
        code:
        '// SystemVerilog: explicit casts make value smuggling visible\nmodule cast_demo;\n    typedef enum logic [2:0] {A0, A1, A2, A3, A4, A5, A6, A7} trio_t;\n    trio_t s;\n    logic [2:0] raw;\n\n    initial begin\n        s = A3;                      // OK: named value of the right type\n        // s = 3\'d5;                 // ERROR: cannot assign raw int to enum\n        raw = 3\'d5;\n        s  = trio_t\'(raw);           // OK: explicit cast, reviewer sees it\n        $display("state=%0d name=%s", s, s.name()); // 5, A5\n    end\nendmodule',
        explanation: [
          'The commented line shows the forbidden move: an un-cast raw value into an enum variable. A standard-conforming tool rejects it.',
          'The cast `trio_t\'(raw)` is the sanctioned escape hatch for fault injection, gray-code interop, or reading a state from a register dump.',
          'Because the cast is visible in the code, every raw-value crossing is a reviewed decision instead of an accident.',
          '$display traces to: state=5 name=A5 — s holds A5, whose value is 5.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'state',
        title: 'The example FSM: states are now typed values',
        content:
        '              +------+  go   +------+      +-----+  done  +-------+\n              | IDLE | ----> | LOAD | ---> | RUN | ------> | FLUSH |\n              +------+       +------+      +-----+         +-------+\n                ^  ^                                         |     |\n                |  +-----------------------------------------+     |\n                |                  (FLUSH -> IDLE)                 |\n                +--------------------------------------------------+\n                                  (IDLE stays IDLE when go=0;\n                                   RUN stays RUN when done=0)\n\n  Encoding (enum logic [1:0]): IDLE=00 LOAD=01 RUN=10 FLUSH=11',
        caption:
          'The same diagram you drew in Verilog, but every arc now connects typed, named, waveform-readable values.',
      },
    ],
    tables: [
      {
        caption: 'localparam vs typedef enum for FSM states',
        headers: ['Property', 'localparam (Verilog-2001)', 'typedef enum (SystemVerilog)'],
        rows: [
          ['Variable type', 'Plain reg [n-1:0], accepts any value', 'Restricted to the named set'],
          ['Raw value assigned by accident', 'Silent', 'Compile error (cast required)'],
          ['Two FSMs sharing state names', 'Manual renaming or parameter tricks', 'One shared typedef in a package'],
          ['Waveform display', 'Raw numbers', 'Symbolic state names'],
          ['Default underlying type', 'N/A', 'int (2-state) unless you specify logic [n-1:0]'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Writing `typedef enum {IDLE, RUN, DONE} state_t;` with no base type.',
        fix: 'The default base is int, a 2-state type: an x in the state register silently becomes 0 (IDLE). Always write `typedef enum logic [n-1:0] {...}` so the encoding matches the real 4-state register.',
      },
      {
        mistake: 'Forgetting that the first enum label has value 0 and making a different state the reset state without thinking.',
        fix: 'Either order the declaration with the reset state first, or assign values explicitly (`{RUN = 1, IDLE = 0}`). Then reset assigns the named state — never a raw number.',
      },
      {
        mistake: 'Doing arithmetic on enum variables (`state + 1`) to advance a sequence.',
        fix: 'Arithmetic on enums defeats the type system and can produce unassigned values. Advance with named transitions (`next = RUN;`) or, if a cyclic walk is genuinely needed, use the built-in .next method and understand its wrap behavior.',
      },
    ],
    guidedPractice: {
      title: 'Type the traffic-light FSM',
      brief:
        'Write the typedef enum for a traffic controller with states MAIN_GREEN, MAIN_YELLOW, SIDE_GREEN, SIDE_YELLOW, then declare the state/next variables and write only the sequential block (reset to MAIN_GREEN, otherwise state <= next).',
      starterCode:
        '// Starter: fill in the typedef and declarations\ntypedef enum /* base and labels */ state_t;\n\nmodule traffic(\n    input  logic clk,\n    input  logic rst_n,\n    input  logic /* ... */\n);\n  // declare state, next here\nendmodule',
      expectedBehavior:
        'A correct answer includes: typedef enum logic [1:0] {MAIN_GREEN, MAIN_YELLOW, SIDE_GREEN, SIDE_YELLOW} state_t; then state_t state, next; and an always_ff with reset assigning MAIN_GREEN by name. MAIN_GREEN gets encoding 00 because it is first.',
      hints: [
        'Four states need a 2-bit base: logic [1:0].',
        'The reset state should be the first label so it encodes to 00.',
        'Reset assigns the named value MAIN_GREEN — no cast, no raw number.',
      ],
    },
    practiceExercises: [
      {
        title: 'Name the bug class',
        brief:
          'A Verilog FSM uses localparam S1 = 0, S2 = 1, S3 = 2 and a 2-bit state reg. During simulation, state holds value 3 for one cycle and the machine recovers via the default branch. Explain how a typed enum changes both the likelihood and the visibility of this event.',
        expectedBehavior:
          'With an enum, a raw 3 (an un-cast value outside the named set) cannot reach the state variable except through a visible cast, so the event becomes unlikely; if a cast is used deliberately, waveforms and .name() make it visible as a symbol rather than a mystery number.',
        hints: [
          'Where did the 3 come from? Enum types restrict assignment sources.',
          'What does a waveform show for an enum variable?',
          'Distinguish prevention (type checking) from diagnosability (names).',
        ],
      },
      {
        title: 'One-hot with names',
        brief:
          'Rewrite the fsm_sv typedef for one-hot encoding of the same four states, choosing the base width and explicit values. State how wide the state register becomes and why the reset value still needs no cast.',
        expectedBehavior:
          'typedef enum logic [3:0] {IDLE = 4\'b0001, LOAD = 4\'b0010, RUN = 4\'b0100, FLUSH = 4\'b1000} fsm_state_t; The register is 4 bits; reset assigns IDLE by name, so no cast is involved anywhere.',
        hints: [
          'One-hot means exactly one bit set per state.',
          'The base must be logic [3:0] to hold four distinct one-hot patterns.',
          'Named values in the declaration are still enum members: assignment by name stays legal.',
        ],
      },
    ],
    assessment: {
      title: 'typedef and enum checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which declaration gives a 4-state, 2-bit-wide enum suitable for RTL state registers?',
          options: [
            'typedef enum {A, B, C, D} state_t;',
            'typedef enum logic [1:0] {A, B, C, D} state_t;',
            'typedef enum int {A, B, C, D} state_t;',
            'typedef logic [1:0] state_t;',
          ],
          answer: 'typedef enum logic [1:0] {A, B, C, D} state_t;',
          explanation:
            'The explicit base logic [1:0] makes the encoding 4-state and 2 bits wide. The bare and int versions are 2-state (x becomes 0), and the last line is not an enum at all.',
          hint: 'Which base type keeps x/z semantics?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'bug-identification',
          prompt: 'A tool rejects this line. What is the cleanest correct replacement?',
          code: 'typedef enum logic [1:0] {IDLE, RUN, DONE} state_t;\nstate_t s;\nlogic [1:0] raw = 2\'d2;\n...\ns = raw;   // rejected',
          options: [
            's = 2\'d2;',
            's = state_t\'(raw);',
            'Make raw an int and assign directly',
            'Remove the typedef and use localparam',
          ],
          answer: 's = state_t\'(raw);',
          explanation:
            'The cast is the standard-sanctioned way to move a raw vector into an enum variable, and it keeps the crossing visible to reviewers. Assigning 2\'d2 directly is the same type error.',
          hint: 'You want the raw value but with an explicit, visible conversion.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In `typedef enum logic [1:0] {IDLE, LOAD, RUN, FLUSH} t;` the value of RUN is 2.',
          answer: 'true',
          explanation:
            'Labels without explicit values count up from 0: IDLE=0, LOAD=1, RUN=2, FLUSH=3.',
          hint: 'Enum labels auto-number starting at 0.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Which built-in enum method returns the symbolic name of the current value as a string?',
          answer: 'name()',
          explanation:
            's.name() returns the label of the current value, which makes logs and waveforms readable without a lookup table.',
          hint: 'It is called exactly what it does.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'typedef', definition: 'A declaration that gives an existing type a new name, used for readability and reuse.' },
      { term: 'enum', definition: 'A type whose values are a named set of constants, with assignment restricted to that set.' },
      { term: 'Base type (of an enum)', definition: 'The underlying storage type; specify logic [n-1:0] for RTL to keep 4-state semantics.' },
      { term: 'Cast', definition: 'An explicit conversion, written type\'(value); required to move raw vectors into enum variables.' },
      { term: 'One-hot encoding', definition: 'A state encoding with exactly one bit set per state, expressible with explicit enum values.' },
    ],
    revisionSummary: [
      'typedef names types; enum turns magic state numbers into typed, named, checked values.',
      'Always write enum with an explicit 4-state base: typedef enum logic [n-1:0] {...} name_t;',
      'First label = value 0; put the reset state first or assign values explicitly.',
      'Raw values cross into enums only through a visible cast type\'(value).',
      'name() prints symbolic states; waveforms become self-annotating.',
    ],
    furtherReading: [
      { label: 'Wikipedia — SystemVerilog (enums)', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
      { label: 'Wikipedia — Finite-state machine', url: 'https://en.wikipedia.org/wiki/Finite-state_machine', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'sv-m02-l2',
    title: 'Packed Structs and the Two Kinds of Arrays',
    summary:
      'Group related bits into a packed struct that still behaves like one vector, and finally get straight about packed versus unpacked arrays and where each one belongs.',
    objectives: [
      'Define a packed struct for a bus request and predict its bit width from its fields.',
      'Convert between a packed struct and a flat vector with casts and explain when that is useful.',
      'Distinguish packed from unpacked arrays and pick the right one for vectors, memories and register arrays.',
      'Use $bits to keep width arithmetic honest in code and testbenches.',
    ],
    whyItMatters:
      'Real designs move records, not bits: a bus transaction is address plus data plus control. Verilog flattens everything to vectors and every engineer re-derives the slicing by hand — the source of endless off-by-one bugs. Packed structs let you name the fields while keeping the flat-vector view for ports and interfaces, and the packed/unpacked array distinction decides how your memories synthesize. These two ideas show up in literally every SystemVerilog codebase you will read.',
    prerequisites: [
      'sv-m02-l1: typedef as a way to name types',
      'Verilog vector declarations and memory arrays (reg [7:0] mem [0:255])',
    ],
    explanation:
      'A **packed struct** is a struct whose fields occupy contiguous bits, making the whole struct usable anywhere a vector of the same width is usable: as a port, on a wire, in an assign, or sliced. Declare one like this:\n\n```\ntypedef struct packed {\n    logic        valid;\n    logic [7:0]  addr;\n    logic [15:0] data;\n} bus_req_t;\n```\n\nFields are packed **most-significant field first** as written: valid is the leftmost bit, then addr, then data. The total width is 1 + 8 + 16 = **25 bits**, and `$bits(bus_req_t)` returns exactly 25. Because the layout is defined, you can assign a whole struct from a vector with a cast (`req = bus_req_t\'(flat_vector);`) or assign the vector from the struct the same way — both views stay consistent by construction, which is the entire point. All fields of a packed struct must be packed types (logic, packed structs, packed arrays); a field like `logic req [0:3]` (unpacked) is not allowed inside.\n\nArrays split into two families, and mixing them up is the top beginner syntax error. A **packed array** is declared *before* the name and models a vector: `logic [7:0] vec;` is a packed array of 8 one-bit elements — bits that are physically adjacent. An **unpacked array** is declared *after* the name and models a collection of elements: `logic mem [0:255];` is 256 separate logic elements — the classic memory, where each entry can be addressed but the whole set is not one vector. You combine both: `logic [7:0] mem [0:255];` is 256 entries of 8 bits each — the standard RTL memory idiom. Packed dimensions synthesize to adjacent bits; unpacked dimensions synthesize to addressable storage (or to replicated registers, depending on tool and target).\n\nA final honesty note: typedef/struct/array syntax is design-subset material and is broadly supported, including by Icarus for the common forms used here. As always, the exact release you run decides the corners.',
    deepDive:
      '### The struct-to-vector round trip\n\nWhy keep the flat view at all? Three practical reasons: module ports in legacy code take vectors; interface payloads are often sent as flat words; and testbenches print hex. The cast makes the round trip exact: if `flat` is 25 bits, `req = bus_req_t\'(flat);` fills valid with flat[24], addr with flat[23:16], data with flat[15:0] — mirroring the declaration order. The reverse cast is equally exact. Because both views derive from one declaration, changing the struct (say, widening addr to 12 bits) updates every width automatically; the Verilog version of the same change touches every slice expression in every file, which is how slicing bugs are born.\n\n### Width checking as a habit\n\nSystemVerilog gives you `$bits(T)` for the width of any type or expression. Use it instead of hand-computed constants: `if ($bits(flat) != $bits(bus_req_t)) $error(...)` in a testbench is a self-maintaining width assertion. This matters more with structs than with plain vectors because field widths evolve over the life of a design, and a mismatch between a struct and the flat bus it rides on is otherwise a silent bug.\n\n### Choosing array kinds deliberately\n\nUse packed dimensions for things that are *one value*: a datapath word, a CRC, a concatenated header. Use unpacked dimensions for things that are *many values addressed individually*: a memory (`logic [7:0] mem [0:1023]`), a file of registers, a FIFO storage array, or a scoreboard history in testbench code. Also worth knowing: SystemVerilog allows `logic [7:0] mem [256];` (size-only) which means indices 0..255, and true dynamic/associative arrays exist for verification code — but for RTL synthesis stick to fixed-size unpacked arrays with constant bounds.\n\n### Packed unions, briefly\n\nThe sibling construct is the packed union: several views of the *same* bits, for example a 32-bit word viewed as one `logic [31:0]`, as four bytes, or as a struct with flag fields. Hardware-wise it is pure renaming of wires (no multiplexer), which makes it legitimate for register views. Use it sparingly in RTL — a union whose views disagree in interpretation is a readability hazard — but recognize it when reading other people\'s register-file code.',
    examples: [
      {
        title: 'A packed struct bus request, both views',
        language: 'systemverilog',
        code:
        '// SystemVerilog: one declaration, two consistent views\ntypedef struct packed {\n    logic        valid;   // bit 24 (first field = most significant)\n    logic [7:0]  addr;    // bits 23:16\n    logic [15:0] data;    // bits 15:0\n} bus_req_t;\n\nmodule struct_demo(\n    input  logic [24:0] flat_in,   // legacy vector interface\n    output logic [24:0] flat_out\n);\n    bus_req_t req, rsp;\n\n    always_comb begin\n        req           = bus_req_t\'(flat_in); // vector -> struct view\n        rsp           = req;                 // copy whole record at once\n        rsp.data      = req.data + 16\'d1;    // field access, no slicing\n        flat_out      = 25\'(rsp);            // struct -> vector view\n    end\nendmodule',
        explanation: [
          'The struct is 25 bits total: valid (1) + addr (8) + data (16). Fields pack from the first-declared (most significant) downward.',
          '`bus_req_t\'(flat_in)` reinterprets the flat vector through the struct layout — valid becomes flat_in[24], addr flat_in[23:16], data flat_in[15:0].',
          'Whole-record copies (`rsp = req`) and field writes (`rsp.data = ...`) are both legal; no bit-range arithmetic anywhere.',
          '`25\'(rsp)` casts back to the flat view for the legacy output port.',
        ],
      },
      {
        title: 'Packed vs unpacked arrays in one module',
        language: 'systemverilog',
        code:
        '// SystemVerilog: packed dimension (before name) vs unpacked (after)\nmodule arrays_demo(\n    input  logic        clk,\n    input  logic        we,\n    input  logic [7:0]  wdata,\n    input  logic [2:0]  waddr,\n    output logic [7:0]  rdata,\n    output logic        parity_of_word\n);\n    logic [7:0] vec;             // PACKED: 8 adjacent bits, one value\n    logic [7:0] mem [0:7];       // UNPACKED: 8 entries x 8 bits (a memory)\n\n    always_ff @(posedge clk) begin\n        vec <= wdata;                    // whole-vector operation\n        if (we) mem[waddr] <= wdata;     // per-entry operation\n        rdata <= mem[waddr];\n    end\n\n    // vec[2:0] is a legal slice (adjacent bits).\n    // mem[2:0] is NOT legal: unpacked entries are not adjacent bits.\n    assign parity_of_word = ^vec;   // reduction-XOR over the packed vector\nendmodule',
        explanation: [
          '`logic [7:0] vec` packs 8 bits into one addressable value; slicing (vec[2:0]) and reductions (^vec) work because the bits are adjacent.',
          '`logic [7:0] mem [0:7]` is the standard memory: entries are selected by index (mem[waddr]) but the collection has no vector semantics.',
          'The commented line is the classic error: mem[2:0] is illegal because unpacked dimensions are not bit ranges.',
          'Synthesis view: vec is one 8-bit register; mem is eight 8-bit registers (or a memory macro if the tool maps it).',
        ],
      },
      {
        title: '$bits keeps width claims honest',
        language: 'systemverilog',
        code:
        '// SystemVerilog: let the tool compute widths\ntypedef struct packed {\n    logic       req;\n    logic [3:0] id;\n    logic [10:0] offset;\n} pkt_t;\n\nmodule width_check;\n    pkt_t p;\n    logic [15:0] bus;\n\n    initial begin\n        // Widths: req(1) + id(4) + offset(11) = 16\n        $display("bits(pkt_t)=%0d bits(bus)=%0d", $bits(pkt_t), $bits(bus));\n        p = pkt_t\'(16\'hBEEF);            // OK: widths match exactly\n        // bus = p;                      // also OK: same width\n        $display("req=%0d id=%0d offset=%0d", p.req, p.id, p.offset);\n    end\nendmodule',
        explanation: [
          '$bits(pkt_t) prints 16 and $bits(bus) prints 16 — the cast below is width-legal.',
          'Tracing 16\'hBEEF = 1011_1110_1111_1111: req = 1 (bit 15), id = 0111 (bits 14:11 = 7), offset = 10_1111_1111 (bits 10:0 = 1535).',
          'The two $display lines output: "bits(pkt_t)=16 bits(bus)=16" then "req=1 id=7 offset=1535".',
          'If a teammate widens id to 5 bits, $bits(pkt_t) becomes 17 and the cast line becomes a width error — the mismatch surfaces at compile time, not in the lab.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Bit layout of bus_req_t (25 bits)',
        content:
        '   bit:    24      23 ........ 16      15 ................. 0\n        +------+---------------------+------------------------+\n        |valid |     addr [7:0]      |       data [15:0]      |\n        +------+---------------------+------------------------+\n           ^           ^                        ^\n     first field   second field            third field\n   (most significant)\n\n  flat vector [24:0]  <---cast--->  bus_req_t struct view\n  Both views describe THE SAME 25 wires. Changing the struct\n  updates every width and slice automatically.',
        caption:
          'A packed struct is a named slicing of one contiguous vector; the declaration order fixes the layout.',
      },
    ],
    tables: [
      {
        caption: 'Packed vs unpacked dimensions',
        headers: ['Property', 'Packed (before the name)', 'Unpacked (after the name)'],
        rows: [
          ['Declaration', 'logic [7:0] vec;', 'logic mem [0:255]; / logic [7:0] mem [0:255];'],
          ['Models', 'One value: adjacent bits', 'A collection of individually addressed entries'],
          ['Legal ops', 'Slices, concatenation, reductions, arithmetic', 'Indexing single entries; no vector ops'],
          ['Synthesis view', 'One register / bus of n bits', 'n registers or a memory array'],
          ['Inside a packed struct', 'Allowed', 'Forbidden'],
          ['Typical use', 'Datapath words, headers, struct fields', 'Memories, register files, testbench storage'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Putting an unpacked array (or an unpacked struct) as a field inside a packed struct.',
        fix: 'Packed structs may contain only packed types: logic, packed arrays, and other packed structs. If you need an unpacked member, the outer type must be an unpacked struct, which loses the vector view.',
      },
      {
        mistake: 'Assuming struct fields pack in declaration order from bit 0 upward.',
        fix: 'The FIRST declared field is the MOST significant. valid in the example is bit 24, not bit 0. Trace one cast by hand once, and write the bit positions as comments in the declaration.',
      },
      {
        mistake: 'Writing mem[2:0] to read three memory entries at once.',
        fix: 'Unpacked arrays are indexed one entry at a time (mem[2], mem[3], ...). If you need sub-range semantics, either loop over indices or reconsider whether the data should be a packed vector.',
      },
    ],
    guidedPractice: {
      title: 'Design a packet struct',
      brief:
        'Declare a packed struct frame_t with fields: start (1 bit), length (6 bits), payload (32 bits), crc (8 bits). State its total width, the bit range of each field, and write the cast that fills it from a flat logic [46:0].',
      starterCode:
        'typedef struct packed {\n    // fields here\n} frame_t;',
      expectedBehavior:
        'Total width 1+6+32+8 = 47 bits. Layout: start = bit 46, length = bits 45:40, payload = bits 39:8, crc = bits 7:0. Fill with: frame_t f = frame_t\'(flat47); where flat47 is logic [46:0]. $bits(frame_t) returns 47.',
      hints: [
        'First field is most significant; add the widths in order.',
        'Check: 46 down to 46 is one bit for start; length occupies 45:40.',
        'The cast syntax is frame_t\'(flat).',
      ],
    },
    practiceExercises: [
      {
        title: 'Predict the struct contents',
        brief:
          'Using bus_req_t from the first example (valid, addr[7:0], data[15:0]), what do req.valid, req.addr and req.data hold after req = bus_req_t\'(25\'h1_55_AA_55)? Work the bits out by hand before answering.',
        expectedBehavior:
          '25\'h1_55_AA_55 = 1_0101_0101_1010_1010_0101_0101 (25 bits). valid = 1 (bit 24). addr = bits 23:16 = 0101_0101 = 8\'h55. data = bits 15:0 = 1010_1010_0101_0101 = 16\'hAA55.',
        hints: [
          'Write the hex as binary with bit 24 on the left.',
          'valid is exactly bit 24.',
          'addr takes the next 8 bits; data the remaining 16.',
        ],
      },
      {
        title: 'Fix the memory declaration',
        brief:
          'A teammate wrote `logic mem [7:0] [0:255];` intending an 8-entry memory of bytes. Explain what was actually declared, then write the correct declaration for a 256-entry memory of 8-bit words and the statement that reads entry 37.',
        expectedBehavior:
          'As written it declares 8 unpacked dimensions of 256 entries each of 1-bit logic — not the intent. Correct: logic [7:0] mem [0:255]; read with rdata = mem[37]; (or mem[8\'d37]).',
        hints: [
          'Which dimensions are packed (before the name) here?',
          'The word width belongs before the name.',
          'Index count goes after the name.',
        ],
      },
    ],
    assessment: {
      title: 'Structs and arrays checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does $bits(frame_t) print, given start(1), length(6), payload(32), crc(8)?',
          code: 'typedef struct packed {\n    logic        start;\n    logic [5:0]  length;\n    logic [31:0] payload;\n    logic [7:0]  crc;\n} frame_t;\n...\n$display("%0d", $bits(frame_t));',
          options: ['47', '48', '46', '32'],
          answer: '47',
          explanation: 'Packed width is the sum of the field widths: 1 + 6 + 32 + 8 = 47.',
          hint: 'Add the field widths; there is no alignment padding.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which declaration is a 64-entry memory of 16-bit words?',
          options: [
            'logic [63:0] mem [15:0];',
            'logic [15:0] mem [0:63];',
            'logic [15:0] mem;',
            'logic mem [15:0] [0:63];',
          ],
          answer: 'logic [15:0] mem [0:63];',
          explanation:
            'The packed dimension (before the name) is the word width 16; the unpacked dimension (after) is the entry count 64. Option 1 is a 16-entry memory of 64-bit words — reversed.',
          hint: 'Word width goes before the name; entry count goes after.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In a packed struct, the first declared field occupies the most significant bits.',
          answer: 'true',
          explanation:
            'Fields pack contiguously from the first-declared (leftmost/most significant) downward, mirroring how packed arrays count from the left.',
          hint: 'Think of the struct as one vector written left to right.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'multiple-choice',
          prompt: 'Which operation is ILLEGAL on the unpacked array `logic [7:0] mem [0:255];`?',
          options: [
            'mem[37] = 8\'hFF;',
            'rdata = mem[addr];',
            'x = mem[255:248];',
            'if (mem[0] == 8\'h00) ...',
          ],
          answer: 'x = mem[255:248];',
          explanation:
            'Unpacked entries are separate elements, not adjacent bits, so sub-range slicing of the unpacked dimension is illegal. Indexed single-entry access is exactly what unpacked arrays are for.',
          hint: 'Which dimension can be sliced: packed or unpacked?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Packed struct', definition: 'A struct with contiguous-bit fields, usable anywhere a vector of the same total width is usable.' },
      { term: 'Unpacked struct', definition: 'A struct without the packed keyword; members may be unpacked, but there is no defined bit layout.' },
      { term: 'Packed array', definition: 'Dimensions declared before the identifier; adjacent bits forming one vector value.' },
      { term: 'Unpacked array', definition: 'Dimensions declared after the identifier; a collection of individually addressed elements.' },
      { term: '$bits', definition: 'SystemVerilog system function returning the width in bits of a type or expression.' },
    ],
    revisionSummary: [
      'Packed structs give named fields with a guaranteed flat-vector view; first field = most significant.',
      'Cast between struct and vector views with type\'(value); widths must match.',
      'Packed dimension (before name) = one vector; unpacked (after name) = addressed entries.',
      'Standard memory idiom: logic [W-1:0] mem [0:N-1]; slices only exist in the packed dimension.',
      '$bits(T) replaces hand-computed widths and keeps casts self-checking.',
    ],
    furtherReading: [
      { label: 'Wikipedia — SystemVerilog', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
      { label: 'Wikipedia — Memory (register file context)', url: 'https://en.wikipedia.org/wiki/Register_file', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'sv-m02-l3',
    title: 'Packages: Shared Types Across the Whole Design',
    summary:
      'Move typedefs, enums, structs and parameters into packages so DUT and testbench share one source of truth — and get a first look at parameterized types.',
    objectives: [
      'Declare a package containing types and parameters and import it where needed.',
      'Explain why a package beats `include and duplicated typedefs for shared types.',
      'Use a parameterized module whose data type is a package-defined type.',
      'Describe how a testbench and DUT share one transaction definition through a package.',
    ],
    whyItMatters:
      'The moment two files need the same type — a bus struct, an FSM enum, a width parameter — you have a decision: duplicate the code (and let the copies drift), `include a fragment (and fight macro ordering), or use the tool designed for the job. Packages are that tool. They are also the unit of organization in every professional codebase and every UVM environment, so the import syntax you learn here is the same one you will use forever.',
    prerequisites: [
      'sv-m02-l1: typedef and enum',
      'sv-m02-l2: packed structs',
      'Verilog parameters from the RTL methodology course',
    ],
    explanation:
      'A **package** is a named compilation unit that holds declarations: types (typedef/enum/struct), parameters, functions and tasks. You declare it once in its own file:\n\n```\npackage bus_pkg;\n  parameter int ADDR_W = 8;\n  parameter int DATA_W = 16;\n\n  typedef logic [ADDR_W-1:0] addr_t;\n  typedef logic [DATA_W-1:0] data_t;\n\n  typedef enum logic [1:0] {OP_RD, OP_WR, OP_NOP, OP_BURST} op_t;\n\n  typedef struct packed {\n    logic   valid;\n    op_t    op;\n    addr_t  addr;\n    data_t  data;\n  } req_t;\nendpackage\n```\n\nEvery other file brings the names in with `import bus_pkg::*;` (import everything) or `import bus_pkg::req_t;` (import one name). After the import, `req_t` is just a type you can use in ports, signals and testbench classes. The declarations inside the package are **shared, not copied**: there is exactly one definition of req_t in the design, so the DUT, the monitor and the scoreboard literally cannot disagree about the layout — the failure mode that duplicated typedefs guarantee.\n\nNote the discipline: package files compile **before** the modules that use them (list them first in your compile order / filelist), and a package should contain only self-contained declarations — no signals, no hierarchy references. If a package needs constants from elsewhere, those constants should live in a more fundamental package it imports.\n\nThe second half of this lesson introduces **parameterized types** lightly. Verilog parameters already parameterize widths; SystemVerilog lets a parameter stand for a *type* itself: `module fifo #(parameter type T = logic [7:0]) (...)`. Combined with a package-defined type as the default argument, one FIFO implementation can store bytes, requests or whole structs — `fifo #(.T(bus_pkg::req_t))` — with width matching enforced by the type system instead of by review vigilance.',
    deepDive:
      '### package vs `include vs duplication\n\nDuplication is the enemy you already know: two copies of a struct definition drift when one is edited, and the bug appears only when the DUT and monitor disagree in simulation — an annoying, late, confusing failure. `include of a shared typedef fragment improves on duplication but inherits preprocessor problems: macro order, re-inclusion guards, and no scope (everything lands in the global namespace). Packages fix both: they are real language scope (names must be imported or fully qualified as bus_pkg::req_t), they compile once, and they can contain parameters, functions and tasks in addition to types. The rule of thumb used across the industry: **anything two files need goes in a package**.\n\n### Import styles and namespace hygiene\n\n`import pkg::*;` is convenient but re-exports every name into your file, which can collide with local names. `import pkg::req_t;` imports exactly one name — verbose but explicit. A common professional style: wildcard-import in testbench code for convenience, targeted imports in reusable RTL where name collisions are costlier. You can always fully qualify (`bus_pkg::op_t`) without importing at all; that is the safest form for a single use.\n\n### How this feeds the testbench architecture\n\nModule 04 builds class-based testbenches, and every one of them starts the same way: a package defines the transaction type, then the generator, driver, monitor and scoreboard all import it. That shared definition is what makes it possible for the driver to consume what the generator produces and for the scoreboard to check what the monitor observes. When you later read UVM code, you will see the same shape at larger scale — sequence items in packages, imported everywhere. Learning packages now is learning the connective tissue of the whole methodology.\n\n### Tool support honesty\n\nPackages are core design-subset material. Icarus supports packages including parameters, typedefs and functions for the common usage shown here; Verilator and commercial tools fully support them. Compile order matters everywhere: the package file must come before its users, or every tool will report the type as unknown — that error means ordering, not syntax.',
    examples: [
      {
        title: 'A shared package used by DUT and monitor',
        language: 'systemverilog',
        code:
        '// File: bus_pkg.sv — compile this file FIRST\npackage bus_pkg;\n  parameter int ADDR_W = 8;\n  parameter int DATA_W = 16;\n\n  typedef logic [ADDR_W-1:0] addr_t;\n  typedef logic [DATA_W-1:0] data_t;\n\n  typedef enum logic [1:0] {OP_RD, OP_WR, OP_NOP, OP_BURST} op_t;\n\n  typedef struct packed {\n    logic  valid;\n    op_t   op;\n    addr_t addr;\n    data_t data;\n  } req_t;\nendpackage',
        explanation: [
          'One file owns the types and the width parameters; ADDR_W and DATA_W feed the typedefs, so widths have a single source of truth.',
          'req_t composes earlier types (op_t, addr_t, data_t) — packages compose like libraries.',
          'Width of req_t: 1 + 2 + 8 + 16 = 27 bits ($bits(req_t) returns 27).',
          'Compile order rule: bus_pkg.sv is compiled before any file that imports it.',
        ],
      },
      {
        title: 'The DUT imports the package instead of redefining types',
        language: 'systemverilog',
        code:
        '// File: bus_slave.sv — compiled after bus_pkg.sv\nimport bus_pkg::*;\n\nmodule bus_slave(\n    input  logic clk,\n    input  logic rst_n,\n    input  req_t req,          // the shared struct, not a local copy\n    output logic ack\n);\n    addr_t captured_addr;\n\n    always_ff @(posedge clk or negedge rst_n) begin\n        if (!rst_n) begin\n            ack           <= 1\'b0;\n            captured_addr <= \'0;\n        end else begin\n            ack <= req.valid && (req.op == OP_WR);\n            if (req.valid && (req.op == OP_WR))\n                captured_addr <= req.addr;\n        end\n    end\nendmodule',
        explanation: [
          '`import bus_pkg::*;` makes req_t, op_t, addr_t and the OP_* constants visible; the module then reads like a specification.',
          'The port `input req_t req` uses the shared type directly — no flat vector, no slicing, no local duplicate of the layout.',
          'OP_WR is the named enum constant from the package; comparing req.op against it is a typed comparison, not a magic-number check.',
          "`'0` fills captured_addr with all zeros regardless of width — safer than writing a width-specific constant that must be edited if ADDR_W changes.",
        ],
      },
      {
        title: 'A parameterized type: one FIFO, many payloads',
        language: 'systemverilog',
        code:
        '// SystemVerilog: parameter TYPE (design-subset feature; support varies\n// by tool — illustrative if your simulator rejects it)\nmodule fifo #(\n    parameter type T    = logic [7:0],\n    parameter int  DEPTH = 8\n)(\n    input  logic clk,\n    input  logic rst_n,\n    input  logic push,\n    input  T     wdata,\n    input  logic pop,\n    output T     rdata,\n    output logic full,\n    output logic empty\n);\n    T mem [0:DEPTH-1];\n    logic [$clog2(DEPTH)-1:0] wptr = 0, rptr = 0;\n    logic [$clog2(DEPTH):0]   cnt  = 0;\n\n    always_ff @(posedge clk or negedge rst_n) begin\n        if (!rst_n) begin wptr <= 0; rptr <= 0; cnt <= 0; end\n        else begin\n            if (push && !full) begin mem[wptr] <= wdata; wptr <= wptr + 1; end\n            if (pop && !empty) rptr <= rptr + 1;\n            cnt <= cnt + (push && !full ? 1 : 0) - (pop && !empty ? 1 : 0);\n        end\n    end\n    assign full  = (cnt == DEPTH);\n    assign empty = (cnt == 0);\n    assign rdata = mem[rptr];\nendmodule',
        explanation: [
          '`parameter type T` lets the caller choose the stored type: logic [7:0] by default, or bus_pkg::req_t for a FIFO of whole requests.',
          'Every internal declaration that mentions the payload (T mem, input T, output T) follows the parameter automatically — width bugs are structurally impossible.',
          '$clog2(DEPTH) computes pointer width (3 bits for DEPTH=8) and cnt gets one extra bit to represent full.',
          'This is intentionally a simple (non-decoupled) FIFO for teaching the type parameter; real FIFOs add the usual pointer-decoupling and flag-timing care.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'One package, many consumers',
        content:
        '                    +---------------------------+\n                    |  bus_pkg.sv  (package)    |\n                    |  ADDR_W, DATA_W params    |\n                    |  addr_t, data_t, op_t     |\n                    |  req_t (packed struct)    |\n                    +------------+--------------+\n                                 |\n          compiled first, imported by every consumer\n          +-------------+-------------+-------------+\n          v             v             v             v\n    +-----------+  +-----------+  +-----------+  +-------------+\n    | bus_slave |  |  master   |  |  monitor  |  | scoreboard  |\n    |  (DUT)    |  |  (DUT)    |  |   (TB)    |  |    (TB)     |\n    +-----------+  +-----------+  +-----------+  +-------------+\n\n  There is exactly ONE definition of req_t. A layout change is a\n  one-file edit, and every consumer recompiles against it.',
        caption:
          'Packages make the type system the place where interface agreements live, instead of hoping duplicated code stays in sync.',
      },
    ],
    tables: [
      {
        caption: 'Sharing declarations: the three options compared',
        headers: ['Approach', 'Drift risk', 'Scope control', 'Can hold params/functions'],
        rows: [
          ['Duplicate typedef in each file', 'High — copies edited separately', 'None', 'N/A'],
          ['`include shared fragment', 'Medium — single copy, but global namespace and macro-order issues', 'None (preprocessor)', 'Yes, but as text'],
          ['package + import', 'None — single compiled definition', 'Yes — names imported or qualified', 'Yes'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Compiling the module files before the package file.',
        fix: 'Packages must be compiled before any file that imports them. Put package files at the top of the filelist; an "unknown type" error on a type you just wrote is almost always compile order.',
      },
      {
        mistake: 'Defining the same type in a package AND again locally "just in case".',
        fix: 'Two definitions with the same name is exactly the drift problem packages exist to kill. Delete the local copy and import the package version everywhere.',
      },
      {
        mistake: 'Putting signals, always blocks or hierarchy references inside a package.',
        fix: 'A package holds type, parameter, function and task declarations only. Signals belong in modules and interfaces; a package with signals is a sign the design actually wants an interface or another module.',
      },
    ],
    guidedPractice: {
      title: 'Build a uart_pkg',
      brief:
        'Write a package uart_pkg containing: parameter DATA_BITS = 8; typedef data_t for that width; typedef enum logic [1:0] {UART_IDLE, UART_START, UART_DATA, UART_STOP} state_t; and a packed struct tx_req_t {logic valid; data_t data;}. State the width of tx_req_t.',
      starterCode:
        'package uart_pkg;\n  // parameters, typedefs, enum, struct here\nendpackage',
      expectedBehavior:
        'package uart_pkg; parameter int DATA_BITS = 8; typedef logic [DATA_BITS-1:0] data_t; typedef enum logic [1:0] {UART_IDLE, UART_START, UART_DATA, UART_STOP} state_t; typedef struct packed {logic valid; data_t data;} tx_req_t; endpackage — tx_req_t is 1 + 8 = 9 bits wide.',
      hints: [
        'data_t must be defined before tx_req_t uses it.',
        'The enum needs the explicit 4-state base from the previous lesson.',
        'Width: 1 + DATA_BITS = 9.',
      ],
    },
    practiceExercises: [
      {
        title: 'Parameterize the FIFO over the package type',
        brief:
          'Given bus_pkg from the lesson, write the two instantiation lines that create (a) a byte FIFO and (b) a FIFO of whole bus requests, including the full parameter override for T.',
        expectedBehavior:
          '(a) fifo #(.T(logic [7:0]), .DEPTH(8)) u_fifo_b (...); (b) fifo #(.T(bus_pkg::req_t), .DEPTH(16)) u_fifo_r (...); with req_t being 27 bits wide, the second FIFO stores whole records with no width math.',
        hints: [
          'The parameter name is T and it takes a type, not a number.',
          'Use the package-qualified name bus_pkg::req_t for clarity even under a wildcard import.',
          'req_t width (27) never appears in your code — that is the point.',
        ],
      },
      {
        title: 'Diagnose the import error',
        brief:
          'A teammate compiles slave.sv before bus_pkg.sv and gets "req_t undeclared". They add a local typedef of req_t to make it compile. Identify the two problems with this fix and the correct one-sentence fix.',
        expectedBehavior:
          'Problems: (1) it hides the real issue, which is compile order — the package must be compiled first; (2) a local duplicate will silently drift from the package definition, reintroducing the exact bug class packages prevent. Correct fix: compile bus_pkg.sv first (fix the filelist), keep the import.',
        hints: [
          'What does an unknown-type error usually mean when the type clearly exists?',
          'Now count the definitions of req_t in the project.',
          'Which file must appear earlier in the build?',
        ],
      },
    ],
    assessment: {
      title: 'Packages checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What is the main guarantee a package gives you over `include of a shared typedef fragment?',
          options: [
            'Faster simulation',
            'A single compiled definition with proper language scoping',
            'Smaller gate count after synthesis',
            'It removes the need for compile-order discipline',
          ],
          answer: 'A single compiled definition with proper language scoping',
          explanation:
            'Packages compile once and their names are language-scoped (import or pkg::name). Includes are textual: same copy, but global namespace and macro-order hazards. Packages still must be compiled before their users.',
          hint: 'What problem do duplicated or textually-included definitions share?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'Given the lesson package, what is $bits(bus_pkg::req_t)?',
          code: 'typedef enum logic [1:0] {OP_RD, OP_WR, OP_NOP, OP_BURST} op_t;\ntypedef logic [7:0]  addr_t;\ntypedef logic [15:0] data_t;\ntypedef struct packed {\n    logic  valid;\n    op_t   op;\n    addr_t addr;\n    data_t data;\n} req_t;',
          options: ['26', '27', '28', '31'],
          answer: '27',
          explanation: '1 (valid) + 2 (op_t) + 8 (addr_t) + 16 (data_t) = 27 bits.',
          hint: 'Add the field widths, remembering op_t is 2 bits.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A package may contain an always_ff block driving a signal, as long as the signal is declared inside the same package.',
          answer: 'false',
          explanation:
            'Packages hold type, parameter, function and task declarations only. Procedural blocks and signals belong in modules and interfaces; packages are not hierarchy.',
          hint: 'Is a package a design element with behavior, or a container of declarations?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Write the SystemVerilog header line that declares a module fifo with a type parameter T defaulting to logic [7:0] (just the parameter part).',
          answer: '#(parameter type T = logic [7:0])',
          explanation:
            'parameter type T declares a parameter whose value is a type; the default makes fifo usable without overrides. Full form: module fifo #(parameter type T = logic [7:0]) (...);',
          hint: 'It looks like a normal parameter, but the keyword type appears.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Package', definition: 'A named compilation unit holding types, parameters, functions and tasks for sharing across files.' },
      { term: 'import', definition: 'The statement that makes package names visible in a scope, wildcard (*) or per-name.' },
      { term: 'Fully qualified name', definition: 'Referring to a package member as pkg::name without importing it.' },
      { term: 'Compile order', definition: 'The required file ordering in a build; package files must compile before importers.' },
      { term: 'parameter type', definition: 'A module parameter whose value is a data type, enabling type-generic modules.' },
    ],
    revisionSummary: [
      'Anything two files need lives in a package: types, widths, enums, helper functions.',
      'import pkg::*; for convenience or pkg::name / pkg::name for precision.',
      'Compile packages first; unknown-type errors usually mean ordering, not syntax.',
      'Shared structs in packages make DUT/TB disagreements impossible by construction.',
      'parameter type T makes one implementation serve many payload types.',
    ],
    furtherReading: [
      { label: 'Wikipedia — SystemVerilog', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
      { label: 'Icarus Verilog documentation', url: 'https://steveicarus.github.io/iverilog/', kind: 'tool' },
    ],
    estimatedMinutes: 40,
  },
];
