/**
 * TATTVA AI - Conversation Context Engine
 * Type Definitions & Contracts for Context & History Management
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface ContextMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Array<{ name: string; type: string; data?: string }>;
  timestamp?: number;
}

export interface ConversationSummary {
  conversationId: string;
  workspaceId?: string;
  userId: string;
  summaryText: string;
  keyTopics: string[];
  activeDecisions: string[];
  resolvedErrors: string[];
  turnsSummarized: number;
  lastSummarizedMessageId?: string;
  updatedAt: number;
}

export interface ActiveConversationContext {
  conversationId: string;
  workspaceId?: string;
  userId: string;
  recentMessages: ContextMessage[];
  summary?: ConversationSummary;
  activeProjectTopic?: string;
  activeTechStack?: string[];
  totalTurnsCount: number;
}

