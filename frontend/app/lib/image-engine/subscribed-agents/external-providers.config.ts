/**
 * TATTVA AI - Verified External Image Provider Configurations
 * 
 * Strict Zero-API-Key Architecture Rules:
 * - Only verified, officially documented provider websites are included.
 * - No invented or synthetic URLs.
 * - TATTVA AI never interacts with or scrapes these websites automatically.
 * - Opening an external tool is exclusively a manual, user-initiated browser action.
 */

export interface ExternalProviderOption {
  id: string;
  name: string;
  neutralLabel: string;
  url: string;
  category: "photorealistic" | "stylistic" | "general";
  recommendedAspectRatio: string;
  instructions: string;
}

export const VERIFIED_EXTERNAL_PROVIDERS: ExternalProviderOption[] = [
  {
    id: "provider_chatgpt",
    name: "ChatGPT / DALL-E",
    neutralLabel: "External AI Agent A (General & Photorealistic)",
    url: "https://chatgpt.com",
    category: "photorealistic",
    recommendedAspectRatio: "1:1",
    instructions: "Paste prompt into the ChatGPT prompt box. Save the generated image and drop it into TATTVA AI.",
  },
  {
    id: "provider_midjourney",
    name: "Midjourney",
    neutralLabel: "External AI Agent B (Cinematic & Stylistic)",
    url: "https://www.midjourney.com",
    category: "stylistic",
    recommendedAspectRatio: "16:9",
    instructions: "Paste the compiled prompt into Midjourney web or Discord. Download the full-resolution render and drop it into TATTVA AI.",
  },
  {
    id: "provider_claude",
    name: "Claude Artifacts",
    neutralLabel: "External AI Agent (Design & SVG)",
    url: "https://claude.ai",
    category: "stylistic",
    recommendedAspectRatio: "1:1",
    instructions: "Paste prompt into Claude to design visual artifacts or vector compositions. Save the image and import into TATTVA AI.",
  },
  {
    id: "provider_gemini",
    name: "Google Gemini",
    neutralLabel: "External AI Agent (Multimodal & Creative)",
    url: "https://gemini.google.com",
    category: "general",
    recommendedAspectRatio: "1:1",
    instructions: "Paste prompt into Google Gemini. Export the generated image and import it into your TATTVA AI workspace.",
  },
];

export const DEFAULT_AGENT_CONFIG = {
  agent_a: {
    id: "agent_a",
    neutralLabel: "External Image Agent A",
    specialty: "Photorealistic, cinematic lighting & physical textures",
    defaultProviderId: "provider_chatgpt",
    defaultUrl: "https://chatgpt.com",
  },
  agent_b: {
    id: "agent_b",
    neutralLabel: "External Image Agent B",
    specialty: "Graphic design, posters, illustrations & concept art",
    defaultProviderId: "provider_midjourney",
    defaultUrl: "https://www.midjourney.com",
  },
};
