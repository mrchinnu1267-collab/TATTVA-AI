"""FastAPI server for optional offline image generation.

Start it with:
    uvicorn main:app --host 127.0.0.1 --port 8001
or:
    python main.py

The Next.js image engine probes `GET /health` and uses `POST /generate`.
"""

from __future__ import annotations

import os
import time
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from pipeline import CONFIG, DEFAULTS, pipeline
from utils import image_to_base64


app = FastAPI(
    title="TATTVA Local Image Engine",
    version="1.1.0",
    description="Local SDXL / SD1.5 backend for the TATTVA AI image engine.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        "name": "TATTVA Local Image Engine",
        "version": app.version,
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
    }


@app.get("/models")
async def models():
    return {
        "default": pipeline.default_model,
        "loaded": pipeline.loaded_model,
        "available": pipeline.describe_models(),
    }


@app.post("/unload")
async def unload():
    pipeline.unload()
    return {"status": "ok", "loaded": None}


@app.post("/generate")
async def generate(req: GenerateRequest):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    start = time.time()
    try:
        image, seed, width, height = pipeline.generate(
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
        status = 503 if "Failed to load model" in message else 500
        raise HTTPException(status_code=status, detail=message) from exc
    except Exception as exc:  # noqa: BLE001 - report a useful message to the app
        raise HTTPException(status_code=500, detail=f"Generation failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    server = CONFIG.get("server", {})
    host = os.getenv("HOST", server.get("host", "127.0.0.1"))
    port = int(os.getenv("PORT", server.get("port", 8001)))
    uvicorn.run("main:app", host=host, port=port, reload=False)
