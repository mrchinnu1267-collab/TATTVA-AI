export type CertificationPillarId =
  | "technical_architecture"
  | "functional_capabilities"
  | "zero_trust_security"
  | "sla_performance"
  | "disaster_recovery";

export interface PillarAuditResult {
  pillar: CertificationPillarId;
  title: string;
  status: "certified" | "failed";
  score: number; // 0 - 100
  checksPassed: number;
  totalChecks: number;
  verifiedCriteria: string[];
  auditEvidence: Record<string, any>;
}

export interface PlatformCertificationRecord {
  releaseVersion: string;
  releaseCommit: string;
  certifiedAt: number;
  certifiedBy: string;
  overallReadinessScore: number; // 100
  productionCertified: boolean;
  pillars: PillarAuditResult[];
  digitalSignature: string;
  operationalStatus: string;
}
