import re
from typing import Dict, Any

class TattvaPromptEnhancer:
    """Master Prompt Enhancer and Quality Tuner for Diffusion Models.
    Injects high-fidelity conditioning, aesthetic keywords, and anatomical stabilization.
    """

    MASTER_NEGATIVE = (
        "(worst quality, low quality:1.4), (deformed, distorted, disfigured:1.3), "
        "poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, "
        "(mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, "
        "blurry, amputation, watermark, text, signature, oversaturated, waxy, plastic, cartoonish, "
        "duplicate artifacts, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, "
        "poorly drawn face, bad proportions, cloned face, gross proportions, malformed limbs"
    )

    STYLE_PROFILES: Dict[str, Dict[str, Any]] = {
        "realistic": {
            "prefix": "(masterpiece, best quality, ultra-detailed:1.2), (photorealistic:1.3), 8k uhd, dslr",
            "suffix": "soft lighting, high quality, film grain, Fujifilm XT3, authentic skin pores, subsurface scattering, realistic eyes, natural shadows",
            "negative": "(worst quality, low quality:1.4), (cartoon, anime, 3d, painting, sketch:1.3), deformed, blurry, waxy skin, bad anatomy, mutated fingers, watermark, oversaturated",
            "steps": 28,
            "guidance": 7.0,
        },
        "photorealistic": {
            "prefix": "(masterpiece, best quality, ultra-detailed:1.2), (photorealistic:1.3), 8k uhd, dslr",
            "suffix": "soft lighting, high quality, film grain, Fujifilm XT3, authentic skin pores, subsurface scattering, realistic eyes, natural shadows",
            "negative": "(worst quality, low quality:1.4), (cartoon, anime, 3d, painting, sketch:1.3), deformed, blurry, waxy skin, bad anatomy, mutated fingers, watermark, oversaturated",
            "steps": 28,
            "guidance": 7.0,
        },
        "anime": {
            "prefix": "(masterpiece, best quality, ultra-detailed:1.2), studio anime aesthetic, Makoto Shinkai style",
            "suffix": "vibrant colors, expressive eyes, delicate lineart, highres, vivid palette, dynamic anime key visual, anime studio wallpaper",
            "negative": "(worst quality, low quality:1.4), (photorealistic:1.2), deformed, bad anatomy, extra limbs, mutated hands, blurry, signature, watermark, dull colors",
            "steps": 26,
            "guidance": 7.5,
        },
        "cinematic": {
            "prefix": "(masterpiece, best quality, ultra-detailed:1.2), 35mm anamorphic film still, cinematic lighting",
            "suffix": "volumetric shadows, depth of field, blockbuster movie aesthetic, 8k resolution, color graded, dramatic composition",
            "negative": "(worst quality, low quality:1.4), deformed, bad anatomy, extra limb, blurry, amateur, washed out, low contrast, watermark",
            "steps": 30,
            "guidance": 7.0,
        },
        "3d": {
            "prefix": "(masterpiece, best quality, ultra-detailed:1.2), 3D Octane render, ray-traced lighting",
            "suffix": "subsurface scattering, CGI masterpiece, photorealistic 3D textures, Unreal Engine 5 render, global illumination, volumetric fog",
            "negative": "(worst quality, low quality:1.4), deformed, 2d, flat drawing, low poly, noisy, grainy, blurry, watermark",
            "steps": 28,
            "guidance": 7.2,
        },
        "concept": {
            "prefix": "(masterpiece, best quality, ultra-detailed:1.2), digital concept art, atmospheric matte painting",
            "suffix": "epic environment scenery, expressive brushwork, ArtStation trending quality, cinematic scale, high fantasy concept art",
            "negative": "(worst quality, low quality:1.4), amateur, blurry, messy, watermark, text, copyright, lowres",
            "steps": 28,
            "guidance": 7.0,
        },
        "portrait": {
            "prefix": "(masterpiece, best quality, ultra-detailed:1.2), professional studio portrait",
            "suffix": "Hasselblad medium format clarity, 85mm f/1.4 lens, softbox rim lighting, authentic skin texture, realistic catchlights in eyes",
            "negative": "(worst quality, low quality:1.4), bad eyes, crossed eyes, deformed pupils, bad teeth, bad anatomy, plastic skin, blurry, watermark",
            "steps": 30,
            "guidance": 7.0,
        },
        "architecture": {
            "prefix": "(masterpiece, best quality, ultra-detailed:1.2), architectural photography",
            "suffix": "clean geometric lines, travertine stone, minimalist composition, architectural digest feature, golden hour architectural glow",
            "negative": "(worst quality, low quality:1.4), crooked lines, distorted perspective, blurry, messy, low quality, oversaturated",
            "steps": 28,
            "guidance": 7.0,
        },
        "fantasy": {
            "prefix": "(masterpiece, best quality, ultra-detailed:1.2), dark fantasy aesthetic",
            "suffix": "ethereal glow, mystical runes, magical mist, intricate ornaments, epic fantasy illustration, Elden Ring atmosphere",
            "negative": "(worst quality, low quality:1.4), cartoonish, bright neon, blurry, flat, bad anatomy, deformed limbs",
            "steps": 28,
            "guidance": 7.5,
        },
        "vintage": {
            "prefix": "(masterpiece, best quality, ultra-detailed:1.2), vintage 35mm photograph",
            "suffix": "Kodak Portra 400 grain, warm nostalgic tones, retro film look, authentic vintage colors, 1970s aesthetic",
            "negative": "(worst quality, low quality:1.4), modern digital, oversaturated, HDR, neon, 3d, deformed, blurry",
            "steps": 28,
            "guidance": 6.8,
        },
    }

    def __init__(self):
        self.negative_prompt = self.MASTER_NEGATIVE

    def enhance(self, prompt: str, style: str = "") -> dict:
        prompt = re.sub(r"\s+", " ", prompt).strip()
        if not prompt:
            raise ValueError("Prompt cannot be empty.")

        style_key = style.lower().strip()
        profile = self.STYLE_PROFILES.get(style_key, self.STYLE_PROFILES["realistic"])

        # Check if already contains quality tags
        has_masterpiece = "masterpiece" in prompt.lower()
        if has_masterpiece:
            final_prompt = prompt
        else:
            final_prompt = f"{profile['prefix']}, {prompt}, {profile['suffix']}"

        return {
            "original_prompt": prompt,
            "enhanced_prompt": final_prompt,
            "negative_prompt": profile.get("negative", self.MASTER_NEGATIVE),
            "style": style_key,
            "recommended_steps": profile.get("steps", 28),
            "recommended_guidance": profile.get("guidance", 7.0),
        }


if __name__ == "__main__":
    enhancer = TattvaPromptEnhancer()
    result = enhancer.enhance("A serene meditating monk beside an alpine river at dusk", "anime")
    print("Enhanced:", result["enhanced_prompt"])
    print("Steps:", result["recommended_steps"])