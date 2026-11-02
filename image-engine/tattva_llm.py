"""
=========================================================================
TATTVA AI PROPRIETARY NEURAL VISION LLM (Python Local Runtime)
=========================================================================
Created for: TATTVA AI
Creator: kotapati Gowtham Chowdary

Autonomous Prompt Intelligence & HD Diffusion Conditioning System.
Operates 100% locally with ZERO external LLM API keys.
=========================================================================
"""

import re
from typing import Dict, Any, Optional

MULTILINGUAL_DICTIONARY = {
    "शिव": "Lord Shiva in deep cosmic meditation, crescent moon in matted hair, trishul, sacred ashes, holy river Ganga flowing, serene Himalayan peak backdrop",
    "कृष्ण": "Lord Krishna, divine peacock feather crown, golden pitambara silk, holding bansuri flute, radiant aura, divine gentle smile, Vrindavan landscape",
    "राम": "Lord Rama, majestic ancient warrior prince, holding divine bow and arrow, royal regal countenance, Ayodhya palace terrace at sunrise",
    "हनुमान": "Lord Hanuman, colossal divine muscular form, glowing golden gada, radiant devoted eyes, floating clouds, epic mythical atmosphere",
    "गणेश": "Lord Ganesha, ornate golden mukut, elephant head with kind gentle eyes, modak, intricate temple sanctum, glowing diya oil lamps",
    "दुर्गा": "Goddess Durga, fierce radiant ten-armed warrior goddess, riding a majestic lion, holding divine weapons, dramatic battle storm sky",
    "साधु": "ancient Himalayan sadhu monk with weathered wise eyes, flowing beard, saffron robes, meditating on snow-covered cliff, serene dawn light",
    "मंदिर": "magnificent ancient stone temple, intricate Dravidian and Nagara carvings, glowing brass lamps, incense smoke curling in golden morning light",
    "सूर्यास्त": "breathtaking sunset, golden hour crimson and amber sky, dramatic cloud formations reflecting on glassy water, cinematic horizon",
    "सूर्योदय": "peaceful dawn sunrise, soft pink and golden rays piercing morning mist, dew drops on lush green foliage",
    "जंगल": "dense enchanted ancient forest, towering moss-covered trees, sunbeams filtering through emerald canopy, mist-shrouded floor",
    "पहाड़": "majestic snow-capped mountain ranges, sharp granite peaks, alpine glacier lakes, crisp clean atmospheric depth",
    "नदी": "crystal clear mountain river cascading over smooth polished stones, rushing rapids, emerald banks, soft ambient mist",
    "बारिश": "cinematic torrential monsoon rain, water droplets suspended in midair, reflections on wet cobblestones, moody cinematic illumination",
    "योद्धा": "veteran warrior in battle-worn ornate armor, engraved steel breastplate, dramatic windblown cape, cinematic battlefield mist",
    "राजकुमारी": "regal princess adorned in intricately embroidered royal silk attire, delicate diamond tiara, opulent palace hall with marble pillars",
    "राजा": "majestic royal king on an ornate golden throne, velvet robes with gold filigree, stern commanding expression, grand throne room",
    "गांव": "picturesque idyllic Indian village at golden hour, clay houses with tiled roofs, banyan tree with elders gathered, peaceful rural charm",
    "कविता": "poetic dreamy landscape, ethereal floating cherry blossoms, soft pastel twilight sky, starry cosmos visible through twilight mist",
    "सुंदर": "exquisite, aesthetically breathtaking, harmonious composition, masterwork quality, perfect lighting and proportion",
    "गहरी": "deep profound contemplative atmosphere, rich shadows, dramatic chiaroscuro contrast, mysterious depth",
    "तपस्या": "intense yogic penance, glowing spiritual aura, levitating above rocky cliff, transcendent calm, cosmic constellations above",
}

STYLE_PROFILES: Dict[str, Dict[str, Any]] = {
    "realistic": {
        "prefix": "(masterpiece, best quality, ultra-detailed:1.25), (photorealistic:1.35), 8k uhd, dslr",
        "suffix": "shot on Hasselblad H6D-100c, 85mm f/1.4 lens, authentic skin micro-textures, natural subsurface scattering, soft ambient rim lighting, crisp focus, hyperrealistic eyes",
        "negative": "(worst quality, low quality:1.4), (cartoon, anime, 3d, painting, sketch:1.3), deformed, blurry, waxy skin, bad anatomy, mutated fingers, watermark, oversaturated, plastic",
        "steps": 30,
        "guidance": 7.0,
    },
    "cinematic": {
        "prefix": "(masterpiece, best quality, ultra-detailed:1.25), 35mm anamorphic film still, cinematic lighting",
        "suffix": "volumetric shadows, depth of field, blockbuster movie aesthetic, 8k resolution, color graded, dramatic composition, IMAX quality scan",
        "negative": "(worst quality, low quality:1.4), deformed, bad anatomy, extra limb, blurry, amateur, washed out, low contrast, watermark",
        "steps": 30,
        "guidance": 7.0,
    },
    "anime": {
        "prefix": "(masterpiece, best quality, ultra-detailed:1.25), studio anime aesthetic, Makoto Shinkai and Ufotable style",
        "suffix": "vibrant colors, expressive eyes, delicate lineart, highres, vivid palette, dynamic anime key visual, anime studio wallpaper",
        "negative": "(worst quality, low quality:1.4), (photorealistic:1.2), deformed, bad anatomy, extra limbs, mutated hands, blurry, signature, watermark, dull colors",
        "steps": 28,
        "guidance": 7.5,
    },
    "3d": {
        "prefix": "(masterpiece, best quality, ultra-detailed:1.25), 3D Octane render, ray-traced lighting",
        "suffix": "subsurface scattering, CGI masterpiece, photorealistic 3D textures, Unreal Engine 5.4 render, global illumination, volumetric fog",
        "negative": "(worst quality, low quality:1.4), deformed, 2d, flat drawing, low poly, noisy, grainy, blurry, watermark",
        "steps": 28,
        "guidance": 7.2,
    },
    "portrait": {
        "prefix": "(masterpiece, best quality, ultra-detailed:1.25), professional studio portrait photography",
        "suffix": "Hasselblad medium format clarity, 85mm f/1.4 lens, softbox rim lighting, authentic skin texture, realistic catchlights in eyes",
        "negative": "(worst quality, low quality:1.4), bad eyes, crossed eyes, deformed pupils, bad teeth, bad anatomy, plastic skin, blurry, watermark",
        "steps": 32,
        "guidance": 7.0,
    },
    "fantasy": {
        "prefix": "(masterpiece, best quality, ultra-detailed:1.25), dark fantasy epic illustration",
        "suffix": "ethereal glow, mystical runes, magical mist, intricate ornaments, epic fantasy illustration, Elden Ring atmosphere",
        "negative": "(worst quality, low quality:1.4), cartoonish, bright neon, blurry, flat, bad anatomy, deformed limbs",
        "steps": 28,
        "guidance": 7.5,
    },
    "vintage": {
        "prefix": "(masterpiece, best quality, ultra-detailed:1.25), vintage 35mm photograph",
        "suffix": "Kodak Portra 400 grain, warm nostalgic tones, retro film look, authentic vintage colors, 1970s aesthetic",
        "negative": "(worst quality, low quality:1.4), modern digital, oversaturated, HDR, neon, 3d, deformed, blurry",
        "steps": 28,
        "guidance": 6.8,
    },
}

class TattvaNeuralVisionLLM:
    """TATTVA AI Autonomous Prompt Reasoning Model."""

    MASTER_NEGATIVE = (
        "(worst quality, low quality:1.4), (deformed, distorted, disfigured:1.3), "
        "poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, "
        "(mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, "
        "blurry, amputation, watermark, text, signature, oversaturated, waxy, plastic, cartoonish, "
        "duplicate artifacts, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, "
        "poorly drawn face, bad proportions, cloned face, gross proportions, malformed limbs"
    )

    @classmethod
    def synthesize(cls, prompt: str, style: str = "", aspect_ratio: str = "square") -> Dict[str, Any]:
        prompt = re.sub(r"\s+", " ", prompt).strip()
        if not prompt:
            raise ValueError("Prompt cannot be empty.")

        # Multilingual mapping without external APIs
        is_indic = bool(re.search(r"[\u0900-\u097F]", prompt))
        working_prompt = prompt
        if is_indic:
            for k, v in MULTILINGUAL_DICTIONARY.items():
                if k in working_prompt:
                    working_prompt = working_prompt.replace(k, v)

        style_key = style.lower().strip()
        profile = STYLE_PROFILES.get(style_key, STYLE_PROFILES["realistic"])

        # Check existing quality keywords
        if "masterpiece" in working_prompt.lower():
            enhanced = working_prompt
        else:
            enhanced = f"{profile['prefix']}, {working_prompt}, {profile['suffix']}"

        # Clean duplicate commas/spaces
        enhanced = re.sub(r",\s*,+", ", ", enhanced)
        enhanced = re.sub(r"\s+", " ", enhanced).strip()

        # HD resolution selection
        w, h = 1024, 1024
        if aspect_ratio == "landscape":
            w, h = 1024, 576
        elif aspect_ratio == "portrait":
            w, h = 576, 1024
        elif aspect_ratio == "wide":
            w, h = 1024, 512

        return {
            "original_prompt": prompt,
            "enhanced_prompt": enhanced,
            "negative_prompt": profile.get("negative", cls.MASTER_NEGATIVE),
            "style": style_key or "realistic (HD)",
            "width": w,
            "height": h,
            "steps": profile.get("steps", 30),
            "guidance_scale": profile.get("guidance", 7.0),
            "is_hd": True,
            "engine": "TATTVA Proprietary Neural Vision LLM",
        }

