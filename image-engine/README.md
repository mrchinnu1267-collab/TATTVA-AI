# TATTVA Local Image Engine (optional)

Offline FastAPI backend for TATTVA's image engine. The Next.js app (`/api/image`)
uses cloud providers (Gemini, Hugging Face) and falls back to
this local CUDA server when `LOCAL_IMAGE_ENGINE_URL` is reachable.

> Real photograph search is served via the built-in Web Image Search Engine (Wikimedia Commons + Openverse). Cloud image generation keys need billing/credits.

## Requirements

- Python **3.10-3.12**
- 4 GB+ VRAM for SD 1.5, 6 GB+ for SDXL (4 GB works with CPU offload at reduced resolution)
- ~7 GB disk for SDXL, ~4 GB for SD 1.5

## Setup

```bash
cd image-engine
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate

pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 \
  --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt

python download_models.py --model sdxl
# or: python download_models.py --model sd15 --path D:/models/sd15

copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

python main.py
# Engine listens on http://127.0.0.1:8001
```

Then in `frontend/.env.local`:

```env
LOCAL_IMAGE_ENGINE_URL=http://127.0.0.1:8001
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Device, dtype, loaded model, VRAM usage |
| `GET` | `/models` | Configured models + download state |
| `POST` | `/generate` | Text-to-image or image-to-image |
| `POST` | `/unload` | Free VRAM / drop the loaded pipeline |

### `POST /generate`

```json
{
  "prompt": "a red apple on a white table",
  "negative_prompt": "blurry, watermark",
  "width": 1024,
  "height": 1024,
  "steps": 28,
  "cfg_scale": 7.0,
  "seed": 1234,
  "model": "sdxl",
  "reference_image": "data:image/png;base64,...",
  "strength": 0.6
}
```

Response:

```json
{
  "image": "data:image/png;base64,...",
  "seed": 1234,
  "model": "sdxl-local",
  "width": 1024,
  "height": 1024,
  "duration_ms": 18420
}
```

## Low-VRAM tuning

- `MAX_MEGAPIXELS=0.75` - render smaller.
- `CPU_OFFLOAD=auto` - streams layers from CPU RAM below 6 GB VRAM.
- `ATTENTION_SLICING`, `VAE_SLICING`, `VAE_TILING` - trade speed for memory.
- `MODEL=sd15` or `MODEL=sdxl-turbo` - lighter/faster alternatives.

On a 4 GB RTX 3050, expect roughly 30-90 s per 768x768 SDXL image with offload,
or 3-8 s with `sdxl-turbo` at 512x512.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Torch not compiled with CUDA enabled` | Reinstall Torch from the CUDA index URL matching your driver. |
| `CUDA out of memory` | Lower `MAX_MEGAPIXELS`, keep `CPU_OFFLOAD=auto`, or use `sd15`. |
| `Model not found` | Run `python download_models.py --model sdxl`, or set `MODEL_PATH`. |
| Engine not detected | Check `GET http://127.0.0.1:8001/health` and `LOCAL_IMAGE_ENGINE_URL`. |
| First request very slow | Normal: weights are loaded lazily on the first call. |
