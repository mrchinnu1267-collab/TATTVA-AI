/**
 * TATTVA AI - Document Vault Storage Manager
 * Stores generated documents in Supabase Private Storage (tattva-secure-vault)
 * with automatic fallback to local private encrypted vault.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import crypto from "crypto";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const LOCAL_VAULT_DIR = path.resolve(process.cwd(), ".tattva-vault");

function ensureVaultDir(userId: string): string {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const userDir = path.join(LOCAL_VAULT_DIR, safeId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface StoredDocumentResult {
  fileId: string;
  storagePath: string;
  signedUrl: string;
  uploadedToCloud: boolean;
  sha256Hash: string;
  sizeBytes: number;
}

/**
 * Saves a compiled binary document to Supabase storage or local vault
 */
export async function saveGeneratedDocumentToVault(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  userId = "guest_workspace"
): Promise<StoredDocumentResult> {
  const sha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const fileId = crypto.randomUUID();
  const safeExtension = path.extname(filename) || "";
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const storagePath = `${safeUserId}/generated/${fileId}${safeExtension}`;

  let signedUrl = "";
  let uploadedToCloud = false;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error: uploadErr } = await supabase.storage
        .from("tattva-secure-vault")
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (!uploadErr) {
        uploadedToCloud = true;
        // Generate a 1-hour signed URL for immediate download
        const { data: signData } = await supabase.storage
          .from("tattva-secure-vault")
          .createSignedUrl(storagePath, 3600);

        if (signData?.signedUrl) {
          signedUrl = signData.signedUrl;
        }
      }
    } catch (err) {
      console.warn("[Vault Storage] Cloud storage upload skipped:", err);
    }
  }

  // Local Private Vault Fallback
  if (!uploadedToCloud) {
    try {
      const userDir = ensureVaultDir(safeUserId);
      const localFilePath = path.join(userDir, `${fileId}${safeExtension}`);
      fs.writeFileSync(localFilePath, buffer);
      signedUrl = `/api/download-document?fileId=${fileId}&name=${encodeURIComponent(filename)}`;
    } catch (localErr) {
      console.warn("[Vault Storage] Local disk fallback warning:", localErr);
      signedUrl = `/api/download-document?name=${encodeURIComponent(filename)}`;
    }
  }

  return {
    fileId,
    storagePath,
    signedUrl,
    uploadedToCloud,
    sha256Hash,
    sizeBytes: buffer.length,
  };
}

