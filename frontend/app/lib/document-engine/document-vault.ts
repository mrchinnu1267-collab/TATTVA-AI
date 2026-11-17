/**
 * TATTVA AI - Tenant-Isolated Document Vault
 * Securely stores, retrieves, and indexes user documents with strict multi-tenant isolation.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { inspectAndReadDocument, ExtractedDocumentContent } from "./reader";
import { classifyDocument, DocumentClassificationResult } from "./document-classifier";
import { extractTabularData, ParsedTable } from "./multi-doc-analyzer";

const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25MB safe limit

const LOCAL_VAULT_BASE =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", ".tattva_document_vault")
    : path.join(process.cwd(), ".tattva_document_vault");

export interface StoredDocumentRecord {
  id: string;
  userId: string;
  workspaceId: string;
  filename: string;
  format: string;
  sizeBytes: number;
  uploadedAt: string;
  extractedText: string;
  classification: DocumentClassificationResult;
  tables: ParsedTable[];
}

// In-memory tenant cache for fast serverless execution
const tenantDocumentStore = new Map<string, Map<string, StoredDocumentRecord>>();

function getUserStore(userId: string): Map<string, StoredDocumentRecord> {
  const safeUser = userId.trim();
  if (!tenantDocumentStore.has(safeUser)) {
    tenantDocumentStore.set(safeUser, new Map());
  }
  return tenantDocumentStore.get(safeUser)!;
}

export class DocumentVault {
  /**
   * Securely saves and extracts an uploaded document for a specific tenant
   */
  public static async ingestDocument(
    userId: string,
    workspaceId: string,
    filename: string,
    buffer: Buffer,
    mimeType: string = "application/octet-stream"
  ): Promise<StoredDocumentRecord> {
    if (!userId) {
      throw new Error("Multi-tenant violation: User ID is required to access document vault.");
    }

    if (buffer.length > MAX_DOCUMENT_SIZE) {
      throw new Error(`Document exceeds maximum safe limit of ${(MAX_DOCUMENT_SIZE / (1024 * 1024)).toFixed(0)}MB.`);
    }

    // Path traversal defense on filename
    const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Read and parse file contents
    const extraction: ExtractedDocumentContent = await inspectAndReadDocument(buffer, safeFilename, mimeType);
    if (!extraction.success && !extraction.extractedText) {
      throw new Error(extraction.error || "Failed to extract readable content from document.");
    }

    const text = extraction.extractedText || "";
    const classification = classifyDocument(text, safeFilename, extraction.format);
    const tables = extractTabularData(text, safeFilename);

    const record: StoredDocumentRecord = {
      id: docId,
      userId,
      workspaceId: workspaceId || "default",
      filename: safeFilename,
      format: extraction.format,
      sizeBytes: buffer.length,
      uploadedAt: new Date().toISOString(),
      extractedText: text,
      classification,
      tables,
    };

    // Store in tenant-isolated map
    const store = getUserStore(userId);
    store.set(docId, record);

    return record;
  }

  /**
   * Retrieves a document ensuring multi-tenant authorization
   */
  public static getDocument(userId: string, documentId: string): StoredDocumentRecord | null {
    if (!userId || !documentId) return null;
    const store = getUserStore(userId);
    return store.get(documentId) || null;
  }

  /**
   * Lists all documents belonging exclusively to the authenticated user
   */
  public static listUserDocuments(userId: string, workspaceId?: string): StoredDocumentRecord[] {
    if (!userId) return [];
    const store = getUserStore(userId);
    const docs = Array.from(store.values());
    if (workspaceId) {
      return docs.filter((d) => d.workspaceId === workspaceId);
    }
    return docs;
  }

  /**
   * Deletes a document ensuring tenant ownership
   */
  public static deleteDocument(userId: string, documentId: string): boolean {
    if (!userId || !documentId) return false;
    const store = getUserStore(userId);
    return store.delete(documentId);
  }
}
