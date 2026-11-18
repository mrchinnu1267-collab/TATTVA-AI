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
    const isTeluguFollowUp =
      /\b(deeni|dini|daanini|dannini|idi|edi|danini|ee|aa)\b/i.test(lower) ||
      /\b(simpler ga|short ga|brief ga|detail ga|code rayi|explain cheyyi|convert cheyyi|errors fix cheyyi|create cheyyi|fix cheyyi|choodu|chudu|chupinchu)\b/i.test(lower) ||
      /\b(next step (enti|emiti)|malli cheppu|inka cheppu|dini ela cheyyali|previous answer short ga)\b/i.test(lower) ||
      /\b(same design lo|same design tho|ikkada nunchi continue|errors fix|artham kaledu|ardham kaledu|inka detail ga|enduku ala|ela)\b/i.test(lower);

    // Check Hindi-English (Hinglish) follow-up patterns
    const isHindiFollowUp =
      /\b(iska|uska|yeh|woh|isko|usse|isse|batao|samjhao|phir se|aur batao|kaise karein|samajh nahi aaya)\b/i.test(lower) ||
      /\b(thoda simple|thoda aasan|short me|detail me|code likho|kya matlab|kyun aisa|kaise hoga)\b/i.test(lower);

    // Check English pronoun / conversational follow-up patterns
    const isEnglishFollowUp =
      /\b(make it|explain it|convert it|connect it|debug it|fix it|run it|show it|simplify it|implement it|code it|write it|test it)\b/i.test(lower) ||
      /\b(make it (simpler|shorter|longer|better|faster|cleaner))\b/i.test(lower) ||
      /\b(now\s+(connect|integrate|add|make|update|rewrite|implement|code|build)\s+(it|this))\b/i.test(lower) ||
      /\b(what about it|why is this happening|how does that work|elaborate on that|what (is|are) the next steps?|what next)\b/i.test(lower) ||
      /\b(this|that|it|previous one|last one|same thing|same as before|continue from there|add this feature)\b/i.test(lower) ||
      /\b(previous answer|previous code|that code|the code|this code|what does that code do|explain that code|debug that code|optimize that code)\b/i.test(lower) ||
      /\b(convert to pdf|convert it to pdf|fix errors in this code)\b/i.test(lower) ||
      /^(continue|please continue|go on|proceed|keep going|carry on)\b/i.test(lower) ||
      /^(why\??|why is that\??|why so\??|how so\??|how does that work\??|tell me more|elaborate|explain more|go deeper)\b/i.test(lower) ||
      /^(can you explain it again\??|explain it again|explain differently|simpler please|eli5)\b/i.test(lower) ||
      /^(what about|how about|and)\s+[a-zA-Z0-9_\-\s]+\??$/i.test(lower) ||
      /\b(i don't understand (this|it|anything)|don't get it|lost me)\b/i.test(lower);

    if ((isEnglishFollowUp || isTeluguFollowUp || isHindiFollowUp) && (lastUserTurn || lastAssistantTurn)) {
      referenceInfo.hasAnaphora = true;

      const previousTopic = recentTopics[0] || this.extractTopicFromTurn(lastUserTurn?.content || "");
      referenceInfo.referencedTopic = previousTopic;

      // Case 0: "Why?" / "Why so?" / "Enduku ala?" / "Kyun?"
      if (/^(why\??|why so\??|why is that\??|enduku ala|kyun aisa)\b/i.test(lower)) {
        resolvedPrompt = `Explain the underlying reasons, causality, and mechanisms behind ${previousTopic}`;
        referenceInfo.resolvedMeaning = `Explain causal mechanisms for ${previousTopic}`;
      }
      // Case 0B: "Tell me more" / "Inka cheppu" / "Aur batao"
      else if (/^(tell me more|elaborate|explain more|go deeper|inka cheppu|aur batao)\b/i.test(lower)) {
        resolvedPrompt = `Provide a deeper, more detailed explanation of ${previousTopic} covering edge cases, real-world examples, and best practices`;
        referenceInfo.resolvedMeaning = `Deep dive on ${previousTopic}`;
      }
      // Case 0C: "How so?" / "Ela?" / "Kaise?"
      else if (/^(how so\??|how does that work\??|ela\??|kaise\??)\b/i.test(lower)) {
        resolvedPrompt = `Explain in practical detail how this works regarding ${previousTopic}`;
        referenceInfo.resolvedMeaning = `Practical mechanism of ${previousTopic}`;
      }
      // Case 0D: "Can you explain it again?" / "Explain differently"
      else if (/explain.*(again|differently)|malli cheppu|phir se samjhao/i.test(lower)) {
        resolvedPrompt = `Explain ${previousTopic} from a fresh, alternative perspective using different intuitive analogies without repeating the previous wording`;
        referenceInfo.resolvedMeaning = `Alternative fresh explanation of ${previousTopic}`;
      }
      // Case 0E: "What about <X>?" / "And <X>?"
      else if (/^(what about|how about|and)\s+([a-zA-Z0-9_\-\s]+)\??$/i.test(lower)) {
        const xMatch = lower.match(/^(?:what about|how about|and)\s+([a-zA-Z0-9_\-\s]+)\??$/i);
        const subjectX = xMatch ? xMatch[1].trim() : "that aspect";
        resolvedPrompt = `Explain how ${subjectX} relates to and integrates with ${previousTopic} previously discussed`;
        referenceInfo.resolvedMeaning = `Integrate ${subjectX} with ${previousTopic}`;
      }
      // Case 0F: "I don't understand this at all" / "Naku ee topic ardham kaledu" / "Samajh nahi aaya"
      else if (/don't understand|ardham kaledu|artham kaledu|samajh nahi aaya/i.test(lower)) {
        resolvedPrompt = `Explain ${previousTopic} patiently using simpler language, intuitive real-world analogies, and clear everyday examples`;
        referenceInfo.resolvedMeaning = `Patient simplified explanation of ${previousTopic}`;
      }

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
      // Case A6: "Continue" / "Continue from there" / "ikkada nunchi continue"
      else if (
        /^(continue|please continue|go on|proceed|keep going|carry on)\b/i.test(lower) ||
        /continue from (there|here)/i.test(lower) ||
        /ikkada nunchi continue/i.test(lower) ||
        /carry on from where we left/i.test(lower)
      ) {
        resolvedPrompt = `Continue the explanation and implementation of ${previousTopic} from the last established point, seamlessly continuing the next steps without repeating prior content`;
        referenceInfo.resolvedMeaning = `Continue progression on ${previousTopic}`;
      }
      // Case A7: "That code" / "the code" / "what does that code do"
      else if (
        /\b(that code|the code|previous code|this code)\b/i.test(lower) ||
        /\b(explain that code|what does that code do|debug that code|optimize that code)\b/i.test(lower)
      ) {
        if (/explain|what does/i.test(lower)) {
          resolvedPrompt = `Explain how the code for ${previousTopic} works step-by-step, including line-by-line breakdown and logic flow`;
        } else if (/optimize|refactor|faster|efficient/i.test(lower)) {
          resolvedPrompt = `Optimize and refactor the code for ${previousTopic} for higher performance and cleaner design`;
        } else if (/debug|fix|error/i.test(lower)) {
          resolvedPrompt = `Debug and fix any errors or edge cases in the code for ${previousTopic}`;
        } else {
          resolvedPrompt = `Provide a detailed technical review of the code previously provided for ${previousTopic}`;
        }
        referenceInfo.resolvedMeaning = `Analyze and address code for ${previousTopic}`;
      }
      // Case A8: "The previous answer" / "in the previous answer"
      else if (/\b(previous answer|last answer)\b/i.test(lower)) {
        if (/explain|clarify|elaborate|detail/i.test(lower)) {
          resolvedPrompt = `Elaborate and provide deeper technical detail on the previous answer regarding ${previousTopic}`;
        } else if (/why/i.test(lower)) {
          resolvedPrompt = `Explain the rationale, evidence, and underlying principles behind the previous answer regarding ${previousTopic}`;
        } else {
          resolvedPrompt = `Review and clarify the points stated in the previous answer about ${previousTopic}`;
        }
        referenceInfo.resolvedMeaning = `Reference and expand on previous answer regarding ${previousTopic}`;
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
      // Case G: Targeted pronoun substitution (strictly when direct subject/object of query)
      else if (previousTopic) {
        if (
          /^(what is|how does|why does|tell me about|explain|describe|what about)\s+(it|this|that|deeni|dini|idi)\b/i.test(lower) ||
          /^(it|this|that)\s+(is|works|means)\b/i.test(lower)
        ) {
          resolvedPrompt = raw.replace(/\b(it|this|that|deeni|dini|idi)\b/i, previousTopic);
          referenceInfo.resolvedMeaning = `Resolved reference to: ${previousTopic}`;
        } else {
          referenceInfo.resolvedMeaning = `Contextual antecedent: ${previousTopic}`;
        }
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
   * Builds a rolling conversational context digest for long multi-turn sessions (> 12-20 turns),
   * ensuring early system architectural constraints, user requirements, schemas, and milestones
   * are preserved without falling victim to sliding-window context amnesia.
   */
  public buildRollingContextDigest<T extends ConversationTurn = ConversationTurn>(
    history: T[],
    keepRecentCount: number = 40
  ): {
    recentTurns: T[];
    contextDigest?: string;
  } {
    if (history.length <= keepRecentCount) {
      return { recentTurns: history };
    }

    // Foundational opening turns (where project identity, rules, and core parameters are established)
    const foundationalTurns = history.slice(0, 8);
    const recentTurns = history.slice(history.length - keepRecentCount);
    const allOlderTurns = history.slice(0, history.length - keepRecentCount);

    const userAsks: string[] = [];
    const keyDecisions: string[] = [];

    for (const turn of allOlderTurns) {
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

    const persistedConstraints = this.extractPersistedConstraints(history);

    const digestParts: string[] = [
      `[PERSISTED MULTI-TURN CONVERSATION MILESTONES & SYSTEM CONSTRAINTS (${allOlderTurns.length} earlier turns compacted)]:`,
    ];

    if (persistedConstraints.length > 0) {
      digestParts.push(`- Established System Constraints & Context:`);
      persistedConstraints.forEach((c) => digestParts.push(`  * ${c}`));
    }

    if (userAsks.length > 0) {
      digestParts.push(`- Foundational Directives & Decisions:`);
      const keyAsks = Array.from(new Set([...userAsks.slice(0, 4), ...userAsks.slice(-4)]));
      keyAsks.forEach((ask) => {
        digestParts.push(`  * ${ask}`);
      });
    }

    if (keyDecisions.length > 0) {
      digestParts.push(`- Established Milestone Outcomes: ${keyDecisions.slice(-4).join(" | ")}`);
    }

    // Include foundational turns at the beginning of the message window if not already present
    const foundationalToInclude = foundationalTurns.filter(
      (ft) => !recentTurns.some((rt) => rt.content === ft.content && rt.role === ft.role)
    );

    return {
      recentTurns: [...foundationalToInclude, ...recentTurns],
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
      } else if (turn.role === "assistant" && topics.length === 0) {
        // Fallback: extract prominent topic from assistant header/first line
        const firstLine = turn.content.split("\n")[0].replace(/^#+\s*/, "").trim();
        if (firstLine && firstLine.length > 3 && firstLine.length < 60) {
          topics.push(firstLine);
        }
      }
    }
    return topics;
  }

  private extractTopicFromTurn(text: string): string {
    const clean = text
      .replace(/^(please\s+|can you\s+|help me\s+|how to\s+|explain\s+|what is\s+|tell me about\s+|write code for\s+|write an algorithm for\s+)/i, "")
      .replace(/[?.,!]+$/g, "")
      .trim();
    // Match common core subjects (e.g., "Dijkstra's algorithm", "DBMS normalization", "login page", "binary search tree")
    const match = clean.match(/^([a-zA-Z0-9_\- '"]{3,50})/);
    return match ? match[1].replace(/['"]+$/g, "").trim() : clean.slice(0, 40).trim();
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
    const fullText = history.map((h) => h.content).join("\n");
    const lower = fullText.toLowerCase();

    // Check project names / codenames
    const codenameMatch = fullText.match(/(?:project\s+(?:codenamed?|name(?:\s+is)?)|codenamed?|app\s+called)\s+['"]?([a-zA-Z0-9_\-]+(?:\s+[a-zA-Z0-9_\-]+)?)['"]?/i);
    if (codenameMatch && codenameMatch[1].trim()) {
      constraints.push(`Project Codename: ${codenameMatch[1].trim()}`);
    }

    // Check explicit user rules (Rule Alpha, Rule Beta, Rule 1, etc.)
    const ruleMatches = fullText.matchAll(/rule\s+([a-zA-Z0-9_-]+)[:\s]+([^\n\.\,]+)/gi);
    for (const rm of ruleMatches) {
      constraints.push(`Rule ${rm[1]}: ${rm[2].trim()}`);
    }

    // Check named roles (architect, lead, developer, etc.)
    const nameMatch = fullText.match(/(?:principal architect|architect|lead engineer|team lead|developer|author|creator|founder)\s+(?:is\s+(?:named\s+)?)?([A-Z][a-zA-Z]+)/i);
    if (nameMatch && nameMatch[1].trim()) {
      constraints.push(`Architect / Lead: ${nameMatch[1].trim()}`);
    }

    // Check database or storage technology specifications
    const dbMatch = fullText.match(/(?:primary database|database|storage engine)\s+(?:must be|is|shall be)\s+([A-Za-z0-9_\-]+)/i);
    if (dbMatch && dbMatch[1].trim()) {
      constraints.push(`Primary Database: ${dbMatch[1].trim()}`);
    }

    // Check auth specifications
    const authMatch = fullText.match(/(?:authentication mechanism|auth mechanism|authentication)\s+(?:must be|is)\s+([^\n\.\,]+)/i);
    if (authMatch && authMatch[1].trim()) {
      constraints.push(`Authentication: ${authMatch[1].trim()}`);
    }

    if (lower.includes("in typescript") || lower.includes("use typescript")) {
      constraints.push("Use TypeScript");
    }
    if (lower.includes("in python") || lower.includes("use python")) {
      constraints.push("Use Python");
    }
    if (lower.includes("dark mode") || lower.includes("dark theme")) {
      constraints.push("Dark mode UI theme");
    }
    if (lower.includes("no placeholders") || lower.includes("zero placeholders")) {
      constraints.push("Zero placeholders or truncated code");
    }
    return Array.from(new Set(constraints));
  }
}

export const contextManager = ContextManager.getInstance();
