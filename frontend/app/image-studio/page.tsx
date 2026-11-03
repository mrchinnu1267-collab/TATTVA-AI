"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Image as ImageIcon,
  Layers,
  Loader2,
  Lock,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Unlock,
  Wand2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { triggerDownload } from "../lib/download-helper";
import type {
  AspectRatio,
  ImageMetadata,
  ImageQuality,
  ImageVerification,
  ProviderRuntimeStatus,
} from "../lib/image-engine/types";

interface AttemptSummary {
  index: number;
  provider: string;
  model: string;
  seed: number;
  latencyMs: number;
  prompt: string;
  error?: string;
  verification?: ImageVerification;
}

interface CompilerSummary {
  version: string;
  positive: string;
  negative: string;
  style: string;
  aspect_ratio: string;
  seed: number;
  width: number;
  height: number;
  requirements: Array<{ id: string; text: string; critical: boolean }>;
}

interface ImageApiResponse {
  image: string;
  metadata: ImageMetadata;
  verification: ImageVerification;
  accuracy: number;
  compiler: CompilerSummary;
  attempts: AttemptSummary[];
  warnings: string[];
}

interface HistoryItem {
  id: string;
  image: string;
  prompt: string;
  style: string;
  createdAt: number;
  metadata: ImageMetadata;
}

const STYLE_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "auto", label: "Auto" },
  { id: "realistic", label: "Photoreal" },
  { id: "cinematic", label: "Cinematic" },
  { id: "portrait", label: "Portrait" },
  { id: "anime", label: "Anime" },
  { id: "3d", label: "3D Render" },
  { id: "fantasy", label: "Fantasy" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "architecture", label: "Architecture" },
  { id: "vintage", label: "Vintage" },
  { id: "product", label: "Product" },
  { id: "minimal", label: "Minimal" },
];

const ASPECT_OPTIONS: Array<{ id: AspectRatio; label: string }> = [
  { id: "1:1", label: "Square 1:1" },
  { id: "4:3", label: "Classic 4:3" },
  { id: "3:4", label: "Portrait 3:4" },
  { id: "16:9", label: "Wide 16:9" },
  { id: "9:16", label: "Story 9:16" },
];

const PROVIDER_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "auto", label: "Auto (best available)" },
  { id: "gemini", label: "Google Gemini" },
  { id: "huggingface", label: "Hugging Face FLUX" },
  { id: "local", label: "Local CUDA engine" },
  { id: "pollinations", label: "Pollinations (free)" },
];

const QUALITY_OPTIONS: Array<{ id: ImageQuality; label: string; hint: string }> = [
  { id: "fast", label: "Fast", hint: "1 pass" },
  { id: "balanced", label: "Balanced", hint: "verify + 1 retry" },
  { id: "max", label: "Maximum", hint: "verify + 2 retries" },
];

const SAMPLE_PROMPTS = [
  "A cinematic portrait of an elderly Rajasthani musician playing a sarangi at golden hour, dust in the air, shallow depth of field",
  "A photorealistic product shot of a matte black smartwatch on wet volcanic stone, soft blue rim light, exactly two reflections",
  "A cozy reading nook inside a glass treehouse during rain, warm lamps, floating dust, Studio Ghibli inspired",
];

const HISTORY_KEY = "tattva_image_studio_history";
const THEME_KEY = "tattva_theme";

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function scoreColor(score: number): string {
  if (score >= 85) return "#10b981";
  if (score >= 65) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent adherence";
  if (score >= 85) return "Verified match";
  if (score >= 65) return "Close, minor deviations";
  return "Needs another pass";
}

function ScoreRing({ score }: { score: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold leading-none">{score}%</span>
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
          adherence
        </span>
      </div>
    </div>
  );
}

export default function ImageStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [quality, setQuality] = useState<ImageQuality>("balanced");
  const [provider, setProvider] = useState("auto");
  const [negative, setNegative] = useState("");
  const [seedInput, setSeedInput] = useState("");
  const [lockSeed, setLockSeed] = useState(false);
  const [verify, setVerify] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorHint, setErrorHint] = useState("");
  const [result, setResult] = useState<ImageApiResponse | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderRuntimeStatus[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [modKey, setModKey] = useState("Ctrl");

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isDark = theme === "dark";

  useEffect(() => {
    try {
      if (localStorage.getItem(THEME_KEY) === "dark") {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      }
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, 8));
      }
    } catch {
      // Ignore malformed local storage.
    }

    fetch("/api/image")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data.providers)) setProviders(data.providers);
      })
      .catch(() => undefined);

    if (/Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)) {
      setModKey("⌘");
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.round((Date.now() - started) / 1000)),
      500
    );
    return () => clearInterval(timer);
  }, [loading]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
        document.documentElement.classList.toggle("dark", next === "dark");
      } catch {
        // Ignore storage errors.
      }
      return next;
    });
  }, []);

  const persistHistory = useCallback((items: HistoryItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 8)));
    } catch {
      // Ignore storage limits.
    }
  }, []);

  const generate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    setErrorHint("");
    setCopied(false);

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          style,
          aspectRatio,
          quality,
          provider,
          customNegative: negative.trim() || undefined,
          referenceImage: referenceImage || undefined,
          seed: lockSeed && seedInput.trim() ? Number(seedInput) : undefined,
          verify,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Image generation failed.");
        setErrorHint(data.hint || "");
        return;
      }

      const apiResult = data as ImageApiResponse;
      setResult(apiResult);

      const item: HistoryItem = {
        id: `${Date.now()}`,
        image: apiResult.image,
        prompt: trimmed,
        style,
        createdAt: Date.now(),
        metadata: apiResult.metadata,
      };
      persistHistory([item, ...history].slice(0, 8));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Image generation failed."
      );
    } finally {
      setLoading(false);
    }
  }, [
    prompt,
    loading,
    style,
    aspectRatio,
    quality,
    provider,
    negative,
    referenceImage,
    lockSeed,
    seedInput,
    verify,
    history,
    persistHistory,
  ]);

  const copyPrompt = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.compiler.positive);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable.
    }
  }, [result]);

  const downloadCurrent = useCallback(() => {
    if (!result) return;
    triggerDownload(result.image, `tattva-${result.metadata.seed}.png`);
  }, [result]);

  const refineCurrent = useCallback(() => {
    if (!result) return;
    const fixes = result.verification.issues.slice(0, 3).join("; ");
    setPrompt(
      `${result.metadata.prompt}${
        fixes ? `\n\nCorrection: ${fixes}` : "\n\nImprove adherence while keeping every detail."
      }`
    );
    promptRef.current?.focus();
  }, [result]);

  const handleReferenceUpload = useCallback((file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Reference must be an image file.");
      return;
    }
    if (file.size > 9 * 1024 * 1024) {
      setError("Reference image must be under 9 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(String(reader.result || ""));
    reader.readAsDataURL(file);
    setError("");
  }, []);

  const providerBadge = useCallback(
    (id: string) => {
      const status = providers.find((item) => item.id === id);
      if (!status) return { label: "Checking", tone: "text-neutral-400", dot: "bg-neutral-400" };
      if (status.available)
        return { label: "Ready", tone: "text-emerald-500", dot: "bg-emerald-500" };
      return {
        label: status.configured ? "Unavailable" : "Not configured",
        tone: "text-neutral-400",
        dot: "bg-neutral-400",
      };
    },
    [providers]
  );

  const canGenerate = useMemo(() => prompt.trim().length >= 3 && !loading, [prompt, loading]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/chat"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-neutral-500 transition hover:text-[var(--foreground)]"
            title="Back to chat"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
              <Wand2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight">Image Studio</h1>
              <p className="truncate text-[10px] text-neutral-500">
                Compile · generate · vision-verify · retry
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--soft)] px-2.5 py-1 text-[10px] text-neutral-500 sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              {verify ? "Verification on" : "Verification off"}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-neutral-500 transition hover:text-[var(--foreground)]"
              title="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ---------------------------------------------------------- controls */}
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--soft)] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
              <Sparkles className="h-3.5 w-3.5" />
              Describe the image
            </h2>
            <span className="text-[10px] text-neutral-400">{prompt.length}/6000</span>
          </div>

          <textarea
            ref={promptRef}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value.slice(0, 6000))}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void generate();
              }
            }}
            rows={5}
            placeholder="A cinematic photo of a snow leopard on a rocky ridge at dawn, golden rim light, falling snow, exactly three paw prints in the foreground..."
            className="mt-3 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm leading-relaxed outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
          />

          {prompt.trim().length === 0 && (
            <div className="mt-3 space-y-1.5">
              {SAMPLE_PROMPTS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setPrompt(sample);
                    promptRef.current?.focus();
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-left text-[10px] leading-snug text-neutral-500 transition hover:border-neutral-400 hover:text-[var(--foreground)]"
                >
                  {sample}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Style
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STYLE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStyle(option.id)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
                    style === option.id
                      ? "border-transparent bg-[var(--foreground)] text-[var(--background)]"
                      : "border-[var(--border)] bg-[var(--background)] text-neutral-500 hover:text-[var(--foreground)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Aspect
              </span>
              <select
                value={aspectRatio}
                onChange={(event) => setAspectRatio(event.target.value as AspectRatio)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 text-xs outline-none"
              >
                {ASPECT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Provider
              </span>
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 text-xs outline-none"
              >
                {PROVIDER_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Quality
            </span>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {QUALITY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setQuality(option.id)}
                  className={`rounded-xl border px-2 py-2 text-left transition ${
                    quality === option.id
                      ? "border-[var(--foreground)] bg-[var(--background)]"
                      : "border-[var(--border)] bg-[var(--background)]/60 hover:border-neutral-400"
                  }`}
                >
                  <span className="block text-[11px] font-semibold">{option.label}</span>
                  <span className="block text-[9px] text-neutral-400">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[11px] font-medium text-neutral-500 transition hover:text-[var(--foreground)]"
          >
            <span className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" />
              Advanced controls
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
            />
          </button>

          {advancedOpen && (
            <div className="mt-2 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Negative prompt
                </label>
                <textarea
                  value={negative}
                  onChange={(event) => setNegative(event.target.value)}
                  rows={2}
                  placeholder="Extra things to avoid..."
                  className="mt-1.5 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--soft)] px-2.5 py-2 text-[11px] outline-none placeholder:text-neutral-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Seed
                </label>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    value={seedInput}
                    onChange={(event) => setSeedInput(event.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Random"
                    disabled={!lockSeed}
                    className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--soft)] px-2.5 py-2 text-[11px] outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setLockSeed((locked) => !locked)}
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                      lockSeed
                        ? "border-transparent bg-[var(--foreground)] text-[var(--background)]"
                        : "border-[var(--border)] text-neutral-500"
                    }`}
                    title={lockSeed ? "Unlock seed" : "Lock seed"}
                  >
                    {lockSeed ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">Vision verification</span>
                <button
                  type="button"
                  onClick={() => setVerify((value) => !value)}
                  className={`relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition ${
                    verify ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
                  }`}
                  title="Toggle verification"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                      verify ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Reference image (img2img)
                </span>
                <div className="mt-1.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-2.5 py-2 text-[11px] text-neutral-500 transition hover:text-[var(--foreground)]"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    {referenceImage ? "Replace" : "Upload"}
                  </button>
                  {referenceImage && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={referenceImage}
                        alt="Reference"
                        className="h-9 w-9 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setReferenceImage(null)}
                        className="text-neutral-400 hover:text-red-500"
                        title="Remove reference"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    handleReferenceUpload(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => void generate()}
            disabled={!canGenerate}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-bold text-[var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating · {elapsed}s
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Generate image
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[10px] text-neutral-400">
            {modKey}+Enter to generate
          </p>

          {error && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-[11px] text-red-500">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <p>{error}</p>
                  {errorHint && <p className="mt-1 text-[10px] opacity-80">{errorHint}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Providers
            </span>
            <div className="mt-2 space-y-1">
              {["gemini", "huggingface", "local", "pollinations"].map((id) => {
                const badge = providerBadge(id);
                return (
                  <div key={id} className="flex items-center justify-between text-[10px]">
                    <span className="capitalize text-neutral-500">{id === "huggingface" ? "Hugging Face" : id}</span>
                    <span className={`flex items-center gap-1.5 ${badge.tone}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ result */}
        <section className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--soft)]">
            <div className="relative flex min-h-[280px] items-center justify-center bg-[var(--background)] p-3 sm:min-h-[420px]">
              {loading && (
                <div className="flex flex-col items-center gap-3 text-neutral-400">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-xs">Compiling prompt and generating…</p>
                </div>
              )}

              {!loading && result && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.image}
                  alt={result.metadata.prompt}
                  className="max-h-[62vh] w-auto max-w-full rounded-2xl object-contain shadow-sm"
                />
              )}

              {!loading && !result && (
                <div className="flex max-w-xs flex-col items-center gap-3 text-center text-neutral-400">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--soft)]">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <p className="text-xs leading-relaxed">
                    Your generated image will appear here. Explicit details like counts, colors,
                    names, and quoted text are compiled into a checklist and verified.
                  </p>
                </div>
              )}
            </div>

            {result && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--border)] px-4 py-3 text-[10px] text-neutral-500">
                <span className="font-semibold text-[var(--foreground)]">{result.metadata.model}</span>
                <span>{result.metadata.provider}</span>
                <span>
                  {result.metadata.width}×{result.metadata.height}
                </span>
                <span>seed {result.metadata.seed}</span>
                <span>{formatDuration(result.metadata.generation_time_seconds * 1000)}</span>
                <span>
                  {result.metadata.attempts} attempt{result.metadata.attempts === 1 ? "" : "s"}
                </span>
                <span className="ml-auto capitalize">{result.metadata.style}</span>
              </div>
            )}
          </div>

          {result && (
            <>
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--soft)] p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <ScoreRing score={result.accuracy} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold">{scoreLabel(result.accuracy)}</h2>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-500">
                        {result.verification.method === "vision" ? "Vision verified" : "Structural check"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                      {result.verification.issues.length > 0
                        ? result.verification.issues.slice(0, 3).join(" · ")
                        : "All extracted requirements were confirmed in the generated image."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={downloadCurrent}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--foreground)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--background)]"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={refineCurrent}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-[10px] font-semibold text-neutral-600 transition hover:text-[var(--foreground)]"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refine prompt
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyPrompt()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-[10px] font-semibold text-neutral-600 transition hover:text-[var(--foreground)]"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied" : "Copy compiled"}
                      </button>
                    </div>
                  </div>
                </div>

                {result.verification.requirements.length > 0 && (
                  <div className="mt-4 border-t border-[var(--border)] pt-3">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                      Requirement audit
                    </h3>
                    <div className="mt-2 space-y-1.5">
                      {result.verification.requirements.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-2 rounded-lg bg-[var(--background)] px-2.5 py-1.5 text-[10px]"
                        >
                          {item.met === true ? (
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : item.met === false ? (
                            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          )}
                          <div className="min-w-0">
                            <p className={item.met === false ? "text-red-500" : ""}>{item.text}</p>
                            {item.note && <p className="mt-0.5 text-[9px] text-neutral-400">{item.note}</p>}
                          </div>
                          {item.critical && (
                            <span className="ml-auto shrink-0 text-[8px] font-bold uppercase tracking-wider text-neutral-400">
                              critical
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.verification.suggestedFix && (
                  <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-600 dark:text-amber-400">
                    <span className="font-semibold">Suggested fix:</span> {result.verification.suggestedFix}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-[var(--border)] bg-[var(--soft)] p-4 sm:p-5">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Compiler output
                </h3>
                <div className="mt-2 space-y-2">
                  <details className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                    <summary className="cursor-pointer text-[11px] font-medium">
                      Positive prompt · {result.compiler.version}
                    </summary>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-neutral-500">
                      {result.compiler.positive}
                    </pre>
                  </details>
                  <details className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                    <summary className="cursor-pointer text-[11px] font-medium">Negative prompt</summary>
                    <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
                      {result.compiler.negative}
                    </p>
                  </details>
                  <details className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                    <summary className="cursor-pointer text-[11px] font-medium">
                      Attempt log · {result.attempts.length}
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      {result.attempts.map((attempt) => (
                        <div
                          key={`${attempt.index}-${attempt.provider}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--soft)] px-2.5 py-1.5 text-[10px]"
                        >
                          <span className="font-medium">
                            #{attempt.index} {attempt.provider}
                          </span>
                          {attempt.error ? (
                            <span className="text-red-500">{attempt.error}</span>
                          ) : (
                            <span className="text-neutral-400">
                              seed {attempt.seed} ·{" "}
                              {attempt.verification
                                ? `${attempt.verification.score}% · ${formatDuration(attempt.latencyMs)}`
                                : formatDuration(attempt.latencyMs)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>

                {result.warnings.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {result.warnings.slice(0, 4).map((warning) => (
                      <p key={warning} className="text-[9px] leading-relaxed text-neutral-400">
                        {warning}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {history.length > 0 && (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--soft)] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  <Layers className="h-3.5 w-3.5" />
                  Recent
                </h3>
                <button
                  type="button"
                  onClick={() => persistHistory([])}
                  className="inline-flex items-center gap-1 text-[10px] text-neutral-400 transition hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPrompt(item.prompt);
                      promptRef.current?.focus();
                    }}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--border)]"
                    title={item.prompt}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.prompt}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--soft)] px-3 py-2.5 text-[10px] leading-relaxed text-neutral-400">
            <strong className="text-neutral-500">Why scores vary:</strong> no diffusion model can
            guarantee pixel-perfect text or counts. TATTVA compiles explicit requirements, checks the
            result with a vision model, and retries with a corrected prompt. Free Pollinations is
            limited to one image every 45s at 768×768; Gemini and Hugging Face need quota/credits.
          </div>
        </section>
      </div>
    </main>
  );
}
