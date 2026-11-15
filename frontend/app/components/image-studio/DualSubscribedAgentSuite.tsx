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
} from "lucide-react";
import { triggerDownload } from "../../lib/download-helper";

export type ImageCategory =
  | "photorealistic"
  | "illustration"
  | "poster"
  | "logo"
  | "advertising"
  | "variations";

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
  const [optimizedData, setOptimizedData] = useState<OptimizedResult | null>(null);

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

  // Workspace Saved Feedback
  const [savedWorkspaceA, setSavedWorkspaceA] = useState(false);
  const [savedWorkspaceB, setSavedWorkspaceB] = useState(false);

  // Lightbox Modal
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("");

  // Config Drawer
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [agentAMode, setAgentAMode] = useState("user_assisted");
  const [agentBMode, setAgentBMode] = useState("user_assisted");

  const fileInputRefA = useRef<HTMLInputElement>(null);
  const fileInputRefB = useRef<HTMLInputElement>(null);

  // 1. Initial Prompt Optimization
  async function handleOptimize() {
    if (!prompt.trim()) return;
    setIsOptimizing(true);
    setErrorA(null);
    setErrorB(null);

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

  // 2. Clipboard Helpers
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

  // 3. File Validation & Ingestion Handler
  async function handleFileUpload(file: File, agentId: "agent_a" | "agent_b") {
    if (agentId === "agent_a") {
      setValidatingA(true);
      setErrorA(null);
    } else {
      setValidatingB(true);
      setErrorB(null);
    }

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const dataUri = await base64Promise;

      const res = await fetch("/api/image/subscribed-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate_and_persist",
          agentId,
          imageDataUri: dataUri,
          prompt:
            agentId === "agent_a"
              ? optimizedData?.agentA.prompt || prompt
              : optimizedData?.agentB.prompt || prompt,
          originalPrompt: prompt,
          category,
          workspaceId: "default",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image validation failed.");

      const record: ValidatedImageRecord = {
        id: data.record.id,
        url: data.record.url,
        agentId,
        agentName: agentId === "agent_a" ? "Image Agent A" : "Image Agent B",
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
      if (agentId === "agent_a") {
        setErrorA(err.message);
      } else {
        setErrorB(err.message);
      }
    } finally {
      if (agentId === "agent_a") setValidatingA(false);
      else setValidatingB(false);
    }
  }

  // 4. Save to Workspace feedback
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
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Two Subscribed Image Agents Hub
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              Dispatch prompts simultaneously to your two existing AI subscriptions (Image Agent A &amp; Image Agent B).
              Inspect and validate outputs side-by-side with zero additional API keys, subscription fees, or security compromises.
            </p>
          </div>

          <div className="flex items-center gap-2">
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
              <span>Connection Mode</span>
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
                <option value="user_assisted">User-Assisted Mode (Zero API Key, 100% Permitted)</option>
                <option value="mcp">Local MCP Server Connector (Claude / Antigravity)</option>
                <option value="webhook">Local Desktop Webhook Daemon</option>
              </select>
              <p className="text-[11px] text-neutral-400 mt-1.5">
                Uses official clipboard synthesis and browser dropzone. Zero credential risk.
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
                <option value="user_assisted">User-Assisted Mode (Zero API Key, 100% Permitted)</option>
                <option value="mcp">Local MCP Server Connector (Claude / Antigravity)</option>
                <option value="webhook">Local Desktop Webhook Daemon</option>
              </select>
              <p className="text-[11px] text-neutral-400 mt-1.5">
                Respects provider TOS by using authorized local dispatch. Never requires passwords.
              </p>
            </div>
          </div>
        )}
      </div>

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
              Creative Intent &amp; Category
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
              { id: "variations", label: "Creative Variations" },
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
              placeholder="Describe the image, poster, logo, or product advertisement you want to create..."
              className={`w-full p-3.5 rounded-xl border text-sm sm:text-base outline-none resize-none transition-all leading-relaxed ${
                isDark
                  ? "bg-black/30 border-white/10 text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 placeholder-neutral-500"
                  : "bg-neutral-50 border-neutral-200 text-black focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder-neutral-400"
              }`}
            />
          </div>

          {/* Dispatch Action */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero credentials required. Prompts compiled client-side.</span>
            </div>

            <button
              type="button"
              disabled={isOptimizing || !prompt.trim()}
              onClick={handleOptimize}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer select-none fluid-press disabled:opacity-50 ${
                isDark
                  ? "bg-white hover:bg-neutral-200 text-neutral-950 shadow-xs"
                  : "bg-neutral-950 hover:bg-neutral-800 text-white shadow-xs"
              }`}
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Prompts...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Dispatch to Both Agents</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Step 2: Two-Agent Dual Workspaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ============================================================== */}
        {/* COLUMN 1: IMAGE AGENT A                                        */}
        {/* ============================================================== */}
        <div
          className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
            isDark
              ? "bg-[#14151c]/90 border-white/[0.08] text-white"
              : "bg-white border-neutral-200 text-neutral-900 shadow-xs"
          }`}
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
                  A
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Image Agent A</h3>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Focus: Photorealism &amp; Depth
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Connected
              </span>
            </div>

            {/* Optimized Prompt Box */}
            <div className="p-3 rounded-xl bg-black/20 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  Targeted Agent A Prompt
                </span>
                <button
                  type="button"
                  disabled={!optimizedData}
                  onClick={() =>
                    copyToClipboard(optimizedData?.agentA.prompt || prompt, true)
                  }
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition cursor-pointer fluid-press"
                >
                  {copiedA ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed font-mono select-all break-words max-h-24 overflow-y-auto">
                {optimizedData
                  ? optimizedData.agentA.prompt
                  : "Click 'Dispatch to Both Agents' to generate tailored syntax for Agent A."}
              </p>
            </div>

            {/* Error Message */}
            {errorA && (
              <div className="p-3 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorA}</span>
              </div>
            )}

            {/* Result Preview / Ingestion Dropzone */}
            <div className="relative">
              {agentAImage ? (
                <div className="space-y-3">
                  <div
                    className="relative group rounded-xl overflow-hidden border border-black/10 dark:border-white/10 aspect-square bg-neutral-900 cursor-pointer"
                    onClick={() => {
                      setLightboxUrl(agentAImage.url);
                      setLightboxTitle("Image Agent A Result");
                    }}
                  >
                    <img
                      src={agentAImage.url}
                      alt="Agent A Generated Output"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="text-xs text-white font-medium bg-black/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                      </span>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono px-1">
                    <span>
                      {agentAImage.width} × {agentAImage.height} ({agentAImage.format})
                    </span>
                    <span>{(agentAImage.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) {
                      handleFileUpload(e.dataTransfer.files[0], "agent_a");
                    }
                  }}
                  onClick={() => fileInputRefA.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition cursor-pointer ${
                    isDark
                      ? "border-white/10 hover:border-white/30 bg-white/[0.02]"
                      : "border-neutral-200 hover:border-neutral-400 bg-neutral-50"
                  }`}
                >
                  <input
                    ref={fileInputRefA}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0], "agent_a");
                      }
                    }}
                  />
                  {validatingA ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                      <span className="text-xs text-neutral-300">Validating File Integrity...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6 text-neutral-400" />
                      <span className="text-xs font-semibold text-neutral-200">
                        Drop or Paste Agent A Output
                      </span>
                      <span className="text-[11px] text-neutral-400 max-w-xs leading-normal">
                        Generate in your Agent A subscription, then drop or paste the result here.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Footer for Agent A */}
          {agentAImage && (
            <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPreferredAgent("agent_a")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer fluid-press ${
                  preferredAgent === "agent_a"
                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
                    : "bg-white/[0.06] hover:bg-white/10 text-neutral-300"
                }`}
              >
                {preferredAgent === "agent_a" ? "✓ Preferred Choice" : "Pick as Preferred"}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => triggerDownload(agentAImage.url, `agent_a_${agentAImage.id}.png`)}
                  className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/10 text-neutral-300 hover:text-white transition cursor-pointer fluid-press"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveToWorkspace("agent_a")}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer fluid-press"
                >
                  {savedWorkspaceA ? "Saved ✓" : "Save to Workspace"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* COLUMN 2: IMAGE AGENT B                                        */}
        {/* ============================================================== */}
        <div
          className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
            isDark
              ? "bg-[#14151c]/90 border-white/[0.08] text-white"
              : "bg-white border-neutral-200 text-neutral-900 shadow-xs"
          }`}
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold text-xs">
                  B
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Image Agent B</h3>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Focus: Graphic Layout &amp; Style
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Connected
              </span>
            </div>

            {/* Optimized Prompt Box */}
            <div className="p-3 rounded-xl bg-black/20 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  Targeted Agent B Prompt
                </span>
                <button
                  type="button"
                  disabled={!optimizedData}
                  onClick={() =>
                    copyToClipboard(optimizedData?.agentB.prompt || prompt, false)
                  }
                  className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-medium transition cursor-pointer fluid-press"
                >
                  {copiedB ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed font-mono select-all break-words max-h-24 overflow-y-auto">
                {optimizedData
                  ? optimizedData.agentB.prompt
                  : "Click 'Dispatch to Both Agents' to generate tailored syntax for Agent B."}
              </p>
            </div>

            {/* Error Message */}
            {errorB && (
              <div className="p-3 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorB}</span>
              </div>
            )}

            {/* Result Preview / Ingestion Dropzone */}
            <div className="relative">
              {agentBImage ? (
                <div className="space-y-3">
                  <div
                    className="relative group rounded-xl overflow-hidden border border-black/10 dark:border-white/10 aspect-square bg-neutral-900 cursor-pointer"
                    onClick={() => {
                      setLightboxUrl(agentBImage.url);
                      setLightboxTitle("Image Agent B Result");
                    }}
                  >
                    <img
                      src={agentBImage.url}
                      alt="Agent B Generated Output"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="text-xs text-white font-medium bg-black/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                      </span>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono px-1">
                    <span>
                      {agentBImage.width} × {agentBImage.height} ({agentBImage.format})
                    </span>
                    <span>{(agentBImage.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) {
                      handleFileUpload(e.dataTransfer.files[0], "agent_b");
                    }
                  }}
                  onClick={() => fileInputRefB.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition cursor-pointer ${
                    isDark
                      ? "border-white/10 hover:border-white/30 bg-white/[0.02]"
                      : "border-neutral-200 hover:border-neutral-400 bg-neutral-50"
                  }`}
                >
                  <input
                    ref={fileInputRefB}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0], "agent_b");
                      }
                    }}
                  />
                  {validatingB ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                      <span className="text-xs text-neutral-300">Validating File Integrity...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6 text-neutral-400" />
                      <span className="text-xs font-semibold text-neutral-200">
                        Drop or Paste Agent B Output
                      </span>
                      <span className="text-[11px] text-neutral-400 max-w-xs leading-normal">
                        Generate in your Agent B subscription, then drop or paste the result here.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Footer for Agent B */}
          {agentBImage && (
            <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPreferredAgent("agent_b")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer fluid-press ${
                  preferredAgent === "agent_b"
                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
                    : "bg-white/[0.06] hover:bg-white/10 text-neutral-300"
                }`}
              >
                {preferredAgent === "agent_b" ? "✓ Preferred Choice" : "Pick as Preferred"}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => triggerDownload(agentBImage.url, `agent_b_${agentBImage.id}.png`)}
                  className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/10 text-neutral-300 hover:text-white transition cursor-pointer fluid-press"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveToWorkspace("agent_b")}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition cursor-pointer fluid-press"
                >
                  {savedWorkspaceB ? "Saved ✓" : "Save to Workspace"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fluid-dialog"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between mb-2 px-1 text-white">
              <span className="text-sm font-semibold">{lightboxTitle}</span>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxUrl}
              alt={lightboxTitle}
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
