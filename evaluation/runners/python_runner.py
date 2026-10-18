"""
Python Runner for EnginX Evaluation Sandbox
Evaluates Python code for DSA, Algorithms, AI/ML, and Scripting challenges.
"""
import sys
import os
import json
import time
import tempfile
import subprocess
from typing import List, Dict, Any
from .base_runner import BaseRunner, EvaluationResult, TestCaseResult

class PythonRunner(BaseRunner):
    def evaluate(self, code: str, test_cases: List[Dict[str, Any]]) -> EvaluationResult:
        start_time = time.time()

        with tempfile.TemporaryDirectory() as tmpdir:
            script_path = os.path.join(tmpdir, "solution.py")
            harness_path = os.path.join(tmpdir, "harness.py")
            test_cases_path = os.path.join(tmpdir, "test_cases.json")

            with open(script_path, "w", encoding="utf-8") as f:
                f.write(code)

            with open(test_cases_path, "w", encoding="utf-8") as f:
                json.dump(test_cases, f)

            # Build runner harness
            harness_code = """
import sys
import json
import time
import traceback

def run():
    with open('test_cases.json', 'r', encoding='utf-8') as f:
        cases = json.load(f)

    # Import user solution
    try:
        import solution
    except Exception as e:
        print(json.dumps({
            "error_type": "CE",
            "message": f"Compilation/Import Error: {traceback.format_exc()}"
        }))
        return

    results = []
    all_passed = True

    for idx, tc in enumerate(cases):
        tc_id = tc.get("id", str(idx + 1))
        inp = tc.get("input")
        expected = tc.get("expected")
        hidden = tc.get("hidden", False)
        entry_func_name = tc.get("entry_point")

        t0 = time.time()
        actual = None
        passed = False
        err_msg = None

        try:
            # Check if there is an explicit entry point function
            func = None
            if entry_func_name and hasattr(solution, entry_func_name):
                func = getattr(solution, entry_func_name)
            else:
                # Find first callable that isn't a builtin
                for attr_name in dir(solution):
                    if not attr_name.startswith("__"):
                        candidate = getattr(solution, attr_name)
                        if callable(candidate):
                            func = candidate
                            break

            if func:
                if isinstance(inp, dict):
                    actual = func(**inp)
                elif isinstance(inp, (list, tuple)):
                    actual = func(*inp)
                elif inp is not None:
                    actual = func(inp)
                else:
                    actual = func()
            else:
                err_msg = "No callable entry point function found in solution."

            # Equality check (handles floats, lists, dicts)
            if err_msg is None:
                if isinstance(expected, float) and isinstance(actual, (int, float)):
                    passed = abs(actual - expected) < 1e-4
                else:
                    passed = (actual == expected)

        except Exception as e:
            err_msg = traceback.format_exc()
            passed = False

        duration_ms = round((time.time() - t0) * 1000, 2)
        if not passed:
            all_passed = False

        results.append({
            "test_case_id": tc_id,
            "passed": passed,
            "input": inp if not hidden else "[Hidden]",
            "expected": expected if not hidden else "[Hidden]",
            "actual": str(actual) if not hidden else ("[Hidden]" if not passed else "[Match]"),
            "execution_time_ms": duration_ms,
            "message": err_msg,
            "hidden": hidden
        })

    print(json.dumps({
        "results": results,
        "all_passed": all_passed
    }))

if __name__ == '__main__':
    run()
"""
            with open(harness_path, "w", encoding="utf-8") as f:
                f.write(harness_code)

            try:
                proc = subprocess.run(
                    [sys.executable, "-I", "harness.py"],
                    cwd=tmpdir,
                    capture_output=True,
                    text=True,
                    timeout=self.timeout_seconds
                )

                total_duration = round((time.time() - start_time) * 1000, 2)

                if proc.returncode != 0:
                    return EvaluationResult(
                        verdict="RE",
                        total_time_ms=total_duration,
                        memory_used_kb=1024,
                        output=proc.stderr or proc.stdout,
                        test_results=[],
                        passed_count=0,
                        total_count=len(test_cases)
                    )

                raw_output = proc.stdout.strip()
                try:
                    data = json.loads(raw_output)
                except Exception:
                    # Fallback to RE if parsing harness output fails
                    return EvaluationResult(
                        verdict="RE",
                        total_time_ms=total_duration,
                        memory_used_kb=1024,
                        output=f"Output parse error: {raw_output}\nStderr: {proc.stderr}",
                        test_results=[],
                        passed_count=0,
                        total_count=len(test_cases)
                    )

                if "error_type" in data:
                    return EvaluationResult(
                        verdict=data["error_type"],
                        total_time_ms=total_duration,
                        memory_used_kb=1024,
                        output=data["message"],
                        test_results=[],
                        passed_count=0,
                        total_count=len(test_cases)
                    )

                tc_results = [TestCaseResult(**item) for item in data.get("results", [])]
                passed_count = sum(1 for r in tc_results if r.passed)
                verdict = "AC" if (passed_count == len(tc_results) and len(tc_results) > 0) else "WA"

                return EvaluationResult(
                    verdict=verdict,
                    total_time_ms=total_duration,
                    memory_used_kb=1024,
                    output="All test cases executed.",
                    test_results=tc_results,
                    passed_count=passed_count,
                    total_count=len(tc_results)
                )

            except subprocess.TimeoutExpired:
                total_duration = round((time.time() - start_time) * 1000, 2)
                return EvaluationResult(
                    verdict="TLE",
                    total_time_ms=total_duration,
                    memory_used_kb=1024,
                    output=f"Execution timed out after {self.timeout_seconds} seconds.",
                    test_results=[],
                    passed_count=0,
                    total_count=len(test_cases)
                )
