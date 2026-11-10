import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { MODEL_REGISTRY, getAvailableModels } from "../app/lib/image-engine/multi-model-router/model-registry";
import { routeImageRequest } from "../app/lib/image-engine/multi-model-router/intelligent-router";
import { upscaleImage2x, upscaleImage4x } from "../app/lib/image-engine/upscaler/super-resolution";
import { extractTypographyFromPrompt, renderTypographySvg } from "../app/lib/image-engine/typography-engine/svg-typography";
import { compilePrompt } from "../app/lib/image-engine/prompt-compiler";

describe("PHASE 3, 6, 7: Multi-Model Architecture & Intelligent Workflow Router", () => {
  test("1. Model Registry contains FLUX, Gemini, OpenAI DALL-E, SD3, and Local fallback", () => {
    assert.ok(MODEL_REGISTRY["flux-1-dev"], "FLUX.1-dev must be registered");
    assert.ok(MODEL_REGISTRY["flux-1-schnell"], "FLUX.1-schnell must be registered");
    assert.ok(MODEL_REGISTRY["gemini-3.1-flash-image"], "Gemini 3.1 Flash Image must be registered");
    assert.ok(MODEL_REGISTRY["dall-e-3"], "OpenAI DALL-E 3 must be registered");
    assert.ok(MODEL_REGISTRY["sd-3-medium"], "SD3 Medium must be registered");
    assert.ok(MODEL_REGISTRY["local-cuda-diffusion"], "Local CUDA Diffusion must be registered");

    const allModels = getAvailableModels();
    assert.ok(allModels.length >= 6, "At least 6 model families must be available in registry");
  });

  test("2. Model Router selects Photorealism workflow and appropriate model", () => {
    const decision = routeImageRequest({
      prompt: "Raw 8k photo of an elderly mountaineer in the Himalayas, National Geographic style, Nikon Z9 85mm f/1.4",
    });
    assert.strictEqual(decision.workflow, "photorealism", "Must detect photorealism workflow");
    assert.ok(decision.confidence > 0.7, "Must have high confidence for photorealism");
    assert.ok(decision.primaryModel, "Must select primary model");
  });

  test("3. Model Router selects Anime / Digital Art workflow", () => {
    const decision = routeImageRequest({
      prompt: "Cyberpunk anime girl with neon blue hair, Studio Ghibli illustration, vibrant cel shading",
    });
    assert.strictEqual(decision.workflow, "anime_illustration", "Must detect anime workflow");
  });

  test("4. Model Router selects Poster & Typography workflow when quoted text is detected", () => {
    const decision = routeImageRequest({
      prompt: 'Bold movie poster for a sci-fi thriller with the title "NEO TOKYO 2099" in glowing orange letters',
    });
    assert.strictEqual(decision.workflow, "poster_typography", "Must detect poster with typography workflow");
  });

  test("5. Model Router selects Inpainting / Editing workflow when reference and edit keywords exist", () => {
    const decision = routeImageRequest({
      prompt: "Remove the sunglasses and change the shirt color to black",
      referenceImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    });
    assert.strictEqual(decision.workflow, "inpainting", "Must detect inpainting/editing workflow");
  });

  test("6. SVG Typography Engine accurately preserves exact quoted strings", () => {
    const prompt = 'Minimalist coffee packaging label with text "SOLAR ROAST" and subtext "ORGANIC BEANS"';
    const typography = extractTypographyFromPrompt(prompt);
    assert.ok(typography, "Must extract typography specification");
    assert.strictEqual(typography.headline, "SOLAR ROAST", "Must preserve headline exact casing");
    assert.strictEqual(typography.subheading, "ORGANIC BEANS", "Must preserve subheading");

    const svg = renderTypographySvg(typography, 1024, 1024);
    assert.ok(svg.includes("SOLAR ROAST"), "Rendered SVG must contain exact headline string");
    assert.ok(svg.includes("<svg"), "Must output valid SVG markup");
  });

  test("7. Prompt Compiler enforces positive and negative prompt isolation", () => {
    const compiled = compilePrompt({
      prompt: "A majestic lion on a savanna rock at golden hour",
      style: "realistic",
      aspectRatio: "16:9",
      quality: "max",
    });

    assert.ok(compiled.positive.includes("lion"), "Positive prompt must contain subject");
    assert.ok(compiled.negative.length > 0, "Negative prompt must be populated to prevent artifacts");
    assert.ok(!compiled.positive.includes("blurry"), "Negative artifacts must not be in positive prompt");
  });

  test("8. Super-Resolution Upscaler operates on 2x and 4x scales", () => {
    // 1x1 base64 transparent PNG test fixture
    const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const upscaled2x = upscaleImage2x(testImage);
    assert.ok(upscaled2x.startsWith("data:image/png;base64,"), "2x upscaled image must return valid data URI");

    const upscaled4x = upscaleImage4x(testImage);
    assert.ok(upscaled4x.startsWith("data:image/png;base64,"), "4x upscaled image must return valid data URI");
  });
});

