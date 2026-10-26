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
import json
import logging
from pathlib import Path

from models import Challenge, Badge, User

logger = logging.getLogger(__name__)

# The HDL coding bank (Verilog / SystemVerilog / RTL) is authored once as JSON
# under the frontend and seeded from here so submissions can be graded with the
# server-owned test cases. Loading is best-effort: a missing directory or a
# malformed file logs and continues — bank seeding must never block startup.
BANK_SEED_DIR = Path(__file__).resolve().parent.parent / "frontend" / "src" / "data" / "challengeBank"

_CHALLENGE_MODEL_FIELDS = {
    "id", "slug", "title", "discipline", "difficulty", "topic", "description",
    "starter_code", "language", "test_cases", "solution_hints",
    "time_limit_ms", "memory_limit_mb", "tags", "xp_reward", "order_index",
}


def seed_bank_challenges(db) -> int:
    """Seed the JSON-authored HDL challenge bank. Returns rows added."""
    if not BANK_SEED_DIR.is_dir():
        logger.info("Challenge bank directory not found; skipping bank seed: %s", BANK_SEED_DIR)
        return 0

    added = 0
    for bank_file in sorted(BANK_SEED_DIR.glob("*.json")):
        try:
            records = json.loads(bank_file.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            logger.exception("Skipping unreadable challenge bank file: %s", bank_file.name)
            continue
        if not isinstance(records, list):
            logger.warning("Challenge bank file is not a list; skipping: %s", bank_file.name)
            continue
        for record in records:
            if not isinstance(record, dict) or "id" not in record:
                continue
            existing = db.query(Challenge).filter(Challenge.id == record["id"]).first()
            if existing:
                continue
            fields = {key: value for key, value in record.items() if key in _CHALLENGE_MODEL_FIELDS}
            db.add(Challenge(**fields))
            added += 1
    if added:
        logger.info("Seeded %d challenge-bank questions.", added)
    return added

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
* $-10^9 \\le target \\le 10^9$
* Only one valid answer exists.
* Target time complexity: $\\mathcal{O}(n)$.
* Space complexity: $\\mathcal{O}(n)$.

#### Example 1:
```python
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: Because nums[0] + nums[1] == 2 + 7 == 9, return [0, 1].
```

#### Example 2:
```python
Input: nums = [3, 2, 4], target = 6
Output: [1, 2]
Explanation: Because nums[1] + nums[2] == 2 + 4 == 6, return [1, 2].
```

#### Example 3:
```python
Input: nums = [3, 3], target = 6
Output: [0, 1]
Explanation: Because nums[0] + nums[1] == 3 + 3 == 6, return [0, 1].
```

#### Example 4:
```python
Input: nums = [-1, -2, -3, -4, -5], target = -8
Output: [2, 4]
Explanation: Because nums[2] + nums[4] == -3 + (-5) == -8, return [2, 4].
```""",
        "starter_code": """def two_sum(nums, target):
    \"\"\"
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    \"\"\"
    # TODO: Write your O(n) hash map solution here
    lookup = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in lookup:
            return [lookup[diff], i]
        lookup[num] = i
    return []
""",
        "test_cases": [
            {"id": "1", "input": {"nums": [2, 7, 11, 15], "target": 9}, "expected": [0, 1], "entry_point": "two_sum", "hidden": False},
            {"id": "2", "input": {"nums": [3, 2, 4], "target": 6}, "expected": [1, 2], "entry_point": "two_sum", "hidden": False},
            {"id": "3", "input": {"nums": [3, 3], "target": 6}, "expected": [0, 1], "entry_point": "two_sum", "hidden": False},
            {"id": "4", "input": {"nums": [-1, -2, -3, -4, -5], "target": -8}, "expected": [2, 4], "entry_point": "two_sum", "hidden": True},
            {"id": "5", "input": {"nums": [0, 4, 3, 0], "target": 0}, "expected": [0, 3], "entry_point": "two_sum", "hidden": True},
            {"id": "6", "input": {"nums": [1000000000, 500, -1000000000], "target": 0}, "expected": [0, 2], "entry_point": "two_sum", "hidden": True}
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
Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, return its index. Otherwise, return `-1`.

You must write an algorithm with $\\mathcal{O}(\\log n)$ runtime complexity and $\\mathcal{O}(1)$ auxiliary space complexity.

#### Constraints:
* $1 \\le \\text{len}(nums) \\le 10^4$
* $-10^4 < nums[i], target < 10^4$
* All integers in `nums` are unique.
* `nums` is sorted in ascending order.

#### Example 1:
```python
Input: nums = [-1, 0, 3, 5, 9, 12], target = 9
Output: 4
Explanation: 9 exists in nums and its index is 4.
```

#### Example 2:
```python
Input: nums = [-1, 0, 3, 5, 9, 12], target = 2
Output: -1
Explanation: 2 does not exist in nums, so return -1.
```

#### Example 3:
```python
Input: nums = [5], target = 5
Output: 0
Explanation: The array has a single element equal to target, located at index 0.
```

#### Example 4:
```python
Input: nums = [1, 3, 5, 7, 9, 11], target = 1
Output: 0
Explanation: 1 is the first element of nums, located at index 0.
```""",
        "starter_code": """def search(nums, target):
    \"\"\"
    :type nums: List[int]
    :type target: int
    :rtype: int
    \"\"\"
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
""",
        "test_cases": [
            {"id": "1", "input": {"nums": [-1, 0, 3, 5, 9, 12], "target": 9}, "expected": 4, "entry_point": "search", "hidden": False},
            {"id": "2", "input": {"nums": [-1, 0, 3, 5, 9, 12], "target": 2}, "expected": -1, "entry_point": "search", "hidden": False},
            {"id": "3", "input": {"nums": [5], "target": 5}, "expected": 0, "entry_point": "search", "hidden": False},
            {"id": "4", "input": {"nums": [1, 3, 5, 7, 9, 11], "target": 1}, "expected": 0, "entry_point": "search", "hidden": True},
            {"id": "5", "input": {"nums": [1, 3, 5, 7, 9, 11], "target": 11}, "expected": 5, "entry_point": "search", "hidden": True},
            {"id": "6", "input": {"nums": [2, 4, 6, 8, 10], "target": 12}, "expected": -1, "entry_point": "search", "hidden": True}
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
Design a synthesizable **4-bit Ripple Carry Adder** in Verilog.
The module accepts two 4-bit unsigned binary operands `a[3:0]` and `b[3:0]`, alongside a 1-bit carry-in `cin`. It produces a 4-bit `sum[3:0]` and a 1-bit carry-out `cout`.

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

#### Signal & Arithmetic Specifications:
* $\\{cout, sum[3:0]\\} = a[3:0] + b[3:0] + cin$
* Maximum operand sum: $15 + 15 + 1 = 31$ (`5'b11111`).
* Continuous assignment concatenation or instantiated full adder stages are accepted.

#### Example 1:
```verilog
Input: a = 4'd5 (4'b0101), b = 4'd3 (4'b0011), cin = 1'b0
Output: sum = 4'd8 (4'b1000), cout = 1'b0
Explanation: 5 + 3 + 0 = 8. In 5-bit binary: 5'b01000. Result fits in 4 bits; carry-out is 0.
```

#### Example 2:
```verilog
Input: a = 4'd10 (4'b1010), b = 4'd7 (4'b0111), cin = 1'b1
Output: sum = 4'd2 (4'b0010), cout = 1'b1
Explanation: 10 + 7 + 1 = 18 = 16 + 2. In 5-bit binary: 5'b10010. Cout is 1 and sum is 2.
```

#### Example 3:
```verilog
Input: a = 4'd15 (4'b1111), b = 4'd15 (4'b1111), cin = 1'b1
Output: sum = 4'd15 (4'b1111), cout = 1'b1
Explanation: 15 + 15 + 1 = 31 = 16 + 15. In 5-bit binary: 5'b11111. Both cout and sum are fully high.
```""",
        "starter_code": """module ripple_carry_adder(
    input  [3:0] a,
    input  [3:0] b,
    input        cin,
    output [3:0] sum,
    output       cout
);
    // Continuous assignment concatenation
    assign {cout, sum} = a + b + cin;

endmodule
""",
        "test_cases": [
            {"id": "1", "input": {"a": 5, "b": 3, "cin": 0}, "expected": {"sum": 8, "cout": 0}, "hidden": False},
            {"id": "2", "input": {"a": 10, "b": 7, "cin": 1}, "expected": {"sum": 2, "cout": 1}, "hidden": False},
            {"id": "3", "input": {"a": 0, "b": 0, "cin": 0}, "expected": {"sum": 0, "cout": 0}, "hidden": False},
            {"id": "4", "input": {"a": 15, "b": 15, "cin": 1}, "expected": {"sum": 15, "cout": 1}, "hidden": True},
            {"id": "5", "input": {"a": 8, "b": 8, "cin": 0}, "expected": {"sum": 0, "cout": 1}, "hidden": True},
            {"id": "6", "input": {"a": 9, "b": 6, "cin": 1}, "expected": {"sum": 0, "cout": 1}, "hidden": True}
        ],
        "solution_hints": [
            "In Verilog, you can express addition compactly using concatenation: `assign {cout, sum} = a + b + cin;`.",
            "Make sure vector bit-widths match the port specification."
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

Sequential logic circuits rely on memory elements synchronized to a clock edge. On every rising edge of `clk` (`posedge clk`):
* If `rst == 1'b1`, the stored output `q` must clear to `1'b0` immediately.
* If `rst == 1'b0`, the output `q` must latch the current state of data input `d`.

#### Module Port Interface:
```verilog
module d_flip_flop(
    input      clk,
    input      rst,
    input      d,
    output reg q
);
```

#### State Transition Table:
| clk | rst | d | q (next) | Operation |
| :---: | :---: | :---: | :---: | :--- |
| $\\uparrow$ | 1 | X | 0 | Synchronous Reset (Clears output) |
| $\\uparrow$ | 0 | 0 | 0 | Latch Data 0 |
| $\\uparrow$ | 0 | 1 | 1 | Latch Data 1 |

#### Example 1:
```verilog
Input: rst = 0, d = 1
Output: q = 1
Explanation: Reset is inactive (0). On posedge clk, data input d = 1 is latched into register q.
```

#### Example 2:
```verilog
Input: rst = 1, d = 1
Output: q = 0
Explanation: Active-high reset is asserted (rst = 1). Synchronous reset overrides d, clearing q to 0.
```

#### Example 3:
```verilog
Input: rst = 0, d = 0
Output: q = 0
Explanation: Reset is inactive (rst = 0) and d = 0, so q stores 0.
```""",
        "starter_code": """module d_flip_flop(
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
""",
        "test_cases": [
            {"id": "1", "input": {"rst": 1, "d": 1}, "expected": {"q": 0}, "hidden": False},
            {"id": "2", "input": {"rst": 0, "d": 1}, "expected": {"q": 1}, "hidden": False},
            {"id": "3", "input": {"rst": 0, "d": 0}, "expected": {"q": 0}, "hidden": False},
            {"id": "4", "input": {"rst": 1, "d": 0}, "expected": {"q": 0}, "hidden": True},
            {"id": "5", "input": {"rst": 0, "d": 1}, "expected": {"q": 1}, "hidden": True}
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
Build a synthesizable 2-input **Half Adder** in Verilog.
The half adder is the fundamental building block of digital arithmetic. It accepts two 1-bit binary inputs `a` and `b`, producing a 1-bit `sum` and a 1-bit `carry`.

#### Module Port Interface:
```verilog
module half_adder(
    input  wire a,
    input  wire b,
    output wire sum,
    output wire carry
);
```

#### Truth Table:
| a | b | sum ($a \\oplus b$) | carry ($a \\land b$) | Arithmetic Value ($2 \\cdot carry + sum$) |
|---|---|-----|-------|-------------------|
| 0 | 0 | 0 | 0 | $0 + 0 = 0$ |
| 0 | 1 | 1 | 0 | $0 + 1 = 1$ |
| 1 | 0 | 1 | 0 | $1 + 0 = 1$ |
| 1 | 1 | 0 | 1 | $1 + 1 = 2$ ($10_2$) |

#### Example 1:
```verilog
Input: a = 0, b = 1
Output: sum = 1, carry = 0
Explanation: 0 + 1 = 1. Inputs differ, so XOR sum is 1. Both inputs are not high, so carry is 0.
```

#### Example 2:
```verilog
Input: a = 1, b = 1
Output: sum = 0, carry = 1
Explanation: 1 + 1 = 2 (binary 10). Both inputs are high, producing carry = 1 and sum = 0.
```

#### Example 3:
```verilog
Input: a = 0, b = 0
Output: sum = 0, carry = 0
Explanation: 0 + 0 = 0. Both sum and carry outputs remain low (0).
```""",
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
            {"id": "5", "input": {"a": 0, "b": 1}, "expected": {"sum": 1, "carry": 0}, "hidden": True}
        ],
        "solution_hints": [
            "Use `assign sum = a ^ b;` for the sum bit.",
            "Use `assign carry = a & b;` for the carry bit."
        ]
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
Design a 1-bit **NOT Gate** (logical inverter) in synthesizable Verilog.
The inverter is the elementary unary logic gate: the output signal `y` is the logical complement of the input signal `a`. When `a` is 0, `y` is driven to 1; when `a` is 1, `y` is driven to 0.

#### Module Port Interface:
```verilog
module not_gate(
    input  wire a,
    output wire y
);
```

#### Truth Table:
| a | y ($\\neg a$) |
|---|---|
| 0 | 1 |
| 1 | 0 |

#### Example 1:
```verilog
Input: a = 0
Output: y = 1
Explanation: The logical negation of binary 0 is 1 (~0 == 1).
```

#### Example 2:
```verilog
Input: a = 1
Output: y = 0
Explanation: The logical negation of binary 1 is 0 (~1 == 0).
```""",
        "starter_code": """module not_gate(input wire a, output wire y);
    // TODO: implement y = NOT a
endmodule
""",
        "test_cases": [
            {"id": "1", "input": {"a": 0}, "expected": 1, "hidden": False},
            {"id": "2", "input": {"a": 1}, "expected": 0, "hidden": False},
            {"id": "3", "input": {"a": 0}, "expected": 1, "hidden": True},
            {"id": "4", "input": {"a": 1}, "expected": 0, "hidden": True}
        ],
        "solution_hints": ["Gate primitive: `not (y, a);`", "Dataflow: `assign y = ~a;`"]
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
Design a 2-input **AND Gate** in synthesizable Verilog.
The AND gate performs logical conjunction over binary inputs `a` and `b`. The output `y` is driven high (`1`) if and only if both `a` and `b` are high (`1`).

#### Module Port Interface:
```verilog
module and_gate(
    input  wire a,
    input  wire b,
    output wire y
);
```

#### Truth Table:
| a | b | y ($a \\cdot b$) |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 0 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

#### Example 1:
```verilog
Input: a = 1, b = 1
Output: y = 1
Explanation: Both inputs a and b are 1, so the AND gate evaluates to true (1 & 1 == 1).
```

#### Example 2:
```verilog
Input: a = 1, b = 0
Output: y = 0
Explanation: Input b is 0, so the AND condition is false (1 & 0 == 0).
```

#### Example 3:
```verilog
Input: a = 0, b = 1
Output: y = 0
Explanation: Input a is 0, so the conjunction evaluates to 0 (0 & 1 == 0).
```""",
        "starter_code": """module and_gate(input wire a, input wire b, output wire y);
    // TODO: implement y = a AND b
endmodule
""",
        "test_cases": [
            {"id": "1", "input": {"a": 0, "b": 0}, "expected": 0, "hidden": False},
            {"id": "2", "input": {"a": 0, "b": 1}, "expected": 0, "hidden": False},
            {"id": "3", "input": {"a": 1, "b": 0}, "expected": 0, "hidden": False},
            {"id": "4", "input": {"a": 1, "b": 1}, "expected": 1, "hidden": False},
            {"id": "5", "input": {"a": 1, "b": 1}, "expected": 1, "hidden": True}
        ],
        "solution_hints": ["Gate primitive: `and (y, a, b);`", "Dataflow: `assign y = a & b;`"]
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
Design a 2-input **OR Gate** in synthesizable Verilog.
The OR gate performs logical disjunction over binary inputs `a` and `b`. The output `y` is driven high (`1`) if at least one of the inputs `a` or `b` is high (`1`), and is low (`0`) only when both inputs are low (`0`).

#### Module Port Interface:
```verilog
module or_gate(
    input  wire a,
    input  wire b,
    output wire y
);
```

#### Truth Table:
| a | b | y ($a + b$) |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 1 |

#### Example 1:
```verilog
Input: a = 0, b = 1
Output: y = 1
Explanation: At least one input is high (b = 1), so the OR gate evaluates to 1 (0 | 1 == 1).
```

#### Example 2:
```verilog
Input: a = 0, b = 0
Output: y = 0
Explanation: Neither input is high, so the OR gate evaluates to 0 (0 | 0 == 0).
```

#### Example 3:
```verilog
Input: a = 1, b = 1
Output: y = 1
Explanation: Both inputs are high, satisfying the disjunction (1 | 1 == 1).
```""",
        "starter_code": """module or_gate(input wire a, input wire b, output wire y);
    // TODO: implement y = a OR b
endmodule
""",
        "test_cases": [
            {"id": "1", "input": {"a": 0, "b": 0}, "expected": 0, "hidden": False},
            {"id": "2", "input": {"a": 0, "b": 1}, "expected": 1, "hidden": False},
            {"id": "3", "input": {"a": 1, "b": 0}, "expected": 1, "hidden": False},
            {"id": "4", "input": {"a": 1, "b": 1}, "expected": 1, "hidden": False},
            {"id": "5", "input": {"a": 1, "b": 0}, "expected": 1, "hidden": True}
        ],
        "solution_hints": ["Gate primitive: `or (y, a, b);`", "Dataflow: `assign y = a | b;`"]
    },

    # ==========================================
    # 3. ECE - MATLAB / Signals, DSP & Communications
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
In digital signal processing, sampling a continuous-time real sinusoid with frequency $f_0\\text{ Hz}$ at sampling rate $f_s\\text{ Hz}$ causes any spectral content beyond the Nyquist boundary ($f_s / 2$) to fold back into the primary Nyquist zone $[0, f_s / 2]$.

Write a MATLAB-compatible function `alias = alias_frequency(fs, f0)` that calculates the apparent (folded) frequency in Hz:
$$\\text{alias} = \\left| \\left( (f_0 + \\frac{f_s}{2}) \\pmod{f_s} \\right) - \\frac{f_s}{2} \\right|$$

#### Constraints:
* $fs > 0$, $f0 \\ge 0$.
* Return a non-negative scalar in Hz within $[0, fs / 2]$.

#### Example 1:
```matlab
Input: fs = 8000, f0 = 1000
Output: 1000
Explanation: The signal frequency f0 = 1000 Hz is well below the Nyquist rate (fs/2 = 4000 Hz). No aliasing occurs, and apparent frequency is 1000 Hz.
```

#### Example 2:
```matlab
Input: fs = 8000, f0 = 7000
Output: 1000
Explanation: f0 = 7000 Hz exceeds the Nyquist limit of 4000 Hz. It folds back across fs (8000 - 7000 = 1000 Hz).
```

#### Example 3:
```matlab
Input: fs = 8000, f0 = 5000
Output: 3000
Explanation: f0 = 5000 Hz folds across the Nyquist limit (4000 Hz) to |8000 - 5000| = 3000 Hz.
```""",
        "starter_code": """function alias = alias_frequency(fs, f0)
    % Return the folded frequency in the first Nyquist zone.
    % TODO: use modulo arithmetic; do not call a plotting function.
    alias = 0;
end
""",
        "test_cases": [
            {"id": "1", "input": {"fs": 8000, "f0": 1000}, "expected": 1000, "entry_point": "alias_frequency", "hidden": False},
            {"id": "2", "input": {"fs": 8000, "f0": 7000}, "expected": 1000, "entry_point": "alias_frequency", "hidden": False},
            {"id": "3", "input": {"fs": 8000, "f0": 5000}, "expected": 3000, "entry_point": "alias_frequency", "hidden": False},
            {"id": "4", "input": {"fs": 10000, "f0": 5000}, "expected": 5000, "entry_point": "alias_frequency", "hidden": True},
            {"id": "5", "input": {"fs": 8000, "f0": 9000}, "expected": 1000, "entry_point": "alias_frequency", "hidden": True},
        ],
        "solution_hints": ["Use `mod` to wrap the frequency by the sample rate.", "Take the absolute value after folding around fs/2."]
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
In discrete-time linear time-invariant (LTI) systems, the response to an arbitrary input sequence $x[n]$ passing through a filter with impulse response $h[n]$ is given by the discrete convolution sum:
$$y[n] = (x * h)[n] = \\sum_{k=-\\infty}^{\\infty} x[k] h[n - k]$$

Implement `y = discrete_convolution(x, h)` for finite sequences $x$ and $h$. The output vector $y$ must preserve all valid convolution samples, having length:
$$\\text{length}(y) = \\text{length}(x) + \\text{length}(h) - 1$$

#### Constraints:
* $1 \\le \\text{length}(x), \\text{length}(h) \\le 1000$.
* Return a 1D vector containing the full linear convolution result.

#### Example 1:
```matlab
Input: x = [1, 2, 1], h = [1, -1, 2]
Output: [1, 1, 1, 3, 2]
Explanation: Output length is 3 + 3 - 1 = 5.
y[0] = 1*1 = 1
y[1] = 1*(-1) + 2*1 = 1
y[2] = 1*2 + 2*(-1) + 1*1 = 1
y[3] = 2*2 + 1*(-1) = 3
y[4] = 1*2 = 2
```

#### Example 2:
```matlab
Input: x = [1, 0, -1], h = [2, 2]
Output: [2, 2, -2, -2]
Explanation: Convolving [1, 0, -1] with [2, 2] yields 4 samples: [2, 2, -2, -2].
```

#### Example 3:
```matlab
Input: x = [2, 3], h = [4]
Output: [8, 12]
Explanation: Convolving a sequence with an impulse of weight 4 scales all elements by 4: [2*4, 3*4] = [8, 12].
```""",
        "starter_code": """function y = discrete_convolution(x, h)
    % Compute the finite-length linear convolution y[n] = x[n] * h[n].
    % TODO: preserve the complete output sequence.
    y = [];
end
""",
        "test_cases": [
            {"id": "1", "input": {"x": [1, 2, 1], "h": [1, -1, 2]}, "expected": [1, 1, 1, 3, 2], "entry_point": "discrete_convolution", "hidden": False},
            {"id": "2", "input": {"x": [1, 0, -1], "h": [2, 2]}, "expected": [2, 2, -2, -2], "entry_point": "discrete_convolution", "hidden": False},
            {"id": "3", "input": {"x": [2, 3], "h": [4]}, "expected": [8, 12], "entry_point": "discrete_convolution", "hidden": False},
            {"id": "4", "input": {"x": [1, 1], "h": [1, 1]}, "expected": [1, 2, 1], "entry_point": "discrete_convolution", "hidden": True},
            {"id": "5", "input": {"x": [1, -1], "h": [1, 1]}, "expected": [1, 0, -1], "entry_point": "discrete_convolution", "hidden": True},
        ],
        "solution_hints": ["The built-in `conv(x, h)` returns the full linear convolution.", "Check the output length before inspecting the values."]
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
When analyzing frequency spectra using the Discrete Fourier Transform (DFT / FFT), an $N$-point DFT computed at sample rate $f_s\\text{ Hz}$ subdivides the continuous frequency span $[0, f_s)$ into $N$ uniformly spaced frequency bins.

Write a MATLAB-compatible function `delta_f = fft_bin_spacing(fs, N)` that returns the frequency resolution (bin spacing) $\\Delta f$ in Hz:
$$\\Delta f = \\frac{f_s}{N}$$

#### Constraints:
* $fs > 0$, $N \\ge 1$.
* Return an unrounded double-precision scalar representing bin spacing in Hz.

#### Example 1:
```matlab
Input: fs = 8000, N = 1024
Output: 7.8125
Explanation: delta_f = 8000 / 1024 = 7.8125 Hz. Each DFT bin covers 7.8125 Hz of spectral resolution.
```

#### Example 2:
```matlab
Input: fs = 48000, N = 4096
Output: 11.71875
Explanation: delta_f = 48000 / 4096 = 11.71875 Hz.
```

#### Example 3:
```matlab
Input: fs = 1000, N = 100
Output: 10
Explanation: delta_f = 1000 / 100 = 10 Hz.
```""",
        "starter_code": """function delta_f = fft_bin_spacing(fs, N)
    % Return the frequency resolution of an N-point DFT.
    delta_f = 0;
end
""",
        "test_cases": [
            {"id": "1", "input": {"fs": 8000, "N": 1024}, "expected": 7.8125, "entry_point": "fft_bin_spacing", "hidden": False},
            {"id": "2", "input": {"fs": 48000, "N": 4096}, "expected": 11.71875, "entry_point": "fft_bin_spacing", "hidden": False},
            {"id": "3", "input": {"fs": 1000, "N": 100}, "expected": 10, "entry_point": "fft_bin_spacing", "hidden": False},
            {"id": "4", "input": {"fs": 44100, "N": 2048}, "expected": 21.533203125, "entry_point": "fft_bin_spacing", "hidden": True},
            {"id": "5", "input": {"fs": 16000, "N": 512}, "expected": 31.25, "entry_point": "fft_bin_spacing", "hidden": True},
        ],
        "solution_hints": ["Use the sampling rate as the total frequency span.", "The number of equal bins is N."]
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
Binary Phase Shift Keying (BPSK) is a foundational digital modulation scheme that maps incoming binary bits $b \\in \\{0, 1\\}$ into real antipodal transmission symbols $s \\in \\{-1, +1\\}$:
* Bit `1` $\\to$ `+1` (in-phase symbol)
* Bit `0` $\\to$ `-1` (inverted phase symbol)

Write a vectorized MATLAB-compatible function `symbols = bpsk_map(bits)` implementing the linear transformation:
$$\\text{symbols} = 2 \\cdot \\text{bits} - 1$$

The output vector must match the dimensions and element order of the input `bits`.

#### Constraints:
* Input `bits` contains only binary values `0` and `1`.
* Return an array of identical shape with antipodal symbols `-1` and `+1`.

#### Example 1:
```matlab
Input: bits = [1, 0, 1, 1, 0]
Output: [1, -1, 1, 1, -1]
Explanation: Bits 1 become +1; bits 0 become -1.
```

#### Example 2:
```matlab
Input: bits = [0, 0, 1]
Output: [-1, -1, 1]
Explanation: Mapping [0, 0, 1] yields [-1, -1, 1].
```

#### Example 3:
```matlab
Input: bits = [1, 1, 1, 0]
Output: [1, 1, 1, -1]
Explanation: Mapping [1, 1, 1, 0] yields [1, 1, 1, -1].
```""",
        "starter_code": """function symbols = bpsk_map(bits)
    % Map 0 -> -1 and 1 -> +1.
    symbols = zeros(size(bits));
end
""",
        "test_cases": [
            {"id": "1", "input": {"bits": [1, 0, 1, 1, 0]}, "expected": [1, -1, 1, 1, -1], "entry_point": "bpsk_map", "hidden": False},
            {"id": "2", "input": {"bits": [0, 0, 1]}, "expected": [-1, -1, 1], "entry_point": "bpsk_map", "hidden": False},
            {"id": "3", "input": {"bits": [1, 1, 1, 0]}, "expected": [1, 1, 1, -1], "entry_point": "bpsk_map", "hidden": False},
            {"id": "4", "input": {"bits": [0, 0, 0, 0]}, "expected": [-1, -1, -1, -1], "entry_point": "bpsk_map", "hidden": True},
            {"id": "5", "input": {"bits": [1, 0]}, "expected": [1, -1], "entry_point": "bpsk_map", "hidden": True},
        ],
        "solution_hints": ["The affine mapping `2 * bits - 1` is vectorized.", "Preserve the input shape."]
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
In bare-metal embedded programming, peripheral hardware such as LEDs, motors, and communication pins are driven by memory-mapped GPIO Output Data Registers (ODR).

Implement the function:
```c
#include <stdint.h>

uint8_t toggle_pin(uint8_t port_val, uint8_t pin_num);
```

Where:
* `port_val` is an 8-bit register value representing current pin states ($0 \\le port\\_val \\le 255$).
* `pin_num` is the zero-based pin index to invert ($0 \\le pin\\_num \\le 7$).
* The function must toggle (invert from 0 to 1, or from 1 to 0) the bit at position `pin_num` using bitwise XOR (`^`) with a bitmask `(1U << pin_num)`, leaving all other 7 bits unmodified.

#### Constraints:
* $0 \\le port\\_val \\le 255$ (`uint8_t`).
* $0 \\le pin\\_num \\le 7$ (`uint8_t`).
* Must execute in $\\mathcal{O}(1)$ time with no dynamic memory allocation.

#### Example 1:
```c
Input: port_val = 0, pin_num = 3 (Input string: "0 3")
Output: "8"
Explanation: Bitmask for pin 3 is (1 << 3) = 8 (binary 00001000). 0 ^ 8 = 8. Pin 3 is toggled from 0 to 1.
```

#### Example 2:
```c
Input: port_val = 255, pin_num = 3 (Input string: "255 3")
Output: "247"
Explanation: port_val 255 is binary 11111111. Toggling bit 3 (mask 8 = 00001000) clears it to 0, producing 247 (11110111).
```

#### Example 3:
```c
Input: port_val = 16, pin_num = 4 (Input string: "16 4")
Output: "0"
Explanation: port_val 16 is binary 00010000 (pin 4 is currently high). 16 ^ (1 << 4) = 16 ^ 16 = 0. Pin 4 is cleared to 0.
```""",
        "starter_code": """#include <stdint.h>

uint8_t toggle_pin(uint8_t port_val, uint8_t pin_num) {
    // Toggle bit at pin_num using bitwise XOR
    return port_val ^ (1U << pin_num);
}
""",
        "test_cases": [
            {"id": "1", "input": "0 3", "expected": "8", "hidden": False},
            {"id": "2", "input": "255 3", "expected": "247", "hidden": False},
            {"id": "3", "input": "16 4", "expected": "0", "hidden": False},
            {"id": "4", "input": "0 0", "expected": "1", "hidden": True},
            {"id": "5", "input": "0 7", "expected": "128", "hidden": True},
            {"id": "6", "input": "255 7", "expected": "127", "hidden": True}
        ],
        "solution_hints": [
            "Create a bitmask using `(1U << pin_num)` and XOR with `port_val`."
        ]
    },

    # ==========================================
    # 5. AI & Machine Learning
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
Compute the forward propagation output of a single artificial neuron (perceptron). Given weight vector $W = [w_1, w_2, \\dots, w_n]$, input feature vector $X = [x_1, x_2, \\dots, x_n]$, and a scalar bias $b$, the net input $z$ and Sigmoid activation $\\sigma(z)$ are defined as:
$$z = \\sum_{i=1}^n (w_i \\cdot x_i) + b$$
$$\\sigma(z) = \\frac{1}{1 + e^{-z}}$$

Implement `perceptron_forward(weights, inputs, bias)`. Return the scalar output rounded to 4 decimal places (`round(sigma, 4)`).

#### Constraints:
* $1 \\le \\text{len}(weights) == \\text{len}(inputs) \\le 10^3$.
* $-100.0 \\le w_i, x_i, b \\le 100.0$.
* Return a float rounded to 4 decimal places.

#### Example 1:
```python
Input: weights = [0.5, -0.5], inputs = [1.0, 2.0], bias = 0.0
Output: 0.3775
Explanation:
z = (0.5 * 1.0) + (-0.5 * 2.0) + 0.0 = 0.5 - 1.0 + 0.0 = -0.5
sigma(-0.5) = 1.0 / (1.0 + exp(0.5)) ~= 0.3775406... -> round(sigma, 4) is 0.3775.
```

#### Example 2:
```python
Input: weights = [1.0, 1.0], inputs = [0.0, 0.0], bias = 0.0
Output: 0.5
Explanation:
z = (1.0 * 0.0) + (1.0 * 0.0) + 0.0 = 0.0
sigma(0.0) = 1.0 / (1.0 + 1.0) = 0.5.
```

#### Example 3:
```python
Input: weights = [2.0, 3.0], inputs = [1.0, 1.0], bias = -5.0
Output: 0.5
Explanation:
z = (2.0 * 1.0 + 3.0 * 1.0) + (-5.0) = 5.0 - 5.0 = 0.0
sigma(0.0) = 0.5.
```

#### Example 4:
```python
Input: weights = [1.5, 2.5, -1.0], inputs = [2.0, -1.0, 3.0], bias = 1.0
Output: 0.1824
Explanation:
z = (3.0 - 2.5 - 3.0) + 1.0 = -1.5
sigma(-1.5) = 1.0 / (1.0 + exp(1.5)) ~= 0.182425... -> round(sigma, 4) is 0.1824.
```""",
        "starter_code": """import math

def perceptron_forward(weights, inputs, bias):
    \"\"\"
    :type weights: List[float]
    :type inputs: List[float]
    :type bias: float
    :rtype: float
    \"\"\"
    z = sum(w * x for w, x in zip(weights, inputs)) + bias
    sigma = 1.0 / (1.0 + math.exp(-z))
    return round(sigma, 4)
""",
        "test_cases": [
            {"id": "1", "input": {"weights": [0.5, -0.5], "inputs": [1.0, 2.0], "bias": 0.0}, "expected": 0.3775, "entry_point": "perceptron_forward", "hidden": False},
            {"id": "2", "input": {"weights": [1.0, 1.0], "inputs": [0.0, 0.0], "bias": 0.0}, "expected": 0.5, "entry_point": "perceptron_forward", "hidden": False},
            {"id": "3", "input": {"weights": [2.0, 3.0], "inputs": [1.0, 1.0], "bias": -5.0}, "expected": 0.5, "entry_point": "perceptron_forward", "hidden": False},
            {"id": "4", "input": {"weights": [1.5, 2.5, -1.0], "inputs": [2.0, -1.0, 3.0], "bias": 1.0}, "expected": 0.1824, "entry_point": "perceptron_forward", "hidden": True},
            {"id": "5", "input": {"weights": [0.0, 0.0], "inputs": [5.0, 10.0], "bias": 2.0}, "expected": 0.8808, "entry_point": "perceptron_forward", "hidden": True},
            {"id": "6", "input": {"weights": [1.0], "inputs": [-3.0], "bias": 0.0}, "expected": 0.0474, "entry_point": "perceptron_forward", "hidden": True}
        ],
        "solution_hints": [
            "Compute dot product `z = sum(w * x for w, x in zip(weights, inputs)) + bias`.",
            "`sigmoid(z) = 1.0 / (1.0 + math.exp(-z))`."
        ]
    },

    # ==========================================
    # 6. Cybersecurity & CTF
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
During a threat hunting investigation, network defense analysts intercepted an obfuscated payload encoded with a single-byte repeating XOR key.
The intercepted ciphertext in hexadecimal is:
`15 1e 17 19 1e 08 2b 28 60 22 0f 33 61 20 38 63 22 0f 33 22 64 33 3b 63 34 2d`

#### Cryptographic Principle (Known-Plaintext Attack):
Because XOR is its own inverse ($C_i = P_i \\oplus K \\iff K = C_i \\oplus P_i$), knowing any portion of the plaintext immediately leaks the key!
All EnginX CTF flags begin with the standard prefix `ENGINX{`. Therefore:
$$\\text{Key} = \\text{Ciphertext}[0] \\oplus \\text{ord}('E')$$

Write `decrypt_xor_flag(ciphertext_hex=None)` to automatically recover the secret single-byte key, decrypt the full payload byte-by-byte, and return the captured flag.

#### Flag Format:
`ENGINX{...}`

#### Example 1:
```python
Input: ciphertext_hex = "151e17191e082b2860220f3361203863220f332264333b63342d"
Key Recovery:
First ciphertext byte = 0x15 (21 decimal)
First plaintext char = ord('E') = 0x45 (69 decimal)
Secret Key = 0x15 ^ 0x45 = 0x50 ('P')
Output: "ENGINX{x0r_c1ph3r_cr4ck3d}"
Explanation: XORing each ciphertext byte with key 0x50 recovers the authentic flag.
```

#### Example 2:
```python
Input: ciphertext_hex = "151e17191e082b243523240f203123232d"
Output: "ENGINX{test_pass}"
Explanation: Using key = 0x15 ^ ord('E') = 0x50 decrypts the test vector to "ENGINX{test_pass}".
```""",
        "starter_code": """def decrypt_xor_flag(ciphertext_hex="151e17191e082b2860220f3361203863220f332264333b63342d"):
    raw_bytes = bytes.fromhex(ciphertext_hex)
    # Recover key: first byte ^ ord('E')
    key = raw_bytes[0] ^ ord('E')
    decrypted = "".join(chr(b ^ key) for b in raw_bytes)
    return decrypted
""",
        "test_cases": [
            {"id": "1", "input": {}, "expected": "ENGINX{x0r_c1ph3r_cr4ck3d}", "entry_point": "decrypt_xor_flag", "hidden": False},
            {"id": "2", "input": {"ciphertext_hex": "151e17191e082b2860220f3361203863220f332264333b63342d"}, "expected": "ENGINX{x0r_c1ph3r_cr4ck3d}", "entry_point": "decrypt_xor_flag", "hidden": False},
            {"id": "3", "input": {"ciphertext_hex": "151e17191e082b243523240f203123232d"}, "expected": "ENGINX{test_pass}", "entry_point": "decrypt_xor_flag", "hidden": True},
            {"id": "4", "input": {"ciphertext_hex": "151e17191e082b363c31370f33312024252235342d"}, "expected": "ENGINX{flag_captured}", "entry_point": "decrypt_xor_flag", "hidden": True}
        ],
        "solution_hints": [
            "Because XOR is symmetric: `key = ciphertext[0] ^ ord('E')`.",
            "Once key is found, decrypt each byte by XORing with key: `chr(b ^ key)`."
        ]
    },

    # ==========================================
    # 7. Robotics & Hardware
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
Forward kinematics calculates the Cartesian $(x, y)$ coordinates of the end-effector of a 2-degree-of-freedom (2-DOF) planar robotic manipulator given its joint angles $\\theta_1$ and $\\theta_2$ (in degrees) and link lengths $l_1$ and $l_2$.

From geometric trigonometry, the position of the end-effector relative to the base frame is:
$$x = l_1 \\cos(\\theta_1) + l_2 \\cos(\\theta_1 + \\theta_2)$$
$$y = l_1 \\sin(\\theta_1) + l_2 \\sin(\\theta_1 + \\theta_2)$$

Implement `forward_kinematics(theta1_deg, theta2_deg, l1=10.0, l2=10.0)`.
* Convert angles from degrees to radians before calling trigonometric functions.
* Return `[round(x, 2), round(y, 2)]`.

#### Constraints:
* $-360.0 \\le \\theta_1, \\theta_2 \\le 360.0$.
* $l_1 > 0, l_2 > 0$.
* Output coordinates rounded to 2 decimal places.

#### Example 1:
```python
Input: theta1_deg = 0.0, theta2_deg = 0.0, l1 = 10.0, l2 = 10.0
Output: [20.0, 0.0]
Explanation: Both joints are at 0 degrees, fully extending the arm along the positive X-axis:
x = 10.0*cos(0) + 10.0*cos(0) = 20.0, y = 10.0*sin(0) + 10.0*sin(0) = 0.0.
```

#### Example 2:
```python
Input: theta1_deg = 90.0, theta2_deg = 0.0, l1 = 10.0, l2 = 10.0
Output: [0.0, 20.0]
Explanation: Joint 1 rotates 90 degrees pointing straight up along the positive Y-axis. Link 2 continues straight:
x = 10.0*cos(90°) + 10.0*cos(90°) = 0.0, y = 10.0*sin(90°) + 10.0*sin(90°) = 20.0.
```

#### Example 3:
```python
Input: theta1_deg = 45.0, theta2_deg = -45.0, l1 = 10.0, l2 = 10.0
Output: [17.07, 7.07]
Explanation: Link 1 angle is 45°, and link 2 total angle is 45° + (-45°) = 0°.
x = 10.0*cos(45°) + 10.0*cos(0°) = 7.071 + 10.0 = 17.07
y = 10.0*sin(45°) + 10.0*sin(0°) = 7.071 + 0.0 = 7.07.
```""",
        "starter_code": """import math

def forward_kinematics(theta1_deg, theta2_deg, l1=10.0, l2=10.0):
    t1 = math.radians(theta1_deg)
    t2 = math.radians(theta1_deg + theta2_deg)
    x = round(l1 * math.cos(t1) + l2 * math.cos(t2), 2)
    y = round(l1 * math.sin(t1) + l2 * math.sin(t2), 2)
    return [x, y]
""",
        "test_cases": [
            {"id": "1", "input": {"theta1_deg": 0.0, "theta2_deg": 0.0, "l1": 10.0, "l2": 10.0}, "expected": [20.0, 0.0], "entry_point": "forward_kinematics", "hidden": False},
            {"id": "2", "input": {"theta1_deg": 90.0, "theta2_deg": 0.0, "l1": 10.0, "l2": 10.0}, "expected": [0.0, 20.0], "entry_point": "forward_kinematics", "hidden": False},
            {"id": "3", "input": {"theta1_deg": 45.0, "theta2_deg": -45.0, "l1": 10.0, "l2": 10.0}, "expected": [17.07, 7.07], "entry_point": "forward_kinematics", "hidden": False},
            {"id": "4", "input": {"theta1_deg": 0.0, "theta2_deg": 90.0, "l1": 10.0, "l2": 10.0}, "expected": [10.0, 10.0], "entry_point": "forward_kinematics", "hidden": True},
            {"id": "5", "input": {"theta1_deg": 180.0, "theta2_deg": 0.0, "l1": 10.0, "l2": 10.0}, "expected": [-20.0, 0.0], "entry_point": "forward_kinematics", "hidden": True},
            {"id": "6", "input": {"theta1_deg": 30.0, "theta2_deg": 60.0, "l1": 15.0, "l2": 5.0}, "expected": [12.99, 12.5], "entry_point": "forward_kinematics", "hidden": True}
        ],
        "solution_hints": [
            "Use `math.radians()` to convert joint angles to radians.",
            "The second link's orientation with respect to base is `theta1 + theta2`."
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
Design a **2-to-1 Multiplexer** (data selector) in synthesizable Verilog.
A multiplexer directs one of two binary input data lines `a` or `b` to a single output line `out`, controlled by a select signal `sel`:
* When `sel == 1'b0`, the output routes input `a` (`out = a`).
* When `sel == 1'b1`, the output routes input `b` (`out = b`).

#### Module Port Interface:
```verilog
module mux2to1(
    input a,
    input b,
    input sel,
    output out
);
```

#### Complete Truth Table:
| sel | a | b | out | Selected Input |
|:---:|:---:|:---:|:---:|:---:|
| 0 | 0 | 0 | 0 | a (0) |
| 0 | 0 | 1 | 0 | a (0) |
| 0 | 1 | 0 | 1 | a (1) |
| 0 | 1 | 1 | 1 | a (1) |
| 1 | 0 | 0 | 0 | b (0) |
| 1 | 0 | 1 | 1 | b (1) |
| 1 | 1 | 0 | 0 | b (0) |
| 1 | 1 | 1 | 1 | b (1) |

#### Example 1:
```verilog
Input: a = 0, b = 1, sel = 0
Output: 0
Explanation: sel is 0, so the multiplexer routes input a (a = 0) to output out.
```

#### Example 2:
```verilog
Input: a = 0, b = 1, sel = 1
Output: 1
Explanation: sel is 1, so the multiplexer routes input b (b = 1) to output out.
```

#### Example 3:
```verilog
Input: a = 1, b = 0, sel = 0
Output: 1
Explanation: sel is 0, routing input a (a = 1).
```

#### Example 4:
```verilog
Input: a = 1, b = 0, sel = 1
Output: 0
Explanation: sel is 1, routing input b (b = 0).
```""",
        "starter_code": """module mux2to1(
    input a,
    input b,
    input sel,
    output out
);
    assign out = sel ? b : a;

endmodule
""",
        "test_cases": [
            {"id": "1", "input": {"a": 0, "b": 1, "sel": 0}, "expected": 0, "hidden": False},
            {"id": "2", "input": {"a": 0, "b": 1, "sel": 1}, "expected": 1, "hidden": False},
            {"id": "3", "input": {"a": 1, "b": 0, "sel": 0}, "expected": 1, "hidden": False},
            {"id": "4", "input": {"a": 1, "b": 0, "sel": 1}, "expected": 0, "hidden": True},
            {"id": "5", "input": {"a": 0, "b": 0, "sel": 0}, "expected": 0, "hidden": True},
            {"id": "6", "input": {"a": 1, "b": 1, "sel": 1}, "expected": 1, "hidden": True}
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
    # 1. Seed or Update Challenges
    for ch_data in CHALLENGES:
        existing = db.query(Challenge).filter(Challenge.id == ch_data["id"]).first()
        if not existing:
            ch = Challenge(**ch_data)
            db.add(ch)
        else:
            for key, val in ch_data.items():
                setattr(existing, key, val)

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

    # 4. Seed the JSON-authored HDL coding bank (best-effort, never blocks).
    try:
        seed_bank_challenges(db)
    except Exception:
        logger.exception("Challenge bank seeding failed; continuing without it.")

    db.commit()
