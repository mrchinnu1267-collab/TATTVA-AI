/**
 * TATTVA AI - Official Developer TypeScript SDK Client
 * Lightweight, typed client for integrating TATTVA AI into external applications.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface TattvaClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class TattvaClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(config: TattvaClientConfig) {
    if (!config.apiKey || !config.apiKey.startsWith("tattva_live_")) {
      throw new Error("Invalid TATTVA API key. Must start with 'tattva_live_'");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || "https://tattva-ai-phi.vercel.app").replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs || 30000;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "TattvaAI-SDK/1.0.0 (TypeScript)",
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let parsedError: any;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = { error: errorText };
      }
      throw new Error(`TATTVA API Error (${res.status}): ${parsedError.error || res.statusText}`);
    }

    return await res.json();
  }

  // 1. Text Chat Completion API
  public readonly chat = {
    create: async (params: {
      messages: Array<{ role: string; content: string }>;
      model?: string;
      temperature?: number;
    }) => {
      return this.request<{ success: boolean; data: { reply: string; model: string; durationMs: number } }>(
        "/api/v1/chat",
        {
          method: "POST",
          body: JSON.stringify(params),
        }
      );
    },
  };

  // 2. Authoritative Research API
  public readonly research = {
    search: async (params: { query: string; maxSources?: number; deepRead?: boolean }) => {
      return this.request<{ success: boolean; data: any }>("/api/v1/research", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
  };

  // 3. Document Intelligence API
  public readonly documents = {
    ingest: async (params: { filename: string; content: string; mimeType?: string }) => {
      return this.request<{ success: boolean; document: any }>("/api/v1/documents", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
  };

  // 4. Autonomous Agent Tasks API
  public readonly tasks = {
    create: async (params: { objective: string; agentRole?: string; workspaceId?: string }) => {
      return this.request<{ success: boolean; data: any }>("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
  };

  // 5. Usage & Quotas API
  public readonly usage = {
    get: async () => {
      return this.request<{ success: boolean; data: any }>("/api/v1/usage", {
        method: "GET",
      });
    },
  };
}
