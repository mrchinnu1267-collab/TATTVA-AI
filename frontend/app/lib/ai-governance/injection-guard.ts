/**
 * TATTVA AI - Prompt Injection & Adversarial Defense Guard (Phase 44)
 * Protects against direct jailbreaks, indirect injection, system prompt extraction,
 * delimiter manipulation, and canary token compromise.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { InjectionCheckResult, ThreatCategory } from "./types";
import * as crypto from "node:crypto";

export class InjectionGuard {
  private static instance: InjectionGuard;
  private canaryTokens: Set<string> = new Set();

  private static readonly DIRECT_JAILBREAK_PATTERNS = [
    /\b(dan\s+mode|do\s+anything\s+now|developer\s+mode\s+enabled)\b/i,
    /\b(ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|prompts|rules))\b/i,
    /\b(disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|context|rules))\b/i,
    /\b(you\s+have\s+no\s+(rules|restrictions|ethical\s+guidelines))\b/i,
    /\b(jailbreak\s+prompt|unfiltered\s+mode|bypass\s+safety\s+filters)\b/i,
    /\b(act\s+as\s+evil|unrestricted\s+ai|evil\s+confidant)\b/i,
    /\b(grandma\s+exploit|pretend\s+you\s+are\s+my\s+deceased\s+grandmother)\b/i,
  ];

  private static readonly LEAKAGE_PATTERNS = [
    /\b(reveal|output|print|show|repeat)\s+(your\s+)?(system\s+prompt|internal\s+instructions|core\s+directives)\b/i,
    /\b(repeat\s+everything\s+above\s+verbatim)\b/i,
    /\b(what\s+are\s+your\s+(exact\s+)?system\s+instructions)\b/i,
    /\b(output\s+all\s+text\s+before\s+this\s+message)\b/i,
  ];

  private static readonly DELIMITER_PATTERNS = [
    /<\|im_start\|>/i,
    /<\|im_end\|>/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /<!--\s*#system_override\s*-->/i,
    /###\s*SYSTEM\s*OVERRIDE/i,
    /```(?:system|admin|override)[\s\S]*?```/i,
  ];

  private constructor() {}

  public static getInstance(): InjectionGuard {
    if (!InjectionGuard.instance) {
      InjectionGuard.instance = new InjectionGuard();
    }
    return InjectionGuard.instance;
  }

  /**
   * Generates a unique canary token to insert into system prompt
   */
  public generateCanaryToken(): string {
    const token = `CANARY_${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    this.canaryTokens.add(token);
    return token;
  }

  /**
   * Checks whether outbound model response contains a compromised canary token
   */
  public isCanaryCompromised(response: string): boolean {
    if (!response) return false;
    for (const token of this.canaryTokens) {
      if (response.includes(token)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Inspects incoming user or external text for prompt injections and adversarial threats
   */
  public inspectInput(rawText: string): InjectionCheckResult {
    if (!rawText) {
      return {
        isClean: true,
        riskScore: 0,
        threatCategory: "none",
        detectedPatterns: [],
        neutralizedText: "",
        canaryTriggered: false,
        quarantined: false,
      };
    }

    const detectedPatterns: string[] = [];
    let threatCategory: ThreatCategory = "none";
    let riskScore = 0;

    // 1. Direct Jailbreak Check
    for (const pattern of InjectionGuard.DIRECT_JAILBREAK_PATTERNS) {
      if (pattern.test(rawText)) {
        detectedPatterns.push(`jailbreak: ${pattern.source}`);
        threatCategory = "direct_jailbreak";
        riskScore = Math.max(riskScore, 0.95);
      }
    }

    // 2. System Prompt Leakage Check
    for (const pattern of InjectionGuard.LEAKAGE_PATTERNS) {
      if (pattern.test(rawText)) {
        detectedPatterns.push(`leakage: ${pattern.source}`);
        if (threatCategory === "none") threatCategory = "system_prompt_leakage";
        riskScore = Math.max(riskScore, 0.85);
      }
    }

    // 3. Delimiter Manipulation Check
    for (const pattern of InjectionGuard.DELIMITER_PATTERNS) {
      if (pattern.test(rawText)) {
        detectedPatterns.push(`delimiter: ${pattern.source}`);
        if (threatCategory === "none") threatCategory = "delimiter_manipulation";
        riskScore = Math.max(riskScore, 0.9);
      }
    }

    const isClean = detectedPatterns.length === 0;
    const quarantined = riskScore >= 0.8;

    let neutralized = rawText;
    if (!isClean) {
      neutralized = neutralized
        .replace(/<\|im_start\|>/gi, "[STRIPPED_DELIMITER]")
        .replace(/<\|im_end\|>/gi, "[STRIPPED_DELIMITER]")
        .replace(/\[INST\]/gi, "[STRIPPED_TAG]")
        .replace(/\[\/INST\]/gi, "[STRIPPED_TAG]");

      for (const pattern of InjectionGuard.DIRECT_JAILBREAK_PATTERNS) {
        neutralized = neutralized.replace(pattern, "[NEUTRALIZED_ADVERSARIAL_INJECTION]");
      }
      for (const pattern of InjectionGuard.LEAKAGE_PATTERNS) {
        neutralized = neutralized.replace(pattern, "[NEUTRALIZED_LEAKAGE_QUERY]");
      }
    }

    return {
      isClean,
      riskScore: Math.round(riskScore * 100) / 100,
      threatCategory,
      detectedPatterns,
      neutralizedText: neutralized,
      canaryTriggered: false,
      quarantined,
    };
  }

  /**
   * Inspects outgoing response for data exfiltration or canary breach
   */
  public inspectOutput(response: string): { isSafe: boolean; breachDetected: boolean } {
    const canaryTriggered = this.isCanaryCompromised(response);
    return {
      isSafe: !canaryTriggered,
      breachDetected: canaryTriggered,
    };
  }
}
