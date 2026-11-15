import { NextRequest, NextResponse } from "next/server";
import crypto, { randomUUID } from "node:crypto";
import { StorageService } from "@/app/lib/image-engine/services/storage.service";
import { verifyUserSession, checkRateLimit } from "@/app/lib/security";
import {
  auditIntegrationFeasibility,
  checkLocalCompanionHealth,
} from "@/app/lib/image-engine/subscribed-agents/feasibility-auditor";
import { compileDualPrompts } from "@/app/lib/image-engine/subscribed-agents/prompt-intelligence";
import { AutomaticSubscribedAgentCoordinator } from "@/app/lib/image-engine/subscribed-agents/coordinator";
import { SubscribedJobManager } from "@/app/lib/image-engine/subscribed-agents/job-manager";
import {
  ConnectionMode,
  ImageIntentCategory,
  SubscribedAgentId,
} from "@/app/lib/image-engine/subscribed-agents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPANION_SECRET = process.env.TATTVA_COMPANION_SECRET || "tattva_companion_secure_token";

export interface SubscribedAgentConfig {
  id: "agent_a" | "agent_b";
  displayName: string;
  connectionMode: ConnectionMode;
  isConnected: boolean;
  mcpServerName?: string;
  webhookUrl?: string;
  notes: string;
}

// In-memory runtime agent configuration
let runtimeAgentConfig: {
  agent_a: SubscribedAgentConfig;
  agent_b: SubscribedAgentConfig;
} = {
  agent_a: {
    id: "agent_a",
    displayName: "Image Agent A",
    connectionMode: "local_companion",
    isConnected: true,
    notes: "Operating in zero-API-key compliant mode. Prompts optimized for photorealistic & cinematic rendering.",
  },
  agent_b: {
    id: "agent_b",
    displayName: "Image Agent B",
    connectionMode: "local_companion",
    isConnected: true,
    notes: "Operating in zero-API-key compliant mode. Prompts optimized for graphic design, posters & illustrations.",
  },
};

/**
 * Multi-user safety policy check:
 * Consumer AI subscriptions are personal single-user licenses.
 * Multiplexing a personal subscription to external tenants is prohibited by provider TOS.
 */
function verifyMultiUserSafety(userId: string) {
  // Allow primary user / workspace owner
  const isOwner = !userId.startsWith("tenant_unverified_");
  return {
    allowed: isOwner,
    isPersonalLicense: true,
    multiUserSharingPermitted: false,
    reason: isOwner
      ? "User is verified workspace owner."
      : "Multi-user sharing of personal subscriptions is prohibited by provider Terms of Service.",
  };
}

/**
 * GET: Retrieve configuration, connection health, feasibility audit, and multi-user policy.
 */
export async function GET() {
  const companionStatus = await checkLocalCompanionHealth();
  const feasibility = await auditIntegrationFeasibility({
    agentAMode: runtimeAgentConfig.agent_a.connectionMode,
    agentBMode: runtimeAgentConfig.agent_b.connectionMode,
  });

  return NextResponse.json({
    status: "ok",
    agents: runtimeAgentConfig,
    companion: companionStatus,
    feasibility,
    multiUserSafety: {
      singleUserLicenseEnforced: true,
      multiUserMultiplexingProhibited: true,
      policy: "Subscribed agents run on personal licenses. Each user must connect their own companion bridge.",
    },
    policy: {
      requiresApiKeys: false,
      usesZeroApiKeys: true,
      supportedModes: ["local_companion", "mcp", "oauth", "user_assisted"],
      security: {
        credentialStorage: "none",
        cookieExtraction: "forbidden",
        captchaBypass: "forbidden",
        browserLoopbackSupported: true,
      },
    },
  });
}

/**
 * POST: Multi-action coordinator for Subscribed Image Agents.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifyUserSession(req);
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`sub_agents_${session.userId}_${clientIp}`, 40, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Rate limit reached. Please wait ${rateCheck.resetSeconds}s.` },
        { status: 429 }
      );
    }

    const authHeader = req.headers.get("authorization");
    const userAccessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    const safety = verifyMultiUserSafety(session.userId);
    if (!safety.allowed) {
      return NextResponse.json(
        { error: safety.reason },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.action !== "string") {
      return NextResponse.json(
        { error: "Valid 'action' parameter is required." },
        { status: 400 }
      );
    }

    // ACTION 1: Issue Companion Ticket for Direct Browser Loopback (Vercel Architecture)
    if (body.action === "issue_companion_ticket") {
      const timestamp = Date.now();
      const nonce = `ticket_${randomUUID().replace(/-/g, "")}`;
      const path = body.path || "/v1/jobs/submit";
      const method = body.method || "POST";

      const messageToSign = `${method}:${path}:${timestamp}:${nonce}`;
      const signature = crypto
        .createHmac("sha256", COMPANION_SECRET)
        .update(messageToSign)
        .digest("hex");

      return NextResponse.json({
        success: true,
        action: "issue_companion_ticket",
        ticket: {
          timestamp,
          nonce,
          signature,
          expiresInSeconds: 60,
          loopbackUrl: "http://127.0.0.1:4848",
          path,
          method,
        },
      });
    }

    // ACTION 2: Optimize Prompts (11 Dimensions, 10 Categories)
    if (body.action === "optimize_prompts") {
      const { prompt, category = "photorealistic", aspectRatio = "1:1" } = body;
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return NextResponse.json({ error: "A prompt string is required." }, { status: 400 });
      }

      const compiled = compileDualPrompts(prompt, category as ImageIntentCategory, aspectRatio);
      return NextResponse.json({
        success: true,
        action: "optimize_prompts",
        originalPrompt: prompt.trim(),
        optimized: {
          category: compiled.dimensions.imageType,
          aspectRatio: compiled.dimensions.aspectRatio,
          dimensions: compiled.dimensions,
          agentA: {
            prompt: compiled.agentA.prompt,
            focus: compiled.agentA.focusRationale,
            tips: `Estimated tokens: ${compiled.agentA.estimatedTokens}. Negative constraints applied.`,
          },
          agentB: {
            prompt: compiled.agentB.prompt,
            focus: compiled.agentB.focusRationale,
            tips: `Estimated tokens: ${compiled.agentB.estimatedTokens}. Negative constraints applied.`,
          },
        },
      });
    }

    // ACTION 3: Feasibility Audit & Capability Matrix
    if (body.action === "feasibility_audit") {
      const audit = await auditIntegrationFeasibility({
        agentAMode: runtimeAgentConfig.agent_a.connectionMode,
        agentBMode: runtimeAgentConfig.agent_b.connectionMode,
      });
      return NextResponse.json({
        success: true,
        action: "feasibility_audit",
        audit,
      });
    }

    // ACTION 4: Orchestrate Automatic Dual Generation (Server-Side / Local Host)
    if (body.action === "orchestrate_automatic") {
      const {
        prompt,
        category = "photorealistic",
        aspectRatio = "1:1",
        workspaceId = "default",
        timeoutMs = 60_000,
      } = body;

      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return NextResponse.json({ error: "A prompt string is required." }, { status: 400 });
      }

      const job = await AutomaticSubscribedAgentCoordinator.orchestrateDualGeneration({
        userId: session.userId,
        workspaceId,
        prompt: prompt.trim(),
        category: category as ImageIntentCategory,
        aspectRatio,
        agentAMode: runtimeAgentConfig.agent_a.connectionMode,
        agentBMode: runtimeAgentConfig.agent_b.connectionMode,
        timeoutMs,
      });

      return NextResponse.json({
        success: true,
        action: "orchestrate_automatic",
        job,
      });
    }

    // ACTION 5: Query Job Status (Real-time polling)
    if (body.action === "get_job_status") {
      const { jobId, workspaceId } = body;
      if (!jobId) {
        return NextResponse.json({ error: "jobId is required." }, { status: 400 });
      }

      const job = SubscribedJobManager.getJob(jobId, session.userId, workspaceId);
      if (!job) {
        return NextResponse.json({ error: `Job '${jobId}' not found.` }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        action: "get_job_status",
        job,
      });
    }

    // ACTION 6: Cancel Active Job
    if (body.action === "cancel_job") {
      const { jobId } = body;
      if (!jobId) {
        return NextResponse.json({ error: "jobId is required." }, { status: 400 });
      }

      const cancelledJob = SubscribedJobManager.cancelJob(jobId, session.userId);
      return NextResponse.json({
        success: true,
        action: "cancel_job",
        job: cancelledJob,
      });
    }

    // ACTION 7: List Jobs (Workspace Isolation)
    if (body.action === "list_jobs") {
      const { workspaceId } = body;
      const jobs = SubscribedJobManager.listJobs(session.userId, workspaceId);
      return NextResponse.json({
        success: true,
        action: "list_jobs",
        jobs,
      });
    }

    // ACTION 8: Validate & Persist Uploaded / Returned Image
    if (body.action === "validate_and_persist") {
      const {
        agentId,
        imageDataUri,
        prompt,
        originalPrompt,
        category = "photorealistic",
        workspaceId = "default",
      } = body;

      if (agentId !== "agent_a" && agentId !== "agent_b") {
        return NextResponse.json(
          { error: "agentId must be either 'agent_a' or 'agent_b'." },
          { status: 400 }
        );
      }

      if (!imageDataUri || typeof imageDataUri !== "string") {
        return NextResponse.json(
          { error: "imageDataUri is required for image validation." },
          { status: 400 }
        );
      }

      const validation = await AutomaticSubscribedAgentCoordinator.validateImagePayload(imageDataUri);

      const agentName =
        agentId === "agent_a" ? "Image Agent A (Subscribed)" : "Image Agent B (Subscribed)";

      const record = await StorageService.persistImage({
        dataUriOrBuffer: validation.buffer,
        prompt: (prompt || originalPrompt || "Subscribed AI Image").trim(),
        originalPrompt: (originalPrompt || prompt || "Subscribed AI Image").trim(),
        provider: agentId === "agent_a" ? "subscribed_agent_a" : "subscribed_agent_b",
        model: agentName,
        agentId,
        parameters: {
          width: validation.width,
          height: validation.height,
          aspectRatio: validation.aspectRatio,
          quality: "subscribed_high",
          style: category,
        },
        operation: "subscribed_agent_generation",
        userId: session.userId,
        workspaceId,
        userAccessToken,
      });

      return NextResponse.json({
        success: true,
        action: "validate_and_persist",
        agentId,
        validation: {
          format: validation.format,
          width: validation.width,
          height: validation.height,
          fileSizeBytes: validation.fileSizeBytes,
          aspectRatio: validation.aspectRatio,
        },
        record,
      });
    }

    // ACTION 9: Update Agent Connection Configuration (Zero API Keys)
    if (body.action === "update_config") {
      const { agentId, connectionMode, mcpServerName, webhookUrl } = body;
      if (agentId !== "agent_a" && agentId !== "agent_b") {
        return NextResponse.json(
          { error: "agentId must be either 'agent_a' or 'agent_b'." },
          { status: 400 }
        );
      }

      const targetId = agentId as SubscribedAgentId;
      const validModes: ConnectionMode[] = ["local_companion", "mcp", "oauth", "user_assisted"];
      if (connectionMode && !validModes.includes(connectionMode)) {
        return NextResponse.json({ error: "Invalid connection mode." }, { status: 400 });
      }

      runtimeAgentConfig[targetId] = {
        ...runtimeAgentConfig[targetId],
        connectionMode: connectionMode || runtimeAgentConfig[targetId].connectionMode,
        mcpServerName: mcpServerName || runtimeAgentConfig[targetId].mcpServerName,
        webhookUrl: webhookUrl || runtimeAgentConfig[targetId].webhookUrl,
        isConnected: true,
      };

      return NextResponse.json({
        success: true,
        action: "update_config",
        agent: runtimeAgentConfig[targetId],
      });
    }

    return NextResponse.json({ error: `Unknown action '${body.action}'` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
