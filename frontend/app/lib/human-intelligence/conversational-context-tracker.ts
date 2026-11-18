/**
 * TATTVA AI - Conversational Context & Reference Continuity Tracker
 * Tracks active topic, completed steps, pending questions, and resolves follow-ups
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface TrackedConversationState {
  currentTopic: string;
  previousTopics: string[];
  activeGoal: string;
  completedSteps: string[];
  pendingQuestions: string[];
  activeSubjectEntity?: string;
  isFollowUpTurn: boolean;
  followUpType?: "why" | "more" | "alternative" | "refine" | "how" | "security" | "troubleshoot" | "generic";
  resolvedAnaphoraQuery?: string;
}

export class ConversationalContextTracker {
  private static instance: ConversationalContextTracker;

  public static getInstance(): ConversationalContextTracker {
    if (!ConversationalContextTracker.instance) {
      ConversationalContextTracker.instance = new ConversationalContextTracker();
    }
    return ConversationalContextTracker.instance;
  }

  /**
   * Tracks conversation state across turns, resolving references and anaphora
   */
  public trackState(
    currentPrompt: string,
    history: Array<{ role: string; content: string }> = []
  ): TrackedConversationState {
    const cleanPrompt = currentPrompt.trim();
    const cleanLower = cleanPrompt.toLowerCase();

    // Scan backwards through history to identify current topic and active subject
    let currentTopic = "General Discussion";
    const previousTopics: string[] = [];
    const completedSteps: string[] = [];
    const pendingQuestions: string[] = [];
    let activeSubjectEntity: string | undefined = undefined;

    for (let i = history.length - 1; i >= 0; i--) {
      const turn = history[i];
      if (turn.role === "user") {
        // Extract technical nouns or entities from past user queries
        const topicMatch = turn.content.match(
          /\b(next\.js|react|typescript|python|fastapi|docker|supabase|auth|authentication|oauth|css|tailwind|api|database|sql|postgres|encryption|security|node|redis|testing|deployment)\b/i
        );
        if (topicMatch && currentTopic === "General Discussion") {
          currentTopic = topicMatch[0].toUpperCase();
        } else if (topicMatch && !previousTopics.includes(topicMatch[0].toUpperCase())) {
          previousTopics.push(topicMatch[0].toUpperCase());
        }

        if (turn.content.includes("?")) {
          pendingQuestions.push(turn.content.slice(0, 100));
        }
      } else if (turn.role === "assistant") {
        // Detect completed steps
        const stepMatches = turn.content.match(/(?:step\s*\d+|1\.|2\.|3\.)[^\n]+/gi);
        if (stepMatches) {
          completedSteps.push(...stepMatches.slice(0, 3).map((s) => s.trim().slice(0, 80)));
        }

        if (!activeSubjectEntity) {
          const entityMatch = turn.content.match(/\b([A-Z][a-zA-Z0-9_]{3,})\b/);
          if (entityMatch) activeSubjectEntity = entityMatch[1];
        }
      }
    }

    // Determine if this turn is a follow-up
    const isShort = cleanPrompt.split(/\s+/).length <= 6;
    let isFollowUpTurn = false;
    let followUpType: TrackedConversationState["followUpType"] = undefined;
    let resolvedAnaphoraQuery = cleanPrompt;

    if (history.length > 0) {
      const lastAssistantTurn = [...history].reverse().find((t) => t.role === "assistant")?.content || "";
      const lastUserTurn = [...history].reverse().find((t) => t.role === "user")?.content || "";

      if (/^(why\??|why is that\??|why so\??)$/i.test(cleanLower)) {
        isFollowUpTurn = true;
        followUpType = "why";
        resolvedAnaphoraQuery = `Why is that the case in relation to: "${lastAssistantTurn.slice(0, 160)}"? Explain the reasoning and underlying causes.`;
      } else if (/^(tell me more|more details?|elaborate|explain more|go deeper|expand on this)\b/i.test(cleanLower)) {
        isFollowUpTurn = true;
        followUpType = "more";
        resolvedAnaphoraQuery = `Provide a deeper, more detailed explanation regarding the previous topic: "${lastUserTurn.slice(0, 120)}". Include real-world context and nuances.`;
      } else if (/^(how so\??|how does that work\??|how\??)$/i.test(cleanLower)) {
        isFollowUpTurn = true;
        followUpType = "how";
        resolvedAnaphoraQuery = `Explain how this works in practice regarding: "${lastAssistantTurn.slice(0, 160)}". Show the mechanism and concrete steps.`;
      } else if (/\b(what about security|and security|how to secure it|is this safe)\b/i.test(cleanLower)) {
        isFollowUpTurn = true;
        followUpType = "security";
        resolvedAnaphoraQuery = `What are the security considerations, threat models, and hardening best practices for: "${lastUserTurn.slice(0, 120)}"?`;
      } else if (/^(make it faster|optimize it|optimize this|optimize this further|improve performance|scale it)\b/i.test(cleanLower)) {
        isFollowUpTurn = true;
        followUpType = "refine";
        resolvedAnaphoraQuery = `Optimize the performance, latency, and efficiency for the solution discussed previously: "${lastUserTurn.slice(0, 120)}".`;
      } else if (/^(give me an example|show the code|code example|show code|give example|show me an example)\b/i.test(cleanLower)) {
        isFollowUpTurn = true;
        followUpType = "more";
        resolvedAnaphoraQuery = `Provide concrete code examples and practical demonstrations for: "${lastUserTurn.slice(0, 120)}".`;
      } else if (
        /\b(fix it|redo it|redo|try again|again|didn't work|not working|another way|alternative|explain differently|what next|part \d+)\b/i.test(cleanLower)
      ) {
        isFollowUpTurn = true;
        followUpType = "alternative";
        resolvedAnaphoraQuery = `The previous solution needs adjustment or follow-up continuation. Address: "${cleanPrompt}" in relation to: "${lastUserTurn.slice(0, 120)}".`;
      } else if (isShort) {
        isFollowUpTurn = true;
        followUpType = "generic";
        resolvedAnaphoraQuery = `${cleanPrompt} (in the context of ${currentTopic}: "${lastUserTurn.slice(0, 100)}")`;
      }
    }

    const activeGoal =
      history.length > 0
        ? `User is working on ${currentTopic}. Active query: "${cleanPrompt.slice(0, 80)}"`
        : `Initial request: "${cleanPrompt.slice(0, 80)}"`;

    return {
      currentTopic,
      previousTopics: previousTopics.slice(0, 5),
      activeGoal,
      completedSteps: completedSteps.slice(0, 5),
      pendingQuestions: pendingQuestions.slice(0, 3),
      activeSubjectEntity,
      isFollowUpTurn,
      followUpType,
      resolvedAnaphoraQuery,
    };
  }

  /**
   * Builds context continuity prompt instructions
   */
  public buildContinuityGuidance(state: TrackedConversationState): string {
    const lines: string[] = [];

    lines.push("CONVERSATIONAL CONTINUITY & CONTEXT PROTOCOL:");
    lines.push(`- Current Ongoing Topic: ${state.currentTopic}`);
    if (state.previousTopics.length > 0) {
      lines.push(`- Earlier Topics in Session: ${state.previousTopics.join(", ")}`);
    }

    if (state.isFollowUpTurn && state.followUpType) {
      lines.push(
        `- ACTIVE FOLLOW-UP: The user's query is an organic continuation of the previous exchange (Follow-up type: ${state.followUpType}).`
      );
      lines.push(
        `- DO NOT ask the user to clarify or repeat information already established in the conversation.`
      );
      lines.push(
        `- Directly connect your answer to the preceding discussion without robotic preamble.`
      );
    }

    if (state.completedSteps.length > 0) {
      lines.push(`- Steps/Milestones Already Covered: ${state.completedSteps.join(" | ")}`);
    }

    return lines.join("\n");
  }
}

export const conversationalContextTracker = ConversationalContextTracker.getInstance();
