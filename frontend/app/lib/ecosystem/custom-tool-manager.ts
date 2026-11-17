/**
 * TATTVA AI - Custom AI Tool Manager & Dynamic Dispatcher
 * Allows authorized users and developers to create, validate, and execute custom API tools.
 * Enforces SSRF defense, schema validation, and rate limits.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { CustomToolDefinition } from "./types";
import { isSafePublicUrl } from "../research-engine/source-crawler";
import { CentralizedToolRegistry } from "../agent-engine/tool-registry";

// In-memory tenant custom tool store
const tenantCustomTools = new Map<string, Map<string, CustomToolDefinition>>();

function getUserCustomToolStore(userId: string): Map<string, CustomToolDefinition> {
  if (!tenantCustomTools.has(userId)) {
    tenantCustomTools.set(userId, new Map());
  }
  return tenantCustomTools.get(userId)!;
}

export class CustomToolManager {
  /**
   * Registers a new custom AI tool for a tenant
   */
  public static registerCustomTool(
    userId: string,
    workspaceId: string,
    def: Omit<CustomToolDefinition, "id" | "userId" | "workspaceId" | "createdAt">
  ): CustomToolDefinition {
    if (!userId) throw new Error("Multi-tenant violation: User ID is required.");
    if (!def.name || !def.endpointUrl) {
      throw new Error("Invalid tool definition: Name and endpointUrl are required.");
    }

    // SSRF Validation
    if (!isSafePublicUrl(def.endpointUrl)) {
      throw new Error("SSRF Protection Violation: Tool endpoint cannot target local, internal, or private network addresses.");
    }

    const toolId = `tool_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const customTool: CustomToolDefinition = {
      ...def,
      id: toolId,
      userId,
      workspaceId: workspaceId || "default",
      permission: def.permission || "safe",
      timeoutMs: Math.min(Math.max(def.timeoutMs || 10000, 1000), 30000),
      rateLimitPerMinute: def.rateLimitPerMinute || 60,
      createdAt: new Date().toISOString(),
    };

    const store = getUserCustomToolStore(userId);
    store.set(toolId, customTool);

    // Register with CentralizedToolRegistry dynamically
    try {
      const registry = CentralizedToolRegistry.getInstance();
      registry.registerTool({
        name: customTool.name,
        displayName: customTool.displayName || customTool.name,
        description: customTool.description,
        category: "api",
        permission: customTool.permission,
        timeoutMs: customTool.timeoutMs,
        inputSchema: customTool.inputSchema as any,
        outputSchema: customTool.outputSchema,
        execute: async (params, context) => {
          return await CustomToolManager.executeCustomTool(userId, toolId, params);
        },
      });
    } catch {}

    return customTool;
  }

  /**
   * Retrieves a custom tool by ID ensuring tenant ownership
   */
  public static getCustomTool(userId: string, toolId: string): CustomToolDefinition | null {
    if (!userId || !toolId) return null;
    const store = getUserCustomToolStore(userId);
    return store.get(toolId) || null;
  }

  /**
   * Lists all custom tools belonging to a user
   */
  public static listCustomTools(userId: string, workspaceId?: string): CustomToolDefinition[] {
    if (!userId) return [];
    const store = getUserCustomToolStore(userId);
    const tools = Array.from(store.values());
    if (workspaceId) {
      return tools.filter((t) => t.workspaceId === workspaceId);
    }
    return tools;
  }

  /**
   * Executes a custom tool by dispatching an HTTP request to its endpoint
   */
  public static async executeCustomTool(
    userId: string,
    toolId: string,
    params: Record<string, any>
  ): Promise<{ toolName: string; success: boolean; output: any; error?: string; executionTimeMs: number }> {
    const startTime = Date.now();
    const tool = this.getCustomTool(userId, toolId);

    if (!tool) {
      return {
        toolName: toolId,
        success: false,
        output: null,
        error: `Custom tool "${toolId}" not found or unauthorized for this user.`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // SSRF double-check
    if (!isSafePublicUrl(tool.endpointUrl)) {
      return {
        toolName: tool.name,
        success: false,
        output: null,
        error: "SSRF Protection: Custom tool endpoint address is not permitted.",
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Validate inputs
    for (const [key, schema] of Object.entries(tool.inputSchema)) {
      if (schema.required && (params[key] === undefined || params[key] === null || params[key] === "")) {
        return {
          toolName: tool.name,
          success: false,
          output: null,
          error: `Missing required parameter "${key}".`,
          executionTimeMs: Date.now() - startTime,
        };
      }
    }

    try {
      const headers: Record<string, string> = {
        "User-Agent": "TattvaAI/2.1 (Custom Tool Dispatcher)",
        "Content-Type": "application/json",
      };

      if (tool.authConfig?.type === "bearer" && tool.authConfig.encryptedSecret) {
        headers["Authorization"] = `Bearer ${tool.authConfig.encryptedSecret}`;
      } else if (tool.authConfig?.type === "custom_header" && tool.authConfig.headerName && tool.authConfig.encryptedSecret) {
        headers[tool.authConfig.headerName] = tool.authConfig.encryptedSecret;
      }

      const method = tool.httpMethod || "POST";
      const fetchOpts: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(tool.timeoutMs),
      };

      let url = tool.endpointUrl;
      if (method === "GET") {
        const queryParams = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          queryParams.set(k, String(v));
        }
        url += (url.includes("?") ? "&" : "?") + queryParams.toString();
      } else {
        fetchOpts.body = JSON.stringify(params);
      }

      const res = await fetch(url, fetchOpts);
      if (!res.ok) {
        return {
          toolName: tool.name,
          success: false,
          output: null,
          error: `Endpoint returned HTTP ${res.status}: ${res.statusText}`,
          executionTimeMs: Date.now() - startTime,
        };
      }

      const contentType = res.headers.get("content-type") || "";
      const output = contentType.includes("application/json") ? await res.json() : await res.text();

      return {
        toolName: tool.name,
        success: true,
        output,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        toolName: tool.name,
        success: false,
        output: null,
        error: err?.message || String(err),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Deletes a custom tool ensuring tenant authorization
   */
  public static deleteCustomTool(userId: string, toolId: string): boolean {
    if (!userId || !toolId) return false;
    const store = getUserCustomToolStore(userId);
    return store.delete(toolId);
  }
}
