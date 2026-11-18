/**
 * TATTVA AI - Automated Incident Responder & Mitigation Engine (Phase 48)
 * Manages incident triage, automated circuit recovery, provider failover, and resolution playbooks.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import crypto from "crypto";
import { IncidentRecord, IncidentSeverity, IncidentStatus } from "./types";

export class IncidentResponder {
  private static instance: IncidentResponder;
  private incidents: Map<string, IncidentRecord> = new Map();

  private constructor() {
    this.seedSampleIncidents();
  }

  public static getInstance(): IncidentResponder {
    if (!IncidentResponder.instance) {
      IncidentResponder.instance = new IncidentResponder();
    }
    return IncidentResponder.instance;
  }

  private seedSampleIncidents(): void {
    const pastIncident: IncidentRecord = {
      id: "inc_provider_timeout_01",
      severity: "medium",
      title: "External Upstream LLM Latency Spike",
      service: "Model Gateway (Gemini 2.5 Flash)",
      status: "resolved",
      createdAt: Date.now() - 3600000 * 48,
      resolvedAt: Date.now() - 3600000 * 47,
      mitigationActionTaken: "provider_failover",
      timeline: [
        {
          timestamp: Date.now() - 3600000 * 48,
          message: "Upstream response latency exceeded 3500ms threshold for 3 consecutive calls.",
          actor: "Automated-Health-Probe",
        },
        {
          timestamp: Date.now() - 3600000 * 47.8,
          message: "Triggered automated playbook: provider_failover to secondary cluster.",
          actor: "Incident-Mitigator",
        },
        {
          timestamp: Date.now() - 3600000 * 47,
          message: "Latency normalized below 120ms. Incident marked resolved.",
          actor: "Health-Monitor",
        },
      ],
    };

    this.incidents.set(pastIncident.id, pastIncident);
  }

  /**
   * Declares an incident record
   */
  public declareIncident(params: {
    title: string;
    service: string;
    severity?: IncidentSeverity;
    initialMessage?: string;
  }): IncidentRecord {
    const id = `inc_${crypto.randomBytes(6).toString("hex")}`;
    const createdAt = Date.now();
    const severity = params.severity || "medium";

    const incident: IncidentRecord = {
      id,
      severity,
      title: params.title,
      service: params.service,
      status: "investigating",
      createdAt,
      timeline: [
        {
          timestamp: createdAt,
          message: params.initialMessage || `Incident declared for ${params.service}`,
          actor: "System-Monitor",
        },
      ],
    };

    this.incidents.set(id, incident);
    return incident;
  }

  /**
   * Executes an automated mitigation playbook
   */
  public async executeMitigation(params: {
    incidentId: string;
    mitigationAction: "provider_failover" | "reset_circuit_breaker" | "flush_cache" | "rate_limit_throttle";
    actor?: string;
  }): Promise<{ success: boolean; incident: IncidentRecord | null; details: string }> {
    const { incidentId, mitigationAction, actor = "Reliability-Engineer" } = params;
    const incident = this.incidents.get(incidentId);

    if (!incident) {
      return { success: false, incident: null, details: "Incident record not found." };
    }

    let actionDetails = "";
    const now = Date.now();

    switch (mitigationAction) {
      case "provider_failover":
        actionDetails = "Rerouted active model inference traffic to high-availability fallback provider.";
        break;
      case "reset_circuit_breaker":
        actionDetails = "Reset tripped circuit breakers to HALF_OPEN to initiate controlled traffic recovery.";
        break;
      case "flush_cache":
        actionDetails = "Purged stale in-memory prompt and document semantic caches.";
        break;
      case "rate_limit_throttle":
        actionDetails = "Activated temporary 50% rate limiting on high-concurrency ingestion endpoints.";
        break;
    }

    incident.status = "resolved";
    incident.resolvedAt = now;
    incident.mitigationActionTaken = mitigationAction;
    incident.timeline.push({
      timestamp: now,
      message: `Executed mitigation: ${mitigationAction}. ${actionDetails}`,
      actor,
    });

    this.incidents.set(incidentId, incident);
    return { success: true, incident, details: actionDetails };
  }

  public getIncident(id: string): IncidentRecord | null {
    return this.incidents.get(id) || null;
  }

  public listIncidents(status?: IncidentStatus): IncidentRecord[] {
    const all = Array.from(this.incidents.values()).sort((a, b) => b.createdAt - a.createdAt);
    if (!status) return all;
    return all.filter((i) => i.status === status);
  }
}
