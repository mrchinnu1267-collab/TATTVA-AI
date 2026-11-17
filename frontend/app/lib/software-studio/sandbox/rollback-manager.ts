/**
 * TATTVA AI - Rollback Manager & Working Tree Safeguard
 * Creates atomic snapshots of files before autonomous agent edits.
 * Automatically restores files if tests or builds fail.
 */

import fs from "fs";
import { validateSafePath } from "./path-guard";

interface FileSnapshot {
  filePath: string;
  originalContent: string | null; // null if file was created new
  timestamp: number;
}

export class RollbackManager {
  private snapshots: Map<string, FileSnapshot[]> = new Map(); // sessionId -> snapshots

  /**
   * Starts a modification session and snapshots the target file.
   */
  public snapshotFile(sessionId: string, filePath: string, workspaceRoot = process.cwd()): boolean {
    const valid = validateSafePath(filePath, workspaceRoot);
    if (!valid.isSafe) return false;

    const exists = fs.existsSync(valid.resolvedPath);
    const content = exists ? fs.readFileSync(valid.resolvedPath, "utf-8") : null;

    const list = this.snapshots.get(sessionId) || [];
    list.push({
      filePath: valid.resolvedPath,
      originalContent: content,
      timestamp: Date.now(),
    });
    this.snapshots.set(sessionId, list);
    return true;
  }

  /**
   * Reverts all file modifications performed in a session.
   */
  public rollbackSession(sessionId: string): { revertedCount: number; errors: string[] } {
    const list = this.snapshots.get(sessionId);
    if (!list || list.length === 0) {
      return { revertedCount: 0, errors: [] };
    }

    let revertedCount = 0;
    const errors: string[] = [];

    // Revert in reverse order
    for (let i = list.length - 1; i >= 0; i--) {
      const snap = list[i];
      try {
        if (snap.originalContent === null) {
          // File was newly created; remove it
          if (fs.existsSync(snap.filePath)) {
            fs.unlinkSync(snap.filePath);
          }
        } else {
          // File previously existed; restore original content
          fs.writeFileSync(snap.filePath, snap.originalContent, "utf-8");
        }
        revertedCount++;
      } catch (err: any) {
        errors.push(`Failed to revert "${snap.filePath}": ${err?.message}`);
      }
    }

    this.snapshots.delete(sessionId);
    return { revertedCount, errors };
  }

  /**
   * Commits the session when verification succeeds, clearing snapshots.
   */
  public commitSession(sessionId: string): void {
    this.snapshots.delete(sessionId);
  }
}

export const GlobalRollbackManager = new RollbackManager();
