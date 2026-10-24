"""
Unit test suite for EnginX Evaluation Sandbox
Tests all runners: Python, Verilog, C, CTF, and Hardware.
"""
import sys
import shutil
import tempfile
import unittest
from pathlib import Path
from runners.python_runner import PythonRunner
from runners.verilog_runner import VerilogRunner
from runners.c_runner import CRunner
from runners.ctf_runner import CTFRunner
from runners.hardware_runner import HardwareRunner
from runners.matlab_runner import MatlabRunner
from evaluator import EvaluateRequest, evaluate_script

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

    def test_verilog_half_adder(self):
        runner = VerilogRunner(timeout_seconds=3.0)
        code = """
module half_adder(
    input wire a,
    input wire b,
    output wire sum,
    output wire carry
);
    assign sum = a ^ b;
    assign carry = a & b;
endmodule
"""
        test_cases = [
            {"id": "1", "input": {"a": 0, "b": 0}, "expected": {"sum": 0, "carry": 0}},
            {"id": "2", "input": {"a": 0, "b": 1}, "expected": {"sum": 1, "carry": 0}},
            {"id": "3", "input": {"a": 1, "b": 0}, "expected": {"sum": 1, "carry": 0}},
            {"id": "4", "input": {"a": 1, "b": 1}, "expected": {"sum": 0, "carry": 1}},
        ]
        res = runner.evaluate(code, test_cases)
        self.assertEqual(res.verdict, "AC")
        self.assertEqual(res.passed_count, 4)

    def test_verilog_testbench_drives_inputs_and_checks_outputs(self):
        runner = VerilogRunner(timeout_seconds=3.0)
        code = """
module and_gate(input wire a, input wire b, output wire y);
    assign y = a & b;
endmodule
"""
        testbench = runner._generate_testbench(
            "and_gate",
            code,
            [{"id": "1", "input": {"a": 1, "b": 1}, "expected": 1}],
        )
        self.assertIn("a = 1'b1", testbench)
        self.assertIn("b = 1'b1", testbench)
        self.assertIn("(y === 1'b1)", testbench)
        self.assertNotIn("pass=1 act=", testbench)

    def test_verilog_gate_fallback_rejects_unimplemented_starter(self):
        runner = VerilogRunner(timeout_seconds=3.0)
        starter = """
module and_gate(input wire a, input wire b, output wire y);
    // TODO: implement y = a AND b
endmodule
"""
        result = runner.evaluate(starter, [
            {"id": "1", "input": {"a": 1, "b": 1}, "expected": 1},
        ])
        self.assertEqual(result.verdict, "WA")

        solution = starter.replace("    // TODO: implement y = a AND b", "    assign y = a & b;")
        result = runner.evaluate(solution, [
            {"id": "1", "input": {"a": 1, "b": 1}, "expected": 1},
        ])
        self.assertEqual(result.verdict, "AC")

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

    def test_matlab_sampling_is_real_runtime_or_honest_unavailable(self):
        runner = MatlabRunner(timeout_seconds=5.0)
        code = """
function alias = alias_frequency(fs, f0)
    alias = abs(mod(f0 + fs/2, fs) - fs/2);
end
"""
        result = runner.evaluate(code, [
            {"id": "1", "input": {"fs": 8000, "f0": 7000}, "expected": 1000, "entry_point": "alias_frequency"},
        ])
        if shutil.which("octave-cli") or shutil.which("octave"):
            self.assertEqual(result.verdict, "AC")
            self.assertEqual(result.passed_count, 1)
        else:
            self.assertEqual(result.verdict, "UNAVAILABLE")
            self.assertIn("GNU Octave", result.output)

    def test_matlab_script_route_and_request_guards_are_honest(self):
        self.assertIn("filesystem", MatlabRunner._validate_code("system('id');") or "")
        self.assertIsNone(MatlabRunner._validate_code("plot(0:0.1:1);"))
        self.assertEqual(MatlabRunner._parse_numeric_text("[1 2 3]"), [1.0, 2.0, 3.0])

        response = evaluate_script(EvaluateRequest(code="disp(2);", language="matlab", mode="test"))
        if shutil.which("octave-cli") or shutil.which("octave"):
            self.assertEqual(response["mode"], "script")
            self.assertIn(response["status"], {"executed", "runtime_error", "syntax_error", "timeout"})
        else:
            self.assertEqual(response["verdict"], "UNAVAILABLE")

    def test_matlab_request_validation_and_marker_parsing_are_bounded(self):
        self.assertIsNone(MatlabRunner._validate_request(
            "function y = solution(x)\n y = x + 1;\nend",
            [{"id": "1", "input": 2, "expected": 3, "entry_point": "solution"}],
        ))
        self.assertIn("entry_point", MatlabRunner._validate_request(
            "disp(1);", [{"entry_point": "bad-name", "expected": 1}]
        ) or "")
        self.assertIn("test_cases", MatlabRunner._validate_request("disp(1);", "not-a-list") or "")

        marker = "ENGINX_RESULT_test"
        cases = [{"id": "visible", "expected": 3}, {"id": "hidden", "expected": 4, "hidden": True}]
        results, parsed_count, runtime_error = MatlabRunner._parse_markers(
            f"noise\n{marker}|0|1|1.25|3|\n{marker}|1|0|2.5|2|mismatch\n",
            cases,
            marker,
        )
        self.assertEqual(parsed_count, 2)
        self.assertFalse(runtime_error)
        self.assertTrue(results[0].passed)
        self.assertEqual(results[0].actual, "3")
        self.assertFalse(results[1].passed)
        self.assertEqual(results[1].actual, "[Hidden]")

    def test_matlab_artifact_collection_rejects_invalid_signatures_and_bounds_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "valid.png").write_bytes(b"\x89PNG\r\n\x1a\nplot")
            (root / "invalid.png").write_bytes(b"not-an-image")
            (root / "valid.svg").write_text("<svg xmlns='http://www.w3.org/2000/svg'></svg>", encoding="utf-8")
            artifacts = MatlabRunner._collect_artifacts(root)

        filenames = {artifact["filename"] for artifact in artifacts}
        self.assertEqual(filenames, {"valid.png", "valid.svg"})
        self.assertTrue(all(artifact["kind"] == "plot" for artifact in artifacts))
        self.assertTrue(all("sha256" in artifact for artifact in artifacts))
        self.assertTrue(any(artifact.get("data_uri", "").startswith("data:image/png") for artifact in artifacts))

if __name__ == "__main__":
    unittest.main()
