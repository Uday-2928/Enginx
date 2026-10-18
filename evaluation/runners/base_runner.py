"""
Base Runner Interface for EnginX Evaluation Sandbox
"""
import time
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

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
    total_time_ms: float
    memory_used_kb: float
    output: str
    test_results: List[TestCaseResult]
    passed_count: int
    total_count: int

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
