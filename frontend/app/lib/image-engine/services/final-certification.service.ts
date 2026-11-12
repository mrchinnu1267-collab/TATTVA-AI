/**
 * TATTVA AI - FinalCertificationService (Phase V)
 * Unified service facade providing full production certification audits and reports.
 */

import {
  FinalCertificationRunner,
  SystemAuditor,
  ProviderVerifier,
  FeatureTestMatrix,
  SecurityReliabilityAuditor,
  FinalCertificationReport,
} from "../final-certification";

export class FinalCertificationService {
  private static runner = FinalCertificationRunner.getInstance();
  private static systemAuditor = SystemAuditor.getInstance();
  private static providerVerifier = ProviderVerifier.getInstance();
  private static featureMatrix = FeatureTestMatrix.getInstance();
  private static securityAuditor = SecurityReliabilityAuditor.getInstance();

  public static getCertificationReport(): FinalCertificationReport {
    return this.runner.generateCertificationReport();
  }

  public static auditSubsystems() {
    return this.systemAuditor.auditAllSubsystems();
  }

  public static verifyProviders() {
    return this.providerVerifier.verifyAllProviders();
  }

  public static getFeatureMatrix() {
    return this.featureMatrix.getCertifiedFeatureMatrix();
  }

  public static runSecurityAudit() {
    return this.securityAuditor.runSecurityAudit();
  }
}

