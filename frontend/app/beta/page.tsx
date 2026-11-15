"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Bug,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  Terminal,
  Activity,
  Layers,
  FileText,
  Lock,
  Smartphone,
  Monitor,
} from "lucide-react";

export default function BetaTestingPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [testerAccount, setTesterAccount] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Feedback form state
  const [feedbackCategory, setFeedbackCategory] = useState("bug_report");
  const [severity, setSeverity] = useState("Medium");
  const [platform, setPlatform] = useState("web");
  const [description, setDescription] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Bug list state
  const [bugsList, setBugsList] = useState<any[]>([]);

  useEffect(() => {
    fetchBugs();
  }, []);

  async function fetchBugs() {
    try {
      const res = await fetch("/api/beta?action=bugs");
      if (res.ok) {
        const data = await res.json();
        setBugsList(data.records || []);
      }
    } catch {
      // Ignored for offline local
    }
  }

  async function handleRegisterTester(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register_tester",
          inviteCode,
          email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to register beta tester");
      } else {
        setTesterAccount(data.account);
        setIsAuthorized(true);
        setSuccessMsg(`Welcome to the Beta Program! Tier: ${data.account.tier} (${data.account.dailyRequestLimit} requests/day)`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmittingFeedback(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_bug",
          category: feedbackCategory,
          severity,
          platform,
          description,
          appVersion: "2.1.0-beta.2",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to submit report");
      } else {
        setSuccessMsg(`Report ${data.report.id} registered! Thank you for improving TATTVA AI.`);
        setDescription("");
        fetchBugs();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Submission failed");
    } finally {
      setSubmittingFeedback(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold rounded-full uppercase tracking-wider">
                Controlled Beta
              </span>
              <span className="text-slate-400 text-sm">v2.1.0-beta.2</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-white">
              TATTVA AI BETA TESTING
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Architected & Engineered by <span className="text-slate-200 font-medium">kotapati Gowtham Chowdary</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-indigo-600/20"
            >
              Open AI Chat
            </Link>
            <Link
              href="/evaluation"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition"
            >
              Evaluation Lab
            </Link>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-200 rounded-xl text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 rounded-xl text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 2-Column Grid: Registration & Tester Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1: Tester Registration or Status Card */}
          <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-indigo-400" />
              Tester Access
            </h2>

            {!isAuthorized ? (
              <form onSubmit={handleRegisterTester} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Beta access is strictly restricted by invitation. Enter your authorized invite code to activate your account.
                </p>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tester@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Invitation Code</label>
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="e.g. TATTVA-BETA-2026"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white uppercase tracking-wider focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
                >
                  {loading ? "Verifying Access..." : "Activate Beta Access"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Active Beta Tester
                </div>
                <div className="text-xs space-y-2 text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Account Tier:</span>
                    <span className="font-medium text-white uppercase">{testerAccount.tier}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Daily Request Limit:</span>
                    <span className="font-medium text-white">{testerAccount.dailyRequestLimit} req/day</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Tester ID:</span>
                    <span className="font-mono text-slate-300">{testerAccount.id}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Column 2 & 3: Available Features & Testing Instructions */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Available Beta Features
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800/70 rounded-xl">
                  <span className="font-semibold text-white block mb-1">Multi-Modal AI Chat</span>
                  <span className="text-slate-400">Real-time SSE streaming with Gemini 2.5 Flash, Claude 3.5 Sonnet, and Indic SLMs.</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800/70 rounded-xl">
                  <span className="font-semibold text-white block mb-1">Document Intelligence & RAG</span>
                  <span className="text-slate-400">PDF, DOCX, XLSX extraction with 73% query-salient token compression.</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800/70 rounded-xl">
                  <span className="font-semibold text-white block mb-1">Office Document Synthesis</span>
                  <span className="text-slate-400">Generates downloadable presentations (.pptx) and documents (.docx) on demand.</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800/70 rounded-xl">
                  <span className="font-semibold text-white block mb-1">MMMLU Evaluation Lab</span>
                  <span className="text-slate-400">Empirical benchmarking across 57 academic subjects with seed parity.</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Known Limitations in Beta
              </h3>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Microphone auto-listening is permanently removed; use on-demand Read Aloud for audio playback.</li>
                <li>Local Indic SLMs require minimum 6GB VRAM when running on-premise; cloud fallback is active by default.</li>
                <li>Maximum single file upload size is bounded at 25MB to prevent memory exhaustion.</li>
                <li>Private user conversations are strictly never used for automated model training.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bug Reporting & Feedback Section */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bug className="w-5 h-5 text-rose-400" />
              Bug Reporting & Feedback Intake
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Submit reproducible bug reports, incorrect AI answers, or feature requests. Reports are reviewed by engineering.
            </p>
          </div>

          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Report Category</label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="bug_report">Application Bug Report</option>
                  <option value="incorrect_ai_response">Incorrect AI Answer</option>
                  <option value="performance_issue">Performance / Latency Issue</option>
                  <option value="ui_ux_suggestion">UI / UX Suggestion</option>
                  <option value="missing_feature">Missing Feature Request</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Low">Low (Cosmetic / Minor)</option>
                  <option value="Medium">Medium (Partial disruption)</option>
                  <option value="High">High (Feature failure)</option>
                  <option value="Critical">Critical (Crash / Data risk)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="web">Desktop Web Browser</option>
                  <option value="mobile_browser">Mobile Web Browser</option>
                  <option value="android">Android Native App</option>
                  <option value="desktop">Electron Desktop App</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Description & Reproduction Steps
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what occurred, what you expected, and steps to reproduce..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingFeedback}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Send className="w-4 h-4" />
                {submittingFeedback ? "Submitting..." : "Submit Beta Report"}
              </button>
            </div>
          </form>
        </div>

        {/* Reported Bugs Live Triage Board */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Active Beta Reports ({bugsList.length})
            </h3>
            <button
              onClick={fetchBugs}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {bugsList.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No unresolved beta bugs reported. Everything is functioning nominally!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">Report ID</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Platform</th>
                    <th className="py-2.5 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {bugsList.map((bug) => (
                    <tr key={bug.id} className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 font-mono font-medium text-white">{bug.id}</td>
                      <td className="py-2.5 px-3 capitalize">{bug.category.replace(/_/g, " ")}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            bug.severity === "Critical"
                              ? "bg-rose-500/20 text-rose-300"
                              : bug.severity === "High"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {bug.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                          {bug.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[10px] text-slate-400">{bug.platform}</td>
                      <td className="py-2.5 px-3 text-slate-200 max-w-xs truncate">{bug.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
