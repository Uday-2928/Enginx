"""
Unit test suite for EnginX Evaluation Sandbox
Tests all runners: Python, Verilog, C, CTF, and Hardware.
"""
import sys
import unittest
from runners.python_runner import PythonRunner
from runners.verilog_runner import VerilogRunner
from runners.c_runner import CRunner
from runners.ctf_runner import CTFRunner
from runners.hardware_runner import HardwareRunner

class TestEnginXEvaluator(unittest.TestCase):

    def test_python_two_sum(self):
        runner = PythonRunner(timeout_seconds=3.0)
        code = """
def two_sum(nums, target):
    lookup = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in lookup:
            return [lookup[diff], i]
        lookup[num] = i
    return []
"""
        test_cases = [
            {"id": "1", "input": {"nums": [2, 7, 11, 15], "target": 9}, "expected": [0, 1], "entry_point": "two_sum"},
            {"id": "2", "input": {"nums": [3, 2, 4], "target": 6}, "expected": [1, 2], "entry_point": "two_sum"}
        ]
        res = runner.evaluate(code, test_cases)
        self.assertEqual(res.verdict, "AC")
        self.assertEqual(res.passed_count, 2)

    def test_verilog_adder(self):
        runner = VerilogRunner(timeout_seconds=3.0)
        code = """
module ripple_carry_adder(
    input [3:0] a,
    input [3:0] b,
    input cin,
    output [3:0] sum,
    output cout
);
    assign {cout, sum} = a + b + cin;
endmodule
"""
        test_cases = [
            {"id": "1", "input": {"a": 5, "b": 3, "cin": 0}, "expected": {"sum": 8, "cout": 0}},
            {"id": "2", "input": {"a": 10, "b": 7, "cin": 1}, "expected": {"sum": 2, "cout": 1}}
        ]
        res = runner.evaluate(code, test_cases)
        self.assertEqual(res.verdict, "AC")
        self.assertEqual(res.passed_count, 2)

    def test_c_embedded(self):
        runner = CRunner(timeout_seconds=3.0)
        code = """
#include <stdio.h>
#include <stdint.h>

uint8_t toggle_pin(uint8_t port, uint8_t pin) {
    return port ^ (1 << pin);
}

int main() {
    uint8_t res = toggle_pin(0x00, 3);
    printf("%d\\n", res);
    return 0;
}
"""
        test_cases = [
            {"id": "1", "input": "", "expected": "8"}
        ]
        res = runner.evaluate(code, test_cases)
        self.assertEqual(res.verdict, "AC")

    def test_ctf_flag_verification(self):
        runner = CTFRunner(timeout_seconds=3.0)
        code = "ENGINX{bUff3r_0v3rfl0w_pwn3d_2026}"
        test_cases = [
            {"id": "1", "expected": "ENGINX{bUff3r_0v3rfl0w_pwn3d_2026}"}
        ]
        res = runner.evaluate(code, test_cases)
        self.assertEqual(res.verdict, "AC")

    def test_hardware_kinematics(self):
        runner = HardwareRunner(timeout_seconds=3.0)
        code = """
import math

def forward_kinematics(theta1_deg, theta2_deg, l1=10.0, l2=10.0):
    t1 = math.radians(theta1_deg)
    t2 = math.radians(theta1_deg + theta2_deg)
    x = round(l1 * math.cos(t1) + l2 * math.cos(t2), 2)
    y = round(l1 * math.sin(t1) + l2 * math.sin(t2), 2)
    return [x, y]
"""
        test_cases = [
            {"id": "1", "input": {"theta1_deg": 0, "theta2_deg": 0}, "expected": [20.0, 0.0], "entry_point": "forward_kinematics"}
        ]
        res = runner.evaluate(code, test_cases)
        self.assertEqual(res.verdict, "AC")

if __name__ == "__main__":
    unittest.main()
