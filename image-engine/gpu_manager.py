import torch
import gc


class TattvaGPUManager:

    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    def get_gpu_status(self):

        if self.device == "cpu":
            return {
                "available": False,
                "device": "CPU",
                "message": "CUDA GPU not detected."
            }

        properties = torch.cuda.get_device_properties(0)

        total = properties.total_memory
        allocated = torch.cuda.memory_allocated(0)
        reserved = torch.cuda.memory_reserved(0)
        free = max(0, total - reserved)

        return {
            "available": True,
            "device": torch.cuda.get_device_name(0),
            "total_vram_gb": round(total / 1024**3, 2),
            "allocated_vram_gb": round(allocated / 1024**3, 2),
            "reserved_vram_gb": round(reserved / 1024**3, 2),
            "estimated_free_vram_gb": round(free / 1024**3, 2)
        }

    def clear_cache(self):

        gc.collect()

        if self.device == "cuda":
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()

        return {
            "success": True,
            "message": "GPU cache cleanup completed."
        }

    def can_load_model(self, required_vram_gb=3.0):

        status = self.get_gpu_status()

        if not status["available"]:
            return False

        return (
            status["estimated_free_vram_gb"]
            >= required_vram_gb
        )