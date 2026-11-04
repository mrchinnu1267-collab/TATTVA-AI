"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  Check,
  Plus,
  Lock,
  ExternalLink,
  Shield,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
  Trash2,
  Settings2,
  Plug,
} from "lucide-react";
import type { PublicMcpConnector } from "../../lib/mcp/types";

interface BrowseConnectorsProps {
  isDark: boolean;
  onBack: () => void;
  showToast: (msg: string) => void;
}

interface CatalogConnector {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  category: "all" | "commerce" | "communication" | "productivity" | "developer";
  defaultUrl: string;
  authType: "oauth" | "bearer" | "none";
  icon: React.ReactNode;
}

// Pre-configured rich catalog matching Image 5
const PRESET_CATALOG: CatalogConnector[] = [
  {
    id: "google-drive",
    name: "Google Drive",
    subtitle: "Most popular",
    description: "Search, read, and upload files instantly",
    category: "productivity",
    defaultUrl: "https://mcp.google.com/drive/v1",
    authType: "oauth",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
      </svg>
    ),
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    subtitle: "#10 most popular",
    description: "Read, analyze, and update your spreadsheets",
    category: "productivity",
    defaultUrl: "https://mcp.google.com/sheets/v4",
    authType: "oauth",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
        <path fill="#0F9D58" d="M128 0H32C23.2 0 16 7.2 16 16v160c0 8.8 7.2 16 16 16h128c8.8 0 16-7.2 16-16V48l-48-48z"/>
        <path fill="#E8F5E9" d="M128 48V0l48 48h-48z"/>
        <path fill="#0B8043" d="M128 48V0H32C23.2 0 16 7.2 16 16v32h112z" opacity=".2"/>
        <path fill="#FFF" d="M52 84h88v12H52zm0 24h88v12H52zm0 24h88v12H52z"/>
      </svg>
    ),
  },
  {
    id: "gmail",
    name: "Gmail",
    subtitle: "#2 most popular",
    description: "Draft replies, summarize threads, & search your inbox",
    category: "communication",
    defaultUrl: "https://mcp.google.com/gmail/v1",
    authType: "oauth",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M54 52H10a4 4 0 0 1-4-4V16l26 18 26-18v32a4 4 0 0 1-4 4z"/>
        <path fill="#EA4335" d="M58 16a4 4 0 0 0-4-4H10a4 4 0 0 0-4 4l26 18 26-18z"/>
        <path fill="#34A853" d="M6 16l26 18V52H10a4 4 0 0 1-4-4V16z" opacity=".1"/>
        <path fill="#FBBC05" d="M58 16L32 34V52h22a4 4 0 0 0 4-4V16z" opacity=".1"/>
      </svg>
    ),
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    subtitle: "#3 most popular",
    description: "Manage your schedule and coordinate meetings effortlessly",
    category: "productivity",
    defaultUrl: "https://mcp.google.com/calendar/v3",
    authType: "oauth",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" x="4" y="4" fill="#FFFFFF" rx="4"/>
        <path fill="#1976D2" d="M40 4H8C5.8 4 4 5.8 4 8v6h40V8c0-2.2-1.8-4-4-4z"/>
        <text x="24" y="34" fill="#1976D2" fontSize="18" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">31</text>
      </svg>
    ),
  },
  {
    id: "google-docs",
    name: "Google Docs",
    subtitle: "#11 most popular",
    description: "Edit, comment on, and summarize your documents",
    category: "productivity",
    defaultUrl: "https://mcp.google.com/docs/v1",
    authType: "oauth",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M128 0H32C23.2 0 16 7.2 16 16v160c0 8.8 7.2 16 16 16h128c8.8 0 16-7.2 16-16V48l-48-48z"/>
        <path fill="#E8F0FE" d="M128 48V0l48 48h-48z"/>
        <path fill="#FFF" d="M52 84h88v12H52zm0 24h88v12H52zm0 24h60v12H52z"/>
      </svg>
    ),
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    subtitle: "#5 most popular",
    description: "Access SharePoint, OneDrive, Outlook, and Teams directly in Claude",
    category: "productivity",
    defaultUrl: "https://mcp.microsoft.com/graph/v1.0",
    authType: "oauth",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
        <path fill="#f35325" d="M1 1h10v10H1z"/>
        <path fill="#81bc06" d="M12 1h10v10H12z"/>
        <path fill="#05a6f0" d="M1 12h10v10H1z"/>
        <path fill="#ffba08" d="M12 12h10v10H12z"/>
      </svg>
    ),
  },
  {
    id: "canva",
    name: "Canva",
    subtitle: "Interactive • #4 most popular",
    description: "Search, create, autofill, and export Canva designs",
    category: "commerce",
    defaultUrl: "https://mcp.canva.com/v1",
    authType: "bearer",
    icon: (
      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#00C4CC] to-[#7D2AE8] flex items-center justify-center font-bold text-white text-xs">
        C
      </div>
    ),
  },
  {
    id: "github",
    name: "GitHub",
    subtitle: "#6 most popular • Developer",
    description: "Search repositories, read code, issues, PRs, and commit history",
    category: "developer",
    defaultUrl: "https://mcp.github.com/v1/sse",
    authType: "bearer",
    icon: (
      <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
  },
  {
    id: "slack",
    name: "Slack",
    subtitle: "#7 most popular • Team Chat",
    description: "Search messages, channels, summaries, and post updates",
    category: "communication",
    defaultUrl: "https://mcp.slack.com/v1",
    authType: "oauth",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#E01E5A" d="M5.04 15.26a2.52 2.52 0 0 1-2.52-2.52c0-1.39 1.13-2.52 2.52-2.52h2.52v2.52c0 1.39-1.13 2.52-2.52 2.52zm3.78 0a2.52 2.52 0 0 1 2.52-2.52c1.39 0 2.52 1.13 2.52 2.52v6.3a2.52 2.52 0 0 1-2.52 2.52 2.52 2.52 0 0 1-2.52-2.52v-6.3z"/>
        <path fill="#36C5F0" d="M8.82 5.04a2.52 2.52 0 0 1-2.52-2.52C6.3 1.13 7.43 0 8.82 0s2.52 1.13 2.52 2.52v2.52H8.82zm0 3.78a2.52 2.52 0 0 1 2.52 2.52v2.52H5.04A2.52 2.52 0 0 1 2.52 11.34c0-1.39 1.13-2.52 2.52-2.52h3.78z"/>
        <path fill="#2EB67D" d="M18.96 8.82a2.52 2.52 0 0 1 2.52 2.52c0 1.39-1.13 2.52-2.52 2.52h-2.52V11.34c0-1.39 1.13-2.52 2.52-2.52zm-3.78 0a2.52 2.52 0 0 1-2.52 2.52c-1.39 0-2.52-1.13-2.52-2.52V2.52A2.52 2.52 0 0 1 12.66 0a2.52 2.52 0 0 1 2.52 2.52v6.3z"/>
        <path fill="#ECB22E" d="M15.18 18.96a2.52 2.52 0 0 1 2.52 2.52c0 1.39-1.13 2.52-2.52 2.52s-2.52-1.13-2.52-2.52v-2.52h2.52zm0-3.78a2.52 2.52 0 0 1-2.52-2.52v-2.52h6.3a2.52 2.52 0 0 1 2.52 2.52c0 1.39-1.13 2.52-2.52 2.52h-3.78z"/>
      </svg>
    ),
  },
];

export default function BrowseConnectors({
  isDark,
  onBack,
  showToast,
}: BrowseConnectorsProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userConnectors, setUserConnectors] = useState<PublicMcpConnector[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Connection flow modal
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogConnector | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [modalName, setModalName] = useState("");
  const [modalUrl, setModalUrl] = useState("");
  const [modalToken, setModalToken] = useState("");
  const [modalReadOnly, setModalReadOnly] = useState(false);
  const [modalConsent, setModalConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    fetchUserConnectors();
  }, []);

  async function fetchUserConnectors() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/connectors");
      if (res.ok) {
        const data = await res.json();
        setUserConnectors(data.connectors || []);
      }
    } catch {
      showToast("Could not load connected services");
    } finally {
      setIsLoading(false);
    }
  }

  // Find if user already connected an item
  function findConnected(nameOrUrl: string) {
    return userConnectors.find(
      (c) =>
        c.name.toLowerCase().includes(nameOrUrl.toLowerCase()) ||
        c.url.toLowerCase().includes(nameOrUrl.toLowerCase())
    );
  }

  const filteredCatalog = useMemo(() => {
    return PRESET_CATALOG.filter((item) => {
      // Category filter
      if (activeCategory === "connected") {
        return Boolean(findConnected(item.name));
      }
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeCategory, searchQuery, userConnectors]);

  function handleOpenConnect(item: CatalogConnector) {
    setSelectedCatalogItem(item);
    setModalName(item.name);
    setModalUrl(item.defaultUrl);
    setModalToken("");
    setModalReadOnly(false);
    setModalConsent(false);
    setModalError("");
  }

  function handleOpenCustom() {
    setSelectedCatalogItem(null);
    setModalName("");
    setModalUrl("");
    setModalToken("");
    setModalReadOnly(false);
    setModalConsent(false);
    setModalError("");
    setIsCustomModalOpen(true);
  }

  async function handleConnectSubmit(e: React.FormEvent) {
    e.preventDefault();
    setModalError("");

    if (!modalName.trim() || !modalUrl.trim()) {
      setModalError("Please provide name and public HTTPS server URL");
      return;
    }
    if (!modalConsent) {
      setModalError("You must acknowledge the security consent notice");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: modalName.trim(),
          url: modalUrl.trim(),
          authToken: modalToken.trim() || undefined,
          readOnly: modalReadOnly,
          consentAcknowledged: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.connector) {
        setUserConnectors((prev) => [data.connector, ...prev]);
        setSelectedCatalogItem(null);
        setIsCustomModalOpen(false);
        showToast(`${data.connector.name} connected successfully 🚀`);
      } else {
        setModalError(data.error || "Failed to establish connector link");
      }
    } catch {
      setModalError("Connection failed or host unreachable");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisconnect(id: string) {
    try {
      const res = await fetch(`/api/connectors/${id}`, { method: "DELETE" });
      if (res.ok) {
        setUserConnectors((prev) => prev.filter((c) => c.id !== id));
        showToast("Connector disconnected");
      }
    } catch {
      showToast("Error disconnecting");
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#141414] text-white">
      {/* 1. Header matching Image 5 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 text-neutral-300 hover:text-white transition cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>

        <h1 className="text-lg font-serif font-bold tracking-tight text-white select-none">
          Browse connectors
        </h1>

        <button
          type="button"
          onClick={handleOpenCustom}
          className="p-1.5 -mr-1.5 rounded-full hover:bg-white/10 text-neutral-300 hover:text-white transition cursor-pointer"
          title="Add Custom Connector"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Search bar matching Image 5 */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connectors"
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#202020] border border-white/10 text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:border-white/30 transition-all"
          />
        </div>
      </div>

      {/* 3. Horizontal Category Pills matching Image 5 */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar select-none text-xs">
        {[
          { id: "all", label: "All" },
          { id: "commerce", label: "Commerce & shopping" },
          { id: "communication", label: "Communication" },
          { id: "productivity", label: "Productivity" },
          { id: "developer", label: "Developer tools" },
          { id: "connected", label: `Connected (${userConnectors.length})` },
        ].map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition cursor-pointer ${
                isActive
                  ? "bg-white text-black font-semibold shadow-xs"
                  : "bg-[#202020] text-neutral-300 hover:bg-[#282828] border border-white/5"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 4. Connectors List matching Image 5 */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5">
        {filteredCatalog.map((item) => {
          const connected = findConnected(item.name);
          const isConn = Boolean(connected && connected.status === "connected");

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#1b1b1b] border border-white/5 hover:border-white/15 transition-all"
            >
              {/* Left: Icon & Description */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 p-1">
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white truncate">{item.name}</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-medium">
                    {item.subtitle}
                  </p>
                  <p className="text-xs text-neutral-300 mt-1 line-clamp-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Right: Connect / Connected Button */}
              <div className="shrink-0">
                {isConn ? (
                  <button
                    type="button"
                    onClick={() => handleDisconnect(connected!.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold transition hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/50 cursor-pointer group"
                    title="Click to disconnect"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3] group-hover:hidden" />
                    <Trash2 className="w-3.5 h-3.5 hidden group-hover:block" />
                    <span className="group-hover:hidden">Connected</span>
                    <span className="hidden group-hover:inline">Disconnect</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenConnect(item)}
                    className="px-4 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Custom Connector Entry */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleOpenCustom}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-purple-300 font-semibold text-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Custom Remote MCP Server (SSE/HTTP)</span>
          </button>
        </div>
      </div>

      {/* 5. Connection Setup Modal Dialog */}
      {(selectedCatalogItem || isCustomModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#1b1b1b] text-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  {selectedCatalogItem ? selectedCatalogItem.icon : <Plug className="w-4 h-4 text-purple-400" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {selectedCatalogItem ? `Connect ${selectedCatalogItem.name}` : "Connect Custom MCP Server"}
                  </h3>
                  <p className="text-[10px] text-neutral-400">Claude Model Context Protocol</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCatalogItem(null);
                  setIsCustomModalOpen(false);
                }}
                className="text-neutral-400 hover:text-white text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleConnectSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Connector Name</label>
                <input
                  type="text"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="e.g. Google Drive, GitHub Workspace"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#252525] text-white focus:outline-none focus:border-white/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">MCP Server URL (Public HTTPS)</label>
                <input
                  type="url"
                  value={modalUrl}
                  onChange={(e) => setModalUrl(e.target.value)}
                  placeholder="https://mcp.domain.com/sse"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#252525] text-white font-mono text-[11px] focus:outline-none focus:border-white/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Authorization Token / API Key</label>
                <input
                  type="password"
                  value={modalToken}
                  onChange={(e) => setModalToken(e.target.value)}
                  placeholder="Optional token (AES-256 encrypted at rest)"
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#252525] text-white font-mono text-[11px] focus:outline-none focus:border-white/40"
                />
              </div>

              {/* Read-Only Mode Toggle */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/10 bg-white/[0.03] cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalReadOnly}
                  onChange={(e) => setModalReadOnly(e.target.checked)}
                  className="rounded border-white/20 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <p className="font-semibold text-neutral-200">Read-Only Mode</p>
                  <p className="text-[10px] text-neutral-400">
                    Blocks destructive tool actions (delete, drop, write, create)
                  </p>
                </div>
              </label>

              {/* Mandatory Consent Notice matching Claude Support requirements */}
              <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200 space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <b>Mandatory Consent:</b> Claude can access and modify data in this service based on your permissions.
                  </p>
                </div>
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalConsent}
                    onChange={(e) => setModalConsent(e.target.checked)}
                    required
                    className="rounded border-amber-500/50 text-white focus:ring-white"
                  />
                  <span className="text-[11px] font-semibold text-white">
                    I understand and authorize Claude to interact with this connector
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCatalogItem(null);
                    setIsCustomModalOpen(false);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-neutral-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !modalConsent}
                  className="px-5 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 disabled:opacity-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? "Connecting..." : "Connect"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

