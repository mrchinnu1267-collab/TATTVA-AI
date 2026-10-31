from pathlib import Path
from io import BytesIO
import base64
import time

import torch
import uvicorn
from diffusers import StableDiffusionPipeline
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# --------------------------------------------------
# TATTVA IMAGE ENGINE CONFIGURATION
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "generated"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL_ID = "stable-diffusion-v1-5/stable-diffusion-v1-5"
WIDTH = 512
HEIGHT = 512
DEFAULT_STEPS = 28
DEFAULT_GUIDANCE = 7.0

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32

print("=" * 50)
print("          TATTVA IMAGE ENGINE")
print("=" * 50)
print("Device:", DEVICE)

if DEVICE == "cuda":
    print("GPU:", torch.cuda.get_device_name(0))
    torch.backends.cuda.matmul.allow_tf32 = True

# --------------------------------------------------
# LOAD THE MODEL ONCE AT STARTUP
# --------------------------------------------------

print("\nLoading Stable Diffusion 1.5...")

pipe = StableDiffusionPipeline.from_pretrained(
    MODEL_ID,
    torch_dtype=DTYPE,
    safety_checker=None,
    requires_safety_checker=False,
)

# Supported by the installed Diffusers pipeline.
pipe.enable_attention_slicing()
pipe = pipe.to(DEVICE)

print("Image model loaded successfully.")
print("Generation resolution:", f"{WIDTH}x{HEIGHT}")

# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="TATTVA Image Engine",
    version="2.1.0",
    description="Local Stable Diffusion image-generation API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class ImageRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=1000)
    negative_prompt: str = Field(
        default=(
            "blurry, low quality, low resolution, distorted anatomy, "
            "deformed hands, extra fingers, missing fingers, extra limbs, "
            "duplicate objects, malformed face, asymmetrical eyes, "
            "bad proportions, text, watermark, logo, compression artifacts, "
            "collage, split screen, multiple panels, grid, contact sheet, "
            "duplicate scene, tiled image, multiple views"
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
        "model": "Stable Diffusion 1.5",
        "resolution": f"{WIDTH}x{HEIGHT}",
    }


@app.post("/generate")
def generate_image(request: ImageRequest):
    prompt = request.prompt.strip()
    if len(prompt) < 3:
        raise HTTPException(
            status_code=400,
            detail="Please enter an image prompt with at least 3 characters.",
        )

    started_at = time.time()

    # Use a fixed seed when supplied, or a random seed otherwise.
    generator = None
    if request.seed is not None:
        generator = torch.Generator(device=DEVICE).manual_seed(request.seed)

    quality_prompt = (
        f"{prompt}, single coherent image, clear main subject, "
        "well-defined composition, consistent lighting, clean details"
    )

    try:
        print("\n" + "-" * 45)
        print("Generating image...")
        print("Prompt:", prompt[:160])
        print("Steps:", request.steps)
        print("Guidance:", request.guidance_scale)
        print("Seed:", request.seed)

        with torch.inference_mode():
            result = pipe(
                prompt=quality_prompt,
                negative_prompt=request.negative_prompt,
                height=HEIGHT,
                width=WIDTH,
                num_inference_steps=request.steps,
                guidance_scale=request.guidance_scale,
                generator=generator,
            )

        image = result.images[0]

        filename = (
            f"tattva_{time.strftime('%Y%m%d_%H%M%S')}_"
            f"{time.time_ns() % 1_000_000}.png"
        )
        output_path = OUTPUT_DIR / filename
        image.save(output_path, format="PNG")

        buffer = BytesIO()
        image.save(buffer, format="PNG")
        image_data = base64.b64encode(buffer.getvalue()).decode("utf-8")
        elapsed = round(time.time() - started_at, 2)

        print("Image generated:", output_path)
        print("Generation time:", elapsed, "seconds")

        return {
            "success": True,
            "image": f"data:image/png;base64,{image_data}",
            "prompt": prompt,
            "provider": "TATTVA Image Engine",
            "model": "Stable Diffusion 1.5",
            "width": WIDTH,
            "height": HEIGHT,
            "steps": request.steps,
            "guidance_scale": request.guidance_scale,
            "seed": request.seed,
            "generation_time_seconds": elapsed,
            "saved_file": filename,
        }

    except Exception as error:
        print("Image generation failed:", repr(error))
        if DEVICE == "cuda":
            torch.cuda.empty_cache()
        raise HTTPException(
            status_code=500,
            detail=(
                "Image generation failed. Check the Python server terminal "
                "for the underlying error."
            ),
        ) from error


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info",
    )
