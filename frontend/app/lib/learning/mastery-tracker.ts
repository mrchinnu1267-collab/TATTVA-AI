/**
 * TATTVA AI - Concept Mastery & Retention Tracking Engine
 * Tracks cognitive retention decay curves and concept mastery across learning sessions
 */

import {
  SubjectDomain,
  LearnerMasteryProfile,
  ConceptMasteryRecord,
} from "./types";

export class MasteryTracker {
  private static profileStore: Map<string, LearnerMasteryProfile> = new Map();

  private static getStoreKey(userId: string, workspaceId: string): string {
    return `${userId}__${workspaceId}`;
  }

  public static getProfile(
    userId: string,
    workspaceId: string,
    domain: SubjectDomain = "computer_science"
  ): LearnerMasteryProfile {
    const key = this.getStoreKey(userId, workspaceId);
    let profile = this.profileStore.get(key);
    if (!profile) {
      profile = {
        userId,
        workspaceId,
        domain,
        overallMasteryPercentage: 0,
        concepts: {},
        updatedAt: new Date().toISOString(),
      };
      this.profileStore.set(key, profile);
    }
    this.applyRetentionDecay(profile);
    return profile;
  }

  /**
   * Applies Ebbinghaus forgetting curve retention decay: R = e^(-t / S)
   */
  private static applyRetentionDecay(profile: LearnerMasteryProfile): void {
    const now = Date.now();
    for (const concept of Object.keys(profile.concepts)) {
      const rec = profile.concepts[concept];
      const elapsedDays = Math.max(0, (now - new Date(rec.lastEvaluated).getTime()) / (1000 * 60 * 60 * 24));
      
      // Stability factor S increases with consecutive correct answers
      const stabilityDays = Math.max(2, rec.consecutiveCorrect * 3);
      const retentionFraction = Math.exp(-elapsedDays / stabilityDays);
      rec.retentionPercentage = Math.round(Math.max(10, Math.min(100, rec.score * retentionFraction)));
    }
    this.recomputeOverallMastery(profile);
  }

  /**
   * Updates mastery score for a concept based on quiz performance or review
   */
  public static recordEvaluation(
    userId: string,
    workspaceId: string,
    concept: string,
    domain: SubjectDomain,
    isCorrect: boolean
  ): ConceptMasteryRecord {
    const profile = this.getProfile(userId, workspaceId, domain);
    let record = profile.concepts[concept];

    const now = new Date().toISOString();

    if (!record) {
      record = {
        concept,
        domain,
        score: isCorrect ? 40 : 15,
        retentionPercentage: isCorrect ? 40 : 15,
        totalQuizzesTaken: 1,
        consecutiveCorrect: isCorrect ? 1 : 0,
        lastEvaluated: now,
      };
      profile.concepts[concept] = record;
    } else {
      record.totalQuizzesTaken += 1;
      record.lastEvaluated = now;
      if (isCorrect) {
        record.consecutiveCorrect += 1;
        record.score = Math.min(100, record.score + 15);
      } else {
        record.consecutiveCorrect = 0;
        record.score = Math.max(5, record.score - 10);
      }
      record.retentionPercentage = record.score;
    }

    this.recomputeOverallMastery(profile);
    return record;
  }

  private static recomputeOverallMastery(profile: LearnerMasteryProfile): void {
    const keys = Object.keys(profile.concepts);
    if (keys.length === 0) {
      profile.overallMasteryPercentage = 0;
      return;
    }

    const total = keys.reduce((acc, k) => acc + profile.concepts[k].score, 0);
    profile.overallMasteryPercentage = Math.round(total / keys.length);
    profile.updatedAt = new Date().toISOString();
  }
}
