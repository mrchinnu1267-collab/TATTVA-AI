"""Diffusers pipeline manager for the TATTVA local image engine.

Designed to stay inside small consumer GPUs (e.g. RTX 3050 4 GB) by:
  * loading one model at a time and unloading the previous one,
  * capping the requested resolution by a megapixel budget,
  * enabling attention/VAE slicing and CPU offload when VRAM is tight,
  * supporting img2img from a base64 reference image.

The frontend calls `POST /generate` with `{ prompt, negative_prompt, width,
height, steps, cfg_scale, seed, reference_image }` and expects
`{ image: "data:image/png;base64,...", seed, model, width, height, duration_ms }`.
"""

from __future__ import annotations

import base64
import io
import json
import os
import random
import re
from pathlib import Path
from typing import Any, Optional

import torch
from PIL import Image


BASE_DIR = Path(__file__).resolve().parent


def _load_config() -> dict[str, Any]:
    path = Path(os.getenv("IMAGE_ENGINE_CONFIG", BASE_DIR / "config.json"))
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


CONFIG = _load_config()
DEFAULTS = CONFIG.get("defaults", {})
MEMORY = CONFIG.get("memory", {})
MODELS = CONFIG.get("models", {})


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _detect_dtype(device: str) -> torch.dtype:
    requested = os.getenv("TORCH_DTYPE", "auto").lower()
    if requested in {"float32", "fp32"}:
        return torch.float32
    if requested in {"bfloat16", "bf16"}:
        return torch.bfloat16
    if requested in {"float16", "fp16", "half"}:
        return torch.float16 if device == "cuda" else torch.float32
    if device == "cuda":
        return torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    return torch.float32


def decode_reference_image(reference: str) -> Optional[Image.Image]:
    """Accept a data URI or a raw base64 string."""
    if not reference:
        return None
    payload = reference.strip()
    match = re.match(r"^data:image/[a-zA-Z0-9.+-]+;base64,([\s\S]*)$", payload)
    if match:
        payload = match.group(1)
    try:
        raw = base64.b64decode(payload, validate=False)
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:  # noqa: BLE001 - surface a clean client error
        raise ValueError(f"Invalid reference image: {exc}") from exc


def _round_to_multiple(value: int, multiple: int = 8) -> int:
    return max(multiple, int(round(value / multiple)) * multiple)


class ImagePipeline:
    def __init__(self) -> None:
        configured_device = os.getenv("DEVICE", "auto").lower()
        self.device = configured_device if configured_device in {"cuda", "cpu"} else (
            "cuda" if torch.cuda.is_available() else "cpu"
        )
        self.torch_dtype = _detect_dtype(self.device)
        self.default_model = os.getenv("MODEL", CONFIG.get("default_model", "sdxl"))

        self.pipe = None
        self.img2img_pipe = None
        self.loaded_model: Optional[str] = None
        self.last_error: Optional[str] = None

        self.max_megapixels = float(os.getenv("MAX_MEGAPIXELS", MEMORY.get("max_megapixels", 1.0)))
        self.attention_slicing = _env_bool("ATTENTION_SLICING", bool(MEMORY.get("attention_slicing", True)))
        self.vae_slicing = _env_bool("VAE_SLICING", bool(MEMORY.get("vae_slicing", True)))
        self.vae_tiling = _env_bool("VAE_TILING", bool(MEMORY.get("vae_tiling", True)))
        self.cpu_offload = os.getenv("CPU_OFFLOAD", str(MEMORY.get("cpu_offload", "auto"))).lower()
        self.use_xformers = _env_bool("XFORMERS", bool(MEMORY.get("xformers", True)))

    # ------------------------------------------------------------------ models
    def _model_spec(self, name: Optional[str]) -> tuple[str, dict[str, Any]]:
        resolved = (name or self.default_model or "sdxl").strip()
        key = resolved.lower()
        if key not in MODELS:
            return resolved, {
                "repo": resolved,
                "path": os.getenv("MODEL_PATH", f"./models/{resolved.replace('/', '_')}"),
                "family": "sdxl",
                "label": resolved,
                "default_steps": DEFAULTS.get("steps", 30),
                "default_cfg": DEFAULTS.get("cfg_scale", 7.5),
            }
        spec = dict(MODELS[key])
        if key == self.default_model.lower():
            if os.getenv("MODEL_PATH"):
                spec["path"] = os.environ["MODEL_PATH"]
            if os.getenv("MODEL_REPO"):
                spec["repo"] = os.environ["MODEL_REPO"]
        return key, spec

    def _load_base_pipe(self, name: str, spec: dict[str, Any]):
        from diffusers import StableDiffusionPipeline, StableDiffusionXLPipeline

        family = spec.get("family", "sdxl")
        pipeline_cls = StableDiffusionXLPipeline if family == "sdxl" else StableDiffusionPipeline
        model_path = Path(spec.get("path", f"./models/{name}"))
        kwargs: dict[str, Any] = {"torch_dtype": self.torch_dtype, "use_safetensors": True}

        if model_path.exists() and any(model_path.iterdir()):
            if (model_path / "model_index.json").exists():
                return pipeline_cls.from_pretrained(str(model_path), **kwargs)
            safetensors = model_path / "model.safetensors"
            if not safetensors.exists():
                matches = list(model_path.glob("*.safetensors"))
                safetensors = matches[0] if matches else None
            if safetensors is not None:
                kwargs.pop("use_safetensors", None)
                return pipeline_cls.from_single_file(str(safetensors), **kwargs)

        repo = spec.get("repo")
        if not repo:
            raise FileNotFoundError(
                f"Model '{name}' is not downloaded and has no repo id. "
                f"Run `python download_models.py --model {name}` or set MODEL_PATH."
            )
        return pipeline_cls.from_pretrained(
            repo,
            cache_dir=str(model_path.parent / "_hf-cache"),
            **kwargs,
        )

    def _apply_memory_optimizations(self) -> None:
        if self.pipe is None:
            return
        pipe = self.pipe
        try:
            pipe.set_progress_bar_config(disable=True)
        except Exception:  # noqa: BLE001
            pass
        for method in ("enable_vae_slicing", "enable_vae_tiling"):
            try:
                if (method.endswith("slicing") and self.vae_slicing) or (
                    method.endswith("tiling") and self.vae_tiling
                ):
                    getattr(pipe, method)()
            except Exception:  # noqa: BLE001
                pass
        if self.attention_slicing:
            try:
                pipe.enable_attention_slicing("max")
            except Exception:  # noqa: BLE001
                pass

        if self.device == "cuda":
            if self.use_xformers:
                try:
                    pipe.enable_xformers_memory_efficient_attention()
                except Exception:  # noqa: BLE001
                    pass
            try:
                total_vram = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            except Exception:  # noqa: BLE001
                total_vram = 0.0
            if self.cpu_offload in {"always", "auto"} and total_vram and total_vram < 6.0:
                try:
                    pipe.enable_model_cpu_offload()
                    return
                except Exception:  # noqa: BLE001
                    pass
            if self.cpu_offload == "sequential":
                try:
                    pipe.enable_sequential_cpu_offload()
                    return
                except Exception:  # noqa: BLE001
                    pass
        pipe.to(self.device)

    def load(self, model: Optional[str] = None):
        name, spec = self._model_spec(model)
        if self.pipe is not None and self.loaded_model == name:
            return self.pipe
        self.unload()
        try:
            self.pipe = self._load_base_pipe(name, spec)
            self._apply_memory_optimizations()
            try:
                from diffusers import EulerDiscreteScheduler

                if os.getenv("SCHEDULER", DEFAULTS.get("scheduler", "euler")).lower() == "euler":
                    self.pipe.scheduler = EulerDiscreteScheduler.from_config(
                        self.pipe.scheduler.config, timestep_spacing="trailing"
                    )
            except Exception:  # noqa: BLE001
                pass
            self.loaded_model = name
            self.last_error = None
        except FileNotFoundError:
            raise
        except Exception as exc:  # noqa: BLE001
            self.pipe = None
            self.loaded_model = None
            self.last_error = str(exc)
            raise RuntimeError(f"Failed to load model '{name}': {exc}") from exc
        return self.pipe

    def unload(self) -> None:
        self.img2img_pipe = None
        self.pipe = None
        self.loaded_model = None
        if torch.cuda.is_available():
            try:
                torch.cuda.empty_cache()
            except Exception:  # noqa: BLE001
                pass

    # --------------------------------------------------------------- generation
    def _fit_resolution(self, width: int, height: int) -> tuple[int, int]:
        width = max(64, min(int(width), 4096))
        height = max(64, min(int(height), 4096))
        budget = max(0.25, self.max_megapixels)
        if (width * height) / 1_000_000 > budget:
            scale = (budget * 1_000_000 / (width * height)) ** 0.5
            width, height = int(width * scale), int(height * scale)
        return _round_to_multiple(width), _round_to_multiple(height)

    def _get_img2img(self):
        if self.img2img_pipe is not None:
            return self.img2img_pipe
        try:
            from diffusers import AutoPipelineForImage2Image

            self.img2img_pipe = AutoPipelineForImage2Image.from_pipe(self.pipe)
            if self.img2img_pipe is not None:
                self.img2img_pipe.scheduler = self.pipe.scheduler
            return self.img2img_pipe
        except Exception:  # noqa: BLE001
            return None

    def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        steps: Optional[int] = None,
        cfg_scale: Optional[float] = None,
        seed: Optional[int] = None,
        model: Optional[str] = None,
        reference_image: Optional[str] = None,
        strength: Optional[float] = None,
    ):
        name, spec = self._model_spec(model)
        pipe = self.load(name)

        width, height = self._fit_resolution(width, height)
        steps = max(1, min(int(steps if steps is not None else spec.get("default_steps", 30)), 100))
        cfg_scale = max(0.0, min(float(cfg_scale if cfg_scale is not None else spec.get("default_cfg", 7.5)), 20.0))

        if seed is None:
            seed = random.randint(0, 2**32 - 1)
        seed = int(seed)
        generator_device = "cpu" if self.cpu_offload in {"always", "auto", "sequential"} else self.device
        try:
            generator = torch.Generator(device=generator_device).manual_seed(seed)
        except Exception:  # noqa: BLE001
            generator = torch.Generator(device="cpu").manual_seed(seed)

        negative_prompt = negative_prompt or DEFAULTS.get("negative_prompt", "")
        init_image = decode_reference_image(reference_image) if reference_image else None

        if init_image is not None:
            img2img = self._get_img2img()
            if img2img is None:
                raise ValueError("This model cannot run image-to-image. Use an SDXL or SD1.5 checkpoint.")
            init_image = init_image.resize((width, height), Image.LANCZOS)
            result = img2img(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=init_image,
                strength=float(strength if strength is not None else DEFAULTS.get("strength", 0.6)),
                num_inference_steps=steps,
                guidance_scale=cfg_scale,
                generator=generator,
            ).images[0]
        else:
            result = pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                width=width,
                height=height,
                num_inference_steps=steps,
                guidance_scale=cfg_scale,
                generator=generator,
            ).images[0]

        return result, seed, width, height

    # ------------------------------------------------------------------- status
    def vram(self) -> dict[str, float]:
        if not torch.cuda.is_available():
            return {"total_gb": 0.0, "used_gb": 0.0}
        try:
            free, total = torch.cuda.mem_get_info()
            return {
                "total_gb": round(total / (1024**3), 2),
                "used_gb": round((total - free) / (1024**3), 2),
            }
        except Exception:  # noqa: BLE001
            return {"total_gb": 0.0, "used_gb": 0.0}

    def describe_models(self) -> list[dict[str, Any]]:
        output: list[dict[str, Any]] = []
        for name, spec in MODELS.items():
            path = Path(spec.get("path", f"./models/{name}"))
            output.append(
                {
                    "id": name,
                    "label": spec.get("label", name),
                    "repo": spec.get("repo"),
                    "path": str(path),
                    "family": spec.get("family", "sdxl"),
                    "downloaded": path.exists() and any(path.iterdir()),
                    "loaded": self.loaded_model == name,
                }
            )
        return output


pipeline = ImagePipeline()
