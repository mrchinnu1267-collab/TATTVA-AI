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
    // e.g., "deeni explain cheyyi", "idi simpler ga cheppu", "previous answer short ga cheppu", "daanini pdf ga convert cheyyi", "same design lo website create cheyyi", "ee code lo errors fix cheyyi"
    const isTeluguFollowUp =
      /\b(deeni|dini|daanini|dannini|idi|edi|danini|ee|aa)\b/i.test(lower) ||
      /\b(simpler ga|short ga|brief ga|detail ga|code rayi|explain cheyyi|convert cheyyi|errors fix cheyyi|create cheyyi|fix cheyyi|choodu|chudu|chupinchu)\b/i.test(lower) ||
      /\b(next step (enti|emiti)|malli cheppu|inka cheppu|dini ela cheyyali|previous answer short ga)\b/i.test(lower) ||
      /\b(same design lo|same design tho|ikkada nunchi continue|errors fix|artham kaledu|inka detail ga)\b/i.test(lower);

    // Check English pronoun / follow-up patterns
    const isEnglishFollowUp =
      /\b(make it|explain it|convert it|connect it|debug it|fix it|run it|show it|simplify it|implement it|code it|write it|test it)\b/i.test(lower) ||
      /\b(make it (simpler|shorter|longer|better|faster|cleaner))\b/i.test(lower) ||
      /\b(now\s+(connect|integrate|add|make|update|rewrite|implement|code|build)\s+(it|this))\b/i.test(lower) ||
      /\b(what about it|why is this happening|how does that work|elaborate on that|what (is|are) the next steps?|what next)\b/i.test(lower) ||
      /\b(this|that|it|previous one|last one|same thing|same as before|continue from there|add this feature)\b/i.test(lower) ||
      /\b(previous answer|previous code|convert to pdf|convert it to pdf|fix errors in this code)\b/i.test(lower);

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
      // Case A2: "Previous answer short ga cheppu" / "make previous one shorter"
      else if (
        /previous answer short ga/i.test(lower) ||
        /previous answer brief ga/i.test(lower) ||
        /make (it|this|previous one|previous answer) (shorter|brief|concise)/i.test(lower)
      ) {
        resolvedPrompt = `Summarize the previous explanation of ${previousTopic} in concise, brief bullet points without fluff`;
        referenceInfo.resolvedMeaning = `Summarize previous explanation of ${previousTopic} concisely`;
      }
      // Case A3: "Daanini PDF ga convert cheyyi" / "Convert it to PDF"
      else if (
        /daanini pdf/i.test(lower) ||
        /dini pdf/i.test(lower) ||
        /convert (it|this|that|previous one) to pdf/i.test(lower) ||
        /export (it|this) as pdf/i.test(lower)
      ) {
        resolvedPrompt = `Convert the previously discussed ${previousTopic} into a structured downloadable PDF document`;
        referenceInfo.resolvedMeaning = `Convert ${previousTopic} to PDF format`;
      }
      // Case A4: "Same design lo website create cheyyi" / "Create website in the same design"
      else if (
        /same design lo/i.test(lower) ||
        /same design tho/i.test(lower) ||
        /in (the )?same design/i.test(lower) ||
        /using the same styling/i.test(lower)
      ) {
        resolvedPrompt = `Create a responsive website adhering to the same design styling, theme colors, and layout established in ${previousTopic}`;
        referenceInfo.resolvedMeaning = `Replicate design styling from ${previousTopic}`;
      }
      // Case A5: "Ee code lo errors fix cheyyi" / "Fix errors in this code"
      else if (
        /ee code lo errors fix/i.test(lower) ||
        /ee code fix/i.test(lower) ||
        /fix errors in this code/i.test(lower) ||
        /debug this code/i.test(lower)
      ) {
        resolvedPrompt = `Debug and fix all syntax, logic, and runtime errors in the previously provided code for ${previousTopic}, providing corrected complete code`;
        referenceInfo.resolvedMeaning = `Fix errors in code for ${previousTopic}`;
      }
      // Case A6: "Continue from there" / "ikkada nunchi continue"
      else if (
        /continue from (there|here)/i.test(lower) ||
        /ikkada nunchi continue/i.test(lower) ||
        /carry on from where we left/i.test(lower)
      ) {
        resolvedPrompt = `Continue the implementation of ${previousTopic} from the last established milestone without repeating prior steps`;
        referenceInfo.resolvedMeaning = `Continue progress on ${previousTopic}`;
      }
      // Case B: "Now connect it to <technology>" (e.g. Supabase, Firebase, MongoDB)
      else if (/now connect (it|this) to\s+([a-zA-Z0-9_\- ]+)/i.test(lower)) {
        const targetTechMatch = lower.match(/now connect (it|this) to\s+([a-zA-Z0-9_\- ]+)/i);
        const targetTech = targetTechMatch ? targetTechMatch[2].trim() : "backend";
        resolvedPrompt = `Connect the previously created ${previousTopic} to ${targetTech}, providing complete integration code and configuration`;
        referenceInfo.resolvedMeaning = `Connect ${previousTopic} to ${targetTech}`;
      }
      // Case C: "Now add <feature> to it"
      else if (/now add\s+([a-zA-Z0-9_\- ]+)\s+to (it|this)/i.test(lower) || /add this feature/i.test(lower)) {
        const featureMatch = lower.match(/now add\s+([a-zA-Z0-9_\- ]+)\s+to (it|this)/i);
        const feature = featureMatch ? featureMatch[1].trim() : "the requested feature";
        resolvedPrompt = `Add ${feature} to the ${previousTopic} created earlier`;
        referenceInfo.resolvedMeaning = `Extend ${previousTopic} with ${feature}`;
      }
      // Case D: "Deeni code rayi" / "Write code for it"
      else if (/deeni code rayi/i.test(lower) || /write code for (it|this)/i.test(lower)) {
        resolvedPrompt = `Write complete production code implementing ${previousTopic}`;
        referenceInfo.resolvedMeaning = `Generate code for ${previousTopic}`;
      }
      // Case E: "Next step enti" / "What is the next step"
      else if (/next step (enti|emiti)/i.test(lower) || /what (is|are) the next steps?/i.test(lower)) {
        resolvedPrompt = `Explain the immediate next steps to execute or continue ${previousTopic}`;
        referenceInfo.resolvedMeaning = `Provide next implementation steps for ${previousTopic}`;
      }
      // Case F: "Malli cheppu" / "Explain again"
      else if (/malli cheppu/i.test(lower) || /explain (again|once more)/i.test(lower)) {
        resolvedPrompt = `Re-explain ${previousTopic} from fundamentals with different illustrative examples`;
        referenceInfo.resolvedMeaning = `Re-explain ${previousTopic}`;
      }
      // Case G: General pronoun substitution
      else if (previousTopic) {
        resolvedPrompt = raw.replace(/\b(it|this|that|deeni|dini|daanini|dannini|idi)\b/gi, previousTopic);
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

  /**
   * Intelligently filters and extracts the most semantically relevant conversation turns,
   * avoiding context degradation from blindly dumping long historical logs
   */
  public selectRelevantContextTurns(
    history: ConversationTurn[],
    currentPrompt: string,
    maxTurns: number = 6
  ): ConversationTurn[] {
    if (history.length <= maxTurns) {
      return history;
    }

    const currentLower = currentPrompt.toLowerCase();
    const queryTokens = new Set(
      currentLower
        .replace(/[^a-z0-9\s]/gi, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3)
    );

    // Always preserve the latest 2 turns for immediate conversational flow
    const recentTail = history.slice(-2);
    const earlierCandidates = history.slice(0, -2);

    // Score earlier candidate turns based on semantic token overlap and attachment presence
    const scored = earlierCandidates.map((turn, index) => {
      let score = 0;
      const turnTokens = turn.content.toLowerCase().split(/\s+/);
      for (const t of turnTokens) {
        if (queryTokens.has(t)) score += 2;
      }
      if (turn.attachments && turn.attachments.length > 0) score += 4;
      if (turn.role === "system") score += 5;
      return { turn, index, score };
    });

    const needed = Math.max(1, maxTurns - recentTail.length);
    const topScored = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, needed)
      .sort((a, b) => a.index - b.index)
      .map((item) => item.turn);

    return [...topScored, ...recentTail];
  }

  /**
   * Builds a rolling conversational context digest for long multi-turn sessions (> 10-12 turns),
   * ensuring early system architectural constraints, user requirements, schemas, and milestones
   * are preserved without falling victim to sliding-window context amnesia.
   */
  public buildRollingContextDigest<T extends ConversationTurn = ConversationTurn>(
    history: T[],
    keepRecentCount: number = 10
  ): {
    recentTurns: T[];
    contextDigest?: string;
  } {
    if (history.length <= keepRecentCount) {
      return { recentTurns: history };
    }

    const olderTurns = history.slice(0, history.length - keepRecentCount);
    const recentTurns = history.slice(history.length - keepRecentCount);

    const userAsks: string[] = [];
    const keyDecisions: string[] = [];

    for (const turn of olderTurns) {
      if (turn.role === "user") {
        const text = turn.content.trim().replace(/\s+/g, " ");
        if (text.length > 0) {
          userAsks.push(text.length > 120 ? text.slice(0, 117) + "..." : text);
        }
      } else if (turn.role === "assistant") {
        const firstLine = turn.content.split("\n")[0].trim().replace(/^#+\s*/, "");
        if (firstLine && firstLine.length > 10) {
          keyDecisions.push(firstLine.slice(0, 90));
        }
      }
    }

    const persistedConstraints = this.extractPersistedConstraints(olderTurns);

    const digestParts: string[] = [
      `[PERSISTED MULTI-TURN CONVERSATION MILESTONES (${olderTurns.length} earlier turns compacted)]:`,
    ];

    if (persistedConstraints.length > 0) {
      digestParts.push(`- Active Constraints: ${persistedConstraints.join(", ")}`);
    }

    if (userAsks.length > 0) {
      digestParts.push(`- Earlier Topics Discussed:`);
      userAsks.slice(-5).forEach((ask) => {
        digestParts.push(`  * ${ask}`);
      });
    }

    if (keyDecisions.length > 0) {
      digestParts.push(`- Established Milestone Outcomes: ${keyDecisions.slice(-3).join(" | ")}`);
    }

    return {
      recentTurns,
      contextDigest: digestParts.join("\n"),
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
