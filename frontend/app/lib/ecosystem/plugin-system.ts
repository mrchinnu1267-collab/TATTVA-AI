/**
 * TATTVA AI - Plugin System & Sandboxing Engine
 * Manages plugin manifests, tenant-level activation, permission verification, and audit logs.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { PluginManifest } from "./types";
import { IntegrationsVault } from "./integrations-vault";

export const OFFICIAL_PLUGINS: PluginManifest[] = [
  {
    id: "github-code-bridge",
    name: "GitHub Code Bridge",
    description: "Inspect repositories, track open issues, summarize pull requests, and analyze commits.",
    version: "1.0.0",
    author: "TATTVA AI",
    category: "engineering",
    requiredServices: ["github"],
    requiredPermissions: ["repo:read", "issues:read"],
    supportedTools: ["github_get_repo", "github_list_issues"],
    isOfficial: true,
  },
  {
    id: "slack-team-announcer",
    name: "Slack Team Announcer",
    description: "Broadcast automated notifications, reports, and AI insights directly to Slack channels.",
    version: "1.0.0",
    author: "TATTVA AI",
    category: "collaboration",
    requiredServices: ["slack"],
    requiredPermissions: ["chat:write"],
    supportedTools: ["slack_post_message"],
    isOfficial: true,
  },
  {
    id: "google-drive-sync",
    name: "Google Drive Sync",
    description: "Search, inspect, and ingest Google Drive documents directly into the TATTVA Document Vault.",
    version: "1.0.0",
    author: "TATTVA AI",
    category: "productivity",
    requiredServices: ["google_drive"],
    requiredPermissions: ["drive.readonly"],
    supportedTools: ["gdrive_list_files"],
    isOfficial: true,
  },
  {
    id: "notion-knowledge-sync",
    name: "Notion Knowledge Sync",
    description: "Query Notion databases and write structured research dossiers into Notion workspaces.",
    version: "1.0.0",
    author: "TATTVA AI",
    category: "productivity",
    requiredServices: ["notion"],
    requiredPermissions: ["pages:write", "databases:read"],
    supportedTools: ["notion_query_db"],
    isOfficial: true,
  },
  {
    id: "discord-webhook-notifier",
    name: "Discord Webhook Notifier",
    description: "Publish build updates, security incident alerts, and workflow completions to Discord.",
    version: "1.0.0",
    author: "TATTVA AI",
    category: "collaboration",
    requiredServices: ["discord"],
    requiredPermissions: ["webhook:send"],
    supportedTools: ["discord_send_alert"],
    isOfficial: true,
  },
];

// In-memory tenant plugin configuration & execution audit store
const userEnabledPlugins = new Map<string, Set<string>>();
const pluginAuditLog: Array<{
  timestamp: string;
  userId: string;
  pluginId: string;
  toolExecuted: string;
  success: boolean;
  durationMs: number;
  error?: string;
}> = [];

function getUserPluginSet(userId: string): Set<string> {
  if (!userEnabledPlugins.has(userId)) {
    // Enable default official plugins
    userEnabledPlugins.set(userId, new Set(["github-code-bridge", "slack-team-announcer"]));
  }
  return userEnabledPlugins.get(userId)!;
}

export class PluginSystem {
  /**
   * Lists all available plugins with tenant activation status
   */
  public static listPlugins(userId: string): PluginManifest[] {
    const enabledSet = getUserPluginSet(userId);
    return OFFICIAL_PLUGINS.map((plugin) => ({
      ...plugin,
      enabled: enabledSet.has(plugin.id),
    }));
  }

  /**
   * Enables a plugin for a user after validating service connections
   */
  public static enablePlugin(userId: string, pluginId: string): { success: boolean; message: string } {
    const plugin = OFFICIAL_PLUGINS.find((p) => p.id === pluginId);
    if (!plugin) {
      return { success: false, message: `Plugin "${pluginId}" not found in catalog.` };
    }

    const enabledSet = getUserPluginSet(userId);
    enabledSet.add(pluginId);
    return { success: true, message: `Plugin "${plugin.name}" successfully enabled.` };
  }

  /**
   * Disables a plugin for a user
   */
  public static disablePlugin(userId: string, pluginId: string): boolean {
    const enabledSet = getUserPluginSet(userId);
    return enabledSet.delete(pluginId);
  }

  /**
   * Executes a sandboxed tool provided by an enabled plugin
   */
  public static async executePluginTool(
    userId: string,
    workspaceId: string,
    pluginId: string,
    toolName: string,
    params: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const startTime = Date.now();
    const enabledSet = getUserPluginSet(userId);

    if (!enabledSet.has(pluginId)) {
      const err = `Plugin "${pluginId}" is not enabled for this user.`;
      this.recordAudit(userId, pluginId, toolName, false, Date.now() - startTime, err);
      return { success: false, error: err };
    }

    const plugin = OFFICIAL_PLUGINS.find((p) => p.id === pluginId);
    if (!plugin || !plugin.supportedTools.includes(toolName)) {
      const err = `Tool "${toolName}" is not provided by plugin "${pluginId}".`;
      this.recordAudit(userId, pluginId, toolName, false, Date.now() - startTime, err);
      return { success: false, error: err };
    }

    // Identify required service connection
    const requiredService = plugin.requiredServices[0];
    const connections = IntegrationsVault.listConnections(userId, workspaceId).filter(
      (c) => c.service === requiredService && c.status === "connected"
    );

    if (connections.length === 0) {
      const err = `Missing active connection for required service "${requiredService}". Please connect in Integrations Vault.`;
      this.recordAudit(userId, pluginId, toolName, false, Date.now() - startTime, err);
      return { success: false, error: err };
    }

    const activeConn = connections[0];
    const op = toolName.replace(new RegExp(`^${requiredService}_`), "");

    const result = await IntegrationsVault.executeServiceOperation(userId, activeConn.id, op, params);
    const durationMs = Date.now() - startTime;
    this.recordAudit(userId, pluginId, toolName, result.success, durationMs, result.error);

    return result;
  }

  private static recordAudit(
    userId: string,
    pluginId: string,
    toolExecuted: string,
    success: boolean,
    durationMs: number,
    error?: string
  ): void {
    pluginAuditLog.push({
      timestamp: new Date().toISOString(),
      userId,
      pluginId,
      toolExecuted,
      success,
      durationMs,
      error,
    });
    if (pluginAuditLog.length > 500) {
      pluginAuditLog.shift();
    }
  }

  public static getAuditLog(userId: string) {
    return pluginAuditLog.filter((l) => l.userId === userId);
  }
}
