import type { Challenge } from '../types';
import { MATLAB_CHALLENGE_EXECUTION } from './signalLab';

export const INITIAL_CHALLENGES: Challenge[] = [
  // 1. CSE
  {
    id: "cse-01-two-sum",
    slug: "two-sum",
    title: "Two Sum: Hash Map Optimization",
    discipline: "cse",
    difficulty: "Easy",
    topic: "Arrays & Hash Tables",
    language: "python",
    order_index: 1,
    xp_reward: 50,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    tags: ["Array", "Hash Table", "Algorithms", "Time-Complexity"],
    description: `### Problem Statement
Given an array of integers \`nums\` and an integer \`target\`, return the **indices** of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice. You can return the answer in any order.

#### Constraints:
* $2 \\le \\text{len}(nums) \\le 10^4$
* $-10^9 \\le nums[i] \\le 10^9$
* Only one valid answer exists.
* Target time complexity: $\\mathcal{O}(n)$.

#### Example:
\`\`\`python
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: nums[0] + nums[1] == 9, so return [0, 1].
\`\`\``,
    starter_code: `def two_sum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # TODO: Write your O(n) hash map solution here
    lookup = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in lookup:
            return [lookup[diff], i]
        lookup[num] = i
    return []
`,
    test_cases: [
      { id: "1", input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1], entry_point: "two_sum", hidden: false },
      { id: "2", input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2], entry_point: "two_sum", hidden: false },
      { id: "3", input: { nums: [3, 3], target: 6 }, expected: [0, 1], entry_point: "two_sum", hidden: true }
    ],
    solution_hints: [
      "Use a Python dictionary to store the complement `target - num` and its index as you iterate.",
      "Can you solve this in a single pass?"
    ]
  },
  {
    id: "cse-02-binary-search",
    slug: "binary-search",
    title: "Binary Search: Logarithmic Bounds",
    discipline: "cse",
    difficulty: "Easy",
    topic: "Binary Search",
    language: "python",
    order_index: 2,
    xp_reward: 60,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    tags: ["Search", "Algorithms", "Divide and Conquer"],
    description: `### Problem Statement
Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its index. Otherwise, return \`-1\`.

You must write an algorithm with $\\mathcal{O}(\\log n)$ runtime complexity.

#### Example:
\`\`\`python
Input: nums = [-1, 0, 3, 5, 9, 12], target = 9
Output: 4
\`\`\``,
    starter_code: `def search(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: int
    """
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
`,
    test_cases: [
      { id: "1", input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 }, expected: 4, entry_point: "search", hidden: false },
      { id: "2", input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 }, expected: -1, entry_point: "search", hidden: false },
      { id: "3", input: { nums: [5], target: 5 }, expected: 0, entry_point: "search", hidden: true }
    ],
    solution_hints: [
      "Calculate mid as `left + (right - left) // 2` to avoid integer overflow."
    ]
  },

  // 2. ECE - Verilog HDL
  {
    id: "ece-01-ripple-carry-adder",
    slug: "ripple-carry-adder-4bit",
    title: "4-Bit Ripple Carry Adder",
    discipline: "ece-verilog",
    difficulty: "Easy",
    topic: "Combinational Logic & Arithmetic",
    language: "verilog",
    order_index: 1,
    xp_reward: 80,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    tags: ["Verilog", "HDL", "Arithmetic Logic", "Hardware"],
    description: `### Problem Statement
Design a **4-bit Ripple Carry Adder** in synthesizable Verilog.
The module accepts two 4-bit unsigned inputs \`a\` and \`b\`, alongside a single-bit carry-in \`cin\`. It must produce a 4-bit \`sum\` and a single-bit carry-out \`cout\`.

#### Module Port Interface:
\`\`\`verilog
module ripple_carry_adder(
    input  [3:0] a,
    input  [3:0] b,
    input        cin,
    output [3:0] sum,
    output       cout
);
\`\`\`

#### Signal Specifications:
* $a[3:0] + b[3:0] + cin = \\{cout, sum[3:0]\\}$
* Delay budget: Full propagation across 4 bit full adder stages.`,
    starter_code: `module ripple_carry_adder(
    input  [3:0] a,
    input  [3:0] b,
    input        cin,
    output [3:0] sum,
    output       cout
);
    // Continuous assignment concatenation
    assign {cout, sum} = a + b + cin;

endmodule
`,
    test_cases: [
      { id: "1", input: { a: 5, b: 3, cin: 0 }, expected: { sum: 8, cout: 0 }, hidden: false },
      { id: "2", input: { a: 10, b: 7, cin: 1 }, expected: { sum: 2, cout: 1 }, hidden: false },
      { id: "3", input: { a: 15, b: 15, cin: 1 }, expected: { sum: 15, cout: 1 }, hidden: true }
    ],
    solution_hints: [
      "In Verilog, you can express addition compactly using concatenation: `assign {cout, sum} = a + b + cin;`."
    ]
  },
  {
    id: "ece-02-d-flip-flop",
    slug: "d-flip-flop-reset",
    title: "D Flip-Flop with Synchronous Reset",
    discipline: "ece-verilog",
    difficulty: "Easy",
    topic: "Sequential Logic",
    language: "verilog",
    order_index: 2,
    xp_reward: 75,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    tags: ["Verilog", "Sequential Logic", "Flip-Flop", "Clocking"],
    description: `### Problem Statement
Design an edge-triggered **D Flip-Flop** with an active-high synchronous reset in Verilog.

On the positive edge of \`clk\`:
* If \`rst == 1'b1\`, output \`q\` must clear to \`1'b0\`.
* Otherwise, \`q\` must latch the value of input \`d\`.`,
    starter_code: `module d_flip_flop(
    input      clk,
    input      rst,
    input      d,
    output reg q
);
    always @(posedge clk) begin
        if (rst)
            q <= 1'b0;
        else
            q <= d;
    end
endmodule
`,
    test_cases: [
      { id: "1", input: { rst: 1, d: 1 }, expected: { q: 0 }, hidden: false },
      { id: "2", input: { rst: 0, d: 1 }, expected: { q: 1 }, hidden: false },
      { id: "3", input: { rst: 0, d: 0 }, expected: { q: 0 }, hidden: true }
    ],
    solution_hints: [
      "Use non-blocking assignments (`<=`) inside sequential `always @(posedge clk)` blocks."
    ]
  },
  {
    id: "ece-04-half-adder",
    slug: "half-adder-gate-composition",
    title: "Half Adder: XOR Sum and AND Carry",
    discipline: "ece-verilog",
    difficulty: "Easy",
    topic: "Logic Gates & Combinational Arithmetic",
    language: "verilog",
    order_index: 3,
    xp_reward: 65,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    tags: ["Logic Gates", "Verilog", "XOR", "AND", "Half Adder"],
    description: `### Problem Statement
Build a two-input **half adder** using synthesizable Verilog.

The module must expose:

\`\`\`verilog
module half_adder(
    input  wire a,
    input  wire b,
    output wire sum,
    output wire carry
);
\`\`\`

The sum bit is high when the inputs differ. The carry bit is high only when both inputs are high.

| a | b | sum | carry |
|---|---|-----|-------|
| 0 | 0 | 0 | 0 |
| 0 | 1 | 1 | 0 |
| 1 | 0 | 1 | 0 |
| 1 | 1 | 0 | 1 |`,
    starter_code: `module half_adder(
    input  wire a,
    input  wire b,
    output wire sum,
    output wire carry
);
    // TODO: sum is XOR; carry is AND.
endmodule
`,
    test_cases: [
      { id: "1", input: { a: 0, b: 0 }, expected: { sum: 0, carry: 0 }, hidden: false },
      { id: "2", input: { a: 0, b: 1 }, expected: { sum: 1, carry: 0 }, hidden: false },
      { id: "3", input: { a: 1, b: 0 }, expected: { sum: 1, carry: 0 }, hidden: false },
      { id: "4", input: { a: 1, b: 1 }, expected: { sum: 0, carry: 1 }, hidden: true }
    ],
    solution_hints: [
      "Use `assign sum = a ^ b;` for the sum bit.",
      "Use `assign carry = a & b;` for the carry bit."
    ]
  },
  {
    id: "ece-05-not-gate",
    slug: "verilog-not-gate",
    title: "Verilog NOT Gate Primitive",
    discipline: "ece-verilog",
    difficulty: "Easy",
    topic: "Logic Gates",
    language: "verilog",
    order_index: 4,
    xp_reward: 40,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    tags: ["Logic Gates", "Verilog", "NOT", "Combinational"],
    description: `### Problem Statement

Use the interface module not_gate(input wire a, output wire y); and choose a gate primitive or dataflow assignment.`,
    starter_code: `module not_gate(input wire a, output wire y);
    // TODO: implement y = NOT a
endmodule
`,
    test_cases: [
      { id: "1", input: { a: 0 }, expected: 1, hidden: false },
      { id: "2", input: { a: 1 }, expected: 0, hidden: true }
    ],
    solution_hints: ["Gate primitive: `not (y, a);`", "Dataflow: `assign y = ~a;`"]
  },
  {
    id: "ece-06-and-gate",
    slug: "verilog-and-gate",
    title: "Verilog AND Gate Primitive",
    discipline: "ece-verilog",
    difficulty: "Easy",
    topic: "Logic Gates",
    language: "verilog",
    order_index: 5,
    xp_reward: 40,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    tags: ["Logic Gates", "Verilog", "AND", "Truth Table"],
    description: `### Problem Statement

Use the interface [module and_gate(input wire a, input wire b, output wire y);].`,
    starter_code: `module and_gate(input wire a, input wire b, output wire y);
    // TODO: implement y = a AND b
endmodule
`,
    test_cases: [
      { id: "1", input: { a: 0, b: 0 }, expected: 0, hidden: false },
      { id: "2", input: { a: 1, b: 1 }, expected: 1, hidden: true }
    ],
    solution_hints: ["Gate primitive: `and (y, a, b);`", "Dataflow: `assign y = a & b;`"]
  },
  {
    id: "ece-07-or-gate",
    slug: "verilog-or-gate",
    title: "Verilog OR Gate Primitive",
    discipline: "ece-verilog",
    difficulty: "Easy",
    topic: "Logic Gates",
    language: "verilog",
    order_index: 6,
    xp_reward: 40,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    tags: ["Logic Gates", "Verilog", "OR", "Truth Table"],
    description: `### Problem Statement

Use the interface [module or_gate(input wire a, input wire b, output wire y);].`,
    starter_code: `module or_gate(input wire a, input wire b, output wire y);
    // TODO: implement y = a OR b
endmodule
`,
    test_cases: [
      { id: "1", input: { a: 0, b: 0 }, expected: 0, hidden: false },
      { id: "2", input: { a: 1, b: 0 }, expected: 1, hidden: true }
    ],
    solution_hints: ["Gate primitive: `or (y, a, b);`", "Dataflow: `assign y = a | b;`"]
  },

  // 3. ECE - MATLAB / Signals, DSP and communications
  {
    id: "ece-matlab-01-sampling",
    slug: "matlab-alias-frequency",
    title: "MATLAB Sampling: Calculate the Alias Frequency",
    discipline: "ece-matlab",
    difficulty: "Easy",
    topic: "Signals & Systems · Sampling",
    language: "matlab",
    order_index: 1,
    xp_reward: 60,
    time_limit_ms: 3000,
    memory_limit_mb: 256,
    tags: ["MATLAB", "Signals", "Sampling", "Nyquist", "Aliasing"],
    signalDomain: 'signals',
    starterVerified: true,
    execution: { ...MATLAB_CHALLENGE_EXECUTION },
    description: `### Problem Statement

Write a MATLAB-compatible function that returns the apparent frequency of a real sinusoid after sampling at fs Hz. Fold the input frequency into the first Nyquist zone:

alias = abs(mod(f0 + fs/2, fs) - fs/2)

Return a scalar in Hz. This models aliasing only; it does not replace an anti-alias filter design or a measured spectrum.`,
    starter_code: `function alias = alias_frequency(fs, f0)
    % Return the folded frequency in the first Nyquist zone.
    % TODO: use modulo arithmetic; do not call a plotting function.
    alias = 0;
end
`,
    test_cases: [
      { id: "1", input: { fs: 8000, f0: 1000 }, expected: 1000, entry_point: "alias_frequency", hidden: false },
      { id: "2", input: { fs: 8000, f0: 7000 }, expected: 1000, entry_point: "alias_frequency", hidden: false },
      { id: "3", input: { fs: 8000, f0: 5000 }, expected: 3000, entry_point: "alias_frequency", hidden: true },
    ],
    solution_hints: ["Use `mod` to wrap the frequency by the sample rate.", "Take the absolute value after folding around fs/2."],
  },
  {
    id: "ece-matlab-02-convolution",
    slug: "matlab-discrete-convolution",
    title: "MATLAB DSP: Discrete Convolution",
    discipline: "ece-matlab",
    difficulty: "Easy",
    topic: "DSP · LTI Systems",
    language: "matlab",
    order_index: 2,
    xp_reward: 70,
    time_limit_ms: 3000,
    memory_limit_mb: 256,
    tags: ["MATLAB", "DSP", "Convolution", "LTI"],
    signalDomain: 'dsp',
    starterVerified: true,
    execution: { ...MATLAB_CHALLENGE_EXECUTION },
    description: `### Problem Statement

Implement y = discrete_convolution(x, h) for finite discrete-time sequences. Use MATLAB's conv function or an equivalent implementation. The output must contain all length(x) + length(h) - 1 samples.`,
    starter_code: `function y = discrete_convolution(x, h)
    % Compute the finite-length linear convolution y[n] = x[n] * h[n].
    % TODO: preserve the complete output sequence.
    y = [];
end
`,
    test_cases: [
      { id: "1", input: { x: [1, 2, 1], h: [1, -1, 2] }, expected: [1, 1, 1, 3, 2], entry_point: "discrete_convolution", hidden: false },
      { id: "2", input: { x: [1, 0, -1], h: [2, 2] }, expected: [2, 2, -2, -2], entry_point: "discrete_convolution", hidden: false },
      { id: "3", input: { x: [2, 3], h: [4] }, expected: [8, 12], entry_point: "discrete_convolution", hidden: true },
    ],
    solution_hints: ["The built-in `conv(x, h)` returns the full linear convolution.", "Check the output length before inspecting the values."],
  },
  {
    id: "ece-matlab-03-fft-spectrum",
    slug: "matlab-fft-bin-spacing",
    title: "MATLAB DSP: FFT Bin Spacing",
    discipline: "ece-matlab",
    difficulty: "Easy",
    topic: "DSP · DFT and FFT",
    language: "matlab",
    order_index: 3,
    xp_reward: 65,
    time_limit_ms: 3000,
    memory_limit_mb: 256,
    tags: ["MATLAB", "DSP", "DFT", "FFT", "Spectrum"],
    signalDomain: 'dsp',
    starterVerified: true,
    execution: { ...MATLAB_CHALLENGE_EXECUTION },
    description: `### Problem Statement

Implement delta_f = fft_bin_spacing(fs, N). The spacing between adjacent DFT bins is fs/N Hz. Return a scalar and do not round it inside the function.`,
    starter_code: `function delta_f = fft_bin_spacing(fs, N)
    % Return the frequency resolution of an N-point DFT.
    delta_f = 0;
end
`,
    test_cases: [
      { id: "1", input: { fs: 8000, N: 1024 }, expected: 7.8125, entry_point: "fft_bin_spacing", hidden: false },
      { id: "2", input: { fs: 48000, N: 4096 }, expected: 11.71875, entry_point: "fft_bin_spacing", hidden: false },
      { id: "3", input: { fs: 1000, N: 100 }, expected: 10, entry_point: "fft_bin_spacing", hidden: true },
    ],
    solution_hints: ["Use the sampling rate as the total frequency span.", "The number of equal bins is N."],
  },
  {
    id: "ece-matlab-04-bpsk-symbols",
    slug: "matlab-bpsk-symbol-mapping",
    title: "MATLAB Communications: BPSK Symbol Mapping",
    discipline: "ece-matlab",
    difficulty: "Easy",
    topic: "Communication Systems · Digital Modulation",
    language: "matlab",
    order_index: 4,
    xp_reward: 70,
    time_limit_ms: 3000,
    memory_limit_mb: 256,
    tags: ["MATLAB", "Communications", "BPSK", "Modulation"],
    signalDomain: 'communications',
    starterVerified: true,
    execution: { ...MATLAB_CHALLENGE_EXECUTION },
    description: `### Problem Statement

Map binary bits to antipodal BPSK symbols: bit 1 becomes +1 and bit 0 becomes -1. Implement symbols = bpsk_map(bits) using vectorized MATLAB-compatible operations.`,
    starter_code: `function symbols = bpsk_map(bits)
    % Map 0 -> -1 and 1 -> +1.
    symbols = zeros(size(bits));
end
`,
    test_cases: [
      { id: "1", input: { bits: [1, 0, 1, 1, 0] }, expected: [1, -1, 1, 1, -1], entry_point: "bpsk_map", hidden: false },
      { id: "2", input: { bits: [0, 0, 1] }, expected: [-1, -1, 1], entry_point: "bpsk_map", hidden: false },
      { id: "3", input: { bits: [1, 1, 1, 0] }, expected: [1, 1, 1, -1], entry_point: "bpsk_map", hidden: true },
    ],
    solution_hints: ["The affine mapping `2 * bits - 1` is vectorized.", "Keep the result the same shape as the input vector."],
  },

  // 3. ECE - Embedded C
  {
    id: "ece-03-gpio-bit-toggle",
    slug: "embedded-c-gpio-toggle",
    title: "GPIO Bitwise Register Manipulation",
    discipline: "ece-embedded",
    difficulty: "Easy",
    topic: "Microcontroller Hardware Abstraction",
    language: "c",
    order_index: 1,
    xp_reward: 85,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    tags: ["Embedded C", "Bitwise", "GPIO", "Microcontrollers"],
    description: `### Problem Statement
In bare-metal embedded programming, peripheral hardware is controlled by toggling bits in memory-mapped I/O registers.

Implement the function:
\`\`\`c
uint8_t toggle_pin(uint8_t port_val, uint8_t pin_num);
\`\`\`
Where:
* \`port_val\` represents an 8-bit GPIO Output Data Register (ODR).
* \`pin_num\` is the pin index ($0 \\le pin\\_num \\le 7$).
* The function must invert (toggle) the specific bit at \`pin_num\` without altering any other bits in \`port_val\`.`,
    starter_code: `#include <stdint.h>

uint8_t toggle_pin(uint8_t port_val, uint8_t pin_num) {
    // Toggle bit at pin_num using bitwise XOR
    return port_val ^ (1U << pin_num);
}
`,
    test_cases: [
      { id: "1", input: "0 3", expected: "8", hidden: false },
      { id: "2", input: "255 3", expected: "247", hidden: false },
      { id: "3", input: "16 4", expected: "0", hidden: true }
    ],
    solution_hints: [
      "Create a bitmask using `(1U << pin_num)` and XOR with `port_val`."
    ]
  },

  // 4. AI & Machine Learning
  {
    id: "ai-01-perceptron-forward",
    slug: "perceptron-forward-pass",
    title: "Perceptron Forward Pass & Sigmoid",
    discipline: "ai-ml",
    difficulty: "Easy",
    topic: "Neural Networks",
    language: "python",
    order_index: 1,
    xp_reward: 90,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    tags: ["Machine Learning", "Neural Networks", "Sigmoid", "Linear Algebra"],
    description: `### Problem Statement
Compute the output of a single artificial neuron with weights vector $W$, bias $b$, and input vector $X$ using the Sigmoid activation function $\\sigma(z)$:

$$z = \\sum_{i=1}^n (w_i \\cdot x_i) + b$$
$$\\sigma(z) = \\frac{1}{1 + e^{-z}}$$

Implement \`perceptron_forward(weights, inputs, bias)\`. Round the output to 4 decimal places.`,
    starter_code: `import math

def perceptron_forward(weights, inputs, bias):
    """
    :type weights: List[float]
    :type inputs: List[float]
    :type bias: float
    :rtype: float
    """
    z = sum(w * x for w, x in zip(weights, inputs)) + bias
    sigma = 1.0 / (1.0 + math.exp(-z))
    return round(sigma, 4)
`,
    test_cases: [
      { id: "1", input: { weights: [0.5, -0.5], inputs: [1.0, 2.0], bias: 0.0 }, expected: 0.3775, entry_point: "perceptron_forward", hidden: false },
      { id: "2", input: { weights: [1.0, 1.0], inputs: [0.0, 0.0], bias: 0.0 }, expected: 0.5, entry_point: "perceptron_forward", hidden: false },
      { id: "3", input: { weights: [2.0, 3.0], inputs: [1.0, 1.0], bias: -5.0 }, expected: 0.5, entry_point: "perceptron_forward", hidden: true }
    ],
    solution_hints: [
      "Compute dot product `z = sum(w * x for w, x in zip(weights, inputs)) + bias`.",
      "`sigmoid(z) = 1.0 / (1.0 + math.exp(-z))`."
    ]
  },

  // 5. Cybersecurity & CTF
  {
    id: "cyber-01-xor-cipher-decrypt",
    slug: "ctf-xor-cipher-recovery",
    title: "CTF: Cryptographic XOR Key Recovery",
    discipline: "cybersecurity",
    difficulty: "Medium",
    topic: "Cryptography & CTF",
    language: "python",
    order_index: 1,
    xp_reward: 100,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    tags: ["Security", "CTF", "Cryptography", "XOR"],
    description: `### Challenge Brief
During an incident response investigation, you recovered an obfuscated payload encoded with a repeating single-byte XOR key.
The ciphertext in hexadecimal is:
\`15 1e 17 19 1e 28 0b 05 16 16 43 02 0f 05 02 16 1c 43 00 07 1e 43 02 05 03 4d\`

Knowing that all EnginX flags begin with the known prefix \`ENGINX{\`, determine the secret single-byte XOR key, decrypt the payload, and return the complete captured flag!

#### Flag Format:
\`ENGINX{...}\``,
    starter_code: `def decrypt_xor_flag():
    hex_ciphertext = "151e17191e280b05161643020f0502161c4300071e430205034d"
    raw_bytes = bytes.fromhex(hex_ciphertext)
    # Recover key: first byte ^ ord('E')
    key = raw_bytes[0] ^ ord('E')
    decrypted = "".join(chr(b ^ key) for b in raw_bytes)
    return decrypted
`,
    test_cases: [
      { id: "1", input: {}, expected: "ENGINX{x0r_c1ph3r_cr4ck3d}", entry_point: "decrypt_xor_flag", hidden: false }
    ],
    solution_hints: [
      "Because XOR is symmetric: `key = ciphertext[0] ^ ord('E')`.",
      "Once key is found, decrypt each byte by XORing with key."
    ]
  },

  // 6. Robotics & Hardware
  {
    id: "robotics-01-forward-kinematics",
    slug: "robotics-2dof-planar-arm",
    title: "2-DOF Planar Arm Forward Kinematics",
    discipline: "robotics",
    difficulty: "Medium",
    topic: "Kinematics & Control",
    language: "python",
    order_index: 1,
    xp_reward: 95,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    tags: ["Robotics", "Kinematics", "Trigonometry", "Simulation"],
    description: `### Problem Statement
In robotics, forward kinematics computes the $(x, y)$ Cartesian coordinates of the end-effector given joint angles $(\\theta_1, \\theta_2)$ and link lengths $(l_1, l_2)$:

$$x = l_1 \\cos(\\theta_1) + l_2 \\cos(\\theta_1 + \\theta_2)$$
$$y = l_1 \\sin(\\theta_1) + l_2 \\sin(\\theta_1 + \\theta_2)$$

Implement \`forward_kinematics(theta1_deg, theta2_deg, l1, l2)\`. Convert angles from degrees to radians. Return \`[round(x, 2), round(y, 2)]\`.`,
    starter_code: `import math

def forward_kinematics(theta1_deg, theta2_deg, l1=10.0, l2=10.0):
    t1 = math.radians(theta1_deg)
    t2 = math.radians(theta1_deg + theta2_deg)
    x = round(l1 * math.cos(t1) + l2 * math.cos(t2), 2)
    y = round(l1 * math.sin(t1) + l2 * math.sin(t2), 2)
    return [x, y]
`,
    test_cases: [
      { id: "1", input: { theta1_deg: 0.0, theta2_deg: 0.0, l1: 10.0, l2: 10.0 }, expected: [20.0, 0.0], entry_point: "forward_kinematics", hidden: false },
      { id: "2", input: { theta1_deg: 90.0, theta2_deg: 0.0, l1: 10.0, l2: 10.0 }, expected: [0.0, 20.0], entry_point: "forward_kinematics", hidden: false },
      { id: "3", input: { theta1_deg: 45.0, theta2_deg: -45.0, l1: 10.0, l2: 10.0 }, expected: [17.07, 7.07], entry_point: "forward_kinematics", hidden: true }
    ],
    solution_hints: [
      "Use `math.radians()` to convert joint angles to radians.",
      "The second link's orientation with respect to base is `theta1 + theta2`."
    ]
  },
  {
    id: "hardware-01-2to1-multiplexer",
    slug: "logic-2to1-multiplexer",
    title: "2-to-1 Multiplexer (MUX)",
    discipline: "hardware",
    difficulty: "Easy",
    topic: "Digital Logic Gates",
    language: "verilog",
    order_index: 1,
    xp_reward: 70,
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    tags: ["Logic Gates", "Digital Design", "Hardware", "Multiplexer"],
    description: `### Problem Statement
A **2-to-1 Multiplexer** selects between two input signals \`a\` and \`b\` based on a select line \`sel\`.

* When \`sel == 1'b0\`, \`out = a\`
* When \`sel == 1'b1\`, \`out = b\`

#### Port Interface:
\`\`\`verilog
module mux2to1(
    input a,
    input b,
    input sel,
    output out
);
\`\`\``,
    starter_code: `module mux2to1(
    input a,
    input b,
    input sel,
    output out
);
    assign out = sel ? b : a;

endmodule
`,
    test_cases: [
      { id: "1", input: { a: 0, b: 1, sel: 0 }, expected: 0, hidden: false },
      { id: "2", input: { a: 0, b: 1, sel: 1 }, expected: 1, hidden: false },
      { id: "3", input: { a: 1, b: 0, sel: 1 }, expected: 0, hidden: true }
    ],
    solution_hints: [
      "Use ternary conditional operator: `assign out = sel ? b : a;`."
    ]
  }
];
