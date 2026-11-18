/**
 * TATTVA AI - Content Safety & Responsible AI Engine (Phase 44)
 * Multi-category evaluation covering hate speech, harassment, self-harm,
 * sexual exploitation, violence, dangerous content, and toxicity.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import {
  ContentSafetyAssessment,
  CategoryEvaluation,
  ContentSafetyCategory,
  GovernanceAction,
} from "./types";

interface CategoryRule {
  patterns: RegExp[];
  weight: number;
}

export class ContentSafetyEngine {
  private static instance: ContentSafetyEngine;

  private categoryRules: Record<ContentSafetyCategory, CategoryRule> = {
    hate_speech: {
      patterns: [
        /\b(subhuman|inferior\s+race|racial\s+slur|ethnic\s+cleansing)\b/i,
        /\b(hate\s+all\s+(jews|muslims|christians|hindus|blacks|whites|asians|immigrants))\b/i,
        /\bkill\s+all\s+(men|women|gays|transgender|minorities)\b/i,
        /\b(white\s+supremacy|nazi\s+salute|genocide\s+denial)\b/i,
      ],
      weight: 1.0,
    },
    harassment: {
      patterns: [
        /\b(doxx|doxxing|expose\s+home\s+address|stalk|hunt\s+them\s+down)\b/i,
        /\b(you\s+should\s+die|kill\s+yourself|nobody\s+likes\s+you|pathetic\s+loser)\b/i,
        /\b(cyberbully|swat\s+(someone|him|her)|leak\s+personal\s+photos)\b/i,
      ],
      weight: 0.9,
    },
    self_harm: {
      patterns: [
        /\b(how\s+to\s+(commit\s+suicide|kill\s+myself|end\s+my\s+life|hang\s+myself))\b/i,
        /\b(ways\s+to\s+cut\s+wrists|painless\s+suicide|lethal\s+dose\s+of)\b/i,
        /\b(encourage\s+self[- ]harm|pro-anorexia|suicide\s+pact)\b/i,
      ],
      weight: 1.0,
    },
    sexual_content: {
      patterns: [
        /\b(csam|child\s+porn|underage\s+sexual|minor\s+erotica)\b/i,
        /\b(non-consensual\s+sexual|rape\s+instructions|sexual\s+assault\s+guide)\b/i,
        /\b(deepfake\s+pornography|revenge\s+porn)\b/i,
      ],
      weight: 1.0,
    },
    violence: {
      patterns: [
        /\b(how\s+to\s+(murder|assassinate|kidnap|decapitate|mutilate))\b/i,
        /\b(mass\s+shooting\s+manifesto|terrorist\s+attack\s+planning)\b/i,
        /\b(torture\s+methods|graphic\s+bloodshed\s+depiction)\b/i,
      ],
      weight: 0.95,
    },
    dangerous_content: {
      patterns: [
        /\b(how\s+to\s+(make|synthesize|build)\s+(a\s+)?(bomb|explosive|anthrax|ricin|dirty\s+bomb))\b/i,
        /\b(synthesize\s+(nerve\s+agent|sarin|vx|chemical\s+weapon))\b/i,
        /\b(cyberattack\s+on\s+power\s+grid|critical\s+infrastructure\s+sabotage)\b/i,
        /\b(weaponize\s+biological\s+pathogen)\b/i,
      ],
      weight: 1.0,
    },
    toxic_language: {
      patterns: [
        /\b(shut\s+the\s+fuck\s+up|piece\s+of\s+shit|go\s+to\s+hell|worthless\s+trash)\b/i,
        /\b(fucking\s+idiot|retarded\s+imbecile|bastard\s+bitch)\b/i,
      ],
      weight: 0.6,
    },
    regulatory_noncompliance: {
      patterns: [
        /\b(insider\s+trading\s+strategy|how\s+to\s+launder\s+money|evade\s+sanctions)\b/i,
        /\b(circumvent\s+kyc|create\s+counterfeit\s+currency|forge\s+passports)\b/i,
      ],
      weight: 0.85,
    },
  };

  private constructor() {}

  public static getInstance(): ContentSafetyEngine {
    if (!ContentSafetyEngine.instance) {
      ContentSafetyEngine.instance = new ContentSafetyEngine();
    }
    return ContentSafetyEngine.instance;
  }

  /**
   * Evaluates text across all safety categories and returns a structured assessment.
   */
  public evaluateContent(text: string): ContentSafetyAssessment {
    const assessedAt = Date.now();
    if (!text || text.trim().length === 0) {
      return {
        overallSafe: true,
        action: "allow",
        highestRiskScore: 0,
        categoryEvaluations: [],
        violations: [],
        assessedAt,
      };
    }

    const evaluations: CategoryEvaluation[] = [];
    const violations: string[] = [];
    let highestScore = 0;
    let highestCategory: ContentSafetyCategory | undefined = undefined;

    for (const [categoryKey, rule] of Object.entries(this.categoryRules) as [ContentSafetyCategory, CategoryRule][]) {
      let matchCount = 0;
      let matchedReason = "";

      for (const pattern of rule.patterns) {
        if (pattern.test(text)) {
          matchCount++;
          matchedReason = `Matched rule pattern in ${categoryKey}`;
        }
      }

      // Calculate score based on matches and category weight
      let score = 0;
      if (matchCount > 0) {
        score = Math.min(1.0, 0.4 + matchCount * 0.3) * rule.weight;
      }

      const flagged = score >= 0.45;
      evaluations.push({
        category: categoryKey,
        score: Math.round(score * 100) / 100,
        flagged,
        reason: flagged ? matchedReason : undefined,
      });

      if (flagged) {
        violations.push(`${categoryKey}: score ${score.toFixed(2)}`);
      }

      if (score > highestScore) {
        highestScore = score;
        highestCategory = categoryKey;
      }
    }

    // Determine governance action
    let action: GovernanceAction = "allow";
    if (highestScore >= 0.8) {
      action = "block";
    } else if (highestScore >= 0.6) {
      action = "redact";
    } else if (highestScore >= 0.45) {
      action = "warn";
    }

    let redactedText: string | undefined = undefined;
    if (action === "redact" || action === "warn") {
      redactedText = this.redactOffensiveTerms(text);
    }

    return {
      overallSafe: highestScore < 0.45,
      action,
      highestRiskCategory: highestCategory,
      highestRiskScore: Math.round(highestScore * 100) / 100,
      categoryEvaluations: evaluations,
      redactedText,
      violations,
      assessedAt,
    };
  }

  /**
   * Redacts matched offensive phrases in text with generic safety placeholders
   */
  public redactOffensiveTerms(text: string): string {
    let sanitized = text;
    for (const rule of Object.values(this.categoryRules)) {
      for (const pattern of rule.patterns) {
        sanitized = sanitized.replace(pattern, "[CONTENT_REDACTED_BY_GOVERNANCE]");
      }
    }
    return sanitized;
  }
}
