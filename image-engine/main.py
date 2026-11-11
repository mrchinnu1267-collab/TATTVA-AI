"""FastAPI server for offline and cloud-hosted Diffusers image generation.

Local start:
    python main.py
or:
    uvicorn main:app --host 127.0.0.1 --port 8001

Cloud container start:
    uvicorn main:app --host 0.0.0.0 --port 8001 --workers 1

Features:
- Bearer token / X-API-Key authentication (via ENGINE_API_KEY env var)
- Concurrency limiting via asyncio.Semaphore to prevent GPU OOM
- Reference image conditioning (image-to-image with strength)
- Health check endpoint with VRAM and model metadata
"""

from __future__ import annotations

import asyncio
import os
import time
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Header, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from pipeline import CONFIG, DEFAULTS, pipeline
from utils import image_to_base64


app = FastAPI(
    title="TATTVA Neural Diffusion Engine",
    version="1.2.0",
    description="High-performance Diffusers backend for TATTVA AI image generation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Concurrency limiter to protect GPU memory
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT_REQUESTS", "1"))
concurrency_semaphore = asyncio.Semaphore(MAX_CONCURRENT)

# Authentication setup
security_scheme = HTTPBearer(auto_error=False)


def verify_api_key(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> None:
    expected_key = (os.getenv("ENGINE_API_KEY") or os.getenv("API_KEY") or "").strip()
    if not expected_key:
        # No key configured: open access (convenient for local offline use)
        return

    provided_token = auth.credentials if auth else x_api_key
    if not provided_token or provided_token.strip() != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key for TATTVA Image Engine.",
            headers={"WWW-Authenticate": "Bearer"},
        )


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=8000)
    negative_prompt: Optional[str] = ""
    width: Optional[int] = Field(default=1024, ge=64, le=4096)
    height: Optional[int] = Field(default=1024, ge=64, le=4096)
    steps: Optional[int] = Field(default=None, ge=1, le=100)
    cfg_scale: Optional[float] = Field(default=None, ge=0, le=20)
    seed: Optional[int] = None
    model: Optional[str] = None
    reference_image: Optional[str] = None
    strength: Optional[float] = Field(default=None, ge=0, le=1)


@app.get("/")
async def root():
    return {
        "name": "TATTVA Neural Diffusion Engine",
        "version": app.version,
        "cloud_ready": True,
        "auth_required": bool((os.getenv("ENGINE_API_KEY") or os.getenv("API_KEY") or "").strip()),
        "endpoints": ["/health", "/models", "/generate", "/unload"],
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "device": pipeline.device,
        "dtype": str(pipeline.torch_dtype).replace("torch.", ""),
        "model_loaded": pipeline.pipe is not None,
        "loaded_model": pipeline.loaded_model,
        "default_model": pipeline.default_model,
        "vram": pipeline.vram(),
        "last_error": pipeline.last_error,
        "auth_required": bool((os.getenv("ENGINE_API_KEY") or os.getenv("API_KEY") or "").strip()),
        "max_concurrent": MAX_CONCURRENT,
    }


@app.get("/models")
async def models():
    return {
        "default": pipeline.default_model,
        "loaded": pipeline.loaded_model,
        "available": pipeline.describe_models(),
    }


@app.post("/unload", dependencies=[Depends(verify_api_key)])
async def unload():
    pipeline.unload()
    return {"status": "ok", "loaded": None}


@app.post("/generate", dependencies=[Depends(verify_api_key)])
async def generate(req: GenerateRequest):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    # Acquire concurrency lock to prevent GPU memory collisions
    async with concurrency_semaphore:
        start = time.time()
        try:
            image, seed, width, height = await asyncio.to_thread(
                pipeline.generate,
                prompt=prompt,
                negative_prompt=req.negative_prompt or DEFAULTS.get("negative_prompt", ""),
                width=req.width or 1024,
                height=req.height or 1024,
                steps=req.steps,
                cfg_scale=req.cfg_scale,
                seed=req.seed,
                model=req.model,
                reference_image=req.reference_image,
                strength=req.strength,
            )
            return {
                "image": image_to_base64(image),
                "seed": seed,
                "model": f"{pipeline.loaded_model or req.model or 'local'}-local",
                "width": width,
                "height": height,
                "duration_ms": int((time.time() - start) * 1000),
            }
        except FileNotFoundError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            message = str(exc)
            err_status = 503 if "Failed to load model" in message else 500
            raise HTTPException(status_code=err_status, detail=message) from exc
        except Exception as exc:  # noqa: BLE001 - report a useful message to the app
            raise HTTPException(status_code=500, detail=f"Generation failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    server = CONFIG.get("server", {})
    host = os.getenv("HOST", server.get("host", "127.0.0.1"))
    port = int(os.getenv("PORT", server.get("port", 8001)))
    uvicorn.run("main:app", host=host, port=port, reload=False)

