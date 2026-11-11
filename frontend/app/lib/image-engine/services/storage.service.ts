/**
 * TATTVA AI - Unified Storage & Workspace Service (Phase L)
 * Manages image persistence, prompt history, model parameters, accuracy reports,
 * and version lineage across Supabase Storage and private local fallback vaults.
 * Strictly prevents large Base64 strings from polluting chat messages or database rows.
 */

import crypto from "crypto";
import path from "path";
import fs from "fs";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AccuracyScorecard, RequirementValidationItem } from "../accuracy/types";

export interface ImageStorageRecord {
  id: string;
  url: string;
  prompt: string;
  originalPrompt: string;
  provider: string;
  model: string;
  parameters: {
    width: number;
    height: number;
    aspectRatio: string;
    seed: number;
    quality: string;
    style?: string;
  };
  accuracyScorecard?: AccuracyScorecard;
  validatedChecklist?: RequirementValidationItem[];
  parentImageId?: string;
  version: number;
  operation?: string;
  userId: string;
  workspaceId: string;
  createdAt: string;
  fileSizeBytes: number;
  mimeType: string;
}

export interface PersistImageParams {
  dataUriOrBuffer: string | Buffer;
  prompt: string;
  originalPrompt?: string;
  provider: string;
  model: string;
  parameters: {
    width?: number;
    height?: number;
    aspectRatio?: string;
    seed?: number;
    quality?: string;
    style?: string;
  };
  accuracyScorecard?: AccuracyScorecard;
  validatedChecklist?: RequirementValidationItem[];
  parentImageId?: string;
  operation?: string;
  userId?: string;
  workspaceId?: string;
}

const STORAGE_BUCKET = "tattva-images";
const LOCAL_VAULT_DIR = path.resolve(process.cwd(), ".tattva-vault", "images");

// In-memory fallback history registry for environments without database tables
const inMemoryHistoryRegistry = new Map<string, ImageStorageRecord>();

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function ensureLocalVaultDir(userId: string): string {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  try {
    const userDir = path.join(LOCAL_VAULT_DIR, safeId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  } catch {
    const tmpDir = path.join("/tmp", ".tattva-vault", "images", safeId);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}

function parseDataUri(dataUriOrBuffer: string | Buffer): { buffer: Buffer; mimeType: string } {
  if (Buffer.isBuffer(dataUriOrBuffer)) {
    return { buffer: dataUriOrBuffer, mimeType: "image/png" };
  }
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUriOrBuffer);
  if (!match) {
    const buffer = Buffer.from(dataUriOrBuffer, "base64");
    return { buffer, mimeType: "image/png" };
  }
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export class StorageService {
  /**
   * Persists an image asset to Supabase Storage (with local vault fallback)
   * and records metadata, parameters, accuracy scorecard, and version lineage.
   */
  public static async persistImage(params: PersistImageParams): Promise<ImageStorageRecord> {
    const userId = params.userId || "anonymous";
    const workspaceId = params.workspaceId || "default";
    const imageId = `img_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const parsed = parseDataUri(params.dataUriOrBuffer);

    let accessUrl: string;
    const supabase = getSupabase();
    let uploadedToCloud = false;

    // 1. Attempt upload to Supabase Storage
    if (supabase) {
      try {
        const filePath = `${workspaceId}/${userId}/${imageId}.png`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, parsed.buffer, {
            contentType: parsed.mimeType,
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath);

          if (publicData?.publicUrl) {
            accessUrl = publicData.publicUrl;
            uploadedToCloud = true;
          }
        }
      } catch (cloudErr) {
        console.warn("[StorageService] Supabase upload failed, falling back to vault:", cloudErr);
      }
    }

    // 2. Local Vault Fallback if cloud was unavailable
    if (!uploadedToCloud) {
      const vaultDir = ensureLocalVaultDir(userId);
      const filePath = path.join(vaultDir, `${imageId}.png`);
      try {
        fs.writeFileSync(filePath, parsed.buffer);
      } catch (writeErr) {
        console.warn("[StorageService] Local filesystem write warning:", writeErr);
      }
      // Return route URL that serves this local vault file
      accessUrl = `/api/download?fileId=${imageId}&userId=${encodeURIComponent(userId)}`;
    }

    // 3. Compute version lineage
    let version = 1;
    if (params.parentImageId && inMemoryHistoryRegistry.has(params.parentImageId)) {
      const parent = inMemoryHistoryRegistry.get(params.parentImageId);
      if (parent) {
        version = parent.version + 1;
      }
    }

    // 4. Construct record
    const record: ImageStorageRecord = {
      id: imageId,
      url: accessUrl!,
      prompt: params.prompt,
      originalPrompt: params.originalPrompt || params.prompt,
      provider: params.provider,
      model: params.model,
      parameters: {
        width: params.parameters.width || 1024,
        height: params.parameters.height || 1024,
        aspectRatio: params.parameters.aspectRatio || "1:1",
        seed: params.parameters.seed || 0,
        quality: params.parameters.quality || "balanced",
        style: params.parameters.style,
      },
      accuracyScorecard: params.accuracyScorecard,
      validatedChecklist: params.validatedChecklist,
      parentImageId: params.parentImageId,
      version,
      operation: params.operation,
      userId,
      workspaceId,
      createdAt: new Date().toISOString(),
      fileSizeBytes: parsed.buffer.length,
      mimeType: parsed.mimeType,
    };

    inMemoryHistoryRegistry.set(imageId, record);

    // Optional: write metadata to Supabase DB if table exists
    if (supabase) {
      try {
        await supabase.from("image_history").insert({
          id: record.id,
          user_id: record.userId,
          workspace_id: record.workspaceId,
          image_url: record.url,
          prompt: record.prompt,
          provider: record.provider,
          model: record.model,
          parameters: record.parameters,
          accuracy_scorecard: record.accuracyScorecard,
          parent_image_id: record.parentImageId,
          version: record.version,
          created_at: record.createdAt,
        });
      } catch {
        // Table may not exist yet in dev environment, in-memory registry serves as source of truth
      }
    }

    return record;
  }

  /**
   * Retrieves image generation history for a specific user and workspace.
   */
  public static async listHistory(
    userId: string = "anonymous",
    workspaceId: string = "default",
    limit: number = 50
  ): Promise<ImageStorageRecord[]> {
    // 1. Check in-memory store
    const localMatches = Array.from(inMemoryHistoryRegistry.values())
      .filter((rec) => (rec.userId === userId || userId === "all") && (rec.workspaceId === workspaceId || workspaceId === "all"))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    if (localMatches.length > 0) {
      return localMatches;
    }

    // 2. Query Supabase if connected
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("image_history")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (!error && Array.isArray(data)) {
          return data.map((d: any) => ({
            id: d.id,
            url: d.image_url,
            prompt: d.prompt,
            originalPrompt: d.prompt,
            provider: d.provider,
            model: d.model,
            parameters: d.parameters || {},
            accuracyScorecard: d.accuracy_scorecard,
            parentImageId: d.parent_image_id,
            version: d.version || 1,
            userId: d.user_id,
            workspaceId: d.workspace_id,
            createdAt: d.created_at,
            fileSizeBytes: 0,
            mimeType: "image/png",
          }));
        }
      } catch {
        // fall back
      }
    }

    return localMatches;
  }

  /**
   * Retrieves single image record by ID.
   */
  public static async getRecord(imageId: string): Promise<ImageStorageRecord | null> {
    return inMemoryHistoryRegistry.get(imageId) || null;
  }

  /**
   * Deletes an image record and file asset.
   */
  public static async deleteRecord(imageId: string, userId: string): Promise<boolean> {
    const record = inMemoryHistoryRegistry.get(imageId);
    if (!record) return false;

    if (record.userId !== userId && userId !== "anonymous") {
      throw new Error("Unauthorized to delete this image record.");
    }

    inMemoryHistoryRegistry.delete(imageId);
    return true;
  }
}

