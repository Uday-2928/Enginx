"""
Base Runner Interface for EnginX Evaluation Sandbox
"""
import time
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class TestCaseResult(BaseModel):
    test_case_id: str
    passed: bool
    input: Any
    expected: Any
    actual: Any
    execution_time_ms: float = 0.0
    message: Optional[str] = None
    hidden: bool = False

class EvaluationResult(BaseModel):
    verdict: str  # 'AC', 'WA', 'TLE', 'CE', 'RE'
    # ``status`` describes the execution service state independently from the
    # assessment verdict.  For example, a timeout is not a failed numerical
    # answer and an unavailable runtime is not a student result.
    status: str = "evaluated"
    mode: str = "test"
    runtime: str = "unknown"
    runtime_version: Optional[str] = None
    total_time_ms: float
    memory_used_kb: float
    output: str
    test_results: List[TestCaseResult]
    passed_count: int
    total_count: int
    # Optional fields used by runners that execute an external toolchain.  The
    # defaults keep the existing runner response contract backwards compatible.
    stdout: str = ""
    stderr: str = ""
    warnings: List[str] = Field(default_factory=list)
    numerical_results: List[Dict[str, Any]] = Field(default_factory=list)
    artifacts: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[Dict[str, Any]] = None

class BaseRunner(ABC):
    def __init__(self, timeout_seconds: float = 5.0, memory_limit_mb: int = 128):
        self.timeout_seconds = timeout_seconds
        self.memory_limit_mb = memory_limit_mb

    @abstractmethod
    def evaluate(self, code: str, test_cases: List[Dict[str, Any]]) -> EvaluationResult:
        """
        Executes code against test cases and produces an EvaluationResult.
        """
        pass

    def compare_outputs(self, actual: str, expected: str) -> bool:
        """
        Normalizes and compares actual vs expected text.
        """
        if actual is None or expected is None:
            return actual == expected
        norm_actual = "\n".join([line.strip() for line in str(actual).strip().splitlines() if line.strip()])
        norm_expected = "\n".join([line.strip() for line in str(expected).strip().splitlines() if line.strip()])
        return norm_actual == norm_expected
