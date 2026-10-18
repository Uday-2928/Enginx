"""
EnginX Evaluation Sandbox Microservice
Main FastAPI application providing isolated execution endpoints.
"""
import shutil
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from runners.verilog_runner import VerilogRunner
from runners.c_runner import CRunner
from runners.python_runner import PythonRunner
from runners.ctf_runner import CTFRunner
from runners.hardware_runner import HardwareRunner

app = FastAPI(
    title="EnginX Evaluation Sandbox",
    description="Isolated multi-discipline evaluation engine for Verilog, C, Python, and CTF",
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
    code: str
    language: str  # 'verilog', 'c', 'python', 'javascript', 'ctf'
    test_cases: List[Dict[str, Any]]
    time_limit_ms: Optional[int] = 2000
    memory_limit_mb: Optional[int] = 128

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
            "python3": True
        }
    }

@app.post("/api/evaluate")
def evaluate_code(req: EvaluateRequest):
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
    else:
        # Default to Python runner if unspecified
        runner = PythonRunner(timeout_seconds=timeout_sec, memory_limit_mb=mem_mb)

    try:
        result = runner.evaluate(req.code, req.test_cases)
        return result.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("evaluator:app", host="0.0.0.0", port=8001, reload=True)
