/**
 * TATTVA AI - Secure Ephemeral Custom Provider Executor
 * Executes BYOK (Bring Your Own Key) requests with Zero Server-Side Persistence.
 * 
 * Security Invariants:
 * 1. ZERO PERSISTENCE: Keys are held only in function call frame memory and never saved.
 * 2. ZERO LOGGING: Keys are strictly redacted from any console, traces, or security logs.
 * 3. ERROR SCRUBBING: Error messages from third-party APIs are sanitized to strip any tokens.
 * 
 * Conceptualized & Engineered by Kotapati Gowtham Chowdary
 */

import { GoogleGenAI } from "@google/genai";

export type CustomProviderId = "openai" | "gemini" | "anthropic" | "groq" | "openrouter" | "custom";

export interface CustomExecutionPayload {
  provider: CustomProviderId;
  apiKey?: string;
  model: string;
  baseUrl?: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
}

export interface CustomExecutionResult {
  role: "assistant";
  content: string;
  kind: "text";
  intent: "general_chat";
  modelUsed: string;
  provider: string;
  latencyMs: number;
}

/**
 * Strips raw keys and credentials from any error message
 */
export function scrubCredentials(raw: string, userKey?: string): string {
  if (!raw) return "";
  let clean = raw;
  if (userKey && userKey.length > 5) {
    clean = clean.split(userKey).join("[REDACTED_USER_KEY]");
  }
  return clean
    .replace(/sk-[a-zA-Z0-9_\-]{8,}/gi, "sk-••••••••[REDACTED]")
    .replace(/AIza[0-9A-Za-z-_]{30,}/g, "AIza••••••••[REDACTED]")
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]{15,}/gi, "Bearer [REDACTED]")
    .replace(/key=[a-zA-Z0-9_\-]{15,}/gi, "key=[REDACTED]");
}

/**
 * Executes a chat completion against the user's custom AI provider
 */
export async function executeCustomProvider(
  payload: CustomExecutionPayload
): Promise<CustomExecutionResult> {
  const startTime = Date.now();
  const { provider, apiKey, model, baseUrl, messages, temperature = 0.7, maxTokens } = payload;

  if (provider !== "custom" && (!apiKey || apiKey.trim().length === 0)) {
    throw new Error(`API key is required for provider "${provider}". Please configure it in Settings -> AI Providers.`);
  }

  try {
    let responseText = "";

    switch (provider) {
      case "openai": {
        const url = baseUrl?.trim() ? `${baseUrl.replace(/\/+$/, "")}/chat/completions` : "https://api.openai.com/v1/chat/completions";
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey?.trim()}`,
          },
          body: JSON.stringify({
            model: model || "gpt-4o",
            messages,
            temperature,
            ...(maxTokens ? { max_tokens: maxTokens } : {}),
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`OpenAI HTTP ${res.status}: ${scrubCredentials(errText, apiKey)}`);
        }

        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || "";
        break;
      }

      case "gemini": {
        const cleanKey = apiKey?.trim() || "";
        const ai = new GoogleGenAI({ apiKey: cleanKey });
        
        // Extract system prompt if present
        const systemMsg = messages.find((m) => m.role === "system")?.content;
        const contents = messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

        const result = await ai.models.generateContent({
          model: model || "gemini-2.5-flash",
          contents,
          config: {
            systemInstruction: systemMsg,
            temperature,
            maxOutputTokens: maxTokens,
          },
        });

        responseText = result.text || "";
        break;
      }

      case "anthropic": {
        const url = baseUrl?.trim() ? `${baseUrl.replace(/\/+$/, "")}/messages` : "https://api.anthropic.com/v1/messages";
        const systemMsg = messages.find((m) => m.role === "system")?.content;
        const anthropicMessages = messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          }));

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey?.trim() || "",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: model || "claude-3-5-sonnet-20241022",
            system: systemMsg,
            messages: anthropicMessages,
            max_tokens: maxTokens || 4096,
            temperature,
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Anthropic HTTP ${res.status}: ${scrubCredentials(errText, apiKey)}`);
        }

        const data = await res.json();
        const textBlock = data.content?.find((c: any) => c.type === "text");
        responseText = textBlock?.text || "";
        break;
      }

      case "groq": {
        const url = baseUrl?.trim() ? `${baseUrl.replace(/\/+$/, "")}/chat/completions` : "https://api.groq.com/openai/v1/chat/completions";
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey?.trim()}`,
          },
          body: JSON.stringify({
            model: model || "llama-3.3-70b-versatile",
            messages,
            temperature,
            ...(maxTokens ? { max_tokens: maxTokens } : {}),
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Groq HTTP ${res.status}: ${scrubCredentials(errText, apiKey)}`);
        }

        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || "";
        break;
      }

      case "openrouter": {
        const url = baseUrl?.trim() ? `${baseUrl.replace(/\/+$/, "")}/chat/completions` : "https://openrouter.ai/api/v1/chat/completions";
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey?.trim()}`,
            "HTTP-Referer": "https://tattva-ai.org",
            "X-Title": "TATTVA AI",
          },
          body: JSON.stringify({
            model: model || "meta-llama/llama-3.3-70b-instruct",
            messages,
            temperature,
            ...(maxTokens ? { max_tokens: maxTokens } : {}),
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`OpenRouter HTTP ${res.status}: ${scrubCredentials(errText, apiKey)}`);
        }

        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || "";
        break;
      }

      case "custom": {
        const targetBase = baseUrl?.trim() || "http://localhost:11434/v1";
        const url = `${targetBase.replace(/\/+$/, "")}/chat/completions`;

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (apiKey && apiKey.trim().length > 0) {
          headers["Authorization"] = `Bearer ${apiKey.trim()}`;
        }

        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: model || "llama3",
            messages,
            temperature,
            ...(maxTokens ? { max_tokens: maxTokens } : {}),
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Custom Endpoint HTTP ${res.status}: ${scrubCredentials(errText, apiKey)}`);
        }

        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || "";
        break;
      }

      default:
        throw new Error(`Unsupported provider "${provider}".`);
    }

    return {
      role: "assistant",
      content: responseText || "No response received from custom provider.",
      kind: "text",
      intent: "general_chat",
      modelUsed: `BYOK: ${model} (${provider})`,
      provider: `custom_${provider}`,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : String(error);
    const safeMsg = scrubCredentials(rawMsg, apiKey);
    console.error("[TATTVA Custom Provider Error]:", safeMsg);
    throw new Error(safeMsg);
  }
}
