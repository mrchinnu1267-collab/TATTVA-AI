/**
 * TATTVA AI - Intelligent Editing Intent Classifier (Phase H)
 * Translates natural-language user instructions into structured editing operations,
 * extracts targeted subjects, color specifications, directional expansions,
 * and detects ambiguous instructions requiring clarification.
 */

import {
  EditingIntent,
  EditingOperationType,
  ColorModificationSpec,
  DirectionalExpansion,
} from "./types";

/**
 * Classifies a user's natural-language editing instruction into a structured EditingIntent.
 */
export function classifyEditingIntent(rawInstruction: string): EditingIntent {
  const instruction = (rawInstruction || "").trim();
  const lower = instruction.toLowerCase();

  // 1. Ambiguity Detection
  const ambiguousPatterns = [
    /^(make it (better|cool|nice|good|pop|epic|pretty))$/i,
    /^(edit (it|this|image|photo)?)$/i,
    /^(change (it|something)?)$/i,
    /^(fix (it|image)?)$/i,
    /^(enhance)$/i,
    /^(modify)$/i,
    /^do something$/i,
  ];

  if (instruction.length <= 4 || ambiguousPatterns.some((pattern) => pattern.test(lower))) {
    return {
      operation: "inpainting",
      confidence: 0.25,
      requiresMask: false,
      isAmbiguous: true,
      clarificationPrompt:
        "Could you clarify the specific modification you'd like to make? For example: 'Remove the person on the left', 'Change the jacket color to red', 'Replace background with a sunset beach', or 'Extend canvas to the right'.",
      normalizedPrompt: instruction,
    };
  }

  // 2. Background Removal (Subject Cutout / Transparent PNG)
  if (
    /^(?:remove|delete|clear) (?:the )?(?:background|backdrop)(?: completely| entirely)?$/i.test(lower) ||
    /remove (?:the )?background (?:and|to) make (?:it )?transparent/i.test(lower) ||
    /make (?:the )?background transparent/i.test(lower) ||
    /transparent (?:background|png)/i.test(lower) ||
    /(?:isolate|cut out) (?:the )?(?:subject|person|product|foreground)/i.test(lower) ||
    /remove backdrop and isolate/i.test(lower) ||
    /remove background from \w+/i.test(lower)
  ) {
    return {
      operation: "background_removal",
      confidence: 0.98,
      requiresMask: false,
      isAmbiguous: false,
      normalizedPrompt: "Isolate foreground subject and remove background with transparent alpha channel",
    };
  }

  // 3. Background Replacement
  if (
    /(change|replace|swap) (the )?(background|backdrop|setting|environment) (to|with|into) /i.test(lower) ||
    /put (them|him|her|it|the subject) (in|on|at|inside) /i.test(lower)
  ) {
    const bgMatch =
      instruction.match(/(?:change|replace|swap) (?:the )?(?:background|backdrop|setting) (?:to|with|into) (.+)/i) ||
      instruction.match(/put (?:them|him|her|it|the subject) (?:in|on|at|inside) (.+)/i);
    const bgPrompt = bgMatch ? bgMatch[1].trim() : "a cinematic scenic background";

    return {
      operation: "background_replacement",
      confidence: 0.95,
      backgroundPrompt: bgPrompt,
      requiresMask: false, // Inferred automatically via foreground separation
      isAmbiguous: false,
      normalizedPrompt: `Replace background with ${bgPrompt}, keeping foreground subject intact`,
    };
  }

  // 4. Outpainting / Canvas Expansion
  if (
    /(extend|expand|outpaint|widen|broaden) (the )?(canvas|image|border|frame|view)/i.test(lower) ||
    /(extend|expand|outpaint) (left|right|top|bottom|up|down|sides)/i.test(lower)
  ) {
    const expand: DirectionalExpansion = {};
    if (/left/i.test(lower)) expand.left = 256;
    if (/right/i.test(lower)) expand.right = 256;
    if (/top|upward|up/i.test(lower)) expand.top = 256;
    if (/bottom|downward|down/i.test(lower)) expand.bottom = 256;

    // Default to horizontal widen if unspecified
    if (Object.keys(expand).length === 0) {
      expand.left = 200;
      expand.right = 200;
    }

    return {
      operation: "outpainting",
      confidence: 0.94,
      expandDirections: expand,
      requiresMask: false,
      isAmbiguous: false,
      normalizedPrompt: `Outpaint and extend image canvas seamlessly: ${instruction}`,
    };
  }

  // 5. Object Removal
  const isDirectBgRemoval = /^(?:remove|delete|clear) (?:the )?(?:background|backdrop)$/i.test(lower);
  if (
    !isDirectBgRemoval &&
    /(?:remove|delete|erase|take out|get rid of|eliminate|clear) (?:the )?(.+)/i.test(lower)
  ) {
    const match = instruction.match(/(?:remove|delete|erase|take out|get rid of|eliminate|clear) (?:the )?(.+)/i);
    const target = match ? match[1].replace(/from (the )?(image|photo|background|scene)/gi, "").trim() : "unwanted object";

    return {
      operation: "object_removal",
      confidence: 0.96,
      targetSubject: target,
      requiresMask: true,
      isAmbiguous: false,
      normalizedPrompt: `Seamless inpainting removal: completely erase "${target}" and reconstruct surrounding background texture and lighting seamlessly`,
    };
  }

  // 6. Object Replacement
  if (
    /(replace|swap|turn|change) (the )?(.+?) (with|into|to) (a |an |the )?(.+)/i.test(lower) &&
    !/color|background|lighting/i.test(lower)
  ) {
    const match = instruction.match(/(?:replace|swap|turn|change) (?:the )?(.+?) (?:with|into|to) (?:a |an |the )?(.+)/i);
    const target = match ? match[1].trim() : "object";
    const replacement = match ? match[2].trim() : "new object";

    return {
      operation: "object_replacement",
      confidence: 0.95,
      targetSubject: target,
      replacementSubject: replacement,
      requiresMask: true,
      isAmbiguous: false,
      normalizedPrompt: `Inpainting replacement: replace "${target}" with "${replacement}", preserving surrounding composition, scale, lighting, and perspective`,
    };
  }

  // 7. Object Insertion / Addition
  if (
    /(add|insert|place|put|draw) (a |an |the |some )?(.+?) (on|in|beside|next to|above|below|into) (the )?(.+)/i.test(lower)
  ) {
    const match = instruction.match(/(?:add|insert|place|put|draw) (?:a |an |the |some )?(.+?) (?:on|in|beside|next to|above|below|into) (?:the )?(.+)/i);
    const objectToAdd = match ? match[1].trim() : "new object";
    const location = match ? match[2].trim() : "the scene";

    return {
      operation: "object_insertion",
      confidence: 0.92,
      replacementSubject: objectToAdd,
      targetSubject: location,
      requiresMask: true,
      isAmbiguous: false,
      normalizedPrompt: `Inpainting insertion: render "${objectToAdd}" placed relative to "${location}", matching lighting direction and perspective`,
    };
  }

  // 8. Color Modification
  if (
    /(change|turn|make|dye|paint) (the )?(.+?) (color to|to|into) (red|blue|green|yellow|black|white|purple|orange|pink|brown|cyan|magenta|gold|silver|crimson|emerald|violet|navy|blonde|brunette)/i.test(lower) ||
    /color of (the )?(.+?) to (.+)/i.test(lower)
  ) {
    const colorRegex = /(?:change|turn|make|dye|paint) (?:the )?(.+?) (?:color to|to|into) (.+)/i;
    const match = instruction.match(colorRegex);
    const targetElem = match ? match[1].replace(/color of /gi, "").trim() : "target element";
    const newColor = match ? match[2].trim() : "new color";

    const colorSpec: ColorModificationSpec = {
      targetElement: targetElem,
      newColor: newColor,
    };

    return {
      operation: "color_modification",
      confidence: 0.94,
      targetSubject: targetElem,
      colorChange: colorSpec,
      requiresMask: true,
      isAmbiguous: false,
      normalizedPrompt: `Localized color transformation: change color of "${targetElem}" to ${newColor}, preserving fine surface texture, reflections, and shadowing`,
    };
  }

  // 9. Lighting & Weather Modification
  if (
    /(change|modify|make) (the )?(lighting|light|weather|atmosphere|time of day) (to |into )?(.+)/i.test(lower) ||
    /(sunset|golden hour|nighttime|midnight|stormy|rainy|foggy|sunny|dramatic rim light)/i.test(lower)
  ) {
    const lightMatch = lower.match(/(?:lighting|weather|atmosphere) (?:to |into )?(.+)/i);
    const lightTarget = lightMatch ? lightMatch[1].trim() : instruction;

    return {
      operation: "lighting_modification",
      confidence: 0.89,
      lightingTarget: lightTarget,
      requiresMask: false,
      isAmbiguous: false,
      normalizedPrompt: `Atmospheric lighting adjustment: cast scene in ${lightTarget}, relighting surfaces with coherent cast shadows and color temperature`,
    };
  }

  // 10. Style Transfer
  if (
    /(convert|transform|turn|render|stylize) (into |to )?(a |an )?(.+?)( style| painting| drawing| illustration| anime| watercolor| oil painting)/i.test(lower)
  ) {
    return {
      operation: "style_transfer",
      confidence: 0.91,
      styleTarget: instruction,
      requiresMask: false,
      isAmbiguous: false,
      normalizedPrompt: `Visual style transfer: restyle image into ${instruction}, retaining structural contours and subject composition`,
    };
  }

  // 11. Image Restoration
  if (
    /(restore|fix scratches|repair|clean up artifacts|denoise|sharpen face|deblur) (the )?(image|photo|face)?/i.test(lower)
  ) {
    return {
      operation: "image_restoration",
      confidence: 0.92,
      requiresMask: false,
      isAmbiguous: false,
      normalizedPrompt: `Facial and visual restoration: repair blemishes, compression artifacts, and scratches while preserving authentic details`,
    };
  }

  // 12. Default to Contextual Inpainting
  return {
    operation: "inpainting",
    confidence: 0.80,
    requiresMask: true,
    isAmbiguous: false,
    normalizedPrompt: `Localized mask inpainting: apply modification "${instruction}", ensuring seamless border blending with surrounding pixels`,
  };
}
