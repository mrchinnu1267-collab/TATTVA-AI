"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Layers,
  Download,
  RefreshCw,
  Sliders,
  Eye,
  Copy,
  Check,
  Share2,
  History,
  Trash2,
  Maximize2,
  X,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Palette,
  Sun,
  Camera,
  Compass,
  Heart,
  Cpu,
  ArrowRight,
  Radio,
  FolderArchive,
  Volume2,
} from "lucide-react";
import { triggerDownload } from "../lib/download-helper";

type StudioTab = "generate" | "edit";

interface PromptBreakdown {
  main_subject?: string;
  environment?: string;
  objects?: string;
  actions?: string;
  artistic_style?: string;
  lighting?: string;
  camera_angle?: string;
  composition?: string;
  mood?: string;
  color_palette?: string;
}

interface GeneratedItem {
  id: string;
  url: string;
  prompt: string;
  enhancedPrompt?: string;
  breakdown?: PromptBreakdown;
  style: string;
  aspectRatio: string;
  dimensions: { width: number; height: number };
  model: string;
  steps: number;
  seed: number;
  generationTime: number;
  timestamp: number;
  isEdit?: boolean;
}

const VISUAL_STYLES = [
  { id: "realistic", label: "Photorealistic", icon: "📸", desc: "Authentic skin pores, 8K optical realism" },
  { id: "cinematic", label: "Cinematic Film", icon: "🎬", desc: "35mm anamorphic frame, volumetric shadows" },
  { id: "anime", label: "Anime / Manga", icon: "🎨", desc: "Makoto Shinkai style, vibrant palettes" },
  { id: "3d", label: "3D Octane Render", icon: "💎", desc: "Ray-traced lighting, subsurface materials" },
  { id: "concept", label: "Digital Concept Art", icon: "🖌️", desc: "Atmospheric speedpainting, epic scenery" },
  { id: "portrait", label: "Studio Portrait", icon: "👤", desc: "High-end studio softbox, Hasselblad crispness" },
  { id: "architecture", label: "Architectural", icon: "🏛️", desc: "Clean travertine stone, geometric minimalism" },
  { id: "fantasy", label: "Dark Fantasy", icon: "✨", desc: "Ethereal glow, mystical runes & mist" },
  { id: "vintage", label: "Vintage 35mm", icon: "🎞️", desc: "Kodak Portra 400 grain, warm nostalgia" },
];

const ASPECT_RATIOS = [
  { label: "1:1 Square", width: 512, height: 512, ratioClass: "aspect-square", desc: "Social, Avatar" },
  { label: "16:9 Cinema", width: 768, height: 512, ratioClass: "aspect-video", desc: "Widescreen, Wallpaper" },
  { label: "9:16 Portrait", width: 512, height: 768, ratioClass: "aspect-[9/16]", desc: "Mobile, Stories" },
  { label: "4:3 Classic", width: 640, height: 480, ratioClass: "aspect-[4/3]", desc: "Standard, Canvas" },
  { label: "3:2 Photo", width: 768, height: 512, ratioClass: "aspect-[3/2]", desc: "Photography" },
];

const QUICK_EDIT_PROMPTS = [
  "Change the background into a cyberpunk rainy Tokyo night with neon reflections",
  "Transform into Studio Ghibli vibrant anime aesthetic",
  "Improve lighting with golden hour volumetric sun rays and soft shadows",
  "Change clothing into a tailored sleek black leather trench coat",
  "Replace background with an ancient minimalist marble courtyard and lotus pond",
  "Enhance photorealism with 8K ultra-sharp details, skin pores and fine textures",
];

export default function StudioPage() {
  const [tab, setTab] = useState<StudioTab>("generate");
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("realistic");
  const [aspectIndex, setAspectIndex] = useState(0);
  const [batchCount, setBatchCount] = useState<1 | 2 | 4>(1);

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [steps, setSteps] = useState(25);
  const [guidanceScale, setGuidanceScale] = useState(7.0);
  const [seed, setSeed] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(
    "deformed, bad anatomy, disfigured, poorly drawn face, mutation, mutated, extra limb, ugly, disgusting, poorly drawn hands, missing limb, floating limbs, disconnected limbs, malformed hands, blurry, watermark"
  );

  // Prompt understanding state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [breakdown, setBreakdown] = useState<PromptBreakdown | null>(null);

  // Image editing state
  const [editImageBase64, setEditImageBase64] = useState<string>("");
  const [editPrompt, setEditPrompt] = useState("");
  const [editStrength, setEditStrength] = useState(0.65);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStage, setProgressStage] = useState("");
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [activeImage, setActiveImage] = useState<string>("");
  const [batchImages, setBatchImages] = useState<string[]>([]);
  const [currentMeta, setCurrentMeta] = useState<GeneratedItem | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<GeneratedItem[]>([]);
  const [engineInfo, setEngineInfo] = useState<{ gpu?: string; online: boolean }>({
    gpu: "CUDA GPU",
    online: true,
  });

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tattva_studio_history");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHistory(parsed);
          setActiveImage(parsed[0].url);
          setCurrentMeta(parsed[0]);
          setBreakdown(parsed[0].breakdown || null);
        }
      }
    } catch {
      // ignore
    }

    // Check engine health
    fetch("/api/generate-image")
      .then((res) => res.json())
      .then((data) => {
        setEngineInfo({
          gpu: data.gpu?.device || (data.localOnline ? "RTX 3050 CUDA" : "Cloud FLUX Engine"),
          online: Boolean(data.success),
        });
      })
      .catch(() => {
        setEngineInfo({ gpu: "Cloud FLUX Engine", online: true });
      });
  }, []);

  function saveToHistory(item: GeneratedItem) {
    setHistory((prev) => {
      const updated = [item, ...prev.filter((i) => i.id !== item.id)].slice(0, 30);
      try {
        localStorage.setItem("tattva_studio_history", JSON.stringify(updated));
      } catch {
        // quota exceeded fallback
      }
      return updated;
    });
  }

  function clearHistory() {
    if (confirm("Clear your studio image history?")) {
      setHistory([]);
      localStorage.removeItem("tattva_studio_history");
    }
  }

  // 1. AI Prompt Understanding & Enhancement
  async function handleEnhancePrompt() {
    const targetPrompt = (tab === "edit" ? editPrompt : prompt).trim();
    if (!targetPrompt) {
      setError("Please write a prompt to enhance.");
      return;
    }

    setIsEnhancing(true);
    setError("");

    try {
      const styleName = VISUAL_STYLES.find((s) => s.id === selectedStyle)?.label || "";
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: targetPrompt, style: styleName }),
      });

      if (!res.ok) throw new Error("Prompt enhancement failed");

      const data = await res.json();
      if (data.enhanced_prompt) {
        setEnhancedPrompt(data.enhanced_prompt);
        setBreakdown(data.breakdown || null);

        if (tab === "generate") {
          setPrompt(data.enhanced_prompt);
        } else {
          setEditPrompt(data.enhanced_prompt);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to enhance prompt.");
    } finally {
      setIsEnhancing(false);
    }
  }

  // 2. Handle Image Upload for Editing
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size exceeds 10MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setEditImageBase64(result);
      setTab("edit");
      setError("");
    };
    reader.readAsDataURL(file);
  }

  // Send current image to editing mode
  function sendToEditMode(imgUrl: string) {
    setEditImageBase64(imgUrl);
    setTab("edit");
    setEditPrompt("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 3. Image Generation Pipeline
  async function handleGenerate(isEditMode = false) {
    const targetPrompt = (isEditMode ? editPrompt : prompt).trim();
    if (!targetPrompt || targetPrompt.length < 3) {
      setError("Please describe the artwork in at least 3 characters.");
      return;
    }

    if (isEditMode && !editImageBase64) {
      setError("Please upload a reference image to edit.");
      return;
    }

    setIsGenerating(true);
    setError("");
    setProgressStage("Analyzing prompt & initializing GPU diffusion...");

    const started = Date.now();
    const ratio = ASPECT_RATIOS[aspectIndex];
    const parsedSeed = seed.trim() ? Number(seed) : undefined;
    const count = isEditMode ? 1 : batchCount;

    try {
      const generatedList: string[] = [];

      for (let i = 0; i < count; i++) {
        setProgressStage(
          count > 1
            ? `Synthesizing image ${i + 1} of ${count}...`
            : "Executing diffusion steps on CUDA engine..."
        );

        const currentSeed =
          parsedSeed !== undefined
            ? parsedSeed + i
            : Math.floor(Math.random() * 2147483647);

        const payload: Record<string, unknown> = {
          prompt: targetPrompt,
          style: selectedStyle,
          enhance_prompt: false,
          steps,
          guidance_scale: guidanceScale,
          seed: currentSeed,
          width: ratio.width,
          height: ratio.height,
          negative_prompt: negativePrompt.trim() || undefined,
        };

        if (isEditMode) {
          payload.image = editImageBase64;
          payload.strength = editStrength;
        }

        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success || !data.image) {
          throw new Error(data.error || "Generation failed on image engine.");
        }

        generatedList.push(data.image);

        if (i === 0) {
          setActiveImage(data.image);
          const elapsed = Math.round((Date.now() - started) / 100) / 10;
          setGenerationTime(elapsed);

          const historyItem: GeneratedItem = {
            id: `img_${Date.now()}_${i}`,
            url: data.image,
            prompt: targetPrompt,
            enhancedPrompt: data.enhanced_prompt || enhancedPrompt,
            breakdown: breakdown || undefined,
            style: VISUAL_STYLES.find((s) => s.id === selectedStyle)?.label || "Custom",
            aspectRatio: ratio.label,
            dimensions: { width: ratio.width, height: ratio.height },
            model: data.model || "Realistic Vision V5.1",
            steps,
            seed: currentSeed,
            generationTime: elapsed,
            timestamp: Date.now(),
            isEdit: isEditMode,
          };

          setCurrentMeta(historyItem);
          saveToHistory(historyItem);
        } else {
          const item: GeneratedItem = {
            id: `img_${Date.now()}_${i}`,
            url: data.image,
            prompt: targetPrompt,
            style: VISUAL_STYLES.find((s) => s.id === selectedStyle)?.label || "Custom",
            aspectRatio: ratio.label,
            dimensions: { width: ratio.width, height: ratio.height },
            model: data.model || "Realistic Vision V5.1",
            steps,
            seed: currentSeed,
            generationTime: Math.round((Date.now() - started) / 100) / 10,
            timestamp: Date.now(),
            isEdit: isEditMode,
          };
          saveToHistory(item);
        }
      }

      setBatchImages(generatedList);
      setProgressStage("Complete!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Image generation failed.");
    } finally {
      setIsGenerating(false);
      setProgressStage("");
    }
  }

  function downloadImage(url = activeImage) {
    if (!url) return;
    triggerDownload(url, `tattva-studio-${Date.now()}.png`, "image/png");
  }

  function copyPromptToClipboard() {
    const textToCopy = currentMeta?.prompt || prompt || editPrompt;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-black selection:text-white antialiased flex flex-col justify-between">
      {/* FULLSCREEN LIGHTBOX MODAL */}
      {fullscreenImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-h-[92vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={fullscreenImage}
              alt="Fullscreen view"
              width={1024}
              height={1024}
              unoptimized
              className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
            <div className="mt-4 flex items-center justify-between text-xs text-neutral-200">
              <span className="truncate max-w-md font-medium">{currentMeta?.prompt}</span>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => downloadImage(fullscreenImage)}
                  className="rounded-xl bg-white px-3.5 py-1.5 font-medium text-black hover:bg-neutral-200 transition"
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={() => setFullscreenImage(null)}
                  className="rounded-xl border border-white/20 bg-black/50 px-3.5 py-1.5 font-medium text-white hover:bg-white/10 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white shadow-xs">
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="leading-tight">
                <span className="text-sm font-bold tracking-tight text-neutral-900">TATTVA AI</span>
                <span className="block text-[10px] font-medium text-neutral-400">Image Generation Studio</span>
              </div>
            </a>

          </div>

          {/* ALL 4 OPTIONS IN SAME PLACE AS IN THE NAVIGATION */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* 1. Live Voice Mode */}
            <a
              href="/voice"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 shadow-xs"
              title="ChatGPT-Style Live Voice Mode"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
              <span>Live Voice Mode</span>
            </a>

            {/* 2. Image Studio (Active) */}
            <div
              className="flex items-center gap-1.5 rounded-xl border border-black bg-black px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
              title="AI Image Generation Studio"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Image Studio</span>
            </div>

            {/* 3. Media / Document Studio */}
            <a
              href="/media"
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50 shadow-xs"
              title="AI Document & Media Studio (PDF, DOCX, PPTX, XLSX, CSV)"
            >
              <FolderArchive className="w-3.5 h-3.5 text-black" />
              <span>Media</span>
            </a>

            {/* 4. Sare Voice / Chat */}
            <a
              href="/chat"
              className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-neutral-100 transition shadow-xs"
              title="Open Chat & Sare Voice"
            >
              <Volume2 className="w-3.5 h-3.5 text-neutral-700" />
              <span>Sare Voice OFF</span>
            </a>

            {/* GPU Tag */}
            <div className="hidden lg:flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <Cpu className="h-3 w-3 text-neutral-500" />
              <span>{engineInfo.gpu}</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN STUDIO CONTAINER */}
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 py-6 flex-1">
        {/* MODE SWITCHER TABS */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
          <div className="flex rounded-xl border border-neutral-200 bg-neutral-100/80 p-1">
            <button
              type="button"
              onClick={() => {
                setTab("generate");
                setError("");
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                tab === "generate"
                  ? "bg-white text-black shadow-xs"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Text to Image</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("edit");
                setError("");
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                tab === "edit"
                  ? "bg-white text-black shadow-xs"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Image Editing &amp; Modification</span>
            </button>
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-600 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {/* STUDIO TWO-COLUMN WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          {/* =========================================================================
              LEFT COLUMN: PROMPT INPUT & CONTROL PANEL
          ========================================================================= */}
          <div className="space-y-6">
            {/* TAB 1: TEXT TO IMAGE CONTROLS */}
            {tab === "generate" && (
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                {/* Header with Enhance button */}
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="studio-prompt-input" className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                    Prompt Input
                  </label>
                  <button
                    type="button"
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancing || !prompt.trim()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100 disabled:opacity-40"
                    title="Let AI extract subject, lighting, composition & expand diffusion fidelity"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>{isEnhancing ? "Understanding Prompt..." : "Enhance with AI"}</span>
                  </button>
                </div>

                {/* Prompt Textarea */}
                <textarea
                  id="studio-prompt-input"
                  rows={5}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !isGenerating) {
                      e.preventDefault();
                      void handleGenerate(false);
                    }
                  }}
                  disabled={isGenerating}
                  placeholder="Describe your scene in full detail: subjects, setting, lighting, materials, dynamic action, camera optics, and atmosphere... (Supports English, Hindi, and any natural language)"
                  className="w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 text-sm leading-relaxed text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black disabled:opacity-50"
                />

                {/* 10-Dimension Breakdown Tags (if available) */}
                {breakdown && (
                  <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-2.5">
                      AI Extracted Prompt Dimensions
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {breakdown.main_subject && (
                        <div className="rounded-lg bg-white p-2 border border-neutral-200/80">
                          <span className="font-semibold text-neutral-500 block">Subject</span>
                          <span className="text-neutral-800 line-clamp-2">{breakdown.main_subject}</span>
                        </div>
                      )}
                      {breakdown.lighting && (
                        <div className="rounded-lg bg-white p-2 border border-neutral-200/80">
                          <span className="font-semibold text-neutral-500 block">Lighting</span>
                          <span className="text-neutral-800 line-clamp-2">{breakdown.lighting}</span>
                        </div>
                      )}
                      {breakdown.environment && (
                        <div className="rounded-lg bg-white p-2 border border-neutral-200/80">
                          <span className="font-semibold text-neutral-500 block">Environment</span>
                          <span className="text-neutral-800 line-clamp-2">{breakdown.environment}</span>
                        </div>
                      )}
                      {breakdown.composition && (
                        <div className="rounded-lg bg-white p-2 border border-neutral-200/80">
                          <span className="font-semibold text-neutral-500 block">Composition</span>
                          <span className="text-neutral-800 line-clamp-2">{breakdown.composition}</span>
                        </div>
                      )}
                      {breakdown.mood && (
                        <div className="rounded-lg bg-white p-2 border border-neutral-200/80">
                          <span className="font-semibold text-neutral-500 block">Mood</span>
                          <span className="text-neutral-800 line-clamp-2">{breakdown.mood}</span>
                        </div>
                      )}
                      {breakdown.color_palette && (
                        <div className="rounded-lg bg-white p-2 border border-neutral-200/80">
                          <span className="font-semibold text-neutral-500 block">Color Palette</span>
                          <span className="text-neutral-800 line-clamp-2">{breakdown.color_palette}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* VISUAL STYLE SELECTION */}
                <div className="mt-5">
                  <span className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2.5">
                    Visual Style
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {VISUAL_STYLES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedStyle(st.id)}
                        disabled={isGenerating}
                        className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition ${
                          selectedStyle === st.id
                            ? "border-black bg-black text-white shadow-xs"
                            : "border-neutral-200 bg-neutral-50/60 text-neutral-800 hover:border-neutral-300 hover:bg-neutral-100"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-xs">
                          <span>{st.icon}</span>
                          <span className="truncate">{st.label}</span>
                        </div>
                        <span
                          className={`text-[10px] mt-0.5 line-clamp-1 ${
                            selectedStyle === st.id ? "text-neutral-300" : "text-neutral-400"
                          }`}
                        >
                          {st.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ASPECT RATIO SELECTION */}
                <div className="mt-5">
                  <span className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2.5">
                    Aspect Ratio
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {ASPECT_RATIOS.map((ratio, idx) => (
                      <button
                        key={ratio.label}
                        type="button"
                        onClick={() => setAspectIndex(idx)}
                        disabled={isGenerating}
                        className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs transition ${
                          aspectIndex === idx
                            ? "border-black bg-black text-white shadow-xs"
                            : "border-neutral-200 bg-neutral-50/60 text-neutral-800 hover:border-neutral-300 hover:bg-neutral-100"
                        }`}
                      >
                        <span className="font-semibold">{ratio.label.split(" ")[0]}</span>
                        <span
                          className={`text-[10px] ${
                            aspectIndex === idx ? "text-neutral-300" : "text-neutral-400"
                          }`}
                        >
                          {ratio.width}×{ratio.height}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* BATCH COUNT SELECTOR */}
                <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                      Batch Quantity
                    </span>
                    <p className="text-[11px] text-neutral-400">Generate multiple variations simultaneously</p>
                  </div>
                  <div className="flex rounded-xl border border-neutral-200 bg-neutral-100 p-1">
                    {([1, 2, 4] as const).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setBatchCount(num)}
                        disabled={isGenerating}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                          batchCount === num
                            ? "bg-white text-black shadow-xs"
                            : "text-neutral-500 hover:text-black"
                        }`}
                      >
                        {num}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* ADVANCED PARAMETERS DRAWER */}
                <div className="mt-4 border-t border-neutral-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black transition"
                  >
                    {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    <span>Advanced Tuning (Inference Steps, Guidance Scale, Seed, Negative Prompt)</span>
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1.5">
                          <span className="text-neutral-700">Inference Steps</span>
                          <span className="font-mono font-bold text-neutral-900">{steps}</span>
                        </div>
                        <input
                          type="range"
                          min={15}
                          max={35}
                          step={1}
                          value={steps}
                          disabled={isGenerating}
                          onChange={(e) => setSteps(Number(e.target.value))}
                          className="w-full accent-black cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1.5">
                          <span className="text-neutral-700">Guidance Scale (CFG)</span>
                          <span className="font-mono font-bold text-neutral-900">{guidanceScale.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={12}
                          step={0.5}
                          value={guidanceScale}
                          disabled={isGenerating}
                          onChange={(e) => setGuidanceScale(Number(e.target.value))}
                          className="w-full accent-black cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Seed (Leave empty for random generation)
                        </label>
                        <input
                          type="number"
                          placeholder="Random seed (auto)"
                          value={seed}
                          disabled={isGenerating}
                          onChange={(e) => setSeed(e.target.value)}
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs outline-none focus:border-black"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Negative Prompt
                        </label>
                        <textarea
                          rows={2}
                          value={negativePrompt}
                          disabled={isGenerating}
                          onChange={(e) => setNegativePrompt(e.target.value)}
                          className="w-full resize-none rounded-xl border border-neutral-200 bg-white p-2.5 text-xs outline-none focus:border-black"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* PRIMARY GENERATE BUTTON */}
                <button
                  type="button"
                  onClick={() => void handleGenerate(false)}
                  disabled={isGenerating || prompt.trim().length < 3}
                  className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-black text-sm font-semibold text-white shadow-md transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isGenerating ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <span>{progressStage || "Synthesizing artwork on GPU..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generate {batchCount > 1 ? `${batchCount} Artworks` : "Artwork"}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 2: IMAGE EDITING & MODIFICATION CONTROLS */}
            {tab === "edit" && (
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm space-y-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Image-to-Image &amp; Targeted Editing
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Upload an existing artwork or photo, and describe what to change while preserving the core subject.
                  </p>
                </div>

                {/* Upload Box */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {editImageBase64 ? (
                    <div className="relative rounded-2xl border border-neutral-200 overflow-hidden bg-neutral-50 p-2 flex items-center gap-4">
                      <Image
                        src={editImageBase64}
                        alt="Reference image"
                        width={90}
                        height={90}
                        unoptimized
                        className="h-20 w-20 rounded-xl object-cover border border-neutral-200"
                      />
                      <div className="flex-1 text-xs">
                        <span className="font-semibold text-neutral-900 block">Reference Image Loaded</span>
                        <span className="text-[11px] text-neutral-500 block mt-0.5">Ready for modification instructions</span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2 text-xs font-medium text-neutral-800 underline hover:text-black"
                        >
                          Change Reference Image
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditImageBase64("")}
                        className="p-2 text-neutral-400 hover:text-red-600 transition"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50/70 p-6 text-center transition hover:border-black hover:bg-neutral-50"
                    >
                      <UploadCloud className="mx-auto h-8 w-8 text-neutral-400" />
                      <span className="mt-2 block text-xs font-semibold text-neutral-800">
                        Upload Reference Image to Modify
                      </span>
                      <span className="mt-0.5 block text-[11px] text-neutral-400">
                        PNG, JPG, WebP up to 10MB
                      </span>
                    </div>
                  )}
                </div>

                {/* Modification Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="edit-prompt-input" className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                      Describe Modifications
                    </label>
                    <button
                      type="button"
                      onClick={handleEnhancePrompt}
                      disabled={isEnhancing || !editPrompt.trim()}
                      className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black transition"
                    >
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      <span>Enhance edit prompt</span>
                    </button>
                  </div>
                  <textarea
                    id="edit-prompt-input"
                    rows={4}
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    disabled={isGenerating}
                    placeholder="e.g. Change the background into an illuminated futuristic skyline, change attire to a formal tuxedo, improve lighting with golden ambient backlight..."
                    className="w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 text-sm leading-relaxed text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black disabled:opacity-50"
                  />
                </div>

                {/* Quick Edit Suggestion Chips */}
                <div>
                  <span className="block text-[11px] font-semibold text-neutral-500 mb-2">
                    Quick Modification Ideas
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_EDIT_PROMPTS.map((qp) => (
                      <button
                        key={qp}
                        type="button"
                        onClick={() => setEditPrompt(qp)}
                        className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] text-neutral-700 transition hover:border-neutral-300 hover:bg-white"
                      >
                        {qp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modification Strength Slider */}
                <div className="border-t border-neutral-100 pt-4">
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-neutral-700">Modification Strength (Influence)</span>
                    <span className="font-mono font-bold text-neutral-900">{Math.round(editStrength * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={0.9}
                    step={0.05}
                    value={editStrength}
                    disabled={isGenerating}
                    onChange={(e) => setEditStrength(Number(e.target.value))}
                    className="w-full accent-black cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                    <span>Subtle Tweak (20%)</span>
                    <span>Balanced (65%)</span>
                    <span>Radical Reimagining (90%)</span>
                  </div>
                </div>

                {/* Primary Edit Button */}
                <button
                  type="button"
                  onClick={() => void handleGenerate(true)}
                  disabled={isGenerating || !editImageBase64 || editPrompt.trim().length < 3}
                  className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-black text-sm font-semibold text-white shadow-md transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isGenerating ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <span>Applying AI edits to image...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      <span>Apply Image Modifications</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 flex items-start gap-3">
                <span className="font-bold">Error:</span>
                <span className="flex-1">{error}</span>
              </div>
            )}
          </div>

          {/* =========================================================================
              RIGHT COLUMN: STUDIO CANVAS & PREVIEW GALLERY
          ========================================================================= */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
              {/* Canvas Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Studio Canvas</h2>
                  <p className="text-[11px] text-neutral-400">High-resolution GPU render stage</p>
                </div>

                {activeImage && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFullscreenImage(activeImage)}
                      className="rounded-lg border border-neutral-200 p-1.5 text-neutral-600 hover:bg-neutral-50 transition"
                      title="Fullscreen Zoom"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadImage(activeImage)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Main Canvas Area */}
              <div className="relative flex min-h-[460px] items-center justify-center bg-neutral-50/60 p-6">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center" role="status">
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-neutral-200 bg-white shadow-sm">
                      <div className="absolute inset-0 rounded-3xl border border-black animate-ping opacity-20" />
                      <Sparkles className="h-7 w-7 text-black animate-pulse" />
                    </div>
                    <h3 className="mt-5 text-sm font-bold text-neutral-900">Synthesizing Artwork</h3>
                    <p className="mt-1.5 max-w-xs text-xs text-neutral-500 leading-relaxed">
                      {progressStage || "Your CUDA GPU is executing denoising iterations..."}
                    </p>
                    <div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-neutral-200">
                      <div className="h-full w-2/3 animate-pulse bg-black rounded-full" />
                    </div>
                  </div>
                ) : activeImage ? (
                  <div className="relative group w-full flex flex-col items-center">
                    <Image
                      src={activeImage}
                      alt={currentMeta?.prompt || "Artwork"}
                      width={currentMeta?.dimensions?.width || 512}
                      height={currentMeta?.dimensions?.height || 512}
                      unoptimized
                      className="mx-auto max-h-[520px] w-auto rounded-2xl object-contain shadow-md cursor-zoom-in"
                      onClick={() => setFullscreenImage(activeImage)}
                    />

                    {/* Quick Canvas Toolbar */}
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => sendToEditMode(activeImage)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100 shadow-2xs"
                      >
                        <Wand2 className="h-3.5 w-3.5 text-black" />
                        <span>Edit This Image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleGenerate(false)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100 shadow-2xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-black" />
                        <span>Regenerate</span>
                      </button>
                      <button
                        type="button"
                        onClick={copyPromptToClipboard}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100 shadow-2xs"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-black" />}
                        <span>{copied ? "Copied" : "Copy Prompt"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-xs text-center p-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-neutral-200 bg-white text-black shadow-xs">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-sm font-bold text-neutral-900">Awaiting Generation</h3>
                    <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                      Type your description or upload an image to begin producing high-fidelity visual artwork.
                    </p>
                  </div>
                )}
              </div>

              {/* Batch Images Gallery (if batch generated) */}
              {batchImages.length > 1 && (
                <div className="border-t border-neutral-100 bg-neutral-50/50 p-4">
                  <span className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                    Batch Variations ({batchImages.length})
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {batchImages.map((bImg, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImage(bImg)}
                        className={`relative rounded-xl overflow-hidden border-2 transition ${
                          activeImage === bImg ? "border-black shadow-xs" : "border-neutral-200 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <Image
                          src={bImg}
                          alt={`Variation ${idx + 1}`}
                          width={120}
                          height={120}
                          unoptimized
                          className="h-16 w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Generation Telemetry Details */}
              {currentMeta && activeImage && !isGenerating && (
                <div className="border-t border-neutral-100 p-5 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Generation Telemetry
                    </span>
                    <span className="font-mono text-xs font-semibold text-neutral-700">
                      {currentMeta.generationTime}s latency
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-2.5">
                      <span className="block text-[10px] text-neutral-400">Model</span>
                      <span className="font-semibold text-neutral-900 truncate block mt-0.5">
                        {currentMeta.model}
                      </span>
                    </div>
                    <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-2.5">
                      <span className="block text-[10px] text-neutral-400">Dimensions</span>
                      <span className="font-semibold text-neutral-900 block mt-0.5">
                        {currentMeta.dimensions?.width}×{currentMeta.dimensions?.height}
                      </span>
                    </div>
                    <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-2.5">
                      <span className="block text-[10px] text-neutral-400">Style</span>
                      <span className="font-semibold text-neutral-900 block mt-0.5 truncate">
                        {currentMeta.style}
                      </span>
                    </div>
                    <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-2.5">
                      <span className="block text-[10px] text-neutral-400">Seed</span>
                      <span className="font-semibold text-neutral-900 block mt-0.5 truncate">
                        {currentMeta.seed}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                    <span className="block text-[10px] font-semibold text-neutral-500 mb-1">
                      Full Diffusion Prompt:
                    </span>
                    <p className="text-xs text-neutral-800 leading-relaxed font-mono">
                      {currentMeta.enhancedPrompt || currentMeta.prompt}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* RECENT IMAGE HISTORY GALLERY */}
            {history.length > 0 && (
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-neutral-700" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                      Studio History ({history.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-neutral-400">Click to preview</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveImage(item.url);
                        setCurrentMeta(item);
                        setBreakdown(item.breakdown || null);
                      }}
                      className={`group relative rounded-xl overflow-hidden border transition ${
                        activeImage === item.url
                          ? "border-black ring-2 ring-black"
                          : "border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      <Image
                        src={item.url}
                        alt={item.prompt}
                        width={140}
                        height={140}
                        unoptimized
                        className="h-20 w-full object-cover transition-transform group-hover:scale-105"
                      />
                      {item.isEdit && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                          Edit
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full py-5 px-6 border-t border-neutral-100 bg-white text-xs text-neutral-500">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3">
          <span>TATTVA AI Studio • Crafted with minimalist precision by kotapati Gowtham Chowdary ✨</span>
          <div className="flex items-center gap-4 text-[11px]">
            <a href="/chat" className="hover:text-black transition">Chat</a>
            <span>•</span>
            <a href="/voice" className="hover:text-black transition">Voice Assistant</a>
            <span>•</span>
            <a href="/dashboard" className="hover:text-black transition">Dashboard</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
