/**
 * TATTVA AI - Character Accuracy & Visual Verification Engine
 * Detects recognizable fictional/pop-culture characters and verifies their defining visual characteristics.
 * Strictly prevents falsely classifying generic substitutes as requested characters.
 */

import { CharacterAppearanceAnalysis } from "./types";

interface CharacterSignature {
  name: string;
  aliases: string[];
  definingTraits: string[];
  signatureColors: string[];
  requiredElements: string[];
  disqualifyingElements?: string[];
  description: string;
}

export const CHARACTER_REGISTRY: Record<string, CharacterSignature> = {
  doraemon: {
    name: "Doraemon",
    aliases: ["doraemon", "doremon"],
    definingTraits: [
      "blue round robotic cat body",
      "white spherical face and white round belly",
      "red neck collar with round yellow bell",
      "half-circle white 4D pouch pocket on belly",
      "round red nose with white whiskers",
      "completely earless head",
    ],
    signatureColors: ["blue", "white", "red", "yellow"],
    requiredElements: ["blue", "round bell or collar", "4D pocket or white belly"],
    disqualifyingElements: ["astronaut helmet", "pointy cat ears", "human hair", "realistic robot limbs"],
    description: "Iconic blue robotic cat from 22nd century with no ears, red nose, yellow bell collar, and white front pocket pouch.",
  },
  pikachu: {
    name: "Pikachu",
    aliases: ["pikachu"],
    definingTraits: [
      "yellow chubby rodent body",
      "long yellow ears with distinct black tips",
      "round bright red cheek pouches",
      "zigzag lightning-bolt shaped tail",
      "two horizontal brown stripes on back",
    ],
    signatureColors: ["yellow", "red", "black", "brown"],
    requiredElements: ["yellow body", "black-tipped ears", "red cheeks or lightning tail"],
    description: "Yellow Electric-type Pokémon with black-tipped long ears, red circular cheeks, and a lightning bolt tail.",
  },
  batman: {
    name: "Batman",
    aliases: ["batman", "the dark knight", "bruce wayne"],
    definingTraits: [
      "dark bat cowl covering upper face with pointed bat ears",
      "black or dark grey tactical armor suit",
      "black bat emblem on chest",
      "scalloped bat cape",
      "gold or dark utility belt around waist",
    ],
    signatureColors: ["black", "dark grey", "gold"],
    requiredElements: ["bat cowl or bat ears", "bat emblem or scalloped cape"],
    description: "DC Comics superhero wearing a pointed-eared bat cowl, bat chest emblem, scalloped cape, and utility belt.",
  },
  superman: {
    name: "Superman",
    aliases: ["superman", "man of steel", "clark kent"],
    definingTraits: [
      "royal blue bodysuit",
      "red and yellow iconic 'S' shield emblem on chest",
      "flowing crimson red cape",
      "red knee-high boots",
      "black hair with signature spit curl",
    ],
    signatureColors: ["blue", "red", "yellow"],
    requiredElements: ["S shield or chest emblem", "red cape", "blue suit"],
    description: "DC Comics superhero wearing blue suit with red cape and red-and-yellow 'S' shield emblem on chest.",
  },
  spiderman: {
    name: "Spider-Man",
    aliases: ["spiderman", "spider-man", "peter parker"],
    definingTraits: [
      "red and blue or black full-body suit",
      "black webbing lines across red sections",
      "large white reflective eye lenses with black borders",
      "spider emblem centered on chest",
    ],
    signatureColors: ["red", "blue", "black", "white"],
    requiredElements: ["web pattern", "white eye lenses", "spider chest logo"],
    description: "Marvel superhero in red and blue suit with web patterns, white eye lenses, and spider emblem.",
  },
  goku: {
    name: "Goku",
    aliases: ["goku", "son goku", "kakarot"],
    definingTraits: [
      "orange martial arts turtle gi (dogi)",
      "dark blue undershirt, wristbands, and sash belt",
      "signature voluminous spiky black hair (or golden for Super Saiyan)",
      "sturdy martial artist physique and boots with red laces",
    ],
    signatureColors: ["orange", "blue", "black"],
    requiredElements: ["orange gi", "spiky hair", "blue undershirt or sash"],
    description: "Dragon Ball protagonist in orange martial arts gi with blue sash and iconic gravity-defying spiky hair.",
  },
  mario: {
    name: "Mario",
    aliases: ["super mario", "mario"],
    definingTraits: [
      "bright red cap with white circular 'M' emblem",
      "blue denim overalls with yellow circular buttons",
      "red long-sleeve undershirt",
      "thick curved dark brown mustache",
      "white cartoon gloves and brown work boots",
    ],
    signatureColors: ["red", "blue", "white", "yellow", "brown"],
    requiredElements: ["red cap with M", "blue overalls", "mustache"],
    description: "Nintendo mascot in red cap with 'M', blue overalls, red shirt, and prominent mustache.",
  },
  sonic: {
    name: "Sonic the Hedgehog",
    aliases: ["sonic", "sonic the hedgehog"],
    definingTraits: [
      "bright cobalt blue anthropomorphic hedgehog",
      "long swept-back quill spines behind head",
      "bright red running sneakers with single white strap and gold buckle",
      "white cartoon gloves",
      "emerald green eyes and tan peach muzzle",
    ],
    signatureColors: ["blue", "red", "white", "tan", "green"],
    requiredElements: ["blue hedgehog spines", "red running shoes with white strap", "white gloves"],
    description: "Blue hedgehog with swept-back spines, white gloves, and red sneakers with white straps.",
  },
  mickey_mouse: {
    name: "Mickey Mouse",
    aliases: ["mickey mouse", "mickey"],
    definingTraits: [
      "two large perfectly circular black ears atop head",
      "red shorts with two large oval white buttons",
      "oversized yellow cartoon shoes",
      "four-fingered white gloves with three black stitch darts",
    ],
    signatureColors: ["black", "red", "yellow", "white"],
    requiredElements: ["round mouse ears", "red shorts with white buttons", "yellow shoes"],
    description: "Disney cartoon mascot with round black ears, red two-button shorts, yellow shoes, and white gloves.",
  },
  darth_vader: {
    name: "Darth Vader",
    aliases: ["darth vader", "vader", "anakin skywalker"],
    definingTraits: [
      "glossy black armored samurai-inspired helmet and flared cowl",
      "triangular black respirator mouth grille mask",
      "black flowing cape and robes",
      "rectangular electronic chest control box with colored switches",
      "belt with illuminated utility boxes",
    ],
    signatureColors: ["black", "silver", "red lights"],
    requiredElements: ["black helmet with mouth grill", "black cape", "chest control box"],
    description: "Star Wars Sith Lord in black armored helmet, respirator mask, flowing black cape, and chest control panel.",
  },
  iron_man: {
    name: "Iron Man",
    aliases: ["iron man", "tony stark"],
    definingTraits: [
      "crimson red and polished gold metallic exoskeleton armor",
      "glowing cyan-white circular or triangular arc reactor on chest",
      "sleek gold faceplate with glowing white eye slits",
      "repulsor palm nodes in gloves",
    ],
    signatureColors: ["red", "gold", "cyan / glowing blue"],
    requiredElements: ["red and gold armor", "glowing arc reactor", "faceplate with glowing eyes"],
    description: "Marvel superhero in red and gold high-tech powered armor with glowing chest arc reactor and eye slits.",
  },
  spongebob: {
    name: "SpongeBob SquarePants",
    aliases: ["spongebob", "spongebob squarepants"],
    definingTraits: [
      "yellow porous rectangular sea sponge body",
      "brown rectangular dress trousers with black belt",
      "white collared shirt with red necktie",
      "large blue eyes, freckles, and two prominent front buck teeth",
      "black shiny shoes with white tube socks having blue and red stripes",
    ],
    signatureColors: ["yellow", "brown", "white", "red"],
    requiredElements: ["yellow square sponge", "brown pants with tie", "buck teeth or large eyes"],
    description: "Yellow rectangular sea sponge in brown dress trousers, white collared shirt, and red tie.",
  },
};

/**
 * Identifies if a prompt explicitly requests a recognizable fictional character.
 */
export function detectRequestedCharacter(prompt: string): CharacterSignature | null {
  const lower = prompt.toLowerCase();
  for (const sig of Object.values(CHARACTER_REGISTRY)) {
    for (const alias of sig.aliases) {
      const regex = new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (regex.test(lower)) {
        return sig;
      }
    }
  }
  return null;
}

/**
 * Assesses character accuracy by comparing visual observations against canonical character signatures.
 */
export function verifyCharacterAccuracy(params: {
  prompt: string;
  observedSubjectDescription: string;
  detectedEntities: string[];
  dominantColors: string[];
  visualStyle?: string;
}): CharacterAppearanceAnalysis {
  const { prompt, observedSubjectDescription, detectedEntities, dominantColors, visualStyle } = params;
  const targetChar = detectRequestedCharacter(prompt);

  // If no famous character was requested, return not_applicable
  if (!targetChar) {
    return {
      isRecognizableCharacter: false,
      observedCharacterDescription: observedSubjectDescription,
      identityMatchStatus: "not_applicable",
      definingFeaturesMatched: [],
      definingFeaturesMissingOrWrong: [],
      clothingAndCostume: "",
      confidence: 0.95,
    };
  }

  const descLower = observedSubjectDescription.toLowerCase();
  const allDetected = [...detectedEntities.map((e) => e.toLowerCase()), ...dominantColors.map((c) => c.toLowerCase())].join(" ");
  const compositeEvidence = `${descLower} ${allDetected}`;

  const matchedFeatures: string[] = [];
  const missingFeatures: string[] = [];

  // Check required signature elements
  let requiredMatches = 0;
  for (const req of targetChar.requiredElements) {
    const tokens = req.split(/\s+or\s+/);
    const hasAnyToken = tokens.some((t) => {
      const parts = t.split(" ");
      return parts.every((p) => compositeEvidence.includes(p));
    });

    if (hasAnyToken) {
      requiredMatches++;
    }
  }

  // Check defining traits
  for (const trait of targetChar.definingTraits) {
    const keyWords = trait.split(" ").filter((w) => w.length > 3);
    const matchesCount = keyWords.filter((kw) => compositeEvidence.includes(kw)).length;
    if (matchesCount >= 2) {
      matchedFeatures.push(trait);
    } else {
      missingFeatures.push(trait);
    }
  }

  // Check for disqualifying elements (e.g. generic anime astronaut when Doraemon was requested)
  let hasDisqualifyingElements = false;
  let disqualifyingReason = "";
  if (targetChar.disqualifyingElements) {
    for (const disq of targetChar.disqualifyingElements) {
      if (compositeEvidence.includes(disq.toLowerCase())) {
        hasDisqualifyingElements = true;
        disqualifyingReason = `Observed contradictory element: "${disq}".`;
        break;
      }
    }
  }

  // Determine Identity Match Status
  const requiredRatio = requiredMatches / Math.max(1, targetChar.requiredElements.length);
  const traitRatio = matchedFeatures.length / Math.max(1, targetChar.definingTraits.length);

  let status: "verified" | "generic_substitute" | "unrelated" = "verified";
  let mismatchReason: string | undefined = undefined;

  if (requiredRatio >= 0.7 && traitRatio >= 0.5 && !hasDisqualifyingElements) {
    status = "verified";
  } else if (
    compositeEvidence.includes("anime") ||
    compositeEvidence.includes("cartoon") ||
    compositeEvidence.includes("character") ||
    compositeEvidence.includes("robot") ||
    compositeEvidence.includes("person") ||
    hasDisqualifyingElements
  ) {
    status = "generic_substitute";
    mismatchReason = `The generated image depicts a generic ${visualStyle || "stylized"} figure rather than the canonical design of "${targetChar.name}". Missing key defining traits: [${missingFeatures.slice(0, 3).join("; ")}]. ${disqualifyingReason}`.trim();
  } else {
    status = "unrelated";
    mismatchReason = `The generated image does not visibly match requested character "${targetChar.name}". Observed: "${observedSubjectDescription}".`;
  }

  const confidence = status === "verified" ? 0.94 : status === "generic_substitute" ? 0.92 : 0.88;

  return {
    isRecognizableCharacter: true,
    requestedCharacterName: targetChar.name,
    observedCharacterDescription: observedSubjectDescription,
    identityMatchStatus: status,
    definingFeaturesMatched: matchedFeatures,
    definingFeaturesMissingOrWrong: missingFeatures,
    clothingAndCostume: targetChar.description,
    confidence,
    mismatchReason,
  };
}
