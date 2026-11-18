/**
 * TATTVA AI - Durable Cloud Chat Persistence & Serverless Data Integrity Engine
 * Provides dual-layer synchronization:
 * 1. Primary: Remote Supabase PostgreSQL persistence (table: cloud_chat_sessions)
 * 2. Fallback / Edge Cache: Cryptographically isolated local file vault
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export interface ChatMessageRecord {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
  modelUsed?: string;
  provider?: string;
  attachments?: any[];
  [key: string]: any;
}

export interface ChatSessionRecord {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  tags?: string[];
  messages: ChatMessageRecord[];
  workspaceId?: string;
  [key: string]: any;
}

export class DurableChatStore {
  private static instance: DurableChatStore;

  private constructor() {}

  public static getInstance(): DurableChatStore {
    if (!DurableChatStore.instance) {
      DurableChatStore.instance = new DurableChatStore();
    }
    return DurableChatStore.instance;
  }

  private getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createSupabaseClient(url, key, { auth: { persistSession: false } });
  }

  private getVaultDir(): string {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return path.join("/tmp", ".tattva_secure_vault", "cloud_chats");
    }
    return path.join(process.cwd(), ".tattva_secure_vault", "cloud_chats");
  }

  private ensureVaultDir() {
    const dir = this.getVaultDir();
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      try {
        const tmpDir = path.join("/tmp", ".tattva_secure_vault", "cloud_chats");
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
      } catch {}
    }
  }

  private getVaultFilePath(userKey: string): string {
    this.ensureVaultDir();
    const safeId = crypto.createHash("sha256").update(userKey.toLowerCase().trim()).digest("hex");
    const primary = path.join(this.getVaultDir(), `chats_${safeId}.json`);
    if (fs.existsSync(primary)) return primary;

    // Check legacy hex path for backward compatibility
    const legacyHex = Buffer.from(userKey.toLowerCase().trim()).toString("hex");
    const legacyPath = path.join(this.getVaultDir(), `chats_${legacyHex}.json`);
    if (fs.existsSync(legacyPath)) return legacyPath;

    const tmpFallback = path.join("/tmp", ".tattva_secure_vault", "cloud_chats", `chats_${safeId}.json`);
    if (fs.existsSync(tmpFallback)) return tmpFallback;

    return primary;
  }

  private readLocalVault(userKey: string): ChatSessionRecord[] {
    try {
      const filePath = this.getVaultFilePath(userKey);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[DurableChatStore] Error reading local vault:", err);
    }
    return [];
  }

  private writeLocalVault(userKey: string, sessions: ChatSessionRecord[]): void {
    try {
      const filePath = this.getVaultFilePath(userKey);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2), "utf-8");
    } catch {
      try {
        const safeId = crypto.createHash("sha256").update(userKey.toLowerCase().trim()).digest("hex");
        const tmpFallback = path.join("/tmp", ".tattva_secure_vault", "cloud_chats", `chats_${safeId}.json`);
        fs.mkdirSync(path.dirname(tmpFallback), { recursive: true });
        fs.writeFileSync(tmpFallback, JSON.stringify(sessions, null, 2), "utf-8");
      } catch (e) {
        console.warn("[DurableChatStore] Error writing local vault fallback:", e);
      }
    }
  }

  /**
   * Load chat sessions for an authenticated user with Supabase -> Local Vault fallback
   */
  public async loadUserSessions(userKey: string): Promise<ChatSessionRecord[]> {
    const normKey = userKey.toLowerCase().trim();
    const localSessions = this.readLocalVault(normKey);

    const supabase = this.getSupabase();
    if (!supabase) {
      return localSessions;
    }

    try {
      const { data, error } = await supabase
        .from("cloud_chat_sessions")
        .select("sessions_payload, updated_at")
        .eq("user_identifier", normKey)
        .maybeSingle();

      if (!error && data?.sessions_payload) {
        let remoteSessions: ChatSessionRecord[] = [];
        if (Array.isArray(data.sessions_payload)) {
          remoteSessions = data.sessions_payload;
        } else if (typeof data.sessions_payload === "string") {
          remoteSessions = JSON.parse(data.sessions_payload);
        }

        if (Array.isArray(remoteSessions)) {
          // If remote exists and has newer or equal sessions, update local cache
          if (remoteSessions.length >= localSessions.length) {
            this.writeLocalVault(normKey, remoteSessions);
            return remoteSessions;
          } else {
            // Local has newer sessions, sync local to remote
            await this.syncRemoteDatabase(normKey, localSessions);
            return localSessions;
          }
        }
      }
    } catch (dbErr) {
      // Table missing or network failure; safely fall back to local vault
      console.warn("[DurableChatStore] Supabase read fallback:", (dbErr as Error).message);
    }

    return localSessions;
  }

  /**
   * Save and synchronize user sessions across local vault and Supabase PostgreSQL
   */
  public async saveUserSessions(userKey: string, sessions: ChatSessionRecord[]): Promise<boolean> {
    const normKey = userKey.toLowerCase().trim();

    // 1. Always update local vault first for low-latency guarantee
    this.writeLocalVault(normKey, sessions);

    // 2. Synchronize to Supabase PostgreSQL if available
    return await this.syncRemoteDatabase(normKey, sessions);
  }

  private async syncRemoteDatabase(userKey: string, sessions: ChatSessionRecord[]): Promise<boolean> {
    const supabase = this.getSupabase();
    if (!supabase) return true;

    try {
      const payload = JSON.stringify(sessions);
      const { error } = await supabase
        .from("cloud_chat_sessions")
        .upsert(
          {
            user_identifier: userKey,
            sessions_payload: payload,
            sessions_count: sessions.length,
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_identifier" }
        );

      if (error) {
        console.warn("[DurableChatStore] Supabase upsert notice:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[DurableChatStore] Supabase sync exception:", (err as Error).message);
      return false;
    }
  }

  /**
   * Delete a specific session or clear all sessions for a user
   */
  public async deleteUserSessions(userKey: string, sessionId?: string): Promise<{ success: boolean; remainingCount: number }> {
    const normKey = userKey.toLowerCase().trim();
    const currentSessions = await this.loadUserSessions(normKey);

    let updatedSessions: ChatSessionRecord[] = [];
    if (sessionId) {
      updatedSessions = currentSessions.filter((s) => s.id !== sessionId);
    } else {
      updatedSessions = [];
    }

    await this.saveUserSessions(normKey, updatedSessions);

    if (!sessionId) {
      try {
        const filePath = this.getVaultFilePath(normKey);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {}

      const supabase = this.getSupabase();
      if (supabase) {
        try {
          await supabase.from("cloud_chat_sessions").delete().eq("user_identifier", normKey);
        } catch {}
      }
    }

    return {
      success: true,
      remainingCount: updatedSessions.length
    };
  }

  /**
   * Patch an existing session's title, pinned status, or tags
   */
  public async patchSession(
    userKey: string,
    sessionId: string,
    updates: { title?: string; pinned?: boolean; tags?: string[] }
  ): Promise<ChatSessionRecord | null> {
    const normKey = userKey.toLowerCase().trim();
    const sessions = await this.loadUserSessions(normKey);
    const targetIdx = sessions.findIndex((s) => s.id === sessionId);

    if (targetIdx === -1) {
      return null;
    }

    if (typeof updates.title === "string" && updates.title.trim()) {
      sessions[targetIdx].title = updates.title.trim().slice(0, 100);
    }
    if (typeof updates.pinned === "boolean") {
      sessions[targetIdx].pinned = updates.pinned;
    }
    if (Array.isArray(updates.tags)) {
      sessions[targetIdx].tags = updates.tags.slice(0, 10);
    }

    sessions[targetIdx].updatedAt = Date.now();

    await this.saveUserSessions(normKey, sessions);
    return sessions[targetIdx];
  }
}

export const durableChatStore = DurableChatStore.getInstance();
