from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
from threading import Lock
from typing import Literal, Dict, List, Any, Optional
import base64
import secrets
import time

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from prompt_enhancer import TattvaPromptEnhancer
from model_manager import TattvaModelManager
from gpu_manager import TattvaGPUManager

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "generated"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
WIDTH = HEIGHT = 512

models = TattvaModelManager()
gpu = TattvaGPUManager()
enhancer = TattvaPromptEnhancer()
generation_lock = Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
    models.load_model("realistic")
    yield
    models._release_current_model()


app = FastAPI(title="TATTVA AI Image Engine", version="3.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


from PIL import Image as PILImage


class ImageRequest(BaseModel):
    prompt: str = Field(min_length=2, max_length=2500)
    negative_prompt: str = Field(default="deformed, bad anatomy, disfigured, poorly drawn face, mutation, mutated, extra limb, ugly, disgusting, poorly drawn hands, missing limb, floating limbs, disconnected limbs, malformed hands, blurry, mutated hands and fingers, watermark, oversaturated, low quality, duplicate artifacts", max_length=1500)
    model: Literal["realistic", "turbo"] = "realistic"
    steps: int | None = Field(default=None, ge=1, le=50)
    guidance_scale: float | None = Field(default=None, ge=0.0, le=12.0)
    seed: int | None = Field(default=None, ge=0, le=2147483647)
    width: int | None = Field(default=512, ge=384, le=768)
    height: int | None = Field(default=512, ge=384, le=768)
    style: str = ""
    enhance_prompt: bool = False


class EditImageRequest(BaseModel):
    prompt: str = Field(min_length=2, max_length=2500)
    image: str = Field(description="Base64 encoded reference image or data URI")
    strength: float = Field(default=0.65, ge=0.1, le=0.95)
    negative_prompt: str = Field(default="blurry, low quality, bad anatomy, distorted, artifacts", max_length=1500)
    model: Literal["realistic", "turbo"] = "realistic"
    steps: int | None = Field(default=None, ge=1, le=35)
    guidance_scale: float | None = Field(default=None, ge=0.0, le=12.0)
    seed: int | None = Field(default=None, ge=0, le=2147483647)
    style: str = ""
    enhance_prompt: bool = False


@app.get("/")
def root():
    return {"name": "TATTVA AI Image Engine", "version": "3.0.0", "status": "running", "docs": "/docs"}


@app.get("/health")
def health():
    cfg = models.get_model(models.current_model) if models.current_model else None
    return {
        "status": "ready" if models.pipe is not None else "loading",
        "device": models.device,
        "model_id": models.current_model,
        "model": cfg["name"] if cfg else None,
        "resolution": f"{WIDTH}x{HEIGHT}",
        "prompt_enhancer": "enabled",
        "version": "3.0.0",
    }


@app.get("/models")
def list_models():
    return {"models": models.get_available_models(), "current_model": models.current_model}


@app.get("/gpu")
def gpu_status():
    return {"gpu": models.get_gpu_information(), "manager": gpu.get_gpu_status()}


@app.post("/generate")
def generate_image(request: ImageRequest):
    prompt = request.prompt.strip()
    if len(prompt) < 3:
        raise HTTPException(status_code=400, detail="Please enter a longer image prompt.")

    cfg = models.get_model(request.model)
    if request.enhance_prompt:
        enhanced = enhancer.enhance(prompt, request.style)
        final_prompt = enhanced["enhanced_prompt"]
        final_negative = ", ".join(
            p for p in [request.negative_prompt.strip(), enhanced["negative_prompt"].strip()] if p
        )
    else:
        final_prompt = prompt
        final_negative = request.negative_prompt.strip()

    # Turbo is designed for 1-4 inference steps and guidance_scale=0.
    if request.model == "turbo":
        actual_steps = min(request.steps or cfg["steps"], 4)
        actual_guidance = 0.0
    else:
        actual_steps = request.steps or cfg["steps"]
        actual_guidance = request.guidance_scale if request.guidance_scale is not None else cfg["guidance"]

    # Align dimensions to multiples of 64
    w = (request.width // 64) * 64 if request.width else WIDTH
    h = (request.height // 64) * 64 if request.height else HEIGHT

    seed = request.seed if request.seed is not None else secrets.randbelow(2**31)
    generator = torch.Generator(device="cpu").manual_seed(seed)
    started = time.time()

    try:
        with generation_lock:
            pipe = models.load_model(request.model)
            kwargs = {
                "prompt": final_prompt,
                "width": w,
                "height": h,
                "num_inference_steps": actual_steps,
                "guidance_scale": actual_guidance,
                "generator": generator,
            }
            if request.model == "realistic" and final_negative:
                kwargs["negative_prompt"] = final_negative

            with torch.inference_mode():
                image = pipe(**kwargs).images[0]

            filename = f"tattva_{time.strftime('%Y%m%d_%H%M%S')}_{time.time_ns() % 1000000}.png"
            image.save(OUTPUT_DIR / filename, format="PNG")
            buffer = BytesIO()
            image.save(buffer, format="PNG")
            image_data = base64.b64encode(buffer.getvalue()).decode("utf-8")
            elapsed = round(time.time() - started, 2)

            if torch.cuda.is_available():
                torch.cuda.empty_cache()

        return {
            "success": True,
            "image": f"data:image/png;base64,{image_data}",
            "prompt": prompt,
            "original_prompt": prompt,
            "enhanced_prompt": final_prompt,
            "prompt_enhanced": request.enhance_prompt,
            "style": request.style,
            "provider": "TATTVA AI Local Engine",
            "model": cfg["name"],
            "model_id": request.model,
            "width": image.width,
            "height": image.height,
            "steps": actual_steps,
            "guidance_scale": actual_guidance,
            "seed": seed,
            "generation_time_seconds": elapsed,
            "saved_file": filename,
        }
    except torch.cuda.OutOfMemoryError as exc:
        models._release_current_model()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        raise HTTPException(status_code=503, detail="GPU memory ran out. Retry with fewer GPU applications open. Realistic Vision is recommended on 4GB VRAM.") from exc
    except HTTPException:
        raise
    except Exception as exc:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        print("IMAGE GENERATION FAILED:", repr(exc))
        raise HTTPException(status_code=500, detail=f"Image generation failed: {type(exc).__name__}. Check the Python server terminal.") from exc


@app.post("/edit")
def edit_image(request: EditImageRequest):
    prompt = request.prompt.strip()
    if len(prompt) < 3:
        raise HTTPException(status_code=400, detail="Please enter an edit instruction.")

    # Decode base64 input image
    raw_b64 = request.image
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(raw_b64)
        init_image = PILImage.open(BytesIO(image_bytes)).convert("RGB")
        init_image = init_image.resize((WIDTH, HEIGHT))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid base64 reference image: {exc}") from exc

    cfg = models.get_model(request.model)
    if request.enhance_prompt:
        enhanced = enhancer.enhance(prompt, request.style)
        final_prompt = enhanced["enhanced_prompt"]
        final_negative = ", ".join(
            p for p in [request.negative_prompt.strip(), enhanced["negative_prompt"].strip()] if p
        )
    else:
        final_prompt = prompt
        final_negative = request.negative_prompt.strip()

    if request.model == "turbo":
        actual_steps = min(request.steps or 4, 4)
        actual_guidance = 0.0
    else:
        actual_steps = request.steps or cfg["steps"]
        actual_guidance = request.guidance_scale if request.guidance_scale is not None else cfg["guidance"]

    seed = request.seed if request.seed is not None else secrets.randbelow(2**31)
    generator = torch.Generator(device="cpu").manual_seed(seed)
    started = time.time()

    try:
        with generation_lock:
            pipe = models.get_img2img_pipe(request.model)
            kwargs = {
                "prompt": final_prompt,
                "image": init_image,
                "strength": request.strength,
                "num_inference_steps": actual_steps,
                "guidance_scale": actual_guidance,
                "generator": generator,
            }
            if request.model == "realistic" and final_negative:
                kwargs["negative_prompt"] = final_negative

            with torch.inference_mode():
                edited_image = pipe(**kwargs).images[0]

            filename = f"tattva_edit_{time.strftime('%Y%m%d_%H%M%S')}_{time.time_ns() % 1000000}.png"
            edited_image.save(OUTPUT_DIR / filename, format="PNG")
            buffer = BytesIO()
            edited_image.save(buffer, format="PNG")
            image_data = base64.b64encode(buffer.getvalue()).decode("utf-8")
            elapsed = round(time.time() - started, 2)

            if torch.cuda.is_available():
                torch.cuda.empty_cache()

        return {
            "success": True,
            "image": f"data:image/png;base64,{image_data}",
            "prompt": prompt,
            "original_prompt": prompt,
            "enhanced_prompt": final_prompt,
            "prompt_enhanced": request.enhance_prompt,
            "style": request.style,
            "provider": "TATTVA AI Local Engine (Image-to-Image)",
            "model": cfg["name"],
            "model_id": request.model,
            "width": edited_image.width,
            "height": edited_image.height,
            "steps": actual_steps,
            "guidance_scale": actual_guidance,
            "strength": request.strength,
            "seed": seed,
            "generation_time_seconds": elapsed,
            "saved_file": filename,
        }
    except torch.cuda.OutOfMemoryError as exc:
        models._release_current_model()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        raise HTTPException(status_code=503, detail="GPU memory ran out during image edit.") from exc
    except HTTPException:
        raise
    except Exception as exc:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        print("IMAGE EDIT FAILED:", repr(exc))
        raise HTTPException(status_code=500, detail=f"Image edit failed: {type(exc).__name__}.") from exc


from document_engine import TattvaDocumentEngine


class DocumentRequest(BaseModel):
    format: Literal["pdf", "docx", "pptx", "xlsx", "csv", "txt", "md"]
    title: str = "TATTVA AI Generated Document"
    subtitle: Optional[str] = "Professional Document Suite"
    sections: Optional[List[Dict[str, Any]]] = None
    slides: Optional[List[Dict[str, Any]]] = None
    sheets: Optional[List[Dict[str, Any]]] = None
    data: Optional[List[List[Any]]] = None
    content: Optional[str] = ""

DocumentRequest.model_rebuild()


@app.post("/generate-document")
def generate_document(req: DocumentRequest):
    fmt = req.format.lower()
    ts = time.strftime('%Y%m%d_%H%M%S')
    filename = f"tattva_{fmt}_{ts}.{fmt}"
    file_bytes = b""
    mime_type = "application/octet-stream"

    try:
        if fmt == "pdf":
            mime_type = "application/pdf"
            sections = req.sections or [{"heading": "Overview", "content": req.content or req.title}]
            file_bytes = TattvaDocumentEngine.generate_pdf(req.title, sections)
        elif fmt == "docx":
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            sections = req.sections or [{"heading": "Executive Summary", "content": req.content or req.title}]
            file_bytes = TattvaDocumentEngine.generate_docx(req.title, sections)
        elif fmt == "pptx":
            mime_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            slides = req.slides or [
                {"title": "Introduction", "bullets": ["Overview of Key Objectives", "Strategic Highlights", "Market Context"]},
                {"title": "Analysis & Findings", "bullets": ["Key Performance Metrics", "Operational Efficiencies", "Growth Trajectory"]},
                {"title": "Conclusion & Next Steps", "bullets": ["Immediate Milestones", "Long-term Strategic Vision", "Q&A Session"]},
            ]
            file_bytes = TattvaDocumentEngine.generate_pptx(req.title, req.subtitle or "", slides)
        elif fmt == "xlsx":
            mime_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            sheets = req.sheets or [
                {
                    "title": "Summary Data",
                    "rows": req.data or [
                        ["Category", "Q1 Actual", "Q2 Actual", "Q3 Target", "Q4 Forecast"],
                        ["Revenue ($)", 125000, 142000, 160000, 185000],
                        ["Operations ($)", 45000, 48000, 50000, 52000],
                        ["Marketing ($)", 25000, 28000, 30000, 35000],
                        ["Net Margin ($)", 55000, 66000, 80000, 98000],
                    ]
                }
            ]
            file_bytes = TattvaDocumentEngine.generate_xlsx(sheets)
        elif fmt == "csv":
            mime_type = "text/csv"
            raw_data = req.data or [
                ["ID", "Name", "Department", "Performance Score", "Status"],
                ["101", "Alex Rivera", "Engineering", "94.5", "Active"],
                ["102", "Elena Rostova", "Data Analytics", "98.2", "Active"],
                ["103", "Kowalski Chen", "Product Design", "91.8", "Active"],
            ]
            file_bytes = TattvaDocumentEngine.generate_csv(raw_data)
        elif fmt in ("txt", "md"):
            mime_type = "text/markdown" if fmt == "md" else "text/plain"
            text_body = req.content or f"# {req.title}\n\nGenerated on {time.strftime('%Y-%m-%d')}\n\n{req.subtitle}"
            file_bytes = text_body.encode("utf-8")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {fmt}")

        # Validate file size
        if len(file_bytes) < 4:
            raise HTTPException(status_code=500, detail="Generated document binary is empty or corrupt.")

        # Save to disk
        out_path = OUTPUT_DIR / filename
        with open(out_path, "wb") as f:
            f.write(file_bytes)

        b64_str = base64.b64encode(file_bytes).decode("utf-8")
        data_uri = f"data:{mime_type};base64,{b64_str}"

        return {
            "success": True,
            "filename": filename,
            "format": fmt,
            "mime_type": mime_type,
            "size_bytes": len(file_bytes),
            "data_uri": data_uri,
            "saved_file": str(out_path),
        }
    except Exception as exc:
        print("DOCUMENT GENERATION FAILED:", repr(exc))
        raise HTTPException(status_code=500, detail=f"Document generation failed: {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

