"""Download diffusers checkpoints for the local image engine.

Examples:
    python download_models.py
    python download_models.py --model sd15
    python download_models.py --model all
    python download_models.py --model sdxl --path D:/models/sdxl
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from huggingface_hub import snapshot_download


BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = Path(os.getenv("IMAGE_ENGINE_CONFIG", BASE_DIR / "config.json"))

IGNORE_PATTERNS = [
    "*.ckpt",
    "*.pt",
    "*.pth",
    "*.onnx",
    "*.msgpack",
    "*.h5",
    "*/unet/diffusion_pytorch_model.bin",
    "*/vae/diffusion_pytorch_model.bin",
    "*/text_encoder/pytorch_model.bin",
    "*/text_encoder_2/pytorch_model.bin",
]


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        raise SystemExit(f"config.json not found at {CONFIG_PATH}")
    with CONFIG_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def download(repo: str, target: Path) -> None:
    print(f"-> {repo}\n   into {target}")
    target.mkdir(parents=True, exist_ok=True)
    kwargs = {
        "repo_id": repo,
        "local_dir": str(target),
        "ignore_patterns": IGNORE_PATTERNS,
    }
    try:
        snapshot_download(**kwargs, local_dir_use_symlinks=False)
    except TypeError:
        # huggingface_hub >= 0.23 removed local_dir_use_symlinks.
        snapshot_download(**kwargs)


def main() -> None:
    config = load_config()
    models: dict = config.get("models", {})
    default_model = config.get("default_model", "sdxl")

    parser = argparse.ArgumentParser(description="Download local image models")
    parser.add_argument(
        "--model",
        default=default_model,
        help="Model id from config.json, a Hugging Face repo id, or 'all'.",
    )
    parser.add_argument("--path", default=None, help="Override the target folder.")
    args = parser.parse_args()

    if args.model == "all":
        targets = list(models.items())
    elif args.model in models:
        targets = [(args.model, models[args.model])]
    else:
        targets = [
            (
                args.model,
                {
                    "repo": args.model,
                    "path": str(Path(args.path or f"./models/{args.model.replace('/', '_')}")),
                },
            )
        ]

    for name, spec in targets:
        repo = spec.get("repo")
        if not repo:
            print(f"! {name} has no repo id, skipping")
            continue
        target = Path(args.path or spec.get("path", f"./models/{name}"))
        if target.exists() and (target / "model_index.json").exists():
            print(f"OK {name} already downloaded at {target}")
            continue
        download(repo, target)

    print("\nDone. Start the engine with: python main.py")


if __name__ == "__main__":
    main()
