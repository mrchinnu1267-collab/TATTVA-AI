"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle2,
  Zap,
  TrendingUp,
  FileText,
  DollarSign,
  Download,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  Activity,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export function BillingDashboard() {
  const [activeTab, setActiveTab] = useState<"plans" | "usage" | "invoices" | "commercial">("plans");
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [upgradeMsg, setUpgradeMsg] = useState("");

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    setLoading(true);
    try {
      const [pRes, sRes, uRes, iRes] = await Promise.all([
        fetch("/api/billing/plans").then((r) => r.json()).catch(() => ({})),
        fetch("/api/billing/subscription").then((r) => r.json()).catch(() => ({})),
        fetch("/api/billing/usage").then((r) => r.json()).catch(() => ({})),
        fetch("/api/billing/invoices").then((r) => r.json()).catch(() => ({})),
      ]);

      if (pRes?.plans) setPlans(pRes.plans);
      if (sRes?.subscription) setSubscription(sRes.subscription);
      if (uRes?.usage) setUsage(uRes.usage);
      if (uRes?.analytics) setAnalytics(uRes.analytics);
      if (iRes?.invoices) setInvoices(iRes.invoices);
    } catch (err) {
      console.error("Failed to load billing data", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDirectUpgrade(tier: string) {
    setLoading(true);
    setUpgradeMsg("");
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, billingCycle, directUpgrade: true }),
      });
      const data = await res.json();
      if (data?.success) {
        setUpgradeMsg(`Successfully activated ${tier.toUpperCase()} plan!`);
        await loadBillingData();
      } else {
        setUpgradeMsg(data?.error || "Failed to update subscription");
      }
    } catch (err: any) {
      setUpgradeMsg(err.message || "Failed to upgrade");
    } finally {
      setLoading(false);
    }
  }

  const currentTier = subscription?.tier || "free";

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Subscription & Business Management
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium uppercase">
                  {currentTier} Tier
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage commercial plans, API token quotas, storage capacity, and official invoices
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadBillingData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Quotas
          </button>
        </div>
      </div>

      {upgradeMsg && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
          {upgradeMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Current Plan</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white uppercase mt-1">{currentTier}</div>
          <span className="text-[11px] text-emerald-400">Status: {subscription?.status || "active"}</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Monthly Tokens</span>
            <Zap className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {(usage?.tokensUsed || 0).toLocaleString()} / {(usage?.tokenLimit || 250000).toLocaleString()}
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
            <div
              className="bg-sky-400 h-1.5 rounded-full"
              style={{
                width: `${Math.min(100, Math.round(((usage?.tokensUsed || 0) / (usage?.tokenLimit || 250000)) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Daily Requests</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {usage?.requestsToday || 0} / {usage?.requestLimit || 100}
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
            <div
              className="bg-purple-400 h-1.5 rounded-full"
              style={{
                width: `${Math.min(100, Math.round(((usage?.requestsToday || 0) / (usage?.requestLimit || 100)) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Storage Capacity</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {Math.round((usage?.storageBytesUsed || 0) / 1024 / 1024)}MB /{" "}
            {Math.round((usage?.storageLimitBytes || 104857600) / 1024 / 1024)}MB
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
            <div
              className="bg-amber-400 h-1.5 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(((usage?.storageBytesUsed || 0) / (usage?.storageLimitBytes || 104857600)) * 100)
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mt-6 pb-2 border-b border-slate-800 overflow-x-auto">
        {[
          { id: "plans", label: "Plans & Tiers", icon: Layers },
          { id: "usage", label: "Quotas & Limits", icon: Activity },
          { id: "invoices", label: "Invoices & Receipts", icon: FileText },
          { id: "commercial", label: "Business Analytics", icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        {/* PLANS PANEL */}
        {activeTab === "plans" && (
          <div className="space-y-6">
            <div className="flex justify-center mb-6">
              <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    billingCycle === "monthly" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  onClick={() => setBillingCycle("annual")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    billingCycle === "annual" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Annual Billing (Save 20%)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrent = currentTier === plan.tier;
                const price = billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
                return (
                  <div
                    key={plan.id}
                    className={`p-6 rounded-2xl flex flex-col justify-between border transition-all ${
                      isCurrent
                        ? "bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-950/20"
                        : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                          {plan.tier}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            Current Active Plan
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white mt-1">{plan.name}</h3>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-white">${price}</span>
                        <span className="text-xs text-slate-400">/{billingCycle === "annual" ? "yr" : "mo"}</span>
                      </div>

                      <div className="mt-6 space-y-2.5 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{(plan.tokenLimitMonthly / 1000000).toFixed(1)}M Tokens / month</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{plan.requestLimitDaily.toLocaleString()} Requests / day</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{Math.round(plan.storageLimitBytes / 1024 / 1024 / 1024)}GB Cloud Storage</span>
                        </div>
                        {plan.features.map((feat: string) => (
                          <div key={feat} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="capitalize">{feat.replace(/_/g, " ")}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-8">
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold cursor-not-allowed"
                        >
                          Plan Active
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDirectUpgrade(plan.tier)}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
                        >
                          Upgrade to {plan.name}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* USAGE PANEL */}
        {activeTab === "usage" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-base font-bold text-white mb-1">Tenant Resource Consumption & Quota Headroom</h3>
              <p className="text-xs text-slate-400 mb-6">
                Real-time usage meters for tokens, API calls, and persistent storage under your plan.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-400 font-medium">Monthly Token Balance</span>
                    <span className="text-emerald-400 font-mono">
                      {Math.max(0, (usage?.tokenLimit || 0) - (usage?.tokensUsed || 0)).toLocaleString()} left
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white">{(usage?.tokensUsed || 0).toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-1">Total limit: {(usage?.tokenLimit || 0).toLocaleString()}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-400 font-medium">Daily Request Quota</span>
                    <span className="text-purple-400 font-mono">
                      {Math.max(0, (usage?.requestLimit || 0) - (usage?.requestsToday || 0))} left today
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white">{usage?.requestsToday || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Resets at 00:00 UTC daily</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-400 font-medium">Persistent Storage</span>
                    <span className="text-amber-400 font-mono">
                      {Math.round(((usage?.storageLimitBytes || 0) - (usage?.storageBytesUsed || 0)) / 1024 / 1024)}MB free
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {Math.round((usage?.storageBytesUsed || 0) / 1024 / 1024)}MB
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Limit: {Math.round((usage?.storageLimitBytes || 0) / 1024 / 1024)}MB
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INVOICES PANEL */}
        {activeTab === "invoices" && (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Commercial Invoices & Payment Records</h3>
                <p className="text-xs text-slate-400">Download and inspect tax-compliant invoices for your account.</p>
              </div>
            </div>

            {invoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No invoices recorded yet. Upgrades and paid subscriptions generate automatic invoices.
              </div>
            ) : (
              <div className="divide-y divide-slate-800 font-mono text-xs">
                {invoices.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{inv.invoiceNumber}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-bold">
                          {inv.status}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px] font-sans">
                        {new Date(inv.createdAt).toLocaleDateString()} • {inv.billingCycle.toUpperCase()} • $
                        {inv.total.toFixed(2)} {inv.currency}
                      </span>
                    </div>

                    <a
                      href={`/api/billing/invoices?id=${inv.id}&format=html`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      View Invoice
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMMERCIAL ANALYTICS PANEL */}
        {activeTab === "commercial" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Monthly Recurring Revenue</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  ${analytics?.mrrUsd?.toLocaleString() || 0}
                </div>
                <span className="text-[11px] text-slate-500">ARR: ${analytics?.arrUsd?.toLocaleString() || 0}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Active Paid Subscribers</span>
                <div className="text-2xl font-bold text-white mt-1">
                  {analytics?.activeSubscribers || 0}
                </div>
                <span className="text-[11px] text-slate-500">Pro & Enterprise tiers</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Estimated Compute Cost</span>
                <div className="text-2xl font-bold text-sky-400 mt-1">
                  ${analytics?.costEstimateUsd || 0}
                </div>
                <span className="text-[11px] text-slate-500">LLM token & storage spend</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Gross Margin</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {analytics?.marginPercent || 85}%
                </div>
                <span className="text-[11px] text-emerald-400 font-semibold">Healthy Unit Economics</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
