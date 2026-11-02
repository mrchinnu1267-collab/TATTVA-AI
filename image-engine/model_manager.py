import gc
import torch
from pathlib import Path
from diffusers import (
    StableDiffusionPipeline,
    AutoPipelineForText2Image,
    AutoPipelineForImage2Image,
    DPMSolverMultistepScheduler,
)


class TattvaModelManager:
    """Loads one model at a time to limit VRAM use."""

    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32
        self.models = {
            "realistic": {
                "name": "TATTVA Realistic Vision HD",
                "path": self.base_dir / "models" / "realistic-vision" / "Realistic_Vision_V5.1_fp16-no-ema.safetensors",
                "resolution": 1024, "steps": 30, "guidance": 7.0, "experimental": False,
            },
            "turbo": {
                "name": "TATTVA Turbo Vision HD",
                "repo": "stabilityai/sdxl-turbo",
                "resolution": 1024, "steps": 4, "guidance": 0.0, "experimental": True,
            },
        }
        self.current_model = None
        self.pipe = None
        self.img2img_pipe = None

    def get_model(self, model_id):
        if model_id not in self.models:
            raise ValueError(f"Unknown model: {model_id}")
        return self.models[model_id]

    def get_available_models(self):
        return [
            {"id": key, "name": cfg["name"], "resolution": cfg["resolution"],
             "steps": cfg["steps"], "guidance": cfg["guidance"],
             "experimental": cfg["experimental"], "loaded": key == self.current_model}
            for key, cfg in self.models.items()
        ]

    def _release_current_model(self):
        if self.img2img_pipe is not None:
            del self.img2img_pipe
            self.img2img_pipe = None
        if self.pipe is not None:
            try:
                self.pipe.maybe_free_model_hooks()
            except Exception:
                pass
            del self.pipe
            self.pipe = None
        self.current_model = None
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()

    def load_model(self, model_id):
        cfg = self.get_model(model_id)
        if self.current_model == model_id and self.pipe is not None:
            return self.pipe

        self._release_current_model()
        print(f"[TATTVA AI] Loading {cfg['name']} on {self.device} ...")

        if model_id == "realistic":
            if not cfg["path"].is_file():
                raise FileNotFoundError(f"Model checkpoint not found: {cfg['path']}")
            pipe = StableDiffusionPipeline.from_single_file(
                str(cfg["path"]), torch_dtype=self.dtype,
                safety_checker=None, requires_safety_checker=False,
            )
            try:
                pipe.scheduler = DPMSolverMultistepScheduler.from_config(
                    pipe.scheduler.config,
                    use_karras_sigmas=True,
                    algorithm_type="dpmsolver++"
                )
            except Exception as e:
                print(f"[TATTVA AI] Warning configuring DPMSolver: {e}")
        elif model_id == "turbo":
            pipe = AutoPipelineForText2Image.from_pretrained(
                cfg["repo"], torch_dtype=self.dtype,
                variant="fp16" if self.device == "cuda" else None,
                use_safetensors=True,
            )
        else:
            raise ValueError(f"No loader configured for {model_id}")

        if self.device == "cuda":
            pipe.enable_attention_slicing()
            try:
                pipe.enable_vae_slicing()
                pipe.enable_vae_tiling()
            except Exception:
                pass
            pipe.enable_model_cpu_offload()
        else:
            pipe.to("cpu")

        self.pipe = pipe
        self.current_model = model_id
        print(f"[TATTVA AI] {cfg['name']} loaded.")
        return self.pipe

    def get_img2img_pipe(self, model_id):
        pipe = self.load_model(model_id)
        if self.img2img_pipe is None:
            self.img2img_pipe = AutoPipelineForImage2Image.from_pipe(pipe)
        return self.img2img_pipe

    def get_gpu_information(self):
        if not torch.cuda.is_available():
            return {"available": False, "device": "CPU"}
        props = torch.cuda.get_device_properties(0)
        total = props.total_memory
        allocated = torch.cuda.memory_allocated(0)
        reserved = torch.cuda.memory_reserved(0)
        return {
            "available": True,
            "device": torch.cuda.get_device_name(0),
            "total_vram_gb": round(total / 1024**3, 2),
            "allocated_vram_gb": round(allocated / 1024**3, 2),
            "reserved_vram_gb": round(reserved / 1024**3, 2),
            "estimated_unreserved_vram_gb": round(max(0, total - reserved) / 1024**3, 2),
        }
