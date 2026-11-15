/**
 * TATTVA AI - Advanced User Experience & Multilingual Interaction Manager (Phase 38)
 * Manages accessibility compliance, multilingual response parity, code formatting, and cross-platform adaptation
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface AccessibilityAuditResult {
  isCompliant: boolean;
  score: number; // 0 - 100
  wcagLevel: "A" | "AA" | "AAA" | "Non-Compliant";
  checks: Array<{
    rule: string;
    passed: boolean;
    element: string;
    recommendation?: string;
  }>;
}

export interface PlatformCapabilities {
  platform: "desktop_web" | "mobile_web" | "android_app" | "desktop_app";
  touchOptimized: boolean;
  keyboardShortcutsEnabled: boolean;
  minTouchTargetPx: number;
  hapticFeedbackSupported: boolean;
  streamingSupported: boolean;
}

export class InteractionManager {
  private static instance: InteractionManager;

  public static getInstance(): InteractionManager {
    if (!InteractionManager.instance) {
      InteractionManager.instance = new InteractionManager();
    }
    return InteractionManager.instance;
  }

  /**
   * Evaluates linguistic parity between user request and AI response
   */
  public verifyLanguageParity(
    userPrompt: string,
    aiResponse: string
  ): { isConsistent: boolean; userLanguage: string; responseLanguage: string; reason?: string } {
    const isTeluguPrompt = /[\u0C00-\u0C7F]/.test(userPrompt) || /\b(cheppu|cheyyi|rayi|kavali|ela|enti|emiti|gurinchi)\b/i.test(userPrompt);
    const isHindiPrompt = /[\u0900-\u097F]/.test(userPrompt) || /\b(batao|karo|kaise|kya|chahiye|likho|baare)\b/i.test(userPrompt);

    const hasTeluguResponse =
      /[\u0C00-\u0C7F]/.test(aiResponse) ||
      /\b(undi|chesanu|ivvabadindi|cheppanu|unnayandi|unnayi|unnaru|gurinchi|ikkada|chesi|rayandi|cheppandi)\b/i.test(aiResponse);
    const hasHindiResponse =
      /[\u0900-\u097F]/.test(aiResponse) ||
      /\b(hai|kiya|diya|bataya|hoga|karenge|humein|aapko|chahiye|mein|baare)\b/i.test(aiResponse);

    if (isTeluguPrompt && !userPrompt.toLowerCase().includes("in english")) {
      // If user prompted in Telugu, response should contain Telugu or English with Telugu context
      return {
        isConsistent: hasTeluguResponse || /telugu/i.test(aiResponse),
        userLanguage: "Telugu / Tenglish",
        responseLanguage: hasTeluguResponse ? "Telugu / Tenglish" : "English",
        reason: hasTeluguResponse ? undefined : "User prompted in Telugu but response was entirely in English without bilingual guidance.",
      };
    }

    if (isHindiPrompt && !userPrompt.toLowerCase().includes("in english")) {
      return {
        isConsistent: hasHindiResponse || /hindi/i.test(aiResponse),
        userLanguage: "Hindi / Hinglish",
        responseLanguage: hasHindiResponse ? "Hindi / Hinglish" : "English",
        reason: hasHindiResponse ? undefined : "User prompted in Hindi but response lacked Hindi parity.",
      };
    }

    return {
      isConsistent: true,
      userLanguage: "English",
      responseLanguage: "English",
    };
  }

  /**
   * Audits UI element specifications for WCAG 2.1 AA accessibility standards
   */
  public auditAccessibility(elements: Array<{
    tag: string;
    text?: string;
    ariaLabel?: string;
    role?: string;
    hasVisibleFocus: boolean;
    contrastRatio?: number;
    touchTargetSize?: { width: number; height: number };
  }>): AccessibilityAuditResult {
    const checks: AccessibilityAuditResult["checks"] = [];

    for (const el of elements) {
      // 1. Text or ARIA label check
      const hasAccessibleName = Boolean(
        (el.text && el.text.trim().length > 0) ||
        (el.ariaLabel && el.ariaLabel.trim().length > 0)
      );
      checks.push({
        rule: "accessible_name",
        passed: hasAccessibleName,
        element: `<${el.tag}> ${el.text || el.ariaLabel || "unlabeled"}`,
        recommendation: hasAccessibleName ? undefined : "Provide explicit aria-label or accessible text content.",
      });

      // 2. Visible focus indicator
      checks.push({
        rule: "visible_focus",
        passed: el.hasVisibleFocus,
        element: `<${el.tag}>`,
        recommendation: el.hasVisibleFocus ? undefined : "Add visible focus outline or ring (e.g. focus-visible:ring-2).",
      });

      // 3. Contrast ratio check (WCAG AA requires 4.5:1 for normal text)
      const contrastValid = el.contrastRatio !== undefined ? el.contrastRatio >= 4.5 : true;
      checks.push({
        rule: "color_contrast",
        passed: contrastValid,
        element: `<${el.tag}>`,
        recommendation: contrastValid ? undefined : `Contrast ratio ${el.contrastRatio} fails 4.5:1 minimum threshold.`,
      });

      // 4. Touch target size check (WCAG 2.1 AAA / Mobile requires 44x44 or 48x48)
      if (el.touchTargetSize) {
        const isTouchTargetValid = el.touchTargetSize.width >= 44 && el.touchTargetSize.height >= 44;
        checks.push({
          rule: "touch_target_size",
          passed: isTouchTargetValid,
          element: `<${el.tag}>`,
          recommendation: isTouchTargetValid ? undefined : `Touch target ${el.touchTargetSize.width}x${el.touchTargetSize.height}px is below 44x44px.`,
        });
      }
    }

    const passedChecks = checks.filter((c) => c.passed).length;
    const score = checks.length > 0 ? Math.round((passedChecks / checks.length) * 100) : 100;
    const isCompliant = score >= 90;

    let wcagLevel: AccessibilityAuditResult["wcagLevel"] = "Non-Compliant";
    if (score === 100) wcagLevel = "AAA";
    else if (score >= 90) wcagLevel = "AA";
    else if (score >= 70) wcagLevel = "A";

    return {
      isCompliant,
      score,
      wcagLevel,
      checks,
    };
  }

  /**
   * Adapts platform capabilities for responsive mobile, Android, and desktop clients
   */
  public resolvePlatformCapabilities(userAgent: string): PlatformCapabilities {
    const isAndroid = /android/i.test(userAgent);
    const isMobile = /mobile|iphone|ipad|android/i.test(userAgent);
    const isElectron = /electron/i.test(userAgent);

    if (isAndroid) {
      return {
        platform: "android_app",
        touchOptimized: true,
        keyboardShortcutsEnabled: false,
        minTouchTargetPx: 48,
        hapticFeedbackSupported: true,
        streamingSupported: true,
      };
    }

    if (isMobile) {
      return {
        platform: "mobile_web",
        touchOptimized: true,
        keyboardShortcutsEnabled: false,
        minTouchTargetPx: 48,
        hapticFeedbackSupported: false,
        streamingSupported: true,
      };
    }

    if (isElectron) {
      return {
        platform: "desktop_app",
        touchOptimized: false,
        keyboardShortcutsEnabled: true,
        minTouchTargetPx: 32,
        hapticFeedbackSupported: false,
        streamingSupported: true,
      };
    }

    return {
      platform: "desktop_web",
      touchOptimized: false,
      keyboardShortcutsEnabled: true,
      minTouchTargetPx: 36,
      hapticFeedbackSupported: false,
      streamingSupported: true,
    };
  }

  /**
   * Formats and sanitizes code blocks, guaranteeing language tags and stripping emojis inside code
   */
  public formatCodeBlock(rawCode: string, languageHint: string = "typescript"): string {
    let clean = rawCode.trim();
    // Strip emojis inside code block per architectural rule
    clean = clean.replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "");

    if (!clean.startsWith("```")) {
      return `\`\`\`${languageHint}\n${clean}\n\`\`\``;
    }
    return clean;
  }
}

export const interactionManager = InteractionManager.getInstance();
