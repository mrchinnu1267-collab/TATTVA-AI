/**
 * TATTVA AI - Context Intelligence & Anaphora Reference Resolver
 * Resolves pronouns, follow-ups, continuous interaction state, and uploaded document references
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ContextReferenceInfo } from "./schema";

export interface ConversationTurn {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Array<{ name?: string; type: string; data?: string }>;
}

export class ContextManager {
  private static instance: ContextManager;

  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Resolves contextual pronouns, follow-ups, and anaphora references across conversation history
   */
  public resolveContext(
    currentPrompt: string,
    history: ConversationTurn[] = [],
    hasAttachments: boolean = false
  ): {
    resolvedPrompt: string;
    referenceInfo: ContextReferenceInfo;
    recentTopics: string[];
    persistedConstraints: string[];
    referencedAttachment?: { name?: string; type: string };
  } {
    const raw = currentPrompt.trim();
    const lower = raw.toLowerCase();

    // 1. Identify previous turns
    const userTurns = history.filter((h) => h.role === "user");
    const assistantTurns = history.filter((h) => h.role === "assistant");

    const lastUserTurn = userTurns.length > 0 ? userTurns[userTurns.length - 1] : undefined;
    const lastAssistantTurn = assistantTurns.length > 0 ? assistantTurns[assistantTurns.length - 1] : undefined;

    // 2. Extract recent topics and file attachments
    const recentTopics = this.extractRecentTopics(history);
    const referencedAttachment = this.findReferencedAttachment(history);

    // 3. Extract persisted constraints across conversation
    const persistedConstraints = this.extractPersistedConstraints(history);

    // 4. Check for anaphora / pronouns
    const referenceInfo: ContextReferenceInfo = {
      hasAnaphora: false,
    };

    let resolvedPrompt = raw;

    // Check Telugu-English follow-up patterns
    // e.g., "deeni explain cheyyi" (explain this), "idi simpler ga cheppu" (say this simpler), "dini code rayi" (write code for this)
    const isTeluguFollowUp =
      /\b(deeni|dini|idi|edi|danini|dannini)\b/i.test(lower) ||
      /\b(simpler ga|short ga|brief ga|detail ga|code rayi|explain cheyyi)\b/i.test(lower);

    // Check English pronoun / follow-up patterns
    const isEnglishFollowUp =
      /^(make it|explain it|convert it|connect it|debug it|fix it|run it|show it|simplify it)\b/i.test(lower) ||
      /\b(make it (simpler|shorter|longer|better|faster|cleaner))\b/i.test(lower) ||
      /^(now connect it to|now integrate it with|now add|now make|now update|now rewrite)\b/i.test(lower) ||
      /^(what about it|why is this happening|how does that work|elaborate on that)\b/i.test(lower) ||
      /^(this|that|it|previous one|last one|same thing)\b/i.test(lower);

    if ((isEnglishFollowUp || isTeluguFollowUp) && (lastUserTurn || lastAssistantTurn)) {
      referenceInfo.hasAnaphora = true;

      const previousTopic = recentTopics[0] || this.extractTopicFromTurn(lastUserTurn?.content || "");
      referenceInfo.referencedTopic = previousTopic;

      // Case A: "Make it simpler" / "idi simpler ga cheppu"
      if (
        /make it (simpler|easier|more basic)/i.test(lower) ||
        /idi simpler ga/i.test(lower) ||
        /explain .* simpler/i.test(lower)
      ) {
        resolvedPrompt = `Explain ${previousTopic} in simpler, easy-to-understand terms with clear analogies`;
        referenceInfo.resolvedMeaning = `Simplify the explanation of ${previousTopic}`;
      }
      // Case B: "Now connect it to <technology>" (e.g. Supabase, Firebase, MongoDB)
      else if (/now connect (it|this) to\s+([a-zA-Z0-9_\- ]+)/i.test(lower)) {
        const targetTechMatch = lower.match(/now connect (it|this) to\s+([a-zA-Z0-9_\- ]+)/i);
        const targetTech = targetTechMatch ? targetTechMatch[2].trim() : "backend";
        resolvedPrompt = `Connect the previously created ${previousTopic} to ${targetTech}, providing complete integration code and configuration`;
        referenceInfo.resolvedMeaning = `Connect ${previousTopic} to ${targetTech}`;
      }
      // Case C: "Now add <feature> to it"
      else if (/now add\s+([a-zA-Z0-9_\- ]+)\s+to (it|this)/i.test(lower)) {
        const featureMatch = lower.match(/now add\s+([a-zA-Z0-9_\- ]+)\s+to (it|this)/i);
        const feature = featureMatch ? featureMatch[1].trim() : "new features";
        resolvedPrompt = `Add ${feature} to the ${previousTopic} created earlier`;
        referenceInfo.resolvedMeaning = `Extend ${previousTopic} with ${feature}`;
      }
      // Case D: "Deeni code rayi" / "Write code for it"
      else if (/deeni code rayi/i.test(lower) || /write code for (it|this)/i.test(lower)) {
        resolvedPrompt = `Write complete production code implementing ${previousTopic}`;
        referenceInfo.resolvedMeaning = `Generate code for ${previousTopic}`;
      }
      // Case E: General pronoun substitution
      else if (previousTopic) {
        resolvedPrompt = raw.replace(/\b(it|this|that|deeni|dini|idi)\b/gi, previousTopic);
        referenceInfo.resolvedMeaning = `Replaced reference with: ${previousTopic}`;
      }
    }

    // 5. Document / Attachment reference resolution
    if ((referencedAttachment || hasAttachments) && !referenceInfo.referencedFile) {
      if (
        /\b(this|the)\s+(uploaded\s+)?(file|document|pdf|notes?|paper|sheet|image|attachment)\b/i.test(lower) ||
        /\b(uploaded\s+document|uploaded\s+file)\b/i.test(lower) ||
        /\b(what does it say|summarize it|extract|read this|explain this|findings)\b/i.test(lower)
      ) {
        referenceInfo.hasAnaphora = true;
        referenceInfo.refersToAttachment = true;
        referenceInfo.referencedFile = referencedAttachment?.name || "uploaded_document";
        referenceInfo.resolvedMeaning = (referenceInfo.resolvedMeaning ? referenceInfo.resolvedMeaning + "; " : "") +
          `Refers to uploaded file: ${referenceInfo.referencedFile}`;
      }
    }

    return {
      resolvedPrompt,
      referenceInfo,
      recentTopics,
      persistedConstraints,
      referencedAttachment,
    };
  }

  private extractRecentTopics(history: ConversationTurn[]): string[] {
    const topics: string[] = [];
    for (let i = history.length - 1; i >= 0; i--) {
      const turn = history[i];
      if (turn.role === "user") {
        const t = this.extractTopicFromTurn(turn.content);
        if (t && !topics.includes(t)) {
          topics.push(t);
        }
      }
    }
    return topics;
  }

  private extractTopicFromTurn(text: string): string {
    const clean = text.replace(/^(please\s+|can you\s+|help me\s+|how to\s+|explain\s+|what is\s+|tell me about\s+)/i, "").trim();
    // Match common core subjects (e.g., "DBMS normalization", "login page", "binary search tree")
    const match = clean.match(/^([a-zA-Z0-9_\- ]{3,40})/);
    return match ? match[1].trim() : clean.slice(0, 30).trim();
  }

  private findReferencedAttachment(history: ConversationTurn[]): { name?: string; type: string } | undefined {
    for (let i = history.length - 1; i >= 0; i--) {
      const att = history[i].attachments?.[0];
      if (att) return { name: att.name, type: att.type };
    }
    return undefined;
  }

  private extractPersistedConstraints(history: ConversationTurn[]): string[] {
    const constraints: string[] = [];
    const fullText = history.map((h) => h.content).join("\n").toLowerCase();

    if (fullText.includes("in typescript") || fullText.includes("use typescript")) {
      constraints.push("Use TypeScript");
    }
    if (fullText.includes("in python") || fullText.includes("use python")) {
      constraints.push("Use Python");
    }
    if (fullText.includes("dark mode") || fullText.includes("dark theme")) {
      constraints.push("Dark mode UI theme");
    }
    if (fullText.includes("no placeholders") || fullText.includes("zero placeholders")) {
      constraints.push("Zero placeholders or truncated code");
    }
    return constraints;
  }
}

export const contextManager = ContextManager.getInstance();
