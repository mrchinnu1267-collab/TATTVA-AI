/**
 * TATTVA AI - Subject-Consistent Prompt Compiler (Phase I)
 * Compiles provider-optimized generation prompts that lock in subject identity,
 * integrate pose/expression/camera variations, and prevent identity drift.
 */

import { SubjectIdentityProfile, PoseExpressionRequest } from "./types";
import { ImageProviderId } from "../types";

export interface CompiledSubjectPrompt {
  providerPrompts: Record<ImageProviderId, string>;
  negativePrompt: string;
  lockedIdentityTokens: string[];
  appliedVariations: string[];
  referencePromptSummary: string;
}

/**
 * Extracts compact identity tokens from a subject profile.
 */
export function extractSubjectTokens(profile: SubjectIdentityProfile): string[] {
  const tokens: string[] = [profile.name];

  if (profile.physical.speciesOrType) {
    tokens.push(profile.physical.speciesOrType);
  }
  if (profile.physical.hairColor && profile.physical.hairStyle) {
    tokens.push(`${profile.physical.hairColor} ${profile.physical.hairStyle}`);
  } else if (profile.physical.hairColor) {
    tokens.push(`${profile.physical.hairColor} hair`);
  }
  if (profile.physical.primaryClothing) {
    tokens.push(profile.physical.primaryClothing);
  }
  if (profile.physical.signatureAccessories.length > 0) {
    tokens.push(profile.physical.signatureAccessories.join(", "));
  }
  if (profile.physical.distinguishingMarkings.length > 0) {
    tokens.push(profile.physical.distinguishingMarkings.join(", "));
  }
  if (profile.facial?.eyeColor) {
    tokens.push(`${profile.facial.eyeColor} eyes`);
  }
  if (profile.facial?.distinctiveFeatures && profile.facial.distinctiveFeatures.length > 0) {
    tokens.push(profile.facial.distinctiveFeatures.join(", "));
  }

  return tokens.filter(Boolean);
}

/**
 * Compiles a subject-consistent prompt across multiple target providers.
 */
export function compileSubjectConsistentPrompt(
  profile: SubjectIdentityProfile,
  userPrompt: string,
  variation: PoseExpressionRequest = {}
): CompiledSubjectPrompt {
  const lockedTokens = extractSubjectTokens(profile);
  const appliedVariations: string[] = [];

  // Assemble physical identity paragraph
  const physicalDesc: string[] = [];
  if (profile.physical.speciesOrType) physicalDesc.push(`Species/Form: ${profile.physical.speciesOrType}`);
  if (profile.physical.hairColor) {
    physicalDesc.push(`Hair: ${profile.physical.hairLength ? profile.physical.hairLength + " " : ""}${profile.physical.hairColor} (${profile.physical.hairStyle || "styled"})`);
  }
  if (profile.facial?.eyeColor) physicalDesc.push(`Eyes: ${profile.facial.eyeColor}`);
  if (profile.facial?.distinctiveFeatures && profile.facial.distinctiveFeatures.length > 0) {
    physicalDesc.push(`Facial traits: ${profile.facial.distinctiveFeatures.join(", ")}`);
  }
  if (profile.physical.bodyBuild) physicalDesc.push(`Build: ${profile.physical.bodyBuild}`);

  // Clothing handling: check if user requested a clothing variation
  const clothingDesc = variation.clothing || profile.physical.primaryClothing || "";
  if (variation.clothing) {
    appliedVariations.push(`clothing: ${variation.clothing}`);
  }

  if (profile.physical.signatureAccessories.length > 0) {
    physicalDesc.push(`Accessories: ${profile.physical.signatureAccessories.join(", ")}`);
  }
  if (profile.physical.distinguishingMarkings.length > 0) {
    physicalDesc.push(`Distinguishing marks: ${profile.physical.distinguishingMarkings.join(", ")}`);
  }

  // Assemble variation directives
  const variationDesc: string[] = [];
  if (variation.pose) {
    variationDesc.push(`Pose: ${variation.pose}`);
    appliedVariations.push(`pose: ${variation.pose}`);
  }
  if (variation.expression) {
    variationDesc.push(`Facial expression: ${variation.expression}`);
    appliedVariations.push(`expression: ${variation.expression}`);
  }
  if (variation.cameraAngle) {
    variationDesc.push(`Camera angle: ${variation.cameraAngle}`);
    appliedVariations.push(`camera: ${variation.cameraAngle}`);
  }
  if (variation.environment || variation.background) {
    const env = variation.environment || variation.background;
    variationDesc.push(`Environment: ${env}`);
    appliedVariations.push(`environment: ${env}`);
  }
  if (variation.lighting) {
    variationDesc.push(`Lighting: ${variation.lighting}`);
    appliedVariations.push(`lighting: ${variation.lighting}`);
  }

  // Prohibited drift warnings
  const prohibitions = [
    ...profile.prohibitedChanges,
    "Do not alter facial features or character identity",
    "Maintain exact character consistency with reference",
  ].filter(Boolean);

  // Style directive
  const style = variation.artisticStyle || profile.style.artisticStyle;
  if (variation.artisticStyle && variation.artisticStyle !== profile.style.artisticStyle) {
    appliedVariations.push(`style: ${variation.artisticStyle}`);
  }

  // 1. Gemini / DALL-E (Natural Language Rich Narrative)
  const geminiPrompt = [
    `Consistent Subject Generation: [Subject: "${profile.name}" (${profile.category})]`,
    `Core User Request: ${userPrompt}`,
    `Subject Identity Specs: ${physicalDesc.join(". ")}.`,
    clothingDesc ? `Attire: ${clothingDesc}.` : "",
    variationDesc.length > 0 ? `Scene Attributes: ${variationDesc.join(". ")}.` : "",
    `Visual Style: ${style}. Technique: ${profile.style.renderingTechnique || "coherent high fidelity"}.`,
    `Strict Preservation Rules: ${prohibitions.join("; ")}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // 2. SDXL / Hugging Face (Keyword-Dense, Subject-First)
  const sdxlSubjectChunk = [
    profile.name,
    profile.physical.speciesOrType,
    profile.physical.hairColor ? `${profile.physical.hairColor} hair` : "",
    profile.facial?.eyeColor ? `${profile.facial.eyeColor} eyes` : "",
    clothingDesc,
    ...profile.physical.signatureAccessories,
    ...profile.physical.distinguishingMarkings,
  ]
    .filter(Boolean)
    .join(", ");

  const sdxlVariationChunk = [
    userPrompt,
    variation.pose,
    variation.expression,
    variation.cameraAngle,
    variation.environment || variation.background,
    variation.lighting,
    style,
    "masterpiece, highly consistent character, 8k resolution",
  ]
    .filter(Boolean)
    .join(", ");

  const sdxlPrompt = `${sdxlSubjectChunk}, ${sdxlVariationChunk}`;

  // 3. Local Diffusers (IP-Adapter / Subject conditioned)
  const localPrompt = `${profile.name}, ${userPrompt}, ${clothingDesc ? "wearing " + clothingDesc : ""}, ${variation.pose || ""}, ${style}, highly consistent character`;

  // 4. Pollinations AI (Clean concise prompt)
  const pollinationsPrompt = `${userPrompt}, subject: ${profile.name}, ${physicalDesc.slice(0, 2).join(", ")}, ${clothingDesc}, ${variation.pose || ""}, ${style}`
    .replace(/\s+/g, " ")
    .trim();

  // Negative Prompt
  const negativePrompt = [
    "different character",
    "face drift",
    "inconsistent features",
    "wrong hair color",
    "wrong eye color",
    "missing signature accessories",
    "distorted body proportions",
    "extra limbs",
    "low quality",
    "blurry",
    ...profile.prohibitedChanges.map((p) => `altered ${p}`),
  ].join(", ");

  return {
    providerPrompts: {
      gemini: geminiPrompt,
      huggingface: sdxlPrompt,
      pollinations: pollinationsPrompt,
      local: localPrompt,
      openai: geminiPrompt,
    },
    negativePrompt,
    lockedIdentityTokens: lockedTokens,
    appliedVariations,
    referencePromptSummary: `${profile.name} (${profile.category}) - ${physicalDesc.join(", ")}`,
  };
}

