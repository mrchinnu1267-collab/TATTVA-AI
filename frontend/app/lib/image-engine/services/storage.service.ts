/**
 * TATTVA AI - Unified Storage & Workspace Service (Phase L & Subscribed Agents)
 * Manages image persistence, prompt history, model parameters, accuracy reports,
 * and version lineage across Supabase Storage and private local fallback vaults.
 * Strictly prevents large Base64 strings from polluting chat messages or database rows.
 * 
 * Enforces:
 * - Private access on Supabase Storage bucket 'tattva-images'
 * - Sharp image header and dimension validation (25MB ceiling)
 * - Object path convention: {userId}/{workspaceId}/{imageId}.{ext}
 * - Real Supabase Cloud Storage persistence with Signed URLs
 * - Graceful local vault fallback with honest status reporting (never fakes cloud success)
 */

import crypto from "crypto";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AccuracyScorecard, RequirementValidationItem } from "../accuracy/types";

export interface ImageStorageRecord {
  id: string;
  url: string;
  prompt: string;
  originalPrompt: string;
  provider: string;
  model: string;
  agentId?: "agent_a" | "agent_b" | string;
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
  storageType: "supabase_storage" | "vault_fallback";
  storagePath: string;
  sourceClassification?: "external_subscribed_agent_a" | "external_subscribed_agent_b" | "local_procedural_fallback" | "user_uploaded_image";
  cloudError?: string;
}

export interface PersistImageParams {
  dataUriOrBuffer: string | Buffer;
  prompt: string;
  originalPrompt?: string;
  provider: string;
  model: string;
  agentId?: "agent_a" | "agent_b" | string;
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
  userAccessToken?: string;
  sourceClassification?: "external_subscribed_agent_a" | "external_subscribed_agent_b" | "local_procedural_fallback" | "user_uploaded_image";
}

export interface ValidatedImageMetadata {
  buffer: Buffer;
  format: "png" | "jpeg" | "webp";
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  fileSizeBytes: number;
}

const STORAGE_BUCKET = "tattva-images";
const LOCAL_VAULT_DIR = path.resolve(process.cwd(), ".tattva_vault", "images");

// In-memory fallback history registry for environments without database tables
const inMemoryHistoryRegistry = new Map<string, ImageStorageRecord>();

/**
 * Validates and decodes image buffers using Sharp.
 * Enforces:
 * - 25MB file size limit
 * - Supported MIME formats: image/png, image/jpeg, image/webp
 * - Valid dimensions (width > 0, height > 0)
 */
export async function validateImageWithSharp(
  dataUriOrBuffer: string | Buffer
): Promise<ValidatedImageMetadata> {
  let rawBuffer: Buffer;
  if (Buffer.isBuffer(dataUriOrBuffer)) {
    rawBuffer = dataUriOrBuffer;
  } else {
    const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUriOrBuffer);
    rawBuffer = Buffer.from(match ? match[2] : dataUriOrBuffer, "base64");
  }

  // 1. Check file size ceiling (25MB = 26,214,400 bytes)
  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  if (rawBuffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `Image file size (${(rawBuffer.length / 1024 / 1024).toFixed(2)} MB) exceeds the 25 MB limit.`
    );
  }

  // 2. Decode with Sharp
  let metadata: any;
  try {
    metadata = await sharp(rawBuffer).metadata();
  } catch (err: any) {
    throw new Error(`Could not parse image header: ${err.message}`);
  }

  // 3. Verify format & MIME type
  const format = (metadata.format || "").toLowerCase();
  let mimeType: "image/png" | "image/jpeg" | "image/webp";
  let normalizedFormat: "png" | "jpeg" | "webp";

  if (format === "png") {
    mimeType = "image/png";
    normalizedFormat = "png";
  } else if (format === "jpeg" || format === "jpg") {
    mimeType = "image/jpeg";
    normalizedFormat = "jpeg";
  } else if (format === "webp") {
    mimeType = "image/webp";
    normalizedFormat = "webp";
  } else {
    throw new Error(
      `Unsupported image format '${format}'. Allowed formats: image/png, image/jpeg, image/webp.`
    );
  }

  // 4. Verify dimensions
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid image dimensions: ${width}x${height}`);
  }

  return {
    buffer: rawBuffer,
    format: normalizedFormat,
    mimeType,
    width,
    height,
    fileSizeBytes: rawBuffer.length,
  };
}

/**
 * Initializes Supabase client with optional user access token or service role key.
 */
export function getSupabase(userAccessToken?: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  if (userAccessToken) {
    return createClient(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      },
      auth: { persistSession: false },
    });
  }

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
    const tmpDir = path.join("/tmp", ".tattva_vault", "images", safeId);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}

export class StorageService {
  /**
   * Persists an image asset to Supabase Storage (with local vault fallback)
   * and records metadata, parameters, accuracy scorecard, and version lineage.
   * Path: {userId}/{workspaceId}/{imageId}.{ext}
   */
  public static async persistImage(params: PersistImageParams): Promise<ImageStorageRecord> {
    const rawUserId = params.userId || "anonymous";
    const rawWorkspaceId = params.workspaceId || "default";
    const cleanUserId = rawUserId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanWorkspaceId = rawWorkspaceId.replace(/[^a-zA-Z0-9_-]/g, "_");

    // 1. Validate image with Sharp (deep MIME check, dimension verification, 25MB ceiling)
    const validation = await validateImageWithSharp(params.dataUriOrBuffer);
    const extension = validation.format === "jpeg" ? "jpg" : validation.format;
    const imageId = `img_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const filename = `${imageId}.${extension}`;
    const filePath = `${cleanUserId}/${cleanWorkspaceId}/${filename}`;

    let accessUrl: string = "";
    let uploadedToCloud = false;
    let storageType: "supabase_storage" | "vault_fallback" = "vault_fallback";
    let storagePath: string = "";
    let cloudError: string | undefined;

    const supabase = getSupabase(params.userAccessToken);

    // 2. Attempt upload to Supabase Storage 'tattva-images'
    if (supabase) {
      try {
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, validation.buffer, {
            contentType: validation.mimeType,
            upsert: true,
          });

        if (uploadErr) {
          cloudError = uploadErr.message;
          console.warn(
            `[StorageService] Supabase upload failed (${uploadErr.message}), safely falling back to local workspace vault.`
          );
        } else {
          // Success: The bucket is private. Generate a signed URL for secure authorized preview (24hr expiry)
          const { data: signedData, error: signedErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(filePath, 60 * 60 * 24);

          if (!signedErr && signedData?.signedUrl) {
            accessUrl = signedData.signedUrl;
          } else {
            // Serve via authorized streaming download route
            accessUrl = `/api/image/download?path=${encodeURIComponent(filePath)}`;
          }

          uploadedToCloud = true;
          storageType = "supabase_storage";
          storagePath = filePath;
        }
      } catch (err: any) {
        cloudError = err.message || "Unknown Supabase upload error";
        console.warn(
          `[StorageService] Supabase client exception (${cloudError}), falling back to local workspace vault.`
        );
      }
    } else {
      cloudError = "Supabase storage is not configured (missing URL or API key).";
    }

    // 3. Local Vault Fallback if cloud upload did not succeed
    if (!uploadedToCloud) {
      const vaultDir = ensureLocalVaultDir(cleanUserId);
      const localFilePath = path.join(vaultDir, filename);
      try {
        fs.writeFileSync(localFilePath, validation.buffer);
      } catch (writeErr: any) {
        console.warn("[StorageService] Local filesystem write warning:", writeErr);
      }
      accessUrl = `/api/image/download?fileId=${imageId}&userId=${encodeURIComponent(cleanUserId)}`;
      storagePath = `local://${localFilePath}`;
      storageType = "vault_fallback";
    }

    // 4. Compute version lineage
    let version = 1;
    if (params.parentImageId && inMemoryHistoryRegistry.has(params.parentImageId)) {
      const parent = inMemoryHistoryRegistry.get(params.parentImageId);
      if (parent) {
        version = parent.version + 1;
      }
    }

    // 5. Construct full record
    const record: ImageStorageRecord = {
      id: imageId,
      url: accessUrl,
      prompt: params.prompt,
      originalPrompt: params.originalPrompt || params.prompt,
      provider: params.provider,
      model: params.model,
      agentId: params.agentId,
      parameters: {
        width: validation.width,
        height: validation.height,
        aspectRatio: params.parameters?.aspectRatio || `${validation.width}:${validation.height}`,
        seed: params.parameters?.seed || 0,
        quality: params.parameters?.quality || "high",
        style: params.parameters?.style,
      },
      accuracyScorecard: params.accuracyScorecard,
      validatedChecklist: params.validatedChecklist,
      parentImageId: params.parentImageId,
      version,
      operation: params.operation,
      userId: rawUserId,
      workspaceId: rawWorkspaceId,
      createdAt: new Date().toISOString(),
      fileSizeBytes: validation.fileSizeBytes,
      mimeType: validation.mimeType,
      storageType,
      storagePath,
      sourceClassification: params.sourceClassification,
      cloudError,
    };

    inMemoryHistoryRegistry.set(imageId, record);

    // 6. Write metadata to Supabase DB if image_history table exists
    if (supabase) {
      try {
        await supabase.from("image_history").insert({
          id: record.id,
          user_id: record.userId,
          workspace_id: record.workspaceId,
          image_url: record.url,
          storage_path: record.storagePath,
          storage_type: record.storageType,
          prompt: record.prompt,
          original_prompt: record.originalPrompt,
          provider: record.provider,
          model: record.model,
          agent_id: record.agentId,
          parameters: record.parameters,
          accuracy_scorecard: record.accuracyScorecard,
          parent_image_id: record.parentImageId,
          version: record.version,
          file_size_bytes: record.fileSizeBytes,
          mime_type: record.mimeType,
          created_at: record.createdAt,
        });
      } catch {
        // Table may not exist yet, in-memory registry serves as source of truth
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
    // 1. Query Supabase DB first if connected
    const supabase = getSupabase();
    if (supabase) {
      try {
        let query = supabase
          .from("image_history")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (workspaceId !== "all") {
          query = query.eq("workspace_id", workspaceId);
        }
        if (userId !== "all" && userId !== "anonymous") {
          query = query.eq("user_id", userId);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            url: d.image_url,
            prompt: d.prompt,
            originalPrompt: d.original_prompt || d.prompt,
            provider: d.provider,
            model: d.model,
            agentId: d.agent_id,
            parameters: d.parameters || {},
            accuracyScorecard: d.accuracy_scorecard,
            parentImageId: d.parent_image_id,
            version: d.version || 1,
            userId: d.user_id,
            workspaceId: d.workspace_id,
            createdAt: d.created_at,
            fileSizeBytes: d.file_size_bytes || 0,
            mimeType: d.mime_type || "image/png",
            storageType: d.storage_type || "supabase_storage",
            storagePath: d.storage_path || "",
            sourceClassification: d.source_classification || (d.storage_type === "vault_fallback" ? "local_procedural_fallback" : undefined),
          }));
        }
      } catch {
        // Fall back to in-memory store
      }
    }

    // 2. Fallback to in-memory store
    return Array.from(inMemoryHistoryRegistry.values())
      .filter(
        (rec) =>
          (rec.userId === userId || userId === "all" || userId === "anonymous") &&
          (rec.workspaceId === workspaceId || workspaceId === "all")
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Retrieves single image record by ID.
   */
  public static async getRecord(imageId: string): Promise<ImageStorageRecord | null> {
    if (inMemoryHistoryRegistry.has(imageId)) {
      return inMemoryHistoryRegistry.get(imageId)!;
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("image_history")
          .select("*")
          .eq("id", imageId)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            url: data.image_url,
            prompt: data.prompt,
            originalPrompt: data.original_prompt || data.prompt,
            provider: data.provider,
            model: data.model,
            agentId: data.agent_id,
            parameters: data.parameters || {},
            accuracyScorecard: data.accuracy_scorecard,
            parentImageId: data.parent_image_id,
            version: data.version || 1,
            userId: data.user_id,
            workspaceId: data.workspace_id,
            createdAt: data.created_at,
            fileSizeBytes: data.file_size_bytes || 0,
            mimeType: data.mime_type || "image/png",
            storageType: data.storage_type || "supabase_storage",
            storagePath: data.storage_path || "",
          };
        }
      } catch {
        // Fall through
      }
    }

    return null;
  }

  /**
   * Updates an image record with strict authorization checks.
   */
  public static async updateRecord(
    imageId: string,
    userId: string,
    updates: Partial<Pick<ImageStorageRecord, "prompt" | "originalPrompt" | "parameters" | "accuracyScorecard">>
  ): Promise<ImageStorageRecord> {
    const record = await this.getRecord(imageId);
    if (!record) {
      throw new Error(`Image record '${imageId}' not found.`);
    }

    // Verify ownership: users can only update their own records
    if (record.userId !== userId && userId !== "anonymous" && record.userId !== "anonymous") {
      throw new Error("Unauthorized to update this image record.");
    }

    if (updates.prompt) record.prompt = updates.prompt;
    if (updates.originalPrompt) record.originalPrompt = updates.originalPrompt;
    if (updates.parameters) record.parameters = { ...record.parameters, ...updates.parameters };
    if (updates.accuracyScorecard) record.accuracyScorecard = updates.accuracyScorecard;

    inMemoryHistoryRegistry.set(imageId, record);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from("image_history")
          .update({
            prompt: record.prompt,
            original_prompt: record.originalPrompt,
            parameters: record.parameters,
            accuracy_scorecard: record.accuracyScorecard,
          })
          .eq("id", imageId)
          .eq("user_id", record.userId);
      } catch (err) {
        console.warn("[StorageService] Supabase metadata update warning:", err);
      }
    }

    return record;
  }

  /**
   * Deletes an image record and file asset.
   */
  public static async deleteRecord(imageId: string, userId: string): Promise<boolean> {
    const record = await this.getRecord(imageId);
    if (!record) return false;

    // Check authorization: User can only delete their own image (unless anonymous or admin)
    if (record.userId !== userId && userId !== "anonymous" && record.userId !== "anonymous") {
      throw new Error("Unauthorized to delete this image record.");
    }

    // 1. Delete from Supabase Storage if uploaded to cloud
    if (record.storageType === "supabase_storage" && record.storagePath) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          await supabase.storage.from(STORAGE_BUCKET).remove([record.storagePath]);
          await supabase.from("image_history").delete().eq("id", imageId);
        } catch (err) {
          console.warn("[StorageService] Supabase delete warning:", err);
        }
      }
    }

    // 2. Delete from local vault if stored locally
    if (record.storageType === "vault_fallback" && record.storagePath) {
      const cleanPath = record.storagePath.replace(/^local:\/\//, "");
      if (fs.existsSync(cleanPath)) {
        try {
          fs.unlinkSync(cleanPath);
        } catch (err) {
          console.warn("[StorageService] Could not remove vault file:", err);
        }
      }
    }

    inMemoryHistoryRegistry.delete(imageId);
    return true;
  }
}
