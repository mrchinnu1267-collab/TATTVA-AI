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
  FileCheck2,
  RotateCcw,
} from "lucide-react";
import { triggerDownload } from "../../lib/download-helper";
import { WorkspaceHistorySuite } from "./WorkspaceHistorySuite";
import {
  VERIFIED_EXTERNAL_PROVIDERS,
  DEFAULT_AGENT_CONFIG,
  ExternalProviderOption,
} from "../../lib/image-engine/subscribed-agents/external-providers.config";

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

  // Production feature flag for local procedural preview
  // In production, local procedural preview is disabled by default to enforce genuine user-assisted workflow
  const enableLocalProceduralPreview =
    process.env.NEXT_PUBLIC_ENABLE_LOCAL_PROCEDURAL_PREVIEW === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_LOCAL_PROCEDURAL_PREVIEW !== "false");

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

  // External Provider Selection
  const [selectedProviderA, setSelectedProviderA] = useState<ExternalProviderOption>(
    VERIFIED_EXTERNAL_PROVIDERS[0]
  );
  const [selectedProviderB, setSelectedProviderB] = useState<ExternalProviderOption>(
    VERIFIED_EXTERNAL_PROVIDERS[1] || VERIFIED_EXTERNAL_PROVIDERS[0]
  );

  // Copy Feedback
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);

  // Upload Progress & Validation States for Agent A
  const [validatingA, setValidatingA] = useState(false);
  const [uploadProgressA, setUploadProgressA] = useState<number>(0);
  const [statusMsgA, setStatusMsgA] = useState<string>("Waiting for Image Import");
  const [errorA, setErrorA] = useState<string | null>(null);
  const [lastFileA, setLastFileA] = useState<File | null>(null);
  const abortControllerRefA = useRef<AbortController | null>(null);

  // Upload Progress & Validation States for Agent B
  const [validatingB, setValidatingB] = useState(false);
  const [uploadProgressB, setUploadProgressB] = useState<number>(0);
  const [statusMsgB, setStatusMsgB] = useState<string>("Waiting for Image Import");
  const [errorB, setErrorB] = useState<string | null>(null);
  const [lastFileB, setLastFileB] = useState<File | null>(null);
  const abortControllerRefB = useRef<AbortController | null>(null);

  const [generalNotice, setGeneralNotice] = useState<{
    type: "info" | "warning" | "error" | "success";
    message: string;
  } | null>(null);

  // Lightbox Modal
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("");

  // Gallery & Config Drawer
  const [showGallery, setShowGallery] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [galleryRefreshKey, setGalleryRefreshKey] = useState<number>(0);

  const fileInputRefA = useRef<HTMLInputElement>(null);
  const fileInputRefB = useRef<HTMLInputElement>(null);

  // On mount, check local companion status if preview mode is enabled
  useEffect(() => {
    if (!enableLocalProceduralPreview) return;

    fetch("http://127.0.0.1:4848/health", { method: "GET" })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "healthy") {
          setCompanionStatus({ active: true, version: data.version });
        }
      })
      .catch(() => {
        setCompanionStatus({ active: false });
      });
  }, [enableLocalProceduralPreview]);

  // Step 1: Prompt Intelligence Preparation
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
      setStatusMsgA("Prompt Ready. Copy prompt to launch external tool.");
      setStatusMsgB("Prompt Ready. Copy prompt to launch external tool.");
    } catch (err: any) {
      setErrorA(err.message);
      setErrorB(err.message);
    } finally {
      setIsOptimizing(false);
    }
  }

  // Step 2: Clipboard Copy Helper
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

  // Step 3: Open External Tool
  function handleOpenExternalTool(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Step 4 & 5 & 6: Import, Validate via Sharp, and Upload to Supabase Storage
  async function processUploadedFile(file: File, agentId: "agent_a" | "agent_b") {
    // Validate file type on client first
    const validMimes = ["image/png", "image/jpeg", "image/webp"];
    if (!validMimes.includes(file.type)) {
      const msg = `Unsupported file type: '${file.type || file.name}'. Allowed: PNG, JPEG, WEBP.`;
      if (agentId === "agent_a") setErrorA(msg);
      else setErrorB(msg);
      return;
    }

    // Validate size limit (25MB)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const msg = `File size exceeds the 25 MB limit (${(file.size / 1024 / 1024).toFixed(2)} MB).`;
      if (agentId === "agent_a") setErrorA(msg);
      else setErrorB(msg);
      return;
    }

    const abortController = new AbortController();
    if (agentId === "agent_a") {
      abortControllerRefA.current = abortController;
      setValidatingA(true);
      setErrorA(null);
      setLastFileA(file);
      setUploadProgressA(15);
      setStatusMsgA("Reading file buffer...");
    } else {
      abortControllerRefB.current = abortController;
      setValidatingB(true);
      setErrorB(null);
      setLastFileB(file);
      setUploadProgressB(15);
      setStatusMsgB("Reading file buffer...");
    }

    try {
      // Step A: Read file as Data URL
      const base64Uri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (abortController.signal.aborted) throw new Error("Upload cancelled by user.");

      if (agentId === "agent_a") {
        setUploadProgressA(40);
        setStatusMsgA("Validating Image with Sharp...");
      } else {
        setUploadProgressB(40);
        setStatusMsgB("Validating Image with Sharp...");
      }

      // Step B: Submit to Server for Content Validation & Supabase Upload
      const chosenProvider = agentId === "agent_a" ? selectedProviderA : selectedProviderB;

      const res = await fetch("/api/image/subscribed-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          action: "import_user_image",
          agentId,
          imageDataUri: base64Uri,
          prompt: optimizedData?.[agentId === "agent_a" ? "agentA" : "agentB"]?.prompt || prompt,
          originalPrompt: prompt.trim(),
          declaredSourceLabel: chosenProvider.name,
          category,
          aspectRatio,
          workspaceId: "default",
          requireCloudStorage: true,
        }),
      });

      if (agentId === "agent_a") {
        setUploadProgressA(80);
        setStatusMsgA("Uploading to TATTVA AI Cloud...");
      } else {
        setUploadProgressB(80);
        setStatusMsgB("Uploading to TATTVA AI Cloud...");
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Image validation or storage upload failed.");
      }

      const record: ValidatedImageRecord = {
        id: data.record.id,
        url: data.record.url,
        agentId,
        agentName: chosenProvider.neutralLabel,
        prompt: data.record.prompt,
        format: data.validation.format.toUpperCase(),
        width: data.validation.width,
        height: data.validation.height,
        fileSizeBytes: data.validation.fileSizeBytes,
        createdAt: new Date().toLocaleTimeString(),
        sourceClassification: "user_uploaded_image",
      };

      if (agentId === "agent_a") {
        setAgentAImage(record);
        setUploadProgressA(100);
        setStatusMsgA("Saved to Gallery");
      } else {
        setAgentBImage(record);
        setUploadProgressB(100);
        setStatusMsgB("Saved to Gallery");
      }

      // Automatically refresh the embedded gallery
      setGalleryRefreshKey((k) => k + 1);

      setGeneralNotice({
        type: "success",
        message: `Successfully verified and imported image into your private workspace gallery!`,
      });
    } catch (err: any) {
      if (err.name === "AbortError" || err.message?.includes("cancelled")) {
        if (agentId === "agent_a") setStatusMsgA("Upload cancelled.");
        else setStatusMsgB("Upload cancelled.");
      } else {
        if (agentId === "agent_a") {
          setErrorA(err.message || "Failed to import image.");
          setStatusMsgA("Validation Failed");
        } else {
          setErrorB(err.message || "Failed to import image.");
          setStatusMsgB("Validation Failed");
        }
      }
    } finally {
      if (agentId === "agent_a") {
        setValidatingA(false);
        abortControllerRefA.current = null;
      } else {
        setValidatingB(false);
        abortControllerRefB.current = null;
      }
    }
  }

  // Cancel in-flight upload
  function handleCancelUpload(agentId: "agent_a" | "agent_b") {
    if (agentId === "agent_a" && abortControllerRefA.current) {
      abortControllerRefA.current.abort();
    } else if (agentId === "agent_b" && abortControllerRefB.current) {
      abortControllerRefB.current.abort();
    }
  }

  // Retry last upload
  function handleRetryUpload(agentId: "agent_a" | "agent_b") {
    if (agentId === "agent_a" && lastFileA) {
      processUploadedFile(lastFileA, "agent_a");
    } else if (agentId === "agent_b" && lastFileB) {
      processUploadedFile(lastFileB, "agent_b");
    }
  }

  // Optional Local Procedural Preview Generation (Development Only)
  async function handleProceduralPreview() {
    if (!prompt.trim()) return;
    setIsAutoGenerating(true);
    setAutoStatusText("Generating Local Procedural Preview...");
    setErrorA(null);
    setErrorB(null);

    try {
      const res = await fetch("/api/image/subscribed-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "orchestrate_automatic",
          prompt: prompt.trim(),
          category,
          aspectRatio,
          workspaceId: "default",
          timeoutMs: 30_000,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Local preview generation failed.");

      const job = data.job;
      if (job.agentAJob?.outputImage) {
        setAgentAImage({
          id: `img_a_preview_${Date.now()}`,
          url: job.agentAJob.imageUrl || job.agentAJob.outputImage,
          agentId: "agent_a",
          agentName: "Local Procedural Preview",
          prompt: job.agentAJob.prompt,
          format: "PNG",
          width: job.agentAJob.metadata?.width || 512,
          height: job.agentAJob.metadata?.height || 512,
          fileSizeBytes: job.agentAJob.metadata?.fileSizeBytes || 0,
          createdAt: new Date().toLocaleTimeString(),
          sourceClassification: "local_procedural_fallback",
        });
        setStatusMsgA("Local Procedural Preview");
      }
      if (job.agentBJob?.outputImage) {
        setAgentBImage({
          id: `img_b_preview_${Date.now()}`,
          url: job.agentBJob.imageUrl || job.agentBJob.outputImage,
          agentId: "agent_b",
          agentName: "Local Procedural Preview",
          prompt: job.agentBJob.prompt,
          format: "PNG",
          width: job.agentBJob.metadata?.width || 512,
          height: job.agentBJob.metadata?.height || 512,
          fileSizeBytes: job.agentBJob.metadata?.fileSizeBytes || 0,
          createdAt: new Date().toLocaleTimeString(),
          sourceClassification: "local_procedural_fallback",
        });
        setStatusMsgB("Local Procedural Preview");
      }

      setGalleryRefreshKey((k) => k + 1);
    } catch (err: any) {
      setGeneralNotice({
        type: "warning",
        message:
          "Local procedural bridge is offline. Please use the User-Assisted Workflow below to copy prompts and import images directly.",
      });
      handleOptimize();
    } finally {
      setIsAutoGenerating(false);
      setAutoStatusText("");
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 animate-fluid-page-in">
      {/* Top Banner & User-Assisted Policy Notice */}
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
                User-Assisted Workflow
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% TOS &amp; Subscription Compliant
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
                Zero API Keys Required
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Image Generation Studio &amp; Secure Cloud Vault
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              Prepare specialized prompts inside TATTVA AI, generate assets in your subscribed external tools without credential risk, and import them into your private Supabase Storage gallery with automatic Sharp verification.
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
              <span>External Tools</span>
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
            <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2">
              <span className="text-xs font-semibold text-neutral-300 block">
                Target External Tool for Agent A
              </span>
              <select
                value={selectedProviderA.id}
                onChange={(e) => {
                  const p = VERIFIED_EXTERNAL_PROVIDERS.find((item) => item.id === e.target.value);
                  if (p) setSelectedProviderA(p);
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white outline-none"
              >
                {VERIFIED_EXTERNAL_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.neutralLabel})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-neutral-400">
                URL: <span className="text-indigo-400 font-mono">{selectedProviderA.url}</span>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2">
              <span className="text-xs font-semibold text-neutral-300 block">
                Target External Tool for Agent B
              </span>
              <select
                value={selectedProviderB.id}
                onChange={(e) => {
                  const p = VERIFIED_EXTERNAL_PROVIDERS.find((item) => item.id === e.target.value);
                  if (p) setSelectedProviderB(p);
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white outline-none"
              >
                {VERIFIED_EXTERNAL_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.neutralLabel})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-neutral-400">
                URL: <span className="text-violet-400 font-mono">{selectedProviderB.url}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* General Notice */}
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
            className="text-white/60 hover:text-white cursor-pointer"
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
              Step 1 – Prepare Prompt &amp; Select Aspect Ratio
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

          {/* Category Chips */}
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
              placeholder="Describe your vision (e.g. 'Futuristic architectural pavilion of glass and brushed copper in warm sunset with cinematic reflections')..."
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
              <span>Prompt Intelligence structures your prompt while preserving 100% of your creative intent.</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Optional Local Procedural Preview Button (Development Only) */}
              {enableLocalProceduralPreview && (
                <button
                  type="button"
                  disabled={isAutoGenerating || isOptimizing || !prompt.trim()}
                  onClick={handleProceduralPreview}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] text-neutral-300 border border-white/10 hover:bg-white/[0.08] transition cursor-pointer select-none fluid-press disabled:opacity-50"
                  title="Generate in-memory Sharp procedural preview for offline testing"
                >
                  {isAutoGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>{autoStatusText}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Local Procedural Preview</span>
                    </>
                  )}
                </button>
              )}

              {/* Primary User-Assisted Prompt Preparation */}
              <button
                type="button"
                disabled={isOptimizing || isAutoGenerating || !prompt.trim()}
                onClick={handleOptimize}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer select-none fluid-press disabled:opacity-50 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.35)]"
              >
                {isOptimizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Structuring Prompt...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    <span>Prepare &amp; Structure Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Dual Agent Workspaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ================================================= Image Agent A Workspace */}
        <div
          className={`flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden ${
            isDark ? "bg-[#14151c]/90 border-white/[0.08]" : "bg-white border-neutral-200 shadow-xs"
          } ${preferredAgent === "agent_a" ? "ring-2 ring-indigo-500" : ""}`}
        >
          {/* Header A */}
          <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between bg-indigo-500/5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              <h3 className="font-semibold text-sm sm:text-base text-indigo-400 tracking-tight">
                External Image Agent A
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {statusMsgA}
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
            {/* Step 2 & 3: Prompt Card & External Open */}
            <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-mono uppercase text-[10px] tracking-wider text-indigo-400 font-semibold">
                  Step 2 – Copy Prompt
                </span>
                <span className="text-[11px] text-neutral-500">
                  Target: {selectedProviderA.name}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-neutral-300 min-h-[48px] select-text bg-black/20 p-2.5 rounded-lg border border-white/5">
                {optimizedData?.agentA.prompt ||
                  (prompt
                    ? `${prompt}, cinematic 35mm lens, volumetric lighting, natural skin textures, 8k --ar ${aspectRatio}`
                    : "Enter your prompt in Step 1 to compile specialized syntax.")}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
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
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenExternalTool(selectedProviderA.url)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08] border border-white/10 transition cursor-pointer"
                  title={`Open ${selectedProviderA.name} in a new browser tab`}
                >
                  <span>Step 3 – Open External Tool</span>
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                </button>
              </div>
            </div>

            {/* Step 4: Import Zone */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[280px] rounded-xl border border-dashed border-black/10 dark:border-white/10 p-4 relative group">
              {agentAImage ? (
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="relative w-full aspect-square max-w-[340px] rounded-lg overflow-hidden bg-black/40 border border-white/10 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
                          setLightboxTitle("Image Agent A (Result)");
                        }}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition cursor-pointer"
                        title="Fullscreen Preview"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerDownload(agentAImage.url, `agent_a_${Date.now()}.png`)}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Chips A */}
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-neutral-400">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                        agentAImage.sourceClassification === "user_uploaded_image"
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {agentAImage.sourceClassification === "user_uploaded_image"
                        ? "User Imported Asset"
                        : "Local Procedural Preview"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10">
                      {agentAImage.format} • {agentAImage.width}×{agentAImage.height}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10">
                      {(agentAImage.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRefA.current?.click()}
                      className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition cursor-pointer"
                    >
                      Import Another
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
                    <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                      <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin" />
                      <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgressA}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-300 font-medium">
                        {statusMsgA} ({uploadProgressA}%)
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelUpload("agent_a");
                        }}
                        className="px-2.5 py-1 text-[10px] text-rose-300 hover:bg-rose-500/20 rounded-md border border-rose-500/30 transition cursor-pointer"
                      >
                        Cancel Upload
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-neutral-200 block">
                          Step 4 – Drag &amp; Drop Image Here
                        </span>
                        <span className="text-[11px] text-neutral-500 block mt-1">
                          PNG, JPEG, or WEBP up to 25MB • Paste (Ctrl+V) or click to browse
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {errorA && (
                <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-1.5 truncate">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span className="truncate">{errorA}</span>
                  </div>
                  {lastFileA && (
                    <button
                      type="button"
                      onClick={() => handleRetryUpload("agent_a")}
                      className="shrink-0 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-semibold text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================= Image Agent B Workspace */}
        <div
          className={`flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden ${
            isDark ? "bg-[#14151c]/90 border-white/[0.08]" : "bg-white border-neutral-200 shadow-xs"
          } ${preferredAgent === "agent_b" ? "ring-2 ring-violet-500" : ""}`}
        >
          {/* Header B */}
          <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between bg-violet-500/5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
              <h3 className="font-semibold text-sm sm:text-base text-violet-400 tracking-tight">
                External Image Agent B
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                {statusMsgB}
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
            {/* Step 2 & 3: Prompt Card & External Open */}
            <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-mono uppercase text-[10px] tracking-wider text-violet-400 font-semibold">
                  Step 2 – Copy Prompt
                </span>
                <span className="text-[11px] text-neutral-500">
                  Target: {selectedProviderB.name}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-neutral-300 min-h-[48px] select-text bg-black/20 p-2.5 rounded-lg border border-white/5">
                {optimizedData?.agentB.prompt ||
                  (prompt
                    ? `${prompt}, Swiss modern poster layout, bold vector graphic, high contrast visual --ar ${aspectRatio}`
                    : "Enter your prompt in Step 1 to compile specialized syntax.")}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
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
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenExternalTool(selectedProviderB.url)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08] border border-white/10 transition cursor-pointer"
                  title={`Open ${selectedProviderB.name} in a new browser tab`}
                >
                  <span>Step 3 – Open External Tool</span>
                  <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
                </button>
              </div>
            </div>

            {/* Step 4: Import Zone */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[280px] rounded-xl border border-dashed border-black/10 dark:border-white/10 p-4 relative group">
              {agentBImage ? (
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="relative w-full aspect-square max-w-[340px] rounded-lg overflow-hidden bg-black/40 border border-white/10 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
                          setLightboxTitle("Image Agent B (Result)");
                        }}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition cursor-pointer"
                        title="Fullscreen Preview"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerDownload(agentBImage.url, `agent_b_${Date.now()}.png`)}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Chips B */}
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-neutral-400">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                        agentBImage.sourceClassification === "user_uploaded_image"
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {agentBImage.sourceClassification === "user_uploaded_image"
                        ? "User Imported Asset"
                        : "Local Procedural Preview"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10">
                      {agentBImage.format} • {agentBImage.width}×{agentBImage.height}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10">
                      {(agentBImage.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRefB.current?.click()}
                      className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 transition cursor-pointer"
                    >
                      Import Another
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
                    <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                      <RefreshCw className="w-7 h-7 text-violet-400 animate-spin" />
                      <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-violet-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgressB}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-300 font-medium">
                        {statusMsgB} ({uploadProgressB}%)
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelUpload("agent_b");
                        }}
                        className="px-2.5 py-1 text-[10px] text-rose-300 hover:bg-rose-500/20 rounded-md border border-rose-500/30 transition cursor-pointer"
                      >
                        Cancel Upload
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-neutral-200 block">
                          Step 4 – Drag &amp; Drop Image Here
                        </span>
                        <span className="text-[11px] text-neutral-500 block mt-1">
                          PNG, JPEG, or WEBP up to 25MB • Paste (Ctrl+V) or click to browse
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {errorB && (
                <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-1.5 truncate">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span className="truncate">{errorB}</span>
                  </div>
                  {lastFileB && (
                    <button
                      type="button"
                      onClick={() => handleRetryUpload("agent_b")}
                      className="shrink-0 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-semibold text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
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
            workspaceId="default"
            refreshTrigger={galleryRefreshKey}
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
              <span className="font-medium truncate max-w-xl">{lightboxTitle}</span>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
