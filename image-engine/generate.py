import torch
from diffusers import StableDiffusionPipeline
from pathlib import Path

# Project directories
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "generated"
MODEL_DIR = BASE_DIR / "models"

OUTPUT_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)

# Device configuration
device = "cuda" if torch.cuda.is_available() else "cpu"

print("=" * 45)
print("       TATTVA IMAGE ENGINE")
print("=" * 45)

print("Device:", device)

if device == "cuda":
    print("GPU:", torch.cuda.get_device_name(0))

# Load an open model
MODEL_ID = "stable-diffusion-v1-5/stable-diffusion-v1-5"

print("\nLoading image model...")
print("The first download may take several minutes.")

pipe = StableDiffusionPipeline.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16 if device == "cuda" else torch.float32,
    safety_checker=None,
    requires_safety_checker=False,
)

pipe.enable_attention_slicing()
pipe = pipe.to(device)

# Generate an image
while True:
    prompt = input("\nEnter image prompt (or type exit): ").strip()

    if prompt.lower() == "exit":
        print("TATTVA Image Engine stopped.")
        break

    if not prompt:
        print("Please enter a prompt.")
        continue

    try:
        print("\nGenerating image...")

        with torch.inference_mode():
            image = pipe(
                prompt=prompt,
                height=512,
                width=512,
                num_inference_steps=20,
                guidance_scale=7.0,
            ).images[0]

        filename = OUTPUT_DIR / "tattva_generated.png"
        image.save(filename)

        print("Image generated successfully!")
        print("Saved to:", filename)

    except Exception as error:
        print("Image generation failed:", error)
        if device == "cuda":
            torch.cuda.empty_cache()