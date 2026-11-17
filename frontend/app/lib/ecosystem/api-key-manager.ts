/**
 * TATTVA AI - Developer API Key Manager & Scoped Auth Middleware
 * Cryptographic SHA-256 key hashing, scope authorization, rate limiting, and quota enforcement.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import * as crypto from "node:crypto";
import { DeveloperApiKey, ApiKeyScope } from "./types";
import { checkRateLimit } from "../security";

// In-memory API key store (keyed by hashedKey)
const apiKeyStoreByHash = new Map<string, DeveloperApiKey>();
const userApiKeys = new Map<string, Set<string>>(); // userId -> Set of key IDs

function hashKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey.trim()).digest("hex");
}

export class ApiKeyManager {
  /**
   * Generates a new cryptographically secure scoped API key
   * Returns { apiKey: DeveloperApiKey, rawSecret: string }
   */
  public static generateApiKey(
    userId: string,
    workspaceId: string,
    name: string,
    scopes: ApiKeyScope[] = ["chat:write", "research:read", "documents:write", "tasks:write"],
    rateLimitPerMinute: number = 60,
    monthlyQuota: number = 10000
  ): { apiKey: DeveloperApiKey; rawSecret: string } {
    if (!userId) throw new Error("User ID is required to generate API key.");

    const entropy = crypto.randomBytes(24).toString("hex");
    const rawSecret = `tattva_live_${entropy}`;
    const hashedKey = hashKey(rawSecret);
    const keyPrefix = rawSecret.slice(0, 16);
    const keyId = `key_${Date.now()}_${entropy.slice(0, 6)}`;

    const apiKey: DeveloperApiKey = {
      id: keyId,
      userId,
      workspaceId: workspaceId || "default",
      name: name || "Default API Key",
      keyPrefix,
      hashedKey,
      scopes,
      rateLimitPerMinute,
      monthlyQuota,
      currentMonthUsage: 0,
      createdAt: new Date().toISOString(),
      status: "active",
    };

    apiKeyStoreByHash.set(hashedKey, apiKey);

    if (!userApiKeys.has(userId)) {
      userApiKeys.set(userId, new Set());
    }
    userApiKeys.get(userId)!.add(keyId);

    return { apiKey, rawSecret };
  }

  /**
   * Verifies an incoming API key string, validates scope, and enforces rate limit
   */
  public static authenticateApiKey(
    rawKey: string,
    requiredScope?: ApiKeyScope
  ): { valid: boolean; apiKey?: DeveloperApiKey; error?: string; status: number } {
    if (!rawKey || !rawKey.startsWith("tattva_live_")) {
      return { valid: false, error: "Invalid or missing TATTVA API key. Format must be 'tattva_live_...'", status: 401 };
    }

    const hashed = hashKey(rawKey);
    const keyRecord = apiKeyStoreByHash.get(hashed);

    if (!keyRecord || keyRecord.status !== "active") {
      return { valid: false, error: "Unauthorized: Invalid or revoked API key.", status: 401 };
    }

    // Check Scope
    if (requiredScope && !keyRecord.scopes.includes(requiredScope) && !keyRecord.scopes.includes("admin")) {
      return {
        valid: false,
        error: `Forbidden: API key lacks required scope "${requiredScope}". Available scopes: [${keyRecord.scopes.join(", ")}]`,
        status: 403,
      };
    }

    // Check Quota
    if (keyRecord.currentMonthUsage >= keyRecord.monthlyQuota) {
      return {
        valid: false,
        error: `Quota exceeded: Monthly limit of ${keyRecord.monthlyQuota} requests reached.`,
        status: 429,
      };
    }

    // Check Rate Limit
    const rate = checkRateLimit(`apikey_${keyRecord.id}`, keyRecord.rateLimitPerMinute, 60000);
    if (!rate.allowed) {
      return {
        valid: false,
        error: `Rate limit exceeded. Maximum ${keyRecord.rateLimitPerMinute} requests per minute.`,
        status: 429,
      };
    }

    // Record usage
    keyRecord.currentMonthUsage++;
    keyRecord.lastUsedAt = new Date().toISOString();

    return { valid: true, apiKey: keyRecord, status: 200 };
  }

  /**
   * Lists all API keys for a user (secrets scrubbed)
   */
  public static listUserKeys(userId: string): DeveloperApiKey[] {
    const keyIds = userApiKeys.get(userId);
    if (!keyIds) return [];

    const keys: DeveloperApiKey[] = [];
    for (const key of apiKeyStoreByHash.values()) {
      if (key.userId === userId) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Revokes an API key
   */
  public static revokeApiKey(userId: string, keyId: string): boolean {
    for (const [hashed, key] of apiKeyStoreByHash.entries()) {
      if (key.id === keyId && key.userId === userId) {
        key.status = "revoked";
        return true;
      }
    }
    return false;
  }
}
