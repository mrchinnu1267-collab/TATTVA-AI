/**
 * TATTVA AI - Image Editing History & Version Control Manager (Phase H)
 * Manages undo/redo snapshots, version branching, non-destructive image preservation,
 * and Supabase Storage persistence for image revisions and masks.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { EditSnapshot, EditingOperationType } from "./types";
import { createClient } from "@supabase/supabase-js";

const LOCAL_EDITS_DIR = path.resolve(process.cwd(), ".tattva-vault", "edits");
const EDITS_STORAGE_BUCKET = "image-edits";

// In-memory runtime cache
const editHistoryStore = new Map<string, EditSnapshot & { userId: string; workspaceId: string }>();

function ensureDir(userId: string): string {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  try {
    const dir = path.join(LOCAL_EDITS_DIR, safeId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    const tmp = path.join("/tmp", ".tattva-vault", "edits", safeId);
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
    return tmp;
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Saves a new edit snapshot to the version history stack.
 */
export async function saveEditSnapshot(params: {
  parentId?: string;
  operation: EditingOperationType;
  instruction: string;
  imageUrl: string;
  maskUrl?: string;
  unmaskedPreservedPercent: number;
  dimensions: { width: number; height: number };
  isTransparentPng?: boolean;
  userId: string;
  workspaceId: string;
}): Promise<EditSnapshot> {
  const snapshotId = `edit_${crypto.randomUUID().slice(0, 8)}`;
  const timestamp = new Date().toISOString();

  const snapshot: EditSnapshot & { userId: string; workspaceId: string } = {
    id: snapshotId,
    parentId: params.parentId,
    operation: params.operation,
    instruction: params.instruction,
    imageUrl: params.imageUrl,
    maskUrl: params.maskUrl,
    unmaskedPreservedPercent: params.unmaskedPreservedPercent,
    timestamp,
    dimensions: params.dimensions,
    isTransparentPng: params.isTransparentPng,
    userId: params.userId,
    workspaceId: params.workspaceId,
  };

  editHistoryStore.set(snapshotId, snapshot);

  // Attempt async backup to filesystem vault
  try {
    const dir = ensureDir(params.userId);
    const metaFile = path.join(dir, `${snapshotId}.json`);
    fs.writeFileSync(metaFile, JSON.stringify(snapshot, null, 2));
  } catch {
    // Ignore non-fatal local IO error
  }

  return snapshot;
}

/**
 * Retrieves the full edit history for a user or workspace session.
 */
export function getEditHistory(userId: string, workspaceId?: string): EditSnapshot[] {
  const all = Array.from(editHistoryStore.values());
  return all
    .filter((s) => s.userId === userId && (!workspaceId || s.workspaceId === workspaceId))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Retrieves a single snapshot by ID with access verification.
 */
export function getSnapshotById(snapshotId: string, userId: string): EditSnapshot | null {
  const s = editHistoryStore.get(snapshotId);
  if (!s) return null;
  if (s.userId !== userId && s.userId !== "anonymous_user") {
    throw new Error("Access denied: You do not own this image editing revision.");
  }
  return s;
}

/**
 * Clears or deletes an edit snapshot.
 */
export function deleteSnapshot(snapshotId: string, userId: string): boolean {
  const s = editHistoryStore.get(snapshotId);
  if (!s) return false;
  if (s.userId !== userId && s.userId !== "anonymous_user") {
    throw new Error("Access denied: You cannot delete another user's image editing revision.");
  }
  return editHistoryStore.delete(snapshotId);
}

