/**
 * TATTVA AI - Context Manager & Workspace Isolation Engine
 * Manages conversation history, compact summaries, and workspace isolation
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ContextMessage, ConversationSummary, ActiveConversationContext } from "./types";
import { ContextSummarizer } from "./summarizer";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const MAX_RECENT_TURNS = 8; // Number of uncompressed recent turns to send directly

// Local vault cache for offline / file fallback
const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", ".tattva_context_vault")
    : path.join(process.cwd(), ".tattva_context_vault");

function ensureVaultDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // ignore
  }
}

// In-memory summary store: key = `${userId}:${workspaceId || 'personal'}:${conversationId}`
const summaryCache = new Map<string, ConversationSummary>();

function getContextKey(userId: string, conversationId: string, workspaceId?: string): string {
  const normUser = userId.toLowerCase().trim() || "guest_user";
  const normWs = workspaceId ? workspaceId.trim() : "personal";
  const normConv = conversationId.trim() || "default";
  return `${normUser}:${normWs}:${normConv}`;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export class ConversationContextManager {
  private static instance: ConversationContextManager;

  public static getInstance(): ConversationContextManager {
    if (!ConversationContextManager.instance) {
      ConversationContextManager.instance = new ConversationContextManager();
    }
    return ConversationContextManager.instance;
  }

  /**
   * Builds an optimized active conversation context with recent turns and compact historical summary
   */
  public async getOptimizedContext(
    allMessages: ContextMessage[],
    conversationId: string = "default",
    userId: string = "guest_user",
    workspaceId?: string
  ): Promise<ActiveConversationContext> {
    const key = getContextKey(userId, conversationId, workspaceId);
    let summary = summaryCache.get(key);

    // If not in-memory, attempt to load from Supabase or disk vault
    if (!summary) {
      summary = await this.loadSummary(userId, conversationId, workspaceId);
    }

    let recentMessages: ContextMessage[] = allMessages;

    // If conversation is long, summarize older turns
    if (allMessages.length > MAX_RECENT_TURNS) {
      const splitIndex = allMessages.length - MAX_RECENT_TURNS;
      const olderMessages = allMessages.slice(0, splitIndex);
      recentMessages = allMessages.slice(splitIndex);

      summary = ContextSummarizer.summarizeTurns(
        olderMessages,
        summary,
        conversationId,
        userId,
        workspaceId
      );

      summaryCache.set(key, summary);
      await this.persistSummary(summary);
    }

    return {
      conversationId,
      workspaceId,
      userId,
      recentMessages,
      summary,
      totalTurnsCount: allMessages.length,
    };
  }

  /**
   * Format historical summary into a high-density directive for Gemini
   */
  public formatSummaryForSystemInstruction(summary?: ConversationSummary): string {
    if (!summary || !summary.summaryText.trim()) return "";

    return `\nPRIOR CONVERSATION CONTEXT & ESTABLISHED DECISIONS:
${summary.summaryText}
[Directive: The user has already covered these topics. Maintain continuity, resolve prior references seamlessly, and do NOT re-explain settled concepts unless the user explicitly requests it.]\n`;
  }

  /**
   * Load summary from Supabase or disk vault
   */
  private async loadSummary(
    userId: string,
    conversationId: string,
    workspaceId?: string
  ): Promise<ConversationSummary | undefined> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        let query = supabase
          .from("conversation_summaries")
          .select("*")
          .eq("user_id", userId)
          .eq("conversation_id", conversationId);

        if (workspaceId) {
          query = query.eq("workspace_id", workspaceId);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          const loaded: ConversationSummary = {
            conversationId: data.conversation_id,
            workspaceId: data.workspace_id,
            userId: data.user_id,
            summaryText: data.summary_text,
            keyTopics: data.key_topics || [],
            activeDecisions: data.active_decisions || [],
            resolvedErrors: data.resolved_errors || [],
            turnsSummarized: data.turns_summarized || 0,
            updatedAt: new Date(data.updated_at).getTime(),
          };
          const key = getContextKey(userId, conversationId, workspaceId);
          summaryCache.set(key, loaded);
          return loaded;
        }
      } catch {
        // Table not present yet; fall back to disk vault
      }
    }

    // Disk vault fallback
    try {
      ensureVaultDir();
      const safeKey = Buffer.from(getContextKey(userId, conversationId, workspaceId)).toString("hex");
      const filePath = path.join(DATA_DIR, `summary_${safeKey}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }

    return undefined;
  }

  /**
   * Persist summary to Supabase and local vault
   */
  private async persistSummary(summary: ConversationSummary): Promise<void> {
    // 1. Supabase persistence
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("conversation_summaries").upsert({
          conversation_id: summary.conversationId,
          workspace_id: summary.workspaceId || null,
          user_id: summary.userId,
          summary_text: summary.summaryText,
          key_topics: summary.keyTopics,
          active_decisions: summary.activeDecisions,
          resolved_errors: summary.resolvedErrors,
          turns_summarized: summary.turnsSummarized,
          updated_at: new Date(summary.updatedAt).toISOString(),
        });
      } catch {
        // ignore
      }
    }

    // 2. Disk vault fallback
    try {
      ensureVaultDir();
      const safeKey = Buffer.from(getContextKey(summary.userId, summary.conversationId, summary.workspaceId)).toString("hex");
      const filePath = path.join(DATA_DIR, `summary_${safeKey}.json`);
      fs.writeFileSync(filePath, JSON.stringify(summary, null, 2), "utf-8");
    } catch {
      // ignore
    }
  }

  /**
   * Clear context summary for a specific conversation
   */
  public clearContext(userId: string, conversationId: string, workspaceId?: string) {
    const key = getContextKey(userId, conversationId, workspaceId);
    summaryCache.delete(key);
  }
}

export const conversationContext = ConversationContextManager.getInstance();

