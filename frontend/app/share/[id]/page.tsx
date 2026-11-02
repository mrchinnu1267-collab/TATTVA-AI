"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Download, Moon, Sun, Sparkles } from "lucide-react";

type ChatAttachment = {
  name: string;
  type: string;
  preview?: string;
  size?: number;
};

type ImageMetadata = {
  model?: string;
  generation_time_seconds?: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  kind?: "text" | "image";
  imageMetadata?: ImageMetadata;
  attachments?: ChatAttachment[];
  timestamp?: number;
};

type SharedSession = {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
};

function formatChatDate(timestamp?: number) {
  if (!timestamp) return "Shared Chat";
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function FormattedText({ text, isDark }: { text: string; isDark: boolean }) {
  // Parses basic inline bold, italics, code, bullet points, blockquotes
  const lines = text.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={lIdx} className="text-base font-bold mt-3 mb-1">
              {trimmed.replace(/^### /, "")}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={lIdx} className="text-lg font-bold mt-4 mb-2">
              {trimmed.replace(/^## /, "")}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={lIdx} className="text-xl font-extrabold mt-4 mb-2">
              {trimmed.replace(/^# /, "")}
            </h1>
          );
        }
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={lIdx}
              className={`border-l-4 pl-3 py-1 my-1 italic ${
                isDark ? "border-neutral-700 text-neutral-400" : "border-neutral-300 text-neutral-600"
              }`}
            >
              {trimmed.replace(/^>\s*/, "")}
            </blockquote>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2">
              <span className="opacity-60">•</span>
              <span>{trimmed.replace(/^[-*]\s+/, "")}</span>
            </div>
          );
        }
        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2">
              <span className="font-semibold opacity-75">{trimmed.match(/^\d+\./)?.[0]}</span>
              <span>{trimmed.replace(/^\d+\.\s+/, "")}</span>
            </div>
          );
        }
        if (!trimmed) {
          return <div key={lIdx} className="h-1.5" />;
        }
        return (
          <p key={lIdx} className="leading-relaxed">
            {line}
          </p>
        );
      })}
    </div>
  );
}

function ReadonlyMarkdownView({ content, isDark }: { content: string; isDark: boolean }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function copyCode(code: string, index: number) {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  const codeBlockRegex = /```([a-zA-Z0-9_.:-]*)\n([\s\S]*?)```/g;
  const parts: Array<{ type: "code" | "text"; lang?: string; filename?: string; code?: string; text?: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }
    const rawTag = (match[1] || "").trim();
    let lang = rawTag;
    let filename = "";
    if (rawTag.includes(":")) {
      const [l, f] = rawTag.split(":");
      lang = l.trim();
      filename = f.trim();
    } else if (rawTag.includes(".")) {
      filename = rawTag;
      lang = rawTag.split(".").pop() || "txt";
    }

    const cleanCode = (match[2] || "").trimEnd();
    parts.push({ type: "code", lang: lang || "file", filename, code: cleanCode });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }

  return (
    <div className="space-y-3 leading-relaxed text-[15px]">
      {parts.map((part, idx) => {
        if (part.type === "code" && part.code) {
          const isCopied = copiedIndex === idx;
          const displayLang = part.filename || part.lang || "file";
          return (
            <div
              key={idx}
              className={`my-3 overflow-hidden rounded-xl border shadow-sm ${
                isDark ? "border-neutral-800 bg-neutral-950 text-neutral-100" : "border-neutral-300 bg-neutral-950 text-neutral-100"
              }`}
            >
              <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-4 py-2 text-xs text-neutral-400">
                <span className="font-mono uppercase tracking-wider text-[11px] font-semibold">{displayLang}</span>
                <button
                  type="button"
                  onClick={() => copyCode(part.code!, idx)}
                  className="flex items-center gap-1.5 rounded border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[11px] font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? "Copied" : "Copy code"}</span>
                </button>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-neutral-200">
                <code>{part.code}</code>
              </pre>
            </div>
          );
        }

        return <FormattedText key={idx} text={part.text || ""} isDark={isDark} />;
      })}
    </div>
  );
}

export default function SharedChatPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [session, setSession] = useState<SharedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const isDark = theme === "dark";

  useEffect(() => {
    if (!id) return;
    async function loadShared() {
      try {
        const res = await fetch(`/api/share?id=${id}`);
        if (!res.ok) {
          throw new Error("Shared conversation not found or expired.");
        }
        const data = await res.json();
        setSession(data.session);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load conversation");
      } finally {
        setLoading(false);
      }
    }
    loadShared();
  }, [id]);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDark ? "bg-[#0d0e11] text-neutral-100" : "bg-neutral-50 text-neutral-900"}`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md ${isDark ? "border-neutral-800 bg-[#0d0e11]/80" : "border-neutral-200 bg-white/80"}`}>
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className={`p-2 rounded-xl border transition ${isDark ? "border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white" : "border-neutral-200 bg-neutral-100 text-neutral-700 hover:text-black"}`}
            title="Go to TATTVA Chat"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-white p-0.5 shadow-sm">
              <img src="/logo.png" alt="TATTVA AI" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">
                {session ? session.title : "Shared Conversation"}
              </h1>
              <p className="text-[11px] text-neutral-400">
                {session ? formatChatDate(session.createdAt) : "TATTVA AI Public Share"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`p-2 rounded-xl border transition ${isDark ? "border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white" : "border-neutral-200 bg-white text-neutral-700 hover:text-black"}`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link
            href="/chat"
            className="flex items-center gap-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black px-3.5 py-2 text-xs font-semibold shadow-sm hover:opacity-90 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chat with TATTVA</span>
          </Link>
        </div>
      </header>

      {/* Main Conversation Viewer */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-8 w-8 rounded-full border-2 border-neutral-500 border-t-transparent animate-spin mb-4" />
            <p className="text-sm text-neutral-400">Loading conversation...</p>
          </div>
        )}

        {error && (
          <div className="my-10 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-sm font-semibold text-red-500 mb-2">⚠️ {error}</p>
            <Link
              href="/chat"
              className="inline-block mt-3 text-xs font-bold text-neutral-900 dark:text-white underline"
            >
              Start a new conversation
            </Link>
          </div>
        )}

        {session && session.messages && (
          <div className="space-y-6">
            {session.messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className="w-full">
                  {isUser ? (
                    /* User Message: Clean Compact Bubble aligned right */
                    <div className="flex justify-end">
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-3xl px-4 py-3 text-sm shadow-2xs ${
                          isDark
                            ? "bg-neutral-800 text-neutral-100"
                            : "bg-neutral-100 text-neutral-900"
                        }`}
                      >
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {msg.attachments.map((att, aIdx) => (
                              <div
                                key={aIdx}
                                className="overflow-hidden rounded-xl border border-neutral-300 bg-neutral-200"
                              >
                                {att.preview ? (
                                  <Image
                                    src={att.preview}
                                    alt={att.name}
                                    width={80}
                                    height={80}
                                    className="h-16 w-16 object-cover"
                                  />
                                ) : (
                                  <div className="p-2 text-xs">📄 {att.name}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    /* Assistant Message: Clean transparent ChatGPT style */
                    <div className="flex gap-3 sm:gap-4 items-start w-full">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-white shadow-sm mt-0.5 p-0.5">
                        <img src="/logo.png" alt="TATTVA AI" className="h-full w-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <ReadonlyMarkdownView content={msg.content} isDark={isDark} />
                        {msg.image && (
                          <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 dark:border-neutral-800 bg-neutral-900">
                            <Image
                              src={msg.image}
                              alt={msg.content}
                              width={600}
                              height={600}
                              unoptimized
                              className="w-full h-auto max-h-[500px] object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Banner */}
      <footer className={`border-t py-4 text-center text-xs text-neutral-500 ${isDark ? "border-neutral-800 bg-[#0d0e11]" : "border-neutral-200 bg-white"}`}>
        <span>Powered by </span>
        <span className="font-semibold text-neutral-900 dark:text-neutral-200">TATTVA AI</span>
        <span> • kotapati Gowtham Chowdary</span>
      </footer>
    </div>
  );
}

