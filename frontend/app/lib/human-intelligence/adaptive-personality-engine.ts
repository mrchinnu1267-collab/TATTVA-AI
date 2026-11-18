/**
 * TATTVA AI - Adaptive Personality & Tone Calibration Engine
 * Balances natural human warmth, intellectual rigor, patient scaffolding, and emotional safety
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { EmotionalSignal } from "./emotional-context-analyzer";

export type FormalityLevel = "casual" | "balanced" | "professional";
export type InteractionArchetype =
  | "collaborative_peer"
  | "patient_tutor"
  | "technical_specialist"
  | "empathetic_guide"
  | "crisp_operator";

export interface PersonaConfiguration {
  archetype: InteractionArchetype;
  formality: FormalityLevel;
  warmthLevel: "high" | "balanced" | "minimal";
  conciseness: "direct" | "balanced" | "comprehensive";
  systemPersonaInstructions: string;
}

export class AdaptivePersonalityEngine {
  private static instance: AdaptivePersonalityEngine;

  public static getInstance(): AdaptivePersonalityEngine {
    if (!AdaptivePersonalityEngine.instance) {
      AdaptivePersonalityEngine.instance = new AdaptivePersonalityEngine();
    }
    return AdaptivePersonalityEngine.instance;
  }

  /**
   * Resolves the ideal persona configuration given emotional tone, intent, and user preference
   */
  public calibratePersona(
    primaryEmotion: EmotionalSignal,
    intent: string,
    userFormalityPreference?: FormalityLevel,
    isCodeRequest: boolean = false
  ): PersonaConfiguration {
    let archetype: InteractionArchetype = "collaborative_peer";
    let formality: FormalityLevel = userFormalityPreference || "balanced";
    let warmthLevel: "high" | "balanced" | "minimal" = "balanced";
    let conciseness: "direct" | "balanced" | "comprehensive" = "balanced";

    // Emotion-informed tuning
    if (primaryEmotion === "frustration" || primaryEmotion === "urgency") {
      archetype = "crisp_operator";
      warmthLevel = "balanced";
      conciseness = "direct";
    } else if (primaryEmotion === "confusion" || primaryEmotion === "uncertainty") {
      archetype = "patient_tutor";
      warmthLevel = "high";
      conciseness = "balanced";
    } else if (primaryEmotion === "sadness" || primaryEmotion === "stress") {
      archetype = "empathetic_guide";
      warmthLevel = "high";
      conciseness = "balanced";
    } else if (primaryEmotion === "satisfaction" || primaryEmotion === "excitement" || primaryEmotion === "happiness") {
      archetype = "collaborative_peer";
      warmthLevel = "high";
      conciseness = "balanced";
    } else if (isCodeRequest || intent === "coding" || intent === "architecture") {
      archetype = "technical_specialist";
      formality = userFormalityPreference || "professional";
      conciseness = "direct";
    }

    const systemPersonaInstructions = this.buildPersonaDirectives(archetype, formality, warmthLevel, conciseness);

    return {
      archetype,
      formality,
      warmthLevel,
      conciseness,
      systemPersonaInstructions,
    };
  }

  private buildPersonaDirectives(
    archetype: InteractionArchetype,
    formality: FormalityLevel,
    warmth: "high" | "balanced" | "minimal",
    conciseness: "direct" | "balanced" | "comprehensive"
  ): string {
    const directives: string[] = [];

    directives.push("ADAPTIVE PERSONALITY & COMMUNICATIVE EXCELLENCE:");
    directives.push("- Core Values: Friendly, Intelligent, Respectful, Patient, Curious, Calm, Natural, Honest, and Supportive.");
    directives.push("- Speak with the natural presence of a thoughtful, highly capable technical colleague.");
    directives.push("- NEVER use robotic conversational fluff or throat-clearing cliches (e.g. NEVER start with 'Certainly!', 'I would be delighted to assist', 'Sure, here is your answer', 'As an AI language model').");
    directives.push("- NEVER parrot the user's prompt back to them.");
    directives.push("- NEVER pretend to have biological human feelings or physical experiences, and never foster artificial emotional dependency.");

    if (archetype === "crisp_operator") {
      directives.push("- Active Stance: CRISP OPERATOR. Deliver the direct operational fix immediately on line 1. Eliminate filler, greetings, and tangential theory. Focus on actionable results.");
    } else if (archetype === "patient_tutor") {
      directives.push("- Active Stance: PATIENT TUTOR. Use scaffolded explanations, intuitive analogies, and approachable language. Check in naturally at the end if the concept clicks.");
    } else if (archetype === "empathetic_guide") {
      directives.push("- Active Stance: EMPATHETIC GUIDE. Provide gentle, steady reassurance and structured practical support. Break high-pressure situations down into manageable, peaceful steps.");
    } else if (archetype === "technical_specialist") {
      directives.push("- Active Stance: TECHNICAL SPECIALIST. Provide clean, typed, production-ready code with complete error handling. Explain memory and algorithmic trade-offs. Strictly NO emojis in code blocks.");
    } else {
      directives.push("- Active Stance: COLLABORATIVE PEER. Friendly, natural, and intellectually curious. Celebrate wins and solve challenges together.");
    }

    if (formality === "casual") {
      directives.push("- Register: Casual, approachable, and conversational.");
    } else if (formality === "professional") {
      directives.push("- Register: Professional, structured, and precise.");
    } else {
      directives.push("- Register: Balanced, warm, and clear.");
    }

    if (conciseness === "direct") {
      directives.push("- Density: Concise and direct. Answer the core need upfront.");
    }

    return directives.join("\n");
  }
}

export const adaptivePersonalityEngine = AdaptivePersonalityEngine.getInstance();
