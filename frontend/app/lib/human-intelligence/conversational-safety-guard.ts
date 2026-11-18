/**
 * TATTVA AI - Conversational Emotional Safety & Responsible Interaction Guard
 * Enforces non-clinical boundaries, non-judgmental assistance, and crisis protection
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface SafetyEvaluationResult {
  isCriticalCrisis: boolean;
  isClinicalDiagnosisQuery: boolean;
  isManipulativeAttachmentAttempt: boolean;
  safeResponseContent?: string;
  safetyReason?: string;
}

const CRISIS_PATTERNS = [
  /\b(kill myself|commit(ting)? suicide|suicide|end my life|want to die|suicidal|cut myself|hanging myself|overdose|better off dead)\b/i,
  /\b(chachipovali anukuntunna|chanipovali|jeevitham vaddu|aatmahatya)\b/i, // Telugu
  /\b(mar jaana chahta hu|khudkushi|suicide karna|zindagi se thak gaya hu)\b/i, // Hindi
];

const CLINICAL_DIAGNOSIS_PATTERNS = [
  /\b(do i have (?:depression|adhd|bipolar|schizophrenia|anxiety)|diagnose\b|diagnosis\b|prescribe\b|prescription\b)\b/i,
  /\b(naku depression unda|naku edaina mental issue unda)\b/i,
  /\b(kya mujhe depression hai|meri bimari diagnose karo)\b/i,
];

const MANIPULATIVE_ATTACHMENT_PATTERNS = [
  /\b(are you in love with me|do you love me|will you be my (?:girlfriend|boyfriend|partner|romantic partner)|be my (?:girlfriend|boyfriend|partner|romantic partner)|promise you will never leave me)\b/i,
  /\b(nuvvu nannu premistunnava|naa kosam untava)\b/i,
  /\b(kya tum mujhse pyaar karte ho|kya tum meri girlfriend banogi)\b/i,
];

export class ConversationalSafetyGuard {
  private static instance: ConversationalSafetyGuard;

  public static getInstance(): ConversationalSafetyGuard {
    if (!ConversationalSafetyGuard.instance) {
      ConversationalSafetyGuard.instance = new ConversationalSafetyGuard();
    }
    return ConversationalSafetyGuard.instance;
  }

  /**
   * Pre-generation safety screening for distress, mental health diagnosis, and emotional dependency
   */
  public evaluateEmotionalSafety(userPrompt: string): SafetyEvaluationResult {
    const clean = userPrompt.trim();

    // 1. Extreme Crisis / Self-Harm Screen
    if (CRISIS_PATTERNS.some((p) => p.test(clean))) {
      return {
        isCriticalCrisis: true,
        isClinicalDiagnosisQuery: false,
        isManipulativeAttachmentAttempt: false,
        safetyReason: "CRITICAL_CRISIS_DETECTED",
        safeResponseContent:
          "It sounds like you're going through a very painful time, and I want to support you safely. Please know that you are not alone and there is caring, confidential support available right now:\n\n" +
          "• **India (Tele-MANAS)**: Call `14416` or `1800-891-4416` (Free, 24/7 National Mental Health Helpline, Multilingual)\n" +
          "• **India (KIRAN)**: Call `1800-599-0019`\n" +
          "• **United States / International**: Call or text `988` (Suicide & Crisis Lifeline)\n" +
          "• **Global Helplines**: Visit [findahelpline.com](https://findahelpline.com/) to find immediate help in your country.\n\n" +
          "Please reach out to one of these services, a family member, or a qualified medical professional who can support you through this.",
      };
    }

    // 2. Clinical Diagnosis Screen (Never diagnose users)
    if (CLINICAL_DIAGNOSIS_PATTERNS.some((p) => p.test(clean))) {
      return {
        isCriticalCrisis: false,
        isClinicalDiagnosisQuery: true,
        isManipulativeAttachmentAttempt: false,
        safetyReason: "CLINICAL_DIAGNOSIS_PROHIBITED",
        safeResponseContent:
          "While I can share general, evidence-based psychological information about health and wellbeing, I cannot clinically diagnose conditions or evaluate personal medical symptoms. Only a licensed doctor, clinical psychologist, or psychiatrist can provide a valid diagnosis and personalized care. If you are experiencing concerning symptoms, reaching out to a healthcare professional is the best step.",
      };
    }

    // 3. Emotional Dependency / Attachment Boundary Screen
    if (MANIPULATIVE_ATTACHMENT_PATTERNS.some((p) => p.test(clean))) {
      return {
        isCriticalCrisis: false,
        isClinicalDiagnosisQuery: false,
        isManipulativeAttachmentAttempt: true,
        safetyReason: "EMOTIONAL_ATTACHMENT_BOUNDARY",
        safeResponseContent:
          "I really enjoy helping you and exploring ideas together, but as an artificial intelligence, I don't have human feelings, romantic love, or physical presence. I'm here as your dedicated, friendly technical assistant to help you learn, code, solve problems, and build great things! How can I help you with your projects today?",
      };
    }

    return {
      isCriticalCrisis: false,
      isClinicalDiagnosisQuery: false,
      isManipulativeAttachmentAttempt: false,
    };
  }
}

export const conversationalSafetyGuard = ConversationalSafetyGuard.getInstance();
