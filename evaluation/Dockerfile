# ==========================================
# EnginX Evaluation Sandbox Dockerfile
# Provides isolated execution for Verilog, C, Python, MATLAB-compatible code, and CTF
# ==========================================
FROM python:3.11-slim

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install essential compilers, simulators, and debugging tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    make \
    iverilog \
    octave \
    gnuplot-nox \
    time \
 && rm -rf /var/lib/apt/lists/*

# Create isolated unprivileged sandbox user
RUN useradd -m -s /bin/bash sandboxuser
WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy evaluator service code
COPY . /app

# Ensure proper permissions
RUN chown -R sandboxuser:sandboxuser /app

# Run as sandbox user for security isolation
USER sandboxuser

EXPOSE 8001

CMD ["uvicorn", "evaluator:app", "--host", "0.0.0.0", "--port", "8001"]
