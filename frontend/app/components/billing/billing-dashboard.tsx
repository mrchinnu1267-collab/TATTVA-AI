"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle2,
  Zap,
  TrendingUp,
  FileText,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  Activity,
  Layers,
  ArrowRight,
  ExternalLink,
  Smartphone,
  AlertCircle,
  HelpCircle,
  Ban,
  RotateCcw,
} from "lucide-react";
import { UpiCheckoutModal } from "./UpiCheckoutModal";

export function BillingDashboard() {
  const [activeTab, setActiveTab] = useState<"plans" | "usage" | "invoices" | "payments" | "admin" | "support">("plans");
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [adminMetrics, setAdminMetrics] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    setLoading(true);
    try {
      const [sRes, uRes, iRes] = await Promise.all([
        fetch("/api/billing/subscription").then((r) => r.json()).catch(() => ({})),
        fetch("/api/billing/usage").then((r) => r.json()).catch(() => ({})),
        fetch("/api/billing/invoices").then((r) => r.json()).catch(() => ({})),
      ]);

      if (sRes?.subscription) setSubscription(sRes.subscription);
      if (sRes?.payments) setPayments(sRes.payments);
      if (uRes?.usage) setUsage(uRes.usage);
      if (iRes?.invoices) setInvoices(iRes.invoices);

      // Check admin status
      const aRes = await fetch("/api/billing/admin").then((r) => r.json()).catch(() => ({}));
      if (aRes?.success) {
        setIsAdmin(true);
        setAdminMetrics(aRes.metrics);
      }
    } catch (err) {
      console.error("Failed to load billing data", err);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  }

  async function handleCancelSubscription() {
    if (!confirm("Are you sure you want to cancel your TATTVA AI Go subscription? You will retain benefits until the end of your billing cycle.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/billing/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Subscription successfully cancelled.");
        await loadBillingData();
      } else {
        alert(data.error || "Failed to cancel subscription.");
      }
    } catch (err: any) {
      alert(err.message || "Error cancelling subscription.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestRefund(paymentId: string) {
    const reason = prompt("Please provide a reason for the refund request:");
    if (!reason) return;

    setLoading(true);
    try {
      const res = await fetch("/api/billing/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, reason }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Refund initiated. Account restored to Free plan.");
        await loadBillingData();
      } else {
        alert(data.error || "Failed to request refund.");
      }
    } catch (err: any) {
      alert(err.message || "Error processing refund.");
    } finally {
      setLoading(false);
    }
  }

  const currentTier = subscription?.tier || "free";
  const isGoActive = currentTier === "go" && subscription?.status === "active";

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-emerald-500 text-slate-950 font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Subscription & Billing Management
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium uppercase border ${
                  isGoActive
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}>
                  {isGoActive ? "TATTVA AI Go Active" : "Free Plan"}
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage your subscription, UPI payments, AI quotas, and official invoices
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          {!isGoActive ? (
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Smartphone className="w-4 h-4" /> Subscribe to Go (₹40/mo)
            </button>
          ) : (
            <button
              onClick={handleCancelSubscription}
              disabled={subscription?.cancelAtPeriodEnd}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-800/60 text-xs font-medium transition flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" />
              {subscription?.cancelAtPeriodEnd ? "Cancellation Scheduled" : "Cancel Subscription"}
            </button>
          )}
          <button
            onClick={loadBillingData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 pt-6 border-b border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "plans"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" /> Subscription Plans
        </button>
        <button
          onClick={() => setActiveTab("usage")}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "usage"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-4 h-4" /> Quotas & Usage
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "payments"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Smartphone className="w-4 h-4" /> UPI Payment History
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "invoices"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" /> Invoices
        </button>
        <button
          onClick={() => setActiveTab("support")}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "support"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <HelpCircle className="w-4 h-4" /> Billing FAQ & Refunds
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "admin"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Admin Controls
          </button>
        )}
      </div>

      {/* TAB 1: PLANS (FREE vs GO SIDE-BY-SIDE) */}
      {activeTab === "plans" && (
        <div className="py-8 space-y-8">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-black text-white">Choose Your AI Experience</h2>
            <p className="text-xs text-slate-400 mt-2">
              Accessible, powerful intelligence powered by UPI payments. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Plan Card */}
            <div className={`p-6 rounded-2xl bg-slate-900 border ${
              currentTier === "free" ? "border-slate-700 ring-1 ring-slate-700" : "border-slate-800"
            } flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Community Explorer
                  </span>
                  {currentTier === "free" && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
                      Current Plan
                    </span>
                  )}
                </div>
                <div className="text-3xl font-black text-white mt-3">₹0 <span className="text-xs font-normal text-slate-400">/ month</span></div>
                <p className="text-xs text-slate-400 mt-2">
                  Essential AI chat access for everyday research and learning.
                </p>

                <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    50 AI messages per day
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    250,000 monthly tokens
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    25 tool executions per day
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                    100MB cloud workspace storage
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                    10 memory slots & 30 min voice
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  disabled={currentTier === "free"}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold cursor-default"
                >
                  {currentTier === "free" ? "Default Plan Active" : "Included"}
                </button>
              </div>
            </div>

            {/* TATTVA AI Go Plan Card */}
            <div className={`relative p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-emerald-950/20 border-2 ${
              isGoActive ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-emerald-500/40"
            } flex flex-col justify-between shadow-xl`}>
              {/* Highlight Badge */}
              <div className="absolute -top-3 left-6">
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                  Most Popular • UPI Only
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> TATTVA AI GO
                  </span>
                  {isGoActive && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                      Active
                    </span>
                  )}
                </div>

                <div className="text-3xl font-black text-white mt-3">₹40 <span className="text-xs font-normal text-slate-400">/ month</span></div>
                <p className="text-xs text-slate-300 mt-2">
                  Expanded AI access with significantly higher message and tool quotas.
                </p>

                <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
                  <div className="flex items-center gap-2.5 text-xs text-white font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <strong>250 AI messages per day</strong> (5x Free limit)
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <strong>1,500,000 monthly tokens</strong> (6x Free limit)
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <strong>150 tool executions per day</strong> (6x Free limit)
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    Access to eligible AI tools & web search
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                    100MB cloud storage (same as Free)
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                    10 memory slots & 30 min voice (same as Free)
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-2">
                <button
                  onClick={() => setIsCheckoutOpen(true)}
                  disabled={isGoActive}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg ${
                    isGoActive
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                      : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                  }`}
                >
                  {isGoActive ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Go Plan Active
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" /> Subscribe to Go (₹40/mo)
                    </>
                  )}
                </button>
                <div className="text-[11px] text-center text-slate-400">
                  Renews monthly at ₹40/mo • UPI payment only • Cancel anytime
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUOTAS & USAGE */}
      {activeTab === "usage" && (
        <div className="py-8 space-y-6 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" /> Current Usage & Quotas
            </h3>

            {/* Daily Messages */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Daily AI Messages</span>
                <span className="text-white font-mono">
                  {usage?.requestsToday || 0} / {isGoActive ? 250 : 50}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${Math.min(100, (((usage?.requestsToday || 0) / (isGoActive ? 250 : 50)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Monthly Tokens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Monthly Tokens</span>
                <span className="text-white font-mono">
                  {(usage?.tokensUsed || 0).toLocaleString()} / {(isGoActive ? 1500000 : 250000).toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${Math.min(100, (((usage?.tokensUsed || 0) / (isGoActive ? 1500000 : 250000)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Daily Tools */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Daily Tool Executions</span>
                <span className="text-white font-mono">
                  {usage?.toolsUsedToday || 0} / {isGoActive ? 150 : 25}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${Math.min(100, (((usage?.toolsUsedToday || 0) / (isGoActive ? 150 : 25)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Cloud Storage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Cloud Storage Capacity</span>
                <span className="text-white font-mono">
                  {Math.round((usage?.storageBytesUsed || 0) / (1024 * 1024))} MB / 100 MB
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${Math.min(100, (((usage?.storageBytesUsed || 0) / (100 * 1024 * 1024)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS HISTORY */}
      {activeTab === "payments" && (
        <div className="py-8 space-y-6 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" /> UPI Transactions & History
            </h3>

            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No past transactions recorded. Complete a UPI checkout to view payment records here.
              </p>
            ) : (
              <div className="divide-y divide-slate-800">
                {payments.map((p) => (
                  <div key={p.paymentId} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">{p.providerOrderId}</div>
                      <div className="text-[11px] text-slate-400">
                        Method: UPI • {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold text-white">₹{p.amount.toFixed(2)} INR</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          p.status === "success"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : p.status === "refunded"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-red-500/20 text-red-300"
                        }`}>
                          {p.status.toUpperCase()}
                        </span>
                      </div>
                      {p.status === "success" && (
                        <button
                          onClick={() => handleRequestRefund(p.paymentId)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition"
                        >
                          Request Refund
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: INVOICES */}
      {activeTab === "invoices" && (
        <div className="py-8 space-y-6 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" /> Official Tax Invoices
            </h3>

            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No invoices generated yet. Invoices are automatically generated upon confirmed subscription payment.
              </p>
            ) : (
              <div className="divide-y divide-slate-800">
                {invoices.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-400">
                        Date: {new Date(inv.createdAt).toLocaleDateString()} • {inv.lineItems?.[0]?.description}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">₹{inv.total.toFixed(2)} INR</div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                        PAID
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: BILLING SUPPORT & REFUNDS */}
      {activeTab === "support" && (
        <div className="py-8 space-y-6 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-400" /> Billing Support, Renewals & Refund Policy
            </h3>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-white text-sm mb-1">How UPI Payments & Monthly Renewals Work</h4>
                <p className="text-slate-400">
                  TATTVA AI Go is billed at exactly <strong>₹40 INR per month</strong>. Payments are processed exclusively via UPI (Google Pay, PhonePe, Paytm, BHIM, or any UPI app). If you authorize a recurring mandate, your subscription will automatically renew every 30 days. You will receive an invoice after each successful renewal.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-white text-sm mb-1">Cancellation Policy</h4>
                <p className="text-slate-400">
                  You can cancel your subscription at any time from this dashboard by clicking <strong>Cancel Subscription</strong>. When cancelled, automatic renewal is immediately halted, and you retain all Go benefits until the end of your current 30-day period. Afterward, your account seamlessly restores to the Free plan.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-white text-sm mb-1">Refund Requests</h4>
                <p className="text-slate-400">
                  If you encounter a billing discrepancy, service outage, or duplicate transaction, you can submit a refund request directly under the <strong>UPI Payment History</strong> tab by clicking <em>Request Refund</em>. Refunds are credited back to your original source UPI bank account within 3 to 5 business days.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ADMIN CONTROLS */}
      {activeTab === "admin" && isAdmin && (
        <div className="py-8 space-y-6 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" /> Administrative Billing Controls
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Active Go Users</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {adminMetrics?.activeGoSubscribers || 0}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Total Revenue</div>
                <div className="text-2xl font-black text-white mt-1">
                  ₹{adminMetrics?.totalRevenueInr || 0} <span className="text-xs font-normal text-slate-400">INR</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Successful Payments</div>
                <div className="text-2xl font-black text-blue-400 mt-1">
                  {adminMetrics?.successfulPayments || 0}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Refunds Processed</div>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {adminMetrics?.refundsCount || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPI Checkout Modal */}
      <UpiCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={() => {
          showToast("TATTVA AI Go plan activated! 🎉");
          loadBillingData();
        }}
      />
    </div>
  );
}
