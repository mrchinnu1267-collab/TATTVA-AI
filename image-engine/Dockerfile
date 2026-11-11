# TATTVA AI - Neural Diffusion Engine Docker Container
# Optimized for GPU Deployment on Hugging Face Spaces / Modal / RunPod / GCP Cloud Run with GPU
FROM python:3.10-slim

# Avoid interactive prompts and configure Python environment
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8001 \
    HOST=0.0.0.0

# Install essential system dependencies for OpenCV, Pillow, and networking
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install PyTorch with CUDA 12.1 support
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY config.json utils.py pipeline.py main.py ./

# Create cache directory for Hugging Face models
ENV HF_HOME=/app/cache
RUN mkdir -p /app/cache && chmod -R 777 /app/cache

# Expose internal port
EXPOSE 8001

# Healthcheck to ensure container stability
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Start FastAPI application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]

