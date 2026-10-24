"""
EnginX Evaluation Sandbox Microservice
Main FastAPI application providing isolated execution endpoints.
"""
import shutil
from typing import List, Dict, Any, Optional, Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from runners.verilog_runner import VerilogRunner
from runners.c_runner import CRunner
from runners.python_runner import PythonRunner
from runners.ctf_runner import CTFRunner
from runners.hardware_runner import HardwareRunner
from runners.matlab_runner import MatlabRunner

app = FastAPI(
    title="EnginX Evaluation Sandbox",
    description="Isolated multi-discipline evaluation engine for Verilog, C, Python, MATLAB-compatible code, and CTF",
    version="1.0.0"
)

# Enable CORS for local and container communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TestCaseModel(BaseModel):
    id: Optional[str] = "1"
    input: Any
    expected: Any
    description: Optional[str] = None
    entry_point: Optional[str] = None
    hidden: Optional[bool] = False

class EvaluateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=256 * 1024)
    language: str  # 'verilog', 'c', 'python', 'matlab', 'javascript', 'ctf'
    test_cases: List[Dict[str, Any]] = Field(default_factory=list)
    mode: Literal["test", "script"] = "test"
    time_limit_ms: Optional[int] = Field(default=2000, ge=250, le=30000)
    memory_limit_mb: Optional[int] = Field(default=128, ge=32, le=1024)

@app.get("/")
def root():
    return {
        "service": "EnginX Evaluation Sandbox",
        "status": "online",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "compilers": {
            "gcc": shutil.which("gcc") is not None,
            "iverilog": shutil.which("iverilog") is not None,
            "octave": shutil.which("octave-cli") is not None or shutil.which("octave") is not None,
            "python3": True
        }
    }

def _evaluate_request(req: EvaluateRequest):
    lang = req.language.lower().strip()
    timeout_sec = (req.time_limit_ms or 2000) / 1000.0
    mem_mb = req.memory_limit_mb or 128

    if lang in ["verilog", "v"]:
        runner = VerilogRunner(timeout_seconds=timeout_sec, memory_limit_mb=mem_mb)
    elif lang in ["c", "cpp"]:
        runner = CRunner(timeout_seconds=timeout_sec, memory_limit_mb=mem_mb)
    elif lang in ["python", "py"]:
        runner = PythonRunner(timeout_seconds=timeout_sec, memory_limit_mb=mem_mb)
    elif lang in ["ctf", "cybersecurity"]:
        runner = CTFRunner(timeout_seconds=timeout_sec, memory_limit_mb=mem_mb)
    elif lang in ["robotics", "hardware"]:
        runner = HardwareRunner(timeout_seconds=timeout_sec, memory_limit_mb=mem_mb)
    elif lang in ["matlab", "octave", "m"]:
        runner = MatlabRunner(timeout_seconds=timeout_sec, memory_limit_mb=mem_mb)
    else:
        # Default to Python runner if unspecified
        runner = PythonRunner(timeout_seconds=timeout_sec, memory_limit_mb=mem_mb)

    try:
        if lang in ["matlab", "octave", "m"] and req.mode == "script":
            result = runner.execute_script(req.code)
        else:
            result = runner.evaluate(req.code, req.test_cases)
        return result.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation server error: {str(e)}")


@app.post("/api/evaluate")
def evaluate_code(req: EvaluateRequest):
    """Evaluate a challenge submission or a MATLAB-compatible script."""
    return _evaluate_request(req)


@app.post("/api/evaluate/script")
def evaluate_script(req: EvaluateRequest):
    """Dedicated script route; only MATLAB/Octave aliases are accepted."""
    language = req.language.lower().strip()
    if language not in {"matlab", "octave", "m"}:
        raise HTTPException(status_code=422, detail="The script endpoint only accepts MATLAB-compatible source.")
    return _evaluate_request(req.model_copy(update={"mode": "script", "test_cases": []}))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("evaluator:app", host="0.0.0.0", port=8001, reload=True)
