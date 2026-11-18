/**
 * TATTVA AI - Data Governance & Lifecycle Management Types (Phase 47)
 * Defines retention policies, GDPR/CCPA export archives, "Right to be Forgotten" account purges,
 * and access auditing records.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface DataRetentionPolicy {
  workspaceId: string;
  chatRetentionDays: number;         // default 90 days
  researchRetentionDays: number;     // default 180 days
  documentRetentionDays: number;     // default 365 days
  auditLogRetentionDays: number;     // default 730 days
  codeArtifactRetentionDays: number; // default 180 days
  autoPurgeEnabled: boolean;
  updatedAt: number;
}

export type ExportFormat = "json" | "zip";
export type ExportStatus = "pending" | "processing" | "ready" | "failed";

export interface DataExportArchive {
  exportId: string;
  userId: string;
  format: ExportFormat;
  status: ExportStatus;
  createdAt: number;
  expiresAt: number;
  downloadUrl?: string;
  totalRecordsCount: number;
  dataPayload?: {
    userProfile: Record<string, any>;
    conversations: Array<Record<string, any>>;
    documents: Array<Record<string, any>>;
    supportTickets: Array<Record<string, any>>;
    feedbackItems: Array<Record<string, any>>;
    billingTransactions: Array<Record<string, any>>;
    auditEvents: Array<Record<string, any>>;
    exportMetadata: {
      exportedAt: string;
      platform: string;
      gdprCompliant: boolean;
      ccpaCompliant: boolean;
      sha256Checksum: string;
    };
  };
}

export type PurgeStatus = "pending_confirmation" | "confirmed" | "purged" | "cancelled";

export interface AccountPurgeRequest {
  requestId: string;
  userId: string;
  userEmail: string;
  confirmationCode: string;
  status: PurgeStatus;
  requestedAt: number;
  purgedAt?: number;
  auditHash: string;
}

export type GovernanceAction =
  | "read"
  | "export"
  | "purge"
  | "policy_update"
  | "role_change";

export interface AccessAuditLog {
  id: string;
  timestamp: number;
  actorId: string;
  action: GovernanceAction;
  targetType: "user" | "chat" | "document" | "workspace" | "billing" | "ticket";
  targetId: string;
  ipAddress: string;
  userAgent: string;
  status: "success" | "denied" | "error";
  details?: Record<string, any>;
}

export interface GovernanceMetrics {
  totalExportsGenerated: number;
  totalPurgeRequests: number;
  activeRetentionPolicies: number;
  totalAuditedEvents: number;
  lastAuditedTimestamp: number;
}
