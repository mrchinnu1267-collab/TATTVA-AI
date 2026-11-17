/**
 * TATTVA AI - Spaced Repetition Engine (SuperMemo SM-2 Algorithm)
 * Optimizes long-term memory consolidation, card scheduling, and active recall intervals
 */

import * as fs from "fs";
import * as path from "path";
import { SpacedRepetitionCard } from "./types";

const STORAGE_DIR = process.env.TMPDIR || process.env.TEMP || "/tmp/.tattva_learning";

export class SpacedRepetitionEngine {
  private static cardStore: Map<string, SpacedRepetitionCard[]> = new Map();

  private static getStoreKey(userId: string, workspaceId: string): string {
    return `${userId}__${workspaceId}`;
  }

  private static getFilePath(userId: string, workspaceId: string): string {
    return path.join(STORAGE_DIR, `cards_${userId}__${workspaceId}.json`);
  }

  private static ensureStorageDir(): void {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
    } catch {
      // Non-fatal if read-only filesystem
    }
  }

  private static saveToDisk(userId: string, workspaceId: string, cards: SpacedRepetitionCard[]): void {
    try {
      this.ensureStorageDir();
      const filePath = this.getFilePath(userId, workspaceId);
      fs.writeFileSync(filePath, JSON.stringify(cards, null, 2), "utf-8");
    } catch {
      // Non-fatal
    }
  }

  private static loadFromDisk(userId: string, workspaceId: string): SpacedRepetitionCard[] {
    try {
      const filePath = this.getFilePath(userId, workspaceId);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return [];
  }

  /**
   * Retrieves all flashcards for a user & workspace
   */
  public static getCards(userId: string, workspaceId: string): SpacedRepetitionCard[] {
    const key = this.getStoreKey(userId, workspaceId);
    let cards = this.cardStore.get(key);
    if (!cards || cards.length === 0) {
      cards = this.loadFromDisk(userId, workspaceId);
      if (cards && cards.length > 0) {
        this.cardStore.set(key, cards);
      } else {
        cards = [];
        this.cardStore.set(key, cards);
      }
    }
    return cards;
  }

  /**
   * Creates a new flashcard
   */
  public static createCard(
    userId: string,
    workspaceId: string,
    concept: string,
    front: string,
    back: string,
    tags: string[] = []
  ): SpacedRepetitionCard {
    const cards = this.getCards(userId, workspaceId);
    const newCard: SpacedRepetitionCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      workspaceId,
      concept: concept.trim(),
      front: front.trim(),
      back: back.trim(),
      tags,
      repetitions: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString(),
    };

    cards.push(newCard);
    const key = this.getStoreKey(userId, workspaceId);
    this.cardStore.set(key, cards);
    this.saveToDisk(userId, workspaceId, cards);
    return newCard;
  }

  /**
   * Calculates SM-2 updates based on review quality (0 to 5)
   * q = 5: Perfect response
   * q = 4: Correct after hesitation
   * q = 3: Correct with serious difficulty
   * q = 2: Incorrect, but easy to recall upon seeing answer
   * q = 1: Incorrect, remembered upon seeing answer
   * q = 0: Complete blackout
   */
  public static processReview(
    userId: string,
    workspaceId: string,
    cardId: string,
    quality: number // 0 to 5
  ): SpacedRepetitionCard | null {
    const cards = this.getCards(userId, workspaceId);
    const card = cards.find((c) => c.id === cardId);
    if (!card) return null;

    const q = Math.max(0, Math.min(5, Math.round(quality)));

    // SM-2 Ease Factor formula:
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    let newEF = card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (newEF < 1.3) newEF = 1.3;

    let newRepetitions = card.repetitions;
    let newInterval = card.intervalDays;

    if (q >= 3) {
      // Successful recall
      if (newRepetitions === 0) {
        newInterval = 1;
      } else if (newRepetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(newInterval * newEF);
      }
      newRepetitions += 1;
    } else {
      // Failed recall -> reset repetitions to 0 and interval to 1 day
      newRepetitions = 0;
      newInterval = 1;
    }

    const now = new Date();
    const nextDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

    card.repetitions = newRepetitions;
    card.intervalDays = newInterval;
    card.easeFactor = Math.round(newEF * 100) / 100;
    card.lastReviewedDate = now.toISOString();
    card.nextReviewDate = nextDate.toISOString();

    const key = this.getStoreKey(userId, workspaceId);
    this.cardStore.set(key, cards);
    this.saveToDisk(userId, workspaceId, cards);

    return card;
  }

  /**
   * Returns cards due for review today or overdue
   */
  public static getDueCards(userId: string, workspaceId: string): SpacedRepetitionCard[] {
    const cards = this.getCards(userId, workspaceId);
    const now = new Date().toISOString();
    return cards.filter((c) => c.nextReviewDate <= now);
  }
}
