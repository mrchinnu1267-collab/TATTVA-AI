"use client";

import React, { useState, useEffect } from "react";
import {
  Plug,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  ShieldAlert,
  ExternalLink,
  RefreshCw,
  Power,
  ChevronDown,
  ChevronUp,
  Settings2,
  Key,
  Globe,
  Info,
} from "lucide-react";
import type { PublicMcpConnector } from "../../lib/mcp/types";

interface ConnectorSettingsProps {
  isDark: boolean;
  showToast: (msg: string) => void;
}

export default function ConnectorSettings({ isDark, showToast }: ConnectorSettingsProps) {
  const [connectors, setConnectors] = useState<PublicMcpConnector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formAuthType, setFormAuthType] = useState<"none" | "token" | "oauth">("none");
  const [formToken, setFormToken] = useState("");
  const [formReadOnly, setFormReadOnly] = useState(false);
  const [formConsent, setFormConsent] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Tool permissions edit state
  const [toolAllowInput, setToolAllowInput] = useState("");
  const [toolDenyInput, setToolDenyInput] = useState("");

  useEffect(() => {
    fetchConnectors();
  }, []);

  async function fetchConnectors() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/connectors");
      if (res.ok) {
        const data = await res.json();
        setConnectors(data.connectors || []);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to load connectors");
      }
    } catch {
      showToast("Network error loading connectors");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleEnabled(connector: PublicMcpConnector) {
    const nextEnabled = !connector.enabled;
    try {
      const res = await fetch(`/api/connectors/${connector.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      if (res.ok) {
        setConnectors((prev) =>
          prev.map((c) => (c.id === connector.id ? { ...c, enabled: nextEnabled } : c))
        );
        showToast(nextEnabled ? `${connector.name} enabled` : `${connector.name} paused`);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to update connector");
      }
    } catch {
      showToast("Error updating connector status");
    }
  }

  async function handleToggleReadOnly(connector: PublicMcpConnector) {
    const nextReadOnly = !connector.readOnly;
    try {
      const res = await fetch(`/api/connectors/${connector.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readOnly: nextReadOnly }),
      });
      if (res.ok) {
        setConnectors((prev) =>
          prev.map((c) => (c.id === connector.id ? { ...c, readOnly: nextReadOnly } : c))
        );
        showToast(
          nextReadOnly
            ? `${connector.name} set to Read-Only mode (mutations blocked)`
            : `${connector.name} full access enabled`
        );
      }
    } catch {
      showToast("Error updating read-only mode");
    }
  }

  async function handleTestConnection(connector: PublicMcpConnector) {
    setTestingId(connector.id);
    try {
      const res = await fetch(`/api/connectors/${connector.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testConnection: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.connector?.status === "connected") {
        showToast(`Connected successfully to ${connector.name} ⚡`);
        setConnectors((prev) =>
          prev.map((c) => (c.id === connector.id ? { ...c, status: "connected", errorMessage: undefined } : c))
        );
      } else {
        showToast(`Connection failed: ${data.connector?.errorMessage || data.error || "Unreachable"}`);
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === connector.id
              ? { ...c, status: data.connector?.status || "error", errorMessage: data.connector?.errorMessage }
              : c
          )
        );
      }
    } catch {
      showToast("Timeout or error testing server connection");
    } finally {
      setTestingId(null);
    }
  }

  async function handleDeleteConnector(id: string) {
    try {
      const res = await fetch(`/api/connectors/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConnectors((prev) => prev.filter((c) => c.id !== id));
        setDeleteConfirmId(null);
        showToast("Connector removed successfully");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Failed to delete connector");
      }
    } catch {
      showToast("Error removing connector");
    }
  }

  async function handleSaveTools(id: string) {
    const allowed = toolAllowInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const denied = toolDenyInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/connectors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedTools: allowed, deniedTools: denied }),
      });
      if (res.ok) {
        setConnectors((prev) =>
          prev.map((c) => (c.id === id ? { ...c, allowedTools: allowed, deniedTools: denied } : c))
        );
        setEditingToolId(null);
        showToast("Tool permissions updated");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to update tool permissions");
      }
    } catch {
      showToast("Error saving tool permissions");
    }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formName.trim()) {
      setFormError("Connector name is required");
      return;
    }
    if (!formUrl.trim()) {
      setFormError("MCP Server URL is required");
      return;
    }
    if (!formConsent) {
      setFormError("You must acknowledge the security consent notice");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          url: formUrl.trim(),
          authToken: formAuthType === "token" ? formToken.trim() : undefined,
          readOnly: formReadOnly,
          consentAcknowledged: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.connector) {
        setConnectors((prev) => [data.connector, ...prev]);
        setIsAddOpen(false);
        setFormName("");
        setFormUrl("");
        setFormToken("");
        setFormConsent(false);
        setFormReadOnly(false);
        showToast(`Connected ${data.connector.name} successfully 🚀`);
      } else {
        setFormError(data.error || "Failed to add connector");
      }
    } catch {
      setFormError("Network error adding connector");
    } finally {
      setFormSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 text-xs">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between pb-1 border-b border-black/[0.06] dark:border-neutral-800">
        <div>
          <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
            <Plug className="w-4 h-4 text-purple-400" />
            <span>Claude Connectors (MCP)</span>
          </h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Connect Claude to external remote Model Context Protocol servers securely
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition cursor-pointer shadow-xs active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Connector</span>
        </button>
      </div>

      {/* Security Banner */}
      <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300 flex items-start gap-2.5">
        <Shield className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
        <div className="text-[11px] leading-relaxed">
          <span className="font-bold text-white">Enterprise Security &amp; SSRF Protected: </span>
          Connector tokens are encrypted with AES-256-GCM at rest and never exposed to the client. Private IP addresses and local loopbacks are automatically blocked.
        </div>
      </div>

      {/* Connectors List */}
      {isLoading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-2 text-neutral-400">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
          <span>Loading Claude connectors...</span>
        </div>
      ) : connectors.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-neutral-700/60 text-center space-y-2">
          <Plug className="w-8 h-8 text-neutral-500 mx-auto stroke-[1.5]" />
          <p className="font-semibold text-neutral-300">No Claude Connectors configured yet</p>
          <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
            Extend Claude&apos;s capabilities with tools, search indices, and APIs by connecting remote MCP servers.
          </p>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect First Server</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {connectors.map((c) => {
            const isEditing = editingToolId === c.id;
            const isDeleting = deleteConfirmId === c.id;
            const isTesting = testingId === c.id;

            const badgeBg =
              c.status === "connected"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : c.status === "needs_auth"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30";

            return (
              <div
                key={c.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  c.enabled
                    ? isDark
                      ? "border-neutral-800 bg-neutral-900/80 text-white"
                      : "border-black/10 bg-neutral-50 text-neutral-900"
                    : isDark
                    ? "border-neutral-800/40 bg-neutral-950/60 opacity-60 text-neutral-400"
                    : "border-black/5 bg-neutral-100/60 opacity-60 text-neutral-500"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm truncate">{c.name}</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${badgeBg}`}>
                        {c.status === "connected" ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Connected</span>
                          </>
                        ) : c.status === "needs_auth" ? (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>Needs Auth</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            <span>Error</span>
                          </>
                        )}
                      </span>

                      {c.readOnly && (
                        <span className="px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                          Read-Only
                        </span>
                      )}

                      {c.hasToken && (
                        <span className="px-1.5 py-0.5 rounded-md bg-neutral-800 text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                          <Key className="w-2.5 h-2.5" />
                          <span>Token Encrypted</span>
                        </span>
                      )}
                    </div>

                    <p className="font-mono text-[11px] text-neutral-400 truncate mt-1 flex items-center gap-1">
                      <Globe className="w-3 h-3 shrink-0" />
                      <span>{c.url}</span>
                    </p>

                    {c.errorMessage && (
                      <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{c.errorMessage}</span>
                      </p>
                    )}
                  </div>

                  {/* Right: Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(c)}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        c.enabled
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                          : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                      title={c.enabled ? "Disable connector" : "Enable connector"}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTestConnection(c)}
                      disabled={isTesting}
                      className="p-1.5 rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white transition cursor-pointer"
                      title="Test connection"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin text-purple-400" : ""}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          setEditingToolId(null);
                        } else {
                          setEditingToolId(c.id);
                          setToolAllowInput((c.allowedTools || []).join(", "));
                          setToolDenyInput((c.deniedTools || []).join(", "));
                        }
                      }}
                      className="p-1.5 rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white transition cursor-pointer"
                      title="Configure tool permissions"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(isDeleting ? null : c.id)}
                      className="p-1.5 rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-rose-400 transition cursor-pointer"
                      title="Remove connector"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation Banner */}
                {isDeleting && (
                  <div className="mt-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-rose-300">
                      Disconnect <b>{c.name}</b>? Its encrypted credentials will be purged permanently.
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteConnector(c.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Tool Permissions Drawer */}
                {isEditing && (
                  <div className="mt-3 pt-3 border-t border-neutral-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-300">Tool Permissions &amp; Guardrails</span>
                      <button
                        type="button"
                        onClick={() => handleToggleReadOnly(c)}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition ${
                          c.readOnly
                            ? "border-blue-500/50 bg-blue-500/20 text-blue-300"
                            : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {c.readOnly ? "🛡️ Read-Only Mode (Active)" : "Allow Write/Mutations"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <label className="text-neutral-400 block mb-1">
                          Allowed Tools (Comma-separated, blank allows all):
                        </label>
                        <input
                          type="text"
                          value={toolAllowInput}
                          onChange={(e) => setToolAllowInput(e.target.value)}
                          placeholder="get_file, list_issues, query_db"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-white font-mono text-[11px] focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">
                          Denied Tools (Always blocked, e.g. destructive):
                        </label>
                        <input
                          type="text"
                          value={toolDenyInput}
                          onChange={(e) => setToolDenyInput(e.target.value)}
                          placeholder="delete_item, drop_table, purge"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-white font-mono text-[11px] focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingToolId(null)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveTools(c.id)}
                        className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Save Guardrails
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Connector Modal Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-950 text-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Plug className="w-4 h-4 text-purple-400" />
                <span>Add Claude MCP Connector</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-neutral-400 hover:text-white text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-300 mb-1">Connector Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. GitHub Workspace, Internal Jira MCP"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-neutral-700 bg-neutral-900 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-300 mb-1">MCP Server URL (Public HTTPS)</label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://mcp.your-domain.com/sse"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-neutral-700 bg-neutral-900 text-white font-mono text-[11px] focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Must use public HTTPS. Private IPs and localhost loopbacks are blocked by SSRF protection.
                </span>
              </div>

              <div>
                <label className="block font-bold text-neutral-300 mb-1">Authentication Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormAuthType("none")}
                    className={`py-1.5 px-3 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                      formAuthType === "none"
                        ? "border-purple-500 bg-purple-500/20 text-purple-300 font-bold"
                        : "border-neutral-800 bg-neutral-900 text-neutral-400"
                    }`}
                  >
                    Public / None
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormAuthType("token")}
                    className={`py-1.5 px-3 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                      formAuthType === "token"
                        ? "border-purple-500 bg-purple-500/20 text-purple-300 font-bold"
                        : "border-neutral-800 bg-neutral-900 text-neutral-400"
                    }`}
                  >
                    Bearer Token / Key
                  </button>
                </div>
              </div>

              {formAuthType === "token" && (
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Authorization Token</label>
                  <input
                    type="password"
                    value={formToken}
                    onChange={(e) => setFormToken(e.target.value)}
                    placeholder="Enter MCP API Key or Token"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-700 bg-neutral-900 text-white font-mono text-[11px] focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    Encrypted with AES-256-GCM. Never logged or sent to the browser.
                  </span>
                </div>
              )}

              {/* Read-only toggle */}
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formReadOnly}
                  onChange={(e) => setFormReadOnly(e.target.checked)}
                  className="rounded border-neutral-700 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <p className="font-bold text-neutral-200">Read-Only Mode</p>
                  <p className="text-[10px] text-neutral-400">
                    Blocks mutative and destructive tool actions (delete, drop, write, create)
                  </p>
                </div>
              </label>

              {/* Mandatory Consent Notice */}
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <b>Mandatory Consent:</b> Claude can access and modify data in this service based on your permissions.
                  </p>
                </div>
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formConsent}
                    onChange={(e) => setFormConsent(e.target.checked)}
                    required
                    className="rounded border-amber-500/50 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-[11px] font-semibold text-white">
                    I understand and authorize Claude to interact with this connector
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || !formConsent}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{formSubmitting ? "Connecting..." : "Add Connector"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
