import type { TutorialLesson } from '../types';

export const module04Lessons: TutorialLesson[] = [
  {
    id: 'sv-m04-l1',
    title: 'Classes and Objects: Handles, Not Wires',
    summary:
      'The verification subset begins: SystemVerilog classes, constructors, and object handles — the mental shift from static hardware to dynamic objects, with an honest note on where this code can run.',
    objectives: [
      'Declare a class with properties and methods, construct an object, and call its methods.',
      'Explain the difference between an object handle and an object, and predict aliasing behavior when handles are copied.',
      'Contrast class (dynamic, simulation-time) objects with module (static, elaboration-time) instances.',
      'Use argument passing and constructors to initialize object state correctly.',
    ],
    whyItMatters:
      'Everything modern in verification — generators, drivers, scoreboards, UVM — is built out of classes. If you have only written RTL, the class layer is the one genuinely new mental model in SystemVerilog: objects are created and destroyed at run time, variables hold handles (references) rather than values, and many handles can point at one object. Debugging your first aliasing surprise is a rite of passage; this lesson makes it a five-minute one instead of a two-day one.',
    prerequisites: [
      'sv-m01-l1: the design-subset vs verification-subset split',
      'Comfortable reading Verilog tasks and functions',
    ],
    explanation:
      'A **class** is a template for objects: it declares **properties** (data the object holds) and **methods** (tasks/functions that operate on them). A class by itself occupies no memory; **new()** constructs an object — allocating the properties and running the constructor — and returns a **handle** to it. This is the crucial difference from hardware: a module instance exists from elaboration, forever, one per instantiation site. An object exists from the moment `new()` runs until the last handle to it disappears, created and discarded by your testbench at run time.\n\n```\nclass Transaction;\n  logic [7:0]  addr;\n  logic [15:0] data;\n  bit          write;\n\n  function new(logic [7:0] a = 0, logic [15:0] d = 0);\n    addr  = a;\n    data  = d;\n    write = 1;\n  endfunction\n\n  function string show();\n    return $sformatf("%s addr=%0h data=%0h", write ? "WR" : "RD", addr, data);\n  endfunction\nendclass\n\nTransaction t1, t2;         // two HANDLES, no objects yet\ninitial begin\n  t1 = new(8\'h3C, 16\'hBEEF); // object #1 constructed\n  t2 = t1;                   // NO new object: t2 aliases object #1\n  t2.addr = 8\'h01;           // visible through t1 as well\n  $display("%s", t1.show()); // WR addr=01 data=beef\nend\n```\n\nThe display line prints `WR addr=01 data=beef` — because `t2 = t1` copied the *handle*, not the object. Both names now reference the same storage. This is exactly how references behave in software languages, and it is the number-one thing that trips hardware-trained engineers, whose variables have always been independent pieces of state.\n\nAn honesty note, as flagged in Module 01: classes are verification-subset SystemVerilog. **This platform runs Icarus Verilog, which does not support class-based testbench code, so nothing in this module is runnable on the grader.** The code here is standard-correct and runs unchanged on a full simulator (Questa, VCS, Xcelium) or largely on Verilator; treat it as reading that prepares you for those environments.',
    deepDive:
      '### Handles versus values, precisely\n\nAssignment between class variables copies references. To copy the *object* you must construct a new one: either `t2 = new();` followed by copying fields, or the built-in `t2 = t1;` then `t2 = new t1;` — the **clone idiom** `new t1` constructs a new object and copies t1\'s properties shallowly (nested handles are shared, not copied — the classic shallow-copy caveat). The vocabulary matters when reading professional code: `null` means a handle that references no object; using a null handle\'s property is a run-time error; and a class variable defaults to null, never to an object.\n\n### Constructors and argument defaults\n\n`function new(...)` runs at construction and may take arguments with defaults, which is how testbenches configure transactions at creation (`Transaction t = new(addr, data)`). Unlike C++ there is no delete: an object with zero handles is garbage-collected by the simulator. Methods come in two flavors that matter later: `function` for zero-time methods (used by randomize, printing, compare) and `task` for time-consuming ones (driving signals). A method that must be overridable by subclasses is declared `virtual` — the polymorphism keyword you will meet properly in more advanced material; recognizing the word in UVM code is enough for now.\n\n### Why classes at all, given tasks and modules exist\n\nVerilog testbenches are written with tasks, initial blocks and module-level state, and they work — for one test, one stimulus shape. The ceiling shows when you need N configurable stimulus sources, a checker whose parameters vary per test, or a monitor reused across tests. Tasks cannot be created at run time, cannot hold per-instance data beyond static locals, and cannot be organized into inheritance hierarchies. Classes give you: creation at run time (a generator that builds transactions in a loop), per-object state (each transaction remembers its own address), and reuse through extension. The layered testbench in the next lesson is simply the architecture that falls out of those three abilities.\n\n### What classes are NOT\n\nClasses do not synthesize. There is no hardware equivalent of a class object; they exist only in simulation. You will sometimes see beginners attempt to use classes in RTL "for neatness" — it does not compile in synthesis. Also, class objects cannot directly touch signals: a class has no position in the design hierarchy, which is exactly the problem **virtual interfaces** solve (lesson 3 of this module).',
    examples: [
      {
        title: 'A first class: construct, alias, and the aliasing surprise',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — NOT runnable on this platform;\n// requires a full SystemVerilog simulator.\nclass Transaction;\n  logic [7:0]  addr;\n  logic [15:0] data;\n  bit          write;\n\n  function new(logic [7:0] a = 0, logic [15:0] d = 0);\n    addr  = a;\n    data  = d;\n    write = 1;\n  endfunction\n\n  function string show();\n    return $sformatf("%s addr=%0h data=%0h",\n                     write ? "WR" : "RD", addr, data);\n  endfunction\nendclass\n\nmodule tb;\n  Transaction t1, t2, t3;\n  initial begin\n    t1 = new(8\'h3C, 16\'hBEEF);  // object A constructed\n    t2 = t1;                    // handle copy: t2 and t1 -> object A\n    t2.addr = 8\'h01;            // writes object A\n    $display("t1: %s", t1.show()); // WR addr=01 data=beef  (A changed!)\n\n    t3 = new t1;                // SHALLOW CLONE: new object B, fields copied\n    t3.addr = 8\'hFF;            // writes object B only\n    $display("t1: %s", t1.show()); // WR addr=01 data=beef  (unchanged)\n    $display("t3: %s", t3.show()); // WR addr=ff data=beef\n  end\nendmodule',
        explanation: [
          '`Transaction t1, t2;` declares handles initialized to null — no objects exist yet.',
          '`t1 = new(...)` constructs object A with the constructor arguments; `t2 = t1` copies the handle so both names alias A.',
          'First display traces to: "t1: WR addr=01 data=beef" — the change through t2 is visible via t1.',
          '`t3 = new t1;` is the clone idiom: object B is constructed and fields are copied from A, so the t3 change does not affect A.',
          'Second and third displays trace to: "t1: WR addr=01 data=beef" and "t3: WR addr=ff data=beef".',
        ],
      },
      {
        title: 'Objects are created at run time: a loop of transactions',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — illustrative on this platform\nclass Transaction;\n  logic [7:0]  addr;\n  logic [15:0] data;\n  bit          write;\n  function new(bit w = 1, logic [7:0] a = 0, logic [15:0] d = 0);\n    write = w; addr = a; data = d;\n  endfunction\n  function string show();\n    return $sformatf("%s addr=%0h data=%0h",\n                     write ? "WR" : "RD", addr, data);\n  endfunction\nendclass\n\nmodule gen_demo;\n  Transaction t;\n  initial begin\n    // This is impossible with module instances: 8 objects, one variable.\n    for (int i = 0; i < 8; i++) begin\n      t = new(1, i[7:0], i[7:0] * 16\'h11);\n      $display("gen %0d: %s", i, t.show());\n    end\n    // After the loop only the last object is reachable: the previous\n    // handles are gone, so the simulator may reclaim the objects.\n  end\nendmodule',
        explanation: [
          'Each loop iteration constructs a fresh object and the single handle t moves to it — run-time creation, impossible for module instances which exist only from elaboration.',
          'Trace of iteration i: addr = i, data = i * 0x11; e.g. i=2 prints "gen 2: WR addr=02 data=22" (2*0x11 = 0x22).',
          'Objects unreachable from any handle are garbage-collected: storage management is the simulator job, not yours.',
          'This generate-then-consume loop is the seed of the generator/driver structure in the next lesson.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Handles and objects: what each assignment does',
        content:
        '   Transaction t1, t2, t3;     t1   t2   t3      (handles = arrows)\n        |            |\n        v            v\n   [ object A ]  [ object B ]          (objects = boxes)\n\n   t1 = new(...)        t1 -> A\n   t2 = t1              t1 -> A,  t2 -> A     (alias: one box, two arrows)\n   t2.addr = 1          A.addr = 1             (visible via BOTH handles)\n   t3 = new t1          t3 -> B,  B fields copied from A\n   t3.addr = 8\'hFF      B.addr = 0xFF          (A untouched)\n\n   Module world (contrast): every instance is its own box,\n   created at elaboration, impossible to create in a loop.',
        caption:
          'The handle model: variables point at objects; assignment moves arrows, cloning builds new boxes.',
      },
    ],
    tables: [
      {
        caption: 'Module instances vs class objects',
        headers: ['Property', 'Module instance', 'Class object'],
        rows: [
          ['Created', 'At elaboration (compile/ elab time)', 'At run time by new()'],
          ['Count', 'One per instantiation site', 'Any number, dynamic'],
          ['Named access', 'Hierarchical path (u_dut.mem)', 'Only through handles'],
          ['Lives in hierarchy', 'Yes — can touch signals directly', 'No — needs a virtual interface'],
          ['Synthesizes', 'Yes', 'No'],
          ['Data type of variable', 'The signal itself', 'A handle (reference) to the object'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Expecting t2 = t1 to copy the transaction so that later changes stay independent.',
        fix: 'That statement copies the handle; both variables now reference one object. Use new t1 (shallow clone) or construct a fresh object when you need an independent copy.',
      },
      {
        mistake: 'Using a class handle without constructing it (forgot new()), then reading properties.',
        fix: 'Class variables start as null. Calling methods or reading properties on a null handle is a run-time error. Check for null or ensure construction happens before use.',
      },
      {
        mistake: 'Trying to access DUT signals directly from class code (t.valid = bus.valid).',
        fix: 'Class objects have no position in the hierarchy and cannot see signals. Route access through a virtual interface handle (lesson 3) or through the static testbench wrapper.',
      },
    ],
    guidedPractice: {
      title: 'Predict the displays',
      brief:
        'Using the Transaction class from this lesson, predict the exact output of this sequence: t1 = new(8\'h10, 16\'h00AA); t2 = t1; t2.write = 0; t3 = new t1; t3.data = 16\'hFFFF; then display t1, t2, t3 with show().',
      starterCode:
        '// Reuse the Transaction class from example 1.\n// Fill in the expected output as comments, then (on a full simulator)\n// run and compare. On this platform, trace by hand.\nTransaction t1, t2, t3;\ninitial begin\n  t1 = new(8\'h10, 16\'h00AA);\n  t2 = t1;\n  t2.write = 0;\n  t3 = new t1;\n  t3.data = 16\'hFFFF;\n  $display("1: %s", t1.show());\n  $display("2: %s", t2.show());\n  $display("3: %s", t3.show());\nend',
      expectedBehavior:
        't2 aliases t1, so flipping t2.write flips t1.write too: line 1 prints "1: RD addr=10 data=00aa". Line 2 is the same object: "2: RD addr=10 data=00aa". t3 is an independent clone made BEFORE t3.data changed, so line 3 prints "3: RD addr=10 data=ffff" — note write was already 0 at clone time because the clone happened after t2.write = 0.',
      hints: [
        'The clone copies the fields as they are at clone time.',
        'Write flips through the alias affect the original object.',
        'data=00AA as hex prints as 00aa with %0h.',
      ],
    },
    practiceExercises: [
      {
        title: 'Write a Packet class',
        brief:
          'Write a class Packet with properties: dest (4 bits), payload (32 bits), tag (3 bits), and a constructor with defaults (dest=0, payload=0, tag=0), plus a show() method returning the three fields. Then write the two statements that create a packet and a clone.',
        expectedBehavior:
          'class Packet; logic [3:0] dest; logic [31:0] payload; logic [2:0] tag; function new(...); endfunction; function string show(); ... endfunction endclass — create with Packet p = new(4\'h5, 32\'hDEAD_BEEF, 3\'d2); clone with Packet q = new p;',
        hints: [
          'Follow the Transaction template exactly.',
          '$sformatf builds the show() return string.',
          'The clone idiom is two words: new plus the source handle.',
        ],
      },
      {
        title: 'Explain the garbage-collection moment',
        brief:
          'In the gen_demo loop, after the loop ends, how many Transaction objects can your testbench still reach? What happens to the others? Why is this different from eight module instances?',
        expectedBehavior:
          'Exactly one (the last, via t). The others have no handles and become collectable garbage — the simulator may reclaim them. Module instances are static: eight instantiations give eight permanent instances created at elaboration, unreachable-never.',
        hints: [
          'One handle variable survives the loop.',
          'What does the simulator do with objects no handle references?',
          'Module instances are created when?',
        ],
      },
    ],
    assessment: {
      title: 'Classes and objects checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'After `a = new(); b = a; b.x = 5;` what does a.x return?',
          options: ['0 (a keeps its old object)', '5', 'null', 'A run-time error occurs'],
          answer: '5',
          explanation:
            'b = a copies the handle, so both variables reference the same object; writing through b is visible through a.',
          hint: 'Assignment between class variables moves arrows, not contents.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which statement constructs a NEW object that is a field-by-field copy of the object referenced by t1?',
          options: ['t2 = t1;', 't2 = new;', 't2 = new t1;', 't2.copy(t1);'],
          answer: 't2 = new t1;',
          explanation:
            'The clone idiom `new t1` constructs a fresh object and shallow-copies the fields. `t2 = t1` only aliases; `t2 = new;` makes an empty object; the copy task is not built in.',
          hint: 'It is the clone idiom from the lesson.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A class object can read and drive DUT signals directly if the class is instantiated inside the top-level testbench module.',
          answer: 'false',
          explanation:
            'Class objects never live in the design hierarchy regardless of where their handles are declared; signal access requires a virtual interface handle or hierarchical references held by static testbench code.',
          hint: 'What is missing from a class that modules have?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What is the default value of a class variable that has not been assigned an object (one word, lowercase)?',
          answer: 'null',
          explanation:
            'Class variables initialize to null — a handle that references no object; dereferencing it is a run-time error.',
          hint: 'The same word software languages use for "no reference".',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Class', definition: 'A template declaring properties and methods from which objects are constructed at run time.' },
      { term: 'Object', definition: 'A run-time instance of a class holding its own copy of the properties.' },
      { term: 'Handle', definition: 'A reference variable that points to an object; assignment between handles aliases the same object.' },
      { term: 'Constructor (new)', definition: 'The special function run when an object is created, used to initialize properties.' },
      { term: 'Shallow clone (new t1)', definition: 'The idiom constructing a new object with fields copied from another; nested handles are shared, not deep-copied.' },
    ],
    revisionSummary: [
      'Classes are verification-subset: not runnable on this platform (Icarus), standard-correct for full simulators.',
      'Variables hold handles; assignment aliases, new t1 clones.',
      'Objects are created by new() at run time and garbage-collected when unreachable.',
      'Class objects cannot touch signals — virtual interfaces (next lesson) bridge that gap.',
      'Classes enable run-time creation, per-object state and inheritance: the three abilities layered testbenches need.',
    ],
    furtherReading: [
      { label: 'Wikipedia — SystemVerilog (class support)', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
      { label: 'Accellera — UVM (class-based methodology built on SV classes)', url: 'https://www.accellera.org/downloads/standards/uvm', kind: 'standard' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'sv-m04-l2',
    title: 'Transactions and the Layered Testbench',
    summary:
      'See how a modern testbench is organized: transactions as class objects moving through generator, driver, monitor and scoreboard — the architecture that makes verification scale.',
    objectives: [
      'Define a transaction class for a simple memory bus and explain why whole-transaction thinking beats signal wiggling.',
      'Describe the roles of generator, driver, monitor and scoreboard and the direction data flows between them.',
      'Sketch each role in a few lines of SystemVerilog and identify which roles create, consume and observe transactions.',
      'Explain why this architecture scales to thousands of tests where directed task-based testbenches do not.',
    ],
    whyItMatters:
      'This is the architecture behind every professional verification environment, including UVM. Its power is separation: stimulus creation, signal driving, observation and checking are four independent roles connected only by transaction objects. Change how you generate stimulus and the driver does not care; change the protocol timing and the scoreboard does not care. Once you can name the four roles and their interfaces, unfamiliar testbenches become readable and UVM becomes a vocabulary exercise instead of a mystery.',
    prerequisites: [
      'sv-m04-l1: classes, handles, constructors',
      'sv-m03-l2: the valid/ready handshake as the DUT-facing protocol',
    ],
    explanation:
      'A **transaction** is a class that models one complete unit of business: a memory write, a UART byte, a packet. It carries intent (`write 0x3C to address 7`) without carrying timing or pins. This abstraction is what allows the testbench to be layered: layers above the transaction think in intent; layers below translate intent into signals.\n\nThe four roles:\n\n- **Generator** — creates transactions (randomly or from a list) and sends them onward. It knows nothing about signals or timing.\n- **Driver** — receives transactions and *drives the DUT pins* to enact them: asserting valid, presenting data, waiting for ready. It is the only role that knows protocol timing on the stimulus side.\n- **Monitor** — watches the DUT interface *passively*, reconstructs transactions from observed signal activity, and publishes them. It never drives anything.\n- **Scoreboard** — receives observed transactions and checks them against expectations: a reference model, a golden memory, or invariants. It decides PASS and FAIL.\n\nData flows: generator -> driver (requests), monitor -> scoreboard (observations), and typically generator -> scoreboard (expected results) either directly or via a reference model. The connection mechanism between components is class-based communication (mailboxes in classic SV, ports/analysis in UVM — concept level here). The important structural fact is that generator, monitor and scoreboard are all protocol-agnostic at the signal level; only the driver (and the monitor\'s sampling rules) touch protocol timing.\n\nWhy does this scale where the directed task-based testbench does not? Because each concern can vary independently. Want 10,000 random transactions? Change the generator only. Want a second checking rule (e.g., no reordering)? Add it to the scoreboard only. Want to reuse the whole environment on a different DUT of the same protocol? The driver and monitor carry over. In a directed monolithic testbench every change touches the one big file, and nothing is reusable.',
    deepDive:
      '### The transaction as a contract between layers\n\nNotice what the transaction does NOT contain: no valid, no ready, no clock, no delays. Those are driver policy. This is deliberate and it is the design principle to internalize: **intent lives above, timing lives below**. When the spec changes a timing rule (say, valid must now stay stable for two cycles), the generator and scoreboard are untouched; when the verification plan adds a new address range to cover, the driver is untouched. Bugs in testbenches localize quickly because each concern has exactly one home.\n\n### Mailboxes: the classic SV connection\n\nIn plain SystemVerilog the roles communicate through `mailbox #(Transaction)` — a thread-safe FIFO of handles: the generator puts, the driver gets (blocking when empty). Monitors put observed transactions into a second mailbox; the scoreboard gets from it. This is enough machinery for small environments and makes the data flow explicit, which is why we teach it. UVM replaces mailboxes with typed ports (analysis ports) and adds configuration, factory and phasing — same data flow, more infrastructure. If you understand the mailbox version, UVM\'s version is just plumbing with better typing.\n\n### The scoreboard and the reference model\n\nA scoreboard checks by comparing observation against expectation. Expectations come from three classic sources: (1) a **reference model** — a small behavioral implementation of the DUT\'s intended function, often written in plain SV or even C; (2) a **checker bookkeeping** — invariants like "data read must equal data last written to that address"; (3) **protocol assertions** — temporal rules (Module 06). The reference-model style is the most powerful and the one to practice: your DUT and a tiny model of the *spec* see the same stimulus, and any divergence is a candidate bug. This is the class-based version of the self-checking pattern from the Digital Design Verification course — same idea, richer plumbing.\n\n### Honesty: what runs where\n\nEverything in this lesson is verification-subset SystemVerilog: mailboxes, classes, dynamic objects. **None of it runs on this platform\'s Icarus grader.** The sketches are short on purpose: they are for reading and for reproducing later on a full simulator. The concepts — roles, data flow, separation of concerns — are what transfer to every language and framework you will ever verify in, including UVM and even non-SystemVerilog setups.',
    examples: [
      {
        title: 'Transaction class for a memory bus',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — illustrative on this platform\ntypedef enum logic [1:0] {MEM_RD, MEM_WR, MEM_NOP} mem_op_t;\n\nclass MemTr;\n  rand mem_op_t    op;      // rand is a hint to randomization (Module 05)\n  rand logic [7:0] addr;\n  rand logic [15:0] wdata;\n       logic [15:0] rdata;  // filled by monitor/scoreboard side\n\n  function string show();\n    if (op == MEM_WR)\n      return $sformatf("WR a=%0h d=%0h", addr, wdata);\n    else if (op == MEM_RD)\n      return $sformatf("RD a=%0h r=%0h", addr, rdata);\n    else\n      return "NOP";\n  endfunction\nendclass',
        explanation: [
          'The transaction models intent only: operation, address, write data, and (for reads) a slot for the observed read data.',
          'No valid/ready/clock fields: protocol timing belongs to the driver, not the transaction.',
          '`rand` marks fields as randomizable; it does nothing here but becomes meaningful with randomize() in Module 05.',
          'show() gives every layer a uniform way to log transactions — indispensable when debugging failures.',
        ],
      },
      {
        title: 'Generator, driver, monitor, scoreboard: the four sketches',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — illustrative on this platform\n// vif is a virtual interface (next lesson); here we show roles only.\n\nclass Generator;\n  mailbox #(MemTr) out;\n  int n;\n  function new(mailbox #(MemTr) out, int n);\n    this.out = out; this.n = n;\n  endfunction\n  task run();\n    MemTr t;\n    repeat (n) begin\n      t = new();\n      t.op = (t.addr[0] == 0) ? MEM_WR : MEM_RD; // stand-in stimulus rule\n      t.addr = t.addr ^ 8\'h5A;                   // stand-in pattern\n      out.put(t);          // hand the intent downstream\n    end\n  endtask\nendclass\n\nclass Driver;\n  mailbox #(MemTr) in;\n  virtual bus_if vif;                  // signal access comes in lesson 3\n  function new(mailbox #(MemTr) in, virtual bus_if vif);\n    this.in = in; this.vif = vif;\n  endfunction\n  task run();\n    MemTr t;\n    forever begin\n      in.get(t);                       // block until a transaction arrives\n      @(posedge vif.clk);              // translate intent into pins:\n      vif.valid <= 1;                  //   assert valid,\n      vif.addr   <= t.addr;            //   present address,\n      vif.wr     <= (t.op == MEM_WR);  //   choose direction,\n      if (t.op == MEM_WR) vif.wdata <= t.wdata;\n      do @(posedge vif.clk); while (!vif.ready); // wait for acceptance\n      vif.valid <= 0;\n    end\n  endtask\nendclass\n\nclass Monitor;\n  mailbox #(MemTr) out;\n  virtual bus_if vif;\n  function new(mailbox #(MemTr) out, virtual bus_if vif);\n    this.out = out; this.vif = vif;\n  endfunction\n  task run();\n    MemTr t;\n    forever begin\n      @(posedge vif.clk);\n      if (vif.valid && vif.ready) begin   // transfer committed\n        t = new();\n        t.op    = vif.wr ? MEM_WR : MEM_RD;\n        t.addr  = vif.addr;\n        t.wdata = vif.wdata;             // (read data capture omitted)\n        out.put(t);                      // publish observation\n      end\n    end\n  endtask\nendclass\n\nclass Scoreboard;\n  mailbox #(MemTr) obs;\n  logic [15:0] model [0:255];            // reference: golden memory\n  int errors;\n  function new(mailbox #(MemTr) obs);\n    this.obs = obs; errors = 0;\n  endfunction\n  task run();\n    MemTr t;\n    forever begin\n      obs.get(t);\n      if (t.op == MEM_WR) model[t.addr] = t.wdata;   // update expectation\n      else if (t.op == MEM_RD) begin\n        if (t.rdata !== model[t.addr]) begin         // compare vs model\n          errors++;\n          $display("FAIL: %s expected=%0h", t.show(), model[t.addr]);\n        end\n      end\n    end\n  endtask\nendclass',
        explanation: [
          'Generator: builds n transaction objects and puts handles into a mailbox. Zero signal knowledge.',
          'Driver: gets a transaction, then performs the pin choreography — assert valid, present fields, wait for ready. The only stimulus-side protocol expert.',
          'Monitor: watches passively and reconstructs a transaction exactly on committed transfers (valid && ready). Never drives.',
          'Scoreboard: maintains a golden model array; writes on WR, compares on RD with !== (catching x). Failures are counted and logged with the transaction shown.',
          'The data flow is one-directional per mailbox: generator -> driver (requests), monitor -> scoreboard (observations).',
        ],
      },
      {
        title: 'Wiring the four roles together',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — illustrative on this platform\nmodule tb;\n  logic clk = 0, rst_n = 0;\n  always #5 clk = ~clk;\n\n  // bus_if vif(.clk(clk), .rst_n(rst_n));  // interface instance (lesson 3)\n  // dut u_dut(.vif(vif));\n\n  mailbox #(MemTr) gen2drv = new();\n  mailbox #(MemTr) mon2scb = new();\n\n  Generator  gen  = new(gen2drv, 100);\n  Driver     drv  = new(gen2drv, null /* vif */);\n  Monitor    mon  = new(mon2scb, null /* vif */);\n  Scoreboard scb  = new(mon2scb);\n\n  initial begin\n    fork\n      gen.run();\n      drv.run();\n      mon.run();\n      scb.run();\n    join_none\n    #23 rst_n = 1;\n    #10000;\n    if (scb.errors == 0) $display("TB PASSED");\n    else                 $display("TB FAILED: %0d errors", scb.errors);\n    $finish;\n  end\nendmodule',
        explanation: [
          'Two mailboxes connect the roles: gen2drv carries requests, mon2scb carries observations — the whole architecture in two lines.',
          'All four run() tasks start as concurrent threads (fork/join_none); they communicate only through mailboxes.',
          'The vif arguments are null here because virtual interfaces are the next lesson; the shape of the wiring is complete.',
          'The final PASS/FAIL summary reads the scoreboard error count — checking is centralized, not scattered through the stimulus.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The layered testbench data flow',
        content:
        '                       +-----------+\n        creates        | Generator |  intent only, no signals\n      +--------------> |           |\n      |                +-----+-----+\n      |                      | mailbox: requests (MemTr handles)\n      |                      v\n   owns                 +-----------+      drives pins      +-----+\n   expectations         |  Driver   | -------------------> | DUT |\n      |                 |           |                      +--+--+\n      |                 +-----------+                         | pins\n      |                                                        v\n      |                +-----------+   watches passively  +----+-----+\n      |                |  Monitor  | <-------------------- |  bus_if  |\n      |                |           |                       +----------+\n      |                +-----+-----+\n      |                      | mailbox: observations\n      |                      v\n      |                +-----------+\n      +--------------> | Scoreboard|  compares obs vs expectation\n        (or via        |           |  -> PASS/FAIL summary\n         reference     +-----------+\n         model)',
        caption:
          'Four roles, two mailboxes, one transaction type. Only the driver touches stimulus timing; only the monitor touches observation; only the scoreboard judges.',
      },
    ],
    tables: [
      {
        caption: 'Roles and responsibilities',
        headers: ['Role', 'Creates', 'Consumes', 'Knows protocol timing', 'Touches signals'],
        rows: [
          ['Generator', 'Transactions', 'Nothing', 'No', 'No'],
          ['Driver', 'Nothing', 'Requests', 'Yes (stimulus side)', 'Yes (drives)'],
          ['Monitor', 'Observed transactions', 'Nothing', 'Yes (sampling rules)', 'No (input-only view)'],
          ['Scoreboard', 'Expectations (reference model)', 'Observations', 'No', 'No'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Putting protocol timing (waits, valid, ready) into the generator or transaction class.',
        fix: 'Transactions carry intent only; the driver owns timing. If a transaction has a valid field or a task that waits on a clock, move that logic into the driver.',
      },
      {
        mistake: 'Letting the monitor drive or the driver observe into the scoreboard directly from pins.',
        fix: 'Monitor is input-only (a mon modport in practice) and scoreboard input is observed transactions. Keeping these disciplines is what makes components reusable and failures localizable.',
      },
      {
        mistake: 'Comparing with == on multi-bit data in the scoreboard and passing x-contaminated checks.',
        fix: 'Use !== for data comparisons in checkers so an x or z mismatch is caught. A scoreboard that cannot fail on x is not a scoreboard.',
      },
    ],
    guidedPractice: {
      title: 'Assign the change requests',
      brief:
        'For each change request, name the single role that must be modified (and why the others are safe): (a) generate 10,000 transactions instead of 100; (b) DUT now needs valid held two cycles before ready; (c) add a check that read data is never X; (d) log every transaction to a file.',
      expectedBehavior:
        '(a) Generator (count parameter only). (b) Driver (only role owning stimulus timing) and possibly the monitor sampling rule if observation timing changes. (c) Scoreboard (checking lives there; add an x-check on read data). (d) Monitor or a dedicated subscriber: it publishes observations, so logging attaches at the publication point — generator logging would only show requests, not what actually happened.',
      hints: [
        'Intent changes live above; timing changes live below.',
        'Checks belong to the scoreboard; logs of actual activity belong to the monitor side.',
        'Which role even knows the transaction count?',
      ],
    },
    practiceExercises: [
      {
        title: 'Write the UART transaction',
        brief:
          'Design a class UartTr for a UART TX byte transfer: properties data (8 bits), plus a slot for observed actual bit timing. Write show() and explain in two sentences why baud timing does NOT belong in the transaction.',
        expectedBehavior:
          'class UartTr; rand logic [7:0] data; time start_t; ... endclass with a show() via $sformatf. Timing does not belong in the transaction because intent and timing are separate layers: the driver owns baud/choreography and the monitor records actual timing; keeping them out lets the same transaction serve both.',
        hints: [
          'One UART byte = one transaction.',
          'Which role knows the baud generator?',
          'A timestamp field is fine; a timing task is not.',
        ],
      },
      {
        title: 'Find the layering violation',
        brief:
          'A teammate writes a Scoreboard that samples vif.valid and vif.data directly by virtual interface instead of receiving monitor transactions. Explain the two problems with this design.',
        expectedBehavior:
          'Problems: (1) the scoreboard now duplicates the monitor job — two samplers can disagree on commit cycles and double-count; (2) it destroys the reuse/localization benefit: changing protocol timing now requires editing the checker. Scoreboards consume observed transactions.',
        hints: [
          'Who is supposed to watch the interface?',
          'What happens when two components sample the same signals?',
        ],
      },
    ],
    assessment: {
      title: 'Layered testbench checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Which role is the only one that should know how transactions map onto signal timing on the stimulus side?',
          options: ['Generator', 'Driver', 'Monitor', 'Scoreboard'],
          answer: 'Driver',
          explanation:
            'The driver translates intent (transactions) into pin activity, so it owns stimulus-side protocol timing. The monitor owns the sampling rules on the observation side.',
          hint: 'Which one physically wiggles the DUT inputs?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A new check is needed: read data must never be X. Where does this check belong?',
          options: ['In the generator, as a constraint', 'In the driver, before driving', 'In the scoreboard, comparing with !==', 'In the transaction class'],
          answer: 'In the scoreboard, comparing with !==',
          explanation:
            'Checking is the scoreboard job, and !== catches x/z that == would miss. Generators create stimulus; drivers enact it.',
          hint: 'Which role judges PASS and FAIL?',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In the classic architecture, the monitor reconstructs transactions from observed signals and publishes them to the scoreboard.',
          answer: 'true',
          explanation:
            'That is exactly the monitor role: passive observation, transaction reconstruction, publication (via mailbox or analysis port).',
          hint: 'One role watches without driving.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'What is the name of the class-based FIFO used to connect generator to driver in plain SystemVerilog environments?',
          answer: 'mailbox',
          explanation:
            'mailbox #(T) is the thread-safe FIFO of handles used to pass transactions between components; UVM replaces it with typed ports.',
          hint: 'It holds mail (transactions) in order.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Transaction', definition: 'A class object modeling one unit of intent (write, read, packet) without protocol timing.' },
      { term: 'Generator', definition: 'The role that creates and publishes transactions for the driver.' },
      { term: 'Driver', definition: 'The role that converts transactions into pin-level activity and follows the handshake.' },
      { term: 'Monitor', definition: 'The passive role that observes signals, reconstructs transactions, and publishes them.' },
      { term: 'Scoreboard', definition: 'The checking role that compares observations against a reference model or invariants and owns PASS/FAIL.' },
      { term: 'mailbox', definition: 'SystemVerilog thread-safe FIFO of handles used to pass transactions between roles.' },
    ],
    revisionSummary: [
      'Transactions = intent (op, addr, data); timing lives in the driver, not the transaction.',
      'Four roles: generator creates, driver drives, monitor observes, scoreboard judges.',
      'Two mailboxes: requests (gen->drv) and observations (mon->scb).',
      'Each change request has exactly one natural home — that localizability is the scaling argument.',
      'All of this is verification-subset SV: illustrative here, runnable on a full simulator.',
    ],
    furtherReading: [
      { label: 'Accellera — UVM (the industrial form of this architecture)', url: 'https://www.accellera.org/downloads/standards/uvm', kind: 'standard' },
      { label: 'Wikipedia — SystemVerilog', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'sv-m04-l3',
    title: 'Virtual Interfaces: Bridging Classes to Wires',
    summary:
      'The last piece of the OOP testbench puzzle: how class code reaches real DUT signals through a virtual interface handle, and why this indirection makes environments reusable.',
    objectives: [
      'Explain why a class cannot reference signals directly and what problem virtual interfaces solve.',
      'Declare, assign and use a virtual interface handle in a class.',
      'Describe the set-and-use pattern: configure the handle once, then use it from every component.',
      'Summarize why the full OOP architecture scales where directed testbenches do not.',
    ],
    whyItMatters:
      'Everything in the previous lesson had one loose end: the driver and monitor needed a `virtual bus_if vif` and you took it on faith. This lesson closes that gap. Virtual interfaces are the hinge between the software world (classes) and the hardware world (signals), and misunderstanding them is the most common blocker when engineers first build a real class-based testbench. They are also the mechanism behind UVM config_db — recognizing vif = new from that world starts here.',
    prerequisites: [
      'sv-m04-l2: the generator/driver/monitor/scoreboard roles',
      'sv-m03-l2/l3: interfaces and modports',
    ],
    explanation:
      'The problem: classes are dynamic software objects with no position in the design hierarchy. A signal lives at a static hierarchical path (`top.bus.valid`). Module code can name that path at compile time; class code cannot, because the class does not know — and must not know — which instance it will attach to. The verification subset needs an indirect way for a class to say "the interface I was handed".\n\nThe solution is the **virtual interface**: a variable whose type is "a handle to some instance of interface X".\n\n```\nvirtual bus_if vif;          // a handle, like a class handle, but to an interface\n\ninitial begin\n  vif = tb_top.bus_if_i;     // bind to a concrete instance\n  vif.valid <= 1\'b1;         // now class code can drive/read real signals\nend\n```\n\nThree facts to internalize. **First**, a virtual interface variable starts as null, exactly like a class handle; using it before assignment is a run-time error, so environments always check `if (vif == null) $fatal(...)`. **Second**, the assignment happens at run time — typically in the test\'s build phase — which is what makes the environment reusable: the same driver class works with interface instance A in this test and instance B in that one, because the binding is data, not code. **Third**, the virtual interface can carry a **modport** (`virtual bus_if.mon vif`) so the view discipline from Module 03 extends into class code.\n\nThe set-and-use pattern: the top-level test (or environment) knows the hierarchy, does the binding once, and passes `vif` down to every component constructor — which is exactly what the previous lesson\'s constructors accepted. Components themselves never write hierarchical paths; they only use the handle they were given. That single rule is what keeps a class-based environment portable between top levels and simulators.',
    deepDive:
      '### The full chain, end to end\n\nFollow one bit from testbench to DUT: the test declares the interface instance (`bus_if vif_i(...)`) and binds it (`drv = new(mailbox, vif_i.mon);`); the driver stores it (`this.vif = vif;`); the driver task drives through the handle (`vif.valid <= 1;`); the simulator applies that to the real interface signal; the DUT connected to the interface instance responds. Every arrow is either a handle assignment or a normal connection — no hierarchical paths inside classes anywhere. When you later read UVM and see `uvm_config_db#(virtual bus_if)::set(...)` and `...get(this, "", "vif", vif)`, recognize it as this same pattern with a string-keyed database instead of constructor arguments.\n\n### null, $fatal, and the debug workflow for virtual interface bugs\n\nThe classic failure mode: `vif.valid` hangs or crashes because vif is null — almost always because the binding ran in the wrong order (use before set) or the path in the assignment was wrong (elaborated to a different/null instance). Professional code therefore checks at build time: `if (vif == null) $fatal(1, "driver: vif not set");`. When debugging such environments, look at exactly three things: where the handle is declared, where it is assigned, and whether the assigned instance is the one the DUT is connected to. That triage resolves nearly every virtual-interface problem in practice.\n\n### Why the indirection is worth it\n\nThe cost is one extra level of indirection; the payoff is that component code contains zero knowledge of the top level. Consequences: (1) the same Driver class serves multiple DUT instances in one test; (2) environments move between projects by changing only the top-level binding; (3) unit-testing a component is possible by handing it a tiny synthetic interface. This is the same reasoning as passing file handles instead of hardcoding filenames in software — indirection is what makes code reusable.\n\n### Course wrap: why OOP testbenches scale\n\nWith classes, transactions, roles and virtual interfaces you now have every mechanism the modern methodology rests on: run-time creation (a generator making ten thousand transactions), per-object state (each transaction remembers itself), separation of concerns (four roles), reuse through indirection (virtual interfaces). Directed task-based testbenches put all concerns in one file and hard-wire them to one DUT; the layered OOP testbench makes stimulus, timing, observation and checking independently variable. The next module adds the two accelerants on top: constrained randomization (let the tool write the stimulus) and functional coverage (let the tool tell you what you have verified).',
    examples: [
      {
        title: 'Declare, bind, use: the complete pattern',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — illustrative on this platform\ninterface bus_if (input logic clk, input logic rst_n);\n  logic        valid;\n  logic        ready;\n  logic [7:0]  addr;\n  logic        wr;\n  logic [15:0] wdata;\n\n  modport drv (output valid, addr, wr, wdata,\n               input  ready, clk, rst_n);\n  modport mon (input valid, ready, addr, wr, wdata, clk, rst_n);\nendinterface\n\nclass Driver;\n  virtual bus_if.drv vif;\n  function new(virtual bus_if.drv v);\n    if (v == null) $fatal(1, "Driver: null virtual interface");\n    vif = v;\n  endfunction\n  task run();\n    forever begin\n      // ... get transaction from mailbox (omitted) ...\n      @(posedge vif.clk);\n      vif.valid <= 1\'b1;          // REAL signal driven via the handle\n      vif.addr  <= 8\'h3C;\n    end\n  endtask\nendclass\n\nmodule tb_top;\n  logic clk = 0, rst_n = 0;\n  always #5 clk = ~clk;\n\n  bus_if u_if (.clk(clk), .rst_n(rst_n));   // the concrete instance\n  // dut u_dut (...);                       // connects to u_if\n\n  Driver drv;\n  initial begin\n    drv = new(u_if);        // BIND: pass the instance, not a path string\n    fork drv.run(); join_none\n    #23 rst_n = 1;\n    #500 $finish;\n  end\nendmodule',
        explanation: [
          '`virtual bus_if.drv vif` declares a handle bound later, already qualified by the drv modport so the driver class keeps its input/output discipline.',
          'The constructor checks for null immediately — the standard guard against the most common virtual-interface bug.',
          '`drv = new(u_if);` binds the class to the concrete instance at run time. The class contains no hierarchical path.',
          'Inside run(), vif.valid is the real interface signal: writes through the handle reach the DUT.',
        ],
      },
      {
        title: 'The same driver class, two DUTs',
        language: 'systemverilog',
        code:
        '// SystemVerilog (verification subset) — illustrative on this platform\nmodule tb_two_duts;\n  logic clk = 0, rst_n = 0;\n  always #5 clk = ~clk;\n\n  bus_if if_a (.clk(clk), .rst_n(rst_n));\n  bus_if if_b (.clk(clk), .rst_n(rst_n));\n  // dut_a u_a (.vif(if_a));\n  // dut_b u_b (.vif(if_b));\n\n  Driver drv_a, drv_b;\n  initial begin\n    // SAME class, two bindings: the reuse payoff of virtual interfaces\n    drv_a = new(if_a);\n    drv_b = new(if_b);\n    fork\n      drv_a.run();\n      drv_b.run();\n    join_none\n    #23 rst_n = 1;\n    #500 $finish;\n  end\nendmodule',
        explanation: [
          'One Driver class definition, two objects, each bound to a different interface instance — reuse through indirection, impossible with hard-coded hierarchical paths.',
          'If a third DUT is added, no component code changes: one more instance and one more binding line.',
          'This is precisely how UVM environments attach one agent per interface in multi-lane designs.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The binding chain from class to pin',
        content:
        '  class world                    binding                    hardware world\n  -------------------      ----------------------      ---------------------\n  Driver drv                     drv = new(u_if)\n     vif  -------------------->  (handle to instance)  ---> u_if (interface\n     ^                                                           instance)\n     |                                                             |\n     vif.valid <= 1  --(through handle)-->  u_if.valid  --------> DUT pin\n\n  Rules:\n  1. Classes never name hierarchical paths.\n  2. The test/environment knows the hierarchy and binds once.\n  3. Unbound handle = null: check and $fatal at build time.',
        caption:
          'Virtual interfaces are one extra arrow between the class and the signal — and that arrow is what makes components portable.',
      },
    ],
    tables: [
      {
        caption: 'Accessing signals: the three situations',
        headers: ['Situation', 'Mechanism', 'Notes'],
        rows: [
          ['Module to module', 'Ports / interface instance', 'Static, elaboration-time'],
          ['Module to signals of an interface', 'Hierarchical or port connection', 'Fine in static code'],
          ['Class to signals', 'virtual interface handle', 'Bound at run time; null until bound; modport-qualified views available'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using a virtual interface handle before binding it (null dereference).',
        fix: 'Bind in the build/initial phase before any run task starts, and guard constructors with `if (v == null) $fatal(...)`. The check converts a confusing run-time hang into a clear message.',
      },
      {
        mistake: 'Writing hierarchical paths inside class code (tb_top.u_if.valid = 1).',
        fix: 'That compiles in some tools but destroys reusability and breaks under different top levels. Pass the interface through the constructor or a configuration database; classes use only the handles they receive.',
      },
      {
        mistake: 'Binding to an interface instance that is not the one the DUT is connected to.',
        fix: 'The binding must reference the exact instance wired to the DUT. When stimulus seems ignored, triage the chain: declared where, assigned where, is that instance the DUT-connected one.',
      },
    ],
    guidedPractice: {
      title: 'Complete the binding',
      brief:
        'Given interface axi_if and class Master with `virtual axi_if.mst vif;`, write: (1) the constructor storing the handle with a null check; (2) the top-level lines creating an interface instance and constructing the master bound to it.',
      starterCode:
        'interface axi_if (input logic clk);\n  logic valid, ready;\n  modport mst (output valid, input ready, clk);\nendinterface\n\nclass Master;\n  virtual axi_if.mst vif;\n  // constructor here\nendclass',
      expectedBehavior:
        'function new(virtual axi_if.mst v); if (v == null) $fatal(1, "Master: null vif"); vif = v; endfunction — top level: axi_if u_if (.clk(clk)); Master m; m = new(u_if); The modport-qualified type keeps the master output-only on valid.',
      hints: [
        'Copy the Driver pattern from example 1.',
        '$fatal takes a finish argument and a message string.',
        'The binding argument is the instance name, not a string.',
      ],
    },
    practiceExercises: [
      {
        title: 'Diagnose the hang',
        brief:
          'A test starts, the driver task runs, and nothing is ever driven. The environment declares `virtual bus_if vif;` in the driver but the test never assigns it. What is the state of vif, what happens on first access, and what are the two fixes?',
        expectedBehavior:
          'vif is null. First access is a run-time error (or a silent hang depending on tool) rather than a drive. Fixes: assign before use (`drv = new(u_if);` passing the instance) or guard the constructor with a null check so the failure is loud and early.',
        hints: [
          'What does an unassigned class handle hold?',
          'Where should binding happen relative to run()?',
          'Make failures loud at build time.',
        ],
      },
      {
        title: 'Course-level synthesis',
        brief:
          'In 5-8 sentences, explain why the OOP testbench architecture scales with design size while a directed task-based testbench does not. Use the words: transaction, separation of concerns, reuse, virtual interface.',
        expectedBehavior:
          'A strong answer covers: transactions decouple intent from timing; the four roles separate concerns so each change has one home; components reuse across tests/DUTs via run-time creation and virtual interface indirection; stimulus volume (randomized generators) grows without rewriting drivers; directed TBs monolithically entangle all concerns in one static file.',
        hints: [
          'Pick one concrete change request and trace which files change in each style.',
          'Which style can run 10,000 scenarios overnight without new code?',
          'Indirection (vif) is the reuse mechanism.',
        ],
      },
    ],
    assessment: {
      title: 'Virtual interfaces checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why do classes need virtual interfaces to touch signals?',
          options: [
            'Classes are too slow to access signals directly',
            'Class objects have no position in the design hierarchy',
            'Interfaces forbid direct access for security',
            'Signals cannot be 4-state',
          ],
          answer: 'Class objects have no position in the design hierarchy',
          explanation:
            'Signals live at static hierarchical paths; classes are dynamic objects outside the hierarchy. A virtual interface is a run-time handle to an interface instance, giving class code indirect access.',
          hint: 'What does a class lack that a module instance has?',
          difficulty: 'medium',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What is the value of a virtual interface variable before it is bound to an instance?',
          options: ['x', '0', 'null', 'It is a compile error to declare it unbound'],
          answer: 'null',
          explanation:
            'Like class handles, virtual interface variables default to null; use before assignment is a run-time failure, which is why constructors check for null.',
          hint: 'Same default as a class handle.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A single driver class can serve two different DUT instances in one simulation by binding two driver objects to two interface instances.',
          answer: 'true',
          explanation:
            'That is the reuse payoff: the class is instance-agnostic; each object binds to its own interface instance at run time.',
          hint: 'Re-read the two-DUT example.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt: 'Write the declaration of a driver class property that holds a handle to interface bus_if restricted to its drv modport.',
          answer: 'virtual bus_if.drv vif;',
          explanation:
            'The virtual keyword makes it a handle to an interface instance; the .drv qualification bakes the modport view into the type.',
          hint: 'It starts with virtual and ends with the handle name.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Virtual interface', definition: 'A handle-typed variable referring to an interface instance, allowing class code to access real signals.' },
      { term: 'Binding', definition: 'The run-time assignment that points a virtual interface handle at a concrete interface instance.' },
      { term: 'Set-and-use pattern', definition: 'Bind the handle once in the test/environment, then pass it to every component; components never name paths.' },
      { term: 'null check', definition: 'The build-time guard `if (vif == null) $fatal(...)` converting binding mistakes into clear errors.' },
      { term: 'Modport-qualified virtual interface', definition: 'A virtual interface typed with a view (virtual bus_if.mon) extending direction discipline into class code.' },
    ],
    revisionSummary: [
      'Classes cannot see signals; virtual interfaces give them run-time handles to interface instances.',
      'Declaring does not bind: unbound handles are null; bind once, then use everywhere.',
      'Bind with the instance (drv = new(u_if)), never with hierarchical paths inside classes.',
      'Modport-qualified virtual interfaces (virtual bus_if.mon) extend view discipline into class code.',
      'With classes, transactions, roles and vif you have every mechanism UVM builds on.',
    ],
    furtherReading: [
      { label: 'Accellera — UVM downloads and documentation', url: 'https://www.accellera.org/downloads/standards/uvm', kind: 'standard' },
      { label: 'Wikipedia — SystemVerilog', url: 'https://en.wikipedia.org/wiki/SystemVerilog', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
