/**
 * TATTVA AI - Hybrid Knowledge Retrieval & RAG Engine
 * Semantic chunking, 3072-dim vector embeddings, keyword BM25 scoring, and multi-source synthesis
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import { RAGChunk, RAGSearchResult } from "./types";
import { generateTextEmbedding, cosineSimilarity, keywordRelevanceScore } from "../embeddings";

const DATA_DIR = path.join(process.cwd(), ".tattva_memory_data");
const RAG_STORE_FILE = path.join(DATA_DIR, "rag_knowledge_chunks.json");

function ensureRagDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // ignore
  }
}

export class RAGEngine {
  private static instance: RAGEngine;
  private chunks: RAGChunk[] = [];

  private constructor() {
    this.loadChunks();
  }

  public static getInstance(): RAGEngine {
    if (!RAGEngine.instance) {
      RAGEngine.instance = new RAGEngine();
    }
    return RAGEngine.instance;
  }

  private loadChunks() {
    try {
      ensureRagDir();
      if (fs.existsSync(RAG_STORE_FILE)) {
        const raw = fs.readFileSync(RAG_STORE_FILE, "utf-8");
        this.chunks = JSON.parse(raw);
      }
    } catch {
      this.chunks = [];
    }
  }

  private saveChunks() {
    try {
      ensureRagDir();
      fs.writeFileSync(RAG_STORE_FILE, JSON.stringify(this.chunks, null, 2), "utf-8");
    } catch {
      // ignore
    }
  }

  /**
   * Splits text into overlapping semantic chunks
   */
  public chunkText(text: string, chunkSize: number = 600, overlap: number = 100): string[] {
    const clean = text.trim();
    if (clean.length <= chunkSize) return [clean];

    const result: string[] = [];
    let start = 0;
    while (start < clean.length) {
      let end = start + chunkSize;
      if (end < clean.length) {
        // Break on paragraph or sentence boundary
        const lastBreak = clean.lastIndexOf("\n\n", end);
        const lastPeriod = clean.lastIndexOf(". ", end);
        if (lastBreak > start + 200) {
          end = lastBreak;
        } else if (lastPeriod > start + 200) {
          end = lastPeriod + 1;
        }
      }
      result.push(clean.slice(start, end).trim());
      start = end - overlap;
      if (start >= clean.length) break;
    }
    return result.filter(Boolean);
  }

  /**
   * Ingests a document, creates chunks, computes embeddings, and indexes
   */
  public async ingestDocument(
    documentId: string,
    documentName: string,
    rawText: string,
    metadata?: Record<string, any>
  ): Promise<number> {
    const textChunks = this.chunkText(rawText);
    const newChunks: RAGChunk[] = [];

    for (let i = 0; i < textChunks.length; i++) {
      const chunkText = textChunks[i];
      let embedding: number[] | undefined = undefined;
      try {
        const emb = await generateTextEmbedding(chunkText);
        if (emb) embedding = emb;
      } catch {
        // proceed without embedding; keyword score will still match
      }

      newChunks.push({
        id: `chunk_${documentId}_${i}`,
        documentId,
        documentName,
        content: chunkText,
        chunkIndex: i,
        embedding,
        metadata,
      });
    }

    // Remove old chunks for this document
    this.chunks = this.chunks.filter((c) => c.documentId !== documentId);
    this.chunks.push(...newChunks);
    this.saveChunks();

    return newChunks.length;
  }

  /**
   * Performs hybrid search (cosine vector similarity + keyword relevance)
   */
  public async hybridSearch(
    query: string,
    limit: number = 4,
    filterDocId?: string
  ): Promise<RAGSearchResult> {
    const candidates = filterDocId
      ? this.chunks.filter((c) => c.documentId === filterDocId)
      : this.chunks;

    if (candidates.length === 0) {
      return {
        query,
        matchedChunks: [],
        combinedContext: "",
        sources: [],
      };
    }

    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await generateTextEmbedding(query);
    } catch {
      queryEmbedding = null;
    }

    const scoredChunks: Array<{ chunk: RAGChunk; score: number }> = [];

    for (const chunk of candidates) {
      // 1. Vector similarity (weight: 0.65)
      let vectorScore = 0.5;
      if (queryEmbedding && chunk.embedding) {
        vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
      }

      // 2. Keyword relevance (weight: 0.35)
      const keywordScore = keywordRelevanceScore(query, chunk.content);

      // Hybrid combination
      const combinedScore = vectorScore * 0.65 + keywordScore * 0.35;
      scoredChunks.push({
        chunk: { ...chunk, similarityScore: Number(combinedScore.toFixed(4)) },
        score: combinedScore,
      });
    }

    scoredChunks.sort((a, b) => b.score - a.score);
    const topMatches = scoredChunks.slice(0, limit).map((s) => s.chunk);

    const combinedContext = topMatches
      .map(
        (c, idx) =>
          `[Source ${idx + 1}: ${c.documentName} (Section ${c.chunkIndex + 1})]\n${c.content}`
      )
      .join("\n\n");

    const sources = topMatches.map((c) => ({
      documentName: c.documentName,
      chunkIndex: c.chunkIndex,
      score: c.similarityScore || 0,
    }));

    return {
      query,
      matchedChunks: topMatches,
      combinedContext,
      sources,
    };
  }

  public getStats() {
    const uniqueDocs = new Set(this.chunks.map((c) => c.documentId)).size;
    return {
      totalChunks: this.chunks.length,
      totalDocuments: uniqueDocs,
    };
  }
}

export const ragEngine = RAGEngine.getInstance();
