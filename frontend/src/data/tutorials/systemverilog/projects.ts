import type { TutorialProject } from '../types';

export const projects: TutorialProject[] = [
  {
    id: 'sv-layered-memory-tb',
    title: 'Build a Layered Testbench for a Small Memory',
    level: 'advanced',
    summary:
      'Assemble the full Module 04 architecture for a 256x8 synchronous memory: transaction class, generator, driver, monitor and scoreboard over a valid/ready interface — constrained-random stimulus included.',
    useCase:
      'You need to verify a small synchronous SRAM-style memory before integrating it into a subsystem, and a directed test list is not scaling: the verification plan asks for random address/data coverage, back-to-back transfers and a clean PASS/FAIL verdict per run with a recorded seed.',
    requirements: [
      'DUT: a 256x8 synchronous memory with clk, rst_n, valid, ready, wr, addr[7:0], wdata[7:0], rdata[7:0]; ready deasserts randomly to create stalls (model it in a behavioral DUT).',
      'bus_if interface bundling the signals with src, dst and mon modports (Module 03).',
      'mem_tr transaction class: rand wr, rand addr, rand wdata, observed rdata slot, and a show() method.',
      'Generator producing N randomized transactions into a mailbox; Driver enacting them through the src view; Monitor reconstructing transfers through the mon view; Scoreboard holding a golden 256-entry model.',
      'Checking: writes update the model; reads compare DUT rdata against the model using !==; errors counted; final PASS/FAIL summary with the error count.',
      'Coverage (concept-level): coverpoints for wr/rd, address low/mid/high/max bins, and a wr-or-rd x address-range cross.',
    ],
    learningOutcomes: [
      'Assemble the four layered roles around one interface instance and two mailboxes.',
      'Apply the valid/ready stability rule in a real driver and police it with a stability property.',
      'Maintain a reference-model scoreboard and produce an actionable PASS/FAIL verdict.',
      'Bias constrained-random stimulus toward address corners and read a coverage-style report of what was exercised.',
    ],
    prerequisites: [
      'Completion of systemverilog Modules 01-05',
      'A full SystemVerilog simulator (commercial, or Verilator with limitations) — see the honesty note below',
    ],
    architecture:
      'One top-level module instantiates clk/reset, the bus_if interface, the behavioral DUT, and the testbench objects. The testbench is four classes connected by two mailboxes: generator -> driver (requests) and monitor -> scoreboard (observations). The driver and monitor access signals only through virtual-interface handles bound to the interface instance (src and mon modports respectively). The scoreboard owns a 256-entry golden array and the only verdict logic. Constrained randomization with dist corner bias lives in the transaction class; the stability assertion lives in the interface.',
    steps: [
      {
        title: 'Define the interface and the behavioral DUT',
        detail:
          'Create bus_if with the handshake signals plus modports src/dst/mon, and a valid-stability assertion (disable iff reset). Write the DUT as a behavioral memory: on a committed transfer (valid && ready) latch a write or drive read data; make ready deassert pseudo-randomly to generate stalls.',
        code:
        'interface bus_if (input logic clk, input logic rst_n);\n  logic        valid, ready, wr;\n  logic [7:0]  addr;\n  logic [7:0]  wdata, rdata;\n\n  modport src (output valid, wr, addr, wdata, input ready, clk, rst_n);\n  modport dst (input  valid, wr, addr, wdata, clk, rst_n, output ready, rdata);\n  modport mon (input  valid, ready, wr, addr, wdata, rdata, clk, rst_n);\n\n  a_valid_stable: assert property (\n    @(posedge clk) disable iff (!rst_n)\n    valid && !ready |=> valid && $stable({wr, addr, wdata})\n  );\nendinterface\n\nmodule mem256 (bus_if.dst p);\n  logic [7:0] mem [0:255];\n  always @(posedge p.clk) begin\n    if (p.valid && p.ready) begin\n      if (p.wr) mem[p.addr] <= p.wdata;\n      else      p.rdata     <= mem[p.addr];\n    end\n  end\n  // Demo stall model: a small LFSR makes ready drop ~25% of cycles.\n  logic [3:0] lfsr = 4\'b1010;\n  always @(posedge p.clk) begin\n    if (!p.rst_n) begin\n      p.ready <= 1\'b1;\n      lfsr    <= 4\'b1010;\n    end else begin\n      lfsr    <= {lfsr[2:0], lfsr[3] ^ lfsr[2]};   // maximal-length tap\n      p.ready <= lfsr[3] | lfsr[2] | lfsr[0];      // low on 4 of 16 states\n    end\n  end\nendmodule',
      },
      {
        title: 'Write the transaction with corner-biased constraints',
        detail:
          'mem_tr carries intent only (wr, addr, wdata; rdata filled by the observe side). Constrain addresses with dist so 0x00 and 0xFF get real probability, and check randomize() return values everywhere.',
        code:
        'class mem_tr;\n  rand bit          wr;\n  rand logic [7:0]  addr;\n  rand logic [7:0]  wdata;\n       logic [7:0]  rdata;   // observed on reads\n\n  constraint c_addr { addr dist { 8\'h00 :/ 15,\n                                  8\'hFF :/ 15,\n                             [8\'h01:8\'hFE] :/ 70 }; }\n\n  function string show();\n    return $sformatf("%s a=%0h d=%0h r=%0h",\n                     wr ? "WR" : "RD", addr, wdata, rdata);\n  endfunction\nendclass',
      },
      {
        title: 'Implement generator, driver, monitor, scoreboard',
        detail:
          'Four classes, two mailboxes, exactly as in Module 04 lesson 2. The driver owns all stimulus-side timing (valid held until ready); the monitor samples only on committed transfers; the scoreboard owns the golden model and the verdict.',
        code:
        'class generator;\n  mailbox #(mem_tr) out;\n  int n;\n  function new(mailbox #(mem_tr) out, int n); this.out = out; this.n = n; endfunction\n  task run();\n    mem_tr t;\n    repeat (n) begin\n      t = new();\n      if (!t.randomize()) $fatal(1, "randomize failed");\n      out.put(t);\n    end\n  endtask\nendclass\n\nclass driver;\n  mailbox #(mem_tr) in;\n  virtual bus_if.src vif;\n  function new(mailbox #(mem_tr) in, virtual bus_if.src v);\n    if (v == null) $fatal(1, "driver: null vif");\n    this.in = in; this.vif = v;\n  endfunction\n  task run();\n    mem_tr t;\n    vif.valid <= 0;\n    forever begin\n      in.get(t);\n      @(posedge vif.clk);\n      vif.valid <= 1;\n      vif.wr    <= t.wr;\n      vif.addr  <= t.addr;\n      vif.wdata <= t.wdata;\n      do @(posedge vif.clk); while (!vif.ready);   // hold until accepted\n      vif.valid <= 0;\n    end\n  endtask\nendclass\n\nclass monitor;\n  mailbox #(mem_tr) out;\n  virtual bus_if.mon vif;\n  function new(mailbox #(mem_tr) out, virtual bus_if.mon v);\n    if (v == null) $fatal(1, "monitor: null vif");\n    this.out = out; this.vif = v;\n  endfunction\n  task run();\n    mem_tr t;\n    forever begin\n      @(posedge vif.clk);\n      if (vif.valid && vif.ready) begin\n        t        = new();\n        t.wr     = vif.wr;\n        t.addr   = vif.addr;\n        t.wdata  = vif.wdata;\n        t.rdata  = vif.rdata;\n        out.put(t);\n      end\n    end\n  endtask\nendclass\n\nclass scoreboard;\n  mailbox #(mem_tr) obs;\n  logic [7:0] model [0:255];\n  int errors;\n  function new(mailbox #(mem_tr) obs); this.obs = obs; errors = 0; endfunction\n  task run();\n    mem_tr t;\n    forever begin\n      obs.get(t);\n      if (t.wr) model[t.addr] = t.wdata;\n      else if (t.rdata !== model[t.addr]) begin\n        errors++;\n        $display("FAIL %s expected=%0h", t.show(), model[t.addr]);\n      end\n    end\n  endtask\nendclass',
      },
      {
        title: 'Wire the top level, run, and read the verdict',
        detail:
          'Instantiate clock/reset, the interface, the DUT, and the four roles; bind the driver/monitor through modport-qualified virtual interfaces; run for N transactions; print PASS/FAIL with the error count and record the simulator seed with the result.',
        code:
        'module tb_top;\n  logic clk = 0, rst_n = 0;\n  always #5 clk = ~clk;\n\n  bus_if u_if (.clk(clk), .rst_n(rst_n));\n  mem256 u_dut (.p(u_if.dst));   // behavioral DUT (stall model inside)\n\n  mailbox #(mem_tr) gen2drv = new();\n  mailbox #(mem_tr) mon2scb = new();\n\n  generator gen = new(gen2drv, 2000);\n  driver    drv = new(gen2drv, u_if);\n  monitor   mon = new(mon2scb, u_if);\n  scoreboard scb = new(mon2scb);\n\n  initial begin\n    fork\n      gen.run(); drv.run(); mon.run(); scb.run();\n    join_none\n    #23 rst_n = 1;\n    #200000;                       // long enough for 2000 stalled transfers\n    if (scb.errors == 0) $display("TB PASSED");\n    else                 $display("TB FAILED: %0d errors", scb.errors);\n    $finish;\n  end\nendmodule',
      },
      {
        title: 'Add the stability checker and reflect on coverage',
        detail:
          'Confirm the interface assertion from step 1 catches a deliberately broken driver (release valid mid-stall, observe the failure, then revert). Then write the coverage sketch from the requirements as comments and list which empty bins you would target with inline constraints.',
      },
    ],
    starterCode: {
      title: 'Starting skeleton (interface + transaction)',
      language: 'systemverilog',
      code:
        '// Requires a full SystemVerilog simulator (commercial, or Verilator\n// with limitations). NOT runnable on the EnginX platform grader,\n// which executes Icarus Verilog without class/constraint/SVA support.\ninterface bus_if (input logic clk, input logic rst_n);\n  logic        valid, ready, wr;\n  logic [7:0]  addr;\n  logic [7:0]  wdata, rdata;\n  modport src (output valid, wr, addr, wdata, input ready, clk, rst_n);\n  modport dst (input  valid, wr, addr, wdata, clk, rst_n, output ready, rdata);\n  modport mon (input  valid, ready, wr, addr, wdata, rdata, clk, rst_n);\nendinterface\n\nclass mem_tr;\n  rand bit         wr;\n  rand logic [7:0] addr;\n  rand logic [7:0] wdata;\n       logic [7:0] rdata;\n  // constraints and show() here\nendclass',
      explanation: [
        'This skeleton compiles as the backbone; steps 2-5 fill the constraints, the four roles, and the top level.',
        'Everything here is IEEE 1800 material from Modules 03-05; nothing is new syntax.',
        'Run it on a full simulator with a recorded seed; replay failures with the same seed.',
      ],
    },
    testPlan: [
      'Smoke: 20 directed transfers (write then read the same addresses) — expect TB PASSED with 0 errors.',
      'Random: 2000 constrained-random transactions, 5 different seeds — expect PASSED on every seed; record all seeds.',
      'Corner: inline-constrained runs at addr 0x00 and 0xFF for both wr and rd — expect PASSED.',
      'Stall check: confirm the monitor observed valid-held-during-stall cycles and the stability assertion never fired.',
      'Negative test: deliberately break the driver (drop valid mid-stall) — expect the interface assertion to fail with a named error; revert.',
      'Read-back check: after the random run, sweep-read all 256 addresses and compare against the scoreboard model.',
    ],
    expectedResults:
      'On a full SystemVerilog simulator, all seeds pass with 0 scoreboard errors and no assertion failures; the deliberately-broken-driver run fails exactly one stability assertion with its named message; the final summary line reads TB PASSED (or TB FAILED with the error count and the failing transactions printed by show()).',
    troubleshooting: [
      'Null vif at time 0: the binding ran after use. Bind in the test build step and keep the if (v == null) $fatal guards.',
      'Everything stalls forever: the driver released valid during a stall, or the DUT ready model never asserts. Check the valid-hold condition (!valid || ready) and the stall pattern.',
      'Mismatches on first read after reset: the model is uninitialized while the DUT returns x. Make the scoreboard treat reads of never-written addresses as unchecked, or initialize both to a known pattern.',
      'randomize() always fails: two constraints contradict (check c_addr ranges); log the class state on failure.',
      'Assertion noise at time 0: missing disable iff on reset in the interface property.',
    ],
    hardwareDependencies:
      'None — this is a pure simulation project. It does NOT run on the EnginX platform grader (Icarus Verilog lacks classes, constraints and SVA). Use a commercial simulator or Verilator (with limitations) locally.',
  },
];
