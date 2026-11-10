import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { moderateTextPrompt, SAFETY_REJECTION_MESSAGE } from "../../lib/content-moderation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const rawPrompt = body.prompt.trim();
    const selectedStyle = body.style || "";

    // 1. Moderate Input Prompt BEFORE Enhancement
    const preCheck = moderateTextPrompt(rawPrompt);
    if (!preCheck.isSafe) {
      return NextResponse.json(
        {
          error: SAFETY_REJECTION_MESSAGE,
          safetyViolation: true,
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are the master AI Prompt Architect for TATTVA AI Image Generation Studio.
Your mission is to understand the user's natural language intention, extract core visual elements, and enhance the prompt for high-fidelity photorealism or artistic excellence (like DALL-E 3 / Midjourney v6).

CRITICAL SAFETY DIRECTIVE:
- Strictly reject and never generate descriptions of: pornography, explicit nudity, bare breasts, exposed genitalia, sexual activity, sexualized minors, gruesome gore, decapitation, self-harm, or suicide.
- If the request touches upon any prohibited content, do NOT enhance it into adult or harmful territory.

EXTRACTION REQUIREMENTS (Extract all 10 dimensions):
1. Main subject (anatomy, posture, attire, expressions, authentic human realism with natural skin pores and realistic iris).
2. Environment (setting, indoor/outdoor, atmospheric depth, weather).
3. Objects (key items, props, interactive elements).
4. Actions (what is happening, movement, dynamic pose, interaction).
5. Artistic style (photorealism, cinematic, anime, 3D octane, digital art, etc.).
6. Lighting (volumetric, chiaroscuro, golden hour, neon glow, soft diffused studio).
7. Camera angle (eye-level, low-angle, high-angle, drone aerial, close-up portrait).
8. Composition (rule of thirds, centered symmetry, leading lines, golden ratio, depth of field).
9. Mood (serene, epic, mysterious, joyful, melancholic, intense).
10. Color palette (vibrant warm tones, desaturated monochrome, pastel, cyber-neon, earthy natural).

PRESERVATION RULE:
- Strictly preserve 100% of the user's specific requests, items, colors, and characters. Never remove requested elements.
${selectedStyle ? `- Incorporate the requested artistic style: "${selectedStyle}".` : ""}

Return a valid JSON object matching this schema:
{
  "enhanced_prompt": string,
  "breakdown": {
    "main_subject": string,
    "environment": string,
    "objects": string,
    "actions": string,
    "artistic_style": string,
    "lighting": string,
    "camera_angle": string,
    "composition": string,
    "mood": string,
    "color_palette": string
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [{ text: `USER PROMPT TO ENHANCE:\n"${rawPrompt}"` }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.35,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const enhancedPrompt = parsed.enhanced_prompt || rawPrompt;

    // 2. Moderate Output Prompt AFTER Enhancement
    const postCheck = moderateTextPrompt(enhancedPrompt);
    if (!postCheck.isSafe) {
      return NextResponse.json(
        {
          error: SAFETY_REJECTION_MESSAGE,
          safetyViolation: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      original_prompt: rawPrompt,
      enhanced_prompt: enhancedPrompt,
      breakdown: parsed.breakdown || {
        main_subject: rawPrompt,
        environment: "Contextual atmospheric scene",
        objects: "Scene elements",
        actions: "Natural presence",
        artistic_style: selectedStyle || "Photorealistic",
        lighting: "Cinematic volumetric lighting",
        camera_angle: "Eye-level 35mm lens",
        composition: "Rule of thirds with sharp depth of field",
        mood: "Atmospheric & immersive",
        color_palette: "Harmonious cinematic palette",
      },
    });
  } catch (error: unknown) {
    console.error("Prompt enhance error:", error);
    const message = error instanceof Error ? error.message : "Failed to enhance prompt.";
    if (message.includes("content safety") || message.includes("safety guidelines")) {
      return NextResponse.json(
        { error: SAFETY_REJECTION_MESSAGE, safetyViolation: true },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
