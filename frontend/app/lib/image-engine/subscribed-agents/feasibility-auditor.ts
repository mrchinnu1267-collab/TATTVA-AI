/**
 * TATTVA AI - Subscribed Image Agent Feasibility Auditor
 * Evaluates provider capability matrix without fake connections or credential leaks.
 */

import {
  CapabilityMatrixItem,
  FeasibilityAuditReport,
  SubscribedAgentId,
  ConnectionMode,
  AgentAutomationCapability,
} from "./types";

const COMPANION_PING_URL = "http://127.0.0.1:4848/health";

/**
 * Pings the local companion daemon on localhost:4848.
 * Returns true if the companion process is alive and responsive.
 */
export async function checkLocalCompanionHealth(): Promise<{
  active: boolean;
  version?: string;
  driver?: string;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(COMPANION_PING_URL, {
      method: "GET",
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      return { active: false, error: `Companion returned HTTP ${res.status}` };
    }

    const data = await res.json().catch(() => ({}));
    return {
      active: true,
      version: data.version || "1.0.0",
      driver: data.driver || "tattva-desktop-bridge",
    };
  } catch (err: any) {
    return {
      active: false,
      error: err.name === "AbortError" ? "Companion ping timed out" : "Companion not reachable on 127.0.0.1:4848",
    };
  }
}

/**
 * Generates an honest, grounded feasibility audit report for Image Agent A and Image Agent B.
 */
export async function auditIntegrationFeasibility(options?: {
  agentAMode?: ConnectionMode;
  agentBMode?: ConnectionMode;
  forceCompanionCheck?: boolean;
}): Promise<FeasibilityAuditReport> {
  const companionStatus = await checkLocalCompanionHealth();

  const auditAgent = (
    agentId: SubscribedAgentId,
    configuredMode?: ConnectionMode
  ): CapabilityMatrixItem => {
    const displayName = agentId === "agent_a" ? "Image Agent A" : "Image Agent B";
    const mode: ConnectionMode = configuredMode || (companionStatus.active ? "local_companion" : "user_assisted");

    let capability: AgentAutomationCapability;
    let canAutoSubmit = false;
    let canAutoRetrieve = false;
    let limitations: string[] = [];
    let recommendation = "";

    if (mode === "local_companion" && companionStatus.active) {
      capability = "automatable_local_connector";
      canAutoSubmit = true;
      canAutoRetrieve = true;
      limitations = [
        "Requires local companion process (tattva-agent-bridge) to remain active on desktop.",
        "Generations executed via desktop loopback (127.0.0.1:4848).",
      ];
      recommendation = "Full local automated generation is active. Keep companion bridge running.";
    } else if (mode === "oauth") {
      capability = "fully_automatable";
      canAutoSubmit = true;
      canAutoRetrieve = true;
      limitations = ["Requires valid OAuth 2.0 PKCE refresh token from provider."];
      recommendation = "Fully automated via official OAuth protocol.";
    } else if (mode === "mcp") {
      capability = companionStatus.active ? "automatable_local_connector" : "partially_automatable";
      canAutoSubmit = companionStatus.active;
      canAutoRetrieve = companionStatus.active;
      limitations = [
        "Requires local MCP host (Claude Desktop / Antigravity) running subscribed tool server.",
      ];
      recommendation = "Launch local MCP server for automated generation.";
    } else {
      // User-assisted only
      capability = "user_assisted_only";
      canAutoSubmit = false;
      canAutoRetrieve = false;
      limitations = [
        "Consumer web subscription does not provide direct cloud API access without paid API keys.",
        "Cloud servers (e.g. Vercel) cannot scrape web sessions protected by Cloudflare Turnstile.",
        "Storing user passwords, session cookies, or OTPs is strictly prohibited.",
      ];
      recommendation =
        "Start the local companion connector ('node companion/tattva-agent-bridge.mjs') to enable fully automated generation.";
    }

    return {
      agentId,
      displayName,
      currentMode: mode,
      capability,
      canAutoSubmit,
      canAutoRetrieve,
      requiresLocalCompanion: mode === "local_companion" || mode === "mcp",
      companionActive: companionStatus.active,
      requiresApiKeys: false, // 100% zero API keys
      limitations,
      recommendation,
    };
  };

  return {
    timestamp: new Date().toISOString(),
    zeroApiKeyGuaranteed: true,
    matrix: {
      agent_a: auditAgent("agent_a", options?.agentAMode),
      agent_b: auditAgent("agent_b", options?.agentBMode),
    },
    policy: {
      credentialScrapingPermitted: false,
      cookieDumpsPermitted: false,
      captchaBypassPermitted: false,
      headlessSessionHijackPermitted: false,
      officialConnectorsOnly: true,
    },
  };
}
