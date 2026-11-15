"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Upload,
  ExternalLink,
  ShieldCheck,
  Download,
  FolderPlus,
  RefreshCw,
  Camera,
  Layers,
  ArrowRight,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  Maximize2,
  X,
  Lock,
  Zap,
  Radio,
  StopCircle,
} from "lucide-react";
import { triggerDownload } from "../../lib/download-helper";
import { WorkspaceHistorySuite } from "./WorkspaceHistorySuite";

export type ImageCategory =
  | "photorealistic"
  | "illustration"
  | "poster"
  | "logo"
  | "advertising"
  | "anime"
  | "artwork_3d"
  | "social_creative"
  | "marketing_banner"
  | "product_mockup";

interface OptimizedResult {
  category: string;
  aspectRatio: string;
  agentA: {
    prompt: string;
    focus: string;
    tips: string;
  };
  agentB: {
    prompt: string;
    focus: string;
    tips: string;
  };
}

interface ValidatedImageRecord {
  id: string;
  url: string;
  agentId: "agent_a" | "agent_b";
  agentName: string;
  prompt: string;
  format: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  createdAt: string;
  sourceClassification?: "external_subscribed_agent_a" | "external_subscribed_agent_b" | "local_procedural_fallback" | "user_uploaded_image";
}

interface DualSubscribedAgentSuiteProps {
  onBackToStudio?: () => void;
  isDark?: boolean;
}

export function DualSubscribedAgentSuite({
  onBackToStudio,
  isDark = true,
}: DualSubscribedAgentSuiteProps) {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<ImageCategory>("photorealistic");
  const [aspectRatio, setAspectRatio] = useState("1:1");

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoStatusText, setAutoStatusText] = useState<string>("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [optimizedData, setOptimizedData] = useState<OptimizedResult | null>(null);

  // Companion status from server
  const [companionStatus, setCompanionStatus] = useState<{
    active: boolean;
    version?: string;
  }>({ active: false });

  // Agent Results
  const [agentAImage, setAgentAImage] = useState<ValidatedImageRecord | null>(null);
  const [agentBImage, setAgentBImage] = useState<ValidatedImageRecord | null>(null);
  const [preferredAgent, setPreferredAgent] = useState<"agent_a" | "agent_b" | null>(null);

  // Copy Feedback
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);

  // Upload & Validation States
  const [validatingA, setValidatingA] = useState(false);
  const [validatingB, setValidatingB] = useState(false);
  const [statusMsgA, setStatusMsgA] = useState<string | null>(null);
  const [statusMsgB, setStatusMsgB] = useState<string | null>(null);
  const [errorA, setErrorA] = useState<string | null>(null);
  const [errorB, setErrorB] = useState<string | null>(null);
  const [generalNotice, setGeneralNotice] = useState<{
    type: "info" | "warning" | "error" | "success";
    message: string;
  } | null>(null);

  // Workspace Saved Feedback
  const [savedWorkspaceA, setSavedWorkspaceA] = useState(false);
  const [savedWorkspaceB, setSavedWorkspaceB] = useState(false);

  // Lightbox Modal
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("");

  // Config Drawer & Gallery
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [agentAMode, setAgentAMode] = useState("local_companion");
  const [agentBMode, setAgentBMode] = useState("local_companion");

  const fileInputRefA = useRef<HTMLInputElement>(null);
  const fileInputRefB = useRef<HTMLInputElement>(null);

  // On mount, query local companion directly from the browser (Vercel Architecture)
  useEffect(() => {
    // 1. Direct browser-to-companion loopback check
    fetch("http://127.0.0.1:4848/health", { method: "GET" })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "healthy") {
          setCompanionStatus({ active: true, version: data.version });
        }
      })
      .catch(() => {
        // Fall back to server status check
        fetch("/api/image/subscribed-agents")
          .then((res) => res.json())
          .then((data) => {
            if (data.companion) setCompanionStatus(data.companion);
            if (data.agents) {
              if (data.agents.agent_a?.connectionMode) setAgentAMode(data.agents.agent_a.connectionMode);
              if (data.agents.agent_b?.connectionMode) setAgentBMode(data.agents.agent_b.connectionMode);
            }
          })
          .catch(() => {
            setCompanionStatus({ active: false });
          });
      });
  }, []);

  // 1. Initial Prompt Optimization
  async function handleOptimize() {
    if (!prompt.trim()) return;
    setIsOptimizing(true);
    setErrorA(null);
    setErrorB(null);
    setGeneralNotice(null);

    try {
      const res = await fetch("/api/image/subscribed-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "optimize_prompts",
          prompt: prompt.trim(),
          category,
          aspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to compile prompts.");

      setOptimizedData(data.optimized);
      setStatusMsgA("Ready. Copy prompt and launch Agent A.");
      setStatusMsgB("Ready. Copy prompt and launch Agent B.");
    } catch (err: any) {
      setErrorA(err.message);
      setErrorB(err.message);
    } finally {
      setIsOptimizing(false);
    }
  }

  // 2. Fully Automatic Generation Orchestration (Direct Browser-to-Companion Loopback)
  async function handleAutomaticGenerate() {
    if (!prompt.trim()) return;
    setIsAutoGenerating(true);
    setAutoStatusText("Checking local companion on 127.0.0.1:4848...");
    setErrorA(null);
    setErrorB(null);
    setGeneralNotice(null);

    const activeJobIdStr = `job_sub_${Date.now()}`;
    setActiveJobId(activeJobIdStr);

    try {
      // Step A: Check if local companion is responsive directly from browser
      let isBrowserLoopbackAvailable = false;
      try {
        const ping = await fetch("http://127.0.0.1:4848/health", { method: "GET" });
        isBrowserLoopbackAvailable = ping.ok;
      } catch {
        isBrowserLoopbackAvailable = false;
      }

      if (isBrowserLoopbackAvailable) {
        setAutoStatusText("Local companion active. Compiling specialized prompts...");
        // 1. Get HMAC Ticket and Compiled Prompts from TATTVA AI
        const [ticketRes, optRes] = await Promise.all([
          fetch("/api/image/subscribed-agents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "issue_companion_ticket" }),
          }),
          fetch("/api/image/subscribed-agents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "optimize_prompts", prompt: prompt.trim(), category, aspectRatio }),
          }),
        ]);

        const ticketData = await ticketRes.json();
        const optData = await optRes.json();

        if (!optRes.ok || !ticketRes.ok) {
          throw new Error(optData.error || ticketData.error || "Failed to initialize generation session.");
        }

        setOptimizedData(optData.optimized);
        const headers = {
          "Content-Type": "application/json",
          "x-tattva-companion-token": "tattva_companion_secure_token",
          "x-tattva-signature": ticketData.ticket.signature,
          "x-tattva-timestamp": String(ticketData.ticket.timestamp),
          "x-tattva-nonce": ticketData.ticket.nonce,
        };

        // 2. Execute Parallel Direct Browser Loopback to Companion
        setAutoStatusText("Submitting concurrent jobs to Agent A & Agent B...");

        const runAgentBrowserLoopback = async (agentId: "agent_a" | "agent_b", agentPrompt: string) => {
          // Submit
          const subRes = await fetch("http://127.0.0.1:4848/v1/jobs/submit", {
            method: "POST",
            headers,
            body: JSON.stringify({
              jobId: activeJobIdStr,
              agentId,
              prompt: agentPrompt,
              category,
              aspectRatio,
            }),
          });

          if (!subRes.ok) {
            const err = await subRes.json().catch(() => ({}));
            throw new Error(err.error || `Companion error for ${agentId}`);
          }

          // Poll
          let completed = false;
          let attempts = 0;
          while (!completed && attempts < 30) {
            attempts++;
            await new Promise((r) => setTimeout(r, 600));
            const statusRes = await fetch(`http://127.0.0.1:4848/v1/jobs/${activeJobIdStr}?agentId=${agentId}`, {
              headers,
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.status === "completed") completed = true;
              else if (statusData.status === "failed") throw new Error(statusData.error || `${agentId} failed.`);
            }
          }

          // Retrieve
          const resultRes = await fetch(`http://127.0.0.1:4848/v1/jobs/${activeJobIdStr}/result?agentId=${agentId}`, {
            headers,
          });
          if (!resultRes.ok) throw new Error(`Failed to retrieve image for ${agentId}.`);
          const resultData = await resultRes.json();

          // Validate & Persist via TATTVA AI
          const persistRes = await fetch("/api/image/subscribed-agents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "validate_and_persist",
              agentId,
              imageDataUri: resultData.imageDataUri,
              prompt: agentPrompt,
              originalPrompt: prompt.trim(),
              category,
              workspaceId: "default",
            }),
          });
          const persistData = await persistRes.json();
          if (!persistRes.ok) throw new Error(persistData.error || `Persistence failed for ${agentId}.`);

          return {
            id: persistData.record.id,
            url: persistData.record.url,
            agentId,
            agentName: agentId === "agent_a" ? "Image Agent A (Subscribed)" : "Image Agent B (Subscribed)",
            prompt: persistData.record.prompt,
            format: (persistData.validation.format || "PNG").toUpperCase(),
            width: persistData.validation.width,
            height: persistData.validation.height,
            fileSizeBytes: persistData.validation.fileSizeBytes,
            createdAt: new Date().toLocaleTimeString(),
            sourceClassification: agentId === "agent_a" ? "external_subscribed_agent_a" : "external_subscribed_agent_b",
          };
        };

        const [resA, resB] = await Promise.allSettled([
          runAgentBrowserLoopback("agent_a", optData.optimized.agentA.prompt),
          runAgentBrowserLoopback("agent_b", optData.optimized.agentB.prompt),
        ]);

        if (resA.status === "fulfilled") {
          setAgentAImage(resA.value);
          setStatusMsgA("Auto-generated & Verified via Sharp");
        } else {
          setErrorA(resA.reason.message);
        }

        if (resB.status === "fulfilled") {
          setAgentBImage(resB.value);
          setStatusMsgB("Auto-generated & Verified via Sharp");
        } else {
          setErrorB(resB.reason.message);
        }

        if (resA.status === "fulfilled" && resB.status === "fulfilled") {
          setGeneralNotice({
            type: "success",
            message: "Both agents completed generation and results were automatically stored in your workspace vault!",
          });
        }
        return;
      }

      // Step B: Fallback to Server-Side Orchestration (when on localhost:3000)
      const res = await fetch("/api/image/subscribed-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "orchestrate_automatic",
          prompt: prompt.trim(),
          category,
          aspectRatio,
          workspaceId: "default",
          timeoutMs: 60_000,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Automatic generation failed.");
      }

      const job = data.job;
      if (job.agentAJob.status === "completed" && job.agentAJob.outputImage) {
        setAgentAImage({
          id: `img_a_${Date.now()}`,
          url: job.agentAJob.imageUrl || job.agentAJob.outputImage,
          agentId: "agent_a",
          agentName: "Image Agent A (Subscribed)",
          prompt: job.agentAJob.prompt,
          format: (job.agentAJob.metadata?.format || "PNG").toUpperCase(),
          width: job.agentAJob.metadata?.width || 1024,
          height: job.agentAJob.metadata?.height || 1024,
          fileSizeBytes: job.agentAJob.metadata?.fileSizeBytes || 0,
          createdAt: new Date().toLocaleTimeString(),
          sourceClassification: job.agentAJob.metadata?.sourceClassification || "external_subscribed_agent_a",
        });
        setStatusMsgA("Auto-generated & Verified via Sharp");
      } else if (job.agentAJob.status === "failed") {
        setErrorA(job.agentAJob.error || "Agent A generation failed.");
      }

      if (job.agentBJob.status === "completed" && job.agentBJob.outputImage) {
        setAgentBImage({
          id: `img_b_${Date.now()}`,
          url: job.agentBJob.imageUrl || job.agentBJob.outputImage,
          agentId: "agent_b",
          agentName: "Image Agent B (Subscribed)",
          prompt: job.agentBJob.prompt,
          format: (job.agentBJob.metadata?.format || "PNG").toUpperCase(),
          width: job.agentBJob.metadata?.width || 1024,
          height: job.agentBJob.metadata?.height || 1024,
          fileSizeBytes: job.agentBJob.metadata?.fileSizeBytes || 0,
          createdAt: new Date().toLocaleTimeString(),
          sourceClassification: job.agentBJob.metadata?.sourceClassification || "external_subscribed_agent_b",
        });
        setStatusMsgB("Auto-generated & Verified via Sharp");
      } else if (job.agentBJob.status === "failed") {
        setErrorB(job.agentBJob.error || "Agent B generation failed.");
      }

      if (job.agentAJob.status === "failed" && job.agentAJob.error?.includes("Local companion connector")) {
        setGeneralNotice({
          type: "warning",
          message:
            "Desktop Companion Bridge offline on 127.0.0.1:4848. To enable 100% automated generation from your browser without API keys, launch: `node companion/tattva-agent-bridge.mjs` on your computer. You can also use User-Assisted mode below.",
        });
        handleOptimize();
      } else if (job.status === "completed") {
        setGeneralNotice({
          type: "success",
          message: "Both agents completed generation and results were automatically stored in your workspace vault!",
        });
      }
    } catch (err: any) {
      setGeneralNotice({
        type: "warning",
        message:
          "Desktop Companion Bridge offline on 127.0.0.1:4848. Launch `node companion/tattva-agent-bridge.mjs` on your desktop for automated generation, or use User-Assisted mode below.",
      });
      handleOptimize();
    } finally {
      setIsAutoGenerating(false);
      setAutoStatusText("");
    }
  }

  // 3. Cancel Active Generation
  async function handleCancelJob() {
    if (!activeJobId) return;
    try {
      await fetch("/api/image/subscribed-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel_job", jobId: activeJobId }),
      });
      setIsAutoGenerating(false);
      setAutoStatusText("Job cancelled.");
    } catch {
      // Ignore
    }
  }

  // 4. Clipboard Helpers
  function copyToClipboard(text: string, isA: boolean) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (isA) {
        setCopiedA(true);
        setTimeout(() => setCopiedA(false), 2000);
      } else {
        setCopiedB(true);
        setTimeout(() => setCopiedB(false), 2000);
      }
    }
  }

  // 5. File Processing & Validation Helper
  async function processUploadedFile(file: File, agentId: "agent_a" | "agent_b") {
    if (agentId === "agent_a") {
      setValidatingA(true);
      setErrorA(null);
      setStatusMsgA("Validating MIME and dimensions...");
    } else {
      setValidatingB(true);
      setErrorB(null);
      setStatusMsgB("Validating MIME and dimensions...");
    }

    try {
      const base64Uri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/image/subscribed-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate_and_persist",
          agentId,
          imageDataUri: base64Uri,
          prompt: optimizedData?.[agentId === "agent_a" ? "agentA" : "agentB"]?.prompt || prompt,
          originalPrompt: prompt,
          category,
          workspaceId: "default",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation and persistence failed.");

      const record: ValidatedImageRecord = {
        id: data.record.id,
        url: data.record.url,
        agentId,
        agentName: agentId === "agent_a" ? "Image Agent A (Subscribed)" : "Image Agent B (Subscribed)",
        prompt: data.record.prompt,
        format: data.validation.format.toUpperCase(),
        width: data.validation.width,
        height: data.validation.height,
        fileSizeBytes: data.validation.fileSizeBytes,
        createdAt: new Date().toLocaleTimeString(),
      };

      if (agentId === "agent_a") {
        setAgentAImage(record);
        setStatusMsgA("Validated & Saved to Workspace Storage");
      } else {
        setAgentBImage(record);
        setStatusMsgB("Validated & Saved to Workspace Storage");
      }
    } catch (err: any) {
      if (agentId === "agent_a") setErrorA(err.message);
      else setErrorB(err.message);
    } finally {
      if (agentId === "agent_a") setValidatingA(false);
      else setValidatingB(false);
    }
  }

  // 6. Save to Workspace feedback
  function handleSaveToWorkspace(agentId: "agent_a" | "agent_b") {
    if (agentId === "agent_a") {
      setSavedWorkspaceA(true);
      setTimeout(() => setSavedWorkspaceA(false), 2500);
    } else {
      setSavedWorkspaceB(true);
      setTimeout(() => setSavedWorkspaceB(false), 2500);
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 animate-fluid-page-in">
      {/* Top Banner & Security Policy */}
      <div
        className={`p-5 rounded-2xl border transition-all duration-200 ${
          isDark
            ? "bg-[#14151c]/90 border-white/[0.08] text-white"
            : "bg-white/90 border-neutral-200 text-neutral-900 shadow-xs"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Zero API Keys Required
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% TOS Compliant
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase border flex items-center gap-1 ${
                  companionStatus.active
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                <Radio className={`w-2.5 h-2.5 ${companionStatus.active ? "animate-pulse text-emerald-400" : "text-amber-400"}`} />
                {companionStatus.active ? "Local Companion Online" : "Companion Standby / Offline"}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Dual Subscribed Image Agents Hub
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              Orchestrate parallel image generation across your two existing AI subscriptions (Image Agent A &amp; Image Agent B).
              Supports fully automatic local companion execution and zero-key compliant prompt synthesis with Supabase vault storage.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGallery(!showGallery)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer fluid-press ${
                showGallery
                  ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                  : isDark
                  ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white"
                  : "border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showGallery ? "Hide Gallery" : "Workspace Gallery"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer fluid-press ${
                isDark
                  ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white"
                  : "border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-neutral-400" />
              <span>Connection Matrix</span>
            </button>
            {onBackToStudio && (
              <button
                type="button"
                onClick={onBackToStudio}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer fluid-press ${
                  isDark
                    ? "border-white/10 hover:bg-white/[0.06] text-neutral-400 hover:text-white"
                    : "border-neutral-200 hover:bg-neutral-100 text-neutral-600"
                }`}
              >
                Back to Studio
              </button>
            )}
          </div>
        </div>

        {/* Configuration Drawer */}
        {isConfigOpen && (
          <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fluid-dropdown">
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
              <span className="text-xs font-semibold text-neutral-300 block mb-1">
                Image Agent A Integration Mode
              </span>
              <select
                value={agentAMode}
                onChange={(e) => setAgentAMode(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white outline-none"
              >
                <option value="local_companion">Local Companion Bridge (127.0.0.1:4848)</option>
                <option value="user_assisted">User-Assisted Mode (Zero API Key, 100% Permitted)</option>
                <option value="mcp">Local MCP Server Connector (Claude / Antigravity)</option>
                <option value="oauth">Official OAuth 2.0 PKCE</option>
              </select>
              <p className="text-[11px] text-neutral-400 mt-1.5">
                {agentAMode === "local_companion"
                  ? companionStatus.active
                    ? "🟢 Companion active on 127.0.0.1:4848. Full automatic execution enabled."
                    : "🟡 Companion offline. Start with 'node companion/tattva-agent-bridge.mjs'."
                  : "Uses official clipboard synthesis and browser dropzone. Zero credential risk."}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
              <span className="text-xs font-semibold text-neutral-300 block mb-1">
                Image Agent B Integration Mode
              </span>
              <select
                value={agentBMode}
                onChange={(e) => setAgentBMode(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white outline-none"
              >
                <option value="local_companion">Local Companion Bridge (127.0.0.1:4848)</option>
                <option value="user_assisted">User-Assisted Mode (Zero API Key, 100% Permitted)</option>
                <option value="mcp">Local MCP Server Connector (Claude / Antigravity)</option>
                <option value="oauth">Official OAuth 2.0 PKCE</option>
              </select>
              <p className="text-[11px] text-neutral-400 mt-1.5">
                {agentBMode === "local_companion"
                  ? companionStatus.active
                    ? "🟢 Companion active on 127.0.0.1:4848. Full automatic execution enabled."
                    : "🟡 Companion offline. Start with 'node companion/tattva-agent-bridge.mjs'."
                  : "Respects provider TOS by using authorized local dispatch. Never requires passwords."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* General Notice Banner */}
      {generalNotice && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed animate-fluid-dropdown ${
            generalNotice.type === "warning"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
              : generalNotice.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
              : generalNotice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
              : "bg-indigo-500/10 border-indigo-500/30 text-indigo-200"
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{generalNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setGeneralNotice(null)}
            className="text-white/60 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Step 1: Prompt & Creative Intent Studio */}
      <div
        className={`p-5 rounded-2xl border transition-all duration-200 ${
          isDark
            ? "bg-[#14151c]/90 border-white/[0.08] text-white"
            : "bg-white border-neutral-200 text-neutral-900 shadow-xs"
        }`}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono font-medium tracking-wide uppercase text-neutral-400">
              Creative Intent &amp; Category (10 Distinct Domains)
            </span>

            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-1">
              {["1:1", "16:9", "9:16", "4:3"].map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => setAspectRatio(ar)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer select-none fluid-press ${
                    aspectRatio === ar
                      ? "bg-indigo-600 text-white font-semibold"
                      : isDark
                      ? "bg-white/[0.04] text-neutral-400 hover:text-white"
                      : "bg-neutral-100 text-neutral-600 hover:text-black"
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips (10 Categories) */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "photorealistic", label: "Photorealistic" },
              { id: "illustration", label: "Illustration" },
              { id: "poster", label: "Poster Design" },
              { id: "logo", label: "Logo & Brand" },
              { id: "advertising", label: "Product Ad" },
              { id: "anime", label: "Anime Art" },
              { id: "artwork_3d", label: "3D Art & Octane" },
              { id: "social_creative", label: "Social Creative" },
              { id: "marketing_banner", label: "Marketing Banner" },
              { id: "product_mockup", label: "Product Mockup" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id as ImageCategory)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer select-none fluid-press ${
                  category === cat.id
                    ? isDark
                      ? "bg-white text-neutral-950 font-semibold"
                      : "bg-neutral-900 text-white font-semibold"
                    : isDark
                    ? "border border-white/10 bg-white/[0.02] text-neutral-400 hover:text-white hover:bg-white/[0.06]"
                    : "border border-neutral-200 bg-neutral-50 text-neutral-600 hover:text-black"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Prompt Textarea */}
          <div className="relative mt-2">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image, poster, logo, anime visual, 3D artwork, or product mockup to generate..."
              className={`w-full p-3.5 rounded-xl border text-sm sm:text-base outline-none resize-none transition-all leading-relaxed ${
                isDark
                  ? "bg-black/30 border-white/10 text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 placeholder-neutral-500"
                  : "bg-neutral-50 border-neutral-200 text-black focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder-neutral-400"
              }`}
            />
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero credentials required. Automatic loopback &amp; Sharp validation.</span>
            </div>

            <div className="flex items-center gap-2">
              {isAutoGenerating && (
                <button
                  type="button"
                  onClick={handleCancelJob}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition cursor-pointer"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>Cancel Job</span>
                </button>
              )}

              {/* 1. Fully Automatic Button */}
              <button
                type="button"
                disabled={isAutoGenerating || isOptimizing || !prompt.trim()}
                onClick={handleAutomaticGenerate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer select-none fluid-press disabled:opacity-50 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.35)]"
              >
                {isAutoGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{autoStatusText || "Generating Automatically..."}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Generate Automatically (A &amp; B)</span>
                  </>
                )}
              </button>

              {/* 2. Manual User-Assisted Compile */}
              <button
                type="button"
                disabled={isOptimizing || isAutoGenerating || !prompt.trim()}
                onClick={handleOptimize}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer select-none fluid-press disabled:opacity-50 ${
                  isDark
                    ? "bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 border border-white/10"
                    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300"
                }`}
              >
                {isOptimizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Compiling...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Compile Prompts</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Side-by-Side Dual Agent Workspaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ================================================= Image Agent A Workspace */}
        <div
          className={`flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden ${
            isDark
              ? "bg-[#14151c]/90 border-white/[0.08]"
              : "bg-white border-neutral-200 shadow-xs"
          } ${preferredAgent === "agent_a" ? "ring-2 ring-indigo-500" : ""}`}
        >
          {/* Header A */}
          <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between bg-indigo-500/5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              <h3 className="font-semibold text-sm sm:text-base text-indigo-400 tracking-tight">
                Image Agent A
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  companionStatus.active && agentAMode === "local_companion"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                {companionStatus.active && agentAMode === "local_companion"
                  ? "Automated Loopback"
                  : "User-Assisted Mode"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPreferredAgent("agent_a")}
              className={`text-xs px-2.5 py-1 rounded-lg transition cursor-pointer select-none ${
                preferredAgent === "agent_a"
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {preferredAgent === "agent_a" ? "★ Preferred" : "Mark Preferred"}
            </button>
          </div>

          {/* Content A */}
          <div className="p-5 flex-1 flex flex-col gap-4">
            {/* Prompt Card A */}
            <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-mono uppercase text-[10px] tracking-wider text-indigo-400 font-semibold">
                  Compiled Agent A Prompt
                </span>
                <span className="text-[11px] text-neutral-500">
                  Focus: Cinematic &amp; Photorealistic Depth
                </span>
              </div>

              <p className="text-xs leading-relaxed text-neutral-300 min-h-[48px] select-text">
                {optimizedData?.agentA.prompt ||
                  (prompt
                    ? `${prompt}, cinematic 35mm lens, volumetric lighting, natural skin textures, 8k --ar ${aspectRatio}`
                    : "Enter a prompt above to compile specialized Agent A syntax.")}
              </p>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      optimizedData?.agentA.prompt || `${prompt} --ar ${aspectRatio}`,
                      true
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30 transition cursor-pointer select-none fluid-press"
                >
                  {copiedA ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied Prompt!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Agent A Prompt</span>
                    </>
                  )}
                </button>

                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-indigo-300 transition"
                >
                  <span>Open Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Ingestion & Output Viewport A */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[280px] rounded-xl border border-dashed border-black/10 dark:border-white/10 p-4 relative group">
              {agentAImage ? (
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="relative w-full aspect-square max-w-[340px] rounded-lg overflow-hidden bg-black/40 border border-white/10 group">
                    <img
                      src={agentAImage.url}
                      alt="Agent A Result"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLightboxUrl(agentAImage.url);
                          setLightboxTitle("Image Agent A (Subscribed Result)");
                        }}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition"
                        title="Fullscreen Preview"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerDownload(agentAImage.url, `agent_a_${Date.now()}.png`)}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition"
                        title="Download High-Res"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Chips A */}
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-neutral-400">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                      agentAImage.sourceClassification === "external_subscribed_agent_a"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : agentAImage.sourceClassification === "local_procedural_fallback"
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                        : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                    }`}>
                      {agentAImage.sourceClassification === "external_subscribed_agent_a"
                        ? "External Agent A"
                        : agentAImage.sourceClassification === "local_procedural_fallback"
                        ? "Procedural Studio"
                        : "Verified Asset"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10">
                      {agentAImage.format} • {agentAImage.width}×{agentAImage.height}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10">
                      {(agentAImage.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSaveToWorkspace("agent_a")}
                      className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition flex items-center gap-1"
                    >
                      {savedWorkspaceA ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <>
                          <FolderPlus className="w-3 h-3" />
                          <span>Saved to Workspace</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) processUploadedFile(e.dataTransfer.files[0], "agent_a");
                  }}
                  onPaste={(e) => {
                    const item = e.clipboardData.items[0];
                    if (item?.type.startsWith("image/")) {
                      const file = item.getAsFile();
                      if (file) processUploadedFile(file, "agent_a");
                    }
                  }}
                  tabIndex={0}
                  className="w-full h-full flex flex-col items-center justify-center text-center p-6 cursor-pointer focus:outline-none"
                  onClick={() => fileInputRefA.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRefA}
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) processUploadedFile(e.target.files[0], "agent_a");
                    }}
                  />
                  {validatingA ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                      <span className="text-xs text-neutral-300 font-medium">
                        {statusMsgA || "Processing image..."}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-neutral-300 block">
                          Paste (Ctrl+V) or Drop Agent A Result
                        </span>
                        <span className="text-[11px] text-neutral-500 block mt-0.5">
                          Or click to browse JPEG, PNG, WebP up to 25MB
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {errorA && (
                <div className="mt-2 text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errorA}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================= Image Agent B Workspace */}
        <div
          className={`flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden ${
            isDark
              ? "bg-[#14151c]/90 border-white/[0.08]"
              : "bg-white border-neutral-200 shadow-xs"
          } ${preferredAgent === "agent_b" ? "ring-2 ring-violet-500" : ""}`}
        >
          {/* Header B */}
          <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between bg-violet-500/5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
              <h3 className="font-semibold text-sm sm:text-base text-violet-400 tracking-tight">
                Image Agent B
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  companionStatus.active && agentBMode === "local_companion"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                {companionStatus.active && agentBMode === "local_companion"
                  ? "Automated Loopback"
                  : "User-Assisted Mode"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPreferredAgent("agent_b")}
              className={`text-xs px-2.5 py-1 rounded-lg transition cursor-pointer select-none ${
                preferredAgent === "agent_b"
                  ? "bg-violet-600 text-white font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {preferredAgent === "agent_b" ? "★ Preferred" : "Mark Preferred"}
            </button>
          </div>

          {/* Content B */}
          <div className="p-5 flex-1 flex flex-col gap-4">
            {/* Prompt Card B */}
            <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-mono uppercase text-[10px] tracking-wider text-violet-400 font-semibold">
                  Compiled Agent B Prompt
                </span>
                <span className="text-[11px] text-neutral-500">
                  Focus: Graphic Layout &amp; Typographic Purity
                </span>
              </div>

              <p className="text-xs leading-relaxed text-neutral-300 min-h-[48px] select-text">
                {optimizedData?.agentB.prompt ||
                  (prompt
                    ? `${prompt}, Swiss modern poster layout, bold vector graphic, high contrast visual --ar ${aspectRatio}`
                    : "Enter a prompt above to compile specialized Agent B syntax.")}
              </p>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      optimizedData?.agentB.prompt || `${prompt} --ar ${aspectRatio}`,
                      false
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 border border-violet-500/30 transition cursor-pointer select-none fluid-press"
                >
                  {copiedB ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied Prompt!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Agent B Prompt</span>
                    </>
                  )}
                </button>

                <a
                  href="https://chatgpt.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-violet-300 transition"
                >
                  <span>Open Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Ingestion & Output Viewport B */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[280px] rounded-xl border border-dashed border-black/10 dark:border-white/10 p-4 relative group">
              {agentBImage ? (
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="relative w-full aspect-square max-w-[340px] rounded-lg overflow-hidden bg-black/40 border border-white/10 group">
                    <img
                      src={agentBImage.url}
                      alt="Agent B Result"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLightboxUrl(agentBImage.url);
                          setLightboxTitle("Image Agent B (Subscribed Result)");
                        }}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition"
                        title="Fullscreen Preview"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerDownload(agentBImage.url, `agent_b_${Date.now()}.png`)}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition"
                        title="Download High-Res"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Chips B */}
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-neutral-400">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                      agentBImage.sourceClassification === "external_subscribed_agent_b"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : agentBImage.sourceClassification === "local_procedural_fallback"
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                        : "bg-violet-500/10 text-violet-300 border-violet-500/30"
                    }`}>
                      {agentBImage.sourceClassification === "external_subscribed_agent_b"
                        ? "External Agent B"
                        : agentBImage.sourceClassification === "local_procedural_fallback"
                        ? "Procedural Studio"
                        : "Verified Asset"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10">
                      {agentBImage.format} • {agentBImage.width}×{agentBImage.height}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10">
                      {(agentBImage.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSaveToWorkspace("agent_b")}
                      className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition flex items-center gap-1"
                    >
                      {savedWorkspaceB ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <>
                          <FolderPlus className="w-3 h-3" />
                          <span>Saved to Workspace</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) processUploadedFile(e.dataTransfer.files[0], "agent_b");
                  }}
                  onPaste={(e) => {
                    const item = e.clipboardData.items[0];
                    if (item?.type.startsWith("image/")) {
                      const file = item.getAsFile();
                      if (file) processUploadedFile(file, "agent_b");
                    }
                  }}
                  tabIndex={0}
                  className="w-full h-full flex flex-col items-center justify-center text-center p-6 cursor-pointer focus:outline-none"
                  onClick={() => fileInputRefB.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRefB}
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) processUploadedFile(e.target.files[0], "agent_b");
                    }}
                  />
                  {validatingB ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
                      <span className="text-xs text-neutral-300 font-medium">
                        {statusMsgB || "Processing image..."}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-neutral-300 block">
                          Paste (Ctrl+V) or Drop Agent B Result
                        </span>
                        <span className="text-[11px] text-neutral-500 block mt-0.5">
                          Or click to browse JPEG, PNG, WebP up to 25MB
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {errorB && (
                <div className="mt-2 text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errorB}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Workspace Image Gallery */}
      {showGallery && (
        <div className="mt-8 pt-6 border-t border-black/10 dark:border-white/10 animate-fluid-dropdown">
          <WorkspaceHistorySuite
            onLoadImage={(url, prompt) => {
              setLightboxUrl(url);
              setLightboxTitle(prompt || "Workspace Image Asset");
            }}
          />
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fluid-modal"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-white text-xs mb-2">
              <span className="font-medium">{lightboxTitle}</span>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={lightboxUrl}
              alt="Lightbox Preview"
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
