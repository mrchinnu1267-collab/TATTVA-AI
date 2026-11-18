/**
 * TATTVA AI - Official Plugin Tool Definitions & AI Orchestrator Bridge
 * Connects PluginSystem tools to the AI Orchestrator's ToolRegistry
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ToolDefinition, ToolExecutionResult, ExecutionContext } from "../types";
import { PluginSystem } from "../../ecosystem/plugin-system";

export const pluginTools: ToolDefinition[] = [
  // 1. GitHub Code Bridge
  {
    name: "github_get_repo",
    displayName: "GitHub: Inspect Repository",
    description: "Fetches repository details, stargazers, forks, default branch, and description from GitHub.",
    category: "integration",
    riskLevel: "safe",
    parameters: {
      owner: { type: "string", description: "The GitHub owner or organization name", required: true },
      repo: { type: "string", description: "The repository name", required: true },
    },
    execute: async (params: Record<string, any>, context: ExecutionContext): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const res = await PluginSystem.executePluginTool(
        context.userId || "guest_user",
        context.workspaceId || "default",
        "github-code-bridge",
        "github_get_repo",
        params
      );
      return {
        toolName: "github_get_repo",
        success: res.success,
        output: res.data || null,
        error: res.error,
        executionTimeMs: Date.now() - startTime,
      };
    },
  },
  {
    name: "github_list_issues",
    displayName: "GitHub: List Issues",
    description: "Fetches open or closed issues and pull requests from a GitHub repository.",
    category: "integration",
    riskLevel: "safe",
    parameters: {
      owner: { type: "string", description: "The GitHub owner or organization name", required: true },
      repo: { type: "string", description: "The repository name", required: true },
      state: { type: "string", description: "Issue state filter: open, closed, or all", required: false },
    },
    execute: async (params: Record<string, any>, context: ExecutionContext): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const res = await PluginSystem.executePluginTool(
        context.userId || "guest_user",
        context.workspaceId || "default",
        "github-code-bridge",
        "github_list_issues",
        params
      );
      return {
        toolName: "github_list_issues",
        success: res.success,
        output: res.data || null,
        error: res.error,
        executionTimeMs: Date.now() - startTime,
      };
    },
  },

  // 2. Slack Team Announcer
  {
    name: "slack_post_message",
    displayName: "Slack: Post Message",
    description: "Broadcasts a notification or AI report to an authorized Slack channel.",
    category: "integration",
    riskLevel: "safe",
    parameters: {
      channel: { type: "string", description: "The Slack channel name or ID (e.g. #general)", required: true },
      message: { type: "string", description: "The message body to post", required: true },
    },
    execute: async (params: Record<string, any>, context: ExecutionContext): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const res = await PluginSystem.executePluginTool(
        context.userId || "guest_user",
        context.workspaceId || "default",
        "slack-team-announcer",
        "slack_post_message",
        params
      );
      return {
        toolName: "slack_post_message",
        success: res.success,
        output: res.data || null,
        error: res.error,
        executionTimeMs: Date.now() - startTime,
      };
    },
  },

  // 3. Google Drive Sync
  {
    name: "gdrive_list_files",
    displayName: "Google Drive: List Files",
    description: "Searches and lists documents, spreadsheets, and files in an authorized Google Drive account.",
    category: "integration",
    riskLevel: "safe",
    parameters: {
      query: { type: "string", description: "Optional search query to filter files", required: false },
      pageSize: { type: "number", description: "Maximum number of files to return (1-50)", required: false },
    },
    execute: async (params: Record<string, any>, context: ExecutionContext): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const res = await PluginSystem.executePluginTool(
        context.userId || "guest_user",
        context.workspaceId || "default",
        "google-drive-sync",
        "gdrive_list_files",
        params
      );
      return {
        toolName: "gdrive_list_files",
        success: res.success,
        output: res.data || null,
        error: res.error,
        executionTimeMs: Date.now() - startTime,
      };
    },
  },

  // 4. Notion Knowledge Sync
  {
    name: "notion_query_db",
    displayName: "Notion: Query Database",
    description: "Queries rows and structured pages from a connected Notion database.",
    category: "integration",
    riskLevel: "safe",
    parameters: {
      databaseId: { type: "string", description: "The Notion Database ID", required: true },
      filter: { type: "object", description: "Optional Notion query filter JSON", required: false },
    },
    execute: async (params: Record<string, any>, context: ExecutionContext): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const res = await PluginSystem.executePluginTool(
        context.userId || "guest_user",
        context.workspaceId || "default",
        "notion-knowledge-sync",
        "notion_query_db",
        params
      );
      return {
        toolName: "notion_query_db",
        success: res.success,
        output: res.data || null,
        error: res.error,
        executionTimeMs: Date.now() - startTime,
      };
    },
  },

  // 5. Discord Webhook Notifier
  {
    name: "discord_send_alert",
    displayName: "Discord: Send Alert",
    description: "Publishes a notification or security alert to a configured Discord channel via webhook.",
    category: "integration",
    riskLevel: "safe",
    parameters: {
      content: { type: "string", description: "The alert or notification text to post", required: true },
      webhookUrl: { type: "string", description: "Optional custom Discord webhook URL", required: false },
    },
    execute: async (params: Record<string, any>, context: ExecutionContext): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const res = await PluginSystem.executePluginTool(
        context.userId || "guest_user",
        context.workspaceId || "default",
        "discord-webhook-notifier",
        "discord_send_alert",
        params
      );
      return {
        toolName: "discord_send_alert",
        success: res.success,
        output: res.data || null,
        error: res.error,
        executionTimeMs: Date.now() - startTime,
      };
    },
  },
];
