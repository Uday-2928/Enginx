"""
Seed Data for EnginX Platform
Comprehensive curriculum covering all 6 engineering disciplines:
1. Computer Science (Algorithms / DSA)
2. ECE - Verilog / Digital Logic (HDL)
3. ECE - Embedded C (MCU & Register Manipulation)
4. AI & Machine Learning (Neural Nets & Loss)
5. Cybersecurity (CTF & Buffer Exploit Analysis)
6. Robotics & General Hardware (Kinematics & Logic Gates)
"""
from models import Challenge, Badge, User

CHALLENGES = [
    # ==========================================
    # 1. Computer Science (CSE)
    # ==========================================
    {
        "id": "cse-01-two-sum",
        "slug": "two-sum",
        "title": "Two Sum: Hash Map Optimization",
        "discipline": "cse",
        "difficulty": "Easy",
        "topic": "Arrays & Hash Tables",
        "language": "python",
        "order_index": 1,
        "xp_reward": 50,
        "tags": ["Array", "Hash Table", "Algorithms", "Time-Complexity"],
        "description": """### Problem Statement
Given an array of integers `nums` and an integer `target`, return the **indices** of the two numbers such that they add up to `target`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice. You can return the answer in any order.

#### Constraints:
* $2 \\le \\text{len}(nums) \\le 10^4$
* $-10^9 \\le nums[i] \\le 10^9$
* Only one valid answer exists.
* Target time complexity: $\\mathcal{O}(n)$.

#### Example 1:
```python
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: nums[0] + nums[1] == 9, so return [0, 1].
```""",
        "starter_code": """def two_sum(nums, target):
    \"\"\"
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    \"\"\"
    # TODO: Write your O(n) hash map solution here
    pass
""",
        "test_cases": [
            {"id": "1", "input": {"nums": [2, 7, 11, 15], "target": 9}, "expected": [0, 1], "entry_point": "two_sum", "hidden": False},
            {"id": "2", "input": {"nums": [3, 2, 4], "target": 6}, "expected": [1, 2], "entry_point": "two_sum", "hidden": False},
            {"id": "3", "input": {"nums": [3, 3], "target": 6}, "expected": [0, 1], "entry_point": "two_sum", "hidden": True}
        ],
        "solution_hints": [
            "Use a Python dictionary to store the complement `target - num` and its index as you iterate.",
            "Can you solve this in a single pass?"
        ]
    },
    {
        "id": "cse-02-binary-search",
        "slug": "binary-search",
        "title": "Binary Search: Logarithmic Bounds",
        "discipline": "cse",
        "difficulty": "Easy",
        "topic": "Binary Search",
        "language": "python",
        "order_index": 2,
        "xp_reward": 60,
        "tags": ["Search", "Algorithms", "Divide and Conquer"],
        "description": """### Problem Statement
Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.

You must write an algorithm with $\\mathcal{O}(\\log n)$ runtime complexity.

#### Example 1:
```python
Input: nums = [-1, 0, 3, 5, 9, 12], target = 9
Output: 4
```""",
        "starter_code": """def search(nums, target):
    \"\"\"
    :type nums: List[int]
    :type target: int
    :rtype: int
    \"\"\"
    left, right = 0, len(nums) - 1
    # TODO: Implement O(log n) binary search
    return -1
""",
        "test_cases": [
            {"id": "1", "input": {"nums": [-1, 0, 3, 5, 9, 12], "target": 9}, "expected": 4, "entry_point": "search", "hidden": False},
            {"id": "2", "input": {"nums": [-1, 0, 3, 5, 9, 12], "target": 2}, "expected": -1, "entry_point": "search", "hidden": False},
            {"id": "3", "input": {"nums": [5], "target": 5}, "expected": 0, "entry_point": "search", "hidden": True}
        ],
        "solution_hints": [
            "Calculate mid as `left + (right - left) // 2` to avoid integer overflow.",
            "Narrow the search interval by updating `left = mid + 1` or `right = mid - 1`."
        ]
    },

    # ==========================================
    # 2. ECE - Verilog / Digital Design
    # ==========================================
    {
        "id": "ece-01-ripple-carry-adder",
        "slug": "ripple-carry-adder-4bit",
        "title": "4-Bit Ripple Carry Adder",
        "discipline": "ece-verilog",
        "difficulty": "Easy",
        "topic": "Combinational Logic & Arithmetic",
        "language": "verilog",
        "order_index": 1,
        "xp_reward": 80,
        "tags": ["Verilog", "HDL", "Arithmetic Logic", "Hardware"],
        "description": """### Problem Statement
Design a **4-bit Ripple Carry Adder** in synthesizable Verilog.
The module accepts two 4-bit unsigned inputs `a` and `b`, alongside a single-bit carry-in `cin`. It must produce a 4-bit `sum` and a single-bit carry-out `cout`.

#### Module Port Interface:
```verilog
module ripple_carry_adder(
    input  [3:0] a,
    input  [3:0] b,
    input        cin,
    output [3:0] sum,
    output       cout
);
```

#### Signal Specifications:
* $a[3:0] + b[3:0] + cin = \\{cout, sum[3:0]\\}$
* Delay budget: Full propagation across 4 bit full adder stages.

#### Example:
* Input: `a = 4'b0101` (5), `b = 4'b0011` (3), `cin = 1'b0`
* Output: `sum = 4'b1000` (8), `cout = 1'b0`""",
        "starter_code": """module ripple_carry_adder(
    input  [3:0] a,
    input  [3:0] b,
    input        cin,
    output [3:0] sum,
    output       cout
);
    // TODO: Implement 4-bit addition logic
    // You may use continuous assignment or instantiate 1-bit full adders.

endmodule
""",
        "test_cases": [
            {"id": "1", "input": {"a": 5, "b": 3, "cin": 0}, "expected": {"sum": 8, "cout": 0}, "hidden": False},
            {"id": "2", "input": {"a": 10, "b": 7, "cin": 1}, "expected": {"sum": 2, "cout": 1}, "hidden": False},
            {"id": "3", "input": {"a": 15, "b": 15, "cin": 1}, "expected": {"sum": 15, "cout": 1}, "hidden": True}
        ],
        "solution_hints": [
            "In Verilog, you can express addition compactly using concatenation: `assign {cout, sum} = a + b + cin;`.",
            "Make sure your vector bit-widths match the port specification."
        ]
    },
    {
        "id": "ece-02-d-flip-flop",
        "slug": "d-flip-flop-reset",
        "title": "D Flip-Flop with Synchronous Reset",
        "discipline": "ece-verilog",
        "difficulty": "Easy",
        "topic": "Sequential Logic",
        "language": "verilog",
        "order_index": 2,
        "xp_reward": 75,
        "tags": ["Verilog", "Sequential Logic", "Flip-Flop", "Clocking"],
        "description": """### Problem Statement
Design an edge-triggered **D Flip-Flop** with an active-high synchronous reset in Verilog.

On the positive edge of `clk`:
* If `rst == 1'b1`, output `q` must clear to `1'b0`.
* Otherwise, `q` must latch the value of input `d`.

#### Port Interface:
```verilog
module d_flip_flop(
    input      clk,
    input      rst,
    input      d,
    output reg q
);
```""",
        "starter_code": """module d_flip_flop(
    input      clk,
    input      rst,
    input      d,
    output reg q
);
    // TODO: Implement sequential always @(posedge clk) block
    always @(posedge clk) begin
        // Insert reset & latch logic
    end
endmodule
""",
        "test_cases": [
            {"id": "1", "input": {"rst": 1, "d": 1}, "expected": {"q": 0}, "hidden": False},
            {"id": "2", "input": {"rst": 0, "d": 1}, "expected": {"q": 1}, "hidden": False},
            {"id": "3", "input": {"rst": 0, "d": 0}, "expected": {"q": 0}, "hidden": True}
        ],
        "solution_hints": [
            "Use non-blocking assignments (`<=`) inside sequential `always @(posedge clk)` blocks."
        ]
    },
    {
        "id": "ece-04-half-adder",
        "slug": "half-adder-gate-composition",
        "title": "Half Adder: XOR Sum and AND Carry",
        "discipline": "ece-verilog",
        "difficulty": "Easy",
        "topic": "Logic Gates & Combinational Arithmetic",
        "language": "verilog",
        "order_index": 3,
        "xp_reward": 65,
        "tags": ["Logic Gates", "Verilog", "XOR", "AND", "Half Adder"],
        "description": """### Problem Statement
Build a two-input **half adder** using synthesizable Verilog.

The module must expose `a`, `b`, `sum` and `carry`. The sum bit is high when
the inputs differ. The carry bit is high only when both inputs are high.

| a | b | sum | carry |
|---|---|-----|-------|
| 0 | 0 | 0 | 0 |
| 0 | 1 | 1 | 0 |
| 1 | 0 | 1 | 0 |
| 1 | 1 | 0 | 1 |""",
        "starter_code": """module half_adder(
    input  wire a,
    input  wire b,
    output wire sum,
    output wire carry
);
    // TODO: sum is XOR; carry is AND.
endmodule
""",
        "test_cases": [
            {"id": "1", "input": {"a": 0, "b": 0}, "expected": {"sum": 0, "carry": 0}, "hidden": False},
            {"id": "2", "input": {"a": 0, "b": 1}, "expected": {"sum": 1, "carry": 0}, "hidden": False},
            {"id": "3", "input": {"a": 1, "b": 0}, "expected": {"sum": 1, "carry": 0}, "hidden": False},
            {"id": "4", "input": {"a": 1, "b": 1}, "expected": {"sum": 0, "carry": 1}, "hidden": True},
        ],
        "solution_hints": [
            "Use `assign sum = a ^ b;` for the sum bit.",
            "Use `assign carry = a & b;` for the carry bit.",
        ],
    },
    {
        "id": "ece-05-not-gate",
        "slug": "verilog-not-gate",
        "title": "Verilog NOT Gate Primitive",
        "discipline": "ece-verilog",
        "difficulty": "Easy",
        "topic": "Logic Gates",
        "language": "verilog",
        "order_index": 4,
        "xp_reward": 40,
        "tags": ["Logic Gates", "Verilog", "NOT", "Combinational"],
        "description": """### Problem Statement
Implement a one-input inverter. The output must be the complement of the input.

Use the interface `module not_gate(input wire a, output wire y);` and choose a
gate primitive or dataflow assignment.""",
        "starter_code": """module not_gate(input wire a, output wire y);
    // TODO: implement y = NOT a
endmodule
""",
        "test_cases": [
            {"id": "1", "input": {"a": 0}, "expected": 1, "hidden": False},
            {"id": "2", "input": {"a": 1}, "expected": 0, "hidden": True},
        ],
        "solution_hints": ["Gate primitive: `not (y, a);`", "Dataflow: `assign y = ~a;`"],
    },
    {
        "id": "ece-06-and-gate",
        "slug": "verilog-and-gate",
        "title": "Verilog AND Gate Primitive",
        "discipline": "ece-verilog",
        "difficulty": "Easy",
        "topic": "Logic Gates",
        "language": "verilog",
        "order_index": 5,
        "xp_reward": 40,
        "tags": ["Logic Gates", "Verilog", "AND", "Truth Table"],
        "description": """### Problem Statement
Implement a two-input AND gate. The output is high only when both inputs are high.

Use the interface `module and_gate(input wire a, input wire b, output wire y);`.""",
        "starter_code": """module and_gate(input wire a, input wire b, output wire y);
    // TODO: implement y = a AND b
endmodule
""",
        "test_cases": [
            {"id": "1", "input": {"a": 0, "b": 0}, "expected": 0, "hidden": False},
            {"id": "2", "input": {"a": 1, "b": 1}, "expected": 1, "hidden": True},
        ],
        "solution_hints": ["Gate primitive: `and (y, a, b);`", "Dataflow: `assign y = a & b;`"],
    },
    {
        "id": "ece-07-or-gate",
        "slug": "verilog-or-gate",
        "title": "Verilog OR Gate Primitive",
        "discipline": "ece-verilog",
        "difficulty": "Easy",
        "topic": "Logic Gates",
        "language": "verilog",
        "order_index": 6,
        "xp_reward": 40,
        "tags": ["Logic Gates", "Verilog", "OR", "Truth Table"],
        "description": """### Problem Statement
Implement a two-input OR gate. The output is low only when both inputs are low.

Use the interface `module or_gate(input wire a, input wire b, output wire y);`.""",
        "starter_code": """module or_gate(input wire a, input wire b, output wire y);
    // TODO: implement y = a OR b
endmodule
""",
        "test_cases": [
            {"id": "1", "input": {"a": 0, "b": 0}, "expected": 0, "hidden": False},
            {"id": "2", "input": {"a": 1, "b": 0}, "expected": 1, "hidden": True},
        ],
        "solution_hints": ["Gate primitive: `or (y, a, b);`", "Dataflow: `assign y = a | b;`"],
    },

    # ==========================================
    # 3. ECE - MATLAB / Signals, DSP and communications
    # ==========================================
    {
        "id": "ece-matlab-01-sampling",
        "slug": "matlab-alias-frequency",
        "title": "MATLAB Sampling: Calculate the Alias Frequency",
        "discipline": "ece-matlab",
        "difficulty": "Easy",
        "topic": "Signals & Systems · Sampling",
        "language": "matlab",
        "order_index": 1,
        "xp_reward": 60,
        "tags": ["MATLAB", "Signals", "Sampling", "Nyquist", "Aliasing"],
        "description": """### Problem Statement
Return the apparent frequency of a sinusoid after sampling. Fold `f0` into the first Nyquist zone with `abs(mod(f0 + fs/2, fs) - fs/2)`.""",
        "starter_code": """function alias = alias_frequency(fs, f0)
    % Return the folded frequency in the first Nyquist zone.
    alias = 0;
end
""",
        "test_cases": [
            {"id": "1", "input": {"fs": 8000, "f0": 1000}, "expected": 1000, "entry_point": "alias_frequency", "hidden": False},
            {"id": "2", "input": {"fs": 8000, "f0": 7000}, "expected": 1000, "entry_point": "alias_frequency", "hidden": False},
            {"id": "3", "input": {"fs": 8000, "f0": 5000}, "expected": 3000, "entry_point": "alias_frequency", "hidden": True},
        ],
        "solution_hints": ["Wrap with `mod` and fold around `fs/2`.", "The result should be non-negative and no larger than the Nyquist frequency."],
    },
    {
        "id": "ece-matlab-02-convolution",
        "slug": "matlab-discrete-convolution",
        "title": "MATLAB DSP: Discrete Convolution",
        "discipline": "ece-matlab",
        "difficulty": "Easy",
        "topic": "DSP · LTI Systems",
        "language": "matlab",
        "order_index": 2,
        "xp_reward": 70,
        "tags": ["MATLAB", "DSP", "Convolution", "LTI"],
        "description": """### Problem Statement
Implement the complete finite-length linear convolution `y = discrete_convolution(x, h)`.""",
        "starter_code": """function y = discrete_convolution(x, h)
    % Compute y[n] = x[n] * h[n].
    y = [];
end
""",
        "test_cases": [
            {"id": "1", "input": {"x": [1, 2, 1], "h": [1, -1, 2]}, "expected": [1, 1, 1, 3, 2], "entry_point": "discrete_convolution", "hidden": False},
            {"id": "2", "input": {"x": [1, 0, -1], "h": [2, 2]}, "expected": [2, 2, -2, -2], "entry_point": "discrete_convolution", "hidden": False},
            {"id": "3", "input": {"x": [2, 3], "h": [4]}, "expected": [8, 12], "entry_point": "discrete_convolution", "hidden": True},
        ],
        "solution_hints": ["`conv(x, h)` returns the full output.", "The output length is `length(x) + length(h) - 1`."],
    },
    {
        "id": "ece-matlab-03-fft-spectrum",
        "slug": "matlab-fft-bin-spacing",
        "title": "MATLAB DSP: FFT Bin Spacing",
        "discipline": "ece-matlab",
        "difficulty": "Easy",
        "topic": "DSP · DFT and FFT",
        "language": "matlab",
        "order_index": 3,
        "xp_reward": 65,
        "tags": ["MATLAB", "DSP", "DFT", "FFT", "Spectrum"],
        "description": """### Problem Statement
Return the frequency resolution of an N-point DFT: `delta_f = fs/N`.""",
        "starter_code": """function delta_f = fft_bin_spacing(fs, N)
    % Return the frequency resolution of an N-point DFT.
    delta_f = 0;
end
""",
        "test_cases": [
            {"id": "1", "input": {"fs": 8000, "N": 1024}, "expected": 7.8125, "entry_point": "fft_bin_spacing", "hidden": False},
            {"id": "2", "input": {"fs": 48000, "N": 4096}, "expected": 11.71875, "entry_point": "fft_bin_spacing", "hidden": False},
            {"id": "3", "input": {"fs": 1000, "N": 100}, "expected": 10, "entry_point": "fft_bin_spacing", "hidden": True},
        ],
        "solution_hints": ["The sampling rate is the full frequency span.", "Divide by the number of DFT bins."],
    },
    {
        "id": "ece-matlab-04-bpsk-symbols",
        "slug": "matlab-bpsk-symbol-mapping",
        "title": "MATLAB Communications: BPSK Symbol Mapping",
        "discipline": "ece-matlab",
        "difficulty": "Easy",
        "topic": "Communication Systems · Digital Modulation",
        "language": "matlab",
        "order_index": 4,
        "xp_reward": 70,
        "tags": ["MATLAB", "Communications", "BPSK", "Modulation"],
        "description": """### Problem Statement
Map binary bits to antipodal BPSK symbols: `1 -> +1` and `0 -> -1`.""",
        "starter_code": """function symbols = bpsk_map(bits)
    % Map 0 -> -1 and 1 -> +1.
    symbols = zeros(size(bits));
end
""",
        "test_cases": [
            {"id": "1", "input": {"bits": [1, 0, 1, 1, 0]}, "expected": [1, -1, 1, 1, -1], "entry_point": "bpsk_map", "hidden": False},
            {"id": "2", "input": {"bits": [0, 0, 1]}, "expected": [-1, -1, 1], "entry_point": "bpsk_map", "hidden": False},
            {"id": "3", "input": {"bits": [1, 1, 1, 0]}, "expected": [1, 1, 1, -1], "entry_point": "bpsk_map", "hidden": True},
        ],
        "solution_hints": ["The vectorized affine mapping is `2 * bits - 1`.", "Preserve the input shape."],
    },

    # ==========================================
    # 4. ECE - Embedded C
    # ==========================================
    {
        "id": "ece-03-gpio-bit-toggle",
        "slug": "embedded-c-gpio-toggle",
        "title": "GPIO Bitwise Register Manipulation",
        "discipline": "ece-embedded",
        "difficulty": "Easy",
        "topic": "Microcontroller Hardware Abstraction",
        "language": "c",
        "order_index": 1,
        "xp_reward": 85,
        "tags": ["Embedded C", "Bitwise", "GPIO", "Microcontrollers"],
        "description": """### Problem Statement
In bare-metal embedded programming, peripheral hardware is controlled by toggling bits in memory-mapped I/O registers.

Implement the function:
```c
uint8_t toggle_pin(uint8_t port_val, uint8_t pin_num);
```
Where:
* `port_val` represents an 8-bit GPIO Output Data Register (ODR).
* `pin_num` is the pin index ($0 \\le pin\\_num \\le 7$).
* The function must invert (toggle) the specific bit at `pin_num` without altering any other bits in `port_val`.

#### Example:
* `toggle_pin(0x00, 3)` -> bit 3 becomes 1 -> returns `0x08` (8 decimal).
* `toggle_pin(0xFF, 3)` -> bit 3 becomes 0 -> returns `0xF7` (247 decimal).""",
        "starter_code": """#include <stdint.h>

uint8_t toggle_pin(uint8_t port_val, uint8_t pin_num) {
    // TODO: Use bitwise XOR (^) with a bitmask to toggle the target pin
    return 0;
}
""",
        "test_cases": [
            {"id": "1", "input": "0 3", "expected": "8", "hidden": False},
            {"id": "2", "input": "255 3", "expected": "247", "hidden": False},
            {"id": "3", "input": "16 4", "expected": "0", "hidden": True}
        ],
        "solution_hints": [
            "Create a bitmask using `(1U << pin_num)`.",
            "Use XOR operator `^` to toggle the masked bit."
        ]
    },

    # ==========================================
    # 4. AI & Machine Learning
    # ==========================================
    {
        "id": "ai-01-perceptron-forward",
        "slug": "perceptron-forward-pass",
        "title": "Perceptron Forward Pass & Sigmoid",
        "discipline": "ai-ml",
        "difficulty": "Easy",
        "topic": "Neural Networks",
        "language": "python",
        "order_index": 1,
        "xp_reward": 90,
        "tags": ["Machine Learning", "Neural Networks", "Sigmoid", "Linear Algebra"],
        "description": """### Problem Statement
Compute the output of a single artificial neuron with weights vector $W$, bias $b$, and input vector $X$ using the Sigmoid activation function $\\sigma(z)$:

$$z = \\sum_{i=1}^n (w_i \\cdot x_i) + b$$
$$\\sigma(z) = \\frac{1}{1 + e^{-z}}$$

Implement `perceptron_forward(weights, inputs, bias)`. Round the output to 4 decimal places.

#### Example:
```python
weights = [0.5, -0.5]
inputs = [1.0, 2.0]
bias = 0.0
# z = (0.5*1.0) + (-0.5*2.0) + 0.0 = -0.5
# sigmoid(-0.5) = 1 / (1 + exp(0.5)) ~= 0.3775
```""",
        "starter_code": """import math

def perceptron_forward(weights, inputs, bias):
    \"\"\"
    :type weights: List[float]
    :type inputs: List[float]
    :type bias: float
    :rtype: float
    \"\"\"
    # TODO: Calculate weighted dot product + bias, then apply sigmoid
    pass
""",
        "test_cases": [
            {"id": "1", "input": {"weights": [0.5, -0.5], "inputs": [1.0, 2.0], "bias": 0.0}, "expected": 0.3775, "entry_point": "perceptron_forward", "hidden": False},
            {"id": "2", "input": {"weights": [1.0, 1.0], "inputs": [0.0, 0.0], "bias": 0.0}, "expected": 0.5, "entry_point": "perceptron_forward", "hidden": False},
            {"id": "3", "input": {"weights": [2.0, 3.0], "inputs": [1.0, 1.0], "bias": -5.0}, "expected": 0.5, "entry_point": "perceptron_forward", "hidden": True}
        ],
        "solution_hints": [
            "Compute dot product `z = sum(w * x for w, x in zip(weights, inputs)) + bias`.",
            "`sigmoid(z) = 1.0 / (1.0 + math.exp(-z))`."
        ]
    },

    # ==========================================
    # 5. Cybersecurity & CTF
    # ==========================================
    {
        "id": "cyber-01-xor-cipher-decrypt",
        "slug": "ctf-xor-cipher-recovery",
        "title": "CTF: Cryptographic XOR Key Recovery",
        "discipline": "cybersecurity",
        "difficulty": "Medium",
        "topic": "Cryptography & CTF",
        "language": "python",
        "order_index": 1,
        "xp_reward": 100,
        "tags": ["Security", "CTF", "Cryptography", "XOR"],
        "description": """### Challenge Brief
During an incident response investigation, you recovered an obfuscated payload encoded with a repeating single-byte XOR key.
The ciphertext in hexadecimal is:
`15 1e 17 19 1e 28 0b 05 16 16 43 02 0f 05 02 16 1c 43 00 07 1e 43 02 05 03 4d`

Knowing that all EnginX flags begin with the known prefix `ENGINX{`, determine the secret single-byte XOR key, decrypt the payload, and return the complete captured flag!

#### Flag Format:
`ENGINX{...}`""",
        "starter_code": """def decrypt_xor_flag():
    hex_ciphertext = "151e17191e280b05161643020f0502161c4300071e430205034d"
    # TODO: Recover key by XORing ciphertext[0] with ord('E')
    # Decrypt and return the full flag string
    return ""
""",
        "test_cases": [
            {"id": "1", "input": {}, "expected": "ENGINX{x0r_c1ph3r_cr4ck3d}", "entry_point": "decrypt_xor_flag", "hidden": False}
        ],
        "solution_hints": [
            "Because XOR is symmetric: `key = ciphertext[0] ^ ord('E')`.",
            "Once key is found, decrypt each byte by XORing with key."
        ]
    },

    # ==========================================
    # 6. Robotics & Hardware
    # ==========================================
    {
        "id": "robotics-01-forward-kinematics",
        "slug": "robotics-2dof-planar-arm",
        "title": "2-DOF Planar Arm Forward Kinematics",
        "discipline": "robotics",
        "difficulty": "Medium",
        "topic": "Kinematics & Control",
        "language": "python",
        "order_index": 1,
        "xp_reward": 95,
        "tags": ["Robotics", "Kinematics", "Trigonometry", "Simulation"],
        "description": """### Problem Statement
In robotics, forward kinematics computes the $(x, y)$ Cartesian coordinates of the end-effector given joint angles $(\\theta_1, \\theta_2)$ and link lengths $(l_1, l_2)$:

$$x = l_1 \\cos(\\theta_1) + l_2 \\cos(\\theta_1 + \\theta_2)$$
$$y = l_1 \\sin(\\theta_1) + l_2 \\sin(\\theta_1 + \\theta_2)$$

Implement `forward_kinematics(theta1_deg, theta2_deg, l1, l2)`. Convert angles from degrees to radians. Return `[round(x, 2), round(y, 2)]`.

#### Example:
* `theta1 = 0`, `theta2 = 0`, `l1 = 10.0`, `l2 = 10.0`
* Arm lies fully along the positive X-axis: $x = 20.0, y = 0.0$. Output: `[20.0, 0.0]`""",
        "starter_code": """import math

def forward_kinematics(theta1_deg, theta2_deg, l1=10.0, l2=10.0):
    \"\"\"
    :type theta1_deg: float
    :type theta2_deg: float
    :type l1: float
    :type l2: float
    :rtype: List[float]
    \"\"\"
    # TODO: Convert degrees to radians and calculate end effector (x, y)
    pass
""",
        "test_cases": [
            {"id": "1", "input": {"theta1_deg": 0.0, "theta2_deg": 0.0, "l1": 10.0, "l2": 10.0}, "expected": [20.0, 0.0], "entry_point": "forward_kinematics", "hidden": False},
            {"id": "2", "input": {"theta1_deg": 90.0, "theta2_deg": 0.0, "l1": 10.0, "l2": 10.0}, "expected": [0.0, 20.0], "entry_point": "forward_kinematics", "hidden": False},
            {"id": "3", "input": {"theta1_deg": 45.0, "theta2_deg": -45.0, "l1": 10.0, "l2": 10.0}, "expected": [17.07, 7.07], "entry_point": "forward_kinematics", "hidden": True}
        ],
        "solution_hints": [
            "Use `math.radians()` to convert joint degree inputs to radians.",
            "Remember that the second link orientation is `theta1 + theta2`."
        ]
    },
    {
        "id": "hardware-01-2to1-multiplexer",
        "slug": "logic-2to1-multiplexer",
        "title": "2-to-1 Multiplexer (MUX)",
        "discipline": "hardware",
        "difficulty": "Easy",
        "topic": "Digital Logic Gates",
        "language": "verilog",
        "order_index": 1,
        "xp_reward": 70,
        "tags": ["Logic Gates", "Digital Design", "Hardware", "Multiplexer"],
        "description": """### Problem Statement
A **2-to-1 Multiplexer** selects between two input signals `a` and `b` based on a select line `sel`.

* When `sel == 1'b0`, `out = a`
* When `sel == 1'b1`, `out = b`

#### Port Interface:
```verilog
module mux2to1(
    input a,
    input b,
    input sel,
    output out
);
```""",
        "starter_code": """module mux2to1(
    input a,
    input b,
    input sel,
    output out
);
    // TODO: Implement 2-to-1 MUX logic
    // assign out = sel ? b : a;

endmodule
""",
        "test_cases": [
            {"id": "1", "input": {"a": 0, "b": 1, "sel": 0}, "expected": 0, "hidden": False},
            {"id": "2", "input": {"a": 0, "b": 1, "sel": 1}, "expected": 1, "hidden": False},
            {"id": "3", "input": {"a": 1, "b": 0, "sel": 1}, "expected": 0, "hidden": True}
        ],
        "solution_hints": [
            "Use ternary conditional operator: `assign out = sel ? b : a;`."
        ]
    }
]

BADGES = [
    {
        "id": "badge-first-blood",
        "name": "First Pulse",
        "description": "Successfully completed your first engineering challenge.",
        "icon": "Zap",
        "discipline": "all",
        "criteria": {"first_submission": True},
        "xp_bonus": 100
    },
    {
        "id": "badge-verilog-virtuoso",
        "name": "Verilog Virtuoso",
        "description": "Synthesized digital logic circuits in Verilog HDL.",
        "icon": "Cpu",
        "discipline": "ece-verilog",
        "criteria": {"discipline": "ece-verilog", "completed": 1},
        "xp_bonus": 150
    },
    {
        "id": "badge-embedded-master",
        "name": "Silicon Hacker",
        "description": "Mastered bare-metal microcontroller bitwise register operations.",
        "icon": "CircuitBoard",
        "discipline": "ece-embedded",
        "criteria": {"discipline": "ece-embedded", "completed": 1},
        "xp_bonus": 150
    },
    {
        "id": "badge-neural-architect",
        "name": "Neural Architect",
        "description": "Engineered forward pass and activation layers in AI/ML.",
        "icon": "Brain",
        "discipline": "ai-ml",
        "criteria": {"discipline": "ai-ml", "completed": 1},
        "xp_bonus": 150
    },
    {
        "id": "badge-ctf-hunter",
        "name": "CTF Hunter",
        "description": "Cracked cryptographic keys and extracted security flags.",
        "icon": "ShieldCheck",
        "discipline": "cybersecurity",
        "criteria": {"discipline": "cybersecurity", "completed": 1},
        "xp_bonus": 200
    },
    {
        "id": "badge-kinematics-commander",
        "name": "Kinematics Commander",
        "description": "Solved robotic arm joint kinematics in 2D coordinate space.",
        "icon": "Bot",
        "discipline": "robotics",
        "criteria": {"discipline": "robotics", "completed": 1},
        "xp_bonus": 150
    }
]

def seed_database(db):
    """Populates challenges, badges, and demo users into database"""
    # 1. Seed Challenges
    for ch_data in CHALLENGES:
        existing = db.query(Challenge).filter(Challenge.id == ch_data["id"]).first()
        if not existing:
            ch = Challenge(**ch_data)
            db.add(ch)

    # 2. Seed Badges
    for b_data in BADGES:
        existing = db.query(Badge).filter(Badge.id == b_data["id"]).first()
        if not existing:
            b = Badge(**b_data)
            db.add(b)

    # 3. Seed Demo User
    demo_user = db.query(User).filter(User.email == "student@enginx.dev").first()
    if not demo_user:
        demo_user = User(
            email="student@enginx.dev",
            name="Alex Rivera",
            primary_role="ECE",
            avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=Alex",
            xp=210,
            streak_days=5
        )
        db.add(demo_user)

    db.commit()
