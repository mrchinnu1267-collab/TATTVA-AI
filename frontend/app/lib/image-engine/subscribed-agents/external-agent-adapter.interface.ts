/**
 * TATTVA AI - External Image Agent Adapter Interface
 * Defines standard contract for connecting confidential external subscribed AI image agents.
 * 
 * Strict Zero-API-Key Architecture:
 * - Only permitted, officially documented integration methods are supported.
 * - Credentials remain strictly local or securely stored.
 * - Procedural images are NEVER labeled as external neural AI images.
 */

import {
  SubscribedAgentId,
  ConnectionMode,
  AgentAutomationCapability,
  JobStatus,
  ImageSourceClassification,
  ImageIntentCategory,
} from "./types";

export interface ExternalAgentCapabilities {
  agentId: SubscribedAgentId;
  displayName: string;
  automationCapability: AgentAutomationCapability;
  supportedModes: ConnectionMode[];
  currentMode: ConnectionMode;
  canAutoSubmit: boolean;
  canAutoRetrieve: boolean;
  requiresApiKeys: boolean;
  supportsOAuth: boolean;
  supportsMcp: boolean;
  supportsLocalCompanion: boolean;
  limitations: string[];
  recommendation: string;
}

export interface GenerateImageParams {
  jobId: string;
  prompt: string;
  category?: ImageIntentCategory;
  aspectRatio?: string;
  userId?: string;
  workspaceId?: string;
}

export interface GenerationResult {
  imageDataUri: string;
  format: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  sha256: string;
  sourceClassification: ImageSourceClassification;
  providerJobId: string;
}

export interface IExternalImageAgentAdapter {
  readonly agentId: SubscribedAgentId;
  readonly displayName: string;

  /**
   * Connects to external agent using officially permitted authentication.
   */
  connect(credentials?: Record<string, unknown>): Promise<{ success: boolean; message?: string }>;

  /**
   * Disconnects current external session.
   */
  disconnect(): Promise<boolean>;

  /**
   * Checks live connectivity with the external agent / local connector.
   */
  checkConnection(): Promise<{
    isConnected: boolean;
    mode: ConnectionMode;
    latencyMs?: number;
    error?: string;
    details?: Record<string, unknown>;
  }>;

  /**
   * Submits image generation request to the provider.
   */
  generateImage(params: GenerateImageParams): Promise<{
    jobId: string;
    providerJobId: string;
    status: JobStatus;
  }>;

  /**
   * Polls or checks status of a running generation job.
   */
  getJobStatus(
    jobId: string,
    providerJobId?: string
  ): Promise<{
    status: JobStatus;
    progressPercent: number;
    error?: string;
  }>;

  /**
   * Retrieves final validated image output from the provider.
   */
  retrieveImage(
    jobId: string,
    providerJobId?: string
  ): Promise<GenerationResult>;

  /**
   * Cancels in-flight generation task if permitted by provider.
   */
  cancelGeneration(jobId: string, providerJobId?: string): Promise<boolean>;

  /**
   * Returns honest, grounded capability matrix for this external agent.
   */
  getCapabilities(): ExternalAgentCapabilities;
}
