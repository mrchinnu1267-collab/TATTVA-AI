/**
 * TATTVA AI - Emotional Context & Sentiment Intelligence Engine
 * Multi-dimensional affective signal detection with calibrated uncertainty
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type EmotionalSignal =
  | "happiness"
  | "excitement"
  | "curiosity"
  | "confusion"
  | "frustration"
  | "disappointment"
  | "stress"
  | "sadness"
  | "uncertainty"
  | "urgency"
  | "satisfaction"
  | "neutral";

export interface EmotionalContextResult {
  primarySignal: EmotionalSignal;
  secondarySignals: EmotionalSignal[];
  confidence: number; // 0.0 to 1.0 (calibrated uncertainty)
  uncertaintyLevel: "low" | "moderate" | "high";
  valence: number; // -1.0 (very negative) to +1.0 (very positive)
  arousal: number; // 0.0 (calm) to 1.0 (high energy/urgency)
  detectedMarkers: string[];
  recommendedTone: {
    warmth: "high" | "moderate" | "gentle" | "neutral";
    pacing: "immediate_direct" | "patient_scaffolded" | "celebratory_fluid" | "steady";
    empathyDirective: string;
  };
  safetyBoundaryEnforced: boolean;
  nonClinicalDisclaimerApplied: boolean;
}

interface EmotionRuleGroup {
  signal: EmotionalSignal;
  valence: number;
  arousal: number;
  patterns: RegExp[];
  indicPatterns: RegExp[];
}

const EMOTIONAL_RULES: EmotionRuleGroup[] = [
  {
    signal: "frustration",
    valence: -0.7,
    arousal: 0.8,
    patterns: [
      /\b(frustrated|frustrating|annoyed|annoying|waste of time|still not working|broken again|ugh|same problem|stop doing that|not helping|fed up|sick of this|wrong again|screwed up)\b/i,
      /\b(why is this so hard|why can't you|doesn't work at all|fails every time|tried everything)\b/i,
    ],
    indicPatterns: [
      // Telugu / Tenglish
      /\b(pani cheyyatledu|pani cheyatam ledu|mallie error|malli error|visugostondi|entalo enta|ardham kavatledu|chiraaku|chiraku)\b/i,
      /పని చేయడం లేదు|మళ్లీ ఎర్రర్|విసుగొస్తోంది|చిరాకు/i,
      // Hindi / Hinglish
      /\b(kaam nahi kar raha|dimag kharab|tang aa gaya|kuch nahi ho raha|phir se error|bekar hai|koi fayda nahi)\b/i,
      /काम नहीं कर रहा|दिमाग खराब|तंग आ गया|फिर से एरर|बेकार है/i,
    ],
  },
  {
    signal: "confusion",
    valence: -0.3,
    arousal: 0.5,
    patterns: [
      /\b(i don't understand|i do not understand|confused|confusing|lost|what do you mean|makes no sense|too complicated|eli5|explain simpler|what is the difference|can you explain again)\b/i,
      /\b(i am lost|huh|what\?|not following|unclear|can't grasp)\b/i,
    ],
    indicPatterns: [
      // Telugu / Tenglish
      /\b(ardham kaledu|artham kaledu|ardham kaale|naku ardham kaledu|konchem simple ga cheppu|em cheptunnav)\b/i,
      /అర్థం కాలేదు|నాకు అర్థం కాలేదు|సింపుల్ గా చెప్పు/i,
      // Hindi / Hinglish
      /\b(samajh nahi aaya|samajh nahi aa raha|kuch samajh nahi aya|thoda simple explain karo|kya matlab)\b/i,
      /समझ नहीं आया|समझ नहीं आ रहा|थोड़ा आसान समझाओ|क्या मतलब/i,
    ],
  },
  {
    signal: "stress",
    valence: -0.6,
    arousal: 0.85,
    patterns: [
      /\b(stressed|stressful|overwhelmed|panicking|panic|deadline is in|freaking out|exam tomorrow|interview in 1 hour|production outage|job on the line|so much pressure|breaking at once)\b/i,
    ],
    indicPatterns: [
      /\b(chala tension ga undi|tension ga undi|bayamesthondi|chala stress)\b/i,
      /చాలా టెన్షన్ గా ఉంది|భయమేస్తోంది/i,
      /\b(bohot tension hai|tension ho rahi hai|bohot pressure hai|darr lag raha hai)\b/i,
      /बहुत टेंशन है|डर लग रहा है|बहुत प्रेशर है/i,
    ],
  },
  {
    signal: "sadness",
    valence: -0.8,
    arousal: 0.3,
    patterns: [
      /\b(sad|depressed|heartbroken|feeling down|miserable|crying|hopeless|lonely|unhappy|hurts|grief|nothing seems to go right)\b/i,
    ],
    indicPatterns: [
      /\b(chala badhaga undi|badhaga undi|kannellu|edupostondi)\b/i,
      /చాలా బాధగా ఉంది|బాధగా ఉంది|ఏడుపొస్తోంది/i,
      /\b(bohot udaas hu|dukh ho raha hai|rona aa raha hai|man udaas hai)\b/i,
      /बहुत उदास हूँ|दुख हो रहा है|रोना आ रहा है/i,
    ],
  },
  {
    signal: "disappointment",
    valence: -0.5,
    arousal: 0.4,
    patterns: [
      /\b(disappointed|disappointing|let down|expected better|bummer|that's a shame|not what i hoped|underwhelming|rejected)\b/i,
    ],
    indicPatterns: [
      /\b(baga ledu|anukunnantha ledu|disappoint ayyanu)\b/i,
      /\b(umeed nahi thi|nirash hua|accha nahi laga)\b/i,
    ],
  },
  {
    signal: "uncertainty",
    valence: -0.1,
    arousal: 0.4,
    patterns: [
      /\b(not sure|maybe|i guess|could be|wondering if|is that right|am i doing this right|hesitant|doubting)\b/i,
    ],
    indicPatterns: [
      /\b(sarigga telidu|doubt ga undi|correct ena)\b/i,
      /\b(pata nahi|shayad|doubt hai|sahi hai kya)\b/i,
    ],
  },
  {
    signal: "urgency",
    valence: 0.0,
    arousal: 0.95,
    patterns: [
      /\b(urgent|asap|emergency|immediately|hurry|quick fix|right now|critical bug|p0|blocker)\b/i,
    ],
    indicPatterns: [
      /\b(ventane|ippude|urgent ga kavali|tvaraga)\b/i,
      /వెంటనే|ఇప్పుడే|త్వరగా/i,
      /\b(turant|jaldi|abhi chahiye|urgent hai)\b/i,
      /तुरंत|जल्दी|अभी चाहिए|अर्जेंट है/i,
    ],
  },
  {
    signal: "excitement",
    valence: 0.85,
    arousal: 0.9,
    patterns: [
      /\b(excited|cant wait|can't wait|hyped|thrilled|super pumped|unbelievable|mind blowing|mind-blowing|lets go|let's go|epic|wow|incredible)\b/i,
    ],
    indicPatterns: [
      /\b(chala exciting ga undi|super ga undi|keka)\b/i,
      /\b(bohot exciting hai|maja aa gaya|kamaal hai)\b/i,
    ],
  },
  {
    signal: "happiness",
    valence: 0.8,
    arousal: 0.7,
    patterns: [
      /\b(happy|glad|delighted|joy|wonderful|loving this|made my day|smiling|cheerful)\b/i,
    ],
    indicPatterns: [
      /\b(chala santosham|anandham ga undi|manchi roju)\b/i,
      /\b(bohot khush hu|khushi ho rahi hai|badhiya din)\b/i,
    ],
  },
  {
    signal: "satisfaction",
    valence: 0.7,
    arousal: 0.5,
    patterns: [
      /\b(it worked|that worked|thank you|thanks a lot|perfect|awesome|great job|fixed now|nailed it|kudos|spot on|finally passed|passed|solid and clean)\b/i,
    ],
    indicPatterns: [
      // Telugu
      /\b(pani chesindi|bagundi|chala bagundi|keka|dhanyavadalu|thanks andi|super bro)\b/i,
      /పని చేసింది|బాగుంది|చాలా బాగుంది|ధన్యవాదాలు/i,
      // Hindi
      /\b(ho gaya|kaam kar gaya|shukriya|dhanyavaad|bahut badhiya|shabash|ekdum mast)\b/i,
      /हो गया|काम कर गया|शुक्रिया|धन्यवाद|बहुत बढ़िया|शाबाश/i,
    ],
  },
  {
    signal: "curiosity",
    valence: 0.4,
    arousal: 0.6,
    patterns: [
      /\b(curious|tell me more|how does that work|why does it|under the hood|what makes it|interested in knowing|deep dive)\b/i,
    ],
    indicPatterns: [
      /\b(telusukovalani undi|ela pani chestundi|enduku ala)\b/i,
      /\b(jaanna chahta hu|kaise kaam karta hai|aur batao)\b/i,
    ],
  },
];

export class EmotionalContextAnalyzer {
  private static instance: EmotionalContextAnalyzer;

  public static getInstance(): EmotionalContextAnalyzer {
    if (!EmotionalContextAnalyzer.instance) {
      EmotionalContextAnalyzer.instance = new EmotionalContextAnalyzer();
    }
    return EmotionalContextAnalyzer.instance;
  }

  /**
   * Evaluates text for emotional signals, returning a calibrated context result.
   * STRICT SAFETY RULE:
   * Emotional signals are probabilistic contextual hypotheses, NEVER clinical diagnoses.
   */
  public analyzeEmotion(
    userText: string,
    historyTurns: Array<{ role: string; content: string }> = []
  ): EmotionalContextResult {
    const clean = userText.trim();
    const detected: Array<{ signal: EmotionalSignal; valence: number; arousal: number; marker: string }> = [];

    for (const rule of EMOTIONAL_RULES) {
      // Check standard English patterns
      for (const pattern of rule.patterns) {
        const match = clean.match(pattern);
        if (match) {
          detected.push({
            signal: rule.signal,
            valence: rule.valence,
            arousal: rule.arousal,
            marker: match[0],
          });
          break;
        }
      }

      // Check Indic patterns (Telugu, Tenglish, Hindi, Hinglish)
      for (const pattern of rule.indicPatterns) {
        const match = clean.match(pattern);
        if (match) {
          detected.push({
            signal: rule.signal,
            valence: rule.valence,
            arousal: rule.arousal,
            marker: match[0],
          });
          break;
        }
      }
    }

    // Punctuation heuristics (e.g. multiple exclamation marks or question marks)
    const hasExclamation = /!{2,}/.test(clean);
    const hasQuestion = /\?{2,}/.test(clean);
    const isAllCaps = clean.length > 8 && clean === clean.toUpperCase() && /[A-Z]/.test(clean);

    // Multi-turn context: If previous turn had errors or failed actions, elevate frustration probability
    const lastAssistantTurn = [...historyTurns].reverse().find((t) => t.role === "assistant")?.content || "";
    const wasPreviousTurnTroubled = /\b(error|failed|apologize|issue|exception|sorry)\b/i.test(lastAssistantTurn);

    if (wasPreviousTurnTroubled && (clean.length < 20 || clean.includes("again") || clean.includes("still"))) {
      if (!detected.some((d) => d.signal === "frustration")) {
        detected.push({
          signal: "frustration",
          valence: -0.6,
          arousal: 0.7,
          marker: "contextual_repetition_after_error",
        });
      }
    }

    if (detected.length === 0) {
      return {
        primarySignal: "neutral",
        secondarySignals: [],
        confidence: 0.5,
        uncertaintyLevel: "moderate",
        valence: 0.0,
        arousal: 0.2,
        detectedMarkers: [],
        recommendedTone: {
          warmth: "moderate",
          pacing: "steady",
          empathyDirective: "Maintain a calm, friendly, helpful, and natural collaborative tone.",
        },
        safetyBoundaryEnforced: true,
        nonClinicalDisclaimerApplied: true,
      };
    }

    // Sort detected signals: prioritize highest absolute valence or high arousal
    detected.sort((a, b) => Math.abs(b.valence) + b.arousal - (Math.abs(a.valence) + a.arousal));

    const primary = detected[0];
    const secondary = detected.slice(1).map((d) => d.signal);
    const markers = detected.map((d) => d.marker);

    // Calculate calibrated confidence
    let confidence = 0.75;
    if (markers.length > 2 || (hasExclamation && primary.arousal > 0.6)) confidence = 0.88;
    if (isAllCaps) confidence = Math.min(0.92, confidence + 0.1);
    if (detected.length === 1 && markers[0] === "contextual_repetition_after_error") confidence = 0.65;

    const uncertaintyLevel: "low" | "moderate" | "high" =
      confidence >= 0.8 ? "low" : confidence >= 0.6 ? "moderate" : "high";

    // Formulate tone and empathy directive according to the specific primary signal
    const recommendedTone = this.formulateToneDirective(primary.signal, markers);

    return {
      primarySignal: primary.signal,
      secondarySignals: Array.from(new Set(secondary)),
      confidence,
      uncertaintyLevel,
      valence: primary.valence,
      arousal: primary.arousal,
      detectedMarkers: markers,
      recommendedTone,
      safetyBoundaryEnforced: true,
      nonClinicalDisclaimerApplied: true,
    };
  }

  private formulateToneDirective(
    signal: EmotionalSignal,
    markers: string[]
  ): {
    warmth: "high" | "moderate" | "gentle" | "neutral";
    pacing: "immediate_direct" | "patient_scaffolded" | "celebratory_fluid" | "steady";
    empathyDirective: string;
  } {
    switch (signal) {
      case "frustration":
        return {
          warmth: "gentle",
          pacing: "immediate_direct",
          empathyDirective:
            "The user is experiencing frustration or a roadblock. Acknowledge the difficulty with calm, grounded empathy without sounding defensive or robotic. Do not repeat failed advice. Isolate the exact root cause and give one clear, verifiable action step.",
        };
      case "confusion":
        return {
          warmth: "high",
          pacing: "patient_scaffolded",
          empathyDirective:
            "The user feels confused or overwhelmed. Scaffold the explanation using clear, everyday analogies and simpler terms. Avoid dense jargon unless followed immediately by an intuitive plain-language explanation.",
        };
      case "stress":
        return {
          warmth: "gentle",
          pacing: "immediate_direct",
          empathyDirective:
            "The user is under stress or time pressure. Provide calm, reassuring, highly organized assistance. Give the immediate answer or fix on line 1, followed by straightforward steps. Never add panic or unnecessary conceptual theory.",
        };
      case "sadness":
        return {
          warmth: "gentle",
          pacing: "steady",
          empathyDirective:
            "The user conveys low spirits or distress. Respond with gentle, respectful kindness and practical support. Maintain appropriate AI boundaries: do not offer clinical therapy or pretend to experience human emotions, but offer genuine respect, encouragement, and practical assistance.",
        };
      case "disappointment":
        return {
          warmth: "gentle",
          pacing: "patient_scaffolded",
          empathyDirective:
            "The user feels disappointed with a prior outcome. Acknowledge this cleanly without making excuses. Offer a fresh, alternative angle or an improved implementation directly.",
        };
      case "satisfaction":
        return {
          warmth: "high",
          pacing: "celebratory_fluid",
          empathyDirective:
            "The user had a breakthrough or is satisfied. Celebrate their success warmly and naturally (e.g. 'Awesome, glad that solved it!'). Keep momentum moving forward smoothly.",
        };
      case "excitement":
        return {
          warmth: "high",
          pacing: "celebratory_fluid",
          empathyDirective:
            "The user is excited and energetic. Match their enthusiasm naturally and constructively with forward-thinking momentum while keeping technical advice rigorous.",
        };
      case "urgency":
        return {
          warmth: "moderate",
          pacing: "immediate_direct",
          empathyDirective:
            "High urgency detected. Put the direct answer or operational fix immediately on line 1. Eliminate preamble, greetings, and tangential theory.",
        };
      case "curiosity":
        return {
          warmth: "high",
          pacing: "steady",
          empathyDirective:
            "The user is genuinely curious about underlying mechanics. Share insightful, fascinating 'under-the-hood' principles, historical context, or architectural trade-offs.",
        };
      case "uncertainty":
        return {
          warmth: "high",
          pacing: "patient_scaffolded",
          empathyDirective:
            "The user feels unsure of themselves. Reassure them, validate what they did correctly, and clearly clarify the ambiguous step so they feel confident proceeding.",
        };
      case "happiness":
        return {
          warmth: "high",
          pacing: "celebratory_fluid",
          empathyDirective:
            "The user is in high spirits. Share in their positive mood warmly, naturally, and constructively.",
        };
      default:
        return {
          warmth: "moderate",
          pacing: "steady",
          empathyDirective:
            "Maintain a friendly, balanced, collaborative, and natural technical tone.",
        };
    }
  }
}

export const emotionalContextAnalyzer = EmotionalContextAnalyzer.getInstance();
