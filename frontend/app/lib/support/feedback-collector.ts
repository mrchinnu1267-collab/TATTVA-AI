/**
 * TATTVA AI - Feedback & User Satisfaction Analytics (Phase 46)
 * Ingests user ratings, analyzes sentiment, and computes platform quality scores.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { UserFeedbackItem, SentimentType } from "./types";
import { PIIProtector } from "../ai-governance/pii-protector";
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export class FeedbackCollector {
  private static instance: FeedbackCollector;
  private feedbackItems: UserFeedbackItem[] = [];
  private piiProtector: PIIProtector;
  private storageDir: string;
  private storageFile: string;

  private constructor() {
    this.piiProtector = PIIProtector.getInstance();
    this.storageDir = path.join(process.cwd(), ".tattva_support");
    this.storageFile = path.join(this.storageDir, "feedback.json");
    this.loadState().catch(() => {});
  }

  public static getInstance(): FeedbackCollector {
    if (!FeedbackCollector.instance) {
      FeedbackCollector.instance = new FeedbackCollector();
    }
    return FeedbackCollector.instance;
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, "utf-8");
      this.feedbackItems = JSON.parse(data);
    } catch {
      // Memory state fallback
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.writeFile(this.storageFile, JSON.stringify(this.feedbackItems, null, 2), "utf-8");
    } catch {
      // Memory state fallback
    }
  }

  /**
   * Ingests feedback rating with PII scrubbing
   */
  public async submitFeedback(params: {
    userId: string;
    rating: number; // 1 to 5
    category?: string;
    feedbackText?: string;
  }): Promise<UserFeedbackItem> {
    const id = `fb_${crypto.randomBytes(6).toString("hex")}`;
    const clampedRating = Math.max(1, Math.min(5, Math.round(params.rating)));
    const category = params.category || "chat_response";

    let sentiment: SentimentType = "neutral";
    if (clampedRating >= 4) sentiment = "positive";
    else if (clampedRating <= 2) sentiment = "negative";

    const cleanText = params.feedbackText
      ? this.piiProtector.sanitize(params.feedbackText).cleanText
      : "";

    const item: UserFeedbackItem = {
      id,
      userId: params.userId,
      rating: clampedRating,
      category,
      sentiment,
      feedbackText: cleanText,
      createdAt: Date.now(),
    };

    this.feedbackItems.unshift(item);
    await this.saveState();
    return item;
  }

  public listFeedback(limit: number = 50): UserFeedbackItem[] {
    return this.feedbackItems.slice(0, limit);
  }

  public getSatisfactionMetrics(): {
    totalFeedback: number;
    averageRating: number;
    positivePercent: number;
    ratingDistribution: Record<number, number>;
  } {
    if (this.feedbackItems.length === 0) {
      return {
        totalFeedback: 0,
        averageRating: 5.0,
        positivePercent: 100,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalScore = 0;
    let positiveCount = 0;

    for (const item of this.feedbackItems) {
      dist[item.rating] = (dist[item.rating] || 0) + 1;
      totalScore += item.rating;
      if (item.sentiment === "positive") positiveCount++;
    }

    const count = this.feedbackItems.length;
    const avg = Math.round((totalScore / count) * 10) / 10;
    const posPct = Math.round((positiveCount / count) * 100);

    return {
      totalFeedback: count,
      averageRating: avg,
      positivePercent: posPct,
      ratingDistribution: dist,
    };
  }
}
