/**
 * TATTVA AI - Security Sanitizer, Injection Defense & RLS Engine (Phase 21)
 * Prompt injection defense, sensitive leak prevention, audit logging & Supabase RLS policies
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface InjectionCheckResult {
  isSafe: boolean;
  threatType?: "delimiter_injection" | "instruction_override" | "jailbreak_dan" | "system_prompt_leak";
  sanitizedPrompt: string;
  confidenceScore: number;
}

export interface SecurityAuditEntry {
  auditId: string;
  userId: string;
  workspaceId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  flaggedThreat?: string;
  timestamp: number;
}

const INJECTION_PATTERNS = [
  { type: "instruction_override" as const, regex: /\b(ignore (all )?previous instructions|disregard (all )?(prior|system) (prompts|rules)|forget (everything|all instructions))\b/i },
  { type: "jailbreak_dan" as const, regex: /\b(do anything now|dan mode|jailbreak|bypass guidelines|unrestricted mode)\b/i },
  { type: "system_prompt_leak" as const, regex: /\b(repeat your (initial|original|system) prompt|print (the|your) system instructions|show me your base instructions)\b/i },
  { type: "delimiter_injection" as const, regex: /(?:```system|<\/s>|<\|im_start\|>system|<\|system\|>)/i },
];

export class SecuritySanitizer {
  private static instance: SecuritySanitizer;
  private auditLogs: SecurityAuditEntry[] = [];

  public static getInstance(): SecuritySanitizer {
    if (!SecuritySanitizer.instance) {
      SecuritySanitizer.instance = new SecuritySanitizer();
    }
    return SecuritySanitizer.instance;
  }

  /**
   * Inspects prompt for adversarial injections and returns sanitized string
   */
  public inspectPrompt(prompt: string): InjectionCheckResult {
    const raw = prompt.trim();

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.regex.test(raw)) {
        return {
          isSafe: false,
          threatType: pattern.type,
          sanitizedPrompt: "[Adversarial Prompt Injection Blocked by TATTVA Security Gateway]",
          confidenceScore: 98,
        };
      }
    }

    return {
      isSafe: true,
      sanitizedPrompt: raw,
      confidenceScore: 100,
    };
  }

  /**
   * Sanitizes model output to prevent accidental leakage of database secrets or environment variables
   */
  public sanitizeOutput(text: string): string {
    return text
      // Database connection strings (postgres://, mysql://, mongodb://)
      .replace(/(?:postgres|mysql|mongodb|redis):\/\/[^\s:@]+:[^\s:@]+@[^\s/]+/gi, "[REDACTED_DATABASE_URI]")
      // JWT tokens
      .replace(/eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, "[REDACTED_JWT_TOKEN]")
      // AWS Access Keys
      .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_KEY]")
      // Generic Secret Keys
      .replace(/\b(api_key|secret_key|private_key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/gi, "$1: '[REDACTED_SECRET]'");
  }

  /**
   * Records an audit event for enterprise compliance
   */
  public recordAudit(entry: Omit<SecurityAuditEntry, "auditId" | "timestamp">): SecurityAuditEntry {
    const fullEntry: SecurityAuditEntry = {
      ...entry,
      auditId: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    this.auditLogs.push(fullEntry);
    return fullEntry;
  }

  public getAuditLogs(): SecurityAuditEntry[] {
    return [...this.auditLogs];
  }

  /**
   * Generates production Supabase Row-Level Security (RLS) SQL policies for multi-tenant isolation
   */
  public generateWorkspaceRLSPolicies(): string {
    return `-- TATTVA AI Multi-Tenant Workspace Row-Level Security (RLS) Policies
-- Author: kotapati Gowtham Chowdary

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_runs ENABLE ROW LEVEL SECURITY;

-- 1. Workspace membership policy
CREATE POLICY "Users can view workspaces they belong to"
  ON public.workspaces
  FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- 2. Document isolation policy
CREATE POLICY "Users can only access documents in authorized workspaces"
  ON public.workspace_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = workspace_documents.workspace_id
      AND (
        workspaces.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.workspace_members
          WHERE workspace_members.workspace_id = workspaces.id
          AND workspace_members.user_id = auth.uid()
        )
      )
    )
  );

-- 3. Evaluation run tenant policy
CREATE POLICY "Users can only access their own evaluation runs"
  ON public.evaluation_runs
  FOR ALL
  USING (auth.uid() = user_id);
`;
  }
}

export const securitySanitizer = SecuritySanitizer.getInstance();
