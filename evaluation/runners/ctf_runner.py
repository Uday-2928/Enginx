"""
Cybersecurity & CTF Runner for EnginX Evaluation Sandbox
Validates security challenges, vulnerability analysis, exploit payloads, and flag captures.
"""
import re
import time
from typing import List, Dict, Any
from .base_runner import BaseRunner, EvaluationResult, TestCaseResult
from .python_runner import PythonRunner

class CTFRunner(BaseRunner):
    FLAG_PATTERN = re.compile(r"ENGINX\{[a-zA-Z0-9_\-\$!@#]+\}")

    def evaluate(self, code: str, test_cases: List[Dict[str, Any]]) -> EvaluationResult:
        start_time = time.time()

        # If user solution contains Python code, we run the exploit / script first
        if "def " in code or "import " in code:
            py_runner = PythonRunner(timeout_seconds=self.timeout_seconds)
            res = py_runner.evaluate(code, test_cases)
            return res

        # Otherwise evaluate static flag submission or payload check
        tc_results = []
        all_passed = True

        for idx, tc in enumerate(test_cases):
            tc_id = tc.get("id", str(idx + 1))
            expected_flag = tc.get("expected", "").strip()
            hidden = tc.get("hidden", False)

            t0 = time.time()
            found_flags = self.FLAG_PATTERN.findall(code)
            actual = found_flags[0] if found_flags else code.strip()

            passed = (actual == expected_flag)
            if not passed:
                all_passed = False

            duration_ms = round((time.time() - t0) * 1000, 2)
            tc_results.append(TestCaseResult(
                test_case_id=tc_id,
                passed=passed,
                input="[Exploit / Payload Analysis]",
                expected=expected_flag if not hidden else "[Protected Flag]",
                actual=actual if not hidden else ("[Correct Flag]" if passed else "[Incorrect Flag]"),
                execution_time_ms=duration_ms,
                message="Flag verified successfully!" if passed else "Invalid flag or exploit did not yield expected secret.",
                hidden=hidden
            ))

        total_duration = round((time.time() - start_time) * 1000, 2)
        passed_count = sum(1 for r in tc_results if r.passed)
        verdict = "AC" if (all_passed and len(tc_results) > 0) else "WA"

        return EvaluationResult(
            verdict=verdict,
            total_time_ms=total_duration,
            memory_used_kb=512,
            output="CTF challenge verification completed.",
            test_results=tc_results,
            passed_count=passed_count,
            total_count=len(tc_results)
        )
