from pathlib import Path
from io import BytesIO
import base64
import time
import secrets

import torch
import uvicorn
from diffusers import StableDiffusionPipeline
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# --------------------------------------------------
# TATTVA IMAGE ENGINE
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "generated"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL_ID = str(
    BASE_DIR
    / "models"
    / "realistic-vision"
    / "Realistic_Vision_V5.1_fp16-no-ema.safetensors"
)

WIDTH = 512
HEIGHT = 512
DEFAULT_STEPS = 25
DEFAULT_GUIDANCE = 7.0

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32
MODEL_NAME = "Realistic Vision V5.1 FP16"

print("=" * 54)
print("                 TATTVA IMAGE ENGINE")
print("=" * 54)
print("Device:", DEVICE)
if DEVICE == "cuda":
    print("GPU:", torch.cuda.get_device_name(0))
    print("VRAM (GB):", round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2))

if not Path(MODEL_ID).is_file():
    raise FileNotFoundError(
        f"Model checkpoint not found:\n{MODEL_ID}\n"
        "Check that the .safetensors file exists in models/realistic-vision."
    )

# --------------------------------------------------
# LOAD MODEL ONCE
# --------------------------------------------------

print(f"\nLoading {MODEL_NAME}...")
print("The first startup may take a few minutes.")

pipe = StableDiffusionPipeline.from_single_file(
    MODEL_ID,
    torch_dtype=DTYPE,
    safety_checker=None,
    requires_safety_checker=False,
)

# Keep memory use manageable on a 4 GB RTX 3050.
pipe.enable_attention_slicing()

if DEVICE == "cuda":
    try:
        # Requires accelerate; keeps parts of the model on CPU as needed.
        pipe.enable_model_cpu_offload()
        print("Enabled model CPU offloading for limited VRAM.")
    except Exception as exc:
        print("CPU offloading unavailable:", str(exc))
        print("Using standard CUDA placement; VRAM may be insufficient.")
        pipe = pipe.to(DEVICE)
else:
    pipe = pipe.to(DEVICE)

print("Image model loaded successfully.")
print("Model:", MODEL_NAME)
print("Resolution:", f"{WIDTH}x{HEIGHT}")

# --------------------------------------------------
# FASTAPI
# --------------------------------------------------

app = FastAPI(
    title="TATTVA Image Engine",
    version="2.2.0",
    description="Local image generation using Realistic Vision",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


class ImageRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=1000)
    negative_prompt: str = Field(
        default=(
            "blurry, low quality, low resolution, bad anatomy, malformed hands, "
            "extra fingers, missing fingers, extra limbs, distorted face, "
            "asymmetrical eyes, bad proportions, duplicate subject, text, "
            "watermark, logo, collage, split screen, grid, contact sheet, "
            "tiled image, multiple views"
        ),
        max_length=1500,
    )
    steps: int = Field(default=DEFAULT_STEPS, ge=15, le=35)
    guidance_scale: float = Field(default=DEFAULT_GUIDANCE, ge=1.0, le=12.0)
    seed: int | None = Field(default=None, ge=0, le=2147483647)


@app.get("/health")
def health():
    return {
        "status": "ready",
        "device": DEVICE,
        "model": MODEL_NAME,
        "resolution": f"{WIDTH}x{HEIGHT}",
    }


@app.post("/generate")
def generate_image(request: ImageRequest):
    prompt = request.prompt.strip()
    if len(prompt) < 3:
        raise HTTPException(status_code=400, detail="Please enter a longer image prompt.")

    seed = request.seed if request.seed is not None else secrets.randbelow(2**31)
    generator_device = "cuda" if DEVICE == "cuda" else "cpu"
    generator = torch.Generator(device=generator_device).manual_seed(seed)

    quality_prompt = (
        f"{prompt}, one coherent image, one main subject, clear composition, "
        "natural proportions, detailed textures, professional lighting"
    )

    started_at = time.time()
    try:
        print("\n" + "-" * 48)
        print("Generating image...")
        print("Prompt:", prompt[:160])
        print("Steps:", request.steps, "| Seed:", seed)

        with torch.inference_mode():
            result = pipe(
                prompt=quality_prompt,
                negative_prompt=request.negative_prompt,
                width=WIDTH,
                height=HEIGHT,
                num_inference_steps=request.steps,
                guidance_scale=request.guidance_scale,
                generator=generator,
            )

        image = result.images[0]
        filename = f"tattva_{time.strftime('%Y%m%d_%H%M%S')}_{time.time_ns() % 1_000_000}.png"
        output_path = OUTPUT_DIR / filename
        image.save(output_path, format="PNG")

        buffer = BytesIO()
        image.save(buffer, format="PNG")
        image_data = base64.b64encode(buffer.getvalue()).decode("utf-8")
        elapsed = round(time.time() - started_at, 2)

        print("Saved:", output_path)
        print("Generation time:", elapsed, "seconds")

        return {
            "success": True,
            "image": f"data:image/png;base64,{image_data}",
            "prompt": prompt,
            "provider": "TATTVA Image Engine",
            "model": MODEL_NAME,
            "width": WIDTH,
            "height": HEIGHT,
            "steps": request.steps,
            "guidance_scale": request.guidance_scale,
            "seed": seed,
            "generation_time_seconds": elapsed,
            "saved_file": filename,
        }

    except torch.cuda.OutOfMemoryError as exc:
        if DEVICE == "cuda":
            torch.cuda.empty_cache()
        print("CUDA out of memory:", repr(exc))
        raise HTTPException(
            status_code=503,
            detail="GPU memory is insufficient for this generation. Try again with fewer steps or close GPU-heavy apps.",
        ) from exc
    except Exception as exc:
        if DEVICE == "cuda":
            torch.cuda.empty_cache()
        print("Image generation failed:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="Image generation failed. Check the Python server terminal for details.",
        ) from exc


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
