"""GNU Octave runner for MATLAB-compatible exercises.

The evaluator accepts ``matlab`` and ``octave`` as language aliases, but this
runner only executes GNU Octave.  It never substitutes a Python implementation
or a heuristic result when Octave is missing.  Every invocation receives a new
temporary working directory containing the submission and generated harness;
the directory is removed when evaluation finishes.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import signal
import shutil
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

try:
    import resource
except ImportError:  # pragma: no cover - Windows does not expose POSIX rlimits.
    resource = None

from .base_runner import BaseRunner, EvaluationResult, TestCaseResult


class MatlabRunner(BaseRunner):
    """Execute MATLAB-compatible submissions with the optional GNU Octave CLI."""

    # These limits are intentionally kept in the runner instead of relying on
    # a caller to enforce them.  They bound the amount of user data copied into
    # the generated .m file and protect the evaluator from unbounded output.
    MAX_CODE_BYTES = 256 * 1024
    MAX_INPUT_BYTES = 128 * 1024
    MAX_TEST_CASES = 100
    MAX_OUTPUT_BYTES = 256 * 1024
    MAX_ARTIFACTS = 8
    MAX_ARTIFACT_BYTES = 1024 * 1024
    MAX_DATA_URI_BYTES = 256 * 1024
    MAX_SCRIPT_OUTPUT_BYTES = 256 * 1024
    MAX_RUNTIME_VERSION_BYTES = 512

    # Octave runs in a disposable evaluator container, but the submission is
    # still rejected when it asks for host/network/process/file capabilities.
    # This is defense in depth; container limits remain the primary boundary.
    _UNSAFE_OPERATION_RE = re.compile(
        r"(?im)(?:^\s*!|\b(?:system|unix|dos|evalin|urlread|webread|websave|ftp|javaObject|py\.\w+|fopen|fclose|fileread|fwrite|dlopen|addpath|rmpath|cd|load|save|exit|quit)\s*\(|\bclear\s+all\b)"
    )

    # Documented in README.md.  Numeric arrays must have the same shape and
    # compare with this absolute tolerance; non-finite values use exact
    # isequaln semantics.
    NUMERICAL_TOLERANCE = 1e-6

    _ENTRY_POINT_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*\Z")
    _NUMBER_RE = re.compile(r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?|[-+]?(?:Inf|NaN)")
    _IMAGE_TYPES = {
        ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
        ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
        ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
        ".svg": ("image/svg+xml", None),
        ".pdf": ("application/pdf", b"%PDF-"),
    }

    def evaluate(self, code: str, test_cases: List[Dict[str, Any]]) -> EvaluationResult:
        start_time = time.monotonic()

        # Capability checks happen before validation so an unavailable tool is
        # reported as unavailable rather than being misrepresented as a code
        # verdict.  The environment switch is useful for deployments that
        # deliberately build the evaluator without Octave.
        runtime = self._runtime_path()
        if runtime is None:
            reason = (
                "GNU Octave is disabled by ENGINX_OCTAVE_ENABLED"
                if not self._octave_enabled()
                else "GNU Octave is not installed"
            )
            return self._result(
                verdict="UNAVAILABLE",
                status="unavailable",
                runtime="GNU Octave",
                runtime_version=None,
                start_time=start_time,
                output=f"GNU Octave evaluation is unavailable: {reason}.",
                test_cases=test_cases,
            )

        validation_error = self._validate_request(code, test_cases)
        if validation_error is not None:
            return self._result(
                verdict="CE",
                status="request_error",
                runtime="GNU Octave",
                runtime_version=self._runtime_version(runtime),
                start_time=start_time,
                output=f"GNU Octave evaluation request rejected: {validation_error}",
                test_cases=test_cases,
                error={"kind": "request", "message": validation_error},
            )

        return self._run_octave(runtime, code, test_cases, start_time)

    def execute_script(self, code: str) -> EvaluationResult:
        """Execute a MATLAB-compatible script without grading test cases.

        This is used by the Signals & Systems lab's Run action.  It returns
        ``EXECUTED`` only after GNU Octave actually ran the script; no result
        is inferred from the source text or the browser preview.
        """

        start_time = time.monotonic()
        runtime = self._runtime_path()
        if runtime is None:
            reason = (
                "GNU Octave is disabled by ENGINX_OCTAVE_ENABLED"
                if not self._octave_enabled()
                else "GNU Octave is not installed"
            )
            return self._result(
                verdict="UNAVAILABLE",
                status="unavailable",
                mode="script",
                runtime="GNU Octave",
                runtime_version=None,
                start_time=start_time,
                output=f"GNU Octave execution is unavailable: {reason}.",
                test_cases=[],
                error={"kind": "unavailable", "message": reason},
            )

        validation_error = self._validate_code(code)
        if validation_error is not None:
            return self._result(
                verdict="CE",
                status="request_error",
                mode="script",
                runtime="GNU Octave",
                runtime_version=self._runtime_version(runtime),
                start_time=start_time,
                output=f"GNU Octave script rejected: {validation_error}",
                test_cases=[],
                error={"kind": "request", "message": validation_error},
            )

        return self._run_script(runtime, code, start_time)

    @classmethod
    def _octave_enabled(cls) -> bool:
        """Return whether the optional runtime is enabled by configuration."""

        raw = os.environ.get("ENGINX_OCTAVE_ENABLED")
        if raw is None:
            # Accept the shorter name for local/container deployments while
            # keeping ENGINX_OCTAVE_ENABLED as the documented setting.
            raw = os.environ.get("OCTAVE_ENABLED", "1")
        return raw.strip().lower() not in {"0", "false", "no", "off"}

    @staticmethod
    def _find_runtime() -> Optional[str]:
        """Find a real GNU Octave executable without invoking a fallback."""

        return shutil.which("octave-cli") or shutil.which("octave")

    @classmethod
    def _runtime_path(cls) -> Optional[str]:
        if not cls._octave_enabled():
            return None
        return cls._find_runtime()

    @classmethod
    def _runtime_version(cls, runtime: Optional[str]) -> Optional[str]:
        if not runtime:
            return None
        try:
            result = subprocess.run(
                [runtime, "--version"],
                capture_output=True,
                text=True,
                timeout=2.0,
                check=False,
            )
            first_line = (result.stdout or result.stderr or "").splitlines()[0:1]
            return cls._bounded_text(first_line[0].strip() if first_line else "", cls.MAX_RUNTIME_VERSION_BYTES) or None
        except (OSError, subprocess.SubprocessError):
            return None

    @staticmethod
    def _bounded_text(value: Optional[str], limit: int) -> str:
        text = value or ""
        encoded = text.encode("utf-8", errors="replace")
        if len(encoded) <= limit:
            return text
        suffix = f"\n[output truncated at {limit} bytes]"
        available = max(0, limit - len(suffix.encode("utf-8")))
        return encoded[:available].decode("utf-8", errors="replace") + suffix

    @classmethod
    def _combined_output(cls, stdout: str, stderr: str, fallback: str = "") -> str:
        parts = []
        if stdout:
            parts.append(f"stdout:\n{stdout}")
        if stderr:
            parts.append(f"stderr:\n{stderr}")
        return "\n".join(parts) or fallback

    @classmethod
    def _result(
        cls,
        *,
        verdict: str,
        status: str = "evaluated",
        mode: str = "test",
        runtime: str = "GNU Octave",
        runtime_version: Optional[str] = None,
        start_time: float,
        output: str,
        test_cases: Sequence[Dict[str, Any]],
        stdout: str = "",
        stderr: str = "",
        warnings: Optional[List[str]] = None,
        numerical_results: Optional[List[Dict[str, Any]]] = None,
        test_results: Optional[List[TestCaseResult]] = None,
        passed_count: int = 0,
        artifacts: Optional[List[Dict[str, Any]]] = None,
        error: Optional[Dict[str, Any]] = None,
    ) -> EvaluationResult:
        return EvaluationResult(
            verdict=verdict,
            status=status,
            mode=mode,
            runtime=runtime,
            runtime_version=runtime_version,
            total_time_ms=round((time.monotonic() - start_time) * 1000, 2),
            memory_used_kb=0.0,
            output=output,
            test_results=test_results or [],
            passed_count=passed_count,
            total_count=len(test_cases),
            stdout=stdout,
            stderr=stderr,
            warnings=warnings or [],
            numerical_results=numerical_results or [],
            artifacts=artifacts or [],
            error=error,
        )

    @classmethod
    def _validate_code(cls, code: Any) -> Optional[str]:
        if not isinstance(code, str):
            return "submission code must be text"
        try:
            code_bytes = code.encode("utf-8")
        except UnicodeError:
            return "submission code must be valid UTF-8"
        if len(code_bytes) > cls.MAX_CODE_BYTES:
            return f"submission code exceeds the {cls.MAX_CODE_BYTES}-byte limit"
        if "\x00" in code:
            return "submission code contains a NUL byte"
        unsafe_match = cls._UNSAFE_OPERATION_RE.search(code)
        if unsafe_match:
            return "filesystem, process, network, and dynamic-language operations are not supported in the sandbox"
        return None

    @classmethod
    def _validate_request(
        cls, code: Any, test_cases: Any
    ) -> Optional[str]:
        code_error = cls._validate_code(code)
        if code_error is not None:
            return code_error
        if not isinstance(test_cases, list):
            return "test_cases must be a list"
        if len(test_cases) > cls.MAX_TEST_CASES:
            return f"test_cases exceeds the {cls.MAX_TEST_CASES}-case limit"

        try:
            encoded_cases = json.dumps(
                test_cases,
                ensure_ascii=False,
                allow_nan=False,
                separators=(",", ":"),
            ).encode("utf-8")
        except (TypeError, ValueError, RecursionError) as error:
            return f"test_cases must contain JSON-compatible values ({error})"
        if len(encoded_cases) > cls.MAX_INPUT_BYTES:
            return f"serialized test_cases exceeds the {cls.MAX_INPUT_BYTES}-byte limit"

        for index, test_case in enumerate(test_cases):
            if not isinstance(test_case, dict):
                return f"test case {index + 1} must be an object"
            entry_point = str(test_case.get("entry_point") or "solution")
            if not cls._ENTRY_POINT_RE.fullmatch(entry_point):
                return f"test case {index + 1} has an invalid entry_point"
            try:
                arguments = cls._arguments_for_test_case(test_case)
                for argument in arguments:
                    cls._matlab_literal(argument)
                cls._matlab_literal(test_case.get("expected"))
            except (TypeError, ValueError, RecursionError) as error:
                return f"test case {index + 1} contains an unsupported value ({error})"
        return None

    @classmethod
    def _arguments_for_test_case(cls, test_case: Dict[str, Any]) -> List[Any]:
        if "input" not in test_case or test_case.get("input") is None:
            return []
        raw_input = test_case.get("input")
        if isinstance(raw_input, dict):
            # JSON object inputs are positional in insertion order.  MATLAB
            # does not have Python-style keyword calls; the order is explicit
            # in the challenge's test-case JSON.
            return list(raw_input.values())
        if isinstance(raw_input, (list, tuple)):
            return list(raw_input)
        return [raw_input]

    @classmethod
    def _matlab_literal(cls, value: Any, depth: int = 0) -> str:
        """Convert bounded JSON values into safe MATLAB/Octave expressions."""

        if depth > 8:
            raise ValueError("nested values exceed the depth limit")
        if value is None:
            return "[]"
        if isinstance(value, bool):
            return "true" if value else "false"
        if isinstance(value, int) and not isinstance(value, bool):
            return str(value)
        if isinstance(value, float):
            if value != value:
                return "NaN"
            if value == float("inf"):
                return "Inf"
            if value == float("-inf"):
                return "-Inf"
            return repr(value)
        if isinstance(value, str):
            if not value:
                return "''"
            # char([codepoints]) avoids quote/newline/script injection while
            # still passing a normal MATLAB character vector to the function.
            codepoints = " ".join(str(ord(character)) for character in value)
            return f"char([{codepoints}])"
        if isinstance(value, (list, tuple)):
            if not value:
                return "[]"
            if all(not isinstance(item, (list, tuple)) for item in value):
                return "[" + " ".join(cls._matlab_literal(item, depth + 1) for item in value) + "]"
            rows = [list(row) if isinstance(row, (list, tuple)) else None for row in value]
            if any(row is None for row in rows):
                raise ValueError("mixed nested arrays are unsupported")
            row_lengths = {len(row) for row in rows if row is not None}
            if len(row_lengths) != 1:
                raise ValueError("ragged nested arrays are unsupported")
            rendered_rows = [
                " ".join(cls._matlab_literal(item, depth + 1) for item in row or [])
                for row in rows
            ]
            return "[" + "; ".join(rendered_rows) + "]"
        raise TypeError(f"unsupported value type {type(value).__name__}")

    @classmethod
    def _generate_harness(
        cls, test_cases: Sequence[Dict[str, Any]], marker: str
    ) -> str:
        lines = [
            "more off;",
            "format long g;",
            "addpath(pwd);",
        ]
        for index, test_case in enumerate(test_cases):
            entry_point = str(test_case.get("entry_point") or "solution")
            arguments = cls._arguments_for_test_case(test_case)
            rendered_arguments = ", ".join(cls._matlab_literal(argument) for argument in arguments)
            expected = cls._matlab_literal(test_case.get("expected"))
            call = f"{entry_point}({rendered_arguments})" if rendered_arguments else f"{entry_point}()"
            lines.extend(
                [
                    "__enginx_t0 = tic();",
                    "try",
                    f"  actual = {call};",
                    f"  expected = {expected};",
                    f"  status = __enginx_compare(actual, expected, {cls.NUMERICAL_TOLERANCE:.17g});",
                    "  actual_text = __enginx_text(actual);",
                    "  message = '';",
                    "catch error_info",
                    "  status = 2;",
                    "  actual_text = '';",
                    "  message = error_info.message;",
                    "end",
                    "__enginx_duration_ms = toc(__enginx_t0) * 1000;",
                    f"__enginx_emit('{marker}', {index}, status, __enginx_duration_ms, actual_text, message);",
                ]
            )
        lines.extend(
            [
                "__enginx_save_figures();",
                "",
                "function status = __enginx_compare(actual, expected, tolerance)",
                "  if (isnumeric(actual) || islogical(actual)) && (isnumeric(expected) || islogical(expected))",
                "    if ~isequal(size(actual), size(expected))",
                "      status = 0;",
                "    elseif any(~isfinite(double(actual(:)))) || any(~isfinite(double(expected(:))))",
                "      status = isequaln(actual, expected);",
                "    else",
                "      status = all(abs(double(actual(:)) - double(expected(:))) <= tolerance);",
                "    end",
                "  elseif (ischar(actual) || isstring(actual)) && (ischar(expected) || isstring(expected))",
                "    status = isequal(char(actual), char(expected));",
                "  else",
                "    status = isequaln(actual, expected);",
                "  end",
                "end",
                "",
                "function text = __enginx_text(value)",
                "  try",
                "    if ischar(value)",
                "      text = value(:).';",
                "    elseif isstring(value)",
                "      text = char(value);",
                "    elseif isnumeric(value) || islogical(value)",
                "      text = mat2str(value, 12);",
                "    else",
                "      text = '<unprintable value>';",
                "    end",
                "  catch",
                "    text = '<unprintable value>';",
                "  end",
                "end",
                "",
                "function __enginx_emit(marker, index, status, duration_ms, actual_text, message)",
                "  actual_text = __enginx_clean_text(actual_text);",
                "  message = __enginx_clean_text(message);",
                "  printf('%s|%d|%d|%.6f|%s|%s\\n', marker, index, status, duration_ms, actual_text, message);",
                "end",
                "",
                "function text = __enginx_clean_text(text)",
                "  text = strrep(text, char(10), ' ');",
                "  text = strrep(text, char(13), ' ');",
                "  text = strrep(text, '|', '/');",
                "end",
                "",
                "function __enginx_save_figures()",
                "  try",
                "    figures = findall(0, 'type', 'figure');",
                f"    count = min(numel(figures), {cls.MAX_ARTIFACTS});",
                "    for figure_index = 1:count",
                "      destination = fullfile(pwd, sprintf('__enginx_plot_%02d.png', figure_index));",
                "      try",
                "        print(figures(figure_index), destination, '-dpng', '-r100');",
                "      catch",
                "        try",
                "          saveas(figures(figure_index), destination);",
                "        catch",
                "        end",
                "      end",
                "    end",
                "  catch",
                "  end",
                "end",
            ]
        )
        return "\n".join(lines) + "\n"

    @classmethod
    def _safe_environment(cls, root: Path) -> Dict[str, str]:
        """Build a minimal environment without forwarding secrets or proxies."""

        environment: Dict[str, str] = {
            "PATH": os.environ.get("PATH", ""),
            "HOME": str(root),
            "TMPDIR": str(root),
            "TEMP": str(root),
            "TMP": str(root),
            "OCTAVE_HISTFILE": os.devnull,
            "OCTAVE_DISABLE_GUI": "1",
            "GNUTERM": "pngcairo",
            "DISPLAY": "",
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
        }
        return environment

    @classmethod
    def _resource_limiter(cls, timeout_seconds: float, memory_limit_mb: int):
        if resource is None or os.name != "posix":
            return None

        def limit_process() -> None:
            memory_bytes = max(16, int(memory_limit_mb)) * 1024 * 1024
            cpu_seconds = max(1, int(timeout_seconds) + 1)
            for limit_name, value in (
                (resource.RLIMIT_AS, memory_bytes),
                (resource.RLIMIT_CPU, cpu_seconds),
                (resource.RLIMIT_FSIZE, cls.MAX_ARTIFACT_BYTES),
                (resource.RLIMIT_NOFILE, 128),
                (resource.RLIMIT_CORE, 0),
            ):
                try:
                    resource.setrlimit(limit_name, (value, value))
                except (OSError, ValueError):
                    # A platform may refuse one optional limit; the evaluator
                    # still has the subprocess timeout and container limits.
                    continue

        return limit_process

    @classmethod
    def _run_process(
        cls,
        command: Sequence[str],
        root: Path,
        environment: Dict[str, str],
        timeout_seconds: float,
        memory_limit_mb: int,
    ) -> Tuple[int, str, str, bool]:
        stdout_path = root / "__enginx_stdout.txt"
        stderr_path = root / "__enginx_stderr.txt"

        def read_capture(path: Path, limit: int) -> str:
            try:
                data = path.read_bytes()[: limit + 1]
            except OSError:
                return ""
            text = data.decode("utf-8", errors="replace")
            return cls._bounded_text(text, limit)

        with stdout_path.open("wb") as stdout_file, stderr_path.open("wb") as stderr_file:
            process = subprocess.Popen(
                list(command),
                cwd=str(root),
                env=environment,
                stdout=stdout_file,
                stderr=stderr_file,
                start_new_session=os.name == "posix",
                preexec_fn=cls._resource_limiter(timeout_seconds, memory_limit_mb),
            )
        deadline = time.monotonic() + timeout_seconds
        while process.poll() is None and time.monotonic() < deadline:
            time.sleep(0.01)
        if process.poll() is not None:
            return process.returncode, read_capture(stdout_path, cls.MAX_OUTPUT_BYTES), read_capture(stderr_path, cls.MAX_OUTPUT_BYTES), False

        try:
            if os.name == "posix":
                os.killpg(os.getpgid(process.pid), signal.SIGKILL)
            else:
                process.kill()
        except (OSError, ProcessLookupError):
            pass
        try:
            process.wait(timeout=2.0)
        except subprocess.TimeoutExpired:
            pass
        returncode = process.returncode if process.returncode is not None else -signal.SIGKILL
        return returncode, read_capture(stdout_path, cls.MAX_OUTPUT_BYTES), read_capture(stderr_path, cls.MAX_OUTPUT_BYTES), True

    def _run_octave(
        self,
        runtime: str,
        code: str,
        test_cases: List[Dict[str, Any]],
        start_time: float,
    ) -> EvaluationResult:
        cls = type(self)
        marker = f"ENGINX_RESULT_{uuid.uuid4().hex}"
        try:
            with tempfile.TemporaryDirectory(prefix="enginx-octave-") as tmpdir:
                root = Path(tmpdir).resolve()
                entry_points = {
                    str(test_case.get("entry_point") or "solution")
                    for test_case in test_cases
                }
                for entry_point in entry_points:
                    solution_path = root / f"{entry_point}.m"
                    solution_path.write_text(code, encoding="utf-8")

                harness_path = root / "__enginx_harness.m"
                harness_path.write_text(
                    cls._generate_harness(test_cases, marker), encoding="utf-8"
                )

                environment = cls._safe_environment(root)
                command = [
                    runtime,
                    "--quiet",
                    "--no-gui",
                    "--no-init-file",
                    "--no-history",
                    str(harness_path),
                ]

                try:
                    returncode, raw_stdout, raw_stderr, timed_out = cls._run_process(
                        command,
                        root,
                        environment,
                        self._timeout_seconds_for_runner(start_time),
                        self.memory_limit_mb,
                    )
                except FileNotFoundError as error:
                    stderr = str(error)
                    return cls._result(
                        verdict="UNAVAILABLE",
                        status="unavailable",
                        runtime_version=cls._runtime_version(runtime),
                        start_time=start_time,
                        output=f"GNU Octave evaluation is unavailable: {stderr}",
                        stderr=stderr,
                        test_cases=test_cases,
                        error={"kind": "unavailable", "message": stderr},
                    )
                except OSError as error:
                    stderr = str(error)
                    return cls._result(
                        verdict="RE",
                        status="runtime_error",
                        runtime_version=cls._runtime_version(runtime),
                        start_time=start_time,
                        output=f"GNU Octave process could not be started: {stderr}",
                        stderr=stderr,
                        test_cases=test_cases,
                        error={"kind": "process", "message": stderr},
                    )

                stdout = cls._bounded_text(raw_stdout, cls.MAX_OUTPUT_BYTES)
                stderr = cls._bounded_text(raw_stderr, cls.MAX_OUTPUT_BYTES)
                warnings = cls._warnings_from_stderr(stderr)
                if timed_out:
                    return cls._result(
                        verdict="TLE",
                        status="timeout",
                        runtime_version=cls._runtime_version(runtime),
                        start_time=start_time,
                        output=cls._combined_output(
                            stdout,
                            stderr,
                            f"GNU Octave execution timed out after {self._timeout_seconds_for_runner(start_time):.2f} seconds.",
                        ),
                        stdout=cls._strip_protocol_lines(stdout, marker),
                        stderr=stderr,
                        warnings=warnings,
                        test_cases=test_cases,
                        error={"kind": "timeout", "message": "execution time limit exceeded"},
                    )

                parsed_results, parsed_count, runtime_error = cls._parse_markers(
                    stdout, test_cases, marker
                )
                artifacts = cls._collect_artifacts(root)
                user_stdout = cls._strip_protocol_lines(stdout, marker)
                numerical_results = cls._numerical_results(parsed_results)

                # A non-zero exit without any harness marker is a syntax/load
                # failure (CE).  A marker with an Octave exception is RE.  A
                # missing marker is never promoted to AC.
                if returncode != 0 and parsed_count == 0:
                    verdict = "CE"
                    status = "syntax_error"
                elif runtime_error or (returncode != 0):
                    verdict = "RE"
                    status = "runtime_error"
                elif parsed_count != len(test_cases):
                    verdict = "RE"
                    status = "runtime_error"
                else:
                    passed_count = sum(1 for result in parsed_results if result.passed)
                    verdict = (
                        "AC"
                        if test_cases and passed_count == len(test_cases)
                        else "WA"
                    )
                    status = "evaluated"
                    return cls._result(
                        verdict=verdict,
                        status=status,
                        runtime_version=cls._runtime_version(runtime),
                        start_time=start_time,
                        output=cls._combined_output(
                            user_stdout,
                            stderr,
                            "GNU Octave test cases executed.",
                        ),
                        stdout=user_stdout,
                        stderr=stderr,
                        warnings=warnings,
                        numerical_results=numerical_results,
                        test_results=parsed_results,
                        passed_count=passed_count,
                        artifacts=artifacts,
                        test_cases=test_cases,
                    )

                passed_count = sum(1 for result in parsed_results if result.passed)
                return cls._result(
                    verdict=verdict,
                    status=status,
                    runtime_version=cls._runtime_version(runtime),
                    start_time=start_time,
                    output=cls._combined_output(
                        user_stdout,
                        stderr,
                        "GNU Octave did not complete all test cases.",
                    ),
                    stdout=user_stdout,
                    stderr=stderr,
                    warnings=warnings,
                    numerical_results=numerical_results,
                    test_results=parsed_results,
                    passed_count=passed_count,
                    artifacts=artifacts,
                    test_cases=test_cases,
                )
        except (OSError, ValueError, UnicodeError) as error:
            # File/harness preparation errors are evaluator errors, not an
            # accepted result.  Keep the error visible to callers.
            return cls._result(
                verdict="RE",
                status="runtime_error",
                runtime_version=cls._runtime_version(runtime),
                start_time=start_time,
                output=f"GNU Octave evaluation setup failed: {error}",
                test_cases=test_cases,
                error={"kind": "setup", "message": str(error)},
            )

    @classmethod
    def _generate_script_harness(cls, marker: str) -> str:
        base_lines = cls._generate_harness([], marker).splitlines()
        figure_start = next(
            index for index, line in enumerate(base_lines)
            if line == "function __enginx_save_figures()"
        )
        lines = [
            "more off;",
            "format long g;",
            "addpath(pwd);",
            "__enginx_status = 0;",
            "__enginx_message = '';",
            "try",
            "  run('__enginx_user_script.m');",
            "catch error_info",
            "  __enginx_status = 1;",
            "  __enginx_message = error_info.message;",
            "end",
            "__enginx_message = __enginx_clean_text(__enginx_message);",
            f"printf('{marker}|%d|%s\\n', __enginx_status, __enginx_message);",
            "__enginx_save_figures();",
            "",
            "function text = __enginx_clean_text(text)",
            "  text = strrep(text, char(10), ' ');",
            "  text = strrep(text, char(13), ' ');",
            "  text = strrep(text, '|', '/');",
            "end",
            "",
        ]
        lines.extend(base_lines[figure_start:])
        return "\n".join(lines) + "\n"

    def _run_script(self, runtime: str, code: str, start_time: float) -> EvaluationResult:
        cls = type(self)
        marker = f"ENGINX_SCRIPT_{uuid.uuid4().hex}"
        try:
            with tempfile.TemporaryDirectory(prefix="enginx-octave-script-") as tmpdir:
                root = Path(tmpdir).resolve()
                (root / "__enginx_user_script.m").write_text(code, encoding="utf-8")
                harness_path = root / "__enginx_script_harness.m"
                harness_path.write_text(cls._generate_script_harness(marker), encoding="utf-8")
                command = [
                    runtime,
                    "--quiet",
                    "--no-gui",
                    "--no-init-file",
                    "--no-history",
                    str(harness_path),
                ]
                try:
                    returncode, raw_stdout, raw_stderr, timed_out = cls._run_process(
                        command,
                        root,
                        cls._safe_environment(root),
                        self._timeout_seconds_for_runner(start_time),
                        self.memory_limit_mb,
                    )
                except FileNotFoundError as error:
                    message = str(error)
                    return cls._result(
                        verdict="UNAVAILABLE",
                        status="unavailable",
                        mode="script",
                        runtime_version=cls._runtime_version(runtime),
                        start_time=start_time,
                        output=f"GNU Octave execution is unavailable: {message}",
                        test_cases=[],
                        error={"kind": "unavailable", "message": message},
                    )
                except OSError as error:
                    message = str(error)
                    return cls._result(
                        verdict="RE",
                        status="runtime_error",
                        mode="script",
                        runtime_version=cls._runtime_version(runtime),
                        start_time=start_time,
                        output=f"GNU Octave process could not be started: {message}",
                        test_cases=[],
                        error={"kind": "process", "message": message},
                    )

                stdout = cls._bounded_text(raw_stdout, cls.MAX_SCRIPT_OUTPUT_BYTES)
                stderr = cls._bounded_text(raw_stderr, cls.MAX_OUTPUT_BYTES)
                warnings = cls._warnings_from_stderr(stderr)
                user_stdout = cls._strip_protocol_lines(stdout, marker)
                status_match = next(
                    (line for line in stdout.splitlines() if line.startswith(marker + "|")),
                    None,
                )
                if timed_out:
                    return cls._result(
                        verdict="TLE",
                        status="timeout",
                        mode="script",
                        runtime_version=cls._runtime_version(runtime),
                        start_time=start_time,
                        output=cls._combined_output(
                            user_stdout,
                            stderr,
                            f"GNU Octave execution timed out after {self._timeout_seconds_for_runner(start_time):.2f} seconds.",
                        ),
                        stdout=user_stdout,
                        stderr=stderr,
                        warnings=warnings,
                        test_cases=[],
                        error={"kind": "timeout", "message": "execution time limit exceeded"},
                    )

                artifacts = cls._collect_artifacts(root)
                if status_match is None:
                    status = "syntax_error" if returncode != 0 else "runtime_error"
                    message = "GNU Octave did not return an execution result marker."
                    return cls._result(
                        verdict="CE" if returncode != 0 else "RE",
                        status=status,
                        mode="script",
                        runtime_version=cls._runtime_version(runtime),
                        start_time=start_time,
                        output=cls._combined_output(user_stdout, stderr, message),
                        stdout=user_stdout,
                        stderr=stderr,
                        warnings=warnings,
                        artifacts=artifacts,
                        test_cases=[],
                        error={"kind": status, "message": message},
                    )

                fields = status_match.split("|", 2)
                script_failed = len(fields) < 2 or fields[1] != "0" or returncode != 0
                if script_failed:
                    message = fields[2].strip() if len(fields) > 2 and fields[2].strip() else "GNU Octave script raised an error."
                    return cls._result(
                        verdict="RE",
                        status="runtime_error",
                        mode="script",
                        runtime_version=cls._runtime_version(runtime),
                        start_time=start_time,
                        output=cls._combined_output(user_stdout, stderr, message),
                        stdout=user_stdout,
                        stderr=stderr,
                        warnings=warnings,
                        artifacts=artifacts,
                        test_cases=[],
                        error={"kind": "runtime", "message": message},
                    )

                return cls._result(
                    verdict="EXECUTED",
                    status="executed",
                    mode="script",
                    runtime_version=cls._runtime_version(runtime),
                    start_time=start_time,
                    output=cls._combined_output(user_stdout, stderr, "GNU Octave script executed."),
                    stdout=user_stdout,
                    stderr=stderr,
                    warnings=warnings,
                    artifacts=artifacts,
                    test_cases=[],
                )
        except (OSError, ValueError, UnicodeError) as error:
            return cls._result(
                verdict="RE",
                status="runtime_error",
                mode="script",
                runtime_version=cls._runtime_version(runtime),
                start_time=start_time,
                output=f"GNU Octave script setup failed: {error}",
                test_cases=[],
                error={"kind": "setup", "message": str(error)},
            )

    def _timeout_seconds_for_runner(self, start_time: float) -> float:
        # The BaseRunner timeout is the per-process budget.  Keeping this as a
        # method makes it easy for tests to substitute a bounded budget while
        # retaining the BaseRunner contract.
        del start_time
        return max(0.001, float(self.timeout_seconds))

    @classmethod
    def _exception_text(cls, value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, bytes):
            return value.decode("utf-8", errors="replace")
        return str(value)

    @classmethod
    def _parse_markers(
        cls,
        output: str,
        test_cases: Sequence[Dict[str, Any]],
        marker: str,
    ) -> Tuple[List[TestCaseResult], int, bool]:
        parsed: Dict[int, Tuple[int, float, str, Optional[str]]] = {}
        for line in output.splitlines():
            if not line.startswith(marker + "|"):
                continue
            fields = line.split("|", 5)
            if len(fields) != 6:
                continue
            try:
                index = int(fields[1])
                status = int(fields[2])
                duration_ms = float(fields[3])
            except (TypeError, ValueError):
                continue
            if 0 <= index < len(test_cases) and index not in parsed:
                message = fields[5].strip() or None
                parsed[index] = (status, duration_ms, fields[4], message)

        results: List[TestCaseResult] = []
        runtime_error = False
        for index, test_case in enumerate(test_cases):
            hidden = bool(test_case.get("hidden", False))
            if index in parsed:
                status, duration_ms, actual, message = parsed[index]
                passed = status == 1
                runtime_error = runtime_error or status == 2
                actual_value: Any = actual
                result_message = message
            else:
                passed = False
                duration_ms = 0.0
                actual_value = "No result returned by GNU Octave"
                result_message = "GNU Octave did not return a result for this test case."
            results.append(
                TestCaseResult(
                    test_case_id=str(test_case.get("id", index + 1)),
                    passed=passed,
                    input=test_case.get("input") if not hidden else "[Hidden]",
                    expected=test_case.get("expected") if not hidden else "[Hidden]",
                    actual=(
                        actual_value
                        if not hidden
                        else ("[Match]" if passed else "[Hidden]")
                    ),
                    execution_time_ms=round(duration_ms, 2),
                    message=result_message,
                    hidden=hidden,
                )
            )
        return results, len(parsed), runtime_error

    @classmethod
    def _strip_protocol_lines(cls, output: str, marker: str) -> str:
        return "\n".join(
            line for line in output.splitlines()
            if not line.startswith(marker + "|")
        ).strip()

    @classmethod
    def _warnings_from_stderr(cls, stderr: str) -> List[str]:
        return [line.strip() for line in stderr.splitlines() if "warning" in line.lower()]

    @classmethod
    def _parse_numeric_text(cls, text: Any) -> Any:
        value = str(text or "").strip()
        if not value:
            return None
        if value.startswith("[") and value.endswith("]"):
            body = value[1:-1].strip()
            if not body:
                return []
            rows = re.split(r";|\n", body)
            parsed_rows: List[List[float]] = []
            for row in rows:
                numbers = cls._NUMBER_RE.findall(row)
                if not numbers:
                    return value
                parsed_rows.append([float(number) for number in numbers])
            return parsed_rows[0] if len(parsed_rows) == 1 else parsed_rows
        if cls._NUMBER_RE.fullmatch(value):
            return float(value)
        return value

    @classmethod
    def _numerical_results(cls, results: Sequence[TestCaseResult]) -> List[Dict[str, Any]]:
        return [
            {
                "test_case_id": result.test_case_id,
                "value": cls._parse_numeric_text(result.actual),
                "passed": result.passed,
            }
            for result in results
            if not result.hidden
        ]

    @classmethod
    def _parse_results(
        cls,
        output: str,
        test_cases: Sequence[Dict[str, Any]],
        marker: Optional[str] = None,
    ) -> List[TestCaseResult]:
        """Parse harness output; retained as a small compatibility helper."""

        marker = marker or "ENGINX_RESULT"
        results, _, _ = cls._parse_markers(output, test_cases, marker)
        return results

    @classmethod
    def _collect_artifacts(cls, root: Path) -> List[Dict[str, Any]]:
        """Collect only real, bounded image files created below ``root``.

        The temporary directory is deleted after the result is built, so the
        response contains a relative name, digest, and (for small files) a data
        URI rather than an unusable host path.  Invalid or empty image files
        are ignored and arbitrary user files never leave the run directory.
        """

        artifacts: List[Dict[str, Any]] = []
        try:
            candidates = sorted(root.rglob("*"), key=lambda path: str(path))
        except OSError:
            return artifacts

        for path in candidates:
            if len(artifacts) >= cls.MAX_ARTIFACTS:
                break
            try:
                if not path.is_file() or path.is_symlink():
                    continue
                relative = path.relative_to(root)
                if any(part in {"", ".", ".."} for part in relative.parts):
                    continue
                image_type = cls._IMAGE_TYPES.get(path.suffix.lower())
                if image_type is None:
                    continue
                mime_type, signature = image_type
                size = path.stat().st_size
                if size <= 0:
                    continue
                with path.open("rb") as image_file:
                    prefix = image_file.read(4096)
                if signature is not None and not prefix.startswith(signature):
                    continue
                if signature is None and b"<svg" not in prefix.lower():
                    continue

                digest = hashlib.sha256()
                data = bytearray()
                with path.open("rb") as image_file:
                    while True:
                        chunk = image_file.read(64 * 1024)
                        if not chunk:
                            break
                        digest.update(chunk)
                        if len(data) < cls.MAX_DATA_URI_BYTES:
                            data.extend(chunk[: cls.MAX_DATA_URI_BYTES - len(data)])

                artifact: Dict[str, Any] = {
                    "kind": "plot",
                    "filename": relative.as_posix(),
                    "mime_type": mime_type,
                    "size_bytes": size,
                    "sha256": digest.hexdigest(),
                }
                if size <= cls.MAX_DATA_URI_BYTES:
                    artifact["data_uri"] = (
                        f"data:{mime_type};base64,{base64.b64encode(bytes(data)).decode('ascii')}"
                    )
                else:
                    artifact["data_uri_omitted"] = "artifact exceeds data URI limit"
                # A very large artifact is still represented as metadata, but
                # it is not copied into the response body.
                if size <= cls.MAX_ARTIFACT_BYTES or "data_uri" not in artifact:
                    artifacts.append(artifact)
            except (OSError, ValueError):
                continue
        return artifacts


# The explicit alias makes the implementation discoverable under the runtime's
# name while preserving the existing import used by evaluator.py and callers.
OctaveRunner = MatlabRunner
