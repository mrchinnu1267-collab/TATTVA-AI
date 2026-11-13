# TATTVA AI - Global Open-Source Image Tool Discovery & Comparative Analysis

**Generated**: 2026-11-12  
**Ecosystem**: TATTVA AI Universal Image Generation & Editing Platform  
**Target Hardware Constraints**: NVIDIA RTX 3050 Laptop GPU (4 GB VRAM) + 16 GB System RAM

---

## Executive Summary of Candidate Technologies

This document provides a comprehensive audit of leading open-source image generation, editing, segmentation, detection, and enhancement tools. Each tool is evaluated against strict real-world criteria: **license permissions**, **maintenance activity**, **hardware feasibility on 4 GB VRAM**, and **architectural fit with TATTVA AI**.

---

## Category A: Image Generation Engines

| Tool / Model | Official Repository | License | Hardware Req. (VRAM) | Disk Space | Status & Feasibility | Integration Method |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hugging Face Diffusers** | `huggingface/diffusers` | Apache-2.0 | 2 GB - 24 GB (Modular) | ~500 MB (code) | **Selected for Local Backend** (Already integrated in `image-engine/`) | Python FastAPI / REST |
| **ComfyUI** | `comfyanonymous/ComfyUI` | GPL-3.0 | 4 GB - 24 GB | ~1.5 GB (code) | **Evaluated as Candidate Workflow Engine**; high node complexity; memory management on 4 GB requires aggressive tiling | Local REST API (`/prompt`, `/history`, WebSocket) |
| **Stable Diffusion 1.5** | `stable-diffusion-v1-5/stable-diffusion-v1-5` | CreativeML OpenRAIL-M | 2.5 GB (FP16) | ~2.1 GB | **Selected for Fast Local Stylization / LoRA** | Diffusers `StableDiffusionPipeline` |
| **SDXL Turbo** | `stabilityai/sdxl-turbo` | CreativeML OpenRAIL++-M | 3.5 GB (Sliced/Offload) | ~5.8 GB | **Selected for Sub-Second Local Drafts** | Diffusers `AutoPipelineForText2Image` |
| **SDXL 1.0 Base** | `stabilityai/stable-diffusion-xl-base-1.0` | OpenRAIL++-M | 6 GB - 8 GB (Requires offload on 4GB) | ~6.6 GB | **Supported with Offload & via AI Horde** | Diffusers + AI Horde Cluster |
| **FLUX.1-schnell** | `black-forest-labs/flux` | Apache-2.0 | 16 GB - 24 GB (Unquantized) | ~24 GB | **Selected via Free Pollinations API** (Zero local VRAM required) | HTTPS JSON / Image streaming |
| **FLUX.1-dev** | `black-forest-labs/flux` | Non-Commercial FLUX.1-dev License | 16 GB - 24 GB | ~24 GB | **Rejected for Local** (Exceeds 4GB VRAM & non-commercial constraints) | Remote API only |
| **Animagine XL 3.1** | `cagliostrolab/animagine-xl-3.1` | Fair-AI Public License | 6 GB - 8 GB | ~6.6 GB | **Selected via Free Hugging Face Spaces Tier** | HF Inference Client |
| **Qwen-Image / Omni** | `QwenLM/Qwen-VL` | Apache-2.0 | > 16 GB | > 15 GB | **Rejected for Local** (Exceeds VRAM capacity) | Cloud API fallback |

---

## Category B: Image Editing & Inpainting Engines

| Tool / Model | Official Repository | License | Hardware Req. (VRAM) | Capabilities | Integration Strategy in TATTVA AI |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Diffusers Inpaint (SDXL/SD1.5)** | `huggingface/diffusers` | Apache-2.0 | 3 GB - 6 GB (with offload) | Mask-conditioned inpainting, brush replacement | Local FastAPI `/inpaint` & frontend canvas brush |
| **InstructPix2Pix** | `timbrooks/instruct-pix2pix` | CreativeML OpenRAIL-M | 4 GB (FP16) | Natural language text-guided image editing | Integrated in editing router for prompt modifications |
| **FLUX Kontext / Fill** | `black-forest-labs/flux` | Non-Commercial / API | > 16 GB | SOTA high-resolution inpainting/fill | Remote free cluster routing |
| **Qwen Image Edit** | `QwenLM` | Apache-2.0 | > 14 GB | Instruction-driven spatial editing | Remote API candidate |
| **Outpainting Padding Engine** | TATTVA Custom (`Pillow` + Diffusers) | MIT | < 4 GB | Aspect ratio expansion with blended directional masks | Supported via `spatial-editor` in TATTVA frontend |

---

## Category C: Object Detection & Counting Verification

| Tool / Model | Official Repository | License | Hardware Req. (VRAM) | Capabilities | Evaluator Role in TATTVA AI |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **YOLOv8-Nano / Small** | `ultralytics/ultralytics` | AGPL-3.0 | < 300 MB (or fast CPU) | 80+ COCO classes, real-time bounding box & count verification | **Selected for Local Verification**: Fast count auditing |
| **RT-DETR (Baidu)** | `lyuwenyu/RT-DETR` | Apache-2.0 | ~600 MB | Real-time transformer detector; superior open-vocabulary precision | Candidate for advanced local object verification |
| **Grounding DINO** | `IDEA-Research/GroundingDINO` | Apache-2.0 | 2 GB - 4 GB | Open-vocabulary text-guided object detection | High accuracy, moderate memory footprint |

---

## Category D: Image Segmentation & Mask Generation

| Tool / Model | Official Repository | License | Hardware Req. (VRAM) | Capabilities | Application in TATTVA Image Studio |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MobileSAM** | `ChaoningZhang/MobileSAM` | Apache-2.0 | **~400 MB VRAM** | Instant click-to-segment, edge-aware zero-shot masks | **Selected for Interactive Inpainting & Object Removal** |
| **FastSAM** | `CASIA-IVA-Lab/FastSAM` | Apache-2.0 | ~600 MB VRAM | CNN-based instant segment-anything | Candidate for batch mask generation |
| **SAM 2 (Meta)** | `facebookresearch/sam2` | Apache-2.0 | 1.8 GB - 8 GB | SOTA zero-shot video and image segmentation | SAM2-Tiny viable locally; Large requires cloud |

---

## Category E: Spatial & Structural Control (ControlNet & Conditioning)

Genuine image-derived conditioning extracts physical geometric invariants from reference images rather than generating synthetic approximations:

| Control Type | Preprocessor Model / Algorithm | Primary ControlNet Weight | Target Diffusion Backbone | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Canny Edge** | OpenCV `cv2.Canny()` (0 VRAM, instant CPU) | `controlnet-canny-sd15` / `sdxl` | SD 1.5 / SDXL | Preserves sharp architectural and silhouette contours |
| **Depth Estimation** | MiDaS / DPT / ZoeDepth (< 500 MB) | `controlnet-depth-sd15` / `sdxl` | SD 1.5 / SDXL | Preserves 3D spatial depth, foreground/background layers |
| **Human Pose** | DWPose / OpenPose (< 400 MB) | `controlnet-openpose-sd15` | SD 1.5 | Guarantees exact human limb and posture alignment |
| **Line Art / Anime** | Lineart Anime preprocessor (< 200 MB) | `controlnet-lineart-anime` | SD 1.5 / Animagine | Perfect character re-coloring and consistency |
| **IP-Adapter** | Image Projection ViT-H/14 (< 1.5 GB) | `IP-Adapter-Plus` / `SDXL` | SD 1.5 / SDXL | True reference-conditioned character face & style transfer |

---

## Category F: Image Enhancement & Neural Super-Resolution

| Tool / Model | Official Repository | License | Hardware Req. | Scale Factors | TATTVA AI Integration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Real-ESRGAN** | `xinntao/Real-ESRGAN` | BSD-3-Clause | ~350 MB VRAM (or fast CPU) | 2x, 4x, Face restoration (GFPGAN) | **Selected for Local Upscaling**: One-click Enhance |
| **SwinIR** | `JingyunLiang/SwinIR` | Apache-2.0 | ~800 MB VRAM | 2x, 4x, Denoising, JPEG deblurring | Candidate for restoration dashboard |
| **SUPIR** | `Fanghua-Yu/SUPIR` | Apache-2.0 | > 16 GB VRAM | Photorealistic generative restoration | Remote cluster only |

---

## Category G: Visual Understanding & Independent Adherence Verification

To satisfy Phase 9 & Phase 11 without relying on the generator itself, TATTVA AI employs independent visual evaluators:

| Tool / Model | Role | License | Hardware Requirement | Verification Metric |
| :--- | :--- | :--- | :--- | :--- |
| **Google Gemini 2.0 Flash Vision** | Multimodal Ground Truth Inspector | Cloud API | Server-side API key | Canonical character recognition, count & spatial verification |
| **Moondream2** | Lightweight Local VLM | Apache-2.0 | ~2.5 GB VRAM / CPU | Local offline prompt adherence questioning |
| **OpenCV + EasyOCR** | Text & Typography Verification | Apache-2.0 | CPU / < 200 MB | Validates requested text strings inside generated banners/signs |
| **CLIP (ViT-B/32)** | Embedding Cosine Similarity | MIT | < 400 MB | Semantic similarity between prompt and generated output |

---

## Category H: Image Processing & Mask Compositing

- **Pillow (PIL)**: Native image operations, RGBA alpha channel compositing, bounding box cropping, EXIF orientation correction.
- **OpenCV (`opencv-python-headless`)**: Canny edge extraction, morphological dilation/erosion for inpainting masks, color histogram analysis.
- **RMBG-1.4 / Rembg**: High-fidelity background removal (Apache-2.0 / MIT), allowing instant subject isolation and background swapping in TATTVA Image Studio.

---

## Category I: Model Management, Quantization & Safe Formats

- **Format Security**: Exclusively utilize `.safetensors` model weights. Explicitly reject legacy `.ckpt` or `.bin` pickle files to eliminate remote code execution vulnerabilities.
- **Quantization Support**: Utilize `bitsandbytes` (NF4 / INT8) and GGUF quantization formats where memory headroom is constrained.
- **Hugging Face Hub (`huggingface_hub`)**: Authenticated model caching with local checksum verification (`local_files_only` fallback).

