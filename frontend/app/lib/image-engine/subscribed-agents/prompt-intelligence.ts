/**
 * TATTVA AI - Prompt Intelligence & Dual Agent Compiler
 * Decomposes user requests into 11 semantic dimensions across 10 categories
 * Compiles specialized prompts for Agent A and Agent B without altering user intent.
 */

import {
  DualCompiledPrompts,
  ImageIntentCategory,
  SemanticDimensions,
  SubscribedAgentId,
} from "./types";

/**
 * Analyzes raw prompt and extracts all 11 semantic dimensions.
 */
export function analyzePromptSemantics(
  rawPrompt: string,
  explicitCategory?: ImageIntentCategory,
  explicitAspectRatio: string = "1:1"
): SemanticDimensions {
  const text = rawPrompt.trim();
  const lower = text.toLowerCase();

  // 1. Detect Category
  let category: ImageIntentCategory = explicitCategory || "photorealistic";
  if (!explicitCategory) {
    if (lower.includes("poster") || lower.includes("movie poster") || lower.includes("flyer")) {
      category = "poster";
    } else if (lower.includes("logo") || lower.includes("brand icon") || lower.includes("insignia") || lower.includes("emblem")) {
      category = "logo";
    } else if (lower.includes("ad") || lower.includes("advertisement") || lower.includes("commercial")) {
      category = "advertising";
    } else if (lower.includes("anime") || lower.includes("manga") || lower.includes("shonen") || lower.includes("ghibli")) {
      category = "anime";
    } else if (lower.includes("3d") || lower.includes("render") || lower.includes("octane") || lower.includes("clay")) {
      category = "artwork_3d";
    } else if (lower.includes("social media") || lower.includes("instagram") || lower.includes("story") || lower.includes("reel")) {
      category = "social_creative";
    } else if (lower.includes("banner") || lower.includes("billboard") || lower.includes("header")) {
      category = "marketing_banner";
    } else if (lower.includes("mockup") || lower.includes("packaging") || lower.includes("box") || lower.includes("bottle mockup")) {
      category = "product_mockup";
    } else if (lower.includes("illustration") || lower.includes("drawing") || lower.includes("painting") || lower.includes("sketch")) {
      category = "illustration";
    } else {
      category = "photorealistic";
    }
  }

  // 2. Aspect Ratio Detection
  let detectedAr = explicitAspectRatio;
  if (lower.includes("16:9") || lower.includes("widescreen") || lower.includes("landscape")) detectedAr = "16:9";
  else if (lower.includes("9:16") || lower.includes("portrait story") || lower.includes("vertical")) detectedAr = "9:16";
  else if (lower.includes("4:3")) detectedAr = "4:3";
  else if (lower.includes("1:1") || lower.includes("square")) detectedAr = "1:1";

  // 3. Extract Subject
  // Strip common prefixes
  const subject = text
    .replace(/^(create|generate|make|draw|illustrate|design|render|a photo of|an image of)\s+/i, "")
    .trim();

  // 4. Visual Style
  let visualStyle = "Naturalistic and authentic visual fidelity";
  if (category === "poster") visualStyle = "High-impact editorial cinematic poster styling";
  else if (category === "logo") visualStyle = "Refined corporate iconography and vector balance";
  else if (category === "advertising") visualStyle = "High-end commercial product photoshoot aesthetics";
  else if (category === "anime") visualStyle = "Dynamic Japanese anime animation cel style with vivid hues";
  else if (category === "artwork_3d") visualStyle = "Ray-traced 3D digital sculpture with subsurface scattering";
  else if (category === "social_creative") visualStyle = "Modern creator-first social media visual hook";
  else if (category === "marketing_banner") visualStyle = "Expansive banner layout with dedicated copy space";
  else if (category === "product_mockup") visualStyle = "Realistic studio packaging display with realistic tactile textures";
  else if (category === "illustration") visualStyle = "Rich storybook digital illustration with textured brushwork";

  // 5. Composition
  let composition = "Centered focal subject with balanced rule of thirds";
  if (category === "poster" || category === "marketing_banner") {
    composition = "Dynamic asymmetrical composition with dedicated negative space for text";
  } else if (category === "product_mockup" || category === "advertising") {
    composition = "Eye-level hero showcase with shallow depth of field";
  }

  // 6. Background
  let background = "Contextual environment complementing the foreground subject";
  if (category === "logo") background = "Clean solid studio background for maximum contrast";
  else if (category === "product_mockup") background = "Minimalist neutral studio table setting";

  // 7. Lighting
  let lighting = "Natural ambient lighting with soft directional fill";
  if (category === "photorealistic") lighting = "Golden hour warm sunlight with realistic shadows and specular highlights";
  else if (category === "advertising" || category === "product_mockup") lighting = "Three-point commercial softbox studio illumination";
  else if (category === "poster") lighting = "Dramatic volumetric rim lighting and atmospheric haze";
  else if (category === "anime") lighting = "High-key animation lighting with crisp cell shadows";

  // 8. Colors
  let colors = "Harmonious, lifelike color palette with calibrated saturation";
  if (category === "poster") colors = "High-contrast cinematic color grading (teal and orange accents)";
  else if (category === "anime") colors = "Vibrant saturated primary tones with smooth pastel gradations";
  else if (category === "logo") colors = "Clean dual-tone corporate palette";

  // 9. Typography Requirements
  const typoMatch = text.match(/["']([^"']+)["']/);
  const typographyRequirements = typoMatch ? `Render exact text wording: "${typoMatch[1]}"` : undefined;

  // 10. Resolution
  const resolution = detectedAr === "16:9" ? "1920x1080" : detectedAr === "9:16" ? "1080x1920" : "1024x1024";

  // 11. Negative Constraints
  const negativeConstraints = [
    "blurry",
    "low resolution",
    "distorted anatomy",
    "watermark",
    "jpeg artifacts",
    "mutilated limbs",
    "overexposed",
    "deformed text",
  ];

  return {
    imageType: category,
    mainSubject: subject,
    visualStyle,
    composition,
    background,
    lighting,
    colors,
    typographyRequirements,
    aspectRatio: detectedAr,
    resolution,
    negativeConstraints,
  };
}

/**
 * Compiles distinct specialized prompts for Agent A and Agent B while strictly preserving user intent.
 */
export function compileDualPrompts(
  rawPrompt: string,
  category?: ImageIntentCategory,
  aspectRatio: string = "1:1"
): DualCompiledPrompts {
  const dimensions = analyzePromptSemantics(rawPrompt, category, aspectRatio);
  const { mainSubject, imageType } = dimensions;

  // AGENT A: Specialized for photorealism, physical lighting, depth, lens optics, and material micro-details
  let agentAPrompt = "";
  let focusRationaleA = "";

  // AGENT B: Specialized for graphic precision, layout, crisp vector boundaries, typography, and stylized aesthetic
  let agentBPrompt = "";
  let focusRationaleB = "";

  const arFlag = aspectRatio === "16:9" ? " --ar 16:9" : aspectRatio === "9:16" ? " --ar 9:16" : aspectRatio === "4:3" ? " --ar 4:3" : "";

  switch (imageType) {
    case "poster":
      agentAPrompt = `${mainSubject}, cinematic film poster, 35mm anamorphic lens, dramatic rim lighting, atmospheric volumetric smoke, ultra-detailed physical textures, color graded by master colorist${arFlag}`;
      focusRationaleA = "Cinematic depth, realistic atmospheric volume, and dramatic optical lighting.";

      agentBPrompt = `${mainSubject}, graphic design movie poster, award-winning Swiss typography layout, bold vector composition, screen-printed graphic styling, high visual contrast${arFlag}`;
      focusRationaleB = "Graphic structure, bold editorial composition, and typographic hierarchy.";
      break;

    case "logo":
      agentAPrompt = `${mainSubject}, premium 3D brand emblem, brushed titanium and frosted glass materials, subtle studio raytracing, luxury minimalist presentation, 8k resolution${arFlag}`;
      focusRationaleA = "Subtle tactile materials, 3D embossing, and studio raytracing.";

      agentBPrompt = `${mainSubject}, flat modern vector logo, iconic minimalist insignia, golden ratio geometry, negative space balance, scalable vector graphics aesthetic, high contrast${arFlag}`;
      focusRationaleB = "Crisp geometric contours, negative space mastery, and iconic flat vector purity.";
      break;

    case "advertising":
      agentAPrompt = `${mainSubject}, high-end commercial advertising photography, shot on Hasselblad H6D-100c with 85mm f/1.4 lens, precision studio softbox lighting, crisp reflections, luxury magazine editorial${arFlag}`;
      focusRationaleA = "Commercial studio lighting, pristine surface reflections, and medium-format optics.";

      agentBPrompt = `${mainSubject}, bold marketing campaign visual, dynamic product advertising hero layout, vibrant high-conversion art direction, striking commercial aesthetic${arFlag}`;
      focusRationaleB = "High-energy commercial marketing composition and dynamic visual balance.";
      break;

    case "anime":
      agentAPrompt = `${mainSubject}, cinematic anime movie still, Makoto Shinkai aesthetic, hyper-detailed clouds, glowing atmospheric lighting, intricate cel shading, 4k digital anime keyframe${arFlag}`;
      focusRationaleA = "Atmospheric anime lighting, depth, and painted cinematic backgrounds.";

      agentBPrompt = `${mainSubject}, modern anime character art, crisp clean line art, vibrant shonen visual energy, expressive styling, dynamic keyframe illustration${arFlag}`;
      focusRationaleB = "Sharp character linework, vibrant animation palettes, and expressive graphic energy.";
      break;

    case "artwork_3d":
      agentAPrompt = `${mainSubject}, photorealistic 3D render, Octane Render engine, realistic subsurface scattering, physically based materials, global illumination, ray-traced ambient occlusion${arFlag}`;
      focusRationaleA = "Physically based materials (PBR), raytracing, and volumetric light bounce.";

      agentBPrompt = `${mainSubject}, stylized 3D digital art, charming low-poly isometric or claymation aesthetic, playful color harmony, smooth rounded geometry, clean studio presentation${arFlag}`;
      focusRationaleB = "Stylized 3D geometry, playful forms, and clean digital art direction.";
      break;

    case "social_creative":
      agentAPrompt = `${mainSubject}, viral social media lifestyle photo, authentic natural lighting, shot on 35mm film, candid expression, trendy aesthetic, organic grain${arFlag}`;
      focusRationaleA = "Authentic lifestyle mood, natural grain, and candid optical reality.";

      agentBPrompt = `${mainSubject}, scroll-stopping social media visual graphic, eye-catching color blocking, modern typography space, creator aesthetic, punchy high-contrast delivery${arFlag}`;
      focusRationaleB = "Instant visual hook, punchy social branding, and clear focal clarity.";
      break;

    case "marketing_banner":
      agentAPrompt = `${mainSubject}, ultra-wide commercial marketing photography, epic landscape depth, panoramic lighting, cinematic color grading, balanced negative space for headline placement${arFlag}`;
      focusRationaleA = "Expansive panoramic perspective with cinematic color grading.";

      agentBPrompt = `${mainSubject}, modern web hero banner graphic, contemporary corporate digital design, clean typography space, modular grid layout, polished vector accents${arFlag}`;
      focusRationaleB = "Clean web hero composition, grid alignment, and negative space for copy.";
      break;

    case "product_mockup":
      agentAPrompt = `${mainSubject}, realistic product packaging mockup, studio tabletop photography, tactile paper texture, soft diffuse daylight, 100mm macro lens focus${arFlag}`;
      focusRationaleA = "Macro lens texture accuracy, realistic paper/glass physics, and soft studio daylight.";

      agentBPrompt = `${mainSubject}, minimalist product mockup presentation, geometric podium showcase, clean pastel backdrop, modern Scandinavian design aesthetic, sharp product silhouette${arFlag}`;
      focusRationaleB = "Geometric styling, architectural podium display, and modern branding minimalism.";
      break;

    case "illustration":
      agentAPrompt = `${mainSubject}, rich painterly digital art, textured oil painting brushstrokes, warm atmospheric light, expressive impasto technique, storybook concept art${arFlag}`;
      focusRationaleA = "Traditional painterly brush textures, impasto depth, and atmospheric warmth.";

      agentBPrompt = `${mainSubject}, modern contemporary digital illustration, clean graphic shapes, flat pastel palette with bold accents, charming editorial aesthetic${arFlag}`;
      focusRationaleB = "Modern vector shapes, clean editorial lines, and contemporary color harmony.";
      break;

    case "photorealistic":
    default:
      agentAPrompt = `${mainSubject}, authentic award-winning portrait photography, shot on Leica M11, natural skin pores and micro-textures, diffused morning sunlight, 8k resolution, raw color profile${arFlag}`;
      focusRationaleA = "Natural skin micro-textures, authentic camera sensor optics, and uncompressed raw fidelity.";

      agentBPrompt = `${mainSubject}, masterfully framed studio photograph, balanced three-point lighting, lifelike clarity, neutral color calibration, sharp focal plane${arFlag}`;
      focusRationaleB = "Crisp focal sharpness, balanced studio lighting, and color accuracy.";
      break;
  }

  // If user specified exact text in quotes, append text rendering instructions to both
  if (dimensions.typographyRequirements) {
    agentAPrompt += `, text reading "${dimensions.typographyRequirements}" clearly rendered`;
    agentBPrompt += `, featuring typography "${dimensions.typographyRequirements}" in clean legible lettering`;
  }

  return {
    originalPrompt: rawPrompt,
    dimensions,
    agentA: {
      agentId: "agent_a",
      prompt: agentAPrompt,
      negativePrompt: dimensions.negativeConstraints.join(", "),
      focusRationale: focusRationaleA,
      aspectRatio,
      estimatedTokens: Math.ceil(agentAPrompt.length / 4),
    },
    agentB: {
      agentId: "agent_b",
      prompt: agentBPrompt,
      negativePrompt: dimensions.negativeConstraints.join(", "),
      focusRationale: focusRationaleB,
      aspectRatio,
      estimatedTokens: Math.ceil(agentBPrompt.length / 4),
    },
  };
}
