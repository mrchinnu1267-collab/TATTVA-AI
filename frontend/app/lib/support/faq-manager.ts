/**
 * TATTVA AI - Authoritative Knowledge Base & FAQ Engine (Phase 46)
 * Searchable reference guides, troubleshooting playbooks, and platform manuals.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { FAQArticle, FAQCategory } from "./types";

export class FAQManager {
  private static instance: FAQManager;
  private articles: Map<string, FAQArticle> = new Map();

  private constructor() {
    this.initializeDefaultArticles();
  }

  public static getInstance(): FAQManager {
    if (!FAQManager.instance) {
      FAQManager.instance = new FAQManager();
    }
    return FAQManager.instance;
  }

  private initializeDefaultArticles(): void {
    const list: FAQArticle[] = [
      {
        id: "faq_1",
        slug: "getting-started-with-tattva-ai",
        title: "Getting Started with TATTVA AI Conversational Platform",
        category: "getting_started",
        summary: "Learn how to start chatting, select AI models, and utilize multimodality.",
        content: `TATTVA AI is an intelligent conversational and productivity AI platform. To begin:
1. Navigate to /chat to start interacting with our multi-model intelligence engine.
2. Select models based on your task: Gemini 2.5 Flash for speed, Gemini 2.5 Pro for deep reasoning, or DeepSeek V3 for complex math and coding.
3. Attach files, images, or documents to ground your conversations with verified facts.`,
        tags: ["getting_started", "chat", "models"],
        helpfulCount: 42,
        views: 312,
      },
      {
        id: "faq_2",
        slug: "understanding-subscription-plans-and-quotas",
        title: "Understanding Subscription Tiers, Tokens, and Quota Limits",
        category: "pricing_billing",
        summary: "Detailed overview of Free, Pro, and Enterprise quotas, token limits, and invoice access.",
        content: `TATTVA AI offers three plan tiers:
- Community Free: 250,000 monthly tokens, 100 requests/day, 100MB cloud storage.
- Professional Creator ($20/mo or $190/yr): 5,000,000 monthly tokens, 2,500 requests/day, 10GB storage, access to DeepSeek V3 and Autonomous Coding Agents.
- Enterprise Sovereign ($150/mo or $1,440/yr): 50,000,000 tokens, 100GB storage, custom SLM fine-tuning, and dedicated support SLA.
Manage your plan or download invoices anytime at /billing.`,
        tags: ["billing", "pricing", "quotas", "tokens"],
        helpfulCount: 88,
        views: 650,
      },
      {
        id: "faq_3",
        slug: "how-autonomous-agents-work",
        title: "How Autonomous AI Agents Execute Complex Multi-Step Tasks",
        category: "agents_tools",
        summary: "Learn how the 10-state agent execution machine plans, invokes tools, and self-corrects.",
        content: `Autonomous Agents in TATTVA AI use a 10-state machine:
1. Intent decomposition and Directed Acyclic Graph (DAG) task planning.
2. Sandboxed tool invocation across 30+ native tools (code execution, web crawling, data science).
3. Result verification with zero-placeholder enforcement.
4. Human approval gates for critical actions (such as database purges or financial calls).`,
        tags: ["agents", "tools", "planning", "sandbox"],
        helpfulCount: 65,
        views: 480,
      },
      {
        id: "faq_4",
        slug: "document-intelligence-and-rag",
        title: "Extracting, Summarizing, and Querying Documents with RAG",
        category: "documents_data",
        summary: "Supported formats (PDF, DOCX, XLSX, CSV, PPTX), semantic chunking, and grounded Q&A.",
        content: `The Document Intelligence Engine supports PDF, DOCX, XLSX, CSV, PPTX, and source code files:
- Semantic markdown-aware chunking preserves table formatting and headings.
- Multi-doc comparison allows side-by-side contract or report analysis.
- Grounded citations include exact page numbers and quotes to prevent hallucination.`,
        tags: ["documents", "rag", "pdf", "extraction"],
        helpfulCount: 51,
        views: 410,
      },
      {
        id: "faq_5",
        slug: "security-privacy-and-data-protection",
        title: "Security Guarantees, PII Protection, and Tenant Isolation",
        category: "security_privacy",
        summary: "Zero-leakage PII masking, indirect prompt injection defense, and Supabase RLS policies.",
        content: `TATTVA AI enforces enterprise-grade security:
- Autonomous PII Masking: Credit card numbers (Luhn checked), SSNs, emails, phone numbers, and API tokens are masked prior to external dispatch.
- Zero-Trust Content Containment: Third-party documents and web pages are isolated to neutralize indirect prompt injections.
- Multi-Tenant RLS: PostgreSQL Row-Level Security guarantees cross-tenant data isolation.`,
        tags: ["security", "privacy", "pii", "rls"],
        helpfulCount: 110,
        views: 890,
      },
    ];

    for (const a of list) {
      a.helpfulVotes = a.helpfulCount;
      this.articles.set(a.id, a);
      this.articles.set(a.slug, a);
    }
  }

  public listArticles(category?: FAQCategory): FAQArticle[] {
    const seen = new Set<string>();
    const list: FAQArticle[] = [];
    for (const a of this.articles.values()) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        if (!category || a.category === category) {
          list.push(a);
        }
      }
    }
    return list;
  }

  public searchArticles(query: string): FAQArticle[] {
    if (!query || query.trim().length === 0) {
      return this.listArticles();
    }
    const q = query.toLowerCase().trim();
    const seen = new Set<string>();
    const results: FAQArticle[] = [];

    for (const a of this.articles.values()) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        const match =
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q));
        if (match) {
          results.push(a);
        }
      }
    }

    return results;
  }

  public getArticle(idOrSlug: string): FAQArticle | null {
    const article = this.articles.get(idOrSlug);
    if (article) {
      article.views++;
      return article;
    }
    return null;
  }

  public voteHelpful(idOrSlug: string): boolean {
    const article = this.articles.get(idOrSlug);
    if (article) {
      article.helpfulCount++;
      article.helpfulVotes = article.helpfulCount;
      return true;
    }
    return false;
  }
}
