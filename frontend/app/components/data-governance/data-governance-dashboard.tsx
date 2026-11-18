"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Database,
  Download,
  Trash2,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Activity,
  Calendar,
  Save,
  Check,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export function DataGovernanceDashboard() {
  const [activeTab, setActiveTab] = useState<"retention" | "export" | "purge" | "audit">("retention");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Retention policy state
  const [chatDays, setChatDays] = useState(90);
  const [researchDays, setResearchDays] = useState(180);
  const [docDays, setDocDays] = useState(365);
  const [auditDays, setAuditDays] = useState(730);
  const [codeDays, setCodeDays] = useState(180);
  const [autoPurge, setAutoPurge] = useState(true);

  // Export state
  const [exportFormat, setExportFormat] = useState<"json" | "zip">("json");
  const [exportsList, setExportsList] = useState<any[]>([]);
  const [activeExport, setActiveExport] = useState<any | null>(null);

  // Purge state
  const [purgeStep, setPurgeStep] = useState<"idle" | "code_sent" | "purged">("idle");
  const [pendingPurge, setPendingPurge] = useState<any | null>(null);
  const [confirmationCodeInput, setConfirmationCodeInput] = useState("");

  // Audit state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any | null>(null);

  useEffect(() => {
    loadGovernanceData();
  }, []);

  async function loadGovernanceData() {
    setLoading(true);
    try {
      const [retRes, expRes, audRes] = await Promise.all([
        fetch("/api/data-governance/retention").then((r) => r.json()).catch(() => ({})),
        fetch("/api/data-governance/export").then((r) => r.json()).catch(() => ({})),
        fetch("/api/data-governance/audit").then((r) => r.json()).catch(() => ({})),
      ]);

      if (retRes?.policy) {
        setChatDays(retRes.policy.chatRetentionDays || 90);
        setResearchDays(retRes.policy.researchRetentionDays || 180);
        setDocDays(retRes.policy.documentRetentionDays || 365);
        setAuditDays(retRes.policy.auditLogRetentionDays || 730);
        setCodeDays(retRes.policy.codeArtifactRetentionDays || 180);
        setAutoPurge(retRes.policy.autoPurgeEnabled ?? true);
      }
      if (expRes?.exports) setExportsList(expRes.exports);
      if (audRes?.logs) setAuditLogs(audRes.logs);
      if (audRes?.metrics) setMetrics(audRes.metrics);
    } catch (err) {
      console.error("Failed to load data governance state:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/data-governance/retention", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatRetentionDays: chatDays,
          researchRetentionDays: researchDays,
          documentRetentionDays: docDays,
          auditLogRetentionDays: auditDays,
          codeArtifactRetentionDays: codeDays,
          autoPurgeEnabled: autoPurge,
        }),
      });
      const data = await res.json();
      if (res.ok && data.policy) {
        setNotice({ type: "success", text: "Data retention policies updated successfully." });
      } else {
        setNotice({ type: "error", text: data.error || "Failed to save retention policy." });
      }
    } catch {
      setNotice({ type: "error", text: "Network error updating retention policy." });
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestExport() {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/data-governance/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: exportFormat }),
      });
      const data = await res.json();
      if (res.ok && data.archive) {
        setActiveExport(data.archive);
        setExportsList([data.archive, ...exportsList]);
        setNotice({ type: "success", text: `GDPR export bundle ${data.archive.exportId} generated!` });
      } else {
        setNotice({ type: "error", text: data.error || "Failed to generate export." });
      }
    } catch {
      setNotice({ type: "error", text: "Network error requesting data export." });
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestPurge() {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/data-governance/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" }),
      });
      const data = await res.json();
      if (res.ok && data.request) {
        setPendingPurge(data.request);
        setPurgeStep("code_sent");
        setNotice({
          type: "success",
          text: `Confirmation code sent. Use test code: ${data.request.confirmationCode}`,
        });
      } else {
        setNotice({ type: "error", text: data.error || "Failed to initiate purge request." });
      }
    } catch {
      setNotice({ type: "error", text: "Network error requesting purge." });
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPurge(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingPurge || !confirmationCodeInput.trim()) return;

    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/data-governance/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          requestId: pendingPurge.requestId,
          confirmationCode: confirmationCodeInput,
        }),
      });
      const data = await res.json();
      if (res.ok && data.purged) {
        setPurgeStep("purged");
        setNotice({ type: "success", text: "Account and records cryptographically purged." });
      } else {
        setNotice({ type: "error", text: data.error || "Invalid confirmation code." });
      }
    } catch {
      setNotice({ type: "error", text: "Network error confirming purge." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8 text-neutral-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Data Governance & Lifecycle
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-medium border border-indigo-500/30">
                  Phase 47
                </span>
              </h1>
              <p className="text-sm text-neutral-400 mt-0.5">
                GDPR & CCPA self-service data export, configurable retention windows, and cryptographic account purge.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadGovernanceData()}
            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("retention")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "retention"
            ? "border-indigo-500 text-indigo-400"
            : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
        >
          <Calendar className="w-4 h-4" />
          Data Retention Policies
        </button>
        <button
          onClick={() => setActiveTab("export")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "export"
            ? "border-indigo-500 text-indigo-400"
            : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
        >
          <Download className="w-4 h-4" />
          GDPR / CCPA Self-Service Export
        </button>
        <button
          onClick={() => setActiveTab("purge")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "purge"
            ? "border-red-500 text-red-400"
            : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
        >
          <Trash2 className="w-4 h-4" />
          Right to be Forgotten (Purge)
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "audit"
            ? "border-indigo-500 text-indigo-400"
            : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
        >
          <Activity className="w-4 h-4" />
          Governance Audit Trail
        </button>
      </div>

      {notice && (
        <div
          className={`text-xs p-3 rounded-xl border flex items-center justify-between ${notice.type === "success"
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
            : "bg-red-500/15 border-red-500/30 text-red-300"
            }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">
            ×
          </button>
        </div>
      )}

      {/* Tab 1: Retention Policies */}
      {activeTab === "retention" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={handleSavePolicy} className="md:col-span-2 space-y-6">
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Configurable Retention Schedules</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Define automated data expiration thresholds. Records older than these limits will be queued for cryptographic purging.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Chat Conversations</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={7}
                      max={730}
                      value={chatDays}
                      onChange={(e) => setChatDays(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-neutral-500 font-mono">days</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Deep Research Artifacts</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={30}
                      max={730}
                      value={researchDays}
                      onChange={(e) => setResearchDays(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-neutral-500 font-mono">days</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Document Uploads & RAG</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={30}
                      max={1095}
                      value={docDays}
                      onChange={(e) => setDocDays(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-neutral-500 font-mono">days</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Code Studio Projects</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={30}
                      max={730}
                      value={codeDays}
                      onChange={(e) => setCodeDays(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-neutral-500 font-mono">days</span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-neutral-300">Compliance & Audit Logs</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={180}
                      max={2555}
                      value={auditDays}
                      onChange={(e) => setAuditDays(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-neutral-500 font-mono">days</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autoPurgeCheckbox"
                    checked={autoPurge}
                    onChange={(e) => setAutoPurge(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="autoPurgeCheckbox" className="text-xs font-medium text-neutral-300 cursor-pointer">
                    Enable automated background daemon purging of expired records
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save Retention Policy
                </button>
              </div>
            </div>
          </form>

          {/* Retention Guarantees Sidebar */}
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
                <h4 className="font-bold text-white text-sm">Data Minimization</h4>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                In strict adherence to GDPR Article 5(1)(e), personal records and prompt interactions are held no longer than necessary for active services.
              </p>
              <div className="pt-3 border-t border-neutral-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Default Chat Window:</span>
                  <span className="text-neutral-200 font-mono font-medium">90 Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Audit Trail Retention:</span>
                  <span className="text-neutral-200 font-mono font-medium">730 Days (2 Yrs)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Status:</span>
                  <span className="text-emerald-400 font-medium">Active Policy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: GDPR / CCPA Self-Service Export */}
      {activeTab === "export" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Generate Machine-Readable Data Archive</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Download a complete portable archive containing your profile, chat transcripts, documents, feedback, invoices, and audit logs.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="json">Format: JSON (.json)</option>
                  <option value="zip">Format: ZIP (.zip archive)</option>
                </select>
                <button
                  onClick={handleRequestExport}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Generate Archive
                </button>
              </div>
            </div>

            {activeExport && (
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300">Archive Ready for Download</span>
                  <span className="text-xs text-neutral-400 font-mono">{activeExport.exportId}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-neutral-500 block">Total Records:</span>
                    <span className="text-neutral-200 font-semibold">{activeExport.totalRecordsCount} items</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Format:</span>
                    <span className="text-neutral-200 font-semibold uppercase">{activeExport.format}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Expires:</span>
                    <span className="text-neutral-200 font-semibold">48 Hours</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">SHA-256 Checksum:</span>
                    <span className="text-indigo-400 font-mono text-[10px] truncate block">
                      {activeExport.dataPayload?.exportMetadata?.sha256Checksum?.slice(0, 16)}...
                    </span>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <a
                    href={activeExport.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Export Archive
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Past Exports Table */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-300">Previous Export Bundles</span>
              <span className="text-xs text-neutral-500">{exportsList.length} total</span>
            </div>
            {exportsList.length === 0 ? (
              <div className="text-center py-10 text-neutral-500 text-sm">
                No past export requests found. Request an archive above.
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {exportsList.map((exp) => (
                  <div key={exp.exportId} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-indigo-400 font-semibold">{exp.exportId}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 uppercase">
                          {exp.format}
                        </span>
                        <span className="text-xs text-neutral-400">{exp.totalRecordsCount} records</span>
                      </div>
                      <span className="text-[11px] text-neutral-500">
                        Generated on {new Date(exp.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <a
                      href={exp.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Right to be Forgotten (Account Purge) */}
      {activeTab === "purge" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-red-900/40 space-y-5">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">GDPR Article 17 — Right to Erasure</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Purging your account permanently anonymizes and deletes all stored chat history, documents, support tickets, and API telemetry. This operation is **irreversible**.
            </p>

            {purgeStep === "idle" && (
              <div className="pt-2">
                <button
                  onClick={handleRequestPurge}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm flex items-center gap-2 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Initiate Account Purge Request
                </button>
              </div>
            )}

            {purgeStep === "code_sent" && (
              <form onSubmit={handleConfirmPurge} className="space-y-4 pt-2">
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <label className="text-xs font-semibold text-neutral-300 block">
                    Enter 6-Digit Confirmation Code
                  </label>
                  <p className="text-[11px] text-neutral-500">
                    A confirmation code was issued. Enter it below to finalize irreversible purging.
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 849201"
                    value={confirmationCodeInput}
                    onChange={(e) => setConfirmationCodeInput(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-base font-mono tracking-widest text-white text-center focus:outline-none focus:border-red-500 mt-2"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPurgeStep("idle");
                      setConfirmationCodeInput("");
                    }}
                    className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || confirmationCodeInput.length < 6}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Confirm Permanent Purge
                  </button>
                </div>
              </form>
            )}

            {purgeStep === "purged" && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Account Data Successfully Purged
                </div>
                <p className="text-neutral-400">
                  Audit hash: <span className="font-mono text-emerald-400">{pendingPurge?.auditHash}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Governance Audit Trail */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-medium">Audited Events</span>
                <div className="text-xl font-bold text-white mt-1">{metrics.totalAuditedEvents}</div>
              </div>
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-medium">Exports Generated</span>
                <div className="text-xl font-bold text-indigo-400 mt-1">{metrics.totalExportsGenerated}</div>
              </div>
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-medium">Purge Requests</span>
                <div className="text-xl font-bold text-red-400 mt-1">{metrics.totalPurgeRequests}</div>
              </div>
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-medium">Active Policy</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">GDPR / CCPA Active</div>
              </div>
            </div>
          )}

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-300">Access & Lifecycle Audit Events</span>
              <span className="text-xs text-neutral-500">{auditLogs.length} events logged</span>
            </div>
            <div className="divide-y divide-neutral-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="px-6 py-4 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-neutral-400 font-semibold">{log.id}</span>
                      <span className="uppercase text-[10px] px-2 py-0.5 rounded font-bold bg-neutral-800 text-indigo-300">
                        {log.action}
                      </span>
                      <span className="text-neutral-300">Target: {log.targetType} ({log.targetId})</span>
                    </div>
                    <div className="text-neutral-500">
                      Actor: {log.actorId} • IP: {log.ipAddress}
                    </div>
                  </div>
                  <div className="text-neutral-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
