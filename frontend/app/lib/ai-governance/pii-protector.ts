/**
 * TATTVA AI - Sensitive Information & PII Protection Engine (Phase 44)
 * Masks and neutralizes sensitive personally identifiable information,
 * financial credentials, secret API tokens, and cryptographic keys.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { PIIFinding, PIIFilterType, PIISanitizationResult } from "./types";

export class PIIProtector {
  private static instance: PIIProtector;

  private constructor() {}

  public static getInstance(): PIIProtector {
    if (!PIIProtector.instance) {
      PIIProtector.instance = new PIIProtector();
    }
    return PIIProtector.instance;
  }

  /**
   * Luhn algorithm validation for credit card numbers
   */
  private isValidLuhn(cardNumber: string): boolean {
    const sanitized = cardNumber.replace(/\D/g, "");
    if (sanitized.length < 13 || sanitized.length > 19) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
      let digit = parseInt(sanitized.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  /**
   * Scans text for sensitive PII and returns detected findings
   */
  public scan(text: string): PIIFinding[] {
    if (!text) return [];

    const findings: PIIFinding[] = [];

    // 1. Credit Card Patterns (13-19 digits with optional hyphens/spaces)
    const ccRegex = /\b(?:\d{4}[- ]?){3}\d{4}\b|\b\d{13,19}\b/g;
    let match: RegExpExecArray | null;
    while ((match = ccRegex.exec(text)) !== null) {
      const raw = match[0];
      const digitsOnly = raw.replace(/\D/g, "");
      if (this.isValidLuhn(digitsOnly)) {
        const last4 = digitsOnly.slice(-4);
        findings.push({
          type: "credit_card",
          rawMatch: raw,
          redactedMatch: `[REDACTED_CREDIT_CARD_****${last4}]`,
          startIndex: match.index,
          endIndex: match.index + raw.length,
          confidence: 0.98,
        });
      }
    }

    // 2. SSN Pattern (XXX-XX-XXXX)
    const ssnRegex = /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g;
    while ((match = ssnRegex.exec(text)) !== null) {
      findings.push({
        type: "ssn",
        rawMatch: match[0],
        redactedMatch: "[REDACTED_SSN]",
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.95,
      });
    }

    // 3. Email Pattern
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
    while ((match = emailRegex.exec(text)) !== null) {
      findings.push({
        type: "email",
        rawMatch: match[0],
        redactedMatch: "[REDACTED_EMAIL]",
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.95,
      });
    }

    // 4. Phone Number Pattern
    const phoneRegex = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      // Ignore if it overlaps with an existing credit card or SSN
      const start = match.index;
      const end = match.index + match[0].length;
      const overlaps = findings.some(
        (f) =>
          (start >= f.startIndex && start < f.endIndex) ||
          (end > f.startIndex && end <= f.endIndex)
      );
      if (!overlaps) {
        findings.push({
          type: "phone_number",
          rawMatch: match[0],
          redactedMatch: "[REDACTED_PHONE]",
          startIndex: start,
          endIndex: end,
          confidence: 0.9,
        });
      }
    }

    // 5. Secret API Keys & Access Tokens
    const apiKeyPatterns: { regex: RegExp; desc: string }[] = [
      { regex: /\bAKIA[0-9A-Z]{16}\b/g, desc: "AWS_ACCESS_KEY" },
      { regex: /\bAIzaSy[a-zA-Z0-9_\-]{33}\b/g, desc: "GOOGLE_API_KEY" },
      { regex: /\bghp_[a-zA-Z0-9]{36}\b/g, desc: "GITHUB_PAT" },
      { regex: /\bgithub_pat_[a-zA-Z0-9_]{40,}\b/g, desc: "GITHUB_FINE_GRAINED_PAT" },
      { regex: /\bsk-[a-zA-Z0-9]{20,}\b/g, desc: "SECRET_KEY" },
      { regex: /\bxox[baprs]-[0-9a-zA-Z]{10,48}\b/g, desc: "SLACK_TOKEN" },
    ];

    for (const pat of apiKeyPatterns) {
      while ((match = pat.regex.exec(text)) !== null) {
        findings.push({
          type: "api_key",
          rawMatch: match[0],
          redactedMatch: `[REDACTED_API_KEY_${pat.desc}]`,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.99,
        });
      }
    }

    // 6. JWT Tokens
    const jwtRegex = /\beyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\b/g;
    while ((match = jwtRegex.exec(text)) !== null) {
      findings.push({
        type: "jwt_token",
        rawMatch: match[0],
        redactedMatch: "[REDACTED_JWT_TOKEN]",
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.97,
      });
    }

    // 7. Crypto Wallets (ETH / BTC)
    const ethRegex = /\b0x[a-fA-F0-9]{40}\b/g;
    while ((match = ethRegex.exec(text)) !== null) {
      findings.push({
        type: "crypto_wallet",
        rawMatch: match[0],
        redactedMatch: "[REDACTED_ETH_WALLET]",
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.96,
      });
    }

    // 8. Public IPv4 Addresses
    const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    while ((match = ipRegex.exec(text)) !== null) {
      // Exclude localhost
      if (match[0] !== "127.0.0.1" && match[0] !== "0.0.0.0") {
        findings.push({
          type: "ipv4_address",
          rawMatch: match[0],
          redactedMatch: "[REDACTED_IPV4]",
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.85,
        });
      }
    }

    // Sort findings descending by startIndex to allow clean replacement from right to left
    findings.sort((a, b) => b.startIndex - a.startIndex);
    return findings;
  }

  /**
   * Sanitizes text by redacting all identified PII tokens
   */
  public sanitize(text: string): PIISanitizationResult {
    if (!text) {
      return {
        isClean: true,
        cleanText: "",
        findingsCount: 0,
        findings: [],
        redactedTypes: [],
      };
    }

    const findings = this.scan(text);
    if (findings.length === 0) {
      return {
        isClean: true,
        cleanText: text,
        findingsCount: 0,
        findings: [],
        redactedTypes: [],
      };
    }

    let clean = text;
    const typeSet = new Set<PIIFilterType>();

    // Replace from end to start to maintain index validity
    for (const finding of findings) {
      typeSet.add(finding.type);
      clean =
        clean.slice(0, finding.startIndex) +
        finding.redactedMatch +
        clean.slice(finding.endIndex);
    }

    return {
      isClean: false,
      cleanText: clean,
      findingsCount: findings.length,
      findings,
      redactedTypes: Array.from(typeSet),
    };
  }
}
