/**
 * TATTVA AI - Customer Support & User Feedback Types (Phase 46)
 * Defines schemas for support tickets, threaded conversations, knowledge base FAQs,
 * feedback ratings, and tenant privacy boundaries.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketCategory =
  | "bug_report"
  | "feature_request"
  | "billing_inquiry"
  | "model_intelligence"
  | "security_concern"
  | "general";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_on_user"
  | "resolved"
  | "closed";

export interface TicketMessage {
  id: string;
  sender: "user" | "support_agent" | "ai_assistant";
  senderName: string;
  message: string;
  timestamp: number;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userEmail: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  messages: TicketMessage[];
}

export type FAQCategory =
  | "getting_started"
  | "pricing_billing"
  | "models_ai"
  | "agents_tools"
  | "documents_data"
  | "security_privacy";

export interface FAQArticle {
  id: string;
  slug: string;
  title: string;
  category: FAQCategory;
  summary: string;
  content: string;
  tags: string[];
  helpfulCount: number;
  helpfulVotes?: number;
  views: number;
}

export type SentimentType = "positive" | "neutral" | "negative";

export interface UserFeedbackItem {
  id: string;
  userId: string;
  rating: number; // 1 to 5
  category: string;
  sentiment: SentimentType;
  feedbackText: string;
  createdAt: number;
}

export interface SupportPlatformMetrics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResolutionTimeHours: number;
  averageResolutionTimeHours?: number;
  satisfactionScore: number; // e.g. 4.8 / 5
  averageSatisfactionScore?: number;
  totalFeedbackReceived: number;
  totalFeedback?: number;
  positiveFeedbackPercent: number;
  lastUpdated: number;
}
