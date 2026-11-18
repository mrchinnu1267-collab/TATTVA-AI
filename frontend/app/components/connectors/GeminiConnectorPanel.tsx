"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, CheckCircle, RefreshCw, Zap, Cpu, Terminal, ArrowRight, XCircle } from "lucide-react";

interface GeminiStatusResponse {
  success: boolean;
  activeMode: "consumer_subscription" | "developer_api";
  consumerSubscription: {
    status: {
      isConnected: boolean;
      providerType: string;
      accountLabel: string;
      errorMessage: string;
      limitationReason: string;
      policyNotice: string;
    };
    usage: {
      planType: string;
      quotaLimit: string;
      isQuotaExhausted: boolean;
      authoritativeSource: string;
    };
    policyLimitation: string;
  };
  developerApi: {
    status: {
      isConnected: boolean;
      providerType: string;
      accountLabel: string;
      policyNotice?: string;
      errorMessage?: string;
      capabilities: {
        text: boolean;
        image: boolean;
        code: boolean;
        reasoning: boolean;
        structuredData: boolean;
      };
    };
    usage: {
      planType: string;
      requestsUsed: number;
      quotaLimit: number;
      isQuotaExhausted: boolean;
      rateLimitPerMinute: number;
      authoritativeSource: string;
    };
  };
}

export default function GeminiConnectorPanel({ isDark = true }: { isDark?: boolean }) {
  const [data, setData] = useState<GeminiStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testPrompt, setTestPrompt] = useState("Explain the concept of quantum superposition in one concise sentence.");
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connectors/gemini");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load Gemini connector status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRunTest = async () => {
    if (!testPrompt.trim()) return;
    setIsExecuting(true);
    setTestError(null);
    setTestOutput(null);

    try {
      const res = await fetch("/api/connectors/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: testPrompt }),
      });
      const json = await res.json();
      if (json.success && json.result) {
        setTestOutput(json.result.text);
      } else {
        setTestError(json.error || "Generation request failed");
      }
    } catch (err: any) {
      setTestError(err.message || "Failed to communicate with Gemini connector");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className={`p-6 rounded-2xl border ${isDark ? "bg-[#10131a] border-white/10 text-white" : "bg-white border-neutral-200 text-neutral-900"} space-y-6 shadow-xl`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-wide">Google Gemini Backend Connector</h2>
            <p className="text-xs text-neutral-400">Direct integration between TATTVA AI backend and Google Gemini</p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-neutral-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>

      {/* Architecture Flow Diagram */}
      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-neutral-400">
        <div className="flex flex-wrap items-center justify-between gap-2 text-center">
          <div className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300">
            TATTVA Frontend
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
          <div className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            TATTVA Backend API
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
          <div className="px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300">
            Gemini Connector
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
          <div className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            Google Gemini Engine
          </div>
        </div>
      </div>

      {/* Dual Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Consumer Google AI Pro Subscription */}
        <div className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                Phase 10 Policy Enforced
              </span>
              <h3 className="text-sm font-semibold mt-1">Google Gemini AI Pro (Consumer Subscription)</h3>
            </div>
            <XCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            Google does not provide an official API, OAuth scope, or MCP server permitting third-party backends to draw from consumer Google AI Pro / Google One AI Premium subscriptions.
          </p>

          <div className="p-2.5 rounded bg-black/30 border border-amber-500/15 space-y-1 text-[11px]">
            <div className="flex justify-between text-neutral-400">
              <span>Connection Status:</span>
              <span className="text-amber-300 font-semibold">Disabled (Unsupported by Google)</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Authoritative Source:</span>
              <span className="text-neutral-300">gemini.google.com</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Paid Fallback:</span>
              <span className="text-emerald-400 font-medium">Strictly Blocked</span>
            </div>
          </div>
        </div>

        {/* Card 2: Google AI Studio Developer API */}
        <div className="p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                Official Developer Integration
              </span>
              <h3 className="text-sm font-semibold mt-1">Google AI Studio Developer API</h3>
            </div>
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            Connected via official Google Generative Language API credentials with support for high-throughput reasoning, code assistance, and structured data generation.
          </p>

          <div className="p-2.5 rounded bg-black/30 border border-emerald-500/15 space-y-1 text-[11px]">
            <div className="flex justify-between text-neutral-400">
              <span>Connection Status:</span>
              <span className="text-emerald-300 font-semibold">
                {data?.developerApi.status.isConnected ? "Verified Live (Connected)" : "Offline / Unconfigured"}
              </span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Active Model:</span>
              <span className="text-neutral-300">gemini-3.5-flash-lite</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Usage Protection:</span>
              <span className="text-emerald-400 font-medium">15 RPM Ceiling Enforced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Verification Terminal */}
      <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
          <Terminal className="w-4 h-4 text-blue-400" />
          Real Connection Verification Probe
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="Enter test prompt..."
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-xs focus:outline-none focus:border-blue-500 text-white"
          />
          <button
            onClick={handleRunTest}
            disabled={isExecuting}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {isExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Execute
          </button>
        </div>

        {testOutput && (
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs text-neutral-200">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
              Live Provider Output Received:
            </span>
            <p className="font-mono text-emerald-100">{testOutput}</p>
          </div>
        )}

        {testError && (
          <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/30 text-xs text-red-300">
            <span className="text-[10px] uppercase font-bold text-red-400 block mb-1">Execution Rejected:</span>
            <p>{testError}</p>
          </div>
        )}
      </div>

      {/* Security & Provenance Policy Disclosures */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-neutral-400">
        <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-neutral-300">Zero-Secret & Honest Provenance Guarantee:</span> All authentication credentials remain strictly on the backend. No consumer subscription scraping is permitted. Connected models provide conversational reasoning, code generation, and universal multimodal vision analysis.
        </div>
      </div>
    </div>
  );
}
