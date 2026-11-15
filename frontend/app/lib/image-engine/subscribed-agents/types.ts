/**
 * TATTVA AI - Dual Subscribed Image Agent Types
 * Fully Automatic & Compliant Zero-API-Key Architecture
 */

export type SubscribedAgentId = "agent_a" | "agent_b";

export type ImageIntentCategory =
  | "poster"
  | "logo"
  | "advertising"
  | "photorealistic"
  | "illustration"
  | "anime"
  | "artwork_3d"
  | "social_creative"
  | "marketing_banner"
  | "product_mockup";

export type ConnectionMode =
  | "local_companion"
  | "mcp"
  | "oauth"
  | "user_assisted";

export type ImageSourceClassification =
  | "external_subscribed_agent_a"
  | "external_subscribed_agent_b"
  | "local_procedural_fallback"
  | "user_uploaded_image";

export type AgentAutomationCapability =
  | "fully_automatable"
  | "automatable_local_connector"
  | "partially_automatable"
  | "user_assisted_only"
  | "unsupported";

export type JobStatus =
  | "queued"
  | "submitting"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

export interface SemanticDimensions {
  imageType: ImageIntentCategory;
  mainSubject: string;
  visualStyle: string;
  composition: string;
  background: string;
  lighting: string;
  colors: string;
  typographyRequirements?: string;
  aspectRatio: string;
  resolution: string;
  negativeConstraints: string[];
}

export interface CompiledAgentPrompt {
  agentId: SubscribedAgentId;
  prompt: string;
  negativePrompt?: string;
  focusRationale: string;
  aspectRatio: string;
  estimatedTokens: number;
}

export interface DualCompiledPrompts {
  originalPrompt: string;
  dimensions: SemanticDimensions;
  agentA: CompiledAgentPrompt;
  agentB: CompiledAgentPrompt;
}

export interface AgentSubJob {
  agentId: SubscribedAgentId;
  agentName: string;
  prompt: string;
  connectionMode: ConnectionMode;
  status: JobStatus;
  providerJobId?: string;
  progressPercent: number;
  outputImage?: string;
  imageUrl?: string;
  metadata?: {
    format?: string;
    width?: number;
    height?: number;
    aspectRatio?: string;
    fileSizeBytes?: number;
    storagePath?: string;
    sourceClassification?: ImageSourceClassification;
    sha256?: string;
  };
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface GenerationJob {
  jobId: string;
  userId: string;
  workspaceId: string;
  originalPrompt: string;
  category: ImageIntentCategory;
  aspectRatio: string;
  status: JobStatus;
  agentAJob: AgentSubJob;
  agentBJob: AgentSubJob;
  fallbackApplied: boolean;
  fallbackNotes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CapabilityMatrixItem {
  agentId: SubscribedAgentId;
  displayName: string;
  currentMode: ConnectionMode;
  capability: AgentAutomationCapability;
  canAutoSubmit: boolean;
  canAutoRetrieve: boolean;
  requiresLocalCompanion: boolean;
  companionActive: boolean;
  requiresApiKeys: boolean;
  limitations: string[];
  recommendation: string;
}

export interface FeasibilityAuditReport {
  timestamp: string;
  zeroApiKeyGuaranteed: boolean;
  matrix: {
    agent_a: CapabilityMatrixItem;
    agent_b: CapabilityMatrixItem;
  };
  policy: {
    credentialScrapingPermitted: boolean;
    cookieDumpsPermitted: boolean;
    captchaBypassPermitted: boolean;
    headlessSessionHijackPermitted: boolean;
    officialConnectorsOnly: boolean;
  };
}
